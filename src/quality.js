// ---------------------------------------------------------------------------
// Device quality tier. The game targets capable phones but degrades on
// low-end ones: fewer scenery sprites, cheaper text textures, no blur effects.
// Force a tier with ?quality=low or ?quality=high in the URL.
// ---------------------------------------------------------------------------
function detect() {
  if (typeof window === 'undefined') return 'high';
  const q = new URLSearchParams(window.location.search).get('quality');
  if (q === 'low' || q === 'high') return q;
  const n = window.navigator || {};
  const mem = n.deviceMemory, cores = n.hardwareConcurrency, save = n.connection && n.connection.saveData;
  if (save || (mem && mem <= 2) || (cores && cores <= 2)) return 'low';
  return 'high';
}

export const TIER = detect();
export const LOW = TIER === 'low';
export const QUALITY = {
  textRes: LOW ? 1 : 2,     // text texture resolution
  density: LOW ? 0.5 : 1,   // multiplier for decorative scenery counts
  effects: !LOW             // blur/glow post effects
};
