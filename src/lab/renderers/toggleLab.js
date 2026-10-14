// toggle-lab: the same illustration under two to four states (without/with,
// speeds, dry/wet...). Switching state is the lesson. With requireAll, every
// state must be viewed before Continue.
import { W } from '../../config.js';
import { panel } from '../../ui.js';
import { TYPE, INK, SPACE, BAND } from '../../theme.js';
import { para, segmented } from '../kit.js';
import { resolveParams } from '../core/format.js';
import { claim } from '../content.js';

export default async function toggleLab(ctx, sc) {
  const { scene, layer, t } = ctx;
  const art = await ctx.art(sc.art, { y: 100, h: 470 });
  if (!art) return;
  const seen = new Set();
  let initial = sc.initial || sc.states[0].id;
  if (initial.startsWith('$var:')) {
    const v = ctx.vars[initial.slice(5)];
    initial = (sc.states.find(s => String(s.id) === String(v) || (s.params && String(s.params.value) === String(v))) || sc.states[0]).id;
  }

  const prompt = para(scene, layer, ctx.text(sc.prompt), 584, { size: TYPE.body, color: INK.muted });
  const segY = prompt.y + prompt.height + 40;
  let capBox = null, seq = 0;
  const seg = segmented(scene, layer, sc.states.map(s => ({ id: s.id, label: ctx.text(s.label) })), segY, s => show(s.id), initial);

  const cont = ctx.primary(t('lab.continue'), () => ctx.next());
  const update = () => cont.setEnabled(!sc.requireAll || sc.states.every(s => seen.has(s.id)));
  if (sc.requireAll) para(scene, layer, t('toggle.tryAll'), segY + 44, { size: TYPE.tiny, color: INK.faint });

  // Picking a state while another is still animating replaces it; the older one's result is ignored.
  async function show(id) {
    const my = ++seq;
    const s = sc.states.find(x => x.id === id);
    seg.setCurrent(id);
    seen.add(id); update();
    ctx.answer([...seen], { state: id });
    if (capBox) { capBox.destroy(); capBox = null; }
    if (art.setState) await art.setState(Object.assign({ id }, resolveParams(s.params || {}, claim)), ctx.vars);
    if (my !== seq || !scene.scene.isActive()) return;
    if (s.caption) {
      capBox = scene.add.container(0, 0); layer.add(capBox);
      // Under the controls, so it never hides the part of the picture that matters.
      const tx = para(scene, null, ctx.text(s.caption), 0, { size: TYPE.body, color: INK.strong, width: W - 96 });
      const top = segY + (sc.requireAll ? 66 : 48);
      const available = BAND.primaryY - 40 - top;
      // Keep longer captions above the fixed navigation, without moving art.
      let size = TYPE.body;
      while (tx.height + 24 > available && size > TYPE.small) {
        size--; tx.setFontSize(size).setLineSpacing(Math.round(size * 0.28));
      }
      const h = tx.height + 24;
      capBox.add(panel(scene, SPACE.gutter + 8, top, W - SPACE.gutter * 2 - 16, h, { alpha: 0.9, r: 14 }));
      tx.setY(top + 12); capBox.add(tx);
    }
    ctx.announce([ctx.text(s.label), s.caption ? ctx.text(s.caption) : ''].filter(Boolean).join('. '));
  }

  ctx.describe(ctx.text(sc.prompt), [art.alt]);
  await show(initial);
}
