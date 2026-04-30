import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { TimerPhase } from '../../types';

interface TimerDisplayProps {
  timeString: string;
  phase: TimerPhase;
  /** Sessions completed toward the active task's goal (or toward the long-break cycle if no task). */
  sessionsCompleted: number;
  /** The active task's pomodoro estimate (or longBreakInterval if no task). */
  sessionsGoal: number;
}

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
  sessionsCompleted,
  sessionsGoal,
}) => {
  const { t } = useTranslation('focus');
  const phaseLabels: Record<TimerPhase, string> = {
    work: t('phase.work'),
    shortBreak: t('phase.shortBreak'),
    longBreak: t('phase.longBreak'),
  };
  const goal = Math.max(1, Math.min(12, sessionsGoal));
  const completed = Math.min(goal, Math.max(0, sessionsCompleted));
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
            // Theme-aware gradient: goes from primary text color to secondary,
            // which means subtle highlight on dark themes AND subtle fade on
            // light themes (instead of fading to near-white on light = invisible).
            background: `linear-gradient(180deg, var(--t) 0%, var(--t2) 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            textShadow: 'none',
            // Light, neutral shadow that works on both light and dark backgrounds.
            // The old heavy black drop-shadows were a "glow on dark" hack that
            // showed up as dark halos around the digits on light themes.
            filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.12))',
          }}
        >
          {timeString}
        </motion.div>
      </AnimatePresence>

      {/* Session pills */}
      <div className="flex items-center gap-1.5 mt-1">
        {Array.from({ length: goal }).map((_, i) => {
          const isActive = i === completed && completed < goal;
          const isCompleted = i < completed;
          return (
            <motion.div
              key={i}
              className={`rounded-full transition-all duration-400 ${isActive ? 'session-dot-active' : ''}`}
              style={{
                width: isActive ? '20px' : '7px',
                height: '7px',
                background: isCompleted
                  ? 'var(--accent)'
                  : isActive
                  ? 'var(--accent)'
                  : 'var(--brd2)',
                opacity: isCompleted ? 0.85 : 1,
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
          {completed}/{goal}
        </span>
      </div>
    </div>
  );
};
