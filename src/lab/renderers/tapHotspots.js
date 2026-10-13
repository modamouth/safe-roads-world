// tap-hotspots: tap everything that applies on an illustration, then check.
// The verdict is green (all found, none wrong), orange (some) or red (none);
// each item is marked with a symbol as well as a colour.
import { W, COLORS as C } from '../../config.js';
import { focusRing } from '../../ui.js';
import { mirror } from '../../a11y.js';
import { Sfx } from '../../sfx.js';
import { TYPE, INK, MARK } from '../../theme.js';
import { gradeHotspots } from '../core/scoring.js';
import { para, verdict } from '../kit.js';
import { label as artLabel } from '../art/common.js';

const TONE = { green: 'good', orange: 'ok', red: 'bad' };

export default async function tapHotspots(ctx, sc) {
  const { scene, layer, t } = ctx;
  const art = await ctx.art(sc.art, { y: 96, h: 640 });
  if (!art) return;
  const sel = new Set();
  let marks = null, checked = false, focus = null;
  const prompt = para(scene, layer, ctx.text(sc.prompt), 748, { size: TYPE.body, color: INK.strong, bold: true });

  // Items drawn by the art if it knows how, otherwise as labelled markers.
  const g = scene.add.graphics(); layer.add(g);
  const labels = scene.add.container(0, 0); layer.add(labels);
  const pos = it => (art.toScreen ? art.toScreen(it.x, it.y) : { x: it.x, y: it.y });
  const dim = it => (art.itemSize ? art.itemSize(it.kind) : { w: it.w || 44, h: it.h || 44 });
  const draw = () => {
    g.clear(); labels.removeAll(true);
    const m = marks || Object.fromEntries([...sel].map(id => [id, 'sel']));
    if (art.drawItems) art.drawItems(sc.items, m);
    sc.items.forEach(it => {
      const p = pos(it), { w, h } = dim(it), mk = m[it.id];
      if (!art.drawItems) { g.fillStyle(C.navy, 0.9); g.fillCircle(p.x, p.y, 18); g.lineStyle(2, 0xFFFFFF, 0.9); g.strokeCircle(p.x, p.y, 18); }
      if (mk) {
        const st = MARK[mk];
        g.lineStyle(3, st.color, 1); g.strokeRoundedRect(p.x - w / 2 - 6, p.y - h / 2 - 6, w + 12, h + 12, 10);
        g.fillStyle(st.color, 1); g.fillCircle(p.x + w / 2 + 4, p.y - h / 2 - 4, 11);
        labels.add(artLabel(scene, p.x + w / 2 + 4, p.y - h / 2 - 4, st.symbol, 13, INK.dark));
      }
      if (focus === it.id) focusRing(g, p.x - w / 2 - 6, p.y - h / 2 - 6, w + 12, h + 12, 10);
    });
  };
  sc.items.forEach(it => {
    const p = pos(it), d = dim(it), z = scene.add.zone(p.x, p.y, Math.max(48, d.w + 12), Math.max(48, d.h + 12)).setInteractive({ useHandCursor: true });
    layer.add(z);
    const toggle = () => { if (checked) return; Sfx.init(scene); Sfx.click(); sel.has(it.id) ? sel.delete(it.id) : sel.add(it.id); check.setEnabled(sel.size > 0); draw(); };
    z.on('pointerup', toggle);
    const st = () => (marks && marks[it.id] ? ', ' + t('hotspot.mark.' + marks[it.id]) : '');
    mirror(z, () => ctx.text(it.label) + st(), toggle, { isPressed: () => sel.has(it.id), onFocus: v => { focus = v ? it.id : null; draw(); }, isEnabled: () => !checked });
  });
  draw();
  ctx.describe(ctx.text(sc.prompt), [art.alt]);

  const check = ctx.primary(t('lab.check'), () => {
    checked = true; check.destroy(); prompt.destroy();
    const r = gradeHotspots(sc.items, [...sel]);
    marks = r.marks; draw();
    if (art.reveal) art.reveal();
    ctx.answer({ selected: [...sel], verdict: r.verdict }, { ok: r.ok, wrong: r.wrong, missed: r.missed });
    ctx.result(r.verdict === 'green', { verdict: r.verdict });
    const legend = [t('hotspot.legend.ok')];
    if (r.wrong) legend.push(t('hotspot.legend.wrong'));
    if (r.missed) legend.push(t('hotspot.legend.missed'));
    verdict(scene, layer, { tone: TONE[r.verdict], title: t('hotspot.title.' + r.verdict), body: ctx.text(sc.feedback[r.verdict]) + '\n' + legend.join('  ') }, 0, { bottomAt: 836, size: TYPE.small });
    if (sc.retry && r.verdict !== 'green') {
      ctx.secondary(t('lab.tryAgain'), () => ctx.again(), 880, { w: 200 }).setX(W / 2 - 112);
      ctx.primary(t('lab.continue'), () => ctx.next(), 880, { w: 200 }).setX(W / 2 + 112);
    } else ctx.primary(t('lab.continue'), () => ctx.next(), 880);
  });
  check.setEnabled(false);
}
