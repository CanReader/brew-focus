import React, { useMemo, useState } from 'react';
import { useActivityStore } from '../../store/activityStore';
import { eventVisual, relativeTime } from '../ActivityTimeline';

interface Props {
  projectId: string;
  projectColor: string;
  projectTaskIds: string[];
}

export const ProjectActivityTimeline: React.FC<Props> = ({ projectId, projectTaskIds }) => {
  const allEvents = useActivityStore((s) => s.events);
  const taskIdSet = useMemo(() => new Set(projectTaskIds), [projectTaskIds]);

  const events = useMemo(
    () =>
      allEvents
        .filter((e) => e.projectId === projectId || (e.taskId && taskIdSet.has(e.taskId)))
        .sort((a, b) => b.createdAt - a.createdAt),
    [allEvents, projectId, taskIdSet]
  );

  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? events : events.slice(0, 10);
  const more = events.length - visible.length;

  if (events.length === 0) {
    return (
      <div className="text-[11.5px]" style={{ color: 'var(--t3)' }}>
        No activity yet for this project.
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-xl overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--brd)' }}>
      {visible.map((e) => {
        const v = eventVisual(e);
        return (
          <div
            key={e.id}
            className="flex items-center gap-2 px-3 py-1.5"
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
          className="px-3 py-1.5 text-[11px] text-left transition-colors"
          style={{ color: 'var(--t3)' }}
          onMouseEnter={(ev) => (ev.currentTarget.style.color = 'var(--t2)')}
          onMouseLeave={(ev) => (ev.currentTarget.style.color = 'var(--t3)')}
        >
          Show all ({more} more)
        </button>
      )}
    </div>
  );
};
