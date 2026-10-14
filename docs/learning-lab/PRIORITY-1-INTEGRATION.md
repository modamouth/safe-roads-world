# Priority 1 artwork integration

All 28 uploaded Priority 1 PNGs now replace the corresponding Learning Lab drawings when their state sets load successfully. Original PNGs are unchanged. Existing Priority 2/3 artwork, cow collision/stopping behavior, progress and passport systems are preserved.

| Uploaded artwork | Renderer and lesson |
| --- | --- |
| Booster/no-booster pair | `childSeat`: belt comparison and five-step belt fit highlights |
| Belted/unbelted adult pair | `carFeatures`: seatbelt comparison |
| Side-view vehicle | `carFeatures`: vehicle safety-feature walkthrough |
| Everyday/equipped rider pair | `riderGear`: protection comparison and body-area highlights |
| Bare, motorcycle and bicycle head forms | `headImpact`: corresponding helmet comparisons |
| Six pedestrian characters × three poses | `cityDrive`: sidewalk pedestrians and schoolgirl crossing hazard |
| Existing top-down red sedan | `carFeatures`: ESC wet-road comparison |

## Display and interaction

The typed asset manifest loads only the images needed for each illustration. City scenes load their six complete pedestrian sets. None of the new images are loaded on the splash screen. The existing Lab texture-release list includes all new keys.

Paired states retain one scale, origin and shared source frame. State changes crossfade and resolve before the comparison caption appears; reduced motion switches immediately. Source files are not cropped: Phaser texture frames omit only peripheral padding. Labels, feature circles, belt-fit highlights, risk hatching and controls remain code-generated. Highlights use normalized original-canvas coordinates transformed through the same frame and scale as the image.

Pedestrian frames share a character-specific padded frame. Per-pose foot anchors keep the ground contact steady while the visible stride changes. Sidewalk walkers move at a restrained pace; the crossing character stands when motion stops. Reduced motion uses standing poses. Missing or incomplete character sets use the original drawn pedestrian textures.

The supplied head-form artwork includes a bolted test fixture. A moving force arrow and contact pulse accompany the comparison; the fixture stays anchored. Existing qualitative risk overlays, worded legend and reduced-motion handling remain. Shorter helmet prompts reserve space for captions and navigation.

Missing comparison states fall back to the complete original drawing rather than mixing a photograph with an incompatible diagram. The subsequently uploaded Priority 3 folder provides usable blue sedan and motorcycle replacements; both are now used in the heavy-vehicle hotspot scene. The original truncated Downloads copies remain untouched. New animal and scenery PNGs replace their older WebP sources; the corrected clean donkey is preferred. Duplicate artwork is loaded only once. The newly uploaded road-marker PNG is truncated, so its existing valid WebP remains in use. Every heavy-vehicle hotspot car now uses a supplied red or blue sedan. Its accessible colour label matches the image; item IDs, positions and correct answers remain unchanged. The loaded flatbed retains its task-specific illustration because a tanker cannot represent that vehicle.

## Changed files

`src/lab/LabRunner.js`, `src/lab/core/time.js`, `src/lab/assets.js`, `src/lab/art/{fit,childSeat,carFeatures,riderGear,headImpact,cityDrive,pedestrianArt,truckLanes,ruralRoad}.js`, helmet prompts in `content/learning-lab/{motorcycle,bicycle}/en.json` and car colour labels in `content/learning-lab/heavy/en.json`, artwork integrity tests and `e2e/priority1.spec.js`. Current inventory and audit: [CURRENT-ARTWORK.md](CURRENT-ARTWORK.md), [current-artwork-audit.json](current-artwork-audit.json).

The new kudu poses share a reference pixel scale during the leap; differences in source canvas dimensions no longer rescale the animal between poses.

Lab simulations use bounded raw elapsed time instead of Phaser's smoothed delta. This prevents slow renderers from stretching driving and braking demonstrations while still limiting catch-up after a tab pause to 100 ms per frame. A unit test covers slow-frame, long-pause and unavailable-clock cases.

## Validation

Lint and typecheck pass; lint reports three pre-existing unused-import warnings. All seven unit tests pass. Production build passes with zero content errors and four existing content warnings.

The six new Priority 1 browser checks pass: comparisons at 360 × 640, 390 × 844 and 540 × 960; missing-artwork fallbacks; normal-motion crossfades and walking-frame stability; feature highlights, resize, ESC artwork and texture cleanup. Existing mission, map/keyboard and state-transform checks also pass. After the elapsed-time correction and later uploads, five focused browser regressions pass, including cow impact/stopping, the new mobile artwork, normal-motion pedestrians, state alignment and Priority 2 scenes. A final heavy-vehicle check passes after updating all car images and accessible colour labels. No normal-run asset failures or missing-texture warnings were reported.

Review screenshots: [booster](screenshots/priority1-360-child-seats-child-seat-belt.png), [adult seatbelt](screenshots/priority1-360-vehicle-safety-car-features-belt.png), [rider gear](screenshots/priority1-360-motorcycle-rider-gear-scene.png), [helmet](screenshots/priority1-360-motorcycle-head-impact-motorcycle.png), [blue/red cars and motorcycles](screenshots/priority2-blind-spots.png).
