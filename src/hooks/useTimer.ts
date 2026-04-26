import { useEffect } from 'react';
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
  const { tasks, projects, incrementPomodoroCompleted, isLoaded: tasksLoaded } = useTaskStore();

  // Derive effective durations: task override → project override → global setting.
  const activeTask = tasks.find((t) => t.id === activeTaskId);
  const activeProject = activeTask?.projectId
    ? projects.find((p) => p.id === activeTask.projectId)
    : undefined;
  const effectiveWorkDuration =
    activeTask?.customWorkDuration ?? activeProject?.customWorkDuration ?? settings.workDuration;
  const effectiveShortBreakDuration =
    activeTask?.customShortBreakDuration ?? activeProject?.customShortBreakDuration ?? settings.shortBreakDuration;
  const effectiveLongBreakDuration =
    activeTask?.customLongBreakDuration ?? activeProject?.customLongBreakDuration ?? settings.longBreakDuration;
  // Use Infinity when skipLongBreak is set so sessionCount % interval never reaches 0.
  // Task's skipLongBreak takes precedence; only falls through to project when undefined.
  const skipLongBreak = activeTask?.skipLongBreak ?? activeProject?.skipLongBreak ?? false;
  const effectiveLongBreakInterval = skipLongBreak
    ? Infinity
    : (activeTask?.customLongBreakInterval ?? activeProject?.customLongBreakInterval ?? settings.longBreakInterval);

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

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      if (secondsLeft <= 1) {
        const completedPhase = phase;
        const elapsed = totalSeconds;

        const currentActiveTask = tasks.find((t) => t.id === activeTaskId);
        const currentActiveProject = currentActiveTask?.projectId
          ? projects.find((p) => p.id === currentActiveTask.projectId)
          : undefined;
        recordSession(completedPhase, elapsed, activeTaskId || undefined, currentActiveTask?.title);

        if (completedPhase === 'work') {
          addFocusSeconds(elapsed);
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

        // Use the effective durations for the next phase: task → project → settings.
        const taskWork = currentActiveTask?.customWorkDuration
          ?? currentActiveProject?.customWorkDuration ?? settings.workDuration;
        const taskShort = currentActiveTask?.customShortBreakDuration
          ?? currentActiveProject?.customShortBreakDuration ?? settings.shortBreakDuration;
        const taskLong = currentActiveTask?.customLongBreakDuration
          ?? currentActiveProject?.customLongBreakDuration ?? settings.longBreakDuration;

        const skipLong = currentActiveTask?.skipLongBreak ?? currentActiveProject?.skipLongBreak ?? false;
        const taskSkipLong = skipLong
          ? Infinity
          : (currentActiveTask?.customLongBreakInterval
              ?? currentActiveProject?.customLongBreakInterval ?? settings.longBreakInterval);
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
    projects,
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
