// Side view of a low-water crossing (a dip through a riverbed) after rain.
//   setState({ depthCm, flowing }) raises the water; a depth post marks
//   the levels given in params.marks ([{ cm, label }]).
//   params: { marks: [{ cm, label }], vehicle: 'car' | 'bakkie' }
import { COLORS as C, REDUCE_MOTION } from '../../config.js';
import { clipTo, label, tweenTo } from './common.js';

export default function create(scene, parent, p, a) {
  const c = scene.add.container(0, 0); parent.add(c);
  const g = scene.add.graphics(); c.add(g);
  const w = scene.add.graphics(); c.add(w);
  const tags = scene.add.container(0, 0); c.add(tags);
  const pxm = a.h / 4.2;                        // px per metre (vertical)
  const L1 = 0.40, L2 = 0.50, R1 = 0.76, R2 = 0.86;   // dip: top-left, bottom-left, bottom-right, top-right (fractions of width)
  const bedY = a.y + a.h * 0.78, roadY = bedY - 0.9 * pxm;
  const st = { depth: 0, t: 0, flowing: true };

  const drawStatic = () => {
    g.clear();
    g.fillStyle(0x9ED0E8, 1); g.fillRoundedRect(a.x, a.y, a.w, a.h, 18);          // sky after rain
    g.fillStyle(0x7F8FA3, 0.6); g.fillEllipse(a.x + a.w * 0.3, a.y + 40, 200, 50); g.fillEllipse(a.x + a.w * 0.75, a.y + 60, 240, 60);
    // banks and the dip
    g.fillStyle(0xB58A5A, 1);
    g.fillPoints([{ x: a.x, y: roadY }, { x: a.x + a.w * L1, y: roadY }, { x: a.x + a.w * L2, y: bedY }, { x: a.x + a.w * R1, y: bedY }, { x: a.x + a.w * R2, y: roadY }, { x: a.x + a.w, y: roadY }, { x: a.x + a.w, y: a.y + a.h }, { x: a.x, y: a.y + a.h }], true);
    g.lineStyle(6, 0x4A494D, 1);
    g.beginPath(); g.moveTo(a.x, roadY); g.lineTo(a.x + a.w * L1, roadY); g.lineTo(a.x + a.w * L2, bedY); g.lineTo(a.x + a.w * R1, bedY); g.lineTo(a.x + a.w * R2, roadY); g.lineTo(a.x + a.w, roadY); g.strokePath();
    // depth post in the dip
    const px = a.x + a.w * (L2 + R1) / 2;
    g.fillStyle(0xFFFFFF, 1); g.fillRect(px - 5, bedY - 1.4 * pxm, 10, 1.4 * pxm);
    tags.removeAll(true);
    (p.marks || []).forEach(mk => {
      const y = bedY - mk.cm / 100 * pxm;
      g.fillStyle(C.red, 1); g.fillRect(px - 9, y - 2, 18, 4);
      tags.add(label(scene, px + 16, y, mk.label, 12, '#0B1B2E', { backgroundColor: '#FFFFFFDD', padding: { x: 4, y: 2 } }).setOrigin(0, 0.5));
    });
    // vehicle waiting on the near bank (side view, facing the water)
    const big = p.vehicle === 'bakkie', vx = a.x + a.w * 0.2, wr = 0.32 * pxm, len = (big ? 5.2 : 4.4) * pxm * 0.42;
    const base = roadY - wr * 0.9, bodyH = 0.62 * pxm, x0 = vx - len / 2;
    g.fillStyle(0x000000, 0.18); g.fillEllipse(vx, roadY + 2, len * 1.05, 10);
    g.fillStyle(big ? 0xD9C9A3 : 0xF4F5F6, 1); g.fillRoundedRect(x0, base - bodyH, len, bodyH, 10);
    // cabin and windows (front of the car is on the right, facing the crossing)
    const cx0 = x0 + len * (big ? 0.42 : 0.2), cw = len * (big ? 0.42 : 0.6), ch = 0.48 * pxm;
    g.fillPoints([{ x: cx0, y: base - bodyH }, { x: cx0 + cw * 0.12, y: base - bodyH - ch }, { x: cx0 + cw * 0.78, y: base - bodyH - ch }, { x: cx0 + cw, y: base - bodyH }], true);
    g.fillStyle(0x2C4058, 1);
    g.fillPoints([{ x: cx0 + cw * 0.08, y: base - bodyH - 2 }, { x: cx0 + cw * 0.17, y: base - bodyH - ch + 6 }, { x: cx0 + cw * 0.46, y: base - bodyH - ch + 6 }, { x: cx0 + cw * 0.46, y: base - bodyH - 2 }], true);
    g.fillPoints([{ x: cx0 + cw * 0.52, y: base - bodyH - 2 }, { x: cx0 + cw * 0.52, y: base - bodyH - ch + 6 }, { x: cx0 + cw * 0.75, y: base - bodyH - ch + 6 }, { x: cx0 + cw * 0.92, y: base - bodyH - 2 }], true);
    g.fillStyle(0xFFE9A8, 1); g.fillRoundedRect(x0 + len - 8, base - bodyH * 0.7, 7, bodyH * 0.25, 2);
    g.fillStyle(0xE5484D, 1); g.fillRect(x0 + 1, base - bodyH * 0.7, 5, bodyH * 0.25);
    [vx - len * 0.3, vx + len * 0.3].forEach(wx => { g.fillStyle(0x1C1C1E, 1); g.fillCircle(wx, roadY - wr, wr); g.fillStyle(0x8B97A6, 1); g.fillCircle(wx, roadY - wr, wr * 0.42); });
  };

  const drawWater = () => {
    w.clear();
    if (st.depth <= 0) return;
    const top = bedY - st.depth / 100 * pxm;
    w.fillStyle(0x6E5434, 0.82);
    // fill the dip up to the water line
    const slopeL = x => roadY + (bedY - roadY) * (x - (a.x + a.w * L1)) / (a.w * (L2 - L1));
    let xl = a.x + a.w * L1, xr = a.x + a.w * R2;
    for (let x = a.x + a.w * L1; x < a.x + a.w * L2; x++) { if (slopeL(x) >= top) { xl = x; break; } }
    xr = a.x + a.w * (L1 + R2) - xl;
    w.fillPoints([{ x: xl, y: top }, { x: xr, y: top }, { x: a.x + a.w * R1, y: bedY }, { x: a.x + a.w * L2, y: bedY }], true);
    if (st.flowing) {
      w.lineStyle(2, 0xE6D7BE, 0.8);
      for (let i = 0; i < 6; i++) { const x = xl + ((i * 47 + st.t * 60) % Math.max(1, xr - xl)); w.lineBetween(x, top + 6 + (i % 3) * 8, x + 18, top + 6 + (i % 3) * 8); }
    }
  };

  const inst = {
    async setState(s) {
      st.flowing = s.flowing !== false;
      await tweenTo(scene, st, { depth: s.depthCm || 0 }, REDUCE_MOTION ? 0 : 800, REDUCE_MOTION);
      drawWater();
    },
    update(t, dt) { st.t += dt; drawWater(); },
    destroy() {}
  };
  drawStatic(); drawWater();
  const m = clipTo(scene, c, a);
  inst.destroy = () => { c.destroy(); m.destroy(); };
  return inst;
}
