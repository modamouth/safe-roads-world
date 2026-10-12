import Phaser from 'phaser';
import { W, H, COLORS as C, FONT, state } from '../config.js';
import { setupCam, duskBg, T, button, soundToggle, iconButton, panel } from '../ui.js';
import { drawIcon } from '../icons.js';
import { experienceById } from '../experiences.js';
import { Sfx } from '../sfx.js';

// Placeholder shown after a prediction gate whose scenario isn't built yet.
export default class PerspectiveStub extends Phaser.Scene {
  constructor() { super('PerspectiveStub'); }

  create(data) {
    setupCam(this);
    Sfx.init(this);
    this.cameras.main.fadeIn(250, 8, 17, 30);
    this.leaving = false; // scene instances are reused between visits
    const e = experienceById(data.id), o = e.intro.options.find(p => p.id === data.perspective);
    const guess = state.predictions[e.id + '.' + o.id];

    duskBg(this);
    const back = () => this.go('ExperienceIntro', { id: e.id });
    iconButton(this, 44, 44, 'back', back).setDepth(2000);
    soundToggle(this);

    drawIcon(this.add.graphics(), o.icon, W / 2, 200, 76, 0xFFFFFF);
    T(this, W / 2, 284, e.title.toUpperCase(), 16, '#5FD0E0', { letterSpacing: 2 });
    T(this, W / 2, 326, o.label, 40, '#FFFFFF');

    if (guess != null) {
      panel(this, 60, 384, W - 120, 96, { alpha: 0.92, stroke: C.yellow, strokeA: 0.8 });
      T(this, W / 2, 414, 'Your guess', 17, '#B9C6D6', { fontStyle: 'normal' });
      T(this, W / 2, 452, guess + o.predict.unit, 32, '#FFCB2B');
    }

    panel(this, 40, 512, W - 80, 128, { alpha: 0.92, stroke: C.teal, strokeA: 0.8 });
    drawIcon(this.add.graphics(), 'info', 82, 576, 30, 0x5FD0E0);
    this.add.text(112, 536, 'Not built yet', { fontFamily: FONT, fontSize: '20px', color: '#FFFFFF', fontStyle: 'bold', resolution: 2 });
    this.add.text(112, 566, 'The ' + o.label.toLowerCase() + ' scenario and the answer reveal are in development.',
      { fontFamily: FONT, fontSize: '17px', color: '#B9C6D6', wordWrap: { width: W - 176 }, lineSpacing: 3, resolution: 2 });

    button(this, W / 2, 740, 360, 64, 'Back to ' + e.title, back, { size: 22, fill: C.yellow, fillA: 1, color: '#0B1B2E' });
    button(this, W / 2, 822, 260, 56, 'Learning Lab', () => this.go('LabMenu'), { size: 20, stroke: 0xFFFFFF, hitH: 66 });
  }

  go(key, data) {
    if (this.leaving) return; this.leaving = true;
    this.cameras.main.fadeOut(220, 8, 17, 30);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(key, data));
  }
}
