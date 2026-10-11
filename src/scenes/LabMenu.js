import Phaser from 'phaser';
import { W, H, COLORS as C, FONT, state, track } from '../config.js';
import { setupCam, T, button, soundToggle, iconButton, toast } from '../ui.js';
import { drawIcon } from '../icons.js';
import { zoneById } from '../zones.js';
import { EXPERIENCES } from '../experiences.js';
import { Sfx } from '../sfx.js';

const COLS = 2, MX = 28, GAP = 12, TILE_H = 104, GRID_Y = 176;

// Learning Lab menu: a grid of every entry in experiences.js.
export default class LabMenu extends Phaser.Scene {
  constructor() { super('LabMenu'); }

  create() {
    setupCam(this);
    Sfx.init(this);
    this.cameras.main.fadeIn(250, 8, 17, 30);
    this.leaving = false; this._toast = null; // scene instances are reused between visits
    const z = zoneById('lab');

    this.add.image(0, 0, 'bgdusk').setOrigin(0);
    this.add.image(0, 0, 'vig').setOrigin(0).setDisplaySize(W, H);
    iconButton(this, 44, 44, 'back', () => { track('map_nav', { from: 'lab', to: 'map' }); this.go('Map', { select: 'lab' }); }).setDepth(2000);
    soundToggle(this);

    T(this, W / 2, 106, z.label, 30, '#FFFFFF');
    T(this, W / 2, 146, 'Pick an experience to explore', 19, '#B9C6D6', { fontStyle: 'normal' });

    const tw = (W - MX * 2 - GAP * (COLS - 1)) / COLS;
    EXPERIENCES.forEach((e, i) => this.tile(e, MX + (i % COLS) * (tw + GAP), GRID_Y + Math.floor(i / COLS) * (TILE_H + GAP), tw, TILE_H));

    const rows = Math.ceil(EXPERIENCES.length / COLS);
    const by = Math.min(H - 40, GRID_Y + rows * (TILE_H + GAP) + 34);
    button(this, W / 2, by, 280, 54, 'My Passport', () => this.go('Passport'), { size: 20, stroke: 0xFFFFFF, hitH: 66 });
  }

  tile(e, x, y, w, h) {
    const open = e.status === 'playable', done = !!state.completed[e.id];
    const g = this.add.graphics();
    const draw = hi => {
      g.clear();
      g.fillStyle(open ? C.navy2 : 0xFFFFFF, open ? (hi ? 1 : 0.94) : (hi ? 0.12 : 0.07));
      g.fillRoundedRect(x, y, w, h, 18);
      if (open) { g.lineStyle(2, C.yellow, hi ? 1 : 0.85); g.strokeRoundedRect(x, y, w, h, 18); }
      drawIcon(g, e.icon, x + w / 2, y + 34, 46, open ? C.yellow : 0xFFFFFF, open ? 1 : 0.45);
      if (!open) {
        const lx = x + w - 22, ly = y + 20;
        g.fillStyle(C.navy, 0.9); g.fillCircle(lx, ly, 12);
        drawIcon(g, 'lock', lx, ly + 1, 12, 0xB9C6D6);
      }
    };
    draw(false);
    T(this, x + w / 2, y + 70, e.label, 18, open ? '#FFFFFF' : '#C9D3DF');
    const sub = open ? (done ? '✓ Done' : e.minutes + ' min  ·  Play') : 'Coming soon';
    T(this, x + w / 2, y + 91, sub, 14, open ? '#FFCB2B' : '#8A97A8', { fontStyle: open ? 'bold' : 'normal' });

    const hit = this.add.zone(x + w / 2, y + h / 2, w, h).setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => draw(true));
    hit.on('pointerout', () => draw(false));
    hit.on('pointerup', () => {
      Sfx.init(this); Sfx.click();
      track('experience_select', { id: e.id, status: e.status });
      if (!open) { toast(this, e.label + ': coming soon', H - 120); return; }
      track('experience_start', { id: e.id });
      e.reset();
      this.go(e.scene);
    });
  }

  go(key, data) {
    if (this.leaving) return; this.leaving = true;
    this.cameras.main.fadeOut(220, 8, 17, 30);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(key, data));
  }
}
