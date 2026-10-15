import { test, expect } from '@playwright/test';
import { boot, tap } from './helpers.js';
import { readFileSync, mkdirSync } from 'node:fs';

const scenes = [];
for (const slug of ['heavy', 'pedestrian', 'bicycle']) {
  const exp = JSON.parse(readFileSync(`content/learning-lab/${slug}/en.json`));
  for (const topic of exp.topics) topic.scenes.forEach((sc, at) => {
    if (['truck-lanes', 'truck-junction', 'crossing-street', 'passing'].includes(sc.art?.kind) || sc.art?.params?.image === 'lab-td-cyclist-car-safe-pass') scenes.push({ slug, topic: topic.id, at, sc });
  });
}
async function open(page, d) {
  await page.evaluate(d => { window.__srwGame.scene.stop('Title'); window.__srwGame.scene.start('LabRunner', { slug: d.slug, topic: d.topic, at: d.at, screen: 'scene' }); }, d);
  await page.waitForFunction(() => window.__srwGame.scene.getScene('LabRunner').arts.length > 0);
  await page.waitForTimeout(300);
}
for (const width of [360, 390, 540]) test(`Priority 2 scenes at ${width}`, async ({ page }) => {
  await page.setViewportSize({ width, height: width === 390 ? 844 : width === 360 ? 640 : 960 });
  const warnings = [], failures = [];
  page.on('console', m => { if (/missing texture|texture.*not found|Optional artwork unavailable/i.test(m.text())) warnings.push(m.text()); });
  page.on('response', r => { if (r.status() >= 400 && /assets\//.test(r.url())) failures.push(r.url()); });
  const errors = await boot(page);
  await expect.poll(() => page.evaluate(() => window.__srwGame?.scene.isActive('Title'))).toBe(true);
  for (const d of scenes) {
    await open(page, d);
    if (d.sc.type === 'stepper') for (let i = 1; i < d.sc.steps.length; i++) await tap(page, 'Next');
    if (d.sc.type === 'toggle-lab') for (const state of d.sc.states) { await tap(page, state.label.replace(/\{n:([^}]+)\}/g, '$1')); await page.waitForTimeout(60); }
    if (d.sc.type === 'tap-hotspots') {
      for (const item of d.sc.items.filter(i => i.correct)) await tap(page, item.label);
      await tap(page, 'Check');
    }
    if (d.sc.type === 'pick-a-point') { const pt = d.sc.points.find(p => p.verdict === 'good') || d.sc.points[0]; await tap(page, new RegExp(pt.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))); }
    if (d.sc.type === 'place-on-road') { await tap(page, 'Move back'); await tap(page, 'Confirm position'); }
    if (d.sc.type === 'choice') { await tap(page, d.sc.options.find(o => o.verdict === 'good').label); await tap(page, 'Confirm'); }
    if (d.sc.type === 'pick-a-point' || d.sc.type === 'choice') {
      await expect(page.locator('#a11y button:not([hidden]):not([disabled])').filter({ hasText: /^(Continue|Try another point|See point)/ }).first()).toBeAttached({ timeout: 30000 });
    }
    await page.waitForTimeout(1200);
    const valid = await page.evaluate(() => {
      const s = window.__srwGame.scene.getScene('LabRunner'); let valid = true;
      const visit = o => { if (o.type === 'Image' && o.texture.key.startsWith('lab-td-')) valid &&= Math.abs(o.scaleX - o.scaleY) < 1e-9 && Number.isFinite(o.scaleX); if (o.type === 'Container') o.list.forEach(visit); };
      visit(s.layer); return valid;
    });
    expect(valid).toBe(true);
    if (d.sc.id === 'spot' && d.sc.art.kind === 'truck-lanes') {
      const keys = await page.evaluate(() => {
        const keys = []; const visit = o => { if (o.type === 'Image' && o.visible) keys.push(o.texture.key); if (o.type === 'Container') o.list.forEach(visit); };
        visit(window.__srwGame.scene.getScene('LabRunner').layer); return keys;
      });
      expect(keys).toContain('lab-td-blue-sedan'); expect(keys).toContain('lab-td-motorcycle-rider');
    }
    if (d.sc.art.kind === 'crossing-street' || ['spot', 'gap', 'cross', 'setting', 'decide'].includes(d.sc.id)) {
      mkdirSync('test-results/priority2', { recursive: true });
      await page.screenshot({ path: `test-results/priority2/${width}-${d.slug}-${d.topic}-${d.sc.id}.png` });
    }
  }
  expect(errors).toEqual([]); expect(warnings).toEqual([]); expect(failures).toEqual([]);
});
test('Priority 2 missing tanker and cyclist keep placeholders usable', async ({ page }) => {
  await page.route('**/fuel-tanker.webp', route => route.abort());
  await page.route('**/cyclist.webp', route => route.abort());
  const errors = await boot(page);
  await expect.poll(() => page.evaluate(() => window.__srwGame?.scene.isActive('Title'))).toBe(true);
  await open(page, scenes.find(d => d.sc.art.kind === 'truck-lanes'));
  await open(page, scenes.find(d => d.sc.art.kind === 'passing'));
  expect(errors).toEqual([]);
});
