// ---------------------------------------------------------------------------
// The Journey Home: route data. Four legs up the B1, Windhoek to Tsumeb.
// Pure data, no Phaser. Distances are simulated metres (a leg takes about two
// minutes to drive); realKm is the real distance shown on the route and HUD.
//
//   zones     [{ at, limit, sign?, noOvertake? }] speed limit from `at` (m) onwards;
//             `sign` is an extra board at the start ('town:<name>', 'roadworks', 'potholes')
//   curves    [[from, to, curvature]] 1/m, positive bends right
//   leads     slower vehicles ahead in our lane: { at, kmh, until, key, stopAt?, waitS?, parked? }
//             `until` is where it turns off; `stopAt` where it stops suddenly in lane;
//             `parked: { pullOutM }` waits on the shoulder (a taxi loading passengers) and
//             pulls out without indicating when we are pullOutM metres away;
//             `activate` is where we must be before it sets off (default: 450 m before `at`);
//             `overtake: { plan }` makes it an overtaking scene: when we close up behind it,
//             oncoming vehicles arrive per plan ([metres ahead of the truck, key]) and the road
//             is otherwise kept clear until we are past
//   animals   { at, kind: 'kudu' | 'cattle' | 'donkey', side: -1 | 1, dwellS? }
//   warthogs  { every: [min, max] } metres: warthogs (often a family in a line) dash across
//             the open road at random spots, away from towns and the other hazards
//   potholes  [from, to, count] scattered across our lane
//   crossings pedestrian (zebra) crossings in town: { at, who, from: -1 | 1, speed?, trigger? }
//             `who` is the character art; they wait at the kerb on side `from` and
//             step out when we are `trigger` metres away (default 90; less = a late step-out)
//   walkers   people walking on the edge of the tar, our side: { at, who, speed? }
//   stopGo    one-lane roadworks with a flagman: { at, length } (stop line at `at`; while
//             the board shows STOP, oncoming traffic comes through in our lane)
//   land      'highland' for the dry grass and thorn-bush hills around Windhoek;
//             otherwise the sandier savanna further north
//   rest      lay-by position (m), or null
//   oncoming  metres between oncoming vehicles (0 for none)
//   phone     seconds into the leg when a message arrives (phone not put away)
// ---------------------------------------------------------------------------

// People waiting at a parked taxi; they climb in when it pulls out.
export const TAXI_RIDERS = ['shopper', 'older-man'];

/** Every pedestrian character a leg shows, so its artwork can be loaded up front. */
export const peopleOf = leg => [...new Set([
  ...(leg.crossings || []).map(c => c.who), ...(leg.walkers || []).map(w => w.who),
  ...(leg.stopGo ? ['worker'] : []), ...(leg.leads.some(l => l.parked) ? TAXI_RIDERS : [])
])];

