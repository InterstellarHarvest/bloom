# BLOOM-032C — Production Organic Hybrid plant · evidence

**Status:** review candidate on `handoff/bloom-032c-review`. **Not merged to `main`.** The approved Organic Hybrid sprite organism now
replaces the provisional 029C SVG in real gameplay: Region Inspect, Adapt, Spread, Guided Training and the Bloom / Extinction report.
Terraform shows no plant and changes no anatomy.

| | |
|---|---|
| 032B2 integration | `main` fast-forwarded `be0a829 → ea1b785` (no merge commit); `handoff/bloom-032b2-review` proven an ancestor, then deleted |
| 032C starting SHA | `ea1b785517ccc9586cc7bb1ce91fc26f1f46c922` |
| Implementation | `181a96a` (adapter, load order, CSS, QA) + `090a66d` (fixes found reviewing this evidence, below) |
| Docs | `99267b5` — `docs/PRODUCTION_PLANT_INTEGRATION_v1.md` |
| Browsers | **Chromium 147.0.7727.15 · Firefox 148.0.2** (Playwright 1.59.1, macOS 12, non-root user) |

## 1 · What changed

* `resources/run-ui/plant-specimen.js` keeps the **029C public API unchanged**: `mount(host, { reducedMotion })` → `render(state)`,
  `highlight(part)`, `anchorPoint(part)`, `anchors()`, `signature()`, `state`, `parts`, `el` (`svg` names the image element).
  Behind it is an adapter over the accepted pipeline: `plantVisual.model → components → plantCompositor` (pack
  `organic-hybrid`) `→ plantFx`. `decision-rooms.js`, `run-report.js`, the run adapter and training are **untouched**.
* `demos/demo-run.html` loads the accepted classic sprite runtime (generated atlas → model → selector → compositor → FX) before
  `plant-specimen.js`. No fetch, no image decode, no modules: file://, HTTP / and /bloom/ all work.
* One 84 × 98 canvas, `role="img"` with a live `aria-label` ("… Previewing …", "Stressed here", "Would not survive").
  Whole-number nearest-neighbour scale: **1024 → 2×, 1280 → 3×, 1440 → 3×, report → 3×**.
* **Global vs local:** the owned traits give one organism signature on every surface. Establishment, growth focus, local upgrade,
  stress, no colony and unviable form a small deterministic presentation layer that never edits a sprite or the genome signature.
  Full mapping: `docs/PRODUCTION_PLANT_INTEGRATION_v1.md` §2.
* **Preview** is the accepted ghost / outline of the real next tier; leaving returns exactly to the current pixels.
  A **real purchase** (`bloom:upgrade-purchase`) GROWS once into the visible specimen and ends exactly on the target. Re-renders,
  ticks, region switches, room changes and the report never replay it. **Reduced motion** is one exact swap.
* **Highlights and anchors:** the rooms' seven logical parts map onto real placements (pixel highlight + halo). Every anchor sits on
  a visible organism pixel, at least 10 logical px apart, in the rooms' tendril order.
* **The 029C SVG is retired:** it now lives only at `resources/plant-sprite-lab/legacy-svg-specimen.js` (`BLOOM.legacyPlantSpecimen`),
  loaded by the developer lab page alone. QA check 3 proves no production page loads it.
* The portable bundle never contained these scripts: `dist/` rebuilds **byte-identical**, fingerprint `2b90d81a37bd4fc1…`.

### Fixed while reviewing this evidence (`090a66d`)
1. **The scale was not a whole number.** The run page's retired engineering-shell rule
   `canvas{border:1px; border-radius; max-width:100%; cursor:crosshair}`, combined with the global `box-sizing:border-box`, drew the
   "3×" plant in a 250-px box instead of 252 (≈ 2.98×), with a dark frame and a crosshair cursor. The specimen canvas now resets that
   rule. QA measures the content box (the border-inclusive width had hidden it).
2. **A lost 2D canvas context left the plant blank.** Headless Chromium drops its first page's contexts. The specimen now repaints on
   `contextrestored`.
3. **Label plates overlapped** in the maximal-wet room: anchors are now at least 10 logical px apart.

## 2 · QA (commit `090a66d`)

