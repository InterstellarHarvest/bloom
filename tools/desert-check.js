// BLOOM — Desert World archetype QA (BLOOM-010): the second procedural archetype, through the SAME generic production
// path as Ocean Archipelago (BLOOM.generateFromArchetype → validator layers 1–8). Two parts:
//   A · Node: archetype data, determinism/retry, desert identity across a public-seed sweep, the positive fixture's
//       strategies and real witnesses, natural negatives, Waterborne Seeds staying generic, colony development,
//       First Bloom / Ocean Archipelago regression guards
//   B · real browser: demo-run.html?archetype=desert_world&seed=N — identity, region inspection, a win through REAL
//       shop buttons, the Bloom Report, no Ocean wording, no witness data; Ocean seeds 13/8 still launch
//
//   NODE_PATH="$(npm root -g)" node tools/desert-check.js [--shots <dir>] [--json <sweep.json>] [--no-browser]
//
// Production modules only. Every witness buys through sim.buy() with Biomass earned under the real economy; every UI
// purchase is a click on a real shop button. Part B needs Playwright (npm i -g playwright). Exits 1 on any failure.
"use strict";
const path = require("path"), fs = require("fs");
const ROOT = path.resolve(__dirname, "..");
for (const f of ["content/config.js", "content/traits.js", "content/archetypes.js", "planets/first_bloom.js", "resources/bloom-sim.js",
  "resources/bloom-gen.js", "resources/bloom-validate.js", "resources/bloom-witness.js", "resources/bloom-archetype.js"]) require(path.join(ROOT, f));
const { BLOOM, BLOOM_DATA } = globalThis, { config, traits, archetypes } = BLOOM_DATA, W = BLOOM.witness;
const DW = archetypes.find(a => a.id === "desert_world"), OA = archetypes.find(a => a.id === "ocean_archipelago");
const POLICY = { minStrategies: DW.validation.minStrategies, pacing: DW.validation.pacing };
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const SHOTS = arg("--shots"), JSON_OUT = arg("--json"), NO_BROWSER = process.argv.includes("--no-browser");
const J = o => JSON.stringify(o), clone = o => JSON.parse(J(o)), pct = x => (x * 100).toFixed(1) + "%";
const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length, median = xs => { const s = xs.slice().sort((a, b) => a - b); return s[(s.length - 1) >> 1]; };
const range = xs => `${Math.min(...xs)}–${Math.max(...xs)}`, hist = xs => xs.reduce((m, x) => (m[x] = (m[x] || 0) + 1, m), {});
const WATERBORNE = traits.find(t => t.effect.type === "crossing");
let fails = 0;
const check = (ok, name, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); if (!ok) fails++; };
const t0 = Date.now();

// ---- fixtures: public seeds, and (seed, attempt) for natural rejected candidates, from the BLOOM-010 sweep and re-picked for the
// same roles after BLOOM-027B's cylindrical generator changed every world (scan of seeds 1–120 × attempts 0–2 and 1–60 × 0–7:
// docs/evidence/bloom-027b/fixture-changes.md). positive = Desert 17 (attempt 0, Ymir-961: Drought-only vs Humidify strategies holding different land; Desert 25's new world has two all-Adapt strategies and keeps winning under full Dying World pressure); second = 4 (attempt 1, Coriol-536; seed 9 now accepts at 0 so it cannot prove the bounded retry).
const FIX = { positive: 17, second: 4,
  negLayer4: [57, 0],      // plausible desert, but no legal build holds 70% at once (best 58.8%; was 35/0, now accepted at 0)
  negLayer7: [68, 1],      // winnable and on pace, but only one broad strategy exists (static proof; was 50/0)
  negLayer8: [16, 0],      // two broad strategies, both win too fast (a desert with too little resistance) — unchanged role and seed
  negOrigin: [1, 0] };     // the generator's origin pick is not a genuine refuge (Water-limited): a Desert-specific rule (was 9/0, now accepted)
const SWEEP = Array.from({ length: 40 }, (_, i) => i + 1);
// sweep quality thresholds (item 20) — the archetype's bar, set from the BLOOM-010 sweep with headroom
const Q = { minAccepted: 34, maxWater: 16, maxLandmasses: 2, minOriginShare: 0.85, maxMeanMoisture: 30, minWaterTerraformWorlds: 0.25,
  minDroughtOnlyWorlds: 0.25, maxMedianSeedMs: 5000, maxSeedMs: 30000 };
const effM = p => p.sections.map(s => p.globalClimate.moisture + s.local.moistureOffset), effT = p => p.sections.map(s => p.globalClimate.temperature + s.local.tempOffset);
const areaMean = (p, xs) => xs.reduce((a, x, i) => a + x * p.sections[i].area, 0) / p.sections.reduce((a, s) => a + s.area, 0);
const probeOf = p => BLOOM.createSim(p, config, traits, { rng: () => 0.5 });
const rawFit = e => Object.values(e.cats).reduce((a, c) => a * c.f, 1);
const toks = s => s.tokens || s.signature.split(" · "); // (a production summary records the signature string only)
const waterMeans = s => { const t = toks(s).find(x => x.startsWith("Water:dry=")) || ""; return /Adapt/.test(t) && /Terraform/.test(t) ? "Adapt+Terraform" : /Terraform/.test(t) ? "Terraform" : /Adapt/.test(t) ? "Adapt" : "none"; };

// =====================================================================================================================
console.log("# A1 · archetype data");
check(BLOOM.archetype.checkArchetype(DW, config).length === 0 && BLOOM.archetype.checkArchetype(OA, config).length === 0,
  "1 · Desert World archetype data is valid (and Ocean Archipelago still is)", `${DW.id} "${DW.name}" · sections ${J(DW.sections)} · water ${J(DW.water)}`);
check(!/function|=>/.test(J(archetypes)) && J(clone(archetypes)) === J(archetypes) && archetypes.length >= 2, "1 · the archetype catalogue is plain data, with at least Ocean and Desert (BLOOM-011 adds Frozen World)");
check(J(OA.validation.pacing) === J({ marginSeconds: [240, 720], firstPurchaseSeconds: [0, 60], maxPurchaseGapSeconds: 120 }) /* BLOOM-013 decision-cadence bands */ && !OA.validation.requiredConditions &&
  !OA.geography.minOriginFitness && !OA.render && !OA.naming, "1 · each archetype owns its policy: Ocean Archipelago's bands and rules are unchanged (no Desert keys)");
