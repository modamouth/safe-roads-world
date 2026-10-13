// resources: links to real Namibian organisations and official sources.
import { W, COLORS as C } from '../../config.js';
import { panel, focusRing } from '../../ui.js';
import { mirrorLink } from '../../a11y.js';
import { Sfx } from '../../sfx.js';
import { TYPE, INK, SPACE } from '../../theme.js';
import { para, heading } from '../kit.js';
import { labEvent } from '../analytics.js';

export default function resources(ctx, sc) {
  const { scene, layer, t } = ctx;
  const h = heading(scene, layer, t('resources.heading'), 112, TYPE.h1);
  let y = h.y + h.height + 12;
  if (sc.intro) { const i = para(scene, layer, ctx.text(sc.intro), y, { size: TYPE.body, color: INK.muted }); y = i.y + i.height + 18; }
  const rowH = Math.min(104, (800 - y) / sc.items.length - 10);
  sc.items.forEach(l => {
    const c = scene.add.container(0, 0); layer.add(c);
    const g = scene.add.graphics(); c.add(g);
    const top = y;
    let hi = false;
    const draw = () => {
      g.clear();
      g.fillStyle(C.navy2, hi ? 1 : 0.94); g.fillRoundedRect(SPACE.gutter, top, W - SPACE.gutter * 2, rowH, 16);
      g.lineStyle(2, C.teal, hi ? 1 : 0.6); g.strokeRoundedRect(SPACE.gutter, top, W - SPACE.gutter * 2, rowH, 16);
    };
    draw();
    const name = para(scene, c, ctx.text(l.name) + '  ↗', top + 14, { x: SPACE.gutter + 18, align: 'left', size: TYPE.body, color: INK.strong, bold: true, width: W - SPACE.gutter * 2 - 36 });
    if (l.desc) para(scene, c, ctx.text(l.desc), name.y + name.height + 4, { x: SPACE.gutter + 18, align: 'left', size: TYPE.tiny, color: INK.muted, width: W - SPACE.gutter * 2 - 36 });
    const z = scene.add.zone(W / 2, top + rowH / 2, W - SPACE.gutter * 2, rowH).setInteractive({ useHandCursor: true }); c.add(z);
    z.on('pointerover', () => { hi = true; draw(); }); z.on('pointerout', () => { hi = false; draw(); });
    z.on('pointerup', () => {
      Sfx.init(scene); Sfx.click();
      labEvent('link_opened', { exp: ctx.exp, topic: ctx.topic, sc }, { url: l.url });
      window.open(l.url, '_blank', 'noopener');
    });
    const a = mirrorLink(z, ctx.text(l.name), l.url);
    if (a) { a.addEventListener('focus', () => { draw(); focusRing(g, SPACE.gutter, top, W - SPACE.gutter * 2, rowH, 16); }); a.addEventListener('blur', draw); }
    y += rowH + 10;
  });
  ctx.describe(t('resources.heading'), [sc.intro && ctx.text(sc.intro)].concat(sc.items.map(l => ctx.text(l.name) + (l.desc ? ': ' + ctx.text(l.desc) : ''))));
  ctx.primary(t('lab.finish'), () => ctx.next());
}
