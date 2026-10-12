// ---------------------------------------------------------------------------
// Learning Lab registry. One entry per experience shown in LabMenu and in the
// Mission Map's Lab card.
//   status  'playable' (opens `scene`)
//           'preview'  (opens the ExperienceIntro screen built from `intro`; its
//                      perspectives can each be playable or locked)
//           'locked'   (placeholder: shows "Coming soon")
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
  {
    id: 'pedestrian', label: 'Pedestrian', title: 'Pedestrian safety', icon: 'pedestrian', status: 'preview',
    intro: {
      tagline: 'Protecting our most vulnerable',
      body: "Learn how to protect pedestrians when you're driving and how to stay safe when you're walking.",
      prompt: 'Pick a perspective to test',
      options: [
        {
          id: 'driving', label: 'Driving', icon: 'steering', status: 'playable', scene: 'StopDistance',
          predict: {
            question: 'How many metres does a car need to fully stop when travelling at 50 km/h in dry conditions?',
            options: [10, 19, 24, 31, 37, 50], unit: 'm',
            answer: null,   // TODO: set from a cited source (reaction time + braking, dry road) before launch
            sourceRef: null,
            note: "We'll reveal the right answer at the end."
          },
          // Driving scenario: pick a speed, a pedestrian steps out `hazardM` ahead, the car brakes.
          scenario: {
            speeds: [30, 40, 50],
            hazardM: 25,
            reactionS: 1.5,   // PLACEHOLDER: driver reaction time (s). Validate with a road-safety partner.
            decel: 7.0,       // PLACEHOLDER: dry-road braking deceleration (m/s^2). Validate before launch.
            revealKmh: 50     // speed the prediction question asks about
          }
        },
        {
          id: 'walking', label: 'Walking', icon: 'walker', status: 'playable', scene: 'WalkCross',
          predict: {
            question: 'How much more likely is a pedestrian to die when a car travelling at 50 km/h hits them compared to 40 km/h?',
            options: [1.5, 2, 4], unit: 'x',
            answer: 2,
            explain: 'A pedestrian is more than twice as likely to die if a car hits them at 50 km/h than at 40 km/h.',
            sourceRef: null,  // TODO: cite the source for the answer and the chart figures below
            note: "We'll reveal the right answer at the end."
          },
          // Crossing scenario: pick where to stand, a car approaches in the near lane at `carKmh`.
          // shopBrand: 'woermann-brock' shows Woermann Brock store branding on the shop across the road.
          // Needs Woermann Brock's permission before public use; set to null for a generic shop.
          scenario: { carKmh: 50, decideAtM: 28, shopBrand: 'woermann-brock' },
          // Screens after the scenario (WalkReveal): answer, chart + tip, then "Always remember".
          reveal: {
            heading: 'Be aware, cross with care',
            sub: 'Stop, look, listen and think every time before you step out.',
            chart: { title: 'Chance of death %', unit: 'km/h', bars: [[40, 40], [50, 90]] },  // PLACEHOLDER until sourced
            tip: 'At night or in low light, wear bright, light-coloured or reflective clothing so drivers can see you.',
            remember: [
              'Choose the safest place to cross and use a pedestrian crossing if there is one.',
              'Keep looking both ways as you cross, making sure that drivers can see you.',
              'Never assume an approaching driver can see you or will stop for you. Drivers also need more time to stop in bad weather.'
            ]
          }
        }
      ]
    }
  },
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
