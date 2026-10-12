# BLOOM-036B + 036B1 — Contained Challenge worlds from prevalidated seed banks: REPORT

**Status: CANDIDATE — STOP FOR PMO REVIEW.** Review branch `handoff/bloom-036b-review` (NOT merged). It contains the PMO-accepted 036A
foundation, the 036B product architecture (accepted) and **036B1: Challenge worlds from PREVALIDATED SEED BANKS** (this pass). Do not merge
036A separately; 036C not started; `main` untouched.

| | SHA |
|---|---|
| Production `main` (untouched) | `47ae6c3649b5ce3f1c42334ec08cf6e06f79e231` |
| 036A accepted parent (`handoff/bloom-036a-review`, kept intact) | `8af3e12e46f484f2d8c1a4013eb956b3f86ec269` |
| 036B accepted-architecture head (previous review head) | `80c353941fc0b1e5fd4141b556d186241d0408ac` |
| 036B1 commits | `7e471dc` implementation (builder, bank, runtime consumer, screen, QA tools) · the docs / evidence commit (this report) |
| Final review head | `handoff/bloom-036b-review` = the docs / evidence commit — **036A 4 + 036B 5 + 036B1 2 = 11 ahead / 0 behind `main`** |

Design (canonical): [`docs/CHALLENGES_SYSTEM_v1.md`](../../CHALLENGES_SYSTEM_v1.md) §4 (seed banks). Build: [`seed-bank/BUILD_REPORT.md`](seed-bank/BUILD_REPORT.md).
Superseded research: [`NATIVE_COMPETITION_LATENCY_STUDY.md`](NATIVE_COMPETITION_LATENCY_STUDY.md). Recipes: [`CHALLENGE_RECIPE_STUDY.md`](CHALLENGE_RECIPE_STUDY.md).

> **EXPEDITION** = live procedural world discovery. **CHALLENGES** = curated banks of **prevalidated procedural seeds** (seeds + proof
> provenance, never geometry): procedural variety with fast, guaranteed-valid startup.

## 1. What changed in 036B1

- **No validation in the player's browser.** 036B searched a stream and proved each candidate live (Native Competition up to 20–90 s). Now an
  **offline builder** proves worlds with the FULL validation and ships **50 curated entries per Challenge × released species (600)**; the
  runtime picks one, regenerates the exact planet from its seeds in milliseconds and verifies its fingerprint.
