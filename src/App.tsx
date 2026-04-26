import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { TitleBar } from './components/TitleBar';
import { FocusScreen } from './components/FocusScreen';
import { TasksScreen } from './components/TasksScreen';
import { ProjectsScreen } from './components/ProjectsScreen';
import { ReportsScreen } from './components/ReportsScreen';
import { TimerView } from './components/FocusScreen/TimerView';
import { SettingsModal } from './components/SettingsModal';
import { AuthScreen } from './components/AuthScreen';
import { WindowModeProvider, useWindowModeContext } from './contexts/WindowModeContext';
import { useAuthStore } from './store/authStore';
import { useSettingsStore } from './store/settingsStore';
import { useTaskStore } from './store/taskStore';
import { useTimerStore } from './store/timerStore';
import { useActivityStore } from './store/activityStore';
import { useCoffeeCupCatalogStore } from './store/coffeeCupCatalogStore';
import { useLocaleStore } from './store/localeStore';
import { useClickSound } from './hooks/useClickSound';
import { setBackgroundNoise, setNoiseVolume, stopBackgroundNoise } from './utils/backgroundNoise';
import { useUpdater } from './hooks/useUpdater';
import { UpdateBanner } from './components/UpdateBanner';
import { onOpenUrl, getCurrent as getCurrentDeepLink } from '@tauri-apps/plugin-deep-link';
import { supabase } from './utils/supabase';

type Tab = 'focus' | 'tasks' | 'projects' | 'reports';

function LoadingScreen({ message }: { message?: string }) {
  const { t } = useTranslation('common');
  const text = message ?? t('loadingMessage');
  return (
    <div
      className="w-full h-full flex items-center justify-center relative overflow-hidden"
      style={{ background: 'var(--bg)' }}
    >
      <div
        className="absolute w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'rgba(255,77,77,0.06)', filter: 'blur(80px)', top: '20%', left: '50%', transform: 'translateX(-50%)' }}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        className="flex flex-col items-center gap-5 relative z-10"
      >
        <div style={{ filter: 'drop-shadow(0 0 20px rgba(255,77,77,0.3))' }}>
          <img src="/logo.svg" alt="Brew Focus" className="w-14 h-14 rounded-2xl" />
        </div>
        <div className="text-center">
          <div
            className="font-fraunces text-2xl font-semibold"
            style={{
              background: 'linear-gradient(135deg, var(--t) 0%, var(--t2) 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}
          >
            Brew Focus
          </div>
          <div className="text-[12px] mt-1" style={{ color: 'var(--t3)' }}>{text}</div>
        </div>
        <div className="w-36 h-0.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, var(--accent), #ff8080)' }}
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
      </motion.div>
    </div>
  );
}

function MainApp() {
  const [activeTab, setActiveTab] = useState<Tab>('focus');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState<'timer' | 'behavior' | 'goals' | 'sounds' | 'appearance' | 'account'>('timer');
  const [appReady, setAppReady] = useState(false);

  const { settings } = useSettingsStore();
  const { loadSettings } = useSettingsStore();
  const { loadTasks } = useTaskStore();
  const { loadState, setActiveTask, isRunning: timerIsRunning, phase: timerPhase } = useTimerStore();
  const { loadEvents } = useActivityStore();
  const loadCatalog = useCoffeeCupCatalogStore((s) => s.loadCatalog);
  const loadLocale = useLocaleStore((s) => s.loadFromSettings);
  const { isFullscreen, isWidget } = useWindowModeContext();

  useClickSound(settings.clickSounds, settings.soundVolume ?? 70);
  const { update, downloading, progress, error: updateError, installUpdate, dismiss } = useUpdater();

  useEffect(() => {
    const id = settings.backgroundNoise ?? 'none';
    const shouldPlay = id !== 'none' && timerIsRunning && timerPhase === 'work';
    if (shouldPlay) {
      setBackgroundNoise(id, settings.noiseVolume ?? 50).catch(console.warn);
    } else {
      stopBackgroundNoise();
    }
  }, [settings.backgroundNoise, timerIsRunning, timerPhase]);

  useEffect(() => {
    setNoiseVolume(settings.noiseVolume ?? 50);
  }, [settings.noiseVolume]);

  useEffect(() => {
    const init = async () => {
      try {
        await Promise.all([loadSettings(), loadTasks(), loadEvents(), loadCatalog(), loadLocale()]);
        const currentSettings = useSettingsStore.getState().settings;
        const { tasks: loadedTasks, projects: loadedProjects, activeTaskId: loadedActiveTaskId } = useTaskStore.getState();
        setActiveTask(loadedActiveTaskId);
        const activeTask = loadedTasks.find((t) => t.id === loadedActiveTaskId);
        const activeProject = activeTask?.projectId
          ? loadedProjects.find((p) => p.id === activeTask.projectId)
          : undefined;
        const effectiveWorkDuration = activeTask?.customWorkDuration
          ?? activeProject?.customWorkDuration ?? currentSettings.workDuration;
        await loadState(effectiveWorkDuration);
      } catch (e) {
        console.error('App init failed:', e);
      } finally {
        setAppReady(true);
      }
    };
    init();
  }, []);

  const openAccountSettings = () => {
    setSettingsSection('account');
    setSettingsOpen(true);
  };

  if (!appReady) return <LoadingScreen />;

  if (isFullscreen) return <TimerView variant="fullscreen" />;
  if (isWidget) return <TimerView variant="widget" />;

  return (
    <div className="w-full h-full flex flex-col overflow-hidden" style={{ background: 'var(--bg)' }}>
      <TitleBar activeTab={activeTab} onTabChange={setActiveTab} onSettingsClick={() => setSettingsOpen(true)} onAccountSettingsClick={openAccountSettings} />
      <UpdateBanner update={update} downloading={downloading} progress={progress} error={updateError} onInstall={installUpdate} onDismiss={dismiss} />
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence initial={false}>
          {activeTab === 'focus' && (
            <motion.div key="focus" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2, ease: 'easeOut' }} className="absolute inset-0">
              <FocusScreen />
            </motion.div>
          )}
          {activeTab === 'tasks' && (
            <motion.div key="tasks" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2, ease: 'easeOut' }} className="absolute inset-0">
              <TasksScreen onSwitchToFocus={() => setActiveTab('focus')} />
            </motion.div>
          )}
          {activeTab === 'projects' && (
            <motion.div key="projects" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2, ease: 'easeOut' }} className="absolute inset-0">
              <ProjectsScreen onSwitchToFocus={() => setActiveTab('focus')} />
            </motion.div>
          )}
          {activeTab === 'reports' && (
            <motion.div key="reports" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2, ease: 'easeOut' }} className="absolute inset-0">
              <ReportsScreen />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} initialSection={settingsSection} />
    </div>
  );
}

