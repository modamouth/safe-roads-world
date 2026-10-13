// Crash-test lab: a car with a crash-test dummy is driven into a barrier.
// Uses the crash-lab photos (assets/labcar*.webp, labbg.webp) when they have
// loaded; otherwise a drawn car. Laid out in a 540-wide frame scaled to the area.
//   setState({ kmh, level: 'light' | 'medium' | 'severe' }) drives the car into the
//   barrier at that speed and shows the matching damage. Resolves when it settles.
// No people are shown hurt: only the dummy and the car's structure.
import { COLORS as C, REDUCE_MOTION } from '../../config.js';
import { clipTo, label } from './common.js';

const FRAME_W = 540;
// Photo layout (frame px). contact = barrier face; front = each photo's front edge (source px of the 760 px images).
const PHOTO = { bgX: -100, bgY: 0, bgW: 680, bgH: 659, ground: 483, contact: 460, carW: 400, front: { 0: 755, 60: 754, 80: 746, 90: 733 } };
const DAMAGE = { light: 60, medium: 80, severe: 90 };                      // which photo shows each damage level
const SEV = {
  light: { push: 4, shake: 0.004, crush: 0.3, approachMs: 1500 },
  medium: { push: 9, shake: 0.009, crush: 0.62, approachMs: 1200 },
  severe: { push: 15, shake: 0.016, crush: 1.0, approachMs: 1050 }
};
// Drawn fallback layout (frame px)
const DRAWN = { floor: 460, barrierX: 396, carLen: 300, top: 200 };

function fallbackTextures(scene) {
  if (scene.textures.exists('lab_bg_drawn')) return;
  const tex = scene.textures.createCanvas('lab_bg_drawn', FRAME_W, 640), c = tex.getContext();
  const g1 = c.createLinearGradient(0, 0, 0, 466); g1.addColorStop(0, '#08111E'); g1.addColorStop(1, '#14304C');
  c.fillStyle = g1; c.fillRect(0, 0, FRAME_W, 466);
  const g2 = c.createLinearGradient(0, 466, 0, 640); g2.addColorStop(0, '#1F3B58'); g2.addColorStop(1, '#08111E');
  c.fillStyle = g2; c.fillRect(0, 466, FRAME_W, 174);
  tex.refresh();
}

