# Strange Bloom · Unknown Soils — Challenge completion-condition study v1 (BLOOM-036D)

> **STATUS (BLOOM-036D1, 2026-10-12): this study is ACCEPTED and IMPLEMENTED / COMPLETE.** The PMO accepted it and selected **Thin Air** with
> exactly one condition type, `pressure-final-state` — implemented in BLOOM-036D1 (IMPLEMENTED / COMPLETE, production `main` `3b4d3a7`;
> [`CHALLENGES_SYSTEM_v1.md`](CHALLENGES_SYSTEM_v1.md) §2.5, §10). **Hearthfire: REJECTED** under the studied completion conditions (RESERVE design
> history only) · **Windfall: HOLD** (the never-Critical condition is rejected) · **Oasis Line: released unchanged**, no extra condition.
>
> **PMO CORRECTION to §2 / §9 (the engine boundary).** The study's implementation note described the `sim.won` boundary backwards. In the
> engine, `sim.won` is set when coverage first reaches `winAt`, `onWin` fires (the session stops the run and opens the report), and extinction runs
> only while `!sim.won`. A session-level gate that let `sim.won` fire at 70 % before the final atmosphere would therefore open the report early AND
> switch extinction off for the rest of the decline (an effectively immortal plant) — that is not Thin Air. The implemented boundary: **`sim.won`
> means the RUN's actual completion.** `createSim` takes an optional, GENERIC win gate (`opts.canWin(sim, coverage)`; absent = the ordinary
> engine bit for bit); with a gate, coverage may cross `winAt` earlier, but `sim.won` does not become true — the run goes on, extinction stays
> live — until the gate permits on a tick with coverage ≥ `winAt`. The engine never reads a Challenge or a condition name; the Challenge's
> completion boundary (`resources/challenges/challenge-completion.js`) builds the gate. The struck sentences below are kept as the study wrote
> them, marked, for the record.

**BLOOM-036D — DESIGN + CALIBRATION CANDIDATE.** Branch `agent/bloom-036d-completion-study` → review branch `handoff/bloom-036d-completion-study`, from
production `main` `bfd8461` (the 036C1 closeout). **Nothing player-facing is implemented:** no completion condition, no Challenge card, no change to
`content/challenges.js`, the shipped seed bank (sha256 `5cd2e385…`, `--check` identical) or any gameplay code. Research tooling, results and documents
only. **STOP for PMO review.**

Evidence: [`evidence/bloom-036d/completion-study.json`](evidence/bloom-036d/completion-study.json) (every number below) ·
[`evidence/bloom-036d/candidate-summary.md`](evidence/bloom-036d/candidate-summary.md) · `evidence/bloom-036d/rows/*.jsonl` (per-world records, full
layer-P reasons). Tooling: [`tools/research/challenges/completion-study.mjs`](../tools/research/challenges/completion-study.mjs),
[`completion-analysis.mjs`](../tools/research/challenges/completion-analysis.mjs).

## 0. Answer in one page

| Candidate | Condition | Completable with it | Ordinary play already satisfies it | What it changes | Verdict |
|---|---|---|---|---|---|
| **Thin Air** (Dying World · Woolly Candle · Desert + Ocean) | Bloom **held in the final atmospheric state** | **100 %** of qualifying worlds | the *proof* already requires it; plain Bloom ends **before** the final state in 55 % of runs (Desert 80 %) | every run lives through the whole decline — the scenario's reversal (the cooling world that suits the candle) is met, not skipped; median wait 34 s (p90 60 s) where Bloom came early | **RECOMMEND** |
| **Hearthfire** (Volatile Climate · Cinder Rosette · Frozen) | net sky warming ≥ +6 / +12 / +18 °C | 96 % / 34 % / 26 % | 81 % / 30 % / 0 % | +6: decorative (ordinary play already warms; 2 % shocked); +12: supply collapses to worlds that already did it; +18: binding and every passing plan is shocked, but too few worlds for a bank of 50 and beyond the validator's sky search | **REJECT** (all three) |
| **Windfall** (Volatile Climate · player choice · 200 / 225 / 250) | never reach the **Critical** band | = ordinary qualifying (78–96 %) | **100 %** — no winning line ever reaches Critical | nothing: even Terraform rushed to the front plus two extra steps peaks at ≤ 66 % instability (Critical is 80 %); the climate already punishes rushing on its own | **REJECT** (decorative) |
| **Oasis Line** (released) | hold ≥ N regions natives held at landing | N ≤ 3: 78–98 % | N 1–2: 98 % · N 3: 78 % · N 4: 46 % | ordinary winners already take back ~75 % of the native-held regions; a binding N would need new landing-state tracking | **REJECT** — keep Oasis Line exactly as released |

