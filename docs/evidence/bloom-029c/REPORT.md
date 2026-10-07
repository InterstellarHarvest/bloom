# BLOOM-029C evidence — Production decision rooms: Region Inspect · Adapt · Spread

Branch `agent/bloom-029c-production-plant-rooms`, from **2750cbb** (the accepted BLOOM-029B final candidate). Not merged; main untouched.
Handoff: [`docs/PRODUCTION_PLANT_ROOMS_v1.md`](../../PRODUCTION_PLANT_ROOMS_v1.md).

## 1. What changed

| file | change |
|---|---|
| `resources/run-ui/decision-rooms.js` (new) | `BLOOM.decisionRooms.mount(planetView)`: the room controller (pause at once / remember / restore on Back / run on Resume; home selection → room context, cleared; room → room stays paused), the shared Concept 18 header, the mini-map block on the production renderer, Region Inspect (real tabs), Adapt / Spread (real trees, organic tendrils, preview / purchase contract), anchor re-homing |
| `resources/run-ui/decision-rooms.css` (new) | the rooms' presentation (Concept 18 room family), scoped to `.pv .dr` |
| `resources/run-ui/plant-specimen.js` (new) | the production plant specimen: SVG from real owned tiers, colony, growth focus, local upgrade and region condition; anchors for the tendrils; preview of a trait's next real tier |
| `content/traits.js` | `uiCategory` on the nine Adapt / Spread traits — presentation only (exact PMO mapping; N2 / N2b prove the mechanics never read it and gameplay is unchanged) |
| `resources/run-ui/run-ui-adapter.js` | `+ uiCategory` on upgrade items (one additive copy; `api` 1, 10 events unchanged) |
| `resources/run-ui/planet-view.js` + `.css` | room seam: `rooms.claimAnchors / setActive / parts`, `state().room`, `toast` exposed and moved to the `.pv` root (readable above the veil) |
| `demos/demo-run.html` | loads the three files; `&ui=18` mounts the rooms right after the Planet View; header comment |
| `tools/plant-rooms-check.js` (new) | the 26th suite |
| `tools/planet-view-check.js` | B17 (rooms registered; Terraform still on the seam) and N6 (traits.js may carry only `uiCategory`) updated; B21 expects the 029C-owned anchors |
| docs | `PRODUCTION_PLANT_ROOMS_v1.md` (new); minimal notes in `PRODUCTION_PLANET_VIEW_v1.md` §7–9, `RUN_UI_PRODUCTION_BOUNDARY_v1.md` §6.2, `TRAINING_FOUNDATION_v1.md` §9, README |

Untouched (suite N3): engine, generator, topology, validators, witness, archetype / scenario / play code, config, scenarios,
training data, planets, canonical surface, PlanetSphereView, Destination Survey, Main Menu, AtmosphereTransition, training layer,
Concept 18 mockups, root `index.html`. Not built: Terraform room, transitions, the 028D2 coach.

## 2. Focused suite — `tools/plant-rooms-check.js`

**66 / 66** (`qa-plant-rooms-check.log`): Node 8 (N1 base SHA · N2 / N2b category metadata, mechanics blind to it, gameplay identical
with it stripped · N3 scope · N4 sources: adapter truth only, no mockup data, one renderer, organic only, no Terraform / transition /
coach, preview / buy / colony through the real actions, never a home selection · N5 adapter api 1 + 10 events, every run-page
dispatch site and detail key list identical to 2750cbb · N6 Concept 18 constants · N7 specimen deterministic, every trait visible,
anchors ordered) · Chromium 37 · Firefox 21.

