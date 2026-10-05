// BLOOM — Frozen World archetype QA (BLOOM-011): the third procedural archetype, through the SAME generic production path
// as Ocean Archipelago and Desert World (BLOOM.generateFromArchetype → validator layers 1–8). Two parts:
//   A · Node: archetype data, neutral generator defaults, determinism/retry, frozen identity across a public-seed sweep, the
//       positive fixture's strategies and real witnesses (Cold Adaptation vs warming the sky), natural negatives, Waterborne
//       Seeds staying generic, colony development (Roots never rescues red-cold ground), First Bloom / Ocean / Desert guards
//   B · real browser: demo-run.html?archetype=frozen_world&seed=N — identity, frozen map treatment, region inspection, Cold
//       and warming previews, sky-change readouts, wins through REAL shop buttons, the Bloom Report, no Ocean/Desert wording,
//       no witness data; Desert and Ocean seeds still launch with their own treatment
//
//   NODE_PATH="$(npm root -g)" node tools/frozen-check.js [--shots <dir>] [--json <sweep.json>] [--no-browser]
//
// Production modules only. Every witness buys through sim.buy() with Biomass earned under the real economy; every UI
// purchase is a click on a real shop button. Part B needs Playwright (npm i -g playwright). Exits 1 on any failure.
"use strict";
const path = require("path"), fs = require("fs");
const ROOT = path.resolve(__dirname, "..");
for (const f of ["content/config.js", "content/traits.js", "content/archetypes.js", "planets/first_bloom.js", "resources/bloom-sim.js",
  "resources/bloom-gen.js", "resources/bloom-validate.js", "resources/bloom-witness.js", "resources/bloom-archetype.js"]) require(path.join(ROOT, f));
const { BLOOM, BLOOM_DATA } = globalThis, { config, traits, archetypes } = BLOOM_DATA, W = BLOOM.witness;
const FW = archetypes.find(a => a.id === "frozen_world"), DW = archetypes.find(a => a.id === "desert_world"), OA = archetypes.find(a => a.id === "ocean_archipelago");
const POLICY = { minStrategies: FW.validation.minStrategies, pacing: FW.validation.pacing };
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const SHOTS = arg("--shots"), JSON_OUT = arg("--json"), NO_BROWSER = process.argv.includes("--no-browser");
const J = o => JSON.stringify(o), clone = o => JSON.parse(J(o)), pct = x => (x * 100).toFixed(1) + "%";
const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length, median = xs => { const s = xs.slice().sort((a, b) => a - b); return s[(s.length - 1) >> 1]; };
const range = xs => `${Math.min(...xs)}–${Math.max(...xs)}`, hist = xs => xs.reduce((m, x) => (m[x] = (m[x] || 0) + 1, m), {});
const WATERBORNE = traits.find(t => t.effect.type === "crossing"), G = config.grow.growThresh;
const TEMP_TOOLS = traits.filter(t => t.effect.type === "tempPoint" || (t.effect.type === "sky" && t.effect.axis === "temp")).map(t => t.id);
let fails = 0;
const check = (ok, name, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); if (!ok) fails++; };
const t0 = Date.now();

// ---- fixtures: public seeds, and (seed, attempt) for natural rejected candidates, all from the BLOOM-011 sweeps
const FIX = { positive: 11, second: 4,
  // BLOOM-027B: positive = Frozen 11 (attempt 1, Pallas-609: geothermal refuge origin, 60% cold-blocked, Cold-Adapt vs Warm strategies holding different
  // land — the warm geothermal refuges; seed 22's new world accepts at attempt 0 and its strategies hold the same land); second = 4 (attempt 1; seed 12 now
  // accepts at 0). Negatives re-picked by role from per-attempt scans of seeds 1–150 × attempts 0–23 (docs/evidence/bloom-027b/fixture-changes.md §4).
  negLayer4: [67, 17],     // natural: no legal build holds 70% (best 2.1%); production accepts seed 67 at attempt 2, so it never reaches this attempt (was 46/22;
                           //   production accepts seed 46's attempt 0, so it never reaches this attempt. Layer 4 is rare on Frozen:
                           //   none in attempts 0–3 of seeds 1–400 (1,600 attempts); 3 in attempts 4–23 of seeds 1–150 (46/22,
                           //   83/17, 130/14), all deep retries production never reaches
  negLayer7: [64, 8],      // not frozen enough: most of the land is open at the start, so the win needs no upgrade at all — every (was 171/0; production
                           //   accepts seed 64 at attempt 3, so this attempt is never the production world)
                           //   build shares one empty core (one broad strategy; Temperature is not required); production skips it
  negLayer8: [30, 0],      // two broad strategies, both win too fast; production skips it (BLOOM-027B: was 22/0, now accepted at 0)
  negOrigin: [13, 0] };    // the generator's origin pick is too cold to be a genuine refuge (Temperature-limited; BLOOM-027B: was 8/0, now a layer-8 case)
const SWEEP = Array.from({ length: 40 }, (_, i) => i + 1);
// sweep quality thresholds (item 29) — the archetype's bar, set from the BLOOM-011 sweep with headroom
const Q = { minAccepted: 34, maxWater: 25, maxLandmasses: 3, minOriginShare: 0.7, minSingleLandmass: 0.75, minColdBlockedMean: 0.5, minColdBlockedEach: 0.3,
  maxColdBlockedEach: 0.95, minWarmWorlds: 0.25, minOrganismWorlds: 0.5, maxMedianSeedMs: 5000, maxSeedMs: 30000 };
// Planet bodies (everything but params/archetype metadata), FNV-1a of their JSON. Until BLOOM-027B these were the d6e9a5c (BLOOM-010)
// values, proving BLOOM-011's generator knobs change nothing at their neutral defaults. BLOOM-027B's cylindrical generator changed every
// world on purpose, so they are re-pinned to the 027B generator (docs/evidence/bloom-027b/repin.json); the knob-neutrality role is kept
// by the same comparison against this generator, and any later intended generator change must re-pin these and say so
const PIN = {"ocean_archipelago|1|0":"1e5a5387","ocean_archipelago|1|1":"12d20f18","ocean_archipelago|1|2":"9ec74812","ocean_archipelago|8|0":"85d341e7","ocean_archipelago|8|1":"05176096","ocean_archipelago|8|2":"0cbc05c8","ocean_archipelago|13|0":"314dfe63","ocean_archipelago|13|1":"b5aaad2c","ocean_archipelago|13|2":"418ed4c1","ocean_archipelago|25|0":"99017ef9","ocean_archipelago|25|1":"e1c78384","ocean_archipelago|25|2":"f0a61ad0","ocean_archipelago|9|0":"f1bf999e","ocean_archipelago|9|1":"fabf3394","ocean_archipelago|9|2":"b7c36f35","ocean_archipelago|35|0":"dbc4f986","ocean_archipelago|35|1":"1ddab33e","ocean_archipelago|35|2":"02f0ade0","desert_world|1|0":"1234d515","desert_world|1|1":"75fa498f","desert_world|1|2":"6c7d80b4","desert_world|8|0":"d3df3115","desert_world|8|1":"f9cf62e8","desert_world|8|2":"8acadde8","desert_world|13|0":"e6f6bdb9","desert_world|13|1":"cf2332b6","desert_world|13|2":"1b9c4e1b","desert_world|25|0":"6bb15087","desert_world|25|1":"0e2c3c1b","desert_world|25|2":"1d4f29b0","desert_world|9|0":"83d60a64","desert_world|9|1":"7ab8d98d","desert_world|9|2":"9e8cdd32","desert_world|35|0":"e4ff041e","desert_world|35|1":"dac49453","desert_world|35|2":"33a87149","default|1|0":"be4c4519","default|1|8":"089e64a8","default|1|30":"91daf3f5","default|1|60":"7c38b318","default|2|0":"d4e9c07d","default|2|8":"b72e81e8","default|2|30":"0a0bdb86","default|2|60":"990d352a","default|3|0":"1d7627d1","default|3|8":"4ee71033","default|3|30":"52271657","default|3|60":"204fe308","default|7|0":"d9b0872f","default|7|8":"d2fafae1","default|7|30":"48808a85","default|7|60":"bbff9607","default|42|0":"d4e78cb9","default|42|8":"0da24e05","default|42|30":"d7a22763","default|42|60":"e66707d7"};
const effT = p => p.sections.map(s => p.globalClimate.temperature + s.local.tempOffset);
const areaMean = (p, xs) => xs.reduce((a, x, i) => a + x * p.sections[i].area, 0) / p.sections.reduce((a, s) => a + s.area, 0);
const probeOf = p => BLOOM.createSim(p, config, traits, { rng: () => 0.5 });
const rawFit = e => Object.values(e.cats).reduce((a, c) => a * c.f, 1);
const toks = s => s.tokens || s.signature.split(" · "); // (a production summary records the signature string only)
// how a strategy answers the cold: "Adapt" (Cold Tolerance only), "Terraform" (warming only) or "Adapt+Terraform"
const coldMeans = s => { const t = toks(s).find(x => x.startsWith("Temperature:cold=")) || ""; return /Adapt/.test(t) && /Terraform/.test(t) ? "Adapt+Terraform" : /Terraform/.test(t) ? "Terraform" : /Adapt/.test(t) ? "Adapt" : "none"; };
const fnv = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, "0"); };
const body = p => { const { params, archetype, ...rest } = p; return fnv(J(rest)); };

