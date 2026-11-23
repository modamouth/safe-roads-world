import { W, COLORS as C, FONT, track, clamp, REDUCE_MOTION } from '../config.js';
import { viewBounds, T, iconButton, soundToggle, panel, setupCam, focusRing } from '../ui.js';
import { mirror, describe, announce } from '../a11y.js';
import { loadImage } from '../imageAssets.js';
import { Sfx } from '../sfx.js';
import { LEARNING_LAB_ASSETS as A } from '../lab/assets.js';
import { animationSeconds } from '../lab/core/time.js';
import { bindCrashFeedback } from '../services/crashFeedbackScene.js';
import { experienceById } from '../experiences.js';
import { peopleOf } from '../journey/route.js';
import { createLegSim, ROAD } from '../journey/sim.js';
import { createRoad } from '../journey/road.js';
import { CITY_LEG, CITY_STAMP, ENCOUNTERS, MAX_PER, createCityRun, cityDriver, placeAt } from '../city/mission.js';
import { city } from '../city/progress.js';
import JourneyDrive from './JourneyDrive.js';

// Windhoek City · City Safety Run: four encounters on a city street, scored out of
// 100 (see city/mission.js). Reuses the Journey drive scene's pedals, cards, pause
// and road renderer; adds an indicator, a rear-view mirror and encounter scoring.
// Start with { from: i, run } to retry from just before encounter i (run carries
// the first-attempt scores); with no data it is a fresh run.
const ART = [A.scenery.bush, A.scenery.lamp, A.scenery.post, A.oncomingTruck, A.vehicle, ...Object.values(A.vehicles), ...Object.values(A.trafficLight)];
const ALL_CHECKS = { tyres: true, lights: true, belts: true, phone: true };
const SHORT = ['Pull out', 'Crossing', 'Taxi', 'Lights'];
const ALERTS = {
  forcedBrake: () => ['The bakkie had to brake hard!', C.red],
  pedestrian: () => ['Pedestrian crossing: stop and let her cross', C.orange],
  leadSignal: () => ['The taxi is indicating: it is pulling in to stop', C.orange],
  leadBrake: () => ['The taxi is stopping', C.red],
  tooClose: () => ['Too close! Keep a 3-second gap', C.red],
  green: () => ['Green: go when the junction is clear', C.green],
  speeding: e => ['Speeding: the limit here is ' + e.limit, C.red]
};

export default class CityRun extends JourneyDrive {
  constructor() { super('CityRun'); }

  init(data) {
    data = data || {};
    this.from = clamp(data.from || 0, 0, ENCOUNTERS.length - 1);
    this.run = data.run && data.from != null ? data.run : createCityRun();
    this.retry = !!data.run;
    // The card and stamp helpers read the stamps from this.r.
    this.r = { id: 'city', stamps: [CITY_STAMP], legs: [CITY_LEG] };
    this.leg = CITY_LEG; this.legIndex = 0;
  }

  preload() {
    this.load.setPath(import.meta.env.BASE_URL);
    const people = peopleOf(CITY_LEG).flatMap(who => Object.values(A.pedestrians[who]));
    [...ART, ...people].forEach(a => { if (!this.textures.exists(a.key)) loadImage(this, a.key, a.path); });
    this.load.on('loaderror', () => {});
  }

  create() {
    setupCam(this);
    Sfx.init(this);
    this.cameras.main.fadeIn(250, 0, 0, 0);
    Object.assign(this, { leaving: false, started: false, paused: false, ended: false, resultShown: false, locked: false, resting: false,
      overlay: null, alertUntil: 0, alertKey: null, pulse: {}, held: {}, pedals: [], signalOn: false, coachUntil: 0 });
    this.input.addPointer(2);
    this.sim = placeAt(createLegSim(CITY_LEG, { checks: ALL_CHECKS }, { seed: 7 }), this.from);
    this.run.attach(this.sim, this.from);
    this.road = createRoad(this, { leg: CITY_LEG, sim: this.sim, lights: true });
    this.auto = import.meta.env.DEV && new URLSearchParams(window.location.search).get('autopilot') === '1';

    this.buildHud();
    this.buildControls();
    this.keys = this.input.keyboard ? this.input.keyboard.addKeys('UP,DOWN,LEFT,RIGHT,W,A,S,D,SPACE') : null;
    // One toggle per press: ignore key repeat (and a duplicate event for the same press).
    let lastKey = -1e9;
    if (this.input.keyboard) this.input.keyboard.on('keydown-E', ev => { if ((ev && ev.repeat) || this.time.now - lastKey < 250) return; lastKey = this.time.now; this.toggleSignal(); });
    bindCrashFeedback(this);
    this.events.on('crash-impact-lock', v => { this.locked = v; });
    this.events.once('shutdown', () => { Sfx.stopEngine(); this.road.destroy(); this.events.off('crash-impact-lock'); if (this.input.keyboard) this.input.keyboard.off('keydown-E'); });
    this.game.events.on('hidden', this.onHidden, this);
    this.events.once('shutdown', () => this.game.events.off('hidden', this.onHidden, this));
    track('city_open', { from: this.from, retry: this.retry });
    this.intro();
    this.updateHud();
  }

