# BLOOM — Visual & specimen direction v1.0

**Status:** APPROVED FUTURE DIRECTION (owner + PMO, recorded with BLOOM-009, 2026-09-26; §9 contextual pop-out panels added with BLOOM-010, 2026-09-27). **Nothing in this document is implemented yet** except where the *Current implementation* section says so.

**Gate rule:** gameplay and mechanics validation comes before the full visual-polish phase. The owner passed the human procedural playtest ([`PLAYTEST_PROCEDURAL_v1.md`](PLAYTEST_PROCEDURAL_v1.md)) after BLOOM-009: the gameplay loop and per-colony development are kept, and the main open concern is **UI crowding** (§9). Content work (more archetypes) continues first; this document still does not start the visual-polish phase.

**Relationship to the bible:** this refines [`GAME_BIBLE.md`](../GAME_BIBLE.md) §12.4 (visual direction) and §13 (plant visual identity). Where §13 describes a "fixed-order layered plant sprite", the modular-anatomy architecture in §6 below supersedes it. §20 still lists the final visual language as an open decision. This document narrows that decision; it does not lock it.

---

## 1. Current implementation (BLOOM-009, BLOOM-010): temporary, functional only

- The dark monospace interface is still engineering scaffolding.
- BLOOM-009 changed the interface only where gameplay hierarchy needed it:
  - **Biomass** is the largest element in the HUD. It shows a big gold number, the passive income per second, a gold glow on gains and a red glow with a floating "−N" on spending.
  - Each colony's **growth focus** and **local upgrade** have bigger buttons and badges.
  - **Waterborne crossings** show as a few seed dots crossing the water, ending in a faint ripple (the seeds arrived) or a bright burst (a new foothold).
- The map draws each Living tile from its real stand density, from a tiny pale sprout to a full dark tile.
- None of this is final art. The Bloom Report's small plant is still a code-drawn pixel placeholder.
- **BLOOM-010** added one tiny, data-driven terrain treatment so a playtester can tell a Desert World from an Ocean Archipelago at a glance: an archetype may carry `render` data (a ground tint, its own water colours, a faint dune stipple on bare ground). It is temporary playtest readability, not the final biome art, and no asset pipeline exists.
- The **permanent left panel** (section readout, colony focus, local upgrades) is increasingly crowded. That is temporary scaffolding; §9 records the approved replacement direction.

## 2. Interface north star (future)

- Kid-friendly, organic and playful rather than clinical.
- Avoid the technical-dashboard / "AI-generated software interface" look.
- Large, readable type. Big controls with generous, touch-friendly hit targets.
- It should feel somewhere between a desktop game and an iPad app.
- The information hierarchy is obvious at a glance. **Biomass is the primary currency and stays visually dominant.**
- Visual sophistication serves readability and delight, not complexity for its own sake.

## 3. The living plant / specimen window (future)

**The map shows the planet blooming; the specimen window shows the player's plant evolving.**

The panel is one integrated scene: the plant grows upward from the soil into the sky, with its roots visible below. Environmental effects can sit behind or in front of the plant. The specimen stays the focus; the panel must not become a dense dashboard.

| Layer | Shows |
|---|---|
| **Sky** | sky colour and current temperature; clouds; rain, snow, haze or other relevant effects; Terraform-driven changes |
| **Plant** | accumulated adaptations; current growth and maturity; the local Roots / Leaves / Seeds allocation; the local specialization where appropriate; temporary stress or health |
| **Soil / belowground** | soil colour and condition; wetness or dryness where that is visually appropriate; visible roots; local root changes, including a Root Network |

### 3.1 Science / visual separation (must hold)

- **Adapt** (organism traits) changes **the plant**.
- **Terraform** changes **the environment around the plant**: sky, weather, soil and background. It never physically alters the organism, and the visuals must not imply that it does.
- **Colony development and density** change maturity, fullness and developmental appearance.
- **Current environmental stress** temporarily changes the plant's condition or behaviour.

### 3.2 Selected-region behaviour

