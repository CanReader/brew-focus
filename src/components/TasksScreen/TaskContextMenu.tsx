import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Trash2, ChevronRight, Minus, Plus } from 'lucide-react';
import { Task, Project, Priority, DueDate } from '../../types';

interface TaskContextMenuProps {
  task: Task;
  position: { x: number; y: number };
  projects: Project[];
  onClose: () => void;
  onUpdate: (partial: Partial<Task>) => void;
  onDelete: () => void;
}

const PRIORITIES: { value: Priority; label: string; color: string }[] = [
  { value: 'p4', label: 'None', color: '#5e5c58' },
  { value: 'p3', label: 'P3', color: '#5a9cf5' },
  { value: 'p2', label: 'P2', color: '#e8a83e' },
  { value: 'p1', label: 'P1', color: '#e8453c' },
];

export const TaskContextMenu: React.FC<TaskContextMenuProps> = ({
  task,
  position,
  projects,
  onClose,
  onUpdate,
  onDelete,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    // Small delay so the triggering right-click doesn't immediately close
    setTimeout(() => {
      document.addEventListener('mousedown', handle);
      document.addEventListener('keydown', handleKey);
    }, 50);
    return () => {
      document.removeEventListener('mousedown', handle);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  // Clamp position so menu doesn't go off screen
  const menuWidth = 240;
  const menuHeight = 340;
  const x = Math.min(position.x, window.innerWidth - menuWidth - 8);
  const y = Math.min(position.y, window.innerHeight - menuHeight - 8);

  const workDur = task.customWorkDuration;
  const shortDur = task.customShortBreakDuration;

  const menu = (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.95, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.12, ease: 'easeOut' }}
      className="fixed z-[999] rounded-xl overflow-hidden select-none"
      style={{
        left: x,
        top: y,
        width: menuWidth,
        background: 'var(--card)',
        border: '1px solid var(--brd2)',
        boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
      }}
    >
      {/* Estimated Pomodoros */}
      <div className="px-3 py-2.5 border-b" style={{ borderColor: 'var(--brd)' }}>
        <div className="text-[11px] font-medium mb-2" style={{ color: 'var(--t3)' }}>
          ESTIMATED POMODOROS
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (task.pomodoroEstimate > 1) onUpdate({ pomodoroEstimate: task.pomodoroEstimate - 1 });
            }}
            className="w-6 h-6 flex items-center justify-center rounded-lg transition-colors"
            style={{ background: 'var(--brd)', color: 'var(--t2)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--brd2)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--brd)')}
          >
            <Minus size={11} />
          </button>
          <span
            className="flex-1 text-center text-[18px] font-light tabular-nums"
            style={{ color: 'var(--t)' }}
          >
            {task.pomodoroEstimate}
          </span>
          <button
            onClick={() => onUpdate({ pomodoroEstimate: task.pomodoroEstimate + 1 })}
            className="w-6 h-6 flex items-center justify-center rounded-lg transition-colors"
            style={{ background: 'var(--brd)', color: 'var(--t2)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--brd2)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--brd)')}
          >
            <Plus size={11} />
          </button>
        </div>
      </div>

      {/* Custom Timer */}
      <div className="px-3 py-2.5 border-b" style={{ borderColor: 'var(--brd)' }}>
        <div className="text-[11px] font-medium mb-2" style={{ color: 'var(--t3)' }}>
          CUSTOM TIMER (MIN)
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <div className="text-[10px] mb-1" style={{ color: 'var(--t3)' }}>Work</div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onUpdate({ customWorkDuration: Math.max(1, (workDur ?? 25) - 1) })}
                className="w-5 h-5 flex items-center justify-center rounded"
                style={{ background: 'var(--brd)', color: 'var(--t3)' }}
              ><Minus size={9} /></button>
              <span className="text-[13px] w-7 text-center" style={{ color: 'var(--t)' }}>
                {workDur ?? '—'}
              </span>
              <button
                onClick={() => onUpdate({ customWorkDuration: (workDur ?? 25) + 1 })}
                className="w-5 h-5 flex items-center justify-center rounded"
                style={{ background: 'var(--brd)', color: 'var(--t3)' }}
              ><Plus size={9} /></button>
            </div>
          </div>
          <div className="flex-1">
            <div className="text-[10px] mb-1" style={{ color: 'var(--t3)' }}>Break</div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onUpdate({ customShortBreakDuration: Math.max(1, (shortDur ?? 5) - 1) })}
                className="w-5 h-5 flex items-center justify-center rounded"
                style={{ background: 'var(--brd)', color: 'var(--t3)' }}
              ><Minus size={9} /></button>
              <span className="text-[13px] w-7 text-center" style={{ color: 'var(--t)' }}>
                {shortDur ?? '—'}
              </span>
              <button
                onClick={() => onUpdate({ customShortBreakDuration: (shortDur ?? 5) + 1 })}
                className="w-5 h-5 flex items-center justify-center rounded"
                style={{ background: 'var(--brd)', color: 'var(--t3)' }}
              ><Plus size={9} /></button>
            </div>
          </div>
          {(workDur || shortDur) && (
            <button
              onClick={() => onUpdate({ customWorkDuration: undefined, customShortBreakDuration: undefined })}
              className="text-[10px] self-end mb-1"
              style={{ color: 'var(--t3)' }}
            >reset</button>
          )}
        </div>
      </div>

      {/* Due date options */}
      <div className="py-1 border-b" style={{ borderColor: 'var(--brd)' }}>
        {(['today', 'tomorrow', 'someday'] as DueDate[]).map((due) => (
          <MenuItem
            key={due}
            label={due === 'today' ? 'Due Today' : due === 'tomorrow' ? 'Due Tomorrow' : 'Someday'}
            active={task.dueDate === due}
            onClick={() => onUpdate({ dueDate: task.dueDate === due ? null : due })}
          />
        ))}
      </div>

      {/* Priority */}
      <div className="px-3 py-2.5 border-b" style={{ borderColor: 'var(--brd)' }}>
        <div className="text-[11px] font-medium mb-2" style={{ color: 'var(--t3)' }}>PRIORITY</div>
        <div className="flex items-center gap-2">
          {PRIORITIES.map((p) => (
            <button
              key={p.value}
              onClick={() => onUpdate({ priority: p.value })}
              title={p.label}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
              style={{
                background: task.priority === p.value ? p.color + '30' : 'var(--brd)',
                border: `2px solid ${task.priority === p.value ? p.color : 'transparent'}`,
              }}
            >
              <div className="w-2.5 h-2.5 rounded-sm" style={{ background: p.color }} />
            </button>
          ))}
        </div>
      </div>

      {/* Move to Project */}
      {projects.length > 0 && (
        <div className="py-1 border-b" style={{ borderColor: 'var(--brd)' }}>
          <div
            className="flex items-center justify-between px-3 py-2"
            style={{ color: 'var(--t2)' }}
          >
            <span className="text-[13px]">Move to Project</span>
            <ChevronRight size={13} style={{ color: 'var(--t3)' }} />
          </div>
          {projects.map((proj) => (
            <button
              key={proj.id}
              onClick={() => onUpdate({ projectId: task.projectId === proj.id ? undefined : proj.id })}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 transition-colors text-left"
              style={{ background: task.projectId === proj.id ? 'var(--card-h)' : 'transparent' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--card-h)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = task.projectId === proj.id ? 'var(--card-h)' : 'transparent')}
            >
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: proj.color }} />
              <span className="text-[13px]" style={{ color: 'var(--t2)' }}>{proj.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Delete */}
      <div className="py-1">
        <button
          onClick={() => { onDelete(); onClose(); }}
          className="w-full flex items-center gap-2.5 px-3 py-2 transition-colors text-left"
          style={{ color: '#e8453c' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(232,69,60,0.1)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <Trash2 size={13} />
          <span className="text-[13px]">Delete Task</span>
        </button>
      </div>
    </motion.div>
  );

  return createPortal(menu, document.body);
};

const MenuItem: React.FC<{
  label: string;
  active?: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
}> = ({ label, active, onClick, icon }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center gap-2.5 px-3 py-2 transition-colors text-left"
    style={{
      background: active ? 'var(--card-h)' : 'transparent',
      color: active ? 'var(--t)' : 'var(--t2)',
    }}
    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--card-h)')}
    onMouseLeave={(e) => (e.currentTarget.style.background = active ? 'var(--card-h)' : 'transparent')}
  >
    {icon}
    <span className="text-[13px]">{label}</span>
    {active && (
      <div
        className="ml-auto w-1.5 h-1.5 rounded-full"
        style={{ background: 'var(--accent)' }}
      />
    )}
  </button>
);
