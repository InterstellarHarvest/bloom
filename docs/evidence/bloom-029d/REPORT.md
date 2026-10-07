# BLOOM-029D evidence — Production Terraform room

Branch `agent/bloom-029d-production-terraform`, from **2d0fb08** (the accepted BLOOM-029C final candidate). Not merged; main untouched; the
028D2 guided-training worktree untouched. Handoff: [`docs/PRODUCTION_TERRAFORM_ROOM_v1.md`](../../PRODUCTION_TERRAFORM_ROOM_v1.md).
Implementation commit **af708c2**; this evidence is a separate commit on top.

## 1. What changed

| file | change |
|---|---|
| `resources/run-ui/decision-rooms.js` | `buildTerraform()` — the fourth room of the 029C controller (same lifecycle), left environment / land focus from real values, Soil bank = real ground readout, real PlanetSphereView in the centre with ONE diffuse SVG atmosphere around it, Atmosphere bank of the four real nodes with ring connectors, planet readout + region effect; `board-terraform` / `upgrade-warm/cool/humid/dry` claimed; dispose chained to the Planet View's; the "Would help" focus preview protected from synthesised pointerovers |
| `resources/run-ui/terraform-globe.js` (new) | `BLOOM.terraformGlobe`: guarded `import()` of the unmodified sphere (http(s) only), presentation snapshot (exact planet, `globalClimate` = current sky), Concept 18 atmosphere stops, face-radius helper, flat canonical-surface fallback, `mount()` — public PlanetSphereView API only (constructor, `setPlanet`, `dispose`; the room adds `resize` / `state`); no private member is read in production (acceptance correction: the QA-only `textureCanvas()` hook that read `view._canvas` was removed; the pixel-identity proof white-boxes `_canvas` from the test harness alone) |
| `resources/run-ui/decision-rooms.css` | Terraform room presentation; scoped transparent / borderless rule for the sphere canvas (the legacy shell styles every canvas) |
| `content/traits.js` | `uiBank: "Atmosphere"` + `uiCategory: "Sky temperature" / "Rain"` on warm / cool / humid / dry — presentation only |
| `resources/run-ui/run-ui-adapter.js` | `uiBank` copy; `sky` on sky-trait preview results; `terraformPreview(id)`; `scenario().climate.bandNames` (api 1, 10 events) |
| `demos/demo-run.html` | `skyWhatIf` records `skyAfter = skyNow()` under its what-if sky; `computePreview` attaches `data.sky`; loads `terraform-globe.js` |
| `tools/terraform-check.js` (new) · `tools/plant-rooms-check.js` · `tools/planet-view-check.js` | the 27th suite · the 029C / 029B assertions that encoded "Terraform not built" updated (B17 / B19 / B23 / N2 / N3 / N4 / N5 / N6 · B17 / B21 / N6) |
| docs | `PRODUCTION_TERRAFORM_ROOM_v1.md` (new); minimal notes in `PRODUCTION_PLANT_ROOMS_v1`, `PRODUCTION_PLANET_VIEW_v1`, `RUN_UI_PRODUCTION_BOUNDARY_v1`, `TRAINING_FOUNDATION_v1`, README |

Byte-identical to 2d0fb08 (suite N3; `terraform-proof.json` → `sphereUnchanged`): `resources/planet-sphere/*` (planet-sphere-view.js blob
`d7d64a0c…`, planet-texture.js, Three.js), the canonical surface, engine, generator, validators, planets, config, scenarios, training data,
AtmosphereTransition, main menu, survey, training layer, Concept 18 mockups, root `index.html`.

**Real Terraform metadata mapping:** warm → Atmosphere · Sky temperature; cool → Atmosphere · Sky temperature; humid → Atmosphere · Rain;
dry → Atmosphere · Rain. **No fake Soil / Ground / Air / future node, cost, lock, arrow or pin was added** (N4 scans every 029D addition for
Rock Weathering, Mineral Dust, Soil Building, Deep Humus, Wash the Salt, Thicker Air, Greenhouse Veil, Bright Clouds, Monsoon Cycle and the
mockup regions; B6 / `terraform-proof.json → tree`: 4 Atmosphere nodes, 0 Soil nodes, 0 arrows, 0 pins, the empty-state line present).

## 2. Focused suite — `tools/terraform-check.js`

**60 / 60** (`qa-terraform-check.log`): Node 9 (N1 base SHA · N2 exact metadata, nothing but the adapter reads it · N2b gameplay identical with
it stripped on 4 worlds · N3 scope + sphere byte-identical · N4 sources: adapter truth only, no mockup data / fake node / dev copy, sphere only
through the guarded loader, no Terraform rule in the room, no specimen · N5 adapter api 1 + 10 events, run-page dispatch sites and detail
keys identical to 2d0fb08, one Biomass grant · N6 Concept 18 constants · N7 atmosphere recipe · N8 snapshot = flat paint pixel for pixel in
Node) · Chromium 27 · Firefox 24.

