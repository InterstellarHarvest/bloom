# Portable Runtime v1 — Strange Bloom · Unknown Soils

> **Updated by BLOOM-033:** the game is one document, so nothing has to survive a file:// navigation any more — the window.name / session
> "file-safe handoff" described below is **retired** and deleted; the portable runtime's module list starts with the app
> (`resources/app/app-controller.js`, which replaced the page composer `main-menu-page.js`); the Pages site is `index.html` + `content/`
> + `planets/` + `resources/` (no `demos/`). [`SINGLE_DOCUMENT_APP_v1.md`](SINGLE_DOCUMENT_APP_v1.md) §4.

**From:** BLOOM-031 · **For:** developers and whoever maintains or hosts the game.
QA: `tools/portable-runtime-check.js` (the 32nd suite) · evidence: `docs/evidence/bloom-031/`.

Strange Bloom is one static game with two ways in:

| | How the player gets there | What runs |
|---|---|---|
| **Local copy** | download / clone the repository → double-click `index.html` (`file://`) | the **generated portable runtime** (`dist/portable/`) |
| **Hosted** | `https://<owner>.github.io/bloom/` (GitHub Pages), or any static HTTP(S) host | the **source** ES modules and module workers |

Nothing to install, no server, no browser flag, no extension. Both paths run the same source files and the same rules; the portable
runtime is a distribution layer generated from that source, never a second implementation.

---

## 1. The HTTP(S) source architecture (unchanged)

Served over `http:` / `https:` (development, GitHub Pages) the game is exactly what BLOOM-030 shipped:

```
index.html → resources/main-menu/title-boot.js → the BLOOM classic scripts (engine, content, handoff)
           → import(resources/main-menu/main-menu-page.js)   — the ONE title composer (ES modules)
               MainMenu · ExpeditionEntry · DestinationSurvey (SectorPool: MODULE workers, survey-worker.js) ·
               PlanetSphereView (vendored Three.js) · AtmosphereTransition · the expedition handoff (sessionStorage)
demos/demo-run.html → classic engine + run UI scripts; dynamic import() of PlanetSphereView, AtmosphereTransition,
                      main-menu-data.js (settings) and, in training, resources/training/training-run.js
```

Over HTTP(S) nothing new is requested: the title loads 14 classic scripts and imports the composer as before; the run page loads one
extra classic file (the module seam, §3), which simply calls `import()`. `dist/` is never requested.

## 2. Why `file://` needed a different delivery

Under default browser security a page opened from disk has an opaque origin:

- **Chromium** refuses every ES module and every module worker from `file://` (CORS: "origin 'null'").
- **Firefox** allows modules and workers only from the same folder or below; the run page (`demos/`) importing `../resources/` is refused.
- Classic `<script src>` files, images, stylesheets and `blob:` workers **do** load from `file://` in both.

So the game's modules are delivered to a file page as ONE generated classic script, and the survey's worker as a `blob:` worker.

## 3. The generated `file://` architecture

```
index.html (file://) → title-boot.js: the same 14 classic scripts + resources/portable/module-loader.js (the module seam)
                     → BLOOM.modules.load(main-menu-page.js)
                         → injects dist/portable/strange-bloom.portable.js once (a classic <script>)
                         → BLOOM_PORTABLE.load("resources/main-menu/main-menu-page.js") → the bundled SOURCE module
demos/demo-run.html (file://) → the same seam: PlanetSphereView, AtmosphereTransition, the settings and the training layer
                                come from the same bundle (loaded on first use)
```

**Handwritten source** (edit these):

| File | Role |
|---|---|
| `resources/portable/module-loader.js` | the module seam (classic). `BLOOM.modules.load(url)`: served → `import(url)`; `file://` → the bundled copy of that module, by its repository path. Loaded by the run page always and by the title boot over `file://` |
| `resources/portable/portable-entry.js` | the bundle's entry: registers exactly the five modules classic code loads dynamically (`main-menu-page`, `main-menu-data`, `planet-sphere-view`, `atmosphere-transition`, `training-run`) as **lazy** imports, and sets `SectorPool.workerFactory` (§5) |
| `resources/portable/portable-root.js` | where the repository is, captured while the bundle evaluates (§4) |
| `tools/build-portable.mjs` | the build (esbuild): bundle + header + manifest; `--check` compares with the committed files |

**Generated output — never edit by hand:**