// =====================================================================================================================
console.log("# A1–2, 6 · archetype data, neutral generator defaults");
check(archetypes.every(a => BLOOM.archetype.checkArchetype(a, config).length === 0), "1 · Frozen World archetype data is valid (and Ocean Archipelago / Desert World still are)",
  `${FW.id} "${FW.name}" · sections ${J(FW.sections)} · water ${J(FW.water)} · requiredConditions ${J(FW.validation.requiredConditions)}`);
check(!/function|=>/.test(J(archetypes)) && J(clone(archetypes)) === J(archetypes) && archetypes.length === 3, "2 · the archetype catalogue is plain data, now three archetypes",
  archetypes.map(a => a.id).join(", "));
for (const [name, mut] of [["an unknown climate knob", a => a.climate.geothermalHeat = 3], ["a render tint mode other than dry/cold", a => a.render.tintBy = "snow"],
  ["a non-boolean frost flag", a => a.render.frost = "yes"], ["an unknown required condition", a => a.validation.requiredConditions = ["Temperature"]],
  ["an unknown naming pool", a => a.naming.ice = ["Floe"]], ["an origin-fitness bar above 1", a => a.geography.minOriginFitness = 1.5]]) {
  const a = clone(FW); mut(a); const e = BLOOM.archetype.checkArchetype(a, config); check(e.length > 0, `1 · schema rejects ${name}`, e[0]);
}
{ const knobs = ["elevationCooling", "geothermalChance", "geothermalWarmth"], D = BLOOM.gen.CLIMATE_DEFAULTS;
  check(Object.keys(FW.climate).every(k => k in D) && knobs.every(k => D[k] === 0) && J(OA.validation.pacing) === J({ marginSeconds: [240, 720], firstPurchaseSeconds: [0, 60], maxPurchaseGapSeconds: 120 }) /* BLOOM-013 decision-cadence bands */ &&
    J(DW.validation.requiredConditions) === J(["Water:dry"]) && !OA.validation.requiredConditions && DW.render.tintBy === undefined && DW.render.dunes === true,
    "2 · Frozen is data over generic generator knobs (no Frozen-specific generator or simulation code); Ocean's and Desert's own policies are untouched",
    `new generic climate knobs, all 0 by default: ${knobs.join(", ")} · render tintBy/frost (optional) · Desert still requires ${DW.validation.requiredConditions}`); }
{ const now = {}; for (const k of Object.keys(PIN)) { const [id, s, w] = k.split("|").map((x, i) => i ? +x : x);
    now[k] = body(id === "default" ? BLOOM.generatePlanet({ seed: s, waterPct: w, sections: 15 }) : BLOOM.archetype.attemptPlanet(archetypes.find(a => a.id === id), s, w).planet); }
  const diff = Object.keys(PIN).filter(k => PIN[k] !== now[k]);
  const g = BLOOM.generatePlanet({ seed: 5, waterPct: 20, sections: 14 });
  check(!diff.length && g.sections.every(s => !("geothermal" in s)),
    "6 · existing worlds unchanged under the neutral defaults: 56 Ocean/Desert attempts and default-generator planets match the BLOOM-027B generator pins bit-for-bit (tiles, sections, names, origin; were d6e9a5c until the cylindrical generator)",
    diff.length ? `changed: ${diff.join(", ")}` : `${Object.keys(PIN).length} planet bodies identical · no geothermal tags unless switched on`); }

console.log("\n# A3–5 · deterministic generate/validate/retry");
const pos = BLOOM.generateFromArchetype(FW, FIX.positive, { config, traits });
check(J(pos) === J(BLOOM.generateFromArchetype(FW, FIX.positive, { config, traits })) && BLOOM.validatePlanet(pos, config, { traits, regenerate: BLOOM.generatePlanet }).ok &&
  pos.params.climate.elevationCooling === FW.climate.elevationCooling && pos.params.names,
  "3 · same archetype + public seed → identical accepted world, which reproduces exactly from its recorded generation params", `seed ${FIX.positive} → attempt ${pos.archetype.attempt} · ${pos.name} (${pos.id})`);
{ const a = pos.archetype;
  check(a.attempt === 1 && a.generationSeed === BLOOM.archetype.fnv1a(`${FW.id}|${FIX.positive}|1`) && a.rejectedAttempts.length === 1 && /^layer 8/.test(a.rejectedAttempts[0].rejected[0]),
    "4 · bounded retry is deterministic: attempt k uses FNV-1a(\"frozen_world|seed|k\"); the rejected attempt 0 is recorded and skipped identically every time",
    `seed ${FIX.positive}: #0 ${a.rejectedAttempts[0].rejected[0].slice(0, 90)}… → attempt 1`);
  let err = null; const one = clone(FW); one.generation.maxAttempts = 1; try { BLOOM.generateFromArchetype(one, FIX.positive, { config, traits }); } catch (e) { err = e; }
  check(err && err.attempts.length === 1 && /no acceptable world in 1 attempts/.test(err.message) && /^layer 8/.test(err.attempts[0].rejected[0]),
    "5 · explicit bounded failure: with one attempt allowed, seed 22 throws with its reason (never returns a bad or substitute world)", err && err.attempts[0].rejected[0].slice(0, 120)); }

// ---- A7–13 + 29 · the public-seed sweep, full production path
console.log("\n# A7–13, 18, 29 · Frozen World public seeds 1–40 (full production path, layers 1–8)");
const worlds = [], genFails = [], allAttempts = [], seedMs = [], tS = Date.now();
for (const s of SWEEP) { const t = Date.now();
  try { const p = BLOOM.generateFromArchetype(FW, s, { config, traits }); worlds.push(p); allAttempts.push(...p.archetype.rejectedAttempts.map(a => ({ seed: s, ...a }))); }
  catch (e) { if (!e.attempts) throw e; genFails.push(s); allAttempts.push(...e.attempts.map(a => ({ seed: s, ...a }))); }
  seedMs.push(Date.now() - t); }
const sweepMs = Date.now() - tS;
const layerOf = r => /^origin .* not a refuge/.test(r) ? "layer 2 (origin refuge)" : /refuge region\(s\) besides the origin/.test(r) ? "layer 2 (other refuges)" : (r.match(/^layer \d+ \([^)]*\)/) || [/water .* drifted/.test(r) ? "water drift" : /landmass/.test(r) ? "landmasses" : r.slice(0, 40)])[0];
const rejByLayer = hist(allAttempts.map(a => layerOf(a.rejected[0])));
const S = worlds.map(p => { const a = p.archetype, sim = probeOf(p), M = sim.map, ev = M.SEC.map((_, i) => sim.evaluate(i));
  const landShare = f => M.SEC.reduce((x, _, i) => x + (f(i) ? M.AREA[i] : 0), 0) / M.LAND;
  return { p, a, secs: p.sections.length, T: areaMean(p, effT(p)), tMin: Math.min(...ev.map(e => e.effT)), tMax: Math.max(...ev.map(e => e.effT)),
    M: areaMean(p, p.sections.map(s => p.globalClimate.moisture + s.local.moistureOffset)),
    coldBlocked: landShare(i => ev[i].fitness <= G && ev[i].limitKey === "Temperature" && ev[i].effT < 0), // blocked primarily by the cold
    waterLimited: landShare(i => ev[i].fitness <= G && ev[i].limitKey === "Water"), hotBlocked: landShare(i => ev[i].fitness <= G && ev[i].limitKey === "Temperature" && ev[i].effT > 0),
    open: landShare(i => ev[i].fitness > G), geo: p.sections.filter(s => s.geothermal).length,
    refuges: ev.filter((e, i) => i !== M.ORIGIN && e.fitness > config.categories.lamp.green).length, originRaw: rawFit(ev[M.ORIGIN]), originT: ev[M.ORIGIN].effT,
    crossOffered: sim.offered(WATERBORNE), strategies: a.strategies.list }; });
