CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0,
  priority TEXT NOT NULL DEFAULT 'p4',
  pomodoroEstimate INTEGER NOT NULL DEFAULT 1,
  pomodoroCompleted INTEGER NOT NULL DEFAULT 0,
  tags TEXT NOT NULL DEFAULT '[]',
  subtasks TEXT NOT NULL DEFAULT '[]',
  createdAt INTEGER NOT NULL,
  completedAt INTEGER,
  dueDate TEXT,
  projectId TEXT,
  reminder INTEGER,
  repeatType TEXT NOT NULL DEFAULT 'none',
  customWorkDuration INTEGER,
  customShortBreakDuration INTEGER,
  customLongBreakDuration INTEGER,
  sortOrder INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  createdAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  startedAt INTEGER NOT NULL,
  duration INTEGER NOT NULL,
  phase TEXT NOT NULL,
  taskId TEXT,
  taskTitle TEXT
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS focus_days (
  date TEXT PRIMARY KEY,
  seconds INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT
);

INSERT OR IGNORE INTO meta (key, value) VALUES ('activeTaskId', NULL);
