import React, { useEffect, useId, useMemo, useState } from 'react';
import { TimerPhase } from '../../types';
import {
  useCoffeeCupCatalogStore,
  getBundledSvg,
} from '../../store/coffeeCupCatalogStore';
import { extractInnerSvg } from '../../utils/svgExtract';

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
    phase === 'work' ? 'rgba(255,77,77,0.08)' :
    phase === 'shortBreak' ? 'rgba(34,211,165,0.08)' :
    'rgba(91,141,238,0.08)';

  const glowId = `progress-glow-${phase}`;

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
  const instanceId = useId().replace(/:/g, '_');
  const idPrefix = `cup-${variantId}-${instanceId}`;

  const innerSvgHtml = useMemo(
    () => (rawSvg ? extractInnerSvg(rawSvg, idPrefix) : ''),
    [rawSvg, idPrefix],
  );

  const showSteam = isRunning && variant.supportsSteam;

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
          <radialGradient id="steamGrad" cx="50%" cy="100%" r="50%">
            <stop offset="0%" stopColor="var(--t2)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="var(--t2)" stopOpacity="0" />
          </radialGradient>
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
        {showSteam && <Steam />}

        {/* The actual cup body (inlined from the variant's SVG payload). */}
        {innerSvgHtml && (
          <g dangerouslySetInnerHTML={{ __html: innerSvgHtml }} />
        )}
      </svg>
    </div>
  );
};

const Steam: React.FC = () => (
  <g>
    <path
      d="M74 52 Q72 44 75 37 Q78 30 76 23"
      stroke="url(#steamGrad)"
      strokeWidth="2"
      strokeLinecap="round"
      fill="none"
      className="steam-path"
    />
    <path
      d="M90 50 Q88 42 91 35 Q94 28 92 21"
      stroke="url(#steamGrad)"
      strokeWidth="2"
      strokeLinecap="round"
      fill="none"
      className="steam-path"
      style={{ animationDelay: '0.5s' }}
    />
    <path
      d="M106 52 Q104 44 107 37 Q110 30 108 23"
      stroke="url(#steamGrad)"
      strokeWidth="2"
      strokeLinecap="round"
      fill="none"
      className="steam-path"
      style={{ animationDelay: '1s' }}
    />
  </g>
);
