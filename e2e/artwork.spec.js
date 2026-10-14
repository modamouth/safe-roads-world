import { test, expect } from '@playwright/test';
import { boot, tap } from './helpers.js';
import { readFileSync, mkdirSync } from 'node:fs';

const content = slug => JSON.parse(readFileSync(new URL('../content/learning-lab/' + slug + '/en.json', import.meta.url)));
const destinations = [
  ['child-seats', 'seat', 'setting'], ['child-seats', 'seat', 'tighten'],
  ['child-seats', 'seat', 'install'], ['child-seats', 'seat', 'harness'], ['child-seats', 'belt', 'fit'],
  ['speed', null, null, 'rural-road'], ['speed', null, null, 'crash-lab'],
  ['pedestrian', null, null, 'city-drive'], ['heavy', null, null, 'truck-junction'],
  ['fatigue', null, 'plan'], ['conditions', null, 'depth'],
  ...['rumble', 'refuge', 'roundabout', 'lighting', 'fence', 'choose-treatment'].map(id => ['road-treatments', null, id]),
  ['road-rules', null, 'signal-states']
].map(([slug, topicId, id, kind]) => {
  const exp = content(slug);
  const topic = exp.topics.find(t => (!topicId || t.id === topicId) && t.scenes.some(s => id ? s.id === id : s.art?.kind === kind));
  if (!topic) throw new Error('Missing test destination: ' + slug + '/' + id + '/' + kind);
  const at = topic.scenes.findIndex(s => id ? s.id === id : s.art?.kind === kind);
  return { slug, topic: topic.id, at, sc: topic.scenes[at] };
});

async function start(page, d) {
  if (process.env.DEBUG) console.log('START', d.slug, d.sc?.id);
  await page.evaluate(d => { window.__srwGame.scene.stop('Title'); window.__srwGame.scene.start('LabRunner', { slug: d.slug, topic: d.topic, at: d.at, screen: 'scene' }); }, d);
  await page.waitForFunction(() => {
    const s = window.__srwGame.scene.getScene('LabRunner');
    return s.scene.isActive() && s.arts?.length > 0;
  });
  await page.waitForTimeout(300);
}

