# BLOOM — UI concept review v8: Concept 15 Presentation Refinement, Concept 16 (BLOOM-024)

**For:** the owner and PMO, for the UI design-reference review ([`VISUAL_DIRECTION_v1.0.md`](VISUAL_DIRECTION_v1.0.md) §10), and for whoever later writes the production run-screen plan.

**Open:** [`demos/ui-mockups/index.html`](../demos/ui-mockups/index.html) in a browser (works over `file://`, no build step). It opens on the **Presentation refinement** tab. Concept 16 is one page with internal navigation between its five states. Deep links for review: `concept-16-presentation-refinement.html?room=adapt&region=frost` (also `spread`, `terraform`, `region`; add `&lens=temp` for a Map View layer).

> **Still a visual concept mockup.** Every number, region, trait effect, colony change, tree node, plant drawing, land scene and globe is scripted (`demos/ui-mockups/shared.js`, `c16.js`). The page never loads or calls the engine, generator, validators, scenarios, balance data or Bloom Report. Pause and speed only control the mockup's fake clock. Icons, colours, fonts and art are placeholders, not proposals. The live run screen, the player flow (root `index.html`) and all gameplay files are unchanged. **The production UI is not locked by this document, and the production rebuild is not started.**

## 1. A presentation refinement, not a new exploration round

BLOOM-023 produced Concept 15, one convergence prototype built from the owner's picks ([`UI_CONCEPT_REVIEW_v7.md`](UI_CONCEPT_REVIEW_v7.md)). The owner accepted it as the direction and asked for **one more presentation pass before the production UI plan is written**: bigger and more filled, rooms that feel part of the world instead of replacing it, anatomy links you can actually read, Terraform's systems in two side banks instead of a full orbit, and hover previews that never stick. BLOOM-024 applies that pass to Concept 15 and calls the result **Concept 16 — Concept 15 Presentation Refinement**, so the gallery keeps Concept 15 unchanged as history and the review can compare the two directly.

Nothing structural changes. The Planet View rules, the banner rules, the selection / room-context split, the room set, the Adapt / Spread family, the globe Terraform, Map View previews, no emoji and the larger centred HUD are all as in v7 §3–§8. Concept 16 lives in its own files (`c16.js`, `c16.css`, `concept-16-presentation-refinement.html`) on the shared fake data; `c15.js` / `c15.css` / `concept-15-convergence.html` are untouched.

## 2. Scale: calibrated from pill fit ("three pills across")

The owner's benchmark: in a right-side context area, **about three pills of ordinary text length should fit across one row comfortably**, and everything of similar type should be enlarged in proportion until that is true. Concept 16 turns that into the room's scale rule instead of the fixed clamp Concept 15 used (`clamp(13.5px, 1.25vw, 18px)`):

- The reference pill is a **region chip of median name length** ("Sunny Shelf", the middle of the ten fake region names sorted by length). The reference area is the **region strip in the right-hand column**, which is now 33 % of the room width (Concept 15: 26 %).
- On load, on resize and on every room open, a hidden probe room measures that chip and that strip at two known font sizes, solves for the column's chrome, and sets the room's em to the largest value at which **three chips plus two gaps fit the strip** (`calibrateScale` in `c16.js`). That value is capped by the window height (40 em of room height) and clamped to 12–22 px.
- Every room measurement is in em of that size and the side columns are percentages, so the room is one proportional drawing: when the window is too crowded for the calibrated size, the **whole room shrinks together**, nothing reflows into a scrolling slab.

Measured by QA (room em; Concept 15 in brackets): **17.5 px at 1280×800** (16), **14.0 px at 1024×768** (13.5), **19.7 px at 1440×900** (18); at all three the limit is the pill fit, not the height, and the ratios are exactly the width ratios (0.80 and 1.125). On top of the em, the pieces the owner listed grew in em too: chips 0.92 em and 2.5 em tall (0.9 / 2.4), lens chips 0.9 em (0.85), room tabs 0.98 em and 3.1 em tall (0.95 / 3.0), Region Inspect tabs 1.1 em (1.05), info text 1 em (0.95), info title 1.3 em (1.25), node names 1.02 em, node icons 2.85 em, category labels 0.76 em with a coloured border, room title 1.75 em, mini-map name 1.35 em. The QA size comparison against Concept 15 at 1280×800 finds every one of twelve measured elements at least 8 % larger (node names 17.9 px vs 16, chips 16.1 px / 44 px tall vs 14.4 / 35, room tabs 17.2 px / 54 px vs 15.2 / 46, title 30.6 px vs 27, lens chips 15.8 px vs 14, info text 17.5 px vs 15.2) and leaders thicker. Tier-1 cards are about the same width in px as Concept 15 (175 vs 166); **later-tier cards are 78 % of a tier-1 card**, which gives the tree a hierarchy and keeps every cost on one line.

