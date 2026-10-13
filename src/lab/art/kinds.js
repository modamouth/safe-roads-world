// Illustration kinds that content can ask for (`art: { kind, params }`).
// Each has a module in this folder, loaded on demand by art/index.js.
// Kept free of Phaser so the content checker can import it.
export const ART_KINDS = [
  'card',            // icon vignette on a tinted panel; the default for stories and quizzes
  'rural-road',      // chase view down a Namibian rural road: time of day, surface, weather, animal, braking
  'city-drive',      // chase view down a Windhoek street: a pedestrian steps out, braking at a chosen speed
  'crossing-street', // top-down Windhoek street for choosing where to cross
  'truck-lanes',     // top-down multi-lane road around a truck, with its blind spots
  'truck-junction',  // top-down approach to traffic lights beside a loaded truck
  'distance-strip',  // side-on strip comparing distances, with minibus-taxi lengths for scale
  'passing',         // top-down car passing a cyclist, with a distance zone
  'head-impact',     // head pictogram with an impact colour map, with or without a helmet
  'rider-gear',      // rider pictogram showing which body areas gear protects
  'car-features',    // side-view car with safety features highlighted
  'child-seat',      // child-seat pictogram: harness, seat and belt fit
  'trip-map',        // schematic B1 route with towns and rest stops
  'road-treatment',  // top-down road with a safety treatment shown or hidden
  'water-crossing',  // side view of a low-water crossing, dry or in flood
  'crash-lab'        // crash-test lab: a car with a dummy driven into a barrier, damage by impact speed
];
