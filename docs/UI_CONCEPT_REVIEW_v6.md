# BLOOM — UI concept review v6: Decision rooms, Concepts 11–14 (BLOOM-022)

**For:** the owner and PMO, for the UI design-reference review ([`VISUAL_DIRECTION_v1.0.md`](VISUAL_DIRECTION_v1.0.md) §10), and for whoever later writes the production run-screen plan.

**Open:** [`demos/ui-mockups/index.html`](../demos/ui-mockups/index.html) in a browser (works over `file://`, no build step). It opens on the **Decision rooms** tab. Each concept is one page with internal navigation between its five states. Deep links for review: `concept-11-balanced-rooms.html?room=adapt&region=frost` (also `spread`, `terraform`, `region`; add `&lens=temp` for a Map View layer).

> **Still a visual concept mockup.** Every number, region, trait effect, colony change, tree node and plant drawing is scripted (`demos/ui-mockups/shared.js`, `rooms.js`). The pages never load or call the engine, generator, validators, scenarios, balance data or Bloom Report. Pause and speed only control the mockup's fake clock. Icons, colours, fonts and art are placeholders, not proposals. The live run screen, the player flow (root `index.html`) and all gameplay files are unchanged. **The production UI is not locked by this document, and the production rebuild is not started.**

## 1. Why the project moved away from workbench refinement

Concepts 9 and 10 ([`UI_CONCEPT_REVIEW_v3.md`](UI_CONCEPT_REVIEW_v3.md)–[`v5`](UI_CONCEPT_REVIEW_v5.md)) assumed that the main run screen should hold every deep interaction in a side workbench next to the live map. That bought a lot: no popups, one reframe, re-targeting without leaving a mode. It also fixed the ceiling. A content-height side panel can show a card grid, but not a readable **evolution tree**, not a **large specimen**, and not the comparison of several regions' outcomes at once. Each refinement round was spending its effort on panel height, dock placement and banner widths, that is, on fitting more into less.

After BLOOM-021 the owner chose a different architecture: **a stable full-map Planet View as home, and dedicated, paused strategy / inspection rooms for the deeper decisions.** The main screen stops trying to hold everything. The rooms get the space that trees and specimens need, and are allowed to feel purpose-built, including being inspired by interfaces like Plague Inc.'s evolution screen, as long as a **smaller interactive map stays present in every room**. BLOOM-022 is the first mockup round of that architecture. It keeps what the earlier rounds proved (Adapt changes the organism, Terraform changes the environment, important map effects visible while deciding, compare regions without close / reopen cycles, game-like not web-app-like) and drops the workbench as the leading direction. Concepts 1–10 stay in the gallery as design history.

## 2. The architecture: Planet View + paused decision rooms

| | Planet View (home) | Decision room |
|---|---|---|
| Purpose | watch the run, pick a region, choose a tool | one deep decision at a time, with context |
| Map | one large main map, mounted once, **never resized** by exploring | a smaller **mini-map** that stays interactive |
| Clock | running (Pause / speed in the HUD) | **auto-paused** on entry, visibly |
| Content | run status, lightweight region summary, Map View layer | specimen or room focus · tree or details · mini-map and context |
| Leaving | tool button, map click, Regions | **Planet** / Escape (clock back as it was) · **Resume play** (running) · links to the other rooms |

The main map geometry was measured across every open / close in QA (§9): it does not change by a pixel. Rooms are the only place the layout moves, and it moves there on purpose.

## 3. Common rules shared by Concepts 11–14

