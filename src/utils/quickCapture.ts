import { DueDate, Priority, Project, TaskType, DEFAULT_TASK_TYPES } from '../types';

export interface ParsedTask {
  title: string;
  dueDate?: DueDate;
  type?: TaskType;
  projectId?: string;
  priority?: Priority;
  pomodoroEstimate?: number;
  // Tokens that didn't resolve to anything (kept so the UI can warn).
  unknownTokens: { token: string; suggestion?: string }[];
  // Tokens that resolved, in their original positions, so chips can render.
  chips: ParsedChip[];
}

export type ParsedChip =
  | { kind: 'date'; raw: string; value: DueDate; label: string }
  | { kind: 'type'; raw: string; value: TaskType }
  | { kind: 'project'; raw: string; projectId: string; name: string; color: string }
  | { kind: 'project-new'; raw: string; name: string }
  | { kind: 'priority'; raw: string; value: Priority }
  | { kind: 'pomodoros'; raw: string; value: number };

const DATE_KEYWORDS: Record<string, DueDate> = {
  today: 'today',
  tomorrow: 'tomorrow',
  someday: 'someday',
  tom: 'tomorrow',
};

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[m][n];
}

function suggestDate(input: string): string | undefined {
  const k = Object.keys(DATE_KEYWORDS);
  let best: string | undefined; let bestDist = 99;
  for (const opt of k) {
    const d = levenshtein(input.toLowerCase(), opt);
    if (d < bestDist && d <= 2) { bestDist = d; best = opt; }
  }
  return best;
}

function suggestType(input: string): string | undefined {
  let best: string | undefined; let bestDist = 99;
  for (const t of DEFAULT_TASK_TYPES) {
    const d = levenshtein(input.toLowerCase(), t.value);
    if (d < bestDist && d <= 2) { bestDist = d; best = t.value; }
  }
  return best;
}

function fuzzyProject(name: string, projects: Project[]): Project | undefined {
  const q = name.toLowerCase();
  // exact id or name match first
  const exact = projects.find((p) => p.id === name || p.name.toLowerCase() === q);
  if (exact) return exact;
  // startsWith match
  const startsWith = projects.find((p) => p.name.toLowerCase().startsWith(q));
  if (startsWith) return startsWith;
  // contains match
  const contains = projects.find((p) => p.name.toLowerCase().includes(q));
  if (contains) return contains;
  // levenshtein within 2
  let best: Project | undefined; let bestDist = 99;
  for (const p of projects) {
    const d = levenshtein(q, p.name.toLowerCase());
    if (d < bestDist && d <= 2) { bestDist = d; best = p; }
  }
  return best;
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TOKEN_RE = /([!#@+*])([A-Za-z0-9-]+)/g;

/**
 * Parse a freeform task input into structured fields.
 *
 * Tokens (anywhere in the string):
 *   !today / !tomorrow / !someday / !YYYY-MM-DD  → dueDate
 *   #feature / #bug / #chore / #idea / #task     → type
 *   @projectName                                   → projectId (fuzzy)
 *   +p1 / +p2 / +p3 / +p4                          → priority
 *   *N (1-9)                                       → pomodoroEstimate
 *
 * Tokens are stripped from the title. Multiple instances of the same token
 * are last-write-wins.
 */
export function parseQuickTask(
  raw: string,
  projects: Project[],
  opts?: { boundProjectId?: string }
): ParsedTask {
  const out: ParsedTask = { title: raw, unknownTokens: [], chips: [] };
  const matches: { full: string; sigil: string; body: string; index: number }[] = [];
  let m: RegExpExecArray | null;
  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(raw)) !== null) {
    matches.push({ full: m[0], sigil: m[1], body: m[2], index: m.index });
  }
  // Remove tokens from title (right-to-left to preserve indices).
  let title = raw;
  for (let i = matches.length - 1; i >= 0; i--) {
    const { index, full } = matches[i];
    title = title.slice(0, index) + title.slice(index + full.length);
  }
  out.title = title.replace(/\s+/g, ' ').trim();

  for (const tok of matches) {
    const { sigil, body, full } = tok;
    if (sigil === '!') {
      const lc = body.toLowerCase();
      if (DATE_KEYWORDS[lc]) {
        const v = DATE_KEYWORDS[lc];
        out.dueDate = v;
        out.chips.push({ kind: 'date', raw: full, value: v, label: typeof v === 'string' ? v[0].toUpperCase() + v.slice(1) : '' });
      } else if (ISO_DATE_RE.test(body)) {
        out.dueDate = body;
        out.chips.push({ kind: 'date', raw: full, value: body, label: body });
      } else {
        out.unknownTokens.push({ token: full, suggestion: suggestDate(body) });
      }
    } else if (sigil === '#') {
      const lc = body.toLowerCase();
      if (DEFAULT_TASK_TYPES.find((t) => t.value === lc)) {
        out.type = lc;
        out.chips.push({ kind: 'type', raw: full, value: lc });
      } else {
        out.unknownTokens.push({ token: full, suggestion: suggestType(body) });
      }
    } else if (sigil === '@') {
      if (opts?.boundProjectId) {
        // Already bound to a project — silently strip the token.
        continue;
      }
      const proj = fuzzyProject(body, projects);
      if (proj) {
        out.projectId = proj.id;
        out.chips.push({ kind: 'project', raw: full, projectId: proj.id, name: proj.name, color: proj.color });
      } else {
        out.chips.push({ kind: 'project-new', raw: full, name: body });
      }
    } else if (sigil === '+') {
      const lc = body.toLowerCase();
      if (lc === 'p1' || lc === 'p2' || lc === 'p3' || lc === 'p4') {
        out.priority = lc as Priority;
        out.chips.push({ kind: 'priority', raw: full, value: lc as Priority });
      } else {
        out.unknownTokens.push({ token: full });
      }
    } else if (sigil === '*') {
      const n = parseInt(body, 10);
      if (Number.isFinite(n) && n >= 1 && n <= 9) {
        out.pomodoroEstimate = n;
        out.chips.push({ kind: 'pomodoros', raw: full, value: n });
      } else {
        out.unknownTokens.push({ token: full });
      }
    }
  }

  return out;
}

/**
 * Returns positional segments for rendering: alternating plain text and tokens.
 * Each token segment has metadata about whether it resolved.
 */
export type RenderSegment =
  | { kind: 'text'; value: string }
  | { kind: 'token'; raw: string; resolved: boolean; chip?: ParsedChip; suggestion?: string };

export function renderSegments(raw: string, parsed: ParsedTask): RenderSegment[] {
  const segments: RenderSegment[] = [];
  TOKEN_RE.lastIndex = 0;
  let cursor = 0;
  let m: RegExpExecArray | null;
  while ((m = TOKEN_RE.exec(raw)) !== null) {
    if (m.index > cursor) segments.push({ kind: 'text', value: raw.slice(cursor, m.index) });
    const chip = parsed.chips.find((c) => c.raw === m![0]);
    const unknown = parsed.unknownTokens.find((t) => t.token === m![0]);
    segments.push({
      kind: 'token',
      raw: m[0],
      resolved: !!chip,
      chip,
      suggestion: unknown?.suggestion,
    });
    cursor = m.index + m[0].length;
  }
  if (cursor < raw.length) segments.push({ kind: 'text', value: raw.slice(cursor) });
  return segments;
}
