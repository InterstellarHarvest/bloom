# BLOOM-034 — Visual-system convergence · evidence

**Branch** `agent/bloom-034-visual-system` → review branch `handoff/bloom-034-review` · **base** `79f5540` (origin/main, BLOOM-033 closeout) ·
**not merged**. System description: [`docs/VISUAL_SYSTEM_v1.md`](../../VISUAL_SYSTEM_v1.md). Machine: macOS 12, Playwright 1.59.1,
Chromium 147.0.7727.15, Firefox 148.0.2.

## Commits

| SHA | |
|---|---|
| `cd54b76` | **fix** — the decision rooms' mini-map card no longer collapses (isolated; applies on 79f5540 alone) |
| `3916c90` | implementation — `resources/ui/bloom-theme.css`, `resources/ui/bloom-icons.js`, title / menu + survey restyle, gameplay token wiring, theme links, portable bundle |
| `df125b9` | QA — `tools/visual-system-check.js`; main-menu-check M7 admits the icon module |
| `db4b1e5` | docs — `docs/VISUAL_SYSTEM_v1.md`, PRODUCT_DIRECTION_CURRENT (CANDIDATE), pointers |
| evidence commit | this folder; the suite writes painting stills as JPEG and names the repaired Adapt still |

## Results

- **visual-system-check** (new, 37th suite): **46 / 46** (Node V1–V10 + Chromium and Firefox T / D / S / G / L / A / P) — `qa-visual-system-check.log`, `visual-system-proof.json`.
- **Full regression** on `db4b1e5`, every `tools/*-check.js` sequential, nothing else running (release-check `--no-suites`, portable-runtime with its child):
  **36 suites · 1648 passed · 2 missed** (`qa-full-regression-raw.txt`). Both misses are flakes reproduced in neither tree:
  - `run-ui-convergence-check` [chromium] B16 — a 10 s wait for the Dying-World extinction report after a 3 000-tick advance timed out
    (Firefox passed everything). Re-runs: branch **57 / 57**, **57 / 57**; baseline 79f5540 **57 / 57** (`qa-run-ui-convergence-*`). The
    suite drives `demos/demo-run.html`; the engine / scenario / report code is byte-identical to 79f5540 (V7).
  - `slice-check` pacing (perfect-bot win 231 s, floor 240 s) — the known unseeded live-random flake (BLOOM-033 REPORT). Re-runs 3× each:
    branch 241 / 246 / 256 s, baseline 260 / 243 / 247 s, all PASS (`qa-slice-check-rerun-branch-vs-baseline.txt`).
- Key suites in the run: single-app-flow 59 / 59 · portable-runtime 71 / 71 · release-check 50 / 50 · guided-training 50 / 50 ·
  main-menu 17 / 17 · plant-rooms 66 / 66 · planet-view 80 / 80 · terraform 61 / 61 · production-plant 50 / 50 · run-ui 40 / 40.

## What the new suite proves

- **One token system** (V1–V3): 68 gameplay tokens now read from the theme resolve to exactly their 79f5540 values; every host loads it first.
- **Gameplay unchanged** (G1, both browsers): the same run on this tree and on a served 79f5540 tree — Planet View + banner **1127**
  elements, report **153**, training coach **19** + its run HUD **74**: every computed colour / background / border / radius / font / size /
  weight / spacing / shadow / fill / stroke identical; Adapt room **1174** elements identical on colours, typeface, weight, fill, stroke.
- **Repaired** (G2): on 79f5540 the rooms' mini-map card measured **28 px** (container-type:size from the menu's `.mm` rule, Palatino, menu
  cream ink, room em 19.5 px); now **649 px** with its 280 px map, the gameplay font and ink, room em 15.7 px — BLOOM-032C's room.
  Compare `before-79f5540/07-adapt-1440x900.jpg` with `07-adapt-minimap-repaired-1440x900.png`.
- **Paintings** (V7, T2): the twelve backgrounds byte-identical; the title text over every one ≥ 5.2 : 1 through the card's least opaque stop
  (01 5.46 · 02 5.48 · 03 5.35 · 04 5.44 · 05 5.34 · 06 5.36 · 07 5.66 · 08 5.27 · 09 5.20 · 10 5.38 · 11 5.60 · 12 5.26).
