import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assets from '../src/generated/image-assets.json';
import { LAB_ASSET_LIST } from '../src/lab/assets.js';
import { imageURL, loadImage, sourceBounds, sourceScale } from '../src/imageAssets.js';

describe('optimized runtime artwork', () => {
  it('ships a current derivative for every registered illustration', () => {
    LAB_ASSET_LIST.forEach(a => expect(assets[a.path], a.path).toBeDefined());
    Object.entries(assets).forEach(([path, a]) => {
      expect(existsSync('public/' + a.url), path).toBe(true);
      expect(a.sha256).toBe(createHash('sha256').update(readFileSync('public/' + path)).digest('hex'));
      expect(a.runtimeWidth).toBeLessThanOrEqual(a.width);
      expect(a.runtimeHeight).toBeLessThanOrEqual(a.height);
    });
    const sizes = Object.values(assets);
    expect(sizes.reduce((n, a) => n + a.runtimeBytes, 0)).toBeLessThan(sizes.reduce((n, a) => n + a.sourceBytes, 0) / 5);
  });
  it('keeps animal animation poses at the same resize factor', () => {
    for (const path of ['assets/learning-lab/priority-3/animals/kudu-standing.png', 'assets/learning-lab/priority-3/animals/kudu-leaping.png']) {
      const a = assets[path];
      expect(a.runtimeWidth / a.width).toBe(.5);
      expect(Math.abs(a.runtimeHeight - a.height / 2)).toBeLessThanOrEqual(.5);
    }
  });
  it('maps calibrated frames and feet to the resized bitmap', () => {
    const path = 'assets/learning-lab/priority-1/pedestrians/schoolgirl/standing.png';
    const a = assets[path];
    const requests = [];
    const scene = { textures: { get: () => ({ getSourceImage: () => ({ width: a.runtimeWidth, height: a.runtimeHeight }) }) }, load: { image: (...args) => requests.push(args) } };
    loadImage(scene, 'girl', path);
    expect(requests).toEqual([['girl', a.url]]);
    expect(sourceScale(scene, 'girl')).toEqual({ x: .5, y: .5 });
    expect(sourceBounds(scene, 'girl', [213, 7, 863, 1517])).toEqual([106, 3, 432, 759]);
    expect(imageURL('missing.png')).toBe('missing.png');
  });
});
