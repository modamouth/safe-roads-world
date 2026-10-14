import Phaser from 'phaser';
// Chase view down a Namibian rural road, drawn in perspective (no video).
// World units are metres; z runs forward from the camera, x across the road
// (left negative; we drive on the left).
//
//   params: {
//     time: 'day' | 'dusk' | 'night', surface: 'tar' | 'gravel', weather: 'clear' | 'rain' | 'dust' | 'fog',
//     hazard: 'cattle' | 'donkey' | 'kudu' | 'none', kmh, seeM (how far ahead you can see),
//     reactionS, decel   (for braking tests), mode: 'scene' | 'stop' | 'microsleep'
//   }
//   setState(s, vars) — 'stop': drive at s.kmh; the hazard appears where it first
//     becomes visible (s.seeM) and the car brakes after the reaction time. Writes
//     vars.kmh, vars.seeM, vars.stopM, vars.gapM (metres to spare, negative if not),
//     vars.hitKmh (speed on reaching the hazard; the scene freezes before contact).
//   'microsleep': eyes close for s.seconds at s.kmh; writes vars.distM.
//   'scene': restyles the view (time, weather, beam).
//   'swerve' (with hazard 'kudu'): a kudu stands on the verge ahead and an oncoming
//     vehicle is in the other lane. play('brake' | 'swerve', vars) at vars.speed (or
//     params.kmh): 'brake' stays in lane and slows while the kudu crosses; 'swerve'
//     steers into the oncoming lane and collides head-on with the oncoming vehicle
//     (shake, flash, debris; vehicles only, no people). Players who chose to skip
//     the injury parts get a freeze before contact instead.
import { COLORS as C, clamp, lerpColor, REDUCE_MOTION } from '../../config.js';
import { QUALITY } from '../../quality.js';
import { stopping, impactKmh, distanceAt } from '../core/derive.js';
import { t } from '../content.js';
import { clipTo, label } from './common.js';
import { Debris, pop } from '../../ui.js';
import { Sfx } from '../../sfx.js';

const CAMH = 5.5, Z_R = 19, CAR_LEN = 4.5, CAR_W = 1.85, APPROACH = 20;
const FREEZE = 12;   // when the car can't stop, freeze this far short of the animal so it stays in view (no impact is shown)
const EDGE_L = -1.9, CENTRE = 1.7, EDGE_R = 5.3;
const SKY = { day: [0x7FB8E6, 0xD9ECF7], dusk: [0x253A6B, 0xF2A65A], night: [0x060B16, 0x18243A] };
const HAZE = { clear: 0xE6D7BE, rain: 0x8A97A6, dust: 0xC9A06A, fog: 0xC8CDD2 };

// Simple animal silhouettes, generated once.
function animalTexture(scene, kind) {
  const key = 'lab_' + kind;
  if (scene.textures.exists(key)) return key;
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  const body = kind === 'donkey' ? 0x8E8A84 : 0x5A4030;
  g.fillStyle(body, 1);
  if (kind === 'donkey') {
    g.fillEllipse(60, 52, 90, 44); g.fillRect(24, 60, 10, 46); g.fillRect(86, 60, 10, 46); g.fillRect(40, 66, 9, 40); g.fillRect(72, 66, 9, 40);
    g.fillEllipse(112, 34, 30, 22); g.fillTriangle(104, 26, 108, 2, 114, 26); g.fillTriangle(114, 24, 122, 2, 124, 26);
  } else {
    g.fillEllipse(62, 50, 104, 50); g.fillRect(20, 58, 12, 48); g.fillRect(92, 58, 12, 48); g.fillRect(38, 64, 11, 42); g.fillRect(74, 64, 11, 42);
    g.fillEllipse(118, 40, 30, 26); g.fillStyle(0xE8E2D6, 1); g.fillTriangle(110, 30, 102, 18, 114, 28); g.fillTriangle(126, 28, 134, 16, 122, 30);
  }
  g.generateTexture(key, 140, 108); g.destroy();
  return key;
}

