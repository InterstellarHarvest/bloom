# BLOOM-033 — Single-document production application · evidence

**Branch** `agent/bloom-033-single-document-app` · **start** `f5623d771b1956a2ba7ed3592a62fd20c460afe5` (main, BLOOM-032C) ·
**implementation** `f5971d0` · **QA** `ba10542` · **docs** `ae77b55` · **evidence** = the commit carrying this file.
Architecture: [`docs/SINGLE_DOCUMENT_APP_v1.md`](../../SINGLE_DOCUMENT_APP_v1.md) · current direction:
[`docs/PRODUCT_DIRECTION_CURRENT.md`](../../PRODUCT_DIRECTION_CURRENT.md). Not merged; awaiting PMO review.

## What changed

| | |
|---|---|
| **One document** | `index.html` is the only player-facing document: title → Training / Destination Survey → DRAMATIC departure → gameplay → rooms → report → Play Again / Choose Another Planet / Main Menu / every training exit, all mounted and disposed in place. No iframe, popup, second tab or hidden document. |
| **GameSession** | `resources/run/game-session.js` — the run that lived in `demos/demo-run.html`'s inert `<script id="bloomUI">`, moved as code into `BLOOM.gameSession.create(run, { host, onAction, shell })` with `ready` and `dispose()`. |
| **AppController** | `resources/app/app-controller.js` — TITLE · SURVEY · RUN; Training is a run configuration; the training layer loads on the first TRAINING only. |
| **Exact planet** | `detail.planet` → `BLOOM.gameSession.expeditionRun(detail).planet` → `BLOOM.createSim` — the same object; Play Again = a fresh session on that object. |
| **Handoff removed** | `resources/expedition/expedition-handoff.js`, `expedition-arrival.js`, `resources/main-menu/main-menu-page.js`, `ExpeditionEntry.leaveTo` and `tools/expedition-handoff-check.js` deleted; the portable runtime carries no window.name transport; the impossible "lives only in this tab" copy is gone. |
| **Harness** | `demos/demo-run.html` 1750 → ~610 lines: query parsing + `BLOOM.gameSession.create`; the engineering shell is a `<template>` instantiated only for `?ui=legacy` (and the harness's own failure screens); its former page bindings are bridged onto `window` for the oracle suites. |
| **Lifecycle** | the Planet View, rooms, report, plant specimens and run UI adapter release every document / window listener, observer and specimen on dispose (several runs per document now). |
| **default** | the no-challenge scenario id is `default` (was `eden`); one marked legacy alias at the resolver; bit-identical. |
| **Survey axis** | Favorable / Precarious / Extreme (ids `favorable` / `precarious` / `extreme`); same thresholds, columns, worlds. |
| **Small cleanups** | title button EXPEDITION; survey kicker "Strange Bloom" over "Destination Survey"; the Spread room explains an absent Reach category ("No Reach upgrades on this world: there is no water gap your seeds would need to cross."). |
| **Pages** | the static site is `index.html` + `content/` + `planets/` + `resources/` only. Enabling Pages remains the owner's one-time repository setting. |

Files added: `resources/app/app-controller.js`, `resources/run/game-session.js`, `tools/single-app-flow-check.js`,
`docs/SINGLE_DOCUMENT_APP_v1.md`, `docs/PRODUCT_DIRECTION_CURRENT.md`. Files removed: `resources/expedition/expedition-handoff.js`,
`resources/expedition/expedition-arrival.js`, `resources/main-menu/main-menu-page.js`, `tools/expedition-handoff-check.js`.

## Proofs (`single-app-proof.json`, `qa-single-app-flow-check.log`: 59 / 59, Chromium 147.0.7727.15 + Firefox 148.0.2)

- **Exact planet identity.** In both browsers the GameSession's planet `===` the survey cell's `detail.planet`; `JSON` equal;
  `planetFingerprint` recomputed in Node from the session planet = the survey's = the departure's (Chromium `fa52ae16cffb0711`, Firefox
  `7a28839dec43d478`); render hints the same object; the canonical surface built from it; Play Again and a second world the same.
- **Nothing generated after the selection.** `generateFromArchetype`, `generatePlanet`, `attemptPlanet`, `searchWorld`, `runSearch`: 0
  calls; no Worker constructed. (portable-runtime-check / release-check additionally arm a guard that makes every one of them THROW from
  Begin Expedition on: none thrown, one `createSim` per session.)
- **One document.** One main-frame navigation for the whole flow title → survey → run → report → Play Again → Choose Another Planet →
  second run → Main Menu → Training (Restart · Skip · Main Menu · Begin Expedition); the address never changed; the only HTML request is
  `/`; `demos/demo-run.html` never requested (page or server log); no `expedition=` / token; window.name `""` before and after; storage
  holds only `strange-bloom.training` and the last painting.
- **Storage blocked** (localStorage and sessionStorage throw on access): the exact planet starts and Play Again keeps it (both browsers).
- **file://** (double-clicked `index.html`, browser context OFFLINE): the portable runtime boots the same app; exact planet, Play Again,
  Main Menu; one load; no network request (both browsers).
- **HTTP `/`** and **HTTP `/bloom/`** (the Pages artifact): the pathname stays `/` resp. `/bloom/`; every `/bloom/` request inside
  `/bloom/` (both browsers).
- **No shell in the production DOM:** no `#shellHeader`, `#shop`, `#inspect`, `#cv`, `#reportModal`, no `body > header/main/footer`.
- **default ≡ old Eden, bit for bit.** The f5623d7 engine + content and this branch's, side by side in Node: First Bloom, Training
  Grounds and generated Ocean 13 / Desert 25 / Frozen 22 (the generated worlds JSON-identical) under old none · old `eden` · new none ·
  new `default` · new legacy alias `eden` — the same state hash every 250 ticks through a scripted 3000-tick game; only the label changed
  (`eden/Eden` → `default/Default`); layer P EDEN → DEFAULT with the same verdict.
- **Survey class rename.** `favorable:Favorable:0.35 · precarious:Precarious:0.2 · extreme:Extreme:0`; a 401-point habitable sweep
  classifies identically to f5623d7's Stable / Volatile / Extreme; no stable / volatile class id left in the survey's code or styles.
- **Portable build.** fingerprint `8addfc541e99c646f29444f1a537b90c37fc67a41cb21f4cad00729b67e9eba0` · `strange-bloom.portable.js` 1,266,802 B
  sha256 `f06b5251bd4a…` · esbuild 0.28.2 · two clean in-memory builds byte-identical and equal to `dist/portable/`.

## Stills

`01-title.png` (EXPEDITION · TRAINING · SETTINGS · CREDITS) · `02-survey.png` (Favorable / Precarious / Extreme) · `03-world-focus.png` ·
`04-departure-covered.png` (full cover, the run not yet built) · `05-run-same-document.png` (the run at `/`, the production Planet View) ·
`06-adapt.png` (Organic Hybrid) · `07-terraform.png` (the real sphere) · `08-report.png` (reached through the suites' QA win shortcut,
hence 2 % coverage) · `09-back-to-survey.png` (a fresh sector) · `10-training.png` (lesson 1 of 13). Chromium, 1440 × 900.

## Full regression

**35 suites · 1,614 passed · 1 missed** — every `tools/*-check.js`, sequential, on `ae77b55` (product code `f5971d0`), Chromium
147.0.7727.15 + Firefox 148.0.2 wherever a suite has browsers (`qa-full-regression-summary.txt`). Every suite green except:

- **slice-check** "pacing: perfect-bot win in 4–8 min" — 230 s against a 240 s floor. The suite does not seed `Math.random` (live bonus
  bubbles), so the win time varies. Re-run on an idle machine: branch 255 / 244 / 249 s, baseline f5623d7 246 / 260 / 255 s — all PASS.
  **Classified: live-random flake** in neither tree (the margin above 240 s is thin; seeding it is a candidate for later hardening).

Counts that changed on purpose: `training-check` 75 (baseline 83) — per browser and motion setting the two back-forward-cache checks
B5c / B5g guarded page departures that no longer exist; their "never left black" guarantee is now "one document load across every
title ↔ training crossing" (B5f). `release-check` 50 (R60's child is now single-app-flow-check). `single-app-flow-check` 59 is new;
`expedition-handoff-check` (32) is retired. Selected suites: release 50 / 50 · portable-runtime 71 / 71 (with guided-training --file) ·
guided-training 50 / 50 · run-ui-convergence 57 / 57 · planet-view 80 / 80 · plant-rooms 66 / 66 · terraform 61 / 61 ·
production-plant-integration 50 / 50 · game-flow 48 / 48 · colony-development 68 / 68.

## Notes for the PMO

- **Suites migrated, not weakened.** Assertions that described the retired two-document flow (navigations to `demo-run.html`, the
  session handoff, ROOT `?begin=1` return URLs, back-forward-cache restores, the hidden shell's legacy anchor copies) now assert the
  in-app equivalents, mostly stronger (one document; no shell at all). BLOOM-029/030/031/032 source / scope guarantees stay bound to their
  own commit ranges (the existing END_SHA pattern). `release-check`'s R60 child is now `single-app-flow-check`.
- **colony-development [31]** failed 2 / 2 on the branch and passed 2 / 2 on baseline — investigated, not waved off: the crossing
  animation code is byte-identical (moved); the suite's burst-colour window overlaps young seedling stands, and which crossing pair a run
  yields depends on how many real-time ticks pass before the suite's first pause (baseline 13, branch 2 at load + 300 ms), so the branch
  measured an arrival beside seedlings. [31] now classifies only the pixels the animation changes (foothold 41 vs arrival 9). Its old
  informational "pale-ripple" count turned out to measure the background (0 once differenced; never asserted).
- **Observation (pre-existing, unchanged):** the same sector holds the same nine worlds, but their row order inside a column can vary
  between visits; selection identity is unaffected.
- **Not done (out of scope):** species, Challenges, BLOOM-034 restyling, Pages enablement (the owner's repository setting).
