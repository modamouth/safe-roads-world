// place-on-road: drag (or step with buttons) a vehicle or person along one
// axis into the safest position, then confirm. The art supplies `place`:
// { get(), set(v), valueAt(px, py) }. Zones in the content map positions to
// results; each result has its own verdict copy.
import { W } from '../../config.js';
import { TYPE, INK } from '../../theme.js';
import { gradePlacement } from '../core/scoring.js';
import { para, verdict } from '../kit.js';

export default async function placeOnRoad(ctx, sc) {
  const { scene, layer, t } = ctx;
  const art = await ctx.art(sc.art, { y: 96, h: 640 });
  if (!art || !art.place) return;
  const [lo, hi] = sc.range;
  const clampV = v => Math.max(Math.min(lo, hi), Math.min(Math.max(lo, hi), v));
  art.place.set(clampV(sc.start));
  const prompt = para(scene, layer, ctx.text(sc.prompt), 748, { size: TYPE.body, color: INK.strong, bold: true });

  // Drag anywhere over the illustration.
  const z = scene.add.zone(W / 2, 96 + 320, W, 640).setInteractive({ useHandCursor: true });
  layer.add(z);
  let done = false;
  const move = p => { if (!done && p.isDown) art.place.set(clampV(art.place.valueAt(p.worldX, p.worldY))); };
  z.on('pointerdown', move); z.on('pointermove', move);

  // Keyboard and screen-reader alternative: step buttons.
  const stepBy = d => { if (!done) { art.place.set(clampV(art.place.get() + d * sc.step)); ctx.announce(t('place.moved')); } };
  const back = ctx.secondary(t('place.back'), () => stepBy(-1), 818, { w: 150, a11y: t('place.backLong') });
  const fwd = ctx.secondary(t('place.forward'), () => stepBy(1), 818, { w: 150, a11y: t('place.forwardLong') });
  back.setX(W / 2 - 160); fwd.setX(W / 2 + 160);
  ctx.describe(ctx.text(sc.prompt), [art.alt, t('place.help')]);

  const confirm = ctx.primary(t('place.confirm'), () => {
    done = true;
    [confirm, back, fwd, prompt].forEach(o => o.destroy());
    z.disableInteractive();
    const v = art.place.get();
    const res = gradePlacement(v, sc.zones, sc.fallback), copy = sc.results[res];
    if (art.reveal) art.reveal(res);
    ctx.answer({ position: Math.round(v * 10) / 10, result: res });
    ctx.result(copy.tone === 'good', { result: res });
    verdict(scene, layer, { tone: copy.tone, title: ctx.text(copy.title), body: ctx.text(copy.body) }, 0, { bottomAt: 836 });
    if (copy.retry) ctx.primary(t('lab.tryAgain'), () => ctx.again(), 900);
    else ctx.primary(t('lab.continue'), () => ctx.next(), 900);
  }, 896);
}
