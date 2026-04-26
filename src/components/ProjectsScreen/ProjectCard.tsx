import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, ListTodo, Target, Archive } from 'lucide-react';
import { Project, Task, TimerSession } from '../../types';
import {
  projectCompletion, projectFocusSeconds, daysToDeadline, formatHrs, startOfWeekMs,
} from './projectMetrics';

const STATUS_PILL: Record<Project['status'], { label: string; color: string }> = {
  active:    { label: 'Active',  color: 'var(--grn)' },
  on_hold:   { label: 'On Hold', color: 'var(--amb)' },
  completed: { label: 'Done',    color: 'var(--t3)' },
};

interface Props {
  project: Project;
  tasks: Task[];
  sessions: TimerSession[];
  onOpen: () => void;
}

export const ProjectCard: React.FC<Props> = ({ project, tasks, sessions, onOpen }) => {
  const { done, total, pct } = projectCompletion(tasks, project.id);
  const weekFocus = projectFocusSeconds(sessions, tasks, project.id, startOfWeekMs());
  const dToDeadline = daysToDeadline(project.targetDate);
  const overdue = dToDeadline !== null && dToDeadline < 0 && project.status !== 'completed';
  const milestoneDone = project.milestones.filter((m) => m.completed).length;
  const milestoneTotal = project.milestones.length;

  // 7-day completion histogram. Bars relative to this card's own max (so
  // low-velocity projects don't always render dead).
  const velocity = (() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const buckets: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = today.getTime() - i * 24 * 60 * 60 * 1000;
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;
      const count = tasks.reduce((n, t) => {
        if (t.projectId !== project.id) return n;
        if (!t.completedAt) return n;
        return t.completedAt >= dayStart && t.completedAt < dayEnd ? n + 1 : n;
      }, 0);
      buckets.push(count);
    }
    return { buckets, max: Math.max(0, ...buckets) };
  })();

  const pill = STATUS_PILL[project.status];

  return (
    <motion.button
      onClick={onOpen}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      whileHover={{ y: -2 }}
      className="group relative flex flex-col items-stretch text-left rounded-2xl overflow-hidden transition-all"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--brd)',
        boxShadow: '0 2px 14px rgba(0,0,0,0.25)',
        minHeight: 180,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--brd2)';
        e.currentTarget.style.boxShadow = `0 6px 24px rgba(0,0,0,0.45), 0 0 0 1px ${project.color}33`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--brd)';
        e.currentTarget.style.boxShadow = '0 2px 14px rgba(0,0,0,0.25)';
      }}
    >
      {/* Top accent bar in project color */}
      <div className="h-[3px] w-full" style={{ background: `linear-gradient(90deg, ${project.color}, ${project.color}66)` }} />

      <div className="flex-1 p-4 flex flex-col gap-3">
        {/* Header — icon swatch + name + status pill */}
        <div className="flex items-start gap-2.5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: `linear-gradient(135deg, ${project.color}33, ${project.color}11)`,
              border: `1px solid ${project.color}55`,
            }}
          >
            {project.icon ? (
              <span className="text-[18px] leading-none">{project.icon}</span>
            ) : (
              <div className="w-3 h-3 rounded-md" style={{ background: project.color }} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[14px] font-semibold truncate" style={{ color: 'var(--t)' }}>
                {project.name}
              </span>
              <span
                className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider shrink-0"
                style={{
                  color: pill.color,
                  background: pill.color + '18',
                  border: `1px solid ${pill.color}40`,
                }}
              >
                <span className="w-1 h-1 rounded-full" style={{ background: pill.color }} />
                {pill.label}
              </span>
              {project.archived && (
                <Archive size={11} style={{ color: 'var(--t3)' }} />
              )}
            </div>
            {project.description ? (
              <p className="text-[11px] mt-1 line-clamp-2" style={{ color: 'var(--t3)' }}>
                {project.description}
              </p>
            ) : (
              <p className="text-[11px] mt-1" style={{ color: 'var(--t3)' }}>
                No description
              </p>
            )}
          </div>
        </div>

        <div className="flex-1" />

        {/* Progress */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10.5px] font-medium uppercase tracking-wider" style={{ color: 'var(--t3)' }}>
              Progress
            </span>
            <span className="text-[11px] tabular-nums font-medium" style={{ color: project.color }}>
              {Math.round(pct * 100)}%
            </span>
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--brd)' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct * 100}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="h-full"
              style={{ background: `linear-gradient(90deg, ${project.color}, ${project.color}aa)` }}
            />
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3 text-[11px]" style={{ color: 'var(--t3)' }}>
          <span className="flex items-center gap-1">
            <ListTodo size={11} />
            <span className="tabular-nums">{done}/{total}</span>
          </span>
          {milestoneTotal > 0 && (
            <span className="flex items-center gap-1">
              <Target size={11} />
              <span className="tabular-nums">{milestoneDone}/{milestoneTotal}</span>
            </span>
          )}
          {weekFocus > 0 && (
            <span className="flex items-center gap-1" title="Focus time this week">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
              <span className="tabular-nums">{formatHrs(weekFocus)}</span>
            </span>
          )}
          {dToDeadline !== null && (
            <span
              className="flex items-center gap-1 ml-auto"
              style={{ color: overdue ? 'var(--accent)' : 'var(--t3)' }}
            >
              <Calendar size={11} />
              {overdue ? `${Math.abs(dToDeadline)}d over` : dToDeadline === 0 ? 'Today' : `${dToDeadline}d`}
            </span>
          )}
        </div>

        {/* Velocity sparkline — hidden when nothing in the last 7 days */}
        {velocity.max > 0 && (
          <div
            className="flex items-end gap-[1px]"
            style={{ height: 16, marginTop: 6 }}
            title={`Completed last 7 days: ${velocity.buckets.join(', ')}`}
          >
            {velocity.buckets.map((c, i) => {
              const isToday = i === velocity.buckets.length - 1;
              const h = velocity.max === 0 ? 0 : Math.max(2, (c / velocity.max) * 16);
              return (
                <div
                  key={i}
                  style={{
                    width: 3,
                    height: h,
                    background: isToday ? 'var(--accent)' : 'var(--t3)',
                    opacity: c === 0 ? 0.25 : 1,
                    borderRadius: 1,
                  }}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Weekly focus goal — hairline bar across bottom of card */}
      {project.weeklyFocusGoalHrs && project.weeklyFocusGoalHrs > 0 && (() => {
        const goalSec = project.weeklyFocusGoalHrs * 3600;
        const pct = Math.min(1, weekFocus / goalSec);
        const met = pct >= 1;
        return (
          <div className="h-[2px] w-full" style={{ background: 'var(--brd)' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct * 100}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="h-full"
              style={{ background: met ? 'var(--grn)' : 'var(--accent)', opacity: 0.6 }}
              title={`${formatHrs(weekFocus)} of ${project.weeklyFocusGoalHrs}h weekly goal`}
            />
          </div>
        );
      })()}
    </motion.button>
  );
};
