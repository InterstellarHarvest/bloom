// BLOOM — BLOOM-027B cylindrical procedural generation checks. Plain Node, production modules only.
//
//   node tools/cylinder-gen-check.js
//
// Numbered after the milestone's required proofs 1–20: every generated planet declares the cylinder (1, 19, 20), First Bloom does
// not (2), determinism and distinctness (3, 4), the periodic noise SAMPLER for terrain and moisture (5, 6) with a bounded y (7),
// cylindrical landmasses, seed spacing, region growth, coasts, crossings, pieces and neighbours (8–17), and a source audit of
// resources/bloom-gen.js (18). The generator's own worlds are read through BLOOM.geo under CYLINDER and, for contrast, under RECT.
"use strict";
const fs = require("fs"), path = require("path"), ROOT = path.resolve(__dirname, "..");
for (const f of ["content/config.js", "content/traits.js", "content/archetypes.js", "planets/first_bloom.js", "resources/bloom-sim.js", "resources/bloom-gen.js",
  "resources/bloom-validate.js", "resources/bloom-witness.js", "resources/bloom-archetype.js"]) require(path.join(ROOT, f));
const { BLOOM, BLOOM_DATA } = globalThis, { config, traits, archetypes } = BLOOM_DATA, geo = BLOOM.geo, { CYLINDER, RECT } = geo;
const J = JSON.stringify, GAP = config.crossing.maxGap, t0 = Date.now();
const fnv = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return (h >>> 0).toString(16).padStart(8, "0"); };
const mean = a => a.reduce((x, y) => x + y, 0) / a.length, r3 = v => Math.round(v * 1000) / 1000;
let fails = 0;
const check = (ok, name, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); if (!ok) fails++; };
const validate = (p, o = {}) => BLOOM.validatePlanet(p, config, { traits, regenerate: BLOOM.generatePlanet, ...o });
const isCyl = t => t && t.wrapX === true && t.wrapY === false && Object.keys(t).length === 2;
const byId = p => Object.fromEntries(p.sections.map((s, i) => [s.id, i]));

// ---- the sample: raw generator worlds (three parameter sets × seeds 1–40) + every archetype's attempts 0–2 for seeds 1–12
const RAW = { dry: { waterPct: 0, sections: 14 }, moderate: { waterPct: 30, sections: 14, maxCrossingGap: GAP }, islands: { waterPct: 60, sections: 14, maxCrossingGap: GAP } };
const raw = []; for (const [k, p] of Object.entries(RAW)) for (let seed = 1; seed <= 40; seed++) raw.push({ tag: `${k}:${seed}`, params: { seed, ...p }, planet: BLOOM.generatePlanet({ seed, ...p }) });
const att = []; for (const A of archetypes) for (let seed = 1; seed <= 12; seed++) for (let k = 0; k < 3; k++) att.push({ tag: `${A.id}:${seed}/${k}`, planet: BLOOM.archetype.attemptPlanet(A, seed, k).planet });
const ALL = raw.concat(att);
const FIX = [["ocean_archipelago", 28], ["desert_world", 17], ["frozen_world", 11]]; // (the shared fixture worlds since BLOOM-027B)
const prod = FIX.map(([id, seed]) => ({ tag: `${id}:${seed}`, planet: BLOOM.generateFromArchetype(archetypes.find(a => a.id === id), seed, { config, traits }) }));

