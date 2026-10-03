# BLOOM — UI concept review v4: refinement (BLOOM-020)

**For:** the owner and PMO, for the next step of the UI design-reference review ([`VISUAL_DIRECTION_v1.0.md`](VISUAL_DIRECTION_v1.0.md) §10), and for whoever later builds the production run screen.

**Open:** [`demos/ui-mockups/index.html`](../demos/ui-mockups/index.html) in a browser. It works over `file://` with no build step and opens on the new **Refinement** tab. Convergence (Concept 9, [`UI_CONCEPT_REVIEW_v3.md`](UI_CONCEPT_REVIEW_v3.md)), Round 2 (Concepts 5–8, [`v2`](UI_CONCEPT_REVIEW_v2.md)) and Round 1 (Concepts 1–4, [`v1`](UI_CONCEPT_REVIEW_v1.md)) are one tab away and unchanged.

> **Still a visual concept mockup.** Every number, region, trait effect, colony change and plant drawing is scripted (`demos/ui-mockups/shared.js`, `r2.js`, `c10.js`). The page never loads or calls the engine, generator, validators, scenarios, balance data or Bloom Report. Pause and speed only control the mockup's fake clock. Prices, icons, colours, fonts and art are not proposals. The live run screen (`demos/demo-run.html`), the player flow (root `index.html`) and all gameplay files are unchanged. **The production UI is not locked by this document.**

BLOOM-020 does not explore a new UI philosophy. It builds **one refinement prototype**, Concept 10, on top of Concept 9, to answer two questions:

> 1. *How should the tools be presented if the permanent full-height rail is removed or softened?*
> 2. *How should the workbench look as a content-height panel instead of a full-height slab?*

## 1. Owner findings from the Concept 9 review (BLOOM-019)

- **Region layout A · Tabbed looks best.** B (dashboard + tabs) and C (scrolling sections) are no longer candidates. Concept 9 still has the A/B/C switch for history.
- **The permanent right-side toolbar is not approved as it is.** The full-height Explore / Change rail at the outer edge read as a separate towering column.
- **Anything that comes from the workbench should be only as tall as its content.** The reference direction keeps the side workbench and keeps it top-aligned, but lets it end where its content ends instead of always being a giant full-height slab.

**Kept from Concept 9 (locked base direction for this round):**
- the unified side workbench;
- map click opens Region mode, with no region popup over the planet;
- no map-covering Adapt / Spread / Terraform surfaces;
- no permanent giant specimen, and no full-screen takeover;
- the larger centred top banner;
- compact Pause / speed;
- the words "Map View".

## 2. Concept 10 in one paragraph

`demos/ui-mockups/concept-10-refined-bench.html` (+ `c10.js`, `c10.css`). The same six modes share one workbench, one mode at a time: **Region · Regions · Map View · Adapt · Spread · Terraform**. Region details always use **layout A** (fixed summary with the plant, status, what is holding it back and fix suggestions, then Overview / Colony / Science tabs). The workbench is a **top-aligned panel that ends where its content ends**. There is **no permanent full-height rail**. A review-only **Tool access** switch in the striped mockup ribbon (`?tools=dock|panel`, remembered as `bloomC10Tools`) compares two ways of reaching the tools. It keeps the open mode and the selected region. While Adapt, Spread or Terraform is open, a map click on another region **changes who you are "Considering for" and stays in the mode** (§5).

Concept 9 is untouched. Concept 10 reuses Concept 9's content styles (`c9.css`) without changing them, and has its own shell, behaviour and geometry.

## 3. Tool access: Attached Dock vs In-Panel Navigation

Both variants have the same six tools in two groups: **Explore** (Region, Regions, Map View) and **Change** (Adapt, Spread, Terraform). Only one mode is active at a time, and the active tool is visibly pressed.

**Region tool.** Region is now a tool too, so the player can always get back to the selected region's details on purpose (§5). With nothing selected it is dimmed (`aria-disabled`). Pressing it then shows a hint: "Click a region on the map to see its details here."

### Variant 1 · Attached dock

- A **short vertical dock**, only as tall as its six buttons: 78 × 439 px at 1280 and 1440; 70 × 409 px at 1024.
  - At 1280 × 800 that is 65% of the world area height. The Concept 9 rail ran the full height.
- **Open:** the dock is joined to the panel's top-right corner. The panel's top-right corner is square where the dock meets it, and the active tool has a small pointer into the panel. Panel and dock read as one shaped surface, not a separate column.
- **Closed:** the same dock stays where it was, as a small floating button stack in the top-right sea corner.
  - The QA driver checks that it covers no map region.
  - Pressing a dock tool opens that mode. Pressing the active tool again closes the workbench.
- **Cost:** while closed, six buttons float over the map corner. It is clear of the island at all three tested sizes, but a larger or differently shaped planet could reach that corner.

