// stories: an optional, clearly labelled fictional story. A content warning
// comes first with a choice to read or skip, and the story ends with a
// support signpost. Real survivor stories are out of scope (IP-AND-CARE.md).
import { W, COLORS as C } from '../../config.js';
import { panel } from '../../ui.js';
import { mirrorLink } from '../../a11y.js';
import { TYPE, INK, SPACE } from '../../theme.js';
import { para, heading, eyebrow } from '../kit.js';
import { labEvent } from '../analytics.js';

export default function stories(ctx, sc) {
  const { scene, layer, t } = ctx;
  let page = scene.add.container(0, 0); layer.add(page);
  let a = null, b = null;

  // 1) Content warning
  eyebrow(scene, page, t('stories.eyebrow'), 150);
  const h = heading(scene, page, ctx.text(sc.title), 178, TYPE.h1);
  const lab = para(scene, page, ctx.text(sc.label), h.y + h.height + 12, { size: TYPE.small, color: INK.accent, bold: true });
  const top = lab.y + lab.height + 30;
  const w = para(scene, null, ctx.text(sc.warning), 0, { size: TYPE.body, width: W - 110 });
  page.add(panel(scene, SPACE.gutter, top, W - SPACE.gutter * 2, w.height + 44, { alpha: 0.94, r: SPACE.radius, stroke: 0xFFB020, strokeA: 0.9 }));
  w.setY(top + 22); page.add(w);
  ctx.describe(ctx.text(sc.title), [ctx.text(sc.label), ctx.text(sc.warning)]);
  a = ctx.primary(t('stories.read'), () => read(), 780);
  b = ctx.secondary(t('stories.skip'), () => { ctx.answer('skipped'); ctx.next(); }, 860);

  // 2) The story and a signpost
  function read() {
    ctx.answer('read');
    a.destroy(); b.destroy(); page.destroy();
    page = scene.add.container(0, 0); layer.add(page);
    eyebrow(scene, page, ctx.text(sc.label), 112);
    const hh = heading(scene, page, ctx.text(sc.title), 136, TYPE.h2);
    let y = hh.y + hh.height + 18;
    const paras = sc.paragraphs.map(p => ctx.text(p));
    paras.forEach(p => { const tx = para(scene, page, p, y, { size: TYPE.body, align: 'left', x: SPACE.gutter + 6, width: W - SPACE.gutter * 2 - 12 }); y = tx.y + tx.height + 14; });
    const sp = para(scene, null, ctx.text(sc.signpost.text), 0, { size: TYPE.small, width: W - 110 });
    const linksH = sc.signpost.links.length * 30;
    const top2 = Math.min(y + 10, 760 - sp.height - linksH);
    page.add(panel(scene, SPACE.gutter, top2, W - SPACE.gutter * 2, sp.height + linksH + 40, { alpha: 0.95, r: SPACE.radius, stroke: C.teal, strokeA: 0.9 }));
    sp.setY(top2 + 16); page.add(sp);
    sc.signpost.links.forEach((l, i) => {
      const lt = para(scene, page, '↗ ' + l.name, sp.y + sp.height + 10 + i * 30, { size: TYPE.small, color: INK.link, bold: true });
      lt.setInteractive({ useHandCursor: true }).on('pointerup', () => open(l));
      mirrorLink(lt, l.name, l.url);
    });
    ctx.describe(ctx.text(sc.title), paras.concat([ctx.text(sc.signpost.text)]));
    ctx.primary(t('lab.continue'), () => ctx.next());
  }

  function open(l) {
    labEvent('link_opened', { exp: ctx.exp, topic: ctx.topic, sc }, { url: l.url });
    window.open(l.url, '_blank', 'noopener');
  }
}
