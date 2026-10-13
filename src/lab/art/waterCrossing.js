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
  const pxm = a.h / 3.2;                        // px per metre (vertical)
  const bedY = a.y + a.h * 0.78, roadY = bedY - 0.9 * pxm;
  const st = { depth: 0, t: 0, flowing: true };

  const drawStatic = () => {
    g.clear();
    g.fillStyle(0x9ED0E8, 1); g.fillRoundedRect(a.x, a.y, a.w, a.h, 18);          // sky after rain
    g.fillStyle(0x7F8FA3, 0.6); g.fillEllipse(a.x + a.w * 0.3, a.y + 40, 200, 50); g.fillEllipse(a.x + a.w * 0.75, a.y + 60, 240, 60);
    // banks and the dip
    g.fillStyle(0xB58A5A, 1);
    g.fillPoints([{ x: a.x, y: roadY }, { x: a.x + a.w * 0.28, y: roadY }, { x: a.x + a.w * 0.38, y: bedY }, { x: a.x + a.w * 0.62, y: bedY }, { x: a.x + a.w * 0.72, y: roadY }, { x: a.x + a.w, y: roadY }, { x: a.x + a.w, y: a.y + a.h }, { x: a.x, y: a.y + a.h }], true);
    g.lineStyle(6, 0x4A494D, 1);
    g.beginPath(); g.moveTo(a.x, roadY); g.lineTo(a.x + a.w * 0.28, roadY); g.lineTo(a.x + a.w * 0.38, bedY); g.lineTo(a.x + a.w * 0.62, bedY); g.lineTo(a.x + a.w * 0.72, roadY); g.lineTo(a.x + a.w, roadY); g.strokePath();
    // depth post in the dip
    const px = a.x + a.w * 0.5;
    g.fillStyle(0xFFFFFF, 1); g.fillRect(px - 5, bedY - 1.4 * pxm, 10, 1.4 * pxm);
    tags.removeAll(true);
    (p.marks || []).forEach(mk => {
      const y = bedY - mk.cm / 100 * pxm;
      g.fillStyle(C.red, 1); g.fillRect(px - 9, y - 2, 18, 4);
      tags.add(label(scene, px + 16, y, mk.label, 12, '#0B1B2E', { backgroundColor: '#FFFFFFDD', padding: { x: 4, y: 2 } }).setOrigin(0, 0.5));
    });
    // vehicle waiting on the near bank
    const vx = a.x + a.w * 0.16, wr = 0.33 * pxm, len = (p.vehicle === 'bakkie' ? 5.3 : 4.4) * pxm * 0.42;
    g.fillStyle(0xF4F5F6, 1); g.fillRoundedRect(vx - len / 2, roadY - wr - 0.55 * pxm, len, 0.55 * pxm, 8);
    g.fillRoundedRect(vx - len * 0.2, roadY - wr - 0.95 * pxm, len * 0.45, 0.45 * pxm, 8);
    g.fillStyle(0x1C1C1E, 1); g.fillCircle(vx - len * 0.3, roadY - wr, wr); g.fillCircle(vx + len * 0.3, roadY - wr, wr);
  };

  const drawWater = () => {
    w.clear();
    if (st.depth <= 0) return;
    const top = bedY - st.depth / 100 * pxm;
    w.fillStyle(0x6E5434, 0.82);
    // fill the dip up to the water line
    const slopeL = x => roadY + (bedY - roadY) * (x - (a.x + a.w * 0.28)) / (a.w * 0.1);
    let xl = a.x + a.w * 0.28, xr = a.x + a.w * 0.72;
    for (let x = a.x + a.w * 0.28; x < a.x + a.w * 0.38; x++) { if (slopeL(x) >= top) { xl = x; break; } }
    xr = a.x + a.w - (xl - a.x);
    w.fillPoints([{ x: xl, y: top }, { x: xr, y: top }, { x: a.x + a.w * 0.62, y: bedY }, { x: a.x + a.w * 0.38, y: bedY }], true);
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
