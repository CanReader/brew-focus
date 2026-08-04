import { useEffect, useRef } from 'react';
import { useTimerStore } from '../store/timerStore';
import { useSettingsStore } from '../store/settingsStore';
import { useTaskStore } from '../store/taskStore';

/**
 * Advances the daily focus queue when a work phase completes.
 *
 * Lives at App level, NOT in FocusScreen. Mounted in FocusScreen this only ran
 * in the main window mode, so finishing a session in fullscreen or widget
 * silently skipped the advance — behaviour that differed by which window you
 * happened to be looking at. Sibling to useSessionCelebration, which observes
 * the same transition for display.
 *
 * Auto-start is deliberately NOT here: `useTimerEngine` already owns it (it
 * fires right after advancePhase, and TimerEngine is mounted across every
 * window mode). FocusScreen used to carry a second copy whose `!isRunning`
 * guard made it a no-op in practice; duplicating it here would just relocate
 * dead code and invite the two paths to drift.
 *
 * Registered exactly once — two registrations would double-advance the queue.
 */
export function useCompletionSideEffects() {
  const phase = useTimerStore((s) => s.phase);
  const setTimerActiveTask = useTimerStore((s) => s.setActiveTask);
  const { settings } = useSettingsStore();
  const { tasks, activeTaskId, setActiveTask } = useTaskStore();

  const prevPhaseRef = useRef(phase);

  // Keyed on `phase` alone: the ref guard is what makes this fire once per real
  // transition rather than on every dependency change.
  useEffect(() => {
    if (prevPhaseRef.current === phase) {
      return;
    }
    const completedPhase = prevPhaseRef.current;
    prevPhaseRef.current = phase;
    if (completedPhase !== 'work') {
      return;
    }

    // Pick the next incomplete task from the daily queue, if any. We don't
    // auto-start the timer — the user still presses Play (per design).
    const queue = settings.dailyQueue?.taskIds ?? [];
    if (queue.length === 0) {
      return;
    }
    const next = queue
      .map((id) => tasks.find((t) => t.id === id))
      .find((t) => t && !t.completed && t.id !== activeTaskId);
    if (next) {
      setActiveTask(next.id);
      setTimerActiveTask(next.id);
    }
  }, [phase]);
}
