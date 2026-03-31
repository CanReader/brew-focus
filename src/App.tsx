import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { TitleBar } from './components/TitleBar';
import { FocusScreen } from './components/FocusScreen';
import { TasksScreen } from './components/TasksScreen';
import { TimerModal } from './components/TimerModal';
import { SettingsModal } from './components/SettingsModal';
import { ReportsModal } from './components/ReportsModal';
import { useSettingsStore } from './store/settingsStore';
import { useTaskStore } from './store/taskStore';
import { useTimerStore } from './store/timerStore';

type Tab = 'focus' | 'tasks';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('focus');
  const [timerModalOpen, setTimerModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);
  const [appReady, setAppReady] = useState(false);

  const { loadSettings, settings } = useSettingsStore();
  const { loadTasks } = useTaskStore();
  const { loadState } = useTimerStore();

  // Initialize all stores on mount
  useEffect(() => {
    const init = async () => {
      await Promise.all([
        loadSettings(),
        loadTasks(),
      ]);
      await loadState(settings.workDuration);
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
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--accent)' }}
          >
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M7 7h14v1.5H7V7z" fill="white" opacity="0.9" />
              <path d="M7 10h12c0 4-2 8.5-6 8.5S7 14 7 10z" fill="white" opacity="0.9" />
              <path
                d="M19 11h2a2.5 2.5 0 000-5h-2"
                stroke="white"
                strokeWidth="1.8"
                strokeLinecap="round"
                fill="none"
              />
              <path d="M9 19.5c1.5.8 8 .8 10 0" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
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
        onReportsClick={() => setReportsOpen(true)}
      />

      {/* Main content area */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {activeTab === 'focus' ? (
            <motion.div
              key="focus"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="absolute inset-0"
            >
              <FocusScreen onOpenTimerModal={() => setTimerModalOpen(true)} />
            </motion.div>
          ) : (
            <motion.div
              key="tasks"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="absolute inset-0"
            >
              <TasksScreen />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modals */}
      <TimerModal open={timerModalOpen} onClose={() => setTimerModalOpen(false)} />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <ReportsModal open={reportsOpen} onClose={() => setReportsOpen(false)} />
    </div>
  );
}

export default App;
