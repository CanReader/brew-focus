// Task types
export type Priority = 'p1' | 'p2' | 'p3' | 'p4';
// DueDate can be 'today' | 'tomorrow' | 'someday' | 'YYYY-MM-DD' | null
export type DueDate = 'today' | 'tomorrow' | 'someday' | string | null;
export type RepeatType = 'none' | 'daily' | 'weekly' | 'monthly';
export type ProjectStatus = 'active' | 'on_hold' | 'completed';
export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'blocked';
/**
 * A coffee cup variant in the catalog. Variants are server-driven (see
 * `coffee_cup_variants` table + `coffee-cups` Storage bucket); the bundled
 * fallback set in `coffeeCupCatalogStore.ts` keeps the picker working offline.
 *
 * `id` is what's persisted to `AppSettings.coffeeCupVariant` — a free-form
 * string so future variants don't require a type-system change.
 */
export interface CoffeeCupVariant {
  id: string;
  label: string;
  subtitle: string;
  svgUrl: string;
  supportsSteam: boolean;
  sortOrder: number;
  isPremium: boolean;
  /** Row's `updated_at` as ms epoch. `0` means "bundled fallback, no remote
   *  version" — cache and network branches short-circuit when this is 0. */
  updatedAt: number;
}
// Free-form to allow per-project taxonomies, with sensible defaults.
export type TaskType = 'task' | 'feature' | 'bug' | 'chore' | 'idea' | string;

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Milestone {
  id: string;
  title: string;
  completed: boolean;
  targetDate?: number; // ms timestamp
}

export interface ProjectLink {
  id: string;
  label: string;
  url: string;
}

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  priority: Priority;
  pomodoroEstimate: number;
  pomodoroCompleted: number;
  tags: string[];
  subtasks: SubTask[];
  notes: string;
  createdAt: number;
  completedAt?: number;
  dueDate?: DueDate;
  projectId?: string;
  reminder?: number; // timestamp ms
  repeatType?: RepeatType; // default 'none'
  // Project-management additions
  status: TaskStatus;          // todo | in_progress | done | blocked
  type: TaskType;              // task | feature | bug | chore | idea | custom
  milestoneId?: string;        // optional link to a project milestone
  dependsOn: string[];         // task ids that must be done first
  sortOrder?: number;          // list-view manual order (DB column; see reorderTasks)
  boardPosition?: number;      // float for drag-reorder within a board column
  // Per-task timer overrides (undefined = use global settings)
  customWorkDuration?: number;       // minutes
  customShortBreakDuration?: number; // minutes
  customLongBreakDuration?: number;  // minutes
  skipLongBreak?: boolean;           // never take a long break for this task
  customLongBreakInterval?: number;  // sessions before long break (overrides global)
}

export interface Project {
  id: string;
  boardPosition?: number;      // float for drag-reorder within a board column
  name: string;
  color: string; // hex
  description: string;
  status: ProjectStatus;
  targetDate?: number; // timestamp ms
  createdAt: number;
  milestones: Milestone[];
  // Project-management additions
  links: ProjectLink[];        // repo, docs, design, etc.
  notes: string;               // long-form readme; description stays one-liner
  archived: boolean;           // hidden from default views, orthogonal to status
  priority: Priority;          // for sorting projects in the grid
  icon?: string;               // emoji override of color avatar
  weeklyFocusGoalHrs?: number; // optional weekly focus target, in hours
  // Per-project timer overrides — fall through to global settings when undefined.
  // Resolution at runtime: task override → project override → global setting.
  customWorkDuration?: number;       // minutes
  customShortBreakDuration?: number; // minutes
  customLongBreakDuration?: number;  // minutes
  customLongBreakInterval?: number;  // sessions before long break
  skipLongBreak?: boolean;           // never take a long break for tasks in this project
}

// ── Due date helpers ──────────────────────────────────────────────────────────

/** Returns midnight timestamp for a DueDate, or null if not date-specific. */
export function resolveDueDateToTs(dueDate: DueDate | undefined): number | null {
  if (!dueDate || dueDate === 'someday') return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (dueDate === 'today') return today.getTime();
  if (dueDate === 'tomorrow') {
    const t = new Date(today);
    t.setDate(t.getDate() + 1);
    return t.getTime();
  }
  // ISO date string YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    const [y, mo, d] = dueDate.split('-').map(Number);
    return new Date(y, mo - 1, d).getTime();
  }
  return null;
}

/** True if the task has a specific past due date (today is NOT overdue). */
export function isDueDateOverdue(dueDate: DueDate | undefined): boolean {
  if (!dueDate || dueDate === 'someday') return false;
  const ts = resolveDueDateToTs(dueDate);
  if (ts === null) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return ts < today.getTime();
}