async function handleAuthUrl(url: string) {
  if (!url.startsWith('brewfocus://')) return;
  const parsed = new URL(url);

  const errCode = parsed.searchParams.get('error') ?? new URLSearchParams(parsed.hash.slice(1)).get('error');
  const errDesc = parsed.searchParams.get('error_description') ?? new URLSearchParams(parsed.hash.slice(1)).get('error_description');
  if (errCode) {
    console.error('Deep link auth error:', errCode, errDesc);
    return;
  }

  const code = parsed.searchParams.get('code');
  const hashParams = new URLSearchParams(parsed.hash.slice(1));
  const accessToken = hashParams.get('access_token');
  const refreshToken = hashParams.get('refresh_token');

  try {
    if (code) {
      await supabase.auth.exchangeCodeForSession(code);
    } else if (accessToken && refreshToken) {
      await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    }
  } catch (e) {
    console.error('Deep link auth exchange failed:', e);
  }
}

function AppContent() {
  const { user, isLoading, initialize } = useAuthStore();

  useEffect(() => {
    initialize();

    let unlisten: (() => void) | undefined;
    (async () => {
      try {
        const initial = await getCurrentDeepLink();
        if (initial) {
          for (const url of initial) await handleAuthUrl(url);
        }
      } catch {}

      try {
        unlisten = await onOpenUrl(async (urls) => {
          for (const url of urls) await handleAuthUrl(url);
        });
      } catch {}
    })();

    return () => { unlisten?.(); };
  }, []);

  if (isLoading) return <LoadingScreen />;
  if (!user) return <AuthScreen />;
  return <MainApp />;
}

function App() {
  return (
    <WindowModeProvider>
      <AppContent />
    </WindowModeProvider>
  );
}

export default App;
