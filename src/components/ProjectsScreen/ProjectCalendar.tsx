import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import {
  Project, Task, TimerSession, taskTypeColor, resolveDueDateToTs,
} from '../../types';
import { useTaskStore } from '../../store/taskStore';

interface Props {
  project: Project;
  tasks: Task[];
  sessions: TimerSession[];
  onOpenTask: (id: string) => void;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function startOfMonth(d: Date): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), 1);
  r.setHours(0, 0, 0, 0);
  return r;
}

function buildGrid(month: Date): Date[] {
  const start = startOfMonth(month);
  const startDow = (start.getDay() + 6) % 7; // Mon=0
  const gridStart = new Date(start);
  gridStart.setDate(start.getDate() - startDow);
  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    d.setHours(0, 0, 0, 0);
    cells.push(d);
  }
  return cells;
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const ProjectCalendar: React.FC<Props> = ({ project, tasks, sessions, onOpenTask }) => {
  const { updateTask, addTask } = useTaskStore();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [hoverDay, setHoverDay] = useState<string | null>(null);
  const [dayInput, setDayInput] = useState('');

  const cells = useMemo(() => buildGrid(month), [month]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Bucket tasks by their due-date day.
  const tasksByDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      const ts = resolveDueDateToTs(t.dueDate);
      if (ts === null) continue;
      const d = new Date(ts);
      const k = dayKey(d);
      const arr = map.get(k) ?? [];
      arr.push(t);
      map.set(k, arr);
    }
    return map;
  }, [tasks]);

  // Bucket past pomodoros (work phase) by day for the bottom bar.
  const sessionsByDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of sessions) {
      if (s.phase !== 'work') continue;
      if (s.projectId !== project.id) {
        // Fallback for legacy rows: check task's current project.
        const owning = tasks.find((t) => t.id === s.taskId);
        if (owning?.projectId !== project.id) continue;
      }
      const k = dayKey(new Date(s.startedAt));
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    return map;
  }, [sessions, tasks, project.id]);

  const submitDayTask = async () => {
    if (!selectedDay || !dayInput.trim()) return;
    const dueDate = dayKey(selectedDay);
    await addTask(dayInput.trim(), 'p4', project.id, dueDate, 1);
    setDayInput('');
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Month nav */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
          className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
          style={{ color: 'var(--t3)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--card)'; e.currentTarget.style.color = 'var(--t2)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--t3)'; }}
        >
          <ChevronLeft size={13} />
        </button>
        <span className="font-fraunces text-[16px]" style={{ color: 'var(--t)' }}>
          {month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </span>
        <button
          onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
          className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
          style={{ color: 'var(--t3)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--card)'; e.currentTarget.style.color = 'var(--t2)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--t3)'; }}
        >
          <ChevronRight size={13} />
        </button>
        <button
          onClick={() => setMonth(startOfMonth(new Date()))}
          className="ml-2 px-2 py-1 rounded-lg text-[11px] font-medium transition-colors"
          style={{ color: 'var(--t3)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--card)'; e.currentTarget.style.color = 'var(--t2)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--t3)'; }}
        >
          Today
        </button>
      </div>

      <div className="flex gap-3">
        {/* Calendar grid */}
        <div className="flex-1 rounded-2xl overflow-hidden" style={{ background: 'var(--bg2)', border: '1px solid var(--brd)' }}>
          {/* Weekday header */}
          <div className="grid grid-cols-7" style={{ borderBottom: '1px solid var(--brd)' }}>
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                className="px-2 py-2 text-[10.5px] font-semibold uppercase tracking-wider text-center"
                style={{ color: 'var(--t3)' }}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Cells */}
          <div className="grid grid-cols-7" style={{ minHeight: 600 }}>
            {cells.map((d, i) => {
              const inMonth = d.getMonth() === month.getMonth();
              const isToday = sameDay(d, today);
              const isSelected = selectedDay && sameDay(d, selectedDay);
              const isPast = d.getTime() < today.getTime();
              const k = dayKey(d);
              const dayTasks = tasksByDay.get(k) ?? [];
              const sessionCount = sessionsByDay.get(k) ?? 0;
              const isHover = hoverDay === k;

              return (
                <button
                  key={i}
                  onClick={() => setSelectedDay(d)}
                  onMouseEnter={() => dragTaskId && setHoverDay(k)}
                  onMouseLeave={() => setHoverDay(null)}
                  onDragOver={(e) => { e.preventDefault(); setHoverDay(k); }}
                  onDragLeave={() => setHoverDay(null)}
                  onDrop={async (e) => {
                    e.preventDefault();
                    const id = e.dataTransfer.getData('text/plain');
                    if (id) await updateTask(id, { dueDate: k });
                    setHoverDay(null);
                    setDragTaskId(null);
                  }}
                  className="relative text-left p-1.5 transition-colors flex flex-col gap-0.5"
                  style={{
                    minHeight: 100,
                    borderRight: (i % 7) < 6 ? '1px solid var(--brd)' : 'none',
                    borderBottom: i < 35 ? '1px solid var(--brd)' : 'none',
                    background: isSelected
                      ? project.color + '14'
                      : isHover
                        ? 'rgba(255,255,255,0.04)'
                        : 'transparent',
                    opacity: isPast && !inMonth ? 0.35 : inMonth ? 1 : 0.4,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="text-[11px] tabular-nums"
                      style={{
                        color: isToday ? 'var(--accent)' : inMonth ? 'var(--t2)' : 'var(--t3)',
                        fontWeight: isToday ? 700 : 500,
                      }}
                    >
                      {d.getDate()}
                    </span>
                    {isToday && (
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
                    )}
                  </div>

                  {/* Task pills */}
                  <div className="flex flex-col gap-0.5">
                    {dayTasks.slice(0, 3).map((t) => {
                      const tColor = taskTypeColor(t.type);
                      return (
                        <div
                          key={t.id}
                          draggable
                          onDragStart={(e) => {
                            setDragTaskId(t.id);
                            e.dataTransfer.setData('text/plain', t.id);
                            e.dataTransfer.effectAllowed = 'move';
                          }}
                          onDragEnd={() => setDragTaskId(null)}
                          onClick={(e) => { e.stopPropagation(); onOpenTask(t.id); }}
                          className="text-[10.5px] truncate px-1 py-0.5 rounded transition-all cursor-pointer"
                          style={{
                            background: 'var(--bg2)',
                            border: '1px solid var(--brd)',
                            borderLeft: `2px solid ${tColor}`,
                            color: t.completed ? 'var(--t3)' : 'var(--t2)',
                            textDecoration: t.completed ? 'line-through' : 'none',
                            opacity: dragTaskId === t.id ? 0.4 : 1,
                          }}
                        >
                          {t.title}
                        </div>
                      );
                    })}
                    {dayTasks.length > 3 && (
                      <span className="text-[10px] px-1" style={{ color: 'var(--t3)' }}>
                        +{dayTasks.length - 3} more
                      </span>
                    )}
                  </div>

                  {/* Session intensity bar */}
                  {sessionCount > 0 && (
                    <div className="mt-auto h-[2px] w-full rounded-full" style={{ background: 'var(--brd)' }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(1, sessionCount / 8) * 100}%`,
                          background: 'var(--accent)',
                          opacity: 0.5,
                        }}
                        title={`${sessionCount} session${sessionCount === 1 ? '' : 's'}`}
                      />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Day detail panel */}
        <AnimatePresence>
          {selectedDay && (
            <motion.div
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.15 }}
              className="rounded-2xl p-3 flex flex-col gap-2"
              style={{
                width: 280,
                background: 'var(--card)',
                border: '1px solid var(--brd)',
                maxHeight: 600,
              }}
            >
              <div className="flex items-center justify-between">
                <span className="font-fraunces text-[14px]" style={{ color: 'var(--t)' }}>
                  {selectedDay.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                </span>
                <button onClick={() => setSelectedDay(null)} style={{ color: 'var(--t3)' }}>
                  <X size={12} />
                </button>
              </div>

              <div className="flex flex-col gap-1 flex-1 overflow-y-auto">
                {(tasksByDay.get(dayKey(selectedDay)) ?? []).map((t) => {
                  const tColor = taskTypeColor(t.type);
                  return (
                    <button
                      key={t.id}
                      onClick={() => onOpenTask(t.id)}
                      className="text-left text-[12px] px-2 py-1.5 rounded-lg transition-colors"
                      style={{
                        background: 'var(--bg2)',
                        border: '1px solid var(--brd)',
                        borderLeft: `2px solid ${tColor}`,
                        color: t.completed ? 'var(--t3)' : 'var(--t)',
                        textDecoration: t.completed ? 'line-through' : 'none',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--brd2)')}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--brd)')}
                    >
                      {t.title}
                    </button>
                  );
                })}
                {(tasksByDay.get(dayKey(selectedDay)) ?? []).length === 0 && (
                  <span className="text-[11.5px] py-1" style={{ color: 'var(--t3)' }}>No tasks scheduled</span>
                )}
              </div>

              {/* Add for this day */}
              <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg" style={{ background: 'var(--bg2)', border: '1px solid var(--brd)' }}>
                <Plus size={11} style={{ color: project.color }} />
                <input
                  value={dayInput}
                  onChange={(e) => setDayInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') submitDayTask(); }}
                  placeholder="Schedule task here…"
                  className="flex-1 text-[11.5px] bg-transparent focus:outline-none"
                  style={{ color: 'var(--t)' }}
                />
              </div>

              {(sessionsByDay.get(dayKey(selectedDay)) ?? 0) > 0 && (
                <div className="text-[10.5px] pt-1" style={{ color: 'var(--t3)', borderTop: '1px solid var(--brd)' }}>
                  <span style={{ color: 'var(--accent)' }}>●</span> {sessionsByDay.get(dayKey(selectedDay))} focus session{sessionsByDay.get(dayKey(selectedDay))! === 1 ? '' : 's'}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
