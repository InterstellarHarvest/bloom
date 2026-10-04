# BLOOM — UI concept review v5: Concept 10 top-banner tool access (BLOOM-021)

**For:** the owner and PMO, for the next step of the UI design-reference review ([`VISUAL_DIRECTION_v1.0.md`](VISUAL_DIRECTION_v1.0.md) §10), and for whoever later builds the production run screen.

**Open:** [`demos/ui-mockups/index.html`](../demos/ui-mockups/index.html) in a browser (works over `file://`, no build step). It opens on the **Refinement** tab. Then use **Open Concept 10 →** and choose **3 · Top banner** in the striped ribbon. A direct link is `demos/ui-mockups/concept-10-refined-bench.html?tools=top`; add `&labels=icons` for the icons-only treatment.

> **Still a visual concept mockup.** Every number, region, trait effect, colony change and plant drawing is scripted (`demos/ui-mockups/shared.js`, `r2.js`, `c10.js`). The page never loads or calls the engine, generator, validators, scenarios, balance data or Bloom Report. Pause and speed only control the mockup's fake clock. Icons, colours, fonts and art are placeholders, not proposals. The live run screen, the player flow (root `index.html`) and all gameplay files are unchanged. **The production UI is not locked by this document.**

## 1. Where we are

The owner reviewed Concept 10 (BLOOM-020, [`UI_CONCEPT_REVIEW_v4.md`](UI_CONCEPT_REVIEW_v4.md)):

> "10 is good. but lets explore adding the controls to the top banner between the info and the pause/speed buttons? make it another choice for 10?"

- **Concept 10 is broadly liked.** Its structure is treated as approved for this comparison:
  - one right-side, top-aligned, content-height workbench;
  - Region details in tabbed layout A;
  - one map reframe when it opens, and zero geometry changes while it is open;
  - map click → Region;
  - re-targeting "Considering for" in Adapt / Spread / Terraform;
  - Map View preview and commit.
- **Not reopened:** Region layouts B / C, popups, bottom workbench, full-screen takeovers, a permanent large specimen, the word "Lens".

## 2. Why this is a third choice, not Concept 11

The owner asked one focused question: *where do the tools live?* Everything else in Concept 10 stays the same. So BLOOM-021 adds a third option to Concept 10's existing review-only **Tool access** switch. It does not fork a new concept. All three choices run on the same page, with the same workbench, modes, data and geometry. Switching between them keeps:

- the selected region;
- the open mode;
- the committed Map View;
- whether the workbench is open or closed.

The map never moves on a switch (measured, §8). That makes the three choices a fair side-by-side comparison.

## 3. The three tool-access choices

All three operate the **same** unified workbench. Only one mode is active at a time, and the workbench header always names it (e.g. "CHANGE · YOUR PLANT / Adapt your plant").

| | 1 · Attached dock | 2 · In-panel navigation | 3 · Top banner (new) |
|---|---|---|---|
| Where the tools are | short Explore / Change stack joined to the panel's right edge | Explore / Change row inside the panel header | two small Explore / Change groups in the top HUD, between status and Pause / speed |
| Tools | Region, Regions, Map View · Adapt, Spread, Terraform | same six | Regions, Map View · Adapt, Spread, Terraform (no Region button, §6) |
| Workbench closed | small floating dock over the sea corner | small 🧰 Tools opener over the sea corner | **nothing over the planet** |
| Open from closed | one press on the tool | Tools opener, then the tool (two presses unless it is the last tool) | one press on the tool |
| Press the active tool again | closes | nothing (close with ✕) | closes |
| Closed, how far is Adapt? | one press, right side | two presses | one press, top band |
| Main cost | something always floats over the map | an extra step from closed | top band gets busier; status card a little narrower at ≤ 1359 px |

### 3.1 Attached dock (1)
Unchanged from BLOOM-020 (v4 §3). A dock 70–78 px wide sits beside the panel and stays as a floating stack when the panel is closed.

### 3.2 In-panel navigation (2)
Unchanged from BLOOM-020 (v4 §3). The tools are inside the panel, so a closed workbench needs a Tools opener.

