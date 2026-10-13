// ---------------------------------------------------------------------------
// Illustration modules, loaded on demand so each experience only downloads
// the art it uses. A module's default export is
//   create(scene, parent, params, area) -> instance
// where `area` is { x, y, w, h } in design px and `instance` may implement:
//   setState(params)          toggle-lab: show one state (may return a Promise)
//   play(id, params)          choice / pick-a-point: animate an outcome (Promise)
//   highlight(id)             stepper: emphasise one part
//   toScreen(x, y)            hotspot and point coordinates -> design px
//   drawItems(items, marks)   tap-hotspots: draw the items in the art's own style
//   place                     place-on-road: { set(v), valueAt(px, py), get() }
//   update(time, dtSeconds)   per-frame animation
//   destroy()
// See docs/learning-lab/ENGINE.md.
// ---------------------------------------------------------------------------
const LOADERS = {
  card: () => import('./card.js'),
  'rural-road': () => import('./ruralRoad.js'),
  'city-drive': () => import('./cityDrive.js'),
  'crossing-street': () => import('./crossingStreet.js'),
  'truck-lanes': () => import('./truckLanes.js'),
  'truck-junction': () => import('./truckJunction.js'),
  'distance-strip': () => import('./distanceStrip.js'),
  passing: () => import('./passing.js'),
  'head-impact': () => import('./headImpact.js'),
  'rider-gear': () => import('./riderGear.js'),
  'car-features': () => import('./carFeatures.js'),
  'child-seat': () => import('./childSeat.js'),
  'trip-map': () => import('./tripMap.js'),
  'road-treatment': () => import('./roadTreatment.js'),
  'water-crossing': () => import('./waterCrossing.js'),
  'crash-lab': () => import('./crashLab.js')
};

export const DEFAULT_AREA = { x: 28, y: 104, w: 484, h: 400 };

export async function loadArt(kind) {
  const load = LOADERS[kind];
  if (!load) throw new Error('Unknown art kind: ' + kind);
  return (await load()).default;
}