for (const [name, mut] of [["an origin-fitness bar above 1", a => a.geography.minOriginFitness = 1.5], ["a non-positive terminal wait", a => a.validation.pacing.maxTerminalWaitSeconds = 0],
  ["an unknown required condition", a => a.validation.requiredConditions = ["Water"]], ["a malformed render colour", a => a.render.ground = [300, 0, 0]],
  ["an unknown naming pool", a => a.naming.lakes = ["Mere"]], ["maxLandmasses 0", a => a.geography.maxLandmasses = 0]]) {
  const a = clone(DW); mut(a); const e = BLOOM.archetype.checkArchetype(a, config); check(e.length > 0, `1 · schema rejects ${name}`, e[0]);
}
{ const k = Object.keys(DW.climate).filter(k => !(k in BLOOM.gen.CLIMATE_DEFAULTS));
  const knobs = ["lightBias", "drySaltChance", "basinMoisture", "dryOffset", "wetOffset", "originTemp", "originMoistureOffset", "originMoistureWeight"];
  check(!k.length && knobs.every(x => x in BLOOM.gen.CLIMATE_DEFAULTS), "1 · Desert is data over generic generator knobs (no Desert-specific generator or simulation code)", `new generic climate knobs: ${knobs.join(", ")}`); }

console.log("\n# A2–3 · deterministic generate/validate/retry");
const pos = BLOOM.generateFromArchetype(DW, FIX.positive, { config, traits });
check(J(pos) === J(BLOOM.generateFromArchetype(DW, FIX.positive, { config, traits })), "2 · same archetype + public seed → identical accepted world (tiles, sections, strategy summary)",
  `seed ${FIX.positive} → attempt ${pos.archetype.attempt} · ${pos.name} (${pos.id})`);
check(BLOOM.validatePlanet(pos, config, { traits, regenerate: BLOOM.generatePlanet }).ok && pos.params.names && pos.params.climate.basinMoisture === DW.climate.basinMoisture,
  "2 · the accepted world reproduces exactly from its recorded generation params (climate knobs and naming pools included)");
{ const g = BLOOM.generateFromArchetype(DW, FIX.second, { config, traits }), a = g.archetype;
  check(a.attempt === 1 && a.generationSeed === BLOOM.archetype.fnv1a(`${DW.id}|${FIX.second}|1`) && a.rejectedAttempts.length === 1 && a.rejectedAttempts[0].rejected.length &&
    J(g) === J(BLOOM.generateFromArchetype(DW, FIX.second, { config, traits })),
    "3 · bounded retry is deterministic: attempt k uses FNV-1a(\"desert_world|seed|k\"); a rejected attempt is recorded and skipped identically every time",
    `seed ${FIX.second}: #0 ${a.rejectedAttempts[0].rejected[0].slice(0, 70)}… → attempt 1`);
  let err = null; const one = clone(DW); one.generation.maxAttempts = 1; try { BLOOM.generateFromArchetype(one, FIX.negLayer4[0], { config, traits }); } catch (e) { err = e; }
  check(err && err.attempts.length === 1 && /no acceptable world in 1 attempts/.test(err.message) && /layer 4/.test(err.attempts[0].rejected[0]),
    "3 · explicit bounded failure: with one attempt allowed, seed 35 throws with its reason (never returns a bad or substitute world)", err && err.attempts[0].rejected[0]); }

// ---- A4–9 + 20 · the public-seed sweep, full production path
console.log("\n# A4–9, 20 · Desert World public seeds 1–40 (full production path, layers 1–8)");
const worlds = [], genFails = [], allAttempts = [], seedMs = [], tS = Date.now();
for (const s of SWEEP) { const t = Date.now();
  try { const p = BLOOM.generateFromArchetype(DW, s, { config, traits }); worlds.push(p); allAttempts.push(...p.archetype.rejectedAttempts.map(a => ({ seed: s, ...a }))); }
  catch (e) { if (!e.attempts) throw e; genFails.push(s); allAttempts.push(...e.attempts.map(a => ({ seed: s, ...a }))); }
  seedMs.push(Date.now() - t); }
const sweepMs = Date.now() - tS;
const layerOf = r => /^origin .* not a refuge/.test(r) ? "layer 2 (origin refuge)" : (r.match(/^layer \d+ \([^)]*\)/) || [/water .* drifted/.test(r) ? "water drift" : /landmass/.test(r) ? "landmasses" : r.slice(0, 40)])[0];
const rejByLayer = hist(allAttempts.map(a => layerOf(a.rejected[0])));
const S = worlds.map(p => { const a = p.archetype, sim = probeOf(p), M = sim.map, ev = M.SEC.map((_, i) => sim.evaluate(i));
  const landShare = f => M.SEC.reduce((x, _, i) => x + (f(i) ? M.AREA[i] : 0), 0) / M.LAND;
  return { p, a, secs: p.sections.length, T: areaMean(p, effT(p)), M: areaMean(p, effM(p)), mRange: Math.max(...effM(p)) - Math.min(...effM(p)),
    waterLimited: landShare(i => ev[i].cats.Water.f < config.grow.growThresh), hotBlocked: landShare(i => ev[i].cats.Temperature.f < config.grow.growThresh && ev[i].effT > 0),
    open: landShare(i => ev[i].fitness > config.grow.growThresh), limits: new Set(ev.filter(e => e.limitF < config.categories.blockedBelow).map(e => e.limitKey)),
    salt: p.sections.some(s => s.local.salinity > 40), refuges: ev.filter((e, i) => i !== M.ORIGIN && e.fitness > config.categories.lamp.green).length,
    originRaw: rawFit(ev[M.ORIGIN]), crossOffered: sim.offered(WATERBORNE), strategies: a.strategies.list }; });
