/**
 * Background noise engine using Web Audio API.
 * Atmospheric sounds load from /noises/*.mp3 with synthesis fallback.
 * Pure noise types (white, pink, brown, fan, library) are always synthesized.
 */

let _ctx: AudioContext | null = null;
let _masterGain: GainNode | null = null;
let _cleanup: (() => void) | null = null;
let _currentId = 'none';
let _generation = 0; // incremented on every setBackgroundNoise call to prevent race conditions

export interface NoiseOption {
  id: string;
  name: string;
  emoji: string;
  description: string;
}

export const NOISE_OPTIONS: NoiseOption[] = [
  { id: 'none',        name: 'None',           emoji: '🔇', description: 'No background noise'               },
  { id: 'white',       name: 'White Noise',    emoji: '📻', description: 'Flat static across all frequencies' },
  { id: 'pink',        name: 'Pink Noise',     emoji: '🌸', description: 'Warm, balanced noise'               },
  { id: 'brown',       name: 'Brown Noise',    emoji: '🤎', description: 'Deep, low-rumble noise'             },
  { id: 'fan',         name: 'Fan / AC',       emoji: '💨', description: 'Electric fan or air conditioner'    },
  { id: 'rain',        name: 'Rain',           emoji: '🌧️', description: 'Steady gentle rainfall'             },
  { id: 'storm',       name: 'Thunderstorm',   emoji: '⛈️', description: 'Heavy rain with distant rumble'    },
  { id: 'coffee',      name: 'Coffee Shop',    emoji: '☕', description: 'Warm café chatter & ambiance'       },
  { id: 'classroom',   name: 'Classroom',      emoji: '📚', description: 'Distant chatter & shuffling'        },
  { id: 'library',     name: 'Library',        emoji: '📖', description: 'Hushed library atmosphere'          },
  { id: 'fireplace',   name: 'Fireplace',      emoji: '🔥', description: 'Crackling wood fire'                },
  { id: 'ocean',       name: 'Ocean Waves',    emoji: '🌊', description: 'Rhythmic rolling waves'             },
  { id: 'wind',        name: 'Wind',           emoji: '🌬️', description: 'Gentle outdoor breeze'              },
  { id: 'train',       name: 'Night Train',    emoji: '🚂', description: 'Rhythmic train ambiance'            },
];

// ── Audio context ─────────────────────────────────────────────────────────────

async function getCtx(): Promise<AudioContext> {
  if (!_ctx) _ctx = new AudioContext();
  if (_ctx.state === 'suspended') await _ctx.resume();
  return _ctx;
}

// ── Buffer generators ─────────────────────────────────────────────────────────

function whiteBuffer(ctx: AudioContext, secs = 10): AudioBuffer {
  const n = ctx.sampleRate * secs;
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

function pinkBuffer(ctx: AudioContext, secs = 10): AudioBuffer {
  const n = ctx.sampleRate * secs;
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let b0=0, b1=0, b2=0, b3=0, b4=0, b5=0, b6=0;
  for (let i = 0; i < n; i++) {
    const w = Math.random() * 2 - 1;
    b0 = 0.99886*b0 + w*0.0555179;
    b1 = 0.99332*b1 + w*0.0750759;
    b2 = 0.96900*b2 + w*0.1538520;
    b3 = 0.86650*b3 + w*0.3104856;
    b4 = 0.55000*b4 + w*0.5329522;
    b5 = -0.7616 *b5 - w*0.0168980;
    d[i] = (b0+b1+b2+b3+b4+b5+b6+w*0.5362)*0.11;
    b6 = w*0.115926;
  }
  return buf;
}

function brownBuffer(ctx: AudioContext, secs = 10): AudioBuffer {
  const n = ctx.sampleRate * secs;
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < n; i++) {
    const w = Math.random() * 2 - 1;
    d[i] = (last + 0.02 * w) / 1.02;
    last = d[i];
    d[i] *= 3.5;
  }
  return buf;
}

// ── Node helpers ──────────────────────────────────────────────────────────────

function makeSrc(ctx: AudioContext, buf: AudioBuffer): AudioBufferSourceNode {
  const s = ctx.createBufferSource();
  s.buffer = buf;
  s.loop = true;
  return s;
}

