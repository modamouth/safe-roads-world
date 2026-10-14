// Phaser's smoothed delta can stay near 16 ms on a slow renderer. Use real
// elapsed time for Lab simulations, bounded to avoid jumping after a tab pause.
export function animationSeconds(delta, rawDelta = delta) {
  const elapsed = Number.isFinite(rawDelta) && rawDelta > 0 ? rawDelta : delta;
  return Math.min(Math.max(0, elapsed) / 1000, 0.1);
}
