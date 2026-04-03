import React from 'react';
import { Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTimerStore } from '../../store/timerStore';
import { useSettingsStore } from '../../store/settingsStore';

export const FocusTimeWidget: React.FC = () => {
  const { todayFocusSeconds } = useTimerStore();
  const { settings } = useSettingsStore();

  const goalSeconds = settings.dailyFocusGoal * 3600;
  const hours = Math.floor(todayFocusSeconds / 3600);
  const minutes = Math.floor((todayFocusSeconds % 3600) / 60);
  const progress = Math.min(todayFocusSeconds / goalSeconds, 1);
  const progressPercent = Math.round(progress * 100);
  const isGoalReached = progress >= 1;

  return (
    <div
      className="rounded-xl p-4 relative overflow-hidden card-accent-border"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--brd)',
      }}
    >
      {/* Top accent border handled by card-accent-border class */}
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{
            background: 'var(--accent-d)',
            border: '1px solid var(--accent-g)',
          }}
        >
          <Clock size={13} style={{ color: 'var(--accent)' }} />
        </div>
        <span className="text-[12px] font-medium" style={{ color: 'var(--t2)' }}>
          Focus Time Today
        </span>
        {isGoalReached && (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-semibold"
            style={{ background: 'rgba(34,211,165,0.15)', color: 'var(--grn)', border: '1px solid rgba(34,211,165,0.3)' }}
          >
            Goal!
          </motion.span>
        )}
      </div>

      {/* Time display */}
      <div className="flex items-end gap-1.5 mb-3">
        <span
          className="tabular-nums leading-none"
          style={{
            fontSize: '30px',
            fontWeight: 200,
            background: isGoalReached
              ? 'linear-gradient(135deg, var(--grn), #64ffda)'
              : 'linear-gradient(135deg, var(--t) 0%, var(--t2) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}
        </span>
        <span className="text-[12px] mb-1" style={{ color: 'var(--t3)' }}>
          / {settings.dailyFocusGoal}h goal
        </span>
      </div>

      {/* Progress bar — gradient + glowing tip */}
      <div
        className="w-full h-2 rounded-full overflow-hidden relative"
        style={{ background: 'rgba(255,255,255,0.06)' }}
      >
        <motion.div
          className="h-full rounded-full relative"
          style={{
            background: isGoalReached
              ? 'linear-gradient(90deg, var(--grn), #64ffda)'
              : 'linear-gradient(90deg, var(--accent), #ff8080)',
            boxShadow: `0 0 10px ${isGoalReached ? 'rgba(34,211,165,0.4)' : 'var(--accent-g)'}`,
          }}
          initial={{ width: 0 }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>

      <div className="mt-2 flex justify-between items-center">
        <span className="text-[11px]" style={{ color: 'var(--t3)' }}>
          {progressPercent}% of daily goal
        </span>
        {!isGoalReached && progressPercent > 0 && (
          <span className="text-[11px]" style={{ color: 'var(--t3)' }}>
            {Math.floor((goalSeconds - todayFocusSeconds) / 60)}m left
          </span>
        )}
      </div>
    </div>
  );
};
