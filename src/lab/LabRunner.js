// ---------------------------------------------------------------------------
// Learning Lab engine: one Phaser scene that plays any experience from its
// content file (content/learning-lab/<slug>/en.json).
//
// Screens, chosen by data.screen:
//   intro     experience overview and topic picker (with resume)
//   notice    content notice before topics that touch serious injury
//   scene     one scene of a topic, drawn by the renderer for its type
//   complete  topic finished: Passport stamp, next topic
// Start with: this.scene.start('LabRunner', { slug: 'speed' })
// Progress saves after every scene, so a player can leave and resume.
// ---------------------------------------------------------------------------
import Phaser from 'phaser';
import { W, H, COLORS as C, state, REDUCE_MOTION } from '../config.js';
import { setupCam, duskBg, T, button, soundToggle, iconButton } from '../ui.js';
import { drawIcon } from '../icons.js';
import { Sfx } from '../sfx.js';
import { describe, announce, mirror } from '../a11y.js';
import { QUALITY } from '../quality.js';
import { TYPE, INK, SPACE, BAND } from '../theme.js';
import { experience, claim, text, t, sourceLine, hasUnverified, RELEASE, DAGGER } from './content.js';
import { resolveParams } from './core/format.js';
import { buildFlow, needsNotice, topicOf, nextTopic } from './core/flow.js';
import { labEvent, progress, labPoints } from './analytics.js';
import { RENDERERS } from './renderers/index.js';
import { loadArt, DEFAULT_AREA } from './art/index.js';
import { para, heading, footnote } from './kit.js';

// Player-facing strings inside art params; their {claim:...} tokens are filled before the art sees them.
const LABEL_KEYS = new Set(['label', 'name', 'caption', 'title', 'text']);

export default class LabRunner extends Phaser.Scene {
  constructor() { super('LabRunner'); }

  create(data) {
    setupCam(this);
    Sfx.init(this);
    this.cameras.main.fadeIn(220, 8, 17, 30);
    this.leaving = false; this.arts = []; this.foot = null; // scene instances are reused between visits
    this.d = data || {};
    this.exp = experience(this.d.slug);
    duskBg(this);
    this.layer = this.add.container(0, 0).setDepth(10);
    this.events.once('shutdown', () => { this.arts.slice().forEach(a => a.destroy()); this.arts = []; });
    if (!this.exp) { this.chrome(() => this.go('LabMenu')); T(this, W / 2, H / 2, t('lab.missing'), 26, INK.strong); return; }

    const screen = this.d.screen || 'intro';
    if (screen === 'intro') this.intro();
    else if (screen === 'notice') this.notice();
    else if (screen === 'complete') this.complete();
    else this.runScene();
  }

  update(time, delta) {
    const dt = Math.min(delta / 1000, 0.1);   // slow devices: let animations catch up rather than run in slow motion
    for (const a of this.arts) if (a.update) a.update(time, dt);
  }

