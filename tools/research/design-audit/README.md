# BLOOM-038 design-audit research tooling

**Research only. Not a QA gate, never loaded by the game, writes nothing under `content/`, `planets/` or `resources/`.**

The method, how to reproduce it and what each output holds: [`docs/evidence/bloom-038/REPORT.md`](../../../docs/evidence/bloom-038/REPORT.md).
The findings: [`docs/DESIGN_AUDIT_v1.md`](../../../docs/DESIGN_AUDIT_v1.md).

## Simulation (Node, ES modules)

| File | Role |
|---|---|
| `engine.mjs` | loads the production classic scripts + seed banks + training data; the survey / bank ES modules |
| `runner.mjs` | ONE run: the production sim driven by a player-informed policy; pacing / endgame / scenario metrics |
| `study.mjs` | `worlds` (the Expedition sample) and `runs` (the full matrix) on worker threads |
| `readout.mjs` | readout honesty: what the region banner says vs what the plant can do |
| `analyze.mjs` | rows → `pacing-study`, `strategy-study`, `species-comparison`, `challenge-comparison` JSON |
| `escape.mjs` | the Native Competition stand-off escape probe |
| `merge-failure.mjs` | `failure-state-audit.json` |

## Browser (CommonJS, Playwright, Chromium)

| File | Role |
|---|---|
| `atlas-lib.js` | shared helpers for the atlas scripts |
| `atlas.js` | the visual atlas matrix |
| `atlas-run1024.js` | the two complete 1024 × 768 runs |
| `atlas-2560.js` | the 2560 traversal |
| `contact-sheet.js` | the contact sheets |
| `browser-common.js` | shared helpers for the DOM audits |
| `affordance.js` | the affordance audit (K) |
| `copy-density.js` | the copy-density audit (L) |
| `pause-audit.js` | the speed / pause audit (M) |
| `failure-ui.js` | the failure-state UI capture (J) |
