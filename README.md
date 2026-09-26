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
| Architecture stabilization (BLOOM-002) | slice simulation extracted to a shared DOM-free engine; tuning, upgrades and the planet moved to data files; gameplay unchanged (bit-for-bit golden vs the pre-extraction build) | ✅ |
| Expansion (bible §10–§12) | procedural planet menu · archetypes · hex boards · pressure scenarios · friendly/cutesy art pass | 🔒 gated on the playtest |

**What the slice proves (verified headless):** two broad winning builds exist. The *wet* build (Flood I) gives up Dust Reach; the *dry* build (Drought I) gives up Marsh Low. Both need Cold ×2 + Heat ×1 + Salt Handling, and a Warm/Cool Terraform can replace one temperature point. A generalist without a water strategy caps at ~67.6%, and over-committing (Flood/Drought II) collapses the home regions. The preview warns you before you do that.

## Next steps

1. **Owner playtest** of `demos/demo-run.html`. Answer the 10 acceptance questions in [`docs/PLAYTEST_v1.md`](docs/PLAYTEST_v1.md). Pass = "yes" to most.
2. **Tune from the answers.** Every rate/cost/threshold is in [`content/config.js`](content/config.js). After a change, re-run both checks, and regenerate the golden with `node tools/sim-check.js --write` because a retune is intended.
3. **If the gate passes**, expand in this order: procedural planet menu + first archetypes (bible §10) → final hex boards (§7) → one pressure scenario (§11) → friendly visual pass. **If it fails**, fix the loop on First Bloom first; don't expand.
4. Still-open design questions (need prototypes, not debate): bubble frequency/auto-collect, how much to predict before a Terraform buy, final plant personality, exact board layout.

## QA

```bash
node tools/sim-check.js                                        # engine + content, plain Node, <1 s
NODE_PATH="$(npm root -g)" node tools/slice-check.js [--shots <dir>]   # the real UI, Playwright
```

- **`sim-check.js`** (16 checks, no dependencies):
  - the golden First Bloom runs, bit-for-bit;
  - content files are pure data;
  - the engine has no DOM access;
  - config values actually drive behavior;
  - a second planet runs on the unchanged engine.
- **`slice-check.js`** (14 checks) drives the **real shop buttons** and covers pacing, both winning builds, the tradeoff guards, preview, readouts and the Bloom Report. It needs `npm i -g playwright`.
- Exit code 1 = failure for both.

## Architecture

```
resources/bloom-sim.js    shared simulation engine, no DOM: layout, 4-category evaluation, tick,
                          economy, bubbles, win, upgrade effects, purchase preview
content/config.js         every rate / cost scale / threshold / category boundary (bible §15, invariant 11)
content/traits.js         the upgrade catalogue as data: board, effect type, cost, science line
planets/first_bloom.js    the authored slice planet (the same model procedural planets will emit)
demos/demo-run.html       UI + rendering only: loads the four files above, calls BLOOM.createSim(...)
demos/demo-surface.html   Portion 1 surface/generator demo (still self-contained; merges into the
                          engine when procedural planets are reconnected)
tools/                    slice-check.js (browser, real buttons) · sim-check.js (Node, golden) · golden/
```

- `BLOOM.createSim(planet, config, traits, {rng})` builds one run. A new planet is a new data file, with no engine changes (`tools/sim-check.js` runs a second synthetic planet to prove it).
- Content files are **plain classic scripts holding JSON-shaped data**, not `fetch()`ed `.json`. They load over bare `file://` with a single source of truth, so no duplicate embedded fallback is needed.
- Balance changes are data edits in `content/config.js`. The engine is pinned bit-for-bit by `tools/golden/first_bloom.json` (seeded RNG). An intended retune regenerates it with `node tools/sim-check.js --write`, and the commit must say so.
- Upgrade effects are four engine-implemented types (`tempPoint`, `waterArm`, `level`, `sky`). A trait that needs a new *kind* of effect needs engine code; a new trait of an existing kind is data only.
- Not yet supported: water/impassable sections (the engine refuses them) and pressure scenarios.

## Run

Open any file in `demos/` directly in a browser (no build step, no server required). Keep the folder structure: `demo-run.html` loads `../content`, `../planets` and `../resources`.

## Plan of record

[`GAME_BIBLE.md`](GAME_BIBLE.md) — the design bible (v1.1). Everything reconciles there; when in doubt, it wins.
