// BLOOM — archetypes + winnability validation (BLOOM-005, bible §10.1 + §10.3 layers 4–6). Plain Node.
// Since BLOOM-006 Ocean Archipelago production generation also requires layers 7–8 (strategy diversity and
// pacing); their fixtures live in tools/strategy-check.js, the public-seed sweep statistics here.
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
// BLOOM-027B (cylindrical generator): the worlds changed on purpose, so the negatives were re-picked for the SAME roles from a scan of
// public seeds 1–40 × attempts 0–23 and a production sweep of seeds 41–200 (docs/evidence/bloom-027b/fixture-changes.md). win 8 keeps
// its seed AND its attempt (1, Coriol-220). negLayer4 was 3 (attempt 18 → now accepted at 7 with no layer-4 attempt) → 27 (attempt 1
// rejected at layer 4, accepted at 5); negLayer6 was 25 (attempt 0 → now a layer-7 rejection) → 24 (attempt 0 rejected at layer 6,
// accepted at 2); genFail was 35 (now accepted at attempt 1) → 114, the first public seed above 40 with no acceptable attempt in 24.
const FIX = { win: 8, negLayer4: 27, negLayer6: 24, genFail: 114 };
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
const worlds = [], genFails = [], allAttempts = [], seedMs = [], tS = Date.now();
for (const s of SWEEP) { const t = Date.now();
  try { const p = BLOOM.generateFromArchetype(OA, s, { config, traits }); worlds.push(p); allAttempts.push(...p.archetype.rejectedAttempts); }
  catch (e) { if (!e.attempts) throw e; genFails.push(s); allAttempts.push(...e.attempts); }
  seedMs.push(Date.now() - t); }
const sweepMs = Date.now() - tS;
const W = worlds.map(p => ({ p, a: p.archetype, secs: p.sections.length,
  moist: p.sections.reduce((a, s) => a + p.globalClimate.moisture + s.local.moistureOffset, 0) / p.sections.length,
  build: p.archetype.witness.purchases.map(x => x[0]) }));
const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length, range = xs => `${Math.min(...xs)}–${Math.max(...xs)}`;
const dflt = SWEEP.map(s => BLOOM.generatePlanet({ seed: s, waterPct: 60, sections: 14, maxCrossingGap: config.crossing.maxGap }));
const dfltMoist = mean(dflt.map(p => mean(p.sections.map(s => p.globalClimate.moisture + s.local.moistureOffset))));
// BLOOM-005 accepted 39/40 under layers 1–6; requiring layers 7–8 turns seeds 3, 7, 19, 38 into explicit
// failures (their only structurally valid attempts are single-strategy or off-pace). That is by design.
check(worlds.length >= 32, "≥ 80% of public seeds yield an accepted world passing layers 1–8 (the rest fail explicitly)", `${worlds.length}/40 (explicit failures: ${genFails.join(", ") || "none"}), ${sweepMs} ms total`);
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

// 5b · layers 7–8 across the sweep: production acceptance and the distributions behind the pacing bands
console.log("\n# 5b layers 7–8 across the sweep");
{
  const L = {}; for (const a of allAttempts) { const r = a.rejected[0] || "?", m = r.match(/^layer (\d)[^:]*?( INCONCLUSIVE)?:/);
    const k = m ? `layer ${m[1]}${m[2] ? " inconclusive" : ""}` : "structure/geography (layers 1–3, water, landmasses)"; L[k] = (L[k] || 0) + 1; }
  const S = worlds.flatMap(p => p.archetype.strategies.list), P = OA.validation.pacing, num = xs => xs.filter(x => x !== null);
  const dist = xs => { const v = num(xs).slice().sort((a, b) => a - b); return v.length ? `${v[0]}–${v[v.length - 1]} (median ${v[v.length >> 1]})` : "n/a"; };
  const cls = worlds.map(p => BLOOM.witness.strategyClasses(p, config, traits).length); // candidate classes before simulation
  console.log(`  rejected attempts by first reason: ${Object.entries(L).map(([k, n]) => `${k} ${n}`).join(" · ")}`);
  console.log(`  qualifying strategies proven per world (search stops at the required ${OA.validation.minStrategies}): ${worlds.map(p => p.archetype.strategies.found).join(",")}`);
  console.log(`  static candidate strategy classes per accepted world (before simulation, not proof): ${dist(cls)}`);
  console.log(`  over ${S.length} accepted strategies: margin ${dist(S.map(x => x.marginSeconds))} s · win ${dist(S.map(x => x.winSeconds))} s · first purchase ${dist(S.map(x => x.firstPurchaseSeconds))} s · max purchase gap ${dist(S.map(x => x.maxPurchaseGapSeconds))} s · terminal wait ${dist(S.map(x => x.terminalWaitSeconds))} s`);
  console.log(`  generation runtime per public seed: ${dist(seedMs)} ms`);
  check(worlds.every(p => J(p.archetype.validatedLayers) === J([1, 2, 3, 4, 5, 6, 7, 8]) && p.archetype.strategies.found >= OA.validation.minStrategies),
    "every accepted world passed layers 1–8 with ≥ 2 qualifying broad strategies recorded");
  check(S.every(x => x.marginSeconds >= P.marginSeconds[0] && x.marginSeconds <= P.marginSeconds[1] && x.firstPurchaseSeconds >= P.firstPurchaseSeconds[0] &&
    x.firstPurchaseSeconds <= P.firstPurchaseSeconds[1] && x.maxPurchaseGapSeconds <= P.maxPurchaseGapSeconds), "every accepted strategy sits inside the pacing bands");
  check(Object.keys(L).some(k => k.startsWith("layer 7")) && Object.keys(L).some(k => k.startsWith("layer 8")), "the sweep rejects real attempts at both layer 7 and layer 8");
}

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
  let full = null, atts; try { full = BLOOM.generateFromArchetype(OA, seed, { config, traits }); atts = full.archetype.rejectedAttempts; } catch (e) { if (!e.attempts) throw e; atts = e.attempts; }
  check((!full || full.archetype.attempt > p.archetype.attempt) && atts[p.archetype.attempt].rejected.some(r => r.startsWith(`layer ${layer}`)),
    `…and production generation skips that attempt deterministically`, full ? `accepted attempt ${full.archetype.attempt} instead of ${p.archetype.attempt}` : `no later attempt passes layers 1–8: seed ${seed} fails explicitly`);
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
