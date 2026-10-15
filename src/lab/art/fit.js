import { sourceBounds } from '../../imageAssets.js';
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
export function stateImages(scene, parent, keys, area, bounds) {
  const available = keys.filter(key => scene.textures.exists(key));
  const images = available.map(key => {
    const texture = scene.textures.get(key);
    if (bounds && !texture.has('lab-state')) {
      const [left, top, right, bottom] = sourceBounds(scene, key, bounds);
      texture.add('lab-state', 0, left, top, right - left, bottom - top);
    }
    return scene.add.image(0, 0, key, bounds ? 'lab-state' : undefined).setAlpha(0);
  });
  const canvas = { w: Math.max(...images.map(i => i.width)), h: Math.max(...images.map(i => i.height)) };
  images.forEach(image => { fitImage(image, area, canvas); parent.add(image); });
  let initialized = false;
  let current = null, transition = Promise.resolve(), finish = null;
  return {
    show(key) {
      if (current === key) return transition;
      current = key;
      if (finish) finish();
      transition = new Promise(resolve => { finish = resolve; });
      let remaining = images.length;
      const done = finish;
      images.forEach(image => {
        scene.tweens.killTweensOf(image);
        const alpha = image.texture.key === key ? 1 : 0;
        if (REDUCE_MOTION || !initialized) { image.setAlpha(alpha); if (--remaining === 0) done(); }
        else scene.tweens.add({ targets: image, alpha, duration: 220, ease: 'Sine.easeInOut', onComplete: () => { if (--remaining === 0) done(); } });
      });
      if (!images.length) done();
      initialized = true;
      return transition;
    },
    images
  };
}

// Map normalized original-canvas coordinates through a non-destructive frame.
export function imagePoint(image, x, y) {
  const source = image.texture.getSourceImage(), frame = image.frame;
  return { x: image.x + (x * source.width - frame.cutX - image.width / 2) * image.scaleX,
    y: image.y + (y * source.height - frame.cutY - image.height / 2) * image.scaleY };
}
