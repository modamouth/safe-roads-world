import Phaser from 'phaser';
import { W, H, COLORS as C, FONT, state, track, clamp, REDUCE_MOTION } from '../config.js';
import { setupCam, viewBounds, T, button, soundToggle, iconButton, panel } from '../ui.js';
import { experienceById } from '../experiences.js';
import { stopping } from '../stopping.js';
import { Sfx } from '../sfx.js';

// Top-down dual carriageway, left-hand traffic, travelling up the screen.
// World units are metres: x across (0 = lane line between our two lanes, left negative),
// y along the road (0 = the truck's front at the moment the light turns yellow).
const S = 12, X0 = W / 2 - 40, CAM0 = 400;   // camera follows our car; its front sits at screen y CAM0
const L_LANE = -1.75, R_LANE = 1.75;
const TRUCK_L = 16.5, TRUCK_W = 2.5, CAR_L = 4.5, CAR_W = 1.85;
const LINE = 100;                 // stop line, metres ahead of the truck at the decision
const CRUISE_T = 1.6;             // seconds of driving before the light turns yellow
const FREEZE_GAP = 3;             // freeze this many metres before contact (no collision is shown)

export default class TruckBraking extends Phaser.Scene {
  constructor() { super('TruckBraking'); }

  create(data) {
    setupCam(this);
    Sfx.init(this);
    this.cameras.main.fadeIn(250, 8, 17, 30);
    this.leaving = false; // scene instances are reused between visits
    this.e = experienceById(data.id);
    this.o = this.e.intro.options.find(p => p.id === data.perspective);
    this.cfg = this.o.scenario;
    this.key = this.e.id + '.' + this.o.id;
    this.vb = viewBounds(this);

    const v = this.cfg.speedKmh / 3.6;
    // Everyone's position at the decision moment; the cruise phase runs them in from behind.
    this.truck = { y: 0, v, x: L_LANE, brake: false };
    this.car = { y: 6, v, x: R_LANE, brake: false };
    this.queue = [{ y: 66, v: 50 / 3.6, stopAt: LINE - 1 }, { y: 57, v: 50 / 3.6, stopAt: LINE - 7.5 }];
    this.t = -CRUISE_T; this.phase = 'intro'; this.light = 'green'; this.camY = 0; this.follow = true;
    [this.truck, this.car, ...this.queue].forEach(o => { o.y -= o.v * CRUISE_T; });
    this.camY = this.car.y;

    this.g = this.add.graphics();
    this.ui = this.add.container(0, 0).setDepth(1001);
    iconButton(this, 44, 44, 'back', () => this.go('ExperienceIntro', { id: this.e.id })).setDepth(2000);
    soundToggle(this);
    this.events.once('shutdown', () => Sfx.stopEngine());

    this.say('You’re the driver on the right, next to the truck. You’re both driving at ' + this.cfg.speedKmh +
      ' km/h. You’ll be turning left soon.', [['Start', () => this.startDrive()]]);
    track('scenario_start', { scenario: this.key });
  }

  // --- helpers ---------------------------------------------------------------------
  sx(x) { return X0 + x * S; }
  sy(y) { return CAM0 - (y - this.camY) * S; }

  /** Caption panel near the bottom with one or two buttons. */
  say(text, buttons, title, titleCol) {
    this.ui.removeAll(true);
    const t = this.add.text(W / 2, 0, text, { fontFamily: FONT, fontSize: '19px', color: '#FFFFFF', align: 'center', wordWrap: { width: 420 }, lineSpacing: 5, resolution: 2 }).setOrigin(0.5, 0);
    const th = title ? 32 : 0, h = t.height + 44 + th, top = 812 - h;
    this.ui.add(panel(this, 40, top, W - 80, h, { alpha: 0.94, r: 18 }));
    if (title) this.ui.add(T(this, W / 2, top + 30, title, 22, titleCol));
    t.setY(top + 22 + th); this.ui.add(t);
    const n = buttons.length;
    buttons.forEach(([label, fn, primary], i) => {
      const bw = n === 1 ? 240 : 220, x = n === 1 ? W / 2 : W / 2 + (i - 0.5) * 236;
      this.ui.add(button(this, x, 870, bw, 64, label, () => { Sfx.init(this); fn(); },
        primary === false ? { size: 20, fill: C.navy, fillA: 0.95, stroke: 0xFFFFFF } : { size: 20, fill: C.yellow, fillA: 1, color: '#0B1B2E' }));
    });
  }

