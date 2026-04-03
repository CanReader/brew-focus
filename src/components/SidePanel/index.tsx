import React, { useState, useRef, useEffect } from 'react';
import { FocusTimeWidget } from './FocusTimeWidget';
import { UpcomingWidget } from './UpcomingWidget';
import { FocusCalendar } from './FocusCalendar';
import { useTimerStore } from '../../store/timerStore';

const SessionScratchPad: React.FC = () => {
  const [notes, setNotes] = useState('');
  const { isRunning, phase } = useTimerStore();
  const prevPhaseRef = useRef(phase);
  const prevRunningRef = useRef(isRunning);

  // Clear notes when a new work session starts
  useEffect(() => {
    const wasRunning = prevRunningRef.current;
    const prevPhase = prevPhaseRef.current;
    prevPhaseRef.current = phase;
    prevRunningRef.current = isRunning;
    if (isRunning && phase === 'work' && (prevPhase !== 'work' || !wasRunning)) {
      setNotes('');
    }
  }, [isRunning, phase]);

  return (
    <div
      className="rounded-xl p-3 relative overflow-hidden"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--brd)',
      }}
    >
      <div className="flex items-center gap-1.5 mb-2">
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
          <rect x="1" y="1" width="9" height="9" rx="1.5" stroke="var(--t3)" strokeWidth="1.2" />
          <path d="M3 4h5M3 6h3" stroke="var(--t3)" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
        <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--t3)' }}>
          Session Notes
        </span>
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Jot things down…"
        rows={3}
        className="w-full text-[12px] bg-transparent resize-none focus:outline-none leading-relaxed"
        style={{
          color: 'var(--t2)',
          minHeight: 56,
          caretColor: 'var(--accent)',
        }}
      />
    </div>
  );
};

export const SidePanel: React.FC = () => {
  return (
    <div
      className="flex flex-col gap-3 p-4 h-full overflow-y-auto"
      style={{ background: 'var(--bg2)' }}
    >
      {/* Dashboard heading */}
      <div className="flex items-center gap-2 mb-1">
        <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, var(--accent) 0%, transparent 100%)', opacity: 0.4 }} />
        <h3
          className="text-[10px] font-bold tracking-widest uppercase shrink-0"
          style={{ color: 'var(--t3)' }}
        >
          Dashboard
        </h3>
        <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent 0%, var(--brd2) 100%)' }} />
      </div>

      <FocusTimeWidget />
      <UpcomingWidget />
      <SessionScratchPad />
      <FocusCalendar />
      <div className="h-4" />
    </div>
  );
};
