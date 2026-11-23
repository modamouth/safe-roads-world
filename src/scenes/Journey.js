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
import { routeById } from '../journey/routes.js';
import { journeyFor } from '../journey/progress.js';
import { drawCoastMap } from '../journey/coastMap.js';

// A journey's hub (the Journey Home, Journey to the Ocean): route overview, Passport
// stamps and the pre-trip check. Each leg is driven in JourneyDrive; fatigue and
// vehicle health carry over. Started with { route: 'b1' | 'b2' }.
const TIME_WORD = { day: 'Afternoon', dusk: 'Dusk', night: 'Night' };
// The illustrated B1 map, cropped to Windhoek–Tsumeb (fractions of the image).
// Towns sit on the painted road; Otavi is not on the schematic, so it is measured from the art.
const MAP = { x: 20, y: 176, w: 244, h: 410, crop: { x: 0.16, y: 0.33, w: 0.6, h: 0.66 } };
const STOP = name => B1_ROUTE_STOPS.find(s => s.label === name);
const ON_MAP = { Windhoek: STOP('Windhoek'), Okahandja: STOP('Okahandja'), Otjiwarongo: STOP('Otjiwarongo'), Otavi: { x: 0.452, y: 0.455 }, Tsumeb: STOP('Tsumeb') };
// Where the route's towns sit on the illustrated B2 map (fractions of the image). With the
// labelled map they are its painted pins; on the plain base, the painted towns themselves.
const B2_ON_MAP = { Windhoek: [0.904, 0.656], Karibib: [0.569, 0.291], Arandis: [0.283, 0.515], Swakopmund: [0.132, 0.685] };
const B2_BASE = [['Windhoek', 0.845, 0.7, 'stop'], ['Okahandja', 0.8, 0.3, 'via'], ['Karibib', 0.575, 0.355, 'stop'], ['Usakos', 0.47, 0.33, 'via'], ['Arandis', 0.35, 0.565, 'stop'], ['Swakopmund', 0.185, 0.74, 'stop']];
let tipIndex = 0;

export default class Journey extends Phaser.Scene {
  constructor() { super('Journey'); }

  init(data) { this.r = routeById(data && data.route); this.j = journeyFor(this.r.id); }

  preload() {
    this.load.setPath(import.meta.env.BASE_URL);
    const maps = this.r.id === 'b2' ? [A.routeB2Base, A.routeB2] : [A.route];
    maps.forEach(map => { if (!this.textures.exists(map.key)) loadImage(this, map.key, map.path); });
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
    iconButton(this, 44, 44, 'back', () => this.go('Map', { select: this.r.zone })).setDepth(10);
    this.add.text(84, 44, this.r.title, { fontFamily: FONT, fontSize: '24px', color: '#FFFFFF', fontStyle: 'bold', resolution: 2 }).setOrigin(0, 0.5).setDepth(10);
    soundToggle(this);

    const run = this.j.run();
    const intro = run && run.complete
      ? this.r.done(this.j.best())
      : this.r.intro;
    this.add.text(28, 112, intro, { fontFamily: FONT, fontSize: '17px', color: '#DDE6F0', wordWrap: { width: W - 56 }, lineSpacing: 4, resolution: 2 });

    this.route(run);
    this.stamps();
    const tip = this.r.tips[tipIndex++ % this.r.tips.length];
    this.add.text(W / 2, 808, 'Tip: ' + tip, { fontFamily: FONT, fontSize: '15px', color: '#9AA6B5', wordWrap: { width: W - 60 }, align: 'center', resolution: 2 }).setOrigin(0.5);

    const next = run && !run.complete ? run.leg : null;
    const label = next == null ? (run && run.complete ? this.r.again : 'Start the journey') : next === 0 ? 'Start leg 1' : 'Drive leg ' + (next + 1) + ': to ' + this.r.legs[next].to;
    button(this, W / 2, 866, W - 60, 64, label, () => (next == null ? this.preTrip() : this.drive(next)),
      { size: 23, fill: C.yellow, fillA: 1, color: '#0B1B2E' });
    if (next) button(this, W / 2, 928, 260, 44, 'Start over from ' + this.r.legs[0].from, () => this.preTrip(), { size: 16, fill: C.navy, fillA: 0.9, stroke: 0x4FC3F7, r: 22 });

    const arrived = data && data.arrived && this.r.legs.find(l => l.id === data.arrived);
    if (arrived && !arrived.home && run && !run.complete) toast(this, 'Stretch break in ' + arrived.to + ': fatigue now ' + Math.round(run.fatigue) + '%', 760);

    describe(this.r.title, [intro,
      'Route: ' + this.r.legs.map((l, i) => 'leg ' + (i + 1) + ' ' + l.from + ' to ' + l.to + this.legStatus(run, i).text).join('; ') + '.',
      'Passport: ' + this.j.stampCount() + ' of ' + this.r.stamps.length + ' journey stamps.']);
  }

