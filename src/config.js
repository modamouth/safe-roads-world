// ---------------------------------------------------------------------------
// Mission content & tuning. Edit this file to change copy, figures, severity.
// ---------------------------------------------------------------------------

// PLACEHOLDER figures. Replace with sourced local data (and credit the
// source on the Reveal screen) before this goes in front of real players.
export const DATA = {
  question: "What's the chance of a life-threatening injury in a head-on crash at 90 km/h?",
  options: [15, 30, 55, 75, 90, 96],
  answer: 90,
  risk: { 60: 9, 80: 37, 90: 90 },
  speeds: [60, 80, 90]
};

// How hard each speed hits. crush is 0-1 of max body deformation (drawn-car fallback only).
export const SEV = {
  60: { k: 0.30, crush: 0.30, stop: 90, shake: 0.006, debris: 14, crushMs: 340 },
  80: { k: 0.65, crush: 0.62, stop: 140, shake: 0.013, debris: 34, crushMs: 380 },
  90: { k: 1.00, crush: 1.00, stop: 220, shake: 0.024, debris: 64, crushMs: 430 }
};

export const OUTCOME = {
  60: 'At 60, most people survive a crash like this. Some are still badly hurt.',
  80: 'At 80, serious injuries become likely. Survivors may need care for years.',
  90: 'At 90, you may not survive. Who would be waiting for you at home?'
};

// Design-space canvas. Rendered at Z zoom so it scales cleanly to any screen.
export const W = 540, H = 960, Z = 1.5;
export const GW = W * Z, GH = H * Z;

export const HY = 330;              // horizon line (design px)
export const ROAD_HW = 250;         // half road width at the bottom row
export const PXM = ROAD_HW / 3.5;   // px per metre at the bottom row
export const VF = 2.2;              // visual speed multiplier (keeps 60/80/90 readable on a short road)
export const VO = 80 / 3.6 * VF;    // oncoming vehicle visual speed (m/s)
export const SPAN = 900;            // scenery recycle distance (m)
export const IMPACT_Z = 15;         // distance (m) at which the oncoming vehicle meets you

export const EDGE_COLOR = 0xFFCB2B; // road edge-line colour. Yellow, as far as I know, on SA/Namibian roads. Use 0xFFFFFF for white.

export const FONT = '"Avenir Next","Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif';

export const COLORS = {
  navy: 0x0B1B2E, navy2: 0x12293F, yellow: 0xFFCB2B, orange: 0xE8743B, teal: 0x1FA3B5,
  white: 0xFFFFFF, red: 0xE5484D, green: 0x3DBE7A,
  asphalt: 0x403E41, asphalt2: 0x484547, gravel: 0xC8A98C,
  grassA: 0xD6A04A, grassB: 0xCB9542, haze: 0xF5B06C
};

// Crash-lab photo layout (design px). Tune if you swap in differently cropped images.
export const LAB = { floor: 560, barrierX: 396, carLen: 300, top: 300 };
// contact = barrier face in design px: bgX + 660 (face column in labbg.webp at ground level) * bgW / 800.
// front = each car photo's front edge (source px of the 760 px-wide labcar images, measured at bumper
// height). The crushed photos are shorter at the front, so stopping by the real front keeps the car
// pressed against the wall instead of appearing to bounce off it.
export const LABG = {
  bgX: -100, bgY: 100, bgW: 680, bgH: 659, ground: 583, contact: 460, carW: 400,
  front: { 0: 755, 60: 754, 80: 746, 90: 733 }
};

export const REDUCE_MOTION = typeof window !== 'undefined'
  && !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

// Shared mutable session state + a hook for pilot analytics.
// points: session points shown on the Mission Map (nothing awards them yet).
// completed: experience ids finished this session, e.g. { speed: true }.
export const state = { guess: null, tried: { 60: false, 80: false, 90: false }, firstSpeed: null, events: [], points: 0, completed: {} };

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
