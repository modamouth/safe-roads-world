import { describe, it, expect } from 'vitest';
import { CITY_LEG, CITY_STAMP, ENCOUNTERS, createCityRun, cityDriver, placeAt } from '../src/city/mission.js';
import { createCityProgress, CITY_KEY } from '../src/city/progress.js';
import { createLegSim, limitAt, ROAD } from '../src/journey/sim.js';

const DT = 1 / 30, CHECKS = { tyres: true, lights: true, belts: true, phone: true };
const freshSim = i => placeAt(createLegSim(CITY_LEG, { checks: CHECKS }, { seed: 7 }), i);

/** Drive from just before encounter `from` with `driver(sim)` until a fail, the end, or `maxS`. */
function play(run, from, driver, maxS = 240) {
  const sim = freshSim(from), out = [];
  run.attach(sim, from);
  for (let n = 0; n < maxS / DT && !sim.st.finished; n++) {
    const input = driver(sim), events = sim.step(DT, input);
    const o = run.step(input, events);
    out.push(...o);
    if (o.some(x => x.type === 'fail')) break;
  }
  return { sim, out, fails: out.filter(o => o.type === 'fail'), dones: out.filter(o => o.type === 'done') };
}
// The careful driver, except for `bad` while inside encounter `at`.
const except = (at, bad) => sim => (encounterIndex(sim) === at ? bad(sim) : cityDriver(sim));
const encounterIndex = sim => (sim.st.parked || sim.st.s < 30 ? 0 : sim.st.s < 440 ? 1 : sim.st.s < 950 ? 2 : 3);
const floorIt = kmh => sim => ({ throttle: sim.st.v * 3.6 < kmh ? 1 : 0, brake: 0, steer: 0, signal: 'right' });

describe('City Safety Run', () => {
  it('is a city street: 60 km/h throughout, four encounters in order, roughly two minutes', () => {
    expect(ENCOUNTERS.map(e => e.id)).toEqual(['pullout', 'crossing', 'taxi', 'junction']);
    expect(limitAt(CITY_LEG, 0)).toBe(60);
    expect(limitAt(CITY_LEG, CITY_LEG.length - 1)).toBe(60);
    const { sim } = play(createCityRun(), 0, cityDriver);
    expect(sim.st.finished).toBe(true);
    expect(sim.st.t).toBeGreaterThan(90);
    expect(sim.st.t).toBeLessThan(180);
  });
  it('a careful driver scores 100 and completes every encounter safely first time', () => {
    const run = createCityRun(), { fails, dones } = play(run, 0, cityDriver);
    expect(fails).toEqual([]);
    expect(dones.map(d => d.id)).toEqual(['pullout', 'crossing', 'taxi', 'junction']);
    expect(dones.every(d => d.score === 25 && d.first && d.lines.length >= 2)).toBe(true);
    expect(run.total()).toBe(100);
    expect(run.safeRun()).toBe(true);
    expect(dones[2].lines[0]).toBe('You slowed as soon as the taxi signalled.');
  });

  it('1: pulling out straight away forces the bakkie to brake: a fail', () => {
    const { fails } = play(createCityRun(), 0, except(0, floorIt(40)));
    expect(fails[0]).toMatchObject({ id: 'pullout', reason: 'forcedBrake' });
  });
  it('1: waiting for the bakkie but not indicating loses the signal points', () => {
    const { dones } = play(createCityRun(), 0, except(0, sim => ({ ...cityDriver(sim), signal: null })));
    expect(dones[0]).toMatchObject({ id: 'pullout', score: 15 });
    expect(dones[0].lines[0]).toMatch(/without indicating/);
  });
  it('2: driving over the crossing while she is on it is a fail', () => {
    const { fails } = play(createCityRun(), 1, except(1, floorIt(45)));
    expect(fails[0].id).toBe('crossing');
    expect(['noYield', 'crash']).toContain(fails[0].reason);
  });
  it('3: tailgating the taxi and not slowing when it signals ends in a crash: a fail', () => {
    const { fails } = play(createCityRun(), 2, except(2, floorIt(50)));
    expect(fails[0]).toMatchObject({ id: 'taxi', reason: 'crash' });
  });
  it('4: running the red light is a fail', () => {
    const { fails } = play(createCityRun(), 3, except(3, floorIt(50)));
    expect(fails[0]).toMatchObject({ id: 'junction', reason: 'ranRed' });
  });
  it('4: a late, harder stop still scores, but less', () => {
    const late = sim => { const d = sim.ents.lights[0].s - sim.st.s, kmh = sim.st.v * 3.6; return d > 32 ? floorIt(55)(sim) : { throttle: 0, brake: kmh > 0.5 && d < 30 ? 1 : 0, steer: 0, signal: null }; };
    const run = createCityRun(), r = play(run, 3, sim => (sim.ents.lights[0].state === 'green' ? cityDriver(sim) : late(sim)));
    expect(r.fails).toEqual([]);
    const d = r.dones.find(x => x.id === 'junction');
    expect(d.score).toBeLessThan(25);
    expect(d.lines[0]).toMatch(/fast/);
  });

  it('a retry starts just before the failed encounter, with fresh traffic, and keeps the first-attempt score', () => {
    const run = createCityRun();
    expect(play(run, 0, except(1, floorIt(45))).fails[0].id).toBe('crossing');
    // Retry: everything behind the checkpoint is gone, the pedestrian is back.
    const sim = freshSim(1);
    expect(sim.st).toMatchObject({ s: ENCOUNTERS[1].checkpoint.s, parked: false, x: ROAD.LANE });
    expect(sim.ents.leads.find(l => l.fromBehind).gone).toBe(true);
    expect(sim.ents.crossings[0].state).toBe('approaching');
    const again = play(run, 1, cityDriver);
    expect(again.fails).toEqual([]);
    const res = run.results();
    expect(res[0].first).toBe(25);
    expect(res[1]).toMatchObject({ first: 0, failedFirst: true, practice: 25 });
    expect(run.total()).toBe(75);
    expect(run.safeRun()).toBe(false);
    expect(ENCOUNTERS[run.weakest()].id).toBe('crossing');
  });
});

describe('City Safety Run progress', () => {
  const memory = () => { const m = new Map(); return { get: k => m.get(k) || null, set: (k, v) => m.set(k, v), m }; };
  it('awards City Safe Driver once, only for a safe first-time run, and keeps the best score across reloads', () => {
    const store = memory();
    let p = createCityProgress(store);
    expect(p.finishRun(75, [25, 0, 25, 25], false)).toEqual([]);
    expect(p.has(CITY_STAMP.id)).toBe(false);
    expect(p.finishRun(96, [25, 21, 25, 25], true)).toEqual([CITY_STAMP.id]);
    expect(p.finishRun(100, [25, 25, 25, 25], true)).toEqual([]);
    p = createCityProgress(store);   // a refresh
    expect(p.has(CITY_STAMP.id)).toBe(true);
    expect(p.best()).toBe(100);
    expect(p.runs()).toBe(3);
    expect(JSON.parse(store.m.get(CITY_KEY)).last.scores).toEqual([25, 25, 25, 25]);
  });
});
