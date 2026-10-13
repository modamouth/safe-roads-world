// pick-a-point: choose among lettered locations on a street or map. Each point
// has its own feedback; wrong picks offer "Try another point". With
// until: 'all', the player sees every point before moving on.
import { COLORS as C } from '../../config.js';
import { focusRing } from '../../ui.js';
import { mirror } from '../../a11y.js';
import { Sfx } from '../../sfx.js';
import { TYPE, INK, VERDICT } from '../../theme.js';
import { para, verdict } from '../kit.js';
import { label as artLabel } from '../art/common.js';

export default async function pickAPoint(ctx, sc) {
  const { scene, layer, t } = ctx;
  const art = await ctx.art(sc.art, { y: 96, h: 640 });
  if (!art) return;
  const visited = Object.assign({}, (ctx.saved() || {}).visited);
  const letter = i => String.fromCharCode(65 + i);
  const pos = p => (art.toScreen ? art.toScreen(p.x, p.y) : { x: p.x, y: p.y });
  const ui = scene.add.container(0, 0); layer.add(ui);
  const prompt = para(scene, ui, ctx.text(sc.prompt), 748, { size: TYPE.body, color: INK.strong, bold: true });
  let chosen = false;

  sc.points.forEach((pt, i) => {
    const p = pos(pt), g = scene.add.graphics(); ui.add(g);
    let focused = false;
    const v = visited[pt.id] ? VERDICT[pt.verdict] : null;
    const draw = () => {
      g.clear();
      g.fillStyle(0x05080D, 0.5); g.fillCircle(p.x + 2, p.y + 3, 22);
      g.fillStyle(v ? v.color : C.yellow, 1); g.fillCircle(p.x, p.y, 21);
      g.lineStyle(3, C.navy, 1); g.strokeCircle(p.x, p.y, 21);
      if (focused) focusRing(g, p.x - 24, p.y - 24, 48, 48, 24);
    };
    draw();
    ui.add(artLabel(scene, p.x, p.y, letter(i), 20, INK.dark));
    if (v) { g.fillStyle(C.navy, 1); g.fillCircle(p.x + 17, p.y - 17, 10); ui.add(artLabel(scene, p.x + 17, p.y - 17, v.symbol, 12, '#FFFFFF')); }
    const z = scene.add.zone(p.x, p.y, 56, 56).setInteractive({ useHandCursor: true }); ui.add(z);
    const pick = () => { if (chosen) return; Sfx.init(scene); Sfx.click(); choose(pt, i); };
    z.on('pointerup', pick);
    mirror(z, t('point.label', { letter: letter(i), label: ctx.text(pt.label) }) + (v ? ', ' + t('point.seen') : ''), pick, { onFocus: f => { focused = f; draw(); } });
    // Name tags help sighted players too.
    ui.add(artLabel(scene, p.x, p.y + 34, ctx.text(pt.label), 13, '#FFFFFF', { backgroundColor: '#05080DCC', padding: { x: 6, y: 3 } }));
  });
  ctx.describe(ctx.text(sc.prompt), [art.alt].concat(sc.points.map((p, i) => t('point.label', { letter: letter(i), label: ctx.text(p.label) }))));

  async function choose(pt, i) {
    chosen = true;
    visited[pt.id] = true;
    ctx.answer({ visited, last: pt.id }, { point: pt.id });
    ctx.result(pt.verdict === 'good', { point: pt.id });
    prompt.destroy();
    if (pt.play && art.play) { ui.setVisible(false); await art.play(pt.id, ctx.vars, pt); }
    if (!scene.scene.isActive()) return;
    ui.setVisible(false);
    verdict(scene, layer, { tone: pt.verdict, title: letter(i) + '. ' + ctx.text(pt.title), body: ctx.text(pt.reason) }, 0, { bottomAt: 836 });
    const all = sc.points.every(p => visited[p.id]);
    const needAll = sc.until === 'all';
    if ((needAll && !all) || (!needAll && pt.verdict !== 'good')) {
      const nextUnseen = sc.points.findIndex(p => !visited[p.id]);
      ctx.primary(needAll && pt.verdict === 'good' ? t('point.see', { letter: letter(nextUnseen) }) : t('point.tryAnother'), () => ctx.again(), 900);
    } else ctx.primary(t('lab.continue'), () => ctx.next(), 900);
  }
}