- **Clean boundaries:** GENERATOR (`bloom-gen.js`, `bloom-archetype.js`, unchanged) · VALIDATOR (`bloom-validate.js`, `bloom-witness.js`,
  `bloom-scenario.js`, `bloom-species.js` — kept whole; one opt-in `trace` for the study) · BANK BUILDER (`tools/build-challenge-seed-bank.mjs`
  + `tools/challenge-bank-builder.mjs`, offline) · RUNTIME CONSUMER (`resources/challenges/challenge-bank.js`, `challenge-world-prep.js`, the
  survey worker's `challenge-bank-world` task). The live search module `challenge-world-search.js` is deleted; `challenge-world.js` keeps only
  shared helpers.
- **Versions:** Challenges v2 → **v3**, `launch.world.policy "recipe"` → **`"seed-bank"`** with `bank: { version: 1, size: 50 }`; instance
  format 1 → **2** (`source: "seed-bank"`). A 036B live-search instance or definition cannot pass as bank-backed (refused: challenges-check C3,
  challenge-world-check B9).
- **PREPARING CHALLENGE WORLD** says only what happens: *Selecting a proven world · Building the planet · Verifying the planet*; no
  percentage; skipped cleanly when the world was built while the player read Choose Plant Species.
- **Dossier:** the separate "Foothold: X %" line is removed (PMO); S1 stays in the bank entry / instance for validation and QA. Every other
  accepted string is unchanged.
- **Retry / repeat:** RETRY CHALLENGE = the same entry (same planet object, fresh simulation); a new BEGIN CHALLENGE = a new launch seed and a
  fresh deterministic pick, stepping past the entries played this session (in memory only; no storage added).

## 2. Bank schema + provenance

`content/challenge-seed-banks.js` (generated; deterministic bytes) → `BLOOM_DATA.challengeSeedBanks = { format: 1, bankVersion: 1, provisional:
false, generator, poolStream, perArchetype, target, inputsFingerprint, cells }`. A **cell** (`"<challenge>/<species>"`) = `{ bankVersion,
provenance, candidates { evaluated, passing, retained, deprioritized }, entries[50] }`. **Entry** = `archetypeId, seed, attempt,
generationSeed, requestedWaterPct, actualWaterPct, landmasses, originLandmassShare, validatedLayers, fingerprint, habitable, classId,
foothold (S1), s2, nativeStart?, proof { status, simulations, confirmations, strategies, marginSeconds, holdCoverage, contested? /
pressureAtMargin? / shocks? }, bucket`.

**Provenance per cell:** challengeId · challengeVersion · recipeVersion · recipeFingerprint · scenarioId · scenarioFingerprint (mechanics) ·
speciesId · physiologyVersion · physiologyKey · startingState · worldGenVersion · archetype fingerprints · rulesFingerprint (engine config +
trait mechanics) · validator `challenge-bank-validation@1`. **Stale-bank protection:** the runtime recomputes it from the running game at
every launch; any difference, another bank version, too few entries or a provisional bank → `STALE_BANK` (refused, an error screen with Back
— never a silent reuse, never a live search). A regenerated world whose fingerprint or arrival share differs → `FINGERPRINT_MISMATCH`.

## 3. The build

`node tools/build-challenge-seed-bank.mjs --per-archetype 160 --workers 8` — full table set: [`seed-bank/BUILD_REPORT.md`](seed-bank/BUILD_REPORT.md).

- **Pool:** 480 species-free worlds (3 archetypes × 160 World Seeds, fixed stream); **475** pass physical validation. Every world evaluated
  for all 12 cells: 5,760 cell evaluations, each to the full layer P where it got that far. **Wall 38 min on 8 worker threads** (16-thread
  iMac; 8 / 12 / 15 workers measured flat — [`builder-pool-bench.json`](seed-bank/builder-pool-bench.json)); 16,200 CPU-s of layer-P proofs.
- **Result: every cell holds 50 — not provisional, no limiting cell.**

| Challenge | Organic Hybrid | Cinder Rosette | Woolly Candle | Reed Spire |
|---|---|---|---|---|
| Dying World — qualifying of 480 | 433 (90 %) | 404 (84 %) | 454 (95 %) | 417 (87 %) |
| Native Competition — qualifying of 480 | 293 (61 %) | 185 (39 %) | 273 (57 %) | 227 (47 %) |
| Volatile Climate — qualifying of 480 | 471 (98 %) | 395 (82 %) | 439 (92 %) | 464 (97 %) |

  Rejections: Native Competition's are mostly its arrival ≥ 20 % recipe (139–247 per species), then layer P (30–42); Dying World / Volatile
  Climate reject only by layer P (4–78) and S2 (≤ 2). The quality rule removed 2 (Native Competition proofs that met no contested front).
- **Retained 50:** archetypes 17 / 17 / 16 in 11 cells; **Native Competition × Reed Spire 5 Desert / 23 Frozen / 22 Ocean** (only 5 Desert
  worlds give Reed Spire ≥ 20 % arrival and pass — all 5 kept). Arrival classes spread over Favorable / Precarious / Extreme where the recipe
  allows (Native Competition: no Extreme, by its recipe).
- **Proofs:** all 600 entries PASS layer P at the full budget, confirmations included where the scenario declares them (Native Competition /
  Volatile Climate: 1,756 confirmation runs across the retained entries); every entry S2-winnable; witness margins 240–890 s; Dying World
  proofs all reach their margin with ≥ 80 % of the decline done; every Native Competition proof meets ≥ 1 contested front (median 8–9).
- **Diversity:** min pair distance 0.37–0.49 (normalized feature space; no near-duplicates); 5–10 distinct archetype × class × land
  buckets per cell; retained ranges cover nearly the passing ranges (arrival, foothold, water, temperature, margin — `distributions.json`).
  The lowest decile of hold margin (18–47 per cell) was held back and not needed.
- **Builder cost — Native Competition:** 54 % of all proof CPU (8,689 of 16,200 s; 36–52 CPU-s per retained entry vs 11–27 for the others) —
  the cost 036B's live search put in front of the player, now paid once, offline.
- **Hashes:** bank `content/challenge-seed-banks.js` 312,145 B, sha256 `dcca6d8ff53e7cbb032bcdf0d0dae81fc0b4660ada008ce08894d6d4ed6871ba` ·
  inputs fingerprint `c176d9c14ca63b83` · candidate cache 4.9 MB sha256 `82766064…`. `--check` (B4) rebuilds the bank byte-identically.

## 4. Runtime — perceived wait, Chromium and Firefox

"Continue with <plant>" → the dossier on screen with the black lifted, through the real UI (`tools/challenge-world-timing.js`; 8 launch seeds ×
3 Challenges × 4 species per mode and browser; the same seeds in both browsers). **cold** = the plant is chosen and Continue pressed at once
(its build starts at that moment); **warm** = the plant's one world was built while the player read the species screen. Data:
[`challenge-world-timing.json`](challenge-world-timing.json).

**Target (< 2 s typical) met everywhere, worst case included: every one of the 384 launches showed its dossier in 1.0–1.2 s.**

| Browser | cold median / p90 / worst | warm median / p90 / worst | world build in the worker (median / max) | PREPARING shown |
|---|---|---|---|---|
| Chromium 147 | 1.08 / 1.12 / 1.21 s | 1.06 / 1.11 / 1.19 s | 12 / 96 ms | never (192 / 192 skipped) |
| Firefox 148 | 1.06 / 1.09 / 1.14 s | 1.00 / 1.09 / 1.13 s | 14 / 100 ms | never (192 / 192 skipped) |

| Challenge | Chromium cold / warm median (worst) | Firefox cold / warm median (worst) |
|---|---|---|
| Dying World | 1.06 / 1.05 s (1.20) | 1.06 / 0.99 s (1.13) |
| Native Competition | 1.09 / 1.07 s (1.21) | 1.06 / 1.03 s (1.12) |
| Volatile Climate | 1.09 / 1.08 s (1.14) | 1.06 / 1.01 s (1.14) |

- **What the ~1 s is:** the screen change itself (fade to black, the dossier's globe and specimen drawn under the black, the black lifting). The
  world takes 12–14 ms to rebuild; even cold, it is ready inside the 250 ms skip window, so PREPARING never flashes. Native Competition is
  no slower than the others (036B live search: Native Competition typical medians 4–22 s, worst 53 s; cold up to 56 s in Firefox).
- **Deterministic:** the same launch seed + species gave the same bank entry and fingerprint in both modes and both browsers (all 96 cases).
- **Responsiveness (species screen, requestAnimationFrame gaps):** idle max 17–18 ms; while a plant is selected and its world built,
  Chromium max 33 ms (none > 50 ms), Firefox max 50–67 ms (1–3 frames > 50 ms per 400 ms sample). That sample includes the species card's
  own specimen redraw on the main thread; the build runs in the worker.
- No console / page errors in either browser.

## 5. No expensive proof at runtime

- The runtime modules contain no call to `findWitness`, `findStrategies`, `validateScenario`, `species.validateFor`, `evaluateSpecies`,
  `physicalCandidate` or `runSearch` (static check), and counting wrappers on every one of them stay at **zero** across complete launches in
  Node (B7, 12 launches) and on the page (F3, every Challenge flow in both browsers).
- A launch = `bankCell` (provenance check) → `pickEntry` (fnv of Challenge id / version × species × launch seed, stepping past this session's
  recent entries) → `BLOOM.archetype.attemptPlanet(archetype, seed, attempt)` (the accepted attempt only) → `planetFingerprint` = the
  entry's → `assessWorld` (the engine's cheap `evaluate()`, for the dossier) → the instance. The proof summary shown to QA / provenance comes
  from the bank (`scenarioValidation.offline: true`).

## 6. Old research (superseded, kept as record)

[`NATIVE_COMPETITION_LATENCY_STUDY.md`](NATIVE_COMPETITION_LATENCY_STUDY.md): Native Competition's live latency came from **slow failing
proofs** (a failing competition run plays towards the tick limit) and **stream-order acceptance** (one slow failing draw blocks the launch);
confirmation reruns were ~45 % of proof time. Run budgets of 3–6 cut the tail but excluded winnable worlds; the S1 foothold showed no content
reason for a floor. **None of it is adopted** — the seed banks remove the proof from the launch. The findings now serve as builder cost data
(§3). Earlier timings: [`challenge-world-timing-live-search.json`](challenge-world-timing-live-search.json) (036B final live search),
`challenge-world-timing-witness-run-budget.json`, `challenge-world-timing-before-proof-budget.json`.

## 7. Unchanged from the accepted 036B architecture

- Flow: MAIN MENU → CHALLENGES → hub → BEGIN CHALLENGE → Choose Plant Species (player choice) → PREPARING → the Challenge Planet Dossier (ONE
  planet) → BEGIN CHALLENGE → run → report (KEEP PLAYING · RETRY CHALLENGE · CHALLENGES · MAIN MENU). No survey, no alternatives, no reroll.
- Recipes v1 (Dying World broad · Native Competition arrival ≥ 20 % · Volatile Climate broad) — now what the builder accepts.
- Prescribed species / starting state: implemented, QA fixtures only (their own fixture bank cells), nothing released.
- Instance / run / report provenance (now with bank version, cell, entry); `challengeRun` refuses anything else; `expeditionRun` refuses a
  Challenge; the Expedition's 3 × 3 survey and EXPECTED HAZARDS unchanged; one document, no URL / storage / `window.name` transport.

## 8. QA

**Focused first** (16 suites, the Challenge / species / run / menu / portable / release / visual surfaces), **then every other
`tools/*-check.js`** — one sequential pass over all **44 suites**, each run once, nothing else running, on the committed implementation
(`7e471dc`). **Result: 43 / 44 green; 1 pre-existing stochastic flake (slice-check pacing); zero new reproducible failures.**

Defects found and fixed during 036B1 QA (before this pass):
- **Hub crash on the v3 Challenges** (challenges-check, early run): the hub's player words were keyed by the retired `"recipe"` world
  policy, so opening CHALLENGES threw. Re-keyed to `"seed-bank"` (same accepted sentence).
- **Black, unclickable dossier when the world was ready early** (challenge-world-check F4, both browsers): a bank world can arrive before
  the screen's stylesheet; the dossier's globe / transition then saw `position: static` and pinned an inline `position: relative`, which
  collapsed the `container-type: size` root to 0 px. The dossier now waits for its stylesheet; F3 now also asserts the dossier has real
  height and that Begin challenge is the element hit at its centre. (036B never hit it: the live search always outlasted the stylesheet.)
- QA-only: B6 / B7's static scans matched validator names in `/** */` comments and provenance strings (now: code only, calls only); P1's
  bank-request count under Firefox file:// (Playwright reports no file:// requests there; the data's presence is asserted directly).

**slice-check pacing** (`perfect-bot win in 4–8 min`, floor 240 s): failed at 238 s in the pass. The demo's simulation draws on
`Math.random` (`bloom-sim.js` default rng), so the bot's win time varies run to run: current code 238 / 236 / 231 / 244 / 255 / 251 s, the
previous review head `80c3539` 239 / 262 / 256 / 251 s — it fails on both. Nothing the demo executes changed (its scripts' only diff is the
witness's opt-in `trace`, never passed there). Not loosened; flagged for whoever owns the slice harness.

Validator / engine suites green with the opt-in `trace` in place: sim-check (golden), strategy, species, native-competition, dying-world,
volatile-climate, economy, terraform, archetype.

| # | Suite | Result | Note |
|---:|---|---|---|
| 1 | `challenge-world-check.js` | OK — challenge-world-check: 70 passed, 0 failed (244 s) (244s) | focused pass · REWRITTEN for 036B1 (bank integrity B1–B9 + browser flow); evidence captured in a separate `--evidence` run (Chromium + Firefox) |
| 2 | `challenges-check.js` | OK — challenges-check: 31 passed, 0 failed (33 s) (33s) | focused pass · updated for v3 / seed-bank (C3 refusals, C5) |
| 3 | `main-menu-check.js` | ALL CHECKS PASS (15691 ms) (16s) | focused pass · pin M7e: the worker's Challenge task is `challenge-bank-world` |
| 4 | `species-selection-check.js` | ALL CHECKS PASS (68/68) (309 s) (309s) | focused pass |
| 5 | `native-competition-check.js` | ALL CHECKS PASS  (178.6 s) (179s) | focused pass |
| 6 | `dying-world-check.js` | ALL CHECKS PASS  (63.2 s) (63s) | focused pass |
| 7 | `volatile-climate-check.js` | ALL CHECKS PASS  (108.6 s) (109s) | focused pass |
| 8 | `species-check.js` | ALL CHECKS PASS (17/17) (228s) | focused pass |
| 9 | `run-ui-check.js` | ALL CHECKS PASS  (71.3 s) (71s) | focused pass |
| 10 | `run-ui-convergence-check.js` | ALL CHECKS PASS  (135.4 s) (135s) | focused pass |
| 11 | `game-flow-check.js` | ALL CHECKS PASS  (113.5 s) (114s) | focused pass |
| 12 | `single-app-flow-check.js` | OK — 59 passed, 0 failed (420 s) (420s) | focused pass |
| 13 | `destination-survey-check.js` | ALL CHECKS PASS  (124.3 s) (124s) | focused pass |
| 14 | `portable-runtime-check.js` | ALL 71 CHECKS PASS  (423.1 s) (423s) | focused pass · pins P6 / P29: 19 classic scripts (+ the bank) |
| 15 | `release-check.js` | ALL CHECKS PASS (51)  (122.5 s) (123s) | focused pass · `--no-suites` |
| 16 | `visual-system-check.js` | OK — 54/54 checks passed (220 s) (220s) | focused pass |
| 17 | `archetype-check.js` | ALL CHECKS PASS  (50.6 s) (51s) |  |
| 18 | `atmosphere-transition-check.js` | ALL CHECKS PASS  (0.0 s) (0s) |  |
| 19 | `body-plan-check.js` | OK — 15/15 checks passed (917 s) (917s) |  |
| 20 | `candle2-contract-check.js` | OK — candle2-contract-check: 15 passed, 0 failed (21.6 s) (21s) |  |
| 21 | `colony-development-check.js` | ALL CHECKS PASS  (26.4 s) (27s) |  |
| 22 | `crossing-check.js` | ALL CHECKS PASS (2s) |  |
| 23 | `cylinder-gen-check.js` | ALL CHECKS PASS  (9.4 s) (9s) |  |
| 24 | `desert-check.js` | ALL CHECKS PASS  (55.7 s) (56s) |  |
| 25 | `economy-check.js` | ALL CHECKS PASS  (345.9 s) (346s) |  |
| 26 | `frozen-check.js` | ALL CHECKS PASS  (79.6 s) (79s) |  |
| 27 | `gen-check.js` | ALL CHECKS PASS (6s) |  |
| 28 | `guided-training-check.js` | ALL 50 CHECKS PASS  (131.0 s) (131s) |  |
| 29 | `organic-hybrid-art-intake-check.js` | OK — 45/45 checks passed (34 s) (35s) |  |
| 30 | `planet-view-check.js` | ALL CHECKS PASS  (78.3 s) (78s) |  |
| 31 | `plant-rooms-check.js` | ALL CHECKS PASS  (82.2 s) (82s) |  |
| 32 | `plant-sprite-pipeline-check.js` | OK — 59/59 checks passed (24 s) (25s) |  |
| 33 | `procedural-run-check.js` | ALL CHECKS PASS  (14.8 s) (15s) |  |
| 34 | `production-plant-integration-check.js` | OK — 50/50 checks passed (90 s) (90s) |  |
| 35 | `sim-check.js` | ALL CHECKS PASS (10s) |  |
| 36 | `slice-check.js` | **FAIL** — 1 check(s) FAILED (9s) | **pre-existing stochastic flake** — see above |
| 37 | `species-art-intake-check.js` | ALL CHECKS PASS (16/16) (90 s) (91s) |  |
| 38 | `specimen-environment-check.js` | OK — specimen-environment-check: 15 passed, 0 failed (54.0 s) (54s) |  |
| 39 | `sphere-texture-check.js` | ALL CHECKS PASS  (6.3 s) (6s) |  |
| 40 | `strategy-check.js` | ALL CHECKS PASS  (24.5 s) (25s) |  |
| 41 | `surface-check.js` | ALL CHECKS PASS (3s) |  |
| 42 | `terraform-check.js` | ALL CHECKS PASS  (116.5 s) (116s) |  |
| 43 | `topology-check.js` | ALL CHECKS PASS  (3.1 s) (3s) |  |
| 44 | `training-check.js` | ALL CHECKS PASS  (39.5 s) (40s) |  |


## 9. Known concerns (for the PMO)

1. **Native Competition × Reed Spire archetype spread:** 5 Desert / 23 Frozen / 22 Ocean (the other 11 cells are 17 / 17 / 16). Only 5
   pool Desert worlds give Reed Spire ≥ 20 % arrival and pass; all are kept. A larger pool would add a few; the recipe is unchanged.
2. **Volatile Climate's mechanic in the proofs:** median 0 climate shocks in the witnesses — shocks follow the player's Terraforming (the
   scenario's design, flagged in 036B), and most witnesses adapt instead. No quality rule was invented for it; requiring ≥ 1 shock would
   select Terraform-led proofs — a PMO / 036C decision.
3. **Broad recipes keep near-zero-arrival worlds** (e.g. Reed Spire on a Dying World desert with 0 % suitable land at landing — proven
   winnable at the full budget). Curation keeps each cell's Favorable / Precarious / Extreme shares within ~12 points of the passing pool
   (no skew to the edges). An arrival floor would be recipe v2 + a bank rebuild.
4. **Size:** the bank is 312 KB and loads with the title's classic scripts (every session, Expedition included; once per document). It could
   be loaded lazily at the first BEGIN CHALLENGE — not done (kept to the existing boot path). The candidate cache (4.9 MB JSON) is committed
   as evidence and as the `--check` input.
5. **Rule changes make every bank stale** (any engine config, trait mechanic, scenario mechanic, physiology, archetype or generator change):
   the Challenge then shows "This Challenge's proven worlds are out of date, so none can be prepared." with Back, and challenge-world-check B1
   fails. Rebuild: `node tools/build-challenge-seed-bank.mjs` (~38 min here) + commit. Worth adding to the release checklist.
6. **Variety:** 50 worlds per Challenge × species; repeats are avoided within a session (in memory); across sessions any entry may come
   back (1 in 50 per launch).
7. **Validator touched (opt-in only):** `trace` (run timings for the latency study); absent = unchanged behaviour (sim-check golden,
   every validator suite green).
8. **New player-facing copy for review:** PREPARING steps *Selecting a proven world · Building the planet · Verifying the planet*; failure
   lines "This Challenge's proven worlds are out of date, so none can be prepared." · "The prepared world did not match its proof, so it was
   not used." (never observed). All other accepted copy unchanged; the Foothold line removed.

## 10. Evidence

`docs/evidence/bloom-036b/` (Chromium unless prefixed `firefox-`): main menu · hub × 3 (1440 × 900, 390 × 844) · species choice from each
Challenge · **`04-preparing-slowed.png`** (the PREPARING copy; a QA-slowed build, since the real screen is normally skipped) · the dossier for
each Challenge (no Foothold line) + Organic Hybrid on Dying World · runs and reports of all three · retry (same entry) · back to hub · a new
launch's dossier (another entry) · the Expedition survey with EXPECTED HAZARDS · fixtures (prescribed species; starting state). Seed bank:
`seed-bank/BUILD_REPORT.md`, `build.json`, `distributions.json`, `candidates.json` (every evaluated world's record — the `--check` rebuild
input), `builder-pool-bench.json`. Timing: `challenge-world-timing.json`.
