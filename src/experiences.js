// ---------------------------------------------------------------------------
// Learning Lab registry. One entry per experience shown in LabMenu and in the
// Mission Map's Lab card.
//   status  'playable' (opens `scene`) | 'locked' (placeholder: shows "Coming soon")
//   reset() clears that experience's session state so it can be started fresh.
// Only mark an experience playable once its scenes exist.
// ---------------------------------------------------------------------------
import { state } from './config.js';

const soon = (id, label, icon) => ({ id, label, title: label, icon, status: 'locked' });

export const EXPERIENCES = [
  {
    id: 'speed', label: 'Speed', title: 'Speed check', icon: 'car_speed', status: 'playable', scene: 'Predict', minutes: 3,
    blurb: 'See what a few km/h does in a head-on crash.',
    reset() { state.guess = null; state.firstSpeed = null; state.tried = { 60: false, 80: false, 90: false }; }
  },
  soon('pedestrian', 'Pedestrian', 'pedestrian'),
  soon('motorcycle', 'Motorcycle', 'motorcycle'),
  soon('bicycle', 'Bicycle', 'bicycle'),
  soon('heavy', 'Heavy vehicle', 'heavy'),
  soon('vehicle-safety', 'Vehicle safety', 'car_shield'),
  soon('conditions', 'Drive to conditions', 'conditions'),
  soon('child-seats', 'Child car seats', 'child_seat'),
  soon('road-rules', 'Road rules', 'rules'),
  soon('road-treatments', 'Road treatments', 'treatment'),
  soon('alcohol-drugs', 'Alcohol & drugs', 'alcohol'),
  soon('fatigue', 'Fatigue', 'fatigue')
];

export const experienceById = id => EXPERIENCES.find(e => e.id === id);