const OAw = SWEEP.slice(0, 20).map(s => BLOOM.archetype.attemptPlanet(OA, s, 0).planet), DWw = SWEEP.slice(0, 20).map(s => BLOOM.archetype.attemptPlanet(DW, s, 0).planet);
const DEF = SWEEP.slice(0, 20).map(s => BLOOM.generatePlanet({ seed: s, waterPct: 8, sections: 15 }));
const meanT = ps => mean(ps.map(p => areaMean(p, effT(p)))), oaT = meanT(OAw), dwT = meanT(DWw), defT = meanT(DEF), fT = mean(S.map(x => x.T));
const strat = S.flatMap(x => x.strategies), cm = S.map(x => x.strategies.map(coldMeans));
console.log(`  accepted ${worlds.length}/${SWEEP.length}${genFails.length ? ` · explicit failures: seeds ${genFails.join(", ")}` : " · no generation failures"} · attempts ${J(hist(S.map(x => x.a.attempt)))}`);
console.log(`  rejected attempts ${allAttempts.filter(a => a.rejected.length).length}, by first reason: ${J(rejByLayer)}`);
console.log(`  water ${range(S.map(x => x.a.actualWaterPct))}% (mean ${mean(S.map(x => x.a.actualWaterPct)).toFixed(1)}%) · landmasses ${J(hist(S.map(x => x.a.landmasses)))} · origin landmass share ${range(S.map(x => x.a.originLandmassShare))} · sections ${J(hist(S.map(x => x.secs)))}`);
console.log(`  temperature (area-weighted, start): ${range(S.map(x => Math.round(x.T)))} °C (mean ${fT.toFixed(1)}) · coldest region ${range(S.map(x => x.tMin))} °C · warmest ${range(S.map(x => x.tMax))} °C · origin ${range(S.map(x => x.originT))} °C · moisture mean ${mean(S.map(x => x.M)).toFixed(1)}`);
console.log(`  land at the start: cold-blocked ${pct(mean(S.map(x => x.coldBlocked)))} (${range(S.map(x => Math.round(x.coldBlocked * 100)))}%) · open ${pct(mean(S.map(x => x.open)))} · heat-blocked ${pct(mean(S.map(x => x.hotBlocked)))} · water-limited ${pct(mean(S.map(x => x.waterLimited)))} · geothermal regions ${range(S.map(x => x.geo))} · other green refuges ${range(S.map(x => x.refuges))}`);
console.log(`  vs Ocean Archipelago ${oaT.toFixed(1)} °C · Desert World ${dwT.toFixed(1)} °C · default generator ${defT.toFixed(1)} °C`);
console.log(`  how strategies answer the cold, per world: ${J(hist(cm.map(w => w.slice().sort().join(" vs "))))}`);
console.log(`  strategy classes: ${J(hist(strat.map(s => s.signature)))}`.slice(0, 1100));
console.log(`  first purchases: ${J(hist(strat.map(s => s.purchases[0][0])))} at ${range(strat.map(s => s.firstPurchaseSeconds))} s · win ${range(strat.map(s => s.winSeconds))} s · margin ${range(strat.map(s => s.marginSeconds))} s (median ${median(strat.map(s => s.marginSeconds))}) · max gap ${range(strat.map(s => s.maxPurchaseGapSeconds))} s · terminal wait ${range(strat.map(s => s.terminalWaitSeconds))} s`);
console.log(`  runtime ${(sweepMs / 1000).toFixed(1)} s for 40 seeds · median ${median(seedMs)} ms · worst ${Math.max(...seedMs)} ms`);

check(S.every(x => Math.abs(x.a.actualWaterPct - x.a.requestedWaterPct) <= FW.water.tolerance && x.a.actualWaterPct <= Q.maxWater),
  `7 · every accepted world's water is within ±${FW.water.tolerance} of its request (${FW.water.min}–${FW.water.max}%): lakes and inlets, never an ocean world`,
  `actual ${range(S.map(x => x.a.actualWaterPct))}% · max drift ${Math.max(...S.map(x => Math.abs(x.a.actualWaterPct - x.a.requestedWaterPct))).toFixed(1)}`);
check(S.every(x => x.a.landmasses <= Q.maxLandmasses && x.a.originLandmassShare >= Q.minOriginShare) && S.filter(x => x.a.landmasses === 1).length >= Q.minSingleLandmass * S.length,
  "8 · geography: mostly contiguous — ≤ 3 landmasses, the origin's landmass holds ≥ 70% of the land, most worlds are one landmass", J(hist(S.map(x => x.a.landmasses))));
check(fT <= oaT - 15 && fT <= dwT - 25 && fT <= defT - 5 && S.every(x => x.T < Math.min(oaT, dwT)),
  "9 · substantially colder than Ocean Archipelago, Desert World and the default generator (area-weighted effective temperature)",
  `Frozen ${fT.toFixed(1)} °C vs Ocean ${oaT.toFixed(1)} · Desert ${dwT.toFixed(1)} · default ${defT.toFixed(1)}`);
check(S.every(x => x.open >= 0.1 && x.coldBlocked <= Q.maxColdBlockedEach) && S.filter(x => x.tMax > 0).length >= 0.9 * S.length,
  "10 · temperature is never uniformly lethal: every world opens with ≥ 10% of its land growable, and nearly all have ground above freezing",
  `open at start ${range(S.map(x => Math.round(x.open * 100)))}% · warmest region ${range(S.map(x => x.tMax))} °C (above 0 °C in ${S.filter(x => x.tMax > 0).length}/${S.length})`);
check(S.every(x => x.refuges >= FW.geography.minRefuges) && S.filter(x => x.refuges >= 3).length >= 0.5 * S.length && S.filter(x => x.geo >= 1).length >= 0.9 * S.length,
  "11 · genuine viable refuges exist beyond the origin: every world has ≥ 2 other green regions at the start (geography.minRefuges), many have more; geothermal pockets in nearly all",
  `other green refuges ${J(hist(S.map(x => x.refuges)))} · geothermal regions ${J(hist(S.map(x => x.geo)))}`);
check(S.every(x => x.originRaw >= FW.geography.minOriginFitness), "12 · every origin is a genuine refuge on its own conditions (before the protected-refuge floor)",
  `origin own fitness ${range(S.map(x => +x.originRaw.toFixed(2)))} · origin ${range(S.map(x => x.originT))} °C`);
check(mean(S.map(x => x.coldBlocked)) >= Q.minColdBlockedMean && S.every(x => x.coldBlocked >= Q.minColdBlockedEach) && mean(S.map(x => x.coldBlocked)) > 3 * mean(S.map(x => x.waterLimited + x.hotBlocked)),
  "13 · significant land is blocked primarily by the cold at the start (far more than by water or heat)",
  `cold-blocked ${pct(mean(S.map(x => x.coldBlocked)))} (min ${pct(Math.min(...S.map(x => x.coldBlocked)))}) vs water-limited ${pct(mean(S.map(x => x.waterLimited)))} + heat-blocked ${pct(mean(S.map(x => x.hotBlocked)))}`);
check(S.every(x => x.strategies.every(s => toks(s).some(t => t.startsWith("Temperature:cold=")))), "18 · every proven strategy in the sweep answers Temperature:cold (Adaptation, Terraform or both)",
  `${strat.length} strategies: ${J(hist(strat.map(coldMeans)))}`);
const warmWorlds = S.filter(x => x.strategies.some(s => /Terraform/.test(coldMeans(s)))).length, orgWorlds = S.filter(x => x.strategies.some(s => coldMeans(s) === "Adapt")).length;
check(worlds.length >= Q.minAccepted && S.every(x => x.strategies.length >= 2 && J(x.a.validatedLayers) === "[1,2,3,4,5,6,7,8]") && warmWorlds >= Q.minWarmWorlds * S.length &&
  orgWorlds >= Q.minOrganismWorlds * S.length && median(seedMs) <= Q.maxMedianSeedMs && Math.max(...seedMs) <= Q.maxSeedMs,
  `29 · sweep quality: ≥ ${Q.minAccepted}/40 accepted through layers 1–8; a warming strategy in ≥ 25% of worlds and a Cold-Tolerance-only one in ≥ 50%; runtime bounded`,
  `${worlds.length}/40 · warming strategy in ${warmWorlds} worlds · Cold-only strategy in ${orgWorlds} · median ${median(seedMs)} ms, worst ${Math.max(...seedMs)} ms`);

