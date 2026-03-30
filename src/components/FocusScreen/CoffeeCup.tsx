import React from 'react';

interface CoffeeCupProps {
  progress: number; // 0-1
  isRunning: boolean;
  size?: number;
}

export const CoffeeCup: React.FC<CoffeeCupProps> = ({
  progress,
  isRunning,
  size = 180,
}) => {
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);
  const cx = 90;
  const cy = 90;

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
        {/* Background track circle */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke="var(--brd)"
          strokeWidth="3"
          fill="none"
        />

        {/* Progress arc */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke="var(--accent)"
          strokeWidth="3.5"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />

        {/* Steam paths - only visible when running */}
        {isRunning && (
          <g opacity="0.7">
            <path
              d="M74 52 Q72 45 75 38 Q78 31 76 24"
              stroke="var(--t3)"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
              className="steam-path"
            />
            <path
              d="M90 50 Q88 43 91 36 Q94 29 92 22"
              stroke="var(--t3)"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
              className="steam-path"
              style={{ animationDelay: '0.5s' }}
            />
            <path
              d="M106 52 Q104 45 107 38 Q110 31 108 24"
              stroke="var(--t3)"
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
          fill="#3d2c1e"
          stroke="#4a3728"
          strokeWidth="1.5"
        />

        {/* Coffee liquid */}
        <path
          d="M65 82 L67 128 Q67 132 73 132 L107 132 Q113 132 113 128 L115 82 Z"
          fill="#6b4226"
        />

        {/* Coffee surface highlight */}
        <ellipse
          cx="90"
          cy="83"
          rx="25"
          ry="5"
          fill="#7d5030"
          opacity="0.8"
        />

        {/* Cup rim */}
        <path
          d="M60 72 Q90 78 120 72"
          stroke="#5a3d2b"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />

        {/* Handle */}
        <path
          d="M112 88 Q132 88 132 102 Q132 116 112 116"
          stroke="#4a3728"
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M112 88 Q128 88 128 102 Q128 116 112 116"
          stroke="#3d2c1e"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />

        {/* Saucer */}
        <ellipse cx="90" cy="137" rx="30" ry="5" fill="#3d2c1e" stroke="#4a3728" strokeWidth="1" />
        <ellipse cx="90" cy="139" rx="36" ry="5" fill="#342519" stroke="#3d2c1e" strokeWidth="1" />

        {/* Shine on cup */}
        <path
          d="M72 82 Q70 95 71 110"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
        />

        {/* Foam dots on coffee */}
        <circle cx="82" cy="84" r="2.5" fill="#8b6240" opacity="0.6" />
        <circle cx="93" cy="82" r="1.8" fill="#8b6240" opacity="0.5" />
        <circle cx="100" cy="85" r="2" fill="#8b6240" opacity="0.5" />
      </svg>
    </div>
  );
};
