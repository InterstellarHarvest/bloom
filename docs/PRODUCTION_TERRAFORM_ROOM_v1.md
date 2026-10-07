# Production Terraform Room v1 (BLOOM-029D handoff)

**From:** BLOOM-029D · **For:** whoever builds BLOOM-029E (room transitions with AtmosphereTransition SUBDUED + the default switch), 029F
(Survey → gameplay), the 028D2 tutorial-coach integration, and the Main PMO.
**Base:** `2d0fb08` (the accepted BLOOM-029C final candidate). Suite: `tools/terraform-check.js` (the 27th). Evidence:
`docs/evidence/bloom-029d/`.

> **Concept 18 supplies presentation. The existing run supplies truth.**
> 029D productionizes the accepted Concept 18 TERRAFORM decision room against the REAL run, as the fourth room of the 029C controller.
> Its nodes are the four real Terraform traits with their real prices, tiers, availability, previews and purchases (`adapter.upgrades`,
> `actions.preview`, `actions.buy`); its globe is the EXISTING, UNMODIFIED `PlanetSphereView` painting the exact authoritative planet under
> the run's CURRENT surface sky; its Soil side is the room-context region's real ground readout. No Concept 18 node, cost, lock, region or
> rule was imported; no fake Soil / Ground / Air skill exists. The coach is not built (028D2), no transition runs (029E).

---

## 1. Files

| file | role |
|---|---|
| `resources/run-ui/decision-rooms.js` | + `buildTerraform()` (the fourth `rooms[*]` entry, same controller, `roomShell` / `mapBlock` / header reused), `CATS.Terraform`, `BANKS`, `TF` geometry, shared `nodeState` / `stateWord` / `effectFor`; the header nav's Terraform button is a ready room; `board-terraform` + `upgrade-warm/cool/humid/dry` claimed; `dispose()` disposes the globe |
| `resources/run-ui/terraform-globe.js` (new) | `BLOOM.terraformGlobe`: guarded dynamic `import()` of the sphere module (http(s) only), the **presentation snapshot**, the Concept 18 atmosphere stop recipe, the default-framing face-radius helper, the flat canonical-surface fallback, `mount(host)` |
| `resources/run-ui/decision-rooms.css` | the Terraform room's presentation (`.r-terraform`, `.tf-*`, Soil card, bank nodes, legend, readout; a scoped transparent-canvas rule for the sphere) |
| `content/traits.js` | + `uiBank` / `uiCategory` on the four Terraform traits (**presentation only**, §3) |
| `resources/run-ui/run-ui-adapter.js` | + `uiBank` on upgrade items; preview results of a sky trait carry `sky` (the page's own what-if: exact current → preview surface sky); `terraformPreview(id)`; `scenario().climate.bandNames` (`api` stays 1, 10 events) |
| `demos/demo-run.html` | `skyWhatIf` records `skyAfter = skyNow()` while its what-if sky is applied; `computePreview` attaches `data.sky = { axis, from, to, current, preview }` for sky traits; loads `terraform-globe.js` |
| `tools/terraform-check.js` (new) · `tools/plant-rooms-check.js` · `tools/planet-view-check.js` | the 27th suite · the 029C / 029B suites updated where they asserted "Terraform not built" (B17 / B19 / B23 / N2 / N3 / N4 / N5 · B17 / B21 / N6) |

Untouched (suite N3, byte-identical to 2d0fb08): `resources/planet-sphere/*` (PlanetSphereView, planet-texture.js, Three.js), the canonical
surface, `bloom-sim.js`, generator, topology, validators, planets, config, scenarios, training data, AtmosphereTransition, main menu, survey,
training layer, mockups, root `index.html`.

## 2. Real Terraform content — and why there are no Soil skills

The current real Terraform traits are exactly four, all atmospheric (`effect.type: "sky"`):

| id | name | effect | uiBank | uiCategory |
|---|---|---|---|---|
| `warm` | Warm the Sky | sky · temp · +6 | Atmosphere | Sky temperature |
| `cool` | Cool the Sky | sky · temp · −6 | Atmosphere | Sky temperature |
| `humid` | Humidify | sky · moist · +8 | Atmosphere | Rain |
| `dry` | Dry the Sky | sky · moist · −8 | Atmosphere | Rain |

There are **zero** real Soil / Ground Terraform purchase skills. Concept 18's Ground placeholders (Rock Weathering, Mineral Dust, Soil
Building, Deep Humus, Wash the Salt) and its Air placeholder were mock-only and are **not** in production: no card, cost, lock, unavailable
button, future node, tier, effect, arrow or surface pin was added for them (suite N4 scans every 029D addition for their names; B6 counts
0 Soil nodes, 0 arrows, 0 pins). `dry` was **not** recategorised as Soil to populate the left side: it lowers atmospheric moisture and sits
with the other atmospheric controls under Rain. The layout honestly represents the current ruleset.

