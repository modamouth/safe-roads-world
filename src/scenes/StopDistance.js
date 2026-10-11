import Phaser from 'phaser';
import { W, H, COLORS as C, FONT, state, track, clamp, lerpColor, easeOut, REDUCE_MOTION } from '../config.js';
import { setupCam, T, button, soundToggle, iconButton, makeCaption, panel } from '../ui.js';
import { drawIcon } from '../icons.js';
import { experienceById } from '../experiences.js';
import { artKey } from '../worldArt.js';
import { stopping, impactKmh } from '../stopping.js';
import { Sfx } from '../sfx.js';

// Chase camera behind and above the car, looking down a city street.
// World units are metres; z runs forward along the road, x across it (left negative).
const HY = 330;                    // horizon (design px)
const VPX = W / 2;                 // vanishing point x
const F = 1700;                    // focal length (px)
const CAMH = 5.5;                  // camera height (m)
const Z_R = 19;                    // camera to the car's rear bumper (m)
const CAR_LEN = 4.5, CAR_W = 1.85;
const CAR_Y = HY + F * CAMH / Z_R; // screen y of the car's rear bumper
const PRE_EVENT = 40;              // metres driven before the pedestrian steps out
const ACC_T = 1.6;                 // seconds to reach the chosen speed
const PED_FROM = -3.0, PED_STOP = -0.5, PED_SPEED = 1.4, PED_H = 1.72;
const FREEZE_GAP = 4.5;            // freeze this far before contact so the pedestrian stays visible (no collision is shown)
export const fmtM = n => n.toFixed(1) + ' m';

// Road cross-section (x in metres from our lane's centre).
const KERB_L = -4.0, EDGE = -1.75, CENTRE = 1.8, KERB_R = 5.6;
const COL = {
  walk: 0xD8C8A6, walk2: 0xCFBE9A, kerb: 0xB9B6AE, asph: 0x4A494D, asph2: 0x4E4D51, line: 0xF2F2F2, haze: 0xE6D7BE
};

export default class StopDistance extends Phaser.Scene {
  constructor() { super('StopDistance'); }

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
    this.real = this.registry.get('REAL');

    this.phase = 'pick'; this.pos = 0; this.kmh = 0; this.t = 0;
    this.ZP = Z_R + CAR_LEN + PRE_EVENT + this.cfg.hazardM;   // pedestrian's world z
    this.pedX = PED_FROM; this.pedOn = false; this.walkT = 0; this.pedGoal = null; this.pickerUi = null; this.target = null;

    this.add.image(0, 0, artKey(this, 'city_backdrop')).setOrigin(0).setDisplaySize(W, HY + 8).setDepth(0);
    this.roadG = this.add.graphics().setDepth(1);
    this.add.rectangle(W / 2, HY + 2, W, 10, COL.haze, 0.55).setDepth(2);
    this.buildScenery();

    const carKey = this.real ? 'img_suv' : 'carRear';
    this.car = this.add.image(VPX, CAR_Y, carKey).setOrigin(0.5, 1).setDepth(600);
    this.car.setScale((CAR_W * F / Z_R) / this.car.width);
    const lights = this.real ? [[0.155, 0.485], [0.762, 0.49]] : [[0.14, 0.51], [0.86, 0.51]];
    this.brakeLights = lights.map(([fx, fy]) => this.add.image(0, 0, 'glow').setBlendMode(Phaser.BlendModes.ADD)
      .setTint(0xFF2A2A).setAlpha(0).setScale(0.42).setDepth(601)
      .setPosition(VPX + (fx - 0.5) * this.car.displayWidth, CAR_Y - (1 - fy) * this.car.displayHeight));

    this.dim = this.add.rectangle(W / 2, H / 2, W, H, 0x05080D, 0).setDepth(700);
    iconButton(this, 44, 44, 'back', () => this.go('ExperienceIntro', { id: this.e.id })).setDepth(2000);
    soundToggle(this);
    this.cap = makeCaption(this, 150, 1000);