| File | Contents |
|---|---|
| `dist/portable/strange-bloom.portable.js` | one classic script: the five registered modules and everything they import (the title / survey / descent graph, the sphere with Three.js, the transition, the coach), plus the survey worker as text |
| `dist/portable/manifest.json` | format, esbuild version, source fingerprint, every input file with its sha256 and its share of the bundle |

Seam changes in existing files (no rule, layout or content changed — `portable-runtime-check` P37 proves every other runtime file is
byte-identical to main and no changed seam line names a game rule):

- `title-boot.js` — `file://` loads the seam and mounts the composer through it (the "needs a web server" notice is retired; a plain
  notice remains only when the portable runtime is missing or broken, i.e. a damaged download).
- `terraform-globe.js`, `gameplay-transition.js`, `expedition-arrival.js` — `importModule(url)`: the seam over `file://`, `import()` otherwise.
- `demos/demo-run.html` — loads the seam; the training layer comes through it over `file://`; the handoff is loaded with
  `transportOf(window)`; a `data:` icon (no implicit `/favicon.ico` outside a hosted subpath).
- `main-menu-page.js` — stores the handoff with `transportOf(window)`.
- `sector-pool.js` — `SectorPool.workerFactory` (default `null` = the module worker).
- `expedition-handoff.js` — the file transport (§6).

### Lazy evaluation

Loading the bundle runs no game code. esbuild turns each `import()` in the entry into a lazily initialised module, so a module (and
its imports) is evaluated the first time `BLOOM_PORTABLE.load(path)` asks for it — exactly as a real `import()` would — and once
per page. The run page therefore never evaluates the title's code, and the training layer runs only on a training page.

## 4. `import.meta.url`

Three source modules read their own address: `main-menu.js` (the paintings), `training-run.js` (the coach's stylesheet) and
`sector-pool.js` (its worker). A classic script has no `import.meta`, so the build makes the ONE transform it makes: each
`import.meta.url` in a bundled source module becomes `sourceUrl("<that module's repository path>")`, the URL the module would have
had if loaded directly (`portable-root.js`: the bundle lives in `dist/portable/`, so the repository root is two folders up). Every
relative address those modules build (`resources/main-menu/backgrounds/menu-07.jpg`, `training-coach.css`) resolves to the same local
file as on the served site.

## 5. Survey workers

The Destination Survey validates worlds in workers. Over `file://` module workers are refused, so the portable entry sets
`SectorPool.workerFactory` to start a **classic `blob:` worker** whose code is `resources/destination-survey/survey-worker.js` and the
BLOOM classic scripts it imports, bundled by the build into one classic script (stored as text inside the bundle). It is the same
worker code and the same validation path (`BLOOM.play.runSearch` → layers 1–8 → `stripPlanet`) as the module worker — not a second
implementation — so a sector is the same nine worlds either way, and the globes keep spinning while worlds validate.

If a browser refused even that, SectorPool's existing fallback builds the sector on the main thread (slower, still correct). The survey
shows **Incoming** in every empty slot until its world is confirmed, in both modes.

## 6. The file-safe exact-planet handoff

The identity rule is unchanged: the survey's `detail.planet` is serialized verbatim, carried across the page change, and rehydrated
as the run's planet — never regenerated (on the run page every generator / search function is unused; `portable-runtime-check`
P19 guards them to throw).

Browsers do not promise one `sessionStorage` across separate `file://` documents, so `BLOOM.expedition.transportOf(window)` picks:

| Page | Transport |
|---|---|
| served (http / https) | the tab's `sessionStorage` — exactly as BLOOM-029F / 030 |
| `file://` | the **tab's own name** (`window.name`, kept across same-tab navigations): `"strange-bloom.handoffs:" + JSON` of the same `strange-bloom.expedition.*` items, **mirrored into `sessionStorage`** when the browser offers it (read back only if the name lost them) |

Same envelope (version 1, the same fields, the same integrity check), the same `MAX_HANDOFFS = 2` pruning, only the opaque token in the
address, nothing in `localStorage`, no planet in the URL. A reload, **Play again** (same token), **Choose another planet** and
**Main menu** all stay in the tab, so the handoff survives every return. Measured (BLOOM-031 QA): with the two kept handoffs
`window.name` holds ~64–69 KB (~32 KB a planet); both browsers keep megabytes there. If both storages are blocked, `window.name` alone still carries it (P28).