export const LEGS = [
  {
    id: 'leg1', from: 'Windhoek', to: 'Okahandja', realKm: 70, length: 3200,
    // A slower leg now (roadworks, taxi, walkers), so tiredness builds a little more slowly.
    time: 'day', weather: 'clear', fatigueRate: 0.07, land: 'highland',
    brief: 'Leave the city in afternoon traffic. Taxis stop and pull out anywhere, people walk on the road edge, and there are Stop/Go roadworks before Okahandja.',
    zones: [
      { at: 0, limit: 60, sign: 'town:Windhoek' }, { at: 750, limit: 80 }, { at: 1150, limit: 120 },
      { at: 1950, limit: 80, sign: 'roadworks' }, { at: 2050, limit: 40, noOvertake: true }, { at: 2300, limit: 120 },
      { at: 2900, limit: 60, sign: 'town:Okahandja' }
    ],
    curves: [[400, 650, 0.0016], [1500, 1850, -0.0011], [2300, 2600, 0.0009]],
    leads: [
      { at: 140, kmh: 50, until: 700, key: 'veh_taxi', stopAt: 420, waitS: 3 },
      { at: 1000, kmh: 60, until: 1450, key: 'veh_taxi', parked: { pullOutM: 60 } },
      { at: 1500, kmh: 95, until: 1900, key: 'veh_bakkie' },
      // Out of the roadworks behind a slow truck: two cars come the other way, then the road clears.
      { at: 2330, kmh: 60, until: 2760, key: 'veh_truck', activate: 2280, overtake: { plan: [[380, 'veh_sedan_white'], [500, 'veh_bakkie']] } }
    ],
    animals: [], potholes: [], rest: null, oncoming: 260, phone: [18, 55],
    crossings: [{ at: 260, who: 'shopper', from: 1 }, { at: 3060, who: 'schoolgirl', from: -1 }],
    walkers: [{ at: 1250, who: 'worker' }, { at: 2840, who: 'vendor' }],
    warthogs: { every: [300, 550] },
    stopGo: { at: 2100, length: 160 }
  },
  {
    id: 'leg2', from: 'Okahandja', to: 'Otjiwarongo', realKm: 180, length: 4200,
    time: 'dusk', weather: 'clear', fatigueRate: 0.15,
    brief: 'Long open road into the sunset. Roadworks, a slow truck, and kudu move at dusk.',
    zones: [
      { at: 0, limit: 60, sign: 'town:Okahandja' }, { at: 300, limit: 120 },
      { at: 500, limit: 120, noOvertake: true }, { at: 1400, limit: 120 },
      { at: 1600, limit: 80, sign: 'roadworks' }, { at: 1750, limit: 60, noOvertake: true }, { at: 2100, limit: 120 },
      // A blind bend: solid line, no overtaking, then a clear straight.
      { at: 2380, limit: 120, noOvertake: true }, { at: 2720, limit: 120 },
      { at: 3950, limit: 60, sign: 'town:Otjiwarongo' }
    ],
    curves: [[700, 1100, -0.0012], [2400, 2700, 0.0014], [3300, 3600, -0.0008]],
    leads: [
      { at: 560, kmh: 75, until: 1380, key: 'veh_rear_fuel_tanker' },
      { at: 1820, kmh: 50, until: 2080, key: 'veh_sedan_blue' },
      { at: 2200, kmh: 65, until: 3120, key: 'veh_truck', activate: 2120, overtake: { plan: [[450, 'veh_taxi'], [600, 'veh_sedan_white']] } }
    ],
    animals: [{ at: 3620, kind: 'kudu', side: -1 }],
    potholes: [], rest: 3300, oncoming: 340, phone: [35],
    crossings: [{ at: 180, who: 'vendor', from: -1 }, { at: 4080, who: 'older-man', from: 1, speed: 0.9 }],
    warthogs: { every: [500, 900] }
  },
  {
    id: 'leg3', from: 'Otjiwarongo', to: 'Otavi', realKm: 120, length: 4000,
    time: 'night', weather: 'clear', fatigueRate: 0.3,
    brief: 'Night driving. You will start to feel tired: use the rest area. Cattle wander onto unfenced roads.',
    zones: [
      { at: 0, limit: 60, sign: 'town:Otjiwarongo' }, { at: 300, limit: 120 },
      { at: 3800, limit: 60, sign: 'town:Otavi' }
    ],
    curves: [[600, 900, 0.001], [2000, 2400, -0.0013], [3000, 3300, 0.0011]],
    // At night you only see the oncoming bus's headlights: judge the gap before you pull out.
    leads: [{ at: 2350, kmh: 75, until: 3120, key: 'veh_rear_box_trailer', activate: 2200, overtake: { plan: [[520, 'veh_bus']] } }],
    animals: [{ at: 1250, kind: 'donkey', side: 1, verge: true }, { at: 3400, kind: 'cattle', side: -1, dwellS: 5 }],
    potholes: [], rest: 1800, oncoming: 420, phone: [30],
    // At Otavi a teenager on their phone steps out without looking.
    crossings: [{ at: 170, who: 'worker', from: 1 }, { at: 3900, who: 'teen-phone', from: -1, trigger: 45 }]
  },
  {
    id: 'leg4', from: 'Otavi', to: 'Tsumeb', realKm: 65, length: 3000, home: true,
    time: 'night', weather: 'rain', fatigueRate: 0.2,
    brief: 'The last stretch home, in the rain. Wet roads need longer to stop. Potholes after the storm.',
    zones: [
      { at: 0, limit: 60, sign: 'town:Otavi' }, { at: 300, limit: 120 },
      { at: 900, limit: 80, sign: 'potholes' }, { at: 1500, limit: 120 },
      { at: 2700, limit: 60, sign: 'town:Tsumeb' }
    ],
    curves: [[500, 800, -0.001], [1700, 2000, 0.0012]],
    leads: [{ at: 2760, kmh: 40, until: 2960, key: 'veh_taxi' }],
    animals: [{ at: 2150, kind: 'donkey', side: 1, dwellS: 3 }],
    potholes: [[950, 1450, 9]], rest: null, oncoming: 380, phone: [20],
    crossings: [{ at: 190, who: 'shopper', from: -1 }, { at: 2740, who: 'schoolgirl', from: 1, speed: 1.6 }]
  }
];

