# BLOOM-037 — Final hardening & release — report

**Status: CANDIDATE** on `handoff/bloom-037-review` — 9 commits ahead of production `main` `3cc3e33`, 0 behind (a fast-forward).
Not merged. Product frozen: no feature, Challenge, species, progression, audio or save work. Canonical inventory of what ships:
[`docs/RELEASE_STATE_v1.md`](../../RELEASE_STATE_v1.md).

| | |
|---|---|
| Starting `main` | `3cc3e33` (BLOOM-036 closeout; 036D1 integrated at `3b4d3a7`) |
| Review head | the tip of `handoff/bloom-037-review` (the commit carrying this report) |
| Implementation commits | `26cbb83` dead-path cleanup · `d7296be` stale code comments · `060c1e8` a11y fixes · `496bef7` globe role → Destination Survey · `563594b` globe role → Terraform room + Challenge dossier |
| Docs / evidence commits | `32f22ea` documentation reconciliation + RELEASE_STATE · `39e43e5` RELEASE_STATE base · `8f4c5de` QA driver · the final commit: this report + evidence |

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

No gameplay, rule, content, bank or layout defect was found. Behaviour for pointer players is unchanged by B1–B4.

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

Driver: [`qa-037.js`](qa-037.js) on the production `index.html` only. Matrix (Chromium 19 / 19, Firefox 19 / 19, WebKit 18 / 18 — every check passed; logs and JSON in [`results/`](results/)):

| | Chromium 147.0.7727 | Firefox 148.0.2 | WebKit 18.0 (mac12 build) |
|---|---|---|---|
| O · http `/`, Pages `/bloom/`, `file://` (full product) | 3 / 3 | 3 / 3 | 3 / 3 |
| S · gameplay smoke matrix | 8 / 8 | 8 / 8 | 7 / 7 (S4 skipped) |
| A · accessibility (20 screens) | A1–A5 ✓ (+ A4b known contrast) | A1–A5 ✓ (+ A4b known contrast) | A1–A5 ✓ (+ A4b known contrast) |
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

20 screens (first-run dialog, Main Menu, Settings, Credits, Species Selection, species dossier, Destination Survey, survey focus, run map,
region banner, Region Inspect, Adapt, Spread, Terraform, run menu, report, Challenge hub, Challenge dossier, Training coach, Skip-training
dialog), in Chromium, Firefox and WebKit:

- **A1** every visible control has an accessible name · **A2** keyboard-only Tab walk: every stop on-screen with a visible focus indicator
  (outline, ring, or a designed descendant / sibling indicator — the survey's halo + name colour, the Terraform globe's ring); dialogs trap focus ·
  **A3** Escape / Back: Species → menu, survey focus → survey, dossier → hub → menu, every room → map, run menu and Settings / Credits close; the
  report deliberately ignores Escape (a win is not silently resumed, a loss not dismissed into a dead run) · **A4** axe-core 4.10 (WCAG 2.1 A/AA):
  no critical violation and no serious violation other than colour contrast · **A5** reduced motion.
- **KNOWN — colour contrast (not fixed, PMO decision).** Six text / background pairs from the locked BLOOM-033 / 034 visual-system tokens are
  below WCAG AA 4.5 : 1 for small text: muted `#8a937f` on the light surfaces (2.7–3.1 : 1 — HUD group captions "Explore / Change", run id,
  report fact notes, hints), white on the leaf button `#3f9d4b` (3.4 : 1 — Resume / Keep playing), gold-deep `#a86f00` labels (3.8–4.2 : 1 —
  "Origin", room kicker). Fixing them recolours shared tokens that `visual-system-check` pins to their accepted values — a visual decision, so it is
  recorded, not made. Suggested if approved (ratios computed): faint ink `#646c5b` (≥ 4.65 : 1 on all three surfaces), leaf button `#2f7d3a` (white 5.1 : 1),
  gold-deep `#8a5a00` (≥ 5.3 : 1).
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

**Final head — 45 / 45 suites pass, 2052 checks, 0 failures** (≈ 90 min; per-suite counts and times in [`regression-final.tsv`](regression-final.tsv)):

