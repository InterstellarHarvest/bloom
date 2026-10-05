# BLOOM-027D — Productionize PlanetSphereView · evidence report

The sphere track's final milestone. Nothing is merged or released. Nothing is integrated into gameplay, menus, tutorials or
transitions.

## Provenance

| | |
|---|---|
| Repository | InterstellarHarvest/bloom |
| Starting SHA | `3763641` (accepted BLOOM-027C, branch `agent/bloom-027c-sphere-validation`, on top of the accepted generator `f6bca30`) |
| `main` when inspected | still `b704961` (`git fetch` before branching); 027C is local only, not pushed |
| Branch / worktree | `agent/bloom-027d-sphere-production` · `_worktrees/bloom-027d-sphere` |
| Commits | `10ceaa7` implementation + handoff doc + QA driver · evidence commit (this report, screenshots, results) follows it |
| Other worktrees / branches / stashes | untouched (027A, 027B, 027C, planet-sphere-spike worktrees; stash list empty) |

## Where it lives and what it is

| | |
|---|---|
| `resources/planet-sphere/planet-sphere-view.js` | **`PlanetSphereView`** + **`PlanetSphereRenderer`** (the module consumers import) |
| `resources/planet-sphere/planet-texture.js` | planet data → 2:1 texture, UV → tile → region. Pure: no Three.js, Node-importable |
| `resources/planet-sphere/vendor/three-0.185.1/` | Three.js r185.1, moved unchanged from `demos/planet-sphere/vendor/` |
| `demos/planet-sphere.html` | the retained developer demo / QA page (was `planet-sphere-spike.html`) |
| `demos/planet-sphere-grid.html` | a nine-globe technical proof for the 3×3 grid question. **Not the menu** |
| `docs/PLANET_SPHERE_VIEW_v1.md` | **integration handoff for the Menu/Tutorial worker** |
| `tools/sphere-texture-check.js` | new deterministic Node suite (19th) for the texture seam |

**Public API** (full table in the handoff doc):

```js
const view = new PlanetSphereView(container, { planet, render, renderer?, autoRotate, interactive, reducedMotion, yaw,
  distance, wheelZoom, background, onInteractionStart, onInteractionEnd });
view.setPlanet(planet, { render })   view.setAutoRotate(on)   view.setInteractionEnabled(on)
view.setYaw(rad, { animate }) / getYaw()   view.lookAt(u, { animate })   view.resize()   view.dispose()
const host = new PlanetSphereRenderer(stage);   new PlanetSphereView(cell, { renderer: host, … });   host.dispose()
```

- **Optional extras:** `pickAt(x, y)` (a hover helper that keeps both 027C picking fixes) and `state()` (debug).
- **Owns:** scene, camera, renderer, geometry, material, texture canvas, yaw-only input, idle rotation, resize, DPR and
  disposal.
- **Owns none of:** navigation, menu, scenario, gameplay, selection, tutorial or transition state.

## What changed

**1. Decorative seam fix (renderer only).**

- *Cause:* the stipples copied from the 2D map had x-periods that don't divide 60: water stripes `(x+y)%7`, dunes period 9,
  frost period 32 (its `x>>2` term). They therefore jumped phase at x = 59 → 0, giving 027C's chevron in open water.
- *Fix:* `stipplesFor(W)` gives every stipple a period that divides W.
  - Each modulus is the divisor of W nearest the 2D one: water 6, dunes 10, frost 10.
  - Each x coefficient is coprime with its modulus, so no column is left empty.
  - Frost's irregularity term moves from x to y.
  - A width with no nearby divisor (a prime) falls back to a hashed stipple on x mod W.
- **What did not change:** geography, section ids, section colours, water colours, tilemap and topology. Pin D1: 14 400
  tiles of six production worlds have colours identical to 027C, and only the stipple *positions* moved. Nothing is
  blurred, masked or forced to match.
- **Visible difference:** stipple density shifts slightly (water 1/7 → 1/6, dunes 1/9 → 1/10, frost 1/8 → 1/10). Frost
  glints are now scattered instead of falling in 4-column bands (`05-texture-strip-frozen7`).
