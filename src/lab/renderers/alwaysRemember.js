// always-remember: three short lines to take away.
import { TYPE } from '../../theme.js';
import { heading, numbered } from '../kit.js';

export default function alwaysRemember(ctx, sc) {
  const { scene, layer, t } = ctx;
  heading(scene, layer, t('remember.heading'), 140, TYPE.display);
  const lines = sc.lines.map(l => ctx.text(l));
  numbered(scene, layer, lines, 230, { size: TYPE.lead, gap: 30 });
  ctx.describe(t('remember.heading'), lines);
  ctx.primary(t('lab.continue'), () => ctx.next());
}
