// ---------------------------------------------------------------------------
// The Journey Home: driving simulation for one leg (pure, no Phaser).
//
// Units are metres, seconds and m/s. `s` is how far the front bumper is along
// the leg; `x` is across the road from the centre line (left negative; we
// drive on the left, so our lane centre is ROAD.LANE). A lead vehicle's `s` is
// its rear bumper, so the gap to it is simply lead.s - s.
//
//   const sim = createLegSim(leg, { fatigue, vehicle, checks });
//   const events = sim.step(dt, { throttle, brake, steer });   // each frame
//   sim.st   live state for the HUD and renderer;  sim.ents  vehicles, animals, potholes, pedestrians
//   sim.result()   summary for the debrief, including the stamps earned
// ---------------------------------------------------------------------------
import { MESSAGES } from './route.js';

export const ROAD = { EDGE: 3.6, LANE: -1.8, ONCOMING: 1.8, CAR_HALF: 0.9 };
export const GAP_SAFE = 3, GAP_CLOSE = 2;       // seconds
export const GAP_RANGE = 160;                   // metres: beyond this the road ahead reads "Clear"
export const TOWN_BREAK = 10;                   // fatigue relieved by stopping in town between legs
export const REST_RELIEF = 70;                  // fatigue removed by a rest stop
// Oncoming traffic on the B1: mostly taxis, cars and bakkies, with trucks, the odd bus and police.
const ONCOMING_MIX = ['veh_taxi', 'veh_taxi', 'veh_sedan_white', 'veh_sedan_white', 'veh_bakkie', 'veh_bakkie', 'veh_truck', 'veh_truck', 'veh_bus', 'veh_police'];
const SERIOUS = { headon: 0, animal: 50, kudu: 40, rear: 35, runoff: 60, pedestrian: 15, taxi: 35, convoy: 0, warthog: 70 };
const KERB = ROAD.EDGE + 1;                     // where pedestrians wait and finish, from the centre
const SHOULDER = -(ROAD.EDGE + 0.7);            // a vehicle parked on our shoulder
const WALK_X = -(ROAD.EDGE - 0.2);              // people walking on the edge of the tar
const GIVE_SPACE = 1, PASS_SLOW = 40;            // metres of space to a walker, or pass at this km/h or less

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;

/** Small seeded PRNG (mulberry32), so a leg plays the same way every time. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash = str => [...str].reduce((h, ch) => Math.imul(h ^ ch.charCodeAt(0), 16777619), 2166136261);

export const zoneAt = (leg, s) => leg.zones.reduce((z, n) => (n.at <= s ? n : z), leg.zones[0]);
export const limitAt = (leg, s) => zoneAt(leg, s).limit;

/** The next lower speed limit within `within` metres, for the "60 ahead" warning. */
export function nextLimitDrop(leg, s, within = 220) {
  const now = limitAt(leg, s);
  const z = leg.zones.find(n => n.at > s && n.at - s <= within && n.limit < now);
  return z ? { limit: z.limit, inM: z.at - s } : null;
}

/** Gap to the vehicle ahead, in seconds, as a HUD state. */
export function gapState(seconds) {
  if (seconds == null) return 'clear';
  return seconds >= GAP_SAFE ? 'safe' : seconds >= GAP_CLOSE ? 'close' : 'danger';
}

/** Safety points lost per second at a speed over the limit (a small tolerance first). */
export const speedingRate = (kmh, limit) => (kmh <= limit + 2 ? 0 : clamp((kmh - limit) / 10, 0.3, 5) * 0.8);

/** Road centre line in the car's frame: heading and lateral offset sampled every metre. */
export function buildRoadShape(leg, extra = 800) {
  const n = leg.length + extra, heading = new Float64Array(n), offset = new Float64Array(n);
  const curv = s => { const c = leg.curves.find(([a, b]) => s >= a && s < b); return c ? c[2] : 0; };
  for (let i = 1; i < n; i++) { heading[i] = heading[i - 1] + curv(i); offset[i] = offset[i - 1] + heading[i]; }
  const at = (arr, s) => { const i = clamp(Math.floor(s), 0, n - 2), k = clamp(s - i, 0, 1); return arr[i] + (arr[i + 1] - arr[i]) * k; };
  // Lateral position of the road centre `z` metres ahead of `s`, relative to the
  // current heading (so the camera always looks along the road).
  return { rel: (s, z) => at(offset, s + z) - at(offset, s) - at(heading, s) * z, heading: s => at(heading, s), curvature: curv };
}