  // --- HUD ------------------------------------------------------------------
  buildHud() {
    const v = viewBounds(this), d = 1000;
    const top = this.add.graphics().setDepth(d);
    top.fillStyle(C.navy, 0.88); top.fillRect(v.left, v.top, v.width, 100 - v.top);
    iconButton(this, 44, 40, 'back', () => this.pause(), { label: 'Pause' }).setDepth(d + 2);
    this.add.text(80, 40, 'City Safety Run', { fontFamily: FONT, fontSize: '21px', color: '#FFFFFF', fontStyle: 'bold', resolution: 2 }).setOrigin(0, 0.5).setDepth(d + 1);
    soundToggle(this);
    this.encTxt = this.add.text(24, 78, '', { fontFamily: FONT, fontSize: '14px', color: '#B9C6D6', fontStyle: 'bold', resolution: 2 }).setOrigin(0, 0.5).setDepth(d + 1);

    // Speed panel: limit sign, km/h, score so far.
    panel(this, 14, 106, W - 28, 92, { alpha: 0.82, r: 18 }).setDepth(d);
    const lg = this.add.graphics().setDepth(d + 1);
    lg.fillStyle(0xFFFFFF, 1); lg.fillCircle(60, 146, 30); lg.lineStyle(7, 0xD93A3F, 1); lg.strokeCircle(60, 146, 26);
    T(this, 60, 146, String(CITY_LEG.zones[0].limit), 24, '#111111').setDepth(d + 2);
    this.speedTxt = this.add.text(108, 150, '0', { fontFamily: FONT, fontSize: '50px', color: '#FFFFFF', fontStyle: 'bold', resolution: 2 }).setOrigin(0, 0.5).setDepth(d + 1);
    this.kmhTxt = this.add.text(0, 162, 'km/h', { fontFamily: FONT, fontSize: '17px', color: '#B9C6D6', fontStyle: 'bold', resolution: 2 }).setOrigin(0, 0.5).setDepth(d + 1);
    this.safetyTxt = this.add.text(W - 32, 140, '0', { fontFamily: FONT, fontSize: '36px', color: '#7BE0A6', fontStyle: 'bold', resolution: 2 }).setOrigin(1, 0.5).setDepth(d + 1);
    this.add.text(W - 32, 176, '/100 score', { fontFamily: FONT, fontSize: '14px', color: '#B9C6D6', fontStyle: 'bold', resolution: 2 }).setOrigin(1, 0.5).setDepth(d + 1);

    // One chip per encounter: its first-attempt score.
    const cw = (W - 28 - 18) / 4;
    this.chipBg = this.add.graphics().setDepth(d);
    this.chips = SHORT.map((l, i) => {
      const x = 14 + i * (cw + 6);
      this.add.text(x + cw / 2, 220, l, { fontFamily: FONT, fontSize: '12px', color: '#B9C6D6', fontStyle: 'bold', resolution: 2 }).setOrigin(0.5).setDepth(d + 1);
      return this.add.text(x + cw / 2, 242, '', { fontFamily: FONT, fontSize: '18px', color: '#FFFFFF', fontStyle: 'bold', resolution: 2 }).setOrigin(0.5).setDepth(d + 1);
    });
    this.chipW = cw;

    // Alert pill (above the horizon, so the road stays clear).
    this.alertBg = this.add.graphics().setDepth(d + 3);
    this.alertTxt = T(this, W / 2, 296, '', 18, '#FFFFFF', { wordWrap: { width: 420 }, align: 'center' }).setDepth(d + 4);
    this.buildRearView(d + 2);
  }

