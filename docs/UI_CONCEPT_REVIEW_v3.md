# BLOOM — UI concept review v3: convergence (BLOOM-019)

**For:** the owner and PMO, for the next step of the UI design-reference review ([`VISUAL_DIRECTION_v1.0.md`](VISUAL_DIRECTION_v1.0.md) §10), and for whoever later builds the production run screen.

**Open:** [`demos/ui-mockups/index.html`](../demos/ui-mockups/index.html) in a browser. It works over `file://` with no build step and opens on the new **Convergence** tab. Round 2 (Concepts 5–8, [`UI_CONCEPT_REVIEW_v2.md`](UI_CONCEPT_REVIEW_v2.md)) and Round 1 (Concepts 1–4, [`UI_CONCEPT_REVIEW_v1.md`](UI_CONCEPT_REVIEW_v1.md)) are one tab away and unchanged.

> **Still a visual concept mockup.** Every number, region, trait effect, colony change and plant drawing is scripted (`demos/ui-mockups/shared.js`, `r2.js`, `c9.js`). The page never loads or calls the engine, generator, validators, scenarios, balance data or Bloom Report. Pause and speed only control the mockup's fake clock. Prices, icons, colours, fonts and art are not proposals. The live run screen (`demos/demo-run.html`), the player flow (root `index.html`) and all gameplay files are unchanged. **The production UI is not locked by this document.**

BLOOM-019 is not another broad round. It is **one convergence prototype**, Concept 9, built from Concept 8 to answer one question:

> *How should a unified right-side workbench behave when Region inspection, Regions browsing, Map View, Adapt, Spread and Terraform all share it?*

## 1. Owner findings from the Round 2 review (BLOOM-018)

The owner reviewed Concepts 5–8 by hand.

**Rejected or asked to change:**
- **Adapt / Spread / Terraform surfaces that cover the map** (Concepts 5 and 7). They covered so much of the map that hover previews on the real map became much less useful.
- **Map-covering region popups** (Concepts 5–8). A popup could hide neighbouring regions completely. A hidden region could not be clicked, and sometimes the player could not even see that it existed.
- **Concept 8's scattered controls.** Regions and Lens sat at the top right while Adapt / Spread / Terraform sat at the bottom right. The two groups did not read as one system and could be consolidated.
- **The word "Lens".** It is not necessarily the right player-facing word.
- **A thin top bar.** The status information should be larger, more centred and more intentional.

**Liked:**
- Concept 8's **side workbench**, including a deliberate map shift / reframe for a real workbench;
- keeping the **actual map visible** while making decisions;
- **Concept 2-style Regions browsing and triage**;
- **map heatmaps**;
- **contextual plant visuals** rather than a permanent giant specimen;
- **Pause / speed placement** as it was.

**Asked for next:** hovering over a map-view choice should preview its effect on the map, and Region inspection should use **the same right-side workbench** as the other major tools.

## 2. Why map-covering region popups are rejected

Region inspection is a **comparison** task: players click one region, then the next, then the next. A popup anchored beside a region sits on top of the neighbouring regions, which are exactly the ones the player is likely to want next. The owner saw three failures in Round 2:

1. a neighbouring region was **hidden** under the popup;
2. a hidden region **could not be clicked** without closing the popup first;
3. the player sometimes **could not tell another region existed** behind it.

Concept 6's edge sidecar and Concept 5's narrowing popover reduced the problem but did not remove it. In Concept 9, region details live in the workbench beside the map, so **no region is ever covered** by its own details. QA confirms this: every region click is made at a point where the region is the top element (§12).

## 3. Why map-covering Adapt / Spread / Terraform surfaces are rejected

Upgrade previews are drawn **on the real map**: **+** where land opens, **−** where it gets harder, a planet tint for Terraform, seed paths for Spread. A palette (C5) or bottom workbench (C7) that covers the lower map hides some of those marks, and that is the moment the player most needs to see them. C7's 👁 Peek was a workaround, not a fix. In Concept 9 the upgrade surfaces sit **beside** the map, so every highlighted region stays visible. QA checks that the centre of every + / − mark is on the uncovered map.

## 4. Why Concept 8 is the convergence base

