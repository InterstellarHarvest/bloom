// BLOOM — procedural generator, validator and water/impassable checks (BLOOM-003). Plain Node.
//
//   node tools/gen-check.js
//
// Everything runs through the production modules the browser loads (resources/bloom-sim.js,
// bloom-gen.js, bloom-validate.js). Fixed seeds/params below; exit code 1 on any failure.
"use strict";
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
for (const f of ["content/config.js", "content/traits.js", "planets/first_bloom.js",
  "resources/bloom-sim.js", "resources/bloom-gen.js", "resources/bloom-validate.js"]) require(path.join(ROOT, f));
const { BLOOM, BLOOM_DATA } = globalThis, { config, traits } = BLOOM_DATA;
const rngOf = seed => BLOOM.gen.mulberry32(seed);
const J = o => JSON.stringify(o), clone = o => JSON.parse(J(o));

let fails = 0;
const check = (ok, name, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); if (!ok) fails++; };
const validate = p => BLOOM.validatePlanet(p, config, { traits, regenerate: BLOOM.generatePlanet });

// ---- fixed cases (product settings: islands limited to the configured Waterborne Seeds range)
const GAP = config.crossing.maxGap;
const CASES = {
  zeroWater:   { seed: 12345, waterPct: 0,  sections: 14, maxCrossingGap: GAP },
  moderate:    { seed: 2024,  waterPct: 30, sections: 14, maxCrossingGap: GAP },
  islands:     { seed: 25,    waterPct: 60, sections: 14, maxCrossingGap: GAP },
  denominator: { seed: 777,   waterPct: 40, sections: 12, maxCrossingGap: GAP },
};
const P = Object.fromEntries(Object.entries(CASES).map(([k, v]) => [k, BLOOM.generatePlanet(v)]));
const V = Object.fromEntries(Object.entries(P).map(([k, p]) => [k, validate(p)]));

console.log("\n# generator + validator — fixed cases");
console.log(`case         seed   water%req  land  water  sections  landmasses  reach(ordinary→strongest)  origin   [maxCrossingGap ${GAP}]`);
for (const [k, v] of Object.entries(V)) { const s = v.stats, pl = P[k], R = s.reach;
  console.log(`${k.padEnd(12)} ${String(CASES[k].seed).padEnd(6)} ${String(CASES[k].waterPct).padEnd(10)} ${String(s.landTiles).padEnd(5)} ${String(s.waterTiles).padEnd(6)} ${String(s.sections).padEnd(9)} ${String(s.landmasses).padEnd(11)} ${(R.base.reachableSections + "→" + R.strongest.reachableSections + "/" + s.sections).padEnd(26)} ${pl.origin} "${pl.sections.find(x => x.id === pl.origin).name}"`); }
for (const [k, v] of Object.entries(V)) check(v.ok, `${k}: validator passes (tiles, contiguity, origin, adjacency, denominator vs engine, seed reproduction)`, v.errors.join("; "));
check(V.zeroWater.stats.waterTiles === 0 && V.zeroWater.stats.landmasses === 1, "zero-water planet has no water and one landmass");
check(V.moderate.stats.waterTiles > 0 && Math.abs(V.moderate.stats.waterPct - 30) <= 3, "moderate planet lands near its requested 30% water", `${V.moderate.stats.waterPct}%`);
check(V.islands.stats.landmasses >= 3 && V.islands.stats.reach.requiresCrossing, "island planet has ≥3 landmasses; ordinary spread strands sections, Waterborne Seeds reaches all",
  `${V.islands.stats.landmasses} landmasses, ${V.islands.stats.reach.base.strandedSections.length} stranded without the trait, ${V.islands.stats.reach.strongest.strandedSections.length} with it`);