function lpf(ctx: AudioContext, freq: number, Q = 1): BiquadFilterNode {
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass'; f.frequency.value = freq; f.Q.value = Q;
  return f;
}

function hpf(ctx: AudioContext, freq: number): BiquadFilterNode {
  const f = ctx.createBiquadFilter();
  f.type = 'highpass'; f.frequency.value = freq;
  return f;
}

function bpf(ctx: AudioContext, freq: number, Q: number): BiquadFilterNode {
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = Q;
  return f;
}

function makeGain(ctx: AudioContext, g: number): GainNode {
  const n = ctx.createGain();
  n.gain.value = g;
  return n;
}

/** Wire nodes[0]→[1]→…→mg, start all sources and oscillators. Returns cleanup fn. */
function chain(mg: GainNode, nodes: AudioNode[]): () => void {
  for (let i = 0; i < nodes.length - 1; i++) {
    nodes[i].connect(nodes[i + 1]);
  }
  nodes[nodes.length - 1].connect(mg);
  nodes.forEach(n => {
    if (n instanceof AudioBufferSourceNode || n instanceof OscillatorNode) n.start();
  });
  return () => {
    nodes.forEach(n => {
      try { if (n instanceof AudioBufferSourceNode || n instanceof OscillatorNode) n.stop(); } catch { /**/ }
      try { n.disconnect(); } catch { /**/ }
    });
  };
}

/** Cleanup helper for ad-hoc node lists. */
function stopAll(...nodes: AudioNode[]) {
  nodes.forEach(n => {
    try { if (n instanceof AudioBufferSourceNode || n instanceof OscillatorNode) n.stop(); } catch { /**/ }
    try { n.disconnect(); } catch { /**/ }
  });
}

// ── File-based loader with synthesis fallback ─────────────────────────────────

type SyncBuilder = (ctx: AudioContext, mg: GainNode) => () => void;
type Builder = (ctx: AudioContext, mg: GainNode) => Promise<() => void> | (() => void);

