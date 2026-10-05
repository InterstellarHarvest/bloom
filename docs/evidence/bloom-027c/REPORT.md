# BLOOM-027C — Cylindrical Sphere Validation · evidence report

Technical validation only. Nothing here is integrated into gameplay, Terraform, menus or tutorials. Nothing is merged or released.

## Provenance

| | |
|---|---|
| Repository | InterstellarHarvest/bloom |
| Starting SHA | `f6bca30` (BLOOM-027B, branch `agent/bloom-027b-cylinder-generator`, on top of accepted 027A `ae9c780`) |
| `main` when inspected | still `b704961` (checked with `git fetch` before branching) |
| Branch / worktree | `agent/bloom-027c-sphere-validation` · `_worktrees/bloom-027c-sphere` |
| Commits | `e7fd512` spike files brought forward verbatim · `FINAL_SHA` 027C changes + evidence |
| Sphere spike source | `agent/planet-sphere-spike`, implementation commit `fa0063f` (report `75101e1`) |

**How the spike was brought forward.** The spike diff (`6c0357b..fa0063f`) is purely additive, so it can't overwrite any 027B file. Only the demo itself was copied, with `git checkout fa0063f -- demos/planet-sphere-spike.html demos/planet-sphere/`. That covers the page, `planet-sphere-view.js`, `planet-projection.js` and the vendored `three@0.185.1`. It is committed unchanged as `e7fd512`, so the 027C diff reads cleanly on top. The spike's docs, old screenshots and its README lines were **not** brought forward. Three.js stays vendored as it was.

**Isolation.** The QA check N2 confirms that `resources/`, `content/`, `planets/`, `tools/`, `index.html`, `demos/demo-run.html`, `demos/demo-surface.html`, `demos/ui-mockups/` (Concept 17/18), `GAME_BIBLE.md` and `README.md` are byte-identical to `f6bca30`. The generator, gameplay, balance, map size and topology are untouched.

## Launch

```
cd _worktrees/bloom-027c-sphere
python3 -m http.server 8766
open "http://localhost:8766/demos/planet-sphere-spike.html?planet=ocean6&view=cut&seam=1"
```

URL options: `planet=` (preset: `ocean6 ocean36 frozen7 desert5 desert25 frozen25 ocean40 ocean15 ocean13`), or `archetype=<id>&seed=<n>`.
`view=cut` starts with longitude zero facing the camera.
Developer diagnostics: `seam=1` longitude-zero line · `bounds=1` section boundaries · `cols=1` seam columns · `grid=1` tile grid · `hl=<section id>` highlight · `idle=0`.
Clicking (without dragging) on land highlights that section.

Port 8766, because 8765 is still held by an older server from the spike worktree. That server was left alone.

## What changed (027C)

- **Yaw only** (`planet-sphere-view.js`). Pitch is a constructor constant (default 0, equator-on) that no input changes.
  - Horizontal drag, ←/→, fling, idle spin and `lookAt(u)` all move yaw only.
  - Vertical drag, ↑/↓ and PgUp do nothing.
  - Idle delay/ramp, the interaction stop and reduced-motion behaviour are unchanged from the spike.
  - The rotation is still the spike's own; there are no OrbitControls.
- **Topology-aware picking** (`planet-projection.js`). `uvToTile` / `regionAtUV` read `planet.topology.wrapX`. On a cylinder u = 1 is column 0; on a legacy rectangle it clamps to 59.
- **Two picking robustness fixes found during validation** (`pickAt`):
  1. Three.js `SphereGeometry` seam vertices at u = 0 and u = 1 differ by about 1e-16 (sin 2π ≠ 0). A ray *exactly* on longitude zero slipped between the two seam triangles and returned **null**. No other meridian does this. When the mesh raycast misses, `pickAt` now falls back to an analytic ray–sphere hit. Away from the seam that fallback agrees with the mesh tile 1483/1488 times, with max |Δu| 1.6e-3.
  2. The camera isn't in the scene graph, so a pick between `setZoom` and the next frame used a stale camera matrix. `pickAt` now updates it.
