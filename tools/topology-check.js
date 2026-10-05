// BLOOM — cylindrical topology checks (BLOOM-027A). Plain Node, production modules only.
//
//   node tools/topology-check.js
//
// One explicit topology ({ wrapX, wrapY }; absent = the legacy rectangle) and ONE cardinal-neighbour rule (BLOOM.geo) that
// every geography-sensitive system reads. Hand-built maps isolate one rule each and are run under BOTH topologies: the
// rectangle must behave exactly as before, the cylinder must wrap longitude and never latitude. Lettered fixtures A–H follow
// the directive; the other groups pin the contract, the RNG sequence of legacy worlds and the (still rectangular) generator.
"use strict";
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
for (const f of ["content/config.js", "content/traits.js", "content/archetypes.js", "content/scenarios.js", "planets/first_bloom.js",
  "resources/bloom-sim.js", "resources/bloom-gen.js", "resources/bloom-validate.js", "resources/bloom-witness.js", "resources/bloom-archetype.js"])
  require(path.join(ROOT, f));
const { BLOOM, BLOOM_DATA } = globalThis, { config, traits, archetypes, scenarios } = BLOOM_DATA;
const GOLD = require("./golden/scenarios.js"), GOLDEN = require("./golden/first_bloom.json");
const geo = BLOOM.geo, { RECT, CYLINDER } = geo, XC = config.crossing, GAP = XC.maxGap;
const CROSS_ID = traits.find(t => t.effect.type === "crossing").id, NC = scenarios.find(s => s.id === "native_competition");
const J = JSON.stringify, mul = GOLD.mulberry32;
const fnv = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return (h >>> 0).toString(16).padStart(8, "0"); };
let fails = 0; const t0 = Date.now();
const check = (ok, name, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); if (!ok) fails++; };
const throws = fn => { try { fn(); return null; } catch (e) { return e.message; } };

// ---- fixture builder: rows of characters. '.' = water; a letter = a land section with that id (the same letter anywhere on
// the map is the SAME section). `topology` is written to the planet only when given, exactly as authored data would carry it.
const GOOD = { tempOffset: 0, moistureOffset: 0, light: 70, ph: 6.8, salinity: 0, toxicity: 0, radiation: 8, nutrients: 60 };
function mapPlanet(rows, { topology, origin, locals = {}, neighbors = null, id = "fixture" } = {}) {
  const H = rows.length, W = rows[0].length, letters = [];
  for (const r of rows) { if (r.length !== W) throw new Error("ragged fixture"); for (const ch of r) if (ch !== "." && !letters.includes(ch)) letters.push(ch); }
  const tilemap = [], area = Object.fromEntries(letters.map(l => [l, 0]));
  for (const r of rows) for (const ch of r) { if (ch === ".") tilemap.push(-1); else { tilemap.push(letters.indexOf(ch)); area[ch]++; } }
  const sections = letters.map(l => ({ id: l, name: "Region " + l, isOrigin: l === origin, area: area[l], local: locals[l] || GOOD,
    ...(neighbors ? { neighbors: neighbors[l] || [] } : {}) }));
  return { id, name: id, gridWidth: W, gridHeight: H, origin: origin || letters[0], globalClimate: { temperature: 10, moisture: 50 }, sections, tilemap,
    ...(topology ? { topology } : {}) };
}
const landMask = p => Array.from(p.tilemap, v => v >= 0 ? 1 : 0);
const T = (x, y, W) => y * W + x, col = (t, W) => t % W;
const both = fn => ({ rect: fn(RECT), cyl: fn(CYLINDER) });
const withTopo = (rows, topo, o = {}) => mapPlanet(rows, { ...o, topology: topo === RECT ? undefined : { wrapX: true, wrapY: false } });
const countingRng = seed => { const r = mul(seed), f = () => { f.draws++; return r(); }; f.draws = 0; return f; };
const validate = (p, o = {}) => BLOOM.validatePlanet(p, config, { traits, ...o });
// run `ticks` from a hand-set start: every land tile Barren except `living` (Living at full density); returns per-tick firsts
function runFrom(planet, { living, ticks, seed = 3, scenario = null, setup = null, watch = () => false }) {
  const rng = countingRng(seed), sim = BLOOM.createSim(planet, config, traits, { rng, scenario });
  sim.state.fill(sim.BAR); sim.dens.fill(0); for (const t of living) { sim.state[t] = sim.LIV; sim.dens[t] = 1; }
  if (setup) setup(sim);
  let firstWatched = null;
  for (let k = 1; k <= ticks; k++) { sim.tick(); if (firstWatched === null && watch(sim)) firstWatched = k; }
  return { sim, firstWatched, draws: rng.draws };
}
const livingCols = sim => new Set(Array.from(sim.state).map((v, t) => v === sim.LIV ? col(t, sim.map.W) : -1).filter(x => x >= 0));