A strong future direction is for the specimen to respond to the **currently selected colony**. The organism's global adaptations stay the same, but the scene shows that organism living in the selected region's temperature, moisture, soil, salinity and hazards, with that colony's allocation, specialization and establishment. This can become a major inspection and readability tool.

### 3.3 Small adaptation history

The panel may show a handful of adaptation tags. Selecting or hovering over one highlights the matching visible feature on the plant. Not implemented.

## 4. Visual channels (design framework, not an immutable rule)

Adaptations **accumulate** visually rather than replacing the whole plant image. Each kind of change owns a channel, so traits don't compete for the same feature. **Science accuracy wins** over forcing an adaptation into the wrong channel.

| Source | Visual channel |
|---|---|
| Temperature adaptation | stature, overall silhouette, compactness, architecture |
| Water adaptation | leaf morphology, thickness, surface qualities, water-related form |
| Soil adaptation | roots and/or stem and leaf tissue, where scientifically appropriate |
| Hazard adaptation | pigmentation, protective surface characteristics |
| Spread adaptation | flowers, fruits, seed structures, dispersal anatomy |
| Local Roots / Leaves / Seeds allocation | emphasis on, and amount of, the corresponding existing anatomy |
| Colony maturity / establishment | overall size, fullness, density |
| Terraform | environment only: sky, weather, soil and background conditions, environmental effects |

## 5. Waterborne Seeds: one visual language

Eventually Waterborne Seeds gets a recognizable seed or fruit form on the specimen itself. The **same** form then appears in the map's crossing feedback, so the player can follow the chain:

plant develops floating seeds → the seeds leave the plant and the colony → they cross the water → a new colony establishes if the destination suits the plant.

BLOOM-009 built only the minimal map crossing feedback (§1). The specimen connection is future work.

## 6. Plant art / rendering architecture (future)

**Do not** build hundreds of baked sprites, one per trait combination. **Do not** have an image model generate the whole runtime plant for each combination.

**Preferred:** modular authored parts + a code-controlled plant skeleton (blueprint) + deterministic assembly. Think character customization or modular anatomy, not pre-rendered plants. The system conceptually contains:

- a root skeleton with anchors; the main stem architecture; branch nodes and sockets; leaf sockets; reproductive sockets;
- reusable parts: leaf families, roots, stems, flowers, fruits, seed heads and pods, and trait-specific pieces or overlays;
- colour and pigment palettes;
- growth and maturity parameters.

Traits and growth state manipulate those parts and parameters. A deterministic seed/build reconstructs the same plant every time, and a manageable curated library yields many combinations.

**Bloom Report:** it reuses and enlarges this same final specimen rather than inventing a separate end-screen plant. It connects player decisions → the visible organism → real-world plant-adaptation analogs.

## 7. Art production plan

- **Prototype phase (now):** simple code-drawn or native SVG placeholders are acceptable. Claude may create simple vectors and shapes that are good enough for mechanical prototypes.
- **Later visual production:**
  - image generation serves as an art-direction and component-production aid;
  - generate reference sheets of plant components where useful;
  - turn the chosen designs into clean, reusable parts;
  - runtime code owns composition and manipulation.
  - Example component batches: leaf families, roots, stems, flowers, seed pods, fruits, thorns, waxy/succulent structures, pigments and protective features.
- Never ask an image generator for every possible finished plant combination.

## 8. Rendering technology: escalation path

1. Native HTML / CSS / canvas / SVG.
2. Native SVG + JavaScript for modular plant assembly.
3. SVG.js or a similar lightweight SVG helper, only if native manipulation becomes unnecessarily cumbersome.
4. Heavier rendering (Three.js / WebGL) only when a demonstrated design or animation requirement cannot reasonably be met by the simpler stack.

Richer planned visuals are not, on their own, a reason to add Three.js. The engineering preference remains maximum game impact with minimum unnecessary code.

## 9. Contextual pop-out panels (approved after BLOOM-009; recorded with BLOOM-010 — future, NOT implemented)

