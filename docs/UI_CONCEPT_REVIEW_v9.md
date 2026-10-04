# BLOOM — UI concept review v9: Final Interaction & Connector Refinement, Concept 17 (BLOOM-025)

**For:** the owner and PMO, for the UI design-reference review ([`VISUAL_DIRECTION_v1.0.md`](VISUAL_DIRECTION_v1.0.md) §10), and for whoever writes the production run-screen specification next.

**Open:** [`demos/ui-mockups/index.html`](../demos/ui-mockups/index.html) in a browser (works over `file://`, no build step). It opens on the **Final interaction & connectors** tab. Concept 17 is one page with internal navigation between its five states and a review-only **Plant link** switch in the top ribbon. Deep links for review: `concept-17-final-interaction.html?room=adapt&region=frost&link=bridge` (also `spread`, `terraform`, `region`; `link=docked|organic`; add `&lens=temp` for a Map View layer).

> **Still a visual concept mockup.** Every number, region, trait effect, colony change, tree node, plant drawing, land scene and globe is scripted (`demos/ui-mockups/shared.js`, `c17.js`). The page never loads or calls the engine, generator, validators, scenarios, balance data or Bloom Report. Pause and speed only control the mockup's fake clock. Icons, colours, fonts and art are placeholders, not proposals. The live run screen, the player flow (root `index.html`) and all gameplay files are unchanged. **The production UI is not locked by this document, and the production rebuild is not started.**

## 1. A final refinement of Concept 16, not another architecture round

BLOOM-024 produced Concept 16, the accepted convergence direction ([`UI_CONCEPT_REVIEW_v8.md`](UI_CONCEPT_REVIEW_v8.md)). The owner then listed the last presentation and interaction issues to settle before the production UI specification is written: how the plant and its evolution tree are joined, what the right-panel region pills do on hover, pause wording, the "Would help" actions, the main-map Map View control, visual collisions around the Terraform globe, Spread's uneven padding, and a hover-reset rule with no exceptions. BLOOM-025 applies those to Concept 16 and calls the result **Concept 17 — Final Interaction & Connector Refinement**. The gallery keeps Concept 16 unchanged as history.

Nothing structural changes. The Planet View rules, the banner, the selection / room-context split, the room set, the floating rooms over the blurred world, the content-height side boxes, the pill-fit scale and proportional shrink, the category colours and the Soil / Atmosphere banks are all as in v8. Concept 17 lives in its own files (`c17.js`, `c17.css`, `concept-17-final-interaction.html`) on the shared fake data; `c16.js` / `c16.css` / `concept-16-presentation-refinement.html` are untouched.

## 2. Plant link: three review-only treatments on one page

The owner wanted several plant → tree connector ideas side by side, switchable from the mockup's review ribbon. The switch (**Review only · Plant link: 1 Bridge · 2 Docked · 3 Organic**) is review tooling, not game UI. It changes **only the drawing of the link**: the fake data, the skill positions and order, the plant's position and drawing size, the tree content, the mini-map context, the room scale (em) and the category colours are identical in all three, and QA verifies that (same node list, same em, same plant card width and position, same anchor points, same label mode, same colours). Switching preserves the active room, its context, the committed Map View, the pause state and a focused node's preview; the choice is remembered (`localStorage`, `?link=`).

In all three, anchors and ports are ordered top → bottom like the plant, so **no two leaders cross** (QA samples every leader and tests every pair of segments); the lit leader is thick with a glow and a filled label plate; the category colour runs from plate to node.

### Option 1 — Bridge (baseline)
Separate cards with a deliberate **connector gutter** (2.6 em) between the plant card and the tree card. A translucent rounded bridge (pale fill, thin border, no shadow: a gutter, not a panel) spans the rows the links use. Each leader leaves the plant through an **exit socket** on the plant card's right edge, runs in its own lane inside the bridge, enters the tree through an **entry socket** on the tree card's left edge and finishes with a short stub to the rail port. The plant, the bridge and the tree read as one composed system; nothing travels through unrelated space. *Cost:* the gutter takes 1.6 em from the tree card; the tier gap, the right margin and the later-tier ratio give most of it back, so tier-1 cards are about 5 % narrower than Organic at 1280 (165 vs 173 px).

