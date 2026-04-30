import React, { useEffect, useMemo, useRef } from 'react';
import {
  Heading1, Heading2, Heading3, List, ListOrdered, CheckSquare, Quote, Code,
  Minus, Info, AlertTriangle, CheckCircle2, AlertOctagon, Table as TableIcon,
} from 'lucide-react';

export interface SlashCommand {
  id: string;
  label: string;
  hint: string;
  keywords: string[];
  icon: React.ComponentType<{ size?: number | string }>;
  /** Returns the snippet to insert and the relative cursor offset within it. */
  build: () => { snippet: string; cursorOffset: number };
}

export const SLASH_COMMANDS: SlashCommand[] = [
  { id: 'h1', label: 'Heading 1', hint: 'Big section heading',  keywords: ['h1','heading','title'],
    icon: Heading1, build: () => ({ snippet: '# ', cursorOffset: 2 }) },
  { id: 'h2', label: 'Heading 2', hint: 'Medium heading',        keywords: ['h2','heading'],
    icon: Heading2, build: () => ({ snippet: '## ', cursorOffset: 3 }) },
  { id: 'h3', label: 'Heading 3', hint: 'Small heading',         keywords: ['h3','heading'],
    icon: Heading3, build: () => ({ snippet: '### ', cursorOffset: 4 }) },
  { id: 'bullet', label: 'Bullet list', hint: 'Unordered list',  keywords: ['bullet','list','ul','-'],
    icon: List, build: () => ({ snippet: '- ', cursorOffset: 2 }) },
  { id: 'numbered', label: 'Numbered list', hint: 'Ordered list', keywords: ['number','ordered','ol','1.'],
    icon: ListOrdered, build: () => ({ snippet: '1. ', cursorOffset: 3 }) },
  { id: 'todo', label: 'To-do list', hint: 'Checklist with boxes', keywords: ['todo','task','check','box'],
    icon: CheckSquare, build: () => ({ snippet: '- [ ] ', cursorOffset: 6 }) },
  { id: 'quote', label: 'Quote', hint: 'Indented block quote',   keywords: ['quote','blockquote','>'],
    icon: Quote, build: () => ({ snippet: '> ', cursorOffset: 2 }) },
  { id: 'code', label: 'Code block', hint: 'Fenced code with language', keywords: ['code','pre','fence','```'],
    icon: Code, build: () => ({ snippet: '```\n\n```\n', cursorOffset: 4 }) },
  { id: 'divider', label: 'Divider', hint: 'Horizontal rule',    keywords: ['divider','hr','rule','---'],
    icon: Minus, build: () => ({ snippet: '\n---\n', cursorOffset: 5 }) },
  { id: 'table', label: 'Table', hint: '2x2 markdown table',     keywords: ['table','grid'],
    icon: TableIcon, build: () => ({ snippet: '| Col 1 | Col 2 |\n| --- | --- |\n|  |  |\n', cursorOffset: 9 }) },
  { id: 'callout-info', label: 'Callout · Info', hint: 'Highlighted info block', keywords: ['callout','info','admonition'],
    icon: Info, build: () => ({ snippet: '> [!info] Info\n> \n', cursorOffset: 17 }) },
  { id: 'callout-warning', label: 'Callout · Warning', hint: 'Heads-up block',  keywords: ['callout','warning','warn'],
    icon: AlertTriangle, build: () => ({ snippet: '> [!warning] Heads up\n> \n', cursorOffset: 24 }) },
  { id: 'callout-success', label: 'Callout · Success', hint: 'Positive block', keywords: ['callout','success','done','ok'],
    icon: CheckCircle2, build: () => ({ snippet: '> [!success] Nice\n> \n', cursorOffset: 20 }) },
  { id: 'callout-danger', label: 'Callout · Danger', hint: 'Critical block',   keywords: ['callout','danger','error','red'],
    icon: AlertOctagon, build: () => ({ snippet: '> [!danger] Careful\n> \n', cursorOffset: 22 }) },
];

interface Props {
  query: string;
  position: { top: number; left: number };
  selectedIndex: number;
  onSelectedIndexChange: (idx: number) => void;
  onSelect: (cmd: SlashCommand) => void;
}

export const SlashMenu: React.FC<Props> = ({
  query, position, selectedIndex, onSelectedIndexChange, onSelect,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return SLASH_COMMANDS;
    return SLASH_COMMANDS.filter((c) =>
      c.label.toLowerCase().includes(q) ||
      c.keywords.some((k) => k.startsWith(q)),
    );
  }, [query]);

  useEffect(() => {
    // Clamp selection when filter shrinks the list.
    if (selectedIndex >= filtered.length && filtered.length > 0) {
      onSelectedIndexChange(0);
    }
  }, [filtered.length, selectedIndex, onSelectedIndexChange]);

  // Scroll the active item into view as the user arrows through.
  useEffect(() => {
    const list = ref.current;
    if (!list) return;
    const item = list.querySelector<HTMLElement>(`[data-idx="${selectedIndex}"]`);
    if (item) item.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (filtered.length === 0) return null;

  return (
    <div
      ref={ref}
      role="listbox"
      className="fixed z-[60] rounded-xl overflow-y-auto shadow-2xl"
      style={{
        top: position.top,
        left: position.left,
        background: 'var(--card)',
        border: '1px solid var(--brd2)',
        width: 280,
        maxHeight: 320,
      }}
      onMouseDown={(e) => e.preventDefault() /* keep textarea focused */}
    >
      <div
        className="px-3 py-1.5 text-[10px] uppercase tracking-wider"
        style={{ color: 'var(--t3)', borderBottom: '1px solid var(--brd)' }}
      >
        {query ? `Filter: "${query}"` : 'Insert block'}
      </div>
      <div className="py-1">
        {filtered.map((cmd, i) => {
          const Icon = cmd.icon;
          const active = i === selectedIndex;
          return (
            <button
              key={cmd.id}
              data-idx={i}
              role="option"
              aria-selected={active}
              onMouseEnter={() => onSelectedIndexChange(i)}
              onClick={() => onSelect(cmd)}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-left transition-colors"
              style={{
                background: active ? 'var(--card-h)' : 'transparent',
                color: active ? 'var(--t)' : 'var(--t2)',
              }}
            >
              <span
                className="w-7 h-7 flex items-center justify-center rounded-md shrink-0"
                style={{
                  background: active ? 'var(--bg2)' : 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--brd)',
                  color: active ? 'var(--t)' : 'var(--t3)',
                }}
              >
                <Icon size={13} />
              </span>
              <span className="flex flex-col min-w-0">
                <span className="text-[12.5px] font-medium leading-tight">{cmd.label}</span>
                <span className="text-[10.5px] truncate" style={{ color: 'var(--t3)' }}>{cmd.hint}</span>
              </span>
            </button>
          );
        })}
      </div>
      <div
        className="px-3 py-1.5 text-[10px] flex items-center gap-3"
        style={{ color: 'var(--t3)', borderTop: '1px solid var(--brd)' }}
      >
        <span><kbd style={kbdStyle}>↑↓</kbd> select</span>
        <span><kbd style={kbdStyle}>↵</kbd> insert</span>
        <span className="ml-auto"><kbd style={kbdStyle}>Esc</kbd> close</span>
      </div>
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