- **Second, latent seam fixed:** the texture's horizontal wrap mode is now `RepeatWrapping`. Before, linear / mipmap
  filtering *clamped* at u = 0 ≡ 1. That never showed on 027C's large globe (magnified, nearest filtering), but it would on
  minified grid-sized globes.

**2. Production component.**

- The spike view was rewritten around a host / view split:
  - A `PlanetSphereRenderer` owns the WebGL context, a canvas laid over a stage element, one shared `SphereGeometry` and
    one rAF loop.
  - Each `PlanetSphereView` owns its scene, camera, lights, material, texture and canvas.
  - A view made without a renderer creates a private one inside its container, so single-globe use is one line.
- **Yaw only by construction.** The mesh's only rotation is `rotation.set(0, yaw, 0)`. There is no tilt group and no pitch
  option, and pitch / tilt / roll options are ignored (B2d).
- **Input comes from the container, not the canvas.** That is what lets one shared canvas serve nine cells. The container
  gets `touch-action: pan-y`, so vertical swipes still scroll the page on touch devices.
- **Render on demand.** A frame is drawn only when yaw, size or texture changed; a still globe costs no GPU work.
- **Texture uploads** happen only when a content signature changes. That signature covers the tilemap, section climate,
  sky, render hints, diagnostics and size.
- **Authored planets** (First Bloom) are laid out by the game's own `BLOOM.resolveLayout`.
- **CSS scale / translate transforms** on a cell or on the stage are followed for drawing and picking, ready for a future
  grid → focus animation.
- **No import map.** Three.js is imported by relative path.

**3. Kept from 027C.** The exact longitude-zero analytic fallback (B4b: used 252×, 1372/1372 on-line picks) and
camera / matrix sync before picking (B4c: a pick straight after a zoom sees the new camera).

**Not changed:** generator, topology, the 60×40 map, the 2:1 texture, the sphere geometry and projection, poles, the 2D
renderer (`demos/demo-run.html` keeps its 7 / 9 / 32 patterns), `index.html`, content, existing tools and README.

## QA

**18 BLOOM suites** (`run-all-suites.sh` → `qa-suites-summary.txt`): **18 / 18 green, 823 passed, 0 failed.** Per-suite
counts are identical to 027C. The new **`sphere-texture-check` passes 12 / 12**, for **835 / 0 across 19 suites**.

**Sphere QA** (`NODE_PATH="$(npm root -g)" node docs/evidence/bloom-027d/qa-sphere-production.js --shots` →
`qa-results.json`, head `10ceaa7`): **43 / 43 passed.** That's 4 Node, 30 Chromium demo, 9 Chromium grid and 1 Firefox;
the 027C checks are ported wherever they still apply.

