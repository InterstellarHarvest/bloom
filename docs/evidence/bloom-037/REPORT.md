# BLOOM-037 — Final hardening & release — report

**Status: RELEASE CANDIDATE (PMO-corrected)** on `handoff/bloom-037-review` — 12 commits ahead of production `main` `3cc3e33`, 0 behind (a
fast-forward). Product frozen: no feature, Challenge, species, progression, audio or save work. Canonical inventory of what ships:
[`docs/RELEASE_STATE_v1.md`](../../RELEASE_STATE_v1.md).

| | |
|---|---|
| Starting `main` | `3cc3e33` (BLOOM-036 closeout; 036D1 integrated at `3b4d3a7`) |
| Review head | the tip of `handoff/bloom-037-review` (the commit carrying this report) |
| Implementation commits | `26cbb83` dead-path cleanup · `d7296be` stale code comments · `060c1e8` a11y fixes · `496bef7` globe role → Destination Survey · `563594b` globe role → Terraform room + Challenge dossier · **`feb47b0` WCAG AA contrast fix (PMO release blocker)** |
| Docs / evidence commits | `32f22ea` documentation reconciliation + RELEASE_STATE · `39e43e5` RELEASE_STATE base · `8f4c5de` QA driver · `d9fe2b4` first report · `50bb6f6` docs: contrast fixed, PMO locks, Pages source · the final commit: this report + evidence |

**PMO final release review (2026-10-13): hardening ACCEPTED, with one release-blocking correction — the six sub-WCAG-AA colour-contrast
pairs — now FIXED (§1 B5, §6).** Locked decisions: gameplay ≥ 1024 px is an accepted v1 limitation (no phone gameplay UI); Safari itself stays
untested / not claimed (the Playwright WebKit pass is supporting evidence only). The final QA (§4, §8) ran on the corrected head `50bb6f6`; the
final commit adds only this report and evidence files.

**Reconciliation note.** 037 began on the 036D1 candidate `e64d0c4` while 036D1 was still under PMO revision (owner-approved). When 036D1 was
integrated (`main` → `3cc3e33`), the 037 commits were rebased onto `3cc3e33`; the only conflicts were the two docs the 036 closeout also edited
(`main`'s statuses kept, 037's corrections re-applied). The pre-rebase stack is preserved locally as `salvage/bloom-037-pre-rebase-d6373fa` and
`salvage/bloom-037-pre-reconcile-060c1e8` (not pushed). All QA below ran on the rebased branch.

---

## 1. Bugs found and fixed

| # | Defect | Fix | Proof |
|---|---|---|---|
| B1 | **Run report not keyboard-scrollable.** `#rrScroll` (facts, debrief, specimen) held no focusable element and the report's focus trap cycles only focusables: on a short window a keyboard player could not reach the report's lower content. | `#rrScroll` is a focusable named region ("Run details") inside the trap; inset focus ring. | axe `scrollable-region-focusable` cleared; A2 Tab walk |
| B2 | **Challenge Planet Dossier body not keyboard-scrollable** in browsers that do not make scrollers focusable (WebKit). | `.cw-d-main` focusable named region ("Challenge details"). | axe, A2 in WebKit |
| B3 | **Planet map canvas had no accessible name** (`role="application"` with only a roledescription + description). | `aria-label="Planet map"`. | A1 |
| B4 | **Interactive globes' labels never announced:** PlanetSphereView labels the focusable host, but the hosts (`<span>` / `<div>`, no role) made the label prohibited (axe `aria-prohibited-attr`, serious) — Destination Survey focus, Terraform room, Challenge dossier. | Each host gives its labelled globe `role="img"` while interactive (removed when the label goes). PlanetSphereView itself untouched (byte-frozen since 029D; see §8 — a first fix inside it was caught by `terraform-check` N3 and moved). | A4 in all three browsers |
| B5 | **Text below WCAG AA 4.5 : 1** (PMO: release blocker). Small secondary text in faint ink `#8a937f` (2.7–3.2 : 1) and gold-deep `#a86f00` (3.8–4.2 : 1) on the light gameplay surfaces; a white word on the gameplay leaf button `#3f9d4b` (3.4 : 1 — Keep playing, Resume) — and, found by a static scan of every white-on-colour gameplay rule, the same pattern on the "would help" Plant / Spread / Planet buttons (banner + Region Inspect, 3.4–3.5 : 1) and the Adapt preview's part chip on Temperature / Water (3.5–3.7 : 1). | Narrow and text / button-scoped (§6): TEXT-only shades `--bloom-ink-faint-text #646c5b`, `--bloom-gold-deep-text #8a5a00` on the `color:` uses only; gameplay button ladders `--bloom-{leaf,bloom,sky}-btn` (rest on the hue's dark shade, rimmed with the hue, pointer one step deeper — the BLOOM-034 planning-button rule; leaf / sky reuse its exact values); the part chip on the category's dark shade. `--bloom-leaf` and every semantic hue unchanged. | A4 0 serious incl. contrast · A7 rendered ratios · visual-system V6b + G1 |


