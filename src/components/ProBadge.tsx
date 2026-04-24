import React from 'react';
import { Crown } from 'lucide-react';

// Pro tier is not yet released. Keep the component wired up so we can flip this
// flag back on once pricing ships, but render nothing for now.
const PRO_BADGES_ENABLED = false;

export const ProBadge: React.FC<{ size?: 'sm' | 'md' }> = ({ size = 'sm' }) => {
  if (!PRO_BADGES_ENABLED) return null;
  const isMd = size === 'md';
  return (
    <span
      className="inline-flex items-center shrink-0"
      style={{
        gap: isMd ? 4 : 3,
        padding: isMd ? '3px 8px' : '2px 6px',
        borderRadius: 999,
        background: 'var(--accent-d, rgba(255,255,255,0.08))',
        border: '1px solid color-mix(in srgb, var(--accent) 35%, transparent)',
        color: 'var(--accent)',
        fontSize: isMd ? 10 : 9,
        fontWeight: 800,
        letterSpacing: '0.08em',
        lineHeight: 1,
      }}
    >
      <Crown size={isMd ? 11 : 9} strokeWidth={2.5} />
      PRO
    </span>
  );
};
