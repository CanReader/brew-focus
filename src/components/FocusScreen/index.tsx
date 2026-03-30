import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PanelRight } from 'lucide-react';
import { useTimerStore } from '../../store/timerStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useTimer } from '../../hooks/useTimer';
import { CoffeeCup } from './CoffeeCup';
import { TimerDisplay } from './TimerDisplay';
import { TimerControls } from './TimerControls';
import { TaskSelector } from './TaskSelector';
import { SidePanel } from '../SidePanel';
import { useState } from 'react';

interface FocusScreenProps {
  onOpenTimerModal: () => void;
}

export const FocusScreen: React.FC<FocusScreenProps> = ({ onOpenTimerModal }) => {
  const [panelOpen, setPanelOpen] = useState(true);
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
  } = useTimer();

  const timeString = formatTime(secondsLeft);

  // Auto-start next session when phase changes
  useEffect(() => {
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

  const handleSkip = () => {
    skip(effectiveWorkDuration, effectiveShortBreakDuration, effectiveLongBreakDuration, settings.longBreakInterval);
  };

  const handleReset = () => {
    reset(effectiveWorkDuration);
  };

  return (
    <div className="flex w-full h-full overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center relative min-w-0 gap-6">
        {/* Panel toggle */}
        <button
          onClick={() => setPanelOpen(!panelOpen)}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-150"
          style={{
            color: panelOpen ? 'var(--accent)' : 'var(--t3)',
            background: panelOpen ? 'var(--accent-d)' : 'transparent',
          }}
          onMouseEnter={(e) => {
            if (!panelOpen) {
              e.currentTarget.style.background = 'var(--card)';
              e.currentTarget.style.color = 'var(--t2)';
            }
          }}
          onMouseLeave={(e) => {
            if (!panelOpen) {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--t3)';
            }
          }}
          title="Toggle side panel"
        >
          <PanelRight size={15} />
        </button>

        {/* Task Selector — above the coffee cup */}
        <div className="w-full max-w-xs px-4">
          <TaskSelector />
        </div>

        {/* Coffee Cup + Timer */}
        <div className="flex flex-col items-center gap-6">
          <motion.div
            animate={isRunning ? { scale: [1, 1.02, 1] } : { scale: 1 }}
            transition={
              isRunning
                ? { duration: 4, repeat: Infinity, ease: 'easeInOut' }
                : { duration: 0.3 }
            }
          >
            <CoffeeCup progress={progress} isRunning={isRunning} size={180} />
          </motion.div>

          <TimerDisplay
            timeString={timeString}
            phase={phase}
            sessionCount={sessionCount}
            longBreakInterval={settings.longBreakInterval}
          />

          <TimerControls
            isRunning={isRunning}
            onPlay={start}
            onPause={pause}
            onSkip={handleSkip}
            onReset={handleReset}
            onFullscreen={onOpenTimerModal}
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
    </div>
  );
};
