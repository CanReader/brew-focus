import React from 'react';
import { History } from 'lucide-react';
import { useTimerStore } from '../../store/timerStore';
import { TimerPhase } from '../../types';

const phaseLabel: Record<TimerPhase, string> = {
  work: 'Focus',
  shortBreak: 'Break',
  longBreak: 'Long Break',
};

const phaseColor: Record<TimerPhase, string> = {
  work: 'var(--accent)',
  shortBreak: 'var(--grn)',
  longBreak: 'var(--blu)',
};

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m`;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export const HistoryWidget: React.FC = () => {
  const { sessions } = useTimerStore();
  const today = new Date().toDateString();
  const todaySessions = sessions
    .filter((s) => new Date(s.startedAt).toDateString() === today)
    .slice(0, 8);

  return (
    <div className="rounded-xl p-4" style={{ background: 'var(--card)' }}>
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center"
          style={{ background: 'rgba(52,199,89,0.15)' }}
        >
          <History size={13} style={{ color: 'var(--grn)' }} />
        </div>
        <span className="text-[12px] font-medium" style={{ color: 'var(--t2)' }}>
          Focus History
        </span>
        <span
          className="ml-auto text-[11px] px-1.5 py-0.5 rounded-md"
          style={{ background: 'var(--brd)', color: 'var(--t3)' }}
        >
          {todaySessions.length}
        </span>
      </div>

      {todaySessions.length === 0 ? (
        <div className="py-4 text-center">
          <span className="text-[12px]" style={{ color: 'var(--t3)' }}>
            No sessions yet today
          </span>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {todaySessions.map((session) => (
            <div
              key={session.id}
              className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg"
              style={{ background: 'var(--bg2)' }}
            >
              <div
                className="w-1 h-6 rounded-full shrink-0"
                style={{ background: phaseColor[session.phase] }}
              />
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-[11px] font-medium" style={{ color: phaseColor[session.phase] }}>
                  {phaseLabel[session.phase]}
                </span>
                {session.taskTitle && (
                  <span className="text-[10px] truncate" style={{ color: 'var(--t3)' }}>
                    {session.taskTitle}
                  </span>
                )}
              </div>
              <div className="flex flex-col items-end shrink-0">
                <span className="text-[11px]" style={{ color: 'var(--t2)' }}>
                  {formatDuration(session.duration)}
                </span>
                <span className="text-[10px]" style={{ color: 'var(--t3)' }}>
                  {formatTime(session.startedAt)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
