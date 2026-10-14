// Head pictogram dropped onto a test block, then coloured by injury risk.
// Not a person: a plain head form. setState({ helmet }) replays the drop.
// Risk areas use colour plus hatching and a worded legend.
//   params: { style: 'motorcycle' | 'bicycle' }
import { COLORS as C, REDUCE_MOTION } from '../../config.js';
import { t } from '../content.js';
import { LEARNING_LAB_ASSETS as A } from '../assets.js';
import { stateImages, imagePoint } from './fit.js';
import { clipTo, label, tweenTo, wait } from './common.js';

const RISK = {
  high: { col: C.red, word: 'art.risk.high', hatch: true },
  mid: { col: 0xFF8A1F, word: 'art.risk.mid', hatch: false },
  low: { col: C.green, word: 'art.risk.low', hatch: false }
};

export default function create(scene, parent, p, a) {
  const c = scene.add.container(0, 0); parent.add(c);
  const bg = scene.add.graphics(); c.add(bg);
  const g = scene.add.graphics(); c.add(g);
  const leg = scene.add.container(0, 0); c.add(leg);
  const cx = a.x + a.w * 0.42, blockY = a.y + a.h - 70, R = Math.min(a.w, a.h) * 0.2;
  const st = { y: a.y + 40 + R, map: 0, helmet: false, impact: 0 };
  let revision = 0;

  bg.fillStyle(0x0E1622, 1); bg.fillRoundedRect(a.x, a.y, a.w, a.h, 18);
  bg.lineStyle(1, 0xFFFFFF, 0.08); for (let x = a.x + 20; x < a.x + a.w; x += 28) bg.lineBetween(x, a.y, x, a.y + a.h);
  const keys = [A.helmet.none.key, p.style === 'bicycle' ? A.helmet.bicycle.key : A.helmet.motorcycle.key];
  const photos = keys.every(key => scene.textures.exists(key)) ? stateImages(scene, c, keys,
    { x: a.x + 8, y: a.y + 18, w: a.w - 136, h: a.h - 30 }, [311, 0, 1225, 1015]) : null;
  if (photos) photos.show(keys[0]);
  c.bringToTop(g); c.bringToTop(leg);
  if (!photos) {
  bg.fillStyle(0x6B737D, 1); bg.fillRect(cx - R * 1.4, blockY, R * 2.8, 18);           // test block
  bg.fillStyle(0x4A5058, 1); bg.fillRect(cx - R * 1.6, blockY + 18, R * 3.2, 30);

  }

  const zone = (x, y, r, risk) => {
    const k = RISK[risk];
    g.fillStyle(k.col, 0.75 * st.map); g.fillCircle(x, y, r);
    if (k.hatch && st.map > 0.5) { g.lineStyle(2, 0x05080D, 0.55); for (let d = -r; d < r; d += 7) g.lineBetween(x + d - r * 0.3, y - r * 0.9, x + d + r * 0.3, y + r * 0.9); }
  };

  const draw = () => {
    g.clear();
    if (photos) {
      const im = photos.images[st.helmet ? 1 : 0], q = imagePoint(im, .5, .34), radius = im.displayWidth * .2;
      // The supplied artwork includes a fixed test fixture. Animate a force
      // arrow beside it, rather than making its bolted base fall with the head.
      if (!REDUCE_MOTION && st.map === 0 && st.impact === 0) {
        const progress = Math.max(0, Math.min(1, (st.y - a.y - 40 - R * 1.2) / Math.max(1, blockY - R * 2.65 - a.y - 40)));
        const x = q.x - radius * 1.2, y = q.y - radius + progress * radius;
        g.lineStyle(3, C.yellow, 1); g.lineBetween(x, y - 24, x, y);
        g.lineBetween(x, y, x - 6, y - 8); g.lineBetween(x, y, x + 6, y - 8);
      }
      if (st.map > 0) zone(q.x, q.y, radius, st.helmet ? 'low' : 'high');
      if (st.impact > 0) {
        g.lineStyle(3, C.yellow, st.impact);
        for (let i = -2; i <= 2; i++) g.lineBetween(q.x + i * radius * .3, q.y + radius, q.x + i * radius * .5, q.y + radius * 1.4);
      }
      return;
    }
    const hy = st.y, hx = cx;
    // neck and head form (side view, facing right)
    g.fillStyle(0xC7B9A6, 1); g.fillRoundedRect(hx - R * 0.35, hy + R * 0.55, R * 0.7, R * 0.9, 8);
    g.fillStyle(0xE3D6C4, 1); g.fillCircle(hx, hy, R); g.fillEllipse(hx + R * 0.55, hy + R * 0.25, R * 0.9, R * 1.1);
    g.fillStyle(0xC7B9A6, 1); g.fillCircle(hx - R * 0.15, hy + R * 0.05, R * 0.18);   // ear
    // colour map after impact (impact is on the lower side of the head, nearest the block)
    if (st.map > 0) {
      if (st.helmet) { zone(hx, hy + R * 0.55, R * 0.42, 'mid'); zone(hx - R * 0.1, hy - R * 0.2, R * 0.6, 'low'); zone(hx + R * 0.4, hy - R * 0.35, R * 0.45, 'low'); }
      else { zone(hx, hy + R * 0.5, R * 0.62, 'high'); zone(hx - R * 0.35, hy - R * 0.1, R * 0.45, 'mid'); zone(hx + R * 0.45, hy - R * 0.2, R * 0.38, 'mid'); }
    }
    if (st.helmet) {
      // shell + liner; full-face for motorcycles, vented for bicycles
      g.lineStyle(R * 0.16, 0xF2F2F2, 0.55); g.strokeCircle(hx, hy - R * 0.05, R * 1.08);
      g.lineStyle(R * 0.12, p.style === 'bicycle' ? 0x2E9E5B : 0x2B3440, 1);
      g.beginPath(); g.arc(hx, hy - R * 0.05, R * 1.22, Math.PI * 0.62, Math.PI * (p.style === 'bicycle' ? 2.05 : 2.32)); g.strokePath();
      if (p.style === 'bicycle') { g.fillStyle(0x0E1622, 1); for (let i = 0; i < 4; i++) { const an = Math.PI * (1.15 + i * 0.22); g.fillCircle(hx + Math.cos(an) * R * 1.22, hy - R * 0.05 + Math.sin(an) * R * 1.22, R * 0.07); } }
      else { g.fillStyle(0x5FD0E0, 0.6); g.fillRoundedRect(hx + R * 0.7, hy - R * 0.35, R * 0.5, R * 0.55, 6); }
    }
    if (st.impact > 0) {   // contact flash: lines, not a wound
      g.lineStyle(3, 0xFFFFFF, st.impact);
      for (let i = -2; i <= 2; i++) g.lineBetween(hx + i * R * 0.25, blockY - 4, hx + i * R * 0.35, blockY - 4 - R * 0.35);
    }
  };

  // legend: colour swatch + hatch + words
  const legend = () => {
    leg.removeAll(true);
    const lx = a.x + a.w - 120;
    Object.entries(RISK).forEach(([k, v], i) => {
      const y = a.y + 40 + i * 34, sw = scene.add.graphics();
      sw.fillStyle(v.col, 0.85); sw.fillRect(lx, y - 9, 18, 18);
      if (v.hatch) { sw.lineStyle(2, 0x05080D, 0.6); sw.lineBetween(lx, y + 5, lx + 14, y - 9); sw.lineBetween(lx + 4, y + 9, lx + 18, y - 5); }
      leg.add([sw, label(scene, lx + 26, y, t(v.word), 13, '#E6EDF5', { fontStyle: 'normal' }).setOrigin(0, 0.5)]);
    });
  };

  const inst = {
    async setState(s) {
      const my = ++revision;
      if (photos) photos.show(keys[s.helmet ? 1 : 0]);
      st.helmet = !!s.helmet; st.map = 0; st.impact = 0; st.y = a.y + 40 + R * 1.2;
      leg.removeAll(true); draw();
      const rest = blockY - R * 1.45 - (st.helmet ? R * 0.15 : 0);
      await tweenTo(scene, st, { y: rest }, REDUCE_MOTION ? 0 : 520, REDUCE_MOTION);
      if (my !== revision) return;
      st.impact = 1; draw();
      if (!REDUCE_MOTION) { scene.cameras.main.shake(140, 0.003); await wait(scene, 160); }
      if (my !== revision) return;
      st.impact = 0;
      await tweenTo(scene, st, { map: 1 }, REDUCE_MOTION ? 0 : 450, REDUCE_MOTION);
      if (my !== revision) return;
      draw(); legend();
    },
    update() { draw(); },
    destroy() {}
  };
  draw();
  const m = clipTo(scene, c, a);
  inst.destroy = () => { revision++; scene.tweens.killTweensOf(st); c.destroy(); m.destroy(); };
  return inst;
}