// ---- A14–24 · positive fixture
console.log(`\n# A14–24 · positive fixture — Frozen World public seed ${FIX.positive} (attempt ${pos.archetype.attempt}, ${pos.name})`);
const vPos = BLOOM.validatePlanet(pos, config, { traits, regenerate: BLOOM.generatePlanet, winnability: true, strategies: POLICY, measurePeak: true });
const R = vPos.stats.strategies, secName = id => pos.sections.find(s => s.id === id).name;
const org = R.strategies.find(s => coldMeans(s) === "Adapt" && s.tokens.every(t => /=Adapt\(\d\)$/.test(t)));
const tfm = R.strategies.find(s => /Terraform\(\+\d+\)/.test(s.tokens.find(t => t.startsWith("Temperature:cold=")) || "") && s !== org);
const wOrg = (R.witnesses || []).find(w => w.signature.key === (org && org.signature)), wTfm = (R.witnesses || []).find(w => w.signature.key === (tfm && tfm.signature));
const psim = probeOf(pos), PM = psim.map, pev = PM.SEC.map((_, i) => psim.evaluate(i));
for (const s of R.strategies || []) {
  console.log(`  [${s.signature}]\n    core ${s.minimalBuild.join(" + ")} · plan ${s.purchases.map(p => `${p.id} @ ${p.seconds} s (${p.cost})`).join(" → ")}`);
  console.log(`    spent ${s.totalSpent} · win ${s.winSeconds} s · margin ${s.marginSeconds} s · peak ${pct(s.peak)} · first ${s.pacing.firstPurchaseSeconds} s · gaps ${s.pacing.purchaseGapsSeconds.join("/")} s · terminal wait ${s.pacing.terminalWaitSeconds} s · Biomass/min ${s.pacing.earnedPerMinute.join(",")}`);
  console.log(`    holds ${s.held.map(secName).join(", ")} (${pct(s.heldShare)})`);
}
console.log(`  regions: ${PM.SEC.map((s, i) => `${s.name}${s.isOrigin ? "★" : ""}${s.geothermal ? "(geo)" : ""} ${pev[i].effT}°C`).join(" · ")}`);
console.log(`  early land (no upgrades): reachable ${pct(R.early.reachableShare)}, growable ${pct(R.early.growableShare)} · ${R.search.simulations} simulations over ${R.search.classes} classes`);
const fixCold = S.find(x => x.a.publicSeed === FIX.positive);
check(vPos.ok && R.status === "PASS" && R.layer7.status === "PASS" && R.layer8.status === "PASS" && pos.archetype.landmasses === 1 && fixCold.coldBlocked >= 0.6 && pev[PM.ORIGIN].effT > 0 && rawFit(pev[PM.ORIGIN]) >= 0.9,
  "14 · the fixture is unmistakably frozen (most land cold-blocked, one landmass, a warm geothermal refuge origin) and passes layers 1–8",
  `${pct(fixCold.coldBlocked)} cold-blocked · ${pct(fixCold.open)} open · origin ${secName(pos.origin)} ${pev[PM.ORIGIN].effT} °C · water ${pos.archetype.actualWaterPct}% · ${pos.sections.length} sections`);
const dAB = org && tfm && W.signatureOf ? R.differences.find(d => (d.a === org.signature && d.b === tfm.signature) || (d.b === org.signature && d.a === tfm.signature)) : null;
check(R.strategies.length >= 2 && !!dAB && W.distinctSignatures(org, tfm), "15 · ≥ 2 materially different strategy signatures (each has a token the other lacks)",
  R.strategies.map(s => `[${s.signature}]`).join(" vs "));
check(!!org && org.minimalBuild.every(id => traits.find(t => t.id === id).effect.type === "tempPoint"), "16 · one strategy is organism-first: Cold Tolerance answers the cold, no Terraform at all",
  org && `[${org.signature}] core ${org.minimalBuild.join("+")}`);
check(!!tfm && tfm.minimalBuild.filter(id => id === "warm").length >= 1 && /Terraform\(\+(\d+)\)/.test(tfm.signature), "17 · a materially different strategy warms the sky (Warm the Sky is part of its minimal core)",
  tfm && `[${tfm.signature}] core ${tfm.minimalBuild.join("+")}`);
check(R.strategies.every(s => s.tokens.some(t => t.startsWith("Temperature:cold="))), "18 · every proven fixture strategy answers Temperature:cold (the archetype's requiredConditions)");
{ const none = BLOOM.findWitness(pos, config, traits, { excludeTraits: TEMP_TOOLS });
  check(!none.ok && none.layer === 4 && none.bestStatic.coverage < pos.winThreshold, "19 · Temperature is genuinely required: with no Cold/Heat Tolerance and no Warm/Cool Terraform, no legal build can hold 70% (static proof)",
    `${none.reason} · best ${none.bestStatic.build.join("+") || "(nothing)"}`); }
{ // 20 · the tradeoff: the warming sky closes warm refuges the organism keeps
  const heldOnlyOrg = org && tfm ? org.held.filter(id => !tfm.held.includes(id)) : [], shift = tfm ? tfm.minimalBuild.filter(id => id === "warm").length * traits.find(t => t.id === "warm").effect.delta : 0;
  const s2 = probeOf(pos); for (const id of tfm ? tfm.minimalBuild : []) { s2.biomass = 1e9; s2.buy(id); }
  const why = heldOnlyOrg.map(id => { const i = PM.SIDX[id], e = s2.evaluate(i); return { name: secName(id), geo: !!PM.SEC[i].geothermal, word: e.cats.Temperature.word, before: pev[i].effT, after: e.effT }; });
  // (BLOOM-027B: the claim is WHICH land each strategy keeps — the warm geothermal refuges the warming scorches — not how much in total; on Frozen 11 the
  // Terraform strategy holds more land overall while giving those refuges up, so the former "org holds more" clause is dropped)
  check(heldOnlyOrg.length >= 1 && why.every(w => w.word === "hot" || w.word === "scorching") && why.some(w => w.geo),
    "20 · the strategies hold different land: warming the sky pushes warm geothermal refuges the Cold-Tolerance strategy keeps beyond the plant's heat limit",
    `Warm +${shift} °C gives up ${why.map(w => `${w.name}${w.geo ? " (geothermal)" : ""} ${w.before} → ${w.after} °C, ${w.word}`).join("; ")} · held ${pct(org.heldShare)} vs ${pct(tfm.heldShare)} · costs ${org.minimalBuild.map(id => id).join("+")} vs ${tfm.minimalBuild.join("+")}`); }
{ const st = BLOOM.findStrategies(pos, config, traits, { ...POLICY, excludeTraits: [WATERBORNE.id] });
  check(!probeOf(pos).offered(WATERBORNE) && R.strategies.every(s => !s.tokens.some(t => t.startsWith("Crossing:"))) && !pos.archetype.witness.usedCrossing &&
    st.status === "PASS" && J(st.strategies.map(s => s.signature)) === J(R.strategies.map(s => s.signature)) && !FW.validation.crossingRequiredToWin,
    "21 · Waterborne Seeds is not required: not even offered on this one-landmass fixture, removing it changes no strategy, and Frozen policy never asks for it"); }
{ // 22 · independent earned-Biomass replay of each witness + whole core bought before the margin
  const rows = [wOrg, wTfm].map(w => { const sim = BLOOM.createSim(pos, config, traits, { rng: BLOOM.gen.mulberry32(config.validation.rngSeed) });
    let k = 0, ok = true, earned = 0; for (let t = 1; t <= w.marginTick; t++) { const b = sim.biomass; sim.tick(); earned += Math.max(0, sim.biomass - b);
      if (k < w.purchases.length && w.purchases[k].tick === t) { if (sim.biomass < w.purchases[k].cost || !sim.buy(w.purchases[k].id)) ok = false; k++; } }
    return { ok: ok && k === w.purchases.filter(p => p.tick <= w.marginTick).length && sim.coverage() >= w.target && sim.spent.local === 0, cov: sim.coverage(), k, earned: Math.round(earned), spent: sim.spent.global }; });
  const core = w => w.signature.minimalBuild.every(id => w.purchases.filter(p => p.tick <= w.marginTick && p.id === id).length >= w.signature.minimalBuild.filter(x => x === id).length);
  check(!!wOrg && !!wTfm && rows.every(r => r.ok) && [wOrg, wTfm].every(core),
    "22 · both witnesses earn their Biomass and buy through sim.buy (independent replay reproduces each margin), buy their whole core first, make no local colony choices",
    rows.map(r => `${r.k} purchases, ${r.spent} spent of ${r.earned} earned → ${pct(r.cov)}`).join(" · ")); }
check([org, tfm].every(s => s && s.peak >= pos.winThreshold + config.validation.winMargin - 1e-9 && s.winSeconds <= s.marginSeconds),
  `23 · both reach the validation margin (${pct(config.win + config.validation.winMargin)})`, [org, tfm].map(s => s && `win ${s.winSeconds} s → margin ${s.marginSeconds} s, peak ${pct(s.peak)}`).join(" · "));
check([org, tfm].every(s => s && s.pacingCheck.ok && W.checkPacing({ marginSeconds: s.marginSeconds, pacing: s.pacing }, POLICY.pacing).ok),
  "24 · both satisfy Frozen World's pacing policy (margin 360–900 s, first purchase 45–120 s, gap ≤ 240 s, terminal wait ≤ 240 s)",
  [org, tfm].map(s => s && `margin ${s.marginSeconds} s, first ${s.pacing.firstPurchaseSeconds} s, gap ${s.pacing.maxPurchaseGapSeconds} s, wait ${s.pacing.terminalWaitSeconds} s`).join(" · "));