### Variant 2 · In-panel navigation

- **No outside dock.** Explore / Change sit in the panel header as two compact segmented groups, each button an icon over a short label. The mode title row under them is slimmer, because the navigation already names the group.
- **Closed:** one small **🧰 Tools · Explore · Change** opener (164 × 54 px) in the top-right sea corner. It reopens the last non-Region tool (Regions by default). A map click still opens Region directly, without the opener.
- **Cost:** the header is about 45 px taller than in the dock variant, so every mode's panel is that much taller (§4 table). Reaching a Change tool from a closed workbench takes two presses: Tools, then the tool.

**Switching variant** keeps the mode, the selected region and the panel's left edge and top. With the workbench closed, it swaps dock ↔ opener. The map never moves (§6).

## 4. Content-height workbench rules

As built:
1. The panel is **top-aligned**, 12 px below the banner (10 px at ≤1100 px).
2. Its height is **content-driven**. It ends when the mode's content ends, and the map background shows below it.
3. Its **max-height** is the world area minus the top and bottom gutters (650 px at 1280 × 800).
4. Past max-height, **only the mode's own body scrolls**. The panel never overflows.
   - **Region:** the summary and tabs stay fixed and the tab body scrolls.
   - **Regions:** the filter row stays fixed and the list scrolls.
   - **Adapt / Spread / Terraform:** the plant preview is **pinned** at the top while the cards scroll under it.
5. To keep short modes short, some content moved or was compacted:
   - **Region · Overview** shows the four conditions only. Stand density and Biomass already appear in the summary chips, so their detail moved to Colony, and "Recent" moved to Science.
   - **Adapt / Spread / Terraform:** cards sit in one flat two-column grid without category headings. The separate "On the planet" block was removed: the context line's verdict and the + / − marks on the real map carry that information. The verdict reserves two lines, so hovering cards never changes the panel height.
   - **Map View:** rows are compact, and the intro line and status line are merged into one.
6. Changing the region, the tab or the hovered card **never changes the map**. It can change the panel's height (for example Overview vs Colony), and that is intended.

**Measured panel heights.** From `docs/evidence/bloom-020/qa-results.json` → `panel`, Chromium. Each cell is panel height / free space below it, in px. **MAX** means the panel reached max-height and its body scrolls. Spread and Terraform were measured with Frost Ridge as the context.

| Viewport (world area) | Variant | Region | Regions | Map View | Adapt | Spread | Terraform |
|---|---|---|---|---|---|---|---|
| 1280 × 800 (674) | 1 dock | 526 / **136** | MAX | 476 / **186** | MAX | 589 / 73 | 594 / 68 |
| 1280 × 800 (674) | 2 in-panel | 572 / 90 | MAX | 532 / **130** | MAX | 554 / 108 | MAX |
| 1024 × 768 (646) | 1 dock | 543 / 93 | MAX | 499 / **137** | MAX | 620 / 16 | 607 / 29 |
| 1024 × 768 (646) | 2 in-panel | 592 / 44 | MAX | 530 / **106** | MAX | MAX | MAX |
| 1440 × 900 (774) | 1 dock | 504 / **258** | MAX | 464 / **298** | 730 / 32 | 572 / 190 | 577 / 185 |
| 1440 × 900 (774) | 2 in-panel | 572 / 190 | MAX | 532 / **230** | 697 / 65 | 537 / 225 | 645 / 117 |

The result matches the owner's expected shape:
- **Map View is short:** at least 106 px of map below it everywhere.
- **Region is medium.**
- **Regions is the tall one:** it always scrolls.
- **Adapt is tall.**
- **Spread and Terraform are medium** at 1280 and up.

At **1024 × 768** the whole world area is only 646 px high, so Spread and Terraform nearly reach (dock) or reach (in-panel) max-height and scroll there. Reduced motion gives the same heights. In Firefox one value differs: Region at 1024 dock is 569 px.

## 5. Region clicks during Adapt / Spread / Terraform (new behaviour under test)

Concept 9 switched back to Region mode on any map click. Concept 10 tries the alternative from v3 §13 Q2.

- **Click a different region** while Adapt, Spread or Terraform is open:
  - the selected-region outline moves;
  - **"📍 Considering for …" changes** to the new region;
  - the plant preview redraws "Your plant in …" for that region;
  - the verdict prompt and the "helps / harder for" card tags update;
  - **the mode stays open**, and the map does not move (measured: 0 resize events).
  - The context row flashes briefly, and screen readers hear "Now considering Dust Reach in Adapt your plant. … Click it again, or press Details, to open the region."
  - Keyboard Enter on a map region behaves the same.
- **Intentional ways back to Region details:**
  1. the **📍 Details** button in the context row;
  2. **clicking the already-selected region again**;
  3. the **📍 Region** tool in the dock or in-panel navigation.
