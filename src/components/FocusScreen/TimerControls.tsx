import React from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, SkipForward, RotateCcw, Maximize2 } from 'lucide-react';

interface TimerControlsProps {
  isRunning: boolean;
  onPlay: () => void;
  onPause: () => void;
  onSkip: () => void;
  onReset: () => void;
  onFullscreen: () => void;
}

export const TimerControls: React.FC<TimerControlsProps> = ({
  isRunning,
  onPlay,
  onPause,
  onSkip,
  onReset,
  onFullscreen,
}) => {
  return (
    <div className="flex items-center gap-4">
      {/* Reset */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={onReset}
        className="w-9 h-9 flex items-center justify-center rounded-full transition-colors"
        style={{ color: 'var(--t3)', background: 'var(--card)' }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--card-h)';
          e.currentTarget.style.color = 'var(--t2)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'var(--card)';
          e.currentTarget.style.color = 'var(--t3)';
        }}
        title="Reset"
      >
        <RotateCcw size={16} />
      </motion.button>

      {/* Play / Pause */}
      <motion.button
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        onClick={isRunning ? onPause : onPlay}
        className="w-16 h-16 flex items-center justify-center rounded-full shadow-lg"
        style={{
          background: 'var(--accent)',
          boxShadow: '0 4px 24px var(--accent-g)',
        }}
      >
        <motion.div
          key={isRunning ? 'pause' : 'play'}
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.15 }}
        >
          {isRunning ? (
            <Pause size={26} fill="white" color="white" />
          ) : (
            <Play size={26} fill="white" color="white" style={{ marginLeft: 2 }} />
          )}
        </motion.div>
      </motion.button>

      {/* Skip */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={onSkip}
        className="w-9 h-9 flex items-center justify-center rounded-full transition-colors"
        style={{ color: 'var(--t3)', background: 'var(--card)' }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--card-h)';
          e.currentTarget.style.color = 'var(--t2)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'var(--card)';
          e.currentTarget.style.color = 'var(--t3)';
        }}
        title="Skip"
      >
        <SkipForward size={16} />
      </motion.button>

      {/* Fullscreen Timer Mode */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={onFullscreen}
        className="w-9 h-9 flex items-center justify-center rounded-full transition-colors"
        style={{ color: 'var(--t3)', background: 'var(--card)' }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--card-h)';
          e.currentTarget.style.color = 'var(--t2)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'var(--card)';
          e.currentTarget.style.color = 'var(--t3)';
        }}
        title="Timer Mode"
      >
        <Maximize2 size={14} />
      </motion.button>
    </div>
  );
};
