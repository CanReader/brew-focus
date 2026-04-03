// Task types
export type Priority = 'p1' | 'p2' | 'p3' | 'p4';
// DueDate can be 'today' | 'tomorrow' | 'someday' | 'YYYY-MM-DD' | null
export type DueDate = 'today' | 'tomorrow' | 'someday' | string | null;
export type RepeatType = 'none' | 'daily' | 'weekly' | 'monthly';
export type ProjectStatus = 'active' | 'on_hold' | 'completed';

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
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
  // Per-task timer overrides (undefined = use global settings)
  customWorkDuration?: number;       // minutes
  customShortBreakDuration?: number; // minutes
  customLongBreakDuration?: number;  // minutes
}

export interface Project {
  id: string;
  name: string;
  color: string; // hex
  description: string;
  status: ProjectStatus;
  targetDate?: number; // timestamp ms
  createdAt: number;
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

// Timer types
export type TimerPhase = 'work' | 'shortBreak' | 'longBreak';

export interface TimerSession {
  id: string;
  startedAt: number;
  duration: number; // seconds
  phase: TimerPhase;
  taskId?: string;
  taskTitle?: string;
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
  accentColor: AccentColor;
  longBreakInterval: number; // after how many pomodoros
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
  red: '#e8453c',
  blue: '#5a9cf5',
  amber: '#e8a83e',
  green: '#34c759',
  purple: '#a78bfa',
  pink: '#f472b6',
};

export const PROJECT_COLORS = [
  '#e8453c', '#f97316', '#e8a83e', '#84cc16',
  '#34c759', '#06b6d4', '#5a9cf5', '#a78bfa',
  '#f472b6', '#94a3b8',
];
