// Top-down road segment with one safety treatment, shown or hidden.
//   params: { treatment: 'rumble' | 'refuge' | 'roundabout' | 'shoulder' | 'fence' | 'lighting' | 'humps', on: true }
//   setState({ on }) toggles it.
import { COLORS as C } from '../../config.js';
import { t } from '../content.js';
import { stateImages } from './fit.js';
import { LEARNING_LAB_ASSETS as A } from '../assets.js';
import { TopDownArt } from './topDown.js';
import { clipTo, label } from './common.js';

export default function create(scene, parent, p, a) {
  const c = scene.add.container(0, 0); parent.add(c);
  const g = scene.add.graphics(); c.add(g);
  const tags = scene.add.container(0, 0); c.add(tags);
  const cars = scene.add.container(0, 0); c.addAt(cars, 1);
  const carArt = new TopDownArt(scene, cars);
  const st = { on: p.on !== false };
  const cx = a.x + a.w / 2, rw = Math.min(a.w * 0.5, 220);
  const night = p.treatment === 'lighting';

  const road = (x0, x1) => {
    g.fillStyle(0x4A494D, 1); g.fillRect(x0, a.y, x1 - x0, a.h);
    g.fillStyle(0xF2F2F2, 1); g.fillRect(x0 + 4, a.y, 3, a.h); g.fillRect(x1 - 7, a.y, 3, a.h);
  };
  const centreDashes = () => { g.fillStyle(0xF2F2F2, 1); for (let y = a.y; y < a.y + a.h; y += 30) g.fillRect(cx - 2, y, 4, 16); };
  const car = (x, y, rot) => {
    if (carArt.draw(A.topDown.blueSedan.key, x, y, 22, 40, (rot || 0) * 180 / Math.PI)) return;
    const k = scene.add.graphics(); tags.add(k);
    k.fillStyle(0xF4F5F6, 1); k.fillRoundedRect(-11, -20, 22, 40, 6); k.fillStyle(0x24364B, 1); k.fillRect(-8, -12, 16, 7);
    k.setPosition(x, y).setRotation(rot || 0);
  };

  const draw = () => {
    carArt.begin();
    g.clear(); tags.removeAll(true);
    g.fillStyle(night ? 0x1F2A1E : 0xB9A47E, 1); g.fillRoundedRect(a.x, a.y, a.w, a.h, 18);
    const tr = p.treatment;
    if (tr === 'roundabout') {
      g.fillStyle(0x4A494D, 1); g.fillRect(cx - rw * 0.32, a.y, rw * 0.64, a.h); g.fillRect(a.x, a.y + a.h / 2 - rw * 0.32, a.w, rw * 0.64);
      if (st.on) {
        g.fillStyle(0x4A494D, 1); g.fillCircle(cx, a.y + a.h / 2, rw * 0.62);
        g.fillStyle(0x6E8A4E, 1); g.fillCircle(cx, a.y + a.h / 2, rw * 0.3); g.lineStyle(3, 0xF2F2F2, 1); g.strokeCircle(cx, a.y + a.h / 2, rw * 0.3);
        // traffic circulates clockwise in Namibia (drive on the left)
        g.lineStyle(3, C.yellow, 0.9);
        for (let i = 0; i < 4; i++) { const an = i * Math.PI / 2 + 0.3; g.beginPath(); g.arc(cx, a.y + a.h / 2, rw * 0.46, an, an + 0.8); g.strokePath(); }
      } else {
        g.fillStyle(0xF2F2F2, 1); g.fillRect(cx - rw * 0.32, a.y + a.h / 2 - rw * 0.36, rw * 0.64, 4);
      }
    } else {
      const shoulder = tr === 'shoulder' && st.on ? 46 : 0;
      if (shoulder) { g.fillStyle(0x5E5D61, 1); g.fillRect(cx - rw / 2 - shoulder, a.y, rw + shoulder * 2, a.h); }
      road(cx - rw / 2, cx + rw / 2);
      if (tr === 'rumble' && st.on) {
        g.fillStyle(0xD9D6CF, 1); for (let y = a.y; y < a.y + a.h; y += 9) g.fillRect(cx - 8, y, 16, 4);
      } else if (tr !== 'refuge') centreDashes();
      if (tr === 'refuge') {
        g.fillStyle(0xF2F2F2, 1); for (let x = cx - rw / 2 + 10; x < cx + rw / 2 - 10; x += 18) g.fillRect(x, a.y + a.h / 2 - 22, 10, 44);
        if (st.on) { g.fillStyle(0xBDB6A6, 1); g.fillRoundedRect(cx - 14, a.y + a.h / 2 - 60, 28, 120, 10); g.fillStyle(C.yellow, 1); g.fillCircle(cx, a.y + a.h / 2 - 66, 7); g.fillCircle(cx, a.y + a.h / 2 + 66, 7); }
        else centreDashes();
        const pk = scene.add.graphics(); tags.add(pk);
        pk.fillStyle(0xE8743B, 1); pk.fillCircle(st.on ? cx : cx - rw / 4, a.y + a.h / 2, 8);
      }
      if (tr === 'humps' && st.on) { g.fillStyle(0xFFCB2B, 1); [0.3, 0.7].forEach(f => { for (let x = cx - rw / 2; x < cx + rw / 2; x += 22) g.fillTriangle(x, a.y + a.h * f, x + 11, a.y + a.h * f - 8, x + 22, a.y + a.h * f); }); }
      if (tr === 'fence') {
        g.lineStyle(2, st.on ? 0xE6E1D6 : 0x000000, st.on ? 1 : 0);
        [cx - rw / 2 - 34, cx + rw / 2 + 34].forEach(x => { if (st.on) { g.lineBetween(x, a.y, x, a.y + a.h); for (let y = a.y; y < a.y + a.h; y += 26) g.fillStyle(0x6B5A44, 1).fillRect(x - 2, y, 4, 8); } });
        const cow = (x, y) => { g.fillStyle(0x5A4030, 1); g.fillEllipse(x, y, 30, 16); g.fillCircle(x + 16, y - 3, 6); };
        if (st.on) { cow(a.x + 30, a.y + a.h * 0.3); cow(a.x + a.w - 40, a.y + a.h * 0.7); } else cow(cx - rw / 4, a.y + a.h * 0.35);
      }
      if (tr === 'lighting') {
        [0.2, 0.55, 0.9].forEach(f => {
          const y = a.y + a.h * f;
          if (st.on) { g.fillStyle(0xFFF2B0, 0.28); g.fillCircle(cx + rw / 2 + 10, y, rw * 0.55); }
          g.fillStyle(0x9AA6B5, 1); g.fillCircle(cx + rw / 2 + 16, y, 5);
        });
        const pk = scene.add.graphics(); tags.add(pk);
        pk.fillStyle(0xE8743B, st.on ? 1 : 0.25); pk.fillCircle(cx + rw / 4, a.y + a.h * 0.55, 8);
      }
      car(cx - rw / 4, a.y + a.h * 0.8);
    }
    tags.add(label(scene, a.x + a.w / 2, a.y + 20, t(st.on ? 'art.treatment.with' : 'art.treatment.without'), 13, '#FFFFFF', { backgroundColor: '#05080DCC', padding: { x: 6, y: 3 } }));
  };

  // Illustrated top-down roads (without / with) when loaded; drawn diagrams otherwise.
  const ART = { rumble: ['td_road', 'td_rumble'], lighting: ['td_road', 'td_lighting'], fence: ['td_road', 'td_fence'],
    refuge: ['td_road', 'td_refuge'], roundabout: ['td_crossroads', 'td_roundabout'] }[p.treatment];
  if (ART && ART.every(k => scene.textures.exists(k))) {
    const bg = scene.add.rectangle(a.x, a.y, a.w, a.h, 0x8C6A45).setOrigin(0);
    c.addAt(bg, 0);
    const photos = stateImages(scene, c, ART, a);
    c.bringToTop(tags);
    g.setVisible(false);
    const draw2 = () => {
      photos.show(ART[st.on ? 1 : 0]);
      tags.removeAll(true);
      tags.add(label(scene, a.x + a.w / 2, a.y + 20, t(st.on ? 'art.treatment.with' : 'art.treatment.without'), 13, '#FFFFFF', { backgroundColor: '#05080DCC', padding: { x: 6, y: 3 } }));
    };
    const inst2 = { setState(s) { if (s.on !== undefined) st.on = !!s.on; draw2(); }, destroy() {} };
    draw2();
    const m2 = clipTo(scene, c, a);
    inst2.destroy = () => { c.destroy(); m2.destroy(); };
    return inst2;
  }
  const inst = { setState(s) { if (s.on !== undefined) st.on = !!s.on; draw(); }, destroy() {} };
  draw();
  const m = clipTo(scene, c, a);
  inst.destroy = () => { c.destroy(); m.destroy(); };
  return inst;
}
