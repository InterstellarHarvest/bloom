# BLOOM-040 — Edge Assemble transitions + specimen consistency · evidence report

**Presentation / navigation only.** Base: production `main` = `origin/main` = **`d03c6f9`** (the BLOOM-039 closeout; game `c1b5171`).
Branch `agent/bloom-040-edge-assemble` → review branch `handoff/bloom-040-review` → **PMO ACCEPTED (with two corrections, §10a) — released:
`main` = `77a972e` (§13).**

No gameplay, species physiology, Challenge mechanic, seed bank, world generation or room layout changed: `git diff d03c6f9` is empty for
`resources/bloom-*.js`, `resources/challenges/`, `content/`, `planets/`, the plant art / compositor / grammars, the AtmosphereTransition and
the training lessons (`transition-check` N5); the seed bank is still sha256 `8506124b…`; the portable runtime is byte-identical
(`check:portable`, fingerprint `c8f04676…`). No bank rebuild.

## 1. What changed

| # | Area | Change | Files |
|---|---|---|---|
| 1 | Edge Assemble (map → plant workspace) | the region is emphasised on the map (crisp; the rest dims ≤ 30 %; one soft outline pulse; no zoom / pan / morph); the veil and the map's existing blur ease in; the room assembles from the nearest edges — **header from above** (40 ms), **specimen column from the left** (80 ms), **work panels from the right** (120 ms), 340 ms each, ease `cubic-bezier(.2,.8,.2,1)`, transform + opacity only; 460 ms of motion | `decision-rooms.js` (controller), `decision-rooms.css`, `planet-view.js` (`emphasize`), `run-map-renderer.js` (`spot`) |
| 2 | Reverse (Back / Resume / Escape) | work panels exit right, specimen left, header up, the veil / blur clear (300 ms); the map resolves with the SAME region still selected; resume and focus only after the motion | same |
| 3 | Room ↔ room | the specimen box never animates; header copy, work panels, the information card and the caption text fade with a 16 px nudge (110 ms out, 190 ms in, direction = along the room tabs); never two rooms | same |
| 4 | Reduced motion | OS `prefers-reduced-motion` or Settings → Motion: opacity only (160 / 140 / 70 + 120 ms), no travel | same |
| 5 | One transition controller | `motion` (one at a time). A newer request commits the settling transition (its end state at once) and then runs: the final route is the last action. While a room opens / closes it takes no pointer input; Escape works at any moment; during a switch the header's Back / tabs / Resume stay live | `decision-rooms.js` |
| 6 | Home selection | no longer cleared when a room opens (it was, since 029C): it stays selected under the room (banner faded under the veil), so the map returns with it | `decision-rooms.js`, `.css` |
| 7 | Canonical specimen geometry | ONE `.lf-top` rule for all four rooms; Terraform's grid 21 % (was 20 %) and its 4 : 3 / 38 % specimen variant removed; `.z-focus` gets a definite height so the 56 % cap never depends on content | `decision-rooms.css` |
| 8 | Terraform information card | its closing hint steps aside when the (now taller) specimen leaves too little height (it shows whenever there is room) | `decision-rooms.js` |
| 9 | Environment fill | a canvas BEHIND the organism paints the same scene over the whole box (`plantEnvironment.paint(…, ext)`: frame coordinates kept, margins continued; its window = the frame's backdrop byte for byte); the weather overlay covers the box at the frame's density per area | `plant-environment.js`, `plant-specimen.js` |
| 10 | Weather readability + continuity | rain = two-tone streak (dark core + pale edge), longer / thicker; snow = larger white flake with a soft blue-grey rim — same particle count; animation time = the page clock (two overlays of one scene draw the same frame at the same moment), the first frame drawn at once, hidden overlays skip drawing | `plant-environment.js` |
| 11 | Developer-harness artefact | the FX / environment canvases carry inline transparent styles: the harness's `canvas{background:#05070c}` no longer paints the weather layer black over the specimen (`demos/demo-run.html` only; production never had it) | `plant-specimen.js` |
| 12 | QA | new 47th suite `tools/transition-check.js` (N · E/R · M · F · V · W · I · A · P · T); pins updated in `plant-rooms-check` (B1 / B2), `terraform-check` (B1 / B2), `run-ui-convergence-check` (N5, B5, B6, B8, B9, B19, B19b, B20, B20a) | `tools/` |
| 13 | Docs | TRANSITION SYSTEM: EDGE ASSEMBLE, canonical specimen geometry, weather never a transition device | `PRODUCT_DIRECTION_CURRENT.md`, `GAMEPLAY_UI_CONVERGENCE_v1.md` §3 / §6 / §11, `PRODUCTION_PLANT_ROOMS_v1.md` §2 / §3 / §13 / §16, `PRODUCTION_TERRAFORM_ROOM_v1.md` §4, `VISUAL_DIRECTION_v1.0.md` §3, `RUN_UI_PRODUCTION_BOUNDARY_v1.md` §6.4 / §10, `DEVELOPMENT_NOTES.md` |

## 2. Edge Assemble — architecture

ONE controller inside the rooms (`resources/run-ui/decision-rooms.js`, section "(BLOOM-040) EDGE ASSEMBLE"); no new file, no new event,
adapter `api` 1. The motion is the Web Animations API (`element.animate`, `fill: both`), on **transform and opacity only**; the one
exception is the map's EXISTING in-room blur (`filter`), eased from sharp to blurred only while the veil fades (the static rule is the 029C
one). A transition is a `Motion`: its animations + its end state, applied exactly once — when every animation has finished
(`Animation.finished`), or at once when a newer request **commits** it. No timers; the end state never waits on a clock.

