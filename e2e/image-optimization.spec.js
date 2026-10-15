import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { boot } from './helpers.js';
const assets = JSON.parse(readFileSync('src/generated/image-assets.json'));
const exp = JSON.parse(readFileSync('content/learning-lab/pedestrian/en.json'));
const topic = exp.topics.find(t => t.scenes.some(s => s.art?.kind === 'city-drive'));
const at = topic.scenes.findIndex(s => s.art?.kind === 'city-drive');

test('shell and city load WebPs with smaller bitmaps', async ({ page }) => {
  const requests = [];
  page.on('request', r => { if (/\.(png|webp|jpe?g)(?:\?|$)/i.test(r.url())) requests.push(new URL(r.url()).pathname); });
  const errors = await boot(page);
  await expect.poll(() => page.evaluate(() => window.__srwGame?.scene.isActive('Title'))).toBe(true);
  await page.evaluate(d => { window.__srwGame.scene.stop('Title'); window.__srwGame.scene.start('LabRunner', d); }, { slug: exp.slug, topic: topic.id, at, screen: 'scene' });
  await page.waitForFunction(() => window.__srwGame.scene.getScene('LabRunner').arts.length > 0);
  const bitmaps = await page.evaluate(() => {
    const textures = window.__srwGame.textures;
    const result = {};
    for (const key of textures.getTextureKeys().filter(k => /lab-pedestrians/.test(k))) {
      const im = textures.get(key).getSourceImage();
      result[key] = { width: im.width, height: im.height };
    }
    return result;
  });
  expect(Object.keys(bitmaps)).toHaveLength(18);
  Object.values(bitmaps).forEach(b => expect(b).toEqual({ width: 512, height: 768 }));
  const originals = requests.filter(url => !url.includes('/optimized/') && Object.keys(assets).some(path => url.endsWith('/' + path)));
  expect(originals).toEqual([]);
  expect(requests.filter(url => url.includes('/optimized/')).length).toBeGreaterThan(18);
  expect(errors).toEqual([]);
});