| # | requirement | evidence |
|---|---|---|
| 1 | 18 suites green | 823 / 0, identical counts to 027C |
| 2 | 027C sphere QA where applicable | B1 (same worlds as Node), B4a–d (1372 / 1372 cut picks, analytic fallback, zoom sync), B6 (hover 59 \| 0, sec_13), B9, F1 (Firefox 34 / 34) |
| 3–5 | yaw only; vertical drag can't tilt; no roll | B2a \|qx\|+\|qz\| = 0 through every input · B2b vertical drag Δyaw 0 · B2c pole fixed top-centre · B2d no pitch / tilt / roll API |
| 6–8 | idle horizontal; stops at once; resumes | B3: idle 0 in every frame of the press; resumes 2.99 s after release, full speed 4.49 s; rotation stays pure-Y |
| 9 | reduced motion | B17a: no idle, no fling, instant turns, **drag still spins** (Δyaw 0.41) · B17b: media query is live both ways |
| 10 | cylindrical geography seamless | `sphere-texture-check` E3 (UV ↔ tile, regionAtUV at the cut 240 / 240) · B4a · N2 (generator byte-identical to `f6bca30`) |
| 11 | decorative seam gone | `sphere-texture-check` A1, B1, C2, C3: wraps formula-exact and pixel-exact (85 / 85 real cut rows equal an interior pair). Control: the 027C renderer fails the same checks (22 / 70 rows show the chevron) |
| 12 | resize | B11: window 900×700 and 390×844, and the container alone; G5: grid at phone width; G5b: CSS scale |
| 13 | DPR cap | B16: 3× display → pixel ratio 2, buffer 1840×1522 for 920×761 CSS |
| 14 | no per-frame upload | B5: 0 uploads while spinning; unchanged `setPlanet` 0 uploads (0.06 ms); each real change exactly 1 |
| 15 | dispose cleans everything | B13a: geometry / texture 1 / 1 → 0 / 0, context lost, canvas removed, loop stopped, container style and attributes restored byte-for-byte, second dispose a no-op · B13b: listeners / observers / contexts back to baseline · G6 |
| 16 | repeated create / destroy | B14: 30 standalone + 10 × nine-view cycles; listeners 45 → 45, observers 1 → 1, live contexts 1 → 1 (40 created, 40 released), no "too many contexts" warning, JS heap Δ 0 MB after GC |
| 17 | instances independent | B15: yaw, idle, interaction, planet and distance on one view leave the other untouched (standalone and shared); only the immutable geometry is shared, and its checksum is unchanged |
| 18 | no console errors | B12, B17c, G8, F1 |

The polar rows (B4e: rows 3–36 reachable) are reported **for information only** and are not a requirement.

## Performance

| | mean frame | p95 | notes |
|---|---|---|---|
| one globe idle, AMD Radeon Pro 5700 XT (ANGLE / Metal) | 16.67 ms | 16.8 ms | 60 fps |
| one globe idle, headless SwiftShader | 16.67 ms | 16.8 ms | pick 0.77 ms · `setPlanet` with a change 2.6 ms · unchanged 0.06 ms |
| nine spinning globes, **shared renderer**, GPU | 16.67 ms | 16.8 ms | 1 context · 1 program · 180 frames submitted · create 39 ms |
| nine spinning globes, nine contexts, GPU | 16.67 ms | 16.7 ms | 9 contexts · 9 programs · 1620 frames submitted · create 108 ms |
| nine spinning globes, shared, SwiftShader | 48.0 ms | 50.1 ms | software GL, CPU-bound |
| nine spinning globes, nine contexts, SwiftShader | 50.6 ms | 66.6 ms | |
| nine still globes (either page) | — | — | **0 frames drawn** (render on demand) |

- **Per globe:** 1 draw call, 16 128 triangles (shared geometry), and a 480×240 texture with mips (~0.6 MB GPU).
- **Planet generation dominates.** `attemptPlanet` takes 4–30 ms, while validated `generateFromArchetype` takes 0.4–0.6 s
  per world in Node. The handoff doc says never to validate just to show a globe.

## Multi-sphere recommendation (F)

**Use one `PlanetSphereRenderer` per screen and one `PlanetSphereView` per cell.** That gives one WebGL context, one
compiled program, one shared geometry and one loop, with viewport + scissor per cell. It is implemented, tested (G1–G8,
F1) and documented, so the Menu worker doesn't need to touch the internals.

On a desktop GPU, nine separate contexts also hold 60 fps. They are still the wrong production architecture:

- browsers cap live contexts per page and silently evict the oldest, and transitions that briefly double the views make
  that likely;
- every context compiles its own shaders and uploads its own geometry: 9× programs, 2.8× creation time, 9× the frames
  submitted to the compositor;
- mobile and classroom hardware is far tighter than the dev machine.

## Answers

**A. Is the globe now a reusable screen-agnostic component?** **Yes.**

- `PlanetSphereView` takes any container element and never queries the DOM by id or selector.
- It has no module-level mutable state and writes no globals (N4).
- It owns no navigation, menu, scenario, gameplay, tutorial or transition state.
- Multiple instances are independent (B15).
- A single globe or a shared-renderer grid works through the public API alone (both demo pages use nothing else).

**B. Is interaction strictly yaw-only?** **Yes.**