Concept 8 was the only Round 2 concept where:
- a deep workflow **never covered** the map;
- the map moved **exactly once** on open and once on close, with **no** movement between tabs;
- Regions and all three upgrade boards already **shared one column**.

Its problems were all fixable without changing that core: the region popup still covered the map, the controls were scattered, and the heatmap control was called "Lens". Concept 9 keeps the core and fixes those three things.

## 5. The unified workbench model

- **One** right-side workbench with **six modes**: **Region · Regions · Map View · Adapt · Spread · Terraform**.
- **Only one mode is active at a time.** The header always says which mode is active (icon + "Region", "Explore · Regions", "Change · the planet" and so on), and the matching rail tool is pressed.
- **No region popup. No bottom workbench. No full-screen takeover. No permanent giant plant.**
- **Clicking a map region:** selects and outlines it → opens the workbench if it is closed → switches to **Region** mode → shows that region.
- **Clicking another visible region** while Region mode is open updates the workbench **in place**: no close / reopen, no map movement, nothing to dismiss, no detour through a Regions menu. The header flashes once (not under reduced motion) and a polite screen-reader message names the new region.
- **The selected region keeps a clear outline** in every mode (thicker white stroke with a dark marching dash and a soft shadow).
- **Region mode content** replaces the old popup and shows, without any "More" disclosure: region name, colony status, stand density / establishment, the limiting factor ("Holding it back"), Temperature / Water / Soil / Hazard, Biomass contribution, Roots / Leaves / Seeds focus, local specialization, relevant Adapt / Spread / Terraform suggestions, and a **medium contextual specimen**. It is organised three ways for review (§10).
- **Suggestions are live previews.** Hovering or focusing a suggestion such as "❄️ Cold Tolerance · ADAPT" draws its effect on the map and on the specimen. Pressing it switches the workbench to Adapt with that card focused and the region kept as context. The map does not move.
- **Region context during upgrades.** After Region → Adapt / Spread / Terraform, the selected region stays outlined and a context bar reads **"📍 Considering for Frost Ridge"**, with its status and a **✕ Clear** button. Cards that would open it get a small **"📍 helps Frost Ridge"** tag, and cards that would make it worse get **"− harder for Frost Ridge"**. On hover, a verdict line says what the card does for that region *and elsewhere*, for example "✓ Would open Frost Ridge, plus 1 more region on the map." The Adapt specimen shows the plant in that region's environment.
- **Keeping global upgrades global.** The context bar always carries **"🌍 Global upgrade: it applies everywhere, not only here."** The map preview still marks **every** affected region, and the verdict always counts regions elsewhere. When no region is selected, the bar just says upgrades are global.
- **The specimen rule is unchanged. Adapt changes the organism. Terraform changes the environment around it.** A Terraform preview reuses the current plant drawing and swaps only the sky, weather and soil, and it is labelled **"PLANT UNCHANGED"**. QA compares the plant layers before and after: they are identical for Terraform and different for Adapt, in the Region workbench and in the boards.
- **Closing:** ✕ or Esc closes the workbench, restores the map, clears the selection and returns focus to whatever opened the current mode (the region or the rail tool). A committed Map View stays on.

## 6. The consolidated Explore / Change tool system

Concept 8's two clusters are replaced by **one compact tool rail** fixed at the right edge of the screen (84 px wide, 76 px at ≤1100 px):

```
EXPLORE   🗂 Regions   (badge: how many need help)
          🗺️ Map View  (shows the committed view, e.g. "Soil", plus a dot)
────────
CHANGE    🌿 Adapt      your plant
          🌱 Spread     your seeds
          🌍 Terraform  the planet
```

- **The rail never moves.** The workbench opens *between* the map and the rail, so every tool stays in the same place whether the workbench is open or not.
- **Every tool opens the same workbench.** Pressing a tool switches the workbench to that mode, and pressing the active tool again closes it.
- **The active tool** is filled dark with a small pointer into the workbench, so the two read as one object.
- **There is no Region tool.** Clicking the map enters Region mode. While Region is active, the workbench header says "Region" and offers **🗂 All regions** to jump to the browser.
- The old **"⚠ 8 need help"** HUD chip became the **badge on Regions**: one fewer control, the same information.

## 7. "Map View" replaces "Lens"

