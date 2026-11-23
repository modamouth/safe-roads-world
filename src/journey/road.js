// ---------------------------------------------------------------------------
// The Journey Home: chase view of the B1, drawn in perspective from the leg
// simulation (sim.js). Same projection as the Learning Lab's rural road: a
// screen row y shows the road z metres ahead, where z = F * CAMH / (y - HY).
// Bends come from the road shape: the centre line z metres ahead sits
// shape.rel(s, z) metres to the side of where we are pointing.
//
//   const road = createRoad(scene, { leg, sim, lights });
//   road.update(dt)   every frame, after sim.step();   road.destroy()
// ---------------------------------------------------------------------------
import Phaser from 'phaser';
import { W, clamp, lerpColor, REDUCE_MOTION } from '../config.js';
import { QUALITY } from '../quality.js';
import { viewBounds } from '../ui.js';
import { sourceBounds } from '../imageAssets.js';
import { LEARNING_LAB_ASSETS as A } from '../lab/assets.js';
import { PARKED_VEHICLES } from '../worldArt.js';
import { pedestrianSet, setPedestrianPose } from '../lab/art/pedestrianArt.js';
import { ROAD, buildRoadShape, zoneAt } from './sim.js';
import { TAXI_RIDERS } from './route.js';

const CAMH = 5, Z_R = 22, CAR_LEN = 4.5, CAR_W = 1.85;
export const HORIZON = 360, CAR_Y = 812;
const SKY = { day: [0x6FA8DC, 0xD9ECF7], dusk: [0x253A6B, 0xF2A65A], night: [0x03060E, 0x141E33] };
const HAZE = { clear: 0xE6D7BE, rain: 0x7D8996 };
const VERGE = { day: [0xD6A04A, 0xCB9542], dusk: [0xB9813F, 0xAE7738], night: [0xB9813F, 0xAE7738] };
// The Khomas highland around Windhoek: dry khaki grass with patches of brown soil,
// thorn bush, gravel shoulders and rocky hills, rather than sand.
const LAND = {
  savanna: { verge: VERGE, soil: null, shoulder: 0xC8A98C, haze: 0xE6D7BE, hills: [0x8C7A60], bushes: 26, tufts: 0 },
  highland: {
    verge: { day: [0xB3A468, 0xA89A60], dusk: [0x8E7E4E, 0x857648], night: [0x8E7E4E, 0x857648] },
    soil: 0x9A7A55, shoulder: 0xA99C86, haze: 0xDCD9C8, hills: [0x8F9289, 0x6E6B4F], bushes: 15, tufts: 11
  }
};
// Tail lights sit lower on trucks: fraction of the image height up from the ground.
const TAIL_Y = { veh_rear_fuel_tanker: 0.25, veh_rear_box_trailer: 0.25 };
const WIDTHS = Object.assign(Object.fromEntries(PARKED_VEHICLES.map(p => [p.key, p.w])), { veh_rear_fuel_tanker: 2.5, veh_rear_box_trailer: 2.6 });
// Oncoming traffic, front views: texture, width across the mirrors (m), and where the
// headlights are (hx: from the centre, hy: up from the ground, both as a fraction of the image).
const FRONTS = {
  veh_taxi: { tex: 'veh_front_minibus_taxi', w: 2.1, hx: 0.38, hy: 0.36 },
  veh_sedan_white: { tex: 'veh_front_white_sedan', w: 1.95, hx: 0.35, hy: 0.45 },
  veh_truck: { tex: 'veh_front_truck', w: 2.9, hx: 0.35, hy: 0.22 },
  veh_bus: { tex: 'veh_front_bus', w: 3.1, hx: 0.35, hy: 0.17 },
  veh_police: { tex: 'veh_front_police_bakkie', w: 2.05, hx: 0.33, hy: 0.5 },
  veh_bakkie: { tex: 'img_truck', w: 2.0, hx: 0.36, hy: 0.4 }
};

/** Drawn front-view car for oncoming traffic when no artwork is loaded. */
function frontTexture(scene) {
  if (scene.textures.exists('jh_front')) return 'jh_front';
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  g.fillStyle(0x0D1117, 1); g.fillRoundedRect(14, 96, 30, 30, 6); g.fillRoundedRect(156, 96, 30, 30, 6);
  g.fillStyle(0xD8DEE6, 1); g.fillRoundedRect(36, 10, 128, 60, { tl: 22, tr: 22, bl: 4, br: 4 });
  g.fillStyle(0xEEF1F5, 1); g.fillRoundedRect(8, 56, 184, 58, 12);
  g.fillStyle(0x1B2633, 1); g.fillRoundedRect(48, 20, 104, 40, { tl: 14, tr: 14, bl: 3, br: 3 });
  g.fillStyle(0xFFF6D0, 1); g.fillRoundedRect(16, 70, 34, 16, 6); g.fillRoundedRect(150, 70, 34, 16, 6);
  g.fillStyle(0x2B3440, 1); g.fillRoundedRect(70, 78, 60, 18, 4); g.fillRoundedRect(12, 100, 176, 14, 5);
  g.generateTexture('jh_front', 200, 128); g.destroy();
  return 'jh_front';
}

