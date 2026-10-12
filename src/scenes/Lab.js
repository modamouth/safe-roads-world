import Phaser from 'phaser';
import { W, H, LAB, LABG, COLORS as C, SEV, OUTCOME, DATA, state, track, REDUCE_MOTION } from '../config.js';
import { setupCam, viewBounds, fillView, T, button, brand, soundToggle, makeCaption, pop, Debris } from '../ui.js';
import { Sfx } from '../sfx.js';
import { drawFallbackCar } from '../textures.js';

export default class Lab extends Phaser.Scene {
  constructor() { super('Lab'); }

  create(data) {
    setupCam(this);
    Sfx.init(this);
    this.real = this.registry.get('REAL');
    this.cameras.main.fadeIn(300, 8, 17, 30);
    this.busy = false; this.cur = null;
    this.rear = -340; this.crush = 0; this.lurch = 0; this.air = 0; this.shown = 0;

    if (this.real) this.buildRealLab(); else this.buildVectorLab();

    this.carG = this.real ? null : this.add.graphics().setDepth(5);
    this.deb = new Debris(this, this.real ? 20 : 20);
    brand(this); soundToggle(this);
    this.cap = makeCaption(this, 150, 1000);

    this.speedTxt = T(this, W / 2, 640, '0', 74, '#FFFFFF').setDepth(10);
    T(this, W / 2, 692, 'km/h', 18, '#B9C6D6', { fontStyle: 'normal' }).setDepth(10);

    this.chips = DATA.speeds.map((v, i) => button(this, 115 + i * 155, 760, 140, 64, v + ' km/h', () => this.play(v), { size: 22 }).setDepth(10));
    this.prog = T(this, W / 2, 826, '', 18, '#B9C6D6', { fontStyle: 'normal' }).setDepth(10);
    this.reveal = button(this, W / 2, 886, 320, 64, 'Reveal the answer', () => this.next(), { size: 24, fill: C.yellow, fillA: 1, color: '#0B1B2E' });
    this.reveal.setDepth(10);
    this.refreshUi();

    if (data && data.fromStory) {
      this.cap.set("Here's the same crash in the crash lab.");
      this.time.delayedCall(1300, () => this.play(data.speed));
    } else {
      this.cap.set('Pick a speed to crash-test it.');
    }
  }

  // --- Drawn fallback lab (used only if photo assets failed to load) ---
  buildVectorLab() {
    fillView(this, 0x08111E, 1, 0);
    this.add.image(0, 0, 'labbg_fallback').setOrigin(0).setDepth(0);
    const s = this.add.graphics().setDepth(1);
    for (let row = 0; row < 2; row++) for (let i = 0; i < 6; i++) {
      const x = 46 + i * 90 + row * 30, y = 236 + row * 30;
      s.fillStyle(0xFFF3D0, row ? 0.45 : 0.8); s.fillRoundedRect(x, y, 56, 7, 3);
    }
    s.fillStyle(C.yellow, 0.9); s.fillRect(0, LAB.floor + 8, W, 4);
    s.fillStyle(0xFFFFFF, 0.06); s.fillRect(0, LAB.floor + 26, W, 2); s.fillRect(0, LAB.floor + 60, W, 2);
    const bx = LAB.barrierX;
    s.fillStyle(0x596779, 1); s.fillRect(bx, LAB.top, W - bx + 20, LAB.floor - LAB.top);
    s.fillStyle(0x46536A, 1); s.fillRect(bx + 14, LAB.top + 14, W - bx, LAB.floor - LAB.top - 28);
    s.fillStyle(0x8A96A8, 1); s.fillRect(bx, LAB.top, 12, LAB.floor - LAB.top);
    s.fillStyle(0x6E7C92, 1); s.fillRect(bx, LAB.top, W - bx + 20, 10);
    [[bx + 60, LAB.top + 62], [bx + 60, LAB.top + 180]].forEach(m => {
      s.fillStyle(0x0B1B2E, 1); s.fillCircle(m[0], m[1], 15);
      s.fillStyle(C.yellow, 1); s.fillCircle(m[0], m[1], 9);
      s.fillStyle(0x0B1B2E, 1); s.fillRect(m[0] - 9, m[1] - 1, 18, 2); s.fillRect(m[0] - 1, m[1] - 9, 2, 18);
    });
  }

  // --- Photo lab: real facility background + real car/dummy photos ---
  buildRealLab() {
    const v = viewBounds(this);
    fillView(this, 0x05080D, 1, 0);
    this.add.image(LABG.bgX, LABG.bgY, 'img_labbg').setOrigin(0).setDisplaySize(LABG.bgW, LABG.bgH).setDepth(1);
    this.add.image(0, LABG.bgY, 'labtop').setOrigin(0).setDepth(2);
    this.add.image(0, LABG.bgY + LABG.bgH - 150, 'labbot').setOrigin(0).setDepth(2);
    this.add.rectangle(v.left, 758, v.width, v.bottom - 758, 0x05080D).setOrigin(0).setDepth(3);
    this.carShadow = this.add.image(0, LABG.ground - 3, 'shadow').setDisplaySize(LABG.carW * 1.05, 38).setDepth(4);
    this.carA = this.add.image(0, LABG.ground, 'img_labcar0').setOrigin(0, 1).setDepth(5);
    this.carB = this.add.image(0, LABG.ground, 'img_labcar60').setOrigin(0, 1).setDepth(6).setAlpha(0);
    const sc = LABG.carW / this.carA.width;
    this.carA.setScale(sc); this.carB.setScale(sc);
  }

