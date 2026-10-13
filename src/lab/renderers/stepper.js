// stepper: a numbered checklist, one rule per card, with Previous / Next.
// A step's `highlight` is passed to the art (e.g. a blind-spot zone).
import { W } from '../../config.js';
import { panel } from '../../ui.js';
import { TYPE, INK, SPACE } from '../../theme.js';
import { para, eyebrow, heading } from '../kit.js';

export default async function stepper(ctx, sc) {
  const { scene, layer, t } = ctx;
  const art = sc.art ? await ctx.art(sc.art, { y: 96, h: 400 }) : null;
  const top = art ? 512 : 210;
  if (!art) heading(scene, layer, ctx.text(sc.title), 112, TYPE.h1);
  let i = 0, card = null;
  const prev = ctx.secondary(t('lab.previous'), () => go(-1), 0, { w: 200 });
  const next = ctx.primary(t('lab.next'), () => go(1), 0, { w: 200 });
  prev.setPosition(W / 2 - 112, 872); next.setPosition(W / 2 + 112, 872);

  function show() {
    const s = sc.steps[i];
    if (card) card.destroy();
    card = scene.add.container(0, 0); layer.add(card);
    if (art && art.highlight) art.highlight(s.highlight || null);
    const n = sc.steps.length;
    const title = para(scene, null, ctx.text(s.title), 0, { size: TYPE.h2, color: INK.strong, bold: true, width: W - 110 });
    const body = para(scene, null, ctx.text(s.body), 0, { size: TYPE.body, width: W - 100 });
    const h = 54 + title.height + 14 + body.height + 30;
    card.add(panel(scene, SPACE.gutter, top, W - SPACE.gutter * 2, h, { alpha: 0.94, r: SPACE.radius, stroke: 0xFFCB2B, strokeA: 0.6 }));
    eyebrow(scene, card, (art ? ctx.text(sc.title) + '  ·  ' : '') + t('stepper.count', { n: i + 1, of: n }), top + 26);
    title.setY(top + 48); body.setY(title.y + title.height + 14);
    card.add([title, body]);
    prev.setEnabled(i > 0);
    next.setLabel(i < n - 1 ? t('lab.next') : t('lab.continue'));
    ctx.describe((art ? ctx.text(sc.title) + '. ' : '') + t('stepper.count', { n: i + 1, of: n }), [ctx.text(s.title), ctx.text(s.body), i === 0 && art ? art.alt : null]);
    ctx.answer(i + 1);
  }
  function go(d) {
    if (i + d >= sc.steps.length) { ctx.next(); return; }
    i = Math.max(0, i + d); show();
  }
  show();
}
