// Vehicle safety pictograms.
//   params.view:
//     'side'  side view of a car; highlight(id) marks one feature:
//             'seatbelt' | 'airbag' | 'abs' | 'esc' | 'tyres' | 'lights' | 'headrest' | 'mirrors'
//     'skid'  top-down bend on a wet road; setState({ on }) shows the path with and without ESC
//     'belt'  side view of a crash-test dummy in a sudden stop; setState({ on }) with and without a seatbelt
import { COLORS as C, REDUCE_MOTION } from '../../config.js';
import { t } from '../content.js';
import { LEARNING_LAB_ASSETS as A } from '../assets.js';
import { stateImages, imagePoint } from './fit.js';
import createEscRoad from './escRoad.js';
import { clipTo, label, tweenTo } from './common.js';

export default function create(scene, parent, p, a) {
  if (p.view === 'skid') return createEscRoad(scene, parent, p, a);
  const c = scene.add.container(0, 0); parent.add(c);
  const g = scene.add.graphics(); c.add(g);
  const tags = scene.add.container(0, 0); c.add(tags);
  const st = { hi: null, on: false, k: 0 };
  const view = p.view || 'side';

  const keys = view === 'belt' ? [A.adultBelt.bad.key, A.adultBelt.good.key] : view === 'side' ? [A.vehicle.key] : [];
  const photos = keys.length && keys.every(key => scene.textures.exists(key)) ? stateImages(scene, c, keys,
    { x: a.x + 8, y: a.y + 42, w: a.w - 16, h: a.h - 52 }, view === 'belt' ? [186, 25, 1432, 988] : [8, 83, 1666, 813]) : null;
  if (photos) photos.show(keys[0]);
  c.bringToTop(tags);
  const photoSpots = { seatbelt: [.64, .42], airbag: [.7, .4], abs: [.79, .66], esc: [.5, .63], tyres: [.8, .72], lights: [.94, .5], headrest: [.59, .34], mirrors: [.73, .36] };
  const drawPhoto = () => {
    bgPanel();
    if (view === 'belt') { tags.add(label(scene, a.x + a.w / 2, a.y + 24, t(st.on ? 'art.belt.on' : 'art.belt.off'), 14, '#FFFFFF', { backgroundColor: '#05080DCC', padding: { x: 6, y: 3 } })); return; }
    if (photoSpots[st.hi]) {
      const q = imagePoint(photos.images[0], ...photoSpots[st.hi]), overlay = scene.add.graphics(); tags.add(overlay);
      overlay.lineStyle(4, C.yellow, 1); overlay.strokeCircle(q.x, q.y, 20); overlay.lineBetween(q.x, q.y - 20, q.x, a.y + 38);
      tags.add(label(scene, Math.max(a.x + 70, Math.min(a.x + a.w - 70, q.x)), a.y + 24, t('art.feature.' + st.hi), 15, '#0B1B2E', { backgroundColor: '#FFCB2B', padding: { x: 8, y: 4 } }));
    }
  };
  const bgPanel = () => { g.fillStyle(0x0E1622, 1); g.fillRoundedRect(a.x, a.y, a.w, a.h, 18); };

  // --- side view -------------------------------------------------------------
  const cx = a.x + a.w / 2, gy = a.y + a.h * 0.72, L = a.w * 0.78, Hh = L * 0.3;
  const x0 = cx - L / 2;
  const SPOTS = {
    seatbelt: [0.47, -0.62], airbag: [0.36, -0.55], abs: [0.2, -0.02], esc: [0.5, -0.25], tyres: [0.8, -0.02],
    lights: [0.03, -0.42], headrest: [0.55, -0.85], mirrors: [0.33, -0.72]
  };
  const side = () => {
    bgPanel();
    g.fillStyle(0x4A494D, 1); g.fillRect(a.x, gy + Hh * 0.18, a.w, a.h);
    // body
    g.fillStyle(0xE8E2D6, 1);
    g.fillRoundedRect(x0, gy - Hh * 0.55, L, Hh * 0.55, 14);
    g.fillPoints([{ x: x0 + L * 0.22, y: gy - Hh * 0.55 }, { x: x0 + L * 0.34, y: gy - Hh }, { x: x0 + L * 0.7, y: gy - Hh }, { x: x0 + L * 0.84, y: gy - Hh * 0.55 }], true);
    g.fillStyle(0x24364B, 0.9);
    g.fillPoints([{ x: x0 + L * 0.26, y: gy - Hh * 0.58 }, { x: x0 + L * 0.36, y: gy - Hh * 0.94 }, { x: x0 + L * 0.51, y: gy - Hh * 0.94 }, { x: x0 + L * 0.51, y: gy - Hh * 0.58 }], true);
    g.fillPoints([{ x: x0 + L * 0.53, y: gy - Hh * 0.58 }, { x: x0 + L * 0.53, y: gy - Hh * 0.94 }, { x: x0 + L * 0.68, y: gy - Hh * 0.94 }, { x: x0 + L * 0.8, y: gy - Hh * 0.58 }], true);
    // occupants: simple head + headrest + belt
    g.fillStyle(0x6B737D, 1); g.fillRoundedRect(x0 + L * 0.53, gy - Hh * 0.9, L * 0.04, Hh * 0.22, 4);
    g.fillStyle(0xC7B9A6, 1); g.fillCircle(x0 + L * 0.47, gy - Hh * 0.78, Hh * 0.1);
    g.lineStyle(4, 0x1D2733, 1); g.lineBetween(x0 + L * 0.5, gy - Hh * 0.72, x0 + L * 0.44, gy - Hh * 0.4);
    // wheels
    [0.2, 0.8].forEach(f => { g.fillStyle(0x1C1C1E, 1); g.fillCircle(x0 + L * f, gy, Hh * 0.2); g.fillStyle(0x9AA6B5, 1); g.fillCircle(x0 + L * f, gy, Hh * 0.09); });
    g.fillStyle(0xFFF2B0, 1); g.fillRoundedRect(x0 - 2, gy - Hh * 0.46, 10, 12, 3);
    g.fillStyle(0x1D2733, 1); g.fillRect(x0 + L * 0.31, gy - Hh * 0.74, 10, 8);
    if (st.hi && SPOTS[st.hi]) {
      const [fx, fy] = SPOTS[st.hi], px = x0 + L * fx, py = gy + Hh * fy;
      g.lineStyle(4, C.yellow, 1); g.strokeCircle(px, py, 20);
      g.lineStyle(2, C.yellow, 1); g.lineBetween(px, py - 20, px, a.y + 38);
      tags.add(label(scene, px, a.y + 26, t('art.feature.' + st.hi), 15, '#0B1B2E', { backgroundColor: '#FFCB2B', padding: { x: 8, y: 4 } }));
    }
  };

  // --- belt (dummy in a sudden stop) ------------------------------------------------------
  const belt = () => {
    bgPanel();
    const sx = a.x + a.w * 0.62, sy = a.y + a.h * 0.72, u = a.h / 10;
    // seat and dashboard
    g.fillStyle(0x4A5058, 1); g.fillRoundedRect(sx - 0.2 * u, sy - 4.2 * u, 0.9 * u, 4.4 * u, 6); g.fillRoundedRect(sx - 2.6 * u, sy - 0.3 * u, 3.2 * u, 0.9 * u, 6);
    g.fillStyle(0x34495E, 1); g.fillRoundedRect(a.x + a.w * 0.08, sy - 3.2 * u, 1.8 * u, 2.2 * u, 8);
    g.lineStyle(4, 0x1C1C1E, 1); g.strokeCircle(a.x + a.w * 0.08 + 2.4 * u, sy - 3.0 * u, 0.9 * u);
    // dummy leans forward by k (much further without a belt)
    const lean = st.k * (st.on ? 0.35 : 1.15), hx = sx - 0.6 * u - lean * 2.6 * u, hy = sy - 3.7 * u + lean * 1.2 * u;
    g.lineStyle(0.9 * u, 0xFFCB2B, 1); g.lineBetween(sx - 0.3 * u, sy - 0.3 * u, hx + 0.3 * u, hy + 0.9 * u);   // torso
    g.fillStyle(0xFFCB2B, 1); g.fillCircle(hx, hy, 0.75 * u);
    g.fillStyle(0x05080D, 1); g.fillCircle(hx - 0.15 * u, hy - 0.1 * u, 0.12 * u);                                 // dummy target mark
    g.lineStyle(0.55 * u, 0xFFCB2B, 1); g.lineBetween(sx - 0.4 * u, sy - 0.1 * u, sx - 2.4 * u, sy + 0.1 * u);    // legs
    if (st.on) { g.lineStyle(5, 0x1D2733, 1); g.lineBetween(sx + 0.1 * u, sy - 3.4 * u, sx - 1.0 * u - lean * 0.6 * u, sy - 0.4 * u); }
    tags.add(label(scene, a.x + a.w / 2, a.y + 24, t(st.on ? 'art.belt.on' : 'art.belt.off'), 14, '#FFFFFF', { backgroundColor: '#05080DCC', padding: { x: 6, y: 3 } }));
  };

  const draw = () => { g.clear(); tags.removeAll(true); if (photos) { drawPhoto(); return; } (view === 'belt' ? belt : side)(); };
  const inst = {
    highlight(id) { st.hi = id; draw(); },
    async setState(s) {
      if (s.highlight !== undefined) st.hi = s.highlight;
      if (s.on !== undefined) {
        st.on = !!s.on; st.k = 0; if (photos) photos.show(keys[st.on ? 1 : 0]); draw();
        if (photos) { await photos.show(keys[st.on ? 1 : 0]); return; }
        await tweenTo(scene, st, { k: 1 }, REDUCE_MOTION ? 0 : 1100, REDUCE_MOTION);
      }
      draw();
    },
    update() { if (st.k > 0 && st.k < 1) draw(); },
    destroy() {}
  };
  if (p.highlight) st.hi = p.highlight;
  if (view !== 'side') st.k = 0;
  draw();
  const m = clipTo(scene, c, a);
  inst.destroy = () => { c.destroy(); m.destroy(); };
  return inst;
}