| Step | Open (map → room) | Close (Back / Resume / Escape) | Switch (room → room) |
|---|---|---|---|
| 0 ms | the REAL pause (`actions.pause`); `planetView.emphasize(region)`: the region crisp, the rest dims ≤ 30 %, one soft outline pulse (≈ 420 ms), then a quiet glow under the room | the room's preview cleared; still paused; the room `inert` | the old room's preview cleared |
| pieces | the room shown at once with every piece at its edge: **veil + blur 60 → 280 ms**, **header from above 40 → 380**, **specimen column from the left 80 → 420**, **work panels (centre + right) from the right 120 → 460** | work panels → right 0 → 220, specimen column → left 30 → 250, header → up 60 → 280, veil + blur clear 50 → 300 | header copy, work panels, info card, caption text: fade + 16 px out (110 ms) → swap → in (190 ms); **the specimen box never animates** |
| travel | sides clamp(56 px, 6 % of the width, 120 px) with a fade (opaque by 55 %); the header one header height + 8 px | the same, reversed | 16 px along the room-tab order |
| end | tendrils / tree measured at rest, tendrils fade in (140 ms), focus → the room title / the requested node | the room hidden, the map restored, **then** Back restores the pre-room state / Resume runs, focus → the opener | focus → the new room's title / node |
| easing | `cubic-bezier(.2,.8,.2,1)` | `cubic-bezier(.45,0,.75,.5)` (an ease-in for exits) | ease-out in, ease-in out |

**Map emphasis** (`planet-view.js` `emphasize`, renderer FRAME `spot`): an even-odd fill dims every tile but the region's (≤ 0.3 ink), a
pale outline glow pulses once; presentation only (no selection, no event, no zoom / pan / morph); under reduced motion the dim is set at once
and nothing pulses. **The home selection now stays selected** while a room is open (it was cleared since 029C): its banner fades out under
the veil (CSS) and back in on the reverse, so the map returns with the same region selected without re-running the banner's multi-step
advice (re-selecting at close cost a 150–320 ms first-frame stall — measured, rejected). The room context still never writes the selection.

