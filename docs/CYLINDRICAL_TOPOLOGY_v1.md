# Cylindrical Geography (BLOOM-027A foundation · BLOOM-027B generator)

**Milestones:** BLOOM-027A (foundation, `agent/bloom-027a-cylinder-topology` `ae9c780` from main `b704961`) · **BLOOM-027B** (cylindrical procedural generation, `agent/bloom-027b-cylinder-generator` from `ae9c780`) · **Project:** Cylindrical Planet Topology
**Status:** 027A complete and PMO-accepted. **027B complete (§10): every procedural planet is generated as a cylinder.** The production sphere renderer is still a separate spike (not integrated); poles are out of scope by owner decision (§10.9).

## 1. Why

The Planet Sphere spike (`agent/planet-sphere-spike`, report `docs/PLANET_SPHERE_SPIKE_v1.md` at `75101e1`) wrapped BLOOM's flat 60×40 map around a freely rotating globe and found that the map's topology, not Three.js, is the problem:

- the left/right edge of the map becomes a visible meridian seam on most procedural worlds (14.6 of 40 seam rows have land on one side and water on the other, on average; no region ever spans the seam);
- tiles that touch across that seam on the globe are **not neighbours** in gameplay — Spread, adjacency and water crossings all treat `x = 0` and `x = W − 1` as hard edges, so a globe used for decisions would show regions that look connected and are not;
- raycast UV → tile/region lookup works, so the picking side needs nothing new.

A globe is a cylinder closed at the poles: longitude wraps, latitude does not. BLOOM's geography has to say so in one place.

## 2. The two topologies

| | rectangle (legacy) | cylinder |
|---|---|---|
| data | no `topology` field (First Bloom, every planet the generator emits today) | `topology: { wrapX: true, wrapY: false }` |
| west of `x = 0` | none | `x = W − 1`, same row |
| east of `x = W − 1` | none | `x = 0`, same row |
| north of `y = 0` · south of `y = H − 1` | none | none |
| flattened map | what you see is the whole geography | the two side edges are the same meridian |

`wrapY` is **reserved**: it may be written as `false` but `true` is refused by both the engine and the validator ("a planet is a cylinder, never a torus"). A wrapping planet needs `gridWidth ≥ 3`. Unknown keys and non-boolean values are refused, so a typo can never leave a planet silently rectangular.

Nothing infers wrapping from anything else (not from `procedural`, not from size). A planet wraps only when its data says so.

## 3. One neighbour rule — `BLOOM.geo`

All of it lives in `resources/bloom-sim.js` and is exported as `BLOOM.geo` for the generator, validator, witness, demos and the coming BLOOM-027B generator:

```
RECT, CYLINDER                       frozen plain data: { wrapX, wrapY }
normalizeTopology(t)                 → RECT | CYLINDER | an error string (never throws)
topologyOf(planet)                   → RECT | CYLINDER (throws on bad data or gridWidth < 3 with wrapX)

west(t, W, topo)  east(t, W, topo)   neighbouring tile index or -1, allocation-free
north(t, W)       south(t, W, H)     (never wrap under any topology)
neighbors4(t, W, H, topo)            the existing cardinal neighbours, in the engine's historical order west, east, north, south
forEachNeighbor4(t, W, H, topo, fn)  same without allocating
wrapDx(a, b, W, topo)                shortest signed horizontal offset from column b to column a (a − b on a rectangle)
longitudeCenter(colCount, W, topo)   wrap-aware mean column of a tile set (see §5)

components(mask, W, H, topo = RECT)
sectionAdjacency(tilemap, W, H, SC, topo = RECT)
sectionPieces(tilemap, W, H, SC, topo = RECT)
waterCrossings(tilemap, W, H, maxGap, topo = RECT)
reachableLandmasses(startMass, links)              (unchanged)
```

Every geometry function takes the topology **last and defaults to the rectangle**, so a caller that passes nothing (the generator today, older tools) is unchanged. `BLOOM.resolveLayout(planet, config)` now also returns `topology`, and `sim.map.topology` carries it, so every consumer judges the same tiles the same way.

## 4. What changed in geometry and simulation