// ---- A25–28 · natural negatives
console.log("\n# A25–28 · natural Frozen negatives (generated attempts, the validator's own verdicts)");
const at = ([s, k]) => BLOOM.archetype.attemptPlanet(FW, s, k).planet;
const skipped = ([s, k], re) => { const g = BLOOM.generateFromArchetype(FW, s, { config, traits }); return g.archetype.attempt > k && re.test(g.archetype.rejectedAttempts[k].rejected[0]) ? g.archetype.attempt : null; };
{ const p = at(FIX.negLayer4), s = BLOOM.validatePlanet(p, config, { traits, regenerate: BLOOM.generatePlanet }), v = BLOOM.validatePlanet(p, config, { traits, winnability: true, strategies: POLICY });
  const sim = probeOf(p), prodAt = BLOOM.generateFromArchetype(FW, FIX.negLayer4[0], { config, traits }).archetype.attempt;
  const lethal = sim.map.SEC.map((_, i) => i).filter(i => sim.evaluate(i).limitKey === "Hazard" && sim.evaluate(i).fitness === 0).map(i => p.sections[i].name);
  check(s.ok && !v.ok && /^layer 4 \(simultaneous coverage\)/.test(v.errors[0]) && prodAt < FIX.negLayer4[1] && lethal.length >= 1,
    `25 · layer 4 (unwinnable simultaneous coverage): seed ${FIX.negLayer4[0]} attempt ${FIX.negLayer4[1]} is structurally fine but no legal build holds 70% — its refuge is walled in by lethal toxic ground and deep ice`,
    `${v.errors[0]} · lethal: ${lethal.join(", ")} · natural but off the production path (seed ${FIX.negLayer4[0]} is accepted at attempt ${prodAt}); layer 4 is rare on Frozen: 0 of 1,600 early attempts, 3 deep retries`); }
{ const p = at(FIX.negLayer7), r = BLOOM.findStrategies(p, config, traits, POLICY), k = skipped(FIX.negLayer7, /^layer 7/), sim = probeOf(p), M = sim.map;
  const open = M.SEC.reduce((a, _, i) => a + (sim.evaluate(i).fitness > G ? M.AREA[i] : 0), 0) / M.LAND;
  const prodAt = BLOOM.generateFromArchetype(FW, FIX.negLayer7[0], { config, traits }).archetype.attempt; // (BLOOM-027B: the natural case now sits behind the accepted attempt — production never takes it either way)
  check(r.layer === 7 && r.status === "FAIL" && r.first.witness && r.first.witness.ok && r.classes.length === 1 && r.classes[0].signature === "" && open >= 0.7 && (k !== null || prodAt !== FIX.negLayer7[1]),
    `26 · layer 7 (one broad solution; Temperature not actually required): seed ${FIX.negLayer7[0]} attempt ${FIX.negLayer7[1]} is ${pct(open)} open at the start, so every build shares one empty core — a static proof`,
    `${r.reason.slice(0, 120)} · production takes attempt ${k ?? prodAt}`); }
{ const p = at(FIX.negLayer8), r = BLOOM.findStrategies(p, config, traits, POLICY), k = skipped(FIX.negLayer8, /^layer 8/);
  check(r.layer7.status === "PASS" && r.layer === 8 && r.status === "FAIL" && r.slow.every(w => w.pacingCheck.reasons.some(x => /too fast/.test(x))) && k !== null, // (BLOOM-027B: the too-fast attempt is no longer the positive fixture's own attempt 0; production still skips it)
    `27 · layer 8 (pacing): seed ${FIX.negLayer8[0]} attempt ${FIX.negLayer8[1]} has 2 broad strategies, both win too fast (too little cold resistance)`, `${r.reason.slice(0, 170)} · production takes attempt ${k}`); }
{ const p = at(FIX.negOrigin), sim = probeOf(p), e = sim.evaluate(sim.map.ORIGIN), k = skipped(FIX.negOrigin, /not a refuge/), s = BLOOM.validatePlanet(p, config, { traits });
  check(s.ok && rawFit(e) < FW.geography.minOriginFitness && e.fitness >= config.categories.originFitnessFloor && e.limitKey === "Temperature" && k !== null,
    `28 · bad refuge origin: seed ${FIX.negOrigin[0]} attempt ${FIX.negOrigin[1]} passes the structural validator, but its home region is frozen ground kept alive only by the protected-refuge floor`,
    `own fitness ${rawFit(e).toFixed(2)} at ${e.effT} °C (the floor lifts it to ${e.fitness.toFixed(2)}), limited by ${e.limitKey} · production takes attempt ${k}`); }
{ // Waterborne Seeds across the sweep: offered only by the generic rule (a real crossing), never universal, never required by policy
  const one = S.filter(x => x.a.landmasses === 1), more = S.filter(x => x.a.landmasses > 1);
  const okMore = more.every(x => x.crossOffered === (probeOf(x.p).map.CROSSINGS.links.length > 0)), used = S.filter(x => x.strategies.some(s => /Crossing:/.test(s.signature)));
  check(one.every(x => !x.crossOffered) && okMore && more.length < S.length / 2 && used.every(x => x.strategies.some(s => !/Crossing:/.test(s.signature))),
    "21 · across the sweep Waterborne Seeds stays geography-dependent: absent on every one-landmass world, offered only where a crossing exists, and never the only way to win",
    `${one.length} one-landmass worlds: offered on 0 · ${more.length} multi-landmass: offered on ${more.filter(x => x.crossOffered).length} · a crossing strategy in ${used.length} world(s) (${used.map(x => x.a.publicSeed).join(",") || "none"}), always beside a non-crossing one`); }

// ---- A30–32 · colony development on the frozen world, unchanged mechanics
console.log("\n# A30–32 · colony development on Frozen World (BLOOM-009 system, unchanged)");
{ const mk = () => BLOOM.createSim(pos, config, traits, { rng: BLOOM.gen.mulberry32(7) });
  // (BLOOM-027B: on Frozen 11 nothing but the origin is green under the starting plant, so the second refuge colony is reached after the world's own strategy A
  // core is bought — the claim, two colonies holding different focuses at once, is the same)
  const s1 = mk(), O = s1.map.ORIGIN; s1.biomass = 1e9; for (const id of pos.archetype.strategies.list[0].purchases.map(x => x[0])) s1.buy(id); s1.biomass = 0; let liv, other = -1;
  for (let t = 0; t < 4000 && other < 0; t++) { s1.tick(); if (t >= 1499 && t % 100 === 99) { liv = s1.livingCountBySection(); other = s1.map.SEC.findIndex((_, i) => i !== O && liv[i] > 0); } }
  check(other >= 0 && s1.setColonyFocus(O, "roots") && s1.setColonyFocus(other, "leaves") && s1.colonies.focus.filter(f => f !== "balanced").length === 2,
    "30 · per-region focus works on a frozen world: two refuge colonies hold different focuses at once, the rest stay Balanced", `${secName(s1.map.SEC[O].id)} Roots · ${secName(s1.map.SEC[other].id)} Leaves`);
  const c = mk(); c.biomass = 60; const refused = !c.buySpecialization(c.map.ORIGIN, "rootNetwork"); c.biomass = 200; const bought = c.buySpecialization(c.map.ORIGIN, "rootNetwork");
  check(refused && bought && c.spent.local === 90 && c.specPrice() === 130, "30 · a local specialization is bought with ordinary Biomass (refused when short) and raises the next price", "Root Network 90 → next 130");
  // 31 · Roots + Root Network never open or hold red-cold ground: (a) frozen neighbours stay empty, (b) a colony whose ground turns red-cold dies all the same
  const run = (mode, spec, ticks) => { const s = mk(); for (let t = 0; t < 400; t++) s.tick();
    for (let i = 0; i < s.map.SC; i++) if (s.livingCountBySection()[i] > 0) { s.setColonyFocus(i, mode); if (spec) { s.biomass += 1e4; s.buySpecialization(i, spec); } }
    for (let t = 0; t < ticks; t++) s.tick(); return s; };
  const red = PM.SEC.map((_, i) => i).filter(i => pev[i].fitness <= config.colony.protectAbove && pev[i].limitKey === "Temperature" && pev[i].effT < 0);
  const b = run("balanced", null, 2600), r = run("roots", "rootNetwork", 2600);
  const livRed = s => red.reduce((a, i) => a + s.livingCountBySection()[i], 0);
  const cool = mode => { const s = mk(); for (let t = 0; t < 1200; t++) s.tick(); const tgt = s.map.ORIGIN; s.setColonyFocus(tgt, mode); if (mode === "roots") { s.biomass += 1e4; s.buySpecialization(tgt, "rootNetwork"); }
    s.biomass += 1e4; s.buy("cool"); s.buy("cool"); s.biomass += 1e4; s.buy("cool"); s.buy("cool"); // −24 °C: the refuges freeze (controlled experiment; Biomass granted)
    const e = s.evaluate(tgt); for (let t = 0; t < 2500; t++) s.tick(); return { word: e.cats.Temperature.word, fit: e.fitness, left: s.livingCountBySection().reduce((a, x, i) => a + (s.evaluate(i).fitness <= config.colony.protectAbove && i !== tgt ? x : 0), 0) }; };
  const cb = cool("balanced"), cr = cool("roots");
  check(red.length >= 5 && livRed(b) === 0 && livRed(r) === 0 && cb.left === 0 && cr.left === 0 && r.colonies.spec.some(Boolean),
    "31 · Roots is not secret Cold Tolerance: with Roots + Root Network on every colony, red-cold regions are never colonized, and colonies on ground the sky turns red-cold die exactly as under Balanced",
    `${red.length} red-cold regions: living after 2600 ticks Balanced ${livRed(b)} / Roots+Root Network ${livRed(r)} · after cooling the sky 24 °C, living plants left on red ground: Balanced ${cb.left} / Roots ${cr.left}`); }
{ const STUDY = require("./colony-study.js"), plans = [org, tfm].map(s => s.purchases.map(p => p.id)), sd = [101, 108, 115];
  const w = pol => mean(plans.flatMap(plan => sd.map(x => STUDY.run(pos, plan, x, pol, "none").win)));
  const rows = Object.fromEntries(["balanced", "rootsEverywhere", "leavesEverywhere", "seedsEverywhere", "situational", "misplaced"].map(k => [k, w(k)]));
  console.log("  mean win time over both witness recipes × 3 run seeds: " + Object.entries(rows).map(([k, v]) => `${k} ${v.toFixed(0)} s`).join(" · "));
  check(Object.values(rows).every(Number.isFinite) && rows.situational < rows.balanced && rows.balanced < rows.misplaced,
    "32 · colony-study comparison produced on the fixture: situational play beats Balanced, which beats misplaced play (optional; witnesses use none)",
    `Roots everywhere ${(rows.rootsEverywhere - rows.balanced).toFixed(0)} s vs Balanced · Leaves ${(rows.leavesEverywhere - rows.balanced).toFixed(0)} s · Seeds ${(rows.seedsEverywhere - rows.balanced).toFixed(0)} s · situational ${(rows.situational - rows.balanced).toFixed(0)} s`); }

