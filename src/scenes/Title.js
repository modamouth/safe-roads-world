import Phaser from 'phaser';
import { W, H, COLORS as C, FONT, track, REDUCE_MOTION } from '../config.js';
import { setupCam, viewBounds, T, button, soundToggle, panel } from '../ui.js';
import { artKey, cover, hero } from '../worldArt.js';
import { Sfx } from '../sfx.js';

const STEPS = [
  ['Pick a mission', 'Choose a zone on the Mission Map, or visit the Learning Lab.'],
  ['Make the safe choice', 'Watch the road, manage your speed and stay focused.'],
  ['Review and earn progress', 'See what you got right and add it to your Passport.']
];

export default class Title extends Phaser.Scene {
  constructor() { super('Title'); }

  create() {
    setupCam(this);
    Sfx.init(this);
    this.leaving = false; this.overlay = null; // scene instances are reused between visits
    this.cameras.main.fadeIn(300, 8, 17, 30);

    // Until a clean title_bg exists, reuse the map painting (same art style).
    const v = viewBounds(this);
    cover(this, artKey(this, ['title_bg', 'map_bg']), 0, v);
    this.add.image(v.left, v.top, 'scrim_v').setOrigin(0).setDisplaySize(v.width, v.height).setDepth(1);
    soundToggle(this);
    this.logo();

    const h = hero(this, 'hero_passport', 212, 806, 520, 5);
    if (!REDUCE_MOTION) { h.setAlpha(0); this.tweens.add({ targets: h, alpha: 1, duration: 500, delay: 150 }); }

    button(this, W / 2, 836, 400, 74, 'Start Journey  \u203A', () => this.start(),
      { size: 30, fill: C.yellow, fillA: 1, color: '#0B1B2E', r: 37 }).setDepth(20);
    button(this, W / 2, 904, 230, 52, 'How to play', () => this.howTo(),
      { size: 18, fill: C.navy, fillA: 0.92, stroke: 0x4FC3F7, r: 26, hitH: 66 }).setDepth(20);
    T(this, W / 2, 946, 'Prototype', 12, '#7F8FA3', { fontStyle: 'normal' }).setDepth(20);
  }

  /** Text logo styled after the Title reference: PromoPlays strip, two-tone wordmark, tagline strip. */
  logo() {
    const d = 10, ink = '#0B1B2E';
    const strip = (y, w, h, a) => panel(this, W / 2 - w / 2, y - h / 2, w, h, { fill: C.navy, alpha: a, r: h / 2 }).setDepth(d);
    const shadow = { offsetX: 0, offsetY: 5, color: '#05080D', blur: 6, fill: true, stroke: true };

    strip(50, 176, 32, 0.92);
    T(this, W / 2, 50, 'PROMOPLAYS', 15, '#FFFFFF', { letterSpacing: 3 }).setDepth(d + 1);
    T(this, W / 2, 120, 'SAFE ROADS', 60, '#FFC233', { stroke: ink, strokeThickness: 12, shadow, letterSpacing: 1 }).setDepth(d + 1);
    T(this, W / 2, 182, 'WORLD', 68, '#4FC3F7', { stroke: ink, strokeThickness: 12, shadow, letterSpacing: 4 }).setDepth(d + 1);
    strip(234, 330, 34, 0.9);
    T(this, W / 2, 234, 'EVERY JOURNEY IS A MISSION', 16, '#FFFFFF', { letterSpacing: 1 }).setDepth(d + 1);
  }

  start() {
    if (this.leaving) return; this.leaving = true;
    track('world_start');
    this.cameras.main.fadeOut(250, 8, 17, 30);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Map'));
  }

  howTo() {
    if (this.overlay) return;
    const o = this.add.container(0, 0).setDepth(4000);
    // Full-screen blocker: swallows taps so buttons underneath can't fire.
    const v = viewBounds(this);
    const block = this.add.zone(W / 2, H / 2, v.width, v.height).setInteractive();
    const dim = this.add.rectangle(W / 2, H / 2, v.width, v.height, 0x05080D, 0.78);
    o.add([dim, block, panel(this, 32, 120, W - 64, 720, { alpha: 0.97, stroke: 0xFFFFFF, strokeA: 0.12 })]);

    o.add(hero(this, ['hero_wave', 'hero_passport'], W / 2, 330, 190, 0));
    o.add(T(this, W / 2, 372, 'How to play', 32, '#FFFFFF'));

    STEPS.forEach(([head, body], i) => {
      const y = 448 + i * 100;
      const g = this.add.graphics();
      g.fillStyle(C.yellow, 1); g.fillCircle(84, y, 22);
      o.add([g, T(this, 84, y, String(i + 1), 22, '#0B1B2E')]);
      o.add(this.add.text(122, y - 22, head, { fontFamily: FONT, fontSize: '21px', color: '#FFFFFF', fontStyle: 'bold', resolution: 2 }));
      o.add(this.add.text(122, y + 6, body, { fontFamily: FONT, fontSize: '17px', color: '#B9C6D6', wordWrap: { width: 360 }, lineSpacing: 3, resolution: 2 }));
    });

    o.add(button(this, W / 2, 768, 260, 64, 'Got it', () => { o.destroy(); this.overlay = null; }, { size: 24, fill: C.yellow, fillA: 1, color: '#0B1B2E' }));
    this.overlay = o;
    if (!REDUCE_MOTION) { o.setAlpha(0); this.tweens.add({ targets: o, alpha: 1, duration: 180 }); }
  }
}
