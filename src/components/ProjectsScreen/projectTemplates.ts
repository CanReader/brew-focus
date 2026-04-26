import { Priority, TaskType } from '../../types';

export interface TemplateMilestone {
  title: string;
  daysFromNow?: number;
}

export interface TemplateTask {
  title: string;
  type?: TaskType;
  priority?: Priority;
  pomodoroEstimate?: number;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  emoji: string;
  description: string;
  suggestedColor: string;
  milestones: TemplateMilestone[];
  tasks: TemplateTask[];
  /** Pomodoro defaults applied to the new project's `custom*Duration` columns. */
  defaultDurations?: {
    work?: number;
    shortBreak?: number;
    longBreak?: number;
    longBreakInterval?: number;
    skipLongBreak?: boolean;
  };
}

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'software',
    name: 'Software Project',
    emoji: '🚀',
    description: 'Specs, milestones, MVP — the dev arc.',
    suggestedColor: '#5b8dee',
    milestones: [
      { title: 'Spec locked',   daysFromNow: 7 },
      { title: 'Prototype',     daysFromNow: 21 },
      { title: 'MVP shippable', daysFromNow: 45 },
      { title: 'v1.0 release',  daysFromNow: 90 },
    ],
    tasks: [
      { title: 'Write one-pager',     type: 'chore',   priority: 'p2', pomodoroEstimate: 2 },
      { title: 'Set up repository',   type: 'chore',   priority: 'p3', pomodoroEstimate: 1 },
      { title: 'Define MVP scope',    type: 'idea',    priority: 'p1', pomodoroEstimate: 2 },
    ],
  },
  {
    id: 'writing',
    name: 'Writing Project',
    emoji: '📝',
    description: 'Outline, draft, revise, ship.',
    suggestedColor: '#e8a83e',
    milestones: [
      { title: 'Outline done',  daysFromNow: 7 },
      { title: 'First draft',   daysFromNow: 30 },
      { title: 'Revision pass', daysFromNow: 45 },
      { title: 'Final',         daysFromNow: 60 },
    ],
    tasks: [
      { title: 'Brainstorm structure', type: 'idea', priority: 'p2', pomodoroEstimate: 2 },
      { title: 'Draft opening',        type: 'task', priority: 'p3', pomodoroEstimate: 3 },
    ],
  },
  {
    id: 'habit',
    name: 'Habit / Goal',
    emoji: '🎯',
    description: 'Build something into your weeks.',
    suggestedColor: '#22d3a5',
    milestones: [
      { title: 'Week 1', daysFromNow: 7 },
      { title: 'Week 2', daysFromNow: 14 },
      { title: 'Week 4', daysFromNow: 28 },
      { title: 'Week 8', daysFromNow: 56 },
    ],
    tasks: [
      { title: 'Define daily minimum',     type: 'chore', priority: 'p2', pomodoroEstimate: 1 },
      { title: 'Set weekly review time',   type: 'chore', priority: 'p3', pomodoroEstimate: 1 },
    ],
  },
  {
    id: 'blank',
    name: 'Blank',
    emoji: '·',
    description: 'Start clean. Fill it yourself.',
    suggestedColor: '#94a3b8',
    milestones: [],
    tasks: [],
  },
  {
    id: 'final-exam-prep',
    name: 'Final Exam Prep',
    emoji: '🎓',
    description: 'Crunch-time studying for one upcoming exam.',
    suggestedColor: '#e8453c',
    defaultDurations: { work: 25, shortBreak: 5, longBreak: 15 },
    milestones: [
      { title: 'Review all lecture notes' },
      { title: 'Make summary sheet' },
      { title: 'Practice past exam papers' },
      { title: 'Final timed mock exam' },
    ],
    tasks: [
      { title: 'Re-read chapters covered on the exam', type: 'task', priority: 'p1', pomodoroEstimate: 4 },
      { title: 'Build flashcards for key concepts',    type: 'task', priority: 'p2', pomodoroEstimate: 2 },
      { title: 'Solve at least one full past exam',    type: 'task', priority: 'p1', pomodoroEstimate: 3 },
    ],
  },
  {
    id: 'semester-course',
    name: 'Semester Course',
    emoji: '📚',
    description: 'A single class tracked across the whole semester.',
    suggestedColor: '#5a9cf5',
    defaultDurations: { work: 25, shortBreak: 5, longBreak: 15 },
    milestones: [
      { title: 'Weeks 1–4: Foundations' },
      { title: 'Midterm prep' },
      { title: 'Weeks 8–12: Advanced material' },
      { title: 'Final exam prep' },
    ],
    tasks: [
      { title: 'Read syllabus and mark exam dates', type: 'chore', priority: 'p2', pomodoroEstimate: 1 },
      { title: 'Set up note-taking system',         type: 'chore', priority: 'p3', pomodoroEstimate: 1 },
      { title: 'Schedule weekly review session',    type: 'chore', priority: 'p3', pomodoroEstimate: 1 },
    ],
  },
  {
    id: 'thesis-dissertation',
    name: 'Thesis / Dissertation',
    emoji: '📖',
    description: 'Long-form academic writing across many months.',
    suggestedColor: '#a78bfa',
    defaultDurations: { work: 50, shortBreak: 10, longBreak: 20 },
    milestones: [
      { title: 'Literature review' },
      { title: 'Methodology / research design' },
      { title: 'Data collection / analysis' },
      { title: 'Writing and revisions' },
      { title: 'Defense preparation' },
    ],
    tasks: [
      { title: 'Build reference library',            type: 'chore', priority: 'p2', pomodoroEstimate: 3 },
      { title: 'Outline chapter structure',          type: 'idea',  priority: 'p1', pomodoroEstimate: 2 },
      { title: 'Schedule weekly advisor check-in',   type: 'chore', priority: 'p3', pomodoroEstimate: 1 },
    ],
  },
  {
    id: 'research-paper',
    name: 'Research Paper',
    emoji: '📝',
    description: 'Single research paper or long essay.',
    suggestedColor: '#e8a83e',
    defaultDurations: { work: 50, shortBreak: 10, longBreak: 15 },
    milestones: [
      { title: 'Topic research and sources' },
      { title: 'Outline and thesis statement' },
      { title: 'First draft' },
      { title: 'Revisions and citations' },
    ],
    tasks: [
      { title: 'Find at least 10 academic sources', type: 'task', priority: 'p1', pomodoroEstimate: 4 },
      { title: 'Write outline',                     type: 'task', priority: 'p2', pomodoroEstimate: 2 },
      { title: 'Draft introduction',                type: 'task', priority: 'p2', pomodoroEstimate: 3 },
    ],
  },
  {
    id: 'lab-report',
    name: 'Lab Report',
    emoji: '🧪',
    description: 'Short-deadline lab write-up.',
    suggestedColor: '#34c759',
    defaultDurations: { work: 30, shortBreak: 5, longBreak: 15 },
    milestones: [
      { title: 'Methods and procedure' },
      { title: 'Results and data' },
      { title: 'Discussion' },
      { title: 'Format and submit' },
    ],
    tasks: [
      { title: 'Gather lab data and observations', type: 'task', priority: 'p1', pomodoroEstimate: 2 },
      { title: 'Draft methods section',            type: 'task', priority: 'p2', pomodoroEstimate: 2 },
      { title: 'Create figures and tables',        type: 'task', priority: 'p2', pomodoroEstimate: 2 },
    ],
  },
  {
    id: 'math-problem-set',
    name: 'Math / Problem Set',
    emoji: '➗',
    description: 'Homework problem grinding for math, physics, or CS.',
    suggestedColor: '#06b6d4',
    defaultDurations: { work: 25, shortBreak: 5, longBreak: 15 },
    milestones: [
      { title: 'Read assigned chapter' },
      { title: 'Work through example problems' },
      { title: 'Complete assigned set' },
      { title: 'Review mistakes' },
    ],
    tasks: [
      { title: 'Skim chapter for key formulas', type: 'task', priority: 'p2', pomodoroEstimate: 1 },
      { title: 'Solve practice problems',       type: 'task', priority: 'p1', pomodoroEstimate: 3 },
      { title: 'Check answers',                 type: 'task', priority: 'p3', pomodoroEstimate: 1 },
    ],
  },
  {
    id: 'reading-assignment',
    name: 'Reading Assignment',
    emoji: '📕',
    description: 'Required reading with notes and summaries.',
    suggestedColor: '#f97316',
    defaultDurations: { work: 30, shortBreak: 5, longBreak: 15 },
    milestones: [
      { title: 'Skim and preview' },
      { title: 'Active reading with notes' },
      { title: 'Summarize main ideas' },
      { title: 'Discussion / quiz prep' },
    ],
    tasks: [
      { title: 'Read first 25%',               type: 'task', priority: 'p2', pomodoroEstimate: 2 },
      { title: 'Take notes on key arguments',  type: 'task', priority: 'p2', pomodoroEstimate: 2 },
      { title: 'Write one-paragraph summary',  type: 'task', priority: 'p3', pomodoroEstimate: 1 },
    ],
  },
  {
    id: 'university-entrance-exam',
    name: 'University Entrance Exam',
    emoji: '🏛️',
    description: 'Long-haul prep for SAT, GRE, YKS, JEE, GAOKAO, and other university entrance exams.',
    suggestedColor: '#f472b6',
    defaultDurations: { work: 50, shortBreak: 10, longBreak: 20 },
    milestones: [
      { title: 'Diagnostic test and target score' },
      { title: 'Subject mastery: phase 1' },
      { title: 'Subject mastery: phase 2' },
      { title: 'Timed practice tests' },
      { title: 'Final week review' },
    ],
    tasks: [
      { title: 'Take a full diagnostic / mock test', type: 'task',  priority: 'p1', pomodoroEstimate: 4 },
      { title: 'Build study schedule by section',    type: 'chore', priority: 'p2', pomodoroEstimate: 1 },
      { title: 'Review weak topics weekly',          type: 'task',  priority: 'p2', pomodoroEstimate: 3 },
    ],
  },
];

export function templateById(id: string): ProjectTemplate | undefined {
  return PROJECT_TEMPLATES.find((t) => t.id === id);
}

export function daysFromNowMs(days: number): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d.getTime();
}
