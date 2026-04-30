/**
 * Plays pre-rendered WAV files from /public/sounds/.
 *
 * Why files instead of Web Audio synthesis: WebKit on Linux (Tauri's WebView)
 * unreliably schedules oscillators — first click distorts, second click drops.
 * HTMLAudioElement with a small pool per sound is rock-solid in comparison.
 *
 * To regenerate the WAVs, run `node scripts/generate-sounds.mjs`.
 */

const POOL_SIZE = 4; // allows up to 4 overlapping instances of the same sound
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
  // Rewind so the same element can be re-triggered before its previous play ends.
  try { el.currentTime = 0; } catch { /* element may not be ready yet — fine */ }
  // play() returns a promise that rejects if autoplay is blocked; we don't
  // care — first user click in a Tauri window already counts as a gesture.
  void el.play().catch(() => { /* swallow autoplay rejection */ });
}

/** Played when a work (focus) session finishes. */
export function playSessionComplete(volumePct: number): void {
  playFile('fanfare.wav', volumePct);
}

/** Played when a break finishes. */
export function playBreakComplete(volumePct: number): void {
  playFile('bell.wav', volumePct);
}

/** Played when the timer pauses. */
export function playTimerPause(volumePct: number): void {
  playFile('pause.wav', volumePct);
}

/** Short UI click tick for button interactions. */
export function playClick(volumePct: number): void {
  // Click is much quieter than other sounds — scale it down further.
  playFile('click.wav', volumePct * 0.6);
}

/**
 * Bright rising major arpeggio when a task or milestone is checked off.
 * ~0.5s, mid-volume so back-to-back completions don't fatigue the ear.
 */
export function playTaskComplete(volumePct: number): void {
  playFile('taskComplete.wav', volumePct);
}
