# Safe Roads World — Feature Matrix

**Prepared for:** PromoPlays product, design and engineering leads
**Date:** 11 October 2026
**Companion to:** [safe-roads-world-analysis.md](safe-roads-world-analysis.md) · [safe-roads-world-architecture.md](safe-roads-world-architecture.md)

## How to use this matrix

This matrix is the change-control gate for scope. A feature moves to an earlier phase only if PromoPlays approves the move and the dependencies listed for it are met.

**Classification**

| Class | Meaning |
|---|---|
| **MVP** | Needed to run one credible, measurable pilot campaign |
| **Phase 2** | Next 3–4 months after a successful pilot |
| **Phase 3** | Scale-up: more zones, B2B, partner self-service |
| **Future** | Only if evidence and funding justify it |
| **Not recommended** | Conflicts with learning goals, safety, privacy or cost-effectiveness |

**Scales.** User value and business value are rated Low, Medium or High. Complexity uses S (days), M (1–2 weeks), L (3–5 weeks) and XL (6+ weeks), assuming a small team building on `@promoplays/sdk`.

Throughout, "existing prototype" refers to this workspace. File references are relative to the repository root.

---

## Summary

| Class | Count |
|---|---|
| MVP | 42 |
| Phase 2 | 17 |
| Phase 3 | 14 |
| Future | 5 |
| Not recommended | 10 |
| **Total** | **88** |

The MVP count looks large because the matrix lists features at a fine level of detail. Most MVP rows are small parts (S or M) of only **two missions, one HQ screen, one campaign and one backend**. "Content approval workflow" is counted as MVP (manual process); its tooling is Phase 3.

---

## 1. Missions and gameplay

