// Top-down Windhoek street (left-hand traffic) for choosing where to cross:
// a minibus-taxi stop with parked taxis, vendor stalls on the sidewalk, and a
// zebra crossing with a refuge island. Shading shows what the pedestrian
// can't see past parked vehicles (real sight lines).
// World units are metres: x across the road (0 = left kerb), y along it (up = north).
//   params: { carKmh, crossY, shopBrand, spots: { <pointId>: 'yield' | 'nearmiss' | 'wait' } }
//   toScreen(x, y) for points; play(pointId, vars, point) walks there and shows what happens.
import { COLORS as C, REDUCE_MOTION } from '../../config.js';
import { T } from '../../ui.js';
import { t } from '../content.js';
import { clipTo, label, tweenTo, wait } from './common.js';

const NEAR_C = 4.15, CAR_L = 4.5, CAR_W = 1.8, ROAD_W = 11.8;
const BODY = [0xC9CED6, 0x2F5D9E, 0xE8E2D6, 0x7A1F2B, 0x3B3F46, 0xD9A441, 0x5C7F6A];

function segHitsRect(ax, ay, bx, by, r) {
  let t0 = 0, t1 = 1;
  const dx = bx - ax, dy = by - ay;
  const clip = (pp, q) => {
    if (pp === 0) return q >= 0;
    const tt = q / pp;
    if (pp < 0) { if (tt > t1) return false; if (tt > t0) t0 = tt; } else { if (tt < t0) return false; if (tt < t1) t1 = tt; }
    return true;
  };
  return clip(-dx, ax - r.x0) && clip(dx, r.x1 - ax) && clip(-dy, ay - r.y0) && clip(dy, r.y1 - ay) && t0 < t1;
}
function hull(pts) {
  pts = pts.slice().sort((p1, p2) => p1[0] - p2[0] || p1[1] - p2[1]);
  const cross = (o, p1, p2) => (p1[0] - o[0]) * (p2[1] - o[1]) - (p1[1] - o[1]) * (p2[0] - o[0]);
  const lo = [], up = [];
  pts.forEach(q => { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); });
  pts.slice().reverse().forEach(q => { while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); });
  return lo.slice(0, -1).concat(up.slice(0, -1));
}