const OAw = SWEEP.slice(0, 20).map(s => BLOOM.archetype.attemptPlanet(OA, s, 0).planet), DEF = SWEEP.slice(0, 20).map(s => BLOOM.generatePlanet({ seed: s, waterPct: 8, sections: 15 }));
const meanM = ps => mean(ps.map(p => areaMean(p, effM(p)))), meanT = ps => mean(ps.map(p => areaMean(p, effT(p))));
const oaM = meanM(OAw), defM = meanM(DEF), dM = mean(S.map(x => x.M)), oaT = meanT(OAw), defT = meanT(DEF), dT = mean(S.map(x => x.T));
const strat = S.flatMap(x => x.strategies), wm = S.map(x => x.strategies.map(waterMeans));
console.log(`  accepted ${worlds.length}/${SWEEP.length}${genFails.length ? ` · explicit failures: seeds ${genFails.join(", ")}` : " · no generation failures"} · attempts ${J(hist(S.map(x => x.a.attempt)))}`);
console.log(`  rejected attempts ${allAttempts.filter(a => a.rejected.length).length}, by first reason: ${J(rejByLayer)}`);
console.log(`  water ${range(S.map(x => x.a.actualWaterPct))}% (mean ${mean(S.map(x => x.a.actualWaterPct)).toFixed(1)}%) · landmasses ${J(hist(S.map(x => x.a.landmasses)))} · origin landmass share ${range(S.map(x => x.a.originLandmassShare))} · sections ${J(hist(S.map(x => x.secs)))}`);
console.log(`  climate (area-weighted, start): temperature ${range(S.map(x => Math.round(x.T)))} °C (mean ${dT.toFixed(1)}) · moisture ${range(S.map(x => Math.round(x.M)))} (mean ${dM.toFixed(1)}; the plant's start window is 32–68) · Water-limited land ${pct(mean(S.map(x => x.waterLimited)))} · hot-blocked land ${pct(mean(S.map(x => x.hotBlocked)))} · open at start ${pct(mean(S.map(x => x.open)))}`);
console.log(`  vs Ocean Archipelago moisture ${oaM.toFixed(1)} / temperature ${oaT.toFixed(1)} °C · default generator moisture ${defM.toFixed(1)} / temperature ${defT.toFixed(1)} °C`);
console.log(`  strategy water means per world: ${J(hist(wm.map(w => w.slice().sort().join(" vs "))))}`);
console.log(`  strategy classes: ${J(hist(strat.map(s => s.signature.replace(/Defense:(rad|salt)=Adapt\(1\) · /g, (m, x) => `${x}+`))))}`.slice(0, 900));
console.log(`  first purchases: ${J(hist(strat.map(s => s.purchases[0][0])))} at ${range(strat.map(s => s.firstPurchaseSeconds))} s · win ${range(strat.map(s => s.winSeconds))} s · margin ${range(strat.map(s => s.marginSeconds))} s (median ${median(strat.map(s => s.marginSeconds))}) · max gap ${range(strat.map(s => s.maxPurchaseGapSeconds))} s · terminal wait ${range(strat.map(s => s.terminalWaitSeconds))} s`);
console.log(`  runtime ${(sweepMs / 1000).toFixed(1)} s for 40 seeds · median ${median(seedMs)} ms · worst ${Math.max(...seedMs)} ms`);
{ const ex = S.filter(x => new Set(x.strategies.map(waterMeans)).size > 1).slice(0, 3);
  for (const x of ex) console.log(`  e.g. seed ${x.a.publicSeed}: ${x.strategies.map(s => `[${s.signature}] margin ${s.marginSeconds} s`).join("  vs  ")}`); }

check(S.every(x => Math.abs(x.a.actualWaterPct - x.a.requestedWaterPct) <= DW.water.tolerance), `4 · every accepted world's water is within ±${DW.water.tolerance} of its request (${DW.water.min}–${DW.water.max}%)`,
  `max drift ${Math.max(...S.map(x => Math.abs(x.a.actualWaterPct - x.a.requestedWaterPct))).toFixed(1)}`);
check(S.every(x => x.a.actualWaterPct <= Q.maxWater) && mean(S.map(x => x.a.actualWaterPct)) < 12, `5 · recognizably low-water: every world ≤ ${Q.maxWater}% water (Ocean Archipelago: 55–68%)`,
  `mean ${mean(S.map(x => x.a.actualWaterPct)).toFixed(1)}%`);
check(S.every(x => x.a.landmasses <= Q.maxLandmasses && x.a.originLandmassShare >= Q.minOriginShare) && S.filter(x => x.a.landmasses === 1).length >= 0.8 * S.length,
  "6 · mostly contiguous: ≤ 2 landmasses, the origin's landmass holds ≥ 85% of the land, and most worlds are one landmass", J(hist(S.map(x => x.a.landmasses))));
check(dM <= Q.maxMeanMoisture && dM < oaM - 25 && dM < defM - 20 && S.every(x => x.M <= Q.maxMeanMoisture + 8) && mean(S.map(x => x.waterLimited)) >= 0.4,
  "7 · dry tendency: mean effective moisture far below Ocean Archipelago and the default generator; Water limits much of the land at the start",
  `Desert ${dM.toFixed(1)} vs Ocean ${oaM.toFixed(1)} vs default ${defM.toFixed(1)} · Water-limited land ${pct(mean(S.map(x => x.waterLimited)))}`);
check(dT >= oaT + 5 && dT >= defT + 10 && S.filter(x => x.hotBlocked > 0).length >= 0.6 * S.length && S.every(x => x.hotBlocked <= 0.5) && S.every(x => x.open > 0 || x.originRaw > 0.72),
  "8 · warm with local hot ground, never uniformly lethal: hotter than Ocean/default, most worlds have heat-blocked land, none is more than half heat-blocked",
  `mean ${dT.toFixed(1)} °C vs Ocean ${oaT.toFixed(1)} / default ${defT.toFixed(1)} · heat-blocked land ${range(S.map(x => +(x.hotBlocked * 100).toFixed(0)))}% · ${S.filter(x => x.hotBlocked > 0).length}/${S.length} worlds have some`);
check(S.every(x => x.mRange >= 25 && x.limits.size >= 2) && S.filter(x => x.salt).length >= 0.3 * S.length && S.every(x => x.originRaw >= DW.geography.minOriginFitness),
  "9 · environmental variation: every world mixes limits and has wet refuges vs dry ground; salt pans in many; the origin is a genuine refuge",
  `moisture spread ${range(S.map(x => x.mRange))} · limits per world ${range(S.map(x => x.limits.size))} · salt in ${S.filter(x => x.salt).length}/${S.length} · other green refuges at start ${range(S.map(x => x.refuges))} · origin own fitness ${range(S.map(x => +x.originRaw.toFixed(2)))}`);
const wtWorlds = S.filter(x => x.strategies.some(s => /Water:dry=[^·]*Terraform/.test(s.signature))).length, drWorlds = S.filter(x => x.strategies.some(s => waterMeans(s) === "Adapt")).length;
check(worlds.length >= Q.minAccepted && S.every(x => x.strategies.length >= 2 && J(x.a.validatedLayers) === "[1,2,3,4,5,6,7,8]") &&
  S.every(x => x.strategies.every(s => toks(s).some(t => t.startsWith("Water:dry=")) && !toks(s).some(t => t.startsWith("Crossing:")))) &&
  wtWorlds >= Q.minWaterTerraformWorlds * S.length && drWorlds >= Q.minDroughtOnlyWorlds * S.length && median(seedMs) <= Q.maxMedianSeedMs && Math.max(...seedMs) <= Q.maxSeedMs,
  `20 · sweep quality: ≥ ${Q.minAccepted}/40 accepted through layers 1–8; every strategy answers dry ground and none needs a crossing; a Water-Terraform strategy in ≥ 25% of worlds and a Drought-only one in ≥ 25%; runtime bounded`,
  `${worlds.length}/40 · Water-Terraform strategy in ${wtWorlds} worlds · Drought-only water in ${drWorlds} · median ${median(seedMs)} ms`);

