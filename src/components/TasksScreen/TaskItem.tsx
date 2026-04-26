import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical, Flag, FileText, Coffee, ListChecks, Hash,
  Calendar, FolderOpen, RefreshCw, Clock, Lock,
} from 'lucide-react';
import { Task, Priority, TASK_STATUS_META, isDueDateOverdue, formatDueDateDisplay } from '../../types';
import { useTimerStore } from '../../store/timerStore';
import { useTaskStore } from '../../store/taskStore';
import { isTaskStale } from '../../utils/staleTask';
import { blockingTasks } from '../../utils/dependencies';

interface TaskItemProps {
  task: Task;
  isActive: boolean;
  isSelected?: boolean;
  isMultiSelected?: boolean;
  projectName?: string;
  projectColor?: string;
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

const PomodoroDots: React.FC<{ completed: number; estimate: number }> = ({ completed, estimate }) => {
  if (estimate > 8) {
    return <PomodoroRing completed={completed} estimate={estimate} />;
  }
  return (
    <div className="flex items-center gap-[3px]">
      {Array.from({ length: estimate }, (_, i) => (
        <motion.div
          key={i}
          className="w-[6px] h-[6px] rounded-full"
          style={{
            background: i < completed ? 'var(--accent)' : 'rgba(255,255,255,0.08)',
            boxShadow: i < completed ? '0 0 4px var(--accent-g)' : 'none',
          }}
          initial={false}
          animate={i === completed - 1 ? { scale: [1, 1.4, 1] } : {}}
          transition={{ duration: 0.3 }}
        />
      ))}
    </div>
  );
};

const PomodoroRing: React.FC<{ completed: number; estimate: number }> = ({ completed, estimate }) => {
  const pct = estimate > 0 ? Math.min(1, completed / estimate) : 0;
  const r = 9;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);
  return (
    <div className="relative w-6 h-6 flex items-center justify-center shrink-0">
      <svg width="24" height="24" viewBox="0 0 24 24" className="absolute inset-0 -rotate-90">
        <circle cx="12" cy="12" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2.5" />
        <circle
          cx="12" cy="12" r={r} fill="none"
          stroke={pct >= 1 ? 'var(--grn)' : 'var(--accent)'}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.4s ease' }}
        />
      </svg>
      <span className="text-[8px] font-bold tabular-nums relative z-10" style={{ color: 'var(--t2)' }}>
        {completed}
      </span>
    </div>
  );
};

