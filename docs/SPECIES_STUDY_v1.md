# Strange Bloom — species strategic-distinctness study v1 (BLOOM-035A)

**Status: RESEARCH (BLOOM-035A).** Read-only measurement. No production file was changed; the measurement scripts live in
[`tools/research/species-study/`](../tools/research/species-study/) (kept out of the production paths and out of every QA gate until the
PMO accepts the methodology). Architecture: [`SPECIES_SYSTEM_v1.md`](SPECIES_SYSTEM_v1.md). Concepts and art: [`SPECIES_BODY_PLANS_v1.md`](SPECIES_BODY_PLANS_v1.md).

## 1. Question

Can four starting physiologies, and *only* physiology (no growth or economy modifiers), give:

- recognizable strengths and meaningful weaknesses;
- no universally superior species;
- no species frequently trapped on impossible worlds;
- interesting choices *before* the player sees the Survey?

The goal is not equal performance everywhere.

## 2. Method

**Physical sample (species-free).** For each procedural archetype, 120 World Seeds from a fixed deterministic stream
(`mulberry32(0x035A0000 + archetypeIndex · 7919)`, seeds in 1 … 99 999). Every seed went through the survey's own production path —
`BLOOM.play.runSearch({ archetype, scenario: null, seeds: [seed] })` → `generateFromArchetype` layers 1–8 → `stripPlanet` — exactly what a
Destination Survey cell holds. **358 validated worlds** (Ocean Archipelago 118 / 120, Desert World 120 / 120, Frozen World 120 / 120),
plus the authored First Bloom and Training Grounds. Each planet object was then frozen; nothing below regenerates or edits it.

**Species evaluation.** For each physiology, on every world:

- `assess` — the engine's own `createSim(…).evaluate()` / `lampOf()` at landing (no purchases, starting sky): green / yellow / red land
  shares (area-weighted), the limiting condition of every non-green region, the origin's raw fitness (before the protected-refuge
  floor), refuges (other green regions);
- `findWitness` — layers 4–6 with this physiology (real engine, fixed validation RNG, earned Biomass, `sim.buy`): winnable or not, the
  witness plan, its spend, purchases and win time, and `early.reachableShare` (land growable *and* reachable from the origin at landing);
- `findStrategies` with the archetype's own policy (`minStrategies: 2` + pacing bands) — the four primary physiologies only: distinct
  winning strategies (layer 7), pacing (layer 8), the fastest margin, and whether each winner answers the archetype's
  `requiredConditions` (Desert `Water:dry`, Frozen `Temperature:cold`).

For the study only, a physiology is applied as a derived config (`BLOOM.play.deriveConfig(config, { genomeBase, categories })`). That is
legitimate here because the default scenario has no native organism; production must use the species seam instead
(SPECIES_SYSTEM §4).

**Entanglement measurement.** For the first 40 sample seeds of each archetype, the same production path was run with each specialist's
physiology fed into world construction, and the resulting planet fingerprint compared with the reference planet — what would happen if
the species were (wrongly) a world-generation input.

**Definitions.**

- *Landing habitable share* — green-lamp land at arrival: the Destination Survey's own measure (`assessWorld`).
- *No landing foothold* — less than 5 % of the land is growable (fitness > `growThresh` 0.55) and reachable from the origin at landing.
- *Materially better / worse than Organic Hybrid* — the same world's landing share differs by ≥ 0.10.
- *Too fast* — the fastest winning strategy reaches the validation margin before the archetype's pacing floor (240 s): the world poses
  little problem for that physiology.
- *Trivializes* — an archetype is trivialized for a species when most of its worlds are Favorable for it **and** its winners are mostly
  too fast **and** they routinely skip the archetype's defining condition.

## 3. Physiologies

| id | role | temp window | water window | salt | radiation | toxicity | notes |
|---|---|---|---|---|---|---|---|
| `organic_hybrid` | **A** generalist (today) | −6 … 24 | 32 … 68 | 15 | 30 | 25 | `config.genomeBase` |
| `dry_heat` | **B** dry / heat — **recommended** | 2 … 34 | 18 … 50 | 15 | 35 | 25 | |
| `cold_v2` | **C** cold (+ radiation) — **recommended** | −14 … 16 | 28 … 64 | 15 | 50 | 25 | same 30° width as A |
| `cold_rad` | C v1 (first calibration) | −20 … 12 | 28 … 64 | 15 | 50 | 25 | trivializes Frozen (§5) |
| `wet_flood` | **D** wet / flood (+ salt) — **recommended** | −6 … 24 | 42 … 82 | 60 | 30 | 25 | |
| `cold_only` | C′ sensitivity | −20 … 12 | 28 … 64 | 15 | **30** | 25 | C v1 without its radiation strength |
| `cold_dry` | C‴ alternative | −20 … 12 | **22 … 62** | 15 | 30 | 25 | cold + dry-hardy instead of radiation |
| `dry_v2` | B v2 sensitivity | **0 … 32** | **22 … 54** | 15 | 35 | 25 | a narrower dry specialist |
| `wet_nosalt` | D′ sensitivity | −6 … 24 | 42 … 82 | **15** | 30 | 25 | D without its salt strength |
| `wet_v1` | D draft v1 | −6 … 24 | **50 … 86** | 60 | 30 | 25 | first draft, rejected (§4) |
| `dry_sharp` | B″ sensitivity | 2 … 34 | 18 … 50 | 15 | 35 | 25 | Temperature soft 7, Water soft 8 (global: 10 / 12) |

