import { useEffect, useRef } from 'react';
import { useTimerStore } from '../store/timerStore';
import { useSettingsStore } from '../store/settingsStore';
import { useTaskStore } from '../store/taskStore';
import { playSoundOption, playCustomSoundFile } from '../utils/soundOptions';
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from '@tauri-apps/plugin-notification';

async function notify(title: string, body: string) {
  let granted = await isPermissionGranted();
  if (!granted) {
    const perm = await requestPermission();
    granted = perm === 'granted';
  }
  if (granted) {
    sendNotification({ title, body });
  }
}

// Module-level tracking to detect genuine activeTaskId changes vs component re-mounts.
// Multiple components use useTimer (FocusScreen, TasksScreen, TimerView), and each mount
// triggers useEffect. Without this, switching tabs or window modes resets the timer.
let _lastSyncedActiveTaskId: string | null | undefined = undefined;
let _initialTimerSyncDone = false;

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
  const { tasks, incrementPomodoroCompleted, isLoaded: tasksLoaded } = useTaskStore();
  const sessionStartRef = useRef<number>(Date.now());
  const accumulatedRef = useRef<number>(0);
  const prevRunningRef = useRef<boolean>(false);

  // Derive effective durations: use task's custom values when set, otherwise global settings
  const activeTask = tasks.find((t) => t.id === activeTaskId);
  const effectiveWorkDuration = activeTask?.customWorkDuration ?? settings.workDuration;
  const effectiveShortBreakDuration = activeTask?.customShortBreakDuration ?? settings.shortBreakDuration;
  const effectiveLongBreakDuration = activeTask?.customLongBreakDuration ?? settings.longBreakDuration;
  // Use Infinity when skipLongBreak is set so sessionCount % interval never reaches 0
  const effectiveLongBreakInterval = activeTask?.skipLongBreak
    ? Infinity
    : (activeTask?.customLongBreakInterval ?? settings.longBreakInterval);

  // Update timer display when:
  // 1. Tasks finish loading for the first time (app init with a pre-selected task)
  // 2. The user genuinely changes the active task
  // Does NOT fire on component re-mounts (tab switches, fullscreen/widget transitions).
  useEffect(() => {
    if (!tasksLoaded) return;

    const isInitialSync = !_initialTimerSyncDone;
    const taskActuallyChanged = _lastSyncedActiveTaskId !== undefined && _lastSyncedActiveTaskId !== activeTaskId;

    if (isInitialSync) {
      _initialTimerSyncDone = true;
    }

    _lastSyncedActiveTaskId = activeTaskId;

    if ((isInitialSync || taskActuallyChanged) && !isRunning) {
      setPhase(phase, effectiveWorkDuration, effectiveShortBreakDuration, effectiveLongBreakDuration);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTaskId, tasksLoaded]);

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
          if (settings.soundNotifications) {
            const scSound = settings.sessionCompleteSound ?? 'fanfare';
            if (scSound === 'custom') {
              const cf = settings.customSoundFiles?.['sessionCompleteSound'];
              if (cf) playCustomSoundFile(cf.dataUrl, settings.soundVolume ?? 70);
            } else {
              playSoundOption(scSound, settings.soundVolume ?? 70);
            }
            const taskTitle = currentActiveTask?.title;
            notify(
              'Focus session complete!',
              taskTitle ? `Great work on "${taskTitle}". Time for a break.` : 'Great work! Time for a break.'
            );
          }
        } else {
          if (settings.soundNotifications) {
            const bcSound = settings.breakCompleteSound ?? 'bell';
            if (bcSound === 'custom') {
              const cf = settings.customSoundFiles?.['breakCompleteSound'];
              if (cf) playCustomSoundFile(cf.dataUrl, settings.soundVolume ?? 70);
            } else {
              playSoundOption(bcSound, settings.soundVolume ?? 70);
            }
            const label = completedPhase === 'longBreak' ? 'Long break' : 'Break';
            notify('Break over', `${label} finished. Time to focus!`);
          }
        }

        // Use the task-effective durations for the next phase
        const taskWork = currentActiveTask?.customWorkDuration ?? settings.workDuration;
        const taskShort = currentActiveTask?.customShortBreakDuration ?? settings.shortBreakDuration;
        const taskLong = currentActiveTask?.customLongBreakDuration ?? settings.longBreakDuration;

        const taskSkipLong = currentActiveTask?.skipLongBreak ? Infinity : (currentActiveTask?.customLongBreakInterval ?? settings.longBreakInterval);
        advancePhase(taskWork, taskShort, taskLong, taskSkipLong);
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
    effectiveLongBreakInterval,
  };
}