## 3. Presentation metadata (content, presentation only)

`content/traits.js`: `uiBank: "Atmosphere"` + `uiCategory: "Sky temperature" | "Rain"` on the four traits, the same kind of PMO-locked
presentation metadata 029C added for Adapt / Spread. The simulation, effects, costs, availability, previews and validation never read
either field (N2: only the adapter copies them; N2b: identical prices / rules / previews / purchases / sky and identical seeded 900-tick
runs on four worlds with both fields stripped). The room never infers a bank or category from mechanics; a sky trait without metadata
would still read as Atmosphere (`BANK_OF`), and a future real trait with `uiBank: "Soil"` takes the Soil bank.

Category identity (Concept 18): **Sky temperature** = the Temperature family (orange `#d9601f`), **Rain** = the Water family (blue
`#3b8fd0`), the **Soil** readout = the earth / brown family (`#8a6a3e`); the **Atmosphere** bank frames in a cool blue-grey (legend
`#44579a`) without replacing the category accents. Nothing is colour-only: every category has its icon and label, every status its chip.

## 4. Room composition (Concept 18 lock)

`.r-terraform` uses Concept 18's Terraform proportions (20 % / 1fr / 23 %), the sky accent, the shared header (**CHANGE · THE PLANET /
Terraform / Change the planet, not the plant**, Region · Adapt · Spread · Terraform — all ready, Biomass pill, PAUSED, Resume, Back). It
never shows the plant specimen or an anatomy tendril (B1, N4).

- **Left focus column** — `.lf-top.env`: an environment / land focus for the room-context region, drawn from real values only: the ground
  band is the canonical surface's own colour for that region under the shown sky (`BLOOM.surface.surfaceTiles` on a one-tile planet with the
  region's real climate offsets and the archetype's render hints); sky gradient, snow / caps, haze, rain / flakes, lake size, cracks, salt
  flecks, toxicity flecks and the sun's halo follow `adapter.region(ctx).raw` and the sky. Static (no animation). Under it the content-height
  information card: four compact condition rows (Temperature / Water / Soil / Hazard, status chip + reading), the sky line (sky → ground
  here, with the scenario-adjusted note when `hud().skyAdjusted`), the limiting line; while previewing it describes the REAL action (name,
  state line, `sub`, **Changes the planet's sky · not the plant**, current → preview on the changed axis, the region effect, opens / closes
  elsewhere, the buy / needs / reason hint).
- **Centre planet card** (`.tf-stage`, `data-tutorial="board-terraform"`): legend top-left (Soil left · the ground / Atmosphere right · the
  air around the planet), the **Soil bank** on the left (§5), the **real PlanetSphereView** in the middle (§6) inside ONE diffuse atmosphere
  (§8), the **Atmosphere bank** on the right (§9), the sky readout bottom-left (sky now → preview, "drag or ← → to spin").
- **Right column** — the same production mini-map block as the other rooms (§10) and the **Planet readout / Region effect** card (§11).

Planet View underneath: unchanged geometry, 7 px blur, 46 % veil, `inert` + `aria-hidden` (B1 compares the map rect and renderer geometry
before / after; 40 Tab presses never leave the room, B17).

### Geometry (em, from the room em; Concept 18 §7 exclusion zone, v10 §4–5)