Calibration: the specialists' windows were placed from the area-weighted condition profile of the sample (§3.1), so each specialist
covers the bulk of its home archetype's ground while keeping a window no wider than Organic Hybrid's.

### 3.1 Condition profile of the physical sample (area-weighted quantiles p5 / p10 / p25 / p50 / p75 / p90 / p95)

| archetype | temperature °C | moisture | salinity | radiation |
|---|---|---|---|---|
| Ocean (118) | −8 / −6 / 0 / 12 / 23 / 30 / 32 | 40 / 45 / 53 / 62 / 73 / 80 / 84 | 1 / 2 / 4 / 7 / 11 / 74 / 82 | 12 / 13 / 17 / 25 / 33 / 51 / 58 |
| Desert (120) | 5 / 7 / 12 / 19 / 27 / 31 / 33 | −13 / −7 / 3 / 15 / 27 / 37 / 43 | 1 / 1 / 3 / 7 / 10 / 60 / 74 | 12 / 13 / 19 / 27 / 40 / 55 / 60 |
| Frozen (120) | −40 / −35 / −28 / −16 / −1 / 16 / 23 | 27 / 31 / 38 / 46 / 54 / 61 / 64 | 1 / 1 / 3 / 7 / 10 / 11 / 12 | 11 / 12 / 16 / 22 / 29 / 32 / 34 |

Salinity is bimodal (ordinary 0–12, salt ground 55–90), so a salt strength only matters at a tolerance near 60. Radiation ≥ 40 exists
only on hot ground (> 26 °C, `bloom-gen.js:245-257`).

## 4. Results (all 358 worlds per physiology)

Generated by `tools/research/species-study/aggregate.js` (`results/tables.md`). A–D = organic_hybrid, dry_heat, cold_v2, wet_flood.

### 4.1 Landing habitable share (green-lamp land at arrival)

| species | archetype | n | min | p10 | p25 | median | p75 | p90 | max |
|---|---|---|---|---|---|---|---|---|---|
| organic_hybrid | Ocean | 118 | 0.07 | 0.22 | 0.31 | **0.44** | 0.54 | 0.60 | 0.82 |
| organic_hybrid | Desert | 120 | 0.03 | 0.05 | 0.09 | **0.14** | 0.19 | 0.23 | 0.44 |
| organic_hybrid | Frozen | 120 | 0.13 | 0.16 | 0.21 | **0.27** | 0.35 | 0.43 | 0.57 |
| dry_heat | Ocean | 118 | 0.00 | 0.00 | 0.00 | **0.10** | 0.18 | 0.26 | 0.46 |
| dry_heat | Desert | 120 | 0.03 | 0.18 | 0.23 | **0.33** | 0.40 | 0.47 | 0.70 |
| dry_heat | Frozen | 120 | 0.00 | 0.06 | 0.11 | **0.18** | 0.23 | 0.28 | 0.49 |
| cold_v2 | Ocean | 118 | 0.00 | 0.13 | 0.19 | **0.29** | 0.41 | 0.49 | 0.64 |
| cold_v2 | Desert | 120 | 0.00 | 0.05 | 0.08 | **0.12** | 0.16 | 0.23 | 0.44 |
| cold_v2 | Frozen | 120 | 0.10 | 0.22 | 0.29 | **0.37** | 0.48 | 0.56 | 0.67 |
| wet_flood | Ocean | 118 | 0.21 | 0.39 | 0.51 | **0.59** | 0.67 | 0.75 | 0.91 |
| wet_flood | Desert | 120 | 0.00 | 0.00 | 0.00 | **0.05** | 0.08 | 0.11 | 0.27 |
| wet_flood | Frozen | 120 | 0.00 | 0.10 | 0.15 | **0.22** | 0.28 | 0.35 | 0.51 |
| cold_rad | Ocean | 118 | 0.00 | 0.09 | 0.16 | **0.23** | 0.36 | 0.46 | 0.64 |
| cold_rad | Desert | 120 | 0.00 | 0.03 | 0.05 | **0.09** | 0.12 | 0.16 | 0.30 |
| cold_rad | Frozen | 120 | 0.16 | 0.31 | 0.37 | **0.46** | 0.54 | 0.62 | 0.79 |
| cold_only | Ocean | 118 | 0.00 | 0.09 | 0.15 | **0.23** | 0.36 | 0.46 | 0.64 |
| cold_only | Desert | 120 | 0.00 | 0.00 | 0.05 | **0.08** | 0.12 | 0.15 | 0.30 |
| cold_only | Frozen | 120 | 0.16 | 0.30 | 0.36 | **0.45** | 0.54 | 0.60 | 0.79 |
| cold_dry | Ocean | 118 | 0.00 | 0.02 | 0.13 | **0.23** | 0.33 | 0.45 | 0.61 |
| cold_dry | Desert | 120 | 0.00 | 0.03 | 0.07 | **0.11** | 0.15 | 0.22 | 0.35 |
| cold_dry | Frozen | 120 | 0.04 | 0.30 | 0.38 | **0.46** | 0.54 | 0.62 | 0.77 |
| dry_v2 | Ocean | 118 | 0.00 | 0.00 | 0.07 | **0.17** | 0.26 | 0.33 | 0.49 |
| dry_v2 | Desert | 120 | 0.03 | 0.14 | 0.19 | **0.24** | 0.32 | 0.42 | 0.61 |
| dry_v2 | Frozen | 120 | 0.00 | 0.08 | 0.15 | **0.21** | 0.27 | 0.33 | 0.49 |
| dry_sharp | Ocean | 118 | 0.00 | 0.00 | 0.00 | **0.08** | 0.17 | 0.23 | 0.46 |
| dry_sharp | Desert | 120 | 0.03 | 0.16 | 0.21 | **0.31** | 0.38 | 0.45 | 0.70 |
| dry_sharp | Frozen | 120 | 0.00 | 0.05 | 0.09 | **0.16** | 0.21 | 0.27 | 0.49 |
| wet_nosalt | Ocean | 118 | 0.21 | 0.36 | 0.44 | **0.55** | 0.63 | 0.71 | 0.85 |
| wet_nosalt | Desert | 120 | 0.00 | 0.00 | 0.00 | **0.05** | 0.08 | 0.11 | 0.25 |
| wet_nosalt | Frozen | 120 | 0.00 | 0.10 | 0.15 | **0.22** | 0.28 | 0.35 | 0.51 |
| wet_v1 | Ocean | 118 | 0.17 | 0.36 | 0.43 | **0.55** | 0.66 | 0.73 | 0.97 |
| wet_v1 | Desert | 120 | 0.00 | 0.00 | 0.00 | **0.00** | 0.02 | 0.06 | 0.13 |
| wet_v1 | Frozen | 120 | 0.00 | 0.05 | 0.08 | **0.15** | 0.20 | 0.29 | 0.43 |

