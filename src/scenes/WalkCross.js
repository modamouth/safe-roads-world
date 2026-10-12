import Phaser from 'phaser';
import { W, H, COLORS as C, FONT, state, track, REDUCE_MOTION } from '../config.js';
import { setupCam, viewBounds, T, button, soundToggle, iconButton, makeCaption, panel } from '../ui.js';
import { experienceById } from '../experiences.js';
import { Sfx } from '../sfx.js';

// Top-down street, left-hand traffic. World units are metres:
// x runs across the road (0 = left kerb), y along it (up the screen = north).
// The near lane carries northbound traffic, i.e. cars approach from the
// pedestrian's right (the bottom of the screen).
const S = 16, X0 = 170, Y0 = 380;
const sx = x => X0 + x * S, sy = y => Y0 - y * S;
const NEAR_C = 4.15, CAR_L = 4.5, CAR_W = 1.8, CAR_HALF = 0.9, WALK_V = 1.4, PED_R = 0.3;
const LANE_IN = NEAR_C - CAR_HALF - PED_R;     // pedestrian x at which they enter the car's path
const LANE_OUT = NEAR_C + CAR_HALF + PED_R;
const FREEZE_M = 4;                            // freeze when the car is this close behind a pedestrian in its path

// Parked vehicles (occluders) as [y0, y1, kind] in the left parking lane (x 0.2..2.2).
const PARKED_L = [[-6.6, -1.0, 'van'], [-11.8, -7.2], [-17.0, -12.4], [-22.2, -17.6], [-27.4, -22.8], [-32.6, -28.0], [-37.8, -33.2], [-43.0, -38.4], [22, 26.6], [27.2, 31.8], [32.4, 37.0]];
const PARKED_R = [[-38, -33.4], [-29, -24.4], [-20, -15.4], [-11, -6.4], [5.5, 10], [16, 20.6], [26, 30.6], [33, 37.6]];
const BODY = [0xC9CED6, 0x2F5D9E, 0xE8E2D6, 0x7A1F2B, 0x3B3F46, 0xD9A441, 0x5C7F6A, 0xF2F2F2];

export const SPOTS = [
  { id: 'van', label: 'Beside the van', short: 'Beside van', x: 0.3, y: 0 },
  { id: 'edge', label: "At the van's outer edge", short: 'Van edge', x: 2.35, y: -4 },
  { id: 'clear', label: 'Clear stretch', short: 'Clear spot', x: 0.3, y: 12 }
];

// Segment vs axis-aligned rect (Liang-Barsky).
function segHitsRect(ax, ay, bx, by, r) {
  let t0 = 0, t1 = 1;
  const dx = bx - ax, dy = by - ay;
  const clip = (p, q) => {
    if (p === 0) return q >= 0;
    const t = q / p;
    if (p < 0) { if (t > t1) return false; if (t > t0) t0 = t; } else { if (t < t0) return false; if (t < t1) t1 = t; }
    return true;
  };
  return clip(-dx, ax - r.x0) && clip(dx, r.x1 - ax) && clip(-dy, ay - r.y0) && clip(dy, r.y1 - ay) && t0 < t1;
}

function hull(pts) {
  pts = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  pts.forEach(p => { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); });
  pts.slice().reverse().forEach(p => { while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); });
  return lo.slice(0, -1).concat(up.slice(0, -1));
}

/** Top-down vehicle centred on (cx, cy) in screen px, front pointing up. */
function topCar(g, cx, cy, len, wid, body, van) {
  const L = len * S, w = wid * S;
  g.fillStyle(0x000000, 0.28); g.fillRoundedRect(cx - w / 2 + 2, cy - L / 2 + 3, w, L, 6);
  g.fillStyle(body, 1); g.fillRoundedRect(cx - w / 2, cy - L / 2, w, L, van ? 4 : 7);
  g.fillStyle(0x1D2733, 0.92); g.fillRoundedRect(cx - w * 0.38, cy - L * (van ? 0.40 : 0.30), w * 0.76, L * 0.13, 3);
  if (!van) g.fillRoundedRect(cx - w * 0.34, cy + L * 0.25, w * 0.68, L * 0.1, 3);
  g.fillStyle(0xFFFFFF, 0.16); g.fillRoundedRect(cx - w * 0.32, cy - L * (van ? 0.22 : 0.12), w * 0.64, L * (van ? 0.6 : 0.33), 3);
}

