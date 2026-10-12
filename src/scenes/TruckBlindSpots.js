import Phaser from 'phaser';
import { W, H, COLORS as C, FONT, state, track, REDUCE_MOTION } from '../config.js';
import { setupCam, viewBounds, T, button, soundToggle, iconButton, makeCaption, panel } from '../ui.js';
import { experienceById } from '../experiences.js';
import { Sfx } from '../sfx.js';

// Top-down multi-lane road, left-hand traffic, everyone driving up the screen.
// World units are metres: x across (0 = truck's lane centre, left negative), y along
// (0 = front of the truck's cab, forward positive).
const S = 17, X0 = W / 2, Y0 = 300;
const sx = x => X0 + x * S, sy = y => Y0 - y * S;
const LANE = 3.5, TRUCK_W = 2.5, CAB_L = 2.6, TRUCK_L = 16.2;

// The truck driver's blind spots. The driver sits on the right, so the biggest
// one is on the left (passenger) side. Shapes are illustrative; validate them.
export const ZONES = [
  { id: 1, name: 'Left side', label: [-7.5, -4], pts: [[-1.4, 0.3], [-11, 0.3], [-11, -12.5], [-1.4, -1.2]] },
  { id: 2, name: 'Right side', label: [6.2, -4.4], pts: [[1.4, 0], [10, -4.5], [10, -11], [1.4, -1.5]] },
  { id: 3, name: 'In front', label: [0, 1.7], pts: [[-1.3, 0.2], [1.3, 0.2], [1.8, 3.2], [-1.8, 3.2]] },
  { id: 4, name: 'Behind', label: [0, -19.1], pts: [[-1.3, -16.4], [1.3, -16.4], [1.3, -21.8], [-1.3, -21.8]] }
];

// Explanations per zone (standard heavy-vehicle guidance; wording to be validated).
const ZONE_TEXT = {
  1: 'The biggest blind spot is on the left, the passenger side. It can stretch across more than one lane and back along the trailer. Never sit beside a truck on its left, and never pass a truck that is turning left.',
  2: 'On the driver’s side, the blind spot runs back from the cab. If you overtake on the right, do it quickly and don’t stay beside the truck.',
  3: 'Right in front of the cab, the driver can’t see low cars, people or animals. When you pull in ahead of a truck, leave plenty of space.',
  4: 'Close behind the trailer, the driver can’t see you, and you can’t see the road ahead. Drop back until you can see the truck’s side mirrors.'
};

// Road users for the "spot them" task: [kind, x, y, colour]
const USERS = [
  ['ped', 0, 1.8], ['moto', -3.5, -2.4, 0x2E9E5B], ['car', -7, -4, 0x7B5CC9], ['bike', -9.5, -10, 0x333333],
  ['car', -3.5, -8, 0xE5B93A], ['car', -3.5, 3.6, 0xD8642B], ['ped', -9, 4.2],
  ['car', 3.5, -2.6, 0x46B8B0], ['car', 7, -6, 0x3C7FC2], ['moto', 3.5, 2.6, 0xC0392B], ['bike', 7.5, 1.6, 0x2E7D4F],
  ['moto', 3.5, -9.5, 0x34495E], ['bike', 7, -12, 0x2E9E5B],
  ['car', 0, -19, 0x8A8F96], ['van', -3.5, -20.5, 0x3C7FC2], ['car', 3.5, -19.5, 0x6A4FB5], ['car', -7.5, -20, 0xA93226], ['car', 7, -20, 0x222831]
];
const SIZE = { car: [1.8, 4.4], van: [2.0, 6.5], moto: [0.8, 2.0], bike: [0.6, 1.8], ped: [0.8, 0.6] };

