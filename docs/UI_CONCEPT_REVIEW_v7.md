# BLOOM — UI concept review v7: Decision Rooms Convergence, Concept 15 (BLOOM-023)

**For:** the owner and PMO, for the UI design-reference review ([`VISUAL_DIRECTION_v1.0.md`](VISUAL_DIRECTION_v1.0.md) §10), and for whoever later writes the production run-screen plan.

**Open:** [`demos/ui-mockups/index.html`](../demos/ui-mockups/index.html) in a browser (works over `file://`, no build step). It opens on the **Rooms convergence** tab. Concept 15 is one page with internal navigation between its five states. Deep links for review: `concept-15-convergence.html?room=adapt&region=frost` (also `spread`, `terraform`, `region`; add `&lens=temp` for a Map View layer).

> **Still a visual concept mockup.** Every number, region, trait effect, colony change, tree node, plant drawing, land scene and globe is scripted (`demos/ui-mockups/shared.js`, `c15.js`). The page never loads or calls the engine, generator, validators, scenarios, balance data or Bloom Report. Pause and speed only control the mockup's fake clock. Icons, colours, fonts and art are placeholders, not proposals. The live run screen, the player flow (root `index.html`) and all gameplay files are unchanged. **The production UI is not locked by this document, and the production rebuild is not started.**

## 1. A convergence prototype, not another exploration round

BLOOM-022 put four versions of the "Planet View + paused decision rooms" architecture side by side ([`UI_CONCEPT_REVIEW_v6.md`](UI_CONCEPT_REVIEW_v6.md)). The owner reviewed Concepts 11–14 and, instead of asking for another four-way round, named the pieces to keep. BLOOM-023 builds **one** prototype from those picks, **Concept 15 — Decision Rooms Convergence**, so the next review is about one direction getting closer to the final structural UI, not about choosing between directions. Concepts 1–14 stay in the gallery as design history; `rooms.js` / `rooms.css` and the four BLOOM-022 pages are untouched. Concept 15 lives in its own files (`c15.js`, `c15.css`, `concept-15-convergence.html`) on the shared fake data.

## 2. What it combines, and from where

| From | Kept in Concept 15 |
|---|---|
| **Concept 11** | the left-column room composition (visual upper-left, information lower-left), the mini-map + region context column on the right, the centred top HUD with Explore / Change tool groups, the **globe** idea for Terraform |
| **Concept 12** | the **bottom region banner** on Planet View (with the stricter rules in §3) |
| **Concept 14** | the **anatomy-linked Adapt tree**: skills point at the plant part they change (cleaned up, §5) |
| **BLOOM-022 shared rules** | Planet View is the stable home; entering a room auto-pauses (PAUSED pill, striped edge, Resume play vs Planet / Escape); every room has a smaller interactive mini-map with Map View chips and a region strip; hover / focus = preview, click = fake buy; Adapt / Spread change the organism, Terraform changes the environment; no emoji (inline SVG placeholder icons) |

Dropped on the owner's instruction: the four-way comparison, the side-workbench lineage, and Terraform's "Plant anatomy unchanged" box.

## 3. Planet View: full-width map and the region banner

- **The map fills the width.** The main map is still mounted once and never resized by exploring. At load and on resize, Concept 15 widens the map's SVG viewBox to the frame's aspect ratio and extends the ocean (colour and wave pattern) to cover it, so the world sits in more sea instead of between two dead columns (`fitMap` in `c15.js`). The world itself is the same size it would have been; only the ocean grows. QA measures that the SVG spans the frame and that the viewBox aspect equals the frame aspect at 1280, 1024 and 1440.
- **The HUD** is the Concept 10 / 11 banner, recomposed: status card and Explore / Change tools are one centred block; Pause / speed sit at the far right. Below 1380 px the two meters hide; below 1180 px the tool names collapse to icons with tooltips.
- **Region banner (bottom, centred).** It exists **only while a region is selected**: name, status chip, colony word and limiting factor, the four condition chips, **Inspect region** and up to two "would help" shortcuts into the right room. Rules, all verified by QA:
  - **X in a circle** (top-left of the banner) closes it **and deselects** the region;
  - a click on **empty map / ocean** (anything that is not a region, a Biomass bubble, a button, the lens bar or the banner) closes it and deselects;
  - **Pause and Speed never close it** and never change the selection;
  - **entering any room deselects** the home map (§4);
  - with no selection there is no banner, no corner card, nothing floating over the planet.
