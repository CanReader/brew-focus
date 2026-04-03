import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

export type SessionAnimationType = 'session-complete' | 'break-complete' | null;

interface Props {
  type: SessionAnimationType;
  onDone: () => void;
}

// Bell SVG that rings via rotation
const Bell: React.FC = () => (
  <svg width="72" height="72" viewBox="0 0 24 24" fill="none">
    <motion.g
      style={{ transformOrigin: '12px 4px' }}
      animate={{ rotate: [0, -28, 24, -20, 16, -10, 6, 0] }}
      transition={{ duration: 1.1, ease: 'easeInOut', delay: 0.15 }}
    >
      <path
        d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.15"
      />
      <path
        d="M13.73 21a2 2 0 0 1-3.46 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </motion.g>
  </svg>
);

// Ripple rings that expand outward
const Ripple: React.FC<{ delay: number; color: string }> = ({ delay, color }) => (
  <motion.div
    className="absolute rounded-full border-2"
    style={{ borderColor: color }}
    initial={{ width: 80, height: 80, opacity: 0.7 }}
    animate={{ width: 200, height: 200, opacity: 0 }}
    transition={{ duration: 1.2, delay, ease: 'easeOut' }}
  />
);

// Small star / sparkle burst for session complete badge
const Sparkle: React.FC<{ angle: number; delay: number }> = ({ angle, delay }) => {
  const rad = (angle * Math.PI) / 180;
  const dist = 48 + Math.random() * 20;
  const tx = Math.cos(rad) * dist;
  const ty = Math.sin(rad) * dist;
  return (
    <motion.div
      className="absolute w-1.5 h-1.5 rounded-full"
      style={{ background: 'var(--accent)', top: '50%', left: '50%' }}
      initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
      animate={{ x: tx, y: ty, opacity: 0, scale: 0 }}
      transition={{ duration: 0.7, delay, ease: 'easeOut' }}
    />
  );
};

export const SessionAnimation: React.FC<Props> = ({ type, onDone }) => {
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    if (!type) return;

    const duration = type === 'session-complete' ? 3200 : 2800;

    if (type === 'session-complete') {
      // Center burst
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { x: 0.5, y: 0.55 },
        colors: ['#e8453c', '#5a9cf5', '#e8a83e', '#34c759', '#a78bfa', '#f472b6'],
        scalar: 1.1,
        zIndex: 9999,
      });
      // Side cannons with slight delay
      setTimeout(() => {
        confetti({ particleCount: 45, angle: 60,  spread: 60, origin: { x: 0.05, y: 0.6 }, zIndex: 9999 });
        confetti({ particleCount: 45, angle: 120, spread: 60, origin: { x: 0.95, y: 0.6 }, zIndex: 9999 });
      }, 180);
    }

    const timer = setTimeout(() => doneRef.current(), duration);
    return () => clearTimeout(timer);
  }, [type]);

  return (
    <AnimatePresence>
      {type && (
        <motion.div
          key={type}
          className="fixed inset-0 z-[9998] flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {type === 'session-complete' && (
            <motion.div
              className="flex flex-col items-center gap-3 relative"
              initial={{ scale: 0.6, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: -10 }}
              transition={{ type: 'spring', stiffness: 380, damping: 22 }}
            >
              {/* Sparkles */}
              {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
                <Sparkle key={angle} angle={angle} delay={0.1 + i * 0.04} />
              ))}

              {/* Badge */}
              <div
                className="px-6 py-4 rounded-2xl flex flex-col items-center gap-2 shadow-2xl"
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--accent-g)',
                  boxShadow: '0 0 40px var(--accent-d)',
                }}
              >
                <span style={{ fontSize: 36 }}>☕</span>
                <div className="text-[18px] font-bold" style={{ color: 'var(--t)' }}>
                  Session Complete!
                </div>
                <div className="text-[13px]" style={{ color: 'var(--t3)' }}>
                  Great work — enjoy your break
                </div>
              </div>
            </motion.div>
          )}

          {type === 'break-complete' && (
            <motion.div
              className="flex flex-col items-center gap-4 relative"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 340, damping: 20 }}
            >
              {/* Ripple rings */}
              <div className="absolute flex items-center justify-center">
                <Ripple delay={0.15} color="var(--accent)" />
                <Ripple delay={0.45} color="var(--accent)" />
                <Ripple delay={0.75} color="var(--accent)" />
              </div>

              {/* Bell + card */}
              <div
                className="px-8 py-6 rounded-2xl flex flex-col items-center gap-3 shadow-2xl z-10"
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--accent-g)',
                  boxShadow: '0 0 50px var(--accent-d)',
                }}
              >
                <div style={{ color: 'var(--accent)' }}>
                  <Bell />
                </div>
                <div className="text-[20px] font-bold" style={{ color: 'var(--t)' }}>
                  Break's Over!
                </div>
                <div className="text-[13px]" style={{ color: 'var(--t3)' }}>
                  Time to focus up ✦
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