  // A rear-view mirror, top centre: shows a vehicle coming up behind you.
  buildRearView(depth) {
    const w = 170, h = 52, x = W / 2, y = 350, c = this.add.container(x, y).setDepth(depth);
    const g = this.add.graphics();
    g.fillStyle(0x111418, 1); g.fillRoundedRect(-w / 2 - 5, -h / 2 - 5, w + 10, h + 10, 14);
    g.fillGradientStyle(0x9DC3E0, 0x9DC3E0, 0xC9C0AF, 0xC9C0AF, 1); g.fillRoundedRect(-w / 2, -h / 2, w, h, 10);
    g.fillStyle(0x4E4B47, 1); g.fillTriangle(-w / 2 + 6, h / 2, w / 2 - 6, h / 2, 0, -h / 2 + 12);
    g.fillStyle(0xF4F4F4, 0.8); g.fillRect(-1, -2, 2, 8); g.fillRect(-1, 14, 2, 8);
    const veh = this.textures.exists('img_truck') ? this.add.image(0, 0, 'img_truck').setOrigin(0.5, 1) : null;
    const lbl = this.add.text(-w / 2 + 6, -h / 2 + 3, 'MIRROR', { fontFamily: FONT, fontSize: '9px', color: '#0B1B2E', fontStyle: 'bold', resolution: 2 });
    c.add(veh ? [g, veh, lbl] : [g, lbl]);
    const mask = this.make.graphics({}, false); mask.fillStyle(0xFFFFFF); mask.fillRoundedRect(x - w / 2, y - h / 2, w, h, 10);
    if (veh) veh.setMask(mask.createGeometryMask());
    this.rear = { c, veh, w, h };
    c.setVisible(false);
  }

  updateRearView() {
    const st = this.sim.st, b = this.sim.ents.leads.find(l => l.fromBehind && !l.gone && l.s + l.len < st.s);
    const gap = b ? (st.s - 4.5) - (b.s + b.len) : Infinity, show = gap < 160 || st.parked;
    this.rear.c.setVisible(show);
    if (!this.rear.veh) return;
    this.rear.veh.setVisible(gap < 160);
    if (gap < 160) {
      const k = clamp(16 / Math.max(4, gap), 0.08, 1.2);
      // Mirrored: a vehicle behind on your right shows on the right of the mirror.
      this.rear.veh.setScale(k * 0.32).setPosition(clamp((b.x - st.x) * 9 * k, -60, 60), this.rear.h / 2 - 4 + (1 - k) * -14);
    }
  }

  updateHud() {
    const st = this.sim.st, kmh = Math.round(st.v * 3.6), i = this.run.index(), res = this.run.results();
    this.encTxt.setText(i < ENCOUNTERS.length ? 'Encounter ' + (i + 1) + ' of 4 · ' + ENCOUNTERS[i].title : 'All four encounters done');
    this.speedTxt.setText(String(kmh)).setColor(st.speeding ? '#FF8A8D' : '#FFFFFF');
    this.kmhTxt.setX(this.speedTxt.x + this.speedTxt.width + 6);
    this.safetyTxt.setText(String(this.run.total()));
    this.chipBg.clear();
    res.forEach((r, k) => {
      const x = 14 + k * (this.chipW + 6), now = k === i;
      this.chipBg.fillStyle(C.navy2, 0.88); this.chipBg.fillRoundedRect(x, 206, this.chipW, 54, 14);
      if (now) { this.chipBg.lineStyle(2, C.yellow, 1); this.chipBg.strokeRoundedRect(x, 206, this.chipW, 54, 14); }
      const txt = r.failedFirst ? '✗ 0' : r.first != null ? r.first + '' : now ? '…' : '–';
      this.chips[k].setText(txt).setColor(r.failedFirst ? '#FF8A8D' : r.first === MAX_PER ? '#7BE0A6' : r.first != null ? '#FFCB2B' : '#FFFFFF');
    });
    // The indicator cancels itself once you are back in the lane.
    if (this.signalOn && !st.parked && Math.abs(st.x - ROAD.LANE) < 0.2 && st.s > 5) this.toggleSignal(false);
    this.updateRearView();
    // The first encounter's coaching, until you move off.
    if (this.started && st.parked && this.time.now > this.alertUntil) {
      const b = this.sim.ents.leads.find(l => l.fromBehind && !l.gone), passed = !b || b.s > st.s + 2;
      this.alert(!this.signalOn ? 'Tap ➜ to indicate, and check your mirror' : passed ? 'Clear behind. Hold PETROL to pull out' : 'Wait: a bakkie is coming up behind you', C.teal, 'coach');
    }
    if (this.time.now > this.alertUntil && this.alertKey) { this.alertKey = null; this.alertBg.clear(); this.alertTxt.setText(''); }
  }

