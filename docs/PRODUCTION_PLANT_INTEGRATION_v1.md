# Production plant integration v1 — BLOOM-032C

**Status:** the approved **Organic Hybrid** sprite organism is the production plant. It replaces the provisional BLOOM-029C SVG
everywhere the game shows the plant: Region Inspect, Adapt, Spread, Guided Training (which uses those rooms) and the
Bloom / Extinction report. Terraform never shows the plant and never changes it.

> **FIREFOX — HARD PRE-MERGE GATE.** 032C must not be merged to `main` until Firefox actually launches on a capable machine
> and `node tools/production-plant-integration-check.js` (default `--browsers chromium,firefox`) passes there, together with the
> regression suites listed in `docs/evidence/bloom-032c/REPORT.md`.

## 1. Architecture

```
content/traits.js (real tiers) ─▶ run UI adapter ─▶ decision-rooms.js / run-report.js
                                                      │  specState(): { traits, preview, colony, focus, local, condition, viable, names }
                                                      ▼
                                    BLOOM.plantSpecimen  (resources/run-ui/plant-specimen.js — the 029C API, unchanged)
                                                      │  adapter
                     ┌────────────────────────────────┼─────────────────────────────────────────────┐
     BLOOM.plantVisual.model.normalize  →  BLOOM.plantVisual.components.select  →  BLOOM.plantCompositor.render(…, "organic-hybrid")
                                                      │                         BLOOM.plantFx (preview · GROW · reduced motion)
                                                      ▼
                         one 84 × 98 RGBA frame  →  LOCAL presentation layer  →  <canvas> at a whole-number scale (pixelated)
```

The accepted 032B pipeline (generated atlas, model, selector, compositor, FX) and the approved art are **unchanged**. The rooms and
the report are **unchanged**: they still call `mount / render / highlight / anchorPoint / anchors / signature / state / parts / el`.
Nothing outside the adapter knows a sprite-component id.

**Load order** (`demos/demo-run.html`, classic scripts, file://-safe, no fetch, no image decode):
`plant-atlas.js → plant-visual-model.js → plant-components.js → plant-compositor.js → plant-fx.js → plant-specimen.js →
decision-rooms.js … run-report.js`.

## 2. State mapping

| Production state | Visual model |
|---|---|
| `traits` (cold heat drought flood salt rad seedOut earlyMat waterSeeds) | the **global genome**: authored anatomy and treatments. Identical traits give identical organism pixels on every surface (`globalSignature()`). |
| `preview {id, tier}` | the proposed genome (the real next tier from the adapter). Shown as the accepted **GHOST / OUTLINE**; the owned organism is never mutated. |
| `condition` warn / bad (living colony) | the accepted **strained** posture: one authored angle lower, plus the stress tint. warn and bad are one presentation. |
| `colony.living` false | the organism thinned to a dither over its backdrop (a ghost of what would grow). |
| `viable` false | a restrained desaturation (would not survive here / the run was lost). The anatomy stays true. |
| `colony.establishment` | up to 8 young sprouts on the soil line beside the plant (colony density). |
| `focus` roots / `local` rootNetwork | extra procedural lateral roots off the real primary root (+ root nodules for the network). |
| `focus` leaves / `local` leafCanopy | the canopy one shade fuller in its own ramp (never wax, never pigment). |
| `focus` seeds / `local` seedReserve | a seed bank resting in the topsoil. |

The **local layer** is deterministic, uses only the pack's own palette ramps, and never edits an authored sprite. Its extras land
only on pixels the organism leaves empty. It never changes the global genome signature and creates no fake mutation.
**Environment:** the pack's specimen backdrop (sky `#7d8c96 → #aeb4aa`, soil `#4a3d33 / #3f332b / #6b5b4c`, turf `#626b45`).
It is never recoloured per region. The padding around the canvas continues the same sky and soil.

## 3. Preview, purchase FX, re-renders

* **Preview:** hover or focus on a node → `render({ …, preview })` → the ghost / outline of current → proposed. Leaving → exactly the current pixels.
  The canvas `aria-label` says "Previewing …". There is no sticky preview: the rooms own the reset paths, as in 029C.
* **Purchase (GROW):** the page's own `bloom:upgrade-purchase` arms the **visible** specimen. Its next render compares the new committed
  organism with the previous one. If they differ, `BLOOM.plantFx.purchase(…, { style: "grow" })` plays once, and the last frame is exactly the target.
  If the pointer still rests on the node, the next-tier preview appears after the growth.
* **Never replayed** by a first render, a region switch, a hover preview, a tick, opening another room or the report.
  These paint the exact frame directly. Hidden specimens are never armed.
* **Reduced motion** (the OS setting, the page class, the Settings choice — the rooms' existing `reduced()`): one direct exact swap.

## 4. Category highlight and connector anchors

| Logical part (rooms' table, unchanged) | Real placements |
|---|---|
| `leafShape` (Water) | every `leaf.*` sprite |
| `pigment` (Hazard) | every `leaf.*` sprite + `salt.*` |
| `stem` (Temperature) | the procedural stem + `frost.*` (hairs, wool collars) |
| `roots` (Soil) | procedural roots, `root.storage.*`, `root.aerial.*`, `root.stilt`, the local root extras |
| `seedHead` (Seeds) | `seedHead.*`, `seed.drift`, the apex bud, seed-head branches, the local seed bank |
| `flowers` (Growth) | `flower`, `bud.axil`, the apex bud, the flower branch |
| `pods` (Reach) | `pod` and its stalks |

**Highlight:** the part keeps its pixels and gets a 1-px halo; the rest of the plant dims toward the backdrop.
**Anchors:** each anchor sits on a visible pixel of its part. An absent part snaps to the nearest visible anatomy. Anchors are kept in each
room's top → bottom tendril order: Adapt pigment < leaf shape < stem < roots; Spread seed head < flowers < pods. They are converted to
client px from the live canvas rectangle on every call, so they follow any resize.

## 5. Room sizes

One 84 × 98 frame, `image-rendering: pixelated`, scale `k = floor(min(boxW / 84, boxH / 98))`, centred.
Measured: **1024 × 768 → 2×**, **1280 × 800 → 3×**, **1440 × 900 → 3×**, report → **3×**. The plant is never redrawn per room.

## 6. Retirement of the 029C SVG

`plant-specimen.js` builds no SVG and no markup. The retired renderer survives only as
`resources/plant-sprite-lab/legacy-svg-specimen.js` (`BLOOM.legacyPlantSpecimen`). It is loaded by the developer lab page alone, for its
comparison view, and never by `demo-run.html` or `index.html` (QA check 3).

## 7. QA

`tools/production-plant-integration-check.js` covers points 1–50 of the brief: Node scope / states / local layer / preview / anchors;
browser Region / Adapt / Spread / report win + loss / Guided Training / Terraform / sizes / file:// · HTTP · /bloom/ / keyboard /
reduced motion / errors. Point 50 (Firefox) is the merge gate. Evidence and logs: `docs/evidence/bloom-032c/`.