console.log(`# topology contract: planet.topology = { wrapX, wrapY } · absent = RECT ${J(RECT)} · CYLINDER ${J(CYLINDER)} · wrapY must stay false`);

// ---- 0 · the contract
{
  check(geo.topologyOf({ gridWidth: 60 }) === RECT && RECT.wrapX === false && RECT.wrapY === false && Object.isFrozen(RECT) && Object.isFrozen(CYLINDER),
    "0.1 · a planet without a topology field is the legacy rectangle (RECT is frozen plain data)");
  check(geo.topologyOf({ gridWidth: 60, topology: { wrapX: true, wrapY: false } }) === CYLINDER && geo.topologyOf({ gridWidth: 60, topology: { wrapX: true } }) === CYLINDER
    && geo.topologyOf({ gridWidth: 60, topology: { wrapX: false } }) === RECT && geo.topologyOf({ gridWidth: 60, topology: {} }) === RECT,
    "0.2 · topology: { wrapX: true } opts a planet into the cylinder; wrapX false / {} stay rectangular");
  const bad = [geo.normalizeTopology({ wrapX: true, wrapY: true }), geo.normalizeTopology({ wrapx: true }), geo.normalizeTopology("cylinder"), geo.normalizeTopology({ wrapX: 1 }),
    throws(() => geo.topologyOf({ gridWidth: 2, topology: { wrapX: true } }))];
  check(/torus/.test(bad[0]) && /unknown key/.test(bad[1]) && /must be an object/.test(bad[2]) && /wrapX must be/.test(bad[3]) && /gridWidth ≥ 3/.test(bad[4]),
    "0.3 · refused: wrapY = true (not a torus), an unknown key, a non-object, a non-boolean, a wrapping planet narrower than 3 columns", bad.map(b => `"${b}"`).join(" · "));
  const torus = mapPlanet(["AAAA", "AAAA", "AAAA"], { topology: { wrapX: true, wrapY: true } });
  const vt = validate(torus), st = throws(() => BLOOM.createSim(torus, config, traits));
  check(!vt.ok && vt.errors.some(e => /torus/.test(e)) && /torus/.test(st), "0.4 · validator and engine both refuse a torus planet", vt.errors[0]);
  const fb = BLOOM_DATA.planets.first_bloom, vfb = validate(fb), sfb = BLOOM.createSim(fb, config, traits, { rng: mul(1) });
  check(fb.topology === undefined && sfb.map.topology === RECT && vfb.ok && vfb.stats.topology === undefined,
    "0.5 · First Bloom has no topology field: it runs as a rectangle and its validator record carries no topology entry (unchanged record)");
  check(J(sfb.map.CENT.map(c => [c.x, c.y])) === J(GOLDEN.static.map.cent) && J(Array.from(sfb.map.AREA)) === J(GOLDEN.static.map.area),
    "0.6 · First Bloom's region centres and areas equal the golden (the rectangle's centroid path is unchanged; the full golden is sim-check's job)");
  const vc = validate(withTopo(["AA..AA", "AA..AA"], CYLINDER, { origin: "A" }));
  check(vc.ok && J(vc.stats.topology) === J({ wrapX: true, wrapY: false }), "0.7 · a planet that declares a topology gets it echoed in validator stats", J(vc.stats.topology));
}

