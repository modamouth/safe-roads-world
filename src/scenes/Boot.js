import Phaser from 'phaser';
import { buildTextures } from '../textures.js';
import { OPTIONAL_ART, PARKED_VEHICLES, optKey, buildWorldTextures } from '../worldArt.js';
import { state } from '../config.js';
import { labPoints } from '../lab/analytics.js';
import { EXPERIENCES, experienceProgress } from '../experiences.js';

// Photo assets live in /public/assets and are loaded by URL (not embedded),
// so swapping an image is just replacing the file — no rebuild step needed.
const PHOTO_KEYS = {
  suv: 'assets/suv.webp',
  sky: 'assets/sky.webp'
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


    buildWorldTextures(this);
    // Progress saved on this device (Learning Lab stamps) feeds the Map's points and completion.
    state.points = labPoints();
    EXPERIENCES.forEach(e => { state.completed[e.id] = experienceProgress(e).complete; });
    this.scene.start('Title');
  }
}