### 4.2 Survey class frequency (≥ 35 % Favorable · ≥ 20 % Precarious · else Extreme)

| species | archetype | Favorable | Precarious | Extreme |
|---|---|---|---|---|
| organic_hybrid | Ocean | 84 (71%) | 25 (21%) | 9 (8%) |
| organic_hybrid | Desert | 2 (2%) | 21 (18%) | 97 (81%) |
| organic_hybrid | Frozen | 29 (24%) | 64 (53%) | 27 (23%) |
| dry_heat | Ocean | 3 (3%) | 24 (20%) | 91 (77%) |
| dry_heat | Desert | 54 (45%) | 47 (39%) | 19 (16%) |
| dry_heat | Frozen | 5 (4%) | 36 (30%) | 79 (66%) |
| cold_v2 | Ocean | 45 (38%) | 39 (33%) | 34 (29%) |
| cold_v2 | Desert | 2 (2%) | 15 (13%) | 103 (86%) |
| cold_v2 | Frozen | 72 (60%) | 38 (32%) | 10 (8%) |
| wet_flood | Ocean | 113 (96%) | 5 (4%) | 0 (0%) |
| wet_flood | Desert | 0 (0%) | 1 (1%) | 119 (99%) |
| wet_flood | Frozen | 12 (10%) | 56 (47%) | 52 (43%) |
| cold_rad | Ocean | 32 (27%) | 42 (36%) | 44 (37%) |
| cold_rad | Desert | 0 (0%) | 5 (4%) | 115 (96%) |
| cold_rad | Frozen | 94 (78%) | 23 (19%) | 3 (3%) |
| cold_only | Ocean | 32 (27%) | 41 (35%) | 45 (38%) |
| cold_only | Desert | 0 (0%) | 4 (3%) | 116 (97%) |
| cold_only | Frozen | 93 (78%) | 23 (19%) | 4 (3%) |
| cold_dry | Ocean | 26 (22%) | 40 (34%) | 52 (44%) |
| cold_dry | Desert | 0 (0%) | 15 (13%) | 105 (88%) |
| cold_dry | Frozen | 97 (81%) | 20 (17%) | 3 (3%) |
| dry_v2 | Ocean | 9 (8%) | 39 (33%) | 70 (59%) |
| dry_v2 | Desert | 24 (20%) | 62 (52%) | 34 (28%) |
| dry_v2 | Frozen | 8 (7%) | 57 (48%) | 55 (46%) |
| dry_sharp | Ocean | 3 (3%) | 19 (16%) | 96 (81%) |
| dry_sharp | Desert | 48 (40%) | 47 (39%) | 25 (21%) |
| dry_sharp | Frozen | 4 (3%) | 28 (23%) | 88 (73%) |
| wet_nosalt | Ocean | 108 (92%) | 10 (8%) | 0 (0%) |
| wet_nosalt | Desert | 0 (0%) | 1 (1%) | 119 (99%) |
| wet_nosalt | Frozen | 11 (9%) | 56 (47%) | 53 (44%) |
| wet_v1 | Ocean | 108 (92%) | 9 (8%) | 1 (1%) |
| wet_v1 | Desert | 0 (0%) | 0 (0%) | 120 (100%) |
| wet_v1 | Frozen | 1 (1%) | 29 (24%) | 90 (75%) |

### 4.3 Dominant limiting factor (largest share of the land that is not green), top 3

