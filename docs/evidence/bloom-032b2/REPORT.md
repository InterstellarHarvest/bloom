# BLOOM-032B2 — Organic Hybrid FINAL art intake · evidence

**Status:** STOPPED AT OWNER VISUAL REVIEW. The PMO-approved Organic Hybrid art runs in the accepted 032B1 compositor as
`art/plant/packs/organic-hybrid/`, labelled **ORGANIC HYBRID — FINAL ART**. Production is unchanged.
`resources/run-ui/plant-specimen.js` still draws the plant in Adapt, Spread, Inspect and the Field Journal. Nothing in the game loads the new pack.

| | |
|---|---|
| Starting main | `be0a82918144a2e3b8aa2fcf2aa8c642dd3128b2` (accepted BLOOM-032B1) |
| Implementation commit (candidate) | `89a9acc956016c79b5ac8a26c54164b350660658` |
| Review page | `demos/plant-sprite-pipeline-lab.html`. Double-click it, or serve it at `/` or under `/bloom/`. **Final vs production SVG** view (key **C**). |

## 1 · Intake package: hash verification (done first)

Received: `bloom-organic-hybrid-final-approved-art-intake.zip`, SHA-256 `22878851bb9ed0d3bb4c5e0e724ee856241d3dea5dab1ceec214bb996a77a427`.
`PMO_FINAL_ACCEPTANCE.json` SHA-256 is `651a540cdea9aa1fe1c27de0d30f5e94a64eb69720dab7f5e11684aed2f5fe2f`. It names production main `be0a829` and canvas 84×98, soil 68, crown 42,68.

| Delivery | Bytes | SHA-256 (= PMO) |
|---|---:|---|
| batch1-base.zip | 6082 | `54da449b36512749f41f324705a486b4bc2e905fe94b730734500d0051151e3d` ✔ |
| batch2-cold-heat-corrected.zip | 38071 | `6c7173111d92a0f1bd1320e641196623a50bf4824e75d19a20f208753b55c6a2` ✔ |
| batch3-drought.zip | 50116 | `e3a2a289990870155cec765a67c5a7d958700e4e0c469c25a1248897143faea1` ✔ |
| batch4-flood.zip | 50456 | `76631a5858011fe05be432463404ec73e46a413d78925fb768023b1242f5dd16` ✔ |
| batch5-salt-radiation.zip | 39614 | `7f9647de6b9c72ad5d8a3fc8bebf16a97746125d25b07586ccf36136bcf9c5b3` ✔ |
| batch6-reproduction-dispersal.zip | 43546 | `23925120999a6e38cc08774af31cb219dd7ce9c266dcd6650e4939abe0e65d8f` ✔ |
| final-pack-metadata-closure.zip | 21874 | `88cadd2d7dfc5e1cf2b465875cf5666475b87c44751f62de82da70c3da6ff435` ✔ |

**7 / 7 match.** There are no mismatches. The ZIPs are committed unchanged in `art/plant/intake/organic-hybrid/approved-deliveries/`.
`tools/intake-organic-hybrid-art.mjs` re-verifies them on every run and refuses to write anything if one differs.

## 2 · What was ingested and how (mechanically)

`node tools/intake-organic-hybrid-art.mjs` assembles the pack from the deliveries. `--check` confirms that the committed pack equals a clean intake.
It **may only**: place sprite rects (with a 1-px transparent gutter), write the swatch, write the approved mask rects, and translate studio
metadata into contract metadata. It does not resize, rotate, smooth, recolour or redraw anything. Transparent pixels are written as `(0,0,0,0)`.
Opaque pixels keep their exact RGB.

* **Sprites:** 55 approved component sprites. Batch 1: 5 · Batch 2: 7 · Batch 3: 17 · Batch 4: 19 · Batch 5: 2 · Batch 6: 5. No sprite 56 exists.
  The build bakes 37 mirrored left twins (leaves, `root.stilt`, `bud.axil`) as before. They are not new art. The runtime holds 92 sprites.
