import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, X } from 'lucide-react';
import { useTaskStore } from '../../store/taskStore';
import { useTimerStore } from '../../store/timerStore';

export const TaskSelector: React.FC = () => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { tasks, activeTaskId, setActiveTask } = useTaskStore();
  const { setActiveTask: setTimerActiveTask } = useTimerStore();

  const incompleteTasks = tasks.filter((t) => !t.completed);
  const activeTask = tasks.find((t) => t.id === activeTaskId);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (id: string | null) => {
    setActiveTask(id);
    setTimerActiveTask(id);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative w-full max-w-xs">
      {/* Trigger */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border transition-all duration-150 text-left"
        style={{
          background: activeTask ? 'var(--accent-d)' : 'var(--card)',
          borderColor: activeTask ? 'var(--accent-g)' : 'var(--brd)',
          color: activeTask ? 'var(--t)' : 'var(--t3)',
        }}
        onMouseEnter={(e) => {
          if (!activeTask) e.currentTarget.style.borderColor = 'var(--brd2)';
        }}
        onMouseLeave={(e) => {
          if (!activeTask) e.currentTarget.style.borderColor = 'var(--brd)';
        }}
      >
        {/* Coffee cup dot */}
        <span style={{ color: activeTask ? 'var(--accent)' : 'var(--t3)', fontSize: '13px', lineHeight: 1 }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M2 5h10v.8H2V5z" opacity="0.9"/>
            <path d="M2 6.5h9c0 2.5-1.2 5-4.5 5S2 9 2 6.5z" opacity="0.9"/>
            <path d="M11 7.5h1a1.5 1.5 0 000-3h-1" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" fill="none"/>
            <path d="M3.5 12c.8.4 6.4.4 7.2 0" stroke="currentColor" strokeWidth="1" strokeLinecap="round" fill="none"/>
          </svg>
        </span>

        <span className="flex-1 text-[13px] truncate font-medium">
          {activeTask ? activeTask.title : 'Select a task to focus on…'}
        </span>

        <div className="flex items-center gap-1 shrink-0">
          {activeTask && (
            <span
              className="w-5 h-5 flex items-center justify-center rounded-md hover:opacity-100 opacity-60 transition-opacity"
              style={{ color: 'var(--t3)' }}
              onClick={(e) => { e.stopPropagation(); handleSelect(null); }}
            >
              <X size={12} />
            </span>
          )}
          <ChevronDown
            size={13}
            style={{
              color: 'var(--t3)',
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s',
            }}
          />
        </div>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scaleY: 0.95 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -6, scaleY: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute top-full mt-1.5 w-full z-50 rounded-xl border overflow-hidden"
            style={{
              transformOrigin: 'top',
              background: 'var(--card)',
              borderColor: 'var(--brd)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            }}
          >
            {incompleteTasks.length === 0 ? (
              <div className="px-4 py-3 text-[12px]" style={{ color: 'var(--t3)' }}>
                No tasks yet — add some in Tasks tab
              </div>
            ) : (
              <div className="max-h-52 overflow-y-auto">
                {/* None option */}
                <button
                  onClick={() => handleSelect(null)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors text-[13px]"
                  style={{
                    background: !activeTaskId ? 'var(--card-h)' : 'transparent',
                    color: 'var(--t3)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--card-h)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = !activeTaskId ? 'var(--card-h)' : 'transparent')}
                >
                  <span style={{ color: 'var(--t3)', opacity: 0.5 }}>—</span>
                  No task
                </button>

                {incompleteTasks.map((task) => {
                  const isSelected = task.id === activeTaskId;
                  const hasCustomTimer = task.customWorkDuration || task.customShortBreakDuration;
                  return (
                    <button
                      key={task.id}
                      onClick={() => handleSelect(task.id)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors"
                      style={{
                        background: isSelected ? 'var(--accent-d)' : 'transparent',
                      }}
                      onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'var(--card-h)'; }}
                      onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                    >
                      {/* Priority dot */}
                      <div
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{
                          background:
                            task.priority === 'p1' ? 'var(--accent)' :
                            task.priority === 'p2' ? 'var(--amb)' :
                            task.priority === 'p3' ? 'var(--blu)' : 'var(--brd2)',
                        }}
                      />
                      <span
                        className="flex-1 text-[13px] truncate"
                        style={{ color: isSelected ? 'var(--t)' : 'var(--t2)' }}
                      >
                        {task.title}
                      </span>
                      {hasCustomTimer && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-md shrink-0"
                          style={{ background: 'var(--accent-d)', color: 'var(--accent)' }}
                          title={`Custom timer: ${task.customWorkDuration ?? '?'}m work`}
                        >
                          {task.customWorkDuration}m
                        </span>
                      )}
                      {/* Pomodoro cups */}
                      <span className="text-[11px] shrink-0" style={{ color: 'var(--t3)' }}>
                        {task.pomodoroCompleted}/{task.pomodoroEstimate}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