Every place that used to test `x > 0` / `x < W − 1` itself now reads the shared rule:

| system | before | now |
|---|---|---|
| `components()` (landmasses, pieces) | 4 inline edge tests | `west/east/north/south` — a run leaving at `x = W − 1` and continuing at `x = 0` is **one** component on a cylinder |
| `sectionAdjacency()` | compared `x+1` and `y+1` only | compares `east(t)` and `south(t)` — two **different** sections touching only across the seam are neighbours |
| `sectionPieces()` | via `components()` | one section on both sides of the seam whose tiles connect across it is **one** piece |
| `waterCrossings()` | own `nb` closure | `neighbors4()` + cylindrical landmasses — a strait may cross longitude zero; land directly adjacent across the seam is one landmass and never a crossing |
| `reachableLandmasses()` | — | unchanged; its input links now reflect cylindrical water geography |
| `growVoronoi()` (authored planets) | `px − cx` | `wrapDx` — the horizontal distance to a seed is the short way round |
| region centres `sim.map.CENT` | arithmetic mean | rectangle: the same arithmetic mean, bit-for-bit · cylinder: `longitudeCenter` (§5) |
| origin seeding | distance to the centroid | `wrapDx` to the centroid (a seam-centred origin is sown around the seam) |
| plant spread (tick step 2) | 4 inline edge tests before the RNG draw | `west/east/north/south` — a Living tile at `x = W − 1` pushes into `x = 0` on a cylinder |
| native competition `NB` | own `nb4` closure | `neighbors4()` — fronts, crowding, native spread and native seeding all see the seam |
| native patch spacing | `c % W − t % W` | `wrapDx` |
| validator | rectangular `BLOOM.geo` calls | validates `topology`, passes it to every geography call, echoes it in `stats.topology` **only when the planet declares one** (legacy records are byte-identical) |
| witness | rectangular `waterCrossings` | passes `sim.map.topology` |

**RNG discipline.** On a rectangle the new helpers return exactly the old neighbours in the old order, so the spread step counts the same Living neighbours, computes the same pressure and draws the RNG the same number of times. No RNG draw was added to any legacy path. On a cylinder a seam tile may have one more eligible neighbour; that is the intended new relationship, not a pacing change. Spread probability, pacing constants, competition tuning and every number in `content/` are untouched.

## 5. Region centre on a cylinder

