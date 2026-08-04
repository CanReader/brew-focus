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

/**
 * True only for a real calendar date in YYYY-MM-DD form. Rejects overflow like
 * `2024-13-45` — `new Date(2024, 12, 45)` silently normalizes to Feb 14 2025,
 * so parsing such strings without validation corrupts the displayed due date.
 */
export function isValidIsoDate(s: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
  const dt = new Date(y, mo - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d;
}

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
  // ISO date string YYYY-MM-DD — reject calendar-invalid dates rather than
  // letting the Date constructor overflow-normalize them to a wrong day.
  if (isValidIsoDate(dueDate)) {
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
  if (isValidIsoDate(dueDate)) {
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
export type AccentColor = 'caramel' | 'red' | 'blue' | 'amber' | 'green' | 'purple' | 'pink';

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

/** Brand accents. Used on dark palettes and always in the accent picker. */
export const ACCENT_COLORS: Record<AccentColor, string> = {
  caramel: '#ca8438',
  red: '#ff4d4d',
  blue: '#5b8dee',
  amber: '#f5a623',
  green: '#22d3a5',
  purple: '#a78bfa',
  pink: '#f472b6',
};

/**
 * Light-palette tier. The brand accents are tuned for dark backgrounds and drop
 * to ~2–3:1 on light ones, which fails WCAG everywhere the accent is used as
 * text or an icon. Each entry keeps its brand hue and saturation and lowers
 * only lightness until it clears 3.5:1 against `latte` (#faf4ec) — the darkest,
 * and therefore worst-case, light background of the 8 light themes. Every entry
 * measures >= 3.51 on all of them. Static table, not a runtime darkening pass,
 * so desktop and mobile cannot drift; keep byte-identical with mobile's copy.
 */
export const ACCENT_COLORS_LIGHT: Record<AccentColor, string> = {
  caramel: '#b47430',
  red: '#ff2020',
  blue: '#467eec',
  amber: '#b57408',
  green: '#189373',
  purple: '#8d68f9',
  pink: '#ef2e93',
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