async function loadFileNoise(
  ctx: AudioContext,
  mg: GainNode,
  filename: string,
  vol: number,
  fallback: SyncBuilder,
): Promise<() => void> {
  try {
    const res = await fetch(`/noises/${filename}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const ab = await res.arrayBuffer();
    const audioBuf = await ctx.decodeAudioData(ab);
    const s = makeSrc(ctx, audioBuf);
    const g = makeGain(ctx, vol);
    s.connect(g); g.connect(mg);
    s.start();
    return () => stopAll(s, g);
  } catch {
    // Audio file not found or failed to decode — fall back to synthesis
    return fallback(ctx, mg);
  }
}

// ── Synthesis-only builders ───────────────────────────────────────────────────

const SYNTH: Record<string, SyncBuilder> = {
  white: (ctx, mg) => chain(mg, [makeSrc(ctx, whiteBuffer(ctx)), makeGain(ctx, 0.5)]),

  pink:  (ctx, mg) => chain(mg, [makeSrc(ctx, pinkBuffer(ctx)),  makeGain(ctx, 0.7)]),

  brown: (ctx, mg) => chain(mg, [makeSrc(ctx, brownBuffer(ctx)), makeGain(ctx, 0.6)]),

  fan: (ctx, mg) => chain(mg, [
    makeSrc(ctx, whiteBuffer(ctx)),
    lpf(ctx, 800), lpf(ctx, 400),
    makeGain(ctx, 0.55),
  ]),

  library: (ctx, mg) => chain(mg, [
    makeSrc(ctx, pinkBuffer(ctx)),
    bpf(ctx, 600, 0.4),
    makeGain(ctx, 0.22),
  ]),

  // Synthesis fallbacks for file-based noises ────────────────────────────────

  rain: (ctx, mg) => {
    const cl1 = chain(mg, [makeSrc(ctx, whiteBuffer(ctx)), hpf(ctx, 2000), makeGain(ctx, 0.45)]);
    const cl2 = chain(mg, [makeSrc(ctx, pinkBuffer(ctx)),  lpf(ctx, 200),  makeGain(ctx, 0.25)]);
    return () => { cl1(); cl2(); };
  },

  storm: (ctx, mg) => {
    const cl1 = chain(mg, [makeSrc(ctx, whiteBuffer(ctx)), hpf(ctx, 1500), makeGain(ctx, 0.6)]);
    const s2 = makeSrc(ctx, brownBuffer(ctx));
    const lp = lpf(ctx, 80);
    const thunderG = makeGain(ctx, 0.45);
    const lfoOsc = ctx.createOscillator();
    lfoOsc.type = 'sine'; lfoOsc.frequency.value = 0.05;
    const lfoG = makeGain(ctx, 0.3);
    lfoOsc.connect(lfoG); lfoG.connect(thunderG.gain);
    s2.connect(lp); lp.connect(thunderG); thunderG.connect(mg);
    s2.start(); lfoOsc.start();
    return () => { cl1(); stopAll(s2, lp, thunderG, lfoOsc, lfoG); };
  },

  coffee: (ctx, mg) => {
    const cl1 = chain(mg, [makeSrc(ctx, brownBuffer(ctx)), lpf(ctx, 500), makeGain(ctx, 0.45)]);
    const s2 = makeSrc(ctx, pinkBuffer(ctx));
    const bp = bpf(ctx, 1200, 0.5);
    const chatterG = makeGain(ctx, 0.25);
    const lfoOsc = ctx.createOscillator();
    lfoOsc.type = 'sine'; lfoOsc.frequency.value = 0.12;
    const lfoG = makeGain(ctx, 0.1);
    lfoOsc.connect(lfoG); lfoG.connect(chatterG.gain);
    s2.connect(bp); bp.connect(chatterG); chatterG.connect(mg);
    s2.start(); lfoOsc.start();
    return () => { cl1(); stopAll(s2, bp, chatterG, lfoOsc, lfoG); };
  },

  classroom: (ctx, mg) => {
    const s = makeSrc(ctx, pinkBuffer(ctx));
    const bp = bpf(ctx, 800, 0.6);
    const g = makeGain(ctx, 0.45);
    const lfoOsc = ctx.createOscillator();
    lfoOsc.type = 'sine'; lfoOsc.frequency.value = 0.08;
    const lfoG = makeGain(ctx, 0.15);
    lfoOsc.connect(lfoG); lfoG.connect(g.gain);
    s.connect(bp); bp.connect(g); g.connect(mg);
    s.start(); lfoOsc.start();
    return () => stopAll(s, bp, g, lfoOsc, lfoG);
  },

  fireplace: (ctx, mg) => {
    const cl1 = chain(mg, [makeSrc(ctx, brownBuffer(ctx)), lpf(ctx, 300), makeGain(ctx, 0.5)]);
    const s2 = makeSrc(ctx, whiteBuffer(ctx));
    const hp = hpf(ctx, 3500);
    const crackleG = makeGain(ctx, 0.08);
    const lfoOsc = ctx.createOscillator();
    lfoOsc.type = 'sawtooth'; lfoOsc.frequency.value = 0.9;
    const lfoG = makeGain(ctx, 0.07);
    lfoOsc.connect(lfoG); lfoG.connect(crackleG.gain);
    s2.connect(hp); hp.connect(crackleG); crackleG.connect(mg);
    s2.start(); lfoOsc.start();
    return () => { cl1(); stopAll(s2, hp, crackleG, lfoOsc, lfoG); };
  },

  ocean: (ctx, mg) => {
    const s = makeSrc(ctx, pinkBuffer(ctx));
    const lp = lpf(ctx, 800);
    const waveG = makeGain(ctx, 0.5);
    const lfoOsc = ctx.createOscillator();
    lfoOsc.type = 'sine'; lfoOsc.frequency.value = 0.07;
    const lfoG = makeGain(ctx, 0.38);
    lfoOsc.connect(lfoG); lfoG.connect(waveG.gain);
    s.connect(lp); lp.connect(waveG); waveG.connect(mg);
    s.start(); lfoOsc.start();
    return () => stopAll(s, lp, waveG, lfoOsc, lfoG);
  },

  wind: (ctx, mg) => {
    const s = makeSrc(ctx, whiteBuffer(ctx));
    const bp = bpf(ctx, 600, 1.2);
    const windG = makeGain(ctx, 0.4);
    const lfoOsc = ctx.createOscillator();
    lfoOsc.type = 'sine'; lfoOsc.frequency.value = 0.18;
    const lfoG = makeGain(ctx, 0.25);
    lfoOsc.connect(lfoG); lfoG.connect(windG.gain);
    s.connect(bp); bp.connect(windG); windG.connect(mg);
    s.start(); lfoOsc.start();
    return () => stopAll(s, bp, windG, lfoOsc, lfoG);
  },

  train: (ctx, mg) => {
    const cl1 = chain(mg, [makeSrc(ctx, brownBuffer(ctx)), lpf(ctx, 250), makeGain(ctx, 0.5)]);
    const s2 = makeSrc(ctx, pinkBuffer(ctx));
    const bp = bpf(ctx, 1800, 2);
    const clackG = makeGain(ctx, 0.0);
    const lfoOsc = ctx.createOscillator();
    lfoOsc.type = 'square'; lfoOsc.frequency.value = 3.5;
    const lfoG = makeGain(ctx, 0.15);
    lfoOsc.connect(lfoG); lfoG.connect(clackG.gain);
    s2.connect(bp); bp.connect(clackG); clackG.connect(mg);
    s2.start(); lfoOsc.start();
    return () => { cl1(); stopAll(s2, bp, clackG, lfoOsc, lfoG); };
  },
};

// ── Builder dispatch ──────────────────────────────────────────────────────────

// Noise types that use real audio files (with synthesis fallback).
const FILE_NOISES = new Set(['rain', 'storm', 'coffee', 'classroom', 'fireplace', 'ocean', 'wind', 'train']);

const BUILDERS: Record<string, Builder> = {
  ...SYNTH,
  // Override file-capable noises to try file first
  rain:      (ctx, mg) => loadFileNoise(ctx, mg, 'rain.mp3',        0.7, SYNTH.rain),
  storm:     (ctx, mg) => loadFileNoise(ctx, mg, 'thunderstorm.mp3',0.7, SYNTH.storm),
  coffee:    (ctx, mg) => loadFileNoise(ctx, mg, 'coffee-shop.mp3', 0.65,SYNTH.coffee),
  classroom: (ctx, mg) => loadFileNoise(ctx, mg, 'classroom.mp3',   0.65,SYNTH.classroom),
  fireplace: (ctx, mg) => loadFileNoise(ctx, mg, 'fireplace.mp3',   0.7, SYNTH.fireplace),
  ocean:     (ctx, mg) => loadFileNoise(ctx, mg, 'ocean.mp3',       0.7, SYNTH.ocean),
  wind:      (ctx, mg) => loadFileNoise(ctx, mg, 'wind.mp3',        0.65,SYNTH.wind),
  train:     (ctx, mg) => loadFileNoise(ctx, mg, 'train.mp3',       0.65,SYNTH.train),
};

// Silence the TS warning about FILE_NOISES being unused in some builds
void FILE_NOISES;

// ── Public API ────────────────────────────────────────────────────────────────

/** Start (or switch to) a background noise. Volume 0–100. */
export async function setBackgroundNoise(id: string, volumePct: number): Promise<void> {
  const myGen = ++_generation;

  // Stop previous noise immediately
  if (_cleanup) { _cleanup(); _cleanup = null; }
  if (_masterGain) { _masterGain.disconnect(); _masterGain = null; }
  _currentId = id;

  if (id === 'none') return;

  const builder = BUILDERS[id];
  if (!builder) return;

  const ctx = await getCtx();
  if (myGen !== _generation) return; // superseded by a newer call

  _masterGain = ctx.createGain();
  _masterGain.gain.value = Math.max(0, Math.min(1, volumePct / 100));
  _masterGain.connect(ctx.destination);

  const cleanup = await Promise.resolve(builder(ctx, _masterGain));

  if (myGen !== _generation) {
    // A newer call came in while we were loading — discard this one
    cleanup();
    return;
  }
  _cleanup = cleanup;
}

/** Adjust master volume without restarting the noise. Volume 0–100. */
export function setNoiseVolume(volumePct: number): void {
  if (_masterGain) {
    _masterGain.gain.value = Math.max(0, Math.min(1, volumePct / 100));
  }
}

/** Stop all background noise immediately. */
export function stopBackgroundNoise(): void {
  _generation++;
  if (_cleanup) { _cleanup(); _cleanup = null; }
  if (_masterGain) { _masterGain.disconnect(); _masterGain = null; }
  _currentId = 'none';
}

export function getCurrentNoiseId(): string {
  return _currentId;
}
