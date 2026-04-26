import React, { useMemo, useState } from 'react';
import {
  Plus, ArrowRight, Check, Target, Flag, ArrowUp, ArrowDown, Flame, FolderOpen,
} from 'lucide-react';
import { ActivityEvent, TASK_STATUS_META, TaskStatus, Priority } from '../types';
import { useActivityStore } from '../store/activityStore';

interface Props {
  taskId: string;
  /** Compact mode hides the section header; useful when the wrapper provides one. */
  compact?: boolean;
}

export function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const sec = Math.round(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}d ago`;
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const PRIORITY_RANK: Record<Priority, number> = { p1: 0, p2: 1, p3: 2, p4: 3 };

export function eventVisual(e: ActivityEvent): { icon: React.ReactNode; text: React.ReactNode } {
  const p = e.payload;
  switch (e.type) {
    case 'task.created':
      return { icon: <Plus size={11} />, text: 'Created' };
    case 'task.completed':
      return { icon: <Check size={11} style={{ color: 'var(--grn)' }} />, text: 'Completed' };
    case 'task.uncompleted':
      return { icon: <ArrowRight size={11} />, text: 'Reopened' };
    case 'task.status_changed': {
      const from = (p.from as TaskStatus) || 'todo';
      const to = (p.to as TaskStatus) || 'todo';
      const fromMeta = TASK_STATUS_META[from];
      const toMeta = TASK_STATUS_META[to];
      return {
        icon: <ArrowRight size={11} />,
        text: <>Status <span style={{ color: fromMeta.color }}>{fromMeta.label}</span> → <span style={{ color: toMeta.color }}>{toMeta.label}</span></>,
      };
    }
    case 'task.priority_changed': {
      const from = (p.from as Priority) || 'p4';
      const to = (p.to as Priority) || 'p4';
      const up = PRIORITY_RANK[to] < PRIORITY_RANK[from];
      return {
        icon: up ? <ArrowUp size={11} /> : <ArrowDown size={11} />,
        text: <>Priority {from.toUpperCase()} → {to.toUpperCase()}</>,
      };
    }
    case 'task.milestone_changed':
      return {
        icon: <Target size={11} />,
        text: p.to ? 'Assigned to milestone' : 'Removed from milestone',
      };
    case 'task.project_changed':
      return {
        icon: <FolderOpen size={11} />,
        text: p.to ? 'Moved to a project' : 'Removed from project',
      };
    case 'focus.session_completed': {
      const dur = (p.duration as number) || 0;
      const min = Math.round(dur / 60);
      return {
        icon: <Flame size={11} style={{ color: 'var(--accent)' }} />,
        text: <>Focus session · {min}m</>,
      };
    }
    default:
      return { icon: <Flag size={11} />, text: e.type };
  }
}

export const ActivityTimeline: React.FC<Props> = ({ taskId, compact }) => {
  const allEvents = useActivityStore((s) => s.events);
  const events = useMemo(
    () => allEvents.filter((e) => e.taskId === taskId).sort((a, b) => b.createdAt - a.createdAt),
    [allEvents, taskId]
  );
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? events : events.slice(0, 5);
  const more = events.length - visible.length;

  if (events.length === 0) {
    return (
      <div className="px-4 py-3" style={{ color: 'var(--t3)', fontSize: 11 }}>
        {compact ? 'No activity yet.' : 'No activity recorded for this task yet.'}
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {visible.map((e) => {
        const v = eventVisual(e);
        return (
          <div
            key={e.id}
            className="flex items-center gap-2 px-4 py-1.5 transition-colors"
            style={{ minHeight: 28 }}
          >
            <span className="shrink-0 flex items-center justify-center" style={{ color: 'var(--t3)', width: 14 }}>
              {v.icon}
            </span>
            <span className="text-[11.5px] flex-1 min-w-0 truncate" style={{ color: 'var(--t2)' }}>
              {v.text}
            </span>
            <span className="text-[10.5px] tabular-nums shrink-0" style={{ color: 'var(--t3)' }}>
              {relativeTime(e.createdAt)}
            </span>
          </div>
        );
      })}
      {more > 0 && (
        <button
          onClick={() => setExpanded(true)}
          className="px-4 py-1.5 text-[11px] text-left transition-colors"
          style={{ color: 'var(--t3)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--t2)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--t3)')}
        >
          Show all ({more} more)
        </button>
      )}
    </div>
  );
};
