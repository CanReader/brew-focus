import React from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, SkipForward, RotateCcw, Maximize2, PictureInPicture2 } from 'lucide-react';

interface TimerControlsProps {
  isRunning: boolean;
  onPlay: () => void;
  onPause: () => void;
  onSkip: () => void;
  onReset: () => void;
  onFullscreen: () => void;
  onWidget: () => void;
}

const GlassIconButton: React.FC<{
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}> = ({ onClick, title, children }) => (
  <motion.button
    whileHover={{ scale: 1.08 }}
    whileTap={{ scale: 0.93 }}
    onClick={onClick}
    className="w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-150"
    style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      color: 'var(--t3)',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
      e.currentTarget.style.color = 'var(--t2)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
      e.currentTarget.style.color = 'var(--t3)';
    }}
    title={title}
  >
    {children}
  </motion.button>
);

export const TimerControls: React.FC<TimerControlsProps> = ({
  isRunning,
  onPlay,
  onPause,
  onSkip,
  onReset,
  onFullscreen,
  onWidget,
}) => {
  return (
    <div className="flex items-center gap-3">
      {/* Reset */}
      <GlassIconButton onClick={onReset} title="Reset">
        <RotateCcw size={16} />
      </GlassIconButton>

      {/* Play / Pause — larger, more dramatic */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.93 }}
        onClick={isRunning ? onPause : onPlay}
        className="w-[72px] h-[72px] flex items-center justify-center rounded-2xl relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, var(--accent) 0%, #ff2929 100%)',
          boxShadow: '0 6px 28px var(--accent-g), 0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15)',
        }}
      >
        {/* Inner shine */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 50%)',
            borderRadius: 'inherit',
          }}
        />
        <motion.div
          key={isRunning ? 'pause' : 'play'}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.15, ease: 'backOut' }}
          className="relative z-10"
        >
          {isRunning ? (
            <Pause size={28} fill="white" color="white" />
          ) : (
            <Play size={28} fill="white" color="white" style={{ marginLeft: 3 }} />
          )}
        </motion.div>
      </motion.button>

      {/* Skip */}
      <GlassIconButton onClick={onSkip} title="Skip">
        <SkipForward size={16} />
      </GlassIconButton>

      {/* Divider */}
      <div
        className="w-px h-7 mx-0.5"
        style={{ background: 'rgba(255,255,255,0.06)' }}
      />

      {/* Fullscreen */}
      <GlassIconButton onClick={onFullscreen} title="Fullscreen">
        <Maximize2 size={14} />
      </GlassIconButton>

      {/* Widget / PiP */}
      <GlassIconButton onClick={onWidget} title="Widget mode">
        <PictureInPicture2 size={14} />
      </GlassIconButton>
    </div>
  );
};
