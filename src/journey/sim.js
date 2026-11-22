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
//   sim.st   live state for the HUD and renderer;  sim.ents  vehicles, animals, potholes
//   sim.result()   summary for the debrief, including the stamps earned
// ---------------------------------------------------------------------------
import { MESSAGES } from './route.js';

export const ROAD = { EDGE: 3.6, LANE: -1.8, ONCOMING: 1.8, CAR_HALF: 0.9 };
export const GAP_SAFE = 3, GAP_CLOSE = 2;       // seconds
export const GAP_RANGE = 160;                   // metres: beyond this the road ahead reads "Clear"
export const TOWN_BREAK = 10;                   // fatigue relieved by stopping in town between legs
export const REST_RELIEF = 70;                  // fatigue removed by a rest stop
const SERIOUS = { headon: 0, animal: 50, kudu: 40, rear: 35, runoff: 60 };

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
    rested: false, restedTired: false, animalsPassed: 0, animalsHit: 0, hadLead: false, potholes: 0,
    penalties: {}
  };
  const lose = (key, n) => { if (n <= 0) return; st.safety -= n; log.penalties[key] = (log.penalties[key] || 0) + n; };
  if (!checks.belts) lose('belts', 10);

  const ents = {
    leads: leg.leads.map((l, i) => ({ ...l, id: 'lead' + i, s: l.at, v: l.kmh / 3.6, x: ROAD.LANE, active: false, phase: 'cruise', wait: 0, gone: false })),
    oncoming: [],
    animals: leg.animals.map((a, i) => ({ ...a, id: 'animal' + i, s: a.at, x: a.side * (ROAD.EDGE + (a.verge ? 1.4 : 2.2)), state: 'waiting', dwell: 0, hop: 0 })),
    potholes: [],
    rest: leg.rest
  };
  (leg.potholes || []).forEach(([from, to, count]) => {
    for (let i = 0; i < count; i++) ents.potholes.push({ s: lerp(from, to, (i + rand()) / count), x: ROAD.LANE + (rand() - 0.5) * 2.4, r: 0.35 + rand() * 0.25, hit: false });
  });

  const drift = { v: 0, until: 0, next: 0 }, sleep = { until: 0, next: 0 }, distract = { until: 0 };
  let held = { throttle: 0, brake: 0, steer: 0 }, nextOncoming = leg.oncoming ? 120 : Infinity, phoneIdx = 0, restUsed = false;
  const flags = { speeding: false, rumble: false, close: false, overLine: false };

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

    // --- vehicles ahead in our lane ---------------------------------------
    let near = null;
    ents.leads.forEach(l => {
      if (l.gone) return;
      if (!l.active && st.s > l.at - 450) l.active = true;
      if (!l.active) return;
      if (l.phase === 'cruise' && l.stopAt && !l.stopped && l.s >= l.stopAt) { l.phase = 'stopping'; l.stopped = true; events.push({ type: 'leadBrake', id: l.id }); }
      if (l.phase === 'stopping') { l.v = Math.max(0, l.v - 6.5 * dt); if (!l.v) { l.phase = 'waiting'; l.wait = l.waitS || 3; } }
      else if (l.phase === 'waiting') { l.wait -= dt; if (l.wait <= 0) l.phase = 'cruise'; }
      else l.v = Math.min(l.kmh / 3.6, l.v + 1.6 * dt);
      l.braking = l.phase === 'stopping';
      if (l.s >= l.until) { l.x -= 1.6 * dt; if (l.x < -ROAD.EDGE - 2.5) l.gone = true; }
      const before = l.s - prevS;
      l.s += l.v * dt;
      if (Math.abs(l.x - st.x) >= 1.8) return;
      const dist = l.s - st.s;
      if (dist <= 0 && before > 0) {
        crash('rear', Math.max(0, (v - l.v) * 3.6), events);
        st.v = l.v * 0.6; st.s = l.s - 0.5;
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
    if (st.s >= nextOncoming && st.s < leg.length - 150) {
      ents.oncoming.push({ s: st.s + 650, v: (80 + rand() * 30) / 3.6, x: ROAD.ONCOMING, key: ['veh_sedan_white', 'veh_bakkie', 'veh_truck', 'veh_taxi'][Math.floor(rand() * 4)] });
      nextOncoming = st.s + leg.oncoming * (0.6 + rand() * 0.8);
    }
    ents.oncoming = ents.oncoming.filter(o => {
      const before = o.s - prevS;
      o.s -= o.v * dt;
      if (Math.abs(o.x - st.x) < 1.8 && o.s - st.s <= 0 && before > 0) crash('headon', kmh + o.v * 3.6, events);
      return o.s > st.s - 40;
    });

    // --- animals -----------------------------------------------------------
    ents.animals.forEach(an => {
      if (an.state === 'hit' || an.state === 'done') return;
      // A kudu bolts late, from close by; cattle and donkeys amble out from further off.
      const trigger = an.kind === 'kudu' ? 45 : an.kind === 'cattle' ? 140 : 110;
      if (an.state === 'waiting' && !an.verge && an.s - st.s < trigger) { an.state = 'crossing'; events.push({ type: 'animal', kind: an.kind }); }
      if (an.state === 'crossing') {
        const sp = an.kind === 'kudu' ? 3.5 : an.kind === 'cattle' ? 1.1 : 0.9, dir = -an.side, before = an.x;
        an.x += dir * sp * dt;
        if (an.kind === 'kudu') an.hop = Math.abs(Math.sin(an.x * 0.9)) * 0.5;
        if (an.dwellS && !an.dwelt && (before - ROAD.LANE) * (an.x - ROAD.LANE) <= 0) { an.state = 'dwell'; an.dwell = an.dwellS; an.dwelt = true; }
        if (Math.abs(an.x) > ROAD.EDGE + 2.5 && Math.sign(an.x) === dir) { an.state = 'clear'; an.hop = 0; }
      } else if (an.state === 'dwell') { an.dwell -= dt; if (an.dwell <= 0) an.state = 'crossing'; }
      if (prevS < an.s && st.s >= an.s) {
        if (Math.abs(an.x - st.x) < 1.6) {
          an.state = 'hit'; log.animalsHit++;
          crash(an.kind === 'kudu' ? 'kudu' : 'animal', kmh, events);
          st.v *= 0.3;
        } else {
          an.state = 'done';
          if (!an.verge || Math.abs(an.x - st.x) < 4) { log.animalsPassed++; events.push({ type: 'animalPassed', kind: an.kind }); }
        }
      }
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
  pothole: 'Hitting potholes fast cost {n} points. Slow down on damaged roads.'
};

/** Debrief lines, biggest cost first. */
export function issues(r) {
  const list = Object.entries(r.penalties).filter(([, n]) => n >= 0.5).sort((a, b) => b[1] - a[1])
    .map(([k, n]) => ISSUE_COPY[k].replace('{n}', String(Math.round(n))));
  return list.length ? list : ['A clean drive. Well done.'];
}

/**
 * A careful driver, used by tests and the ?autopilot=1 dev switch: keeps to the
 * limit, a 3-second gap, slows for animals and potholes, rests when tired.
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
    if (an.state === 'waiting' && d < 320 && !an.verge) target = Math.min(target, 60);
    if ((an.state === 'crossing' || an.state === 'dwell') && Math.abs(an.x) < ROAD.EDGE + 1.5 && d < 150) target = Math.min(target, d < 45 ? 0 : 30);
  });
  if (leg.rest != null && st.fatigue >= 30 && st.restAhead != null) target = Math.min(target, st.restAhead > 200 ? 60 : st.restAhead > 40 ? 25 : 12);
  if (st.canRest && st.fatigue >= 30) sim.rest();
  if (st.phone) sim.ignorePhone();
  const throttle = kmh < target - 1 ? 1 : 0;
  const brake = kmh > target + 3 ? clamp((kmh - target) / 20, 0.3, 1) : 0;
  const d = ROAD.LANE - st.x;
  const steer = Math.abs(d) > 0.12 ? clamp(d * 1.5, -1, 1) : 0;
  return { throttle, brake, steer };
}
