// BLOOM — archetypes + winnability validation (BLOOM-005, bible §10.1 + §10.3 layers 4–6). Plain Node.
//
//   node tools/archetype-check.js
//
// Production modules only. Witness runs buy through sim.buy() with Biomass earned under the real economy.
"use strict";
const path = require("path"), fs = require("fs");
const ROOT = path.resolve(__dirname, "..");
for (const f of ["content/config.js", "content/traits.js", "content/archetypes.js", "planets/first_bloom.js", "resources/bloom-sim.js",
  "resources/bloom-gen.js", "resources/bloom-validate.js", "resources/bloom-witness.js", "resources/bloom-archetype.js"]) require(path.join(ROOT, f));
const { BLOOM, BLOOM_DATA } = globalThis, { config, traits, archetypes } = BLOOM_DATA;
const OA = archetypes.find(a => a.id === "ocean_archipelago"), V = config.validation;
const J = o => JSON.stringify(o), clone = o => JSON.parse(J(o)), pct = x => (x * 100).toFixed(1) + "%";
const crossIds = traits.filter(t => t.effect.type === "crossing").map(t => t.id);
const nonSpreadIds = traits.filter(t => t.board !== "Spread").map(t => t.id);
let fails = 0;
const check = (ok, name, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); if (!ok) fails++; };
const t0 = Date.now();

// ---- fixtures (public seeds)
const FIX = { win: 8, negLayer4: 3, negLayer6: 25, genFail: 35 };
const SWEEP = Array.from({ length: 40 }, (_, i) => i + 1);

// 1 · archetype data / schema
console.log("# 1 schema");
check(BLOOM.archetype.checkArchetype(OA, config).length === 0, "Ocean Archipelago archetype data is valid", `${OA.id} "${OA.name}"`);
check(!/function|=>/.test(J(archetypes)) && J(clone(archetypes)) === J(archetypes), "archetype catalogue is plain data (no code)");
for (const [name, mut] of [["crossing gap beyond the trait's range", a => a.geography.maxCrossingGap = config.crossing.maxGap + 1],
  ["unknown climate key", a => a.climate.oceanCurrents = 3], ["crossingRequiredToWin with an origin landmass that could win alone", a => a.geography.maxOriginLandmassShare = 0.8],
  ["unbounded attempts", a => a.generation.maxAttempts = 1000]]) {
  const a = clone(OA); mut(a); check(BLOOM.archetype.checkArchetype(a, config).length > 0, `schema rejects ${name}`, BLOOM.archetype.checkArchetype(a, config)[0]);
}

// 2–4 · determinism, bounded retries, water tolerance
console.log("\n# 2–4 deterministic generate/validate/retry");
const win = BLOOM.generateFromArchetype(OA, FIX.win, { config, traits });
check(J(win) === J(BLOOM.generateFromArchetype(OA, FIX.win, { config, traits })), "same archetype + public seed → identical accepted world (tiles, sections, witness summary)");
const A = win.archetype;
check(A.generationSeed === BLOOM.archetype.fnv1a(`${OA.id}|${FIX.win}|${A.attempt}`) && A.rejectedAttempts.length === A.attempt,
  "attempt k uses generationSeed = FNV-1a(\"id|seed|k\"); earlier rejected attempts are recorded", `seed ${FIX.win} → attempt ${A.attempt}, generationSeed ${A.generationSeed}`);
check(BLOOM.validatePlanet(win, config, { traits, regenerate: BLOOM.generatePlanet }).ok, "the accepted world reproduces from its recorded generation params");
let genErr = null; try { BLOOM.generateFromArchetype(OA, FIX.genFail, { config, traits }); } catch (e) { genErr = e; }
check(genErr && genErr.attempts.length === OA.generation.maxAttempts && genErr.attempts.every(a => a.rejected.length),
  `bounded: seed ${FIX.genFail} fails explicitly after ${OA.generation.maxAttempts} attempts, each with its reasons (no bad planet returned)`,
  genErr && genErr.attempts.slice(0, 2).map(a => `#${a.attempt}: ${a.rejected[0]}`).join(" | "));