`TF = { haloIn .3, haloW 1, clear 1, lane .7, topbot 2.6, margin .5, stepMax 4.9, catGap .45, soilW [8, 9.6], nodeW [7.8, 9.4], ring .42,
soilGap .1, soilHead [.62, 1], soilNose .16 }`. The visible face radius **R** is what the two banks, the halo band, the clearance and the
lanes leave: `R = min((w − soilW − nodeW − badge − 2(haloIn+haloW+clear+lane) − 2·margin) / 2, (h − 2·topbot) / 2 − (haloIn+haloW+clear))`;
the atmosphere's strongest line **HR** = R + .8 em, the exclusion **zone** = R + 2.3 em, the atmosphere is gone at **RO** = R + 2.1 em. Each
bank is a C hugging the zone (nodes' inner edge at zone + lane in the middle, bowed inward toward the poles, the bow reduced until every card
stays outside zone + half a lane), category labels above each category's first node, pushed outward until outside the zone. Measured face
radius: **116 px at 1280×800 · 93 px at 1024×768 · 131 px at 1440×900** (Concept 18's mock globe: 125 / 100 / 141), the component's own
`globeRadiusPx` agreeing with the layout within 0.1 px (B15).

## 5. Soil side — real environmental readout, no fake actions

The Soil bank shows the room-context region's real ground as **information**: the Soil status chip (`conditions.Soil.word`), a Geothermal
badge where `region.geothermal`, pH / salinity / nutrients / toxicity (`region.raw`), the limiting relationship (*Holding the plant back
here* + *No sky change reaches the ground* when Soil is the blocked limiting factor and not terraformable; *Marginal ground* for soft soil;
*The ground suits your plant* otherwise), and — because no real Soil Terraform node exists — one player-facing line: **"No soil interventions
available."** (never developer copy). There is no Soil purchase card, no arrow, no pin.

The code is structured for future REAL Soil traits without a redesign: `layout()` places both banks generically (Soil `side −1`, Atmosphere
`side +1`), `paintEdges()` draws a Soil connector as the accepted near-surface arrow (blunt .62 × 1 em head, .16 em rounded nose, painted nose
.1 em off the visible face, pale outline; never on the face, never crossing text / locks / connectors) **only for a node whose `uiBank` is
Soil**, and the empty-state line disappears once such a node is offered. Nothing is drawn without a real node.

## 6. PlanetSphereView integration (unmodified component)

`resources/planet-sphere/planet-sphere-view.js` is byte-identical to 2d0fb08 (N3 pins the blob hashes). The room consumes it through
`BLOOM.terraformGlobe.mount(host, { reducedMotion, ariaLabel, surface, onReady })`, which uses only the public API: `new PlanetSphereView(host,
{ reducedMotion, ariaLabel, background: null, wheelZoom: false })`, `setPlanet(planet, { render })`, `resize()`, `dispose()`, and `state()`
(the documented read-only snapshot) for the room's measurements. No private member (`_canvas`, `_globe`, `_makeGlobe`, material / texture /
Three.js objects) is read anywhere under `resources/run-ui/`; suite N4 scans the unmasked sources. The pixel-identity proof reads the sphere's
texture canvas (`view._canvas`) only inside the QA harness of `tools/terraform-check.js` — QA introspection, not production coupling. Yaw drag, ← / →, fling, idle rotation (3 s delay, one turn a minute), reduced motion, focusability (`tabindex=0`) and the
accessible label are the component's own (B17, B22); the room adds a visible focus ring as a sibling element around the face (a clipped outline
would vanish) and names the planet in the label (*The planet \<name\> as it is now. Drag sideways or press the left and right arrow keys to spin
it. Terraform previews repaint its sky.*). The host box is sized so the component's default framing (distance 4.2, fov 35°) yields the face
radius the layout wants (`boxFor(R) = 2R / 0.7773`). A scoped CSS rule makes the sphere canvas transparent and borderless again inside the
room (the legacy shell styles every `canvas` dark and bordered); the sphere's own clear colour is already transparent.

Lifecycle: the globe is created at mount (the module import starts when the rooms mount; the room DOM is mounted hidden so anchors exist before
the first open); while the room is hidden the view's box is not visible and the renderer skips it (B19); `controller.dispose()` disposes the
globe with the rooms (view and renderer disposed, 0 textures / 0 geometries / 0 listeners, canvas removed — B19).

## 7. Current-surface presentation snapshot · the exact current / preview sky seam · flat / globe identity

The generic survey sphere paints the **starting** surface (`planet.globalClimate`). The Terraform room represents the **current** planet, so
its globe must paint the canonical surface under the run's CURRENT sky without changing PlanetSphereView. The seam:

1. `adapter.surface()` — the exact authoritative run layout (planet id, grid, sections with their climate offsets, tilemap, topology), the
   archetype render hints, the current surface sky (`hud().skyNow`: Terraform + scenario drift / shock) and the starting sky.
