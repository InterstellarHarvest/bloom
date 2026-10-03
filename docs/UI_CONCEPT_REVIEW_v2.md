# BLOOM — UI concept review v2 (BLOOM-018)

**For:** the owner and PMO, for the second round of the UI design-reference review ([`VISUAL_DIRECTION_v1.0.md`](VISUAL_DIRECTION_v1.0.md) §10), and for whoever later builds the production run screen. Section 1 records **design decisions**, not temporary notes.

**Open:** [`demos/ui-mockups/index.html`](../demos/ui-mockups/index.html) in a browser. It works over `file://` with no build step and opens on **Round 2**. Round 1 (Concepts 1–4, [`UI_CONCEPT_REVIEW_v1.md`](UI_CONCEPT_REVIEW_v1.md)) is one tab away and unchanged.

> **These are still visual concept mockups.** Every number, region, trait effect, colony change and plant drawing is scripted (`demos/ui-mockups/shared.js` + `r2.js`). The pages never load or call the engine, generator, validator, scenarios, balance data or Bloom Report. Pause and speed only control the mockup's fake clock. Prices, icons, colours, fonts and art are not proposals. The live run screen (`demos/demo-run.html`), the player flow (root `index.html`) and all gameplay files are unchanged.

## 1. Owner decisions from the Round 1 review (binding on future UI work)

The owner reviewed BLOOM-017 by hand. These decisions now shape the production run-screen UI. They should be changed only by the owner.

### 1.1 Findings on Round 1

| Concept | Owner finding |
|---|---|
| 1 · Hybrid | **Full-screen Adapt / Spread / Terraform takeovers rejected** (Plague-Inc style; the owner dislikes them). **Huge permanent bottom action buttons rejected**: oversized and disconnected from the rest of the UI. Concept 1 omitted Pause and speed; that was an oversight, not a decision. |
| 2 · Drawers | **Kept:** the region information density, the **Regions browser / list**, region jumping and triage, and the map-overlay idea (Temperature / Water / Soil / Hazard heatmaps). **Rejected:** four heatmap buttons that permanently take up prominent space. |
| 3 · Specimen companion | **Rejected as a structural direction.** The always-large persistent specimen is not wanted. Individual ideas may survive only where they are independently useful. |
| 4 · Calm shelf | **Too minimal.** *"not seeing any real info on screen that changes or can be changed makes it like a watching game."* **Kept:** the spaciousness, the small floating action controls, and the spatial behaviour of tapping a region to get a card beside it **without shrinking the map**. |

### 1.2 Rejected directions (do not reintroduce without the owner)

- **R1.** A permanent giant specimen or specimen-first layout.
- **R2.** Full-screen takeover boards for Adapt / Spread / Terraform. Major choices stay spatially connected to the real map.
- **R3.** Giant permanent bottom Adapt / Spread / Terraform buttons.
- **R4.** Routine map resizing or re-centring. Selecting a region, opening a lens, or opening a small action surface must not change the map's size.
- **R5.** An over-minimal display that hides changing state and available decisions.
- **R6.** A permanently prominent four-button heatmap control.

### 1.3 Retained directions

- **K1. Rich, map-first play.** The map is large and visually dominant in every state.
- **K2. Concept-2-style Regions browser:** a list of every region with status, limiting factor, colony state and jump-to-region.
- **K3. Richer contextual region popup.** Click or tap a region and a large card appears associated with it. The map does not shrink. Ordinary information is visible immediately.
- **K4. Region tabs or buttons, not "More ▾" expansion.** The families are Overview / Conditions, Colony and Science / Details (naming may vary).
- **K5. Contextual specimen**, medium-sized, where it adds information: the region popup, Adapt, and other relevant surfaces. **Adapt changes the organism. Terraform changes the environment around the organism.** A Terraform preview must never imply that Terraform changes plant anatomy.
- **K6. Compact floating global action launchers** at Concept-4 scale: easy to find, never oversized.
- **K7. One compact heatmap / lens control** that opens on demand, with the active lens always obvious.
- **K8. Persistent Pause / Play and speed** (1× → 2× → 4× → 1×, as in the real game). Compact but easy to find. No 0.5×.
- **K9. Map geometry rule.** Overlay by default. A map push or side-shift is allowed only for a genuinely column-scale workflow (Regions browser, deep upgrade browser). It happens once per open or close, never per click, and two columns never squeeze the map at the same time.

