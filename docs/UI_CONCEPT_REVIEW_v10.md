# BLOOM — UI concept review v10: Final UI Lock Polish, Concept 18 (BLOOM-026)

**For:** the owner and PMO, for the UI design-reference review ([`VISUAL_DIRECTION_v1.0.md`](VISUAL_DIRECTION_v1.0.md) §10), and for whoever writes the production run-screen specification next.

**Open:** [`demos/ui-mockups/index.html`](../demos/ui-mockups/index.html) in a browser (works over `file://`, no build step). It opens on the **Final UI lock polish** tab. Concept 18 is one page with internal navigation between its five states. Deep links for review: `concept-18-final-ui-lock.html?room=adapt&region=frost` (also `spread`, `terraform`, `region`; add `&lens=temp` for a Map View layer). `?region=frost` alone shows the Planet View banner; `?region=marsh` shows a Strained (Soggy) Water box.

> **Still a visual concept mockup.** Every number, region, trait effect, colony change, tree node, plant drawing, land scene and globe is scripted (`demos/ui-mockups/shared.js`, `c18.js`). The page never loads or calls the engine, generator, validators, scenarios, balance data or Bloom Report. Icons, colours, fonts and art are placeholders, not proposals. The live run screen, the player flow (root `index.html`) and all gameplay files are unchanged. **The production rebuild is not started by this document.**

## 1. A final polish of Concept 17, not an architecture change

BLOOM-025 produced Concept 17 ([`UI_CONCEPT_REVIEW_v9.md`](UI_CONCEPT_REVIEW_v9.md)), now the accepted production-design candidate. The owner reviewed it and made the remaining visual decisions. BLOOM-026 applies them as **Concept 18 — Final UI Lock Polish**:

1. Organic wins the plant → tree link.
2. Organic lines are much thicker.
3. Terraform's atmosphere is diffuse, not a hard band.
4. Soil arrows end much closer to the surface without touching it.
5. The Planet View region banner's buttons are content-sized.
6. The four condition boxes have their own category identity.

Nothing structural changes. Concept 18 lives in its own files (`c18.js`, `c18.css`, `concept-18-final-ui-lock.html`) on the shared fake data. Concept 17 and Concepts 1–16 are untouched, and the gallery keeps Concept 17 (with its Bridge / Docked / Organic switch) as history.

## 2. Organic is the plant link

Adapt and Spread join the plant to the tree with **Organic** tendrils only. The review-only Plant link switch is gone from the ribbon. An old `?link=bridge` deep link is ignored, and Concept 18 never draws a bridge, socket, entry stub or lane bay (QA). The tendril shape is unchanged: a short stem out of the plant card, then a smooth S to the category's port on the rail, with a pale vein. Anchors and ports are ordered top → bottom like the plant, so tendrils cannot cross; QA samples every pair and finds none at any size.

## 3. Thicker Organic tendrils

