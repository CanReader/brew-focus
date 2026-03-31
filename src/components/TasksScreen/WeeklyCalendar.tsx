import React, { useMemo } from 'react';
import { useTimerStore } from '../../store/timerStore';
import { TimerSession } from '../../types';

const TIMELINE_H = 480;
const LABEL_W = 32;
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

function computeRange(sessions: TimerSession[]): [number, number] {
  const work = sessions.filter((s) => s.phase === 'work');
  if (!work.length) return [8 * 60, 18 * 60];

  let lo = Infinity, hi = -Infinity;
  for (const s of work) {
    const d = new Date(s.startedAt);
    const startMin = d.getHours() * 60 + d.getMinutes();
    const endMin = startMin + s.duration / 60;
    lo = Math.min(lo, startMin);
    hi = Math.max(hi, endMin);
  }
  return [
    Math.max(0, Math.floor((lo - 30) / 30) * 30),
    Math.min(24 * 60, Math.ceil((hi + 30) / 30) * 30),
  ];
}

function hourTicks(rangeStart: number, rangeEnd: number): number[] {
  const ticks: number[] = [];
  for (let h = Math.ceil(rangeStart / 60); h <= Math.floor(rangeEnd / 60); h++) {
    ticks.push(h);
  }
  return ticks;
}

interface Block {
  session: TimerSession;
  top: number;
  height: number;
}

function sessionBlocks(sessions: TimerSession[], rangeStart: number, pxPerMin: number): Block[] {
  return sessions
    .filter((s) => s.phase === 'work')
    .flatMap((s) => {
      const d = new Date(s.startedAt);
      const startMin = d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
      const durationMin = s.duration / 60;
      const top = (startMin - rangeStart) * pxPerMin;
      const height = Math.max(4, durationMin * pxPerMin);
      if (top + height < 0 || top > TIMELINE_H) return [];
      return [{ session: s, top: Math.max(0, top), height: Math.min(height, TIMELINE_H - Math.max(0, top)) }];
    });
}

export const WeeklyCalendar: React.FC = () => {
  const { sessions } = useTimerStore();

  const today = new Date();
  const todayKey = dateKey(today);
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

  const [rangeStart, rangeEnd] = useMemo(
    () => computeRange(Object.values(weekMap).flat()),
    [weekMap],
  );

  const pxPerMin = TIMELINE_H / (rangeEnd - rangeStart);
  const ticks = hourTicks(rangeStart, rangeEnd);

  const weekBlocks = useMemo(() => {
    const out: Record<string, Block[]> = {};
    for (const [k, ss] of Object.entries(weekMap)) {
      out[k] = sessionBlocks(ss, rangeStart, pxPerMin);
    }
    return out;
  }, [weekMap, rangeStart, pxPerMin]);

  const totalWeekMins = Object.values(weekMap)
    .flat()
    .filter((s) => s.phase === 'work')
    .reduce((acc, s) => acc + s.duration / 60, 0);

  const hasAnySessions = totalWeekMins > 0;

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

      {/* Calendar */}
      <div className="flex-1 overflow-y-auto px-6 pb-16">
        {!hasAnySessions ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" opacity="0.25">
              <rect x="6" y="8" width="28" height="26" rx="3" stroke="var(--t)" strokeWidth="2"/>
              <path d="M6 14h28" stroke="var(--t)" strokeWidth="2"/>
              <path d="M14 6v4M26 6v4" stroke="var(--t)" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <p className="text-[13px]" style={{ color: 'var(--t3)' }}>No focus sessions this week</p>
          </div>
        ) : (
          <div className="flex" style={{ minHeight: TIMELINE_H + 32 }}>
            {/* Time labels */}
            <div className="relative shrink-0" style={{ width: LABEL_W, height: TIMELINE_H, marginTop: 28 }}>
              {ticks.map((h) => (
                <div
                  key={h}
                  className="absolute right-1 text-[9px] leading-none select-none"
                  style={{ top: (h * 60 - rangeStart) * pxPerMin - 4, color: 'var(--t3)' }}
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
                const dayMins = Math.round(
                  blocks.reduce((a, b) => a + b.session.duration / 60, 0),
                );

                return (
                  <div key={key} className="flex flex-col flex-1 min-w-0">
                    {/* Day header */}
                    <div className="flex flex-col items-center mb-1 shrink-0" style={{ height: 28 }}>
                      <span
                        className="text-[10px] font-semibold leading-none mb-0.5"
                        style={{ color: isToday ? 'var(--accent)' : 'var(--t3)' }}
                      >
                        {DAY_SHORT[day.getDay()]}
                      </span>
                      <span
                        className="text-[11px] leading-none"
                        style={{ color: isToday ? 'var(--t)' : 'var(--t3)' }}
                      >
                        {day.getDate()}
                      </span>
                    </div>

                    {/* Column */}
                    <div
                      className="relative rounded-md flex-1"
                      style={{
                        height: TIMELINE_H,
                        background: isToday ? 'rgba(255,255,255,0.025)' : 'var(--card)',
                        outline: isToday ? '1px solid var(--brd2)' : '1px solid var(--brd)',
                      }}
                    >
                      {/* Grid lines */}
                      {ticks.map((h) => (
                        <div
                          key={h}
                          className="absolute left-0 right-0 pointer-events-none"
                          style={{ top: (h * 60 - rangeStart) * pxPerMin, height: 1, background: 'var(--brd)', opacity: 0.5 }}
                        />
                      ))}

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
                            {b.height > 20 && (
                              <span className="block text-[8px] px-1 pt-0.5 truncate leading-tight" style={{ color: 'white' }}>
                                {label}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Day total */}
                    <div
                      className="text-center text-[9px] mt-1 tabular-nums leading-none"
                      style={{ color: dayMins > 0 ? 'var(--accent)' : 'var(--t3)', opacity: dayMins > 0 ? 1 : 0.3 }}
                    >
                      {dayMins > 0
                        ? dayMins >= 60
                          ? `${Math.floor(dayMins / 60)}h${dayMins % 60 ? `${dayMins % 60}m` : ''}`
                          : `${dayMins}m`
                        : '·'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
