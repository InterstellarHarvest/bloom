# BLOOM-036B — Contained Challenge worlds: REPORT

**Status: CANDIDATE — STOP FOR PMO REVIEW.** Review branch `handoff/bloom-036b-review` (NOT merged). It contains the PMO-accepted 036A
foundation plus 036B. Do not merge 036A separately; 036C not started.

| | SHA |
|---|---|
| Production `main` (untouched) | `47ae6c3649b5ce3f1c42334ec08cf6e06f79e231` |
| 036A accepted parent (`handoff/bloom-036a-review`, kept intact; 4 ahead / 0 behind main) | `8af3e12e46f484f2d8c1a4013eb956b3f86ec269` |
| 036B implementation branch | `agent/bloom-036b-challenge-worlds` (from exactly `8af3e12`) |
| 036B commits | `481da93` implementation · `abe6159` proof budget counts confirmations, foothold, report pennant · `e55fae2` QA · `31ba1b1` report-boundary fix (run-ui-convergence N6) · the docs / evidence commit (this report) |
| Final review head | `handoff/bloom-036b-review` = the docs / evidence commit — **036A 4 + 036B 5 = 9 ahead / 0 behind `main`** |

Design (canonical): [`docs/CHALLENGES_SYSTEM_v1.md`](../../CHALLENGES_SYSTEM_v1.md). Recipe calibration:
[`CHALLENGE_RECIPE_STUDY.md`](CHALLENGE_RECIPE_STUDY.md). Product direction: [`PRODUCT_DIRECTION_CURRENT.md`](../../PRODUCT_DIRECTION_CURRENT.md) §8.

## 1. What changed

- **The 3 × 3 Challenge survey is gone.** MAIN MENU → CHALLENGES → hub → BEGIN CHALLENGE → Choose Plant Species (only if the Challenge allows
  it; "Continue with <plant>") → **PREPARING CHALLENGE WORLD** → the **Challenge Planet Dossier** (one planet) → BEGIN CHALLENGE (the survey's
  dramatic descent) → run → report. No alternatives, no reroll; beginning the Challenge again from the hub is the route to a fresh instance.
- **Schema 2** (`resources/bloom-challenges.js`): `launch.species` player-choice | prescribed · `launch.world` recipe (versioned) ·
  `launch.startingState` normal | prescribed; `completion` normal Bloom (`conditions` path kept, refused until implemented). Every value the
  runtime cannot honour is refused — the prescribed start by the engine itself. QA fixtures (`status: "fixture"`, `BLOOM.challenges.fixture`) are
  never on the hub or in content.
- **The three released Challenges** keep player choice, the normal start and the normal Bloom (v2, recipe v1).
- **The Destination Survey is the Expedition's only again** (036A's scenario layer / worker task / Challenge option / wording removed;
  `main`'s survey files restored), and its "Expected challenges" heading is now **EXPECTED HAZARDS**.
- **Copy:** hub lede "Each Challenge is a contained run with its own starting situation and pressure. Read the brief, choose what the Challenge
  allows, and find a way to bloom."; How the run works: choose your plant · one qualifying Challenge world is generated (no survey, no choosing
  among worlds) · nothing owned at landing · the normal Bloom · extinction where the scenario says so. Native Competition's science line and
  "challenge debrief" kept as accepted.

## 2. Recipe schema

```js
world: { policy: "recipe", recipe: {
  version: 1,                                   // the recipe's revision (instance provenance; a change = a new recipe AND Challenge version)
  archetypes: ["ocean_archipelago", "desert_world", "frozen_world"],   // the only archetypes the stream draws
  arrival: { minHabitable, maxHabitable } | null, // species-relative arrival share band (the survey's habitable share)
  nativeCover: { minStartShare } | null,         // competition scenarios only: the engine probe's native start share
} }
```
Product-level selection data only: no generator parameter, no scenario mechanic (both refused). A recipe never changes a planet.

