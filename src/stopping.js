// ---------------------------------------------------------------------------
// Stopping-distance physics (pure functions, no Phaser).
// Total stopping distance = distance travelled during the driver's reaction
// time + braking distance at constant deceleration.
// ---------------------------------------------------------------------------

export function stopping(kmh, reactionS, decel) {
  const v = kmh / 3.6, react = v * reactionS, brake = (v * v) / (2 * decel);
  return { v, react, brake, total: react + brake };
}

/** Speed (km/h) at which the car reaches something `distM` ahead; 0 if it stops first. */
export function impactKmh(kmh, distM, reactionS, decel) {
  const s = stopping(kmh, reactionS, decel);
  if (s.total <= distM) return 0;
  if (s.react >= distM) return kmh;
  const v2 = s.v * s.v - 2 * decel * (distM - s.react);
  return Math.sqrt(Math.max(0, v2)) * 3.6;
}