/** Drawn stand-in car (side view, dummy at the wheel). r = rear x, p = crush px. */
function drawCar(g, r, p, lurch, air) {
  const FY = DRAWN.floor, L = DRAWN.carLen;
  const nx = r + L - p, hx = r + 205 - p * 0.25, mx = r + 250 - p * 0.55, my = FY - 100 - p * 0.32, dip = p * 0.05;
  g.clear();
  g.fillStyle(0x000000, 0.35); g.fillEllipse(r + L * 0.5 - p * 0.5, FY + 4, L - p * 0.6, 16);
  g.fillStyle(0xEEF1F5, 1);
  g.fillPoints([{ x: r + 6, y: FY - 30 }, { x: r + 4, y: FY - 92 }, { x: r + 70, y: FY - 98 }, { x: hx, y: FY - 98 }, { x: mx, y: my }, { x: nx, y: FY - 80 + p * 0.1 }, { x: nx, y: FY - 32 }], true);
  g.fillStyle(0xC3CBD6, 1);
  g.fillPoints([{ x: r + 6, y: FY - 30 }, { x: r + 5, y: FY - 58 }, { x: nx, y: FY - 58 }, { x: nx, y: FY - 32 }], true);
  g.fillStyle(C.teal, 1); g.fillRect(r + 8, FY - 63, Math.max(0, nx - r - 8), 4);
  g.fillStyle(0xE3E8EE, 1);
  g.fillPoints([{ x: r + 62, y: FY - 98 }, { x: r + 84, y: FY - 152 + dip }, { x: r + 178 - p * 0.25, y: FY - 152 + dip }, { x: r + 208 - p * 0.28, y: FY - 100 }], true);
  g.fillStyle(0x24364B, 0.96);
  g.fillPoints([{ x: r + 92, y: FY - 105 }, { x: r + 100, y: FY - 145 + dip }, { x: r + 172 - p * 0.25, y: FY - 145 + dip }, { x: r + 192 - p * 0.28, y: FY - 105 }], true);
  // crash-test dummy (yellow, with the target marks on its head)
  const sx = r + 128 + lurch * (30 + p * 0.22), sy = FY - 136 + lurch * 8;
  g.lineStyle(14, C.yellow, 1); g.lineBetween(r + 118, FY - 108, sx, sy);
  g.lineStyle(9, C.yellow, 1); g.lineBetween(sx, sy + 6, r + 172 - p * 0.25 + lurch * 4, FY - 118);
  const hx2 = sx + 6 + lurch * 16, hy2 = sy - 16 + lurch * 8;
  g.fillStyle(C.yellow, 1); g.fillCircle(hx2, hy2, 14);
  g.lineStyle(2, C.navy, 1); g.strokeCircle(hx2, hy2, 14); g.lineBetween(hx2 - 14, hy2, hx2 + 14, hy2); g.lineBetween(hx2, hy2 - 14, hx2, hy2 + 14);
  if (air > 0) { g.fillStyle(0xFFFFFF, 0.85 * Math.min(1, air)); g.fillCircle(r + 172 - p * 0.25 + lurch * 6, FY - 118, 12 + air * 38); }
  if (p > 6) {
    g.fillStyle(0x000000, 0.16 * (p / 118));
    g.fillPoints([{ x: hx, y: FY - 98 }, { x: mx, y: my }, { x: nx, y: FY - 80 + p * 0.1 }, { x: nx, y: FY - 32 }, { x: hx - 6, y: FY - 32 }], true);
    g.lineStyle(2, 0x7C879A, 0.9);
    for (let i = 1; i <= 4; i++) { const x = nx - p * 0.18 * i - 7 * i; g.lineBetween(x, FY - 96 - p * 0.15, x - 9, FY - 42); }
  }
  [[r + 62, FY - 30], [r + 238 - p * 0.95, FY - 30 - p * 0.05]].forEach(w => {
    g.fillStyle(0x0A0F16, 1); g.fillCircle(w[0], w[1], 34);
    g.fillStyle(0x10151C, 1); g.fillCircle(w[0], w[1], 30);
    g.fillStyle(0x8B97A6, 1); g.fillCircle(w[0], w[1], 14);
  });
}

