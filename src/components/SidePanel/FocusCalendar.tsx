import React, { useState, useMemo } from 'react';
import { useTimerStore } from '../../store/timerStore';
import { TimerSession } from '../../types';

type View = 'day' | 'week';

const TIMELINE_H = 320; // px total height of the time axis
const LABEL_W = 28;     // px width of the time label column

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ─── date helpers ────────────────────────────────────────────────────────────

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function sessionDateKey(s: TimerSession): string {
  return dateKey(new Date(s.startedAt));
}

/** Monday-anchored week containing `ref` */
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

/** Format hour as "8a" / "12p" */
function fmtHour(h: number): string {
  if (h === 0) return '12a';
  if (h === 12) return '12p';
  return h < 12 ? `${h}a` : `${h - 12}p`;
}

// ─── time range ──────────────────────────────────────────────────────────────

function computeRange(sessions: TimerSession[]): [number, number] {
  const work = sessions.filter((s) => s.phase === 'work');
  if (!work.length) return [8 * 60, 18 * 60]; // default 8am–6pm

  let lo = Infinity, hi = -Infinity;
  for (const s of work) {
    const d = new Date(s.startedAt);
    const startMin = d.getHours() * 60 + d.getMinutes();
    const endMin = startMin + s.duration / 60;
    lo = Math.min(lo, startMin);
    hi = Math.max(hi, endMin);
  }
  // pad 30 min each side, snap to 30-min boundaries
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

// ─── block layout ─────────────────────────────────────────────────────────────

interface Block {
  session: TimerSession;
  top: number;
  height: number;
}

function sessionBlocks(
  sessions: TimerSession[],
  rangeStart: number,
  pxPerMin: number,
): Block[] {
  return sessions
    .filter((s) => s.phase === 'work')
    .flatMap((s) => {
      const d = new Date(s.startedAt);
      const startMin = d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
      const durationMin = s.duration / 60;
      const top = (startMin - rangeStart) * pxPerMin;
      const height = Math.max(3, durationMin * pxPerMin);
      if (top + height < 0 || top > TIMELINE_H) return [];
      return [{ session: s, top: Math.max(0, top), height: Math.min(height, TIMELINE_H - Math.max(0, top)) }];
    });
}

// ─── sub-components ───────────────────────────────────────────────────────────

const TimeLabels: React.FC<{ ticks: number[]; rangeStart: number; pxPerMin: number }> = ({
  ticks, rangeStart, pxPerMin,
}) => (
  <div className="relative shrink-0" style={{ width: LABEL_W, height: TIMELINE_H }}>
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
);

const GridLines: React.FC<{ ticks: number[]; rangeStart: number; pxPerMin: number }> = ({
  ticks, rangeStart, pxPerMin,
}) => (
  <>
    {ticks.map((h) => (
      <div
        key={h}
        className="absolute left-0 right-0 pointer-events-none"
        style={{ top: (h * 60 - rangeStart) * pxPerMin, height: 1, background: 'var(--brd)', opacity: 0.6 }}
      />
    ))}
  </>
);

const SessionBlock: React.FC<{ block: Block; minimal?: boolean }> = ({ block, minimal }) => {
  const { session, top, height } = block;
  const label = session.taskTitle ?? 'Focus';
  return (
    <div
      key={session.id}
      className="absolute rounded-sm overflow-hidden"
      style={{
        top,
        height,
        left: 1,
        right: 1,
        background: 'var(--accent)',
        opacity: 0.82,
      }}
      title={`${label} · ${Math.round(session.duration / 60)}m`}
    >
      {!minimal && height > 18 && (
        <span className="block text-[8px] px-1 pt-0.5 truncate leading-tight" style={{ color: 'white' }}>
          {label}
        </span>
      )}
    </div>
  );
};

// ─── main component ───────────────────────────────────────────────────────────

export const FocusCalendar: React.FC = () => {
  const [view, setView] = useState<View>('day');
  const { sessions } = useTimerStore();

  const today = new Date();
  const todayKey = dateKey(today);
  const days = weekDays(today);

  const todaySessions = useMemo(
    () => sessions.filter((s) => sessionDateKey(s) === todayKey),
    [sessions, todayKey],
  );

  const weekMap = useMemo(() => {
    const map: Record<string, TimerSession[]> = {};
    for (const day of days) map[dateKey(day)] = [];
    for (const s of sessions) {
      const k = sessionDateKey(s);
      if (k in map) map[k].push(s);
    }
    return map;
  }, [sessions, days]);

  const [rangeStart, rangeEnd] = useMemo(() => {
    if (view === 'day') return computeRange(todaySessions);
    return computeRange(Object.values(weekMap).flat());
  }, [view, todaySessions, weekMap]);

  const rangeMins = rangeEnd - rangeStart;
  const pxPerMin = TIMELINE_H / rangeMins;
  const ticks = hourTicks(rangeStart, rangeEnd);

  const todayBlocks = useMemo(
    () => sessionBlocks(todaySessions, rangeStart, pxPerMin),
    [todaySessions, rangeStart, pxPerMin],
  );

  const weekBlocks = useMemo(() => {
    const out: Record<string, Block[]> = {};
    for (const [k, ss] of Object.entries(weekMap)) {
      out[k] = sessionBlocks(ss, rangeStart, pxPerMin);
    }
    return out;
  }, [weekMap, rangeStart, pxPerMin]);

  const totalWorkMins = todaySessions
    .filter((s) => s.phase === 'work')
    .reduce((acc, s) => acc + s.duration / 60, 0);

  return (
    <div className="rounded-xl p-3" style={{ background: 'var(--card)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[12px] font-medium" style={{ color: 'var(--t2)' }}>Focus History</span>
        <div
          className="flex items-center rounded-lg p-0.5 gap-0.5"
          style={{ background: 'var(--bg2)' }}
        >
          {(['day', 'week'] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="px-2.5 py-0.5 rounded-md text-[11px] font-medium transition-all capitalize"
              style={{
                background: view === v ? 'var(--card)' : 'transparent',
                color: view === v ? 'var(--t)' : 'var(--t3)',
              }}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {view === 'day' ? (
        /* ── DAY VIEW ─────────────────────────────── */
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px]" style={{ color: 'var(--t3)' }}>
              {today.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </span>
            {totalWorkMins > 0 && (
              <span className="text-[11px] tabular-nums" style={{ color: 'var(--accent)' }}>
                {totalWorkMins >= 60
                  ? `${Math.floor(totalWorkMins / 60)}h ${Math.round(totalWorkMins % 60)}m`
                  : `${Math.round(totalWorkMins)}m`}
              </span>
            )}
          </div>

          <div className="flex">
            <TimeLabels ticks={ticks} rangeStart={rangeStart} pxPerMin={pxPerMin} />
            <div className="flex-1 relative" style={{ height: TIMELINE_H }}>
              <GridLines ticks={ticks} rangeStart={rangeStart} pxPerMin={pxPerMin} />
              {todayBlocks.map((b) => (
                <SessionBlock key={b.session.id} block={b} />
              ))}
              {todayBlocks.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[11px]" style={{ color: 'var(--t3)' }}>
                    No sessions yet
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ── WEEK VIEW ────────────────────────────── */
        <div>
          <div className="text-[11px] mb-2" style={{ color: 'var(--t3)' }}>
            {days[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            {' – '}
            {days[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </div>

          <div className="flex">
            <TimeLabels ticks={ticks} rangeStart={rangeStart} pxPerMin={pxPerMin} />

            <div className="flex flex-1 gap-0.5">
              {days.map((day) => {
                const key = dateKey(day);
                const isToday = key === todayKey;
                const blocks = weekBlocks[key] ?? [];
                const hasSessions = blocks.length > 0;

                return (
                  <div key={key} className="flex flex-col flex-1 min-w-0">
                    {/* Day name */}
                    <div
                      className="text-center text-[9px] mb-1 font-medium leading-none"
                      style={{ color: isToday ? 'var(--accent)' : 'var(--t3)' }}
                    >
                      {DAY_SHORT[day.getDay()]}
                    </div>

                    {/* Column */}
                    <div
                      className="relative rounded-sm"
                      style={{
                        height: TIMELINE_H,
                        background: isToday ? 'rgba(255,255,255,0.025)' : 'transparent',
                        outline: isToday ? '1px solid var(--brd)' : 'none',
                      }}
                    >
                      <GridLines ticks={ticks} rangeStart={rangeStart} pxPerMin={pxPerMin} />
                      {blocks.map((b) => (
                        <SessionBlock key={b.session.id} block={b} minimal />
                      ))}
                    </div>

                    {/* Day total */}
                    <div
                      className="text-center text-[8px] mt-0.5 tabular-nums leading-none"
                      style={{ color: hasSessions ? 'var(--accent)' : 'var(--t3)', opacity: hasSessions ? 1 : 0.4 }}
                    >
                      {hasSessions
                        ? (() => {
                            const m = Math.round(
                              blocks.reduce((a, b) => a + b.session.duration / 60, 0),
                            );
                            return m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? `${m % 60}m` : ''}` : `${m}m`;
                          })()
                        : '·'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
