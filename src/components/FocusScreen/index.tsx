import React, { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { motion, AnimatePresence } from 'framer-motion';
import { PanelRight, Sliders } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTimerStore } from '../../store/timerStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useTaskStore } from '../../store/taskStore';
import { TimerPhase } from '../../types';
import { useEffectiveDurations, formatTimerTime } from '../../hooks/useTimer';
import { useWindowModeContext } from '../../contexts/WindowModeContext';
import { CoffeeCup } from './CoffeeCup';
import { CoffeeCupPicker } from './CoffeeCupPicker';
import { TimerDisplay } from './TimerDisplay';
import { TimerControls } from './TimerControls';
import { TaskSelector } from './TaskSelector';
import { DailyQueuePanel } from './DailyQueuePanel';
import { SidePanel } from '../SidePanel';
import { playTimerPause } from '../../utils/sounds';
import { playSoundOption, playCustomSoundFile } from '../../utils/soundOptions';
import { getBackground } from '../../utils/backgrounds';
import { FocusCustomizePanel } from '../FocusCustomizePanel';

// Leaf subscribers — these own the per-second `secondsLeft` subscription so the
// FocusScreen body (side panel, gradient meshes, task selector, daily queue)
// does NOT re-render every tick. Only the cup fill and the digits update each
// second; everything else re-renders only on real state changes.
const LiveCoffeeCup: React.FC<{
  isRunning: boolean;
  phase: TimerPhase;
  size: number;
  variantId: string;
}> = ({ isRunning, phase, size, variantId }) => {
  const secondsLeft = useTimerStore((s) => s.secondsLeft);
  const totalSeconds = useTimerStore((s) => s.totalSeconds);
  const progress = totalSeconds > 0 ? 1 - secondsLeft / totalSeconds : 0;
  return <CoffeeCup progress={progress} isRunning={isRunning} phase={phase} size={size} variantId={variantId} />;
};

const LiveTimerDisplay: React.FC<{
  phase: TimerPhase;
  sessionsCompleted: number;
  sessionsGoal: number;
}> = ({ phase, sessionsCompleted, sessionsGoal }) => {
  const secondsLeft = useTimerStore((s) => s.secondsLeft);
  return (
    <TimerDisplay
      timeString={formatTimerTime(secondsLeft)}
      phase={phase}
      sessionsCompleted={sessionsCompleted}
      sessionsGoal={sessionsGoal}
    />
  );
};

