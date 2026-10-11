import Phaser from 'phaser';
import { W, H, COLORS as C, FONT, state, track, REDUCE_MOTION } from '../config.js';
import { setupCam, T, button, soundToggle, iconButton, panel, toast } from '../ui.js';
import { drawIcon } from '../icons.js';
import { MAP_ZONES, zoneById } from '../zones.js';
import { EXPERIENCES } from '../experiences.js';
import { artKey, cover, optKey } from '../worldArt.js';
import { Sfx } from '../sfx.js';

const TOP_H = 88;            // top bar height
const NAV_Y = 880;           // top edge of the bottom nav
const CARD_BOTTOM = NAV_Y - 10;
const NAV = [
  { id: 'map', label: 'Map', icon: 'map' },
  { id: 'lab', label: 'Lab', icon: 'lab' },
  { id: 'passport', label: 'Passport', icon: 'passport' },
  { id: 'badges', label: 'Badges', icon: 'badge' }
];

const px = z => ({ x: z.x * W, y: z.y * H });

// Class is MapScene (not Map) so it doesn't shadow the built-in Map; scene key stays 'Map'.
export default class MapScene extends Phaser.Scene {
  constructor() { super('Map'); }

  create(data) {
    setupCam(this);
    Sfx.init(this);
    this.cameras.main.fadeIn(250, 8, 17, 30);
    this.card = null; this.selected = null; this._toast = null; this.leaving = false; // instances are reused between visits

    cover(this, artKey(this, 'map_bg'), 0);
    // Real map art has its own painted road; only the drawn placeholder needs ours.
    if (!this.textures.exists(optKey('map_bg'))) this.drawPath();
    this.nodes = {};
    MAP_ZONES.forEach(z => { this.nodes[z.id] = this.makeNode(z); });
    this.topBar();
    this.bottomNav();
    this.select((data && data.select) || 'windhoek', false);
  }

  // --- road linking the nodes, in registry order ---------------------------
  drawPath() {
    const road = this.add.graphics().setDepth(10), dots = this.add.graphics().setDepth(11);
    for (let i = 1; i < MAP_ZONES.length; i++) {
      const a = px(MAP_ZONES[i - 1]), b = px(MAP_ZONES[i]);
      const lit = MAP_ZONES[i - 1].status === 'playable' && MAP_ZONES[i].status === 'playable';
      const nx = -(b.y - a.y), ny = b.x - a.x, len = Math.hypot(nx, ny) || 1, bend = (i % 2 ? 1 : -1) * 34;
      const curve = new Phaser.Curves.QuadraticBezier(
        new Phaser.Math.Vector2(a.x, a.y),
        new Phaser.Math.Vector2((a.x + b.x) / 2 + nx / len * bend, (a.y + b.y) / 2 + ny / len * bend),
        new Phaser.Math.Vector2(b.x, b.y)
      );
      road.lineStyle(16, 0x2B2A2E, lit ? 0.75 : 0.45);
      curve.draw(road, 48);
      const pts = curve.getSpacedPoints(Math.max(4, Math.round(curve.getLength() / 15)));
      dots.fillStyle(lit ? C.yellow : 0xFFFFFF, lit ? 1 : 0.5);
      pts.forEach((p, k) => { if (k > 0 && k < pts.length - 1) dots.fillCircle(p.x, p.y, 2.6); });
    }
  }

  // --- zone nodes ----------------------------------------------------------
  makeNode(z) {
    const { x, y } = px(z), playable = z.status === 'playable', r = playable ? 32 : 26;
    const c = this.add.container(x, y).setDepth(100);
    const halo = this.add.graphics();
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.35); g.fillEllipse(0, r * 0.95, r * 1.9, r * 0.45);
    if (playable) {
      g.fillStyle(C.navy, 0.96); g.fillCircle(0, 0, r);
      g.lineStyle(4, C.yellow, 1); g.strokeCircle(0, 0, r);
      drawIcon(g, z.icon, 0, 0, r * 1.05, C.yellow);
    } else {
      g.fillStyle(0x1C2B3D, 0.88); g.fillCircle(0, 0, r);
      g.lineStyle(2, 0x9AA6B5, 0.55); g.strokeCircle(0, 0, r);
      drawIcon(g, z.icon, 0, 0, r * 0.95, 0x9AA6B5, 0.5);
      const lx = r * 0.74, ly = r * 0.74;
      g.fillStyle(C.navy, 1); g.fillCircle(lx, ly, 12);
      g.lineStyle(2, 0x9AA6B5, 0.9); g.strokeCircle(lx, ly, 12);
      drawIcon(g, 'lock', lx, ly + 1, 13, 0xDDE6F0);
    }
    c.add([halo, g]);
    c.add(this.nodeLabel(z, r, playable));

