import { describe, expect, it } from 'vitest';
import { isTaskStale, staleCount } from './staleTask';
import { makeSession, makeTask } from '../test/factories';

const DAY = 24 * 60 * 60 * 1000;
const old = Date.now() - 30 * DAY;

describe('isTaskStale', () => {
  it('flags old, undated, untouched tasks', () => {
    expect(isTaskStale(makeTask({ createdAt: old }), [])).toBe(true);
  });

  it('ignores new, done or dated tasks', () => {
    expect(isTaskStale(makeTask({ createdAt: Date.now() - 2 * DAY }), [])).toBe(false);
    expect(isTaskStale(makeTask({ createdAt: old, completed: true }), [])).toBe(false);
    expect(isTaskStale(makeTask({ createdAt: old, dueDate: 'someday' }), [])).toBe(false);
  });

  it('a recent work session keeps a task fresh, a break does not', () => {
    const t = makeTask({ createdAt: old });
    expect(isTaskStale(t, [makeSession({ taskId: t.id, startedAt: Date.now() - DAY })])).toBe(false);
    expect(isTaskStale(t, [makeSession({ taskId: t.id, phase: 'shortBreak', startedAt: Date.now() - DAY })])).toBe(true);
    expect(isTaskStale(t, [makeSession({ taskId: t.id, startedAt: old })])).toBe(true);
  });

  it('staleCount adds them up', () => {
    expect(staleCount([makeTask({ createdAt: old }), makeTask({ createdAt: old }), makeTask()], [])).toBe(2);
  });
});