// ---- geographic reachability layer (BLOOM-004)
console.log("\n# reachability: ordinary spread vs strongest Spread (Waterborne Seeds)");
for (const k of ["zeroWater", "denominator"]) { const R = V[k].stats.reach;
  check(V[k].stats.landmasses === 1 && !R.requiresCrossing && R.strongest.strandedSections.length === 0,
    `${k} (one landmass): fully reachable by ordinary spread — Waterborne Seeds not required`, `ordinary spread ${R.base.reachableSections}/${V[k].stats.sections}`); }
{ const R = V.moderate.stats.reach;
  check(R.requiresCrossing && R.strongest.strandedSections.length === 0, "moderate (2 landmasses): the small island needs Waterborne Seeds, and it is in range",
    `ordinary ${R.base.reachableSections}/${V.moderate.stats.sections} → strongest ${R.strongest.reachableSections}/${V.moderate.stats.sections}, links ${JSON.stringify(R.crossingLinks)}`); }
{
  const raw = BLOOM.generatePlanet({ seed: 9, waterPct: 60, sections: 14 }), r = validate(raw), R = r.stats.reach;
  check(!r.ok && r.errors.some(e => /unreachable even with Waterborne Seeds/.test(e)), "validator REJECTS an unreachable procedural planet (seed 9, 60%, no crossing constraint)",
    `${r.errors.find(e => /reachability/.test(e))} · crossing links ${JSON.stringify(R.crossingLinks)}`);
  const fixed = BLOOM.generatePlanet({ seed: 9, waterPct: 60, sections: 14, maxCrossingGap: GAP }), rf = validate(fixed);
  check(rf.ok && rf.stats.reach.strongest.strandedSections.length === 0, `same seed with maxCrossingGap ${GAP}: unreachable islands become water and the planet validates`,
    `${r.stats.landmasses} → ${rf.stats.landmasses} landmass(es), water ${r.stats.waterPct}% → ${rf.stats.waterPct}%`);
  const noTrait = BLOOM.validatePlanet(P.islands, config, { traits: traits.filter(t => t.effect.type !== "crossing") });
  check(!noTrait.ok && noTrait.stats.reach.strongest.maxGap === 0, "with no crossing trait in the catalogue, the same archipelago is (correctly) unreachable",
    noTrait.errors.find(e => /reachability/.test(e)));
}

// ---- determinism
const again = BLOOM.generatePlanet(CASES.islands);
check(J(again) === J(P.islands), "same seed + params → identical planet (every field, every tile)");
const other = BLOOM.generatePlanet({ ...CASES.islands, seed: CASES.islands.seed + 1 });
const tileDiff = other.tilemap.filter((v, i) => v !== P.islands.tilemap[i]).length;
check(tileDiff > 0 && J(other.sections.map(s => s.local)) !== J(P.islands.sections.map(s => s.local)), "different seed → different planet", `${tileDiff} of 2400 tiles differ (seed 25 vs 26)`);
const moreWater = BLOOM.generatePlanet({ ...CASES.islands, waterPct: 40 });
check(J(moreWater.tilemap) !== J(P.islands.tilemap), "same seed, different params → different planet");
let threw = false; try { BLOOM.generatePlanet({ waterPct: 20 }); } catch { threw = true; }
check(threw, "generator refuses to run without an explicit seed");
check(!/Math\.random/.test(require("fs").readFileSync(path.join(ROOT, "resources/bloom-gen.js"), "utf8").replace(/\/\/.*$/gm, "")), "generator draws no Math.random (seeded mulberry32 only)");

