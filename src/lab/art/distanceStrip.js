// Side-on distance strip: one bar per row showing how far a vehicle travels,
// with minibus-taxi lengths underneath for scale. Used for stopping distances
// (reaction + braking) and for distance covered during a microsleep.
//   params: {
//     calc: 'stopping' | 'distanceAt',
//     rows: [{ label, reactionS, decel }]   (stopping)  or  [{ label }] (distanceAt)
//     maxM: scale end in metres, taxiM: length of one minibus taxi (for scale), hazardM?: marker
//   }
//   setState({ kmh, seconds, decel }) recalculates every row (decel overrides every row's) and writes vars:
//     d0, d1...  (total metres, rounded), taxis0, taxis1... (taxi lengths)
import { COLORS as C, REDUCE_MOTION } from '../../config.js';
import { panel } from '../../ui.js';
import { stopping, distanceAt } from '../core/derive.js';
import { clipTo, label, tweenTo } from './common.js';

export default function create(scene, parent, p, a) {
  const c = scene.add.container(0, 0); parent.add(c);
  c.add(panel(scene, a.x, a.y, a.w, a.h, { fill: 0x0E1622, alpha: 0.95, r: 18, stroke: 0xFFFFFF, strokeA: 0.12 }));
  const g = scene.add.graphics(); c.add(g);
  const labels = scene.add.container(0, 0); c.add(labels);
  const x0 = a.x + 64, x1 = a.x + a.w - 24, pxm = (x1 - x0) / p.maxM;
  const rows = p.rows, rowH = Math.min(150, (a.h - 70) / rows.length);
  const st = { k: 1 };
  let res = [];

  // Static: scale ticks every 10 m.
  const scale = scene.add.graphics(); c.add(scale);
  const by = a.y + a.h - 26;
  scale.lineStyle(1, 0xFFFFFF, 0.25); scale.lineBetween(x0, by, x1, by);
  const step = p.maxM > 120 ? 20 : 10;
  for (let m = 0; m <= p.maxM; m += step) {
    scale.lineBetween(x0 + m * pxm, by - 5, x0 + m * pxm, by + 5);
    if (m % (step * 2) === 0) c.add(label(scene, x0 + m * pxm, by + 14, m + ' m', 11, '#9AA6B5', { fontStyle: 'normal' }));
  }
  if (p.hazardM) {
    const hx = x0 + p.hazardM * pxm;
    for (let y = a.y + 16; y < by; y += 12) { scale.fillStyle(0xFFFFFF, 0.6); scale.fillRect(hx - 1, y, 2, 7); }
  }

  const draw = () => {
    g.clear(); labels.removeAll(true);
    res.forEach((r, i) => {
      const cy = a.y + 30 + i * rowH + rowH * 0.38;
      labels.add(label(scene, a.x + 34, cy, rows[i].label, 13, '#FFFFFF', { align: 'center', wordWrap: { width: 60 } }));
      // vehicle at the start line
      g.fillStyle(0xF2F2F2, 1); g.fillRoundedRect(x0 - 26, cy - 9, 24, 14, 4);
      g.fillStyle(0x1D2733, 1); g.fillCircle(x0 - 20, cy + 6, 4); g.fillCircle(x0 - 8, cy + 6, 4);
      const rw = r.react * pxm * st.k, bw = r.brake * pxm * st.k;
      g.fillStyle(C.teal, 1); g.fillRect(x0, cy - 12, rw, 24);
      if (bw > 0) {
        g.fillStyle(C.yellow, 1); g.fillRect(x0 + rw, cy - 12, bw, 24);
        g.fillStyle(0x0E1622, 1); for (let s = x0 + rw + 4; s < x0 + rw + bw - 2; s += 9) g.fillRect(s, cy - 12, 2, 24);
      }
      const end = x0 + rw + bw;
      if (st.k >= 0.999) labels.add(label(scene, Math.min(end + 30, x1 - 20), cy - 24, Math.round(r.total) + ' m', 15, '#FFFFFF'));
      // taxi lengths underneath, for scale
      const n = Math.floor(r.total / p.taxiM);
      for (let t = 0; t < n && t < 60; t++) {
        const tx = x0 + t * p.taxiM * pxm, w = p.taxiM * pxm - 2;
        if (tx + w > end) break;
        g.fillStyle(0xFFFFFF, 0.85); g.fillRoundedRect(tx, cy + 18, w, 8, 2);
        g.fillStyle(C.navy, 1); g.fillRect(tx + w * 0.15, cy + 19, w * 0.2, 3);
      }
    });
  };

  const inst = {
    async setState(s, vars) {
      res = rows.map(r => {
        if (p.calc === 'distanceAt') { const d = distanceAt(s.kmh != null ? s.kmh : p.kmh, s.seconds != null ? s.seconds : p.seconds); return { react: d, brake: 0, total: d }; }
        return stopping(s.kmh, r.reactionS, s.decel != null ? s.decel : r.decel);
      });
      res.forEach((r, i) => { vars['d' + i] = Math.round(r.total); vars['taxis' + i] = Math.round(r.total / p.taxiM); });
      if (s.kmh != null) vars.kmh = s.kmh;
      if (s.seconds != null) vars.seconds = s.seconds;
      st.k = 0; draw();
      await tweenTo(scene, st, { k: 1 }, 650, REDUCE_MOTION);
      draw();
    },
    update() { if (st.k < 1) draw(); },
    destroy() { c.destroy(); }
  };
  const m = clipTo(scene, c, a); inst.destroy = () => { c.destroy(); m.destroy(); };
  return inst;
}
