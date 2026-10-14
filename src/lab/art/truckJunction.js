// Top-down dual carriageway approaching traffic lights, a loaded truck in the
// left lane and your car beside it on the right (left-hand traffic).
// World units are metres; y = 0 is the truck's front when the light turns yellow.
//   params: { speedKmh, truckReactS, truckDecel }
//   play('move' | 'stay', vars): 'move' cuts in front of the truck and brakes for
//   the light; the scene freezes before any contact (no collision is shown) and
//   writes vars.truckKmh, the truck's speed when it reaches your car.
import { COLORS as C, clamp, REDUCE_MOTION } from '../../config.js';
import { clipTo } from './common.js';

const L_LANE = -1.75, R_LANE = 1.75, TRUCK_L = 16.5, TRUCK_W = 2.5, CAR_L = 4.5, CAR_W = 1.85;
const LINE = 100, FREEZE_GAP = 3;

export default function create(scene, parent, p, a) {
  const c = scene.add.container(0, 0); parent.add(c);
  const g = scene.add.graphics(); c.add(g);
  const S = Math.min(12, a.w / 34), X0 = a.x + a.w / 2 - 3.5 * S, CAM0 = a.y + a.h * 0.62;
  const v = p.speedKmh / 3.6;
  const st = { phase: 'cruise', light: 'green', camY: 0, tc: 0, dim: false };
  // Illustrated traffic light in the corner, showing the current state (when the art is loaded).
  const tlImg = scene.textures.exists('tl_green') ? scene.add.image(a.x + a.w - 14, a.y + 14, 'tl_green').setOrigin(1, 0) : null;
  if (tlImg) tlImg.setScale(110 / tlImg.height);
  const truck = { y: 0, v, x: L_LANE, brake: false };
  const car = { y: 6, v, x: R_LANE, brake: false };
  const queue = [{ y: 66, v: 50 / 3.6, stopAt: LINE - 1 }, { y: 57, v: 50 / 3.6, stopAt: LINE - 7.5 }];
  let done = null;
  const sx = x => X0 + x * S, sy = y => CAM0 - (y - st.camY) * S;

  const carTop = (x, yFront, body, brake, rot, ring) => {
    const w = CAR_W * S, l = CAR_L * S, cx = sx(x), top = rot ? sy(yFront + CAR_L) : sy(yFront);
    g.fillStyle(0x000000, 0.28); g.fillRoundedRect(cx - w / 2 + 2, top + 2, w, l, 4);
    g.fillStyle(body, 1); g.fillRoundedRect(cx - w / 2, top, w, l, 4);
    g.fillStyle(0x1D2733, 0.9); g.fillRect(cx - w * 0.36, top + l * (rot ? 0.62 : 0.22), w * 0.72, l * 0.13);
    if (brake && !rot) { g.fillStyle(0xFF2A2A, 1); g.fillRect(cx - w / 2, top + l - 2, 4, 3); g.fillRect(cx + w / 2 - 4, top + l - 2, 4, 3); }
    if (ring) { g.lineStyle(2, C.teal, 1); g.strokeRoundedRect(cx - w / 2 - 4, top - 4, w + 8, l + 8, 6); }
  };
  const truckTop = () => {
    const w = TRUCK_W * S, cx = sx(truck.x), top = sy(truck.y);
    g.fillStyle(0x000000, 0.28); g.fillRect(cx - w / 2 + 3, top + 3, w, TRUCK_L * S);
    g.fillStyle(0xF4F5F6, 1); g.fillRoundedRect(cx - w / 2, top, w, 3 * S, { tl: 6, tr: 6, bl: 2, br: 2 });
    g.fillStyle(0x24364B, 1); g.fillRect(cx - w / 2 + 3, top + 4, w - 6, 5);
    g.fillStyle(0x8A6F5A, 1); g.fillRect(cx - w / 2, top + 3.4 * S, w, (TRUCK_L - 3.4) * S);    // loaded flatbed
    g.fillStyle(0xA98B6E, 1); for (let i = 0; i < 4; i++) g.fillRect(cx - w / 2 + 3, top + (4 + i * 3) * S, w - 6, 2.4 * S);
    if (truck.brake) { g.fillStyle(0xFF2A2A, 1); g.fillRect(cx - w / 2, top + TRUCK_L * S - 3, 5, 3); g.fillRect(cx + w / 2 - 5, top + TRUCK_L * S - 3, 5, 3); }
  };
  const draw = () => {
    g.clear();
    g.fillStyle(0x6E8A4E, 1); g.fillRoundedRect(a.x, a.y, a.w, a.h, 18);
    g.fillStyle(0x4E4D52, 1); g.fillRect(sx(-3.8), a.y, 7.6 * S, a.h); g.fillRect(sx(5.4), a.y, 7.6 * S, a.h);
    g.fillStyle(0xB9B6AE, 1); g.fillRect(sx(3.8), a.y, 1.6 * S, a.h);
    g.fillStyle(0xF2F2F2, 0.9);
    g.fillRect(sx(-3.5) - 1, a.y, 2, a.h); g.fillRect(sx(3.5) - 1, a.y, 2, a.h);
    const yTop = st.camY + (CAM0 - a.y) / S, yBot = st.camY - (a.y + a.h - CAM0) / S;
    for (let y = Math.floor(yBot / 9) * 9; y < yTop; y += 9) {
      if (y > LINE - 0.5 && y < LINE + 14) continue;
      g.fillRect(sx(0) - 1.5, sy(y + 3), 3, 3 * S); g.fillRect(sx(9.2) - 1.5, sy(y + 3), 3, 3 * S);
    }
    g.fillStyle(0x4E4D52, 1); g.fillRect(a.x, sy(LINE + 14), a.w, 14 * S);
    g.fillStyle(0xF2F2F2, 1); g.fillRect(sx(-3.5), sy(LINE) - 2, 7 * S, 4);
    const lc = { green: 0x3DBE7A, yellow: 0xFFCB2B, red: 0xE5484D }[st.light];
    [[-4.6, LINE], [4.6, LINE]].forEach(([x, y]) => {
      g.fillStyle(0x1C1C1E, 1); g.fillRoundedRect(sx(x) - 6, sy(y) - 22, 12, 30, 3);
      ['red', 'yellow', 'green'].forEach((k, i) => { g.fillStyle(k === st.light ? lc : 0x333333, 1); g.fillCircle(sx(x), sy(y) - 15 + i * 9, 3.5); });
    });
    [[7.45, LINE + 30, 0x8A8F96], [10.95, LINE - 30, 0xA93226], [7.45, 20, 0x3C7FC2]].forEach(([x, y, k]) => carTop(x, y, k, false, true));
    queue.forEach((q, i) => carTop(R_LANE, q.y, [0xC9CED6, 0x5C7F6A][i], q.brake));
    truckTop();
    carTop(car.x, car.y, 0xFFFFFF, car.brake, false, true);
    if (st.dim) { g.fillStyle(0x05080D, 0.35); g.fillRect(a.x, a.y, a.w, a.h); carTop(car.x, car.y, 0xFFFFFF, true, false, true); truckTop(); }
  };

  // Start a little behind the decision point, cruising.
  const CRUISE = 1.6;
  [truck, car, ...queue].forEach(o => { o.y -= o.v * CRUISE; });
  st.t = -CRUISE; st.camY = car.y;

  const inst = {
    play(choice, vars) {
      return new Promise(res => {
        done = kmh => { vars.truckKmh = kmh; res(); };
        st.choice = choice; st.phase = choice; st.tc = 0; st.light = 'yellow';
        if (choice === 'move') { car.v2 = 100 / 3.6; car.changeT = 1.4; }
        else { car.decel = car.v * car.v / (2 * (LINE - 14 - car.y)); car.brake = true; }
        scene.time.delayedCall(1800, () => { st.light = 'red'; });
        if (REDUCE_MOTION) { for (let i = 0; i < 400 && done; i++) inst.update(0, 0.05); }
      });
    },
    update(t, dt) {
      if (st.phase === 'cruise') {
        // keep everyone cruising up to the decision point, then hold
        if (st.t < 0) { const d = Math.min(dt, -st.t); st.t += d; [truck, car, ...queue].forEach(o => { o.y += o.v * d; }); }
      } else if (st.phase === 'move' || st.phase === 'stay') {
        st.tc += dt;
        queue.forEach(q => {
          if (!q.decel) q.decel = q.v * q.v / (2 * Math.max(1, q.stopAt - q.y));
          if (q.v > 0) { q.v = Math.max(0, q.v - q.decel * dt); q.y += q.v * dt; q.brake = true; }
        });
        if (st.phase === 'move') {
          if (st.tc < car.changeT) {
            car.v = car.v + (car.v2 - car.v) * clamp(dt * 3, 0, 1);
            const k = st.tc / car.changeT; car.x = R_LANE + (L_LANE - R_LANE) * (0.5 - Math.cos(Math.PI * k) / 2);
          } else {
            if (!car.brake) { car.brake = true; car.decel = car.v * car.v / (2 * (LINE - 0.5 - car.y)); }
            car.v = Math.max(0, car.v - car.decel * dt);
          }
          car.y += car.v * dt;
          if (st.tc >= p.truckReactS) { truck.brake = true; truck.v = Math.max(0, truck.v - p.truckDecel * dt); }
          truck.y += truck.v * dt;
          const inLane = st.tc >= car.changeT;
          if ((inLane && car.y - CAR_L - truck.y <= FREEZE_GAP) || truck.v === 0) { st.phase = 'done'; st.dim = truck.v > 0; finish(Math.round(truck.v * 3.6)); }
        } else {
          car.v = Math.max(0, car.v - car.decel * dt); car.y += car.v * dt;
          truck.y += truck.v * dt;
          if (car.v === 0 && truck.y > LINE + 40) { st.phase = 'done'; finish(0); }
        }
      }
      st.camY = car.y;
      draw();
    },
    destroy() {}
  };
  if (tlImg) { c.add(tlImg); const upd = inst.update; inst.update = (t2, dt) => { upd(t2, dt); tlImg.setTexture('tl_' + st.light); c.bringToTop(tlImg); }; }
  function finish(kmh) { const d = done; done = null; if (d) d(kmh); }
  draw();
  const m = clipTo(scene, c, a);
  inst.destroy = () => { c.destroy(); m.destroy(); };
  return inst;
}