- **Developer diagnostics** (spike panel only): longitude-zero line, seam-column tint, section boundaries, tile grid, section highlight, and yaw / cut-offset / topology readouts. They are drawn into the texture: one upload per toggle, never per frame. The boundary overlay takes neighbours from the planet's topology, so the x = 59 | x = 0 pair is drawn exactly as an interior pair is (QA N6).
- 60×40 logical grid and 480×240 (2:1) texture unchanged. The 3:2 vs 2:1 mismatch is not addressed.

## Survey — 3 archetypes × public seeds 1–40 (production path, winnability on)

`seam-cases-survey.js` → `seam-cases-survey.json`. Every world's row pattern across the cut is recorded (S same section · D different sections · c coast · ~ water).

| | Ocean Archipelago | Desert World | Frozen World |
|---|---|---|---|
| accepted / cylinders / 60×40 | 40 / 40 / 40 | 40 / 40 / 40 | 40 / 40 / 40 |
| worlds with one section id on both sides of the cut | 38 | 40 | 40 |
| worlds with different sections meeting at the cut | 22 | 39 | 34 |
| worlds with a coastline crossing the cut | 39 | 17 | 26 |
| worlds with water through the cut | 40 | 15 | 19 |
| mean cut rows (same / different / coast / water, of 40) | 13.2 / 0.9 / 2.9 / 23.2 | 32.9 / 4.1 / 0.7 / 2.3 | 32.3 / 3.2 / 1.3 / 3.2 |

### Evidence set (picked from the survey, all in the well-visible latitude band)

| case | world | across the cut |
|---|---|---|
| landmass + same-id section + coastline | Ocean 6 (Pallas-161) | one island, rows 11–20, all `sec_13` Moss Steppe; coasts cross the cut north and south |
| landmass span | Ocean 36 (Umbra-288) | `sec_1` Sun Steppe rows 15–29, water above and below |
| strong same-id section | Frozen 7 (Ymir-853) | `sec_9` Spring Moraine rows 8–22, 82 / 75 tiles in each map half |
| strong same-id section | Desert 5 (Vesper-656) | `sec_0` Cinder Reach, 145 / 144 tiles in each map half |
| different sections meet | Desert 25 (Umbra-584) | `sec_4` Saffron Pan \| `sec_11` Stone Reach, rows 13–19 |
| different sections meet | Frozen 25 (Hollow-329) | `sec_4` \| `sec_8`, rows 21–26 |
| water through the cut | Ocean 40 (Borea-179) | 40 / 40 rows water |

### Screenshots (1280×800, cut centred unless stated)

- `01a/01b` Ocean 6, plain / with the longitude-zero line and Moss Steppe highlighted
- `02a/02b` Ocean 36 · `03a/03b` Frozen 7 · `04a/04b` Desert 5 (b adds boundaries)
- `05a/05b` Desert 25 and `06a/06b` Frozen 25, plain / with section boundaries
- `07a/07b` Ocean 40, plain / with the seam columns tinted
- `12-rotation-strip-{ocean6,desert25,frozen7}` the cut sweeping across the face at 60° left, 30° left, centred, 30° right and 60° right (plain)
- `08a/08b/08c` stretch judgement: map centre plain, with tile grid, and zoomed to the equator with tile grid
- `09` Ocean 15: section `sec_5` Scorch Rise is highlighted and centred in longitude, yet no part of it is visible (see G)
- `10a/10b` yaw-only: before / after a diagonal drag. The pole stays top-centre and the readout shows pitch 0.
- `11a/11b` Ocean 6, pointer 3 px west / east of the cut: tile (59, 16) and tile (0, 16), both `sec_13`
- `11c/11d` Desert 25: tile (59, 17) `sec_4` Saffron Pan / tile (0, 17) `sec_11` Stone Reach

## QA