export default class WalkCross extends Phaser.Scene {
  constructor() { super('WalkCross'); }

  create(data) {
    setupCam(this);
    Sfx.init(this);
    this.cameras.main.fadeIn(250, 8, 17, 30);
    this.leaving = false; // scene instances are reused between visits
    this.e = experienceById(data.id);
    this.o = this.e.intro.options.find(p => p.id === data.perspective);
    this.cfg = this.o.scenario;
    this.key = this.e.id + '.' + this.o.id;
    state.runs[this.key] = state.runs[this.key] || {};

    this.phase = 'intro'; this.spot = null; this.car = null; this.choice = null;
    this.ped = { x: -2.2, y: 6 };
    this.occ = PARKED_L.map(([y0, y1]) => ({ x0: 0.2, x1: 2.2, y0, y1 }))
      .concat(PARKED_R.map(([y0, y1]) => ({ x0: 9.6, x1: 11.6, y0, y1 })));

    this.vb = viewBounds(this);
    this.drawStreet();
    this.carG = this.add.graphics().setDepth(15);
    this.fogG = this.make.graphics({ x: 0, y: 0, add: false });
    this.fog = this.add.renderTexture(this.vb.left, this.vb.top, this.vb.width, this.vb.height).setOrigin(0).setDepth(20).setAlpha(0.62);
    this.drawParked();
    this.pedG = this.add.graphics().setDepth(40);
    this.ui = this.add.container(0, 0).setDepth(1001);

    iconButton(this, 44, 44, 'back', () => this.go('ExperienceIntro', { id: this.e.id })).setDepth(2000);
    soundToggle(this);
    this.cap = makeCaption(this, 126, 1000);
    this.events.once('shutdown', () => Sfx.stopEngine());
    this.drawPed(); this.updateFog();

    const pre = data.spot && SPOTS.find(s => s.id === data.spot);
    if (pre) this.time.delayedCall(400, () => this.chooseSpot(pre));
    else {
      this.cap.set("You're the pedestrian on the left side of the road and want to cross to the shop on the other side.");
      this.ui.add(button(this, W / 2, 880, 220, 62, 'Continue', () => this.showSpots(), { size: 24, fill: C.yellow, fillA: 1, color: '#0B1B2E' }));
    }
  }