for (const size of [{ width: 360, height: 640 }, { width: 390, height: 844 }, { width: 430, height: 932 }, { width: 540, height: 960 }, { width: 1280, height: 900 }]) {
  test('artwork missions at ' + size.width + 'x' + size.height, async ({ page }) => {
    await page.setViewportSize(size);
    const warnings = [], failures = [], requests = [];
    page.on('console', m => { if (/missing texture|texture.*not found|Optional artwork unavailable/i.test(m.text())) warnings.push(m.text()); });
    page.on('response', r => { if (r.status() >= 400 && /assets\//.test(r.url())) failures.push(r.url()); });
    page.on('request', r => { if (/assets\//.test(r.url())) requests.push(r.url()); });
    const errors = await boot(page);
    await expect(page.locator('#a11y')).toBeAttached();
    await expect.poll(() => page.evaluate(() => !!window.__srwGame?.scene.isActive('Title'))).toBe(true);
    expect(requests.some(url => /childseat|td_road|scn_crossing|tl_red/.test(url))).toBe(false);
    for (const d of destinations) {
      await start(page, d);
      if (d.sc.type === 'toggle-lab') {
        for (const state of d.sc.states) {
          await tap(page, state.label.replace(/\{n:(\d+)\}/g, '$1'));
          await page.waitForTimeout(60);
        }
      }
      if (d.sc.id === 'tighten') {
        await tap(page, 'Tighten and check'); await tap(page, 'Confirm');
        await expect(page.locator('#a11y button').filter({ hasText: /^Continue$/ })).toBeAttached();
      }
      if (['install', 'harness', 'depth', 'plan', 'signal-states', 'lighting', 'fence', 'roundabout'].includes(d.sc.id)) {
        await page.waitForTimeout(1200);
        mkdirSync('test-results/artwork', { recursive: true });
        await page.screenshot({ path: `test-results/artwork/${size.width}-${d.slug}-${d.sc.id}.png` });
      }
      // The art objects and camera use the same design transform after resize.
      const valid = await page.evaluate(() => {
        const s = window.__srwGame.scene.getScene('LabRunner');
        return Number.isFinite(s.cameras.main.zoom) && s.arts.length > 0;
      });
      expect(valid).toBe(true);
    }
    expect(errors).toEqual([]); expect(failures).toEqual([]); expect(warnings).toEqual([]);
  });
}

test('missing optional state preserves drawn fallback', async ({ page }) => {
  await page.route('**/assets/childseat_loose.webp', route => route.abort());
  await page.route('**/assets/tl_red.webp', route => route.abort());
  const errors = await boot(page);
  await expect.poll(() => page.evaluate(() => !!window.__srwGame?.scene.isActive('Title'))).toBe(true);
  await start(page, destinations.find(d => d.sc.id === 'install'));
  await tap(page, 'Loose'); await tap(page, 'Firm');
  await start(page, destinations.find(d => d.sc.id === 'signal-states'));
  await tap(page, 'Red'); await tap(page, 'Green');
  expect(await page.evaluate(() => window.__srwGame.textures.exists('tl_red'))).toBe(false);
  expect(errors).toEqual([]);
});

test('route resizing, keyboard signals, spot cards and texture release', async ({ page }) => {
  const errors = await boot(page);
  await expect.poll(() => page.evaluate(() => !!window.__srwGame?.scene.isActive('Title'))).toBe(true);
  const route = destinations.find(d => d.sc.id === 'plan');
  await start(page, route);
  const positions = () => page.evaluate(() => {
    const art = window.__srwGame.scene.getScene('LabRunner').arts[0];
    return ['otj', 'tsu', 'osh'].map(id => art.pointPosition({ id, x: 50, y: 0 }));
  });
  const before = await positions();
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(150);
  expect(await positions()).toEqual(before);
  await tap(page, 'Inspect Rest stop');
  await expect(page.locator('#a11y [role=status]')).toContainText('Rest stop');
  await start(page, destinations.find(d => d.sc.id === 'signal-states'));
  const red = page.locator('#a11y button').filter({ hasText: /^Red$/ });
  await red.focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#a11y [role=status]')).toContainText('Stop behind');
  for (const key of ['spot_beer', 'spot_meds', 'spot_phone', 'spot_wheel']) {
    await page.evaluate(async key => {
      const s = window.__srwGame.scene.getScene('LabRunner');
      const art = await s.makeArt({ kind: 'card', params: { image: key }, alt: key });
      if (!s.textures.exists(key)) throw new Error('Missing card ' + key);
      art.destroy();
    }, key);
  }
  await page.evaluate(() => { window.__srwGame.scene.getScene('LabRunner').go('LabMenu'); });
  await expect.poll(() => page.evaluate(() => window.__srwGame.scene.isActive('LabMenu'))).toBe(true);
  expect(await page.evaluate(() => window.__srwGame.textures.exists('scn_b1map'))).toBe(false);
  expect(errors).toEqual([]);
});

test('state comparison transforms stay fixed across swaps', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const errors = await boot(page);
  await expect.poll(() => page.evaluate(() => !!window.__srwGame?.scene.isActive('Title'))).toBe(true);
  const geometry = () => page.evaluate(() => {
    const s = window.__srwGame.scene.getScene('LabRunner');
    const all = [];
    const visit = obj => { if (obj.type === 'Image') all.push([obj.texture.key, obj.x, obj.y, obj.scaleX, obj.scaleY, obj.originX, obj.originY]); if (obj.type === 'Container') obj.list.forEach(visit); };
    visit(s.layer); return all;
  });
  for (const id of ['install', 'harness', 'roundabout', 'signal-states']) {
    const d = destinations.find(d => d.sc.id === id);
    await start(page, d);
    const before = await geometry();
    for (const state of d.sc.states) await tap(page, state.label);
    await page.waitForTimeout(400);
    expect(await geometry()).toEqual(before);
  }
  expect(errors).toEqual([]);
});