A region on columns `57, 58, 59, 0, 1, 2` of a 60-wide world has an arithmetic-mean centre at `x = 30` — the far side of the planet. `longitudeCenter` instead unwraps the occupied columns across the widest run of **empty** columns (the region's own far side) and averages there: that region centres at `x = 0.0`, the seam. A region that never touches the seam gets exactly its old centre (the empty run contains the seam, so unwrapping is the identity). The vertical centre is ordinary.

Deterministic fallbacks, both tested: equally wide empty runs → the first one met walking east from the lowest occupied column; a region occupying **every** column has no empty run and takes the arithmetic mean (no longitude is more central than another). The rectangle keeps its arithmetic mean through the original code path, so First Bloom's golden `cent` values are untouched.

## 6. Seam contact does not merge regions

```
AA........................BB      A and B stay different regions. They become NEIGHBOURS.
AA........................AA      one region on both sides of the seam: ONE cylindrical piece, centre on the seam.
```

There is no post-processing that unifies ids because they touch across the seam. Which tiles belong to one region is the generator's decision at region-growth time; BLOOM-027B will assign one owner id when a region genuinely grows across the seam. This foundation understands both pictures correctly and never infers "same region" from contact.

## 7. What has intentionally NOT changed

- Procedural generation (`resources/bloom-gen.js`): still rectangular, still emits no `topology` field. Elevation noise is not periodic, archetype tuning, polar terrain, map size and the 60×40 default are untouched. Every generated planet, every archetype fixture world and every 3000-tick fixture run is **byte-identical** to main (§9).
- First Bloom's authored geography and its golden: unchanged, bit-for-bit.
- Three.js and the sphere spike branch: untouched; the sphere is not in the production UI.
- Concepts 17 / 18, every UI behaviour, every balance constant, every scenario: untouched. The 2D demos still draw the flattened map; their edge strokes are rendering, not geography.
- No equal-area projection, no gameplay redesign.

## 8. BLOOM-027B — cylindrical procedural generation (done; see §10)

The generator now opts its planets into `topology: { wrapX: true, wrapY: false }`, samples the elevation and moisture noise periodically in x, grows regions through `BLOOM.geo` so one owner id can span the seam, and the same validator judges them cylindrically. §10 records the change, its evidence and the fixture re-pins it required.

## 9. Evidence

Branch `agent/bloom-027a-cylinder-topology`, worktree `_worktrees/bloom-027a-cylinder`. Starting SHA `b704961` (main = origin/main, clean). Final SHA: see the closing commit of this branch (recorded in `README.md`'s status table).

**Changed files:** `resources/bloom-sim.js` (topology + the neighbour rule + every consumer), `resources/bloom-validate.js`, `resources/bloom-witness.js`, new `tools/topology-check.js`, this note, `README.md`, `GAME_BIBLE.md` (one paragraph), `docs/evidence/bloom-027a/*`.

**New suite — `node tools/topology-check.js` (52 checks, ~3 s):**

| group | proves |
|---|---|
| 0 contract | absent field = RECT; `{ wrapX: true }` = CYLINDER; torus / unknown key / non-boolean / width < 3 refused by engine and validator; First Bloom has no topology and its centres equal the golden; `neighbors4` ≡ `forEachNeighbor4`; corner neighbours under both topologies; `wrapDx` |
| A component wrap | land split across `x = 0` / `x = W − 1`: rectangle 2 components, cylinder 1 |
| B same section across the seam | `sectionPieces` rectangle 2 / cylinder 1; validator: rectangle error, cylinder valid with 1 landmass; engine: one region, no neighbours, centre `x = 0.0` |
| C different sections | A~B not neighbours on the rectangle, neighbours on the cylinder; ids never merge; declared A~B valid on the cylinder, a fabricated link fails on the rectangle, and a diagonal-only seam contact fails on the cylinder too |
| D ordinary spread | Living column at `x = W − 1`: cylinder reaches `x = 0` (tick 6) and region B; rectangle never does in 3000 ticks; with no land on the seam the cylinder run equals the rectangle run with the same RNG draw count; explicit `{ wrapX: false }` = legacy |
| E water | 12-wide interior gap vs 2-wide seam strait: rectangle no link, cylinder gap-2 link crossing longitude zero (all landing pairs cross the seam); validator reachability flips accordingly; Waterborne Seeds colonize B on the cylinder only; land adjacent across the seam is one landmass with no crossing |
| F native competition | player stands at `x = W − 1` and native stands at `x = 0`: contact `[4, 4]` on the cylinder after one tick, `[0, 0]` on the rectangle; tiles change hands across the seam only on the cylinder |
| G vertical non-wrap | `y = 0` and `y = H − 1` are 2 components, not neighbours, no north/south neighbour at any corner; the only path is a 3-tile water crossing; a full Living top row never seeds the bottom row |
| H centre | `x = 57…2`: rectangle 30.0 (legacy), cylinder 0.0; origin sown on columns 57–2; interior region identical under both; full-ring and tie fallbacks deterministic |
| I generator unchanged | three raw planets and the three archetype fixture worlds equal main `b704961` byte-for-byte; none carries a topology; validator records unchanged |

**Legacy engine comparison — `docs/evidence/bloom-027a/legacy-engine-compare.js`:** the `b704961` engine and this engine, in separate vm contexts, run First Bloom and the Ocean 13 / Desert 25 / Frozen 22 fixtures under all four scenarios, plain and rich (32 runs × 3000 ticks). All 32 are identical in state/density/native/Biomass/crossing traces, in **total RNG draw count**, and in derived maps (centres, neighbours, landmasses, crossing links). Results: `legacy-engine-compare.json`.

**Procedural snapshot — `docs/evidence/bloom-027a/procedural-snapshot.js`:** 160 raw generator planets (40 seeds × 4 parameter sets) and their validator records, 120 raw archetype attempts and 120 accepted archetype worlds (3 archetypes × 40 public seeds), and 32 fixture runs. `procedural-snapshot-baseline-b704961.json` (from a clean main checkout) and `procedural-snapshot-after.json` are byte-identical.

**Existing suites (all green, totals unchanged):** see the table in the closing report below.

| suite | checks | result |
|---|---|---|
| sim-check (First Bloom golden bit-for-bit) | 19 | PASS |
| gen-check | 47 | PASS |
| crossing-check | 14 | PASS |
| **topology-check (new)** | **52** | PASS |
| archetype-check | 40 | PASS |
| strategy-check | 36 | PASS |
| slice-check | 15 | PASS |
| surface-check | 11 | PASS |
| procedural-run-check | 32 | PASS |
| colony-development-check | 68 | PASS |
| desert-check | 64 | PASS |
| frozen-check | 70 | PASS |
| dying-world-check | 63 | PASS |
| economy-check | 39 | PASS |
| native-competition-check | 66 | PASS |
| volatile-climate-check | 78 | PASS |
| game-flow-check | 74 | PASS |
| **total** | **788** (736 existing, unchanged + 52 new) | all green |

Raw totals: `docs/evidence/bloom-027a/qa-suites-summary.txt` (Node 20.20.2, Playwright under `npm root -g`, macOS 12 / Darwin 21.6).

**Determinism notes.** Legacy worlds: same RNG sequence (proved above). Cylindrical fixtures: a seam tile can have one more Living neighbour than its flattened picture suggests, so a cylindrical world's run naturally differs from the same tiles read as a rectangle — that is the point. Native seeding draws from the planet-keyed RNG and is unchanged on rectangles; on a cylinder its patch spacing is wrap-aware. The validator's `stats.topology` appears only for planets that declare a topology, so every pinned legacy validator record keeps its hash.


---

## 10. BLOOM-027B — cylindrical procedural generation

**Branch:** `agent/bloom-027b-cylinder-generator`, worktree `_worktrees/bloom-027b-cylinder-gen`, from `ae9c780` (027A; main was still `b704961`). Final SHA: see `docs/evidence/bloom-027b/README.md`.
**Evidence:** `docs/evidence/bloom-027b/` (surveys, RNG comparison, periodic-noise proof, lattice-phase scan, re-pin data, fixture-change log, flat-map captures, QA totals).

### 10.1 What a generated planet is now

Every planet `BLOOM.generatePlanet` emits — and therefore every archetype attempt and every production World Seed — carries

```
topology: { wrapX: true, wrapY: false }      // plain data, = BLOOM.geo.CYLINDER
```

from the moment it is generated. The flat 60 × 40 map is a cut-open view of one continuous cylindrical world: x = 0 and x = W − 1 are adjacent columns, latitude is bounded. A landmass, a section or a coastline may cross the cut; the cut is where the picture was cut, not a geographic boundary. First Bloom (authored) declares no topology and is bit-for-bit unchanged (golden).

### 10.2 Periodic terrain and moisture noise — by construction

`resources/bloom-gen.js › octave()` is the only noise sampler; `elevationField()` sums three octaves of it and is called twice per planet (terrain, then moisture), so both fields are periodic in x by the same construction. The sampler:

- draws the lattice exactly as before — `(cols + 1) × (rows + 1)` `rng()` values, row-major — so the generator's **RNG stream keeps its shape** (§10.5);
- treats the horizontal lattice as a **ring of `cols` cells**: lattice column `cols` *is* column 0 (the circle closes), so the closing column of each row is drawn but never read;
- maps a column to a position on that circle, `gx = x / W · cols + LATTICE_PHASE`, with x = W the same place as x = 0 — every grid column, x = W − 1 included, is an ordinary interior sample, and the step W − 1 → 0 is the same kind of step as any other adjacent pair (the two columns are neighbours, **not** the same place; nothing asserts `field[y][0] === field[y][W−1]`);
- keeps y exactly as it was: `gy = y / (H − 1) · rows`, bounded, with the Portion-1 lattice clamp on the last row;
- exposes `at(u, y)` (through `BLOOM.gen.noise`, a narrowly scoped test hook, not a product API) so a test can sample the *same* field at a continuous column, including past the right edge, and prove `at(u ± W, y) = at(u, y)` and continuity across the cut (`tools/cylinder-gen-check.js` 5–7).

**Lattice phase.** With the ring closing exactly at longitude zero, x = 0 sits on a lattice node of *every* octave at once (the legacy rectangle had both its edges there, where the smoothstep slope is zero), which would make the cut the one systematically **smoothest** column boundary of every world — special in the other direction (terrain step 0.44× an ordinary boundary, rank 0.10; coast crossings 0.39×). `LATTICE_PHASE = 1/3` of a cell turns the ring so the cut lands at the median interior boundary (step 1.06×, rank 0.55; coast crossings 1.05×). It is a fixed constant, not a draw, and the field stays periodic. The scan that chose it: `docs/evidence/bloom-027b/lattice-phase-scan.{js,json}`.

**No seam repair of any kind.** No column copying, no edge averaging, no blur, no water strip, no post-generation pass, no region merging. `tools/cylinder-gen-check.js` 18 audits the source: no `x > 0` / `x < W − 1` / `t ± 1` edge test survives in `bloom-gen.js`, and every `components`, `waterCrossings` and `sectionAdjacency` call passes the topology.

### 10.3 Cylindrical geography in the generator — through `BLOOM.geo` only

| stage | before (rectangular) | now |
|---|---|---|
| landmasses (initial, after islet removal, after reachability cleanup) | `components(isLand, W, H)` | `components(…, CYLINDER)` — land continuing from x = W − 1 onto x = 0 is **one** landmass |
| reachability cleanup (`maxCrossingGap`) | `waterCrossings(…)` | `waterCrossings(…, CYLINDER)` — a strait may cross longitude zero; an island only in Waterborne range across the cut is kept |
| section seeds (farthest point) | `(x − sx)²` | `wrapDx(x, sx, W, CYLINDER)²` — a tile at x = 1 knows a seed at x = 59 is two columns away |
| region growth (multi-source BFS) | 4 inline edge tests | `forEachNeighbor4(t, W, H, CYLINDER, …)` — an owner reaching x = W − 1 continues onto x = 0: **one section id on both sides of the cut**, decided at growth time |
| coast detection | 4 inline edge tests | `neighbors4(t, W, H, CYLINDER)` — west of x = 0 is x = W − 1; the cut is never a coast; top/bottom rows unchanged |
| section neighbours | `sectionAdjacency(…)` | `sectionAdjacency(…, CYLINDER)` — two different sections touching only across the cut are neighbours; ids never merge |
| output | no `topology` | `topology: { wrapX: true, wrapY: false }` |

Two different owners meeting at the cut stay two sections (`AA……BB`); one owner that grew through it is one section (`AA……AA`). Nothing infers "same section" from contact.

### 10.4 Determinism and World Seeds

The generator is deterministic: identical code, seed, archetype and parameters give an identical planet (raw `generatePlanet`, every archetype attempt, and the production `generateFromArchetype` retry path with winnability — `tools/cylinder-gen-check.js` 3, `docs/evidence/bloom-027b/seam-survey-after.json` repeats every one of 160 + 120 worlds). No `Math.random`, no clock.

**World Seed compatibility — an intentional break.** Procedural World Seed N no longer reproduces its pre-027B rectangular world; it reproduces the same new cylindrical world every time. No migration machinery was added (the project is in active development). 36 of 40 Ocean Archipelago, 15 of 40 Desert World and 21 of 40 Frozen World public seeds now accept at a different attempt (`docs/evidence/bloom-027b/seam-survey.md`); Ocean accepts 40/40 (was 36/40).

### 10.5 RNG discipline

Each noise field consumes 143 draws (12 + 35 + 96 lattice values) in both the ae9c780 generator and this one — the ring's closing column is drawn and not read — so the terrain and moisture fields sit at the same positions of the RNG stream as before (`docs/evidence/bloom-027b/rng-draw-compare.{js,json}`, 36 parameter sets, both trees instrumented identically in separate vm contexts). Draws *between* and *after* the fields (seed picks, per-section conditions, names) depend on the generated geometry (landmass count, coast fractions, short-circuited salt/volcanic draws), which is exactly what the cylinder legitimately changes, so per-world totals differ; the stream was preserved where preserving it was meaningful.

### 10.6 Seam survey (before / after)

`docs/evidence/bloom-027b/seam-survey.js` reads both trees' worlds **cylindrically** (160 raw worlds + 3 archetypes × seeds 1–40 through the production path). Summary (`seam-survey.md`):

- before, the cut was a wall: 0 of 280 worlds had a section spanning it; the terrain field jumped 10–14× an ordinary column step there; every pair that would touch across it on a globe was missing from gameplay;
- after, nearly every world has sections whose single id sits on both sides of the cut (one piece under the cylinder, two if read as a rectangle); pairs touching *only* across the cut are rare (region borders no longer end there); the terrain step across the cut is 1.04–1.13× an ordinary boundary and ranks at the median; land/water flips along the cut match the interior mean; 0 broken sections; all 120 production worlds validate as cylinders.

### 10.7 First Bloom, 60 × 40, balance

First Bloom: no topology, golden bit-for-bit (`tools/sim-check.js`). Default logical grid 60 × 40, 2400 tiles, win denominator and threshold unchanged (`tools/cylinder-gen-check.js` 20). No balance constant, archetype datum, scenario datum or validation rule was changed (§10.8 lists every test-side change).

### 10.8 Fixtures and pins that changed, and why

See `docs/evidence/bloom-027b/fixture-changes.md` for the complete list with reasons. In short: raw fixture seeds whose islands joined the mainland across the cut were re-picked for the same role (gen-check / crossing-check: 2024 → 5, 25 → 119); the shared archetype fixture worlds moved where their new worlds no longer fill the roles the suites prove on them — Ocean 13 → **28**, Desert 25 → **17**, Frozen 22 → **11** (plus Ocean 30 for Native Competition's ocean world, Frozen 9 as the Dying World extinction world, and Frozen 4 / Desert 22 as Volatile Climate's own worlds) — each chosen by running the mechanism suites against every accepted world of the archetype; natural negative fixtures (layer 4/6/7/8, bad-origin, generation-failure) were re-picked by role from full per-attempt scans; every generator-dependent hash pin was recomputed with each suite's own hashing (`repin.js`); the economy study's per-world recipes were regenerated from the fixtures' proven strategies and its "was" baselines re-measured on the new worlds under the pre-BLOOM-013 economy.

A number of mechanism checks selected their test instance (a region, a colony, a schedule, a snap size) in a way that only the old fixture worlds satisfied; those now search the fixture worlds / a small parameter range for an instance, with the claim unchanged, and say so in the check. Every such change is listed in `fixture-changes.md` §6. No balance constant, archetype datum, scenario datum, price or validation rule changed.

**Gameplay observations worth the owner's eye** (none acted on): under the cylindrical generator origins are safer refuges on average (bigger landmasses give the origin search more choices: no Ocean world's idle Dying World run dies out — under the old generator exactly one of 36 did, and it happened to be the fixture); 5 of 24 Native Competition sweep worlds seed less native cover than the configured range because the per-landmass cap binds once landmasses merge; a proven Terraform-heavy Volatile Climate strategy that meets a real shock exists on ~2 of 40 Frozen worlds under either generator.

### 10.9 Out of scope by owner decision

- **Poles.** The production globe will only yaw around its vertical axis; players never tilt it to the poles. No polar-cap system, no pole adjacency, no north/south wrap, no equal-area weighting, no reserved top/bottom rows. Y is an ordinary bounded axis; any distortion of the extreme rows on a sphere is accepted.
- **3:2 grid vs 2:1 texture.** The sphere spike's 480 × 240 texture may keep stretching the 60 × 40 map; the presentation question is deferred.
- **Sphere integration.** `agent/planet-sphere-spike` (`75101e1`) is untouched and not in production; Concept 18, the production UI and the menu/tutorial flow are unchanged. A follow-up will combine this generator with the renderer for visual validation.