**Honest caveat on the benchmark.** With a chip as wide as a full region name and Concept 15's 26 % column, "three across" would have made the room *smaller* than Concept 15 (about 14.9 px at 1280). Three across and bigger are only both true with a wider right column and a slightly tighter chip, which is what Concept 16 does. If the owner's screenshot meant a shorter pill or a narrower area, the calibration constants (`PILLS`, the column percentage, the probe chip) are the only things to change; §11 asks.

## 3. Rooms as floating windows over the world

Planet View is **no longer hidden** when a room opens. It stays mounted underneath, **blurred (7 px) and dimmed (a 46 % ink veil)**, made `inert` and `aria-hidden` so it cannot be clicked, focused or read out, and the room's boxes float over it as windows: the header bar, the plant / land box, the info box, the tree box, the mini-map box and the context box each have a card background and a shadow, with the dimmed world visible in the 1 em gaps between and around them and below any box that ends early. Pause / speed, the main map's geometry and the Concept 15 open / close rules are unchanged: QA checks that a click where the world shows through hits the room layer and changes nothing, that 30 Tabs never reach the blurred planet, and that Escape restores an un-blurred, non-inert Planet View with nothing selected.

This is **not** a return to the Concept 11 chamber or the side workbench: the rooms keep their full three-column architecture; only their presentation changed from "a new screen" to "a composed overlay on the world".

## 4. Anatomy links you can read

Concept 15's leaders were 2.2 px dashed lines at 50 % opacity with a 0.5 em ring. Concept 16 keeps the lane logic (one lane per category, anchors and ports both ordered like the plant, so leaders never cross; QA still checks the ordering) and makes the link system legible:

- **Thicker**: 3.4 px dashed at 80 % idle; **5.5 px solid with an 11 px soft glow** under it when lit.
- **Anchors**: a soft halo, a 0.62 em ring and a centre dot on the plant part; lit = ring filled in the category colour with a white centre.
- **Label plates**: a rounded plate beside each anchor naming the part (*Leaf pigment*, *Leaf shape*, *Stem*, *Roots* / *Seed head*, *Flowers*, *Pods*), placed on whichever side of the plant box has room; the lit plate fills with the category colour.
- **One colour from plant to node**: the plate, anchor, leader, rail port, category label, node accent and the hover information block all use the same category colour (§5), so the hover reads as "this skill → this part" without a legend.
- The other leaders dim to 30 % while one is lit; the plant part itself still glows through the shared specimen highlight.

## 5. Adapt / Spread: category colours and spacing

Each category has a colour **with a reason**, set once per category and applied to the label border, node left accent and icon, rail port, leader, anchor, plate, hover info border and the "Region effect" box:

| Room | Category | Colour | Why |
|---|---|---|---|
| Adapt | Hazard | purple `#8a5bb8` | the pressure / danger colour already used by the HUD's Native pressure meter |
| Adapt | Water | blue `#3b8fd0` | the condition it answers |
| Adapt | Temperature | hot orange `#d9601f` | heat and cold are both answers to the temperature condition |
| Adapt | Soil | brown `#8a6a3e` | the ground |
| Spread | Seeds | amber `#c58a1a` | what *carries* the seed (wind, animals) |
| Spread | Growth | green `#3f9d4b` | how the *colony* matures and roots |
| Spread | Reach | teal `#1f8f8f` | how *far* it travels, across water |

QA verifies, in both rooms at every viewport, that each category uses one colour on label, node and leader glow and one darker shade on label ink, port and anchor, and that the categories are distinct.

**Spread spacing.** The anat layout's row step is now **capped at 5.4 em**. Adapt (seven rows) still uses the full column height; Spread (three and a half rows) stops at the cap, so its tree is compact, the family resemblance holds, and its **tree box ends where the tree ends** (447 px tall vs Adapt's 634 px at 1280×800), with the world showing below it. The category gap between chains shrank from 0.5 to 0.35 rows so Adapt's seven rows fit at the bigger scale with 3.9 em cards.

## 6. Terraform: Soil and Atmosphere banks (a C and a reversed C)

