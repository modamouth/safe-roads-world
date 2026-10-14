# Newly supplied Priority 2 artwork

Seven of the nine supplied PNGs decode completely. Their RGBA alpha ranges are 0–255, with fully transparent corners. Files were copied without modification into `public/assets/learning-lab/priority-2/top-down/`; SHA-256 evidence, dimensions and alpha bounds are in `priority-2-audit.json`. Existing artwork and earlier integration changes remain intact.

| PNG | Integration |
| --- | --- |
| fuel-tanker | Heavy-vehicle blind-spot and placement scenes (`truckLanes`) |
| red-sedan | Active car and red hotspot in truckLanes; crossingStreet parked/approaching cars; truckJunction traffic; passing comparison |
| minibus-taxi | Blind-spot taxi hotspot and parked crossingStreet taxis |
| double-cab-bakkie | Parked crossingStreet vehicle and opposing truckJunction traffic |
| cyclist | Blind-spot cyclists and animated passing comparison |
| pedestrian | Blind-spot pedestrian hotspots and crossingStreet moving pedestrian |
| cyclist-car-safe-pass | Bicycle introduction reference card; not used to claim a measured safe gap |
| blue-sedan | Not registered: image-data (IDAT) chunk is truncated; blue diagram fallback retained |
| motorcycle-rider | Not registered: image-data (IDAT) chunk is truncated; motorcycle diagram fallback retained |

The Nguni cow is still missing. Priority 1 missing artwork is unchanged.

## Display and interaction

The shared manifest controls loading. `topDown.js` reuses image pools and uses alpha-bound texture frames without editing the original PNGs. Sprites preserve aspect ratio; drawn blind spots, stop/brake indicators, selection feedback, distances, instructional text and hit areas remain separate.

The supplied tanker is a rigid vehicle with different proportions from the existing long tanker diagram. truckLanes uses one adjusted schematic depth transform for the truck, zone polygons, hotspots, placement and inverse pointer calculations. The original logical grading coordinates remain intact. This is an illustrative blind-spot diagram, not a scale drawing of vehicle dimensions.

Named purple/yellow/blue/teal cars in the heavy-vehicle hotspot lesson retain their drawn colours so their accessible labels remain correct. The blue sedan and motorcycle are not replaced with a differently coloured vehicle.

The truckJunction lesson describes a loaded flatbed, so its existing drawn truck remains. It uses the new smaller vehicles without misrepresenting the tanker as a flatbed. Passing distance is still measured by code overlays using the separate cyclist and sedan sprites. The combined reference has a mirror at the right canvas edge; it is not used for calibrated measurements.

## Files added or changed in this follow-up

- Seven original PNG copies under `public/assets/learning-lab/priority-2/top-down/`.
- `src/lab/assets.js`: typed manifest entries and per-illustration dependencies.
- `src/lab/art/topDown.js`: reusable sprite pool, alpha frames and contain scaling.
- `src/lab/art/{truckLanes,truckJunction,crossingStreet,passing}.js`: artwork integration with original interactions and fallback drawings.
- `src/lab/renderers/tapHotspots.js`: minimum 66 design-pixel targets (44 CSS pixels at 360 × 640).
- `content/learning-lab/bicycle/en.json`: supplied reference image in existing introduction and shorter passing prompt to reserve caption/navigation space; no scenes added or removed, so existing resume indices stay valid.
- `e2e/priority2.spec.js`: changed scenes, state selection, hotspot grading, placement, crossing/passing, aspect ratios, asset failures and fallback coverage.
- This report and `priority-2-audit.json`.

## Next files needed

Re-export `blue-sedan.png` and `motorcycle-rider.png` as complete transparent PNGs, and supply the Nguni cow. The damaged source files were not modified or loaded into the game.

## Validation and screenshots

Typecheck, production build, four unit tests and lint pass. Lint retains three pre-existing unused-import warnings; content validation retains four existing warnings and no errors. Four Priority 2 browser tests pass: changed lessons at 360 × 640, 390 × 844 and 540 × 960, plus intentional tanker/cyclist loading failures. A further 360 × 640 check waits for crossing and heavy-vehicle animations to finish and confirms their next-step controls appear. Normal tests report no missing-texture warnings or asset 404s. Rendered PNG sprites use equal horizontal/vertical scale.

Review screenshots: [tanker](screenshots/priority2-tanker.png), [blind spots](screenshots/priority2-blind-spots.png), [passing gap](screenshots/priority2-passing.png), [crossing](screenshots/priority2-crossing.png), [reference illustration](screenshots/priority2-reference.png). These five new screenshots are review artifacts, not runtime assets.
