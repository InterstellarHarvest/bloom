# BLOOM-029E evidence — Gameplay UI convergence (production default · SUBDUED transitions · production run report)

Branch `agent/bloom-029e-gameplay-ui-convergence`, from **0f5ce81** (the accepted BLOOM-029D final candidate). Not merged; main untouched;
the 028D2 guided-training worktree untouched. Handoff: [`docs/GAMEPLAY_UI_CONVERGENCE_v1.md`](../../GAMEPLAY_UI_CONVERGENCE_v1.md).
Implementation commit **8688d3b**; this evidence is a separate commit on top.

## 1. What changed

| file | change |
|---|---|
| `demos/demo-run.html` | **routing**: production Planet View + four rooms + production report by default (`?ui=18` alias; `?ui=legacy` = the retired engineering shell, developer-only, never linked); **titles** `Strange Bloom — <world>`; **report truth** factored once into `winReport()` / `lossReport()` + `pressureReportData()` / `competitionReportData()` / `climateReportData()` (the engineering modal renders `legacyWinHtml` / `legacyLossHtml` from the same data — the same words as before); `reportActions()` / `reportAction()` / `continueAfterWin()`; host gains `read.report`, `read.reportActions`, `act.reportAction`; mounts the rooms and the report over the Planet View |
| `resources/run-ui/gameplay-transition.js` (new) | `BLOOM.gameplayTransition`: ONE SUBDUED mist per run over the unmodified AtmosphereTransition (guarded import over http(s), public API only — constructor / prepare / run({ preset: "subdued", onCovered, onPhase }) / dispose / running / phase; early `prepare()`; `run()` never rejects and swaps exactly once: immediate on file:// / pending / busy / hidden page, watchdog 900 ms, hard cap 2.5 s; the Settings motion choice through `main-menu-data.js`) |
| `resources/run-ui/decision-rooms.js` · `.css` | open / switch / close through the bridge with the locked order; `transitioning` guard + locked controls; `closeImmediate()` at the end of a run; restrained card entrance (`.dr-room.entering`, none under reduced motion); `timeline()` |
| `resources/run-ui/run-report.js` · `.css` (new) | `BLOOM.runReport`: the Bloom Report / Extinction field-journal card over the dimmed Planet View — `adapter.report()` only, the production plant specimen from the real owned tiers, "You reshaped the sky" apart, scenario cards, the page's actions through `actions.reportAction`; dialog semantics, focus trap, Escape never dismisses; anchors `report` / `report-continue` / `run-actions` (+ `action-*` while open; the menu's copies suspended) |
| `resources/run-ui/run-ui-adapter.js` | `report()`, `reportActions()`, `actions.reportAction(id)` — additive, api 1, 10 events |
| `resources/run-ui/planet-view.js` · `.css` | the UI 18 badge and the "arrives in BLOOM-…" copy removed; the room request guarded during a swap; `#reportModal` hidden under `html.ui18` |
| `tools/run-ui-convergence-check.js` (new) | the 28th suite |
| older suites | the legacy-harness suites open `?ui=legacy` (slice, economy, procedural-run, colony-development, desert, frozen, dying-world, native-competition, volatile-climate, run-ui-check, training-check B2); planet-view-check B1 proves the flag, B2 / B21 / B22 the production ownership of the report anchors and the flag-free training URL; the 029B / 029C / 029D scope guards bounded to their own accepted range (`END_SHA`); plant-rooms / terraform / planet-view room steps wait for the mist to settle; game-flow-check drives the production menu and report; training-check reads the production titles and menu and samples the arrival cover at `bloom:run-ready` |
| docs | `GAMEPLAY_UI_CONVERGENCE_v1.md` (new); `PRODUCTION_PLANET_VIEW_v1`, `PRODUCTION_PLANT_ROOMS_v1`, `PRODUCTION_TERRAFORM_ROOM_v1`, `RUN_UI_PRODUCTION_BOUNDARY_v1`, `TRAINING_FOUNDATION_v1`, README |