// 5 · coherence across a fixed sweep (full production path incl. winnability)
console.log("\n# 5 Ocean Archipelago coherence — public seeds 1–40");
const worlds = [], genFails = [], tS = Date.now();
for (const s of SWEEP) { try { worlds.push(BLOOM.generateFromArchetype(OA, s, { config, traits })); } catch { genFails.push(s); } }
const sweepMs = Date.now() - tS;
const W = worlds.map(p => ({ p, a: p.archetype, secs: p.sections.length,
  moist: p.sections.reduce((a, s) => a + p.globalClimate.moisture + s.local.moistureOffset, 0) / p.sections.length,
  build: p.archetype.witness.purchases.map(x => x[0]) }));
const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length, range = xs => `${Math.min(...xs)}–${Math.max(...xs)}`;
const dflt = SWEEP.map(s => BLOOM.generatePlanet({ seed: s, waterPct: 60, sections: 14, maxCrossingGap: config.crossing.maxGap }));
const dfltMoist = mean(dflt.map(p => mean(p.sections.map(s => p.globalClimate.moisture + s.local.moistureOffset))));
check(worlds.length >= 36, "≥ 90% of public seeds yield an accepted, winnable world", `${worlds.length}/40 (explicit failures: ${genFails.join(", ") || "none"}), ${sweepMs} ms total`);
check(W.every(w => Math.abs(w.a.actualWaterPct - w.a.requestedWaterPct) <= OA.water.tolerance), `water tolerance: every accepted world within ±${OA.water.tolerance} of its request`,
  `actual ${range(W.map(w => w.a.actualWaterPct))}%, max drift ${Math.max(...W.map(w => Math.abs(w.a.actualWaterPct - w.a.requestedWaterPct))).toFixed(1)}`);
check(W.every(w => w.a.actualWaterPct >= OA.water.min - OA.water.tolerance && w.a.actualWaterPct <= OA.water.max + OA.water.tolerance) && mean(W.map(w => w.a.actualWaterPct)) >= 55,
  "water: high-water worlds", `mean ${mean(W.map(w => w.a.actualWaterPct)).toFixed(1)}%`);
check(W.every(w => w.a.landmasses >= OA.geography.minLandmasses) && mean(W.map(w => w.a.landmasses)) >= 3.5, "landmasses: every world fragmented (≥ 3), several on average",
  `range ${range(W.map(w => w.a.landmasses))}, mean ${mean(W.map(w => w.a.landmasses)).toFixed(1)}`);
check(mean(W.map(w => w.moist)) >= 55 && mean(W.map(w => w.moist)) > dfltMoist + 8, "moisture: wetter than the default generator",
  `mean section moisture ${mean(W.map(w => w.moist)).toFixed(1)} vs default generator ${dfltMoist.toFixed(1)} (plant's dry-to-wet comfort window 32–68)`);
check(W.every(w => w.secs >= OA.sections[0] && w.secs <= OA.sections[1]) && new Set(W.map(w => w.secs)).size >= 4, "section count within the archetype range and varied",
  `range ${range(W.map(w => w.secs))}, ${new Set(W.map(w => w.secs)).size} distinct counts`);
check(W.every(w => w.a.originLandmassShare < worlds[0].winThreshold && w.build.some(id => crossIds.includes(id))),
  "Waterborne Seeds required to win in 100% of accepted worlds (origin landmass < 70% of land; every witness buys it)",
  `origin-landmass share ${range(W.map(w => w.a.originLandmassShare))}`);
const adapting = W.filter(w => w.build.some(id => nonSpreadIds.includes(id))).length;
check(adapting / W.length >= 0.7, "crossing alone rarely solves it: most witnesses also need an Adapt/Terraform decision", `${adapting}/${W.length} witnesses`);
check(new Set(W.map(w => J(w.p.tilemap))).size === W.length && new Set(W.map(w => w.build.join())).size >= 5, "designed randomness: every map distinct; witness builds varied",
  `${new Set(W.map(w => w.build.join())).size} distinct witness builds`);

