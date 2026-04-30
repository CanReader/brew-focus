import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Components } from 'react-markdown';
import { useTranslation } from 'react-i18next';
import {
  Edit3, Eye, Columns, Bold, Italic, Code, List, ListOrdered, Heading2, CheckSquare, Quote, ListTree,
} from 'lucide-react';

import {
  TextChange, smartEnter, smartTab, wrapSelection, prefixLine, insertLink,
  autoClose, maybeSkipClose, smartBackspace, getCaretClientCoords,
} from './textarea-utils';
import { buildPreprocessor, extractHeadings, computeStats, HeadingItem } from './preprocessing';
import { SlashMenu, SLASH_COMMANDS, SlashCommand } from './SlashMenu';
import { SelectionToolbar, ToolbarAction } from './SelectionToolbar';
import { Outline } from './Outline';
import { Preview } from './Preview';

interface Props {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  /** Optional max content width (px). When omitted, the editor is full-width. */
  maxWidth?: number;
  minEditHeight?: number;
  accentColor?: string;
  /** Optional component overrides (e.g. for wiki-link rendering). */
  componentOverrides?: Partial<Components>;
  /** Optional pre-processor that transforms the raw markdown before rendering. */
  preprocess?: (raw: string) => string;
}

type Mode = 'preview' | 'edit' | 'split';

/** Walks up the DOM looking for an element that actually scrolls. */
function findScrollParent(el: HTMLElement | null): HTMLElement | null {
  let node = el?.parentElement ?? null;
  while (node) {
    const overflowY = window.getComputedStyle(node).overflowY;
    const canScroll = overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay';
    if (canScroll && node.scrollHeight > node.clientHeight) return node;
    node = node.parentElement;
  }
  return null;
}

/**
 * Markdown notes editor with three view modes (Preview · Edit · Split),
 * slash commands, smart Enter / Tab, autoclose pairs, callouts, tag pills,
 * outline TOC, and live word counts.
 *
 * Why a Preview ↔ Edit toggle alongside Split: when you open an existing note
 * to read it, you want pretty rendered output. When you're typing fast, you
 * want plain source. Split is the Obsidian-style middle ground for longer
 * notes where you want to see the result update as you type.
 */