## 3. Recipe study (read-only, before choosing numbers)

120 worlds (3 archetypes × 40 seeds) × 4 species × 3 scenarios through the production path. Findings
([full study](CHALLENGE_RECIPE_STUDY.md)): every species can win every validated world (S2 119 / 119); every species gets qualifying worlds in
every Challenge; Dying World / Volatile Climate already reject trivial starts themselves (their failures are "too fast" Favorable starts);
Native Competition's failures concentrate on Extreme-arrival starts (extinction under established natives / no build reaches the margin);
the slow waits are failing proofs (up to 40 witness runs, plus confirmation reruns).

**Chosen recipes (v1):** Dying World **broad** · Native Competition **arrival ≥ 20 %** (the survey's own Extreme / Precarious boundary) ·
Volatile Climate **broad**. No fake constraints for symmetry, no difficulty labels, no physiology or mechanic change.

## 4. One-planet selection algorithm (`resources/challenges/challenge-world.js`, rule version 1)

1. **Stream:** `streamSeed = fnv("<id>|v<version>|recipe<recipe version>") ⊕ (launchSeed × 0x9e3779b1)` — species-free; draw *i* = an archetype
   from the recipe + a World Seed in 1…99 999, computed directly from *i*. Launch seed: `crypto.getRandomValues` (no `Math.random`).
2. **Stages per draw** (first failure rejects it for this species): predicted (arrival band on the cheap structural world) → physical
   (`physicalCandidate`: the survey's own production validation) → recipe → species S2 (`BLOOM.species.validateFor`) → native cover → layer P
   (`BLOOM.validateScenario` with the species and starting state) within the **proof budget**.
3. **Acceptance:** the first draw in stream order that passes, once every earlier draw is known (`acceptInOrder`). Parallel workers evaluate
   draws speculatively; timing never chooses the planet. **Measured: identical planets across Chromium, Firefox and all three timing modes
   for every one of the 72 Challenge × species × seed cases.**
4. **Proof budget (early stop):** layer P may use **6 simulation runs in all, confirmation reruns included** (the validator's new opt-in
   `maxRuns`, checked only before a new witness run so a winner completes its confirmations). A world proven within it gets the identical
   witness (suite W9); a world needing more is not offered. *(First version capped witness runs only; timing showed Native Competition's
   failing searches spending most of their time in uncapped confirmations — 6 witnesses + 12 confirmations — so the cap counts every run.)*
5. **Browser search** (`challenge-world-search.js`): its own worker pool on the survey worker; from BEGIN CHALLENGE the launch's species-free
   physical worlds are prefetched; the plant selected on Choose Plant Species is prepared early (choosing it joins the work); on acceptance /
   Back the remaining tasks are dropped and busy workers terminated. Nothing rejected reaches the screen.

## 5. Generation timing — every Challenge × species, Chromium and Firefox

6 launch seeds per cell (the same seeds in both browsers; with n = 6 the p90 is the worst sample). *typical* = the launch prefetch ran for 3 s
(the species screen) and then this plant was chosen; *focused* = this plant was the selected card for those 3 s (its world prepared early);
*cold* = nothing prefetched. Data: [`challenge-world-timing.json`](challenge-world-timing.json) (final rule);
[`challenge-world-timing-witness-run-budget.json`](challenge-world-timing-witness-run-budget.json) (the witness-runs-only budget);
[`challenge-world-timing-before-proof-budget.json`](challenge-world-timing-before-proof-budget.json) (no budget, Chromium, 3 seeds). Machine:
the iMac (16 hardware threads; Chromium reports 8 → a 6-worker pool, Firefox 16 → 8).

| Challenge | Species | Chromium typical median / p90 / worst | Chromium focused median | Chromium cold median / worst | Firefox typical median / p90 / worst | Firefox focused median | Firefox cold median / worst | attempts median / max |
|---|---|---|---|---|---|---|---|---|
| Dying World | Organic Hybrid | 1.8 / 2.1 / 2.1 s | 1.2 s | 4.2 / 7.2 s | 2.5 / 6.6 / 6.6 s | 1.3 s | 4.6 / 10.4 s | 1 / 3 |
| Dying World | Cinder Rosette | 2.5 / 5.2 / 5.2 s | 2.0 s | 5.7 / 7.8 s | 2.7 / 3.9 / 3.9 s | 1.6 s | 4.8 / 7.5 s | 1 / 3 |
| Dying World | Woolly Candle | 1.9 / 2.2 / 2.2 s | 1.7 s | 3.9 / 6.5 s | 1.4 / 3.4 / 3.4 s | 0.9 s | 4.1 / 7.2 s | 1 / 1 |
| Dying World | Reed Spire | 1.3 / 3.4 / 3.4 s | 1.3 s | 3.9 / 8.8 s | 0.8 / 3.9 / 3.9 s | 0.1 s | 3.1 / 7.7 s | 1 / 1 |
| Native Competition | Organic Hybrid | 4.8 / 5.4 / 5.4 s | 3.7 s | 6.8 / 7.2 s | 9.7 / 11.2 / 11.2 s | 7.1 s | 10.5 / 12.6 s | 1 / 2 |
| Native Competition | Cinder Rosette | 11.9 / 21.5 / 21.5 s | 11.3 s | 14.2 / 23.2 s | 22.1 / 43.6 / 43.6 s | 21.2 s | 25.1 / 44.4 s | 3 / 14 |
| Native Competition | Woolly Candle | 6.2 / 9.2 / 9.2 s | 5.6 s | 8.1 / 11.5 s | 9.9 / 16.5 / 16.5 s | 8.0 s | 12.4 / 15.3 s | 2 / 7 |
| Native Competition | Reed Spire | 4.2 / 23.7 / 23.7 s | 3.6 s | 6.3 / 26.7 s | 5.7 / 52.9 / 52.9 s | 4.2 s | 7.5 / 55.9 s | 2 / 4 |
| Volatile Climate | Organic Hybrid | 1.6 / 4.8 / 4.8 s | 1.1 s | 4.0 / 8.1 s | 3.0 / 7.1 / 7.1 s | 1.8 s | 4.8 / 11.2 s | 1 / 2 |
| Volatile Climate | Cinder Rosette | 3.3 / 4.6 / 4.6 s | 3.2 s | 6.2 / 8.3 s | 5.4 / 8.1 / 8.1 s | 5.1 s | 8.1 / 11.7 s | 2 / 3 |
| Volatile Climate | Woolly Candle | 1.6 / 4.1 / 4.1 s | 1.2 s | 4.0 / 7.2 s | 3.1 / 7.6 / 7.6 s | 2.0 s | 4.9 / 11.3 s | 1 / 4 |
| Volatile Climate | Reed Spire | 1.6 / 4.1 / 4.1 s | 0.8 s | 3.9 / 7.7 s | 3.2 / 7.1 / 7.1 s | 1.8 s | 5.5 / 11.3 s | 1 / 2 |

- **Against the old survey (up to ~32 s):** materially faster everywhere. **Dying World and Volatile Climate meet the < 8 s target** in Chromium
  in every mode and sample (worst typical 5.2 s); Firefox typical worst 8.1 s, cold up to 11.7 s.
- **Native Competition: target met for Organic Hybrid and Woolly Candle in Chromium; NOT met for Cinder Rosette (median 11.9 s) and one Reed
  Spire seed (23.7 s), and Firefox is ~2× slower on this scenario** (Cinder median 22.1 s; Reed worst 52.9 s). Profiled (§10 concern 1).
- Before the proof budget, Native Competition · Cinder Rosette took **85–98 s** on launch seed 1; with the witness-runs-only budget the worst
  Native Competition case was 48–92 s; the final budget brings it to 21–26 s (Chromium) / 42–56 s (Firefox).

## 6. Prescribed species · starting state (QA fixtures only — nothing released)

- **Prescribed species:** `launch.species = { policy: "prescribed", species }` (a released species). BEGIN CHALLENGE → PREPARING (no species
  screen) → the dossier says "This Challenge prescribes the plant."; Back → the hub. The search refuses another species.
- **Starting state:** `createSim(…, { startingState: { adaptations, biomass } })` — Adapt / Spread plant traits (tempPoint · waterArm · level)
  applied through the engine's own legality rule and effect, never paid for (`sim.spent` stays 0), and / or the starting Biomass; Terraform
  and crossing traits are refused. `sim.startingState` records it; the witness, layer P and S2 all run from that start (S2 never reuses the
  construction proof then). The dossier lists it ("Lands with Cold Tolerance · Salt Handling · 250 Biomass (given by the Challenge)"); the run
  and report provenance carry it as the Challenge's, and the report says "Given by the Challenge at landing: …" (not a purchase).

## 7. Instance, retry provenance, report / menu behaviour

- **Instance:** canonical Challenge (id, version, recipe version, recipe key), scenario, canonical species (+ policy), launch seed, stream /
  draw / attempts, rule version, starting state, the EXACT planet object + fingerprint + World Seed + archetype, the verdicts it passed, the
  dossier. Application state only (no URL, sessionStorage, localStorage or `window.name`; QA: `?launch=<n>`).
- **`BLOOM.gameSession.challengeRun(instance)`** re-checks it against the current catalogue and refuses another Challenge version / recipe
  version, a foreign Challenge or species object, another starting state, another scenario or an unproven planet — never reinterpreted.
  `run.challengeRun` and the report identity carry challenge id / version, recipe version, rule version, launch seed, planet seed /
  fingerprint, species, scenario and the starting state. `expeditionRun` refuses a Challenge (no residue).
- **Report:** KEEP PLAYING (on a win) · **RETRY CHALLENGE** (same instance: same planet / species / Challenge / start objects, a fresh
  session + simulation) · **CHALLENGES** (the hub, the Challenge selected; BEGIN CHALLENGE again = a new launch seed) · **MAIN MENU**
  (clears it). The Expedition report keeps Play again · Choose another planet · Main menu.
- **Back:** species → hub (launch released) · PREPARING → species (selection cancelled, workers terminated) · dossier → species (same
  launch: the same plant again = the same planet) · prescribed → hub.

## 8. Browsers / offline

Chromium 147 and Firefox 148 (Playwright). `file://` offline (the portable runtime; the Challenge world screen is a registered portable
module and the survey worker bundle carries the `challenge-*` tasks) and the Pages site under `/bloom/`: a complete one-planet Challenge
launch, one document, no request outside the site. Portable runtime regenerated.

## 9. QA

**Focused first** (directive §20): challenges-check · challenge-world-check · main-menu · species-selection · destination-survey · game-flow ·
single-app-flow · run-ui · portable-runtime · release `--no-suites` · visual-system — all green. **Then every other `tools/*-check.js`
sequentially** with nothing else running (33 suites). The 11 focused suites were not re-run a second time in that pass: they had just run, in
the same sequential way, on the identical code (a time saving made at the owner's request). **Result: 44 / 44 suites green, zero new reproducible
failures.**

- Narrow 036B pins, updated before the run (no check removed or loosened beyond the new state): main-menu **M7e** (the survey worker now
  serves `challenge-physical` / `challenge-draw`, no survey `scenario` task) · portable-runtime **P5** (+ the Challenge world screen module) ·
  visual-system **V5** (+ the screen in the icon check; the report's Challenges action carries the shared pennant).
- **One real defect found by the regression:** run-ui-convergence **N6** — the report's \"Given by the Challenge\" note looked trait names up
  in `BLOOM_DATA` (the report component may only display `adapter.report()`). Fixed (the report data carries the names), N6 green, and the
  suites that read the report re-run green (challenge-world-check, run-ui, release).
- 036A's Challenge / scenario separation tests are kept (challenges-check C1–C5, C20 + hub M / K / H / R); its survey-flow checks became
  challenge-world-check's one-planet checks.

| Suite | Result | Note |
|---|---|---|
| `archetype-check.js` | ALL CHECKS PASS  (58.9 s) |  |
| `atmosphere-transition-check.js` | ALL CHECKS PASS  (0.1 s) |  |
| `body-plan-check.js` | OK — 15/15 checks passed (905 s) |  |
| `candle2-contract-check.js` | OK — candle2-contract-check: 15 passed, 0 failed (22.2 s) |  |
| `challenge-world-check.js` | OK — challenge-world-check: 70 passed, 0 failed (261 s) | NEW · Chromium + Firefox, --evidence; rerun after the N6 fix |
| `challenges-check.js` | OK — challenges-check: 31 passed, 0 failed (46 s) | Chromium + Firefox, --evidence |
| `colony-development-check.js` | ALL CHECKS PASS  (28.9 s) |  |
| `crossing-check.js` | ALL CHECKS PASS |  |
| `cylinder-gen-check.js` | ALL CHECKS PASS  (10.0 s) |  |
| `desert-check.js` | ALL CHECKS PASS  (57.5 s) |  |
| `destination-survey-check.js` | ALL CHECKS PASS  (199.0 s) | focused pass |
| `dying-world-check.js` | ALL CHECKS PASS  (62.5 s) |  |
| `economy-check.js` | ALL CHECKS PASS  (384.9 s) |  |
| `frozen-check.js` | ALL CHECKS PASS  (100.6 s) |  |
| `game-flow-check.js` | ALL CHECKS PASS  (166.5 s) | focused pass |
| `gen-check.js` | ALL CHECKS PASS |  |
| `guided-training-check.js` | ALL 50 CHECKS PASS  (149.8 s) |  |
| `main-menu-check.js` | ALL CHECKS PASS (17587 ms) | focused pass · pin updated for 036B before the run (M7e / P5 / V5) |
| `native-competition-check.js` | ALL CHECKS PASS  (204.5 s) |  |
| `organic-hybrid-art-intake-check.js` | OK — 45/45 checks passed (39 s) |  |
| `planet-view-check.js` | ALL CHECKS PASS  (85.5 s) |  |
| `plant-rooms-check.js` | ALL CHECKS PASS  (96.5 s) |  |
| `plant-sprite-pipeline-check.js` | OK — 59/59 checks passed (29 s) |  |
| `portable-runtime-check.js` | ALL 71 CHECKS PASS  (487.9 s) | focused pass · pin updated for 036B before the run (M7e / P5 / V5) |
| `procedural-run-check.js` | ALL CHECKS PASS  (18.5 s) |  |
| `production-plant-integration-check.js` | OK — 50/50 checks passed (100 s) |  |
| `release-check.js` | ALL CHECKS PASS (51)  (125.1 s) | `--no-suites`; focused pass; rerun after the N6 fix |
| `run-ui-check.js` | ALL CHECKS PASS  (69.0 s) | focused pass; rerun after the N6 fix |
| `run-ui-convergence-check.js` | ALL CHECKS PASS  (129.5 s) | first run FAILED N6 — a real defect of this milestone (the report's Challenge-given note read BLOOM_DATA); fixed, rerun green |
| `sim-check.js` | ALL CHECKS PASS |  |
| `single-app-flow-check.js` | OK — 59 passed, 0 failed (651 s) | focused pass |
| `slice-check.js` | ALL CHECKS PASS |  |
| `species-art-intake-check.js` | ALL CHECKS PASS (16/16) (91 s) |  |
| `species-check.js` | ALL CHECKS PASS (17/17) |  |
| `species-selection-check.js` | ALL CHECKS PASS (68/68) (333 s) | focused pass |
| `specimen-environment-check.js` | OK — specimen-environment-check: 15 passed, 0 failed (60.5 s) |  |
| `sphere-texture-check.js` | ALL CHECKS PASS  (6.8 s) |  |
| `strategy-check.js` | ALL CHECKS PASS  (28.6 s) |  |
| `surface-check.js` | ALL CHECKS PASS |  |
| `terraform-check.js` | ALL CHECKS PASS  (127.9 s) |  |
| `topology-check.js` | ALL CHECKS PASS  (3.7 s) |  |
| `training-check.js` | ALL CHECKS PASS  (42.1 s) |  |
| `visual-system-check.js` | OK — 54/54 checks passed (251 s) | focused pass · pin updated for 036B before the run (M7e / P5 / V5) |
| `volatile-climate-check.js` | ALL CHECKS PASS  (107.6 s) |  |


## 10. Known concerns (for the PMO)

1. **Native Competition generation time.** Root cause, profiled: one passing proof is three full competition simulations (the witness + two
   confirmation seeds), and a stream-order acceptance must also wait for earlier draws whose proofs fail; a failing competition run is long
   (it plays out towards the tick limit), so even within the 6-run budget one failing draw can cost ~15–30 s in a worker (×2 in Firefox).
   Not weakened to hit the number. Options if the PMO wants it faster: (a) a smaller run budget (e.g. 3 runs: only first-candidate proofs
   would be accepted; fewer worlds qualify); (b) a tighter Native Competition recipe (e.g. Favorable arrival only — a product choice the study
   does not support on legibility grounds); (c) accept it with the existing mitigation (the selected plant is prepared while the player reads
   Choose Plant Species — *focused* medians above). Recommendation: (c) now, revisit with 036C's authored Challenges.
2. **The proof budget excludes some winnable worlds** (proofs that need many witness tries): an early stop, never a weaker proof, but it
   shifts the accepted set toward worlds whose win the validator finds quickly. Qualifying rates stay healthy (study §5).
3. **Validator touched (opt-in only):** `findStrategies` / `validateScenario` gained `maxRuns`, and the witness / layer P / S2 accept a
   `startingState`; both absent = byte-identical behaviour (golden `sim-check`, every validator suite in the regression).
4. **Volatile Climate's mechanic** is met only when the player Terraforms (the scenario's design); most witnesses adapt instead. Not a recipe
   problem (a cap would not change it); flagged for 036C.
5. **New player-facing copy for review:** PREPARING CHALLENGE WORLD + its three steps; the dossier's section names, "Lands as it always does:
   nothing owned yet.", the foothold line, "This Challenge prescribes the plant."; "Continue with <plant>"; Retry / Challenges notes
   ("The same Challenge, plant and planet…", "…Beginning one again prepares a fresh world."); "Given by the Challenge at landing";
   "No qualifying world turned up in this part of space." (exhaustion; never observed); EXPECTED HAZARDS.
6. **The foothold line** is the S1 measure (growable + reachable over land at landing) and can read low beside a higher arrival share
   (e.g. "50 % of the land" but "Foothold: 6 %"): both true; the PMO may prefer to drop it.

## 11. Evidence

`docs/evidence/bloom-036b/` (Chromium unless prefixed `firefox-`): main menu · hub × 3 (1440 × 900 and 390 × 844) · species choice from each
Challenge · PREPARING for each · the dossier for each Challenge + Organic Hybrid on Dying World (each species across representative
Challenges: Woolly Candle / Dying World + Native Competition, Cinder Rosette / Volatile Climate, Organic Hybrid / Dying World) · runs of all
three · reports of all three · retry (same world) · back to hub · a new launch's dossier · the Expedition 3 × 3 survey with EXPECTED HAZARDS ·
fixtures (prescribed species; starting state dossier + report — test-only) · Firefox: menu, hub, species, PREPARING, the Dying World and Native
Competition dossiers, run, report, the Expedition survey. Data: `challenge-recipe-study.json`, `challenge-world-timing*.json`.
