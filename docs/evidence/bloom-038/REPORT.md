# BLOOM-038 — Automated design audit · evidence report

**Read-only study.** Base: `main` = `origin/main` = `2590d7926c9bb0a4570b2a29fe1884281dd1a89e` (v1.0.1 closeout, verified before
starting). Branch `agent/bloom-038-design-audit` → review branch `handoff/bloom-038-design-audit`.

The findings, severities and recommendations are in [`docs/DESIGN_AUDIT_v1.md`](../../DESIGN_AUDIT_v1.md). This file records **what was
run, how to reproduce it, and what each evidence file holds**.

## 1. Scope guard

- **No production file changed.** `git diff 2590d79 --stat` lists only `docs/DESIGN_AUDIT_v1.md`, `docs/evidence/bloom-038/**` and
  `tools/research/design-audit/**`. Nothing under `index.html`, `content/`, `planets/`, `resources/`, `demos/`, `dist/` or the existing
  `tools/*.js` was touched.
- **No temporary instrumentation in the runtime.** All observation is external:
  - Node imports the shipped classic scripts and ES modules unchanged;
  - Playwright reads the DOM and calls the existing developer hooks (`MENU_DEV`, `BLOOM_API`, `BLOOM_RUN_UI.adapter`);
  - an init script wraps the map canvas's `fillText` in the *test page only*, to read label positions.
- **Seed banks untouched.** `content/challenge-seed-banks.js` is loaded and its worlds rebuilt with the runtime's own
  `buildBankWorld` (fingerprint-verified); it is not rebuilt.

## 2. Reproduce

Node 20 with the global Playwright (`NODE_PATH="$(npm root -g)"`), from the repository root. Simulation scratch files go to
`$BLOOM038_SCRATCH` (default `.design-audit-scratch/`, never committed).

```sh
D=tools/research/design-audit
export BLOOM038_SCRATCH=/tmp/bloom038   # any scratch folder
# simulation study (≈ 13 min on 12 workers)
node $D/study.mjs worlds --per-archetype 20 --workers 12   # 60 validated Expedition sample worlds (= study-worlds.json)
node $D/study.mjs runs --seeds 2 --entries 10 --workers 12 # 4,424 policy runs → rows.jsonl
node $D/readout.mjs                                        # readout honesty
node $D/analyze.mjs                                        # pacing / strategy / species / challenge JSON
node $D/escape.mjs 60                                      # Native Competition stand-off escape probe (≈ 25 min)
node $D/merge-failure.mjs                                  # failure-state-audit.json
# browser evidence (Chromium, ≈ 50 min in total)
NODE_PATH="$(npm root -g)" node $D/atlas.js && NODE_PATH="$(npm root -g)" node $D/atlas-run1024.js \
  && NODE_PATH="$(npm root -g)" node $D/atlas-2560.js && NODE_PATH="$(npm root -g)" node $D/contact-sheet.js
for s in affordance copy-density pause-audit failure-ui; do NODE_PATH="$(npm root -g)" node $D/$s.js; done
```

**Determinism.**

- Policy runs use seeded rngs (sim: `mulberry32(runSeed)`; policy: an FNV-derived stream). Three recorded runs (two Expedition, one
  Native Competition) were re-run in-process and matched their stored rows bit for bit.
- Worlds are regenerated from (archetype, seed, attempt) and fingerprint-checked.
- Browser scenes use fixed harness seeds and Challenge launch seeds.
- **Exception:** the Destination Survey's own Expedition planets (E1, run1024) are drawn per page load.

## 3. Method notes

### Policies

`runner.mjs` header documents the information model.

| Policy | Behaviour |
|---|---|
| balanced | best visible gain per Biomass, avoids a third same-board buy in a row |
| adapt-first | prefers Adapt answers |
| spread-first | buys Spread first |
| terraform-first | prefers Terraform answers |
| greedy | buys the largest visible gain affordable now, never saves |
| low-planning | random pick among helpful buys, slow to react, few bubbles clicked |
| colony | balanced + Leaves focus on the origin + a Leaf Canopy local upgrade |

