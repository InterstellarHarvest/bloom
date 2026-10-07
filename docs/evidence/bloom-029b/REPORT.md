# BLOOM-029B evidence — Production Planet View + canonical planet surface

Branch `agent/bloom-029b-production-planet-view`, from **57c73f8** (the accepted BLOOM-029A tip). Not merged; main untouched.
Handoff: [`docs/PRODUCTION_PLANET_VIEW_v1.md`](../../PRODUCTION_PLANET_VIEW_v1.md).

## 1. What changed

| file | change |
|---|---|
| `resources/planet-surface/planet-surface.js` (new) | `BLOOM.surface`: THE canonical planet surface — the only terrain palette / algorithm in production (ground ramp, dry / wet, archetype treatment, coast, shallows, grain, waves, dunes, frost), cylinder-safe, pure, classic script, one instance |
| `resources/planet-sphere/planet-texture.js` | the texture is now `BLOOM.surface.paintSurface` at 8×6 px per tile under the starting sky; its own copied palette is gone; exports unchanged |
| `resources/run-ui/run-map-renderer.js` (new) | `BLOOM.runMap.createRenderer`: canonical surface + live overlays from adapter snapshots, any target canvas (029C mini-maps), cylinder repeat + canonical hit-testing, context-loss repaint |
| `resources/run-ui/planet-view.js` + `.css` (new) | `BLOOM.planetView.mount(adapter)`: the Concept 18 Planet View (HUD, tools, clock, run menu, Map View, banner, scenario card, footer), room-navigation seam, re-homed anchors |
| `resources/run-ui/run-ui-adapter.js` | additive reads `surface()`, `mapState()`, `effects()`, `runMenu()`, `actions.runAction`, `scenario().pressure.phaseMarks`, `scenario().climate.threshold` (api stays 1) |
| `demos/demo-run.html` | loads the four files; `&ui=18` mounts the view and skips the hidden shell's map draw; host gains `map`, `read.runMenu`, `act.runAction`; `goAction` extracted from `wireActions` unchanged; competition flashes record their `type`; shell marked MIGRATION-ONLY |
| `tools/planet-view-check.js` (new) | the 25th suite |
| `tools/sphere-texture-check.js` | pins geography (land / water = 027C) and canonical-surface identity instead of the old colours (A2 / C2 / C3 / D1 updated, D2 / D3 new) |
| docs | `PRODUCTION_PLANET_VIEW_v1.md` (new); minimal notes in `RUN_UI_PRODUCTION_BOUNDARY_v1.md` (+ the 81/1 erratum), `PLANET_SPHERE_VIEW_v1.md`, `TRAINING_FOUNDATION_v1.md` §9, README |

Untouched (N6, `git diff 57c73f8`): generator, topology, sim, validators, witness, archetype / scenario / play code, content, planets,
`planet-sphere-view.js` (public API, interaction, projection), Destination Survey, Main Menu, AtmosphereTransition, training
layer, Concept 18 mockups, root `index.html`.

## 2. One surface, two presentations — the proof (`surface-proof.json`)

| | |
|---|---|
| Node N4 | five generated worlds (ocean 28, desert 17 / 22, frozen 11 / 4): the run adapter's source (sim layout) and PlanetSphereView's planet give **equal surface signatures** and **identical pixels** at 8×6 (1 728 000 channel values, 0 differ) |
| Node N5 | rotating a world by 30 columns rotates its surface pixel for pixel: no seam at x = W − 1 → 0 |
| Browser B4 | the Planet View's surface canvas = a fresh canonical paint of the adapter's `surface()` (sim tilemap, archetype render hints) |
| Browser B5 | `demos/planet-sphere.html?archetype=ocean_archipelago&seed=28`: the sphere's texture hash `96023cd9` = the run's (`?…&ui=18`) canonical surface painted at 8×6; same planet id `proc_580988495`, same signature `09d8f471` |
| Browser B25 | Destination Survey: 9 / 9 globes' textures = the canonical paint of their exact validated worlds, pixel for pixel |
| Source N3 / D3 | neither `planet-texture.js` nor `run-map-renderer.js` contains colour stops, a ground tint, water colours or stipple rules; both call `paintSurface` |

## 3. Focused suite — `tools/planet-view-check.js`