/**
 * Where warthogs dash across this leg: open road only (80 km/h and up), clear of
 * the other hazards. Often a family runs in a line, the young a second or so behind.
 * Each one starts running when we are `tt` seconds away, so the first is usually
 * across in time and the danger is the ones behind it.
 */
export function warthogSpots(leg, seed) {
  if (!leg.warthogs) return [];
  const r = rng(seed), [lo, hi] = leg.warthogs.every, out = [];
  const busy = [
    ...(leg.crossings || []).map(c => [c.at, c.at]), ...(leg.walkers || []).map(w => [w.at, w.at + 150]),
    ...leg.leads.filter(l => l.parked || l.stopAt).map(l => [l.at, l.stopAt || l.at]), ...leg.animals.map(a => [a.at, a.at]),
    ...(leg.stopGo ? [[leg.stopGo.at - 300, leg.stopGo.at + leg.stopGo.length]] : []), ...(leg.rest != null ? [[leg.rest - 400, leg.rest + 100]] : [])
  ];
  for (let s = 300 + r() * hi; s < leg.length - 250; s += lo + r() * (hi - lo)) {
    if (limitAt(leg, s) < 80 || busy.some(([a, b]) => s > a - 120 && s < b + 120)) continue;
    const side = r() < 0.5 ? -1 : 1, young = r() < 0.55 ? 1 + Math.floor(r() * 3) : 0, tt = 2.6 + r() * 0.8;
    for (let i = 0; i <= young; i++) out.push({ at: Math.round(s) + i * 1.5, kind: 'warthog', side, tt, behind: i ? i * (2.5 + r() * 1.2) : 0, young: i > 0, group: young + 1 });
  }
  return out;
}

