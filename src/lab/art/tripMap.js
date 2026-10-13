// Schematic route map (not to scale): a highway running up the screen with
// towns and stops. Content gives the places; points use 0..100 coordinates.
//   params: { road: 'B1', places: [{ id, name, y, kind: 'town' | 'rest' | 'fuel' }] }
//   toScreen(x, y) for pick-a-point; highlight(id) rings a place.
import { COLORS as C } from '../../config.js';
import { drawIcon } from '../../icons.js';
import { clipTo, label, tag } from './common.js';

export default function create(scene, parent, p, a) {
  const c = scene.add.container(0, 0); parent.add(c);
  const g = scene.add.graphics(); c.add(g);
  const hi = scene.add.graphics(); c.add(hi);
  const toScreen = (x, y) => ({ x: a.x + 30 + (a.w - 60) * x / 100, y: a.y + a.h - 30 - (a.h - 60) * y / 100 });
  const rx = 50;

  // land, a few dry riverbeds and bush dots
  g.fillStyle(0xD6B98A, 1); g.fillRoundedRect(a.x, a.y, a.w, a.h, 18);
  g.lineStyle(3, 0xC2A274, 1);
  for (let i = 0; i < 3; i++) { const y = a.y + a.h * (0.25 + i * 0.25); g.beginPath(); g.moveTo(a.x, y); g.lineTo(a.x + a.w * 0.3, y - 20); g.lineTo(a.x + a.w * 0.7, y + 10); g.lineTo(a.x + a.w, y - 8); g.strokePath(); }
  for (let i = 0; i < 26; i++) { g.fillStyle(0x8C9B54, 0.7); g.fillCircle(a.x + 12 + (i * 71) % (a.w - 24), a.y + 12 + (i * 131) % (a.h - 24), 4); }
  // the road
  const top = toScreen(rx, 104), bot = toScreen(rx, -4);
  g.lineStyle(14, 0x4A494D, 1); g.lineBetween(bot.x, bot.y, top.x, top.y);
  g.lineStyle(2, 0xFFCB2B, 1);
  for (let y = top.y; y < bot.y; y += 16) g.lineBetween(top.x, y, top.x, y + 8);
  if (p.road) tag(scene, c, top.x + 30, a.y + 22, p.road, { fill: 0x1E6B45, stroke: 0xFFFFFF, size: 14 });

  const marks = {};
  (p.places || []).forEach(pl => {
    const s = toScreen(rx, pl.y);
    marks[pl.id] = s;
    if (pl.kind === 'town') {
      g.fillStyle(0xFFFFFF, 1); g.fillCircle(s.x, s.y, 9); g.lineStyle(3, C.navy, 1); g.strokeCircle(s.x, s.y, 9);
      c.add(label(scene, s.x - 18, s.y, pl.name, 14, '#0B1B2E').setOrigin(1, 0.5));
    } else {
      g.fillStyle(C.navy, 1); g.fillRoundedRect(s.x + 14, s.y - 13, 26, 26, 6);
      drawIcon(g, pl.kind === 'fuel' ? 'gravel' : 'info', s.x + 27, s.y, 18, C.yellow);
      c.add(label(scene, s.x + 48, s.y, pl.name, 13, '#0B1B2E', { fontStyle: 'normal' }).setOrigin(0, 0.5));
    }
  });

  const inst = {
    toScreen,
    highlight(id) {
      hi.clear();
      const s = marks[id];
      if (s) { hi.lineStyle(4, C.yellow, 1); hi.strokeCircle(s.x, s.y, 18); }
    },
    destroy() {}
  };
  const m = clipTo(scene, c, a);
  inst.destroy = () => { c.destroy(); m.destroy(); };
  return inst;
}