    const hit = this.add.zone(0, 0, 76, 76).setInteractive({ useHandCursor: true });
    hit.on('pointerup', () => { Sfx.init(this); Sfx.click(); this.select(z.id, true); });
    c.add(hit);
    return { c, halo, r, z };
  }

  nodeLabel(z, r, playable) {
    const name = this.add.text(0, 0, z.label, { fontFamily: FONT, fontSize: playable ? '18px' : '16px', color: playable ? '#FFFFFF' : '#C9D3DF', fontStyle: 'bold', resolution: 2 });
    const tag = playable && z.tag ? this.add.text(0, 0, z.tag, { fontFamily: FONT, fontSize: '15px', color: '#FFCB2B', fontStyle: 'bold', resolution: 2 }) : null;
    const padX = 12, padY = 6, gap = 2;
    const w = Math.max(name.width, tag ? tag.width : 0) + padX * 2;
    const h = name.height + (tag ? tag.height + gap : 0) + padY * 2;
    const side = z.labelSide || 'above';
    let lx, ly;
    if (side === 'right') { lx = r + 10; ly = -h / 2; }
    else if (side === 'below') { lx = -w / 2; ly = r + 12; }
    else { lx = -w / 2; ly = -r - 10 - h; }
    const bg = this.add.graphics();
    bg.fillStyle(0x05080D, playable ? 0.82 : 0.7); bg.fillRoundedRect(lx, ly, w, h, 10);
    name.setPosition(lx + padX, ly + padY);
    const out = [bg, name];
    if (tag) { tag.setPosition(lx + padX, ly + padY + name.height + gap); out.push(tag); }
    return out;
  }

  // --- selection + bottom card ---------------------------------------------
  select(id, byPlayer) {
    const z = zoneById(id);
    if (!z) return;
    if (byPlayer) track('map_node_select', { id, status: z.status });
    if (z.status !== 'playable') { toast(this, z.label + ': coming soon', 132); return; }
    if (this.selected === id && this.card) return;
    this.selected = id;

    Object.values(this.nodes).forEach(n => {
      this.tweens.killTweensOf(n.halo);
      n.halo.clear().setScale(1).setAlpha(1);
      if (n.z.id !== id) return;
      n.halo.fillStyle(C.teal, 0.28); n.halo.fillCircle(0, 0, n.r + 15);
      n.halo.lineStyle(3, 0x5FD0E0, 1); n.halo.strokeCircle(0, 0, n.r + 15);
      if (!REDUCE_MOTION) this.tweens.add({ targets: n.halo, scale: 1.12, alpha: 0.7, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });
    this.showCard(z);
  }

  showCard(z) {
    if (this.card) { this.tweens.killTweensOf(this.card); this.card.destroy(); }
    const cta = z.cta || {}, x0 = 18, w = W - 36, pad = 18, inner = w - pad * 2;
    const c = this.add.container(0, 0).setDepth(500);
    const items = [];
    let y = pad;

    // Eyebrow names the zone unless the title already does.
    const eyeTxt = (cta.title && cta.title !== z.label ? z.label + (z.tag ? '  ·  ' + z.tag : '') : z.tag || '').toUpperCase();
    const eyebrow = this.add.text(x0 + pad, y, eyeTxt,
      { fontFamily: FONT, fontSize: '15px', color: '#5FD0E0', fontStyle: 'bold', letterSpacing: 1, resolution: 2 });
    items.push(eyebrow); y += eyebrow.height + 4;
    const title = this.add.text(x0 + pad, y, cta.title || z.label, { fontFamily: FONT, fontSize: '26px', color: '#FFFFFF', fontStyle: 'bold', resolution: 2 });
    items.push(title); y += title.height + 8;
    if (cta.showExperiences) {
      // One row of up to 5 stacked chips (icon over label) keeps the card short
      // enough that it never covers the Windhoek node.
      // Four chips: with more than 4 experiences, the 4th becomes "More". Locked ones are dimmed.
      const cols = 4, gap = 8, cw = (inner - gap * (cols - 1)) / cols, ch = 56;
      const list = EXPERIENCES.length > cols
        ? EXPERIENCES.slice(0, cols - 1).concat([{ label: 'More', icon: 'more', status: 'playable' }])
        : EXPERIENCES;
      list.forEach((e, i) => {
        const cx = x0 + pad + i * (cw + gap), open = e.status === 'playable';
        const g = this.add.graphics();
        g.fillStyle(0xFFFFFF, open ? 0.12 : 0.06); g.fillRoundedRect(cx, y, cw, ch, 12);
        drawIcon(g, e.icon, cx + cw / 2, y + 19, 24, open ? C.yellow : 0xFFFFFF, open ? 1 : 0.5);
        const label = e.label.length > 12 ? e.label.split(' ')[0] : e.label;
        const t = this.add.text(cx + cw / 2, y + 44, label, { fontFamily: FONT, fontSize: '16px', color: open ? '#FFFFFF' : '#9AA6B5', fontStyle: 'bold', resolution: 2 }).setOrigin(0.5);
        items.push(g, t);
      });
      y += ch + 12;
    } else if (z.blurb) {
      const blurb = this.add.text(x0 + pad, y, z.blurb, { fontFamily: FONT, fontSize: '17px', color: '#DDE6F0', wordWrap: { width: inner }, lineSpacing: 3, resolution: 2 });
      items.push(blurb); y += blurb.height + 14;
    }

    const btnH = 60;
    const b = button(this, W / 2, y + btnH / 2, inner, btnH, cta.button || 'Open', () => this.openZone(z),
      { size: 24, fill: C.yellow, fillA: 1, color: '#0B1B2E' });
    items.push(b); y += btnH + pad;

    const bg = panel(this, x0, 0, w, y, { alpha: 0.95, r: 22, stroke: 0xFFFFFF, strokeA: 0.1 });
    c.add([bg, ...items]);
    const top = CARD_BOTTOM - y;
    this.card = c;
    if (REDUCE_MOTION) c.setY(top);
    else { c.setY(top + 24).setAlpha(0); this.tweens.add({ targets: c, y: top, alpha: 1, duration: 200, ease: 'Cubic.easeOut' }); }
  }

  openZone(z) {
    if (z.id === 'lab') track('lab_enter', { from: 'map_card' });
    this.go(z.scene);
  }

  go(key) {
    if (this.leaving) return; this.leaving = true;
    this.cameras.main.fadeOut(220, 8, 17, 30);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(key));
  }

  // --- chrome --------------------------------------------------------------
  topBar() {
    const g = this.add.graphics().setDepth(1500);
    g.fillStyle(C.navy, 0.9); g.fillRect(0, 0, W, TOP_H);
    g.fillStyle(0xFFFFFF, 0.08); g.fillRect(0, TOP_H - 1, W, 1);
    iconButton(this, 44, 44, 'back', () => { track('map_nav', { to: 'title' }); this.go('Title'); }).setDepth(2000);
    this.add.text(84, 44, 'Mission Map', { fontFamily: FONT, fontSize: '24px', color: '#FFFFFF', fontStyle: 'bold', resolution: 2 })
      .setOrigin(0, 0.5).setDepth(2000);

    // Points chip: real session points only.
    const pts = this.add.text(0, 0, String(state.points.toLocaleString('en')), { fontFamily: FONT, fontSize: '18px', color: '#FFFFFF', fontStyle: 'bold', resolution: 2 }).setOrigin(0, 0.5);
    const cw = pts.width + 54, cx = W - 140 - cw;
    const chip = this.add.graphics();
    chip.fillStyle(0xFFFFFF, 0.12); chip.fillRoundedRect(cx, 24, cw, 40, 20);
    drawIcon(chip, 'star', cx + 22, 44, 20, C.yellow);
    pts.setPosition(cx + 38, 44);
    this.add.container(0, 0, [chip, pts]).setDepth(2000);

    soundToggle(this);
  }

  bottomNav() {
    const g = this.add.graphics().setDepth(1500), iw = W / NAV.length;
    g.fillStyle(C.navy, 0.97); g.fillRect(0, NAV_Y, W, H - NAV_Y);
    g.fillStyle(0xFFFFFF, 0.08); g.fillRect(0, NAV_Y, W, 1);
    NAV.forEach((n, i) => {
      const cx = iw * i + iw / 2, active = n.id === 'map', col = active ? C.yellow : 0xB9C6D6;
      const ig = this.add.graphics().setDepth(1600);
      if (active) { ig.fillStyle(C.yellow, 1); ig.fillRoundedRect(cx - 24, NAV_Y + 2, 48, 4, 2); }
      drawIcon(ig, n.icon, cx, NAV_Y + 30, 26, col);
      T(this, cx, NAV_Y + 60, n.label, 16, active ? '#FFCB2B' : '#B9C6D6').setDepth(1600);
      const hit = this.add.zone(cx, NAV_Y + (H - NAV_Y) / 2, iw, H - NAV_Y).setInteractive({ useHandCursor: true }).setDepth(1700);
      hit.on('pointerup', () => { Sfx.init(this); Sfx.click(); this.nav(n.id); });
    });
  }

  nav(id) {
    track('map_nav', { to: id });
    if (id === 'map') return;
    if (id === 'lab') { track('lab_enter', { from: 'nav' }); this.go('LabMenu'); return; }
    if (id === 'passport') { this.go('Passport'); return; }
    toast(this, 'Badges: coming soon', 132);
  }
}