- **With no context** (after ✕ Clear), a map click sets "Considering for" and stays in the mode.
- **Esc** closes the workbench and returns focus to the tool that opened the mode, not to the last region clicked. Re-targeting did not open anything.
- **Other modes are unchanged:** a map click in Regions or Map View opens Region details, as in Concept 9.

**Possible confusion, for the owner to judge:**
- A player who wants a region's details while in Adapt may click it, see Adapt stay open, and not realise that a second click opens the details. The context row's text ("Click another region on the map to consider it") and the Details button are the mitigations.
- In the dock variant, the 📍 Region tool is always visible as a third way back. In the in-panel variant it is in the header.

## 6. Retained geometry rules (measured)

1. **Closed:** the map uses the **whole** world area, with no rail column. The closed dock or Tools opener floats in the sea corner.
2. **Opening:** **one** deliberate reframe. The map's right edge moves in by the reserved column (`--res` = panel + dock + gutters: 522 px at 1280, 462 px at ≤1100 px, 554 px at ≥1400 px; equal to the measured map-width change below) in one 0.38 s slide, instant under reduced motion.
3. **Both variants reserve the same column**, so switching variant can never move the map. The in-panel variant uses the dock's width as extra panel width.
4. **Region → region, every mode switch, tool-access switches, Adapt / Spread / Terraform re-targeting, Map View previews and commits, purchases:** **zero** movement.
5. **Closing:** the original geometry is restored exactly.
6. **The reserved column is kept while the panel is shorter than the column.** That is acceptable per the brief: the visible panel does not stretch to fill it, and the space below it is plain map background. It does not take clicks.

**Measured.** Map SVG box [x, y, w, h], `ResizeObserver` log and open-transition count. After the first open the log was cleared, and every later step had to add nothing.

| Viewport | Closed | Open | Map width open | Region → region (5 clicks) | 7 mode switches | Tool-access switches (×4, open) | A/S/T re-target + Details + Clear | Closed again |
|---|---|---|---|---|---|---|---|---|
| 1280 × 800 | 16,140,1248,644 | 16,140,726,644 | 57% of viewport | **0** | **0** | **0** | **0** | identical |
| 1024 × 768 | 16,136,992,616 | 16,136,530,616 | 52% of viewport | **0** | **0** | **0** | **0** | identical |
| 1440 × 900 | 16,140,1408,744 | 16,140,854,744 | 59% of viewport | **0** | **0** | **0** | **0** | identical |

The numbers are the same for both variants, under reduced motion and in Firefox. The tool-access switch while closed also logs **0**.

Compared with Concept 9: open map widths are within 6 px (C9 was 732, 528 and 856 px). The closed map is wider, 1248 vs 1164 px at 1280, because there is no rail column.

## 7. What the owner should compare next

Suggested 10-minute pass on Concept 10:

1. **Tool access.** Use the ribbon switch: **1 · Attached dock**, then **2 · In-panel navigation**. Try each with the workbench open and closed. *Which feels lighter? Which is quicker to reach Adapt from a closed workbench?*
2. **Panel height.** Open Map View, then Region, Regions and Adapt. *Does the content-height panel feel like a shaped surface? Is the map background below a short panel fine, or does the reserved column feel empty?*
3. **Re-targeting.** Click Frost Ridge, open Adapt, then click Dust Reach, Marsh Low and Tide Isle. *Is staying in Adapt right? Is it obvious how to get to a region's details (Details, click again, Region tool)?*
4. **Region A.** Click through several regions. *Is Overview = conditions only, with stand and Biomass in the summary chips, enough at a glance?*
5. **Banner and clock.** These are unchanged from Concept 9. *Still right?*

**Specific questions for the owner:**
- **Q1.** **Attached dock (1)** or **in-panel navigation (2)**? Or a mix, for example the dock while open and the single Tools opener while closed?
- **Q2.** Keep the new **map click = re-target** in Adapt / Spread / Terraform, or go back to Concept 9's **map click = Region**?
- **Q3.** Is **"click the selected region again → details"** acceptable, or too hidden? Should Details be the only way?
- **Q4.** Should **Region** stay a tool button next to Regions, or be reachable only from the map and the Details button?
- **Q5.** Is the empty reserved column below a short panel acceptable? The alternative is a map that resizes with the panel height, which breaks the zero-movement rule.
- **Q6.** **Touch purchase pattern** (v3 §12) is still unresolved.
- **Q7.** Is Concept 10, with the Q1 choice, close enough to be the **production UI direction**, so the next step is a production plan rather than another mockup?

## 8. Known limitations (sandbox only)

- **Everything is fake.**
  - Trait effects, "opens / harder" lists, colony growth, Biomass, pressure and climate words are scripted.
  - Speed only changes how often the fake clock ticks.
