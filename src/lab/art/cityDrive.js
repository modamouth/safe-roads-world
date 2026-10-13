// Chase view down a Windhoek street. A pedestrian steps out `hazardM` ahead;
// the car brakes after the reaction time. If it can't stop, the scene freezes
// before contact: no collision is shown.
//   params: { hazardM, reactionS, decelDry, decelWet }
//   setState({ kmh, surface: 'dry' | 'wet' }, vars) writes vars.kmh, vars.stopM,
//   vars.gapM (metres to spare), vars.hitKmh (speed on reaching the pedestrian).
import { clamp, lerpColor, REDUCE_MOTION } from '../../config.js';
import { QUALITY } from '../../quality.js';
import { artKey, PARKED_VEHICLES } from '../../worldArt.js';
import { stopping, impactKmh } from '../core/derive.js';
import { t } from '../content.js';
import { clipTo, label } from './common.js';

const CAMH = 5.5, Z_R = 19, CAR_LEN = 4.5, CAR_W = 1.85, PED_H = 1.72;
const KERB_L = -4.0, EDGE = -1.75, CENTRE = 1.8, KERB_R = 5.6;
const COL = { walk: 0xD8C8A6, walk2: 0xCFBE9A, kerb: 0xB9B6AE, asph: 0x4A494D, asph2: 0x4E4D51, line: 0xF2F2F2, haze: 0xE6D7BE, wet: 0x2E3138 };

