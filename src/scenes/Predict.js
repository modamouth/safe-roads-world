import Phaser from 'phaser';
import { W, H, DATA, state, track } from '../config.js';
import { setupCam, T, button, brand, soundToggle } from '../ui.js';

export default class Predict extends Phaser.Scene {
  constructor() { super('Predict'); }

  create() {
    setupCam(this);
    track('enter');

    const real = this.registry.get('REAL');
    this.add.image(0, 0, real ? 'img_sky' : 'bgdusk').setOrigin(0).setDisplaySize(W, real ? 370 : H);
    this.add.image(0, 0, 'vig').setOrigin(0).setDisplaySize(W, H);
    brand(this); soundToggle(this);

    T(this, W / 2, 200, 'Before we begin', 44, '#FFFFFF');
    T(this, W / 2, 296, DATA.question, 27, '#E6EDF5', { fontStyle: 'normal', wordWrap: { width: 440 }, align: 'center', lineSpacing: 6 });

    this.opts = [];
    DATA.options.forEach((v, i) => {
      const x = 175 + (i % 2) * 190, y = 440 + Math.floor(i / 2) * 92;
      const b = button(this, x, y, 170, 76, v + '%', () => this.choose(v, b), { size: 32 });
      this.opts.push(b);
    });
    T(this, W / 2, 742, "We'll reveal the answer at the end.", 20, '#B9C6D6', { fontStyle: 'normal' });
    T(this, W / 2, 922, 'Prototype. Figures are illustrative.', 14, '#7F8FA3', { fontStyle: 'normal' });
  }

  choose(v, btn) {
    if (this.done) return; this.done = true;
    state.guess = v; track('predict', { guess: v });
    this.opts.forEach(b => b.setEnabled(false));
    btn.setEnabled(true); btn.setActive(true);
    this.time.delayedCall(450, () => this.scene.start('Drive'));
  }
}