  // --- controls -------------------------------------------------------------
  buildControls() {
    super.buildControls();
    // The indicator, between BRAKE and PETROL.
    const x = W / 2, y = 880, w = 58, h = 104, c = this.add.container(x, y).setDepth(1100), g = this.add.graphics();
    let focused = false;
    const draw = () => {
      const on = this.signalOn, lit = on && (REDUCE_MOTION || Math.floor(this.time.now / 400) % 2 === 0);
      g.clear();
      g.fillStyle(0xFFB020, on ? 0.35 : 0.16); g.fillRoundedRect(-w / 2, -h / 2, w, h, 16);
      g.lineStyle(2, on ? 0xFFB020 : 0xFFFFFF, on ? 1 : 0.35); g.strokeRoundedRect(-w / 2, -h / 2, w, h, 16);
      g.fillStyle(lit ? 0xFFD24A : 0xFFFFFF, lit ? 1 : 0.8); g.fillTriangle(16, -8, 0, -24, 0, 8); g.fillRect(-16, -14, 17, 12);
      if (focused) focusRing(g, -w / 2, -h / 2, w, h, 16);
    };
    const lbl = T(this, 0, 30, 'SIGNAL', 11, '#FFFFFF');
    const zone = this.add.zone(0, 0, w + 6, h + 6).setInteractive({ useHandCursor: true });
    zone.on('pointerup', () => this.toggleSignal());
    c.add([g, lbl, zone]);
    mirror(c, 'Indicate right', () => this.toggleSignal(), { onFocus: f => { focused = f; draw(); }, isPressed: () => this.signalOn, testId: 'city-signal' });
    c.draw = draw; draw();
    this.pedals.push(c);
  }

  toggleSignal(on) {
    this.signalOn = on != null ? on : !this.signalOn;
    if (on == null) { Sfx.init(this); Sfx.tone(this.signalOn ? 900 : 600, 0.05, 'square', 0.04); announce(this.signalOn ? 'Indicating right' : 'Indicator off'); }
  }

  readInput() { return { ...super.readInput(), signal: this.signalOn ? 'right' : null }; }

  // --- flow -----------------------------------------------------------------
  intro() {
    const e = ENCOUNTERS[this.from];
    const lines = this.retry
      ? ['Practice from just before this encounter. Your first-attempt score is kept for the results.', e.tip]
      : [CITY_LEG.brief, 'Four encounters, 25 points each, for reading the road early and responding safely. No time bonus.',
        'You start parked at the kerb. Tap ➜ SIGNAL to indicate, watch the mirror, then hold PETROL: the car pulls into the lane. Keys: arrows or WASD, E to indicate.'];
    this.card(this.retry ? 'Retry: ' + e.title : 'City Safety Run', this.retry ? 'Encounter ' + (this.from + 1) + ' of 4' : 'Windhoek CBD  ·  about 2 minutes', lines, [
      { label: 'Drive', primary: true, cb: () => { this.closeCard(); this.start(); } },
      { label: 'Back to Map', cb: () => this.go('Map', { select: 'windhoek' }) }
    ]);
  }

  start() {
    this.started = true;
    Sfx.init(this); Sfx.startEngine();
    track('city_start', { from: this.from });
    describe('City Safety Run', ['Encounter ' + (this.from + 1) + ' of 4: ' + ENCOUNTERS[this.from].title + '. Use Accelerate and Brake; Indicate right to signal.']);
  }

  pause() {
    if (this.ended || this.overlay) return;
    this.paused = true; Sfx.stopEngine();
    const i = Math.min(this.run.index(), ENCOUNTERS.length - 1);
    this.card('Paused', 'Encounter ' + (i + 1) + ' of 4 · ' + ENCOUNTERS[i].title, ['Leaving now ends this run.'], [
      { label: 'Resume', primary: true, cb: () => { this.closeCard(); this.paused = false; if (this.started) Sfx.startEngine(); } },
      { label: 'Restart this encounter', cb: () => this.scene.restart({ from: i, run: this.run }) },
      { label: 'Back to Map', cb: () => this.go('Map', { select: 'windhoek' }) }
    ]);
  }

