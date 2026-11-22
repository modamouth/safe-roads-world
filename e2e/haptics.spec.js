import { test, expect } from '@playwright/test';
import { boot, tap } from './helpers.js';
import { readFileSync, mkdirSync } from 'node:fs';
const exp = JSON.parse(readFileSync('content/learning-lab/speed/en.json'));
const topic = exp.topics.find(t => t.scenes.some(s => s.art?.kind === 'crash-lab'));
const at = topic.scenes.findIndex(s => s.art?.kind === 'crash-lab');
const cowTopic = exp.topics.find(t => t.scenes.some(s => s.id === 'headlights'));
const positive = page => page.evaluate(() => window.__vibrations.filter(v => v !== 0));
async function mockVibration(page, supported = true) {
  await page.addInitScript(supported => {
    window.__vibrations = [];
    Object.defineProperty(Navigator.prototype, 'vibrate', { configurable: true, value: supported ? pattern => { window.__vibrations.push(pattern); return true; } : undefined });
  }, supported);
}
async function title(page) {
  await expect.poll(() => page.evaluate(() => window.__srwGame?.scene.isActive('Title'))).toBe(true);
}
async function barrier(page) {
  await page.evaluate(d => { window.__srwGame.scene.stop('Title'); window.__srwGame.scene.start('LabRunner', d); }, { slug: 'speed', topic: topic.id, at, screen: 'scene' });
  await page.waitForFunction(() => window.__srwGame.scene.getScene('LabRunner').arts.length > 0);
}

test('supported device requests one heavy pulse per barrier crash and locks replay controls briefly', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await mockVibration(page); const errors = await boot(page); await title(page);
  await page.touchscreen.tap(2, 2); await barrier(page);
  await expect.poll(async () => (await positive(page)).length).toBe(1);
  expect((await positive(page))[0]).toEqual([250, 80, 350, 100, 450]);
  await expect.poll(() => page.evaluate(() => {
    const controls = [...document.querySelectorAll('#a11y button')];
    return controls.filter(b => /^(80|100|120)/.test(b.textContent)).every(b => b.disabled);
  })).toBe(true);
  await page.waitForTimeout(1700); expect(await positive(page)).toHaveLength(1);
  // Restarting the lesson cancels active feedback and permits one new crash.
  await page.evaluate(d => { window.__srwGame.scene.getScene('LabRunner').scene.restart(d); }, { slug: 'speed', topic: topic.id, at, screen: 'scene' });
  await expect.poll(async () => (await positive(page)).length).toBe(2);
  await page.evaluate(() => { window.__srwGame.scene.getScene('LabRunner').scene.pause(); });
  await expect.poll(() => page.evaluate(() => window.__vibrations.at(-1))).toBe(0);
  await page.evaluate(() => { const s = window.__srwGame.scene.getScene('LabRunner'); s.scene.resume(); s.go('Title'); });
  expect(await page.evaluate(() => window.__vibrations.at(-1))).toBe(0);
  await title(page); await page.waitForTimeout(1500); expect(await positive(page)).toHaveLength(2);
  expect(errors).toEqual([]);
});

test('setting defaults on, is accessible, pauses gameplay, persists off, and disables feedback', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await mockVibration(page); const errors = await boot(page, { keepProgress: true }); await title(page);
  await tap(page, 'Sound & feedback settings');
  const checkbox = page.getByLabel('Vibration / Haptics', { exact: true });
  await expect(checkbox).toBeChecked();
  await expect.poll(() => page.evaluate(() => window.__srwGame.scene.isPaused('Title'))).toBe(true);
  mkdirSync('test-results/haptics', { recursive: true }); await page.screenshot({ path: 'test-results/haptics/settings.png' });
  await checkbox.uncheck();
  expect(await page.evaluate(() => localStorage.getItem('safeRoadsWorld.settings.haptics'))).toBe('false');
  await page.getByRole('button', { name: 'Done', exact: true }).click(); await title(page);
  await page.reload(); await title(page);
  await tap(page, 'Sound & feedback settings'); await expect(page.getByLabel('Vibration / Haptics')).not.toBeChecked();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.touchscreen.tap(2, 2); await barrier(page); await page.waitForTimeout(1200);
  expect(await positive(page)).toEqual([]); expect(errors).toEqual([]);
});

test('unsupported browser retains damage visuals without a haptics control or vibration', async ({ page }) => {
  await mockVibration(page, false); const errors = await boot(page); await title(page);
  await expect(page.getByRole('button', { name: 'Sound & feedback settings' })).toHaveCount(0);
  await page.touchscreen.tap(2, 2); await barrier(page);
  await expect(page.locator('#a11y [role=status]')).toContainText('80', { timeout: 15000 });
  const damage = await page.evaluate(() => {
    let found = false; const visit = o => { if (o.type === 'Image' && o.texture.key === 'img_labcar60' && o.alpha > 0) found = true; if (o.type === 'Container') o.list.forEach(visit); };
    visit(window.__srwGame.scene.getScene('LabRunner').layer); return found;
  });
  expect(damage).toBe(true); expect(await positive(page)).toEqual([]); expect(errors).toEqual([]);
});