  // --- static street -----------------------------------------------------------
  drawStreet() {
    const g = this.add.graphics().setDepth(0), v = this.vb, top = v.top, bot = v.bottom, ht = v.height;
    g.fillStyle(0x5E646B, 1); g.fillRect(v.left, top, v.width, ht);
    // left buildings (roofs); the first and last blocks stretch to the screen edges
    const rows = [[0, 150, 0x6B7076], [150, 340, 0x8A6F5A], [340, 470, 0x5E646B], [470, 700, 0x7B8087], [700, 960, 0x8C5E4A]];
    rows.forEach(([a, b, c], i) => {
      if (i === 0) a = top; if (i === rows.length - 1) b = bot;
      g.fillStyle(c, 1); g.fillRect(v.left, a + 2, sx(-4.2) - v.left, b - a - 4);
      g.fillStyle(0xFFFFFF, 0.06); g.fillRect(8, a + 12, sx(-4.2) - 24, 6);
    });
    // footpaths
    g.fillStyle(0xD8C8A6, 1); g.fillRect(sx(-4.2), top, 4.2 * S, ht); g.fillRect(sx(11.8), top, 4.2 * S, ht);
    g.fillStyle(0xC9B892, 1);
    for (let y = Math.floor(top / 24) * 24; y < bot; y += 24) { g.fillRect(sx(-4.2), y, 4.2 * S, 1); g.fillRect(sx(11.8), y, 4.2 * S, 1); }
    // road, kerbs, markings
    g.fillStyle(0x4A494D, 1); g.fillRect(sx(0), top, 11.8 * S, ht);
    g.fillStyle(0xB9B6AE, 1); g.fillRect(sx(0) - 3, top, 3, ht); g.fillRect(sx(11.8), top, 3, ht);
    g.fillStyle(0xF2F2F2, 0.9);
    for (let y = Math.floor(top / 40) * 40; y < bot; y += 40) { g.fillRect(sx(5.9) - 1.5, y, 3, 22); }
    for (let y = Math.floor(top / 30) * 30; y < bot; y += 30) { g.fillRect(sx(2.3) - 1, y, 2, 12); g.fillRect(sx(9.5) - 1, y, 2, 12); }
    // right side: shop opposite the crossing spots, other buildings around it
    const shop0 = sy(16), shop1 = sy(-9);
    g.fillStyle(0x7B8087, 1); g.fillRect(sx(16), top, v.right - sx(16), shop0 - 4 - top);
    g.fillStyle(0x6B7076, 1); g.fillRect(sx(16), shop1 + 4, v.right - sx(16), bot - shop1 - 4);
    this.drawShop(g, shop0, shop1, this.cfg.shopBrand);
    // street trees
    [[-3.2, 30], [-3.2, -14], [-3.2, -30], [12.9, 30], [12.9, -24]].forEach(([x, y]) => {
      g.fillStyle(0x000000, 0.2); g.fillCircle(sx(x) + 3, sy(y) + 4, 20);
      g.fillStyle(0x4F8A3A, 1); g.fillCircle(sx(x), sy(y), 20);
      g.fillStyle(0x6AA84F, 1); g.fillCircle(sx(x) - 5, sy(y) - 5, 11);
    });
  }

  /** The shop the pedestrian crosses to: generic, or a partner's store branding. */
  drawShop(g, y0, y1, brand) {
    const v = this.vb, x0 = sx(16), cx = (x0 + W) / 2 + 4, cy = (y0 + y1) / 2;
    if (brand !== 'woermann-brock') {
      g.fillStyle(0xB5523A, 1); g.fillRect(x0, y0, v.right - x0, y1 - y0);
      for (let y = y0; y < y1; y += 16) { g.fillStyle(y / 16 % 2 ? C.yellow : C.navy, 1); g.fillRect(x0 - 12, y, 12, 16); }
      T(this, cx, cy, 'SHOP', 26, '#FFFFFF', { letterSpacing: 4 }).setAngle(90).setDepth(1);
      return;
    }
    // Woermann Brock supermarket: red tiled facade, WB hexagon, green "WE CARE" ribbon, "Supermarket" sign.
    // Drawn approximation; replace with the partner's official logo artwork once approved.
    const RED = 0xD2232A, GREEN = 0x1F5C3A;
    g.fillStyle(RED, 1); g.fillRect(x0, y0, v.right - x0, y1 - y0);
    g.fillStyle(0xFFFFFF, 0.07);
    for (let y = y0 + 10; y < y1; y += 10) g.fillRect(x0, y, v.right - x0, 1);
    for (let x = x0 + 10; x < v.right; x += 10) g.fillRect(x, y0, 1, y1 - y0);
    // glass entrance along the street side
    g.fillStyle(0xC9D6E0, 1); g.fillRect(x0 - 10, cy - 46, 10, 92);
    g.fillStyle(0x8FA3B3, 1); g.fillRect(x0 - 10, cy - 1, 10, 2);

    // Sign, rotated to read along the shop like the street-facing facade.
    const c = this.add.container(cx, cy).setAngle(90).setDepth(1);
    const s = this.add.graphics(), r = 40, ex = -72;
    const hex = (rr, ox, oy) => [0, 1, 2, 3, 4, 5].map(i => ({ x: ox + rr * Math.cos(i * Math.PI / 3), y: oy + rr * Math.sin(i * Math.PI / 3) }));
    s.fillStyle(0x000000, 0.2); s.fillPoints(hex(r + 3, ex + 2, 3), true);
    s.fillStyle(0xFFFFFF, 1); s.fillPoints(hex(r, ex, 0), true);
    s.lineStyle(3, RED, 1); s.strokePoints(hex(r - 6, ex, 0), true, true);
    // ribbon with tails
    s.fillStyle(0x163F28, 1);
    s.fillTriangle(ex - 52, 22, ex - 38, 22, ex - 44, 34); s.fillTriangle(ex + 52, 22, ex + 38, 22, ex + 44, 34);
    s.fillStyle(GREEN, 1); s.fillRoundedRect(ex - 44, 18, 88, 20, 4);
    s.lineStyle(1.5, 0xFFFFFF, 0.9); s.strokeRoundedRect(ex - 44, 18, 88, 20, 4);
    // "Supermarket" sign with rules above and below
    s.fillStyle(0xFFFFFF, 1); s.fillRect(10, -17, 168, 2); s.fillRect(10, 15, 168, 2);
    c.add([s,
      T(this, ex, -16, 'W', 22, '#D2232A'), T(this, ex, 4, 'B', 22, '#D2232A'),
      T(this, ex, 28, 'WE CARE', 11, '#FFFFFF', { letterSpacing: 1 }),
      T(this, 94, 0, 'Supermarket', 24, '#FFFFFF')]);
  }

