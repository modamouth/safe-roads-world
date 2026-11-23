import Phaser from 'phaser';
import { W, H, COLORS as C, FONT, track, clamp, REDUCE_MOTION } from '../config.js';
import { setupCam, viewBounds, T, button, iconButton, soundToggle, panel, focusRing } from '../ui.js';
import { drawIcon } from '../icons.js';
import { mirror, describe, announce } from '../a11y.js';
import { loadImage } from '../imageAssets.js';
import { Sfx } from '../sfx.js';
import { LEARNING_LAB_ASSETS as A } from '../lab/assets.js';
import { animationSeconds } from '../lab/core/time.js';
import { bindCrashFeedback, crashImpact } from '../services/crashFeedbackScene.js';
import { LEGS, STAMPS, peopleOf } from '../journey/route.js';
import { createLegSim, autopilot } from '../journey/sim.js';
import { createRoad } from '../journey/road.js';
import { journey } from '../journey/progress.js';

// The Journey Home: drive one leg. Hold PETROL and BRAKE; steer only when you
// drift (the car keeps its lane otherwise). The HUD mirrors the original brief:
// limit, km/h, fatigue, gap, safety /100, passport n/9, vehicle %.
const ART = [A.animals.kudu, A.animals.kuduLeaping, A.animals.cow, A.animals.donkey, ...Object.values(A.animals.warthog), ...Object.values(A.vehicles), A.scenery.acacia, A.scenery.bush, A.scenery.lamp, A.scenery.post, A.oncomingTruck];
const GAP_TEXT = { clear: 'Clear', safe: null, close: null, danger: 'Too close' };
const GAP_COL = { clear: '#FFFFFF', safe: '#7BE0A6', close: '#FFCB2B', danger: '#FF8A8D' };
const ALERTS = {
  speeding: e => ['Speeding: the limit here is ' + e.limit, C.red],
  tooClose: () => ['Too close! Keep a 3-second gap', C.red],
  leadBrake: () => ['The vehicle ahead is stopping!', C.red],
  overLine: e => [e.solid ? 'Solid line: no overtaking here' : 'You are over the centre line', C.orange],
  rumble: () => ['Off the edge of the road!', C.orange],
  drift: () => ['You are drifting: steer back into your lane', C.orange],
  microsleep: e => ['Microsleep: ' + e.metres + ' m with your eyes closed', C.red],
  animal: e => [e.kind === 'warthog' ? (e.group > 1 ? 'Warthogs! Slow down: more are following' : 'Warthog running across!') : e.kind === 'kudu' ? 'Kudu on the road!' : e.kind === 'cattle' ? 'Cattle on the road!' : 'Donkey on the road!', C.red],
  animalPassed: () => ['Well spotted. Animals can step out at any time', C.green],
  pothole: e => ['Pothole at ' + e.kmh + ' km/h: slow down on damaged roads', C.orange],
  pedestrian: e => [e.late ? 'Someone stepped onto the crossing!' : 'Pedestrian crossing: stop and let them cross', e.late ? C.red : C.orange],
  noYield: () => ['Stop for people on a zebra crossing', C.red],
  yielded: () => ['Thanks for stopping at the crossing', C.green],
  taxiParked: () => ['Taxi stopped ahead: it may pull out', C.orange],
  taxiPullOut: () => ['The taxi is pulling out without indicating!', C.red],
  walker: () => ['Person walking on the road edge: slow down and move over', C.orange],
  closePass: () => ['Too close! Give people on the road at least a metre', C.red],
  walkerPassed: () => ['Good: you gave them space', C.green],
  stopGo: () => ['Stop/Go roadworks: stop at the flagman', C.orange],
  go: () => ['GO: follow your lane through the roadworks', C.green],
  ranStop: () => ['You drove past a STOP board!', C.red]
};
const OVER_COPY = {
  rear: r => 'You ran into the vehicle ahead at ' + r.kmh + ' km/h faster than it. A 3-second gap gives you time to react and stop.',
  headon: r => 'You crossed into the oncoming lane and hit another vehicle. Stay left, and only overtake where you can see the road is clear.',
  warthog: r => 'You hit a warthog at ' + r.kmh + ' km/h. Warthogs dart out of the grass, often a family in a line: when one crosses, slow down, because more usually follow.',
  kudu: r => 'You hit a kudu at ' + r.kmh + ' km/h. At dusk and at night, slow down where game warning signs are up.',
  animal: r => 'You hit an animal at ' + r.kmh + ' km/h. On unfenced roads, slow down and be ready to stop.',
  convoy: () => 'You drove past the STOP board and met the oncoming traffic coming through your lane. At Stop/Go roadworks, wait at the line until the flagman shows GO.',
  taxi: r => 'A taxi pulled out in front of you and you hit it at ' + r.kmh + ' km/h. When a taxi is stopped at the roadside, slow down and be ready for it to pull out.',
  pedestrian: r => 'You hit a person at ' + r.kmh + ' km/h. Near people, on crossings or walking on the road edge, slow down and give them space.',
  runoff: r => 'You left the road at ' + r.kmh + ' km/h. Tiredness and distraction both pull you off the road.',
  vehicle: () => 'Your car is too damaged to carry on. Potholes and collisions add up.',
  safety: () => 'Your safety score reached zero. Every risky choice costs points.'
};

