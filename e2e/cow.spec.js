import { test, expect } from '@playwright/test';
import { boot, tap } from './helpers.js';
import { readFileSync, mkdirSync } from 'node:fs';
const exp = JSON.parse(readFileSync('content/learning-lab/speed/en.json'));
const topic = exp.topics.find(t => t.scenes.some(s => s.id === 'headlights'));
async function open(page, id) {
  const at = topic.scenes.findIndex(s => s.id === id);
  await page.evaluate(d => { window.__srwGame.scene.stop('Title'); window.__srwGame.scene.start('LabRunner', d); }, { slug: 'speed', topic: topic.id, at, screen: 'scene' });
  await page.waitForFunction(() => window.__srwGame.scene.getScene('LabRunner').arts.length > 0);
}
const vars = page => page.evaluate(() => window.__srwGame.scene.getScene('LabRunner').ctx.vars);
for (const width of [360, 540]) test(`night cow at ${width}`, async ({ page }) => {
  await page.setViewportSize({ width, height: width === 360 ? 640 : 960 });
  const failures = [], warnings = [];
  page.on('response', r => { if (r.status() >= 400 && /assets\//.test(r.url())) failures.push(r.url()); });
  page.on('console', m => { if (/missing texture|texture.*not found|Optional artwork unavailable/i.test(m.text())) warnings.push(m.text()); });
  const errors = await boot(page);
  await expect.poll(() => page.evaluate(() => window.__srwGame?.scene.isActive('Title'))).toBe(true);
  expect(await page.evaluate(() => window.__srwGame.textures.exists('lab-nguni-cow'))).toBe(false);
  for (const id of ['headlights', 'main-beam']) {
    await open(page, id);
    const sc = topic.scenes.find(s => s.id === id);
    for (const state of sc.states) {
      await tap(page, state.label.replace(/\{n:([^}]+)\}/g, '$1'));
      await expect(page.locator('#a11y [role=status]')).toContainText(id === 'headlights' ? `At ${state.id}` : state.id === 'dipped' ? 'Dipped beam' : 'Main beam', { timeout: 25000 });
      expect(Number.isFinite((await vars(page)).stopM)).toBe(true);
    }
    const sprites = await page.evaluate(() => {
      const result = []; const visit = o => { if (o.type === 'Image' && o.texture.key === 'lab-nguni-cow') result.push({ visible: o.visible, scaleX: o.scaleX, scaleY: o.scaleY, originY: o.originY }); if (o.type === 'Container') o.list.forEach(visit); };
      visit(window.__srwGame.scene.getScene('LabRunner').layer); return result;
    });
    expect(sprites).toHaveLength(1); expect(sprites[0].visible).toBe(true); expect(sprites[0].scaleX).toBe(sprites[0].scaleY); expect(sprites[0].originY).toBe(1);
    mkdirSync('test-results/cow', { recursive: true });
    await page.screenshot({ path: `test-results/cow/${width}-${id}.png` });
  }
  expect(errors).toEqual([]); expect(failures).toEqual([]); expect(warnings).toEqual([]);
});
test('missing cow artwork keeps night comparison usable', async ({ page }) => {
  await page.route('**/nguni-cow.webp', route => route.abort());
  const errors = await boot(page);
  await expect.poll(() => page.evaluate(() => window.__srwGame?.scene.isActive('Title'))).toBe(true);
  await open(page, 'headlights'); await tap(page, '80');
  await expect(page.locator('#a11y [role=status]')).toContainText('At 80', { timeout: 25000 });
  expect(await page.evaluate(() => window.__srwGame.textures.exists('lab-nguni-cow'))).toBe(false);
  expect(await page.evaluate(() => window.__srwGame.textures.exists('lab_cattle'))).toBe(true);
  expect(Number.isFinite((await vars(page)).stopM)).toBe(true);
  expect(errors).toEqual([]);
});

const roadPose = page => page.evaluate(() => {
  const s = window.__srwGame.scene.getScene('LabRunner'); const images = [];
  const visit = o => { if (o.type === 'Image') images.push([o.texture.key, o.x, o.y, o.angle, o.scaleX, o.scaleY]); if (o.type === 'Container') o.list.forEach(visit); };
  visit(s.layer); return images;
});

test('cow collision has an impact cue and stays stopped', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const errors = await boot(page);
  await expect.poll(() => page.evaluate(() => window.__srwGame?.scene.isActive('Title'))).toBe(true);
  await open(page, 'headlights');
  await page.evaluate(() => {
    const s = window.__srwGame.scene.getScene('LabRunner'), camera = s.cameras.main, shake = camera.shake;
    s.cowImpactCues = 0;
    camera.shake = function (...args) { s.cowImpactCues++; return shake.apply(this, args); };
  });
  await tap(page, '120');
  await expect.poll(async () => (await vars(page)).collided, { timeout: 20000 }).toBe(true);
  expect(await page.evaluate(() => window.__srwGame.scene.getScene('LabRunner').cowImpactCues)).toBe(1);
  await expect(page.locator('#a11y [role=status]')).toContainText('car stopped', { timeout: 15000 });
  const result = await vars(page);
  expect(result.currentKmh).toBe(0); expect(result.travelM).toBeCloseTo(result.seeM, 1); expect(result.hitKmh).toBeGreaterThan(0);
  const before = await roadPose(page);
  await page.waitForTimeout(1600);
  expect(await roadPose(page)).toEqual(before);
  mkdirSync('test-results/cow', { recursive: true }); await page.screenshot({ path: 'test-results/cow/impact-stopped.png' });
  // Starting another comparison must reset the old impact and complete normally.
  await open(page, 'main-beam'); await tap(page, 'Main beam');
  await expect(page.locator('#a11y [role=status]')).toContainText('stopped before', { timeout: 20000 });
  const safe = await vars(page); expect(safe.collided).toBe(false); expect(safe.currentKmh).toBe(0);
  const safePose = await roadPose(page); await page.waitForTimeout(1200); expect(await roadPose(page)).toEqual(safePose);
  expect(errors).toEqual([]);
});

test('reduced motion and sensitive preview stop without shake', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors = await boot(page);
  await expect.poll(() => page.evaluate(() => window.__srwGame?.scene.isActive('Title'))).toBe(true);
  await open(page, 'headlights'); await tap(page, '120');
  await expect(page.locator('#a11y [role=status]')).toContainText('car stopped', { timeout: 20000 });
  expect((await vars(page)).currentKmh).toBe(0);
  expect(await page.evaluate(() => window.__srwGame.scene.getScene('LabRunner').cameras.main.shakeEffect.isRunning)).toBe(false);
  const before = await roadPose(page); await page.waitForTimeout(1000); expect(await roadPose(page)).toEqual(before);
  // Respect the existing opt-out without changing the scene's content flow.
  await page.evaluate(() => { window.__srwGame.scene.getScene('LabRunner').ctx.skipSensitive = true; });
  await tap(page, '80');
  await expect(page.locator('#a11y [role=status]')).toContainText('preview pauses before contact', { timeout: 15000 });
  expect((await vars(page)).collided).toBe(false); expect((await vars(page)).currentKmh).toBe(0);
  expect(errors).toEqual([]);
});
