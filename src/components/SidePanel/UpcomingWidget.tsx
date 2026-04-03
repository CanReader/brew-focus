import React from 'react';
import { ListTodo, Target } from 'lucide-react';
import { useTaskStore } from '../../store/taskStore';
import { useTimerStore } from '../../store/timerStore';
import { Priority } from '../../types';

const CupIcon = () => (
  <svg width="11" height="11" viewBox="0 0 16 16" fill="var(--t3)" style={{display:'inline',verticalAlign:'middle',marginRight:'2px'}}>
    <path d="M2 5h10v.8H2V5z" opacity="0.9"/>
    <path d="M2 6.5h9c0 2.5-1.2 5-4.5 5S2 9 2 6.5z" opacity="0.9"/>
    <path d="M11 7.5h1a1.5 1.5 0 000-3h-1" stroke="var(--t3)" strokeWidth="1.1" strokeLinecap="round" fill="none"/>
    <path d="M3.5 12c.8.4 6.4.4 7.2 0" stroke="var(--t3)" strokeWidth="1" strokeLinecap="round" fill="none"/>
  </svg>
);

const priorityDot: Record<Priority, string> = {
  p1: 'var(--accent)',
  p2: 'var(--amb)',
  p3: 'var(--blu)',
  p4: 'var(--t3)',
};

export const UpcomingWidget: React.FC = () => {
  const { tasks, setActiveTask } = useTaskStore();
  const { activeTaskId, setActiveTask: setTimerActiveTask } = useTimerStore();

  const upcoming = tasks.filter((t) => !t.completed).slice(0, 5);

  return (
    <div className="rounded-xl p-4" style={{ background: 'var(--card)' }}>
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center"
          style={{ background: 'rgba(90,156,245,0.15)' }}
        >
          <ListTodo size={13} style={{ color: 'var(--blu)' }} />
        </div>
        <span className="text-[12px] font-medium" style={{ color: 'var(--t2)' }}>
          Upcoming Tasks
        </span>
        <span
          className="ml-auto text-[11px] px-1.5 py-0.5 rounded-md"
          style={{ background: 'var(--brd)', color: 'var(--t3)' }}
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
          {upcoming.map((task) => {
            const isActive = task.id === activeTaskId;
            return (
              <button
                key={task.id}
                onClick={() => {
                  const newId = isActive ? null : task.id;
                  setActiveTask(newId);
                  setTimerActiveTask(newId);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-all duration-150"
                style={{
                  background: isActive ? 'var(--accent-d)' : 'transparent',
                  border: isActive ? '1px solid var(--accent-g)' : '1px solid transparent',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'var(--card-h)';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'transparent';
                }}
              >
                <div
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: priorityDot[task.priority] }}
                />
                <span
                  className="text-[12px] flex-1 truncate"
                  style={{ color: isActive ? 'var(--t)' : 'var(--t2)' }}
                >
                  {task.title}
                </span>
                {isActive && (
                  <Target size={11} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                )}
                {task.pomodoroEstimate > 0 && (
                  <span style={{color:'var(--t3)',fontSize:'10px'}}><CupIcon />{task.pomodoroCompleted}/{task.pomodoroEstimate}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
