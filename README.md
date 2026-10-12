# Safe Roads World (prototype)

PromoPlays' Safe Roads World prototype. A world shell (Title screen and
Mission Map) leads to two places:

- **Windhoek City: City Safety Run**: a placeholder screen for now. The
  mission itself is a separate task.
- **Road Safety Learning Lab**: a menu of Lab experiences. One exists today,
  the Speed check: a prediction question, a pseudo-3D drive down the B1 at
  dusk, a kudu-swerve into an oncoming vehicle, a crash-lab replay at
  60/80/90 km/h, an animated risk chart, and the Passport screen.

Flow: `Boot → Title → Map → CityRunStub` or `Map → LabMenu → Predict → Drive → Lab → Reveal → Passport`.

Built with [Phaser 3](https://phaser.io/) and [Vite](https://vitejs.dev/).
No build step is required to edit copy, tuning numbers, or images — only to
preview or ship.

## Open in VS Code

1. Install [Node.js](https://nodejs.org/) 18 or later if you don't have it.
2. Open this folder in VS Code (`File → Open Folder…`).
3. Open a terminal in VS Code (`` Ctrl+` ``) and run:

   ```bash
   npm install
   npm run dev
   ```

4. Vite prints a local URL (usually `http://localhost:5173`) and opens it in
   your browser automatically. Edit any file in `src/` and the page
   hot-reloads.

To produce a static build you can deploy anywhere (Cloudflare Pages, same as
your other PromoPlays games):

```bash
npm run build      # outputs to dist/
npm run preview    # serve the production build locally, to sanity-check it
```

`dist/` is a plain static site — drag it into Cloudflare Pages, or point any
static host at it.

## Project layout

```
index.html              Page shell, loads src/main.js
src/
  main.js                Phaser game config + scene list
  config.js              All tunable content: copy, figures, speeds, severity,
                         layout constants, shared session state (incl. points)
  zones.js               Mission Map registry: one entry per zone node
  experiences.js         Learning Lab registry: one entry per Lab experience
  icons.js               Icons drawn in code (map, lab, lock, taxi, ...)
  worldArt.js            Optional Title/Map art slots + their drawn placeholders
  sfx.js                 Synthesised sound (Web Audio API, no audio files)
  ui.js                  Shared UI: buttons, icon buttons, panels, toasts,
                         captions, debris particles
  textures.js            Drawn fallback art + canvas-generated gradients/grain
  scenes/
    Boot.js              Loads photo assets (+ optional art), builds placeholders
    Title.js             Logo, Start Journey, How to play overlay
    Map.js               Mission Map: zone nodes, road path, bottom card, nav
    CityRunStub.js       Placeholder for City Safety Run
    LabMenu.js           Learning Lab menu, built from experiences.js
    Predict.js           Speed: "Before we begin" prediction gate
    Drive.js             Speed: accelerate, kudu, swerve, oncoming impact
    Lab.js               Speed: crash-lab replay (real photos, or drawn fallback)
    Reveal.js            Speed: answer reveal + animated risk chart
    Passport.js          Badge + Passport stub (WhatsApp save is a no-op)
public/
  assets/                9 WebP images (road scene + crash lab), ~335 KB total,
                         plus the optional art slots below if supplied
```

## Adding a zone to the Mission Map

1. Add an entry to `ZONES` in `src/zones.js`: `id`, `label`, `icon` (a name
   from `src/icons.js`, or add a new case there), `x`/`y` as 0..1 fractions of
   the full 540x960 map, and `status`.
2. A `locked` zone only needs those fields. Tapping it shows
   "<label>: coming soon". Don't mark a zone `playable` until its content
   exists.
3. A `playable` zone also needs `scene` (the Phaser scene key its button
   starts), `tag`, `blurb`, `cta: { title, button }` and a `labelSide`
   (`'above'`, `'below'` or `'right'`) chosen so its label doesn't overlap
   nearby nodes. Register the scene in `src/main.js`.
4. The order of `ZONES` is the order of the dotted road. Set `onMap: false` to
   keep a zone in the registry without drawing it (School Safety is parked
   this way).

To add a Learning Lab experience, add an entry to `EXPERIENCES` in
`src/experiences.js`. Placeholders use `status: 'locked'` and show "Coming
soon". A playable one needs `status: 'playable'`, a `scene`, `minutes` and a
`reset()` that clears its session state. All entries appear in the `LabMenu`
grid (2 columns). The Map's Lab card shows the first three, then a "More" chip.

## Pedestrian safety (Learning Lab)

Lab → Pedestrian opens an intro (`ExperienceIntro`) with two perspectives.
Each one starts with a "Before we begin" prediction (`Prediction`). All the
copy, questions and tuning live in `src/experiences.js`.

- **Driving** (`StopDistance` → `StopReveal`): pick 30/40/50 km/h. A pedestrian
  steps out 25 m ahead and the car brakes after the driver's reaction time.
  The physics is in `src/stopping.js`. If the car can't stop in time, the
  scene freezes before contact and shows the impact speed; no collision is
  animated. **Placeholders:** `reactionS` (1.5 s) and `decel` (7 m/s²) need
  validating, and they set every number shown.
- **Walking** (`WalkCross` → `WalkReveal`): a top-down street with left-hand
  traffic. Pick where to stand (beside a van, at its outer edge, or on a
  clear stretch), then choose Cross or Wait as a car approaches at 50 km/h.
  Shading and the car's visibility come from real sight lines past the parked
  vehicles. The lesson wording on the results screen needs validating.
  After all three spots, three screens follow (`WalkReveal`): the prediction
  answer, a chance-of-death chart with a low-light tip, and "Always remember".
  The answer (2x) and the chart figures (40% at 40 km/h, 90% at 50 km/h) are
  in `reveal` / `predict` and still need a cited source (`sourceRef`).
- The Driving question still has `answer: null`. Its reveal shows the
  distance calculated from the placeholder physics.

Parked vehicles on the driving street are `public/assets/veh_*.webp` (taxi
minibus, two sedans, bakkie, box truck), listed in `PARKED_VEHICLES` in
`src/worldArt.js`. They are straight-on rear views, drawn at each vehicle's
real width. The same images suit cars driving ahead in your lane. Oncoming
traffic needs front views, and the Walking street needs top-down views.

The skyline in the driving scene is `public/assets/city_backdrop.webp` (a crop
of the Windhoek street art). Without it, the drawn dusk sky is used.

## Art slots (optional)

Title and Map work without any art files. If these files exist in
`public/assets/`, they replace the drawn placeholders. No code change is needed.

| File | Used on | Expected size / aspect | Placeholder if missing |
|---|---|---|---|
| `title_bg.webp` | Title background | 1080x1920 (9:16), portrait, no logo/buttons | `map_bg.webp` if present, else sky photo + drawn hills and road |
| `map_bg.webp` | Mission Map + City Safety Run backgrounds (and Title, until `title_bg` exists) | 1080x1920 (9:16), portrait | Drawn savanna ground, hills, riverbed, bush |
| `hero_passport.webp` | Title hero (520 px tall) | Transparent WebP, full body, trimmed to the figure, at least 1100 px tall | Drawn figure holding a Passport |
| `hero_wave.webp` | How to play overlay (190 px tall) | Transparent WebP, full body, trimmed to the figure | `hero_passport.webp` if present, else drawn waving figure |

Currently supplied: `map_bg.webp` (941x1672, 391 KB) and `hero_passport.webp`
(620x1100, 119 KB, trimmed from the 1024x1536 character render).

- Backgrounds are scaled to *cover* 540x960 and centred, so a different aspect
  ratio gets cropped. Keep `map_bg` at 9:16, or the nodes (placed as fractions
  of the screen) will drift off the landmarks you painted.
- When `map_bg.webp` is present, the Map does not draw its dotted road. The
  painted road in the art is the path, so the art should include a road that
  passes the node positions in `src/zones.js`.
- Heroes are scaled to a fixed height (Title 520 px, overlay 190 px) and
  anchored bottom-centre.
- These files are loaded separately from the nine photo assets, so a missing
  one never switches the game to drawn art. Phaser logs a
  `Failed to process file` console error for each missing slot. That is
  expected.

Photo assets are loaded by URL from `public/assets/`, not embedded in the
code — replace a file there and reload to swap an image, no rebuild needed.
If any of the nine images fail to load (missing file, bad network), the game
falls back automatically to the drawn vector art and keeps working.

## A note on `npm audit`

`npm audit` will flag a moderate/high advisory in Vite's bundled `esbuild`
(dev-server only — a malicious website could probe `localhost` while
`npm run dev` is running; it does not affect `npm run build` output). Fixing
it fully means moving to Vite 7, which I haven't verified against this
project. If that matters for your environment, test a Vite 7 upgrade in a
branch before relying on it.

## What to edit first

- **`src/config.js`** — `DATA.risk` holds the 9% / 37% / 90% figures, which
  are **placeholders**. Replace with sourced local data before this goes in
  front of real players, and add a source credit on the Reveal screen.
  `SEV` tunes how hard each speed hits (shake, debris, crush). `EDGE_COLOR`
  sets the road edge-line colour (currently yellow).
- **`public/assets/`** — swap any of the nine WebP files for your own art.
  Keep the SUV/truck/post roughly matching their current pixel dimensions
  (see the filenames) or adjust the scale constants in `Drive.js` / `Lab.js`.
- **`src/config.js` → `track()`** — wire this to your analytics endpoint
  (Supabase, n8n, etc.) for the pilot. It currently just logs to the console.
- **Passport save button** (`src/scenes/Passport.js`) — currently a stub
  that shows a toast. Replace with your WhatsApp save flow.

## Known rough edges

- The Passport screen doesn't persist anything between sessions.
- City Safety Run is a placeholder screen. The only playable content is the
  Speed experience in the Learning Lab.
- Session points (`state.points`) start at 0, and nothing awards points yet.
  The Map's points chip will show them once a mission or experience adds to
  `state.points`.
- The Badges tab shows "Coming soon".
- The fixed 540x960 design space scales down on small phones: at 360 px wide,
  everything is about two-thirds size.
- On a resize or rotation mid-scene, the camera re-centres, but image
  backgrounds keep the size they were given when the scene started. They
  refit on the next scene.

## Screen sizes (no letterbox bars)

The game uses Phaser's `Scale.EXPAND`. All layout is in a 540x960 design
space that is always fully visible and centred. Taller phones (and wide
desktop windows) show extra world around it instead of empty bars. When you
build a scene:

- Call `setupCam(this)` first. It also re-centres the camera on resize.
- Make backgrounds cover `viewBounds(this)` rather than `0..W x 0..H`. Use
  `duskBg(this)` for the standard gradient, `fillView(this, color)` for a
  solid fill, or `cover(this, key, depth, viewBounds(this))` for free-standing
  art.
- Keep buttons and text inside 540x960. Only backgrounds, bars and road or
  street drawing should reach into the extra space.
- Art that other things are positioned against (the Map's zone nodes) stays
  on the design area; a softened copy behind it fills the rest.
- Tested headlessly and in-browser during development, but give it a pass on
  your actual target devices (low-end Android, slow connections) before any
  pilot.
