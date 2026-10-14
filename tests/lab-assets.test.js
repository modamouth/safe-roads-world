import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { LAB_ASSET_LIST, assetsForArt } from '../src/lab/assets.js';
import { B1_ROUTE_STOPS } from '../src/lab/routeStops.js';
import { containBounds } from '../src/lab/art/fit.js';
import { animationSeconds } from '../src/lab/core/time.js';

describe('Learning Lab artwork integrity', () => {
  it('keeps simulations moving on slow renderers without jumping after a pause', () => {
    expect(animationSeconds(16.67, 80)).toBe(.08);
    expect(animationSeconds(16.67, 5000)).toBe(.1);
    expect(animationSeconds(20, 0)).toBe(.02);
    expect(animationSeconds(20, NaN)).toBe(.02);
  });
  it('registers real files under unique paths and keys', () => {
    expect(new Set(LAB_ASSET_LIST.map(a => a.key)).size).toBe(LAB_ASSET_LIST.length);
    expect(new Set(LAB_ASSET_LIST.map(a => a.path)).size).toBe(LAB_ASSET_LIST.length);
    LAB_ASSET_LIST.forEach(a => expect(existsSync('public/' + a.path), a.path).toBe(true));
  });
  it('can resolve every content illustration image without invented imports', () => {
    function walk(value) {
      if (!value || typeof value !== 'object') return;
      if (value.kind === 'card' && value.params?.image) expect(assetsForArt(value)).toHaveLength(1);
      Object.values(value).forEach(walk);
    }
    readdirSync('content/learning-lab').forEach(slug => walk(JSON.parse(readFileSync('content/learning-lab/' + slug + '/en.json'))));
  });
  it('loads cow artwork only for cattle hazards', () => {
    expect(assetsForArt({ kind: 'rural-road', params: { hazard: 'cattle' } }).some(a => a.key === 'lab-nguni-cow')).toBe(true);
    expect(assetsForArt({ kind: 'rural-road', params: { hazard: 'kudu' } }).some(a => a.key === 'lab-nguni-cow')).toBe(false);
  });
  it('includes every uploaded Priority 1 PNG and loads only relevant state sets', () => {
    const files = readdirSync('public/assets/learning-lab/priority-1', { recursive: true }).filter(p => p.endsWith('.png'));
    expect(files).toHaveLength(28);
    files.forEach(p => expect(LAB_ASSET_LIST.some(a => a.path === 'assets/learning-lab/priority-1/' + p)).toBe(true));
    expect(assetsForArt({ kind: 'child-seat', params: { view: 'belt' } }).every(a => a.path.includes('child-booster'))).toBe(true);
    expect(assetsForArt({ kind: 'head-impact', params: { style: 'bicycle' } }).map(a => a.path.split('/').at(-1))).toEqual(['no-helmet.png', 'bicycle-helmet.png']);
    expect(assetsForArt({ kind: 'car-features', params: { view: 'side' } })).toHaveLength(1);
    expect(assetsForArt({ kind: 'city-drive' }).filter(a => a.path.includes('pedestrians/'))).toHaveLength(18);
  });
  it('keeps route stops normalized and unique', () => {
    expect(new Set(B1_ROUTE_STOPS.map(s => s.id)).size).toBe(B1_ROUTE_STOPS.length);
    B1_ROUTE_STOPS.forEach(s => { expect(s.x).toBeGreaterThanOrEqual(0); expect(s.x).toBeLessThanOrEqual(1); expect(s.y).toBeGreaterThanOrEqual(0); expect(s.y).toBeLessThanOrEqual(1); });
  });
  it('contains a wide crossing and tall map without stretching or cropping', () => {
    for (const [w, h] of [[1285, 440], [582, 900]]) {
      const b = containBounds(w, h, { x: 28, y: 100, w: 484, h: 470 });
      expect(b.w / b.h).toBeCloseTo(w / h); expect(b.w).toBeLessThanOrEqual(484); expect(b.h).toBeLessThanOrEqual(470 + 1e-9);
      expect(b.x).toBeGreaterThanOrEqual(28); expect(b.y).toBeGreaterThanOrEqual(100 - 1e-9);
    }
  });
});