  drawParked() {
    const g = this.add.graphics().setDepth(30);
    PARKED_L.forEach(([y0, y1, kind], i) => topCar(g, sx(1.2), sy((y0 + y1) / 2), y1 - y0, kind === 'van' ? 2.0 : CAR_W, kind === 'van' ? 0xF2F2F2 : BODY[i % BODY.length], kind === 'van'));
    PARKED_R.forEach(([y0, y1], i) => topCar(g, sx(10.6), sy((y0 + y1) / 2), y1 - y0, CAR_W, BODY[(i + 3) % BODY.length]));
  }

  drawPed() {
    const g = this.pedG; g.clear();
    const x = sx(this.ped.x), y = sy(this.ped.y);
    g.fillStyle(0x000000, 0.3); g.fillEllipse(x + 2, y + 3, 18, 12);
    g.fillStyle(0xE8743B, 1); g.fillEllipse(x, y, 17, 11);
    g.fillStyle(0x2A1A12, 1); g.fillCircle(x, y, 5);
    if (this.phase === 'intro' || this.phase === 'choose') { g.lineStyle(2, C.yellow, 0.9); g.strokeCircle(x, y, 13); }
  }

  // Shade everything the pedestrian can't see: a shadow behind each parked vehicle.
  updateFog() {
    const g = this.fogG, P = this.ped; g.clear(); g.fillStyle(0x05080D, 1);
    this.occ.forEach(r => {
      const pts = [];
      [[r.x0, r.y0], [r.x1, r.y0], [r.x1, r.y1], [r.x0, r.y1]].forEach(([x, y]) => {
        pts.push([x, y]); pts.push([P.x + (x - P.x) * 80, P.y + (y - P.y) * 80]);
      });
      g.fillPoints(hull(pts).map(([x, y]) => ({ x: sx(x), y: sy(y) })), true);
    });
    this.fog.clear(); this.fog.draw(g, -this.vb.left, -this.vb.top);
  }

  carRect() { return { x0: NEAR_C - CAR_HALF, x1: NEAR_C + CAR_HALF, y0: this.car.y - CAR_L, y1: this.car.y }; }

  canSeeCar() {
    if (!this.car) return false;
    const r = this.carRect(), P = this.ped;
    return [[r.x0, r.y0], [r.x1, r.y0], [r.x0, r.y1], [r.x1, r.y1]].some(([x, y]) => !this.occ.some(o => segHitsRect(P.x, P.y, x, y, o)));
  }

