# BLOOM

A retro-pixel **terraforming / evolution** game in the *Plague Inc.* lineage, built to teach middle-school life & earth science. You are a single pioneer plant dropped onto a hostile world: **evolve** to endure local ground conditions, **terraform** the global sky to bend the whole climate toward you, and win by covering a target % of the planet. The plant drives its own terraform loop — as it spreads it photosynthesizes and changes the atmosphere, so success snowballs (a deliberate echo of the Great Oxidation Event).

> *A planet's "mood" is its sky — you can change that. A region's "personality" is its ground — you have to adapt to that.*

## Status — slice gate PASSED; procedural planets reconnected

The original plan was eight isolated portion demos. In August 2026 the **v1.1 direction change** ([PR #1](https://github.com/InterstellarHarvest/bloom/pull/1), see [`docs/GAMEPLAY_DIRECTION_DECISIONS_v1.0.md`](docs/GAMEPLAY_DIRECTION_DECISIONS_v1.0.md)) replaced that march with a single gate: **one complete, ugly-but-playable Eden run** ([`docs/NEXT_PLAYABLE_SLICE_v1.0.md`](docs/NEXT_PLAYABLE_SLICE_v1.0.md)). The slice was built, audited and tuned, and the owner **cleared the gate on 2026-09-26**. Work now follows the bible's post-gate sequence (§15).

| Milestone | What | State |
|---|---|---|
| Portion 1 · The Surface | tile/section model · weighted-Voronoi + procedural generator · water/islands · border tracer | ✅ [`demos/demo-surface.html`](demos/demo-surface.html) |
| Next Playable Slice | one Eden run on the authored 9-section planet *First Bloom*: spread sim (Barren/Living/Dead, hysteresis, die-back, recovery) · Temperature/Water/Soil/Hazard readout + one named limiting factor · passive Biomass + bubbles · temporary Spread/Adapt/Terraform set · hover preview of what a purchase opens/closes · 70% win · Bloom Report | ✅ **gate passed** (owner, 2026-09-26) — [`demos/demo-run.html`](demos/demo-run.html) |
| Slice audit + tuning | fixed a dead shop and misleading readouts; ~5 min perfect-bot run (6–8 min for a person); purchase preview; teaching Bloom Report | ✅ |
| Post-gate 1 · stabilize shared modules (BLOOM-002) | slice simulation extracted to a shared DOM-free engine; tuning, upgrades and the planet moved to data files; gameplay unchanged (bit-for-bit golden) | ✅ |
| Post-gate 2 · reconnect procedural generation (BLOOM-003) | the Portion 1 generator is a shared, seeded module that emits the engine's planet model; the engine models water/impassable terrain; validator foundation (§10.3); `demo-surface.html` uses the shared code | ✅ |
| Post-gate 3 · archetypes + content (§10.1) | designed archetypes, more traits, water-crossing Spread, winnability validator layers | ⏭ next |
| Post-gate 4–5 | pressure scenarios (§11) · visual polish + final hex boards (§7, §12) | later |

**What the slice proves (verified headless):** two broad winning builds exist. The *wet* build (Flood I) gives up Dust Reach; the *dry* build (Drought I) gives up Marsh Low. Both need Cold ×2 + Heat ×1 + Salt Handling, and a Warm/Cool Terraform can replace one temperature point. A generalist without a water strategy caps at ~67.6%, and over-committing (Flood/Drought II) collapses the home regions. The preview warns you before you do that.

## Next steps (bible §15 post-gate sequence)

1. ~~Extract/stabilize shared simulation modules~~ (BLOOM-002) · ~~reconnect procedural generation~~ (BLOOM-003).
2. **Expand archetypes and content** (§10.1, §17):
   - designed archetypes on top of `BLOOM.generatePlanet`;
   - a water-crossing Spread trait (bible §9: no land may stay unreachable with the strongest Spread trait; islands are currently diagnostically stranded);
   - the remaining validator layers (§10.3: coverage feasibility, trait affordability, winnable margin, pacing).
3. **Pressure scenarios** (§11).
4. **Visual polish and final board interactions** (§7, §12, friendly/cutesy direction).
5. Still-open design questions (need prototypes, not debate): bubble frequency/auto-collect, how much to predict before a Terraform buy, final plant personality, exact board layout.

Tuning stays data-only: every rate/cost/threshold is in [`content/config.js`](content/config.js). An intended retune regenerates the golden with `node tools/sim-check.js --write` and must say so in its commit.

## QA

```bash
node tools/sim-check.js                                                  # engine + content, Node, <1 s
node tools/gen-check.js                                                  # generator, validator, water, Node, ~2 s
NODE_PATH="$(npm root -g)" node tools/slice-check.js [--shots <dir>]     # demo-run UI, real shop buttons
NODE_PATH="$(npm root -g)" node tools/surface-check.js [--shots <dir>]   # demo-surface UI, both modes
```

- **`sim-check.js`** (17 checks, no dependencies):
  - the golden First Bloom runs, bit-for-bit;
  - content is pure data;
  - the engine has no DOM access;
  - config drives behavior;
  - a second planet runs on the unchanged engine;
  - water sections are modeled as impassable, and unknown terrain is still refused.
- **`gen-check.js`** (39 checks, no dependencies):
  - fixed seeds for zero water, moderate water, islands and a denominator case;
  - same seed reproduces exactly, and different seeds diverge;
  - a 375-map sweep through the validator;
  - validator negative tests (each defect is caught);
  - generated planets run 3,000 ticks in `BLOOM.createSim`;
  - water is out of the win denominator;
  - spread never crosses water (with a land control case);
  - malformed terrain is rejected.
- **`slice-check.js`** (14 checks) drives the **real shop buttons**: pacing, both winning builds, tradeoff guards, preview, readouts, Bloom Report.
- **`surface-check.js`** (10 checks) drives the surface demo toolbar and proves it renders the shared generator's planets. Both browser suites need `npm i -g playwright`.
- Exit code 1 = failure for all four.

## Architecture

```
resources/bloom-sim.js       shared simulation engine, no DOM: layout (Voronoi or explicit tilemap),
                             water/impassable terrain, 4-category evaluation, tick, economy, bubbles,
                             win, upgrade effects, purchase preview, shared grid geometry (BLOOM.geo)
resources/bloom-gen.js       seeded procedural surface generator → the engine's planet model
resources/bloom-validate.js  planet validator foundation (bible §10.3)
content/config.js            every rate / cost scale / threshold / category boundary (§15, invariant 11)
content/traits.js            the upgrade catalogue as data: board, effect type, cost, science line
planets/first_bloom.js       the authored slice planet
demos/demo-run.html          UI + rendering for the First Bloom run
demos/demo-surface.html      UI + rendering for the surface demo (authored Cinder-Frost + Random)
tools/                       sim-check · gen-check (Node) · slice-check · surface-check (browser) · golden/
docs/evidence/               screenshots attached to directive reports
```

- **One planet model.**
  - An authored planet gives section `center`s and gets a weighted-Voronoi layout.
  - A procedural planet carries an explicit `tilemap` (section index per tile, `-1` = water).
  - Sections may be `kind: "land"` (default) or `"water" | "void" | "lava"`.
  - `BLOOM.resolveLayout` turns either form into the tiles the simulation runs on, and the validator checks those same tiles.
- **`BLOOM.generatePlanet({seed, waterPct, sections, width, height, minLandmassTiles})`** is deterministic. It uses a mulberry32 RNG and never `Math.random`. Its steps:
  1. carve water from a noise field at the requested percentile;
  2. turn islets smaller than `minLandmassTiles` (default 12) into shallow water;
  3. grow sections by land-only flood fill, so every section is contiguous and never spans water;
  4. derive `neighbors` from the real geography;
  5. place the origin on the lowest-stress section of the largest landmass.
- **Water/impassable terrain (bible §9):**
  - it never becomes Living or Dead and never seeds spread;
  - it earns no Biomass;
  - it is excluded from coverage and the win denominator (`sim.map.LAND`).
  - The engine still refuses unknown terrain kinds and malformed tilemaps.
- **Content files** are plain classic scripts holding JSON-shaped data. They load over bare `file://` with one source of truth.
- **Upgrade effects** are four engine types (`tempPoint`, `waterArm`, `level`, `sky`). A new trait of an existing type is data only.
- **Current limitations:**
  - No water-crossing Spread yet, so islands off the origin landmass are *diagnostically unreachable* (the validator reports them as stranded).
  - Procedural planets have no archetypes yet, and their winnability is not validated.
  - Coasts don't change moisture in the simulation.
  - `demo-run.html` still plays only First Bloom (no planet menu).
  - Cinder-Frost remains a demo-only sample inside `demo-surface.html`.

## Run

Open any file in `demos/` directly in a browser (no build step, no server required). Keep the folder structure: the demos load `../content`, `../planets` and `../resources`.

## Plan of record

[`GAME_BIBLE.md`](GAME_BIBLE.md) — the design bible (v1.1). Everything reconciles there; when in doubt, it wins.