### 3.3 Top banner (3)
- **Order:** game status → tool controls → Pause / speed. The planet name stays at the far left at desktop widths.
- **Two groups:** **Explore** (🗂 Regions, 🗺️ Map View) and **Change** (🌿 Adapt, 🌱 Spread, 🌍 Terraform). Each group is a small segmented track with a tiny caption above it.
- **No outer capsule.** A first version boxed both groups in a card, but that card was as tall as the status card (76 px) and competed with it. Without the box the tools are 62–64 px tall and read as quieter HUD controls.
- **Same signals as the other variants:**
  - the Regions "need help" badge;
  - the Map View button shows the committed view's icon plus a gold dot.
- **Active tool:** inverted dark fill **and** a small notch pointing down at the workbench (`aria-pressed="true"`). The shape cue means the state does not rely on colour.
- **Tooltips** (custom, not the browser's):
  - hover shows after 280 ms; moving along the bar switches at once; keyboard focus shows immediately;
  - content is the name, what the tool does, and its state, e.g. "Map View · Colour the map by temperature, water, soil or hazard · Showing Soil", or "Open · press again to close";
  - Esc hides a showing tooltip without moving focus or closing anything; a second Esc closes the workbench as usual.
- **Labels review switch:** a second ribbon switch, **Labels: Icon + text / Icons only** (`?labels=text|icons`, remembered as `bloomC10Labels`). It appears only while 3 · Top banner is chosen.

## 4. Top-banner hierarchy rules (as built and checked)

1. **The status card reads first.** It is the widest and tallest block in the band (QA: at least 1.5× the tool group's width, and taller).
2. **Biomass stays the strongest number.** It keeps 42 px at desktop and 36 px at ≤ 1100 px, the same as the other two variants. QA checks it is ≥ 1.5× every other banner number and ≥ 3× the tool label size.
3. **The tools are quieter than the status:**
   - 11 px labels, emoji icons, pale tracks;
   - no border or shadow of their own;
   - 62–64 px tall against the status card's 72–76 px.
4. **Pause / speed is unchanged and stays at the far right** (≤ 16 px from the edge, QA). It is still its own card.
5. **Only space-saving changes to the status card**, and only in this variant. The two progress bars get shorter as the window narrows. At ≤ 1100 px two small captions are shortened (§5). Dock and in-panel keep the BLOOM-020 banner exactly.

**Measured** (Chromium; Firefox within 2 px). "Info" is the status card. Dock and in-panel are shown for comparison.

| Viewport | Variant | Band (w × h) | Info | Tools | Pause / speed | Tool labels |
|---|---|---|---|---|---|---|
| 1440 × 900 | top | 1440 × 86 | 727 × 76 | 296 × 64 | 170 × 56 | icon + text (buttons 50 × 46) |
| 1440 × 900 | top, icons only | 1440 × 86 | 727 × 76 | 246 × 62 | 170 × 56 | icons (44 × 44) |
| 1440 × 900 | dock / panel | 1440 × 86 | 727 × 76 | — | 170 × 56 | — |
| 1280 × 800 | top | 1280 × 86 | 641 × 76 | 296 × 64 | 170 × 56 | icon + text (50 × 46) |
| 1280 × 800 | top, icons only | 1280 × 86 | 641 × 76 | 246 × 62 | 170 × 56 | icons (44 × 44) |
| 1280 × 800 | dock / panel | 1280 × 86 | 727 × 76 | — | 170 × 56 | — |
| 1024 × 768 | top (either switch) | 1024 × 82 | 495 × 72 | 243 × 62 | 162 × 56 | icons (44 × 44), automatic |
| 1024 × 768 | dock / panel | 1024 × 82 | 618 × 72 | — | 162 × 56 | — |

The band height is the same in all three variants (86 / 82 px), so the top banner variant costs **no** map height.

## 5. 1024 px behaviour (and the bands in between)

A sweep checks every 16 px from 1024 to 1600, in both label modes (74 widths). At every width: no overlap (≥ 6 px between blocks), no horizontal scroll, the review ribbon fits, Pause / speed sits at the right end, and the band is ≤ 90 px.

| Width | Tools | Status card | Ribbon |
|---|---|---|---|
| ≥ 1360 px | icon + text (or icons if chosen) | unchanged: bars 196 / 150 px | full labels |
| 1200–1359 px | icon + text (or icons) | bars 140 / 104 px, section padding 13 px | full labels |
| 1101–1199 px | **icons only, automatically** | bars 120 / 76 px, padding 11 px | short labels ("1 Dock · 2 In-panel · 3 Top", "Text · Icons") + an "icons at this width" note |
| ≤ 1100 px (1024 iPad landscape) | icons only, 44 × 44 touch targets | bars 104 / 78 px, padding 9 px; Biomass 36 px as in the other variants; captions "of the land · goal 70%" → **"goal 70%"** and "of the air lost" → **"air lost"**; Pause button 76 px min | short labels + "auto" |

**What changes at 1024, exactly:**
- tool **labels** become visually hidden. Each button keeps its icon, its accessible name (e.g. "Adapt: change your plant") and its tooltip;
- the two progress bars are shorter;
- two secondary captions lose their leading words.

Every number stays, and so do the climate word, the living-region count, both bars, all five tools and both Pause and speed. **No tool is removed at any width.**

## 6. Region-button decision

**There is no Region button in the top banner** (the brief's preferred model). Region is still always reachable:
- **clicking any region on the map opens Region mode.** This is the main path, and it works from closed as well;
- **from Adapt / Spread / Terraform:** the context bar's **📍 Details** button, or clicking the already-selected region again;
- **from Regions:** clicking a row;
- **from Map View:** clicking the selected region again (or any region).

When Region mode is open from the map, **no top tool is pressed**. The workbench header makes the mode obvious: a dark 📍 tile, "EXPLORE · REGION" and the region's name.

**Trade-off.** Dock and in-panel have a Region tool, so the player can return to "the region I was looking at" with one press from any mode. The top banner loses that one-press return from Regions or Map View: the player clicks the region on the map instead (it is still outlined there). In exchange, the banner saves a button (about 52 px at desktop, 46 px at 1024), and "Region" stops looking like a tool you open from nowhere. With nothing selected, the dock and in-panel Region buttons are greyed out and can only show a hint. Implementation gave no strong evidence that Region needs a banner button, so none was prototyped. If the owner wants one, it would fit at ≥ 1200 px. At 1024 it would need about 50 px taken from the status card.

## 7. Closed-state map cleanliness

This is the main advantage being tested. In 3 · Top banner with the workbench closed:
- **nothing floats over the planet.** There is no dock and no Tools opener. QA checks that every child of the bench layer is hidden and that the map zone fills the whole world area;
- all five tools stay one press away in the banner;
- a direct region click still opens Region mode with the one reframe.

The other two choices each leave one object over the sea corner while closed. They cover no region at the tested sizes (BLOOM-020), but a differently shaped planet could reach that corner. Compare `c10-01-run-top.png` with `c10-01-run-dock.png` / `c10-01-run-panel.png`.

## 8. Workbench and geometry behaviour (measured)

The geometry is instrumented as in BLOOM-019 / 020: a ResizeObserver on the map SVG and a counter for workbench open / close flips. In **every** run (3 variants × 3 viewports, reduced motion, Firefox):

| | 1440 × 900 | 1280 × 800 | 1024 × 768 |
|---|---|---|---|
| Map closed (x, y, w, h) | 16, 140, 1408, 744 | 16, 140, 1248, 644 | 16, 136, 992, 616 |
| Map open | 16, 140, 854, 744 | 16, 140, 726, 644 | 16, 136, 530, 616 |
| Opening from closed | one reframe, one open flip | same | same |
| Region → region (5 clicks) | 0 resizes, 0 flips | 0 / 0 | 0 / 0 |
| Region → Regions → Map View → Adapt → Spread → Terraform → Region | 0 / 0 | 0 / 0 | 0 / 0 |
| Tool-access switches while open (to each other variant, Region and Adapt; 8 switches) | 0 / 0 | 0 / 0 | 0 / 0 |
| Adapt / Spread / Terraform re-targeting, Details, Clear | 0 / 0 | 0 / 0 | 0 / 0 |
| Map View preview / commit | 0 / 0 | 0 / 0 | 0 / 0 |
| Closing | exact restore | exact restore | exact restore |

The open map box is identical in all three variants: they reserve the same column (`--res`), and the top-banner panel uses the in-panel panel's width and position. The top-banner panel is one rounded card at the window edge.

Behaviour retained from BLOOM-020, all re-checked in the top banner:
- top tools open and switch the workbench;
- pressing the active top tool closes it;
- while Adapt / Spread / Terraform is open, a map click on another region changes "Considering for", stays in the mode and moves nothing;
- Map View hover / focus previews, leaving restores, click commits, and the committed view persists across modes;
- Pause / speed work.

Keyboard:
- Tab order is ribbon → top tools → Pause / speed → map → workbench;
- a top tool opened with the keyboard moves focus into the workbench;
- Esc closes and returns focus to the top tool that opened it (or the region, if the map opened it);
- Tab walks never land on hidden controls or another variant's controls.

## 9. Icons and text, or icons only?

The owner asked whether text is needed or whether icons plus a hover tooltip would do. Both are built: the ribbon's **Labels** switch flips them live.

**Recommendation: icon + text wherever it fits. Icons only only when it has to, with tooltips as the backup.**
- **The verbs are the game's vocabulary.** "Adapt / Spread / Terraform" is exactly the distinction middle-schoolers are learning (change yourself vs how you travel vs the planet). A label teaches it on every glance. A tooltip teaches it only to players who hover.
- **The placeholder icons don't separate the three Change tools well.** 🌿 / 🌱 / 🌍 are two plants and a globe. Final pixel icons could fix this, but only if they are drawn to be told apart at 20 px.
- **Tooltips need a mouse.** On an iPad there is no hover, and keyboard focus tooltips do not help touch either. The width that forces icons only (1024, iPad landscape) is the width where tooltips work least. A wrong tap there is cheap, though: the workbench opens with the mode named in its header, and tapping again closes it.
- **The cost of text is small:** 50 px of band width at desktop (296 vs 246 px). The status card already gives up 86 px at 1280 for the tools either way.

If the owner prefers the cleaner icons-only look at every width, the only change is to the default. The tooltips, accessible names and 44 px targets are already in place.

## 10. Owner comparison questions

Suggested pass: open Concept 10, then switch **1 → 2 → 3** with the workbench closed, then open, then closed again.

- **Q1.** **Attached dock (1), in-panel navigation (2) or top banner (3)?** Or a mix, for example the top banner plus an attached Region shortcut?
- **Q2.** In 3, does the top band still read **status first**, or does it now feel busy? Is the narrower status card at 1280 (bars shortened) acceptable?
- **Q3.** **Icon + text or icons only** in the top banner (§9)? At 1024 it is icons only either way. Is that acceptable for iPad?
- **Q4.** Is it fine that **Region has no top-banner button** (§6), with map click, Details and Regions rows as the ways in?
- **Q5.** Does a **clean planet with nothing floating over it** (3, closed) matter enough to choose 3 over the dock?
- **Q6.** Should **pressing the active tool close the workbench** (dock and top banner do; in-panel does not)?
- **Q7.** At 1024, are the shortened captions ("goal 70%", "air lost") clear enough?
- **Q8.** With the Q1 choice made, is Concept 10 close enough to be the **production direction**, so the next step is a production UI plan rather than another mockup?

Still open from v4 and v3: keep map-click re-targeting (v4 Q2), the reserved empty column below a short panel (v4 Q5), and the touch purchase pattern (v3 §12).

## 11. Known limitations (sandbox only)

- **Everything is fake.** This includes Biomass, coverage, pressure, trait effects, the "need help" count and colony growth.
- **Tooltips are pointer and keyboard only.** There is no long-press tooltip for touch yet (§9).
- **Emoji icons are placeholders.** At ≤ 1199 px tool identity rests on them, so final icons must be designed to read at 20–21 px.
- **The review switches are mockup chrome.** Below 1200 px they show short words, and below 1200 px the Labels switch's "Text" option has no visible effect (the ribbon says so).
- **Below 1024 px** (phones, portrait tablets) is out of scope and was not designed. The sweep starts at 1024.
- **Top-banner Map View button** shows the committed view as its icon and a gold dot, with no text. The full name is in its tooltip and accessible name.
- **Browsers.**
  - Tested in Chromium (1280 × 800, 1024 × 768, 1440 × 900, reduced motion) and Firefox (1280 × 800, 1024 × 768).
  - WebKit / Safari was not run: no compatible Playwright WebKit build is installed on this macOS-12 machine.
- **Shared code.**
  - BLOOM-021 changed **no shared file**: `shared.*`, `r2.*` and `c9.*` are byte-identical.
  - Only Concept 10's own files (`concept-10-refined-bench.html`, `c10.js`, `c10.css`) and the gallery changed.
  - The dock and in-panel variants look and behave as in BLOOM-020. The only exception is the review ribbon: short labels now start below 1200 px (was 1100), and the long ribbon hint shows only at ≥ 1700 px, so three switch buttons fit.

## 12. Evidence and QA

- **Screenshots** in [`docs/evidence/bloom-021/`](evidence/bloom-021/), 1280 × 800 unless noted. Every 1280 state exists for all three variants (`-dock`, `-panel`, `-top`) so they can be compared side by side:
  - `c10-01-run-*.png`: workbench closed (top: nothing over the planet);
  - `c10-03-region-tabbed-*.png`: Region (Marsh Low), opened from the map;
  - `c10-08-regions-*.png`: Regions;
  - `c10-05-mapview-short-*.png`: Map View;
  - `c10-06-adapt-retarget-*.png`: Adapt after re-targeting to Dust Reach;
  - `c10-07-terraform-*.png`: Terraform, Warm the Sky previewed;
  - `c10-12-1024-closed-*.png`, `c10-12-1440-closed-*.png`: closed at 1024 × 768 and 1440 × 900;
  - `c10-09-1024-region-*.png`, `c10-13-1024-open-region-top.png`, `c10-10-1024-adapt-*.png`: 1024 with the workbench open;
  - `c10-11-1440-mapview-preview-*.png`: 1440 Map View with a preview;
  - `c10-21-top-tooltip.png`: a top-banner tooltip; `c10-22-top-icons-only.png`: the icons-only treatment at 1280;
  - `00-gallery-refinement.png`: the gallery card describing all three choices.
- **QA driver:** [`docs/evidence/bloom-021/qa-ui-mockups-c10.js`](evidence/bloom-021/qa-ui-mockups-c10.js), extended from the BLOOM-020 driver. Run it with `NODE_PATH="$(npm root -g)" node docs/evidence/bloom-021/qa-ui-mockups-c10.js [--shots] [--firefox]`. Results go to `qa-results.json`, including `banner` (every measurement above) and `sweep`.
- **Result: 2099 / 2099 checks pass.**
  - Gallery: 13 checks.
  - Concepts 1–9 regression smoke: 9.
  - Top-band sweep: 3.
  - No external requests: 1.
  - Concept 10: 3 variants × (1280, 1024, 1440, reduced motion, Firefox 1280 and 1024) = 18 runs of 108–127 checks each (dock 110–112, in-panel 108–110, top banner 125–127). They cover:
    - the 17 items in the BLOOM-021 brief;
    - the measured geometry, panel heights and banner boxes;
    - tooltips, the icons-only switch and the pressed-state notch;
    - keyboard open / switch / close / Esc focus return for each variant;
    - Tab walks with the workbench closed and open;
    - no horizontal scroll, no console errors, no external requests.
- **Earlier drivers**, re-run from scratch copies (Chromium + Firefox) so their committed evidence is untouched:
  - **BLOOM-020 Concept 10 driver: 1279 / 1279.** Dock and in-panel still pass every BLOOM-020 check, including the centred banner, the ribbon switch and all geometry.
  - **BLOOM-019 Concept 9 driver: 518 / 521.** These are the same three failures as at BLOOM-020: its gallery checks expect Convergence to be the default tab and expect three tabs to wrap. Every Concept 9 behaviour check passes.
