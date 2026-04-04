import React from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, SkipForward, Minimize2, X } from 'lucide-react';
import { useTimerStore } from '../../store/timerStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useTaskStore } from '../../store/taskStore';
import { useTimer } from '../../hooks/useTimer';
import { useWindowModeContext } from '../../contexts/WindowModeContext';
import { CoffeeCup } from './CoffeeCup';
import { TimerPhase } from '../../types';
import { getBackground } from '../../utils/backgrounds';

const phaseLabels: Record<TimerPhase, string> = {
  work: 'Focus',
  shortBreak: 'Short Break',
  longBreak: 'Long Break',
};

const phaseColors: Record<TimerPhase, string> = {
  work: 'var(--accent)',
  shortBreak: 'var(--grn)',
  longBreak: 'var(--blu)',
};

interface TimerViewProps {
  variant: 'fullscreen' | 'widget';
}

export const TimerView: React.FC<TimerViewProps> = ({ variant }) => {
  const { isRunning, phase, sessionCount, start, pause, skip, secondsLeft } = useTimerStore();
  const { settings } = useSettingsStore();

  const bgSrc = settings.backgroundId === 'custom'
    ? settings.customBackgroundDataUrl
    : getBackground(settings.backgroundId ?? 'default').src;
  const bgStyle = bgSrc
    ? { backgroundImage: `url("${bgSrc}")`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: 'var(--bg)' };
  const { tasks, activeTaskId } = useTaskStore();
  const { formatTime, progress, effectiveWorkDuration, effectiveShortBreakDuration, effectiveLongBreakDuration } = useTimer();
  const { exitToNormal, toggleWidget } = useWindowModeContext();

  const timeString = formatTime(secondsLeft);
  const activeTask = tasks.find((t) => t.id === activeTaskId);
  const phaseColor = phaseColors[phase];

  const handleSkip = () => {
    skip(effectiveWorkDuration, effectiveShortBreakDuration, effectiveLongBreakDuration, settings.longBreakInterval);
  };

  if (variant === 'widget') {
    return (
      <div
        className="w-full h-full flex flex-col items-center justify-center p-4 select-none"
        style={bgStyle}
        data-tauri-drag-region
      >
        {/* Close/Expand button */}
        <div className="absolute top-2 right-2 flex gap-1" data-no-drag>
          <button
            onClick={exitToNormal}
            className="w-6 h-6 flex items-center justify-center rounded-md transition-colors"
            style={{ color: 'var(--t3)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--card)';
              e.currentTarget.style.color = 'var(--t)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--t3)';
            }}
            title="Expand"
          >
            <Minimize2 size={12} />
          </button>
          <button
            onClick={exitToNormal}
            className="w-6 h-6 flex items-center justify-center rounded-md transition-colors"
            style={{ color: 'var(--t3)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--accent)';
              e.currentTarget.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--t3)';
            }}
            title="Close widget"
          >
            <X size={12} />
          </button>
        </div>

        {/* Phase indicator */}
        <div className="flex items-center gap-1.5 mb-2" data-no-drag>
          <div className="w-2 h-2 rounded-full" style={{ background: phaseColor }} />
          <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: phaseColor }}>
            {phaseLabels[phase]}
          </span>
        </div>

        {/* Coffee cup */}
        <div data-no-drag>
          <CoffeeCup progress={progress} isRunning={isRunning} size={100} />
        </div>

        {/* Time */}
        <div
          className="text-[42px] font-light tabular-nums mt-2"
          style={{ color: 'var(--t)', letterSpacing: '-1px' }}
          data-no-drag
        >
          {timeString}
        </div>

        {/* Session dots */}
        <div className="flex items-center gap-1.5 mt-2" data-no-drag>
          {Array.from({ length: settings.longBreakInterval }).map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all"
              style={{
                width: i === sessionCount ? '8px' : '5px',
                height: i === sessionCount ? '8px' : '5px',
                background:
                  i < sessionCount ? 'var(--t3)' : i === sessionCount ? phaseColor : 'var(--brd2)',
              }}
            />
          ))}
        </div>

        {/* Task name */}
        <div
          className="mt-3 mx-3 px-3 py-1.5 rounded-lg text-center max-w-full"
          style={{ background: 'var(--card)' }}
          data-no-drag
        >
          {activeTask ? (
            <div
              className="text-[12px] font-medium truncate"
              style={{ color: 'var(--t)' }}
            >
              {activeTask.title}
            </div>
          ) : (
            <div
              className="text-[11px]"
              style={{ color: 'var(--t3)' }}
            >
              No task selected
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 mt-4" data-no-drag>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={isRunning ? pause : start}
            className="w-12 h-12 flex items-center justify-center rounded-full"
            style={{
              background: phaseColor,
              boxShadow: `0 4px 16px ${phaseColor}40`,
            }}
          >
            {isRunning ? (
              <Pause size={20} fill="white" color="white" />
            ) : (
              <Play size={20} fill="white" color="white" style={{ marginLeft: 2 }} />
            )}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSkip}
            className="w-8 h-8 flex items-center justify-center rounded-full"
            style={{ background: 'var(--card)', color: 'var(--t2)' }}
          >
            <SkipForward size={14} />
          </motion.button>
        </div>
      </div>
    );
  }

  // Fullscreen variant
  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center select-none relative"
      style={bgStyle}
    >
      {/* Center scrim when wallpaper is active */}
      {bgSrc && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 65% 80% at 50% 50%, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.32) 52%, rgba(0,0,0,0.06) 80%, transparent 100%)',
          }}
        />
      )}

      {/* Exit button */}
      <button
        onClick={exitToNormal}
        className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-xl transition-colors"
        style={{ background: 'var(--card)', color: 'var(--t2)' }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--card-h)';
          e.currentTarget.style.color = 'var(--t)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'var(--card)';
          e.currentTarget.style.color = 'var(--t2)';
        }}
        title="Exit fullscreen (Esc)"
      >
        <X size={18} />
      </button>

      {/* Widget mode button */}
      <button
        onClick={toggleWidget}
        className="absolute top-6 right-20 w-10 h-10 flex items-center justify-center rounded-xl transition-colors"
        style={{ background: 'var(--card)', color: 'var(--t2)' }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--card-h)';
          e.currentTarget.style.color = 'var(--t)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'var(--card)';
          e.currentTarget.style.color = 'var(--t2)';
        }}
        title="Widget mode"
      >
        <Minimize2 size={16} />
      </button>

      {/* Phase label */}
      <motion.div
        key={phase}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 mb-8"
      >
        <div className="w-3 h-3 rounded-full" style={{ background: phaseColor }} />
        <span
          className="text-[18px] font-medium tracking-wider uppercase"
          style={{ color: phaseColor }}
        >
          {phaseLabels[phase]}
        </span>
      </motion.div>

      {/* Coffee cup */}
      <motion.div
        animate={isRunning ? { scale: [1, 1.02, 1] } : { scale: 1 }}
        transition={isRunning ? { duration: 4, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.3 }}
      >
        <CoffeeCup progress={progress} isRunning={isRunning} size={240} />
      </motion.div>

      {/* Time */}
      <div
        className="text-[96px] font-light tabular-nums mt-8"
        style={{ color: 'var(--t)', letterSpacing: '-4px', lineHeight: 1 }}
      >
        {timeString}
      </div>

      {/* Session dots */}
      <div className="flex items-center gap-3 mt-6">
        {Array.from({ length: settings.longBreakInterval }).map((_, i) => (
          <div
            key={i}
            className="rounded-full transition-all"
            style={{
              width: i === sessionCount ? '12px' : '8px',
              height: i === sessionCount ? '12px' : '8px',
              background:
                i < sessionCount ? 'var(--t3)' : i === sessionCount ? phaseColor : 'var(--brd2)',
            }}
          />
        ))}
      </div>

      {/* Task name */}
      {activeTask && (
        <div className="text-[15px] mt-4 max-w-md truncate" style={{ color: 'var(--t3)' }}>
          {activeTask.title}
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-6 mt-10">
        <motion.button
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          onClick={isRunning ? pause : start}
          className="w-20 h-20 flex items-center justify-center rounded-full shadow-xl"
          style={{
            background: phaseColor,
            boxShadow: `0 8px 32px ${phaseColor}40`,
          }}
        >
          {isRunning ? (
            <Pause size={32} fill="white" color="white" />
          ) : (
            <Play size={32} fill="white" color="white" style={{ marginLeft: 3 }} />
          )}
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          onClick={handleSkip}
          className="w-14 h-14 flex items-center justify-center rounded-full"
          style={{ background: 'var(--card)', color: 'var(--t2)' }}
        >
          <SkipForward size={22} />
        </motion.button>
      </div>

      {/* Hint */}
      <div className="absolute bottom-6 text-[12px]" style={{ color: 'var(--t3)' }}>
        Press <kbd className="px-1.5 py-0.5 rounded" style={{ background: 'var(--card)' }}>Esc</kbd> to exit
      </div>
    </div>
  );
};