The player-facing label is **Map View** everywhere in the prototype. QA fails the page if the word "Lens" appears in the game UI (the mockup ribbon is excluded). The choices are **Plants (normal) · Temperature · Water · Soil · Hazard**. Internally the shared code still calls the overlay a lens; that is not player-facing.

## 8. Map View hover / focus preview

Map View is a workbench mode (from the rail), so the chooser takes no permanent screen space. Each choice is a card with a one-line hint and a mini strip that shows the region count per status (for example "1 ✕ 2 !").

| Action | Result on the real map |
|---|---|
| Hover **or** keyboard-focus a choice | That heatmap is **previewed** immediately. The card shows "PREVIEW · CLICK TO KEEP", and the map legend shows a dark **PREVIEW** tag with a dashed border. |
| Arrow ↑ / ↓ | Moves focus, and with it the preview. |
| Move the pointer away / move focus away | The **committed** view comes back. |
| Click / Enter / Space | **Commits** that view. The card is marked "✓ SHOWING", the rail tool shows its icon and name with a dot, and a legend chip stays on the map. |
| Commit **Plants (normal)**, or **✕ Plants** on the map legend | Removes the heatmap. |

A committed view **persists** while another mode is open, for example Soil while browsing Adapt cards. It also persists after the workbench is closed. Previews never move the map.

## 9. Top status banner

The thin toolbar became a **centred, game-style banner**: a raised plaque in the middle of the top band, 76 px tall (72 px at ≤1100 px), with the top band at 86 px (82 px).

```
[ 🌍 IN BLOOM 43% of the land · goal 70%  ▬▬▬▬|▬  5 of 10 regions living ]  [ ✦ BIOMASS 298  +4.3 / s ]  [ 💨 DYING WORLD 39% of the air lost  ▬▬  ⚡ Climate calm ]
```

- **Biomass is the strongest number**: 42 px, gold coin, centred (QA: more than 1.5× any other banner number).
- **In bloom** has the goal marker and a count of living regions. **Scenario pressure** and the **climate state** sit on the right.
- The banner is **exactly centred** on the viewport (QA: within 3 px). A balanced three-column band keeps it centred while Pause / speed stay compact on the right, unchanged as the owner asked. The left column carries the planet / scenario name and is hidden at ≤1100 px.
- While paused, the Biomass rate reads "⏸ paused".

## 10. Region workbench variants A / B / C

A small switch in the **striped mockup ribbon** ("REVIEW ONLY · REGION LAYOUT: A · B · C") changes **only** how Region mode is organised. It is clearly review chrome, not game UI.
- Switching keeps the selected region and keeps the map still.
- Each variant remembers its own tab.
- The choice is remembered on this device, and `?v=a|b|c` in the URL opens a variant directly.

| | **A · Tabbed** | **B · Dashboard + tabs** | **C · Scrolling sections** |
|---|---|---|---|
| Always visible | Medium specimen (≈128 × 150) · status · colony / stand · Biomass · focus · local upgrade · "Holding it back" · suggestions | Small specimen (≈92 × 104) · status · limit · **8-tile grid**: Temp / Water / Soil / Hazard with ✓ ! ✕ + Stand · Biomass · Focus · Local upgrade · suggestions | Jump bar: Holding back · Conditions · Colony · Plant |
| Behind tabs | **Overview** (4 condition tiles, stand density, share of income, recent) · **Colony** (Roots / Leaves / Seeds, local specialization) · **Science** (temperature gauge, measured signals, touching regions) | **Grow** (focus + specialization) · **Science** (gauge + signals) · **Nearby** (touching regions + recent) | none. One scroll: **What's holding it back** (limit + suggestions) → **Conditions** (tiles, gauge, signals) → **Colony** (chips, stand, Biomass, focus, specialization, touching regions) → **Plant** (larger specimen ≈200 px, traits, the Adapt/Terraform rule) |
| Region → region | Same tab stays open | Same tab stays open | **Scroll position is kept**, so the same section can be compared across regions |
| Intended to test | Clean and predictable | Fewer tab switches without clutter | Whether scrolling is faster than tabbing during comparison |
| Known trade-off | Colony controls one tab away | Densest; small specimen | Specimen is at the bottom: suggestion previews change it out of view (the map preview stays visible) |

The owner should compare all three by clicking 4–5 regions in a row (§13).