// ---- sweep (the Portion 1 125-map audit, now ×3 section counts, through the shared validator)
{
  let n = 0, invalid = 0, nonFinite = 0, split = 0, offBiggest = 0, needTrait = 0, zeroNeed = 0, rawRejected = 0; const t0 = Date.now();
  for (let s = 1; s <= 25; s++) for (const w of [0, 20, 40, 60, 70]) for (const sec of [8, 14, 20]) {
    const p = BLOOM.generatePlanet({ seed: s * 7919, waterPct: w, sections: sec, maxCrossingGap: GAP }), r = validate(p); n++;
    if (!r.ok) invalid++; split += r.stats.brokenSections || 0;
    if (r.errors.some(e => e.startsWith("origin"))) offBiggest++;
    if (r.stats.reach && r.stats.reach.requiresCrossing) { needTrait++; if (w === 0) zeroNeed++; }
    for (const x of p.sections) for (const v of Object.values(x.local)) if (!Number.isFinite(v)) nonFinite++;
    if (w > 0 && !validate(BLOOM.generatePlanet({ seed: s * 7919, waterPct: w, sections: sec })).ok) rawRejected++;
  }
  check(invalid === 0 && nonFinite === 0 && split === 0 && offBiggest === 0,
    `sweep: 25 seeds (7919·k) × water 0/20/40/60/70% × 8/14/20 sections, maxCrossingGap ${GAP}: all valid incl. strongest-Spread reachability`,
    `${n} maps, ${invalid} invalid, ${split} split sections, ${nonFinite} non-finite signals, ${offBiggest} bad origins, ${Date.now() - t0} ms`);
  check(needTrait > 0 && zeroNeed === 0, "sweep: islands make Waterborne Seeds a real choice on some maps, never on zero-water maps",
    `${needTrait} maps need it to reach everything; ${zeroNeed} zero-water maps do`);
  check(rawRejected > 0, "sweep: without the constraint, the validator rejects the maps whose islands are out of range", `${rawRejected} of 300 watery maps rejected`);
}

// ---- validator catches what it claims to (mutations of a valid planet)
console.log("\n# validator negative tests");
const mut = (name, fn, expect) => { const p = clone(P.moderate); fn(p); const r = BLOOM.validatePlanet(p, config, { traits, regenerate: BLOOM.generatePlanet });
  check(!r.ok && r.errors.some(e => expect.test(e)), `validator rejects: ${name}`, r.errors.find(e => expect.test(e)) || r.errors[0] || "no error"); };
mut("tile owned by a nonexistent section", p => { p.tilemap[5] = 99; }, /^tiles:/);
mut("a section split across the map", p => {
  const a = p.tilemap.find(v => v >= 0); const far = p.tilemap.findIndex((v, i) => v >= 0 && v !== a && !p.sections[a].neighbors.includes(p.sections[v].id));
  p.tilemap[far] = a; }, /split into/);
mut("an empty land section", p => { p.sections.push({ ...clone(p.sections[0]), id: "ghost", name: "Ghost", isOrigin: false, neighbors: [] }); }, /no tiles/);
mut("origin that is not a land section", p => { p.sections.forEach(s => s.isOrigin = false); p.origin = "nowhere"; }, /origin/);
mut("stale/fabricated neighbour", p => {
  const a = p.sections[0], b = p.sections.find(s => s !== a && !a.neighbors.includes(s.id)); a.neighbors.push(b.id); b.neighbors.push(a.id); }, /do not touch/);
mut("non-finite local signal", p => { p.sections[1].local.moistureOffset = NaN; }, /not a finite number/);
mut("planet that its seed does not reproduce", p => { p.sections[2].local.salinity += 1; }, /determinism/);

// ---- authored planets go through the same validator
{
  const r = BLOOM.validatePlanet(BLOOM_DATA.planets.first_bloom, config, { traits });
  check(r.ok && r.stats.declaredAdjacency.matched === r.stats.declaredAdjacency.declared,
    "First Bloom validates; every authored neighbour really touches", `${r.stats.declaredAdjacency.matched}/${r.stats.declaredAdjacency.declared} declared pairs, ${r.stats.sections} sections, ${r.stats.landTiles} land tiles`);
}

