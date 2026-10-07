# Production Planet View v1 + the canonical planet surface — BLOOM-029B handoff

**From:** BLOOM-029B · **For:** whoever builds BLOOM-029C (Region Inspect / Adapt / Spread rooms), 029D (Terraform), 029E (default
switch), 029F (Survey → gameplay handoff), and the Main PMO.
**Base:** `57c73f8` (the accepted BLOOM-029A tip). Suite: `tools/planet-view-check.js` (the 25th). Evidence: `docs/evidence/bloom-029b/`.

> **Concept 18 supplies presentation. The existing run supplies truth.**
> 029B builds the first real production piece of the Concept 18 run screen — the **Planet View** — and makes the planet's look
> **one canonical surface** that the flat gameplay map and every PlanetSphereView share. It reads the run only through
> `BLOOM_RUN_UI.adapter`, acts only through `adapter.actions`, and contains no Concept 18 mockup file, region, value or node.

---

## 1. Migration path

| URL | What you get |
|---|---|
| `demos/demo-run.html?…` (no `ui`) | the temporary engineering shell, **unchanged** (the full-mechanics regression harness) |
| `demos/demo-run.html?…&ui=18` | the **production Planet View** over the same run (any planet, scenario, `play=1`, `training=1`, `planet=`) |

- Both are presentations of the **same** ordinary run: one page, one sim, one adapter. `&ui=18` mounts
  `BLOOM.planetView.mount(adapter)` just before `bloom:run-ready`, hides the shell (`html.ui18`) and stops the shell's map `draw()`
  (its DOM and state stay: they are the adapter's host).
- The shell is marked **MIGRATION-ONLY** in `demos/demo-run.html`. BLOOM-029E makes the production UI the default and retires the
  shell's visible parts (and with them the shell's own map palette, the last old terrain colours in the repo).
- `&ui=18` is not carried by the player-mode navigation links ("Play this world again", …); a reload / Restart training keeps it.
- Over `file://` the view boots (all its files are classic scripts); the training layer, sphere and transition still need http.

## 2. One canonical planet surface

`resources/planet-surface/planet-surface.js` → `BLOOM.surface` (a classic script; planet-texture.js imports it for its side effect;
loaded twice it keeps ONE instance).

```
                       ┌── planet-texture.js drawPlanetTexture ── PlanetSphereView texture (8×6 px / tile, starting sky)
planet + layout ──► BLOOM.surface.paintSurface ─┤
render hints, sky      └── run-map-renderer.js ── the gameplay map's base canvas (N×N px / tile, the sky the run sees now)
```

