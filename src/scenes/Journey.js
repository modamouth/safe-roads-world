import Phaser from 'phaser';
import { W, H, COLORS as C, FONT, track, REDUCE_MOTION } from '../config.js';
import { setupCam, viewBounds, fillView, T, button, iconButton, soundToggle, panel, toast } from '../ui.js';
import { drawIcon } from '../icons.js';
import { describe } from '../a11y.js';
import { artKey, cover } from '../worldArt.js';
import { loadImage } from '../imageAssets.js';
import { LEARNING_LAB_ASSETS as A } from '../lab/assets.js';
import { B1_ROUTE_STOPS } from '../lab/routeStops.js';
import { Sfx } from '../sfx.js';
import { LEGS, STAMPS, CHECKS, TIPS } from '../journey/route.js';
import { journey } from '../journey/progress.js';

// The Journey Home: route overview, Passport stamps and the pre-trip check.
// Each leg is driven in JourneyDrive; fatigue and vehicle health carry over.
const TIME_WORD = { day: 'Afternoon', dusk: 'Dusk', night: 'Night' };
// The illustrated B1 map, cropped to Windhoek–Tsumeb (fractions of the image).
// Towns sit on the painted road; Otavi is not on the schematic, so it is measured from the art.
const MAP = { x: 20, y: 176, w: 244, h: 410, crop: { x: 0.16, y: 0.33, w: 0.6, h: 0.66 } };
const STOP = name => B1_ROUTE_STOPS.find(s => s.label === name);
const ON_MAP = { Windhoek: STOP('Windhoek'), Okahandja: STOP('Okahandja'), Otjiwarongo: STOP('Otjiwarongo'), Otavi: { x: 0.452, y: 0.455 }, Tsumeb: STOP('Tsumeb') };
let tipIndex = 0;

export default class Journey extends Phaser.Scene {
  constructor() { super('Journey'); }

  preload() {
    this.load.setPath(import.meta.env.BASE_URL);
    if (!this.textures.exists(A.route.key)) loadImage(this, A.route.key, A.route.path);
    this.load.on('loaderror', () => {});
  }

  create(data) {
    setupCam(this);
    Sfx.init(this);
    this.cameras.main.fadeIn(250, 8, 17, 30);
    this.leaving = false; this.overlay = null;
    const v = viewBounds(this);
    cover(this, artKey(this, 'map_bg'), 0, v);
    fillView(this, 0x05080D, 0.78);

    const g = this.add.graphics().setDepth(5);
    g.fillStyle(C.navy, 0.92); g.fillRect(v.left, v.top, v.width, 88 - v.top);
    iconButton(this, 44, 44, 'back', () => this.go('Map', { select: 'b1' })).setDepth(10);
    this.add.text(84, 44, 'The Journey Home', { fontFamily: FONT, fontSize: '24px', color: '#FFFFFF', fontStyle: 'bold', resolution: 2 }).setOrigin(0, 0.5).setDepth(10);
    soundToggle(this);

    const run = journey.run();
    const intro = run && run.complete
      ? 'You made it home. Best journey score: ' + journey.best() + '/100.'
      : 'Drive home for the holidays: Windhoek to Tsumeb on the B1. Four legs, one goal: arrive safely.';
    this.add.text(28, 112, intro, { fontFamily: FONT, fontSize: '17px', color: '#DDE6F0', wordWrap: { width: W - 56 }, lineSpacing: 4, resolution: 2 });

    this.route(run);
    this.stamps();
    const tip = TIPS[tipIndex++ % TIPS.length];
    this.add.text(W / 2, 808, 'Tip: ' + tip, { fontFamily: FONT, fontSize: '15px', color: '#9AA6B5', wordWrap: { width: W - 60 }, align: 'center', resolution: 2 }).setOrigin(0.5);

    const next = run && !run.complete ? run.leg : null;
    const label = next == null ? (run && run.complete ? 'Drive home again' : 'Start the journey') : next === 0 ? 'Start leg 1' : 'Drive leg ' + (next + 1) + ': to ' + LEGS[next].to;
    button(this, W / 2, 866, W - 60, 64, label, () => (next == null ? this.preTrip() : this.drive(next)),
      { size: 23, fill: C.yellow, fillA: 1, color: '#0B1B2E' });
    if (next) button(this, W / 2, 928, 260, 44, 'Start over from Windhoek', () => this.preTrip(), { size: 16, fill: C.navy, fillA: 0.9, stroke: 0x4FC3F7, r: 22 });

    const arrived = data && data.arrived && LEGS.find(l => l.id === data.arrived);
    if (arrived && !arrived.home && run && !run.complete) toast(this, 'Stretch break in ' + arrived.to + ': fatigue now ' + Math.round(run.fatigue) + '%', 760);

    describe('The Journey Home', [intro,
      'Route: ' + LEGS.map((l, i) => 'leg ' + (i + 1) + ' ' + l.from + ' to ' + l.to + this.legStatus(run, i).text).join('; ') + '.',
      'Passport: ' + journey.stampCount() + ' of ' + STAMPS.length + ' journey stamps.']);
  }

