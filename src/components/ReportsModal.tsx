import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useTimerStore } from '../store/timerStore';
import { useTaskStore } from '../store/taskStore';
import { useSettingsStore } from '../store/settingsStore';

interface ReportsModalProps {
  open: boolean;
  onClose: () => void;
}

export const ReportsModal: React.FC<ReportsModalProps> = ({ open, onClose }) => {
  const { todayFocusSeconds, sessions } = useTimerStore();
  const { tasks } = useTaskStore();
  const { settings } = useSettingsStore();

  const completedTasks = useMemo(() => tasks.filter((t) => t.completed).length, [tasks]);
  const totalTasks = tasks.length;

  const focusMinutes = Math.floor(todayFocusSeconds / 60);
  const focusHours = (todayFocusSeconds / 3600).toFixed(1);
  const goalHours = settings.dailyFocusGoal;
  const goalProgress = Math.min(100, Math.round(((todayFocusSeconds / 3600) / goalHours) * 100)) || 0;

  // Compute last 7 days chart data
  const chartData = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = d.toLocaleDateString('en-US', { weekday: 'short' });
      days.push({ dayStr, date: d, seconds: 0 });
    }

    sessions.forEach(s => {
      const sDate = new Date(s.startedAt);
      for (const day of days) {
        if (sDate.getDate() === day.date.getDate() && sDate.getMonth() === day.date.getMonth()) {
          day.seconds += s.duration;
        }
      }
    });

    // Make sure today has at least the current session focus seconds if it differs
    const today = days[days.length - 1];
    if (todayFocusSeconds > today.seconds) {
      today.seconds = todayFocusSeconds;
    }

    const maxSeconds = Math.max(...days.map(d => d.seconds), 3600); // at least 1 hr scale

    return days.map(d => ({
      label: d.dayStr,
      minutes: Math.floor(d.seconds / 60),
      heightPercent: Math.min(100, Math.max(0, (d.seconds / maxSeconds) * 100))
    }));
  }, [sessions, todayFocusSeconds]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           exit={{ opacity: 0 }}
           transition={{ duration: 0.2 }}
           className="fixed inset-0 z-50 flex items-center justify-center p-4"
           style={{ background: 'rgba(20,20,22,0.8)' }}
           onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="w-[480px] max-h-[85vh] rounded-2xl overflow-hidden flex flex-col relative"
            style={{ background: 'var(--card)', border: '1px solid var(--brd)' }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4 border-b shrink-0"
              style={{ borderColor: 'var(--brd)' }}
            >
              <div>
                <h2 className="text-[16px] font-semibold" style={{ color: 'var(--t)' }}>
                  Reports
                </h2>
                <p className="text-[12px]" style={{ color: 'var(--t3)' }}>
                  Your activity and statistics
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
                style={{ color: 'var(--t3)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--card-h)';
                  e.currentTarget.style.color = 'var(--t)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--t3)';
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto flex-1 px-5 py-5 flex flex-col gap-6">
              
              {/* Daily Focus block */}
              <div>
                <h3 className="text-[11px] font-semibold tracking-widest uppercase mb-3" style={{ color: 'var(--t3)' }}>
                  Today's Activity
                </h3>
                <div 
                  className="rounded-xl p-5 flex flex-col gap-4"
                  style={{ background: 'var(--bg)', border: '1px solid var(--brd)' }}
                >
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-[32px] font-semibold tabular-nums leading-none mb-1" style={{ color: 'var(--t)' }}>
                        {focusHours}
                        <span className="text-[16px] font-normal ml-1" style={{ color: 'var(--t3)' }}>hrs</span>
                      </div>
                      <div className="text-[13px]" style={{ color: 'var(--t2)' }}>
                        Focused out of {goalHours}h goal
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[20px] font-semibold tabular-nums leading-none mb-1" style={{ color: 'var(--t)' }}>
                        {completedTasks}
                        <span className="text-[14px] font-normal mx-1" style={{ color: 'var(--t3)' }}>/</span>
                        <span className="text-[16px] font-normal" style={{ color: 'var(--t2)' }}>{totalTasks}</span>
                      </div>
                      <div className="text-[13px]" style={{ color: 'var(--t2)' }}>
                        Tasks completed
                      </div>
                    </div>
                  </div>

                  <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: 'var(--brd)' }}>
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${goalProgress}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{ background: 'var(--accent)' }}
                    />
                  </div>
                </div>
              </div>

              {/* Weekly Chart */}
              <div>
                <h3 className="text-[11px] font-semibold tracking-widest uppercase mb-3" style={{ color: 'var(--t3)' }}>
                  This Week
                </h3>
                <div 
                  className="rounded-xl p-5"
                  style={{ background: 'var(--bg)', border: '1px solid var(--brd)' }}
                >
                  <div className="flex items-end justify-between h-[120px] mb-2 gap-2">
                    {chartData.map((d, i) => (
                      <div key={i} className="flex-1 flex flex-col justify-end items-center gap-2 group">
                        <div className="w-full relative flex justify-center h-full">
                          {/* Tooltip */}
                          <div className="absolute -top-8 bg-black text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                            {d.minutes}m
                          </div>
                          
                          {/* Bar */}
                          <div className="absolute bottom-0 w-full max-w-[28px]">
                            <motion.div 
                              initial={{ height: 0 }}
                              animate={{ height: `${d.heightPercent}%` }}
                              transition={{ duration: 0.6, delay: i * 0.05, ease: 'easeOut' }}
                              className="w-full rounded-sm"
                              style={{ 
                                background: i === chartData.length - 1 ? 'var(--accent)' : 'var(--card-h)',
                                minHeight: d.heightPercent > 0 ? '4px' : '0'
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* X Axis Labels */}
                  <div className="flex justify-between border-t pt-2" style={{ borderColor: 'var(--brd)' }}>
                    {chartData.map((d, i) => (
                      <div 
                        key={i} 
                        className="flex-1 text-center text-[10px] uppercase font-medium"
                        style={{ color: i === chartData.length - 1 ? 'var(--accent)' : 'var(--t3)' }}
                      >
                        {d.label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