// Oncoming minibus (front view) for the swerve scene, when the photo isn't loaded.
function vanTexture(scene) {
  if (scene.textures.exists('vanFront')) return 'vanFront';
  const mk = (key, w, h, fn) => { const g = scene.make.graphics({ x: 0, y: 0, add: false }); fn(g); g.generateTexture(key, w, h); g.destroy(); };
  mk('vanFront', 200, 190, g => {
    g.fillStyle(0x000000, 0.32); g.fillEllipse(100, 184, 186, 18);
    g.fillStyle(0x0D1117, 1); g.fillRoundedRect(16, 146, 36, 40, 8); g.fillRoundedRect(148, 146, 36, 40, 8);
    g.fillStyle(0xF4F1E8, 1); g.fillRoundedRect(8, 16, 184, 150, { tl: 30, tr: 30, bl: 12, br: 12 });
    g.fillStyle(C.teal, 1); g.fillRect(8, 104, 184, 10);
    g.fillStyle(0x17222F, 1); g.fillRoundedRect(24, 28, 152, 66, { tl: 22, tr: 22, bl: 6, br: 6 });
    g.fillStyle(0x2C4058, 1); g.fillTriangle(30, 92, 70, 30, 96, 30); g.fillTriangle(30, 92, 96, 30, 100, 92);
    g.fillStyle(0xF4F1E8, 1); g.fillRect(97, 28, 6, 66);
    g.fillStyle(C.yellow, 1); g.fillRoundedRect(66, 4, 68, 14, 4);
    g.fillStyle(0xFFF3B8, 1); g.fillRoundedRect(18, 122, 36, 24, 8); g.fillRoundedRect(146, 122, 36, 24, 8);
    g.fillStyle(0x2B3440, 1); g.fillRoundedRect(64, 122, 72, 30, 4);
    g.lineStyle(2, 0x55606E, 1); g.lineBetween(64, 130, 136, 130); g.lineBetween(64, 138, 136, 138); g.lineBetween(64, 146, 136, 146);
    g.fillStyle(0x222B36, 1); g.fillRoundedRect(10, 156, 180, 22, 7);
    g.fillStyle(0xFFFBEA, 1); g.fillRect(78, 159, 44, 14);
  });

  return 'vanFront';
}