1. **Planet View is the stable home.** Large main map; compact access to Regions (opens Region Inspect), Map View (a layer bar on the main map), Adapt, Spread, Terraform, and Pause / speed. Selecting a region shows only a lightweight summary with an Inspect button and up to two "would help" shortcuts that open the right room at the right node.
2. **Entering a deep room auto-pauses.** Region Inspect, Adapt, Spread and Terraform all pause the fake clock. The room says so three ways: a **PAUSED · strategy mode** pill in the header, a striped amber top edge, and a green **Resume play** button. **Planet** (or Escape) returns to Planet View and restores the clock as it was; Resume play always runs it. The HUD's own state dot turns amber while paused.
3. **Every room includes a smaller interactive map.** Click a region to re-target ("Considering for …" in the change rooms, "Looking at …" in Region Inspect); hover a region to peek its status; the Map View layer chips are repeated there; previews paint on it (opening regions, regions made harder, dispersal arcs, sky tint). The main selection and every mini-map stay in sync. A region strip under each mini-map gives the same switch by name.
4. **Rooms link to each other** from the room header, so comparing Adapt against Terraform for the same region needs no close / reopen cycle.
5. **Adapt and Spread change the organism; Terraform changes the environment.** Hovering an Adapt / Spread node re-renders the specimen with that trait and makes the affected plant parts glow. Hovering a Terraform node changes the sky, ground and planet disc, dims the plant, and the environment panel reads "Plant anatomy unchanged".
6. **Trees, not card grids.** Adapt, Spread and Terraform each render an upgrade tree built from the same 13 fake items as earlier concepts plus **later-tier placeholder nodes** (dashed, lock badge) that give the trees their shape. Placeholders unlock visually when their parent is bought but cannot be purchased. Region Inspect has no tree.
7. **No emoji.** One inline SVG placeholder icon set covers tools, categories, nodes, status chips, tabs and clock controls (46 icons in `rooms.js`). The drawings are placeholders; the rule is the point.
8. **Same fake data, same shell file.** All four concepts run on one framework (`rooms.js` / `rooms.css`) with a per-concept configuration, so what differs between them is what the round was asked to compare, not accidental styling.

## 4. What each concept tests

| Concept | Identity | Shell | Specimen | Mini-map | Template | Trees |
|---|---|---|---|---|---|---|
| **11 Balanced decision rooms** | practical baseline | chamber over the dimmed planet | medium | medium | one three-zone template for all four rooms | outline branches (Adapt, Spread) · systems ring around a planet disc (Terraform) |
| **12 Specimen-first evolution rooms** | biological | full screen | **hero**, in the middle | small | shared, specimen-centred | radial rings around the plant (Adapt, Spread) and around a sky-and-ground scene (Terraform) |
| **13 World-control strategy rooms** | strategic / map-centric | full screen, dark ops header | thumbnail | **large** | shared, map-centred | compact tech-tree chips (Adapt, Terraform) · dashed route chips (Spread) |
| **14 Category labs** | specialised rooms | full screen, accent per room | medium (Adapt) / thumbnail (Spread) | medium | **none shared**: dossier, lab, lab, lab | anatomy-linked rows (Adapt) · route stations over a large map (Spread) · gauge columns (Terraform) |

## 5. How each concept handles the five states

### 5.1 Planet View
- **11, 12, 14:** the larger centred top HUD from Concept 10 (status card with Biomass as the strongest number, native pressure and instability meters), Explore / Change tool groups to its right, Pause / speed at the far right. Icons only below 1200 px with hover tooltips. 11 and 14 show the region summary as a small card in the sea corner; **12** is more restrained and shows it as one slim bar at the bottom centre.
- **13:** very clean and planetary. A thin dark status strip and a **left command strip** with the five tools as square icon buttons. The region summary appears inside the strip, so nothing floats over the planet.

### 5.2 Region Inspect
- **11:** specimen (medium) · region name, status, **Overview / Colony / Science tabs** (the owner-approved layout A) · mini-map with the region strip.
- **12:** a **big** specimen on the left, the same tabs in the middle, a small mini-map at the right.
- **13:** a control screen: large map on the left, a thumbnail specimen and the tabs on the right.
- **14 Ecology dossier:** ruled paper, serif headings, the three parts **stacked as report sections** instead of tabs; the specimen is a framed field sketch; the mini-map is the survey map.

Every version shows the four condition rows, the limiting factor, and "would help" shortcuts that jump to the right node in Adapt or Terraform.

### 5.3 Adapt
- **11:** specimen left (preview tag while hovering), **outline branching tree** in the middle (four category trunks, tier brackets; at narrow widths the cards become compact pills on the same skeleton), mini-map right.
- **12:** the plant is the centre of the screen inside a soft oval portal; the **radial ring** places the six tier-one adaptations around it and the later tiers on an outer ring; category labels sit in the gaps between sectors; hovering a node lights the matching stature / leaf / root / pigment layer.
- **13:** large map left; on the right a thumbnail specimen with the owned-trait list, and a **tech tree of chips** (depth as columns, orthogonal connectors). The column scrolls at 1024 px.
- **14 Evolution lab:** the plant fills the left third on a lab backdrop; **leader lines run from anchor points on the plant** (stem, leaves, roots, leaf surface) to one row per adaptation chain; later tiers continue each row to the right.

