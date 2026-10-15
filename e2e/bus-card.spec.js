import { test, expect } from '@playwright/test';
import { boot, tap } from './helpers.js';
import { readFileSync, mkdirSync } from 'node:fs';
const exp = JSON.parse(readFileSync('content/learning-lab/road-rules/en.json'));
const topic = exp.topics.find(t => t.scenes.some(s => s.questions?.some(q => q.id === 'bus')));
const at = topic.scenes.findIndex(s => s.questions?.some(q => q.id === 'bus'));
const questions = topic.scenes[at].questions;
async function open(page) {
  const errors = await boot(page);
  await expect.poll(() => page.evaluate(() => window.__srwGame?.scene.isActive('Title'))).toBe(true);
  expect(await page.evaluate(() => window.__srwGame.textures.exists('lab-city-bus-open-door'))).toBe(false);
  await page.evaluate(d => { window.__srwGame.scene.stop('Title'); window.__srwGame.scene.start('LabRunner', d); }, { slug: exp.slug, topic: topic.id, screen: 'scene', at });
  await tap(page, 'Start');
  for (const q of questions) {
    if (q.id === 'bus') break;
    for (const o of q.options.filter(o => o.correct)) await tap(page, o.label.replace(/\{n:([^}]+)\}/g, '$1'));
    await tap(page, 'Check'); await tap(page, 'Next');
  }
  await expect(page.locator('#a11y section')).toContainText('How do you pass it?');
  return errors;
}
for (const [width, height] of [[360, 640], [390, 844], [540, 960]]) test(`open-door bus quiz at ${width}`, async ({ page }) => {
  await page.setViewportSize({ width, height });
  const failures = []; page.on('response', r => { if (r.status() >= 400 && /assets\//.test(r.url())) failures.push(r.url()); });
  const errors = await open(page);
  const bus = await page.evaluate(() => {
    let result; const visit = o => { if (o.type === 'Image' && o.texture.key === 'lab-city-bus-open-door') result = { sx: o.scaleX, sy: o.scaleY, x: o.x, y: o.y, w: o.displayWidth, h: o.displayHeight }; if (o.type === 'Container') o.list.forEach(visit); }; visit(window.__srwGame.scene.getScene('LabRunner').layer); return result;
  });
  expect(bus.sx).toBe(bus.sy); expect(bus.w / bus.h).toBeCloseTo(2048 / 768);
  expect(bus.x - bus.w / 2).toBeGreaterThan(28); expect(bus.x + bus.w / 2).toBeLessThan(512);
  expect(bus.y - bus.h / 2).toBeGreaterThan(138); expect(bus.y + bus.h / 2).toBeLessThan(308);
  mkdirSync('test-results/bus-card', { recursive: true }); await page.screenshot({ path: `test-results/bus-card/${width}.png` });
  await tap(page, 'Slowly, watching for people'); await tap(page, 'Check');
  await expect(page.locator('#a11y [role=status]')).toContainText('Correct');
  expect(errors).toEqual([]); expect(failures).toEqual([]);
});
test('missing bus keeps the quiz usable', async ({ page }) => {
  await page.route('**/city-bus-open-door.webp', r => r.abort());
  const errors = await open(page);
  expect(await page.evaluate(() => window.__srwGame.textures.exists('lab-city-bus-open-door'))).toBe(false);
  await tap(page, 'Slowly, watching for people'); await tap(page, 'Check');
  await expect(page.locator('#a11y [role=status]')).toContainText('Correct');
  expect(errors).toEqual([]);
});