* **Masks:** the 6 approved Base masks (pigment + toothed for `leaf.base.low/mid/high`, Batch 5), bit for bit.
* **Closure:** waxCore `#465d4c #648466 #90ac83 #c2ce9d` · sky `#7d8c96 #aeb4aa` · soil `#4a3d33 #3f332b #6b5b4c` · turf `#626b45` ·
  `render.stemOutline: ink`.
* **Palette:** ONE converged pack palette with **18 materials and 69 plant colours**. Ink is 1 colour; the other 17 materials are ramps of 4, ordered dark → light.
  Studio names were translated as follows: `LEAF_1…4` → `leaf` 0…3, `"frost 0"…` → `frost` 0…, `WAXLEAF` → `waxLeaf`, and so on.
  Every colour is unique. The environment colours are kept separate from the plant palette.
  Every approved opaque pixel is exactly a palette colour; nothing needed recolouring.
* **Atlas:** `art/plant/packs/organic-hybrid/atlas.png` is **160 × 147 px, 4201 bytes**, SHA-256 `628f988848c607c260c9365852f86b4ae86dd5025b04092731f901baa5c45ec9`.
  It holds the 69-colour swatch, the 55 sprites and the 6 mask rects.
* **Generated runtime:** `resources/plant-visual/generated/plant-atlas.js` is 255 233 bytes, fingerprint `3e830fa9c643…`.
  `plant-atlas-manifest.json` is regenerated with 4 packs. The proof packs are unchanged and still TEMPORARY.
* **Provenance:** `art/plant/intake/organic-hybrid/intake-map.json` records, per sprite and mask: delivery, ZIP entry, source SHA-256,
  size, anchor, points, atlas rect and pixel signature.

### Mask completion: contract defaults only, no invented pigmentation

| Leaf drawings | pigment | wax | toothed (Salt) |
|---|---|---|---|
| `leaf.base.low / mid / high` | **approved Batch-5 mask** | `auto` (contract default) | **approved Batch-5 mask** |
| `leaf.base.heat.*`, `leaf.drought.*` (incl. `.heat`), `leaf.flood.*` (incl. `.heat`): 32 drawings | `auto` (contract default) | `auto` | **none** |

The accepted contract (`docs/PLANT_SPRITE_PIPELINE_v1.md` § H12) allows `"auto"` for pigment and wax. `"auto"` means every leaf / stem / core pixel takes the treatment ramp shade-for-shade.
For toothed, the contract requires an *authored* mask and states "no mask = no teeth". No toothed mask is *required* for any component, so nothing had to stop.
Batch 5 itself notes that Drought / Flood toothed masks were not authored. Consequences, for the owner to judge (§ 6):
Salt cuts notches only on Base leaves. Radiation pigments Base leaves through the approved partial masks, and every other leaf drawing whole-blade (`auto`).

## 3 · Body plan: unchanged

All 55 real sprites fit the accepted `art/plant/body-plan.json` (4 layouts / 117 sockets) with **no socket change**. The unchanged build's static
proof places every real sprite at every socket it can take, plus every leaf-point detail on every leaf drawing: **17 782 placements**, all inside 84 × 98.
The contract, body plan, compositor, selector, model and FX are byte-identical to `be0a829`. There is no trait-specific code.

## 4 · Source → atlas pixel integrity

For every approved sprite, three things are identical: the opaque / transparent matrix, and the exact RGB of each opaque pixel, in all of
**source PNG (from the ZIP) == atlas rect == generated runtime**. The signature is sha256 of the size and `x,y:rgb` for every opaque pixel.
* Sizes are identical, so nothing was resized.
* Placement is pixel-for-pixel, so nothing was rotated or flipped.
* Baked left twins are exact mirrors.
* No pixel anywhere has partial alpha.
* Every colour maps to its material · shade, within the studio's declared `materials_used` per sprite.

A mutation test was run on a scratch copy: one approved flower pixel recoloured to another *legal* palette colour.
The 032B1 build validator accepts it, but the intake check fails I5 (pixel integrity) and I9 (intake determinism).

