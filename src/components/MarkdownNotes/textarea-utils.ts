/**
 * Pure helpers that take a textarea's value + selection and return a new
 * value + selection. Kept React-free so they're trivial to unit-test and
 * compose in any keydown handler.
 */

export type TextChange = { value: string; selectionStart: number; selectionEnd: number };

// ── Line analysis ───────────────────────────────────────────────────────────

export function getLineRange(value: string, pos: number): { start: number; end: number; text: string } {
  const start = value.lastIndexOf('\n', pos - 1) + 1;
  let end = value.indexOf('\n', pos);
  if (end === -1) end = value.length;
  return { start, end, text: value.slice(start, end) };
}

// ── Smart Enter ─────────────────────────────────────────────────────────────
// Continues lists / quotes / checkboxes; exits when the marker line is empty.

export function smartEnter(value: string, selStart: number, selEnd: number): TextChange | null {
  if (selStart !== selEnd) return null; // selection — let default replace it
  const line = getLineRange(value, selStart);

  // Empty marker → exit (replace whole line with blank).
  const exitPatterns: RegExp[] = [
    /^(\s*)[-*+]\s\[[ xX]\]\s*$/, // empty checkbox
    /^(\s*)[-*+]\s+$/,            // empty bullet
    /^(\s*)\d+\.\s+$/,            // empty numbered
    /^(\s*)>\s*$/,                // empty quote
  ];
  for (const pat of exitPatterns) {
    if (pat.test(line.text)) {
      return {
        value: value.slice(0, line.start) + '\n' + value.slice(line.end),
        selectionStart: line.start + 1,
        selectionEnd: line.start + 1,
      };
    }
  }

  // Continue checkbox.
  let m = line.text.match(/^(\s*)([-*+])\s\[[ xX]\]\s/);
  if (m) {
    const insert = `\n${m[1]}${m[2]} [ ] `;
    return inserted(value, selStart, insert);
  }
  // Continue bullet.
  m = line.text.match(/^(\s*)([-*+])\s/);
  if (m) {
    return inserted(value, selStart, `\n${m[1]}${m[2]} `);
  }
  // Continue numbered (auto-increment).
  m = line.text.match(/^(\s*)(\d+)\.\s/);
  if (m) {
    const next = parseInt(m[2], 10) + 1;
    return inserted(value, selStart, `\n${m[1]}${next}. `);
  }
  // Continue quote / callout body.
  m = line.text.match(/^(\s*)>\s/);
  if (m) {
    return inserted(value, selStart, `\n${m[1]}> `);
  }
  return null;
}

function inserted(value: string, pos: number, insert: string): TextChange {
  const np = pos + insert.length;
  return {
    value: value.slice(0, pos) + insert + value.slice(pos),
    selectionStart: np,
    selectionEnd: np,
  };
}

// ── Tab / Shift+Tab indent on selection block ───────────────────────────────

const INDENT = '  ';

export function smartTab(value: string, selStart: number, selEnd: number, shift: boolean): TextChange {
  // Expand to full lines covered by [selStart, selEnd].
  const blockStart = value.lastIndexOf('\n', selStart - 1) + 1;
  const probe = selStart === selEnd ? selEnd : selEnd - 1;
  let blockEnd = value.indexOf('\n', probe);
  if (blockEnd === -1) blockEnd = value.length;

  const before = value.slice(0, blockStart);
  const block = value.slice(blockStart, blockEnd);
  const after = value.slice(blockEnd);
  const lines = block.split('\n');

  if (shift) {
    let removedTotal = 0;
    let removedFirst = 0;
    const newLines = lines.map((line, idx) => {
      let take = 0;
      if (line.startsWith(INDENT)) take = INDENT.length;
      else if (line.startsWith(' ') || line.startsWith('\t')) take = 1;
      removedTotal += take;
      if (idx === 0) removedFirst = take;
      return line.slice(take);
    });
    return {
      value: before + newLines.join('\n') + after,
      selectionStart: Math.max(blockStart, selStart - removedFirst),
      selectionEnd: Math.max(blockStart, selEnd - removedTotal),
    };
  }

  const newLines = lines.map((l) => INDENT + l);
  return {
    value: before + newLines.join('\n') + after,
    selectionStart: selStart + INDENT.length,
    selectionEnd: selEnd + INDENT.length * lines.length,
  };
}

// ── Wrap selection with markers (used by Cmd+B etc.) ────────────────────────

export function wrapSelection(
  value: string,
  selStart: number,
  selEnd: number,
  before: string,
  after: string = before,
): TextChange {
  const selected = value.slice(selStart, selEnd);

  // Toggle behavior: if already wrapped, unwrap.
  const left = value.slice(Math.max(0, selStart - before.length), selStart);
  const right = value.slice(selEnd, selEnd + after.length);
  if (selected && left === before && right === after) {
    return {
      value: value.slice(0, selStart - before.length) + selected + value.slice(selEnd + after.length),
      selectionStart: selStart - before.length,
      selectionEnd: selEnd - before.length,
    };
  }

  return {
    value: value.slice(0, selStart) + before + selected + after + value.slice(selEnd),
    selectionStart: selStart + before.length,
    selectionEnd: selEnd + before.length,
  };
}

