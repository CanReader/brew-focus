/**
 * Liquid-surface geometry for the brew scene.
 *
 * Mirrors mobile's `src/scene/liquidGeometry.ts` — the boxes were measured from
 * the actual bundled cup path data and MUST stay byte-identical across the two
 * apps, so edit both or neither. (Desktop keeps pure geometry under utils/;
 * mobile keeps it under scene/. Same table, same math.)
 *
 * Coordinates are in the cups' 180x180 viewBox. For a box, `y` is the brim and
 * `y + h` is the floor, so level 0 sits at `y + h` and level 1 at `y`. Each box
 * is inset to its cup's narrowest interior width, which is why a plain rect can
 * never spill outside the silhouette near the floor — no clip path required.
 */

export interface LiquidBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

const LIQUID_BOXES: Record<string, LiquidBox> = {
  classic: { x: 68, y: 78, w: 44, h: 56 },
  latte: { x: 73, y: 62, w: 34, h: 78 },
  cappuccino: { x: 56, y: 88, w: 68, h: 48 },
  espresso: { x: 77, y: 92, w: 26, h: 38 },
  'cold-brew': { x: 71, y: 62, w: 38, h: 80 },
  matcha: { x: 62, y: 92, w: 56, h: 46 },
};

/** Server-added cups have no measured box; this one suits a typical mug. */
const FALLBACK_BOX: LiquidBox = { x: 66, y: 80, w: 48, h: 58 };

/**
 * Escape hatch for a variant whose art the standard box misfits — add its id
 * here and the liquid layer is skipped for that cup only, leaving the base art
 * untouched rather than drawing something wrong.
 */
const DISABLED_VARIANTS = new Set<string>();

/** Returns null when the liquid layer should not render for this variant. */
export function liquidBoxFor(variantId: string): LiquidBox | null {
  if (DISABLED_VARIANTS.has(variantId)) return null;
  return LIQUID_BOXES[variantId] ?? FALLBACK_BOX;
}

/** Y coordinate of the liquid surface for `level` in 0..1 (0 = floor, 1 = brim). */
export function surfaceY(box: LiquidBox, level: number): number {
  const clamped = Math.min(1, Math.max(0, level));
  return box.y + box.h * (1 - clamped);
}