| Sprite | Delivery | Size | Atlas rect | Opaque px | Source signature | Atlas |
|---|---|---|---|---:|---|:-:|
| `leaf.base.low` | batch1-base | 18×16 | [0, 9, 18, 16] | 121 | `c9cf932c5caf` | = |
| `leaf.base.mid` | batch1-base | 18×16 | [57, 9, 18, 16] | 120 | `a48d8768d4ff` | = |
| `leaf.base.high` | batch1-base | 16×16 | [114, 9, 16, 16] | 102 | `280a7ba5144b` | = |
| `bud` | batch1-base | 9×12 | [17, 26, 9, 12] | 48 | `6cae422d868c` | = |
| `bud.axil` | batch1-base | 6×7 | [27, 26, 6, 7] | 24 | `ab62589816cd` | = |
| `frost.hair.1` | batch2-cold-heat-corrected | 3×4 | [34, 26, 3, 4] | 5 | `7fcc6709ae83` | = |
| `frost.hair.2` | batch2-cold-heat-corrected | 5×5 | [38, 26, 5, 5] | 10 | `c167ae786fda` | = |
| `frost.hair.3` | batch2-cold-heat-corrected | 7×6 | [44, 26, 7, 6] | 16 | `f888f30e1a68` | = |
| `frost.collar.2` | batch2-cold-heat-corrected | 11×6 | [52, 26, 11, 6] | 20 | `4362bfeb9e7a` | = |
| `frost.collar.3` | batch2-cold-heat-corrected | 15×7 | [64, 26, 15, 7] | 26 | `9c7d889a59d5` | = |
| `leaf.base.heat.mid` | batch2-cold-heat-corrected | 18×16 | [80, 26, 18, 16] | 99 | `e49087a66ffe` | = |
| `leaf.base.heat.high` | batch2-cold-heat-corrected | 18×16 | [99, 26, 18, 16] | 94 | `be68a2ba74c0` | = |
| `leaf.drought.1.low` | batch3-drought | 18×16 | [118, 26, 18, 16] | 120 | `da29fe8b0a54` | = |
| `leaf.drought.1.mid` | batch3-drought | 18×16 | [137, 26, 18, 16] | 118 | `a4c77328f38e` | = |
| `leaf.drought.1.high` | batch3-drought | 18×16 | [0, 43, 18, 16] | 103 | `5a480de68b5d` | = |
| `leaf.drought.2.low` | batch3-drought | 18×16 | [19, 43, 18, 16] | 138 | `48c1a8e98983` | = |
| `leaf.drought.2.mid` | batch3-drought | 18×16 | [38, 43, 18, 16] | 132 | `faba668a1f79` | = |
| `leaf.drought.2.high` | batch3-drought | 18×16 | [57, 43, 18, 16] | 102 | `c14e54d5e66b` | = |
| `leaf.drought.3.low` | batch3-drought | 16×16 | [76, 43, 16, 16] | 99 | `557324bb5eb4` | = |
| `leaf.drought.3.mid` | batch3-drought | 16×16 | [93, 43, 16, 16] | 105 | `d606a2efee78` | = |
| `leaf.drought.3.high` | batch3-drought | 16×16 | [110, 43, 16, 16] | 76 | `94abe80ec5f1` | = |
| `leaf.drought.1.heat.mid` | batch3-drought | 18×16 | [127, 43, 18, 16] | 97 | `b4f386cbbdd7` | = |
| `leaf.drought.1.heat.high` | batch3-drought | 18×16 | [0, 60, 18, 16] | 94 | `6aab7e5095b3` | = |
| `leaf.drought.2.heat.mid` | batch3-drought | 18×16 | [19, 60, 18, 16] | 103 | `c21186b240f3` | = |
| `leaf.drought.2.heat.high` | batch3-drought | 18×16 | [38, 60, 18, 16] | 99 | `a0016240a092` | = |
| `leaf.drought.3.heat.mid` | batch3-drought | 16×16 | [57, 60, 16, 16] | 80 | `a63f17d4c2a2` | = |
| `leaf.drought.3.heat.high` | batch3-drought | 16×16 | [74, 60, 16, 16] | 72 | `d160fd7927b8` | = |
| `root.storage.2` | batch3-drought | 12×20 | [91, 60, 12, 20] | 130 | `d178f5edb897` | = |
| `root.storage.3` | batch3-drought | 14×24 | [104, 60, 14, 24] | 188 | `a7768757d995` | = |
| `leaf.flood.1.low` | batch4-flood | 18×16 | [119, 60, 18, 16] | 118 | `c57460cadca9` | = |
| `leaf.flood.1.mid` | batch4-flood | 18×16 | [138, 60, 18, 16] | 117 | `7d62c0e6f75c` | = |
| `leaf.flood.1.high` | batch4-flood | 18×16 | [0, 85, 18, 16] | 100 | `3fb826f73911` | = |
| `leaf.flood.2.low` | batch4-flood | 20×20 | [19, 85, 20, 20] | 134 | `b8648b12c847` | = |
| `leaf.flood.2.mid` | batch4-flood | 20×20 | [40, 85, 20, 20] | 150 | `85f16bc54fee` | = |
| `leaf.flood.2.high` | batch4-flood | 20×20 | [61, 85, 20, 20] | 119 | `ebb872188b41` | = |
| `leaf.flood.3.low` | batch4-flood | 20×20 | [82, 85, 20, 20] | 133 | `bcbb28578477` | = |
| `leaf.flood.3.mid` | batch4-flood | 20×20 | [103, 85, 20, 20] | 158 | `12e0659b8925` | = |
| `leaf.flood.3.high` | batch4-flood | 20×20 | [124, 85, 20, 20] | 121 | `4682a0316aea` | = |
| `leaf.flood.1.heat.mid` | batch4-flood | 18×16 | [0, 106, 18, 16] | 97 | `916895b9d5fc` | = |
| `leaf.flood.1.heat.high` | batch4-flood | 18×16 | [19, 106, 18, 16] | 94 | `821b3c0bf197` | = |
| `leaf.flood.2.heat.mid` | batch4-flood | 20×20 | [38, 106, 20, 20] | 117 | `877ae9f8bd90` | = |
| `leaf.flood.2.heat.high` | batch4-flood | 20×20 | [59, 106, 20, 20] | 93 | `6002c0129280` | = |
| `leaf.flood.3.heat.mid` | batch4-flood | 20×20 | [80, 106, 20, 20] | 112 | `9e74434325f7` | = |
| `leaf.flood.3.heat.high` | batch4-flood | 20×20 | [101, 106, 20, 20] | 96 | `682694037f27` | = |
| `root.aerial.1` | batch4-flood | 5×8 | [122, 106, 5, 8] | 9 | `447656c98eb3` | = |
| `root.aerial.2` | batch4-flood | 5×11 | [128, 106, 5, 11] | 15 | `d5660016daec` | = |
| `root.aerial.3` | batch4-flood | 7×15 | [134, 106, 7, 15] | 20 | `31f44b6e89d6` | = |
| `root.stilt` | batch4-flood | 12×16 | [142, 106, 12, 16] | 37 | `54d4d282d441` | = |
| `salt.crystal` | batch5-salt-radiation | 7×7 | [0, 127, 7, 7] | 16 | `9740d69080e4` | = |
| `salt.gland` | batch5-salt-radiation | 4×4 | [8, 127, 4, 4] | 6 | `fd4f0db0da5e` | = |
| `flower` | batch6-reproduction-dispersal | 16×18 | [13, 127, 16, 18] | 153 | `494c6b486f7b` | = |
| `seedHead.small` | batch6-reproduction-dispersal | 11×13 | [30, 127, 11, 13] | 53 | `05ee74831581` | = |
| `seedHead.large` | batch6-reproduction-dispersal | 18×20 | [42, 127, 18, 20] | 94 | `11af1192cf50` | = |
| `seed.drift` | batch6-reproduction-dispersal | 7×7 | [61, 127, 7, 7] | 14 | `e1cdc597cf1e` | = |
| `pod` | batch6-reproduction-dispersal | 9×11 | [69, 127, 9, 11] | 65 | `3af69d8efe75` | = |

