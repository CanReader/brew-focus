import React from 'react';
import { ListTodo, Target } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTaskStore } from '../../store/taskStore';
import { useTimerStore } from '../../store/timerStore';
import { Priority } from '../../types';

const CupIcon = () => (
  <svg width="10" height="10" viewBox="0 0 16 16" fill="var(--t3)" style={{ display: 'inline', verticalAlign: 'middle', marginRight: '2px' }}>
    <path d="M2 5h10v.8H2V5z" opacity="0.9" />
    <path d="M2 6.5h9c0 2.5-1.2 5-4.5 5S2 9 2 6.5z" opacity="0.9" />
    <path d="M11 7.5h1a1.5 1.5 0 000-3h-1" stroke="var(--t3)" strokeWidth="1.1" strokeLinecap="round" fill="none" />
    <path d="M3.5 12c.8.4 6.4.4 7.2 0" stroke="var(--t3)" strokeWidth="1" strokeLinecap="round" fill="none" />
  </svg>
);

const priorityBorderColors: Record<Priority, string> = {
  p1: 'var(--accent)',
  p2: 'var(--amb)',
  p3: 'var(--blu)',
  p4: 'var(--brd2)',
};

const priorityBgColors: Record<Priority, string> = {
  p1: 'rgba(255,77,77,0.05)',
  p2: 'rgba(245,166,35,0.05)',
  p3: 'rgba(91,141,238,0.05)',
  p4: 'transparent',
};

export const UpcomingWidget: React.FC = () => {
  const { tasks, setActiveTask } = useTaskStore();
  const { activeTaskId, setActiveTask: setTimerActiveTask } = useTimerStore();

  const upcoming = tasks.filter((t) => !t.completed).slice(0, 5);

  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--brd)',
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{
            background: 'rgba(91,141,238,0.15)',
            border: '1px solid rgba(91,141,238,0.25)',
          }}
        >
          <ListTodo size={13} style={{ color: 'var(--blu)' }} />
        </div>
        <span className="text-[12px] font-medium" style={{ color: 'var(--t2)' }}>
          Upcoming Tasks
        </span>
        <span
          className="ml-auto text-[10px] px-1.5 py-0.5 rounded-md tabular-nums"
          style={{
            background: 'rgba(255,255,255,0.06)',
            color: 'var(--t3)',
            border: '1px solid var(--brd)',
          }}
        >
          {upcoming.length}
        </span>
      </div>

      {upcoming.length === 0 ? (
        <div className="py-4 text-center">
          <span className="text-[12px]" style={{ color: 'var(--t3)' }}>
            No upcoming tasks
          </span>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {upcoming.map((task, i) => {
            const isActive = task.id === activeTaskId;
            return (
              <motion.button
                key={task.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04, duration: 0.2 }}
                onClick={() => {
                  const newId = isActive ? null : task.id;
                  setActiveTask(newId);
                  setTimerActiveTask(newId);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-all duration-150 relative overflow-hidden"
                style={{
                  background: isActive ? 'var(--accent-d)' : priorityBgColors[task.priority],
                  borderLeft: `2px solid ${isActive ? 'var(--accent)' : priorityBorderColors[task.priority]}`,
                  border: isActive ? `1px solid var(--accent-g)` : `1px solid transparent`,
                  borderLeftWidth: 2,
                  boxShadow: isActive ? '0 0 16px rgba(255,77,77,0.08)' : 'none',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = priorityBgColors[task.priority];
                  }
                }}
              >
                <span
                  className="text-[12px] flex-1 truncate"
                  style={{ color: isActive ? 'var(--t)' : 'var(--t2)' }}
                >
                  {task.title}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  {isActive && (
                    <Target size={10} style={{ color: 'var(--accent)' }} />
                  )}
                  {task.pomodoroEstimate > 0 && (
                    <span style={{ color: 'var(--t3)', fontSize: '10px' }}>
                      <CupIcon />{task.pomodoroCompleted}/{task.pomodoroEstimate}
                    </span>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
};