  legStatus(run, i) {
    if (!run) return { text: '', state: 'locked' };
    if (run.scores[i] != null && (run.leg > i)) return { text: ', done, safety ' + run.scores[i], state: 'done' };
    if (run.leg === i && !run.complete) return { text: ', next', state: 'next' };
    return { text: '', state: 'locked' };
  }

  route(run) {
    const towns = [LEGS[0].from, ...LEGS.map(l => l.to)];
    const at = this.routeMap(run, towns);
    // The legs, beside the map.
    const x = MAP.x + MAP.w + 20, y0 = MAP.y + 8, gap = MAP.h / LEGS.length, g = this.add.graphics();
    LEGS.forEach((leg, i) => {
      const y = y0 + i * gap, s = this.legStatus(run, i), next = s.state === 'next';
      if (next) { g.fillStyle(C.yellow, 0.12); g.fillRoundedRect(x - 10, y - 6, W - x - 10, gap - 12, 12); g.lineStyle(2, C.yellow, 0.8); g.strokeRoundedRect(x - 10, y - 6, W - x - 10, gap - 12, 12); }
      this.add.text(x, y + 4, 'Leg ' + (i + 1) + (leg.home ? '  ·  home' : ''), { fontFamily: FONT, fontSize: '13px', color: '#FFCB2B', fontStyle: 'bold', resolution: 2 });
      this.add.text(x, y + 22, leg.from + ' →\n' + leg.to, { fontFamily: FONT, fontSize: '17px', color: '#FFFFFF', fontStyle: 'bold', lineSpacing: 2, resolution: 2 });
      const info = TIME_WORD[leg.time] + (leg.weather === 'rain' ? ', rain' : '') + '  ·  ' + leg.realKm + ' km';
      this.add.text(x, y + 70, info, { fontFamily: FONT, fontSize: '13px', color: '#9AA6B5', fontStyle: 'bold', resolution: 2 });
      const chip = s.state === 'done' ? ['✓ ' + run.scores[i] + '/100', '#7BE0A6'] : next ? ['Next', '#FFCB2B'] : null;
      if (chip) this.add.text(W - 30, y + 4, chip[0], { fontFamily: FONT, fontSize: '14px', color: chip[1], fontStyle: 'bold', resolution: 2 }).setOrigin(1, 0);
    });
    return at;
  }

