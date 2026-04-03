import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PanelRight } from 'lucide-react';
import { useTimerStore } from '../../store/timerStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useTimer } from '../../hooks/useTimer';
import { useWindowModeContext } from '../../contexts/WindowModeContext';
import { CoffeeCup } from './CoffeeCup';
import { TimerDisplay } from './TimerDisplay';
import { TimerControls } from './TimerControls';
import { TaskSelector } from './TaskSelector';
import { SidePanel } from '../SidePanel';
import { playTimerStart, playTimerPause } from '../../utils/sounds';
import { SessionAnimation, SessionAnimationType } from '../SessionAnimation';

interface FocusScreenProps {}

export const FocusScreen: React.FC<FocusScreenProps> = () => {
  const [panelOpen, setPanelOpen] = useState(true);
  const [sessionAnim, setSessionAnim] = useState<SessionAnimationType>(null);
  const {
    isRunning,
    phase,
    sessionCount,
    start,
    pause,
    skip,
    reset,
    secondsLeft,
  } = useTimerStore();
  const { settings } = useSettingsStore();
  const {
    formatTime,
    progress,
    effectiveWorkDuration,
    effectiveShortBreakDuration,
    effectiveLongBreakDuration,
    effectiveLongBreakInterval,
  } = useTimer();
  const { enterFullscreen, enterWidget } = useWindowModeContext();

  const timeString = formatTime(secondsLeft);
  const prevPhaseRef = useRef(phase);

  // Auto-start next session + trigger animation when phase actually changes (not on mount)
  useEffect(() => {
    if (prevPhaseRef.current === phase) {
      return;
    }
    const completedPhase = prevPhaseRef.current;
    prevPhaseRef.current = phase;

    if (completedPhase === 'work') {
      setSessionAnim('session-complete');
    } else if (completedPhase === 'shortBreak' || completedPhase === 'longBreak') {
      setSessionAnim('break-complete');
    }

    const expectedTotal =
      phase === 'work'
        ? effectiveWorkDuration * 60
        : phase === 'shortBreak'
        ? effectiveShortBreakDuration * 60
        : effectiveLongBreakDuration * 60;

    if (!isRunning && secondsLeft === expectedTotal) {
      if (phase !== 'work' && settings.autoStartBreaks) {
        start();
      } else if (phase === 'work' && settings.autoStartPomodoros) {
        start();
      }
    }
  }, [phase]);

  const handlePlay = () => {
    if (settings.soundNotifications) playTimerStart(settings.soundVolume ?? 70);
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
    phase === 'work' ? 'rgba(255,77,77,' :
    phase === 'shortBreak' ? 'rgba(34,211,165,' :
    'rgba(91,141,238,';

  return (
    <div className="flex w-full h-full overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center relative min-w-0 gap-5 overflow-hidden">
        {/* Gradient mesh background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Primary accent blob — large radial gradient, fades to transparent */}
          <div
            className="mesh-blob absolute"
            style={{
              width: 700,
              height: 700,
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -55%)',
              background: `radial-gradient(circle at center, ${phaseGlowRgba}0.18) 0%, ${phaseGlowRgba}0.07) 35%, transparent 70%)`,
              transition: 'background 1.5s ease',
            }}
          />
          {/* Secondary blue blob — bottom right */}
          <div
            className="mesh-blob mesh-blob-2 absolute"
            style={{
              width: 500,
              height: 500,
              bottom: '-10%',
              right: '-5%',
              background: 'radial-gradient(circle at center, rgba(91,141,238,0.12) 0%, rgba(91,141,238,0.04) 40%, transparent 70%)',
            }}
          />
          {/* Purple blob — left */}
          <div
            className="mesh-blob absolute"
            style={{
              width: 400,
              height: 400,
              top: '55%',
              left: '-5%',
              background: 'radial-gradient(circle at center, rgba(167,139,250,0.10) 0%, rgba(167,139,250,0.03) 40%, transparent 70%)',
              animationDelay: '2s',
            }}
          />
          {/* Subtle dot grid */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
              backgroundSize: '28px 28px',
              maskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, black 40%, transparent 100%)',
              WebkitMaskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, black 40%, transparent 100%)',
            }}
          />
        </div>

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
          title="Toggle side panel"
        >
          <PanelRight size={15} />
        </button>

        {/* Task Selector */}
        <div className="w-full max-w-xs px-4 relative z-10">
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
              <CoffeeCup progress={progress} isRunning={isRunning} phase={phase} size={180} />
            </motion.div>
          </div>

          <TimerDisplay
            timeString={timeString}
            phase={phase}
            sessionCount={sessionCount}
            longBreakInterval={settings.longBreakInterval}
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

      {/* Session end animations */}
      <SessionAnimation
        type={sessionAnim}
        onDone={() => setSessionAnim(null)}
      />
    </div>
  );
};
