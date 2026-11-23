// ---------------------------------------------------------------------------
// Windhoek City · City Safety Run: a two-minute drive through a fictional street
// in the CBD, with four encounters in order. Pure (no Phaser): the drive uses the
// Journey simulation (journey/sim.js) on CITY_LEG, and the judge below scores it.
//
//   const run = createCityRun();          one play-through, kept across retries
//   run.attach(sim, i)                    after placing the car before encounter i
//   const out = run.step(input, events)   each frame: [{ type: 'done' | 'fail', ... }]
//   run.results()                         first-attempt scores (out of 25 each)
//
// Each encounter is scored out of 25 for anticipation and a safe response; there is
// no time bonus. A failed encounter scores 0 on the first attempt; retries are practice.
// ---------------------------------------------------------------------------
import { autopilot, ROAD } from '../journey/sim.js';

export const CITY_STAMP = { id: 'city-safe-driver', label: 'City Safe Driver', icon: 'city', how: 'Complete all four City Safety Run encounters safely on the first attempt in one run.' };

const STOP_LINE = 1180, CROSSING = 420;
export const CITY_LEG = {
  id: 'windhoek-city', from: 'Windhoek CBD', to: 'City Safety Run', realKm: 1.4, length: 1380,
  time: 'day', weather: 'clear', fatigueRate: 0, land: 'city',
  brief: 'A short drive through the city centre: pull out, a pedestrian crossing, a taxi stop and a traffic light.',
  // Start parked in a kerbside bay.
  startBay: { from: -14, to: 14 },
  zones: [{ at: 0, limit: 60, sign: 'town:Windhoek' }],
  curves: [[560, 700, 0.0012], [880, 980, -0.001]],
  leads: [
    // 1: a bakkie coming up behind while you are parked; it turns off before the crossing.
    { at: -40, kmh: 50, until: 330, key: 'veh_bakkie', fromBehind: true },
    // 3: a Quantum taxi that indicates, slows and stops at the kerb for passengers.
    { at: 590, kmh: 40, activate: 440, until: 980, key: 'veh_taxi', signalAt: 700, stopAt: 745, waitS: 5, kerbX: -2.9 }
  ],
  animals: [], potholes: [], rest: null, oncoming: 230, phone: [],
  // 2: a schoolgirl walks along the pavement to the zebra crossing, then crosses.
  crossings: [{ at: CROSSING, who: 'schoolgirl', from: 1, approach: 14, trigger: 75 }],
  // 4: a signalised junction, red as you approach.
  lights: [{ at: STOP_LINE, waitS: 3 }]
};

// Where each encounter starts (for retries), what it is called, and its Learning Lab link.
export const ENCOUNTERS = [
  { id: 'pullout', title: 'Pull out into traffic', checkpoint: { s: 0, kmh: 0 }, lab: { slug: 'road-rules', topic: 'moving' },
    tip: 'Before you move off: indicate, check your mirror, and wait for a gap that does not make anyone brake.' },
  { id: 'crossing', title: 'Pedestrian crossing', checkpoint: { s: 260, kmh: 45 }, lab: { slug: 'pedestrian', topic: 'driving' },
    tip: 'When someone is walking towards a zebra crossing, ease off early so you can stop before it.' },
  { id: 'taxi', title: 'Taxi stop', checkpoint: { s: 470, kmh: 40 }, lab: { slug: 'road-rules', topic: 'moving' },
    tip: 'Taxis stop often. Keep at least a 3-second gap and slow as soon as one indicates.' },
  { id: 'junction', title: 'Traffic light', checkpoint: { s: 960, kmh: 45 }, lab: { slug: 'road-rules', topic: 'moving' },
    tip: 'See a red light early, slow smoothly, stop behind the line, and go on green only when the junction is clear.' }
];
export const MAX_PER = 25;

/** Put the car just before encounter `i`: everything behind that point is cleared away. */
export function placeAt(sim, i) {
  const cp = ENCOUNTERS[i].checkpoint, { st, ents } = sim;
  if (i === 0) return sim;
  Object.assign(st, { s: cp.s, v: cp.kmh / 3.6, x: ROAD.LANE, parked: false });
  ents.leads.forEach(l => { if (l.at < cp.s) l.gone = true; });
  ents.crossings.forEach(p => { if (p.at < cp.s) Object.assign(p, { s: p.at, passed: true, state: 'across', x: -p.from * (ROAD.EDGE + 1) }); });
  return sim;
}

