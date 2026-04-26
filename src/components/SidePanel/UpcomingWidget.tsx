import React from 'react';
import { useTranslation } from 'react-i18next';
import { ListTodo, Target, Coffee } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTaskStore } from '../../store/taskStore';
import { useTimerStore } from '../../store/timerStore';
import { Priority } from '../../types';

const priorityAccent: Record<Priority, string> = {
  p1: 'var(--accent)',
  p2: 'var(--amb)',
  p3: 'var(--blu)',
  p4: 'var(--t3)',
};

const priorityAccentRgba: Record<Priority, string> = {
  p1: '255,77,77',
  p2: '245,166,35',
  p3: '91,141,238',
  p4: '120,120,130',
};

export const UpcomingWidget: React.FC = () => {
  const { t } = useTranslation('tasks');
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
          {t('upcomingTasks')}
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
        <div className="py-6 text-center">
          <span className="text-[12px]" style={{ color: 'var(--t3)' }}>
            {t('noUpcomingTasks')}
          </span>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {upcoming.map((task, i) => {
            const isActive = task.id === activeTaskId;
            const accent = priorityAccent[task.priority];
            const accentRgba = priorityAccentRgba[task.priority];
            const done = task.pomodoroCompleted;
            const total = task.pomodoroEstimate;
            const pct = total > 0 ? Math.min(1, done / total) : 0;

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
                className="w-full flex flex-col gap-1.5 px-2.5 py-2 rounded-lg text-left transition-all duration-150 relative overflow-hidden group"
                style={{
                  backgroundColor: isActive
                    ? 'var(--accent-d)'
                    : `rgba(${accentRgba},0.06)`,
                  borderStyle: 'solid',
                  borderTopWidth: 1,
                  borderRightWidth: 1,
                  borderBottomWidth: 1,
                  borderLeftWidth: 3,
                  borderTopColor: isActive ? 'var(--accent-g)' : 'transparent',
                  borderRightColor: isActive ? 'var(--accent-g)' : 'transparent',
                  borderBottomColor: isActive ? 'var(--accent-g)' : 'transparent',
                  borderLeftColor: isActive ? 'var(--accent)' : accent,
                  boxShadow: isActive
                    ? `0 0 18px rgba(255,77,77,0.14)`
                    : 'none',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = `rgba(${accentRgba},0.12)`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = `rgba(${accentRgba},0.06)`;
                  }
                }}
              >
                <div className="flex items-center gap-2 w-full">
                  <span
                    className="text-[12px] font-medium flex-1 truncate leading-tight"
                    style={{ color: isActive ? 'var(--t)' : 'var(--t)' }}
                  >
                    {task.title}
                  </span>
                  {isActive && (
                    <Target size={11} style={{ color: 'var(--accent)', flexShrink: 0 }} strokeWidth={2.5} />
                  )}
                  {total > 0 && (
                    <span
                      className="flex items-center gap-1 shrink-0 text-[10px] tabular-nums font-medium"
                      style={{ color: isActive ? 'var(--t2)' : 'var(--t3)' }}
                    >
                      <Coffee size={9} strokeWidth={2.2} />
                      {done}/{total}
                    </span>
                  )}
                </div>

                {total > 0 && (
                  <div
                    className="w-full h-1 rounded-full overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.05)' }}
                  >
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct * 100}%` }}
                      transition={{ duration: 0.4, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{
                        background: isActive
                          ? `linear-gradient(90deg, var(--accent), #ff8a7a)`
                          : `linear-gradient(90deg, rgba(${accentRgba},0.9), rgba(${accentRgba},0.55))`,
                        boxShadow: pct > 0 ? `0 0 6px rgba(${accentRgba},0.4)` : 'none',
                      }}
                    />
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
};
