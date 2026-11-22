import { describe, it, expect } from 'vitest';
import { LEGS, STAMPS, CHECKS } from '../src/journey/route.js';
import { createLegSim, autopilot, gapState, speedingRate, limitAt, nextLimitDrop, legStamps, buildRoadShape, TOWN_BREAK } from '../src/journey/sim.js';
import { createJourneyProgress } from '../src/journey/progress.js';

const ALL_CHECKS = Object.fromEntries(CHECKS.map(c => [c.id, true]));
const DT = 1 / 30;

/** Drive a leg to the end with a driver function; returns the result and every event. */
function drive(leg, carry, driver, maxS = 600) {
  const sim = createLegSim(leg, carry);
  const events = [];
  for (let i = 0; i < maxS / DT && !sim.st.finished && !sim.st.over; i++) events.push(...sim.step(DT, driver(sim)));
  return { sim, r: sim.result(), events };
}

describe('journey rules', () => {
  it('rates the gap to the vehicle ahead in seconds', () => {
    expect(gapState(null)).toBe('clear');
    expect(gapState(3.2)).toBe('safe');
    expect(gapState(2.4)).toBe('close');
    expect(gapState(1.1)).toBe('danger');
  });
  it('only penalises speed beyond a small tolerance, and more the faster you go', () => {
    expect(speedingRate(62, 60)).toBe(0);
    expect(speedingRate(70, 60)).toBeGreaterThan(0);
    expect(speedingRate(100, 60)).toBeGreaterThan(speedingRate(70, 60));
  });
  it('reads limits and warns about the next lower limit ahead', () => {
    const leg = LEGS[0];
    expect(limitAt(leg, 0)).toBe(60);
    expect(limitAt(leg, 2000)).toBe(120);
    expect(nextLimitDrop(leg, 2800)).toEqual({ limit: 60, inM: 100 });
    expect(nextLimitDrop(leg, 100)).toBeNull();
  });
  it('builds a road that bends in the camera frame only inside curves', () => {
    const shape = buildRoadShape(LEGS[0]);
    expect(Math.abs(shape.rel(100, 200))).toBeLessThan(1e-9);
    expect(shape.rel(400, 200)).toBeGreaterThan(5);
  });
  it('has nine stamps, matching the HUD passport', () => {
    expect(STAMPS).toHaveLength(9);
    const legIds = LEGS.map(l => l.id);
    legIds.forEach(id => expect(STAMPS.some(s => s.id === id)).toBe(true));
  });
});

describe('a careful driver', () => {
  it('finishes every leg without a collision and earns the leg stamps', () => {
    let carry = { fatigue: 0, vehicle: 100, checks: ALL_CHECKS };
    const earned = new Set();
    LEGS.forEach(leg => {
      const { r } = drive(leg, carry, autopilot);
      expect(r.finished, leg.id + ' finished').toBe(true);
      expect(r.collisions, leg.id + ' collisions').toBe(0);
      expect(r.safety, leg.id + ' safety').toBeGreaterThanOrEqual(85);
      r.stamps.forEach(s => earned.add(s));
      carry = { fatigue: Math.max(0, r.fatigue - TOWN_BREAK), vehicle: r.vehicle, checks: ALL_CHECKS };
    });
    ['leg1', 'leg2', 'leg3', 'leg4', 'limit', 'gap', 'rested', 'wildlife'].forEach(id => expect(earned.has(id), id).toBe(true));
  });
  it('reports a distance but no time gap when stopped behind a vehicle', () => {
    const sim = createLegSim(LEGS[0], { checks: ALL_CHECKS });
    const taxi = sim.ents.leads[0];
    Object.assign(taxi, { active: true, s: 420, v: 0, phase: 'waiting', wait: 60, stopped: true });
    sim.st.s = 410; sim.st.v = 0;
    sim.step(DT, { throttle: 0, brake: 1, steer: 0 });
    expect(sim.st.gap).toMatchObject({ seconds: null, state: 'safe' });
    expect(sim.st.gap.m).toBeCloseTo(10, 0);
  });
  it('waits behind the taxi when it stops in the lane', () => {
    const { events, r } = drive(LEGS[0], { checks: ALL_CHECKS }, autopilot);
    expect(events.some(e => e.type === 'leadBrake')).toBe(true);
    expect(r.closeS).toBeLessThan(1);
  });
});

