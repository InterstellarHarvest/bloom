# BLOOM-028A1 — Validated Destination Identity: evidence report

**Branch** `agent/bloom-028a1-validated-destinations` · **from** `7913fbe` (BLOOM-028A) · **implementation** `7eab0df` ·
not merged, not pushed. Integration contract: [`docs/DESTINATION_SURVEY_v1.md`](../../DESTINATION_SURVEY_v1.md) (top note and §3–§4).

## Results at a glance

| | |
|---|---|
| Identity QA (`qa-validated-identity.js --shots`) | **20 / 20** (`qa-results.json`, `perf-samples.json`) |
| Regression suites (`run-all-suites.sh`, 20 suites) | **20 / 20 green**, 845 checks, 0 failures (`qa-suites-summary.txt`) |
| 028A browser QA re-run on this branch | every behavioural check green, 30 / 32 (`qa-028a-rerun.json`) |
| 027D sphere QA, nested inside that re-run | 41 / 43 |

The 028A re-run's two failures and the nested 027D run's two are provenance-only: those checks list later milestones'
files by design. QA N6 verifies this exactly; no protected gameplay path has changed since `f6bca30`.

## The contract

**Every world the survey shows is a fully validated BLOOM world before it is shown. That exact planet object is what the
globe draws, what the dossier describes, what focus shows, and what Begin Expedition hands on as `detail.planet`. Nothing
regenerates or substitutes it. `detail.candidate.seed` is provenance only.**

---

## Validation change

| | |
|---|---|
| **Old (028A)** | `generateFromArchetype(A, seed, { winnability: false })`: structural layers 1–3 only. On 028A's own sectors 1–3, **4 / 27** shown worlds (**Ocean 3 / 12**) were not the world a validated run of that seed plays (QA N5, measured with 028A's actual module from git). |
| **New (028A1)** | `BLOOM.play.runSearch({ archetype, scenario: null, seeds: [seed] })`: the play flow's own Eden path, i.e. `generateFromArchetype` layers 1–8 (structure, reachability, winnability witness, strategy diversity, pacing) followed by `BLOOM.play.stripPlanet`. A seed with no acceptable world is skipped. |
| **Pre-screen** | Each draw's column is predicted with a cheap structural world (~18 ms). Only draws predicted for a column that still needs worlds pay for validation. The prediction is never shown, stored or returned. |

Generator, validators, witness and play flow are untouched (N2), and no winnability rule was weakened.

**Classification bands, recalibrated (a real defect found by validation).**
- Validated worlds are harsher than 028A's structural ones: on 90 validated worlds, the old 45 % / 22 % bands put only
  ~1 in 10 worlds in Stable, so filling three Stable cells per sector needed ~30 validations.
- The new bands sit at the validated tertiles (21 % / 34 %): **≥ 35 % Stable, ≥ 20 % Volatile, else Extreme**.
- Same measurement (engine `evaluate()` lamps, area-weighted), still presentation-only. First Bloom (35 %) is now Stable.
- The Stable blurb changed to "Broad footholds on arrival", because "Most land habitable" is no longer true at 35 %.

## Planet identity contract — proof

| Check | What it proves |
|---|---|
| **S4** (Node suite) | Each of 18 shown worlds is **byte-identical** (full JSON and fingerprint) to an independent `runSearch` of its seed: layers 1–8, winnability checked, validator solutions stripped. |
| **I2** | Every `setPlanet` was recorded from page start. Each globe was assigned **exactly once**, with an already-validated world whose fingerprint equals the one computed in the worker. Nothing unvalidated was ever drawn, and nothing was swapped afterwards. |
| **I3**, sector 1 (First Bloom included) and sector 2 after a SCAN, all nine positions each | **rendered:** the view draws that planet (same tilemap / sections objects; texture signature of that planet) · **dossier:** recomputed from `candidate.planet`, it equals the shown dossier; the focus panel shows it · **focus:** the same view in the focus slot · **event:** `bloom:begin-expedition` `detail.planet === candidate.planet` and fingerprint = the worker's · **callback:** `onBeginExpedition` received the same detail object · **after:** the planet is unchanged; no generator call, no worker task and no globe re-assignment from select → Begin → return. |
| **I4** | `generatePlanet`, `generateFromArchetype`, `attemptPlanet`, `validatePlanet`, `runSearch` and `searchWorld` were wrapped on the main thread from page start: **0 calls** in the whole session. |
| **I8b** | `dispose()` stops the pool and renderer; a planet already handed on stays intact. |
| **F1** | The same chain passes in Firefox. |

