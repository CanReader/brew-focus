/**
 * Synthesized sound effects using Web Audio API.
 * No audio files required — all sounds are generated programmatically.
 */

let _ctx: AudioContext | null = null;

async function getCtx(): Promise<AudioContext> {
  if (!_ctx) {
    _ctx = new AudioContext();
  }
  // AudioContext starts suspended until a user gesture in WebView environments.
  // Must await resume() — fire-and-forget causes sounds to silently drop.
  if (_ctx.state === 'suspended') {
    await _ctx.resume();
  }
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

/** Played when a work (focus) session finishes — rewarding bell chime. */
export async function playSessionComplete(volumePct: number) {
  const ctx = await getCtx();
  const v = (volumePct / 100) * 0.35;
  const t = ctx.currentTime;
  tone(ctx, 880,  'sine', v,        t,        1.4, 0.01);
  tone(ctx, 1320, 'sine', v * 0.55, t + 0.12, 1.1, 0.01);
  tone(ctx, 1760, 'sine', v * 0.3,  t + 0.25, 0.8, 0.01);
}

/** Played when a break finishes — gentle nudge to refocus. */
export async function playBreakComplete(volumePct: number) {
  const ctx = await getCtx();
  const v = (volumePct / 100) * 0.28;
  const t = ctx.currentTime;
  tone(ctx, 660, 'sine', v,        t,        1.2, 0.01);
  tone(ctx, 880, 'sine', v * 0.5,  t + 0.18, 0.9, 0.01);
}

/** Played when the timer starts. */
export async function playTimerStart(volumePct: number) {
  const ctx = await getCtx();
  const v = (volumePct / 100) * 0.18;
  const t = ctx.currentTime;
  tone(ctx, 528, 'sine', v, t, 0.22, 0.01);
}

/** Played when the timer pauses. */
export async function playTimerPause(volumePct: number) {
  const ctx = await getCtx();
  const v = (volumePct / 100) * 0.15;
  const t = ctx.currentTime;
  tone(ctx, 396, 'sine', v, t, 0.18, 0.01);
}

/** Short UI click tick for button interactions. */
export async function playClick(volumePct: number) {
  const ctx = await getCtx();
  const v = (volumePct / 100) * 0.12;
  const t = ctx.currentTime;
  tone(ctx, 1400, 'sine', v, t, 0.055, 0.004);
}
