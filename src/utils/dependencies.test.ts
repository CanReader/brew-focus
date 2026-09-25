import { describe, expect, it } from 'vitest';
import { blockingTasks, cyclicForbiddenIds, dependencyCandidates, isTaskBlocked } from './dependencies';
import { makeTask } from '../test/factories';

describe('dependencies', () => {
  const a = makeTask({ id: 'a' });
  const b = makeTask({ id: 'b', dependsOn: ['a'] });
  const c = makeTask({ id: 'c', dependsOn: ['b'] });
  const done = makeTask({ id: 'done', completed: true });
  const d = makeTask({ id: 'd', dependsOn: ['done', 'missing'] });
  const all = [a, b, c, done, d];

  it('only counts incomplete, existing blockers', () => {
    expect(blockingTasks(b, all).map((t) => t.id)).toEqual(['a']);
    expect(isTaskBlocked(b, all)).toBe(true);
    expect(isTaskBlocked(d, all)).toBe(false);
    expect(isTaskBlocked(a, all)).toBe(false);
  });

  it('forbids anything that already depends on the task, transitively', () => {
    expect([...cyclicForbiddenIds(a, all)].sort()).toEqual(['a', 'b', 'c']);
  });

  it('offers only same-project, non-cyclic, not-yet-added candidates', () => {
    const other = makeTask({ id: 'other', projectId: 'p1' });
    const ids = dependencyCandidates(b, [...all, other]).map((t) => t.id).sort();
    expect(ids).toEqual(['d', 'done']);
  });
});
