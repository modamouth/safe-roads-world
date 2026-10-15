import { COLORS as C, REDUCE_MOTION } from '../../config.js';
import { LEARNING_LAB_ASSETS as A } from '../assets.js';
import { t } from '../content.js';
import { containBounds } from './fit.js';
import { clipTo, label } from './common.js';
import { TopDownArt } from './topDown.js';

import { escPosition } from '../core/escPath.js';

export default function create(scene, parent, p, area) {
  const c = scene.add.container(0, 0); parent.add(c);
  const bg = scene.add.graphics(); c.add(bg);
  bg.fillStyle(0x172322, 1); bg.fillRoundedRect(area.x, area.y, area.w, area.h, 18);
  const bounds = containBounds(1, 1, area);
  const screen = q => ({ x: bounds.x + q.x * bounds.w, y: bounds.y + q.y * bounds.h });
  if (scene.textures.exists(A.escRoad.key)) {
    c.add(scene.add.image(bounds.x + bounds.w / 2, bounds.y + bounds.h / 2, A.escRoad.key).setDisplaySize(bounds.w, bounds.h));
  } else {
    // An unavailable background keeps the same lane geometry and trajectories.
    bg.fillStyle(0x6E8A4E, 1); bg.fillRect(bounds.x, bounds.y, bounds.w, bounds.h);
    const centre = k => {
      const q = escPosition(k, true), before = escPosition(Math.max(0, k - .01), true), after = escPosition(Math.min(1, k + .01), true);
      const dx = after.x - before.x, dy = after.y - before.y, length = Math.hypot(dx, dy);
      return screen({ x: q.x - dy / length * .045, y: q.y + dx / length * .045 });
    };
    const stroke = (width, color) => {
      bg.lineStyle(width * bounds.w, color, 1); bg.beginPath();
      for (let i = 0; i <= 80; i++) { const q = centre(i / 80); i ? bg.lineTo(q.x, q.y) : bg.moveTo(q.x, q.y); }
      bg.strokePath();
    };
    stroke(.20, 0xC5BDAA); stroke(.18, 0x454C52);
    bg.lineStyle(2, 0xF2F2F2, .8);
    for (let i = 0; i < 32; i += 2) { const q = centre(i / 32), r = centre((i + 1) / 32); bg.lineBetween(q.x, q.y, r.x, r.y); }
  }
  const trail = scene.add.graphics(), cars = scene.add.container(0, 0), tags = scene.add.container(0, 0);
  c.add([trail, cars, tags]);
  const carArt = new TopDownArt(scene, cars), fallback = scene.add.graphics(); cars.add(fallback);
  const st = { on: false, k: 0 }; let run = null;
  const draw = () => {
    trail.clear(); fallback.clear(); carArt.begin(); tags.removeAll(true);
    trail.lineStyle(6, 0x07121B, .75); trail.beginPath();
    for (let i = 0; i <= 60; i++) { const q = screen(escPosition(st.k * i / 60, st.on)); i ? trail.lineTo(q.x, q.y) : trail.moveTo(q.x, q.y); }
    trail.strokePath();
    trail.lineStyle(3, st.on ? C.green : C.red, .95); trail.beginPath();
    for (let i = 0; i <= 60; i++) { const q = screen(escPosition(st.k * i / 60, st.on)); i ? trail.lineTo(q.x, q.y) : trail.moveTo(q.x, q.y); }
    trail.strokePath();
    const q = screen(escPosition(st.k, st.on));
    const q0 = screen(escPosition(Math.max(0, st.k - .01), st.on)), q1 = screen(escPosition(Math.min(1, st.k + .01), st.on));
    // Without ESC the body yaws relative to its direction of travel.
    const slip = st.on ? 0 : Math.sin(Math.PI * Math.max(0, (st.k - .35) / .65)) * .55;
    const angle = Math.atan2(q1.y - q0.y, q1.x - q0.x) + Math.PI / 2 + slip;
    if (!carArt.draw(A.topDown.redSedan.key, q.x, q.y, 22, 44, angle * 180 / Math.PI)) {
      fallback.fillStyle(0xF4F5F6, 1); fallback.fillRoundedRect(-11, -22, 22, 44, 7);
      fallback.fillStyle(0x24364B, 1); fallback.fillRect(-8, -13, 16, 8);
      fallback.setPosition(q.x, q.y).setRotation(angle);
    }
    if (st.k === 1) tags.add(label(scene, area.x + area.w / 2, area.y + 24, t(st.on ? 'art.esc.on' : 'art.esc.off'), 14, '#FFFFFF', { backgroundColor: '#07121BDD', padding: { x: 8, y: 5 } }));
  };
  const inst = {
    setState(s) {
      if (run) { run.resolve(); run = null; }
      st.on = !!s.on; st.k = REDUCE_MOTION ? 1 : 0; draw();
      if (REDUCE_MOTION) return Promise.resolve();
      return new Promise(resolve => { run = { elapsed: 0, resolve }; });
    },
    update(time, dt) {
      if (!run) return;
      run.elapsed += dt; st.k = Math.min(1, run.elapsed / 2.8); draw();
      if (st.k === 1) { const finished = run; run = null; finished.resolve(); }
    },
    destroy() { if (run) run.resolve(); run = null; c.destroy(); mask.destroy(); }
  };
  draw(); const mask = clipTo(scene, c, area); return inst;
}
