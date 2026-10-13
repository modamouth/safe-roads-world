// Rider pictogram (front view) showing protective gear by body area.
//   highlight(id): 'helmet' | 'jacket' | 'gloves' | 'trousers' | 'boots' | 'visible' | null
//   setState({ gear: 'everyday' | 'full' }): everyday clothes vs full gear
//   params: { gear: 'everyday' | 'full' } initial look
import { COLORS as C } from '../../config.js';
import { t } from '../content.js';
import { clipTo, label } from './common.js';

export default function create(scene, parent, p, a) {
  const c = scene.add.container(0, 0); parent.add(c);
  const g = scene.add.graphics(); c.add(g);
  const tags = scene.add.container(0, 0); c.add(tags);
  const cx = a.x + a.w / 2, top = a.y + 30, H = a.h - 60, u = H / 16;
  const st = { gear: p.gear || 'full', hi: null };

  const part = (id, fn) => {
    const on = st.hi === id;
    fn(on);
    if (on) tags.add(label(scene, a.x + 70, top + ({ helmet: 1.5, jacket: 5, visible: 6, gloves: 8, trousers: 11, boots: 15 }[id]) * u, t('art.gear.' + id), 15, '#0B1B2E', { backgroundColor: '#FFCB2B', padding: { x: 8, y: 4 } }));
  };
  const outline = on => { if (on) g.lineStyle(4, C.yellow, 1); };

  const draw = () => {
    g.clear(); tags.removeAll(true);
    g.fillStyle(0x0E1622, 1); g.fillRoundedRect(a.x, a.y, a.w, a.h, 18);
    const full = st.gear === 'full';
    const skin = 0x8D5B3F;
    // legs
    part('trousers', on => {
      g.fillStyle(full ? 0x2B3440 : 0x3C7FC2, 1);
      g.fillRoundedRect(cx - 2.1 * u, top + 9 * u, 1.9 * u, 5.4 * u, 6); g.fillRoundedRect(cx + 0.2 * u, top + 9 * u, 1.9 * u, 5.4 * u, 6);
      if (full) { g.fillStyle(0x6B737D, 1); g.fillRoundedRect(cx - 1.9 * u, top + 11 * u, 1.5 * u, 1.1 * u, 4); g.fillRoundedRect(cx + 0.4 * u, top + 11 * u, 1.5 * u, 1.1 * u, 4); }
      outline(on); if (on) { g.strokeRoundedRect(cx - 2.3 * u, top + 8.8 * u, 4.6 * u, 5.8 * u, 8); }
    });
    // feet
    part('boots', on => {
      g.fillStyle(full ? 0x1C1C1E : 0xE8E2D6, 1);
      g.fillRoundedRect(cx - 2.4 * u, top + (full ? 13.4 : 14.2) * u, 2.2 * u, (full ? 1.8 : 1) * u, 5); g.fillRoundedRect(cx + 0.2 * u, top + (full ? 13.4 : 14.2) * u, 2.2 * u, (full ? 1.8 : 1) * u, 5);
      outline(on); if (on) g.strokeRoundedRect(cx - 2.6 * u, top + 13.2 * u, 5.2 * u, 2.2 * u, 8);
    });
    // torso and arms
    part('jacket', on => {
      g.fillStyle(full ? 0x34495E : 0xE5484D, 1);
      g.fillRoundedRect(cx - 2.4 * u, top + 3.4 * u, 4.8 * u, 6 * u, 10);
      g.fillRoundedRect(cx - 3.6 * u, top + 3.6 * u, 1.3 * u, 4.6 * u, 6); g.fillRoundedRect(cx + 2.3 * u, top + 3.6 * u, 1.3 * u, 4.6 * u, 6);
      if (full) { g.fillStyle(0x6B737D, 1); g.fillRoundedRect(cx - 3.5 * u, top + 3.8 * u, 1.1 * u, 1.2 * u, 4); g.fillRoundedRect(cx + 2.4 * u, top + 3.8 * u, 1.1 * u, 1.2 * u, 4); g.fillRoundedRect(cx - 1.4 * u, top + 3.8 * u, 2.8 * u, 2.4 * u, 6); }
      outline(on); if (on) g.strokeRoundedRect(cx - 3.8 * u, top + 3.2 * u, 7.6 * u, 6.4 * u, 12);
    });
    part('visible', on => {
      if (full) { g.fillStyle(0xD8F23A, 0.95); g.fillRect(cx - 2.4 * u, top + 6.2 * u, 4.8 * u, 0.5 * u); g.fillRect(cx - 2.4 * u, top + 7.6 * u, 4.8 * u, 0.5 * u); }
      outline(on); if (on) g.strokeRect(cx - 2.6 * u, top + 6 * u, 5.2 * u, 2.3 * u);
    });
    // hands
    part('gloves', on => {
      g.fillStyle(full ? 0x1C1C1E : skin, 1); g.fillCircle(cx - 2.95 * u, top + 8.5 * u, 0.7 * u); g.fillCircle(cx + 2.95 * u, top + 8.5 * u, 0.7 * u);
      outline(on); if (on) { g.strokeCircle(cx - 2.95 * u, top + 8.5 * u, 1.0 * u); g.strokeCircle(cx + 2.95 * u, top + 8.5 * u, 1.0 * u); }
    });
    // head
    part('helmet', on => {
      g.fillStyle(skin, 1); g.fillCircle(cx, top + 1.9 * u, 1.45 * u);
      if (full) { g.fillStyle(0xF2F2F2, 1); g.fillCircle(cx, top + 1.7 * u, 1.85 * u); g.fillStyle(0x24364B, 0.95); g.fillRoundedRect(cx - 1.3 * u, top + 1.2 * u, 2.6 * u, 1 * u, 6); }
      outline(on); if (on) g.strokeCircle(cx, top + 1.8 * u, 2.2 * u);
    });
  };

  const inst = {
    highlight(id) { st.hi = id; draw(); },
    setState(s) { st.gear = s.gear || st.gear; if (s.highlight !== undefined) st.hi = s.highlight; draw(); },
    destroy() {}
  };
  draw();
  const m = clipTo(scene, c, a);
  inst.destroy = () => { c.destroy(); m.destroy(); };
  return inst;
}
