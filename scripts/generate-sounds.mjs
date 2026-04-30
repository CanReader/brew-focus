#!/usr/bin/env node
/**
 * Pre-render every UI sound to a 16-bit PCM WAV file in /public/sounds/.
 *
 * Why this exists: the previous implementation synthesized sounds at runtime
 * with Web Audio. WebKit on Linux Tauri handles scheduled oscillators poorly —
 * sounds dropped, distorted, or only the first played. Three different modules
 * each created their own AudioContext, which competed on the audio device.
 *
 * This script bakes each preset to a WAV file once. The runtime then just plays
 * an HTMLAudioElement, which is reliable across platforms.
 *
 * Run:  node scripts/generate-sounds.mjs   (only when sound presets change).
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '..', 'public', 'sounds');
mkdirSync(OUT_DIR, { recursive: true });

const SAMPLE_RATE = 44100;

// ── DSP primitives ──────────────────────────────────────────────────────────

/** Render a tone with linear attack and exponential decay into a Float32Array. */
function tone({ freq, type = 'sine', volume, startAt, duration, attack = 0.01, harmonics }) {
  const startSample = Math.floor(startAt * SAMPLE_RATE);
  const endSample = Math.floor((startAt + duration + 0.05) * SAMPLE_RATE);
  const length = endSample - startSample;
  const out = new Float32Array(length);
  const attackSamples = Math.max(1, Math.floor(attack * SAMPLE_RATE));
  const decayEndSample = Math.floor(duration * SAMPLE_RATE);

  for (let i = 0; i < length; i++) {
    const t = i / SAMPLE_RATE;
    const phase = 2 * Math.PI * freq * t;

    let sample;
    if (type === 'sine')          sample = Math.sin(phase);
    else if (type === 'triangle') sample = (2 / Math.PI) * Math.asin(Math.sin(phase));
    else if (type === 'square')   sample = Math.sign(Math.sin(phase));
    else if (type === 'sawtooth') sample = 2 * (freq * t - Math.floor(0.5 + freq * t));
    else                          sample = Math.sin(phase);

    // Optional harmonic stack — gives bell-like or pluck-like timbre.
    if (harmonics) {
      let mix = sample * (harmonics[0] ?? 1);
      for (let k = 1; k < harmonics.length; k++) {
        mix += Math.sin(2 * Math.PI * freq * (k + 1) * t) * harmonics[k];
      }
      sample = mix;
    }

    // Envelope: linear attack, exponential decay, hard zero past `duration`.
    let env;
    if (i < attackSamples) {
      env = i / attackSamples;
    } else if (i < decayEndSample) {
      const decayProgress = (i - attackSamples) / Math.max(1, decayEndSample - attackSamples);
      env = Math.pow(0.0001, decayProgress);
    } else {
      env = 0;
    }

    out[i] = sample * env * volume;
  }

  return { samples: out, startSample };
}

/** Render a frequency sweep with the same envelope shape. */
function sweep({ freqFrom, freqTo, type = 'sine', volume, startAt, duration }) {
  const startSample = Math.floor(startAt * SAMPLE_RATE);
  const endSample = Math.floor((startAt + duration + 0.05) * SAMPLE_RATE);
  const length = endSample - startSample;
  const out = new Float32Array(length);
  const attackSamples = Math.max(1, Math.floor(0.02 * SAMPLE_RATE));
  const decayEndSample = Math.floor(duration * SAMPLE_RATE);

  // Integrate frequency over time so the phase stays continuous as freq sweeps.
  let phase = 0;
  for (let i = 0; i < length; i++) {
    const t = i / SAMPLE_RATE;
    const u = Math.min(1, t / duration);
    const freq = freqFrom + (freqTo - freqFrom) * u;
    phase += 2 * Math.PI * freq / SAMPLE_RATE;

    let sample;
    if (type === 'sine')          sample = Math.sin(phase);
    else if (type === 'triangle') sample = (2 / Math.PI) * Math.asin(Math.sin(phase));
    else                          sample = Math.sin(phase);

    let env;
    if (i < attackSamples) {
      env = i / attackSamples;
    } else if (i < decayEndSample) {
      const decayProgress = (i - attackSamples) / Math.max(1, decayEndSample - attackSamples);
      env = Math.pow(0.0001, decayProgress);
    } else {
      env = 0;
    }

    out[i] = sample * env * volume;
  }

  return { samples: out, startSample };
}

/** Mix a list of {samples, startSample} layers into a single Float32Array. */
function mix(layers, totalDurationSec) {
  const total = Math.ceil(totalDurationSec * SAMPLE_RATE);
  const out = new Float32Array(total);
  for (const { samples, startSample } of layers) {
    for (let i = 0; i < samples.length; i++) {
      const dst = startSample + i;
      if (dst >= 0 && dst < total) out[dst] += samples[i];
    }
  }
  return out;
}

/** Soft-clip near full-scale to prevent any accidental clip on integer cast. */
function softLimit(buf) {
  let peak = 0;
  for (let i = 0; i < buf.length; i++) {
    const abs = Math.abs(buf[i]);
    if (abs > peak) peak = abs;
  }
  if (peak <= 0.95) return buf;
  const k = 0.95 / peak;
  for (let i = 0; i < buf.length; i++) buf[i] *= k;
  return buf;
}

// ── WAV writer (16-bit mono PCM) ────────────────────────────────────────────