  legStatus(run, i) {
    if (!run) return { text: '', state: 'locked' };
    if (run.scores[i] != null && (run.leg > i)) return { text: ', done, safety ' + run.scores[i], state: 'done' };
    if (run.leg === i && !run.complete) return { text: ', next', state: 'next' };
    return { text: '', state: 'locked' };
  }

  route(run) {
    const towns = [this.r.legs[0].from, ...this.r.legs.map(l => l.to)];
    if (this.r.id !== 'b1') return this.coastRoute(run, towns);
    const at = this.routeMap(run, towns);
    // The legs, beside the map.
    const x = MAP.x + MAP.w + 20, y0 = MAP.y + 8, gap = MAP.h / this.r.legs.length, g = this.add.graphics();
    this.r.legs.forEach((leg, i) => {
      const y = y0 + i * gap, s = this.legStatus(run, i), next = s.state === 'next';
      if (next) { g.fillStyle(C.yellow, 0.12); g.fillRoundedRect(x - 10, y - 6, W - x - 10, gap - 12, 12); g.lineStyle(2, C.yellow, 0.8); g.strokeRoundedRect(x - 10, y - 6, W - x - 10, gap - 12, 12); }
      this.add.text(x, y + 4, 'Leg ' + (i + 1) + (leg.home ? '  ·  ' + this.r.end : ''), { fontFamily: FONT, fontSize: '13px', color: '#FFCB2B', fontStyle: 'bold', resolution: 2 });
      this.add.text(x, y + 22, leg.from + ' →\n' + leg.to, { fontFamily: FONT, fontSize: '17px', color: '#FFFFFF', fontStyle: 'bold', lineSpacing: 2, resolution: 2 });
      const info = TIME_WORD[leg.time] + (leg.weather === 'rain' ? ', rain' : leg.fog ? ', fog' : leg.dust ? ', dust' : '') + '  ·  ' + leg.realKm + ' km';
      this.add.text(x, y + 70, info, { fontFamily: FONT, fontSize: '13px', color: '#9AA6B5', fontStyle: 'bold', resolution: 2 });
      const chip = s.state === 'done' ? ['✓ ' + run.scores[i] + '/100', '#7BE0A6'] : next ? ['Next', '#FFCB2B'] : null;
      if (chip) this.add.text(W - 30, y + 4, chip[0], { fontFamily: FONT, fontSize: '14px', color: chip[1], fontStyle: 'bold', resolution: 2 }).setOrigin(1, 0);
    });
    return at;
  }

  // Where each leg ends, and where you are now: the illustrated B1 map, or the drawn coast map.
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

