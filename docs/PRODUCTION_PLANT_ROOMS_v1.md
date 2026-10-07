# Production Plant Rooms v1 — Region Inspect · Adapt · Spread (BLOOM-029C handoff)

**From:** BLOOM-029C · **For:** whoever builds BLOOM-029D (Terraform room), 029E (room transitions + default switch), 029F
(Survey → gameplay), the 028D2 tutorial-coach integration, and the Main PMO.
**Base:** `2750cbb` (the accepted BLOOM-029B final candidate). Suite: `tools/plant-rooms-check.js` (the 26th). Evidence:
`docs/evidence/bloom-029c/`.

> **Concept 18 supplies presentation. The existing run supplies truth.**
> 029C productionizes the three accepted Concept 18 decision rooms against the REAL run: every region, colony, trait, tier,
> price, availability, preview and purchase comes from `BLOOM_RUN_UI.adapter` and acts through `adapter.actions`, so every
> `bloom:*` event fires unchanged from the run page's own action functions. No mockup file, region, node, cost or rule was
> imported. Terraform was **not** built here; **BLOOM-029D** added it as the fourth room of this controller
> (`docs/PRODUCTION_TERRAFORM_ROOM_v1.md`). No transition runs (029E), no coach exists (028D2).

---

## 1. Files

| file | role |
|---|---|
| `resources/run-ui/decision-rooms.js` (new) | `BLOOM.decisionRooms.mount(planetView)` — the room controller (open / close / switch / context / pause-restore), the shared header, the mini-map block, Region Inspect, Adapt, Spread, the organic tendrils, the preview / purchase contract, anchor re-homing |
| `resources/run-ui/decision-rooms.css` (new) | the rooms' presentation (Concept 18 room family), scoped to `.pv .dr` |
| `resources/run-ui/plant-specimen.js` (new) | `BLOOM.plantSpecimen` — the production plant specimen (SVG), driven by real owned tiers / colony / context |
| `content/traits.js` | + `uiCategory` on the nine Adapt / Spread traits (**presentation only**, §6) |
| `resources/run-ui/run-ui-adapter.js` | + `uiCategory` on upgrade items (one additive copy; `api` stays 1, 10 events) |
| `resources/run-ui/planet-view.js` / `.css` | room seam extensions: `rooms.claimAnchors`, `rooms.setActive`, `rooms.parts`, `state().room`, `toast` exposed; the toast now lives at the `.pv` root so it reads above the room veil |
| `demos/demo-run.html` | loads the three files; mounts the rooms right after the Planet View (`BLOOM.decisionRooms.mount(pv)`) — by default since BLOOM-029E (`&ui=18` was the migration flag; `?ui=legacy` shows the engineering shell instead) |
| `tools/plant-rooms-check.js` (new) · `tools/planet-view-check.js` | the 26th suite · B17 (rooms registered, Terraform still on the seam) and N6 (traits.js may carry only `uiCategory`) updated |

Untouched: `bloom-sim.js`, generator, topology, validators, planets, config, scenarios, training data, PlanetSphereView, the
canonical surface, AtmosphereTransition, main menu, survey, training layer, mockups, root `index.html` (suite N3).

## 2. Room controller lifecycle

`BLOOM.decisionRooms.mount(pv)` builds the three rooms once (hidden) inside the Planet View's element, registers them on
the seam (`pv.rooms.register("region" | "adapt" | "spread", { open(ctx) → close })`) and returns the controller (also
`BLOOM.decisionRooms.instance`): `open(name, ctx)`, `close(resume)`, `setCtx(i)`, `setLens`, `previewLens`, `calibrate`,
`state()`, `measure(name)`, `transition` (029E seam, §13), `dispose`.

Opening (through `pv.openRoom(name, { region, item, opener })` — the HUD tools, the banner's *Inspect region* / *Would help*
buttons, and the rooms' own header nav all go there):

1. **first room** — `adapter.run().running` is remembered as `wasRunning`; if running, `adapter.actions.pause()` (the REAL pause: the
   page's `setRunning(false)` → `bloom:play-pause {running:false}`); the room context is **the home selection if any, else the
   room's previous context if still valid, else the origin**; the home selection is cleared through `adapter.actions.deselect()`
   (the real `bloom:region-select {id:null}`); the layer shows, the room em is calibrated (§5), `.pv` gets `in-room`, and the
   Planet View's HUD / stage / footer become `inert` + `aria-hidden` (they stay mounted, in the exact same geometry — nothing is
   resized or reframed; QA B1 compares the map rect and renderer geometry before / after);
2. **another room already open** — the old room's transient state is cleared (its real preview through
   `adapter.actions.clearPreview()`, its peek), it hides, the new one shows; still paused, same context; no Planet View in between;