const FEEDBACK = {
  pullout: m => [m.signal ? 'You indicated before moving off.' : 'You moved off without indicating.',
    m.clear ? 'You waited for the bakkie to pass before you pulled out.' : 'You pulled out before the road behind was clear.'],
  crossing: m => [m.eased ? 'You eased off as soon as you saw her walking to the crossing.' : 'You came in fast: ease off when someone heads for a crossing.',
    m.stopped ? 'You stopped before the crossing and waited until she was across.' : 'Stop before the crossing while anyone is on it.'],
  taxi: m => [m.react === 'fast' ? 'You slowed as soon as the taxi signalled.' : m.react === 'slow' ? 'You slowed, but a little late after the taxi signalled.' : 'You kept going after the taxi signalled: slow at once.',
    m.gap === 'safe' ? 'You kept a safe following gap.' : 'You followed too closely: keep a 3-second gap.'],
  junction: m => [m.early ? 'You saw the red light early and slowed smoothly.' : 'You came up to the red light fast: start slowing earlier.',
    m.line === 'good' ? 'You stopped just behind the stop line.' : m.line === 'far' ? 'You stopped well back from the line: pull up closer.' : 'You stopped late.',
    'You went on green with the junction clear.']
};
const FAIL = {
  pullout: { forcedBrake: 'You pulled out in front of the bakkie and it had to brake hard. Wait until it has passed.', crash: 'You pulled out into the bakkie. Check your mirror and wait for a clear gap.' },
  crossing: { noYield: 'You drove over the crossing while she was on it. Stop and wait until she is across.', crash: 'You hit the pedestrian. Ease off early and stop before the crossing.' },
  taxi: { crash: 'You ran into the back of the taxi. Slow as soon as it signals and keep a 3-second gap.' },
  junction: { ranRed: 'You crossed the stop line on red. Stop behind the line until the light is green.', crash: 'You collided in the junction. On green, wait until the junction is clear.' }
};