**PMO questions:**
- **A.** First completion-condition Challenge: **Thin Air — "Bloom in the final atmosphere"**.
- **B.** Support **one condition type** first (`pressure-final-state`); no other type survived calibration.
- **C.** **Thin Air** is the best next released Challenge (Hearthfire and Windfall are not, under any studied condition).
- **D.** **Oasis Line stays exactly as released.**

## 1. Method

The released seed-bank pool stream (the same World Seeds the shipped bank was built from); per study: Thin Air 40 Desert + 40 Ocean, Hearthfire 80
Frozen, Windfall 15 per archetype × 4 species × {200, 225, 250} Biomass, Oasis Line 60 Desert — **355 worlds, 23 minutes on 12 workers, 0 errors, the
catalogue unchanged**. Per world:

1. the bank builder's own proof (`evaluateWorld`: physical → S2 from the start → recipe → layer P at full budget with confirmations → quality) —
   with the **full layer-P reason** kept (036D tooling correction, §10);
2. the ordinary winning strategies (layer P asked for ≤ 3 materially distinct strategies);
3. every plan **replayed** through the validator's own simulator (`BLOOM.witness.simulate`: fixed validation RNG, purchases as soon as Biomass allows,
   the scenario live, continued to its plateau) to read the state a condition tests;