  // --- navigation ----------------------------------------------------------------
  go(key, data) {
    if (this.leaving) return; this.leaving = true;
    this.cameras.main.fadeOut(200, 8, 17, 30);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(key, data));
  }
  open(data) { this.go('LabRunner', Object.assign({ slug: this.exp.slug }, data)); }

  chrome(onBack, step) {
    iconButton(this, 44, 44, 'back', onBack, { label: t('lab.back') }).setDepth(2000);
    soundToggle(this);
    if (step) {
      const bw = 180, x = W / 2 - bw / 2, g = this.add.graphics().setDepth(2000);
      g.fillStyle(0xFFFFFF, 0.16); g.fillRoundedRect(x, 40, bw, 8, 4);
      g.fillStyle(C.yellow, 1); g.fillRoundedRect(x, 40, Math.max(8, bw * step.n / step.of), 8, 4);
      T(this, W / 2, 64, t('lab.step', { n: step.n, of: step.of }), TYPE.tiny, INK.muted, { fontStyle: 'normal', resolution: QUALITY.textRes }).setDepth(2000);
    }
  }

  // --- intro: experience overview and topics ----------------------------------------------
  intro() {
    const e = this.exp, L = this.layer;
    this.chrome(() => this.go('LabMenu'));
    labEvent('experience_intro', { exp: e });
    const g = this.add.graphics(); L.add(g);
    drawIcon(g, e.icon, W / 2, 168, 80, 0xFFFFFF);
    const h = heading(this, L, text(e.title), 222, TYPE.display);
    const hl = para(this, L, text(e.headline), h.y + h.height + 8, { size: TYPE.lead, color: INK.accent, bold: true });
    const body = para(this, L, text(e.intro), hl.y + hl.height + 18, { size: TYPE.body });
    let y = body.y + body.height + 26;
    if (!RELEASE && e.status !== 'approved') {
      L.add(T(this, W / 2, y, t('lab.draftBadge'), TYPE.tiny, '#FFB54A', { resolution: QUALITY.textRes }));
      y += 30;
    }
    describe(text(e.title), [text(e.headline), text(e.intro)]);

    const start = topic => {
      const tp = progress.topic(e.slug, topic.id, e.version);
      if (tp.done && !tp.at) progress.restart(e.slug, topic.id, e.version);
      const at = progress.topic(e.slug, topic.id, e.version).at;
      labEvent(at ? 'topic_resumed' : 'topic_started', { exp: e, topic }, { at });
      if (!at && needsNotice(e, topic.id)) this.open({ screen: 'notice', topic: topic.id });
      else this.open({ screen: 'scene', topic: topic.id, at });
    };

    if (e.topics.length === 1) {
      const tp = e.topics[0], rec = progress.topic(e.slug, tp.id, e.version);
      const label = rec.at ? t('lab.resume') : rec.done ? t('lab.playAgain') : t('lab.start');
      button(this, W / 2, Math.max(y + 60, 760), 300, 68, label, () => start(tp), { size: 24, fill: C.yellow, fillA: 1, color: INK.dark });
      if (rec.at) button(this, W / 2, Math.max(y + 140, 840), 260, 56, t('lab.startOver'), () => { progress.restart(e.slug, tp.id, e.version); start(tp); }, { size: 19, stroke: 0xFFFFFF });
      if (rec.done) L.add(T(this, W / 2, Math.max(y + 10, 710), t('lab.stamped'), TYPE.small, '#4ED18A', { resolution: QUALITY.textRes }));
      return;
    }

    L.add(T(this, W / 2, y + 4, t('lab.pickTopic'), TYPE.lead, INK.muted, { resolution: QUALITY.textRes }));
    const n = e.topics.length, cols = n <= 2 ? n : 2, gap = 14;
    const tw = (W - SPACE.gutter * 2 - gap * (cols - 1)) / cols, th = n > 2 ? 112 : 150;
    const y0 = Math.min(y + 34, H - 40 - Math.ceil(n / cols) * (th + gap));
    e.topics.forEach((tp, i) => {
      const x = SPACE.gutter + (i % cols) * (tw + gap), ty = y0 + Math.floor(i / cols) * (th + gap);
      const rec = progress.topic(e.slug, tp.id, e.version);
      const status = rec.at ? t('lab.resume') : rec.done ? '✓ ' + t('lab.done') : t('lab.start');
      this.topicTile(tp, x, ty, tw, th, status, rec.done, () => start(tp));
    });
  }

  topicTile(tp, x, y, w, h, status, done, onTap) {
    const c = this.add.container(0, 0); this.layer.add(c);
    const g = this.add.graphics(); c.add(g);
    let hi = false, focused = false;
    const draw = () => {
      g.clear();
      g.fillStyle(C.navy2, hi ? 1 : 0.94); g.fillRoundedRect(x, y, w, h, 18);
      g.lineStyle(2, done ? 0x4ED18A : C.yellow, hi ? 1 : 0.85); g.strokeRoundedRect(x, y, w, h, 18);
      if (tp.icon) drawIcon(g, tp.icon, x + w / 2, y + h * 0.32, Math.min(48, h * 0.38), C.yellow);
      if (focused) { g.lineStyle(3, 0xFFFFFF, 1); g.strokeRoundedRect(x - 5, y - 5, w + 10, h + 10, 22); }
    };
    draw();
    c.add(T(this, x + w / 2, y + h * 0.66, text(tp.title), TYPE.body, INK.strong, { wordWrap: { width: w - 20 }, align: 'center', resolution: QUALITY.textRes }));
    c.add(T(this, x + w / 2, y + h - 18, status, TYPE.tiny, done ? '#4ED18A' : INK.accent, { resolution: QUALITY.textRes }));
    const z = this.add.zone(x + w / 2, y + h / 2, w, h).setInteractive({ useHandCursor: true }); c.add(z);
    const act = () => { Sfx.init(this); Sfx.click(); onTap(); };
    z.on('pointerover', () => { hi = true; draw(); }); z.on('pointerout', () => { hi = false; draw(); });
    z.on('pointerup', act);
    mirror(c, text(tp.title) + ', ' + status, act, { onFocus: v => { focused = v; draw(); } });
  }

  // --- content notice ------------------------------------------------------------------------
  notice() {
    const e = this.exp, topic = topicOf(e, this.d.topic), L = this.layer;
    this.chrome(() => this.open({ screen: 'intro' }));
    const n = topic.contentNotice || e.contentNotice;
    const g = this.add.graphics(); L.add(g);
    g.fillStyle(C.yellow, 1); g.fillCircle(W / 2, 200, 44);
    drawIcon(g, 'info', W / 2, 200, 50, C.navy);
    const h = heading(this, L, t('notice.heading'), 268, TYPE.h1);
    const body = para(this, L, text(n.text), h.y + h.height + 20, { size: TYPE.lead });
    const help = para(this, L, t('notice.help'), body.y + body.height + 22, { size: TYPE.small, color: INK.muted });
    describe(t('notice.heading'), [text(n.text), t('notice.help')]);
    const go = skip => {
      labEvent('notice_choice', { exp: e, topic }, { skip });
      progress.answer(e.slug, topic.id, e.version, '$skip', skip);
      this.open({ screen: 'scene', topic: topic.id, at: 0 });
    };
    const y = Math.max(help.y + help.height + 60, 700);
    button(this, W / 2, y, 340, 66, t('notice.continue'), () => go(false), { size: 22, fill: C.yellow, fillA: 1, color: INK.dark });
    button(this, W / 2, y + 84, 340, 60, t('notice.skip'), () => go(true), { size: 19, stroke: 0xFFFFFF });
  }

  // --- one scene ---------------------------------------------------------------------------
  runScene() {
    const e = this.exp, topic = topicOf(e, this.d.topic);
    const skip = !!progress.answerOf(e.slug, topic.id, e.version, '$skip');
    const flow = buildFlow(e, topic.id, { skipSensitive: skip });
    const at = Math.min(Math.max(0, this.d.at || 0), flow.length - 1);
    const sc = flow[at];
    this.where = { exp: e, topic, sc };
    progress.setAt(e.slug, topic.id, e.version, at);
    this.chrome(() => this.open({ screen: 'intro' }), { n: at + 1, of: flow.length });
    labEvent('scene_started', this.where, { at });

    const vars = Object.assign({}, progress.answerOf(e.slug, topic.id, e.version, '$vars') || {});
    this.unverified = false; this.sources = [];
    const ctx = this.ctx = {
      scene: this, exp: e, topic, sc, at, total: flow.length, flow, layer: this.layer, vars, skipSensitive: skip,
      text: s => { if (hasUnverified(s)) this.markUnverified(); return text(s, vars); },
      t,
      setVar: (k, v) => { vars[k] = v; progress.answer(e.slug, topic.id, e.version, '$vars', vars); },
      saved: id => progress.answerOf(e.slug, topic.id, e.version, id || sc.id),
      answer: (value, meta) => {
        progress.answer(e.slug, topic.id, e.version, sc.id, value);
        labEvent('scene_answered', this.where, Object.assign({ value }, meta || {}));
      },
      result: (correct, meta) => labEvent(correct ? 'answer_correct' : 'answer_incorrect', this.where, meta),
      score: (score, total) => progress.setScore(e.slug, topic.id, e.version, { score, total }),
      next: () => this.nextScene(flow, at),
      again: () => this.open({ screen: 'scene', topic: topic.id, at }),
      primary: (label, cb, y, o) => button(this, W / 2, y || BAND.primaryY, (o && o.w) || 280, 64, label, cb, Object.assign({ size: 23, fill: C.yellow, fillA: 1, color: INK.dark }, o)),
      secondary: (label, cb, y, o) => button(this, W / 2, y || BAND.primaryY, (o && o.w) || 260, 58, label, cb, Object.assign({ size: 19, fill: C.navy, fillA: 0.95, stroke: 0xFFFFFF }, o)),
      art: (spec, area) => this.makeArt(spec, area),
      describe: (h, lines) => describe(h, lines),
      announce,
      sources: ids => { ids.forEach(id => { if (!this.sources.includes(id)) this.sources.push(id); }); this.refreshFoot(); }
    };
    const render = RENDERERS[sc.type];
    Promise.resolve(render(ctx, sc)).catch(err => {
      console.error(err);
      para(this, this.layer, t('lab.error'), 400, { color: INK.strong });
      ctx.primary(t('lab.skipScene'), () => ctx.next());
    });
  }

  markUnverified() { if (!this.unverified && !RELEASE) { this.unverified = true; this.refreshFoot(); } }

  refreshFoot() {
    if (this.foot) this.foot.destroy();
    const lines = [];
    const src = this.sources.length ? sourceLine(this.sources) : '';
    if (src) lines.push(src);
    if (this.unverified) lines.push(DAGGER + ' ' + t('lab.unverified'));
    this.foot = footnote(this, null, lines, H - 10);
    if (this.foot) this.foot.setDepth(1500);
  }

  async makeArt(spec, area) {
    const a = Object.assign({}, DEFAULT_AREA, area || {});
    const loading = T(this, a.x + a.w / 2, a.y + a.h / 2, t('lab.loading'), TYPE.small, INK.muted, { fontStyle: 'normal' });
    const create = await loadArt(spec.kind);
    loading.destroy();
    if (!this.scene.isActive()) return null;
    const vars = this.ctx ? this.ctx.vars : {};
    const fillLabels = o => (Array.isArray(o) ? o.map(fillLabels) : o && typeof o === 'object'
      ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === 'string' && LABEL_KEYS.has(k) ? text(v, vars) : fillLabels(v)])) : o);
    const inst = create(this, this.layer, fillLabels(resolveParams(spec.params || {}, claim)), a, this.ctx) || {};
    inst.alt = spec.alt ? text(spec.alt, this.ctx && this.ctx.vars) : '';
    const own = inst.destroy;
    let gone = false;
    inst.destroy = () => { if (gone) return; gone = true; this.arts = this.arts.filter(x => x !== inst); if (own) own.call(inst); };
    this.arts.push(inst);
    return inst;
  }

  nextScene(flow, at) {
    labEvent('scene_completed', this.where, { at });
    if (at + 1 < flow.length) this.open({ screen: 'scene', topic: this.where.topic.id, at: at + 1 });
    else this.open({ screen: 'complete', topic: this.where.topic.id });
  }

  // --- topic complete ------------------------------------------------------------------------
  complete() {
    const e = this.exp, topic = topicOf(e, this.d.topic), L = this.layer;
    this.chrome(() => this.open({ screen: 'intro' }));
    const got = progress.complete(e.slug, topic.id, e.version, e.topics.map(x => x.id));
    labEvent('topic_completed', { exp: e, topic }, got);
    if (got.experienceStamp) labEvent('experience_completed', { exp: e });
    state.completed[e.slug] = progress.experienceDone(e.slug, e.topics.map(x => x.id));
    state.points = Math.max(state.points, labPoints());

    // Stamp: a round ink stamp with the experience icon, stamped down.
    const st = this.add.container(W / 2, 250); L.add(st);
    const g = this.add.graphics(); st.add(g);
    g.lineStyle(6, C.yellow, 1); g.strokeCircle(0, 0, 92);
    g.lineStyle(2, C.yellow, 1); g.strokeCircle(0, 0, 78);
    g.fillStyle(C.navy2, 1); g.fillCircle(0, 0, 74);
    drawIcon(g, topic.icon || e.icon, 0, -6, 70, C.yellow);
    st.add(T(this, 0, 52, t('lab.stampWord'), 14, INK.accent, { letterSpacing: 2 }));
    st.setAngle(-8);
    if (!REDUCE_MOTION) { st.setScale(1.8).setAlpha(0); this.tweens.add({ targets: st, scale: 1, alpha: 1, duration: 360, ease: 'Back.easeOut', delay: 150, onStart: () => Sfx.chime(true) }); }

    heading(this, L, t('lab.topicDone'), 380, TYPE.h1);
    const sub = e.topics.length > 1 ? text(e.title) + ': ' + text(topic.title) : text(e.title);
    para(this, L, sub, 426, { size: TYPE.lead, color: INK.accent, bold: true });
    const msg = got.experienceStamp ? t('lab.expStamp') : got.topicStamp ? t('lab.topicStamp') : t('lab.alreadyStamped');
    para(this, L, msg, 470, { size: TYPE.body });
    describe(t('lab.topicDone'), [sub, msg]);

    const next = nextTopic(e, topic.id, id => progress.topicDone(e.slug, id));
    let y = 640;
    if (next) {
      button(this, W / 2, y, 380, 66, t('lab.nextTopic', { topic: text(next.title) }), () => {
        if (needsNotice(e, next.id)) this.open({ screen: 'notice', topic: next.id }); else this.open({ screen: 'scene', topic: next.id, at: 0 });
      }, { size: 21, fill: C.yellow, fillA: 1, color: INK.dark });
      y += 84;
    }
    button(this, W / 2, y, 320, 60, t('lab.passport'), () => this.go('Passport'), { size: 20, fill: next ? C.navy : C.yellow, fillA: next ? 0.95 : 1, color: next ? INK.strong : INK.dark, stroke: next ? 0xFFFFFF : null });
    button(this, W / 2, y + 78, 320, 60, t('lab.toLab'), () => this.go('LabMenu'), { size: 20, stroke: 0xFFFFFF });
  }
}
