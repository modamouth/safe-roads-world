// ---------------------------------------------------------------------------
// Drawing kit for Learning Lab scenes: text blocks, selectable options,
// verdict panels, segmented toggles, numbered lists. Everything interactive
// is mirrored for keyboard and screen readers (see src/a11y.js).
// ---------------------------------------------------------------------------
import { W, COLORS as C, FONT } from '../config.js';
import { T, panel, focusRing } from '../ui.js';
import { mirror, announce } from '../a11y.js';
import { Sfx } from '../sfx.js';
import { QUALITY } from '../quality.js';
import { TYPE, INK, SPACE, VERDICT } from '../theme.js';

const style = (size, color, o) => Object.assign({ fontFamily: FONT, fontSize: size + 'px', color, resolution: QUALITY.textRes, lineSpacing: Math.round(size * 0.28) }, o || {});

/** Centred wrapped paragraph; returns the text object (origin top-centre). */
export function para(scene, parent, str, y, o) {
  o = o || {};
  const t = scene.add.text(o.x != null ? o.x : W / 2, y, str, style(o.size || TYPE.body, o.color || INK.body, {
    align: o.align || 'center', wordWrap: { width: o.width || W - SPACE.gutter * 2 - 24 }, fontStyle: o.bold ? 'bold' : 'normal'
  })).setOrigin(o.align === 'left' ? 0 : 0.5, 0);
  if (parent) parent.add(t);
  return t;
}

export function heading(scene, parent, str, y, size) {
  const t = scene.add.text(W / 2, y, str, style(size || TYPE.h1, INK.strong, { fontStyle: 'bold', align: 'center', wordWrap: { width: W - 60 } })).setOrigin(0.5, 0);
  if (parent) parent.add(t);
  return t;
}

/** Small uppercase label, e.g. "Question 2 of 5". */
export function eyebrow(scene, parent, str, y) {
  const t = T(scene, W / 2, y, str.toUpperCase(), TYPE.tiny, INK.link, { letterSpacing: 2, resolution: QUALITY.textRes });
  if (parent) parent.add(t);
  return t;
}

/**
 * A selectable option card. `o.selected()` decides how it draws. Returns the
 * container with redraw(). Tap area is at least 48 px tall.
 */
export function option(scene, parent, box, label, onTap, o) {
  o = o || {};
  const { x, y, w, h } = box;
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  const t = scene.add.text(0, 0, label, style(o.size || TYPE.lead, INK.strong, { fontStyle: 'bold', align: 'center', wordWrap: { width: w - 56 } })).setOrigin(0.5);
  const mark = scene.add.text(w / 2 - 22, 0, '', style(20, INK.dark, { fontStyle: 'bold' })).setOrigin(0.5);
  const zone = scene.add.zone(0, 0, w, Math.max(h, 48)).setInteractive({ useHandCursor: true });
  c.add([g, t, mark, zone]);
  c.hi = false; c.focused = false; c.enabled = true; c.state = null;  // state: null | 'ok' | 'wrong' | 'missed' | 'answer'
  c.redraw = () => {
    const sel = o.selected ? o.selected() : false;
    g.clear();
    const st = c.state;
    const edge = st === 'ok' || st === 'answer' ? VERDICT.good.color : st === 'wrong' ? VERDICT.bad.color : st === 'missed' ? 0xFF8A1F : sel ? C.yellow : null;
    g.fillStyle(0xFFFFFF, sel ? 0.08 : c.hi && c.enabled ? 0.2 : c.enabled ? 0.13 : 0.06);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 14);
    if (edge != null) { g.lineStyle(3, edge, 1); g.strokeRoundedRect(-w / 2, -h / 2, w, h, 14); }
    const sym = st === 'ok' || st === 'answer' ? VERDICT.good.symbol : st === 'wrong' ? VERDICT.bad.symbol : st === 'missed' ? '!' : sel ? '✓' : '';
    if (sym) { g.fillStyle(edge, 1); g.fillCircle(w / 2 - 22, 0, 13); }
    mark.setText(sym);
    t.setColor(sel && !st ? INK.accent : c.enabled ? INK.strong : INK.muted);
    if (c.focused) focusRing(g, -w / 2, -h / 2, w, h, 14);
  };
  const act = () => { if (!c.enabled) return; Sfx.init(scene); Sfx.click(); onTap(); };
  zone.on('pointerover', () => { c.hi = true; c.redraw(); });
  zone.on('pointerout', () => { c.hi = false; c.redraw(); });
  zone.on('pointerup', act);
  const stateWord = () => ({ ok: ', correct', answer: ', the right answer', wrong: ', not right', missed: ', missed' }[c.state] || '');
  mirror(c, () => (o.a11y || label) + stateWord(), act, {
    onFocus: v => { c.focused = v; c.redraw(); }, isEnabled: () => c.enabled, isPressed: o.selected || null
  });
  c.setEnabled = v => { c.enabled = v; c.redraw(); };
  c.setMark = s => { c.state = s; c.redraw(); };
  c.redraw();
  if (parent) parent.add(c);
  return c;
}

