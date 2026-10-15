import { test, expect } from '@playwright/test';
import { boot, tap } from './helpers.js';
import { readFileSync, mkdirSync } from 'node:fs';
const exp = JSON.parse(readFileSync('content/learning-lab/heavy/en.json'));
const topic = exp.topics.find(t => t.id === 'braking');
const at = topic.scenes.findIndex(s => s.id === 'setting');
async function open(page) {
  const errors = await boot(page);
  await expect.poll(() => page.evaluate(() => window.__srwGame?.scene.isActive('Title'))).toBe(true);
  await page.evaluate(d => { window.__srwGame.scene.stop('Title'); window.__srwGame.scene.start('LabRunner', d); }, { slug: exp.slug, screen: 'scene', topic: topic.id, at });
  await page.waitForFunction(() => window.__srwGame.scene.getScene('LabRunner').arts.length > 0);
  return errors;
}
for (const [width, height] of [[360, 640], [390, 844], [540, 960]]) test(`freight truck story at ${width}`, async ({ page }) => {
  await page.setViewportSize({ width, height });
  const failures = []; page.on('response', r => { if (r.status() >= 400 && /assets\//.test(r.url())) failures.push(r.url()); });
  const errors = await open(page);
  const image = await page.evaluate(() => {
    let result; const visit = o => { if (o.type === 'Image' && o.texture.key === 'lab-freight-truck-side') result = { sx: o.scaleX, sy: o.scaleY, left: o.x - o.displayWidth / 2, right: o.x + o.displayWidth / 2, top: o.y - o.displayHeight / 2, bottom: o.y + o.displayHeight / 2 }; if (o.type === 'Container') o.list.forEach(visit); }; visit(window.__srwGame.scene.getScene('LabRunner').layer); return result;
  });
  expect(image.sx).toBe(image.sy); expect(image.left).toBeGreaterThanOrEqual(28); expect(image.right).toBeLessThanOrEqual(512); expect(image.top).toBeGreaterThan(104 + 68); expect(image.bottom).toBeLessThan(544);
  await expect(page.locator('#a11y section h1')).toContainText('dual carriageway');
  await page.waitForFunction(() => !window.__srwGame.scene.getScene('LabRunner').cameras.main.fadeEffect.isRunning);
  mkdirSync('test-results/freight-truck', { recursive: true }); await page.screenshot({ path: `test-results/freight-truck/${width}-story.png` });
  await tap(page, 'Continue'); await tap(page, 'Continue');
  await expect(page.locator('#a11y section h1')).toContainText('light ahead turns yellow');
  expect(errors).toEqual([]); expect(failures).toEqual([]);
});
test('missing freight truck retains the icon fallback', async ({ page }) => {
  await page.route('**/namibian-road-freight-truck.webp', r => r.abort());
  const errors = await open(page);
  expect(await page.evaluate(() => window.__srwGame.textures.exists('lab-freight-truck-side'))).toBe(false);
  await tap(page, 'Continue'); await tap(page, 'Continue');
  await expect(page.locator('#a11y section h1')).toContainText('light ahead turns yellow');
  expect(errors).toEqual([]);
});