## 5 · QA

| Check | Result (commit `89a9acc`) |
|---|---|
| `tools/intake-organic-hybrid-art.mjs --check` | OK: 3 files match a clean intake of the 7 PMO-verified deliveries |
| `npm --prefix tools run check:plant-art` | OK: 2 generated files match a clean rebuild |
| **`tools/organic-hybrid-art-intake-check.js`** (new, focused) | **33 / 33**: 21 Node + 12 browser (Chromium: file:// · HTTP / · HTTP /bloom/) · `qa-organic-hybrid-art-intake-check.log` |
| `tools/plant-sprite-pipeline-check.js` (032B1) | **47 / 47** = 36 Node + 11 Chromium. The 58 / 58 baseline = 36 + 11 Chromium + **11 Firefox (not run, see below)** · `qa-plant-sprite-pipeline-check.log` |
| `tools/portable-runtime-check.js` (BLOOM-031) | **42 passed, 3 failed** of the 45 checks this Chromium-only environment can run (71 / 71 needs Firefox). All 3 failures are environmental and occur identically on the untouched baseline `be0a829`. They are P4b (see below), `[firefox] browser launches`, and P12 · P13 (its guided-training child fails only on the Firefox launch; its Chromium half passes). `qa-portable-runtime-check.log`, with the baseline in `qa-portable-runtime-check-baseline-be0a829.log`. The baseline run additionally hit a one-off 180 s Chromium timeout in the full player flow; both candidate runs passed that flow. |
| Broad regression | Not triggered. `dist/` (portable bundle) is byte-identical, `check:portable` reports identical, and no common runtime file changed. The only runtime file touched is the generated plant atlas, which only the review page loads. |

**Focused check coverage:**
* **Intake & art:** S1 exact start · S2 production boundary (every file in content/, planets/, index.html, dist/, resources/ except the generated atlas and the page's own script / style, the contract, body plan and the proof packs is byte-identical; `plant-specimen.js` is not replaced) · S3 no production surface loads the atlas · S4 body plan unchanged · I1 PMO hashes · I2 55 sprites, no 56th · I3 every anchor / point / mask / closure value · I4 18 materials / 69 colours / environment · I5 pixel integrity · I6 binary alpha · I7 material · shade mapping, no unknown colour · I8 anchors, points, no sprite / mask clipping, static clip proof · I9 deterministic intake + build, check:plant-art.
* **Organism & FX:** R1 all 28 required states render, unclipped and distinct · R2 art cap Drought / Flood T4 · T5 · T9 == T3 · R3 / R4 maximal legal dry / wet fit for every Cold / Heat split, thriving and strained (min margin 2 px) · R5 Cold ≠ Salt in real pixels · R6 previews · R7 GROW / DISSOLVE / reduced motion for the 7 required transitions end byte-for-byte on the target · G1 no gameplay / trait / balance change.
* **Browser (B1–B6):** boot, labels, browser == Node pixels for every state and pack · offline · final-vs-SVG on identical state · real room sizes · preview on / off · the 7 purchases in the page in every pack.

**Not run in this environment (stated plainly):**
* **Firefox.** Playwright's Firefox is not installed here, and downloading it is blocked by the session's network policy (`cdn.playwright.dev` → 403).
  Every browser check ran in Chromium only. The Firefox half of the 032B1 check (11) and of the portable check was not executed.
  Run `node tools/organic-hybrid-art-intake-check.js` and `node tools/plant-sprite-pipeline-check.js` (default `--browsers chromium,firefox`) on a machine with Playwright Firefox before acceptance.
* **Portable P4b.** It fails here and on the untouched baseline `be0a829` alike. This container runs as user `root`, and the committed
  `dist/portable/manifest.json` legitimately lists `resources/portable/portable-root.js`, which trips the "no user name in generated files" assertion.
  `dist/` is byte-identical to `be0a829`.

## 6 · Visual QA: for the owner (automated checks are necessary, not sufficient)

Stills are rendered by the review page's own pipeline (browser == Node, byte for byte). Captions name the state.

| # | Still | What to look at |
|---|---|---|
| 01 | `01-base-real-art.png` | BASE at native 1× · 2× · 3× · 4×. Reads clearly from 2×; at 1× the leaves are dark-outlined ovals with a red midrib. |
| 02 | `02-cold-progression-real-art.png` | Cold compactness: open → dense → compact + 2 wool collars → cushion + 3 collars. At T2 / T3 the frost hairs on every tip and margin are **visually heavy**: they cover much of the leaf shapes. |
| 03 | `03-heat-progression-real-art.png` | Heat: wax L1 (sheen on lit shades) + lifted angles · L2 · T3 authored narrow forms + full waxLeaf. L1 is subtle by design. |
| 04 | `04-cold-heat-combination.png` | Every legal temperature split. Wax and frost coexist without conflict. |
| 05 | `05-drought-progression.png` | Storage leaves (CORE) and the TUBER read clearly. T3 uses 3 leaves (accepted leaf set). T4 / T5 / T9 equal T3. |
| 06 | `06-flood-progression.png` | Broad reed leaves, aerial roots T1–T3 and T3 stilt roots. Stilts and aerial roots **cluster tightly at the crown** and read as an orange tangle at 1×–2×. |
| 07 | `07-salt-vs-cold.png` | Warm faceted salt vs blue-white frost: distinct in colour and form. Base notches are 3 px per leaf. |
| 08 | `08-radiation.png` | Base: partial pigment through the **approved** masks. Drought T2 + Radiation: whole-blade pigment via the **contract default**. The treatment is visibly stronger on Drought leaves. This matches the studio's own Batch-5 proof. |
| 09 | `09-reproduction-family.png` | Closed bud vs flower vs dry seed heads + drift vs pods: separate, legible families. |
| 10 | `10-maximal-dry.png` | Maximal legal dry at 1×–4×. Readable; fits with 2 px to spare. |
| 11 | `11-maximal-wet.png` | Maximal legal wet at 1×–4×. Fits, but it is the **most crowded** state: pods, pigmented flood leaves, frost and crystals overlap in the lower half. |
| 12 | `12-current-svg-vs-organic-hybrid.png` | The page's Final vs production SVG view: BASE · Drought T3 · Flood T3 · maximal dry, identical state. |
| 13 | `13-real-room-sizes.png` | One 84×98 organism at native 1× · 1024 → 2× · 1280 → 3× · 1440 → 3× · Field Journal 3× · 4× zoom. |
| 14 | `14-preview.png` | GHOST / OUTLINE preview (Base → Cold T1) beside the production SVG preview. |
| 15 | `15-grow-fx-strip.png` | GROW for the 7 required transitions (preview, then t = 0 … 1) + DISSOLVE (Drought T2 → Radiation). t = 1 is exactly the target. |

**Owner / PMO decisions requested before production replacement:**
1. Accept `auto` (whole-blade) pigment on Heat / Drought / Flood leaf drawings, or commission authored pigment masks for them?
2. Accept Salt teeth on Base leaves only, or commission toothed masks for other leaf forms?
3. Cold T2 / T3 frost density: acceptable, or ask the studio for lighter hair sprites?
4. Flood T3 root crowding at the crown, and the maximal-wet lower-half density: acceptable at room sizes?

## Files

`art-intake-proof.json` holds every check, the package hashes, per-sprite source → atlas signatures, every state's components, layout,
bbox and signatures, art-cap and FX results. The QA logs are `qa-*.log`.
Correction to old evidence: `docs/evidence/bloom-032b1/REPORT.md` now says "18 materials" (was "15"); nothing else there changed.