## 11. Exact map-geometry rules

The rules, as implemented:

1. **Default:** the map uses the full width minus the rail.
2. **Workbench closed:** normal geometry.
3. **Workbench opening:** **one** deliberate reframe. The map's right edge moves left by the workbench width in one 0.38 s slide, instant under reduced motion.
4. **Mode switching:** **zero** geometry movement. The workbench has a fixed width per viewport band (432 px; 388 px at ≤1100 px; 468 px at ≥1400 px), so changing what it shows can never resize the map.
5. **Region → Region:** **zero** movement.
6. **Region → Regions → Adapt → Terraform (and any other order):** **zero** movement after the initial open.
7. **Workbench closing:** the original geometry is restored exactly.
8. Nothing else moves the map: not Map View previews or commits, the A/B/C switch, upgrade previews, purchases, or Pause / speed.

**Measured** (`docs/evidence/bloom-019/qa-results.json` → `geometry`). The values are the map SVG box as [x, y, w, h]. A `ResizeObserver` on the map logs every size it takes. After the open finished, the log was cleared, and later steps had to add nothing. "Open transitions" counts the workbench changing between open and closed.

| Viewport | Closed | Open | Map width open | Resize events: region → region (6 clicks) | Resize events: Region → Adapt → Spread → Terraform → Map View → Regions | Open transitions after first open | Closed again |
|---|---|---|---|---|---|---|---|
| 1280 × 800 | 16,140,1164,644 | 16,140,732,644 | 63% of closed (57% of viewport) | **0** | **0** | **0** | identical |
| 1024 × 768 | 16,136,916,616 | 16,136,528,616 | 58% of closed (52% of viewport) | **0** | **0** | **0** | identical |
| 1440 × 900 | 16,140,1324,744 | 16,140,856,744 | 65% of closed (59% of viewport) | **0** | **0** | **0** | identical |