  // The B1 from Windhoek to Tsumeb, with the towns of each leg and where you are now.
  routeMap(run, towns) {
    const m = MAP, frame = this.add.graphics();
    frame.fillStyle(0x9C6230, 1); frame.fillRoundedRect(m.x, m.y, m.w, m.h, 16);
    const has = this.textures.exists(A.route.key), c = m.crop;
    const src = has ? this.textures.get(A.route.key).getSourceImage() : { width: 582, height: 900 }, iw = src.width, ih = src.height;
    const k = Math.max(m.w / (iw * c.w), m.h / (ih * c.h)), ox = m.x + (m.w - iw * c.w * k) / 2 - iw * c.x * k, oy = m.y + (m.h - ih * c.h * k) / 2 - ih * c.y * k;
    const place = (x, y) => ({ x: ox + iw * x * k, y: oy + ih * y * k });
    if (has) {
      const pic = this.add.image(ox, oy, A.route.key).setOrigin(0).setScale(k).setCrop(iw * c.x, ih * c.y, iw * c.w, ih * c.h);
      const mask = this.make.graphics({}, false); mask.fillStyle(0xFFFFFF); mask.fillRoundedRect(m.x, m.y, m.w, m.h, 16);
      pic.setMask(mask.createGeometryMask());
    }
    frame.lineStyle(2, 0xFFFFFF, 0.2); frame.strokeRoundedRect(m.x, m.y, m.w, m.h, 16);
    this.add.text(m.x + m.w - 12, m.y + 12, 'B1', { fontFamily: FONT, fontSize: '14px', color: '#FFFFFF', fontStyle: 'bold', backgroundColor: '#1E6B45', padding: { x: 6, y: 2 }, resolution: 2 }).setOrigin(1, 0);

    const here = !run ? 0 : run.complete ? towns.length - 1 : run.leg;
    const g = this.add.graphics();
    towns.forEach((name, i) => {
      const p = place(ON_MAP[name].x, ON_MAP[name].y), reached = run && i <= here, home = i === towns.length - 1;
      g.fillStyle(reached ? C.yellow : 0xFFFFFF, 1); g.fillCircle(p.x, p.y, home ? 11 : 8);
      g.lineStyle(3, C.navy, 1); g.strokeCircle(p.x, p.y, home ? 11 : 8);
      if (home) drawIcon(g, 'home', p.x, p.y, 13, C.navy);
      // Labels go on whichever side of the road has more room.
      const right = p.x < m.x + m.w * 0.5;
      this.add.text(p.x + (right ? 15 : -15), p.y, name, { fontFamily: FONT, fontSize: '13px', color: '#0B1B2E', fontStyle: 'bold', backgroundColor: '#FFFFFFE6', padding: { x: 4, y: 2 }, resolution: 2 }).setOrigin(right ? 0 : 1, 0.5);
    });
    // You are here: a pulsing ring on the town the next leg starts from.
    const p = place(ON_MAP[towns[here]].x, ON_MAP[towns[here]].y), ring = this.add.circle(p.x, p.y, 16).setStrokeStyle(3, C.yellow, 1);
    if (!REDUCE_MOTION) this.tweens.add({ targets: ring, scale: 1.5, alpha: 0, duration: 1100, repeat: -1 });
    return towns[here];
  }

  stamps() {
    const have = journey.stamps(), y0 = 652;
    this.add.text(28, 618, 'Passport  ' + Object.keys(have).length + '/' + STAMPS.length, { fontFamily: FONT, fontSize: '18px', color: '#FFCB2B', fontStyle: 'bold', resolution: 2 }).setOrigin(0, 0.5);
    const cols = 9, cell = (W - 40) / cols;
    STAMPS.forEach((s, i) => {
      const x = 20 + cell * i + cell / 2, y = y0 + 14, on = !!have[s.id], g = this.add.graphics();
      if (on) { g.lineStyle(3, C.yellow, 1); g.strokeCircle(x, y, 22); g.fillStyle(C.navy2, 1); g.fillCircle(x, y, 19); drawIcon(g, s.icon, x, y, 22, C.yellow); }
      else { g.lineStyle(2, 0xFFFFFF, 0.25); g.strokeCircle(x, y, 22); drawIcon(g, s.icon, x, y, 20, 0xFFFFFF, 0.3); }
      const hit = this.add.zone(x, y, cell, 56).setInteractive({ useHandCursor: true });
      hit.on('pointerup', () => toast(this, s.label + (on ? ' ✓' : ': ' + s.how), 560));
    });
    this.add.text(W / 2, y0 + 58, 'Tap a stamp to see how to earn it', { fontFamily: FONT, fontSize: '13px', color: '#9AA6B5', resolution: 2 }).setOrigin(0.5);
  }