## 2. What Round 2 is

Four **variations inside the narrowed direction**, numbered 5–8 so Round 1 stays intact. All four share these elements:

- **The same live HUD:**
  - Biomass, visually dominant, with its rate;
  - bloom coverage with the 70% goal marker;
  - Dying World pressure;
  - a Climate word (Terraform unsettles it);
  - a **"⚠ N need help"** chip that opens the Regions browser;
  - **Pause / Play** and **speed** (1× / 2× / 4×).
  While paused, the map desaturates slightly and a "Paused · press to resume" flag appears.
- **The same region-information families**, a medium specimen in the popup, one-click fixes for the limiting factor, colony focus (Balanced / Roots / Leaves / Seeds) and a local upgrade.
- **Previews on the real map.** Hovering or focusing a card or fix draws **+ opens** and **− harder** on the planet, a planet tint for Terraform, and seed paths for Spread.
- **The specimen rule.**
  - An Adapt or Spread preview changes the plant and highlights the changed part.
  - A Terraform preview reuses the current plant drawing unchanged, swaps only the sky, weather and soil, and labels it **"PLANT UNCHANGED"**.
  - QA checks this by comparing the plant layers before and after the preview: identical for Terraform, different for Adapt.
- **Map clicks while an upgrade surface is open set the specimen context** ("Your plant in Cloud Steps") instead of opening the popup.

What each concept deliberately varies:

| Question | C5 Rich popover | C6 Floating sidecar | C7 Bottom workbench | C8 Side workbench |
|---|---|---|---|---|
| Region inspection | Large **anchored popover** beside the region, arrow, top tabs Overview / Colony / Science | Medium-large **sidecar docked at the map edge away from the region**, dashed **leader line**, pill tabs Conditions / Colony / Details / Nearby | **Anchored popup** with large **icon tab-buttons down its side** (Conditions / Colony / Science) | **Anchored popup** with **segmented** tab buttons |
| Adapt / Spread / Terraform | Small floating launcher pill → **palette overlapping the lower map** | Vertical launcher cluster → **floating card stack** over the map | Launcher pill → wide **bottom workbench** over the lower map, with **👁 Peek** | Launcher cluster → **one right-hand side workbench** (reframes the map once) |
| Regions browser | **Left column that pushes the map**, grouped Blocked / Strained / Thriving with filter chips | **Left column that pushes the map**, **triage matrix** (✓ ! ✕ per Temperature / Water / Soil / Hazard) | **Workbench tab**: three-column **triage board** | **Workbench tab** (same column as upgrades): sortable list + top-earners line |
| Lens / heatmap | **"◐ Map view ▾"** button → small menu | Small **round ◐ tool** in the map-tools corner → flyout | **"◐ Lens"** button → expands into a compact **segmented strip** only while in use | **"Lens: Plants ▾"** dropdown inside the map toolbar, with a one-line hint per lens |
| HUD layout | Floating glass strip, top-left. Clock top-right | One floating capsule, top-centre, clock included | Fixed top bar | Fixed top bar |

### Concept 5 — Rich region popover (start here)
The most direct reading of the review: Concept 4's spatial popup, made large and tabbed, plus Concept 2's information.
- **Popover.** About 450 px wide. It shows immediately: the region specimen, status chips (stand %, Biomass/s), a "Holding it back" banner, fix buttons labelled Adapt or Terraform, four condition tiles, stand density and share of income.
- **If space is tight** (for example, Regions open at 1024 px), the popover narrows to as little as 372 px before it would cover the region.
- **Palette.** Specimen, cards and a sticky "on the planet" effect list with clickable region chips that flash the region on the map.
- **Tests:** is an anchored popover enough for routine inspection without a drawer?

### Concept 6 — Floating sidecar
- **Sidecar.** The region card is detached. It docks on the side of the map **away from** the selected region, so the region stays visible, and a leader line ties the card to the region. It flips sides as you select regions on the other half of the map.
- **Card stack.** Actions open a narrow stack of full-description cards beside the vertical launcher.
- **Matrix.** The Regions matrix shows every region's four conditions at a glance.
- **Tests:** does a detached card read as contextual, or does it start to feel like the old permanent sidebar? Does side-flipping help or distract?

