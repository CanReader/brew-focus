import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { TitleBar } from './components/TitleBar';
import { FocusScreen } from './components/FocusScreen';
import { TasksScreen } from './components/TasksScreen';
import { ReportsScreen } from './components/ReportsScreen';
import { TimerView } from './components/FocusScreen/TimerView';
import { SettingsModal } from './components/SettingsModal';
import { WindowModeProvider, useWindowModeContext } from './contexts/WindowModeContext';
import { useSettingsStore } from './store/settingsStore';
import { useTaskStore } from './store/taskStore';
import { useTimerStore } from './store/timerStore';
import { useClickSound } from './hooks/useClickSound';

type Tab = 'focus' | 'tasks' | 'reports';

function AppContent() {
  const [activeTab, setActiveTab] = useState<Tab>('focus');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [appReady, setAppReady] = useState(false);

  const { loadSettings, settings } = useSettingsStore();
  const { loadTasks } = useTaskStore();
  const { loadState, setActiveTask } = useTimerStore();
  const { isFullscreen, isWidget } = useWindowModeContext();

  useClickSound(settings.clickSounds, settings.soundVolume ?? 70);

  // Initialize all stores on mount
  useEffect(() => {
    const init = async () => {
      await Promise.all([
        loadSettings(),
        loadTasks(),
      ]);
      // Sync timerStore's activeTaskId from taskStore so useTimer can compute
      // the correct effective durations on startup (timerStore never persists it).
      const currentSettings = useSettingsStore.getState().settings;
      const { tasks: loadedTasks, activeTaskId: loadedActiveTaskId } = useTaskStore.getState();
      setActiveTask(loadedActiveTaskId);

      // Pass the effective work duration for the selected task, not the global default
      const activeTask = loadedTasks.find((t) => t.id === loadedActiveTaskId);
      const effectiveWorkDuration = activeTask?.customWorkDuration ?? currentSettings.workDuration;
      await loadState(effectiveWorkDuration);
      setAppReady(true);
    };
    init();
  }, []);

  if (!appReady) {
    return (
      <div
        className="w-full h-full flex items-center justify-center"
        style={{ background: 'var(--bg)' }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <img
            src="/logo.svg"
            alt="Brew Focus"
            className="w-12 h-12 rounded-2xl"
          />
          <div className="text-center">
            <div className="font-fraunces text-xl font-semibold" style={{ color: 'var(--t)' }}>
              Brew Focus
            </div>
            <div className="text-[12px] mt-1" style={{ color: 'var(--t3)' }}>
              Loading...
            </div>
          </div>
          <div
            className="w-32 h-0.5 rounded-full overflow-hidden"
            style={{ background: 'var(--brd)' }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'var(--accent)' }}
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
        </motion.div>
      </div>
    );
  }

  // Fullscreen mode - show only timer
  if (isFullscreen) {
    return <TimerView variant="fullscreen" />;
  }

  // Widget mode - show compact timer
  if (isWidget) {
    return <TimerView variant="widget" />;
  }

  // Normal mode
  return (
    <div
      className="w-full h-full flex flex-col overflow-hidden"
      style={{ background: 'var(--bg)' }}
    >
      {/* Custom titlebar */}
      <TitleBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onSettingsClick={() => setSettingsOpen(true)}
      />

      {/* Main content area */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {activeTab === 'focus' && (
            <motion.div
              key="focus"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="absolute inset-0"
            >
              <FocusScreen />
            </motion.div>
          )}
          {activeTab === 'tasks' && (
            <motion.div
              key="tasks"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="absolute inset-0"
            >
              <TasksScreen onSwitchToFocus={() => setActiveTab('focus')} />
            </motion.div>
          )}
          {activeTab === 'reports' && (
            <motion.div
              key="reports"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="absolute inset-0"
            >
              <ReportsScreen />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modals */}
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

function App() {
  return (
    <WindowModeProvider>
      <AppContent />
    </WindowModeProvider>
  );
}

export default App;
