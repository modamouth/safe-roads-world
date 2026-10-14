import { COLORS as C } from '../../config.js';
import { stateImages } from './fit.js';
import { clipTo, label } from './common.js';

export default function create(scene, parent, p, a) {
  const c = scene.add.container(0, 0); parent.add(c);
  c.add(scene.add.rectangle(a.x, a.y, a.w, a.h, C.navy2).setOrigin(0));
  const states = ['off', 'red', 'yellow', 'green'];
  const frame = { x: a.x + 30, y: a.y + 12, w: a.w - 60, h: a.h - 56 };
  const pictures = stateImages(scene, c, states.map(s => 'tl_' + s), frame);
  const fallback = scene.add.graphics(); c.add(fallback);
  const caption = label(scene, a.x + a.w / 2, a.y + a.h - 22, '', 18); c.add(caption);
  const setState = s => {
    const state = states.includes(s.light) ? s.light : 'off';
    pictures.show('tl_' + state);
    fallback.clear();
    if (!scene.textures.exists('tl_' + state)) {
      const x = a.x + a.w / 2, y = a.y + a.h / 2;
      fallback.fillStyle(0x101010, 1); fallback.fillRoundedRect(x - 45, y - 126, 90, 252, 14);
      ['red', 'yellow', 'green'].forEach((light, i) => {
        fallback.fillStyle(state === light ? C[light] : 0x333333, 1); fallback.fillCircle(x, y - 80 + i * 80, 30);
      });
    }
    caption.setText(state === 'off' ? 'Signal off' : state[0].toUpperCase() + state.slice(1));
  };
  setState(p);
  const mask = clipTo(scene, c, a);
  return { setState, destroy() { c.destroy(); mask.destroy(); } };
}
