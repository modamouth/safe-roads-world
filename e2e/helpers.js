// Helpers for driving the canvas game through its accessibility mirror.
import { expect } from '@playwright/test';

const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Load the game with saved progress cleared, and fail the test on page errors. */
export async function boot(page, opts = {}) {
  const errors = [];
  page.on('pageerror', e => { errors.push(String(e)); if (process.env.DEBUG) console.log('PAGEERROR', e.stack || e); });
  page.on('console', m => { if (m.type() === 'error' && !/Failed to process file|Failed to load resource/.test(m.text())) errors.push(m.text()); });
  if (!opts.keepProgress) await page.addInitScript(() => { try { localStorage.clear(); } catch (e) { /* private mode */ } });
  await page.goto('/' + (opts.query || ''));
  await expect(page.locator('#a11y')).toBeAttached({ timeout: 30000 });
  return errors;
}

/** The visible mirrored control whose text starts with `name` (or matches a RegExp). */
export function control(page, name) {
  const re = name instanceof RegExp ? name : new RegExp('^' + esc(name));
  return page.locator('#a11y button:not([hidden]):not([disabled]), #a11y a:not([hidden])').filter({ hasText: re }).first();
}

/** Activate a control as a keyboard or screen-reader user would. */
export async function tap(page, name) {
  const c = control(page, name);
  await expect(c).toBeAttached();
  await c.dispatchEvent('click');
}

/** Heading of the current screen description. */
export const heading = page => page.locator('#a11y section h1');

/** Current visible control labels (for debugging). */
export const controls = page => page.locator('#a11y button:not([hidden]):not([disabled]), #a11y a:not([hidden])').allTextContents();

/** From the title screen into the Learning Lab menu. */
export async function toLab(page) {
  await tap(page, 'Start Journey');
  await tap(page, 'Lab');
  await expect(heading(page)).toHaveText('Road Safety Learning Lab');
}