  // The coast journey: a wide map of the region, drawn from real coordinates, with the legs underneath.
  coastRoute(run, towns) {
    const here = !run ? 0 : run.complete ? towns.length - 1 : run.leg;
    const area = { x: 20, y: 172, w: W - 40, h: 300 };
    if (this.textures.exists(A.routeB2Base.key)) this.illustratedCoastMap(area, towns, here, true);
    else if (this.textures.exists(A.routeB2.key)) this.illustratedCoastMap(area, towns, here);
    else drawCoastMap(this, area, { towns, here });
    const y0 = 486, gap = 42, g = this.add.graphics();
    this.r.legs.forEach((leg, i) => {
      const y = y0 + i * gap, st = this.legStatus(run, i), next = st.state === 'next';
      if (next) { g.fillStyle(C.yellow, 0.12); g.fillRoundedRect(20, y - 4, W - 40, gap - 6, 10); g.lineStyle(2, C.yellow, 0.8); g.strokeRoundedRect(20, y - 4, W - 40, gap - 6, 10); }
      this.add.text(32, y + 15, (i + 1) + '', { fontFamily: FONT, fontSize: '15px', color: '#FFCB2B', fontStyle: 'bold', resolution: 2 }).setOrigin(0, 0.5);
      this.add.text(52, y + 15, leg.from + ' → ' + leg.to, { fontFamily: FONT, fontSize: '16px', color: '#FFFFFF', fontStyle: 'bold', resolution: 2 }).setOrigin(0, 0.5);
      const info = (leg.fog ? 'Fog' : leg.dust ? 'Dust' : TIME_WORD[leg.time]) + ' · ' + leg.realKm + ' km';
      const chip = st.state === 'done' ? ['✓ ' + run.scores[i], '#7BE0A6'] : next ? ['Next', '#FFCB2B'] : null;
      this.add.text(W - (chip ? 96 : 32), y + 15, info, { fontFamily: FONT, fontSize: '13px', color: '#9AA6B5', fontStyle: 'bold', resolution: 2 }).setOrigin(1, 0.5);
      if (chip) this.add.text(W - 32, y + 15, chip[0], { fontFamily: FONT, fontSize: '14px', color: chip[1], fontStyle: 'bold', resolution: 2 }).setOrigin(1, 0.5);
    });
    return towns[here];
  }

  // The illustrated B2 map (towns, labels and route are painted on); mark where you are.
  illustratedCoastMap(a, towns, here, base) {
    const img = this.add.image(0, 0, base ? A.routeB2Base.key : A.routeB2.key).setOrigin(0);
    const k = Math.min(a.w / img.width, a.h / img.height), w = img.width * k, h = img.height * k, x = a.x + (a.w - w) / 2, y = a.y + (a.h - h) / 2;
    img.setScale(k).setPosition(x, y);
    const mask = this.make.graphics({}, false); mask.fillStyle(0xFFFFFF); mask.fillRoundedRect(x, y, w, h, 16);
    img.setMask(mask.createGeometryMask());
    const frame = this.add.graphics(); frame.lineStyle(2, 0xFFFFFF, 0.25); frame.strokeRoundedRect(x, y, w, h, 16);
    if (base) return this.drawB2Route(x, y, w, h, towns, here);
    const p = B2_ON_MAP[towns[here]], cx = x + w * p[0], cy = y + h * p[1];
    const ring = this.add.circle(cx, cy, 13).setStrokeStyle(3, 0xFFFFFF, 1);
    if (!REDUCE_MOTION) this.tweens.add({ targets: ring, scale: 1.7, alpha: 0, duration: 1100, repeat: -1 });
  }