/** Simple cattle silhouette when the illustrated cow isn't loaded. */
function cowTexture(scene) {
  if (scene.textures.exists('jh_cow')) return 'jh_cow';
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  g.fillStyle(0x5A4030, 1);
  g.fillEllipse(62, 50, 104, 50); g.fillRect(20, 58, 12, 48); g.fillRect(92, 58, 12, 48); g.fillRect(38, 64, 11, 42); g.fillRect(74, 64, 11, 42);
  g.fillEllipse(118, 40, 30, 26); g.fillStyle(0xE8E2D6, 1); g.fillTriangle(110, 30, 102, 18, 114, 28); g.fillTriangle(126, 28, 134, 16, 122, 30);
  g.generateTexture('jh_cow', 140, 108); g.destroy();
  return 'jh_cow';
}

/** Simple standing figure when the illustrated pedestrians aren't loaded. */
function personTexture(scene) {
  if (scene.textures.exists('jh_person')) return 'jh_person';
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  g.fillStyle(0x2F3B4C, 1); g.fillCircle(20, 12, 10); g.fillRoundedRect(8, 24, 24, 38, 8);
  g.fillStyle(0x1E2733, 1); g.fillRect(10, 58, 8, 38); g.fillRect(22, 58, 8, 38);
  g.generateTexture('jh_person', 40, 96); g.destroy();
  return 'jh_person';
}

/** A clump of dry grass for the highland verges. */
function tuftTexture(scene) {
  if (scene.textures.exists('jh_tuft')) return 'jh_tuft';
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  [[0xC9B877, 4], [0xB8A262, 12], [0xD8C98A, 20], [0xA89458, 28], [0xC4B06C, 36]].forEach(([col, x], i) => {
    g.lineStyle(3, col, 1);
    g.beginPath(); g.moveTo(20, 30); g.lineTo(x, 4 + (i % 2) * 6); g.strokePath();
    g.beginPath(); g.moveTo(20 + (i - 2) * 2, 30); g.lineTo(x + 3, 10 + (i % 3) * 4); g.strokePath();
  });
  g.generateTexture('jh_tuft', 40, 32); g.destroy();
  return 'jh_tuft';
}

/** A traffic cone, about 0.75 m tall. */
function coneTexture(scene) {
  if (scene.textures.exists('jh_cone')) return 'jh_cone';
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  g.fillStyle(0x2A2A2A, 1); g.fillRect(0, 50, 40, 6);
  g.fillStyle(0xF26A1B, 1); g.fillTriangle(20, 0, 36, 50, 4, 50);
  g.fillStyle(0xFFFFFF, 1); g.fillTriangle(20, 14, 27, 30, 13, 30);
  g.generateTexture('jh_cone', 40, 56); g.destroy();
  return 'jh_cone';
}

/** The flagman's Stop/Go board on its pole; `setGo(true)` turns it round to GO. */
function stopGoBoard(scene) {
  const c = scene.add.container(0, 0), g = scene.add.graphics(), M = 60, y = -1.6 * M - 26;
  const txt = (str, col) => scene.add.text(0, y, str, { fontFamily: 'Arial, sans-serif', fontSize: '17px', color: col, fontStyle: 'bold', resolution: QUALITY.textRes }).setOrigin(0.5);
  const stop = txt('STOP', '#FFFFFF'), go = txt('GO', '#FFFFFF').setVisible(false);
  c.add([g, stop, go]);
  c.setGo = on => {
    g.clear();
    g.fillStyle(0x6B6B6B, 1); g.fillRect(-2, -1.6 * M, 4, 1.6 * M);
    g.fillStyle(on ? 0x1E9E52 : 0xD93A3F, 1); g.fillCircle(0, y, 28); g.lineStyle(3, 0xFFFFFF, 1); g.strokeCircle(0, y, 25);
    stop.setVisible(!on); go.setVisible(on);
  };
  c.setGo(false);
  c.metres = 1 / M;
  return c;
}