export function createLegSim(leg, carry = {}, opts = {}) {
  const checks = carry.checks || {}, rand = rng(opts.seed != null ? opts.seed : hash(leg.id));
  const decel = leg.weather === 'rain' ? 5.5 : 7.5;
  const st = {
    s: 0, v: 0, x: ROAD.LANE, t: 0,
    fatigue: clamp(carry.fatigue || 0, 0, 100),
    vehicle: clamp(carry.vehicle != null ? carry.vehicle : 100, 0, 100),
    safety: 100, braking: false, steer: 0,
    gap: { seconds: null, m: null, state: 'clear' },
    limit: limitAt(leg, 0), ahead: null, speeding: false, rumble: false, overLine: false,
    asleep: false, distracted: false, drifting: false,
    phone: null, restAhead: null, canRest: false,
    finished: false, over: null
  };
  const log = {
    speedingS: 0, closeS: 0, laneS: 0, tiredS: 0, collisions: 0, phoneReads: 0, phoneIgnored: 0,
    rested: false, restedTired: false, animalsPassed: 0, animalsHit: 0, hadLead: false, potholes: 0, yielded: 0, noYield: 0,
    walkersPassed: 0, closePasses: 0, ranStop: 0, waitedAtStop: false,
    penalties: {}
  };
  const lose = (key, n) => { if (n <= 0) return; st.safety -= n; log.penalties[key] = (log.penalties[key] || 0) + n; };
  if (!checks.belts) lose('belts', 10);

  const ents = {
    leads: leg.leads.map((l, i) => ({ ...l, id: 'lead' + i, s: l.at, v: l.parked ? 0 : l.kmh / 3.6, x: l.parked ? SHOULDER : ROAD.LANE, active: false, phase: l.parked ? 'parked' : 'cruise', wait: 0, gone: false })),
    oncoming: [],
    animals: [...leg.animals, ...warthogSpots(leg, opts.wildSeed != null ? opts.wildSeed : hash(leg.id + ':warthogs'))]
      .map((a, i) => ({ ...a, id: 'animal' + i, s: a.at, x: a.side * (ROAD.EDGE + (a.verge ? 1.4 : 2.2) + (a.behind || 0)), state: 'waiting', dwell: 0, hop: 0, runT: 0 })),
    potholes: [],
    crossings: (leg.crossings || []).map((c, i) => ({ ...c, id: 'ped' + i, s: c.at, x: c.from * KERB, speed: c.speed || 1.3, state: 'waiting', walkT: 0, passed: false })),
    walkers: (leg.walkers || []).map((w, i) => ({ ...w, id: 'walker' + i, s: w.at, x: WALK_X, speed: w.speed || 1.2, walkT: 0, state: 'walking', warned: false })),
    stopGo: leg.stopGo ? { ...leg.stopGo, phase: 'idle', t: 0, waited: 0 } : null,
    rest: leg.rest
  };
  const sg = ents.stopGo;
  (leg.potholes || []).forEach(([from, to, count]) => {
    for (let i = 0; i < count; i++) ents.potholes.push({ s: lerp(from, to, (i + rand()) / count), x: ROAD.LANE + (rand() - 0.5) * 2.4, r: 0.35 + rand() * 0.25, hit: false });
  });

  const drift = { v: 0, until: 0, next: 0 }, sleep = { until: 0, next: 0 }, distract = { until: 0 };
  let held = { throttle: 0, brake: 0, steer: 0 }, nextOncoming = leg.oncoming ? 120 : Infinity, phoneIdx = 0, restUsed = false;
  const flags = { speeding: false, rumble: false, close: false, overLine: false };

  // Somebody is walking on the crossing at `s`: traffic in either direction waits for them.
  const crossingBusy = (from, to) => ents.crossings.some(p => p.state === 'crossing' && p.s > from && p.s < to);
  // A vehicle in our lane whose front is at `front` waits at the Stop/Go line while the board shows STOP.
  const stopBoard = front => !!sg && sg.phase !== 'go' && front < sg.at && sg.at - front < 25;
  const mustWait = l => crossingBusy(l.s + 4.5, l.s + 14) || stopBoard(l.s + 4.5);
  // Through the Stop/Go section the convoy uses our lane; it is back in its own lane by the stop line.
  const convoyX = s => (s >= sg.at + 20 ? ROAD.LANE : s <= sg.at + 5 ? ROAD.ONCOMING : lerp(ROAD.ONCOMING, ROAD.LANE, (s - sg.at - 5) / 15));

  function crash(kind, kmh, events) {
    const serious = kmh >= SERIOUS[kind];
    log.collisions++;
    st.vehicle -= serious ? clamp(40 + kmh * 0.3, 40, 100) : clamp(kmh * 0.5, 6, 35);
    lose('crash', serious ? 40 : clamp(10 + kmh * 0.3, 10, 30));
    if (serious) st.over = { reason: 'crash', kind, kmh: Math.round(kmh) };
    events.push({ type: 'crash', kind, kmh: Math.round(kmh), serious });
  }

  function step(dt, input) {
    const events = [];
    if (st.finished || st.over || dt <= 0) return events;
    st.t += dt;
    const t = st.t;

    // Eyes closed or on the phone: the car carries on with whatever the feet were doing.
    st.asleep = t < sleep.until; st.distracted = t < distract.until;
    const inp = st.asleep || st.distracted ? { throttle: held.throttle, brake: 0, steer: 0 } : (held = { throttle: input.throttle || 0, brake: input.brake || 0, steer: input.steer || 0 });
    st.braking = inp.brake > 0; st.steer = inp.steer;

    // --- along the road --------------------------------------------------
    let v = st.v;
    const a = inp.throttle * 4.2 * (1 - v / 52) - inp.brake * decel - (inp.throttle ? 0 : 0.25) - 0.0002 * v * v;
    v = Math.max(0, v + a * dt);
    st.v = v;
    const prevS = st.s;
    st.s += v * dt;
    const kmh = v * 3.6, moving = clamp(v / 6, 0, 1);

    // --- across the road -------------------------------------------------
    st.drifting = t < drift.until;
    st.x += inp.steer * 2.8 * moving * dt;
    if (st.drifting) st.x += drift.v * moving * dt;
    else if (!inp.steer && !st.asleep && Math.abs(st.x - ROAD.LANE) < 1.2) {
      // Lane-keeping: settle back to the lane centre when the driver isn't steering.
      const d = ROAD.LANE - st.x, k = Math.min(Math.abs(d), 0.7 * moving * dt);
      st.x += Math.sign(d) * k;
    }

    // --- fatigue -----------------------------------------------------------
    st.fatigue = Math.min(100, st.fatigue + leg.fatigueRate * dt * (v > 1 ? 1 : 0.3));
    const f = st.fatigue;
    if (f >= 50 && v > 8) {
      if (!drift.next) drift.next = t + 3;
      if (!st.drifting && t >= drift.next) {
        const dir = rand() < 0.6 ? -1 : 1;
        drift.v = dir * (0.45 + 0.45 * (f - 50) / 50);
        drift.until = t + 2 + rand() * 1.5;
        drift.next = drift.until + lerp(14, 5, (f - 50) / 50) * (0.6 + rand() * 0.8);
        events.push({ type: 'drift' });
      }
    }
    if (f >= 75 && v > 8) {
      if (!sleep.next) sleep.next = t + 2;
      if (t >= sleep.next && !st.asleep) {
        const secs = 1 + rand() * 0.6;
        sleep.until = t + secs; sleep.next = t + lerp(16, 7, (f - 75) / 25) * (0.7 + rand() * 0.6);
        drift.v = (rand() < 0.5 ? -1 : 1) * 0.8; drift.until = sleep.until;
        events.push({ type: 'microsleep', seconds: secs, metres: Math.round(v * secs) });
      }
    }
    if (f >= 70 && v > 1) { lose('tired', 0.4 * dt); log.tiredS += dt; }

    // --- Stop/Go roadworks -------------------------------------------------
    // STOP while an oncoming convoy comes through in our lane; GO once it is out
    // and we have stopped at the line (or after a long wait).
    if (sg) {
      const d = sg.at - st.s;
      if (sg.phase === 'idle' && d < 250) {
        sg.phase = 'stop';
        ['veh_truck', 'veh_bakkie', 'veh_sedan_white', 'veh_taxi'].forEach((key, i) => ents.oncoming.push({ s: sg.at + 90 + i * 22, v: 50 / 3.6, x: ROAD.LANE, key, convoy: true }));
        events.push({ type: 'stopGo' });
      }
      if (sg.phase === 'stop' && prevS < sg.at && st.s >= sg.at) { log.ranStop++; lose('stopgo', 20); events.push({ type: 'ranStop' }); }
      if (sg.phase === 'stop') {
        sg.t += dt;
        if (v < 0.5 && d > 0 && d < 60) { sg.waited += dt; log.waitedAtStop = true; }
        const cleared = !ents.oncoming.some(o => o.convoy && o.s > sg.at - 10);
        if (cleared && (sg.waited >= 1.5 || sg.t >= 25 || d < 0)) { sg.phase = 'go'; events.push({ type: 'go' }); }
      }
    }

    // --- vehicles ahead in our lane ---------------------------------------
    let near = null;
    ents.leads.forEach(l => {
      if (l.gone) return;
      if (!l.active && st.s > l.at - 450) l.active = true;
      if (!l.active) return;
      if (l.phase === 'cruise' && l.stopAt && !l.stopped && l.s >= l.stopAt) { l.phase = 'stopping'; l.stopped = true; events.push({ type: 'leadBrake', id: l.id }); }
      if (l.phase === 'parked') {
        // Loading passengers on the shoulder; it pulls out, without indicating, as we get close.
        // Too close to pull out safely in front of us? It waits until we are past.
        const d = l.s - st.s;
        if (!l.warned && d > 0 && d < 150) { l.warned = true; events.push({ type: 'taxiParked' }); }
        if ((d < l.parked.pullOutM && d > 20) || d < -8) { l.phase = 'pullingOut'; l.outT = st.t; if (d > 0) events.push({ type: 'taxiPullOut' }); }
      }
      if (l.phase === 'parked') l.v = 0;
      else if (l.phase === 'pullingOut') {
        l.x = Math.min(ROAD.LANE, l.x + 1.2 * dt); l.v = Math.min(l.kmh / 3.6, l.v + 2 * dt);
        if (l.x >= ROAD.LANE) l.phase = 'cruise';
      } else if (l.phase === 'stopping') { l.v = Math.max(0, l.v - 6.5 * dt); if (!l.v) { l.phase = 'waiting'; l.wait = l.waitS || 3; } }
      else if (l.phase === 'waiting') { l.wait -= dt; if (l.wait <= 0) l.phase = 'cruise'; }
      else if (mustWait(l)) l.v = Math.max(0, l.v - 6.5 * dt);
      else l.v = Math.min(l.kmh / 3.6, l.v + 1.6 * dt);
      l.braking = l.phase === 'stopping' || (l.phase === 'cruise' && mustWait(l));
      if (l.s >= l.until) { l.x -= 1.6 * dt; if (l.x < -ROAD.EDGE - 2.5) l.gone = true; }
      const before = l.s - prevS;
      l.s += l.v * dt;
      if (Math.abs(l.x - st.x) >= 1.8) return;
      const dist = l.s - st.s, pulledOut = l.outT != null && st.t - l.outT < 8;
      if (dist <= 0 && before > 0) {
        crash(pulledOut ? 'taxi' : 'rear', Math.max(0, (v - l.v) * 3.6), events);
        st.v = l.v * 0.6; st.s = l.s - 0.5;
      } else if (l.phase === 'pullingOut' && !l.swiped && dist < 0 && dist > -9) {
        // It pulled out into the side of us.
        l.swiped = true;
        crash('taxi', Math.max(10, kmh * 0.5), events);
        st.v *= 0.6;
      }
      if (dist > -0.5 && (!near || dist < near.dist)) near = { l, dist: Math.max(0, dist) };
    });
    if (near && near.dist < GAP_RANGE) {
      if (near.dist < 120) log.hadLead = true;
      const seconds = v > 1 ? near.dist / v : null;
      st.gap = { seconds, m: near.dist, state: v > 1 ? gapState(seconds) : 'safe' };
    } else st.gap = { seconds: null, m: null, state: 'clear' };
    if (v > 5 && st.gap.state === 'danger') { lose('gap', 2 * dt); log.closeS += dt; }
    else if (v > 5 && st.gap.state === 'close') lose('gap', 0.6 * dt);
    if (st.gap.state === 'danger' && !flags.close) events.push({ type: 'tooClose' });
    flags.close = st.gap.state === 'danger';

    // --- oncoming traffic --------------------------------------------------
    // No ordinary oncoming traffic is sent into the Stop/Go section (its lane is closed).
    const nearWorks = sg && st.s > sg.at - 700 && st.s < sg.at + sg.length;
    if (st.s >= nextOncoming && st.s < leg.length - 150 && !nearWorks) {
      ents.oncoming.push({ s: st.s + 650, v: (80 + rand() * 30) / 3.6, x: ROAD.ONCOMING, key: ONCOMING_MIX[Math.floor(rand() * ONCOMING_MIX.length)] });
      nextOncoming = st.s + leg.oncoming * (0.6 + rand() * 0.8);
    }
    ents.oncoming = ents.oncoming.filter(o => {
      const before = o.s - prevS;
      if (!crossingBusy(o.s - 14, o.s - 4.5)) o.s -= o.v * dt;
      if (o.convoy) o.x = convoyX(o.s);
      if (Math.abs(o.x - st.x) < 1.8 && o.s - st.s <= 0 && before > 0) crash(o.convoy ? 'convoy' : 'headon', kmh + o.v * 3.6, events);
      return o.s > st.s - 40;
    });

    // --- animals -----------------------------------------------------------
    ents.animals.forEach(an => {
      if (an.state === 'hit' || an.state === 'done') return;
      // A kudu bolts late, from close by; cattle and donkeys amble out from further off;
      // warthogs dash out a few seconds ahead of us, whatever our speed.
      const trigger = an.kind === 'warthog' ? Math.max(30, v * an.tt) : an.kind === 'kudu' ? 45 : an.kind === 'cattle' ? 140 : 110;
      if (an.state === 'waiting' && !an.verge && an.s - st.s < trigger) {
        an.state = 'crossing';
        if (!an.young) events.push({ type: 'animal', kind: an.kind, group: an.group || 1 });
      }
      const sp = an.kind === 'warthog' ? 4.5 : an.kind === 'kudu' ? 3.5 : an.kind === 'cattle' ? 1.1 : 0.9, dir = -an.side;
      if (an.kind === 'warthog' && (an.state === 'crossing' || (an.state === 'clear' && Math.abs(an.x) < 16))) an.runT += dt;
      if (an.kind === 'warthog' && an.state === 'clear' && Math.abs(an.x) < 16) an.x += dir * sp * dt;
      if (an.state === 'crossing') {
        const before = an.x;
        an.x += dir * sp * dt;
        if (an.kind === 'kudu') an.hop = Math.abs(Math.sin(an.x * 0.9)) * 0.5;
        if (an.dwellS && !an.dwelt && (before - ROAD.LANE) * (an.x - ROAD.LANE) <= 0) { an.state = 'dwell'; an.dwell = an.dwellS; an.dwelt = true; }
        if (Math.abs(an.x) > ROAD.EDGE + 2.5 && Math.sign(an.x) === dir) { an.state = 'clear'; an.hop = 0; }
      } else if (an.state === 'dwell') { an.dwell -= dt; if (an.dwell <= 0) an.state = 'crossing'; }
      if (prevS < an.s && st.s >= an.s) {
        if (Math.abs(an.x - st.x) < (an.kind !== 'warthog' ? 1.6 : an.young ? 1.1 : 1.3)) {
          an.state = 'hit'; log.animalsHit++;
          crash(an.kind === 'kudu' || an.kind === 'warthog' ? an.kind : 'animal', kmh, events);
          st.v *= an.kind === 'warthog' ? 0.6 : 0.3;
        } else {
          an.state = an.kind === 'warthog' && an.state === 'clear' ? 'clear' : 'done';
          if (!an.verge || Math.abs(an.x - st.x) < 4) { log.animalsPassed++; if (!an.young) events.push({ type: 'animalPassed', kind: an.kind }); }
        }
      }
    });

    // --- pedestrian crossings in town ---------------------------------------
    // They step out as we approach; we must stop and wait until they are across.
    ents.crossings.forEach(p => {
      const d = p.s - st.s;
      if (p.state === 'waiting' && d > 0 && d < (p.trigger || 90)) { p.state = 'crossing'; events.push({ type: 'pedestrian', late: d < 60 }); }
      if (p.state === 'crossing') {
        p.x -= p.from * p.speed * dt; p.walkT += dt;
        if (p.x * -p.from >= KERB) { p.x = -p.from * KERB; p.state = 'across'; }
      }
      if (p.passed || !(prevS < p.s && st.s >= p.s)) return;
      p.passed = true;
      const onRoad = p.state === 'crossing' && Math.abs(p.x) < ROAD.EDGE + 0.3;
      if (onRoad && Math.abs(p.x - st.x) < 1.3) { p.state = 'hit'; crash('pedestrian', kmh, events); st.v *= 0.3; }
      else if (onRoad) { log.noYield++; lose('crossing', 15); events.push({ type: 'noYield' }); }
      else if (p.state === 'across') { log.yielded++; events.push({ type: 'yielded' }); }
    });

    // --- people walking on the road edge ------------------------------------
    // Give them at least a metre, or slow right down to pass.
    ents.walkers.forEach(w => {
      if (w.state !== 'walking') return;
      const before = w.s - prevS;
      w.s += w.speed * dt; w.walkT += dt;
      const d = w.s - st.s;
      if (!w.warned && d > 0 && d < 150) { w.warned = true; events.push({ type: 'walker' }); }
      if (!(before > 0 && d <= 0)) return;
      const space = (st.x - ROAD.CAR_HALF) - w.x;
      if (space < 0.25) { w.state = 'hit'; crash('pedestrian', kmh, events); st.v *= 0.3; }
      else if (space < GIVE_SPACE && kmh > PASS_SLOW) { w.state = 'passed'; log.closePasses++; lose('walker', 8); events.push({ type: 'closePass' }); }
      else { w.state = 'passed'; log.walkersPassed++; events.push({ type: 'walkerPassed' }); }
    });

    // --- potholes ----------------------------------------------------------
    ents.potholes.forEach(p => {
      if (p.hit || !(prevS < p.s && st.s >= p.s) || Math.abs(p.x - st.x) > ROAD.CAR_HALF * 0.9 + p.r) return;
      p.hit = true; log.potholes++;
      st.vehicle -= kmh / 10 * (checks.tyres ? 1 : 1.5);
      if (kmh > 60) lose('pothole', 2);
      events.push({ type: 'pothole', kmh: Math.round(kmh) });
    });

    // --- lane position -----------------------------------------------------
    const restZone = leg.rest != null && st.s > leg.rest - 80 && st.s < leg.rest + 100 && kmh < 40;
    const rumble = st.x - ROAD.CAR_HALF < -ROAD.EDGE || st.x + ROAD.CAR_HALF > ROAD.EDGE;
    const leadAhead = near && near.dist < 80;
    const overLine = st.x + ROAD.CAR_HALF > 0.1;
    st.rumble = rumble && v > 3; st.overLine = overLine;
    if (rumble && v > 8 && !restZone) { lose('lane', 1.2 * dt); log.laneS += dt; }
    if (overLine && v > 5) {
      const solid = zoneAt(leg, st.s).noOvertake;
      if (solid) lose('lane', 3 * dt); else if (!leadAhead) lose('lane', 1 * dt);
      log.laneS += dt;
    }
    if (st.rumble && !flags.rumble) events.push({ type: 'rumble' });
    if (overLine && !flags.overLine && v > 5) events.push({ type: 'overLine', solid: !!zoneAt(leg, st.s).noOvertake });
    flags.rumble = st.rumble; flags.overLine = overLine && v > 5;
    if (Math.abs(st.x) > ROAD.EDGE + 1.6) {
      crash('runoff', kmh, events);
      st.v = 0; st.x = Math.sign(st.x) * (ROAD.EDGE - 1); drift.until = 0; sleep.until = 0;
    }

    // --- speed limit -------------------------------------------------------
    st.limit = limitAt(leg, st.s);
    st.ahead = nextLimitDrop(leg, st.s);
    const over = speedingRate(st.v * 3.6, st.limit);
    st.speeding = over > 0;
    if (over) { lose('speed', over * dt); log.speedingS += dt; }
    if (st.speeding && !flags.speeding) events.push({ type: 'speeding', limit: st.limit });
    flags.speeding = st.speeding;

    // --- phone -------------------------------------------------------------
    if (!checks.phone && phoneIdx < leg.phone.length && t >= leg.phone[phoneIdx] && !st.phone) {
      st.phone = { ...MESSAGES[phoneIdx % MESSAGES.length], at: t };
      phoneIdx++;
      events.push({ type: 'phone', msg: st.phone });
    }
    if (st.phone && t - st.phone.at > 6) ignorePhone();

    // --- rest area -----------------------------------------------------------
    st.restAhead = leg.rest != null && !restUsed && st.s > leg.rest - 400 && st.s < leg.rest + 100 ? Math.round(leg.rest - st.s) : null;
    st.canRest = canRest();

    // --- end of the leg ---------------------------------------------------
    st.safety = clamp(st.safety, 0, 100);
    st.vehicle = clamp(st.vehicle, 0, 100);
    if (!st.over && st.vehicle <= 0) st.over = { reason: 'vehicle' };
    if (!st.over && st.safety <= 0) st.over = { reason: 'safety' };
    if (st.over) events.push({ type: 'over', ...st.over });
    else if (st.s >= leg.length) { st.finished = true; events.push({ type: 'finish' }); }
    return events;
  }

  function canRest() {
    return leg.rest != null && !restUsed && !st.finished && !st.over
      && st.s > leg.rest - 80 && st.s < leg.rest + 100 && st.v * 3.6 <= 25;
  }

  function rest() {
    if (!canRest()) return null;
    const before = st.fatigue;
    restUsed = true; log.rested = true;
    if (before >= 40) log.restedTired = true;
    st.fatigue = Math.max(0, before - REST_RELIEF);
    st.v = 0; st.x = ROAD.LANE; drift.until = 0; drift.next = 0; sleep.until = 0; sleep.next = 0;
    st.canRest = false; st.restAhead = null;
    return { before: Math.round(before), after: Math.round(st.fatigue) };
  }

  function readPhone() {
    if (!st.phone) return;
    st.phone = null; log.phoneReads++;
    distract.until = st.t + 2.5;
    lose('phone', 8);
  }

  function ignorePhone() {
    if (!st.phone) return;
    st.phone = null; log.phoneIgnored++;
  }

  function result() {
    const r = {
      legId: leg.id, finished: st.finished, over: st.over,
      safety: Math.round(st.safety), vehicle: Math.round(st.vehicle), fatigue: Math.round(st.fatigue), timeS: Math.round(st.t),
      ...log, penalties: { ...log.penalties }
    };
    r.stamps = legStamps(leg, r);
    r.issues = issues(r);
    return r;
  }

  return { leg, st, ents, log, step, rest, canRest, readPhone, ignorePhone, result, decel };
}

