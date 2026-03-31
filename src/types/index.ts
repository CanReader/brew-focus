// Task types
export type Priority = 'p1' | 'p2' | 'p3' | 'p4';
export type DueDate = 'today' | 'tomorrow' | 'someday' | null;
export type RepeatType = 'none' | 'daily' | 'weekly' | 'monthly';

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