No gameplay, rule, content, bank or layout defect was found. Behaviour for pointer players is unchanged by B1–B5 (B5 changes colour shades only).

## 2. Cleanup performed

**Dead production code removed** (each proven: zero references in `resources/`, `content/`, `demos/`, `tools/`, `docs/`, including dynamic name
construction): `challenge-world.js` `inArrival()` (leftover of 036B's retired live world search) · `challenge-bank.js` `instanceProvenance` (never
imported) · CSS `.pv-tip` (planet-view.css), `.env-svg` (decision-rooms.css; its emitter left in 164eef3), `.ch-d-short` (challenge-hub.css).
**Stale code comments** corrected in `index.html`, `app-controller.js`, `title-boot.js` (menu without CHALLENGES, flow without Choose Plant
Species, "Challenge survey", "~100 KB" bank). The portable bundle was rebuilt after each change.

**Documentation reconciliation** — new [`RELEASE_STATE_v1.md`](../../RELEASE_STATE_v1.md); README (player sections for species and Challenges,
live Pages URL, honest browser line, ≥ 1024 px gameplay, limitations); PRODUCT_DIRECTION_CURRENT (six Challenges, released prescribed species /
starting state, prevalidated — not "generated" — Challenge planets, bank format 2, Pages truth, 037 roadmap row); DEVELOPMENT_NOTES (current status
block replacing the BLOOM-030 "needs HTTP" status, 16 missing suites listed, bank rebuild time, scenario ids, **86 broken root-relative links
repaired**); CHALLENGES_SYSTEM (per-Challenge versions, released prescribed species, per-Challenge hub rows); VISUAL_SYSTEM menu; SCENARIOS;
GAME_BIBLE header. Ten milestone-era docs got a one-line **"Current state (BLOOM-037)"** note (PRODUCTION_PLANT_INTEGRATION — Terraform shows the
plant, dynamic environment; SINGLE_DOCUMENT_APP; MAIN_MENU; SPECIES_SYSTEM; DESTINATION_SURVEY; GUIDED_TRAINING; GAMEPLAY_UI_CONVERGENCE;
PORTABLE_RUNTIME — eight bundled modules, Pages; VISUAL_DIRECTION; PLANT_SPRITE_PIPELINE; RELEASE_CANDIDATE). Historical bodies and evidence
untouched.

**One test pin updated narrowly:** `single-app-flow-check` S11 required GAME_BIBLE's header to read exactly "Current status (2026-10-10, BLOOM-033)";
it now accepts any dated BLOOM-033-or-later status header (the header was re-dated). Nothing else in any suite changed.

## 3. Intentionally retained (KEEP / DEFER)