  // The route over the plain map: a smooth road through the towns, driven stretches in
  // yellow, stops with labels, and a ring where the next leg starts.
  drawB2Route(x, y, w, h, towns, here) {
    const pt = ([, fx, fy]) => new Phaser.Math.Vector2(x + w * fx, y + h * fy);
    const at = name => B2_BASE.findIndex(t => t[0] === name), reached = at(towns[here]);
    const curve = new Phaser.Curves.Spline(B2_BASE.map(pt)), n = 120, pts = curve.getPoints(n);
    // Where each town falls along the curve (for the driven part).
    const tOf = i => { const target = pt(B2_BASE[i]); let best = 0; pts.forEach((p, k) => { if (p.distance(target) < pts[best].distance(target)) best = k; }); return best; };
    const g = this.add.graphics();
    g.lineStyle(8, 0x2B2A2E, 0.85); g.strokePoints(pts, false);
    g.lineStyle(3, 0xFFFFFF, 0.9); g.strokePoints(pts, false);
    if (reached > 0) { g.lineStyle(5, C.yellow, 1); g.strokePoints(pts.slice(0, tOf(reached) + 1), false); }
    B2_BASE.forEach(([name, , , kind], i) => {
      const p = pt(B2_BASE[i]), stop = kind === 'stop', done = i <= reached, end = i === B2_BASE.length - 1;
      g.fillStyle(done ? C.yellow : 0xFFFFFF, 1); g.fillCircle(p.x, p.y, stop ? (end ? 8 : 6.5) : 3.5);
      g.lineStyle(stop ? 2.5 : 1.5, 0x2B2A2E, 1); g.strokeCircle(p.x, p.y, stop ? (end ? 8 : 6.5) : 3.5);
      const below = name === 'Windhoek' || name === 'Swakopmund' || name === 'Arandis';
      this.add.text(p.x + (name === 'Swakopmund' ? 10 : 0), p.y + (below ? 16 : -15), name, { fontFamily: FONT, fontSize: stop ? '13px' : '10px', color: '#0B1B2E', fontStyle: stop ? 'bold' : 'normal',
        backgroundColor: stop ? '#FFFFFFE6' : '#FFFFFFB3', padding: { x: 4, y: 1 }, resolution: 2 }).setOrigin(name === 'Swakopmund' ? 0 : 0.5, 0.5);
    });
    this.add.text(x + 10, y + 10, 'B2', { fontFamily: FONT, fontSize: '14px', color: '#FFFFFF', fontStyle: 'bold', backgroundColor: '#1E6B45', padding: { x: 6, y: 2 }, resolution: 2 });
    const p = pt(B2_BASE[reached]), ring = this.add.circle(p.x, p.y, 13).setStrokeStyle(3, 0xFFFFFF, 1);
    if (!REDUCE_MOTION) this.tweens.add({ targets: ring, scale: 1.7, alpha: 0, duration: 1100, repeat: -1 });
  }

  stamps() {
    const have = this.j.stamps(), y0 = 652;
    this.add.text(28, 618, 'Passport  ' + Object.keys(have).length + '/' + this.r.stamps.length, { fontFamily: FONT, fontSize: '18px', color: '#FFCB2B', fontStyle: 'bold', resolution: 2 }).setOrigin(0, 0.5);
    const cols = 9, cell = (W - 40) / cols;
    this.r.stamps.forEach((s, i) => {
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
    this.r.checks.forEach((c, i) => {
      const b = button(this, W / 2, 322 + i * 84, W - 100, 70, '☐  ' + c.label, () => {
        checks[c.id] = !checks[c.id];
        b.setActive(!!checks[c.id]); b.setLabel((checks[c.id] ? '☑  ' : '☐  ') + c.label);
      }, { size: 17, fill: 0xFFFFFF, fillA: 0.08, stroke: 0xFFFFFF, toggle: true });
      o.add(b);
    });
    o.add(button(this, W / 2, 700, W - 100, 62, 'Leave now', () => {
      const skipped = this.r.checks.filter(c => !checks[c.id]);
      const fresh = this.j.startRun(checks);
      track('journey_pretrip', { checks, skipped: skipped.map(c => c.id) });
      if (skipped.length) {
        o.destroy(); this.overlay = null;
        this.skippedNotice(skipped);
      } else { if (fresh.length) toast(this, 'Stamp earned: Pre-trip check', 560); this.drive(0); }
    }, { size: 23, fill: C.yellow, fillA: 1, color: '#0B1B2E' }));
    o.add(button(this, W / 2, 768, 200, 44, 'Not now', () => { o.destroy(); this.overlay = null; }, { size: 17, stroke: 0xFFFFFF, r: 22 }));
    this.overlay = o;
    describe('Before you leave', this.r.checks.map(c => c.label));
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

  drive(leg) { this.go('JourneyDrive', { leg, route: this.r.id }); }

  go(key, data) {
    if (this.leaving) return; this.leaving = true;
    this.cameras.main.fadeOut(220, 8, 17, 30);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(key, data));
  }
}
