# NSW Road Safety Learning Lab: all 12 experiences (combined reference)

Combined from the individual Project docs on 13 Oct 2026, for the Safe Roads World "Road Safety Learning Lab" mission (PromoPlays). Source: https://www.nsw.gov.au/roadsafetylearninglab/ (observed via click-through in the browser pane; copy paraphrased, figures and laws are NSW/Australian). The individual docs remain in the project; this is the single-document version.

## Contents

1. How this was done, and its limits
2. Site structure and the universal scene template
3. Experience index (12)
4. Experience 1: Speed
5. Experience 2: Pedestrian
6. Experience 3: Motorcycle
7. Experience 4: Bicycle
8. Experience 5: Heavy vehicle
9. Experience 6: Vehicle safety
10. Experience 7: Drive to conditions
11. Experience 8: Child car seats
12. Experience 9: Road rules
13. Experience 10: Road treatments
14. Experience 11: Alcohol & drugs
15. Experience 12: Fatigue
16. Cross-experience patterns
17. Safe Roads World implications (all experiences)
18. Flags: IP, localisation, care, our own prototype
19. Gaps still to record

## 1. How this was done, and its limits

- **Read directly:** the landing page, the experience menu, and the site's published script (about 3.8 MB) with the route/state map, intro copy, pre-questions and asset names.
- **Walked through (observed):** all 12 experiences were clicked through in the browser pane (portrait layout), with the user doing swipes, drags and scrolls. Every topic is recorded except the unfinished Bicycle helmet topic (see section 19).
- **Videos were never played** (survivor videos and "test footage"): automation cannot start them.
- The pane lagged by several seconds: page text is the source of truth, screenshots lag, and a blank page is usually a transition.
- **Correction from an earlier version of the analysis:** an earlier note said the site was blocking automation with hundreds of HTTP 403s on crash-test frames. That was probably wrong; in portrait layout the frames load normally. What blocks automation is swipe/scroll gestures and video playback. (Later, on 13 Oct, the bicycle URL itself returned a CDN 403 "Request blocked", which is a separate, site-level block.)
- Copy is summarised, not reproduced. Quotes are limited to short taglines.

## 2. Site structure and the universal scene template

Landing (title, one-line promise, trauma/crash-depiction warning, "Enter experience") -> Experience menu ("Pick an experience to explore", 12 tiles, mute, search, menu) -> one experience -> back to the menu. Below the tiles: **More learning resources / Learning library** (nine personal-story videos in shuffled order: Jess, Brett Kimmorley and Grace Kemp, Tahlia, Nathan, Heidi, Elijah, Ron "Rambo" Gibbs, Jarrad, Les). Each menu tile has a looping preview clip. About 600 distinct screen/state routes.

The site is a React single-page app (Vite), **DOM-based, no WebGL canvas**. The "3D" is pre-rendered video and JPEG frame sequences (about 150 frames per crash-lab clip), with separate mobile, tablet-portrait and desktop sets, scrubbed by swiping. About 60 audio files cover ambience per scene, transition stingers, six click sounds, menu in/out and feedback tones. Analytics is GA4 with named events (e.g. quiz correct/incorrect per topic).

**The template every experience follows:**

1. **Before we begin:** one prediction question (2-, 3- or 1-column choices, or true/false), "we'll reveal the right answer at the end".
2. **Intro / story:** a start screen, then one or more player choices (a speed, a perspective, a product, a lane) with a confirmation. Several experiences add an "imagine this" framing scene.
3. **Crash lab:** footage of a crash test or simulation for the player's choice, driven by a swipe, often with a toggle (Without/With, Incorrect/Correct, Off/On, star ratings, speed).
4. **Outro / takeaways**, in a fixed order: results (pre-question answer revealed) -> risks -> always remember (3 lines) -> real people story ("People we know" survivor video) -> "The test footage". Some add ratings or signs. Alcohol & drugs omit the lab.
5. Each experience has a one-line headline, an ambience bed and a transition sound.

## 3. Experience index

| # | Experience | Headline | Topics | Recorded |
|---|---|---|---|---|
| 1 | Speed | Every K counts | One | Mostly (messages 2 and 3, always remember, real story not captured) |
| 2 | Pedestrian | Protecting our most vulnerable | Driving, Walking | Yes |
| 3 | Motorcycle | Ride like everything's out to get you | Helmet, Jackets (A tested, B not) | Yes, mostly |
| 4 | Bicycle | Share the road with bicycle riders | Minimum passing distance, Bicycle helmet | Passing distance yes; helmet partly |
| 5 | Heavy vehicle | Be truck aware | Blind spots, Braking distance | Yes |
| 6 | Vehicle safety | Safe vehicle choices save lives | Safety ratings, Safety features | Yes |
| 7 | Drive to conditions | Adjust your driving to stay safe | Rain & floods, Visibility, Road conditions, Snow & ice | Yes (some swipe captions missed) |
| 8 | Child car seats | Make the safest choice for your child | Installation and fitting, Transition from booster seat | Yes |
| 9 | Road rules | Shared roads. Shared responsibility. | Movement rules, Awareness rules | Yes |
| 10 | Road treatments | Safe roads across NSW | One (five treatments) | Yes |
| 11 | Alcohol & drugs | If you drink or take drugs, don't drive | Alcohol, Illicit drugs, Pharmaceutical drugs | Yes |
| 12 | Fatigue | Don't trust your tired self | One | Yes |

## 4. Experience 1: Speed

Headline "Every K counts". Pre-question: chance of life-threatening injury in a head-on crash at 90 km/h (six options in two columns: 34, 55, 67, 75, 90, 96%).