// ---- 0b · the one neighbour rule
{
  const W = 5, H = 4, all = [];
  for (let t = 0; t < W * H; t++) for (const topo of [RECT, CYLINDER]) { const a = geo.neighbors4(t, W, H, topo), b = []; geo.forEachNeighbor4(t, W, H, topo, u => b.push(u)); all.push(J(a) === J(b)); }
  check(all.every(Boolean), "0.8 · neighbors4 and forEachNeighbor4 agree on every tile of a 5×4 grid under both topologies");
  const nw = both(tp => geo.neighbors4(T(0, 0, W), W, H, tp)), se = both(tp => geo.neighbors4(T(4, 3, W), W, H, tp)), mid = both(tp => geo.neighbors4(T(2, 1, W), W, H, tp));
  check(J(nw.rect) === J([1, 5]) && J(nw.cyl) === J([4, 1, 5]) && J(se.rect) === J([18, 14]) && J(se.cyl) === J([18, 15, 14]) && J(mid.rect) === J(mid.cyl) && J(mid.cyl) === J([6, 8, 2, 12]),
    "0.9 · corners: rectangle has no neighbour past x = 0 / x = W − 1; cylinder gives x = 0 a west neighbour at x = W − 1 (same row) and vice versa; interior tiles identical",
    `NW rect ${J(nw.rect)} cyl ${J(nw.cyl)} · SE rect ${J(se.rect)} cyl ${J(se.cyl)}`);
  check(geo.west(0, W, RECT) === -1 && geo.west(0, W, CYLINDER) === 4 && geo.east(4, W, RECT) === -1 && geo.east(4, W, CYLINDER) === 0
    && geo.north(2, W) === -1 && geo.south(T(2, 3, W), W, H) === -1 && geo.north(T(2, 1, W), W) === 2 && geo.south(2, W, H) === 7,
    "0.10 · west / east / north / south return -1 for no neighbour; north of y = 0 and south of y = H − 1 are -1 under every topology");
  check(geo.wrapDx(1, 58, 60, RECT) === -57 && geo.wrapDx(1, 58, 60, CYLINDER) === 3 && geo.wrapDx(58, 1, 60, CYLINDER) === -3 && geo.wrapDx(30, 0, 60, CYLINDER) === 30 && geo.wrapDx(12, 5, 60, CYLINDER) === 7,
    "0.11 · wrapDx: plain difference on a rectangle; the short way round on a cylinder (half a turn stays +W/2)");
}

// ---- A · component wrap
console.log("\n# A · component wrap");
{
  const rows = ["............", "AA........AA", "AA........AA", "............"], W = 12;
  const c = both(tp => geo.components(landMask(mapPlanet(rows)), W, 4, tp));
  check(c.rect.sizes.length === 2 && J(c.rect.sizes) === J([4, 4]), "A.1 · rectangle: the land split between x = 0 and x = W − 1 is 2 components", J(c.rect.sizes));
  check(c.cyl.sizes.length === 1 && c.cyl.sizes[0] === 8 && c.cyl.id[T(0, 1, W)] === c.cyl.id[T(11, 1, W)], "A.2 · cylinder: the same land is 1 component (x = 0 and x = W − 1 are adjacent)", J(c.cyl.sizes));
}

// ---- B · same section across the seam
console.log("\n# B · same section across the seam");
{
  const rows = ["............", "AA........AA", "AA........AA", "............"], W = 12;
  const pieces = both(tp => geo.sectionPieces(mapPlanet(rows).tilemap, W, 4, 1, tp));
  check(J(pieces.rect) === J([2]) && J(pieces.cyl) === J([1]), "B.1 · sectionPieces: one section id on both sides of the seam is 2 pieces on the rectangle, 1 piece on the cylinder", `rect ${J(pieces.rect)} cyl ${J(pieces.cyl)}`);
  const v = both(tp => validate(withTopo(rows, tp, { origin: "A" })));
  check(!v.rect.ok && v.rect.errors.some(e => /split into 2 pieces/.test(e)), "B.2 · validator, rectangle: the flattened two-piece section is (still) an error", v.rect.errors[0]);
  check(v.cyl.ok && v.cyl.stats.landmasses === 1 && v.cyl.stats.brokenSections === 0, "B.3 · validator, cylinder: the seam-spanning section is ONE contiguous piece — its two-piece flattened appearance is not an error",
    `landmasses ${v.cyl.stats.landmasses}, errors ${J(v.cyl.errors)}`);
  const s = BLOOM.createSim(withTopo(rows, CYLINDER, { origin: "A" }), config, traits, { rng: mul(1) });
  check(s.map.SC === 1 && s.map.NBRS[0].length === 0 && s.map.LANDMASS[0] === 0 && Math.abs(s.map.CENT[0].x) < 1e-9 && s.map.topology === CYLINDER,
    "B.4 · engine, cylinder: one region, no neighbours, one landmass, centre exactly on the seam (x = 0.0)", `CENT ${J(s.map.CENT[0])}`);
}

