import Phaser from 'phaser';
import { W, H, COLORS as C, track } from '../config.js';
import { setupCam, duskBg, T, soundToggle, iconButton, toast } from '../ui.js';
import { drawIcon } from '../icons.js';
import { experienceById } from '../experiences.js';
import { Sfx } from '../sfx.js';

// Intro screen for a 'preview' experience: heading, tagline, body and a choice
// of perspectives, all from the experience's `intro` in experiences.js.
// Start with: this.scene.start('ExperienceIntro', { id })
export default class ExperienceIntro extends Phaser.Scene {
  constructor() { super('ExperienceIntro'); }

  create(data) {
    setupCam(this);
    Sfx.init(this);
    this.cameras.main.fadeIn(250, 8, 17, 30);
    this.leaving = false; this._toast = null; // scene instances are reused between visits
    const e = experienceById(data && data.id);
    this.e = e;

    duskBg(this);
    iconButton(this, 44, 44, 'back', () => this.go('LabMenu')).setDepth(2000);
    soundToggle(this);
    if (!e || !e.intro) { T(this, W / 2, H / 2, 'Coming soon', 30, '#FFFFFF'); return; }
    const i = e.intro;
    track('experience_intro', { id: e.id });

    drawIcon(this.add.graphics(), e.icon, W / 2, 196, 84, 0xFFFFFF);
    T(this, W / 2, 290, e.title, 40, '#FFFFFF');
    T(this, W / 2, 342, i.tagline, 23, '#FFCB2B');
    T(this, W / 2, 440, i.body, 21, '#E6EDF5', { fontStyle: 'normal', wordWrap: { width: 420 }, align: 'center', lineSpacing: 6 });
    T(this, W / 2, 560, i.prompt, 20, '#B9C6D6');

    const n = i.options.length, gap = 16, cw = Math.min(225, (W - 56 - gap * (n - 1)) / n), ch = 160;
    const x0 = (W - (cw * n + gap * (n - 1))) / 2;
    i.options.forEach((o, k) => this.option(o, x0 + k * (cw + gap), 596, cw, ch));
  }

  option(o, x, y, w, h) {
    const open = o.status !== 'locked', play = o.status === 'playable';
    const g = this.add.graphics();
    const draw = hi => {
      g.clear();
      g.fillStyle(open ? C.navy2 : 0xFFFFFF, open ? (hi ? 1 : 0.94) : (hi ? 0.14 : 0.09));
      g.fillRoundedRect(x, y, w, h, 18);
      if (open) { g.lineStyle(2, play ? C.yellow : C.teal, hi ? 1 : 0.85); g.strokeRoundedRect(x, y, w, h, 18); }
      drawIcon(g, o.icon, x + w / 2, y + 54, 56, open ? C.yellow : 0xFFFFFF, open ? 1 : 0.75);
    };
    draw(false);
    T(this, x + w / 2, y + 112, o.label, 24, '#FFFFFF');
    T(this, x + w / 2, y + 138, play ? 'Play' : open ? 'Preview' : 'Coming soon', 15, play ? '#FFCB2B' : open ? '#5FD0E0' : '#9AA6B5', { fontStyle: open ? 'bold' : 'normal' });

    const hit = this.add.zone(x + w / 2, y + h / 2, w, h).setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => draw(true));
    hit.on('pointerout', () => draw(false));
    hit.on('pointerup', () => {
      Sfx.init(this); Sfx.click();
      track('perspective_select', { experience: this.e.id, id: o.id, status: o.status });
      if (!open) { toast(this, this.e.label + ' · ' + o.label + ': coming soon', 820); return; }
      if (o.predict) this.go('Prediction', { id: this.e.id, perspective: o.id });
      else if (o.scene) this.go(o.scene);
    });
  }

  go(key, data) {
    if (this.leaving) return; this.leaving = true;
    this.cameras.main.fadeOut(220, 8, 17, 30);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(key, data));
  }
}
