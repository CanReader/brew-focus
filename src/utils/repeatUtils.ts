import { DueDate, RepeatType } from '../types';

export function calculateNextDueDate(_dueDate: DueDate, repeatType: RepeatType): DueDate {
  if (!repeatType || repeatType === 'none') return null;

  // Base from today (not from old due date, to avoid piling up overdue occurrences)
  const base = new Date();
  base.setHours(0, 0, 0, 0);

  const next = new Date(base);
  if (repeatType === 'daily') next.setDate(base.getDate() + 1);
  else if (repeatType === 'weekly') next.setDate(base.getDate() + 7);
  else if (repeatType === 'monthly') next.setMonth(base.getMonth() + 1);

  // Check if it's tomorrow
  const tomorrow = new Date(base);
  tomorrow.setDate(base.getDate() + 1);

  if (next.getTime() === base.getTime()) return 'today';
  if (next.getTime() === tomorrow.getTime()) return 'tomorrow';

  const y = next.getFullYear();
  const m = String(next.getMonth() + 1).padStart(2, '0');
  const d = String(next.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