/** Stamps a leg result earns (leg arrival, limit, gap, rested, wildlife). */
export function legStamps(leg, r) {
  const out = [];
  if (r.finished && r.collisions === 0) out.push(leg.id);
  if (r.finished && r.speedingS < 2) out.push('limit');
  if (r.finished && r.hadLead && r.closeS < 1) out.push('gap');
  if (r.restedTired) out.push('rested');
  if (r.animalsPassed > 0 && r.animalsHit === 0) out.push('wildlife');
  return out;
}

const ISSUE_COPY = {
  crash: 'Collisions cost {n} points.',
  speed: 'Speeding cost {n} points. The limit is the most you may drive, not a target.',
  gap: 'Following too close cost {n} points. Keep 3 seconds behind the vehicle ahead.',
  lane: 'Leaving your lane cost {n} points. Stay left, and never cross a solid line.',
  tired: 'Driving very tired cost {n} points. Rest before fatigue gets high.',
  phone: 'Reading your phone cost {n} points. Each look took your eyes off the road.',
  belts: 'An unbuckled passenger cost {n} points.',
  pothole: 'Hitting potholes fast cost {n} points. Slow down on damaged roads.',
  crossing: 'Driving over a crossing with someone on it cost {n} points. Stop and wait until they are across.',
  walker: 'Passing people on the road edge too close and too fast cost {n} points. Slow down and move over.',
  stopgo: 'Driving past a STOP board cost {n} points. Wait at the line until the flagman shows GO.'
};

