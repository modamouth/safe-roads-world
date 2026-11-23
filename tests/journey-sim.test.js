import { describe, it, expect } from 'vitest';
import { LEGS, STAMPS, CHECKS } from '../src/journey/route.js';
import { createLegSim, autopilot, gapState, speedingRate, limitAt, nextLimitDrop, legStamps, buildRoadShape, warthogSpots, TOWN_BREAK } from '../src/journey/sim.js';
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
    expect(limitAt(leg, 1500)).toBe(120);
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
    // 'rested' depends on how tired you are at a rest area; it has its own test below.
    ['leg1', 'leg2', 'leg3', 'leg4', 'limit', 'gap', 'wildlife'].forEach(id => expect(earned.has(id), id).toBe(true));
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
  it('stops for every pedestrian on a zebra crossing', () => {
    let carry = { fatigue: 0, vehicle: 100, checks: ALL_CHECKS };
    LEGS.forEach(leg => {
      const { r } = drive(leg, carry, autopilot);
      expect(r.yielded, leg.id + ' yielded').toBe(leg.crossings.length);
      expect(r.noYield, leg.id + ' noYield').toBe(0);
      carry = { fatigue: Math.max(0, r.fatigue - TOWN_BREAK), vehicle: r.vehicle, checks: ALL_CHECKS };
    });
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
    const leg = { ...LEGS[1], leads: [], warthogs: null };
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

describe('pedestrian crossings', () => {
  // Hold a steady town speed and never brake for anyone.
  const cruise = kmh => sim => ({ throttle: sim.st.v * 3.6 < kmh ? 1 : 0, brake: 0, steer: 0 });
  /** Leg 1 up to just past its first crossing (Windhoek, at 260 m). */
  const toFirstCrossing = driver => {
    const sim = createLegSim(LEGS[0], { checks: ALL_CHECKS }), events = [];
    while (sim.st.s < 275 && !sim.st.over && sim.st.t < 120) events.push(...sim.step(DT, driver(sim)));
    return { sim, events };
  };

  it('has crossings only inside 60 km/h town zones, with art for each person', () => {
    LEGS.forEach(leg => leg.crossings.forEach(p => {
      expect(limitAt(leg, p.at), leg.id + ' ' + p.at).toBe(60);
      expect(['older-man', 'schoolgirl', 'shopper', 'teen-phone', 'vendor', 'worker']).toContain(p.who);
    }));
  });
  it('a driver who keeps going hits the person or drives over the crossing with them on it', () => {
    const { sim, events } = toFirstCrossing(cruise(60));
    expect(events.some(e => e.type === 'pedestrian')).toBe(true);
    const hit = events.some(e => e.type === 'crash' && e.kind === 'pedestrian');
    expect(hit || sim.log.noYield === 1).toBe(true);
    if (!hit) expect(sim.result().issues.join(' ')).toMatch(/crossing/);
  });
  it('hitting a pedestrian at town speed ends the leg', () => {
    const sim = createLegSim(LEGS[0], { checks: ALL_CHECKS });
    const p = sim.ents.crossings[0];
    Object.assign(p, { state: 'crossing', x: -1.8 });
    sim.st.s = 255; sim.st.v = 50 / 3.6;
    const events = [];
    for (let i = 0; i < 30 && !sim.st.over; i++) events.push(...sim.step(DT, { throttle: 1, brake: 0, steer: 0 }));
    expect(events).toContainEqual(expect.objectContaining({ type: 'crash', kind: 'pedestrian', serious: true }));
    expect(sim.st.over).toMatchObject({ reason: 'crash', kind: 'pedestrian' });
  });
  it('oncoming traffic waits while someone is on the crossing', () => {
    const sim = createLegSim(LEGS[0], { checks: ALL_CHECKS });
    Object.assign(sim.ents.crossings[0], { state: 'crossing', x: 1.8, speed: 0 });
    sim.ents.oncoming.push({ s: 270, v: 20, x: 1.8, key: 'veh_bakkie' });
    sim.st.s = 100;
    for (let i = 0; i < 60; i++) sim.step(DT, { throttle: 0, brake: 1, steer: 0 });
    expect(sim.ents.oncoming[0].s).toBe(270);
  });
});

describe('leg 1: taxis, people on the road edge and Stop/Go roadworks', () => {
  const leg = LEGS[0];
  const kmhOf = sim => sim.st.v * 3.6;
  // Hold a speed and never brake; optionally keep `x` across the road.
  const hold = (kmh, x) => sim => ({
    throttle: kmhOf(sim) < kmh ? 1 : 0, brake: 0,
    steer: x == null || Math.abs(x - sim.st.x) < 0.1 ? 0 : Math.sign(x - sim.st.x) * 0.5
  });
  /** Start at `s` metres doing `kmh`, and drive until `untilS` (or the leg ends). */
  function from(s, kmh, driver, untilS) {
    const sim = createLegSim(leg, { checks: ALL_CHECKS }), events = [];
    sim.st.s = s; sim.st.v = kmh / 3.6;
    while (sim.st.s < untilS && !sim.st.over && sim.st.t < 120) events.push(...sim.step(DT, driver(sim)));
    return { sim, events, types: events.map(e => e.type) };
  }

  it('a careful driver waits at the Stop/Go line, gives walkers space and lets the taxi out', () => {
    const { r, events } = drive(leg, { checks: ALL_CHECKS }, autopilot);
    expect(r.collisions).toBe(0);
    expect(r.waitedAtStop).toBe(true);
    expect(r.ranStop).toBe(0);
    expect(r.walkersPassed).toBe(2);
    expect(r.closePasses).toBe(0);
    ['taxiParked', 'taxiPullOut', 'walker', 'stopGo', 'go'].forEach(t => expect(events.some(e => e.type === t), t).toBe(true));
  });
  it('the parked taxi pulls out in front of a driver who does not slow down', () => {
    const { types, events } = from(800, 80, hold(80), 1100);
    expect(types).toContain('taxiPullOut');
    expect(events).toContainEqual(expect.objectContaining({ type: 'crash', kind: 'taxi' }));
  });
  it('passing a walker fast and close costs points; slowing down or moving over does not', () => {
    const fast = from(1100, 100, hold(100), 1300);
    expect(fast.types).toContain('closePass');
    expect(fast.sim.log.penalties.walker).toBe(8);
    const slow = from(1180, 35, hold(35), 1300);
    expect(slow.types).toContain('walkerPassed');
    const wide = from(1100, 100, hold(100, -1.0), 1300);
    expect(wide.types).toContain('walkerPassed');
    expect(wide.sim.log.closePasses).toBe(0);
  });
  it('driving past the STOP board puts you head-on with the convoy in your lane', () => {
    const { types, events } = from(2000, 60, hold(60), 2300);
    expect(types).toContain('stopGo');
    expect(types).toContain('ranStop');
    expect(events).toContainEqual(expect.objectContaining({ type: 'crash', kind: 'convoy', serious: true }));
  });
});

describe('warthogs', () => {
  it('dash out only on the open road of the daytime legs, away from other hazards, and vary each drive', () => {
    expect(warthogSpots(LEGS[2], 1)).toEqual([]);
    expect(warthogSpots(LEGS[3], 1)).toEqual([]);
    const seen = new Set();
    for (let seed = 1; seed <= 20; seed++) {
      [LEGS[0], LEGS[1]].forEach(leg => warthogSpots(leg, seed).forEach(w => {
        expect(limitAt(leg, w.at), leg.id + ' ' + w.at).toBeGreaterThanOrEqual(80);
        leg.crossings.forEach(c => expect(Math.abs(c.at - w.at)).toBeGreaterThan(120));
        if (leg.stopGo) expect(w.at < leg.stopGo.at - 400 || w.at > leg.stopGo.at + leg.stopGo.length + 100).toBe(true);
      }));
      seen.add(JSON.stringify(warthogSpots(LEGS[1], seed).map(w => w.at)));
    }
    expect(seen.size).toBeGreaterThan(10);
  });

  // A family of three crossing from the right at 1000 m on an otherwise empty road.
  const family = { ...LEGS[1], leads: [], oncoming: 0, crossings: [], warthogs: null, animals: [0, 1, 2].map(i =>
    ({ at: 1000 + i * 1.5, kind: 'warthog', side: 1, tt: 3, behind: i * 3, young: i > 0, group: 3 })) };
  const run = driver => {
    const sim = createLegSim(family, { checks: ALL_CHECKS }), events = [];
    sim.st.s = 700; sim.st.v = 110 / 3.6;
    while (sim.st.s < 1020 && !sim.st.over && sim.st.t < 60) events.push(...sim.step(DT, driver(sim)));
    return { sim, events };
  };
  it('the first one makes it across; a driver who keeps going hits one behind it', () => {
    const { events } = run(sim => ({ throttle: sim.st.v * 3.6 < 110 ? 1 : 0, brake: 0, steer: 0 }));
    expect(events.filter(e => e.type === 'animal')).toEqual([expect.objectContaining({ kind: 'warthog', group: 3 })]);
    expect(events).toContainEqual(expect.objectContaining({ type: 'crash', kind: 'warthog' }));
  });
  it('braking when the first one appears lets the whole family cross', () => {
    let seen = false;
    const { sim, events } = run(sim => {
      seen = seen || sim.ents.animals.some(a => a.state === 'crossing');
      return seen && sim.ents.animals.some(a => a.state === 'crossing') ? { throttle: 0, brake: 1, steer: 0 } : { throttle: 1, brake: 0, steer: 0 };
    });
    expect(events.some(e => e.type === 'crash')).toBe(false);
    expect(sim.log.animalsPassed).toBe(3);
  });
});

