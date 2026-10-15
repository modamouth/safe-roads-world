// Normalized lane anchors calibrated to the supplied overhead road artwork.
// A smooth cubic spline follows the left traffic lane around the bend.
const LANE = [[.654, .91], [.654, .74], [.641, .58], [.588, .425], [.495, .31], [.345, .225], [.155, .185]];
export function escPosition(k, on) {
  k = Math.max(0, Math.min(1, k));
  const u = k * (LANE.length - 1), i = Math.min(LANE.length - 2, Math.floor(u)), f = u - i;
  const points = [LANE[Math.max(0, i - 1)], LANE[i], LANE[i + 1], LANE[Math.min(LANE.length - 1, i + 2)]];
  const q = [0, 1].map(d => {
    const [a, b, c, e] = points.map(p => p[d]);
    return .5 * (2 * b + (c - a) * f + (2 * a - 5 * b + 4 * c - e) * f * f + (-a + 3 * b - 3 * c + e) * f * f * f);
  });
  if (!on) {
    const m = Math.max(0, (k - .35) / .65), blend = m * m * (3 - 2 * m);
    q[0] += (.81 - q[0]) * blend;
    q[1] += (.22 - q[1]) * blend;
  }
  return { x: q[0], y: q[1] };
}

