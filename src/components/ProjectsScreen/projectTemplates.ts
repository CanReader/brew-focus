import i18n from '../../i18n';
import { Priority, TaskType } from '../../types';

export interface TemplateMilestone {
  /** Stable key inside templates.<i18nKey>.milestones */
  i18nKey?: string;
  title: string;
  daysFromNow?: number;
}

export interface TemplateTask {
  /** Stable key inside templates.<i18nKey>.tasks */
  i18nKey?: string;
  title: string;
  type?: TaskType;
  priority?: Priority;
  pomodoroEstimate?: number;
}

export interface ProjectTemplate {
  id: string;
  /** Top-level key inside the `templates` namespace. */
  i18nKey: string;
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
    i18nKey: 'software',
    name: 'Software Project',
    emoji: '🚀',
    description: 'Specs, milestones, MVP — the dev arc.',
    suggestedColor: '#5b8dee',
    milestones: [
      { i18nKey: 'specLocked',   title: 'Spec locked',   daysFromNow: 7 },
      { i18nKey: 'prototype',    title: 'Prototype',     daysFromNow: 21 },
      { i18nKey: 'mvpShippable', title: 'MVP shippable', daysFromNow: 45 },
      { i18nKey: 'v1Release',    title: 'v1.0 release',  daysFromNow: 90 },
    ],
    tasks: [
      { i18nKey: 'writeOnePager', title: 'Write one-pager',   type: 'chore', priority: 'p2', pomodoroEstimate: 2 },
      { i18nKey: 'setupRepo',     title: 'Set up repository', type: 'chore', priority: 'p3', pomodoroEstimate: 1 },
      { i18nKey: 'defineMVP',     title: 'Define MVP scope',  type: 'idea',  priority: 'p1', pomodoroEstimate: 2 },
    ],
  },
  {
    id: 'writing',
    i18nKey: 'writing',
    name: 'Writing Project',
    emoji: '📝',
    description: 'Outline, draft, revise, ship.',
    suggestedColor: '#e8a83e',
    milestones: [
      { i18nKey: 'outline',     title: 'Outline done',  daysFromNow: 7 },
      { i18nKey: 'firstDraft',  title: 'First draft',   daysFromNow: 30 },
      { i18nKey: 'revision',    title: 'Revision pass', daysFromNow: 45 },
      { i18nKey: 'final',       title: 'Final',         daysFromNow: 60 },
    ],
    tasks: [
      { i18nKey: 'brainstorm',   title: 'Brainstorm structure', type: 'idea', priority: 'p2', pomodoroEstimate: 2 },
      { i18nKey: 'draftOpening', title: 'Draft opening',        type: 'task', priority: 'p3', pomodoroEstimate: 3 },
    ],
  },
  {
    id: 'habit',
    i18nKey: 'habit',
    name: 'Habit / Goal',
    emoji: '🎯',
    description: 'Build something into your weeks.',
    suggestedColor: '#22d3a5',
    milestones: [
      { i18nKey: 'week1', title: 'Week 1', daysFromNow: 7 },
      { i18nKey: 'week2', title: 'Week 2', daysFromNow: 14 },
      { i18nKey: 'week4', title: 'Week 4', daysFromNow: 28 },
      { i18nKey: 'week8', title: 'Week 8', daysFromNow: 56 },
    ],
    tasks: [
      { i18nKey: 'dailyMin',     title: 'Define daily minimum',   type: 'chore', priority: 'p2', pomodoroEstimate: 1 },
      { i18nKey: 'weeklyReview', title: 'Set weekly review time', type: 'chore', priority: 'p3', pomodoroEstimate: 1 },
    ],
  },
  {
    id: 'blank',
    i18nKey: 'blank',
    name: 'Blank',
    emoji: '·',
    description: 'Start clean. Fill it yourself.',
    suggestedColor: '#94a3b8',
    milestones: [],
    tasks: [],
  },
  {
    id: 'final-exam-prep',
    i18nKey: 'finalExamPrep',
    name: 'Final Exam Prep',
    emoji: '🎓',
    description: 'Crunch-time studying for one upcoming exam.',
    suggestedColor: '#e8453c',
    defaultDurations: { work: 25, shortBreak: 5, longBreak: 15 },
    milestones: [
      { i18nKey: 'reviewNotes',  title: 'Review all lecture notes' },
      { i18nKey: 'summarySheet', title: 'Make summary sheet' },
      { i18nKey: 'pastPapers',   title: 'Practice past exam papers' },
      { i18nKey: 'mockExam',     title: 'Final timed mock exam' },
    ],
    tasks: [
      { i18nKey: 'rereadChapters',  title: 'Re-read chapters covered on the exam', type: 'task', priority: 'p1', pomodoroEstimate: 4 },
      { i18nKey: 'buildFlashcards', title: 'Build flashcards for key concepts',    type: 'task', priority: 'p2', pomodoroEstimate: 2 },
      { i18nKey: 'fullPastExam',    title: 'Solve at least one full past exam',    type: 'task', priority: 'p1', pomodoroEstimate: 3 },
    ],
  },
  {
    id: 'semester-course',
    i18nKey: 'semesterCourse',
    name: 'Semester Course',
    emoji: '📚',
    description: 'A single class tracked across the whole semester.',
    suggestedColor: '#5a9cf5',
    defaultDurations: { work: 25, shortBreak: 5, longBreak: 15 },
    milestones: [
      { i18nKey: 'foundations',  title: 'Weeks 1–4: Foundations' },
      { i18nKey: 'midtermPrep',  title: 'Midterm prep' },
      { i18nKey: 'advanced',     title: 'Weeks 8–12: Advanced material' },
      { i18nKey: 'finalPrep',    title: 'Final exam prep' },
    ],
    tasks: [
      { i18nKey: 'readSyllabus', title: 'Read syllabus and mark exam dates', type: 'chore', priority: 'p2', pomodoroEstimate: 1 },
      { i18nKey: 'noteSystem',   title: 'Set up note-taking system',         type: 'chore', priority: 'p3', pomodoroEstimate: 1 },
      { i18nKey: 'weeklyReview', title: 'Schedule weekly review session',    type: 'chore', priority: 'p3', pomodoroEstimate: 1 },
    ],
  },
  {
    id: 'thesis-dissertation',
    i18nKey: 'thesisDissertation',
    name: 'Thesis / Dissertation',
    emoji: '📖',
    description: 'Long-form academic writing across many months.',
    suggestedColor: '#a78bfa',
    defaultDurations: { work: 50, shortBreak: 10, longBreak: 20 },
    milestones: [
      { i18nKey: 'litReview',   title: 'Literature review' },
      { i18nKey: 'methodology', title: 'Methodology / research design' },
      { i18nKey: 'data',        title: 'Data collection / analysis' },
      { i18nKey: 'writing',     title: 'Writing and revisions' },
      { i18nKey: 'defense',     title: 'Defense preparation' },
    ],
    tasks: [
      { i18nKey: 'referenceLibrary', title: 'Build reference library',          type: 'chore', priority: 'p2', pomodoroEstimate: 3 },
      { i18nKey: 'outlineChapters',  title: 'Outline chapter structure',        type: 'idea',  priority: 'p1', pomodoroEstimate: 2 },
      { i18nKey: 'advisorCheckin',   title: 'Schedule weekly advisor check-in', type: 'chore', priority: 'p3', pomodoroEstimate: 1 },
    ],
  },
  {
    id: 'research-paper',
    i18nKey: 'researchPaper',
    name: 'Research Paper',
    emoji: '📝',
    description: 'Single research paper or long essay.',
    suggestedColor: '#e8a83e',
    defaultDurations: { work: 50, shortBreak: 10, longBreak: 15 },
    milestones: [
      { i18nKey: 'topicResearch', title: 'Topic research and sources' },
      { i18nKey: 'outline',       title: 'Outline and thesis statement' },
      { i18nKey: 'firstDraft',    title: 'First draft' },
      { i18nKey: 'revisions',     title: 'Revisions and citations' },
    ],
    tasks: [
      { i18nKey: 'findSources', title: 'Find at least 10 academic sources', type: 'task', priority: 'p1', pomodoroEstimate: 4 },
      { i18nKey: 'writeOutline', title: 'Write outline',                    type: 'task', priority: 'p2', pomodoroEstimate: 2 },
      { i18nKey: 'draftIntro',   title: 'Draft introduction',               type: 'task', priority: 'p2', pomodoroEstimate: 3 },
    ],
  },
  {
    id: 'lab-report',
    i18nKey: 'labReport',
    name: 'Lab Report',
    emoji: '🧪',
    description: 'Short-deadline lab write-up.',
    suggestedColor: '#34c759',
    defaultDurations: { work: 30, shortBreak: 5, longBreak: 15 },
    milestones: [
      { i18nKey: 'methods',    title: 'Methods and procedure' },
      { i18nKey: 'results',    title: 'Results and data' },
      { i18nKey: 'discussion', title: 'Discussion' },
      { i18nKey: 'submit',     title: 'Format and submit' },
    ],
    tasks: [
      { i18nKey: 'gatherData',    title: 'Gather lab data and observations', type: 'task', priority: 'p1', pomodoroEstimate: 2 },
      { i18nKey: 'draftMethods',  title: 'Draft methods section',            type: 'task', priority: 'p2', pomodoroEstimate: 2 },
      { i18nKey: 'createFigures', title: 'Create figures and tables',        type: 'task', priority: 'p2', pomodoroEstimate: 2 },
    ],
  },
  {
    id: 'math-problem-set',
    i18nKey: 'mathProblemSet',
    name: 'Math / Problem Set',
    emoji: '➗',
    description: 'Homework problem grinding for math, physics, or CS.',
    suggestedColor: '#06b6d4',
    defaultDurations: { work: 25, shortBreak: 5, longBreak: 15 },
    milestones: [
      { i18nKey: 'readChapter',     title: 'Read assigned chapter' },
      { i18nKey: 'exampleProblems', title: 'Work through example problems' },
      { i18nKey: 'completeSet',     title: 'Complete assigned set' },
      { i18nKey: 'reviewMistakes',  title: 'Review mistakes' },
    ],
    tasks: [
      { i18nKey: 'skimChapter',   title: 'Skim chapter for key formulas', type: 'task', priority: 'p2', pomodoroEstimate: 1 },
      { i18nKey: 'solvePractice', title: 'Solve practice problems',       type: 'task', priority: 'p1', pomodoroEstimate: 3 },
      { i18nKey: 'checkAnswers',  title: 'Check answers',                 type: 'task', priority: 'p3', pomodoroEstimate: 1 },
    ],
  },
  {
    id: 'reading-assignment',
    i18nKey: 'readingAssignment',
    name: 'Reading Assignment',
    emoji: '📕',
    description: 'Required reading with notes and summaries.',
    suggestedColor: '#f97316',
    defaultDurations: { work: 30, shortBreak: 5, longBreak: 15 },
    milestones: [
      { i18nKey: 'skim',          title: 'Skim and preview' },
      { i18nKey: 'activeReading', title: 'Active reading with notes' },
      { i18nKey: 'summarize',     title: 'Summarize main ideas' },
      { i18nKey: 'discussion',    title: 'Discussion / quiz prep' },
    ],
    tasks: [
      { i18nKey: 'readFirstQuarter', title: 'Read first 25%',              type: 'task', priority: 'p2', pomodoroEstimate: 2 },
      { i18nKey: 'takeNotes',        title: 'Take notes on key arguments', type: 'task', priority: 'p2', pomodoroEstimate: 2 },
      { i18nKey: 'writeSummary',     title: 'Write one-paragraph summary', type: 'task', priority: 'p3', pomodoroEstimate: 1 },
    ],
  },
  {
    id: 'university-entrance-exam',
    i18nKey: 'universityEntranceExam',
    name: 'University Entrance Exam',
    emoji: '🏛️',
    description: 'Long-haul prep for SAT, GRE, YKS, JEE, GAOKAO, and other university entrance exams.',
    suggestedColor: '#f472b6',
    defaultDurations: { work: 50, shortBreak: 10, longBreak: 20 },
    milestones: [
      { i18nKey: 'diagnostic',  title: 'Diagnostic test and target score' },
      { i18nKey: 'phase1',      title: 'Subject mastery: phase 1' },
      { i18nKey: 'phase2',      title: 'Subject mastery: phase 2' },
      { i18nKey: 'timed',       title: 'Timed practice tests' },
      { i18nKey: 'finalReview', title: 'Final week review' },
    ],
    tasks: [
      { i18nKey: 'fullDiagnostic', title: 'Take a full diagnostic / mock test', type: 'task',  priority: 'p1', pomodoroEstimate: 4 },
      { i18nKey: 'studySchedule',  title: 'Build study schedule by section',    type: 'chore', priority: 'p2', pomodoroEstimate: 1 },
      { i18nKey: 'weakTopics',     title: 'Review weak topics weekly',          type: 'task',  priority: 'p2', pomodoroEstimate: 3 },
    ],
  },
];