**74 / 74** (`qa-planet-view-check.log`): Node 8 (N1–N7, N3b) · Chromium 36 (B1–B28 at 1280 × 800, B23 at 1024 / 1280 / 1440, B24
reduced motion, B25 survey, B26 file://) · Firefox 30 (everything at 1280 × 800 except the survey, reduced-motion and file:// runs).
It covers the 42 required items: base SHA (N1); legacy path (B1); real mount + one sim (B2); adapter truth (B3, B14, B20); no
mockup data (N7, B18); shared renderer / no duplicate palette / same-source pixels (N3, N4, B4, B5, B25); cylinder seam (N5) and
copies (B8); generator / topology / sphere / survey untouched (N6); overlays (B6, B20, B28); selection / X / water / pause–speed
(B7, B9); banner + categories + wouldHelp + intrinsic buttons (B14–B16); Map View (B11–B13); HUD (B3); pause / speed events (B10);
training (B21, B22); anchors (B21); scenario cards (B20); network / console (B18, B20b, B25b); widths (B23); reduced motion (B24);
Firefox; keyboard (B27); rooms seam (B17).

## 4. Broad regression — 25 suites (`run-all-suites.sh` → `qa-suites-summary.txt`)

**1072 pass / 1 fail** over 25 suites (`qa-suites-summary.txt`). Every engine / gameplay / sphere / survey / menu / transition /
training / run-ui suite is green, including `run-ui-check` 40/40 (029A), `training-check` 82/82, `sphere-texture-check` 14/14,
`destination-survey-check` 11/11. The single failure is the pre-existing `colony-development-check [31]` pixel flake,
**reproduced 3/3 on a clean 57c73f8 checkout** from the same parent path, while the identical 029B tree passes 4/4 elsewhere
(`suite-flakes.txt`). planet-view-check later gained B28 (final 74/74).

## 5. Default path unchanged — 029A's before / after driver re-run against 57c73f8

`docs/evidence/bloom-029a/qa-equivalence.js <57c73f8 tree> <029B tree>` → `equivalence-vs-57c73f8.log`: **all 8 scripted runs
identical** on the default path (First Bloom ×2, training, `planet=training_grounds`, ocean 28, Dying World, Native Competition,
Volatile Climate): every checkpoint (sim, HUD, inspect, colony controls, shop, footer, report), every `bloom:*` event, and the
final screenshot with 0 px difference below the header (the volatile run shows 18 px inside the header's button strip — the
anti-aliasing noise the driver reports but does not judge). The driver's own labels still say "c23815e / 029A"; the trees compared
here are 57c73f8 (before) and 029B (after).

## 6. Screenshots

| file | |
|---|---|
| `01-planet-view-no-selection-1280x800.png` | First Bloom, Planet View, no selection |
| `02-selected-region-banner.png` | ocean 28, a blocked region selected: banner with real data, "Would help" Cold Tolerance / Warm the Sky |
| `03-condition-boxes-closeup.png` | the four category boxes (Temperature strained, the rest OK) |
| `04-map-view-popover.png` | Map View popover, Temperature committed and still open |
| `05-temperature-preview.png` | First Bloom, Temperature previewed by hover (dashed chip), legend |
| `06-generated-cylinder-world-planet-view.png` | ocean 28 (a cylinder) filling 1280 px: three repeated copies |
| `07-same-world-planet-sphere-view.png` | the same world on PlanetSphereView — the same canonical surface |
| `08-destination-survey-shared-surface.png` | the 3×3 Destination Survey on the shared surface |
| `09-pressure-scenario.png` | Dying World on frozen 9: haze, dead ground, threshold outlines, scenario card with Details open |
| `10-native-competition.png` | Native Competition on desert 22: hatched native stands, amber fronts, card |
| `11-volatile-climate.png` | Volatile Climate on frozen 4 after two Warm the Sky: cold-snap tint, sky-change outlines, card |
| `12-training-paused.png` | `?training=1&ui=18`: paused (Resume pressed) |
| `13-1024x768.png` · `14-1440x900.png` | widths (tool labels icon-only below 1200 px) |
| `15-firefox-1280x800.png` | Firefox |
| `16-reduced-motion.png` | reduced motion |
