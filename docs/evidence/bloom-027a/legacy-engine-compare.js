// BLOOM-027A evidence: the topology-aware engine versus the pre-027A engine on LEGACY (rectangular) worlds.
//
//   git show b704961:resources/bloom-sim.js > /tmp/bloom-sim.b704961.js
//   node docs/evidence/bloom-027a/legacy-engine-compare.js /tmp/bloom-sim.b704961.js
//
// Both engines are loaded into separate vm contexts with the same content, the same worlds (First Bloom and the three
// archetype fixtures, generated once) and the same seeded RNG wrapped in a draw counter. For every world × scenario the
// 3000-tick runs (state, stand density, native cover, Biomass, crossings every 250 ticks) and the TOTAL NUMBER OF RNG DRAWS must
// be identical, and so must the derived map (region centres, neighbours, crossing links). Exit code 1 on any difference.
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm"), crypto = require("crypto");
const ROOT = path.resolve(__dirname, "../../.."), BASE = process.argv[2];
if (!BASE) { console.error("usage: node legacy-engine-compare.js <baseline bloom-sim.js>"); process.exit(2); }
const CONTENT = ["content/config.js", "content/traits.js", "content/archetypes.js", "content/scenarios.js", "planets/first_bloom.js"];
function engine(simPath) {
  const ctx = vm.createContext({ console });
  for (const f of CONTENT) vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), ctx, { filename: f });
  vm.runInContext(fs.readFileSync(simPath, "utf8"), ctx, { filename: simPath });
  return ctx;
}
const sha = o => crypto.createHash("sha256").update(JSON.stringify(o)).digest("hex").slice(0, 16);
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
// worlds: generated ONCE with the production generator (its output is proven byte-identical separately), passed to both engines as data
for (const f of [...CONTENT, "resources/bloom-sim.js", "resources/bloom-gen.js", "resources/bloom-validate.js", "resources/bloom-witness.js", "resources/bloom-archetype.js"]) require(path.join(ROOT, f));
const { BLOOM, BLOOM_DATA } = globalThis, { config, traits, archetypes, scenarios } = BLOOM_DATA;
const worlds = { first_bloom: BLOOM_DATA.planets.first_bloom };
for (const [k, [id, seed]] of Object.entries({ ocean13: ["ocean_archipelago", 13], desert25: ["desert_world", 25], frozen22: ["frozen_world", 22] }))
  worlds[k] = JSON.parse(JSON.stringify(BLOOM.generateFromArchetype(archetypes.find(a => a.id === id), seed, { config, traits })));
const E = { baseline: engine(BASE), current: engine(path.join(ROOT, "resources/bloom-sim.js")) };
function run(ctx, planet, scenarioId, rich) {
  const D = ctx.BLOOM_DATA, sc = D.scenarios.find(s => s.id === scenarioId);
  const r = mulberry32(7), rng = () => { rng.draws++; return r(); }; rng.draws = 0;
  const sim = ctx.BLOOM.createSim(planet, D.config, D.traits, { rng, scenario: sc });
  if (rich) sim.biomass = 1e9;
  const plan = ["seedOut", "cold", "heat", "drought", "crossing", "salt", "rad", "earlyMat"]; let k = 0; const tr = [];
  for (let t = 1; t <= 3000; t++) { sim.tick(); if (k < plan.length && sim.traitById[plan[k]] && sim.offered(sim.traitById[plan[k]]) && sim.buy(plan[k])) k++;
    if (t % 250 === 0) tr.push([Array.from(sim.state).join(""), Array.from(sim.dens).join(","), sim.biomass, sim.coverage(), sim.lost, sim.crossing.arrivals, sim.crossing.footholds,
      sim.competition.enabled ? Array.from(sim.competition.native).join(",") : ""]); }
  const M = sim.map;
  return { trace: sha(tr), draws: rng.draws, coverage: +sim.coverage().toFixed(4), map: sha({ cent: M.CENT, nbrs: M.NBRS, land: M.LANDMASS, cross: M.CROSSINGS, tm: Array.from(M.TILEMAP) }) };
}
let diffs = 0; const rows = [];
for (const [w, planet] of Object.entries(worlds)) for (const sc of scenarios) for (const rich of [false, true]) {
  const a = run(E.baseline, planet, sc.id, rich), b = run(E.current, planet, sc.id, rich);
  const same = a.trace === b.trace && a.draws === b.draws && a.map === b.map;
  if (!same) diffs++;
  rows.push({ world: w, scenario: sc.id, rich, same, draws: a.draws, drawsCurrent: b.draws, coverage: b.coverage, trace: b.trace, map: b.map });
  console.log(`${same ? "SAME" : "DIFF"}  ${w.padEnd(12)} ${sc.id.padEnd(19)} ${rich ? "rich " : "plain"}  draws ${a.draws}${a.draws === b.draws ? "" : " vs " + b.draws}  trace ${b.trace}  map ${b.map}  coverage ${b.coverage}`);
}
console.log(`\n${rows.length} runs compared · ${diffs ? diffs + " DIFFER" : "all identical (traces, RNG draw counts, derived maps)"}`);
if (process.argv[3]) fs.writeFileSync(process.argv[3], JSON.stringify({ baseline: BASE, rows }, null, 1));
process.exit(diffs ? 1 : 0);
