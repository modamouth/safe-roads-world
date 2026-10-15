import { loadImage } from '../imageAssets.js';
import { assetsForArt } from './assets.js';

// Loader jobs are serialized per scene. Textures already in the shared manager
// are reused, including world-shell art. Failed optional assets are retried on a
// later visit; drawn art remains available for the current screen.
const jobs = new WeakMap();
export function loadLabAssets(scene, spec) {
  const previous = jobs.get(scene) || Promise.resolve();
  const job = previous.then(() => new Promise(resolve => {
    if (!scene.scene.isActive()) { resolve(); return; }
    const missing = assetsForArt(spec).filter(a => !scene.textures.exists(a.key));
    if (!missing.length) { resolve(); return; }
    const finish = () => {
      scene.load.off('complete', finish); scene.load.off('loaderror', failed);
      scene.events.off('shutdown', finish); resolve();
    };
    const failed = file => {
      if (import.meta.env.DEV) console.warn('[Learning Lab] Optional artwork unavailable:', file.key, file.url);
    };
    scene.load.once('complete', finish); scene.load.on('loaderror', failed);
    scene.events.once('shutdown', finish);
    scene.load.setPath(import.meta.env.BASE_URL);
    missing.forEach(a => loadImage(scene, a.key, a.path));
    if (!scene.load.isLoading()) scene.load.start();
  }));
  jobs.set(scene, job);
  return job;
}