  // --- flow --------------------------------------------------------------------------
  startDrive() {
    this.ui.removeAll(true);
    this.phase = 'cruise';
    Sfx.startEngine(); Sfx.setEngine(this.cfg.speedKmh);
  }

  decide() {
    this.phase = 'decide'; this.light = 'yellow';
    Sfx.stopEngine();
    this.say('The traffic light turns yellow. You can wait behind the cars in this lane, or move into the left lane in front of the truck.',
      [['Move into left lane', () => this.choose('move')], ['Stay in this lane', () => this.choose('stay'), false]]);
  }

  choose(c) {
    this.ui.removeAll(true);
    this.choice = c; this.phase = c; this.tc = 0;
    track('braking_choice', { scenario: this.key, choice: c });
    this.time.delayedCall(1800, () => { this.light = 'red'; });
    const a = this.car;
    if (c === 'move') {
      // Speed up and cut across in front of the truck, then brake hard for the light.
      a.v2 = 100 / 3.6; a.changeT = 1.4;
      this.truckReactAt = this.cfg.truckReactS;   // the truck driver reacts as soon as you start cutting across
    } else {
      a.decel = a.v * a.v / (2 * (LINE - 14 - a.y)); a.brake = true;
    }
  }

  update(time, delta) {
    const dt = Math.min(delta / 1000, 0.05) * (this.slow || 1);
    const tr = this.truck, a = this.car, cfg = this.cfg;

    if (this.phase === 'cruise') {
      this.t += dt;
      [tr, a, ...this.queue].forEach(o => { o.y += o.v * dt; });
      if (this.t >= 0) { const k = -this.t; [tr, a, ...this.queue].forEach(o => { o.y += o.v * k; }); this.decide(); }
    } else if (this.phase === 'move' || this.phase === 'stay') {
      this.tc += dt;
      // queue cars stop at the line
      this.queue.forEach(q => {
        if (!q.decel) q.decel = q.v * q.v / (2 * Math.max(1, q.stopAt - q.y));
        if (q.v > 0) { q.v = Math.max(0, q.v - q.decel * dt); q.y += q.v * dt; q.brake = true; }
      });
      if (this.phase === 'move') {
        if (this.tc < a.changeT) {
          a.v = a.v + (a.v2 - a.v) * clamp(dt * 3, 0, 1);
          a.x = R_LANE + (L_LANE - R_LANE) * Phaser.Math.Easing.Sine.InOut(this.tc / a.changeT);
        } else {
          if (!a.brake) { a.brake = true; a.decel = a.v * a.v / (2 * (LINE - 0.5 - a.y)); }
          a.v = Math.max(0, a.v - a.decel * dt);
        }
        a.y += a.v * dt;
        if (this.truckReactAt != null && this.tc >= this.truckReactAt) { tr.brake = true; tr.v = Math.max(0, tr.v - cfg.truckDecel * dt); }
        tr.y += tr.v * dt;
        const inLane = this.tc >= a.changeT;   // only once we're in front of the truck
        if (inLane && a.y - CAR_L - tr.y <= FREEZE_GAP) this.outcomeMove();
        else if (tr.v === 0) this.outcomeMove();
      } else {
        a.v = Math.max(0, a.v - a.decel * dt); a.y += a.v * dt;
        tr.y += tr.v * dt;   // the truck has room in its lane
        if (a.v === 0 && tr.y > LINE + 40) this.outcomeStay();
      }
    }
    this.camY = a.y;
    this.draw();
  }

  outcomeMove() {
    if (this.phase === 'done') return;
    this.phase = 'done';
    const kmh = Math.round(this.truck.v * 3.6);
    state.runs[this.key] = { choice: 'move', truckKmh: kmh };
    track('braking_outcome', { scenario: this.key, choice: 'move', truckKmhAtFreeze: kmh });
    Sfx.chime(false);
    this.dimAll = true;
    this.say('Heavy vehicles need much more distance to stop. The truck would still be doing about ' + kmh +
      ' km/h when it reached you. You should have waited in your lane.\n\nCutting in front of trucks is a common cause of crashes.',
      [['Continue', () => this.compare()]], 'Bad idea', '#FF8A1F');
  }

  outcomeStay() {
    if (this.phase === 'done') return;
    this.phase = 'done';
    state.runs[this.key] = { choice: 'stay' };
    track('braking_outcome', { scenario: this.key, choice: 'stay' });
    Sfx.chime(true);
    this.say('You stayed out of the truck’s path. A loaded truck needs far more distance to stop than you do, so it couldn’t have stopped for a car that cut in front of it.',
      [['Continue', () => this.compare()]], 'Good choice', '#3DBE7A');
  }

