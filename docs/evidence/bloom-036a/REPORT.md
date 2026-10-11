# BLOOM-036A — Challenges foundation + first playable hub · review record

**Status: CANDIDATE** — branch `handoff/bloom-036a-review`, NOT merged. Started from production `main` **47ae6c3** (the BLOOM-035C
docs-only closeout over the integrated 035C2 head `4ac7301`). Design: [`../../CHALLENGES_SYSTEM_v1.md`](../../CHALLENGES_SYSTEM_v1.md).

## What changed

| Area | Files |
|---|---|
| Challenge data + resolver | `content/challenges.js` (new) · `resources/bloom-challenges.js` (new, `BLOOM.challenges`) |
| Hub | `resources/challenges/challenge-hub.js` + `.css` (new, lazy module; registered in `resources/portable/portable-entry.js`) |
| Menu | `resources/main-menu/main-menu.js` (CHALLENGES, only with its hook) · `resources/ui/bloom-icons.js` (`challenge` pennant + the gameplay's `pressure` / `competition` / `climate` glyphs, identical path data) · `resources/main-menu/title-boot.js` (the catalogue + resolver load with the title) |
| Flow | `resources/main-menu/expedition-entry.js` (hub state, Back from species → hub, every return to the title clears the Challenge) · `resources/app/app-controller.js` (hub factory, `detail.challenge` identity check, session records) · `resources/species-select/species-select.js` (kicker names the Challenge; no recommendation note inside one) |
| Survey | `survey-data.js` (scenario layer: `scenarioFor`, `validateScenarioFor`, `scenarioKey`; `makeCandidate` / columns / sector key take `scenario`) · `sector-pool.js` (third cache, `_scenario` task step) · `survey-worker.js` (`"scenario"` task) · `destination-survey.js` + `.css` (`challenge` option, title kicker, "Begin challenge") |
| Run | `resources/run/game-session.js` (`expeditionRun` plays the Challenge's scenario, `runChallenge` provenance cross-checks, report identity) · `run-ui-adapter.js` (`run().challenge`) · `planet-view.js` (HUD / footer) · `run-report.js` ("Challenge · <name>") |
| Portable | `dist/portable/` regenerated (`npm --prefix tools run build:portable`; `--check` identical) |
| QA | `tools/challenges-check.js` (new) · menu expectations in game-flow, guided-training, portable-runtime, release, single-app-flow, visual-system (V5 icon set, V10 Challenges state) |
| Docs | `docs/CHALLENGES_SYSTEM_v1.md` (new) · `docs/PRODUCT_DIRECTION_CURRENT.md` (036A CANDIDATE · Challenges CANDIDATE / first playable foundation · 036B NEXT / planned) |

No engine, generator, validator, scenario, species or art file changed. No new production HTML document.

## Challenge schema and the initial set

See `CHALLENGES_SYSTEM_v1.md` §2. The three definitions reference their scenarios' own player-facing copy (`@scenario.display.*`); the
only Challenge-owned copy is Native Competition's science line (its scenario has none).

| id | scenario | icon | launch | completion |
|---|---|---|---|---|
| `dying_world` | `dying_world` | `pressure` | player-choice · destination-survey · none · sector | bloom · [] |
| `native_competition` | `native_competition` | `competition` | same | same |
| `volatile_climate` | `volatile_climate` | `climate` | same | same |

## Survey cost under a Challenge (sector 77, workers = 6)

| Challenge · species | Chromium | Firefox | scenario-rejected worlds |
|---|---|---|---|
| Dying World · Woolly Candle | 4.4 s | 4.6 s | 0 |
| Native Competition · Woolly Candle | 12.7 s | 13.2 s | 1 |
| Volatile Climate · Cinder Rosette | 25.5 s | 32.2 s | 3 |

Worlds appear progressively as each is proven (the 028B fill). Node: the Dying World sector of seed 77 reused 9/9 of the Expedition
sector's planet objects (physical cache), with no planet changed by validation.

## QA

- `tools/challenges-check.js`: **87 / 87** (Node 7 + Chromium 40 + Firefox 40).
- The directive's list (main-menu, single-app-flow, species-selection, destination-survey, game-flow, portable-runtime, release `--no-suites`, visual-system): green — see **Full regression** below.

## Evidence (this folder; Chromium unless prefixed `firefox-`)

`01-main-menu-challenges.png` · `01-main-menu-390x844.png` · `02-hub-<id>-1440x900.png` · `02-hub-<id>-390x844.png` (phone sheet) ·
`03-species-from-challenge.png` · `04-survey-under-challenge.png` · `05-run-<id>.png` (all three) · `06-adapt-room-dying_world-late.png` ·
`06-adapt-room-volatile_climate-shock.png` · `07-report-<id>.png` · `08-play-again.png` · `09-choose-another-planet.png` ·
`10-expedition-no-residue.png` · `11-training-no-residue.png` · Firefox: `firefox-01-main-menu-challenges.png`,
`firefox-02-hub-dying_world-1440x900.png`, `firefox-03-species-from-challenge.png`, `firefox-04-survey-under-challenge.png`,
`firefox-05-run-dying_world.png`, `firefox-07-report-dying_world.png`.

## Full regression

Every `tools/*-check.js`, sequentially on this branch with nothing else running (`release-check --no-suites`): **43 / 43 suites green**.
First pass 37 / 43; the six failures were all accepted expectations that the five-entry menu or the new survey wording legitimately changed (destination-survey S15 source pin of the rejection counter · main-menu M7e worker-call pin · portable-runtime P5 / P6 / P29 / P44 module list, classic-script count and four-entry keyboard walk · release R73 keyboard walk · single-app-flow S7 survey-kicker pin · visual-system A1 / P1 keyboard target and icon count). Each was updated narrowly (no check removed or loosened beyond the new state) and rerun green.

| Suite | Result | Note |
|---|---|---|
| `archetype-check.js` | ALL CHECKS PASS  (50.6 s) | |
| `atmosphere-transition-check.js` | ALL CHECKS PASS  (0.0 s) | |
| `body-plan-check.js` | OK — 15/15 checks passed (867 s) | |
| `candle2-contract-check.js` | OK — candle2-contract-check: 15 passed, 0 failed (19.7 s) | |
| `challenges-check.js` | OK — challenges-check: 87 passed, 0 failed (482 s) | |
| `colony-development-check.js` | ALL CHECKS PASS  (26.8 s) | |
| `crossing-check.js` | ALL CHECKS PASS | |
| `cylinder-gen-check.js` | ALL CHECKS PASS  (8.8 s) | |
| `desert-check.js` | ALL CHECKS PASS  (51.7 s) | |
| `destination-survey-check.js` | ALL CHECKS PASS  (135.4 s) | first pass failed on a pinned four-entry-menu / source expectation; pin updated, rerun green |
| `dying-world-check.js` | ALL CHECKS PASS  (57.2 s) | |
| `economy-check.js` | ALL CHECKS PASS  (324.6 s) | |
| `frozen-check.js` | ALL CHECKS PASS  (79.5 s) | |
| `game-flow-check.js` | ALL CHECKS PASS  (105.7 s) | |
| `gen-check.js` | ALL CHECKS PASS | |
| `guided-training-check.js` | ALL 50 CHECKS PASS  (133.4 s) | |
| `main-menu-check.js` | ALL CHECKS PASS (17392 ms) | first pass failed on a pinned four-entry-menu / source expectation; pin updated, rerun green |
| `native-competition-check.js` | ALL CHECKS PASS  (207.5 s) | |
| `organic-hybrid-art-intake-check.js` | OK — 45/45 checks passed (38 s) | |
| `planet-view-check.js` | ALL CHECKS PASS  (79.3 s) | |
| `plant-rooms-check.js` | ALL CHECKS PASS  (88.3 s) | |
| `plant-sprite-pipeline-check.js` | OK — 59/59 checks passed (27 s) | |
| `portable-runtime-check.js` | ALL 71 CHECKS PASS  (462.2 s) | first pass failed on a pinned four-entry-menu / source expectation; pin updated, rerun green |
| `procedural-run-check.js` | ALL CHECKS PASS  (14.8 s) | |
| `production-plant-integration-check.js` | OK — 50/50 checks passed (90 s) | |
| `release-check.js` | ALL CHECKS PASS (51)  (158.5 s) | first pass failed on a pinned four-entry-menu / source expectation; pin updated, rerun green |
| `run-ui-check.js` | ALL CHECKS PASS  (69.5 s) | |
| `run-ui-convergence-check.js` | ALL CHECKS PASS  (129.6 s) | |
| `sim-check.js` | ALL CHECKS PASS | |
| `single-app-flow-check.js` | OK — 59 passed, 0 failed (471 s) | first pass failed on a pinned four-entry-menu / source expectation; pin updated, rerun green |
| `slice-check.js` | ALL CHECKS PASS | |
| `species-art-intake-check.js` | ALL CHECKS PASS (16/16) (84 s) | |
| `species-check.js` | ALL CHECKS PASS (17/17) | |
| `species-selection-check.js` | ALL CHECKS PASS (68/68) (287 s) | |
| `specimen-environment-check.js` | OK — specimen-environment-check: 15 passed, 0 failed (53.7 s) | |
| `sphere-texture-check.js` | ALL CHECKS PASS  (6.2 s) | |
| `strategy-check.js` | ALL CHECKS PASS  (26.6 s) | |
| `surface-check.js` | ALL CHECKS PASS | |
| `terraform-check.js` | ALL CHECKS PASS  (118.2 s) | |
| `topology-check.js` | ALL CHECKS PASS  (3.3 s) | |
| `training-check.js` | ALL CHECKS PASS  (39.7 s) | |
| `visual-system-check.js` | OK — 54/54 checks passed (232 s) | first pass failed on a pinned four-entry-menu / source expectation; pin updated, rerun green |
| `volatile-climate-check.js` | ALL CHECKS PASS  (108.3 s) | |

## Known concerns (for the PMO)

1. **Interim world policy.** PRODUCT_DIRECTION §8's locked target is one fresh recipe planet per Challenge with no 3 × 3 survey; 036A uses
   the survey per the directive. Recorded as interim; the recipe planet is 036B.
2. **Challenge surveys are slower** (4–32 s to fill at sector 77) because every offered world runs the scenario's real layer-P proof; the
   progressive fill keeps the screen live. Volatile Climate is the slowest.
3. **Copy echoes.** Because the scenario stays the source of truth, a card line and the dossier briefing can say nearly the same thing
   (e.g. Native Competition's "The planet already has native vegetation." / "This planet already has native vegetation…"). Shorter
   Challenge-owned lines are possible if the PMO wants them (the schema allows them; verbatim copies are refused).
4. **"Expected challenges"** — the survey dossier's existing heading for a world's difficulties now shares a word with the CHALLENGES mode.
   Unchanged in 036A; a rename (e.g. "Expected hazards") is a small follow-up if wanted.
5. **New player-facing copy** for PMO review: the hub lede, "How the run works" lines, Native Competition's science line, "proven for
   <Challenge>" in the survey seed line, "challenge debrief" in the report kicker.
6. **QA contention note.** During the 035C post-integration QA, `specimen-environment-check` B2 / B3 failed once while this milestone's
   browser suite ran concurrently (its fixed 900 ms room wait); it passed 15 / 15 in isolation on clean main, and the full regression below
   ran with nothing else on the machine.
