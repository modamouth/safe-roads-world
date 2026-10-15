import { test, expect } from '@playwright/test';
import { boot, tap } from './helpers.js';
import { readFileSync, mkdirSync } from 'node:fs';
const exp = JSON.parse(readFileSync('content/learning-lab/road-rules/en.json'));
const topic = exp.topics.find(t => t.scenes.some(s => s.questions?.some(q => q.id === 'shoulder')));
const at = topic.scenes.findIndex(s => s.questions?.some(q => q.id === 'shoulder'));
const questions = topic.scenes[at].questions;
async function open(page) {
  const errors = await boot(page);
  await expect.poll(() => page.evaluate(() => window.__srwGame?.scene.isActive('Title'))).toBe(true);
  await page.evaluate(d => { window.__srwGame.scene.stop('Title'); window.__srwGame.scene.start('LabRunner', d); }, { slug: exp.slug, topic: topic.id, screen: 'scene', at });
  await tap(page, 'Start');
  for (const q of questions) {
    if (q.id === 'shoulder') break;
    for (const o of q.options.filter(o => o.correct)) await tap(page, o.label);
    await tap(page, 'Check'); await tap(page, 'Next');
  }
  await expect(page.locator('#a11y section h1')).toContainText('Question 4 of 4');
  return errors;
}
for (const [width, height] of [[360, 640], [390, 844], [540, 960]]) test(`shoulder quiz car at ${width}`, async ({ page }) => {
  await page.setViewportSize({ width, height });
  const failures = []; page.on('response', r => { if (r.status() >= 400 && /assets\//.test(r.url())) failures.push(r.url()); });
  const errors = await open(page);
  const car = await page.evaluate(() => {
    let car; const visit = o => { if (o.type === 'Image' && o.texture.key === 'lab-td-blue-sedan' && o.visible) car = { sx: o.scaleX, sy: o.scaleY, x: o.x, y: o.y, w: o.displayWidth, h: o.displayHeight }; if (o.type === 'Container') o.list.forEach(visit); }; visit(window.__srwGame.scene.getScene('LabRunner').layer); return car;
  });
  expect(car.sx).toBe(car.sy); expect(car.w).toBeLessThanOrEqual(22); expect(car.h).toBeLessThanOrEqual(40);
  expect(car.x - car.w / 2).toBeGreaterThan(160); expect(car.x + car.w / 2).toBeLessThan(268);
  expect(car.y + car.h / 2).toBeLessThan(308);
  mkdirSync('test-results/shoulder-car', { recursive: true }); await page.screenshot({ path: `test-results/shoulder-car/${width}.png` });
  await tap(page, 'False'); await tap(page, 'Check');
  await expect(page.locator('#a11y [role=status]')).toContainText('Correct');
  expect(errors).toEqual([]); expect(failures).toEqual([]);
});
test('missing car image keeps shoulder quiz usable', async ({ page }) => {
  await page.route('**/blue-sedan.webp', r => r.abort());
  const errors = await open(page);
  expect(await page.evaluate(() => window.__srwGame.textures.exists('lab-td-blue-sedan'))).toBe(false);
  await tap(page, 'False'); await tap(page, 'Check');
  await expect(page.locator('#a11y [role=status]')).toContainText('Correct');
  expect(errors).toEqual([]);
});
