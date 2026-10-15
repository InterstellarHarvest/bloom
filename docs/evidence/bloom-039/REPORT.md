# BLOOM-039 — Pre-playtest clarity & UX · evidence report

**Presentation / shell only.** Base: production `main` = `origin/main` = **`8b23e78`** (the compact BLOOM-038 record, itself on
`2590d79`). Branch `agent/bloom-039-pre-playtest-ux` → review branch `handoff/bloom-039-review` → **PMO ACCEPTED, released: `main` = `c1b5171`** (§10).

The brief is the PMO's BLOOM-039 directive plus the owner's additions (region panel flips around the region; one application width).
The findings it answers are in [`../../DESIGN_AUDIT_v1.md`](../../DESIGN_AUDIT_v1.md) (BLOOM-038).

## 0. Part A — compact BLOOM-038 closeout

| | |
|---|---|
| Commit | `8b23e78` "BLOOM-038: compact design-audit research record (accepted 6212044)", fast-forwarded onto `main` and pushed |
| Content | `docs/DESIGN_AUDIT_v1.md`, `docs/evidence/bloom-038/REPORT.md` (+ a "Compact evidence set" note in §5), `tools/research/design-audit/**`, the 13 study JSON files, 8 composite contact grids, 18 representative stills — 59 files, about 11 MB |
| Not added | the ~56 MB raw visual atlas (363 captures, run1024 / 2560 / failure / affordance stills, HTML contact pages) — regenerable by the scripts |
| Scope | no production file changed (`git diff 2590d79 8b23e78` lists only the three research paths) |
| Branches | remote `handoff/bloom-038-design-audit` and `agent/bloom-038-design-audit` deleted after the record was verified on `origin/main`; the 038 worktree removed; the LOCAL branch `agent/bloom-038-design-audit` (`6212044`, the full atlas) kept as a local-only copy |

## 1. What changed (Part B)

