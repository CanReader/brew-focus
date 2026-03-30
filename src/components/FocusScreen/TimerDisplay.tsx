import React from 'react';
import { motion } from 'framer-motion';
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

export const TimerDisplay: React.FC<TimerDisplayProps> = ({
  timeString,
  phase,
  sessionCount,
  longBreakInterval,
}) => {
  return (
    <div className="flex flex-col items-center gap-3">
      {/* Phase label */}
      <motion.div
        key={phase}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2"
      >
        <div
          className="w-2 h-2 rounded-full"
          style={{ background: phaseColors[phase] }}
        />
        <span
          className="text-[13px] font-medium tracking-wider uppercase"
          style={{ color: phaseColors[phase] }}
        >
          {phaseLabels[phase]}
        </span>
      </motion.div>

      {/* Time display */}
      <motion.div
        key={phase + '-time'}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="font-sans"
        style={{
          fontSize: '88px',
          fontWeight: 200,
          letterSpacing: '-2px',
          color: 'var(--t)',
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1,
        }}
      >
        {timeString}
      </motion.div>

      {/* Session dots */}
      <div className="flex items-center gap-2 mt-1">
        {Array.from({ length: longBreakInterval }).map((_, i) => (
          <div
            key={i}
            className={`rounded-full transition-all duration-300 ${
              i === sessionCount ? 'session-dot-active' : ''
            }`}
            style={{
              width: i === sessionCount ? '10px' : '7px',
              height: i === sessionCount ? '10px' : '7px',
              background:
                i < sessionCount
                  ? 'var(--t3)'
                  : i === sessionCount
                  ? 'var(--accent)'
                  : 'var(--brd2)',
            }}
          />
        ))}
        <span className="text-[11px] ml-1" style={{ color: 'var(--t3)' }}>
          {sessionCount}/{longBreakInterval}
        </span>
      </div>
    </div>
  );
};
