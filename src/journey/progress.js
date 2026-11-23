// ---------------------------------------------------------------------------
// Journey progress saved on the device (pure, no Phaser), one record per route.
//
// Shape (JSON in storage under the route's key; the Journey Home uses JOURNEY_KEY):
//   stamps  { pretrip: timestamp, leg1: timestamp, limit: timestamp, ... }
//   run     the journey in progress: { leg, fatigue, vehicle, checks, scores, complete }
//           `leg` is the next leg to drive; fatigue and vehicle carry between legs
//   best    best average safety score over a whole journey
// ---------------------------------------------------------------------------
import { TOWN_BREAK } from './sim.js';
import { ROUTES, routeById } from './routes.js';
import { deviceStorage } from '../lab/core/progress.js';

export const JOURNEY_KEY = 'srw.journey.v1';

export function createJourneyProgress(storage, route = ROUTES.b1) {
  const { key, legs, checks: CHECKS, stamps: STAMPS } = route;
  let data;
  try { data = JSON.parse(storage.get(key) || 'null'); } catch (e) { data = null; }
  if (!data || typeof data !== 'object') data = {};
  data.stamps = data.stamps || {};
  data.run = data.run || null;
  data.best = data.best != null ? data.best : null;
  const save = () => storage.set(key, JSON.stringify(data));

  const api = {
    stamps: () => Object.assign({}, data.stamps),
    has: id => !!data.stamps[id],
    stampCount: () => Object.keys(data.stamps).length,
    /** Stamp each id not stamped yet; returns the newly earned ones. */
    addStamps(ids, now) {
      const fresh = ids.filter(id => !data.stamps[id] && STAMPS.some(s => s.id === id));
      fresh.forEach(id => { data.stamps[id] = now || Date.now(); });
      if (fresh.length) save();
      return fresh;
    },
    run: () => data.run,
    /** Start the journey from Windhoek after the pre-trip checks. Returns new stamps. */
    startRun(checks) {
      data.run = { leg: 0, fatigue: 0, vehicle: checks.tyres ? 100 : 85, checks: { ...checks }, scores: [], complete: false };
      save();
      return CHECKS.every(c => checks[c.id]) ? api.addStamps(['pretrip']) : [];
    },
    /** Record a leg result; a finished leg moves the journey on. Returns new stamps. */
    finishLeg(index, result) {
      const run = data.run;
      if (run && result.finished && index === run.leg) {
        run.scores[index] = result.safety;
        run.leg = index + 1;
        run.fatigue = Math.max(0, result.fatigue - TOWN_BREAK);
        run.vehicle = result.vehicle;
        if (run.leg >= legs.length) {
          run.complete = true;
          const avg = Math.round(run.scores.reduce((a, b) => a + b, 0) / run.scores.length);
          data.best = Math.max(data.best || 0, avg);
        }
      }
      save();
      return api.addStamps(result.stamps || []);
    },
    best: () => data.best,
    clearRun() { data.run = null; save(); }
  };
  return api;
}

const saved = {};
/** Saved progress for a route (one shared instance per route). */
export const journeyFor = id => (saved[routeById(id).id] = saved[routeById(id).id] || createJourneyProgress(deviceStorage(), routeById(id)));
export const journey = journeyFor('b1');