- **Map View** is the lens bar under the HUD (opened by the Map View tool) and the same five chips under every room mini-map. Everywhere: **hover or keyboard focus previews** the layer on the map(s) with a dashed outline on the chip and a "Preview ·" legend; **click sets** it. Leaving a chip returns to whatever is set.

## 4. Selection versus room context

Concept 15 separates two things that BLOOM-022 shared:

| | Home selection (`state.sel`) | Room context (`state.ctx`) |
|---|---|---|
| Shown by | the outline on the main map and the banner | "Considering for …" / "Looking at …", the outline on every room mini-map, the pressed chip in the region strip |
| Set by | clicking a region on the main map; cleared by X, ocean click, entering a room | entering a room (copied from the home selection, or the last room context, or the origin region); clicking a room mini-map or a strip chip |
| Written back? | never from a room | never to the home map |

So: select Frost Ridge → open Adapt (home deselected, room context Frost Ridge) → click Dust Reach on the mini-map (room context Dust Reach) → Planet: nothing is selected on the home map. Room → room links keep the pause and the context. Opening a room with no selection uses the last room context, or the origin colony on first use.

## 5. Adapt and Spread: one room family

Both rooms are the same three-column screen: **plant upper-left, plant / hover information lower-left, tree in the middle, mini-map + region context right.** Both trees are the same renderer and layout (`anat`): a vertical **category rail** at the left of the tree, one row per adaptation chain, later tiers to the right, large card nodes (icon, name, cost or state). What differs is content: Adapt has Hazard / Water / Temperature / Soil, Spread has Seeds / Growth / Reach, with Spread's previews drawing dispersal arcs on the mini-map.

**Cleaned-up anatomy linking.** Concept 14 drew a curved leader from a point on the plant to each adaptation row, and at some widths those curves crossed. Concept 15 keeps the idea and removes the crossings:

- categories are **ordered top-to-bottom like the plant**: Adapt = leaf pigment (upper leaves) → leaf shape → stem → roots; Spread = seed head → flowers → pods;
- each category has **one anchor on the plant** (a ring on the drawing, labelled: *Leaf pigment*, *Leaf shape*, *Stem*, *Roots* / *Seed head*, *Flowers*, *Pods*) and **one port on the rail**;
- each leader runs anchor → its own vertical **lane** in the gutter between the plant and the tree → port, with rounded corners. Upper categories take the lanes nearest the tree, lower categories the lanes nearest the plant. With anchors and ports both ordered top-to-bottom, no two leaders can cross (QA checks the ordering on every run);
- hovering or focusing a skill **lights its leader and anchor** and dims the others, previews the trait on the plant with the matching part glowing, and writes the explanation into the **left information block** (name, cost, what it does, what it looks like, *Changes Stem* / *Changes Pods* …, which regions open or get harder). The **right column stays planetary**: mini-map with the open / harder regions marked, Map View chips, region strip, and a "Region effect of this choice" line.

At 1024 px the rail labels drop to icons and the cards tighten (smaller icon, one-line meta); nothing scrolls.

## 6. Terraform: the globe room

Same three columns, different content, so it reads as **planet manipulation, not organism evolution**, without an explainer box:

- **Left, upper:** a **land / environment scene** for the room's region (sky, sun, clouds, far hills with snow caps, ground colour, a lake, cracks or salt crust, falling rain or snow), drawn from the region's fake environment plus the Terraform state. Hovering a planet system **changes the scene** (sky warms or cools, rain clouds arrive, haze, snow on the hills, ground greens or dries) under a PREVIEW tag. There is no plant anywhere in the room.
- **Left, lower:** the land's information block (conditions, current sky, what is holding the plant back) and, on hover, the system's explanation with *Changes sky and ground · not the plant* and the sky readout.
- **Centre:** a **large globe** (as large as the column allows; about 300 px at 1280×800, 340 px at 1440×900) with all ten planet systems on **one orbit ring** around it, later tiers beside their parent and joined by an arc, category markers in the gaps between sectors and a legend in the corner. The globe is a stylised sphere: ocean gradient, meridians, land blobs placed by fake longitude / latitude and foreshortened towards the limb. **Click-drag spins it; the arrow keys spin it when it has focus.** The ten fake regions each own a blob, so a hover **lights the same regions the mini-map marks** (green = would open, pink = made harder) and tints the whole sphere the way the mini-map tints (warmer, cooler, cloud decks, haze, ice caps). Under the globe: the sky readout (14 °C → 20 °C) and the spin hint.
- **Right:** mini-map + Map View chips + region strip, then the **planet readout** (sky temperature with the preview arrow, rain, instability with the hatched preview) and the regions this choice would open or harm.

## 7. Bigger, iPad-like room scale

Every room sets its font size from the viewport, `clamp(13.5px, 1.25vw, 18px)` (about **16 px at 1280, 18 px at 1440, 13.5 px at 1024**), and every room measurement is in **em** of that size: header buttons, room tabs, PAUSED pill, the information blocks, mini-map name and chips, Region Inspect tabs and condition rows, tree nodes, category labels, leader labels, the globe. The rooms therefore **scale down proportionally** as the window shrinks rather than reflowing into scrolling slabs. Compared with Concept 11 at 1280×800 (measured by QA): node names 16 px vs 13, node cards 166 px vs 110 wide with 46 px vs 38 px icons, room tabs 15 px / 46 px tall vs 13 px / 40 px, region chips 14 px / 35 px tall vs 12 px / 28 px, room title 27 px vs 24, mini-map name 21 px vs 17, lens chips 14 px vs 11. Planet View itself keeps BLOOM-022's scale (the owner's request was about the rooms).

## 8. Region Inspect

The owner-approved tabbed layout, in the same room family: plant upper-left with a colony summary and the plant's adaptations lower-left; region name, status, **Overview / Colony / Science** tabs (about 48 px tall at 1280) and enlarged condition rows, limiting factor and "would help" shortcuts in the middle; mini-map and region strip on the right.

## 9. QA

Driver: [`evidence/bloom-023/qa-ui-mockups-c15.js`](evidence/bloom-023/qa-ui-mockups-c15.js) (Playwright). Results: [`evidence/bloom-023/qa-results.json`](evidence/bloom-023/qa-results.json). Run matrix: Chromium at 1280×800, 1024×768 and 1440×900, reduced motion at 1280×800, Firefox at 1280×800; the gallery at all three widths; a size comparison against Concept 11 at 1280×800. **Result: 356 / 356 checks pass** (2026-10-04; 68 of them in Firefox, 68 under reduced motion; 0 external requests; 0 node collisions in every tree at every viewport).