### Option 2 — Docked
The plant card **docks against the tree card**: its right corners square off, the tree's top-left corner too, and the two share one seam (the tree's border). The plant card is not enlarged and the drawing is not shrunk (QA: same width as Bridge). The leaders' lanes live in a **bay** inside the tree card's left edge (a tinted strip with a dashed inner edge, 3.4 em), so the travel from anchor to port is the shortest of the three; each anchor feeds straight through a **seam socket** at its own height. Plant plus tree reads as one physical interface. *Cost:* the bay takes 1.5 em of tree width, the removed gap gives 1 em back (tier-1 cards about 3 % narrower than Organic).

### Option 3 — Organic
The cards stay apart with the Concept 16 gap. One **tendril** per category: a short stem out of the plant to the card's edge, then a smooth cubic S-curve to the port, 5.2 px idle and 7.5 px lit with a wider glow and a pale vein down the middle; anchors and ports are 15 % bigger. Every tendril shares the same horizontal profile, so with anchors and ports ordered alike they cannot cross; there are no loops and no decoration. *Cost:* line language alone; the gap between the cards stays, and the tendrils are the busiest of the three visually.

| | Bridge | Docked | Organic |
|---|---|---|---|
| Gutter between cards at 1280 | 46 px (2.6 em) | 0 (shared seam) | 18 px (1 em) |
| Where the lanes live | in the bridge | in the tree's bay | one curve each |
| Edge markers | exit + entry sockets | seam sockets | none |
| Tier-1 card width at 1280 | 165 px | 168 px | 173 px |
| Reads as | one composed system | one physical interface | biology |
| Risk | one more drawn object | plant card loses its corner | can look busy when all four are lit |

## 3. Right-panel region pills

In every room the region pills beside the mini-map now **preview on hover / focus**: the same region is outlined on the mini-map (the hover outline, the same path the selection outline uses) and the peek line reads its status; the pill shows a peek state. **Leaving** (pointer off the pill, onto empty panel space, focus moving away, the window losing focus, the pointer leaving the window) restores the room's selected context at once: the selection outline never moved, the peek line resets, no pill stays highlighted. **Only a click selects** the region as the room context (as before). QA runs that sequence in all four rooms at every size and in Firefox.

## 4. Pause wording

The strategy-room pill says **PAUSED** (the "strategy mode" sub-line is gone) and the button says **Resume** (not "Resume play"). The behaviour is unchanged: entering a room auto-pauses, Resume closes the room and runs the clock, Back leaves the clock as it was, Escape = Back. QA reads the exact text in every room.

## 5. "Would help" actions

Region Inspect's suggestions were full-width stacked blocks that read like information rows. They are now **real buttons of intrinsic width**: icon, name and the room tag side by side, 0.85–1.15 em of padding, a visible gap between them, never stretched across the pane. With two actions (Adapt + Terraform for Frost Ridge) they sit in a **two-column row**; with one action there is one button and no forced second column; below 900 px wide they stack. QA measures the grid (two tracks, same top, widest < 45 % of the pane) and the single-action case where the fake data has one.

## 6. Map View on Planet View

