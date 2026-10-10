# Species strategic-distinctness study (BLOOM-035A research tool)

**Research only — not a QA gate, not production.** Read-only against the repository: it loads the BLOOM classic scripts, generates /
evaluates worlds, and writes results into this folder. It never edits a planet, the config or any content file. Results and method:
[`docs/SPECIES_STUDY_v1.md`](../../../docs/SPECIES_STUDY_v1.md).

Kept here (not under `tools/*-check.js`) until the PMO accepts the methodology; BLOOM-035B may promote it to
`tools/research/species-study.js` with fixtures backing `tools/species-check.js` (docs/SPECIES_SYSTEM_v1.md §10).

The candidate physiologies are applied as **derived configs** (`BLOOM.play.deriveConfig` over `config.genomeBase`). That is valid for the
study only — the default scenario has no native organism. Production species go through the `createSim(…, { species })` seam.

## Run (Node 20+, from the repository root; ~15 min on 16 cores)

```sh
D=tools/research/species-study
# 1 · the species-free physical sample: 120 World Seeds per archetype through the survey's own production path (≈ 3 min each, parallel)
for a in ocean_archipelago desert_world frozen_world; do node $D/gen-worlds.js . $a 120 $D/worlds/$a.json & done; wait
node $D/profile.js                # condition quantiles of the sample (run from $D)
# 2 · species evaluation (assess + witness + strategies) and the entanglement measurement, all physiologies in species.json
$D/run-study.sh .
# 3 · tables
(cd $D && node aggregate.js organic_hybrid,dry_heat,cold_v2,wet_flood,cold_rad,cold_only,cold_dry,dry_v2,dry_sharp,wet_nosalt,wet_v1 results)
```

| File | Role |
|---|---|
| `load.js` | loads the classic scripts into `globalThis` (repo root default `../../..`) |
| `gen-worlds.js` | phase 1: fixed seed stream per archetype → `BLOOM.play.runSearch` (default scenario) → validated, stripped planets |
| `species-eval.js` | phase 2: per world and physiology — landing assessment, `findWitness`, optional `findStrategies` (`--strategies`) |
| `entangle.js` | what world construction WOULD produce with a specialist's physiology fed in (same / different / no planet) |
| `aggregate.js` | Markdown tables + `summary.json` |
| `profile.js` | area-weighted condition quantiles per archetype |
| `species.json` | the candidate physiologies (study values, not locked) |

`worlds/` (≈ 10 MB of planets) is not committed: step 1 regenerates it bit-for-bit, and `results/worlds-index.json` (seed, accepted attempt and an FNV-1a of every sampled stripped planet) lets anyone verify that. The committed `results/` hold the per-world
evaluations and the tables.
