import React from 'react';

interface TimerDigitsProps {
  /** Formatted time, e.g. "24:59". */
  value: string;
  className?: string;
  style?: React.CSSProperties;
}

// Fraunces ships no tabular figures, so `font-variant-numeric: tabular-nums`
// does nothing and the countdown visibly reflows as glyph widths change each
// second. Rendering every character in a fixed-width cell pins the layout.
// Cell widths were measured from the TTF by @mobile; reused verbatim so both
// platforms lay the digits out identically. em-based so they track font-size.
const DIGIT_CELL = '0.68em';
const SEPARATOR_CELL = '0.30em';

export const TimerDigits: React.FC<TimerDigitsProps> = ({ value, className, style }) => (
  <span
    className={className}
    // Letter-spacing would stack on top of the cells and reintroduce drift, so
    // spacing is owned entirely by the cell widths here.
    style={{ ...style, display: 'inline-flex', alignItems: 'baseline', letterSpacing: 0 }}
  >
    {value.split('').map((char, i) => (
      <span
        key={i}
        style={{
          display: 'inline-block',
          width: /\d/.test(char) ? DIGIT_CELL : SEPARATOR_CELL,
          textAlign: 'center',
        }}
      >
        {char}
      </span>
    ))}
  </span>
);