/** Prefix the current line with `prefix` (e.g. `## ` for heading). */
export function prefixLine(value: string, selStart: number, prefix: string): TextChange {
  const line = getLineRange(value, selStart);
  // Strip any existing same-family prefix (`#`, `## `, `- `, etc.) before re-applying.
  const stripped = line.text.replace(/^(\s*)(#{1,6}\s|>\s|[-*+]\s\[[ xX]\]\s|[-*+]\s|\d+\.\s)/, '$1');
  const indentMatch = stripped.match(/^(\s*)/);
  const indent = indentMatch ? indentMatch[1] : '';
  const body = stripped.slice(indent.length);
  const newLine = indent + prefix + body;
  return {
    value: value.slice(0, line.start) + newLine + value.slice(line.end),
    selectionStart: line.start + newLine.length,
    selectionEnd: line.start + newLine.length,
  };
}

/** Insert a markdown link with the current selection as the link text. */
export function insertLink(value: string, selStart: number, selEnd: number): TextChange {
  const text = value.slice(selStart, selEnd) || 'link text';
  const insert = `[${text}](https://)`;
  // Place cursor on the URL placeholder so user can paste over it.
  const urlStart = selStart + text.length + 3; // after `[text](`
  const urlEnd = urlStart + 'https://'.length;
  return {
    value: value.slice(0, selStart) + insert + value.slice(selEnd),
    selectionStart: urlStart,
    selectionEnd: urlEnd,
  };
}

// ── Auto-close brackets and skip-over closers ───────────────────────────────

const PAIRS: Record<string, string> = {
  '(': ')',
  '[': ']',
  '{': '}',
  '"': '"',
  "'": "'",
  '`': '`',
};

const CLOSERS = new Set([')', ']', '}', '"', "'", '`']);

export function autoClose(value: string, selStart: number, selEnd: number, key: string): TextChange | null {
  const close = PAIRS[key];
  if (!close) return null;

  // Wrap a non-empty selection.
  if (selStart !== selEnd) {
    const selected = value.slice(selStart, selEnd);
    return {
      value: value.slice(0, selStart) + key + selected + close + value.slice(selEnd),
      selectionStart: selStart + 1,
      selectionEnd: selEnd + 1,
    };
  }

  // Wiki-link special case: typing `[` after `[]` (already auto-closed) →
  // expand to `[[ | ]]` so the user gets `[[]]` for free.
  if (key === '[' && value[selStart - 1] === '[' && value[selStart] === ']') {
    return {
      value: value.slice(0, selStart) + '[]' + value.slice(selStart),
      selectionStart: selStart + 1,
      selectionEnd: selStart + 1,
    };
  }

  // Don't auto-close a quote when the previous char is alphanumeric — likely
  // the user means an apostrophe inside a word, not an opening pair.
  if ((key === "'" || key === '"') && /[A-Za-z0-9]/.test(value[selStart - 1] ?? '')) {
    return null;
  }

  return {
    value: value.slice(0, selStart) + key + close + value.slice(selStart),
    selectionStart: selStart + 1,
    selectionEnd: selStart + 1,
  };
}

/** If the cursor is right before a closer that matches the key, skip over it. */
export function maybeSkipClose(value: string, selStart: number, selEnd: number, key: string): TextChange | null {
  if (selStart !== selEnd) return null;
  if (!CLOSERS.has(key)) return null;
  if (value[selStart] === key) {
    return { value, selectionStart: selStart + 1, selectionEnd: selStart + 1 };
  }
  return null;
}

/** Backspace at the inside of an empty pair deletes both halves. */
export function smartBackspace(value: string, selStart: number, selEnd: number): TextChange | null {
  if (selStart !== selEnd || selStart === 0) return null;
  const prev = value[selStart - 1];
  const next = value[selStart];
  if (PAIRS[prev] === next) {
    return {
      value: value.slice(0, selStart - 1) + value.slice(selStart + 1),
      selectionStart: selStart - 1,
      selectionEnd: selStart - 1,
    };
  }
  return null;
}

// ── Caret coords (for floating UI like the slash menu) ──────────────────────

/**
 * Returns the pixel position of the caret inside a textarea, in client
 * coordinates. Uses a hidden mirror element with copied styles, which is the
 * standard technique because textareas don't expose caret coordinates.
 */
export function getCaretClientCoords(textarea: HTMLTextAreaElement, position: number): { top: number; left: number; height: number } {
  const cs = window.getComputedStyle(textarea);
  const div = document.createElement('div');
  // Copy every style property that affects layout / line breaking.
  const props: (keyof CSSStyleDeclaration)[] = [
    'boxSizing', 'width', 'height', 'overflowX', 'overflowY',
    'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
    'borderStyle', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'fontStyle', 'fontVariant', 'fontWeight', 'fontStretch', 'fontSize', 'fontSizeAdjust',
    'lineHeight', 'fontFamily', 'textAlign', 'textTransform', 'textIndent',
    'textDecoration', 'letterSpacing', 'wordSpacing', 'tabSize',
  ];
  for (const p of props) {
    (div.style as unknown as Record<string, string>)[p as string] = cs[p] as string;
  }
  div.style.position = 'absolute';
  div.style.visibility = 'hidden';
  div.style.whiteSpace = 'pre-wrap';
  div.style.wordWrap = 'break-word';
  div.style.top = '0';
  div.style.left = '-9999px';

  const before = textarea.value.slice(0, position).replace(/\n$/, '\n​');
  div.textContent = before;
  const span = document.createElement('span');
  span.textContent = textarea.value.slice(position) || '.';
  div.appendChild(span);

  document.body.appendChild(div);
  const rect = textarea.getBoundingClientRect();
  const top = rect.top + span.offsetTop - textarea.scrollTop + parseInt(cs.borderTopWidth || '0', 10);
  const left = rect.left + span.offsetLeft - textarea.scrollLeft + parseInt(cs.borderLeftWidth || '0', 10);
  const lineHeight = parseInt(cs.lineHeight || '0', 10) || parseInt(cs.fontSize || '16', 10) * 1.4;
  document.body.removeChild(div);

  return { top, left, height: lineHeight };
}
