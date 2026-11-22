import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { boot, tap as tapNow, control, heading as headingNow } from './helpers.js';

const shots = 'test-results/journey';
// The drive is full-screen software-rendered in CI, so give it time.
test.setTimeout(600000);
const SLOW = { timeout: 120000 };
/** Wait patiently for a control before activating it (software rendering can be slow). */
const tap = async (page, name) => { await expect(control(page, name)).toBeAttached(SLOW); await tapNow(page, name); };
const heading = page => ({ toHaveText: (t, o) => expect(headingNow(page)).toHaveText(t, o || SLOW) });
const scene = page => page.evaluate(() => {
  const s = window.__srwGame.scene.getScene('JourneyDrive');
  return s && s.sim ? { s: s.sim.st.s, kmh: s.sim.st.v * 3.6, ended: s.ended, started: s.started } : null;
});
/** Start a leg from whatever scene is running (its own plugin queues the switch, restarts included). */
const startDrive = (page, leg) => page.evaluate(l => { window.__srwGame.scene.getScenes(true)[0].scene.start('JourneyDrive', { leg: l }); }, leg);
/** Move the car to `metres` before the end of the leg and let the careful autopilot finish it. */
const autoFinish = (page, metres) => page.evaluate(m => {
  const s = window.__srwGame.scene.getScene('JourneyDrive');
  s.sim.st.s = s.leg.length - m; s.sim.st.v = 16; s.auto = true;
}, metres);

test('map to the first leg: pre-trip check, HUD, driving and arrival', async ({ page }) => {
  mkdirSync(shots, { recursive: true });
  const errors = await boot(page);
  await tap(page, 'Start Journey');
  await tap(page, 'B1 Highway');
  // The bottom card fades in; a tap before it is visible is ignored.
  await page.waitForFunction(() => { const m = window.__srwGame.scene.getScene('Map'); return m.card && m.card.alpha === 1; }, null, SLOW);
  await tap(page, 'Hit the road');
  await heading(page).toHaveText('The Journey Home');
  await page.screenshot({ path: shots + '/hub.png' });

  await tap(page, 'Start the journey');
  await heading(page).toHaveText('Before you leave');
  // The checklist fades in too; a tap before it is visible is ignored.
  await page.waitForFunction(() => { const j = window.__srwGame.scene.getScene('Journey'); return j.overlay && j.overlay.alpha === 1; }, null, SLOW);
  for (const c of ['Check tyre pressure', 'Test headlights', 'Everyone buckled', 'Phone on Do Not Disturb']) {
    await tap(page, new RegExp('^\u2610  ' + c));
    await expect(control(page, new RegExp('^\u2611  ' + c))).toBeAttached(SLOW);
  }
  await page.screenshot({ path: shots + '/pretrip.png' });
  await tap(page, 'Leave now');
  await heading(page).toHaveText('Windhoek → Okahandja');
  await tap(page, 'Drive');

  // The mirrored pedals feed the simulation (each press holds the pedal briefly).
  await tap(page, 'Accelerate');
  expect(await page.evaluate(() => window.__srwGame.scene.getScene('JourneyDrive').readInput().throttle)).toBe(1);
  await expect.poll(async () => (await scene(page)).kmh, SLOW).toBeGreaterThan(0);
  await page.evaluate(() => { window.__srwGame.scene.getScene('JourneyDrive').sim.st.v = 14; });
  await page.screenshot({ path: shots + '/leg1-drive.png' });
  const hud = await page.evaluate(() => window.__srwGame.scene.getScene('JourneyDrive').chips.map(c => c.text));
  expect(hud[1]).toBeTruthy();
  expect(hud[3]).toBe('1/9');   // the pre-trip stamp

  await autoFinish(page, 12);
  await heading(page).toHaveText('Welcome to Okahandja');
  await page.screenshot({ path: shots + '/leg1-arrive.png' });
  await tap(page, 'Continue the journey');
  await heading(page).toHaveText('The Journey Home');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('srw.journey.v1')));
  expect(saved.run.leg).toBe(1);
  expect(Object.keys(saved.stamps)).toEqual(expect.arrayContaining(['pretrip', 'leg1']));

  // The scene object is reused: the second leg must still end with its own arrival card.
  await tap(page, 'Drive leg 2: to Otjiwarongo');
  await heading(page).toHaveText('Okahandja → Otjiwarongo');
  await tap(page, 'Drive');
  await autoFinish(page, 12);
  await heading(page).toHaveText('Welcome to Otjiwarongo');
  expect(errors).toEqual([]);
});

test('each leg renders its time of day, and a crash stops the leg', async ({ page }) => {
  mkdirSync(shots, { recursive: true });
  const errors = await boot(page);
  await page.waitForFunction(() => window.__srwGame?.scene.isActive('Title'));
  await page.evaluate(() => localStorage.setItem('srw.journey.v1', JSON.stringify({
    stamps: {}, run: { leg: 1, fatigue: 60, vehicle: 100, checks: { tyres: true, lights: true, belts: true, phone: false }, scores: [90], complete: false }
  })));
  for (const leg of [1, 2, 3]) {
    await startDrive(page, leg);
    await tap(page, 'Drive');
    await page.evaluate(p => { const s = window.__srwGame.scene.getScene('JourneyDrive'); s.sim.st.s = p; s.sim.st.v = 25; }, [2700, 1700, 1000][leg - 1]);
    await page.waitForTimeout(700);
    await page.screenshot({ path: shots + '/leg' + (leg + 1) + '-drive.png' });
  }
  // Floor it into the stopped taxi on leg 1.
  await startDrive(page, 0);
  await tap(page, 'Drive');
  // Put the car close behind the taxi as it stops in the lane, flat out.
  await page.evaluate(() => {
    const s = window.__srwGame.scene.getScene('JourneyDrive'), taxi = s.sim.ents.leads[0];
    Object.assign(taxi, { active: true, s: taxi.stopAt, v: 0, phase: 'waiting', wait: 60, stopped: true });
    s.sim.st.s = taxi.stopAt - 12; s.sim.st.v = 20;
    s.readInput = () => ({ throttle: 1, brake: 0, steer: 0 });
  });
  await heading(page).toHaveText('Crash: the journey stops here', { timeout: 300000 });
  await page.screenshot({ path: shots + '/crash.png' });
  await tap(page, 'Try this leg again');
  await heading(page).toHaveText('Windhoek → Okahandja');
  expect(errors).toEqual([]);
});
