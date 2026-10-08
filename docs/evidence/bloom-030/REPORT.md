# BLOOM-030 evidence — Production root entry + final release candidate

Branch `agent/bloom-030-release-candidate`, from the accepted BLOOM-028D2 final **726f74d5** (not origin/main). Implementation commit
**1fe7334**; this evidence / docs commit follows it. Product truth: [`docs/RELEASE_CANDIDATE_v1.md`](../../RELEASE_CANDIDATE_v1.md).

## Regression

| | |
|---|---|
| Full matrix (`run-all-suites.sh`, 31 suites, on 1fe7334) | **1372 pass / 1 fail** → [`qa-suites-summary.txt`](qa-suites-summary.txt) |
| The one miss | dying-world-check #40, live-random run variance (won one purchase early), the same flake 028D2 recorded; rerun 63/63 on the branch AND on a clean export of 726f74d → [`suite-flakes.txt`](suite-flakes.txt). **0 failures outstanding** |
| `tools/release-check.js` (31st suite, `--evidence`) | **53 / 53** (Node + HTTP smoke 11 · Chromium 36 · Firefox 1 · R65–R67 3 · children 2) → [`qa-release-check.log`](qa-release-check.log) |
| its children | expedition-handoff-check 32/32 · guided-training-check 40/40 (Chromium); standalone in the matrix: 32/32 and 51/51 (Chromium + Firefox) |
| Browsers | Chromium 147.0.7727.15, Firefox 148.0.2 (Playwright builds). Safari / WebKit not available here |

Suites updated intentionally (no gameplay assertion weakened): **game-flow-check** (the retired launcher's screen checks 1–19, 30 / AA,
48–50, R2 → RT1 "the root is the title" / RT2 "file:// notice"; every run-path check kept, driven from the direct `?play=1` URL; 74 → 48
checks), **expedition-handoff-check** (N7 / N8 follow the code to the run page's `../index.html` fallbacks and the shared composer; the
title is `/`), **guided-training-check** (N1 / N8 / N9 / N10 bounded by 028D2's final 726f74d — the 029B–029F END_SHA pattern; the title
is `/`), **training-check** (title and fallback = root; file:// Main menu → the root notice), **run-ui-convergence-check** (B16 player
actions without Change scenario).

## Root smoke (a real static server; `release-proof.json` → `rootSmoke`, `rootAssetRequests`)

`GET /` · `/index.html` · `/?begin=1` → **200** with the title document. The canonical URL `/` loaded 125 requests, all 200 (boot,
composer, MainMenu / ExpeditionEntry / DestinationSurvey modules, both stylesheets, the 14 engine classic scripts, the survey's module
worker, the painting) — no 404, no redirect, no external request. `/?begin=1` opens the survey and drops `begin` from the address.

## Identity through the root (`release-proof.json` → `selectedCandidate`, `run`)

Sector 733179 → **Ymir-45** (Frozen World, volatile class, provenance seed 39968): survey fingerprint `4dac1cbbefccb30e` = stored payload =
gameplay; the focused globe's texture `7b6d5d4b:480x240` = the gameplay canonical surface; on the run page every generator / search /
attempt function was guarded to throw and was never called (createSim × 1). The run booted on `/demos/demo-run.html?play=1&expedition=<token>`.

## Return URLs (all to the root)

| from | to |
|---|---|
| Play again | `demo-run.html?play=1&expedition=<same token>` (same planet, fresh run) |
| Choose another planet | `/?begin=1` → the Destination Survey |
| Main menu | `/` |
| expedition failure state | `../index.html` → the title |
| TRAINING (from `/`) | `demos/demo-run.html?training=1&return=<origin>/` |
| training Main menu · Skip (confirmed) | `/` (Skip records "skipped") |
| TRAINING COMPLETE → Begin Expedition | `/?begin=1` → the survey |
| a training run with no `return=` | `../index.html` |

No production action targets `demos/main-menu.html`, a launcher hash route or `ui=legacy` (R43 / R44 / R56).

## file://

Root `index.html` as a file: "STRANGE BLOOM / UNKNOWN SOILS / This build needs to be opened through a web server. / From the game folder run
`python3 -m http.server 8767` and open `http://localhost:8767/`" — one script loaded, nothing else (Chromium and Firefox; still 20). The
standalone `demos/demo-run.html` still boots First Bloom over file:// on the production Planet View (R64).

## Stills

| | |
|---|---|
| `01-root-title.png` | `/` — the Strange Bloom title (first visit: TRAINING Recommended, the first sector surveying) |
| `02-root-recommended-tag.png` | the plaque with the Recommended tag |
| `03-root-first-run-recommendation.png` | the first BEGIN EXPEDITION: "First expedition?" |
| `04-root-destination-survey.png` | the survey entered from the root (nine validated worlds) |
| `05-selected-focused-destination.png` | the chosen world in focus |
| `06-dramatic-descent.png` | the DRAMATIC descent mid-cover |
| `07-first-gameplay-frame-root-flow.png` | the first gameplay frame on the handed-off planet |
| `08-production-planet-view.png` | the production Planet View |
| `09-adapt-room.png` · `10-terraform-room.png` | Adapt; Terraform with the live sphere of THIS planet |
| `11-production-bloom-report.png` | the production Bloom Report (Play again · Choose another planet · Main menu) |
| `12-choose-another-planet-root-survey.png` | Choose another planet → `/?begin=1` → the survey |
| `13-main-menu-root-title.png` | Main menu → `/` |
| `14-guided-training-from-root.png` · `15-training-complete.png` | Guided Training opened from `/`; TRAINING COMPLETE |
| `16-root-1024x768.png` · `17-root-1440x900.png` | viewports (no horizontal scroll at 1024 / 1280 / 1440) |
| `18-firefox-root.png` | Firefox 1280 × 800 |
| `19-reduced-motion.png` | reduced motion (OS): the run reached through the reduced root flow |
| `20-file-http-required-notice.png` | the root over file:// |

Note on 11 / 15: the suite reaches the win through a QA shortcut (`sim.onWin` on the current state, the 029F suite's own method), so those
two reports show a few seconds and a few percent; the report rendering and its actions are what they prove. Real wins through real input
are proven by game-flow-check #45 and guided-training-check G3 / G4.

## Paused 028D2 worktree

`_worktrees/bloom-028d2-guided-training` (c23815e): HEAD c23815e, `git status --porcelain` sha256 `8abc76b1…`, `git diff` sha256
`bde236ae…`, 4 untracked files with their recorded hashes — identical before this milestone began and after (release-check R77;
`release-proof.json` → `oldWorktree`).
