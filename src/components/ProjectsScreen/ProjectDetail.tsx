import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Play, MoreHorizontal, Edit3, Archive, Trash2, ExternalLink,
  Plus, X, Target, Calendar, Clock, ListTodo, LayoutGrid, List,
  Link as LinkIcon, ChevronRight, ChevronDown, CalendarDays, Map as MapIcon,
  Filter, ArrowDownUp, CheckSquare, Square, Flag, Tag as TagIcon,
  CheckCircle2, Circle, Activity,
} from 'lucide-react';
import { useTaskStore } from '../../store/taskStore';
import { useTimerStore } from '../../store/timerStore';
import { useSettingsStore } from '../../store/settingsStore';
import {
  Project, Task, Milestone, ProjectStatus, DueDate,
  Priority, TaskStatus, TaskType, TASK_STATUS_META, DEFAULT_TASK_TYPES,
  resolveDueDateToTs,
} from '../../types';
import {
  projectFocusSeconds, daysToDeadline, formatHrs, startOfWeekMs,
} from './projectMetrics';
import { ProjectBoard } from './ProjectBoard';
import { ProjectCalendar } from './ProjectCalendar';
import { ProjectPlan } from './ProjectPlan';
import { TaskItem } from '../TasksScreen/TaskItem';
import { TaskDetailPanel } from '../TasksScreen/TaskDetailPanel';
import { parseQuickTask } from '../../utils/quickCapture';
import { QuickCapturePreview } from '../QuickCapturePreview';
import { ProjectNotes } from './ProjectNotes';
import { ProjectActivityTimeline } from './ProjectActivityTimeline';
import { ProjectIconPicker } from './ProjectIconPicker';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable';

interface Props {
  project: Project;
  onBack: () => void;
  onSwitchToFocus: () => void;
}

const STATUS_PILL_COLORS: Record<ProjectStatus, string> = {
  active:    'var(--grn)',
  on_hold:   'var(--amb)',
  completed: 'var(--t3)',
};
const STATUS_PILL_KEY: Record<ProjectStatus, 'statusActive' | 'statusOnHold' | 'statusDone'> = {
  active:    'statusActive',
  on_hold:   'statusOnHold',
  completed: 'statusDone',
};

function parseLocalDateInput(val: string): number | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(val);
  if (!m) return undefined;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime();
}

function msToDateInput(ms?: number): string {
  if (!ms) return '';
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ── Stats tile ───────────────────────────────────────────────────────────────

function StatTile({
  icon, label, value, accent, sub, progressPct, progressColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: string;
  sub?: string;
  progressPct?: number;
  progressColor?: string;
}) {
  return (
    <div
      className="rounded-2xl p-3.5 flex flex-col gap-1.5 relative overflow-hidden"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--brd)',
      }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-px pointer-events-none"
        style={{ background: `linear-gradient(90deg, transparent, ${accent ?? 'var(--brd2)'}, transparent)`, opacity: 0.6 }}
      />
      <div className="flex items-center gap-1.5">
        <span style={{ color: accent ?? 'var(--t3)' }}>{icon}</span>
        <span className="text-[10.5px] font-semibold uppercase tracking-wider" style={{ color: 'var(--t3)' }}>
          {label}
        </span>
      </div>
      <span
        className="font-fraunces text-[22px] leading-none tabular-nums"
        style={{ color: 'var(--t)', letterSpacing: '-0.5px' }}
      >
        {value}
      </span>
      {sub && (
        <span className="text-[10.5px]" style={{ color: 'var(--t3)' }}>{sub}</span>
      )}
      {progressPct !== undefined && (
        <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: 'var(--brd)' }}>
          <div
            className="h-full transition-all duration-500"
            style={{
              width: `${Math.min(1, progressPct) * 100}%`,
              background: progressColor ?? accent ?? 'var(--accent)',
              opacity: 0.7,
            }}
          />
        </div>
      )}
    </div>
  );
}

function WeeklyFocusTile({
  weekFocusSec, goalHrs, accent, onChangeGoal,
}: {
  weekFocusSec: number;
  goalHrs?: number;
  accent: string;
  onChangeGoal: (hrs: number | undefined) => void;
}) {
  const { t } = useTranslation('projects');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>(goalHrs ? String(goalHrs) : '');
  const goalSec = (goalHrs ?? 0) * 3600;
  const pct = goalSec > 0 ? weekFocusSec / goalSec : 0;
  const met = goalSec > 0 && pct >= 1;
  const remaining = Math.max(0, goalSec - weekFocusSec);

  const submit = () => {
    const n = parseFloat(draft);
    if (Number.isFinite(n) && n > 0 && n < 200) onChangeGoal(n);
    else if (draft.trim() === '') onChangeGoal(undefined);
    setEditing(false);
  };

  return (
    <div
      className="group rounded-2xl p-3.5 flex flex-col gap-1.5 relative overflow-hidden"
      style={{ background: 'var(--card)', border: '1px solid var(--brd)' }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-px pointer-events-none"
        style={{ background: `linear-gradient(90deg, transparent, ${met ? 'var(--grn)' : 'var(--accent)'}, transparent)`, opacity: 0.6 }}
      />
      <div className="flex items-center gap-1.5">
        <Clock size={11} style={{ color: met ? 'var(--grn)' : 'var(--accent)' }} />
        <span className="text-[10.5px] font-semibold uppercase tracking-wider" style={{ color: 'var(--t3)' }}>
          {t('detail.tileThisWeek')}
        </span>
        <button
          onClick={() => { setDraft(goalHrs ? String(goalHrs) : ''); setEditing(true); }}
          className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: 'var(--t3)' }}
          title={t('detail.weeklyGoalEdit')}
        >
          <Edit3 size={10} />
        </button>
      </div>
      {editing ? (
        <div className="flex items-baseline gap-1">
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={submit}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') setEditing(false); }}
            placeholder={t('detail.weeklyGoalInputPlaceholder')}
            className="font-fraunces text-[22px] leading-none tabular-nums bg-transparent focus:outline-none w-12"
            style={{ color: 'var(--t)', letterSpacing: '-0.5px' }}
          />
          <span className="text-[12px]" style={{ color: 'var(--t3)' }}>{t('detail.weeklyHourSuffix')}</span>
        </div>
      ) : (
        <span
          className="font-fraunces text-[22px] leading-none tabular-nums"
          style={{ color: 'var(--t)', letterSpacing: '-0.5px' }}
        >
          {formatHrs(weekFocusSec)}
          {goalHrs && (
            <span className="text-[14px]" style={{ color: 'var(--t3)' }}> / {goalHrs}h</span>
          )}
        </span>
      )}
      <span className="text-[10.5px]" style={{ color: 'var(--t3)' }}>
        {goalHrs
          ? met
            ? t('detail.goalMet')
            : t('detail.goalRemaining', { remaining: formatHrs(remaining) })
          : t('detail.noGoalHint')}
      </span>
      {goalHrs && (
        <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: 'var(--brd)' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(1, pct) * 100}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="h-full"
            style={{ background: met ? 'var(--grn)' : accent, opacity: 0.75 }}
          />
        </div>
      )}
    </div>
  );
}

// ── Milestone card (rail) ────────────────────────────────────────────────────

