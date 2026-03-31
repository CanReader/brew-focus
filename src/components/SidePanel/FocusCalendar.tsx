import React, { useMemo } from 'react';
import { useTimerStore } from '../../store/timerStore';
import { TimerSession } from '../../types';

const PX_PER_HOUR = 40;           // pixels per hour
const TOTAL_H = PX_PER_HOUR * 24; // 960px for full day
const LABEL_W = 30;
const RANGE_START = 0;
const RANGE_END = 24 * 60;
const PX_PER_MIN = PX_PER_HOUR / 60;

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function sessionDateKey(s: TimerSession): string {
  return dateKey(new Date(s.startedAt));
}

function fmtHour(h: number): string {
  if (h === 0) return '12a';
  if (h === 12) return '12p';
  return h < 12 ? `${h}a` : `${h - 12}p`;
}

interface Block {
  session: TimerSession;
  top: number;
  height: number;
}

function sessionBlocks(sessions: TimerSession[]): Block[] {
  return sessions
    .filter((s) => s.phase === 'work')
    .map((s) => {
      const d = new Date(s.startedAt);
      const startMin = d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
      const durationMin = s.duration / 60;
      const top = (startMin - RANGE_START) * PX_PER_MIN;
      const height = Math.max(2, durationMin * PX_PER_MIN);
      return { session: s, top, height: Math.min(height, TOTAL_H - top) };
    });
}

const HOURS = Array.from({ length: 25 }, (_, i) => i); // 0..24

export const FocusCalendar: React.FC = () => {
  const { sessions } = useTimerStore();

  const today = new Date();
  const todayKey = dateKey(today);
  const nowMin = today.getHours() * 60 + today.getMinutes();

  const todaySessions = useMemo(
    () => sessions.filter((s) => sessionDateKey(s) === todayKey),
    [sessions, todayKey],
  );

  const blocks = useMemo(() => sessionBlocks(todaySessions), [todaySessions]);

  const totalWorkMins = todaySessions
    .filter((s) => s.phase === 'work')
    .reduce((acc, s) => acc + s.duration / 60, 0);

  return (
    <div className="rounded-xl p-3" style={{ background: 'var(--card)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-[12px] font-medium" style={{ color: 'var(--t2)' }}>Focus History</span>
        {totalWorkMins > 0 && (
          <span className="text-[11px] tabular-nums" style={{ color: 'var(--accent)' }}>
            {totalWorkMins >= 60
              ? `${Math.floor(totalWorkMins / 60)}h ${Math.round(totalWorkMins % 60)}m`
              : `${Math.round(totalWorkMins)}m`}
          </span>
        )}
      </div>
      <div className="text-[10px] mb-2" style={{ color: 'var(--t3)' }}>
        {today.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
      </div>

      {/* Scrollable timeline */}
      <div className="overflow-y-auto rounded-lg" style={{ maxHeight: 280 }}>
        <div className="flex" style={{ height: TOTAL_H }}>
          {/* Hour labels */}
          <div className="relative shrink-0" style={{ width: LABEL_W }}>
            {HOURS.map((h) => (
              <div
                key={h}
                className="absolute right-1 text-[9px] leading-none select-none"
                style={{ top: h * PX_PER_HOUR - 4, color: 'var(--t3)' }}
              >
                {fmtHour(h)}
              </div>
            ))}
          </div>

          {/* Column */}
          <div className="flex-1 relative">
            {/* Hour grid lines */}
            {HOURS.map((h) => (
              <div
                key={h}
                className="absolute left-0 right-0 pointer-events-none"
                style={{
                  top: h * PX_PER_HOUR,
                  height: 1,
                  background: 'var(--brd)',
                  opacity: h % 6 === 0 ? 0.8 : 0.35,
                }}
              />
            ))}

            {/* Current time indicator */}
            <div
              className="absolute left-0 right-0 pointer-events-none z-10"
              style={{
                top: nowMin * PX_PER_MIN,
                height: 1,
                background: 'var(--accent)',
                opacity: 0.6,
              }}
            >
              <div
                className="absolute -left-0.5 -top-0.5 w-1.5 h-1.5 rounded-full"
                style={{ background: 'var(--accent)' }}
              />
            </div>

            {/* Session blocks */}
            {blocks.map((b) => {
              const label = b.session.taskTitle ?? 'Focus';
              return (
                <div
                  key={b.session.id}
                  className="absolute rounded overflow-hidden"
                  style={{
                    top: b.top,
                    height: b.height,
                    left: 2,
                    right: 2,
                    background: 'var(--accent)',
                    opacity: 0.85,
                  }}
                  title={`${label} · ${Math.round(b.session.duration / 60)}m`}
                >
                  {b.height > 14 && (
                    <span className="block text-[8px] px-1 pt-0.5 truncate leading-tight" style={{ color: 'white' }}>
                      {label}
                    </span>
                  )}
                </div>
              );
            })}

            {blocks.length === 0 && (
              <div
                className="absolute left-0 right-0 flex items-center justify-center text-[10px]"
                style={{ top: '40%', color: 'var(--t3)' }}
              >
                No sessions yet
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