### 5.4 Spread
- **11:** the same outline tree with three trunks (Seeds, Growth, Reach); previews draw dispersal arcs on the mini-map.
- **12:** the same radial ring around the plant, sparser; Waterborne Seeds shows the sea route to Tide Isle on the small map.
- **13:** route-style chips with dashed connectors beside the large map, where the arcs appear.
- **14 Dispersal lab:** a **route line of stations** across the top (origin station on the left, branches dropping to later tiers) over a large mini-map with the arcs.

### 5.5 Terraform
- **11:** environment panel left (planet disc, sky temperature with the preview arrow, rain, instability, and a "plant anatomy unchanged" thumbnail); a **planetary-systems ring** around a large planet disc in the middle; mini-map right with the sky tint.
- **12:** the ring language is kept, around a sky-and-ground scene; the hover changes the sky in the scene and a small planet badge, never the plant. This is the stress test of whether one visual language can flex to Terraform.
- **13:** the control room: the environment panel across the top right, the tech-tree chips below it, the large map tinting and hatching on hover.
- **14 Planet systems lab:** **gauge columns** per system (Sky temperature, Rain, Ground, Air) with live readouts that preview the change (14 °C → 20 °C), the nodes hanging under each gauge, an environment panel and mini-map on the right.

## 6. The tree strategies

| Layout | Where | How it is built | Reads as |
|---|---|---|---|
| Outline branches | 11 Adapt / Spread | one column per category, depth-first rows, trunk and bracket connectors; pills when columns are under 150 px | an organic family tree |
| Radial ring | 11 Terraform, 12 all | tier one on an inner ellipse around the centre art, later tiers on an outer ellipse beside their parent; top / bottom nodes carry their label beside the icon | an evolution wheel |
| Tech chips | 13 Adapt / Terraform | depth as columns in a narrow panel, 30 px chips with name and cost, orthogonal connectors | a strategy-game tech tree |
| Route chips | 13 Spread | the same geometry with dashed pink route connectors | dispersal routes |
| Route stations | 14 Spread | origin station left, stations along a dotted line, branches dropping to later tiers | a metro line of dispersal methods |
| Anatomy rows | 14 Adapt | one row per adaptation chain, anchored by leader lines to a point on the plant | an annotated anatomy plate |
| Gauge columns | 14 Terraform | a gauge header per planetary system, nodes stacked below, live readouts | a control board |

All seven come from one renderer (`renderTree` in `rooms.js`) that lays nodes out in pixels and re-lays them on resize, so every tree is also the same data and the same interaction: hover / focus previews, click buys (fake), locked and placeholder nodes explain themselves on click.

## 7. Pause behaviour (as built)

- Opening any of the four rooms calls the fake clock's pause and remembers whether the run was already paused.
- The PAUSED pill is fully lit only while the clock is actually paused (it dims if the clock runs), so it cannot lie.
- **Planet** / Escape: close the room, restore the clock to what it was before the room opened.
- **Resume play**: close the room and run the clock, whatever it was before.
- Switching room → room keeps the pause and the selection.
- The HUD's Pause / speed controls are unreachable while a room is open (inert behind the chamber in 11, hidden in 12–14).

## 8. Icon approach

An inline SVG set drawn as 24 × 24 stroke icons (`I` in `rooms.js`, rendered by `ico()`): tools (Regions, Map View, Adapt, Spread, Terraform), clock (pause, play), categories (temperature, water, soil, hazard, reach, seeds, growth, air, ground), every tree node (cold, heat, drought, flood, salt, radiation, seed output, waterborne, early maturity, warm, cool, humid, dry, and the placeholders), status (check, alert, cross, lock), focus and local-upgrade options, and the Region tabs. Status chips use the same glyphs instead of text ticks. The gallery and Concepts 1–10 still use emoji placeholders and are not changed. QA scans the four concept pages for any Extended_Pictographic character and finds none (§9).

## 9. QA