function MilestoneCard({
  milestone, projectColor, milestoneTaskStats, onToggle, onDelete, isFiltered, onFilter,
}: {
  milestone: Milestone;
  projectColor: string;
  milestoneTaskStats: { done: number; total: number };
  onToggle: () => void;
  onDelete: () => void;
  isFiltered: boolean;
  onFilter: () => void;
}) {
  const { t } = useTranslation('projects');
  const pct = milestoneTaskStats.total === 0 ? (milestone.completed ? 1 : 0) : milestoneTaskStats.done / milestoneTaskStats.total;
  const overdue = milestone.targetDate && milestone.targetDate < Date.now() && !milestone.completed;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.18 }}
      className="group relative rounded-2xl p-3 shrink-0 transition-all"
      style={{
        width: 220,
        background: isFiltered ? projectColor + '14' : 'var(--card)',
        border: `1px solid ${isFiltered ? projectColor + '66' : 'var(--brd)'}`,
        cursor: 'pointer',
      }}
      onClick={onFilter}
    >
      <div className="flex items-start gap-2 mb-2">
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          className="w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all mt-0.5"
          style={{
            borderColor: milestone.completed ? 'var(--grn)' : 'var(--brd2)',
            background: milestone.completed ? 'var(--grn)' : 'transparent',
          }}
        >
          {milestone.completed && (
            <svg width="8" height="7" viewBox="0 0 7 6">
              <path d="M1 3L2.5 4.5L6 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
        <span
          className="flex-1 text-[12.5px] font-medium leading-snug min-w-0"
          style={{
            color: milestone.completed ? 'var(--t3)' : 'var(--t)',
            textDecoration: milestone.completed ? 'line-through' : 'none',
          }}
        >
          {milestone.title}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: 'var(--t3)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--t3)')}
        >
          <X size={11} />
        </button>
      </div>

      {/* Progress bar */}
      {milestoneTaskStats.total > 0 && (
        <div className="h-1 rounded-full overflow-hidden mb-2" style={{ background: 'var(--brd)' }}>
          <div
            className="h-full transition-all duration-300"
            style={{ width: `${pct * 100}%`, background: projectColor }}
          />
        </div>
      )}

      <div className="flex items-center justify-between text-[10.5px]" style={{ color: 'var(--t3)' }}>
        {milestoneTaskStats.total > 0 ? (
          <span className="tabular-nums">{t('detail.milestoneTaskCount', { done: milestoneTaskStats.done, total: milestoneTaskStats.total })}</span>
        ) : (
          <span>{t('detail.milestoneNoTasks')}</span>
        )}
        {milestone.targetDate && (
          <span className="tabular-nums" style={{ color: overdue ? 'var(--accent)' : 'var(--t3)' }}>
            {new Date(milestone.targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
      </div>
    </motion.div>
  );
}

// ── Filter & sort helpers ────────────────────────────────────────────────────

type DueFilter = 'overdue' | 'today' | 'week' | 'none';
type SortBy = 'manual' | 'priority' | 'due' | 'created' | 'alpha';

const DUE_FILTER_KEY: Record<DueFilter, string> = {
  overdue: 'detail.dueOverdue',
  today: 'detail.dueTodayLabel',
  week: 'detail.dueWeek',
  none: 'detail.dueNoneLabel',
};

const SORT_KEY: Record<SortBy, string> = {
  manual: 'detail.sortManual',
  priority: 'detail.sortPriority',
  due: 'detail.sortDueDate',
  created: 'detail.sortNewest',
  alpha: 'detail.sortAlpha',
};

const PRIORITY_RANK: Record<Priority, number> = { p1: 0, p2: 1, p3: 2, p4: 3 };

function FilterPopover({
  open, onClose, children, anchor,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  anchor: 'left' | 'right';
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', esc);
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: -4, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.96 }}
      transition={{ duration: 0.12 }}
      className={`absolute top-full mt-1 rounded-xl overflow-hidden z-30 ${anchor === 'right' ? 'right-0' : 'left-0'}`}
      style={{
        background: 'var(--card)',
        border: '1px solid var(--brd2)',
        boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
        minWidth: 180,
      }}
    >
      {children}
    </motion.div>
  );
}

function FilterCheckRow({
  checked, label, color, onClick,
}: {
  checked: boolean;
  label: string;
  color?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-left transition-colors"
      style={{ color: 'var(--t2)' }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--card-h)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <span
        className="w-3.5 h-3.5 rounded flex items-center justify-center shrink-0"
        style={{
          background: checked ? (color ?? 'var(--accent)') : 'transparent',
          border: `1px solid ${checked ? (color ?? 'var(--accent)') : 'var(--brd2)'}`,
        }}
      >
        {checked && (
          <svg width="8" height="7" viewBox="0 0 7 6">
            <path d="M1 3L2.5 4.5L6 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span className="flex-1 truncate" style={{ color: color ?? 'var(--t2)' }}>{label}</span>
    </button>
  );
}

function FilterRadioRow({
  checked, label, onClick,
}: {
  checked: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-left transition-colors"
      style={{ color: checked ? 'var(--t)' : 'var(--t2)', background: checked ? 'var(--card-h)' : 'transparent' }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--card-h)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = checked ? 'var(--card-h)' : 'transparent')}
    >
      <span
        className="w-3 h-3 rounded-full flex items-center justify-center shrink-0"
        style={{ border: `1px solid ${checked ? 'var(--accent)' : 'var(--brd2)'}` }}
      >
        {checked && <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)' }} />}
      </span>
      <span className="flex-1 truncate">{label}</span>
    </button>
  );
}

function FilterChipButton({
  label, active, onClick, onClear, icon,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  onClear?: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center gap-1 rounded-lg text-[11.5px] transition-all"
      style={{
        background: active ? 'var(--accent-d)' : 'var(--card)',
        border: `1px solid ${active ? 'var(--accent-g)' : 'var(--brd)'}`,
        color: active ? 'var(--t)' : 'var(--t2)',
        padding: '3px 7px',
      }}
    >
      <button onClick={onClick} className="flex items-center gap-1">
        {icon && <span style={{ color: active ? 'var(--accent)' : 'var(--t3)' }}>{icon}</span>}
        <span>{label}</span>
      </button>
      {onClear && active && (
        <button
          onClick={onClear}
          className="ml-0.5"
          style={{ color: 'var(--t3)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--t3)')}
        >
          <X size={10} />
        </button>
      )}
    </div>
  );
}

function dueMatches(task: Task, due: DueFilter): boolean {
  const ts = resolveDueDateToTs(task.dueDate);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();
  if (due === 'none') return !task.dueDate || task.dueDate === 'someday';
  if (ts === null) return false;
  if (due === 'overdue') return ts < todayMs && !task.completed;
  if (due === 'today') return ts === todayMs;
  if (due === 'week') {
    const weekEnd = todayMs + 7 * 24 * 60 * 60 * 1000;
    return ts >= todayMs && ts < weekEnd;
  }
  return false;
}

function sortTasks(tasks: Task[], by: SortBy): Task[] {
  if (by === 'manual') return tasks;
  const arr = [...tasks];
  if (by === 'priority') {
    arr.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    });
  } else if (by === 'due') {
    arr.sort((a, b) => {
      const ta = resolveDueDateToTs(a.dueDate);
      const tb = resolveDueDateToTs(b.dueDate);
      if (ta === null && tb === null) return 0;
      if (ta === null) return 1;
      if (tb === null) return -1;
      return ta - tb;
    });
  } else if (by === 'created') {
    arr.sort((a, b) => b.createdAt - a.createdAt);
  } else if (by === 'alpha') {
    arr.sort((a, b) => a.title.localeCompare(b.title));
  }
  return arr;
}

// ── Main detail page ────────────────────────────────────────────────────────

