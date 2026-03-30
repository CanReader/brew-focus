import React from 'react';
import { Clock } from 'lucide-react';
import { useTimerStore } from '../../store/timerStore';
import { useSettingsStore } from '../../store/settingsStore';

export const FocusTimeWidget: React.FC = () => {
  const { todayFocusSeconds } = useTimerStore();
  const { settings } = useSettingsStore();

  const goalSeconds = settings.dailyFocusGoal * 3600;
  const hours = Math.floor(todayFocusSeconds / 3600);
  const minutes = Math.floor((todayFocusSeconds % 3600) / 60);
  const progress = Math.min(todayFocusSeconds / goalSeconds, 1);

  return (
    <div
      className="rounded-xl p-4"
      style={{ background: 'var(--card)' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center"
          style={{ background: 'var(--accent-d)' }}
        >
          <Clock size={13} style={{ color: 'var(--accent)' }} />
        </div>
        <span className="text-[12px] font-medium" style={{ color: 'var(--t2)' }}>
          Focus Time Today
        </span>
      </div>

      <div className="flex items-end gap-1 mb-3">
        <span className="text-3xl font-light tabular-nums" style={{ color: 'var(--t)' }}>
          {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}
        </span>
        <span className="text-[12px] mb-1" style={{ color: 'var(--t3)' }}>
          / {settings.dailyFocusGoal}h goal
        </span>
      </div>

      {/* Progress bar */}
      <div
        className="w-full h-1.5 rounded-full overflow-hidden"
        style={{ background: 'var(--brd2)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${progress * 100}%`,
            background: progress >= 1 ? 'var(--grn)' : 'var(--accent)',
          }}
        />
      </div>

      <div className="mt-2 flex justify-between">
        <span className="text-[11px]" style={{ color: 'var(--t3)' }}>
          {Math.round(progress * 100)}% of daily goal
        </span>
        {progress >= 1 && (
          <span className="text-[11px] font-medium" style={{ color: 'var(--grn)' }}>
            Goal reached!
          </span>
        )}
      </div>
    </div>
  );
};
