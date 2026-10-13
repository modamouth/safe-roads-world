// Icon vignette: a tinted panel with a large icon and optional small icons
// around it. The default illustration for stories and quiz questions.
//   params: { icon, tint: '#hex', extras: [icon, ...], caption }
import { drawIcon } from '../../icons.js';
import { COLORS as C } from '../../config.js';
import { col, tag } from './common.js';

export default function create(scene, parent, p, a) {
  const c = scene.add.container(0, 0);
  parent.add(c);
  const g = scene.add.graphics();
  const tint = col(p.tint, C.teal);
  g.fillStyle(C.navy2, 0.95); g.fillRoundedRect(a.x, a.y, a.w, a.h, 22);
  g.fillStyle(tint, 0.18); g.fillCircle(a.x + a.w / 2, a.y + a.h / 2, Math.min(a.w, a.h) * 0.42);
  g.fillStyle(tint, 0.12); g.fillCircle(a.x + a.w / 2, a.y + a.h / 2, Math.min(a.w, a.h) * 0.3);
  g.lineStyle(2, tint, 0.6); g.strokeRoundedRect(a.x, a.y, a.w, a.h, 22);
  const size = Math.min(a.w, a.h) * 0.42;
  drawIcon(g, p.icon || 'info', a.x + a.w / 2, a.y + a.h / 2, size, 0xFFFFFF);
  (p.extras || []).slice(0, 4).forEach((ic, i) => {
    const ang = -Math.PI * 0.8 + i * (Math.PI * 1.6 / Math.max(1, (p.extras.length - 1) || 1));
    const r = Math.min(a.w, a.h) * 0.4, x = a.x + a.w / 2 + Math.cos(ang) * r * 1.05, y = a.y + a.h / 2 + Math.sin(ang) * r * 0.85;
    g.fillStyle(C.navy, 0.95); g.fillCircle(x, y, 30); g.lineStyle(2, tint, 0.9); g.strokeCircle(x, y, 30);
    drawIcon(g, ic, x, y, 34, C.yellow);
  });
  c.add(g);
  if (p.caption) tag(scene, c, a.x + a.w / 2, a.y + a.h - 26, p.caption, { stroke: tint });
  return { destroy: () => c.destroy() };
}
