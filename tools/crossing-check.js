// BLOOM — Waterborne Seeds / water-crossing checks (BLOOM-004). Plain Node, production modules only.
//
//   node tools/crossing-check.js
//
// Hand-built maps isolate one rule each (same land on both sides of the water, one variable changed);
// a fixed generated archipelago proves the whole chain works on real procedural geography.
// Waterborne Seeds is always bought through sim.buy(), the same call the shop button makes.
"use strict";
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
for (const f of ["content/config.js", "content/traits.js", "resources/bloom-sim.js", "resources/bloom-gen.js", "resources/bloom-validate.js"])
  require(path.join(ROOT, f));
const { BLOOM, BLOOM_DATA } = globalThis, { config, traits } = BLOOM_DATA;
const XC = config.crossing, CROSS_ID = traits.find(t => t.effect.type === "crossing").id;
let fails = 0;
const check = (ok, name, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); if (!ok) fails++; };

// ---- hand-built strip planets: West (origin) | water gap | East [| water gap | Far]
const GOOD = { tempOffset: 0, moistureOffset: 0, light: 70, ph: 6.8, salinity: 0, toxicity: 0, radiation: 8, nutrients: 60 };
function stripPlanet({ gapEast, eastLocal = GOOD, gapFar = null }) {
  const H = 12, westW = 12, eastW = 10, farW = 8;
  const W = westW + gapEast + eastW + (gapFar ? gapFar + farW : 0);
  const tilemap = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let v = -1;
    if (x < westW) v = 0;
    else if (x >= westW + gapEast && x < westW + gapEast + eastW) v = 1;
    else if (gapFar && x >= westW + gapEast + eastW + gapFar) v = 2;
    tilemap.push(v);
  }
  const sections = [{ id: "west", name: "West", isOrigin: true, area: 0, local: GOOD }, { id: "east", name: "East", area: 0, local: eastLocal }];
  if (gapFar) sections.push({ id: "far", name: "Far", area: 0, local: GOOD });
  return { id: "strip", name: "Strip", gridWidth: W, gridHeight: H, origin: "west", globalClimate: { temperature: 10, moisture: 50 }, sections, tilemap };
}
// run `ticks`, optionally buying the crossing trait first; track water tiles and per-section living peaks
function run(planet, { buyCrossing, ticks = 4000, seed = 3, extra = [] }) {
  const sim = BLOOM.createSim(planet, config, traits, { rng: BLOOM.gen.mulberry32(seed) });
  sim.biomass = 1e9; extra.forEach(id => sim.buy(id));
  const bought = buyCrossing ? sim.buy(CROSS_ID) : false;
  const { N, TILEMAP, SC } = sim.map, peak = new Array(SC).fill(0); let waterTouched = 0, firstFoothold = null;
  for (let t = 1; t <= ticks; t++) {
    sim.tick();
    if (firstFoothold === null && sim.crossing.footholds > 0) firstFoothold = t;
    if (t % 50 === 0) { const L = sim.livingCountBySection(); L.forEach((n, i) => peak[i] = Math.max(peak[i], n));
      for (let i = 0; i < N; i++) if (TILEMAP[i] < 0 && sim.state[i] !== sim.BAR) waterTouched++; }
  }
  return { sim, bought, peak, waterTouched, firstFoothold, living: sim.livingCountBySection() };
}

console.log(`# rule: crossing pressure Σ ${XC.chancePerSource} × ${XC.gapFalloff}^(gap−1) from Living coastal tiles within ${XC.maxGap} water tiles; ordinary grow rule applies`);

// 1 · without / with the trait — identical map
{
  const pl = stripPlanet({ gapEast: 3 });
  const off = run(pl, { buyCrossing: false }), on = run(pl, { buyCrossing: true });
  const e = off.sim.map.SIDX.east;
  check(off.peak[e] === 0 && off.sim.crossing.arrivals === 0, "gap 3, no Waterborne Seeds: East never colonized, no seed pressure (4000 ticks)",
    `West ${off.living[0]}/${off.sim.map.AREA[0]} living, East peak ${off.peak[e]}`);
  check(on.bought && on.living[e] > 0 && on.sim.crossing.footholds > 0, "gap 3, Waterborne Seeds bought via sim.buy: East colonized by a waterborne foothold, then ordinary spread",
    `first foothold at tick ${on.firstFoothold}, ${on.sim.crossing.footholds} foothold(s), East ${on.living[e]}/${on.sim.map.AREA[e]} living`);
  check(off.waterTouched === 0 && on.waterTouched === 0, "water tiles stay Barren in both runs (checked every 50 ticks)", `${off.sim.map.N - off.sim.map.LAND} water tiles`);
  check(on.sim.map.LAND === off.sim.map.LAND && on.sim.map.LAND_TILES.every(i => on.sim.map.TILEMAP[i] >= 0),
    "buying the trait leaves the land-only denominator unchanged", `LAND ${on.sim.map.LAND}/${on.sim.map.N}`);
}