The single orbit ring is gone. The ten planet systems (plus three new Ground placeholders, see §10) sit in **two vertical banks that curve around the globe**:

- **Soil, on the left**, as a C: Ground items ordered from the surface down (Rock Weathering → Mineral Dust, Soil Building → Deep Humus → Wash the Salt). Each leader runs from the icon to the **globe's surface** and ends in a small **pin** on the land.
- **Atmosphere, on the right**, as a reversed C: Air at the top, Sky temperature in the middle, Rain at the bottom (upper air → sky → weather near the ground). Each leader ends in a **ring on the atmosphere halo**.
- **The halo** is a dotted double ring drawn *around* the globe (radius = globe radius + 1.25 em and + 0.7 em more), with a pale glow outside the globe's edge; nothing is drawn over the globe's face. QA checks that the halo is stroke-only and larger than the globe.
- Nodes are spaced evenly in y along each bank; the bank bows outward at the middle and curls back towards the poles (a square-root profile), so it reads as a C hugging the globe rather than a ring. Later tiers sit next to their parent along the bank and are joined by a short fork that bows towards the globe. The first node of each category carries a small coloured caption (AIR, SKY TEMP, RAIN, GROUND); a legend at the top of the box says which side points at what.
- The globe stays central and prominent: 284 px across at 1280×800, 320 px at 1440×900, 227 px at 1024×768 (Concept 15: about 300 / 340 / 255), with the Terraform columns at 20 % / 60 % / 23 %. Drag and arrow-key spin, the land scene, the planet readout and the preview behaviour are unchanged, and there is still no "anatomy unchanged" box and no plant.

## 7. The hover-reset rule

**Hover or keyboard focus previews only while active. Leaving restores the committed state at once. Only a click commits.** Concept 15 could keep a tree preview alive after the pointer moved from a node onto empty tree space (only leaving the whole tree cleared it). Concept 16 clears on: pointer moving onto empty tree space or any non-node, pointer leaving the node for a different node (the new one previews), pointer leaving the tree, pointer leaving the window, the window losing focus, the tab being hidden, keyboard focus leaving the tree, switching rooms, and closing a room. The same safety net covers the Map View chips (Planet View and room mini-maps). Mini-map region peeks already reset on leave. After a click (fake buy) the preview is re-read from the new state, so a bought node shows *Owned* while still hovered and stays owned after leaving. QA exercises the node → empty-space case in every tree room at every viewport, the window-blur case on a layer chip, the focus-out case, and the buy-then-leave case.

## 8. Content-height side panels

The lower-left information block and both right-hand boxes are **as tall as their content**: the info block has a 7.5 em floor and grows with its content up to the column's remaining height (then scrolls); the mini-map box holds the "Considering for" header, the mini-map, the peek line, the Map View chips and the region strip (the strip is the part that scrolls if the column runs out); the "Region effect of this choice" / "Planet readout" block is its **own box** directly under it, not pinned to the bottom. Region Inspect's main box and Spread's tree box are content-height as well. QA measures every info and context box against its own content (no slack inside) and that Spread's and Region Inspect's main boxes end well above the room bottom. When content is genuinely tall (Terraform's land information with a preview, Adapt's hover text at 1280) the box grows to the available height, which is the intended "taller content may grow as needed".

## 9. QA

Driver: [`evidence/bloom-024/qa-ui-mockups-c16.js`](evidence/bloom-024/qa-ui-mockups-c16.js) (Playwright). Results: [`evidence/bloom-024/qa-results.json`](evidence/bloom-024/qa-results.json). Run matrix: Chromium at 1280×800, 1024×768 and 1440×900, reduced motion at 1280×800, Firefox at 1280×800; the gallery at all three widths; a size comparison against Concept 15 at 1280×800. **Result: 497 / 497 checks pass** (2026-10-04; 96 of them in Firefox, 96 under reduced motion; 0 external requests; 0 node collisions in every tree at every viewport). The BLOOM-023 driver, re-run from a scratch copy against this tree, passes 281 / 288: the seven failures are its own "gallery defaults to Concept 15 / six tabs / Concepts 1–14 only" assertions, which this round changes by design; every Concept 15 behaviour check still passes.

