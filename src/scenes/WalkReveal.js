import Phaser from 'phaser';
import { W, H, COLORS as C, FONT, state, track, REDUCE_MOTION } from '../config.js';
import { setupCam, T, button, soundToggle, iconButton, panel } from '../ui.js';
import { drawIcon } from '../icons.js';
import { experienceById } from '../experiences.js';
import { SPOTS } from './WalkCross.js';
import { Sfx } from '../sfx.js';

// Screens after the crossing scenario, from the perspective's `predict` and
// `reveal` data: 1) answer to the prediction, 2) chart + tip,
// 3) "Always remember" with a summary of each crossing.
export default class WalkReveal extends Phaser.Scene {
  constructor() { super('WalkReveal'); }

  create(data) {
    setupCam(this);
    Sfx.init(this);
    this.leaving = false; // scene instances are reused between visits
    this.e = experienceById(data.id);
    this.o = this.e.intro.options.find(p => p.id === data.perspective);
    this.key = this.e.id + '.' + this.o.id;
    state.completed[this.key] = true;

    this.add.image(0, 0, 'bgdusk').setOrigin(0);
    this.add.image(0, 0, 'vig').setOrigin(0).setDisplaySize(W, H);
    iconButton(this, 44, 44, 'back', () => this.go('ExperienceIntro', { id: this.e.id })).setDepth(2000);
    soundToggle(this);
    this.page = null;
    this.show(0);
  }

  show(n) {
    if (this.page) this.page.destroy();
    this.page = this.add.container(0, 0);
    this.cameras.main.fadeIn(220, 8, 17, 30);
    [this.answer, this.chart, this.remember][n].call(this, this.page);
    if (n < 2) this.page.add(button(this, W / 2, 836, 220, 64, 'Continue', () => this.show(n + 1), { size: 24, fill: C.yellow, fillA: 1, color: '#0B1B2E' }));
  }