// 2 · finite range: a Far island 7 tiles out (> maxGap) vs 6 tiles out (= maxGap)
{
  const far = stripPlanet({ gapEast: 3, gapFar: XC.maxGap + 1 }), near = stripPlanet({ gapEast: 3, gapFar: XC.maxGap });
  const linksFar = BLOOM.geo.waterCrossings(far.tilemap, far.gridWidth, far.gridHeight, XC.maxGap).links.filter(l => l.from < l.to);
  const a = run(far, { buyCrossing: true, ticks: 6000 }), b = run(near, { buyCrossing: true, ticks: 6000 });
  const f = a.sim.map.SIDX.far;
  check(linksFar.length === 1 && linksFar[0].gap === 3, "geometry: only the 3-tile strait is a crossing; the 7-tile gap is not", JSON.stringify(linksFar));
  check(a.living[a.sim.map.SIDX.east] > 0 && a.peak[f] === 0, `gap ${XC.maxGap + 1} > maxGap ${XC.maxGap}: Far island gets no seed pressure and stays empty (6000 ticks)`,
    `East ${a.living[a.sim.map.SIDX.east]} living, Far peak ${a.peak[f]}`);
  check(b.living[b.sim.map.SIDX.far] > 0, `control: same map with the gap at ${XC.maxGap} → Far island is reached (East → Far chain)`, `Far ${b.living[b.sim.map.SIDX.far]} living`);
  const wide = stripPlanet({ gapEast: XC.maxGap + 1 }), ws = BLOOM.createSim(wide, config, traits); ws.biomass = 1e9;
  check(!ws.offered(ws.traitById[CROSS_ID]) && !ws.buy(CROSS_ID), "a map whose only gap is too wide does not even offer Waterborne Seeds");
}

// 3 · fitness is never bypassed
{
  const hot = { ...GOOD, tempOffset: 40 };                       // 50 °C: scorching for the base plant
  const r = run(stripPlanet({ gapEast: 3, eastLocal: hot }), { buyCrossing: true });
  const e = r.sim.map.SIDX.east, ev = r.sim.evaluate(e);
  check(r.sim.crossing.arrivals > 0 && r.sim.crossing.footholds === 0 && r.peak[e] === 0,
    "hostile island (East at +50 °C): seeds arrive but never establish", `${r.sim.crossing.arrivals} seed arrivals, 0 footholds, East peak 0 living`);
  check(ev.limitKey === "Temperature" && ev.cats.Temperature.word === "scorching", "…and the inspect readout names the real limiting factor", `limit ${ev.limitKey}: ${ev.cats.Temperature.word}`);
  // a colonized island that turns hostile dies back for its real limiting factor
  const warmish = { ...GOOD, tempOffset: 14 };                   // 24 °C: just inside the base plant's range
  const pl = stripPlanet({ gapEast: 3, eastLocal: warmish });
  const sim = BLOOM.createSim(pl, config, traits, { rng: BLOOM.gen.mulberry32(3) }); sim.biomass = 1e9; sim.buy(CROSS_ID);
  const E = sim.map.SIDX.east; let t = 0; while (sim.livingCountBySection()[E] < 60 && t < 6000) { sim.tick(); t++; }
  const before = sim.livingCountBySection()[E];
  sim.buy("warm"); sim.buy("warm");                            // Terraform +12 °C through the shop path
  let dead = 0; for (let k = 0; k < 1500; k++) { sim.tick(); for (const i of sim.map.SEC_TILES[E]) if (sim.state[i] === sim.DEAD) dead++; }
  const after = sim.livingCountBySection()[E], ev2 = sim.evaluate(E);
  check(before >= 60 && after === 0 && dead > 0 && ev2.limitKey === "Temperature",
    "a waterborne colony that turns too hot dies back (Terraform Warm ×2) — ordinary die-back, real limiting factor",
    `East ${before} → ${after} living, limit ${ev2.limitKey}: ${ev2.cats.Temperature.word}`);
}

// 4 · generated archipelago: seed 119, 60% water, constrained to the configured crossing range
//     (BLOOM-027B: was seed 25; on the cylindrical generator seed 25's three islands are one landmass across the cut, so it no longer
//     is an archipelago. Seed 119 fills the same role with the same build: 3 landmasses, 10 of 14 sections stranded without the trait,
//     59% coverage without it, every landmass colonized and a 70% win with it — docs/evidence/bloom-027b/fixture-changes.md)
{
  const params = { seed: 119, waterPct: 60, sections: 14, maxCrossingGap: XC.maxGap };
  const pl = BLOOM.generatePlanet(params), v = BLOOM.validatePlanet(pl, config, { traits, regenerate: BLOOM.generatePlanet }), R = v.stats.reach;
  check(v.ok && R.requiresCrossing && R.base.strandedSections.length > 0 && R.strongest.strandedSections.length === 0,
    "generated archipelago validates: islands need Waterborne Seeds, and every section is reachable with it",
    `${v.stats.landmasses} landmasses · ordinary spread reaches ${R.base.reachableSections}/${v.stats.sections} · with ${R.strongest.rule} ${R.strongest.reachableSections}/${v.stats.sections} · links ${JSON.stringify(R.crossingLinks)}`);
  const build = ["seedOut", "seedOut", "earlyMat", "cold", "cold", "heat", "salt", "rad", "drought"];
  const off = run(pl, { buyCrossing: false, ticks: 6000, seed: 5, extra: build }), on = run(pl, { buyCrossing: true, ticks: 6000, seed: 5, extra: build });
  const masses = m => new Set(m.sim.map.LANDMASS.filter((_, i) => m.living[i] > 0)).size, total = new Set(on.sim.map.LANDMASS).size;
  // (on this map the origin landmass alone is >70% of the land, so the islands are a choice, not mandatory)
  check(masses(off) === 1, "same build without Waterborne Seeds: only the origin landmass lives (every island stays at 0)",
    `${masses(off)}/${total} landmasses, coverage ${(off.sim.coverage() * 100).toFixed(1)}%`);
  check(masses(on) === total && on.sim.won && on.waterTouched === 0, "with Waterborne Seeds: every landmass is colonized through the real sim and the 70% win is reached",
    `${masses(on)}/${total} landmasses, first foothold tick ${on.firstFoothold}, coverage ${(on.sim.coverage() * 100).toFixed(1)}%, water untouched`);
}

console.log(fails ? `\n${fails} check(s) FAILED` : "\nALL CHECKS PASS");
process.exit(fails ? 1 : 0);
