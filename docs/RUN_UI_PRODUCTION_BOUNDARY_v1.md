# Run UI Production Boundary v1 — BLOOM-029A handoff

**From:** BLOOM-029A · **For:** whoever builds BLOOM-029B–029E (the Concept 18 run screen) and the Main PMO.
**Base:** `c23815e` (028D1 evidence tip). Evidence: `docs/evidence/bloom-029a/REPORT.md`. Suite: `tools/run-ui-check.js` (the 24th).

> **Concept 18 supplies presentation. The existing run supplies truth.**
> 029A adds no UI. The temporary shell looks and behaves exactly as before: proven run for run, event for event, and pixel for
> pixel below the header, against `c23815e` (REPORT §2). What 029A adds is one small, explicit adapter. Through it, a new
> presentation layer can read the real run and drive the real actions without touching the run page's globals.

---

## 1. Source of truth

| Truth | Lives in | 029A changed it? |
|---|---|---|
| Simulation: ticking, growth, Biomass, coverage, win / loss, prices, upgrade rules, previews (`sim.previewOf`), colonies, bubbles, competition, pressure, climate | `resources/bloom-sim.js` | no |
| Numbers, traits, planets, scenarios, training config | `content/*`, `planets/*` | no |
| Run launch: authored / procedural / `planet=` / `training=1` / `play=1`, validation, failure states | `demos/demo-run.html` (boot script) | no |
| The page's read rules: lamp colours, "growth blocked", Terraform what-ifs (better / worse), crossing reach, scenario status lines, all player copy | `demos/demo-run.html` (UI script) | **moved into named helpers only** (§3) |
| The page's actions: play / pause, speed, select, preview, buy, growth focus, local upgrade, bubble collect / place; each fires its `bloom:*` event | `demos/demo-run.html` (UI script) | **moved into named functions only** (§3) |
| Map rendering (canvas, colours, outlines, badges, crossings) | `demos/demo-run.html` `draw()` | no |

The adapter (`resources/run-ui/run-ui-adapter.js`, ~230 lines) has no simulation, rules, prices or copy of its own. It does
not touch the DOM, run a loop, set a timer or read page globals, and it cannot write to the sim. `run-ui-check` N2 enforces
this in the source.

## 2. Adapter API (v1)

```js
const A = window.BLOOM_RUN_UI.adapter;    // published before bloom:run-ready; absent on a failed launch
A.api                                     // 1
A.events                                  // the 10 bloom:* types it relays (028D1 §7)
```

Region references in: an index (`0…n−1`) or a region id (`"chill_hollow"`). Region references out: `{ index, id, name }`, where
`name` is the shell's display label (repeated biome names are numbered). Preview region lists are **ids**, the same as in
`bloom:upgrade-preview`. Every read returns a fresh plain-data object. Never a live engine array.

### Reads

