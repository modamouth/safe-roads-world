// reveal: answers the opening prediction with the real figure and its source.
import { W, COLORS as C } from '../../config.js';
import { Sfx } from '../../sfx.js';
import { TYPE, INK } from '../../theme.js';
import { withUnit } from '../core/format.js';
import { predictionCorrect } from '../core/scoring.js';
import { claim } from '../content.js';
import { para, heading, optionList } from '../kit.js';

export default function reveal(ctx, sc) {
  const { scene, layer, t } = ctx;
  const pred = ctx.topic.scenes.find(s => s.id === sc.of);
  const guess = ctx.saved(pred.id);
  const numeric = pred.format === 'numeric';
  const ans = numeric ? (claim(pred.answerClaim) || {}).value : pred.answer;
  const right = predictionCorrect(ans, guess);
  ctx.result(right, { guess, answer: ans, prediction: pred.id });
  ctx.text('{claim:' + pred.answerClaim + '}');  // marks an unverified answer in the footnote
  ctx.sources([pred.answerClaim]);
  if (guess != null) Sfx.chime(right);

  const title = guess == null ? t('reveal.answer') : right ? t('reveal.right') : t('reveal.wrong');
  const h = heading(scene, layer, title, 120, TYPE.display);
  const q = para(scene, layer, ctx.text(pred.question), h.y + h.height + 14, { size: TYPE.body, color: INK.muted });

  const opts = numeric ? pred.options.map(v => ({ id: v, label: withUnit(v, pred.unit) })) : pred.options.map(o => ({ id: o.id, label: ctx.text(o.label) }));
  const cols = numeric ? (opts.length <= 3 ? opts.length : opts.length === 4 ? 2 : 3) : 1;
  const { list, bottom } = optionList(scene, layer, opts.map(o => ({ label: o.label, selected: () => false, onTap: () => {} })), q.y + q.height + 24,
    { cols, h: numeric ? 64 : 54, size: numeric ? 24 : TYPE.body });
  list.forEach((o, i) => {
    o.setEnabled(false);
    const id = opts[i].id;
    if (predictionCorrect(ans, id)) o.setMark('answer');
    else if (predictionCorrect(guess, id)) o.setMark('wrong');
  });
  const ex = para(scene, layer, ctx.text(sc.explain), bottom + 28, { size: TYPE.lead, color: INK.strong });
  if (guess != null && !right) {
    const mine = opts.find(o => predictionCorrect(guess, o.id));
    para(scene, layer, t('reveal.yours', { guess: mine ? mine.label : String(guess) }), ex.y + ex.height + 16, { size: TYPE.small, color: INK.muted });
  }
  const g = scene.add.graphics(); layer.add(g); g.fillStyle(C.yellow, 1); g.fillRect(W / 2 - 30, h.y - 14, 60, 4);
  ctx.describe(title, [ctx.text(pred.question), ctx.text(sc.explain), guess != null && !right ? t('reveal.yours', { guess: String(guess) }) : null]);
  ctx.primary(t('lab.continue'), () => ctx.next());
}
