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
      className="flex items-stretch border-b shrink-0"
      style={{ borderColor: 'var(--brd)', background: 'var(--bg)' }}
    >
      <StatCard
        label="Estimated Time"
        main={estimatedTime.main}
        sub={estimatedTime.sub}
        color="var(--accent)"
      />
      <StatCard
        label="Tasks to be Completed"
        main={String(activeTasks.length)}
        sub=""
        color="var(--t)"
      />
      <StatCard
        label="Elapsed Time"
        main={elapsedTime.main}
        sub={elapsedTime.sub}
        color="var(--blu)"
      />
      <StatCard
        label="Completed Tasks"
        main={String(completedTasks.length)}
        sub=""
        color="var(--grn)"
      />
    </div>
  );
};

interface StatCardProps {
  label: string;
  main: string;
  sub: string;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, main, sub, color }) => (
  <div
    className="flex-1 flex flex-col items-center justify-center py-4 border-r last:border-r-0"
    style={{ borderColor: 'var(--brd)' }}
  >
    <div className="flex items-baseline gap-0.5">
      <span
        className="font-light tabular-nums leading-none"
        style={{ fontSize: '28px', color, letterSpacing: '-0.5px' }}
      >
        {main}
      </span>
      {sub && (
        <span className="text-[13px] font-light" style={{ color }}>
          {sub}
        </span>
      )}
    </div>
    <span className="text-[10px] uppercase tracking-wider mt-1" style={{ color: 'var(--t3)' }}>
      {label}
    </span>
  </div>
);
