// @ts-check
/** @typedef {{ key: string, path: string, bounds?: number[] }} LabAsset */
/** @param {string} name @param {boolean} [photo] @returns {LabAsset} */
const asset = (name, photo = false) => ({ key: (photo ? 'img_' : '') + name, path: 'assets/' + name + '.webp' });

/** @param {string} group @param {string} name @returns {LabAsset} */
const png = (group, name) => ({ key: 'lab-' + group.replaceAll('/', '-') + '-' + name, path: 'assets/learning-lab/priority-1/' + group + '/' + name + '.png' });

// Existing keys are retained so content files and world-shell users share textures.
export const LEARNING_LAB_ASSETS = {
  booster: { good: png('child-booster', 'correct-booster'), bad: png('child-booster', 'no-booster') },
  adultBelt: { good: png('adult-seatbelt', 'belted'), bad: png('adult-seatbelt', 'unbelted-forward') },
  vehicle: png('vehicle', 'side-view-safety-features'),
  rider: { everyday: png('motorcycle-rider', 'everyday-clothes'), full: png('motorcycle-rider', 'full-protective-gear') },
  helmet: { none: png('helmet-test', 'no-helmet'), motorcycle: png('helmet-test', 'motorcycle-helmet'), bicycle: png('helmet-test', 'bicycle-helmet') },
  pedestrians: Object.fromEntries(['older-man', 'schoolgirl', 'shopper', 'teen-phone', 'vendor', 'worker'].map(name => [name, {
    standing: png('pedestrians/' + name, 'standing'), walkA: png('pedestrians/' + name, 'walk-a'), walkB: png('pedestrians/' + name, 'walk-b')
  }])),
  topDown: {
    blueSedan: { key: 'lab-td-blue-sedan', path: 'assets/learning-lab/priority-3/top-down/blue-sedan.png', bounds: [125, 43, 899, 1503] },
    motorcycle: { key: 'lab-td-motorcycle-rider', path: 'assets/learning-lab/priority-3/top-down/motorcycle-rider.png', bounds: [104, 10, 922, 1526] },
    tanker: { key: 'lab-td-fuel-tanker', path: 'assets/learning-lab/priority-2/top-down/fuel-tanker.png', bounds: [332, 29, 692, 1506] },
    redSedan: { key: 'lab-td-red-sedan', path: 'assets/learning-lab/priority-2/top-down/red-sedan.png', bounds: [123, 31, 901, 1511] },
    taxi: { key: 'lab-td-minibus-taxi', path: 'assets/learning-lab/priority-2/top-down/minibus-taxi.png', bounds: [180, 25, 844, 1503] },
    bakkie: { key: 'lab-td-double-cab-bakkie', path: 'assets/learning-lab/priority-2/top-down/double-cab-bakkie.png', bounds: [137, 18, 888, 1501] },
    cyclist: { key: 'lab-td-cyclist', path: 'assets/learning-lab/priority-2/top-down/cyclist.png', bounds: [242, 27, 783, 1506] },
    pedestrian: { key: 'lab-td-pedestrian', path: 'assets/learning-lab/priority-2/top-down/pedestrian.png', bounds: [193, 22, 852, 1503] },
    safePass: { key: 'lab-td-cyclist-car-safe-pass', path: 'assets/learning-lab/priority-2/top-down/cyclist-car-safe-pass.png', bounds: [40, 134, 1024, 1382] }
  },
  childSeat: { firm: asset('childseat_firm', true), loose: asset('childseat_loose', true), harnessLoose: asset('childseat_slack', true) },
  animals: { kudu: { key: 'scn_kudu', path: 'assets/learning-lab/priority-3/animals/kudu-standing.png' }, kuduLeaping: { key: 'scn_kudu_leap', path: 'assets/learning-lab/priority-3/animals/kudu-leaping.png' }, donkey: { key: 'scn_donkey', path: 'assets/learning-lab/priority-3/animals/grey-donkey-clean.png', bounds: [192, 0, 1438, 1018] }, cow: { key: 'lab-nguni-cow', path: 'assets/learning-lab/priority-2/animals/nguni-cow.png' } },
  scenery: { acacia: { key: 'scn_acacia', path: 'assets/learning-lab/priority-3/scenery/acacia-tree.png' }, bush: { key: 'scn_bush', path: 'assets/learning-lab/priority-3/scenery/savanna-bush.png' }, palm: { key: 'scn_palm', path: 'assets/learning-lab/priority-3/scenery/palm-tree.png' }, lamp: { key: 'scn_lamp', path: 'assets/learning-lab/priority-3/scenery/street-lamp.png' }, post: asset('post', true) },
  escRoad: { key: 'lab-esc-wet-road', path: 'assets/learning-lab/priority-3/roads/wet-esc-bend.png' },
  roads: { base: asset('td_road'), rumble: asset('td_rumble'), refuge: asset('td_refuge'), lighting: asset('td_lighting'), fence: asset('td_fence'), crossroads: asset('td_crossroads'), roundabout: asset('td_roundabout') },
  trafficLight: { off: asset('tl_off'), red: asset('tl_red'), yellow: asset('tl_yellow'), green: asset('tl_green') },
  cards: { cityBus: { key: 'lab-city-bus-open-door', path: 'assets/learning-lab/priority-2/side-view/city-bus-open-door.png' }, freightTruck: { key: 'lab-freight-truck-side', path: 'assets/learning-lab/priority-2/side-view/namibian-road-freight-truck.png' }, alcohol: asset('spot_beer'), medicine: asset('spot_meds'), phone: asset('spot_phone'), wheel: asset('spot_wheel') },
  crossing: asset('scn_crossing'), route: asset('scn_b1map'),
  crash: { background: asset('labbg', true), car: asset('labcar0', true), car60: asset('labcar60', true), car80: asset('labcar80', true), car90: asset('labcar90', true) },
  oncomingTruck: asset('truck', true)
};
const A = LEARNING_LAB_ASSETS;
const values = Object.values;
/** @type {Record<string, LabAsset[]>} */
const BY_KIND = {
  'child-seat': [...values(A.childSeat), ...values(A.booster)],
  'car-features': [A.vehicle, ...values(A.adultBelt), A.topDown.redSedan, A.escRoad],
  'rider-gear': values(A.rider), 'head-impact': values(A.helmet),
  'rural-road': [...values(A.animals), A.scenery.acacia, A.scenery.bush, A.scenery.post, A.oncomingTruck],
  'city-drive': [A.scenery.palm, A.scenery.lamp, ...values(A.pedestrians).flatMap(values)],
  'road-treatment': values(A.roads), 'trip-map': [A.route],
  'water-crossing': [A.crossing], 'crash-lab': values(A.crash),
  'truck-lanes': [A.topDown.tanker, A.topDown.redSedan, A.topDown.blueSedan, A.topDown.motorcycle, A.topDown.taxi, A.topDown.cyclist, A.topDown.pedestrian],
  passing: [A.topDown.redSedan, A.topDown.cyclist],
  'crossing-street': [A.topDown.redSedan, A.topDown.taxi, A.topDown.bakkie, A.topDown.pedestrian],
  'truck-junction': [...values(A.trafficLight), A.topDown.redSedan, A.topDown.bakkie], 'traffic-light': values(A.trafficLight)
};
export const LAB_ASSET_LIST = [...new Map([...values(BY_KIND).flat(), ...values(A.cards), ...values(A.topDown)].map(a => [a.key, a])).values()];
/** @param {{kind: string, params?: Record<string, unknown>}} spec @returns {LabAsset[]} */
export function assetsForArt(spec) {
  if (spec.kind === 'rural-road') return BY_KIND[spec.kind].filter(a => a.key !== A.animals.cow.key || spec.params?.hazard === 'cattle');
  if (spec.kind === 'card') return LAB_ASSET_LIST.filter(a => a.key === spec.params?.image);
  if (spec.kind === 'child-seat') {
    if (spec.params?.view === 'belt') return values(A.booster);
    return [A.childSeat.firm, spec.params?.view === 'harness' ? A.childSeat.harnessLoose : A.childSeat.loose];
  }
  if (spec.kind === 'car-features') return spec.params?.view === 'belt' ? values(A.adultBelt) : spec.params?.view === 'skid' ? [A.topDown.redSedan, A.escRoad] : [A.vehicle];
  if (spec.kind === 'head-impact') return [A.helmet.none, spec.params?.style === 'bicycle' ? A.helmet.bicycle : A.helmet.motorcycle];
  if (spec.kind === 'road-treatment') {
    const treatment = spec.params?.treatment;
    if (treatment === 'shoulder' || treatment === 'humps') return [A.topDown.blueSedan];
    if (treatment === 'roundabout') return [A.roads.crossroads, A.roads.roundabout];
    if (typeof treatment === 'string' && ['rumble', 'refuge', 'lighting', 'fence'].includes(treatment)) {
      return [A.roads.base, A.roads[treatment]];
    }
    return [];
  }
  return BY_KIND[spec.kind] || [];
}