3. the room shows, paints from the adapter, `pv.rooms.setActive(name)` presses its HUD tool, focus goes to the room (`h2`, or the
   requested real upgrade node when `ctx.item` names one — its focus preview is a deliberate real preview, §9).

Closing: **Back** / **Escape** → clear previews and peeks, hide, un-inert the Planet View, `adapter.actions.setRunning(wasRunning)`
(running → runs again, paused → stays paused; a no-op fires nothing), focus returns to the opener (else the Regions tool); no home
region is selected. **Resume** → the same, but `adapter.actions.play()` regardless. There is **one** pause state (the run page's);
the controller keeps only `wasRunning`, `room`, `ctx`, `peek`, `lens`, `hovered`.

Room → room keeps paused, keeps the context, clears the old transient preview; QA B3 counts exactly one `bloom:play-pause` across
Region → Adapt → Spread.

**Terraform** (029C state): stayed on the seam, its header-nav button visibly unavailable. **Since BLOOM-029D** it is the fourth
registered room (`buildTerraform()` in the same file, same lifecycle rules); the header nav opens it like the others. When a room opens
with a requested real node (`ctx.item`, a "Would help" suggestion) the controller arms `state.suspended` so a `pointerover` the browser may
synthesise under the stationary pointer after the swap (Firefox) does not clear the deliberate focus preview (029D).

## 3. Home selection vs room context

Room context is **not** `adapter.selection()`. The rooms read `region(ctx)`, `colony(ctx)`, `wouldHelp(ctx)` and act with
`setGrowthFocus(ctx, …)` / `buyLocalUpgrade(ctx, …)`; they never call `actions.selectRegion` / `selectTile` (suite N4 scans for
it). Changing the context (mini-map click, region-chip click, `controller.setCtx`) emits **no** `bloom:region-select` and never
touches the hidden home selection (QA B5). When a room closes, no home region is selected.

**Fallback to origin:** `ctx.region ≥ 0` → that; else `selection().index ≥ 0` → that; else the last room context; else the origin.

## 4. Mini-map / region strip (every room's right column)

`BLOOM.runMap.createRenderer(roomCanvas, { surface: BLOOM.surface, frame: cream })` + `setSource(adapter.surface())` + `draw(frame)` —
the **same production renderer** as the Planet View, one instance per room canvas; no terrain or tile drawing exists in the rooms
(N4), and the three mini-maps paint the same canonical surface signature as the main map (B6). The box takes the planet's exact
whole-pixel height after layout, so no frame colour shows above / below the planet.

Frame inputs: `focus: ctx` (the room context's own solid outline), `hover: peek`, `selected: −1` (the home selection is empty
while a room is open), `preview` = the real preview lists of the hovered node (ids → indices), `layer` = the room lens with
`region(i).conditions` lamps, real `effects()`, `bubbles()`, pressure haze; labels off (the strip names the regions).

- **Region strip:** one chip per real region (status icon + word in the title, origin star, `living`); **click = room context**,
  **hover / focus = peek** (the mini-map outlines it, the peek line reads name · colony · limiting factor), leave / focus-out /
  window blur / pointer-out-of-window restore. The mini-map itself peeks on hover and sets the context on click.
- **Map View chips:** Plants / Normal · Temperature · Water · Soil · Hazard, the same lens language as the Planet View; hover /
  focus previews, click commits, leaving restores. The room lens is presentation-only state shared by the three rooms; it never
  changes the Planet View's committed lens.
- Below: a separate content-height card — Region Inspect: *This region now*; Adapt / Spread: *Region effect of this choice* (§10).

## 5. Room scale (Concept 18's "three chips across")

A hidden probe (`.dr-probe`, the room grid at a known font size with one median-length REAL region chip) is measured at two font
sizes; the room em is the largest value at which **three** such chips, two gaps and the column chrome fit the right column (plus
0.8 em of slack), capped by height (`H / 40`) and `[12, 22]` px. Measured: **17.3 px at 1280×800, 13.8 at 1024×768, 19.4 at
1440×900** on Ocean 28 (median "Mire Basin"; Concept 18 calibrated 17.5 / 14 / 19.7 on its mock names); the chip fit is
re-measured in QA B15 (three chips + gaps = 297 / 370 / 413 px in strips of 304 / 381 / 429 px). Every room measurement is in em, columns are 21% / 1fr / 33%, so the room scales as a whole.

## 6. Trait presentation categories (PMO-locked, content metadata)

`content/traits.js` `uiCategory` — presentation only; the simulation, effects, costs, availability, previews and validation never
read it (N2: only the adapter copies it; N2b: identical prices / rules / previews / seeded runs with the field stripped).

| board | trait | uiCategory | colour |
|---|---|---|---|
| Adapt | `rad` | Hazard | purple `#8a5bb8` |
| Adapt | `drought`, `flood` | Water | blue `#3b8fd0` |
| Adapt | `cold`, `heat` | Temperature | orange `#d9601f` |
| Adapt | `salt` | Soil | brown `#8a6a3e` |
| Spread | `seedOut` | Seeds | amber `#c58a1a` |
| Spread | `earlyMat` | Growth | green `#3f9d4b` |
| Spread | `waterSeeds` | Reach | teal `#1f8f8f` |

The trees group by this field (never by effect type). Category order top → bottom: Hazard · Water · Temperature · Soil; Seeds ·
Growth · Reach. A category with no offered trait (Reach on a world without water crossings) is not drawn.

## 7. Region Inspect

Left: the production specimen in the room context (caption *Your plant in \<region\>* · colony label · thriving / stressed, or *No
colony yet* / *would not survive yet*) and a content-height card: colony label, establishment %, focus, local upgrade, limiting
factor, the real owned Adapt / Spread traits. Centre: a content-height card with the region name, status chip, colony word, Origin,
and three real tabs (`role=tablist / tab / tabpanel`, `aria-selected`, roving tabindex, ← → Home End):

- **Overview** — four condition rows with the accepted category identity (accent, tinted icon disc, category-coloured name, faint
  wash) and a separate status chip (icon + word) and the engine's reading (`conditions[k].word`, Temperature with the ground °C);
  the limiting box (`limiting.key` + the page's words); **Would help** = `adapter.wouldHelp(ctx)` as intrinsic buttons — an Adapt /
  Spread suggestion opens that room with the same context and focuses the real node; a Terraform suggestion does the same with
  the Terraform room (since 029D; it reported the seam notice in 029C).
- **Colony** — `adapter.colony(ctx)`: establishment bar, growth focus (Balanced / Roots / Leaves / Seeds: selected, availability,
  description) and local upgrades (Root Network / Leaf Canopy / Seed Reserve: ownership, price, block reason, synergy, tip).
  Clicks are `actions.setGrowthFocus(ctx, mode)` and `actions.buyLocalUpgrade(ctx, id)` → `bloom:growth-focus` /
  `bloom:local-upgrade` from the page. No colony rule lives in the room.
- **Science** — `adapter.region(ctx).raw`: ground temperature, ground moisture, light, pH, salinity, nutrients, toxicity, radiation
  (with the effective surface value when the sky adds to it) — eight rows, the plant's own temperature range as a note.

## 8. Production plant specimen (`BLOOM.plantSpecimen`)

`mount(host, { reducedMotion }) → { render(state), highlight(part), anchorPoint(part) (client px), anchors(), signature(), parts }`,
and the pure `draw(state) → { markup, anchors }` (QA N7 proves it deterministic and that every trait changes it).

`state = { traits {id → owned tier}, preview {id, tier} | null, colony {living, establishment, word}, focus, local, condition
"ok" | "warn" | "bad", viable, names }` — all read from the adapter by the rooms (`upgrades()`, `colony(ctx)`, `region(ctx)`).

Authored modular plant (sky band, soil line, turf, stem, leaves + basal rosette, roots, seed head / flower / pods), drawn 1.45× about
the soil point. Real traits → anatomy (strength / quantity scale with the REAL tier): **cold** frost hairs, stouter shorter stem,
fewer compact leaves · **heat** waxy reflective leaves, pale cuticle · **drought** thick water-storing leaves + a taproot · **flood**
air roots above the soil line, long narrow leaves · **salt** crystals on the leaf tips · **rad** dark protective pigment ·
**seedOut** more / stronger seed puffs · **earlyMat** an early flower · **waterSeeds** floating pods (and a little standing water).
Growth focus and local upgrade (roots / leaves / seeds counts, nodules, canopy) and the region condition (ghost when no colony,
desaturated when it would not survive, drooping leaves when stressed) are restrained presentation and never change gameplay truth.
Terraform never touches it.

Anchors (SVG → client through `getScreenCTM`), top → bottom: `seedHead` · `pigment` · `flowers` · `leafShape` · `pods` · `stem` ·
`roots`. A preview (`state.preview`) draws the trait at its next real tier, shows the PREVIEW tag and lights the category's part.

## 9. Adapt / Spread rooms: trees, organic connectors, preview vs purchase

**Tree** (`readTree`): `adapter.upgrades()` for the board → the offered real items only, grouped by `uiCategory`, one card per trait
(no later-tier placeholders, no invented skills). Card: category accent, icon, name, state line — *N Biomass* (buyable), *Tier I
owned · next N Biomass* (multi-tier), *Tier I owned · complete* (maxed), or the **real** `reason` (e.g. the one-water-strategy
rule) when the rules refuse it; `aria-disabled` mirrors `canBuy`; the Biomass pill in the header shows affordability. Layout:
rail at 1.5 em, category label, cards to the right; row step capped at 5.4 em so Spread's card is content-height and shorter than
Adapt's (289 vs 538 px at 1024; 360 vs 673 at 1280; 404 vs 755 at 1440 — QA B15).

**Organic tendrils** (the only treatment; no Bridge / Docked / selector, N4): a room-level SVG draws, per category present,
anchor ring + halo + dot → label plate (the part's name) → the tendril (`M anchor H x0 C … port`, tension .30 / .26, shared x-profile)
→ the rail port (drawn by the tree) → the category label → that category's cards. Weights from the room em with Concept 18's
floors: idle `max(.52em, 8.5px)`, lit `max(.8em, 12.5px)`, glow 1.9× lit, vein `max(.12em, 2px)` — **8.5 / 9.0 / 10.1 px idle and
12.5 / 13.8 / 15.5 px lit at 1024 / 1280 / 1440** (glow 23.8 / 26.3 / 29.5, vein 2 / 2.1 / 2.3); others dim to 0.4 while one is lit. Anchors and ports are both ordered top → bottom
by category, so no two tendrils can cross; QA samples every pair at the three widths, idle and lit: **0 crossings**, closest
clear space 5.1 / 7.8 / 9.0 px idle and 2.9 / 5.1 / 6.0 px lit (Temperature / Soil, the same tightest pair Concept 18 reported).

**Preview contract.** Hover or keyboard focus of a real node → `adapter.actions.preview(id)` — the deliberate player preview: the
page shows it (home-map outline under the veil, footer) and fires `bloom:upgrade-preview` with its unchanged detail; the room
mini-map draws the same gain / lose / reachHostile / better / worse, the specimen previews the next real tier with the category's
part lit, the tendril lights, the information card describes the real trait (name, tier / price, `sub`, `science`, *Changes
\<part\>*, opens / closes), the effect card reads the context (§10). Never the silent `previewOf` for nodes (N4). It clears
(`actions.clearPreview()`) on: pointer to empty tree space, pointer to another node (replaced), leaving the tree, window blur,
document hidden, pointer leaving the window, keyboard focus leaving the tree, switching rooms, closing the room (QA B12). Context
changes leave the real preview valid (the effect card re-reads it), but in practice the pointer / focus has already left the node.

**Purchase.** Click / Enter / Space on a buyable node → `adapter.actions.buy(id)` → the page's own `buy` → `bloom:upgrade-purchase`
unchanged; the specimen reflects the owned tier for good, the card and chips update; if the pointer / focus is still on the node
the preview re-reads the **next** real tier (a second `bloom:upgrade-preview`); leaving clears the transient preview and keeps the
owned plant (QA B13, B14). A refused click (not buyable) only previews.

## 10. Region effect card

For an active real preview, the room-context region is classified from the preview's **id lists only** (never recalculated): in
`gain` → *Opens \<name\>*; `lose` → *Closes*; `reachHostile` → *becomes reachable across water, but hostile*; `better` → *closer,
still blocked*; `worse` → *worse, still growing*; else *Unchanged*; plus the lists for other regions. With no preview it summarises
the context (name, colony, limiting factor). Training: Chill Hollow + Cold Tolerance reads *Opens Chill Hollow* (QA B21).

## 11. Tutorial anchors (028D1) — who owns what under the production default

| anchor | owner |
|---|---|
| `biomass` `coverage` `sky` `play-pause` `speed` `run-menu` + `action-*` `map` `message-log` `map-view` `scenario-status` | Planet View (029B) |
| `inspect` `readout` `limiting-factor` `colony-status` | Planet View banner (029B) — kept there (one element each; the Region room repeats the information without the anchor) |
| **`raw-signals` · `growth-focus` · `focus-balanced/roots/leaves/seeds` · `local-upgrade` · `local-rootNetwork/leafCanopy/seedReserve`** | **Region Inspect room (029C)** |
| **`upgrades` (the Adapt tree card) · `board-adapt` · `board-spread` · `upgrade-<real Adapt / Spread id>`** | **Adapt / Spread rooms (029C)** |
| `board-terraform` · `upgrade-warm/cool/humid/dry` | **the Terraform room (029D)** |
| `report` · `report-continue` · `run-actions` | **the production report (029E, `resources/run-ui/run-report.js`)**; `action-*` on its run actions while it is open (the menu's copies suspended) — `docs/GAMEPLAY_UI_CONVERGENCE_v1.md` §10 |

The rooms call `pv.rooms.claimAnchors(names)`; the Planet View renames every shell copy to `data-tutorial-legacy` (again whenever
the shell re-renders). Each claimed name resolves to exactly ONE element, inside the rooms (QA B19). The room DOM stays mounted
while closed, so a coach can resolve an anchor before opening its room. Nothing new was added to the event contract; room
navigation is presentation state (`controller.state().room / context`), to be given an explicit contract during 028D2 integration.

## 12. Terraform registration seam (029D) — filled

*(029C text, kept for the record; BLOOM-029D filled this seam exactly this way: `docs/PRODUCTION_TERRAFORM_ROOM_v1.md`. One deviation,
by design: the globe does **not** show the starting surface — it paints a presentation snapshot of the same authoritative planet under the
run's CURRENT surface sky, so the flat map and the globe stay one surface live.)*

`pv.rooms.register("terraform", { open(ctx) → close })` — the HUD tool, the banner's Terraform suggestions and the rooms' header
nav already route there (`pv.openRoom("terraform", { region, item, opener })`). The controller's room → room rule (stay paused, keep
context, clear the old preview) is in `decisionRooms.open`; a Terraform room can be built as a fourth `rooms[*]` entry in
`decision-rooms.js` (reusing `roomShell`, `mapBlock`, the header) with PlanetSphereView mounted in its centre (`view.setPlanet(
adapter.surface().planet, { render: adapter.surface().render })`, match regions by id), the canonical surface, the diffuse
atmosphere and the Soil / Atmosphere banks; its previews are `actions.preview` of the real sky traits. The specimen is never
mutated by Terraform.

## 13. Transition seam (029E) — filled

*(029C text, kept for the record: every swap was immediate and `controller.transition` was `null`.)* BLOOM-029E filled the seam:
`controller.transition` is the ONE gameplay transition bridge of the run (`resources/run-ui/gameplay-transition.js`, the unmodified
AtmosphereTransition behind a guarded import, preset SUBDUED), and the controller's `open` / `close` run their swap inside it with the
locked order — pause at once, conceal, swap at covered (selection carry / clear, inert, room swap), reveal, and only after the reveal
completes Back restores the pre-room state / Resume runs; room → room clears the old preview before the conceal and never shows the
Planet View in between; `state().transitioning` guards every request; `timeline()` records each swap. `docs/GAMEPLAY_UI_CONVERGENCE_v1.md` §5–§6.

## 14. Accessibility / input

Keyboard-reachable header (Back, nav, Resume), Escape closes, tabs operable, node focus previews, Enter / Space buys, strip chips
and mini-map focusable, visible focus (`:focus-visible` ring), `aria-selected` / `aria-pressed` / `aria-disabled` kept current,
`role=dialog aria-modal` rooms, the Planet View `inert` + `aria-hidden` while open (60 Tab presses never leave the room, QA B18),
focus on open / return on close, no colour-only category or status, controls ≥ 44 px (chips ≥ 36 px), no horizontal scroll at
1024 / 1280 / 1440, reduced motion = no transitions (QA B22).

## 15. Known limitations / risks

- **Spread's Reach category is omitted** when Waterborne Seeds is not offered on the world (no water to cross); the Pods anchor is
  then not drawn either. The information card does not explain the absence.
- **Region strip** scrolls inside its card on worlds with many regions (13 on Ocean 28 → five rows); three chips fit per row at the
  calibrated em, longer names wrap earlier (as Concept 18).
- **Header Biomass pill** is a 029C addition for affordability (not in the Concept 18 header language); nav labels show only on the
  open room below 1500 px and as icons below 1100 px.
- **Tightest tendrils** at 1024: 2.9 px clear with Temperature lit (Concept 18: 3 px). A smaller window would need a lighter weight
  or a wider gutter — not changed here (owner-approved weight).
- Transitions arrived in 029E (the SUBDUED mist through `controller.transition`); Terraform arrived in 029D; the Bloom Report / extinction are the production report since 029E.
- The 028D1 anchors `inspect / readout / limiting-factor / colony-status` stay on the banner; a coach that wants them inside the
  Region room needs a decision (duplicate active anchors were avoided on purpose).
- Firefox tested at 1280×800; WebKit not run. `color-mix()` is used for the condition rows' tinted borders.