**Fingerprint.**
- `planetFingerprint(planet)` in `survey-data.js` is a 64-bit FNV/murmur mix over identity, grid, topology, sky, every
  section's id / area / landmass / origin / neighbours / conditions, and the full tilemap.
- S8 shows it is stable across structured cloning and changes with one tile, one region condition or one neighbour link.
- It is QA / provenance metadata only (`candidate.fingerprint`), never shown in the UI.

## Worker / prefetch architecture

- **Column tasks.** A sector is three column tasks (one class each, three worlds). Each column draws from a deterministic
  stream for (sector seed, column), so a sector is identical however its columns are scheduled (S5).
- **Pool.** Up to three module workers. Pool size = hardware threads − 1, clamped 1…3, or the `workers` option. Each
  worker builds one column and posts progress. The main thread never generates (N4, I4).
- **Prefetch.** When a sector appears, the next one starts validating. The sector cache holds at most that next sector;
  shown sectors are dropped, since the cells hold them (I8).
- **SCAN before ready.** The button stays busy and the header shows "Confirming worlds n / 9". No globe changes until all
  nine are validated, then the normal sweep runs (I6; `02b-scan-waiting-for-validation.png`).
- **First sector.** The placeholder reads "Surveying sector… n / 9 worlds confirmed", and SCAN is dimmed
  (`00-first-sector-loading.png`).
- **Fallback.** If module workers can't start, the main thread builds columns. This is a documented degraded path; the
  control measurement below shows its cost.

## Performance

Desktop: 8 cores, Radeon Pro 5700 XT. Chromium with ANGLE Metal for GPU numbers.

| | measured |
|---|---|
| one validated world, inside a worker (89 validations) | Frozen 742 ms mean / 2.0 s max · Desert 734 / 2.4 s · Ocean 687 / 3.1 s |
| (Node, 90-world sample) | Ocean 452 mean / 783 p90 · Desert 914 / 2000 · Frozen 1107 / 3078 ms; 0 seeds failed |
| **first sector, 3 workers** (5 fresh loads) | **2.9 – 5.1 s** (slowest column decides); the same sector with **1 worker 7.6 s** |
| prefetched sectors (8 back to back, plus I8's run) | 1.8 – 6.9 s each, built while the current sector is on screen |
| **SCAN when prefetched** | **0.93 – 1.04 s** end to end: the sweep animation only; waited 0 ms |
| SCAN before prefetch completes | waited 4.6 s in an honest busy / "n / 9" state, then the sweep |
| **main thread while 3 workers validate (GPU)** | event-loop lag **max 3.1 ms**, no long tasks, frames 16.67 mean / 16.8 ms max (60 fps) — same as idle |
| control: same prefetch on the main thread (`worker=0`) | frames up to **1.4 s**, lag up to **2.9 s**, 3 long tasks |
| repeated validated scans | listeners / observers / contexts at baseline, 1 context ever created, 9 textures, ≤ 3 workers |
| draw efficiency (9 browser sectors) | 242 predictions (4.3 s total) → 89 validations (64 s total) → 81 shown + 8 set aside |

- **Archetypes.** No archetype dominates inside the workers (means within 8 %). Ocean has the heaviest tail (3.1 s max).
  Frozen is the slowest in Node. Desert needs the most validations, because the Extreme column is mostly Desert.
- **Headless software GL** (SwiftShader, CPU) makes every ~50 ms frame a long task even when idle (I7a, report only). The
  GPU check I7 is the meaningful one.

## Regression QA

- 20 suites green, 845 checks.
- The new S4 alone re-validates 18 worlds (suite time 40 s).

## Browser QA

- **Chromium:** all checks pass. Console has no errors and no WebGL context warnings.
- **Firefox:** F1 passes.
- **Safari / WebKit:** not installed on this machine, so untested (non-blocking).
- **028A browser QA, re-run:**
  - all behavioural checks green: T1–T16, sweep, FLIP continuity and overlap, reduced motion, resize, leaks;
  - prefetched scan 1.05 s, sweep ρ 1.00.

## Known issues

- **First-sector wait.** 2.9–5.1 s on this desktop; slower machines will wait longer. Recommendation: create the survey
  (or start its first sector) while the Main Menu is showing. Not done here; the menu doesn't exist yet.
- **Scanning faster than about one sector per 2–7 s** hits the honest wait. Prefetch depth is 1 by choice, to keep
  classroom devices cool. Raise it if playtests show players scanning rapidly.
- **Main-thread fallback** (no module workers) freezes the screen ~1 s per world. Every target browser supports module
  workers; Safari is untested.
- **First Bloom** is unchanged: authored, and its seam is the separately documented 028A issue.
- **Shared-depth choreography** is unchanged. PlanetSphereView / Renderer are untouched.
