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
            speeds: [40, 50, 60],   // Namibia's general urban limit is 60 km/h
            hazardM: 30,           // with the placeholder physics: 40 stops in time, 50 and 60 don't
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
  {
    id: 'heavy', label: 'Heavy vehicle', title: 'Heavy vehicle safety', icon: 'heavy', status: 'preview',
    intro: {
      tagline: 'Be truck aware',
      body: 'Heavy vehicles have bigger blind spots and take longer to stop.\n\nLearn how to stay safe when sharing the road with trucks and buses.',
      prompt: 'Pick a topic to learn more',
      options: [
        {
          id: 'blind-spots', label: 'Blind spots', icon: 'blind_spot', status: 'playable', scene: 'TruckBlindSpots',
          // Namibian figures (verify with the MVA Fund before launch):
          //  - ~6% of registered vehicles are heavy trucks or buses: 19,899 trucks + 5,405 buses of
          //    401,476 vehicles (2021). WHO Global status report on road safety 2023, Namibia profile:
          //    https://www.who.int/publications/m/item/road-safety-nam-2023-country-profile
          //  - 48 deaths, 211 injuries in 112 heavy-vehicle crashes, 1 Jan to 16 Sep 2026, MVA Fund as
          //    reported by Economist Namibia (22 Sep 2026):
          //    https://economist.com.na/rising-truck-crashes-trigger-urgent-road-safety-warning-in-erongo-and-otjozondjupa/
          // The original NSW question asked for the share of road deaths. That needs the MVA Fund's
          // national death total for the same period, which isn't published yet.
          predict: {
            question: 'Heavy trucks and buses make up about 6% of vehicles registered in Namibia. In 2026, up to mid-September, how many people died in crashes involving heavy vehicles?',
            options: [15, 48, 95], unit: '',
            answer: 48,
            explain: '48 people died and 211 were injured in 112 crashes involving heavy vehicles between 1 January and 16 September 2026.',
            sourceRef: 'MVA Fund via Economist Namibia, 22 Sep 2026; WHO Global status report on road safety 2023 (2021 vehicle data)',
            note: "We'll reveal the right answer at the end."
          }
        },
        { id: 'braking', label: 'Braking distance', icon: 'truck_brake', status: 'locked' }
      ]
    }
  },
  soon('vehicle-safety', 'Vehicle safety', 'car_shield'),
  soon('conditions', 'Drive to conditions', 'conditions'),
  soon('child-seats', 'Child car seats', 'child_seat'),
  soon('road-rules', 'Road rules', 'rules'),
  soon('road-treatments', 'Road signs & markings', 'treatment'),
  soon('alcohol-drugs', 'Alcohol & drugs', 'alcohol'),
  soon('fatigue', 'Fatigue', 'fatigue')
];

export const experienceById = id => EXPERIENCES.find(e => e.id === id);
