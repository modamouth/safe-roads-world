// choice: pick one option and confirm. Options may carry a verdict and a
// reason; with `retry`, a 'bad' choice offers "Try another". With `record`,
// the option's value is saved as {var:<record>} for later scenes.
import { TYPE, INK } from '../../theme.js';
import { para, optionList, verdict } from '../kit.js';

const TITLE = { good: 'verdict.good', ok: 'verdict.ok', bad: 'verdict.bad' };

export default async function choice(ctx, sc) {
  const { scene, layer, t } = ctx;
  const art = sc.art ? await ctx.art(sc.art, { y: 104, h: 360 }) : null;
  let sel = null;
  const ui = scene.add.container(0, 0); layer.add(ui);
  const prompt = para(scene, ui, ctx.text(sc.prompt), art ? 482 : 160, { size: art ? TYPE.lead : TYPE.h2, color: INK.strong, bold: true });
  const row = sc.layout === 'row';
  const { list } = optionList(scene, ui, sc.options.map(o => ({
    label: ctx.text(o.label), selected: () => sel === o.id, onTap: () => { sel = o.id; list.forEach(x => x.redraw()); confirm.setEnabled(true); }
  })), prompt.y + prompt.height + 24, { cols: row ? sc.options.length : 1, h: row ? 72 : 62, size: row ? (sc.options.length > 2 ? 20 : 24) : TYPE.body });
  ctx.describe(ctx.text(sc.prompt), [art && art.alt]);

  const confirm = ctx.primary(t('lab.confirm'), () => decide());
  confirm.setEnabled(false);

  async function decide() {
    const o = sc.options.find(x => x.id === sel);
    confirm.destroy(); list.forEach(x => x.setEnabled(false));
    ctx.answer(o.id, { value: o.value });
    if (o.verdict) ctx.result(o.verdict === 'good', { option: o.id });
    if (sc.record) ctx.setVar(sc.record, o.value != null ? o.value : o.id);
    if (o.play && art && art.play) { ui.setVisible(false); await art.play(o.id, ctx.vars); ui.setVisible(true); }
    if (!scene.scene.isActive()) return;
    ui.removeAll(true);
    if (o.verdict || o.reason) {
      verdict(scene, layer, { tone: o.verdict || 'ok', title: ctx.text(o.title || t(TITLE[o.verdict || 'ok'])), body: o.reason ? ctx.text(o.reason) : '' }, 0, { bottomAt: 820 });
    } else {
      para(scene, layer, t('choice.chose', { option: ctx.text(o.label) }), 560, { size: TYPE.lead, color: INK.accent, bold: true });
    }
    if (sc.retry && o.verdict === 'bad') ctx.primary(t('lab.tryAnother'), () => ctx.again());
    else ctx.primary(t('lab.continue'), () => ctx.next());
  }
}
