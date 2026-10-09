# Plant Sprite Pipeline v1 — BLOOM-032B1 (production pipeline proof)

**Status:** pipeline PROOF + the COMPLETE locked Organic Hybrid art contract. It stops at the handoff gate. Branch `handoff/bloom-032b1-review`,
from accepted production main `bba000f` (BLOOM-031). Nothing in production changed: `resources/run-ui/plant-specimen.js` still draws
the plant in every room.

**Scope.** 032B1 builds and proves the production plant SPRITE PIPELINE and the contract the art arrives in. It does **not** produce final art.
The Plant Pixel Art Studio has locked the Organic Hybrid mutation language and an approved Base Species Kit design. Approved PNGs + metadata
come back through the [ARTIST_HANDOFF](#artist_handoff) contract below for **mechanical** integration. That art is not ingested here. Every
sprite in this branch is **TEMPORARY PIPELINE PROOF — NOT FINAL ART** and must not be judged as art.

**Revision 2 (locked vocabulary).** The PMO accepted the architecture and asked for the contract to cover the full locked species. This
revision expands the contract from the earlier 11-component golden slice to **34 components** (+ 3 treatments) and **4 body-plan layouts /
117 sockets**: Cold T1–T3, Heat T1–T3, Cold + Heat stacking, Drought T1–T3 and Flood T1–T3 (gameplay ≥ 3 draws as T3), Salt, Radiation,
Seed Output T1/T2, Early Maturity and Waterborne Seeds. It proves that both **maximal legal** organisms fit the approved 84×98 canvas.

---

## 1. What the pipeline is

```
real state (trait tiers, condition)
  → plant-visual-model.js     normalized VISUAL MODEL (numbers per visual axis; no sprite, no pixel)
  → plant-components.js       COMPONENT SELECTION (component ids + layout + treatments) — the only trait→look rules
  → plant-compositor.js       SKELETON from art/plant/body-plan.json (sockets) → AUTHORED SPRITES placed by anchor
                              + PROCEDURAL stem / branches / roots → TREATMENTS through masks → environment → RGBA
  → plant-fx.js               PREVIEW (ghost / outline diff) and MUTATION FX (grow / dissolve / reduced-motion swap)

art/plant/packs/<pack>/atlas.png + atlas.json  ──tools/build-plant-art.mjs──▶  resources/plant-visual/generated/plant-atlas.js (+ manifest)
```

| Piece | File | Owns |
|---|---|---|
| Engine contract | `art/plant/contract.json` | canvas, materials, treatments, layers, orientations, angles, attach categories, component registry |
| Body plan | `art/plant/body-plan.json` | where every socket is (stem height/width/bend, leaf sockets, branches, roots) — data, not code |
| Art packs | `art/plant/packs/<pack>/atlas.png` + `atlas.json` | every authored pixel + its metadata |
| Schema | `art/plant/schema/plant-atlas.schema.json` (+ `example-sprite-entries.json`) | machine-readable structure of `atlas.json` |
| Build | `tools/build-plant-art.mjs` | validate + convert source art → generated runtime; static clip proof; size budget |
| Generated runtime | `resources/plant-visual/generated/plant-atlas.js`, `plant-atlas-manifest.json` | committed; never hand-edited |
| Model | `resources/plant-visual/plant-visual-model.js` | real traits → visual axes (`cold T2 → architecture.compact 2, surface.frost 2`; water arms capped at T3 art) |
| Selector | `resources/plant-visual/plant-components.js` | axes → layout + primary leaf + heat modifier + surface overlays + reproductive components + treatments |
| Compositor | `resources/plant-visual/plant-compositor.js` | skeleton, placement, procedural connective tissue, treatments, compose, signatures |
| FX | `resources/plant-visual/plant-fx.js` | diff, ghost/outline preview, grow, dissolve, reduced motion |
| Proof page | `demos/plant-sprite-pipeline-lab.html` + `resources/plant-sprite-lab/` | engineering review page |
| QA | `tools/plant-sprite-pipeline-check.js` | 36 Node + 22 browser checks (Chromium + Firefox) |

**Rule separation.** The renderer (compositor + FX) names no trait, tier rule, price or `BLOOM_DATA`. The QA greps for this. It draws whatever
component ids it is handed. Changing what a trait looks like is a change to the selector (and art), never to the renderer.

**What was kept from 032A, what was replaced.** 032A's architecture is kept: real state → model → skeleton/anchors → parts → organism →
preview/FX diff. Its art method is replaced: no runtime leaf rasterization and no text-string sprites. The 032A lab
(`handoff/bloom-032a-review`, c561a34) is untouched, and none of its files are in this branch.

## 2. The canonical canvas: 84 × 98
**84 × 98 is the PMO-approved production target.** The specimen boxes were measured in production (1024×768 → 205×237; 1280×800 →
258×298; 1440×900 → 290×335; Field Journal report → 296×342). The largest whole-number nearest-neighbour scale that fits each box:

| Canvas | 1024 room | 1280 room | 1440 room | Field Journal |
|---|---|---|---|---|
| 96×112 | 2× (192×224) | 2× (192×224) | 2× (336 > 335 by 1 px) | 3× |
| **84×98** | 2× (168×196) | **3× (252×294)** | **3× (252×294)** | 3× (252×294) |

Every placement shows **the same 84×98 buffer**: the UI only picks the integer scale and pads. QA B3 proves the pixel signature is identical at
native 1×, 2×, 3×, 3×, 3× and a 4× zoom.

**The approval condition is met:** the full locked vocabulary fits. The MAXIMAL LEGAL DRY and MAXIMAL LEGAL WET organisms compose inside 84×98
for **every** legal split of the temperature pool (Cold 3 + Heat 0, 2 + 1, 1 + 2, 0 + 3), in every pack, thriving and strained. Every required
component is present, no pixel is clipped, and at least 1 px stays clear of every edge (QA N8, N9; numbers in `pipeline-proof.json →
maximalDRY / maximalWET`). Only reasonable socket/layout work was needed (four cold layouts; leaf sets with fewer, larger leaves for
storage and reed forms; low pod stalks). No enlargement was needed.

## 3. Model (plant-visual-model.js)
Reads `BLOOM_DATA.traits` and `config.scales.tempCap` for legal tiers only. Output = the locked visual axes:

| Trait (real tiers) | Visual axes |
|---|---|
| cold T1–T3 | `architecture.compact = n` (body / layout) + `surface.frost = n` (insulation) |
| heat T1–T3 | `leaf.heat = n` (orientation / heat leaf form) + `surface.wax = n` |
| drought T*n* (uncapped) | `leaf.water = { arm: "drought", tier: min(n, 3) }`, `roots.storage = min(n, 3)` |
| flood T*n* (uncapped) | `leaf.water = { arm: "flood", tier: min(n, 3) }`, `roots.aerial = min(n, 3)` |
| salt | `surface.salt = 1` |
| rad | `surface.pigment = 1` |
| seedOut T1–T2 | `repro.seedHead = n` |
| earlyMat | `repro.flower = 1` |
| waterSeeds | `repro.pods = 1` |

Cold + Heat share the real temperature pool (cold + heat ≤ tempCap 3) and **coexist**. Drought and Flood are one water arm (illegal
together). Water-arm tiers above 3 are reported in `capped` and draw **exactly** as T3, because the anatomy key never contains the raw tier
(QA N5).

## 4. Component selection (plant-components.js)
Compatible axes **stack**; there is no whole-plant combination table:

| Axis | Selection |
|---|---|
| 1 BODY / LAYOUT | cold 0 / 1 / 2 / 3 → layout `open` / `dense` / `compact` / `cushion` (body-plan data) |
| 2 PRIMARY LEAF | `leaf.base` · `leaf.drought.1–3` · `leaf.flood.1–3` (one at a time), on the body plan's leaf set for that structure |
| 3 HEAT MODIFIER | heat 1: authored angle step +1 capped at mid · heat 2: +1 · heat 3: the active structure's **`.heat`** variant (+1); plus treatment `wax` level 1–3 |
| 4 SURFACE | frost 1 → `frost.hair.1` on leaf tips · frost 2/3 → `frost.hair.2/3` on tips + margins + `frost.collar.2/3` on the layout's collar nodes |
| | salt → `salt.crystal` on leaf tips + `salt.gland` on margin point 1 + treatment `toothed`; with frost too, hairs move to margin points 0 and 2 |
| | rad → treatment `pigment` |
| 5 REPRODUCTIVE | always `bud.axil` (closed axillary buds); apex: `bud` (BASE: closed, never open) / `flower` / `seedHead.small` (T1) / `seedHead.large` (T2) |
| | earlyMat with a seed head → `flower` moves to `flower.1`; seedOut 2 → + 2 × `seedHead.small` + 3 × `seed.drift`; waterSeeds → 2 × `pod` |
| ROOTS | storage 1/2/3 → deeper procedural taproot (+ `root.storage.2` / `.3`); aerial 1/2/3 → `root.aerial.1/2/3` on 2/3/4 aerial anchors; aerial 3 → + `root.stilt` ×2 |
| condition strained | posture −1 (one authored angle variant lower) + a restrained colour shift |

## 5. Compositor (plant-compositor.js)
* **Skeleton** = integer geometry from `body-plan.json`: per layout, the stem path (height, width taper, bend), leaf sockets, stem nodes, collar
  nodes, axils, apex, flower / seed-head / pod branches, drift points and stilt anchors; shared root crown, primary root, aerial anchors and lateral
  roots. `sockets()` is also what the build tool loads for its clip proof and size budget. There is one source of truth (QA R5).
* **Placement**: the skeleton chooses the socket; the sprite owns its pixels; the sprite's `anchor` pixel lands exactly on the socket (QA R5).
  **Leaf-point** details (frost hairs, salt crystals / glands) land on the `points` the active **leaf drawing** declares.
* **Angles**: the selection's `{ shift, cap }` picks another **authored** angle variant per socket (heat lifts, strain droops). Nothing rotates.
* **Procedural only where it connects**: stem, side branches (flower, seed heads, pod stalks), primary and lateral roots.
* **Draw order** = contract layer × 100 + `order` (+ leaf index bottom → top).
* **Treatments** (`contract.treatments`): `recolour` (pigment; wax with per-level shade filters 1: shades 2–3 · 2: 1–3 · 3: all) applied
  through each sprite's mask, and `clear` (toothed: pixels in the authored notch mask are cut). The procedural stem takes `pigment`.
* **Signatures**: `sig.anatomy` (plant buffer) and `sig.full` (RGBA). Browser canvases are byte-identical to Node renders (QA B1).

## 6. Generated runtime

`plant-atlas.js` is a classic script that sets `BLOOM.plantArt`. Each sprite's pixels are stored as base64 bytes, one per pixel, equal to
`material id × 4 + shade` (0 = transparent). It is indexed, not RGBA, so treatments and condition can recolour by material. Mirrored left
twins are **baked by the build**, so nothing is flipped at runtime. Why it is generated instead of loaded as a PNG at runtime: exact,
synchronous pixels; no canvas / `file://` / cross-origin decode; trivial pixel diffs for preview and FX; the portable runtime can bundle it.
The build header and manifest carry a SHA-256 fingerprint over every input (contract, body plan, compositor, every atlas PNG + JSON and the
build script). There is no timestamp and no path. A clean rebuild is byte-identical (QA D1–D3; `check:plant-art`).

## 7. Preview + mutation FX (plant-fx.js)

Kept from 032A: the diff of CURRENT vs PROPOSED indexed buffers **is** the mutation. There is no per-trait animation code.

* **GHOST / OUTLINE preview**: proposed pixels at a pale half-presence; pixels that would go thinned to a dither; a 1-px gold trace around the
  changed region. It is static (no motion needed) and never mutates a frame, so **cancel = repaint current, exactly** (QA F1, B4).
* **GROW** (the PMO-approved **default** purchase FX): changed pixels appear outward from the attachment anchors of the new or changed placements, with a bright leading edge (620 ms). A
  pure recolour (pigment) grows from the root crown.
* **DISSOLVE** (secondary, kept for component replacement / removal): an ordered 4 × 4 dither biased outward from the anchors (560 ms).
* Both start on the current frame, touch only changed pixels, and end **exactly** on the target (QA F2, B5). The 032A pulse / bloom / glow /
  flip variants were dropped as the two weaker pairs.
* **Reduced motion**: a direct swap: one frame, the target (QA F3, B5).

## 8. File:// / HTTP / Pages / portable

Everything is a classic script with no fetch, no image decode and no dynamic import, so it works double-clicked (`file://`), over HTTP at `/`
and under the GitHub Pages project subpath `/bloom/` (QA B1, B2 in Chromium + Firefox, zero external requests). When production adopts it:
`tools/build-pages-site.mjs` (unchanged) already ships `resources/` (so the generated atlas goes up automatically), and esbuild, the portable
runtime's bundler, bundles the scripts as plain imports with the identical atlas (QA P1). BLOOM-031's `check:portable` still passes.

## 9. The proof page — `demos/plant-sprite-pipeline-lab.html`
An **engineering** page that shows what the pipeline can do. It is not an art review. A red **TEMPORARY PIPELINE PROOF — NOT FINAL ART** banner
is always visible, and every pack panel repeats it.

* **Pipeline + pack swap** (default): the neutral PIPELINE PROOF pack, two throw-away silhouette packs (`proof-angular`, `proof-round`) that exist
  only to prove the renderer is style-agnostic, and the current production SVG, all with the same build, at native / room / Field Journal sizes.
* **All placements**: the same organism at native 1×, 1024 (2×), 1280 (3×), 1440 (3×), Field Journal (3×) and a 4× zoom.
* **All locked states**: BASE · Cold T1–T3 · Heat T1–T3 · Cold T2 + Heat T1 · Drought T1–T4 · Flood T1–T4 · Salt · Radiation · Seed Output
  T1/T2 · Early Maturity · Waterborne Seeds · MAXIMAL LEGAL DRY · MAXIMAL LEGAL WET (24 presets).
* **Propose** any real next tier (real legal rules; the water arms stop at the T3 art cap) → **Preview (V)** ghost/outline → **Purchase (B)**
  with grow (default) or dissolve; reduced-motion toggle; condition thriving / strained. Keys 1–9 select the first nine presets.

## 10. QA — `tools/plant-sprite-pipeline-check.js`
`NODE_PATH="$(npm root -g)" node tools/plant-sprite-pipeline-check.js [--browsers chromium,firefox] [--evidence]`. **58/58** on this
branch (36 Node + 22 browser). The original 46 checks are kept and updated to the locked vocabulary; the 12 new ones are N1–N12.
Node: S1 exact base · S2 no production/gameplay file changed · S3 032A untouched · S4 npm scripts, no new dependency · A1–A3 real PNG
atlases, rects/anchors/points/masks valid, packs labelled temporary · A4 the validator **rejects** 12 kinds of broken art · A5 schema conformance ·
D1 deterministic · D2 committed == clean rebuild · D3 no timestamp/path · D4 no sprite authored in JS · R1 one canvas · R2 rule separation ·
R3 all 24 states distinct (only T4 = T3) × 3 packs · R4 every state unclipped (runtime + static) · R5 anchors on sockets, one socket table ·
R6 pack swap = same skeleton, new pixels · R7 pigment via masks, posture via authored angles · F1 preview/cancel · F2 grow/dissolve exact ·
F3 reduced motion · **N1** every locked trait/tier normalizes; all 24 states legal · **N2** all 34 component slots exist + every pack covers
them · **N3** Cold + Heat stack on one organism · **N4** Drought/Flood exclusive · **N5** T4/T5/T9 == T3 art · **N6** Salt ≠ Cold families ·
**N7** pods on real sockets · **N8** maximal DRY fits 84×98 (4 temperature splits × 3 packs × 2 conditions, ≥ 1 px margin) · **N9** maximal
WET fits · **N10** complete socket table inside the canvas + static proof of every placement · **N11** preview for every mutation class ·
**N12** grow/dissolve exact for structural, surface, reproductive; reduced motion exact · G1 no trait data changed · P1 Pages/portable ·
H1 handoff doc complete + socket table == manifest. Browser ×2 (file:// · HTTP / · HTTP /bloom/): B1 boots, every locked state's pixels ==
Node · B2 no external request · B3 same organism at every placement · B4 preview on/off exact · B5 grow/dissolve/reduced land exactly ·
B6 production reference · B7 keyboard.

---

## LOCKED ORGANIC HYBRID VOCABULARY (what the contract encodes)

| Trait | Tier | Locked look | Contract slots (components / treatments) | Category |
|---|---|---|---|---|
| BASE | — | Organic Hybrid body plan, moderately asymmetric; closed apical + axillary buds; NO open flower, NO seed head | `leaf.base` · `bud` · `bud.axil` · procedural stem / roots | structural + reproductive |
| Cold | T1 | early fine frost hairs, light insulation, slightly denser | layout `dense` · `frost.hair.1` on leaf tips | layout + surface |
| | T2 | approved compact architecture, stronger hairs, woolly collars | layout `compact` · `frost.hair.2` tips + margins · `frost.collar.2` | layout + surface |
| | T3 | strongest compact form, densest insulation | layout `cushion` · `frost.hair.3` · `frost.collar.3` ×3 | layout + surface |
| Heat | T1 | waxy sheen, subtle orientation change | `wax` level 1 (lit shades) · angle +1 capped at mid | surface |
| | T2 | stronger cuticle, more upright, less exposed surface | `wax` level 2 · angle +1 | surface |
| | T3 | strongest heat form: narrow / upright authored leaves | `leaf.<structure>.heat` · `wax` level 3 · angle +1 | structural variant + surface |
| Cold + Heat | e.g. T2 + T1 | Cold architecture / insulation + Heat surface / orientation on ONE organism | the two axes stack (QA N3) | — |
| Drought | T1 | thicker storage-oriented leaves | `leaf.drought.1` · deeper taproot | structural |
| | T2 | succulent leaves, storage tissue, tuber | `leaf.drought.2` (leaf set 0,1,3,4) · `root.storage.2` | structural |
| | T3 (≥ 3) | strongest storage form, most compact foliage | `leaf.drought.3` (leaf set 0,1,4) · `root.storage.3` · deepest taproot | structural |
| Flood | T1 | wider / softer wetland leaf, first breathing roots | `leaf.flood.1` · `root.aerial.1` ×2 | structural |
| | T2 | longer strap leaves, stronger breathing roots | `leaf.flood.2` · `root.aerial.2` ×3 | structural |
| | T3 (≥ 3) | tall strap / reed form, stilt / snorkel roots | `leaf.flood.3` (leaf set 0–3) · `root.aerial.3` ×4 · `root.stilt` ×2 | structural |
| Salt | 1 | glands / nodules, toothed margins, larger FACETED crystals — never snow | `salt.gland` · `salt.crystal` · `toothed` mask (family `salt`, material `salt`) | surface |
| Radiation | 1 | protective red / violet pigment on leaves + stem | `pigment` treatment + optional masks | surface |
| Early Maturity | 1 | the first unmistakable OPEN flower | `flower` | reproductive |
| Seed Output | T1 | first developed dry seed head | `seedHead.small` (apex) | reproductive |
| | T2 | larger / multiple dry heads, visible seeds | `seedHead.large` + 2 × `seedHead.small` + 3 × `seed.drift` | reproductive |
| Waterborne | 1 | buoyant pods / fruit (≠ flower, ≠ dry head) | `pod` ×2 on low pod stalks | reproductive |

**Maximal proofs** (QA N8 / N9, evidence `06-maxDry-…`, `07-maxWet-…`): MAXIMAL LEGAL DRY = Cold 2 + Heat 1 + Drought 3 + Salt +
Radiation + Seed Output 2 + Early Maturity + Waterborne Seeds; MAXIMAL LEGAL WET = the same with Flood 3. Both are also proven with the
other three temperature-pool splits.

---

<a id="artist_handoff"></a>
## ARTIST_HANDOFF — the asset-authoring contract

This section is the contract the Plant Pixel Art Studio (or any artist) targets, for the COMPLETE locked Organic Hybrid species (above). If the approved art follows it, integration is:
**drop the folder in, run one command, commit.** The machine-readable halves are `art/plant/contract.json` (engine rules),
`art/plant/body-plan.json` (socket geometry), `art/plant/schema/plant-atlas.schema.json` (metadata structure) and
`art/plant/schema/example-sprite-entries.json` (annotated examples). `tools/build-plant-art.mjs` enforces all of it and refuses anything else
with a specific error message.

### H1. Canonical logical canvas
**84 × 98 logical pixels** (PMO-approved production target), y down. Soil line = **row 68**. Rows 0–67 are above ground (sky); rows
68–97 are the soil cutaway. The stem crown is at **(42, 68)**. Every placement shows this exact canvas at a whole-number scale (§2). Design
for 1 logical pixel = 1 art pixel; there is no sub-pixel detail, no anti-aliasing and no smooth scaling.

### H2. Atlas pixel format
One PNG per pack: `art/plant/packs/<pack>/atlas.png`. 8 bits per channel; colour type RGBA, RGB, indexed (with tRNS) or grey; **not
interlaced**. Any atlas size. Sprites are packed anywhere in it, in non-overlapping rectangles (leave a 1–2 px gutter for your own sanity).
An optional **swatch strip** (rect in `atlas.json` → `swatch`) showing the palette is recommended; if present it must show exactly the declared
palette.

### H3. Transparency
Every pixel is fully transparent (alpha 0) or fully opaque (alpha 255). **No partial alpha, no soft edges, no glow, no drop shadow.** No opaque
pixel may sit outside a declared rect (sprite, mask or swatch).

### H4. Palette — arbitrary RGBA is NOT allowed
Every opaque sprite pixel must be **exactly** one of the pack's declared palette colours (`atlas.json → palette`). A colour means a
**material + shade**, which is what lets the engine apply Radiation pigment, Heat wax and stress by material. Materials (contract order):

| Material | Shades | Use in sprites |
|---|---|---|
| `ink` | 1 | outlines / dark accents |
| `leaf` | 4 (0 darkest → 3 lightest) | leaf blades |
| `stem` | 4 | petioles, stalks (the renderer also draws the main stem in these) |
| `root` | 4 | breathing / stilt roots (the renderer draws the main roots in these) |
| `core` | 4 | water-storage tissue (drought leaves) |
| `petal`, `center` | 4 each | the open flower |
| `pappus`, `seed` | 4 each | dry seed heads, drifting seeds |
| `frost` | 4 | COLD only: hairs, wool |
| `tuber` | 4 | storage roots |
| `salt` | 4 | SALT only: glands, faceted crystals (must never read as frost) |
| `pod` | 4 | waterborne pods / fruit |
| `pigLeaf`, `pigStem`, `pigCore` | 4 each | **treatment targets only, never drawn**: leaf / stem / storage tissue under Radiation pigment |
| `waxLeaf`, `waxCore` | 4 each | **treatment targets only**: leaf / storage tissue under the Heat wax cuticle |

All are required. Every colour must be unique across the whole pack, written `#rrggbb` lower-case. The palette is the art studio's choice,
with one engine requirement: **shade 0 → 3 runs dark → light** within each material, because treatments map shade-for-shade and Heat T1 wax
touches only shades 2–3. The pack also gives the specimen-box `environment` colours (sky top/bottom, two soil strata + pebble, turf) and
optionally `render.stemOutline` (`self` | `ink` | `none`) for the procedural stem.

### H5. Sprite source rectangle
`"rect": [x, y, w, h]` in atlas pixels, top-left origin. It must be inside the image, must not overlap any other rect, must not be empty,
and must not exceed the component's `maxSize` (H14).

### H6. Anchor coordinate convention
`"anchor": [ax, ay]` is relative to the rect's top-left pixel (0-based) and names **the one pixel that is placed exactly on the socket**.

| Kind | Anchor |
|---|---|
| leaves, every structure and `.heat` variant (drawn facing right) | the petiole's first pixel, the one that touches the stem |
| bud, flower, seed heads | the bottom pixel of the stalk (sits on the apex / branch tip) |
| `bud.axil` (facing right) | its stalk's first pixel, on the stem's edge |
| leaf-point details (`frost.hair.*`, `salt.crystal`, `salt.gland`) | the pixel that sits ON the leaf's tip / margin point (usually the bottom-centre) |
| `frost.collar.*` | its centre pixel (on the stem's centre line at the node); leave the stem's 3–5 centre columns transparent |
| `root.storage.*` | its top-centre pixel (hangs down from the primary-root socket, over the procedural root) |
| `root.aerial.*` | its BOTTOM pixel, which is buried one row into the soil (anchor row 69); it rises upward |
| `root.stilt` (facing right) | its top-left pixel on the stem's edge 9 rows above the soil; it must reach the soil (≥ 10 rows tall) |
| `pod` | its stalk's top pixel (the pod hangs below the stalk tip) |
| drifting seed | the seed pixel |

### H7. Layer / z-order
Draw order = `layer` value × 100 + `order` (+ leaf index for leaves, bottom → top). Layers (`contract.json → layers`):
`roots 10 · aerialRoots 15 · rootStorage 20 · stem 30 · branch 35 · leaves 40 · surface 50 · repro 60 · drift 70`. `roots`, `stem` and
`branch` are procedural. Each component has a fixed layer (H10); `order` (integer, default 0) is a tie-break inside it.

### H8. Legal orientation ids
`right`: faces / grows toward +x from its anchor; with `"mirror": true` the build bakes the left twin (`@left`).
`left`: an explicitly authored left-facing variant of the same id; it replaces the baked mirror (use it for asymmetric designs).
`up`: upright, centred on its anchor, never mirrored. `down`: hangs below its anchor, never mirrored.
**No rotation ever happens at runtime.** Every angle is an authored drawing (H15).

### H9. Naming convention
`id` = the component id, plus `.angle` for angled components: `leaf.base.low|mid|high`, `leaf.drought.2.mid`, `leaf.flood.3.heat.high`,
… Non-angled: `root.storage.2`, `root.aerial.3`, `root.stilt`, `frost.hair.1`, `frost.collar.3`, `salt.crystal`, `salt.gland`, `bud`, `bud.axil`,
`flower`, `seedHead.small`, `seedHead.large`, `seed.drift`, `pod`. Pack folders are lower-case kebab (`organic-hybrid`) and equal the `pack`
field. Runtime keys become `<id>@right|left|up|down`.

### H10. Trait id / tier association + H11. categories
Each sprite repeats its component's `category`, `family`, `trait`, `tier`, `attach` and `layer`. The build checks them against the
registry, so a typo is caught, not silently drawn. The full registry (34 components) is `art/plant/contract.json → components`:

| Component(s) | Category · family | Trait · tier | Attach · layer | Orientation | Angles | maxSize | Points / masks |
|---|---|---|---|---|---|---|---|
| `leaf.base` | structural · leaf | — · 0 | leafSocket · leaves | right (+mirror) | low, mid, high | 18×16 | tip + 3 margin · pigment, wax, toothed |
| `leaf.drought.1` / `.2` / `.3` | structural · leaf | drought · 1 / 2 / 3 | leafSocket · leaves | right (+mirror) | low, mid, high | 18×16 / 18×16 / 16×16 | same |
| `leaf.flood.1` / `.2` / `.3` | structural · leaf | flood · 1 / 2 / 3 | leafSocket · leaves | right (+mirror) | low, mid, high | 18×16 / 20×20 / 20×20 | same |
| `leaf.<structure>.heat` (7: base, drought.1–3, flood.1–3) | structural · leaf | heat · 3 (`variantOf` the structure) | leafSocket · leaves | right (+mirror) | mid, high | as its structure | same |
| `root.storage.2` / `.3` | structural · root | drought · 2 / 3 | primaryRoot · rootStorage | down | — | 12×20 / 14×24 | — |
| `root.aerial.1` / `.2` / `.3` | structural · root | flood · 1 / 2 / 3 | aerialRoot · aerialRoots | up | — | 5×8 / 5×11 / 7×15 | — |
| `root.stilt` | structural · root | flood · 3 | stiltRoot · aerialRoots | right (+mirror) | — | 12×16 | — |
| `frost.hair.1` / `.2` / `.3` | surface · **frost** | cold · 1 / 2 / 3 | leafPoint · surface | up | — | 3×4 / 5×5 / 7×6 | — |
| `frost.collar.2` / `.3` | surface · **frost** | cold · 2 / 3 | stemNode · surface | up | — | 11×6 / 15×7 | — |
| `salt.crystal` | surface · **salt** | salt · 1 | leafPoint · surface | up | — | 7×7 | — |
| `salt.gland` | surface · **salt** | salt · 1 | leafPoint · surface | up | — | 4×4 | — |
| `bud` | reproductive · bud | — · 0 | apex · repro | up | — | 9×12 | — |
| `bud.axil` | reproductive · bud | — · 0 | axil · repro | right (+mirror) | — | 6×7 | — |
| `flower` | reproductive · flower | earlyMat · 1 | flower · repro | up | — | 16×18 | — |
| `seedHead.small` / `.large` | reproductive · seedHead | seedOut · 1 / 2 | seedHead · repro | up | — | 11×13 / 18×20 | — |
| `seed.drift` | reproductive · seedHead | seedOut · 2 | drift · drift | up | — | 7×7 | — |
| `pod` | reproductive · pod | waterSeeds · 1 | pod · repro | down | — | 9×11 | — |

**Structural** components change anatomy (architecture, primary leaf structure, roots). **Surface** components and treatments decorate it
(frost, wax, salt, pigment). **Reproductive** components occupy the apex / axil / branch / pod sockets. `frost` and `salt` are separate
**families** and separate **materials**: Cold never uses a salt component and Salt never uses a frost component (QA N6). Radiation and Heat
wax are **treatments**, not components.

### H12. Mask format (pigment / wax / …)
In a leaf sprite's metadata: `"masks": { "pigment": "auto" | [x, y], "wax": "auto" | [x, y], "toothed": [x, y] }`.
`"auto"`: every pixel of a recolourable material (pigment: leaf → pigLeaf, stem → pigStem, core → pigCore; wax: leaf → waxLeaf, core →
waxCore). `[x, y]`: the top-left of a **mask rect of exactly the sprite's size** elsewhere in the atlas. Any opaque pixel there (any colour;
the proof packs use `#ff00ff` for pigment and `#00c8ff` for teeth) = inside the mask.

* `pigment`, `wax` = **recolour** shade-for-shade, so silhouettes never move. Wax additionally filters by level: Heat T1 changes only shades
  2–3, T2 shades 1–3, T3 every shade.
* `toothed` = **clear**: the masked pixels are CUT from the drawing when Salt is owned (notches in a toughened margin). It must be an authored
  rect (`"auto"` is rejected). Omit it on leaf forms where teeth are inappropriate (the proof packs omit it on succulent and reed leaves).

Mask rects follow the same no-overlap / in-bounds rules. Left twins get their masks mirrored by the build. A recolour treatment whose
target ramp is missing is reported (`unrendered`).

### H13. Exact attachment sockets available
From `art/plant/body-plan.json`, regenerated into `resources/plant-visual/generated/plant-atlas-manifest.json → sockets` (117 sockets, each
with its room to the four canvas edges) on every build. Coordinates are canvas pixels. Cold selects the layout column.

| Socket | Attach | Side · angle | open | dense (Cold T1) | compact (Cold T2) | cushion (Cold T3) |
|---|---|---|---|---|---|---|
| leaf.0 | leafSocket | left · low | 41, 61 | 41, 62 | 40, 65 | 39, 66 |
| leaf.1 | leafSocket | right · low | 45, 55 | 45, 57 | 45, 62 | 45, 64 |
| leaf.2 | leafSocket | left · mid | 42, 48 | 42, 51 | 41, 58 | 40, 60 |
| leaf.3 | leafSocket | right · mid | 45, 41 | 45, 46 | 46, 54 | 46, 57 |
| leaf.4 | leafSocket | left · high | 41, 35 | 41, 40 | 41, 49 | 41, 54 |
| leaf.5 | leafSocket | right · high | 43, 29 | 43, 35 | 44, 45 | 46, 50 |
| stemNode.0 | stemNode | — | 43, 61 | 43, 62 | 42, 65 | 42, 66 |
| stemNode.1 | stemNode | — | 43, 55 | 43, 57 | 42, 62 | 42, 64 |
| stemNode.2 | stemNode | — | 44, 48 | 44, 51 | 43, 58 | 42, 60 |
| stemNode.3 | stemNode | — | 43, 41 | 43, 46 | 43, 54 | 43, 57 |
| stemNode.4 | stemNode | — | 42, 35 | 42, 40 | 43, 49 | 43, 54 |
| stemNode.5 | stemNode | — | 41, 29 | 41, 35 | 42, 45 | 43, 50 |
| axil.0 | axil | right | 46, 51 | 46, 54 | 46, 55 | 46, 58 |
| axil.1 | axil | left | 41, 38 | 42, 43 | — | — |
| apex | apex | — | 42, 21 | 42, 27 | 42, 37 | 42, 43 |
| flower.0 | flower | — | 42, 21 | 42, 27 | 42, 37 | 42, 43 |
| flower.1 | flower | right | 53, 23 | 53, 28 | 54, 36 | 54, 42 |
| seedHead.0 | seedHead | — | 42, 21 | 42, 27 | 42, 37 | 42, 43 |
| seedHead.1 | seedHead | left | 31, 31 | 31, 35 | 30, 42 | 31, 47 |
| seedHead.2 | seedHead | right | 56, 40 | 56, 43 | 57, 49 | 57, 53 |
| pod.0 | pod | left | 34, 58 | 34, 59 | 32, 59 | 30, 61 |
| pod.1 | pod | right | 54, 52 | 54, 54 | 55, 56 | 56, 58 |
| drift.0 | drift | — | 52, 10 | 52, 16 | 52, 26 | 52, 32 |
| drift.1 | drift | — | 59, 16 | 59, 22 | 59, 32 | 59, 38 |
| drift.2 | drift | — | 30, 12 | 30, 18 | 30, 28 | 30, 34 |
| stilt.0 | stiltRoot | left | 41, 59 | 41, 59 | 41, 59 | 41, 59 |
| stilt.1 | stiltRoot | right | 45, 59 | 45, 59 | 46, 59 | 46, 59 |
| collar.0 | stemNode | — | — | — | 43, 60 | 42, 62 |
| collar.1 | stemNode | — | — | — | 43, 51 | 43, 56 |
| collar.2 | stemNode | — | — | — | — | 42, 49 |

| Shared socket | Attach | At (x, y) |
|---|---|---|
| rootCrown | rootCrown | 42, 68 |
| primaryRoot | primaryRoot | 42, 70 |
| aerial.0 | aerialRoot | 35, 69 |
| aerial.1 | aerialRoot | 50, 69 |
| aerial.2 | aerialRoot | 30, 69 |
| aerial.3 | aerialRoot | 55, 69 |

* `leaf.i`: the petiole socket on the stem's edge. Structures with a leaf set use only those indices (`drought.2` → 0, 1, 3, 4;
  `drought.3` → 0, 1, 4; `flood.3` → 0, 1, 2, 3; all others use 0–5). The angle is the socket's, stepped by Heat (+1) or strain (−1).
* `stemNode.i`: the stem centre at leaf node i. `collar.i`: wool-collar nodes (compact: 2, cushion: 3). `axil.i`: closed axillary buds.
* `flower.0` / `seedHead.0` = the apex; `flower.1`, `seedHead.1–2` and `pod.0–1` are side-branch tips (stalks are procedural).
* `stilt.i`: 9 rows above the soil on the stem's left / right edge. `aerial.0–3`: on the soil line (row 69 = buried one pixel) at crown x −7, +8,
  −12, +13. Flood T1 uses aerial 0–1, T2 0–2, T3 0–3 (+ both stilts).
* **Leaf tips and margins** are not body-plan sockets. Each leaf drawing declares `points.tip` and exactly **three** `points.margin` (upper edge,
  base → tip). The selector uses: Cold T1 → tip; Cold T2/T3 → tip + all margins; Salt → crystal on the tip, gland on margin 1; Salt + Cold →
  hairs on margins 0 and 2.

### H14. Maximum safe sprite dimensions around each socket
Two limits, both enforced by the build:
1. **Per component**: `maxSize` (H10), the hard bounding box for any variant.
2. **Per socket**: placed at its anchor, a sprite must stay inside the canvas at **every** socket it can attach to (and every leaf-point detail
   on every leaf drawing at every leaf socket). The build proves 17 782 placements per pack. The tightest room across all of a component's
   sockets, in all four layouts:

| Component | Attach | maxSize | Max extent from the anchor: left · right · up · down (px, tightest socket) |
|---|---|---|---|
| `leaf.base` | leafSocket | 18×16 | drawn facing right: back 41 · out 37 · up 29 · down 31 |
| `leaf.drought.1` | leafSocket | 18×16 | drawn facing right: back 41 · out 37 · up 29 · down 31 |
| `leaf.drought.2` | leafSocket | 18×16 | drawn facing right: back 41 · out 37 · up 29 · down 31 |
| `leaf.drought.3` | leafSocket | 16×16 | drawn facing right: back 41 · out 37 · up 29 · down 31 |
| `leaf.flood.1` | leafSocket | 18×16 | drawn facing right: back 41 · out 37 · up 29 · down 31 |
| `leaf.flood.2` | leafSocket | 20×20 | drawn facing right: back 41 · out 37 · up 29 · down 31 |
| `leaf.flood.3` | leafSocket | 20×20 | drawn facing right: back 41 · out 37 · up 29 · down 31 |
| `leaf.base.heat` | leafSocket | 18×16 | drawn facing right: back 41 · out 37 · up 29 · down 31 |
| `leaf.drought.1.heat` | leafSocket | 18×16 | drawn facing right: back 41 · out 37 · up 29 · down 31 |
| `leaf.drought.2.heat` | leafSocket | 18×16 | drawn facing right: back 41 · out 37 · up 29 · down 31 |
| `leaf.drought.3.heat` | leafSocket | 16×16 | drawn facing right: back 41 · out 37 · up 29 · down 31 |
| `leaf.flood.1.heat` | leafSocket | 18×16 | drawn facing right: back 41 · out 37 · up 29 · down 31 |
| `leaf.flood.2.heat` | leafSocket | 20×20 | drawn facing right: back 41 · out 37 · up 29 · down 31 |
| `leaf.flood.3.heat` | leafSocket | 20×20 | drawn facing right: back 41 · out 37 · up 29 · down 31 |
| `root.storage.2` | primaryRoot | 12×20 | 42 · 41 · 70 · 27 |
| `root.storage.3` | primaryRoot | 14×24 | 42 · 41 · 70 · 27 |
| `root.aerial.1` | aerialRoot | 5×8 | 30 · 28 · 69 · 28 |
| `root.aerial.2` | aerialRoot | 5×11 | 30 · 28 · 69 · 28 |
| `root.aerial.3` | aerialRoot | 7×15 | 30 · 28 · 69 · 28 |
| `root.stilt` | stiltRoot | 12×16 | drawn facing right: back 42 · out 37 · up 59 · down 38 |
| `frost.hair.1` | leafPoint | 3×4 | rides on leaf tips / margins — proven per drawing by the build |
| `frost.hair.2` | leafPoint | 5×5 | rides on leaf tips / margins — proven per drawing by the build |
| `frost.hair.3` | leafPoint | 7×6 | rides on leaf tips / margins — proven per drawing by the build |
| `frost.collar.2` | stemNode | 11×6 | 41 · 39 · 29 · 31 |
| `frost.collar.3` | stemNode | 15×7 | 41 · 39 · 29 · 31 |
| `salt.crystal` | leafPoint | 7×7 | rides on leaf tips / margins — proven per drawing by the build |
| `salt.gland` | leafPoint | 4×4 | rides on leaf tips / margins — proven per drawing by the build |
| `bud` | apex | 9×12 | 42 · 41 · 21 · 54 |
| `bud.axil` | axil | 6×7 | drawn facing right: back 41 · out 37 · up 38 · down 39 |
| `flower` | flower | 16×18 | 42 · 29 · 21 · 54 |
| `seedHead.small` | seedHead | 11×13 | 30 · 26 · 21 · 44 |
| `seedHead.large` | seedHead | 18×20 | 30 · 26 · 21 · 44 |
| `seed.drift` | drift | 7×7 | 30 · 24 · 10 · 59 |
| `pod` | pod | 9×11 | 30 · 27 · 52 · 36 |

Read it as: from the anchor pixel, the sprite may extend at most that many pixels in each direction. For right-facing sprites, "back" is
toward the stem and "out" is away from it, on either side. Any violation fails the build: `clip: <sprite> at <layout>/<socket> … leaves the
84×98 canvas`. Neighbouring sprites may overlap; that is layering, not clipping. Keep leaves ≲ 16 px long, or adjacent sockets crowd. Stilt
roots must still reach the soil (≥ 10 rows), and aerial roots must keep their bottom pixel in the soil.

### H15. Angle variants the renderer expects
Leaves are drawn at **authored angles**, never rotated: `low` ≈ 10° above horizontal (lower nodes), `mid` ≈ 40°, `high` ≈ 65° (upper nodes,
compact and cushion rosettes). Required per pack, each drawn **facing right** (the left twin is baked, or authored explicitly with
`orientation: "left"`):

* `leaf.base`, `leaf.drought.1–3`, `leaf.flood.1–3`: low + mid + high (21 drawings).
* `leaf.<structure>.heat` (Heat T3 narrow / upright form) for all seven structures: mid + high (14 drawings; may be drawn steeper than the
  standard mid / high).

The renderer then picks per socket: the socket's angle, **+1** for Heat (T1: never above mid; T2/T3: up to high), **−1** under strain. A
component without that angle uses its nearest authored one. Heat T1/T2 therefore change orientation through drawings you already made, and
Heat T3 swaps in the `.heat` drawing of whichever structure is active (base, drought or flood), all with wax on top.

### H16. How source assets become runtime assets
```
art/plant/packs/<pack>/atlas.png + atlas.json
        │  npm --prefix tools run build:plant-art          (Node built-ins only; npm --prefix tools ci not even required)
        ▼  validate (H2–H15) → index every pixel as material·shade → bake left twins + mirrored masks → static clip proof → fingerprint
resources/plant-visual/generated/plant-atlas.js            (BLOOM.plantArt; classic script; committed)
resources/plant-visual/generated/plant-atlas-manifest.json (inputs + hashes, coverage per pack, the socket table)
        │  npm --prefix tools run check:plant-art          (CI / review: committed == clean rebuild, byte for byte)
```
The generated files are never edited by hand. If the build reports an error, fix the PNG or JSON.

### H17. Adding a new sprite without touching renderer code
* **The approved Organic Hybrid pack**: create `art/plant/packs/organic-hybrid/` with `atlas.png` + `atlas.json` covering all 34
  components × angles × sides (H10, H15), run `build:plant-art`, commit the art + the two generated files. The renderer, selector and body
  plan do not change. The pack appears in the proof page automatically. The build lists anything missing.
* **A redrawn sprite**: edit the PNG (and rect/anchor/points if its size changed), rebuild, commit.
* **An explicit left variant / asymmetry**: add a second entry with the same `id` and `"orientation": "left"`.
* **A pigment / wax / teeth mask**: draw a same-size mask rect in the PNG and point `masks.<treatment>` at its top-left.
* **Moving a socket** (e.g. to fit the Base Species Kit's proportions): edit `body-plan.json`; the build re-proves every placement.
* **A new component** (e.g. a second pod variant): this is an **engine** change, not an art change. Add it to `contract.json → components`,
  add one selector line in `plant-components.js`, and then every pack must provide it. The compositor still needs no change for any attach
  category that already exists.

---

## 11. Owner gate — what is (and is not) being asked
032B1 stops here. The PMO has already decided: 84×98 approved (condition met, §2); ghost/outline preview kept; **grow** is the default
purchase FX; dissolve kept as secondary; reduced motion = one direct swap. Remaining PMO steps:

1. Accept the expanded contract (34 components, 3 treatments, 4 layouts / 117 sockets, H1–H17).
2. Hand the Plant Pixel Art Studio this ARTIST_HANDOFF section + `art/plant/` (contract, body plan, schema, examples).
3. Hand back the approved Base Species Kit and the locked mutation art as `art/plant/packs/organic-hybrid/`. Integration is then mechanical
   (H17). If the Base Species Kit's proportions need socket moves, they are `body-plan.json` edits that the build re-proves.

Not started (by instruction): production integration, replacing `plant-specimen.js`, ingesting final art, merging to main.

