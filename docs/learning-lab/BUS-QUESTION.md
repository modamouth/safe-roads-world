# Open-door bus quiz artwork

The road-rules question “A bus has stopped and people are getting off” now shows the supplied open-door city bus instead of the pedestrian/taxi vignette. `Namibian City Bus with Open Door.png` was copied unchanged to `public/assets/learning-lab/priority-2/side-view/city-bus-open-door.png` and registered as `lab-city-bus-open-door` in the shared card manifest.

The PNG fully decodes at 2048 × 768, RGBA with alpha range 0–254. SHA-256: `738b6087624a1925ce4acf7587a323d45ca0ae8fa52d2fc5e2a2db89f6082477`.

The card preserves the full image and aspect ratio. Removing the unrelated taxi badge reserves the illustration area for the bus. Alt text now describes the stopped blue-and-white bus and its open passenger door. The question, options, correct answer, scene IDs and content version remain unchanged. The original pedestrian illustration remains the missing-image fallback.

Lint, typecheck, all 12 unit tests and production build pass with existing warnings unchanged. Four browser checks pass: the full quiz flow and image bounds at 360 × 640, 390 × 844 and 540 × 960, plus the missing-bus fallback. Normal checks report no asset failures.

[Review screenshot](screenshots/bus-question.png)
