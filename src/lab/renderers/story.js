// story: narrated set-up lines over an optional illustration, one line per tap.
import { W } from '../../config.js';
import { panel } from '../../ui.js';
import { TYPE, INK, SPACE } from '../../theme.js';
import { para } from '../kit.js';

export default async function story(ctx, sc) {
  const { scene, layer, t } = ctx;
  const art = sc.art ? await ctx.art(sc.art, { y: 104, h: 440 }) : null;
  const top = art ? 566 : 260;
  let i = 0, box = null;

  const show = () => {
    if (box) box.destroy();
    box = scene.add.container(0, 0); layer.add(box);
    const line = ctx.text(sc.lines[i]);
    const tx = para(scene, null, line, 0, { size: art ? TYPE.lead : TYPE.h2, color: INK.strong, bold: !art, width: W - 100 });
    const h = tx.height + 48;
    box.add(panel(scene, SPACE.gutter, top, W - SPACE.gutter * 2, h, { alpha: 0.92, r: SPACE.radius }));
    const g = scene.add.graphics(); g.fillStyle(0xFFCB2B, 1); g.fillRoundedRect(SPACE.gutter, top + 14, 5, h - 28, 3);
    tx.setY(top + 24);
    box.add([g, tx]);
    ctx.describe(line, [art && i === 0 ? art.alt : null]);
    btn.setLabel(i < sc.lines.length - 1 ? t('lab.continue') : ctx.text(sc.button || t('lab.continue')));
  };
  const btn = ctx.primary(t('lab.continue'), () => {
    if (i < sc.lines.length - 1) { i++; show(); } else ctx.next();
  });
  show();
}