| Suite | Result |
|---|---|
| **`production-plant-integration-check`** (new; brief points 1–50) | **50 / 50** — 10 Node + 20 Chromium + 20 Firefox; 50 / 50 on every one of 5 runs |
| `organic-hybrid-art-intake-check` | **45 / 45** (032B2's Chromium-only 33 + the 12 Firefox checks now run) |
| `plant-sprite-pipeline-check` | **58 / 58** (the 032B1 baseline, incl. its 11 Firefox checks) |
| `portable-runtime-check` | **71 / 71** (the BLOOM-031 baseline; non-root machine) |
| `guided-training-check` | **50 / 50** |
| `run-ui-convergence-check` | **57 / 57** |
| `plant-rooms-check` | **66 / 66** |
| `terraform-check` | **61 / 61** |
| `game-flow-check` | **48 / 48** |
| `training-check` | **83 / 83** (B5a, the cloud-only miss, passes in both browsers; 4 of 4 earlier runs too) |
| **Full regression** (every `tools/*-check.js`, sequential, Chromium + Firefox wherever a suite has browsers) | **35 suites · 1595 passed · 1 missed** — the miss is `planet-view-check` [firefox] B10 (speed buttons; an auto bubble-collect interleaved with the timed clicks), not plant code: re-run 80 / 80 twice on `090a66d` and twice on baseline `ea1b785`. `qa-full-regression-summary.txt` |

`qa-*.log` hold the full output. `production-plant-proof.json` holds every check, per-browser versions, per-origin pixel
signatures, room-size scales, local-state probes and purchase FX records.

**Suites changed, and why** (each change is labelled in the file):
* `plant-rooms-check`, `run-ui-convergence-check`, `game-flow-check` probed retired SVG internals (`.ps svg`, `.ps-part`,
  `draw().markup`). They now probe the canvas contract: displayed-pixel signature, `highlighted`, the canvas `role="img"`.
* `plant-sprite-pipeline-check` (032B1) and `organic-hybrid-art-intake-check` (032B2) had scope lists that forbade production changes.
  Each now names exactly the 032C files.
* `plant-rooms-check` B21d read the old page before the Restart-training reload. It now waits for the real reload (a pre-existing race).

**Firefox gate:** cleared. Firefox 148.0.2 launches here and every Firefox check of the 032C suite and the regression passes.

**Cloud-only failures, not reproduced here:** `colony-development-check` [31] and `portable-runtime-check` P4b failed in the restricted
root container on both the `ea1b785` baseline and the candidate. `training-check` B5a failed once on the candidate there. All three
pass on this machine; B5a passed 4 of 4 runs in both browsers.

## 3 · Evidence (Chromium, the rooms' own pixels)

| # | Still | Shows |
|---|---|---|
| 01 | `01-region-base.png` | Region Inspect, BASE organism at 3× |
| 02 | `02-adapt-cold-preview.png` | Adapt: hovering Cold Tolerance → ghost / outline of Cold T1, Stem highlighted, PREVIEW tag |
| 03 | `03-adapt-after-cold-purchase.png` | after the real purchase: the GROW ended on the committed Cold T1 organism |
| 04 | `04-spread-seed-preview.png` | Spread: Seed Output preview, Seed head highlighted |
| 05 | `05-spread-after-seed-purchase.png` | after the real Seed Output purchase |
| 06 · 07 | drought / flood real rooms | Drought T3 (storage leaves + tuber) · Flood T3 (reed leaves, aerial + stilt roots), bought for real |
| 08 | `08-salt-radiation.png` | Salt + Radiation |
| 09 · 10 | maximal dry / wet rooms | the maximal legal builds in the real Adapt room (anchors and label plates clear) |
| 11–13 | region local roots / leaves / seeds | the real growth focus: same organism, local presentation only |
| 14 | `14-stressed.png` | a living colony stressed by real Terraform purchases: the strained posture |
| 15 · 16 | report win / loss | Bloom Report (training win, 3×) · Extinction (unviable presentation) |
| 17 | `17-training-specimen.png` | Guided Training: the real rooms show the real specimen under the coach |
| 18 | `18-current-vs-new-production-comparison.png` | retired 029C SVG (top) vs the 032C specimen (bottom), identical states, in the 258×298 room box |

## 4 · For the owner (visual review)
1. **Room caption over the roots:** at 3× the room's "Your plant in …" caption gradient covers the deepest root rows, as it did
   with the SVG. The room layout was left unchanged.
2. **Local presentation is deliberately subtle:** sprouts, extra roots, canopy shade and seed bank only. Stronger local emphasis
   would need a design decision.
3. **No-colony / extinction ghost** is a 50 % checker dither of the organism, the pixel analogue of the SVG's 55 % opacity.

STOP: not merged. Merge to `main` only after PMO / owner visual acceptance.