/**
 * Resolve a template's display name in the active locale, falling back to the
 * English baked-in `name` field if the i18n key is missing.
 */
export function getTemplateName(tpl: ProjectTemplate): string {
  const key = `${tpl.i18nKey}.name`;
  const tr = i18n.t(key, { ns: 'templates', defaultValue: '' });
  return tr || tpl.name;
}

export function getTemplateDescription(tpl: ProjectTemplate): string {
  const key = `${tpl.i18nKey}.description`;
  const tr = i18n.t(key, { ns: 'templates', defaultValue: '' });
  return tr || tpl.description;
}

export function localizeTemplateMilestones(tpl: ProjectTemplate): TemplateMilestone[] {
  return tpl.milestones.map((m) => {
    if (!m.i18nKey) return m;
    const tr = i18n.t(`${tpl.i18nKey}.milestones.${m.i18nKey}`, {
      ns: 'templates',
      defaultValue: '',
    });
    return { ...m, title: tr || m.title };
  });
}

export function localizeTemplateTasks(tpl: ProjectTemplate): TemplateTask[] {
  return tpl.tasks.map((task) => {
    if (!task.i18nKey) return task;
    const tr = i18n.t(`${tpl.i18nKey}.tasks.${task.i18nKey}`, {
      ns: 'templates',
      defaultValue: '',
    });
    return { ...task, title: tr || task.title };
  });
}

export function templateById(id: string): ProjectTemplate | undefined {
  return PROJECT_TEMPLATES.find((t) => t.id === id);
}

export function daysFromNowMs(days: number): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d.getTime();
}
