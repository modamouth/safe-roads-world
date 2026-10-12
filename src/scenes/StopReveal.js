import Phaser from 'phaser';
import { W, H, COLORS as C, FONT, state, track, REDUCE_MOTION } from '../config.js';
import { setupCam, duskBg, T, button, soundToggle, iconButton, panel } from '../ui.js';
import { experienceById } from '../experiences.js';
import { stopping } from '../stopping.js';
import { fmtM } from './StopDistance.js';
import { Sfx } from '../sfx.js';

// Results for a stopping-distance scenario: stacked bars per speed, the
// pedestrian's distance, and the answer to the prediction question.
export default class StopReveal extends Phaser.Scene {
  constructor() { super('StopReveal'); }

  create(data) {
    setupCam(this);
    Sfx.init(this);
    this.cameras.main.fadeIn(250, 8, 17, 30);
    this.leaving = false; // scene instances are reused between visits
    const e = experienceById(data.id), o = e.intro.options.find(p => p.id === data.perspective);
    const cfg = o.scenario, key = e.id + '.' + o.id, guess = state.predictions[key];
    const calc = v => stopping(v, cfg.reactionS, cfg.decel), r = fmtM;
    state.completed[key] = true;

    duskBg(this);
    iconButton(this, 44, 44, 'back', () => this.go('ExperienceIntro', { id: e.id })).setDepth(2000);
    soundToggle(this);

    T(this, W / 2, 112, 'Your stopping distances', 32, '#FFFFFF');

    // Chart
    panel(this, 28, 150, W - 56, 330, { alpha: 0.92, r: 20 });
    const x0 = 124, maxM = 40, pxm = 340 / maxM, rowY = i => 248 + i * 74;
    const pedX = x0 + cfg.hazardM * pxm;
    const g = this.add.graphics();
    for (let y = 196; y < 440; y += 12) { g.fillStyle(0xFFFFFF, 0.55); g.fillRect(pedX - 1, y, 2, 7); }
    T(this, pedX, 182, 'Pedestrian · ' + cfg.hazardM + ' m', 15, '#FFFFFF');
    cfg.speeds.forEach((v, i) => {
      const s = calc(v), y = rowY(i);
      T(this, 76, y, v + ' km/h', 18, '#FFFFFF');
      const bars = this.add.graphics();
      const draw = k => {
        bars.clear();
        bars.fillStyle(C.teal, 1); bars.fillRect(x0, y - 16, s.react * pxm * k, 32);
        bars.fillStyle(C.yellow, 1); bars.fillRect(x0 + s.react * pxm * k, y - 16, s.brake * pxm * k, 32);
      };
      const tot = T(this, x0 + s.total * pxm + 10, y, r(s.total), 18, s.total > cfg.hazardM ? '#FFFFFF' : '#FFCB2B').setOrigin(0, 0.5);
      if (REDUCE_MOTION) draw(1);
      else { tot.setAlpha(0); this.tweens.addCounter({ from: 0, to: 1, duration: 700, delay: 200 + i * 250, ease: 'Cubic.easeOut', onUpdate: tw => draw(tw.getValue()), onComplete: () => tot.setAlpha(1) }); }
    });
    const lg = this.add.graphics();
    lg.fillStyle(C.teal, 1); lg.fillRect(70, 452, 16, 16);
    lg.fillStyle(C.yellow, 1); lg.fillRect(296, 452, 16, 16);
    this.add.text(94, 460, 'Reaction (' + cfg.reactionS + ' s)', { fontFamily: FONT, fontSize: '15px', color: '#DDE6F0', resolution: 2 }).setOrigin(0, 0.5);
    this.add.text(320, 460, 'Braking', { fontFamily: FONT, fontSize: '15px', color: '#DDE6F0', resolution: 2 }).setOrigin(0, 0.5);

    // Prediction answer
    const a = calc(cfg.revealKmh);
    panel(this, 28, 506, W - 56, 196, { alpha: 0.92, r: 20, stroke: C.yellow, strokeA: 0.7 });
    T(this, W / 2, 540, guess != null ? 'You guessed ' + guess + ' m.' : 'The answer', 22, '#FFCB2B');
    T(this, W / 2, 618, 'At ' + cfg.revealKmh + ' km/h on a dry road, a car needs ' + r(a.total) + ' to stop: '
      + r(a.react) + ' while you react, then ' + r(a.brake) + ' of braking.', 19, '#FFFFFF',
      { fontStyle: 'normal', wordWrap: { width: 440 }, align: 'center', lineSpacing: 5 });
    T(this, W / 2, 728, 'Prototype. Reaction time and braking figures are placeholders until validated.', 13, '#7F8FA3',
      { fontStyle: 'normal', wordWrap: { width: 440 }, align: 'center' });
    track('scenario_reveal', { scenario: key, guess, answerM: Math.round(a.total) });

    button(this, W / 2, 800, 380, 64, 'Back to ' + e.title, () => this.go('ExperienceIntro', { id: e.id }),
      { size: 22, fill: C.yellow, fillA: 1, color: '#0B1B2E' });
    button(this, W / 2, 880, 260, 56, 'Learning Lab', () => this.go('LabMenu'), { size: 20, stroke: 0xFFFFFF, hitH: 66 });
  }

  go(key, data) {
    if (this.leaving) return; this.leaving = true;
    this.cameras.main.fadeOut(220, 8, 17, 30);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(key, data));
  }
}
