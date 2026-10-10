# Strange Bloom — the single-document application (BLOOM-033)

**Status:** IMPLEMENTED on branch `agent/bloom-033-single-document-app` (awaiting PMO review). Current product direction:
[`PRODUCT_DIRECTION_CURRENT.md`](PRODUCT_DIRECTION_CURRENT.md).

## 1. The rule

`index.html` is the **only** player-facing document. Everything a player does happens inside it, mounted and disposed in place:

```
TITLE ──EXPEDITION──▶ SURVEY ──Begin Expedition (DRAMATIC)──▶ RUN ──▶ report
  ▲  ╲                  ▲                                     │  │
  │   ╲TRAINING──▶ RUN (training) ──Begin Expedition──────────┘  │
  │                     │                                         │
  └──── Main Menu ◀─────┴────── Choose Another Planet ◀───────────┘
                         Play Again = a fresh RUN on the same planet object
```

No iframe, popup, second tab, hidden document or embedded copy of another page. The address never changes during play (development
query parameters stay as they were typed). A reload returns to the title: runs are not saved (no save / resume in this milestone).

`demos/demo-run.html` is a **developer harness** only. Production never navigates to it or loads it; the GitHub Pages site does not even
ship it.

## 2. The pieces

| File | Role |
|---|---|
| `index.html` | thin document: the stylesheets, `<div id="app">`, `resources/main-menu/title-boot.js` |
| `resources/main-menu/title-boot.js` | loads the engine / content classic scripts, mounts the app, then loads the run's classic scripts in the background (`BLOOM_TITLE_BOOT.runReady`) |
| `resources/app/app-controller.js` | `AppController`: the three screens TITLE · SURVEY · RUN and every transition between them; `mountApp()` reads the development query parameters; `window.BLOOM_APP` / `window.MENU_DEV` for QA |
| `resources/main-menu/expedition-entry.js` | the title + survey hosts, the one black fade, the survey's DRAMATIC departure, the first-sector prefetch; `leave()` / `enterRun()` / `resume({ to })` / `fadeBlack()` for the app |
| `resources/run/game-session.js` | `BLOOM.gameSession.create(run, { host, onAction, shell })`: ONE run — the sim, its production run UI (Planet View, rooms, report), its loop, its `bloom:*` events — and `dispose()` |
| `resources/training/training-run.js` | `mountTraining(session, { fader, onAction })`: the training layer (arrival lift, guided coach, the Skip confirmation, the training record) over a training session |

### 2.1 GameSession

The run that lived in `demos/demo-run.html`'s inert `<script id="bloomUI">` (BLOOM-002 … BLOOM-032C) moved **as code** into
`BLOOM.gameSession.create`: the same sim wiring, read rules, copy, actions, `bloom:*` dispatch sites, report truth
(`winReport` / `lossReport`) and run UI adapter host. What changed is only its container (a function per run instead of a page per run)
and its lifecycle:

- `session.ready` resolves after `bloom:run-ready`, the production surface's first paint (capped at 4 s) and two more frames.
- `session.dispose()` stops the loop, disposes the Planet View (and with it the rooms, the Terraform globe's WebGL context and the
  gameplay transition), the report, the plant specimens and the adapter, releases every document / window listener and observer, and
  withdraws `window.BLOOM_RUN`, `window.BLOOM_RUN_UI` and `window.BLOOM_API`. One live session per document (`BLOOM.gameSession.instance`).
- The engineering shell (header HUD, inspect / shop sidebars, canvas, footer, report modal) is **not built** on the production path. Its
  functions keep the run's truth (messages, the report, the read rules the adapter shares) and write DOM only when a harness passes
  `shell: true` (`demos/demo-run.html?ui=legacy`, the historical regression oracle).
- Actions: with `onAction` (the app) every run / report / training action is the app's — Play Again, Choose Another Planet, Main Menu,
  Restart Training, Skip Training, Begin Expedition; leaving a live run still asks first. Without it (the harness) the historical hrefs
  apply.

`BLOOM.gameSession.expeditionRun(detail)` builds an expedition's run descriptor from the Destination Survey's Begin Expedition detail;
`BLOOM.gameSession.trainingRun()` builds the training run (Training Grounds, the derived training config, its seeded random stream).

### 2.2 The exact planet

```
DestinationSurvey detail.planet ──▶ BLOOM.gameSession.expeditionRun(detail).planet ──▶ BLOOM.createSim(planet, …)
```

The selected object itself. Nothing on this path serializes it, stores it (no sessionStorage, localStorage or window.name), puts it in the
URL, regenerates it, searches for it, re-validates it or opens another document. Play Again creates a fresh session on the **same
object**. `planetFingerprint` (survey-data.js) is computed once, at the departure, for QA and provenance. The World Seed and attempt are
provenance only. The scenario is `default` (no challenge modifier). The retired two-document handoff
(`resources/expedition/expedition-handoff.js`, `expedition-arrival.js`, the page composer `main-menu-page.js`; BLOOM-029F / 030 / 031) is
deleted; `docs/EXPEDITION_HANDOFF_v1.md` remains as history.

### 2.3 Transitions (unchanged animation)

- title ↔ survey, run exits, training: the title's one black fade (`black-fade.js`, 220 / 250 ms, reduced 80 / 80 ms), never re-faded
  from clear when it is already up;
- survey → run: the survey's DRAMATIC AtmosphereTransition; the run is created and painted **under its full cover**, then the clouds part
  over it;
- rooms and the report inside a run: the SUBDUED gameplay transition, as before.

## 3. The developer harness

`demos/demo-run.html` reads developer query parameters, builds a run descriptor and calls the same `BLOOM.gameSession.create`:

| Query | Run |
|---|---|
| *(none)* · `planet=<id>` | an authored world (First Bloom by default) |
| `archetype=<id>&seed=<n>` | the production generator for that public seed (an explicit failure, never a substitute) |
| `scenario=default` · `scenario=<id>` | the default scenario (also: no parameter) or Dying World / Native Competition / Volatile Climate (layer P) |
| `play=1` | player wording; with `archetype=` and no seed: the bounded World Seed search |
| `training=1` | the training run (its exits navigate to the root title) |
| `ui=legacy` | the historical engineering shell, instantiated from the page's `<template>` |
| `candidates=` · `avoid=` | QA hooks of the player search |

The run's former page-level bindings (`sim`, `selected`, `draw`, `renderInspect` …) are installed on `window` from `session.debug` so the
historical oracle suites keep reading and driving them by name — in the harness only. A stale `expedition=` link is an explicit
"retired" failure.

## 4. Portable runtime and Pages

The double-clicked `index.html` (file://) runs the same app from the generated portable runtime (`dist/portable/`; its module list now
starts with `resources/app/app-controller.js`). Nothing has to survive a document navigation any more, so the window.name transport is
gone. The static Pages site (`tools/build-pages-site.mjs`) is `index.html` + `content/` + `planets/` + `resources/`. Enabling Pages is a
one-time repository setting (Settings → Pages → Source: GitHub Actions), not product code.

## 5. QA

`tools/single-app-flow-check.js` (Chromium + Firefox) proves the one-document flow end to end — exact planet identity (object, JSON,
fingerprint, render hints, canonical surface), zero generator / search / attempt calls and no worker after the selection, no navigation,
no `demo-run.html` request, no token, window.name untouched, storage blocked, file:// offline, HTTP `/`, HTTP `/bloom/`, reduced motion,
keyboard, every training path — and the Node guarantees (the thin harness, default ≡ old Eden bit-for-bit, the survey class rename, the
portable rebuild, the Pages site). It replaces the retired `tools/expedition-handoff-check.js`.