// ---- C · different sections across the seam
console.log("\n# C · different sections across the seam (ids stay separate; they become neighbours)");
{
  const rows = ["............", "AA........BB", "AA........BB", "............"], W = 12;
  const adj = both(tp => geo.sectionAdjacency(mapPlanet(rows).tilemap, W, 4, 2, tp));
  check(J(adj.rect) === J([[], []]) && J(adj.cyl) === J([[1], [0]]), "C.1 · sectionAdjacency: A and B touch only across the seam — not neighbours on the rectangle, neighbours on the cylinder", `rect ${J(adj.rect)} cyl ${J(adj.cyl)}`);
  const s = BLOOM.createSim(withTopo(rows, CYLINDER, { origin: "A" }), config, traits, { rng: mul(1) });
  check(s.map.SC === 2 && s.map.TILEMAP[T(0, 1, W)] !== s.map.TILEMAP[T(11, 1, W)] && J(s.map.NBRS) === J([[1], [0]]) && s.map.LANDMASS[0] === s.map.LANDMASS[1],
    "C.2 · engine, cylinder: A and B keep their own ids (seam contact never merges regions), are neighbours, and share one landmass");
  const declared = { neighbors: { A: ["B"], B: ["A"] }, origin: "A" }, v = both(tp => validate(withTopo(rows, tp, declared)));
  check(v.cyl.ok && v.cyl.stats.declaredAdjacency.matched === 2, "C.3 · validator, cylinder: declaring A~B as neighbours is TRUE geography across the seam", J(v.cyl.stats.declaredAdjacency));
  check(!v.rect.ok && v.rect.errors.filter(e => /declared neighbours but do not touch/.test(e)).length === 2, "C.4 · validator, rectangle: the same declaration is a fabricated neighbour relationship and fails", v.rect.errors[0]);
  // a fabricated relationship under the cylinder: A and B on different rows only meet diagonally across the seam → not neighbours
  const diag = ["............", "AA..........", "..........BB", "............"], vd = validate(withTopo(diag, CYLINDER, declared));
  check(!vd.ok && vd.errors.filter(e => /declared neighbours but do not touch/.test(e)).length === 2 && J(geo.sectionAdjacency(mapPlanet(diag).tilemap, W, 4, 2, CYLINDER)) === J([[], []]),
    "C.5 · validator, cylinder: regions that only meet DIAGONALLY across the seam are not neighbours — a declared link still fails", vd.errors[0]);
}

