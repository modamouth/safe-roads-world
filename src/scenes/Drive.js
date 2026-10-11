import Phaser from 'phaser';
import {
  W, H, HY, ROAD_HW, PXM, VF, VO, SPAN, IMPACT_Z, EDGE_COLOR,
  COLORS as C, SEV, state, track, clamp, lerp, easeOut, lerpColor, REDUCE_MOTION, DATA
} from '../config.js';
import { setupCam, T, button, brand, soundToggle, makeCaption, pop, Debris } from '../ui.js';
import { Sfx } from '../sfx.js';

const KINDS = {
  acacia: { tex: 'acacia', m: 7.5 },
  bush: { tex: 'bush', m: 2.6 },
  post: { tex: 'post', m: 0.26 },
  sign: { tex: 'sign', m: 1.1 }
};

export default class Drive extends Phaser.Scene {
  constructor() { super('Drive'); }

  create() {
    setupCam(this);
    Sfx.init(this);
    this.real = this.registry.get('REAL');

    this.phase = 'pick'; this.pos = 0; this.kmh = 32; this.camX = -0.5; this.prevCamX = -0.5;
    this.curve = 0.5; this.curveTarget = 0.5; this.slow = 1; this.hitStop = 0;
    this.kuduLx = -1.6; this.kuduHop = 0; this.hit = false; this.kudu = null; this.onc = null;

    if (this.real) {
      this.add.image(0, 0, 'img_sky').setOrigin(0).setDisplaySize(W, HY + 40).setDepth(0);
    } else {
      this.add.image(0, 0, 'sky').setOrigin(0).setDisplaySize(W, HY + 40).setDepth(0);
    }
    this.roadG = this.add.graphics().setDepth(1);
    if (this.real) this.add.tileSprite(0, HY, W, H - HY, 'grain').setOrigin(0).setAlpha(0.12).setDepth(2);
    if (this.real) this.add.image(0, HY - 30, 'hzfade').setOrigin(0).setDepth(3);

    this.buildScenery();

    if (this.real) this.carShadow = this.add.image(W / 2, 804, 'shadow').setDisplaySize(250, 42).setDepth(599);
    this.car = this.add.image(W / 2, 806, this.real ? 'img_suv' : 'carRear').setOrigin(0.5, 1).setDepth(600);
    this.car.setScale(this.real ? 190 / this.car.width : 0.95);

    this.add.image(0, 0, 'vig').setOrigin(0).setDisplaySize(W, H).setDepth(900);
    this.deb = new Debris(this, 960);
    brand(this); soundToggle(this);

    this.speedTxt = T(this, W / 2, 872, '0', 68, '#FFFFFF').setDepth(1000).setVisible(false);
    T(this, W / 2, 926, 'km/h', 18, '#B9C6D6', { fontStyle: 'normal' }).setDepth(1000);
    this.chips = DATA.speeds.map((v, i) => {
      const b = button(this, 150 + i * 120, 872, 108, 72, String(v), () => this.pick(v), { size: 34, fill: C.navy, fillA: 0.75, stroke: 0xFFFFFF });
      b.setDepth(1000); return b;
    });
    this.cap = makeCaption(this, 150, 1000);
    this.cap.set("Let's see what speed does in a head-on crash. Pick a speed to start.");
    this.events.once('shutdown', () => Sfx.stopEngine());
  }

  buildScenery() {
    this.scn = [];
    this.kinds = this.real
      ? Object.assign({}, KINDS, {
          post: { tex: 'img_post', m: 0.184 },
          acacia: { tex: 'acacia_sil', m: 7.5 },
          bush: { tex: 'bush_sil', m: 2.6 }
        })
      : KINDS;
    const add = (kind, wz, lx) => {
      const d = this.kinds[kind];
      const im = this.add.image(0, 0, d.tex).setOrigin(0.5, 1);
      im.kind = kind; im.wz = wz; im.lx = lx; im.m = d.m;
      if (this.real && kind === 'post' && lx > 0) im.setFlipX(true);
      this.scn.push(im);
    };
    const side = () => (Math.random() < 0.5 ? -1 : 1);
    for (let i = 0; i < 28; i++) add('acacia', 12 + i * (SPAN / 28) + Math.random() * 10, side() * (1.9 + Math.random() * 4.2));
    for (let i = 0; i < 34; i++) add('bush', 10 + i * (SPAN / 34) + Math.random() * 8, side() * (1.4 + Math.random() * 2.6));
    for (let i = 0; i < 19; i++) { add('post', i * (SPAN / 19), -1.1); add('post', i * (SPAN / 19) + 24, 1.1); }
    add('sign', 210, -1.25); add('sign', 210 + SPAN / 2, 1.25);
  }

  randLx(kind) {
    const s = Math.random() < 0.5 ? -1 : 1;
    return kind === 'acacia' ? s * (1.9 + Math.random() * 4.2) : kind === 'bush' ? s * (1.4 + Math.random() * 2.6) : kind === 'sign' ? s * 1.25 : s * 1.1;
  }

  vp() { return this.kmh / 3.6 * VF; }