export const MarkdownNotes: React.FC<Props> = ({
  value, onChange, placeholder, maxWidth, minEditHeight = 200,
  accentColor, componentOverrides, preprocess,
}) => {
  const { t } = useTranslation('tasks');
  const [mode, setMode] = useState<Mode>('preview');
  const [draft, setDraft] = useState(value);
  const [outlineOpen, setOutlineOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({ value, draft });
  stateRef.current = { value, draft };

  // Scroll-anchor: switching modes adds/removes the formatting toolbar row,
  // which shifts the body content vertically inside the page. Capture the
  // body's viewport-Y *before* the click takes effect, then post-render scroll
  // the parent so the body lands at the same Y. Without this, clicking
  // Preview makes the body content appear to "jump up".
  const pendingAnchor = useRef<number | null>(null);
  const requestModeChange = useCallback((nextMode: Mode) => {
    if (bodyRef.current) {
      pendingAnchor.current = bodyRef.current.getBoundingClientRect().top;
    }
    if (nextMode === 'preview' && stateRef.current.draft !== stateRef.current.value) {
      onChange(stateRef.current.draft);
    }
    setMode(nextMode);
  }, [onChange]);

  useLayoutEffect(() => {
    if (pendingAnchor.current == null) return;
    const before = pendingAnchor.current;
    pendingAnchor.current = null;
    const el = bodyRef.current;
    if (!el) return;
    const after = el.getBoundingClientRect().top;
    const delta = after - before;
    if (Math.abs(delta) < 1) return;
    const scroller = findScrollParent(el);
    if (scroller) scroller.scrollTop += delta;
    else window.scrollBy(0, delta);
  }, [mode]);

  // ── Slash menu state ────────────────────────────────────────────────────
  const [slash, setSlash] = useState<{
    triggerPos: number; query: string; top: number; left: number; selectedIndex: number;
  } | null>(null);

  // ── Selection toolbar state ─────────────────────────────────────────────
  const [toolbar, setToolbar] = useState<{ top: number; left: number } | null>(null);

  // Sync external changes when not editing.
  useEffect(() => {
    if (mode !== 'edit' && mode !== 'split') setDraft(value);
  }, [value, mode]);

  // Focus the textarea once when entering an editable mode (not on every keystroke —
  // re-focusing on each draft update was the cause of the page jumping up on Enter).
  // `preventScroll` is critical: without it the browser auto-scrolls the textarea
  // into view and the page visibly jumps on every Preview ↔ Edit toggle.
  useEffect(() => {
    if (mode === 'preview') return;
    const el = textareaRef.current;
    if (!el) return;
    const len = el.value.length;
    el.focus({ preventScroll: true });
    try { el.setSelectionRange(len, len); } catch { /* ignore */ }
  }, [mode]);

  // Auto-size the textarea to fit its content. useLayoutEffect runs before
  // paint so the user never sees a brief flash of the default-height textarea
  // when entering edit mode. Snapshot/restore outer scroll around the
  // height collapse to avoid the page snapping upward.
  //
  // We zero out BOTH `height` and `min-height` before reading `scrollHeight`.
  // If we leave min-height at its previous value (or the JSX-applied floor),
  // scrollHeight is clamped at the old size and never decreases — that was
  // the cause of the "phantom padding after deletion" bug: the textarea
  // remained locked at its tallest historical size while content shrank.
  useLayoutEffect(() => {
    if (mode === 'preview') return;
    const el = textareaRef.current;
    if (!el) return;
    const scroller = findScrollParent(el);
    const prevScroll = scroller ? scroller.scrollTop : 0;

    el.style.height = '0px';
    el.style.minHeight = '0px';
    // Reading scrollHeight now reports the pure content height (no clamp).
    const fit = Math.max(minEditHeight, el.scrollHeight);

    el.style.height = `${fit}px`;
    el.style.minHeight = '';

    if (scroller && scroller.scrollTop !== prevScroll) scroller.scrollTop = prevScroll;
  }, [mode, draft, minEditHeight]);

  const commit = useCallback(() => {
    if (stateRef.current.draft !== stateRef.current.value) onChange(stateRef.current.draft);
  }, [onChange]);

  const switchToPreview = () => requestModeChange('preview');

  const wrapStyle: React.CSSProperties = maxWidth
    ? { maxWidth, marginLeft: 'auto', marginRight: 'auto', width: '100%' }
    : { width: '100%' };

  const empty = !value || !value.trim();

  // ── Computed: preprocessed source for preview, headings, stats ──────────

  const fullPreprocess = useMemo(() => buildPreprocessor(preprocess), [preprocess]);
  const renderedSource = useMemo(() => fullPreprocess(mode === 'preview' ? value : draft), [fullPreprocess, mode, value, draft]);
  const rawForRender = mode === 'preview' ? value : draft;
  const headings = useMemo(() => extractHeadings(rawForRender), [rawForRender]);
  const stats = useMemo(() => computeStats(rawForRender), [rawForRender]);

  // ── Apply a TextChange to the textarea, sync state, refocus selection ───

  const apply = useCallback((change: TextChange) => {
    setDraft(change.value);
    // Restore selection on the next frame after React updates the DOM.
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus({ preventScroll: true });
      try { el.setSelectionRange(change.selectionStart, change.selectionEnd); } catch { /* ignore */ }
    });
  }, []);

  // ── Slash menu helpers ─────────────────────────────────────────────────

  const closeSlash = useCallback(() => setSlash(null), []);

  const openSlashAt = useCallback((triggerPos: number) => {
    const el = textareaRef.current;
    if (!el) return;
    const coords = getCaretClientCoords(el, triggerPos);
    setSlash({
      triggerPos,
      query: '',
      top: coords.top + coords.height + 4,
      left: coords.left,
      selectedIndex: 0,
    });
  }, []);

  const insertSlashCommand = useCallback((cmd: SlashCommand) => {
    if (!slash) return;
    const el = textareaRef.current;
    if (!el) return;
    const cursor = el.selectionStart;
    const { snippet, cursorOffset } = cmd.build();

    // Delete `/` + query (everything between triggerPos and current cursor) and insert the snippet.
    const before = draft.slice(0, slash.triggerPos);
    const after = draft.slice(cursor);
    const newValue = before + snippet + after;
    const newCursor = slash.triggerPos + cursorOffset;
    apply({ value: newValue, selectionStart: newCursor, selectionEnd: newCursor });
    closeSlash();
  }, [slash, draft, apply, closeSlash]);

  // ── Selection toolbar tracking ─────────────────────────────────────────

  const updateSelectionToolbar = useCallback(() => {
    const el = textareaRef.current;
    if (!el || mode === 'preview' || slash) { setToolbar(null); return; }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    if (start === end) { setToolbar(null); return; }
    const c1 = getCaretClientCoords(el, start);
    const c2 = getCaretClientCoords(el, end);
    const top = Math.min(c1.top, c2.top);
    const left = (c1.left + c2.left) / 2;
    setToolbar({ top: Math.max(8, top - 4), left });
  }, [mode, slash]);

  // ── Toolbar action dispatch ────────────────────────────────────────────

  const runAction = useCallback((action: ToolbarAction) => {
    const el = textareaRef.current;
    if (!el) return;
    const v = draft;
    const s = el.selectionStart;
    const e = el.selectionEnd;
    let change: TextChange | null = null;
    switch (action) {
      case 'bold':      change = wrapSelection(v, s, e, '**'); break;
      case 'italic':    change = wrapSelection(v, s, e, '*'); break;
      case 'strike':    change = wrapSelection(v, s, e, '~~'); break;
      case 'code':      change = wrapSelection(v, s, e, '`'); break;
      case 'highlight': change = wrapSelection(v, s, e, '==', '=='); break;
      case 'link':      change = insertLink(v, s, e); break;
    }
    if (change) apply(change);
    setToolbar(null);
  }, [draft, apply]);

  // ── keydown: the smart-editor brain ────────────────────────────────────

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    const s = el.selectionStart;
    const sel2 = el.selectionEnd;
    const mod = e.metaKey || e.ctrlKey;

    // Slash menu navigation has top priority.
    if (slash) {
      const filteredCount = SLASH_COMMANDS.filter((c) => {
        const q = slash.query.toLowerCase();
        if (!q) return true;
        return c.label.toLowerCase().includes(q) || c.keywords.some((k) => k.startsWith(q));
      }).length;
      if (e.key === 'Escape')   { e.preventDefault(); closeSlash(); return; }
      if (e.key === 'ArrowDown'){ e.preventDefault(); setSlash({ ...slash, selectedIndex: (slash.selectedIndex + 1) % Math.max(1, filteredCount) }); return; }
      if (e.key === 'ArrowUp')  { e.preventDefault(); setSlash({ ...slash, selectedIndex: (slash.selectedIndex - 1 + Math.max(1, filteredCount)) % Math.max(1, filteredCount) }); return; }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const filtered = SLASH_COMMANDS.filter((c) => {
          const q = slash.query.toLowerCase();
          if (!q) return true;
          return c.label.toLowerCase().includes(q) || c.keywords.some((k) => k.startsWith(q));
        });
        const cmd = filtered[slash.selectedIndex];
        if (cmd) insertSlashCommand(cmd);
        return;
      }
    }

    // Cmd/Ctrl shortcuts.
    if (mod && !e.altKey) {
      const k = e.key.toLowerCase();
      if (k === 'b')               { e.preventDefault(); apply(wrapSelection(draft, s, sel2, '**')); return; }
      if (k === 'i' && !e.shiftKey){ e.preventDefault(); apply(wrapSelection(draft, s, sel2, '*'));  return; }
      if (k === 'e')               { e.preventDefault(); apply(wrapSelection(draft, s, sel2, '`'));  return; }
      if (k === 'k')               { e.preventDefault(); apply(insertLink(draft, s, sel2));         return; }
      if (e.shiftKey && k === 'x') { e.preventDefault(); apply(wrapSelection(draft, s, sel2, '~~')); return; }
      if (e.shiftKey && k === '7') { e.preventDefault(); apply(prefixLine(draft, s, '1. '));   return; }
      if (e.shiftKey && k === '8') { e.preventDefault(); apply(prefixLine(draft, s, '- '));    return; }
      if (e.shiftKey && k === '9') { e.preventDefault(); apply(prefixLine(draft, s, '- [ ] '));return; }
      if (k === 'enter')           { e.preventDefault(); switchToPreview(); return; }
    }

    if (e.key === 'Escape')        { e.preventDefault(); switchToPreview(); return; }

    // Tab / Shift+Tab: indent or dedent the selected line(s).
    if (e.key === 'Tab') {
      e.preventDefault();
      apply(smartTab(draft, s, sel2, e.shiftKey));
      return;
    }

    // Smart Enter for lists / quotes / checkboxes.
    if (e.key === 'Enter' && !e.shiftKey) {
      const change = smartEnter(draft, s, sel2);
      if (change) { e.preventDefault(); apply(change); return; }
    }

    // Backspace at the inside of an empty pair → delete both halves.
    if (e.key === 'Backspace') {
      const change = smartBackspace(draft, s, sel2);
      if (change) { e.preventDefault(); apply(change); return; }
    }

    // Auto-close brackets / quotes.
    if (e.key.length === 1) {
      const skip = maybeSkipClose(draft, s, sel2, e.key);
      if (skip) { e.preventDefault(); apply(skip); return; }
      const close = autoClose(draft, s, sel2, e.key);
      if (close) { e.preventDefault(); apply(close); return; }
    }
  };

  // ── onChange: capture draft, detect slash-trigger, update slash query ──

  const onTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const next = e.target.value;
    const cursor = e.target.selectionStart;
    setDraft(next);

    // Detect slash trigger: a `/` immediately preceded by start-of-line or whitespace,
    // not inside a code fence. Open the menu if just typed.
    if (!slash) {
      const justTypedSlash = next.length > draft.length && next[cursor - 1] === '/';
      if (justTypedSlash) {
        const lineStart = next.lastIndexOf('\n', cursor - 2) + 1;
        const before = next.slice(lineStart, cursor - 1);
        // Only if the rest of the line up to this point is whitespace.
        if (/^\s*$/.test(before)) openSlashAt(cursor - 1);
      }
    } else {
      // Update the query — everything between triggerPos+1 and the cursor.
      if (cursor < slash.triggerPos || next[slash.triggerPos] !== '/') {
        closeSlash();
        return;
      }
      const query = next.slice(slash.triggerPos + 1, cursor);
      // Closing condition: query contains a space at start, newline, or got too long.
      if (/[\n]/.test(query) || query.length > 20) {
        closeSlash();
        return;
      }
      setSlash({ ...slash, query });
    }
  };

  // Selection change tracking → floating toolbar.
  const onSelect = () => updateSelectionToolbar();

  // Toggle a checkbox in source via clicked preview position.
  const onToggleCheckbox = (sourcePos: number) => {
    const ch = value[sourcePos + 1];
    const flipped = ch === ' ' ? 'x' : ' ';
    const next = value.slice(0, sourcePos + 1) + flipped + value.slice(sourcePos + 2);
    onChange(next);
    if (mode === 'edit' || mode === 'split') setDraft(next);
  };

  // Outline jump.
  const onJumpHeading = (h: HeadingItem) => {
    if (mode === 'preview' || mode === 'split') {
      const node = document.getElementById(h.slug);
      if (node) node.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    if (mode === 'edit' || mode === 'split') {
      const el = textareaRef.current;
      if (!el) return;
      // Compute the offset of the heading's source line.
      const lines = draft.split('\n');
      let pos = 0;
      for (let i = 0; i < h.sourceLine && i < lines.length; i++) pos += lines[i].length + 1;
      el.focus();
      const len = lines[h.sourceLine]?.length ?? 0;
      try { el.setSelectionRange(pos, pos + len); } catch { /* ignore */ }
      // Scroll the textarea so the heading is visible.
      const lineHeight = parseInt(window.getComputedStyle(el).lineHeight || '20', 10) || 20;
      el.scrollTop = Math.max(0, h.sourceLine * lineHeight - 80);
    }
  };

  // Click outside textarea / menus dismisses the toolbar.
  useEffect(() => {
    if (!toolbar) return;
    const handler = () => setToolbar(null);
    window.addEventListener('scroll', handler, true);
    return () => window.removeEventListener('scroll', handler, true);
  }, [toolbar]);

  return (
    <div ref={containerRef} style={wrapStyle}>
      {/* Mode pill + toolbar + outline button.
          A fixed min-height keeps this row the same size whether the
          formatting toolbar is rendered or not, so toggling Preview ↔ Edit
          doesn't shift the body content vertically. */}
      <div className="flex items-center gap-2 mb-2 flex-wrap" style={{ minHeight: 32 }}>
        <div
          className="flex items-center rounded-lg p-0.5"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--brd)' }}
        >
          {([
            ['preview', Eye, 'Preview'],
            ['edit', Edit3, 'Edit'],
            ['split', Columns, 'Split'],
          ] as const).map(([m, Icon, label]) => {
            const isActive = mode === m;
            return (
              <button
                key={m}
                onClick={() => requestModeChange(m)}
                className="relative flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors"
                style={{ color: isActive ? 'var(--t)' : 'var(--t3)' }}
                title={label}
              >
                {isActive && (
                  <motion.div
                    layoutId={`md-mode-${maxWidth ?? 'full'}`}
                    className="absolute inset-0 rounded-md"
                    style={{ background: 'var(--card-h)' }}
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.3 }}
                  />
                )}
                <Icon size={11} className="relative z-10" />
                <span className="relative z-10">{label}</span>
              </button>
            );
          })}
        </div>

        {(mode === 'edit' || mode === 'split') && (
          <div
            className="flex items-center gap-0.5 rounded-lg p-0.5"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--brd)' }}
          >
            {([
              ['Bold (Ctrl+B)',   Bold,        () => textareaRef.current && apply(wrapSelection(draft, textareaRef.current.selectionStart, textareaRef.current.selectionEnd, '**'))],
              ['Italic (Ctrl+I)', Italic,      () => textareaRef.current && apply(wrapSelection(draft, textareaRef.current.selectionStart, textareaRef.current.selectionEnd, '*'))],
              ['Code (Ctrl+E)',   Code,        () => textareaRef.current && apply(wrapSelection(draft, textareaRef.current.selectionStart, textareaRef.current.selectionEnd, '`'))],
              ['Heading',         Heading2,    () => textareaRef.current && apply(prefixLine(draft, textareaRef.current.selectionStart, '## '))],
              ['Bullet list',     List,        () => textareaRef.current && apply(prefixLine(draft, textareaRef.current.selectionStart, '- '))],
              ['Numbered list',   ListOrdered, () => textareaRef.current && apply(prefixLine(draft, textareaRef.current.selectionStart, '1. '))],
              ['Checkbox',        CheckSquare, () => textareaRef.current && apply(prefixLine(draft, textareaRef.current.selectionStart, '- [ ] '))],
              ['Quote',           Quote,       () => textareaRef.current && apply(prefixLine(draft, textareaRef.current.selectionStart, '> '))],
            ] as const).map(([title, Icon, fn]) => (
              <button
                key={title}
                onClick={fn}
                title={title}
                className="w-6 h-6 flex items-center justify-center rounded transition-colors"
                style={{ color: 'var(--t3)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--card-h)'; e.currentTarget.style.color = 'var(--t2)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--t3)'; }}
              >
                <Icon size={11} />
              </button>
            ))}
          </div>
        )}

        {headings.length >= 2 && (
          <button
            onClick={() => setOutlineOpen((v) => !v)}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors"
            style={{
              color: outlineOpen ? 'var(--t)' : 'var(--t3)',
              background: outlineOpen ? 'var(--card-h)' : 'rgba(255,255,255,0.04)',
              border: '1px solid var(--brd)',
            }}
            title="Toggle outline"
          >
            <ListTree size={11} />
            <span>Outline · {headings.length}</span>
          </button>
        )}

        {(mode === 'edit' || mode === 'split') && (
          <span className="text-[10.5px] ml-auto" style={{ color: 'var(--t3)' }}>
            {t('notes.editHint')}
          </span>
        )}
      </div>

      {/* Body */}
      <div ref={bodyRef} className="flex gap-3 items-start">
        <div className="flex-1 min-w-0">
          {mode === 'edit' && (
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={onTextareaChange}
              onBlur={() => { commit(); }}
              onKeyDown={onKeyDown}
              onSelect={onSelect}
              onMouseUp={onSelect}
              placeholder={placeholder ?? 'Type markdown — press / for blocks, [[ to link, # for tags, Ctrl+B for bold…'}
              className="w-full text-[13.5px] rounded-xl p-4 resize-none focus:outline-none leading-relaxed transition-all"
              style={{
                color: 'var(--t)',
                fontFamily: '\'JetBrains Mono\', \'Fira Code\', \'SF Mono\', monospace',
                minHeight: minEditHeight,
                background: 'var(--bg2)',
                border: '1px solid var(--brd2)',
                caretColor: accentColor ?? 'var(--accent)',
              }}
            />
          )}

          {mode === 'split' && (
            <div className="grid grid-cols-2 gap-3 items-start">
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={onTextareaChange}
                onBlur={() => { commit(); }}
                onKeyDown={onKeyDown}
                onSelect={onSelect}
                onMouseUp={onSelect}
                placeholder={placeholder ?? 'Type markdown — press / for blocks…'}
                className="w-full text-[13px] rounded-xl p-4 resize-none focus:outline-none leading-relaxed"
                style={{
                  color: 'var(--t)',
                  fontFamily: '\'JetBrains Mono\', \'Fira Code\', \'SF Mono\', monospace',
                  minHeight: minEditHeight,
                  background: 'var(--bg2)',
                  border: '1px solid var(--brd2)',
                  caretColor: accentColor ?? 'var(--accent)',
                }}
              />
              {/* The preview pane grows naturally with its content — internal
                  scrolling here was bad UX (users had to scroll a small inner
                  window). Let it expand; the page handles overflow. */}
              <div className="min-w-0">
                <Preview
                  source={renderedSource}
                  rawSource={draft}
                  componentOverrides={componentOverrides}
                  accentColor={accentColor}
                  onToggleCheckbox={(pos) => {
                    // In split mode the live source is `draft`, so toggle there too.
                    const ch = draft[pos + 1];
                    const flipped = ch === ' ' ? 'x' : ' ';
                    const next = draft.slice(0, pos + 1) + flipped + draft.slice(pos + 2);
                    setDraft(next);
                    onChange(next);
                  }}
                />
              </div>
            </div>
          )}

          {mode === 'preview' && (
            empty ? (
              <button
                onClick={() => requestModeChange('edit')}
                className="w-full text-left rounded-xl p-4 transition-all"
                style={{
                  background: 'var(--card)',
                  border: '1px dashed var(--brd2)',
                  color: 'var(--t3)',
                  fontStyle: 'italic',
                  fontSize: 13,
                  minHeight: minEditHeight,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = accentColor ? `${accentColor}88` : 'var(--brd2)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--brd2)')}
              >
                {placeholder ?? 'Click Edit to write notes — markdown, slash commands, wiki-links and tags supported.'}
              </button>
            ) : (
              <Preview
                source={renderedSource}
                rawSource={value}
                componentOverrides={componentOverrides}
                accentColor={accentColor}
                onToggleCheckbox={onToggleCheckbox}
              />
            )
          )}
        </div>

        {outlineOpen && headings.length >= 2 && (
          <div
            className="shrink-0 rounded-xl overflow-y-auto"
            style={{
              width: 200,
              maxHeight: Math.max(minEditHeight + 200, 600),
              background: 'var(--card)',
              border: '1px solid var(--brd)',
              padding: 4,
            }}
          >
            <Outline headings={headings} onJump={onJumpHeading} accentColor={accentColor} />
          </div>
        )}
      </div>

      {/* Footer: stats */}
      {(mode === 'edit' || mode === 'split') && (
        <div className="mt-2 flex items-center gap-3 text-[10.5px]" style={{ color: 'var(--t3)' }}>
          <span>{stats.words} words</span>
          <span>·</span>
          <span>{stats.chars} chars</span>
          {stats.readMinutes > 0 && (<><span>·</span><span>{stats.readMinutes} min read</span></>)}
          <span className="ml-auto opacity-70">
            <kbd style={kbdStyle}>/</kbd> blocks · <kbd style={kbdStyle}>[[</kbd> link · <kbd style={kbdStyle}>Esc</kbd> done
          </span>
        </div>
      )}

      {/* Slash menu overlay */}
      {slash && (mode === 'edit' || mode === 'split') && (
        <SlashMenu
          query={slash.query}
          position={{ top: slash.top, left: slash.left }}
          selectedIndex={slash.selectedIndex}
          onSelectedIndexChange={(idx) => setSlash((s) => s ? { ...s, selectedIndex: idx } : s)}
          onSelect={insertSlashCommand}
        />
      )}

      {/* Selection toolbar */}
      {toolbar && !slash && (mode === 'edit' || mode === 'split') && (
        <SelectionToolbar position={toolbar} onAction={runAction} />
      )}
    </div>
  );
};

const kbdStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid var(--brd)',
  borderRadius: 3,
  padding: '0 4px',
  fontSize: 9,
  fontFamily: 'inherit',
};