export const ProjectDetail: React.FC<Props> = ({ project, onBack, onSwitchToFocus }) => {
  const { t } = useTranslation('projects');
  const {
    tasks, projects, updateProject, deleteProject, archiveProject,
    addMilestone, toggleMilestone, deleteMilestone,
    addTask, updateTask, deleteTask, toggleTask, setActiveTask,
    addProjectLink, removeProjectLink, reorderTasks,
  } = useTaskStore();
  const { sessions, reset, start, setActiveTask: setTimerActiveTask } = useTimerStore();
  const { settings } = useSettingsStore();

  const [view, setView] = useState<'list' | 'board' | 'calendar' | 'plan'>('list');
  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState(project.name);
  const [editingDesc, setEditingDesc] = useState(false);
  const [editDesc, setEditDesc] = useState(project.description || '');
  const [showLinks, setShowLinks] = useState(true);
  const [showActivity, setShowActivity] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [milestoneFilter, setMilestoneFilter] = useState<string | null>(null);
  const [newMilestone, setNewMilestone] = useState('');
  const [newMilestoneDate, setNewMilestoneDate] = useState('');
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [linkLabel, setLinkLabel] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [newTaskInput, setNewTaskInput] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [iconPickerRect, setIconPickerRect] = useState<DOMRect | null>(null);
  const iconAnchorRef = useRef<HTMLButtonElement | null>(null);

  const [statusFilter, setStatusFilter] = useState<TaskStatus[] | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<Priority[] | null>(null);
  const [typeFilter, setTypeFilter] = useState<TaskType[] | null>(null);
  const [tagFilter, setTagFilter] = useState<string[] | null>(null);
  const [dueFilter, setDueFilter] = useState<DueFilter | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>('manual');
  const [openPopover, setOpenPopover] = useState<string | null>(null);

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [lastSelectedTaskId, setLastSelectedTaskId] = useState<string | null>(null);
  const [bulkPopover, setBulkPopover] = useState<string | null>(null);

  const projectTasksMilestoneFiltered = useMemo(
    () => tasks.filter((t) => t.projectId === project.id && (milestoneFilter ? t.milestoneId === milestoneFilter : true)),
    [tasks, project.id, milestoneFilter]
  );

  const projectTasksListFiltered = useMemo(() => {
    let arr = projectTasksMilestoneFiltered;
    if (statusFilter && statusFilter.length > 0) {
      arr = arr.filter((t) => statusFilter.includes(t.status));
    }
    if (priorityFilter && priorityFilter.length > 0) {
      arr = arr.filter((t) => priorityFilter.includes(t.priority));
    }
    if (typeFilter && typeFilter.length > 0) {
      arr = arr.filter((t) => typeFilter.includes(t.type));
    }
    if (tagFilter && tagFilter.length > 0) {
      arr = arr.filter((t) => t.tags.some((tag) => tagFilter.includes(tag)));
    }
    if (dueFilter) {
      arr = arr.filter((t) => dueMatches(t, dueFilter));
    }
    return sortTasks(arr, sortBy);
  }, [projectTasksMilestoneFiltered, statusFilter, priorityFilter, typeFilter, tagFilter, dueFilter, sortBy]);

  const availableTags = useMemo(() => {
    const set = new Set<string>();
    projectTasksMilestoneFiltered.forEach((t) => t.tags.forEach((tag) => set.add(tag)));
    return Array.from(set).sort();
  }, [projectTasksMilestoneFiltered]);

  const availableTypes = useMemo(() => {
    const set = new Set<TaskType>(DEFAULT_TASK_TYPES.map((t) => t.value));
    projectTasksMilestoneFiltered.forEach((t) => set.add(t.type));
    return Array.from(set);
  }, [projectTasksMilestoneFiltered]);

  const filtersActive =
    (statusFilter !== null && statusFilter.length > 0) ||
    (priorityFilter !== null && priorityFilter.length > 0) ||
    (typeFilter !== null && typeFilter.length > 0) ||
    (tagFilter !== null && tagFilter.length > 0) ||
    dueFilter !== null ||
    sortBy !== 'manual';

  const clearAllFilters = () => {
    setStatusFilter(null);
    setPriorityFilter(null);
    setTypeFilter(null);
    setTagFilter(null);
    setDueFilter(null);
    setSortBy('manual');
  };

  const allProjectTasks = tasks.filter((t) => t.projectId === project.id);
  const doneCount = allProjectTasks.filter((t) => t.completed).length;

  useEffect(() => {
    if (view !== 'list') {
      setSelectionMode(false);
      setSelectedTaskIds(new Set());
      setLastSelectedTaskId(null);
      setBulkPopover(null);
    }
  }, [view]);

  useEffect(() => {
    if (selectedTaskIds.size === 0) return;
    const visibleIds = new Set(projectTasksListFiltered.map((t) => t.id));
    const next = new Set<string>();
    let changed = false;
    selectedTaskIds.forEach((id) => {
      if (visibleIds.has(id)) next.add(id);
      else changed = true;
    });
    if (changed) setSelectedTaskIds(next);
  }, [projectTasksListFiltered, selectedTaskIds]);

  const toggleTaskSelection = (taskId: string, shiftKey: boolean) => {
    if (shiftKey && lastSelectedTaskId && lastSelectedTaskId !== taskId) {
      const ids = projectTasksListFiltered.map((t) => t.id);
      const aIdx = ids.indexOf(lastSelectedTaskId);
      const bIdx = ids.indexOf(taskId);
      if (aIdx >= 0 && bIdx >= 0) {
        const [start, end] = aIdx < bIdx ? [aIdx, bIdx] : [bIdx, aIdx];
        const next = new Set(selectedTaskIds);
        for (let i = start; i <= end; i++) next.add(ids[i]);
        setSelectedTaskIds(next);
        setLastSelectedTaskId(taskId);
        return;
      }
    }
    const next = new Set(selectedTaskIds);
    if (next.has(taskId)) next.delete(taskId);
    else next.add(taskId);
    setSelectedTaskIds(next);
    setLastSelectedTaskId(taskId);
  };

  const toggleSelectAll = () => {
    if (selectedTaskIds.size === projectTasksListFiltered.length) {
      setSelectedTaskIds(new Set());
    } else {
      setSelectedTaskIds(new Set(projectTasksListFiltered.map((t) => t.id)));
    }
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedTaskIds(new Set());
    setLastSelectedTaskId(null);
    setBulkPopover(null);
  };

  const selectedTasksArr = useMemo(
    () => projectTasksListFiltered.filter((t) => selectedTaskIds.has(t.id)),
    [projectTasksListFiltered, selectedTaskIds]
  );
  const anyIncompleteSelected = selectedTasksArr.some((t) => !t.completed);

  // Drag-and-drop reorder for the project's task list. Same shape as the
  // TasksScreen handler: arrayMove the visible subset, then splice it back
  // into the full task list at the original positions of the visible items
  // (so non-visible tasks stay where they are).
  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const handleTaskDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = projectTasksListFiltered.findIndex((t) => t.id === active.id);
    const newIdx = projectTasksListFiltered.findIndex((t) => t.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const reordered = arrayMove(projectTasksListFiltered, oldIdx, newIdx);
    const viewIds = new Set(projectTasksListFiltered.map((t) => t.id));
    let vi = 0;
    const merged = tasks.map((t) => (viewIds.has(t.id) ? reordered[vi++]! : t));
    reorderTasks(merged);
  };

  const bulkSetPriority = async (priority: Priority) => {
    await Promise.all(selectedTasksArr.map((t) => updateTask(t.id, { priority })));
    setSelectedTaskIds(new Set());
    setBulkPopover(null);
  };
  const bulkSetStatus = async (status: TaskStatus) => {
    await Promise.all(selectedTasksArr.map((t) => updateTask(t.id, { status })));
    setSelectedTaskIds(new Set());
    setBulkPopover(null);
  };
  const bulkSetMilestone = async (milestoneId: string | undefined) => {
    await Promise.all(selectedTasksArr.map((t) => updateTask(t.id, { milestoneId })));
    setSelectedTaskIds(new Set());
    setBulkPopover(null);
  };
  const bulkToggleComplete = async () => {
    const targets = anyIncompleteSelected
      ? selectedTasksArr.filter((t) => !t.completed)
      : selectedTasksArr.filter((t) => t.completed);
    await Promise.all(targets.map((t) => toggleTask(t.id)));
    setSelectedTaskIds(new Set());
  };
  const bulkDelete = async () => {
    if (!confirm(t('detail.bulkDeleteConfirm', { count: selectedTasksArr.length }))) return;
    await Promise.all(selectedTasksArr.map((task) => deleteTask(task.id)));
    setSelectedTaskIds(new Set());
    setBulkPopover(null);
  };

  const weekFocus = projectFocusSeconds(sessions, tasks, project.id, startOfWeekMs());
  const totalFocus = projectFocusSeconds(sessions, tasks, project.id);
  const dToDeadline = daysToDeadline(project.targetDate);

  const milestoneTaskStats = (mid: string) => {
    const scoped = tasks.filter((t) => t.projectId === project.id && t.milestoneId === mid);
    return { done: scoped.filter((t) => t.completed).length, total: scoped.length };
  };

  const selectedTask = selectedTaskId ? tasks.find((t) => t.id === selectedTaskId) : null;

  const startFocusOnNext = () => {
    const next = allProjectTasks.find((t) => !t.completed && t.status !== 'blocked');
    if (!next) return;
    setActiveTask(next.id);
    setTimerActiveTask(next.id);
    const workDuration = next.customWorkDuration
      ?? project.customWorkDuration ?? settings.workDuration;
    reset(workDuration);
    start();
    onSwitchToFocus();
  };

  const handlePlay = (task: Task) => {
    setActiveTask(task.id);
    setTimerActiveTask(task.id);
    const workDuration = task.customWorkDuration
      ?? project.customWorkDuration ?? settings.workDuration;
    reset(workDuration);
    start();
    onSwitchToFocus();
  };

  const handleDelete = async () => {
    if (!confirm(t('detail.deleteProjectConfirmAlt', { name: project.name }))) return;
    await deleteProject(project.id);
    onBack();
  };

  const parsedNewTask = useMemo(
    () => parseQuickTask(newTaskInput, projects, { boundProjectId: project.id }),
    [newTaskInput, projects, project.id]
  );

  const submitNewTask = async () => {
    const parsed = parsedNewTask;
    const title = parsed.title.trim();
    if (!title) return;
    const dueDate: DueDate = (parsed.dueDate as DueDate | undefined) ?? null;
    const priority = parsed.priority ?? 'p4';
    const pomodoros = parsed.pomodoroEstimate ?? 1;
    await addTask(title, priority, project.id, dueDate, pomodoros, {
      type: parsed.type,
      milestoneId: milestoneFilter ?? undefined,
    });
    setNewTaskInput('');
  };

  const removeNewTaskToken = (raw: string) => {
    setNewTaskInput((v) => v.replace(raw, '').replace(/\s+/g, ' ').trim());
  };
  const applyNewTaskSuggestion = (bad: string, suggestion: string) => {
    const sigil = bad[0];
    setNewTaskInput((v) => v.replace(bad, sigil + suggestion));
  };

  const submitLink = async () => {
    if (!linkLabel.trim() || !linkUrl.trim()) return;
    await addProjectLink(project.id, linkLabel.trim(), linkUrl.trim());
    setLinkLabel(''); setLinkUrl(''); setShowLinkForm(false);
  };

  const pillColor = STATUS_PILL_COLORS[project.status];
  const pillLabel = t(`detail.${STATUS_PILL_KEY[project.status]}`);
  const overdue = dToDeadline !== null && dToDeadline < 0;

  return (
    <div className="flex h-full overflow-hidden" style={{ background: 'var(--bg)' }}>
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        {/* Header band */}
        <div
          className="shrink-0 px-8 pt-5 pb-4 relative"
          style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--brd)' }}
        >
          <div
            className="absolute top-0 left-0 right-0 h-px pointer-events-none"
            style={{ background: `linear-gradient(90deg, transparent, ${project.color}, transparent)`, opacity: 0.6 }}
          />

          {/* Back row */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11.5px] font-medium transition-colors"
              style={{ color: 'var(--t3)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--card)'; e.currentTarget.style.color = 'var(--t2)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--t3)'; }}
            >
              <ArrowLeft size={12} />
              {t('detail.allProjects')}
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={startFocusOnNext}
                disabled={allProjectTasks.every((t) => t.completed)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[12px] font-semibold transition-all"
                style={{
                  background: allProjectTasks.some((t) => !t.completed)
                    ? `linear-gradient(135deg, ${project.color}, ${project.color}cc)`
                    : 'var(--card-h)',
                  color: allProjectTasks.some((t) => !t.completed) ? '#fff' : 'var(--t3)',
                  boxShadow: allProjectTasks.some((t) => !t.completed) ? `0 4px 14px ${project.color}55` : 'none',
                  cursor: allProjectTasks.some((t) => !t.completed) ? 'pointer' : 'not-allowed',
                }}
              >
                <Play size={11} fill="currentColor" />
                {t('detail.startFocus')}
              </button>

              {/* Overflow */}
              <div className="relative">
                <button
                  onClick={() => setOverflowOpen((v) => !v)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
                  style={{ color: 'var(--t3)', background: overflowOpen ? 'var(--card)' : 'transparent' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--card)'; e.currentTarget.style.color = 'var(--t2)'; }}
                  onMouseLeave={(e) => { if (!overflowOpen) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--t3)'; } }}
                >
                  <MoreHorizontal size={14} />
                </button>
                <AnimatePresence>
                  {overflowOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.96 }}
                      transition={{ duration: 0.12 }}
                      className="absolute right-0 top-full mt-1 rounded-xl overflow-hidden z-30"
                      style={{
                        background: 'var(--card)',
                        border: '1px solid var(--brd2)',
                        boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
                        minWidth: 180,
                      }}
                      onMouseLeave={() => setOverflowOpen(false)}
                    >
                      {(['active', 'on_hold', 'completed'] as ProjectStatus[]).map((s) => (
                        <button
                          key={s}
                          onClick={() => { updateProject(project.id, { status: s }); setOverflowOpen(false); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-left transition-colors"
                          style={{ color: project.status === s ? STATUS_PILL_COLORS[s] : 'var(--t2)', background: project.status === s ? 'var(--card-h)' : 'transparent' }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--card-h)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = project.status === s ? 'var(--card-h)' : 'transparent')}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_PILL_COLORS[s] }} />
                          {t('detail.markStatus', { label: t(`detail.${STATUS_PILL_KEY[s]}`) })}
                        </button>
                      ))}
                      <div className="h-px mx-2 my-1" style={{ background: 'var(--brd)' }} />
                      <button
                        onClick={() => { archiveProject(project.id, !project.archived); setOverflowOpen(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-left transition-colors"
                        style={{ color: 'var(--t2)' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--card-h)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <Archive size={11} />
                        {project.archived ? t('detail.unarchive') : t('detail.archive')}
                      </button>
                      <button
                        onClick={handleDelete}
                        className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-left transition-colors"
                        style={{ color: 'var(--accent)' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,77,77,0.08)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <Trash2 size={11} />
                        {t('detail.deleteProject')}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Identity row */}
          <div className="flex items-start gap-3.5">
            <button
              ref={iconAnchorRef}
              onClick={() => {
                if (iconAnchorRef.current) {
                  setIconPickerRect(iconAnchorRef.current.getBoundingClientRect());
                }
              }}
              title="Change project icon"
              className="group relative w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 mt-1 transition-all"
              style={{
                background: `linear-gradient(135deg, ${project.color}33, ${project.color}11)`,
                border: `1px solid ${project.color}55`,
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = `linear-gradient(135deg, ${project.color}55, ${project.color}22)`;
                e.currentTarget.style.borderColor = `${project.color}99`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = `linear-gradient(135deg, ${project.color}33, ${project.color}11)`;
                e.currentTarget.style.borderColor = `${project.color}55`;
              }}
            >
              {project.icon ? (
                <span className="text-[24px] leading-none">{project.icon}</span>
              ) : (
                <div className="w-4 h-4 rounded-md" style={{ background: project.color }} />
              )}
              <span
                className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--brd2)',
                  fontSize: 9,
                  color: 'var(--t2)',
                }}
              >
                ✎
              </span>
            </button>

            <div className="flex-1 min-w-0">
              {editingName ? (
                <input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={() => {
                    if (editName.trim() && editName.trim() !== project.name) {
                      updateProject(project.id, { name: editName.trim() });
                    }
                    setEditingName(false);
                  }}
                  onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') { setEditName(project.name); setEditingName(false); } }}
                  className="font-fraunces text-[26px] bg-transparent focus:outline-none w-full"
                  style={{ color: 'var(--t)' }}
                />
              ) : (
                <button
                  onClick={() => { setEditName(project.name); setEditingName(true); }}
                  className="flex items-center gap-2 text-left group"
                >
                  <h1
                    className="font-fraunces text-[26px] leading-tight"
                    style={{
                      background: `linear-gradient(135deg, var(--t) 0%, var(--t2) 100%)`,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    {project.name}
                  </h1>
                  <Edit3 size={11} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--t3)' }} />
                </button>
              )}

              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-medium uppercase tracking-wider"
                  style={{ color: pillColor, background: pillColor + '18', border: `1px solid ${pillColor}40` }}
                >
                  <span className="w-1 h-1 rounded-full" style={{ background: pillColor }} />
                  {pillLabel}
                </span>

                {project.archived && (
                  <span
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-medium uppercase tracking-wider"
                    style={{ color: 'var(--t3)', background: 'var(--card-h)', border: '1px solid var(--brd)' }}
                  >
                    <Archive size={9} />
                    {t('detail.archivedTag')}
                  </span>
                )}

                <div className="flex items-center gap-1 ml-1">
                  <Target size={10} style={{ color: overdue ? 'var(--accent)' : 'var(--t3)' }} />
                  <input
                    type="date"
                    value={msToDateInput(project.targetDate)}
                    onChange={(e) => updateProject(project.id, { targetDate: e.target.value ? parseLocalDateInput(e.target.value) : undefined })}
                    className="text-[11px] bg-transparent focus:outline-none"
                    style={{ color: overdue ? 'var(--accent)' : 'var(--t3)', colorScheme: 'dark', width: 100 }}
                  />
                </div>
              </div>

              {/* Description */}
              {editingDesc ? (
                <textarea
                  autoFocus
                  rows={2}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  onBlur={() => { updateProject(project.id, { description: editDesc }); setEditingDesc(false); }}
                  onKeyDown={(e) => { if (e.key === 'Escape') { setEditDesc(project.description); setEditingDesc(false); } }}
                  placeholder={t('detail.descTextarea')}
                  className="mt-2 w-full text-[12px] bg-transparent resize-none focus:outline-none"
                  style={{ color: 'var(--t2)' }}
                />
              ) : (
                <p
                  className="text-[12px] mt-1.5 cursor-text"
                  style={{ color: project.description ? 'var(--t2)' : 'var(--t3)' }}
                  onClick={() => { setEditDesc(project.description); setEditingDesc(true); }}
                >
                  {project.description || t('detail.addDescription')}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-8 py-5">
          {/* Stats strip */}
          <div className="grid grid-cols-4 gap-3 mb-5">
            <WeeklyFocusTile
              weekFocusSec={weekFocus}
              goalHrs={project.weeklyFocusGoalHrs}
              accent={project.color}
              onChangeGoal={(hrs) => updateProject(project.id, { weeklyFocusGoalHrs: hrs })}
            />
            <StatTile
              icon={<Clock size={11} />}
              label={t('detail.totalFocus')}
              value={formatHrs(totalFocus)}
              accent={project.color}
            />
            <StatTile
              icon={<ListTodo size={11} />}
              label={t('detail.tileTasks')}
              value={`${doneCount}/${allProjectTasks.length}`}
              accent="var(--grn)"
            />
            <StatTile
              icon={<Calendar size={11} />}
              label={t('detail.tileDeadline')}
              value={
                dToDeadline === null
                  ? '—'
                  : overdue
                    ? t('detail.deadlineOver', { days: Math.abs(dToDeadline) })
                    : dToDeadline === 0
                      ? t('detail.deadlineToday')
                      : t('detail.deadlineDays', { days: dToDeadline })
              }
              accent={overdue ? 'var(--accent)' : 'var(--blu)'}
            />
          </div>

          {/* Links */}
          <div className="mb-5">
            <button
              onClick={() => setShowLinks((v) => !v)}
              className="flex items-center gap-1.5 mb-2"
            >
              {showLinks ? <ChevronDown size={11} style={{ color: 'var(--t3)' }} /> : <ChevronRight size={11} style={{ color: 'var(--t3)' }} />}
              <span className="text-[10.5px] font-semibold uppercase tracking-wider" style={{ color: 'var(--t3)' }}>
                {t('detail.linksLabel')}
              </span>
              <span className="text-[10.5px]" style={{ color: 'var(--t3)' }}>
                {project.links.length}
              </span>
            </button>
            {showLinks && (
              <div className="flex items-center flex-wrap gap-2">
                {project.links.map((l) => (
                  <a
                    key={l.id}
                    href={l.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="group flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11.5px] transition-all"
                    style={{
                      background: 'var(--card)',
                      border: '1px solid var(--brd)',
                      color: 'var(--t2)',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = project.color + '55'; e.currentTarget.style.color = 'var(--t)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--brd)'; e.currentTarget.style.color = 'var(--t2)'; }}
                  >
                    <ExternalLink size={10} style={{ color: project.color }} />
                    {l.label}
                    <button
                      onClick={(e) => { e.preventDefault(); removeProjectLink(project.id, l.id); }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5"
                      style={{ color: 'var(--t3)' }}
                    >
                      <X size={10} />
                    </button>
                  </a>
                ))}

                {showLinkForm ? (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: 'var(--card)', border: '1px solid var(--brd2)' }}>
                    <LinkIcon size={10} style={{ color: project.color }} />
                    <input
                      autoFocus
                      placeholder={t('detail.linkLabelPlaceholder')}
                      value={linkLabel}
                      onChange={(e) => setLinkLabel(e.target.value)}
                      className="text-[11.5px] bg-transparent focus:outline-none"
                      style={{ color: 'var(--t)', width: 70 }}
                    />
                    <input
                      placeholder={t('detail.linkUrlPlaceholder')}
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') submitLink(); if (e.key === 'Escape') { setShowLinkForm(false); setLinkLabel(''); setLinkUrl(''); } }}
                      className="text-[11.5px] bg-transparent focus:outline-none"
                      style={{ color: 'var(--t2)', width: 140 }}
                    />
                    <button onClick={submitLink} style={{ color: 'var(--grn)' }} className="text-[11px]">{t('detail.linkAddBtn')}</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowLinkForm(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11.5px] transition-all"
                    style={{
                      background: 'transparent',
                      border: '1px dashed var(--brd2)',
                      color: 'var(--t3)',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = project.color + '88'; e.currentTarget.style.color = 'var(--t2)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--brd2)'; e.currentTarget.style.color = 'var(--t3)'; }}
                  >
                    <Plus size={10} />
                    {t('detail.addLink')}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Milestones rail */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-[10.5px] font-semibold uppercase tracking-wider" style={{ color: 'var(--t3)' }}>
                  {t('detail.milestonesLabel')}
                </span>
                {project.milestones.length > 0 && (
                  <span className="text-[10.5px] tabular-nums" style={{ color: 'var(--t3)' }}>
                    {project.milestones.filter((m) => m.completed).length}/{project.milestones.length}
                  </span>
                )}
                {milestoneFilter && (
                  <button
                    onClick={() => setMilestoneFilter(null)}
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px]"
                    style={{ background: project.color + '20', color: project.color }}
                  >
                    {t('detail.clearFilter')}
                    <X size={9} />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-stretch gap-2 overflow-x-auto pb-2 relative">
              {/* Connecting hairline */}
              {project.milestones.length > 1 && (
                <div
                  className="absolute left-3 right-3 top-1/2 h-px pointer-events-none"
                  style={{ background: 'var(--brd2)', zIndex: 0 }}
                />
              )}
              <AnimatePresence mode="popLayout">
                {project.milestones.map((m) => (
                  <div key={m.id} className="relative z-10">
                    <MilestoneCard
                      milestone={m}
                      projectColor={project.color}
                      milestoneTaskStats={milestoneTaskStats(m.id)}
                      onToggle={() => toggleMilestone(project.id, m.id)}
                      onDelete={() => deleteMilestone(project.id, m.id)}
                      isFiltered={milestoneFilter === m.id}
                      onFilter={() => setMilestoneFilter(milestoneFilter === m.id ? null : m.id)}
                    />
                  </div>
                ))}
              </AnimatePresence>

              {/* Add milestone */}
              <div
                className="rounded-2xl p-3 flex flex-col gap-2 shrink-0 relative z-10"
                style={{
                  width: 200,
                  background: 'transparent',
                  border: '1px dashed var(--brd2)',
                }}
              >
                <input
                  value={newMilestone}
                  onChange={(e) => setNewMilestone(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newMilestone.trim()) {
                      addMilestone(project.id, newMilestone.trim(), newMilestoneDate ? parseLocalDateInput(newMilestoneDate) : undefined);
                      setNewMilestone(''); setNewMilestoneDate('');
                    }
                  }}
                  placeholder={t('detail.newMilestoneShort')}
                  className="text-[12px] bg-transparent focus:outline-none"
                  style={{ color: 'var(--t3)' }}
                />
                {newMilestone.trim() && (
                  <input
                    type="date"
                    value={newMilestoneDate}
                    onChange={(e) => setNewMilestoneDate(e.target.value)}
                    className="text-[10.5px] bg-transparent focus:outline-none"
                    style={{ color: 'var(--t3)', colorScheme: 'dark' }}
                  />
                )}
              </div>
            </div>
          </div>

          <div className="mb-5">
            <button
              onClick={() => setShowActivity((v) => !v)}
              className="flex items-center gap-1.5 mb-2"
            >
              {showActivity ? <ChevronDown size={11} style={{ color: 'var(--t3)' }} /> : <ChevronRight size={11} style={{ color: 'var(--t3)' }} />}
              <Activity size={11} style={{ color: 'var(--t3)' }} />
              <span className="text-[10.5px] font-semibold uppercase tracking-wider" style={{ color: 'var(--t3)' }}>
                {t('detail.activity')}
              </span>
            </button>
            {showActivity && (
              <ProjectActivityTimeline
                projectId={project.id}
                projectColor={project.color}
                projectTaskIds={allProjectTasks.map((t) => t.id)}
              />
            )}
          </div>

          {/* Tasks header + view toggle */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-[10.5px] font-semibold uppercase tracking-wider" style={{ color: 'var(--t3)' }}>
                {t('detail.tasksHeader')}
              </span>
              <span className="text-[10.5px] tabular-nums" style={{ color: 'var(--t3)' }}>
                {view === 'list' && filtersActive
                  ? t('detail.countOfTotal', { count: projectTasksListFiltered.length, total: projectTasksMilestoneFiltered.length })
                  : `${projectTasksMilestoneFiltered.length}`}
                {milestoneFilter && ` ${t('detail.filteredParen')}`}
              </span>
              {view === 'list' && projectTasksMilestoneFiltered.length > 0 && (
                <button
                  onClick={() => {
                    if (selectionMode) exitSelectionMode();
                    else setSelectionMode(true);
                  }}
                  className="ml-1 flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10.5px] font-medium transition-colors"
                  style={{
                    color: selectionMode ? 'var(--accent)' : 'var(--t3)',
                    background: selectionMode ? 'var(--accent-d)' : 'transparent',
                    border: `1px solid ${selectionMode ? 'var(--accent-g)' : 'var(--brd)'}`,
                  }}
                >
                  <CheckSquare size={10} />
                  {selectionMode ? t('detail.doneBtn') : t('detail.selectBtn')}
                </button>
              )}
              {view === 'list' && selectionMode && (
                <>
                  <button
                    onClick={toggleSelectAll}
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10.5px] font-medium transition-colors"
                    style={{ color: 'var(--t2)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--card-h)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    {selectedTaskIds.size === projectTasksListFiltered.length && projectTasksListFiltered.length > 0
                      ? <CheckSquare size={10} />
                      : <Square size={10} />}
                    {t('detail.selectAll')}
                  </button>
                  <span className="text-[10.5px] tabular-nums" style={{ color: 'var(--t3)' }}>
                    {t('detail.selectedCount', { count: selectedTaskIds.size })}
                  </span>
                </>
              )}
            </div>
            <div
              className="flex items-center rounded-lg p-0.5"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--brd)' }}
            >
              {([['list', List, 'detail.viewList'], ['board', LayoutGrid, 'detail.viewBoard'], ['calendar', CalendarDays, 'detail.viewCalendar'], ['plan', MapIcon, 'detail.viewPlan']] as const).map(([v, Icon, key]) => {
                const isActive = view === v;
                return (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className="relative flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors"
                    style={{ color: isActive ? 'var(--t)' : 'var(--t3)' }}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="project-view-bg"
                        className="absolute inset-0 rounded-md"
                        style={{ background: 'var(--card-h)' }}
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.3 }}
                      />
                    )}
                    <Icon size={11} className="relative z-10" />
                    <span className="relative z-10">{t(key)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Add task input */}
          <div
            className="rounded-xl mb-3"
            style={{
              background: 'var(--card)',
              border: '1px solid var(--brd)',
            }}
          >
            <div className="flex items-center gap-2 px-3 py-2">
              <button
                onClick={submitNewTask}
                className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-all"
                style={{
                  background: `linear-gradient(135deg, ${project.color}, ${project.color}cc)`,
                  boxShadow: `0 2px 8px ${project.color}55`,
                }}
              >
                <Plus size={11} color="#fff" />
              </button>
              <input
                value={newTaskInput}
                onChange={(e) => setNewTaskInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') submitNewTask(); }}
                placeholder={t('detail.addTaskPlaceholder')}
                className="flex-1 text-[12.5px] bg-transparent focus:outline-none"
                style={{ color: 'var(--t)' }}
              />
            </div>
            <QuickCapturePreview
              parsed={parsedNewTask}
              rawText={newTaskInput}
              onRemoveToken={removeNewTaskToken}
              onApplySuggestion={applyNewTaskSuggestion}
            />
          </div>

          {view === 'list' && (
            <div className="flex items-center gap-1.5 mb-3 flex-wrap">
              <div className="relative">
                <FilterChipButton
                  label={
                    statusFilter && statusFilter.length > 0
                      ? t('detail.statusFilterN', { count: statusFilter.length })
                      : t('detail.statusFilter')
                  }
                  active={statusFilter !== null && statusFilter.length > 0}
                  icon={<Filter size={10} />}
                  onClick={() => setOpenPopover(openPopover === 'status' ? null : 'status')}
                  onClear={statusFilter && statusFilter.length > 0 ? () => setStatusFilter(null) : undefined}
                />
                <AnimatePresence>
                  <FilterPopover open={openPopover === 'status'} onClose={() => setOpenPopover(null)} anchor="left">
                    {(['todo', 'in_progress', 'done', 'blocked'] as TaskStatus[]).map((s) => {
                      const meta = TASK_STATUS_META[s];
                      const checked = statusFilter?.includes(s) ?? false;
                      return (
                        <FilterCheckRow
                          key={s}
                          checked={checked}
                          label={meta.label}
                          color={meta.color}
                          onClick={() => {
                            const cur = statusFilter ?? [];
                            const next = checked ? cur.filter((x) => x !== s) : [...cur, s];
                            setStatusFilter(next.length === 0 ? null : next);
                          }}
                        />
                      );
                    })}
                  </FilterPopover>
                </AnimatePresence>
              </div>

              <div className="relative">
                <FilterChipButton
                  label={
                    priorityFilter && priorityFilter.length > 0
                      ? t('detail.priorityFilterN', { count: priorityFilter.length })
                      : t('detail.priorityFilter')
                  }
                  active={priorityFilter !== null && priorityFilter.length > 0}
                  icon={<Flag size={10} />}
                  onClick={() => setOpenPopover(openPopover === 'priority' ? null : 'priority')}
                  onClear={priorityFilter && priorityFilter.length > 0 ? () => setPriorityFilter(null) : undefined}
                />
                <AnimatePresence>
                  <FilterPopover open={openPopover === 'priority'} onClose={() => setOpenPopover(null)} anchor="left">
                    {(['p1', 'p2', 'p3', 'p4'] as Priority[]).map((p) => {
                      const checked = priorityFilter?.includes(p) ?? false;
                      const colors: Record<Priority, string> = {
                        p1: 'var(--accent)', p2: 'var(--amb)', p3: 'var(--blu)', p4: 'var(--t3)',
                      };
                      return (
                        <FilterCheckRow
                          key={p}
                          checked={checked}
                          label={p.toUpperCase()}
                          color={colors[p]}
                          onClick={() => {
                            const cur = priorityFilter ?? [];
                            const next = checked ? cur.filter((x) => x !== p) : [...cur, p];
                            setPriorityFilter(next.length === 0 ? null : next);
                          }}
                        />
                      );
                    })}
                  </FilterPopover>
                </AnimatePresence>
              </div>

              <div className="relative">
                <FilterChipButton
                  label={
                    typeFilter && typeFilter.length > 0
                      ? t('detail.typeFilterN', { count: typeFilter.length })
                      : t('detail.typeFilter')
                  }
                  active={typeFilter !== null && typeFilter.length > 0}
                  onClick={() => setOpenPopover(openPopover === 'type' ? null : 'type')}
                  onClear={typeFilter && typeFilter.length > 0 ? () => setTypeFilter(null) : undefined}
                />
                <AnimatePresence>
                  <FilterPopover open={openPopover === 'type'} onClose={() => setOpenPopover(null)} anchor="left">
                    {availableTypes.map((tp) => {
                      const checked = typeFilter?.includes(tp) ?? false;
                      const meta = DEFAULT_TASK_TYPES.find((d) => d.value === tp);
                      return (
                        <FilterCheckRow
                          key={tp}
                          checked={checked}
                          label={meta?.label ?? String(tp)}
                          color={meta?.color}
                          onClick={() => {
                            const cur = typeFilter ?? [];
                            const next = checked ? cur.filter((x) => x !== tp) : [...cur, tp];
                            setTypeFilter(next.length === 0 ? null : next);
                          }}
                        />
                      );
                    })}
                  </FilterPopover>
                </AnimatePresence>
              </div>

              {availableTags.length > 0 && (
                <div className="relative">
                  <FilterChipButton
                    label={
                      tagFilter && tagFilter.length > 0
                        ? t('detail.tagsFilterN', { count: tagFilter.length })
                        : t('detail.tagsFilter')
                    }
                    active={tagFilter !== null && tagFilter.length > 0}
                    icon={<TagIcon size={10} />}
                    onClick={() => setOpenPopover(openPopover === 'tags' ? null : 'tags')}
                    onClear={tagFilter && tagFilter.length > 0 ? () => setTagFilter(null) : undefined}
                  />
                  <AnimatePresence>
                    <FilterPopover open={openPopover === 'tags'} onClose={() => setOpenPopover(null)} anchor="left">
                      <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                        {availableTags.map((tag) => {
                          const checked = tagFilter?.includes(tag) ?? false;
                          return (
                            <FilterCheckRow
                              key={tag}
                              checked={checked}
                              label={t('detail.tagPrefix', { tag })}
                              onClick={() => {
                                const cur = tagFilter ?? [];
                                const next = checked ? cur.filter((x) => x !== tag) : [...cur, tag];
                                setTagFilter(next.length === 0 ? null : next);
                              }}
                            />
                          );
                        })}
                      </div>
                    </FilterPopover>
                  </AnimatePresence>
                </div>
              )}

              <div className="relative">
                <FilterChipButton
                  label={dueFilter ? t(DUE_FILTER_KEY[dueFilter]) : t('detail.dueFilterLabel')}
                  active={dueFilter !== null}
                  icon={<Calendar size={10} />}
                  onClick={() => setOpenPopover(openPopover === 'due' ? null : 'due')}
                  onClear={dueFilter !== null ? () => setDueFilter(null) : undefined}
                />
                <AnimatePresence>
                  <FilterPopover open={openPopover === 'due'} onClose={() => setOpenPopover(null)} anchor="left">
                    {(['overdue', 'today', 'week', 'none'] as DueFilter[]).map((d) => (
                      <FilterRadioRow
                        key={d}
                        checked={dueFilter === d}
                        label={t(DUE_FILTER_KEY[d])}
                        onClick={() => {
                          setDueFilter(dueFilter === d ? null : d);
                          setOpenPopover(null);
                        }}
                      />
                    ))}
                  </FilterPopover>
                </AnimatePresence>
              </div>

              <div className="relative ml-auto">
                <FilterChipButton
                  label={t('detail.sortLabel', { label: t(SORT_KEY[sortBy]) })}
                  active={sortBy !== 'manual'}
                  icon={<ArrowDownUp size={10} />}
                  onClick={() => setOpenPopover(openPopover === 'sort' ? null : 'sort')}
                  onClear={sortBy !== 'manual' ? () => setSortBy('manual') : undefined}
                />
                <AnimatePresence>
                  <FilterPopover open={openPopover === 'sort'} onClose={() => setOpenPopover(null)} anchor="right">
                    {(['manual', 'priority', 'due', 'created', 'alpha'] as SortBy[]).map((s) => (
                      <FilterRadioRow
                        key={s}
                        checked={sortBy === s}
                        label={t(SORT_KEY[s])}
                        onClick={() => { setSortBy(s); setOpenPopover(null); }}
                      />
                    ))}
                  </FilterPopover>
                </AnimatePresence>
              </div>

              {filtersActive && (
                <button
                  onClick={clearAllFilters}
                  className="text-[11px] px-1.5 py-0.5 rounded-md transition-colors"
                  style={{ color: 'var(--t3)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--t3)')}
                >
                  {t('detail.clearAll')}
                </button>
              )}
            </div>
          )}

          {view === 'plan' ? (
            <ProjectPlan
              project={project}
              tasks={projectTasksMilestoneFiltered}
              onOpenTask={(id) => setSelectedTaskId(id)}
            />
          ) : view === 'calendar' ? (
            <ProjectCalendar
              project={project}
              tasks={projectTasksMilestoneFiltered}
              sessions={sessions}
              onOpenTask={(id) => setSelectedTaskId(id)}
            />
          ) : view === 'board' ? (
            <ProjectBoard
              project={project}
              tasks={projectTasksMilestoneFiltered}
              onOpenTask={(id) => setSelectedTaskId(id)}
              onSwitchToFocus={onSwitchToFocus}
            />
          ) : (
            <div className="relative">
              {projectTasksListFiltered.length === 0 ? (
                <div
                  className="flex items-center justify-center text-[12px] rounded-xl py-10"
                  style={{
                    color: 'var(--t3)',
                    background: 'var(--card)',
                    border: '1px dashed var(--brd)',
                  }}
                >
                  {projectTasksMilestoneFiltered.length === 0 ? t('detail.noTasksYet') : t('detail.noTasksMatch')}
                </div>
              ) : (
                <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleTaskDragEnd}>
                  <SortableContext items={projectTasksListFiltered.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                    <AnimatePresence mode="popLayout">
                      {projectTasksListFiltered.map((task) => {
                        const isChecked = selectedTaskIds.has(task.id);
                        return (
                          <div
                            key={task.id}
                            className="mb-1.5 flex items-center gap-2"
                            onClick={(e) => {
                              if (selectionMode) {
                                e.stopPropagation();
                                toggleTaskSelection(task.id, e.shiftKey);
                              } else {
                                setSelectedTaskId(task.id);
                              }
                            }}
                          >
                            {selectionMode && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleTaskSelection(task.id, e.shiftKey);
                                }}
                                onPointerDown={(e) => e.stopPropagation()}
                                className="w-4 h-4 rounded flex items-center justify-center shrink-0 transition-all"
                                style={{
                                  background: isChecked ? 'var(--accent)' : 'transparent',
                                  border: `1px solid ${isChecked ? 'var(--accent)' : 'var(--brd2)'}`,
                                }}
                                title={t('detail.selectTaskTitle')}
                              >
                                {isChecked && (
                                  <svg width="9" height="8" viewBox="0 0 7 6">
                                    <path d="M1 3L2.5 4.5L6 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                )}
                              </button>
                            )}
                            <div className="flex-1 min-w-0">
                              <TaskItem
                                task={task}
                                isActive={false}
                                isSelected={task.id === selectedTaskId}
                                isMultiSelected={isChecked}
                                projectName={project.name}
                                projectColor={project.color}
                                onToggle={() => toggleTask(task.id)}
                                onUpdate={(partial) => updateTask(task.id, partial)}
                                onSetActive={() => {}}
                                onPlay={() => handlePlay(task)}
                                onContextMenu={() => {}}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </AnimatePresence>
                  </SortableContext>
                </DndContext>
              )}

              {selectionMode && selectedTaskIds.size > 0 && (
                <div
                  className="sticky bottom-2 mt-3 flex items-center gap-1 px-2 py-1.5 rounded-xl z-20"
                  style={{
                    background: 'var(--card)',
                    border: '1px solid var(--brd2)',
                    boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
                  }}
                >
                  <span className="text-[11.5px] font-semibold px-2" style={{ color: 'var(--t) ' }}>
                    {t('detail.selectedCount', { count: selectedTaskIds.size })}
                  </span>

                  <div className="relative">
                    <button
                      onClick={() => setBulkPopover(bulkPopover === 'priority' ? null : 'priority')}
                      className="flex items-center gap-1 px-2 py-1 rounded-md text-[11.5px] transition-colors"
                      style={{ color: 'var(--t2)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--card-h)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <Flag size={11} />
                      {t('detail.priorityFilter')}
                    </button>
                    <AnimatePresence>
                      <FilterPopover open={bulkPopover === 'priority'} onClose={() => setBulkPopover(null)} anchor="left">
                        {(['p1', 'p2', 'p3', 'p4'] as Priority[]).map((p) => (
                          <FilterRadioRow
                            key={p}
                            checked={false}
                            label={p.toUpperCase()}
                            onClick={() => bulkSetPriority(p)}
                          />
                        ))}
                      </FilterPopover>
                    </AnimatePresence>
                  </div>

                  <div className="relative">
                    <button
                      onClick={() => setBulkPopover(bulkPopover === 'status' ? null : 'status')}
                      className="flex items-center gap-1 px-2 py-1 rounded-md text-[11.5px] transition-colors"
                      style={{ color: 'var(--t2)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--card-h)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <Filter size={11} />
                      {t('detail.statusFilter')}
                    </button>
                    <AnimatePresence>
                      <FilterPopover open={bulkPopover === 'status'} onClose={() => setBulkPopover(null)} anchor="left">
                        {(['todo', 'in_progress', 'done', 'blocked'] as TaskStatus[]).map((s) => (
                          <FilterRadioRow
                            key={s}
                            checked={false}
                            label={TASK_STATUS_META[s].label}
                            onClick={() => bulkSetStatus(s)}
                          />
                        ))}
                      </FilterPopover>
                    </AnimatePresence>
                  </div>

                  <div className="relative">
                    <button
                      onClick={() => setBulkPopover(bulkPopover === 'milestone' ? null : 'milestone')}
                      className="flex items-center gap-1 px-2 py-1 rounded-md text-[11.5px] transition-colors"
                      style={{ color: 'var(--t2)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--card-h)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <Target size={11} />
                      {t('detail.bulkMilestone')}
                    </button>
                    <AnimatePresence>
                      <FilterPopover open={bulkPopover === 'milestone'} onClose={() => setBulkPopover(null)} anchor="left">
                        <FilterRadioRow
                          checked={false}
                          label={t('detail.noMilestoneOpt')}
                          onClick={() => bulkSetMilestone(undefined)}
                        />
                        {project.milestones.map((m) => (
                          <FilterRadioRow
                            key={m.id}
                            checked={false}
                            label={m.title}
                            onClick={() => bulkSetMilestone(m.id)}
                          />
                        ))}
                      </FilterPopover>
                    </AnimatePresence>
                  </div>

                  <button
                    onClick={bulkToggleComplete}
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-[11.5px] transition-colors"
                    style={{ color: anyIncompleteSelected ? 'var(--grn)' : 'var(--t2)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--card-h)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    {anyIncompleteSelected ? <CheckCircle2 size={11} /> : <Circle size={11} />}
                    {anyIncompleteSelected ? t('detail.bulkComplete') : t('detail.bulkReopen')}
                  </button>

                  <button
                    onClick={bulkDelete}
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-[11.5px] transition-colors"
                    style={{ color: 'var(--accent)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,77,77,0.08)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <Trash2 size={11} />
                    {t('detail.bulkDelete')}
                  </button>

                  <div className="w-px h-5 mx-1" style={{ background: 'var(--brd)' }} />

                  <button
                    onClick={() => setSelectedTaskIds(new Set())}
                    className="w-6 h-6 flex items-center justify-center rounded-md transition-colors"
                    style={{ color: 'var(--t3)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--card-h)'; e.currentTarget.style.color = 'var(--t2)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--t3)'; }}
                    title={t('detail.clearSelectionTitle')}
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Notes — full-width section after tasks */}
          <ProjectNotes
            value={project.notes}
            onChange={(notes) => updateProject(project.id, { notes })}
            accentColor={project.color}
            onOpenTask={(id) => setSelectedTaskId(id)}
            /* onOpenProject would require a router-up callback; deferred. */
          />
        </div>
      </div>

      {/* Task detail panel — slides in over content */}
      <AnimatePresence>
        {selectedTask && (
          <TaskDetailPanel
            task={selectedTask}
            projects={projects}
            onClose={() => setSelectedTaskId(null)}
            onUpdate={(partial) => updateTask(selectedTask.id, partial)}
            onDelete={() => { deleteTask(selectedTask.id); setSelectedTaskId(null); }}
          />
        )}
      </AnimatePresence>

      {/* Icon picker popover */}
      <AnimatePresence>
        {iconPickerRect && (
          <ProjectIconPicker
            current={project.icon}
            projectColor={project.color}
            anchorRect={iconPickerRect}
            onPick={(emoji) => {
              updateProject(project.id, { icon: emoji });
              setIconPickerRect(null);
            }}
            onClose={() => setIconPickerRect(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