**Byte-identical to 0f5ce81** (suite N2; `convergence-proof.json → unchanged`): `resources/atmosphere-transition/atmosphere-transition.js`
(blob unchanged — presets and timings untouched), PlanetSphereView + planet-texture.js, the canonical surface, the engine / generator /
validators / play / scenario modules, content (config, traits, scenarios, archetypes, training, play), planets, the training layer, the
main menu, the Destination Survey (the 029F seam), the map renderer, the specimen, the globe helper, root `index.html`, the title / survey
pages, the mockups. **Gameplay unchanged** (N10): the current engine and 0f5ce81's engine give identical seeded 900-tick runs on First
Bloom, Training Grounds and Ocean 28 with the same purchases. Every `bloom:*` dispatch site and detail key list is identical (N7).

## 2. Routing policy · developer flag · shell retirement

- No `ui=` → production; `ui=18` → production (alias); `ui=legacy` → the engineering shell. Every launch kind (First Bloom, `planet=`,
  generated, pressure, competition, volatile climate, `play=1`, `training=1`) mounts production (B1 / B3). The flag is linked from nothing
  in the game (N4); generated action URLs and the training actions carry no `ui=` (B11 / B14).
- In production the shell's header / main / footer / report modal are `display:none`, no shell control is focusable, 40 Tab presses never
  reach it, one sim object (B1). `?ui=legacy` restores the shell exactly, usable (B2; `19-ui-legacy-engineering-harness.png`).
- Player-visible copy: no `ui=18`, milestone numbers, "arrives in", "development view", "temporary shell" or "playtest harness"; no
  emoji in any production source string (the one kept pictograph is the semantic ⚠ of the climate readout) (N8, B1).

## 3. Transition bridge · ordering · timing evidence

`convergence-proof.json → timings` holds every recorded swap of the suite's session (Chromium and Firefox). Required crossings, Chromium
1280×800 (ms after the request; the page clock):

| crossing | pause | covered (swap) | reveal complete | resume | running at swap | ticks during |
|---|---|---|---|---|---|---|
| Planet View → Adapt (from running) | +0 | 113 | 323 | — | no | 0 |
| Adapt → Terraform | (already paused) | 136 | 342 | — | no | 0 |
| Terraform → Region | (already paused) | 155 | 356 | — | no | 0 |
| Region → Planet View (Back, was running) | — | 125 | 295 | +0 after reveal | no | 0 |
| report open (training win) | (stopped by the run) | 103 | 285 | — | no | 0 |
| report Keep playing close | — | 136 | 294 | +0 after reveal | no | 0 |

