# BLOOM — UI concept review v1 (BLOOM-017)

**For:** PMO and owner, for the UI design-reference review ([`VISUAL_DIRECTION_v1.0.md`](VISUAL_DIRECTION_v1.0.md) §10). This is not player-facing.

**Open:** [`demos/ui-mockups/index.html`](../demos/ui-mockups/index.html) in a browser. There is no build step and it works over `file://`.

> **These are visual concept mockups, nothing more.** Every number, region, trait effect, colony change and plant drawing is a scripted placeholder (`demos/ui-mockups/shared.js`). The sandbox never loads or calls the engine, generator, validator, scenarios or Bloom Report, and changes no game file. Prices, effects, icons, colours, fonts and art are **not proposals**. Nothing here is evidence that the production UI exists or that gameplay works this way. The live run screen (`demos/demo-run.html`) and the player flow (`index.html`) are unchanged.

## How the sandbox is built

- All four concepts share one fake planet: 10 regions, one island, and the same starting Biomass, coverage, owned traits and colonies. Any difference you notice is the **layout**, not the content.
- **Shared behaviour:**
  - Biomass ticks on a fake clock, and gold **+** bubbles on the map can be collected.
  - Buying a trait "opens" the regions listed for it; new colonies then thicken over about a minute.
  - Terraform raises a fake climate-instability meter, and Dying World pressure creeps up.
- **Specimen:** a code-drawn SVG placeholder of the modular-plant direction (VISUAL_DIRECTION §§3–6). Each kind of change has its own visual channel:
  - temperature → stature and stem
  - water → leaf shape
  - soil → roots and salt crystals
  - hazard → pigment
  - spread → flowers, seed puffs and pods
  - colony focus and local upgrade → amount of roots, leaves or seeds

  **Terraform only changes the scene around the plant** (sky, weather, soil), never the plant itself. The plant changes cross-fade.
- **Plant vs planet:** every concept labels plant-changing actions (Adapt green, Spread pink) apart from planet-changing ones (Terraform blue). The labels use words and icons, not colour alone.
- **Accessibility:**
  - all controls are keyboard reachable, with visible focus rings;
  - Esc closes the top panel and returns focus to whatever opened it;
  - statuses use icon + word + colour (✓ OK / ! Strained / ✕ Blocked);
  - hit targets are 36 px or more, most 44–76 px;
  - reduced-motion is respected.

## Concept 1 — Hybrid A+C+B (PMO-recommended baseline)

**Purpose.** The map is the centre. Selecting a region slides in a **context drawer** on the right, and the map re-centres beside it rather than being covered. The drawer shows:
- the specimen *in that region*;
- a large "Holding your plant back" banner, with one-click fixes that open the right board on the right card;
- tabs: Conditions / Colony (focus + local upgrade) / Details (raw signals).

A chunky bottom bar launches **big dedicated Adapt / Spread / Terraform boards**. A board takes over the play area while Biomass, goal and pressure stay visible. It has a large specimen on the left with a region picker and a picture-in-picture map, and cards on the right.

**Problem it solves.** It removes the crowded permanent sidebar (§9) while keeping a clear home for every kind of information: region facts in the drawer, global upgrades on boards, the economy in the HUD.

**Strengths**
- Easiest to read: map first, then the drawer, then the boards. Biomass is always visible, even on a board.
- Boards have room for a large specimen, so purchases visibly change the plant.
- The limiting-factor fixes connect a region's problem straight to the answer.
- Chunky bottom launchers feel right on both iPad and desktop.

**Risks**
- Boards are modal: you lose sight of the real map while shopping. The inset map helps, but it is small.
- The drawer is tall content; at 800 px high the Colony tab sits below the fold.
- The board for 3–6 cards leaves white space; real content density needs checking.

**Watch for:**
- Is drawer → board → back natural, or is it too many hops?
- Does the takeover board feel exciting or interrupting?
- Is the inset "Where it matters" map enough?

## Concept 2 — Drawer-heavy map-first (SimCity / Sims information architecture)

**Purpose.** Nothing is modal:
- **Rail and sheets:** a left tool rail opens side **sheets** (Regions list, Adapt, Spread, Terraform) that push the map rather than cover it.
- **Drawer:** a rich right **region drawer** has Sims-style vertical tabs: Overview, Colony (big focus cards), Nearby (jump to neighbours), Details.
- **Together:** both panels can be open at once, and the map stays clickable.
- **Previews:** hovering a card previews its effect **on the real map**.
- **Lenses** recolour the planet by Temperature, Water, Soil or Hazard, and an advisor line narrates.

**Problem it solves.** It keeps the player's eye on the real map during every decision, and gives power players the most information with the fewest clicks.

**Strengths**
- The map preview is on the real map, not an inset.
- Lenses are a strong teaching tool ("show me where water is the problem").
- The Regions list sorted by "needs help first" works as an at-a-glance triage.

**Risks**
- **The map shrinks a lot:**
  - At 1280 px with a sheet and the drawer open, the map is about 420 px wide.
  - At iPad 1024 px it is about 190 px wide.
  - Fixing this needs auto-collapse rules.
