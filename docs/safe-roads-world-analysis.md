# Safe Roads World — Product, Design and Technical Analysis

**Prepared for:** PromoPlays product, design and engineering leads
**Date:** 11 October 2026
**Status:** Analysis only. No application code was changed.

Companion documents:

- [safe-roads-world-feature-matrix.md](safe-roads-world-feature-matrix.md): every proposed feature, classified and justified
- [safe-roads-world-architecture.md](safe-roads-world-architecture.md): recommended system architecture

**How to read the labels in this document**

| Label | Meaning |
|---|---|
| **[Confirmed]** | Directly observed in files in this workspace (with file/line reference) |
| **[Context]** | Observed in a sibling PromoPlays folder outside this workspace (`../promoplays-sdk`, `../pothole-dodger`) |
| **[Brief]** | Stated in the PromoPlays concept brief, not present in the workspace |
| **[Assumption]** | Inferred by the author; needs confirmation |
| **[Validate]** | A factual Namibian road-safety, legal or data claim that must be checked by a qualified local specialist before use with players |

---

## 1. Executive summary

Safe Roads World is a strong, fundable idea. Its strength is that it combines a reusable campaign platform with locally grounded road-safety content. A game alone would not be enough. Today the concept is far ahead of the product. The workspace contains one roughly 3-minute **interactive explainer** about speed and crash severity on the B1. It is well crafted, but:

1. **It is not the mission the brief names as the MVP.** The code is a B1 Highway speed mission. The brief's MVP is *Windhoek City: City Safety Run*. Nothing of the City Safety Run exists yet.
2. **It is barely a game.** The player makes one meaningful choice (60, 80 or 90 km/h). After that, the swerve and the head-on crash are scripted and unavoidable at every speed ([Drive.js:183-184](../src/scenes/Drive.js#L183-L184)).
3. **Its central lesson is weaker than it could be.** The hazard is placed at a distance proportional to speed ([Drive.js:107](../src/scenes/Drive.js#L107)), so the time to react is identical at every speed. This removes the most important real-world effect of speed: at lower speed you can often stop in time and avoid the crash altogether.
4. **Its key statistics are placeholders** ([config.js:5-13](../src/config.js#L5-L13)), and it shows a swerve into oncoming traffic without saying whether that is the right response to a large animal.
5. **Its emotional register conflicts with the brief.** The brief asks for "positive, adventurous". The prototype uses a crash sequence with debris, camera shake, flash and a closing guilt line: "Who would be waiting for you at home?" ([config.js:25](../src/config.js#L25)).

The platform vision (eight zones, a world map, Passport, leaderboards, sponsors, WhatsApp, rewards, analytics) is about 10–20 times larger than what a small team can build and validate in a first pilot. Most of it should wait until one mission has shown that people finish it, learn something measurable from it, and come back.

**Recommendation in one paragraph.** Run a single sponsored pilot campaign for **adults aged 18–35 (new and young drivers, and their passengers)**, entered by QR code. It should have **two short missions**:

- a re-scoped **City Safety Run**: speed zones, hazard perception and phone distraction, roughly 2–3 minutes;
- a reworked **Speed Lab**: the existing prototype, fixed so that speed changes whether you crash, not only how badly.

These sit inside a minimal **Road Hero HQ**: a Passport with two badges, a pre/post knowledge check, an anonymous-by-default profile, a WhatsApp opt-in to save progress, and one prize draw that does not depend on rank. Build the missions as engines on the existing **`@promoplays/sdk`** (TypeScript, Phaser 3.90, campaign JSON) **[Context]**. Build the HQ as a light static PWA, and the backend as a small API whose main jobs are events, progress and campaign configuration. Exclude schools and under-18s from the first pilot. Plan a separate, no-personal-data schools mode for Phase 2. Before any public play, get the content checked by a Namibian road-safety authority.

---

## 2. Current workspace findings

### 2.1 What exists

| Area | Finding | Evidence |
|---|---|---|
| Project | Single Vite + Phaser 3 project, plain ES modules, no TypeScript | [package.json](../package.json): `phaser ^3.80.1`, `vite ^5.4.21` |
| Version control | **Not a git repository** | Environment check; no `.git` folder |
| Dependencies | Not installed (`node_modules` absent); not built or run during this analysis | — |
| Code size | ~1,100 lines across 10 JS files | `src/` |
| Mission | One: "Speed mission", B1 Highway at dusk | [README.md:1-6](../README.md#L1-L6) |
| Scenes | `Boot → Predict → Drive → Lab → Reveal → Passport` | [main.js:18](../src/main.js#L18) |
| Assets | 9 WebP images (~335 KB): SUV, pickup, road post, sky, crash-lab background, 4 crash-lab car states | `public/assets/` |
| Audio | Fully synthesised with Web Audio; no audio files | [sfx.js](../src/sfx.js) |
| Fallback art | Every photo has drawn vector art to fall back on; any single load failure switches the whole game to drawn art | [Boot.js:26-33](../src/scenes/Boot.js#L26-L33), [textures.js](../src/textures.js) |
| Configuration | Copy, figures, severity, colours and layout are centralised | [config.js](../src/config.js) |
| Analytics | `track()` pushes to an in-memory array and `console.debug`. Nothing is sent. No session or device ID | [config.js:58-65](../src/config.js#L58-L65) |
| Passport | Static mock: hard-coded zone tiles ("Taxi Rank — Next up"), no persistence | [Passport.js:36-41](../src/scenes/Passport.js#L36-L41) |
| WhatsApp | Stub button that shows a toast | [Passport.js:52-56](../src/scenes/Passport.js#L52-L56) |
| Backend / API | None | — |
| Data models | None beyond a module-level `state` object | [config.js:59](../src/config.js#L59) |
| Docs / concept notes / presentations | Only `README.md`. No concept deck, design document or brand guide in the workspace | — |
| Tests, lint, CI, Docker | None. `.vscode/extensions.json` recommends ESLint/Prettier, but there is no config for either | — |
| Deployment | Static build for Cloudflare Pages, "same as your other PromoPlays games" | [README.md:27-36](../README.md#L27-L36) |
| Known security note | Vite 5 dev-server `esbuild` advisory (dev only) | [README.md:65-72](../README.md#L65-L72) |

### 2.2 How the current mission plays (confirmed from code)

1. **Predict** ([Predict.js](../src/scenes/Predict.js)): the player is asked "What's the chance of a life-threatening injury in a head-on crash at 90 km/h?" and chooses from six percentage buttons. This prediction step is a good learning-design pattern. Keep it.
2. **Drive** ([Drive.js](../src/scenes/Drive.js)): the player taps 60, 80 or 90. The car accelerates for 1.4 s. A kudu crosses, the car **swerves automatically** into the oncoming lane ([Drive.js:117-122](../src/scenes/Drive.js#L117-L122)), and an oncoming pickup hits it head-on ([Drive.js:124-158](../src/scenes/Drive.js#L124-L158)). The player has no input during the event.
3. **Lab** ([Lab.js](../src/scenes/Lab.js)): crash-lab replay. The player must crash-test all three speeds before "Reveal" unlocks ([Lab.js:97](../src/scenes/Lab.js#L97)).
4. **Reveal** ([Reveal.js](../src/scenes/Reveal.js)): right or wrong, followed by an animated risk curve 0→9%→37%→90%.
5. **Passport** ([Passport.js](../src/scenes/Passport.js)): a badge animation, mock zone tiles, a WhatsApp stub and "Play again".

Session length is about 2–3 minutes. Replay value is close to zero, because the outcome is identical every time.

### 2.3 Technical observations

| # | Observation | Evidence | Impact |
|---|---|---|---|
| T1 | **Hazard timing is normalised to speed.** `kuduZ = vp * 3.2` and `oncZ = (vp + VO) * 3.05 + IMPACT_Z`, so time-to-hazard is the same at 60, 80 and 90 | [Drive.js:107-108](../src/scenes/Drive.js#L107-L108) | Removes the stopping-distance lesson; see §8 |
| T2 | The swerve and the crash are unconditional | [Drive.js:183-184](../src/scenes/Drive.js#L183-L184) | No agency, no replay value, fatalistic message |
| T3 | Reveal copy is hard-coded and not derived from `DATA`: "1 in 11 to 9 in 10", "At 90 km/h" | [Reveal.js:19](../src/scenes/Reveal.js#L19), [Reveal.js:23](../src/scenes/Reveal.js#L23) | Replacing the placeholder figures in `config.js` will leave the copy wrong |
| T4 | Risk figures are labelled placeholders, and the on-screen disclaimer says "illustrative" | [config.js:5-13](../src/config.js#L5-L13), [Reveal.js:60](../src/scenes/Reveal.js#L60) | Cannot go to the public as-is |
| T5 | Edge-line colour carries the comment "Yellow, as far as I know, on SA/Namibian roads" | [config.js:40](../src/config.js#L40) | Small, but a good example of unvalidated local detail |
| T6 | The road is redrawn every frame as about 158 horizontal strips × up to 6 `fillRect`s with a `Graphics` object, on a canvas rendered at 810×1440 (`W*Z`, `H*Z`) | [Drive.js:203-222](../src/scenes/Drive.js#L203-L222), [config.js:29-30](../src/config.js#L29-L30) | A likely frame-rate risk on low-end Android, because Phaser `Graphics` re-tessellates each frame. Must be measured on target devices |
| T7 | `ui.js` uses the global `Phaser` without importing it | [ui.js:84](../src/ui.js#L84) | Works only because Phaser assigns `window.Phaser` as a side effect. Fragile in a TypeScript or module refactor |
| T8 | Shared mutable `state` is a module singleton, reset manually on replay | [config.js:59](../src/config.js#L59), [Passport.js:57-60](../src/scenes/Passport.js#L57-L60) | Fine for one mission; does not scale to many missions |
| T9 | Input is pointer only, and buttons are canvas zones | [ui.js:16-46](../src/ui.js#L16-L46) | No keyboard or screen-reader access |
| T10 | Respects `prefers-reduced-motion` for shake and flash | [config.js:55-56](../src/config.js#L55-L56), [Drive.js:131-132](../src/scenes/Drive.js#L131-L132) | Good practice; keep it |
| T11 | Graceful asset fallback | [Boot.js:24-33](../src/scenes/Boot.js#L24-L33) | Good weak-network behaviour; keep the pattern |
| T12 | No PWA manifest, service worker or offline caching | [index.html](../index.html) | First load needs a network connection; there is no repeat-visit caching strategy |
| T13 | Phaser version split across PromoPlays projects: this project 3.80, `promoplays-sdk` 3.90, `pothole-dodger` Phaser 4 | [package.json](../package.json); [Context] | Standardise before building shared code |

### 2.4 Asset observations

- The crash-lab car images show a photorealistic white compact SUV with crash-test dummies and progressive front-end damage. The oncoming vehicle is a dark, photorealistic double-cab pickup. The README calls these "real crash-test photos" ([README.md:4-5](../README.md#L4-L5)). **Their source and licence are not recorded anywhere in the workspace.** They may be stock photos, AI-generated images or third-party crash-test imagery. The vehicles also closely resemble real production models. Before public use, confirm the licence and make sure no manufacturer's vehicle is shown being destroyed without permission.
- There is no Namibian visual identity yet beyond the acacia, kudu and dusk palette ([textures.js:50-77](../src/textures.js#L50-L77)). There is no brand guide, logo, Road Hero character or world-map art.

### 2.5 Related PromoPlays code (outside this workspace) [Context]

`../promoplays-sdk` is a TypeScript monorepo (`packages/sdk`, `engines/maze`, `campaigns/*`, `apps/game-preview`) on Phaser 3.90 + Vite. It applies a clear rule: *"campaign config → engine → SDK → Phaser"* ([../promoplays-sdk/docs/ARCHITECTURE.md](../../promoplays-sdk/docs/ARCHITECTURE.md)). It already has:

- campaign JSON validation;
- theme, asset, audio, animation and particle managers;
- a typed event bus;
- 11 UI components with a 44 px minimum touch target;
- seeded RNG and pure, tested gameplay logic.

Its own "next milestone" lists *"a second reference engine to prove the SDK's engine-agnostic claims"*, *"analytics event adapters"* and *"campaign JSON served from an API"*. That is exactly the gap Safe Roads World needs filled. Its `ScoreManager` is trivial, and `PromoPlayEvents` has no concept of a player, a mission or learning outcomes ([../promoplays-sdk/packages/sdk/src/types.ts](../../promoplays-sdk/packages/sdk/src/types.ts)).

**Conclusion:** the Safe Roads prototype is a useful **content and feel prototype**. It should not be the codebase that becomes the platform. The SDK is the better foundation.

---

## 3. Product definition

### 3.1 What is it?

It is a combination of three things. Being clear about which layer is which prevents scope confusion:

| Layer | What it is | Who it serves |
|---|---|---|
| **Missions** | Short, standalone road-safety mini-games | Players |
| **Safe Roads World** (HQ, Passport, zones) | A thin progression layer that links missions into a journey and gives a reason to return | Players, and campaigns that want repeat engagement |
| **Campaign system** | Configuration, branding, QR entry, rewards, follow-up and reporting | Sponsors, authorities, schools, employers, event organisers |

The commercial product is the **campaign system**. The player-facing product is the **missions**. The **world** connects the two. It is valuable only if it drives return visits and makes many sponsors' campaigns feel like one coherent universe. If it does neither, it is decoration.

### 3.2 Recommended one-sentence definition

> **Safe Roads World is a series of short, Namibian road-safety missions played on a phone, where every mission completed earns progress in a shared Road Hero Passport, and partners run campaigns through it to teach and measure safer road behaviour.**

A shorter tagline for marketing: *"Play the road. Learn the risks. Become a Road Hero."*

The brief's positioning line ("transforms education into missions, safe behaviour into progress, and communities into Road Heroes") works as a manifesto. It does not work as a definition, because "safe behaviour into progress" implies the product observes real-world behaviour. It does not, and claims of that kind invite scrutiny from authorities and sponsors.

### 3.3 Distinctiveness

- Locally grounded: Namibian roads, wildlife, taxis, gravel and coastal fog. Most road-safety games are generic or European.
- Campaign-native: built from the start for sponsor and authority activations, with measurement included.
- Low-friction entry (QR code, no app install) and messaging-based follow-up (WhatsApp), which fit how people in the market actually use their phones **[Assumption, validate with usage data]**.

---

## 4. Strengths of the concept

1. **Clear social purpose with institutional demand.** Road safety in Namibia has established funders and stakeholders: the Motor Vehicle Accident (MVA) Fund, the National Road Safety Council (NRSC), the Roads Authority, the Ministry of Works and Transport, and NamPol **[Validate: confirm current mandates and budgets]**. A measurable engagement tool fits their campaign needs.
2. **Platform economics.** One mission engine can serve many campaigns through configuration. This matches the existing PromoPlays SDK philosophy **[Context]**, so new campaigns become configuration work rather than development work.
3. **The prediction → experience → reveal pattern in the prototype is good learning design.** Asking people to commit to a guess before showing them the answer creates a prediction error. That improves retention and gives a built-in pre/post measure.
4. **Mobile-web, QR, no-install entry** suits event activations, low storage and data-cost-sensitive users.
5. **The zones map onto real risk contexts** (urban, school, taxi rank, long-distance highway, gravel, coastal fog, heavy vehicles). This gives the content a natural structure that sponsors can align with. For example, a tyre brand fits Gravel Roads and a logistics company fits the Logistics Corridor.
6. **Prototype craft.** The existing build shows careful thought about low-bandwidth fallbacks, reduced motion and synthesised audio. These instincts carry over.

---

## 5. Gaps and weaknesses

| # | Gap | Why it matters |
|---|---|---|
| G1 | **No validated learning objectives** per mission | Without them, the effect on players cannot be designed or measured |
| G2 | **The MVP target audience is not defined.** The brief lists 11 audiences | Every design choice (tone, controls, data, rewards) depends on who the player is |
| G3 | **The scope is a platform vision with no proven core loop** | Risk of building the map, Passport and leaderboards around a mission nobody replays |
| G4 | **The only playable mission has minimal agency and an unavoidable outcome** | Not fun, not replayable, and it teaches fatalism ("you crash regardless") |
| G5 | **No sourced statistics or local legal validation** | Legal and reputational exposure; an authority partner would reject it |
| G6 | **Tone conflict**: fear and guilt in the prototype versus "positive, adventurous" in the brief | Fear appeals in road safety have mixed evidence and can produce defensive reactions in young drivers **[Validate with a behavioural specialist]**. Pick one register deliberately |
| G7 | **No data, privacy or child-protection model**, yet the brief includes schools, competitions and WhatsApp | The highest compliance risk in the whole concept |
| G8 | **No reward economics or fraud model** | Prizes attract cheating; leaderboard-ranked prizes are easy to game in client-side games |
| G9 | **No content-production model.** Eight zones would need roughly 30+ missions to feel like a world | Long-term cost; the world will look empty after launch |
| G10 | **No sponsor rules** | Risk of sponsors steering safety messaging (for example, implying a product makes you safe) |
| G11 | **The world map and zones add complexity before there is enough content to fill them** | A map with seven locked zones signals "unfinished" more than "adventure" |
| G12 | **No ownership defined for after launch**: content review, moderation, prize fulfilment, data requests | Operational failure modes, not technical ones |

---

## 6. Target audience recommendation

### 6.1 Audience analysis

| Audience | Primary need | Best-fit content | Channel | Data and consent complexity | Sponsor appeal | MVP fit |
|---|---|---|---|---|---|---|
| Learners / schools | Pedestrian, passenger and crossing safety; age-appropriate tone | School Zone, Taxi Rank (as passenger) | Teachers, classroom QR | **High**: minors, parental consent, school approval | High (CSR, authorities) | **Phase 2**, with a dedicated no-PII mode |
| Young drivers (18–25) | Speed, distraction, hazard perception, overtaking | City, B1, Gravel | Campuses, events, social media, fuel stations | Low–medium | **Very high** (insurers, fuel, telecoms, banks) | **MVP (primary)** |
| General motorists | Fatigue, long-distance planning, animals, gravel | B1, Gravel, Coastal | Fuel stations, holiday campaigns, radio | Low–medium | High | MVP (secondary) |
| Pedestrians (adults) | Visibility at night, crossing near taxi ranks | Taxi Rank, City | Taxi ranks, community events | Low | Medium (authorities) | Phase 2 |
| Taxi drivers | Safe stopping, passenger loading, fatigue | Taxi Rank | Taxi associations | Low, but needs trust and a channel | Medium | Phase 3 (needs partnership) |
| Taxi passengers | Seatbelts, speaking up, safe boarding | Taxi Rank | Ranks, WhatsApp | Low | Medium | Phase 2 |
| Fleet / logistics | Blind spots, inspections, fatigue, compliance evidence | Logistics Corridor, B1 | Employer-assigned | Medium (employee data, employer access) | High (B2B revenue) | Phase 3 |
| Employers | Duty-of-care evidence, completion records | Any | HR / induction | Medium | High | Phase 3 |
| Road-safety authorities | Reach, measurable change, accurate messaging | All | Partnership | Reporting only | Credibility and funding | **Content partner from day 1** |
| Insurers | Engagement with young drivers, brand trust, leads | Speed, distraction | Sponsor | Lead generation is risky for consent | Very high | MVP sponsor candidate |
| Tyre / fuel / telecom sponsors | Brand association, footfall, data-bundle tie-ins | Gravel (tyres), B1 (fuel), distraction (telecom) | Sponsor | Low if reporting is aggregate only | High | MVP sponsor candidate |
| Event organisers | A quick, fun activation with a crowd-friendly leaderboard | Any short mission | QR at venue | Medium (on-site prizes) | Medium | MVP channel |

### 6.2 Recommendation

**MVP primary audience: adults aged 18–35, especially new and young drivers and their regular passengers, reached through one sponsored campaign at events, tertiary campuses and fuel stations.**

Why:

- They make up the highest-risk group, and speed, distraction and hazard perception are the content that fits them **[Validate against NRSC/MVA Fund casualty data]**.
- Sponsors most want to reach this group, which de-risks pilot funding.
- Restricting the pilot to adults means:
  - no parental consent;
  - competitions and WhatsApp follow-up are legally simpler;
  - the existing driving prototype and City Safety Run fit directly.
- The pilot is credible and testable: completion, learning gain and return rate can all be measured within weeks.

**Schools are deliberately second, not dropped.** Schools are probably the highest-impact long-term audience, but they need different content (pedestrian and passenger rather than driver), tone and approvals, and a distinct data model. Doing them properly is a Phase 2 project, not an add-on to the MVP.

---

## 7. Gameplay assessment

### 7.1 Current prototype (Speed mission)

| Criterion | Rating | Notes |
|---|---|---|
| Fun | Low–medium | Polished presentation; one choice, then watch |
| Clarity | High | Clear flow, readable captions |
| Replayability | Very low | Deterministic outcome; scenery randomness only |
| Difficulty progression | None | — |
| Mobile usability | Good | Portrait, large buttons, tap only, FIT scaling ([main.js:16](../src/main.js#L16)) |
| Session length | ~2–3 min | Suits QR/event play |
| Educational effectiveness | Medium (severity) / weak (avoidance) | Teaches "faster = worse crash" well; misses "slower = more chance to avoid"; ambiguous on swerving |
| Player feedback | Good for the reveal | No feedback on *player* decisions, because there are hardly any |
| Reward design | Placeholder | The badge is given for completing, not for anything the player did |
| Scoring fairness | No scoring | — |
| Accessibility | Partial | Reduced motion respected; mute toggle; no keyboard or screen reader; text is drawn on canvas |
| Low-cost phones | Unknown, with some risk | ~335 KB images plus Phaser (~1 MB minified, roughly 300 KB+ gzipped **[Assumption, measure]**); per-frame `Graphics` road at 810×1440 ([T6](#23-technical-observations)) |
| Weak connectivity | Partial | Fallback art; no offline caching; analytics would be lost |

**Verdict:** keep it as **Speed Lab**, a short "explainer mission", after these fixes:

1. Make hazard distance fixed in metres rather than in seconds, and add a brake input. Then lower speeds can stop in time or hit at much lower speed, which teaches both avoidance and severity.
2. Remove or reframe the automatic swerve into oncoming traffic. Show the validated recommended response to a large animal on the road.
3. Replace the placeholder figures with sourced ones and credit the source.
4. Replace the guilt-framed closing line with a constructive one ("At 60 you had time to stop. That's the point of the limit.").

### 7.2 Is City Safety Run the right first mission?

**Yes, as the primary MVP mission, but only with a much narrower mechanic set than the brief describes.** The brief lists about ten simultaneous systems: lanes, speed, lights, pedestrians, cyclists, taxis, phone distraction, collectables, a Safety Meter and a score. Built together, that becomes a mediocre endless runner. It also takes too long for a small team, and it drifts toward a driving simulator.

The City is still the right setting because:

- it supports the widest range of short, decision-rich hazards;
- it is relatable to young urban drivers;
- it is easy for sponsors to present;
- it can reuse much of the pseudo-3D road tech in [Drive.js](../src/scenes/Drive.js).

**Recommended City Safety Run core loop (2–3 minutes, 3 mechanics):**

1. **Speed control by holding and releasing.** Hold to accelerate, release to coast, tap the brake. Speed zones change (60 → 40 school zone → 60 → 80 arterial **[Validate actual Windhoek limits]**). The player earns safety points for time spent within the limit. There is **no** reward for going faster.
2. **Hazard perception taps.** Hazards develop: a pedestrian stepping off the kerb near a taxi rank, a taxi pulling in to stop suddenly, a cyclist, a light turning amber. The player taps the developing hazard early and brakes. Early recognition scores more. This mechanic is the one with research behind it **[Validate, see §8]**.
3. **Phone distraction.** Notifications pop up. Ignoring them is rewarded. Tapping one covers part of the road for 1–2 seconds and hazards keep moving. The player feels the cost directly; no lecture is needed.

**Drop from the MVP:**

- free steering and lane changing (keep, at most, a lane position fixed by context);
- collectables (picking items up while driving rewards looking away from hazards, which is the opposite of the lesson);
- multiple vehicle types;
- day/night cycles;
- the full traffic-light system (keep amber-light decisions as scripted hazard events instead).

**Outcomes:** a hazard that is missed causes a **near-miss with a stop**, never an injury animation. The game freezes, shows what was missed, and the player continues. Three misses end the run with a "debrief", not a "game over".

### 7.3 Scoring and feedback

- **Safety Score (0–100)**, built from three visible components: *Speed compliance*, *Hazard awareness* (early detection and appropriate braking), and *Focus* (distractions ignored). Show the breakdown in the debrief.
- **No speed or time bonus anywhere.** Finishing faster must never score higher.
- **Feedback in the moment:** a short freeze-frame on each key event, with one line of explanation. Then a 30-second debrief at the end, showing the player's two weakest moments replayed as stills.
- **Stars (1–3) per mission** for replay motivation. Badges are earned for reaching a learning threshold, not for finishing.

### 7.4 Replayability and progression

- Randomised hazard ordering from a pool, seeded per run. The SDK already has `seededRandom` **[Context]**.
- Three difficulty tiers through campaign config: hazard density, the subtlety of early cues, and the number of distractions.
- A weekly "Road Condition" variant (rain, dusk, event traffic) as seasonal content in Phase 2.
- Be realistic: short educational missions get **2–4 plays per player**, not hundreds. Retention comes from new missions and campaign moments, not from endlessly replaying one mission.

### 7.5 Mobile, device and accessibility targets

- Portrait, one-thumb play, all touch targets 44 px or larger. The SDK already enforces this **[Context]**.
- Target an entry-level Android phone with 2–3 GB of RAM on Chrome **[Assumption: confirm the device baseline from local market data]**. Aim for a stable 30+ fps and a first-mission download under 1.5 MB compressed.
- Reduce the internal render resolution on low-end devices: render at 1× rather than 1.5× `Z` ([config.js:29](../src/config.js#L29)). Replace the per-frame `Graphics` road with pre-rendered strip textures or a shader.
- Captions on by default. A colour-blind-safe hazard highlight (shape plus colour). Adjustable game speed for accessibility. No reliance on audio.

---

## 8. Learning-design assessment

### 8.1 Behaviour-to-format mapping

| Behaviour | Best format | Notes |
|---|---|---|
| **Speed management** | Game mechanic | Hold/release speed with zone changes and stopping-distance consequences. The prototype's severity curve is a good add-on, but the stopping-distance lesson is missing ([T1](#23-technical-observations)) |
| **Hazard perception** | Game mechanic | Hazard-perception training is one of the better-evidenced young-driver interventions **[Validate with literature review]**. This is the strongest fit between game and learning in the whole concept |
| **Phone distraction** | Game mechanic | The cost of looking away is felt directly. Works well |
| **Following distance** | Game mechanic | Keep a time gap behind a truck; B1 and Logistics missions |
| **Safe overtaking** | Scenario decision | "Overtake now?" with sightline, oncoming traffic, solid line and a heavy vehicle. Free-steering overtaking would turn into a reflex test that rewards risk |
| **Fatigue awareness** | Scenario decision + explanation | You cannot make a player tired. Use journey-planning choices (rest stops, departure time) and simulated micro-sleep effects with care |
| **Seatbelt use** | Pre-trip checklist + explanation | A "buckle up all passengers" step before each drive, including rear seats and taxis. Trivial as a mechanic; valuable as a habit cue |
| **Vehicle roadworthiness** | Scenario / mini inspection | "Walk-around": tyres, lights, load. Good tie-in for a tyre sponsor in Gravel and Logistics |
| **Passenger responsibility** | Scenario decision | "Your taxi driver is speeding. What do you do?" Needs culturally realistic options **[Validate]** |
| **Pedestrian safety** | Game mechanic (as pedestrian) + scenario | A School Zone or Taxi Rank mission played *as* the pedestrian |
| **Emergency awareness** | Quiz / explanation | Emergency numbers, securing the scene, not moving injured people **[Validate numbers and first-aid guidance]** |
| **Drink-driving** | Scenario + explanation only | **Do not gamify impairment** (no "drunk mode" visual effects; these tend to be played for laughs) |
| **Crashes, injury, death** | **Not gamified directly** | Show outcomes as data, crash-lab dummies or near-miss freezes. Never as a scored, repeatable spectacle |
| **Real-world rule compliance (licence, fines)** | Explanation | Facts that need legal validation |

### 8.2 Content principles

- **Rewarded moment = correct behaviour.** Never reward speed, risky skill or collecting things while moving.
- **Failure state = near miss and explanation**, not destruction. The existing crash-lab sequence is acceptable for adults as a *one-time, data-framed* moment in Speed Lab, but it should not be the default way any mission ends.
- **One learning objective per mission**, stated in the mission brief and repeated in the debrief.
- **Every rule, number and recommended action** is reviewed by a qualified Namibian road-safety reviewer and recorded with a source in content configuration (`sourceRef` field; see the architecture document).

### 8.3 Measuring learning

| When | Measure | Method |
|---|---|---|
| **Before play** | Baseline knowledge or belief | 1–2 prediction questions (the existing [Predict.js](../src/scenes/Predict.js) pattern). Always shown, answers not graded |
| **During play** | Behavioural proxies | % of time within the speed limit; hazard detection latency (ms from hazard onset to tap); distraction ignore rate; braking appropriateness |
| **Immediately after** | Knowledge gain | The same or parallel question as the pre-test → **paired gain score** per player |
| **Intent** | Self-reported intention | One Likert item ("Next time I drive I will…"). Optional pledge |
| **Delayed (7–14 days)** | Retention | WhatsApp opt-in users only: one recall question. Response rate will be low; report it honestly |
| **Return play** | Transfer within the game | Hazard latency on the second play compared with the first |

**What not to claim:** the pilot cannot show reductions in crashes or real-world behaviour change. Sponsors and authorities should be told this up front. Report reach, completion, knowledge gain, retention and intent. Then design a Phase 3 evaluation with an academic or authority partner if outcome evidence is needed.

---

## 9. World-building assessment

| Element | Value | MVP? | Notes |
|---|---|---|---|
| **World map** | Gives a sense of place and journey | **Minimal**: a simple illustrated Namibia map with 2 active pins plus "coming soon" silhouettes | A full interactive map with eight zones looks empty and costs a lot of art. Grow it as content ships |
| **Zones** | Organise content and sponsor ownership | **2 zones** (Windhoek City, B1 Highway) | Each zone needs 2–3 missions before it feels real |
| **Unlock progression** | Gives a reason to continue | **Soft unlock**: recommend the next mission; do not hard-lock | Hard locks frustrate QR and event players who have 3 minutes. Campaigns can choose a specific entry mission |
| **Road Hero identity** | Belonging, a name to share | **Light**: generated name plus avatar colour/frame | No free-text names in MVP (moderation and PII risk) |
| **Safe Roads Passport** | Persistent progress, a place for badges, cross-campaign continuity | **Yes, minimal** | The Passport is the main way the world connects. Keep it |
| **Recurring characters** | Warmth, memorability, voice for feedback | **One guide character** for captions | A full cast costs a lot of art and writing. One guide gives consistency |
| **Missions** | Core content | **2** | See §14 |
| **Badges** | Recognition of learning | **2–3** | Earned by reaching a learning threshold |
| **Rewards** | Motivation for the campaign | **One prize draw** for eligible completers aged 18+ | See §13 and the risks |
| **Seasonal content** | Return visits | Phase 2 | Festive-season travel (December B1 traffic) is a natural first one **[Validate peak periods]** |
| **Sponsor worlds** | Revenue | Phase 3 | Risk to the identity; see §13 |
| **Community challenges** | Social proof, collective goals | Phase 2 | "Windhoek has completed 10,000 safe runs". Aggregate, so privacy-safe |
| **Leaderboards** | Event energy | Phase 2, event-scoped only | Global leaderboards invite cheating and reward replay grinding over learning |

### 9.1 Recommended vocabulary

Use these terms consistently in the UI, code, config and sponsor materials.

| Term | Definition | Do not use |
|---|---|---|
| **Safe Roads World** | The whole player experience and brand | "the app", "the platform" (player-facing) |
| **Road Hero HQ** | The home screen: Passport, map, current campaign | "dashboard", "lobby" |
| **Zone** | A geographic and thematic area of Namibia containing missions (e.g., *B1 Highway*) | "level", "world" (for a zone) |
| **Mission** | One short playable experience with one learning objective (e.g., *City Safety Run*) | "game", "level", "challenge" |
| **Road Hero** | The player identity | "user", "player" (player-facing) |
| **Safe Roads Passport** | The player's persistent record of missions, stamps and badges | "profile", "account" (player-facing) |
| **Stamp** | A Passport entry for completing a mission | — |
| **Safety Score** | 0–100 score for one mission run, built from named components | "points", "high score" |
| **Hero Points** | Cumulative points across missions (Phase 2), used for community totals | Do not mix with Safety Score |
| **Badge** | Recognition for reaching a learning or behaviour threshold | "trophy", "achievement" (pick one: Badge) |
| **Reward** | A real-world benefit (prize-draw entry, voucher, data bundle) | "prize" in the UI unless legally reviewed |
| **Challenge** | A time-limited goal on top of missions (e.g., "Festive B1 Challenge"). Phase 2 | Not a synonym for mission |
| **Campaign** | A configured activation for a partner: dates, entry points, branding, missions, rewards, reporting | "promo" (player-facing) |
| **Partner** | A sponsor, authority, school or employer running a campaign | "client" (player-facing) |
| **Pledge** | Optional voluntary commitment at the end of a mission | — |

---

## 10. Namibian localisation requirements

### 10.1 What makes it recognisably Namibian without stereotypes

| Area | Use for gameplay and learning | Avoid |
|---|---|---|
| **Landscapes** | Central highlands bush around Windhoek, Namib gravel plains, coastal fog belt, northern communal areas with livestock | Postcard dunes everywhere; "wild Africa" exotica |
| **Towns and routes** | Windhoek, Okahandja, the B1 north/south, B2 to Swakopmund/Walvis Bay, the C-roads (gravel) **[Validate road designations for each mission]** | Inventing routes with real names |
| **Road signs** | SADC Road Traffic Signs Manual style signs as used in Namibia **[Validate]** | European or US signs |
| **Left-hand traffic** | **Confirmed correct in the prototype**: the player drives in the left lane (`camX = -0.5`) and oncoming traffic is in the right lane ([Drive.js:24](../src/scenes/Drive.js#L24), [Drive.js:249](../src/scenes/Drive.js#L249)). Right-hand-drive vehicles | Mirrored assets |
| **Taxis and public transport** | Shared sedan taxis in Windhoek, combis and buses for longer routes, informal stopping behaviour **[Validate current livery and licensing markings]** | Caricatured or blamed taxi drivers; frame taxis as part of the system, not as villains |
| **Gravel roads** | Large share of the road network; dust plumes, loose surfaces, rollover risk at speed **[Validate network statistics and recommended speeds]** | — |
| **Animals and roadside hazards** | Kudu (especially dusk and night), warthog, livestock in northern regions, donkeys. Ties to time of day and lighting | Treating animals as "fun obstacles" to hit or dodge for points |
| **Weather and visibility** | Coastal fog, dust, low sun at dawn and dusk, sudden summer rain | — |
| **Languages** | English for the MVP. Phase 2: Afrikaans and Oshiwambo (Oshindonga/Oshikwanyama), then Otjiherero, Khoekhoegowab and others according to campaign region **[Validate language priorities with partners]** | Machine translation without review |
| **Local driving patterns** | Long-distance holiday travel, night driving, overtaking heavy vehicles on two-lane highways, fatigue on the B1 **[Validate against crash data]** | Generalisations about any group of drivers |
| **Urban vs rural** | City: pedestrians, taxis, intersections. Rural: speed, animals, fatigue, gravel, pedestrians walking along highways | — |
| **People** | Diverse Namibian characters across regions, ages and genders; pedestrians as people, not obstacles | Single-ethnicity casting; poverty imagery |

### 10.2 Details that must be validated by a Namibian road-safety or legal specialist

1. Speed limits by road class and vehicle type (urban, rural tar, gravel, school zones), and whether school-zone limits exist in Windhoek.
2. Road marking conventions (edge-line colour, barrier lines, no-overtaking markings) and sign designs. See [config.js:40](../src/config.js#L40).
3. Mobile-phone laws (hand-held prohibition, hands-free rules) and the current penalties.
4. Seatbelt and child-restraint laws, including rules for taxis, buses and rear seats.
5. Recommended response to large animals on the road (brake or swerve), the scenario in [Drive.js:117-122](../src/scenes/Drive.js#L117-L122).
6. Head-on crash injury and fatality risk by speed (the placeholder 9% / 37% / 90%; [config.js:11](../src/config.js#L11)). Use a citable source, preferably one accepted by NRSC or the MVA Fund.
7. Emergency phone numbers and basic post-crash guidance.
8. Learner and driver licence ages and conditions (affects who is a "young driver" in content).
9. Heavy-vehicle rules (blind-spot conventions, speed limits, rest periods) for the Logistics Corridor.
10. Taxi regulations (stopping areas, loading rules) for the Taxi Rank zone.
11. Rules on promotional competitions and prize draws (**Lotteries Act** compliance or registration requirements) **[Validate with legal counsel]**.
12. Data-protection obligations. Namibia's data-protection legislation has been in draft for some time; confirm its status as of October 2026. Confirm Child Care and Protection Act implications for any schools mode **[Validate with legal counsel]**.

---

## 11. Technical architecture assessment

Full detail is in [safe-roads-world-architecture.md](safe-roads-world-architecture.md). Summary:

### 11.1 Existing implementation

- **Keep:** the pseudo-3D road technique (as a reference implementation to port), the asset-fallback pattern, synthesised audio, reduced-motion handling, the Predict → Reveal pattern, portrait FIT scaling, the static deploy model.
- **Replace:** the module-level `state`, the console-only `track()`, hard-coded copy in scene files, JS without types, the per-frame `Graphics` road rendering, the scene-chained mission flow (it bundles the HQ and Passport inside the game canvas).

### 11.2 The proposed PromoPlays stack, compared with what is actually needed

| Proposed | Verdict for Safe Roads World | Reason |
|---|---|---|
| **Phaser 3** | **Yes** (3.90, matching the SDK) | Already used; good mobile-web performance; team familiarity. Do not move to Phaser 4 until the SDK does ([T13](#23-technical-observations)) |
| **TypeScript** | **Yes** | The SDK is already TypeScript. Typed content config is essential for safety-reviewed content |
| **Vite** | **Yes** (align with the SDK's version; resolves the esbuild advisory) | Already used |
| **GSAP** | **No** | The SDK deliberately rejected it in favour of Phaser tweens **[Context]**. For HQ UI, CSS transitions are enough |
| **Next.js + Tailwind** | **Tailwind yes; Next.js not for the player app** | The player HQ should be a static, offline-capable PWA, and SSR adds nothing there. Next.js is reasonable for a **partner/admin portal** in Phase 2 if the team prefers it |
| **Laravel API** | **Yes, if PromoPlays already runs Laravel in production** **[Open question]** | The API surface is small. Team familiarity matters more than framework choice. Alternative for speed: Supabase (README already mentions it, [README.md:84](../README.md#L84)) |
| **MySQL** | **Yes** | Relational data fits: players, campaigns, runs, stamps, entries |
| **Redis** | **Phase 2** (queues, rate limits, event-scoped leaderboards) | For the MVP, a DB-backed queue and rate limiter are enough |
| **JWT auth** | **Use Laravel Sanctum tokens instead** for the MVP | Anonymous device-bound tokens; no passwords. JWT adds key-rotation work for no gain at this scale |
| **S3-compatible storage** | **Yes** (Cloudflare R2 or similar) for campaign assets and exports | Fits the existing Cloudflare usage |
| **n8n** | **Yes, for automation** (WhatsApp messages, prize-draw exports, reports) | Must not be in the critical gameplay path |
| **WhatsApp integration** | **MVP: click-to-chat opt-in. Phase 2: automated sequences through the WhatsApp Business Platform** | Business-API approval and template approval take time **[Open question: does PromoPlays already have a verified WhatsApp Business account?]** |
| **Docker, GitLab CI/CD, Nginx** | **Yes for the API**; static front ends on Cloudflare Pages | Matches existing practice |

### 11.3 Separation of concerns

- **Game client (missions):** Phaser engines on `@promoplays/sdk`, each producing a standard `MissionResult`. They know nothing about players, sponsors or the backend.
- **World/platform interface (Road Hero HQ):** a static PWA handling entry, Passport, map, mission launching, consent, rewards display and offline sync.
- **Backend services:** a REST API for identity, campaign configuration, run submission, Passport, rewards eligibility and event ingest.
- **Campaign configuration:** versioned JSON (validated with schemas) that selects missions, branding, copy overrides, rewards and dates.
- **Analytics:** a first-party event pipeline (client queue → ingest endpoint → events table → aggregate reports). No third-party trackers in MVP.
- **Automation:** n8n workflows triggered by API webhooks (opt-in confirmed, draw closed, weekly report).
- **Content and assets:** mission content packs (scenarios, copy, figures with `sourceRef`) in the repo for the MVP, reviewed through pull requests. A CMS only in Phase 3.

---

## 12. Data, privacy and child-safety considerations

### 12.1 Minimum data by use case

| Use case | Minimum data | Do not collect |
|---|---|---|
| **Anonymous play** | Random device ID (UUID in local storage), campaign ID, entry source (QR code ID), mission results, timestamps, coarse device class | Name, phone, precise location, IP beyond transient rate limiting, advertising IDs |
| **Player profile** | The above plus a generated Road Hero name, an age band (self-declared: under 18 / 18–24 / 25–34 / 35+), optional region (13 regions; coarse) | Date of birth, gender (unless a partner has a specific justified need), free-text names |
| **Leaderboards** (Phase 2) | Road Hero name, score, event or campaign scope | Real names, photos |
| **School campaigns** (Phase 2) | School code and class code, generated name, grade band. **No direct identifiers.** Teacher account holds the class code | Learner names, learner phone numbers, any WhatsApp contact with minors |
| **Competitions** | Phone number (for contact) and a confirmation of 18+, collected **only at entry**, stored separately from gameplay data, deleted after fulfilment plus a defined retention period | ID numbers unless legally required for prize claim (collect offline at claim time) |
| **Rewards** | Entry record, eligibility flags, fulfilment status | Banking details (use vouchers or airtime via a provider) |
| **WhatsApp follow-up** | Phone number with explicit opt-in, opt-in timestamp and wording version, message history (through the provider) | Use for sponsor marketing without separate consent |
| **Sponsor reporting** | Aggregates only, minimum group size (e.g., suppress any figure based on fewer than 10 players) | Exports at player level; phone numbers; leads (unless separately consented, see §13) |

### 12.2 Principles

1. **Anonymous by default.** Full play, learning measurement and the local Passport all work without any personal data.
2. **Progressive identity.** A phone number is requested only when the player chooses to save across devices, enter a draw or receive follow-up. Each purpose has its own separate consent tick.
3. **Separate stores.** Contact data lives in a separate table or schema with restricted access. Gameplay analytics join on a pseudonymous player ID only.
4. **Retention limits.** For example: contact data deleted 90 days after the campaign or draw closes, unless the player opts in to ongoing updates. Raw events aggregated and pruned after 24 months **[Decision required]**.
5. **Player rights.** View, export and delete through a WhatsApp command or a web form. Operational ownership is needed (§18).
6. **No third-party trackers or ad SDKs** in the player app.
7. **Cross-border transfer.** Hosting location (for example, EU or South Africa cloud regions) and WhatsApp/Meta processing must be disclosed in the privacy notice **[Validate with counsel]**.

### 12.3 Child safety

- **MVP: 18+ only for rewards, WhatsApp and any contact.** Under-18s who scan a QR code can still play anonymously, but they see no prize or contact prompts. They are routed by the age-band question, and the gate is honest about why.
- **Phase 2 schools mode:**
  - a separate entry route (a school code) that turns off all contact, rewards and sponsor marketing;
  - content reviewed for age suitability (no crash-lab footage for younger learners);
  - teacher dashboards showing class aggregates only;
  - signed school or education-ministry approval **[Validate requirement]**.
- No user-generated text anywhere children can reach. No chat. No public display of learners' names.

---

## 13. Sponsor and campaign model

### 13.1 Partner roles

| Partner type | Natural fit | Contribution |
|---|---|---|
| Road authorities (NRSC, MVA Fund, Roads Authority) **[Validate]** | Content endorsement, all zones | Credibility, content review, distribution, funding |
| Insurers | Speed, distraction, young drivers | Funding, rewards, reporting interest |
| Tyre companies | Gravel Roads, roadworthiness | Vehicle-check content, rewards (tyre checks) |
| Fuel brands | B1 Highway, fatigue and rest stops | Forecourt QR distribution, rest-stop rewards |
| Banks | Young adults, campuses | Funding, campus activations |
| Telecoms | Phone distraction | Data-bundle rewards, zero-rating the game **[Explore]** |
| Motor dealerships | New drivers, vehicle safety | Event activations |
| Logistics companies | Logistics Corridor, sharing the road with trucks | Fleet B2B (Phase 3) |
| Schools / employers | Assigned play | Distribution, completion evidence |

### 13.2 Integration rules (proposed)

1. **Safety content is never sponsored content.** Rules, numbers and recommended actions come only from the reviewed content pack. A sponsor cannot change them.
2. **No safety claims for products.** For example, a tyre brand cannot say "our tyres prevent crashes". Factual vehicle-maintenance advice is fine, but it must not be product-specific.
3. **Excluded categories:** alcohol, gambling and betting, and any brand whose core product conflicts with road safety (for example, aftermarket performance or speed products) **[Decision required]**.
4. **Branding placement:** campaign splash, HQ header ("presented by"), debrief frame, reward screens. **Never** on hazards, crash or near-miss moments, or inside the field of view during play. No branded vehicles crashing.
5. **No individual-level data to sponsors.** Aggregate reporting only. Lead generation needs a separate, explicit, sponsor-named opt-in, and is a Phase 2 decision.
6. **Content approval chain:** PromoPlays content lead → road-safety reviewer → sponsor brand approval (for brand assets only) → final sign-off logged in the campaign config.

### 13.3 White-label versus co-branded

- **Safe Roads World remains a PromoPlays-owned brand.** Default to **co-branding**: "Safe Roads World, presented by [Partner]". The Passport, Road Hero identity and vocabulary never change between campaigns. This continuity is what makes it one world.
- **White-label** (the partner's own name, no Safe Roads World branding) should be a separate product built on the same engines (for example, for a fleet operator's internal training), priced higher and kept out of the Safe Roads World Passport. Do not dilute the main brand to win one deal.
- **Zone sponsorship** (Phase 3): a partner sponsors a zone for a season, with its logo on the map pin. It never renames the zone.

### 13.4 Campaign configuration (what a campaign defines)

Identity, dates and status; entry points (QR codes with location tags); which missions and in what order; branding theme; copy overrides limited to non-safety text; reward rules (eligibility, draw dates, prize descriptions, T&Cs URL); consent texts by version; reporting recipients. See the architecture document for the schema.

### 13.5 Reporting metrics for partners

Reach (unique devices); QR scans by location; mission starts and completions; completion rate; median session time; average pre→post knowledge gain; % reaching badge thresholds; return rate (7-day, 30-day); opt-in rate; delayed-recall results (with response rate); breakdown by age band and region (subject to minimum group size). **No vanity metrics without denominators.**

### 13.6 Rewards

- **Prize draw among eligible completers aged 18+ (one entry per player per campaign)**, not prizes for top scores. This removes most of the incentive to cheat, and it rewards participation and learning rather than replay grinding.
- Optional instant rewards (airtime or data vouchers) only with server-side caps and phone verification.
- **Competition terms and conditions and the legal status of the draw must be confirmed** (§10.2 item 11).

---

## 14. MVP scope

**Goal of the MVP:** prove in one real campaign that players (a) complete a mission, (b) show measurable knowledge gain, (c) return for a second mission, and that (d) a partner finds the reporting worth paying for.

### 14.1 Player experience

1. Scan a campaign QR code → lands on Road Hero HQ (campaign splash, "presented by").
2. One-screen consent and age band. Anonymous play starts immediately.
3. HQ with a minimal Namibia map: **Windhoek City** and **B1 Highway** active.
4. **Mission 1: City Safety Run** (new): speed zones, hazard-perception taps, phone distraction. 2–3 min. Pre/post question. Safety Score with breakdown. *City Guardian* badge at the threshold.
5. **Mission 2: Speed Lab (B1)**: the reworked prototype (stopping distance plus severity, sourced figures, validated animal response, constructive copy). 2 min. Pre/post question. *Speed Smart* badge.
6. **Passport:** stamps, badges and best Safety Score per mission, stored locally first.
7. **Save Passport / enter draw (18+):** WhatsApp click-to-chat opt-in. The player sends a prefilled code, which links their phone to the Passport on the server. Separate consent ticks for draw entry and follow-up.
8. One optional pledge at the end.

### 14.2 Platform

- Campaign config (JSON, validated) for **one** campaign, deployed with the app or fetched from the API.
- API: device identity, run submission, Passport sync, opt-in linkage, draw-eligibility export, event ingest.
- Offline-first: the app shell and both missions are cached after the first load. Events and runs are queued and synced later.
- Partner report: a weekly CSV or PDF of aggregates produced by an n8n workflow or a SQL view, plus one live read-only dashboard page (simple). No self-service portal.
- English only.
- Content reviewed and signed off by a named Namibian road-safety reviewer.

### 14.3 Pilot success criteria (proposed, [Decision required])

| Metric | Target to proceed |
|---|---|
| Mission 1 completion rate (of starts) | ≥ 70% |
| Mean knowledge gain on the paired pre/post item | Statistically meaningful improvement; set the threshold with the evaluation partner |
| Players who start a second mission | ≥ 30% |
| 7-day return rate | ≥ 10% |
| WhatsApp opt-in rate (18+) | ≥ 15% |
| Median load-to-play time on target device over 3G | ≤ 8 s |
| Crash-free sessions | ≥ 99% |
| Partner willing to fund Phase 2 | Yes / No |

---

## 15. Features explicitly excluded from the MVP

| Excluded | Reason | Earliest phase |
|---|---|---|
| Zones 3–8 (School, Taxi Rank, Roadworks, Gravel, Coastal, Logistics) | Content cost; prove the loop first | Phase 2–3 |
| Schools mode / under-18 contact | Needs a separate data model, approvals and content | Phase 2 |
| Global or persistent leaderboards | Cheating risk; rewards grinding over learning | Phase 2 (event-scoped only) |
| Rewards based on score or rank | Fraud and fairness | Not recommended |
| Free-text usernames, chat, social feed | Moderation and child safety | Not recommended (chat), Phase 3 (curated sharing) |
| Automated WhatsApp sequences / chatbot | Needs WhatsApp Business account, template approval, ops capacity | Phase 2 |
| Multiple languages | Translation and review capacity | Phase 2 |
| Self-service partner portal / CMS | Not needed for one campaign | Phase 3 |
| Avatar customisation and cosmetic store | No learning value | Phase 3 or never |
| Free-steering driving physics, car selection, upgrades | Turns it into a driving game and rewards speed | Not recommended |
| Collectables during driving | Rewards looking away from hazards | Not recommended |
| Native apps | QR plus web is the channel; app stores add friction | Future, only if retention data demands it |
| Real-world telematics or behaviour tracking | Privacy and complexity | Future, B2B fleet only, separate consent |
| Seasonal events, community challenges | Need a content pipeline and an audience first | Phase 2 |
| Sponsor-owned worlds / zone naming rights | Risk to the identity | Phase 3 (zone sponsorship), never (renaming) |

---

## 16. Product roadmap

Durations assume a core team of 2 developers, 1 game/UX designer-artist (part-time illustration support), 1 content/project lead and a part-time road-safety reviewer **[Assumption: team size not stated]**.

| Phase | Duration (est.) | Focus | Exit criteria |
|---|---|---|---|
| **0. Foundations** | 2–3 weeks | Decisions (§18); content partner signed; learning objectives; source data; git and repo set-up on the SDK; device baseline; art direction | Approved MVP spec, reviewer engaged, figures sourced |
| **1. MVP build** | 8–10 weeks | City Safety Run engine; Speed Lab rework; HQ PWA; API; event pipeline; WhatsApp opt-in; reporting | Internal and device QA passes; content signed off |
| **1b. Closed test** | 2 weeks | 30–50 target-audience players in Windhoek; usability and comprehension testing | Fixes applied; learning item validated |
| **2. Pilot campaign** | 4–6 weeks live | One sponsor, 3–5 activation sites | §14.3 criteria reviewed |
| **3. Phase 2** | ~3–4 months | Schools mode with School Safety Zone (2 missions); Taxi Rank zone; Afrikaans and Oshiwambo; WhatsApp sequences; event-scoped leaderboards; community challenge; seasonal B1 festive challenge; partner dashboard v1 | Two concurrent campaigns run on configuration only |
| **4. Phase 3** | 6+ months | Gravel, Roadworks, Coastal, Logistics zones; fleet/employer B2B mode; zone sponsorship; CMS; delayed-outcome evaluation study | Repeatable content pipeline (one mission per 3–4 weeks) |
| **Future** | — | Native wrapper, telematics partnerships, regional expansion (SADC) | Evidence-led |

---

## 17. Key risks and mitigations

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | **Scope creep**: building the world before a mission is fun | High | High | Lock the MVP to 2 missions and 2 zones; use the feature matrix as a change-control gate |
| R2 | **Budget overrun on art and content** for 8 zones | High | High | Reusable road engine; mission templates; a strict art style that is cheap to produce (stylised, not photoreal); grow zones only when funded |
| R3 | **Content inaccuracy** (laws, figures, recommended actions) | Medium | **Very high** | Named reviewer; `sourceRef` on every fact; sign-off logged per content version; disclaimer and correction process |
| R4 | **Legal exposure**: advice that leads to harm, or competition non-compliance | Low–medium | High | Legal review of terms, competition rules and advice wording; frame content as education, not instruction; prize draws vetted under lottery law |
| R5 | **Child participation in an adult campaign** | Medium | High | Age band at entry; under-18s get anonymous play only; no contact capture; schools only through a separate mode |
| R6 | **Data privacy breach or over-collection** | Medium | High | Minimum data; separate contact store; encryption at rest; access control; retention jobs; no individual-level sponsor exports |
| R7 | **Sponsor influence on messaging** | Medium | High | Written integration rules (§13.2) in every contract; reviewer veto; Safe Roads World brand ownership retained |
| R8 | **Reward fraud** (multiple entries, bots, SIM farms) | High (if prizes are valuable) | Medium | Draws, not rank prizes; one entry per verified phone per campaign; server-side plausibility checks; rate limits; manual review of winners |
| R9 | **Cheating on scores** | High | Low (if no rank prizes) | Scores are for feedback, not prizes; server-side sanity bounds; event leaderboards reviewed by staff |
| R10 | **Low replayability** | High | Medium | Seeded hazard pools, star ratings, new missions per campaign; measure return rate rather than assuming it |
| R11 | **Poor educational outcomes** | Medium | High | Clear learning objectives; prediction plus debrief pattern; closed comprehension testing before the pilot; honest reporting |
| R12 | **Fear or trauma response** (people bereaved by road crashes are common) | Medium | Medium | No graphic injury; near-miss failure states; content warning before Speed Lab; a supportive tone |
| R13 | **Weak internet access** | High | High | PWA caching; first-mission budget of 1.5 MB or less; offline queue; zero-rating with a telecom partner **[Explore]** |
| R14 | **Poor performance on low-end Android** | Medium | High | Device lab with 3 target phones from day 1; render scale by device tier; replace per-frame `Graphics` road; FPS telemetry |
| R15 | **Long-term content production cost** | High | High | Data-driven mission templates (scenario JSON); one engine supports many missions; partner-funded content |
| R16 | **Post-launch maintenance gaps** (prize fulfilment, data requests, content updates) | Medium | High | Named operational owners; runbooks; n8n automations; a support channel |
| R17 | **Third-party asset licensing** (crash photos, vehicle likenesses) | Medium | Medium | Asset provenance register; commission original or licensed art; avoid identifiable brand vehicles |
| R18 | **WhatsApp platform dependency** (approval, pricing, policy change) | Medium | Medium | The local Passport works without WhatsApp; a web recovery code as backup; budget for per-conversation fees |
| R19 | **Platform fragmentation** across PromoPlays repos (Phaser 3.80 / 3.90 / 4) | Medium | Medium | Standardise on SDK versions; build Safe Roads engines inside the SDK monorepo or as a consumer of it |

---

## 18. Decisions requiring PromoPlays approval

1. **MVP primary audience:** adults aged 18–35 (recommended) versus schools-first.
2. **First mission set:** City Safety Run (re-scoped) plus reworked Speed Lab.
3. **Tone:** "positive, adventurous, near-miss" as the default, with crash-lab realism allowed only in Speed Lab for adults. Or remove the crash lab entirely.
4. **Age policy:** 18+ for rewards and contact in the MVP.
5. **Technical foundation:** build missions as engines on `@promoplays/sdk` (recommended) rather than extending this prototype codebase.
6. **Backend:** Laravel + MySQL (if already operated in production) or Supabase for the pilot.
7. **WhatsApp:** use an existing verified WhatsApp Business account and provider, or apply for one now (lead time).
8. **Reward model:** prize draw among eligible completers (recommended) or score-based prizes.
9. **Sponsor rules:** adopt §13.2 as contract language; set the excluded categories.
10. **Brand stance:** Safe Roads World is never white-labelled; white-label is a separate product.
11. **Content authority:** which body reviews and endorses content (NRSC, MVA Fund, other), and who has final sign-off.
12. **Data retention periods** and the hosting region.
13. **Pilot success thresholds** (§14.3).
14. **Asset strategy:** keep, license or replace the photorealistic crash-lab and vehicle images.

---

## 19. Recommended next actions

1. Put this workspace under version control (`git init`) and tag the prototype as `prototype-v0.1` before any refactoring.
2. Hold a decision workshop on §18 items 1–5 and 8.
3. Approach the road-safety content partner. Request crash statistics, speed limits, recommended animal-collision guidance and a sourced speed-vs-injury curve.
4. Write one-page learning objectives for City Safety Run and Speed Lab, including the paired pre/post questions.
5. Paper- and video-prototype the City Safety Run loop with 5–8 target players before coding the engine.
6. Set up a device lab (3 entry-level Android phones) and run the current prototype on it to get baseline FPS and load times ([T6](#23-technical-observations)).
7. Start WhatsApp Business account verification if one does not exist.
8. Ask legal counsel to review competition law, the privacy notice and the consent wording.
9. Write the art direction (stylised, Namibian, low-cost to produce) and commission the Road Hero guide character and the City environment kit.
10. Start Phase 1 engineering following the first ten tasks listed in the architecture document.

---

## Open questions

1. What audience, budget and timeline has the first sponsor or partner (if any) already committed to?
2. Does PromoPlays already run Laravel/MySQL in production, and who maintains it?
3. Does PromoPlays have a verified WhatsApp Business account and a business solution provider?
4. What is the team size and skill mix for Phase 1?
5. Which Namibian road-safety body has agreed, or would agree, to review content?
6. Where did the crash-lab and vehicle images come from, and under what licence?
7. Is there an existing PromoPlays brand guide, or a Safe Roads World logo and identity?
8. Is there existing PromoPlays player or analytics infrastructure from other campaigns that should be reused?
9. What did the brief's authors intend the "Safety Meter" to do in City Safety Run? Is it a fail state, a score, or both?
10. Are there commitments already made to sponsors about leaderboards, prizes or data that constrain these recommendations?
11. What devices and network conditions are typical at the planned activation sites?
12. Is the intended geographic scope only Namibia for the foreseeable future (this affects hosting, language and legal choices)?