/** Debrief lines, biggest cost first. */
export function issues(r) {
  const list = Object.entries(r.penalties).filter(([, n]) => n >= 0.5).sort((a, b) => b[1] - a[1])
    .map(([k, n]) => ISSUE_COPY[k].replace('{n}', String(Math.round(n))));
  return list.length ? list : ['A clean drive. Well done.'];
}

/**
 * A careful driver, used by tests and the ?autopilot=1 dev switch: keeps to the
 * limit, a 3-second gap, slows for animals, potholes, crossings, parked taxis and
 * Stop/Go boards, moves over for people on the road edge, rests when tired.
 */
export function autopilot(sim) {
  const { st, ents, leg } = sim, kmh = st.v * 3.6;
  let target = st.limit - 3;
  const drop = nextLimitDrop(leg, st.s, 260);
  if (drop) target = Math.min(target, drop.limit + drop.inM * 0.25);
  if (leg.weather === 'rain') target = Math.min(target, st.limit - 15);
  if ((leg.potholes || []).some(([a, b]) => st.s > a - 120 && st.s < b)) target = Math.min(target, 50);
  if (st.gap.m != null) {
    const l = ents.leads.find(x => !x.gone && x.active && Math.abs(x.x - st.x) < 1.8 && x.s - st.s >= 0 && x.s - st.s < GAP_RANGE);
    const lv = l ? l.v * 3.6 : 0;
    if (st.gap.m < Math.max(12, st.v * 3.6)) target = Math.min(target, lv - 8);
    else if (st.gap.m < Math.max(20, st.v * 4.5)) target = Math.min(target, lv);
  }
  ents.animals.forEach(an => {
    const d = an.s - st.s;
    if (d < 0 || an.state === 'done' || an.state === 'hit') return;
    if (an.state === 'waiting' && d < 320 && !an.verge && an.kind !== 'warthog') target = Math.min(target, 60);
    // Where there's one warthog there are often more: stay slow until the whole family is across.
    if (an.kind === 'warthog' && an.state === 'crossing' && d < 150) target = Math.min(target, d < 60 ? 0 : 40);
    else if ((an.state === 'crossing' || an.state === 'dwell') && Math.abs(an.x) < ROAD.EDGE + 1.5 && d < 150) target = Math.min(target, d < 45 ? 0 : 30);
  });
  ents.crossings.forEach(p => {
    const d = p.s - st.s;
    if (d < 0 || p.passed) return;
    if (d < 160) target = Math.min(target, 35);
    if (p.state === 'crossing' && d < 60) target = Math.min(target, d < 30 ? 0 : 15);
  });
  ents.leads.forEach(l => { const d = l.s - st.s; if (l.phase === 'parked' && d > 0 && d < 160) target = Math.min(target, 35); });
  let laneX = ROAD.LANE;
  ents.walkers.forEach(w => {
    const d = w.s - st.s;
    if (w.state !== 'walking' || d < -2) return;
    if (d < 160) target = Math.min(target, 80);
    if (d < 60) laneX = -1.0;
  });
  const sg = ents.stopGo;
  if (sg && sg.phase !== 'go' && st.s < sg.at && sg.at - st.s < 320) { const d = sg.at - st.s; target = Math.min(target, d > 50 ? 40 : d > 22 ? 25 : 0); }
  // Rest when getting tired, and always on a night leg: tiredness builds fastest then.
  const wantRest = st.fatigue >= 30 || (leg.time === 'night' && st.fatigue >= 10);
  if (leg.rest != null && wantRest && st.restAhead != null) target = Math.min(target, st.restAhead > 200 ? 60 : st.restAhead > 40 ? 25 : 12);
  if (st.canRest && wantRest) sim.rest();
  if (st.phone) sim.ignorePhone();
  const throttle = kmh < target - 1 ? 1 : 0;
  const brake = kmh > target + 3 ? clamp((kmh - target) / 20, 0.3, 1) : 0;
  const d = laneX - st.x;
  const steer = Math.abs(d) > 0.12 ? clamp(d * 1.5, -1, 1) : 0;
  return { throttle, brake, steer };
}
