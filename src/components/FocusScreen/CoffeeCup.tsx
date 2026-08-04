import React, { useEffect, useId, useMemo, useState } from 'react';
import { TimerPhase } from '../../types';
import {
  useCoffeeCupCatalogStore,
  getBundledSvg,
} from '../../store/coffeeCupCatalogStore';
import { extractInnerSvg } from '../../utils/svgExtract';
import { liquidBoxFor, surfaceY } from '../../utils/liquidGeometry';

interface CoffeeCupProps {
  progress: number;
  isRunning: boolean;
  phase?: TimerPhase;
  size?: number;
  /** Variant id from the catalog. Falls back to `'classic'` if unknown. */
  variantId?: string;
}

export const CoffeeCup: React.FC<CoffeeCupProps> = ({
  progress,
  isRunning,
  phase = 'work',
  size = 180,
  variantId = 'classic',
}) => {
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);
  const cx = 90;
  const cy = 90;

  const phaseStrokeColor =
    phase === 'work' ? 'var(--accent)' :
    phase === 'shortBreak' ? 'var(--grn)' :
    'var(--blu)';

  const phaseTrackColor =
    phase === 'work' ? 'rgba(var(--accent-rgb),0.08)' :
    phase === 'shortBreak' ? 'rgba(var(--grn-rgb),0.08)' :
    'rgba(var(--blu-rgb),0.08)';

  // Phase's rgb triplet, so the liquid can compose its own alphas.
  const phaseRgb =
    phase === 'work' ? 'var(--accent-rgb)' :
    phase === 'shortBreak' ? 'var(--grn-rgb)' :
    'var(--blu-rgb)';

  // ── Catalog lookup ─────────────────────────────────────────────────────────
  const { catalog, getSvgFor } = useCoffeeCupCatalogStore();
  const variant = useMemo(() => {
    return (
      catalog.find((v) => v.id === variantId) ??
      catalog.find((v) => v.id === 'classic') ??
      // Last-resort minimal stub so we still render the progress ring even if
      // an unknown id is passed before the catalog has loaded.
      {
        id: variantId,
        label: variantId,
        subtitle: '',
        svgUrl: '',
        supportsSteam: false,
        sortOrder: 0,
        isPremium: false,
      }
    );
  }, [catalog, variantId]);

  // Seed synchronously from the bundled set when available so the very first
  // paint already shows the right cup body for any of the 6 defaults.
  const [rawSvg, setRawSvg] = useState<string | null>(
    () => getBundledSvg(variantId) ?? getBundledSvg('classic'),
  );

  useEffect(() => {
    let cancelled = false;
    void getSvgFor(variantId).then((svg) => {
      if (!cancelled && svg) setRawSvg(svg);
    });
    return () => { cancelled = true; };
  }, [variantId, getSvgFor]);

  // Per-instance id prefix to avoid SVG id collisions when multiple CoffeeCup
  // instances are mounted in the same DOM (picker grid behind the live cup).
  // Every id in this subtree must carry it — duplicate ids make url(#…) resolve
  // to whichever element happens to come first in document order.
  const instanceId = useId().replace(/:/g, '_');
  const idPrefix = `cup-${variantId}-${instanceId}`;
  const glowId = `${idPrefix}-glow`;
  const steamGradId = `${idPrefix}-steam`;
  const steamBlurId = `${idPrefix}-steam-blur`;
  const liquidGradId = `${idPrefix}-liquid`;

  const innerSvgHtml = useMemo(
    () => (rawSvg ? extractInnerSvg(rawSvg, idPrefix) : ''),
    [rawSvg, idPrefix],
  );

  const showSteam = isRunning && variant.supportsSteam;

  // The catalog art is already painted full, so this is NOT an empty-to-full
  // fill: it's a translucent phase-tinted column with a brighter meniscus that
  // rises with progress, reading as the brew deepening. Nothing renders at 0%.
  const liquidBox = liquidBoxFor(variantId);
  const liquidTop = liquidBox ? surfaceY(liquidBox, progress) : 0;
  // Paused cools toward neutral rather than merely dimming, so a paused brew
  // reads as going cold instead of just being a fainter running one.
  const liquidRgb = isRunning ? phaseRgb : 'var(--t3-rgb)';
  const meniscusAlpha = isRunning ? 0.55 : 0.26;

  return (
    <div
      className={`relative ${isRunning ? 'cup-running' : ''}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 180 180"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Softer steam: a wide, low-opacity gradient plus a blur, so the
              wisps read as vapour rather than as drawn strokes. */}
          <radialGradient id={steamGradId} cx="50%" cy="100%" r="60%">
            <stop offset="0%" stopColor="var(--t2)" stopOpacity="0.34" />
            <stop offset="55%" stopColor="var(--t2)" stopOpacity="0.16" />
            <stop offset="100%" stopColor="var(--t2)" stopOpacity="0" />
          </radialGradient>
          <filter id={steamBlurId} x="-60%" y="-30%" width="220%" height="180%">
            <feGaussianBlur stdDeviation="1.6" />
          </filter>
          {/* Glow at the surface fading to wash at the floor: warmth sits where
              the action is (the rising line), and keeping the floor subtle stops
              the translucent column muddying the darkest part of the art below. */}
          <linearGradient id={liquidGradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={`rgba(${liquidRgb},${isRunning ? 0.28 : 0.17})`} />
            <stop offset="100%" stopColor={`rgba(${liquidRgb},${isRunning ? 0.14 : 0.09})`} />
          </linearGradient>
        </defs>

        {/* Background track circle */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={phaseTrackColor}
          strokeWidth="3"
          fill="none"
        />

        {/* Progress arc with glow */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={phaseStrokeColor}
          strokeWidth="3.5"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          transform={`rotate(-90 ${cx} ${cy})`}
          filter={progress > 0.05 ? `url(#${glowId})` : undefined}
          style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.8s ease' }}
        />

        {/* Progress end dot glow */}
        {progress > 0.03 && progress < 0.99 && (
          <circle
            cx={cx + radius * Math.cos((-90 + 360 * progress) * Math.PI / 180)}
            cy={cy + radius * Math.sin((-90 + 360 * progress) * Math.PI / 180)}
            r="4"
            fill={phaseStrokeColor}
            opacity="0.8"
            filter={`url(#${glowId})`}
          />
        )}

        {/* Steam — variant-gated */}
        {showSteam && <Steam gradId={steamGradId} blurId={steamBlurId} />}

        {/* The actual cup body (inlined from the variant's SVG payload). */}
        {innerSvgHtml && (
          <g dangerouslySetInnerHTML={{ __html: innerSvgHtml }} />
        )}

        {/* Liquid — drawn after the body so it tints the art rather than
            replacing it. Boxes are inset to each cup's narrowest interior, so
            plain rects stay inside the silhouette without a clip path. */}
        {liquidBox && progress > 0.001 && (
          <g pointerEvents="none">
            <rect
              x={liquidBox.x}
              y={liquidTop}
              width={liquidBox.w}
              height={liquidBox.y + liquidBox.h - liquidTop}
              fill={`url(#${liquidGradId})`}
              style={{ transition: 'y 0.5s ease, height 0.5s ease' }}
            />
            <rect
              x={liquidBox.x}
              y={liquidTop - 0.6}
              width={liquidBox.w}
              height={1.2}
              fill={`rgba(${liquidRgb},${meniscusAlpha})`}
              style={{ transition: 'y 0.5s ease' }}
            />
            {/* Crema at the brim. Deliberately a literal warm off-white: it is
                scene art, not chrome — deriving it from --t would flip it dark
                on light themes, and crema is never dark. */}
            {progress >= 0.97 && (
              <rect
                x={liquidBox.x}
                y={liquidTop}
                width={liquidBox.w}
                height={2.6}
                fill="rgba(255,236,208,0.42)"
              />
            )}
          </g>
        )}
      </svg>
    </div>
  );
};

// Three layered wisps. Wider strokes at lower opacity plus a blur read as
// vapour; the previous 2px hard strokes read as drawn lines.
const STEAM_WISPS = [
  { d: 'M74 52 Q71 43 75 36 Q79 29 76 21', width: 3.4, delay: '0s' },
  { d: 'M90 50 Q87 41 91 34 Q95 27 92 19', width: 3.8, delay: '0.5s' },
  { d: 'M106 52 Q103 43 107 36 Q111 29 108 21', width: 3.4, delay: '1s' },
];

const Steam: React.FC<{ gradId: string; blurId: string }> = ({ gradId, blurId }) => (
  <g filter={`url(#${blurId})`}>
    {STEAM_WISPS.map((wisp) => (
      <path
        key={wisp.d}
        d={wisp.d}
        stroke={`url(#${gradId})`}
        strokeWidth={wisp.width}
        strokeLinecap="round"
        fill="none"
        className="steam-path"
        style={{ animationDelay: wisp.delay }}
      />
    ))}
  </g>
);