export default function create(scene, parent, p, a) {
  const outer = scene.add.container(0, 0); parent.add(outer);
  const s = a.w / FRAME_W;
  const c = scene.add.container(a.x, a.y).setScale(s); outer.add(c);
  const real = ['labbg', 'labcar0', 'labcar60', 'labcar80', 'labcar90'].every(k => scene.textures.exists('img_' + k));
  const st = { rear: -460, crush: 0, lurch: 0, air: 0 };

  c.add(scene.add.rectangle(0, 0, FRAME_W, a.h / s, 0x05080D).setOrigin(0));
  let carA = null, carB = null, shadow = null, g = null;
  if (real) {
    c.add(scene.add.image(PHOTO.bgX, PHOTO.bgY, 'img_labbg').setOrigin(0).setDisplaySize(PHOTO.bgW, PHOTO.bgH));
    shadow = scene.add.image(0, PHOTO.ground - 3, 'shadow').setDisplaySize(PHOTO.carW * 1.05, 38); c.add(shadow);
    carA = scene.add.image(0, PHOTO.ground, 'img_labcar0').setOrigin(0, 1);
    carB = scene.add.image(0, PHOTO.ground, 'img_labcar0').setOrigin(0, 1).setAlpha(0);
    const k = PHOTO.carW / carA.width; carA.setScale(k); carB.setScale(k);
    c.add([carA, carB]);
  } else {
    fallbackTextures(scene);
    c.add(scene.add.image(0, 0, 'lab_bg_drawn').setOrigin(0));
    const b = scene.add.graphics(); c.add(b);
    const bx = DRAWN.barrierX, top = DRAWN.top, fl = DRAWN.floor;
    b.fillStyle(C.yellow, 0.9); b.fillRect(0, fl + 8, FRAME_W, 4);
    b.fillStyle(0x596779, 1); b.fillRect(bx, top, FRAME_W - bx, fl - top);
    b.fillStyle(0x8A96A8, 1); b.fillRect(bx, top, 12, fl - top);
    g = scene.add.graphics(); c.add(g);
  }
  const flash = scene.add.rectangle(0, 0, FRAME_W, a.h / s, 0xFFF0DC, 0).setOrigin(0); c.add(flash);
  const speedTag = label(scene, FRAME_W / 2, 36, '', 26, '#FFFFFF', { backgroundColor: '#05080DCC', padding: { x: 10, y: 4 } }); c.add(speedTag);

  const photoW = () => carA.width;   // source width of the 760 px photos
  const stopAt = key => PHOTO.contact - PHOTO.front[key] * (PHOTO.carW / photoW());
  const place = () => {
    if (real) { carA.x = st.rear; carB.x = st.rear; shadow.x = st.rear + PHOTO.carW * 0.5; }
    else drawCar(g, st.rear, st.crush, st.lurch, st.air);
  };
  place();

  let seq = 0;
  const inst = {
    alt: null,
    setState(sv) {
      const my = ++seq;
      const lvl = SEV[sv.level] ? sv.level : 'medium', sev = SEV[lvl], dmg = DAMAGE[lvl];
      scene.tweens.killTweensOf(st);
      speedTag.setText(sv.kmh ? sv.kmh + ' km/h' : '');
      Object.assign(st, { rear: real ? -PHOTO.carW - 20 : -340, crush: 0, lurch: 0, air: 0 });
      if (real) { carA.setTexture('img_labcar0'); carB.setAlpha(0); }
      place();
      const endRear = real ? stopAt(0) : DRAWN.barrierX - DRAWN.carLen;
      return new Promise(res => {
        const impact = () => {
          if (my !== seq) return res();
          if (!REDUCE_MOTION) {
            scene.cameras.main.shake(380, sev.shake);
            flash.setAlpha(0.7); scene.tweens.add({ targets: flash, alpha: 0, duration: 220 });
          }
          if (real) {
            carB.setTexture('img_labcar' + dmg).setAlpha(0);
            scene.tweens.add({ targets: carB, alpha: 1, duration: 70, onComplete: () => { carA.setTexture('img_labcar' + dmg); carB.setAlpha(0); } });
            scene.tweens.add({ targets: st, rear: stopAt(dmg) + sev.push * 0.35, duration: REDUCE_MOTION ? 0 : 420, ease: 'Cubic.easeOut', onUpdate: place, onComplete: () => { place(); res(); } });
          } else {
            const cp = sev.crush * 118;
            scene.tweens.add({ targets: st, crush: cp, duration: REDUCE_MOTION ? 0 : 380, ease: 'Cubic.easeOut', onUpdate: () => { st.rear = endRear + st.crush; place(); } });
            scene.tweens.add({ targets: st, lurch: 1, duration: REDUCE_MOTION ? 0 : 380, ease: 'Quad.easeOut', onUpdate: place });
            scene.tweens.add({ targets: st, air: 1, duration: REDUCE_MOTION ? 0 : 140, onUpdate: place, onComplete: () => { scene.time.delayedCall(REDUCE_MOTION ? 0 : 500, () => { place(); res(); }); } });
          }
        };
        if (REDUCE_MOTION) { st.rear = endRear; place(); impact(); return; }
        scene.tweens.add({ targets: st, rear: endRear, duration: sev.approachMs, ease: 'Linear', onUpdate: place, onComplete: impact });
      });
    },
    destroy() {}
  };
  const m = clipTo(scene, outer, a);
  inst.destroy = () => { seq++; scene.tweens.killTweensOf(st); outer.destroy(); m.destroy(); };
  return inst;
}
