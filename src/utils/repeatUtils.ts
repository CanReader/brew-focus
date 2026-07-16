import { DueDate, RepeatType } from '../types';

export function calculateNextDueDate(_dueDate: DueDate, repeatType: RepeatType): DueDate {
  if (!repeatType || repeatType === 'none') return null;

  // Base from today (not from old due date, to avoid piling up overdue occurrences)
  const base = new Date();
  base.setHours(0, 0, 0, 0);

  const next = new Date(base);
  if (repeatType === 'daily') next.setDate(base.getDate() + 1);
  else if (repeatType === 'weekly') next.setDate(base.getDate() + 7);
  else if (repeatType === 'monthly') {
    // Clamp to the target month's last day so e.g. Jan 31 -> Feb 28, not Mar 3.
    // setMonth on a day that overflows the shorter month rolls into the next one.
    next.setDate(1);
    next.setMonth(base.getMonth() + 1);
    const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
    next.setDate(Math.min(base.getDate(), lastDay));
  }

  // Always return a CONCRETE ISO date, never a relative token. This value is
  // persisted as the successor task's dueDate; the relative tokens 'today' /
  // 'tomorrow' re-resolve against the current day at every read, so a daily
  // recurrence stored as 'tomorrow' would drift forward one day every day and
  // never become due. An anchored YYYY-MM-DD stays fixed to the intended day.
  const y = next.getFullYear();
  const m = String(next.getMonth() + 1).padStart(2, '0');
  const d = String(next.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