Reduced motion and Firefox (1280, 1024) gave the same boxes (Firefox's banner was 1 px wider). Regions → pick, the A/B/C switch and Map View preview / commit each also logged **0** resize events. The open transition is counted exactly once per open.

## 12. Unresolved: touch purchase pattern

**Not solved in this milestone, by instruction.**
- **Keyboard focus previews** every card, suggestion and Map View choice.
- **Mouse hover previews** them too.
- **On touch**, there is still no separate preview gesture. Tapping an upgrade card buys it immediately (as in Rounds 1–2), and tapping a Map View choice commits it, so there is nothing to preview first.

The production UI needs a decision, for example tap-to-preview then a Buy button, or press-and-hold to preview. This prototype adds no confirm system. **Owner / PMO decision still needed.**

## 13. What the owner should compare next

Suggested 10-minute pass on Concept 9:

1. **Region → region speed.** Click Frost Ridge, Ember Rise, Dust Reach, Marsh Low and Mossy Basin in a row. Do the same with **A**, then **B**, then **C** from the ribbon. *Which organisation compares fastest? Is anything missing?*
2. **One reframe.** Close and reopen the workbench a few times, then switch modes freely. *Is one slide on open acceptable now that nothing moves after it?*
3. **The rail.** *Is Explore / Change obvious? Small enough? Is the Regions badge a fair replacement for the "need help" chip?*
4. **Map View.** Sweep the pointer over the four heatmaps, then click one to keep it and open Adapt. *Does hover-to-preview, click-to-keep feel right? Is the committed view obvious enough?*
5. **Context.** With Frost Ridge selected, open Adapt and Terraform and hover cards. *Does "Considering for" help, or does it make global upgrades look local?*
6. **Banner.** *Is the centred banner the right size and weight? Is anything missing (for example a scenario timer)?*

**Specific questions for the owner:**
- **Q1.** Region layout **A, B or C** (or a mix, for example B's dashboard with C's scrolling below it)?
- **Q2.** While Adapt / Spread / Terraform is open, should a map click **switch to Region** (as now, matching the "click → Region" rule) or **only change who you are considering** and stay in the upgrade mode?
- **Q3.** Should the workbench **stay open with no selection** when the player clears the context, or close?
- **Q4.** Should the rail stay **at the outer edge** (fixed, as built) or **ride on the workbench's left edge**? Riding would move it on open, which costs the "tools never move" property.
- **Q5.** **Touch purchase pattern** (§12).
- **Q6.** Is Concept 9 close enough to become the **production UI direction**, so the next step is a production plan rather than another mockup?

## 14. Known limitations (sandbox only)

- **Everything is fake:** trait effects, "opens / harder" lists, colony growth, Biomass, pressure and climate words are scripted. Speed only changes how often the fake clock ticks.
- **Keyboard.**
  - Map regions are reached by Tab in document order. There is no spatial arrow-key navigation between regions yet.
  - Pressing Enter on a region opens Region mode but **keeps focus on the map**, so the next region is one Tab away (quick comparison). A screen-reader message announces the region.
  - The workbench content comes after the map and the review switch in Tab order. A rail tool moves focus into the workbench when activated from the keyboard.
- **Variant C.** The specimen is in the last section, so specimen previews from the suggestions happen out of view in C.
- **1024 px.** With the workbench open, the map is 528 px wide (52% of the viewport). That is usable but the smallest it gets. B's condition text wraps to two lines.
- **Browsers.** Tested in Chromium (1280 × 800, 1024 × 768, 1440 × 900, plus reduced motion) and Firefox (1280 × 800, 1024 × 768). WebKit / Safari was not run: the macOS-12 WebKit build is not installed on this machine.
- **Shared code.**
  - `r2.js` gained one additive hook: an optional `onPreview` callback in `BM2.board`. Concepts 5–8 never pass it.
  - The full BLOOM-018 round-2 QA was re-run against the changed file (Chromium and Firefox), from a scratch copy so its committed evidence is untouched. It passed **1518 / 1519**. The one failure is that driver's "gallery defaults to Round 2" check, and BLOOM-019 changes that default on purpose. Every Concept 5–8 behaviour check passed.
  - The BLOOM-019 driver also smoke-tests Concepts 1–8.
  - No other shared file changed.
- **Phone layouts** are out of scope.

## 15. Evidence and QA

- **Screenshots** in [`docs/evidence/bloom-019/`](evidence/bloom-019/), 1280 × 800 unless noted:
  - `00-gallery-convergence.png`: the gallery's new default tab;
  - `c9-01-run.png`: default run view (workbench closed);
  - `c9-02-hud.png`: the top status banner;
  - `c9-03-region-a.png`, `c9-04-region-b.png`, `c9-05-region-c.png`: Marsh Low in Variants A, B and C;
  - `c9-06-regions.png`: Regions browser, hovering a row outlines it on the map;
  - `c9-07-adapt-preview.png`: Adapt considering Frost Ridge, Cold Tolerance previewed on the map and specimen;
  - `c9-08-terraform-preview.png`: Terraform, Warm the Sky previewed: planet tint, + / −, "PLANT UNCHANGED";
  - `c9-09-mapview-preview.png`: Map View chooser with Water previewed (uncommitted);
  - `c9-10-1024-workbench.png`, `c9-11-1024-adapt.png`: 1024 × 768 Region (A) and Adapt with a preview;
  - `c9-12-1440-region-b.png`: 1440 × 900 Variant B.
- **QA driver:** [`docs/evidence/bloom-019/qa-ui-mockups-c9.js`](evidence/bloom-019/qa-ui-mockups-c9.js). Run it with `NODE_PATH="$(npm root -g)" node docs/evidence/bloom-019/qa-ui-mockups-c9.js [--shots] [--firefox]`. Results go to `qa-results.json`. **521 / 521 checks pass**, covering:
  - the gallery: Convergence is the default; Concepts 1–9 are reachable and every back link returns to its own tab; arrow keys move between tabs; links in hidden tabs are not tabbable; an old BLOOM-018 "Round 2" memory does not hide the new default;
  - a Concepts 1–8 regression smoke;
  - Concept 9 at three viewports, plus reduced motion and Firefox:
    - the 15 acceptance checks listed in the BLOOM-019 brief;
    - the measured geometry above;
    - the banner;
    - the specimen rule in the Region workbench and the boards;
    - a fake purchase;
    - Esc and focus return;
    - Tab walks with the workbench closed and open (no hidden, transparent, off-screen or ring-less stops);
    - no horizontal scroll;
    - no external requests;
    - no console errors.
