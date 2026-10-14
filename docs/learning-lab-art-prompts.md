# Learning Lab: image prompts for OpenAI

Copy-paste prompts for the artwork listed in `learning-lab-artwork-needed.md`.

## How to use

1. **Settings:** API `gpt-image-1` with `background: "transparent"`, `output_format: "png"`, `quality: "high"`, size `1536x1024` (landscape) or `1024x1536` (portrait) as noted. In ChatGPT, ask for a transparent PNG.
2. **One image per request.** Paste the **style block** at the end of every prompt.
3. **States (loose/firm, with/without):** generate the first image, then use **image edit** on it with the edit prompt. Don't generate the second state from scratch, or it won't line up.
4. If a result comes back at the wrong angle, add: *"Exact [side / top-down / front] view, no perspective, no three-quarter angle."*

**Style block (append to every prompt):**
```
Semi-realistic 3D game-art style, soft even daylight, clean and crisp, matching
a modern mobile game. Isolated on a fully transparent background. No ground, no
shadow, no glow, no halo, no text, no labels, no logos, no number plates.
Whole subject in frame, centred, filling about 85% of the image.
```

**Edit prompt (for every second state):**
```
Keep this image identical in every way: same object, same angle, same size,
same position, same lighting, same transparent background. Only change: [STATE].
```

---

## Priority 1

### 1. Child car seat: loose / firm (landscape)
```
Exact side view of the rear seat of a car, cut away so only the seat cushion,
seat back and seatbelt are visible. A forward-facing child car seat is fitted on
it, with a small child-sized crash-test dummy (yellow and black, no face details)
strapped in with a five-point harness. The car seat sits firmly upright against
the seat back. Facing right.
```
Edit: `the child car seat is fitted loosely and has tipped forward about 20 degrees away from the seat back, as in a sudden stop. The dummy leans forward with it.`

### 2. Child in harness: snug / loose straps (landscape)
Use image 1 (firm) as the base and edit:
- Snug: `the harness straps are pulled snug against the dummy's shoulders and hips.`
- Loose: `the harness straps are slack and loose; the dummy has slid forward and down in the seat, partly out of the straps.`

### 3. Child on the back seat with an adult belt: no booster / booster (landscape)
```
Exact side view of the rear seat of a car, cut away. A child-sized crash-test
dummy (yellow and black, no face details) sits directly on the seat wearing the
car's adult lap-and-sash seatbelt. Because the child is small, the sash crosses
the neck and the lap belt crosses the soft belly; the knees don't bend at the
seat edge. Facing right.
```
Edit: `the dummy now sits on a black booster cushion, raised up, so the sash crosses the middle of the shoulder and the lap belt sits low across the hips and the tops of the thighs; the knees bend over the seat edge.`

### 4. Adult dummy: belted / unbelted (landscape)
```
Exact side view of a car's front seat, cut away, with an adult crash-test dummy
(yellow and black, no face details) seated and wearing a lap-and-sash seatbelt,
held upright in the seat. A simple dashboard and steering wheel in front. Facing right.
```
Edit: `no seatbelt; the dummy is thrown forward out of the seat towards the dashboard and steering wheel, as in a sudden stop.`

### 5. Car for safety features (landscape)
```
Exact side view of a white compact hatchback, facing right, perfectly level,
no perspective. Clean body, clear windows so the seats and a steering wheel are
faintly visible inside.
```
(No states: the game draws the highlights.)

### 6. Motorcycle rider: everyday / full gear (portrait 1024x1536)
```
Exact front view of a young Namibian adult man standing straight, arms slightly
away from the body, wearing everyday clothes for a hot day: T-shirt, shorts and
slip-on sandals (slops). No helmet. Friendly neutral expression.
```
Edit: `now wearing full motorcycle protective gear: a full-face helmet with the visor up, an armoured riding jacket with a reflective yellow strip, gloves, tough long riding trousers and ankle-high riding boots.`

### 7. Head-form drop test: no helmet / motorcycle / bicycle helmet (landscape)
```
Exact side view of a plain laboratory test head form (smooth, featureless,
pale grey, like a mannequin head with no face details) mounted above a flat
steel test anvil block, as used in helmet impact testing. Facing right.
```
Edits:
- `the head form now wears a full-face motorcycle helmet with the visor down.`
- `the head form now wears a vented bicycle helmet with the strap fastened.`

### 8. Pedestrians (portrait 1024x1536, one person per image)
Generate each separately:
```
Full-body [rear view / three-quarter rear view] of [PERSON], standing, as seen
from a car driving behind them on a city street. Namibian, everyday clothes.
```
People: `a schoolgirl in a navy school uniform with a backpack`, `a man in blue workwear overalls`, `a woman carrying shopping bags`, `an older man with a walking stick`, `a street vendor woman carrying a basket`, `a teenage boy in a hoodie looking at his phone`.

Walking frames: generate a side view `walking to the right, left foot forward`, then edit: `same person mid-stride with the right foot forward.`

---

## Priority 2

### 9. Kudu bull: standing / leaping (landscape)
```
Exact side view of a greater kudu bull, facing right, standing, with long
spiral horns and white body stripes, natural Namibian colouring.
```
Edit: `the kudu is now mid-leap to the right, all four legs off the ground.`

### 10. Cattle and donkey (landscape, one each)
```
Exact side view of a [Nguni-type cow with a brown and white patterned coat /
grey donkey], facing right, standing still.
```

### 11. Roadside scenery (portrait, one object per image)
```
Front view of a single [umbrella thorn acacia tree / low dry savanna bush /
tall palm tree / modern single-arm street lamp / white road marker post with a
red reflector], as seen from the side of a road.
```

### 12. Top-down vehicles (portrait, one per image)
```
Exactly top-down view, camera directly overhead, of a [VEHICLE], pointing up
the image. Perfectly symmetrical, no perspective, no side visible.
```
Vehicles: `white fuel tanker truck with cab and trailer`, `red family sedan`, `blue family sedan`, `white minibus taxi with a blue stripe`, `sand-coloured double-cab bakkie`, `motorbike with a rider wearing a helmet`, `cyclist on a bicycle wearing a helmet`, `person walking`.

---

## Priority 3

### 14. Flooded low-water crossing (landscape)
```
Exact side view (cross-section) of a dirt road dipping down through a dry
sandy riverbed and back up the other bank, Namibian bush landscape behind,
cloudy sky after rain. A white car waits on the left bank facing right.
No water in the riverbed.
```

### 15. Road treatments, top-down (portrait, with / without pairs)
Base:
```
Exactly top-down view of a straight two-lane tarred road with white edge lines
and a broken centre line, sandy verges either side.
```
Edits, one at a time: `add raised rumble strips along the centre line`, `add a zebra crossing with a raised pedestrian refuge island in the middle`, `add street lights along both verges`, `add a tall wildlife fence along both verges`.
Roundabout: a separate base of `a four-way crossroads`, then edit `replace the crossroads with a single-lane roundabout`.

### 16. B1 route map (portrait)
```
Illustrated stylised map strip of central and northern Namibia, viewed from
above, with one highway running from the bottom to the top through dry bush and
farmland, small town clusters at five points along it, and a small roadside
lay-by. No labels, no text.
```

### 17. Traffic light (portrait)
```
Front view of a single three-lamp traffic light on a short pole, all lamps off.
```
Edits: `the red lamp is lit`, `the yellow lamp is lit`, `the green lamp is lit`.

### 18. Spot illustrations (square 1024x1024)
```
Small spot illustration of [a beer bottle beside a car key / a packet of
tablets beside a car key / a phone in a dashboard holder / a steering wheel].
```