| # | Screen | What happens |
|---|---|---|
| 1 | **Intro** | Title "Speed", three short lines (speed raises crash risk and severity; your choice could cost a life, yours or someone else's; see the difference speed makes). **Start** over a blurred crash-test hall. |
| 2 | **Before we begin** | The pre-question; choosing only outlines the option in yellow and reveals **Continue**. No feedback yet. |
| 3 | **The drive** | Pre-rendered CGI chase view behind a white SUV on a two-lane rural road at dusk, double centre lines, bush, a dark vehicle ahead. No text. |
| 4 | **Speed picker** | Speedometer-style control: **60 / 80 / 90 km/h**, then **Start**. |
| 5 | **The incident** | The drive clip ends on a curve. Caption: you swerve suddenly to avoid a kangaroo and veer into the opposite lane. An oncoming SUV is shown. **Continue**. |
| 6 | **Crash lab** | See-through SUV with a crash-test dummy facing an impact barrier in a test hall. "Swipe up to see what happens." The 60/80/90 switcher stays on screen. The crash is a frame sequence scrubbed by the swipe (about 146 frames per speed). |
| 7 | **"Why risk it?"** | Line chart of serious-injury % against speed: **9% at 60, 37% at 80, 90% at 90 km/h**. A small speed increase raises the chance of life-threatening injury a lot. |
| 8 | **Back to the road** | "Do you need to adjust your speed to suit your surroundings?" **Start**. |
| 9 | **Message 1** | Over an 11-second clip that auto-plays to a pause: wildlife advice (slow down, brake with control, don't swerve). Further messages follow (not fully captured). |
| 10 | **"People we know"** | Optional survivor video (1:53), **Play** and **Continue**. |
| 11 | **Exit** | Returns to the experience menu. |

Not captured: messages 2 and 3, any "always remember" card, the real-crash-story screen, and whether the quiz answer is revealed at the end (the script has "You're correct / You're incorrect" results; this run went straight to the menu).

**Observations:** one narrative thread (a relatable animal-on-the-road incident leads into the lab, advice loops back to the same incident, so "don't swerve" comes from the story); the prediction question is asked up front but answered at the end; the player controls the speed comparison without much text and the chart is the single payoff; minimal interaction (tap, tap, swipe); sober tone, no gore, but a dummy in a destruction sequence and a real survivor story.

## 5. Experience 2: Pedestrian (Driving and Walking)

Intro: "Pedestrian safety / Protecting our most vulnerable". "Pick a perspective to test": **Driving** or **Walking**. Slow to load (about 15 s). Ending (both): "The test footage", a 2:05 video of the 50 km/h stopping test (37 m), plus "More pedestrian resources" and "Next experience". No real-people story screen. Transitions 5-15 s with empty page text.

### Driving perspective

| # | Screen | What happens |
|---|---|---|
| 1 | **Before we begin** | Metres a car needs to fully stop at 50 km/h in dry conditions. Six options: 10, 19, 24, 31, 37, 50 m. |
| 2 | **Speed picker** | CGI city street behind a white SUV; pick **30 / 40 / 50 km/h**, then **Start**. |
| 3 | **The incident** | A pedestrian 25 m ahead doesn't see you and crosses; you need to brake quickly. |
| 4 | **Stopping lab** | Dark test-track view of the car from above, blue overlay. "Swipe up to see what happens." Switchers **Dry / Wet** and **30 / 40 / 50 km/h**. |
| 5 | **Answer reveal** | "You're correct": 37 m to stop at 50 km/h, the length of 3 semi-trailer trucks. |
| 6 | **"Slow down"** | Bar chart of reaction + braking = total stopping distance, dry and wet: 50 km/h **37 m dry / 42 m wet**; 40 km/h **27 / 31 m**; 30 km/h **19 / 21 m**. |
| 7 | **Road conditions intro** | "Let's take a look at the road conditions and think about when to slow down." |
| 8-10 | **Three hazard prompts** (red highlight boxes, non-interactive) | (a) many people walking, can you stop in time if they cross? (b) parked cars block the view for you and pedestrians; (c) shops on both sides but no crossings, where can people cross safely? |
| 11 | **Always remember** | Stop for pedestrians if there's a chance you'll hit them, stopping takes longer in bad weather; extra care around older people and those with limited mobility; stay alert for children. |

### Walking perspective

| # | Screen | What happens |
|---|---|---|
| 1 | **Before we begin** | How much more likely is a pedestrian to die when hit at 50 km/h compared to 40 km/h? **1.5x, 2x, 4x**. |
| 2 | **Scene setup** | Aerial 3D model of a town street; you're the pedestrian wanting to cross to the shop opposite. |
| 3 | **Rule** | "Legally, you must use a pedestrian crossing if there's one within 20 metres." |
| 4 | **Choose a point** | Markers **A, B, C** along the pavement; choose the safest point to cross with no crossing nearby. |
| 5 | **Feedback per point** | **B (wrong):** don't cross on a bend or curve; **Try another point**. **A (right):** the pedestrian refuge is the safest option; **See point C**. **C (wrong):** the direct route, but parked cars block your view and drivers'. Each fly-through takes 20-40 s. |
| 6 | **Answer reveal** | "You're correct": more than twice as likely to die at 50 km/h than at 40 km/h. |
| 7 | **"Be aware, cross with care"** | Bar chart "Chance of death %": about **40% at 40 km/h, 90% at 50 km/h** (as drawn). Stop, look, listen and think; wear bright, light or reflective clothing at night. |
| 8 | **Always remember** | Choose the safest place to cross and use a crossing if there is one; keep looking both ways; never assume a driver can see you or will stop. |

**Observations:** same spine as Speed with a different payoff per perspective (measured stopping distance for Driving; a decision with immediate feedback for Walking). Driving offers two comparison controls (weather and speed). Walking has no swipe: a wrong choice teaches instead of ending the run, with retry. The Driving hazard prompts are cheap to reproduce as annotated scenes.

## 6. Experience 3: Motorcycle (Helmet and Jackets)

Intro: "Motorcycle safety / Ride like everything's out to get you." Riders are more exposed; your gear is the only thing between you and the road. Topics: **Motorcycle helmet**, **Motorcycle jackets**. Survivor video: Heidi (2:35), same in both topics. Test footage: helmet 2:01 (test lab exterior), jackets 0:29 (two jackets with stars). Not played.

### Helmet topic

| # | Screen | What happens |
|---|---|---|
| 1 | **Before we begin** | "A 1-star helmet gives you a 40% chance of a skull fracture in a crash. What's the chance with a 5-star helmet?" **1% / 20% / 40%**. |
| 2 | **Story setup** | CGI chase view behind a rider; you and a friend share one helmet for a short ride. |
| 3 | **Incident** | A white SUV turns right across the rider's path. "You're not wearing a helmet. Let's see what happens when you fall." No crash footage. |
| 4 | **Helmet lab (Off)** | Bare crash-test head form on a swing arm. "Swipe up to see what happens." Toggle **Helmet Off / On**. |
| 5 | **After the drop** | Head form cut away with a red stylised cross-section of the damage (not realistic gore). |
| 6 | **Helmet lab (On)** | Same head form in a black helmet. |
| 7 | **Answer reveal** | "You're incorrect": only a 1% chance of a skull fracture with a 5-star helmet. Analogy: no helmet is like a car hitting a wall with no brakes; with a helmet it is like brakes and airbags. |
| 8 | **Helmet ratings** | 5-star far more protective than 1-star; full-face often scores higher than open-face. Links to MotoCAP.com.au. |
| 9 | **Always remember** | Approved helmets are the law for riders and pillions; helmet fitting link; ride under the speed limit and to the conditions. |

### Jackets topic

| # | Screen | What happens |
|---|---|---|
| 1 | **Before we begin** | "Where do you find a motorcycle jacket's safety rating?" **On the tag / On the jacket / MotoCAP.com.au**. |
| 2 | **"Imagine this"** | Shopping for a jacket; two options at the same price, **Jacket A** or **B**, plus "Reveal their MotoCAP ratings". |
| 3 | **Rating revealed after choosing** | "You chose a jacket with a 0.5-star safety rating." (Jacket A.) |
| 4 | **Slip** | The rider slips on a curve and loses balance. |
| 5 | **Crash lab** | Rider and bike slide toward a barrier in a test hall. "Swipe up to see what happens." Then "Jackets provide varying levels of protection." |
| 6 | **Jacket damage view** | Figure from behind in a torn, scuffed jacket: "left you with skin abrasions and muscle damage". **Rating 0.5 / 5** toggle shows the 5-star jacket intact. |
| 7 | **Answer reveal** | "You're incorrect": you're unlikely to find the rating on the tag or jacket; visit MotoCAP. "Wear all the gear all the time." |
| 8 | **Jacket ratings** | 5-star jackets use abrasion-resistant materials, strong seams and effective armour. |
| 9 | **Always remember** | Research MotoCAP ratings before you buy; choose a high safety rating; ride under the speed limit and to the conditions. |

**Observations:** story scene before the lab; two A/B devices (Helmet Off/On and star toggles); the rating is hidden until you choose, so the choice becomes the lesson; damage shown as a stylised cutaway or torn jacket, not gore; heavy use of authoritative external links (MotoCAP).

Not captured: Jacket B, the three videos, the 5-star jacket's swipe result.

## 7. Experience 4: Bicycle (Passing distance and Helmet)

Intro: "Bicycle safety / Share the road with bicycle riders." Topics: **Minimum passing distance**, **Bicycle helmet**. Passing-distance survivor video: Ron (1:10); test footage 0:33 ("Driving 50km/h without 1m gap"). Not played. "Next experience" appears to follow visit history.

### Minimum passing distance

| # | Screen | What happens |
|---|---|---|
| 1 | **Before we begin** | True/false: "You must always leave the same distance between your car and a bicycle rider when passing - no matter what the speed limit is." |
| 2 | **Story setup** | CGI city street, driving to work; a rider (green top) ahead in your lane. |
| 3 | **In-scene question** | Driving at 55 km/h, minimum passing distance? **0.5 m / 1 m**. |
| 4 | **Lab** | Top-down view; "Swipe up to see what happens." **Distance 0.5 m / 1 m** toggle. At 0.5 m the rider ends up fallen beside their bike. |
| 5 | **Rule diagram** | Interactive red half-circle safety zone beside the car. 1 m: at least 1 m when 60 km/h or under. 1.5 m: at least 1.5 m when over 60 km/h. |
| 6 | **Answer reveal** | Wrong pick ("True"): "You're incorrect." 1 m at 60 or under; 1.5 m over 60. |
| 7 | **Always remember** | 1 m at 60 km/h or less, 1.5 m if faster; passing too close can seriously hurt or kill; you can cross single or double white lines to pass a rider if safe. |

### Bicycle helmet (partly captured)

| # | Screen | What happens |
|---|---|---|
| 1 | **Before we begin** | "By what percentage can wearing a bicycle helmet reduce the risk of head injury?" **40% / 60% / 70%**. |
| 2 | **"Imagine this"** | Shopping for a helmet, two options; **Helmet A** or **B**, plus "Reveal their Helmet STAR ratings". (B was picked and turned out to be the 5-star helmet; the rating is likely hidden until the choice.) |
| 3 | **Story** | You're commuting to work; a parked car's door suddenly opens in your path. No crash footage. |
| 4 | **Helmet lab** | Head form with a vented helmet on a swing arm. "Swipe up to see what happens." Toggle **Rating 5-star / 1-star**. |
| 5 | **After the swipe** | Stylised cutaway of the head and brain. **1-star:** close to the minimum allowable performance, protection could be improved (bright orange, bruised brain). **5-star:** performs strongly across all tests, far exceeding the minimum and substantially reducing the risk of a life-threatening head injury (pale brain, small red area). A further swipe moves on. |

Not captured: the answer reveal for the 40/60/70% question, any ratings screen, the "Always remember" card, and this topic's ending videos. A re-attempt on 13 Oct was blocked by a site-level 403 (see section 19).

**Observations:** the rule diagram turns a numeric rule into a visible zone beside the car, the most reusable part; the hidden-rating choice and star toggle repeat the Motorcycle jackets device; the helmet lab shows a stylised brain cutaway, not a person; legal nuance is included (you may cross the line to pass if safe).

## 8. Experience 5: Heavy vehicle (Blind spots and Braking distance)

Intro: "Heavy vehicle safety / Be truck aware: heavy vehicles have bigger blind spots and take longer to stop."

### A. Blind spots

1. **Pre-question:** heavy vehicles are 2% of NSW registrations, what % of road crash deaths involve them? 1.9% / 9.1% / 19%. (I picked 9.1%.)
2. **Setup:** CGI multi-lane highway; you are the car driver on the left of a semi-trailer.
3. **Story beat:** the truck is indicating left and you are in its blind spot. "Let's take a look at how big the blind spot is."
4. **Lab 1, swipe:** top-down/side view of the truck and white SUV (no on-screen text).
5. **Lab 2, place your car:** "Scroll up or down to place your car in the safest position, outside of the truck driver's left blind spot." Driver mirror view at the edge; **Confirm position**. "Correct": the driver can see your car; always make sure you can see the driver in the side mirrors; falling behind is safest. The blind-spot zone is a yellow wedge.
6. **Lab 3, tap road users:** 18 road users around the truck; "Tap on all the road users that are in the truck driver's blind spots." **Confirm selection**. Feedback "Almost": red = outside blind spots, orange = in blind spots you missed, green = correct.
7. **Overview:** four numbered zones drawn on the truck.
8. **Zone walk-through (Next x3):** 1 Left (many crashes; people walking/cycling should avoid it near intersections). 2 Right (smaller but just as dangerous). 3 Front (can't see motorcycles, bikes, pedestrians near the front, especially at lights; motorcyclists should avoid lane filtering; no one should cut in front). 4 Rear (if you can't see the truck's mirrors the driver can't see you; keep at least a 3-second gap).
9. **Answer reveal:** heavy vehicles are 2% of registrations but 19% of road crash deaths over 5 years; "Heavy vehicle crashes are serious due to their size and weight."
10. **Always remember:** trucks often use more than one lane when turning, leave the lane beside them free; stay 3 seconds behind (4 in wet); if in a blind spot, slow down to move out, don't speed up.
11. **The test footage** (0:30, not played), "More heavy vehicle resources", "Next experience".

### B. Braking distance

1. **Pre-question:** "How many metres does a heavy loaded truck need to fully stop when travelling at 60km/h?" 30 / 45 / 52 / 61 / 70 / 84 m. (I picked 61.)
2. **Setup:** you're on the right beside the truck, both at 80 km/h, turning left soon.
3. **Decision:** the lights turn yellow; wait behind the cars in this lane, or move into the left lane in front of the truck. (I chose Move into left lane.)
4. **Per-choice feedback:** "Bad idea. Heavy vehicles need more time to stop. You should have waited in your lane. Cutting in front of trucks is a common cause of car crashes." (Stay-in-lane feedback not seen.)
5. **Crash/lab reveal:** top-down view of a truck braking right behind a car; "At 80km/h a truck needs 131m to stop." Note "About this test": braking distances change with truck type, load, brakes and conditions; one example.
6. **Speed comparison toggle 40 / 60 / 80 km/h (dry road):** 47 m (about 2 tennis courts), 84 m (about 3 basketball courts), 131 m (about a football field).
7. **Answer reveal:** "You're incorrect": at 60 km/h a heavy loaded truck can take 84 m to stop, nearly the length of a football field.
8. **Takeaway "Watch for trucks":** trucks need more time and distance; never take away the space they need by cutting in front.
9. **Always remember:** never cut in front of a truck or step out in front of one; think about a truck's stopping distance before changing lanes in front of one; leave at least a 3-second gap.
10. **The test footage** (0:44, not played).

**Observations:** new mechanics are place-the-vehicle, tap-all-that-apply with a three-colour verdict (green/orange/red), and a go/no-go driving decision with an explanatory verdict then a crash reveal. Feedback tone is "Correct / Almost / Bad idea / You're incorrect", always with the reason. Distance analogies are tangible (tennis courts, football field). Zones are numbered 1-4 with one sentence each. The test is flagged as one example, an honesty pattern.

Not captured: survivor video, test footage, Stay-in-lane feedback, swipe-scrub detail.

## 9. Experience 6: Vehicle safety (Safety ratings and Safety features)

Intro: "Safe vehicle choices save lives. See how your choice of car could save your life, or someone else's." Topics: **Safety ratings**, **Safety features**.

### Topic 1: Safety ratings

1. **Pre-question:** how many times more likely are people in a 1-star car to suffer a serious head injury than those in a 4-star car? 3x / 4x / 5x. (I picked 4x.)
2. **Imagine this:** buying a second-hand ute, two options at the same price. Ute A (blue), Ute B (white). "Reveal Used Car Safety Ratings".
3. **Ratings reveal:** Ute A = 1 star, Ute B = 4 stars; Used Car Safety Ratings range from 1-star (lowest) to 5-stars. Pick a ute to test (I picked A).
4. **Consequence story:** "You chose a ute with a 1-star safety rating." In a moment of distraction you veer into the opposite lane and crash into an oncoming 4-star ute.
5. **Lab (swipe up):** side-on CGI of the two utes meeting; "Let's take a look at how a safer car can protect the driver and the passenger."
6. **Injury protection view:** two crash-test dummies coloured by injury risk, legend Good / Adequate / Marginal / Weak / Poor. Toggle 1 / 4 rating: 1-star mostly red; 4-star mostly green with some orange/yellow on driver legs and a little red on the passenger's lower leg.
7. **Answer reveal:** "You're incorrect": 5x as likely to suffer a serious head injury in a 1-star car vs a 4-star car; also 9x as likely to suffer a life-threatening chest injury.
8. **Takeaway "Used Car Safety Ratings":** check before you buy; choose a high protection rating within budget at safevehicles.com.au.
9. **Always remember:** choose the safest vehicle within budget (expensive doesn't always mean safest); a crash may not be your fault but a high rating protects you and others; visit safevehicles.com.au and check ANCAP new car ratings.
10. **People we know:** survivor video, Nathan (1:24, not played). **The test footage** (0:33, not played).

Not captured: the Ute B path, videos.

### Topic 2: Safety features

Intro: "Advanced Driver Assistance Systems include active safety features. Let's explore key ones."

1. **Pre-question:** "Autonomous Emergency Braking (AEB) can reduce rear-end crashes by how much?" 5% / 25% / 35%. (I picked 25%, wrong.)
2. **Feature carousel (6 cards, 1/6 to 6/6):** ESC (brakes individual wheels and cuts power if you start to lose control), Lane Keep Assist (steers or brakes to keep you in lane), AEB (warns and brakes automatically if you don't react), Backover AEB (detects people and vehicles behind you in reverse and brakes), Intelligent Speed Assistance (shows the speed limit and alerts you if you exceed it), Driver Monitoring Systems (alerts for dangerous driving; detects fatigue, distraction or impairment).
3. **Pre-question reveal:** "You're incorrect": cars fitted with AEB were 35% less likely to crash into the car in front. "Safety features like these can prevent crashes and save lives."
4. **Six scenario rounds, same loop** (set-up line, Start, short 3D clip, 4-option "Which safety feature has prevented this crash?", Confirm, "Correct" with a stat, "Next safety feature"):
   - Reversing out of the driveway to pick up groceries (a person behind the car): **BAEB**, avoids backing into others, especially people walking or riding bicycles.
   - On your way to visit family (highway, car alongside): **LKA**, steers you back when drifting; reduces high-speed and run-off-road crashes by 22%.
   - On your way to dinner (skid icon): **ESC**, helps keep the car stable if you swerve or skid; prevents single-vehicle and roll-over crashes.
   - Usual route to work (60 km/h reduce-speed sign; question "Which safety feature has helped prevent unsafe driving?"): **ISA**, alerts you when you go over the limit.
   - Driving to an appointment ("The driver in front realises their tyre is flat."): **AEB**, helps avoid or reduce nearly 1/3 of all light vehicle crashes.
   - Road trip, almost 2 hours of driving ("You veer off the road while in a microsleep."): **DMS**, warns if you're tired or distracted; reduces fatigue crashes, as dangerous as drink driving.
5. **Always remember:** safety features aren't only on expensive cars, so choose the safest car you can afford with as many as possible; keep them on all the time; stay alert, you're responsible for driving safely.
6. **People we know:** Nathan (1:24, not played).

I got 6 of 6 scenarios right (icon and scene cues) and the pre-question wrong. Scenes took 30 seconds or more to load in the in-app browser and the page did not respond reliably to automated clicks.

**Observations (Vehicle safety):** hidden-rating A/B product choice as in Motorcycle and Bicycle; injury shown as a colour-coded dummy pictogram (no blood or wreckage); Safety features is "teach, then test, then repeat" with icon and scene clues; every scenario is an everyday trip; stats arrive on the reward screen; closing line returns responsibility to the driver; the DMS round links to Fatigue.

## 10. Experience 7: Drive to conditions (Rain & floods, Visibility, Road conditions, Snow & ice)

Intro: "Adjust your driving to stay safe. The weather can change quickly. Learn how to adapt your driving when it does." The survivor video (Jamie, 1:31) is shared across topics.

### A. Rain & floods

1. **Pre-question:** in the last 5 years, how many NSW crashes involved flooded or submerged vehicles? 24 / 160 / 225 / 350. (I picked 160.)
2. **Story:** "You're on your way to work and are running late." White SUV on a wet rural road with standing water.
3. **Wet-weather beat:** "Driving in wet weather requires extra care. It's important to drive to the conditions."
4. **Swipe drive-through 1:** caption "Turn on your headlights, even during the day."
5. **Swipe drive-through 2:** approach to a flooded crossing; caption "Flooding can make the road slippery, raise water levels quickly, sink cars, damage roads, conceal hazards and make it harder to control your vehicle."
6. **Answer reveal:** "You're incorrect": 225 crashes involving flooded or submerged vehicles; 15 people died, 195 were injured, 15 were tow-away only.
7. **Takeaway "Slow down":** at 80 km/h on a wet road stopping distance increases by 26 m; bar chart dry 69 m vs wet 95 m.
8. **Always remember:** avoid unnecessary travel and check Live Traffic NSW; never drive, walk or ride through floodwater, turn around; learn how to prepare for extreme weather travel.
9. **People we know:** Jamie (1:31, not played). **Test footage** (1:21, not played).

### B. Visibility

1. **Pre-question:** "If you're driving in fog or dust, which lights should you use?" High beam / Spotlights / Fog lights or hazard lights. (Picked fog or hazard lights; correct.)
2. **Story:** "You're on a road trip for the long weekend." Outback-style road at dusk.
3. **Branch picker:** Dust / Fog (I chose Dust first).
4. **Dust swipe lab:** amber dust-storm look; "Use your fog lights if you have them or hazard lights with your low beam headlights."
5. **Fog swipe lab:** grey fog look; the Fog branch followed automatically after Dust.
6. **Answer reveal:** "You're correct": use low beams when visibility is low; if you can't see beyond 100 m use fog lights; if none, low beams and hazard lights.
7. **Always remember:** avoid travel in dust or fog where possible and slow down; don't overtake in poor visibility, pull over and wait; turn on your lights, and set air-con to recirculate to keep dust out.

### C. Road conditions

1. **Pre-question:** "How many seconds should you leave between you and the vehicle in front of you on a dirt or gravel road?" 2 / 3 / 4+ seconds. (I picked 3.)
2. **Story:** "You're visiting a mate who has just moved to the country." White SUV on a yellow gravel road with a car ahead.
3. **Swipe drive:** "Swipe up to see how to keep safe on different road conditions." (In-drive captions not captured.)
4. **Answer reveal:** "You're incorrect": leave at least a 4-second gap in poor conditions such as gravel, icy or wet roads, or at night.
5. **Always remember:** slow down and keep left on narrow roads with no line markings; increase following distance and be ready for oncoming vehicles, dust or loose gravel; at sunrise/sunset keep the windscreen clean, wear sunglasses and use low beams.

### D. Snow & ice

1. **Pre-question:** "When driving in snowy conditions, how much extra distance can it take to come to a complete stop?" 2x / 5x / 10x normal distance. (I picked 5x, wrong.)
2. **Story:** "You're on your way to the Snowy Mountains for a ski trip."
3. **Intro and branch picker:** "Snow and ice can cause the road to become slippery. Your tyres lose traction and it can take your vehicle much longer to stop." Buttons Snow / Ice (I picked Snow; the second branch followed automatically).
4. **Snow swipe lab:** "Swipe up to see how you should navigate driving in snow." Last card: use your headlights during the day, use fog lights in poor visibility, be extra careful at night, dawn and dusk as hard-to-see black ice can form and remain in shaded areas.
5. **Ice swipe lab:** "Swipe up to see how you should navigate driving on ice." (captions not captured.)
6. **Answer reveal:** "You're incorrect": stopping distances can be up to 10 times longer than normal; leave at least 4 seconds by picking a roadside object and counting.
7. **Always remember:** some conditions can be managed with adjustments (driving slower, snow chains) while others, like extreme weather and poor visibility, should be avoided altogether; learn when snow chains should be used and how to fit them; prepare before you set out (links).
8. **People we know:** Jamie (1:31, not played).

**Observations:** swipe-to-drive narrative with one caption per beat; Visibility and Snow & ice use a branch picker with a shared reveal; no decision-with-consequence inside the lab, the pre-question and reveal carry the learning; following distance escalates with conditions (3 s normal, 4+ s gravel/wet/night/snow); the Always remember lines give an adapt-versus-avoid rule; links to official resources (Live Traffic NSW).

## 11. Experience 8: Child car seats (Installation and fitting; Transition from booster seat)

Intro: "Make the safest choice for your child. Securing your child correctly and in the right car seat can reduce their risk of injury or death in a crash."

### Installation and fitting

1. **Pre-question:** in a 2024 study, what percentage of children were correctly restrained with no serious errors? 33 / 41 / 56 / 98%. (56% registered, which was correct.)
2. **Story:** "You're on your way home with your child in their car seat in the back." Crash set-up: a distracted driver crosses into your path and hits you head-on.
3. **Lab 1, installation (swipe up + Incorrect/Correct toggle):** sled-test rig with a child dummy; incorrect installation lets the dummy rotate forward, correct holds.
4. **Common installation mistakes (swipe up):** callouts went by and were not captured.
5. **Lab 2, fitting (swipe up + Incorrect/Correct toggle):** securing the child correctly; then how to restrain your child correctly.
6. **Answer reveal:** "You're correct": only 56% of children were correctly restrained with no serious errors.
7. **Takeaway "Fit their seat correctly":** a review of NSW child passenger deaths found about 3 in 10 could have been prevented with an approved restraint used properly; 10-figure pictogram with 3 highlighted.
8. **Always remember:** child car seats save lives only when used correctly, check every trip; visit childcarseats.com.au; every car, child and seat is different, have it fitted or checked at an authorised child restraint fitting station.
9. The flow then returned to the hub (no survivor video or test footage in this run).

### Transition from booster seat

1. **Pre-question:** among children aged 7 to 12 using an adult seatbelt, how many had a safe belt fit? 40 / 60 / 80%. (I picked 60%.)
2. **Story:** on your way to an appointment; you drive too close to the car in front and hit them.
3. **Lab 1, booster vs none (Without/With booster toggle):** without a booster the dummy slides under the lap belt.
4. **Lab 2, moving out too early:** the dummy is highlighted red where the belt rides up onto soft areas.
5. **5 step test (stepper, 1/5 to 5/5):** back against the seat; knees bent over the front edge; sash belt mid-shoulder; lap belt across the top of the thighs; remains in position for the whole trip, meeting all 5 at once.
6. **Answer reveal:** "You're incorrect": only 40% achieved a good overall belt fit.
7. **Takeaway "Booster seat transition":** restraints spread crash force across stronger parts of the body; a belt across the abdomen, neck or underarm risks serious injury.
8. **Always remember:** secure your child in a restraint that suits their size and age; for ages 7 to 16 use the 5-step test (old enough by law is not the same as fitting safely); check the restraint and buckles every trip.

**Observations:** sled-test lab with a binary toggle (same camera, different outcome, no gore); two labs in Installation (longer than other topics); the "3 in 10 preventable" pictogram is easy to rebuild; the 5 step test is a reusable checklist pattern; both pre-question stats were lower than most guess; long loading screens between labs.

## 12. Experience 9: Road rules (Movement rules and Awareness rules)

Intro: "Road rules. Shared roads. Shared responsibility. Test your knowledge of the most misunderstood NSW road rules." A quiz-led experience with no lab or footage: one pre-question, then four scenarios with a narrated set-up line, a binary or 3-way choice, and an immediate Correct/Incorrect screen with a plain-language rule, then a score screen that reveals the pre-question answer.

### Movement rules

1. **Pre-question (True/False):** "The rules for merging are the same, no matter what the road markings look like." (I picked True, wrong.)
2. **Intro:** "You're about to see 4 road rule scenarios that many people get wrong."
3. **Scenario 1, roundabout:** who must give way? You: **Correct**; give way to vehicles already in the roundabout, signal when turning and when exiting if practical.
4. **Scenario 2, U-turns (two questions):** U-turn here? Yes: **Incorrect** (not across a single or double unbroken dividing line, including motorways). U-turn at traffic lights? No: **Correct** (not at an intersection with a "No U-turn" sign or at lights unless "U-turn permitted").
5. **Scenario 3, highway lane ending:** who gives way? Other car: **Incorrect, you must give way** to traffic in the lane you're moving into. Follow-up with no lane markings and a car behind: I picked You: **Incorrect, the other car must give way** (zipper merge).
6. **Scenario 4, 100 km/h multi-lane highway:** lane if not overtaking or exiting? Middle: **Correct** (left or middle); on multi-lane roads over 80 km/h use the right lane only to overtake, turn right, avoid obstacles or in congestion.
7. **Score:** "Needs improvement. Your score: 3/6." (6 scored items.)
8. **Pre-question reveal:** "You're incorrect" (answer False): merging rules differ with markings.
9. **Always remember:** all road users should know the NSW road rules; read the Road User Handbook; the road is there to share and road safety is everyone's responsibility.
10. **People we know:** Heidi (2:35, not played).

### Awareness rules

1. **Pre-question (3 options):** in the past 5 years, how many pedestrians were killed or seriously injured after being hit by a vehicle turning at an intersection? 12 / 185 / 411. (I picked 185, wrong.)
2. **Scenario 1, headlights (rural road in the dark):** Regular: **Correct**; fog lights only in fog or mist; high beam only when more than 200 m from a vehicle ahead or oncoming (the page text reads "less than 200m", which looks like a wording slip; verify before reuse); headlights on at all times.
3. **Scenario 2, following distance (suburban street):** 3 seconds: **Correct**; 4+ in poor conditions, 5+ at high speeds.
4. **Scenario 3, yellow light:** Drive through: **Incorrect**; you must slow down and stop before the white line if safe.
5. **Scenario 4, turning right into a side street with pedestrians crossing:** You give way: **Correct**.
6. **Score:** "So close. Your score: 3/4."
7. **Pre-question reveal:** "You're incorrect": **411** pedestrians killed or seriously injured by turning vehicles in 5 years.
8. **Always remember:** same three lines as Movement rules.

**Observations:** score-gated feedback with banded labels gives a satisfying "I got it wrong" moment, and the delayed pre-question reveal closes the loop; every wrong answer has a one- or two-sentence reason, which is the real teaching content; legal exactness matters so the local rule must be correct; fast pace (about 8 to 10 taps per scenario); the set-up lines chain into one continuous trip; a survivor video attached to a rules quiz links consequence to rule-breaking but is care-sensitive.

## 13. Experience 10: Road treatments

Intro: "Safe roads across NSW. Safe roads are designed and built to be more forgiving when we make mistakes." Single topic. Same quiz-with-narrated-scenario template as Road rules, but every question is a "how much does X reduce risk" percentage guess (three numeric options), then a one-line crash scene and a verdict with the exact claim. No lab or toggles.

1. **Pre-question:** how many kilometres of NSW state roads now have rumble strips? 1100+ / 1400+ / 1700+ km. (I picked 1400+, correct.)
2. **Wide centreline or painted median:** reduces head-on crash risk by? 30 / 40 / 50%. (I picked 40%, correct.) Scene: distracted, you swerve across the centreline. Up to 40% fewer head-on crashes.
3. **Rumble strips:** reduce the chance of leaving the lane by? 10 / 20 / 25%. (I picked 20%, incorrect.) Scene: a microsleep woken by rumble strips. Up to 25%, and up to 50% fewer head-on deaths and injuries combined with wide centrelines.
4. **Wire rope barrier:** reduces head-on crash severity by? 75 / 85 / 95%. (I picked 85%, incorrect.) Scene: you veer into the barrier which stops a more serious head-on. Up to 95% less severe.
5. **Curve alignment markers:** reduce the risk of running off on a bend by? 15 / 20 / 30%. (I picked 20%, correct.) Up to 20% fewer off-road crashes.
6. **Roundabouts:** reduce intersection crash risk and severity by? 65 / 75 / 85%. (I picked 75%, incorrect.) Up to 85% fewer intersection crashes and 65% lower pedestrian crash severity.
7. **Pre-question reveal:** "You're correct. NSW state roads have 1400+ kilometres of rumble strips."
8. **Always remember:** safe roads are designed to forgive human error ("roads should connect lives, not take them"); safe roads, speeds, vehicles, people and post-crash care work together; pay attention to safety features and stay alert.
9. **The test footage:** 2:08 (not played). No survivor video for this experience.

I got 3 of 5 treatment questions right plus the pre-question; no score screen was seen.

**Observations:** the last Always remember line names the five Safe System pillars (roads, speeds, vehicles, people, post-crash care), the closest the Lab gets to a thesis; a pure percentage-guess format is cheap but forgettable, the scene line anchors each number to a human error; it reframes the player as fallible and the road as forgiving, a non-blaming tone; the claims are NSW agency "up to" claims, treat as marketing-grade until sourced.

## 14. Experience 11: Alcohol & drugs (Alcohol, Illicit drugs, Pharmaceutical drugs)

Intro: "If you drink or take drugs, don't drive. You might feel okay but driving after alcohol or drugs can have more of an impact on you than you think." Mechanic: a quiz-and-consequence ladder with no lab: pre-question, then true/false, multiple-choice and select-all questions, each with a verdict and a plain-language reason. The survivor video is shared across all three topics (Bridget and Leila, 3:50, not played).

### Alcohol

1. **Pre-question:** what percentage of NSW road deaths last year involved alcohol as a contributing factor? 5 / 10 / 15%. (I picked 10%, wrong.)
2. **Legal framing:** illegal to drive or supervise a learner over your legal BAC limit, which depends on your licence and vehicle type.
3. **T/F:** alcohol can affect reaction time after just one drink (True, **Correct**). Alcohol can affect balance but not driving because you're seated (False, **Correct**).
4. **Consequence set-up:** job loss, legal fees, fines and a criminal record.
5. **Quiz, suspension:** first low-range offence? Picked 3+ months: **Correct** (3-month suspension).
6. **Quiz, fine:** first low-range offence? Picked $450: **Incorrect**; at least $722.
7. **Safer choices:** designated driver who decides to drink: find alternative transport (**Correct**). When are you safe to drive home? Picked "1 hour for every drink": **Incorrect**; there isn't a set amount of time.
8. **Select-all:** factors affecting how long alcohol stays in your body (size/weight/health, drugs, food, amount, type, environment/stress): selected all six, **Correct**.
9. **Reveal:** "You're incorrect": alcohol is a contributing factor in **15%** of NSW road fatalities, **18%** on country roads.
10. **Takeaway "Don't risk it":** line chart of crash risk against BAC: about 1.1 at 0.02, 1.3 at 0.04, 1.6 at 0.06, 2.7 at 0.08.
11. **Always remember:** if you're going to drink, don't drive; plan a way home; choosing could be the difference between causing a crash and hurting or killing someone.
12. **People we know:** Bridget and Leila (3:50, not played).

### Illicit drugs

1. **Pre-question:** in the last 5 years, how many NSW road deaths involved drugs? 182 / 359 / 490. (I picked 359, correct.)
2. **Three offences:** drug presence (cannabis, MDMA, cocaine, methamphetamine), driving under the influence, and combined drug and alcohol.
3. **T/F:** cannabis slows reaction time (True, **Correct**); stimulants won't make you lose focus (False, **Correct**); opiates (heroin, opium, codeine, methadone) can affect driving (True, **Correct**).
4. **Consequence set-up:** loss of licence, fines, court costs, vehicle confiscation, prison term, criminal record.
5. **Quiz:** suspension for drug presence? 3+ months (**Correct**); police run 200,000+ roadside drug tests a year. Fine for first offence? $700+ (**Correct**; at least $722).
6. **Safer choices:** judge by how you feel? No (**Correct**). How long to wait before driving? "No set amount of time" (**Correct**).
7. **Select-all:** factors influencing how long drug effects last: all six, **Correct**.
8. **Reveal:** "You're correct": **359** people killed in 5 years where drugs were a factor.
9. **Always remember:** if you take drugs, don't drive; drugs affect you even if you feel "in control"; penalties include loss of licence, heavy fines and imprisonment.

### Pharmaceutical drugs

1. **Pre-question (True/False):** "If you're prescribed a medicine, you don't need to check whether it can affect your driving." (I picked False, correct.)
2. **Framing and DUI note:** many medicines affect driving; you can be charged with DUI if affected by prescription drugs.
3. **T/F:** a prescribed medicine can't affect driving (False, **Correct**); if it doesn't make you feel impaired it won't affect driving (False, **Correct**), e.g. cold and flu medicines, sleeping tablets, antihistamines, anti-depressants, anti-anxiety medications.
4. **Risk and consequence screens:** crash risk to you, passengers and others; DUI consequences as above.
5. **Quiz, disqualification:** minimum disqualification for a first DUI offence? Picked 3 months: **Incorrect, 12 months**.
6. **Safer choices:** new prescription and feeling drowsy: talk to your doctor (**Correct**). Prescribed medication that may affect driving but need to drive to work: plan another way (**Correct**).
7. **Reveal:** "You're correct": always ask your doctor or pharmacist whether a medicine is safe to drive on.
8. **Always remember:** if unsure whether your medication affects your driving, don't drive; ask your doctor or pharmacist and arrange another form of transport; driving under the influence of pharmaceutical drugs is illegal if they impair you.

**Observations:** legal consequences carry a lot of the weight; the BAC risk curve is the only chart and is a simple rebuildable "non-linear risk" visual; the designated-driver scenario is a social decision, the most reusable idea for a game; **"don't judge by how you feel"** is the shared thesis; the urban/rural split (15% / 18%) is worth copying for Namibia; the pharmaceutical topic targets a blind spot and ends with a doctor/pharmacist action; BAC bands (0.02 to 0.08) are NSW-specific; all three topics are text-heavy.

## 15. Experience 12: Fatigue

Tagline: "Don't trust your tired self. See how your driving is affected when you're tired and how you can keep everyone safe." Single topic (Start only).

1. **Pre-question:** what percentage of fatal NSW crashes involved fatigue? 5 / 12 / 17%. (I picked 12%, wrong; answer 17%.)
2. **Scene setup:** "You're driving to the shops and are feeling tired." Then "You fall into a microsleep and veer off the road into a tree."
3. **Swipe lab:** "Swipe up to see the effect of this head-on crash due to a microsleep." (the user swiped.)
4. **Distance toggle:** "how far you travel at 100km/h with your eyes shut during a microsleep": 0.5 s / 2 s / 4 s gives **13.9 m / 55.6 m / 111 m**.
5. **Signs of fatigue:** excessive yawning, poor concentration, restlessness, slow reactions, oversteering, drowsiness, sore/tired eyes. "Don't wait for a microsleep, by then it's too late."
6. **Reveal:** "You're incorrect. Fatigue was involved in 17% of fatal crashes in NSW."
7. **Takeaway:** driving while fatigued can be just as dangerous as drink driving; the risk increases significantly after long periods without a break.
8. **Always remember:** don't drive if tired, recognise the signs, swap drivers; plan trips in normal awake hours with regular rest breaks; if tired, stop in a safe place and rest or nap before continuing.
9. **People we know:** Brett and Grace (2:34, not played).

**Observations:** shortest template variant (no quiz ladder or score screen seen); the strongest mechanic is the microsleep distance toggle (time x speed = metres), easy to rebuild with a distance bar on a road strip; the fatigue/drink-driving equivalence claim is stated without a number on screen.

## 16. Cross-experience patterns

- **One spine, many skins:** prediction question up front, answered at the end; choice; consequence; reveal with the real figure; three-line "Always remember"; survivor story; test footage.
- **Toggle labs** (Without/With, Incorrect/Correct, Off/On, star ratings, speeds, distances) replay the same impact with a different outcome. Cheap and comparable.
- **Hidden-rating A/B product choice** (Motorcycle jackets, Bicycle helmets, Vehicle ute ratings): choose before or without knowing the rating, then see what it meant.
- **Quiz ladders** with verdict screens and plain-language reasons (Road rules, Road treatments, Alcohol & drugs, Safety features) carry the most teaching content for the least asset cost; wrong answers are the main teaching moment.
- **Pictograms and charts instead of gore:** dummy colour maps, 3-in-10 icon arrays, brain cutaways, bar and line charts, distance analogies (tennis courts, football field).
- **"Don't judge by feel"** thesis: Alcohol & drugs, Fatigue, Vehicle safety, Drive to conditions.
- **Safe System framing** (roads, speeds, vehicles, people, post-crash care) appears most clearly in Road treatments.
- **Non-blaming tone:** the player is a normal, occasionally distracted driver, and the system (road, vehicle, rules) forgives or fails to forgive.
- **Following distance escalates with conditions** (3 s normal, 4+ s wet/gravel/night/snow), consistent across Heavy vehicle, Road rules and Drive to conditions.
- **Links to official resources** (MotoCAP, safevehicles.com.au, ANCAP, Live Traffic NSW, Road User Handbook, childcarseats.com.au) close many experiences.
- **Technical:** pre-rendered video and frame sequences, no WebGL; slow loads (30 s or more per scene in the in-app browser) and scene transitions that look blank.

## 17. Safe Roads World implications (all experiences)

- **The pattern is the same as our speed mission** (prediction -> choice -> consequence -> reveal -> takeaway); the template in section 2 is a good spine for every Lab experience.
- **Their scale is video production, not game code.** Our photo-swap or 2D crash lab is the right-sized equivalent; a lightweight 2D rebuild would also load much faster on low-end phones and weak data.
- **Strong reusable mechanics:** tap-all-that-apply with a three-colour verdict; place-the-vehicle; pick-a-point crossing decision (fits a Windhoek street such as the Independence Avenue corridor); go/no-go lane decision; distance-zone diagram; dummy colour map with a rating toggle; icon arrays; 5-step checklist stepper; BAC-style non-linear risk curve; microsleep distance toggle; "which feature prevented this crash?" rounds; select-all factor questions; designated-driver social decision.
- **Highest Namibian relevance:** Road conditions, Rain & floods and Visibility (gravel roads, flooded crossings, dust, coastal fog); Fatigue (long-distance driving on B1 and similar); Heavy vehicle (trucks, tankers, minibus taxis); Pedestrian (shoulders, minibus taxi stops); Road rules checkpoints for City Safety Run; Alcohol & drugs (very relevant, needs full local rewrite). **Low direct relevance:** Snow & ice (use the structure for wet tar, wet gravel, sand and coastal fog instead).
- **Localise everything numeric and legal:** replace NSW figures (stopping distances, percentages, fines, BAC bands, 1 m / 1.5 m passing rule, 4-second rule, 100 m fog-light rule) with sourced Namibian data and regulations (NaTIS, MVA Fund, Roads Authority, Namibian Police, Road Traffic and Transport Act and regulations); check whether things like roadside drug testing or a 12-month DUI disqualification exist before copying the framing. Namibia has no ANCAP-equivalent national rating site, so use ANCAP/Global NCAP data for models sold locally and address second-hand imports, bakkies, shared vehicles and older cars without ESC or airbags.
- **Be honest about access:** do not imply players can simply buy the safest car, helmet or child seat; offer low-cost behavioural alternatives.
- **Real survivor stories** are a major trust device and the most sensitive content; they need consent and a care plan (see section 18). A local version could use anonymous or clearly labelled fictional stories.

## 18. Flags: IP, localisation, care, our own prototype

- **IP and attribution:** NSW wording, figures, charts, CGI, dummy art, footage and survivor stories are theirs. Build original scenes, wording and art; cite sources; get explicit permission before reusing anything; check the site's copyright and licence terms; record the source, reviewer and approval date in the content register.
- **Their figures are for NSW roads and conditions;** do not present them as Namibian.
- **Care:** the Lab warns about crash depictions on the landing screen; if Safe Roads World shows any crash imagery, add a similar warning. The concept document prefers to avoid severe crash imagery. Alcohol and drug content needs a non-shaming, non-glamourising tone and must not read as medical advice beyond "ask your doctor or pharmacist". Child-injury content should stay to dummies and pictograms with a safeguarding review.
- **A flag on our own speed prototype:** it mirrors the NSW Speed experience closely: the pre-question (head-on crash at 90 km/h, percentage options, reveal at the end); the narrative (swerving to avoid an animal into an oncoming vehicle, matching the kangaroo scene); the figures 9% / 37% / 90% at 60 / 80 / 90 km/h (exactly NSW's three chart points, not placeholders); and the crash-lab concept (see-through SUV with a dummy at the barrier, 60/80/90 switch). Before this goes in front of players or sponsors, rework it into an original experience built on sourced Namibian data and our own visuals, or get explicit permission from NSW and attribute them.

## 19. Gaps still to record

- **Bicycle helmet:** answer reveal for the 40/60/70% question, ratings screen, "Always remember", and the ending videos. A re-attempt on 13 Oct returned a CDN 403 "Request blocked" for `/experiences/bicycle`; retry later or open it manually.
- **Speed:** messages 2 and 3, any "always remember" card, the real-crash-story screen, and whether the answer reveal appears.
- **Motorcycle:** Jacket B and the 5-star jacket's swipe result.
- **Heavy vehicle:** Stay-in-lane feedback.
- **Vehicle safety:** the Ute B path.
- **Drive to conditions:** in-drive captions for Road conditions, and the Snow and Ice swipe cards other than the last Snow card.
- **Child car seats:** installation-mistake callouts and restraint how-to steps.
- **Videos** (all survivor stories and test footage) need a manual play; "More ... resources" screens.
- **Cross-experience synthesis** beyond section 16 (a full pattern library and a content-register template) is not yet written.
