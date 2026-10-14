// @ts-check
/** @typedef {{ key: string, path: string, bounds?: number[] }} LabAsset */
/** @param {string} name @param {boolean} [photo] @returns {LabAsset} */
const asset = (name, photo = false) => ({ key: (photo ? 'img_' : '') + name, path: 'assets/' + name + '.webp' });

// Existing keys are retained so content files and world-shell users share textures.
export const LEARNING_LAB_ASSETS = {
  topDown: {
    tanker: { key: 'lab-td-fuel-tanker', path: 'assets/learning-lab/priority-2/top-down/fuel-tanker.png', bounds: [332, 29, 692, 1506] },
    redSedan: { key: 'lab-td-red-sedan', path: 'assets/learning-lab/priority-2/top-down/red-sedan.png', bounds: [123, 31, 901, 1511] },
    taxi: { key: 'lab-td-minibus-taxi', path: 'assets/learning-lab/priority-2/top-down/minibus-taxi.png', bounds: [180, 25, 844, 1503] },
    bakkie: { key: 'lab-td-double-cab-bakkie', path: 'assets/learning-lab/priority-2/top-down/double-cab-bakkie.png', bounds: [137, 18, 888, 1501] },
    cyclist: { key: 'lab-td-cyclist', path: 'assets/learning-lab/priority-2/top-down/cyclist.png', bounds: [242, 27, 783, 1506] },
    pedestrian: { key: 'lab-td-pedestrian', path: 'assets/learning-lab/priority-2/top-down/pedestrian.png', bounds: [193, 22, 852, 1503] },
    safePass: { key: 'lab-td-cyclist-car-safe-pass', path: 'assets/learning-lab/priority-2/top-down/cyclist-car-safe-pass.png', bounds: [40, 134, 1024, 1382] }
  },
  childSeat: { firm: asset('childseat_firm', true), loose: asset('childseat_loose', true), harnessLoose: asset('childseat_slack', true) },
  animals: { kudu: asset('scn_kudu'), kuduLeaping: asset('scn_kudu_leap'), donkey: asset('scn_donkey') },
  scenery: { acacia: asset('scn_acacia'), bush: asset('scn_bush'), palm: asset('scn_palm'), lamp: asset('scn_lamp'), post: asset('post', true) },
  roads: { base: asset('td_road'), rumble: asset('td_rumble'), refuge: asset('td_refuge'), lighting: asset('td_lighting'), fence: asset('td_fence'), crossroads: asset('td_crossroads'), roundabout: asset('td_roundabout') },
  trafficLight: { off: asset('tl_off'), red: asset('tl_red'), yellow: asset('tl_yellow'), green: asset('tl_green') },
  cards: { alcohol: asset('spot_beer'), medicine: asset('spot_meds'), phone: asset('spot_phone'), wheel: asset('spot_wheel') },
  crossing: asset('scn_crossing'), route: asset('scn_b1map'),
  crash: { background: asset('labbg', true), car: asset('labcar0', true), car60: asset('labcar60', true), car80: asset('labcar80', true), car90: asset('labcar90', true) },
  oncomingTruck: asset('truck', true)
};
const A = LEARNING_LAB_ASSETS;
const values = Object.values;
/** @type {Record<string, LabAsset[]>} */
const BY_KIND = {
  'child-seat': values(A.childSeat),
  'rural-road': [...values(A.animals), A.scenery.acacia, A.scenery.bush, A.scenery.post, A.oncomingTruck],
  'city-drive': [A.scenery.palm, A.scenery.lamp],
  'road-treatment': values(A.roads), 'trip-map': [A.route],
  'water-crossing': [A.crossing], 'crash-lab': values(A.crash),
  'truck-lanes': [A.topDown.tanker, A.topDown.redSedan, A.topDown.taxi, A.topDown.cyclist, A.topDown.pedestrian],
  passing: [A.topDown.redSedan, A.topDown.cyclist],
  'crossing-street': [A.topDown.redSedan, A.topDown.taxi, A.topDown.bakkie, A.topDown.pedestrian],
  'truck-junction': [...values(A.trafficLight), A.topDown.redSedan, A.topDown.bakkie], 'traffic-light': values(A.trafficLight)
};
export const LAB_ASSET_LIST = [...new Map([...values(BY_KIND).flat(), ...values(A.cards), ...values(A.topDown)].map(a => [a.key, a])).values()];
/** @param {{kind: string, params?: Record<string, unknown>}} spec @returns {LabAsset[]} */
export function assetsForArt(spec) {
  if (spec.kind === 'card') return LAB_ASSET_LIST.filter(a => a.key === spec.params?.image);
  if (spec.kind === 'child-seat') {
    if (spec.params?.view === 'belt') return [];
    return [A.childSeat.firm, spec.params?.view === 'harness' ? A.childSeat.harnessLoose : A.childSeat.loose];
  }
  if (spec.kind === 'road-treatment') {
    const treatment = spec.params?.treatment;
    if (treatment === 'roundabout') return [A.roads.crossroads, A.roads.roundabout];
    if (typeof treatment === 'string' && ['rumble', 'refuge', 'lighting', 'fence'].includes(treatment)) {
      return [A.roads.base, A.roads[treatment]];
    }
    return [];
  }
  return BY_KIND[spec.kind] || [];
}