  proj(z, lx) {
    const t = 8 / z, hw = ROAD_HW * t, off = this.curve * Math.pow(1 - t, 2) * 260;
    return { t, x: W / 2 + (lx - this.camX) * hw + off, y: HY + (H - HY) * t };
  }

  pick(v) {
    if (this.phase !== 'pick') return;
    this.phase = 'accel'; this.target = v; this.tAcc = 0;
    state.firstSpeed = v; track('speed_pick', { v });
    Sfx.startEngine();
    this.chips.forEach(b => b.setVisible(false));
    this.speedTxt.setVisible(true);
    this.cap.hide();
  }

  startEvent() {
    const vp = this.vp();
    this.phase = 'cruise'; this.tc = 0;
    this.curveTarget = 0;
    this.kuduZ = vp * 3.2;
    this.oncZ = (vp + VO) * 3.05 + IMPACT_Z;
    this.kudu = this.add.image(0, 0, this.real ? 'kudu_sil' : 'kudu').setOrigin(0.5, 1);
    this.truckM = this.real ? 3.4 : 2.6;
    this.onc = this.add.image(0, 0, this.real ? 'img_truck' : 'vanFront').setOrigin(0.5, 1);
    this.oncShadow = this.real ? this.add.image(0, 0, 'shadow').setDepth(449) : null;
    this.oncGlow = this.add.image(0, 0, 'glow').setBlendMode(Phaser.BlendModes.ADD).setAlpha(this.real ? 0.5 : 0.9);
    this.kuduIn = false; this.swerved = false;
  }

  swerve() {
    this.swerved = true;
    this.cap.set('You swerve to miss it and end up in the oncoming lane.');
    Sfx.skid();
    this.tweens.addCounter({ from: -0.5, to: 0.5, duration: 550, ease: 'Sine.easeInOut', onUpdate: tw => { this.camX = tw.getValue(); } });
  }

  impact() {
    this.hit = true; this.phase = 'impact';
    const v = this.target, sv = SEV[v];
    track('crash', { v });
    Sfx.stopEngine(); Sfx.impact(sv.k);
    this.tweens.addCounter({ from: this.kmh, to: 0, duration: 260, onUpdate: tw => { this.kmh = tw.getValue(); } });
    this.hitStop = REDUCE_MOTION ? 0 : sv.stop;
    this.cameras.main.shake(420, REDUCE_MOTION ? 0.002 : sv.shake);
    if (!REDUCE_MOTION) this.cameras.main.flash(180, 255, 240, 220);
    this.deb.burst(W / 2, 700, sv.debris, 240 + 330 * sv.k, -Math.PI / 2, Math.PI * 1.1);
    pop(this, W / 2, 690, 3.2 + sv.k * 2.2, 1);
    this.tweens.add({ targets: this.car, y: 806 + 16 * sv.k, angle: (Math.random() < 0.5 ? -1 : 1) * (3 + 6 * sv.k), duration: 160 });

    for (let i = 0; i < Math.round(4 + 8 * sv.k); i++) {
      const sm = this.add.image(W / 2 + (Math.random() - 0.5) * 120, 640 + Math.random() * 30, 'glow').setDepth(940).setTint(0x3A3A3A).setAlpha(0.55).setScale(0.3);
      this.tweens.add({ targets: sm, y: sm.y - 120 - Math.random() * 90, x: sm.x + (Math.random() - 0.5) * 60, scale: 1.3 + Math.random() * 1.4, alpha: 0, duration: 1400 + Math.random() * 900, delay: i * 60, onComplete: () => sm.destroy() });
    }
    if (this.onc) {
      this.tweens.add({ targets: this.onc, angle: (Math.random() < 0.5 ? -1 : 1) * (2 + 5 * sv.k), duration: 200 });
      if (this.real) this.onc.setTint(lerpColor(0xFFFFFF, 0x777777, sv.k * 0.8));
      this.oncGlow.setAlpha(0.15);
    }

    this.cap.set('Head-on at ' + v + ' km/h.');
    this.slow = 0.25;
    this.time.delayedCall(1000, () => { this.slow = 1; });
    this.time.delayedCall(1900, () => {
      this.cameras.main.fadeOut(300, 8, 17, 30);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Lab', { speed: v, fromStory: true }));
    });
  }

