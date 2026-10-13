# Learning Lab: gameplay and UI review (all 12 experiences)

**For:** PromoPlays product, design and content leads
**Date:** 13 October 2026
**Method:** each experience was played through in Chromium at phone size (412×915) using the accessibility controls, with a screenshot of every screen. No page errors occurred in any experience.

## What was changed in this pass

| Area | Problem | Change |
|---|---|---|
| Pedestrian (Driving) street | Parked taxis and cars, palms, lamp posts and people on the pavements were drawn *behind* the road, so the street looked empty | Fixed the drawing order in `src/lab/art/cityDrive.js`; the busy Windhoek street is back |
| Rural road (Speed, Gravel, Fatigue, Drive to conditions) | Same drawing-order bug hid trees, bushes, marker posts and animals | Fixed earlier in `ruralRoad.js` |
| Night scenes (Speed, Fatigue, Alcohol) | Verges and roadside trees stayed bright at night | Outside the headlight beam the verges and trees are now dark; posts and animals stay lit |
| Speed: kudu decision | The kudu was too small to read on a phone | Kudu is larger and starts closer |
| Story screens in 8 experiences | Many "imagine this" screens showed only a large generic icon | Replaced with scene art: Windhoek street, night road, coastal fog, side-view car, child seat, cyclist street, rider pictogram, rumble strips |
| Road rules quiz | Text only | Each question now has an illustration (traffic circle, shoulder, highway, refuge crossing, and icon cards) |
| Flooded crossing | The waiting car was oversized and clipped at the left edge | Redrawn at the right scale on a wider bank, with windows and lights |
| Choice buttons in a row | "80 km/h" etc. wrapped onto two lines with three options | Smaller label size when there are three or more options |
| `npm test` | Failed because it ran the Playwright file | Added `vitest.config.js` so unit tests and browser tests are separate |

## Recommendations still open

These need design time, artwork or a decision rather than a quick fix.

### Across all experiences
1. **One illustrated "hero" moment per topic.** The strongest screens (Speed crash lab, Pedestrian street, Heavy vehicle blind spots) use real scenes. Quiz-heavy topics (Road rules, Alcohol & drugs, Road design) would benefit from one animated scene each, for example a traffic circle where the player taps who goes first.
2. **Drag and swipe, not only taps.** The NSW Lab's best moments are physical (swipe to crash, drag to position). The engine has drag only in the Heavy vehicle placement. Consider swipe-to-scrub for the crash lab and the stopping-distance strips.
3. **Answer feedback tone.** "Not quite" after a guess question can feel like a test failure. Consider "Here's the answer" for the reveal of a guess, and keep "Not quite" for knowledge questions.
4. **Progress and rewards.** Passport stamps appear per topic, but there are no points or stars visible during play. A small score or star line on each topic's finish screen would help motivation.
5. **Sound.** Most scenes are silent apart from clicks; ambient road, rain and city sound beds would add a lot at low cost.

### Per experience
- **Speed:** strong. Consider letting players replay the kudu choice with the other option to see both outcomes.
- **Pedestrian:** the Driving "spot where people step out" scene is the right idea; add moving pedestrians and a taxi pulling in to make it feel live.
- **Motorcycle / Bicycle:** the rider is a flat pictogram. Commission a simple illustrated rider on a bike (side view) for the story screens.
- **Heavy vehicle:** the place-the-car task only works by dragging; add up and down buttons for players who can't drag precisely.
- **Vehicle safety:** add a "choose between two second-hand cars" decision with hidden ratings (the NSW device that worked well), using Global NCAP Africa results.
- **Drive to conditions:** the fog and dust looks are subtle; strengthen the haze so visibility drops clearly.
- **Child car seats:** the five-step check would work better as an interactive check where the player taps each fault.
- **Road rules:** turn at least the traffic-circle and dead-traffic-light questions into small animated junctions.
- **Road design:** the treatments read as diagrams; a before/after animation of a car drifting into rumble strips would land the point.
- **Alcohol & drugs:** add the designated-driver social decision as a scene (friends offering drinks), not only a quiz question.
- **Fatigue:** strong (microsleep blackout and B1 trip map); add a "signs of tiredness" moment where the screen dims and the lane drifts.

## Content still needing sources (shown with † in the game)
Gravel braking deceleration, road-treatment percentages, B1 distance, heavy-vehicle braking figures. All new wording should be reviewed by the road-safety partner before release.
