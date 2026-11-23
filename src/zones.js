// ---------------------------------------------------------------------------
// Mission Map registry. One entry per zone node.
//   x, y      position as 0..1 fractions of the full-screen map (540x960 design)
//   status    'playable' (tap opens the bottom card) | 'locked' (tap shows "Coming soon")
//   scene     Phaser scene key started from the card's button (with `data`, if given)
//   labelSide where the name pill sits relative to the node: 'above' | 'below' | 'right'
//   cta       bottom-card copy: { title, button, showExperiences }
//   onMap     false keeps the zone in the registry without drawing it
//   link      draw the road to this zone from another zone's node, not from the previous one
// Array order is also the order of the dotted road that links the nodes.
// ---------------------------------------------------------------------------
export const ZONES = [
  {
    id: 'windhoek', label: 'Windhoek City', tag: 'Start here', icon: 'city',
    x: 0.50, y: 0.63, status: 'playable', scene: 'CityRun', labelSide: 'right',
    blurb: 'Obey signals. Spot hazards. Protect every road user.',
    cta: { title: 'City Safety Run', button: 'Play mission' }
  },
  {
    id: 'lab', label: 'Road Safety Learning Lab', tag: 'Learn + practise', icon: 'lab',
    x: 0.50, y: 0.47, status: 'playable', scene: 'LabMenu', labelSide: 'below',
    blurb: 'Learn the rule. Practise the choice. Take it into your next mission.',
    cta: { title: 'Road Safety Learning Lab', button: 'Enter Lab', showExperiences: true }
  },
  { id: 'taxi', label: 'Taxi Rank', icon: 'taxi', x: 0.65, y: 0.36, status: 'locked' },
  {
    id: 'b1', label: 'B1 Highway', tag: 'The Journey Home', icon: 'highway',
    x: 0.37, y: 0.31, status: 'playable', scene: 'Journey', data: { route: 'b1' }, labelSide: 'above',
    blurb: 'Drive home from Windhoek to Tsumeb. Watch your speed, your gap and your tiredness.',
    cta: { title: 'The Journey Home', button: 'Hit the road' }
  },
  { id: 'gravel', label: 'Gravel Roads', icon: 'gravel', x: 0.45, y: 0.21, status: 'locked' },
  { id: 'logistics', label: 'Logistics Corridor', icon: 'truck', x: 0.72, y: 0.15, status: 'locked' },
  {
    id: 'b2', label: 'B2 to the Coast', tag: 'Journey to the Ocean', icon: 'conditions',
    x: 0.2, y: 0.42, status: 'playable', scene: 'Journey', data: { route: 'b2' }, link: 'windhoek', labelSide: 'below',
    blurb: 'Drive west to Swakopmund. Dust storms, crosswinds and thick coastal fog.',
    cta: { title: 'Journey to the Ocean', button: 'Head for the sea' }
  },
  { id: 'school', label: 'School Safety', icon: 'school', x: 0.5, y: 0.5, status: 'locked', onMap: false }
];

export const MAP_ZONES = ZONES.filter(z => z.onMap !== false);
export const zoneById = id => ZONES.find(z => z.id === id);
