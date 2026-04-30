/**
 * Named sound presets selectable per timer event.
 *
 * Backed by pre-rendered WAV files in /public/sounds/, played via
 * HTMLAudioElement pools (see ./sounds.ts for the rationale — Web Audio
 * synthesis was unreliable on Linux WebKit).
 *
 * To regenerate the WAVs, run `node scripts/generate-sounds.mjs`.
 */

const POOL_SIZE = 3;
type Pool = { elements: HTMLAudioElement[]; cursor: number };
const pools = new Map<string, Pool>();

function getPool(filename: string): Pool {
  let pool = pools.get(filename);
  if (!pool) {
    const elements: HTMLAudioElement[] = [];
    for (let i = 0; i < POOL_SIZE; i++) {
      const el = new Audio(`/sounds/${filename}`);
      el.preload = 'auto';
      elements.push(el);
    }
    pool = { elements, cursor: 0 };
    pools.set(filename, pool);
  }
  return pool;
}

function playFile(filename: string, volumePct: number): void {
  const v = Math.max(0, Math.min(1, volumePct / 100));
  const pool = getPool(filename);
  const el = pool.elements[pool.cursor];
  pool.cursor = (pool.cursor + 1) % pool.elements.length;
  el.volume = v;
  try { el.currentTime = 0; } catch { /* not loaded yet */ }
  void el.play().catch(() => { /* autoplay can reject before first gesture */ });
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

const ID_TO_FILE: Record<string, string> = {
  chime:   'chime.wav',
  bell:    'bell.wav',
  ping:    'ping.wav',
  rise:    'rise.wav',
  fanfare: 'fanfare.wav',
  double:  'double.wav',
  soft:    'soft.wav',
  pluck:   'pluck.wav',
  drop:    'drop.wav',
};

export async function playSoundOption(id: string, volumePct: number): Promise<void> {
  if (id === 'none') return;
  const filename = ID_TO_FILE[id];
  if (!filename) return;
  playFile(filename, volumePct);
}