### Concept 7 — Context + bottom workbench
- **Split between looking and changing.** The popup is for inspection only. All changes happen in a bottom workbench (about 47% of the map height, capped at 384 px) that **overlays** the lower map.
- **The map never moves in this concept.**
- **Workbench content.** Large cards with descriptions, a specimen and an effects column. **👁 Peek** hides the workbench contents so you can see the planet underneath.
- **Regions.** Regions is a workbench tab: a Blocked / Strained / Thriving board. Picking a region closes the workbench and opens its popup.
- **Answers:** *"Can we get enough room for meaningful strategy cards without losing the feeling that decisions are made on the planet?"* The cards are roomy and the top half of the map shows previews live. The cost is that southern regions are hidden while it is open; Peek and the region chips mitigate this.

### Concept 8 — Context + side workbench
- **One column.** Regions, Adapt, Spread and Terraform share **one** right-hand column. Opening it reframes the map **once**. Switching tabs inside it never moves the map. Closing it restores the map exactly. There is never a second column.
- **Popup.** Routine inspection stays an anchored popup. It can sit beside the workbench while browsing Regions; opening an upgrade tab closes it and keeps the selection as context.
- **Tests:** is one deliberate reframe acceptable for deep workflows, compared with an overlay?

## 3. Map-geometry behaviour for every surface

**A** = overlays the map without changing its geometry. **B** = intentionally shifts or reframes the map because the workflow earns a full column (one slide on open, one on close). **C** = must never coexist with another major panel. Opening it closes the other, and the region selection stays as context.

| Surface | C5 | C6 | C7 | C8 |
|---|---|---|---|---|
| Region popup / inspector | **A** | **A** (edge sidecar) | **A** | **A** |
| Lens control + legend | **A** | **A** | **A** | **A** |
| Pause / speed, HUD, launchers | fixed | fixed | fixed | fixed (launchers ride with the map zone) |
| Adapt / Spread / Terraform | **A** palette · **C** with popover and Regions column | **A** card stack · **C** with sidecar and Regions column | **A** workbench · **C** with popup | **B** side workbench · **C** with popup (upgrade tabs only) |
| Regions browser | **B** left column (≈364 px); coexists with the popover | **B** left column (≈384 px); coexists with the sidecar; **C** with the card stack | **A** workbench tab; **C** with the popup (a pick closes the workbench) | **B** same workbench column; coexists with the popup |
| Switching region → region | **A** | **A** (sidecar may flip side) | **A** | **A** |
| Switching tabs inside a workbench | — | — | **A** | **A** (no second move) |

**Measured, not assumed.** `docs/evidence/bloom-018/qa-results.json` → `geometry` records the map's bounding box before and after each surface, at every viewport. Every A surface left the map within 1 px. Every B surface moved it only on open and close. Closing everything restored the original box exactly. Picking a region from an open browser never moved the map a second time.

## 4. Suggested owner review order

1. **Concept 5** (about 5 minutes):
   - click Frost Ridge, Marsh Low and Mossy Basin;
   - use all three tabs, and in Colony try Roots / Leaves / Seeds;
   - in the popover, hover ❄️ Cold Tolerance and then ☀️ Warm the Sky, and compare the plant with the sky;
   - open each launcher;
   - try Map view ▾, Regions, Pause and the speed button.
2. **Concept 7**: is the extra room in the bottom workbench worth covering the lower map? Try Peek.
3. **Concept 8**: does one deliberate side reframe feel better or worse than an overlay?
4. **Concept 6**: anchored popover or edge sidecar with a leader line?
5. **Pick and mix**, for example "C5 popover + C7 workbench + C6 matrix + C8 lens dropdown". The four concepts share components, so any mix is cheap to mock next.

Questions to answer while reviewing:
- Can I always see something changing and something I could decide?
- Is Pause / speed found without searching?
- Is the popup big enough without "More"? Too big?
- Which upgrade surface (palette, stack, bottom workbench, side workbench)?
- Which Regions treatment (grouped list, matrix, triage board, sortable list)?
- Which lens treatment is easiest to find and to turn off?
- Did the map ever move when I didn't expect it to?

