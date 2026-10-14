// Schematic route map (not to scale): a highway running up the screen with
// towns and stops. Content gives the places; points use 0..100 coordinates.
//   params: { road: 'B1', places: [{ id, name, y, kind: 'town' | 'rest' | 'fuel' }] }
//   toScreen(x, y) for pick-a-point; highlight(id) rings a place.
import { mirror, announce } from '../../a11y.js';
import { B1_ROUTE_STOPS } from '../routeStops.js';
import { fitImage } from './fit.js';
import { COLORS as C } from '../../config.js';
import { drawIcon } from '../../icons.js';
import { clipTo, label, tag } from './common.js';

export default function create(scene, parent, p, a) {
  const c = scene.add.container(0, 0); parent.add(c);
  const g = scene.add.graphics(); c.add(g);
  const hi = scene.add.graphics(); c.add(hi);
  // With the illustrated map (scn_b1map), places sit on the painted road: ROAD gives the road's
  // x (fraction of the image width) at y = 0, 5, ... 100 (fraction up the image), measured from the art.
  const ROAD = [0.32, 0.309, 0.352, 0.401, 0.446, 0.513, 0.474, 0.486, 0.586, 0.6, 0.483, 0.497, 0.4, 0.41, 0.528, 0.595, 0.596, 0.653, 0.681, 0.6, 0.55];
  const pic = scene.textures.exists('scn_b1map') ? scene.add.image(a.x + a.w / 2, a.y + a.h / 2, 'scn_b1map') : null;
  let iw = 0, ih = 0;
  if (pic) { fitImage(pic, a); iw = pic.displayWidth; ih = pic.displayHeight; }
  const roadX = y => { const f = Math.max(0, Math.min(100, y)) / 5, i = Math.floor(f), k = f - i; return ROAD[i] + ((ROAD[Math.min(20, i + 1)] - ROAD[i]) * k); };
  const toScreen = pic
    ? (x, y) => ({ x: a.x + (a.w - iw) / 2 + iw * roadX(y) + (x - 50) / 100 * iw, y: a.y + (a.h + ih) / 2 - ih * (0.04 + 0.92 * y / 100) })
    : (x, y) => ({ x: a.x + 30 + (a.w - 60) * x / 100, y: a.y + a.h - 30 - (a.h - 60) * y / 100 });
  const rx = 50;

  // land, a few dry riverbeds and bush dots (drawn map only)
  let topX = a.x + a.w - 70;
  if (pic) { c.addAt([scene.add.rectangle(a.x, a.y, a.w, a.h, 0x3A2A1C).setOrigin(0), pic], 0); }
  else {
  g.fillStyle(0xD6B98A, 1); g.fillRoundedRect(a.x, a.y, a.w, a.h, 18);
  g.lineStyle(3, 0xC2A274, 1);
  for (let i = 0; i < 3; i++) { const y = a.y + a.h * (0.25 + i * 0.25); g.beginPath(); g.moveTo(a.x, y); g.lineTo(a.x + a.w * 0.3, y - 20); g.lineTo(a.x + a.w * 0.7, y + 10); g.lineTo(a.x + a.w, y - 8); g.strokePath(); }
  for (let i = 0; i < 26; i++) { g.fillStyle(0x8C9B54, 0.7); g.fillCircle(a.x + 12 + (i * 71) % (a.w - 24), a.y + 12 + (i * 131) % (a.h - 24), 4); }
  // the road
  const top = toScreen(rx, 104), bot = toScreen(rx, -4); topX = top.x;
  g.lineStyle(14, 0x4A494D, 1); g.lineBetween(bot.x, bot.y, top.x, top.y);
  g.lineStyle(2, 0xFFCB2B, 1);
  for (let y = top.y; y < bot.y; y += 16) g.lineBetween(top.x, y, top.x, y + 8);
  }
  if (p.road) tag(scene, c, (pic ? a.x + a.w - 40 : topX + 30), a.y + 22, p.road, { fill: 0x1E6B45, stroke: 0xFFFFFF, size: 14 });
  const lab = pic ? { backgroundColor: '#FFFFFFE6', padding: { x: 4, y: 2 } } : {};
  c.bringToTop(g);

  const stopScreen = id => {
    const stop = B1_ROUTE_STOPS.find(s => s.id === id);
    return pic && stop ? { x: pic.x - iw / 2 + iw * stop.x, y: pic.y - ih / 2 + ih * stop.y } : null;
  };
  const marks = {};
  const highlight = id => {
    hi.clear();
    const s = marks[id];
    if (s) { hi.lineStyle(4, C.yellow, 1); hi.strokeCircle(s.x, s.y, 18); }
  };
  (p.places || []).forEach(pl => {
    const s = stopScreen(pl.id) || toScreen(rx, pl.y);
    marks[pl.id] = s;
    const target = scene.add.zone(s.x, s.y, 68, 68).setInteractive({ useHandCursor: true });
    c.add(target);
    const inspect = () => { highlight(pl.id); announce(pl.kind === 'rest' ? 'Rest stop' : pl.name); };
    target.on('pointerup', inspect);
    mirror(target, 'Inspect ' + (pl.kind === 'rest' ? 'Rest stop' : pl.name), inspect, { onFocus: focused => { if (focused) highlight(pl.id); } });
    if (pl.kind === 'town') {
      g.fillStyle(0xFFFFFF, 1); g.fillCircle(s.x, s.y, 9); g.lineStyle(3, C.navy, 1); g.strokeCircle(s.x, s.y, 9);
      c.add(label(scene, s.x - 18, s.y, pl.name, 14, '#0B1B2E', lab).setOrigin(1, 0.5));
    } else {
      g.fillStyle(C.navy, 1); g.fillRoundedRect(s.x + 14, s.y - 13, 26, 26, 6);
      drawIcon(g, pl.kind === 'fuel' ? 'gravel' : 'info', s.x + 27, s.y, 18, C.yellow);
      c.add(label(scene, a.x + a.w - 12, s.y, pl.kind === 'rest' ? 'Rest stop' : pl.name, 13, '#0B1B2E', Object.assign({ fontStyle: 'normal' }, lab)).setOrigin(1, 0.5));
    }
  });

  const inst = {
    toScreen,
    pointPosition: pt => stopScreen(pt.id) || toScreen(pt.x, pt.y),
    highlight,
    destroy() {}
  };
  c.bringToTop(hi);
  const m = clipTo(scene, c, a);
  inst.destroy = () => { c.destroy(); m.destroy(); };
  return inst;
}
