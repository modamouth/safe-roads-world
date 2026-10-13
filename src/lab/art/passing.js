// Top-down: a car overtaking a cyclist on a two-lane road (left-hand traffic),
// with the side gap marked. setState({ gap, kmh }) moves the car out to that
// gap and animates the pass; a gap below `safeM` is drawn as a hatched,
// labelled danger zone (not colour alone).
//   params: { safeM, kmh, scene: 'town' | 'rural' }
import { COLORS as C, REDUCE_MOTION } from '../../config.js';
import { t } from '../content.js';
import { clipTo, label, tweenTo } from './common.js';

export default function create(scene, parent, p, a) {
  const c = scene.add.container(0, 0); parent.add(c);
  const g = scene.add.graphics(); c.add(g);
  const fx = scene.add.graphics(); c.add(fx);
  const txt = scene.add.container(0, 0); c.add(txt);
  const S = a.w / 13;                        // px per metre across
  const roadL = a.x + a.w / 2 - 3.6 * S, roadR = a.x + a.w / 2 + 3.6 * S, mid = a.x + a.w / 2;
  const edge = roadL + 0.2 * S;
  const st = { y: a.y + a.h + 60, gap: 1.5, scroll: 0, bob: 0 };
  const bikeX = edge + 0.75 * S, bikeY = a.y + a.h * 0.42;
  const rural = p.scene === 'rural';

  const draw = () => {
    g.clear(); fx.clear(); txt.removeAll(true);
    g.fillStyle(rural ? 0xC9A877 : 0xBFB59E, 1); g.fillRect(a.x, a.y, a.w, a.h);           // verge / sidewalk
    if (rural) { for (let i = 0; i < 9; i++) { g.fillStyle(0x8C9B54, 0.8); g.fillCircle(a.x + 20 + (i * 53) % (a.w - 40), a.y + ((i * 97 + st.scroll * 8) % a.h), 9); } }
    g.fillStyle(0x4A494D, 1); g.fillRect(roadL, a.y, roadR - roadL, a.h);
    g.fillStyle(0xF2F2F2, 1); g.fillRect(edge - 2, a.y, 3, a.h); g.fillRect(roadR - 0.2 * S - 1, a.y, 3, a.h);
    for (let y = a.y - 40 + (st.scroll * 30) % 40; y < a.y + a.h; y += 40) g.fillRect(mid - 2, y, 4, 22);

    // cyclist (top-down): wheels, body, helmet
    const bx = bikeX, byy = bikeY + Math.sin(st.bob) * 1.5;
    g.fillStyle(0x222222, 1); g.fillRoundedRect(bx - 3, byy - 0.9 * S, 6, 1.8 * S, 3);
    g.fillStyle(0x2E9E5B, 1); g.fillRoundedRect(bx - 9, byy - 10, 18, 20, 6);
    g.fillStyle(0xFFCB2B, 1); g.fillCircle(bx, byy - 4, 7);

    // car: outer edge of the cyclist + gap + half the car width
    const carW = 1.8 * S, carL = 4.5 * S;
    const cx = bx + 0.35 * S + st.gap * S + carW / 2, cy = st.y;
    g.fillStyle(0x000000, 0.25); g.fillRoundedRect(cx - carW / 2 + 3, cy - carL / 2 + 4, carW, carL, 8);
    g.fillStyle(0xF4F5F6, 1); g.fillRoundedRect(cx - carW / 2, cy - carL / 2, carW, carL, 8);
    g.fillStyle(0x1D2733, 0.92); g.fillRoundedRect(cx - carW * 0.38, cy - carL * 0.3, carW * 0.76, carL * 0.13, 3);
    g.fillRoundedRect(cx - carW * 0.34, cy + carL * 0.24, carW * 0.68, carL * 0.1, 3);

    // the side gap, measured at the moment the car is beside the rider
    const gx0 = bx + 0.35 * S, gx1 = gx0 + st.gap * S, unsafe = st.gap < p.safeM;
    const zy0 = bikeY - 1.6 * S, zy1 = bikeY + 1.6 * S;
    fx.fillStyle(unsafe ? C.red : C.green, 0.28); fx.fillRect(gx0, zy0, gx1 - gx0, zy1 - zy0);
    if (unsafe) { fx.lineStyle(2, C.red, 0.9); for (let y = zy0; y < zy1; y += 10) fx.lineBetween(gx0, y, gx1, y + 10); }
    fx.lineStyle(2, 0xFFFFFF, 0.9); fx.lineBetween(gx0, bikeY, gx1, bikeY);
    fx.lineBetween(gx0, bikeY - 6, gx0, bikeY + 6); fx.lineBetween(gx1, bikeY - 6, gx1, bikeY + 6);
    txt.add(label(scene, (gx0 + gx1) / 2 + (unsafe ? 34 : 0), bikeY - 1.6 * S - 14, st.gap.toFixed(1) + ' m  ' + t(unsafe ? 'art.passing.close' : 'art.passing.room'), 13, '#FFFFFF', { backgroundColor: '#05080DCC', padding: { x: 6, y: 3 } }));
  };

  const inst = {
    async setState(s) {
      st.gap = s.gap; st.y = a.y + a.h + 3 * S;
      draw();
      await tweenTo(scene, st, { y: bikeY }, REDUCE_MOTION ? 0 : 1300, REDUCE_MOTION);
      draw();
    },
    update(t, dt) { st.scroll += dt * (p.kmh || 50) / 36; st.bob += dt * 8; draw(); },
    destroy() {}
  };
  draw();
  const m = clipTo(scene, c, a);
  inst.destroy = () => { c.destroy(); m.destroy(); };
  return inst;
}