/** Format a DueDate for display (e.g. "Today", "Apr 5", "Someday"). */
export function formatDueDateDisplay(dueDate: DueDate | undefined): string {
  if (!dueDate) return 'None';
  if (dueDate === 'today') return 'Today';
  if (dueDate === 'tomorrow') return 'Tomorrow';
  if (dueDate === 'someday') return 'Someday';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    const [y, mo, d] = dueDate.split('-').map(Number);
    return new Date(y, mo - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return dueDate;
}

// Saved views ────────────────────────────────────────────────────────────────

export type SavedSortBy = 'manual' | 'priority' | 'dueDate' | 'created' | 'sessions';

export interface SavedView {
  id: string;
  name: string;
  /** Encoded sidebar view (e.g. "today", "all", "tag:foo", or a project id) */
  view: string;
  sortBy: SavedSortBy;
  searchQuery: string;
}

// Daily Focus Queue ──────────────────────────────────────────────────────────

export interface DailyQueueState {
  taskIds: string[];
  /** ISO yyyy-mm-dd of the last day that completed items were swept. */
  lastSweepDate: string;
}

// Activity log types ───────────────────────────────────────────────────────────

export type ActivityEventType =
  | 'task.created'
  | 'task.completed'
  | 'task.uncompleted'
  | 'task.status_changed'
  | 'task.priority_changed'
  | 'task.milestone_changed'
  | 'task.project_changed'
  | 'focus.session_completed';

export interface ActivityEvent {
  id: string;
  taskId?: string;
  projectId?: string;
  type: ActivityEventType;
  payload: Record<string, unknown>; // free-form per type
  createdAt: number;
}

// Timer types
export type TimerPhase = 'work' | 'shortBreak' | 'longBreak';

export interface TimerSession {
  id: string;
  startedAt: number;
  duration: number; // seconds
  phase: TimerPhase;
  taskId?: string;
  taskTitle?: string;
  projectId?: string;        // denormalized at write-time for per-project stats
  notes?: string;
  mood?: number; // 1–5 energy/mood rating
}

// Settings types
export type AccentColor = 'red' | 'blue' | 'amber' | 'green' | 'purple' | 'pink';

export interface AppSettings {
  workDuration: number; // minutes
  shortBreakDuration: number; // minutes
  longBreakDuration: number; // minutes
  autoStartBreaks: boolean;
  autoStartPomodoros: boolean;
  dailyFocusGoal: number; // hours
  soundNotifications: boolean;
  clickSounds: boolean;
  soundVolume: number; // 0–100
  accentColor: AccentColor;
  longBreakInterval: number; // after how many pomodoros
  theme: string; // theme id
  backgroundId: string;
  customBackgroundDataUrl: string; // base64 data URL when backgroundId === 'custom'
  sessionStartSound: string;
  breakStartSound: string;
  sessionCompleteSound: string;
  breakCompleteSound: string;
  // Custom uploaded sound files (data URLs), keyed by event name
  customSoundFiles: Record<string, { name: string; dataUrl: string }>;
  // Background noise
  backgroundNoise: string;  // noise id, 'none' = off
  noiseVolume: number;      // 0–100
  // Round 3 — productivity layers
  savedViews: SavedView[];
  dailyQueue: DailyQueueState;
  /** Variant id — see `coffeeCupCatalogStore` for the catalog and bundled defaults. */
  coffeeCupVariant: string;
}

// Store types
export interface TimerState {
  phase: TimerPhase;
  secondsLeft: number;
  totalSeconds: number;
  isRunning: boolean;
  sessionCount: number;
  completedPomodoros: number;
  activeTaskId: string | null;
  sessions: TimerSession[];
  todayFocusSeconds: number;
  lastResetDate: string;
}

export interface TaskState {
  tasks: Task[];
  projects: Project[];
  activeTaskId: string | null;
}

export const ACCENT_COLORS: Record<AccentColor, string> = {
  red: '#ff4d4d',
  blue: '#5b8dee',
  amber: '#f5a623',
  green: '#22d3a5',
  purple: '#a78bfa',
  pink: '#f472b6',
};

export const PROJECT_COLORS = [
  '#e8453c', '#f97316', '#e8a83e', '#84cc16',
  '#34c759', '#06b6d4', '#5a9cf5', '#a78bfa',
  '#f472b6', '#94a3b8',
];

// ── Task status / type metadata ───────────────────────────────────────────────

export const TASK_STATUS_META: Record<TaskStatus, { label: string; color: string; dot: string }> = {
  todo:        { label: 'Backlog',     color: 'var(--t3)',   dot: 'var(--t3)' },
  in_progress: { label: 'In Progress', color: 'var(--blu)',  dot: 'var(--blu)' },
  done:        { label: 'Done',        color: 'var(--grn)',  dot: 'var(--grn)' },
  blocked:     { label: 'Blocked',     color: 'var(--amb)',  dot: 'var(--amb)' },
};

export const TASK_STATUS_ORDER: TaskStatus[] = ['todo', 'in_progress', 'done'];

export const DEFAULT_TASK_TYPES: { value: TaskType; label: string; color: string }[] = [
  { value: 'task',    label: 'Task',    color: 'var(--t3)'    },
  { value: 'feature', label: 'Feature', color: 'var(--blu)'   },
  { value: 'bug',     label: 'Bug',     color: 'var(--accent)' },
  { value: 'chore',   label: 'Chore',   color: 'var(--amb)'   },
  { value: 'idea',    label: 'Idea',    color: 'var(--grn)'   },
];

export function taskTypeColor(type: TaskType): string {
  return DEFAULT_TASK_TYPES.find((t) => t.value === type)?.color ?? 'var(--t3)';
}