export default function create(scene, parent, p, a) {
  const c = scene.add.container(0, 0); parent.add(c);
  const HY = a.y + a.h * 0.36, CAR_Y = a.y + a.h - 6, F = (CAR_Y - HY) * Z_R / CAMH, VPX = a.x + a.w / 2;
  const PRE = 20;                                       // metres driven before the pedestrian steps out
  const ZP = Z_R + CAR_LEN + PRE + p.hazardM;           // pedestrian's world z
  const st = { pos: 0, wet: false, t: 0 };

  const skyKey = artKey(scene, 'city_backdrop');
  // Scenery sprites use depth -z, so the sky and road must sort behind all of them.
  const sky = scene.add.image(a.x, a.y, skyKey).setOrigin(0).setDisplaySize(a.w, HY - a.y + 6).setDepth(-1e6); c.add(sky);
  const road = scene.add.graphics().setDepth(-1e6 + 1); c.add(road);
  const scn = [];
  const add = (tex, wz, xm, sizeM, by) => {
    if (!scene.textures.exists(tex)) return null;
    const im = scene.add.image(0, 0, tex).setOrigin(0.5, 1).setVisible(false);
    Object.assign(im, { wz, xm, sizeM, by: by || 'h' }); c.add(im); scn.push(im); return im;
  };
  const end = ZP + 140, dens = QUALITY.density;
  for (let z = 30; z < end; z += 22 / dens) { add('palm', z, -6.4, 7.5); add('palm', z + 11, 7.6, 7.5); }
  for (let z = 42; z < end; z += 30) { add('lamp', z, -4.6, 6.5); add('lamp', z + 15, 6.2, 6.5); }
  const vehicles = PARKED_VEHICLES.filter(v => scene.textures.exists(v.key));
  [ZP - 7.5, ZP + 5.5, ZP - 26, ZP + 21, ZP + 40, 48, 70].forEach((z, i) => {
    if (vehicles.length) { const v = vehicles[i % vehicles.length]; add(v.key, z, -2.9, v.w, 'w'); }
  });
  let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let z = 26; z < end; z += (9 + rnd() * 12) / dens) add('ped_stand' + Math.floor(rnd() * 4), z, rnd() < 0.5 ? -5.0 - rnd() * 1.6 : 6.4 + rnd() * 1.6, PED_H);
  const ped = add('ped_walkA', ZP, -3.0, PED_H);
  const carKey = scene.textures.exists('img_suv') && scene.registry.get('REAL') ? 'img_suv' : 'carRear';
  const car = scene.add.image(VPX, CAR_Y, carKey).setOrigin(0.5, 1); car.setScale((CAR_W * F / Z_R) / car.width); c.add(car);
  const fx = scene.add.graphics(); c.add(fx);
  const hud = scene.add.container(0, 0); c.add(hud);
  const pedState = { x: -3.0, on: false, goal: null, walkT: 0 };

  const drawRoad = () => {
    const g = road; g.clear();
    for (let y = HY + 1; y < a.y + a.h; y += 3) {
      const z = F * CAMH / (y + 1.5 - HY), k = F / z, wz = st.pos + z, fog = clamp((z - 30) / 240, 0, 1) * 0.8;
      const colr = c0 => lerpColor(c0, COL.haze, fog);
      const seg = (m0, m1, c0, minW) => {
        let x0 = VPX + m0 * k, x1 = VPX + m1 * k;
        if (minW && x1 - x0 < minW) { const m = (x0 + x1) / 2; x0 = m - minW / 2; x1 = m + minW / 2; }
        x0 = clamp(x0, a.x - 4, a.x + a.w + 4); x1 = clamp(x1, a.x - 4, a.x + a.w + 4);
        if (x1 > x0) { g.fillStyle(colr(c0), 1); g.fillRect(x0, y, x1 - x0, 4); }
      };
      g.fillStyle(colr(Math.floor(wz / 1.5) & 1 ? COL.walk : COL.walk2), 1); g.fillRect(a.x, y, a.w, 4);
      seg(KERB_L - 0.25, KERB_L, COL.kerb);
      seg(KERB_L, KERB_R, st.wet ? COL.wet : Math.floor(wz / 6) & 1 ? COL.asph : COL.asph2);
      seg(KERB_R, KERB_R + 0.25, COL.kerb);
      if ((((wz % 9) + 9) % 9) < 3) seg(EDGE - 0.06, EDGE + 0.06, COL.line, 1);
      seg(CENTRE - 0.08, CENTRE + 0.04, COL.line, 1); seg(CENTRE + 0.16, CENTRE + 0.28, COL.line, 1);
      if (st.wet && (y % 12 === 0)) seg(-1.2, 1.2, 0x6C7A8A);   // reflections
    }
  };
  const drawScenery = () => {
    ped.xm = pedState.x;
    scn.forEach(o => {
      const z = o.wz - st.pos;
      if (z < 6 || z > 320 || (o === ped && !pedState.on)) { o.setVisible(false); return; }
      const k = F / z, sc = o.by === 'w' ? o.sizeM * k / o.width : o.sizeM * k / o.height;
      o.setVisible(true).setPosition(VPX + o.xm * k, HY + F * CAMH / z).setScale(sc).setDepth(-z).setAlpha(clamp(1.35 - z / 260, 0.35, 1));
    });
    c.sort('depth');
    [car, fx, hud].forEach(o => c.bringToTop(o));
  };
  const drawFx = () => {
    fx.clear();
    if (st.wet) { fx.lineStyle(1, 0xDDE6F0, 0.45); for (let i = 0; i < 36 * QUALITY.density; i++) { const x = a.x + ((i * 97 + st.t * 260) % a.w), y = a.y + ((i * 53 + st.t * 820) % a.h); fx.lineBetween(x, y, x - 4, y + 14); } }
  };
  const draw = () => { drawRoad(); drawScenery(); drawFx(); };

  let run = null;
  const inst = {
    setState(s, vars) {
      st.wet = s.surface === 'wet';
      const decel = st.wet ? p.decelWet : p.decelDry, kmh = s.kmh;
      const sd = stopping(kmh, p.reactionS, decel), ok = sd.total <= p.hazardM;
      const hit = ok ? 0 : impactKmh(kmh, p.hazardM, p.reactionS, decel);
      Object.assign(vars, { kmh, surface: s.surface || 'dry', stopM: Math.round(sd.total), gapM: Math.round(p.hazardM - sd.total), hitKmh: Math.round(hit), hazardM: p.hazardM });
      hud.removeAll(true); st.pos = 0; Object.assign(pedState, { x: -3.0, on: false, goal: null });
      if (run) run.res();   // a newer state replaces one still running
      return new Promise(res => {
        run = { t: 0, v: kmh / 3.6, sd, ok, res, decel, phase: 'approach' };
        if (REDUCE_MOTION) { st.pos = PRE + Math.min(sd.total, p.hazardM - 4); pedState.on = true; pedState.x = -0.5; finish(); }
      });
    },
    update(time, dt) {
      st.t += dt;
      if (run) {
        const r = run;
        if (r.phase === 'approach') { st.pos += r.v * dt; if (st.pos >= PRE) { st.pos = PRE; r.phase = 'react'; r.tE = 0; pedState.on = true; } }
        else {
          r.tE += dt;
          let d;
          if (r.tE < p.reactionS) d = r.v * r.tE;
          else { const tb = Math.min(r.tE - p.reactionS, r.v / r.decel); d = r.sd.react + r.v * tb - 0.5 * r.decel * tb * tb; }
          st.pos = PRE + d;
          if (!r.ok && d >= p.hazardM - 4.5) finish();
          else if (r.ok && r.tE >= p.reactionS + r.v / r.decel) { pedState.goal = KERB_R + 1.2; finish(); }
        }
      }
      if (pedState.on) {
        const goal = pedState.goal != null ? pedState.goal : -0.5;
        if (pedState.x < goal) { pedState.x = Math.min(goal, pedState.x + 1.4 * dt); pedState.walkT += dt; ped.setTexture(Math.floor(pedState.walkT / 0.28) % 2 ? 'ped_walkB' : 'ped_walkA'); }
      }
      draw();
    },
    destroy() {}
  };
  function finish() {
    const r = run; if (!r) return;
    run = null;
    hud.removeAll(true);
    if (!r.ok) hud.add(scene.add.rectangle(a.x, a.y, a.w, a.h, 0x05080D, 0.35).setOrigin(0));
    const key = r.ok ? 'art.city.stopped' : 'art.city.short';
    hud.add(label(scene, a.x + a.w / 2, a.y + 22, t(key, { m: Math.round(Math.abs(p.hazardM - r.sd.total)) }), 15, '#FFFFFF', { backgroundColor: r.ok ? '#1E6B45' : '#8E2A2D', padding: { x: 8, y: 4 } }));
    draw();
    r.res();
  }
  draw();
  const m = clipTo(scene, c, a);
  inst.destroy = () => { c.destroy(); m.destroy(); };
  return inst;
}