2. `BLOOM.terraformGlobe.snapshot(planet, sky)` — a **presentation snapshot**: the same id / grid / `sections` / `tilemap` / `topology`
   (the very same arrays), `globalClimate` replaced by the current (or previewed) sky. Pure; the authoritative planet is never touched
   (B10 checks `BLOOM_RUN.planet.globalClimate` is still the starting sky after four purchases).
3. `view.setPlanet(snapshot, { render })` — the existing texture path (`planet-texture.js → BLOOM.surface.paintSurface` under
   `planet.globalClimate`) paints the SAME canonical surface the flat gameplay map paints now; it redraws / re-uploads only when the signature
   changes (B10: uploads only on real changes).

This is not a regenerated planet, not a second world, not a simulation mutation.

**Exact current → preview sky.** The room never computes a Terraform rule. `demos/demo-run.html`'s `skyWhatIf` (the existing what-if that
already applied the trait's delta / clamp to a copy of the sky and evaluated every region) now also records `skyAfter = skyNow()` while its
what-if sky is applied, and `computePreview` attaches `data.sky = { axis, from, to, current: skyNow(), preview: skyAfter }` for sky traits. No
mutation is left behind (the page restores its sky in the same statement, as before). The adapter exposes it as `preview.sky` on
`previewOf(id)` / `actions.preview(id)` / `activePreview()` results (`{ axis, from, to, current: {temperature, moisture}, preview: {…} }`)
and as the read-only `terraformPreview(id) → { id, axis, available, currentSurfaceSky, previewSurfaceSky, preview }`. Scenario drift and
active shock offsets are in both skies because `skyNow` is the page's own formula. The `bloom:upgrade-preview` detail picks its own keys and is
unchanged (N5, B18). The room then calls `showSky(pv.sky.preview)` → snapshot → `setPlanet`.

**Identity proof.** N8 (Node, no browser): for 3 worlds × 2 skies the snapshot drawn by PlanetSphereView's own `drawPlanetTexture` equals
`BLOOM.surface.paintSurface` of the authoritative planet under that sky at the texture's tile size, pixel for pixel. B4 / B5 / B7 / B9 / B10 /
B14 / B21 (live run): same planet id, grid, tilemap hash, topology, section ids and current sky as `adapter.surface()`; the flat canonical
surface painted under the current sky at 8×6 px per tile is pixel-identical (full `getImageData` FNV hash) to the globe's texture source — at
the start of a run (where it also equals the sphere-demo / survey globe of the same world: `96023cd9` for Ocean 28), under each preview, after
each of the four purchases and in training. `docs/evidence/bloom-029d/terraform-proof.json` records every hash.

## 8. Diffuse atmosphere (Concept 18 lock; drawn around the component)

ONE SVG radial gradient (`userSpaceOnUse`, centred on the globe, radius RO) under the globe host, no stroke, no ring, no second dotted orbit:
`BLOOM.terraformGlobe.atmosphereStops(face, HR, RO)` = 20 stops — opacity 0 up to the visible face, a half-linear / half-smoothstep rise over
8 stops to **0.46** exactly at HR (where the Atmosphere connectors end), a smoothstep fade over 10 stops to 0 at RO (80 % of the clearance), no
step over 0.1 (N7; the recipe is the accepted Concept 18 one, `docs/UI_CONCEPT_REVIEW_v10.md` §4). The colour is `#6f96d6`; while a node is
previewed it leans to the previewed channel (Sky temperature orange / Rain blue) and the lit connector thickens — the "highlights the relevant
environmental channel" treatment. Nothing in the sphere's shaders or materials changed.