// 6–10 · fixed winning fixture
console.log(`\n# 6–10 fixed winning fixture — Ocean Archipelago public seed ${FIX.win}`);
const v = BLOOM.validatePlanet(win, config, { traits, regenerate: BLOOM.generatePlanet, winnability: true, measurePeak: true });
const R = v.stats.reach, w = v.stats.witness.witness, S = v.stats.witness.search;
console.log(`  attempt ${A.attempt} (generationSeed ${A.generationSeed}) · water ${A.requestedWaterPct}% requested → ${A.actualWaterPct}% · ${v.stats.sections} sections · ${v.stats.landmasses} landmasses`);
console.log(`  reachable land: ordinary spread ${pct(R.base.landShare)} → with ${R.strongest.rule} ${pct(R.strongest.landShare)}`);
console.log(`  witness: ${w.purchases.map(p => `${p.name} @ tick ${p.tick} (${p.seconds} s, ${p.cost})`).join(" → ")}`);
console.log(`  spent ${w.totalSpent} earned Biomass · win (70%) at tick ${w.winTick} (${w.winSeconds} s) · margin ${pct(w.target)} at tick ${w.marginTick} (${w.marginSeconds} s) · peak ${pct(w.peak)} · unheld at margin ${pct(w.uncolonizedAtMargin.landShareUnheld)}`);
check(v.ok && v.stats.landmasses >= 3 && Math.abs(A.actualWaterPct - A.requestedWaterPct) <= OA.water.tolerance, "fixture is structurally valid, fragmented and inside the water tolerance");
check(R.base.landShare < win.winThreshold && R.strongest.landShare === 1, "ordinary spread can reach < 70% of the land; Waterborne Seeds reaches all of it", `${pct(R.base.landShare)} → ${pct(R.strongest.landShare)}`);
check(w.winTick && w.peak >= win.winThreshold, "layer 4: a real simulation holds ≥ 70% of the land alive at once", `peak ${pct(w.peak)}`);
check(w.marginTick && w.peak >= win.winThreshold + V.winMargin, `layer 6: witness reaches the validation margin (${pct(win.winThreshold)} + ${pct(V.winMargin)})`, `${pct(w.target)} at ${w.marginSeconds} s`);
check(w.uncolonizedAtMargin.landShareUnheld > 0.05, "the win does not require colonizing 100% of the land", `${pct(w.uncolonizedAtMargin.landShareUnheld)} still unheld at the margin`);
// layer 5: purchases are real — an independent replay with only earned Biomass reproduces the witness exactly
{
  const sim = BLOOM.createSim(win, config, traits, { rng: BLOOM.gen.mulberry32(V.rngSeed) }); let k = 0, affordable = true, t = 0;
  while (t < w.marginTick) { t++; sim.tick();
    if (k < w.purchases.length && w.purchases[k].tick === t) { if (sim.biomass < w.purchases[k].cost) affordable = false; if (!sim.buy(w.purchases[k].id)) affordable = false; k++; } }
  check(affordable && k === w.purchases.length && sim.coverage() >= w.target, "layer 5: independent replay — each purchase affordable from earned Biomass at its recorded tick, same result",
    `start ${config.econ.startBiomass} Biomass, ${k} purchases via sim.buy, coverage ${pct(sim.coverage())} at tick ${t}`);
  const src = fs.readFileSync(path.join(ROOT, "resources/bloom-witness.js"), "utf8"), simBody = src.slice(src.indexOf("function simulate("));
  check(!/biomass\s*(\+?=|-=)/.test(simBody.replace(/\/\/.*$/gm, "")) && !/addBiomass/.test(src), "witness simulations never grant or edit Biomass (source check of simulate())");
}
// 7 · Waterborne Seeds genuinely required; another Adapt/Terraform decision also required
{
  const noX = BLOOM.findWitness(win, config, traits, { excludeTraits: crossIds });
  const planNoX = w.plan.filter(id => !crossIds.includes(id)), runNoX = BLOOM.witness.simulate(win, config, traits, planNoX, w.target);
  check(!noX.ok && noX.layer === 4 && runNoX.peak < win.winThreshold, "Waterborne Seeds is required: no crossing-free build can win (static bound + the witness minus the trait in the real sim)",
    `${noX.reason} · witness without it peaks at ${pct(runNoX.peak)}`);
  const spreadOnly = BLOOM.findWitness(win, config, traits, { excludeTraits: nonSpreadIds });
  const planS = w.plan.filter(id => !nonSpreadIds.includes(id)), runS = BLOOM.witness.simulate(win, config, traits, planS, w.target);
  const adapt = w.purchases.filter(p => nonSpreadIds.includes(p.id)).map(p => p.name);
  check(adapt.length > 0 && !spreadOnly.ok && runS.peak < win.winThreshold, "an Adapt/Terraform decision is also required (Spread traits alone cannot win)",
    `witness adapts with ${adapt.join(" + ")} · Spread-only best: ${spreadOnly.reason} · witness Spread-only in the sim peaks at ${pct(runS.peak)}`);
}

