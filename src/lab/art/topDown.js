import { LEARNING_LAB_ASSETS } from '../assets.js';

const ART = Object.fromEntries(Object.values(LEARNING_LAB_ASSETS.topDown).map(a => [a.key, a]));

// A small sprite pool keeps animated scenes from creating images per frame.
// Texture frames omit only empty alpha padding; original PNGs stay unchanged.
export class TopDownArt {
  constructor(scene, parent) { this.scene = scene; this.parent = parent; this.images = []; this.index = 0; }
  begin() { this.index = 0; this.images.forEach(image => image.setVisible(false)); }
  draw(key, x, y, w, h, angle = 0) {
    const { scene } = this, spec = ART[key];
    if (!spec || !scene.textures.exists(key)) return false;
    const texture = scene.textures.get(key), [left, top, right, bottom] = spec.bounds;
    if (!texture.has('subject')) texture.add('subject', 0, left, top, right - left, bottom - top);
    let image = this.images[this.index++];
    if (!image) { image = scene.add.image(0, 0, key, 'subject'); this.images.push(image); this.parent.add(image); }
    image.setTexture(key, 'subject').setVisible(true).setOrigin(.5).setPosition(x, y).setAngle(angle);
    image.setScale(Math.min(w / (right - left), h / (bottom - top)));
    return true;
  }
}
