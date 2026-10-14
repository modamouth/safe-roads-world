# Uploaded artwork check — 14 October 2026

Inspected all 101 PNG/WebP images under `public/assets`. Of these, 100 fully decode; the newly supplied road-marker PNG is truncated. The Priority 1 folder contains 28 PNGs; Priority 2 contains ten PNGs; the subsequently uploaded Priority 3 folder contains 19 PNGs. All valid priority-folder images have real alpha transparency. Detailed dimensions, alpha ranges and visible bounds are recorded in [current-artwork-audit.json](current-artwork-audit.json).

## Newly available Priority 1 artwork

These files now fill the previously reported artwork gaps. All 28 are registered in the Learning Lab manifest and used by their corresponding renderers; see [Priority 1 integration](PRIORITY-1-INTEGRATION.md).

| Folder under `public/assets/learning-lab/priority-1` | Files | Existing scene to replace |
| --- | --- | --- |
| `child-booster` | `correct-booster.png`, `no-booster.png` | Child-seat belt/booster comparison (`childSeat`, view `belt`) |
| `adult-seatbelt` | `belted.png`, `unbelted-forward.png` | Vehicle-safety dummy comparison (`carFeatures`, view `belt`) |
| `vehicle` | `side-view-safety-features.png` | Vehicle-safety feature illustration (`carFeatures`) |
| `motorcycle-rider` | `everyday-clothes.png`, `full-protective-gear.png` | Motorcycle protection comparison (`riderGear`) |
| `helmet-test` | `no-helmet.png`, `motorcycle-helmet.png`, `bicycle-helmet.png` | Motorcycle and bicycle helmet tests (`headImpact`) |
| `pedestrians` | Six characters, each with `standing.png`, `walk-a.png`, `walk-b.png` | City pedestrian scenes (`cityDrive`) |

Pedestrian characters: older man, schoolgirl, shopper, teen with phone, vendor and worker. All six frame sets are complete.

The existing firm/loose child-seat and harness artwork remains available as `public/assets/childseat_{firm,loose,slack}.webp`.

## Priority 2 status

The workspace has the Nguni cow, grey donkey, fuel tanker, red sedan, minibus taxi, double-cab bakkie, cyclist, top-down pedestrian and cyclist/car passing illustration. These are already referenced by the current manifest. Other animal and scenery artwork remains available in the root assets folder as WebP files.

Valid top-down `blue-sedan.png` and `motorcycle-rider.png` replacements subsequently appeared in `priority-3/top-down/`. Both now replace their heavy-vehicle placeholders. The damaged original Downloads files remain untouched.

The new standing/leaping kudu, acacia, savanna bush, palm and street lamp are used from `priority-3/`. The corrected `grey-donkey-clean.png` replaces the earlier donkey texture. Other cow/donkey and top-down copies in that folder duplicate the existing artwork, so the game continues to load one source per texture.

`priority-3/scenery/road-marker-post.png` is truncated. The existing valid `public/assets/post.webp` remains in use. Detailed evidence is in [priority-3-upload-audit.json](priority-3-upload-audit.json).

## Alignment observations

Visual review confirms the new images match their intended subjects. Adult dummy, child booster and helmet sets use 1536 × 1024 canvases. Rider and pedestrian sets use 1024 × 1536 canvases. Equal canvas dimensions do not guarantee exact subject alignment: padding, ground level and subject positions vary between states. Integration should preserve one shared scale/origin and use subject anchors where needed, especially for walking frames and helmet fixtures. Some visible alpha bounds reach canvas edges; the originals have been preserved.

The original inventory check changed no runtime code or source artwork. Subsequent integration uses non-destructive texture frames and preserves all source PNGs.

The supplied side-view Namibian freight truck is now integrated into the braking-topic story card. See [freight truck integration and screenshot](FREIGHT-TRUCK.md).
