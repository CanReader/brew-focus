import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Check, ChevronDown, Search, Sunrise, Play } from 'lucide-react';
import { useSettingsStore } from '../../store/settingsStore';
import { useTaskStore } from '../../store/taskStore';
import { useTimerStore } from '../../store/timerStore';
import { Task } from '../../types';

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const DailyQueuePanel: React.FC = () => {
  const { settings, updateSettings } = useSettingsStore();
  const { tasks, setActiveTask } = useTaskStore();
  const { activeTaskId, setActiveTask: setTimerActiveTask } = useTimerStore();
  const [open, setOpen] = useState(true);
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState('');

  const queue = settings.dailyQueue ?? { taskIds: [], lastSweepDate: '' };
  const queueTaskIds = queue.taskIds;
  const queueTasks = useMemo(
    () => queueTaskIds.map((id) => tasks.find((t) => t.id === id)).filter((t): t is Task => !!t),
    [queueTaskIds, tasks]
  );

  // Sweep on mount + on day rollover: drop completed items if it's a new day.
  useEffect(() => {
    const today = todayKey();
    if (queue.lastSweepDate === today) return;
    const surviving = queueTaskIds.filter((id) => {
      const t = tasks.find((x) => x.id === id);
      return t && !t.completed;
    });
    updateSettings({ dailyQueue: { taskIds: surviving, lastSweepDate: today } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const removeFromQueue = (id: string) => {
    updateSettings({
      dailyQueue: {
        taskIds: queueTaskIds.filter((tid) => tid !== id),
        lastSweepDate: queue.lastSweepDate || todayKey(),
      },
    });
  };

  const addToQueue = (id: string) => {
    if (queueTaskIds.includes(id)) return;
    updateSettings({
      dailyQueue: {
        taskIds: [...queueTaskIds, id],
        lastSweepDate: queue.lastSweepDate || todayKey(),
      },
    });
    setAdding(false);
    setSearch('');
  };

  const setAsActive = (id: string) => {
    setActiveTask(id);
    setTimerActiveTask(id);
  };

  const candidates = useMemo(() => {
    const inQueue = new Set(queueTaskIds);
    let pool = tasks.filter((t) => !t.completed && !inQueue.has(t.id));
    if (search.trim()) {
      const q = search.toLowerCase();
      pool = pool.filter((t) => t.title.toLowerCase().includes(q));
    }
    return pool.slice(0, 12);
  }, [tasks, queueTaskIds, search]);

  const incompleteInQueue = queueTasks.filter((t) => !t.completed);

  return (
    <motion.div
      layout
      className="w-full max-w-sm rounded-2xl relative z-10"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--brd)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
      }}
    >
      {/* Top accent hairline */}
      <div
        className="absolute top-0 left-0 right-0 h-px pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent, var(--accent), transparent)', opacity: 0.5 }}
      />

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5"
          style={{ color: 'var(--t3)' }}
        >
          <ChevronDown
            size={11}
            style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s' }}
          />
          <Sunrise size={11} style={{ color: 'var(--accent)' }} />
          <span className="text-[10.5px] font-bold uppercase tracking-widest">Today</span>
        </button>
        <span className="text-[10.5px] tabular-nums" style={{ color: 'var(--t3)' }}>
          {incompleteInQueue.length}
          {queueTasks.length !== incompleteInQueue.length && ` / ${queueTasks.length}`}
        </span>
        <div className="flex-1" />
        <button
          onClick={() => setAdding((v) => !v)}
          className="w-6 h-6 flex items-center justify-center rounded-md transition-colors"
          style={{
            color: adding ? 'var(--accent)' : 'var(--t3)',
            background: adding ? 'var(--accent-d)' : 'transparent',
          }}
          onMouseEnter={(e) => { if (!adding) { e.currentTarget.style.background = 'var(--card-h)'; e.currentTarget.style.color = 'var(--t2)'; } }}
          onMouseLeave={(e) => { if (!adding) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--t3)'; } }}
          title="Add a task to today"
        >
          <Plus size={11} />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            {/* Empty state */}
            {queueTasks.length === 0 && !adding && (
              <div className="px-3 pb-3 text-[11px]" style={{ color: 'var(--t3)' }}>
                No queue yet. Tap <span style={{ color: 'var(--t2)' }}>+</span> to plan today.
              </div>
            )}

            {/* Add picker */}
            <AnimatePresence>
              {adding && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-3 pb-2">
                    <div
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg mb-1"
                      style={{ background: 'var(--bg2)', border: '1px solid var(--brd)' }}
                    >
                      <Search size={11} style={{ color: 'var(--t3)' }} />
                      <input
                        autoFocus
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') setAdding(false);
                          if (e.key === 'Enter' && candidates[0]) addToQueue(candidates[0].id);
                        }}
                        placeholder="Search tasks…"
                        className="flex-1 text-[11.5px] bg-transparent focus:outline-none"
                        style={{ color: 'var(--t)' }}
                      />
                    </div>
                    <div className="max-h-32 overflow-y-auto flex flex-col gap-0.5">
                      {candidates.length === 0 && (
                        <span className="text-[11px] px-2 py-1" style={{ color: 'var(--t3)' }}>
                          {search.trim() ? 'No matches' : 'No tasks to add'}
                        </span>
                      )}
                      {candidates.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => addToQueue(c.id)}
                          className="flex items-center gap-2 px-2 py-1 rounded-md text-left transition-colors"
                          style={{ color: 'var(--t2)' }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--card-h)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          <Plus size={10} style={{ color: 'var(--t3)' }} />
                          <span className="text-[11.5px] truncate">{c.title}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Rows */}
            <div className="max-h-[176px] overflow-y-auto pb-1">
              {queueTasks.map((t) => {
                const isActive = t.id === activeTaskId;
                return (
                  <div
                    key={t.id}
                    className="group flex items-center gap-2 px-3 py-1 transition-colors"
                    style={{
                      background: isActive ? 'var(--accent-d)' : 'transparent',
                      borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                      minHeight: 32,
                    }}
                    onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                    onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                  >
                    {/* Status dot — completion */}
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: t.completed ? 'var(--grn)' : isActive ? 'var(--accent)' : 'var(--t3)' }}
                    />
                    <button
                      onClick={() => setAsActive(t.id)}
                      className="flex-1 text-left text-[12px] truncate min-w-0"
                      style={{
                        color: t.completed ? 'var(--t3)' : isActive ? 'var(--t)' : 'var(--t2)',
                        textDecoration: t.completed ? 'line-through' : 'none',
                      }}
                      title="Make active"
                    >
                      {t.title}
                    </button>
                    {t.completed && (
                      <Check size={11} style={{ color: 'var(--grn)' }} />
                    )}
                    {!isActive && !t.completed && (
                      <button
                        onClick={() => setAsActive(t.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: 'var(--t3)' }}
                        title="Make active"
                      >
                        <Play size={10} />
                      </button>
                    )}
                    <button
                      onClick={() => removeFromQueue(t.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: 'var(--t3)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--t3)')}
                      title="Remove from today"
                    >
                      <X size={10} />
                    </button>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
