// ---------------------------------------------------------------------------
// Game-wide constants, colours and session state. Learning Lab copy and
// figures live in /content (see docs/learning-lab/ENGINE.md), not here.
// ---------------------------------------------------------------------------

// Design-space canvas. Rendered at Z zoom so it scales cleanly to any screen.
export const W = 540, H = 960, Z = 1.5;
export const GW = W * Z, GH = H * Z;

export const FONT = '"Avenir Next","Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif';

export const COLORS = {
  navy: 0x0B1B2E, navy2: 0x12293F, yellow: 0xFFCB2B, orange: 0xE8743B, teal: 0x1FA3B5,
  white: 0xFFFFFF, red: 0xE5484D, green: 0x3DBE7A,
  asphalt: 0x403E41, asphalt2: 0x484547, gravel: 0xC8A98C,
  grassA: 0xD6A04A, grassB: 0xCB9542, haze: 0xF5B06C
};

export const REDUCE_MOTION = typeof window !== 'undefined'
  && !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

// Shared mutable session state + a hook for pilot analytics.
// points: points shown on the Mission Map (10 per Learning Lab topic stamp; see lab/analytics.js).
// completed: Learning Lab experience ids fully finished, e.g. { speed: true }.
// Lab progress itself is saved on the device by src/lab/core/progress.js.
export const state = { events: [], points: 0, completed: {} };

export function track(name, data) {
  // Pilot hook: wire this to Supabase / n8n / your event endpoint.
  state.events.push({ t: Date.now(), name, data: data || null });
  if (window.console && console.debug) console.debug('[track]', name, data || '');
}

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, k) => a + (b - a) * k;
export const easeOut = k => 1 - Math.pow(1 - k, 3);
export function lerpColor(a, b, k) {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return (Math.round(lerp(ar, br, k)) << 16) | (Math.round(lerp(ag, bg, k)) << 8) | Math.round(lerp(ab, bb, k));
}