export function createCityRun() {
  const results = ENCOUNTERS.map(e => ({ id: e.id, title: e.title, first: null, practice: null, failedFirst: false, lines: [] }));
  let sim = null, i = 0, m = null;
  const fresh = () => ({ t: 0, moved: false, signal: false, clear: false, eased: null, stopped: false, onRoadNear: false, signalT: null, react: null, gap: 'safe', crossedLine: false, early: null, line: null, wentOnGreen: true });

  function finish(score, lines) {
    const r = results[i], firstTry = r.first == null && !r.failedFirst;
    if (firstTry) r.first = score; else r.practice = score;
    r.lines = lines;
    const out = { type: 'done', index: i, id: ENCOUNTERS[i].id, score, first: firstTry, lines };
    i++; m = fresh();
    return out;
  }
  function fail(reason) {
    const r = results[i];
    if (r.first == null && !r.failedFirst) { r.failedFirst = true; r.first = 0; }
    const e = ENCOUNTERS[i];
    return { type: 'fail', index: i, id: e.id, reason, text: (FAIL[e.id][reason] || FAIL[e.id].crash) };
  }

  const api = {
    attach(s, index) { sim = s; i = index; m = fresh(); },
    index: () => i,
    done: () => i >= ENCOUNTERS.length,
    results: () => results.map(r => ({ ...r })),
    total: () => results.reduce((a, r) => a + (r.first || 0), 0),
    /** All four completed safely, first time, in this run. */
    safeRun: () => results.every(r => r.first != null && !r.failedFirst),
    weakest: () => results.reduce((w, r, k) => ((r.first || 0) < (results[w].first || 0) ? k : w), 0),
    step(input, events) {
      if (!sim || i >= ENCOUNTERS.length) return [];
      const { st, ents } = sim, id = ENCOUNTERS[i].id, kmh = st.v * 3.6;
      m.t += 1 / 60;
      const crashed = events.some(e => e.type === 'crash') || st.over;
      if (id === 'pullout') {
        const bakkie = ents.leads.find(l => l.fromBehind);
        if (events.some(e => e.type === 'forcedBrake')) return [fail('forcedBrake')];
        if (crashed) return [fail('crash')];
        if (!m.moved && st.v > 0.5) {
          m.moved = true; m.signal = st.indicator === 'right';
          const gap = bakkie && !bakkie.gone && bakkie.s + bakkie.len < st.s ? ((st.s - 4.5) - (bakkie.s + bakkie.len)) / Math.max(1, bakkie.v) : Infinity;
          m.clear = gap > 6;
        }
        if (m.moved && !st.parked && st.s > 30) return [finish((m.signal ? 10 : 0) + (m.clear ? 15 : 5), FEEDBACK.pullout(m))];
      } else if (id === 'crossing') {
        const p = ents.crossings[0], d = p.at - st.s;
        if (events.some(e => e.type === 'noYield')) return [fail('noYield')];
        if (crashed) return [fail('crash')];
        if (m.eased == null && d <= 50) m.eased = kmh <= 35 ? 'yes' : kmh <= 45 ? 'some' : 'no';
        const onRoad = p.state === 'crossing';
        if (onRoad && d > 0 && d < 20) { m.onRoadNear = true; if (st.v < 0.3) m.stopped = true; }
        if (st.s > p.at + 6) {
          const stopped = m.stopped || !m.onRoadNear;
          const score = (m.eased === 'yes' ? 8 : m.eased === 'some' ? 4 : 0) + (stopped ? 9 : 0) + 8;
          return [finish(score, FEEDBACK.crossing({ eased: m.eased === 'yes', stopped }))];
        }
      } else if (id === 'taxi') {
        const taxi = ents.leads.find(l => l.signalAt != null);
        if (crashed) return [fail('crash')];
        if (events.some(e => e.type === 'leadSignal')) m.signalT = st.t;
        if (m.signalT != null && m.react == null && (input.throttle === 0 || input.brake > 0)) { const rt = st.t - m.signalT; m.react = rt <= 1.5 ? 'fast' : rt <= 3 ? 'slow' : 'late'; }
        if (st.v > 3 && st.gap.state === 'danger') m.gap = 'danger';
        else if (st.v > 3 && st.gap.state === 'close' && m.gap === 'safe') m.gap = 'close';
        if (events.some(e => e.type === 'overLine')) m.crossedLine = true;
        if (!taxi || taxi.gone || st.s > taxi.until - 20) {
          const react = m.react || (m.signalT == null ? 'fast' : 'late');
          const score = (react === 'fast' ? 10 : react === 'slow' ? 5 : 0) + (m.gap === 'safe' ? 10 : m.gap === 'close' ? 5 : 0) + (m.crossedLine ? 0 : 5);
          return [finish(score, FEEDBACK.taxi({ react, gap: m.gap }))];
        }
      } else {
        const L = ents.lights[0], d = L.s - st.s;
        if (events.some(e => e.type === 'ranRed')) return [fail('ranRed')];
        if (crashed) return [fail('crash')];
        if (m.early == null && d <= 40) m.early = kmh <= 35 ? 'yes' : kmh <= 45 ? 'some' : 'no';
        if (m.line == null && st.v < 0.3 && d > -0.5 && d < 40) m.line = d <= 8 ? 'good' : d <= 15 ? 'ok' : 'far';
        if (st.s > L.s + 15) {
          const score = (m.early === 'yes' ? 8 : m.early === 'some' ? 4 : 0) + (m.line === 'good' ? 9 : m.line === 'ok' ? 6 : 3) + 8;
          return [finish(score, FEEDBACK.junction({ early: m.early === 'yes', line: m.line === 'good' ? 'good' : m.line === 'far' ? 'far' : 'late' }))];
        }
      }
      return [];
    }
  };
  return api;
}

/**
 * A careful city driver (tests and the ?autopilot=1 dev switch): the highway
 * autopilot plus indicating and waiting to pull out, slowing for the taxi's
 * signal, and stopping at the red light until it is green and the junction clear.
 */
export function cityDriver(sim) {
  const { st, ents } = sim, kmh = st.v * 3.6, base = autopilot(sim);
  let target = 55;
  if (st.parked) {
    const bakkie = ents.leads.find(l => l.fromBehind && !l.gone);
    const passed = !bakkie || bakkie.s > st.s + 2;
    return { throttle: passed ? 1 : 0, brake: passed ? 0 : 1, steer: 0, signal: 'right' };
  }
  const p = ents.crossings.find(c => !c.passed);
  if (p && p.at - st.s < 140 && p.at - st.s > 0) target = Math.min(target, 30);
  ents.leads.forEach(l => { const d = l.s - st.s; if (l.signal && d > 0 && d < 120) target = Math.min(target, Math.max(0, l.v * 3.6 - 8)); });
  ents.lights.forEach(L => {
    const d = L.s - st.s, busy = ents.cross.some(c => Math.abs(c.x) < ROAD.EDGE + 3);
    if (d > 0 && d < 160 && (L.state !== 'green' || busy)) target = Math.min(target, d > 50 ? 30 : d > 14 ? 15 : d > 4 ? 6 : 0);
  });
  const throttle = base.throttle && kmh < target - 1 ? 1 : 0;
  const brake = Math.max(base.brake, kmh > target + 2 ? Math.min(1, Math.max(0.3, (kmh - target) / 15)) : 0);
  return { throttle: brake ? 0 : throttle, brake, steer: base.steer, signal: null };
}
