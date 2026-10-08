# Release Candidate v1 — Strange Bloom · Unknown Soils

**From:** BLOOM-030 · **For:** the Main PMO (pre-main acceptance), the owner, and whoever hosts the static site next.
Evidence: `docs/evidence/bloom-030/` (stills, `release-proof.json`, suite logs, `REPORT.md`). QA: `tools/release-check.js` (the 31st suite).
**Updated by BLOOM-031 (portable runtime + GitHub playability):** the game now also runs from a double-clicked `index.html` and is
ready for GitHub Pages — §1, §3, §4, §8, §9; the full design is `docs/PORTABLE_RUNTIME_v1.md` (QA: `tools/portable-runtime-check.js`,
the 32nd suite; evidence `docs/evidence/bloom-031/`).

The finished product is now the repository's root experience. The player reads **STRANGE BLOOM · UNKNOWN SOILS**; the project, its
files, modules and repository stay **BLOOM**.

---

## 1. Product truth

| | |
|---|---|
| **Canonical entry** | the repository root: `/` (equivalently `/index.html`) — the Strange Bloom title |
| **Play locally** | (BLOOM-031) download / clone → double-click `index.html` (`file://`): the whole game, offline, no server, no flag (§4) |
| **Play online** | (BLOOM-031) GitHub Pages, `https://interstellarharvest.github.io/bloom/` once Pages is enabled (one-time setting, §9); any static HTTP(S) host works |
| **Local development** | from the repository root: `python3 -m http.server 8767` → <http://localhost:8767/> (the source modules) |
| **Gameplay page** | `demos/demo-run.html` (the production run UI by default) |
| **Scenario** | the product flow plays **Eden**; Dying World / Native Competition / Volatile Climate are direct developer URLs (§6) |
| **Save / Continue** | none (no CONTINUE on the title; a run is not saved) |
| **Audio** | none |
| **Deployment** | (BLOOM-031) `.github/workflows/pages.yml`: on push to `main`, copy the game's static files and deploy with the official Pages actions; no server, analytics, external font or external request. The only build is the developer-run portable bundle (`dist/portable/`, committed; `tools/package.json` → esbuild) — players install nothing |

## 2. The player flow

```
/                                      Strange Bloom title: one of 12 paintings (never the one just shown; the next preloaded)
│                                      BEGIN EXPEDITION · TRAINING · SETTINGS · CREDITS   (no CONTINUE)
│                                      the first validated sector is already being surveyed (module workers)
├─ first BEGIN EXPEDITION, no training record → ONE dialog "First expedition?"  (TRAINING carries a small "Recommended" tag)
│     Go to Expedition  → records "skipped" → the survey          Start Training (~5 min) → Guided Training, records nothing
├─ TRAINING → fade to black → demos/demo-run.html?training=1&return=<the root>   (13 guided lessons on Training Grounds)
│     Skip (one confirmation) → records "skipped" → /   ·   Main menu → /   ·   Restart training → the same training, fresh
│     TRAINING COMPLETE ("completed"): Begin Expedition → /?begin=1 → the survey · Restart training · Main menu → /
└─ BEGIN EXPEDITION → fade through black → Destination Survey (3 × 3, nine validated worlds; Escape / "← Main menu" → the title,
      which shows the next painting)
      → choose a world → its live globe in focus → Begin expedition → DRAMATIC descent
      → under full cloud cover: the EXACT selected planet is packaged verbatim into a session handoff (sessionStorage, opaque token)
      → demos/demo-run.html?play=1&expedition=<token> → that planet, never regenerated (the World Seed is provenance only)
      → production gameplay: Planet View · Region Inspect · Adapt · Spread · Terraform (the live sphere of THIS planet)
      → the production Bloom Report: Keep playing · Play again (same token, same planet, fresh run)
                                     · Choose another planet → /?begin=1 → the survey · Main menu → /
```

