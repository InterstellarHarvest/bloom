// BLOOM-027B evidence: quantitative seam survey of a generator tree, read CYLINDRICALLY (the question is "what does the flat
// cut look like when the world is a cylinder?"), so the same script measures the pre-027B rectangular generator (baseline =
// `git archive ae9c780`) and the 027B generator and the two JSON records can be diffed.
//   node docs/evidence/bloom-027b/seam-survey.js <bloom-root> <out.json> [--structural]
// Worlds: 160 raw generator planets (40 seeds × 4 parameter sets), and for each archetype × public seeds 1–40 the raw attempt 0
// and the production-path world (generateFromArchetype WITH winnability unless --structural), repeated to prove determinism.
"use strict";
const fs = require("fs"), path = require("path"), crypto = require("crypto");
const ROOT = path.resolve(process.argv[2]), OUT = process.argv[3], STRUCTURAL = process.argv.includes("--structural");
for (const f of ["content/config.js", "content/traits.js", "content/archetypes.js", "content/scenarios.js", "planets/first_bloom.js",
  "resources/bloom-sim.js", "resources/bloom-gen.js", "resources/bloom-validate.js", "resources/bloom-witness.js", "resources/bloom-archetype.js"]) require(path.join(ROOT, f));
const { BLOOM, BLOOM_DATA } = globalThis, { config, traits, archetypes } = BLOOM_DATA, geo = BLOOM.geo, CYL = geo.CYLINDER, RECT = geo.RECT;
const sha = o => crypto.createHash("sha256").update(typeof o === "string" ? o : JSON.stringify(o)).digest("hex").slice(0, 16);
const J = JSON.stringify, mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0, r3 = v => Math.round(v * 1000) / 1000;
const GAP = config.crossing.maxGap;

// ---- noise fields. The 027B tree exposes its periodic sampler (BLOOM.gen.noise); for the baseline tree the ae9c780 octave is
// reproduced verbatim below (rectangular: gx = x / (W − 1) × cols, lattice clamped), so both trees' terrain is measured the same way.
const smooth = t => t * t * (3 - 2 * t);
function octaveRect(rng, cols, rows, W, H) {
  const lat = new Float32Array((cols + 1) * (rows + 1)); for (let i = 0; i < lat.length; i++) lat[i] = rng();
  const out = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const gx = x / (W - 1) * cols, gy = y / (H - 1) * rows, x0 = Math.min(gx | 0, cols - 1), y0 = Math.min(gy | 0, rows - 1), fx = smooth(gx - x0), fy = smooth(gy - y0);
    const a = lat[y0 * (cols + 1) + x0], b = lat[y0 * (cols + 1) + x0 + 1], c = lat[(y0 + 1) * (cols + 1) + x0], d = lat[(y0 + 1) * (cols + 1) + x0 + 1];
    const top = a + (b - a) * fx, bot = c + (d - c) * fx; out[y * W + x] = top + (bot - top) * fy; }
  return out;
}
function fieldRect(rng, W, H, weights = [1, 0.5, 0.25]) {
  const N = W * H, o1 = octaveRect(rng, 3, 2, W, H), o2 = octaveRect(rng, 6, 4, W, H), o3 = octaveRect(rng, 11, 7, W, H), f = new Float32Array(N); let mn = Infinity, mx = -Infinity; const [a, b, c] = weights;
  for (let i = 0; i < N; i++) { const v = o1[i] * a + o2[i] * b + o3[i] * c; f[i] = v; if (v < mn) mn = v; if (v > mx) mx = v; }
  const r = (mx - mn) || 1; for (let i = 0; i < N; i++) f[i] = (f[i] - mn) / r; return f;
}
const PERIODIC = !!(BLOOM.gen.noise && BLOOM.gen.noise.elevationField);
const field = (rng, W, H, w) => PERIODIC ? BLOOM.gen.noise.elevationField(rng, W, H, w) : fieldRect(rng, W, H, w);
// seam step |f[y][W−1] − f[y][0]| vs the ordinary interior step |f[y][x] − f[y][x+1]| (same field, same rows)
function discontinuity(f, W, H) {
  const seam = [], inner = []; for (let y = 0; y < H; y++) { seam.push(Math.abs(f[y * W + W - 1] - f[y * W])); for (let x = 0; x < W - 1; x++) inner.push(Math.abs(f[y * W + x] - f[y * W + x + 1])); }
  const perBoundary = []; for (let x = 0; x < W - 1; x++) { let s = 0; for (let y = 0; y < H; y++) s += Math.abs(f[y * W + x] - f[y * W + x + 1]); perBoundary.push(s / H); }
  perBoundary.sort((a, b) => a - b);
  const seamMean = mean(seam), rank = perBoundary.filter(v => v < seamMean).length; // where the seam boundary would rank among the W−1 interior boundaries
  return { seamMean: r3(seamMean), seamMax: r3(Math.max(...seam)), interiorMean: r3(mean(inner)), interiorBoundaryMax: r3(perBoundary[perBoundary.length - 1]),
    ratio: r3(seamMean / (mean(inner) || 1)), seamRankPct: r3(rank / perBoundary.length) };
}

