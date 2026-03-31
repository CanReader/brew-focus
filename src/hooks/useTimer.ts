import { useEffect, useRef } from 'react';
import { useTimerStore } from '../store/timerStore';
import { useSettingsStore } from '../store/settingsStore';
import { useTaskStore } from '../store/taskStore';

export function useTimer() {
  const {
    isRunning,
    secondsLeft,
    phase,
    tick,
    advancePhase,
    recordSession,
    addFocusSeconds,
    totalSeconds,
    activeTaskId,
    setPhase,
  } = useTimerStore();

  const { settings } = useSettingsStore();
  const { tasks, incrementPomodoroCompleted } = useTaskStore();
  const sessionStartRef = useRef<number>(Date.now());
  const accumulatedRef = useRef<number>(0);
  const prevRunningRef = useRef<boolean>(false);

  // Derive effective durations: use task's custom values when set, otherwise global settings
  const activeTask = tasks.find((t) => t.id === activeTaskId);
  const effectiveWorkDuration = activeTask?.customWorkDuration ?? settings.workDuration;
  const effectiveShortBreakDuration = activeTask?.customShortBreakDuration ?? settings.shortBreakDuration;
  const effectiveLongBreakDuration = activeTask?.customLongBreakDuration ?? settings.longBreakDuration;

  // BUG 1 FIX: When activeTaskId changes and the timer is not running,
  // refresh the timer display to reflect the task's custom durations (or global defaults).
  useEffect(() => {
    if (!isRunning) {
      setPhase(phase, effectiveWorkDuration, effectiveShortBreakDuration, effectiveLongBreakDuration);
    }
    // We only want to re-run when the active task changes, not on every settings change during a run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTaskId]);

  // Track when running starts/stops to accumulate focus time
  useEffect(() => {
    if (isRunning && !prevRunningRef.current) {
      sessionStartRef.current = Date.now();
    } else if (!isRunning && prevRunningRef.current && phase === 'work') {
      const elapsed = Math.floor((Date.now() - sessionStartRef.current) / 1000);
      accumulatedRef.current += elapsed;
    }
    prevRunningRef.current = isRunning;
  }, [isRunning, phase]);

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      if (secondsLeft <= 1) {
        const completedPhase = phase;
        const elapsed = totalSeconds;

        const currentActiveTask = tasks.find((t) => t.id === activeTaskId);
        recordSession(completedPhase, elapsed, activeTaskId || undefined, currentActiveTask?.title);

        if (completedPhase === 'work') {
          addFocusSeconds(elapsed + accumulatedRef.current);
          accumulatedRef.current = 0;
          if (activeTaskId) {
            incrementPomodoroCompleted(activeTaskId);
          }
        }

        // Use the task-effective durations for the next phase
        const taskWork = currentActiveTask?.customWorkDuration ?? settings.workDuration;
        const taskShort = currentActiveTask?.customShortBreakDuration ?? settings.shortBreakDuration;
        const taskLong = currentActiveTask?.customLongBreakDuration ?? settings.longBreakDuration;

        advancePhase(taskWork, taskShort, taskLong, settings.longBreakInterval);
      } else {
        tick();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [
    isRunning,
    secondsLeft,
    phase,
    totalSeconds,
    settings,
    activeTaskId,
    tasks,
    tick,
    advancePhase,
    recordSession,
    addFocusSeconds,
    incrementPomodoroCompleted,
  ]);

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const progress = totalSeconds > 0 ? 1 - secondsLeft / totalSeconds : 0;

  return {
    formatTime,
    progress,
    effectiveWorkDuration,
    effectiveShortBreakDuration,
    effectiveLongBreakDuration,
  };
}
