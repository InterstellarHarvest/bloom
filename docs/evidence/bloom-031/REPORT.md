# BLOOM-031 — Portable Runtime + GitHub Playability: QA report

**Result: green.** A double-clicked `index.html` runs the whole Strange Bloom game from `file://` in Chromium and Firefox under default
security, offline. The same production game runs over HTTP at `/` and under the Pages project subpath `/bloom/`. The GitHub Pages
workflow is in place. Pages itself is **not enabled** yet; that needs one repository setting (below).

| | |
|---|---|
| Start | production main **85ddd76** (= the 3cd91b9 release code + a docs-only README commit; 3cd91b9 → 85ddd76 touches only README.md and docs/) |
| Implementation | **55f762f** (code, generated runtime, tools, workflow) + **7b069cd** (QA-only: suite 32's offline inventory) |
| Branch | `agent/bloom-031-portable-runtime` → `handoff/bloom-031-review`; main not modified, not merged |
| Design | `docs/PORTABLE_RUNTIME_v1.md`; product truth updated in `docs/RELEASE_CANDIDATE_v1.md`; README play instructions |
| Suite 32 | `tools/portable-runtime-check.js`: **71 / 71** on 7b069cd, which includes its child `guided-training-check --file` at **50 / 50** |
| All 32 suites | **1444 pass / 1 fail**. The one miss is colony-development-check [31], a known flake that reproduces on main (`suite-flakes.txt`) |

## How it works (one paragraph)

The source architecture is unchanged and still runs as-is over HTTP(S): ES modules, module workers, the sessionStorage handoff. For
`file://`, `npm --prefix tools run build:portable` (esbuild, dev-only) bundles the unmodified source modules into
`dist/portable/strange-bloom.portable.js`. The bundle is committed, so players build nothing. A small classic module seam
(`resources/portable/module-loader.js`) loads a module with `import()` when the page is served, and takes that same module from the
bundle when the page is a file. The survey's worker runs as a `blob:` classic worker built from the same `survey-worker.js` code. The
exact planet crosses from the title to the run page in the tab's `window.name`, mirrored into sessionStorage, with the same envelope
and integrity check and no regeneration. Every other runtime file is byte-identical to main.

## Generated artifact sizes

| | bytes |
|---|---|
| `dist/portable/strange-bloom.portable.js` | **1,256,642** (1.20 MiB): Three.js 787,616 (bundled **once**), game modules 250,674, survey-worker text 211,757 |
| `dist/portable/manifest.json` | 8,485 |
| generated CSS | none (the stylesheets load as files) |
| `dist/portable/` total | **1,265,127** |

Format `bloom-portable/1`, esbuild 0.28.2, source fingerprint `2b90d81a…c010dc3`. Rebuilding from a clean `git archive 7b069cd` twice
gave output byte-identical to the committed files (P4). The output contains no timestamp and no local path.

## `file://` results (default security, offline)

The browsers were launched with **no arguments**: no `--allow-file-access-from-files`, no `--disable-web-security`, no prefs. Each test
opened `file:///…/index.html` with the network disabled and every http(s) request routed to a block. That block logged **zero**
attempts in both browsers.

| Requirement | Chromium 147 | Firefox 148 |
|---|---|---|
| title, 12 local paintings (1280 × 720), Settings, keyboard | ✓ | ✓ |
| first-run recommendation, TRAINING (13 lessons, 65 %, Skip dialog), return to title | ✓ | ✓ |
| complete guided training by real input (`guided-training-check --file`) | ✓ | ✓ |
| survey: 9 validated worlds from blob: workers, truthful Incoming | ✓ (6 workers) | ✓ (8 workers) |
| real PlanetSphereView (one WebGL renderer, drag spins), Scan New Sector, focus | ✓ | ✓ |
| DRAMATIC departure → exact planet (JSON identical, fingerprint preserved, no generator) | ✓ Eos-619 `21c7ed1d79da9a77` | ✓ Pallas-573 `00c71eab43602e55` |
| Planet View; Region / Adapt (real buy) / Spread (real buy) / Terraform (real sphere, signature = canonical surface) | ✓ | ✓ |
| report, Play Again (same planet), Main menu, second expedition, Choose another planet | ✓ | ✓ |
| storage blocked (localStorage + sessionStorage throw): title, Settings, exact planet, training all degrade safely | ✓ | ✓ |
| reduced motion (title, descent, arrival) | ✓ | ✓ |
| resources referenced by the pages: all `file:` / `data:` (41 distinct) | ✓ (+274 file: request events) | ✓ |
| no console error, no unhandled rejection | ✓ | ✓ |

Default security really applies. In Chromium, importing a source module or starting a module worker from the file page is refused,
which is why the bundle exists. Two handoffs in `window.name` take about 64–68 KB.

## HTTP results (`/` and the Pages subpath `/bloom/`)

| | Chromium | Firefox |
|---|---|---|
| `/`: unchanged source path (14 classic scripts, module workers, sessionStorage handoff, `dist/` never requested) | ✓ | ✓ |
| `/bloom/` (the Pages artifact from `tools/build-pages-site.mjs`, 73 files): title, paintings, module workers, exact handoff, Terraform sphere | ✓ (621 requests) | ✓ (741 requests) |
| no request outside `/bloom/`; `/bloom` → 301 `/bloom/` | ✓ | ✓ |
| returns: Play again (relative, same token) · Choose another planet `/bloom/?begin=1` · Main menu `/bloom/` · training `return=/bloom/` | ✓ | ✓ |

## GitHub Pages readiness

- `.github/workflows/pages.yml` runs on push to `main` (or by hand). It runs only `node tools/build-pages-site.mjs _site` and the
  official actions `checkout@v7`, `configure-pages@v6`, `upload-pages-artifact@v5` and `deploy-pages@v5`. There is no npm install, no
  secret and no server code.
- **One-time setting still required:** Settings → Pages → Build and deployment → Source: **GitHub Actions**. Pages is not enabled on
  `InterstellarHarvest/bloom` (the API returns 404), and the workflow only runs from `main`. The public URL
  `https://interstellarharvest.github.io/bloom/` was therefore **not** smoke-tested. It goes live on the first push to `main` after
  the setting is on.

## Deviations and decisions to note

- **Start SHA:** the brief named 3cd91b9 as current main. `origin/main` was already 85ddd76, a docs-only README rewrite on top of it, so
  the branch starts there. The code is identical to 3cd91b9 (suite 32 check P1).
- **npm manifest in `tools/`, not the root.** A root `package.json` makes Node print `MODULE_TYPELESS_PACKAGE_JSON` warnings whenever
  the suites import the ESM sources. The root stays a plain static site. The commands are `npm --prefix tools ci` and
  `npm --prefix tools run build:portable`.
- **Existing suites updated** where they asserted the retired behaviour:
  - release R62/R63, game-flow RT2, training B6 → B6a/B6b, run-ui-convergence B20 → B20a/B20, terraform B23 → B23a/B23. The fallback
    paths are still covered, now by forcing the portable runtime to fail.
  - Seam text regexes: terraform N4, run-ui-convergence N5, expedition-handoff N8.
  - The one-composer scan in release R8–R10 now excludes the generated `dist/`, and R2s compares against the served file.
- **Pre-existing on main:** run-ui-convergence N4/N9 fail on 85ddd76 because the README rewrite moved the developer docs to
  `docs/DEVELOPMENT_NOTES.md`. The checks now read both files.
- **Test races fixed:** guided-training G3/G4/G10 now wait for lesson 1 → 2 instead of reading it once. Details in `suite-flakes.txt`.
- The run page gained a `data:` icon so Firefox makes no implicit `/favicon.ico` request outside `/bloom/`.

## Not done / limits

- Safari / WebKit is untested (no WebKit build on this machine).
- The old `_worktrees/bloom-028d2-guided-training` and `_worktrees/bloom-planet-sphere` directories are already missing on disk.
  git lists them as prunable. They were not touched or pruned.
- Plant visual evolution is **not** part of this milestone; it is the next product milestone (BLOOM-032, not started).

## Files

`portable-proof.json` (SHAs, build fingerprint, clean-rebuild hashes, sizes, per-browser flows, return URLs, launch options) ·
`qa-portable-runtime-check.log` · `qa-suites-summary.txt` · `suite-flakes.txt` · eight stills: `01-file-title`, `02-file-survey`,
`03-file-selected-globe`, `04-file-gameplay`, `05-file-report`, `06-file-training`, `07-http-bloom-title`, `08-http-bloom-gameplay`
(all Chromium).
