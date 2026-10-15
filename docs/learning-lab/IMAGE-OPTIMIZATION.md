# Runtime image optimization

Original artwork remains unchanged under `public/assets`. The game loads generated WebPs under `public/optimized/assets`, using `src/generated/image-assets.json`. Texture keys and content IDs are unchanged. Production builds remove the original image copies from `dist/assets`; the repository retains them for future editing.

102 valid images: 106,434,969 bytes of original artwork become 6,314,590 bytes of runtime images (94% smaller). Combined theoretical RGBA bitmap storage drops from 416,939,324 to 140,927,248 bytes (66% smaller). These totals include unused and duplicate artwork; each scene continues to load only its relevant images. They are not measurements of browser peak memory or load time.

Large PNGs use quality 92 WebP with losslessly encoded alpha and stripped metadata. Images retain their aspect ratio. Animals use half their original dimensions to preserve animation pose scale. Portrait walking sets and scenery use a maximum dimension of 768 pixels, small top-down road users 384 pixels, and large illustration cards/roads 1024 pixels. The safe-passing card uses 768 pixels. Existing small WebPs are copied byte-for-byte, including the crash frames. Sprite frames and pedestrian ground anchors are transformed from the original coordinates to resized bitmap coordinates.

Run `npm run optimize:images` after adding or replacing source artwork, then rebuild. Generation requires Python Pillow and `cwebp` (`brew install webp`). Generated images are included in the repository so ordinary development/builds require neither encoder. Unchanged sources are cached. `npm test` checks source hashes, derivative presence and coordinate conversion.

The unused `priority-3/scenery/road-marker-post.png` is truncated and excluded from conversion. The registered road marker is the existing valid `assets/post.webp`.

Validation: lint (no errors; three pre-existing unused-variable warnings), typecheck, 15 unit tests, production build, and 41 browser checks covering scenes, animation, fallbacks, texture dimensions and optimized requests. Native decoding verified 102 outputs and transparency on all 97 transparent images. Production files were checked against the manifest. Review screenshots: `screenshots/optimized-city.png`, `screenshots/optimized-esc.png`, and `screenshots/optimized-traffic.png`. Detailed conversion totals and skipped files are in `image-optimization.json`.
