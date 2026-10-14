import { describe, expect, it } from 'vitest';
import { resolveSession } from '../src/lab/core/session.js';

const exp = { slug: 'speed', version: 2, topics: [{ id: 'night', scenes: [{ id: 'story' }, { id: 'impact', sensitive: true }, { id: 'choose' }] }] };
const record = { slug: 'speed', version: 2, screen: 'scene', topic: 'night', sceneId: 'choose' };
describe('active experience recovery', () => {
  it('restores a stable scene ID using the current filtered flow', () => {
    expect(resolveSession(record, exp)).toEqual({ slug: 'speed', screen: 'scene', topic: 'night', at: 2 });
    expect(resolveSession(record, exp, true).at).toBe(1);
  });
  it('returns to the experience introduction when content changed or a scene disappeared', () => {
    const intro = { slug: 'speed', screen: 'intro' };
    expect(resolveSession({ ...record, version: 1 }, exp)).toEqual(intro);
    expect(resolveSession({ ...record, sceneId: 'removed' }, exp)).toEqual(intro);
    expect(resolveSession({ ...record, sceneId: 'impact' }, exp, true)).toEqual(intro);
  });
  it('rejects unavailable experiences and malformed screens', () => {
    expect(resolveSession(record, null)).toBe(null);
    expect(resolveSession({ ...record, slug: 'unknown' }, exp)).toBe(null);
    expect(resolveSession({ ...record, screen: 'unknown' }, exp)).toBe(null);
  });
});