  update(time, delta) {
    this.pedals.forEach(p => p.draw());
    if (!this.started || this.paused || this.ended) { this.road.update(0); return; }
    const dt = animationSeconds(delta, this.game.loop.rawDelta);
    const input = this.auto ? cityDriver(this.sim) : this.locked ? { throttle: 0, brake: 0, steer: 0, signal: this.signalOn ? 'right' : null } : this.readInput();
    if (this.auto && input.signal && !this.signalOn) this.toggleSignal(true);
    const events = this.sim.step(dt, input);
    events.forEach(e => this.handle(e));
    this.run.step(input, events).forEach(o => this.judged(o));
    this.road.update(dt);
    if (!this.ended) this.updateHud();
    Sfx.setEngine(this.sim.st.v * 3.6);
  }

  handle(e) {
    if (e.type === 'crash') { super.handle(e); return; }
    if (e.type === 'finish') { if (this.run.done()) this.results(); return; }
    if (e.type === 'leadBrake' || e.type === 'tooClose' || e.type === 'forcedBrake') Sfx.chime(false);
    const a = ALERTS[e.type];
    if (a && !(e.type === 'speeding' && this.alertKey === 'feedback')) { const [text, col] = a(e); this.alert(text, col, e.type); announce(text); }
  }

  /** The judge finished an encounter: show what the player did, or explain the failure. */
  judged(o) {
    if (o.type === 'done') {
      Sfx.chime(true);
      const text = (o.first ? '+' + o.score + '  ·  ' : 'Practice: ' + o.score + '/25  ·  ') + o.lines[0];
      this.alert(text, o.score >= 20 ? C.green : C.orange, 'feedback');
      this.alertUntil = this.time.now + 3600;
      announce(ENCOUNTERS[o.index].title + ': ' + o.score + ' of 25. ' + o.lines.join(' '));
      track('city_encounter', { id: o.id, score: o.score, first: o.first });
      return;
    }
    // Failed: stop the drive, explain, and offer a retry from just before it.
    this.ended = true; Sfx.stopEngine();
    track('city_fail', { id: o.id, reason: o.reason });
    this.time.delayedCall(REDUCE_MOTION ? 0 : 800, () => {
      const r = this.run.results()[o.index];
      this.card('Encounter ' + (o.index + 1) + ': ' + ENCOUNTERS[o.index].title, r.failedFirst && !this.retry ? 'First attempt: 0/25' : 'Not safe this time', [o.text, 'Try it again from just before this encounter. Your first-attempt score stays the same.'], [
        { label: 'Retry this encounter', primary: true, cb: () => this.scene.restart({ from: o.index, run: this.run }) },
        { label: 'Back to Map', cb: () => this.go('Map', { select: 'windhoek' }) }
      ]);
    });
  }

  results() {
    if (this.resultShown) return;
    this.resultShown = true; this.ended = true; Sfx.stopEngine(); Sfx.chime(true);
    const res = this.run.results(), total = this.run.total(), safe = this.run.safeRun();
    const fresh = city.finishRun(total, res.map(r => r.first || 0), safe);
    track('city_end', { total, safe, scores: res.map(r => r.first || 0), stamps: fresh });
    const w = this.run.weakest(), weak = ENCOUNTERS[w], exp = experienceById(weak.lab.slug);
    const lines = res.map((r, k) => (k + 1) + '. ' + r.title + ':  ' + (r.first || 0) + '/25' + (r.failedFirst ? '  (retried)' : ''));
    lines.push('Tip: ' + ((res[w].first || 0) < MAX_PER ? weak.tip : 'Keep reading the road early: it is what made every encounter safe.'));
    if (fresh.length) lines.unshift('New stamp: ' + CITY_STAMP.label);
    else if (!safe) lines.push('Complete all four safely on the first attempt to earn the ' + CITY_STAMP.label + ' stamp.');
    const actions = [{ label: 'Replay', primary: true, cb: () => this.scene.restart({}) }];
    if ((res[w].first || 0) < MAX_PER && exp && exp.status === 'playable') actions.push({ label: 'Practise in the Lab: ' + exp.label, cb: () => this.go('LabRunner', { slug: exp.id }) });
    actions.push({ label: 'Passport', cb: () => this.go('Passport') }, { label: 'Back to Map', cb: () => this.go('Map', { select: 'windhoek' }) });
    this.card('City Safety Run: ' + total + '/100', safe ? 'All four safe on the first attempt' : 'Best score ' + city.best() + '/100', lines, actions, fresh);
  }
}
