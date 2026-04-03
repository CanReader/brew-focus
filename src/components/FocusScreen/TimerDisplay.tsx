import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TimerPhase } from '../../types';

interface TimerDisplayProps {
  timeString: string;
  phase: TimerPhase;
  sessionCount: number;
  longBreakInterval: number;
}

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

const phaseBgColors: Record<TimerPhase, string> = {
  work: 'rgba(255,77,77,0.12)',
  shortBreak: 'rgba(34,211,165,0.12)',
  longBreak: 'rgba(91,141,238,0.12)',
};

const phaseBorderColors: Record<TimerPhase, string> = {
  work: 'rgba(255,77,77,0.25)',
  shortBreak: 'rgba(34,211,165,0.25)',
  longBreak: 'rgba(91,141,238,0.25)',
};

export const TimerDisplay: React.FC<TimerDisplayProps> = ({
  timeString,
  phase,
  sessionCount,
  longBreakInterval,
}) => {
  return (
    <div className="flex flex-col items-center gap-3">
      {/* Phase pill badge */}
      <AnimatePresence mode="wait">
        <motion.div
          key={phase}
          initial={{ opacity: 0, y: -8, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.9 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-2 px-3 py-1 rounded-full"
          style={{
            background: phaseBgColors[phase],
            border: `1px solid ${phaseBorderColors[phase]}`,
          }}
        >
          <motion.div
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: phaseColors[phase] }}
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
          <span
            className="text-[11px] font-semibold tracking-widest uppercase"
            style={{ color: phaseColors[phase] }}
          >
            {phaseLabels[phase]}
          </span>
        </motion.div>
      </AnimatePresence>

      {/* Time display */}
      <AnimatePresence mode="wait">
        <motion.div
          key={phase + '-time'}
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          style={{
            fontSize: '96px',
            fontWeight: 200,
            letterSpacing: '-4px',
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1,
            background: `linear-gradient(180deg, var(--t) 0%, rgba(240,240,255,0.7) 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            textShadow: 'none',
            filter: 'drop-shadow(0 2px 16px rgba(0,0,0,0.3))',
          }}
        >
          {timeString}
        </motion.div>
      </AnimatePresence>

      {/* Session pills */}
      <div className="flex items-center gap-1.5 mt-1">
        {Array.from({ length: longBreakInterval }).map((_, i) => {
          const isActive = i === sessionCount;
          const isCompleted = i < sessionCount;
          return (
            <motion.div
              key={i}
              className={`rounded-full transition-all duration-400 ${isActive ? 'session-dot-active' : ''}`}
              style={{
                width: isActive ? '20px' : isCompleted ? '7px' : '7px',
                height: '7px',
                background: isCompleted
                  ? 'rgba(255,255,255,0.2)'
                  : isActive
                  ? 'var(--accent)'
                  : 'rgba(255,255,255,0.08)',
                boxShadow: isActive ? '0 0 8px var(--accent-g)' : 'none',
              }}
              animate={isActive ? { scaleX: [1, 1.1, 1] } : {}}
              transition={isActive ? { duration: 2, repeat: Infinity, ease: 'easeInOut' } : {}}
            />
          );
        })}
        <span
          className="text-[10px] ml-1 tabular-nums"
          style={{ color: 'var(--t3)' }}
        >
          {sessionCount}/{longBreakInterval}
        </span>
      </div>
    </div>
  );
};