Browser coverage against the directive's list: pause on open / remembered / restore / Resume / Escape (B1, B2); room → room paused,
same context, old preview cleared (B3); origin fallback (B4); context changes without `bloom:region-select`, chip peek + restore
(B5); mini-map = the 029B renderer, same surface signature (B6); tabs ARIA + arrows (B7); Overview = `adapter.region`, Would help =
`adapter.wouldHelp`, suggestion → room / context / node (B8, B8b); Colony = real actions + `bloom:growth-focus` / `bloom:local-upgrade`
(B9); Science = raw (B10); trees = offered real traits, PMO categories, palette, order, prices, availability, anchors (B11 ×2);
preview contract + every reset path (B12); purchase + permanent specimen + next-tier re-read (B13); each trait changes the specimen,
real block reason (B14); tendril weights / 0 crossings / chain / Spread shorter / three chips / content-height / no scroll / 44 px /
no dead slabs at 1024 / 1280 / 1440 (B15 ×3); Waterborne Seeds on a crossing world (B16); Terraform unavailable through the seam
(B17); background inert to Tab and click (B18); anchors (B19); network / console / event shapes (B20); training: paused start, rooms
paused, real Cold Tolerance preview + 140-Biomass purchase, Chill Hollow effect, colony focus, Back paused, determinism, Restart (B21
a–e); reduced motion (B22); Planet View still works after a room (B23).

## 3. Measurements (`measurements.json`)

| | 1024×768 | 1280×800 | 1440×900 |
|---|---|---|---|
| room em (by "three median chips across", capped by height) | 13.8 | 17.3 | 19.4 |
| tendril idle / lit (px) | 8.5 / 12.5 | 9.0 / 13.8 | 10.1 / 15.5 |
| glow / vein (px) | 23.8 / 2.0 | 26.3 / 2.1 | 29.5 / 2.3 |
| crossings idle / lit (Adapt and Spread) | 0 / 0 | 0 / 0 | 0 / 0 |
| closest clear space, Adapt idle / one lit (px; Temperature–Soil) | 5.1 / 2.9 | 7.8 / 5.1 | 9.0 / 6.0 |
| Adapt vs Spread tree card height (px) | 538 vs 289 (Spread wants 284) | 673 vs 360 (355) | 755 vs 404 (399) |
| three median chips + gaps vs strip (px) | 297 ≤ 304 | 370 ≤ 381 | 413 ≤ 429 |
| controls under 44 px · chips under 36 px | none · none | none · none | none · none |
| dead slab under info / mini-map / effect card (em) | 1.0 / 0.9 / 0.9 | ≤ 1.1 | ≤ 1.1 |
| Planet View map geometry before / after opening a room | identical (B1) | identical | identical |

Concept 18 reported 5 / 3 px at 1024 for the same tightest pair; Firefox 1280×800 measures 7.9 / 5.3.

## 4. Broad regression — 26 suites (`run-all-suites.sh` → `qa-suites-summary.txt`)

On the final implementation commit **93bb81b**: **1146 pass / 1 fail** — colony-development-check [31], the known environment-dependent
pixel flake, **reproduced on the clean accepted baseline 2750cbb** (`suite-flakes.txt`). Every other suite is green, including
plant-rooms-check 66/66, planet-view-check 80/80, run-ui-check 40/40, training-check 82/82, sphere-texture-check 14/14,
destination-survey-check 11/11, main-menu-check 17/17, atmosphere-transition-check 14/14. A first broad run on the pre-commit tree was
1122 / 3: the recorded native-competition 44 live-run flake and a game-flow-check harness dialog race (both green in isolation and on the
baseline), plus one real 029C defect — the room anchors did not exist until a room first opened — fixed before the commit (rooms paint once
at mount; guarded by plant-rooms-check B21-0).

## 5. Screenshots

| # | shot |
|---|---|
| 01 | Region Inspect · Overview · 1280×800 (a blocked context with real "Would help") |
| 02 | Region Inspect · Colony (Roots focus + Root Network really bought) |
| 03 | Region Inspect · Science |
| 04 | Adapt · normal |
| 05 | Adapt · Cold Tolerance hover (real preview, Stem lit) |
| 06 | Adapt · purchased Cold Tolerance (Tier I owned · next tier previewed) |
| 07 | Adapt · Soil category active (Salt Handling hover) |
| 08 | Spread · normal |
| 09 | Spread · Seed Output hover |
| 10 | Spread · Waterborne Seeds hover on Ocean 28 (crossing reach outlined on the mini-map) |
| 11 | room mini-map region peek |
| 12 | room-context change (chip click) |
| 13 / 14 | 1024×768 Adapt / Spread |
| 15 | 1440×900 Adapt |
| 16 | training · Adapt · paused (Chill Hollow context, "Opens Chill Hollow") |
| 17 | Firefox 1280×800 Adapt hover |
| 18 | reduced motion · Adapt hover |
