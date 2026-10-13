import Phaser from 'phaser';
import { W, H, COLORS as C, track } from '../config.js';
import { setupCam, duskBg, T, button, brand, soundToggle } from '../ui.js';
import { drawIcon } from '../icons.js';
import { describe } from '../a11y.js';
import { EXPERIENCES, experienceProgress, labProgress } from '../experiences.js';
import { t } from '../lab/content.js';
import { Sfx } from '../sfx.js';

// Passport: one stamp per Learning Lab experience (a partial ring while some
// of its topics are done). Progress is saved on the device by the Lab engine.
export default class Passport extends Phaser.Scene {
  constructor() { super('Passport'); }

  create() {
    setupCam(this);
    Sfx.init(this);
    this.leaving = false; // scene instances are reused between visits
    const lp = labProgress();
    track('passport_view', { stamps: lp.done });
    this.cameras.main.fadeIn(250, 8, 17, 30);
    duskBg(this);
    brand(this); soundToggle(this);

    T(this, W / 2, 104, t('passport.title'), 36, '#FFFFFF');
    T(this, W / 2, 146, lp.done ? t('passport.stamps', { n: lp.done, of: lp.of }) : t('passport.empty'), 18, lp.done ? '#FFCB2B' : '#E6EDF5',
      { fontStyle: lp.done ? 'bold' : 'normal', wordWrap: { width: 440 }, align: 'center' });

    // 4 x 3 grid of stamps
    const cols = 4, cell = 118, x0 = W / 2 - (cols * cell) / 2 + cell / 2, y0 = 238;
    const lines = [];
    EXPERIENCES.forEach((e, i) => {
      const x = x0 + (i % cols) * cell, y = y0 + Math.floor(i / cols) * 132, pr = experienceProgress(e);
      const g = this.add.graphics();
      if (pr.complete) {
        g.lineStyle(4, C.yellow, 1); g.strokeCircle(x, y, 44); g.lineStyle(1.5, C.yellow, 1); g.strokeCircle(x, y, 37);
        g.fillStyle(C.navy2, 1); g.fillCircle(x, y, 35); drawIcon(g, e.icon, x, y, 40, C.yellow);
      } else {
        g.lineStyle(2, 0xFFFFFF, 0.25); g.strokeCircle(x, y, 44);
        if (pr.done) { g.lineStyle(4, C.yellow, 1); g.beginPath(); g.arc(x, y, 44, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pr.done / pr.of); g.strokePath(); }
        drawIcon(g, e.icon, x, y, 36, 0xFFFFFF, 0.35);
      }
      T(this, x, y + 60, e.label, 13, pr.complete ? '#FFFFFF' : '#9AA6B5', { fontStyle: pr.complete ? 'bold' : 'normal', wordWrap: { width: cell - 6 }, align: 'center' });
      lines.push(e.label + ': ' + (pr.complete ? t('menu.done').replace('✓ ', '') : t('menu.progress', { n: pr.done, of: pr.of })));
    });
    describe(t('passport.title'), [lp.done ? t('passport.stamps', { n: lp.done, of: lp.of }) : t('passport.empty')].concat(lines));

    this.toast = T(this, W / 2, 680, '', 16, '#B9C6D6', { fontStyle: 'normal', wordWrap: { width: 440 }, align: 'center' }).setAlpha(0);
    if (lp.done) {
      button(this, W / 2, 740, 380, 64, t('passport.save'), () => {
        track('save_click');
        this.toast.setText(t('passport.saveStub'));
        this.tweens.add({ targets: this.toast, alpha: 1, duration: 200 });
      }, { size: 21, fill: C.yellow, fillA: 1, color: '#0B1B2E' });
    }
    button(this, 150, 828, 230, 60, t('passport.toLab'), () => this.go('LabMenu'), { size: 20, stroke: 0xFFFFFF, hitH: 64 });
    button(this, 390, 828, 230, 60, t('passport.map'), () => { track('map_nav', { from: 'passport', to: 'map' }); this.go('Map'); },
      { size: 20, stroke: 0xFFFFFF, hitH: 64 });
    T(this, W / 2, 912, t('passport.saved'), 14, '#9AA6B5', { fontStyle: 'normal' });
  }

  go(key) {
    if (this.leaving) return; this.leaving = true;
    this.cameras.main.fadeOut(220, 8, 17, 30);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(key));
  }
}
