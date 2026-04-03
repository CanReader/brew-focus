import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Flag, FileText } from 'lucide-react';
import { Task, Priority, isDueDateOverdue, formatDueDateDisplay } from '../../types';

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

const priorityLeftBorder: Record<Priority, string> = {
  p1: 'var(--accent)',
  p2: 'var(--amb)',
  p3: 'var(--blu)',
  p4: 'rgba(255,255,255,0.06)',
};

const priorityActiveBg: Record<Priority, string> = {
  p1: 'rgba(255,77,77,0.04)',
  p2: 'rgba(245,166,35,0.04)',
  p3: 'rgba(91,141,238,0.04)',
  p4: 'transparent',
};

const PlayCircleBtn: React.FC<{ active: boolean; onClick: (e: React.MouseEvent) => void }> = ({ active, onClick }) => (
  <button
    onClick={onClick}
    className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all duration-150"
    style={{
      background: active ? 'var(--accent)' : 'rgba(255,255,255,0.08)',
      border: `1px solid ${active ? 'var(--accent-g)' : 'rgba(255,255,255,0.08)'}`,
      boxShadow: active ? '0 0 8px var(--accent-g)' : 'none',
    }}
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

  const overdue = !task.completed && isDueDateOverdue(task.dueDate);
  const dateLabel = formatDueDateDisplay(task.dueDate);
  const showDate = !!task.dueDate && !task.completed;
  const flagColor = priorityFlagColors[task.priority];

  const reminderOverdue = !task.completed && !!task.reminder && task.reminder < Date.now();
  const displayDate = reminderOverdue && task.reminder
    ? new Date(task.reminder).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
    : (showDate ? dateLabel : null);

  const borderLeftColor = isSelected
    ? 'var(--accent)'
    : overdue
    ? 'rgba(255,77,77,0.6)'
    : priorityLeftBorder[task.priority];

  const bgColor = isSelected
    ? 'var(--accent-d)'
    : overdue
    ? 'rgba(255,77,77,0.05)'
    : isActive
    ? 'rgba(255,77,77,0.04)'
    : priorityActiveBg[task.priority];

  return (
    <motion.div
      ref={setNodeRef}
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -16 }}
      transition={{ duration: 0.18 }}
      className={`group task-item flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all duration-150 relative ${isDragging ? 'z-50' : ''}`}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        background: bgColor,
        borderLeft: `2px solid ${borderLeftColor}`,
        border: isSelected
          ? `1px solid var(--accent-g)`
          : isActive
          ? `1px solid rgba(255,77,77,0.15)`
          : `1px solid transparent`,
        borderLeftWidth: 2,
        boxShadow: isActive && !isSelected ? '0 0 20px rgba(255,77,77,0.06)' : 'none',
      }}
      onContextMenu={onContextMenu}
      onDoubleClick={() => !task.completed && setIsEditing(true)}
      onMouseEnter={(e) => {
        if (!isSelected && !isActive) {
          (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          (e.currentTarget as HTMLDivElement).style.background = bgColor;
        }
      }}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="shrink-0 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-60 transition-opacity"
        style={{ color: 'var(--t3)' }}
      >
        <GripVertical size={12} />
      </div>

      {/* Checkbox */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-200"
        style={{
          borderColor: task.completed
            ? 'var(--grn)'
            : overdue
            ? 'rgba(255,77,77,0.5)'
            : 'rgba(255,255,255,0.14)',
          background: task.completed ? 'var(--grn)' : 'transparent',
          boxShadow: task.completed ? '0 0 8px rgba(34,211,165,0.3)' : 'none',
        }}
      >
        {task.completed && (
          <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
            <path d="M1 3.5L3 5.5L8 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* Play button */}
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
              color: task.completed ? 'var(--t3)' : overdue ? '#ff6b5a' : 'var(--t)',
              textDecoration: task.completed ? 'line-through' : 'none',
              opacity: task.completed ? 0.6 : 1,
            }}
            title={task.title}
          >
            {task.title}
          </span>
        )}
      </div>

      {/* Right side metadata */}
      <div className="task-actions flex items-center gap-2 shrink-0">
        {/* Notes indicator */}
        {task.notes && (
          <span title="Has notes" style={{ color: 'var(--t3)' }}>
            <FileText size={10} />
          </span>
        )}

        {/* Pomodoro count as pill */}
        <div
          className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] tabular-nums"
          style={{
            background: task.pomodoroCompleted > 0 ? 'var(--accent-d)' : 'rgba(255,255,255,0.04)',
            color: task.pomodoroCompleted > 0 ? 'var(--accent)' : 'var(--t3)',
            border: `1px solid ${task.pomodoroCompleted > 0 ? 'var(--accent-g)' : 'transparent'}`,
          }}
        >
          <span>{task.pomodoroCompleted}</span>
          <span style={{ opacity: 0.5 }}>/</span>
          <span>{task.pomodoroEstimate}</span>
        </div>

        {/* Priority flag */}
        <span style={{ color: flagColor, opacity: task.priority === 'p4' ? 0.25 : 0.8 }}>
          <Flag size={11} fill={task.priority !== 'p4' ? flagColor : 'none'} />
        </span>

        {/* Date */}
        {displayDate && (
          <span
            className="text-[10px]"
            style={{ color: overdue || reminderOverdue ? '#ff6b5a' : 'var(--t3)' }}
          >
            {displayDate}
          </span>
        )}
      </div>
    </motion.div>
  );
};