| Item | Class | Why |
|---|---|---|
| `demos/demo-run.html`, `demos/main-menu.html`, the demos/*.html QA pages, `resources/bloom-play-worker.js` | KEEP | developer harness + ~26 suites drive it |
| proof species packs (`art/plant/packs/proof*`, `make-proof-packs.mjs`) | KEEP | body-plan / candle2 / intake checks + history |
| `art/plant/intake/**`, body plans, contracts, schemas, grammars, atlas manifest, `portable-entry.js`, Three.js LICENSE | KEEP | build inputs / provenance / licence |
| `resources/plant-sprite-lab/*` (incl. the retired 029C SVG specimen) | KEEP | QA lab + deliberate reference |
| `demos/ui-mockups/shared.js`, `c18.*` | KEEP | four suites read them from the working tree |
| **proof packs embedded in the production atlas** (`plant-atlas.js`, ~426 KB of 792 KB pack data loaded by every run) | DEFER | the biggest payload saving, but needs a production / QA atlas split in `build-plant-art` — a design change, not a deletion |
| `planet-texture.js` `WATER_DEFAULT` (unused export) | DEFER | `planet-view-check` N6 pins the module's export list |
| `speciesFlow === false` branches, the survey worker's untyped "whole column" message | DEFER | unreachable in production but pinned by `species-selection-check` / `release-check` / `main-menu-check` |
| `content/play.js` retired launcher copy, stale comments in `content/challenges.js` | DEFER | `content/` is the bank-provenance domain and scope-pinned; not worth a provenance question at release |
| `demos/ui-mockups/concept-*` design history (~1.2 MB) | DEFER | linked by many docs; no runtime role |
| Pages ships unreachable build files (grammars, atlas manifest, lab, play worker; ~290 KB) | DEFER | harmless; changing the site list is a hosting change |

No tracked junk (`.DS_Store`, backups, `.orig`, scratch logs) exists.

## 4. Browsers

Driver: [`qa-037.js`](qa-037.js) on the production `index.html` only, on the corrected head `50bb6f6`. Matrix (Chromium 20 / 20, Firefox 20 / 20, WebKit 19 / 19 — every check passed; logs and JSON in [`results/`](results/)):

| | Chromium 147.0.7727 | Firefox 148.0.2 | WebKit 18.0 (mac12 build) |
|---|---|---|---|
| O · http `/`, Pages `/bloom/`, `file://` (full product) | 3 / 3 | 3 / 3 | 3 / 3 |
| S · gameplay smoke matrix | 8 / 8 | 8 / 8 | 7 / 7 (S4 skipped) |
| A · accessibility (23 screens) | A1–A7 ✓ — axe 0 critical / 0 serious incl. contrast | A1–A7 ✓ | A1–A7 ✓ |
| R · responsive (17 screens × 4 sizes) | 68 samples, 0 problems (+ R1b known) | 68 samples, 0 problems (+ R1b known) | 68 samples, 0 problems (+ R1b known) |

**WebKit / Safari.** WebKit = Playwright's frozen `webkit_mac12_special-2009` build (WebKit 18.0; Playwright 1.46.1 client on macOS 12 — the only
WebKit Playwright still runs on this machine). It is a **proxy, not Safari**: real Safari 17.6 was not driven (remote automation is off). Two
Playwright-WebKit artefacts were found and worked around in the driver (not game defects): WebKit refuses a raw `&` in a `file://` path (the
encoded URL — what a double-click produces — boots), and its offline emulation blocks `file:` loads too (so `file://` runs online in WebKit and
locality is proven from the request list: every request `file:`). In real Safari Tab moves between buttons only with Option-Tab or "Press Tab to
highlight each item" — the WebKit Tab walk stands for that setting. **Safari is not claimed as supported**; README says it is untested but
the engine runs the game.

## 5. Offline, subpath and portable

- `file://` (portable runtime, Chromium + Firefox with the network **off**), `http /`, and the Pages site under `/bloom/`: the complete product —
  EXPEDITION (species → survey → run), CHALLENGES (Low Tide dossier → run), TRAINING — one document, every request local, no console error (O).
  `portable-runtime-check` (71/71) adds the clean-copy rebuild proofs and the Pages subpath return paths.
- Static scan of every production file and the bundle: no remote URL (the one `http` string is a citation inside Three.js), no `localhost`, no
  `@import` / web font / CDN, no `fetch` / XHR / beacon / WebSocket, no source maps.
- **Reproducible builds:** `npm --prefix tools run check:portable` → identical (fingerprint `b8d4eb23981b2860`); `check:plant-art` → identical;
  `node tools/build-challenge-seed-bank.mjs --check` → the shipped bank is exactly the rebuild from the cached candidates
  (sha256 `8506124b…`, format 2, 15 cells, 750 entries).

## 6. Accessibility

23 screens (first-run dialog, Main Menu, Settings, Credits, Species Selection, species dossier, Destination Survey, survey focus, run map,
region banner, **region banner with "would help" buttons**, Region Inspect, **Region Inspect with its help buttons**, Adapt, **an Adapt node
preview (the part chip)**, Spread, Terraform, run menu, report, Challenge hub, Challenge dossier, Training coach, Skip-training dialog), in
Chromium, Firefox and WebKit:

- **A1** every visible control has an accessible name · **A2** keyboard-only Tab walk: every stop on-screen with a visible focus indicator
  (outline, ring, or a designed descendant / sibling indicator — the survey's halo + name colour, the Terraform globe's ring); dialogs trap focus ·
  **A3** Escape / Back: Species → menu, survey focus → survey, dossier → hub → menu, every room → map, run menu and Settings / Credits close; the
  report deliberately ignores Escape (a win is not silently resumed, a loss not dismissed into a dead run) · **A4** axe-core 4.10 (WCAG 2.1 A/AA):
  **0 critical, 0 serious — colour contrast included; no rule suppressed, no exception** · **A5** reduced motion · **A6** the conditional
  white-on-colour controls were really on screen for the scan · **A7** every corrected text pair measured as RENDERED (computed colour on the
  first opaque background; gradients count with their worst stop).

**Colour contrast — FIXED before release (B5).** The pairs, before → after (WCAG AA small text needs 4.5 : 1):

| pair | before | after |
|---|---|---|
| faint text on card `#fffdf7` (HUD captions, run id, room hints / notes) | `#8a937f` 3.15 | `#646c5b` **5.38** |
| faint text on paper `#fbf6ea` (report fact notes, notes) | `#8a937f` 2.97 | `#646c5b` **5.07** |
| faint text on paper-2 `#f4ecd8` (room panels) | `#8a937f` 2.72 | `#646c5b` **4.65** |
| gold-deep text on gold-soft `#fff1c7` ("Origin") | `#a86f00` 3.78 | `#8a5a00` **5.27** |
| gold-deep text on card (room / coach kickers, pressed check) | `#a86f00` 4.18 | `#8a5a00` **5.83** |
| white on the leaf button (Keep playing, Resume, Plant) | `#3f9d4b` 3.42 | `#2a7636` **5.61** (pointer `#215f2b` 7.67) |
| white on the Spread button | `#d9607e` 3.54 | `#a83d5a` **6.03** (pointer `#8c3049` 7.97) |
| white on the Planet (sky) button | `#3b8fd0` 3.49 | `#23679f` **5.98** (pointer `#1b5282`) |
| white on the part chip · Temperature / Water | 3.72 / 3.49 | `#9c3f0e` **6.71** / `#23679f` **5.98** |

**As rendered (A7, identical in Chromium, Firefox and WebKit):** `.pv-tg > small` 5.38 · `.pv-runid` 5.38 · `.rg-o` (Origin) 5.27 ·
`.dr .r-region .rk` 5.83 · `.dr .ow.none` 4.65 · `.dr .li-hint` 4.55 (worst gradient stop) · `.dr .mc-row.faint` 5.38 · `.dr .bank-empty` 5.38 ·
`.rr-fact span` 5.07 · `.rr-chip.ow.none` 5.07 · `.tc-kicker` 5.83 · `#rrContinue` / `.rr-btn.primary` 5.61 · `.dr .rb.resume` 5.61 ·
`.pv-btn.plant` 5.61 · `.dr .hbtn` 5.61 · `.dr .li-part` 6.71. (This planet offered only a Plant "would help" button; the Spread / Planet
button shades are covered by `visual-system-check` V6b's computed ratios.)

**How it stays narrow:** the base `--bloom-ink-faint` / `--bloom-gold-deep` keep their values for non-text (preview rims, leader dots, icon
strokes, meter / bar fills); only `color:` declarations moved to the text shades; `--bloom-leaf` and every semantic hue are unchanged; planning
screens (night tokens) are untouched. **Proof:** `visual-system-check` G1 compares the computed styles of ~2 400 gameplay elements with the
accepted baseline in Chromium and Firefox — the only differences are the exact 037 colour transitions (run 40, Adapt 40, report 6, coach 1,
training HUD 5), nothing else: no plant art, map state, status chip or planning-screen colour moved. V3 pins the new mappings to their exact
values; the new **V6b** fails if any of these pairs drops below 4.5 : 1, if a use-site loses its accessible shade, or if a gameplay `color:`
falls back to the non-text faint / gold-deep. Before / after stills (same seeded planet, 1440 × 900): [`contrast/`](contrast/) —
`before-*` on `main` `3cc3e33`, `after-*` on the fix (HUD + "would help" banner, Region Inspect, Region Inspect at the origin, Adapt preview,
Terraform, the Bloom report). Hierarchy holds (secondary text still reads secondary), the buttons stay recognisably BLOOM green (rimmed in the
brand green), the part chip keeps its category.
- Colour is never the sole meaning (status chips carry a word and an icon: OK / Strained / Blocked / Refuge); icons always pair with text.

## 7. Responsive

17 screens at 390 × 844, 1024 × 768, 1440 × 900, 2560 × 1440, Chromium + Firefox (+ WebKit): main menu, Settings, Species Selection (4 cards),
species dossier, survey, survey focus, Challenge hub (6 cards), Low Tide dossier (prescribed start), Oasis Line dossier, Oasis Line run map,
the Refuge region banner, Adapt, Spread, Terraform, the Thin Air HUD, the Thin Air extinction report, Training. Checks: no horizontal overflow;
every visible control scrolled into view and hit-testable (not covered); dialogs inside the viewport; specimens inside their frames.

- **R1 (supported matrix):** planning screens at all four sizes, gameplay screens at 1024 / 1440 / 2560 — 0 problems in Chromium, Firefox and WebKit (17 screens, 68 samples each).
- **R1b — KNOWN LIMITATION:** gameplay at 390 × 844 — the run UI has **no phone layout** (designed and QA'd from 1024 px since BLOOM-029): the HUD's
  speed / menu buttons are covered by the tool row, room specimens are clipped, a Spread node is covered. Recorded, not "fixed": a phone run UI
  would be new design work. RELEASE_STATE §8 / README state "gameplay needs ≥ 1024 px; the menus also work on a phone".

Stills: `shots/` (36 representative PNGs; `<browser>-r-<screen>-<width>.png`, `<browser>-s*`).

## 8. Full regression

Every `tools/*-check.js`, sequentially, on the quiet machine.

**Release head `50bb6f6` (the contrast fix + docs) — 45 / 45 suites pass, 2053 checks, 0 failures, no flake** (≈ 90 min; per-suite
counts and times in [`regression-final.tsv`](regression-final.tsv)):

archetype 40 · atmosphere-transition 14 · body-plan 15 · candle2-contract 15 · challenge-completion 71 · challenge-world 108 · challenges 33 · colony-development 68 · crossing 14 · cylinder-gen 35 · desert 64 · destination-survey 18 · dying-world 63 · economy 39 · frozen 70 · game-flow 48 · gen 47 · guided-training 50 · main-menu 18 · native-competition 66 · organic-hybrid-art-intake 45 · planet-view 80 · plant-rooms 66 · plant-sprite-pipeline 59 · portable-runtime 71 · procedural-run 32 · production-plant-integration 50 · release 53 · run-ui 40 · run-ui-convergence 57 · sim 32 · single-app-flow 59 · slice 15 · species-art-intake 16 · species 17 · species-selection 68 · specimen-environment 15 · sphere-texture 14 · strategy 35 · surface 11 · terraform 61 · topology 53 · training 75 · visual-system 55 · volatile-climate 78.

Before it, on the same day: the PMO's focused list on `50bb6f6` — visual-system 55 · main-menu 18 · run-ui 40 · run-ui-convergence 57 ·
challenge-world 108 · challenge-completion 71 · species-selection 68 · destination-survey 18 · guided-training 50 · portable-runtime 71 ·
release `--no-suites` 51 — all green ([`results/focused-qa.tsv`](results/focused-qa.tsv)); and the first candidate `d9fe2b4`: 45 / 45, 2052 checks.

**The first full run** (on `39e43e5`, before the globe-role fixes) had three failing suites, each resolved as follows — no bound was loosened:

- `terraform-check` **N3 — a real 037 regression, fixed.** PlanetSphereView is byte-pinned against `2d0fb08` in the working tree (frozen since
  029D); 037's first a11y fix had edited it. The fix moved to the globe hosts (`496bef7`, `563594b`); PlanetSphereView is byte-identical to `main`.
- `dying-world-check` **#40 — pre-existing stochastic, not reproducible.** The legacy-harness run draws on `Math.random`; in that run the Bloom came
  (297 s) before the strategy's last purchase (Salt Handling), so "every plan item bought" was false. Isolated re-runs: 037 2 / 2 pass, clean
  `main` 1 / 1 pass, and the final full run passed. Same class as the documented `slice-check` pacing debt.
- `production-plant-integration-check` — **the Firefox `file://` loss report's 15 s wait timed out once; not reproducible** (037 2 / 2, `main`
  1 / 1, and the final full run, all pass).

`slice-check`'s known stochastic pacing bound passed in both full runs (not loosened).

## 9. Performance sanity

Measured on `d9fe2b4` (the contrast fix after it changes colour values only). Chromium, median of 3, the same flow on both roots (title → Species → survey → run → Adapt / Terraform → report → three Challenge dossiers),
measured `main` → 037 → `main` back to back:

| wait (ms) | `main` 3cc3e33 (a) | **037** | `main` 3cc3e33 (b) |
|---|---|---|---|
| title ready | 346 | **216** | 320 |
| Main Menu → Species Selection | 1645 | **1641** | 1683 |
| Species → survey shown | 1122 | **1153** | 1247 |
| … first world validated | 1534 | **1347** | 1742 |
| … all nine worlds | 2035 | **1771** | 2200 |
| Begin Expedition → run (descent) | 3903 | **3875** | 3930 |
| open Adapt room | 377 | **374** | 373 |
| close Adapt | 415 | **383** | 386 |
| open Terraform room | 435 | **418** | 437 |
| report open | 321 | **291** | 322 |
| Main Menu → Challenge hub | 677 | **706** | 685 |
| Dying World → dossier (via Species) | 1004 | **915** | 955 |
| Low Tide → dossier | 908 | **925** | 891 |
| Oasis Line → dossier | 891 | **920** | 890 |
| workers started (session) | 33 | **33** | 33 |
| long tasks · longest · total ms | 33 · 270 · 3200 | **29 · 280 · 3272** | 30 · 278 · 3399 |
| requests | 671 | **671** | 671 |

**No regression:** every 037 timing is inside the spread of the two `main` runs or within a few ms of both (the survey's world validation varies run
to run — `main` alone 1534–1742 ms to the first world, 2035–2200 ms to all nine). Worker / long-task / request
counts are identical on both roots: 33 survey workers over the whole session (the sector pool's per-job workers, prefetch included; unchanged
since the accepted milestones), the longest task ≈ 0.28 s, 671 requests. The only repeated URLs are each survey worker importing the engine
scripts (one copy per worker, by design); no main-thread asset loads twice. Challenge launches use the prevalidated bank — no proof runs in the
browser (`challenge-world-check` B7). Raw runs: [`results/`](results/).

## 10. Gameplay smoke matrix (S)

| | Chromium | Firefox | WebKit |
|---|---|---|---|
| S1 · EXPEDITION launches with each species | 4 / 4 species | 2 representative | 2 representative |
| S2 · one COMPLETE Expedition run (Organic Hybrid, its own witness plan, no win shortcut; won at 70 %) → Bloom report (Keep playing · Play Again · Choose Another Planet · Main Menu) → Play Again (same planet object, fresh run) → Choose Another Planet → Change Species → Cinder Rosette survey → Main Menu | ✓ | ✓ | ✓ |
| S3 · all six Challenge cards (content order) launch their own run; Low Tide / Oasis Line / Thin Air skip Choose Plant Species with their prescribed plant, the other three use it; Retry Challenge; Challenges (Oasis Line: Main Menu) | ✓ | ✓ | ✓ |
| S3a · Low Tide lands with Flood Adaptation + Salt Handling, said in the dossier | ✓ | ✓ | ✓ |
| S3b · Oasis Line: Reed Spire, native vegetation on the map, the origin chip reads Refuge exactly when the landing-refuge rule protects it | ✓ | ✓ | ✓ |
| S3c · Thin Air gated with its HUD condition line; the others ungated | ✓ | ✓ | ✓ |
| S4 · Thin Air end to end (Woolly Candle, own plan): the final atmosphere arrived at 63 % → "Final atmosphere reached · regain Bloom: 63 % / 70 %", not won → won exactly when 70 % was regained → FINAL ATMOSPHERE ✓ report (Keep playing · Retry Challenge · Challenges · Main Menu) | ✓ | ✓ | — (long driven run) |
| S5 · TRAINING (Organic Hybrid, Training Grounds) → Restart → Skip (confirmed, recorded) → TRAINING → completion → Begin Expedition → Choose Plant Species | ✓ | ✓ | ✓ |

The deep paths are also covered by the regression: the full 13-lesson guided Training (`guided-training-check`), Thin Air's deterministic early
Bloom → dip → final atmosphere → regain → win sequence (`challenge-completion-check` T1–T7), every Challenge end to end with Retry / Challenges / Main
Menu (`challenge-world-check` F), every Expedition return path (`single-app-flow-check`).

## 11. Release / hosting readiness

- **Pages source: GitHub Actions — DONE by the owner.** The Pages API reports `build_type: "workflow"` (the legacy "Deploy from a branch" source
  is no longer active). Only the repository's workflow publishes: `.github/workflows/pages.yml` → `tools/build-pages-site.mjs` →
  `index.html` + `content/` + `planets/` + `resources/` (no tools, docs, evidence or demos).
- *History:* the 037 audit found the legacy source still active — each push to `main` ran GitHub's legacy build (the whole repository) and the
  workflow, racing; after the `3cc3e33` push the site still served `/tools/package.json` and `/docs/…`.
- Release = fast-forward `main` to the accepted head; the push runs the workflow; the live site is then verified (the closeout records it).

## 12. Known limitations (release-facing)

As RELEASE_STATE §9: no saved runs / Continue · no audio · no separate difficulty setting · no progression or rewards · Challenge rule changes
cost an offline bank rebuild (~70 min) · gameplay needs ≥ 1024 px (no phone layout — PMO-accepted) · Safari itself untested (WebKit proxy
evidence only — PMO-locked). Colour contrast is **not** a limitation: the issues found by 037 were fixed before release.

## 13. Release blockers

**None.** The PMO's release blocker (colour contrast) is fixed; the Pages source is GitHub Actions; the release head passes 45 / 45 suites and the
three-browser matrix. Integration (fast-forward `main`, push, live verification) and the closeout follow.
