# Learning Lab artwork mapping

The later supplied Priority 2 PNGs are covered in [the follow-up report](PRIORITY-2-INTEGRATION.md), including seven integrated assets and two truncated files needing re-export.

Inspected before implementation. Source location for every available image: `public/assets/`. The existing project uses JavaScript, Phaser 3, Vite, 540 × 960 design space, camera scaling, reduced-motion support and accessible HTML mirrors. Keep those conventions. At the initial audit, no PNG source files or other priority artwork were found in the workspace. The later supplied PNGs are documented in the follow-up report. No pre-existing working-tree changes were present.

| Supplied filenames | Existing destination / replacement |
| --- | --- |
| childseat_firm, childseat_loose | childSeat install: firm and tilted loose seat |
| childseat_firm, childseat_slack | childSeat harness: snug dummy and loose harness (firm artwork serves both lessons under one key) |
| scn_kudu, scn_kudu_leap | ruralRoad speed/animal hazard, standing/leaping states |
| scn_donkey | ruralRoad livestock hazard; visually grey donkey |
| scn_acacia, scn_bush, post | ruralRoad scenery and marker posts |
| scn_palm, scn_lamp | cityDrive palms and street lamps |
| veh_sedan_blue, veh_sedan_white, veh_taxi, veh_bakkie, veh_truck | cityDrive parked road users and existing world shell; these are REAR views, not top-down assets |
| scn_crossing | waterCrossing dry base, with separate code-drawn water |
| td_road, td_rumble, td_refuge, td_lighting, td_fence | roadTreatment base/treatment comparisons |
| td_crossroads, td_roundabout | roadTreatment intersection comparison |
| scn_b1map | tripMap fatigue route; code labels and selectable mission points |
| tl_off, tl_red, tl_yellow, tl_green | traffic-light comparison; road-rules quiz; truckJunction animated signal |
| spot_beer, spot_meds, spot_phone, spot_wheel | card vignettes in alcohol/drugs, distraction, fatigue lessons |
| labbg, labcar0, labcar60, labcar80, labcar90 | existing crashLab speed comparison (retained) |
| truck | existing ruralRoad oncoming truck (front view; retained) |

All names above have `.webp` extensions. Source files remain unchanged. Shell-only sky, suv, map_bg, hero_passport and city_backdrop remain in the existing shell loader.

## Missing artwork at the initial audit

Booster/no-booster pair; separate adult belted/unbelted dummy pair; side-view safety-feature vehicle; everyday/equipped rider pair; three helmet/head-form states; pedestrian walking frames; Nguni cow; top-down tanker, red/blue sedans, taxi, bakkie, motorcycle, cyclist and pedestrian; cyclist/passing-car scene. Existing drawn illustrations remain for these. Do not substitute rear-view vehicles in top-down scenes or invent missing paths.

## Transparency and alignment

`asset-audit.json` records dimensions, alpha ranges and visible bounds. All supplied Lab cutouts have actual alpha, not baked checkerboards. The intentional backgrounds (sky, city_backdrop, labbg, map_bg) are opaque.

Child states share 761 × 720 canvases, but visible right edges differ (firm ends at x=713). Retain the common source canvas/origin so the rear vehicle seat stays anchored. Kudu poses share height 480 but widths differ (496/730); use height-based scale and a shared ground anchor. Long roads share 368 × 800 canvases with varying alpha padding; preserve common canvas coordinates. Crossroads is 655 × 640 versus roundabout 640 × 640: a common maximum canvas prevents a scale jump. Traffic signals share 201 × 420 canvases but housing size/padding and slight perspective differ; the shared source canvas keeps position and scale stable; source housing differences remain visible. This cannot erase the source perspective difference without replacing artwork.

The existing crossing and treatment code used cover scaling and cropped useful content. Integration uses contain scaling. Route markers and labels use the same normalized map transform.

## Implementation