// ---- A33–36 · other worlds unchanged, Desert human gate recorded
console.log("\n# A33–36 · First Bloom, Ocean Archipelago and Desert World unchanged; Desert human gate recorded");
{ const fb = BLOOM_DATA.planets.first_bloom, v = BLOOM.validatePlanet(fb, config, { traits, winnability: true });
  check(v.ok && !probeOf(fb).offered(WATERBORNE), "33 · First Bloom remains valid (layers 1–6 witness) and its shop unchanged", `witness margin at ${v.stats.witness.witness.marginSeconds} s`); }
const OA_ID = { 28: { attempt: 8, name: "Borea-495", id: "proc_580988495" }, 8: { attempt: 1, name: "Coriol-220", id: "proc_522844220" } }; // (BLOOM-027B: Ocean 28 is the shared Ocean primary; was 13 / Eos-227)
for (const s of Object.keys(OA_ID).map(Number)) { const g = BLOOM.generateFromArchetype(OA, s, { config, traits }), a = g.archetype;
  check(a.strategies.found >= 2 && a.landmasses >= 3 && a.attempt === OA_ID[s].attempt && g.name === OA_ID[s].name && g.id === OA_ID[s].id,
    `34 · Ocean Archipelago seed ${s} still passes layers 1–8 with the same identity`, `attempt ${a.attempt} · ${g.name} · ${a.strategies.list.map(x => `[${x.signature}]`).join(" ")}`); }
{ let e = null; try { BLOOM.generateFromArchetype(OA, 114, { config, traits }); } catch (x) { e = x; }
  check(e && e.attempts.length === OA.generation.maxAttempts, "34 · the known Ocean failure (seed 114; was 35 before BLOOM-027B) still fails explicitly after 24 attempts"); }
{ const g = BLOOM.generateFromArchetype(DW, 17, { config, traits }), a = g.archetype;
  check(a.attempt === 0 && g.name === "Ymir-961" && J(a.strategies.list.map(x => x.signature)) === J(["Water:dry=Adapt(1)+Terraform(+8)", "Defense:salt=Adapt(1) · Water:dry=Adapt(1)"]),
    "35 · Desert World fixture seed 17 is unchanged: attempt 0, Ymir-961, the same two strategies (BLOOM-027B fixture; was seed 25 Umbra-584)", a.strategies.list.map(x => `[${x.signature}]`).join(" vs ")); }
{ const sheet = fs.readFileSync(path.join(ROOT, "docs/PLAYTEST_DESERT_v1.md"), "utf8"), bible = fs.readFileSync(path.join(ROOT, "GAME_BIBLE.md"), "utf8");
  check(/PASSED/.test(sheet) && /"?decent"?/.test(sheet) && /Desert/.test(bible) && /decent/.test(bible), "36 · the Desert human gate is recorded as passed, with the owner's restrained verdict (\"decent\")",
    (sheet.match(/^.*PASSED.*$/m) || [""])[0].slice(0, 160)); }

if (JSON_OUT) { fs.writeFileSync(JSON_OUT, J({ accepted: worlds.length, genFails, rejByLayer, seedMs, worlds: S.map(x => ({ seed: x.a.publicSeed, attempt: x.a.attempt, name: x.p.name,
  water: x.a.actualWaterPct, landmasses: x.a.landmasses, sections: x.secs, T: +x.T.toFixed(1), coldBlocked: +x.coldBlocked.toFixed(3), open: +x.open.toFixed(3), geothermal: x.geo,
  crossOffered: x.crossOffered, strategies: x.strategies.map(s => ({ signature: s.signature, coldMeans: coldMeans(s), purchases: s.purchases, winSeconds: s.winSeconds, marginSeconds: s.marginSeconds,
    firstPurchaseSeconds: s.firstPurchaseSeconds, maxPurchaseGapSeconds: s.maxPurchaseGapSeconds, terminalWaitSeconds: s.terminalWaitSeconds })) })) }, null, 1)); console.log("wrote", JSON_OUT); }

