import { useCallback, useEffect, useRef, useState } from 'react';
import { useTimerStore } from '../store/timerStore';
import type { CelebrationKind } from '../components/Celebration';

interface CelebrationState {
  kind: CelebrationKind;
  sessionId: string | null;
  focusedSeconds: number;
}

const IDLE: CelebrationState = { kind: null, sessionId: null, focusedSeconds: 0 };

/**
 * Detects phase completions and drives the celebration overlay. Lives at App
 * level so it fires in every window mode — the previous FocusScreen-local
 * version never ran in fullscreen or widget, which silently dropped the mood
 * rating for sessions finished there.
 *
 * Display only: auto-start and daily-queue advancement stay in FocusScreen.
 */
export function useSessionCelebration() {
  const phase = useTimerStore((s) => s.phase);
  const [celebration, setCelebration] = useState<CelebrationState>(IDLE);
  const prevPhaseRef = useRef(phase);

  useEffect(() => {
    if (prevPhaseRef.current === phase) return;
    const completedPhase = prevPhaseRef.current;
    prevPhaseRef.current = phase;

    if (completedPhase === 'work') {
      // Read at fire time rather than through a subscription: the session row is
      // appended by the same transition that flips the phase, so a captured
      // value would be one render stale.
      const latest = useTimerStore.getState().sessions.find((s) => s.phase === 'work');
      setCelebration({
        kind: 'work',
        sessionId: latest?.id ?? null,
        focusedSeconds: latest?.duration ?? 0,
      });
    } else if (completedPhase === 'shortBreak' || completedPhase === 'longBreak') {
      setCelebration({ kind: 'break', sessionId: null, focusedSeconds: 0 });
    }
  }, [phase]);

  const dismissCelebration = useCallback(() => {
    setCelebration((prev) => ({ ...prev, kind: null }));
  }, []);

  return { celebration, dismissCelebration };
}