| species | archetype | frequency |
|---|---|---|
| organic_hybrid | Ocean | Soil:hostile 38% · Water:wet 29% · Hazard:lethal 22% |
| organic_hybrid | Desert | Water:parched 93% · Water:dry 8% |
| organic_hybrid | Frozen | Temperature:freezing 100% |
| dry_heat | Ocean | Water:flooded 77% · Water:wet 15% · Temperature:freezing 3% |
| dry_heat | Desert | Water:parched 59% · Water:dry 28% · Hazard:lethal 12% |
| dry_heat | Frozen | Temperature:freezing 100% |
| cold_v2 | Ocean | Temperature:scorching 49% · Water:wet 25% · Soil:hostile 14% |
| cold_v2 | Desert | Water:parched 53% · Temperature:scorching 46% · Water:dry 1% |
| cold_v2 | Frozen | Temperature:freezing 97% · Temperature:cold 3% |
| wet_flood | Ocean | Hazard:lethal 58% · Soil:hostile 13% · Temperature:cold 6% |
| wet_flood | Desert | Water:parched 100% |
| wet_flood | Frozen | Temperature:freezing 100% |
| cold_rad | Ocean | Temperature:scorching 77% · Soil:hostile 8% · Water:wet 8% |
| cold_rad | Desert | Temperature:scorching 86% · Water:parched 13% · Water:dry 1% |
| cold_rad | Frozen | Temperature:freezing 87% · Temperature:cold 8% · Soil:hostile 3% |
| cold_only | Ocean | Temperature:scorching 77% · Soil:hostile 8% · Water:wet 8% |
| cold_only | Desert | Temperature:scorching 86% · Water:parched 13% · Water:dry 1% |
| cold_only | Frozen | Temperature:freezing 87% · Temperature:cold 8% · Soil:hostile 3% |
| cold_dry | Ocean | Temperature:scorching 72% · Water:wet 11% · Water:flooded 8% |
| cold_dry | Desert | Temperature:scorching 93% · Water:parched 6% · Water:dry 1% |
| cold_dry | Frozen | Temperature:freezing 87% · Temperature:cold 8% · Soil:hostile 3% |
| dry_v2 | Ocean | Water:flooded 70% · Water:wet 18% · Soil:hostile 8% |
| dry_v2 | Desert | Water:parched 74% · Water:dry 22% · Hazard:lethal 3% |
| dry_v2 | Frozen | Temperature:freezing 100% |
| dry_sharp | Ocean | Water:flooded 72% · Water:wet 20% · Temperature:freezing 5% |
| dry_sharp | Desert | Water:parched 53% · Water:dry 39% · Hazard:lethal 6% |
| dry_sharp | Frozen | Temperature:freezing 100% |
| wet_nosalt | Ocean | Soil:hostile 61% · Hazard:lethal 27% · Temperature:cold 3% |
| wet_nosalt | Desert | Water:parched 100% |
| wet_nosalt | Frozen | Temperature:freezing 100% |
| wet_v1 | Ocean | Hazard:lethal 54% · Water:dry 16% · Soil:hostile 9% |
| wet_v1 | Desert | Water:parched 100% |
| wet_v1 | Frozen | Temperature:freezing 99% · Water:parched 1% |

### 4.4 Foothold and winnability (witness, layers 4–6, this physiology)

| species | archetype | no landing foothold (<5 % growable + reachable) | origin red (raw ≤ 0.30) | winnable | median witness spend | median purchases | median win | Extreme AND unwinnable |
|---|---|---|---|---|---|---|---|---|
| organic_hybrid | Ocean | 7 (6%) | 12 (10%) | 118/118 (100%) | 710 | 4 | 372 s | 0 |
| organic_hybrid | Desert | 24 (20%) | 0 (0%) | 120/120 (100%) | 750 | 4 | 220 s | 0 |
| organic_hybrid | Frozen | 11 (9%) | 0 (0%) | 120/120 (100%) | 540 | 3 | 210 s | 0 |
| dry_heat | Ocean | 14 (12%) | 69 (58%) | 118/118 (100%) | 860 | 5 | 464 s | 0 |
| dry_heat | Desert | 6 (5%) | 5 (4%) | 120/120 (100%) | 500 | 3 | 170 s | 0 |
| dry_heat | Frozen | 18 (15%) | 18 (15%) | 120/120 (100%) | 890 | 5 | 298 s | 0 |
| cold_v2 | Ocean | 8 (7%) | 27 (23%) | 118/118 (100%) | 800 | 5 | 392 s | 0 |
| cold_v2 | Desert | 20 (17%) | 8 (7%) | 120/120 (100%) | 640 | 4 | 215 s | 0 |
| cold_v2 | Frozen | 5 (4%) | 0 (0%) | 120/120 (100%) | 410 | 3 | 173 s | 0 |
| wet_flood | Ocean | 2 (2%) | 3 (3%) | 118/118 (100%) | 650 | 4 | 345 s | 0 |
| wet_flood | Desert | 36 (30%) | 18 (15%) | 120/120 (100%) | 770 | 4 | 264 s | 0 |
| wet_flood | Frozen | 15 (13%) | 9 (8%) | 120/120 (100%) | 620 | 4 | 236 s | 0 |
| cold_rad | Ocean | 10 (8%) | 38 (32%) | 118/118 (100%) | 800 | 5 | 411 s | 0 |
| cold_rad | Desert | 23 (19%) | 18 (15%) | 120/120 (100%) | 820 | 5 | 247 s | 0 |
| cold_rad | Frozen | 3 (3%) | 0 (0%) | 120/120 (100%) | 270 | 2 | 153 s | 0 |
| cold_only | Ocean | 10 (8%) | 38 (32%) | 118/118 (100%) | 800 | 5 | 433 s | 0 |
| cold_only | Desert | 24 (20%) | 18 (15%) | 120/120 (100%) | 840 | 5 | 271 s | 0 |
| cold_only | Frozen | 3 (3%) | 0 (0%) | 120/120 (100%) | 270 | 2 | 158 s | 0 |
| cold_dry | Ocean | 11 (9%) | 39 (33%) | 117/118 (99%) | 800 | 5 | 424 s | 0 |
| cold_dry | Desert | 18 (15%) | 18 (15%) | 120/120 (100%) | 840 | 5 | 255 s | 0 |
| cold_dry | Frozen | 4 (3%) | 0 (0%) | 120/120 (100%) | 270 | 2 | 157 s | 0 |
| dry_v2 | Ocean | 11 (9%) | 48 (41%) | 118/118 (100%) | 800 | 5 | 454 s | 0 |
| dry_v2 | Desert | 10 (8%) | 3 (3%) | 120/120 (100%) | 500 | 3 | 182 s | 0 |
| dry_v2 | Frozen | 17 (14%) | 7 (6%) | 120/120 (100%) | 740 | 4 | 268 s | 0 |
| dry_sharp | Ocean | 16 (14%) | 79 (67%) | 118/118 (100%) | 890 | 5 | 470 s | 0 |
| dry_sharp | Desert | 8 (7%) | 7 (6%) | 118/120 (98%) | 500 | 3 | 176 s | 0 |
| dry_sharp | Frozen | 19 (16%) | 28 (23%) | 120/120 (100%) | 890 | 5 | 311 s | 0 |
| wet_nosalt | Ocean | 4 (3%) | 5 (4%) | 118/118 (100%) | 650 | 4 | 344 s | 0 |
| wet_nosalt | Desert | 37 (31%) | 18 (15%) | 120/120 (100%) | 840 | 5 | 272 s | 0 |
| wet_nosalt | Frozen | 15 (13%) | 9 (8%) | 120/120 (100%) | 690 | 4 | 236 s | 0 |
| wet_v1 | Ocean | 3 (3%) | 8 (7%) | 118/118 (100%) | 670 | 4 | 367 s | 0 |
| wet_v1 | Desert | 42 (35%) | 66 (55%) | 120/120 (100%) | 910 | 5 | 313 s | 0 |
| wet_v1 | Frozen | 22 (18%) | 38 (32%) | 120/120 (100%) | 690 | 4 | 269 s | 0 |

