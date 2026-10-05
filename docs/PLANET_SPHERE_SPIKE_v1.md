# BLOOM — Planet Sphere Projection · technical spike report v1

**Status:** spike complete; not merged and not released. Branch `agent/planet-sphere-spike`.
**Scope:** prove that a real generated BLOOM planet can be drawn into a texture and shown on a light, interactive 3D sphere in the browser, and that sphere picking can find the existing region. This is not a production UI. Topology is unchanged.

| | |
|---|---|
| Starting commit | `6c0357ba9cc0f61e39042a9e6cf7378efd05f9d6` (main, BLOOM-025) |
| Spike commit | {{SPIKE_COMMIT}} (this report is committed on top of it as the branch head; the hand-off message gives the final SHA) |
| Three.js | **three@0.185.1**, pinned and vendored at `demos/planet-sphere/vendor/three-0.185.1/` (MIT; `three.module.min.js` + `three.core.min.js`, copied unmodified from the npm tarball; hashes in that folder's README). It loads through an import map in the demo page and nothing else in BLOOM imports it. |
| Run the demo | from the repository root: `python3 -m http.server 8765` |
| Demo URL | `http://localhost:8765/demos/planet-sphere-spike.html` |
| URL options | `?planet=ocean13` (default) · `desert25` · `frozen22` · `frozen9` · `desert4` · `default2024`; or `?archetype=<id>&seed=<n>`; or `?gen=default&seed=<n>&water=<pct>`; add `&tex=960` for the 960×480 texture and `&debug=0` to hide the readout panel |
| Spike QA | `NODE_PATH="$(npm root -g)" node docs/evidence/planet-sphere-spike/qa-planet-sphere.js --shots` (starts its own `python3 -m http.server`) |

ES modules do not load over `file://`, so the demo needs the local server. The rest of BLOOM still boots over `file://`.

## The answers

### A. Does the basic 2D → sphere projection work cleanly?

**Yes.**

- The page runs the unchanged production path (`BLOOM.generateFromArchetype`, validator layers 1–8, the same call `demo-run.html` makes). QA checks that the page's planet is identical to the one Node generates for the same seed.
- A dedicated 480×240 canvas is drawn from `gridWidth`, `gridHeight`, `sections`, `tilemap` and the archetype's `render` treatment. It is never a copy of the gameplay canvas. Each of the 60×40 tiles gets an exact 8×6 px footprint. QA reads all 2400 tiles back and every one matches its land or water colour.
- The texture is uploaded once per planet. It is not re-uploaded during frames, drags or hovers.
- The sphere is round at every size tested (silhouette width and height within 2%), and it fits the width of portrait and phone containers.
- Rendering runs at 60 fps on the real GPU and costs about 0.1 ms of JavaScript per frame. There are no console or page errors in Chromium or Firefox.

Two things limit how well it reads, and neither is a projection bug:

- **Tile shape.** The 60×40 grid is 3:2, but an equirectangular texture is 2:1. At the equator each tile covers 6° of longitude by 4.5° of latitude, so it looks about 1.33× wide. Tiles become square near 41° latitude and narrow towards the poles.
- **Colour and borders.** The base palette is the one `demo-run.html` uses for bare ground (deliberately dimmed), so the globe reads dark. The 2D map's region borders and labels are not part of "base appearance", so neighbouring regions with similar ground colour merge on the globe (compare `10-demo-run-2d-ocean13.png` with `01-front.png`).

### B. How obvious is the current non-wrapping horizontal seam?

**Very obvious on most worlds.** It shows up as a straight north–south cut through coastlines and region colours.

`seam-pole-survey.js` surveyed 116 accepted production worlds (public seeds 1–40 for each archetype; 4 seeds produced no world):

- **Land against water.** On average, 14.6 of 40 seam rows have land on one side and water on the other. 79 of 116 worlds have at least 10 such rows. Only 7 have none, and the worst has 39.
  - By archetype: Ocean 18.6 rows, Frozen 14.5, Desert 11.1.
  - The primary fixtures are not exempt: Frozen 22 has 32/40 rows. Ocean 13 has 6/40 and still shows a straight cut (`02-opposite-side-seam-centred.png`).
- **Region borders.** No section ever spans the seam (0 of 116 worlds). Every row with land on both sides is therefore a region border. That happens on most rows of Desert and Frozen worlds (28.2 and 24.1 of 40 on average), and on all 40 rows of Desert 4.
- **Colour step.** The colour change across the seam averages 7.9× the typical change between neighbouring interior columns.

It looks as bad as these numbers suggest. On Frozen 9 (`03c-seam-frozen9-centred.png`), a lake ends in a ruler-straight vertical edge against frozen ground. With idle rotation on, the seam crosses the front of the globe once a minute. Seen from the poles, it is a straight radial line (`04b`).

The seam also misleads, beyond looking wrong. Tiles that touch across it are **not** neighbours in BLOOM: Spread, adjacency and water crossings all treat x = 0 and x = W − 1 as hard edges. A globe used for decisions would show regions that look connected and are not. Nothing was blurred or altered to hide the seam. The optional magenta seam marker is a debug overlay drawn above the surface, and it is off by default.

The two seam test worlds are both real, unmodified production worlds:

| World | Rows with land on one side, water on the other | Rows that are a region border |
|---|---|---|
| Frozen World · seed 9 (seam test) | 30 / 40 | 3 / 40 |
| Desert World · seed 4 (land on both edges) | 0 / 40 | 40 / 40 |

### C. How objectionable is current pole distortion?

**It is tolerable at a glance and objectionable up close. The bigger problem is area, not looks.**

- **Looks.** The whole top row (60 tiles) and the whole bottom row shrink to a single point. Those tiles turn into thin 6° wedges that form a pinwheel. Frost glints and dune ripples stretch into streaks.
  - 99% of pole rows contain land, and on average 3.8 regions meet at each pole.
  - At normal zoom (`04-north-pole.png`, `05-south-pole.png`) this reads as a small starburst.
  - Zoomed in (`04b`, `05b`) it is clearly broken pixel art, and the seam runs straight out of the pole.
- **Area.** BLOOM's coverage % and the 70% win target count tiles. On a sphere, a tile's visible area falls with latitude: a pole-row tile is about 25× smaller than an equator-row tile.
  - Per world, the most-shrunk region shows at only 0.32× its tile share on average (as low as 0.10×).
  - The most-enlarged region shows at up to 1.74× its tile share.

If the globe is decorative, the poles are acceptable. If it is a primary map for judging coverage or choosing regions, they are not. No polar topology was changed.

### D. Does UV → tile → region picking work reliably?

**Yes.**

How it works: the spike raycasts the sphere with Three.js and takes the closest hit. Then `tile x = ⌊u·W⌋` and `y = ⌊(1 − v)·H⌋`, clamped at the seam and the poles, and finally `planet.tilemap[y·W + x]` gives water (`-1`) or an existing `sec_N`.

How it was tested: the globe was turned so each target tile's centre faced the camera, and then a real raycast was made at the canvas centre.

| Run | Targets resolved correctly |
|---|---|
| Ocean 13 | 327 / 327 (138 land, 189 water, all 15 regions, both seam columns, both pole rows) |
| Frozen 9 | 185 / 185 |
| 960×480 texture | 128 / 128 |
| Firefox | 147 / 147 |

Land hits always return the section ID that the authoritative tilemap holds.

- A real pointer hover updates the readout, for example `UV: 0.358, 0.662 · Tile: 21, 13 · Region: sec_13 — Heath Reach`, and water hits read `Water (impassable)`.
- A 35-point pointer sweep agreed with the tilemap at every point that hit the sphere.
- The seam is where the readout says it is: 6 px west of the u = 0 meridian picks column 59, and 6 px east picks column 0.

The one practical limit is human, not mathematical. Pole-row tiles are tiny wedges, so they are hard to point at. Hover is per tile, and region selection would be built on the same mapping. Nothing is wired into gameplay or the region-selection UI, and there are no per-region meshes.

### E. Did anything suggest Three.js is unnecessarily heavy or inappropriate?

**At runtime it is light. The cost is download size and the module format.**

- **Runtime.** The globe is one draw call with 16,128 triangles and costs about 0.1–0.15 ms of JavaScript per frame. One hover raycast against the 16k-triangle sphere costs about 0.8 ms, and it runs only when the pointer moves or the globe turns. It holds a steady 60 fps on the GPU (AMD Radeon Pro 5700 XT through ANGLE/OpenGL). With Chromium's headless software renderer (SwiftShader) it averages about 45 fps (22 ms frames).
  - Generating a planet (about 0.35–0.5 s, BLOOM's own validator work) and drawing the texture (2–6 ms) both cost far more than rendering.
  - Neither happens inside the render loop.
- **Download size.** The vendored build is 751 KB minified, or about 187 KB gzipped (`three.core.min.js` 101 KB, `three.module.min.js` 87 KB). The spike uses a small part of it: renderer, scene, camera, sphere geometry, canvas texture, two materials, a raycaster and one line. Without a build step BLOOM cannot tree-shake, so the full build ships.
- **Module format.** Three.js ships only as ES modules, and its UMD browser build was removed upstream. BLOOM boots over `file://` today (`index.html`, `demo-run.html`), and ES modules plus import maps do not load there. **This is the one real conflict with BLOOM's current architecture.**
- **Alternative.** The spike shows that a textured sphere with idle spin and UV picking is a small amount of code. If the download or the http requirement matters more than Three.js conveniences (lighting, mipmaps, future atmosphere), a dependency-free 2D-canvas orthographic globe is a viable alternative. It is not recommended or built here.
- **Controls.** OrbitControls was not used. Turning the globe rather than the camera keeps the light fixed, makes "the user is interacting" exact for the idle logic, and kept rotation to about 100 lines.

### F. What would need to change before this could become a reusable production PlanetSphereView?

1. **A design decision on the seam and the poles, before any engineering.**
   - The options all change product scope:
     - keep the seam and avoid showing it (limit yaw, or start the globe facing away from it);
     - keep the 2D map authoritative and use the globe only as a non-decision view (for example in the Terraform room);
     - have the generator keep the map edges and pole rows as water or ice;
     - wrap the grid.
   - Generator edge or pole margins and wrapping both change topology, the validators and the goldens, so each needs explicit authorization.
   - Painting the seam over is not an honest option.
2. **The 3:2 map against the 2:1 texture.** Either accept wide equator tiles, or change the grid ratio. Changing the grid ratio is a generator decision.
3. **Module loading.** Choose one: serve BLOOM over http, add a bundling step, or keep the globe as an http-only feature. Without one of these the globe cannot load wherever BLOOM must still boot over `file://`.
4. **One palette.** The base-appearance colours are copied from `demo-run.html` into `demos/planet-sphere/planet-projection.js` and marked as prototype-only. They should move into a shared render module that both the 2D map and the globe import, so the two cannot drift apart.
5. **Live state.** Plants, density and region highlights would need redraws that only happen when the state changes. A full 480×240 upload is cheap at a few redraws per second, but it must never become a per-frame upload.
6. **Region readability.** Draw region borders and selection or hover highlights into the texture or as an overlay. Route picks through the production region-selection API rather than the debug readout.
7. **Hardening.** Add WebGL context-loss and restore handling, pinch-zoom on touch, a no-WebGL fallback, and hooks into the life cycle of whatever room owns the globe. Resize, DPR cap, dispose and reduced motion already exist and are tested.
8. **QA.** The behavioural checks in `qa-planet-sphere.js` (idle timing traces, reduced motion, raycast round-trips, resize roundness, dispose memory) are written to be reused.

## Interaction behaviour (as built)

- **Dragging.** Pointer drag turns the globe: horizontal drag turns it around the poles, vertical drag tilts it up to ±90° so the poles can be inspected. The globe eases towards the pointer (τ ≈ 90 ms) and keeps turning briefly after release with a decaying fling (τ ≈ 0.35 s). A point under the pointer at the centre moves with the pointer.
- **Idle rotation.** When the globe is untouched it turns slowly, about one revolution per minute (6°/s).
  - Any pointer, wheel, keyboard or preset-view input stops it within the same frame.
  - It resumes 3 s after interaction ends, counted from when any fling has settled. It eases back in over 1.5 s.
  - QA traced it frame by frame: still until +2.8 s, resumed at +3.04 s, idle factor 0.02 → 0.11 over the first 0.4 s.
- **Reduced motion.** With `prefers-reduced-motion: reduce` there is no idle rotation and no fling, and preset views jump instead of animating. Manual drag still works.
- **Other controls.** The wheel zooms, arrow keys turn the globe when it has focus, and preset buttons show Front, Opposite (which is the seam), Face seam, North pole and South pole.
- **Resize.** A ResizeObserver resizes the drawing buffer to the container. The camera aspect is updated so nothing stretches, and portrait containers fit the globe to their width.
- **Device pixel ratio.** It is capped at 2: DPR 2 renders at 2× and DPR 3 also renders at 2×.
- **Dispose.** `dispose()` cancels the animation loop, removes listeners, disconnects the ResizeObserver, frees the geometries, materials, texture and renderer, forces context loss and removes the canvas. QA checks that renderer memory goes to 0 geometries and 0 textures, that the loop stops, and that a recreated view renders.
- **Debug readout.** It shows:
  - planet name and id, source, archetype, public seed, attempt, generation seed and validated layers;
  - water %, section and landmass counts;
  - logical map 60×40;
  - texture size, px per tile and aspect;
  - the seam's location (u = 0 ≡ 1, longitude ±180°, column x = 0 | x = 59) and its row statistics and colour step;
  - the view centre's longitude and latitude, and how far away the seam is;
  - the idle state;
  - CSS size, buffer size and DPR (used, device and cap);
  - texture-upload and frame counters;
  - timings.

  The panel also shows the texture canvas with the seam edges in magenta and a crosshair on the tile under the pointer.

## Test results

**Spike QA** (`docs/evidence/planet-sphere-spike/qa-planet-sphere.js`; results in `qa-results.json`): **37 / 37 passed**. It covers:

- isolation (N1, N2): only spike paths changed, and the simulation, generator, validators, content, tools, goldens and production UI are untouched;
- UV ↔ tile math on all 2400 tiles;
- the documented launch path;
- the real production planet (Node and browser identical);
- the 60×40 logical map and the exact 2:1 texture;
- the texture being drawn from the data;
- WebGL rendering with a round silhouette;
- drag rotation, idle on, idle stopped while dragging, idle resuming after the delay, and a gentle resume;
- raycast picking (land gets the tilemap's section ID, water gets water), real pointer hover, and the hover sweep;
- no per-frame uploads, and exactly one upload per planet switch;
- seam location and both seam worlds;
- resize at 900×700, 1500×900, 390×844 and 1280×800;
- dispose;
- reduced motion;
- the DPR cap;
- the 960×480 texture;
- a Firefox smoke test.

There are no exact-pixel GPU assertions. Screenshots are evidence only.

**Existing BLOOM QA** (every suite in the README's QA list, run on this branch): **all 16 suites green, 736 checks, 0 failures**. The suites are sim 19, gen 47, crossing 14, archetype 40, strategy 36, desert 64, frozen 70, dying-world 63, slice 15, surface 11, procedural-run 32, colony-development 68, economy 39, native-competition 66, volatile-climate 78 and game-flow 74. Every suite exited with code 0, and per-suite totals are in `docs/evidence/planet-sphere-spike/existing-qa-summary.txt`. No golden was regenerated.

Headless Chromium logs a `GL Driver Message … GPU stall due to ReadPixels` *warning*. A bare WebGL clear loop on a blank page logs the same warning, so it comes from the headless compositor and not from this code. It is a warning, not an error.

## Screenshots (`docs/evidence/planet-sphere-spike/`)

| File | What it shows |
|---|---|
| `01-front.png` | Ocean Archipelago 13, front of the globe, idle-rotating, with the readout |
| `02-opposite-side-seam-centred.png` | the opposite side, which is the seam (u = 0 ≡ 1) |
| `03-seam-frozen9-marker.png` · `03b-…-no-marker.png` | seam test world Frozen 9, seam 30° off centre, with and without the debug marker |
| `03c-seam-frozen9-centred.png` | Frozen 9 with the seam centred: a lake cut by a straight meridian |
| `03d-seam-desert4-centred.png` | Desert 4: land on both edges, region-colour break only |
| `04-north-pole.png` · `05-south-pole.png` | poles at normal zoom (Ocean 13) |
| `04b-north-pole-frozen9-zoom.png` · `05b-south-pole-frozen9-zoom.png` · `04c-north-oblique-frozen9.png` | pole pinwheel close up, and oblique |
| `06-hover-raycast-land.png` · `06b-hover-readout-panel.png` | hover diagnostic (UV, tile, region) and the readout with the texture crosshair |
| `07-desert25-dpr2.png` | Desert 25 at device pixel ratio 2 |
| `08-phone-390.png` | 390 px phone layout |
| `09-frozen22-tex960-closeup.png` | 960×480 texture close up |
| `10-demo-run-2d-ocean13.png` · `11-demo-run-2d-frozen9.png` | the same worlds in the existing 2D map, for comparison |

## Changed files

All changes are new spike files plus three README lines:

- `demos/planet-sphere-spike.html` — the developer demo page.
- `demos/planet-sphere/planet-projection.js` — planet → 2:1 texture, and UV → tile → region. Pure ES module, prototype-only palette copy.
- `demos/planet-sphere/planet-sphere-view.js` — the `PlanetSphereView` prototype: Three.js globe, drag and idle rotation, raycast, resize, dispose.
- `demos/planet-sphere/vendor/three-0.185.1/` — `three.module.min.js`, `three.core.min.js`, `LICENSE`, `README.md`.
- `docs/evidence/planet-sphere-spike/` — `qa-planet-sphere.js`, `qa-results.json`, `seam-pole-survey.js`, `seam-pole-survey.json` and the screenshots.
- `docs/PLANET_SPHERE_SPIKE_v1.md` — this report.
- `README.md` — a pointer to the spike in "Next steps", one line in the file map, and the QA command.

Nothing under `resources/`, `content/`, `planets/`, `tools/` (including the goldens) changed. `index.html`, `demos/demo-run.html`, `demos/demo-surface.html`, `demos/ui-mockups/` (Concept 17 included) and `GAME_BIBLE.md` are also unchanged. QA check N2 enforces this.
