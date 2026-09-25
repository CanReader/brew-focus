import { describe, expect, it } from 'vitest';
import { inkOn, relativeLuminance } from './ink';

describe('ink', () => {
  it('computes WCAG luminance', () => {
    expect(relativeLuminance('#000000')).toBe(0);
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1);
    expect(relativeLuminance('not a colour')).toBe(0);
  });

  it('picks light ink on dark fills and dark ink on light fills', () => {
    expect(inkOn('#1a120b')).toBe('#fffaf4');
    expect(inkOn('#f5e6d3')).toBe('#1a120b');
  });
});