`NODE_PATH="$(npm root -g)" node docs/evidence/bloom-027c/qa-sphere-validation.js [--shots]` → `qa-results.json`: **27 / 27 passed** (6 Node + 20 Chromium + 1 Firefox), 0 failed.

- **Node.** Isolation (N1, N2). Evidence worlds are 60×40 cylinders (N3). UV ↔ tile round-trips 2400/2400, with u = 1 ≡ column 0 (N4). `regionAtUV` at u = 1 − ε / ε matches the tilemap in 280/280 rows (N5). The boundary overlay treats the cut like an interior pair, 40/40 rows (N6).
- **Yaw only (B2, B3).**
  - Pitch is exactly 0 and the tilt quaternion is identity through diagonal drag, vertical drag, ↑/↓/PgUp, ←/→ and wheel zoom.
  - Pure vertical drag changes yaw by 1e-6 or less.
  - The projected north pole stays at screen x = 0 (top-centre) through every drag.
  - Idle spin is horizontal only. It stops on interaction and resumes **3.00 s** after release, reaching full speed at 4.50 s.
- **Picking at the cut (B4, B6, F1).**
  - Every world in the evidence set, every on-screen row, with the cut at 0° and ±30°, probed ±1 px and at the two nearest tile centres: **1372/1372** picks resolve to the authoritative region on the correct side.
  - Breakdown: 790 same-id row picks returned one id, 126 different-section row picks returned their two ids, 420 water picks returned water, 36 coast picks were correct.
  - A ray exactly on the meridian returns an adjacent cut tile every time (1372/1372; the analytic fallback was used 252×).
  - Real pointer hover gives the same results. Firefox: 34/34.
- **Regression.**
  - No texture upload while rotating; exactly one per diagnostic toggle (B5, B8).
  - No console errors or failed requests (B7, B13).
  - A steady drag moves the globe every frame, in one direction (B9).
  - Resize to 900×700 and to a 390×844 phone keeps the globe round (B10).
  - DPR is capped at 2 on a 3× display (B11).
  - Reduced motion: no idle spin, no fling, instant `lookAt`, pitch 0 (B12).
- **18 BLOOM suites** (`run-all-suites.sh` → `qa-suites-summary.txt`): **18 / 18 suites green, 823 checks passed, 0 failed** (identical per-suite counts to 027B).

**Performance** (1 draw call, 16 128 triangles, 480×240 texture):

| | mean frame | p95 frame | JS per frame | pick |
|---|---|---|---|---|
| idle rotation, AMD Radeon Pro 5700 XT (ANGLE/Metal) | 16.67 ms | 16.8 ms | 0.10 ms | 0.78 ms |
| idle rotation, headless SwiftShader | 16.76 ms | 16.8 ms | 0.07 ms | 0.71 ms |
| scripted 60 Hz drag (SwiftShader) | 17.9 ms | 20.5 ms | – | – |

Both renderers hold 60 fps.

## Answers

**A. Is longitude zero now visually indistinguishable from an ordinary map boundary while the planet rotates?**
Geographically, yes. In the plain screenshots and rotation strips, land, sections, coasts and water pass through the cut with nothing marking it. The cut is only findable with the debug line switched on.

One cosmetic tell remains, and it comes from the renderer, not the topology. The base-appearance dither copied from `demo-run.html` uses patterns whose x-period doesn't divide 60: water `(x+y)%7`, dunes period 9, frost period 32. Their diagonal rhythm therefore jumps phase at x = 59 → 0. It is faint in normal viewing, but visible on large open water if you look for it (`07a`: the stripes form a chevron at the cut). The fix belongs in the production renderer: use dither periods that divide W, or a per-tile hash. It was not changed here, so the cut is neither hidden nor masked.

**B. Do seam-spanning landmasses look continuous?** Yes. Ocean 6's island and Ocean 36's landmass are one shape through longitude zero (`01*`, `02*`, rotation strip). Read as a rectangle, each would be two pieces.

