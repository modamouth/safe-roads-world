import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { boot, tap as tapNow, control, heading as headingNow } from './helpers.js';

// Windhoek City · City Safety Run, from the Mission Map to the results and Passport.
const shots = 'test-results/city';
test.setTimeout(600000);
const SLOW = { timeout: 120000 };
const tap = async (page, name) => { await expect(control(page, name)).toBeAttached(SLOW); await tapNow(page, name); };
const heading = page => ({ toHaveText: (t, o) => expect(headingNow(page)).toHaveText(t, o || SLOW) });
/** Wait for the drive scene's card to finish fading in (a tap before that is ignored). */
const cardReady = page => page.waitForFunction(() => { const s = window.__srwGame.scene.getScene('CityRun'); return s && window.__srwGame.scene.isActive('CityRun') && s.overlay && s.overlay.alpha === 1; }, null, SLOW);
/**
 * Run the drive synchronously at 30 frames a second (software rendering is slow),
 * with the careful driver or `mode`: 'floor' holds PETROL at 40 km/h without indicating.
 */
const drive = (page, mode, seconds = 240) => page.evaluate(([mode, seconds]) => {
  const s = window.__srwGame.scene.getScene('CityRun');
  if (mode === 'careful') s.auto = true;
  else s.readInput = () => ({ throttle: s.sim.st.v * 3.6 < 40 ? 1 : 0, brake: 0, steer: 0, signal: null });
  s.game.loop.rawDelta = 1000 / 30;
  let t = s.time.now;
  for (let i = 0; i < seconds * 30 && !s.ended; i++) s.update(t += 1000 / 30, 1000 / 30);
  return { ended: s.ended, results: s.run.results().map(r => r.first), total: s.run.total() };
}, [mode, seconds]);

test('Windhoek City → Play mission → a safe run → results → Passport → back to Map; progress survives a refresh', async ({ page }) => {
  mkdirSync(shots, { recursive: true });
  await page.setViewportSize({ width: 360, height: 740 });
  // keepProgress: the helper would otherwise clear storage again on the refresh below.
  const errors = await boot(page, { keepProgress: true });
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await tap(page, 'Start Journey');
  await tap(page, 'Windhoek City');
  await page.waitForFunction(() => { const m = window.__srwGame.scene.getScene('Map'); return m.card && m.card.alpha === 1; }, null, SLOW);
  await tap(page, 'Play mission');
  await heading(page).toHaveText('City Safety Run');
  await cardReady(page);
  await page.screenshot({ path: shots + '/intro.png' });
  await tap(page, 'Drive');

  const r = await drive(page, 'careful');
  expect(r).toMatchObject({ ended: true, results: [25, 25, 25, 25], total: 100 });
  await heading(page).toHaveText('City Safety Run: 100/100');
  await expect(page.locator('#a11y section')).toContainText('New stamp: City Safe Driver');
  await cardReady(page);
  await page.screenshot({ path: shots + '/results.png' });
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('srw.city.v1')));
  expect(saved).toMatchObject({ best: 100, runs: 1, last: { total: 100, scores: [25, 25, 25, 25] } });
  expect(saved.stamps['city-safe-driver']).toBeTruthy();

  await tap(page, 'Passport');
  await heading(page).toHaveText('Your Passport');
  await expect(control(page, /^City Safety Run: City Safe Driver ✓ {2}· {2}best 100/)).toBeAttached(SLOW);
  await page.screenshot({ path: shots + '/passport.png' });
  await tap(page, 'Mission Map');
  await page.waitForFunction(() => window.__srwGame.scene.isActive('Map'), null, SLOW);

  // Saved progress survives a refresh.
  await page.reload();
  await page.waitForFunction(() => window.__srwGame?.scene.isActive('Title'), null, SLOW);
  const after = await page.evaluate(() => JSON.parse(localStorage.getItem('srw.city.v1')));
  expect(after.best).toBe(100);
  expect(errors).toEqual([]);
});

