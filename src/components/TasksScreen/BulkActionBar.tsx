import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, Trash2, Activity, FolderOpen, Target,
  Flag, X,
} from 'lucide-react';
import {
  Project, Task, TaskStatus, Priority,
  TASK_STATUS_META,
} from '../../types';
import { useTaskStore } from '../../store/taskStore';

interface Props {
  selectedIds: Set<string>;
  tasks: Task[];
  projects: Project[];
  onClear: () => void;
}

type Popover = 'status' | 'project' | 'milestone' | 'priority' | null;

const PRIORITY_OPTIONS: { value: Priority; color: string }[] = [
  { value: 'p1', color: 'var(--accent)' },
  { value: 'p2', color: 'var(--amb)' },
  { value: 'p3', color: 'var(--blu)' },
  { value: 'p4', color: 'var(--t3)' },
];

export const BulkActionBar: React.FC<Props> = ({ selectedIds, tasks, projects, onClear }) => {
  const { updateTask, deleteTask, toggleTask } = useTaskStore();
  const [popover, setPopover] = useState<Popover>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const count = selectedIds.size;
  const selectedTasks = tasks.filter((t) => selectedIds.has(t.id));

  // For milestone popover — only meaningful when all selected tasks share a project.
  const sharedProjectId = (() => {
    const ids = new Set(selectedTasks.map((t) => t.projectId ?? null));
    return ids.size === 1 ? selectedTasks[0]?.projectId : undefined;
  })();
  const sharedProject = sharedProjectId ? projects.find((p) => p.id === sharedProjectId) : undefined;

  const applyStatus = async (status: TaskStatus) => {
    for (const id of selectedIds) {
      await updateTask(id, { status });
    }
    setPopover(null);
  };

  const applyProject = async (projectId: string | undefined) => {
    for (const id of selectedIds) {
      await updateTask(id, { projectId, milestoneId: undefined });
    }
    setPopover(null);
  };

  const applyMilestone = async (milestoneId: string | undefined) => {
    for (const id of selectedIds) {
      await updateTask(id, { milestoneId });
    }
    setPopover(null);
  };

  const applyPriority = async (priority: Priority) => {
    for (const id of selectedIds) {
      await updateTask(id, { priority });
    }
    setPopover(null);
  };

  const completeAll = async () => {
    for (const id of selectedIds) {
      const t = tasks.find((tt) => tt.id === id);
      if (t && !t.completed) await toggleTask(id);
    }
    onClear();
  };

  const deleteAll = async () => {
    for (const id of selectedIds) {
      await deleteTask(id);
    }
    onClear();
  };

  if (count === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
      className="absolute left-1/2 -translate-x-1/2 bottom-14 z-40 flex items-center gap-1 px-2 py-1.5 rounded-2xl"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--brd2)',
        boxShadow: '0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
        maxWidth: 720,
      }}
    >
      <span className="px-2.5 text-[12px] font-semibold tabular-nums" style={{ color: 'var(--t)' }}>
        {count} <span className="font-normal" style={{ color: 'var(--t3)' }}>selected</span>
      </span>
      <div className="w-px h-4" style={{ background: 'var(--brd)' }} />

      {/* Complete */}
      <button
        onClick={completeAll}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11.5px] font-medium transition-colors"
        style={{ color: 'var(--grn)' }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(34,211,165,0.08)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        title="Mark all as done"
      >
        <CheckCircle2 size={12} />
        Complete
      </button>

      {/* Status */}
      <div className="relative">
        <button
          onClick={() => setPopover(popover === 'status' ? null : 'status')}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11.5px] font-medium transition-colors"
          style={{ color: popover === 'status' ? 'var(--t)' : 'var(--t2)', background: popover === 'status' ? 'var(--card-h)' : 'transparent' }}
          onMouseEnter={(e) => { if (popover !== 'status') e.currentTarget.style.background = 'var(--card-h)'; }}
          onMouseLeave={(e) => { if (popover !== 'status') e.currentTarget.style.background = 'transparent'; }}
        >
          <Activity size={12} />
          Status
        </button>
        <AnimatePresence>
          {popover === 'status' && (
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.96 }}
              transition={{ duration: 0.12 }}
              className="absolute bottom-full mb-2 left-0 rounded-xl overflow-hidden z-50"
              style={{ background: 'var(--card)', border: '1px solid var(--brd2)', boxShadow: '0 12px 32px rgba(0,0,0,0.5)', minWidth: 160 }}
            >
              {(['todo', 'in_progress', 'blocked', 'done'] as TaskStatus[]).map((s) => {
                const meta = TASK_STATUS_META[s];
                return (
                  <button
                    key={s}
                    onClick={() => applyStatus(s)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-left transition-colors"
                    style={{ color: meta.color }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--card-h)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.dot }} />
                    {meta.label}
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Priority */}
      <div className="relative">
        <button
          onClick={() => setPopover(popover === 'priority' ? null : 'priority')}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11.5px] font-medium transition-colors"
          style={{ color: popover === 'priority' ? 'var(--t)' : 'var(--t2)', background: popover === 'priority' ? 'var(--card-h)' : 'transparent' }}
          onMouseEnter={(e) => { if (popover !== 'priority') e.currentTarget.style.background = 'var(--card-h)'; }}
          onMouseLeave={(e) => { if (popover !== 'priority') e.currentTarget.style.background = 'transparent'; }}
        >
          <Flag size={12} />
          Priority
        </button>
        <AnimatePresence>
          {popover === 'priority' && (
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.96 }}
              transition={{ duration: 0.12 }}
              className="absolute bottom-full mb-2 left-0 rounded-xl overflow-hidden z-50"
              style={{ background: 'var(--card)', border: '1px solid var(--brd2)', boxShadow: '0 12px 32px rgba(0,0,0,0.5)', minWidth: 120 }}
            >
              {PRIORITY_OPTIONS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => applyPriority(p.value)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-left transition-colors"
                  style={{ color: p.color }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--card-h)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <Flag size={11} fill={p.color} />
                  {p.value.toUpperCase()}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Project */}
      <div className="relative">
        <button
          onClick={() => setPopover(popover === 'project' ? null : 'project')}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11.5px] font-medium transition-colors"
          style={{ color: popover === 'project' ? 'var(--t)' : 'var(--t2)', background: popover === 'project' ? 'var(--card-h)' : 'transparent' }}
          onMouseEnter={(e) => { if (popover !== 'project') e.currentTarget.style.background = 'var(--card-h)'; }}
          onMouseLeave={(e) => { if (popover !== 'project') e.currentTarget.style.background = 'transparent'; }}
        >
          <FolderOpen size={12} />
          Project
        </button>
        <AnimatePresence>
          {popover === 'project' && (
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.96 }}
              transition={{ duration: 0.12 }}
              className="absolute bottom-full mb-2 left-0 rounded-xl overflow-hidden z-50 max-h-64 overflow-y-auto"
              style={{ background: 'var(--card)', border: '1px solid var(--brd2)', boxShadow: '0 12px 32px rgba(0,0,0,0.5)', minWidth: 200 }}
            >
              <button
                onClick={() => applyProject(undefined)}
                className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-left transition-colors"
                style={{ color: 'var(--t3)' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--card-h)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <span className="w-2 h-2 rounded-full" style={{ background: 'var(--brd2)' }} />
                None
              </button>
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => applyProject(p.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-left transition-colors"
                  style={{ color: 'var(--t2)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--card-h)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
                  <span className="truncate">{p.name}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Milestone — only when shared project */}
      {sharedProject && sharedProject.milestones.length > 0 && (
        <div className="relative">
          <button
            onClick={() => setPopover(popover === 'milestone' ? null : 'milestone')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11.5px] font-medium transition-colors"
            style={{ color: popover === 'milestone' ? 'var(--t)' : 'var(--t2)', background: popover === 'milestone' ? 'var(--card-h)' : 'transparent' }}
            onMouseEnter={(e) => { if (popover !== 'milestone') e.currentTarget.style.background = 'var(--card-h)'; }}
            onMouseLeave={(e) => { if (popover !== 'milestone') e.currentTarget.style.background = 'transparent'; }}
          >
            <Target size={12} />
            Milestone
          </button>
          <AnimatePresence>
            {popover === 'milestone' && (
              <motion.div
                initial={{ opacity: 0, y: 4, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.96 }}
                transition={{ duration: 0.12 }}
                className="absolute bottom-full mb-2 left-0 rounded-xl overflow-hidden z-50 max-h-64 overflow-y-auto"
                style={{ background: 'var(--card)', border: '1px solid var(--brd2)', boxShadow: '0 12px 32px rgba(0,0,0,0.5)', minWidth: 200 }}
              >
                <button
                  onClick={() => applyMilestone(undefined)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-left"
                  style={{ color: 'var(--t3)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--card-h)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  None
                </button>
                {sharedProject.milestones.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => applyMilestone(m.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-left"
                    style={{ color: 'var(--t2)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--card-h)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: m.completed ? 'var(--grn)' : sharedProject.color }} />
                    <span className="truncate">{m.title}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Delete with inline confirm */}
      <button
        onClick={() => {
          if (confirmDelete) deleteAll();
          else { setConfirmDelete(true); setTimeout(() => setConfirmDelete(false), 3000); }
        }}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11.5px] font-medium transition-colors"
        style={{ color: 'var(--accent)', background: confirmDelete ? 'rgba(255,77,77,0.12)' : 'transparent' }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,77,77,0.08)')}
        onMouseLeave={(e) => { if (!confirmDelete) e.currentTarget.style.background = 'transparent'; }}
      >
        <Trash2 size={12} />
        {confirmDelete ? `Delete ${count}?` : 'Delete'}
      </button>

      <div className="w-px h-4" style={{ background: 'var(--brd)' }} />

      <button
        onClick={onClear}
        className="flex items-center gap-1 px-2 py-1 rounded-md text-[10.5px] transition-colors"
        style={{ color: 'var(--t3)' }}
        title="Clear selection (Esc)"
      >
        <X size={11} />
        Esc
      </button>
    </motion.div>
  );
};