**C. Do seam-spanning same-ID sections look continuous?** Yes. With a section highlighted (Moss Steppe, Sun Steppe, Spring Moraine, Cinder Reach), it shows as one contiguous region straddling the cut, not two edge fragments (`01b`, `02b`, `03b`, `04b`).

**D. Do different sections meeting at the cut remain correctly distinct?** Yes. They stay distinct exactly as they would at an interior boundary. With boundaries on, the boundary running along the cut has the same weight as interior boundaries and joins them seamlessly (`05b`, `06b`). Picking returns the two separate ids (`11c/11d`).

In the plain base palette, neighbouring sections often have near-identical colours — most of all in Desert. That is equally true at interior boundaries, so it is not a cut issue.

**E. Are coastlines and water continuous through the cut?** Yes. Ocean 6's north and south coasts run straight across, and Ocean 40 is water from pole to pole across the cut. The only exception is the water-dither rhythm noted under A.

**F. Does UV → tile → region remain reliable on both sides of the cut?** Yes: 1372/1372 picks, both sides, three cut positions, two browsers. Same-id gives one id, different sections give their own ids, and water gives water.

Validation found and fixed one real defect: a ray exactly on longitude zero could miss the mesh. The analytic fallback fixes it. For production, analytic ray–sphere picking is the simpler choice overall.

**G. Does yaw-only interaction eliminate the practical pole problem?**
It removes pole *inspection*: there is no view over the top, no pinch and no singularity. But it creates a **polar blind band**:

- With pitch fixed at 0, a point is visible only within acos(1/d) of the view direction, at any yaw.
- At the default camera distance d = 4.2 that limit is 76.2°. Map rows **0–2 and 37–39 are never on screen**, at any yaw.
- Rows 0–1 / 38–39 stay hidden even at maximum zoom-out (d = 6, 80.4°). QA check B4d measures this directly.
- About **14–15% of all land tiles** in every archetype sit in that band.
- **11 of 40 Ocean Archipelago worlds** (seeds 5, 8, 11, 15, 21, 23, 24, 28, 32, 33, 35) have a **whole section** entirely inside it. Those sections can't be seen or picked at the default zoom. Ocean 15's `sec_5` can't be reached at any zoom (`09`).
- Desert and Frozen: 0 worlds with a hidden section. No origin section is ever hidden.

**H. Is the 60×40 → 2:1 stretch acceptable in normal viewing?** **Not noticeable.**

- Each tile spans 6° of longitude × 4.5° of latitude, so it is about 1.33:1 wide at the equator.
- Tiles become square near ±41° and narrow further north and south.
- That variation is the same latitude-dependent change every sphere map shows, and limb foreshortening dominates it.
- Tiles have no outlines in normal viewing. Only the debug tile grid (`08b`, `08c`) makes the 1.33:1 measurable; the plain view (`08a`) gives no sense of stretched tiles.
- It does not need correcting before integration. One caveat is under I.

**I. Is any topology/projection blocker left before turning the spike into a reusable production PlanetSphereView?**

- **Topology: no blocker.** The cylinder reads correctly on the globe for geometry, regions and picking.
- **Projection: one decision is required first — the polar blind band from G.** A production globe that can't show or pick up to 15% of the map, including whole sections on some Ocean worlds, isn't viable as the main view. Options (none implemented here):
  1. **Latitude-band mapping.** Map the 40 rows into roughly ±70° and draw decorative caps beyond that. Projection-only, and keeps yaw-only. But rows become about 3.5°, so equator tiles stretch to about 1.7:1 and H needs re-judging. This is the one place the 3:2 vs 2:1 question bites.
  2. **Generator keeps the polar rows non-playable** (ice cap or water). Generation and balance change; out of scope here.
  3. **A small permitted pitch range.** Conflicts with the owner's yaw-only decision.
  4. **A flat map for selecting polar regions.**

  Recommendation: decide this together with the 3:2 / 2:1 question, since option 1 is the natural projection-side fix and it changes the stretch answer.
- **Non-blocking for production:** dither periods that wrap (A), analytic picking (F), and picks that respect the camera between frames (fixed here).
