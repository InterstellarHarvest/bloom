# BLOOM-028D2 — Production Guided Training · evidence

Design: `docs/GUIDED_TRAINING_v1.md`. Suite: `tools/guided-training-check.js` (30th). Start: `8f4c273` (accepted 029F final).
Implementation: `cd75ea2`. This folder: the evidence commit on top.

## QA

| | result |
|---|---|
| `guided-training-check` (Chromium + Firefox, `--evidence`) | **51 / 51** (17 Node + 34 browser checks covering the 96 required items — `guided-training-proof.json → requirements`) |
| broad regression, 30 suites (`run-all-suites.sh`) | **1344 pass / 2 fail** → both reruns green (`suite-flakes.txt`): **1346 / 0 outstanding** |
| focused set (training, run-ui-convergence, expedition-handoff, terraform, plant-rooms, planet-view, run-ui, main-menu, destination-survey, atmosphere-transition, sphere-texture) | all green in the broad run (`qa-suites-summary.txt`) |
| 029F exact-world identity (`expedition-handoff-check`) | 32 / 32 |

Suites changed for intended behaviour (documented in each file): `training-check` (B2g training actions; B5e confirms the Skip dialog),
`planet-view-check` (B22 confirms the Skip dialog), `run-ui-convergence-check` (B11 training action set / focus; B13 Keep playing moved to an
ordinary `play=1&planet=training_grounds` win), `expedition-handoff-check` (END_SHA bound; a training record seeded so the first-run prompt does
not intercept its departures). No assertion was weakened.

## Stills (1280×800 Chromium unless named)

| file | shows |
|---|---|
| 01-menu-training-recommended.png | the title with TRAINING · Recommended (no training record) |
| 02-first-begin-recommendation.png | the first BEGIN EXPEDITION: one dialog — Go to Expedition · Start Training (~5 min) |
| 03-step01-play.png | lesson 1 · Play (the real 65 % goal), card below the clock |
| 04-step02-green-verge.png | lesson 2 · Green Verge ring on the map |
| 05-step03-bubble.png | lesson 3 · the scripted Biomass bubble (BLOOM_RUN_UI.placeBubble) |
| 06-step04-chill-hollow.png | lesson 4 · Chill Hollow on the map |
| 07-step05-cold-preview.png | lesson 5→6 · Cold Tolerance's real preview in the Adapt room |
| 08-step06-adapt-purchase.png | lesson 6 done · the changed specimen, Spread next |
| 09-step07-spread.png | lesson 7 · Seed Output previewed in the Spread room |
| 10-step08-growth-focus.png | lesson 8 · Region Inspect › Colony › Growth focus |
| 11-step09-local-upgrade.png | lesson 9 · the local upgrade controls |
| 12-terraform-humidify-preview.png | lesson 11 · the real Humidify preview: Thirsty Flats opens, Reed Fen worse but growing (card + room readout) |
| 13-step12-salt-pan.png | lesson 12 · Salt Pan's chip (a sacrifice zone) |
| 14-step13-goal.png | lesson 13 · coverage + speed |
| 15-training-complete.png | TRAINING COMPLETE: Begin Expedition · Restart training · Main menu (no Keep playing) |
| 16-skip-confirm.png | the one Skip confirmation |
| 17-1024x768.png · 18-1440x900.png | lesson 5 at those sizes |
| 19-firefox-1280.png · 19-firefox-1280-complete.png | Firefox 1280×800 (lesson 5; the completed report) |
| 20-reduced-motion.png | Settings "reduced": no pulse / glide |
| 21-narrow-860.png | below 900 px: the docked card |
| 22-alternate-warm.png · 23-alternate-drought.png | the alternate route: Warm the Sky / Drought acknowledged |

`guided-training-proof.json`: the 13 lessons (id, title, copy, target strategy, predicate), the taught run (every advance with tick, cause,
fitness of every region, owned upgrades, focus, local upgrades; the events observed; each target's resolved control and the card's position),
the Firefox run, the alternate run, the bubble (placed once, collected by click / auto), the real final coverage and the stored record, the
completion actions, the first-run prompt states, Skip, keyboard / reduced-motion probes, viewports, the training config, and the
96-requirement → check map.

## Untouched

- The paused 028D2 worktree (`_worktrees/bloom-028d2-guided-training`, c23815e): `git status --porcelain` sha256 `8abc76b1…`, `git diff` sha256
  `bde236ae…`, four untracked files' sha256 — identical before and after (suite N2).
- main: not pushed, not merged.