test('a failed encounter explains what happened, retries from just before it, keeps the first score; replay starts fresh', async ({ page }) => {
  mkdirSync(shots, { recursive: true });
  await page.setViewportSize({ width: 360, height: 740 });
  const errors = await boot(page);
  await page.waitForFunction(() => window.__srwGame?.scene.isActive('Title'), null, SLOW);
  await page.evaluate(() => { window.__srwGame.scene.getScenes(true)[0].scene.start('CityRun'); });
  await cardReady(page);
  await tap(page, 'Drive');
  // Pull straight out in front of the bakkie, without indicating.
  expect((await drive(page, 'floor', 20)).ended).toBe(true);
  await heading(page).toHaveText('Encounter 1: Pull out into traffic');
  await expect(page.locator('#a11y section')).toContainText('the bakkie');
  await cardReady(page);
  await page.screenshot({ path: shots + '/fail.png' });
  await tap(page, 'Retry this encounter');
  await heading(page).toHaveText('Retry: Pull out into traffic');
  await cardReady(page);
  // The retry starts afresh: parked, the bakkie back behind, no indicator, no score yet.
  const fresh = await page.evaluate(() => { const s = window.__srwGame.scene.getScene('CityRun'); return { parked: s.sim.st.parked, s: s.sim.st.s, signal: s.signalOn, bakkie: s.sim.ents.leads[0].s < 0, first: s.run.results()[0].first }; });
  expect(fresh).toEqual({ parked: true, s: 0, signal: false, bakkie: true, first: 0 });
  await tap(page, 'Drive');
  const r = await drive(page, 'careful');
  expect(r).toMatchObject({ ended: true, results: [0, 25, 25, 25], total: 75 });
  await heading(page).toHaveText('City Safety Run: 75/100');
  await expect(page.locator('#a11y section')).toContainText('(retried)');
  await expect(page.locator('#a11y section')).not.toContainText('New stamp');
  // The weakest encounter links to the matching Learning Lab activity.
  await expect(control(page, /^Practise in the Lab/)).toBeAttached(SLOW);
  await tap(page, 'Replay');
  await heading(page).toHaveText('City Safety Run');
  const replay = await page.evaluate(() => window.__srwGame.scene.getScene('CityRun').run.results().map(r => r.first));
  expect(replay).toEqual([null, null, null, null]);
  expect((await page.evaluate(() => JSON.parse(localStorage.getItem('srw.city.v1')))).stamps).toEqual({});
  expect(errors).toEqual([]);
});

test('touch and keyboard: SIGNAL toggles the indicator, the pedals drive', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  const errors = await boot(page);
  await page.waitForFunction(() => window.__srwGame?.scene.isActive('Title'), null, SLOW);
  await page.evaluate(() => { window.__srwGame.scene.getScenes(true)[0].scene.start('CityRun'); });
  await cardReady(page);
  await tap(page, 'Drive');
  const state = () => page.evaluate(() => { const s = window.__srwGame.scene.getScene('CityRun'); return { signal: s.signalOn, input: s.readInput() }; });
  // Touch: tap the SIGNAL button on the canvas.
  const box = await page.locator('canvas').boundingBox();
  const at = await page.evaluate(() => {
    const s = window.__srwGame.scene.getScene('CityRun'), c = s.pedals[s.pedals.length - 1], cam = s.cameras.main, d = s.scale.displayScale;
    return { x: ((c.x - cam.worldView.x) * cam.zoom + cam.x) / d.x, y: ((c.y - cam.worldView.y) * cam.zoom + cam.y) / d.y };
  });
  await page.touchscreen.tap(box.x + at.x, box.y + at.y).catch(() => page.mouse.click(box.x + at.x, box.y + at.y));
  await expect.poll(async () => (await state()).signal, SLOW).toBe(true);
  // Keyboard: E toggles it off; holding the up arrow is PETROL.
  await page.keyboard.press('e');
  await expect.poll(async () => (await state()).signal, SLOW).toBe(false);
  // Phaser reads held keys on its next frame.
  await page.keyboard.down('ArrowUp');
  await expect.poll(async () => (await state()).input, SLOW).toMatchObject({ throttle: 1, brake: 0, signal: null });
  await page.keyboard.up('ArrowUp');
  // The screen-reader mirror of the button works too.
  await tap(page, 'Indicate right');
  expect((await state()).signal).toBe(true);
  expect(errors).toEqual([]);
});
