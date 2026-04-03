import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable';
import { Plus, ChevronDown, ChevronRight, Play, Pause, SkipForward, FolderOpen, Search, SortAsc, X, Target } from 'lucide-react';
import { useTaskStore } from '../../store/taskStore';
import { useTimerStore } from '../../store/timerStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useTimer } from '../../hooks/useTimer';
import { StatsBar } from './StatsBar';
import { TaskItem } from './TaskItem';
import { Sidebar, SidebarView } from './Sidebar';
import { TaskContextMenu } from './TaskContextMenu';
import { TaskDetailPanel } from './TaskDetailPanel';
import { WeeklyCalendar } from './WeeklyCalendar';
import { CommandPalette } from './CommandPalette';
import { Task, DueDate, Project, resolveDueDateToTs } from '../../types';

interface ContextMenuState {
  taskId: string;
  x: number;
  y: number;
}

function getViewTitle(view: SidebarView, projects: { id: string; name: string }[]): string {
  if (view.startsWith('tag:')) return `#${view.slice(4)}`;
  switch (view) {
    case 'inbox': return 'Inbox';
    case 'today': return 'Today';
    case 'tomorrow': return 'Tomorrow';
    case 'week': return 'This Week';
    case 'planned': return 'Planned';
    case 'someday': return 'Someday';
    case 'completed': return 'Completed';
    case 'all': return 'Tasks';
    default: return projects.find((p) => p.id === view)?.name ?? 'Tasks';
  }
}

function formatEstimate(totalMinutes: number): string {
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

type SortBy = 'manual' | 'priority' | 'dueDate' | 'created' | 'sessions';
const PRIORITY_ORDER: Record<string, number> = { p1: 0, p2: 1, p3: 2, p4: 3 };

function filterTasks(tasks: Task[], view: SidebarView): Task[] {
  if (view.startsWith('tag:')) {
    const tag = view.slice(4);
    return tasks.filter((t) => !t.completed && t.tags.includes(tag));
  }
  switch (view) {
    case 'inbox': return tasks.filter((t) => !t.completed && !t.dueDate && !t.projectId);
    case 'today': {
      const now = new Date(); now.setHours(0, 0, 0, 0);
      return tasks.filter((t) => {
        if (t.completed) return false;
        if (t.dueDate === 'today') return true;
        const ts = resolveDueDateToTs(t.dueDate);
        return ts !== null && ts < now.getTime();
      });
    }
    case 'tomorrow': return tasks.filter((t) => !t.completed && t.dueDate === 'tomorrow');
    case 'week': {
      const now = new Date();
      const dow = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
      monday.setHours(0, 0, 0, 0);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);
      return tasks.filter((t) => {
        if (t.completed || !t.dueDate || t.dueDate === 'someday') return false;
        const ts = resolveDueDateToTs(t.dueDate);
        return ts !== null && ts <= sunday.getTime();
      });
    }
    case 'planned': return tasks.filter((t) => !t.completed && t.dueDate && t.dueDate !== 'someday');
    case 'someday': return tasks.filter((t) => !t.completed && t.dueDate === 'someday');
    case 'completed': return tasks.filter((t) => t.completed);
    case 'all': return tasks.filter((t) => !t.completed);
    default: return tasks.filter((t) => !t.completed && t.projectId === view);
  }
}

function sortTasks(tasks: Task[], sortBy: SortBy): Task[] {
  if (sortBy === 'manual') return tasks;
  return [...tasks].sort((a, b) => {
    switch (sortBy) {
      case 'priority': return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      case 'dueDate': {
        const aTs = resolveDueDateToTs(a.dueDate) ?? Infinity;
        const bTs = resolveDueDateToTs(b.dueDate) ?? Infinity;
        return aTs - bTs;
      }
      case 'created': return b.createdAt - a.createdAt;
      case 'sessions': return b.pomodoroCompleted - a.pomodoroCompleted;
      default: return 0;
    }
  });
}