export default function create(scene, parent, p, a) {
  const c = scene.add.container(0, 0); parent.add(c);
  const S = Math.min(16, a.w / 34), X0 = a.x + a.w * 0.3, Y0 = a.y + a.h * 0.46;
  const sx = x => X0 + x * S, sy = y => Y0 - y * S;
  const crossY = p.crossY != null ? p.crossY : 14;
  // Parked minibus taxis at the stop (left lane) and cars on the right; each is [y0, y1, kind].
  const PARKED_L = [[-7, -1.6, 'taxi'], [-12.8, -7.4, 'taxi'], [-18.6, -13.2, 'taxi'], [-24, -19.4], [-29.2, -24.6], [22, 26.6], [27.2, 31.8]];
  const PARKED_R = [[-30, -25.4], [-21, -16.4], [-10, -5.4], [4, 8.6], [24, 28.6]];
  const occ = PARKED_L.map(([y0, y1]) => ({ x0: 0.2, x1: 2.2, y0, y1 })).concat(PARKED_R.map(([y0, y1]) => ({ x0: 9.6, x1: 11.6, y0, y1 })));
  const st = { ped: { x: -2.4, y: 2 }, car: null, show: true };

  const base = scene.add.graphics(); c.add(base);
  const carG = scene.add.graphics(); c.add(carG);
  const fogG = scene.make.graphics({ x: 0, y: 0, add: false });
  const fog = scene.add.renderTexture(a.x, a.y, a.w, a.h).setOrigin(0).setAlpha(0.58); c.add(fog);
  const parkedG = scene.add.graphics(); c.add(parkedG);
  const pedG = scene.add.graphics(); c.add(pedG);
  const hud = scene.add.container(0, 0); c.add(hud);

  const topCar = (g, cx, cy, len, wid, body, kind) => {
    const L = len * S, w = wid * S;
    g.fillStyle(0x000000, 0.28); g.fillRoundedRect(cx - w / 2 + 2, cy - L / 2 + 3, w, L, 6);
    g.fillStyle(kind === 'taxi' ? 0xF2F2F2 : body, 1); g.fillRoundedRect(cx - w / 2, cy - L / 2, w, L, kind === 'taxi' ? 4 : 7);
    if (kind === 'taxi') { g.fillStyle(0x2E7D9A, 1); g.fillRect(cx - w / 2, cy - 2, w, 4); }
    g.fillStyle(0x1D2733, 0.92); g.fillRoundedRect(cx - w * 0.38, cy - L * (kind === 'taxi' ? 0.42 : 0.3), w * 0.76, L * 0.12, 3);
  };

  // --- static street ---------------------------------------------------------------
  const g = base;
  g.fillStyle(0x6B7076, 1); g.fillRoundedRect(a.x, a.y, a.w, a.h, 18);
  g.fillStyle(0x8A6F5A, 1); g.fillRect(a.x, a.y, sx(-4.2) - a.x, a.h);                        // buildings, west
  g.fillStyle(0xD8C8A6, 1); g.fillRect(sx(-4.2), a.y, 4.2 * S, a.h); g.fillRect(sx(ROAD_W), a.y, 4.2 * S, a.h);
  g.fillStyle(0xC9B892, 1); for (let y = a.y; y < a.y + a.h; y += 24) { g.fillRect(sx(-4.2), y, 4.2 * S, 1); g.fillRect(sx(ROAD_W), y, 4.2 * S, 1); }
  g.fillStyle(0x4A494D, 1); g.fillRect(sx(0), a.y, ROAD_W * S, a.h);
  g.fillStyle(0xB9B6AE, 1); g.fillRect(sx(0) - 3, a.y, 3, a.h); g.fillRect(sx(ROAD_W), a.y, 3, a.h);
  g.fillStyle(0xF2F2F2, 0.9);
  for (let y = a.y; y < a.y + a.h; y += 40) if (Math.abs(y - sy(crossY)) > 4 * S) g.fillRect(sx(5.9) - 1.5, y, 3, 22);
  // taxi-stop bay marking
  g.lineStyle(2, 0xFFCB2B, 0.9); g.strokeRect(sx(0.1), sy(-1.2), 2.2 * S, 18.6 * S);
  // zebra crossing with a refuge island in the middle
  for (let x = 0.4; x < ROAD_W - 0.2; x += 0.9) if (x < 5.1 || x > 6.7) { g.fillStyle(0xF2F2F2, 1); g.fillRect(sx(x), sy(crossY + 1.5), 0.5 * S, 3 * S); }
  g.fillStyle(0xBDB6A6, 1); g.fillRoundedRect(sx(5.2), sy(crossY + 4), 1.4 * S, 8 * S, 6);
  g.fillStyle(C.yellow, 1); g.fillCircle(sx(5.9), sy(crossY + 4.3), 5); g.fillCircle(sx(5.9), sy(crossY - 4.3), 5);
  // vendor stalls with umbrellas on the west sidewalk
  [[-2.6, -3], [-2.6, -9], [-2.6, 7]].forEach(([x, y], i) => {
    g.fillStyle(0x6B4F32, 1); g.fillRect(sx(x) - 14, sy(y) - 8, 28, 16);
    g.fillStyle([0xE5484D, 0x1FA3B5, 0xFFCB2B][i], 0.95); g.fillCircle(sx(x), sy(y), 15);
  });
  // shop across the road
  const shop0 = sy(crossY + 10), shop1 = sy(crossY - 10), x0 = sx(ROAD_W + 4.2);
  g.fillStyle(0x7B8087, 1); g.fillRect(x0, a.y, a.x + a.w - x0, a.h);
  if (p.shopBrand === 'woermann-brock') {
    // Woermann Brock supermarket: red tiled facade, WB hexagon, green "WE CARE" ribbon, "Supermarket" sign.
    // Drawn approximation; needs the partner's permission and official artwork before public use.
    const RED = 0xD2232A, GREEN = 0x1F5C3A, cx = (x0 + a.x + a.w) / 2 + 4, cy = (shop0 + shop1) / 2, right = a.x + a.w;
    g.fillStyle(RED, 1); g.fillRect(x0, shop0, right - x0, shop1 - shop0);
    g.fillStyle(0xFFFFFF, 0.07);
    for (let y = shop0 + 10; y < shop1; y += 10) g.fillRect(x0, y, right - x0, 1);
    for (let x = x0 + 10; x < right; x += 10) g.fillRect(x, shop0, 1, shop1 - shop0);
    g.fillStyle(0xC9D6E0, 1); g.fillRect(x0 - 10, cy - 46, 10, 92);
    g.fillStyle(0x8FA3B3, 1); g.fillRect(x0 - 10, cy - 1, 10, 2);
    const sc = scene.add.container(cx, cy).setAngle(90).setScale(0.8), s2 = scene.add.graphics(), r = 40, ex = -72;
    const hex = (rr, ox, oy) => [0, 1, 2, 3, 4, 5].map(i => ({ x: ox + rr * Math.cos(i * Math.PI / 3), y: oy + rr * Math.sin(i * Math.PI / 3) }));
    s2.fillStyle(0x000000, 0.2); s2.fillPoints(hex(r + 3, ex + 2, 3), true);
    s2.fillStyle(0xFFFFFF, 1); s2.fillPoints(hex(r, ex, 0), true);
    s2.lineStyle(3, RED, 1); s2.strokePoints(hex(r - 6, ex, 0), true, true);
    s2.fillStyle(0x163F28, 1); s2.fillTriangle(ex - 52, 22, ex - 38, 22, ex - 44, 34); s2.fillTriangle(ex + 52, 22, ex + 38, 22, ex + 44, 34);
    s2.fillStyle(GREEN, 1); s2.fillRoundedRect(ex - 44, 18, 88, 20, 4);
    s2.lineStyle(1.5, 0xFFFFFF, 0.9); s2.strokeRoundedRect(ex - 44, 18, 88, 20, 4);
    s2.fillStyle(0xFFFFFF, 1); s2.fillRect(10, -17, 168, 2); s2.fillRect(10, 15, 168, 2);
    sc.add([s2, T(scene, ex, -16, 'W', 22, '#D2232A'), T(scene, ex, 4, 'B', 22, '#D2232A'),
      T(scene, ex, 28, 'WE CARE', 11, '#FFFFFF', { letterSpacing: 1 }), T(scene, 94, 0, 'Supermarket', 24, '#FFFFFF')]);
    c.add(sc);
  } else {
    g.fillStyle(0xB5523A, 1); g.fillRect(x0, shop0, a.x + a.w - x0, shop1 - shop0);
    c.add(T(scene, (x0 + a.x + a.w) / 2, (shop0 + shop1) / 2, t('art.cross.shop'), 18, '#FFFFFF', { letterSpacing: 3 }).setAngle(90));
  }
  PARKED_L.forEach(([y0, y1, kind], i) => topCar(parkedG, sx(1.2), sy((y0 + y1) / 2), y1 - y0, kind === 'taxi' ? 2.0 : CAR_W, BODY[i % BODY.length], kind));
  PARKED_R.forEach(([y0, y1], i) => topCar(parkedG, sx(10.6), sy((y0 + y1) / 2), y1 - y0, CAR_W, BODY[(i + 3) % BODY.length]));

  // --- dynamic ---------------------------------------------------------------------
  const updateFog = () => {
    const P = st.ped; fogG.clear(); fogG.fillStyle(0x05080D, 1);
    occ.forEach(r => {
      const pts = [];
      [[r.x0, r.y0], [r.x1, r.y0], [r.x1, r.y1], [r.x0, r.y1]].forEach(([x, y]) => { pts.push([x, y]); pts.push([P.x + (x - P.x) * 80, P.y + (y - P.y) * 80]); });
      fogG.fillPoints(hull(pts).map(([x, y]) => ({ x: sx(x) - a.x, y: sy(y) - a.y })), true);
    });
    fog.clear(); fog.draw(fogG, 0, 0);
  };
  const canSeeCar = () => {
    if (!st.car) return false;
    const r = { x0: NEAR_C - CAR_W / 2, x1: NEAR_C + CAR_W / 2, y0: st.car.y - CAR_L, y1: st.car.y }, P = st.ped;
    return [[r.x0, r.y0], [r.x1, r.y0], [r.x0, r.y1], [r.x1, r.y1]].some(([x, y]) => !occ.some(o => segHitsRect(P.x, P.y, x, y, o)));
  };
  const drawDyn = () => {
    pedG.clear(); carG.clear();
    const x = sx(st.ped.x), y = sy(st.ped.y);
    pedG.fillStyle(0x000000, 0.3); pedG.fillEllipse(x + 2, y + 3, 18, 12);
    pedG.fillStyle(0xE8743B, 1); pedG.fillEllipse(x, y, 17, 11);
    pedG.fillStyle(0x2A1A12, 1); pedG.fillCircle(x, y, 5);
    pedG.lineStyle(2, C.yellow, 0.9); pedG.strokeCircle(x, y, 13);
    if (st.car && canSeeCar()) topCar(carG, sx(NEAR_C), sy(st.car.y - CAR_L / 2), CAR_L, CAR_W, 0xFFFFFF);
  };

  const say = (key, good) => { hud.removeAll(true); hud.add(label(scene, a.x + a.w / 2, a.y + 22, t(key), 14, '#FFFFFF', { backgroundColor: good ? '#1E6B45' : '#8E2A2D', padding: { x: 8, y: 4 } })); };
  const ms = d => (REDUCE_MOTION ? 0 : d);

  let tick = null;
  const inst = {
    toScreen: (x, y) => ({ x: sx(x), y: sy(y) }),
    async play(id, vars, pt) {
      pt = pt || { x: 0.3, y: 0 };
      const outcome = (p.spots || {})[id] || 'wait';
      hud.removeAll(true);
      await tweenTo(scene, st.ped, { x: pt.x, y: pt.y }, ms(900), REDUCE_MOTION);
      const v = p.carKmh / 3.6;
      st.car = { y: pt.y - 30, v };
      vars.couldSee = false;
      // Run the traffic until the outcome is clear.
      await new Promise(res => {
        tick = dt => {
          const car = st.car;
          if (outcome === 'yield') {
            // Driver slows for the zebra crossing; the pedestrian crosses once it has stopped.
            const stopAt = crossY - 2.5, remain = stopAt - car.y;
            car.v = remain > 0 ? Math.min(car.v, Math.sqrt(2 * 3.0 * remain)) : 0;
            car.y += car.v * dt;
            if (car.v < 0.05) { st.ped.x += 1.4 * dt; if (st.ped.x > ROAD_W + 1) { tick = null; res(); } }
          } else if (outcome === 'nearmiss') {
            // Stepping out from between the taxis: neither can see the other in time.
            car.y += car.v * dt;
            if (st.ped.x < NEAR_C - 1.0) st.ped.x += 1.4 * dt;
            if (car.y > st.ped.y - 4 && car.y < st.ped.y + 1) { tick = null; hud.add(scene.add.rectangle(a.x, a.y, a.w, a.h, 0x05080D, 0.3).setOrigin(0)); res(); }
          } else {
            car.y += car.v * dt;
            if (car.y - CAR_L > st.ped.y + 2) { st.ped.x += 2.8 * dt; if (st.ped.x > ROAD_W + 1) { tick = null; res(); } }
          }
          vars.couldSee = vars.couldSee || canSeeCar();
          drawDyn(); updateFog();
        };
        if (REDUCE_MOTION) { while (tick) tick(0.05); }
      });
      say(outcome === 'nearmiss' ? 'art.cross.nearMiss' : outcome === 'yield' ? 'art.cross.yielded' : 'art.cross.waited', outcome !== 'nearmiss');
      await wait(scene, ms(500));
    },
    update(time, dt) { if (tick) tick(dt); },
    destroy() {}
  };
  drawDyn(); updateFog();
  const m = clipTo(scene, c, a);
  inst.destroy = () => { tick = null; c.destroy(); m.destroy(); fogG.destroy(); };
  return inst;
}