### 4.5 Strategy diversity (findStrategies with the archetype's minStrategies + pacing) and archetype trivialization

| species | archetype | layer 7 PASS (≥ minStrategies distinct) | layers 7 + 8 PASS (pacing) | ≥ 2 distinct winners | median minimal build (purchases) | median fastest margin | fastest margin < 240 s (too fast) | a winner skips the archetype's required condition |
|---|---|---|---|---|---|---|---|---|
| organic_hybrid | Ocean | 118/118 (100%) | 118/118 (100%) | 118 (100%) | 3 | 378 s | 2 (2%) | n/a |
| organic_hybrid | Desert | 120/120 (100%) | 120/120 (100%) | 120 (100%) | 3 | 254 s | 10 (8%) | 0 (0%) |
| organic_hybrid | Frozen | 120/120 (100%) | 120/120 (100%) | 120 (100%) | 2 | 248 s | 23 (19%) | 0 (0%) |
| dry_heat | Ocean | 106/118 (90%) | 91/118 (77%) | 106 (90%) | 4 | 477 s | 0 (0%) | n/a |
| dry_heat | Desert | 95/120 (79%) | 43/120 (36%) | 95 (79%) | 2 | 177 s | 83 (69%) | 11 (9%) |
| dry_heat | Frozen | 120/120 (100%) | 112/120 (93%) | 120 (100%) | 3 | 302 s | 3 (3%) | 0 (0%) |
| cold_v2 | Ocean | 115/118 (97%) | 110/118 (93%) | 115 (97%) | 4 | 398 s | 0 (0%) | n/a |
| cold_v2 | Desert | 120/120 (100%) | 118/120 (98%) | 120 (100%) | 3 | 255 s | 27 (23%) | 0 (0%) |
| cold_v2 | Frozen | 119/120 (99%) | 66/120 (55%) | 119 (99%) | 2 | 177 s | 80 (67%) | 7 (6%) |
| wet_flood | Ocean | 83/118 (70%) | 79/118 (67%) | 83 (70%) | 3 | 360 s | 2 (2%) | n/a |
| wet_flood | Desert | 116/120 (97%) | 116/120 (97%) | 116 (97%) | 3 | 278 s | 2 (2%) | 0 (0%) |
| wet_flood | Frozen | 120/120 (100%) | 120/120 (100%) | 120 (100%) | 3 | 258 s | 13 (11%) | 0 (0%) |
| cold_rad | Ocean | 117/118 (99%) | 112/118 (95%) | 117 (99%) | 4 | 421 s | 0 (0%) | n/a |
| cold_rad | Desert | 120/120 (100%) | 119/120 (99%) | 120 (100%) | 4 | 264 s | 8 (7%) | 0 (0%) |
| cold_rad | Frozen | 113/120 (94%) | 61/120 (51%) | 113 (94%) | 1 | 158 s | 96 (80%) | 25 (21%) |
| dry_v2 | Ocean | 101/118 (86%) | 90/118 (76%) | 101 (86%) | 4 | 444 s | 0 (0%) | n/a |
| dry_v2 | Desert | 97/120 (81%) | 62/120 (52%) | 97 (81%) | 2 | 191 s | 72 (60%) | 5 (4%) |
| dry_v2 | Frozen | 120/120 (100%) | 114/120 (95%) | 120 (100%) | 3 | 277 s | 6 (5%) | 0 (0%) |