| Feature | Class | User value | Business value | Complexity | Dependencies | Main risk | Recommendation |
|---|---|---|---|---|---|---|---|
| City Safety Run: speed-zone control (hold/release, brake) | **MVP** | High | High | L | Road renderer port; validated Windhoek speed limits | Turning into a racing game | Score compliance only. Never give any bonus for speed or finishing time |
| City Safety Run: hazard-perception taps | **MVP** | High | High | L | Hazard scenario format; art for pedestrians, taxis, cyclists | Hazards feel random or unfair | Build hazards with visible early cues; playtest detection timing |
| City Safety Run: phone-distraction events | **MVP** | High | High | M | HUD overlay system | Becomes an annoying gimmick | Use at most 2–3 per run, with a clear cost shown in the debrief |
| City Safety Run: amber/red traffic-light decisions | **MVP** | Medium | Medium | S | Hazard scenario format | Unclear local rules on amber | Implement as scripted decision events, not a full signal simulation |
| City Safety Run: free steering / lane changing | **Not recommended** | Low | Low | L | Physics, collision | Drifts toward a driving simulator and adds reflex difficulty that has nothing to do with the learning | Use fixed lanes; position changes come from context |
| Collectables while driving ("safety items") | **Not recommended** | Low | Low | S | — | Rewards looking away from the road, the opposite of the lesson | Replace with hazard spotting |
| Safety Meter as a live health bar | **Phase 2** | Medium | Low | S | Score model | Turns safety into a hit-point bar and invites recklessness until the bar is low | MVP uses near-miss freezes and an end debrief. Revisit after playtests |
| Speed Lab (reworked existing prototype) | **MVP** | Medium | High | M | Sourced speed/injury data; validated animal-collision guidance | Graphic crash framing; inaccurate figures | Fix the stopping-distance logic ([Drive.js:107](../src/scenes/Drive.js#L107)), add braking, replace guilt copy, add a content note |
| Crash-lab photo replay | **MVP** (adults only, in Speed Lab) | Medium | Medium | S (exists) | Asset licence confirmed | Trauma trigger; unlicensed imagery | Keep one data-framed replay. Exclude it from schools mode |
| Near-miss freeze-frame feedback | **MVP** | High | Medium | M | Hazard events | Interrupts flow too often | Freeze only on missed hazards; 1 line of text; tap to continue |
| End-of-mission debrief (score breakdown plus 2 key moments) | **MVP** | High | High | M | Event log per run | Too text-heavy | Use a visual breakdown with no more than 3 short lines |
| Seeded hazard pools and 3 difficulty tiers | **MVP** | Medium | Medium | M | SDK `seededRandom` | Tier imbalance | Set the tier per campaign; default to tier 1 |
| Star rating (1–3) per mission | **MVP** | Medium | Low | S | Score model | — | Cheap replay motivation |
| School Zone missions (pedestrian, crossing, learner transport) | **Phase 2** | High | High | L | Schools mode; age-appropriate art | Child-safety and approval delays | First content of Phase 2 |
| Taxi Rank missions (boarding, passenger voice, stopping) | **Phase 2** | High | Medium | L | Validated taxi rules; respectful portrayal | Stereotyping taxi drivers | Co-design with taxi stakeholders |
| B1 overtaking decision mission | **Phase 2** | High | High | M | Scenario format | Rewards risk if done as reflex play | Present as decision scenarios, not steering |
| B1 fatigue and journey-planning mission | **Phase 2** | High | High | M | Scenario format | Hard to make tangible | Use route planning with rest stops; fits a fuel sponsor |
| Gravel Roads mission | **Phase 3** | High | High | L | Gravel handling model (simplified) | Physics complexity | Use speed-choice decisions and dust-visibility mechanics, not drifting |
| Roadworks mission | **Phase 3** | Medium | Medium | M | Sign assets | Low engagement | Reuse the City engine with a different hazard pack |
| Coastal Route mission (fog, wind) | **Phase 3** | Medium | Medium | M | Weather rendering | Performance on low-end devices | Use a cheap fog shader or overlay; test on low-end devices |
| Logistics Corridor mission (blind spots, inspections) | **Phase 3** | High (B2B) | High | L | Fleet partner | Content accuracy | Build with a logistics partner |
| Pre-trip seatbelt / passenger check | **MVP** | Medium | Medium | S | — | Feels like a chore | Keep it to a 3-second tap-to-buckle at mission start |
| Drink-driving "impaired mode" effects | **Not recommended** | Low | Low | M | — | Gets played for laughs and trivialises impairment | Cover through scenario and explanation only |
| Visible crash or injury as a fail state | **Not recommended** | — | — | — | — | Makes harm entertaining; trauma | Use near-miss stops; show outcomes as data |

## 2. World and progression

| Feature | Class | User value | Business value | Complexity | Dependencies | Main risk | Recommendation |
|---|---|---|---|---|---|---|---|
| Road Hero HQ (home screen) | **MVP** | High | High | M | PWA shell | Overbuilt menus | Keep to one screen: campaign, map, Passport, play |
| Minimal Namibia map (2 active zones plus silhouettes) | **MVP** | Medium | Medium | M | Illustration | Looks empty | Show "coming soon" silhouettes, not locked padlocks |
| Full interactive 8-zone world map | **Phase 3** | Medium | Medium | L | Content for all zones | Art cost; empty-world effect | Grow the map as zones ship |
| Soft unlock (recommended next mission) | **MVP** | Medium | Medium | S | Passport | — | No hard locks for QR players |
| Hard zone unlocks / gating | **Not recommended** (for campaigns) | Low | Low | S | — | Blocks campaign-targeted entry | Campaigns choose the entry mission instead |
| Safe Roads Passport: local (device) | **MVP** | High | High | M | Storage layer | Lost on clearing the browser | Pair with WhatsApp save or a recovery code |
| Passport cloud sync (cross-device) | **MVP** | Medium | High | M | API; identity linking | Account-merge edge cases | Link through the WhatsApp opt-in code; device is primary |
| Badges (2–3, threshold-based) | **MVP** | Medium | Medium | S | Score model | Awarded for completion only | Award on reaching a learning threshold |
| Generated Road Hero name plus avatar colour/frame | **MVP** | Medium | Low | S | Name word lists (reviewed) | Offensive combinations | Curated word lists; no free text |
| Free-text usernames | **Not recommended** | Low | Low | S | Moderation | PII and abuse | — |
| Avatar customisation / cosmetic unlocks | **Phase 3** | Low | Low | M | Art | Distraction from learning | Only if retention data shows a need |
| Guide character (one recurring voice) | **MVP** | Medium | Medium | M | Character design | Stereotyped portrayal | Commission a Namibian illustrator; test with players |
| Wider cast of recurring characters | **Phase 3** | Medium | Low | L | Writing, art | Cost | Introduce one character per zone |
| Hero Points (cumulative, cross-mission) | **Phase 2** | Low | Medium | S | Passport | Confused with Safety Score | Use only for community totals |
| Safety pledge | **MVP** | Low | Medium | S | — | Seen as box-ticking | Make it optional, one tap, and count it as intent only |
| Seasonal content (e.g., festive B1 Challenge) | **Phase 2** | Medium | High | M | Challenge system; content pipeline | Missed timing windows | Plan the December B1 holiday period first **[validate peak periods]** |
| Community challenges (aggregate goals) | **Phase 2** | Medium | High | M | Aggregation API | Low participation looks bad | Show progress only once thresholds are met |
| Event-scoped leaderboard | **Phase 2** | Medium | Medium | M | Redis or DB; moderation | Cheating; ranks feel unfair | Show it only at events; staff-reviewed; no rank prizes |
| Global persistent leaderboard | **Not recommended** | Low | Low | M | — | Cheating; rewards grinding | Use community totals instead |

## 3. Campaign and sponsor

| Feature | Class | User value | Business value | Complexity | Dependencies | Main risk | Recommendation |
|---|---|---|---|---|---|---|---|
| Campaign configuration (JSON, validated) | **MVP** | Low | High | M | SDK `validateCampaignConfig` pattern | Config errors in production | Schema validation in CI plus preview before launch |
| QR-code entry with location tags | **MVP** | High | High | S | Campaign config | Tag spoofing (low impact) | Short links (`/c/{campaign}/{entry}`); static QR codes |
| Co-branded sponsor theming ("presented by") | **MVP** | Low | High | S | SDK `ThemeManager` | Sponsor overreach | Placement rules (§13.2 of the analysis) enforced in the config schema |
| Copy overrides for non-safety text | **MVP** | Low | Medium | S | Content keys | Override of safety text | The schema forbids overriding any `safety.*` keys |
| Multiple concurrent campaigns | **Phase 2** | Low | High | M | Campaign resolution by entry | Data mixing | Campaign ID on every record from day 1 |
| Partner reporting: scheduled aggregate export | **MVP** | — | High | M | Event pipeline; n8n | Small-group re-identification | Suppress any figure based on fewer than 10 players |
| Partner live dashboard (read-only) | **Phase 2** | — | High | M | Reporting API | Scope creep | One page of fixed metrics |
| Partner self-service portal / campaign builder | **Phase 3** | — | High | XL | Admin auth; CMS | Very high cost | Manual setup by PromoPlays until there are 5+ concurrent campaigns |
| Zone sponsorship | **Phase 3** | Low | High | S | Map | Brand dilution | Logo on the map pin only; never rename the zone |
| White-label (partner-only branding) | **Future** (separate product) | — | Medium | M | Engine reuse | Erodes the Safe Roads World identity | Sell as a separate PromoPlays product |
| Sponsor-owned "worlds" | **Not recommended** | Low | Medium | XL | — | Fragments the world | Use zone sponsorship instead |
| Content approval workflow (logged sign-off) | **MVP** (manual) / **Phase 3** (tooling) | — | High | S / L | Reviewer | Shipping unreviewed content | MVP: sign-off record in the campaign config plus a pull-request checklist |

## 4. Rewards and competitions

| Feature | Class | User value | Business value | Complexity | Dependencies | Main risk | Recommendation |
|---|---|---|---|---|---|---|---|
| Prize draw for eligible completers aged 18+ | **MVP** | High | High | M | Opt-in; T&Cs; legal check | Lottery-law compliance | One entry per verified phone per campaign |
| Score- or rank-based prizes | **Not recommended** | Medium | Medium | M | — | Fraud; rewards replay over learning | — |
| Instant airtime/data rewards | **Phase 2** | High | High | M | Telecom or voucher provider; fraud controls | SIM-farm abuse | Server-side caps; phone verification |
| On-site event rewards (staff-verified) | **Phase 2** | High | Medium | S | Event mode screen | Staff workload | Completion screen with a rotating code for staff to verify |
| Winner selection and fulfilment workflow | **MVP** | — | High | S | n8n; contact store | Missed fulfilment harms trust | Documented runbook with a named owner |

## 5. Identity, data and communication

| Feature | Class | User value | Business value | Complexity | Dependencies | Main risk | Recommendation |
|---|---|---|---|---|---|---|---|
| Anonymous device identity | **MVP** | High | High | S | — | Device churn inflates reach | Report as "devices", not "people" |
| Age band and consent screen | **MVP** | Low | High | S | Legal wording | Friction at entry | One screen; play starts immediately after |
| WhatsApp click-to-chat opt-in (save Passport, enter draw) | **MVP** | High | High | M | WhatsApp Business account; provider; n8n | Approval lead time | Start verification now; fall back to a recovery code |
| Recovery code / link (no WhatsApp) | **MVP** | Medium | Low | S | API | — | Backup save path |
| Automated WhatsApp follow-up sequences | **Phase 2** | Medium | High | M | Approved templates; consent records | Spam perception; cost per conversation | No more than 3 messages per campaign; delayed-recall question included |
| WhatsApp chatbot mini-missions | **Future** | Medium | Medium | L | Conversational design | Ops cost | Revisit after Phase 2 data |
| Email / SMS channels | **Future** | Low | Low | M | — | Channel sprawl | WhatsApp only unless a partner requires another channel |
| Player data rights (export, delete) | **MVP** (manual process) | Medium | High (trust) | S | Contact store | Unhandled requests | Handle via a WhatsApp command or form, then a scripted delete |
| Schools mode (class codes, no PII, teacher view) | **Phase 2** | High | High | L | School approvals; age-appropriate content | Child-protection failure | Separate entry route; contact and rewards turned off |
| Employer / fleet mode (assigned play, completion records) | **Phase 3** | Medium | High | L | Employer data agreements | Employee surveillance concerns | Employers see completion status only, with employee consent |
| Real-world telematics integration | **Future** | Medium | High | XL | Fleet partners; separate consent | Privacy; scope | Only as a separate B2B product |

## 6. Learning and analytics

| Feature | Class | User value | Business value | Complexity | Dependencies | Main risk | Recommendation |
|---|---|---|---|---|---|---|---|
| Pre/post prediction questions per mission | **MVP** | Medium | High | S | Content pack | Poorly written items | Validate items in the closed test |
| In-play behavioural metrics (latency, compliance, ignore rate) | **MVP** | Low | High | M | Event model | Over-claiming meaning | Report as in-game proxies only |
| First-party event pipeline with offline queue | **MVP** | — | High | M | API ingest | Data loss offline | IndexedDB queue; idempotent batches |
| Third-party analytics / ad SDKs | **Not recommended** | — | Low | S | — | Privacy; child safety; page weight | Use first-party events only |
| Delayed-recall check (7–14 days, WhatsApp) | **Phase 2** | Low | High | S | WhatsApp sequences | Low response rate | Report the response rate alongside the results |
| Formal evaluation study with an academic or authority partner | **Phase 3** | — | High | L | Partner; ethics approval | Cost; time | Plan once Phase 2 shows reach |
| FPS and device telemetry | **MVP** | — | Medium | S | Event model | — | Needed to tune for low-end Android |

## 7. Platform and technical

| Feature | Class | User value | Business value | Complexity | Dependencies | Main risk | Recommendation |
|---|---|---|---|---|---|---|---|
| Build missions on `@promoplays/sdk` (TypeScript) | **MVP** | — | High | M | SDK version alignment | SDK immaturity (one engine so far) | Treat Safe Roads as the SDK's second reference engine |
| PWA with offline cache (shell plus 2 missions) | **MVP** | High | High | M | Service worker | Stale-cache bugs | Versioned caches; update prompt |
| Device-tier render scaling | **MVP** | High | Medium | S | Device detection | Mis-tiering | Start at a low tier; upgrade if the first-5s FPS is stable |
| English only | **MVP** | — | — | — | — | Reduced reach | i18n keys from day 1 so Phase 2 is translation work only |
| Afrikaans and Oshiwambo localisation | **Phase 2** | High | High | M | Translators; reviewers | Translation quality | Native-speaker review mandatory |
| Further languages (Otjiherero, Khoekhoegowab, etc.) | **Phase 3** | Medium | Medium | M | — | — | Based on campaign region |
| Audio narration | **Phase 3** | Medium | Medium | M | Voice talent per language | Data weight | Optional download |
| Headless CMS for content | **Phase 3** | — | Medium | L | Content volume | Premature tooling | Content lives in the repo until there are more than 10 missions |
| Native app (Android) | **Future** | Low | Low | L | — | Install friction kills QR flow | Only if PWA limits are proven |
| Accessibility basics (captions, reduced motion, colour-safe cues, adjustable speed) | **MVP** | High | Medium | M | — | — | Build in from the start; retrofitting later costs more |