Across all 30 recorded swaps (both browsers): covered 94–201 ms, reveal complete 257–405 ms (the SUBDUED preset's own 90 + 120 ms plus the overlay mount, the
component's first frame and the swap's own painting; the preset timings are untouched), pause ≤ 1 ms after the request, resume ≤ 1 ms after
the reveal completed. Proven for every swap (the suite's timing proof): OPEN pause ≤ covered; CLOSE resume ≥ reveal complete; ROOM → ROOM
never running; `ticksAtEnd === ticksAtStart`. One instance per run, prepared 103 ms (Chromium) / 174 ms (Firefox) after the import resolved, the module served once (B4).

Concurrency (B8): a double click on a tool + a click on another, a double click on the nav + another, three Escapes → exactly one pause, one
resume, exactly three transitions, never two rooms, the context kept, no sticky preview, no `AtmosphereTransitionBusy`, no unhandled
rejection. Failure safety (B9): a rejecting component run still swaps; a hidden page swaps immediately; a never-settling run is swapped by the
watchdog and released by the hard cap. Reduced motion (B19 / B19b): the component's reduced path (`rm` overlay, `reducedMotion: true`), no
card transform, through both the OS and the Settings "Reduced" choice. file:// (B20): immediate swaps, mechanics intact, report open / close.

## 4. Production report

- Opens on a win / an extinction through the SUBDUED mist (any open room closed at once), a modal dialog over the inert Planet View, focus on
  Keep playing / the first action; the engineering modal never renders or shows (B11 / B16; `legacyReport` 0 chars).
- **Parity** (B11, B16, B17): coverage / time / held / gave-up + reason / build tiers / Terraform / colony upgrades equal the legacy
  authoritative classification recomputed in place from the sim; the production text carries the same names, reasons and numbers as the legacy
  markup rendered from the same truth; the pressure / competition / climate cards carry exactly the numbers of the legacy `#repPressure` /
  `#repComp` / `#repClimate` lines (real wins on Ocean 28 Dying World, Desert 17 Native Competition, Frozen 4 Volatile Climate through the
  adapter's buy on the validator's first strategy). Analogs are the traits' own `science` text. Extinction: reason = `sim.lostReason`.
- **Plant**: the production specimen rendered from the real owned tiers (its signature equals a fresh draw of the same state); Terraform
  appears only in "You reshaped the sky"; the loss specimen reads unviable with its anatomy intact.
- **Actions**: Keep playing (the unchanged continue-after-win, resumed only after the reveal — no `bloom:play-pause`, as before; the run
  advances afterwards), the player's five, the training's Restart / Main menu (Restart reopens the default production training paused at
  tick 0; the completion store reads "completed", written by the unchanged training layer), "Restart this run" outside player mode.
- **Accessibility**: 30 Tabs stay inside; Escape never dismisses (win or loss); the Planet View inert / aria-hidden underneath.
- **Anchors**: `report` / `report-continue` / `run-actions` resolve to ONE production element before and after a win; every 028D1 anchor
  (HUD, menu actions, map, banner, rooms, every offered upgrade, report) resolves exactly once on a fresh training page; the shell carries only
  `data-tutorial-legacy` copies; while the report is open `action-*` resolve only to its buttons (B11 / B15).

## 5. Focused suite — `tools/run-ui-convergence-check.js`

**56 / 56** (`qa-run-ui-convergence-check.log`, the `--evidence` run on 8688d3b): Node 10 · Chromium 26 · Firefox 19 · the timing proof 1. The same suite passed 56 / 56 inside the broad run. (A first evidence run had one Firefox-only race in the suite itself — B4 read `prepareStats` before the eight bitmaps had decoded; B4 now waits for the prepare to report, no assertion changed; that suite fix is part of the evidence commit.)

## 6. Broad regression — `run-all-suites.sh` (28 suites)

See `qa-suites-summary.txt` and `suite-flakes.txt`. **28 suites · 1263 pass / 0 fail** on **8688d3b** (the implementation commit), every suite exit 0: the 27 earlier suites at their accepted totals (sim 19, gen 47, crossing 14, topology 53, cylinder-gen 35, archetype 40, strategy 35, slice 15, surface 11, procedural-run 32, colony-development 68, desert 64, frozen 70, dying-world 63, economy 39, native-competition 66, volatile-climate 78, game-flow 74, sphere-texture 14, destination-survey 11, atmosphere-transition 14, main-menu 17, training 82, run-ui 40, planet-view 80, plant-rooms 66, terraform 60) and run-ui-convergence-check 56. No flake occurred in the broad run; the slice-check pacing flake seen in an earlier single run reproduced on the accepted baseline 0f5ce81 (`suite-flakes.txt`).

## 7. Screenshots

| # | file |
|---|---|
| 01 | `01-default-production-planet-view.png` — no `ui=` query |
| 02–05 | Region / Adapt / Spread / Terraform after the SUBDUED reveal |
| 06 | `06-transition-mid-conceal.png` (animations paused inside the conceal) |
| 07 | `07-room-to-room-mid-transition-covered.png` (paused at the covered point) |
| frame strip | `frame-strip-concealing.png` · `frame-strip-covered.png` · `frame-strip-revealing.png` · `frame-strip-idle-planet-view.png` |
| 09 | `09-report-plant-build-area.png` |
| 10 | `10-production-extinction-report.png` |
| 11–13 | pressure / competition / volatile-climate win reports |
| 14 | `14-training-complete-report.png` |
| 15 / 16 | report at 1024×768 / 1440×900 |
| 17 / 18 | Firefox production default (room) / Firefox report · `18-reduced-motion-report.png` |
| 19 | `19-ui-legacy-engineering-harness.png` |

## 8. Risks for 029F / 028D2

- 029F: the survey's `detail.planet` must replace the boot's planet source; the production UI takes any planet object the run holds. The
  DRAMATIC descent stays the survey → gameplay crossing; the SUBDUED language starts inside gameplay.
- 028D2: `action-<id>` is attribute-suspended on the menu while the report is open — a coach must re-query anchors after a win; room
  navigation and the report are presentation state (no new event).
- The report's action bar can take three rows at 1280×800 in player mode (the body scrolls inside the card).
- Firefox at 1280×800 only (WebKit not installed).