describe('a reckless driver', () => {
  const floorIt = () => ({ throttle: 1, brake: 0, steer: 0 });
  it('speeds, tailgates and crashes into the stopped taxi', () => {
    const { r, events } = drive(LEGS[0], { checks: ALL_CHECKS }, floorIt);
    expect(events.some(e => e.type === 'crash' && e.kind === 'rear')).toBe(true);
    expect(r.finished).toBe(false);
    expect(r.over).toMatchObject({ reason: 'crash', kind: 'rear' });
    expect(r.stamps).not.toContain('leg1');
  });
  it('hits the kudu at speed at dusk', () => {
    // Keeps to 115 km/h everywhere, ignoring roadworks and the kudu on the verge.
    const leg = { ...LEGS[1], leads: [] };
    const cruise = sim => ({ throttle: sim.st.v * 3.6 < 115 ? 1 : 0, brake: 0, steer: 0 });
    const { r, events } = drive(leg, { checks: ALL_CHECKS }, cruise);
    expect(events.some(e => e.type === 'speeding')).toBe(true);
    expect(events.some(e => e.type === 'crash' && e.kind === 'kudu' && e.serious)).toBe(true);
    expect(r.animalsHit).toBe(1);
    expect(r.issues[0]).toMatch(/Collisions|Speeding/);
  });
  it('gets drowsy at night without resting: drifting and microsleeps', () => {
    const leg = { ...LEGS[2], animals: [], leads: [], oncoming: 0, rest: null };
    const careful = sim => ({ ...autopilot(sim), steer: 0 });
    const { events, r } = drive(leg, { fatigue: 55, checks: ALL_CHECKS }, careful);
    expect(events.some(e => e.type === 'drift')).toBe(true);
    expect(events.some(e => e.type === 'microsleep')).toBe(true);
    expect(r.penalties.tired).toBeGreaterThan(0);
  });
});

describe('pre-trip checks and distractions', () => {
  it('skipped checks cost safety, vehicle health and bring phone messages', () => {
    const sim = createLegSim(LEGS[0], { vehicle: 85, checks: {} });
    expect(sim.st.safety).toBe(90);
    expect(sim.st.vehicle).toBe(85);
    const events = [];
    const crawl = s => ({ throttle: s.st.v * 3.6 < 30 ? 1 : 0, brake: 0, steer: 0 });
    for (let i = 0; i < 20 / DT && !events.some(e => e.type === 'phone'); i++) events.push(...sim.step(DT, crawl(sim)));
    expect(sim.st.phone).toMatchObject({ from: 'Mum' });
    sim.readPhone();
    expect(sim.st.phone).toBeNull();
    sim.step(DT, { throttle: 0, brake: 1, steer: 0 });
    expect(sim.st.distracted).toBe(true);
    expect(sim.st.braking).toBe(false);
    expect(sim.result().penalties.phone).toBe(8);
  });
  it('a rest stop clears most fatigue and earns the rested stamp when tired', () => {
    const leg = LEGS[2];
    const sim = createLegSim(leg, { fatigue: 45, checks: ALL_CHECKS });
    sim.st.s = leg.rest - 10; sim.st.v = 0;
    sim.step(DT, { throttle: 0, brake: 1, steer: 0 });
    expect(sim.canRest()).toBe(true);
    const r = sim.rest();
    expect(r.after).toBeLessThan(5);
    expect(sim.canRest()).toBe(false);
    expect(legStamps(leg, { ...sim.result(), finished: false })).toContain('rested');
  });
});

describe('journey progress', () => {
  const memory = () => { const m = {}; return { get: k => m[k] ?? null, set: (k, v) => { m[k] = v; } }; };
  it('carries fatigue and vehicle health between legs and keeps stamps', () => {
    const store = memory();
    const p = createJourneyProgress(store);
    p.startRun({ tyres: false, lights: true, belts: true, phone: true });
    expect(p.run().vehicle).toBe(85);
    expect(p.finishLeg(0, { finished: true, fatigue: 30, vehicle: 80, safety: 92, stamps: ['leg1', 'limit'] })).toEqual(['leg1', 'limit']);
    expect(p.run()).toMatchObject({ leg: 1, fatigue: 30 - TOWN_BREAK, vehicle: 80 });
    const again = createJourneyProgress(store);
    expect(again.stampCount()).toBe(2);
    expect(again.run().scores).toEqual([92]);
    LEGS.slice(1).forEach((l, i) => again.finishLeg(i + 1, { finished: true, fatigue: 10, vehicle: 80, safety: 90, stamps: [] }));
    expect(again.run().complete).toBe(true);
    expect(again.best()).toBe(Math.round((92 + 90 * 3) / 4));
  });
});