function searchTasks(tasks: Task[], query: string): Task[] {
  if (!query.trim()) return tasks;
  const q = query.toLowerCase();
  return tasks.filter((t) =>
    t.title.toLowerCase().includes(q) ||
    t.notes.toLowerCase().includes(q) ||
    t.tags.some((tag) => tag.toLowerCase().includes(q))
  );
}

function getDueDateForView(view: SidebarView): DueDate {
  if (view === 'today') return 'today';
  if (view === 'tomorrow') return 'tomorrow';
  if (view === 'someday') return 'someday';
  return null;
}

// Tiny coffee cup SVG for the add-task bar
const QuickCup: React.FC<{ filled: boolean }> = ({ filled }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M2 5h10v.8H2V5z" fill={filled ? 'var(--accent)' : 'var(--brd2)'} opacity="0.9"/>
    <path d="M2 6.5h9c0 2.5-1.2 5-4.5 5S2 9 2 6.5z" fill={filled ? 'var(--accent)' : 'var(--brd2)'} opacity="0.9"/>
    <path d="M11 7.5h1a1.5 1.5 0 000-3h-1" stroke={filled ? 'var(--accent)' : 'var(--brd2)'} strokeWidth="1.1" strokeLinecap="round"/>
    <path d="M3.5 12c.8.4 6.4.4 7.2 0" stroke={filled ? 'var(--accent)' : 'var(--brd2)'} strokeWidth="1" strokeLinecap="round"/>
  </svg>
);

const STATUS_OPTIONS: { value: import('../../types').ProjectStatus; label: string; color: string }[] = [
  { value: 'active', label: 'Active', color: 'var(--grn)' },
  { value: 'on_hold', label: 'On Hold', color: 'var(--amb)' },
  { value: 'completed', label: 'Done', color: 'var(--t3)' },
];

