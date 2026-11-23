// ---------------------------------------------------------------------------
// Journey to the Ocean: route data. Windhoek to Swakopmund on the B2, three legs.
// Same leg format as route.js, plus the weather of the Namib:
//
//   fog       [[from, to, seeM]] coastal fog: you can see about seeM metres; the road is damp
//   dust      [[from, to, seeM]] an east-wind dust storm: low visibility and crosswind gusts
//   sand      [[from, to, count]] sand drifts blown across the road
//   land      'highland' | 'savanna' | 'desert' | 'coast'
// ---------------------------------------------------------------------------

export const COAST_LEGS = [
  {
    id: 'karibib', from: 'Windhoek', to: 'Karibib', realKm: 180, length: 4200,
    time: 'day', weather: 'clear', fatigueRate: 0.08, land: 'highland',
    brief: 'West on the B2 to the sea. Through Okahandja, then trucks heading for Walvis Bay.',
    zones: [
      { at: 0, limit: 60, sign: 'town:Windhoek' }, { at: 350, limit: 120 },
      { at: 1450, limit: 60, sign: 'town:Okahandja' }, { at: 1800, limit: 120 },
      { at: 3950, limit: 60, sign: 'town:Karibib' }
    ],
    curves: [[600, 900, 0.0012], [2100, 2400, -0.001], [3300, 3600, 0.0009]],
    leads: [
      { at: 140, kmh: 55, until: 650, key: 'veh_taxi' },
      // A fuel tanker on its way to Walvis Bay: two cars come the other way, then the road clears.
      { at: 2450, kmh: 70, until: 3500, key: 'veh_rear_fuel_tanker', activate: 2350, overtake: { plan: [[450, 'veh_truck'], [580, 'veh_sedan_white']] } }
    ],
    animals: [], potholes: [], rest: null, oncoming: 300, phone: [25],
    warthogs: { every: [500, 900] },
    crossings: [{ at: 220, who: 'shopper', from: 1 }, { at: 1640, who: 'schoolgirl', from: -1 }, { at: 4080, who: 'vendor', from: 1 }]
  },
  {
    id: 'arandis', from: 'Karibib', to: 'Arandis', realKm: 140, length: 4400,
    time: 'day', weather: 'clear', fatigueRate: 0.16, land: 'desert',
    brief: 'Into the Namib. An east wind is blowing: dust cuts the view, gusts push the car and sand drifts across the road.',
    zones: [
      { at: 0, limit: 60, sign: 'town:Karibib' }, { at: 300, limit: 120 },
      { at: 1150, limit: 60, sign: 'town:Usakos' }, { at: 1450, limit: 120 },
      { at: 2250, limit: 80, sign: 'dust' }, { at: 3250, limit: 120 },
      { at: 4150, limit: 60, sign: 'town:Arandis' }
    ],
    curves: [[700, 950, -0.001], [1900, 2150, 0.0012], [2700, 2950, -0.0008]],
    leads: [{ at: 500, kmh: 80, until: 1050, key: 'veh_bakkie' }],
    // Little livestock out here: a kudu in the bush before the desert, then desert game:
    // an oryx on the gravel plains, and springbok after the dust storm.
    animals: [{ at: 700, kind: 'kudu', side: 1 }, { at: 1900, kind: 'oryx', side: -1 }, { at: 3330, kind: 'springbok', side: 1 }],
    dust: [[2300, 3200, 70]], sand: [[2450, 3100, 7]],
    potholes: [], rest: 3800, oncoming: 380, phone: [40],
    crossings: [{ at: 160, who: 'worker', from: -1 }, { at: 1300, who: 'shopper', from: 1 }, { at: 4290, who: 'teen-phone', from: 1 }]
  },
  {
    id: 'ocean', from: 'Arandis', to: 'Swakopmund', realKm: 40, length: 3300, home: true, finale: 'You reached the ocean',
    time: 'day', weather: 'clear', fatigueRate: 0.1, land: 'coast',
    brief: 'The last stretch to the sea. Thick fog rolls in off the Atlantic: drive at a speed you can stop in what you can see, and watch for cars without lights.',
    zones: [
      { at: 0, limit: 60, sign: 'town:Arandis' }, { at: 300, limit: 120 },
      { at: 1100, limit: 120, sign: 'fog' },
      { at: 2900, limit: 60, sign: 'town:Swakopmund' }
    ],
    curves: [[600, 850, 0.0008], [2000, 2250, -0.0009]],
    // A car crawling through the fog with no lights on.
    leads: [{ at: 1700, kmh: 45, until: 2600, key: 'veh_sedan_white', lightsOff: true }],
    animals: [], potholes: [], rest: null, oncoming: 340, phone: [15],
    fog: [[1150, 2650, 55]],
    crossings: [{ at: 150, who: 'vendor', from: 1 }, { at: 3060, who: 'schoolgirl', from: -1 }]
  }
];

// Passport stamps for this journey (nine, like the Journey Home).
export const COAST_STAMPS = [
  { id: 'pretrip', label: 'Pre-trip check', icon: 'check', how: 'Do every check before you leave.' },
  { id: 'karibib', label: 'Karibib', icon: 'highway', how: 'Reach Karibib with no collisions.' },
  { id: 'arandis', label: 'Arandis', icon: 'highway', how: 'Reach Arandis with no collisions.' },
  { id: 'ocean', label: 'The ocean', icon: 'home', how: 'Reach Swakopmund with no collisions.' },
  { id: 'limit', label: 'Within the limit', icon: 'speed', how: 'Drive a whole leg without speeding.' },
  { id: 'gap', label: '3-second gap', icon: 'truck_brake', how: 'Follow a vehicle for a whole leg without getting too close.' },
  { id: 'fog', label: 'Fog-wise', icon: 'conditions', how: 'Drive through the coastal fog at a speed you can stop in.' },
  { id: 'dust', label: 'Dust storm', icon: 'steering', how: 'Get through the dust storm without skidding or leaving your lane.' },
  { id: 'wildlife', label: 'Wildlife aware', icon: 'animal', how: 'Get past an animal on the road without hitting it.' }
];

export const COAST_TIPS = [
  'In fog, drive at a speed you can stop in within the distance you can see.',
  'Switch your headlights on in fog and dust so others can see you. Never drive on parking lights alone.',
  'In a crosswind, slow down and hold the steering firmly. Gusts are worst on open plains and past trucks.',
  'Sand on the road is slippery: ease off before it, and do not brake hard on it.',
  'Carry water on desert roads, and check your tyres: heat raises tyre pressure.',
  'Keep at least a 3-second gap, and more in fog, dust and on damp roads.'
];
