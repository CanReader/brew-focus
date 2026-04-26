import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion } from 'framer-motion';
import { Edit3, Eye, Bold, Italic, Code, List, ListOrdered, Heading2, CheckSquare, Quote } from 'lucide-react';

interface Props {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  /** Optional max content width (px). When omitted, the editor is full-width. */
  maxWidth?: number;
  minEditHeight?: number;
  accentColor?: string;
  /** Optional component overrides (e.g. for wiki-link rendering in round 5). */
  componentOverrides?: Partial<Components>;
  /** Optional pre-processor that transforms the raw markdown before rendering. */
  preprocess?: (raw: string) => string;
}

type Mode = 'preview' | 'edit';

/**
 * Markdown notes with an explicit Preview ↔ Edit toggle.
 *
 * Why a toggle and not click-to-edit: when you click a rendered surface to
 * edit, you lose the rendered view entirely until you click outside. Users
 * type `# Heading` and never see it become a heading. Toggle keeps it honest.
 */
export const MarkdownNotes: React.FC<Props> = ({
  value, onChange, placeholder, maxWidth, minEditHeight = 200,
  accentColor, componentOverrides, preprocess,
}) => {
  const [mode, setMode] = useState<Mode>('preview');
  const [draft, setDraft] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync external changes when not editing.
  useEffect(() => {
    if (mode !== 'edit') setDraft(value);
  }, [value, mode]);

  // Auto-size textarea on mount + value change.
  useEffect(() => {
    if (mode === 'edit') {
      const el = textareaRef.current;
      if (!el) return;
      el.style.height = 'auto';
      el.style.height = `${Math.max(minEditHeight, el.scrollHeight)}px`;
      el.focus();
    }
  }, [mode, draft, minEditHeight]);

  const commit = () => {
    if (draft !== value) onChange(draft);
  };

  const switchToPreview = () => {
    commit();
    setMode('preview');
  };

  // Toolbar actions — operate on selection in the textarea.
  const wrapSelection = (before: string, after: string = before) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? start;
    const selected = draft.slice(start, end);
    const next = draft.slice(0, start) + before + selected + after + draft.slice(end);
    setDraft(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + before.length, end + before.length);
    });
  };

  const linePrefix = (prefix: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const lineStart = draft.lastIndexOf('\n', start - 1) + 1;
    const next = draft.slice(0, lineStart) + prefix + draft.slice(lineStart);
    setDraft(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, start + prefix.length);
    });
  };

  const wrapStyle: React.CSSProperties = maxWidth
    ? { maxWidth, marginLeft: 'auto', marginRight: 'auto', width: '100%' }
    : { width: '100%' };

  const empty = !value || !value.trim();
  const sourceForRender = preprocess ? preprocess(value) : value;

  return (
    <div style={wrapStyle}>
      {/* Mode pill + toolbar */}
      <div className="flex items-center gap-2 mb-2">
        <div
          className="flex items-center rounded-lg p-0.5"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--brd)' }}
        >
          {([['preview', Eye, 'Preview'], ['edit', Edit3, 'Edit']] as const).map(([m, Icon, label]) => {
            const isActive = mode === m;
            return (
              <button
                key={m}
                onClick={() => {
                  if (m === 'preview' && mode === 'edit') commit();
                  setMode(m);
                }}
                className="relative flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors"
                style={{ color: isActive ? 'var(--t)' : 'var(--t3)' }}
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

        {mode === 'edit' && (
          <div
            className="flex items-center gap-0.5 rounded-lg p-0.5"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--brd)' }}
          >
            {([
              ['Bold (**text**)', Bold,        () => wrapSelection('**')],
              ['Italic (*text*)', Italic,      () => wrapSelection('*')],
              ['Inline code',     Code,        () => wrapSelection('`')],
              ['Heading',         Heading2,    () => linePrefix('## ')],
              ['Bullet list',     List,        () => linePrefix('- ')],
              ['Numbered list',   ListOrdered, () => linePrefix('1. ')],
              ['Checkbox',        CheckSquare, () => linePrefix('- [ ] ')],
              ['Quote',           Quote,       () => linePrefix('> ')],
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

        {mode === 'edit' && (
          <span className="text-[10.5px] ml-auto" style={{ color: 'var(--t3)' }}>
            <kbd>Esc</kbd> or click <span style={{ color: 'var(--t2)' }}>Preview</span> to render
          </span>
        )}
      </div>

      {mode === 'edit' ? (
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { e.preventDefault(); switchToPreview(); }
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); switchToPreview(); }
          }}
          placeholder={placeholder ?? 'Type markdown — # for headings, ** for bold, - for lists, ``` for code blocks, > for quotes, - [ ] for checkboxes…'}
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
      ) : empty ? (
        <button
          onClick={() => setMode('edit')}
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
          {placeholder ?? 'Click Edit to write notes — markdown supported.'}
        </button>
      ) : (
        <div
          className="rounded-xl p-4 markdown-body"
          style={{ background: 'var(--card)', border: '1px solid var(--brd)' }}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: (p) => <h1 className="font-fraunces leading-tight mt-5 mb-3" style={{ color: 'var(--t)', fontSize: 26 }} {...p} />,
              h2: (p) => <h2 className="font-fraunces leading-tight mt-5 mb-2.5" style={{ color: 'var(--t)', fontSize: 21 }} {...p} />,
              h3: (p) => <h3 className="font-semibold mt-4 mb-2" style={{ color: 'var(--t)', fontSize: 16 }} {...p} />,
              h4: (p) => <h4 className="font-semibold mt-4 mb-2" style={{ color: 'var(--t)', fontSize: 14 }} {...p} />,
              p:  (p) => <p className="leading-[1.7] my-3" style={{ color: 'var(--t2)', fontSize: 13.5 }} {...p} />,
              a:  ({ href, children, ...rest }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer noopener"
                  onClick={(e) => e.stopPropagation()}
                  className="underline decoration-dotted underline-offset-2"
                  style={{ color: accentColor ?? 'var(--blu)' }}
                  {...rest}
                >{children}</a>
              ),
              ul: (p) => <ul className="my-3 pl-5 list-disc" style={{ color: 'var(--t2)' }} {...p} />,
              ol: (p) => <ol className="my-3 pl-5 list-decimal" style={{ color: 'var(--t2)' }} {...p} />,
              li: (p) => <li className="leading-[1.7] my-1" style={{ fontSize: 13.5 }} {...p} />,
              code: ({ className, children, ...rest }) => {
                const isBlock = (className ?? '').includes('language-');
                if (isBlock) {
                  return (
                    <pre
                      className="my-3 rounded-lg p-3 overflow-x-auto"
                      style={{
                        background: 'var(--bg2)',
                        border: '1px solid var(--brd)',
                        fontFamily: '\'JetBrains Mono\', \'Fira Code\', monospace',
                        color: 'var(--t)',
                        fontSize: 12.5,
                      }}
                    >
                      <code {...rest}>{children}</code>
                    </pre>
                  );
                }
                return (
                  <code
                    className="px-1 py-0.5 rounded"
                    style={{
                      background: 'var(--bg2)',
                      border: '1px solid var(--brd)',
                      fontFamily: '\'JetBrains Mono\', \'Fira Code\', monospace',
                      color: 'var(--t)',
                      fontSize: 12,
                    }}
                    {...rest}
                  >{children}</code>
                );
              },
              blockquote: (p) => (
                <blockquote
                  className="my-3 pl-3 italic"
                  style={{
                    borderLeft: `2px solid ${accentColor ?? 'var(--accent)'}`,
                    color: 'var(--t2)',
                  }}
                  {...p}
                />
              ),
              hr: () => <hr className="my-5" style={{ border: 0, borderTop: '1px solid var(--brd)' }} />,
              input: ({ checked, ...rest }) => (
                <input
                  type="checkbox"
                  checked={checked}
                  readOnly
                  className="mr-1.5 align-middle"
                  style={{ accentColor: accentColor ?? 'var(--accent)' }}
                  {...rest}
                />
              ),
              strong: (p) => <strong style={{ color: 'var(--t)', fontWeight: 700 }} {...p} />,
              em:     (p) => <em style={{ color: 'var(--t)' }} {...p} />,
              del:    (p) => <del style={{ color: 'var(--t3)' }} {...p} />,
              table: (p) => (
                <div className="my-3 overflow-x-auto">
                  <table style={{ borderCollapse: 'collapse', color: 'var(--t2)', fontSize: 12.5 }} {...p} />
                </div>
              ),
              th: (p) => <th className="px-2 py-1 text-left font-semibold" style={{ borderBottom: '1px solid var(--brd2)', color: 'var(--t)' }} {...p} />,
              td: (p) => <td className="px-2 py-1" style={{ borderBottom: '1px solid var(--brd)' }} {...p} />,
              ...componentOverrides,
            }}
          >
            {sourceForRender}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
};
