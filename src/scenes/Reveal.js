import Phaser from 'phaser';
import { W, H, DATA, COLORS as C, FONT, state, clamp } from '../config.js';
import { setupCam, duskBg, T, button, brand, soundToggle } from '../ui.js';
import { Sfx } from '../sfx.js';

export default class Reveal extends Phaser.Scene {
  constructor() { super('Reveal'); }

  create() {
    setupCam(this);
    Sfx.init(this);
    this.cameras.main.fadeIn(300, 8, 17, 30);
    duskBg(this);
    brand(this); soundToggle(this);

    const right = state.guess === DATA.answer;
    T(this, W / 2, 118, right ? 'Right.' : 'Not quite.', 46, right ? '#FFCB2B' : '#FFFFFF');
    T(this, W / 2, 174, (state.guess != null ? 'You guessed ' + state.guess + '%. ' : '') + 'At 90 km/h the chance is ' + DATA.answer + '%.', 22, '#E6EDF5', { fontStyle: 'normal', wordWrap: { width: 440 }, align: 'center' });
    Sfx.chime(right);

    T(this, W / 2, 250, 'A few km/h is a big deal.', 32, '#FFFFFF');
    T(this, W / 2, 308, 'From 60 to 90 km/h, the chance of a life-threatening injury goes from about 1 in 11 to 9 in 10.', 20, '#B9C6D6', { fontStyle: 'normal', wordWrap: { width: 440 }, align: 'center', lineSpacing: 4 });

    const card = this.add.graphics();
    card.fillStyle(C.navy2, 0.92); card.fillRoundedRect(40, 396, 460, 330, 20);
    this.cg = this.add.graphics();
    this.cx0 = 100; this.cw = 370; this.cy0 = 676; this.ch = 220;
    const px = x => this.cx0 + x / 100 * this.cw, py = y => this.cy0 - y / 100 * this.ch;
    this.px = px; this.py = py;
    this.pts = [[0, 0], [60, DATA.risk[60]], [80, DATA.risk[80]], [90, DATA.risk[90]]];

    card.lineStyle(1, 0xFFFFFF, 0.12);
    [0, 25, 50, 75, 100].forEach(v => {
      card.lineBetween(this.cx0, py(v), this.cx0 + this.cw, py(v));
      T(this, this.cx0 - 12, py(v), v + '%', 14, '#7F8FA3', { fontStyle: 'normal' }).setOrigin(1, 0.5);
    });
    [0, 20, 40, 60, 80, 100].forEach(v => T(this, px(v), this.cy0 + 18, String(v), 14, '#7F8FA3', { fontStyle: 'normal' }));
    T(this, W / 2 + 20, this.cy0 + 42, 'Speed (km/h)', 15, '#B9C6D6', { fontStyle: 'normal' });
    this.add.text(62, 418, 'Chance of life-threatening injury', { fontFamily: FONT, fontSize: '15px', color: '#B9C6D6', resolution: 2 }).setOrigin(0, 0.5);

    this.labels = [1, 2, 3].map(i => {
      const p = this.pts[i];
      const t = T(this, px(p[0]) + (i === 3 ? -36 : i === 2 ? -26 : 0), py(p[1]) - 22, p[1] + '%', 22, '#FFCB2B').setAlpha(0);
      return { t, frac: 0 };
    });

    const seg = []; let tot = 0;
    for (let i = 1; i < this.pts.length; i++) {
      const dx = px(this.pts[i][0]) - px(this.pts[i - 1][0]), dy = py(this.pts[i][1]) - py(this.pts[i - 1][1]);
      tot += Math.hypot(dx, dy); seg.push(tot);
    }
    this.segLen = seg; this.total = tot;
    this.labels.forEach((l, i) => { l.frac = seg[i] / tot; });

    this.tweens.addCounter({ from: 0, to: 1, duration: 1600, delay: 500, ease: 'Sine.easeInOut', onUpdate: tw => this.drawChart(tw.getValue()) });
    this.drawChart(0);

    button(this, W / 2, 822, 320, 64, 'Continue', () => this.scene.start('Passport'), { size: 24, fill: C.yellow, fillA: 1, color: '#0B1B2E' });
    T(this, W / 2, 922, 'Prototype. Figures are illustrative. Add sources before launch.', 14, '#7F8FA3', { fontStyle: 'normal' });
  }

  drawChart(k) {
    const g = this.cg; g.clear();
    const target = k * this.total;
    g.lineStyle(4, C.yellow, 1);
    g.beginPath(); g.moveTo(this.px(this.pts[0][0]), this.py(this.pts[0][1]));
    let acc = 0;
    for (let i = 1; i < this.pts.length; i++) {
      const ax = this.px(this.pts[i - 1][0]), ay = this.py(this.pts[i - 1][1]), bx = this.px(this.pts[i][0]), by = this.py(this.pts[i][1]);
      const len = Math.hypot(bx - ax, by - ay);
      if (acc + len <= target) { g.lineTo(bx, by); acc += len; }
      else { const f = clamp((target - acc) / len, 0, 1); g.lineTo(ax + (bx - ax) * f, ay + (by - ay) * f); break; }
    }
    g.strokePath();
    g.fillStyle(C.yellow, 1);
    for (let i = 1; i < this.pts.length; i++) {
      if (k * 1.0001 >= this.labels[i - 1].frac) {
        g.fillCircle(this.px(this.pts[i][0]), this.py(this.pts[i][1]), 6);
        this.labels[i - 1].t.setAlpha(1);
      }
    }
  }
}