The owner's verdict after the procedural playtest: the gameplay loop is good and the per-colony development mechanic stays. The main remaining problem is **UI crowding**. The owner approved this direction for the final information architecture.

- **The crowded permanent left panel is temporary scaffolding.** It exists because the prototype added one readout after another to a fixed sidebar. It is not the target layout.
- **Lean toward contextual pop-out panels, drawers and large cards**, in the spirit of SimCity and The Sims:
  - selecting a region can open a **larger region panel**, instead of squeezing its readout into a narrow column;
  - **colony development** (growth focus, local specialization) can live in its own contextual panel for the selected colony;
  - the global **Adapt / Spread / Terraform** systems can use larger dedicated surfaces;
  - details appear **on demand** instead of staying permanently visible.
- **Prefer larger fonts and larger buttons** over compressing information to preserve sidebar space. This is consistent with §2 (large type, touch-friendly targets).
- **The map / surface stays the visual centre of the game.** Panels open over or beside it and close again; they never permanently shrink the planet into a corner.
- Continue toward the approved **kid-friendly, organic, desktop/iPad hybrid** direction (§2).
- The SimCity / Sims reference is about **how information is organized** (contextual, on-demand, large). It is **not** an instruction to copy their visual design.

**Scope:** this is future UI/UX direction only. BLOOM-010 was a mechanics/content package (the Desert World archetype) and implemented none of it. The redesign comes with the visual-polish / final-board phase (bible §15), after content validation.

## 10. Design-reference review before the final UI (owner requirement; recorded with BLOOM-016 — process decision only)

The owner asked for a separate design-review phase before the major run-screen redesign: *"i want to go over various ideas for designs you have or we can borrow from similar style games when we get to that phase."*

- **Gate.** After BLOOM-016 (player game flow) and **before** the major run-screen UI / specimen implementation, PMO and owner review multiple UI/UX concepts and relevant precedents from comparable strategy / simulation games. No final run-screen design is authorized before that review.
- **What the review considers:** home and selection presentation; map-first layouts; contextual panels and drawers (§9); upgrade-board presentation (Adapt / Spread / Terraform); living-organism / specimen presentation (§§1–6); information hierarchy; touch / desktop hybrid controls; how comparable games reveal complexity progressively.
- **What is not decided yet:** permanent sidebar layout, final contextual drawers, final board layout, specimen window placement, final typography, final art style, final icons, mobile / tablet composition. Sections 1–9 above remain the approved *direction*; the concrete design is chosen in the review.
- **BLOOM-016's launcher** (`index.html`, the run page's player menu, the loading and result actions) is a clean, temporary, functional shell: its layout, emoji icons and type are placeholders and pre-select nothing.

### 10.1 Owner decisions from the Round 1 concept review (recorded with BLOOM-018)

The owner reviewed the BLOOM-017 concepts. These decisions now bind the production run-screen design; the full record is in [`UI_CONCEPT_REVIEW_v2.md`](UI_CONCEPT_REVIEW_v2.md) §1.
- **Rejected:**
  - a permanent giant specimen or specimen-first layout;
  - full-screen Adapt / Spread / Terraform takeovers;
  - giant permanent bottom action buttons;
  - routine map resizing;
  - an over-minimal "watching game" display;
  - four always-visible heatmap buttons.
- **Kept:**
  - map-first play with a large map;
  - a Concept-2-style Regions browser;
  - a rich contextual region popup with tabs (no "More" expansion);
  - a medium contextual specimen;
  - compact floating action launchers;
  - one compact heatmap lens control;
  - persistent Pause / Play and speed (1× → 2× → 4×).
- **Map-geometry rule:** surfaces overlay the map by default. Only a genuine column-scale workflow (Regions browser, deep upgrade browser) may shift it: once on open and once on close, never per click, and never with two columns.
- **Specimen rule** (unchanged from §§3–6, now explicit for previews): Adapt changes the organism; a Terraform preview changes only its surroundings.
- The concrete layout is still open. Round 2 (Concepts 5–8) is the comparison set, and no production UI is authorized yet.

