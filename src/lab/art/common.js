// Shared helpers for illustration modules.
import { FONT } from '../../config.js';
import { QUALITY } from '../../quality.js';

/** Clip a container to a rounded rectangle; returns the mask graphics (destroy it with the art). */
export function clipTo(scene, target, a, r) {
  const m = scene.make.graphics({ x: 0, y: 0, add: false });
  m.fillStyle(0xFFFFFF, 1); m.fillRoundedRect(a.x, a.y, a.w, a.h, r == null ? 18 : r);
  target.setMask(m.createGeometryMask());
  return m;
}

/** Small label text used inside illustrations. */
export function label(scene, x, y, str, size, color, o) {
  return scene.add.text(x, y, str, Object.assign({
    fontFamily: FONT, fontSize: (size || 14) + 'px', color: color || '#FFFFFF', fontStyle: 'bold', resolution: QUALITY.textRes
  }, o || {})).setOrigin(0.5);
}

/** Pill-shaped tag with text, drawn into graphics + text; returns the text object. */
export function tag(scene, parent, x, y, str, o) {
  o = o || {};
  const t = label(scene, x, y, str, o.size || 14, o.color || '#FFFFFF');
  const w = t.width + 18, h = t.height + 8, g = scene.add.graphics();
  g.fillStyle(o.fill != null ? o.fill : 0x05080D, o.alpha != null ? o.alpha : 0.85);
  g.fillRoundedRect(x - w / 2, y - h / 2, w, h, h / 2);
  if (o.stroke != null) { g.lineStyle(2, o.stroke, 1); g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, h / 2); }
  parent.add([g, t]);
  return t;
}

/** Hex colour string ('#RRGGBB') or number -> number. */
export const col = (v, d) => (typeof v === 'number' ? v : typeof v === 'string' ? parseInt(v.replace('#', ''), 16) : d);

/** Tween a numeric property on a plain object; resolves when done (instant with reduced motion). */
export function tweenTo(scene, obj, props, ms, reduce) {
  return new Promise(res => {
    if (reduce || !ms) { Object.assign(obj, props); res(); return; }
    scene.tweens.killTweensOf(obj);   // a newer tween replaces one still running
    scene.tweens.add({ targets: obj, ...props, duration: ms, ease: 'Sine.easeInOut', onComplete: () => res() });
  });
}

export const wait = (scene, ms) => new Promise(res => scene.time.delayedCall(ms, res));
