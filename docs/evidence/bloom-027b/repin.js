// BLOOM-027B evidence: recompute every generator-dependent pin the QA suites hold, with each suite's OWN hashing (copied verbatim),
// so the re-pin is auditable: frozen-check PIN (56 planet bodies), dying-world-check BASE_FP (geometry + Eden run), native-competition-check
// BASE_FP / PIN (planet, Dying World run, layer P), volatile-climate-check PIN (planet, Eden / Dying World / Native Competition runs + layer P).
//   node docs/evidence/bloom-027b/repin.js <bloom-root> <out.json>
"use strict";
const fs = require("fs"), path = require("path"), ROOT = path.resolve(process.argv[2]), OUT = process.argv[3];
for (const f of ["content/config.js", "content/traits.js", "content/archetypes.js", "content/scenarios.js", "planets/first_bloom.js", "resources/bloom-sim.js", "resources/bloom-gen.js",
  "resources/bloom-validate.js", "resources/bloom-witness.js", "resources/bloom-archetype.js", "resources/bloom-scenario.js"]) require(path.join(ROOT, f));
const { BLOOM, BLOOM_DATA } = globalThis, { config, traits, archetypes, scenarios } = BLOOM_DATA, GOLD = require(path.join(ROOT, "tools/golden/scenarios.js")), mul = GOLD.mulberry32, J = JSON.stringify;
const fnv = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return (h >>> 0).toString(16).padStart(8, "0"); };
const gen = (id, seed) => BLOOM.generateFromArchetype(archetypes.find(a => a.id === id), seed, { config, traits });
const EDEN = scenarios.find(s => s.id === "eden"), DW = scenarios.find(s => s.id === "dying_world"), NC = scenarios.find(s => s.id === "native_competition");
const out = { root: ROOT, frozenCheckPIN: {}, dyingWorldBASE_FP: {}, nativeCompetition: { BASE_FP: {}, PIN: { planets: {}, dw: {}, dwLayerP: {} } }, volatileClimatePIN: {} };
// frozen-check: body() of 56 attempts / default-generator planets
{ const body = p => { const { params, archetype, ...rest } = p; return fnv(J(rest)); };
  for (const id of ["ocean_archipelago", "desert_world"]) for (const s of [1, 8, 13, 25, 9, 35]) for (const k of [0, 1, 2]) out.frozenCheckPIN[`${id}|${s}|${k}`] = body(BLOOM.archetype.attemptPlanet(archetypes.find(a => a.id === id), s, k).planet);
  for (const s of [1, 2, 3, 7, 42]) for (const w of [0, 8, 30, 60]) out.frozenCheckPIN[`default|${s}|${w}`] = body(BLOOM.generatePlanet({ seed: s, waterPct: w, sections: 15 })); }
// dying-world-check BASE_FP: geometry (planet minus archetype record) + 3000-tick Eden run (state|biomass|density every 500 ticks, rng 12345, first proven plan)
const runFpDW = (sim, plan, ticks, every = 500) => { let k = 0; const tr = []; for (let t = 1; t <= ticks; t++) { sim.tick(); if (k < plan.length && sim.biomass >= sim.price(sim.traitById[plan[k]]) && sim.buy(plan[k])) k++;
  if (t % every === 0) tr.push(fnv(Array.from(sim.state).join("") + "|" + sim.biomass + "|" + Array.from(sim.dens).join(","))); } return tr.join(","); };
const runFpNC = (sim, plan, ticks, every = 500) => { let k = 0; const tr = []; for (let t = 1; t <= ticks; t++) { sim.tick(); if (k < plan.length && sim.biomass >= sim.price(sim.traitById[plan[k]]) && sim.buy(plan[k])) k++;
  if (t % every === 0) tr.push(fnv(Array.from(sim.state).join("") + "|" + sim.biomass + "|" + Array.from(sim.dens).join(",") + "|" + sim.lost)); } return tr.join(","); };
