import React, { useMemo, useRef, useState } from 'react';
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check, Info, AlertTriangle, CheckCircle2, AlertOctagon } from 'lucide-react';
import { HeadingItem, slugify } from './preprocessing';

interface Props {
  /** Already-preprocessed markdown source (callouts, tags, wiki-links applied). */
  source: string;
  /** Raw, un-preprocessed source — used for accurate checkbox toggling. */
  rawSource: string;
  componentOverrides?: Partial<Components>;
  accentColor?: string;
  /** Called when an interactive checkbox is clicked. */
  onToggleCheckbox?: (rawSourceIndex: number) => void;
}

const CALLOUT_META: Record<string, { color: string; bg: string; icon: React.ComponentType<{ size?: number | string }>; label: string }> = {
  info:    { color: '#5b8dee', bg: 'rgba(91,141,238,0.10)', icon: Info,         label: 'Info' },
  note:    { color: '#5b8dee', bg: 'rgba(91,141,238,0.10)', icon: Info,         label: 'Note' },
  tip:     { color: '#22d3a5', bg: 'rgba(34,211,165,0.10)', icon: Info,         label: 'Tip' },
  warning: { color: '#f5a623', bg: 'rgba(245,166,35,0.10)', icon: AlertTriangle,label: 'Warning' },
  success: { color: '#22d3a5', bg: 'rgba(34,211,165,0.10)', icon: CheckCircle2, label: 'Success' },
  danger:  { color: '#ff4d4d', bg: 'rgba(255,77,77,0.10)',  icon: AlertOctagon, label: 'Danger' },
  error:   { color: '#ff4d4d', bg: 'rgba(255,77,77,0.10)',  icon: AlertOctagon, label: 'Error' },
  quote:   { color: '#a78bfa', bg: 'rgba(167,139,250,0.10)',icon: Info,         label: 'Quote' },
};

/** Index of every `- [ ]` / `- [x]` checkbox in the raw source — used to map a clicked
 *  rendered checkbox back to its source position so we can flip the right one. */
function findCheckboxPositions(raw: string): number[] {
  const positions: number[] = [];
  const re = /(^|\n)([ \t]*)[-*+]\s\[([ xX])\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) {
    // index of `[` in the match
    const idx = m.index + (m[1] ? 1 : 0) + m[2].length + 2;
    positions.push(idx);
  }
  return positions;
}

