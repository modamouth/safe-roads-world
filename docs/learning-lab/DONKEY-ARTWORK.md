# Supplied grey donkey

The supplied `African Grey Donkey Side Profile.png` is copied unchanged to `public/assets/learning-lab/priority-2/animals/grey-donkey.png`. It is a complete 1536 × 1024 RGBA PNG with genuinely transparent background (alpha 0–254). The original `public/assets/scn_donkey.webp` remains intact.

The existing `scn_donkey` texture key now loads the supplied PNG through the typed manifest. A non-destructive Phaser texture frame omits empty padding so the full donkey retains its existing scenery/hazard scale and ground anchor. The image itself is not stretched or cropped on disk. Existing roadside placement, flipping, perspective, lighting and fallback drawings remain. The single visible eye uses a source-aligned highlight for night hazards.

Typecheck, lint, five asset unit tests and the production build pass. The existing artwork browser smoke test also passes at 360 × 640, including the rural-road scenes, with no asset 404s or missing-texture warnings. Lint retains three existing warnings; content validation retains four existing warnings.

A subsequent upload supplies `priority-3/animals/grey-donkey-clean.png`. The manifest now prefers that complete transparent version under the same texture key and frame bounds. The earlier PNG remains preserved.
