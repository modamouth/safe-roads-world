import Phaser from 'phaser';
import { W, H, COLORS as C, FONT } from '../config.js';
import { setupCam, viewBounds, fillView, T, button, soundToggle, iconButton, panel } from '../ui.js';
import { drawIcon } from '../icons.js';
import { zoneById } from '../zones.js';
import { artKey, cover } from '../worldArt.js';
import { Sfx } from '../sfx.js';

// Placeholder for City Safety Run. The mission itself is a separate task.
export default class CityRunStub extends Phaser.Scene {
  constructor() { super('CityRunStub'); }

  create() {
    setupCam(this);
    Sfx.init(this);
    this.cameras.main.fadeIn(250, 8, 17, 30);
    this.leaving = false; // scene instances are reused between visits
    const z = zoneById('windhoek');

    cover(this, artKey(this, 'map_bg'), 0, viewBounds(this));
    fillView(this, 0x05080D, 0.72);
    iconButton(this, 44, 44, 'back', () => this.back()).setDepth(2000);
    soundToggle(this);

    const g = this.add.graphics();
    g.fillStyle(C.navy, 1); g.fillCircle(W / 2, 200, 56);
    g.lineStyle(5, C.yellow, 1); g.strokeCircle(W / 2, 200, 56);
    drawIcon(g, z.icon, W / 2, 200, 58, C.yellow);

    T(this, W / 2, 300, z.label.toUpperCase(), 16, '#5FD0E0', { letterSpacing: 2 });
    T(this, W / 2, 346, z.cta.title, 42, '#FFFFFF');

    panel(this, 40, 404, W - 80, 170, { alpha: 0.92, stroke: 0xFFFFFF, strokeA: 0.1 });
    this.add.text(68, 428, 'Objective', { fontFamily: FONT, fontSize: '16px', color: '#B9C6D6', fontStyle: 'bold', resolution: 2 });
    this.add.text(68, 458, z.blurb, { fontFamily: FONT, fontSize: '24px', color: '#FFFFFF', fontStyle: 'bold', wordWrap: { width: W - 136 }, lineSpacing: 6, resolution: 2 });

    panel(this, 40, 600, W - 80, 104, { alpha: 0.92, stroke: C.teal, strokeA: 0.8 });
    drawIcon(this.add.graphics(), 'info', 82, 652, 30, 0x5FD0E0);
    this.add.text(112, 626, 'Not built yet', { fontFamily: FONT, fontSize: '20px', color: '#FFFFFF', fontStyle: 'bold', resolution: 2 });
    this.add.text(112, 654, 'This mission is in development.', { fontFamily: FONT, fontSize: '17px', color: '#B9C6D6', wordWrap: { width: W - 180 }, resolution: 2 });

    button(this, W / 2, 800, 320, 68, 'Back to map', () => this.back(), { size: 24, fill: C.yellow, fillA: 1, color: '#0B1B2E' });
  }

  back() {
    if (this.leaving) return; this.leaving = true;
    this.cameras.main.fadeOut(220, 8, 17, 30);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Map', { select: 'windhoek' }));
  }
}