**Input.** While a room opens or closes it takes no pointer input (`.dr[data-transitioning=open|back|resume] .dr-room{pointer-events:none}`):
the second click of a double-click lands on the layer and is counted and dropped, never on an arriving control. Escape works at any moment
(it commits the settling transition, then closes). During a switch the header's Back, room tabs and Resume stay where they are and stay live:
a new choice commits the settling switch and runs.

**Accessibility.** The room is shown and the map made `inert` + `aria-hidden` in the same task, and restored in the same task at the end of
a close: exactly one of {room, map} is exposed on every frame; the leaving room is `inert` during its exit; focus moves only after the motion
(never to an element that is still moving or inert).

**Performance.** No layout property is animated; the specimen is never repainted while the containers move (0 `putImageData` on the organism
canvas during an opening / closing); no long task over 200 ms in an opening, switch or closing (transition-check P1). A backdrop-filter veil
was prototyped and **rejected**: with the weather animating it re-blurred every frame (headless rooms 20 fps Chromium / 12 fps Firefox,
against 30 / 60 for the existing static filter); the steady state is the 029C rule, unchanged.

## 3. Transition timing (measured)

Nominal: opening **460 ms** of motion, closing **300 ms**, switching **300 ms** (`BLOOM.decisionRooms.EDGE`; transition-check N1).
Measured click → settled on this Mac, headless (software rendering; every frame is slower than on a GPU):

| | Chromium 147 | Firefox 148 |
|---|---|---|
| Open (bare page, `tools/timing.js` here, all four rooms) | **506 – 541 ms** (first animated frame +42–70 ms) | 543 – 649 ms (frames ≈ 80–100 ms apart in headless Firefox, with or without the blur) |
| Open (inside transition-check, sampling layout on every frame) | 562 – 606 ms | 534 – 798 ms |
| Back (bare page) | **343 – 364 ms** | 332 – 407 ms |
| Switch | ≈ 500 ms (headless rooms run at 30 fps on `main` too) | — |

The motion itself is 460 / 300 ms; the extra is the first frame and headless frame pacing. On ordinary GPU hardware the opening settles at
≈ 0.5 s. The stagger is asserted from the pieces' own animation delays (header 40 < specimen 80 < work 120 ms; E2).

## 4. Reduced motion

The OS `prefers-reduced-motion` OR the game's Settings → Motion: Reduced (read through the existing bridge, `main-menu-data.js`). Opacity only:
open 160 ms, close 140 ms, switch 70 + 120 ms; **no element travels** (every sampled rect equals the final one — M1, both triggers, three
engines); the map emphasis is set without a pulse; the specimen is fixed between rooms in either mode.

## 5. The canonical specimen — geometry across the four rooms

One rule (`.dr .lf-top`): the full width of the 21 % left column, 170 : 196, ≤ 56 % of the zone height. Measured (transition-check F1–F3,
Chromium; Firefox within 0.04 px), stable AND on every frame of six room switches (one distinct rect, never two rooms, opacity 1):

| Viewport | Box x, y, width × height (px) | Organism canvas | Scale | Region · Adapt · Spread · Terraform |
|---|---|---|---|---|
| 1024 × 768 | 13.8, 90.95, 209.23 × 241.23 | 168 × 196 | 2× | identical |
| 1440 × 900 | 19.39, 117.63, 294.25 × 339.25 | 252 × 294 | 3× | identical |
| 1920 × 1080 | 22, 139.8, 393.95 × 454.2 | 336 × 392 | 4× | identical |
| 2560 × 1440 | 22, 139.8, 528.36 × 609.16 (app width 1920) | 504 × 588 | 6× | identical |

**Terraform before → after** (1440 × 900): box 280.2 × 210.2 at 2× → **294.25 × 339.25 at 3×**; at 1024 × 768: 199.3 × 149.5 at **1×** →
209.23 × 241.23 at 2×. At rest Terraform's specimen pixels now equal Region Inspect's (same signature); a Terraform preview changes only the scene.
Its information card keeps its content; its closing hint steps aside where the taller box leaves too little height (shown whenever there is room).

