import React from 'react';
import { TimerPhase } from '../../types';

interface CoffeeCupProps {
  progress: number; // 0-1
  isRunning: boolean;
  phase?: TimerPhase;
  size?: number;
}

export const CoffeeCup: React.FC<CoffeeCupProps> = ({
  progress,
  isRunning,
  phase = 'work',
  size = 180,
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
          <linearGradient id="cupGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#4a3828" />
            <stop offset="100%" stopColor="#2a1e14" />
          </linearGradient>
          <linearGradient id="coffeeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#7d5030" />
            <stop offset="100%" stopColor="#4a2e18" />
          </linearGradient>
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

        {/* Steam paths - only visible when running */}
        {isRunning && (
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
        )}

        {/* Cup body */}
        <path
          d="M62 72 L68 128 Q68 134 74 134 L106 134 Q112 134 112 128 L118 72 Z"
          fill="url(#cupGrad)"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="1"
        />

        {/* Coffee liquid */}
        <path
          d="M65 82 L67 128 Q67 132 73 132 L107 132 Q113 132 113 128 L115 82 Z"
          fill="url(#coffeeGrad)"
        />

        {/* Coffee surface highlight */}
        <ellipse
          cx="90"
          cy="83"
          rx="25"
          ry="5"
          fill="#9a6840"
          opacity="0.7"
        />

        {/* Foam/crema micro texture */}
        <circle cx="80" cy="83.5" r="3" fill="#b07848" opacity="0.4" />
        <circle cx="93" cy="81.5" r="2.2" fill="#b07848" opacity="0.35" />
        <circle cx="102" cy="84" r="2.5" fill="#b07848" opacity="0.35" />
        <circle cx="87" cy="86" r="1.5" fill="#c08858" opacity="0.3" />

        {/* Cup rim with subtle glow line */}
        <path
          d="M60 72 Q90 79 120 72"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />

        {/* Handle */}
        <path
          d="M112 88 Q132 88 132 102 Q132 116 112 116"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="5.5"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M112 88 Q128 88 128 102 Q128 116 112 116"
          stroke="#3d2c1e"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />

        {/* Saucer */}
        <ellipse cx="90" cy="137" rx="30" ry="4.5" fill="#2e2018" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
        <ellipse cx="90" cy="139.5" rx="37" ry="5" fill="#261a10" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />

        {/* Shine on cup */}
        <path
          d="M72 82 Q70 96 71 112"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    </div>
  );
};