// ---- A10–18 · positive fixture
console.log(`\n# A10–18 · positive fixture — Desert World public seed ${FIX.positive} (attempt ${pos.archetype.attempt}, ${pos.name})`);
const vPos = BLOOM.validatePlanet(pos, config, { traits, regenerate: BLOOM.generatePlanet, winnability: true, strategies: POLICY, measurePeak: true });
const R = vPos.stats.strategies, [A, B] = R.strategies, [wA, wB] = R.witnesses || [];
const secName = id => pos.sections.find(s => s.id === id).name;
for (const s of R.strategies || []) {
  console.log(`  [${s.signature}]\n    core ${s.minimalBuild.join(" + ")} · plan ${s.purchases.map(p => `${p.id} @ ${p.seconds} s (${p.cost})`).join(" → ")}`);
  console.log(`    spent ${s.totalSpent} · win ${s.winSeconds} s · margin ${s.marginSeconds} s · peak ${pct(s.peak)} · first ${s.pacing.firstPurchaseSeconds} s · gaps ${s.pacing.purchaseGapsSeconds.join("/")} s · terminal wait ${s.pacing.terminalWaitSeconds} s · Biomass/min ${s.pacing.earnedPerMinute.join(",")}`);
  console.log(`    holds ${s.held.map(secName).join(", ")}`);
}
console.log(`  early land (no upgrades): reachable ${pct(R.early.reachableShare)}, growable ${pct(R.early.growableShare)} · ${R.search.simulations} simulations over ${R.search.classes} classes`);
check(vPos.ok && R.status === "PASS" && R.layer7.status === "PASS" && R.layer8.status === "PASS" && pos.archetype.actualWaterPct <= 12 && pos.archetype.landmasses === 1,
  "10 · the fixture is a recognizable Desert World (low water, one landmass) and passes layers 1–8", `water ${pos.archetype.actualWaterPct}% · ${pos.sections.length} sections · origin ${secName(pos.origin)}`);
const d = R.differences[0];
check(R.strategies.length >= 2 && W.distinctSignatures(A, B) && d.onlyA.length && d.onlyB.length && d.heldOnlyA.length && d.heldOnlyB.length,
  "11 · ≥ 2 materially different strategy signatures, and they hold different land",
  `A-only ${d.onlyA.join(" + ")} · B-only ${d.onlyB.join(" + ")} · land A-only ${d.heldOnlyA.map(secName).join(",")} · B-only ${d.heldOnlyB.map(secName).join(",")}`);
const org = R.strategies.find(s => waterMeans(s) === "Adapt"), tfm = R.strategies.find(s => /Terraform/.test(s.signature) && s !== org);
check(!!org && org.tokens.every(t => /=Adapt\(\d\)$/.test(t)), "12 · one strategy is organism-first: Drought Adaptation answers the dry ground, no Terraform at all", org && `[${org.signature}]`);
check(!!tfm && /Water:dry=Adapt\(\d\)\+Terraform\(\+\d+\)/.test(tfm.signature) && W.distinctSignatures(org, tfm),
  "13 · a materially different strategy humidifies the sky (Terraform) and so needs less Drought — and keeps different ground (the hot south)", tfm && `[${tfm.signature}]`);
{ const st = BLOOM.findStrategies(pos, config, traits, { ...POLICY, excludeTraits: [WATERBORNE.id] }), sim = probeOf(pos);
  check(!sim.offered(WATERBORNE) && pos.archetype.landmasses === 1 && R.strategies.every(s => !s.tokens.some(t => t.startsWith("Crossing:"))) && !pos.archetype.witness.usedCrossing &&
    st.status === "PASS" && J(st.strategies.map(s => s.signature)) === J(R.strategies.map(s => s.signature)),
    "14 · Waterborne Seeds is not required: not even offered on this one-landmass fixture, and removing it from the catalogue changes no strategy"); }
{ // 15 · generic offer rule across the sweep: offered iff a real water crossing exists; never in a winning signature
  const one = S.filter(x => x.a.landmasses === 1), two = S.filter(x => x.a.landmasses > 1);
  const okOne = one.every(x => !x.crossOffered), okTwo = two.every(x => x.crossOffered === (probeOf(x.p).map.CROSSINGS.links.length > 0));
  const oa = BLOOM.generateFromArchetype(OA, 8, { config, traits });
  check(okOne && okTwo && S.every(x => !x.strategies.some(s => /Crossing:/.test(s.signature))) && probeOf(oa).offered(WATERBORNE) && oa.archetype.strategies.list.every(s => /Crossing:/.test(s.signature)),
    "15 · Waterborne Seeds is absent wherever no crossing exists (every one-landmass desert), offered only by the generic rule on two-landmass deserts, and never part of a Desert win — while Ocean Archipelago still requires it",
    `${one.length} one-landmass deserts: offered on 0 · ${two.length} two-landmass: offered on ${two.filter(x => x.crossOffered).length} (seeds ${two.map(x => x.a.publicSeed).join(",")}), in 0 strategies · OA seed 8 strategies all cross`); }
{ // 16 · independent earned-Biomass replay of each witness + whole core bought before the margin
  const rows = [wA, wB].map(w => { const sim = BLOOM.createSim(pos, config, traits, { rng: BLOOM.gen.mulberry32(config.validation.rngSeed) });
    let k = 0, ok = true, earned = 0; for (let t = 1; t <= w.marginTick; t++) { const b = sim.biomass; sim.tick(); earned += Math.max(0, sim.biomass - b);
      if (k < w.purchases.length && w.purchases[k].tick === t) { if (sim.biomass < w.purchases[k].cost || !sim.buy(w.purchases[k].id)) ok = false; k++; } }
    return { ok: ok && k === w.purchases.filter(p => p.tick <= w.marginTick).length && sim.coverage() >= w.target && sim.spent.local === 0, cov: sim.coverage(), k, earned: Math.round(earned), spent: sim.spent.global }; });
  const core = w => w.signature.minimalBuild.every(id => w.purchases.filter(p => p.tick <= w.marginTick && p.id === id).length >= w.signature.minimalBuild.filter(x => x === id).length);
  check(rows.every(r => r.ok) && [wA, wB].every(core) && [wA, wB].every(w => w.purchases.every(p => traits.some(t => t.id === p.id))),
    "16 · both witnesses earn their Biomass and buy through sim.buy (independent replay reproduces each margin), buy their whole core first, and make no local colony choices",
    rows.map(r => `${r.k} purchases, ${r.spent} spent of ${r.earned} earned → ${pct(r.cov)}`).join(" · ")); }
