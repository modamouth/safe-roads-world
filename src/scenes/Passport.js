import Phaser from 'phaser';
import { W, H, COLORS as C, DATA, state, track } from '../config.js';
import { setupCam, T, button, brand, soundToggle } from '../ui.js';
import { experienceById } from '../experiences.js';
import { Sfx } from '../sfx.js';

export default class Passport extends Phaser.Scene {
  constructor() { super('Passport'); }

  create() {
    setupCam(this);
    Sfx.init(this);
    // Arriving here with every speed tried means the Speed experience was just finished.
    if (DATA.speeds.every(v => state.tried[v])) state.completed.speed = true;
    const done = !!state.completed.speed;
    track('passport_view', { done });
    this.cameras.main.fadeIn(250, 8, 17, 30);
    this.add.image(0, 0, 'bgdusk').setOrigin(0);
    this.add.image(0, 0, 'vig').setOrigin(0).setDisplaySize(W, H);
    brand(this); soundToggle(this);

    T(this, W / 2, 112, done ? 'Speed check complete' : 'Your Passport', 38, '#FFFFFF');

    const badge = this.add.container(W / 2, 258);
    const g = this.add.graphics();
    const shield = (s, col, a) => {
      g.fillStyle(col, a == null ? 1 : a);
      g.fillPoints([{ x: -70 * s, y: -80 * s }, { x: 70 * s, y: -80 * s }, { x: 70 * s, y: 10 * s }, { x: 0, y: 92 * s }, { x: -70 * s, y: 10 * s }], true);
    };
    if (done) {
      shield(1, C.yellow); shield(0.84, C.navy);
      g.lineStyle(8, C.yellow, 1); g.beginPath(); g.arc(0, 12, 38, Math.PI, Math.PI * 2); g.strokePath();
      g.lineStyle(6, 0xFFFFFF, 1); g.lineBetween(0, 12, 24, -14);
      g.fillStyle(0xFFFFFF, 1); g.fillCircle(0, 12, 7);
      g.lineStyle(4, C.red, 1); g.lineBetween(30, -2, 36, -8);
      badge.add(g); badge.setScale(0.2).setAlpha(0);
      this.tweens.add({ targets: badge, scale: 1, alpha: 1, duration: 600, ease: 'Back.easeOut', delay: 200, onStart: () => Sfx.chime(true) });
    } else {
      shield(1, 0xFFFFFF, 0.12); shield(0.84, C.navy, 1);
      badge.add([g, T(this, 0, 0, '?', 56, '#7F8FA3')]);
    }

    T(this, W / 2, 378, done ? 'You earned a badge for your Passport.' : 'Finish a Learning Lab experience to earn your first badge.', 22, '#E6EDF5',
      { fontStyle: 'normal', wordWrap: { width: 440 }, align: 'center' });

    const speed = experienceById('speed');
    const tiles = [
      { n: 'Learning Lab', s: done ? '✓ ' + speed.title : speed.title + ': not yet', st: done ? 'done' : 'next', x: 160 },
      { n: 'Windhoek City', s: 'Coming soon', st: 'lock', x: 380 }
    ];
    tiles.forEach(t => {
      const y = 476, tg = this.add.graphics();
      tg.fillStyle(0xFFFFFF, t.st === 'lock' ? 0.05 : 0.1); tg.fillRoundedRect(t.x - 100, y - 40, 200, 80, 16);
      if (t.st === 'done') { tg.lineStyle(2, C.yellow, 1); tg.strokeRoundedRect(t.x - 100, y - 40, 200, 80, 16); }
      if (t.st === 'next') { tg.lineStyle(2, C.teal, 1); tg.strokeRoundedRect(t.x - 100, y - 40, 200, 80, 16); }
      T(this, t.x, y - 10, t.n, 20, t.st === 'lock' ? '#7F8FA3' : '#FFFFFF');
      T(this, t.x, y + 16, t.s, 15, t.st === 'done' ? '#FFCB2B' : t.st === 'next' ? '#5FD0E0' : '#7F8FA3', { fontStyle: 'normal' });
    });

    this.toast = T(this, W / 2, 572, '', 16, '#B9C6D6', { fontStyle: 'normal', wordWrap: { width: 440 }, align: 'center' }).setAlpha(0);
    const primary = { size: 22, fill: C.yellow, fillA: 1, color: '#0B1B2E' };
    const outline = { size: 22, stroke: 0xFFFFFF, hitH: 66 };
    if (done) {
      button(this, W / 2, 650, 380, 68, 'Save my Passport on WhatsApp', () => {
        track('save_click');
        this.toast.setText('Prototype only. In the pilot this opens the WhatsApp save flow.');
        this.tweens.add({ targets: this.toast, alpha: 1, duration: 200 });
      }, primary);
      button(this, W / 2, 734, 380, 64, 'Play again', () => {
        track('replay');
        speed.reset();
        this.scene.start(speed.scene);
      }, outline);
    } else {
      button(this, W / 2, 650, 380, 68, 'Go to the Learning Lab', () => this.scene.start('LabMenu'), primary);
    }
    button(this, 150, 822, 230, 64, 'Back to Lab', () => this.scene.start('LabMenu'), { size: 20, stroke: 0xFFFFFF, hitH: 66 });
    button(this, 390, 822, 230, 64, 'Mission Map', () => { track('map_nav', { from: 'passport', to: 'map' }); this.scene.start('Map'); },
      { size: 20, stroke: 0xFFFFFF, hitH: 66 });
    T(this, W / 2, 922, 'Prototype. Progress is not saved yet.', 14, '#7F8FA3', { fontStyle: 'normal' });
  }
}