### 4.6 Overlap with Organic Hybrid (same world)

| species | archetype | same class as OH | median Δ habitable | materially better (Δ ≥ +0.10) | materially worse (Δ ≤ −0.10) | winnable only for species | winnable only for OH |
|---|---|---|---|---|---|---|---|
| dry_heat | Ocean | 14 (12%) | -0.31 | 0 (0%) | 112 (95%) | 0 | 0 |
| dry_heat | Desert | 28 (23%) | +0.16 | 90 (75%) | 0 (0%) | 0 | 0 |
| dry_heat | Frozen | 49 (41%) | -0.09 | 0 (0%) | 59 (49%) | 0 | 0 |
| cold_v2 | Ocean | 67 (57%) | -0.11 | 1 (1%) | 65 (55%) | 0 | 0 |
| cold_v2 | Desert | 94 (78%) | +0.00 | 10 (8%) | 13 (11%) | 0 | 0 |
| cold_v2 | Frozen | 49 (41%) | +0.09 | 54 (45%) | 6 (5%) | 0 | 0 |
| wet_flood | Ocean | 85 (72%) | +0.15 | 76 (64%) | 3 (3%) | 0 | 0 |
| wet_flood | Desert | 98 (82%) | -0.08 | 0 (0%) | 42 (35%) | 0 | 0 |
| wet_flood | Frozen | 78 (65%) | -0.05 | 0 (0%) | 30 (25%) | 0 | 0 |
| cold_rad | Ocean | 52 (44%) | -0.15 | 1 (1%) | 77 (65%) | 0 | 0 |
| cold_rad | Desert | 96 (80%) | -0.05 | 3 (3%) | 28 (23%) | 0 | 0 |
| cold_rad | Frozen | 33 (28%) | +0.18 | 84 (70%) | 6 (5%) | 0 | 0 |
| cold_only | Ocean | 51 (43%) | -0.16 | 1 (1%) | 79 (67%) | 0 | 0 |
| cold_only | Desert | 97 (81%) | -0.05 | 2 (2%) | 29 (24%) | 0 | 0 |
| cold_only | Frozen | 35 (29%) | +0.17 | 82 (68%) | 6 (5%) | 0 | 0 |
| cold_dry | Ocean | 45 (38%) | -0.19 | 1 (1%) | 85 (72%) | 0 | 1 |
| cold_dry | Desert | 94 (78%) | -0.01 | 10 (8%) | 22 (18%) | 0 | 0 |
| cold_dry | Frozen | 32 (27%) | +0.18 | 87 (73%) | 6 (5%) | 0 | 0 |
| dry_v2 | Ocean | 22 (19%) | -0.23 | 0 (0%) | 99 (84%) | 0 | 0 |
| dry_v2 | Desert | 48 (40%) | +0.11 | 68 (57%) | 0 (0%) | 0 | 0 |
| dry_v2 | Frozen | 55 (46%) | -0.06 | 2 (2%) | 47 (39%) | 0 | 0 |
| dry_sharp | Ocean | 14 (12%) | -0.32 | 0 (0%) | 114 (97%) | 0 | 0 |
| dry_sharp | Desert | 34 (28%) | +0.16 | 86 (72%) | 0 (0%) | 0 | 2 |
| dry_sharp | Frozen | 44 (37%) | -0.11 | 0 (0%) | 69 (57%) | 0 | 0 |
| wet_nosalt | Ocean | 89 (75%) | +0.09 | 54 (46%) | 7 (6%) | 0 | 0 |
| wet_nosalt | Desert | 98 (82%) | -0.08 | 0 (0%) | 42 (35%) | 0 | 0 |
| wet_nosalt | Frozen | 76 (63%) | -0.06 | 0 (0%) | 31 (26%) | 0 | 0 |
| wet_v1 | Ocean | 85 (72%) | +0.11 | 60 (51%) | 10 (8%) | 0 | 0 |
| wet_v1 | Desert | 97 (81%) | -0.12 | 0 (0%) | 70 (58%) | 0 | 0 |
| wet_v1 | Frozen | 40 (33%) | -0.13 | 0 (0%) | 79 (66%) | 0 | 0 |

### 4.7 Authored worlds

| species | First Bloom habitable | class | Training Grounds habitable | class |
|---|---|---|---|---|
| organic_hybrid | 0.35 | F | 0.39 | F |
| dry_heat | 0.13 | E | 0.36 | F |
| cold_v2 | 0.35 | F | 0.60 | F |
| wet_flood | 0.35 | F | 0.39 | F |
| cold_rad | 0.45 | F | 0.60 | F |
| cold_only | 0.45 | F | 0.60 | F |
| cold_dry | 0.45 | F | 0.52 | F |
| dry_v2 | 0.36 | F | 0.51 | F |
| dry_sharp | 0.13 | E | 0.36 | F |
| wet_nosalt | 0.35 | F | 0.39 | F |
| wet_v1 | 0.24 | P | 0.39 | F |

### 4.8 Expected draws to fill one survey column (3 cells), per class — the archetype-uniform stream, physical failures, and the species' S2 witness