check([A, B].every(s => s.peak >= pos.winThreshold + config.validation.winMargin - 1e-9 && s.winSeconds <= s.marginSeconds),
  `17 · both reach the validation margin (${pct(config.win + config.validation.winMargin)})`, [A, B].map(s => `win ${s.winSeconds} s → margin ${s.marginSeconds} s, peak ${pct(s.peak)}`).join(" · "));
check([A, B].every(s => s.pacingCheck.ok && W.checkPacing({ marginSeconds: s.marginSeconds, pacing: s.pacing }, POLICY.pacing).ok),
  "18 · both satisfy Desert World's pacing policy (margin 360–900 s, first purchase 45–120 s, gap ≤ 240 s, terminal wait ≤ 240 s)",
  [A, B].map(s => `margin ${s.marginSeconds} s, first ${s.pacing.firstPurchaseSeconds} s, gap ${s.pacing.maxPurchaseGapSeconds} s, wait ${s.pacing.terminalWaitSeconds} s`).join(" · "));
{ const arms = traits.filter(t => t.effect.type === "waterArm").map(t => t.id), moist = traits.filter(t => t.effect.type === "sky" && t.effect.axis === "moist").map(t => t.id);
  const none = BLOOM.findWitness(pos, config, traits, { excludeTraits: [...arms, ...moist] });
  check(!none.ok && none.layer === 4, "12–13 · the water problem is real: with neither water Adaptation nor water Terraform, no legal build can hold 70% (static proof)", none.reason); }

// ---- A19 · natural negatives
console.log("\n# A19 · natural Desert negatives (structure-only attempt → full validation; production skips each)");
const at = ([s, k]) => BLOOM.archetype.attemptPlanet(DW, s, k).planet;
const skipped = ([s, k], re) => { const g = BLOOM.generateFromArchetype(DW, s, { config, traits }); return g.archetype.attempt > k && re.test(g.archetype.rejectedAttempts[k].rejected[0]) ? g.archetype.attempt : null; };
{ const p = at(FIX.negLayer4), s = BLOOM.validatePlanet(p, config, { traits, regenerate: BLOOM.generatePlanet }), v = BLOOM.validatePlanet(p, config, { traits, winnability: true, strategies: POLICY });
  const k = skipped(FIX.negLayer4, /^layer 4/);
  check(s.ok && p.sections.length >= 12 && !v.ok && /^layer 4 \(simultaneous coverage\)/.test(v.errors[0]) && k !== null,
    `19 · layer 4 (unwinnable simultaneous coverage): seed ${FIX.negLayer4[0]} attempt ${FIX.negLayer4[1]} is structurally fine but rejected`, `${v.errors[0]} · production takes attempt ${k}`); }
{ const p = at(FIX.negLayer7), r = BLOOM.findStrategies(p, config, traits, POLICY), k = skipped(FIX.negLayer7, /^layer 7/);
  check(r.layer === 7 && r.status === "FAIL" && r.first.witness && r.first.witness.ok && r.classes.length === 1 && k !== null,
    `19 · layer 7 (one exact broad solution): seed ${FIX.negLayer7[0]} attempt ${FIX.negLayer7[1]} wins with margin, but every build shares one core — a static proof`,
    `${r.reason.slice(0, 110)} · production takes attempt ${k}`); }
{ const p = at(FIX.negLayer8), r = BLOOM.findStrategies(p, config, traits, POLICY), k = skipped(FIX.negLayer8, /^layer 8/);
  check(r.layer7.status === "PASS" && r.layer === 8 && r.status === "FAIL" && r.slow.every(w => w.pacingCheck.reasons.some(x => /too fast/.test(x))) && k !== null,
    `19 · layer 8 (pacing): seed ${FIX.negLayer8[0]} attempt ${FIX.negLayer8[1]} has 2 broad strategies, both win too fast`, `${r.reason.slice(0, 150)} · production takes attempt ${k}`); }
{ const p = at(FIX.negOrigin), sim = probeOf(p), e = sim.evaluate(sim.map.ORIGIN), k = skipped(FIX.negOrigin, /not a refuge/);
  const s = BLOOM.validatePlanet(p, config, { traits });
  check(s.ok && rawFit(e) < DW.geography.minOriginFitness && e.fitness >= config.categories.originFitnessFloor && e.limitKey === "Water" && k !== null,
    `19 · origin refuge (Desert rule): seed ${FIX.negOrigin[0]} attempt ${FIX.negOrigin[1]} passes the structural validator, but its home region is dry ground kept alive only by the protected-refuge floor`,
    `own fitness ${rawFit(e).toFixed(2)} (floor lifts it to ${e.fitness.toFixed(2)}), limited by ${e.limitKey} · production takes attempt ${k}`); }

// ---- A21–25 · other worlds unchanged
console.log("\n# A21–25 · First Bloom and Ocean Archipelago unchanged");
{ const fb = BLOOM_DATA.planets.first_bloom, v = BLOOM.validatePlanet(fb, config, { traits, winnability: true });
  check(v.ok && !probeOf(fb).offered(WATERBORNE), "21 · First Bloom remains valid (layers 1–6 witness) and its shop unchanged", `witness margin at ${v.stats.witness.witness.marginSeconds} s`); }
const OA_ID = { 28: { attempt: 8, name: "Borea-495", id: "proc_580988495" }, 8: { attempt: 1, name: "Coriol-220", id: "proc_522844220" } }; // (BLOOM-027B: Ocean 28 is the shared Ocean primary; was 13 / Eos-227)
for (const s of Object.keys(OA_ID).map(Number)) { const g = BLOOM.generateFromArchetype(OA, s, { config, traits }), a = g.archetype;
  const v = BLOOM.validatePlanet(g, config, { traits, regenerate: BLOOM.generatePlanet, winnability: true, strategies: { minStrategies: OA.validation.minStrategies, pacing: OA.validation.pacing } });
  check(v.ok && a.strategies.found >= 2 && a.landmasses >= 3, `22 · Ocean Archipelago seed ${s} still passes layers 1–8`, `${a.strategies.list.map(x => `[${x.signature}]`).join(" ")}`);
  check(a.attempt === OA_ID[s].attempt && g.name === OA_ID[s].name && g.id === OA_ID[s].id, `23 · Ocean Archipelago seed ${s} identity is stable (attempt, planet name, id)`, `attempt ${a.attempt} · ${g.name} (${g.id})`); }
{ let e = null; try { BLOOM.generateFromArchetype(OA, 114, { config, traits }); } catch (x) { e = x; }
  check(e && e.attempts.length === OA.generation.maxAttempts && e.attempts.every(a => a.rejected.length), "25 · the known Ocean failure (seed 114; was 35 before BLOOM-027B) still fails explicitly after 24 attempts"); }