export default class JourneyDrive extends Phaser.Scene {
  constructor() { super('JourneyDrive'); }

  init(data) { this.legIndex = clamp((data && data.leg) || 0, 0, LEGS.length - 1); }

  preload() {
    this.load.setPath(import.meta.env.BASE_URL);
    const people = peopleOf(LEGS[this.legIndex]).flatMap(who => Object.values(A.pedestrians[who]));
    [...ART, ...people].forEach(a => { if (!this.textures.exists(a.key)) loadImage(this, a.key, a.path); });
    this.load.on('loaderror', () => {});
  }

  create() {
    setupCam(this);
    Sfx.init(this);
    this.cameras.main.fadeIn(250, 0, 0, 0);
    // Phaser reuses this scene object for every leg, so reset all per-leg state here.
    Object.assign(this, { leaving: false, started: false, paused: false, ended: false, resultShown: false, locked: false, overlay: null, alertUntil: 0, alertKey: null, pulse: {}, held: {} });
    this.input.addPointer(2);

    const run = journey.run() || { fatigue: 0, vehicle: 100, checks: {} };
    this.leg = LEGS[this.legIndex];
    // Warthogs turn up in different places each drive.
    this.sim = createLegSim(this.leg, { fatigue: run.fatigue, vehicle: run.vehicle, checks: run.checks }, { wildSeed: Math.floor(Math.random() * 2 ** 32) });
    this.road = createRoad(this, { leg: this.leg, sim: this.sim, lights: !!run.checks.lights });
    this.auto = import.meta.env.DEV && new URLSearchParams(window.location.search).get('autopilot') === '1';

    this.buildHud();
    this.buildControls();
    this.keys = this.input.keyboard ? this.input.keyboard.addKeys('UP,DOWN,LEFT,RIGHT,W,A,S,D,SPACE') : null;
    bindCrashFeedback(this);
    this.events.on('crash-impact-lock', v => { this.locked = v; });
    this.events.once('shutdown', () => { Sfx.stopEngine(); this.road.destroy(); this.events.off('crash-impact-lock'); });
    this.game.events.on('hidden', this.onHidden, this);
    this.events.once('shutdown', () => this.game.events.off('hidden', this.onHidden, this));
    track('journey_leg_open', { leg: this.leg.id });
    this.intro();
    this.updateHud();
  }

