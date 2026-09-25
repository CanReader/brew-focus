import { describe, expect, it } from 'vitest';
import { parseQuickTask } from './quickCapture';
import type { Project } from '../types';

const projects = [
  { id: 'p-work', name: 'Work', color: '#f00' },
  { id: 'p-home', name: 'Home stuff', color: '#0f0' },
] as Project[];

const parse = (s: string, bound?: string) =>
  parseQuickTask(s, projects, bound ? { boundProjectId: bound } : undefined);

describe('parseQuickTask', () => {
  it('pulls every token type out of the title', () => {
    const r = parse('Ship it !today +p1 *3 @work #bug');
    expect(r.title).toBe('Ship it');
    expect(r.dueDate).toBe('today');
    expect(r.priority).toBe('p1');
    expect(r.pomodoroEstimate).toBe(3);
    expect(r.projectId).toBe('p-work');
    expect(r.type).toBe('bug');
    expect(r.unknownTokens).toEqual([]);
  });

  it('accepts real ISO dates and rejects impossible ones', () => {
    expect(parse('pay rent !2026-02-28').dueDate).toBe('2026-02-28');
    const bad = parse('pay rent !2026-02-30');
    expect(bad.dueDate).toBeUndefined();
    expect(bad.unknownTokens.map((t) => t.token)).toEqual(['!2026-02-30']);
  });

  it('suggests a close keyword for typos', () => {
    const r = parse('call mom !tomorow');
    expect(r.unknownTokens[0]).toEqual({ token: '!tomorow', suggestion: 'tomorrow' });
  });

  // #22
  it('leaves sigils in the middle of a word alone', () => {
    const grid = parse('Refactor the 5*3 grid layout');
    expect(grid.title).toBe('Refactor the 5*3 grid layout');
    expect(grid.pomodoroEstimate).toBeUndefined();
    expect(parse('Add C++17 support').title).toBe('Add C++17 support');
    expect(parse('email bob@example.com').title).toBe('email bob@example.com');
  });

  it('only takes digit-only pomodoro estimates in range', () => {
    expect(parse('*2nd draft').pomodoroEstimate).toBeUndefined();
    expect(parse('big one *12').pomodoroEstimate).toBeUndefined();
    expect(parse('small *1').pomodoroEstimate).toBe(1);
  });

  it('keeps @mentions in the title inside a project', () => {
    const r = parse('Ask @sarah about the API', 'p-work');
    expect(r.title).toBe('Ask @sarah about the API');
    expect(r.projectId).toBeUndefined();
    expect(r.chips).toEqual([]);
  });

  it('fuzzy matches projects and flags new ones', () => {
    expect(parse('x @hom').projectId).toBe('p-home');
    const r = parse('x @garden');
    expect(r.projectId).toBeUndefined();
    expect(r.chips).toContainEqual({ kind: 'project-new', raw: '@garden', name: 'garden' });
  });

  it('is last-write-wins for repeated tokens', () => {
    expect(parse('x +p1 +p3').priority).toBe('p3');
  });
});