/** A roadside sign as a container drawn at 60 px per metre, standing on its post's foot (0, 0). */
function makeSign(scene, kind, text) {
  const c = scene.add.container(0, 0), g = scene.add.graphics(), M = 60;
  const txt = (y, str, size, color, o) => scene.add.text(0, y, str, Object.assign({ fontFamily: 'Arial, sans-serif', fontSize: size + 'px', color, fontStyle: 'bold', resolution: QUALITY.textRes }, o || {})).setOrigin(0.5);
  g.fillStyle(0x8A94A0, 1); g.fillRect(-3, -2.2 * M, 6, 2.2 * M);
  const parts = [g];
  if (kind === 'limit') {
    const y = -2.2 * M - 34;
    g.fillStyle(0xFFFFFF, 1); g.fillCircle(0, y, 38); g.lineStyle(9, 0xD93A3F, 1); g.strokeCircle(0, y, 33);
    parts.push(txt(y, text, 30, '#111111'));
  } else if (kind === 'town') {
    const w = Math.max(150, text.length * 17 + 30), y = -2.2 * M - 30;
    g.fillRect(-w / 2 + 10, -2.2 * M, 6, 2.2 * M); g.fillRect(w / 2 - 16, -2.2 * M, 6, 2.2 * M);
    g.fillStyle(0x1E6B45, 1); g.fillRoundedRect(-w / 2, y - 26, w, 52, 6); g.lineStyle(3, 0xFFFFFF, 1); g.strokeRoundedRect(-w / 2 + 4, y - 22, w - 8, 44, 4);
    parts.push(txt(y, text, 26, '#FFFFFF'));
  } else if (kind === 'rest') {
    const y = -2.2 * M - 34;
    g.fillStyle(0x1F5FA8, 1); g.fillRoundedRect(-60, y - 36, 120, 72, 8); g.lineStyle(3, 0xFFFFFF, 1); g.strokeRoundedRect(-55, y - 31, 110, 62, 5);
    parts.push(txt(y - 10, text || 'Rest area', 18, '#FFFFFF'), txt(y + 16, 'P', 22, '#FFFFFF'));
  } else {
    // Warning triangle with a plate underneath: roadworks, potholes, animals.
    const y = -2.2 * M - 20;
    g.fillStyle(kind === 'roadworks' ? 0xE8743B : 0xD93A3F, 1); g.fillTriangle(0, y - 70, 46, y + 8, -46, y + 8);
    g.fillStyle(kind === 'roadworks' ? 0xFFCB2B : 0xFFFFFF, 1); g.fillTriangle(0, y - 54, 33, y, -33, y);
    g.fillStyle(0x1B1B1B, 1); g.fillCircle(0, y - 22, 9); g.fillRect(-12, y - 14, 24, 8);
    g.fillStyle(0xFFFFFF, 1); g.fillRect(-58, y + 14, 116, 30); g.lineStyle(2, 0x1B1B1B, 1); g.strokeRect(-58, y + 14, 116, 30);
    parts.push(txt(y + 29, text, 16, '#111111'));
  }
  c.add(parts);
  c.metres = 1 / M;
  return c;
}

