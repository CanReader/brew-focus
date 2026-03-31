import React, { useMemo } from 'react';
import { useTimerStore } from '../../store/timerStore';
import { TimerSession } from '../../types';

const TIMELINE_H = 320;
const LABEL_W = 28;

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
      const height = Math.max(3, durationMin * pxPerMin);
      if (top + height < 0 || top > TIMELINE_H) return [];
      return [{ session: s, top: Math.max(0, top), height: Math.min(height, TIMELINE_H - Math.max(0, top)) }];
    });
}

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

const SessionBlock: React.FC<{ block: Block }> = ({ block }) => {
  const { session, top, height } = block;
  const label = session.taskTitle ?? 'Focus';
  return (
    <div
      className="absolute rounded-sm overflow-hidden"
      style={{ top, height, left: 1, right: 1, background: 'var(--accent)', opacity: 0.82 }}
      title={`${label} · ${Math.round(session.duration / 60)}m`}
    >
      {height > 18 && (
        <span className="block text-[8px] px-1 pt-0.5 truncate leading-tight" style={{ color: 'white' }}>
          {label}
        </span>
      )}
    </div>
  );
};

export const FocusCalendar: React.FC = () => {
  const { sessions } = useTimerStore();

  const today = new Date();
  const todayKey = dateKey(today);

  const todaySessions = useMemo(
    () => sessions.filter((s) => sessionDateKey(s) === todayKey),
    [sessions, todayKey],
  );

  const [rangeStart, rangeEnd] = useMemo(() => computeRange(todaySessions), [todaySessions]);
  const pxPerMin = TIMELINE_H / (rangeEnd - rangeStart);
  const ticks = hourTicks(rangeStart, rangeEnd);

  const blocks = useMemo(
    () => sessionBlocks(todaySessions, rangeStart, pxPerMin),
    [todaySessions, rangeStart, pxPerMin],
  );

  const totalWorkMins = todaySessions
    .filter((s) => s.phase === 'work')
    .reduce((acc, s) => acc + s.duration / 60, 0);

  return (
    <div className="rounded-xl p-3" style={{ background: 'var(--card)' }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[12px] font-medium" style={{ color: 'var(--t2)' }}>Focus History</span>
        {totalWorkMins > 0 && (
          <span className="text-[11px] tabular-nums" style={{ color: 'var(--accent)' }}>
            {totalWorkMins >= 60
              ? `${Math.floor(totalWorkMins / 60)}h ${Math.round(totalWorkMins % 60)}m`
              : `${Math.round(totalWorkMins)}m`}
          </span>
        )}
      </div>

      <div className="text-[11px] mb-2" style={{ color: 'var(--t3)' }}>
        {today.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
      </div>

      <div className="flex">
        <TimeLabels ticks={ticks} rangeStart={rangeStart} pxPerMin={pxPerMin} />
        <div className="flex-1 relative" style={{ height: TIMELINE_H }}>
          <GridLines ticks={ticks} rangeStart={rangeStart} pxPerMin={pxPerMin} />
          {blocks.map((b) => (
            <SessionBlock key={b.session.id} block={b} />
          ))}
          {blocks.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[11px]" style={{ color: 'var(--t3)' }}>No sessions yet</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
