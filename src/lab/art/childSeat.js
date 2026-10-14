// Child passenger pictograms (side view, simple shapes, no faces).
//   params.view:
//     'install'  child seat on a rear seat; setState({ firm }) replays a sudden stop
//     'harness'  child in a harnessed seat; setState({ snug }) replays a sudden stop
//     'belt'     child on the rear seat with an adult belt; setState({ booster })
//                shows where the belt sits; highlight(step) for the five-step check:
//                'back' | 'knees' | 'sash' | 'lap' | 'stay'
import { COLORS as C, REDUCE_MOTION } from '../../config.js';
import { t } from '../content.js';
import { stateImages } from './fit.js';
import { clipTo, label, tweenTo } from './common.js';

export default function create(scene, parent, p, a) {
  const c = scene.add.container(0, 0); parent.add(c);
  const g = scene.add.graphics(); c.add(g);
  const tags = scene.add.container(0, 0); c.add(tags);
  const view = p.view || 'install';
  const st = { ok: view === 'belt' ? !!p.booster : view === 'harness' ? !!p.snug : !!p.firm, k: 0, hi: null };
  const u = Math.min(a.w, a.h) / 10, sx = a.x + a.w * 0.62, sy = a.y + a.h * 0.78;
  const CHILD = 0xFFCB2B;

  const tag = (x, y, key, good) => tags.add(label(scene, x, y, (good ? '✓ ' : '✕ ') + t(key), 13, '#FFFFFF', { backgroundColor: good ? '#1E6B45' : '#8E2A2D', padding: { x: 6, y: 3 } }));

  const vehicleSeat = () => {
    g.fillStyle(0x0E1622, 1); g.fillRoundedRect(a.x, a.y, a.w, a.h, 18);
    g.fillStyle(0x4A5058, 1);
    g.fillRoundedRect(sx + 0.6 * u, sy - 5.4 * u, 1.2 * u, 5.6 * u, 8);    // seat back
    g.fillRoundedRect(sx - 3.4 * u, sy - 0.2 * u, 5.2 * u, 1.1 * u, 8);    // seat base
    g.fillStyle(0x34495E, 1); g.fillRoundedRect(a.x + 16, sy - 4.5 * u, 1.2 * u, 3.4 * u, 6);   // front seat back
  };

  const install = () => {
    vehicleSeat();
    const move = st.k * (st.ok ? 0.25 : 1.6) * u, tilt = st.k * (st.ok ? 0.02 : 0.25);
    const bx = sx - 2.4 * u - move, by = sy - 0.2 * u;
    const seat = scene.add.graphics(); tags.add(seat);
    seat.fillStyle(0x2E7D9A, 1); seat.fillRoundedRect(0, -4.6 * u, 3.0 * u, 4.6 * u, 14); seat.fillRoundedRect(-0.2 * u, -0.9 * u, 3.4 * u, 0.9 * u, 6);
    seat.fillStyle(CHILD, 1); seat.fillCircle(1.4 * u, -3.7 * u, 0.7 * u); seat.fillRoundedRect(0.9 * u, -3.0 * u, 1.2 * u, 2.0 * u, 8);
    seat.lineStyle(4, st.ok ? C.green : 0xFF8A1F, 1); seat.lineBetween(3.0 * u, -1.0 * u, 3.6 * u + move, -0.4 * u);   // anchor strap
    seat.setPosition(bx, by).setRotation(-tilt);
    if (st.k >= 1) {
      g.lineStyle(3, 0xFFFFFF, 0.9); g.lineBetween(sx - 2.4 * u, by - 5 * u, bx, by - 5 * u);
      tag(a.x + a.w / 2, a.y + 24, st.ok ? 'art.child.firm' : 'art.child.loose', st.ok);
    }
  };

  const harness = () => {
    vehicleSeat();
    const bx = sx - 2.4 * u, by = sy - 0.2 * u;
    g.fillStyle(0x2E7D9A, 1); g.fillRoundedRect(bx, by - 4.6 * u, 3.0 * u, 4.6 * u, 14);
    const lean = st.k * (st.ok ? 0.2 : 1.1);
    const hx = bx + 1.4 * u - lean * 1.6 * u, hy = by - 3.7 * u + lean * 0.6 * u;
    g.fillStyle(CHILD, 1); g.fillRoundedRect(bx + 0.9 * u - lean * 0.9 * u, by - 3.0 * u, 1.2 * u, 2.0 * u, 8); g.fillCircle(hx, hy, 0.7 * u);
    g.lineStyle(5, 0x1D2733, 1);
    const gap = st.ok ? 0 : 0.5 * u;
    g.lineBetween(bx + 1.9 * u, by - 3.4 * u, bx + 1.2 * u - gap - lean * 0.6 * u, by - 1.2 * u);
    if (st.k >= 1) tag(a.x + a.w / 2, a.y + 24, st.ok ? 'art.child.snug' : 'art.child.slack', st.ok);
  };

  const beltFit = () => {
    vehicleSeat();
    const lift = st.ok ? 1.0 * u : 0;   // booster raises the child
    if (st.ok) { g.fillStyle(0x2E7D9A, 1); g.fillRoundedRect(sx - 2.6 * u, sy - 1.2 * u, 3.0 * u, 1.0 * u, 6); }
    const hipX = sx + 0.2 * u, hipY = sy - 0.3 * u - lift;
    // child: torso against the seat back, thighs along the base, knees bent at the edge
    g.fillStyle(CHILD, 1);
    g.fillRoundedRect(hipX - 0.6 * u, hipY - 3.0 * u, 1.3 * u, 3.0 * u, 8); g.fillCircle(hipX, hipY - 3.7 * u, 0.7 * u);
    g.fillRoundedRect(hipX - 2.6 * u, hipY - 0.5 * u, 2.8 * u, 0.9 * u, 6);
    g.fillRoundedRect(hipX - 2.9 * u, hipY - 0.3 * u, 0.8 * u, 1.9 * u + lift, 6);
    // belt: sash and lap. Without a booster the sash crosses the neck and the lap belt the belly.
    const good = st.ok;
    g.lineStyle(6, good ? C.green : C.red, 1);
    g.lineBetween(hipX + 0.5 * u, good ? hipY - 3.0 * u : hipY - 3.45 * u, hipX - 0.5 * u, hipY - 0.6 * u);
    g.lineBetween(hipX - (good ? 1.6 : 0.6) * u, good ? hipY - 0.45 * u : hipY - 1.1 * u, hipX + 0.6 * u, good ? hipY - 0.2 * u : hipY - 1.0 * u);
    if (!good) { g.lineStyle(2, 0x05080D, 0.6); for (let i = 0; i < 4; i++) g.lineBetween(hipX - 0.4 * u + i * 6, hipY - 1.25 * u, hipX - 0.2 * u + i * 6, hipY - 0.85 * u); }
    const SPOT = { back: [hipX + 0.2 * u, hipY - 1.8 * u], knees: [hipX - 2.5 * u, hipY - 0.1 * u], sash: [hipX + 0.1 * u, hipY - 2.7 * u], lap: [hipX - 0.6 * u, hipY - 0.5 * u], stay: [hipX - 0.9 * u, hipY - 2.0 * u] };
    if (st.hi && SPOT[st.hi]) {
      const [x, y] = SPOT[st.hi];
      g.lineStyle(4, C.yellow, 1); g.strokeCircle(x, y, st.hi === 'stay' ? 3.2 * u : 0.9 * u);
    }
    tag(a.x + a.w / 2, a.y + 24, good ? 'art.child.beltGood' : 'art.child.beltBad', good);
  };

  // Illustrated artwork for 'install' and 'harness' when loaded; the drawn version is the fallback.
  // All three images share one frame: firm/snug (good), loose seat, slack straps.
  const badKey = view === 'harness' ? 'img_childseat_slack' : 'img_childseat_loose';
  const photo = view !== 'belt' && scene.textures.exists('img_childseat_firm') && scene.textures.exists(badKey);
  let photos = null;
  if (photo) {
    g.fillStyle(0x0E1622, 1); g.fillRoundedRect(a.x, a.y, a.w, a.h, 18);
    photos = stateImages(scene, c, ['img_childseat_firm', badKey], { x: a.x + 8, y: a.y + 38, w: a.w - 16, h: a.h - 46 });
    c.bringToTop(tags);
  }
  const drawPhoto = () => {
    tags.removeAll(true);
    const key = view === 'harness' ? (st.ok ? 'art.child.snug' : 'art.child.slack') : (st.ok ? 'art.child.firm' : 'art.child.loose');
    tag(a.x + a.w / 2, a.y + 22, key, st.ok);
    // Highlight the straps in normalized source-image coordinates.
    if (view === 'harness') {
      const im = photos.images[0], ox = im.x - im.displayWidth / 2, oy = im.y - im.displayHeight / 2;
      const overlay = scene.add.graphics(); tags.add(overlay);
      overlay.lineStyle(3, C.yellow, 1);
      (st.ok ? [[0.5, 0.38], [0.61, 0.51]] : [[0.64, 0.38], [0.68, 0.52]]).forEach(([x, y]) => overlay.strokeCircle(ox + im.displayWidth * x, oy + im.displayHeight * y, im.displayWidth * 0.08));
    }
  };
  const draw = () => { if (photo) { drawPhoto(); return; } g.clear(); tags.removeAll(true); (view === 'harness' ? harness : view === 'belt' ? beltFit : install)(); };
  const inst = {
    play(id) { return inst.setState({ firm: id === 'tighten' }); },
    highlight(id) { st.hi = id; draw(); },
    async setState(s) {
      if (s.highlight !== undefined) st.hi = s.highlight;
      const v = s.firm !== undefined ? s.firm : s.snug !== undefined ? s.snug : s.booster;
      if (v !== undefined) st.ok = !!v;
      if (view === 'belt') { draw(); return; }
      if (photos) { photos.show(st.ok ? 'img_childseat_firm' : badKey); draw(); return; }
      st.k = 0; st.shown = true; draw();
      await tweenTo(scene, st, { k: 1 }, REDUCE_MOTION ? 0 : 700, REDUCE_MOTION);
      draw();
    },
    update() { if (st.k > 0 && st.k < 1) draw(); },
    destroy() {}
  };
  if (photos) photos.show(st.ok ? 'img_childseat_firm' : badKey);
  draw();
  const m = clipTo(scene, c, a);
  inst.destroy = () => { c.destroy(); m.destroy(); };
  return inst;
}