export function createRoad(scene, o) {
  const { leg, sim } = o, st = sim.st, ents = sim.ents;
  const v = viewBounds(scene), a = { x: v.left, y: v.top, w: v.width, h: v.height };
  const HY = HORIZON, VPX = W / 2, F = (CAR_Y - HY) * Z_R / CAMH;
  const shape = buildRoadShape(leg);
  const time = leg.time, night = time === 'night', rain = leg.weather === 'rain';
  const land = LAND[leg.land] || LAND.savanna, haze = rain ? HAZE.rain : land.haze;
  const seeM = night ? (o.lights === false ? 60 : 105) : rain ? 220 : 500;
  const ART = k => scene.textures.exists(k);

  const c = scene.add.container(0, 0).setDepth(o.depth || 0);
  const sky = scene.add.graphics().setDepth(-1e6), hills = scene.add.graphics().setDepth(-1e6 + 1);
  const road = scene.add.graphics().setDepth(-1e6 + 2), marks = scene.add.graphics().setDepth(-1e6 + 3);
  c.add([sky, hills, road, marks]);

  // --- sprites -------------------------------------------------------------
  const sprites = [];
  const add = (tex, s, xm, sizeM, by, extra) => {
    if (!ART(tex)) return null;
    const im = scene.add.image(0, 0, tex).setOrigin(0.5, 1).setVisible(false);
    Object.assign(im, { ws: s, xm, sizeM, by: by || 'h', baseTint: 0xFFFFFF }, extra || {});
    c.add(im); sprites.push(im); return im;
  };
  // Decorative scenery is a pool that recycles SPAN metres ahead once passed.
  const SPAN = 640, dens = QUALITY.density, decor = [];
  const tree = ART('scn_acacia') ? 'scn_acacia' : 'acacia', shrub = ART('scn_bush') ? 'scn_bush' : 'bush', post = ART('img_post') ? 'img_post' : 'post';
  const deco = (tex, s, xm, size, tint, flip) => { const im = add(tex, s, xm, size, 'h', { decor: true }); if (im) { im.baseTint = tint; if (flip) im.setFlipX(true); decor.push(im); } };
  for (let s = 30; s < SPAN; s += 38 / dens) { deco(tree, s, -9 - (s * 7) % 7, 7, tree === 'acacia' ? 0x8A7A5E : 0xFFFFFF); deco(tree, s + 19, 10 + (s * 3) % 6, 7, tree === 'acacia' ? 0x8A7A5E : 0xFFFFFF, true); }
  for (let s = 12; s < SPAN; s += land.bushes / dens) { deco(shrub, s, -5.4 - (s % 3), 1.6, shrub === 'bush' ? 0x9A8A5E : 0xFFFFFF); deco(shrub, s + 11, 5.6 + (s % 4), 1.6, shrub === 'bush' ? 0x9A8A5E : 0xFFFFFF, true); }
  if (land.tufts) {
    const tuft = tuftTexture(scene);
    for (let s = 5; s < SPAN; s += land.tufts / dens) { deco(tuft, s, -ROAD.EDGE - 1.4 - (s * 13) % 6, 0.5, 0xFFFFFF); deco(tuft, s + 6, ROAD.EDGE + 1.4 + (s * 7) % 6, 0.5, 0xFFFFFF, true); }
  }
  for (let s = 10; s < SPAN; s += 32) { deco(post, s, -ROAD.EDGE - 0.7, 1.1, 0xFFFFFF); deco(post, s + 16, ROAD.EDGE + 0.7, 1.1, 0xFFFFFF, post === 'img_post'); }

  // Street lamps through towns (the first and last 60 km/h zones).
  const lamps = [];
  leg.zones.forEach((z, i) => {
    if (!z.sign || !z.sign.startsWith('town:')) return;
    const end = (leg.zones[i + 1] || { at: leg.length + 400 }).at;
    for (let s = z.at + 20; s < end; s += 45) { const l = add(ART('scn_lamp') ? 'scn_lamp' : 'post', s, -ROAD.EDGE - 1.4, ART('scn_lamp') ? 6 : 1.1, 'h'); if (l) lamps.push(l); }
  });

  // Signs: every limit change, town boards, roadworks/pothole warnings, the rest area.
  const signs = [];
  const sign = (kind, s, text, side) => {
    const sg = makeSign(scene, kind, text);
    Object.assign(sg, { ws: s, xm: (side || -1) * (ROAD.EDGE + 1.6), sizeM: 1, isSign: true, baseTint: 0xFFFFFF });
    sg.setVisible(false); c.add(sg); sprites.push(sg); signs.push(sg);
  };
  leg.zones.forEach((z, i) => {
    if (z.sign && z.sign.startsWith('town:')) sign('town', z.at - 30, z.sign.slice(5));
    if (z.sign === 'roadworks') sign('warn', z.at - 60, 'Roadworks');
    if (z.sign === 'potholes') sign('warn', z.at - 60, 'Potholes');
    if (i === 0 || z.limit !== leg.zones[i - 1].limit) sign('limit', z.at, String(z.limit));
  });
  if (leg.rest != null) { sign('rest', leg.rest - 400, 'Rest 400 m'); sign('rest', leg.rest - 40, 'Rest area'); }
  leg.animals.forEach(an => { if (!an.verge) sign('warn', an.at - 260, an.kind === 'kudu' ? 'Kudu' : 'Livestock'); });
  ents.crossings.forEach(p => sign('warn', p.s - 120, 'Pedestrians'));
  const sg = ents.stopGo;
  if (sg) sign('warn', sg.at - 120, 'Stop/Go');

  // Vehicles and animals from the simulation.
  const vehKey = k => (ART(k) ? k : 'carRear');
  const leadIms = ents.leads.map(l => add(vehKey(l.key), l.s, l.x, WIDTHS[l.key] || CAR_W, 'w', { ent: l, kind: 'lead' }));
  leadIms.forEach((im, i) => { if (im && im.texture.key === 'carRear') im.baseTint = [0x6D8FC7, 0xD8D2C4, 0xC75A4A][i % 3]; });
  const oncomingPool = [];
  // Warthog frames share one canvas, so the feet stay put when they swap; the leap is mid-air.
  const HOG = A.animals.warthog, HOG_RUN = [HOG.runA, HOG.leap, HOG.runB, HOG.leap].map(f => f.key), HOG_GROUND = 912 / 941;
  const animalTex = an => {
    if (an.kind === 'warthog') return ART(HOG.standing.key) ? HOG.standing.key : cowTexture(scene);
    if (an.kind === 'kudu') return ART('scn_kudu') ? 'scn_kudu' : 'kudu';
    if (an.kind === 'cattle') return ART(A.animals.cow.key) ? A.animals.cow.key : cowTexture(scene);
    if (ART(A.animals.donkey.key)) {
      // Ignore empty padding in the supplied donkey without editing its PNG.
      const tx = scene.textures.get(A.animals.donkey.key);
      if (!tx.has('animal')) { const [l, t, r, b] = sourceBounds(scene, A.animals.donkey.key, A.animals.donkey.bounds); tx.add('animal', 0, l, t, r - l, b - t); }
      return A.animals.donkey.key;
    }
    return cowTexture(scene);
  };
  const animalIms = ents.animals.map(an => {
    const hog = an.kind === 'warthog';
    const key = animalTex(an), im = add(key, an.s, an.x, hog ? (an.young ? 1.15 : 1.75) : an.kind === 'kudu' ? (key === 'scn_kudu' ? 2.6 : 2.8) : an.kind === 'cattle' ? 2.3 : 1.4,
      hog || (an.kind === 'kudu' && key !== 'scn_kudu') || an.kind === 'cattle' ? 'w' : 'h', { ent: an, kind: 'animal' });
    if (im && hog && key === HOG.standing.key) im.setOrigin(0.5, HOG_GROUND);
    if (im && key === A.animals.donkey.key) im.setFrame('animal');
    if (im && an.kind === 'kudu' && key === 'scn_kudu') im.referenceHeight = im.height;
    return im;
  });

  // People: at the zebra crossings, walking on the road edge, waiting for a taxi, the flagman.
  // The art walks to the right; flip it for people heading right-to-left.
  const person = (who, s, x, extra) => {
    const poses = pedestrianSet(scene, who);
    const im = add(poses ? poses[0].key : personTexture(scene), s, x, who === 'schoolgirl' ? 1.45 : 1.7, 'h', Object.assign({ kind: 'ped', poses }, extra));
    if (im && poses) setPedestrianPose(im, poses[0]);
    return im;
  };
  const pedIms = ents.crossings.map(p => { const im = person(p.who, p.s, p.x, { ent: p }); if (im) im.setFlipX(p.from > 0); return im; });
  const walkerIms = ents.walkers.map(w => person(w.who, w.s, w.x, { ent: w }));
  ents.leads.filter(l => l.parked).forEach(l => TAXI_RIDERS.forEach((who, i) => person(who, l.at + 1.5 + i * 2.2, -ROAD.EDGE - 2 - i * 0.5, { taxi: l })));
  let board = null;
  if (sg) {
    person('worker', sg.at + 1, -ROAD.EDGE - 1.3);
    board = stopGoBoard(scene);
    Object.assign(board, { ws: sg.at + 1, xm: -ROAD.EDGE - 0.7, sizeM: 1, isSign: true, baseTint: 0xFFFFFF });
    board.setVisible(false); c.add(board); sprites.push(board);
    // Cones along the centre line where the oncoming lane is closed.
    for (let s = sg.at + 14; s <= sg.at + sg.length; s += 7) add(coneTexture(scene), s, 0.3, 0.75, 'h');
  }

  const glowLayer = scene.add.graphics(); c.add(glowLayer);
  const lights = [];
  const light = () => { const im = scene.add.image(0, 0, 'glow').setBlendMode(Phaser.BlendModes.ADD).setVisible(false); c.add(im); lights.push(im); return im; };

  // Player car and its brake lights.
  const carKey = ART('img_suv') && scene.registry.get('REAL') ? 'img_suv' : 'carRear';
  const car = scene.add.image(VPX, CAR_Y, carKey).setOrigin(0.5, 1);
  car.setScale((CAR_W * F / Z_R) / car.width); c.add(car);
  const brake = scene.add.graphics(); c.add(brake);
  const fx = scene.add.graphics(); c.add(fx);

  // Screen overlays: fatigue vignette, eyelids, the phone.
  const vig = scene.add.image(a.x, a.y, 'vig').setOrigin(0).setDisplaySize(a.w, a.h).setAlpha(0); c.add(vig);
  const lids = scene.add.graphics(); c.add(lids);
  const phone = scene.add.container(VPX, (HY + CAR_Y) / 2).setVisible(false); c.add(phone);
  const phoneBg = scene.add.rectangle(0, 0, a.w, a.h, 0x05080D, 0.78);
  const phoneG = scene.add.graphics();
  phoneG.fillStyle(0x111820, 1); phoneG.fillRoundedRect(-90, -170, 180, 340, 26);
  phoneG.fillStyle(0x2A3B52, 1); phoneG.fillRoundedRect(-80, -150, 160, 300, 16);
  phoneG.fillStyle(0xFFFFFF, 0.92); phoneG.fillRoundedRect(-70, -110, 140, 64, 12);
  phoneG.fillStyle(0x5FD0E0, 1); phoneG.fillRoundedRect(-70, -30, 110, 40, 12);
  phone.add([phoneBg, phoneG]);

  const camS = () => st.s - Z_R - CAR_LEN;
  const ahead = z => z - Z_R - CAR_LEN;   // metres in front of our bumper
  const vis = d => {
    if (night) return clamp(1 - (d - seeM * 0.9) / (seeM * 0.25), 0.03, 1);
    if (rain) return clamp(1 - (d - seeM * 0.7) / (seeM * 0.6), 0.1, 1);
    return 1;
  };
  const dark = night ? 0x04060B : haze;

  function drawSky() {
    sky.clear();
    const [top, hor] = SKY[time];
    sky.fillGradientStyle(top, top, rain ? 0x56616E : hor, rain ? 0x56616E : hor, 1); sky.fillRect(a.x, a.y, a.w, HY - a.y + 4);
    if (time === 'dusk') { sky.fillStyle(0xFFD27A, 0.9); sky.fillCircle(VPX + 120, HY - 14, 26); sky.fillStyle(0xFFB347, 0.25); sky.fillCircle(VPX + 120, HY - 14, 60); }
    if (night && !rain) { sky.fillStyle(0xFFFFFF, 0.7); for (let i = 0; i < 60; i++) sky.fillCircle(a.x + ((i * 137) % a.w), a.y + ((i * 71) % (HY - a.y - 20)), (i % 3) * 0.4 + 0.5); }
  }

  function drawHills(cs) {
    hills.clear();
    // By day the highland has a pale far ridge behind rocky olive hills; otherwise one row of hills.
    const layers = night ? [0x0A111D] : time === 'dusk' ? [0x3B2E3A] : land.hills;
    layers.forEach((col, li) => {
      const far = layers.length > 1 && li === 0, span = far ? 300 : 220, rocky = layers.length > 1;
      const shift = -shape.heading(cs) * F * (far ? 0.15 : 0.25);
      hills.fillStyle(col, rain ? 0.5 : far ? 0.9 : 0.95);
      for (let i = -2; i < Math.ceil(a.w / span) + 3; i++) {
        const x = a.x + (((i * span + shift) % (span * 6)) + span * 6) % (span * 6) - span;
        const h = (far ? 40 : 18) + ((i * 37) % 5 + 5) % 5 * (far ? 9 : 6);
        if (!rocky) { hills.fillTriangle(x, HY + 1, x + span * 0.55, HY - h, x + span * 1.2, HY + 1); continue; }
        hills.fillPoints([{ x, y: HY + 1 }, { x: x + span * 0.25, y: HY - h * 0.55 }, { x: x + span * 0.4, y: HY - h * 0.7 }, { x: x + span * 0.55, y: HY - h },
          { x: x + span * 0.72, y: HY - h * 0.62 }, { x: x + span * 0.9, y: HY - h * 0.75 }, { x: x + span * 1.2, y: HY + 1 }], true);
      }
    });
  }

  function drawRoad(cs, camX) {
    const g = road; g.clear(); marks.clear();
    const bottom = a.y + a.h, vc = land.verge[time], L = a.x - 4, R = a.x + a.w + 4;
    // Rows get taller towards the bottom of the screen, where the road changes slowly.
    for (let y = HY + 1; y < bottom;) {
      const step = y - HY < 140 ? 2 : y - HY < 320 || QUALITY.density < 1 ? 3 : 4;
      const z = F * CAMH / (y + step / 2 - HY), k = F / z, ws = cs + z, d = ahead(z);
      const vv = vis(d), fog = clamp((z - 40) / 500, 0, 1) * (rain ? 0.7 : 0.4);
      const shade = col0 => lerpColor(lerpColor(col0, haze, fog), dark, 1 - vv);
      const cx = VPX + (shape.rel(cs, z) - camX) * k;
      const X = m => clamp(cx + m * k, L, R);
      const fill = (x0, x1, col) => { if (x1 > x0) { g.fillStyle(col, 1); g.fillRect(x0, y, x1 - x0, step + 1); } };
      const line = (m0, m1, col) => { let x0 = cx + m0 * k, x1 = cx + m1 * k; if (x1 - x0 < 1) { const m = (x0 + x1) / 2; x0 = m - 0.5; x1 = m + 0.5; } fill(clamp(x0, L, R), clamp(x1, L, R), shade(col)); };
      // Side by side, never on top of each other: verge | shoulder | tar | shoulder | verge.
      const restBay = leg.rest != null && ws > leg.rest - 50 && ws < leg.rest + 110;
      const sL = X(-ROAD.EDGE - (restBay ? 4 : 1)), tL = X(-ROAD.EDGE - 0.15), tR = X(ROAD.EDGE + 0.15), sR = X(ROAD.EDGE + 1);
      const tone = col => { const v = shade(col); return night ? lerpColor(v, 0x04060B, 0.75) : v; };
      const verge = tone(Math.floor(ws / 14) & 1 ? vc[0] : vc[1]), shoulder = shade(land.shoulder);
      fill(L, sL, verge); fill(sL, tL, shoulder);
      fill(tL, tR, shade(lerpColor(Math.floor(ws / 8) & 1 ? 0x403E41 : 0x484547, 0x22262C, rain ? 0.35 : 0)));
      fill(tR, sR, shoulder); fill(sR, R, verge);
      // Patches of bare soil through the grass, a few metres out and different on each side.
      if (land.soil) {
        const patch = Math.floor(ws / 17), soil = tone(land.soil);
        if ((patch * 7) % 9 === 0) { const m = 3 + (patch * 5) % 6; fill(X(-ROAD.EDGE - m - 5), X(-ROAD.EDGE - m), soil); }
        if ((patch * 7 + 4) % 9 === 0) { const m = 3 + (patch * 3) % 7; fill(X(ROAD.EDGE + m), X(ROAD.EDGE + m + 5), soil); }
      }
      line(-ROAD.EDGE + 0.05, -ROAD.EDGE + 0.2, 0xFFCB2B); line(ROAD.EDGE - 0.2, ROAD.EDGE - 0.05, 0xFFCB2B);
      // Zebra crossing: this row spans [cs + zNear, cs + zFar], which can be metres wide far away.
      const zFar = F * CAMH / (y - HY), zNear = F * CAMH / (y + step - HY);
      const zebra = ents.crossings.some(p => cs + zNear < p.s + 2.2 && cs + zFar > p.s - 2.2);
      const band = (s0, s1) => cs + zNear < s1 && cs + zFar > s0;
      const works = sg && band(sg.at + 12, sg.at + sg.length + 4);
      if (works) fill(X(0.15), X(ROAD.EDGE - 0.25), shade(0x8A6B4A));
      if (sg && band(sg.at - 0.4, sg.at + 0.2)) line(-ROAD.EDGE + 0.2, -0.15, 0xF4F4F4);
      if (zebra) for (let m = -ROAD.EDGE + 0.35; m < ROAD.EDGE - 0.3; m += 0.9) line(m, m + 0.5, 0xF4F4F4);
      else if (works) line(-0.07, 0.07, 0xF2F2F2);
      else if (zoneAt(leg, ws).noOvertake) { line(-0.2, -0.06, 0xF2F2F2); line(0.06, 0.2, 0xF2F2F2); }
      else if ((((ws % 12) + 12) % 12) < 4) line(-0.07, 0.07, 0xF2F2F2);
      // Rain reflections of the lights at night.
      if (rain && night && (y % 9 < step)) { g.fillStyle(0xFFF2B0, 0.04 * vv); g.fillRect(tL, y, tR - tL, 1); }
      y += step;
    }
    // Potholes, drawn onto the road surface.
    ents.potholes.forEach(p => {
      const z = p.s - cs;
      if (z < 6 || z > 260) return;
      const k = F / z, x = VPX + (shape.rel(cs, z) + p.x - camX) * k, y = HY + F * CAMH / z, vv = vis(ahead(z));
      marks.fillStyle(lerpColor(0x1A1714, dark, 1 - vv), 1); marks.fillEllipse(x, y, p.r * 2 * k, p.r * 0.7 * k);
      if (rain) { marks.fillStyle(lerpColor(0x7D8996, dark, 1 - vv), 0.7); marks.fillEllipse(x, y - p.r * 0.05 * k, p.r * 1.4 * k, p.r * 0.4 * k); }
    });
    // Our headlight beam at night.
    if (night) {
      const reach = Math.min(seeM, 160), yR = HY + F * CAMH / (reach + Z_R + CAR_LEN);
      marks.fillStyle(0xFFF2B0, 0.07); marks.fillTriangle(VPX - a.w * 0.32, CAR_Y, VPX + a.w * 0.32, CAR_Y, VPX + (shape.rel(cs, reach) - camX) * F / reach * 0.7, yR);
    }
  }

  function project(im, cs, camX) {
    const z = im.ws - cs;
    if (z < 4 || z > 620) { im.setVisible(false); return null; }
    const k = F / z, x = VPX + (shape.rel(cs, z) + im.xm - camX) * k, y = HY + F * CAMH / z - (im.hop || 0) * k;
    im.setVisible(true).setPosition(x, y).setDepth(-z);
    if (im.isSign) im.setScale(k * im.metres);
    else im.setScale(im.sizeM * k / (im.by === 'w' ? im.width : (im.referenceHeight || im.height)));
    return { z, k, x, y, vv: vis(ahead(z)) };
  }

  function drawSprites(cs, camX) {
    glowLayer.clear(); lights.forEach(l => l.setVisible(false));
    let li = 0;
    const lightAt = (x, y, scale, alpha, tint) => { const l = lights[li] || light(); li++; l.setVisible(true).setPosition(x, y).setScale(scale).setAlpha(alpha).setTint(tint || 0xFFFFFF); };

    decor.forEach(im => { if (im.ws - cs < 4) im.ws += SPAN; });
    leadIms.forEach(im => { if (im) { im.ws = im.ent.s; im.xm = im.ent.x; im.setVisible(!im.ent.gone); } });
    animalIms.forEach(im => {
      if (!im) return;
      const an = im.ent; im.ws = an.s; im.xm = an.x; im.hop = an.hop || 0;
      if (an.kind === 'kudu' && ART('scn_kudu_leap')) im.setTexture(im.hop > 0.15 ? 'scn_kudu_leap' : 'scn_kudu');
      if (an.kind === 'warthog' && ART(HOG.standing.key)) {
        const running = an.runT > 0 && Math.abs(an.x) < 16 && !REDUCE_MOTION;
        im.setTexture(running ? HOG_RUN[Math.floor(an.runT / 0.09) % 4] : HOG.standing.key);
        im.setVisible(Math.abs(an.x) < 16);
      }
      im.setFlipX(an.side > 0);
    });
    const walking = (im, on, t) => { if (im.poses) setPedestrianPose(im, im.poses[on && !REDUCE_MOTION ? 1 + Math.floor(t / 0.35) % 2 : 0]); };
    pedIms.forEach(im => { if (im) { im.xm = im.ent.x; walking(im, im.ent.state === 'crossing', im.ent.walkT); } });
    walkerIms.forEach(im => { if (im) { im.ws = im.ent.s; walking(im, im.ent.state !== 'hit', im.ent.walkT); } });
    if (board) board.setGo(sg.phase === 'go');
    // Oncoming vehicles reuse a small pool of images.
    ents.oncoming.forEach((on, i) => {
      let im = oncomingPool[i];
      if (!im) { im = scene.add.image(0, 0, frontTexture(scene)).setOrigin(0.5, 1); Object.assign(im, { by: 'w', baseTint: 0xFFFFFF }); c.add(im); oncomingPool.push(im); }
      // Front-view artwork where it loaded; otherwise the drawn car.
      const f = FRONTS[on.key] && ART(FRONTS[on.key].tex) ? FRONTS[on.key] : { tex: frontTexture(scene), w: 1.85, hx: 0.36, hy: 0.4 };
      if (im.texture.key !== f.tex) im.setTexture(f.tex);
      Object.assign(im, { ws: on.s, xm: on.x, sizeM: f.w, ent: on, front: f });
    });
    oncomingPool.forEach((im, i) => { if (i >= ents.oncoming.length) im.setVisible(false); });

    [...sprites, ...oncomingPool.slice(0, ents.oncoming.length)].forEach(im => {
      if (im.ent && (im.ent.gone || (im.kind === 'ped' && im.ent.state === 'hit'))) { im.setVisible(false); return; }
      // Passengers climb in when their taxi pulls away.
      if (im.taxi && im.taxi.phase !== 'parked') { im.setVisible(false); return; }
      const p = project(im, cs, camX);
      if (!p) return;
      const isAnimal = im.kind === 'animal', isVeh = im.kind === 'lead' || oncomingPool.includes(im);
      const lit = isAnimal || isVeh || im.isSign || im.kind === 'ped' || Math.abs(im.xm) < 6;
      const dim = night && !lit ? Math.max(0.75, 1 - p.vv) : 1 - p.vv;
      if (!im.isSign) im.setTint(lerpColor(im.baseTint, dark, dim));
      im.setAlpha(clamp(1.25 - p.z / 620, 0.2, 1));
      if (im.isSign) im.setAlpha(night ? clamp(p.vv + 0.15, 0.15, 1) : 1);
      // Beyond the headlights an animal is only eyeshine.
      if (isAnimal && night && p.vv < 0.5) {
        im.setAlpha(0.1);
        glowLayer.fillStyle(0xFFF6C8, 0.95);
        const dir = im.flipX ? -1 : 1, ex = p.x + dir * im.displayWidth * 0.38, ey = p.y - im.displayHeight * 0.75;
        glowLayer.fillCircle(ex - 2 * p.k * 0.05, ey, Math.max(1.2, p.k * 0.06)); glowLayer.fillCircle(ex + 2 * p.k * 0.05, ey, Math.max(1.2, p.k * 0.06));
      }
      // Lights: oncoming headlights, tail lights ahead, lamps at night.
      if (night || rain) {
        if (oncomingPool.includes(im)) {
          const hx = im.displayWidth * im.front.hx, hy = p.y - im.displayHeight * im.front.hy, sc = clamp(p.k * 0.05, 0.08, 1.6);
          lightAt(p.x - hx, hy, sc, 0.9, 0xFFF6D8); lightAt(p.x + hx, hy, sc, 0.9, 0xFFF6D8);
        } else if (im.kind === 'lead') {
          const hx = im.displayWidth * 0.38, hy = p.y - im.displayHeight * (TAIL_Y[im.texture.key] || 0.45), sc = clamp(p.k * (im.ent.braking ? 0.03 : 0.018), 0.05, 0.8);
          lightAt(p.x - hx, hy, sc, im.ent.braking ? 1 : 0.7, 0xFF3030); lightAt(p.x + hx, hy, sc, im.ent.braking ? 1 : 0.7, 0xFF3030);
        } else if (lamps.includes(im) && im.texture.key === 'scn_lamp') {
          lightAt(p.x + im.displayWidth * 0.3, p.y - im.displayHeight * 0.96, clamp(p.k * 0.06, 0.1, 1.4), 0.8, 0xFFD58A);
        }
      } else if (im.kind === 'lead' && im.ent.braking) {
        const hx = im.displayWidth * 0.38, hy = p.y - im.displayHeight * (TAIL_Y[im.texture.key] || 0.45);
        glowLayer.fillStyle(0xFF2A2A, 1); glowLayer.fillCircle(p.x - hx, hy, Math.max(2, p.k * 0.12)); glowLayer.fillCircle(p.x + hx, hy, Math.max(2, p.k * 0.12));
      }
    });
    c.sort('depth');
    [glowLayer, ...lights, car, brake, fx, vig, lids, phone].forEach(x => c.bringToTop(x));
  }

  let blinkT = 0, bump = 0;
  function drawCar(dt) {
    const camX = st.x * 0.85, kc = F / Z_R;
    bump = st.rumble && !REDUCE_MOTION ? Math.sin(st.t * 60) * 2 : 0;
    car.setPosition(VPX + (st.x - camX) * kc, CAR_Y + bump).setAngle(REDUCE_MOTION ? 0 : st.steer * 3 + (st.drifting ? Math.sign(st.x - ROAD.LANE) * 1.5 : 0));
    brake.clear();
    if (st.braking) {
      const hx = car.displayWidth * 0.36, hy = car.y - car.displayHeight * 0.5;
      brake.fillStyle(0xFF2A2A, 0.9); brake.fillCircle(car.x - hx, hy, 6); brake.fillCircle(car.x + hx, hy, 6);
      if (night) { brake.fillStyle(0xFF2A2A, 0.2); brake.fillCircle(car.x - hx, hy, 18); brake.fillCircle(car.x + hx, hy, 18); }
    }
    return camX;
  }

  function drawOverlays(dt) {
    fx.clear();
    if (rain) {
      fx.lineStyle(1.2, 0xDDE6F0, 0.4);
      const n = Math.round(46 * QUALITY.density), sp = 600 + st.v * 12;
      for (let i = 0; i < n; i++) { const x = a.x + ((i * 97 + st.t * 140) % a.w), y = a.y + ((i * 53 + st.t * sp) % a.h); fx.lineBetween(x, y, x - 3, y + 14); }
    }
    // Tiredness: the edges darken, eyelids droop and blinks get long.
    const f = st.fatigue;
    vig.setAlpha(clamp((f - 35) / 65, 0, 0.9));
    blinkT += dt;
    let close = clamp((f - 60) / 40, 0, 1) * 0.18;
    if (f >= 50) { const period = 5.5 - (f - 50) / 20, ph = blinkT % period; if (ph < 0.32) close = Math.max(close, Math.sin(ph / 0.32 * Math.PI) * (0.4 + (f - 50) / 100)); }
    if (st.asleep) close = 1;
    lids.clear();
    if (close > 0.01) {
      const hgt = a.h / 2 * close;
      lids.fillStyle(0x000000, 1); lids.fillRect(a.x, a.y, a.w, hgt); lids.fillRect(a.x, a.y + a.h - hgt, a.w, hgt);
    }
    phone.setVisible(st.distracted);
  }

  drawSky();
  const inst = {
    update(dt) {
      const cs = camS(), camX = drawCar(dt);
      drawHills(cs); drawRoad(cs, camX); drawSprites(cs, camX); drawOverlays(dt);
    },
    destroy() { c.destroy(); }
  };
  inst.update(0);
  return inst;
}