Browser coverage against the directive's 65-point list: pause once / carry / clear / geometry / blur / veil / inert / header / tool ready / no
specimen (B1); Back / Escape / Resume (B2); room → room paused + context-stable, old preview cleared, globe restored (B3); real sphere over
http, public API, exact authoritative planet + current sky, pixel identity (B4); survey globe = flat = Terraform globe at the start (B5);
exactly the four real traits, metadata, order, colours, prices / tiers / availability, anchors, rings, no Soil node / arrow / pin, Soil
readout = `region.raw` (B6); preview through `actions.preview`, unchanged keys, `terraformPreview` = the page's what-if, globe = exact preview
sky pixels, channel, readouts (B7); every clear path restores the committed pixels (B8); all four purchases through `actions.buy`, keys,
Biomass, real delta, next tier re-preview, committed globe / map (B9); current ≠ starting sky semantics, authoritative planet never mutated,
uploads only on change (B10); mini-map = `BLOOM.runMap`, same signature, no `bloom:region-select`, peek, lens (B11); region / planet effect
from the real lists (B12); Region Inspect "Would help" → Terraform, context, node (B13); Volatile Climate real preview + shock warning (B14);
atmosphere DOM + exclusion zone + connectors + scroll + 44 px at 1024 / 1280 / 1440 and the screenshot probe (B15 ×3, B15p); yaw drag / ← → /
↑ nothing / idle / Tab-inert (B17); network / console / shapes (B18); dispose via the Planet View (B19); anchors before the first open (B20);
training paused + real prices + determinism + menu (B21 a–c); reduced motion (B22); file:// fallback (B23).

## 3. Measurements (`terraform-proof.json`)

**Flat / globe canonical identity (live run, Ocean 28):** planet `proc_580988495`, 480×240 texture (8×6 px per tile), same id / grid /
tilemap hash / topology / section ids as `adapter.surface()`. Start: sphere-demo globe `96023cd9` = flat current `96023cd9` = Terraform globe
`96023cd9`. Warm the Sky preview: sky 8/54 → 14/54, globe `edfdc3fa` = flat paint under the preview sky `edfdc3fa` (≠ current `96023cd9`).
After the four purchases (warm, cool, humid, dry → back to 8/54) the globe equals the flat current surface again (`96023cd9`), the run's
authoritative `planet.globalClimate` is still the starting sky, 31 texture uploads for 4 purchases + their previews (none while idle). Node
(N8): 3 worlds × 2 skies, 480×240 each, **0 differing pixel values** between the snapshot through the sphere's texture path and
`paintSurface` of the authoritative planet.

**Diffuse atmosphere:** recipe — 20 stops, 0 at the face, peak 0.46 at R + .8 em (`atHR` 0.4600), 0 at R + 2.1 em, max step between stops
0.071. Screenshot probe at 1280 (straight down from the globe centre, 8 px past the face to beyond the zone): largest neighbouring-pixel
brightness jump **5.1 levels**, darkest point **49.3 levels** below the card background and **1 px from the connector line (HR)**, background
back by RO (Δ 0.1). DOM stops verified at all three widths.

| | 1024×768 | 1280×800 | 1440×900 |
|---|---|---|---|
| room em | 13.8 | 17.3 | 19.4 |
| face radius: layout R / measured by the component (px) | 92.8 / 92.7 | 116.0 / 116.0 | 131.1 / 131.1 |
| atmosphere peak line HR · gone at RO · exclusion zone (px from centre) | 103.8 · 121.7 · 124.5 | 129.8 · 152.3 · 155.7 | 146.6 · 171.9 · 175.7 |
| nearest node / label / Soil card / legend / readout to the centre (px; must be ≥ zone) | 130.2 | 163.2 | 182.6 |
| connectors: closest point to the centre (px; ≥ face + 1.5) · crossings · label / lock hits | 103.8 · 0 · 0 | 129.8 · 0 · 0 | 146.6 · 0 · 0 |
| rings on HR (4) · Soil arrows · pins | ✓ · 0 · 0 | ✓ · 0 · 0 | ✓ · 0 · 0 |
| horizontal scroll (document / layer / view) | 0 / 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 |
| controls under 44 px · smallest chip (px) · left info card overflow | none · 36.0 · 0 | none · 37.8 · 0 | none · 42.4 · 0 |