- **Shared signals.** Every policy values:
  - the preview's opened land that connects to a colony;
  - preview-opened land not yet connected (×0.4);
  - progress on blocked frontier land ("closer, still blocked");
  - reach across water (Waterborne Seeds);
  - frontier speed (Seed Output / Early Maturity).
- **Competition Challenges.** Policies also read "the native plants are better suited…" and the preview's "suits native plants less /
  more"; careful policies follow the "Roots thicken a young colony" hint.
- **Careful policies** (all but greedy and low-planning) accept a visible loss of living land only for at least twice the gain, and
  avoid a Terraform the climate preview says "sets off a shock".

**Calibration history** (recorded so the PMO can judge the policies). The first run (`rows-v1`, kept in scratch only) refused any
purchase that closes a living region and ignored unconnected preview gains. It stalled on 9 % of Expedition runs, which proved to be
policy myopia: the proven answer on desert 72675 was Drought, which opens 36 % but closes two living regions, and on frozen 89462 the
origin's only exit needs Cold ×2. The final policies take visible net-positive trades and preview gains, as a reading player would;
Expedition stalls fell to 3.5 %. The Native Competition stand-off survived every revision.

### Other definitions

- **"Solved"** (endgame proxy): growable + reachable land ≥ 72 % of the land from that 10-s sample to the end of the run.
- **Readout honesty:** every region of every sample world × playable species at landing, and the 478 balanced runs' end states
  (their purchases replayed with unlimited Biomass, Dying World pressure set to the run's end time).

## 4. Results in one screen

(full tables in `DESIGN_AUDIT_v1.md` §5–§14)

| Measure | Result |
|---|---|
| Expedition Bloom | median 264 s (p90 475); 5 purchases; 96.5 % of bot runs Bloom |
| First meaningful decision / first purchase | 28 s / 40 s |
| Share of run saving for the next purchase | 89 % |
| Endgame tail after "solved" | Expedition 61 s (24 %); Ocean 123 s (33 %, 29 % of runs flagged) |
| Native Competition | 53 % Bloom · 45 % stand-off at a median 57 % coverage; 34 / 39 stand-offs broken by one Terraform |
| Volatile Climate | 0 shocks for 5 of 7 policies; curve ≈ Dying World ≈ Expedition |
| Dying World | Bloom at a median 77 % of the decline; 0 extinctions |
| Thin Air | win at exactly the decline end (290 s); 77 % hold a median 75 s |
| Species | between-species sequence similarity 0.39–0.56 vs 0.81 within; blind classifier 46 % (chance 25 %) |
| Dominant strategy | none overall; archetype sets the opening; terraform-first +49 % slower, 14.6 % stalls |
| Readout at landing | "No offered upgrade opens it" on 37 % of land, 13 % of which a 2-step named answer opens; 26 % multi-factor |
| Pause | rooms pause; banner / Map View / menu do not (6.2 s per inspection); hidden tab catches up in one burst |
| No-save | Expedition median 4.4 min at 1× (p90 8): minor |

## 5. Files

| File | Contents |
|---|---|
| `pacing-study.json` (2.9 MB) | method, pacing by mode / species / archetype / policy / survey class / Challenge, endgame cleanup, no-save durations, a compact row per run (purchases with time + kind, coverage every 10 s) |
| `strategy-study.json` | per policy: win rate, time vs the cell's best, Biomass spent, boards, openings; trait / tier ownership in wins; Terraform usefulness; colony layer |
| `species-comparison.json` | per-species profiles on the 59 equivalent worlds, pairwise similarity, the within-species noise floor, blind classifier |
| `challenge-comparison.json` | per-Challenge profiles (action mix, curves, pressure / competition / climate / completion), all pairs, the focus pairs |
| `failure-state-audit.json` | the 19 UI failure states (q1–q5 answers), readout honesty, outcomes, timeout causes, extinctions, native takeover, stand-off escape probe |
| `failure-ui.json` + `failure-ui/` | full per-state UI captures (banner text, condition boxes, Would-help, card, log, report); 7 of the 20 screenshots retained |
| `affordance-audit.json` + `affordance/` | 28-screen inventory: interactive vs look-alike elements, hit tests, hover changes, target sizes, map click sampling; 6 of the 31 screenshots retained |
| `copy-density.json` | words per screen, longest prose, repeats within and across screens, internal-language hits, pre-run concepts |
| `pause-audit.json` | speeds, what pauses, inspection cost, scenario clocks in rooms, frozen-page catch-up |
| `visual-atlas-index.json` + `visual-atlas/` | the index of all 363 captures (route / seed / phase / UI state / viewport / condition tags / purchases and full layout metrics); 2 captures and 8 composite contact grids (`visual-atlas/contact/grid-*.jpg`) retained |
| `run1024.json` | the two complete 1024 × 768 runs: per-action timeline, reachability, clicks, panels (the 35 screenshots are not retained) |
| `surplus2560.json` + `visual-atlas/2560/` | the 2560 traversal with 1440 / 1920 growth curves; 3 of the 16 screenshots retained |
| `study-worlds.json` | the 60 Expedition sample worlds (seed, accepted attempt, fingerprint, per-species class / playability, physical summary) |

**Screenshot encoding.** For repository size, all PNGs were re-saved as 256-colour palette PNGs (pixel art: visually unchanged) and the
JPEGs (2560 gameplay, large planning screens) at quality 55. The scripts write full-quality originals when re-run.

**Compact evidence set (production history).** The full study generated about 56 MB of evidence: 363 visual-atlas captures, the two
1024 runs' 35 stills, the 16-still 2560 traversal, 51 failure / affordance stills and HTML contact sheets that link every capture. That
full set was reviewed on the accepted research branch (`handoff/bloom-038-design-audit` `6212044`). The raw captures are regenerable:
the browser commands in §2 recreate every one of them, and the JSON indexes above still describe each capture's scene, seed and
geometry. **Production history intentionally keeps only the compact set (about 11 MB):** every JSON summary, the tooling, 8 composite
contact grids and 18 representative stills chosen for the top findings:

| Finding | Retained stills |
|---|---|
| P1-1 Native Competition stand-off / ✓ on native-held ground | `failure-ui/native_takeover.png`, `affordance/run-native_competition.png`, `visual-atlas/C2-mid--selected-native--1024x768.png`, `visual-atlas/C5-landing--selected-native--1024x768.png` |
| P1-2 readout at landing | `failure-ui/temp_cold.png`, `failure-ui/multi_factor.png`, `failure-ui/water_dry.png`, `failure-ui/hazard_toxicity.png`, `failure-ui/refuge.png`, `affordance/selected-region.png` |
| copy (Thin Air card titled "Dying World") | `failure-ui/thin_air_holding.png` |
| unaffordable nodes, Terraform preview | `affordance/room-adapt.png`, `affordance/room-terraform.png` |
| Training coach over the banner | `affordance/training-coach.png` |
| label pills over neighbours / water | `affordance/map-ocean_archipelago-28.png` |
| 2560 composition | `visual-atlas/2560/2560-07-run-selected-blocked.jpg`, `2560-09-room-region.jpg`, `2560-11-room-spread.jpg` |

Contact grids retained: `grid-selected-1024`, `grid-rooms-1024`, `grid-rooms-2560`, `grid-training`, `grid-overlays`, `grid-reports`,
`grid-planning-390`, `grid-planning-2560` (the two base-map grids and the HTML contact pages, whose links pointed at the raw captures,
are not retained; `contact-sheet.js` rebuilds all of them after the atlas scripts run).

## 6. Limits of this evidence

- **The policies are heuristics.** Win rates and stall rates describe readers of the screen, not humans (`DESIGN_AUDIT_v1.md` §15).
- **The Challenge sample is the first 10 entries of each bank cell.** The Native Competition and Oasis Line samples are
  desert-heavy, and the Dying World / Organic Hybrid sample has no ocean world.
- **The browser evidence is Chromium only.** Firefox / WebKit were not re-run (no rendering change is under study).
- **Not captured:**
  - a pH-only soil block (none in 84 probed worlds);
  - the Training coach beyond its first three states;
  - Native Competition at 45 % in the atlas (the scripted player plateaued at 30 %, consistent with the stand-off finding).
- **Not verified in the browser:** whether the production Terraform room shows "suits native plants less / more" before purchase (the
  preview text contains it).
