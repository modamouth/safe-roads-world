// Top-down multi-lane road around a truck (left-hand traffic, everyone driving
// up the screen). World units are metres: x across (0 = truck lane centre,
// left negative), y along (0 = front of the cab).
//   params: { indicating, car: true, carY, numbers, zones: [1,2,3,4] shown from the start }
//   place:      the car moves along the lane to the truck's left (y)
//   toScreen:   metres -> design px, for hotspot items
//   drawItems:  draws road users ({ kind: car|van|moto|bike|ped|taxi, color }) with marks
//   highlight:  zone id (1..4) or null; reveal(): shows the left blind spot
import { COLORS as C, REDUCE_MOTION } from '../../config.js';
import { LEARNING_LAB_ASSETS as A } from '../assets.js';
import { TopDownArt } from './topDown.js';
import { clipTo, label, col } from './common.js';

// The driver sits on the right, so the biggest blind spot is on the left.
// Shapes are illustrative, based on common heavy-vehicle guidance.
export const ZONES = [
  { id: 1, label: [-7.5, -4], pts: [[-1.4, 0.3], [-11, 0.3], [-11, -12.5], [-1.4, -1.2]] },
  { id: 2, label: [6.2, -4.4], pts: [[1.4, 0], [10, -4.5], [10, -11], [1.4, -1.5]] },
  { id: 3, label: [0, 1.7], pts: [[-1.3, 0.2], [1.3, 0.2], [1.8, 3.2], [-1.8, 3.2]] },
  { id: 4, label: [0, -19.1], pts: [[-1.3, -16.4], [1.3, -16.4], [1.3, -21.8], [-1.3, -21.8]] }
];
const LANE = 3.5, TRUCK_W = 2.5, CAB_L = 2.6, TRUCK_L = 16.2;
const SIZE = { car: [1.8, 4.4], taxi: [1.9, 5.2], van: [2.0, 6.5], moto: [0.8, 2.0], bike: [0.6, 1.8], ped: [0.8, 1.8] };