Driver: [`evidence/bloom-022/qa-ui-mockups-rooms.js`](evidence/bloom-022/qa-ui-mockups-rooms.js) (Playwright). Results: [`evidence/bloom-022/qa-results.json`](evidence/bloom-022/qa-results.json). Run matrix: Chromium at 1280×800, 1024×768 and 1440×900 for all four concepts, reduced motion at 1280×800, Firefox at 1280×800; the gallery at all three widths. **Result: 1075 / 1075 checks pass** (2026-10-04; 212 of them in Firefox, 212 under reduced motion; 0 external requests). See the evidence folder for the screenshots (Planet View, Region Inspect, Adapt / Spread / Terraform with a node preview, a mini-map re-target, and 1024 / 1440 samples for each concept).

Per concept and viewport the driver verifies: load with no console errors and no external requests; no horizontal scroll on Planet View and in every room; main-map selection and summary; each room opens from its tool, pauses the clock and shows the PAUSED pill with the background inert or hidden; the mini-map exists, a click on it re-targets the room and the shared selection, a hover peeks; Adapt / Spread / Terraform render a tree with no overlapping nodes; hovering Cold Tolerance changes the plant layer and not the environment layer, hovering Warm the Sky changes the environment and not the plant, hovering Waterborne Seeds draws arcs; leaving a node restores everything; room → room links keep the pause; Escape and Back restore the clock, Resume play runs it, Back from an already-paused run stays paused; the main map geometry is identical before and after every room; Enter opens a room from the keyboard, 28 Tabs stay inside it with visible focus, Escape returns focus to the opener; deep links work; no emoji on the page; static isolation of the new files; root `index.html` and gameplay folders untouched.

## 10. Known limitations

- **Mockup, not UI logic.** Purchases, colony growth, Biomass, previews and the clock are scripted. Later-tier nodes are placeholders that cannot be bought; costs, names and effects are not proposals.
- **The specimen is the placeholder drawing** from earlier rounds. Concept 14's anatomy anchors and Concept 12's part highlights point at that drawing's layers, not at a final modular plant.
- **Concept 13's tree column scrolls at 1024 px** (and is close at 1280). That is the trade-off of giving the map most of the width; the owner should say whether it is acceptable.
- **Concept 11's outline tree switches to compact pills below about 150 px per column** (1024 px with the chamber insets). The skeleton is the same; the cards are not.
- **Radial rings are dense at 1024 px.** Pills size themselves to the tightest neighbour spacing and the cost line hides under 76 px; neighbouring label boxes can still touch at a corner (QA allows touches under 24 px, flags anything larger).
- **Radial rings are two rings deep.** The one three-deep Spread node (Burr Hooks) sits on the outer ring beside its parent rather than on a third ring.
- **Region Inspect's Regions list** is the strip under each mini-map and a map click; there is no separate full-page Regions browser in this round.
- **Icons are placeholder drawings.** The commitment is "real SVG icons, never emoji", not these particular shapes.
- **Firefox**: tested only at 1280×800. Safari / WebKit was not run.

## 11. Suggested owner review order

1. **Concept 11** first: learn the shared rules (pause, mini-map, room links, Back vs Resume) where the layout is calmest. Try Frost Ridge → Adapt → hover Cold Tolerance → click Dust Reach on the mini-map → Terraform in the room header → hover Warm the Sky → Planet.
2. **Concept 12**: decide how much the specimen should dominate, and whether one ring language can carry Terraform or whether Terraform wants its own room.
3. **Concept 13**: decide how much the map should dominate, whether chips are enough tree, and whether a scrolling tree is acceptable at 1024 px.
4. **Concept 14**: decide whether specialised rooms (report, lab, lab, control board) are worth losing one shared template, and whether the set still feels like one game.
5. Return to **Concept 11** and name which pieces of 12 / 13 / 14 it should borrow. That list is the basis of the production UI plan.

### Comparison questions
- Chamber over the dimmed planet (11) or a full new screen (12–14)?
- Specimen: hero (12), medium (11, 14 Adapt) or thumbnail (13)?
- Mini-map: medium (11, 14), small (12) or large (13)?
- One shared three-zone template (11) or room-specific labs (14)?
- Which tree reads best for each room: outline branches, radial ring, tech chips, route stations, anatomy rows, gauge columns?
- Should Region Inspect feel like a report (14), a lab (11, 12) or a control screen (13)?
- Is Back = "as it was" and Resume play = "running" the right pair of exits, and should a room be able to open the other rooms directly?
- Does "Plant anatomy unchanged" with a dimmed plant make the Terraform rule clear enough, or does Terraform need no plant at all?
