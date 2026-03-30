import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Trash2, Minus, Plus } from 'lucide-react';
import { Task, Priority, DueDate, Project } from '../../types';

interface TaskDetailPanelProps {
  task: Task;
  projects: Project[];
  onClose: () => void;
  onUpdate: (partial: Partial<Task>) => void;
  onDelete: () => void;
}

const PRIORITIES: { value: Priority; label: string; color: string }[] = [
  { value: 'p4', label: 'None', color: '#5e5c58' },
  { value: 'p3', label: 'Low', color: '#5a9cf5' },
  { value: 'p2', label: 'Med', color: '#e8a83e' },
  { value: 'p1', label: 'High', color: '#e8453c' },
];

const CoffeeCup: React.FC<{ filled: boolean; onClick: () => void; onHover: () => void; onLeave: () => void }> = ({ filled, onClick, onHover, onLeave }) => (
  <button
    onClick={onClick}
    onMouseEnter={onHover}
    onMouseLeave={onLeave}
    className="transition-all duration-100"
  >
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
      <path d="M2 5h10v.8H2V5z" fill={filled ? 'var(--accent)' : 'var(--brd2)'} opacity="0.9"/>
      <path d="M2 6.5h9c0 2.5-1.2 5-4.5 5S2 9 2 6.5z" fill={filled ? 'var(--accent)' : 'var(--brd2)'} opacity="0.9"/>
      <path d="M11 7.5h1a1.5 1.5 0 000-3h-1" stroke={filled ? 'var(--accent)' : 'var(--brd2)'} strokeWidth="1.1" strokeLinecap="round"/>
      <path d="M3.5 12c.8.4 6.4.4 7.2 0" stroke={filled ? 'var(--accent)' : 'var(--brd2)'} strokeWidth="1" strokeLinecap="round"/>
    </svg>
  </button>
);