  // --- pre-trip check -----------------------------------------------------------
  preTrip() {
    if (this.overlay) return;
    const v = viewBounds(this), o = this.add.container(0, 0).setDepth(4000), checks = {};
    o.add([this.add.rectangle(W / 2, H / 2, v.width, v.height, 0x05080D, 0.8), this.add.zone(W / 2, H / 2, v.width, v.height).setInteractive()]);
    o.add(panel(this, 28, 150, W - 56, 650, { alpha: 0.97, stroke: 0xFFFFFF, strokeA: 0.12 }));
    o.add(T(this, W / 2, 196, 'Before you leave', 30, '#FFFFFF'));
    o.add(this.add.text(W / 2, 236, 'A long trip starts in the driveway. Tap each check you do.', { fontFamily: FONT, fontSize: '16px', color: '#B9C6D6', wordWrap: { width: W - 110 }, align: 'center', resolution: 2 }).setOrigin(0.5, 0));
    CHECKS.forEach((c, i) => {
      const b = button(this, W / 2, 322 + i * 84, W - 100, 70, '☐  ' + c.label, () => {
        checks[c.id] = !checks[c.id];
        b.setActive(!!checks[c.id]); b.setLabel((checks[c.id] ? '☑  ' : '☐  ') + c.label);
      }, { size: 17, fill: 0xFFFFFF, fillA: 0.08, stroke: 0xFFFFFF, toggle: true });
      o.add(b);
    });
    o.add(button(this, W / 2, 700, W - 100, 62, 'Leave now', () => {
      const skipped = CHECKS.filter(c => !checks[c.id]);
      const fresh = journey.startRun(checks);
      track('journey_pretrip', { checks, skipped: skipped.map(c => c.id) });
      if (skipped.length) {
        o.destroy(); this.overlay = null;
        this.skippedNotice(skipped);
      } else { if (fresh.length) toast(this, 'Stamp earned: Pre-trip check', 560); this.drive(0); }
    }, { size: 23, fill: C.yellow, fillA: 1, color: '#0B1B2E' }));
    o.add(button(this, W / 2, 768, 200, 44, 'Not now', () => { o.destroy(); this.overlay = null; }, { size: 17, stroke: 0xFFFFFF, r: 22 }));
    this.overlay = o;
    describe('Before you leave', CHECKS.map(c => c.label));
    if (!REDUCE_MOTION) { o.setAlpha(0); this.tweens.add({ targets: o, alpha: 1, duration: 180 }); }
  }

  skippedNotice(skipped) {
    const v = viewBounds(this), o = this.add.container(0, 0).setDepth(4000);
    o.add([this.add.rectangle(W / 2, H / 2, v.width, v.height, 0x05080D, 0.8), this.add.zone(W / 2, H / 2, v.width, v.height).setInteractive()]);
    const h = 200 + skipped.length * 70;
    o.add(panel(this, 28, H / 2 - h / 2, W - 56, h, { alpha: 0.97, stroke: C.orange, strokeA: 0.8 }));
    o.add(T(this, W / 2, H / 2 - h / 2 + 40, 'You skipped ' + skipped.length + (skipped.length === 1 ? ' check' : ' checks'), 26, '#FFFFFF'));
    skipped.forEach((c, i) => o.add(this.add.text(56, H / 2 - h / 2 + 80 + i * 70, c.skipped, { fontFamily: FONT, fontSize: '17px', color: '#DDE6F0', wordWrap: { width: W - 112 }, lineSpacing: 3, resolution: 2 })));
    o.add(button(this, W / 2, H / 2 + h / 2 - 50, W - 100, 60, 'Drive anyway', () => this.drive(0), { size: 22, fill: C.yellow, fillA: 1, color: '#0B1B2E' }));
    this.overlay = o;
    describe('You skipped ' + skipped.length + (skipped.length === 1 ? ' check' : ' checks'), skipped.map(c => c.skipped));
  }

  drive(leg) { this.go('JourneyDrive', { leg }); }

  go(key, data) {
    if (this.leaving) return; this.leaving = true;
    this.cameras.main.fadeOut(220, 8, 17, 30);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(key, data));
  }
}