  // --- HUD ------------------------------------------------------------------
  buildHud() {
    const v = viewBounds(this), d = 1000, leg = this.leg;
    const top = this.add.graphics().setDepth(d);
    top.fillStyle(C.navy, 0.88); top.fillRect(v.left, v.top, v.width, 100 - v.top);
    iconButton(this, 44, 40, 'back', () => this.pause(), { label: 'Pause' }).setDepth(d + 2);
    this.add.text(80, 40, leg.from + ' → ' + leg.to, { fontFamily: FONT, fontSize: '21px', color: '#FFFFFF', fontStyle: 'bold', resolution: 2 }).setOrigin(0, 0.5).setDepth(d + 1);
    soundToggle(this);
    this.add.text(24, 78, 'Leg ' + (this.legIndex + 1) + ' of ' + LEGS.length, { fontFamily: FONT, fontSize: '14px', color: '#B9C6D6', fontStyle: 'bold', resolution: 2 }).setOrigin(0, 0.5).setDepth(d + 1);
    this.distTxt = this.add.text(W - 24, 78, '', { fontFamily: FONT, fontSize: '14px', color: '#B9C6D6', fontStyle: 'bold', resolution: 2 }).setOrigin(1, 0.5).setDepth(d + 1);
    this.bar = this.add.graphics().setDepth(d + 1);

    // Speed panel: limit sign, km/h, safety.
    panel(this, 14, 106, W - 28, 92, { alpha: 0.82, r: 18 }).setDepth(d);
    this.limitG = this.add.graphics().setDepth(d + 1);
    this.limitTxt = T(this, 60, 146, '60', 24, '#111111').setDepth(d + 2);
    this.aheadTxt = T(this, 60, 186, '', 12, '#FFCB2B').setDepth(d + 2);
    this.speedTxt = this.add.text(108, 150, '0', { fontFamily: FONT, fontSize: '50px', color: '#FFFFFF', fontStyle: 'bold', resolution: 2 }).setOrigin(0, 0.5).setDepth(d + 1);
    this.kmhTxt = this.add.text(0, 162, 'km/h', { fontFamily: FONT, fontSize: '17px', color: '#B9C6D6', fontStyle: 'bold', resolution: 2 }).setOrigin(0, 0.5).setDepth(d + 1);
    this.safetyTxt = this.add.text(W - 32, 140, '100', { fontFamily: FONT, fontSize: '36px', color: '#7BE0A6', fontStyle: 'bold', resolution: 2 }).setOrigin(1, 0.5).setDepth(d + 1);
    this.add.text(W - 32, 176, '/100 safety', { fontFamily: FONT, fontSize: '14px', color: '#B9C6D6', fontStyle: 'bold', resolution: 2 }).setOrigin(1, 0.5).setDepth(d + 1);

    // Chips: fatigue, gap, vehicle, passport.
    const labels = ['Fatigue', 'Gap', 'Vehicle', 'Passport'], cw = (W - 28 - 18) / 4;
    this.chips = labels.map((l, i) => {
      const x = 14 + i * (cw + 6);
      panel(this, x, 206, cw, 54, { alpha: 0.82, r: 14 }).setDepth(d);
      this.add.text(x + cw / 2, 220, l, { fontFamily: FONT, fontSize: '12px', color: '#B9C6D6', fontStyle: 'bold', resolution: 2 }).setOrigin(0.5).setDepth(d + 1);
      return this.add.text(x + cw / 2, 242, '', { fontFamily: FONT, fontSize: '18px', color: '#FFFFFF', fontStyle: 'bold', resolution: 2 }).setOrigin(0.5).setDepth(d + 1);
    });

    // Alert pill and phone notification.
    this.alertBg = this.add.graphics().setDepth(d + 3);
    this.alertTxt = T(this, W / 2, 296, '', 18, '#FFFFFF', { wordWrap: { width: 420 }, align: 'center' }).setDepth(d + 4);
    this.phoneCard = null;
    this.restBtn = button(this, W / 2, 742, 340, 60, 'Rest here: 15 min break', () => this.rest(),
      { size: 21, fill: C.yellow, fillA: 1, color: '#0B1B2E' }).setDepth(d + 5).setVisible(false);
  }