// volatile-climate-check's runFp: as above plus every native stand when competition is enabled
const runFpVC = (sim, plan, ticks, every = 500) => { let k = 0; const tr = []; for (let t = 1; t <= ticks; t++) { sim.tick(); if (k < plan.length && sim.biomass >= sim.price(sim.traitById[plan[k]]) && sim.buy(plan[k])) k++;
  if (t % every === 0) tr.push(fnv(Array.from(sim.state).join("") + "|" + sim.biomass + "|" + Array.from(sim.dens).join(",") + "|" + sim.lost + (sim.competition.enabled ? "|" + Array.from(sim.competition.native).join(",") : ""))); } return tr.join(","); };
const WORLDS = {};
for (const key of ["ocean_archipelago:28", "ocean_archipelago:8", "desert_world:17", "desert_world:4", "frozen_world:11", "frozen_world:4", "ocean_archipelago:30", "frozen_world:9", "desert_world:22"]) {
  const [id, seed] = key.split(":"), p = WORLDS[key] = gen(id, +seed), { archetype: _, ...geometry } = p, plan = p.archetype.strategies.list[0].purchases.map(x => x[0]);
  const run = runFpDW(BLOOM.createSim(p, config, traits, { rng: mul(12345) }), plan, 3000), eden = runFpDW(BLOOM.createSim(p, config, traits, { rng: mul(12345), scenario: EDEN }), plan, 3000);
  out.dyingWorldBASE_FP[key] = { geometry: fnv(J(geometry)), run, edenEqualsRun: eden === run, attempt: p.archetype.attempt, name: p.name, strategies: p.archetype.strategies.list.map(x => x.signature) };
  console.error(`${key}: attempt ${p.archetype.attempt} ${p.name}`);
}
for (const key of ["ocean_archipelago:28", "desert_world:17", "frozen_world:11", "ocean_archipelago:30", "frozen_world:4", "desert_world:22"]) {
  const [id, seed] = key.split(":"), p = WORLDS[key], plan = p.archetype.strategies.list[0].purchases.map(x => x[0]);
  out.nativeCompetition.BASE_FP[key] = out.dyingWorldBASE_FP[key].run; // (the same pins as dying-world-check)
  out.nativeCompetition.PIN.planets[key] = fnv(J(p));
  out.nativeCompetition.PIN.dw[key] = runFpNC(BLOOM.createSim(p, config, traits, { rng: mul(4242), scenario: DW }), plan, 3000);
  const v = BLOOM.validateScenario(p, config, traits, DW, { archetypeId: id });
  out.nativeCompetition.PIN.dwLayerP[key] = fnv(J({ status: v.status, strategies: v.strategies.map(x => ({ sig: x.signature, purchases: x.purchases, margin: x.marginSeconds, hold: x.hold, trace: x.trace })) }));
  const row = out.volatileClimatePIN[key] = { planet: fnv(J(p)) };
  for (const S of [EDEN, DW, NC]) { row[S.id + "Run"] = fnv(runFpVC(BLOOM.createSim(p, config, traits, { rng: mul(4242), scenario: S }), plan, 3000));
    if (S !== EDEN) { const w = BLOOM.validateScenario(p, config, traits, S, { archetypeId: id }); row[S.id + "Status"] = w.status;
      row[S.id + "LayerP"] = fnv(J({ status: w.status, strategies: w.strategies.map(x => ({ sig: x.signature, purchases: x.purchases, margin: x.marginSeconds, hold: x.hold, trace: x.trace, competition: x.competition, confirm: x.confirm })) })); } }
  console.error(`${key}: DW ${out.nativeCompetition.PIN.dwLayerP[key]} (${v.status}) · NC ${row.native_competitionStatus}`);
}
fs.writeFileSync(OUT, JSON.stringify(out, null, 1)); console.log(JSON.stringify(out, null, 1));
