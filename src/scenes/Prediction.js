import Phaser from 'phaser';
import { W, H, COLORS as C, FONT, state, track, REDUCE_MOTION } from '../config.js';
import { setupCam, T, button, soundToggle, iconButton } from '../ui.js';
import { experienceById } from '../experiences.js';
import { Sfx } from '../sfx.js';

// "Before we begin" prediction gate for a perspective's `predict` config.
// The choice can be changed until Continue. Start with:
// this.scene.start('Prediction', { id: 'pedestrian', perspective: 'driving' })
export default class Prediction extends Phaser.Scene {
  constructor() { super('Prediction'); }

  create(data) {
    setupCam(this);
    Sfx.init(this);
    this.cameras.main.fadeIn(250, 8, 17, 30);
    this.leaving = false; this.choice = null; // scene instances are reused between visits
    this.e = experienceById(data.id);
    this.o = this.e.intro.options.find(o => o.id === data.perspective);
    const q = this.o.predict;

    this.add.image(0, 0, 'bgdusk').setOrigin(0);
    this.add.image(0, 0, 'vig').setOrigin(0).setDisplaySize(W, H);
    iconButton(this, 44, 44, 'back', () => this.go('ExperienceIntro', { id: this.e.id })).setDepth(2000);
    soundToggle(this);

    T(this, W / 2, 196, 'Before we begin', 46, '#FFFFFF');
    T(this, W / 2, 290, q.question, 22, '#E6EDF5', { fontStyle: 'normal', wordWrap: { width: 450 }, align: 'center', lineSpacing: 6 });

    // Up to 3 options sit in one row; more wrap into 2 columns.
    const cols = q.options.length <= 3 ? q.options.length : 2;
    this.opts = q.options.map((v, i) => this.option(v, q.unit, W / 2 + ((i % cols) - (cols - 1) / 2) * 150, 410 + Math.floor(i / cols) * 92));
    T(this, W / 2, 690, q.note, 20, '#B9C6D6', { fontStyle: 'normal', wordWrap: { width: 300 }, align: 'center', lineSpacing: 4 });

    this.cont = button(this, W / 2, 800, 220, 64, 'Continue', () => this.next(), { size: 24, fill: C.yellow, fillA: 1, color: '#0B1B2E' });
    this.cont.setVisible(false);
  }

  option(v, unit, x, y) {
    const w = 130, h = 72, g = this.add.graphics();
    const t = this.add.text(x, y, v + unit, { fontFamily: FONT, fontSize: '30px', color: '#FFFFFF', fontStyle: 'bold', resolution: 2 }).setOrigin(0.5);
    const o = { v, hi: false };
    o.draw = () => {
      const sel = this.choice === v;
      g.clear();
      g.fillStyle(0xFFFFFF, sel ? 0.06 : o.hi ? 0.18 : 0.12); g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 14);
      if (sel) { g.lineStyle(2, C.yellow, 1); g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 14); }
      t.setColor(sel ? '#FFCB2B' : '#FFFFFF');
    };
    const hit = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => { o.hi = true; o.draw(); });
    hit.on('pointerout', () => { o.hi = false; o.draw(); });
    hit.on('pointerup', () => { Sfx.init(this); Sfx.click(); this.choose(v); });
    o.draw();
    return o;
  }

  choose(v) {
    this.choice = v;
    this.opts.forEach(o => o.draw());
    if (!this.cont.visible) {
      this.cont.setVisible(true);
      if (!REDUCE_MOTION) { this.cont.setAlpha(0); this.tweens.add({ targets: this.cont, alpha: 1, duration: 200 }); }
    }
  }

  next() {
    const key = this.e.id + '.' + this.o.id;
    state.predictions[key] = this.choice;
    track('predict', { experience: this.e.id, perspective: this.o.id, guess: this.choice });
    this.go(this.o.scene || 'PerspectiveStub', { id: this.e.id, perspective: this.o.id });
  }

  go(key, data) {
    if (this.leaving) return; this.leaving = true;
    this.cameras.main.fadeOut(220, 8, 17, 30);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(key, data));
  }
}