  update(time, delta) {
    let dt = Math.min(delta / 1000, 0.05);
    if (this.hitStop > 0) { this.hitStop -= delta; dt = 0; }
    dt *= this.slow;

    if (this.phase === 'accel') {
      this.tAcc += dt;
      const k = clamp(this.tAcc / 1.4, 0, 1);
      this.kmh = lerp(32, this.target, easeOut(k));
      if (k >= 1) this.startEvent();
    }
    if (this.phase === 'pick') this.kmh = 32;

    const vp = this.vp();
    this.pos += vp * dt;
    this.curve = lerp(this.curve, this.curveTarget, clamp(dt * 0.8, 0, 1));
    if (this.phase === 'pick' || this.phase === 'accel') this.curveTarget = 0.5 * Math.sin(this.pos / 900);

    if (this.phase === 'cruise') {
      this.tc += dt;
      this.kuduZ -= vp * dt;
      this.oncZ -= (vp + VO) * dt;
      if (!this.kuduIn && this.kuduZ < vp * 1.55) {
        this.kuduIn = true;
        this.cap.set('A kudu jumps onto the road.');
        this.tweens.add({ targets: this, kuduLx: -0.5, duration: 500, ease: 'Sine.easeOut', onUpdate: () => { this.kuduHop = Math.abs(Math.sin(this.time.now / 60)) * 26; }, onComplete: () => { this.kuduHop = 0; } });
      }
      if (!this.swerved && this.kuduZ < vp * 1.05) this.swerve();
      if (!this.hit && this.oncZ <= IMPACT_Z) this.impact();
    }

    this.drawRoad();
    this.updateScenery();
    this.updateActors();
    this.deb.update(dt);
    this.speedTxt.setText(String(Math.round(this.kmh)));

    const dx = dt > 0 ? (this.camX - this.prevCamX) / dt : 0;
    this.prevCamX = this.camX;
    if (this.phase !== 'impact') {
      this.car.angle = lerp(this.car.angle, clamp(dx * 7, -9, 9), 0.25);
      this.car.x = W / 2 + clamp(dx * 14, -24, 24);
    }
    if (this.carShadow) this.carShadow.setPosition(this.car.x, this.car.y - 2);
    if (this.phase === 'accel' || this.phase === 'cruise') Sfx.setEngine(this.kmh);
  }

  drawRoad() {
    const g = this.roadG; g.clear();
    const S = 4, span = H - HY;
    for (let y = HY; y < H; y += S) {
      const t = (y + S * 0.5 - HY) / span, z = 8 / t, wz = this.pos + z;
      const st = Math.floor(wz / 16) & 1;
      const fog = Math.pow(1 - t, 2.4) * 0.88;
      const hw = ROAD_HW * t;
      const off = this.curve * Math.pow(1 - t, 2) * 260;
      const cx = W / 2 - this.camX * hw + off;
      g.fillStyle(lerpColor(st ? C.grassA : C.grassB, C.haze, fog), 1); g.fillRect(0, y, W, S + 1);
      g.fillStyle(lerpColor(C.gravel, C.haze, fog), 1); g.fillRect(cx - hw * 1.22, y, hw * 2.44, S + 1);
      g.fillStyle(lerpColor(st ? C.asphalt : C.asphalt2, C.haze, fog), 1); g.fillRect(cx - hw, y, hw * 2, S + 1);
      const ew = Math.max(1, hw * 0.05);
      g.fillStyle(lerpColor(EDGE_COLOR, C.haze, fog), 1);
      g.fillRect(cx - hw * 0.94 - ew / 2, y, ew, S + 1);
      g.fillRect(cx + hw * 0.94 - ew / 2, y, ew, S + 1);
      if (st === 0) { g.fillStyle(lerpColor(0xFFFFFF, C.haze, fog), 1); g.fillRect(cx - ew * 0.5, y, ew, S + 1); }
    }
  }

  updateScenery() {
    for (let i = 0; i < this.scn.length; i++) {
      const o = this.scn[i];
      let za = o.wz - this.pos;
      if (za < 7) { o.wz += SPAN; if (o.kind !== 'post') o.lx = this.randLx(o.kind); za = o.wz - this.pos; }
      if (za > SPAN * 0.98) { o.setVisible(false); continue; }
      const p = this.proj(za, o.lx);
      o.setVisible(true).setPosition(p.x, p.y).setScale(p.t * PXM * o.m / o.width).setDepth(300 - za * 0.1)
        .setAlpha(clamp(1.2 - za / SPAN, 0.4, 1));
    }
  }

  updateActors() {
    if (this.kudu) {
      const z = this.kuduZ;
      if (z < 7.5 || z > SPAN) this.kudu.setVisible(false);
      else {
        const p = this.proj(z, this.kuduLx);
        this.kudu.setVisible(true).setPosition(p.x, p.y - this.kuduHop * p.t).setScale(p.t * PXM * 2.6 / this.kudu.width).setDepth(300 - z * 0.1);
      }
    }
    if (this.onc) {
      const z = this.oncZ;
      if (z < 7.5 || z > SPAN) { this.onc.setVisible(false); this.oncGlow.setVisible(false); if (this.oncShadow) this.oncShadow.setVisible(false); }
      else {
        const p = this.proj(z, 0.5);
        const sc = p.t * PXM * this.truckM / this.onc.width;
        this.onc.setVisible(true).setPosition(p.x, p.y).setScale(sc).setDepth(450);
        this.oncGlow.setVisible(true).setPosition(p.x, p.y - this.onc.displayHeight * (this.real ? 0.3 : 0.32))
          .setScale(Math.max(0.05, p.t * PXM * (this.real ? 3.4 : 6) / 128)).setDepth(451);
        if (this.oncShadow) this.oncShadow.setVisible(true).setPosition(p.x, p.y - 2).setDisplaySize(p.t * PXM * this.truckM * 1.1, p.t * PXM * this.truckM * 0.24);
      }
    }
  }
}