- The most "dashboard-like" of the four, which is close to the look we said to avoid.
- The specimen is small (a portrait), so Adapt changes are less felt.

**Watch for:**
- With both panels open, does it feel powerful or busy?
- Would the lenses earn a place in any concept?

## Concept 3 — Specimen companion

**Purpose.** The plant is always on screen beside the map (about 40 % of the width). Controls are split physically by **what they change**:
- **Under the plant:** Adapt, Spread and colony growth (focus + local upgrade). The plant shows them.
- **On the map:** Terraform. Its strip slides up under the map, tints the map **and** changes the sky around the plant, and says "the plant itself does not change".

Selecting a region shows your plant living there (snow, haze, salt, ash), with condition chips on the scene. Adaptation tags under the plant, and the SKY & SOIL / PLANT labels on the scene, highlight the matching part.

**Problem it solves.** It makes the specimen a real inspection tool (§3.2) and makes "Adapt changes the plant / Terraform changes the planet" (§3.1) impossible to miss.

**Strengths**
- The strongest science message, and the plant always feels alive and personal.
- Clicking around the map doubles as "how would my plant do here?"
- Colony controls sit next to the thing they visibly change.

**Risks**
- The map gets about 60 % of the width, so the planet is less dominant.
- At 800 px high, opening Adapt leaves the scene about 290 px tall.
- With a stressed seedling in a barren region the plant can look small and sad. It is meant to, but it may read as broken.
- The specimen art has to carry a lot. With placeholder art it is the weakest of the four visually; final art would change the verdict most here.

**Watch for:**
- Does a permanent plant earn its screen space, or would contextual-only be enough?
- Is the plant/planet split clearer here than in Concept 1?

## Concept 4 — Minimal calm shelf (Terra Nil-like restraint)

**Purpose.** The planet fills the screen and almost nothing is permanent:
- **Corners:** Biomass floats top-left (large number, no box). The goal and air-pressure rings sit top-right; tapping one explains it.
- **Region card:** a small card pops up next to the region you tap. It has a portrait, one sentence, fix chips, round focus icons, ＋ Upgrade and "More ▾" (Conditions / Details).
- **Shelf:** a compact bottom shelf expands into one row of cards with a small portrait and a one-line preview.
- **One thing at a time:** opening the shelf closes the region card. Region names appear only on hover or selection.

**Problem it solves.** It is the "how little interface can we get away with" baseline. It tests whether calm, low-density screens suit a kid-friendly game.

**Strengths**
- The most beautiful-feeling of the four, and the planet is unmistakably the star.
- Very friendly on iPad.
- Very low cognitive load for first sessions.

**Risks**
- Hides a lot: limiting factors, raw signals and colony state each take an extra tap.
- Hidden labels make finding a named region slower.
- Icon-only focus buttons rely on hover text and aria labels.
- Anchored cards can cover the region next door.
- The calm may undersell urgency in pressure scenarios.

**Watch for:**
- Is it too sparse for strategy, or a good default for younger players?
- Should parts of it be the "first-session" mode of another concept?

## Specimen treatment at a glance

| | Where | Persistent? | Size |
|---|---|---|---|
| Concept 1 | Region drawer (in the selected region) + every board (with region picker) | Contextual | Medium in the drawer, large on boards |
| Concept 2 | Round portrait in the drawer header + small preview in sheets | Contextual | Small |
| Concept 3 | Plant column beside the map, follows the selected region | **Always** | Large |
| Concept 4 | Portrait in the region card + in the shelf tray | Contextual | Small |

## Suggested review order

1. **Concept 4** (about 2 min): calibrate the minimum.
2. **Concept 1**: the recommended baseline; spend the most time here.
3. **Concept 3**: does an always-on plant earn its space?
4. **Concept 2**: does everything-at-once read as powerful or busy?
5. Pick and mix. Likely candidates:
   - Concept 1 as the frame;
   - Concept 3's plant/planet split, with Terraform previewing the sky around the specimen;
   - Concept 2's lenses (and maybe its Regions triage list);
   - Concept 4's calm HUD treatment of Biomass and goal.

## Known limitations (sandbox only)

- Effects are lists, not simulation: "opens Frost Ridge" ignores adjacency, timing and amounts. Terraform previews are tints and outlines, not computed what-ifs.
- One fake planet at one size. Huge archipelagos, tiny maps and natives / instability overlays are not shown.
- The specimen is a quick code-drawn placeholder: no art direction, and the only animation is a stem sway and falling weather.
- Emoji icons render differently by platform. Headless Chromium lacks a few glyphs, which is why the scenario icon is 💨.
- **Viewports checked:**
  - 1280×800, 1024×768 and 1440×900 (reduced-motion), all with no console errors, no horizontal scroll and Tab never landing on a hidden control;
  - iPad portrait and phone widths are **not** designed for;
  - real touch devices are not tested.
- The menu button and the scenario details are stubs.

## Evidence

Screenshots at 1280×800 in [`docs/evidence/bloom-017/`](evidence/bloom-017/):
- the gallery;
- Concept 1: region drawer, Adapt board preview, Terraform board preview;
- Concept 2: sheet + lens + drawer;
- Concept 3: Adapt panel under the plant;
- Concept 4: region card, shelf tray.