  updateHud() {
    const st = this.sim.st, leg = this.leg, kmh = Math.round(st.v * 3.6);
    const left = Math.max(0, 1 - st.s / leg.length);
    this.distTxt.setText(leg.to + (leg.home ? ' (home)' : '') + '  ' + Math.ceil(left * leg.realKm) + ' km');
    this.bar.clear();
    const bw = this.distTxt.x - this.distTxt.width - 16 - 116;   // up to the distance label
    this.bar.fillStyle(0xFFFFFF, 0.15); this.bar.fillRoundedRect(116, 74, bw, 8, 4);
    this.bar.fillStyle(C.yellow, 1); this.bar.fillRoundedRect(116, 74, Math.max(8, bw * (1 - left)), 8, 4);

    this.limitG.clear();
    this.limitG.fillStyle(0xFFFFFF, 1); this.limitG.fillCircle(60, 146, 30);
    this.limitG.lineStyle(7, 0xD93A3F, 1); this.limitG.strokeCircle(60, 146, 26);
    if (this.limitTxt.text !== String(st.limit)) this.limitTxt.setText(String(st.limit));
    this.aheadTxt.setText(st.ahead ? st.ahead.limit + ' ahead' : '');
    this.speedTxt.setText(String(kmh)).setColor(st.speeding ? '#FF8A8D' : '#FFFFFF');
    this.kmhTxt.setX(this.speedTxt.x + this.speedTxt.width + 6);
    const s = Math.round(st.safety);
    this.safetyTxt.setText(String(s)).setColor(s >= 80 ? '#7BE0A6' : s >= 50 ? '#FFCB2B' : '#FF8A8D');

    const f = Math.round(st.fatigue), g = st.gap, veh = Math.round(st.vehicle);
    this.chips[0].setText(f + '%').setColor(f >= 75 ? '#FF8A8D' : f >= 50 ? '#FFCB2B' : '#FFFFFF');
    // Stopped or crawling behind a vehicle there is no time gap: show the distance instead.
    this.chips[1].setText(GAP_TEXT[g.state] || (g.seconds == null ? Math.round(g.m) + ' m' : g.seconds.toFixed(1) + ' s')).setColor(GAP_COL[g.state]);
    this.chips[2].setText(veh + '%').setColor(veh >= 70 ? '#FFFFFF' : veh >= 40 ? '#FFCB2B' : '#FF8A8D');
    this.chips[3].setText(journey.stampCount() + '/' + STAMPS.length);

    if (this.restBtn.visible !== st.canRest) { this.restBtn.setVisible(st.canRest); if (st.canRest) announce('Rest area. You can rest here.'); }
    if (st.phone && !this.phoneCard) this.showPhone(st.phone);
    if (!st.phone && this.phoneCard) { this.phoneCard.destroy(); this.phoneCard = null; }
    if (st.restAhead != null && st.fatigue >= 35 && !st.canRest && this.time.now > this.alertUntil) this.alert('Rest area in ' + Math.max(0, st.restAhead) + ' m: slow down and pull in', C.teal, 'rest');
    if (this.time.now > this.alertUntil && this.alertKey) { this.alertKey = null; this.alertBg.clear(); this.alertTxt.setText(''); }
  }

  alert(text, color, key) {
    this.alertKey = key || text;
    this.alertUntil = this.time.now + 2200;
    this.alertTxt.setText(text);
    const w = Math.min(500, this.alertTxt.width + 44), h = this.alertTxt.height + 22;
    this.alertBg.clear();
    this.alertBg.fillStyle(0x05080D, 0.9); this.alertBg.fillRoundedRect(W / 2 - w / 2, 296 - h / 2, w, h, 20);
    this.alertBg.lineStyle(3, color, 1); this.alertBg.strokeRoundedRect(W / 2 - w / 2, 296 - h / 2, w, h, 20);
  }

  showPhone(msg) {
    Sfx.tone(180, 0.12, 'square', 0.05); this.time.delayedCall(180, () => Sfx.tone(180, 0.12, 'square', 0.05));
    const c = this.add.container(0, 0).setDepth(1200);
    const bg = panel(this, 40, 330, W - 80, 128, { fill: 0xF4F6F9, alpha: 0.97, r: 20 });
    const g = this.add.graphics(); g.fillStyle(C.green, 1); g.fillRoundedRect(58, 346, 40, 40, 10);
    const from = this.add.text(110, 346, msg.from, { fontFamily: FONT, fontSize: '17px', color: '#0B1B2E', fontStyle: 'bold', resolution: 2 });
    const body = this.add.text(110, 370, msg.text, { fontFamily: FONT, fontSize: '16px', color: '#33414F', wordWrap: { width: W - 180 }, resolution: 2 });
    const read = button(this, W / 2 - 80, 428, 140, 40, 'Read', () => { this.sim.readPhone(); track('journey_phone', { read: true }); }, { size: 17, fill: 0x0B1B2E, fillA: 0.12, color: '#0B1B2E', r: 14 });
    const ignore = button(this, W / 2 + 80, 428, 140, 40, 'Ignore', () => { this.sim.ignorePhone(); track('journey_phone', { read: false }); this.alert('Good call. Messages can wait', C.green); }, { size: 17, fill: C.navy, fillA: 1, r: 14 });
    c.add([bg, g, from, body, read, ignore]);
    this.phoneCard = c;
    announce('Phone message from ' + msg.from + ': ' + msg.text);
  }