  // 1) Was the prediction right?
  answer(p) {
    const q = this.o.predict, guess = state.predictions[this.key], right = guess === q.answer;
    track('scenario_reveal', { scenario: this.key, guess, answer: q.answer, correct: right });
    if (guess != null) Sfx.chime(right);
    p.add(T(this, W / 2, 200, guess == null ? 'The answer' : right ? "You're correct" : "You're incorrect", 44, '#FFFFFF'));
    p.add(T(this, W / 2, 290, q.explain, 21, '#E6EDF5', { fontStyle: 'normal', wordWrap: { width: 440 }, align: 'center', lineSpacing: 5 }));
    const n = q.options.length;
    q.options.forEach((v, i) => {
      const x = W / 2 + (i - (n - 1) / 2) * 150, y = 420, w = 130, h = 72;
      const isAns = v === q.answer, isGuess = v === guess && !isAns;
      const col = isAns ? C.green : isGuess ? C.yellow : null;
      const g = this.add.graphics();
      g.fillStyle(0xFFFFFF, col ? 0.06 : 0.12); g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 14);
      if (col) { g.lineStyle(2, col, 1); g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 14); }
      p.add([g, T(this, x, y, v + q.unit, 30, isAns ? '#3DBE7A' : isGuess ? '#FFCB2B' : '#FFFFFF')]);
    });
    if (guess != null && !right) p.add(T(this, W / 2, 500, 'Your answer: ' + guess + q.unit + '   ·   Right answer: ' + q.answer + q.unit, 16, '#B9C6D6', { fontStyle: 'normal' }));
  }

  // 2) Chart + tip
  chart(p) {
    const r = this.o.reveal, c = r.chart;
    p.add(T(this, W / 2, 150, r.heading, 36, '#FFFFFF'));
    p.add(T(this, W / 2, 218, r.sub, 20, '#E6EDF5', { fontStyle: 'normal', wordWrap: { width: 400 }, align: 'center', lineSpacing: 4 }));

    const px = 110, py = 270, pw = 320, ph = 330, y0 = py + 270, yH = 2;   // 2 px per %
    p.add(panel(this, px, py, pw, ph, { fill: 0x0E1622, alpha: 0.92, r: 18, stroke: 0xFFFFFF, strokeA: 0.1 }));
    p.add(this.add.text(px + 26, py + 26, c.title, { fontFamily: FONT, fontSize: '17px', color: '#B9C6D6', resolution: 2 }).setOrigin(0, 0.5));
    for (let v = 0; v <= 100; v += 20) p.add(this.add.text(px + 52, y0 - v * yH, String(v), { fontFamily: FONT, fontSize: '15px', color: '#9AA6B5', resolution: 2 }).setOrigin(1, 0.5));
    c.bars.forEach(([kmh, pct], i) => {
      const bx = px + 128 + i * 92, bw = 52, g = this.add.graphics(), label = T(this, bx, 0, String(pct), 22, '#FFCB2B');
      const draw = k => {
        const hh = pct * yH * k;
        g.clear();
        g.fillGradientStyle(C.yellow, C.yellow, C.yellow, C.yellow, 0.45, 0.45, 0.04, 0.04);
        g.fillRect(bx - bw / 2, y0 - hh, bw, hh);
        g.fillStyle(C.yellow, 1); g.fillRect(bx - bw / 2, y0 - hh - 1, bw, 3);
        label.setY(y0 - hh - 18);
      };
      p.add([g, label, T(this, bx, y0 + 28, String(kmh), 17, '#B9C6D6', { fontStyle: 'normal' })]);
      if (REDUCE_MOTION) draw(1);
      else this.tweens.addCounter({ from: 0, to: 1, duration: 700, delay: 250 + i * 250, ease: 'Cubic.easeOut', onUpdate: tw => draw(tw.getValue()) });
    });
    p.add(this.add.text(px + pw - 18, y0 + 28, c.unit, { fontFamily: FONT, fontSize: '17px', color: '#B9C6D6', resolution: 2 }).setOrigin(1, 0.5));

    p.add(T(this, W / 2, 690, r.tip, 20, '#E6EDF5', { fontStyle: 'normal', wordWrap: { width: 400 }, align: 'center', lineSpacing: 4 }));
    p.add(T(this, W / 2, 920, 'Prototype. Figures to be validated against a cited source.', 13, '#7F8FA3', { fontStyle: 'normal' }));
  }

  // 3) Always remember + what happened at each spot
  remember(p) {
    const r = this.o.reveal, runs = state.runs[this.key] || {};
    p.add(T(this, W / 2, 112, 'Always remember', 38, '#FFFFFF'));
    let y = 168;
    r.remember.forEach((line, i) => {
      const g = this.add.graphics();
      g.fillStyle(C.yellow, 1); g.fillCircle(54, y + 14, 14);
      const t = this.add.text(82, y, line, { fontFamily: FONT, fontSize: '18px', color: '#E6EDF5', wordWrap: { width: 420 }, lineSpacing: 4, resolution: 2 });
      p.add([g, T(this, 54, y + 14, String(i + 1), 16, '#0B1B2E'), t]);
      y += Math.max(40, t.height) + 22;
    });

    const top = y + 6;
    p.add(panel(this, 28, top, W - 56, 200, { alpha: 0.92, r: 20 }));
    p.add(this.add.text(52, top + 26, 'Your crossings', { fontFamily: FONT, fontSize: '16px', color: '#5FD0E0', fontStyle: 'bold', letterSpacing: 1, resolution: 2 }).setOrigin(0, 0.5));
    SPOTS.forEach((s, i) => {
      const run = runs[s.id], ry = top + 66 + i * 46, ok = run && run.safe;
      p.add(this.add.text(52, ry, s.label, { fontFamily: FONT, fontSize: '17px', color: '#FFFFFF', fontStyle: 'bold', resolution: 2 }).setOrigin(0, 0.5));
      p.add(this.add.text(52, ry + 19, run ? (run.couldSee ? 'Could see the car' : 'Couldn’t see the car') : 'Not tried', { fontFamily: FONT, fontSize: '14px', color: run && !run.couldSee ? '#FFCB2B' : '#B9C6D6', resolution: 2 }).setOrigin(0, 0.5));
      if (run) {
        const g = this.add.graphics();
        g.fillStyle(ok ? C.green : C.yellow, 1); g.fillCircle(W - 186, ry + 8, 12);
        drawIcon(g, ok ? 'check' : 'info', W - 186, ry + 8, 14, C.navy);
        p.add([g, this.add.text(W - 166, ry + 8, ok ? 'Crossed safely' : 'Near miss', { fontFamily: FONT, fontSize: '16px', color: '#FFFFFF', fontStyle: 'bold', resolution: 2 }).setOrigin(0, 0.5)]);
      }
    });

    p.add(button(this, W / 2, Math.max(top + 270, 800), 380, 64, 'Back to ' + this.e.title, () => this.go('ExperienceIntro', { id: this.e.id }),
      { size: 22, fill: C.yellow, fillA: 1, color: '#0B1B2E' }));
    p.add(button(this, W / 2, Math.max(top + 350, 880), 260, 56, 'Learning Lab', () => this.go('LabMenu'), { size: 20, stroke: 0xFFFFFF, hitH: 66 }));
  }

  go(key, data) {
    if (this.leaving) return; this.leaving = true;
    this.cameras.main.fadeOut(220, 8, 17, 30);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(key, data));
  }
}