Per viewport the driver verifies, in this order: load with no console errors and no external requests, nothing selected, no banner, clock running; no horizontal scroll on Planet View and in every room; the map fills the frame (SVG spans the frame, viewBox aspect = frame aspect, ocean covers the widened viewBox); selecting Frost Ridge shows the banner without moving the map; Pause and Speed leave it; an ocean click closes and deselects; the X closes and deselects; Map View hover previews / click sets / keyboard focus previews on Planet View; for each room: opens from its tool, auto-pauses, Planet View hidden, home deselected, Frost Ridge applied as the room context on the mini-map; mini-map click changes the room context only; hover peeks; mini-map Map View chips preview and set; Region Inspect tabs, rows and columns; trees with no node collisions and nothing outside the tree area; Adapt / Spread leaders, one per category and never crossing; Adapt hover changes the plant and the left block, lights the Stem leader, marks regions; Spread hover does the same with arcs; Terraform hover changes the scene, the globe and the mini-map, shows 14 → 20 °C, and the room contains no plant drawing; leaving restores everything; the globe spins by drag and by arrow keys; Adapt → Terraform keeps the pause and the context; Escape returns to Planet View with the clock running and **nothing selected**; the main map's geometry is identical before and after every room; Resume play / Back rules; a 28-Tab keyboard walk stays inside the room with visible focus and Escape returns focus to the tool; deep links; no emoji; and that Adapt and Spread share one tree kind and zone set while Terraform uses the orbit. Static checks: the new files reference only `shared.js`, contain no engine / generator / validator / scenario / balance / Bloom Report / network references and no emoji; `git status` shows root `index.html`, gameplay folders, the shared mockup files, `rooms.js` / `rooms.css` and Concepts 1–14 untouched.

Screenshots in the evidence folder: gallery, Planet View without a selection, Planet View with the banner, Region Inspect, Adapt / Spread / Terraform hover previews, the globe after a drag, Map View hover preview, and 1024 / 1440 samples of Adapt and Terraform.

## 10. Known limitations

- **Mockup, not UI logic.** Purchases, colony growth, Biomass, previews and the clock are scripted. Later-tier nodes are placeholders that cannot be bought; costs, names and effects are not proposals.
- **The banner covers the lower map** while a region is selected (about 135 px tall at 1280×800, narrower than the map). It is dismissible three ways, but the owner should say whether a bottom banner is acceptable or should be slimmer / dockable.
- **Rooms are full new screens** (Planet View is hidden behind them), the BLOOM-022 Concept 12–14 style, chosen to give the bigger rooms the whole frame. Concept 11's chamber over the dimmed planet is not kept.
- **The globe is not a map projection.** Land blobs are placed by fake coordinates to echo the mini-map's regions, and the sphere is one stylised drawing; it has no idle spin (drag or arrow keys only), which also keeps reduced motion simple.
- **The plant is still the placeholder drawing** from earlier rounds; the four Adapt anchors and three Spread anchors point at fixed places on it and will need re-anchoring on a modular plant.
- **At 1024 px** the rail labels are icon-only, tree cards tighten, the globe's category markers are icons, the globe's pill labels shrink to their spacing (a long name such as *Humidify* can break mid-word and the cost line truncates), and the region strip under a mini-map may scroll by a row. Nothing else scrolls.
- **Region Inspect has no Regions browser** beyond the strip and the mini-map (as in BLOOM-022).
- **Firefox** tested at 1280×800 only; Safari / WebKit not run.

## 11. What the owner should confirm next

1. **Banner:** keep the bottom banner with these rules, or make it slimmer / dockable so it covers less map?
2. **Full-screen rooms** versus Concept 11's chamber over the dimmed planet.
3. **Adapt / Spread family:** are the lane leaders and the plant-ordered rail the right reading of "anatomy-linked"? Is the Spread tree, with its three sparse rows, acceptable or should it carry more content?
4. **Terraform:** is the globe big enough and is a stylised sphere acceptable for production? Should the ten systems stay on one orbit or return to two rings once there are more nodes?
5. **Scale:** is 16 px at 1280 / 18 px at 1440 the right room scale, and is 1024 (13.5 px, icon-only labels) still comfortable?
6. **Planet View scale:** the rooms grew; should the HUD and banner grow with them?
7. Whether Concept 15, with those answers, becomes the basis of the production run-screen plan. The production UI is **not** locked by this document.
