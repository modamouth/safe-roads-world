// ---------------------------------------------------------------------------
// Accessibility layer for the canvas game.
//
// Phaser draws everything on a <canvas>, which screen readers and keyboards
// can't use. This module keeps a visually hidden HTML mirror next to it:
//   - a real <button> for every interactive control (Tab, Enter, Space,
//     screen-reader activation); focusing one draws a focus ring on the canvas
//   - a description region (heading + text) for the current screen
//   - a polite live region for verdicts and changes
// The mirror follows each control's visibility and enabled state, and removes
// the button when the control is destroyed. Tests drive the game through it.
// ---------------------------------------------------------------------------

let root = null, desc = null, live = null, controls = null;
const entries = new Set();

const HIDE = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;';

function ensure() {
  if (root || typeof document === 'undefined') return !!root;
  root = document.createElement('div');
  root.id = 'a11y';
  root.setAttribute('style', HIDE);
  desc = document.createElement('section');
  desc.setAttribute('aria-label', 'Screen');
  controls = document.createElement('div');
  controls.setAttribute('role', 'group');
  controls.setAttribute('aria-label', 'Controls');
  live = document.createElement('div');
  live.setAttribute('aria-live', 'polite');
  live.setAttribute('role', 'status');
  root.append(desc, controls, live);
  document.body.appendChild(root);
  setInterval(sync, 250);
  return true;
}

/** Is a game object currently on screen (itself and every parent container visible)? */
function shown(o) {
  for (let p = o; p; p = p.parentContainer) {
    if (!p.scene || !p.visible || p.alpha === 0) return false;
  }
  const sys = o.scene && o.scene.sys;
  return !!(sys && sys.isActive() && sys.isVisible());
}

function sync() {
  entries.forEach(e => {
    const on = shown(e.obj);
    if (e.el.hidden === on) e.el.hidden = !on;
    const off = e.isEnabled ? !e.isEnabled() : false;
    if (e.el.disabled !== off) e.el.disabled = off;
    if (e.isPressed) {
      const p = String(!!e.isPressed());
      if (e.el.getAttribute('aria-pressed') !== p) e.el.setAttribute('aria-pressed', p);
    }
  });
}

/**
 * Mirror a canvas control as a hidden <button>.
 *   obj        the Phaser object that represents it (visibility is read from it)
 *   label      accessible name (string or function returning one)
 *   onActivate called on click/Enter/Space
 *   o.onFocus(bool), o.isEnabled(), o.isPressed() (makes it a toggle), o.describedBy
 */
export function mirror(obj, label, onActivate, o = {}) {
  if (!ensure()) return null;
  const el = document.createElement('button');
  el.type = 'button';
  const setLabel = l => { el.textContent = typeof l === 'function' ? l() : l; };
  setLabel(label);
  let alive = true;
  // A queued activation from an old screen must not navigate the current one.
  // Recheck game state directly instead of waiting for the 250 ms sync timer.
  el.addEventListener('click', () => { if (alive && shown(obj) && !el.disabled && (!o.isEnabled || o.isEnabled())) onActivate(); });
  if (o.onFocus) { el.addEventListener('focus', () => { if (alive) o.onFocus(true); }); el.addEventListener('blur', () => { if (alive) o.onFocus(false); }); }
  if (o.testId) el.dataset.testid = o.testId;
  controls.appendChild(el);
  const e = { obj, el, isEnabled: o.isEnabled, isPressed: o.isPressed };
  entries.add(e);
  el.hidden = !shown(obj);
  obj.once('destroy', () => { alive = false; entries.delete(e); el.remove(); });
  return { el, setLabel };
}

/** Mirror an external link (opens in a new tab). */
export function mirrorLink(obj, label, href) {
  if (!ensure()) return null;
  const a = document.createElement('a');
  a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer';
  a.textContent = label + ' (opens in a new tab)';
  controls.appendChild(a);
  const e = { obj, el: a };
  entries.add(e);
  obj.once('destroy', () => { entries.delete(e); a.remove(); });
  return a;
}

/** Describe the current screen: a heading and its main text. */
export function describe(heading, text) {
  if (!ensure()) return;
  desc.replaceChildren();
  const h = document.createElement('h1'); h.textContent = heading || '';
  desc.appendChild(h);
  (Array.isArray(text) ? text : [text]).filter(Boolean).forEach(t => {
    const p = document.createElement('p'); p.textContent = t; desc.appendChild(p);
  });
  announce([heading].concat(text || []).filter(Boolean).join('. '));
}

/** Say something politely (verdicts, state changes). */
export function announce(text) {
  if (!ensure() || !text) return;
  live.textContent = '';
  // A new text node after clearing makes screen readers repeat identical messages.
  setTimeout(() => { live.textContent = text; }, 30);
}

/** For tests: the mirrored controls currently available. */
export const visibleControls = () => [...entries].filter(e => !e.el.hidden).map(e => e.el.textContent);