The Map View bar with its colour key and "hover previews · click sets" hint is gone. Clicking **Map View** opens a **compact popover directly under the Map View button**: a short caption and the five view choices, **Plants / Normal, Temperature, Water, Soil, Hazard**, nothing else (QA checks the popover's text is exactly those words). Hover / focus previews the layer on the main map and every room mini-map; leaving the item or the popover restores the committed layer; click commits (the popover stays open so layers can be compared; §13 asks whether it should close instead). It closes on **outside click**, **Escape** (focus returns to the button) and **tool toggle** (clicking Map View again, or opening a room). Pause / speed and the region banner are untouched: clicking Pause while it is open pauses the clock and closes the popover, clicking a region selects it and shows the banner. The room mini-map chips keep the same choices (the first is labelled "Plants" there for width).

## 7. Terraform: the exclusion zone

The globe area now has explicit geometry (`layout`, kind `banks`, in `c17.js`):

- **One atmosphere halo**: a single translucent band from R + 0.3 em to R + 1.3 em around the globe (no dotted ring, no second outer ring, no glow disc). The Atmosphere leaders end in a ring on its centre line; the Soil leaders cross it to a pin on the surface. These two endpoint kinds are the **only** things allowed inside the zone.
- **Zone** = halo outer edge + **1 em of clearance** (R + 2.3 em). No node icon, node label, category caption, lock badge, legend, readout text or subskill connector may enter it. The banks start one lane width (0.7 em) outside the zone, and the bow of each C is reduced until every icon and its lane stay outside (the short Soil C at 1024 would otherwise curl its tips into the zone).
- **Subskill connectors**: adjacent parent / child along a bank are joined by **one straight segment** from the parent's icon bottom to the child's icon top; a second child further down the bank (Soil Building → Wash the Salt) gets a **short elbow** in the lane beside the icons. None bows towards the globe any more. QA samples every connector and requires its closest point to be outside the zone.
- **Lock / owned badges** sit on the node's **outer top corner**, away from the globe (left bank: top-left; right bank: top-right), so they never cover a Soil arrow, an Atmosphere connector or a chain. QA samples every connector against every badge box.
- **Labels**: the Soil / Atmosphere legend is top-left and the globe readout (temperature, rain, spin hint) bottom-left of the tree box, both outside the zone and clear of every connector; node labels and category captions sit on the outer side of their bank.
- Measured at 1280 / 1024 / 1440: globe 251 / 200 / 282 px across (Concept 16: 284 / 227 / 320); zone radius 166 / 132 / 186 px; the nearest forbidden item (the Cool the Sky icon) sits 177 / 142 / 200 px out, the closest subskill connector point 170 / 136 / 191 px out, the legend and readout 265+ px out. The globe is about 12 % smaller than in Concept 16, the price of the clearance (§13 asks).

## 8. Spread padding

The anatomy layout padded the top of the tree by 3.1 em and the bottom by 2.2 em, so the content-height Spread card had more room above its first row than below its last. Both pads are now **half the measured card height + 1 em**, and the card's left (rail port) and right margins are both 1 em. Spread's rows are not stretched (the row step is still capped and the card is sized to the tree); Adapt, which fills its column, gets the same symmetric margins. QA measures the four margins of the Spread card: top = bottom ± 3 px, left = right ± 0.35 em, all ≥ 0.8 em (at 1280: 21 / 20 / 19 / 16 px top / bottom / left / right; the right margin is the card's 1 em minus a port's stroke).

## 9. Hover reset

The Concept 16 rule is retained and strengthened: **hover / focus previews only while active; leaving restores the committed state at once; only a click commits.** New in this round: the browser may re-fire a hover for the node still under a stationary pointer when its contents repaint (for example right after the window loses focus); the tree now ignores such re-hovers until the pointer really moves. Region pills, Map View choices (Planet View popover and room mini-map chips), mini-map peeks, globe / scene previews and Adapt / Spread / Terraform nodes all reset on: pointer onto empty space, onto another node (the new one previews), onto another panel, out of the popover, onto the globe, out of the window, window blur, tab hidden, focus moving away. QA exercises node → node, node → empty tree space, node → the mini-map box, node → window blur, Terraform node → globe, pill → empty panel, pill → focus-out, pill → blur, Map View item → outside, and the buy-then-leave case in every tree room.

## 10. Smaller fixes made on the way

- The Terraform right column (23 %) let its Map View chips wrap to two rows and its region strip slide under the readout box at 1280. The column now keeps a one-line peek, one-row chips (the set chip shows its state by colour there), a slightly shorter mini-map and a one-row strip that scrolls; QA checks no room's mini-map box is overflowed by its own content.
- Later-tier cards are a little tighter (2.2 em icon, 0.66 em caption) so their captions fit in every Plant link variant; narrow trees wrap the cost line instead of truncating it.
- The mini-map peek line is one stable line (ellipsis when long) in every room: a two-line peek used to push the region strip down under the pointer, which made Firefox toggle the pill hover on and off, and made the right column jump on every mini-map hover.

## 11. QA

Driver: [`evidence/bloom-025/qa-ui-mockups-c17.js`](evidence/bloom-025/qa-ui-mockups-c17.js) (Playwright). Results: [`evidence/bloom-025/qa-results.json`](evidence/bloom-025/qa-results.json). Run matrix: Chromium at 1280×800, 1024×768 and 1440×900, reduced motion at 1280×800, Firefox at 1280×800; the gallery at all three widths; a scale comparison against Concept 16. **Result: 678 / 678 checks pass** (2026-10-04; 132 checks per run × Chromium 1280 / 1024 / 1440, reduced motion and Firefox, plus gallery, scale, isolation and scope checks; 0 external requests; 0 node collisions; 0 leader crossings in any variant at any size).

Explicitly verified, per the brief: Concepts 1–17 reachable and loading clean; Concept 17 is the gallery default; the Plant link switch exposes exactly Bridge, Docked, Organic; switching preserves room, context, Map View, pause and the focused preview; the three treatments are visibly distinct (gutter 0 < 1 em < 2.6 em; lanes in the gutter / in the bay / curves) and share everything else; no leader crossings; category colours continuous; pill hover outlines the same region and leaving restores; PAUSED / Resume exact text; "Would help" buttons intrinsic in two columns; Map View under its button with only the five choices; hover resets on every listed transition; one halo; nothing in the exclusion zone; subskill connectors straight / elbow and outside the halo; badges never on a connector; Spread margins balanced; floating world intact; no emoji; no console errors; no external requests. Plus everything the BLOOM-024 driver verified for Concept 16.

Screenshots in the evidence folder: gallery (00), Planet View with the Map View popover open and Water previewed (01), Region Inspect with the compact "Would help" buttons (02), Adapt Bridge / Docked / Organic (03–05), Spread with the default Bridge treatment (06), a right-column close-up with a region pill hovered and its region outlined on the mini-map (07), Terraform (08) and a node hovered (09), a close-up of the globe proving the exclusion zone (10), the Spread card's balanced padding (11), 1024 Adapt and Terraform (12–13), 1440 Adapt and Terraform (14–15).

## 12. Known limitations

- **Mockup, not UI logic.** Purchases, colony growth, Biomass, previews and the clock are scripted; later-tier nodes are placeholders.
- **Bridge and Docked cost tree width** (about 5 % and 3 % narrower tier-1 cards than Organic at 1280: 165 / 168 / 173 px). The label mode is forced equal across variants so the comparison stays fair; the width difference remains.
- **The globe is smaller** than in Concept 16 (251 px vs 284 px at 1280) because of the clearance ring; the bank icons and labels are the same size.
- **The popover stays open after a click** (comparison-friendly); a production dropdown might close.
- **Terraform's right column** shows two region pills per row and one row before scrolling (its 23 % column keeps the globe large); the set Map View chip shows no label there.
- **Hover-reset after a blur** relies on the next real pointer move; a stationary pointer shows no preview until it moves, which is the intended rule.
- **Firefox** tested at 1280×800 only; Safari / WebKit not run.

## 13. What the owner should confirm next (needed to lock the production design)

1. **Plant link:** Bridge (baseline), Docked or Organic for production? Or Bridge with Organic's thicker line weight?
2. **Bridge detail:** keep the visible translucent gutter, or hide it and keep only the exit / entry sockets?
3. **Docked detail:** squared plant-card corners against the seam (as built), or a 2-px breathing gap with rounded corners?
4. **Map View popover:** stay open after a click (as built) or close on commit?
5. **Terraform:** accept the smaller globe for the 1 em clearance, or reduce the clearance to 0.5 em (globe about 6 % larger)? Does the single soft halo band read as atmosphere without a dotted edge?
6. **Legend / readout corners:** legend top-left and readout bottom-left (as built), or readout under the globe (it then has to leave less clearance to the bottom Atmosphere leader)?
7. **Region pills:** should pill hover also show the region's name label on the mini-map (as the mini-map's own hover does), or is the outline + peek line enough?
8. With those answers, Concept 17 becomes the basis of the production run-screen specification. The production UI is **not** locked by this document.
