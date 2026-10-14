import { test, expect } from '@playwright/test';
import { boot, tap } from './helpers.js';
import { readFileSync, mkdirSync } from 'node:fs';
const find = (slug, kind, view) => {
  const exp = JSON.parse(readFileSync(`content/learning-lab/${slug}/en.json`));
  const topic = exp.topics.find(t => t.scenes.some(s => s.art?.kind === kind && (!view || s.art.params?.view === view) && (kind === 'city-drive' || kind === 'car-features' && view === 'side' || s.type === 'toggle-lab')));
  const at = topic.scenes.findIndex(s => s.art?.kind === kind && (!view || s.art.params?.view === view) && (kind === 'city-drive' || kind === 'car-features' && view === 'side' || s.type === 'toggle-lab'));
  return { slug, topic: topic.id, at, sc: topic.scenes[at] };
};
const destinations = [find('child-seats', 'child-seat', 'belt'), find('vehicle-safety', 'car-features', 'belt'), find('vehicle-safety', 'car-features', 'side'), find('motorcycle', 'rider-gear'), find('motorcycle', 'head-impact'), find('bicycle', 'head-impact'), find('pedestrian', 'city-drive')];
async function open(page, d) {
  await page.evaluate(d => { window.__srwGame.scene.stop('Title'); window.__srwGame.scene.start('LabRunner', d); }, { slug: d.slug, topic: d.topic, at: d.at, screen: 'scene' });
  await page.waitForFunction(() => window.__srwGame.scene.getScene('LabRunner').arts.length > 0);
}
const images = page => page.evaluate(() => {
  const result = []; const visit = o => { if (o.type === 'Image' && /lab-(child-booster|adult-seatbelt|vehicle|motorcycle-rider|helmet-test|pedestrians)/.test(o.texture.key)) result.push({ key: o.texture.key, alpha: o.alpha, visible: o.visible, x: o.x, y: o.y, sx: o.scaleX, sy: o.scaleY, width: o.width, height: o.height, originY: o.originY }); if (o.type === 'Container') o.list.forEach(visit); };
  visit(window.__srwGame.scene.getScene('LabRunner').layer); return result;
});
for (const [width, height] of [[360, 640], [390, 844], [540, 960]]) test(`uploaded Priority 1 lessons at ${width}`, async ({ page }) => {
  await page.setViewportSize({ width, height });
  const failures = [], warnings = [];
  page.on('response', r => { if (r.status() >= 400 && /assets\//.test(r.url())) failures.push(r.url()); });
  page.on('console', m => { if (/missing texture|texture.*not found|Optional artwork unavailable/i.test(m.text())) warnings.push(m.text()); });
  const errors = await boot(page);
  await expect.poll(() => page.evaluate(() => window.__srwGame?.scene.isActive('Title'))).toBe(true);
  expect(await page.evaluate(() => window.__srwGame.textures.exists('lab-child-booster-correct-booster'))).toBe(false);
  for (const d of destinations) {
    await open(page, d);
    let before = await images(page);
    expect(before.length).toBeGreaterThan(0);
    if (d.sc.type === 'toggle-lab') for (const state of d.sc.states) {
      await tap(page, state.label);
      await expect(page.locator('#a11y [role=status]')).toContainText(state.label);
      await expect.poll(async () => (await images(page)).filter(i => i.alpha > .999).length).toBe(1);
      const after = await images(page);
      expect(after.map(i => [i.x, i.y, i.sx, i.sy, i.width, i.height])).toEqual(before.map(i => [i.x, i.y, i.sx, i.sy, i.width, i.height]));
      expect(after.filter(i => i.alpha > .999)).toHaveLength(1);
    }
    (await images(page)).forEach(i => expect(i.sx).toBe(i.sy));
    mkdirSync('test-results/priority1', { recursive: true });
    await page.screenshot({ path: `test-results/priority1/${width}-${d.slug}-${d.sc.art.kind}-${d.sc.art.params?.view || d.sc.art.params?.style || 'scene'}.png` });
  }
  expect(errors).toEqual([]); expect(failures).toEqual([]); expect(warnings).toEqual([]);
});
test('missing Priority 1 state retains usable comparison drawings', async ({ page }) => {
  await page.route('**/priority-1/**', route => route.abort());
  const errors = await boot(page);
  await expect.poll(() => page.evaluate(() => window.__srwGame?.scene.isActive('Title'))).toBe(true);
  for (const d of destinations) {
    await open(page, d);
    if (d.sc.type === 'toggle-lab') for (const state of d.sc.states) {
      await tap(page, state.label);
      await expect(page.locator('#a11y [role=status]')).toContainText(state.label);
    }
    expect(await images(page)).toEqual([]);
  }
  expect(errors).toEqual([]);
});
test('normal-motion crossfades and pedestrian feet remain stable', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const errors = await boot(page);
  await expect.poll(() => page.evaluate(() => window.__srwGame?.scene.isActive('Title'))).toBe(true);
  for (const d of destinations.filter(d => d.sc.type === 'toggle-lab')) {
    await open(page, d);
    const before = await images(page);
    await tap(page, d.sc.states[1].label);
    await expect(page.locator('#a11y [role=status]')).toContainText(d.sc.states[1].label);
    await expect.poll(async () => (await images(page)).filter(i => i.alpha > .999).length).toBe(1);
    const after = await images(page);
    expect(after.filter(i => i.alpha > .999)).toHaveLength(1);
    expect(after.map(i => [i.x, i.y, i.sx, i.sy])).toEqual(before.map(i => [i.x, i.y, i.sx, i.sy]));
  }
  await open(page, destinations.at(-1));
  const frames = () => page.evaluate(() => {
    const result = []; const visit = o => { if (o.type === 'Image' && /lab-pedestrians/.test(o.texture.key)) result.push({ key: o.texture.key, height: o.height, origin: o.originY, width: o.width }); if (o.type === 'Container') o.list.forEach(visit); }; visit(window.__srwGame.scene.getScene('LabRunner').layer); return result;
  });
  const first = await frames(); await page.waitForTimeout(550); const next = await frames();
  expect(next.some((o, i) => o.key !== first[i].key)).toBe(true);
  expect(next.map(o => [o.height, o.width])).toEqual(first.map(o => [o.height, o.width]));
  expect(next.every(o => o.origin > .95 && o.origin <= 1)).toBe(true);
  expect(errors).toEqual([]);
});
test('feature highlights, ESC sprite and new texture cleanup', async ({ page }) => {
  const errors = await boot(page);
  await expect.poll(() => page.evaluate(() => window.__srwGame?.scene.isActive('Title'))).toBe(true);
  await open(page, destinations[2]);
  const before = await images(page);
  for (const id of ['seatbelt', 'airbag', 'abs', 'esc', 'tyres', 'lights', 'headrest', 'mirrors']) {
    await page.evaluate(id => window.__srwGame.scene.getScene('LabRunner').arts[0].highlight(id), id);
    expect(await images(page)).toEqual(before);
  }
  await page.setViewportSize({ width: 844, height: 390 });
  expect(await images(page)).toEqual(before);
  await open(page, find('vehicle-safety', 'car-features', 'skid'));
  await tap(page, 'With ESC');
  await expect.poll(() => page.evaluate(() => {
    let found = false; const visit = o => { if (o.type === 'Image' && o.texture.key === 'lab-td-red-sedan' && o.visible) found = true; if (o.type === 'Container') o.list.forEach(visit); };
    visit(window.__srwGame.scene.getScene('LabRunner').layer); return found;
  })).toBe(true);
  await page.evaluate(() => { window.__srwGame.scene.getScene('LabRunner').go('Title'); });
  await expect.poll(() => page.evaluate(() => window.__srwGame.textures.exists('lab-vehicle-side-view-safety-features'))).toBe(false);
  expect(errors).toEqual([]);
});