// ---- D · ordinary plant spread
console.log("\n# D · ordinary plant spread across the seam");
{
  const rows = ["BB........AA", "BB........AA", "BB........AA", "BB........AA"], W = 12, H = 4; // 8 water columns between: no Waterborne path either
  const seam = Array.from({ length: H }, (_, y) => T(W - 1, y, W)), colB0 = tiles => tiles.some(t => col(t, W) === 0);
  const r = both(tp => runFrom(withTopo(rows, tp, { origin: "A" }), { living: seam, ticks: 3000, watch: sim => Array.from(sim.state).some((v, t) => v === sim.LIV && col(t, W) === 0) }));
  const cols = { rect: [...livingCols(r.rect.sim)].sort((a, b) => a - b), cyl: [...livingCols(r.cyl.sim)].sort((a, b) => a - b) };
  check(r.cyl.firstWatched !== null && cols.cyl.includes(0) && cols.cyl.includes(1) && r.cyl.sim.livingCountBySection()[r.cyl.sim.map.SIDX.B] > 0,
    "D.1 · cylinder: a Living column at x = W − 1 spreads to compatible land at x = 0 on the same rows, then on into region B (ordinary spread, no crossing trait)",
    `first x = 0 Living at tick ${r.cyl.firstWatched}; Living columns ${J(cols.cyl)}`);
  check(r.rect.firstWatched === null && !cols.rect.includes(0) && !cols.rect.includes(1) && r.rect.sim.livingCountBySection()[r.rect.sim.map.SIDX.B] === 0 && cols.rect.includes(10),
    "D.2 · rectangle: the same start never reaches x = 0 (region B stays empty for 3000 ticks) while x = W − 2 is colonized as before",
    `Living columns ${J(cols.rect)}`);
  // legacy RNG: when no land touches the seam the cylinder is neighbour-for-neighbour the rectangle → the same draws, the same run
  const inner = ["..AA....BB..", "..AA....BB..", "..AA....BB..", "..AA....BB.."], live = [T(2, 0, W), T(3, 1, W)];
  const trace = sim => fnv(Array.from(sim.state).join("") + "|" + Array.from(sim.dens).join(",") + "|" + sim.biomass);
  const q = both(tp => runFrom(withTopo(inner, tp, { origin: "A" }), { living: live, ticks: 2000, seed: 11 }));
  const explicit = runFrom(mapPlanet(inner, { origin: "A", topology: { wrapX: false, wrapY: false } }), { living: live, ticks: 2000, seed: 11 });
  check(q.rect.draws === q.cyl.draws && trace(q.rect.sim) === trace(q.cyl.sim) && q.rect.draws > 100,
    "D.3 · determinism: with no land on the seam, the cylinder run equals the rectangle run bit-for-bit with the SAME number of RNG draws (wrapping adds no draws by itself)",
    `${q.rect.draws} draws each, trace ${trace(q.rect.sim)}`);
  check(explicit.draws === q.rect.draws && trace(explicit.sim) === trace(q.rect.sim), "D.4 · an explicit topology { wrapX: false } is exactly the legacy rectangle (same draws, same run)");
}

