# Plant Sprite Pipeline v1 — BLOOM-032B1 (production pipeline proof)

**Status:** pipeline PROOF, stopped at the handoff gate. Branch `handoff/bloom-032b1-review`, from accepted production main
`bba000f` (BLOOM-031). Nothing in production changed: `resources/run-ui/plant-specimen.js` still draws the plant in every room.

**Scope after the PMO course correction.** 032B1 builds and proves the production plant SPRITE PIPELINE. It does **not** produce final art.
Final Botanical / Organic Hybrid / Strange Herbarium art is made by a separate Plant Pixel Art Studio with the owner. That studio targets the
[ARTIST_HANDOFF](#artist_handoff) contract below and hands approved PNGs + metadata back for **mechanical** integration. Every sprite in this
branch is **TEMPORARY PIPELINE PROOF — NOT FINAL ART** and must not be judged as art.

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
| Model | `resources/plant-visual/plant-visual-model.js` | real traits → visual axes (`cold T2 → architecture.compact 2, surface.frost 2`) |
| Selector | `resources/plant-visual/plant-components.js` | axes → component ids, layout, treatments, held/pending reporting |
| Compositor | `resources/plant-visual/plant-compositor.js` | skeleton, placement, procedural connective tissue, treatments, compose, signatures |
| FX | `resources/plant-visual/plant-fx.js` | diff, ghost/outline preview, grow, dissolve, reduced motion |
| Proof page | `demos/plant-sprite-pipeline-lab.html` + `resources/plant-sprite-lab/` | engineering review page |
| QA | `tools/plant-sprite-pipeline-check.js` | 23 Node + 21 browser checks (Chromium + Firefox) |

**Rule separation.** The renderer (compositor + FX) names no trait, tier rule, price or `BLOOM_DATA`. The QA greps for this. It draws whatever
component ids it is handed. Changing what a trait looks like is a change to the selector (and art), never to the renderer.

**What was kept from 032A, what was replaced.** 032A's architecture is kept: real state → model → skeleton/anchors → parts → organism →
preview/FX diff. Its art method is replaced: no runtime leaf rasterization and no text-string sprites. The 032A lab
(`handoff/bloom-032a-review`, c561a34) is untouched, and none of its files are in this branch.

## 2. The canonical canvas: 84 × 98

The brief said to start near 96×112 unless measurements showed a clearly better nearby size. They did. The specimen boxes were measured in
production (1024×768 → 205×237; 1280×800 → 258×298; 1440×900 → 290×335; Field Journal report → 296×342). The largest whole-number
nearest-neighbour scale that fits each box:

| Canvas | 1024 room | 1280 room | 1440 room | Field Journal |
|---|---|---|---|---|
| 96×112 | 2× (192×224) | 2× (192×224) | **2×** (336 > 335 by 1 px) | 3× |
| **84×98** | 2× (168×196) | **3× (252×294)** | **3× (252×294)** | 3× (252×294) |

At 84×98 the plant shows at 3× in three of the four placements, filling about 98 % of the 1280 room box instead of about 75 %. It still leaves room
for leaf, flower and seed-head detail. Every placement shows **the same 84×98 buffer**: the UI only picks the integer scale and pads. QA B3
proves the pixel signature is identical at native 1×, 2×, 3×, 3×, 3× and a 4× zoom. The canvas is one number pair in `contract.json`,
but the body plan's socket coordinates are tied to it.

## 3. Model (plant-visual-model.js)

Reads `BLOOM_DATA.traits` and `config.scales.tempCap` for legal tiers only. Output:

| Trait | Visual axes |
|---|---|
| cold T*n* | `architecture.compact = n`, `surface.frost = n` |
| drought T*n* | `leaf.succulence = n`, `roots.storage = n` |
| rad | `surface.pigment = 1` |
| heat T*n* | `surface.wax = n` (contract slot; not in the golden slice) |
| seedOut T*n* | `repro.seedHead = n` |
| earlyMat | `repro.flower = 1` |
| flood, salt, waterSeeds | `pending` (no art yet; nothing drawn; reported) |

## 4. Component selection (plant-components.js)

| Axis | Components |
|---|---|
| compact ≥ 2 | layout `compact` (short stout stem, low crowded rosette, collar sockets) |
| succulence ≥ 2 / compact ≥ 2 / else | leaf set `leaf.succulent` (body plan's succulent sockets) / `leaf.cold` / `leaf.base` |
| frost 1 / ≥ 2 | `frost.tuft` on every leaf's **tip** / on tip + **margin** points, and `frost.collar` on stem nodes |
| storage 1 / ≥ 2 | deeper procedural taproot / + `root.storage` on the primary-root socket |
| pigment | treatment `pigment`: a recolour through masks, no new component |
| seedHead 1 / ≥ 2 | `seedHead.small` at the apex / `seedHead.large` at the apex + 2 × `seedHead.small` on side branches + 3 × `seed.drift` |
| flower | `flower` at the apex, or at `flower.1` when a seed head holds the apex |
| none of the above | `bud` at the apex |
| condition strained | posture −1 (every leaf uses the next lower **authored** angle variant) + a restrained colour shift |

Tiers above the authored golden slice are **held** at the deepest authored tier and reported in `heldAt` (cold 3 → drawn as 2). Traits
without art are reported in `pending`.

## 5. Compositor (plant-compositor.js)

* **Skeleton** = integer geometry from `body-plan.json`: stem path (height, width taper, bend control points), leaf sockets, apex, flower /
  seed-head / pod branches, drift points, stem nodes, root crown, primary root, lateral roots. `sockets()` is also what the build tool loads
  for its clip proof and size budget. There is one source of truth, and QA R5 proves the manifest table equals the renderer's table.
* **Placement**: the skeleton chooses the socket; the sprite owns its pixels; the sprite's `anchor` pixel lands exactly on the socket (QA R5).
* **Procedural only where it connects**: stem (shaded columns + outline per the pack's `render.stemOutline`), side branches to reproductive
  sockets, primary and lateral roots. No leaf, flower or seed head is ever synthesized.
* **Draw order** = contract layer × 100 + `order` (+ leaf index bottom → top).
* **Treatments** (`contract.treatments`): material → target-material maps (`leaf → pigLeaf`, …), applied shade-for-shade to pixels inside the
  sprite's mask (`"auto"` = every recolourable pixel; `[x, y]` = an authored mask rect). The procedural stem takes `pigment` too.
* **Signatures**: `sig.anatomy` (plant buffer only) and `sig.full` (RGBA). Browser canvases are byte-identical to Node renders (QA B1).

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
* **GROW**: changed pixels appear outward from the attachment anchors of the new or changed placements, with a bright leading edge (620 ms). A
  pure recolour (pigment) grows from the root crown.
* **DISSOLVE**: an ordered 4 × 4 dither biased outward from the anchors (560 ms).
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
  only to prove the renderer is style-agnostic, and the current production SVG, all with the same build. Placement buttons switch between
  native, the three room sizes and the Field Journal size.
* **All placements**: the same organism at native 1×, 1024 (2×), 1280 (3×), 1440 (3×), Field Journal (3×) and a 4× zoom.
* **Golden-slice sheet**: BASE · COLD T2 · DROUGHT T2 · RADIATION · SEED OUTPUT T2 · EARLY MATURITY · COMPLEX.
* **Propose** a real next tier (real legal rules, capped at authored tiers) → **Preview (V)** ghost/outline → **Purchase (B)** with grow or
  dissolve; reduced-motion toggle. Condition thriving / strained. Keys 1–7 select presets.

## 10. QA — `tools/plant-sprite-pipeline-check.js`

`NODE_PATH="$(npm root -g)" node tools/plant-sprite-pipeline-check.js [--browsers chromium,firefox] [--evidence]`. 44/44 on this branch.
Node: S1 exact base · S2 no production/gameplay file changed · S3 032A untouched · S4 npm scripts, no new dependency · A1–A3 real PNG
atlases, rects/anchors/points/masks valid, packs labelled temporary · A4 the validator **rejects** 11 kinds of broken art · A5 schema conformance ·
D1 deterministic · D2 committed == clean rebuild · D3 no timestamp/path · D4 no sprite authored in JS · R1 one canvas · R2 rule separation ·
R3 seven distinct states × 3 packs · R4 complex unclipped (runtime + static) · R5 anchors on sockets, one socket table · R6 pack swap = same
skeleton, new pixels · R7 pigment via masks, posture via authored angles · F1 preview/cancel · F2 grow/dissolve exact · F3 reduced motion ·
G1 no trait data changed · P1 Pages/portable. Browser ×2 (file:// · HTTP / · HTTP /bloom/): B1 boots, pixels == Node · B2 no external
request · B3 same organism at every placement, integer scale · B4 preview on/off exact · B5 grow/dissolve/reduced land exactly · B6 production
reference · B7 keyboard.

---

<a id="artist_handoff"></a>
## ARTIST_HANDOFF — the asset-authoring contract

This section is the contract the Plant Pixel Art Studio (or any artist) targets. If the approved art follows it, integration is:
**drop the folder in, run one command, commit.** The machine-readable halves are `art/plant/contract.json` (engine rules),
`art/plant/body-plan.json` (socket geometry), `art/plant/schema/plant-atlas.schema.json` (metadata structure) and
`art/plant/schema/example-sprite-entries.json` (annotated examples). `tools/build-plant-art.mjs` enforces all of it and refuses anything else
with a specific error message.

### H1. Canonical logical canvas
**84 × 98 logical pixels**, y down. Soil line = **row 68**. Rows 0–67 are above ground (sky); rows 68–97 are the soil cutaway. The stem
crown is at **(42, 68)**. Every placement shows this exact canvas at a whole-number scale (§2). Design for 1 logical pixel = 1 art pixel; there is no
sub-pixel detail, no anti-aliasing and no smooth scaling.

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
| `root` | 4 | (the renderer draws roots in these) |
| `core` | 4 | succulent water-storage tissue |
| `petal`, `center` | 4 each | flowers |
| `pappus`, `seed` | 4 each | seed heads, drifting seeds |
| `frost` | 4 | frost, insulating hairs, ice |
| `tuber` | 4 | storage roots |
| `pigLeaf`, `pigStem`, `pigCore` | 4 each | **treatment targets only — never drawn**: the colours the leaf / stem / core become under Radiation pigment |
| `waxLeaf` | 4 | treatment target only: leaf under Heat wax (optional) |

Required: `ink, leaf, stem, root, pigLeaf, pigStem`. Every colour must be unique across the whole pack, written `#rrggbb` lower-case. The
palette is the art studio's choice, with one engine requirement: **shade 0 → 3 runs dark → light** within each material, because
treatments map shade-for-shade. The pack also gives the specimen-box `environment` colours (sky top/bottom, two soil strata + pebble,
turf) and optionally `render.stemOutline` (`self` | `ink` | `none`) for the procedural stem.

### H5. Sprite source rectangle
`"rect": [x, y, w, h]` in atlas pixels, top-left origin. It must be inside the image, must not overlap any other rect, must not be empty,
and must not exceed the component's `maxSize` (H14).

### H6. Anchor coordinate convention
`"anchor": [ax, ay]` is relative to the rect's top-left pixel (0-based) and names **the one pixel that is placed exactly on the socket**.

| Kind | Anchor |
|---|---|
| leaves (drawn facing right) | the petiole's first pixel, the one that touches the stem (usually the left-most pixel of the bottom rows) |
| bud, flower, seed heads | the bottom pixel of the stalk (sits on the apex / branch tip) |
| frost tuft | its bottom-centre pixel (sits one row above the leaf point it decorates) |
| frost collar | its centre pixel (on the stem's centre line at the node); leave the stem's 3–4 centre columns transparent |
| storage root | its top-centre pixel (hangs down from the primary-root socket, over the procedural root) |
| drifting seed | the seed pixel |

### H7. Layer / z-order
Draw order = `layer` value × 100 + `order` (+ leaf index for leaves, bottom → top). Layers (`contract.json → layers`):
`roots 10 · rootStorage 20 · stem 30 · branch 35 · leaves 40 · surface 50 · repro 60 · drift 70`. `roots`, `stem` and `branch` are
procedural. Each component has a fixed layer (H10); `order` (integer, default 0) is a tie-break inside it.

### H8. Legal orientation ids
`right`: faces / grows toward +x from its anchor; with `"mirror": true` the build bakes the left twin (`@left`).
`left`: an explicitly authored left-facing variant of the same id; it replaces the baked mirror (use it for asymmetric designs).
`up`: upright, centred on its anchor, never mirrored. `down`: hangs below its anchor, never mirrored.
**No rotation ever happens at runtime.** Every angle is an authored drawing (H15).

### H9. Naming convention
`id` = the component id, plus `.angle` for angled components: `leaf.base.low`, `leaf.base.mid`, `leaf.base.high`, `leaf.cold.mid`,
`leaf.cold.high`, `leaf.succulent.low|mid|high`, `root.storage`, `frost.tuft`, `frost.collar`, `bud`, `flower`, `seedHead.small`,
`seedHead.large`, `seed.drift`. Pack folders are lower-case kebab (`botanical`, `organic-hybrid`, `strange-herbarium`) and equal the
`pack` field. Runtime keys become `<id>@right|left|up|down`.

### H10. Trait id / tier association + H11. categories
Each sprite repeats its component's `trait`, `tier`, `category`, `attach` and `layer`. The build checks them against the registry, so a typo is
caught, not silently drawn:

| Component | Category | Trait · tier | Attach | Layer | Orientation | Angles | maxSize (w×h) | Points | Masks |
|---|---|---|---|---|---|---|---|---|---|
| `leaf.base` | structural | — · 0 | leafSocket | leaves | right (+mirror) | low, mid, high | 18×16 | tip, margin | pigment, wax |
| `leaf.cold` | structural | cold · 2 | leafSocket | leaves | right (+mirror) | mid, high | 14×14 | tip, margin | pigment, wax |
| `leaf.succulent` | structural | drought · 2 | leafSocket | leaves | right (+mirror) | low, mid, high | 18×16 | tip, margin | pigment, wax |
| `root.storage` | structural | drought · 2 | primaryRoot | rootStorage | down | — | 12×20 | — | — |
| `frost.tuft` | surface | cold · 1 | leafMargin | surface | up | — | 5×5 | — | — |
| `frost.collar` | surface | cold · 2 | stemNode | surface | up | — | 11×6 | — | — |
| `bud` | reproductive | — · 0 | apex | repro | up | — | 9×12 | — | — |
| `flower` | reproductive | earlyMat · 1 | flower | repro | up | — | 16×18 | — | — |
| `seedHead.small` | reproductive | seedOut · 1 | seedHead | repro | up | — | 11×13 | — | — |
| `seedHead.large` | reproductive | seedOut · 2 | seedHead | repro | up | — | 18×20 | — | — |
| `seed.drift` | reproductive | seedOut · 2 | drift | drift | up | — | 7×7 | — | — |

**Structural** components change anatomy (architecture, leaf form, roots). **Surface** components and treatments decorate existing anatomy
(frost, pigment, wax). **Reproductive** components occupy the apex / branch sockets. Radiation is a **treatment**, not a component: it needs
the `pigLeaf / pigStem (/ pigCore)` ramps and, optionally, authored masks (H12).

### H12. Mask format (pigment / wax / …)
In a leaf sprite's metadata: `"masks": { "pigment": "auto" | [x, y], "wax": "auto" | [x, y] }`.
`"auto"`: every pixel of a recolourable material (leaf → pigLeaf, stem → pigStem, core → pigCore for pigment; leaf → waxLeaf for wax).
`[x, y]`: the top-left of a **mask rect of exactly the sprite's size** elsewhere in the atlas. Any opaque pixel there (any colour; the proof
packs use `#ff00ff`) = inside the mask. Only masked pixels of a recolourable material change, shade-for-shade, so silhouettes never move.
Mask rects follow the same no-overlap / in-bounds rules. Left twins get their masks mirrored by the build. A treatment whose target ramp the
pack omits is skipped and reported (`unrendered`).

### H13. Exact attachment sockets available
From `art/plant/body-plan.json`, regenerated into `resources/plant-visual/generated/plant-atlas-manifest.json → sockets` on every build.
Coordinates are canvas pixels; "room" = free pixels from the socket to each canvas edge.

| Layout | Socket | Attach | At (x, y) | Side | Angle | Room L / R / Up / Down |
|---|---|---|---|---|---|---|
| open | leaf.0 | leafSocket | 41, 61 | left | low | 41 / 42 / 61 / 36 |
| open | leaf.1 | leafSocket | 45, 54 | right | low | 45 / 38 / 54 / 43 |
| open | leaf.2 | leafSocket | 40, 47 | left | mid | 40 / 43 / 47 / 50 |
| open | leaf.3 | leafSocket | 44, 40 | right | mid | 44 / 39 / 40 / 57 |
| open | leaf.4 | leafSocket | 40, 34 | left | high | 40 / 43 / 34 / 63 |
| open | leaf.5 | leafSocket | 43, 28 | right | high | 43 / 40 / 28 / 69 |
| open | apex · flower.0 · seedHead.0 | apex / flower / seedHead | 42, 21 | — | — | 42 / 41 / 21 / 76 |
| open | flower.1 | flower | 53, 23 | right | — | 53 / 30 / 23 / 74 |
| open | seedHead.1 | seedHead | 30, 31 | left | — | 30 / 53 / 31 / 66 |
| open | seedHead.2 | seedHead | 54, 40 | right | — | 54 / 29 / 40 / 57 |
| open | pod.0 / pod.1 | pod | 37, 52 / 48, 48 | left / right | — | (unused in the golden slice) |
| open | drift.0 / .1 / .2 | drift | 52, 10 / 59, 16 / 30, 12 | — | — | up 10 / 16 / 12 |
| compact | leaf.0 | leafSocket | 40, 65 | left | mid | 40 / 43 / 65 / 32 |
| compact | leaf.1 | leafSocket | 45, 63 | right | mid | 45 / 38 / 63 / 34 |
| compact | leaf.2 | leafSocket | 41, 58 | left | mid | 41 / 42 / 58 / 39 |
| compact | leaf.3 | leafSocket | 46, 55 | right | high | 46 / 37 / 55 / 42 |
| compact | leaf.4 | leafSocket | 40, 51 | left | high | 40 / 43 / 51 / 46 |
| compact | leaf.5 | leafSocket | 44, 47 | right | high | 44 / 39 / 47 / 50 |
| compact | apex · flower.0 · seedHead.0 | apex / flower / seedHead | 42, 39 | — | — | 42 / 41 / 39 / 58 |
| compact | flower.1 | flower | 54, 38 | right | — | 54 / 29 / 38 / 59 |
| compact | seedHead.1 | seedHead | 30, 43 | left | — | 30 / 53 / 43 / 54 |
| compact | seedHead.2 | seedHead | 57, 51 | right | — | 57 / 26 / 51 / 46 |
| compact | pod.0 / pod.1 | pod | 37, 60 / 49, 57 | left / right | — | (unused in the golden slice) |
| compact | drift.0 / .1 / .2 | drift | 52, 28 / 59, 34 / 30, 30 | — | — | up 28 / 34 / 30 |
| compact | stemNode.0 / .1 | stemNode | 43, 60 / 42, 52 | — | — | (frost collars) |
| both | rootCrown | rootCrown | 42, 68 | — | — | 42 / 41 / 68 / 29 |
| both | primaryRoot | primaryRoot | 42, 70 | — | — | 42 / 41 / 70 / 27 |

Leaf sockets in the **succulent** leaf set use only indices `0, 1, 3, 4` (fewer, fatter leaves). `leafMargin` is not a socket: it is the
`points.tip` / `points.margin` list **each leaf sprite declares** (pixels on that drawing's upper edge). Frost tufts follow whatever leaf the
artist drew.

### H14. Maximum safe sprite dimensions around each socket
Two limits, both enforced by the build:
1. **Per component**: `maxSize` (H10 table), the hard bounding box for any variant.
2. **Per socket**: placed at its anchor, a sprite must stay inside the canvas at **every** socket it can attach to:
   `ax ≤ room.left`, `w − 1 − ax ≤ room.right`, `ay ≤ room.up`, `h − 1 − ay ≤ room.down`, using the H13 room values. The tightest cases:
   `seedHead.large` / `flower` / `bud` at the open apex have **≤ 21 rows above the anchor**; `seed.drift` at open `drift.0` has **≤ 10**;
   `flower` at `flower.1` (open) has **≤ 30 px to the right**; `seedHead.small` at `seedHead.2` has **≤ 26–29 px right**.
   Any violation fails the build: `clip: <sprite> at <layout>/<socket> … leaves the 84×98 canvas`.
Neighbouring sprites may overlap. That is layering, not clipping. Keep leaves ≲ 16 px long, or adjacent sockets will crowd.

### H15. Angle variants the renderer expects
Leaves are drawn at **authored angles**, never rotated: `low` ≈ 10° above horizontal (lower nodes), `mid` ≈ 40°, `high` ≈ 65° (upper nodes
and the compact rosette). Required per pack: `leaf.base` low + mid + high; `leaf.cold` mid + high; `leaf.succulent` low + mid + high, each
drawn **facing right** (the left twin is baked, or authored explicitly with `orientation: "left"`). Under strain the renderer steps each leaf
one variant lower (high → mid → low; a component without that angle uses its nearest), so droop is also authored.

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
* **A new pack** (e.g. the approved Botanical): create `art/plant/packs/botanical/` with `atlas.png` + `atlas.json` covering every component ×
  angle in H10, run `build:plant-art`, commit the art + the two generated files. The renderer, selector and body plan do not change. The pack
  appears in the proof page automatically.
* **A redrawn sprite**: edit the PNG (and rect/anchor/points if its size changed), rebuild, commit.
* **An explicit left variant / asymmetry**: add a second entry with the same `id` and `"orientation": "left"`.
* **A pigment / wax mask**: draw a same-size mask rect in the PNG and point `masks.pigment` at its top-left.
* **A new component** (e.g. `pod.float` for Waterborne Seeds, or `leaf.base` for T1 tiers): this is an **engine** change, not an art change. Add it to
  `contract.json → components` (category, trait, tier, attach, layer, orientation, angles, maxSize), add one selector line in
  `plant-components.js`, and then every pack must provide it (the build lists what is missing). The compositor still needs no change for any
  attach category that already exists.

**Handoff package expected back from the art studio:** one folder per approved direction (`atlas.png` + `atlas.json`, `status:
"APPROVED …"`), passing `npm --prefix tools run build:plant-art` with zero errors. Integration is then: copy, build, run
`tools/plant-sprite-pipeline-check.js`, commit.

---

## 11. Owner gate — what is (and is not) being asked

032B1 stops here. The owner / PMO is **not** asked to judge art. The art studio owns body plan style, palette, alienness and leaf, flower and
seed-head design. The pipeline questions are:

1. **Canvas 84×98** (3× in the 1280 / 1440 rooms and the Field Journal) vs the brief's 96×112 (2× in all rooms). Accept 84×98?
2. **Preview treatment**: ghost / outline (static) is the one kept. Accept?
3. **Mutation FX**: grow and dissolve are kept (032A's pulse / bloom dropped). Which is the default, and is the other kept as an option?
4. **Contract shape**: are the 11 components + 3 angles + material list enough for the art studio's first pass, or should T1/T3 tier
   components (`leaf.cold` at T1, `leaf.succulent` T3, `pod.float`, salt, flood) be added to the contract before the studio starts?
5. Then hand the ARTIST_HANDOFF section + `art/plant/` to the art studio.

Not started (by instruction): production integration, replacing `plant-specimen.js`, the full sprite library, final art.
