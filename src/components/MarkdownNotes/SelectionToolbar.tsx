import React from 'react';
import { Bold, Italic, Strikethrough, Code, Link2, Highlighter } from 'lucide-react';

export type ToolbarAction = 'bold' | 'italic' | 'strike' | 'code' | 'link' | 'highlight';

interface Props {
  position: { top: number; left: number };
  onAction: (action: ToolbarAction) => void;
}

const BUTTONS: Array<{ id: ToolbarAction; icon: React.ComponentType<{ size?: number | string }>; title: string }> = [
  { id: 'bold',      icon: Bold,          title: 'Bold (Ctrl+B)' },
  { id: 'italic',    icon: Italic,        title: 'Italic (Ctrl+I)' },
  { id: 'strike',    icon: Strikethrough, title: 'Strikethrough (Ctrl+Shift+X)' },
  { id: 'code',      icon: Code,          title: 'Inline code (Ctrl+E)' },
  { id: 'link',      icon: Link2,         title: 'Link (Ctrl+K)' },
  { id: 'highlight', icon: Highlighter,   title: 'Highlight' },
];

export const SelectionToolbar: React.FC<Props> = ({ position, onAction }) => {
  return (
    <div
      role="toolbar"
      className="fixed z-[55] flex items-center gap-0.5 rounded-lg p-0.5 shadow-2xl"
      style={{
        top: position.top,
        left: position.left,
        transform: 'translate(-50%, -100%)',
        background: 'var(--card)',
        border: '1px solid var(--brd2)',
      }}
      onMouseDown={(e) => e.preventDefault() /* keep textarea selection alive */}
    >
      {BUTTONS.map((b) => {
        const Icon = b.icon;
        return (
          <button
            key={b.id}
            title={b.title}
            onClick={() => onAction(b.id)}
            className="w-7 h-7 flex items-center justify-center rounded-md transition-colors"
            style={{ color: 'var(--t2)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--card-h)'; e.currentTarget.style.color = 'var(--t)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--t2)'; }}
          >
            <Icon size={13} />
          </button>
        );
      })}
    </div>
  );
};