export function inPoly(x, y, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export default function create(scene, parent, p, a) {
  const c = scene.add.container(0, 0); parent.add(c);
  const S = Math.min(17, a.w / 26), X0 = a.x + a.w / 2, Y0 = a.y + a.h * 0.3;
  const b = A.topDown.tanker.bounds;
  // Compress schematic depth consistently for the supplied rigid tanker.
  // Hotspots and zone polygons use this same transform; artwork is not stretched.
  const SY = scene.textures.exists(A.topDown.tanker.key) ? S * TRUCK_W * (b[3] - b[1]) / ((b[2] - b[0]) * TRUCK_L) : S;
  const sx = x => X0 + x * S, sy = y => Y0 - y * SY;
  const roadG = scene.add.graphics(), zoneG = scene.add.graphics(), userG = scene.add.graphics(), truckG = scene.add.graphics(), carG = scene.add.graphics();
  const labels = scene.add.container(0, 0);
  c.add([roadG, zoneG, userG, truckG, carG, labels]);
  const vehiclePics = scene.add.container(0, 0), userPics = scene.add.container(0, 0);
  c.addAt(userPics, 3); c.addAt(vehiclePics, 5); c.bringToTop(labels);
  const tankerArt = new TopDownArt(scene, vehiclePics), carArt = new TopDownArt(scene, vehiclePics), users = new TopDownArt(scene, userPics);
  const st = { scroll: 0, blink: false, t: 0, carY: p.carY != null ? p.carY : -4, car: p.car !== false, ring: null, zones: p.zones || [], hi: null, numbers: !!p.numbers };

  const drawRoad = () => {
    const g = roadG; g.clear();
    g.fillStyle(0x5E6670, 1); g.fillRoundedRect(a.x, a.y, a.w, a.h, 18);
    g.fillStyle(0x6B737D, 1); g.fillRect(sx(-8.75), a.y, 17.5 * S, a.h);
    g.fillStyle(0xB9B6AE, 0.8); g.fillRect(sx(-8.75) - 3, a.y, 3, a.h); g.fillRect(sx(8.75), a.y, 3, a.h);
    const off = (st.scroll * SY) % 40;
    g.fillStyle(0xF2F2F2, 0.75);
    [-5.25, -1.75, 1.75, 5.25].forEach(x => { for (let y = a.y - 40 + off; y < a.y + a.h; y += 40) g.fillRect(sx(x) - 1.5, y, 3, 20); });
  };
  const drawTruck = () => {
    const g = truckG; g.clear(); tankerArt.begin();
    const photo = tankerArt.draw(A.topDown.tanker.key, sx(0), sy(-TRUCK_L / 2), TRUCK_W * S, TRUCK_L * SY);
    if (photo) {
      if (p.indicating) { g.fillStyle(0xFFB020, st.blink ? 1 : .25); g.fillCircle(sx(-TRUCK_W / 2), sy(-.4), 4); g.fillCircle(sx(-TRUCK_W / 2), sy(-TRUCK_L + .4), 4); }
      return;
    }
    const w = TRUCK_W * S, x = sx(-TRUCK_W / 2);
    g.fillStyle(0x000000, 0.25); g.fillRoundedRect(x + 3, sy(0) + 4, w, TRUCK_L * S, 6);
    g.fillStyle(0xC9CED6, 1); g.fillRoundedRect(x, sy(-3.0), w, (TRUCK_L - 3.0) * S, 4);   // fuel tanker barrel
    g.fillStyle(0xE3E6EA, 1); g.fillRoundedRect(x + 4, sy(-3.0) + 4, w - 8, (TRUCK_L - 3.0) * S - 8, 10);
    g.fillStyle(0xF4F5F6, 1); g.fillRoundedRect(x, sy(0), w, CAB_L * S, { tl: 12, tr: 12, bl: 3, br: 3 });
    g.fillStyle(0x24364B, 0.95); g.fillRoundedRect(x + 5, sy(0) + 6, w - 10, 9, 3);
    g.fillStyle(0x3B3F46, 1); g.fillRect(x - 7, sy(-0.5), 6, 9); g.fillRect(x + w + 1, sy(-0.5), 6, 9);
    if (p.indicating) {
      g.fillStyle(0xFFB020, st.blink ? 1 : 0.25);
      g.fillCircle(x + 3, sy(0) + 4, 4); g.fillCircle(x + 3, sy(-TRUCK_L) - 4, 4);
    }
  };
  const drawCar = () => {
    const g = carG; g.clear(); carArt.begin();
    if (!st.car) return;
    const cx = sx(-LANE), cy = sy(st.carY), w = 1.85 * S, l = 4.5 * SY;
    const photo = carArt.draw(A.topDown.redSedan.key, cx, cy, w, 4.5 * SY);
    if (!photo) {
    g.fillStyle(0x000000, 0.28); g.fillRoundedRect(cx - w / 2 + 2, cy - l / 2 + 3, w, l, 7);
    g.fillStyle(0xFFFFFF, 1); g.fillRoundedRect(cx - w / 2, cy - l / 2, w, l, 8);
    g.fillStyle(0x1D2733, 0.92); g.fillRoundedRect(cx - w * 0.38, cy - l * 0.3, w * 0.76, l * 0.14, 3);
    g.fillRoundedRect(cx - w * 0.34, cy + l * 0.24, w * 0.68, l * 0.1, 3);
    }
    if (st.ring) { g.lineStyle(3, st.ring, 1); g.strokeRoundedRect(cx - w / 2 - 5, cy - l / 2 - 5, w + 10, l + 10, 10); }
  };
  const drawZones = () => {
    const g = zoneG; g.clear(); labels.removeAll(true);
    ZONES.filter(z => st.zones.includes(z.id)).forEach(z => {
      const pts = z.pts.map(([x, y]) => ({ x: sx(x), y: sy(y) }));
      const hi = st.hi === z.id, dim = st.hi != null && !hi;
      g.fillStyle(hi ? C.yellow : 0xFFFFFF, hi ? 0.3 : dim ? 0.06 : 0.16); g.fillPoints(pts, true);
      g.lineStyle(2, hi ? C.yellow : 0xFFFFFF, dim ? 0.35 : 0.95); g.strokePoints(pts, true, true);
      if (st.numbers) {
        const lx = sx(z.label[0]), ly = sy(z.label[1]);
        g.fillStyle(hi ? C.yellow : C.navy, 1); g.fillCircle(lx, ly, 16);
        labels.add(label(scene, lx, ly, String(z.id), 20, hi ? '#0B1B2E' : '#FFFFFF'));
      }
    });
  };

  const inst = {
    toScreen: (x, y) => ({ x: sx(x), y: sy(y) }),
    // Hit boxes for hotspot items are sized from their kind.
    itemSize: kind => { const [w, l] = SIZE[kind] || SIZE.car; return { w: w * S, h: l * SY }; },
    drawItems(items, marks) {
      const g = userG; g.clear(); users.begin();
      items.forEach(it => {
        const kind = it.kind || 'car', [w, l] = SIZE[kind] || SIZE.car, cx = sx(it.x), cy = sy(it.y), body = col(it.color, 0x7B5CC9);
        const key = kind === 'taxi' ? A.topDown.taxi.key : kind === 'bike' ? A.topDown.cyclist.key : kind === 'ped' ? A.topDown.pedestrian.key : kind === 'car' && it.color === '#A93226' ? A.topDown.redSedan.key : '';
        if (users.draw(key, cx, cy, w * S, l * SY)) return;
        if (kind === 'car' || kind === 'van' || kind === 'taxi') {
          g.fillStyle(0x000000, 0.25); g.fillRoundedRect(cx - w * S / 2 + 2, cy - l * SY / 2 + 3, w * S, l * SY, 6);
          g.fillStyle(kind === 'taxi' ? 0xF2F2F2 : body, 1); g.fillRoundedRect(cx - w * S / 2, cy - l * SY / 2, w * S, l * SY, kind === 'car' ? 7 : 3);
          if (kind === 'taxi') { g.fillStyle(0x2E7D9A, 1); g.fillRect(cx - w * S / 2, cy - 2, w * S, 4); }
          g.fillStyle(0x1D2733, 0.9); g.fillRoundedRect(cx - w * S * 0.38, cy - l * SY * 0.3, w * S * 0.76, l * SY * 0.13, 3);
        } else if (kind === 'moto' || kind === 'bike') {
          g.fillStyle(0x222222, 1); g.fillRoundedRect(cx - 3, cy - l * SY / 2, 6, l * SY, 3);
          g.fillStyle(body, 1); g.fillRoundedRect(cx - 5, cy - 7, 10, 14, 4);
          g.fillStyle(kind === 'moto' ? 0xF2F2F2 : 0xFFCB2B, 1); g.fillCircle(cx, cy - 2, 4);
        } else { g.fillStyle(0xE8743B, 1); g.fillEllipse(cx, cy, 15, 9); g.fillStyle(0x2A1A12, 1); g.fillCircle(cx, cy, 4); }
      });
      if (marks && Object.keys(marks).length && !st.zones.length) { st.zones = [1, 2, 3, 4]; drawZones(); }
    },
    place: {
      get: () => st.carY,
      set: v => { st.carY = v; st.ring = C.teal; drawCar(); },
      valueAt: (px, py) => (Y0 - py) / SY
    },
    highlight(id) { st.hi = id == null ? null : Number(id); if (st.hi && !st.zones.length) st.zones = [1, 2, 3, 4]; st.numbers = true; drawZones(); },
    reveal(result) {
      st.zones = [1]; st.hi = 1; drawZones();
      st.ring = result === 'safe' ? C.green : result === 'ahead' ? 0xFFB020 : 0xFF8A1F; drawCar();
    },
    update(t, dt) {
      st.t += dt;
      if (!REDUCE_MOTION) st.scroll += 14 * dt;
      const b = Math.floor(st.t / 0.42) % 2 === 0;
      if (b !== st.blink) { st.blink = b; drawTruck(); }
      drawRoad();
    },
    destroy() {}
  };
  c.bringToTop(truckG); c.bringToTop(carG); c.bringToTop(labels);
  drawRoad(); drawTruck(); drawCar(); drawZones();
  const m = clipTo(scene, c, a);
  inst.destroy = () => { c.destroy(); m.destroy(); };
  return inst;
}