`?begin=1` (used by "Choose another planet" and the finished training's Begin Expedition) enters the survey at once and is dropped
from the address, so a reload or a return lands on the title.

## 3. Root entry architecture

```
index.html (root, canonical)          demos/main-menu.html (developer / compatibility alias)
   │  <script src="resources/main-menu/title-boot.js" data-run="demos/demo-run.html">
   │                                     │  <script src="../resources/main-menu/title-boot.js" data-run="demo-run.html" data-title="../index.html">
   └──────────────┬──────────────────────┘
                  ▼
resources/main-menu/title-boot.js     classic, no dependencies: the BLOOM classic scripts in order, then the composer —
                  │                   http(s): import(main-menu-page.js); (BLOOM-031) file://: the same module from the generated
                  │                   portable runtime through resources/portable/module-loader.js
                  ▼
resources/main-menu/main-menu-page.js   mountTitlePage({ app, runHref, titleHref }) — THE page-level composition (once, for both)
                  │                     ExpeditionEntry · TRAINING href · ?begin=1 · the exact-world departure · stranded notice ·
                  │                     bfcache · development / QA query parameters · window.MENU_DEV
                  ▼
MainMenu · ExpeditionEntry · DestinationSurvey · BLOOM.expedition (handoff)    — unchanged, authoritative
```

- **Two thin documents, one composer.** Neither document holds a module, inline script or inline style; `new ExpeditionEntry`, the
  departure packing, the training URL and `?begin=1` exist in exactly one file in the repository (`release-check` R8–R10 / R80).
- **Paths are explicit.** `data-run` is the gameplay page relative to the document; `data-title` the canonical title relative to the
  document (omitted = the page itself). The boot resolves the repository from its own URL, never from guesses about the document.
- **Returns go to the root.** Everything that comes back to the title (a run's Main menu / Choose another planet, training's Skip /
  Main menu / Begin Expedition) is sent to the canonical title with the page's own query (development parameters) and never `begin=1`.
  The root's canonical title is itself (at the address the player used, `/` or `/index.html`); the alias names `../index.html`, so no
  normal action ever lands on `demos/main-menu.html`. The run page's own fallbacks (an expedition payload without a usable return, the
  failure state's Main menu, a training run without `return=`) are `../index.html` too.
- **The handoff contract is unchanged.** `BLOOM.expedition.runUrl(token, runPath)` already took the page; the composer passes
  `runHref`. The payload (version 1, the same fields, `planet` verbatim, `returnTo` now the root), storage (sessionStorage, bounded,
  not consumed on boot) and the run page's boot are untouched.

## 4. `file://` (BLOOM-031: the whole game)

*(BLOOM-030 shipped an HTTP-required notice here; BLOOM-031 retired it.)* Double-clicking the root `index.html` runs the **entire**
normal game from `file://` under default browser security, with no server, flag or extension: the title and its twelve paintings,
Settings, TRAINING (the complete guided training), the Destination Survey (nine validated worlds, Scan New Sector, the real spinning
globes), the DRAMATIC descent, the exact selected planet, the four rooms with the real Terraform sphere, the report, Play again,
Choose another planet and Main menu — offline.

The source architecture is not bent for this. Browsers refuse ES modules and module workers from `file://`, so a file page gets the
same source modules from a **generated portable runtime** (`dist/portable/strange-bloom.portable.js`, built by
`npm --prefix tools run build:portable`, committed so players build nothing), the survey's worker as a `blob:` worker built from the
same worker code, and the exact-planet handoff through the tab's `window.name` (mirrored into `sessionStorage`) instead of
`sessionStorage` alone. HTTP(S) keeps the source path unchanged. Design, guarantees and developer workflow:
`docs/PORTABLE_RUNTIME_v1.md`.

## 5. Production gameplay UI

The production run UI (Planet View, the four decision rooms, the SUBDUED room / report transitions, the production Bloom Report /
Extinction debrief) is the default on every run (`docs/GAMEPLAY_UI_CONVERGENCE_v1.md`). `?ui=legacy` (the retired engineering shell)
is developer-only: it works only when explicitly requested, and no production action links to it (R56).

## 6. Developer direct-run URLs (all unchanged)

| URL (`demos/demo-run.html` …) | |
|---|---|
| (no query) | First Bloom, the authored run |
| `?planet=<id>` | any authored world (e.g. `training_grounds`) |
| `?archetype=<id>&seed=<n>` | a generated world from the production generator (developer footer) |
| `?archetype=…&seed=…&scenario=dying_world` · `native_competition` · `volatile_climate` | scenario runs (layer P in the page) |
| `?play=1` · `?play=1&archetype=…&scenario=…[&seed=…]` | the BLOOM-016 player path (World Seed search, player menu); since BLOOM-030 its exits go to the root title: *Change planet* → the Destination Survey (`?begin=1`), *Home* → the title; there is no *Change scenario* (no scenario chooser exists in the product) |
| `?training=1[&return=<same-origin URL>]` | the training run (no `return=` → the root title) |
| `?expedition=<token>` (with `play=1`) | an expedition handoff from this tab's session |
| `&ui=legacy` | the engineering shell (developer-only) |

`demos/main-menu.html` stays as the title's developer alias (same composer, returns to the root). The other `demos/` pages
(survey, sphere, transition, descent, surface, UI mockups) are development surfaces and are not linked from the product.

## 7. What BLOOM-030 retired

The BLOOM-016 temporary launcher that was the root `index.html` — its Home / planet chooser / scenario chooser / briefing screens, its
hash router, emoji icon table and mini-map renderer — is gone from the player path and from the repository root, and nothing links to
it. `tools/game-flow-check.js` keeps every check of the player run path it launched (now driven from the direct URL) and replaces its
launcher-screen checks with "the root is the title" checks (RT1 / RT2).

## 8. Browser test matrix

| | Chromium (Playwright build) | Firefox (Playwright build) |
|---|---|---|
| 1280 × 800 root flow (title → survey → exact world → run → returns) | ✓ | ✓ |
| 1024 × 768 · 1440 × 900 (title, survey, focus: no horizontal scroll) | ✓ | — |
| reduced motion (OS) through the root flow | ✓ | — |
| keyboard (title menu, first-run dialog, survey entry / return) | ✓ | — |
| training from the root (every exit) | ✓ | (guided-training-check: main path, Skip, one viewport) |
| `file://` notice / standalone run | ✓ | ✓ (notice) |
| (BLOOM-031) `file://` whole game, offline (title → survey → exact world → rooms → report → returns; training; storage blocked; reduced motion) | ✓ | ✓ |
| (BLOOM-031) guided training complete over `file://` (`guided-training-check --file`) | ✓ | ✓ (its Firefox groups) |
| (BLOOM-031) served at `/` and under the Pages subpath `/bloom/` (exact handoff, training, every return) | ✓ | ✓ |

(The `file://` notice row is BLOOM-030's; since BLOOM-031 the root over `file://` is the real title.) Safari / WebKit: not tested (no WebKit build on this machine). Totals on the implementation commit 1fe7334: **31 suites, 1372 pass / 1 fail** — the
one miss (dying-world-check #40, live-random run variance) reruns 63/63 on the branch and on 726f74d; release-check 53/53
(`docs/evidence/bloom-030/REPORT.md`).

## 9. Known non-blocking limitations

- **GitHub Pages needs one repository setting** (BLOOM-031): Settings → Pages → Build and deployment → Source: **GitHub Actions**; the
  workflow is in the repository and publishes on the next push to `main`. Any other static host that serves the files over HTTP(S)
  works too (ES modules and the module worker need the `text/javascript` MIME type, which every mainstream host sends).
- **The plant's visual evolution is not final.** The production plant specimen is functional, not the finished art; its redesign is
  the next product milestone (BLOOM-032).
- After changing a module that the portable runtime contains, a developer must rebuild and commit `dist/portable/`
  (`docs/PORTABLE_RUNTIME_v1.md` §11); `portable-runtime-check` P3 fails until they do.
- **No scenario picker** in the product yet; scenarios are developer URLs. The retired launcher's copy (planet / scenario card text,
  the briefing lines) remains as unused data in `content/play.js`, `content/archetypes.js` (`display`) and `content/scenarios.js`
  (`display.card`) for a future picker; a few old header comments in protected / shared files (e.g. `resources/bloom-play.js`,
  `content/archetypes.js`) still mention "the launcher (index.html)" and were left byte-identical on purpose.
- **No save / Continue**, **no audio** (by design).
- The `MainMenu` component keeps its standalone TRAINING placeholder dialog (used only when no training hook is given, e.g. a bare
  component test). The root always supplies the real training hook; the placeholder is unreachable for a player (R17 / R21).
- The survey's header kicker still reads "BLOOM · Expedition planning" (an owner content decision noted in 028C).
- Safari / WebKit untested here. Firefox smoothness should be judged headed on real hardware.
- Development query parameters (`?bg=`, `?rm=`, `?sector=`, `?workers=`, `?worker=0`, `?firstBloom=1`, `?hold=`, `?fail=1`, `?seed=`) remain
  on the title for QA; a player never needs them.