| # | Area | Change | Files |
|---|---|---|---|
| 1 | Native Competition | banner names the competition reason (the page's `compReason`: the same branch its `compWhy` explains) and WHO holds the ground (a "Native-held 82 %" chip in the native stands' purple, separate from the OK / Strained suitability pill); every competition branch has its own line, so ground with native cover never reads "Nothing holding the plant back"; native-held regions carry the map's hatched native mark instead of ✓ (labels and room chips); the Terraform room's preview shows **Your plant** and **Natives** rows and "Suits natives less / more N: …" before purchase (the page's existing native-shift lists, now carried by the preview data); a **FRONT STALLED** card cue with a "Preview Terraform" button | `run-ui-adapter.js`, `game-session.js`, `planet-view.js/.css`, `run-map-renderer.js`, `decision-rooms.js/.css` |
| 2 | Readout honesty | ONE aggregate status (Refuge · Blocked · Strained · OK) from the engine's own grow rule (`fitness > grow.growThresh`); conditions carry their own status (blocked = it alone stops growth); multi-step "Would help" (`adapter.advice`: fewest legal steps on one track, real cumulative prices, Biomass still missing; at most two routes, the strongest only at ≤ 1100 px); "X helps; Y would still block this region"; "Toxicity is lethal here. No current adaptation removes it." | `game-session.js` (`stepsWhatIf`, `applyStep`), `run-ui-adapter.js`, `planet-view.js`, `decision-rooms.js` |
| 3 | Hidden tab / sleep | the run advances on visible wall-clock time only: `visibilitychange` restarts the frame clock; a frame's dt is clamped to 250 ms; a gap > 2 s counts as no time | `game-session.js` (frame loop) |
| 4 | Copy | landing line "Pick a growth focus for this colony in Regions — or leave it Balanced — and watch it establish." (the developer shell keeps its own); a Challenge's card is titled by the Challenge ("Thin Air" · "Dying World pressure"); one severity vocabulary — hazard / soil boxes name the physical condition (Toxic, Radioactive, Salty, Acidic), statuses are OK / Strained / Blocked / Refuge; an unaffordable legal node says "Need N more" at rest, in a price's gold (not Blocked's crimson; a blocked node keeps its lock) | `game-session.js`, `planet-view.js`, `decision-rooms.js/.css` |
| 5 | Banner placement | bottom-centre by default; when the bottom placement would cover > 15 % of the selected region's REAL tiles (renderer geometry), the banner moves to the top of the map under the HUD (clear of the scenario card); decided once per selection and per stage size (never per frame); the Training coach keeps the visible banner clear (its own lesson target first) | `planet-view.js/.css`, `training-coach.js` |
| 6 | Label clicks | a click inside a region-name pill selects the region the pill names when the tile under the pointer is another region / water / the frame; over its own region it is an ordinary map click (exact canonical tile, unchanged event) | `run-map-renderer.js` (`labelAt`), `planet-view.js` |
| 7 | Draggable globes | **no change needed**: the three interactive yaw globes already set `cursor: grab` and `grabbing` during a drag (PlanetSphereView); BLOOM-038's affordance heuristic flagged them because it looked for a `pointer` cursor. The non-interactive survey-grid globes restore their cursor. Verified in the browser (§6) | — |
| 8 | Application width | one shared contract: `--bloom-app-max: 1920px`, every screen root (species, survey, Challenge hub / dossier, the run with HUD, map, banner, rooms and report) capped and centred; passive wells in the app's own dark space colour; the title painting stays full-bleed (its menu plaque sits inside the capped composition); the black fade stays full-bleed | `main-menu.css` |
| 10 | Docs | pause truth: the four rooms ALREADY pause; whether the banner / Map View / run menu should pause is a human-playtest question | `PRODUCT_DIRECTION_CURRENT.md`, `RELEASE_STATE_v1.md` |
| — | a11y (pre-existing) | at ≤ 1100 px the rooms' Back / Resume labels were `display:none` (icon-only buttons with no name: axe `button-name`, critical); now visually hidden but named | `decision-rooms.css` |

**Not changed** (scope guard, verified): `resources/bloom-sim.js`, `content/`, `planets/`, the generator, validator, witness,
species, scenarios, Challenges, seed banks, prices, thresholds, the 70 % target. `git diff 8b23e78 -- resources/bloom-sim.js content planets`
is empty; `challenge-world-check` A13 (engine byte-identity) and B4 (bank determinism) pass. No bank rebuild.

**Engine-faithful what-ifs.** The multi-step advice is the engine's own `previewOf` method taken further along one track: apply the trait
(the engine's `applyTrait`, effect for effect), read `evaluate()`, restore genome / sky / Terraform counts. It lives in the run host
(`game-session.js`) because the engine source must stay byte-identical. Nothing is bought; Biomass, climate forcing and run state are
untouched.

## 2. Native Competition clarity (`reaudit/native-competition.json`)

| Measure | BEFORE (main) | AFTER |
|---|---|---|
| Regions where natives hold back ground the plant could grow on (4 worlds) — banner says "Nothing holding the plant back" | **20 / 21** | **0 / 23** |
| — banner names the competition reason | 0 / 21 | 22 / 23 (the 23rd shows its environmental status: the engine's competition branch still reads "your plant cannot grow" while its vigor lags) |
| Native-held region's map label | ✓ (suitability) | the hatched native mark |
| Terraform room shows the native shift before purchase | no (the lists existed only in the footer text) | every sky node: **Your plant** + **Natives** rows; Warm / Dry list "Suits natives less" (e.g. Dry: "Less suited to the natives in Gold Dunes 1: the front can tip your way") |
| FRONT STALLED cue | none | coverage stopped progressing at game second 96 → cue at **224 s** (≈ 128 game s later, 16 s sampling); 3 s of paused wall time added **0** |
| Cue clears after progress | — | a real purchase (Dry the Sky ×2) on the stalled front: native cover 52 % → 42 %, coverage 11.6 % → 13.3 %, cue **cleared** at game second 336 |

Detector: Native Competition active; below the Bloom target; at least one region the plant can grow on (grow rule) where the natives
lead (`side native`) with native cover; no progress of +1 point of land or −1 point of native cover for 120 game seconds (sim time:
pauses and rooms never count). Presentation only.

## 3. Readout honesty (`reaudit/readout-honesty.json`)

The REAL banner of every non-origin region of the 60 BLOOM-038 sample worlds × each playable species at landing (an in-page session
per world from `attemptPlanet` + `expeditionRun`), scored against the engine. Shares are % of non-origin land area.

| Measure | BEFORE | AFTER |
|---|---|---|
| "Blocked" on ground the plant grows on | **3.37 %** | **0 %** |
| "No offered upgrade opens it right now" | 42.0 % | 0.23 % (truthful: no track opens it within 4 steps) |
| … while the hinted answer opens it in ≥ 2 steps (BLOOM-038's 13.1 %) | **14.15 %** | **0 %** |
| … while ANY offered track opens it within 4 steps | 14.15 % | 0 % |
| Multi-step route shown ("Cold Tolerance ×2 · 410 Biomass total · need 300 more") | 0 | 29.0 % |
| "X helps; Y would still block this region" | 0 | 22.2 % |
| Lethal toxicity named as having no cure | 0 of 2.87 % | **2.87 of 2.87 %** |
| "Opens it" claims re-verified by an independent what-if | 1,714 (one-step) · 0 false | **2,643 · 0 false** |
| Banners using hazard severity words (stressful / dangerous / lethal) | 791 | **0** |
| Status words in the banner | OK / Strained / Blocked (+ the four-word mix) | OK / Strained / Blocked only (Refuge on a refuge origin) |

BEFORE reproduces BLOOM-038 (13.1 % multi-step-hidden, 3.1 % blocked-but-growing) on the production UI itself.

**REFUGE semantics.** REFUGE now means exactly "the origin's own ground cannot support growth (grow rule) and the refuge keeps the plant
alive". Example: Oasis Line's Seep Wastes origin (unprotected fitness 0.583 > 0.55) used to read Refuge because one factor sat under 0.72;
it now reads Strained ("Grows here · strained by Water · too dry"). `challenge-world-check` A11 reaches a genuine refuge in play (Dry the
Sky until the origin's own ground cannot grow), checks REFUGE, then Drought Adaptation returns the origin to its ordinary status.

## 4. Hidden tab / laptop sleep (`reaudit/hidden-tab.json`)

| Case (Chromium, tick 160 ms = 6.25 /s at 1×) | BEFORE | AFTER |
|---|---|---|
| hidden 5 s at 1× (synthetic `visibilitychange`) | 31 ticks while hidden (= 5 s replayed) | **0** · 1 tick in the next 250 ms |
| hidden 3 s at 4× | 81 ticks (75 = 3 s replayed) | **5** (the frames just before / after) · 4× kept · running kept |
| paused before hiding | stays paused · 0 ticks | stays paused · 0 ticks · 4× kept |
| a 10-minute animation-frame gap (laptop sleep) | **3,752 ticks** (= 10 min replayed in one frame) | **2** (only the normal frames around the jump) |
| CDP frozen 5 s (BLOOM-038's method) / a real background tab | 34 / 34 | 33 / 33 |

The last row ticks at the ordinary rate BEFORE and AFTER: headless Chromium keeps animation frames running through the CDP frozen state
and reports a background tab as visible. **BLOOM-038's `frozenPage5s` figure therefore measured ordinary running, not a catch-up**; the
defect (and the fix) are shown by the hidden and the frame-gap cases. The browser matrix repeats the hidden case in Firefox and WebKit (§6).

## 5. Composition

### Banner over its region (`reaudit/banner-placement.json`)

Desert 7, Frozen 7, Ocean 28, Desert 7 + Native Competition; per world the upper / middle / lower / bottom-edge / left / right / seam
regions; the share of the selected region's real tiles under the banner.

| Viewport | BEFORE mean · max covered | AFTER mean · max covered | AFTER top placements | HUD overlap | banner inside the stage |
|---|---|---|---|---|---|
| 1024 × 768 | 25.0 % · 99.2 % | **1.5 % · 14.8 %** | 11 / 25 | 0 px | all |
| 1440 × 900 | 24.3 % · 92.8 % | **0.7 % · 8.0 %** | 11 / 25 | 0 px | all |
| 1920 × 1080 | 12.9 % · 75.2 % | 3.0 % · 12.7 % | 4 / 25 | 0 px | all |
| 2560 × 1440 | 4.5 % · 45.6 % | 1.0 % · 12.8 % | 2 / 25 | 0 px | all |

Stability: in all 8 checks the placement stayed exactly the same through 3 s of 4× play. Top placement sits 12 px under the HUD.
Paired stills: `stills/banner-1024-frozen-lower-before.png` (bottom, over the region) / `-after.png` (top, under the HUD).

**Training coach vs banner** (`trainingCoach`): in the Biomass lesson the coach card covered **21.5 %** of the banner at 1024 (13.5 % at
1440) BEFORE; AFTER **0 px** in every lesson measured at both sizes. `guided-training-check` stays 50 / 50 (the coach never covers its
own target).

### Region-name pills (`labelClicks`)

11 points inside a pill whose tile belongs to another region / water (4 worlds, 1024 + 1440): BEFORE the click selected the named region
**0 / 11** times (the tile under it, or deselect); AFTER **11 / 11**. Over its own region a pill click is an ordinary map click (the exact
canonical tile; `planet-view-check` B7 / B29a unchanged).

### Application width (`reaudit/composition.json`)

| Viewport | app width | wells L / R | overflow |
|---|---|---|---|
| 1024 / 1440 / 1920 | full width (unchanged) | 0 / 0 | none |
| 2200 × 1200 | **1920**, centred | 140 / 140 | none |
| 2560 × 1440 | **1920**, centred | 320 / 320 | none |

The run (HUD, map, footer, banner, rooms, report) is one capped box; a click in a well hits no game element; the map keeps one world copy.

**Rooms at 2560 (BEFORE uncapped → AFTER inside the 1920 app):**

| Room | room width | main card | Resume → nodes (edge) | largest blank block |
|---|---|---|---|---|
| Region Inspect | 2560 → 1920 | 1,113 → 819 | — | 1712 × 400 → 1296 × 528 |
| Adapt | 2560 → 1920 | 1,096 → 801 | **1,249 → 745 px** | 1568 × 336 → 1296 × 400 |
| Spread | 2560 → 1920 | 1,096 → 801 | **1,249 → 745 px** | **1168 × 800** (038: 1136 × 832) → 928 × 800 |
| Terraform | 2560 → 1920 | 1,390 → 1,025 | 649 → 547 px | 576 × 416 → 1472 × 240 |

At 1024 / 1440 every room measure is unchanged (Terraform Resume → nodes moves 4–5 px: the shorter unaffordable line).

**Room-specific cap: not added.** Inside the capped app the rooms compose exactly as at 1920 × 1080 horizontally (same card widths, same
Resume → nodes). The blank that remains at 2560 × 1440 is VERTICAL: the tree card is content-height, so a 1,440 px tall window shows more of
the blurred map below it (Spread 928 × 800 vs 928 × 448 at 1920 × 1080). A width cap would not change it; per the owner's rule
(prefer the shared width contract; add a room cap only for remaining internal *stretch*) nothing more is added. Logged for the playtest /
a later layout pass.

**Selected region → banner at 2560:** unchanged by the cap (Heath Flats 1: banner → region centre 681 → 677 px; Would help → region
721 → 729 px). The cap bounds the width, not the height, so the map stays large; the flip handles the cases where the banner would cover
the region.

**Planning screens** (species, survey grid / focus, Challenge hub / dossier): centred in the 1920 app, content-height dossiers unchanged
(`ui-polish-check` P1–P3, 64 / 64).

## 6. Browser QA (`qa/`)

| Check | chromium (91 / 91) | firefox (91 / 91) | webkit (42 / 42) |
|---|---|---|---|
| **W1** title: painting full-bleed, plaque inside the composition | 5 / 5 | 5 / 5 | 2 / 2 |
| **W2** species: app width / wells | 5 / 5 | 5 / 5 | 2 / 2 |
| **W3** survey: app width / wells | 5 / 5 | 5 / 5 | 2 / 2 |
| **W4** run: one capped box, wells inert, one world copy | 5 / 5 | 5 / 5 | 2 / 2 |
| **W5** 4 rooms inside the capped app, Resume reachable | 20 / 20 | 20 / 20 | 8 / 8 |
| **C3** unaffordable nodes say what is missing at rest | 1 / 1 | 1 / 1 | 1 / 1 |
| **E1** app flow: no errors | 5 / 5 | 5 / 5 | 2 / 2 |
| **R1** multi-step Would help with real price | 4 / 4 | 4 / 4 | 2 / 2 |
| **B1** low region → banner top under the HUD | 4 / 4 | 4 / 4 | 2 / 2 |
| **A** axe 0 critical / 0 serious | 13 / 13 | 13 / 13 | 7 / 7 |
| **T1** hidden tab: no ticks, no burst, speed kept | 4 / 4 | 4 / 4 | 2 / 2 |
| **L1** label pill click selects its region | 4 / 4 | 4 / 4 | 2 / 2 |
| **E2** harness: no errors | 4 / 4 | 4 / 4 | 2 / 2 |
| **N1** native-held ground: competition line + ownership + native mark; FRONT STALLED | 4 / 4 | 4 / 4 | 2 / 2 |
| **N2** Terraform preview: Your plant + Natives rows | 4 / 4 | 4 / 4 | 2 / 2 |
| **E3** Native Competition harness: no errors | 4 / 4 | 4 / 4 | 2 / 2 |

Viewports: Chromium and Firefox 1024 × 768 · 1440 × 900 · 1920 × 1080 · 2560 × 1440 · 2200 × 1200 (the width transition: W checks only); WebKit (the BLOOM-037 mac12 WebKit build through its Playwright 1.46 client — a proxy, Safari itself untested as locked in v1) 1440 × 900 · 1024 × 768. All on the final code (`9d95bda`; `6cc1856` changed only the unaffordable line's wording, re-verified by `terraform-check` 61 / 61 and a fit probe: no clipped node line and no node overlap in Adapt / Spread / Terraform at 1024 / 1440 / 1920).

**Globe cursor (§7):** PlanetSphereView sets `cursor: grab` on the interactive survey-focus, Challenge-dossier and Terraform globes and `grabbing` while a drag is held (measured with a real mouse drag in Chromium and Firefox, `tools/probe-grab.js`: survey focus, Challenge dossier and Terraform globe → `grab` at rest, `grabbing` while held, `grab` after); the survey grid's globes keep `pointer` (a click there selects the planet; they do not drag). No change made.

Accessibility: axe-core (the BLOOM-037 build) on every changed state — the blocked banner with multi-step routes, the Native Competition
banner + FRONT STALLED, the Terraform room with the native preview, the expedition run — 33 axe runs across the three engines, **0 critical / serious** findings. (The run found one PRE-EXISTING critical issue before the fix — the rooms' Back / Resume buttons lost their names at ≤ 1100 px — fixed in `99c8bac`.)

## 7. Focused QA and full regression

**Focused suites first** (the run UI, rooms, training, Challenge worlds, visual system, app polish), sequentially:

| Suite | first run | what it caught | after the fix |
|---|---|---|---|
| run-ui · native-competition · run-ui-convergence · training · game-flow | 40 · 66 · 57 · 75 · 48, all green | — | — |
| planet-view | 70 / 80 | B12 / B14 / B16 pinned the old lamp words and the one-step Would help; B7 / B29a: a label over its OWN region re-routed the click (code fixed: a pill overrides only across regions); B8: a low selected region's banner now sits on top, over the clicked tile | **80 / 80** |
| plant-rooms | 62 / 66 | the renderer API gained `labelAt`; condition chips use their own status | **66 / 66** |
| terraform | 59 / 61 → 57 / 61 | the renderer API pin; then the unaffordable line had dropped the node's real price (code fixed: "Need 116 more · 220") | **61 / 61** |
| guided-training | 49 / 50 | G10a at 860 × 700: keeping the banner clear pushed the docked card onto its own target (code fixed: the target outranks the banner) | **50 / 50** |
| challenge-world | 106 / 108 | A11: Oasis Line's origin grows on its own ground (0.583 > 0.55), so it is no longer a REFUGE — pin moved to the grow-rule definition, the refuge state reached in play | **108 / 108** |
| ui-polish | 62 / 64 | P3 at 2560: the survey root kept a 100 % width rule beside the cap (code fixed: the cap sets the width) | **64 / 64** |
| visual-system | 53 / 55 | G1: the one deliberate gameplay colour change (unaffordable node line, crimson → the AA gold-deep text shade) admitted exactly | **55 / 55** |

Every pin change is narrow and named in its commit (`b47f334` and the fixes); no timing bound was loosened.

**Full regression** — every `tools/*-check.js`, sequentially, quiet machine (`run-all.sh`):

**46 / 46 suites green · 2,119 checks · 0 failures · 100 min**, on the code head `b905060` (`regression.tsv`). The suite count is 46, as
before (no suite added: the re-audit and QA drivers live in `tools/` here). No timing bound loosened, no seed bank rebuilt
(`challenge-world-check` B4 rebuild-determinism and A13 engine byte-identity pass; `challenge-completion-check` K6 bank stability passes).
For comparison: v1.0.1's release regression was 46 / 46 · 2,119 checks.


## 8. Evidence files

| File | Contents |
|---|---|
| `reaudit/readout-honesty.json` | BEFORE / AFTER readout totals over the 60 sample worlds (method inline) |
| `reaudit/native-competition.json` | A banner scan · B Terraform preview per node · C stall trace, paused-time check, the clearing purchase |
| `reaudit/hidden-tab.json` | the five timing cases BEFORE / AFTER |
| `reaudit/banner-placement.json` | every sampled selection BEFORE / AFTER, stability, label clicks, Training coach overlap |
| `reaudit/composition.json` | app box, wells, overflow, rooms, selected-region distances at 1024 / 1440 / 1920 / 2200 / 2560 BEFORE / AFTER |
| `qa/*.json` | the browser matrix rows (Chromium, Firefox, WebKit) with axe results |
| `regression.tsv` | the 46-suite run on the final head |
| `stills/` | BEFORE / AFTER pairs: readout multi-step (1024), helps / still blocks (1440), Strained vs Blocked (Palm Rise, desert 18097 / Woolly Candle: fitness 0.70, BEFORE "Blocked · No offered upgrade opens it"), toxicity, native-held banner, label click (+ json), banner flip (1024), Training coach vs banner (1024), 2560 run and Spread room; AFTER only: FRONT STALLED card, Terraform native preview, unaffordable nodes at rest |
| `tools/` | the re-audit and QA drivers (Playwright, `NODE_PATH="$(npm root -g)"`; `BLOOM_BEFORE` = a checkout of the base) |

No atlas: only the stills that show a finding.

## 9. Held for the human playtest (not changed)

Volatile Climate shock threshold / forcing memory / tuning · Dying World decline timing and strength · Thin Air final-atmosphere hold ·
Ocean Archipelago Spread sequence and late pacing · Biomass gain / costs / purchase cadence · the 70 % target · species physiology and
economy · Challenge recipes / seed banks / mechanics · Oasis Line distinctness · Terraform balance · save / continue · whether the
selected-region banner, Map View or the run menu should pause · the vertical surplus inside rooms on very tall windows.

## 10. Release closeout (2026-10-14)

**PMO verdict: ACCEPTED FOR RELEASE.** Design decisions locked: REFUGE semantics and the four aggregate region states, the 1920 px application
width, the selected-region collision placement (> 15 % of the region's real tiles), the Native Competition clarity set, hidden-tab
suspension ([`../../PRODUCT_DIRECTION_CURRENT.md`](../../PRODUCT_DIRECTION_CURRENT.md)).

| Step | Result |
|---|---|
| Integration | `origin/main` = `8b23e78`, review `c1b5171` 7 ahead / 0 behind → `main` fast-forwarded to **`c1b5171`** exactly (no merge commit, squash, rebase, cherry-pick or force push) and pushed; local `main` = `origin/main` = the accepted review head |
| Deployment | GitHub Actions Pages run **38673127447 — success**; the live site serves the BLOOM-039 build (adapter advice, visible-time loop, 1920 contract) |
| Clean-main release QA | run-ui 40 · run-ui-convergence 57 · planet-view 80 · native-competition 66 · challenge-world 108 · guided-training 50 · terraform 61 · ui-polish 64 · portable-runtime 71 · visual-system 55 · release-check --no-suites 51 — **11 / 11 green, 703 checks, 0 failures** |
| Bank unchanged | `content/challenge-seed-banks.js` sha256 `8506124b462cf4d4…` = the 037 release; zero diff `2590d79`..`c1b5171`; `challenge-world-check` B4 (the shipped bank is byte-identical to a deterministic rebuild) and A13 (engine / generator / validator byte-identity) green; engine / content / planets diff empty |
| Live verification (`live/`) | Chromium **21 / 21**, Firefox **21 / 21**: Native Competition native-held ground names the competition with the ownership chip and the native mark (never "Nothing holding"); Terraform preview Your plant / Natives; FRONT STALLED on a passive stalled front (launch 1, game second 193); no growable region says Blocked, strained reads Strained; toxicity no-cure wording; multi-step advice (Dying World launch 1, Ember Playa: "Humidify ×2 · 490 Biomass total · need 389 more", `live-multistep.json`); a low region's panel flips under the HUD (12 px gap), an upper one stays at the bottom; name-pill clicks select their region; a hidden tab replays nothing (0 ticks, 2× kept); 2560: centred 1920 app, 320 / 320 wells, one map copy, no overflow, rooms inside the app; no console error, no failed request |

**Development stopped.** The next phase is HUMAN PLAYTEST; the held questions are listed in `PRODUCT_DIRECTION_CURRENT.md`.