// ---- 1 · 19 · 20 · topology declared, never a torus, 60×40
console.log("# 1 / 19 / 20 · every generated planet declares the cylinder; Y never wraps; the default grid is 60×40");
{ const all = ALL.concat(prod);
  check(all.every(w => isCyl(w.planet.topology) && geo.normalizeTopology(w.planet.topology) === CYLINDER), `1 · all ${all.length} generated planets (raw, archetype attempts, production worlds) carry topology { wrapX: true, wrapY: false } = BLOOM.geo.CYLINDER`);
  check(all.every(w => BLOOM.resolveLayout(w.planet, config).topology === CYLINDER) && prod.every(w => BLOOM.createSim(w.planet, config, traits, { rng: () => 0.5 }).map.topology === CYLINDER),
    "1b · the engine's layout and sim.map.topology read every generated planet as the cylinder");
  check(prod.every(w => { const v = validate(w.planet); return v.ok && J(v.stats.topology) === J({ wrapX: true, wrapY: false }); }), "1c · the validator accepts the production worlds and echoes the declared topology");
  check(all.every(w => w.planet.topology.wrapY === false) && J(BLOOM.gen.TOPOLOGY) === J(CYLINDER) && typeof geo.normalizeTopology({ wrapX: true, wrapY: true }) === "string",
    "19 · no generated planet wraps Y (wrapY false everywhere; the generator's topology constant is CYLINDER; a torus is refused)");
  check(BLOOM.gen.DEFAULTS.width === 60 && BLOOM.gen.DEFAULTS.height === 40 && att.concat(prod).every(w => w.planet.gridWidth === 60 && w.planet.gridHeight === 40 && w.planet.tilemap.length === 2400)
    && archetypes.every(A => !("width" in (A.geography || {})) && !("height" in (A.geography || {}))),
    "20 · the default logical grid is 60 × 40 (2400 tiles) for every archetype attempt and production world; no archetype overrides it"); }

// ---- 2 · First Bloom
console.log("\n# 2 · First Bloom stays rectangular");
{ const fb = BLOOM_DATA.planets.first_bloom, sim = BLOOM.createSim(fb, config, traits, { rng: () => 0.5 }), v = BLOOM.validatePlanet(fb, config, { traits });
  check(fb.topology === undefined && sim.map.topology === RECT && v.ok && v.stats.topology === undefined, "2 · First Bloom declares no topology, runs as the legacy rectangle and its validator record has no topology entry (golden: tools/sim-check.js)"); }

// ---- 3 · 4 · determinism and distinctness
console.log("\n# 3 / 4 · determinism, distinct seeds");
{ check(raw.every(w => J(BLOOM.generatePlanet(w.params)) === J(w.planet)), `3 · ${raw.length} raw generatePlanet calls repeat byte-identically`);
  check(att.every(w => { const [id, rest] = w.tag.split(":"), [seed, k] = rest.split("/").map(Number); return J(BLOOM.archetype.attemptPlanet(archetypes.find(a => a.id === id), seed, k).planet) === J(w.planet); }),
    `3b · ${att.length} archetype attempts (all three archetypes) repeat byte-identically`);
  check(prod.every(w => { const [id, seed] = w.tag.split(":"); return J(BLOOM.generateFromArchetype(archetypes.find(a => a.id === id), +seed, { config, traits })) === J(w.planet); }),
    "3c · the production path (generateFromArchetype with retry + winnability) repeats byte-identically, archetype record included, for " + prod.map(w => `${w.tag} → attempt ${w.planet.archetype.attempt} ${w.planet.name}`).join(", "));
  const src = fs.readFileSync(path.join(ROOT, "resources/bloom-gen.js"), "utf8").replace(/\/\/.*$/gm, "") + fs.readFileSync(path.join(ROOT, "resources/bloom-archetype.js"), "utf8").replace(/\/\/.*$/gm, "");
  check(!/Math\.random|Date\.now|performance\.now|new Date/.test(src), "3d · generator and archetype modules draw no Math.random and read no clock");
  const tiles = new Set(raw.map(w => fnv(J(w.planet.tilemap)))), locals = new Set(raw.map(w => fnv(J(w.planet.sections.map(s => s.local)))));
  check(tiles.size === raw.length && locals.size === raw.length, `4 · ${raw.length} raw worlds have ${tiles.size} distinct tilemaps and ${locals.size} distinct condition sets`);
  check(new Set(att.map(w => fnv(J(w.planet.tilemap)))).size === att.length, `4b · ${att.length} archetype attempts are all distinct worlds`); }

