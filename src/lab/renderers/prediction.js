// prediction: a question asked up front and answered later by a `reveal` scene.
// No feedback here; the choice can change until Continue.
import { REDUCE_MOTION } from '../../config.js';
import { TYPE, INK } from '../../theme.js';
import { withUnit } from '../core/format.js';
import { para, eyebrow, optionList } from '../kit.js';

export default function prediction(ctx, sc) {
  const { scene, layer, t } = ctx;
  let choice = ctx.saved();
  eyebrow(scene, layer, t('predict.eyebrow'), 132);
  const q = para(scene, layer, ctx.text(sc.question), 160, { size: TYPE.h2, color: INK.strong, bold: true });

  const opts = sc.format === 'numeric'
    ? sc.options.map(v => ({ id: v, label: withUnit(v, sc.unit) }))
    : sc.options.map(o => ({ id: o.id, label: ctx.text(o.label) }));
  const numeric = sc.format === 'numeric';
  const cols = numeric ? (opts.length <= 3 ? opts.length : opts.length === 4 ? 2 : 3) : 1;
  const { list, bottom } = optionList(scene, layer, opts.map(o => ({
    label: o.label, selected: () => choice === o.id, onTap: () => pick(o.id)
  })), q.y + q.height + 34, { cols, h: numeric ? 76 : 66, size: numeric ? 26 : TYPE.lead });

  para(scene, layer, ctx.text(sc.note || t('predict.note')), bottom + 30, { size: TYPE.small, color: INK.muted });
  ctx.describe(t('predict.eyebrow'), [ctx.text(sc.question), t('predict.note')]);

  const cont = ctx.primary(t('lab.continue'), () => {
    ctx.answer(choice);
    ctx.next();
  });
  cont.setVisible(choice != null);

  function pick(id) {
    choice = id;
    list.forEach(o => o.redraw());
    if (!cont.visible) {
      cont.setVisible(true);
      if (!REDUCE_MOTION) { cont.setAlpha(0); scene.tweens.add({ targets: cont, alpha: 1, duration: 200 }); }
    }
  }
}
