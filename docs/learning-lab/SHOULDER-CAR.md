# Road-rules shoulder car

The small drawn car in the road-rules shoulder question now uses the existing top-down blue sedan (`lab-td-blue-sedan`). The sedan is loaded lazily for shoulder and hump diagrams. Its aspect ratio is preserved within the original 22 × 40 design-pixel vehicle bounds, keeping it centred in the left traffic lane and out of the shoulder. Road markings, treatment labels and quiz grading remain unchanged. A loading failure retains the original drawn car.

Changed files: `src/lab/art/roadTreatment.js`, `src/lab/assets.js`, the shoulder illustration alt text in `content/learning-lab/road-rules/en.json`, and `e2e/shoulder-car.spec.js`.

Lint, typecheck, all 10 unit tests and production build pass with existing lint/content warnings unchanged. Four browser checks pass: the complete quiz flow and car geometry at 360 × 640, 390 × 844 and 540 × 960, plus the missing-car fallback. Normal checks report no asset failures.

[Review screenshot](screenshots/shoulder-car.png)