## 7. Three.js

The vendored `resources/planet-sphere/vendor/three-0.185.1/` (MIT) is bundled **once** (`three.module.min.js` + `three.core.min.js`,
~770 KiB as re-printed by esbuild); the survey worker contains none. The Destination Survey's nine globes and the Terraform room use
the real `PlanetSphereView` over `file://` exactly as over HTTP — never the flat fallback, which remains only for a module that
genuinely fails to load.

## 8. Storage

- Settings (`strange-bloom.settings`) and the training record (`strange-bloom.training`) use `localStorage` as before; both browsers
  keep it for `file://` pages. Every read / write is already guarded: with storage blocked the game still runs (Settings apply for
  the visit, training is simply offered again) — P28.
- No gameplay state is saved (no save / Continue, by design).

## 9. GitHub Pages and subpaths

Every game URL is **relative** (the title resolves the repository from `title-boot.js`'s own URL; the run page uses `../`; returns
are computed from the title's own address), so the game runs unchanged at `/` or under a project subpath such as `/bloom/`
(P30–P34: every request stays inside `/bloom/`; Play again, Choose another planet, Main menu and every training exit return inside it).

`.github/workflows/pages.yml` (official actions only: `checkout`, `configure-pages`, `upload-pages-artifact`, `deploy-pages`) runs on
every push to `main` (or by hand): `node tools/build-pages-site.mjs _site` copies the game's own files — `index.html`,
`demos/demo-run.html`, `demos/main-menu.html`, `content/`, `planets/`, `resources/` — and deploys them. No npm install, no build, no
server code, no analytics. Pages serves the HTTP source path (the portable bundle is not needed there and is not published).

**One-time repository setting** (cannot be done from code): **Settings → Pages → Build and deployment → Source: GitHub Actions**.
After that, the next push to `main` publishes `https://interstellarharvest.github.io/bloom/`.

## 10. Offline guarantees

- A local copy needs no network at all: every request a `file://` session makes is `file:` (inside the game folder), `data:` or
  `blob:` (P10, measured with the network disabled and every http(s) request blocked). The twelve paintings, Three.js and the
  stylesheets are local files; there is no web font, CDN, analytics or external request anywhere.
- No service worker and no offline cache: the downloaded folder *is* the offline distribution. The hosted site needs only its own origin.

## 11. Developer workflow

```sh
python3 -m http.server 8767                   # develop against the SOURCE: http://localhost:8767/
npm --prefix tools ci                         # once: installs the one dev dependency (esbuild, pinned)
npm --prefix tools run build:portable         # after changing ANY module the bundle contains → rewrites dist/portable/
npm --prefix tools run check:portable         # rebuild in memory; exit 1 unless dist/portable/ matches (CI-style check)
git add dist/portable                         # commit the generated files with the source change
NODE_PATH="$(npm root -g)" node tools/portable-runtime-check.js   # suite 32 (file://, http /, /bloom/; Chromium + Firefox)
```

- The npm manifest lives in `tools/` on purpose: the repository root stays a plain static site (no `package.json` there, so Node
  never warns about the ES-module source files the suites import).
- **Which changes need a rebuild?** Any file listed in `dist/portable/manifest.json` (`inputs` / `workerInputs`): the title / survey /
  descent / sphere / transition / training modules, the survey worker and the classic scripts it imports, Three.js, the three portable
  files and the build script. Classic run-page scripts, stylesheets, images and HTML are loaded as files and need none.
- **Reproducible.** No timestamp, absolute path or user name; the header carries the format (`bloom-portable/1`), the esbuild version
  and a source fingerprint (sha256 over every input's path and hash, the build script, the format and the esbuild version).
  `portable-runtime-check` P3 / P4 rebuild in memory and from a clean copy (twice) and require byte-identical output.
- Not minified on purpose (reviewable); Three.js arrives minified from `vendor/`.

## 12. Sizes (BLOOM-031)

| | |
|---|---|
| `strange-bloom.portable.js` | ~1.2 MiB — Three.js ~770 KiB (once), game modules ~250 KiB, survey worker text ~210 KiB |
| `manifest.json` | ~8 KiB |
| generated CSS | none (stylesheets load as files) |
| `dist/portable/` total | ~1.2 MiB (exact figures: `docs/evidence/bloom-031/portable-proof.json` → `sizes`) |