export const TaskDetailPanel: React.FC<TaskDetailPanelProps> = ({
  task,
  projects,
  onClose,
  onUpdate,
  onDelete,
}) => {
  const [titleValue, setTitleValue] = useState(task.title);
  const [hoverCount, setHoverCount] = useState<number | null>(null);

  // Sync title when task changes (different task selected)
  React.useEffect(() => {
    setTitleValue(task.title);
  }, [task.id]);

  const handleTitleBlur = () => {
    const trimmed = titleValue.trim();
    if (trimmed && trimmed !== task.title) onUpdate({ title: trimmed });
    else setTitleValue(task.title);
  };

  const displayCount = hoverCount ?? task.pomodoroEstimate;

  return (
    <motion.div
      initial={{ x: 20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 20, opacity: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="h-full flex flex-col overflow-y-auto"
      style={{
        background: 'var(--bg2)',
        borderLeft: '1px solid var(--brd)',
        width: '260px',
        flexShrink: 0,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0" style={{ borderColor: 'var(--brd)' }}>
        <span className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: 'var(--t3)' }}>
          Task Details
        </span>
        <button
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center rounded-md transition-colors"
          style={{ color: 'var(--t3)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--card)'; e.currentTarget.style.color = 'var(--t)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--t3)'; }}
        >
          <X size={13} />
        </button>
      </div>

      <div className="flex flex-col gap-5 p-4 flex-1">
        {/* Title */}
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1.5" style={{ color: 'var(--t3)' }}>Title</label>
          <textarea
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleTitleBlur(); (e.target as HTMLTextAreaElement).blur(); } }}
            rows={2}
            className="w-full text-[13px] bg-transparent resize-none focus:outline-none border rounded-lg px-3 py-2 transition-colors"
            style={{ color: 'var(--t)', borderColor: 'var(--brd)', background: 'var(--card)' }}
            onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
            onBlurCapture={(e) => (e.currentTarget.style.borderColor = 'var(--brd)')}
          />
        </div>

        {/* Priority */}
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wider block mb-2" style={{ color: 'var(--t3)' }}>Priority</label>
          <div className="flex gap-2">
            {PRIORITIES.map((p) => (
              <button
                key={p.value}
                onClick={() => onUpdate({ priority: p.value })}
                className="flex-1 py-1.5 rounded-lg text-[11px] font-medium transition-all"
                style={{
                  background: task.priority === p.value ? p.color + '25' : 'var(--card)',
                  color: task.priority === p.value ? p.color : 'var(--t3)',
                  border: `1.5px solid ${task.priority === p.value ? p.color : 'var(--brd)'}`,
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Due date */}
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wider block mb-2" style={{ color: 'var(--t3)' }}>Due Date</label>
          <div className="flex gap-1.5">
            {(['today', 'tomorrow', 'someday'] as DueDate[]).map((d) => (
              <button
                key={d as string}
                onClick={() => onUpdate({ dueDate: task.dueDate === d ? null : d })}
                className="flex-1 py-1.5 rounded-lg text-[11px] font-medium transition-all capitalize"
                style={{
                  background: task.dueDate === d ? 'var(--accent-d)' : 'var(--card)',
                  color: task.dueDate === d ? 'var(--accent)' : 'var(--t3)',
                  border: `1.5px solid ${task.dueDate === d ? 'var(--accent-g)' : 'var(--brd)'}`,
                }}
              >
                {d as string}
              </button>
            ))}
          </div>
        </div>

        {/* Pomodoro estimate */}
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wider block mb-2" style={{ color: 'var(--t3)' }}>
            Estimated Sessions
          </label>
          {/* Coffee cup row */}
          <div className="flex items-center gap-2 mb-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <CoffeeCup
                key={i}
                filled={i < displayCount}
                onClick={() => onUpdate({ pomodoroEstimate: i + 1 })}
                onHover={() => setHoverCount(i + 1)}
                onLeave={() => setHoverCount(null)}
              />
            ))}
          </div>
          {/* Fine-tune stepper */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => { if (task.pomodoroEstimate > 1) onUpdate({ pomodoroEstimate: task.pomodoroEstimate - 1 }); }}
              className="w-6 h-6 flex items-center justify-center rounded-md"
              style={{ background: 'var(--card)', color: 'var(--t3)' }}
            >
              <Minus size={11} />
            </button>
            <span className="text-[13px] tabular-nums" style={{ color: 'var(--t)' }}>
              {task.pomodoroEstimate} session{task.pomodoroEstimate !== 1 ? 's' : ''}
            </span>
            <button
              onClick={() => onUpdate({ pomodoroEstimate: task.pomodoroEstimate + 1 })}
              className="w-6 h-6 flex items-center justify-center rounded-md"
              style={{ background: 'var(--card)', color: 'var(--t3)' }}
            >
              <Plus size={11} />
            </button>
            <span className="text-[11px] ml-2" style={{ color: 'var(--t3)' }}>
              ({task.pomodoroCompleted} done)
            </span>
          </div>
        </div>

        {/* Custom timer */}
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wider block mb-2" style={{ color: 'var(--t3)' }}>
            Custom Timer
            {(task.customWorkDuration || task.customShortBreakDuration) && (
              <button
                onClick={() => onUpdate({ customWorkDuration: undefined, customShortBreakDuration: undefined })}
                className="ml-2 normal-case text-[10px] underline"
                style={{ color: 'var(--t3)' }}
              >
                reset to default
              </button>
            )}
          </label>
          <div className="flex gap-3">
            <div className="flex-1">
              <div className="text-[10px] mb-1" style={{ color: 'var(--t3)' }}>Work (min)</div>
              <div className="flex items-center gap-1.5 p-2 rounded-lg" style={{ background: 'var(--card)' }}>
                <button
                  onClick={() => onUpdate({ customWorkDuration: Math.max(1, (task.customWorkDuration ?? 25) - 1) })}
                  className="w-5 h-5 flex items-center justify-center rounded"
                  style={{ color: 'var(--t3)' }}
                >
                  <Minus size={10} />
                </button>
                <span className="flex-1 text-center text-[13px] tabular-nums" style={{ color: 'var(--t)' }}>
                  {task.customWorkDuration ?? '–'}
                </span>
                <button
                  onClick={() => onUpdate({ customWorkDuration: (task.customWorkDuration ?? 25) + 1 })}
                  className="w-5 h-5 flex items-center justify-center rounded"
                  style={{ color: 'var(--t3)' }}
                >
                  <Plus size={10} />
                </button>
              </div>
            </div>
            <div className="flex-1">
              <div className="text-[10px] mb-1" style={{ color: 'var(--t3)' }}>Break (min)</div>
              <div className="flex items-center gap-1.5 p-2 rounded-lg" style={{ background: 'var(--card)' }}>
                <button
                  onClick={() => onUpdate({ customShortBreakDuration: Math.max(1, (task.customShortBreakDuration ?? 5) - 1) })}
                  className="w-5 h-5 flex items-center justify-center rounded"
                  style={{ color: 'var(--t3)' }}
                >
                  <Minus size={10} />
                </button>
                <span className="flex-1 text-center text-[13px] tabular-nums" style={{ color: 'var(--t)' }}>
                  {task.customShortBreakDuration ?? '–'}
                </span>
                <button
                  onClick={() => onUpdate({ customShortBreakDuration: (task.customShortBreakDuration ?? 5) + 1 })}
                  className="w-5 h-5 flex items-center justify-center rounded"
                  style={{ color: 'var(--t3)' }}
                >
                  <Plus size={10} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Project */}
        {projects.length > 0 && (
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider block mb-2" style={{ color: 'var(--t3)' }}>Project</label>
            <div className="flex flex-col gap-1">
              <button
                onClick={() => onUpdate({ projectId: undefined })}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors"
                style={{ background: !task.projectId ? 'var(--card)' : 'transparent', color: !task.projectId ? 'var(--t2)' : 'var(--t3)' }}
              >
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--brd2)' }} />
                <span className="text-[12px]">None</span>
              </button>
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onUpdate({ projectId: p.id })}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors"
                  style={{ background: task.projectId === p.id ? 'var(--card)' : 'transparent', color: task.projectId === p.id ? 'var(--t)' : 'var(--t3)' }}
                  onMouseEnter={(e) => { if (task.projectId !== p.id) e.currentTarget.style.background = 'var(--card)'; }}
                  onMouseLeave={(e) => { if (task.projectId !== p.id) e.currentTarget.style.background = 'transparent'; }}
                >
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: p.color }} />
                  <span className="text-[12px]">{p.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Delete */}
      <div className="p-4 border-t shrink-0" style={{ borderColor: 'var(--brd)' }}>
        <button
          onClick={() => { onDelete(); onClose(); }}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-[13px] font-medium transition-all"
          style={{ color: '#e8453c', background: 'rgba(232,69,60,0.1)' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(232,69,60,0.18)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(232,69,60,0.1)')}
        >
          <Trash2 size={13} />
          Delete Task
        </button>
      </div>
    </motion.div>
  );
};
