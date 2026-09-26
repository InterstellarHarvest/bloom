# BLOOM

A retro-pixel **terraforming / evolution** game in the *Plague Inc.* lineage, built to teach middle-school life & earth science. You are a single pioneer plant dropped onto a hostile world: **evolve** to endure local ground conditions, **terraform** the global sky to bend the whole climate toward you, and win by covering a target % of the planet. The plant drives its own terraform loop — as it spreads it photosynthesizes and changes the atmosphere, so success snowballs (a deliberate echo of the Great Oxidation Event).

> *A planet's "mood" is its sky — you can change that. A region's "personality" is its ground — you have to adapt to that.*

## Status — slice gate PASSED; Ocean Archipelago worlds validated through all eight layers

The original plan was eight isolated portion demos. In August 2026 the **v1.1 direction change** ([PR #1](https://github.com/InterstellarHarvest/bloom/pull/1), see [`docs/GAMEPLAY_DIRECTION_DECISIONS_v1.0.md`](docs/GAMEPLAY_DIRECTION_DECISIONS_v1.0.md)) replaced that march with a single gate: **one complete, ugly-but-playable Eden run** ([`docs/NEXT_PLAYABLE_SLICE_v1.0.md`](docs/NEXT_PLAYABLE_SLICE_v1.0.md)). The slice was built, audited and tuned, and the owner **cleared the gate on 2026-09-26**. Work now follows the bible's post-gate sequence (§15).

| Milestone | What | State |
|---|---|---|
| Portion 1 · The Surface | tile/section model · weighted-Voronoi + procedural generator · water/islands · border tracer | ✅ [`demos/demo-surface.html`](demos/demo-surface.html) |
| Next Playable Slice | one Eden run on the authored 9-section planet *First Bloom*: spread sim (Barren/Living/Dead, hysteresis, die-back, recovery) · Temperature/Water/Soil/Hazard readout + one named limiting factor · passive Biomass + bubbles · temporary Spread/Adapt/Terraform set · hover preview of what a purchase opens/closes · 70% win · Bloom Report | ✅ **gate passed** (owner, 2026-09-26) — [`demos/demo-run.html`](demos/demo-run.html) |
| Slice audit + tuning | fixed a dead shop and misleading readouts; ~5 min perfect-bot run (6–8 min for a person); purchase preview; teaching Bloom Report | ✅ |
| Post-gate 1 · stabilize shared modules (BLOOM-002) | slice simulation extracted to a shared DOM-free engine; tuning, upgrades and the planet moved to data files; gameplay unchanged (bit-for-bit golden) | ✅ |
| Post-gate 2 · reconnect procedural generation (BLOOM-003) | the Portion 1 generator is a shared, seeded module that emits the engine's planet model; the engine models water/impassable terrain; validator foundation (§10.3); `demo-surface.html` uses the shared code | ✅ |
| Post-gate 3a · Waterborne Seeds + reachability (BLOOM-004) | first water-crossing Spread trait (geography-derived crossings, finite range, ordinary fitness rules); validator proves every land tile is reachable with the strongest Spread; generator can keep islands in range | ✅ |
| Post-gate 3b · archetypes + winnability (BLOOM-005) | data-driven archetype layer + **Ocean Archipelago**; deterministic archetype generate → validate → retry; validator layers 4–6 via a real no-cheat **witness build** | ✅ |
| Post-gate 3c · strategy diversity + pacing (BLOOM-006) | validator **layers 7–8**: ≥ 2 materially distinct broad strategies per Ocean Archipelago world, each inside provisional pacing bands; production generation requires layers 1–8 | ✅ |
| Post-gate 3d · more archetypes/content | further archetypes and traits (§10.1, §17) | ⏭ next |
| Post-gate 4–5 | pressure scenarios (§11) · visual polish + final hex boards (§7, §12) | later |

**Procedural validation (BLOOM-006):** validator layers 1–8 (bible §10.3) are implemented. Ocean Archipelago generation accepts a world only if it passes structural validity, reachability, winnability, the win margin, strategy diversity (≥ 2 materially distinct broad environmental approaches, described by effect-based strategy signatures) and pacing (provisional time bands). This is validator evidence from a perfect-knowledge witness. **No procedural world has been validated by a human player yet**, and there is no player-facing planet menu.

**What the slice proves (verified headless):** several broad winning builds exist. The human-paced recipes in `slice-check` are: the *wet* build (Flood I), which gives up Dust Reach; the *dry* build (Drought I), which gives up Marsh Low; and a *Terraform* build (Humidify ×2 instead of Drought, with no water Adaptation), which also gives up Marsh Low. The witness solver finds more (e.g. a Cool or Warm Terraform replacing a temperature point). The tested build with **neither water Adaptation nor water Terraform** (Seed Output ×2, Early Maturity, Cold ×2, Heat, Salt, Radiation) caps at 67.6%. The solver's static search agrees: within its bounds, no build without a water tool exceeds 67.6%. Over-committing (Flood/Drought II) collapses the home regions, and the preview warns you before you do that.

## Next steps (bible §15 post-gate sequence)

1. ~~Extract/stabilize shared simulation modules~~ (BLOOM-002) · ~~reconnect procedural generation~~ (BLOOM-003).
2. ~~Water-crossing Spread + geographic reachability~~ (BLOOM-004).
3. ~~Archetype layer, Ocean Archipelago, validator layers 4–6~~ (BLOOM-005) · ~~layers 7–8: strategy diversity + pacing~~ (BLOOM-006).
4. **More archetypes and content** (§10.1, §17). Each new archetype states its own `minStrategies` and pacing bands.
5. **Pressure scenarios** (§11).
6. **Visual polish and final board interactions** (§7, §12, friendly/cutesy direction). A player-facing planet menu is still to come.
7. Still-open design questions (need prototypes, not debate): bubble frequency/auto-collect, how much to predict before a Terraform buy, final plant personality, exact board layout.

Tuning stays data-only: every rate/cost/threshold is in [`content/config.js`](content/config.js). An intended retune regenerates the golden with `node tools/sim-check.js --write` and must say so in its commit.

## QA

```bash
node tools/sim-check.js                                                  # engine + content, Node, <1 s
node tools/gen-check.js                                                  # generator, validator, water, Node, ~5 s
node tools/crossing-check.js                                             # Waterborne Seeds / crossings, Node, <1 s
node tools/archetype-check.js                                            # archetypes, winnability, 40-seed production sweep, Node, ~55 s
node tools/strategy-check.js                                             # layers 7–8: strategy diversity + pacing, Node, ~16 s
NODE_PATH="$(npm root -g)" node tools/slice-check.js [--shots <dir>]     # demo-run UI, real shop buttons
NODE_PATH="$(npm root -g)" node tools/surface-check.js [--shots <dir>]   # demo-surface UI, both modes
```

- **`sim-check.js`** (18 checks, no dependencies):
  - the golden First Bloom runs, bit-for-bit;
  - content is pure data;
  - the engine has no DOM access;
  - config drives behavior;
  - a second planet runs on the unchanged engine;
  - water sections are modeled as impassable, and unknown terrain is still refused;
  - traits added after the golden (Waterborne Seeds) are not offered on First Bloom.
- **`gen-check.js`** (47 checks, no dependencies):
  - fixed seeds for zero water, moderate water, islands and a denominator case;
  - reachability under ordinary spread vs the strongest Spread, including rejecting an out-of-range archipelago;
  - same seed reproduces exactly, and different seeds diverge;
  - a 375-map sweep through the validator;
  - validator negative tests (each defect is caught);
  - generated planets run 3,000 ticks in `BLOOM.createSim`;
  - water is out of the win denominator;
  - spread never crosses water (with a land control case);
  - malformed terrain is rejected.
- **`crossing-check.js`** (14 checks, no dependencies):
  - the same strait with and without the trait;
  - water untouched;
  - finite range (a 7-tile gap stays unreached, a 6-tile gap is reached);
  - a hostile island receives seeds but never establishes;
  - a colony that turns hostile dies back;
  - a generated archipelago is fully colonized.
- **`archetype-check.js`** (40 checks, no dependencies):
  - archetype schema;
  - deterministic generate/retry and explicit bounded failure;
  - a 40-seed Ocean Archipelago coherence sweep through the full layers 1–8 production path (water, landmasses, moisture, sections, crossing required, adaptation needed, variety), plus the layer 7–8 statistics: rejections by layer, strategy classes, margin/win/first-purchase/gap distributions, runtime;
  - the winning fixture (seed 8) with layers 4–6, an independent earned-Biomass replay, and proof that Waterborne Seeds and an Adapt decision are both required;
  - negative fixtures rejected at layer 4 (seed 3) and layer 6 (seed 25);
  - solver bounds and determinism;
  - First Bloom passes layers 4–6 too.
- **`strategy-check.js`** (35 checks, no dependencies), layers 7–8:
  - the pacing policy is archetype data, and the schema rejects bad bands;
  - positive fixture (seed 13, attempt 6): two materially distinct strategies (Cold + Salt vs Heat + Radiation, holding different land), each replayed independently with earned Biomass, each buying its whole core before the margin, both inside the pacing bands;
  - signature rules: purchase order, Spread boosters, redundant add-ons and trait ids never make a new strategy;
  - negatives: layer 7 single-strategy (seed 5 attempt 0, a static proof); layer 8 too slow (seed 27 attempt 1); first purchase too late (seed 20 attempt 2); purchase gap (seed 17 attempt 2, plus an isolated controlled boundary); too fast (controlled boundary, because fast worlds are single-strategy and already fail layer 7);
  - caps produce INCONCLUSIVE, never FAIL, and production rejects INCONCLUSIVE;
  - determinism; production worlds record and re-validate layers 1–8;
  - First Bloom's Terraform water alternative and the exact 67.6% no-water-tool cap.
- **`slice-check.js`** (15 checks) drives the **real shop buttons**: pacing, the wet, dry and Terraform (Humidify, no water Adaptation) winning builds, tradeoff guards, preview, readouts, Bloom Report.
- **`surface-check.js`** (11 checks) drives the surface demo toolbar, proves it renders the shared generator's planets, and finds an in-range archipelago through New Map. Both browser suites need `npm i -g playwright`.
- Exit code 1 = failure for all seven.

## Architecture

```
resources/bloom-sim.js       shared simulation engine, no DOM: layout (Voronoi or explicit tilemap),
                             water/impassable terrain, water crossings, 4-category evaluation, tick,
                             economy, bubbles, win, upgrade effects, purchase preview, grid geometry (BLOOM.geo)
resources/bloom-gen.js       seeded procedural surface generator → the engine's planet model
resources/bloom-validate.js  planet validator (bible §10.3 layers 1–8)
resources/bloom-witness.js   witness solver: winnability (layers 4–6), strategy diversity + pacing (7–8)
resources/bloom-archetype.js BLOOM.generateFromArchetype: deterministic generate → validate → retry
content/config.js            every rate / cost scale / threshold / category boundary (§15, invariant 11)
content/traits.js            the upgrade catalogue as data: board, effect type, cost, science line
content/archetypes.js        planet archetypes as data (Ocean Archipelago)
planets/first_bloom.js       the authored slice planet
demos/demo-run.html          UI + rendering for the First Bloom run
demos/demo-surface.html      UI + rendering for the surface demo (authored Cinder-Frost + Random)
tools/                       sim-check · gen-check · crossing-check · archetype-check · strategy-check (Node) · slice-check · surface-check (browser) · golden/
docs/evidence/               screenshots attached to directive reports
```

- **One planet model.**
  - An authored planet gives section `center`s and gets a weighted-Voronoi layout.
  - A procedural planet carries an explicit `tilemap` (section index per tile, `-1` = water).
  - Sections may be `kind: "land"` (default) or `"water" | "void" | "lava"`.
  - `BLOOM.resolveLayout` turns either form into the tiles the simulation runs on, and the validator checks those same tiles.
- **`BLOOM.generatePlanet({seed, waterPct, sections, width, height, minLandmassTiles, maxCrossingGap, terrainWeights, climate})`** is deterministic. `terrainWeights` and `climate` are the knobs archetypes set; their defaults reproduce the Portion 1 layout exactly. It uses a mulberry32 RNG and never `Math.random`. Its steps:
  1. carve water from a noise field at the requested percentile;
  2. turn islets smaller than `minLandmassTiles` (default 12) into shallow water;
  3. grow sections by land-only flood fill, so every section is contiguous and never spans water;
  4. derive `neighbors` from the real geography;
  5. place the origin on the lowest-stress section of the largest landmass.
  - `maxCrossingGap` is optional and off by default. When set (product callers pass `config.crossing.maxGap`), landmasses the main landmass can't reach by crossings of at most that many water tiles become water, so bible §9 holds. Without it, the validator rejects such planets.
- **Water/impassable terrain (bible §9):**
  - it never becomes Living or Dead and never seeds spread;
  - it earns no Biomass;
  - it is excluded from coverage and the win denominator (`sim.map.LAND`).
  - The engine still refuses unknown terrain kinds and malformed tilemaps.
- **Waterborne Seeds (bible §9, §17)** is a data-driven Spread trait with effect type `crossing`. Ordinary spread still never crosses water.
  - **Crossings come from geography.** From every coastal land tile, the engine walks through water tiles only, for at most `config.crossing.maxGap` (6) steps. Any land tile of another landmass touching a reached water tile is a landing site at that gap.
  - **Seed pressure.** Once the trait is owned, each Living coastal source adds `chancePerSource` (0.0005) × `gapFalloff` (0.7)^(gap−1) of seed pressure to its landing tiles.
  - **Establishment.** Seeds establish only under the ordinary grow rule: the section must be above the grow threshold, scaled by fitness (and by Seed Output). A hostile shore receives seeds that never take. After a foothold, normal spread, die-back and adaptation apply.
  - **Where it's offered.** The trait appears only on maps that have a crossing, so First Bloom's shop is unchanged.
- **Archetypes (bible §10.1)** are plain data in `content/archetypes.js`: section range, water range and tolerance, climate, geography and validation rules. The generator stays general.
  - **Ocean Archipelago:** 12–18 sections and 55–68% water (±5), in a maritime climate. That means a smaller temperature swing, a humid sky and more saline coasts from sea spray. Finer-scale terrain gives many near islands, at least 3 landmasses, and an origin landmass holding ≤ 62% of the land, so a crossing strategy is required to win.
  - **`BLOOM.generateFromArchetype(archetype, publicSeed, {config, traits})`** is deterministic. Attempt *k* uses the generation seed FNV-1a(`id|seed|k`) and draws its section count and water request from that seed. An attempt is accepted only when:
    - the structure and strongest-Spread reachability checks pass;
    - actual water is within tolerance of the request;
    - the landmass and origin-share rules hold;
    - (for `winnable` archetypes) validator layers 4–6 pass;
    - (when the archetype sets `minStrategies` / `pacing`, as Ocean Archipelago does) layers 7–8 **PASS**. INCONCLUSIVE counts as a rejection.
  - It stops at `generation.maxAttempts` (24) and **throws** with every attempt's reasons rather than returning a bad world. `planet.archetype` records the public seed, attempt, generation seed, water and witness summary.
- **Witness builds (§10.3 layers 4–6).** `BLOOM.validatePlanet(planet, config, {traits, winnability: true})` asks `BLOOM.findWitness` for proof, in two stages:
  1. **Static search.** It enumerates legal terminal builds by effect type under the engine's own rules and estimates the land each could hold (growable sections reachable from the origin, plus real crossings). It keeps the builds that reach win + `config.validation.winMargin` (0.70 + 0.03) and ranks them cheapest first.
  2. **Real simulation.** It runs the best few with a fixed validation RNG, buying through `sim.buy` as soon as **earned** Biomass allows. There are no grants and no extra starting Biomass.
  - A planet passes when a witness holds ≥ 73% alive at once. Failures name the layer: 4 (no build can hold the win), 5 (can't be bought in time), or 6 (below the margin).
  - Search limits are explicit (`maxStaticStates`, `maxSimulations`, `maxTicks`). A capped search is reported as *inconclusive*, never as a verdict on the planet.
  - The margin is validation policy only; players still win at 70%.
- **Strategy diversity (§10.3 layer 7).** `BLOOM.findStrategies` (the validator's `{strategies: {minStrategies, pacing}}` path) groups every candidate build into **strategy classes**:
  - **Minimal sufficient core.** A build reduces to the cheapest sub-build that still reaches the validation target and has no smaller sufficient sub-build. Upgrades the win didn't need never count.
  - **Signature.** The core becomes one token per environmental condition it answers, built from **effects, not trait ids**: `Temperature:cold|heat`, `Water:dry|wet`, `Defense:<stat>` and `Crossing:<stat>`. Each token records the means and amount: Adapt points, the net Terraform sky shift, or both (e.g. `Water:wet=Terraform(−8)`). Seed Output and Early Maturity never appear.
  - **Material difference.** Two strategies differ only if each has a token the other lacks. Purchase order, Spread timing, a redundant add-on, or the Waterborne Seeds every island build shares can never make a second strategy.
  - **Search.** Classes are simulated cheapest first: each class's cheapest builds (≤ `maxBuildsPerClass`, under every Spread opening) with real `sim.buy` and earned Biomass, until `minStrategies` pairwise-distinct classes qualify.
  - **Proof rule.** A witness counts only if it bought its whole core before reaching the margin.
- **Pacing (§10.3 layer 8).** A strategy qualifies only if its witness also fits the archetype's `pacing` bands, and a win after an absurd wait doesn't count. For Ocean Archipelago the provisional validator hypotheses are:
  - margin reached in 360–900 s;
  - first purchase at 45–120 s;
  - no gap over 240 s between purchases before the margin.
  - They are time bands for a perfect-knowledge witness (people are slower; the bible's session target is 10–20 human minutes), not final balance.
  - Also recorded: purchase intervals, win and margin times, peak coverage, the terminal wait, Biomass earned per game-minute (and whether it grows), and early land reachable/growable without upgrades.
- **Verdicts.** Layer 7 needs `minStrategies` distinct classes that win with margin; layer 8 needs that many that also pace. A shortfall is **FAIL** only when every class was settled and the static enumeration was uncapped. Any cap (`config.validation.diversity`: 40 simulations, 2 builds per class) makes it **INCONCLUSIVE**. A capped search can still **PASS** once the strategies are proven.
- **Current sweep (public seeds 1–40).**
  - 35 accepted; seeds 3, 7, 19, 35 and 38 fail explicitly (under layers 1–6 only seed 35 failed).
  - Accepted strategies reach the margin in 366–890 s, make their first purchase at 52–107 s, and have a largest purchase gap of 79–157 s.
  - Generation takes a median of ~0.35 s per seed (worst ~7 s).
- **Validator reachability (§10.3 layer 3)** reports sections and landmasses reachable by ordinary spread and with the strongest Spread in the catalogue. Islands that need Waterborne Seeds are allowed. Land unreachable even with it fails a procedural planet.
- **Content files** are plain classic scripts holding JSON-shaped data. They load over bare `file://` with one source of truth.
- **Upgrade effects** are four engine types (`tempPoint`, `waterArm`, `level`, `sky`). A new trait of an existing type is data only.
- **Current limitations:**
  - One crossing trait at one range, with no currents or wind (other Spread crossings from bible §17, such as Wind or Ballistic Seeds, don't exist yet).
  - The purchase preview doesn't yet show which islands Waterborne Seeds would open.
  - One archetype (Ocean Archipelago) and **no player-facing procedural planet menu** yet. `demo-run.html` still plays First Bloom only.
  - Layers 7–8 are validator evidence, **not human validation**. Witnesses use perfect knowledge and buy on the first affordable tick; no procedural world has been playtested by a person. The pacing bands are provisional hypotheses.
  - Many accepted worlds earn their second strategy by answering the *same* condition by other means (e.g. Flood Adaptation vs Dry the Sky), sometimes holding the same land. The directive counts Adapt vs Terraform as material; a stricter rule (require different land held) is a possible later tightening.
  - Static search bounds still apply to layer-7 FAIL proofs: water ≤ 2 points and ≤ 2 Terraform steps per sky axis.
  - Coasts don't change moisture in the simulation.
  - `demo-run.html` still plays only First Bloom (no planet menu).
  - Cinder-Frost remains a demo-only sample inside `demo-surface.html`.

## Run

Open any file in `demos/` directly in a browser (no build step, no server required). Keep the folder structure: the demos load `../content`, `../planets` and `../resources`.

## Plan of record

[`GAME_BIBLE.md`](GAME_BIBLE.md) — the design bible (v1.1). Everything reconciles there; when in doubt, it wins.
