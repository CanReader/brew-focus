import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Flag } from 'lucide-react';
import { Task, Priority } from '../../types';

interface TaskItemProps {
  task: Task;
  isActive: boolean;
  isSelected?: boolean;
  onToggle: () => void;
  onDelete?: () => void;
  onUpdate: (partial: Partial<Task>) => void;
  onSetActive: () => void;
  onPlay?: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

const priorityFlagColors: Record<Priority, string> = {
  p1: 'var(--accent)',
  p2: 'var(--amb)',
  p3: 'var(--blu)',
  p4: 'var(--t3)',
};

function formatShortDate(dueDate: Task['dueDate']): string | null {
  if (!dueDate) return null;
  const now = new Date();
  if (dueDate === 'today') {
    return now.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  }
  if (dueDate === 'tomorrow') {
    const t = new Date(now);
    t.setDate(t.getDate() + 1);
    return t.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  }
  if (dueDate === 'someday') return 'Someday';
  return null;
}

const PlayCircleBtn: React.FC<{ active: boolean; onClick: (e: React.MouseEvent) => void }> = ({ active, onClick }) => (
  <button
    onClick={onClick}
    className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all"
    style={{ background: active ? 'var(--accent)' : 'var(--brd2)' }}
    title="Start timer for this task"
  >
    <svg width="7" height="8" viewBox="0 0 7 8" fill="none">
      <path d="M1.5 1L6 4L1.5 7V1Z" fill="white" />
    </svg>
  </button>
);

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  isActive,
  isSelected,
  onToggle,
  onUpdate,
  onPlay,
  onContextMenu,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(task.title);
  const editRef = useRef<HTMLInputElement>(null);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });

  useEffect(() => {
    if (isEditing && editRef.current) {
      editRef.current.focus();
      editRef.current.select();
    }
  }, [isEditing]);

  const handleEditSubmit = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== task.title) onUpdate({ title: trimmed });
    else setEditValue(task.title);
    setIsEditing(false);
  };

  const dueDateStr = formatShortDate(task.dueDate ?? null);
  const flagColor = priorityFlagColors[task.priority];
  const reminderOverdue = !task.completed && !!task.reminder && task.reminder < Date.now();
  const dateLabel = reminderOverdue && task.reminder
    ? new Date(task.reminder).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
    : dueDateStr;

  return (
    <motion.div
      ref={setNodeRef}
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -16 }}
      className={`group flex items-center gap-2 px-3 py-2 rounded-xl border transition-all duration-150 ${isDragging ? 'z-50' : ''}`}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        background: isActive ? 'var(--accent-d)' : 'var(--card)',
        borderColor: isActive ? 'var(--accent-g)' : isSelected ? 'var(--brd2)' : 'transparent',
      }}
      onContextMenu={onContextMenu}
      onDoubleClick={() => !task.completed && setIsEditing(true)}
      onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'var(--card-h)'; }}
      onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'var(--card)'; }}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="shrink-0 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ color: 'var(--t3)' }}
      >
        <GripVertical size={13} />
      </div>

      {/* Checkbox */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-150"
        style={{
          borderColor: task.completed ? 'var(--grn)' : 'var(--brd2)',
          background: task.completed ? 'var(--grn)' : 'transparent',
        }}
      >
        {task.completed && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* Play button — always visible */}
      {!task.completed && (
        <PlayCircleBtn
          active={isActive}
          onClick={(e) => { e.stopPropagation(); onPlay?.(); }}
        />
      )}

      {/* Title */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <input
            ref={editRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleEditSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleEditSubmit();
              if (e.key === 'Escape') { setEditValue(task.title); setIsEditing(false); }
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-full text-[13px] bg-transparent border-b focus:outline-none"
            style={{ color: 'var(--t)', borderColor: 'var(--accent)' }}
          />
        ) : (
          <span
            className="text-[13px] truncate block"
            style={{
              color: task.completed ? 'var(--t3)' : 'var(--t)',
              textDecoration: task.completed ? 'line-through' : 'none',
            }}
            title={task.title}
          >
            {task.title}
          </span>
        )}
      </div>

      {/* Right: ●completed / ●total  flag  date */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Session counter */}
        <div className="flex items-center gap-0.5 text-[11px] tabular-nums">
          <span style={{ color: task.pomodoroCompleted > 0 ? 'var(--accent)' : 'var(--brd2)' }}>●</span>
          <span style={{ color: task.pomodoroCompleted > 0 ? 'var(--accent)' : 'var(--t3)' }}>
            {task.pomodoroCompleted}
          </span>
          <span className="mx-0.5" style={{ color: 'var(--t3)' }}>/</span>
          <span style={{ color: 'var(--accent)' }}>●</span>
          <span style={{ color: 'var(--t2)' }}>{task.pomodoroEstimate}</span>
        </div>

        {/* Priority flag */}
        <span style={{ color: flagColor, opacity: task.priority === 'p4' ? 0.3 : 1 }}>
          <Flag size={12} fill={task.priority !== 'p4' ? flagColor : 'none'} />
        </span>

        {/* Date */}
        {dateLabel && !task.completed && (
          <span
            className="text-[11px]"
            style={{ color: reminderOverdue ? '#e8453c' : 'var(--t3)' }}
          >
            {dateLabel}
          </span>
        )}
      </div>
    </motion.div>
  );
};