| | Concept 17 Organic | Concept 18 |
|---|---|---|
| Idle tendril | 5.2 px at every size | 0.52 em, at least 8.5 px: **8.5 / 9.1 / 10.2 px** at 1024 / 1280 / 1440 |
| Lit tendril | 7.5 px | 0.8 em, at least 12.5 px: **12.5 / 14.0 / 15.8 px** |
| Lit colour | category dark shade | category dark shade (= the category label's ink) |
| Glow under the lit tendril | 14 px, opacity 0.32 | 1.9 × lit width (24–30 px), opacity 0.34 |
| Idle colour | category dark shade, dashed in C16 | category colour, opacity 0.86; others dim to 0.4 while one is lit |
| Vein | 1.4 px | 0.12 em, at least 2 px |

That is **1.6–2.1× Concept 17** idle and lit at every viewport (QA compares both pages). The anchor ring is always wider than a lit tendril, the label plate is tall enough to sit over it, and the rail port grew slightly (0.62 → 0.66 em). So the chain still reads as one piece: **anchor → plate → tendril → port → category label → that category's cards**, and nothing hides the plant art, the labels, the anchors or the ports.

**Room to curve apart.** At 1024 the long Temperature and Soil tendrils came within 1.5 px of each other in Concept 17's 1 em gutter once they were this thick. Concept 18 makes the Organic gutter **0.8 em wider** (25 / 32 / 35 px) and flattens the S a little (control-point tension 0.30 / 0.26, was 0.42 / 0.36). The tree pays for the gutter from its right margin (1 → 0.7 em) and tier gap (1.3 → 1.0 em), so tier-1 cards stay the same width (171 px vs 173 px at 1280). Clear space between the closest neighbouring tendrils, edge to edge: **5 / 12.7 / 13.9 px** at rest and **3 / 10.3 / 11.2 px** with one lit (1024 / 1280 / 1440).

**Card titles.** Concept 17 let "Antifreeze" and "Waterborne" run past their card's edge. A card title whose longest word cannot fit its text column is now scaled down just enough to fit, never below 80 % (Waterborne about 84 %, Antifreeze about 88 %, Adaptation about 92 %). All other titles keep their size. Later-tier icons are a touch smaller (2.2 → 2.05 em).

## 4. Diffuse Terraform atmosphere

Concept 17 drew the atmosphere as one translucent stroke band. Its edges were hard (a 30–39-level brightness jump between neighbouring pixels), and a pale disc drawn by the globe added a second edge. Concept 18 draws **one radial-gradient layer** with no stroke:

- **clear at the planet's visible edge** (opacity 0 out to the face radius, so it never covers or muddies the globe);
- **rising smoothly** (half linear, half smoothstep) to its **strongest** (opacity 0.46) exactly where the Atmosphere rings sit;
- **fading out into space** on a smoothstep, gone by 80 % of the clearance, inside the exclusion zone;
- 20 gradient stops, no step between stops larger than 0.1;
- no pale disc on the globe.

Pixel probe (straight up from the globe, face to beyond the zone): the largest neighbouring-pixel brightness jump falls from **32.6 / 38.9 / 30.4** (Concept 17) to **3.5 / 3.8 / 3.4** (1280 / 1024 / 1440). The layer is still clearly there: about 45 levels darker at its strongest point, which sits on the ring line. It is a static gradient, so it costs nothing to render. The exclusion zone, the ring positions and the globe size (251 / 200 / 282 px) are unchanged.

## 5. Soil arrows end at the surface

Concept 17's arrowhead was a sharp triangle whose tip sat about 3 px off the face. A sharp tip is only a pixel or two wide, so the visible arrow began 6–6.5 px from the globe, and the leader's round cap poked past the tip. Concept 18:

- uses a **blunt head with a rounded nose** (0.62 em long, 1 em wide, a 0.16 em round-join outline in the arrow's own colour), so the body starts right at the nose;
- places the **painted nose 0.1 em off the visible face** (1.4–2 px), with a **thin pale outline** so the gap reads as intentional;
- ends the leader inside the head, so nothing pokes past the nose.

Pixel probe along each arrow's axis (first arrow-coloured pixel outside the face): **6.5 / 6 → 3.3 / 3 px** at 1280, **5.8 / 6 → 2.5 / 3 px** at 1024, **6.5 / 6.5 → 2.8 / 2.5 px** at 1440. No arrow pixel lies on the face. The arrows stay clear of text, lock badges and other connectors (sampled), and every other exclusion-zone rule holds: no node, label, caption, badge, legend or readout inside the zone, and subskill connectors outside it.

## 6. Planet View region banner: content-sized buttons

The stretched blue button in Concept 17 was a CSS collision, not a layout choice. The Planet View rule `.planet{flex:1}` also matched every `.btn.planet` (the blue Terraform buttons), so "Warm the Sky" grew to fill the row. Concept 18 scopes that rule to `main.planet`. The banner's action row is now:

**[Inspect region]** · WOULD HELP **[Cold Tolerance · ADAPT] [Warm the Sky · TERRAFORM]**

- Each button is as wide as its content (± 2 px of its own max-content width, no flex-grow).
- Padding is 13–16 px, buttons are at least 44 px tall, with 8–12 px gaps.
- The two suggestions show their name plus which room, matching the Region Inspect "Would help" buttons.
- They are grouped under a short "Would help" caption after Inspect region.
- At 1280 they take 308 of the row's 856 px; the rest is honest empty space.
- The row wraps at narrow widths: one row at 1024 and 800, two rows at 600 (Inspect region, then the Would help group).

## 7. Condition boxes: Temperature / Water / Soil / Hazard identity

The four boxes in the banner are now a **matched category set**, using BLOOM's established category colours (the same as Adapt's categories):

| Category | Accent / icon / label | Faint wash |
|---|---|---|
| Temperature | orange `#d9601f` / dark `#9c3f0e` | `#fde6d6` |
| Water | blue `#3b8fd0` / dark `#23679f` | `#dcecf8` |
| Soil | brown `#8a6a3e` / dark `#5f452a` | `#f1e6d2` |
| Hazard | purple `#8a5bb8` / dark `#5e3a86` | `#efe5f8` |

**Category, always** (whatever the status):
- a 5 px left accent bar;
- the icon in a white disc with a category-tinted ring and category-dark ink;
- the category name as a small caps label in the category's dark shade;
- a faint wash fading from the category tint.

The boxes stay restrained: no saturated blocks.

**Status, separately:**
- a badge with its own shape, an icon and a word: green check for OK (the word "OK" for screen readers only), amber "!" **Strained**, red "✕" **Blocked**;
- for Strained / Blocked, the reading itself takes the status ink.

So Frost Ridge's *Too cold* Temperature box is still the orange Temperature box, carrying a red Blocked badge. Marsh Low's *Soggy* Water box is still the blue Water box (same accent, label and icon ink as an OK Water box), carrying an amber Strained badge. Nothing relies on colour alone: every box has its icon and its name, and every non-OK status has an icon and a word.

**Region Inspect's** four condition rows use the same identity (accent, tinted icon disc, category-coloured name, faint wash), with the existing status chip kept as the status and the reading in status ink.

## 8. Sphere / projection work is out of scope

Concept 18 does **not** touch the real 2D-map → 3D-sphere architecture: no Three.js, no WebGL, no real projection, no seam wrapping, no spherical topology, no shared globe module, no menu planet. A separate BLOOM sphere / projection PMO owns that. The Terraform globe is the existing stylised mockup; only its pale outer disc was removed, so the new atmosphere layer has no competing edge. QA checks `c18.js` for Three.js / WebGL / canvas-context / equirectangular code.

## 9. Also fixed on the way

- **Terraform readout hover leak (Concept 17).** After a Terraform hover ended, the Planet readout kept the last preview's "Opens … / Harder …" lines. That made the readout taller and pushed the region strip out of the mini-map box (visible in BLOOM-025's Terraform screenshots). The readout now resets with everything else.
- **Terraform region strip.** While a preview makes the readout taller, the Terraform mini-map gives up height first (down to 5.5 em), so the strip stays inside its box. At rest the map is back to full size.
- **Spread padding** is now measured from the first and last rows' own card heights, not the tallest card's, so fitted titles cannot unbalance it.

