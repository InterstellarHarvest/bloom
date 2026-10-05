// BLOOM-027A evidence: hash every rectangular procedural output path so the topology change can be proven data-identical.
//   node docs/evidence/bloom-027a/procedural-snapshot.js <bloom-root> <out.json>   (baseline = a `git worktree` of b704961)
"use strict";
const fs = require("fs"), path = require("path"), crypto = require("crypto");
const ROOT = path.resolve(process.argv[2]), OUT = process.argv[3];
for (const f of ["content/config.js", "content/traits.js", "content/archetypes.js", "content/scenarios.js", "planets/first_bloom.js",
  "resources/bloom-sim.js", "resources/bloom-gen.js", "resources/bloom-validate.js", "resources/bloom-witness.js", "resources/bloom-archetype.js"]) require(path.join(ROOT, f));
const { BLOOM, BLOOM_DATA } = globalThis, { config, traits, archetypes, scenarios } = BLOOM_DATA;
const GOLD = require(path.join(ROOT, "tools/golden/scenarios.js"));
const sha = o => crypto.createHash("sha256").update(typeof o === "string" ? o : JSON.stringify(o)).digest("hex").slice(0, 16);
const GAP = config.crossing.maxGap, out = { generatePlanet: {}, validate: {}, archetypeRaw: {}, archetypeAccepted: {}, runs: {}, firstBloom: {} };
// 1. raw generator: 40 seeds × 4 param sets
for (const [k, p] of Object.entries({ dry: { waterPct: 0, sections: 14 }, moderate: { waterPct: 30, sections: 14, maxCrossingGap: GAP },
  islands: { waterPct: 60, sections: 14, maxCrossingGap: GAP }, small: { waterPct: 45, sections: 10, width: 48, height: 32, maxCrossingGap: GAP } })) {
  const planets = [], vals = [];
  for (let seed = 1; seed <= 40; seed++) { const pl = BLOOM.generatePlanet({ seed, ...p }); planets.push(pl);
    const v = BLOOM.validatePlanet(pl, config, { traits, regenerate: BLOOM.generatePlanet }); vals.push({ ok: v.ok, errors: v.errors, warnings: v.warnings, stats: v.stats }); }
  out.generatePlanet[k] = sha(planets); out.validate[k] = sha(vals);
}
// 2. archetype production path: raw attempt 0 and the accepted world (structural validation, no winnability) for public seeds 1..40
for (const A of archetypes) {
  const raw = [], acc = [];
  for (let s = 1; s <= 40; s++) { raw.push(BLOOM.archetype.attemptPlanet(A, s, 0).planet);
    try { const r = BLOOM.generateFromArchetype(A, s, { config, traits }); acc.push({ planet: r, accepted: true }); }
    catch (e) { acc.push({ accepted: false, error: String(e.message).slice(0, 80) }); } }
  out.archetypeRaw[A.id] = sha(raw); out.archetypeAccepted[A.id] = sha(acc);
}
// 3. deterministic 3000-tick runs on the fixtures under every scenario (state + density + biomass every 250 ticks)
const FIX = { ocean13: ["ocean_archipelago", 13], desert25: ["desert_world", 25], frozen22: ["frozen_world", 22], ocean8: ["ocean_archipelago", 8] };
for (const [name, [aid, seed]] of Object.entries(FIX)) {
  const planet = BLOOM.generateFromArchetype(archetypes.find(a => a.id === aid), seed, { config, traits });
  for (const sc of scenarios) for (const rich of [false, true]) {
    const sim = BLOOM.createSim(planet, config, traits, { rng: GOLD.mulberry32(7), scenario: sc });
    if (rich) sim.biomass = 1e9; // every plan item is bought as soon as it is offered → crossings, fronts and die-back all run
    const plan = ["seedOut", "cold", "heat", "drought", "crossing", "salt", "rad", "earlyMat"]; let k = 0; const tr = [];
    for (let t = 1; t <= 3000; t++) { sim.tick(); if (k < plan.length && sim.traitById[plan[k]] && sim.offered(sim.traitById[plan[k]]) && sim.buy(plan[k])) k++;
      if (t % 250 === 0) tr.push([Array.from(sim.state).join(""), Array.from(sim.dens).join(","), sim.biomass, sim.coverage(), sim.lost, sim.crossing.arrivals, sim.crossing.footholds, sc.competition ? Array.from(sim.competition.native).join(",") : ""]); }
    out.runs[`${name}/${sc.id}${rich ? "/rich" : ""}`] = { hash: sha(tr), coverage: +sim.coverage().toFixed(4), ticks: sim.ticks, cent: sha(sim.map.CENT), footholds: sim.crossing.footholds };
  }
}
// 4. First Bloom golden parts + its layout
{ const planet = BLOOM_DATA.planets.first_bloom, sim = BLOOM.createSim(planet, config, traits, { rng: GOLD.mulberry32(1) });
  out.firstBloom = { tilemap: sha(Array.from(sim.map.TILEMAP)), cent: sha(sim.map.CENT), nbrs: sha(sim.map.NBRS) }; }
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
