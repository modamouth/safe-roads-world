# Night-time cow artwork

The current artwork is the user-supplied `nguni-cow.png`, copied without modification to `public/assets/learning-lab/priority-2/animals/nguni-cow.png`. It replaces the initially generated version; the generated original remains in its generation output directory. The supplied image is 1536 × 1024 RGBA with alpha ranging from 0 to 255 and visible bounds (48, 18)–(1505, 993). SHA-256: `c49e23a5332323489d714834170716d84f5b3f9c16868e1299428deefe18253e`.

The typed manifest loads it only for rural-road illustrations with a cattle hazard. The existing stopping-distance calculations, headlight tint and lane position remain. Failed cow stops now reach contact, play a brief vehicle-only impact cue, and remain stationary. Safe braking stops also remain stationary. Other animal hazards and sensitive-content previews retain the pause before contact. A source-aligned eye highlight is used beyond the headlights. The drawn cow remains the optional-asset fallback.

## Initial generated version prompt (superseded)

Use case: stylized-concept
Asset type: transparent animal sprite for the Safe Roads World mobile road-safety game.
Primary request: One realistic Nguni-type cow standing calmly, full body, clear side profile facing right, all four legs and hooves visible, tail, ears and gently curved horns. Distinctive natural brown-and-white mottled coat. Match polished realistic 3D game illustrations, detailed fur and convincing anatomy, recognizable at small mobile size.
Composition: single cow centered, horizontal composition, animal fills most of frame with small clear padding around horns, hooves and tail. Eye and head clearly visible on right. Feet aligned on a horizontal ground line.
Lighting: neutral soft light so the game can apply night-time tint and headlights in code; do not bake in darkness or eye glow.
Constraints: genuinely transparent background with alpha; no scenery, road, ground plane, people, vehicles, labels, text, watermark or cast shadow. No injury imagery.


## Validation

The initial integration passed typecheck, production build, five asset unit tests and three cow browser tests. The supplied PNG replacement was separately retested through every speed and both headlight states at 360 × 640, with no asset or browser errors. Browser tests exercise every speed in dipped-headlight mode and both headlight states at 360 × 640 and 540 × 960; missing cow artwork retains the drawn fallback. Normal tests have no asset 404s or missing-texture warnings. Lint passes with three existing warnings; the content checker retains four existing warnings.

[Preview of the night speed lesson](screenshots/night-cow.png).

## Cow impact and stopping

The former stopping preview resumed idle road movement after its result. The rural-road runner now has a terminal stopped phase, clamps the approach to the stopping/contact point and keeps current speed at zero. Collision feedback reports the calculated impact speed separately from the initial speed. The effect uses existing impact audio plus a short car jolt, camera shake and drawn spark cue; no animal injury is animated. Reduced motion skips the jolt/shake. Choosing another comparison clears the old effect and starts a fresh run.

Five cow browser tests pass, covering both mobile/design sizes, optional image failure, normal-motion impact cues, fixed world/image positions after collision and safe braking, reduced motion and the sensitive-content opt-out. Typecheck, lint, five unit tests and production build also pass. Existing lint/content warnings remain.

[Stopped after cow impact](screenshots/cow-impact-stopped.png).
