/**
 * Source-level transforms that adapt our extended markdown into something
 * react-markdown + remark-gfm can render. Run before any user-supplied
 * preprocessor (which is what currently injects wiki-link `[[ ]]` syntax).
 */

const CALLOUT_TYPES = new Set(['info', 'note', 'tip', 'warning', 'success', 'danger', 'error', 'quote']);

/**
 * Normalize Obsidian-style callouts:
 *
 *   > [!info] Optional title
 *   > body line one
 *   > body line two
 *
 * becomes
 *
 *   > <!-- callout:info Optional title -->
 *   > body line one
 *   > body line two
 *
 * The HTML comment is later picked up by a custom blockquote renderer to draw
 * the styled callout box. We can't add new node types to the markdown AST
 * without a remark plugin, but a comment marker round-trips cleanly.
 */
export function preprocessCallouts(raw: string): string {
  return raw.replace(
    /(^|\n)>\s*\[!(\w+)\]([^\n]*)/g,
    (match, prefix: string, type: string, rest: string) => {
      if (!CALLOUT_TYPES.has(type.toLowerCase())) return match;
      const title = rest.trim();
      // Encode the title so spaces/quotes survive the comment serialization.
      const encoded = encodeURIComponent(title);
      return `${prefix}> <!--callout:${type.toLowerCase()}:${encoded}-->`;
    },
  );
}

/**
 * Render `#tag-name` as a clickable link with a custom scheme so the existing
 * `a` component override can pick it up and render a pill. Avoid matching
 * heading syntax (`# heading`) by requiring the `#` to be at start of line
 * AND followed by `[A-Za-z]`, OR mid-line preceded by whitespace.
 *
 * Also avoid matching things that look like CSS hex colors (`#ff00aa`).
 */
export function preprocessTags(raw: string): string {
  // Skip code blocks and inline code — collect ranges first.
  const ranges = collectCodeRanges(raw);
  return raw.replace(
    /(^|[\s(])(#[A-Za-z][A-Za-z0-9_-]*)\b/g,
    (match, lead: string, tag: string, offset: number) => {
      const startOfTag = offset + lead.length;
      if (insideRange(ranges, startOfTag)) return match;
      // Looks like a hex color — bail.
      if (/^#[0-9a-fA-F]{3,8}$/.test(tag) && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(tag)) {
        return match;
      }
      const slug = encodeURIComponent(tag.slice(1));
      return `${lead}[${tag}](brewfocus://tag/${slug})`;
    },
  );
}

function collectCodeRanges(raw: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  // Fenced blocks
  const fence = /```[\s\S]*?```/g;
  let m: RegExpExecArray | null;
  while ((m = fence.exec(raw))) ranges.push([m.index, m.index + m[0].length]);
  // Inline code
  const inline = /`[^`\n]+`/g;
  while ((m = inline.exec(raw))) ranges.push([m.index, m.index + m[0].length]);
  return ranges;
}

function insideRange(ranges: Array<[number, number]>, idx: number): boolean {
  for (const [a, b] of ranges) if (idx >= a && idx < b) return true;
  return false;
}

/** Compose: callouts → tags → user preprocessor (e.g. wiki-links). */
export function buildPreprocessor(userPreprocess?: (raw: string) => string): (raw: string) => string {
  return (raw: string) => {
    let out = preprocessCallouts(raw);
    out = preprocessTags(out);
    if (userPreprocess) out = userPreprocess(out);
    return out;
  };
}

// ── Heading extraction (for the outline sidebar) ────────────────────────────

export interface HeadingItem {
  level: number;
  text: string;
  /** Slug used as the rendered heading's id and the outline link target. */
  slug: string;
  /** Position in the source — used to scroll edit mode to the line. */
  sourceLine: number;
}

export function extractHeadings(raw: string): HeadingItem[] {
  const out: HeadingItem[] = [];
  const counts = new Map<string, number>();
  const lines = raw.split('\n');
  let inFence = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^```/.test(line.trim())) { inFence = !inFence; continue; }
    if (inFence) continue;
    const m = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (!m) continue;
    const level = m[1].length;
    const text = m[2].trim();
    const baseSlug = slugify(text);
    const n = counts.get(baseSlug) ?? 0;
    counts.set(baseSlug, n + 1);
    const slug = n === 0 ? baseSlug : `${baseSlug}-${n}`;
    out.push({ level, text, slug, sourceLine: i });
  }
  return out;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80) || 'section';
}

// ── Word / character counts ─────────────────────────────────────────────────

export interface NoteStats {
  words: number;
  chars: number;
  charsNoSpaces: number;
  /** Approximate read time in minutes (200 wpm), minimum 1 once there is any content. */
  readMinutes: number;
}

export function computeStats(raw: string): NoteStats {
  // Strip code fences so we don't count them as prose.
  const stripped = raw.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]+`/g, '');
  const trimmed = stripped.trim();
  const words = trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0;
  const chars = raw.length;
  const charsNoSpaces = raw.replace(/\s+/g, '').length;
  const readMinutes = words === 0 ? 0 : Math.max(1, Math.round(words / 200));
  return { words, chars, charsNoSpaces, readMinutes };
}