function getDueDateStyle(task: Task): { bg: string; border: string; color: string } | null {
  if (!task.dueDate || task.completed) return null;
  const overdue = isDueDateOverdue(task.dueDate);
  if (overdue) return { bg: 'rgba(255,77,77,0.12)', border: 'rgba(255,77,77,0.25)', color: '#ff6b5a' };
  if (task.dueDate === 'today') return { bg: 'rgba(245,166,35,0.10)', border: 'rgba(245,166,35,0.22)', color: '#f5a623' };
  if (task.dueDate === 'tomorrow') return { bg: 'rgba(245,166,35,0.06)', border: 'rgba(245,166,35,0.14)', color: 'rgba(245,166,35,0.7)' };
  return { bg: 'rgba(255,255,255,0.04)', border: 'var(--brd)', color: 'var(--t3)' };
}

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  isActive,
  isSelected,
  isMultiSelected,
  projectName,
  projectColor,
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

  const sessions = useTimerStore((s) => s.sessions);
  const allTasks = useTaskStore((s) => s.tasks);
  const blockers = task.completed ? [] : blockingTasks(task, allTasks);
  const stale = isTaskStale(task, sessions);
  const overdue = !task.completed && isDueDateOverdue(task.dueDate);
  const dateLabel = formatDueDateDisplay(task.dueDate);
  const showDate = !!task.dueDate && !task.completed;
  const flagColor = priorityFlagColors[task.priority];

  const reminderOverdue = !task.completed && !!task.reminder && task.reminder < Date.now();
  const displayDate = reminderOverdue && task.reminder
    ? new Date(task.reminder).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
    : (showDate ? dateLabel : null);

  const borderLeftColor = isMultiSelected
    ? 'var(--blu)'
    : isSelected
    ? 'var(--accent)'
    : task.completed
    ? 'var(--brd)'
    : overdue
    ? 'rgba(255,77,77,0.6)'
    : priorityLeftBorder[task.priority];

  const bgColor = isMultiSelected
    ? 'rgba(91,141,238,0.10)'
    : isSelected
    ? 'var(--accent-d)'
    : overdue
    ? 'rgba(255,77,77,0.05)'
    : isActive
    ? 'rgba(255,77,77,0.04)'
    : priorityActiveBg[task.priority];

  const hasRepeat = task.repeatType && task.repeatType !== 'none';
  const completedSubtasks = task.subtasks.filter((s) => s.completed).length;
  const dueDateStyle = getDueDateStyle(task);

  const alwaysVisibleMeta = overdue || (task.dueDate === 'today' && !task.completed) ||
    (task.subtasks.length > 0 && !task.completed);
  const hasHiddenMeta = !task.completed && (
    projectName || task.tags.length > 0 || hasRepeat ||
    (displayDate && !overdue && task.dueDate !== 'today') ||
    (task.subtasks.length > 0 && !alwaysVisibleMeta)
  );
  const hasMetaRow = !task.completed && (
    projectName || task.tags.length > 0 || task.subtasks.length > 0 ||
    hasRepeat || displayDate
  );

  return (
    <motion.div
      ref={setNodeRef}
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{
        opacity: isDragging ? 0.5 : 1,
        y: 0,
        scale: isDragging ? 1.02 : 1,
      }}
      exit={{ opacity: 0, x: -16 }}
      transition={{
        duration: 0.18,
        layout: { type: 'spring', stiffness: 500, damping: 35 },
      }}
      className={`group task-item rounded-xl relative ${isDragging ? 'z-50' : ''}`}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        background: bgColor,
        borderStyle: 'solid',
        borderTopWidth: 1,
        borderRightWidth: 1,
        borderBottomWidth: 1,
        borderLeftWidth: 2,
        borderTopColor: isSelected ? 'var(--accent-g)' : isActive ? 'rgba(255,77,77,0.15)' : 'transparent',
        borderRightColor: isSelected ? 'var(--accent-g)' : isActive ? 'rgba(255,77,77,0.15)' : 'transparent',
        borderBottomColor: isSelected ? 'var(--accent-g)' : isActive ? 'rgba(255,77,77,0.15)' : 'transparent',
        borderLeftColor: borderLeftColor,
        boxShadow: isDragging
          ? '0 8px 24px rgba(0,0,0,0.4)'
          : isActive && !isSelected
          ? '0 0 20px rgba(255,77,77,0.06)'
          : 'none',
      }}
      onContextMenu={onContextMenu}
      onDoubleClick={() => !task.completed && setIsEditing(true)}
    >
      {/* Active task breathing glow overlay */}
      {isActive && !task.completed && (
        <motion.div
          className="absolute inset-0 rounded-xl pointer-events-none"
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            boxShadow: '0 0 16px -2px var(--accent), inset 0 0 0 1px rgba(255,255,255,0.03)',
          }}
        />
      )}

      {/* Row 1: Main */}
      <div
        className="flex items-center gap-2 px-3 py-2 transition-all duration-150 rounded-xl"
        style={{ position: 'relative' }}
        onMouseEnter={(e) => {
          if (!isSelected && !isActive) {
            const card = e.currentTarget.parentElement as HTMLDivElement;
            card.style.background = 'rgba(255,255,255,0.03)';
            card.style.transform = 'translateY(-1px)';
            card.style.boxShadow = '0 2px 8px rgba(0,0,0,0.25)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isSelected) {
            const card = e.currentTarget.parentElement as HTMLDivElement;
            card.style.background = bgColor;
            card.style.transform = '';
            card.style.boxShadow = isActive ? '0 0 20px rgba(255,77,77,0.06)' : 'none';
          }
        }}
      >
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="shrink-0 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-60 transition-opacity duration-150"
          style={{ color: 'var(--t3)' }}
        >
          <GripVertical size={12} />
        </div>

        {/* Checkbox */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          className="w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-200 group-hover:border-opacity-100"
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
            onClick={(e) => {
              e.stopPropagation();
              if (blockers.length > 0) {
                const blockerNames = blockers.map((b) => `"${b.title}"`).join(', ');
                const proceed = window.confirm(
                  `This task is blocked by ${blockerNames}. Start focus anyway?`
                );
                if (!proceed) return;
              }
              onPlay?.();
            }}
          />
        )}

        {/* Priority flag */}
        {task.priority !== 'p4' && (
          <span className="shrink-0" style={{ color: flagColor }}>
            <Flag size={12} fill={flagColor} strokeWidth={2} />
          </span>
        )}

        {/* Status dot — only when in_progress or blocked, since todo/done are
            already conveyed by the checkbox state */}
        {!task.completed && (task.status === 'in_progress' || task.status === 'blocked') && (
          <span
            className="shrink-0 flex items-center"
            title={TASK_STATUS_META[task.status].label}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: TASK_STATUS_META[task.status].dot,
                boxShadow: task.status === 'in_progress'
                  ? `0 0 6px ${TASK_STATUS_META[task.status].dot}`
                  : 'none',
              }}
            />
          </span>
        )}

        {/* Stale indicator — soft, no shame */}
        {stale && (
          <span
            className="shrink-0 flex items-center opacity-50"
            title="No activity in 14 days"
            style={{ color: 'var(--t3)' }}
          >
            <Clock size={11} />
          </span>
        )}

        {/* Blocked-by indicator */}
        {blockers.length > 0 && (
          <span
            className="shrink-0 flex items-center gap-0.5"
            style={{ color: 'var(--t3)' }}
            title={blockers.length === 1 ? `Blocked by: ${blockers[0].title}` : `Blocked by ${blockers.length} tasks`}
          >
            <Lock size={11} />
            <span className="text-[10px]">
              {blockers.length === 1 ? 'Blocked' : `Blocked·${blockers.length}`}
            </span>
          </span>
        )}

        {/* Title + notes icon */}
        <div className="flex-1 min-w-0 flex items-center gap-1.5">
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
            <>
              <span
                className="text-[13px] font-medium truncate leading-snug"
                style={{
                  color: task.completed ? 'var(--t3)' : overdue ? '#ff6b5a' : 'var(--t)',
                  textDecoration: task.completed ? 'line-through' : 'none',
                  opacity: task.completed ? 0.5 : 1,
                }}
                title={task.title}
              >
                {task.title}
              </span>
              {task.notes && !task.completed && (
                <FileText size={11} className="shrink-0 opacity-40" style={{ color: 'var(--t3)' }} />
              )}
            </>
          )}
        </div>

        {/* Right — Pomodoro indicator */}
        <div className="shrink-0 flex items-center gap-2">
          {!task.completed && (
            <>
              <PomodoroDots completed={task.pomodoroCompleted} estimate={task.pomodoroEstimate} />
              <div
                className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] tabular-nums font-semibold"
                style={{
                  color: task.pomodoroCompleted > 0 ? 'var(--accent)' : 'var(--t3)',
                }}
              >
                <Coffee size={10} strokeWidth={2} />
                {task.pomodoroCompleted}/{task.pomodoroEstimate}
              </div>
            </>
          )}
          {task.completed && (
            <div className="flex items-center gap-1 text-[10px] tabular-nums" style={{ color: 'var(--t3)', opacity: 0.5 }}>
              <Coffee size={9} strokeWidth={2} />
              {task.pomodoroCompleted}/{task.pomodoroEstimate}
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Meta chips — progressive disclosure */}
      {hasMetaRow && (
        <div
          className="flex items-center gap-1.5 px-3 pb-2 pl-[54px] flex-wrap transition-all duration-150"
          style={{
            maxHeight: alwaysVisibleMeta || hasHiddenMeta ? undefined : 0,
            opacity: 1,
          }}
        >
          {/* Always visible: overdue/today dates and subtask progress */}
          {displayDate && dueDateStyle && (overdue || task.dueDate === 'today') && (
            <span
              className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-[2px] rounded-md"
              style={{ background: dueDateStyle.bg, color: dueDateStyle.color, border: `1px solid ${dueDateStyle.border}` }}
            >
              <Calendar size={9} strokeWidth={2} />
              {displayDate}
            </span>
          )}

          {task.subtasks.length > 0 && (
            <span
              className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-[2px] rounded-md"
              style={{
                background: task.subtasks.every((s) => s.completed)
                  ? 'rgba(34,211,165,0.1)' : 'rgba(255,255,255,0.04)',
                color: task.subtasks.every((s) => s.completed)
                  ? 'var(--grn)' : 'var(--t3)',
                border: `1px solid ${task.subtasks.every((s) => s.completed) ? 'rgba(34,211,165,0.2)' : 'var(--brd)'}`,
              }}
            >
              <ListChecks size={9} strokeWidth={2} />
              {completedSubtasks}/{task.subtasks.length}
            </span>
          )}

          {/* Hover-revealed chips */}
          <div className="contents opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            {/* Project chip */}
            {projectName && projectColor && (
              <span
                className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-[2px] rounded-md"
                style={{ background: projectColor + '18', color: projectColor, border: `1px solid ${projectColor}30` }}
              >
                <FolderOpen size={9} strokeWidth={2} />
                {projectName}
              </span>
            )}

            {/* Non-urgent date chip */}
            {displayDate && dueDateStyle && !overdue && task.dueDate !== 'today' && (
              <span
                className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-[2px] rounded-md"
                style={{ background: dueDateStyle.bg, color: dueDateStyle.color, border: `1px solid ${dueDateStyle.border}` }}
              >
                <Calendar size={9} strokeWidth={2} />
                {displayDate}
              </span>
            )}

            {/* Repeat chip */}
            {hasRepeat && (
              <span
                className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-[2px] rounded-md"
                style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--t3)', border: '1px solid var(--brd)' }}
              >
                <RefreshCw size={8} strokeWidth={2} />
                {task.repeatType}
              </span>
            )}

            {/* Tags */}
            {task.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-[2px] rounded-md"
                style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--t3)', border: '1px solid var(--brd)' }}
              >
                <Hash size={8} strokeWidth={2.5} />
                {tag}
              </span>
            ))}
            {task.tags.length > 3 && (
              <span className="text-[10px]" style={{ color: 'var(--t3)' }}>+{task.tags.length - 3}</span>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
};