  // Car vs loaded truck stopping distance; the player switches between speeds.
  compare(kmh) {
    this.ui.removeAll(true);
    if (this.cmp) this.cmp.destroy();
    const cfg = this.cfg, v = this.vb;
    kmh = kmh || cfg.speedKmh;
    track('braking_compare', { scenario: this.key, kmh });
    const car = stopping(kmh, cfg.carReactS, cfg.carDecel), truck = stopping(kmh, cfg.truckReactS, cfg.truckDecel);
    const courts = Math.max(1, Math.round(truck.total / 23.77));
    const c = this.cmp = this.add.container(0, 0).setDepth(1002);
    c.add(this.add.rectangle(v.left, v.top, v.width, v.height, 0x05080D, 0.86).setOrigin(0));
    c.add(T(this, W / 2, 140, 'At ' + kmh + ' km/h a loaded truck needs', 22, '#FFFFFF'));
    c.add(T(this, W / 2, 186, Math.round(truck.total) + ' m to stop', 40, '#FFCB2B'));
    c.add(T(this, W / 2, 234, 'That\u2019s about the length of ' + courts + ' tennis court' + (courts > 1 ? 's' : '') + '. A car needs about ' + Math.round(car.total) + ' m.',
      18, '#E6EDF5', { fontStyle: 'normal', wordWrap: { width: 440 }, align: 'center', lineSpacing: 4 }));

    c.add(panel(this, 28, 290, W - 56, 250, { alpha: 0.95, r: 20 }));
    const x0 = 130, pxm = 330 / 140;
    [['Car', car, 360], ['Loaded truck', truck, 450]].forEach(([label, s, y]) => {
      c.add(this.add.text(52, y, label, { fontFamily: FONT, fontSize: '17px', color: '#FFFFFF', fontStyle: 'bold', wordWrap: { width: 70 }, resolution: 2 }).setOrigin(0, 0.5));
      const g = this.add.graphics(); c.add(g);
      const tot = T(this, x0 + s.total * pxm + 8, y, Math.round(s.total) + ' m', 18, '#FFFFFF').setOrigin(0, 0.5);
      c.add(tot);
      const draw = k => {
        g.clear();
        g.fillStyle(C.teal, 1); g.fillRect(x0, y - 18, s.react * pxm * k, 36);
        g.fillStyle(C.yellow, 1); g.fillRect(x0 + s.react * pxm * k, y - 18, s.brake * pxm * k, 36);
      };
      if (REDUCE_MOTION) draw(1); else { tot.setAlpha(0); this.tweens.addCounter({ from: 0, to: 1, duration: 700, delay: y === 360 ? 100 : 350, onUpdate: tw => draw(tw.getValue()), onComplete: () => tot.setAlpha(1) }); }
    });
    const lg = this.add.graphics(); c.add(lg);
    lg.fillStyle(C.teal, 1); lg.fillRect(56, 506, 16, 16); lg.fillStyle(C.yellow, 1); lg.fillRect(300, 506, 16, 16);
    c.add(this.add.text(80, 514, 'Before the brakes bite', { fontFamily: FONT, fontSize: '15px', color: '#DDE6F0', resolution: 2 }).setOrigin(0, 0.5));
    c.add(this.add.text(324, 514, 'Braking', { fontFamily: FONT, fontSize: '15px', color: '#DDE6F0', resolution: 2 }).setOrigin(0, 0.5));

    c.add(T(this, W / 2, 590, 'Change the speed to compare stopping distances.', 18, '#B9C6D6', { fontStyle: 'normal' }));
    c.add(panel(this, 100, 620, W - 200, 84, { alpha: 0.95, r: 18, stroke: C.yellow, strokeA: 0.6 }));
    cfg.compareSpeeds.forEach((sp, i) => {
      const b = button(this, 190 + i * 80, 662, 70, 60, String(sp), () => this.compare(sp),
        { size: 26, fill: C.navy2, fillA: sp === kmh ? 1 : 0.4, color: sp === kmh ? '#FFCB2B' : '#FFFFFF', stroke: sp === kmh ? C.yellow : null });
      c.add(b);
    });
    c.add(T(this, 130, 662, 'km/h', 15, '#DDE6F0', { fontStyle: 'normal' }));
    c.add(T(this, W / 2, 760, 'Trucks are heavy, and their air brakes take a moment to work. Never cut in front of one.', 17, '#E6EDF5',
      { fontStyle: 'normal', wordWrap: { width: 430 }, align: 'center', lineSpacing: 4 }));
    c.add(T(this, W / 2, 930, 'Prototype. Stopping figures to be validated.', 13, '#7F8FA3', { fontStyle: 'normal' }));
    c.add(button(this, W / 2, 870, 240, 64, 'Continue', () => { c.destroy(); this.cmp = null; this.finish(); }, { size: 22, fill: C.yellow, fillA: 1, color: '#0B1B2E' }));
  }

