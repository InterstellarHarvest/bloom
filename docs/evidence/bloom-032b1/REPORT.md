# BLOOM-032B1 — Production Plant Sprite Pipeline Proof · evidence (revision 2: complete locked contract)

**Every image here shows TEMPORARY PIPELINE PROOF art — NOT FINAL ART.** It proves the pipeline and the contract. It is not an art
candidate. Final Organic Hybrid art (the approved Base Species Kit and the locked mutation language) comes from the Plant Pixel Art Studio,
targeting `docs/PLANT_SPRITE_PIPELINE_v1.md` § ARTIST_HANDOFF. It was not ingested.

* Base: accepted production main `bba000f` (BLOOM-031). Previous review candidate `c438a56`. Revision commits `6603b4c` (contract) +
  `6dbedae` (page / QA); this evidence is from `6dbedae`. Branch `handoff/bloom-032b1-review`.
* QA: `tools/plant-sprite-pipeline-check.js`: **58/58** (36 Node + 22 browser: Chromium and Firefox × file:// · HTTP `/` · HTTP
  `/bloom/`). The original 46 checks are kept; the 12 new ones are N1–N12. Log: `qa-plant-sprite-pipeline-check.log`. Machine proof:
  `pipeline-proof.json`.
* Regression: BLOOM-031 `portable-runtime-check`: **71/71** on `6dbedae` (`qa-portable-runtime-check.log`).
* Production: `resources/run-ui/plant-specimen.js` and every file under resources/, content/, planets/, demos/, index.html and dist/ that
  existed at bba000f are byte-identical (QA S2). The 032A review branch is untouched (QA S3).

**Contract:** 34 components (11 before) in 8 families, 3 treatments (pigment, wax levels 1–3, toothed), 15 materials, 4 cold layouts,
117 sockets. Per pack: 55 authored sprites → 92 runtime sprites (mirrored twins baked); 17 782 placements statically proven inside the canvas.

**84×98 maximal proofs (N8 / N9):** each one runs 4 legal temperature splits × 3 packs × thriving / strained = 24 cases, all legal, every
required component present, no clip, deterministic.

| Build | Components | Bounding box (x0, y0 – x1, y1) | Minimum clear margin |
|---|---|---|---|
| MAXIMAL LEGAL DRY (Cold 2 + Heat 1 + Drought 3 + Salt + Rad + Seed Output 2 + Early Maturity + Waterborne) | 12 | 26, 20 – 61, 95 | 2 px |
| MAXIMAL LEGAL WET (same with Flood 3) | 13 | 23, 20 – 62, 84 | 4 px |

| File | What it shows |
|---|---|
| `01`–`07-…-pipeline-and-pack-swap.png` | BASE · Cold T2 + Heat T1 · Drought T3 · Flood T3 · Salt · MAXIMAL DRY · MAXIMAL WET, each in the neutral proof pack, the same build re-skinned by swapping only the art pack, and the current production SVG, at the real 1280×800 room size (84×98 @ 3×) |
| `08-all-locked-states-proof-pack.png` | all 24 locked states (Cold T1–T3, Heat T1–T3, Cold+Heat, Drought / Flood T1–T4, Salt, Radiation, Seed T1/T2, Early Maturity, Waterborne, maximal dry / wet) |
| `09-same-organism-every-placement.png` | MAXIMAL DRY at native 1×, room 1024 (2×), 1280 (3×), 1440 (3×), Field Journal (3×), 4× zoom: identical pixels (QA B3) |
| `10-preview-ghost-outline.png` | ghost + outline preview (Seed Output T2 → + Early Maturity) |
| `11-crop-400pct-maximal-dry-proof-pack.png` | 400 % nearest-neighbour crop of MAXIMAL DRY |
| `12-fx-grow-strip.png`, `13-fx-dissolve-strip.png` | Seed Output T2 → MAXIMAL DRY at t = 0 … 1 (+ ghost preview); t = 1 is the target byte for byte. GROW is the default |
| `14-all-states-all-packs-2x.png` | 24 states × 3 packs, one renderer |
| `15-source-atlas-*-4x.png` | the checked-in SOURCE atlases (swatches, sprites, magenta pigment masks, cyan teeth masks) at 4× |

**Stop.** Handoff gate. Not merged; no final art ingested; no production integration; `plant-specimen.js` not replaced.