## 5. Known limitations (sandbox only)

- **Everything is fake.**
  - The trait effects, regions that "open", colony growth, Biomass and pressure are scripted.
  - The speed setting only changes how often the fake clock ticks.
  - The Climate word and the "need help" count come from the same fake data as Round 1.
- **iPad touch.** Hover previews have no separate touch gesture: tapping a card buys it immediately, as in Round 1, and keyboard focus previews. The production UI needs a tap-to-preview / confirm pattern. **Owner/PMO decision needed** (§6).
- **1024-px squeeze cases** (documented, not hidden):
  - C5 or C8 popup with the Regions column open: the popup narrows (to as little as 372 px in C5) or covers part of the map;
  - C6 sidecar with the Regions column open: the sidecar narrows to 344 px, leaving about half the map;
  - C7 workbench: hides the southern regions until Peek.
- **Keyboard.** Map regions are reached by Tab in document order, as in Round 1. There is no spatial arrow-key navigation between regions yet. Esc closes the top surface, and focus returns to the region or launcher that opened it.
- **Layout.** At ≤1100 px the HUD drops the Climate word to fit. Phone layouts are out of scope.
- **Browsers.** Tested in Chromium (three viewports plus reduced motion) and Firefox. WebKit / Safari was not run: the macOS 12 WebKit build used for earlier projects is no longer installed on this machine, and installing it was out of scope. The pages use no WebKit-sensitive features beyond those Round 1 already used.
- **Shared code.** `shared.js` received two small additive hooks: a pausable fake clock (`BM.clock`, default running at 1×, so Round 1 behaves exactly as before) and `map.highlight()`. Round 1 pages are otherwise untouched, and QA re-checks that they still load and work.

## 6. Needs owner / PMO attention

1. **Pick and mix:**
   - inspection: anchored popover (C5/C7/C8) or edge sidecar (C6);
   - upgrade surface: palette, stack, bottom workbench or side workbench;
   - Regions treatment;
   - lens treatment.
2. **Should the region popup coexist with an open upgrade surface?** Every concept currently closes it and keeps the selection as the specimen's context. Leaving both open crowds a 1024-px screen.
3. **Touch purchase pattern** for iPad: tap to preview, then tap again or press a Buy button.
4. **Should the sidecar's side-flipping** (C6) stay, or should it always dock on one edge?

## 7. Evidence and QA

- **Screenshots (1280×800)** in [`docs/evidence/bloom-018/`](evidence/bloom-018/):
  - `00-gallery-round2.png`, `00-gallery-round1.png`;
  - per concept N = 5–8:
    - `cN-1-run` normal run view;
    - `cN-2-region` region popup;
    - `cN-3-colony` colony focus with a Roots preview;
    - `cN-4-adapt` and `cN-4-terraform` action workflow with a map preview;
    - `cN-5-paused` Pause;
    - `cN-6-lens` heatmap;
    - `cN-7-regions` Regions browser;
    - `cN-8-regions-pick` browser plus popup;
  - `c7-9-peek`.
- **QA driver:** [`docs/evidence/bloom-018/qa-ui-mockups-r2.js`](evidence/bloom-018/qa-ui-mockups-r2.js). Run it with `NODE_PATH="$(npm root -g)" node docs/evidence/bloom-018/qa-ui-mockups-r2.js [--shots] [--firefox]`. Results are written to `qa-results.json`. It checks:
  - the gallery's Round 1 / Round 2 switching (default, arrow keys, return from a concept to the right round, hidden-panel links not tabbable);
  - a Round 1 smoke test of Concepts 1–4;
  - Concepts 5–8 at 1280×800, 1024×768 and 1440×900, plus reduced motion and Firefox:
    - HUD;
    - Pause and speed;
    - several regions;
    - every tab;
    - colony focus;
    - lens switching;
    - Regions browser and picking a region from it;
    - Adapt / Spread / Terraform previews on the real map;
    - a fake purchase;
    - the specimen rule;
    - map geometry per surface;
    - Esc and focus return;
    - keyboard region selection and tab arrows;
    - Tab walks with no hidden, transparent or ring-less stops;
    - no horizontal scroll;
    - no external requests;
    - no console errors.
