# BLOOM

A retro-pixel **terraforming / evolution** game in the *Plague Inc.* lineage, built to teach middle-school life & earth science. You are a single pioneer plant dropped onto a hostile world: **evolve** to endure local ground conditions, **terraform** the global sky to bend the whole climate toward you, and win by covering a target % of the planet. The plant drives its own terraform loop — as it spreads it photosynthesizes and changes the atmosphere, so success snowballs (a deliberate echo of the Great Oxidation Event).

> *A planet's "mood" is its sky — you can change that. A region's "personality" is its ground — you have to adapt to that.*

## Status — Next Playable Slice built, awaiting owner playtest

The original plan was eight isolated portion demos. In August 2026 the **v1.1 direction change** ([PR #1](https://github.com/InterstellarHarvest/bloom/pull/1), see [`docs/GAMEPLAY_DIRECTION_DECISIONS_v1.0.md`](docs/GAMEPLAY_DIRECTION_DECISIONS_v1.0.md)) replaced that march with a single gate: **one complete, ugly-but-playable Eden run** ([`docs/NEXT_PLAYABLE_SLICE_v1.0.md`](docs/NEXT_PLAYABLE_SLICE_v1.0.md)). That slice now exists and contains first-pass versions of what were Portions 2–7.

| Milestone | What | State |
|---|---|---|
| Portion 1 · The Surface | tile/section model · weighted-Voronoi + procedural generator · water/islands · border tracer | ✅ [`demos/demo-surface.html`](demos/demo-surface.html) |
| Next Playable Slice | one Eden run on the authored 9-section planet *First Bloom*: spread sim (Barren/Living/Dead, hysteresis, die-back, recovery) · Temperature/Water/Soil/Hazard readout + one named limiting factor · passive Biomass + bubbles · temporary Spread/Adapt/Terraform set · hover preview of what a purchase opens/closes · 70% win · Bloom Report | ✅ built · ⏳ **owner playtest** — [`demos/demo-run.html`](demos/demo-run.html) |
| Slice audit + tuning (2026-09-26) | fixed a dead shop (buttons never enabled in real play), unstable/misleading readouts; retuned a ~30 s run to ~5 min for a perfect bot (6–8 min for a person); added purchase preview; Bloom Report now names what your build gave up + real-plant analogs + a drawn plant | ✅ |
| Expansion (bible §10–§12) | procedural planet menu · archetypes · hex boards · pressure scenarios · friendly/cutesy art pass | 🔒 gated on the playtest |

**What the slice proves (verified headless):** two broad winning builds exist. The *wet* build (Flood I) gives up Dust Reach; the *dry* build (Drought I) gives up Marsh Low. Both need Cold ×2 + Heat ×1 + Salt Handling, and a Warm/Cool Terraform can replace one temperature point. A generalist without a water strategy caps at ~67.6%, and over-committing (Flood/Drought II) collapses the home regions. The preview warns you before you do that.

## Next steps

1. **Owner playtest** of `demos/demo-run.html`. Answer the 10 acceptance questions in [`docs/PLAYTEST_v1.md`](docs/PLAYTEST_v1.md). Pass = "yes" to most.
2. **Tune from the answers.** Every rate/cost/threshold is in the `CFG` block at the top of the script (`grow`, `econ`, `win`); re-run `tools/slice-check.js` after each change.
3. **If the gate passes**, expand in this order: procedural planet menu + first archetypes (bible §10) → final hex boards (§7) → one pressure scenario (§11) → friendly visual pass. **If it fails**, fix the loop on First Bloom first; don't expand.
4. Still-open design questions (need prototypes, not debate): bubble frequency/auto-collect, how much to predict before a Terraform buy, final plant personality, exact board layout.

## QA

```bash
NODE_PATH="$(npm root -g)" node tools/slice-check.js [--shots <dir>]
```

14 Playwright checks. They drive the **real shop buttons** and cover pacing, both winning builds, the tradeoff guards, preview, readouts and the Bloom Report. Needs `npm i -g playwright`. Exit code 1 = failure.

## Architecture

- **One HTML file = engine** (sim / render / UI / trait logic).
- **Content = external JSON** beside it (`planets/*.json`, `traits.json`, `scenarios.json`, `config.json`), loaded via `fetch()`. Adding a planet = writing JSON, zero engine code.
- **Embedded fallback** so it boots and plays over bare `file://`; external fetch enriches when served over HTTP.
- All rates / costs / thresholds live in `config.json` — balancing is data-tweaking, never re-architecting.

## Run

Open any file in `demos/` directly in a browser (no build step, no server required). Each demo is currently self-contained; folding them into the engine + external JSON below happens after the slice gate.

## Plan of record

[`GAME_BIBLE.md`](GAME_BIBLE.md) — the design bible (v1.1). Everything reconciles there; when in doubt, it wins.