// ---- simulation on generated planets
console.log("\n# generated planets in BLOOM.createSim");
function maxed(sim) { sim.biomass = 1e9; for (const id of ["seedOut", "seedOut", "earlyMat", "cold", "cold", "heat", "salt", "rad", "flood"]) sim.buy(id); }
for (const k of ["moderate", "islands"]) {
  const pl = P[k], sim = BLOOM.createSim(pl, config, traits, { rng: rngOf(42) }); maxed(sim);
  const { N, TILEMAP, ORIGIN, SEC, LAND } = sim.map; let problems = [], waterTouched = 0, originMin = 1;
  try {
    for (let t = 1; t <= 3000; t++) {
      const cov = sim.tick();
      if (!Number.isFinite(cov) || cov < 0 || cov > 1) problems.push(`coverage ${cov} at ${t}`);
      if (t % 100 === 0) {
        for (let i = 0; i < N; i++) { const st = sim.state[i]; if (st > 2) problems.push(`tile ${i} state ${st}`); if (TILEMAP[i] < 0 && st !== sim.BAR) waterTouched++; }
        if (!Number.isFinite(sim.biomass)) problems.push("biomass NaN");
        if (![...sim.vigor, ...sim.secFit].every(Number.isFinite)) problems.push("vigor/fitness NaN");
        originMin = Math.min(originMin, sim.secFit[ORIGIN]);
      }
    }
  } catch (e) { problems.push("threw: " + e.message); }
  const living = sim.livingCountBySection();
  check(!problems.length, `${k}: 3000 ticks through BLOOM.createSim with no exception/NaN/invalid tile state`,
    problems[0] || `coverage ${(sim.coverage() * 100).toFixed(1)}% of ${LAND} land tiles, biomass ${Math.round(sim.biomass)}`);
  check(waterTouched === 0, `${k}: water tiles never become Living or Dead`, `${N - LAND} water tiles checked every 100 ticks`);
  check(originMin >= config.categories.originFitnessFloor && living[ORIGIN] > 0, `${k}: protected origin holds (fitness ≥ ${config.categories.originFitnessFloor}, still living)`,
    `${SEC[ORIGIN].name}: min fitness ${originMin.toFixed(2)}, ${living[ORIGIN]} living`);
}

// ---- water is excluded from the coverage / win denominator
console.log("\n# water and the win denominator");
{
  const pl = P.denominator, sim = BLOOM.createSim(pl, config, traits, { rng: rngOf(1) });
  const { N, LAND, LAND_TILES, TILEMAP } = sim.map, land = V.denominator.stats.landTiles;
  check(LAND === land && LAND < N && LAND_TILES.every(i => TILEMAP[i] >= 0), "engine denominator = land tiles only", `LAND ${LAND} of ${N} tiles (${N - LAND} water)`);
  const before = sim.biomass;
  for (const i of LAND_TILES) sim.state[i] = sim.LIV;         // scenario setup: every land tile alive
  const cov = sim.coverage();
  check(cov === 1 && land / N < sim.winAt, "all land alive → coverage exactly 1.0; counting water would read below the win line",
    `coverage ${cov.toFixed(3)} vs land/all-tiles ${(land / N).toFixed(3)} (win at ${sim.winAt})`);
  sim.tick();
  check(sim.won, "…and the real tick() declares the win");
  const E = config.econ, maxIncome = E.originTrickle + LAND * E.thriving + E.bubbleValue;
  check(sim.biomass - before <= maxIncome, "one tick's Biomass is bounded by land tiles (water earns nothing)", `+${(sim.biomass - before).toFixed(3)} ≤ ${maxIncome.toFixed(3)}`);
}