| call | returns |
|---|---|
| `run()` | `planetId, planetName, kind` (authored / procedural), `archetypeId, archetypeName, seed, scenarioId` ("eden" when none), `scenarioName, mechanics {pressure, competition, climate}, training, play, started, running, speed, speeds [1,2,4], ticks, seconds, tickMs, won, lost, lostReason` |
| `hud()` | `biomass` (as shown, floored), `biomassExact, biomassRate` (/s; null before the first tick), `coverage, coveragePct, winAt, winPct, sky` (Terraformed), `skyBase` (the planet's start), `skyNow` (+ scenario drift / shock), `skyAdjusted, skyChange {axis, text, until}` (the last Terraform purchase, for 8 s) |
| `scenario()` | `id, name, title, summary`, then `pressure` (phase, phaseName, progress, seconds, offsets, max, next, nextIn, extinctionIn), `competition` (share, startShare, peakShare, contested, trend, trendText, playerLeads, nativeLeads) and `climate` (level, band, bandName, peak, offsets, env, axes {name, level, offset, shock {…, endsIn}, pending {…, startsIn}}, forecast). Each block is `null` when that mechanic is not in the run |
| `regions()` | every region: `index, id, name, biome, isOrigin, selected, landmass, area, center {x,y}` (tiles), `living, fitness, lamp, blocked, limitKey, colony {word, establishment}, focus, localUpgrade` |
| `region(r)` | the above plus `geothermal`; `conditions[4]` (Temperature, Water, Soil, Hazard: `key, word, f, lamp, soft, terraformable`); `limiting {key, f, blocked, text, hint, softSoil}`; `temperature {ground, sky, plantMin, plantMax}`; `colony {word, label, hint, establishment}`; `vitals {vigor, living, dead, barren, native, area}`; `raw {effectiveTemp, effectiveMoist, light, ph, salinity, nutrients, toxicity, radiation, effectiveRadiation}`; `geo` (island access, or null); `pressure`; `competition` (the engine's `competitionAt` + `why`) |
| `selection()` | the home selection `{ index, id, name, water }` |
| `upgrades()` | `[{ board, items[], tempPoints? }]`: Spread, Adapt, Terraform, in shop order, offered only. Each item: `id, board, name, short, sub, effect, axis, tier, maxTier, owned, price, rules` (allowed by the rules), `affordable, canBuy, reason, science` |
| `upgrade(id)` | one item, plus `offered` |
| `previewOf(id)` | **the real preview, computed without showing it**: `available, gain, lose, better, worse, reachHostile, climate, text`. No outline, no footer, no event. For a Terraform it includes the better / worse what-if; for a crossing, the reach |
| `activePreview()` | what the main map outlines now, or null |
| `wouldHelp(r)` | offered upgrades whose real preview opens region `r` now. The rules must allow the purchase; affordability is not required |
| `colony(r)` | `living, focus, focusChoices[4] {id, name, icon, summary, description, selected, available}, localUpgrade, localUpgradeName, localPrice, localChoices[3] {id, name, mode, summary, description, block, available}, synergy, tip` |
| `bubbles()` | `[{ tile, x, y, age, region }]` |
| `message()` | the footer's current message |
| `map()` | `width, height, tilePx, topology, canvas` (the real canvas element), `regions [{…ref, landmass, center}]`, `tilemap` (tile → region index, −1 water) |
| `tileAt(clientX, clientY)` | `{ tile, region, id }` on the real canvas (region −1 = water, −2 = outside) |

### Actions: `A.actions.*`

Each action calls the run page's own action function. That function changes the one sim, writes the footer, redraws the map
and fires the unchanged `bloom:*` event, exactly as the shell's buttons do.

| action | real path | result |
|---|---|---|
| `play()` · `pause()` · `setRunning(bool)` · `togglePlay()` | `setRunning` (the ⏸ / ▶ button) → `bloom:play-pause` | running. A no-op (pause while paused) fires nothing |
| `setSpeed(1\|2\|4)` · `cycleSpeed()` | `setSpeed` (the speed button) → `bloom:speed` | the speed; `false` for any other value |
| `selectRegion(r)` · `deselect()` | `selectAt` (the map click) → `bloom:region-select` | `true`. It is idempotent: the selected region stays selected. The event's `tile` is −1 (it was not a map click) |
| `preview(id)` · `clearPreview()` | `showPreview` / `clearPreview` (shop hover / leave) → `bloom:upgrade-preview` | the `previewOf` snapshot. **Shows** it: map outline, footer, event |
| `buy(id)` | `buy` (shop click) → `bloom:upgrade-purchase` | `true` / `false`. A refused purchase fires nothing |
| `setGrowthFocus(r, mode)` | `chooseFocus(mode, i)` → `bloom:growth-focus` | `true` / `false` |
| `buyLocalUpgrade(r, id)` | `buySpec(id, i)` → `bloom:local-upgrade` | `true` / `false` |
| `collectBubble(tile)` | `collectBubbleAt` (the bubble click) → `bloom:bubble-collect {how:"click"}` | `true` / `false` |
| `placeBubble(regionId?)` | `BLOOM_RUN_UI.placeBubble` (unchanged) | the tile, or −1 |

Unknown ids, modes and regions return `false` / `null` / −1 and touch nothing (B8). The adapter and `A.actions` are frozen.

## 3. What stays in `demos/demo-run.html`, and what 029A moved there

Everything stays: sim creation, boot, rendering, the shell's DOM, all copy, `BLOOM_API`, `BLOOM_RUN_UI.placeBubble`, the
training wiring.

029A changed the page in two ways, and changed no behaviour:

- **Helpers extracted** so the shell and the adapter share one implementation:
  - `catLamp` · `isBlocked` · `tileCounts` (inspect)
  - `geoInfo` (island note)
  - `pressureStatus` (pressure bar)
  - `compBar` (the competition bar's last trend; `compTrend` samples history, so it is read once a frame, in `renderComp`)
  - `BOARDS` · `offeredOn` · `upgradeState` (shop)
  - `computePreview` (`describePreview` = compute, then show)
  - `lastMessage` (footer)
- **Actions extracted:**
  - `setRunning` · `setSpeed` / `SPEEDS` · `selectAt` · `collectBubbleAt`
  - `chooseFocus` / `buySpec` gained an optional region, defaulting to the selected one, as before. That lets a room act on its
    own context.

The host block (`RUN UI BOUNDARY (BLOOM-029A)`, just before the run starts) lists everything the adapter may reach. If the
adapter file is missing, the shell runs exactly as before; the hooks are no-ops.

## 4. Update model: `A.subscribe(fn) → unsubscribe`

`fn(change)` receives `{ revision, ticks, reasons[], events[{type, detail}] }`, frozen.

- **Batched per microtask.** Every change in one task arrives as one notice, after the whole action completed. A subscriber
  never sees half an action.
- **Reasons:**
  - the 10 `bloom:*` types (the detail is a copy)
  - `"tick"`: at most once per animation frame, and only on frames where the sim advanced. That is about 6/s at 1× and 25/s at
    4×. Nothing comes while paused.
  - `"preview-clear"`, `"message"`, `"bubble-place"`, `"loss"`, `"continue"` (the report's Keep playing)
- **No second loop.** The page's own frame loop calls the adapter's `frame()` once per frame. The adapter compares `sim.ticks`
  and does nothing else.
- **Pull model.** A subscriber decides what to re-read: `hud()` on every notice, `region()` / `colony()` on a selection or
  purchase, and so on. The adapter never rebuilds DOM. A throwing subscriber is logged and the run continues.

## 5. 028D1 contracts: preserved

- **Events:** all 10 `bloom:*` CustomEvents on `document`, fired after the action, with the same detail, in ordinary and
  training runs. Every dispatch site survives, with the same count per type (N6).
  - Twin training pages, one driven by real clicks and one by the adapter, fire identical events and end in the same sim, tile
    for tile (B3).
  - One documented difference: an adapter `selectRegion` reports `tile −1`.
- **Anchors:** every `data-tutorial` name resolves in the current shell (B6): header, `action-*`, map, inspect, focus / local,
  boards, every `upgrade-<id>`, footer, report, `report-continue`, `run-actions`.
- **`BLOOM_RUN_UI.placeBubble`:** unchanged. `BLOOM_RUN_UI` gains `.adapter`.
- **`BLOOM_API`:** the same 19 members, and the same 12 `state()` fields (B8).
- **Training:**
  - starts paused, deterministic, Restart / Skip / Main menu, status store
  - `training-check` 82/82 in the broad run
- **No coach code.** None of 028D2's uncommitted work was imported (N5).

## 6. Seams for the next milestones

### 6.1 Map (029B: the real map in the Planet View)

- **Map and click.** Mount the existing canvas (`A.map().canvas`, drawn by `draw()` every frame) and keep its click handler: the
  bubble hit first, then `selectAt`. `A.tileAt` gives overlays the same hit-testing.
- **Home selection.** It is `selection()` plus `bloom:region-select`. Concept 18's "ocean click deselects" already matches: a
  water click selects nothing (`index −1, water true`).
- **Map View layers** (Temperature / Water / Soil / Hazard lenses) **do not exist in the real renderer**. They would be a new
  draw mode inside `draw()`, colouring tiles by `region(r).conditions` lamps. The data is there; the drawing is not.
- **Fill-width.** The renderer sizes `TILE` to fit the stage and draws only the grid. Concept 18's fill-width "more ocean" is a
  renderer change. On a cylindrical world, the extra width should wrap (repeat columns), not show invented ocean.
- **Mini-maps.** The renderer is page functions bound to one canvas (`cv` / `ctx` / `TILE`). A room mini-map needs `draw` to
  take a target context and tile size: a render refactor, not a new renderer.

### 6.2 Region / Adapt / Spread (029C)

- **Selection versus room context** is supported:
  - `region(r)`, `colony(r)`, `wouldHelp(r)` and `previewOf(id)` read any region without selecting it.
  - `setGrowthFocus(r, …)` and `buyLocalUpgrade(r, …)` act on any region.
- **Banner "Would help" buttons** = `wouldHelp(r)` (real previews). The shell's `limiting.hint` is the old fixed suggestion text.
- **Condition boxes:**
  - OK / Strained / Blocked = `conditions[k].lamp` green / yellow / red.
  - Readings = the engine's words (`cold`, `parched` …). Concept 18's "Soggy" / "Too cold · −6 °C" are mockup copy.
- **Tree rails and later-tier nodes.**
  - Concept 18's rails (Hazard / Water / Temperature / Soil; Seeds / Growth / Reach) are **not in the content**. Traits carry
    only `board` and an effect type.
  - Grouping needs a small data field in `content/traits.js`. That is a content decision for the PMO, not UI logic.
  - Concept 18's later-tier nodes are mockup placeholders. The real tree is the 13 traits, with `tier` / `maxTier`.
- **Room hover.**
  - `previewOf` previews in place, silently.
  - `actions.preview(id)` also fires `bloom:upgrade-preview` and outlines the (blurred) home map.
  - Decide which one tree hover uses. The 028D2 coach listens for the event.
- **Room pause.** Rooms auto-pause through `actions.pause()`, and that fires `bloom:play-pause {running:false}`. The tutorial
  cannot tell a room pause from a player pause, because the detail shape is frozen. Decide this with 028D2.

### 6.3 Terraform globe (029D): PlanetSphereView, unmodified

```js
import { PlanetSphereView } from "../resources/planet-sphere/planet-sphere-view.js";
view.setPlanet(BLOOM_RUN.planet, { render: (BLOOM_RUN.archetype && BLOOM_RUN.archetype.render) || null });
```

- **Mechanics stay in the sim.** Terraform previews and purchases use `previewOf` / `actions.buy`, and the sky readout uses
  `hud().sky / skyNow / skyChange`. Preview decoration (atmosphere, open / worse regions) is drawn **outside** the view.
- **The globe shows the starting surface under the starting sky** (`planet.globalClimate`): no plants, no Terraformed sky.
  Showing the live state is the decoration layer's job, or a later sphere milestone.
- **ES module over http(s) only.** The run page still boots over `file://`. Load the sphere with a guarded dynamic `import()`
  and keep a 2D fallback, as the training layer already does.
- **Region identity.** `pickAt().region` indexes the **planet's** sections. The sim indexes its land-only layout, and the two
  differ when a planet has impassable sections. Match by **id** (`sectionId` ↔ adapter `id`), never by index.
- **Seam.** Authored worlds (First Bloom, Training Grounds) have no `topology`. They are rectangles, so the globe shows a real
  seam at the cut. Generated worlds are cylinders.

### 6.4 Room transitions (029E): AtmosphereTransition, unmodified

```js
import { AtmosphereTransition } from "../resources/atmosphere-transition/atmosphere-transition.js";
await atx.run({ preset: "subdued", onCovered: () => swapRoom() });   // conceal:"full" if the swap must not be seen
```

- **Order:** pause, then run, then swap at covered, then reveal. On Back, restore the previous running state.
- **The page loop keeps drawing under the veil.** That is harmless, because the sim only ticks while running.
- **Same constraint as the sphere:** an ES module, http(s) only, with a guarded import.
- **Motion:** read it the way the training layer does (`main-menu-data.js` `readSettings` → `reducedMotionFor`).

## 7. Concept 18 mock data: not imported

029A added no Concept 18 code, data or files. None of the mockup's ten regions, its item placeholders, `future` nodes, costs,
or the `ui-mockups/` and `shared.js` / `c18.js` files appear in 029A's additions. `run-ui-check` N5 scans every added line.
Every value the adapter returns comes from the real run.

## 8. Other notes for 029B+

- **Copy lives in the run page.** That covers `LIMIT_MSG`, `FIX_HINT`, `FOCUS_UI`, `SPEC_UI`, `COLONY_*` and the scenario
  lines. If the new screen moves out of `demo-run.html`, move the page's read rules and copy *with* the host (for example into
  `resources/run-ui/`). Do not re-type them.
- **Anchors live in the old shell.** A reskin keeps the 028D1 anchors only if it re-homes every name (list in §5 and
  TRAINING_FOUNDATION §9).
- **Cost of the reads:**
  - `regions()` evaluates every region.
  - `wouldHelp(r)` runs one preview per offered upgrade (a Terraform what-if evaluates all regions twice).
  - Read these on selection / purchase notices, not on every `"tick"`.
- **Pre-existing quirks, kept as they are:**
  - The report's *Keep playing* resumes without `bloom:play-pause`. The adapter notices it as `"continue"`.
  - `BLOOM_API.advance` stops the clock without updating the ▶ button. It is a QA hook.
