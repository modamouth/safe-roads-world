import { W, H, Z, COLORS as C, FONT } from './config.js';
import { Sfx } from './sfx.js';
import { drawIcon } from './icons.js';

export function setupCam(scene) {
  const cam = scene.cameras.main;
  cam.setZoom(Z);
  cam.centerOn(W / 2, H / 2);
  cam.setBackgroundColor('#0B1B2E');
}

export function T(scene, x, y, str, size, color, opts) {
  const o = Object.assign({ fontFamily: FONT, fontSize: size + 'px', color: color || '#FFFFFF', fontStyle: 'bold', resolution: 2 }, opts || {});
  return scene.add.text(x, y, str, o).setOrigin(0.5);
}

export function button(scene, x, y, w, h, label, cb, o) {
  o = o || {};
  const r = o.r != null ? o.r : 16;
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  const t = T(scene, 0, 0, label, o.size || 26, o.color || '#FFFFFF');
  // o.hitW / o.hitH enlarge the tap area beyond the drawn shape (min 44 px tall by default).
  const zone = scene.add.zone(0, 0, Math.max(w, o.hitW || 0), Math.max(h, o.hitH || 0, 44)).setInteractive({ useHandCursor: true });
  c.add([g, t, zone]);
  c.enabled = true; c.active = false; c.hi = false;
  c.redraw = function (pressed) {
    g.clear();
    let fill = o.fill != null ? o.fill : 0xFFFFFF, a = o.fillA != null ? o.fillA : 0.14, col = o.color || '#FFFFFF';
    if (c.active) { fill = C.yellow; a = 1; col = '#0B1B2E'; }
    else if (!c.enabled) { fill = 0xFFFFFF; a = 0.07; col = '#7F8FA3'; }
    else if (c.hi) { a = Math.min(1, a + 0.12); }
    g.fillStyle(fill, a);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, r);
    if (o.stroke != null) { g.lineStyle(2, o.stroke, c.enabled ? 1 : 0.4); g.strokeRoundedRect(-w / 2, -h / 2, w, h, r); }
    t.setColor(col);
    c.setScale(pressed ? 0.97 : 1);
  };
  zone.on('pointerover', () => { c.hi = true; c.redraw(); });
  zone.on('pointerout', () => { c.hi = false; c.redraw(); });
  zone.on('pointerdown', () => { if (c.enabled) c.redraw(true); });
  zone.on('pointerup', () => { c.redraw(); if (c.enabled) { Sfx.init(scene); Sfx.click(); if (cb) cb(); } });
  c.setLabel = s => t.setText(s);
  c.setEnabled = v => { c.enabled = v; c.redraw(); };
  c.setActive = v => { c.active = v; c.redraw(); };
  c.redraw();
  return c;
}

export function soundToggle(scene) {
  const b = button(scene, W - 74, 44, 116, 40, Sfx.muted ? 'Sound off' : 'Sound on', () => {
    Sfx.setMuted(!Sfx.muted);
    b.setLabel(Sfx.muted ? 'Sound off' : 'Sound on');
  }, { size: 16, fillA: 0.12, color: '#DDE6F0', r: 20, hitH: 66 });
  b.setDepth(2000);
  return b;
}

/** Round icon-only button (e.g. back arrow). Tap area is 66 x 66 design px. */
export function iconButton(scene, x, y, name, cb, o) {
  o = o || {};
  const r = o.r || 24;
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  const zone = scene.add.zone(0, 0, 66, 66).setInteractive({ useHandCursor: true });
  c.add([g, zone]);
  const draw = hi => {
    g.clear();
    g.fillStyle(0xFFFFFF, hi ? 0.24 : 0.12); g.fillCircle(0, 0, r);
    drawIcon(g, name, 0, 0, r * 0.95, o.color != null ? o.color : 0xFFFFFF);
  };
  zone.on('pointerover', () => draw(true));
  zone.on('pointerout', () => draw(false));
  zone.on('pointerup', () => { Sfx.init(scene); Sfx.click(); if (cb) cb(); });
  draw(false);
  return c;
}

/** Dark rounded panel for text over busy backgrounds. */
export function panel(scene, x, y, w, h, o) {
  o = o || {};
  const g = scene.add.graphics();
  g.fillStyle(o.fill != null ? o.fill : C.navy, o.alpha != null ? o.alpha : 0.9);
  g.fillRoundedRect(x, y, w, h, o.r != null ? o.r : 20);
  if (o.stroke != null) { g.lineStyle(2, o.stroke, o.strokeA != null ? o.strokeA : 1); g.strokeRoundedRect(x, y, w, h, o.r != null ? o.r : 20); }
  return g;
}