  drawCar() {
    const g = this.carG; g.clear();
    if (!this.car) return;
    this.carSeen = this.canSeeCar();
    if (!this.carSeen) return;   // hidden cars aren't drawn at all, not even under the shade
    topCar(g, sx(NEAR_C), sy(this.car.y - CAR_L / 2), CAR_L, CAR_W, 0xFFFFFF);
  }

  // --- flow ----------------------------------------------------------------------
  showSpots() {
    this.phase = 'choose';
    this.ui.removeAll(true);
    this.cap.set('Where will you cross from? Tap a spot.');
    SPOTS.forEach(s => {
      const x = sx(s.x), y = sy(s.y), g = this.add.graphics();
      g.fillStyle(C.teal, 0.3); g.fillCircle(x, y, 18); g.lineStyle(3, 0x5FD0E0, 1); g.strokeCircle(x, y, 18);
      if (!REDUCE_MOTION) this.tweens.add({ targets: g, alpha: 0.5, duration: 700, yoyo: true, repeat: -1 });
      const t = this.add.text(sx(-4.4), y, s.label, { fontFamily: FONT, fontSize: '15px', color: '#FFFFFF', fontStyle: 'bold', resolution: 2, align: 'right', wordWrap: { width: 84 } }).setOrigin(1, 0.5);
      const bg = this.add.graphics(); bg.fillStyle(0x05080D, 0.85); bg.fillRoundedRect(t.x - t.width - 8, y - t.height / 2 - 5, t.width + 16, t.height + 10, 8);
      const hit = this.add.zone(x, y, 60, 60).setInteractive({ useHandCursor: true });
      const hit2 = this.add.zone(t.x - t.width / 2, y, t.width + 16, Math.max(44, t.height + 10)).setInteractive({ useHandCursor: true });
      [hit, hit2].forEach(h => h.on('pointerup', () => { Sfx.init(this); Sfx.click(); this.chooseSpot(s); }));
      this.ui.add([g, bg, t, hit, hit2]);
    });
  }

  chooseSpot(s) {
    if (this.spot) return;
    this.spot = s; this.phase = 'walkTo';
    this.ui.removeAll(true);
    this.cap.hide();
    track('crossing_spot', { scenario: this.key, spot: s.id });
    this.tweens.add({
      targets: this.ped, x: s.x, y: s.y, duration: REDUCE_MOTION ? 300 : 1100, ease: 'Sine.easeInOut',
      onComplete: () => this.startTraffic()
    });
  }

  startTraffic() {
    this.phase = 'approach';
    const v = this.cfg.carKmh / 3.6;
    this.car = { y: this.spot.y - this.cfg.decideAtM - v * 1.6, v };
    Sfx.startEngine(); Sfx.setEngine(0);
  }

  decide() {
    this.phase = 'decide';
    this.sawAtDecision = this.canSeeCar();
    this.cap.set('Look right, then left. Cross now, or wait?');
    // Over the buildings on the right, so the road and the approaching car stay visible.
    this.ui.add(button(this, 480, 650, 110, 64, 'Cross', () => this.choose('cross'), { size: 22, fill: C.yellow, fillA: 1, color: '#0B1B2E' }));
    this.ui.add(button(this, 480, 730, 110, 64, 'Wait', () => this.choose('wait'), { size: 22, fill: C.navy, fillA: 0.95, stroke: 0xFFFFFF }));
  }

  choose(c) {
    if (this.phase !== 'decide') return;
    this.choice = c; this.phase = c === 'cross' ? 'crossing' : 'waiting';
    this.ui.removeAll(true); this.cap.hide();
    track('crossing_choice', { scenario: this.key, spot: this.spot.id, choice: c, couldSeeCar: this.sawAtDecision });
  }