export default function create(scene, parent, p, a, ctx) {
  const c = scene.add.container(0, 0); parent.add(c);
  const HY = a.y + a.h * 0.34, CAR_Y = a.y + a.h - 8, F = (CAR_Y - HY) * Z_R / CAMH, VPX = a.x + a.w / 2;
  const look = { time: p.time || 'dusk', weather: p.weather || 'clear', surface: p.surface || 'tar', seeM: p.seeM || 150 };
  const st = { pos: 0, kmh: p.kmh || 80, phase: 'cruise', drift: 0, hazardZ: null, eyes: 1, t: 0 };

  // Scenery sprites use depth -z, so the sky and road must sort behind all of them.
  const sky = scene.add.graphics().setDepth(-1e6); const road = scene.add.graphics().setDepth(-1e6 + 1);
  c.add([sky, road]);
  const scn = [];
  const add = (tex, wz, xm, sizeM, by, tint) => {
    if (!scene.textures.exists(tex)) return null;
    const im = scene.add.image(0, 0, tex).setOrigin(0.5, 1).setVisible(false);
    Object.assign(im, { wz, xm, sizeM, by: by || 'h', baseTint: tint || 0xFFFFFF });
    c.add(im); scn.push(im); return im;
  };
  const SPAN = 600, dens = QUALITY.density;
  // Illustrated scenery when loaded (no tint needed); drawn shapes otherwise.
  const ART = k => scene.textures.exists(k);
  const tree = ART('scn_acacia') ? ['scn_acacia', 0xFFFFFF] : ['acacia', 0x8A7A5E];
  const shrub = ART('scn_bush') ? ['scn_bush', 0xFFFFFF] : ['bush', 0x9A8A5E];
  const post = ART('img_post') ? 'img_post' : 'post';
  for (let z = 25; z < SPAN; z += 34 / dens) { add(tree[0], z, -8 - (z * 7) % 6, 7, 'h', tree[1]); const r = add(tree[0], z + 17, 10 + (z * 3) % 5, 7, 'h', tree[1]); if (r) r.setFlipX(true); }
  for (let z = 15; z < SPAN; z += 22 / dens) { add(shrub[0], z, -4.6 - (z % 3), 1.6, 'h', shrub[1]); const r = add(shrub[0], z + 9, 8 + (z % 4), 1.6, 'h', shrub[1]); if (r) r.setFlipX(true); }
  for (let z = 10; z < SPAN; z += 12) { add(post, z, -4.2, 1.2); const r = add(post, z + 6, 7.4, 1.2); if (r && post === 'img_post') r.setFlipX(true); }
  // Kudu: illustrated artwork (scn_kudu, optional leaping pose scn_kudu_leap) when loaded, else the drawn one.
  const kuduKey = scene.textures.exists('scn_kudu') ? 'scn_kudu' : 'kudu';
  const hazardKey = p.hazard && p.hazard !== 'none' ? (p.hazard === 'kudu' ? kuduKey : animalTexture(scene, p.hazard)) : null;
  const animal = hazardKey ? add(hazardKey, 9999, -0.3, p.hazard === 'kudu' ? 2.4 : 2.3, 'w') : null;
  if (animal) animal.fixed = true;
  const swerveMode = p.mode === 'swerve';
  const oncoming = swerveMode ? add(scene.textures.exists('img_truck') ? 'img_truck' : vanTexture(scene), 9999, 3.5, 2.1, 'w') : null;
  if (oncoming) oncoming.fixed = true;
  // The kudu starts close enough to read clearly at phone size; it is larger than cattle.
  if (swerveMode && animal) { animal.xm = -4.6; animal.sizeM = 2.8; animal.wz = 30 + Z_R + CAR_LEN; oncoming.wz = 170 + Z_R + CAR_LEN; }
  const eyes = scene.add.graphics(); c.add(eyes);
  const carKey = scene.textures.exists('img_suv') && scene.registry.get('REAL') ? 'img_suv' : 'carRear';
  const car = scene.add.image(VPX, CAR_Y, carKey).setOrigin(0.5, 1);
  car.setScale((CAR_W * F / Z_R) / car.width); c.add(car);
  const brakeGlow = scene.add.graphics(); c.add(brakeGlow);
  const fx = scene.add.graphics(); c.add(fx);
  const hud = scene.add.container(0, 0); c.add(hud);
  const deb = new Debris(scene, 960);
  const blackout = scene.add.rectangle(a.x, a.y, a.w, a.h, 0x000000, 1).setOrigin(0).setAlpha(0); c.add(blackout);
  const counter = label(scene, a.x + a.w / 2, a.y + a.h / 2, '', 34, '#FFFFFF').setAlpha(0); c.add(counter);

  const ahead = z => z - Z_R - CAR_LEN;   // metres in front of our bumper
  // How visible something at distance d is (1 = fully lit/clear, 0 = invisible).
  const vis = d => {
    if (look.time === 'night') return clamp(1 - (d - look.seeM * 0.92) / (look.seeM * 0.18), 0.04, 1);
    if (look.weather === 'fog' || look.weather === 'dust') return clamp(1 - (d - look.seeM * 0.7) / (look.seeM * 0.6), 0.05, 1);
    return 1;
  };
  const dark = () => (look.time === 'night' ? 0x05070C : HAZE[look.weather]);

  const drawSky = () => {
    sky.clear();
    const [top, hor] = SKY[look.time];
    sky.fillGradientStyle(top, top, hor, hor, 1); sky.fillRect(a.x, a.y, a.w, HY - a.y + 4);
    if (look.time !== 'night') { sky.fillStyle(0x6B5A44, 0.6); sky.fillTriangle(a.x, HY, a.x + a.w * 0.25, HY - 22, a.x + a.w * 0.5, HY); sky.fillTriangle(a.x + a.w * 0.55, HY, a.x + a.w * 0.8, HY - 14, a.x + a.w, HY); }
    if (look.weather !== 'clear') { sky.fillStyle(HAZE[look.weather], look.weather === 'rain' ? 0.35 : 0.6); sky.fillRect(a.x, a.y, a.w, HY - a.y + 4); }
  };

  const drawRoad = () => {
    const g = road; g.clear();
    const gravel = look.surface === 'gravel';
    for (let y = HY + 1; y < a.y + a.h; y += 3) {
      const z = F * CAMH / (y + 1.5 - HY), k = F / z, wz = st.pos + z, d = ahead(z);
      const v = vis(d), fog = clamp((z - 30) / 400, 0, 1) * 0.5;
      const shade = col0 => lerpColor(lerpColor(col0, HAZE[look.weather], fog), dark(), 1 - v);
      const seg = (m0, m1, col0, minW) => {
        let x0 = VPX + (m0 - st.drift) * k, x1 = VPX + (m1 - st.drift) * k;
        if (minW && x1 - x0 < minW) { const m = (x0 + x1) / 2; x0 = m - minW / 2; x1 = m + minW / 2; }
        x0 = clamp(x0, a.x - 4, a.x + a.w + 4); x1 = clamp(x1, a.x - 4, a.x + a.w + 4);
        if (x1 > x0) { g.fillStyle(shade(col0), 1); g.fillRect(x0, y, x1 - x0, 4); }
      };
      // At night only the road is lit by the headlights; the verges stay dark.
      const verge = shade(Math.floor(wz / 14) & 1 ? 0xD6A04A : 0xCB9542);
      g.fillStyle(look.time === 'night' ? lerpColor(verge, 0x05070C, 0.72) : verge, 1); g.fillRect(a.x, y, a.w, 4);
      if (gravel) {
        seg(EDGE_L - 1.2, EDGE_R + 1.2, Math.floor(wz / 5) & 1 ? 0xC8A98C : 0xBF9F82);
        if (look.weather === 'dust' || p.mode === 'scene') seg(-0.6, 0.6, 0xB5937A);   // wheel ruts
      } else {
        seg(EDGE_L - 0.9, EDGE_R + 0.9, 0xC8A98C);
        seg(EDGE_L - 0.15, EDGE_R + 0.15, Math.floor(wz / 8) & 1 ? 0x403E41 : 0x484547);
        seg(EDGE_L - 0.07, EDGE_L + 0.07, 0xFFCB2B, 1); seg(EDGE_R - 0.07, EDGE_R + 0.07, 0xFFCB2B, 1);
        if ((((wz % 12) + 12) % 12) < 4) seg(CENTRE - 0.07, CENTRE + 0.07, 0xF2F2F2, 1);
      }
    }
    // dipped/main beam glow on the road at night
    if (look.time === 'night') {
      const reach = Math.min(look.seeM, 160), yR = HY + F * CAMH / (reach + Z_R + CAR_LEN);
      g.fillStyle(0xFFF2B0, 0.08); g.fillTriangle(VPX - a.w * 0.32, CAR_Y, VPX + a.w * 0.32, CAR_Y, VPX - st.drift * 6, yR);
    }
  };

  const drawScenery = () => {
    eyes.clear();
    scn.forEach(o => {
      const z = o.wz - st.pos;
      if (z < 7 || z > 520) { o.setVisible(false); if (!o.fixed && z < 7) o.wz += SPAN; return; }
      const kk = F / z, x = VPX + (o.xm - st.drift) * kk, y = HY + F * CAMH / z - (o.hop || 0) * kk;
      const sc = o.by === 'w' ? o.sizeM * kk / o.width : o.sizeM * kk / o.height;
      const v = vis(ahead(z));
      o.setVisible(true).setPosition(x, y).setScale(sc).setDepth(-z);
      // Trees and bush off the road sit outside the beam at night; marker posts and animals are lit.
      const offRoad = look.time === 'night' && o !== animal && o !== oncoming && Math.abs(o.xm) > 6;
      o.setTint(lerpColor(o.baseTint, dark(), offRoad ? Math.max(0.7, 1 - v) : 1 - v)).setAlpha(clamp(1.2 - z / 520, 0.25, 1));
      // At night, an animal beyond the lights shows only as eyeshine.
      if (o === animal && look.time === 'night' && v < 0.5) {
        o.setAlpha(0.15);
        eyes.fillStyle(0xFFF6C8, 0.9); eyes.fillCircle(x + o.displayWidth * 0.36, y - o.displayHeight * 0.68, Math.max(1.2, kk * 0.06)); eyes.fillCircle(x + o.displayWidth * 0.42, y - o.displayHeight * 0.68, Math.max(1.2, kk * 0.06));
      }
    });
    c.sort('depth');
    // keep overlays on top after sorting
    [eyes, car, brakeGlow, fx, hud, blackout, counter].forEach(o => c.bringToTop(o));
  };

  const drawWeather = () => {
    fx.clear();
    if (look.weather === 'rain') {
      fx.lineStyle(1, 0xDDE6F0, 0.45);
      for (let i = 0; i < 40 * QUALITY.density; i++) { const x = a.x + ((i * 97 + st.t * 300) % a.w), y = a.y + ((i * 53 + st.t * 900) % a.h); fx.lineBetween(x, y, x - 4, y + 14); }
    }
    if (look.weather === 'dust') { fx.fillStyle(0xC9A06A, 0.18); fx.fillRect(a.x, a.y, a.w, a.h); }
  };

  const ruler = (seeM, stopM, ok) => {
    hud.removeAll(true);
    const z1 = seeM + Z_R + CAR_LEN, y1 = HY + F * CAMH / z1;
    const gfx = scene.add.graphics(); hud.add(gfx);
    gfx.lineStyle(2, 0xFFFFFF, 0.9); gfx.lineBetween(a.x + 30, y1, a.x + a.w - 30, y1);
    hud.add(label(scene, a.x + 14, y1 - 12, t('art.road.seen', { m: Math.round(seeM) }), 13, '#FFFFFF', { backgroundColor: '#05080DCC', padding: { x: 5, y: 2 } }).setOrigin(0, 0.5));
    if (stopM != null) {
      hud.add(label(scene, a.x + a.w / 2, a.y + 22, t(ok ? 'art.road.stopped' : 'art.road.short', { m: Math.round(Math.abs(seeM - stopM)) }), 15, '#FFFFFF',
        { backgroundColor: ok ? '#1E6B45' : '#8E2A2D', padding: { x: 8, y: 4 } }));
    }
  };

  const draw = () => { drawRoad(); drawScenery(); drawWeather(); };
  drawSky(); draw();

  let run = null;
  const inst = {
    setState(s, vars) {
      Object.assign(look, { time: s.time || look.time, weather: s.weather || look.weather, surface: s.surface || look.surface, seeM: s.seeM || look.seeM });
      drawSky();
      const mode = s.mode || p.mode || 'scene';
      if (mode === 'scene') { if (s.kmh) st.kmh = s.kmh; draw(); return null; }
      if (mode === 'microsleep') return inst.microsleep(s.kmh || p.kmh, s.seconds, vars);
      return inst.stopTest(s.kmh, look.seeM, s.reactionS || p.reactionS, s.decel || p.decel, vars);
    },
    stopTest(kmh, seeM, reactionS, decel, vars) {
      const s = stopping(kmh, reactionS, decel), ok = s.total <= seeM;
      const hit = ok ? 0 : impactKmh(kmh, seeM, reactionS, decel);
      Object.assign(vars, { kmh, seeM: Math.round(seeM), stopM: Math.round(s.total), gapM: Math.round(seeM - s.total), hitKmh: Math.round(hit) });
      hud.removeAll(true); brakeGlow.clear(); car.y = CAR_Y;
      st.kmh = kmh; st.pos = 0; st.drift = 0;
      // The hazard sits exactly where it first becomes visible.
      if (animal) animal.wz = seeM + Z_R + CAR_LEN + APPROACH;   // a short approach before it comes into view
      if (run) run.res();   // a newer state replaces one still running
      return new Promise(res => {
        run = { t: -APPROACH / (kmh / 3.6), kmh, seeM, s, ok, res, reactionS, decel, braking: false, startPos: null };
        if (REDUCE_MOTION) { // jump straight to the outcome
          st.pos = APPROACH + Math.min(s.total, seeM - FREEZE); finish();
        }
      });
    },
    play(id, vars) {
      if (!swerveMode || !animal) return Promise.resolve();
      const kmh = Number(vars.speed || p.kmh || 100);
      Object.assign(vars, { kmh });
      if (run) run.res();
      hud.removeAll(true); brakeGlow.clear();
      return new Promise(res => {
        run = { swerve: true, choice: id, t: 0, kmh, v: kmh / 3.6, vOnc: 80 / 3.6, res };
        if (REDUCE_MOTION) { finishSwerve(); }
      });
    },
    microsleep(kmh, seconds, vars) {
      const d = distanceAt(kmh, seconds);
      Object.assign(vars, { kmh, seconds, distM: Math.round(d) });
      hud.removeAll(true);
      if (run) run.res();
      return new Promise(res => {
        run = { micro: true, t: 0, kmh, seconds, d, res };
        if (REDUCE_MOTION) { blackout.setAlpha(0); counter.setAlpha(0); run = null; res(); }
      });
    },
    update(time, dt) {
      st.t += dt;
      deb.update(dt);
      if (run && run.swerve) {
        const r = run;
        r.t += dt;
        // the kudu leaps out from the verge and across the road
        const k = clamp((r.t - 0.15) / 1.5, 0, 1);
        animal.xm = -4.6 + 12.9 * k; animal.hop = k > 0 && k < 1 ? Math.abs(Math.sin(k * Math.PI * 3)) * 0.6 : 0;
        if (scene.textures.exists('scn_kudu_leap')) animal.setTexture(animal.hop > 0.15 ? 'scn_kudu_leap' : 'scn_kudu');
        if (r.choice === 'brake') {
          if (r.t > 0.6) {
            if (!r.braking) { r.braking = true; brakeGlow.fillStyle(0xFF2A2A, 0.9); brakeGlow.fillCircle(car.x - car.displayWidth * 0.33, car.y - car.displayHeight * 0.5, 5); brakeGlow.fillCircle(car.x + car.displayWidth * 0.33, car.y - car.displayHeight * 0.5, 5); }
            r.v = Math.max(0, r.v - 7 * dt);
          }
          if (r.t > 2.8 || (r.v === 0 && k >= 1)) finishSwerve();
        } else {
          const ks = clamp((r.t - 0.35) / 0.7, 0, 1);
          st.drift = 3.6 * Phaser.Math.Easing.Sine.InOut(ks);
          car.angle = Math.sin(ks * Math.PI) * 6;
          oncoming.wz -= r.vOnc * dt;
          const gap = ahead(oncoming.wz - st.pos);
          if (ks >= 1 && (ctx && ctx.skipSensitive ? gap <= 16 : gap <= 0.6)) { if (!(ctx && ctx.skipSensitive)) collide(r); finishSwerve(); }
        }
        st.pos += r.v * dt;
        draw();
        return;
      }
      if (run && run.micro) {
        const r = run, v = r.kmh / 3.6;
        r.t += dt;
        st.pos += v * dt;
        const k = clamp(r.t / r.seconds, 0, 1);
        blackout.setAlpha(r.t < 0.25 ? r.t / 0.25 : r.t > r.seconds ? clamp(1 - (r.t - r.seconds) / 0.4, 0, 1) : 1);
        counter.setAlpha(blackout.alpha).setText(Math.round(distanceAt(r.kmh, Math.min(r.t, r.seconds))) + ' m');
        st.drift = -Math.sin(k * Math.PI * 0.5) * 1.6;                       // drifting towards the edge
        if (r.t > r.seconds + 0.45) { run = null; blackout.setAlpha(0); counter.setAlpha(0); st.drift = 0; draw(); r.res(); return; }
      } else if (run) {
        const r = run, v = r.kmh / 3.6;
        r.t += dt;
        if (r.t < 0) st.pos += v * dt;                                       // approach until the hazard is first visible
        else {
          const tb = r.t - r.reactionS;
          let d;
          if (tb <= 0) d = v * r.t;
          else { if (!r.braking) { r.braking = true; brakeGlow.fillStyle(0xFF2A2A, 0.9); brakeGlow.fillCircle(car.x - car.displayWidth * 0.33, car.y - car.displayHeight * 0.5, 5); brakeGlow.fillCircle(car.x + car.displayWidth * 0.33, car.y - car.displayHeight * 0.5, 5); }
            const tt = Math.min(tb, v / r.decel); d = v * r.reactionS + v * tt - 0.5 * r.decel * tt * tt; }
          if (r.startPos == null) r.startPos = st.pos;   // where the hazard first became visible
          st.pos = r.startPos + d;
          if (!r.ok && d >= r.seeM - FREEZE) finish();
          else if (r.braking && d >= r.s.total - 0.01) finish();
        }
      } else if (swerveMode) {
        // hold still until the player chooses
      } else if (p.mode === 'scene' || !run) {
        st.pos += (st.kmh / 3.6) * dt * 0.35;                                // slow idle cruise
      }
      draw();
    },
    destroy() {}
  };
  // Head-on impact with the oncoming vehicle (restored from the original Speed drive).
  function collide(r) {
    // Severity follows the speed the player chose: 80 -> 0.33, 100 -> 0.67, 120 -> 1.
    const k = clamp((r.kmh - 60) / 60, 0.2, 1), x = car.x, y = car.y - car.displayHeight * 0.45;
    Sfx.init(scene); Sfx.impact(k);
    if (!REDUCE_MOTION) { scene.cameras.main.shake(300 + 200 * k, 0.008 + 0.016 * k); scene.cameras.main.flash(120 + 100 * k, 255, 240, 220); }
    deb.burst(x, y, Math.round(20 + 50 * k), 300 + 330 * k, -Math.PI / 2, Math.PI * 1.1);
    pop(scene, x, y, 3 + 2.5 * k, 1);
    scene.tweens.add({ targets: car, y: car.y + 6 + 12 * k, angle: -(3 + 7 * k), duration: 160 });
    scene.tweens.add({ targets: oncoming, angle: 2 + 6 * k, duration: 200 });
    oncoming.baseTint = lerpColor(0xFFFFFF, 0x6A6A6A, k);
    for (let i = 0; i < Math.round(4 + 8 * k); i++) {
      const sm = scene.add.image(x + (Math.random() - 0.5) * 120, y + Math.random() * 30, 'glow').setDepth(940).setTint(0x3A3A3A).setAlpha(0.55).setScale(0.3);
      scene.tweens.add({ targets: sm, y: sm.y - 120 - Math.random() * 90, x: sm.x + (Math.random() - 0.5) * 60, scale: 1.3 + Math.random() * 1.4, alpha: 0, duration: 1400 + Math.random() * 900, delay: i * 60, onComplete: () => sm.destroy() });
    }
    r.crashed = true;
  }
  function finishSwerve() {
    const r = run; if (!r) return;
    run = null;
    if (r.choice === 'brake') {
      animal.xm = 8.3; animal.hop = 0;
      hud.add(label(scene, a.x + a.w / 2, a.y + 22, t('art.road.lane'), 15, '#FFFFFF', { backgroundColor: '#1E6B45', padding: { x: 8, y: 4 } }));
    } else {
      st.drift = 3.6; if (!r.crashed) car.angle = 0;
      if (REDUCE_MOTION) oncoming.wz = st.pos + 16 + Z_R + CAR_LEN;
      hud.add(scene.add.rectangle(a.x, a.y, a.w, a.h, 0x05080D, 0.35).setOrigin(0));
      hud.add(label(scene, a.x + a.w / 2, a.y + 22, t(r.crashed ? 'art.road.headon' : 'art.road.oncoming', { kmh: r.kmh }), 15, '#FFFFFF', { backgroundColor: '#8E2A2D', padding: { x: 8, y: 4 } }));
    }
    draw();
    r.res();
  }
  function finish() {
    const r = run; if (!r) return;
    run = null;
    ruler(r.seeM, r.s.total, r.ok);
    if (!r.ok) { const dim = scene.add.rectangle(a.x, a.y, a.w, a.h, 0x05080D, 0.35).setOrigin(0); hud.addAt(dim, 0); }
    draw();
    r.res();
  }
  const m = clipTo(scene, c, a);
  inst.destroy = () => { c.destroy(); m.destroy(); };
  return inst;
}