- **Contrast** (V6): night text tokens ≥ 5.6 : 1 on every night surface; night ink ≥ 14.7 : 1; focus ring ≥ 7.9 : 1.
- **Layout** (L): no horizontal scroll at 390×844, 1024×768, 1280×720, 1440×900, 1920×1080, 2560×1440; Begin expedition visible and
  unobscured at every desktop size (it was cut off at 1024×768 on 79f5540 — `before-79f5540/05-focus-1024x768.jpg`).
- **Accessibility**: keyboard arrows + the 3 px night focus ring; reduced motion (instant entrances, no hover travel); status always icon + word.
- **file://** offline: the restyled title and survey from the portable runtime.

## Stills

| File | |
|---|---|
| `01-title-{390x844,1024x768,1280x720,1440x900,1920x1080,2560x1440}.jpg` | the title / menu |
| `02-settings-1440x900.jpg`, `02-credits-1440x900.jpg`, `03-recommend-1440x900.jpg` | dialogs (first-run recommendation untrained) |
| `04-survey-*.png`, `05-focus-*.png` | the Destination Survey and a world's dossier at the six sizes (04 at 1440 hovers a world) |
| `06-run-unchanged`, `07-adapt-minimap-repaired`, `09-report-unchanged`, `10-training-unchanged` (1440×900) | gameplay |
| `08-title-keyboard-focus-1440x900.jpg` | keyboard focus on TRAINING |
| `11-firefox-title-2560x1440.jpg`, `12-firefox-focus-2560x1440.png` | Firefox at the owner's display size |
| `paintings/title-painting-01…12.jpg` | the new title over each of the twelve paintings (1280×720) |
| `before-79f5540/*` | the same views on 79f5540, for side-by-side review |

## Review corrections (PMO conditional acceptance, Part A)

| SHA | |
|---|---|
| `978b862` | corrections — planning-button contrast ≥ 4.5 : 1 (planning-only button tokens; gameplay colours unchanged); Extreme carries the severe-warning hazard sign (the blocked cross stays on Hostile ground); dossier rows separate the primary descriptor from secondary facts (presentation only; survey data unchanged); portable runtime regenerated |
| `3e613ff` | QA — visual-system-check: computed contrast of every planning button in four states (minimum 5.61 : 1), Extreme semantics, two-part rows, 1024 × 768 Begin expedition in view (46 → 54 checks) |
| `0db235c` | docs — VISUAL_SYSTEM_v1 / DESTINATION_SURVEY_v1 record the three corrections |

- **visual-system-check 54 / 54** (Chromium 147 + Firefox 148) with `--evidence` on `0db235c` — every screenshot in this folder was
  re-captured on the corrected tree (`qa-visual-system-check.log`); new `05b-focus-extreme-1440x900.png` shows an Extreme dossier
  (hazard sign, two-part rows).
- **Full regression on `0db235c`: 36 suites · 1669 passed · 0 failed** (`qa-full-regression-review-corrections.txt`). The run was
  interrupted once by a session end during `procedural-run-check` after 20 green suites; it was resumed from that suite on the same clean
  tree. Neither earlier flake recurred (run-ui-convergence 57 / 57, slice-check 15 / 15).

## Known issues / notes for review

- The PMO implementation brief referenced by the directive was not available to this session; the work follows
  PRODUCT_DIRECTION_CURRENT §9 and the locked decisions. Screenshot resolutions were chosen as listed above.
- On a phone-width survey (390 px) the stacked dossier scrolls with the page, so Begin expedition is reached by scrolling (as before).
- At 2560×1440 the dossier keeps its 500 px maximum width (as before) — it reads small on a 5K display; a size-scaled dossier is a
  possible follow-up, not changed here.
- "(~5 min)": the system rounded font draws a low, flat tilde at 15 px; the word is unchanged.
- White labels on the leaf / sky buttons are 3.4 : 1 / 3.5 : 1 — the gameplay pairing (Resume / Plant / Terraform), kept for convergence.