    this.phaseTxt = T(this, W / 2, 852, '', 16, '#5FD0E0', { letterSpacing: 2 }).setDepth(1000);
    this.speedTxt = T(this, W / 2, 896, '', 52, '#FFFFFF').setDepth(1000).setVisible(false);
    this.unitTxt = T(this, W / 2, 934, 'km/h', 16, '#B9C6D6', { fontStyle: 'normal' }).setDepth(1000).setVisible(false);

    this.events.once('shutdown', () => Sfx.stopEngine());
    this.drawRoad(); this.updateScenery();

    if (data.speed) this.time.delayedCall(500, () => this.pick(data.speed));
    else { this.cap.set("Let's see how speed affects your stopping distance.\nPick a speed to get started."); this.picker(); }
  }

  // --- speed picker ----------------------------------------------------------
  picker() {
    const c = this.add.container(0, 0).setDepth(1000);
    c.add(panel(this, 70, 846, 400, 84, { alpha: 0.88, stroke: 0xFFFFFF, strokeA: 0.5, r: 18 }));
    const g = this.add.graphics(); drawIcon(g, 'speed', 120, 878, 30, 0xFFFFFF); c.add(g);
    c.add(T(this, 120, 906, 'km/h', 14, '#DDE6F0', { fontStyle: 'normal' }));
    this.cfg.speeds.forEach((v, i) => c.add(button(this, 220 + i * 92, 888, 80, 64, String(v), () => this.pick(v), { size: 30, fillA: 0.1 })));
    this.pickerUi = c;
  }

  pick(v) {
    if (this.phase !== 'pick') return;
    this.phase = 'accel'; this.target = v; this.t = 0;
    this.s = stopping(v, this.cfg.reactionS, this.cfg.decel);
    track('scenario_start', { scenario: this.key, speed: v });
    if (this.pickerUi) this.pickerUi.destroy();
    this.cap.hide();
    this.speedTxt.setVisible(true); this.unitTxt.setVisible(true);
    Sfx.startEngine();
  }

  // --- scenery -----------------------------------------------------------------
  buildScenery() {
    this.scn = [];
    const add = (tex, wz, x, sizeM, by) => {
      const im = this.add.image(0, 0, tex).setOrigin(0.5, 1).setVisible(false);
      im.wz = wz; im.xm = x; im.sizeM = sizeM; im.by = by || 'h';
      this.scn.push(im); return im;
    };
    const end = this.ZP + 160;
    for (let z = 30; z < end; z += 22) { add('palm', z, -6.4, 7.5); add('palm', z + 11, 7.6, 7.5); }
    for (let z = 42; z < end; z += 30) { add('lamp', z, -4.6, 6.5); add('lamp', z + 15, 6.2, 6.5); }
    const carKey = this.real ? 'img_suv' : 'carRear', tints = [0xFFFFFF, 0x9DB8E8, 0xE8C9A0, 0xB0B0B8, 0x9FD3C7];
    [this.ZP - 7.5, this.ZP + 5.5, this.ZP - 26, this.ZP + 21, this.ZP + 40, 48, 70].forEach((z, i) =>
      add(carKey, z, -2.9, CAR_W, 'w').setTint(tints[i % tints.length]));
    let s = 11; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let z = 26; z < end; z += 9 + rnd() * 12) {
      const left = rnd() < 0.5;
      add('ped_stand' + Math.floor(rnd() * 4), z, left ? -5.0 - rnd() * 1.6 : 6.4 + rnd() * 1.6, PED_H);
    }
    this.ped = add('ped_walkA', this.ZP, PED_FROM, PED_H);
  }

  proj(zRel, xm) {
    const k = F / zRel;
    return { k, x: VPX + xm * k, y: HY + F * CAMH / zRel };
  }

  updateScenery() {
    this.ped.xm = this.pedX;
    this.scn.forEach(o => {
      const zRel = o.wz - this.pos;
      if (zRel < 6 || zRel > 320 || (o === this.ped && !this.pedOn)) { o.setVisible(false); return; }
      const p = this.proj(zRel, o.xm);
      const px = o.by === 'w' ? o.sizeM * p.k / o.width : o.sizeM * p.k / o.height;
      o.setVisible(true).setPosition(p.x, p.y).setScale(px).setDepth(400 - zRel).setAlpha(clamp(1.35 - zRel / 260, 0.35, 1));
    });
  }

  drawRoad() {
    const g = this.roadG; g.clear();
    for (let y = HY + 1; y < H; y += 4) {
      const z = F * CAMH / (y + 2 - HY), k = F / z, wz = this.pos + z;
      const fog = clamp((z - 30) / 240, 0, 1) * 0.8;
      const col = c => lerpColor(c, COL.haze, fog);
      const seg = (m0, m1, c, minW) => {
        let a = VPX + m0 * k, b = VPX + m1 * k;
        if (minW && b - a < minW) { const m = (a + b) / 2; a = m - minW / 2; b = m + minW / 2; }
        a = clamp(a, -4, W + 4); b = clamp(b, -4, W + 4);
        if (b > a) { g.fillStyle(col(c), 1); g.fillRect(a, y, b - a, 5); }
      };
      g.fillStyle(col(Math.floor(wz / 1.5) & 1 ? COL.walk : COL.walk2), 1); g.fillRect(0, y, W, 5);
      seg(KERB_L - 0.25, KERB_L, COL.kerb);
      seg(KERB_L, KERB_R, Math.floor(wz / 6) & 1 ? COL.asph : COL.asph2);
      seg(KERB_R, KERB_R + 0.25, COL.kerb);
      if ((((wz % 9) + 9) % 9) < 3) seg(EDGE - 0.06, EDGE + 0.06, COL.line, 1);
      seg(CENTRE - 0.08, CENTRE + 0.04, COL.line, 1);
      seg(CENTRE + 0.16, CENTRE + 0.28, COL.line, 1);
    }
  }

  // --- simulation --------------------------------------------------------------
  update(time, delta) {
    const dt = Math.min(delta / 1000, 0.05);
    const v = this.target ? this.target / 3.6 : 0;

    if (this.phase === 'accel' || this.phase === 'cruise') {
      this.t += dt;
      const k = this.phase === 'accel' ? clamp(this.t / ACC_T, 0, 1) : 1;
      this.kmh = this.target * easeOut(k);
      this.pos += (this.kmh / 3.6) * dt;
      if (this.phase === 'accel' && k >= 1) this.phase = 'cruise';
      if (this.pos >= PRE_EVENT) this.event();
    } else if (this.phase === 'react' || this.phase === 'brake') {
      this.tE += dt;
      const r = this.cfg.reactionS, a = this.cfg.decel;
      let d, vNow;
      if (this.tE < r) { d = v * this.tE; vNow = v; }
      else {
        if (this.phase === 'react') this.startBraking();
        const tb = Math.min(this.tE - r, v / a);
        d = this.s.react + v * tb - 0.5 * a * tb * tb; vNow = v - a * tb;
      }
      this.pos = PRE_EVENT + d; this.kmh = vNow * 3.6;
      if (d >= this.cfg.hazardM - FREEZE_GAP && this.s.total > this.cfg.hazardM) this.outcome(false);
      else if (vNow <= 0.01 && this.phase === 'brake') this.outcome(true);
    }

    // Pedestrian walks into our lane, pauses there, and finishes crossing once the car has stopped.
    if (this.pedOn) {
      const goal = this.pedGoal != null ? this.pedGoal : PED_STOP;
      if (this.pedX < goal) {
        this.pedX = Math.min(goal, this.pedX + PED_SPEED * dt);
        this.walkT += dt;
        this.ped.setTexture(Math.floor(this.walkT / 0.28) % 2 ? 'ped_walkB' : 'ped_walkA');
      } else this.ped.setTexture('ped_walkB');
    }

    this.drawRoad();
    this.updateScenery();
    if (this.speedTxt.visible) this.speedTxt.setText(String(Math.round(this.kmh)));
    if (this.phase !== 'pick' && this.phase !== 'done') Sfx.setEngine(this.kmh);
  }

  event() {
    this.pos = PRE_EVENT; this.phase = 'react'; this.tE = 0;
    this.pedOn = true;
    this.cap.set('A pedestrian ' + this.cfg.hazardM + ' m ahead doesn’t see you and steps onto the road.');
    this.phaseTxt.setText('REACTING').setColor('#5FD0E0');
    track('scenario_hazard', { scenario: this.key, speed: this.target });
  }

  startBraking() {
    this.phase = 'brake';
    this.phaseTxt.setText('BRAKING').setColor('#FFCB2B');
    Sfx.skid();
    this.brakeLights.forEach(l => l.setAlpha(0.95));
    if (!REDUCE_MOTION) this.tweens.add({ targets: this.car, y: CAR_Y + 4, duration: 160, ease: 'Quad.easeOut' });
  }

  outcome(stopped) {
    if (this.phase === 'done') return;
    this.phase = 'done';
    Sfx.stopEngine();
    this.phaseTxt.setText('');
    const v = this.target, hit = stopped ? 0 : impactKmh(v, this.cfg.hazardM, this.cfg.reactionS, this.cfg.decel);
    state.runs[this.key][v] = { total: this.s.total, impact: hit };
    track('scenario_outcome', { scenario: this.key, speed: v, stoppingM: +this.s.total.toFixed(1), impactKmh: Math.round(hit) });

    if (stopped) {
      Sfx.chime(true);
      this.kmh = 0;
      this.pedGoal = KERB_R + 1.2;    // pedestrian finishes crossing
      const gap = Math.max(0, this.cfg.hazardM - this.s.total);
      this.cap.set('At ' + v + ' km/h you stopped ' + fmtM(gap) + ' before the pedestrian.');
    } else {
      // Freeze just before contact: no collision is shown.
      Sfx.chime(false);
      this.kmh = hit;
      this.tweens.add({ targets: this.dim, fillAlpha: 0.5, duration: REDUCE_MOTION ? 0 : 300 });
      this.cap.set('At ' + v + ' km/h you couldn’t stop in time. You’d still be doing about ' + Math.round(hit) + ' km/h when you reach the pedestrian.');
    }
    this.time.delayedCall(900, () => this.results());
  }

  results() {
    const r = fmtM;
    const c = this.add.container(0, 0).setDepth(1001);
    c.add(panel(this, 40, 236, W - 80, 86, { alpha: 0.9, r: 16 }));
    [['Reaction', r(this.s.react), '#5FD0E0'], ['Braking', r(this.s.brake), '#FFCB2B'], ['Total', r(this.s.total), '#FFFFFF']].forEach(([l, val, col], i) => {
      const x = 113 + i * 157;
      c.add(T(this, x, 262, l, 15, '#B9C6D6', { fontStyle: 'normal' }));
      c.add(T(this, x, 294, val, 26, col));
    });

    this.speedTxt.setVisible(false); this.unitTxt.setVisible(false);
    const runs = state.runs[this.key], done = this.cfg.speeds.every(s => runs[s]);
    this.phaseTxt.setText(done ? '' : 'TRY ANOTHER SPEED').setColor('#B9C6D6').setY(820);
    this.cfg.speeds.forEach((s, i) => {
      const b = button(this, 178 + i * 92, 858, 80, 56, (runs[s] ? '✓ ' : '') + s, () => this.go('StopDistance', { id: this.e.id, perspective: this.o.id, speed: s }),
        { size: 22, fillA: s === this.target ? 0.25 : 0.12, stroke: s === this.target ? C.yellow : null });
      b.setDepth(1001);
    });
    if (done) {
      button(this, W / 2, 924, 300, 54, 'See results', () => this.go('StopReveal', { id: this.e.id, perspective: this.o.id }),
        { size: 22, fill: C.yellow, fillA: 1, color: '#0B1B2E' }).setDepth(1001);
    }
  }

  go(key, data) {
    if (this.leaving) return; this.leaving = true;
    this.cameras.main.fadeOut(220, 8, 17, 30);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(key, data));
  }
}
