import React from 'react';
import { Task } from '../../types';
import { useTimerStore } from '../../store/timerStore';
import { useSettingsStore } from '../../store/settingsStore';

interface StatsBarProps {
  tasks: Task[];
}

function formatStatTime(seconds: number): { main: string; sub: string } {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return { main: `${h}`, sub: `h ${m}m` };
  return { main: `${m}`, sub: 'm' };
}

export const StatsBar: React.FC<StatsBarProps> = ({ tasks }) => {
  const { todayFocusSeconds } = useTimerStore();
  const { settings } = useSettingsStore();

  const activeTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);
  const totalEstimatedSecs = activeTasks.reduce((total, task) => {
    const workMinutes = task.customWorkDuration ?? settings.workDuration;
    return total + task.pomodoroEstimate * workMinutes * 60;
  }, 0);
  const estimatedTime = formatStatTime(totalEstimatedSecs);
  const elapsedTime = formatStatTime(todayFocusSeconds);

  return (
    <div
      className="flex items-stretch shrink-0"
      style={{ borderBottom: '1px solid var(--brd)', background: 'var(--bg)' }}
    >
      <StatCard
        label="Estimated"
        main={estimatedTime.main}
        sub={estimatedTime.sub}
        color="var(--accent)"
        gradient="rgba(255,77,77,0.06)"
      />
      <StatCard
        label="Remaining"
        main={String(activeTasks.length)}
        sub=""
        color="var(--t2)"
        gradient="rgba(255,255,255,0.02)"
      />
      <StatCard
        label="Elapsed"
        main={elapsedTime.main}
        sub={elapsedTime.sub}
        color="var(--blu)"
        gradient="rgba(91,141,238,0.06)"
      />
      <StatCard
        label="Completed"
        main={String(completedTasks.length)}
        sub=""
        color="var(--grn)"
        gradient="rgba(34,211,165,0.06)"
      />
    </div>
  );
};

interface StatCardProps {
  label: string;
  main: string;
  sub: string;
  color: string;
  gradient: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, main, sub, color, gradient }) => (
  <div
    className="flex-1 flex flex-col items-center justify-center py-3.5 relative overflow-hidden"
    style={{ borderRight: '1px solid var(--brd)' }}
  >
    {/* Subtle gradient background */}
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ background: gradient }}
    />
    {/* Bottom accent */}
    <div
      className="absolute bottom-0 left-1/2 -translate-x-1/2 h-px w-8 rounded-full"
      style={{ background: color, opacity: 0.5 }}
    />
    <div className="relative z-10 flex items-baseline gap-0.5">
      <span
        className="font-light tabular-nums leading-none"
        style={{
          fontSize: '26px',
          color,
          letterSpacing: '-0.5px',
          textShadow: `0 0 20px ${color}40`,
        }}
      >
        {main}
      </span>
      {sub && (
        <span className="text-[13px] font-light" style={{ color }}>
          {sub}
        </span>
      )}
    </div>
    <span className="relative z-10 text-[10px] uppercase tracking-widest mt-1 font-medium" style={{ color: 'var(--t3)' }}>
      {label}
    </span>
  </div>
);