## 10. Retained Concept 17 behaviour (regression-checked)

Concept 18 keeps all of Concept 17's accepted behaviour, and QA re-checks it:

- Planet View: stable full-width map; banner selection / deselection rules (X, ocean click; Pause / speed never touch it); home selection ≠ room context.
- Map View: compact popover under its button with only the five choices; hover / focus previews, click commits; closes on outside click, Escape and tool toggle.
- Region pills: hover / focus outlines the region on the mini-map and peeks; leaving restores; click selects.
- Rooms: PAUSED / Resume; intrinsic "Would help" buttons in Region Inspect; floating decision rooms over the blurred, dimmed, inert Planet View; content-height side boxes.
- Adapt / Spread: one shared room family; category colour continuity (label = node accent = tendril glow; label ink = port = anchor = lit tendril).
- Terraform: Soil-left / Atmosphere-right banks; one atmosphere concept; the exclusion-zone rules.
- Also: balanced Spread padding; the hover-reset rule on every transition; no emoji; inline SVG placeholder icons; the calibrated room scale (em 17.5 / 14 / 19.7 at 1280 / 1024 / 1440, same as Concept 17).

## 11. QA

**Driver and results.** The driver is [`evidence/bloom-026/qa-ui-mockups-c18.js`](evidence/bloom-026/qa-ui-mockups-c18.js) (Playwright) and the results are in [`evidence/bloom-026/qa-results.json`](evidence/bloom-026/qa-results.json).

**Run matrix:**
- Chromium at 1280×800, 1024×768 and 1440×900;
- reduced motion at 1280×800;
- Firefox at 1280×800;
- the gallery at all three widths;
- a Concept 17 (Organic) vs Concept 18 comparison at all three widths;
- the banner at 1024, 800 and 600 px wide.