Measured (B15, 1280×800, screenshot probe straight down from the globe centre from 8 px past the face to beyond the zone): largest
neighbouring-pixel brightness jump **≤ 6 levels** (no hard inner or outer line; the sphere's own limb shading is excluded), the atmosphere
**~49 levels** darker than the card at its darkest point, which sits within 1 px of HR, and the card background returns by RO (Δ ≤ 0.1 level).
The DOM stops are checked at all three widths.

## 9. Atmosphere bank (the real nodes)

Right of the globe, a reverse-C hugging the exclusion zone, **only the real offered Terraform traits** in category order top → bottom (upper
sky → weather near the ground): **Sky temperature** — Warm the Sky, Cool the Sky; **Rain** — Humidify, Dry the Sky (B6). Intrinsic cards
(icon disc, name, state line): *N Biomass*, *Tier I owned · next N Biomass*, *Tier I owned · complete*, or the real `reason`; `aria-disabled`
mirrors `canBuy`; the owned / lock badge sits on the card's **outer** top corner (away from the globe); the accessible label says the node
changes the planet, not the plant. Four short connectors from each card's inner edge, aimed at the globe centre, end in a small ring on the
atmosphere's strongest line (HR); they stay outside the face (closest point ≥ face + 1.5 px), cross no label / lock box and never each other
(B15 samples 60 points per connector at three widths). No fake Air / future node, no full orbit.

### Preview / purchase lifecycle (identical contract to Adapt / Spread)

Hover or keyboard focus → `adapter.actions.preview(id)` (the page shows its real preview outlines under the veil and fires
`bloom:upgrade-preview` unchanged) → the room mini-map draws the same gain / lose / better / worse, the globe repaints to the exact preview sky,
the atmosphere leans to the channel, the information card / planet readout / globe readout / land focus read current → preview, the effect
card reads the context region (§11), a climate-instability line appears when that scenario is active (B7, B14). Clears (`actions.clearPreview`
+ the globe returns to the committed current surface) on: node → empty card space, node → another node (replaced), leaving the card, window
blur, document hidden, keyboard focus leaving the nodes (e.g. onto the globe), room switch, room close (B8 — each path checked pixel-identical
to the flat map). Click / Enter / Space on a buyable node → `adapter.actions.buy(id)` → `bloom:upgrade-purchase` unchanged, the real Biomass
spent, the real sky changed by the trait's real delta, the committed globe and map surfaces update, and while still hovered the NEXT real tier
previews (a second `bloom:upgrade-preview`); leaving removes only the transient preview (B9, all four traits). One pause state, one preview
state, one sky: the controller keeps only `hovered` / `preview`.

## 10. Mini-map / region context

The same `BLOOM.runMap.createRenderer` block as the other rooms (`mapBlock`), one instance on its own canvas, the canonical surface under the
current sky (same surface signature as the main map, B11): room-context selection, chip click = context, hover / focus = peek + restore, Map
View / lens chips (room lens only; the Planet View's committed lens untouched), real current planet state; **no** `bloom:region-select` from
context changes (B11). The context remains a REGION that answers "what does this planetary change mean here?"; the Terraform action itself is
global. Because the planet readout grows while previewing, the Terraform mini-map gives up height first (down to 5.5 em) and the strip keeps
one row and scrolls.

## 11. Planet readout · Planet / Region effect card · climate scenario

**Planet readout** (right column, `.mm-ctx.tf`): Sky temperature and Rain · sky moisture as the ground sees them now (`surface().sky` =
`hud().skyNow`), each with ` → preview` on the changed axis while previewing; when `hud().skyAdjusted` the note *Terraformed N · the scenario
adds the rest*; **Climate instability** (Volatile Climate only): the real level / band, and while previewing the engine's real preview
(`preview.climate`: axis before → after %, band change by name from `scenario().climate.bandNames`, *⚠ Sets off a \<shock kind\> (about ±N)*
when `triggersShock`, *Adds to the swing already under way*, *Stays volatile*, else *No shock from this step*), the page's forecast line
otherwise; **Soil here** (status chip) and the **Limiting factor** of the room-context region. No climate consequence is invented (B14 proves
the numbers against `activePreview().climate` on Frozen 4 / Volatile Climate: 5 % → 35 % Unsettled on the first Warm, 35 % → 83 % Critical and a
shock warning on the second).

**Region effect** (under it): the context region classified from the preview's **id lists only** — *Opens \<name\>* / *Closes* / *becomes
reachable, hostile* / *closer, still blocked* / *worse, still growing* / *Unchanged* — plus every list totalled by name (*Opens 2: …*, *Closes
1: …*, *Closer, still blocked 4: …*, *Worse, still growing 2: …*). Fitness is never recomputed in room code (B12).

## 12. Room lifecycle (the 029C controller, unchanged rules)

Planet View → Terraform: the real sim pauses at once (one `bloom:play-pause`), the home selection becomes the context and is cleared
(`bloom:region-select {id:null}`), same background geometry, veil, inert (B1). Region / Adapt / Spread → Terraform and back: still paused, same
context, the previous room's real preview cleared, no Planet View in between (B3: one pause across four switches). Terraform → another room:
its preview cleared and the globe restored to the committed surface before hiding (B3, B8). Back / Escape / Resume: the accepted 029C
semantics (B2). Dispose: §6. Swaps are immediate; `controller.transition` stays `null` for 029E (§14).

## 13. Tutorial anchors (028D1 contract)

The Terraform room now owns **`board-terraform`** (on the planet card) and the real **`upgrade-warm` / `upgrade-cool` / `upgrade-humid` /
`upgrade-dry`** (on the node buttons). They exist on a fresh page before any room opens (the rooms paint once at mount; B20) and each
resolves to exactly ONE production element; the hidden shell's copies become `data-tutorial-legacy`. No anchor exists for any fake skill; the
`upgrade-*` anchors inside the rooms are exactly the offered real traits of all three boards. The report anchors (`report`, `report-continue`,
`run-actions`) remain on the legacy shell until the report converges. The ten `bloom:*` events, their detail shapes, `BLOOM_RUN_UI`, `BLOOM_API`
and training mode are unchanged (N5, B18).

## 14. Training · file:// fallback · 029E seam

**Training** (`?training=1&ui=18`): starts paused; the Terraform room opens paused with the Training Grounds on its globe (pixel-identical
to the flat training map), context Landing Meadow, its four nodes carrying the training run's real prices (= `sim.price`) and availability;
preview / purchase are the real actions; two fresh loads with the same Humidify purchase and 400 ticks are identical tick for tick; Restart /
Skip / Main menu remain (B21). No training mechanic or copy changed.

**file:// / failed module.** `terraform-globe.js` attempts the dynamic `import()` of the sphere module only over http(s) (so no failing
request and no console error over `file://`); on `file://` or a genuine load failure the globe slot shows a restrained flat disc of the
canonical surface (`BLOOM.surface.paintSurface` of the same snapshot, clipped round, repainting for previews and purchases, labelled as a flat
preview); the layout, nodes, Soil readout, preview and purchase are unchanged (B23). It is a developer / offline compatibility path, not an
alternate design, and copies nothing from the sphere.

**029E seam.** Every swap is immediate; `controller.transition` is `null`. 029E wraps (a) Planet View → room, (b) room → room, (c) room →
Planet View in `AtmosphereTransition.SUBDUED` exactly as `docs/PRODUCTION_PLANT_ROOMS_v1.md` §13 describes; the Terraform room's own clear /
restore already happens before a hide, so a covered swap needs no extra step. AtmosphereTransition internals are untouched.

## 15. Accessibility / input

Keyboard-reachable header, Escape closes, node focus previews, Enter / Space buys, visible focus (`:focus-visible` ring; a sibling ring for the
globe), `aria-disabled` / `aria-pressed` current, the globe focusable with a meaningful label and the component's ← / → behaviour, contextual
mini-map chips keyboard-operable, no colour-only status (icons + words everywhere), controls ≥ 44 px (chips ≥ 36), background Planet View inert
to Tab and click, no horizontal scroll at 1024 / 1280 / 1440 (B15, B17). Reduced motion: no room transition or animation; the sphere follows
its own reduced-motion behaviour (no idle spin, no fling) (B22).

## 16. Known limitations / risks (for 029E / 029F)

- **The globe is ~8 % smaller than Concept 18's mock** at each width (116 / 93 / 131 px vs 125 / 100 / 141): the real node cards are wider
  than the mock's icon pills. Narrower node cards or a 22 % right column would buy back a few px; not changed here (the accepted geometry rules
  — halo band, clearance, lane — are kept exactly).
- **Mini-map strip scrolls** on worlds with many regions once the readout grows (one row visible); same behaviour family as 029C's strip.
- **Firefox 1280×800 only** (WebKit not installed); Firefox's WebGL runs the same checks (B4–B10, B17, B21).
- **Idle spin while the room is closed:** the component keeps its rAF loop (it skips drawing an invisible view). Disposal happens with the
  controller; the run page has no other teardown path.
- **No transition** (029E), **no coach** (028D2); the Bloom Report / extinction remain the shell's modal.
- **Headless probe noise:** the sphere's limb shading sits in the first ~6 px outside the face, so the atmosphere probe starts 8 px out.