archetype 40 · atmosphere-transition 14 · body-plan 15 · candle2-contract 15 · challenge-completion 71 · challenge-world 108 · challenges 33 · colony-development 68 · crossing 14 · cylinder-gen 35 · desert 64 · destination-survey 18 · dying-world 63 · economy 39 · frozen 70 · game-flow 48 · gen 47 · guided-training 50 · main-menu 18 · native-competition 66 · organic-hybrid-art-intake 45 · planet-view 80 · plant-rooms 66 · plant-sprite-pipeline 59 · portable-runtime 71 · procedural-run 32 · production-plant-integration 50 · release 53 · run-ui 40 · run-ui-convergence 57 · sim 32 · single-app-flow 59 · slice 15 · species-art-intake 16 · species 17 · species-selection 68 · specimen-environment 15 · sphere-texture 14 · strategy 35 · surface 11 · terraform 61 · topology 53 · training 75 · visual-system 54 · volatile-climate 78.

**The first full run** (on `39e43e5`, before the last two fixes) had three failing suites, each resolved as follows — no bound was loosened:

- `terraform-check` **N3 — a real 037 regression, fixed.** PlanetSphereView is byte-pinned against `2d0fb08` in the working tree (frozen since
  029D); 037's first a11y fix had edited it. The fix moved to the globe hosts (`496bef7`, `563594b`); PlanetSphereView is byte-identical to `main`.
- `dying-world-check` **#40 — pre-existing stochastic, not reproducible.** The legacy-harness run draws on `Math.random`; in that run the Bloom came
  (297 s) before the strategy's last purchase (Salt Handling), so "every plan item bought" was false. Isolated re-runs: 037 2 / 2 pass, clean
  `main` 1 / 1 pass, and the final full run passed. Same class as the documented `slice-check` pacing debt.
- `production-plant-integration-check` — **the Firefox `file://` loss report's 15 s wait timed out once; not reproducible** (037 2 / 2, `main`
  1 / 1, and the final full run, all pass).

`slice-check`'s known stochastic pacing bound passed in both full runs (not loosened).

## 9. Performance sanity

Chromium, median of 3, the same flow on both roots (title → Species → survey → run → Adapt / Terraform → report → three Challenge dossiers),
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

- **GitHub Pages is LIVE** at <https://interstellarharvest.github.io/bloom/> — the repository's Pages source is still the **legacy "Deploy from a
  branch" (`main`, `/`)**. Every push to `main` therefore runs two deployments: GitHub's legacy build (publishes the *whole* repository —
  docs, tools, evidence, demos) and the repository's workflow (`pages.yml` → `build-pages-site.mjs`, the curated game-only site). They race,
  and the legacy one is what is live: after the `3cc3e33` push (two deployments, 11:37 and 11:38 UTC) the site still serves `/tools/package.json`
  and `/docs/…` (not in the curated site). The game works either way: a live smoke on the current
  site (title 1.3 s, the hub, a Low Tide launch, one host, no console error) and byte-identical assets.
- **Remaining one-time owner action (outside code):** GitHub → **Settings → Pages → Build and deployment → Source: GitHub Actions**. After it,
  each push to `main` publishes only the curated site. Not done here (repository settings are an owner action).
- On fast-forwarding `main` to this candidate, the push deploys it (whichever source is set).

## 12. Known limitations (release-facing)

As RELEASE_STATE §9: no saved runs / Continue · no audio · no separate difficulty setting · no progression or rewards · Challenge rule changes
cost an offline bank rebuild (~70 min) · gameplay needs ≥ 1024 px (no phone layout) · small secondary text below WCAG AA contrast (token
decision pending) · Safari untested (WebKit proxy only).

## 13. Release blockers

**None in the code.** Everything frozen for the release is implemented, reproducible and green (45 / 45 suites; three browsers).

Outside the code, before / at release:

1. **Owner action — Pages source:** Settings → Pages → Source: **GitHub Actions** (§11). Not a blocker for the game working (the legacy source
   serves it), but until it is set the whole repository is public on the Pages site and two deployments race on every push.
2. **PMO decision — colour contrast** (§6): accept the six sub-AA secondary-text pairs as a known limitation for v1, or approve a token change
   (a small follow-up with `visual-system-check` pins updated).
3. **PMO confirmation — screens / browsers:** gameplay ≥ 1024 px (no phone run UI) and Safari untested (WebKit proxy only) are stated in README
   and RELEASE_STATE as limitations, not support claims.
