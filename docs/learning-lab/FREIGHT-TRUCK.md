# Freight truck story artwork

The heavy-vehicle braking topic's `setting` story now uses the supplied `Namibian Road Freight Truck.png` instead of its truck icon. Copied unchanged to `public/assets/learning-lab/priority-2/side-view/namibian-road-freight-truck.png`; the central manifest registers it as `lab-freight-truck-side` and loads it only for the card that needs it.

The complete PNG is 1672 × 941 with RGBA alpha 0–255. SHA-256: `8870fd0b7f9d1d5cd94f8e2a918fa36e2aaf51128597134a60faa42cd6ee7ff7`.

Contain scaling preserves the truck proportions. Highway/car symbols move to a separate row above the image so they do not cover the truck. The original icon is retained as the loading-failure fallback. The top-down junction scene keeps its own truck illustration; this side-view image is used only in the requested story card.

Lint, typecheck, all 10 unit tests and production build pass, retaining the existing lint/content warnings. Four browser checks pass: story rendering and progression at 360 × 640, 390 × 844 and 540 × 960, and missing-image fallback. Normal checks report no asset failures.

[Review screenshot](screenshots/freight-truck-story.png)