// ---- A26 · colony development on the desert, unchanged mechanics
console.log("\n# A26 · colony development on Desert World (BLOOM-009 system, unchanged)");
{ const mk = () => BLOOM.createSim(pos, config, traits, { rng: BLOOM.gen.mulberry32(7) });
  const s1 = mk(), O = s1.map.ORIGIN; s1.biomass = 0;
  for (let t = 0; t < 1500; t++) s1.tick();
  const liv = s1.livingCountBySection(), other = s1.map.SEC.findIndex((_, i) => i !== O && liv[i] > 0);
  check(s1.setColonyFocus(O, "roots") && (other < 0 || s1.setColonyFocus(other, "leaves")) && s1.getColonyFocus(O) === "roots" && (other < 0 || s1.getColonyFocus(other) === "leaves") &&
    s1.colonies.focus.filter(f => f !== "balanced").length === (other < 0 ? 1 : 2), "26 · per-region focus works on a desert: two regions hold different focuses at once, the rest stay Balanced");
  const a = mk(), b = mk(); for (const s of [a, b]) for (let t = 0; t < 400; t++) s.tick();
  b.setColonyFocus(b.map.ORIGIN, "roots"); for (const s of [a, b]) for (let t = 0; t < 300; t++) s.tick();
  check(b.establishment(b.map.ORIGIN) > a.establishment(a.map.ORIGIN) + 0.03, "26 · Roots thickens the young origin refuge faster than Balanced (controlled, same RNG)",
    `origin establishment ${a.establishment(a.map.ORIGIN).toFixed(3)} → ${b.establishment(b.map.ORIGIN).toFixed(3)}`);
  const c = mk(); c.biomass = 60; const refused = !c.buySpecialization(c.map.ORIGIN, "rootNetwork");
  c.biomass = 200; const bought = c.buySpecialization(c.map.ORIGIN, "rootNetwork");
  check(refused && bought && c.getSpecialization(c.map.ORIGIN) === "rootNetwork" && c.spent.local === 90 && Math.floor(c.biomass) === 110 && c.specPrice() === 130,
    "26 · a local specialization is bought with ordinary Biomass (refused when short), tied to its region, and raises the next price", `Root Network 90 → next 130`); }
{ const STUDY = require("./colony-study.js"), plan = A.purchases.map(p => p.id), sd = [101, 108, 115];
  const w = pol => mean(sd.map(x => STUDY.run(pos, plan, x, pol, "none").win));
  const bal = w("balanced"), sit = w("situational"), mis = w("misplaced");
  check(sit < bal && bal < mis, "26 · situational per-colony play beats Balanced, which beats misplaced play — optional, and never required to win (witnesses use none)",
    `strategy A recipe, 3 run seeds: situational ${sit.toFixed(0)} s · Balanced ${bal.toFixed(0)} s · misplaced ${mis.toFixed(0)} s`); }

if (JSON_OUT) { fs.writeFileSync(JSON_OUT, J({ accepted: worlds.length, genFails, rejByLayer, seedMs, worlds: S.map(x => ({ seed: x.a.publicSeed, attempt: x.a.attempt, name: x.p.name,
  water: x.a.actualWaterPct, landmasses: x.a.landmasses, sections: x.secs, T: +x.T.toFixed(1), M: +x.M.toFixed(1), crossOffered: x.crossOffered,
  strategies: x.strategies.map(s => ({ signature: s.signature, purchases: s.purchases, winSeconds: s.winSeconds, marginSeconds: s.marginSeconds, firstPurchaseSeconds: s.firstPurchaseSeconds,
    maxPurchaseGapSeconds: s.maxPurchaseGapSeconds, terminalWaitSeconds: s.terminalWaitSeconds })) })) }, null, 1)); console.log("wrote", JSON_OUT); }