Concept 18's mock globe measured 100 / 125 / 141 px; the production face is ~8 % smaller because the real node cards are wider than the
mock's icon pills (handoff §16).

**Preview / purchase events:** every `bloom:upgrade-preview` seen carries `id,board,name,available,gain,lose,better,worse,reachHostile`,
every `bloom:upgrade-purchase` `id,board,name,cost,tier,biomass`; warm / cool / humid / dry each: one purchase event (tier 1, cost 200),
Biomass −200 exactly, the real sky moved by the trait's delta on its axis only, a second preview event for the next tier while hovered.

**Climate scenario (Frozen 4 · Volatile Climate):** first Warm preview 5 % → 35 % Unsettled, no shock; after buying it the real level is 35 %;
the second Warm preview reads 35 % → 83 % Unsettled → Critical with the engine's shock warning (*Sets off a cold snap, about −11.7 °C*); the
globe paints the scenario-adjusted current sky pixel-identically (`sameSky`, `samePixels`).

**WebGL lifecycle:** room closed → the view's box is not visible, 0 renders in 250 ms; `planetView.dispose()` → view and renderer disposed,
0 sphere canvases, textures 0 / geometries 0 on the context, 0 listeners, room layer and view removed.

**Tutorial anchors:** `board-terraform`, `upgrade-warm/cool/humid/dry` resolve to ONE element each inside the Terraform room on a fresh page
before any room opens; the shell's five copies are `data-tutorial-legacy`; every `upgrade-*` anchor in the rooms is a real offered trait; the
report anchors stay on the shell.

**Training:** starts paused; Terraform opens paused on Training Grounds (globe pixel-identical to the flat training map), context Landing
Meadow, real training prices (= `sim.price`); two loads + Humidify + 400 ticks identical; Restart / Skip / Main menu present; no console error.

## 4. Screenshots

| # | file |
|---|---|
| 01 | `01-terraform-1280x800.png` — Terraform, normal |
| 02 | `02-terraform-real-sphere-close.png` — the real sphere close |
| 03 | `03-diffuse-atmosphere-close-up.png` |
| 04 | `04-soil-environmental-side.png` |
| 05 | `05-atmosphere-bank.png` |
| 06–09 | Warm the Sky / Cool the Sky / Humidify / Dry the Sky previews |
| 10 | `10-purchase-committed-state.png` (Humidify bought, pointer away) |
| 11 | `11-minimap-context-region-change.png` |
| 12 | `12-volatile-climate-terraform-preview.png` (Frozen 4, second Warm: Critical + cold-snap warning) |
| 13 / 14 | 1024×768 / 1440×900 |
| 15 | `15-firefox-1280x800-terraform.png` |
| 16 | `16-reduced-motion-terraform.png` |
| 17 | `17-training-terraform-paused.png` |
| 18 | `18-file-fallback-terraform.png` (flat canonical-surface disc; visually different from the sphere, same layout) |

## 5. Broad regression — `run-all-suites.sh` (27 suites)

See `qa-suites-summary.txt` and `suite-flakes.txt`.

**27 suites · 1207 pass / 0 fail** on **eb54026** (the acceptance-correction commit: production code consumes PlanetSphereView through its public
API only; the unmasked N4 source scan). Run 1 of the same suites on af708c2 was also 1207 / 0. Every suite exited 0, including the 029A–029C production
suites (run-ui-check 40, planet-view-check 80, plant-rooms-check 66), training-check 82, sphere-texture-check 14, destination-survey-check 11 and
terraform-check 60. The environment flakes recorded by 028B–029C (colony-development-check [31] pixel count, slice-check pacing,
native-competition-check 44, game-flow-check dialog race) occurred in neither run, so no classification against the 2d0fb08 baseline was needed.
The pixel-identity hashes in `terraform-proof.json` are unchanged by the correction (start / survey `96023cd9`, Warm preview `edfdc3fa`, after
purchases `96023cd9`; 0 differing pixel values in Node); screenshots were not regenerated (the implementation did not change pixels or layout).

## 6. Limitations / risks for 029E / 029F

- The globe is ~8 % smaller than the Concept 18 mock at each width (real node cards vs mock pills); the accepted halo / clearance / lane
  geometry is kept exactly.
- The mini-map region strip scrolls (one row visible) on many-region worlds while the planet readout is tall.
- `BLOOM.planetView.instance` is left set by the 029B view's own `dispose()` (pre-existing); the rooms and the globe are fully disposed through it.
- Firefox at 1280×800 only (WebKit not installed).
- No transition (029E; `controller.transition` is `null`), no coach (028D2); the Bloom Report / extinction remain the shell's modal.
- The headless atmosphere probe starts 8 px past the face because the sphere's own limb shading occupies the first ~6 px.