// ---- cylindrical reading of a finished planet
function survey(p) {
  const W = p.gridWidth, H = p.gridHeight, N = W * H, tm = p.tilemap, SC = p.sections.length;
  const land = Array.from(tm, v => v >= 0 ? 1 : 0), lmC = geo.components(land, W, H, CYL), lmR = geo.components(land, W, H, RECT);
  const colsOf = (id, pred) => { const s = new Set(); for (let y = 0; y < H; y++) { if (pred(y * W)) s.add("w" + id); if (pred(y * W + W - 1)) s.add("e" + id); } return s; };
  let lmSpan = 0; for (let c = 0; c < lmC.sizes.length; c++) { const s = colsOf(c, t => lmC.id[t] === c); if (s.has("w" + c) && s.has("e" + c)) lmSpan++; }
  let rowsSameId = 0, rowsLandBoth = 0, rowsLandOne = 0, rowsWaterBoth = 0;
  for (let y = 0; y < H; y++) { const a = tm[y * W + W - 1], b = tm[y * W]; if (a >= 0 && b >= 0) { rowsLandBoth++; if (a === b) rowsSameId++; } else if (a >= 0 || b >= 0) rowsLandOne++; else rowsWaterBoth++; }
  // sections on both sides of the cut connected across it = ids whose rect piece count exceeds their cylinder piece count, or that share a seam row
  const piecesC = geo.sectionPieces(tm, W, H, SC, CYL), piecesR = geo.sectionPieces(tm, W, H, SC, RECT);
  const seamIds = new Set(); for (let y = 0; y < H; y++) { const a = tm[y * W + W - 1], b = tm[y * W]; if (a >= 0 && a === b) seamIds.add(a); }
  const adjC = geo.sectionAdjacency(tm, W, H, SC, CYL), adjR = geo.sectionAdjacency(tm, W, H, SC, RECT);
  let adjAcrossOnly = 0, adjPairsC = 0; for (let a = 0; a < SC; a++) for (const b of adjC[a]) if (b > a) { adjPairsC++; if (!adjR[a].includes(b)) adjAcrossOnly++; }
  // land/water flips along the seam boundary vs the mean interior column boundary
  const flips = x1 => { let n = 0; for (let y = 0; y < H; y++) if ((tm[y * W + x1] >= 0) !== (tm[y * W + (x1 + 1) % W] >= 0)) n++; return n; };
  const interiorFlips = []; for (let x = 0; x < W - 1; x++) interiorFlips.push(flips(x));
  const cr = geo.waterCrossings(tm, W, H, GAP, CYL); let crossSeam = 0;
  for (const [a, b] of cr.pairs) if (Math.abs(a % W - b % W) > W / 2) crossSeam++;
  const v = BLOOM.validatePlanet(p, config, { traits, regenerate: BLOOM.generatePlanet });
  const vC = BLOOM.validatePlanet({ ...p, topology: { wrapX: true, wrapY: false } }, config, { traits }); // the same tiles judged as a cylinder (what the globe shows)
  return { topology: p.topology === undefined ? null : p.topology, W, H, sections: SC, waterPct: r3((N - lmC.id.filter(v => v >= 0).length) / N),
    landmassesCyl: lmC.sizes.length, landmassesRect: lmR.sizes.length, landmassesSpanningCut: lmSpan,
    sectionsSpanningCut: seamIds.size, sectionsSplitWhenReadRect: piecesR.filter((n, i) => n > piecesC[i]).length, maxPiecesCyl: Math.max(...piecesC),
    rowsSameSectionBothSides: rowsSameId, rowsLandBothSides: rowsLandBoth, rowsLandOneSide: rowsLandOne, rowsWaterBothSides: rowsWaterBoth,
    seamFlips: flips(W - 1), interiorFlipsMean: r3(mean(interiorFlips)), interiorFlipsMax: Math.max(...interiorFlips),
    adjacencyPairs: adjPairsC, adjacencyAcrossCutOnly: adjAcrossOnly, crossingPairs: cr.pairs.length, crossingPairsAcrossSeam: crossSeam,
    validOwn: v.ok, ownErrors: v.errors.slice(0, 3), validAsCylinder: vC.ok, cylErrors: vC.errors.slice(0, 3), brokenSectionsAsCylinder: vC.stats.brokenSections || 0 };
}
function noiseOf(params) { // the planet's own terrain field + a second field of the same construction (the moisture sampler), from its seed
  const P = BLOOM.gen.normalizeParams(params), rng = BLOOM.gen.mulberry32(P.seed), W = P.width, H = P.height;
  const terrain = field(rng, W, H, P.terrainWeights), second = field(rng, W, H);
  return { terrain: discontinuity(terrain, W, H), moistureConstruction: discontinuity(second, W, H) };
}
const agg = rows => { const keys = Object.keys(rows[0]).filter(k => typeof rows[0][k] === "number"), o = { n: rows.length }; for (const k of keys) o[k] = { mean: r3(mean(rows.map(r => r[k]))), max: Math.max(...rows.map(r => r[k])), nonzero: rows.filter(r => r[k] > 0).length }; return o; };