export const legById = id => LEGS.find(l => l.id === id);

// Passport stamps for the journey (the HUD's "Passport n/9").
export const STAMPS = [
  { id: 'pretrip', label: 'Pre-trip check', icon: 'check', how: 'Do every check before you leave.' },
  { id: 'leg1', label: 'Okahandja', icon: 'highway', how: 'Reach Okahandja with no collisions.' },
  { id: 'leg2', label: 'Otjiwarongo', icon: 'highway', how: 'Reach Otjiwarongo with no collisions.' },
  { id: 'leg3', label: 'Otavi', icon: 'highway', how: 'Reach Otavi with no collisions.' },
  { id: 'leg4', label: 'Home', icon: 'home', how: 'Get home to Tsumeb with no collisions.' },
  { id: 'limit', label: 'Within the limit', icon: 'speed', how: 'Drive a whole leg without speeding.' },
  { id: 'gap', label: '3-second gap', icon: 'truck_brake', how: 'Follow a vehicle for a whole leg without getting too close.' },
  { id: 'rested', label: 'Rested driver', icon: 'fatigue', how: 'Stop at a rest area when you feel tired.' },
  { id: 'wildlife', label: 'Wildlife aware', icon: 'animal', how: 'Get past an animal on the road without hitting it.' }
];

// The pre-trip checks before leg 1. Skipping one has a cost on the road.
export const CHECKS = [
  { id: 'tyres', label: 'Check tyre pressure with a gauge', skipped: 'Soft tyres: your car starts at 85% and potholes do more damage.' },
  { id: 'lights', label: 'Test headlights and indicators', skipped: 'A dim headlight: you will see less far at night.' },
  { id: 'belts', label: 'Everyone buckled up', skipped: 'An unbuckled passenger costs 10 safety points.' },
  { id: 'phone', label: 'Phone on Do Not Disturb, out of reach', skipped: 'Messages will arrive while you drive.' }
];

// Tips for loading and rest screens. The first two are from the original brief.
export const TIPS = [
  'Check tyre pressure with a gauge before a long trip.',
  'Keep your phone out of reach while you drive.',
  'Keep at least a 3-second gap to the vehicle ahead, and more on wet roads.',
  'Feeling tired? Stop at the next safe place and rest. Opening a window does not fix it.',
  'Animals are hardest to see at dusk and at night. Slow down where there are no fences.',
  'The speed limit is a maximum. Slow down for roadworks, rain and potholes.'
];

export const MESSAGES = [
  { from: 'Mum', text: 'Are you on the road yet? Call me when you stop.' },
  { from: 'Group chat', text: '12 new messages' },
  { from: 'Tuli', text: 'Bring the charger please!!' }
];