export const Preview: React.FC<Props> = ({
  source, rawSource, componentOverrides, accentColor, onToggleCheckbox,
}) => {
  const checkboxPositions = useMemo(() => findCheckboxPositions(rawSource), [rawSource]);
  // Counter-by-render: every time React invokes `input` for a checkbox during
  // this render, we map it to the next position. Reset on every render via a ref.
  const cbCursor = useRef(0);
  cbCursor.current = 0;

  // Slug counter (per render) so duplicate headings still get unique ids.
  const slugCounts = useMemo(() => new Map<string, number>(), [source]);

  return (
    <div
      className="rounded-xl p-4 markdown-body"
      style={{ background: 'var(--card)', border: '1px solid var(--brd)' }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: (p) => <Heading level={1} accentColor={accentColor} slugCounts={slugCounts} {...p} />,
          h2: (p) => <Heading level={2} accentColor={accentColor} slugCounts={slugCounts} {...p} />,
          h3: (p) => <Heading level={3} accentColor={accentColor} slugCounts={slugCounts} {...p} />,
          h4: (p) => <Heading level={4} accentColor={accentColor} slugCounts={slugCounts} {...p} />,
          h5: (p) => <Heading level={5} accentColor={accentColor} slugCounts={slugCounts} {...p} />,
          h6: (p) => <Heading level={6} accentColor={accentColor} slugCounts={slugCounts} {...p} />,
          p: (p) => <p className="leading-[1.7] my-3" style={{ color: 'var(--t2)', fontSize: 13.5 }} {...p} />,
          a: ({ href, children, ...rest }) => {
            // Tag pills come through with the brewfocus://tag/<slug> scheme.
            if (href && href.startsWith('brewfocus://tag/')) {
              const tagName = decodeURIComponent(href.replace('brewfocus://tag/', ''));
              return (
                <span
                  className="inline-flex items-center"
                  style={{
                    color: accentColor ?? 'var(--accent)',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid var(--brd)',
                    padding: '0 5px',
                    borderRadius: 4,
                    fontSize: '0.92em',
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                  }}
                  title={`Tag: ${tagName}`}
                >
                  {children}
                </span>
              );
            }
            // Default external link — only applied when no override took over.
            return (
              <a
                href={href}
                target="_blank"
                rel="noreferrer noopener"
                onClick={(e) => e.stopPropagation()}
                className="underline decoration-dotted underline-offset-2"
                style={{ color: accentColor ?? 'var(--blu)' }}
                {...rest}
              >{children}</a>
            );
          },
          ul: (p) => <ul className="my-3 pl-5 list-disc" style={{ color: 'var(--t2)' }} {...p} />,
          ol: (p) => <ol className="my-3 pl-5 list-decimal" style={{ color: 'var(--t2)' }} {...p} />,
          li: (p) => <li className="leading-[1.7] my-1" style={{ fontSize: 13.5 }} {...p} />,
          code: ({ className, children, ...rest }) => {
            const isBlock = (className ?? '').includes('language-');
            if (isBlock) {
              const lang = (className ?? '').replace('language-', '');
              return <CodeBlock lang={lang}>{String(children).replace(/\n$/, '')}</CodeBlock>;
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
          blockquote: ({ children, ...rest }) => {
            // Detect our callout marker: a comment `<!--callout:type:encodedTitle-->`
            // is the very first child.
            const calloutInfo = extractCalloutFromBlockquote(children);
            if (calloutInfo) {
              const meta = CALLOUT_META[calloutInfo.type] ?? CALLOUT_META.info;
              const Icon = meta.icon;
              return (
                <div
                  className="my-3 rounded-lg overflow-hidden"
                  style={{ background: meta.bg, borderLeft: `3px solid ${meta.color}` }}
                >
                  <div
                    className="flex items-center gap-1.5 px-3 pt-2 pb-1 text-[11.5px] font-semibold"
                    style={{ color: meta.color }}
                  >
                    <Icon size={12} />
                    <span>{calloutInfo.title || meta.label}</span>
                  </div>
                  <div className="px-3 pb-2" style={{ color: 'var(--t2)', fontSize: 13 }}>
                    {calloutInfo.body}
                  </div>
                </div>
              );
            }
            return (
              <blockquote
                className="my-3 pl-3 italic"
                style={{ borderLeft: `2px solid ${accentColor ?? 'var(--accent)'}`, color: 'var(--t2)' }}
                {...rest}
              >{children}</blockquote>
            );
          },
          hr: () => <hr className="my-5" style={{ border: 0, borderTop: '1px solid var(--brd)' }} />,
          input: ({ checked, ...rest }) => {
            // Checkbox in a task-list item — make it interactive.
            if (rest.type === 'checkbox' || rest.type === undefined) {
              const idx = cbCursor.current++;
              const sourcePos = checkboxPositions[idx];
              return (
                <input
                  type="checkbox"
                  checked={checked}
                  readOnly={!onToggleCheckbox}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (sourcePos != null && onToggleCheckbox) onToggleCheckbox(sourcePos);
                  }}
                  className="mr-1.5 align-middle"
                  style={{
                    accentColor: accentColor ?? 'var(--accent)',
                    cursor: onToggleCheckbox ? 'pointer' : 'default',
                  }}
                />
              );
            }
            return <input checked={checked} {...rest} />;
          },
          strong: (p) => <strong style={{ color: 'var(--t)', fontWeight: 700 }} {...p} />,
          em:     (p) => <em style={{ color: 'var(--t)' }} {...p} />,
          del:    (p) => <del style={{ color: 'var(--t3)' }} {...p} />,
          table: (p) => (
            <div className="my-3 overflow-x-auto rounded-lg" style={{ border: '1px solid var(--brd)' }}>
              <table style={{ borderCollapse: 'collapse', color: 'var(--t2)', fontSize: 12.5, width: '100%' }} {...p} />
            </div>
          ),
          th: (p) => <th className="px-2 py-1 text-left font-semibold" style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--brd2)', color: 'var(--t)' }} {...p} />,
          td: (p) => <td className="px-2 py-1" style={{ borderBottom: '1px solid var(--brd)' }} {...p} />,
          ...componentOverrides,
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
};

// ── Heading with stable slug id (for outline jumping) ───────────────────────

const Heading: React.FC<{ level: number; accentColor?: string; slugCounts: Map<string, number>; children?: React.ReactNode }> = ({ level, slugCounts, children }) => {
  const text = childrenToText(children);
  const baseSlug = slugify(text);
  const n = slugCounts.get(baseSlug) ?? 0;
  slugCounts.set(baseSlug, n + 1);
  const id = n === 0 ? baseSlug : `${baseSlug}-${n}`;

  const styles: Record<number, React.CSSProperties> = {
    1: { fontSize: 26, marginTop: 20, marginBottom: 12, color: 'var(--t)' },
    2: { fontSize: 21, marginTop: 20, marginBottom: 10, color: 'var(--t)' },
    3: { fontSize: 16, marginTop: 16, marginBottom: 8,  color: 'var(--t)' },
    4: { fontSize: 14, marginTop: 16, marginBottom: 8,  color: 'var(--t)' },
    5: { fontSize: 13, marginTop: 14, marginBottom: 6,  color: 'var(--t)' },
    6: { fontSize: 12, marginTop: 14, marginBottom: 6,  color: 'var(--t2)' },
  };
  const className = level <= 2 ? 'font-fraunces leading-tight' : 'font-semibold';
  const Tag = (`h${level}` as unknown) as React.ElementType;
  return <Tag id={id} className={className} style={styles[level]}>{children}</Tag>;
};

function childrenToText(node: React.ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(childrenToText).join('');
  if (React.isValidElement(node)) {
    const props = node.props as { children?: React.ReactNode };
    return childrenToText(props.children);
  }
  return '';
}

// ── Code block with language label and copy button ─────────────────────────

const CodeBlock: React.FC<{ lang: string; children: string }> = ({ lang, children }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch { /* clipboard not available — silent */ }
  };
  return (
    <div className="my-3 rounded-lg overflow-hidden" style={{ background: 'var(--bg2)', border: '1px solid var(--brd)' }}>
      <div
        className="flex items-center justify-between px-3 py-1 text-[10.5px] uppercase tracking-wider"
        style={{ color: 'var(--t3)', borderBottom: '1px solid var(--brd)', background: 'rgba(255,255,255,0.02)' }}
      >
        <span>{lang || 'code'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors"
          style={{ color: copied ? 'var(--grn)' : 'var(--t3)' }}
          onMouseEnter={(e) => { if (!copied) e.currentTarget.style.color = 'var(--t2)'; }}
          onMouseLeave={(e) => { if (!copied) e.currentTarget.style.color = 'var(--t3)'; }}
          title="Copy to clipboard"
        >
          {copied ? <Check size={10} /> : <Copy size={10} />}
          <span className="text-[9.5px] uppercase tracking-wider">{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre
        className="p-3 overflow-x-auto"
        style={{
          fontFamily: '\'JetBrains Mono\', \'Fira Code\', monospace',
          color: 'var(--t)',
          fontSize: 12.5,
          lineHeight: 1.55,
          margin: 0,
        }}
      >
        <code>{children}</code>
      </pre>
    </div>
  );
};

// ── Callout extraction from a blockquote subtree ────────────────────────────
// The first child should be an HTML comment `<!--callout:type:encodedTitle-->`
// (set by preprocessCallouts), followed by the body. We detect it by walking
// the parsed children and pulling out the leading marker.

interface CalloutInfo { type: string; title: string; body: React.ReactNode }

function extractCalloutFromBlockquote(children: React.ReactNode): CalloutInfo | null {
  // ReactMarkdown wraps blockquote content in <p> elements. The HTML comment
  // is rendered as nothing, but it still appears as raw text in some setups.
  // To detect it we look for the first non-empty text node and try to match it.
  let info: CalloutInfo | null = null;
  let foundIdx = -1;
  const arr = React.Children.toArray(children);

  for (let i = 0; i < arr.length; i++) {
    const node = arr[i];
    const text = childrenToText(node).trim();
    if (!text) continue;
    const m = text.match(/^<!--callout:(\w+):([^-]*)-->/);
    if (m) {
      const title = decodeURIComponent(m[2] || '');
      info = { type: m[1].toLowerCase(), title, body: null };
      foundIdx = i;
    }
    break;
  }

  if (!info) return null;

  // Body = all children after the marker; the marker's own paragraph is dropped.
  // If the marker shared a paragraph with body text after `-->`, surface that too.
  const remaining: React.ReactNode[] = [];
  for (let i = foundIdx; i < arr.length; i++) {
    const node = arr[i];
    if (i === foundIdx) {
      // Try to extract anything after the comment from this same paragraph.
      const text = childrenToText(node);
      const after = text.replace(/^<!--callout:\w+:[^-]*-->\s*/, '');
      if (after) remaining.push(<p key={`co-${i}`} style={{ margin: 0 }}>{after}</p>);
      continue;
    }
    remaining.push(node);
  }
  info.body = remaining;
  return info;
}

// ── Heading source-line lookup helper (used by Outline jump) ────────────────

export function findHeadingScrollTarget(slug: string): HTMLElement | null {
  return document.getElementById(slug);
}

// Re-export for parent convenience
export type { HeadingItem };