// 11 · negative fixtures: structurally valid, rejected for winnability reasons
console.log("\n# 11 negative fixtures (structure-only archetype generation → full validation)");
for (const [seed, layer] of [[FIX.negLayer4, 4], [FIX.negLayer6, 6]]) {
  const p = BLOOM.generateFromArchetype(OA, seed, { config, traits, winnability: false });
  const s = BLOOM.validatePlanet(p, config, { traits, regenerate: BLOOM.generatePlanet });
  const f = BLOOM.validatePlanet(p, config, { traits, winnability: true });
  check(s.ok && s.stats.reach.strongest.landShare === 1 && !f.ok && f.stats.witness.layer === layer,
    `seed ${seed} (attempt ${p.archetype.attempt}): structurally valid + fully reachable, REJECTED at layer ${layer}`, f.errors[0]);
  const full = BLOOM.generateFromArchetype(OA, seed, { config, traits });
  check(full.archetype.attempt > p.archetype.attempt && full.archetype.rejectedAttempts[p.archetype.attempt].rejected.some(r => r.startsWith(`layer ${layer}`)),
    `…and production generation skips that attempt deterministically`, `accepted attempt ${full.archetype.attempt} instead of ${p.archetype.attempt}`);
}

// 12 · solver bounds + deterministic output
console.log("\n# 12 solver bounds and determinism");
check(S.staticStates <= V.maxStaticStates && !S.capped && S.simulations <= V.maxSimulations, "search stays inside its explicit bounds",
  `${S.staticStates} static builds (cap ${V.maxStaticStates}), ${S.candidates} ≥ target, ${S.simulations} simulation(s) (cap ${V.maxSimulations}), ${S.ms} ms`);
{
  const strip = r => { const { search, ...rest } = r; const { ms, ...s } = search; return J({ rest, s }); };
  check(strip(BLOOM.findWitness(win, config, traits)) === strip(BLOOM.findWitness(win, config, traits)), "same planet + config → identical witness and search diagnostics");
  const tight = clone(config); tight.validation.maxStaticStates = 50;
  const cap = BLOOM.findWitness(win, tight, traits);
  check(cap.search.capped && cap.search.staticStates === 50 && (cap.ok || (cap.inconclusive && /capped/.test(cap.reason))),
    "a static-state cap is enforced and reported as inconclusive, never as a verdict on the planet", cap.ok ? "still found a witness" : cap.reason);
  const none = clone(config); none.validation.maxSimulations = 0;
  const z = BLOOM.findWitness(win, none, traits);
  check(!z.ok && z.search.simulations === 0 && /simulations/.test(z.reason), "a zero simulation budget fails explicitly instead of passing on static estimates", z.reason);
}
{ // authored planets can be validated the same way
  const fb = BLOOM.validatePlanet(BLOOM_DATA.planets.first_bloom, config, { traits, winnability: true });
  check(fb.ok, "First Bloom (authored) also passes layers 4–6 with a real witness", `${fb.stats.witness.witness.purchases.map(p => p.id).join(", ")} → ${pct(fb.stats.witness.witness.target)} at ${fb.stats.witness.witness.marginSeconds} s`);
}

console.log(`\n${fails ? fails + " check(s) FAILED" : "ALL CHECKS PASS"}  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
process.exit(fails ? 1 : 0);