  finish() {
    state.completed[this.key] = true;
    const q = this.o.predict, guess = state.predictions[this.key], right = guess === q.answer, v = this.vb;
    track('scenario_reveal', { scenario: this.key, guess, answer: q.answer, correct: right });
    const c = this.add.container(0, 0).setDepth(1002);
    c.add(this.add.rectangle(v.left, v.top, v.width, v.height, 0x05080D, 0.86).setOrigin(0));
    c.add(panel(this, 40, 96, W - 80, 196, { alpha: 0.95, r: 20, stroke: C.yellow, strokeA: 0.7 }));
    c.add(T(this, W / 2, 132, guess == null ? 'The answer' : right ? 'You’re correct' : 'You guessed ' + guess + ' m. The answer is ' + q.answer + ' m.', 21, right ? '#3DBE7A' : '#FFCB2B'));
    c.add(T(this, W / 2, 210, q.explain, 18, '#FFFFFF', { fontStyle: 'normal', wordWrap: { width: 420 }, align: 'center', lineSpacing: 4 }));
    c.add(T(this, W / 2, 340, 'Always remember', 32, '#FFFFFF'));
    let y = 384;
    this.o.reveal.remember.forEach((line, i) => {
      const g = this.add.graphics(); g.fillStyle(C.yellow, 1); g.fillCircle(56, y + 14, 14);
      const t = this.add.text(82, y, line, { fontFamily: FONT, fontSize: '17px', color: '#E6EDF5', wordWrap: { width: 420 }, lineSpacing: 3, resolution: 2 });
      c.add([g, T(this, 56, y + 14, String(i + 1), 15, '#0B1B2E'), t]);
      y += Math.max(36, t.height) + 20;
    });
    c.add(button(this, W / 2, 790, 380, 64, 'Back to ' + this.e.title, () => this.go('ExperienceIntro', { id: this.e.id }), { size: 22, fill: C.yellow, fillA: 1, color: '#0B1B2E' }));
    c.add(button(this, W / 2, 870, 260, 56, 'Learning Lab', () => this.go('LabMenu'), { size: 20, stroke: 0xFFFFFF, hitH: 66 }));
    c.add(T(this, W / 2, 930, 'Prototype. Figures and guidance to be validated.', 13, '#7F8FA3', { fontStyle: 'normal' }));
  }