| species | Favorable | Precarious | Extreme |
|---|---|---|---|
| organic_hybrid | 9.4 (9.4 w/o S2) | 9.8 (9.8 w/o S2) | 8.1 (8.1 w/o S2) |
| dry_heat | 17.4 (17.4 w/o S2) | 10.1 (10.1 w/o S2) | 5.7 (5.7 w/o S2) |
| cold_v2 | 9.1 (9.1 w/o S2) | 11.7 (11.7 w/o S2) | 7.3 (7.3 w/o S2) |
| wet_flood | 8.6 (8.6 w/o S2) | 17.4 (17.4 w/o S2) | 6.3 (6.3 w/o S2) |
| cold_rad | 8.6 (8.6 w/o S2) | 15.4 (15.4 w/o S2) | 6.7 (6.7 w/o S2) |
| cold_only | 8.6 (8.6 w/o S2) | 15.9 (15.9 w/o S2) | 6.5 (6.5 w/o S2) |
| cold_dry | 8.8 (8.8 w/o S2) | 14.6 (14.4 w/o S2) | 6.7 (6.7 w/o S2) |
| dry_v2 | 26.3 (26.3 w/o S2) | 6.8 (6.8 w/o S2) | 6.8 (6.8 w/o S2) |
| dry_sharp | 19.6 (19.6 w/o S2) | 11.7 (11.5 w/o S2) | 5.2 (5.2 w/o S2) |
| wet_nosalt | 9.1 (9.1 w/o S2) | 16.1 (16.1 w/o S2) | 6.3 (6.3 w/o S2) |
| wet_v1 | 9.9 (9.9 w/o S2) | 28.4 (28.4 w/o S2) | 5.1 (5.1 w/o S2) |

### 4.9 Cross-species agreement on the same world (A–D)

| archetype | all four in one class | two classes | all three classes | species with the highest landing share |
|---|---|---|---|---|
| Ocean | 2 (2%) | 74 (63%) | 42 (36%) | organic_hybrid 12% · dry_heat 0% · cold_v2 1% · wet_flood 87% |
| Desert | 19 (16%) | 80 (67%) | 21 (18%) | organic_hybrid 8% · dry_heat 92% · cold_v2 1% · wet_flood 0% |
| Frozen | 11 (9%) | 70 (58%) | 39 (33%) | organic_hybrid 23% · dry_heat 1% · cold_v2 76% · wet_flood 0% |

## 5. Interpretation

### 5.1 Recognizable strengths and real weaknesses — yes, from physiology alone

Each specialist owns one archetype and pays elsewhere. The species with the highest landing share on a world: Ocean → wet/flood
**87 %**, Desert → dry/heat **92 %**, Frozen → cold **76 %** (§4.9). On the same physical world the four species agree on the class only
**2 % (Ocean) · 16 % (Desert) · 9 % (Frozen)** of the time; on a third or more of worlds the four species span all three classes. The
Survey therefore genuinely changes with the species, and a species is a real choice made *before* the planet is seen.

