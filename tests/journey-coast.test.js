import { describe, it, expect } from 'vitest';
import { COAST_LEGS, COAST_STAMPS } from '../src/journey/coast.js';
import { CHECKS } from '../src/journey/route.js';
import { ROUTES, routeById } from '../src/journey/routes.js';
import { createLegSim, autopilot, visibilityAt, safeSpeedFor, TOWN_BREAK, ROAD } from '../src/journey/sim.js';
import { createJourneyProgress } from '../src/journey/progress.js';

const ALL_CHECKS = Object.fromEntries(CHECKS.map(c => [c.id, true]));
const DT = 1 / 30;
const [, arandis, ocean] = COAST_LEGS;
const hold = kmh => sim => ({ throttle: sim.st.v * 3.6 < kmh ? 1 : 0, brake: 0, steer: 0 });
/** Drive from `s` at `kmh` until `untilS`, the leg ends, or two minutes pass. */
function run(leg, s, kmh, driver, untilS) {
  const sim = createLegSim(leg, { checks: ALL_CHECKS }), events = [];
  sim.st.s = s; sim.st.v = kmh / 3.6;
  while (sim.st.s < untilS && !sim.st.over && !sim.st.finished && sim.st.t < 120) events.push(...sim.step(DT, driver(sim)));
  return { sim, events, types: events.map(e => e.type) };
}

describe('Journey to the Ocean', () => {
  it('is its own route: three legs to Swakopmund, nine stamps, saved separately from the Journey Home', () => {
    expect(routeById('b2')).toBe(ROUTES.b2);
    expect(routeById('nope')).toBe(ROUTES.b1);
    expect(COAST_LEGS.map(l => l.to)).toEqual(['Karibib', 'Arandis', 'Swakopmund']);
    expect(COAST_STAMPS).toHaveLength(9);
    expect(ROUTES.b2.key).not.toBe(ROUTES.b1.key);
    const store = new Map(), storage = { get: k => store.get(k) || null, set: (k, v) => store.set(k, v) };
    const home = createJourneyProgress(storage, ROUTES.b1), coast = createJourneyProgress(storage, ROUTES.b2);
    coast.startRun(ALL_CHECKS);
    expect(coast.addStamps(['fog', 'rested'])).toEqual(['fog']);   // 'rested' is not a coast stamp
    expect(home.has('pretrip')).toBe(false);
    expect(coast.has('pretrip')).toBe(true);
  });
  it('a careful driver reaches the ocean with no collisions and earns the fog and dust stamps', () => {
    let carry = { fatigue: 0, vehicle: 100, checks: ALL_CHECKS };
    const earned = new Set();
    COAST_LEGS.forEach(leg => {
      const sim = createLegSim(leg, carry);
      for (let i = 0; i < 700 / DT && !sim.st.finished && !sim.st.over; i++) sim.step(DT, autopilot(sim));
      const r = sim.result();
      expect(r.finished, leg.id).toBe(true);
      expect(r.collisions, leg.id).toBe(0);
      expect(r.safety, leg.id).toBeGreaterThanOrEqual(85);
      r.stamps.forEach(s => earned.add(s));
      carry = { fatigue: Math.max(0, r.fatigue - TOWN_BREAK), vehicle: r.vehicle, checks: ALL_CHECKS };
    });
    ['karibib', 'arandis', 'ocean', 'fog', 'dust'].forEach(id => expect(earned.has(id), id).toBe(true));
  });
});

describe('fog and dust', () => {
  it('thicken gradually, and the safe speed is the one you can stop in', () => {
    expect(visibilityAt(ocean, 500)).toBeNull();
    expect(visibilityAt(ocean, 1100).m).toBeGreaterThan(100);
    expect(visibilityAt(ocean, 1800)).toEqual({ m: 55, kind: 'fog' });
    expect(visibilityAt(arandis, 2700).kind).toBe('dust');
    const kmh = safeSpeedFor(55, 6.5), v = kmh / 3.6;
    expect(v * 1.5 + v * v / (2 * 6.5)).toBeCloseTo(55, 5);
    expect(safeSpeedFor(30, 6.5)).toBeLessThan(kmh);
  });
  it('fog: too fast costs points, and you find the car without lights too late', () => {
    const { types, events, sim } = run(ocean, 1300, 110, hold(110), 2700);
    expect(types).toContain('lowVis');
    expect(types).toContain('tooFastVis');
    expect(sim.log.penalties.visibility).toBeGreaterThan(0);
    expect(events).toContainEqual(expect.objectContaining({ type: 'crash', kind: 'rear' }));
  });
  it('fog: at the safe speed you see the car in time and follow it', () => {
    const careful = sim => {
      const lead = sim.ents.leads[0], d = lead.s - sim.st.s, see = sim.st.see ? sim.st.see.m : 400;
      const target = d > 0 && d < see ? Math.min(lead.v * 3.6 - 3, 60) : 60;
      return { throttle: sim.st.v * 3.6 < target ? 1 : 0, brake: sim.st.v * 3.6 > target + 4 ? 1 : 0, steer: 0 };
    };
    const { sim, events } = run(ocean, 1300, 60, careful, 2550);
    expect(events.some(e => e.type === 'crash')).toBe(false);
    expect(sim.log.fogFastS).toBeLessThan(2);
  });
  it('dust: gusts push the car across the road, more at speed', () => {
    const drift = kmh => {
      const { sim, types } = run({ ...arandis, sand: [] }, 2400, kmh, hold(kmh), 3000);
      return { gusts: types.filter(t => t === 'gust').length, laneS: sim.log.laneS, runoffs: sim.log.runoffs };
    };
    const fast = drift(115), slow = drift(55);
    expect(fast.gusts).toBeGreaterThan(2);
    expect(fast.laneS + fast.runoffs * 10).toBeGreaterThan(slow.laneS + slow.runoffs * 10);
  });
  it('sand drifts: over 60 km/h the car slides, slower it just drags', () => {
    const noWind = { ...arandis, dust: [] };
    const fast = run(noWind, 2400, 90, hold(90), 3150);
    expect(fast.types).toContain('skid');
    expect(fast.sim.log.penalties.sand).toBeGreaterThan(0);
    const slow = run(noWind, 2400, 50, sim => ({ ...hold(50)(sim), steer: Math.abs(ROAD.LANE - sim.st.x) > 0.1 ? Math.sign(ROAD.LANE - sim.st.x) : 0 }), 3150);
    expect(slow.types).not.toContain('skid');
  });
});