// ---- E · water
console.log("\n# E · Waterborne Seeds geography across the seam");
{
  // A at x = 0–1, B at x = 12–13: 10 water columns between them on the flattened map (> maxGap) but only 2 across the seam
  const rows = Array.from({ length: 4 }, () => "AA..........BB.."), W = 16, H = 4;
  const cr = both(tp => geo.waterCrossings(mapPlanet(rows).tilemap, W, H, GAP, tp));
  check(cr.rect.links.length === 0 && cr.rect.landmassSizes.length === 2, `E.1 · rectangle: the only water path is ${W - 4} tiles wide (> maxGap ${GAP}) — no crossing`, J(cr.rect.links));
  const seamPair = ([s, t]) => (col(s, W) <= 1 && col(t, W) >= 12) || (col(s, W) >= 12 && col(t, W) <= 1);
  check(J(cr.cyl.links) === J([{ from: 0, to: 1, gap: 2 }, { from: 1, to: 0, gap: 2 }]) && cr.cyl.pairs.length > 0 && cr.cyl.pairs.every(p => seamPair(p) && p[2] >= 2 && p[2] <= GAP),
    "E.2 · cylinder: the shortest Waterborne path crosses longitude zero — a 2-tile strait links the two landmasses, and every landing pair crosses the seam", `${J(cr.cyl.links)} · ${cr.cyl.pairs.length} pairs, gaps ${J([...new Set(cr.cyl.pairs.map(p => p[2]))].sort())}`);
  const v = both(tp => validate(withTopo(rows, tp, { origin: "A" })));
  check(!v.rect.stats.reach.requiresCrossing && J(v.rect.stats.reach.strongest.strandedSections) === J(["B"]) && v.cyl.stats.reach.requiresCrossing && v.cyl.stats.reach.strongest.strandedSections.length === 0,
    "E.3 · validator: B is unreachable on the rectangle even with Waterborne Seeds, reachable with it on the cylinder (ordinary spread cannot: water between)",
    `rect ${J(v.rect.stats.reach.strongest.strandedSections)} · cyl crossing links ${J(v.cyl.stats.reach.crossingLinks)}`);
  const seamA = Array.from({ length: H }, (_, y) => T(0, y, W));
  const r = both(tp => runFrom(withTopo(rows, tp, { origin: "A" }), { living: seamA, ticks: 4000, seed: 5, setup: s => { s.biomass = 1e9; s.buy(CROSS_ID); } }));
  const liv = x => x.sim.livingCountBySection()[x.sim.map.SIDX.B];
  check(r.cyl.sim.crossing.footholds > 0 && liv(r.cyl) > 0, "E.4 · engine, cylinder: Waterborne Seeds bought through sim.buy carry the colony across the seam strait and B is colonized",
    `${r.cyl.sim.crossing.footholds} foothold(s), B ${liv(r.cyl)}/${r.cyl.sim.map.AREA[r.cyl.sim.map.SIDX.B]} living`);
  check(r.rect.sim.crossing.arrivals === 0 && liv(r.rect) === 0, "E.5 · engine, rectangle: no seed pressure ever reaches B (4000 ticks)", `arrivals ${r.rect.sim.crossing.arrivals}, B ${liv(r.rect)} living`);
  // land directly adjacent across the seam is ordinary connected land, never a crossing — even though a 3-tile strait exists inland
  const touch = Array.from({ length: 3 }, () => "AA...BBBBBBB"), W2 = 12, c2 = both(tp => geo.waterCrossings(mapPlanet(touch).tilemap, W2, 3, GAP, tp));
  check(c2.rect.landmassSizes.length === 2 && c2.rect.links.length === 2 && c2.rect.links[0].gap === 3, "E.6 · rectangle: A and B are two landmasses joined by a 3-tile crossing", J(c2.rect.links));
  check(c2.cyl.landmassSizes.length === 1 && c2.cyl.links.length === 0 && c2.cyl.pairs.length === 0,
    "E.7 · cylinder: the same A and B touch across the seam — ONE landmass, no crossing at all (ordinary connected land)", `landmasses ${c2.cyl.landmassSizes.length}`);
  check(J(geo.reachableLandmasses(0, cr.cyl.links)) === J(new Set([0, 1])) && [...geo.reachableLandmasses(0, cr.rect.links)].length === 1,
    "E.8 · reachableLandmasses is unchanged in kind: it follows whatever links the (cylindrical) water geography supplies");
}

// ---- F · native competition
console.log("\n# F · native competition contact across the seam");
{
  const rows = ["BB........AA", "BB........AA", "BB........AA", "BB........AA"], W = 12, H = 4;
  const seamA = Array.from({ length: H }, (_, y) => T(W - 1, y, W)), seamB = Array.from({ length: H }, (_, y) => T(0, y, W));
  const start = sim => { sim.competition.native.fill(0); for (const t of seamB) sim.competition.native[t] = 0.8; };
  const r = both(tp => runFrom(withTopo(rows, tp, { origin: "A" }), { living: seamA, ticks: 1, seed: 7, scenario: NC, setup: start }));
  const contact = x => Array.from(x.sim.competition.regionTiles.contact);
  check(J(contact(r.cyl)) === J([H, H]), "F.1 · cylinder: player stands at x = W − 1 and native stands at x = 0 are a FRONT — every tile on both sides counts as contact after one tick", `contact per region ${J(contact(r.cyl))}`);
  check(J(contact(r.rect)) === J([0, 0]), "F.2 · rectangle: the same stands are not in contact", `contact per region ${J(contact(r.rect))}`);
  const long = both(tp => runFrom(withTopo(rows, tp, { origin: "A" }), { living: seamA, ticks: 2500, seed: 7, scenario: NC, setup: start }));
  const F = x => x.sim.competition.flips, crossed = x => x.sim.competition.native.some((d, t) => d > 0 && col(t, W) >= 10) || Array.from(x.sim.state).some((v, t) => v === x.sim.LIV && col(t, W) <= 1);
  check(crossed(long.cyl) && (F(long.cyl).playerTook + F(long.cyl).nativeTook) > 0, "F.3 · cylinder: over 2500 ticks the front moves across the seam — tiles change hands between the organisms",
    `flips ${J(F(long.cyl))}`);
  check(!crossed(long.rect) && F(long.rect).playerTook === 0 && F(long.rect).nativeTook === 0, "F.4 · rectangle: no tile ever changes hands and neither organism appears on the other's side (2500 ticks)", `flips ${J(F(long.rect))}`);
}

