import assets from './generated/image-assets.json';

const sources = new WeakMap();
export const imageURL = path => assets[path]?.url || path;

// Keys remain stable; retain source geometry for calibrated sprite frames.
export function loadImage(scene, key, path) {
  let registry = sources.get(scene.textures);
  if (!registry) { registry = new Map(); sources.set(scene.textures, registry); }
  registry.set(key, path);
  scene.load.image(key, imageURL(path));
}
export function sourceScale(scene, key) {
  const metadata = assets[sources.get(scene.textures)?.get(key)];
  if (!metadata) return { x: 1, y: 1 };
  const bitmap = scene.textures.get(key).getSourceImage();
  return { x: bitmap.width / metadata.width, y: bitmap.height / metadata.height };
}
export function sourceBounds(scene, key, bounds) {
  const scale = sourceScale(scene, key);
  return [Math.floor(bounds[0] * scale.x), Math.floor(bounds[1] * scale.y),
    Math.ceil(bounds[2] * scale.x), Math.ceil(bounds[3] * scale.y)];
}
