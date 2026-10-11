# BLOOM-036B — Challenge recipe study

**Read-only measurement, done BEFORE any recipe number was chosen** (PMO directive §4). Data:
[`challenge-recipe-study.json`](challenge-recipe-study.json) (per-world rows + two analyses). Tools:
[`tools/challenge-recipe-study.mjs`](../../../tools/challenge-recipe-study.mjs) (the measurement) ·
[`tools/challenge-recipe-analysis.mjs`](../../../tools/challenge-recipe-analysis.mjs) (the tables and the selection model). Nothing in the
engine, the species, the scenarios or the world generator was changed to make a recipe pass; the study asserts the catalogue is byte-identical
before and after.

## 1. Method

- **Sample:** 120 worlds of the normal physical stream — every archetype (Ocean Archipelago · Desert World · Frozen World) × 40 World Seeds
  drawn from a fixed stream (`mulberry32(0x036b)` in `content/play.js` search 1…99999).
- **Per world, the production path, nothing re-implemented:** the structural prediction (layers 1–3, what a cheap pre-filter sees) ·
  `physicalCandidate` (`BLOOM.play.runSearch`, default scenario, layers 1–8) · for each of the four released species `evaluateSpecies`
  (engine `evaluate()` arrival share / class, `BLOOM.species.validateFor` S1 + S2) · for each S2-winnable world × each of the three Challenge
  scenarios `BLOOM.validateScenario` (layer P) with the species.
- **Recorded:** generation times per stage; arrival share and class; S2; the layer-P status, reason, simulation count and time; the
  validator's pacing / mechanic evidence (margin time, first purchase, purchases, Terraform steps, decline progress at the margin and coverage
  held — Dying World; native start / peak share and contested regions — Native Competition; shocks before the hold — Volatile Climate).