  // --- controls -------------------------------------------------------------
  buildControls() {
    const v = viewBounds(this), d = 1100, y = 880;
    const g = this.add.graphics().setDepth(d - 1);
    g.fillStyle(0x05080D, 0.55); g.fillRect(v.left, 820, v.width, v.bottom - 820);
    this.pedal('left', 54, y, 88, 104, 'steer_left', 'Steer left', d);
    this.pedal('brake', 172, y, 130, 112, 'BRAKE', 'Brake', d, C.red);
    // PETROL: what drivers in Namibia and South Africa call the accelerator.
    this.pedal('gas', W - 172, y, 130, 112, 'PETROL', 'Accelerate', d, C.green);
    this.pedal('right', W - 54, y, 88, 104, 'steer_right', 'Steer right', d);
  }

  pedal(id, x, y, w, h, label, a11y, depth, col) {
    const c = this.add.container(x, y).setDepth(depth);
    const g = this.add.graphics();
    const t = label.startsWith('steer') ? null : T(this, 0, 0, label, 22, '#FFFFFF');
    let focused = false;
    let drawn = null;
    const draw = force => {
      const on = !!(this.held[id] || (this.pulse[id] || 0) > this.time.now);
      if (on === drawn && !force) return;
      drawn = on;
      g.clear();
      g.fillStyle(col != null ? col : 0xFFFFFF, on ? 0.95 : col != null ? 0.55 : 0.16); g.fillRoundedRect(-w / 2, -h / 2, w, h, 18);
      g.lineStyle(2, 0xFFFFFF, on ? 0.9 : 0.35); g.strokeRoundedRect(-w / 2, -h / 2, w, h, 18);
      if (!t) {
        const dir = label === 'steer_left' ? -1 : 1;
        g.fillStyle(0xFFFFFF, 1); g.fillTriangle(dir * 18, 0, -dir * 12, -20, -dir * 12, 20);
      }
      if (focused) focusRing(g, -w / 2, -h / 2, w, h, 18);
      c.setScale(on ? 0.96 : 1);
    };
    const zone = this.add.zone(0, 0, w + 8, h + 8).setInteractive();
    zone.on('pointerdown', () => { Sfx.init(this); this.held[id] = true; });
    ['pointerup', 'pointerout', 'pointerupoutside'].forEach(ev => zone.on(ev, () => { this.held[id] = false; }));
    c.add(t ? [g, t, zone] : [g, zone]);
    // Keyboard and screen-reader users press repeatedly: each press holds it briefly.
    mirror(c, a11y, () => { Sfx.init(this); this.pulse[id] = this.time.now + (id === 'gas' ? 900 : id === 'brake' ? 700 : 380); },
      { onFocus: f => { focused = f; draw(true); }, testId: 'journey-' + id });
    c.draw = draw; draw(true);
    (this.pedals = this.pedals || []).push(c);
    return c;
  }

  readInput() {
    const k = this.keys, now = this.time.now, on = id => this.held[id] || (this.pulse[id] || 0) > now;
    const key = n => !!(k && k[n] && k[n].isDown);
    const gas = on('gas') || key('UP') || key('W'), brk = on('brake') || key('DOWN') || key('S') || key('SPACE');
    const left = on('left') || key('LEFT') || key('A'), right = on('right') || key('RIGHT') || key('D');
    return { throttle: gas && !brk ? 1 : 0, brake: brk ? 1 : 0, steer: (right ? 1 : 0) - (left ? 1 : 0) };
  }

  // --- flow -----------------------------------------------------------------
  intro() {
    const leg = this.leg, timeWord = { day: 'Afternoon', dusk: 'Dusk', night: 'Night' }[leg.time] + (leg.weather === 'rain' ? ', rain' : '');
    const lines = [leg.brief, 'Hold PETROL to drive and BRAKE to slow down. Your car keeps its lane: steer only if you drift. Keys: arrows or WASD.'];
    this.card(leg.from + ' → ' + leg.to, timeWord + '  ·  ' + leg.realKm + ' km', lines, [
      { label: 'Drive', primary: true, cb: () => { this.closeCard(); this.start(); } },
      { label: 'Back to route', cb: () => this.go('Journey') }
    ]);
  }

