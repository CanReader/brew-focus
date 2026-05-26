import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTaskStore } from '../../store/taskStore';
import { useTimerStore } from '../../store/timerStore';

export const TaskSelector: React.FC = () => {
  const { t } = useTranslation('focus');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { tasks, activeTaskId, setActiveTask } = useTaskStore();
  const { setActiveTask: setTimerActiveTask } = useTimerStore();

  const incompleteTasks = tasks.filter((t) => !t.completed);
  const activeTask = tasks.find((t) => t.id === activeTaskId);

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
    <div
      ref={ref}
      className="relative w-full max-w-xs flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-150"
      style={{
        background: activeTask ? 'var(--accent-d)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${activeTask ? 'var(--accent-g)' : 'rgba(255,255,255,0.08)'}`,
        color: activeTask ? 'var(--t)' : 'var(--t3)',
        boxShadow: activeTask ? '0 0 16px rgba(255,77,77,0.08)' : 'none',
      }}
    >
      {/* Trigger — covers the whole row except the X */}
      <button
        onClick={() => setOpen(!open)}
        className="absolute inset-0 rounded-xl"
        aria-label={t('selectTaskAria')}
        style={{ background: 'transparent', border: 'none' }}
      />

      {/* Coffee cup dot */}
      <span style={{ color: activeTask ? 'var(--accent)' : 'var(--t3)', fontSize: '13px', lineHeight: 1, flexShrink: 0, position: 'relative', pointerEvents: 'none' }}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="M2 5h10v.8H2V5z" opacity="0.9"/>
          <path d="M2 6.5h9c0 2.5-1.2 5-4.5 5S2 9 2 6.5z" opacity="0.9"/>
          <path d="M11 7.5h1a1.5 1.5 0 000-3h-1" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" fill="none"/>
          <path d="M3.5 12c.8.4 6.4.4 7.2 0" stroke="currentColor" strokeWidth="1" strokeLinecap="round" fill="none"/>
        </svg>
      </span>

      <span className="flex-1 text-[13px] truncate font-medium text-left" style={{ position: 'relative', pointerEvents: 'none' }}>
        {activeTask ? activeTask.title : t('selectTask')}
      </span>

      <div className="flex items-center gap-1 shrink-0" style={{ position: 'relative' }}>
        {activeTask && (
          <button
            type="button"
            className="w-5 h-5 flex items-center justify-center rounded-md hover:opacity-100 opacity-60 transition-opacity"
            style={{ color: 'var(--t3)', background: 'transparent', border: 'none' }}
            onClick={(e) => { e.stopPropagation(); handleSelect(null); }}
            aria-label={t('clearActiveTask')}
          >
            <X size={11} />
          </button>
        )}
        <ChevronDown
          size={12}
          style={{
            color: 'var(--t3)',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
            pointerEvents: 'none',
          }}
        />
      </div>

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
              borderColor: 'var(--brd2)',
              boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
              backdropFilter: 'blur(20px)',
            }}
          >
            {incompleteTasks.length === 0 ? (
              <div className="px-4 py-3 text-[12px]" style={{ color: 'var(--t3)' }}>
                {t('noTasksYet')}
              </div>
            ) : (
              <div className="max-h-52 overflow-y-auto">
                {/* None option */}
                <button
                  onClick={() => handleSelect(null)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors text-[13px]"
                  style={{
                    background: !activeTaskId ? 'rgba(255,255,255,0.04)' : 'transparent',
                    color: 'var(--t3)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = !activeTaskId ? 'rgba(255,255,255,0.04)' : 'transparent')}
                >
                  <span style={{ color: 'var(--t3)', opacity: 0.4 }}>—</span>
                  {t('noTask')}
                </button>

                {incompleteTasks.map((task) => {
                  const isSelected = task.id === activeTaskId;
                  // Badge shows the custom *work* minutes, so only surface it
                  // when that override is set — otherwise it rendered a bare "m".
                  const hasCustomTimer = !!task.customWorkDuration;
                  return (
                    <button
                      key={task.id}
                      onClick={() => handleSelect(task.id)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors"
                      style={{
                        background: isSelected ? 'var(--accent-d)' : 'transparent',
                        borderLeft: `2px solid ${isSelected ? 'var(--accent)' : 'transparent'}`,
                      }}
                      onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                      onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                    >
                      {/* Priority dot */}
                      <div
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{
                          background:
                            task.priority === 'p1' ? 'var(--accent)' :
                            task.priority === 'p2' ? 'var(--amb)' :
                            task.priority === 'p3' ? 'var(--blu)' : 'rgba(255,255,255,0.12)',
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
                          title={t('customTimerHint', { minutes: task.customWorkDuration ?? '?' })}
                        >
                          {task.customWorkDuration}m
                        </span>
                      )}
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