  // --- drawing -----------------------------------------------------------------------
  draw() {
    const g = this.g, v = this.vb; g.clear();
    const sx = x => this.sx(x), sy = y => this.sy(y);
    // verge, carriageways, median
    g.fillStyle(0x6E8A4E, 1); g.fillRect(v.left, v.top, v.width, v.height);
    g.fillStyle(0x4E4D52, 1); g.fillRect(sx(-3.8), v.top, 7.6 * S, v.height); g.fillRect(sx(5.4), v.top, 7.6 * S, v.height);
    g.fillStyle(0xB9B6AE, 1); g.fillRect(sx(3.8), v.top, 1.6 * S, v.height);
    g.fillStyle(0xF2F2F2, 0.9);
    g.fillRect(sx(-3.5) - 1, v.top, 2, v.height); g.fillRect(sx(3.5) - 1, v.top, 2, v.height);
    g.fillRect(sx(5.7) - 1, v.top, 2, v.height); g.fillRect(sx(12.7) - 1, v.top, 2, v.height);
    const yTop = this.camY + (CAM0 - v.top) / S, yBot = this.camY - (v.bottom - CAM0) / S;
    for (let y = Math.floor(yBot / 9) * 9; y < yTop; y += 9) {
      if (y > LINE - 0.5 && y < LINE + 14) continue;   // junction
      g.fillRect(sx(0) - 1.5, sy(y + 3), 3, 3 * S); g.fillRect(sx(9.2) - 1.5, sy(y + 3), 3, 3 * S);
    }
    // junction ahead: cross street, stop line, lights
    g.fillStyle(0x4E4D52, 1); g.fillRect(v.left, sy(LINE + 14), v.width, 14 * S);
    g.fillStyle(0xF2F2F2, 1); g.fillRect(sx(-3.5), sy(LINE) - 2, 7 * S, 4);
    const lc = { green: 0x3DBE7A, yellow: 0xFFCB2B, red: 0xE5484D }[this.light];
    [[-4.6, LINE], [4.6, LINE]].forEach(([x, y]) => {
      g.fillStyle(0x1C1C1E, 1); g.fillRoundedRect(sx(x) - 6, sy(y) - 22, 12, 30, 3);
      ['red', 'yellow', 'green'].forEach((k, i) => {
        g.fillStyle(k === this.light ? lc : 0x333333, 1); g.fillCircle(sx(x), sy(y) - 15 + i * 9, 3.5);
      });
      if (lc) { g.fillStyle(lc, 0.25); g.fillCircle(sx(x), sy(y) - 15 + ['red', 'yellow', 'green'].indexOf(this.light) * 9, 8); }
    });
    // oncoming traffic (static decoration)
    [[7.45, LINE + 30, 0x8A8F96], [10.95, LINE - 30, 0xA93226], [7.45, 20, 0x3C7FC2]].forEach(([x, y, col]) => this.carTop(g, x, y, col, false, 180));
    // queue, truck, our car
    this.queue.forEach((q, i) => this.carTop(g, R_LANE, q.y, [0xC9CED6, 0x5C7F6A][i], q.brake));
    this.truckTop(g);
    this.carTop(g, this.car.x, this.car.y, 0xFFFFFF, this.car.brake, 0, true);
    if (this.dimAll) { g.fillStyle(0x05080D, 0.35); g.fillRect(v.left, v.top, v.width, v.height); this.carTop(g, this.car.x, this.car.y, 0xFFFFFF, true, 0, true); this.truckTop(g); }
  }

  carTop(g, x, yFront, body, brake, rot, ring) {
    const w = CAR_W * S, l = CAR_L * S, cx = this.sx(x);
    const top = rot === 180 ? this.sy(yFront + CAR_L) : this.sy(yFront);
    g.fillStyle(0x000000, 0.28); g.fillRoundedRect(cx - w / 2 + 2, top + 2, w, l, 4);
    g.fillStyle(body, 1); g.fillRoundedRect(cx - w / 2, top, w, l, 4);
    g.fillStyle(0x1D2733, 0.9);
    if (rot === 180) g.fillRect(cx - w * 0.36, top + l * 0.62, w * 0.72, l * 0.13);
    else g.fillRect(cx - w * 0.36, top + l * 0.22, w * 0.72, l * 0.13);
    if (brake && rot !== 180) { g.fillStyle(0xFF2A2A, 1); g.fillRect(cx - w / 2, top + l - 2, 4, 3); g.fillRect(cx + w / 2 - 4, top + l - 2, 4, 3); }
    if (ring) { g.lineStyle(2, C.teal, 1); g.strokeRoundedRect(cx - w / 2 - 4, top - 4, w + 8, l + 8, 6); }
  }

  truckTop(g) {
    const tr = this.truck, w = TRUCK_W * S, cx = this.sx(tr.x), top = this.sy(tr.y);
    g.fillStyle(0x000000, 0.28); g.fillRect(cx - w / 2 + 3, top + 3, w, TRUCK_L * S);
    g.fillStyle(0xF4F5F6, 1); g.fillRoundedRect(cx - w / 2, top, w, 3 * S, { tl: 6, tr: 6, bl: 2, br: 2 });
    g.fillStyle(0x24364B, 1); g.fillRect(cx - w / 2 + 3, top + 4, w - 6, 5);
    g.fillStyle(0xE6E8EB, 1); g.fillRect(cx - w / 2, top + 3.4 * S, w, (TRUCK_L - 3.4) * S);
    g.fillStyle(C.yellow, 0.9); g.fillRect(cx - w / 2, top + 3.4 * S, 2, (TRUCK_L - 3.4) * S); g.fillRect(cx + w / 2 - 2, top + 3.4 * S, 2, (TRUCK_L - 3.4) * S);
    if (tr.brake) { g.fillStyle(0xFF2A2A, 1); g.fillRect(cx - w / 2, top + TRUCK_L * S - 3, 5, 3); g.fillRect(cx + w / 2 - 5, top + TRUCK_L * S - 3, 5, 3); }
  }

  go(key, data) {
    if (this.leaving) return; this.leaving = true;
    this.cameras.main.fadeOut(220, 8, 17, 30);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(key, data));
  }
}