/** Lay options out as a vertical list or a grid; returns the bottom y. */
export function optionList(scene, parent, items, y, o) {
  o = o || {};
  const cols = o.cols || 1, gap = 12, w = o.w || (W - SPACE.gutter * 2 - (cols - 1) * gap) / cols;
  const h = o.h || 64;
  const x0 = W / 2 - ((cols * w + (cols - 1) * gap) / 2) + w / 2;
  const list = items.map((it, i) => option(scene, parent, { x: x0 + (i % cols) * (w + gap), y: y + Math.floor(i / cols) * (h + gap) + h / 2, w, h },
    it.label, it.onTap, { selected: it.selected, a11y: it.a11y, size: o.size }));
  return { list, bottom: y + Math.ceil(items.length / cols) * (h + gap) - gap };
}

/** Verdict panel with symbol + title + reason. Announced to screen readers. Returns { box, bottom }. */
export function verdict(scene, parent, v, y, o) {
  o = o || {};
  const tone = VERDICT[v.tone] || VERDICT.ok;
  const c = scene.add.container(0, 0);
  const body = v.body ? para(scene, null, v.body, 0, { size: o.size || TYPE.body, color: INK.body, width: W - 120 }) : null;
  const titleH = v.title ? 40 : 0, h = (body ? body.height : 0) + titleH + 40;
  const top = o.bottomAt != null ? o.bottomAt - h : y;
  c.add(panel(scene, SPACE.gutter, top, W - SPACE.gutter * 2, h, { alpha: 0.95, r: SPACE.radius, stroke: tone.color, strokeA: 0.9 }));
  if (v.title) {
    const g = scene.add.graphics();
    const tt = scene.add.text(W / 2 + 18, top + 32, v.title, style(TYPE.h2, tone.hex, { fontStyle: 'bold' })).setOrigin(0.5);
    const sx = tt.x - tt.width / 2 - 24;
    g.fillStyle(tone.color, 1); g.fillCircle(sx, top + 32, 15);
    c.add([g, scene.add.text(sx, top + 32, tone.symbol, style(18, INK.dark, { fontStyle: 'bold' })).setOrigin(0.5), tt]);
  }
  if (body) { body.setY(top + 20 + titleH); c.add(body); }
  if (parent) parent.add(c);
  announce([v.title, v.body].filter(Boolean).join('. '));
  return { box: c, top, bottom: top + h };
}

/** Segmented control for toggle labs. Returns { setCurrent(id), buttons }. */
export function segmented(scene, parent, states, y, onPick, current) {
  const n = states.length, gap = 8, w = Math.min(150, (W - SPACE.gutter * 2 - gap * (n - 1)) / n), h = 58;
  const x0 = W / 2 - (n * w + (n - 1) * gap) / 2 + w / 2;
  const bg = panel(scene, x0 - w / 2 - 8, y - h / 2 - 8, n * w + (n - 1) * gap + 16, h + 16, { alpha: 0.9, r: 20, stroke: 0xFFFFFF, strokeA: 0.25 });
  if (parent) parent.add(bg);
  let cur = current;
  const buttons = states.map((s, i) => {
    const c = option(scene, parent, { x: x0 + i * (w + gap), y, w, h }, s.label, () => { cur = s.id; buttons.forEach(b => b.redraw()); onPick(s); },
      { selected: () => cur === s.id, size: TYPE.body, a11y: s.a11y || s.label });
    return c;
  });
  return { buttons, setCurrent: id => { cur = id; buttons.forEach(b => b.redraw()); } };
}

/** Numbered lines with yellow discs; returns the bottom y. */
export function numbered(scene, parent, lines, y, o) {
  o = o || {};
  lines.forEach((line, i) => {
    const g = scene.add.graphics();
    g.fillStyle(C.yellow, 1); g.fillCircle(SPACE.gutter + 22, y + 16, 16);
    const n = T(scene, SPACE.gutter + 22, y + 16, String(i + 1), 17, INK.dark, { resolution: QUALITY.textRes });
    const t = scene.add.text(SPACE.gutter + 52, y, line, style(o.size || TYPE.body, INK.body, { wordWrap: { width: W - SPACE.gutter * 2 - 60 } }));
    if (parent) parent.add([g, n, t]);
    y += Math.max(36, t.height) + (o.gap || 22);
  });
  return y;
}

/** Tiny grey line(s) at the bottom of the screen (sources, placeholder notes). */
export function footnote(scene, parent, lines, bottom) {
  const str = lines.filter(Boolean).join('\n');
  if (!str) return null;
  const t = scene.add.text(W / 2, bottom, str, style(13, INK.faint, { align: 'center', wordWrap: { width: W - 60 }, lineSpacing: 2 })).setOrigin(0.5, 1);
  if (parent) parent.add(t);
  return t;
}