const out = { root: ROOT, periodicSampler: PERIODIC, structuralOnly: STRUCTURAL, raw: {}, archetypes: {}, firstBloom: {} };
// 1. raw generator
for (const [k, p] of Object.entries({ dry: { waterPct: 0, sections: 14 }, moderate: { waterPct: 30, sections: 14, maxCrossingGap: GAP },
  islands: { waterPct: 60, sections: 14, maxCrossingGap: GAP }, small: { waterPct: 45, sections: 10, width: 48, height: 32, maxCrossingGap: GAP } })) {
  const rows = [], noise = [], planets = []; let repeat = 0, distinct = new Set();
  for (let seed = 1; seed <= 40; seed++) { const pl = BLOOM.generatePlanet({ seed, ...p }); planets.push(pl); rows.push({ seed, ...survey(pl) }); noise.push(noiseOf({ seed, ...p }));
    if (J(BLOOM.generatePlanet({ seed, ...p })) === J(pl)) repeat++; distinct.add(sha(pl.tilemap)); }
  out.raw[k] = { params: p, hash: sha(planets), repeatIdentical: repeat, distinctTilemaps: distinct.size, summary: agg(rows), noise: { terrain: agg(noise.map(n => n.terrain)), moistureConstruction: agg(noise.map(n => n.moistureConstruction)) }, rows };
}
// 2. archetype production path
for (const A of archetypes) {
  const rows = [], accepted = [], noise = []; let repeat = 0;
  for (let s = 1; s <= 40; s++) {
    const raw0 = BLOOM.archetype.attemptPlanet(A, s, 0).planet, t0 = Date.now(); let acc = null, err = null;
    try { acc = BLOOM.generateFromArchetype(A, s, { config, traits, ...(STRUCTURAL ? { winnability: false } : {}) }); } catch (e) { err = String(e.message).slice(0, 160); }
    if (acc) { const again = BLOOM.generateFromArchetype(A, s, { config, traits, ...(STRUCTURAL ? { winnability: false } : {}) }); if (J(again) === J(acc)) repeat++; }
    noise.push(noiseOf(raw0.params));
    rows.push({ seed: s, ms: Date.now() - t0, raw0: { name: raw0.name, hash: sha(raw0), ...survey(raw0) },
      accepted: acc ? { attempt: acc.archetype.attempt, name: acc.name, id: acc.id, hash: sha((({ archetype, ...rest }) => rest)(acc)), actualWater: acc.archetype.actualWaterPct, landmasses: acc.archetype.landmasses,
        strategies: acc.archetype.strategies ? acc.archetype.strategies.list.map(x => x.signature) : null, witnessWinSeconds: acc.archetype.witness ? Math.round(acc.archetype.witness.winTick * config.tickMs / 1000) : null,
        rejectedAttempts: acc.archetype.rejectedAttempts.map(r => r.rejected[0]), ...survey(acc) } : { error: err } });
    if (acc) accepted.push(rows[rows.length - 1].accepted);
  }
  out.archetypes[A.id] = { accepted: accepted.length, failed: rows.filter(r => r.accepted.error).map(r => r.seed), repeatIdentical: repeat,
    attempts: Object.fromEntries(rows.filter(r => !r.accepted.error).map(r => [r.seed, r.accepted.attempt])),
    raw0Summary: agg(rows.map(r => r.raw0)), acceptedSummary: accepted.length ? agg(accepted) : null,
    noise: { terrain: agg(noise.map(n => n.terrain)), moistureConstruction: agg(noise.map(n => n.moistureConstruction)) }, rows };
}
// 3. First Bloom: authored, no topology, unchanged
{ const planet = BLOOM_DATA.planets.first_bloom, sim = BLOOM.createSim(planet, config, traits, { rng: BLOOM.gen.mulberry32(1) });
  out.firstBloom = { topology: planet.topology === undefined ? "absent" : planet.topology, tilemap: sha(Array.from(sim.map.TILEMAP)), cent: sha(sim.map.CENT), nbrs: sha(sim.map.NBRS), mapTopology: sim.map.topology }; }
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
const brief = { periodicSampler: out.periodicSampler, raw: Object.fromEntries(Object.entries(out.raw).map(([k, v]) => [k, { hash: v.hash, repeat: v.repeatIdentical, distinct: v.distinctTilemaps, lmSpan: v.summary.landmassesSpanningCut, secSpan: v.summary.sectionsSpanningCut, seamRatioTerrain: v.noise.terrain.ratio, seamRatioMoist: v.noise.moistureConstruction.ratio, validOwn: v.rows.filter(r => r.validOwn).length }])),
  archetypes: Object.fromEntries(Object.entries(out.archetypes).map(([k, v]) => [k, { accepted: v.accepted, failed: v.failed, repeat: v.repeatIdentical, lmSpan: v.acceptedSummary && v.acceptedSummary.landmassesSpanningCut, secSpan: v.acceptedSummary && v.acceptedSummary.sectionsSpanningCut, adjAcross: v.acceptedSummary && v.acceptedSummary.adjacencyAcrossCutOnly, seamRatioTerrain: v.noise.terrain.ratio }])), firstBloom: out.firstBloom };
console.log(JSON.stringify(brief, null, 1));