  update(time, delta) {
    const dt = Math.min(delta / 1000, 0.05);
    const moving = ['approach', 'crossing', 'waiting', 'walkAcross'].includes(this.phase);
    if (this.car && moving) {
      this.car.y += this.car.v * dt;
      Sfx.setEngine(this.cfg.carKmh * (this.carSeen ? 1 : 0.6));
      if (this.phase === 'approach' && this.car.y >= this.spot.y - this.cfg.decideAtM) { this.car.y = this.spot.y - this.cfg.decideAtM; this.decide(); }
    }
    if (this.phase === 'crossing' || this.phase === 'walkAcross') {
      // After waiting, the walk across is sped up (the danger has passed).
      this.ped.x += (this.phase === 'walkAcross' ? WALK_V * 2.5 : WALK_V) * dt;
      const inPath = this.ped.x > LANE_IN - 0.9 && this.ped.x < LANE_OUT;
      if (this.phase === 'crossing' && inPath && this.car.y < this.ped.y && this.ped.y - this.car.y <= FREEZE_M) this.outcome(false);
      else if (this.ped.x >= 15.2) this.outcome(true);
    }
    if (this.phase === 'waiting' && this.car.y - CAR_L > this.spot.y + 2) {
      this.phase = 'walkAcross';
    }
    if (this.car && this.car.y - CAR_L > 40) { this.car = null; Sfx.stopEngine(); }
    if (this.phase !== 'done') { this.drawPed(); this.updateFog(); }
    if (this.phase !== 'done') this.drawCar();
  }

  outcome(safe) {
    if (this.phase === 'done') return;
    this.phase = 'done';
    Sfx.stopEngine();
    const s = this.spot, crossed = this.choice === 'cross';
    state.runs[this.key][s.id] = { safe, choice: this.choice, couldSee: this.sawAtDecision };
    track('crossing_outcome', { scenario: this.key, spot: s.id, choice: this.choice, safe, couldSeeCar: this.sawAtDecision });
    let msg;
    if (!safe) {
      Sfx.chime(false);
      this.drawCar();
      this.add.rectangle(this.vb.left, this.vb.top, this.vb.width, this.vb.height, 0x05080D, 0.35).setOrigin(0).setDepth(50);
      msg = s.id === 'van'
        ? 'Near miss. The van hid the car from you, and hid you from the driver.'
        : 'Near miss. You could see the car coming, but stepped out anyway.';
    } else {
      Sfx.chime(true);
      msg = !crossed && s.id === 'van'
        ? 'Good call. Beside the van you couldn’t see the car until it was almost level with you.'
        : s.id === 'edge' ? 'Good call. From the van’s outer edge you could see past the parked cars.'
          : 'Good call. From a clear stretch you could see the car coming from far away.';
    }
    this.cap.set(msg);
    this.time.delayedCall(800, () => this.results());
  }

  results() {
    const runs = state.runs[this.key], done = SPOTS.every(s => runs[s.id]);
    this.ui.add(T(this, W / 2, 812, done ? '' : 'TRY ANOTHER SPOT', 16, '#B9C6D6', { letterSpacing: 2 }));
    SPOTS.forEach((s, i) => {
      const cur = s.id === this.spot.id;
      this.ui.add(button(this, 105 + i * 165, 858, 155, 56, (runs[s.id] ? '✓ ' : '') + s.short,
        () => this.go('WalkCross', { id: this.e.id, perspective: this.o.id, spot: s.id }),
        { size: 18, fill: C.navy, fillA: cur ? 1 : 0.85, stroke: cur ? C.yellow : 0xFFFFFF }));
    });
    if (done) {
      this.ui.add(button(this, W / 2, 924, 300, 54, 'See results', () => this.go('WalkReveal', { id: this.e.id, perspective: this.o.id }),
        { size: 22, fill: C.yellow, fillA: 1, color: '#0B1B2E' }));
    }
  }

  go(key, data) {
    if (this.leaving) return; this.leaving = true;
    this.cameras.main.fadeOut(220, 8, 17, 30);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(key, data));
  }
}
