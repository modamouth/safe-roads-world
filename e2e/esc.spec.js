import { test, expect } from '@playwright/test';
import { boot, tap } from './helpers.js';
import { readFileSync, mkdirSync } from 'node:fs';
const exp = JSON.parse(readFileSync('content/learning-lab/vehicle-safety/en.json'));
const topic = exp.topics.find(t => t.scenes.some(s => s.id === 'esc'));
const data = { slug: exp.slug, screen: 'scene', topic: topic.id, at: topic.scenes.findIndex(s => s.id === 'esc') };
async function open(page) {
  const errors = await boot(page);
  await expect.poll(() => page.evaluate(() => window.__srwGame?.scene.isActive('Title'))).toBe(true);
  expect(await page.evaluate(() => window.__srwGame.textures.exists('lab-esc-wet-road'))).toBe(false);
  await page.evaluate(d => { window.__srwGame.scene.stop('Title'); window.__srwGame.scene.start('LabRunner', d); }, data);
  await page.waitForFunction(() => window.__srwGame.scene.getScene('LabRunner').arts.length > 0);
  return errors;
}
const pose = page => page.evaluate(() => {
  let result; const visit = o => {
    if (o.type === 'Image' && o.visible && o.texture.key === 'lab-td-red-sedan') result = { x: o.x, y: o.y, sx: o.scaleX, sy: o.scaleY, angle: o.angle, w: o.displayWidth, h: o.displayHeight };
    if (o.type === 'Container') o.list.forEach(visit);
  }; visit(window.__srwGame.scene.getScene('LabRunner').layer); return result;
});
for (const [width, height] of [[360, 640], [390, 844], [540, 960]]) test(`realistic ESC comparison at ${width}`, async ({ page }) => {
  await page.setViewportSize({ width, height });
  const warnings = [], failures = []; page.on('response', r => { if (r.status() >= 400 && /assets\//.test(r.url())) failures.push(r.url()); });
  page.on('console', m => { if (/missing texture|Optional artwork unavailable/i.test(m.text())) warnings.push(m.text()); });
  const errors = await open(page);
  expect(await page.evaluate(() => window.__srwGame.textures.exists('lab-esc-wet-road'))).toBe(true);
  const positions = [];
  for (const label of ['Without ESC', 'With ESC']) {
    await tap(page, label); await expect(page.locator('#a11y [role=status]')).toContainText(label);
    const p = await pose(page); expect(p).toBeTruthy(); expect(p.sx).toBe(p.sy);
    expect(p.x - 31).toBeGreaterThan(28); expect(p.x + 31).toBeLessThan(512);
    expect(p.y - 31).toBeGreaterThan(100); expect(p.y + 31).toBeLessThan(570);
    positions.push(p);
    mkdirSync('test-results/esc', { recursive: true }); await page.screenshot({ path: `test-results/esc/${width}-${label === 'With ESC' ? 'with' : 'without'}.png` });
    await page.waitForTimeout(300); expect(await pose(page)).toEqual(p);
  }
  expect(positions[0].x).toBeGreaterThan(positions[1].x + 200);
  await expect(page.locator('#a11y button:not([disabled])').filter({ hasText: /^Continue$/ })).toBeAttached();
  expect(errors).toEqual([]); expect(warnings).toEqual([]); expect(failures).toEqual([]);
});
test('normal motion keeps the car visible and rapid state changes complete', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' }); const errors = await open(page);
  await tap(page, 'With ESC'); const before = await pose(page);
  await page.waitForTimeout(500); const moving = await pose(page);
  expect(moving).not.toEqual(before);
  await tap(page, 'Without ESC'); await tap(page, 'With ESC');
  await expect(page.locator('#a11y [role=status]')).toContainText('With ESC', { timeout: 20000 });
  const final = await pose(page); expect(final.x).toBeLessThan(140);
  await page.waitForTimeout(500); expect(await pose(page)).toEqual(final);
  expect(errors).toEqual([]);
});
test('unavailable road and car retain a working comparison', async ({ page }) => {
  await page.route('**/wet-esc-bend.webp', r => r.abort()); await page.route('**/red-sedan.webp', r => r.abort());
  const errors = await open(page);
  for (const label of ['Without ESC', 'With ESC']) { await tap(page, label); await expect(page.locator('#a11y [role=status]')).toContainText(label); }
  expect(await page.evaluate(() => window.__srwGame.textures.exists('lab-esc-wet-road'))).toBe(false);
  await expect(page.locator('#a11y button:not([disabled])').filter({ hasText: /^Continue$/ })).toBeAttached();
  expect(errors).toEqual([]);
});