// =====================================================================================================================
(async () => {
  if (NO_BROWSER) return finish();
  let chromium; try { ({ chromium } = require("playwright")); }
  catch { console.error('Playwright not found. Run with NODE_PATH="$(npm root -g)" after `npm i -g playwright`, or pass --no-browser.'); process.exit(2); }
  const PAGE = "file://" + encodeURI(path.join(ROOT, "demos/demo-run.html")), TICK_S = config.tickMs / 1000;
  // (BLOOM-029E) this suite drives the engineering shell's own controls and reads its DOM (the pre-029 playtest harness): it opens every page
  // with the developer flag ?ui=legacy. The production UI is the default run interface; its suites are planet-view / plant-rooms / terraform /
  // run-ui-convergence / game-flow.
  const legacy = q => (q ? q + "&" : "?") + "ui=legacy";
  const browser = await chromium.launch();
  // headless Chromium here returns an all-transparent canvas readback on the FIRST page of a session (later pages read
  // normally — the same quirk BLOOM-003 noted for demo-surface); one throwaway page keeps the pixel checks honest
  { const w = await browser.newPage(); await w.goto(PAGE + legacy("")); await w.waitForTimeout(200); await w.close(); }
  const open = async (q, pause = true) => { const p = await browser.newPage({ viewport: { width: 1400, height: 900 } });
    p.errors = []; p.on("pageerror", e => p.errors.push(e.message)); p.on("console", m => { if (m.type() === "error") p.errors.push(m.text()); });
    await p.goto(PAGE + legacy(q)); await p.waitForTimeout(300); if (pause && await p.$("#btnPlay")) await p.click("#btnPlay"); return p; };
  const shot = async (p, name) => { if (SHOTS) { await p.evaluate(() => typeof draw === "function" && draw()); await p.screenshot({ path: path.join(SHOTS, name) }); } };
  const clickTile = async (p, t) => { const r = await p.evaluate(t => { const b = document.getElementById("cv").getBoundingClientRect(), g = BLOOM_API.geometry();
    return { x: b.left + ((t % g.W) + 0.5) * g.tile, y: b.top + (((t / g.W) | 0) + 0.5) * g.tile }; }, t); await p.mouse.click(r.x, r.y); };
  const LEAK = /ocean|island|archipelago|\bseas?\b|coast|waterborne|shore/i, WET_DEFAULTS = ["River", "Marsh", "Fen", "Bog", "Tidal", "Mire"];

  console.log(`\n# B27–32 · real browser: demo-run.html?archetype=desert_world&seed=${FIX.positive}`);
  const p = await open(`?archetype=desert_world&seed=${FIX.positive}`);
  const id = await p.evaluate(() => ({ run: BLOOM_API.run, runId: document.getElementById("runId").textContent, title: document.title, keys: Object.keys(BLOOM_RUN.planet.archetype),
    text: document.body.innerText, titles: [...document.querySelectorAll("[title]")].map(e => e.title).join(" "), shop: [...document.querySelectorAll("button.buy")].map(b => b.dataset.id),
    fnIsReal: BLOOM.generateFromArchetype === BLOOM.archetype.generateFromArchetype, geo: BLOOM_API.geometry(), labels: SEC.map((_, i) => LABEL[i]) }));
  check(id.fnIsReal && id.run.kind === "procedural" && id.run.archetypeId === "desert_world" && id.run.publicSeed === FIX.positive && id.run.attempt === pos.archetype.attempt &&
    id.run.planetId === pos.id && J(id.run.validatedLayers) === "[1,2,3,4,5,6,7,8]" && id.geo.landmasses === 1,
    "27 · the Desert run launches through the generic launch path (BLOOM.generateFromArchetype in-page): same accepted attempt and planet as Node, layers 1–8",
    `attempt ${id.run.attempt} · ${id.run.name} (${id.run.planetId}) · water ${id.geo.water} tiles · 1 landmass`);
  check(id.runId === `Desert World · public seed ${FIX.positive} · attempt ${pos.archetype.attempt} · ${pos.name} (${pos.id}) · layers 12345678` && new RegExp(`Desert World · seed ${FIX.positive}`).test(id.title),
    "27 · run identity shows Desert World, public seed, accepted attempt and planet name/id", id.runId);
  check(!id.keys.includes("witness") && !id.keys.includes("strategies") && !/signature|witness|Adapt\(\d\)|Terraform\([+−-]|Water:dry/i.test(id.text + id.titles),
    "32 · no witness plan, strategy signature or solution reaches the page", `planet.archetype keys: ${id.keys.join(",")}`);
  check(!id.shop.includes(WATERBORNE.id) && !LEAK.test(id.text + " " + id.titles) && !id.labels.some(n => WET_DEFAULTS.some(w => n.startsWith(w + " "))),
    "31 · no Ocean names or assumptions: no Waterborne Seeds in the shop, no ocean/island/sea/coast wording in the page or tooltips, region names from the desert's own pools",
    id.labels.join(", "));
  // map reads as a desert: sampled bare ground is sandy (red ≥ blue), lake water is blue, unlike Ocean's palette
  const px = await p.evaluate(() => { draw(); const S = BLOOM_API.sim, M = S.map, c = document.getElementById("cv").getContext("2d"), d = window.devicePixelRatio || 1, T = BLOOM_API.geometry().tile;
    const at = t => [...c.getImageData(((t % M.W) + 0.5) * T * d, (((t / M.W) | 0) + 0.25) * T * d, 1, 1).data].slice(0, 3);
    const land = [], water = []; for (let t = 0; t < M.N; t += 29) { if (M.TILEMAP[t] < 0) water.push(at(t)); else if (S.state[t] === S.BAR) land.push(at(t)); } return { land, water }; });
  const sandy = c => c[0] >= c[2] + 20 && c[1] >= c[2], blue = c => c[2] > c[0] + 40;
  check(px.land.length > 40 && px.land.filter(sandy).length >= 0.9 * px.land.length && px.water.length > 3 && px.water.every(blue),
    "27 · the temporary desert treatment renders: bare ground samples are sandy (warm, not blue-green), lake water is blue", `${px.land.filter(sandy).length}/${px.land.length} sandy (e.g. rgb ${px.land[0]}) · ${px.water.length} water samples (e.g. rgb ${px.water[0]})`);
  await shot(p, "desert25-start.png");
  // 28 · inspection: a dry region reads "too dry" with both remedies; a lake click is a water note
  const dry = await p.evaluate(() => { const S = BLOOM_API.sim, M = S.map; let best = -1, bm = 1e9;
    M.SEC.forEach((s, i) => { const e = S.evaluate(i); if (e.limitKey === "Water" && e.effM < bm && e.cats.Temperature.f > 0.9) { bm = e.effM; best = i; } });
    return { i: best, tile: M.SEC_TILES[best][(M.SEC_TILES[best].length / 2) | 0], lake: M.TILEMAP.findIndex(v => v < 0) }; });
  await p.evaluate(() => { selected = -1; renderInspect(); }); await clickTile(p, dry.tile);
  const iv = await p.evaluate(() => ({ sel: selected, cats: [...document.querySelectorAll("#inspect .cat .lbl")].map(x => x.innerText), limit: (document.querySelector("#inspect .limit") || {}).innerText || "",
    water: [...document.querySelectorAll("#inspect .cat")].map(x => x.innerText).find(t => /Water/.test(t)) || "", geo: document.querySelector("#inspect .geo") }));
  check(iv.sel === dry.i && iv.cats.join() === "Temperature,Water,Soil,Hazard" && /Growth blocked: too dry/.test(iv.limit) && /Drought/.test(iv.limit) && /Humidify/.test(iv.limit) && !iv.geo,
    "28 · inspecting a dry desert region: the four categories, 'Growth blocked: too dry', and both remedies (Adapt: Drought — or Terraform: Humidify); no island note",
    `${id.labels[dry.i]}: ${iv.water.replace(/\s+/g, " ")} · ${iv.limit.replace(/\n/g, " / ")}`);
  await shot(p, "desert25-inspect-dry.png");
  await clickTile(p, dry.lake);
  const wv = await p.evaluate(() => ({ head: document.querySelector("#inspect h2").innerText, body: document.getElementById("inspect").innerText, sel: selected }));
  check(wv.head === "WATER" && /not count toward coverage/.test(wv.body) && wv.sel === -1 && !/Waterborne/.test(wv.body), "28 · clicking lake water shows the plain water note (no crossing trait mentioned)", wv.body.split("\n")[2] || "");
  await p.hover('button.buy[data-id="drought"]');
  const pv = await p.evaluate(() => ({ log: document.getElementById("log").textContent, gain: preview.gain.length }));
  check(/^Drought Adaptation — /.test(pv.log) && pv.gain > 0, "28 · the Drought purchase preview names the dry regions it would open", pv.log.slice(0, 160));
  await p.mouse.move(5, 5); await p.evaluate(() => { selected = -1; renderInspect(); });
  // 29 · win through real shop buttons with the organism-first strategy (A)
  const plan = org.purchases.map(x => x.id); let i = 0, affordAt = null; const buys = []; let won = null;
  for (let t = 0; t < 9000 && !won; t += 5) {
    await p.evaluate(() => { BLOOM_API.advance(5); refreshShop(); });
    const st = await p.evaluate(() => BLOOM_API.state());
    if (st.won) { won = st; break; }
    if (i < plan.length) { const off = await p.$eval(`button.buy[data-id="${plan[i]}"]`, b => b.classList.contains("off"));
      if (!off) { affordAt ??= st.ticks; if (st.ticks - affordAt >= 25) { await p.click(`button.buy[data-id="${plan[i]}"]`); buys.push(`${plan[i]} @ ${Math.round(st.ticks * TICK_S)} s`); i++; affordAt = null; } } }
  }
  const fin = await p.evaluate(() => ({ cov: BLOOM_API.sim.coverage(), genome: { ...BLOOM_API.sim.genome }, local: BLOOM_API.sim.spent.local }));
  check(!!won && i === plan.length && fin.cov >= 0.70 && fin.genome.waterArm === "dry" && fin.local === 0,
    "29 · the Desert run is won through real shop clicks with the organism-first strategy (no local upgrades needed)",
    `${buys.join(" → ")} · win at ${won ? Math.round(won.ticks * TICK_S) : "—"} s with ${pct(fin.cov)} of the land`);
  const rep = await p.evaluate(() => ({ on: !!(document.getElementById("reportModal") && document.getElementById("reportModal").classList.contains("on")), text: document.getElementById("report").innerText }));
  check(rep.on && rep.text.includes(pos.name) && new RegExp(`Desert World · public seed ${FIX.positive}`).test(rep.text) && /Drought Adaptation/.test(rep.text) && !LEAK.test(rep.text),
    "30 · the Bloom Report identifies the generated Desert World (name, archetype, public seed) and its build — no Ocean wording", rep.text.split("\n").slice(0, 2).join(" / "));
  await shot(p, "desert25-report.png");
  await p.evaluate(() => document.getElementById("reportModal").classList.remove("on")); await shot(p, "desert25-won-map.png");
  check(p.errors.length === 0, "no browser errors (Desert seed 25)", p.errors.join(" | ")); await p.close();

  // the Terraform strategy (B) through real buttons too — a second valid way through the same desert
  { const q = await open(`?archetype=desert_world&seed=${FIX.positive}`), plan = tfm.purchases.map(x => x.id); let i = 0, affordAt = null, won = null;
    for (let t = 0; t < 9000 && !won; t += 5) {
      await q.evaluate(() => { BLOOM_API.advance(5); refreshShop(); }); const st = await q.evaluate(() => BLOOM_API.state()); if (st.won) { won = st; break; }
      if (i < plan.length) { const off = await q.$eval(`button.buy[data-id="${plan[i]}"]`, b => b.classList.contains("off"));
        if (!off) { affordAt ??= st.ticks; if (st.ticks - affordAt >= 25) { await q.click(`button.buy[data-id="${plan[i]}"]`); i++; affordAt = null; } } } }
    const sky = await q.evaluate(() => BLOOM_API.state().sky);
    check(!!won && i === plan.length && sky.moist > pos.globalClimate.moisture, "29 · …and also with the Terraform strategy (Humidify raises the sky's moisture)",
      `${plan.join(" → ")} · win at ${won ? Math.round(won.ticks * TICK_S) : "—"} s · sky moisture ${pos.globalClimate.moisture} → ${sky.moist}`);
    await shot(q, "desert25-terraform-won.png"); check(q.errors.length === 0, "no browser errors (Terraform run)", q.errors.join(" | ")); await q.close(); }

  // the optional second playtest seed + Ocean seeds 13 / 8 still launch
  console.log("\n# B24 · other launches");
  { const q = await open(`?archetype=desert_world&seed=${FIX.second}`), r = await q.evaluate(() => ({ run: BLOOM_API.run, n: document.querySelectorAll("#inspect .cat").length }));
    const ref = BLOOM.generateFromArchetype(DW, FIX.second, { config, traits });
    check(r.run.attempt === ref.archetype.attempt && r.run.planetId === ref.id && r.n === 4, `Desert seed ${FIX.second} (optional playtest seed) launches: attempt ${r.run.attempt} · ${r.run.name}`);
    await shot(q, `desert${FIX.second}-start.png`); check(q.errors.length === 0, `no browser errors (Desert seed ${FIX.second})`, q.errors.join(" | ")); await q.close(); }
  for (const s of Object.keys(OA_ID).map(Number)) { const q = await open(`?archetype=ocean_archipelago&seed=${s}`);
    const r = await q.evaluate(() => ({ run: BLOOM_API.run, shop: [...document.querySelectorAll("button.buy")].map(b => b.dataset.id), geo: BLOOM_API.geometry(),
      water: (() => { const c = document.getElementById("cv").getContext("2d"), M = BLOOM_API.sim.map, T = BLOOM_API.geometry().tile, d = window.devicePixelRatio || 1, t = M.TILEMAP.findIndex(v => v < 0);
        return [...c.getImageData(((t % M.W) + 0.5) * T * d, (((t / M.W) | 0) + 0.5) * T * d, 1, 1).data].slice(0, 3); })() }));
    check(r.run.attempt === OA_ID[s].attempt && r.run.name === OA_ID[s].name && r.shop.includes(WATERBORNE.id) && r.geo.landmasses >= 3 && [J([24, 52, 92]), J([30, 62, 104])].includes(J(r.water)),
      `24 · Ocean Archipelago seed ${s} harness still works: same identity, Waterborne Seeds offered, the ocean keeps its own water colour`, `attempt ${r.run.attempt} · ${r.run.name} · water rgb ${r.water}`);
    check(q.errors.length === 0, `no browser errors (Ocean seed ${s})`, q.errors.join(" | ")); await q.close(); }
  await browser.close();
  finish();
})();
function finish() {
  console.log(`\n${fails ? fails + " check(s) FAILED" : "ALL CHECKS PASS"}  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  process.exit(fails ? 1 : 0);
}
