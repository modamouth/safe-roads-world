// Walks one experience screen by screen and saves screenshots for a visual
// check. Not part of the normal suite: run with EXPLORE=<slug> npx playwright test explore
import { test } from '@playwright/test';
import { boot, tap, toLab, controls, heading } from './helpers.js';

test.skip(!process.env.EXPLORE, 'set EXPLORE=<slug> to run');

test('explore ' + process.env.EXPLORE, async ({ page }) => {
  const out = process.env.SHOTS || 'test-results/shots';
  const errors = await boot(page);
  await toLab(page);
  const label = process.env.EXPLORE_LABEL || process.env.EXPLORE;
  await tap(page, new RegExp('^' + label, 'i'));
  let n = 0;
  const shot = async name => { await page.waitForTimeout(700); await page.screenshot({ path: `${out}/${String(n++).padStart(2, '0')}-${name}.png` }); };
  await shot('intro');
  // Click the most "forward" control on each screen until the topic completes.
  const prefer = [/^Start$/, /^Resume/, /^Continue$/, /^Read the story/, /^Confirm/, /^Check$/, /^Next/, /^See /, /^Try another point/, /^Finish/, /^Drive on/, /^Let's/];
  const tried = {};
  for (let i = 0; i < 120; i++) {
    await page.waitForTimeout(400);
    const h = (await heading(page).textContent().catch(() => '')) || '';
    tried[h] = tried[h] || new Set();
    if (/Well done/.test(h)) { await shot('complete'); break; }
    let cs = await controls(page);
    for (let k = 0; k < 40 && !cs.some(c => !/^(Back|Sound)/.test(c)); k++) { await page.waitForTimeout(250); cs = await controls(page); }
    let pick = null;
    for (const re of prefer) { pick = cs.find(c => re.test(c)); if (pick) break; }
    if (!pick) {
      // A choice screen: pick the first option, or a toggle state, or a hotspot.
      const opts = cs.filter(c => !/^(Back|Sound|Start over|My Passport|Learning Lab|Previous|.*opens in a new tab)/.test(c));
      pick = opts.find(c => !tried[h].has(c)) || opts[0];
    }
    tried[h].add(pick);
    if (!pick) break;
    await shot(h.slice(0, 30).replace(/[^a-z0-9]+/gi, '_'));
    await tap(page, pick);
  }
  if (errors.length) throw new Error('Page errors:\n' + errors.join('\n'));
});
