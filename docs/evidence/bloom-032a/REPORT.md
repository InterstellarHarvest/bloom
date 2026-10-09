# BLOOM-032A — Plant Evolution Visual Lab: QA report

**Status: ready for the owner's visual review.** No concept is chosen and production is unchanged.

| | |
|---|---|
| Start | **bba000f** (accepted BLOOM-031 final, integrated to main by fast-forward in this run; origin/main = bba000f) |
| Implementation | **bac1454**: pipeline (`resources/plant-visual/`), lab (`demos/plant-evolution-lab.html`, `resources/plant-evolution-lab/`), check |
| QA | `tools/plant-evolution-lab-check.js`: **54 / 54** on bac1454, Chromium + Firefox (design-lab check, not a regression-suite member) |
| Design doc | `docs/PLANT_EVOLUTION_VISUAL_LAB_v1.md`, including the OWNER REVIEW questions |

## What the checks prove

- **Provenance.** It starts from bba000f. The production specimen `resources/run-ui/plant-specimen.js`, `content/traits.js`,
  `content/config.js` and every production runtime file (118 files) are byte-identical. 032A only adds files.
- **Four genuinely different concepts.** Base silhouettes overlap 42–50 %. Each has its own body plan, leaf profile, sprite set, line
  and shading treatment, and specimen-box environment.
- **One model feeds all four.** It is concept-independent, and the lab's Compare view and the production reference are fed the same
  state.
- **Every real trait is visible.** Each Adapt and Spread trait at T1 changes 32–1033 px. Every real multi-tier step (Cold / Heat 1→3,
  Drought / Flood 1→3, Seed Output 1→2) changes an *authored component*, not only a scale.
- **The tier rules hold.** Cold + Heat combine as one plant (Cold = architecture and hairs; Heat = cuticle). The Drought and Flood
  arms read in every concept, and the impossible both-arms build is handled. Salt (12–45 crystal px) and Radiation (66–100 % of leaf
  pixels) are visible at room distance. Seed Output T1 and T2 are distinct. Early Maturity is visible, even on a young colony.
  Waterborne Seeds shows pods.
- **Local, condition and Terraform behave.**
  - Focus states and local upgrades are distinct and drawn as the colony's development.
  - None of the 16 focus × upgrade variants changes the genome.
  - Thriving, strained and unviable are distinct, with the genome unchanged.
  - Every real Terraform preview changes only the environment; the anatomy signature is unchanged.
- **Preview and purchase.** Each preview treatment differs from the current plant, and cancelling a preview restores the exact
  current pixels. Each purchase FX ends on the exact target pixels:
  - Chromium: grow 627 ms, pulse 778 ms, dissolve 611 ms, bloom 710 ms;
  - Firefox: about the same.

  Reduced motion is a two-step swap of about 165 ms that ends on the same target.
- **Deterministic and unclipped.** Renders are deterministic and pixel-identical between Node and both browsers. No canonical build
  (11 builds × 4 concepts × native + 4 real room sizes) clips the box, and every owned trait's mark survives the complex builds.
- **Usable.** It works at 1024×768, 1280×800 and 1440×900 with one-row Single and Compare views. Keyboard 1–4 / C / P / R work. The
  lab opens as a file, makes no external request, logs no console error, and leaves BLOOM_DATA unmutated.

Renderer: 1.8 ms per organism (maximal build, Node).

## Real room sizes (measured in production)

| Box | Size |
|---|---|
| Adapt / Spread / Region at 1024×768 | 205×237 |
| Adapt / Spread / Region at 1280×800 | 258×298 |
| Adapt / Spread / Region at 1440×900 | 290×335 |
| Field Journal report | 296×342 |

Each concept is re-laid-out to fill each box at an integer scale. For example, concept A renders at 102×118 @2×, 86×99 @3×,
96×111 @3× and 74×85 @4×.

## Notes

- A fresh headless Chromium on this Mac drops the first page's 2D canvas contexts while its GPU process starts. The lab repaints on
  `contextrestored`, and the QA warms the browser before testing.
- Firefox's Playwright build reports no request events for `file:` URLs, so L38 rests on Chromium's request log plus the
  local-only code.

## Files

The 14 stills `01`–`14` (Chromium) · `plant-lab-proof.json` (concepts, trait mappings, tier steps, complex-build part counts, FX
results, room sizes) · `qa-plant-evolution-lab-check.log`.
