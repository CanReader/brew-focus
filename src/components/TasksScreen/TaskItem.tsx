import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Target, Flag, Play } from 'lucide-react';
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

/** Small coffee cup SVG replacing the tomato icon */
const CoffeeCupDot: React.FC<{ color?: string }> = ({ color = 'var(--t3)' }) => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ display: 'inline', verticalAlign: 'middle' }}>
    <path d="M2 5h10v.8H2V5z" fill={color} opacity="0.9"/>
    <path d="M2 6.5h9c0 2.5-1.2 5-4.5 5S2 9 2 6.5z" fill={color} opacity="0.9"/>
    <path d="M11 7.5h1a1.5 1.5 0 000-3h-1" stroke={color} strokeWidth="1.1" strokeLinecap="round"/>
    <path d="M3.5 12c.8.4 6.4.4 7.2 0" stroke={color} strokeWidth="1" strokeLinecap="round"/>
  </svg>
);

function getDueDateLabel(dueDate: Task['dueDate']): { label: string; color: string } | null {
  if (!dueDate) return null;
  switch (dueDate) {
    case 'today':
      return { label: 'Today', color: 'var(--amb)' };
    case 'tomorrow':
      return { label: 'Tomorrow', color: 'var(--t3)' };
    case 'someday':
      return { label: 'Someday', color: 'var(--t3)' };
    default:
      return null;
  }
}

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  isActive,
  isSelected,
  onToggle,
  onUpdate,
  onSetActive,
  onPlay,
  onContextMenu,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(task.title);
  const editRef = useRef<HTMLInputElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

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

  const hasCustomTimer = task.customWorkDuration !== undefined || task.customShortBreakDuration !== undefined;
  const dueDateInfo = getDueDateLabel(task.dueDate);

  // Reminder overdue: reminder is set, in the past, task not completed
  const now = Date.now();
  const reminderOverdue =
    !task.completed &&
    task.reminder !== undefined &&
    task.reminder !== null &&
    task.reminder < now;

  return (
    <motion.div
      ref={setNodeRef}
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -16 }}
      className={`group flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all duration-150 ${isDragging ? 'z-50' : ''}`}
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

      {/* Priority flag icon */}
      <div className="shrink-0" style={{ color: priorityFlagColors[task.priority], opacity: task.priority === 'p4' ? 0.4 : 1 }}>
        <Flag size={12} fill={task.priority !== 'p4' ? priorityFlagColors[task.priority] : 'none'} />
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
            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>

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

      {/* Due date / reminder labels */}
      {!task.completed && (dueDateInfo || reminderOverdue) && (
        <div className="flex items-center gap-1 shrink-0">
          {reminderOverdue && task.reminder !== undefined && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded"
              style={{ color: '#e8453c', background: 'rgba(232,69,60,0.12)' }}
              title={`Reminder: ${new Date(task.reminder!).toLocaleString()}`}
            >
              {new Date(task.reminder!).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
          )}
          {dueDateInfo && !reminderOverdue && (
            <span
              className="text-[10px]"
              style={{ color: dueDateInfo.color, opacity: 0.85 }}
            >
              {dueDateInfo.label}
            </span>
          )}
        </div>
      )}

      {/* Right side: coffee cups progress + custom timer badge + focus */}
      <div className="task-actions flex items-center gap-2 shrink-0">
        {/* Custom timer badge */}
        {hasCustomTimer && (
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-md"
            style={{ background: 'var(--accent-d)', color: 'var(--accent)' }}
            title={`Custom: ${task.customWorkDuration ?? '?'}m work / ${task.customShortBreakDuration ?? '?'}m break`}
          >
            {task.customWorkDuration}m
          </span>
        )}

        {/* Pomodoro coffee cups */}
        <div className="flex items-center gap-0.5">
          {Array.from({ length: Math.min(task.pomodoroEstimate, 8) }).map((_, i) => (
            <CoffeeCupDot
              key={i}
              color={i < task.pomodoroCompleted ? 'var(--accent)' : 'var(--brd2)'}
            />
          ))}
          {task.pomodoroEstimate > 8 && (
            <span className="text-[10px] ml-0.5" style={{ color: 'var(--t3)' }}>
              +{task.pomodoroEstimate - 8}
            </span>
          )}
        </div>

        {/* Play button: start timer on this task */}
        {!task.completed && onPlay && (
          <button
            onClick={(e) => { e.stopPropagation(); onPlay(); }}
            className="w-6 h-6 flex items-center justify-center rounded-md transition-all opacity-0 group-hover:opacity-100"
            style={{ color: 'var(--grn)', background: 'transparent' }}
            title="Start timer for this task"
          >
            <Play size={12} fill="var(--grn)" />
          </button>
        )}

        {/* Focus on this */}
        {!task.completed && (
          <button
            onClick={(e) => { e.stopPropagation(); onSetActive(); }}
            className="w-6 h-6 flex items-center justify-center rounded-md transition-all opacity-0 group-hover:opacity-100"
            style={{
              color: isActive ? 'var(--accent)' : 'var(--t3)',
              background: isActive ? 'var(--accent-d)' : 'transparent',
              opacity: isActive ? 1 : undefined,
            }}
            title={isActive ? 'Active task' : 'Focus on this'}
          >
            <Target size={12} />
          </button>
        )}
      </div>
    </motion.div>
  );
};