  start() {
    this.started = true;
    Sfx.init(this); Sfx.startEngine();
    track('journey_leg_start', { leg: this.leg.id });
    describe(this.leg.from + ' to ' + this.leg.to, ['Leg ' + (this.legIndex + 1) + ' of ' + LEGS.length + '. Use Accelerate and Brake. Steer left or right if you drift.']);
  }

  pause() {
    if (this.ended || this.overlay) return;
    this.paused = true; Sfx.stopEngine();
    this.card('Paused', this.leg.from + ' → ' + this.leg.to, ['Your journey so far is saved at the start of this leg.'], [
      { label: 'Resume', primary: true, cb: () => { this.closeCard(); this.paused = false; if (this.started) Sfx.startEngine(); } },
      { label: 'Restart this leg', cb: () => this.scene.restart({ leg: this.legIndex }) },
      { label: 'Back to route', cb: () => this.go('Journey') }
    ]);
  }

  onHidden() { if (this.started && !this.ended && !this.paused) this.pause(); }

  rest() {
    const r = this.sim.rest();
    if (!r) return;
    track('journey_rest', { leg: this.leg.id, before: r.before });
    this.restBtn.setVisible(false);
    this.paused = true; Sfx.stopEngine();
    this.card('Rest stop', 'Fatigue ' + r.before + '% → ' + r.after + '%', [
      r.before >= 40 ? 'Good decision. A short sleep and a stretch is what works when you are tired.' : 'A break before you feel tired keeps you sharp for longer.',
      'Plan a stop about every two hours on long trips.'
    ], [{ label: 'Back on the road', primary: true, cb: () => { this.closeCard(); this.paused = false; Sfx.startEngine(); } }]);
  }

  update(time, delta) {
    if (this.pedals) this.pedals.forEach(p => p.draw());
    if (!this.started || this.paused || this.ended) { this.road.update(0); return; }
    const dt = animationSeconds(delta, this.game.loop.rawDelta);
    const input = this.auto ? autopilot(this.sim) : this.locked ? { throttle: 0, brake: 0, steer: 0 } : this.readInput();
    const events = this.sim.step(dt, input);
    events.forEach(e => this.handle(e));
    this.road.update(dt);
    if (!this.ended) this.updateHud();
    Sfx.setEngine(this.sim.st.v * 3.6);
    if (this.sim.st.rumble && !REDUCE_MOTION && Math.random() < 0.2) Sfx.noise(0.08, 0.08, 180);
  }

  handle(e) {
    if (e.type === 'crash') {
      Sfx.impact(clamp(e.kmh / 120, 0.2, 1));
      crashImpact(this, e.kmh);
      if (!REDUCE_MOTION) { this.cameras.main.shake(e.serious ? 420 : 200, e.serious ? 0.016 : 0.006); if (e.serious) this.cameras.main.flash(160, 255, 240, 220); }
      if (!e.serious) this.alert('Collision at ' + e.kmh + ' km/h! Your car is damaged', C.red, 'crash');
      track('journey_crash', { leg: this.leg.id, kind: e.kind, kmh: e.kmh, serious: e.serious });
      return;
    }
    if (e.type === 'finish') { this.finish(); return; }
    if (e.type === 'over') { this.time.delayedCall(REDUCE_MOTION ? 0 : 900, () => this.finish()); this.ended = true; Sfx.stopEngine(); return; }
    if (e.type === 'pothole') Sfx.noise(0.2, 0.3, 300);
    if (e.type === 'microsleep' || e.type === 'leadBrake' || e.type === 'tooClose') Sfx.chime(false);
    const a = ALERTS[e.type];
    if (a) { const [text, col] = a(e); this.alert(text, col, e.type); announce(text); }
  }