/** Short message pill that fades out by itself. One at a time per scene. */
export function toast(scene, str, y) {
  if (scene._toast) { scene.tweens.killTweensOf(scene._toast); scene._toast.destroy(); }
  const c = scene.add.container(W / 2, y).setDepth(3000).setAlpha(0);
  const t = scene.add.text(0, 0, str, {
    fontFamily: FONT, fontSize: '19px', color: '#FFFFFF', fontStyle: 'bold', align: 'center',
    wordWrap: { width: 400 }, resolution: 2
  }).setOrigin(0.5);
  const w = t.width + 48, h = Math.max(52, t.height + 28);
  const g = scene.add.graphics();
  g.fillStyle(0x05080D, 0.94); g.fillRoundedRect(-w / 2, -h / 2, w, h, 22);
  g.lineStyle(2, C.teal, 0.9); g.strokeRoundedRect(-w / 2, -h / 2, w, h, 22);
  c.add([g, t]);
  scene._toast = c;
  scene.tweens.add({ targets: c, alpha: 1, duration: 160 });
  scene.tweens.add({ targets: c, alpha: 0, delay: 1800, duration: 260, onComplete: () => { c.destroy(); if (scene._toast === c) scene._toast = null; } });
  return c;
}

export function brand(scene) {
  scene.add.text(28, 44, 'Safe Roads World', { fontFamily: FONT, fontSize: '18px', color: '#B9C6D6', fontStyle: 'bold', resolution: 2 })
    .setOrigin(0, 0.5).setDepth(2000);
}

export function makeCaption(scene, y, depth) {
  const bg = scene.add.graphics().setDepth(depth).setAlpha(0);
  const tx = scene.add.text(W / 2, y, '', {
    fontFamily: FONT, fontSize: '25px', color: '#FFFFFF', fontStyle: 'bold', align: 'center',
    wordWrap: { width: 380 }, lineSpacing: 6, resolution: 2
  }).setOrigin(0.5).setDepth(depth + 1).setAlpha(0);
  return {
    set(str) {
      tx.setText(str);
      const w = Math.max(300, tx.width + 64), h = tx.height + 40;
      bg.clear();
      bg.fillStyle(C.navy, 0.8);
      bg.fillRoundedRect(W / 2 - w / 2, y - h / 2, w, h, 18);
      bg.fillStyle(C.yellow, 1);
      bg.fillRoundedRect(W / 2 - w / 2, y - h / 2 + 12, 5, h - 24, 3);
      scene.tweens.add({ targets: [bg, tx], alpha: 1, duration: 220 });
    },
    hide() { scene.tweens.add({ targets: [bg, tx], alpha: 0, duration: 160 }); }
  };
}

export function pop(scene, x, y, size, alpha) {
  const g = scene.add.image(x, y, 'glow').setBlendMode(Phaser.BlendModes.ADD).setScale(0.2).setAlpha(alpha || 1).setDepth(950);
  scene.tweens.add({ targets: g, scale: size, alpha: 0, duration: 420, ease: 'Cubic.easeOut', onComplete: () => g.destroy() });
}

/** Manual-physics debris burst (keeps dependencies to zero, no particle-API version drift). */
export class Debris {
  constructor(scene, depth) { this.s = scene; this.d = depth; this.list = []; }
  burst(x, y, n, power, dir, spread) {
    const cols = [0xFFFFFF, 0xC9D2DD, 0x9EDCF0, 0xE5484D, 0xFFCB2B, 0x8892A3];
    for (let i = 0; i < n; i++) {
      const im = this.s.add.image(x, y, Math.random() < 0.5 ? 'dot' : 'shard').setDepth(this.d);
      im.setTint(cols[Math.floor(Math.random() * cols.length)]);
      im.setScale(0.5 + Math.random() * 1.1);
      const a = dir + (Math.random() - 0.5) * spread, sp = power * (0.35 + Math.random() * 0.9);
      this.list.push({ im, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, rot: (Math.random() - 0.5) * 12, life: 0.9 + Math.random() * 0.9, age: 0 });
    }
  }
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.age += dt; p.vy += 900 * dt;
      p.im.x += p.vx * dt; p.im.y += p.vy * dt; p.im.rotation += p.rot * dt;
      p.im.setAlpha(Math.max(0, Math.min(1, 1 - (p.age / p.life))));
      if (p.age >= p.life) { p.im.destroy(); this.list.splice(i, 1); }
    }
  }
}
