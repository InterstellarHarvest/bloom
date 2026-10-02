// BLOOM — pressure-scenario study (BLOOM-012). A report, not pass/fail: how one scenario lands on every production archetype.
//
//   node tools/pressure-study.js [--scenario dying_world] [--seeds 20] [--json <out>]
//
// For each archetype and public seed 1..N: the accepted Eden world (layers 1–8; generation failures are listed), then the
// scenario validation layer (BLOOM.validateScenario: real pressured witnesses) with the scenario's own minStrategies and,
// for accepted combinations, with 2 strategies. Then, per fixture (Ocean 13, Desert 25, Frozen 22): the drift at full
// pressure, how much land each accepted EDEN strategy could still grow in the final state, and the pressured strategies.
"use strict";
const path = require("path"), fs = require("fs");
const ROOT = path.resolve(__dirname, "..");
for (const f of ["content/config.js", "content/traits.js", "content/archetypes.js", "content/scenarios.js", "planets/first_bloom.js", "resources/bloom-sim.js",
  "resources/bloom-gen.js", "resources/bloom-validate.js", "resources/bloom-witness.js", "resources/bloom-archetype.js", "resources/bloom-scenario.js"]) require(path.join(ROOT, f));
const { BLOOM, BLOOM_DATA } = globalThis, { config, traits, archetypes, scenarios } = BLOOM_DATA;
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const S = BLOOM.pressure.resolveScenario(scenarios, arg("--scenario") || "dying_world"), N = +(arg("--seeds") || 20), JSON_OUT = arg("--json");
const pct = x => (x * 100).toFixed(1) + "%", out = { scenario: S.id, seeds: N, archetypes: {}, fixtures: {} }, G = config.grow.growThresh;
console.log(`# ${S.name} — ${J(S.pressure && S.pressure.channels)} · grace ${S.pressure.graceSeconds} s · duration ${S.pressure.durationSeconds} s\n`);
function J(o) { return JSON.stringify(o); }
for (const A of archetypes) {
  const rows = [];
  for (let seed = 1; seed <= N; seed++) {
    let planet; try { planet = BLOOM.generateFromArchetype(A, seed, { config, traits }); } catch (e) { rows.push({ seed, status: "GENERATION FAILED" }); continue; }
    const v = BLOOM.validateScenario(planet, config, traits, S, { archetypeId: A.id }), v2 = v.ok ? BLOOM.validateScenario(planet, config, traits, S, { archetypeId: A.id, minStrategies: 2 }) : null;
    rows.push({ seed, status: v.status, two: v2 && v2.status, ms: v.search.ms, signature: v.ok ? v.strategies[0].signature : null, reason: v.ok ? null : v.reason,
      margin: v.ok ? v.strategies[0].marginSeconds : null, hold: v.ok ? v.strategies[0].hold.coverage : null });
  }
  const gen = rows.filter(r => r.status !== "GENERATION FAILED"), ok = gen.filter(r => r.status === "PASS"), two = gen.filter(r => r.two === "PASS");
  out.archetypes[A.id] = { rows, accepted: ok.length, generated: gen.length, twoStrategies: two.length };
  console.log(`## ${A.name}: ${ok.length}/${gen.length} Eden-accepted worlds pass layer P (${two.length} with 2 distinct strategies)` +
    (ok.length ? ` · margins ${Math.min(...ok.map(r => r.margin))}–${Math.max(...ok.map(r => r.margin))} s · final-state hold ${pct(Math.min(...ok.map(r => r.hold)))}–${pct(Math.max(...ok.map(r => r.hold)))}` : ""));
  for (const r of rows) console.log(`   seed ${String(r.seed).padStart(2)}  ${r.status.padEnd(12)} ${r.two ? `2×: ${r.two.padEnd(12)}` : "".padEnd(16)} ${r.signature || r.reason || ""}`);
  console.log("");
}
for (const [id, seed] of [["ocean_archipelago", 13], ["desert_world", 25], ["frozen_world", 22]]) {
  const planet = BLOOM.generateFromArchetype(archetypes.find(a => a.id === id), seed, { config, traits });
  const probe = (items, p) => { const s = BLOOM.createSim(planet, config, traits, { rng: () => 0.5, scenario: S }); s.biomass = Infinity; items.forEach(x => s.buy(x));
    const off = BLOOM.pressure.offsetsAt(S.pressure, p, planet.globalClimate), M = s.map; return M.SEC.reduce((a, _, i) => a + (s.evaluate(i, off).fitness > G ? M.AREA[i] : 0), 0) / M.LAND; };
  const max = BLOOM.pressure.maxOffsets(S.pressure, planet.globalClimate), v = BLOOM.validateScenario(planet, config, traits, S, { archetypeId: id, minStrategies: 2 });
  const eden = planet.archetype.strategies.list.map(x => ({ signature: x.signature, startLand: probe(x.minimalBuild, 0), finalLand: probe(x.minimalBuild, 1) }));
  out.fixtures[`${id}:${seed}`] = { name: planet.name, maxDrift: max, eden, layerP: v.status, strategies: v.strategies.map(x => ({ signature: x.signature, purchases: x.purchases, winSeconds: x.winSeconds, hold: x.hold, held: x.held })) };
  console.log(`## fixture ${id} ${seed} (${planet.name}) — full drift: moisture ${max.moist.toFixed(1)}, temperature ${max.temp} °C, radiation +${max.rad}`);
  for (const e of eden) console.log(`   Eden strategy [${e.signature}]: growable land ${pct(e.startLand)} at the start → ${pct(e.finalLand)} in the final state`);
  console.log(`   layer P (2 strategies): ${v.status}`);
  for (const x of v.strategies) console.log(`   [${x.signature}] ${x.purchases.map(p => `${p.id}@${Math.round(p.seconds)}s`).join(" → ")} · win ${Math.round(x.winSeconds)} s · holds ${pct(x.hold.coverage)} at ${Math.round(x.hold.seconds)} s`);
  console.log("");
}
if (JSON_OUT) { fs.writeFileSync(JSON_OUT, JSON.stringify(out, null, 1)); console.log("written:", JSON_OUT); }