- **The only terrain palette and terrain algorithm in production**: the temperature → ground ramp, dry / wet ground, the archetype
  treatment (ground tint, `tintBy: "cold"`, water hue, dunes, frost glints), per-tile grain, coast line, shallows, wave marks.
  planet-texture.js keeps no palette (it used to copy the 2D map's, "kept in step by hand"); the map renderer keeps none either
  (`planet-view-check` N3, `sphere-texture-check` D3).
- **In the surface (static — identifies this exact planet):** water / land / which region (tilemap), each region's climate
  offsets, the archetype's render hints, coast and shallows, decoration. **And the sky**, as an input: the ground colour is a
  region's temperature / moisture under a sky. The globe uses the planet's starting sky; the gameplay map passes the sky the run's
  ground sees now (`hud().skyNow`: Terraform, scenario drift, shocks) and repaints only when it changes — exactly how the old map
  recoloured its ground (a thaw, a drying decline). Under the starting sky the two are the same image (QA B5).
- **Not in the surface (live overlays, §4):** vegetation by density, dead ground, native stands + hatch, fronts, Biomass bubbles,
  water crossings, selection / hover / focus outlines, purchase and "Would help" previews, sky-change and threshold / competition
  outlines, region labels, origin star, colony badges, pressure haze, shock tint, the Map View layers.
- **Cylinders:** every decoration's x-period divides the grid width (waves 6 · dunes 10 · frost 10 · grain 10 on 60 columns) and the
  coast / shallows use the planet's own neighbour rule, so a cylinder's surface rotates exactly with its tilemap: no seam at
  x = W − 1 → 0 (N5). Rectangles (First Bloom, Training Grounds) keep their real edge.
- **Never regenerated:** the surface takes the planet object it is given (generated, or authored + `BLOOM.resolveLayout`). It
  never re-derives a world from a seed.
- **API:** `surfacePlanet(planet, layout?)` · `surfaceTiles(sp, {render, sky})` (per-tile model) · `paintSurface(ctx, sp, {render,
  sky, tileW, tileH})` (whole pixels, opaque `rgb()` `fillRect` only — Node can rasterise it) · `surfaceSignature(sp, {render, sky,
  extra})` · `stipplesFor(W)` · `palette` · `lightWater` · `wrapsX` · `skyOf`.
- **Proof** (`docs/evidence/bloom-029b/surface-proof.json`, QA N4 / B5 / B25): the run's adapter source and the sphere's planet give
  the same signature and the same pixels for the same world; the sphere demo's texture for Ocean 28 has the same hash as the run's
  surface painted at 8×6; all nine Destination Survey globes' textures are the canonical paint of their exact validated worlds.
- **Look change:** the globe, the grid demo and the Destination Survey now show the Concept 18 light surface. That is the only
  change to them — they changed because they use the same surface, not because the sphere was restyled.

## 3. The Planet View (`resources/run-ui/planet-view.js` + `planet-view.css`)

`BLOOM.planetView.mount(adapter, { root })` → the instance (also `BLOOM.planetView.instance`): `state()`, `renderer`,
`rooms.register / has`, `openRoom`, `setLens / previewLens / openLens`, `openMenu`, `redraw`, `dispose`.

- **HUD (centred):** status (state word: GROWING / PAUSED / BLOOMED / EXTINCT · coverage % with a meter and the win threshold ·
  **Biomass**, the largest number, with its rate · sky now, with the last Terraform change), the tool groups **Explore** (Regions,
  Map View) and **Change** (Adapt, Spread, Terraform), and the clock: **Pause / Resume**, **speed** (exactly 1× → 2× → 4× → 1×) and
  the run menu when the run has one (player / training: the page's own items through `runMenu()` / `actions.runAction`).
  Planet identity shows at ≥ 1400 px; the footer always carries it with the message line.
- **Stage:** the map fills it and never resizes for a panel; floating cards (scenario status, Map View legend, banner, notices)
  sit over it. Icons are one local inline-SVG family (no emoji; the page's own message copy keeps its text, a leading pictograph is
  shown as an icon instead).
- **Widths:** labels on the tools hide below 1200 px (tooltips stay), the sky caption below 1200 / the sky block below 900; no
  horizontal scroll at 1024 / 1280 / 1440; every HUD / banner control ≥ 44 × 44 px.
- **Accessibility:** the map canvas is focusable — arrow keys move a visible region focus (wrap-aware on cylinders), Enter
  selects, Escape clears; Map View and the menu are keyboard-operable (↓ / ↑, Escape returns focus); a polite live region
  announces selection and layer; status never by colour alone (icons + words). Reduced motion: no CSS animation, map feedback
  (crossings) drawn still.

## 4. Map renderer (`resources/run-ui/run-map-renderer.js`) — the 029C mini-map seam

`BLOOM.runMap.createRenderer(canvas, { surface: BLOOM.surface, reducedMotion, onInvalidate })` — one renderer per target canvas;
it owns no simulation and no rules.

| call | |
|---|---|
| `setSource(adapter.surface())` | the planet + render hints + sky; per-region edges and tiles cached |
| `setSky(sky)` | repaints the canonical surface only if its signature changed |
| `layout({ width, height, dpr })` | whole device px per tile; fits the stage height (and the planet's width at least once) |
| `draw(frame)` | `frame = { tiles: mapState(), regions: regions(), selected, hover, focus, preview{gain,lose,reachHostile,better,worse}, effects, bubbles, layer: null \| {key, lamps[]}, haze, tints[], labels, now }` (region **indices**; the caller maps adapter ids) |
| `hitTest(x, y)` → `{tile, x, y, region, copy}` · `bubbleAt(x, y, bubbles)` · `clientOf(tx, ty)` · `info()` |

- **Layers:** surface → live tiles (or the Map View layer) → haze / shock tint → preview tints → region borders, fronts, outlines →
  per copy in screen space: crossings, labels, colony badges, bubbles (on top: they are clickable).
- **Cylinder fill:** a wrapping world is centred on its middle meridian (as the globe faces it at yaw 0) and **repeated** sideways
  until the stage is full (3 copies at 1280 × 800); never padded with invented ocean. Any copy's click resolves to the same
  canonical tile (`x mod W`), and that canonical tile is what the click's `bloom:region-select` reports — QA B8 / B29b click the left
  and right copies. Labels / bubbles near the cut are drawn on every copy.
  A rectangle is drawn once, centred, inside the dark stage frame. Simulation geometry is untouched.
- **Context loss:** Chromium can drop and restore offscreen 2D canvases (blank) at start-up; the renderer repaints the surface on
  `contextrestored` and asks its owner for a frame.
- **029C:** a room mini-map = `createRenderer(itsCanvas)` + `setSource(adapter.surface())` + `draw()` with that room's context region
  as `selected`, `labels` as needed and a smaller stage. Nothing to copy.

## 5. Selection, banner, Map View, scenarios

- **Selection** is the run's own (`adapter.selection()` + `bloom:region-select`). A bubble under the pointer is collected first, as
  in the shell. The banner's X deselects; Pause / speed never touch the selection. The run opens with the origin selected (the
  page's own start), so the banner shows it.
  - **A physical map click = the real canonical tile.** The view sends the renderer's `hitTest` tile (a repeated cylinder copy
    resolves to `x mod W`) through `actions.selectTile(tile)`, which calls the page's own map-click action `selectAt(sec, tile)`.
    So, exactly as the shell's map: the event carries that tile; clicking the selected region again **deselects** it (the event
    still carries the clicked tile); a water tile deselects with `water: true` and the water tile. Only a click on the frame
    outside the planet (no tile) clears through `actions.deselect()`.
  - **Abstract choices = tile −1.** Keyboard Enter on the map's region focus, and future room / context controls, use
    `actions.selectRegion(r)`: idempotent (the selected region stays selected, no second event), `tile −1` (029A's documented
    difference).
- **Banner (only while selected):** region name, status chip (OK / Strained / Blocked), Origin badge, colony status
  (`region.colony.label`), limiting factor (`limiting.key` + the page's words), four condition boxes, "Inspect region", and
  **Would help** = `adapter.wouldHelp(region)` (real previews; `limiting.hint` is not used). Boxes keep category identity in every
  state — Temperature orange, Water blue, Soil brown, Hazard purple (accent bar, tinted icon disc, label) — and carry status
  separately (icon badge + word when not OK). Buttons are intrinsic and wrap. Hovering / focusing a suggestion outlines its real
  effect on the map with the silent `previewOf` (no `bloom:upgrade-preview`, no shell preview).
- **Map View:** a compact popover under its button with exactly Plants / Normal · Temperature · Water · Soil · Hazard. Hover /
  focus previews, leaving returns to the committed view, a click commits and **keeps it open**; outside click, Escape (focus back)
  and the tool toggle close it; another tool closes it. Layer colours are each region's real `conditions[k].lamp` (green / yellow /
  red), strained / blocked ground also marked (dash / dot), with a legend (icon + word). They overlay the canonical surface;
  vegetation is hidden while a layer shows.
- **Scenario status:** one compact card (top-left of the stage) replaces the shell's full-width bars: the scenario, one meter
  (pressure progress with its phase marks · native share · instability with the shock threshold), the key line (phase + % lost /
  native share + trend / instability + band), the next thing (next stage + time / contested counts / shock or forecast), the
  extinction warning, and **Details** for every other live value (drift per channel, sky start → now, start / peak share, each
  axis, threshold, forecast). It pulses on a phase change, a competition event or a new shock (not under reduced motion). Rules and
  copy meaning unchanged; all values from `adapter.scenario()` / `hud()`.

## 6. Adapter additions (additive; `api` stays 1)

| read / action | returns | from |
|---|---|---|
| `surface()` | `{ planet {id, name, gridWidth, gridHeight, globalClimate, sections[{id, name, local{tempOffset, moistureOffset}}], tilemap, topology}, render, sky, startSky }` | the run's planet + the sim's resolved layout; `skyNow` |
| `mapState()` | `{ ticks, width, height, state (0 bare · 1 living · 2 dead), density, native \| null, vigor }` (typed-array copies) | `sim.state / dens / competition.native / vigor` |
| `effects()` | `{ crossings[{id, from, to, took, elapsed}], crossingTiming, thresholds[{…ref, worse, left}], competition[{…ref, type, left}], skyChange{axis, text, gain, lose, better, worse, left} \| null }` | the page's `XANIM`, `PX_FX`, `CX_FX`, `skyFx` |
| `runMenu()` · `actions.runAction(id)` | `{label, items[{id, label, note, primary}]}` or null · the page's own leave / training path | `playActions()` + `goAction` (extracted unchanged from `wireActions`) |
| `actions.selectTile(tile)` | `true`, or `false` for a non-tile (nothing happens) | the page's own `selectAt(tilemap[tile], tile)` — a physical map click (§5) |
| `scenario().pressure.phaseMarks` · `scenario().climate.threshold` | where each phase begins · the shock threshold | the scenario data the shell's bars already marked |

The host gained a `map` part (`render`, `crossings`, `crossingTiming`, `flashes`), `read.runMenu` and `act.runAction`; competition
flashes now also record their event `type`. Nothing else in the page changed for the default path (`run-ui-check` 029A suite).

## 7. 028D1 contracts

- **Events:** all ten `bloom:*` events unchanged — every production control calls the same adapter action (B10, B22).
- **Anchors (`&ui=18`):** re-homed to the production elements, each resolving to exactly ONE element: `biomass`, `coverage`, `sky`,
  `play-pause`, `speed`, `run-menu` (+ `action-*` in its menu), `map` (the canvas), `message-log`, and, on the banner, `inspect`,
  `readout`, `limiting-factor`, `colony-status`. The hidden shell's copies are renamed `data-tutorial-legacy` (and again whenever
  the shell re-renders them). New: `map-view`, `scenario-status`. The shell keeps `growth-focus`, `focus-*`, `local-*`,
  `raw-signals`, `upgrades`, `board-*`, `upgrade-*`, `report`, `report-continue`, `run-actions` until the rooms that show them exist.