- The mesh's only rotation is about its vertical axis, and no option or method exists to change anything else (B2d).
- Through diagonal and vertical drags, ↑ / ↓ / PgUp / PgDn, ← / →, wheel, fling, idle, `setYaw` and `lookAt`, the rotation
  quaternion's x and z stay exactly 0 and the pole stays at screen top-centre (B2a–c, B3).

**C. Is the remaining cosmetic longitude-zero texture artifact gone?** **Yes.**

- Every stipple is now x-periodic with a period dividing 60.
- The texture is pixel-exact periodic through the cut (`sphere-texture-check` B1, C3: 85 / 85 real-world cut water pairs
  identical to interior pairs at the same phase).
- The 027C renderer fails the same checks (B2 control, 22 / 70).
- Compare `05-texture-strip-*` (the 027C chevron vs continuous 027D stripes) with `01*` / `02*` / `03*` (the same globe,
  before / after).
- `RepeatWrapping` also removes the latent filtering seam for small globes.

**D. Did any generator / topology / gameplay behaviour change?** **No.** N2 shows every generator, simulation, validator,
content, planet, game-shell and run-page file byte-identical to `f6bca30`, and the existing tools untouched. The 18 suites
pass with identical counts. Only the sphere's own texture renderer changed where its stipples fall (D1: colours
unchanged).

**E. Does the component cleanly create, resize and dispose?** **Yes.**

- Creating a view costs one texture draw and one upload.
- Resize is automatic: stage ResizeObserver, plus per-frame container rectangles for scroll / reflow / transforms, plus
  the DPR cap (B11, B16, G5, G5b).
- `dispose()` releases GPU memory, the context, the canvas, the loop, every listener and observer, and restores the
  container exactly.
- 40 create / destroy cycles (30 standalone, 10 nine-view) leave no growth (B13, B14, G6).

**F. Architecture for nine simultaneously visible spheres?** One shared `PlanetSphereRenderer` with nine views (above;
handoff doc §9, proof page `demos/planet-sphere-grid.html`).

**G. Is anything still blocking handoff to the Menu/Tutorial workstream?** **Nothing blocks handing over the component.**
Three items need a PMO / owner decision or follow-up during integration; none of them requires changes inside the
component:

1. **`file://` vs http.** `index.html` is opened from disk today and `game-flow-check` tests it that way, but ES modules
   don't load from `file://` (F0). Before the globe goes on `index.html`, choose between:
   - serving the game over http; or
   - a guarded dynamic `import()` that keeps today's 2D mini-map preview on `file://` (handoff doc §3, §10).
2. **First Bloom is a legacy rectangle.** Its authored layout has a real edge at longitude zero, where all 40 rows change
   section (`07-first-bloom-rectangle-cut-centred.png`). That is topology or content, out of scope here. Until it's
   decided, start First Bloom at the map centre.
3. **Safari / WebKit** is untested in this milestone (Chromium and Firefox are covered). Test it on classroom devices
   during menu integration.

## Launch

```
cd _worktrees/bloom-027d-sphere
python3 -m http.server 8767
open "http://localhost:8767/demos/planet-sphere.html?planet=ocean40&view=cut"      # one globe + diagnostics
open "http://localhost:8767/demos/planet-sphere-grid.html"                         # nine globes, one context
```

- **Demo URL options:** `planet=` takes `ocean6 ocean36 frozen7 desert5 desert25 frozen25 ocean40 ocean13 firstbloom
  default2024`; or use `archetype=<id>&seed=<n>`.
- **View and diagnostics:** `view=cut` · `seam=1` · `bounds=1` · `cols=1` · `grid=1` · `hl=<id>` · `idle=0` · `tex=960`.
- **Grid options:** `mode=separate` (nine contexts, for comparison) · `idle=0` · `n=<1…9>`.

`docs/evidence/bloom-027c/qa-sphere-validation.js` is historical: it targets 027C's `demos/planet-sphere/` paths, so it
runs at `3763641`, not here. The checks that still apply are ported into `qa-sphere-production.js`.