test('crash replays use light, medium and heavy speed thresholds; pause and scene exit cancel', async ({ page }) => {
  await mockVibration(page); const errors = await boot(page); await title(page);
  await barrier(page); // No trusted input: automatic replay must remain silent.
  await expect(page.locator('#a11y [role=status]')).toContainText('80');
  expect(await positive(page)).toEqual([]);
  await page.touchscreen.tap(2, 2);
  for (const [kmh, pattern] of [[39, 80], [40, [120, 60, 160]], [70, [250, 80, 350, 100, 450]]]) {
    await page.waitForTimeout(1050);
    await page.evaluate(kmh => window.__srwGame.scene.getScene('LabRunner').arts[0].setState({ kmh, level: 'light' }), kmh);
    expect((await positive(page)).at(-1)).toEqual(pattern);
  }
  expect(await positive(page)).toHaveLength(3);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  expect(await page.evaluate(() => window.__vibrations.at(-1))).toBe(0);
  await page.evaluate(() => { const s = window.__srwGame.scene.getScene('LabRunner'); s.scene.stop(); window.__srwGame.scene.start('Title'); });
  expect(await page.evaluate(() => window.__vibrations.at(-1))).toBe(0); expect(errors).toEqual([]);
});

test('cow contact uses residual speed, emits once, and sensitive previews never vibrate', async ({ page }) => {
  await mockVibration(page); const errors = await boot(page); await title(page); await page.touchscreen.tap(2, 2);
  await page.evaluate(d => { window.__srwGame.scene.stop('Title'); window.__srwGame.scene.start('LabRunner', d); }, { slug: 'speed', topic: cowTopic.id, at: cowTopic.scenes.findIndex(s => s.id === 'headlights'), screen: 'scene' });
  await page.waitForFunction(() => window.__srwGame.scene.getScene('LabRunner').arts.length > 0);
  await page.waitForTimeout(1200);
  await page.evaluate(() => { window.__vibrations = []; });
  await tap(page, '120');
  await expect.poll(async () => (await positive(page)).length).toBe(1);
  const result = await page.evaluate(() => window.__srwGame.scene.getScene('LabRunner').ctx.vars);
  expect(result.collided).toBe(true); expect(result.currentKmh).toBe(0);
  expect((await positive(page))[0]).toEqual(result.hitKmh < 40 ? 80 : result.hitKmh < 70 ? [120, 60, 160] : [250, 80, 350, 100, 450]);
  await page.waitForTimeout(1200); expect(await positive(page)).toHaveLength(1);
  await page.evaluate(() => { window.__vibrations = []; window.__srwGame.scene.getScene('LabRunner').ctx.skipSensitive = true; });
  await tap(page, '80'); await page.waitForTimeout(1200); expect(await positive(page)).toEqual([]); expect(errors).toEqual([]);
});

test('head-on contact emits once; braking safely and sensitive previews remain silent', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await mockVibration(page); const errors = await boot(page); await title(page); await page.touchscreen.tap(2, 2);
  const kuduAt = cowTopic.scenes.findIndex(s => s.id === 'kudu');
  const open = async () => {
    await page.evaluate(d => { window.__srwGame.scene.stop('Title'); window.__srwGame.scene.start('LabRunner', d); }, { slug: 'speed', topic: cowTopic.id, at: kuduAt, screen: 'scene' });
    await page.waitForFunction(() => window.__srwGame.scene.getScene('LabRunner').arts.length > 0);
  };
  await open(); await tap(page, 'Swerve to miss it'); await tap(page, 'Confirm');
  await expect.poll(async () => (await positive(page)).length).toBe(1);
  expect((await positive(page))[0]).toEqual([250, 80, 350, 100, 450]);
  await page.waitForTimeout(1700); expect(await positive(page)).toHaveLength(1);
  await open(); await page.evaluate(() => { window.__vibrations = []; });
  await tap(page, 'Brake firmly'); await tap(page, 'Confirm');
  await expect(page.locator('#a11y [role=status]')).toContainText('Braking hard', { timeout: 20000 });
  expect(await positive(page)).toEqual([]);
  await open(); await page.evaluate(() => { window.__srwGame.scene.getScene('LabRunner').ctx.skipSensitive = true; });
  await tap(page, 'Swerve to miss it'); await tap(page, 'Confirm');
  await expect(page.locator('#a11y [role=status]')).toContainText('Swerving', { timeout: 20000 });
  expect(await positive(page)).toEqual([]); expect(errors).toEqual([]);
});

test('leaving while settings are open removes the dialog and restores scene input', async ({ page }) => {
  await mockVibration(page); const errors = await boot(page); await title(page);
  await tap(page, 'Sound & feedback settings');
  await expect.poll(() => page.evaluate(() => window.__srwGame.scene.isPaused('Title'))).toBe(true);
  await page.evaluate(() => { window.__srwGame.scene.stop('Title'); window.__srwGame.scene.start('LabMenu'); });
  await expect(page.locator('#feedback-settings')).toHaveCount(0);
  await page.evaluate(() => { window.__srwGame.scene.stop('LabMenu'); window.__srwGame.scene.start('Title'); }); await title(page);
  expect(await page.evaluate(() => window.__srwGame.scene.getScene('Title').input.enabled)).toBe(true);
  expect(errors).toEqual([]);
});