**Result: 719 / 719 checks pass** (2026-10-04): 137 per run × 5 runs, 12 comparison, 3 banner-width, 10 gallery, plus scale, isolation, scope, icon and wording checks. 0 external requests, 0 console errors, 0 node collisions, 0 tendril crossings.

Explicitly verified, per the brief:

1. Concepts 1–18 reachable and loading clean.
2. Concept 18 is the gallery default (an old BLOOM-025 remembered tab does not hide it).
3. Organic is the only Adapt / Spread treatment.
4. Tendrils measurably thicker than Concept 17 (≥ 1.5×, idle and lit, every viewport).
5. No crossings, and clear space between neighbours even with one lit.
6. Category colour continuity.
7. The atmosphere is a gradient with no stroke, and the pixel probe finds no jump over 4 levels.
8. The atmosphere is clear out to the face.
9. Soil arrows closer than Concept 17 by pixel probe, never on the face.
10. Exclusion-zone rules intact.
11. Banner buttons intrinsic.
12. Suggestions ≤ 34 % of the row each.
13. The row wraps at 600 px.
14. Four distinct category identities.
15. Strained / Blocked keep their category accent and add a badge.
16. Icons and words throughout, not colour alone.
17. Map View popover.
18. Pill hover.
19. Hover reset (node → node, empty space, other panel, globe, window blur, focus-out, and the readout reset).
20. No emoji.
21. No console errors.
22. No external requests.

**Screenshots** in the evidence folder:

| # | Shot |
|---|---|
| 00 | gallery |
| 01 | Planet View with the selected-region banner |
| 02 | banner action buttons close-up |
| 03 | the four condition boxes close-up |
| 04 | Adapt Organic, normal |
| 05 | Adapt Organic, Cold Tolerance hovered |
| 06 | Spread Organic, Waterborne Seeds hovered |
| 07 | Terraform |
| 08 | Terraform atmosphere close-up |
| 09 | Soil arrow close-up at 3× (09b: Concept 17 for reference) |
| 10 | Region Inspect condition rows |
| 11 | Map View popover |
| 12–13 | 1024 Adapt and Terraform |
| 14–15 | 1440 Adapt and Terraform |
| 16 | banner wrapped at 600 px |
| 17 | region-pill hover on the mini-map |
| 18 | Terraform node hovered |
| 19 | Spread padding |

## 12. Known limitations

- **Mockup, not UI logic.** Purchases, colony growth, Biomass, previews and the clock are scripted; later-tier nodes are placeholders.
- **Fitted titles.** A few long card titles render slightly smaller than their neighbours (Waterborne about 84 % in Spread's narrower three-tier cards). Production copy or a wider Spread card would remove the need.
- **Preview ring.** On the narrowest cards, the hover / focus preview ring around a node's icon touches the start of its title (as in Concept 17).
- **Tendrils at 1024.** The closest pair (Temperature / Soil) keeps 5 px clear at rest and 3 px with one lit. That is enough, but it is the tightest spot; a smaller window would need a lighter weight or a wider gutter.
- **Atmosphere peak.** The strongest point is fixed by the ring line (0.8 em out). The inner ramp from the face is short (about 19 px at 1280), so it is the steepest part of the gradient (still under 4 brightness levels per pixel).
- **Terraform mini-map.** It shrinks (to 5.5 em) while a Terraform preview makes the readout taller; at rest it is full size.
- **Browsers.** Firefox was tested at 1280×800 only; Safari / WebKit not run. `color-mix()` is used for the condition boxes' tinted borders (current Chromium, Firefox and Safari support it).

## 13. Remaining owner decisions (small; none blocks the specification)

1. **Tendril weight:** 9 px idle / 14 px lit at 1280 (8.5 / 12.5 px at 1024). Right, or heavier still?
2. **Organic gutter:** 0.8 em wider than Concept 17, paid back inside the tree (tier-1 cards 171 vs 173 px), plus fitted long titles. Accept?
3. **Atmosphere strength:** peak opacity 0.46. Stronger or fainter?
4. **Soil arrow gap:** about 2.5–3.3 px from the surface, with a thin pale outline. Accept?
5. **OK status:** a green check only (the word is for screen readers), while Strained / Blocked show icon + word. Should OK show its word too?
6. With those answers, Concept 18 can serve as the visual basis for the production run-screen specification. The production rebuild is **not** started by this round.