- **1024 × 768.**
  - With the workbench open the map is 530 px wide (52% of the viewport), the same as Concept 9.
  - Spread and Terraform reach or nearly reach max-height and scroll (§4).
  - The review switch shows short labels ("1 Dock" / "2 In-panel").
- **Closed launchers float over the map corner.** At the tested sizes they cover no region (checked). A wider or differently shaped planet could reach that corner.
- **The "On the planet" list was removed** from Adapt / Spread / Terraform. The verdict line and the map carry that information. The clickable "find this region" chips from Concept 9 are gone with it.
- **Touch.** There is still no separate preview gesture: tapping an upgrade card buys it, and tapping a Map View row commits it (v3 §12).
- **Keyboard.**
  - Map regions are reached by Tab in document order, with no spatial arrow keys yet.
  - Enter on a region keeps focus on the map for quick comparison.
  - The workbench comes after the map in Tab order, and the dock comes after the workbench.
- **Browsers.** Tested in Chromium (1280 × 800, 1024 × 768, 1440 × 900, plus reduced motion) and Firefox (1280 × 800, 1024 × 768). WebKit / Safari was not run, because the macOS-12 WebKit build is not installed on this machine.
- **Shared code.**
  - BLOOM-020 changed **no shared file**: `shared.*`, `r2.*` and `c9.*` are byte-identical. Only the gallery `index.html` changed.
  - The BLOOM-019 Concept 9 driver was re-run from a scratch copy, so its committed evidence is untouched: **518 / 521**. The three failures are its gallery checks that expect Convergence to be the default tab and expect three tabs to wrap. BLOOM-020 changes both on purpose. Every Concept 9 behaviour check passed in Chromium and Firefox.
- **Phone layouts** are out of scope.

## 9. Evidence and QA

- **Screenshots** in [`docs/evidence/bloom-020/`](evidence/bloom-020/), 1280 × 800 unless noted:
  - `00-gallery-refinement.png`: the gallery's new default tab;
  - `c10-01-run-dock.png`, `c10-01-run-panel.png`: default run view, workbench closed. Floating dock vs single Tools opener;
  - `c10-03-region-tabbed-dock.png`, `c10-03-region-tabbed-panel.png`: Region mode, layout A (Marsh Low), Attached Dock vs In-Panel Navigation;
  - `c10-05-mapview-short-dock.png`, `c10-05-mapview-short-panel.png`: Map View, a short panel that ends well above the bottom;
  - `c10-06-adapt-retarget-dock.png`, `c10-06-adapt-retarget-panel.png`: Adapt after a map click moved "Considering for" from Frost Ridge to Dust Reach (still in Adapt), Drought Adaptation previewed;
  - `c10-07-terraform-dock.png`, `c10-07-terraform-panel.png`: Terraform, Warm the Sky previewed: planet tint, + / −, "PLANT UNCHANGED";
  - `c10-08-regions-dock.png`, `c10-08-regions-panel.png`: Regions, the tall mode, with the list scrolling inside the panel;
  - `c10-09-1024-region-*.png`, `c10-10-1024-adapt-*.png`: 1024 × 768 Region and Adapt;
  - `c10-11-1440-mapview-preview-*.png`: 1440 × 900 Map View with Temperature previewed.
- **QA driver:** [`docs/evidence/bloom-020/qa-ui-mockups-c10.js`](evidence/bloom-020/qa-ui-mockups-c10.js). Run it with `NODE_PATH="$(npm root -g)" node docs/evidence/bloom-020/qa-ui-mockups-c10.js [--shots] [--firefox]`. Results go to `qa-results.json`. **1279 / 1279 checks pass**, covering:
  - the gallery (11): Refinement is the default; Concepts 1–10 are reachable and every back link returns to its own tab; arrow keys walk all four tabs; links in hidden tabs are not tabbable; an old BLOOM-018 / BLOOM-019 remembered tab does not hide the new default; no horizontal scroll at three viewports;
  - a Concepts 1–9 regression smoke (9);
  - Concept 10, about 103–107 checks per run. Every run is done for both variants at 1280 × 800, 1024 × 768 and 1440 × 900, plus reduced motion (1280) and Firefox (1280, 1024). The checks cover:
    - the 17 items in the BLOOM-020 brief;
    - the measured geometry and panel heights above;
    - layout A only;
    - closed launchers clear of every region;
    - dock attached to the panel when open;
    - the specimen rule (Adapt changes plant layers, Terraform only the environment layer);
    - re-targeting in all three upgrade modes;
    - all three ways back to Region;
    - a fake purchase;
    - Esc and focus return in both variants;
    - Tab walks with the workbench closed and open (no hidden, transparent, off-screen or ring-less stops, and never into the other variant's controls);
    - no horizontal scroll, no console errors, no external requests.