- **Selection model** (`challenge-recipe-analysis.mjs`): 4 000 resampled streams per Challenge × species; the real rule (stream-order
  acceptance, 8 draws in parallel, the launch's first 8 physical worlds prefetched while the species is chosen) gives attempts and wall time.
  The study ran 15 workers on 16 hardware threads, so its absolute times are **inflated by contention** (the browser timings in
  [`REPORT.md`](REPORT.md) are the product numbers); the model is for comparing recipes.
- 1 195 s wall (15 workers), 2026-10-11.

## 2. Findings

### 2.1 The physical stream and the species

- 119 / 120 seeds yield a validated world (one Ocean Archipelago seed has none — stage `physical`). Physical validation: median 3.2 s,
  p90 8.0 s, max 34.5 s (Ocean Archipelago has the slow tail: p90 14.9 s). 84 / 119 validated worlds are the structural world itself; the
  rest are a later attempt of the same seed — the structural prediction is a filter only, the validated world is always re-checked.
- **S2: every species can win every one of the 119 worlds.** Arrival classes differ a lot by species (Favorable / Precarious / Extreme):
  Organic Hybrid 33 / 47 / 39 · Cinder Rosette 22 / 34 / 63 · Woolly Candle 28 / 37 / 54 · Reed Spire 41 / 18 / 60. Species evaluation costs
  ~0.7 s (S2 witness; Organic Hybrid reuses the construction proof: 5 ms).

### 2.2 Per Challenge × species — the broad stream (every archetype, no constraint, the validator's full budget)

| Challenge | Species | qualifying | layer-P fail | arrival class of qualifying worlds (F / P / E) | layer P pass median / p90 | layer P fail median / max | key evidence |
|---|---|---|---|---|---|---|---|
| Dying World | Organic Hybrid | 104/120 (86.7 %) | 15 | 29 / 42 / 33 | 1.2 s / 4.9 s | 5.9 s / 33.1 s | margin ≥ 240 s (median 314.7 s); decline at margin ≥ 80 % |
| Dying World | Cinder Rosette | 100/120 (83.3 %) | 19 | 13 / 30 / 57 | 1.4 s / 10.8 s | 13.3 s / 40.8 s | margin ≥ 241.8 s (median 340 s); decline at margin ≥ 81 % |
| Dying World | Woolly Candle | 112/120 (93.3 %) | 7 | 24 / 35 / 53 | 1.5 s / 8.6 s | 28.7 s / 32.8 s | margin ≥ 240.2 s (median 274.1 s); decline at margin ≥ 80 % |
| Dying World | Reed Spire | 105/120 (87.5 %) | 14 | 36 / 16 / 53 | 1.0 s / 4.1 s | 6.1 s / 44.7 s | margin ≥ 244.5 s (median 321.1 s); decline at margin ≥ 82 % |
| Native Competition | Organic Hybrid | 105/120 (87.5 %) | 14 | 27 / 44 / 34 | 10.7 s / 23.5 s | 38.6 s / 132.3 s | margin ≥ 263.7 s (median 459.7 s); native start ≥ 9 % (median 28 %); contested regions median 10 |
| Native Competition | Cinder Rosette | 85/120 (70.8 %) | 34 | 20 / 28 / 37 | 10.7 s / 48.8 s | 38.2 s / 127.8 s | margin ≥ 243.8 s (median 425.3 s); native start ≥ 9 % (median 27 %); contested regions median 9 |
| Native Competition | Woolly Candle | 109/120 (90.8 %) | 10 | 28 / 32 / 49 | 9.3 s / 22.0 s | 24.8 s / 110.7 s | margin ≥ 241.3 s (median 401.3 s); native start ≥ 9 % (median 28 %); contested regions median 10 |
| Native Competition | Reed Spire | 92/120 (76.7 %) | 27 | 33 / 17 / 42 | 9.4 s / 24.5 s | 28.5 s / 108.5 s | margin ≥ 246.1 s (median 496.5 s); native start ≥ 9 % (median 28 %); contested regions median 10 |
| Volatile Climate | Organic Hybrid | 118/120 (98.3 %) | 1 | 33 / 46 / 39 | 4.8 s / 13.3 s | 14.3 s / 14.3 s | margin ≥ 240 s (median 268.2 s); witness Terraforms 40/118, meets a shock 3 |
| Volatile Climate | Cinder Rosette | 101/120 (84.2 %) | 18 | 13 / 29 / 59 | 2.9 s / 12.1 s | 16.3 s / 33.4 s | margin ≥ 240 s (median 317 s); witness Terraforms 59/101, meets a shock 12 |
| Volatile Climate | Woolly Candle | 107/120 (89.2 %) | 12 | 21 / 34 / 52 | 4.5 s / 14.4 s | 10.6 s / 48.9 s | margin ≥ 240.2 s (median 275.5 s); witness Terraforms 45/107, meets a shock 10 |
| Volatile Climate | Reed Spire | 114/120 (95 %) | 5 | 38 / 17 / 59 | 2.7 s / 6.4 s | 8.9 s / 18.1 s | margin ≥ 241 s (median 276.6 s); witness Terraforms 26/114, meets a shock 0 |

### 2.3 Degenerate cases and what drives them

- **Dying World / Volatile Climate — trivial starts are already rejected by layer P.** Their failures concentrate on *Favorable* arrival
  worlds for the specialists (Dying World: Cinder 9 / 22 Favorable worlds fail, Woolly 4 / 28; Volatile Climate: Cinder 9 / 22, Woolly 7 / 28),
  and the most common reason is the pacing policy — the margin is reached before the mechanic has done its work ("too fast"). Every world
  that passes Dying World reaches its margin ≥ 240 s in and at ≥ 80 % of the decline, then holds 60 s into the final state: the mechanic is
  decisive on every accepted world. Volatile Climate's witnesses rarely meet a shock (the scenario's own design: "a plant that adapts instead
  of reshaping the sky meets little instability"); an arrival cap (Favorable excluded) was modelled and changes the share of Terraforming
  witnesses by only a few points (Organic Hybrid 34 → 37 %, Woolly 42 → 41 %, Reed 23 → 23 %): it would be a constraint for symmetry, not
  legibility.
- **Native Competition — Extreme-arrival starts are the degenerate ones.** Its layer-P failures are on Extreme-arrival worlds (Cinder 26 of
  its 34 failures, Reed 18 / 27): every witness dies out under the established natives (12 cases), no legal build reaches the margin (10),
  or a witness wins under the validation seed but not the confirmation seeds (7). On such a start the plant has almost no ground the natives do
  not already hold — the run is about surviving, not competing. Native cover itself is never negligible (≥ 9 % of the land on every sampled
  world, median 28 %; every witness meets contested fronts, median 10 regions).
- **Timing — the expensive cases are failures.** Passing layer-P proofs mostly need ONE witness simulation (Dying World 58–78 of ~100 passes,
  Native Competition 56–90), while failures nearly all run to the validator's 40-simulation cap (INCONCLUSIVE / FAIL) — the 30–140 s cases. In
  stream order, the instance must wait for every earlier draw's verdict, so one slow failing draw is the whole wait (the first, pre-budget
  Chromium timing pass saw Native Competition · Cinder Rosette take 85–98 s on launch seed 1:
  [`challenge-world-timing-before-proof-budget.json`](challenge-world-timing-before-proof-budget.json)).
