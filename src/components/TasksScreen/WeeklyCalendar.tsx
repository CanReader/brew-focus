import React, { useMemo } from 'react';
import { useTimerStore } from '../../store/timerStore';
import { TimerSession } from '../../types';

const PX_PER_HOUR = 50;
const TOTAL_H = PX_PER_HOUR * 24; // 1200px
const LABEL_W = 32;
const PX_PER_MIN = PX_PER_HOUR / 60;
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 25 }, (_, i) => i);

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function sessionDateKey(s: TimerSession): string {
  return dateKey(new Date(s.startedAt));
}

function weekDays(ref: Date): Date[] {
  const dow = ref.getDay();
  const monday = new Date(ref);
  monday.setDate(ref.getDate() - (dow === 0 ? 6 : dow - 1));
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
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
      const top = startMin * PX_PER_MIN;
      const height = Math.max(2, durationMin * PX_PER_MIN);
      return { session: s, top, height: Math.min(height, TOTAL_H - top) };
    });
}

export const WeeklyCalendar: React.FC = () => {
  const { sessions } = useTimerStore();

  const today = new Date();
  const todayKey = dateKey(today);
  const nowMin = today.getHours() * 60 + today.getMinutes();
  const days = weekDays(today);

  const weekMap = useMemo(() => {
    const map: Record<string, TimerSession[]> = {};
    for (const day of days) map[dateKey(day)] = [];
    for (const s of sessions) {
      const k = sessionDateKey(s);
      if (k in map) map[k].push(s);
    }
    return map;
  }, [sessions, days]);

  const weekBlocks = useMemo(() => {
    const out: Record<string, Block[]> = {};
    for (const [k, ss] of Object.entries(weekMap)) {
      out[k] = sessionBlocks(ss);
    }
    return out;
  }, [weekMap]);

  const totalWeekMins = Object.values(weekMap)
    .flat()
    .filter((s) => s.phase === 'work')
    .reduce((acc, s) => acc + s.duration / 60, 0);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-5 pb-3 shrink-0">
        <div className="flex items-end justify-between">
          <h1 className="font-fraunces text-[26px]" style={{ color: 'var(--t)' }}>Focus Week</h1>
          <div className="flex flex-col items-end gap-0.5 pb-1">
            <span className="text-[11px]" style={{ color: 'var(--t3)' }}>
              {days[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              {' – '}
              {days[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
            {totalWeekMins > 0 && (
              <span className="text-[12px] tabular-nums font-medium" style={{ color: 'var(--accent)' }}>
                {totalWeekMins >= 60
                  ? `${Math.floor(totalWeekMins / 60)}h ${Math.round(totalWeekMins % 60)}m total`
                  : `${Math.round(totalWeekMins)}m total`}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Day name headers — sticky */}
      <div className="flex shrink-0 px-6 pb-1" style={{ paddingLeft: `calc(1.5rem + ${LABEL_W}px)` }}>
        {days.map((day) => {
          const key = dateKey(day);
          const isToday = key === todayKey;
          const dayMins = Math.round(
            (weekBlocks[key] ?? []).reduce((a, b) => a + b.session.duration / 60, 0),
          );
          return (
            <div key={key} className="flex-1 flex flex-col items-center min-w-0">
              <span
                className="text-[10px] font-semibold leading-none mb-0.5"
                style={{ color: isToday ? 'var(--accent)' : 'var(--t3)' }}
              >
                {DAY_SHORT[day.getDay()]}
              </span>
              <span className="text-[12px] leading-none font-medium" style={{ color: isToday ? 'var(--t)' : 'var(--t2)' }}>
                {day.getDate()}
              </span>
              <span
                className="text-[9px] mt-0.5 tabular-nums leading-none"
                style={{ color: dayMins > 0 ? 'var(--accent)' : 'transparent' }}
              >
                {dayMins >= 60
                  ? `${Math.floor(dayMins / 60)}h${dayMins % 60 ? `${dayMins % 60}m` : ''}`
                  : `${dayMins}m`}
              </span>
            </div>
          );
        })}
      </div>

      {/* Scrollable calendar grid */}
      <div className="flex-1 overflow-y-auto px-6 pb-16">
        <div className="flex" style={{ height: TOTAL_H }}>
          {/* Time labels */}
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

          {/* Day columns */}
          <div className="flex flex-1 gap-1">
            {days.map((day) => {
              const key = dateKey(day);
              const isToday = key === todayKey;
              const blocks = weekBlocks[key] ?? [];

              return (
                <div key={key} className="flex-1 relative min-w-0 rounded-md overflow-hidden"
                  style={{
                    height: TOTAL_H,
                    background: isToday ? 'rgba(255,255,255,0.02)' : 'var(--card)',
                    outline: isToday ? '1px solid var(--brd2)' : '1px solid var(--brd)',
                  }}
                >
                  {/* Hour grid lines */}
                  {HOURS.map((h) => (
                    <div
                      key={h}
                      className="absolute left-0 right-0 pointer-events-none"
                      style={{
                        top: h * PX_PER_HOUR,
                        height: 1,
                        background: 'var(--brd)',
                        opacity: h % 6 === 0 ? 0.7 : 0.3,
                      }}
                    />
                  ))}

                  {/* Now indicator on today */}
                  {isToday && (
                    <div
                      className="absolute left-0 right-0 z-10 pointer-events-none"
                      style={{ top: nowMin * PX_PER_MIN, height: 1, background: 'var(--accent)', opacity: 0.7 }}
                    >
                      <div className="absolute -left-0.5 -top-0.5 w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
                    </div>
                  )}

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
                          opacity: isToday ? 0.9 : 0.7,
                        }}
                        title={`${label} · ${Math.round(b.session.duration / 60)}m`}
                      >
                        {b.height > 16 && (
                          <span className="block text-[8px] px-1 pt-0.5 truncate leading-tight" style={{ color: 'white' }}>
                            {label}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