function writeWav(filename, floatBuf) {
  const numSamples = floatBuf.length;
  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);            // PCM chunk size
  buffer.writeUInt16LE(1, 20);             // PCM format
  buffer.writeUInt16LE(1, 22);             // mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28); // byte rate
  buffer.writeUInt16LE(2, 32);             // block align
  buffer.writeUInt16LE(16, 34);            // bits per sample
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < numSamples; i++) {
    let s = Math.max(-1, Math.min(1, floatBuf[i]));
    s = Math.round(s * 32767);
    buffer.writeInt16LE(s, 44 + i * 2);
  }

  writeFileSync(resolve(OUT_DIR, filename), buffer);
}

// ── Preset definitions ──────────────────────────────────────────────────────
// Each preset returns its layers and a total duration; volumes are tuned so the
// peak across presets is reasonably matched (no preset is much louder than
// another at the same user volume slider position).

const PRESETS = {
  'chime': () => ({
    layers: [
      tone({ freq: 1047, type: 'sine', volume: 0.35, startAt: 0,    duration: 1.20 }),
      tone({ freq: 2093, type: 'sine', volume: 0.14, startAt: 0.08, duration: 0.90 }),
    ],
    duration: 1.40,
  }),

  'bell': () => ({
    layers: [
      tone({ freq: 523,  type: 'sine', volume: 0.36, startAt: 0,    duration: 1.60 }),
      tone({ freq: 1047, type: 'sine', volume: 0.18, startAt: 0.05, duration: 1.20 }),
      tone({ freq: 1568, type: 'sine', volume: 0.10, startAt: 0.12, duration: 0.90 }),
    ],
    duration: 1.80,
  }),

  'ping': () => ({
    layers: [
      tone({ freq: 1400, type: 'sine', volume: 0.28, startAt: 0, duration: 0.20, attack: 0.005 }),
    ],
    duration: 0.35,
  }),

  'rise': () => ({
    layers: [
      sweep({ freqFrom: 300, freqTo: 800, type: 'sine', volume: 0.28, startAt: 0, duration: 0.35 }),
    ],
    duration: 0.50,
  }),

  'fanfare': () => ({
    layers: [
      tone({ freq: 523,  type: 'sine', volume: 0.32, startAt: 0,    duration: 0.90 }),
      tone({ freq: 659,  type: 'sine', volume: 0.32, startAt: 0.14, duration: 0.80 }),
      tone({ freq: 784,  type: 'sine', volume: 0.32, startAt: 0.28, duration: 1.00 }),
      tone({ freq: 1047, type: 'sine', volume: 0.20, startAt: 0.42, duration: 0.80 }),
    ],
    duration: 1.50,
  }),

  'double': () => ({
    layers: [
      tone({ freq: 880, type: 'sine', volume: 0.30, startAt: 0,    duration: 0.22, attack: 0.005 }),
      tone({ freq: 880, type: 'sine', volume: 0.30, startAt: 0.18, duration: 0.22, attack: 0.005 }),
    ],
    duration: 0.55,
  }),

  'soft': () => ({
    layers: [
      tone({ freq: 440, type: 'sine', volume: 0.16, startAt: 0, duration: 1.00, attack: 0.06 }),
    ],
    duration: 1.20,
  }),

  'pluck': () => ({
    layers: [
      tone({ freq: 440, type: 'triangle', volume: 0.34, startAt: 0,    duration: 0.22, attack: 0.003 }),
      tone({ freq: 880, type: 'triangle', volume: 0.16, startAt: 0.01, duration: 0.18, attack: 0.003 }),
    ],
    duration: 0.40,
  }),

  'drop': () => ({
    layers: [
      sweep({ freqFrom: 700, freqTo: 260, type: 'sine', volume: 0.28, startAt: 0, duration: 0.35 }),
    ],
    duration: 0.50,
  }),

  // Distinct event sounds (not user-pickable; used internally).
  'click': () => ({
    layers: [
      tone({ freq: 1400, type: 'sine', volume: 0.18, startAt: 0, duration: 0.055, attack: 0.004 }),
    ],
    duration: 0.10,
  }),

  'pause': () => ({
    layers: [
      tone({ freq: 396, type: 'sine', volume: 0.22, startAt: 0, duration: 0.18, attack: 0.01 }),
    ],
    duration: 0.30,
  }),

  // Bright rising major arpeggio for task / milestone completion.
  'taskComplete': () => ({
    layers: [
      tone({ freq: 523,  type: 'sine', volume: 0.30, startAt: 0,    duration: 0.42, attack: 0.005 }),
      tone({ freq: 659,  type: 'sine', volume: 0.26, startAt: 0.06, duration: 0.36, attack: 0.005 }),
      tone({ freq: 784,  type: 'sine', volume: 0.22, startAt: 0.12, duration: 0.30, attack: 0.005 }),
      tone({ freq: 1047, type: 'sine', volume: 0.16, startAt: 0.18, duration: 0.45, attack: 0.005 }),
    ],
    duration: 0.80,
  }),
};

// ── Render all presets ──────────────────────────────────────────────────────

let total = 0;
for (const [name, build] of Object.entries(PRESETS)) {
  const { layers, duration } = build();
  const buf = softLimit(mix(layers, duration));
  writeWav(`${name}.wav`, buf);
  total++;
  console.log(`  rendered ${name}.wav  (${duration.toFixed(2)}s)`);
}
console.log(`\nGenerated ${total} sound files in public/sounds/`);
