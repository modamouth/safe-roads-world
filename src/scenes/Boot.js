import Phaser from 'phaser';
import { buildTextures, darken } from '../textures.js';
import { OPTIONAL_ART, PARKED_VEHICLES, optKey, buildWorldTextures, splitVehicles } from '../worldArt.js';

// Photo assets live in /public/assets and are loaded by URL (not embedded),
// so swapping an image is just replacing the file — no rebuild step needed.
const PHOTO_KEYS = {
  suv: 'assets/suv.webp',
  truck: 'assets/truck.webp',
  post: 'assets/post.webp',
  sky: 'assets/sky.webp',
  labcar0: 'assets/labcar0.webp',
  labcar60: 'assets/labcar60.webp',
  labcar80: 'assets/labcar80.webp',
  labcar90: 'assets/labcar90.webp',
  labbg: 'assets/labbg.webp'
};

export default class Boot extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    this.load.setPath(import.meta.env.BASE_URL);
    Object.entries(PHOTO_KEYS).forEach(([key, path]) => this.load.image('img_' + key, path));
    // Optional world-shell art. Never part of the REAL check below: a missing
    // file just means Title/Map use their drawn placeholders.
    Object.entries(OPTIONAL_ART).forEach(([name, path]) => this.load.image(optKey(name), path));
    PARKED_VEHICLES.forEach(v => this.load.image(v.key, v.url));
    // If any image 404s or fails, don't block the boot — REAL just stays false
    // and the game runs on the drawn fallback art.
    this.load.on('loaderror', () => {});
  }

  create() {
    buildTextures(this);

    const allOk = Object.keys(PHOTO_KEYS).every(k => this.textures.exists('img_' + k));
    this.registry.set('REAL', allOk);

    if (allOk) {
      darken(this, 'acacia', 'acacia_sil', '#4A3E2E');
      darken(this, 'bush', 'bush_sil', '#6A5A3C');
      darken(this, 'kudu', 'kudu_sil', '#5A4030');
    }

    buildWorldTextures(this);
    splitVehicles(this);
    this.scene.start('Title');
  }
}
