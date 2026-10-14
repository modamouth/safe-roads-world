import { REDUCE_MOTION } from '../../config.js';

/** @typedef {{x:number,y:number,w:number,h:number}} ArtArea */
/** @param {number} width @param {number} height @param {ArtArea} area */
export function containBounds(width, height, area) {
  const scale = Math.min(area.w / width, area.h / height);
  return { x: area.x + (area.w - width * scale) / 2, y: area.y + (area.h - height * scale) / 2, w: width * scale, h: height * scale, scale };
}
export function fitImage(image, area, canvas = { w: image.width, h: image.height }) {
  const bounds = containBounds(canvas.w, canvas.h, area);
  image.setOrigin(0.5).setPosition(area.x + area.w / 2, area.y + area.h / 2).setScale(bounds.scale);
  return bounds;
}

// One source canvas and one origin across a state set; alpha padding remains
// intact. Each image keeps its own aspect ratio. Rapid taps replace the fade.
export function stateImages(scene, parent, keys, area) {
  const available = keys.filter(key => scene.textures.exists(key));
  const images = available.map(key => scene.add.image(0, 0, key).setAlpha(0));
  const canvas = { w: Math.max(...images.map(i => i.width)), h: Math.max(...images.map(i => i.height)) };
  images.forEach(image => { fitImage(image, area, canvas); parent.add(image); });
  let initialized = false;
  return {
    show(key) {
      images.forEach(image => {
        scene.tweens.killTweensOf(image);
        const alpha = image.texture.key === key ? 1 : 0;
        if (REDUCE_MOTION || !initialized) image.setAlpha(alpha);
        else scene.tweens.add({ targets: image, alpha, duration: 220, ease: 'Sine.easeInOut' });
      });
      initialized = true;
    },
    images
  };
}