- `src/lab/assets.js`: JSDoc-typed central manifest retaining existing keys; only real files, with per-art dependencies.
- `src/lab/loadAssets.js`: on-demand scene loader, cache reuse and development warnings on optional failures.
- `src/scenes/Boot.js`: remove Lab-only splash loading; shell vehicle textures remain shared.
- `src/lab/LabRunner.js`: wait for art assets, guard stale scene visits, release Lab textures on leaving the Lab.
- `src/lab/art/fit.js`: contain-fit geometry and shared-canvas crossfades, respecting reduced motion.
- `src/lab/art/childSeat.js`: start loose; use firm/loose and snug/slack artwork, shoulder/hip highlights and fitting decision transition. Booster artwork is unavailable; retain the drawn comparison.
- `src/lab/art/roadTreatment.js`: contain-fit base/treatment pairs with crossfades.
- `src/lab/art/waterCrossing.js`: contain-fit dry artwork and separate animated water; readable depth legends outside the illustration.
- `src/lab/art/trafficLight.js`: four states with text labels and per-state drawn fallback.
- `src/lab/art/index.js`, `kinds.js`: register the new signal illustration within the existing loader/schema conventions.
- `src/lab/art/truckJunction.js`: avoid requesting a missing signal-state texture.
- `src/lab/art/ruralRoad.js`: one controlled kudu leap instead of repeated bouncing; restore standing state after braking.
- `src/lab/art/card.js`: reuse contain-fit helper for existing spot illustrations.
- `src/lab/routeStops.js`, `src/lab/art/tripMap.js`, `src/lab/renderers/pickAPoint.js`: typed normalized stop positions, shared mission-point transform, inspectable stops and keyboard mirrors.
- `src/lab/renderers/toggleLab.js`: fit long captions above fixed bottom controls.
- `src/lab/kit.js`: larger option hit targets (66 design pixels = 44 CSS pixels at 360 × 640).
- `content/learning-lab/{child-seats,conditions,road-rules,road-treatments}/en.json`: fitting decision, dry crossing state, signal comparison, lighting/fencing comparisons and five treatment-selection questions. Content versions advance to 2 using the existing version-reset mechanism: outdated numeric resume points reset, earned stamps remain. Progress/authentication implementations remain unchanged.
- `src/a11y.js`: prevent removal of focused controls from redrawing destroyed canvas text.
- `src/ui.js`: add missing Phaser import required by the existing crash effect.
- `jsconfig.json`, `eslint.config.js`: restore missing configurations for the already-defined typecheck/lint commands. Type checking covers JSDoc-typed manifest/route configuration; the legacy JavaScript code is not migrated to TypeScript.
- `tests/lab-assets.test.js`: manifest file/key/path integrity, content-image resolution, normalized routes and contain geometry.
- `e2e/artwork.spec.js`, `playwright.config.js`: mission renders/state selections, optional-asset failures, keyboard signals, resizing, spot cards and texture release; configurable installed browser and software rendering.
- `docs/learning-lab/asset-audit.json`, this report: asset evidence and integration record.

## Next artwork work

Supply the missing state pairs and genuine top-down road users listed above. Export all traffic-light states from one unchanged housing/camera so swapping the lit lamp does not change perspective. Original WebP assets were not recompressed; no original PNGs were present to assess conversion quality.

## Validation

- `npm run typecheck`: passes (typed manifest and normalized route configuration; legacy JavaScript remains unchecked unless annotated).
- `npm run lint`: passes with three existing unused-import warnings in resources, CityRunStub and Passport.
- `npm test`: four artwork integrity/geometry tests pass.
- `npm run build`: passes; content checker reports zero errors and four existing warnings.
- Final long-caption layout adjustment: two further browser tests pass at 360 × 640 and 540 × 960.
- Full artwork browser suite: eight tests pass using installed Chromium with software rendering. Tested 360 × 640, 390 × 844, 430 × 932, 540 × 960 and 1280 × 900.
- Browser coverage: 18 scene destinations per size; state selection, fitting decision, actual asset requests, optional child-seat/signal failures, keyboard Enter operation, B1 orientation resizing, four spot illustrations, texture release and unchanged image position/origin/scale during normal-motion swaps.
- No asset 404s or missing-texture warnings in normal mission tests. Optional failures are intentional in the fallback test.
- Source cutout alpha is genuine. Manual screenshot review checked child seat/harness, crossing water/legends, map markers and treatment/signal frames.
- Saved progress uses existing content versioning; no authentication or passport implementation changes.

Run browser checks with `npm run test:e2e -- artwork`. If the pinned Playwright browser is unavailable, set `PLAYWRIGHT_EXECUTABLE` to an installed compatible Chromium executable or `PLAYWRIGHT_CHANNEL=chrome` for installed Chrome. These paths are test environment settings, never runtime asset paths.

## Screenshots

Captured from the local game, with original artwork unchanged:

- [Seat fitting](screenshots/360-child-seats-install.png)
- [Harness comparison](screenshots/360-child-seats-harness.png)
- [Flooded crossing](screenshots/360-conditions-depth.png)
- [B1 route](screenshots/360-fatigue-plan.png)
- [Roundabout](screenshots/540-road-treatments-roundabout.png)
- [Traffic signal](screenshots/540-road-rules-signal-states.png)

These six new PNG screenshots are review artifacts, not runtime assets.
