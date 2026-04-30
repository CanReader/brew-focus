import React from 'react';
import { HeadingItem } from './preprocessing';

interface Props {
  headings: HeadingItem[];
  onJump: (h: HeadingItem) => void;
  accentColor?: string;
}

/**
 * Compact heading outline shown to the right of the editor when there are
 * 2+ headings. Click a row to scroll preview / jump caret in edit mode.
 */
export const Outline: React.FC<Props> = ({ headings, onJump, accentColor }) => {
  if (headings.length === 0) {
    return (
      <div className="text-[11px]" style={{ color: 'var(--t3)', padding: '8px 4px' }}>
        No headings yet — type <code style={{ color: 'var(--t2)' }}>#</code> to add one.
      </div>
    );
  }

  // Compute the leftmost level so we don't waste indent space when the user
  // never used H1.
  const baseLevel = Math.min(...headings.map((h) => h.level));

  return (
    <div className="flex flex-col gap-px py-1" role="navigation" aria-label="Note outline">
      {headings.map((h, i) => {
        const indent = (h.level - baseLevel) * 10;
        const dotColor = h.level <= 1 + baseLevel ? (accentColor ?? 'var(--accent)') : 'var(--t3)';
        return (
          <button
            key={`${h.slug}-${i}`}
            onClick={() => onJump(h)}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-left transition-colors"
            style={{ paddingLeft: 8 + indent, color: 'var(--t2)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--card-h)'; e.currentTarget.style.color = 'var(--t)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--t2)'; }}
            title={h.text}
          >
            <span
              className="rounded-full shrink-0"
              style={{
                width: h.level <= 1 + baseLevel ? 5 : 3,
                height: h.level <= 1 + baseLevel ? 5 : 3,
                background: dotColor,
                opacity: h.level <= 1 + baseLevel ? 1 : 0.55,
              }}
            />
            <span
              className="truncate text-[12px]"
              style={{
                fontWeight: h.level <= 1 + baseLevel ? 600 : 400,
                fontSize: h.level <= 1 + baseLevel ? 12.5 : 11.5,
              }}
            >
              {h.text}
            </span>
          </button>
        );
      })}
    </div>
  );
};