export const FocusScreen: React.FC = () => {
  const { t } = useTranslation('focus');
  const [panelOpen, setPanelOpen] = useState(true);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [cupPickerOpen, setCupPickerOpen] = useState(false);
  // Narrow selectors — none of these change on a timer tick. `secondsLeft` is
  // intentionally NOT subscribed here; the live countdown lives in the
  // LiveCoffeeCup / LiveTimerDisplay leaf components so the rest of the screen
  // stays still between real state changes.
  const { isRunning, phase, sessionCount } = useTimerStore(
    useShallow((s) => ({
      isRunning: s.isRunning,
      phase: s.phase,
      sessionCount: s.sessionCount,
    }))
  );
  const start = useTimerStore((s) => s.start);
  const pause = useTimerStore((s) => s.pause);
  const skip = useTimerStore((s) => s.skip);
  const reset = useTimerStore((s) => s.reset);
  const { settings } = useSettingsStore();
  const { tasks, activeTaskId } = useTaskStore();
  const activeTask = tasks.find((t) => t.id === activeTaskId);
  const {
    effectiveWorkDuration,
    effectiveShortBreakDuration,
    effectiveLongBreakDuration,
    effectiveLongBreakInterval,
  } = useEffectiveDurations();
  const { enterFullscreen, enterWidget } = useWindowModeContext();

  // Completion side effects (queue advance + auto-start) deliberately do NOT
  // live here: mounted in this screen they only ran in the main window mode.
  // They are registered once at App level via useCompletionSideEffects.

  const activeBg = getBackground(settings.backgroundId ?? 'default');
  const bgImageUrl = settings.backgroundId === 'custom'
    ? settings.customBackgroundDataUrl
    : activeBg.src;

  const handlePlay = () => {
    if (settings.soundNotifications) {
      const eventKey = phase === 'work' ? 'sessionStartSound' : 'breakStartSound';
      const soundId = (settings[eventKey as keyof typeof settings] as string) ?? (phase === 'work' ? 'chime' : 'soft');
      if (soundId === 'custom') {
        const cf = settings.customSoundFiles?.[eventKey];
        if (cf) playCustomSoundFile(cf.dataUrl, settings.soundVolume ?? 70);
      } else {
        playSoundOption(soundId, settings.soundVolume ?? 70);
      }
    }
    start();
  };

  const handlePause = () => {
    if (settings.soundNotifications) playTimerPause(settings.soundVolume ?? 70);
    pause();
  };

  const handleSkip = () => {
    skip(effectiveWorkDuration, effectiveShortBreakDuration, effectiveLongBreakDuration, effectiveLongBreakInterval);
  };

  const handleReset = () => {
    reset(effectiveWorkDuration);
  };

  const phaseGlowRgba =
    phase === 'work' ? 'rgba(var(--accent-rgb),' :
    phase === 'shortBreak' ? 'rgba(var(--grn-rgb),' :
    'rgba(var(--blu-rgb),';

  return (
    <div
      className="flex w-full h-full overflow-hidden"
      style={{
        backgroundColor: 'var(--bg)',
        backgroundImage: bgImageUrl ? `url("${bgImageUrl}")` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        transition: 'background-image 0.4s ease',
      }}
    >
      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center relative min-w-0 gap-5 overflow-hidden">
        {/* Gradient mesh background — only shown when no custom background is active */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{ opacity: [0.85, 1, 0.85] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            display: bgImageUrl ? 'none' : undefined,
            background: [
              // Phase-reactive center glow — circle keyword keeps it round at any aspect ratio
              `radial-gradient(circle at 50% 36%, ${phaseGlowRgba}0.24) 0%, ${phaseGlowRgba}0.08) 30%, transparent 55%)`,
              // Blue accent — bottom-right
              `radial-gradient(circle at 90% 90%, rgba(91,141,238,0.16) 0%, transparent 45%)`,
              // Purple accent — top-left
              `radial-gradient(circle at 8% 12%, rgba(167,139,250,0.12) 0%, transparent 40%)`,
              // Warm amber — bottom-left
              `radial-gradient(circle at 6% 92%, rgba(245,166,35,0.08) 0%, transparent 35%)`,
            ].join(','),
            transition: 'background 1.6s ease',
          }}
        />
        {/* Subtle dot grid — fades toward edges */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(var(--srf-rgb),0.035) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
            maskImage: 'radial-gradient(ellipse 65% 65% at 50% 45%, black 30%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 65% 65% at 50% 45%, black 30%, transparent 100%)',
          }}
        />

        {/* Center scrim — darkens the wallpaper behind the timer so text is readable.
            Pure CSS radial gradient (no backdrop-filter) for full WebKit compatibility.
            Strongest in the center, fades to transparent at the edges so the wallpaper
            stays vibrant around the frame. */}
        {bgImageUrl && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse 80% 90% at 50% 50%, rgba(0,0,0,0.60) 0%, rgba(0,0,0,0.35) 50%, rgba(0,0,0,0.08) 80%, transparent 100%)',
            }}
          />
        )}

        {/* Customize button */}
        <button
          onClick={() => setCustomizeOpen(true)}
          className="absolute top-4 right-14 w-8 h-8 flex items-center justify-center rounded-xl transition-all duration-200"
          style={{
            color: 'var(--t3)',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--brd)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'var(--t2)'; e.currentTarget.style.borderColor = 'var(--brd2)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'var(--t3)'; e.currentTarget.style.borderColor = 'var(--brd)'; }}
          title={t('customize')}
        >
          <Sliders size={14} />
        </button>

        {/* Panel toggle */}
        <button
          onClick={() => setPanelOpen(!panelOpen)}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-xl transition-all duration-200"
          style={{
            color: panelOpen ? 'var(--accent)' : 'var(--t3)',
            background: panelOpen ? 'var(--accent-d)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${panelOpen ? 'var(--accent-g)' : 'var(--brd)'}`,
          }}
          onMouseEnter={(e) => {
            if (!panelOpen) {
              e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
              e.currentTarget.style.color = 'var(--t2)';
              e.currentTarget.style.borderColor = 'var(--brd2)';
            }
          }}
          onMouseLeave={(e) => {
            if (!panelOpen) {
              e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
              e.currentTarget.style.color = 'var(--t3)';
              e.currentTarget.style.borderColor = 'var(--brd)';
            }
          }}
          title={t('togglePanel')}
        >
          <PanelRight size={15} />
        </button>

        {/* Task Selector — z-30 (higher than the coffee cup + timer wrapper at
            z-10) so its open dropdown overlays the cup instead of being
            painted behind it. The dropdown's own `z-50` only escapes within
            this parent's stacking context. */}
        <div className="w-full max-w-xs px-4 relative z-30">
          <TaskSelector />
        </div>

        {/* Coffee Cup + Timer */}
        <div className="flex flex-col items-center gap-5 relative z-10">
          {/* Halo ring when running */}
          <div className="relative">
            {isRunning && (
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                  background: `radial-gradient(circle, ${phaseGlowRgba}0.12) 0%, transparent 70%)`,
                  scale: 1.5,
                }}
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              />
            )}
            <motion.div
              animate={isRunning ? { scale: [1, 1.015, 1] } : { scale: 1 }}
              transition={
                isRunning
                  ? { duration: 4, repeat: Infinity, ease: 'easeInOut' }
                  : { duration: 0.3 }
              }
            >
              <button
                onClick={() => setCupPickerOpen(true)}
                className="group relative block bg-transparent border-0 p-0 cursor-pointer"
                style={{ outline: 'none' }}
                title={t('changeCup')}
                aria-label={t('changeCupAria')}
              >
                <LiveCoffeeCup
                  isRunning={isRunning}
                  phase={phase}
                  size={180}
                  variantId={settings.coffeeCupVariant ?? 'classic'}
                />
                <span
                  className="absolute left-1/2 -translate-x-1/2 -bottom-2 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200"
                  style={{
                    background: 'var(--card)',
                    border: '1px solid var(--brd2)',
                    color: 'var(--t2)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t('changeCup')}
                </span>
              </button>
            </motion.div>
          </div>

          <LiveTimerDisplay
            phase={phase}
            sessionsCompleted={
              activeTask && activeTask.pomodoroEstimate > 0
                ? activeTask.pomodoroCompleted
                : sessionCount
            }
            sessionsGoal={
              activeTask && activeTask.pomodoroEstimate > 0
                ? activeTask.pomodoroEstimate
                : Number.isFinite(effectiveLongBreakInterval)
                ? effectiveLongBreakInterval
                : settings.longBreakInterval
            }
          />

          <TimerControls
            isRunning={isRunning}
            onPlay={handlePlay}
            onPause={handlePause}
            onSkip={handleSkip}
            onReset={handleReset}
            onFullscreen={enterFullscreen}
            onWidget={enterWidget}
          />
        </div>

        {/* Daily Focus Queue */}
        <div className="px-4 relative z-10 w-full flex justify-center">
          <DailyQueuePanel />
        </div>
      </div>

      {/* Side Panel */}
      <AnimatePresence>
        {panelOpen && (
          <motion.div
            key="side-panel"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 290, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden shrink-0"
            style={{ borderLeft: '1px solid var(--brd)' }}
          >
            <div className="w-[290px] h-full overflow-y-auto">
              <SidePanel />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Customize panel */}
      <FocusCustomizePanel open={customizeOpen} onClose={() => setCustomizeOpen(false)} />

      {/* Coffee cup picker */}
      <CoffeeCupPicker open={cupPickerOpen} onClose={() => setCupPickerOpen(false)} />

    </div>
  );
};