// =====================================================================================================================
(async () => {
  if (NO_BROWSER) return finish();
  let chromium; try { ({ chromium } = require("playwright")); }
  catch { console.error('Playwright not found. Run with NODE_PATH="$(npm root -g)" after `npm i -g playwright`, or pass --no-browser.'); process.exit(2); }
  const PAGE = "file://" + encodeURI(path.join(ROOT, "demos/demo-run.html")), TICK_S = config.tickMs / 1000;
  const browser = await chromium.launch();
  // headless Chromium returns an all-transparent canvas readback on the FIRST page of a session (BLOOM-003/010 quirk)
  { const w = await browser.newPage(); await w.goto(PAGE); await w.waitForTimeout(200); await w.close(); }
  const open = async (q, pause = true) => { const p = await browser.newPage({ viewport: { width: 1400, height: 900 } });
    p.errors = []; p.on("pageerror", e => p.errors.push(e.message)); p.on("console", m => { if (m.type() === "error") p.errors.push(m.text()); });
    await p.goto(PAGE + q); await p.waitForTimeout(300); if (pause && await p.$("#btnPlay")) await p.click("#btnPlay"); return p; };
  const shot = async (p, name) => { if (SHOTS) { await p.evaluate(() => typeof draw === "function" && draw()); await p.screenshot({ path: path.join(SHOTS, name) }); } };
  const clickTile = async (p, t) => { const r = await p.evaluate(t => { const b = document.getElementById("cv").getBoundingClientRect(), g = BLOOM_API.geometry();
    return { x: b.left + ((t % g.W) + 0.5) * g.tile, y: b.top + (((t / g.W) | 0) + 0.5) * g.tile }; }, t); await p.mouse.click(r.x, r.y); };
  const LEAK = /ocean|island|archipelago|\bseas?\b|coast|waterborne|shore|desert|\bdunes?\b|\bsand|oasis|wadi|playa|\berg\b|mesa/i;
  const DEFAULT_NAMES = ["River", "Marsh", "Tidal", "Dust", "Salt", "Glass", "Bone", "Chalk", "Amber", "Sun", "Gold", "Saffron", "Sienna", "Ash", "Ember", "Basalt", "Green", "Fern", "Mild", "Verdant"];
  // pixel samples of bare ground (by section temperature) and water, read back from the real canvas
  const sample = p => p.evaluate(() => { draw(); const S = BLOOM_API.sim, M = S.map, c = document.getElementById("cv").getContext("2d"), d = window.devicePixelRatio || 1, T = BLOOM_API.geometry().tile;
    const at = (t, fy, fx = 0.5) => [...c.getImageData(((t % M.W) + fx) * T * d, (((t / M.W) | 0) + fy) * T * d, 1, 1).data].slice(0, 3);
    const cold = [], mild = [], water = []; let glints = 0;
    for (let t = 0; t < M.N; t += 13) { const s = M.TILEMAP[t]; if (s < 0) { water.push(at(t, 0.15)); continue; } if (S.state[t] !== S.BAR) continue;
      const eT = S.sky.temp + M.SEC[s].local.tempOffset; (eT < -12 ? cold : eT > 0 ? mild : []).push(at(t, 0.12)); }
    for (let t = 0; t < M.N; t++) { const s = M.TILEMAP[t]; if (s < 0 || S.state[t] !== S.BAR) continue; const x = t % M.W, y = (t / M.W) | 0;
      // (an ice glint is a pale square at 0.30–0.46 of the tile; compare it with the tile's plain ground in a corner)
      if ((x * 5 + y * 11 + ((x >> 2) * 3)) % 8 === 0) { const g = at(t, 0.38, 0.38), b = at(t, 0.85, 0.15); if (g[0] + g[1] + g[2] > b[0] + b[1] + b[2] + 30) glints++; } }
    return { cold, mild, water, glints }; });
  const avg = xs => [0, 1, 2].map(k => Math.round(mean(xs.map(c => c[k]))));

  console.log(`\n# B37–45 · real browser: demo-run.html?archetype=frozen_world&seed=${FIX.positive}`);
  const p = await open(`?archetype=frozen_world&seed=${FIX.positive}`);
  const id = await p.evaluate(() => ({ run: BLOOM_API.run, runId: document.getElementById("runId").textContent, title: document.title, keys: Object.keys(BLOOM_RUN.planet.archetype),
    text: document.body.innerText, titles: [...document.querySelectorAll("[title]")].map(e => e.title).join(" "), shop: [...document.querySelectorAll("button.buy")].map(b => b.dataset.id),
    fnIsReal: BLOOM.generateFromArchetype === BLOOM.archetype.generateFromArchetype, geo: BLOOM_API.geometry(), labels: SEC.map((_, i) => LABEL[i]), sky: document.getElementById("hSky").textContent }));
  check(id.fnIsReal && id.run.kind === "procedural" && id.run.archetypeId === "frozen_world" && id.run.publicSeed === FIX.positive && id.run.attempt === pos.archetype.attempt &&
    id.run.planetId === pos.id && J(id.run.validatedLayers) === "[1,2,3,4,5,6,7,8]" && id.geo.landmasses === 1 &&
    id.runId === `Frozen World · public seed ${FIX.positive} · attempt ${pos.archetype.attempt} · ${pos.name} (${pos.id}) · layers 12345678` && new RegExp(`Frozen World · seed ${FIX.positive}`).test(id.title),
    "37 · the Frozen run launches through the generic launch path (BLOOM.generateFromArchetype in-page): same accepted attempt and planet as Node, layers 1–8, identity shown",
    `${id.runId} · HUD sky ${id.sky}`);
  check(!id.keys.includes("witness") && !id.keys.includes("strategies") && !/signature|witness|Adapt\(\d\)|Terraform\([+−-]|Temperature:cold/i.test(id.text + id.titles),
    "45 · no witness plan, strategy signature or solution reaches the page", `planet.archetype keys: ${id.keys.join(",")}`);
  check(!id.shop.includes(WATERBORNE.id) && !LEAK.test(id.text + " " + id.titles) && !id.labels.some(n => DEFAULT_NAMES.some(w => n.startsWith(w + " "))),
    "44 · no Ocean or Desert names or assumptions: no Waterborne Seeds in the shop, no ocean/island/coast/desert/dune/sand wording, region names from the frozen pools", id.labels.join(", "));
  const fz = await sample(p);
  const coolC = c => c[2] >= c[0] + 4, sandy = c => c[0] >= c[2] + 20 && c[1] >= c[2];
  check(fz.cold.length > 40 && fz.cold.filter(coolC).length >= 0.9 * fz.cold.length && !fz.cold.some(sandy) && fz.mild.length > 5 && mean(fz.mild.map(c => c[1] - c[2])) > mean(fz.cold.map(c => c[1] - c[2])) &&
    fz.water.every(c => c[2] > c[0] + 40) && fz.glints >= 20,
    "38 · the temporary frozen treatment renders: frozen bare ground is pale and cool (never sandy), warmer refuges keep their own greener colour, ice glints on frozen ground, cold-blue water",
    `frozen ground avg rgb ${avg(fz.cold)} (${fz.cold.length} samples) · refuge ground ${avg(fz.mild)} · water ${avg(fz.water)} · ${fz.glints} ice glints`);
  await shot(p, "frozen22-start.png");
  // 39 · inspection: a frozen region reads "too cold" with both remedies and the numeric temperature line
  const fr = await p.evaluate(() => { const S = BLOOM_API.sim, M = S.map; let best = -1, bt = 1e9;
    M.SEC.forEach((s, i) => { const e = S.evaluate(i); if (e.limitKey === "Temperature" && e.effT < bt && e.effT > -30) { bt = e.effT; best = i; } });
    return { i: best, tile: M.SEC_TILES[best][(M.SEC_TILES[best].length / 2) | 0], t: bt, geoI: M.SEC.findIndex((s, i) => s.geothermal && i !== M.ORIGIN), lake: M.TILEMAP.findIndex(v => v < 0) }; });
  await p.evaluate(() => { selected = -1; renderInspect(); }); await clickTile(p, fr.tile);
  const iv = await p.evaluate(() => ({ sel: selected, cats: [...document.querySelectorAll("#inspect .cat .lbl")].map(x => x.innerText), limit: (document.querySelector("#inspect .limit") || {}).innerText || "",
    temp: [...document.querySelectorAll("#inspect .cat")].map(x => x.innerText).find(t => /Temperature/.test(t)) || "", tline: (document.getElementById("tline") || {}).innerText || "", geo: document.querySelector("#inspect .geo") }));
  check(iv.sel === fr.i && iv.cats.join() === "Temperature,Water,Soil,Hazard" && /Growth blocked: too cold/.test(iv.limit) && /Cold Tolerance/.test(iv.limit) && /Warm the sky/.test(iv.limit) && !iv.geo &&
    iv.tline.includes(`Ground here −${Math.abs(fr.t)}°C`) && /sky −18°C/.test(iv.tline) && /suits your plant −6°C to \+24°C/.test(iv.tline),
    "39 · inspecting a frozen region: the four categories, 'Growth blocked: too cold', both remedies (Cold Tolerance — or Warm the sky), and its temperature in numbers next to the plant's range",
    `${id.labels[fr.i]}: ${iv.temp.replace(/\s+/g, " ")} · ${iv.limit.replace(/\n/g, " / ")} · ${iv.tline}`);
  await shot(p, "frozen22-inspect-frozen.png");
  await p.evaluate(i => { selected = -1; renderInspect(); }); await clickTile(p, (await p.evaluate(i => BLOOM_API.sim.map.SEC_TILES[i][0], fr.geoI)));
  const gv = await p.evaluate(() => (document.querySelector("#inspect .therm") || {}).innerText || "");
  check(/Geothermal ground: heat from below/.test(gv), "39 · inspecting a geothermal refuge explains why it is warmer than the land around it", gv);
  // 40–41 · Cold and warming previews
  await p.hover('button.buy[data-id="cold"]');
  const pc = await p.evaluate(() => ({ log: document.getElementById("log").textContent, gain: preview.gain.map(i => LABEL[i]) }));
  check(/^Cold Tolerance — opens: /.test(pc.log) && pc.gain.length > 0, "40 · the Cold Tolerance purchase preview names the frozen regions it would open", pc.log.slice(0, 180));
  await p.hover('button.buy[data-id="warm"]');
  const pw = await p.evaluate(() => ({ log: document.getElementById("log").textContent, gain: preview.gain.length, better: preview.better.length, worse: preview.worse.map(i => LABEL[i]) }));
  check(/^Warm the Sky — sky −18°C → −12°C · /.test(pw.log) && pw.better >= 3 && /closer, still blocked: /.test(pw.log) && (pw.gain > 0 || pw.better > 0),
    "41 · the Warm the Sky preview shows the sky's temperature before → after and every region it changes: opened, closer but still frozen, and warm refuges it makes worse",
    pw.log.slice(0, 260));
  await shot(p, "frozen22-warm-preview.png");
  await p.mouse.move(5, 5); await p.evaluate(() => { selected = -1; renderInspect(); });
  // 42 · win through real shop buttons with the organism-first strategy (Cold Tolerance only)
  const playPlan = async (q, plan, onBuy) => { let i = 0, affordAt = null, won = null; const buys = [];
    for (let t = 0; t < 9000 && !won; t += 5) {
      await q.evaluate(() => { BLOOM_API.advance(5); refreshShop(); }); const st = await q.evaluate(() => BLOOM_API.state()); if (st.won) { won = st; break; }
      if (i < plan.length) { const off = await q.$eval(`button.buy[data-id="${plan[i]}"]`, b => b.classList.contains("off"));
        if (!off) { affordAt ??= st.ticks; if (st.ticks - affordAt >= 25) { if (onBuy) await onBuy(plan[i], i, "before");
          await q.click(`button.buy[data-id="${plan[i]}"]`); buys.push(`${plan[i]} @ ${Math.round(st.ticks * TICK_S)} s`); if (onBuy) await onBuy(plan[i], i, "after"); i++; affordAt = null; } } } }
    return { won, i, buys }; };
  { const plan = org.purchases.map(x => x.id), r = await playPlan(p, plan);
    const fin = await p.evaluate(() => ({ cov: BLOOM_API.sim.coverage(), genome: { ...BLOOM_API.sim.genome }, sky: { ...BLOOM_API.sim.sky }, local: BLOOM_API.sim.spent.local }));
    // (BLOOM-027B: Frozen 11's organism-first strategy is Cold + Heat Tolerance — one Cold point — so "Cold Tolerance present" replaces the old "Cold ×2")
    check(!!r.won && r.i === plan.length && fin.cov >= 0.70 && fin.genome.cold >= 1 && fin.sky.temp === pos.globalClimate.temperature && fin.local === 0,
      "42 · the Frozen run is won through real shop clicks with the organism-first strategy (Cold Tolerance; the sky never changes; no local upgrades needed)",
      `${r.buys.join(" → ")} · win at ${r.won ? Math.round(r.won.ticks * TICK_S) : "—"} s with ${pct(fin.cov)} of the land`);
    // (the leak scan skips the real-plant analog list: it is generic trait science shown on every world — e.g. Early
    // Maturity's "desert wildflowers" — not wording about this world)
    const rep = await p.evaluate(() => { const r = document.getElementById("report"), a = r.querySelector(".analog");
      return { on: document.getElementById("reportModal").classList.contains("on"), text: r.innerText, world: r.innerText.replace(a ? a.innerText : "", "") }; });
    check(rep.on && rep.text.includes(pos.name) && new RegExp(`Frozen World · public seed ${FIX.positive}`).test(rep.text) && /Cold Tolerance/.test(rep.text) && /antifreeze/.test(rep.text) && !LEAK.test(rep.world),
      "43 · the Bloom Report identifies the generated Frozen World (name, archetype, public seed), its build and the real-plant analog — no Ocean/Desert wording", rep.text.split("\n").slice(0, 3).join(" / "));
    await shot(p, "frozen22-report.png");
    await p.evaluate(() => document.getElementById("reportModal").classList.remove("on")); await shot(p, "frozen22-won-map.png");
    check(p.errors.length === 0, "no browser errors (Frozen seed 22, Cold strategy)", p.errors.join(" | ")); await p.close(); }

  // 41b / 42b · the warming strategy through real buttons: the sky readouts before/after each Warm purchase, and a win
  { const q = await open(`?archetype=frozen_world&seed=${FIX.positive}`), plan = tfm.purchases.map(x => x.id), seen = [];
    const r = await playPlan(q, plan, async (pid, k, when) => { if (pid !== "warm") return;
      if (when === "before") { await q.hover(`button.buy[data-id="warm"]`); seen.push({ when, log: await q.evaluate(() => document.getElementById("log").textContent) }); await q.mouse.move(5, 5); }
      else seen.push({ when, log: await q.evaluate(() => document.getElementById("log").textContent),
        ...(await q.evaluate(() => { renderHUD(BLOOM_API.sim.coverage()); return { sky: document.getElementById("hSky").textContent, delta: document.getElementById("hSkyDelta").textContent }; })), fx: await q.evaluate(() => skyFx && { lose: skyFx.lose.map(i => LABEL[i]), better: skyFx.better.length }) });
      if (when === "after" && seen.filter(x => x.when === "after").length === 2) await shot(q, "frozen22-after-second-warm.png"); });
    const fin = await q.evaluate(() => ({ cov: BLOOM_API.sim.coverage(), sky: { ...BLOOM_API.sim.sky } }));
    const after = seen.filter(x => x.when === "after"), before = seen.filter(x => x.when === "before"), lost = after.flatMap(x => x.fx.lose);
    const tooHot = await q.evaluate(names => names.map(n => { const i = LABEL.indexOf(n), e = evaluate(i); return `${n}: ${e.cats.Temperature.word} ${e.effT}°C`; }), lost);
    // (BLOOM-027B: the Terraform strategy's Warm steps are counted from the plan — Frozen 11's has one, Frozen 22's had two — and each step's message / HUD is checked in turn)
    const nWarm = plan.filter(id => id === "warm").length, T0 = pos.globalClimate.temperature, deg = v => `${v < 0 ? "−" : ""}${Math.abs(v)}°C`;
    check(nWarm >= 1 && after.length === nWarm && after.every((x, k) => new RegExp(`^Bought Warm the Sky\\. Sky ${deg(T0 + 6 * k)} → ${deg(T0 + 6 * (k + 1))}`).test(x.log) && x.delta === `▲ +${6 * (k + 1)}°C` && x.sky.startsWith(deg(T0 + 6 * (k + 1)))) &&
      lost.length >= 1 && before.some(b => /⚠ closes: /.test(b.log)) && tooHot.every(t => /hot|scorching/.test(t)),
      "41 · after warming, the interface shows the new sky (HUD + '▲ +6°C'), which regions opened or moved closer, and which warm refuges the hotter sky closed (previewed as '⚠ closes' before the click)",
      `HUD ${after.map(x => `${x.sky} ${x.delta}`).join(" → ")} · ${after.map(x => x.log.slice(0, 170)).join(" ‖ ")} · now: ${tooHot.join("; ")}`);
    check(!!r.won && r.i === plan.length && fin.sky.temp > pos.globalClimate.temperature, "42 · …and the warming strategy also wins through real shop clicks (Warm the Sky raises the global temperature)",
      `${r.buys.join(" → ")} · win at ${r.won ? Math.round(r.won.ticks * TICK_S) : "—"} s · sky ${pos.globalClimate.temperature} → ${fin.sky.temp} °C`);
    await shot(q, "frozen22-warming-won.png"); check(q.errors.length === 0, "no browser errors (warming run)", q.errors.join(" | ")); await q.close(); }

  console.log("\n# B · other launches");
  { const q = await open(`?archetype=frozen_world&seed=${FIX.second}`), r = await q.evaluate(() => ({ run: BLOOM_API.run, n: document.querySelectorAll("#inspect .cat").length, shop: [...document.querySelectorAll("button.buy")].map(b => b.dataset.id) }));
    const ref = BLOOM.generateFromArchetype(FW, FIX.second, { config, traits });
    check(r.run.attempt === ref.archetype.attempt && r.run.planetId === ref.id && r.n === 4 && r.shop.includes(WATERBORNE.id) === probeOf(ref).offered(WATERBORNE),
      `Frozen seed ${FIX.second} (optional playtest seed) launches: attempt ${r.run.attempt} · ${r.run.name} · Waterborne Seeds ${r.shop.includes(WATERBORNE.id) ? "offered (two landmasses, not needed)" : "absent"}`);
    await shot(q, `frozen${FIX.second}-start.png`); check(q.errors.length === 0, `no browser errors (Frozen seed ${FIX.second})`, q.errors.join(" | ")); await q.close(); }
  { const q = await open(`?archetype=desert_world&seed=17`), d = await sample(q), r = await q.evaluate(() => BLOOM_API.run);
    const all = [...d.cold, ...d.mild];
    check(r.attempt === 0 && r.name === "Ymir-961" && all.filter(sandy).length >= 0.6 * all.length && d.glints < fz.glints / 3,
      "38 · Desert seed 17 still launches with its own sandy treatment (no frost), so the frozen map differs visibly", `sandy ${all.filter(sandy).length}/${all.length} · avg ${avg(all)}`);
    await shot(q, "desert17-start-for-comparison.png"); check(q.errors.length === 0, "no browser errors (Desert seed 17)", q.errors.join(" | ")); await q.close(); }
  for (const s of Object.keys(OA_ID).map(Number)) { const q = await open(`?archetype=ocean_archipelago&seed=${s}`);
    const r = await q.evaluate(() => ({ run: BLOOM_API.run, shop: [...document.querySelectorAll("button.buy")].map(b => b.dataset.id) })), o = await sample(q);
    check(r.run.attempt === OA_ID[s].attempt && r.run.name === OA_ID[s].name && r.shop.includes(WATERBORNE.id) && [J([24, 52, 92]), J([30, 62, 104])].includes(J(o.water[0])) && J(avg(o.water)) !== J(avg(fz.water)),
      `38 · Ocean Archipelago seed ${s} still launches with its own ocean colours (unlike the frozen lakes)`, `attempt ${r.run.attempt} · ${r.run.name} · water ${o.water[0]} vs frozen ${fz.water[0]}`);
    if (s === 13) await shot(q, "ocean13-start-for-comparison.png");
    check(q.errors.length === 0, `no browser errors (Ocean seed ${s})`, q.errors.join(" | ")); await q.close(); }
  await browser.close();
  finish();
})();
function finish() {
  console.log(`\n${fails ? fails + " check(s) FAILED" : "ALL CHECKS PASS"}  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  process.exit(fails ? 1 : 0);
}
