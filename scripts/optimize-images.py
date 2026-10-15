#!/usr/bin/env python3
"""Generate runtime WebPs; never modify original artwork. Requires Pillow + cwebp."""
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / 'public'
OUT = PUBLIC / 'optimized'
encoder = shutil.which('cwebp')
if not encoder:
    raise SystemExit('Install cwebp (brew install webp) and Pillow (python3 -m pip install Pillow).')
manifest = ROOT / 'src/generated/image-assets.json'
previous = json.loads(manifest.read_text()) if manifest.exists() else {}
entries, skipped = {}, []
for source in sorted((PUBLIC / 'assets').rglob('*')):
    if source.suffix.lower() not in {'.png', '.webp', '.jpg', '.jpeg'}:
        continue
    path = source.relative_to(PUBLIC).as_posix()
    try:
        with Image.open(source) as im:
            im.load()
            width, height = im.size
    except (OSError, ValueError) as error:
        skipped.append({'path': path, 'reason': str(error)})
        continue
    # Existing WebPs are already small and used by calibrated crash animations.
    limit = max(width, height) if source.suffix == '.webp' else 1024
    if '/pedestrians/' in path or '/motorcycle-rider/' in path:
        limit = 768
    if '/top-down/' in path:
        limit = 768 if 'safe-pass' in path else 384
    if '/scenery/' in path:
        limit = 768
    if '/animals/' in path:
        # Standing/leaping poses share one resize factor to preserve their
        # relative scale when an animation swaps textures.
        limit = max(width, height) / 2
    ratio = min(1, limit / max(width, height))
    size = (max(1, round(width * ratio)), max(1, round(height * ratio)))
    destination = OUT / Path(path).with_suffix('.webp')
    destination.parent.mkdir(parents=True, exist_ok=True)
    digest = hashlib.sha256(source.read_bytes()).hexdigest()
    cached = previous.get(path, {})
    if cached.get('sha256') == digest and cached.get('runtimeWidth') == size[0] and cached.get('runtimeHeight') == size[1] and destination.exists():
        pass
    elif source.suffix == '.webp' and size == (width, height):
        shutil.copyfile(source, destination)
    else:
        subprocess.run([encoder, '-quiet', '-q', '92', '-alpha_q', '100', '-m', '6',
                        '-metadata', 'none', '-resize', *map(str, size), str(source), '-o', str(destination)], check=True)
    with Image.open(destination) as result:
        result.load()
        assert result.size == size
        # Alpha is losslessly encoded after resizing, including transparent edges.
        if 'A' in result.getbands():
            assert result.getchannel('A').getextrema()[0] == 0
    entries[path] = {'url': destination.relative_to(PUBLIC).as_posix(),
                     'width': width, 'height': height, 'runtimeWidth': size[0], 'runtimeHeight': size[1],
                     'sourceBytes': source.stat().st_size, 'runtimeBytes': destination.stat().st_size,
                     'sha256': digest}
manifest = ROOT / 'src/generated/image-assets.json'
manifest.parent.mkdir(parents=True, exist_ok=True)
manifest.write_text(json.dumps(entries, indent=2) + '\n')
report = {'images': len(entries), 'sourceBytes': sum(e['sourceBytes'] for e in entries.values()),
          'runtimeBytes': sum(e['runtimeBytes'] for e in entries.values()),
          'sourceDecodedBytes': sum(e['width'] * e['height'] * 4 for e in entries.values()),
          'runtimeDecodedBytes': sum(e['runtimeWidth'] * e['runtimeHeight'] * 4 for e in entries.values()),
          'skipped': skipped}
(ROOT / 'docs/learning-lab/image-optimization.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))
