// chart: line, bar, stacked-bar or pictogram (icon array). Values come from the
// content register (points[].claim) or are derived from register inputs
// (derive). Every value is printed as text, not just drawn.
import { W, COLORS as C, FONT, REDUCE_MOTION } from '../../config.js';
import { panel } from '../../ui.js';
import { drawIcon } from '../../icons.js';
import { QUALITY } from '../../quality.js';
import { TYPE, INK, SPACE, SERIES_STYLE } from '../../theme.js';
import { withUnit, resolveParams } from '../core/format.js';
import { SERIES } from '../core/derive.js';
import { claim } from '../content.js';
import { para, heading } from '../kit.js';

const txt = (scene, x, y, s, size, color, o) => scene.add.text(x, y, s, Object.assign({ fontFamily: FONT, fontSize: size + 'px', color, resolution: QUALITY.textRes }, o || {}));

export default function chart(ctx, sc) {
  const { scene, layer, t } = ctx;
  const h = heading(scene, layer, ctx.text(sc.title), 104, TYPE.h2);
  const top = h.y + h.height + 20;
  const box = { x: SPACE.gutter, y: top, w: W - SPACE.gutter * 2, h: sc.kind === 'pictogram' ? 300 : 380 };
  layer.add(panel(scene, box.x, box.y, box.w, box.h, { fill: 0x0E1622, alpha: 0.94, r: SPACE.radius, stroke: 0xFFFFFF, strokeA: 0.1 }));

  const yUnit = sc.y && sc.y.unit, xUnit = sc.x && sc.x.unit;
  let data = [], claimIds = [];
  if (sc.points) {
    data = sc.points.map(p => { const c = claim(p.claim); return { x: p.x, label: p.label ? ctx.text(p.label) : withUnit(p.x, xUnit), value: c ? c.value : null }; });
    claimIds = sc.points.map(p => p.claim);
    ctx.text(sc.points.map(p => '{claim:' + p.claim + '}').join(' '));  // marks unverified figures in the footnote
  } else if (sc.derive) {
    const p = resolveParams(sc.derive.params, claim);
    data = SERIES[sc.derive.fn](p).map(d => ({ ...d, label: withUnit(d.x, xUnit) }));
    claimIds = sc.derive.claims;
    ctx.text(claimIds.map(id => '{claim:' + id + '}').join(' '));
  } else if (sc.pictogram) {
    claimIds = [sc.pictogram.claim];
  }
  ctx.sources(claimIds);
  const g = scene.add.graphics(); layer.add(g);
  const add = o => { layer.add(o); return o; };
  const described = [];

  if (sc.kind === 'pictogram') {
    const pc = sc.pictogram, c = claim(pc.claim), n = c && typeof c.value === 'number' ? Math.round(pc.per ? c.value * pc.of / pc.per : c.value) : 0;
    const cols = pc.of <= 5 ? pc.of : pc.of <= 10 ? Math.ceil(pc.of / 2) : 5, rows = Math.ceil(pc.of / cols);
    const cell = Math.min((box.w - 40) / cols, (box.h - 90) / rows);
    const x0 = box.x + box.w / 2 - cols * cell / 2 + cell / 2, y0 = box.y + 40 + cell / 2;
    for (let i = 0; i < pc.of; i++) {
      const x = x0 + (i % cols) * cell, y = y0 + Math.floor(i / cols) * cell, on = i < n;
      // Filled icon vs outline ring: the difference doesn't rely on colour.
      if (on) { g.fillStyle(C.yellow, 1); g.fillCircle(x, y, cell * 0.42); drawIcon(g, pc.icon || 'walker', x, y, cell * 0.5, C.navy); }
      else { g.lineStyle(2, 0xFFFFFF, 0.5); g.strokeCircle(x, y, cell * 0.42); drawIcon(g, pc.icon || 'walker', x, y, cell * 0.5, 0xFFFFFF, 0.45); }
    }
    add(txt(scene, W / 2, box.y + box.h - 30, t('chart.pictogram', { n, of: pc.of }), TYPE.lead, INK.accent, { fontStyle: 'bold' }).setOrigin(0.5));
    ctx.text('{claim:' + pc.claim + '}');
    described.push(t('chart.pictogram', { n, of: pc.of }));
  } else if (sc.kind === 'stacked') {
    // Horizontal bars split into parts (e.g. reaction + braking distance).
    const maxV = sc.y && sc.y.max || Math.max(...data.map(d => d.value)) * 1.15;
    const x0 = box.x + 96, bw = box.w - 96 - 70, rowH = Math.min(78, (box.h - 110) / data.length);
    data.forEach((d, i) => {
      const y = box.y + 50 + i * rowH + rowH / 2, hi = sc.highlight != null && String(sc.highlight) === String(d.x);
      add(txt(scene, box.x + 84, y, d.label, TYPE.small, hi ? INK.accent : INK.strong, { fontStyle: 'bold' }).setOrigin(1, 0.5));
      const parts = d.parts || [d.value];
      const bars = scene.add.graphics(); layer.add(bars);
      const tot = add(txt(scene, 0, y, withUnit(d.value, yUnit), TYPE.small, INK.strong, { fontStyle: 'bold' }).setOrigin(0, 0.5));
      const drawBars = k => {
        bars.clear();
        let x = x0;
        parts.forEach((pv, j) => {
          const w = pv / maxV * bw * k, st = SERIES_STYLE[j % SERIES_STYLE.length];
          bars.fillStyle(st.color, 1); bars.fillRect(x, y - 15, w, 30);
          if (j > 0) { bars.fillStyle(0x0E1622, 1); for (let s = x + 4; s < x + w - 2; s += 10) bars.fillRect(s, y - 15, 2, 30); }  // stripes mark the second part
          x += w;
        });
        tot.setX(x + 8);
      };
      if (REDUCE_MOTION) drawBars(1); else scene.tweens.addCounter({ from: 0, to: 1, duration: 700, delay: 150 + i * 200, ease: 'Cubic.easeOut', onUpdate: tw => drawBars(tw.getValue()) });
      described.push(d.label + ': ' + withUnit(d.value, yUnit) + (d.parts ? ' (' + (sc.parts || []).map((n, j) => ctx.text(n) + ' ' + withUnit(d.parts[j], yUnit)).join(', ') + ')' : ''));
    });
    if (sc.parts) {
      let lx = box.x + 24;
      sc.parts.forEach((n, j) => {
        const st = SERIES_STYLE[j % SERIES_STYLE.length], ly = box.y + box.h - 26;
        g.fillStyle(st.color, 1); g.fillRect(lx, ly - 8, 18, 16);
        if (j > 0) { g.fillStyle(0x0E1622, 1); g.fillRect(lx + 4, ly - 8, 2, 16); g.fillRect(lx + 12, ly - 8, 2, 16); }
        const lt = add(txt(scene, lx + 26, ly, ctx.text(n), TYPE.tiny, INK.body).setOrigin(0, 0.5));
        lx += 26 + lt.width + 24;
      });
    }
  } else {
    // Line or vertical bar chart with labelled axes.
    const maxV = (sc.y && sc.y.max) || niceMax(Math.max(...data.map(d => d.value)));
    const px = box.x + 70, pw = box.w - 100, py = box.y + 40, ph = box.h - 120;
    const ys = v => py + ph - v / maxV * ph;
    for (let k = 0; k <= 4; k++) {
      const v = maxV * k / 4, y = ys(v);
      g.lineStyle(1, 0xFFFFFF, k ? 0.1 : 0.4); g.lineBetween(px, y, px + pw, y);
      add(txt(scene, px - 10, y, fmtTick(v), TYPE.tiny, INK.faint).setOrigin(1, 0.5));
    }
    const step = pw / data.length, xs = i => px + step * (i + 0.5);
    data.forEach((d, i) => add(txt(scene, xs(i), py + ph + 18, d.label, TYPE.tiny, INK.muted).setOrigin(0.5)));
    if (sc.y) add(txt(scene, box.x + 16, box.y + 16, ctx.text(sc.y.label), TYPE.tiny, INK.muted, { fontStyle: 'bold' }));
    if (sc.x) add(txt(scene, px + pw / 2, py + ph + 44, ctx.text(sc.x.label), TYPE.tiny, INK.muted, { fontStyle: 'bold' }).setOrigin(0.5));
    const lines = scene.add.graphics(); layer.add(lines);
    const vals = data.map((d, i) => {
      const hi = sc.highlight != null && String(sc.highlight) === String(d.x);
      return add(txt(scene, xs(i), ys(d.value) - 18, withUnit(d.value, yUnit), TYPE.small, hi ? INK.accent : INK.strong, { fontStyle: 'bold' }).setOrigin(0.5).setAlpha(REDUCE_MOTION ? 1 : 0));
    });
    const drawData = k => {
      lines.clear();
      if (sc.kind === 'bar') {
        data.forEach((d, i) => {
          const bh = (py + ph - ys(d.value)) * k, hi = sc.highlight != null && String(sc.highlight) === String(d.x);
          lines.fillStyle(hi ? C.yellow : 0xFFFFFF, hi ? 1 : 0.7); lines.fillRect(xs(i) - step * 0.28, py + ph - bh, step * 0.56, bh);
        });
      } else {
        lines.lineStyle(4, C.yellow, 1);
        const n = Math.max(2, Math.ceil(data.length * k));
        lines.beginPath();
        data.slice(0, n).forEach((d, i) => { const y = py + ph - (py + ph - ys(d.value)) * Math.min(1, k * 1.2); i ? lines.lineTo(xs(i), y) : lines.moveTo(xs(i), y); });
        lines.strokePath();
        data.slice(0, n).forEach((d, i) => { const y = py + ph - (py + ph - ys(d.value)) * Math.min(1, k * 1.2); lines.fillStyle(C.navy, 1); lines.fillCircle(xs(i), y, 8); lines.lineStyle(3, C.yellow, 1); lines.strokeCircle(xs(i), y, 8); });
      }
    };
    if (REDUCE_MOTION) drawData(1);
    else scene.tweens.addCounter({ from: 0, to: 1, duration: 900, delay: 200, ease: 'Cubic.easeOut', onUpdate: tw => drawData(tw.getValue()), onComplete: () => vals.forEach(v => scene.tweens.add({ targets: v, alpha: 1, duration: 200 })) });
    data.forEach(d => described.push(d.label + ': ' + withUnit(d.value, yUnit)));
  }

  if (sc.caption) para(scene, layer, ctx.text(sc.caption), box.y + box.h + 22, { size: TYPE.body });
  ctx.describe(ctx.text(sc.title), [sc.caption && ctx.text(sc.caption)].concat(described));
  ctx.primary(t('lab.continue'), () => ctx.next());
}

function niceMax(v) {
  const p = Math.pow(10, Math.floor(Math.log10(v))), m = v / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
}
const fmtTick = v => (v >= 10 ? String(Math.round(v)) : String(Math.round(v * 10) / 10));