// ---- G · vertical non-wrap
console.log("\n# G · latitude never wraps (a cylinder, not a torus)");
{
  const rows = ["AAAAAAAA", "........", "........", "........", "BBBBBBBB"], W = 8, H = 5;
  const c = geo.components(landMask(mapPlanet(rows)), W, H, CYLINDER), adj = geo.sectionAdjacency(mapPlanet(rows).tilemap, W, H, 2, CYLINDER);
  check(c.sizes.length === 2 && J(adj) === J([[], []]), "G.1 · cylinder: land on y = 0 and land on y = H − 1 are 2 components and not neighbours");
  const top = geo.neighbors4(T(3, 0, W), W, H, CYLINDER), bot = geo.neighbors4(T(3, H - 1, W), W, H, CYLINDER), nw = geo.neighbors4(0, W, H, CYLINDER), se = geo.neighbors4(W * H - 1, W, H, CYLINDER);
  check(J(top) === J([T(2, 0, W), T(4, 0, W), T(3, 1, W)]) && J(bot) === J([T(2, 4, W), T(4, 4, W), T(3, 3, W)]) && J(nw) === J([W - 1, 1, W]) && J(se) === J([W * H - 2, (H - 1) * W, W * H - 1 - W]),
    "G.2 · cylinder: y = 0 has no north neighbour and y = H − 1 no south neighbour, including at the seam corners", `top ${J(top)} bottom ${J(bot)} NW ${J(nw)} SE ${J(se)}`);
  const cr = geo.waterCrossings(mapPlanet(rows).tilemap, W, H, GAP, CYLINDER);
  check(J(cr.links) === J([{ from: 0, to: 1, gap: 3 }, { from: 1, to: 0, gap: 3 }]), "G.3 · cylinder: the only way from the top row to the bottom row is a 3-tile WATER crossing (the rows are not adjacent)", J(cr.links));
  const r = runFrom(withTopo(rows, CYLINDER, { origin: "A" }), { living: Array.from({ length: W }, (_, x) => x), ticks: 3000, seed: 2 });
  check(r.sim.livingCountBySection()[1] === 0 && r.sim.livingCountBySection()[0] === W, "G.4 · cylinder: a full Living top row never seeds the bottom row by ordinary spread (3000 ticks)", `B ${r.sim.livingCountBySection()[1]} living`);
}