Besides everything the BLOOM-023 driver verified for Concept 15 (load, map fill, banner rules, Map View previews, room open / close / context rules, Region Inspect tabs, Adapt / Spread / Terraform hover previews and restore, globe spin, room links, Resume / Back / Escape, keyboard walk, deep links, emoji, isolation, scope), the driver checks the BLOOM-024 brief's list explicitly: the gallery defaults to the new tab with seven tabs and sixteen reachable pages; Planet View still follows the Concept 15 rules; every room floats over a visible, blurred, inert Planet View and a click through the gap changes nothing; side boxes are exactly content height and the right column is two boxes; the Concept 16 room is ≥ 8 % larger than Concept 15 on twelve measured elements; three ordinary region pills fit across the right column in Region Inspect, Adapt and Spread at every size; the room em is 17.5 / 14.0 / 19.7 px with ratios equal to the width ratios; category colours are present, consistent and distinct; leaders are ≥ 3 px idle and ≥ 5 px lit, with a plate each, still ordered (no crossing); Spread's tree box is ≥ 80 px shorter than Adapt's; Terraform uses the banks layout with Soil nodes left of the globe and Atmosphere nodes right of it, both spread north / south, none over the poles; the halo is stroke-only around the globe, Soil leaders end in pins and Atmosphere leaders in rings; hover-leave resets (node → empty tree space, chip → window blur, mini-map peek, focus-out); a click commits and persists; no emoji; no console errors; no external requests.

Screenshots in the evidence folder: gallery (00), Planet View without a selection (01) and with the banner (02), Region Inspect (03), Adapt / Spread / Terraform hover (04–06), Terraform structure with the two banks and the halo (07), the right column with three pills across (08), 1024 and 1440 Adapt and Terraform (09–12), the Map View hover preview (13), and Spread without a hover showing the world below the content-height boxes (14).

## 10. Known limitations

- **Mockup, not UI logic.** Purchases, colony growth, Biomass, previews and the clock are scripted. Later-tier nodes are placeholders that cannot be bought; costs, names and effects are not proposals.
- **Three new Ground placeholders** (Rock Weathering, Mineral Dust, Deep Humus) were added to the Terraform tree so the Soil bank reads as a bank rather than two lonely nodes. They are mockup-only placeholders like every other later-tier node and change nothing outside the tree drawing.
- **The pill benchmark is my reading of the owner's screenshot** (a median-length region chip across the region strip). It makes the room 9 % larger than Concept 15 at 1280 and 1440 and 4 % larger at 1024, before the per-element increases. A different reference pill changes the number; the mechanism stays.
- **At 1024×768** the room is the 1280 layout at 80 %: 14 px type, 3.4 em (49 px) Terraform icons stacked 55 px apart on the Atmosphere side, tier-1 cards 140 px wide. Room nav labels and the Planet / Resume labels collapse to icons below 1100 px, as in Concept 15. Nothing scrolls except a long region strip in a right column whose context box is tall (Terraform).
- **The Terraform side columns are narrower** (20 % / 23 %) than the other rooms' (21 % / 33 %) to keep the globe large; its region strip therefore fits two chips per row, not three, and shows one row before scrolling. The three-pills benchmark is met in Region Inspect, Adapt and Spread.
- **The blur is a CSS `filter` on the Planet View**, re-rasterised once per open; fine for a mockup, to be budgeted in production.
- **Firefox** tested at 1280×800 only; Safari / WebKit not run (`inert` and `filter` are supported there, untested here).

## 11. What the owner should confirm next

1. **Scale benchmark:** is "three median-length region chips across a 33 % right column" the right reading of the screenshot, or should the reference pill be shorter (bigger room) or the column narrower (smaller room)?
2. **Overlay strength:** 7 px blur and a 46 % dim; should the HUD remain visible behind the room header, or be hidden so only the map shows through?
3. **Boxes:** two content-height boxes in the right column (mini-map, then context) or one? Is the content-height info block right, or should it keep a larger floor?
4. **Category colours:** do Adapt-by-condition and Spread-by-dispersal read as meaningful? Is hot-orange Temperature acceptable next to the Spread room's pink accent?
5. **Anatomy links:** are the label plates and thick glowing leaders enough, or should the plant part itself be outlined in the category colour?
6. **Terraform:** Soil left / Atmosphere right, or swapped? Is the globe still big enough with two banks beside it (284 px at 1280)? Does the dotted halo read as "atmosphere"? Are the three Ground placeholders acceptable as placeholders?
7. **1024 behaviour:** the same layout at 80 % scale, with the Atmosphere bank's eight nodes tightly stacked. Acceptable, or should 1024 drop a tier?
8. Whether Concept 16, with those answers, becomes the basis of the production run-screen plan. The production UI is **not** locked by this document.