  finish() {
    if (this.resultShown) return;
    this.resultShown = true; this.ended = true;
    Sfx.stopEngine();
    const r = this.sim.result(), leg = this.leg;
    const fresh = journey.finishLeg(this.legIndex, r);
    track('journey_leg_end', { leg: leg.id, finished: r.finished, safety: r.safety, over: r.over && r.over.reason, stamps: fresh });
    const stampNames = fresh.map(id => STAMPS.find(s => s.id === id).label);
    const stats = 'Safety ' + r.safety + '/100   ·   Vehicle ' + r.vehicle + '%   ·   Fatigue ' + r.fatigue + '%';
    if (r.finished) {
      Sfx.chime(true);
      const done = journey.run() && journey.run().complete;
      this.card(leg.home ? 'You made it home' : 'Welcome to ' + leg.to, stats,
        [...(stampNames.length ? ['New stamps: ' + stampNames.join(', ')] : []), ...r.issues.slice(0, 2)], [
          { label: done ? 'See your journey' : 'Continue the journey', primary: true, cb: () => this.go('Journey', { arrived: leg.id }) },
          { label: 'Drive this leg again', cb: () => this.scene.restart({ leg: this.legIndex }) }
        ], fresh);
    } else {
      const reason = r.over ? (r.over.reason === 'crash' ? r.over.kind : r.over.reason) : 'safety';
      this.card(r.over && r.over.reason === 'crash' ? 'Crash: the journey stops here' : 'The journey stops here', stats,
        [OVER_COPY[reason](r.over || {}), ...(stampNames.length ? ['New stamps: ' + stampNames.join(', ')] : [])], [
          { label: 'Try this leg again', primary: true, cb: () => this.scene.restart({ leg: this.legIndex }) },
          { label: 'Back to route', cb: () => this.go('Journey') }
        ], fresh);
    }
  }

  /** Centred card with a heading, a sub-line, body lines, optional new stamps and buttons. */
  card(title, sub, lines, actions, stamps) {
    this.closeCard();
    const v = viewBounds(this), o = this.add.container(0, 0).setDepth(4000);
    const dim = this.add.rectangle(W / 2, H / 2, v.width, v.height, 0x05080D, 0.72);
    const block = this.add.zone(W / 2, H / 2, v.width, v.height).setInteractive();
    o.add([dim, block]);
    const x0 = 34, w = W - 68, inner = w - 48;
    const items = [];
    let y = 0;
    const text = (str, size, color, bold) => {
      const t = this.add.text(x0 + 24, y, str, { fontFamily: FONT, fontSize: size + 'px', color, fontStyle: bold ? 'bold' : 'normal', wordWrap: { width: inner }, lineSpacing: 4, resolution: 2 });
      items.push(t); y += t.height; return t;
    };
    y += 26; text(title, 28, '#FFFFFF', true); y += 6;
    text(sub, 16, '#FFCB2B', true); y += 14;
    if (stamps && stamps.length) {
      const g = this.add.graphics(); items.push(g);
      stamps.forEach((id, i) => {
        const s = STAMPS.find(x => x.id === id), cx = x0 + 24 + 30 + i * 70;
        g.lineStyle(3, C.yellow, 1); g.strokeCircle(cx, y + 30, 28); g.fillStyle(C.navy2, 1); g.fillCircle(cx, y + 30, 24);
        drawIcon(g, s.icon, cx, y + 30, 28, C.yellow);
      });
      y += 72;
    }
    lines.forEach(l => { text(l, 18, '#DDE6F0'); y += 10; });
    y += 8;
    actions.forEach(a => {
      const b = button(this, W / 2, y + 30, inner, 56, a.label, a.cb, a.primary ? { size: 22, fill: C.yellow, fillA: 1, color: '#0B1B2E' } : { size: 19, stroke: 0xFFFFFF });
      items.push(b); y += 68;
    });
    y += 14;
    const top = clamp((H - y) / 2, 110, H - y - 10);
    const bg = panel(this, x0, top, w, y, { alpha: 0.97, stroke: 0xFFFFFF, strokeA: 0.12 });
    o.add(bg);
    items.forEach(it => { it.y += top; o.add(it); });
    this.overlay = o;
    describe(title, [sub, ...lines]);
    if (!REDUCE_MOTION) { o.setAlpha(0); this.tweens.add({ targets: o, alpha: 1, duration: 180 }); }
  }

  closeCard() { if (this.overlay) { this.overlay.destroy(); this.overlay = null; } }

  go(key, data) {
    if (this.leaving) return; this.leaving = true;
    Sfx.stopEngine();
    this.cameras.main.fadeOut(220, 8, 17, 30);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(key, data));
  }
}