// ---- H · cylindrical centre
console.log("\n# H · region centre on a cylinder");
{
  const W = 60, row = "AAA" + ".".repeat(54) + "AAA", rows = [".".repeat(W), row, row, ".".repeat(W)]; // x = 57,58,59,0,1,2
  const s = both(tp => BLOOM.createSim(withTopo(rows, tp, { origin: "A" }), config, traits, { rng: mul(1) }));
  check(Math.abs(s.rect.map.CENT[0].x - 30) < 1e-9, "H.1 · rectangle (legacy): the flattened arithmetic mean puts the centre at x = 30.0 — unchanged", `x ${s.rect.map.CENT[0].x}`);
  check(Math.abs(s.cyl.map.CENT[0].x) < 1e-9 && Math.abs(s.cyl.map.CENT[0].y - 2) < 1e-9, "H.2 · cylinder: the wrap-aware centre is x = 0.0 (the seam), y ordinary", `CENT ${J(s.cyl.map.CENT[0])}`);
  const seeded = Array.from(s.cyl.state).map((v, t) => v === s.cyl.LIV ? col(t, W) : -1).filter(x => x >= 0);
  check(seeded.length === Math.min(config.grow.seedTiles, 12) && seeded.every(x => Math.abs(geo.wrapDx(x + .5, 0, W, CYLINDER)) <= 3),
    "H.3 · cylinder: the origin is sown around the SEAM centre (columns 57–2), not around x = 30", `seeded columns ${J([...new Set(seeded)].sort((a, b) => a - b))}`);
  const hist = cols => { const h = new Int32Array(W); for (const [x, n] of cols) h[x] = n; return h; };
  const inner = hist([[10, 2], [11, 2], [12, 2], [13, 2], [14, 2], [15, 2]]), ring = hist(Array.from({ length: W }, (_, x) => [x, 1])), tie = hist([[0, 1], [30, 1]]);
  check(geo.longitudeCenter(inner, W, CYLINDER) === geo.longitudeCenter(inner, W, RECT) && geo.longitudeCenter(inner, W, RECT) === 13,
    "H.4 · longitudeCenter: a region that does not touch the seam has the same centre under both topologies (13.0)");
  check(geo.longitudeCenter(ring, W, CYLINDER) === 30 && geo.longitudeCenter(ring, W, RECT) === 30,
    "H.5 · longitudeCenter fallback: a region on EVERY column has no empty run and takes the arithmetic mean (deterministic, documented)");
  check(geo.longitudeCenter(tie, W, CYLINDER) === 45.5 && geo.longitudeCenter(tie, W, CYLINDER) === geo.longitudeCenter(tie, W, CYLINDER),
    "H.6 · longitudeCenter tie rule: two equally wide empty runs → the first met walking east from the lowest occupied column (x = 0 & 30 → 45.5), stable", `${geo.longitudeCenter(tie, W, CYLINDER)}`);
  const wrapHist = hist([[57, 2], [58, 2], [59, 2], [0, 2], [1, 2], [2, 2]]);
  check(geo.longitudeCenter(wrapHist, W, CYLINDER) === 0 && geo.longitudeCenter(wrapHist, W, RECT) === 30, "H.7 · longitudeCenter on x = 57…2: cylinder 0.0, rectangle 30.0");
}

// ---- I · the generator is still rectangular and byte-identical
console.log("\n# I · procedural generation unchanged (rectangular; opts in only in BLOOM-027B)");
{
  const PIN = { "gen:12345:0": "7667a422", "gen:25:60": "3e509f25", "gen:2024:30": "a24455b9", "ocean_archipelago:13": "cd2c8238", "desert_world:25": "e8fd8e13", "frozen_world:22": "19d31a4c" }; // b704961 (main)
  const gens = { "gen:12345:0": BLOOM.generatePlanet({ seed: 12345, waterPct: 0, sections: 14, maxCrossingGap: GAP }), "gen:25:60": BLOOM.generatePlanet({ seed: 25, waterPct: 60, sections: 14, maxCrossingGap: GAP }),
    "gen:2024:30": BLOOM.generatePlanet({ seed: 2024, waterPct: 30, sections: 14, maxCrossingGap: GAP }) };
  for (const [id, seed] of [["ocean_archipelago", 13], ["desert_world", 25], ["frozen_world", 22]]) gens[`${id}:${seed}`] = BLOOM.generateFromArchetype(archetypes.find(a => a.id === id), seed, { config, traits });
  const rows = Object.entries(gens).map(([k, p]) => ({ k, same: fnv(J(p)) === PIN[k], noTopo: p.topology === undefined, rect: BLOOM.createSim(p, config, traits, { rng: mul(1) }).map.topology === RECT }));
  check(rows.every(r => r.same), "I.1 · three raw generator planets and the three archetype fixture worlds (whole record) equal main b704961 byte-for-byte", rows.map(r => `${r.k} ${r.same ? "✓" : "✗"}`).join(" · "));
  check(rows.every(r => r.noTopo && r.rect), "I.2 · no generated planet carries a topology field: every one runs as the legacy rectangle");
  const v = validate(gens["gen:25:60"], { regenerate: BLOOM.generatePlanet });
  check(v.ok && v.stats.topology === undefined, "I.3 · a generated planet's validator record is unchanged (no topology entry)");
}

console.log(`\n${fails ? `${fails} check(s) FAILED` : "ALL CHECKS PASS"}  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
process.exit(fails ? 1 : 0);