function inPoly(x, y, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
const zoneAt = (x, y) => ZONES.find(z => inPoly(x, y, z.pts));
/** Does a w x l rectangle centred on (x, y) overlap a zone? (sampled) */
function rectInZone(x, y, w, l, z) {
  for (let i = 0; i <= 4; i++) for (let j = 0; j <= 4; j++) if (inPoly(x - w / 2 + w * i / 4, y - l / 2 + l * j / 4, z.pts)) return true;
  return false;
}

export default class TruckBlindSpots extends Phaser.Scene {
  constructor() { super('TruckBlindSpots'); }

  create(data) {
    setupCam(this);
    Sfx.init(this);
    this.cameras.main.fadeIn(250, 8, 17, 30);
    this.leaving = false; // scene instances are reused between visits
    this.e = experienceById(data.id);
    this.o = this.e.intro.options.find(p => p.id === data.perspective);
    this.key = this.e.id + '.' + this.o.id;
    this.vb = viewBounds(this);
    this.scroll = 0; this.moving = true; this.blink = false;

    this.roadG = this.add.graphics().setDepth(0);
    this.zoneG = this.add.graphics().setDepth(5);
    this.userG = this.add.graphics().setDepth(8);
    this.truckG = this.add.graphics().setDepth(10);
    this.carG = this.add.graphics().setDepth(12);
    this.fxG = this.add.graphics().setDepth(14);
    this.ui = this.add.container(0, 0).setDepth(1001);
    this.labels = this.add.container(0, 0).setDepth(16);

    iconButton(this, 44, 44, 'back', () => this.go('ExperienceIntro', { id: this.e.id })).setDepth(2000);
    soundToggle(this);
    this.cap = makeCaption(this, 150, 1000);

    this.car = { x: -LANE, y: -4, on: true };
    this.time.addEvent({ delay: 420, loop: true, callback: () => { this.blink = !this.blink; this.drawTruck(); } });
    this.drawTruck(); this.drawCar();
    this.step0();
  }

  // --- drawing ---------------------------------------------------------------------
  drawRoad() {
    const g = this.roadG, v = this.vb; g.clear();
    g.fillStyle(0x5E6670, 1); g.fillRect(v.left, v.top, v.width, v.height);
    g.fillStyle(0x6B737D, 1); g.fillRect(sx(-8.75), v.top, 17.5 * S, v.height);
    g.fillStyle(0xB9B6AE, 0.8); g.fillRect(sx(-8.75) - 3, v.top, 3, v.height); g.fillRect(sx(8.75), v.top, 3, v.height);
    const off = (this.scroll * S) % 40;
    g.fillStyle(0xF2F2F2, 0.75);
    [-5.25, -1.75, 1.75, 5.25].forEach(x => {
      for (let y = v.top - 40 + off; y < v.bottom; y += 40) g.fillRect(sx(x) - 1.5, y, 3, 20);
    });
  }

  drawTruck() {
    const g = this.truckG; g.clear();
    const w = TRUCK_W * S, x = sx(-TRUCK_W / 2);
    g.fillStyle(0x000000, 0.25); g.fillRoundedRect(x + 3, sy(0) + 4, w, TRUCK_L * S, 6);
    // trailer
    g.fillStyle(0xEEF0F2, 1); g.fillRoundedRect(x, sy(-3.0), w, (TRUCK_L - 3.0) * S, 4);
    g.fillStyle(0xD9DDE2, 1); g.fillRect(x + 4, sy(-3.0) + 4, w - 8, (TRUCK_L - 3.0) * S - 8);
    // cab
    g.fillStyle(0xF4F5F6, 1); g.fillRoundedRect(x, sy(0), w, CAB_L * S, { tl: 12, tr: 12, bl: 3, br: 3 });
    g.fillStyle(0x24364B, 0.95); g.fillRoundedRect(x + 5, sy(0) + 6, w - 10, 9, 3);
    g.fillStyle(0xC9CED6, 1); g.fillRect(x + 6, sy(-1.6), w - 12, 3);
    // mirrors
    g.fillStyle(0x3B3F46, 1); g.fillRect(x - 7, sy(-0.5), 6, 9); g.fillRect(x + w + 1, sy(-0.5), 6, 9);
    // left indicators (front corner + rear corner)
    if (this.indicating) {
      g.fillStyle(0xFFB020, this.blink ? 1 : 0.25);
      g.fillCircle(x + 3, sy(0) + 4, 4); g.fillCircle(x + 3, sy(-TRUCK_L) - 4, 4);
      if (this.blink) { g.fillStyle(0xFFB020, 0.3); g.fillCircle(x + 3, sy(0) + 4, 10); g.fillCircle(x + 3, sy(-TRUCK_L) - 4, 10); }
    }
  }

  drawCar() {
    const g = this.carG; g.clear();
    if (!this.car.on) return;
    const cx = sx(this.car.x), cy = sy(this.car.y), w = 1.85 * S, l = 4.5 * S;
    g.fillStyle(0x000000, 0.28); g.fillRoundedRect(cx - w / 2 + 2, cy - l / 2 + 3, w, l, 7);
    g.fillStyle(0xFFFFFF, 1); g.fillRoundedRect(cx - w / 2, cy - l / 2, w, l, 8);
    g.fillStyle(0x1D2733, 0.92); g.fillRoundedRect(cx - w * 0.38, cy - l * 0.3, w * 0.76, l * 0.14, 3);
    g.fillRoundedRect(cx - w * 0.34, cy + l * 0.24, w * 0.68, l * 0.1, 3);
    g.fillStyle(0xE5484D, 1); g.fillRect(cx - w / 2 + 2, cy + l / 2 - 3, 6, 2); g.fillRect(cx + w / 2 - 8, cy + l / 2 - 3, 6, 2);
    if (this.carRing) { g.lineStyle(3, this.carRing, 1); g.strokeRoundedRect(cx - w / 2 - 5, cy - l / 2 - 5, w + 10, l + 10, 10); }
  }

  drawZones(ids, o) {
    o = o || {};
    const g = this.zoneG; g.clear(); this.labels.removeAll(true);
    ZONES.filter(z => ids.includes(z.id)).forEach(z => {
      const pts = z.pts.map(([x, y]) => ({ x: sx(x), y: sy(y) }));
      const hi = o.highlight === z.id, dim = o.highlight && !hi;
      g.fillStyle(hi ? C.yellow : 0xFFFFFF, hi ? 0.28 : dim ? 0.06 : 0.16); g.fillPoints(pts, true);
      g.lineStyle(2, hi ? C.yellow : 0xFFFFFF, dim ? 0.35 : 0.95); g.strokePoints(pts, true, true);
      if (o.numbers) this.labels.add(T(this, sx(z.label[0]), sy(z.label[1]), String(z.id), 30, dim ? '#9AA6B5' : '#FFFFFF'));
    });
  }

  drawUsers(marks) {
    const g = this.userG; g.clear();
    USERS.forEach((u, i) => {
      const [kind, x, y, col] = u, [w, l] = SIZE[kind], cx = sx(x), cy = sy(y);
      const m = marks && marks[i];
      if (m) {
        const mc = { sel: 0xFFFFFF, ok: C.green, wrong: C.red, missed: 0xFF8A1F }[m];
        g.fillStyle(mc, m === 'sel' ? 0.22 : 0.42); g.fillRoundedRect(cx - w * S / 2 - 9, cy - l * S / 2 - 9, w * S + 18, l * S + 18, 10);
        g.lineStyle(2, mc, 1); g.strokeRoundedRect(cx - w * S / 2 - 9, cy - l * S / 2 - 9, w * S + 18, l * S + 18, 10);
      }
      if (kind === 'car' || kind === 'van') {
        g.fillStyle(0x000000, 0.25); g.fillRoundedRect(cx - w * S / 2 + 2, cy - l * S / 2 + 3, w * S, l * S, 6);
        g.fillStyle(col, 1); g.fillRoundedRect(cx - w * S / 2, cy - l * S / 2, w * S, l * S, kind === 'van' ? 3 : 7);
        if (kind === 'van') { g.fillStyle(0xE8E8E8, 1); g.fillRect(cx - w * S / 2 + 2, cy - l * S / 2 + 18, w * S - 4, l * S - 22); }
        g.fillStyle(0x1D2733, 0.9); g.fillRoundedRect(cx - w * S * 0.38, cy - l * S * 0.3, w * S * 0.76, l * S * 0.13, 3);
      } else if (kind === 'moto' || kind === 'bike') {
        g.fillStyle(0x222222, 1); g.fillRoundedRect(cx - 3, cy - l * S / 2, 6, l * S, 3);
        g.fillStyle(col, 1); g.fillRoundedRect(cx - 5, cy - 7, 10, 14, 4);
        g.fillStyle(0x2A1A12, 1); g.fillCircle(cx, cy - 2, 4);
        g.lineStyle(2, 0x222222, 1); g.lineBetween(cx - 8, cy - l * S / 2 + 6, cx + 8, cy - l * S / 2 + 6);
      } else {
        g.fillStyle(0xE8743B, 1); g.fillEllipse(cx, cy, 15, 9); g.fillStyle(0x2A1A12, 1); g.fillCircle(cx, cy, 4);
      }
    });
  }

  update(time, delta) {
    if (this.moving && !REDUCE_MOTION) this.scroll += 14 * delta / 1000;
    this.drawRoad();
  }

  // --- steps -------------------------------------------------------------------------
  next(label, fn, o) {
    this.ui.removeAll(true);
    this.ui.add(button(this, W / 2, (o && o.y) || 880, 220, 62, label, () => { this.ui.removeAll(true); fn(); },
      { size: 24, fill: C.yellow, fillA: 1, color: '#0B1B2E' }));
  }

  step0() {
    track('scenario_start', { scenario: this.key });
    this.cap.set('You’re the car driver on the left side of the truck.');
    this.next('Start', () => this.step1());
  }

  step1() {
    this.indicating = true; this.drawTruck();
    this.cap.set('The truck is indicating left and you’re in the driver’s blind spot.\nLet’s take a look at how big the blind spot is.');
    this.next('Continue', () => this.step2());
  }

  step2() {
    this.moving = false;
    this.drawZones([1], { highlight: 1 });
    this.carRing = 0xFF8A1F; this.drawCar();
    this.cap.set('This is the driver’s left blind spot. Your whole car is inside it. If the truck turns, the driver won’t see you.');
    this.next('Continue', () => this.stepPosition());
  }

  // Drag the car up or down its lane, then confirm.
  stepPosition() {
    this.indicating = false; this.drawTruck();
    this.zoneG.clear(); this.labels.removeAll(true);
    this.carRing = C.teal; this.drawCar();
    this.cap.set('Drag your car up or down to place it in the safest position, outside of the truck driver’s left blind spot.');
    const v = this.vb;
    const drag = this.add.zone(W / 2, (v.top + 780) / 2, v.width, 780 - v.top).setInteractive({ useHandCursor: true });
    const move = p => {
      if (!p.isDown) return;
      const wy = (Y0 - p.worldY) / S;
      this.car.y = Phaser.Math.Clamp(wy, -24, 5); this.drawCar();
    };
    drag.on('pointerdown', move); drag.on('pointermove', move);
    this.ui.add(drag);
    // arrows hint
    const hint = T(this, sx(-LANE), sy(this.car.y) - 50, '↑↓', 26, '#5FD0E0');
    this.ui.add(hint);
    if (!REDUCE_MOTION) this.tweens.add({ targets: hint, alpha: 0.3, duration: 600, yoyo: true, repeat: -1 });
    this.ui.add(button(this, W / 2, 880, 280, 62, 'Confirm position', () => this.confirmPosition(), { size: 24, fill: C.yellow, fillA: 1, color: '#0B1B2E' }));
  }

  confirmPosition() {
    this.ui.removeAll(true);
    const z1 = ZONES[0], inside = rectInZone(this.car.x, this.car.y, 1.85, 4.5, z1), ahead = this.car.y - 2.25 > 0.3;
    track('blindspot_position', { scenario: this.key, y: +this.car.y.toFixed(1), safe: !inside });
    this.drawZones([1], { highlight: 1 });
    this.carRing = inside ? 0xFF8A1F : C.green; this.drawCar();
    Sfx.chime(!inside);
    this.cap.hide();
    const title = inside ? 'Not quite' : 'Correct';
    const body = inside
      ? 'Part of your car is still in the blind spot, so the driver can’t see you. Move further back.'
      : ahead
        ? 'The driver can see you. But with a truck about to turn, falling back behind it is the safest option.'
        : 'The truck driver can see your car. Make sure you can see the driver in their side mirrors; then they can see you too. Falling behind is the safest option.';
    this.feedback(title, inside ? '#FF8A1F' : '#3DBE7A', body);
    if (inside) this.next('Try again', () => { this.fb.destroy(); this.stepPosition(); });
    else this.next('Continue', () => { this.fb.destroy(); this.stepIntroAll(); });
  }

  feedback(title, col, body, y) {
    const c = this.add.container(0, 0).setDepth(1000);
    const t = this.add.text(W / 2, 0, body, { fontFamily: FONT, fontSize: '18px', color: '#FFFFFF', align: 'center', wordWrap: { width: 420 }, lineSpacing: 4, resolution: 2 }).setOrigin(0.5, 0);
    const h = t.height + 76, top = y != null ? y : 836 - h;
    c.add(panel(this, 40, top, W - 80, h, { alpha: 0.94, r: 18 }));
    c.add(T(this, W / 2, top + 28, title, 22, col));
    t.setY(top + 52); c.add(t);
    this.fb = c;
  }

  stepIntroAll() {
    this.car.on = false; this.carRing = null; this.drawCar();
    this.zoneG.clear();
    this.cap.set('Heavy vehicles have unique blind spots. Let’s find out where they are and how you can avoid them.');
    this.next('Continue', () => this.stepSpot());
  }

  // Tap every road user in a blind spot, then check.
  stepSpot() {
    this.cap.set('Tap all the road users that are in the truck driver’s blind spots.');
    this.sel = new Set();
    this.drawUsers({});
    USERS.forEach((u, i) => {
      const [kind, x, y] = u, [w, l] = SIZE[kind];
      const hit = this.add.zone(sx(x), sy(y), Math.max(44, w * S + 16), Math.max(44, l * S + 16)).setInteractive({ useHandCursor: true });
      hit.on('pointerup', () => {
        if (this.checked) return;
        Sfx.init(this); Sfx.click();
        this.sel.has(i) ? this.sel.delete(i) : this.sel.add(i);
        this.drawUsers(Object.fromEntries([...this.sel].map(k => [k, 'sel'])));
        this.checkBtn.setEnabled(this.sel.size > 0);
      });
      this.ui.add(hit);
    });
    this.checked = false;
    this.checkBtn = button(this, W / 2, 880, 220, 62, 'Check', () => this.checkSpot(), { size: 24, fill: C.yellow, fillA: 1, color: '#0B1B2E' });
    this.checkBtn.setEnabled(false);
    this.ui.add(this.checkBtn);
  }

  checkSpot() {
    this.checked = true;
    this.ui.removeAll(true);
    const marks = {}; let ok = 0, wrong = 0, missed = 0;
    USERS.forEach((u, i) => {
      const inZ = !!zoneAt(u[1], u[2]), s = this.sel.has(i);
      if (s && inZ) { marks[i] = 'ok'; ok++; } else if (s) { marks[i] = 'wrong'; wrong++; } else if (inZ) { marks[i] = 'missed'; missed++; }
    });
    this.drawZones([1, 2, 3, 4]);
    this.drawUsers(marks);
    const perfect = !wrong && !missed;
    track('blindspot_spot', { scenario: this.key, correct: ok, wrong, missed });
    Sfx.chime(perfect);
    this.cap.hide();
    const parts = ['Green ones are in a blind spot and you spotted them.'];
    if (wrong) parts.push('Red ones are outside the blind spots.');
    if (missed) parts.push('Orange ones are in a blind spot, but you missed them.');
    this.feedback(perfect ? 'Correct' : ok ? 'Almost' : 'Not quite', perfect ? '#3DBE7A' : '#FFCB2B', perfect ? 'You found every road user in the truck’s blind spots.' : parts.join(' '));
    this.next('Continue', () => { this.fb.destroy(); this.stepZones(); });
  }

  stepZones() {
    this.userG.clear();
    this.drawZones([1, 2, 3, 4], { numbers: true });
    this.cap.set('Let’s take a closer look at the different blind spots and how to avoid them.');
    this.next('Continue', () => this.stepZone(1));
  }

  stepZone(n) {
    const z = ZONES[n - 1];
    this.cap.hide();
    this.drawZones([1, 2, 3, 4], { numbers: true, highlight: n });
    if (this.fb) this.fb.destroy();
    this.feedback(n + '. ' + z.name, '#FFCB2B', ZONE_TEXT[n]);
    this.next(n < 4 ? 'Next' : 'Continue', () => (n < 4 ? this.stepZone(n + 1) : this.stepEnd()));
  }

  stepEnd() {
    if (this.fb) this.fb.destroy();
    this.zoneG.clear(); this.labels.removeAll(true);
    state.completed[this.key] = true;
    const q = this.o.predict, guess = state.predictions[this.key], right = guess === q.answer;
    track('scenario_reveal', { scenario: this.key, guess, answer: q.answer, correct: right });
    const v = this.vb, c = this.add.container(0, 0).setDepth(1002);
    c.add(this.add.rectangle(v.left, v.top, v.width, v.height, 0x05080D, 0.78).setOrigin(0));
    c.add(T(this, W / 2, 140, 'Always remember', 36, '#FFFFFF'));
    c.add(T(this, W / 2, 230, 'If you can’t see the truck driver in their side mirrors, they can’t see you.', 22, '#FFCB2B', { wordWrap: { width: 430 }, align: 'center', lineSpacing: 5 }));
    c.add(T(this, W / 2, 316, 'Don’t linger beside a truck, give turning trucks room, and keep well back.', 19, '#E6EDF5', { fontStyle: 'normal', wordWrap: { width: 430 }, align: 'center', lineSpacing: 4 }));
    c.add(panel(this, 40, 380, W - 80, 220, { alpha: 0.95, r: 20, stroke: C.yellow, strokeA: 0.7 }));
    c.add(T(this, W / 2, 414, guess == null ? 'The answer' : right ? 'You’re correct' : 'You guessed ' + guess + '. The answer is ' + q.answer + '.', 21, right ? '#3DBE7A' : '#FFCB2B'));
    c.add(T(this, W / 2, 490, q.explain, 18, '#FFFFFF', { fontStyle: 'normal', wordWrap: { width: 420 }, align: 'center', lineSpacing: 4 }));
    c.add(T(this, W / 2, 566, 'Source: MVA Fund, reported by Economist Namibia', 13, '#9AA6B5', { fontStyle: 'normal' }));
    c.add(button(this, W / 2, 780, 380, 64, 'Back to ' + this.e.title, () => this.go('ExperienceIntro', { id: this.e.id }), { size: 22, fill: C.yellow, fillA: 1, color: '#0B1B2E' }));
    c.add(button(this, W / 2, 860, 260, 56, 'Learning Lab', () => this.go('LabMenu'), { size: 20, stroke: 0xFFFFFF, hitH: 66 }));
    c.add(T(this, W / 2, 930, 'Prototype. Blind spot shapes and guidance to be validated.', 13, '#7F8FA3', { fontStyle: 'normal' }));
  }

  go(key, data) {
    if (this.leaving) return; this.leaving = true;
    this.cameras.main.fadeOut(220, 8, 17, 30);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(key, data));
  }
}
