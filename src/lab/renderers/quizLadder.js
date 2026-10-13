// quiz-ladder: a run of true/false, multiple-choice and select-all questions.
// Each answer gets an immediate verdict and a plain-language reason. An
// optional banded score screen closes the run.
import { W } from '../../config.js';
import { panel } from '../../ui.js';
import { TYPE, INK, SPACE } from '../../theme.js';
import { gradeQuestion, band } from '../core/scoring.js';
import { para, eyebrow, optionList, verdict } from '../kit.js';

export default async function quizLadder(ctx, sc) {
  const { scene, layer, t } = ctx;
  const qs = sc.questions, results = {};
  let page = null, artBox = null;
  const fresh = () => {
    if (page) page.destroy();
    if (artBox) { artBox.destroy(); artBox = null; }
    page = scene.add.container(0, 0); layer.add(page); return page;
  };
  let btn = null;
  const setButton = (label, cb) => { if (btn) btn.destroy(); btn = ctx.primary(label, cb); };

  async function question(i) {
    const q = qs[i], p = fresh();
    let y = 112;
    eyebrow(scene, p, t('quiz.count', { n: i + 1, of: qs.length }), y);
    y += 26;
    if (q.art) {
      artBox = await ctx.art(q.art, { y, h: 170 });
      if (!scene.scene.isActive()) return;
      y += 186;
    }
    if (q.line) {
      const l = para(scene, p, ctx.text(q.line), y, { size: TYPE.body, color: INK.muted });
      y = l.y + l.height + 14;
    }
    const pr = para(scene, p, ctx.text(q.prompt), y, { size: TYPE.h2, color: INK.strong, bold: true });
    y = pr.y + pr.height + 22;
    if (q.kind === 'multi') { para(scene, p, t('quiz.selectAll'), y - 8, { size: TYPE.small, color: INK.accent }); y += 24; }
    const sel = new Set();
    const { list } = optionList(scene, p, q.options.map(o => ({
      label: ctx.text(o.label),
      selected: () => sel.has(o.id),
      onTap: () => {
        if (q.kind === 'multi') { sel.has(o.id) ? sel.delete(o.id) : sel.add(o.id); } else { sel.clear(); sel.add(o.id); }
        list.forEach(x => x.redraw()); btn.setEnabled(sel.size > 0);
      }
    })), y, { cols: q.kind === 'truefalse' ? 2 : 1, h: q.kind === 'truefalse' ? 70 : 58, size: q.kind === 'truefalse' ? 23 : TYPE.body });
    ctx.describe(t('quiz.count', { n: i + 1, of: qs.length }), [q.line && ctx.text(q.line), ctx.text(q.prompt), artBox && artBox.alt]);
    setButton(t('lab.check'), () => check(i, [...sel]));
    btn.setEnabled(false);
  }

  function check(i, selected) {
    const q = qs[i], g = gradeQuestion(q, selected);
    results[q.id] = g.correct;
    ctx.answer({ question: q.id, selected, correct: g.correct }, { question: q.id });
    ctx.result(g.correct, { question: q.id });

    // Verdict page: what you chose, the right answer, and why.
    const p = fresh();
    let y = 112;
    eyebrow(scene, p, t('quiz.count', { n: i + 1, of: qs.length }), y);
    const pr = para(scene, p, ctx.text(q.prompt), y + 26, { size: TYPE.lead, color: INK.strong, bold: true });
    y = pr.y + pr.height + 22;
    const label = id => ctx.text(q.options.find(o => o.id === id).label);
    const mine = selected.map(label).join(', ');
    const right = q.options.filter(o => o.correct).map(o => ctx.text(o.label)).join(', ');
    const rows = [[t('quiz.yourAnswer'), mine, g.correct ? '#4ED18A' : '#FFB54A']];
    if (!g.correct) rows.push([t('quiz.rightAnswer'), right, '#4ED18A']);
    const box = scene.add.container(0, 0); p.add(box);
    let by = y + 20;
    const texts = rows.map(([k, v, c]) => {
      const kt = para(scene, null, k, by, { x: SPACE.gutter + 24, align: 'left', size: TYPE.small, color: INK.muted });
      const vt = para(scene, null, v, by + 22, { x: SPACE.gutter + 24, align: 'left', size: TYPE.body, color: c, bold: true, width: W - SPACE.gutter * 2 - 48 });
      by = vt.y + vt.height + 14;
      return [kt, vt];
    });
    box.add(panel(scene, SPACE.gutter, y, W - SPACE.gutter * 2, by - y + 6, { alpha: 0.9, r: 16 }));
    texts.forEach(([a, b]) => box.add([a, b]));
    const tone = g.correct ? 'good' : g.partial ? 'ok' : 'bad';
    verdict(scene, p, { tone, title: t(g.correct ? 'quiz.correct' : g.partial ? 'quiz.partly' : 'quiz.incorrect'), body: ctx.text(q.reason) }, by + 26);
    setButton(i < qs.length - 1 ? t('lab.next') : sc.score ? t('quiz.seeScore') : t('lab.continue'), () => {
      if (i < qs.length - 1) question(i + 1); else if (sc.score) score(); else ctx.next();
    });
  }

  function score() {
    const n = Object.values(results).filter(Boolean).length;
    ctx.score(n, qs.length);
    const b = band(n, qs.length, sc.score.bands);
    const p = fresh();
    eyebrow(scene, p, t('quiz.scoreEyebrow'), 160);
    const big = para(scene, p, t('quiz.score', { n, of: qs.length }), 200, { size: 44, color: INK.accent, bold: true });
    const h = para(scene, p, ctx.text(b.title), big.y + big.height + 24, { size: TYPE.h1, color: INK.strong, bold: true });
    para(scene, p, ctx.text(b.body), h.y + h.height + 18, { size: TYPE.lead });
    ctx.describe(t('quiz.score', { n, of: qs.length }), [ctx.text(b.title), ctx.text(b.body)]);
    setButton(t('lab.continue'), () => ctx.next());
  }

  if (sc.intro) {
    const p = fresh();
    const tx = para(scene, p, ctx.text(sc.intro), 300, { size: TYPE.h2, color: INK.strong, bold: true });
    ctx.describe(ctx.text(sc.intro), [t('quiz.introCount', { n: qs.length })]);
    para(scene, p, t('quiz.introCount', { n: qs.length }), tx.y + tx.height + 24, { size: TYPE.body, color: INK.muted });
    setButton(t('lab.start'), () => question(0));
  } else await question(0);
}
