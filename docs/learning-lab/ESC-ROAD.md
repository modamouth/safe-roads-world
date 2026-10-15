# ESC wet-road experience

The vehicle-safety ESC comparison now uses a realistic wet-road bend and the existing transparent red sedan. The car follows the left lane with ESC and slides onto the outer verge without ESC. Both complete trajectories remain inside the illustration; the earlier path sent the car beyond the edge at the end.

## Artwork provenance

Generated with the built-in image generation tool, without image references. The selected output was copied unchanged from `/Users/luthando/.codex/generated_images/01a139ac-b6f1-79a3-bf48-78284de640f9/exec-811ceb94-f4b9-4e00-83e9-35efe380d3c6.png` to `public/assets/learning-lab/priority-3/roads/wet-esc-bend.png`.

The 1254 × 1254 RGB PNG is intentionally opaque because it is a complete scene background. SHA-256: `05948f10a06c83907c389b6911ce67f46f18d5a06830d9a03f0f5a267c6f7ece`.

### Final generation prompt

```text
Use case: scientific-educational
Asset type: square top-down background for an interactive driving-safety game; moving car, labels and trajectory lines are added separately in code.
Primary request: A realistic directly overhead aerial view of a wet two-lane asphalt road making a broad left-hand bend, with grassy verges. The road enters through the bottom of the square at approximately x=64% and exits the left edge at approximately y=24%. It should follow a smooth sweeping quadratic bend with start (64%,104%), control (64%,24%), end (-10%,24%). Road width approximately 22% of image width, with two traffic lanes, a dashed white centre line and thin solid white edge lines.
Style/medium: realistic aerial road photography / high-quality realistic game environment, perfectly vertical orthographic camera, flat terrain with no perspective or horizon. Detailed asphalt aggregate, damp reflective sheen and subtle shallow rain patches on the asphalt, natural grass and small gravel verges, cloudy daylight, clear readable road geometry.
Composition: Entire square is ground; show both road edges and ample open grassy run-off outside the bend toward the upper right. Keep the road fully visible and unobstructed.
Constraints: NO vehicles, people, buildings, signs, UI, arrows, captions, letters, numbers, logos, watermark or baked trajectory lines. No trees or obstacles covering road or verges. Avoid deep flooding, photoreal perspective, extreme glare, dramatic lighting, mountains or city views.
```

## Implementation

`src/lab/art/escRoad.js` renders the photo, car and code-generated path/feedback overlays. `src/lab/core/escPath.js` holds normalized lane anchors calibrated against the road artwork. The sedan retains its aspect ratio and fits within 22 × 44 design pixels. The square background is contained inside the existing illustration area without stretching. These are qualitative teaching trajectories, not a vehicle-dynamics simulation.

`carFeatures.js` delegates only its skid view to this renderer. The central manifest loads the background and sedan only for that view. Both assets are released with other Lab textures when leaving the Lab. No scene IDs or content versions changed; existing progress remains valid.

Normal motion runs each comparison over 2.8 simulation seconds, then holds the final car position. Rapid state changes resolve the previous run and replace it. Reduced motion shows the final outcome immediately. Missing optional artwork uses a matching road diagram and car drawing; controls and worded feedback remain usable.

## Validation

Lint and typecheck pass, with three existing lint warnings. All 12 unit tests pass, including trajectory bounds and outcome separation. Production build passes with four existing content warnings and zero errors. Five browser checks pass: 360 × 640, 390 × 844 and 540 × 960; normal-motion animation and rapid switching; missing-road/car fallback. Normal checks report no asset failures or missing-texture warnings. Manual screenshot review refined the lane anchors and car size to keep the with-ESC car inside its lane.

Screenshots: [with ESC](screenshots/esc-with.png), [without ESC](screenshots/esc-without.png).