- **Training:** starts paused (Pause shows Resume, pressed), deterministic, the menu's Restart / Skip / Main menu go through the
  page's own path (training layer fade + status), no coach UI.

## 8. Seams for the next milestones

- **029C rooms:** `planetView.rooms.register("region" | "adapt" | "spread", { open(ctx) → close })`, `ctx = { adapter, region,
  item, opener, view }`. The Change tools, "Inspect region" and "Would help" already call `openRoom(name, {region, item, opener})`.
  The accepted rules the rooms implement: pause on open (restore on Back), take the home selection as the room context, clear the
  home selection. Until registered, a request shows a development notice and changes nothing (tools carry a small ring).
  Trait → rail categories are still not in the content (029A §6.2).
- **029D Terraform:** `PlanetSphereView` unmodified; `view.setPlanet(adapter.surface().planet, { render: adapter.surface().render })`
  shows the same canonical surface as the map (match regions by **id**, 029A §6.3). Decoration (atmosphere, open / worse regions)
  drawn outside the view.
- **029E default switch:** drop the `ui` flag, hide nothing — delete the shell's visible DOM and `draw()`, keep the host block.
- **029F Survey → gameplay:** the exact `detail.planet` the Destination Survey hands over (an already generated, validated planet)
  must become the run's planet object — passed to the run, **never regenerated from `candidate.seed`**. The surface already takes
  whatever planet object the run holds, so the map will match the globe the player chose pixel for pixel.

## 9. Limitations / risks

- The rooms are not built: `&ui=18` cannot buy upgrades, set growth focus or buy local upgrades (use the shell). The Bloom
  Report / extinction screen are still the shell's modal (visible in both paths).
- Player-mode links do not carry `&ui=18`.
- The page's message copy still contains pictographs in the middle of sentences (e.g. "⚠"); only a leading one is replaced.
- Labels avoid each other with one vertical nudge; very small tiles on crowded worlds can still overlap.
- The shell's own map palette remains in `demo-run.html` until 029E (migration-only).