4. **condition-seeking plans** the ordinary search never tries, proven like a layer-P witness (margin + hold under the validation seed AND each
   confirmation seed, inside the scenario's pacing bands): Hearthfire — 1 / 2 / 3 warming steps, bought first or paced between adaptations, on every
   ordinary and every cold-excluded plan; Windfall — every plan's Terraform rushed to the front, then +1 and +2 extra steps on its main axis.

A condition that ordinary play **always** satisfies is decoration; one that **no** plan satisfies is a wall. The useful band is between.

## 2. Existing state — what a condition could read today

| Scenario / area | Already in the engine (no new tracking) | Would need new tracking |
|---|---|---|
| **Dying World** | `sim.pressure`: `seconds`, `progress` (0 → 1, linear after the grace), `phase` + phase events, `offsets`; the final state is `progress === 1` (at grace + duration = 290 s); `sim.coverage()`; `sim.winAt` | — (a "held for N s in the final state" timer, if wanted — layer P already measures it offline) |
| **Volatile Climate** | `sim.climate`: `level`, `band` (index into the scenario's bands; *Critical* from 0.8), **`peak` / `peakTick`** (so "ever reached Critical" = `peak ≥ 0.8`), `shocks[]` (kind, axis, magnitude, start / end), `forcing[]` (every Terraform step: axis, tick, level after); per axis `net` steps | — |
| **Terraform (any scenario)** | owned tiers of Warm / Cool / Humidify / Dry (`sim.ownedTier`) → net sky temperature / moisture steps; the sky itself | — |
| **Native Competition** | `sim.competition`: `startShare`, `share`, `peakShare`, `everContested[]`, per-region `regionTiles.native` / `.player` **now**, `regions[].side`, flips, events | **which regions natives held AT LANDING** (only the start *share* is kept): a one-time landing snapshot |
| **General** | `sim.won` (set the tick coverage first reaches the threshold; **it also switches off extinction**), `sim.ticks`, coverage, species, `startingState`, the Challenge instance's provenance | any "held for N seconds" duration at runtime (Bloom is an instant today) |

~~**Implementation consequence:** a completion condition must not be implemented by delaying `sim.won` (that would keep extinction off) nor by setting it
early; it belongs at the Challenge-run level (game session): "Bloom" stays the engine's coverage event, the Challenge's *completion* is Bloom ∧ the
condition, evaluated each tick, and extinction stays live until the Challenge completes.~~ **(Backwards — PMO correction above.)** Delaying
`sim.won` is exactly what keeps extinction ON: the implemented rule is a generic engine win gate — `sim.won` (the run's actual completion) is set
only on a tick with coverage ≥ `winAt` that the gate permits; until then the run continues and extinction stays live.

## 3. Thin Air — Bloom in the final atmosphere — RECOMMEND

Definition: Dying World · prescribed Woolly Candle · Desert + Ocean · normal start · **completion: Bloom while the atmosphere is in its final state**
(coverage ≥ the planet's Bloom threshold at any moment with `pressure.progress = 1`, i.e. from 290 s; the proof additionally holds it 60 s).

| | |
|---|---|
| Qualifying worlds | 78 / 78 (100 %) — the condition fails no world: **Dying World's layer P already proves exactly this** (its hold check is taken at the later of the margin and the final state, + 60 s) |
| Ordinary Bloom before the final state | **54.5 %** of winning strategies (**Desert 79.8 %**, Ocean 20.9 %) — under plain Bloom these runs end without the player ever meeting the thinnest air |
| Wait where Bloom came early | p10 / p50 / p90 **10 / 34 / 60 s** — short; not idle waiting, because the decline is still moving the ground (coverage keeps **rising** after first Bloom in 32 % of strategies) |
| Completion time | p10 / p50 / p90 **290 / 290 / 415 s** (ordinary first Bloom 237 / 283 / 415 s) |
| Coverage at the moment the final state begins | p10 / p50 / p90 49.7 / 73.3 / 80.5 % — the player is often still climbing when the air settles: the last stretch is played in the reversed world |
| Strategies | 1–3 distinct per world (p50 3); the condition removes none (it is part of every proof) |
| Premise | the reversal becomes the contract: the run is completed in the cold, irradiated, thin-air world the candle is built for, not before it arrives |
| Degenerate bypass | none — the condition cannot be met early, and extinction stays live until it is |
| Idle risk | low (p90 60 s, only where Bloom came early; the world is still changing) |
| UI legibility | high — one existing meter (the decline's progress) |
| Implementation | small: one condition type over existing state; ~~a session-level completion check~~ a generic engine win gate fed by the Challenge's completion boundary (PMO correction); HUD / dossier / report lines |
| Bank / proof cost | **≈ none**: every Dying World × Woolly Candle proof already satisfies it (§8) |

**Why it is more than the released Dying World × Woolly Candle case:** the worlds and proofs are the same, but the *contract* is not — plain Bloom lets
80 % of Desert runs finish before the scenario's turning point; Thin Air makes the final atmosphere the finish line.

## 4. Hearthfire — net sky warming ≥ N steps — REJECT

Definition: Volatile Climate · prescribed Cinder Rosette · Frozen · normal start; condition: net Terraform warming ≥ +6 / +12 / +18 °C (1 / 2 / 3 steps).
80 worlds; ordinary qualifying 96.3 %; ordinary winning strategies' net warming p10 / p50 / p90 **0 / 0 / 2** steps; a search with Cold Tolerance excluded
finds **no** winning strategy on any world (the rosette cannot win a frozen world on warming alone).

| Condition | Completable | Already satisfied by ordinary play | Passing condition-seeking plans | Shocked | With Cold Tolerance | Witness p50 | Main failure |
|---|---|---|---|---|---|---|---|
| **A · +6 °C** | **96.3 %** | **81.3 %** | 193 / 434 | 2.1 % | 100 % (×3 in 46 %) | 341 s | no win / hold (142), first purchase > 60 s (70) |
| **B · +12 °C** | **33.8 %** | 30.0 % | 4 / 434 | 100 % | 100 % | 420 s | no win / hold (396) |
| **C · +18 °C** | **26.3 %** | **0 %** | 53 / 434 | 100 % | 100 % (×3 in 36 %) | 411 s | no win / hold (256), pacing (93), confirmations (32) |

- **A** is decoration: four in five ordinary wins already warm once, and its plans are almost never shocked (2 %).
- **B** collapses supply to the worlds where ordinary play already warms twice (34 % ≈ 30 %); only 4 new plans pass — warming twice mostly pushes the
  geothermal refuges past the rosette's heat tolerance or shocks the colonies out.
- **C** is the only binding setting and every passing plan lives through a shock — the premise at last — but only **26 %** of worlds qualify (≈ 42 of
  the pool's 160 Frozen worlds: short of a 50-entry bank), the passing plans are few per world (p50 0), and **three steps on one axis exceed the
  validator's sky search** (`config.validation.maxSkySteps` = 2): the bank builder could not find these proofs without a validator change.
- Cold Tolerance remains in **every** passing plan: the condition forces warming *in addition to* adaptation; it does not make Terraforming the way to
  solve the planet.

**Verdict: REJECT** at A / B / C. Hearthfire stays RESERVE; it would need a different world recipe (fewer too-hot vents) or a different scenario
balance — new design, not a completion condition.

## 5. Windfall — never reach Critical — REJECT

Definition: Volatile Climate · player choice · every archetype · 200 / 225 / 250 starting Biomass · condition: the climate's instability never reaches
the scenario's existing **Critical** band (≥ 0.8). 45 worlds × 4 species per setting.

| Start | Ordinary winning strategies that reach Critical | Rushed Terraform (all steps first): wins / reaches Critical | rush + 1 step | rush + 2 steps: wins / Critical / peak p90 |
|---|---|---|---|---|
| 200 | **0 %** (peak p90 ≤ 62 %) | 33–67 % / **0 %** | 2–17 % / 0 % | 10–21 % / **0 %** / 63–66 % |
| 225 | **0 %** | 35–64 % / **0 %** | 2–24 % / 0 % | 12–25 % / **0 %** / 62–66 % |
| 250 | **0 %** | 31–60 % / **0 %** | 6–28 % / 0 % | 18–29 % / **0 %** / 62–66 % |

- **No winning line — ordinary, rushed, or rushed with two extra steps — ever reaches Critical**; the highest instability any plan reached is 0.67.
  "Never Critical" would be satisfied by everything a player could plausibly do: decoration.
- The climate **already** punishes rushing: rushing alone keeps 31–67 % of plans winning, one extra step drops it to 2–28 %. The restraint the condition
  would teach is already taught by the shocks themselves.
- A lower threshold (e.g. "never Volatile", 0.55) would be a new instability threshold — out of scope by the PMO's instruction, and it would mostly
  forbid Terraforming outright.

**Verdict: REJECT** at 200 / 225 / 250. Windfall stays **HOLD**: neither a bigger reserve (036C1) nor the Critical condition makes its premise matter.

## 6. Oasis Line — hold N regions natives held at landing — REJECT (keep as released)

The engine keeps the native **share** at landing, not **which regions** natives held; the study took that snapshot from a fresh simulation at tick 0
(native tiles ≥ the scenario's `dominatedShare` of the region) — a runtime condition would need the same one-time snapshot (new tracking, small).

60 Desert worlds (qualifying 83 %): natives hold p10 / p50 / p90 **3 / 5 / 6** of 13–18 regions at landing; the best ordinary winning witness already
holds **2 / 3 / 5** of them at its hold check — **75 %** of the former native regions at the median.

| N | Ordinary winners already satisfy | Worlds with ≥ N native regions |
|---|---|---|
| 1 | 98 % | 100 % |
| 2 | 98 % | 98 % |
| 3 | 78 % | 97 % |
| 4 | 46 % | 87 % |
| 5 | 14 % | 62 % |

N ≤ 3 is decoration; N ≥ 4 binds but depends heavily on how many regions natives happened to hold (a 4-of-4 world and a 4-of-6 world are different
contracts), adds new runtime tracking and a new proof dimension, and does not sharpen what is already Oasis Line's identity (a siege from the
basins: the ordinary winners already retake most native ground). **Verdict: REJECT — Oasis Line stays exactly as released.**

## 7. UI representation (proposal for the recommended condition only — not implemented)

**Hub / dossier (What changes → a second line under the win):**

> **BLOOM** · 70 % of the land alive
> **AND · IN THE FINAL ATMOSPHERE** · the Bloom counts only once the air has finished thinning

**Run HUD** (beside the existing decline meter; one line, no modal):

> `Bloom 64 % · goal 70 %` · `Final atmosphere: 82 % of the decline` → `Final atmosphere reached ✓`
> When coverage passes 70 % early: `Bloom reached — hold it until the air settles (0:34)`

**Report:**

> *Won:* "You held 73 % of the land in the final atmosphere (the air settled at 4m 50s)."
> *Early Bloom then lost:* "You reached 70 % at 3m 57s, before the air finished thinning, and the drying took it back to 61 %. In Thin Air the Bloom
> counts only in the final atmosphere."

One additional condition maximum; no checklist; no medal or score.

## 8. Validator / bank impact

- **Proof:** Dying World's layer P already proves "Bloom held (60 s) in the final state" for every bank world (`bloom-witness.js` `simulate`: `holdAt =
  max(margin tick, final-state tick) + hold`). The runtime condition (Bloom at any moment once `progress = 1`) is *weaker* than what is proven, so every
  passing entry satisfies it. No new search dimension; the witness search needs no change.
- **Bank:** a Thin Air cell is a new Challenge × species cell (Woolly Candle; Desert + Ocean) built by the existing builder — the same worlds as the
  released Dying World × Woolly Candle cell (98 % of the pool qualifies; ≥ 300 candidates for 50 entries).
- **Provenance:** today `cellProvenance` does **not** include `completion` (it is always the normal Bloom). The condition must enter the provenance
  (e.g. the Challenge version, which already does, plus a completion fingerprint) so a changed condition makes the cell stale. Adding a completion
  fingerprint to every cell's provenance changes all 14 cells' provenance once → **one full bank rebuild (~41 min)** with identical entries.
- **Rejected types** would have needed: Hearthfire C — a validator sky-search extension (> 2 steps per axis) and still too few worlds; Oasis Line N ≥ 4
  — a landing snapshot at runtime and in the proof.

## 9. Minimal schema (proposal — only the type that survived)

```js
completion: { win: "bloom", conditions: [ { type: "pressure-final-state" } ] }
```

| | `pressure-final-state` |
|---|---|
| **Validation** | only with a scenario that has `pressure` (refused otherwise); no parameters; at most one condition per Challenge |
| **Runtime evaluator** | met while `sim.pressure.progress >= 1`; the Challenge completes on the first tick with Bloom coverage (`coverage ≥ winAt`) AND the condition met; extinction stays live until then; ~~the engine's own `sim.won` stays the coverage event~~ (corrected: `sim.won` IS that completion — set through the engine's generic win gate) |
| **Progress** | `{ progress: sim.pressure.progress, reached: progress >= 1, coverage, winAt }` → "Final atmosphere: 82 % of the decline" / "reached" |
| **Report** | `{ type, metAtSeconds, coverageAtCompletion, earlyBloomSeconds? }` |
| **Offline proof** | layer P's hold (already `max(margin, final state) + holdFinalSeconds`); the builder records the condition in the cell's provenance |

No other type is proposed (no `terraform-axis-min`, `climate-band-never` or `native-origin-regions-held`: none survived calibration).

## 10. Tooling

- `tools/research/challenges/completion-study.mjs` — the runner (deterministic; resumable per world) · `completion-analysis.mjs` — the analysis.
- **036D tooling correction:** `tools/challenge-bank-builder.mjs` `evaluateWorld(…, { reasonChars })` — research callers pass `Infinity` and keep the
  FULL layer-P failure reason (with its failing pacing bound); the release builder keeps its 140 characters, so the production candidate cache and
  bank are byte-identical (`build-challenge-seed-bank --check`). The 036C content-study runner uses it too.

## 11. Reproduce

```bash
node tools/research/challenges/completion-study.mjs --workers 12      # 355 worlds → docs/evidence/bloom-036d/rows/ (~23 min)
node tools/research/challenges/completion-analysis.mjs                # → docs/evidence/bloom-036d/completion-study.json
```