const ProjectDetailCard: React.FC<{
  project: Project;
  tasks: Task[];
  onUpdate: (partial: Partial<Project>) => void;
}> = ({ project, tasks, onUpdate }) => {
  const [editingDesc, setEditingDesc] = useState(false);
  const [descValue, setDescValue] = useState(project.description || '');
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [newMilestoneDate, setNewMilestoneDate] = useState('');
  const { addMilestone, toggleMilestone, deleteMilestone } = useTaskStore();

  React.useEffect(() => {
    setDescValue(project.description || '');
  }, [project.id]);

  const projectTasks = tasks.filter((t) => t.projectId === project.id);
  const completed = projectTasks.filter((t) => t.completed).length;
  const total = projectTasks.length;
  const progress = total > 0 ? completed / total : 0;

  const msToDateInput = (ms?: number) => {
    if (!ms) return '';
    const d = new Date(ms);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const targetOverdue = project.targetDate && project.targetDate < Date.now();

  return (
    <div className="rounded-xl p-3 mb-3" style={{ background: 'var(--card)', border: '1px solid var(--brd)' }}>
      {/* Status + target date row */}
      <div className="flex items-center gap-2 mb-2">
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s.value}
            onClick={() => onUpdate({ status: s.value })}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] transition-all"
            style={{
              background: project.status === s.value ? s.color + '20' : 'transparent',
              color: project.status === s.value ? s.color : 'var(--t3)',
              border: `1px solid ${project.status === s.value ? s.color + '50' : 'var(--brd)'}`,
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: s.color }} />
            {s.label}
          </button>
        ))}
        <div className="flex-1" />
        {/* Target date */}
        <div className="flex items-center gap-1">
          <Target size={10} style={{ color: targetOverdue ? '#e8453c' : 'var(--t3)' }} />
          <input
            type="date"
            value={msToDateInput(project.targetDate)}
            onChange={(e) => {
              const val = e.target.value;
              onUpdate({ targetDate: val ? new Date(val).getTime() : undefined });
            }}
            className="text-[11px] bg-transparent focus:outline-none"
            style={{ color: targetOverdue ? '#e8453c' : 'var(--t3)', colorScheme: 'dark', width: 90 }}
          />
        </div>
      </div>

      {/* Progress */}
      {total > 0 && (
        <div className="mb-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px]" style={{ color: 'var(--t3)' }}>
              {completed}/{total} tasks
            </span>
            <span className="text-[11px] tabular-nums" style={{ color: project.color }}>
              {Math.round(progress * 100)}%
            </span>
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--brd2)' }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${progress * 100}%`, background: project.color }}
            />
          </div>
        </div>
      )}

      {/* Description */}
      {editingDesc ? (
        <textarea
          autoFocus
          value={descValue}
          onChange={(e) => setDescValue(e.target.value)}
          onBlur={() => { onUpdate({ description: descValue }); setEditingDesc(false); }}
          onKeyDown={(e) => { if (e.key === 'Escape') { setDescValue(project.description || ''); setEditingDesc(false); } }}
          rows={2}
          placeholder="Project description…"
          className="w-full text-[12px] bg-transparent resize-none focus:outline-none leading-relaxed"
          style={{ color: 'var(--t2)' }}
        />
      ) : (
        <p
          className="text-[12px] cursor-text"
          style={{ color: project.description ? 'var(--t2)' : 'var(--t3)' }}
          onClick={() => setEditingDesc(true)}
        >
          {project.description || 'Add description…'}
        </p>
      )}

      {/* Milestones */}
      <div className="mt-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--t3)' }}>
            Milestones
          </span>
          {project.milestones.length > 0 && (
            <span className="text-[11px]" style={{ color: 'var(--t3)' }}>
              {project.milestones.filter((m) => m.completed).length}/{project.milestones.length}
            </span>
          )}
        </div>

        {/* Milestone list - max height with scroll */}
        <div className="flex flex-col gap-0.5 max-h-[120px] overflow-y-auto">
          {project.milestones.map((m) => (
            <div key={m.id} className="flex items-center gap-2 py-1 group/ms">
              <button
                onClick={() => toggleMilestone(project.id, m.id)}
                className="w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 transition-all"
                style={{
                  borderColor: m.completed ? 'var(--grn)' : 'var(--brd2)',
                  background: m.completed ? 'var(--grn)' : 'transparent',
                }}
              >
                {m.completed && (
                  <svg width="7" height="6" viewBox="0 0 7 6">
                    <path d="M1 3L2.5 4.5L6 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
              <span
                className="flex-1 text-[12px] min-w-0 truncate"
                style={{
                  color: m.completed ? 'var(--t3)' : 'var(--t2)',
                  textDecoration: m.completed ? 'line-through' : 'none',
                }}
              >
                {m.title}
              </span>
              {m.targetDate && (
                <span className="text-[10px] shrink-0" style={{ color: 'var(--t3)' }}>
                  {new Date(m.targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              )}
              <button
                onClick={() => deleteMilestone(project.id, m.id)}
                className="opacity-0 group-hover/ms:opacity-100 transition-opacity shrink-0"
                style={{ color: 'var(--t3)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#e8453c')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--t3)')}
              >
                <svg width="9" height="9" viewBox="0 0 9 9">
                  <path d="M1 1l7 7M8 1L1 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        {/* Add milestone input */}
        <div className="flex items-center gap-1.5 mt-1.5">
          <input
            value={newMilestoneTitle}
            onChange={(e) => setNewMilestoneTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newMilestoneTitle.trim()) {
                addMilestone(
                  project.id,
                  newMilestoneTitle.trim(),
                  newMilestoneDate ? new Date(newMilestoneDate).getTime() : undefined
                );
                setNewMilestoneTitle('');
                setNewMilestoneDate('');
              }
              if (e.key === 'Escape') {
                setNewMilestoneTitle('');
                setNewMilestoneDate('');
              }
            }}
            placeholder="+ Add milestone…"
            className="flex-1 text-[12px] bg-transparent focus:outline-none"
            style={{ color: 'var(--t3)' }}
          />
          {newMilestoneTitle.trim() && (
            <input
              type="date"
              value={newMilestoneDate}
              onChange={(e) => setNewMilestoneDate(e.target.value)}
              className="text-[11px] bg-transparent focus:outline-none"
              style={{ color: 'var(--t3)', colorScheme: 'dark', width: 100 }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export const TasksScreen: React.FC = () => {
  const [inputValue, setInputValue] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);
  const [sidebarView, setSidebarView] = useState<SidebarView>('all');
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('manual');
  const [showSortMenu, setShowSortMenu] = useState(false);
  // Add task bar state
  const [newTaskPomodoros, setNewTaskPomodoros] = useState(1);
  const [hoverPomodoros, setHoverPomodoros] = useState<number | null>(null);
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [newTaskProjectId, setNewTaskProjectId] = useState<string | undefined>(undefined);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const addTaskInputRef = useRef<HTMLInputElement>(null);

  const {
    tasks, projects, addTask, updateTask, deleteTask, toggleTask,
    reorderTasks, setActiveTask, activeTaskId, updateProject,
  } = useTaskStore();

  const { isRunning, phase, secondsLeft, start, pause, skip, setActiveTask: setTimerActiveTask } = useTimerStore();
  const { settings } = useSettingsStore();
  const { formatTime, effectiveWorkDuration, effectiveShortBreakDuration, effectiveLongBreakDuration } = useTimer();

  const viewTasks = sortTasks(searchTasks(filterTasks(tasks, sidebarView), searchQuery), sortBy);
  const completedTasks = sidebarView !== 'completed' ? tasks.filter((t) => t.completed) : [];

  // Live lookup for context menu and detail panel
  const contextMenuTask = contextMenu ? tasks.find((t) => t.id === contextMenu.taskId) ?? null : null;
  const selectedTask = selectedTaskId ? tasks.find((t) => t.id === selectedTaskId) ?? null : null;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen((p) => !p);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleCreateTask = () => {
    setPaletteOpen(false);
    // Switch to 'all' view so the add-task bar is visible, then focus input after render
    setSidebarView('all');
    setSelectedTaskId(null);
    setTimeout(() => { addTaskInputRef.current?.focus(); }, 50);
  };

  const handleAddTask = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    const projectId = projects.find((p) => p.id === sidebarView)?.id ?? newTaskProjectId;
    const dueDate = getDueDateForView(sidebarView);
    await addTask(trimmed, 'p4', projectId, dueDate, newTaskPomodoros);
    setInputValue('');
    setNewTaskProjectId(undefined);
    setNewTaskPomodoros(1);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = viewTasks.findIndex((t) => t.id === active.id);
    const newIdx = viewTasks.findIndex((t) => t.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const reordered = arrayMove(viewTasks, oldIdx, newIdx);
    const otherTasks = tasks.filter((t) => !viewTasks.find((vt) => vt.id === t.id));
    reorderTasks([...reordered, ...otherTasks]);
  };

  const handleSetActive = (task: Task) => {
    const next = activeTaskId === task.id ? null : task.id;
    setActiveTask(next);
    setTimerActiveTask(next);
  };

  const handlePlayTask = (task: Task) => {
    setActiveTask(task.id);
    setTimerActiveTask(task.id);
    start();
  };

  const handleContextMenu = (e: React.MouseEvent, task: Task) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ taskId: task.id, x: e.clientX, y: e.clientY });
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTaskId((prev) => (prev === task.id ? null : task.id));
  };

  const title = getViewTitle(sidebarView, projects);
  const phaseLabel = phase === 'work' ? 'Focus' : phase === 'shortBreak' ? 'Short Break' : 'Long Break';
  const phaseColor = phase === 'work' ? 'var(--accent)' : phase === 'shortBreak' ? 'var(--grn)' : 'var(--blu)';

  const displayPomodoros = hoverPomodoros ?? newTaskPomodoros;

  // BUG 3 FIX: use per-task work duration for estimate calculation
  const totalEstimateMinutes = viewTasks.reduce((s, t) => {
    const workMin = t.customWorkDuration ?? settings.workDuration;
    return s + t.pomodoroEstimate * workMin;
  }, 0);

  return (
    <div className="flex h-full relative" style={{ background: 'var(--bg)' }}>
      {/* Sidebar */}
      <div className="w-44 shrink-0 h-full">
        <Sidebar activeView={sidebarView} onViewChange={(v) => { setSidebarView(v); setSelectedTaskId(null); }} />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        <StatsBar tasks={tasks} />

        {sidebarView === 'focus-week' ? (
          <WeeklyCalendar />
        ) : (<>

        {/* Header */}
        <div className="px-6 pt-4 pb-2 shrink-0">
          <div className="flex items-end justify-between mb-3">
            <h1 className="font-fraunces text-[26px]" style={{ color: 'var(--t)' }}>{title}</h1>
            {/* Sort button */}
            <div className="relative pb-1">
              <button
                onClick={() => setShowSortMenu((s) => !s)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] transition-colors"
                style={{
                  background: sortBy !== 'manual' ? 'var(--accent-d)' : 'var(--card)',
                  color: sortBy !== 'manual' ? 'var(--accent)' : 'var(--t3)',
                  border: `1px solid ${sortBy !== 'manual' ? 'var(--accent-g)' : 'var(--brd)'}`,
                }}
              >
                <SortAsc size={12} />
                {sortBy !== 'manual' && <span className="capitalize">{sortBy === 'dueDate' ? 'Due' : sortBy}</span>}
              </button>
              <AnimatePresence>
                {showSortMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.95 }}
                    transition={{ duration: 0.1 }}
                    className="absolute right-0 top-full mt-1 rounded-xl border overflow-hidden z-50"
                    style={{ background: 'var(--card)', borderColor: 'var(--brd2)', minWidth: 140, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}
                    onMouseLeave={() => setShowSortMenu(false)}
                  >
                    {([
                      ['manual', 'Manual'],
                      ['priority', 'Priority'],
                      ['dueDate', 'Due Date'],
                      ['created', 'Created'],
                      ['sessions', 'Sessions'],
                    ] as [SortBy, string][]).map(([val, label]) => (
                      <button
                        key={val}
                        onClick={() => { setSortBy(val); setShowSortMenu(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-left transition-colors"
                        style={{
                          color: sortBy === val ? 'var(--accent)' : 'var(--t2)',
                          background: sortBy === val ? 'var(--accent-d)' : 'transparent',
                        }}
                        onMouseEnter={(e) => { if (sortBy !== val) e.currentTarget.style.background = 'var(--card-h)'; }}
                        onMouseLeave={(e) => { if (sortBy !== val) e.currentTarget.style.background = 'transparent'; }}
                      >
                        {sortBy === val && <div className="w-1 h-1 rounded-full" style={{ background: 'var(--accent)' }} />}
                        {label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Project detail card */}
          {!sidebarView.startsWith('tag:') && projects.find((p) => p.id === sidebarView) && (
            <ProjectDetailCard
              project={projects.find((p) => p.id === sidebarView)!}
              tasks={tasks}
              onUpdate={(partial) => updateProject(sidebarView, partial)}
            />
          )}

          {/* Search bar */}
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border mb-1"
            style={{ background: 'var(--card)', borderColor: searchQuery ? 'var(--brd2)' : 'transparent' }}
          >
            <Search size={13} style={{ color: 'var(--t3)', flexShrink: 0 }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks…"
              className="flex-1 text-[12px] bg-transparent focus:outline-none"
              style={{ color: 'var(--t)' }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} style={{ color: 'var(--t3)' }}>
                <X size={11} />
              </button>
            )}
          </div>
        </div>

        {/* Add task bar */}
        <div className="px-6 pb-3 shrink-0">
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl border transition-colors"
            style={{ background: 'var(--card)', borderColor: 'var(--brd)' }}
          >
            {/* Plus button */}
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 cursor-pointer"
              style={{ background: 'var(--accent)' }}
              onClick={handleAddTask}
            >
              <Plus size={14} color="white" />
            </div>

            {/* Input */}
            <input
              ref={addTaskInputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddTask(); }}
              placeholder={`Add a task to "${title}", press [Enter] to save`}
              className="flex-1 text-[13px] bg-transparent focus:outline-none min-w-0"
              style={{ color: 'var(--t)' }}
            />

            {/* Quick pomodoro cup selector: 5 cups */}
            <div className="flex items-center gap-0.5 shrink-0">
              {Array.from({ length: 5 }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setNewTaskPomodoros(i + 1)}
                  onMouseEnter={() => setHoverPomodoros(i + 1)}
                  onMouseLeave={() => setHoverPomodoros(null)}
                  className="transition-transform hover:scale-110"
                  title={`${i + 1} session${i > 0 ? 's' : ''}`}
                >
                  <QuickCup filled={i < displayPomodoros} />
                </button>
              ))}
            </div>

            {/* Project picker */}
            <div className="relative shrink-0">
              <button
                onClick={() => setShowProjectPicker(!showProjectPicker)}
                className="w-6 h-6 flex items-center justify-center rounded-md transition-colors"
                style={{
                  color: newTaskProjectId ? projects.find(p => p.id === newTaskProjectId)?.color ?? 'var(--t3)' : 'var(--t3)',
                  background: newTaskProjectId ? 'var(--card-h)' : 'transparent',
                }}
                title="Set project"
              >
                {newTaskProjectId ? (
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: projects.find(p => p.id === newTaskProjectId)?.color }} />
                ) : (
                  <FolderOpen size={13} />
                )}
              </button>
              <AnimatePresence>
                {showProjectPicker && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.95 }}
                    transition={{ duration: 0.12 }}
                    className="absolute right-0 bottom-full mb-1 rounded-xl border overflow-hidden z-50"
                    style={{
                      background: 'var(--card)',
                      borderColor: 'var(--brd2)',
                      minWidth: '160px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                    }}
                    onMouseLeave={() => setShowProjectPicker(false)}
                  >
                    <button
                      onClick={() => { setNewTaskProjectId(undefined); setShowProjectPicker(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left transition-colors"
                      style={{ color: !newTaskProjectId ? 'var(--t)' : 'var(--t2)', background: !newTaskProjectId ? 'var(--card-h)' : 'transparent' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--card-h)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = !newTaskProjectId ? 'var(--card-h)' : 'transparent')}
                    >
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--brd2)' }} />
                      <span className="text-[12px]">No Project</span>
                    </button>
                    {projects.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => { setNewTaskProjectId(p.id); setShowProjectPicker(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left transition-colors"
                        style={{ color: newTaskProjectId === p.id ? 'var(--t)' : 'var(--t2)', background: newTaskProjectId === p.id ? 'var(--card-h)' : 'transparent' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--card-h)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = newTaskProjectId === p.id ? 'var(--card-h)' : 'transparent')}
                      >
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: p.color }} />
                        <span className="text-[12px]">{p.name}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Task list */}
        <div className="flex-1 overflow-y-auto px-6 pb-16 min-w-0">
          {viewTasks.length === 0 && completedTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" opacity="0.25">
                <path d="M8 14h24v1.5H8V14z" fill="var(--t)"/>
                <path d="M8 17h22c0 6-3 12.5-11 12.5S8 23 8 17z" fill="var(--t)"/>
                <path d="M30 19.5h2.5a4 4 0 000-8H30" stroke="var(--t)" strokeWidth="2" strokeLinecap="round"/>
                <path d="M10 30c2 1 16 1 18 0" stroke="var(--t)" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <p className="text-[13px]" style={{ color: 'var(--t3)' }}>No tasks here yet</p>
            </div>
          ) : (
            <>
              {viewTasks.length > 0 && (
                <div className="flex items-center gap-2 mb-3 mt-1">
                  <span className="text-[12px] font-medium" style={{ color: 'var(--t3)' }}>Tasks</span>
                  <span style={{ color: 'var(--t3)' }}>·</span>
                  <span className="text-[12px]" style={{ color: 'var(--t3)' }}>
                    {formatEstimate(totalEstimateMinutes)} estimated
                  </span>
                </div>
              )}

              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={viewTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                  <AnimatePresence mode="popLayout">
                    {sidebarView === 'today' ? (() => {
                      const nowMidnight = new Date(); nowMidnight.setHours(0, 0, 0, 0);
                      const overdueGroup = viewTasks.filter((t) => {
                        const ts = resolveDueDateToTs(t.dueDate);
                        return ts !== null && ts < nowMidnight.getTime();
                      });
                      const todayGroup = viewTasks.filter((t) => t.dueDate === 'today');
                      return (
                        <>
                          {overdueGroup.length > 0 && (
                            <>
                              <div className="flex items-center gap-2 mb-2 mt-1">
                                <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: '#e8453c' }}>Overdue</span>
                                <span className="text-[11px]" style={{ color: 'var(--t3)' }}>{overdueGroup.length}</span>
                              </div>
                              {overdueGroup.map((task) => (
                                <div key={task.id} className="mb-1.5" onClick={() => handleTaskClick(task)}>
                                  <TaskItem
                                    task={task}
                                    isActive={task.id === activeTaskId}
                                    isSelected={task.id === selectedTaskId}
                                    onToggle={() => toggleTask(task.id)}
                                    onUpdate={(partial) => updateTask(task.id, partial)}
                                    onSetActive={() => handleSetActive(task)}
                                    onPlay={() => handlePlayTask(task)}
                                    onContextMenu={(e) => handleContextMenu(e, task)}
                                  />
                                </div>
                              ))}
                            </>
                          )}
                          {todayGroup.length > 0 && (
                            <>
                              {overdueGroup.length > 0 && (
                                <div className="flex items-center gap-2 mb-2 mt-3">
                                  <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--t3)' }}>Today</span>
                                  <span className="text-[11px]" style={{ color: 'var(--t3)' }}>{todayGroup.length}</span>
                                </div>
                              )}
                              {todayGroup.map((task) => (
                                <div key={task.id} className="mb-1.5" onClick={() => handleTaskClick(task)}>
                                  <TaskItem
                                    task={task}
                                    isActive={task.id === activeTaskId}
                                    isSelected={task.id === selectedTaskId}
                                    onToggle={() => toggleTask(task.id)}
                                    onUpdate={(partial) => updateTask(task.id, partial)}
                                    onSetActive={() => handleSetActive(task)}
                                    onPlay={() => handlePlayTask(task)}
                                    onContextMenu={(e) => handleContextMenu(e, task)}
                                  />
                                </div>
                              ))}
                            </>
                          )}
                        </>
                      );
                    })() : viewTasks.map((task) => (
                      <div key={task.id} className="mb-1.5" onClick={() => handleTaskClick(task)}>
                        <TaskItem
                          task={task}
                          isActive={task.id === activeTaskId}
                          isSelected={task.id === selectedTaskId}
                          onToggle={() => toggleTask(task.id)}
                          onUpdate={(partial) => updateTask(task.id, partial)}
                          onSetActive={() => handleSetActive(task)}
                          onPlay={() => handlePlayTask(task)}
                          onContextMenu={(e) => handleContextMenu(e, task)}
                        />
                      </div>
                    ))}
                  </AnimatePresence>
                </SortableContext>
              </DndContext>

              {sidebarView !== 'completed' && completedTasks.length > 0 && (
                <div className="mt-4">
                  <button
                    onClick={() => setShowCompleted(!showCompleted)}
                    className="flex items-center gap-2 mb-2"
                  >
                    {showCompleted
                      ? <ChevronDown size={13} style={{ color: 'var(--t3)' }} />
                      : <ChevronRight size={13} style={{ color: 'var(--t3)' }} />
                    }
                    <span className="text-[12px] font-medium" style={{ color: 'var(--t3)' }}>
                      Completed ({completedTasks.length})
                    </span>
                  </button>
                  <AnimatePresence>
                    {showCompleted && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <AnimatePresence mode="popLayout">
                          {completedTasks.map((task) => (
                            <div key={task.id} className="mb-1.5">
                              <TaskItem
                                task={task}
                                isActive={false}
                                isSelected={task.id === selectedTaskId}
                                onToggle={() => toggleTask(task.id)}
                                onUpdate={(partial) => updateTask(task.id, partial)}
                                onSetActive={() => {}}
                                onContextMenu={(e) => handleContextMenu(e, task)}
                              />
                            </div>
                          ))}
                        </AnimatePresence>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </>
          )}
        </div>

        </>)}

        {/* Mini timer bar at bottom */}
        <div
          className="absolute bottom-0 left-44 right-0 flex items-center justify-center gap-4 px-6 py-2.5 border-t"
          style={{ background: 'var(--bg2)', borderColor: 'var(--brd)' }}
        >
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: phaseColor }} />
            <span className="text-[11px]" style={{ color: 'var(--t3)' }}>{phaseLabel}</span>
          </div>
          <span className="text-[18px] font-light tabular-nums" style={{ color: 'var(--t)', letterSpacing: '-0.5px' }}>
            {formatTime(secondsLeft)}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={isRunning ? pause : start}
              className="w-7 h-7 flex items-center justify-center rounded-full"
              style={{ background: phaseColor }}
            >
              {isRunning
                ? <Pause size={12} fill="white" color="white" />
                : <Play size={12} fill="white" color="white" style={{ marginLeft: 1 }} />
              }
            </button>
            <button
              onClick={() => skip(effectiveWorkDuration, effectiveShortBreakDuration, effectiveLongBreakDuration, settings.longBreakInterval)}
              className="w-6 h-6 flex items-center justify-center rounded-full transition-colors"
              style={{ background: 'var(--card)', color: 'var(--t3)' }}
            >
              <SkipForward size={11} />
            </button>
          </div>
        </div>
      </div>

      {/* Task detail panel */}
      <AnimatePresence>
        {selectedTask && (
          <TaskDetailPanel
            task={selectedTask}
            projects={projects}
            onClose={() => setSelectedTaskId(null)}
            onUpdate={(partial) => updateTask(selectedTask.id, partial)}
            onDelete={() => deleteTask(selectedTask.id)}
          />
        )}
      </AnimatePresence>

      {/* Context menu */}
      <AnimatePresence>
        {contextMenu && contextMenuTask && (
          <TaskContextMenu
            task={contextMenuTask}
            position={{ x: contextMenu.x, y: contextMenu.y }}
            projects={projects}
            onClose={() => setContextMenu(null)}
            onUpdate={(partial) => updateTask(contextMenu.taskId, partial)}
            onDelete={() => deleteTask(contextMenu.taskId)}
          />
        )}
      </AnimatePresence>

      {/* Command palette */}
      <AnimatePresence>
        {paletteOpen && (
          <CommandPalette
            open={paletteOpen}
            onClose={() => setPaletteOpen(false)}
            onNavigate={(view) => {
              setSidebarView(view as SidebarView);
              setPaletteOpen(false);
              setSelectedTaskId(null);
            }}
            onCreateTask={handleCreateTask}
            tasks={tasks}
            projects={projects}
            activeTaskId={activeTaskId}
            onSetPriority={(taskId, priority) => {
              updateTask(taskId, { priority });
              setPaletteOpen(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
