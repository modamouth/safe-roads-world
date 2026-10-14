import { LEARNING_LAB_ASSETS as A } from '../assets.js';

// Shared frames preserve scale; per-pose ground anchors prevent walking jitter.
// Bounds and feet come from the original alpha >= 128 silhouettes, padded by 8 px.
const ALIGNMENT = {
  'older-man': { bounds: [164, 10, 873, 1476], ground: [1468, 1455, 1460] },
  'schoolgirl': { bounds: [213, 7, 863, 1517], ground: [1509, 1504, 1502] },
  'shopper': { bounds: [45, 10, 977, 1516], ground: [1508, 1494, 1502] },
  'teen-phone': { bounds: [186, 8, 871, 1503], ground: [1495, 1469, 1487] },
  'vendor': { bounds: [168, 4, 921, 1520], ground: [1510, 1512, 1508] },
  'worker': { bounds: [212, 18, 859, 1508], ground: [1500, 1497, 1498] }
};
export function pedestrianSet(scene, name) {
  const spec = A.pedestrians[name], alignment = ALIGNMENT[name];
  const assets = [spec.standing, spec.walkA, spec.walkB];
  if (!assets.every(a => scene.textures.exists(a.key))) return null;
  const [left, top, right, bottom] = alignment.bounds;
  return assets.map((asset, i) => {
    const texture = scene.textures.get(asset.key);
    if (!texture.has('pedestrian')) texture.add('pedestrian', 0, left, top, right - left, bottom - top);
    return { key: asset.key, frame: 'pedestrian', originY: (alignment.ground[i] - top) / (bottom - top) };
  });
}
export function setPedestrianPose(image, pose) {
  image.setTexture(pose.key, pose.frame).setOrigin(.5, pose.originY);
}
