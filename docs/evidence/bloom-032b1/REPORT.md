# BLOOM-032B1 — Production Plant Sprite Pipeline Proof · evidence

**Every image here shows TEMPORARY PIPELINE PROOF art — NOT FINAL ART.** It proves the pipeline. It is not an art candidate. Final
Botanical / Organic Hybrid / Strange Herbarium art comes from the owner's Plant Pixel Art Studio, targeting
`docs/PLANT_SPRITE_PIPELINE_v1.md` § ARTIST_HANDOFF.

* Base: accepted production main `bba000f` (BLOOM-031). Implementation `0777c80`. Branch `handoff/bloom-032b1-review`.
* QA: `tools/plant-sprite-pipeline-check.js`: **46/46** (24 Node + 22 browser: Chromium and Firefox × file:// · HTTP `/` · HTTP `/bloom/`).
  Log: `qa-plant-sprite-pipeline-check.log`. Machine proof: `pipeline-proof.json`.
* Regression: BLOOM-031 `portable-runtime-check`: **71/71** on 0777c80 (`qa-portable-runtime-check.log`); `npm --prefix tools run check:portable` OK.
* Production: `resources/run-ui/plant-specimen.js` and every file under resources/, content/, planets/, demos/, index.html and dist/ that
  existed at bba000f are byte-identical (QA S2). The 032A review branch is untouched (QA S3).

| File | What it shows |
|---|---|
| `01-base-…` – `05-complex-pipeline-and-pack-swap.png` | BASE · COLD T2 · DROUGHT T2 · SEED OUTPUT T2 · COMPLEX. In each: the neutral PIPELINE PROOF body plan, the same build re-skinned only by swapping the art pack (angular, round), and the current production SVG, all at the real 1280×800 room size (84×98 @ 3×) |
| `06-golden-slice-sheet-proof-pack.png` | all seven golden-slice states, including RADIATION (pigment through the authored base-of-leaf mask) and EARLY MATURITY |
| `07-same-organism-every-placement.png` | one organism at native 1×, room 1024 (2×), 1280 (3×), 1440 (3×), Field Journal (3×), 4× zoom: identical pixels (QA B3) |
| `08-preview-ghost-outline.png` | Seed Output T2 previewing Early Maturity: ghosted proposed pixels + gold trace; the production SVG shows its own preview |
| `09-crop-400pct-complex-proof-pack.png` | 400 % nearest-neighbour crop of COMPLEX: individual authored (proof) pixels, procedural stem / branches / roots |
| `10-fx-grow-strip.png`, `11-fx-dissolve-strip.png` | Seed Output T2 → COMPLEX at t = 0, .2, .4, .6, .8, 1 (+ the ghost preview last). Exact frames from plant-fx.js; t = 1 is the target, byte for byte |
| `12-all-states-all-packs-2x.png` | 7 states × 3 packs, one renderer |
| `13-source-atlas-*-4x.png` | the checked-in SOURCE atlases (palette swatch strip, sprites, magenta pigment masks) at 4× |

**Canvas choice (`pipeline-proof.json → canvasChoice`).** 84×98 → 2× / 3× / 3× / 3× (rooms 1024 / 1280 / 1440, Field Journal);
96×112 → 2× / 2× / 2× / 3×.

**Stop.** Handoff gate: the PMO reviews the pipeline and the ARTIST_HANDOFF contract (docs §11), then hands the contract to the art studio.
No production integration, no plant-specimen.js replacement, no full sprite library and no final art were started.
