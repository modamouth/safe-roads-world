import { test, expect } from '@playwright/test';
import { boot, tap } from './helpers.js';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
const exp = JSON.parse(readFileSync('content/learning-lab/vehicle-safety/en.json'));
const topic = exp.topics.find(t => t.scenes.some(s => s.art?.kind === 'car-features' && s.art.params?.view === 'side'));
const at = topic.scenes.findIndex(s => s.art?.kind === 'car-features' && s.art.params?.view === 'side');
const data = { slug: exp.slug, screen: 'scene', topic: topic.id, at };
async function start(page) {
  const errors = await boot(page, { keepProgress: true });
  await expect.poll(() => page.evaluate(() => window.__srwGame?.scene.isActive('Title'))).toBe(true);
  await page.evaluate(d => { window.__srwGame.scene.stop('Title'); window.__srwGame.scene.start('LabRunner', d); }, data);
  await expect.poll(() => page.evaluate(() => window.__srwGame.scene.getScene('LabRunner').ctx?.sc?.id)).toBe(topic.scenes[at].id);
  return errors;
}
test('reload stays in the same lesson and explicit exit clears recovery', async ({ page }) => {
  const errors = await start(page);
  const key = 'srw.lab.v1';
  await page.evaluate(key => {
    const value = JSON.parse(localStorage.getItem(key)); value.stamps['already-earned'] = 123;
    localStorage.setItem(key, JSON.stringify(value));
  }, key);
  await page.reload();
  await expect.poll(() => page.evaluate(() => window.__srwGame?.scene.isActive('LabRunner'))).toBe(true);
  await expect.poll(() => page.evaluate(() => window.__srwGame.scene.getScene('LabRunner').ctx?.sc?.id)).toBe(topic.scenes[at].id);
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).stamps['already-earned'], key)).toBe(123);
  for (let i = 0; i < topic.scenes[at].lines.length; i++) await tap(page, 'Continue');
  await expect.poll(() => page.evaluate(() => window.__srwGame.scene.getScene('LabRunner').ctx?.at)).toBe(at + 1);
  await page.reload();
  await expect.poll(() => page.evaluate(() => window.__srwGame?.scene.getScene('LabRunner').ctx?.at)).toBe(at + 1);
  await page.evaluate(() => { window.__srwGame.scene.getScene('LabRunner').go('LabMenu'); });
  await expect.poll(() => page.evaluate(() => window.__srwGame.scene.isActive('LabMenu'))).toBe(true);
  expect(await page.evaluate(() => sessionStorage.getItem('srw.lab.active.v1'))).toBe(null);
  await page.reload();
  await expect.poll(() => page.evaluate(() => window.__srwGame?.scene.isActive('Title'))).toBe(true);
  expect(errors).toEqual([]);
});
test('local asset updates do not reload an active experience', async ({ page }) => {
  const errors = await start(page);
  await page.evaluate(() => { window.previewSessionMarker = 'still here'; });
  const probe = 'public/srw-preview-reload-probe.txt';
  try {
    writeFileSync(probe, 'Local preview reload regression probe.');
    await page.waitForTimeout(2200);
    expect(await page.evaluate(() => window.previewSessionMarker)).toBe('still here');
    expect(await page.evaluate(() => window.__srwGame.scene.isActive('LabRunner'))).toBe(true);
  } finally { unlinkSync(probe); }
  expect(errors).toEqual([]);
});
test('hidden and destroyed controls ignore late activations', async ({ page }) => {
  const errors = await start(page);
  expect(await page.evaluate(async () => {
    const { mirror } = await import('/src/a11y.js');
    const scene = window.__srwGame.scene.getScene('LabRunner'), obj = scene.add.zone(10, 10, 10, 10);
    let count = 0; const { el } = mirror(obj, 'Late activation probe', () => count++);
    obj.setVisible(false); el.click(); const hidden = count;
    obj.setVisible(true); el.click(); const visible = count;
    obj.destroy(); el.click(); return { hidden, visible, destroyed: count };
  })).toEqual({ hidden: 0, visible: 1, destroyed: 1 });
  expect(errors).toEqual([]);
});