// ---- ordinary spread cannot cross water
console.log("\n# spread vs water");
function strip(waterCol, kindRoute) {
  const W = 30, H = 12, local = { tempOffset: 0, moistureOffset: 0, light: 70, ph: 6.8, salinity: 0, toxicity: 0, radiation: 8, nutrients: 60 };
  const base = { id: "strip", name: "Strip", gridWidth: W, gridHeight: H, origin: "west", globalClimate: { temperature: 10, moisture: 50 } };
  if (kindRoute) return { ...base, sections: [
      { id: "west", name: "West", isOrigin: true, area: 10, center: { x: 0.15, y: 0.5 }, local },
      { id: "sea", name: "Sea", kind: "water", area: 10, center: { x: 0.5, y: 0.5 }, local },
      { id: "east", name: "East", area: 10, center: { x: 0.85, y: 0.5 }, local }] };
  const tilemap = []; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) tilemap.push(x < 14 ? 0 : x === 14 ? (waterCol ? -1 : 0) : 1);
  return { ...base, tilemap, sections: [
    { id: "west", name: "West", isOrigin: true, area: 0, local }, { id: "east", name: "East", area: 0, local }] };
}
function runStrip(pl) { const sim = BLOOM.createSim(pl, config, traits, { rng: rngOf(3) }); let eastEver = 0;
  const e = sim.map.SIDX.east;
  for (let t = 0; t < 4000; t++) { sim.tick(); eastEver = Math.max(eastEver, sim.livingCountBySection()[e]); }
  const w = sim.livingCountBySection()[sim.map.SIDX.west] / sim.map.AREA[sim.map.SIDX.west]; return { eastEver, westShare: w, sim }; }
{
  const wall = runStrip(strip(true)), open = runStrip(strip(false));
  check(wall.eastEver === 0 && wall.westShare > 0.9, "one-tile water column: west fills, identical east land is never colonized (4000 ticks)",
    `west ${(wall.westShare * 100).toFixed(0)}% living, east max ${wall.eastEver} living`);
  check(open.eastEver > 0, "control: same map with that column as land → east IS colonized", `east reached ${open.eastEver} living`);
  const byKind = runStrip(strip(true, true));
  check(byKind.eastEver === 0 && byKind.sim.map.impassable.length === 1 && byKind.sim.map.LAND < byKind.sim.map.N,
    "authored route: a kind:\"water\" section separates the same way and leaves the denominator", `LAND ${byKind.sim.map.LAND}/${byKind.sim.map.N}, east max ${byKind.eastEver}`);
  const pl = P.islands, sim = BLOOM.createSim(pl, config, traits, { rng: rngOf(7) }); maxed(sim);
  for (let t = 0; t < 3000; t++) sim.tick();
  const oMass = pl.sections.find(s => s.id === pl.origin).landmass;
  const offIsland = sim.map.SEC.map((s, i) => [s, sim.livingCountBySection()[i]]).filter(([s]) => s.landmass !== oMass);
  const onIsland = sim.map.SEC.map((s, i) => [s, sim.livingCountBySection()[i]]).filter(([s]) => s.landmass === oMass).reduce((a, [, n]) => a + n, 0);
  check(offIsland.every(([, n]) => n === 0) && onIsland > 0, "island planet (seed 25, 60%), no Waterborne Seeds: after 3000 maxed-out ticks no other landmass has a single living tile",
    `${offIsland.length} off-landmass sections all 0 living; ${onIsland} living on the origin landmass`);
}

// ---- engine still rejects malformed impassable input (the guard was narrowed, not deleted)
{
  const bad = (name, pl) => { let t = false; try { BLOOM.createSim(pl, config, traits); } catch { t = true; } check(t, `engine rejects ${name}`); };
  const s = strip(true);
  bad("an unknown terrain kind", { ...strip(true, true), sections: strip(true, true).sections.map(x => x.id === "sea" ? { ...x, kind: "magma_ocean" } : x) });
  bad("a tilemap value that is not a section or -1", { ...s, tilemap: s.tilemap.map((v, i) => i === 0 ? 7 : v) });
  bad("a tilemap of the wrong size", { ...s, tilemap: s.tilemap.slice(1) });
  bad("an origin placed on a water section", { ...strip(true, true), origin: "sea" });
}

console.log(fails ? `\n${fails} check(s) FAILED` : "\nALL CHECKS PASS");
process.exit(fails ? 1 : 0);