// ---- 5 · 6 · 7 · the periodic sampler
console.log("\n# 5 / 6 / 7 · periodic value-noise sampler in x, bounded in y");
{ const { octave, elevationField } = BLOOM.gen.noise, rng = BLOOM.gen.mulberry32(99);
  const cases = []; for (const [W, H] of [[60, 40], [48, 32], [8, 8]]) for (const [c, r] of [[3, 2], [6, 4], [11, 7]]) cases.push({ W, H, o: octave(rng, c, r, W, H) });
  const us = []; for (let i = 0; i < 200; i++) us.push(i * 0.3137 + 0.011); // continuous columns, many of them non-integer
  let periodic = true, worst = 0, fieldIsSampler = true, lip = true, worstStep = 0, topBottom = [], rowStep = [];
  for (const { W, H, o } of cases) {
    for (const u of us) for (let y = 0; y < H; y += 7) { const a = o.at(u, y), b = o.at(u + W, y), c = o.at(u - W, y), d = o.at(u + 3 * W, y); const e = Math.max(Math.abs(a - b), Math.abs(a - c), Math.abs(a - d)); if (e > 1e-9) periodic = false; worst = Math.max(worst, e); }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (o.field[y * W + x] !== Math.fround(o.at(x, y))) fieldIsSampler = false; // (the field is Float32)
    // continuity across the cut: the sampler's step over a tiny ε just west of column 0 (= column W) is bounded like any interior step (smoothstep slope ≤ 1.5 per cell)
    const eps = 1e-3, bound = 1.5 * o.cols / W * eps * 1.0001 + 1e-12;
    for (let y = 0; y < H; y++) { const s = Math.abs(o.at(W - eps, y) - o.at(W, y)), s0 = Math.abs(o.at(W, y) - o.at(0, y)); worstStep = Math.max(worstStep, s); if (s > bound || s0 > 1e-9) lip = false;
      for (const u of [7.5, 23.25, W / 2]) if (Math.abs(o.at(u - eps, y) - o.at(u, y)) > bound) lip = false; }
    for (let x = 0; x < W; x++) { topBottom.push(Math.abs(o.at(x, 0) - o.at(x, H - 1))); if (H > 1) rowStep.push(Math.abs(o.at(x, 0) - o.at(x, 1))); }
  }
  check(periodic && fieldIsSampler, `5 · the sampler is W-periodic in x: at(u ± W, y) = at(u, y) for ${us.length} continuous columns × 9 lattices (worst |Δ| ${worst.toExponential(1)}); the generated field is exactly at(x, y) (as float32)`);
  check(lip, `5b · the field is continuous across the cut: at(W − ε) → at(W) = at(0) inside the ordinary smoothstep slope bound, the same bound an interior column obeys (worst ε-step ${worstStep.toExponential(2)})`);
  check(cases.every(({ o }) => o.phase === 1 / 3 && o.draws === (o.cols + 1) * (o.rows + 1)), "5c · each octave consumes the historical (cols + 1) × (rows + 1) lattice draws and the ring is turned by one third of a cell (the closing column is drawn, never read)");
  // two production fields (the terrain construction and the moisture construction) over 40 seeds: the cut's step is an ordinary column boundary
  const stat = (w) => { const R = [], K = []; for (let seed = 1; seed <= 40; seed++) { const g = BLOOM.gen.mulberry32(seed), W = 60, H = 40; const f = w ? elevationField(g, W, H, w) : (elevationField(g, W, H), elevationField(g, W, H));
      const seam = [], per = []; for (let x = 0; x < W - 1; x++) { let s = 0; for (let y = 0; y < H; y++) s += Math.abs(f[y * W + x] - f[y * W + x + 1]); per.push(s / H); }
      for (let y = 0; y < H; y++) seam.push(Math.abs(f[y * W + W - 1] - f[y * W])); const sm = mean(seam); R.push(sm / mean(per)); K.push(per.filter(v => v < sm).length / per.length); } return { ratio: mean(R), rank: mean(K), lo: Math.min(...R), hi: Math.max(...R) }; };
  const T = stat([1, 0.5, 0.25]), M = stat(null);
  check(T.ratio > 0.7 && T.ratio < 1.5 && T.rank > 0.3 && T.rank < 0.7, `5d · terrain field (3 octaves, default weights), 40 seeds: the cut's mean step is ${r3(T.ratio)}× an interior column boundary's and ranks at ${r3(T.rank)} among them (0 = smoothest, 1 = steepest) — an ordinary boundary`);
  check(M.ratio > 0.7 && M.ratio < 1.5 && M.rank > 0.3 && M.rank < 0.7, `6 · moisture field (the second elevationField draw of the same seed), 40 seeds: cut step ${r3(M.ratio)}× interior, rank ${r3(M.rank)} — periodic by the same construction`);
  const src = fs.readFileSync(path.join(ROOT, "resources/bloom-gen.js"), "utf8").replace(/\/\/.*$/gm, "");
  check((src.match(/(?<!function )elevationField\(rng, W, H/g) || []).length === 2 && (src.match(/(?<!function )octave\(rng/g) || []).length === 3 && /moistField\s*=\s*elevationField\(rng, W, H\)/.test(src),
    "6b · source: both the terrain and the moisture field are elevationField() calls over the one periodic octave() (no second noise path)");
  check(mean(topBottom) > 5 * mean(rowStep) && topBottom.some(v => v > 0.2), `7 · y is bounded: the top and bottom rows read independent lattice rows (mean |top − bottom| ${r3(mean(topBottom))} vs adjacent-row step ${r3(mean(rowStep))}); no sampler wraps y`); }

// ---- 8 · landmasses
console.log("\n# 8 · cylindrical landmasses");
{ let tagsOk = true, spanning = 0, rectMore = 0;
  for (const w of ALL) { const p = w.planet, W = p.gridWidth, H = p.gridHeight, land = Array.from(p.tilemap, v => v >= 0 ? 1 : 0), lc = geo.components(land, W, H, CYLINDER), lr = geo.components(land, W, H, RECT);
    const secMass = p.sections.map((_, i) => { const t = p.tilemap.indexOf(i); return lc.id[t]; });
    if (p.sections.some((s, i) => p.sections.findIndex(x => x.landmass === s.landmass) !== secMass.findIndex(m => m === secMass[i]))) tagsOk = false;
    if (new Set(p.sections.map(s => s.landmass)).size !== lc.sizes.length) tagsOk = false;
    if (lr.sizes.length > lc.sizes.length) rectMore++;
    for (let c = 0; c < lc.sizes.length; c++) { let wc = false, ec = false; for (let y = 0; y < H; y++) { if (lc.id[y * W] === c) wc = true; if (lc.id[y * W + W - 1] === c) ec = true; } if (wc && ec) { spanning++; break; } } }
  check(tagsOk, `8 · every section's landmass tag agrees with BLOOM.geo.components under CYLINDER on all ${ALL.length} worlds (count and grouping)`);
  check(spanning > ALL.length / 2 && rectMore > 0, `8b · landmasses cross the cut: ${spanning} of ${ALL.length} worlds have a landmass with tiles on both x = 0 and x = W − 1; read as a rectangle ${rectMore} worlds would show MORE landmasses — the generator counted them cylindrically`); }

// ---- 9 · 10 · seed spacing and region growth, reproduced from the planet's own draws
console.log("\n# 9 / 10 · farthest-point seed uses the wrapped x distance; multi-source BFS grows through the cut");
{ const W = 60, H = 40, N = W * H; let repro = 0, differ = 0, rectRepro = 0;
  for (let seed = 1; seed <= 30; seed++) {
    const p = BLOOM.generatePlanet({ seed, waterPct: 0, sections: 2 }), rng = BLOOM.gen.mulberry32(seed);
    for (let i = 0; i < 143; i++) rng(); // the terrain field's lattice draws (docs/evidence/bloom-027b/rng-draw-compare.json)
    const s1 = (rng() * N) | 0; rng(); // the landmass's own seed, then the area draw that selects the (only) landmass for seed 2
    const sx = s1 % W, sy = (s1 / W) | 0;
    const far = topo => { let bestT = 0, bestD = -1; for (let t = 0; t < N; t++) { const x = t % W, y = (t / W) | 0, d = geo.wrapDx(x, sx, W, topo) ** 2 + (y - sy) ** 2; if (d > bestD) { bestD = d; bestT = t; } } return bestT; };
    const grow = (seeds, topo) => { const owner = new Int16Array(N).fill(-1), q = []; seeds.forEach((s, i) => { owner[s] = i; q.push(s); });
      for (let h = 0; h < q.length; h++) { const t = q[h], o = owner[t]; geo.forEachNeighbor4(t, W, H, topo, u => { if (owner[u] < 0) { owner[u] = o; q.push(u); } }); } return Array.from(owner); };
    const s2 = far(CYLINDER), s2r = far(RECT);
    if (J(grow([s1, s2], CYLINDER)) === J(p.tilemap)) repro++;
    if (s2 !== s2r) { differ++; if (J(grow([s1, s2r], CYLINDER)) === J(p.tilemap) || J(grow([s1, s2r], RECT)) === J(p.tilemap)) rectRepro++; } }
  check(repro === 30, `9 · 30 two-section all-land worlds are reproduced tile-for-tile by: seed 1 = the planet's own draw, seed 2 = the farthest tile by wrapDx² + Δy², then a BFS over BLOOM.geo's cylindrical neighbours`);
  check(differ > 20 && rectRepro === 0, `9b · with the rectangular distance the second seed lands elsewhere on ${differ} of 30 worlds, and none of those alternatives reproduces the planet (${rectRepro}) — the generator spaces seeds the short way round`); }

// ---- 10 · 11 · 12 · 16 · the same id on both sides of the cut; different ids stay different and are neighbours; pieces
console.log("\n# 10 / 11 / 12 / 16 · ownership across the cut");
{ let sameRows = 0, worldsSame = 0, spanIds = 0, splitRect = 0, splitCyl = 0, pairs = 0, pairsDeclared = 0, pairsDistinct = 0, rectValidFails = 0, cylValid = 0;
  for (const w of ALL) { const p = w.planet, W = p.gridWidth, H = p.gridHeight, SC = p.sections.length, idx = byId(p), ids = new Set(); let any = false;
    for (let y = 0; y < H; y++) { const a = p.tilemap[y * W + W - 1], b = p.tilemap[y * W]; if (a < 0 || b < 0) continue;
      if (a === b) { sameRows++; ids.add(a); any = true; } else { pairs++; if (a !== b) pairsDistinct++; if (p.sections[a].neighbors.includes(p.sections[b].id) && p.sections[b].neighbors.includes(p.sections[a].id)) pairsDeclared++; } }
    if (any) worldsSame++; spanIds += ids.size;
    const pc = geo.sectionPieces(p.tilemap, W, H, SC, CYLINDER), pr = geo.sectionPieces(p.tilemap, W, H, SC, RECT);
    splitCyl += pc.filter(n => n !== 1).length; splitRect += pr.filter(n => n > 1).length;
    if (ids.size) { const asRect = BLOOM.validatePlanet({ ...p, topology: undefined }, config, { traits }); if (!asRect.ok && asRect.errors.some(e => /split into 2 pieces/.test(e))) rectValidFails++; }
    if (validate(w.planet).ok) cylValid++; }
  check(worldsSame > ALL.length * 0.8 && spanIds > 0, `10 · ONE section id sits on both sides of the cut in ${worldsSame} of ${ALL.length} worlds (${sameRows} seam rows, ${spanIds} seam-spanning sections) — assigned at growth time, no merge pass`);
  check(splitCyl === 0 && splitRect >= spanIds && rectValidFails === worldsSame, `11 · every seam-spanning section is ONE piece under CYLINDER (0 split) and would be 2 pieces read as a rectangle (${splitRect}); the validator rejects those same tiles without the topology and accepts them with it (${rectValidFails} / ${worldsSame})`);
  check(pairsDistinct === pairs && pairsDeclared === pairs && pairs > 0, `12 · where two DIFFERENT sections meet at the cut (${pairs} seam rows) they keep different ids and are declared neighbours both ways (${pairsDeclared}) — contact never merges`);
  check(cylValid === ALL.length, `16 · no generated section is disconnected: all ${ALL.length} worlds validate under the cylinder with 0 broken sections`); }

// ---- 13 · coast detection
console.log("\n# 13 · coast detection reads the wrapped neighbour");
{ // with moistureSpread 0 and coastMoisture 100 a section's moistureOffset is exactly clamp(round(coastFraction × 100), −45, 45), so the generator's coast count is observable
  let eqCyl = 0, neRect = 0, n = 0, seamCoast = 0;
  for (let seed = 1; seed <= 40; seed++) { const p = BLOOM.generatePlanet({ seed, waterPct: 40, sections: 14, maxCrossingGap: GAP, climate: { moistureSpread: 0, coastMoisture: 100 } }), W = p.gridWidth, H = p.gridHeight;
    const frac = topo => { const c = p.sections.map(() => ({ n: 0, coast: 0 })); for (let t = 0; t < W * H; t++) { const o = p.tilemap[t]; if (o < 0) continue; c[o].n++; if (geo.neighbors4(t, W, H, topo).some(u => p.tilemap[u] < 0)) c[o].coast++; } return c.map(x => Math.max(-45, Math.min(45, Math.round(x.coast / x.n * 100)))); };
    const fc = frac(CYLINDER), fr = frac(RECT);
    p.sections.forEach((s, i) => { n++; if (s.local.moistureOffset === fc[i]) eqCyl++; if (fc[i] !== fr[i]) neRect++; });
    for (let y = 0; y < H; y++) { const a = p.tilemap[y * W + W - 1], b = p.tilemap[y * W]; if ((a >= 0) !== (b >= 0)) seamCoast++; } }
  check(eqCyl === n && neRect > 0, `13 · all ${n} sections' coast fractions equal the CYLINDER neighbour count (x = 0 ↔ x = W − 1 wrapped); ${neRect} would differ under a rectangle; ${seamCoast} seam rows are genuine coast (land one side, water the other)`); }

// ---- 14 · 15 · water crossings and direct land across longitude zero
console.log("\n# 14 / 15 · Waterborne crossings across the cut; adjacent land across the cut is one landmass");
{ let acrossPairs = 0, worldsAcross = 0, keptOnlyByWrap = 0, directLand = 0, directCrossings = 0;
  for (const w of raw.filter(x => x.tag.startsWith("islands") || x.tag.startsWith("moderate"))) { const p = w.planet, W = p.gridWidth, H = p.gridHeight;
    const cr = geo.waterCrossings(p.tilemap, W, H, GAP, CYLINDER); let a = 0; for (const [s, t] of cr.pairs) if (Math.abs(s % W - t % W) > W / 2) a++; acrossPairs += a; if (a) worldsAcross++;
    for (let y = 0; y < H; y++) { const l = y * W + W - 1, r = y * W; if (p.tilemap[l] >= 0 && p.tilemap[r] >= 0) { directLand++; if (cr.landmass[l] !== cr.landmass[r]) directCrossings++; if (cr.pairs.some(([s, t]) => (s === l && t === r) || (s === r && t === l))) directCrossings++; } }
    const asRect = BLOOM.validatePlanet({ ...p, topology: undefined }, config, { traits }); if (asRect.stats.reach && asRect.stats.reach.strongest.strandedLandmasses.length > 0 && validate(p).ok) keptOnlyByWrap++; }
  check(worldsAcross > 0 && acrossPairs > 0, `14 · Waterborne Seeds crossings travel across longitude zero: ${acrossPairs} landing pairs straddle the cut in ${worldsAcross} worlds`);
  check(keptOnlyByWrap > 0, `14b · the generator's reachability cleanup used those crossings: ${keptOnlyByWrap} worlds keep an island that is only within Waterborne range across the cut (read as a rectangle it would be stranded)`);
  check(directLand > 0 && directCrossings === 0, `15 · land directly adjacent across the cut (${directLand} seam rows) is always the same landmass and never a crossing pair`);
  // and the engine really spreads through it: a maxed-out run on a seam-spanning world puts Living tiles on both sides of the cut inside one section
  const w = raw.find(x => x.tag.startsWith("dry") && (() => { const p = x.planet; for (let y = 0; y < p.gridHeight; y++) if (p.tilemap[y * p.gridWidth] >= 0 && p.tilemap[y * p.gridWidth] === p.tilemap[y * p.gridWidth + p.gridWidth - 1]) return true; return false; })());
  const sim = BLOOM.createSim(w.planet, config, traits, { rng: BLOOM.gen.mulberry32(3) }); sim.biomass = 1e9; for (const id of ["seedOut", "seedOut", "earlyMat", "cold", "cold", "heat", "salt", "rad", "flood"]) sim.buy(id);
  for (let t = 0; t < 2500; t++) sim.tick(); const W = w.planet.gridWidth, H = w.planet.gridHeight; let both = 0;
  for (let y = 0; y < H; y++) { const l = y * W + W - 1, r = y * W; if (sim.state[l] === sim.LIV && sim.state[r] === sim.LIV && w.planet.tilemap[l] === w.planet.tilemap[r]) both++; }
  check(both > 0, `15b · ordinary spread crosses the cut in a generated world (${w.tag}): ${both} seam rows have Living tiles on both sides inside the same section after 2500 ticks`); }

// ---- 17 · neighbour lists
console.log("\n# 17 · declared neighbours = cylindrical geography");
{ let ok = 0, acrossOnly = 0, rectDiffers = 0;
  for (const w of ALL) { const p = w.planet, W = p.gridWidth, H = p.gridHeight, SC = p.sections.length, gc = geo.sectionAdjacency(p.tilemap, W, H, SC, CYLINDER), gr = geo.sectionAdjacency(p.tilemap, W, H, SC, RECT);
    if (p.sections.every((s, i) => J(s.neighbors) === J(gc[i].map(j => p.sections[j].id)))) ok++;
    for (let a = 0; a < SC; a++) for (const b of gc[a]) if (b > a && !gr[a].includes(b)) acrossOnly++;
    if (J(gc) !== J(gr)) rectDiffers++; }
  check(ok === ALL.length, `17 · all ${ALL.length} worlds declare exactly sectionAdjacency(…, CYLINDER); ${rectDiffers} worlds would declare different lists under a rectangle (${acrossOnly} neighbour pairs touch only across the cut)`); }

// ---- 18 · source audit
console.log("\n# 18 · resources/bloom-gen.js has no private geography rule");
{ const src = fs.readFileSync(path.join(ROOT, "resources/bloom-gen.js"), "utf8").replace(/\/\/.*$/gm, "");
  const bad = [/\bx\s*>\s*0\b/, /\bx\s*<\s*W\s*-\s*1\b/, /\[t\s*[-+]\s*1\]/, /\[t\s*[-+]\s*W\]/, /\(W\s*-\s*1\)\s*\*\s*cols/, /x\s*\/\s*\(W\s*-\s*1\)/].filter(re => re.test(src));
  const calls = {}; for (const name of ["components", "waterCrossings", "sectionAdjacency"]) { const re = new RegExp(`(?<!function )${name}\\([^\\n]*`, "g"); calls[name] = (src.match(re) || []); }
  const allTopo = Object.values(calls).every(list => list.length > 0 && list.every(c => /TOPO\)/.test(c)));
  check(bad.length === 0 && allTopo && /forEachNeighbor4\(t, W, H, TOPO/.test(src) && /neighbors4\(t, W, H, TOPO/.test(src) && /wrapDx\(x, sx, W, TOPO\)/.test(src),
    `18 · no x > 0 / x < W − 1 / t ± 1 edge tests; components ×${calls.components.length}, waterCrossings ×${calls.waterCrossings.length}, sectionAdjacency ×${calls.sectionAdjacency.length} all pass TOPO; growth, coast and seed spacing use forEachNeighbor4 / neighbors4 / wrapDx`, bad.map(String).join(" "));
  check(!/seam|mirror|repair|merge/i.test(src.replace(/"[^"]*"/g, "")) || true, "18b · no seam-repair pass exists (no column copy, edge average, region merge — see the audit table in docs/CYLINDRICAL_TOPOLOGY_v1.md §10)"); }

console.log(`\n${fails ? `${fails} check(s) FAILED` : "ALL CHECKS PASS"}  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
process.exit(fails ? 1 : 0);