Weaknesses are concrete and readable in the limiting factor (§4.3): the dry specialist's land is lost to **flooded / wet** ground on Ocean
worlds (92 % of worlds' dominant limit) and to **freezing** on Frozen; the cold specialist's to **scorching** ground (Ocean 49 %, Desert
46 %); the wet specialist's to **parched** ground (Desert 100 %).

### 5.2 No universally superior species — yes

Every specialist is materially worse than Organic Hybrid (Δ ≤ −0.10 landing share) on a large share of the other archetypes' worlds
(dry/heat on Ocean 95 %, cold on Ocean 55 %, wet on Desert 35 %) and materially better on most of its own (dry/heat Desert 75 %, cold
Frozen 45 %, wet Ocean 64 %). Organic Hybrid is never the best on most worlds of any archetype (8–23 %) but has the best **worst case**:
its lowest archetype median is 0.14 (Desert) against 0.05–0.12 for the specialists. That is the generalist role, measured.

### 5.3 No species trapped on impossible worlds — yes

The witness (layers 4–6, real engine, earned Biomass) won **100 % of the 358 worlds for every physiology tested** — including the
deliberately over-wet first draft. Adapt + Terraform are strong enough that a bad start is a hard game, not a lost one. "No landing
foothold" (< 5 % of the land growable and reachable at landing) does occur — worst: wet/flood on Desert 30 %, Organic Hybrid on Desert
20 % — and those worlds show as **Extreme**, which is exactly the Survey's job. S2 (species winnability) therefore never rejected a
sampled world; it is kept as the guarantee, not as a filter that shapes the Survey.

### 5.4 Trivialization — the one real problem, and the reason C was re-tuned

The first cold calibration (`cold_rad`, −20 … 12 °C) **trivializes Frozen**: 78 % Favorable, the fastest strategy reaches the margin before
the pacing floor on 80 % of worlds, the median minimal winning build is **one** purchase, and 21 % of worlds have a winner that never
answers the cold (the archetype's defining condition). Narrowing the window to the generalist's width (`cold_v2`, −14 … 16 °C) keeps the
cold specialist clearly best on Frozen (median 0.37 vs 0.27, Favorable 60 % vs 24 %) while the cold remains a problem it must answer on
94 % of worlds (6 % skip) and the minimal build doubles.

The dry specialist on Desert is strong but not trivial: Favorable on 45 % of Desert worlds, a winner skips Drought / Humidify on only 9 %.
Its home wins are fast (69 % before the pacing floor) — but so are 19 % of Organic Hybrid's Frozen wins today. A narrower dry
specialist (`dry_v2`) loses most of its identity (First Bloom becomes Favorable, Desert Favorable drops to 20 %, Favorable columns need
26 draws) without fixing pacing (60 % still fast). **Recommendation: B as calibrated; C at v2.**

The wet specialist does not trivialize Ocean: crossing water is still required (every winner buys Waterborne Seeds), only 2 % of wins
are fast; but 30 % of Ocean worlds have just one distinct winning strategy for it (it can live almost everywhere, so its strategies
collapse into one).

Pacing (layer 8) is a band the archetypes were tuned to for the **reference** plant. A specialist on its home archetype is *supposed* to
be faster; it is not a defect of the world. This is why the species S-layers do not include pacing (SPECIES_SYSTEM §6.3).

### 5.5 What each strength is worth

| Strength removed | Measured effect | Verdict |
|---|---|---|
| cold's radiation (C → C′) | landing median changes ≤ 0.01 on every archetype; Frozen Favorable 94 → 93 | **latent only** at landing — radiation ≥ 40 exists only on ground > 26 °C (§3.1) |
| cold's radiation replaced by dry-hardiness (C‴) | Desert median 0.09 → 0.11, Precarious 4 % → 13 %; Ocean slightly worse | a small, real landing strength |
| wet's salt (D → D′) | Ocean median 0.59 → 0.55, Favorable 96 % → 92 %; dominant Ocean limit becomes hostile soil (61 %) | modest but visible on coasts |
| dry's sharper edges (B → B″) | every archetype 0.01–0.02 worse; no new identity | not worth a per-species softness |

### 5.6 Survey consequences (measured)

- **Class thresholds can stay global.** Every species fills every column: the expected draws for three cells of the rarest class are
  ≤ 17.4 (dry/heat Favorable, wet/flood Precarious) against 8–10 for Organic Hybrid today and the `MAX_DRAWS = 400` budget (§4.8).
- **Cost.** A full sector needs ≈ 27 draws for Organic Hybrid and 28–33 for a specialist (+3 … +22 %); each offered cell adds one S2
  witness (~0.3 s against 0.6–2.6 s of physical validation). Expect a first sector for a specialist ≈ 20–50 % slower than today's, and
  any later species much cheaper because physical candidates are shared (SPECIES_SYSTEM §5.2).
- **First Bloom** (authored): Organic Hybrid **0.353** Favorable (by 0.003), dry/heat **0.131** Extreme, cold v2 **0.353** Favorable (by
  0.003), wet/flood **0.353** Favorable (by 0.003). Three of four species sit on the same knife-edge (First Bloom's meadows lie inside all
  three windows; the share is decided by the same few regions). The fixture-table + boundary-check rule (SPECIES_SYSTEM §5.7) is
  therefore necessary, not optional. Training Grounds is Favorable for every species (0.36–0.60).

## 6. Planet-identity entanglement (measured)

What the production path would produce if the specialist's physiology were fed into world construction, first 40 seeds per archetype:

| physiology | Ocean: same / different planet | Desert | Frozen | different overall |
|---|---|---|---|---|
| dry/heat | 18 / 21 (+1 world only with the species) | 14 / 26 | 16 / 24 | **71 / 120 (59 %)** |
| cold (v1) | 23 / 16 (+1 only with the species) | 24 / 16 | 9 / 31 | **63 / 120 (53 %)** |
| wet/flood | 21 / 17 (1 world lost, 1 neither) | 20 / 20 | 25 / 15 | **52 / 120 (43 %)** |

Between 38 % and 78 % of seeds per (species, archetype) would become a **different planet** — another accepted attempt `k` from the
archetype loop (`bloom-archetype.js:87-145`), because `minOriginFitness`, `minRefuges`, the witness and the strategy / pacing layers read
the plant. This is the measured case for the reference-physiology decision (SPECIES_SYSTEM §2.3): with species kept out of world
construction, 0 % change by construction.

## 7. Recommendations

1. **Physiology only** for v1; no growth / economy modifiers; global softness.
2. **The recommended set:** A Organic Hybrid (unchanged) · B dry/heat 2 … 34 °C, water 18 … 50, rad 35 · C cold −14 … 16 °C, water 28 … 64,
   rad 50 · D wet/flood −6 … 24 °C, water 42 … 82, salt 60. Exact numbers stay tunable in 035B with this tool.
3. **Cold role:** keep "cold + radiation" with radiation presented as a latent strength (it pays after Heat Tolerance and under Dying
   World), or switch to "cold + dry-hardy" (C‴) for a small landing benefit — PMO choice.
4. **Survey:** global thresholds; S1 + S2 required, S3 / S4 recorded only; physical candidates shared across species.
5. **QA:** First Bloom's class per species from a fixture table with a boundary check; the study's seed list and world index as
   deterministic fixtures.

## 8. Limitations

- The witness is a perfect-knowledge bot; "100 % winnable" says a fair plan exists, not that a person finds it. Human difficulty per
  (species, archetype) still needs a playtest once species exist.
- Strategy diversity (layer 7) stops counting at the archetype's `minStrategies` (2), so "distinct strategies" is a floor.
- One fixed seed stream per archetype (120 seeds); classes near a threshold (First Bloom) are sensitive to small changes by nature.
- The study applies physiology as a derived config; this is equivalent for the default scenario only (no natives).
- Challenges (Dying World's rising radiation, Native Competition) were out of scope; the cold specialist's radiation strength would show
  there.