## 6. The environment fills its box

`plantEnvironment.paint(scene, 84, 98, 70, ext)` paints the SAME scene over a grid larger than the frame: every feature keeps its frame
coordinates (sun, clouds, horizon per column, turf, strata, marks), the margins continue it (strata repeat downward; specks, mud, salt,
toxicity and cracks at the frame's density per area, never inside the window). `plant-specimen.js` puts it on a canvas behind the organism,
aligned to the organism's pixel grid; the weather overlay covers the same box. The organism canvas, its pixels and every signature are
unchanged: for 1,056 scenes (transition-check N4: 288) the frame and its signature are byte-identical to `d03c6f9` and the extended raster's
window is byte-identical to the frame.

Proof (V1, 1024 and 1440, Chromium · Firefox · WebKit): under **normal · rain · snow · dry · wet / flood · frozen** scenes the environment layer
covers the box and **no card-background pixel** appears along the left, right or bottom edge (the rounded corners excluded). Stills:
`frames/chromium-fill-*.png`; before / after: `tutorial-specimen-ab.png` (the `d03c6f9` row shows the flat padded bands, the BLOOM-040 row the
scene to the edges).

## 7. Rain and snow

| | Before (`d03c6f9`) | After |
|---|---|---|
| Rain | one 0.5-logical-px streak, 3 px long, `#7b9cba` at 55 % | a 0.75-logical-px dark core `rgba(46,78,118,.82)`, 4 long, with a pale 1/3-px edge `rgba(236,244,252,.7)` (reads on bright sky AND dark ground) |
| Snow | a 1-logical-px white square | a 1.34-logical-px white core with a soft blue-grey rim `rgba(78,100,130,.55)` |
| Count | — | **identical** (the same drops at the same positions; density per area kept on the wider box) |

A / B at the same instant (T = 0, the same particles), visible ink (Σ |ΔL| over changed pixels) on the canonical box:

| Scene | Particles | 1440 × 900 before → after | 1024 × 768 before → after |
|---|---|---|---|
| rain · overcast | 40 | 114 → 464 (×4.1) | 38 → 291 (×7.6) |
| rain · dunes | 32 | 104 → 395 (×3.8) | 36 → 245 (×6.8) |
| snow · frozen peaks | 24 | 41 → 178 (×4.4) | 18 → 126 (×6.9) |
| snow · dark ridges | 19 | 38 → 151 (×3.9) | 17 → 104 (×6.2) |

Stills: `frames/chromium-weather-<width>-<scene>-before|after.png`. **Continuity:** the overlay's animation time is the page clock — two
overlays of one scene started at different moments draw the identical frame at the same instant (W2), the incoming room's weather is already
drawn on its first frame, a hidden overlay skips drawing. The room controller never touches the weather (N6).

## 8. Training / tutorial specimen

**Diagnosis.** The Training specimen already uses the canonical production path: `BLOOM.plantSpecimen` → the `organic-hybrid` pack →
body plan `oh-stem@1` → the sprite compositor (the generated atlas). At the same state (sparse colony, no adaptations, OK ground) the
Training specimen and an Expedition specimen have the SAME organism signature `7674b261` (global `a7b728dd`) — before and after this
milestone; T1 re-draws the Training state through `BLOOM.plantSpecimen.draw` in the page AND in Node from the committed atlas: byte-identical.
No retired 029C SVG and no lab file is loaded (T1). Nothing was redrawn or re-pointed; no sprite asset changed.

What made it look crude:
1. **The padded scene** — the 84 × 98 frame at a whole-number scale left flat sky / soil bands around it (up to one scale step on every
   side): the scene never reached the box edges. **Fixed** for every room and the report (§6).
2. **The developer harness** (`demos/demo-run.html?training=1`) painted the weather overlay canvas BLACK over the specimen (its page-wide
   `canvas{background:#05070c}`); production (`index.html`) never had that rule. **Fixed** (inline transparent styles on the specimen layers).
3. **The no-colony "ghost"** — a region without a colony shows the organism thinned to a checker dither (the production presentation since
   032C). Training's early lessons inspect Chill Hollow / Salt Pan / Thirsty Flats, so the ghost is what Training shows most. **Not changed**
   (it is not obsolete art; changing it would redesign the presentation) — offered as a PMO question (§11).

The anatomy callouts (Leaf pigment · Leaf shape · Stem · Roots) keep their positions, connector style and sequencing, anchored on the real
specimen (T2). Evidence: `tutorial-specimen-ab.png` / `.json` (A Expedition vs B Training × `d03c6f9` vs BLOOM-040, production `index.html`).

## 9. QA

`tools/transition-check.js` — the 47th suite (sections N · E/R · M · F · V · W · I · A · P · T; `--evidence` writes `frames/` +
`transition-proof.json`):

| Run | Result |
|---|---|
| Chromium 147 + Firefox 148, all four viewports, AXE | **108 / 108** (`qa/transition-check-chromium-firefox.log`) |
| WebKit 18 (Playwright 1.46.1, mac12 proxy), E · M · F · V · W · I · A · P, AXE | **48 / 48** (`qa/transition-check-webkit.log`) |

Covered: map → page and page → map at 1024 / 1440 / 1920 / 2560 (directions, no overshoot / resize, exact settle, stagger, emphasis, timing,
the same region selected, the map clickable again); Regions → Adapt → Spread → Terraform → Regions → Terraform → Adapt (every frame);
reduced motion (OS and Settings); interruption — double-click, Escape during an opening, a room tab during a switch, Escape during a switch, a
14-input burst (I1–I5: one room at most, nothing stuck, the last action wins, no console error); focus and exposure (A1); axe on the map and
the four rooms: **0 critical / 0 serious** in all three engines (A2); performance (P1); environment fill under six weathers (V1); weather A / B
and continuity (W1–W2); Training's art path (T1–T3, Chromium + Firefox).

**Accessibility fix found by the new suite (pre-existing):** on some regions Spread's information card overflowed by 13 px on `main` too
(identical heights), an axe `scrollable-region-focusable` (serious). Every room's info card now hides its closing hint before it would
scroll, and a card that still overflows is keyboard-focusable (`fitInfo`).

Suite pins updated for the locked behaviour change (no loosening of a timing bound; the old pins described the retired mist / selection
clearing): `plant-rooms-check` B1 / B2, `terraform-check` B1 / B2 (the selection kept; the veil element), `run-ui-convergence-check` N5,
B5, B6, B8, B9 (the bridge's safety nets now exercised directly, plus Edge Assemble without Web Animations), B19, B19b, B20, B20a.

## 10. Regression

Focused first (the brief's list + `transition-check`, then `release-check --no-suites`), then **every `tools/*-check.js` sequentially** on the
implementation `ca5d12c` + `75caf77` (the game files of every later commit are identical; `5bb9339` / `a60124f` change suite pins only) (`docs/evidence/bloom-040/regression.tsv`; `tools/run-all.sh`): **47 / 47 suites, 2,202 passing check lines, 103 min** after the three
items below were resolved — no timing bound loosened, no Challenge-bank rebuild.

| Suite | First run | Resolution |
|---|---|---|
| `planet-view-check` (focused pass) | B17 FAIL ×2 + a Firefox crash | B17 pinned "no home selection after a close" (the 029C rule BLOOM-040 changes) → pin updated (`5bb9339`); the Firefox crash (Restart Training's reload outran a 20 s wait) did not recur: the full pass 80 / 80 in both browsers |
| `visual-system-check` | G1 FAIL ×2 (Chromium, Firefox) | the computed-style identity vs `79f5540` saw exactly the two deliberate BLOOM-040 differences — the rooms layer's 46 % ink moved onto `.dr-veil`, and the kept selection's banner faded (opacity 0) under the open room — narrow exceptions added (`5bb9339`, `a60124f`); re-run **PASS** |
| `game-flow-check` | 1 FAIL (a scripted `advance(400)` ended a scenario run in an extinction; the loss report's veil covered the run menu) | not reproducible: branch re-runs **2 / 2 PASS**, `main` PASS — the harness simulation draws on `Math.random`; no room / transition code on that path |
| `slice-check` | pacing 231 s < 240 s | the documented QA debt (PRODUCT_DIRECTION §8: stochastic, 231–262 s observed on accepted heads); re-runs **253 s, 241 s PASS** |

Every other suite passed on its first run, including `run-ui-check`, `run-ui-convergence-check`, `plant-rooms-check`, `terraform-check`,
`guided-training-check` (50: Training's 13 lessons, coach, Skip / Begin Expedition — unaffected by the kept selection), `ui-polish-check`,
`portable-runtime-check` (file:// · / · /bloom/), `release-check` (full, with its child suites), `specimen-environment-check`,
`challenge-world-check` (bank integrity, exact regeneration, engine byte-identity A13) and `single-app-flow-check`.


## 10a. PMO review — two presentation corrections (core candidate ACCEPTED)

**Correction 1 — the report crossfades; no mist page transition (`d2026b2`).** The Bloom / Extinction report no longer runs the SUBDUED
mist (the last player-facing cloud page transition): `run-report.js` opens it with a quiet **crossfade** — the run / map fades back (its
existing in-report colour treatment, `saturate(.78) brightness(.92)`, eased in) while the report layer (veil + card) fades in, **340 ms**;
Keep playing reverses it (**300 ms**) and resumes the run only after the fade; reduced motion **120 ms**. Opacity + the map's colour filter
only: no cloud / mist / weather wipe, no slide, zoom or parallax, no card entrance transform. Report layout, content, win / loss mechanics,
Keep playing and Challenge report behaviour unchanged. The AtmosphereTransition utility is kept (the Expedition descent uses it directly);
the 029E bridge object stays (it reads the player's Settings → Motion choice) but **no page navigation runs it any more**.
Still: `pmo-corrections/report-crossfade-middle.png` (paused at 170 ms) · `report-crossfade-end.png`.

**Correction 2 — Training anatomy shows the full canonical plant (`bdc1733`).** While the guided training's anatomy lessons are current —
`ANATOMY_LESSONS` = **"limiting-factor"** (Find the limiting factor) and **"adapt-buy"** (Change the plant), the lessons that teach Leaf
pigment · Leaf shape · Stem · Roots on the Adapt room's callouts over Chill Hollow — the training layer asks the rooms for the anatomy
presentation (`decisionRooms.setSpecimenPresentation("anatomy", { rooms: ["adapt"] })`, driven by the director's existing `onChange`). The
Adapt specimen is then the FULL canonical Organic Hybrid for the current adaptation state through the same production path (living,
establishment 0, balanced, OK, viable: no checker ghost, no stress / unviable tint, no colony sprouts). Presentation only: no colony is
created (Chill Hollow living 0), region state, simulation, progression, lesson copy / sequencing / callout positions / connectors and the
specimen geometry are unchanged; the caption still says "No colony yet"; the canvas label says the plant is "shown in full to point out its
parts". Every other lesson and ordinary play keep the no-colony ghost.

| Lesson-5 Adapt specimen on Chill Hollow | organism signature | = canonical draw of the state | region living |
|---|---|---|---|
| BEFORE (`d03c6f9`, the ghost) | `5f73f976` | no (`7674b261`) | 0 |
| AFTER (`bdc1733`) | **`7674b261`** | **yes** — and = the Expedition specimen at the same state | 0 |

Evidence: `pmo-corrections/training-anatomy-before-after.png` (+ `-before` / `-after` / `.json`). **Canonical sprite assets unchanged:**
`git diff d03c6f9` is empty for `art/` (81 files), `resources/plant-visual/generated/`, the compositor, components, visual model and grammars;
`plant-atlas.js` sha256 `220fb2f0…` and `plant-atlas-manifest.json` `082a4f24…` are byte-identical to the base. The portable runtime was
rebuilt because `training-run.js` is bundled (fingerprint `e5e5dd36…`, `check:portable` identical).

**Home selection — PMO-locked production contract:** opening a room never emits `region-select {id:null}` and never changes the
selection; Back returns to the same region with its banner (documented in `PRODUCT_DIRECTION_CURRENT.md`, `PRODUCTION_PLANT_ROOMS_v1.md` §3).

**QA for the corrections:** `transition-check` N5 (training lessons unchanged; only the anatomy list and hook added) · N7 (no bridge run in
the report) · T4 (the override is lesson-scoped: Biomass and Spread lessons keep the ghost; both anatomy lessons show the canonical organism;
no colony) · T5 (axe on the anatomy state) · X1–X5: Expedition Bloom (+ reduced motion), Dying World Extinction, Dying World Bloom,
Native Competition Bloom (the harness) and Thin Air (the production Challenge flow): no `.atx` overlay and no bridge run, a monotonic
crossfade, the right report and heading, ONE report, Escape ×2 + a premature Keep playing + a second open() while it opens change nothing,
Keep playing (double-clicked) closes once and resumes, no stuck opacity / filter, the loss's Home and the Challenge's Challenges actions work,
axe 0 / 0 on the Bloom and Extinction reports. `guided-training-check` GA1 / GA2 by real input through the whole 13-lesson flow.
`run-ui-convergence-check` N5 / B11 / B13 / B16 / B19 / B20 re-pinned to the crossfade (no mist). Results on the corrected head (`7005cc7`; game files = `bdc1733`):

| Run | Result |
|---|---|
| `transition-check` Chromium + Firefox, AXE (N · E · M · F · V · W · I · A · P · T · X) | **149 / 149** (`qa/transition-check-chromium-firefox.log`) |
| `transition-check` WebKit 18 proxy, AXE (E · M · F · V · W · I · A · P · X) | **66 / 66** (`qa/transition-check-webkit.log`) |
| Focused: transition · guided-training (54) · run-ui · run-ui-convergence · game-flow · plant-rooms · planet-view · visual-system · portable-runtime · challenge-completion (the report-specific suite) · `release-check --no-suites` | **11 / 11** |
| **Final full regression — every `tools/*-check.js`, sequentially** | **47 / 47 after re-runs** · 2,262 passing check lines · 108 min (`regression-corrected.tsv`) |

Two first-run failures did not reproduce: `dying-world-check` 40 (the legacy shell's scripted Dying World win read its coverage a few ticks
after the win — re-runs 2 / 2 PASS, `main` PASS) and `run-ui-convergence-check` B17 (its legacy competition line is recomputed live a few
ticks after the scripted win inside `advance(5)`, while the production line is the report data fixed at the win; a live-random run crossed a
rounding boundary, 17 vs 18 % — re-runs 2 / 2 PASS; render timing cannot affect either number). No timing bound loosened; no bank rebuild.

## 11. Concerns / questions for the PMO

1. **The home selection is now kept through a room** (**PMO: approved and locked** as the production contract) (since 029C it was cleared on open: one `bloom:region-select {id:null}`). Needed for
   "selected region remains the same / visible when the map returns"; it removes that event from the stream. Training is unaffected
   (guided-training-check, §10).
2. ~~The report still uses the SUBDUED mist~~ — **resolved by PMO correction 1** (a quiet crossfade, §10a).
3. ~~The no-colony ghost dither in Training~~ — **resolved by PMO correction 2** for the anatomy lessons (§10a); the general ghost stays.
4. **Information-card hints** (Terraform most often, Spread on long texts) now step aside when there is no room, rather than scrolling.
5. **Measured timings are headless** (software rendering, ≈ +40–140 ms for the first frame; Firefox headless ≈ 10–12 fps while the map's
   blur fades). The animation timeline is 460 / 300 ms; on GPU hardware it settles at ≈ 0.5 s. Worth a glance on the owner's machine.
6. Safari itself is untested (WebKit 18 proxy only), as in every release.

## 12. Commits (`agent/bloom-040-edge-assemble` = `handoff/bloom-040-review`, from `d03c6f9`)

| SHA | |
|---|---|
| `ca5d12c` | Edge Assemble transitions + one canonical specimen (the implementation: `resources/` only) |
| `75caf77` | `transition-check` (47th suite) + suite pins for Edge Assemble |
| `5bb9339` | planet-view B17 / visual-system G1 pins |
| `a60124f` | visual-system G1 — the kept selection's banner faded under an open room |
| `ab64bbe` | docs (the transition system, the canonical specimen, weather) + this evidence record — the first review head |
| `d2026b2` | **PMO correction 1** — the report crossfades (no mist page transition) |
| `bdc1733` | **PMO correction 2** — the Training anatomy lessons show the full canonical specimen |
| `7005cc7` | the corrections' QA (transition-check N5 / N7 / T4 / T5 / X) + docs + evidence |
| (this commit) | the corrected regression record — the corrected review head |

Evidence in this folder: `REPORT.md`; `transition-proof.json` (per-browser timings, specimen rects, weather A / B); `regression.tsv`;
`qa/` (transition-check logs: Chromium + Firefox, WebKit); `frames/` (36 stills: Edge Assemble start / middle / end and the reverse — the
animations paused at fixed times, Chromium + Firefox; the environment fill under six weathers; weather before / after at 1440 and 1024;
Training's Adapt specimen); `tutorial-specimen-ab.png` / `.json`; `tools/` (the scratch drivers for the timings and the Training A / B).

## 13. Release closeout (2026-10-24)

| | |
|---|---|
| PMO | core candidate `ab64bbe` ACCEPTED; two presentation corrections required (report crossfade · Training anatomy specimen) → made (`d2026b2`, `bdc1733`), QA'd (`7005cc7`, `77a972e`) |
| Corrected review head | `77a972e44eb0daf6a0f8849014ec99f9fbee871b` = `handoff/bloom-040-review`, 9 ahead / 0 behind `d03c6f9` |
| Integration | `origin/main` verified unchanged (`d03c6f9`), then fast-forwarded to `77a972e` (no merge commit, squash, rebase, cherry-pick or force push); local `main` = `origin/main` = `77a972e` |
| Pages | GitHub Actions run 40061546667 — success (`77a972e`) |
| Live files | `decision-rooms.js/.css`, `run-report.js`, `plant-specimen.js`, `plant-environment.js`, `training-run.js` served byte-identical to the release (and different from `d03c6f9`); `plant-atlas.js` and `index.html` byte-identical to both |
| Live verification | `tools/live-040.js` on <https://interstellarharvest.github.io/bloom/>, **Chromium 9 / 9 · Firefox 9 / 9**: map → Regions Edge Assemble after the region's emphasis · the specimen never moves / resizes through Regions → Adapt → Spread → Terraform → Regions (Terraform the same size and scale) · the environment fills the box in every room · rain and snow drawn and visible · Back = the reverse with the same region selected and its banner back · the Bloom report crossfades (no mist overlay) · the Training anatomy lesson's Adapt specimen is the full canonical plant (`7674b261`, no colony created) · no console error. Stills: `live/` |
| Bank | sha256 `8506124b…` unchanged; no rebuild |
| Cleanup | the 040 worktree, the local `agent/bloom-040-edge-assemble` and the remote `handoff/bloom-040-review` deleted after this closeout |

