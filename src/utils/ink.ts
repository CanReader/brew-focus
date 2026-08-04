/**
 * Foreground ("ink") selection for a filled surface.
 *
 * Always derive ink from the colour actually painted, never from an assumption
 * about which token was used — a danger-tinted or phase-tinted surface has to
 * compute its own ink, and the accent itself changes between the dark and light
 * tiers. Mirrors mobile's `onColor` helper.
 */

function channel(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

/** WCAG relative luminance for a "#rrggbb" colour. */
export function relativeLuminance(hex: string): number {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return 0;
  const n = parseInt(m[1], 16);
  return (
    0.2126 * channel((n >> 16) & 255) +
    0.7152 * channel((n >> 8) & 255) +
    0.0722 * channel(n & 255)
  );
}

const LIGHT_INK = '#fffaf4';
const DARK_INK = '#1a120b';

/**
 * Returns whichever of light/dark ink contrasts better against `hex`. Both
 * candidates are warm rather than pure black/white so they sit inside the Warm
 * Brew palette instead of punching out of it.
 */
export function inkOn(hex: string): string {
  const bg = relativeLuminance(hex);
  const contrast = (fg: string) => {
    const f = relativeLuminance(fg);
    const [hi, lo] = f > bg ? [f, bg] : [bg, f];
    return (hi + 0.05) / (lo + 0.05);
  };
  return contrast(LIGHT_INK) >= contrast(DARK_INK) ? LIGHT_INK : DARK_INK;
}