### 10.2 Owner decisions from the Round 2 review: convergence (recorded with BLOOM-019)

The owner reviewed Concepts 5–8 and chose to converge on **Concept 8's side workbench**. The full record is in [`UI_CONCEPT_REVIEW_v3.md`](UI_CONCEPT_REVIEW_v3.md) §§1–4.
- **Rejected:**
  - region popups that cover the map (they hide neighbouring regions);
  - Adapt / Spread / Terraform surfaces that cover the map (they spoil hover previews on the real map);
  - scattered tool clusters;
  - "Lens" as the player-facing word;
  - a thin top toolbar.
- **Direction under test (Concept 9):**
  - **one** right-side workbench shared by Region · Regions · Map View · Adapt · Spread · Terraform, one mode at a time;
  - clicking a region opens it in **Region** mode, and clicking another updates it in place;
  - **one** compact Explore / Change tool rail;
  - **Map View** with hover/focus preview and click-to-commit;
  - a larger, centred status banner with Biomass strongest.
- **Map-geometry rule, tightened for the shared workbench:** opening the workbench reframes the map **once**; switching modes, or region → region, moves it **zero** more times; closing restores it exactly. Map-covering surfaces are no longer the default for regions or upgrades.
- **Still open:**
  - Region workbench organisation (Variant A tabbed / B dashboard + tabs / C scrolling sections);
  - the touch purchase pattern;
  - the questions in v3 §13.
- The production run-screen UI is **not locked** and the rebuild is not started.

### 10.3 Owner decisions from the Concept 9 review: refinement (recorded with BLOOM-020)

The owner reviewed Concept 9. The full record is in [`UI_CONCEPT_REVIEW_v4.md`](UI_CONCEPT_REVIEW_v4.md).
- **Decided:** Region details use **layout A · Tabbed** (fixed summary + Overview / Colony / Science tabs). B and C are retired as candidates.
- **Not approved as it was:** the permanent full-height Explore / Change rail at the outer edge.
- **New rule: content-height workbench.**
  - The workbench is top-aligned and only as tall as its content, up to a max-height.
  - Past that, the mode's own body scrolls inside it.
  - It is never a full-height slab, and the map still reserves the column while it is open.
- **Under test (Concept 10):**
  - tool access as an **attached short dock** vs **in-panel Explore / Change navigation** (review-only switch);
  - in Adapt / Spread / Terraform, a map click **re-targets "Considering for"** and stays in the mode, with Details, a second click or the Region tool opening Region details.
- **Geometry rule unchanged:** one reframe on open; zero movement for region → region, mode switches and tool-access switches; exact restore on close.
- The production run-screen UI is **not locked** and the rebuild is not started.

### 10.4 Concept 10 top-banner tool access (recorded with BLOOM-021)

The owner broadly likes Concept 10 and asked to try the tools in the top banner, between the run status and Pause / speed. The full record is in [`UI_CONCEPT_REVIEW_v5.md`](UI_CONCEPT_REVIEW_v5.md).
- **Not a new concept.** Concept 10 gains a third review-only tool-access choice, **3 · Top banner**, beside 1 · Attached dock and 2 · In-panel navigation.
- **Top-banner rules under test:**
  - band order is status → tools → Pause / speed;
  - the status card stays the biggest block, with Biomass the strongest number;
  - the tools are two small Explore / Change groups with no outer capsule;
  - icon + text at ≥ 1200 px, icons only below that; every tool has a hover / focus tooltip and a full accessible name;
  - Region has no banner button.
- **Closed state:** nothing floats over the planet.
- **Geometry rule unchanged:** one reframe on open; zero movement for tool switches, region → region and tool-access switches.
- The production run-screen UI is **not locked** and the rebuild is not started.

### 10.5 Direction change: Planet View + paused decision rooms (recorded with BLOOM-022)

