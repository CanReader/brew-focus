/**
 * Named sound presets selectable per timer event.
 * All sounds are synthesized via Web Audio API — no audio files needed.
 */

let _ctx: AudioContext | null = null;

async function getCtx(): Promise<AudioContext> {
  if (!_ctx) _ctx = new AudioContext();
  if (_ctx.state === 'suspended') await _ctx.resume();
  return _ctx;
}

function tone(
  ctx: AudioContext,
  freq: number,
  type: OscillatorType,
  volume: number,
  startAt: number,
  duration: number,
  attack = 0.01,
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startAt);
  gain.gain.setValueAtTime(0, startAt);
  gain.gain.linearRampToValueAtTime(volume, startAt + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  osc.start(startAt);
  osc.stop(startAt + duration + 0.05);
}

function sweep(
  ctx: AudioContext,
  freqFrom: number,
  freqTo: number,
  type: OscillatorType,
  volume: number,
  startAt: number,
  duration: number,
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freqFrom, startAt);
  osc.frequency.linearRampToValueAtTime(freqTo, startAt + duration);
  gain.gain.setValueAtTime(0, startAt);
  gain.gain.linearRampToValueAtTime(volume, startAt + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  osc.start(startAt);
  osc.stop(startAt + duration + 0.05);
}

export interface SoundOption {
  id: string;
  name: string;
  description: string;
}

/** Play a user-uploaded audio file from a data URL at the given volume (0–100). */
export async function playCustomSoundFile(dataUrl: string, volumePct: number): Promise<void> {
  return new Promise((resolve) => {
    const audio = new Audio(dataUrl);
    audio.volume = Math.min(1, Math.max(0, volumePct / 100));
    audio.onended = () => resolve();
    audio.onerror = () => resolve();
    audio.play().catch(() => resolve());
  });
}

export const SOUND_OPTIONS: SoundOption[] = [
  { id: 'none',    name: 'None',     description: 'Silent' },
  { id: 'chime',   name: 'Chime',    description: 'Bright bell chime' },
  { id: 'bell',    name: 'Bell',     description: 'Warm resonant bell' },
  { id: 'ping',    name: 'Ping',     description: 'Quick sharp ping' },
  { id: 'rise',    name: 'Rise',     description: 'Ascending tone sweep' },
  { id: 'fanfare', name: 'Fanfare',  description: 'Uplifting 3-note melody' },
  { id: 'double',  name: 'Double',   description: 'Two quick dings' },
  { id: 'soft',    name: 'Soft',     description: 'Barely-there whisper' },
  { id: 'pluck',   name: 'Pluck',    description: 'Short guitar-like pluck' },
  { id: 'drop',    name: 'Drop',     description: 'Descending tone sweep' },
];

export async function playSoundOption(id: string, volumePct: number): Promise<void> {
  if (id === 'none') return;
  const ctx = await getCtx();
  const v = (volumePct / 100);
  const t = ctx.currentTime;

  switch (id) {
    case 'chime':
      tone(ctx, 1047, 'sine', v * 0.30, t,        1.2, 0.01);
      tone(ctx, 2093, 'sine', v * 0.12, t + 0.08, 0.9, 0.01);
      break;

    case 'bell':
      tone(ctx, 523,  'sine', v * 0.32, t,        1.6, 0.01);
      tone(ctx, 1047, 'sine', v * 0.16, t + 0.05, 1.2, 0.01);
      tone(ctx, 1568, 'sine', v * 0.08, t + 0.12, 0.9, 0.01);
      break;

    case 'ping':
      tone(ctx, 1400, 'sine', v * 0.22, t, 0.20, 0.005);
      break;

    case 'rise':
      sweep(ctx, 300, 800, 'sine', v * 0.22, t, 0.35);
      break;

    case 'fanfare':
      tone(ctx, 523,  'sine', v * 0.28, t,        0.90, 0.01);
      tone(ctx, 659,  'sine', v * 0.28, t + 0.14, 0.80, 0.01);
      tone(ctx, 784,  'sine', v * 0.28, t + 0.28, 1.00, 0.01);
      tone(ctx, 1047, 'sine', v * 0.18, t + 0.42, 0.80, 0.01);
      break;

    case 'double':
      tone(ctx, 880, 'sine', v * 0.25, t,        0.22, 0.005);
      tone(ctx, 880, 'sine', v * 0.25, t + 0.18, 0.22, 0.005);
      break;

    case 'soft':
      tone(ctx, 440, 'sine', v * 0.12, t, 1.0, 0.06);
      break;

    case 'pluck':
      tone(ctx, 440, 'triangle', v * 0.28, t,        0.22, 0.003);
      tone(ctx, 880, 'triangle', v * 0.12, t + 0.01, 0.18, 0.003);
      break;

    case 'drop':
      sweep(ctx, 700, 260, 'sine', v * 0.22, t, 0.35);
      break;

    default:
      break;
  }
}
