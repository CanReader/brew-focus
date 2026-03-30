import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Pause, SkipForward } from 'lucide-react';
import { useTimerStore } from '../store/timerStore';
import { useSettingsStore } from '../store/settingsStore';
import { useTaskStore } from '../store/taskStore';
import { useTimer } from '../hooks/useTimer';
import { TimerPhase } from '../types';

interface TimerModalProps {
  open: boolean;
  onClose: () => void;
}

const phaseLabels: Record<TimerPhase, string> = {
  work: 'Focus Session',
  shortBreak: 'Short Break',
  longBreak: 'Long Break',
};

const phaseColors: Record<TimerPhase, string> = {
  work: 'var(--accent)',
  shortBreak: 'var(--grn)',
  longBreak: 'var(--blu)',
};

export const TimerModal: React.FC<TimerModalProps> = ({ open, onClose }) => {
  const { isRunning, phase, sessionCount, activeTaskId, start, pause, skip } = useTimerStore();
  const { settings } = useSettingsStore();
  const { tasks } = useTaskStore();
  const { formatTime, progress } = useTimer();
  const { secondsLeft } = useTimerStore();

  const timeString = formatTime(secondsLeft);
  const activeTask = tasks.find((t) => t.id === activeTaskId);
  const phaseColor = phaseColors[phase];

  // SVG circle progress
  const size = 320;
  const radius = 140;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  const handleSkip = () => {
    skip(settings.workDuration, settings.shortBreakDuration, settings.longBreakDuration, settings.longBreakInterval);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'var(--bg)' }}
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="relative flex flex-col items-center gap-8"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute -top-4 -right-4 w-9 h-9 flex items-center justify-center rounded-full transition-colors"
              style={{ background: 'var(--card)', color: 'var(--t2)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--card-h)';
                e.currentTarget.style.color = 'var(--t)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--card)';
                e.currentTarget.style.color = 'var(--t2)';
              }}
            >
              <X size={16} />
            </button>

            {/* Phase label */}
            <motion.div
              key={phase}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2"
            >
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ background: phaseColor }}
              />
              <span
                className="text-[15px] font-medium tracking-wider uppercase"
                style={{ color: phaseColor }}
              >
                {phaseLabels[phase]}
              </span>
            </motion.div>

            {/* Big progress ring with time */}
            <div className="relative" style={{ width: size, height: size }}>
              <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                {/* Track */}
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke="var(--brd)"
                  strokeWidth="3"
                  fill="none"
                />
                {/* Progress */}
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke={phaseColor}
                  strokeWidth="4"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                  style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 0.3s ease' }}
                />
              </svg>

              {/* Time in center */}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <span
                  className="font-sans tabular-nums"
                  style={{
                    fontSize: '72px',
                    fontWeight: 200,
                    letterSpacing: '-2px',
                    color: 'var(--t)',
                    lineHeight: 1,
                  }}
                >
                  {timeString}
                </span>

                {/* Session dots */}
                <div className="flex items-center gap-2">
                  {Array.from({ length: settings.longBreakInterval }).map((_, i) => (
                    <div
                      key={i}
                      className="rounded-full transition-all"
                      style={{
                        width: i === sessionCount ? '10px' : '7px',
                        height: i === sessionCount ? '10px' : '7px',
                        background:
                          i < sessionCount
                            ? 'var(--t3)'
                            : i === sessionCount
                            ? phaseColor
                            : 'var(--brd2)',
                      }}
                    />
                  ))}
                </div>

                {activeTask && (
                  <span
                    className="text-[13px] max-w-[200px] text-center truncate"
                    style={{ color: 'var(--t3)' }}
                  >
                    {activeTask.title}
                  </span>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-6">
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.94 }}
                onClick={isRunning ? pause : start}
                className="w-20 h-20 flex items-center justify-center rounded-full shadow-xl"
                style={{
                  background: phaseColor,
                  boxShadow: `0 8px 32px ${phaseColor}40`,
                }}
              >
                {isRunning ? (
                  <Pause size={30} fill="white" color="white" />
                ) : (
                  <Play size={30} fill="white" color="white" style={{ marginLeft: 3 }} />
                )}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.94 }}
                onClick={handleSkip}
                className="w-12 h-12 flex items-center justify-center rounded-full"
                style={{ background: 'var(--card)', color: 'var(--t2)' }}
              >
                <SkipForward size={20} />
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