After BLOOM-021 the owner changed the leading direction. The full record and the four comparison concepts are in [`UI_CONCEPT_REVIEW_v6.md`](UI_CONCEPT_REVIEW_v6.md).
- **New architecture under test:** a **stable full-map Planet View as home** that hands off into **dedicated, paused strategy / inspection rooms** for Region Inspect, Adapt, Spread and Terraform. The side workbench (Concepts 9–10) is no longer the leading direction; Concepts 1–10 remain in the gallery as design history.
- **Rules every room must keep:** entering a room auto-pauses and says so; every room carries a **smaller interactive map** (select, peek, re-target, previews); Adapt / Spread / Terraform use a **visual upgrade tree**, not a card grid; Adapt changes the organism, Terraform changes the environment only; important map effects stay visible while deciding; regions can be compared without close / reopen cycles.
- **Icons:** final UI phases use **real SVG / custom icons, never emoji**. Concepts 11–14 already use an inline SVG placeholder set.
- **Under comparison (Concepts 11–14):** specimen prominence, mini-map prominence, one shared room template versus specialised rooms, tree layouts (outline branches, radial ring, tech chips, route stations, anatomy rows, gauge columns), and whether Region Inspect is a report, a lab or a control screen.
- The production run-screen UI is **not locked** and the rebuild is not started.

### 10.6 Decision Rooms Convergence (recorded with BLOOM-023)

The owner reviewed Concepts 11–14 and asked for one convergence prototype instead of another exploration round. The record is [`UI_CONCEPT_REVIEW_v7.md`](UI_CONCEPT_REVIEW_v7.md); the prototype is Concept 15 in the gallery.
- **Kept:** the Planet View + paused decision rooms architecture (no return to a side workbench).
- **Combined:** Concept 11's left-column room composition and globe Terraform, Concept 12's bottom region banner (only while a region is selected; X / empty-map click deselect; Pause / speed never close it), Concept 14's anatomy-linked Adapt tree (cleaned up: plant-ordered categories, lane leaders that never cross). Adapt and Spread are one room family; Terraform is the globe room with a land scene instead of a plant.
- **New rules:** the main map fills the frame width (more ocean, no dead side columns); entering a room deselects the home map and carries the region into the room as its mini-map context; room mini-map choices never come back as a home selection; Map View layers preview on hover / focus and set on click; room UI scales with the viewport and is noticeably larger (desktop-first, iPad-like legibility).
- The production run-screen UI is **not locked** and the rebuild is not started; the owner's confirmations are listed in v7 §11.

### 10.7 Concept 15 Presentation Refinement (recorded with BLOOM-024)

The owner accepted Concept 15 as the convergence direction and asked for one presentation pass before the production UI plan is written. The record is [`UI_CONCEPT_REVIEW_v8.md`](UI_CONCEPT_REVIEW_v8.md); the prototype is Concept 16 in the gallery (Concept 15 is kept unchanged as history). Nothing structural changed; the owner's presentation directions are now built and QA'd:
- **Scale from pill fit:** the room's type size is calibrated so that about three region pills of ordinary name length fit across the right-hand context column; everything in the room is sized in em from it and the whole room shrinks proportionally when the window is too crowded (17.5 / 14.0 / 19.7 px at 1280 / 1024 / 1440).
- **Rooms float over the world:** Planet View stays underneath, blurred and dimmed and inert; the room's boxes are windows with the world visible between them (not a return to the chamber or the side workbench).
- **Content-height side panels** with a floor; the Spread tree box ends with its tree.
- **Anatomy links:** thicker colour-coded leaders with a glow when lit, bigger anchor rings with label plates on the plant; **category colours with a reason** (Adapt by condition, Spread by dispersal logic) on labels, nodes, ports, leaders, anchors and the hover info.
- **Terraform:** Soil (left, pointing at the surface) and Atmosphere (right, pointing at a dotted halo around the globe) as a C and a reversed C instead of a full orbit.
- **Hover-reset rule:** hover / focus previews only while active; leaving restores the committed state at once; only a click commits.
- The production run-screen UI is **not locked** and the rebuild is not started; the owner's confirmations are listed in v8 §11.