- Native Competition's own floor: one passing proof is three full competition runs (the witness + two confirmation seeds), ~10 s here and
  ~5–9 s in a browser worker. No recipe changes that.

## 3. The chosen recipes (v1) — the smallest set that keeps each premise legible

| Challenge | Recipe v1 | Constraint and why |
|---|---|---|
| **Dying World** | archetypes: all three · arrival: any · native cover: — | **none (intentionally broad).** Scenario validation alone is sufficient (§2.3). |
| **Native Competition** | archetypes: all three · **arrival ≥ 20 %** · native cover: — | **one:** the plant starts with a real foothold — at least 20 % of the land suits it on arrival (the survey's own Extreme / Precarious boundary, an existing product concept, not a new number). It removes the Extreme-arrival starts where the contest cannot be legible and where most failures are. No native-cover floor: never needed in the sample. |
| **Volatile Climate** | archetypes: all three · arrival: any · native cover: — | **none (intentionally broad).** Layer P (pacing, mechanic evidence for Terraform-heavy witnesses, confirmation seeds) is the proof; a cap would not change how often the mechanic is met. |

No archetype is excluded by any recipe (every archetype yields qualifying worlds for every Challenge and species). No difficulty labels. No
species physiology or scenario mechanic was changed.

## 4. The proof budget (selection rule, not a recipe)

Because the long waits are almost all failing proofs, the selection rule gives layer P a **proof budget of 6 simulation runs in all,
confirmation reruns included** (`challenge-world.js` `PROOF_BUDGET`, rule version 1; the validator's opt-in `maxRuns`, checked only before a
new witness run so a winner always completes its confirmations). This is an **early stop**, not a weaker proof: the validator's search is
ordered, so a world proven within the budget gets the identical witness and verdict as under the full budget
(`tools/challenge-world-check.js` W9 proves it on a Dying World pass and on a Native Competition pass with its two confirmations); a world
whose proof would need more is simply not offered. Deterministic (counted in runs, never in time). Budgets of 2 / 3 / 4 / 6 witness runs
were modelled; 6 removes most of the tail while keeping the large majority of worlds. The first implementation capped witness runs only; the
browser timing then showed failing Native Competition searches spending most of their time in the uncapped confirmation reruns (e.g. 6
witness runs + 12 confirmations), so the cap now counts every run. **The model in §5 counts witness runs only** (the study did not record
confirmation reruns per world) — for Native Competition and Volatile Climate it is therefore optimistic about which slow proofs are cut and
pessimistic about nothing; the measured browser timings in [`REPORT.md`](REPORT.md) are the product numbers.

## 5. Every Challenge × species under the chosen recipes + a 6-witness-run budget (the model)

| Challenge | Species | qualifying (recipe + budget) | stages (rejections) | attempts median / p90 / max | modelled wall time median / p90 / p99 | same recipe, NO proof budget (p90 / p99) |
|---|---|---|---|---|---|---|
| Dying World | Organic Hybrid | 98/120 (81.7 %) | physical 1, scenario 21 | 1 / 2 / 5 | 1.3 s / 5.5 s / 8.6 s | 7.5 s / 22.8 s |
| Dying World | Cinder Rosette | 79/120 (65.8 %) | scenario 40, physical 1 | 1 / 3 / 10 | 3.1 s / 7.8 s / 14.6 s | 19.3 s / 42.5 s |
| Dying World | Woolly Candle | 95/120 (79.2 %) | physical 1, scenario 24 | 1 / 2 / 6 | 3.0 s / 5.5 s / 6.7 s | 12.3 s / 31.0 s |
| Dying World | Reed Spire | 102/120 (85 %) | scenario 17, physical 1 | 1 / 2 / 5 | 1.9 s / 4.7 s / 7.5 s | 5.4 s / 34.1 s |
| Native Competition | Organic Hybrid | 62/120 (51.7 %) | scenario 16, predicted 34, physical 1, recipe 7 | 1 / 4 / 12 | 10.8 s / 35.8 s / 62.0 s | 45.3 s / 113.4 s |
| Native Competition | Cinder Rosette | 36/120 (30 %) | predicted 59, physical 1, recipe 9, scenario 15 | 2 / 7 / 21 | 12.3 s / 48.8 s / 67.8 s | 104.9 s / 143.9 s |
| Native Competition | Woolly Candle | 56/120 (46.7 %) | predicted 49, recipe 5, physical 1, scenario 9 | 2 / 4 / 16 | 9.7 s / 22.6 s / 37.4 s | 30.4 s / 68.9 s |
| Native Competition | Reed Spire | 45/120 (37.5 %) | physical 1, scenario 12, predicted 54, recipe 8 | 2 / 5 / 17 | 9.2 s / 27.5 s / 60.6 s | 31.9 s / 118.6 s |
| Volatile Climate | Organic Hybrid | 106/120 (88.3 %) | physical 1, scenario 13 | 1 / 2 / 4 | 4.8 s / 10.5 s / 16.2 s | 13.7 s / 22.6 s |
| Volatile Climate | Cinder Rosette | 90/120 (75 %) | physical 1, scenario 29 | 1 / 2 / 6 | 5.0 s / 12.7 s / 16.4 s | 17.3 s / 35.1 s |
| Volatile Climate | Woolly Candle | 93/120 (77.5 %) | physical 1, scenario 26 | 1 / 2 / 8 | 6.1 s / 11.9 s / 16.1 s | 17.2 s / 29.0 s |
| Volatile Climate | Reed Spire | 112/120 (93.3 %) | physical 1, scenario 7 | 1 / 1 / 4 | 3.6 s / 8.1 s / 11.9 s | 8.2 s / 18.4 s |

Every player-choice species receives qualifying worlds under every Challenge (lowest: Native Competition · Cinder Rosette, 30 % of the
stream — median 2 attempts, p90 7). The modelled times above are contention-inflated; the measured browser times (Chromium and Firefox,
every Challenge × species, cold / typical / focused) are in [`REPORT.md`](REPORT.md) §timing and
[`challenge-world-timing.json`](challenge-world-timing.json).

## 6. Reproduce

```
node tools/challenge-recipe-study.mjs --per-archetype 40 --workers 15          # ~20 min, writes challenge-recipe-study.json (rows)
node tools/challenge-recipe-analysis.mjs --candidates '{"dying_world":{},"native_competition":{"arrival":{"minHabitable":0.20}},"volatile_climate":{}}' \
     --write --key analysisBroadNoBudget
node tools/challenge-recipe-analysis.mjs --budget 6 --candidates '…same…' --write --key analysisChosen
```