  // Rear x that puts the given photo's front edge on the barrier face.
  realStop(k) { return LABG.contact - LABG.front[k] * (LABG.carW / this.carA.width); }

  realImpact(v, sv) {
    const key = 'img_labcar' + v;
    this.carB.setTexture(key).setAlpha(0);
    this.tweens.add({ targets: this.carB, alpha: 1, duration: 70, onComplete: () => { this.carA.setTexture(key); this.carB.setAlpha(0); } });
    // Front stays on the wall while the body keeps moving forward as it crumples.
    this.tweens.add({ targets: this, rear: this.realStop(v) + 1, duration: sv.crushMs * 0.5, ease: 'Cubic.easeOut' });
  }

  refreshUi() {
    const n = DATA.speeds.filter(v => state.tried[v]).length;
    DATA.speeds.forEach((v, i) => {
      this.chips[i].setLabel((state.tried[v] ? '✓ ' : '') + v + ' km/h');
      this.chips[i].setActive(v === this.cur);
      this.chips[i].setEnabled(!this.busy);
    });
    this.prog.setText(n >= 3 ? 'All three speeds tried.' : 'Try every speed to compare. ' + n + ' of 3 done.');
    this.reveal.setEnabled(n >= 3 && !this.busy);
    if (n >= 3) this.reveal.setActive(false);
  }

  play(v) {
    if (this.busy) return;
    this.busy = true; this.cur = v;
    track('lab_speed', { v });
    this.cap.hide();
    this.crush = 0; this.lurch = 0; this.air = 0;
    this.rear = this.real ? -LABG.carW - 20 : -340;
    if (this.real) { this.carA.setTexture('img_labcar0').setAlpha(1); this.carB.setAlpha(0); }
    this.refreshUi();
    Sfx.tone(140, 0.9, 'sawtooth', 0.05, 320);
    const dur = { 60: 1500, 80: 1200, 90: 1050 }[v];
    this.shown = v;
    this.tweens.add({
      targets: this,
      rear: this.real ? this.realStop(0) : LAB.barrierX - LAB.carLen,
      duration: dur, ease: 'Linear', onComplete: () => this.crash(v)
    });
  }

  crash(v) {
    const sv = SEV[v], cpx = sv.crush * 118;
    Sfx.impact(sv.k);
    this.cameras.main.shake(400, REDUCE_MOTION ? 0.002 : sv.shake);
    if (!REDUCE_MOTION) this.cameras.main.flash(160, 255, 240, 220);
    const cx = this.real ? LABG.contact : LAB.barrierX, cy = this.real ? LABG.ground - 95 : LAB.floor - 70;
    this.deb.burst(cx - 4, cy, sv.debris, 240 + 320 * sv.k, -Math.PI * 0.85, Math.PI * 1.0);
    pop(this, cx - 6, cy, 2.6 + sv.k * 2, 1);
    if (this.real) {
      this.realImpact(v, sv);
    } else {
      this.tweens.add({ targets: this, crush: cpx, duration: sv.crushMs, ease: 'Cubic.easeOut', onUpdate: () => { this.rear = LAB.barrierX - LAB.carLen + this.crush; } });
      this.tweens.add({ targets: this, lurch: 1, duration: 380, delay: 40, ease: 'Quad.easeOut' });
      this.tweens.add({ targets: this, air: 1, duration: 130, delay: 20, onComplete: () => this.tweens.add({ targets: this, air: 0, duration: 500, delay: 350 }) });
    }
    this.tweens.addCounter({ from: v, to: 0, duration: 300, onUpdate: tw => { this.shown = tw.getValue(); } });
    this.time.delayedCall(800, () => {
      this.busy = false; state.tried[v] = true;
      this.cap.set(OUTCOME[v]);
      this.refreshUi();
    });
  }

  next() {
    track('reveal');
    this.cameras.main.fadeOut(250, 8, 17, 30);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Reveal'));
  }

  update(time, delta) {
    const dt = Math.min(delta / 1000, 0.05);
    if (this.real) {
      this.carA.x = this.rear; this.carB.x = this.rear;
      if (this.carShadow) this.carShadow.x = this.rear + LABG.carW * 0.5;
    } else {
      drawFallbackCar(this.carG, this.rear, this.crush, this.lurch, this.air);
    }
    this.deb.update(dt);
    this.speedTxt.setText(String(Math.round(this.shown)));
  }
}
