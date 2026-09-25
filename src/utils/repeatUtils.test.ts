import { afterEach, describe, expect, it, vi } from 'vitest';
import { calculateNextDueDate } from './repeatUtils';

const at = (y: number, m: number, d: number) => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(y, m - 1, d, 15, 30));
};

describe('calculateNextDueDate', () => {
  afterEach(() => vi.useRealTimers());

  it('returns null when the task does not repeat', () => {
    expect(calculateNextDueDate('2026-01-01', 'none')).toBeNull();
  });

  it('counts from today, not from the old due date', () => {
    at(2026, 3, 10);
    expect(calculateNextDueDate('2025-12-01', 'daily')).toBe('2026-03-11');
    expect(calculateNextDueDate('2025-12-01', 'weekly')).toBe('2026-03-17');
  });

  it('rolls over month and year ends', () => {
    at(2026, 12, 31);
    expect(calculateNextDueDate(null, 'daily')).toBe('2027-01-01');
    expect(calculateNextDueDate(null, 'monthly')).toBe('2027-01-31');
  });

  it('clamps monthly repeats to the last day of a shorter month', () => {
    at(2026, 1, 31);
    expect(calculateNextDueDate(null, 'monthly')).toBe('2026-02-28');
    at(2028, 1, 31);
    expect(calculateNextDueDate(null, 'monthly')).toBe('2028-02-29');
  });

  it('always returns a concrete ISO date', () => {
    at(2026, 5, 5);
    expect(calculateNextDueDate('tomorrow', 'daily')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
