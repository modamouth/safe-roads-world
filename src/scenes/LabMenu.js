import Phaser from 'phaser';
import { W, H, COLORS as C, track } from '../config.js';
import { setupCam, duskBg, T, button, soundToggle, iconButton, toast } from '../ui.js';
import { drawIcon } from '../icons.js';
import { mirror, describe } from '../a11y.js';
import { zoneById } from '../zones.js';
import { EXPERIENCES, experienceProgress, labProgress } from '../experiences.js';
import { t } from '../lab/content.js';
import { Sfx } from '../sfx.js';

const COLS = 2, MX = 28, GAP = 10, TILE_H = 102, GRID_Y = 196;

// Learning Lab menu: a grid of every experience, with progress. Tiles open
// the experience in the Lab engine (LabRunner).
export default class LabMenu extends Phaser.Scene {
  constructor() { super('LabMenu'); }

  create() {
    setupCam(this);
    Sfx.init(this);
    this.cameras.main.fadeIn(250, 8, 17, 30);
    this.leaving = false; this._toast = null; // scene instances are reused between visits
    const z = zoneById('lab');

    duskBg(this);
    iconButton(this, 44, 44, 'back', () => { track('map_nav', { from: 'lab', to: 'map' }); this.go('Map', { select: 'lab' }); }).setDepth(2000);
    soundToggle(this);

    const lp = labProgress();
    T(this, W / 2, 106, z.label, 30, '#FFFFFF');
    T(this, W / 2, 144, t('menu.subtitle'), 19, '#B9C6D6', { fontStyle: 'normal' });
    T(this, W / 2, 172, t('menu.labProgress', { n: lp.done, of: lp.of }), 15, '#FFCB2B');
    describe(z.label, [t('menu.subtitle'), t('menu.labProgress', { n: lp.done, of: lp.of })]);

    const tw = (W - MX * 2 - GAP * (COLS - 1)) / COLS;
    EXPERIENCES.forEach((e, i) => this.tile(e, MX + (i % COLS) * (tw + GAP), GRID_Y + Math.floor(i / COLS) * (TILE_H + GAP), tw, TILE_H));

    const rows = Math.ceil(EXPERIENCES.length / COLS);
    const by = Math.min(H - 34, GRID_Y + rows * (TILE_H + GAP) + 30);
    button(this, W / 2, by, 280, 52, t('menu.passport'), () => this.go('Passport'), { size: 20, stroke: 0xFFFFFF, hitH: 60 });
  }

  tile(e, x, y, w, h) {
    const open = e.status === 'playable', pr = experienceProgress(e), done = pr.complete;
    const g = this.add.graphics();
    let focused = false;
    const draw = hi => {
      g.clear();
      g.fillStyle(open ? C.navy2 : 0xFFFFFF, open ? (hi ? 1 : 0.94) : (hi ? 0.12 : 0.07));
      g.fillRoundedRect(x, y, w, h, 18);
      if (open) { g.lineStyle(2, done ? 0x4ED18A : C.yellow, hi ? 1 : 0.85); g.strokeRoundedRect(x, y, w, h, 18); }
      drawIcon(g, e.icon, x + w / 2, y + 32, 44, open ? C.yellow : 0xFFFFFF, open ? 1 : 0.45);
      if (!open) {
        const lx = x + w - 22, ly = y + 20;
        g.fillStyle(C.navy, 0.9); g.fillCircle(lx, ly, 12);
        drawIcon(g, 'lock', lx, ly + 1, 12, 0xB9C6D6);
      }
      if (focused) { g.lineStyle(3, 0xFFFFFF, 1); g.strokeRoundedRect(x - 5, y - 5, w + 10, h + 10, 22); }
    };
    draw(false);
    T(this, x + w / 2, y + 68, e.label, 18, open ? '#FFFFFF' : '#C9D3DF');
    const sub = !open ? t('menu.comingSoon') : done ? t('menu.done')
      : pr.done ? t('menu.progress', { n: pr.done, of: pr.of }) : t('menu.minutes', { n: e.minutes }) + '  ·  ' + t('menu.play');
    T(this, x + w / 2, y + 89, sub, 14, done ? '#4ED18A' : open ? '#FFCB2B' : '#8A97A8', { fontStyle: open ? 'bold' : 'normal' });

    const hit = this.add.zone(x + w / 2, y + h / 2, w, h).setInteractive({ useHandCursor: true });
    const act = () => {
      Sfx.init(this); Sfx.click();
      track('experience_select', { id: e.id, status: e.status });
      if (!open) { toast(this, e.label + ': ' + t('menu.comingSoon').toLowerCase(), H - 120); return; }
      this.go('LabRunner', { slug: e.id });
    };
    hit.on('pointerover', () => draw(true));
    hit.on('pointerout', () => draw(false));
    hit.on('pointerup', act);
    mirror(hit, e.label + ', ' + sub, act, { onFocus: v => { focused = v; draw(false); } });
  }

  go(key, data) {
    if (this.leaving) return; this.leaving = true;
    this.cameras.main.fadeOut(220, 8, 17, 30);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(key, data));
  }
}
