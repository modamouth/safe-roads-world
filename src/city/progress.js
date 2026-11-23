// ---------------------------------------------------------------------------
// City Safety Run: progress saved on the device (pure, no Phaser).
//
// Shape (JSON in storage under CITY_KEY):
//   stamps  { 'city-safe-driver': timestamp }   awarded once
//   best    best total score (out of 100);  runs  completed runs
//   last    { total, scores: [25, 18, ...] } the most recent completed run
// ---------------------------------------------------------------------------
import { deviceStorage } from '../lab/core/progress.js';
import { CITY_STAMP } from './mission.js';

export const CITY_KEY = 'srw.city.v1';

export function createCityProgress(storage) {
  let data;
  try { data = JSON.parse(storage.get(CITY_KEY) || 'null'); } catch (e) { data = null; }
  if (!data || typeof data !== 'object') data = {};
  data.stamps = data.stamps || {};
  data.best = data.best != null ? data.best : null;
  data.runs = data.runs || 0;
  const save = () => storage.set(CITY_KEY, JSON.stringify(data));
  return {
    has: id => !!data.stamps[id],
    stampCount: () => Object.keys(data.stamps).length,
    best: () => data.best,
    runs: () => data.runs,
    last: () => data.last || null,
    /** Record a completed run; returns the stamps newly earned (each is awarded only once). */
    finishRun(total, scores, safeRun, now) {
      data.runs++;
      data.best = Math.max(data.best || 0, total);
      data.last = { total, scores };
      const fresh = safeRun && !data.stamps[CITY_STAMP.id] ? [CITY_STAMP.id] : [];
      fresh.forEach(id => { data.stamps[id] = now || Date.now(); });
      save();
      return fresh;
    }
  };
}

export const city = createCityProgress(deviceStorage());
