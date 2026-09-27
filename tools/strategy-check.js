// BLOOM — strategy diversity + pacing validation (BLOOM-006, bible §10.3 layers 7–8). Plain Node.
//
//   node tools/strategy-check.js
//
// Production modules only. Every witness buys through sim.buy() with Biomass earned under the real economy.
// Fixtures are Ocean Archipelago (public seed, attempt k) worlds from BLOOM.archetype.attemptPlanet.
"use strict";
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
for (const f of ["content/config.js", "content/traits.js", "content/archetypes.js", "planets/first_bloom.js", "resources/bloom-sim.js",
  "resources/bloom-gen.js", "resources/bloom-validate.js", "resources/bloom-witness.js", "resources/bloom-archetype.js"]) require(path.join(ROOT, f));
const { BLOOM, BLOOM_DATA } = globalThis, { config, traits, archetypes } = BLOOM_DATA, W = BLOOM.witness;
const OA = archetypes.find(a => a.id === "ocean_archipelago"), POLICY = { minStrategies: OA.validation.minStrategies, pacing: OA.validation.pacing };
const J = o => JSON.stringify(o), clone = o => JSON.parse(J(o)), pct = x => (x * 100).toFixed(1) + "%";
let fails = 0;
const check = (ok, name, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); if (!ok) fails++; };
const t0 = Date.now();

// ---- fixtures: [public seed, attempt]
// BLOOM-008's owner-authorized growth retune moved individual witness timings, so the natural negatives were
// re-picked from the new 40-seed sweep (was layer7 5/0, tooSlow 27/1, lateFirst 20/2, gap 17/2 under BLOOM-006/007);
// the pacing bands themselves did not need to change (same 35/40 accepted, same explicit failures).
// BLOOM-009's owner-authorized retune (smaller seedlings, slower thickening, per-region allocation) moved them again:
// re-picked from a fresh 40-seed scan (was tooSlow 21/1, lateFirst 4/1, gap 39/1 under BLOOM-008). Bands unchanged;
// the production sweep is now 34/40 (seed 33 joins the explicit failures 3, 7, 19, 35, 38).
const FIX = { positive: [13, 6], layer7: [5, 5], tooSlow: [14, 1], lateFirst: [21, 1], gap: [16, 3] };
const at = ([seed, k]) => BLOOM.archetype.attemptPlanet(OA, seed, k).planet;
const strategies = (p, pol = POLICY, cfg = config, opts = {}) => BLOOM.findStrategies(p, cfg, traits, { ...pol, ...opts });
const withPacing = (edit) => { const P = clone(POLICY); edit(P.pacing); return P; };
const tag = w => `[${w.signature}]`;
const onlyReasons = (r, re) => r.slow.length > 0 && r.slow.every(w => w.pacingCheck.reasons.length && w.pacingCheck.reasons.every(x => re.test(x)));

// 0 · the policy is data
console.log("# 0 policy");
check(BLOOM.archetype.checkArchetype(OA, config).length === 0 && POLICY.minStrategies === 2 && J(POLICY.pacing) === J({ marginSeconds: [360, 900], firstPurchaseSeconds: [45, 120], maxPurchaseGapSeconds: 240 }),
  "Ocean Archipelago requires 2 broad strategies and the provisional pacing bands, as archetype data", J(POLICY));
for (const [name, mut] of [["a reversed pacing band", a => a.validation.pacing.marginSeconds = [900, 360]], ["minStrategies 0", a => a.validation.minStrategies = 0],
  ["a margin band beyond the witness time budget", a => a.validation.pacing.marginSeconds = [360, 99999]], ["pacing without winnability", a => a.validation.winnable = false]]) {
  const a = clone(OA); mut(a); const e = BLOOM.archetype.checkArchetype(a, config); check(e.length > 0, `schema rejects ${name}`, e[0]);
}

// 1–5 · positive fixture: two materially different broad strategies, both real, both on pace
console.log(`\n# 1–5 positive fixture — Ocean Archipelago seed ${FIX.positive[0]}, attempt ${FIX.positive[1]}`);
const pos = at(FIX.positive);
const vPos = BLOOM.validatePlanet(pos, config, { traits, regenerate: BLOOM.generatePlanet, winnability: true, strategies: POLICY, measurePeak: true });
const R = vPos.stats.strategies, [A, B] = R.strategies, [wA, wB] = R.witnesses;
for (const s of R.strategies) {
  console.log(`  ${tag(s)}\n    core ${s.minimalBuild.join(" + ")} · plan ${s.purchases.map(p => `${p.id} @ ${p.seconds} s (${p.cost})`).join(" → ")}`);
  console.log(`    spent ${s.totalSpent} · win ${s.winSeconds} s · margin ${s.marginSeconds} s · peak ${pct(s.peak)} · first purchase ${s.pacing.firstPurchaseSeconds} s · gaps ${s.pacing.purchaseGapsSeconds.join("/")} s · terminal wait ${s.pacing.terminalWaitSeconds} s · Biomass/min ${s.pacing.earnedPerMinute.join(",")}`);
}
console.log(`  early land (no upgrades): reachable ${pct(R.early.reachableShare)}, growable ${pct(R.early.growableShare)} · search ${R.search.simulations} simulations over ${R.search.classes} classes`);
check(vPos.ok && R.status === "PASS" && R.layer7.status === "PASS" && R.layer8.status === "PASS" && R.strategies.length >= 2,
  "1 · layers 1–8 PASS with ≥ 2 qualifying broad strategies", `${R.strategies.length} strategies, layer 7 ${R.layer7.status}, layer 8 ${R.layer8.status}`);
const d = R.differences[0], cross = t => t.startsWith("Crossing:");
check(W.distinctSignatures(A, B) && d.onlyA.some(t => !cross(t)) && d.onlyB.some(t => !cross(t)) && A.tokens.some(cross) && B.tokens.some(cross) && (d.heldOnlyA.length + d.heldOnlyB.length) > 0,
  "2 · the signatures differ materially (each answers a condition the other doesn't; both share Waterborne Seeds; they hold different land)",
  `A-only ${d.onlyA.join(" + ")} · B-only ${d.onlyB.join(" + ")} · land A-only ${d.heldOnlyA.join(",")} · B-only ${d.heldOnlyB.join(",")}`);
{ // 3 · independent replay of each witness: every purchase affordable from earned Biomass at its tick, same margin
  const rows = [wA, wB].map(w => { const sim = BLOOM.createSim(pos, config, traits, { rng: BLOOM.gen.mulberry32(config.validation.rngSeed) });
    let k = 0, ok = true; for (let t = 1; t <= w.marginTick; t++) { sim.tick();
      if (k < w.purchases.length && w.purchases[k].tick === t) { if (sim.biomass < w.purchases[k].cost || !sim.buy(w.purchases[k].id)) ok = false; k++; } }
    return { ok: ok && k === w.purchases.filter(p => p.tick <= w.marginTick).length && sim.coverage() >= w.target, cov: sim.coverage(), k }; });
  check(rows.every(r => r.ok), "3 · both witnesses earn Biomass and buy normally (independent sim.buy replay reproduces each margin)",
    rows.map(r => `${r.k} purchases → ${pct(r.cov)}`).join(" · "));
  const core = w => w.signature.minimalBuild.every(id => w.purchases.filter(p => p.tick <= w.marginTick && p.id === id).length >= w.signature.minimalBuild.filter(x => x === id).length);
  check([wA, wB].every(core), "…and each bought its whole strategy core before the margin (the win really used that strategy)");
}
check([A, B].every(s => s.marginSeconds && s.peak >= pos.winThreshold + config.validation.winMargin - 1e-9 && s.winSeconds <= s.marginSeconds),
  `4 · both clear the validation margin (${pct(config.win + config.validation.winMargin)})`, [A, B].map(s => `win ${s.winSeconds} s, margin ${s.marginSeconds} s, peak ${pct(s.peak)}`).join(" · "));
check([A, B].every(s => s.pacingCheck.ok && W.checkPacing({ marginSeconds: s.marginSeconds, pacing: s.pacing }, POLICY.pacing).ok),
  "5 · both satisfy the pacing policy", [A, B].map(s => `margin ${s.marginSeconds} s, first ${s.pacing.firstPurchaseSeconds} s, max gap ${s.pacing.maxPurchaseGapSeconds} s`).join(" · "));

// signature rules: not ids, not order, not boosters, not redundant add-ons
console.log("\n# signature rules");
{
  const core = A.minimalBuild, perm = core.slice().reverse(), boosters = traits.filter(t => t.board === "Spread" && t.effect.type === "level").map(t => t.id);
  const sA = W.strategyOf(pos, config, traits, core).signature.key;
  check(W.strategyOf(pos, config, traits, perm).signature.key === sA && W.signatureOf([...perm, ...boosters], Object.fromEntries(traits.map(t => [t.id, t])), {}).key === W.signatureOf(core, Object.fromEntries(traits.map(t => [t.id, t])), {}).key,
    "purchase order and Spread boosters (Seed Output, Early Maturity) never change a signature", sA);
  const extras = traits.filter(t => t.board !== "Spread" && !core.includes(t.id)).map(t => [...core, t.id])
    .map(b => ({ b, r: W.strategyOf(pos, config, traits, b) })).filter(x => x.r.sufficient);
  check(extras.length > 0 && extras.every(x => x.r.signature.minimalBuild.length < x.b.length && [A.signature, B.signature].concat(R.classes.map(c => c.signature)).includes(x.r.signature.key)),
    "adding an upgrade the win didn't need never founds a new strategy (the build maps to an existing class core)",
    extras.map(x => `+${x.b[x.b.length - 1]} → ${x.r.signature.key === sA ? "A" : "existing class"}`).join(", "));
  const ren = traits.map(t => ({ ...t, id: "x_" + t.id })), Rr = BLOOM.findStrategies(pos, config, ren, POLICY);
  check(Rr.status === "PASS" && J(Rr.strategies.map(s => s.signature)) === J(R.strategies.map(s => s.signature)),
    "signatures come from effects, not trait ids (renaming every trait id gives identical signatures)");
}

// 6 · layer-7 negative: structurally valid, winnable with margin and on pace — but only one broad strategy exists
console.log(`\n# 6 layer-7 negative — seed ${FIX.layer7[0]}, attempt ${FIX.layer7[1]}`);
{
  const p = at(FIX.layer7), s = BLOOM.validatePlanet(p, config, { traits, regenerate: BLOOM.generatePlanet, winnability: true });
  const r = strategies(p), f = BLOOM.validatePlanet(p, config, { traits, winnability: true, strategies: POLICY });
  const w = r.first.witness;
  check(s.ok && w && w.ok && W.checkPacing(w, POLICY.pacing).ok && !f.ok && r.layer === 7 && r.status === "FAIL" && /layer 7/.test(f.errors[0]),
    "structurally valid, passes layers 4–6 with a paced witness, REJECTED at layer 7 (FAIL, not inconclusive)", f.errors[0]);
  check(r.classes.length === 1 && r.search.simulations === 1, "the verdict is a static proof: every candidate build shares one minimal core",
    `${r.classes.length} class · ${r.classes[0].members} candidate builds · core ${r.classes[0].signature}`);
  const g = BLOOM.generateFromArchetype(OA, FIX.layer7[0], { config, traits });
  check(g.archetype.attempt > FIX.layer7[1] && /^layer 7 \(strategy diversity\)/.test(g.archetype.rejectedAttempts[FIX.layer7[1]].rejected[0]),
    "…and production generation skips that attempt deterministically", `accepted attempt ${g.archetype.attempt}`);
}

// 7–10 · layer-8 negatives
console.log("\n# 7–10 layer-8 negatives");
{
  const p = at(FIX.tooSlow), r = strategies(p);
  check(r.layer7.status === "PASS" && r.layer === 8 && r.status === "FAIL" && onlyReasons(r, /^margin reached at .* \(too slow\)$/),
    `7 · too slow: seed ${FIX.tooSlow[0]} attempt ${FIX.tooSlow[1]} has ${r.layer7.strategies} broad strategies that win with margin, REJECTED at layer 8`, r.reason);
}
{ // controlled: no natural fixture reaches layer 8 for being too fast — fast worlds are single-strategy and fail layer 7
  const rFast = strategies(pos, withPacing(P => P.marginSeconds = [899, 900]));
  const mine = rFast.slow.filter(w => [A.signature, B.signature].includes(w.signature));
  check(rFast.layer === 8 && rFast.status === "FAIL" && rFast.slow.every(w => w.pacingCheck.reasons.some(x => /margin reached .*\(too fast\)$/.test(x))) &&
    mine.length === 2 && mine.every(w => w.pacingCheck.reasons.length === 1),
    "8 · too fast (controlled policy boundary): the positive fixture under a margin floor of 899 s is REJECTED at layer 8, its two strategies for speed alone", mine.map(w => w.pacingCheck.reasons[0]).join(" · "));
  const rEdge = strategies(pos, withPacing(P => P.marginSeconds = [Math.min(A.marginSeconds, B.marginSeconds), 900]));
  check(rEdge.status === "PASS", "…and bands are inclusive: a floor exactly at the faster strategy's margin still passes", `floor ${Math.min(A.marginSeconds, B.marginSeconds)} s`);
}
{
  const p = at(FIX.lateFirst), r = strategies(p);
  check(r.layer7.status === "PASS" && r.layer === 8 && r.status === "FAIL" && onlyReasons(r, /^first purchase at .* \(too slow\)$/),
    `9 · first purchase too late: seed ${FIX.lateFirst[0]} attempt ${FIX.lateFirst[1]} REJECTED at layer 8`, r.reason);
}
{
  const p = at(FIX.gap), r = strategies(p);
  check(r.layer7.status === "PASS" && r.layer === 8 && r.status === "FAIL" && r.slow.some(w => w.pacingCheck.reasons.some(x => /^purchase gap of .* > 240 s$/.test(x))),
    `10 · excessive purchase gap: seed ${FIX.gap[0]} attempt ${FIX.gap[1]} REJECTED at layer 8 (natural; alongside a late first purchase and a slow margin)`,
    r.slow.map(w => w.pacingCheck.reasons.join("; ")).filter((x, i, a) => a.indexOf(x) === i).join(" | "));
  const rGap = strategies(pos, withPacing(P => P.maxPurchaseGapSeconds = 30)), mine = rGap.slow.filter(w => [A.signature, B.signature].includes(w.signature));
  check(rGap.layer === 8 && rGap.status === "FAIL" && rGap.slow.every(w => w.pacingCheck.reasons.some(x => /^purchase gap/.test(x))) && mine.length === 2 && mine.every(w => w.pacingCheck.reasons.length === 1),
    "…and in isolation (controlled): the positive fixture under a 30 s gap limit is REJECTED at layer 8 for the gap alone", mine.map(w => w.pacingCheck.reasons[0]).join(" · "));
}

// 11 · caps → INCONCLUSIVE, never FAIL; a capped search may still PASS once proven
console.log("\n# 11 search caps");
{
  const used = R.search.simulations, cfg = n => { const c = clone(config); c.validation.diversity.maxSimulations = n; return c; };
  const exact = strategies(pos, POLICY, cfg(used)), one = strategies(pos, POLICY, cfg(1));
  check(exact.status === "PASS", `a search capped exactly at the ${used} simulations it needed still PASSES (strategies already proven)`);
  check(one.status === "INCONCLUSIVE" && one.layer === 7 && /INCONCLUSIVE/.test(one.reason), "a 1-simulation diversity budget is INCONCLUSIVE, never FAIL", one.reason);
  const st = clone(config); st.validation.maxStaticStates = 50; const sc = strategies(pos, POLICY, st);
  check(sc.status === "INCONCLUSIVE", "a capped static enumeration is INCONCLUSIVE too", sc.reason);
  const cls = clone(config); cls.validation.diversity.maxBuildsPerClass = 0; const c0 = strategies(at(FIX.layer7), POLICY, cls);
  check(c0.status === "INCONCLUSIVE", "with no builds allowed per class, even the static-proof negative is INCONCLUSIVE (no claim without evidence)", c0.reason);
  const v = BLOOM.validatePlanet(pos, cfg(1), { traits, winnability: true, strategies: POLICY });
  let gen = null; try { BLOOM.generateFromArchetype(OA, FIX.positive[0], { config: cfg(1), traits }); } catch (e) { gen = e; }
  check(!v.ok && /INCONCLUSIVE/.test(v.errors[0]) && gen && gen.attempts.some(a => a.rejected.some(x => /INCONCLUSIVE/.test(x))),
    "the validator reports INCONCLUSIVE as an error, and production generation rejects it (only PASS is accepted)", v.errors[0].slice(0, 90) + "…");
}

// 12–13 · determinism, production requires layers 1–8
console.log("\n# 12–13 determinism and production policy");
{
  const strip = r => J({ ...r, search: { ...r.search, ms: 0 }, first: null, witnesses: null });
  check(strip(strategies(pos)) === strip(strategies(pos)), "12 · same planet + config → identical strategies, plans, times and diagnostics");
  const g1 = BLOOM.generateFromArchetype(OA, FIX.positive[0], { config, traits }), g2 = BLOOM.generateFromArchetype(OA, FIX.positive[0], { config, traits });
  check(J(g1) === J(g2) && g1.archetype.attempt === FIX.positive[1], "12 · fixed-seed generation stays deterministic (world + strategy summary identical)",
    `seed ${FIX.positive[0]} → attempt ${g1.archetype.attempt}, ${g1.archetype.strategies.found} strategies recorded`);
  check(J(g1.archetype.validatedLayers) === J([1, 2, 3, 4, 5, 6, 7, 8]) && BLOOM.validatePlanet(g1, config, { traits, regenerate: BLOOM.generatePlanet, winnability: true, strategies: POLICY }).ok,
    "13 · the accepted world records layers 1–8 and independently re-validates through all eight");
  const rej = g1.archetype.rejectedAttempts.filter(a => a.rejected.length);
  check(g1.archetype.rejectedAttempts.length === g1.archetype.attempt && rej.every(a => a.rejected.length), "13 · every earlier attempt was rejected with recorded reasons",
    rej.map(a => `#${a.attempt}: ${a.rejected[0].slice(0, 48)}`).join(" | "));
}

// 15 · First Bloom: the Terraform water alternative (authored planet, production simulation path; golden untouched — see sim-check)
console.log("\n# 15 First Bloom water alternatives");
{
  const fb = BLOOM_DATA.planets.first_bloom, arms = traits.filter(t => t.effect.type === "waterArm").map(t => t.id);
  const moistSky = traits.filter(t => t.effect.type === "sky" && t.effect.axis === "moist").map(t => t.id);
  const tf = BLOOM.findWitness(fb, config, traits, { excludeTraits: arms }), w = tf.witness;
  check(tf.ok && !w.plan.some(id => arms.includes(id)) && w.signature.tokens.some(t => /^Water:\w+=Terraform/.test(t)) && !w.signature.tokens.some(t => /^Water:\w+=.*Adapt/.test(t)),
    "without any water Adaptation, a real earned-Biomass witness wins First Bloom with water Terraform instead",
    `${w.purchases.map(p => `${p.name} @ ${p.seconds} s`).join(" → ")} · margin ${pct(w.target)} at ${w.marginSeconds} s · ${w.signature.key}`);
  const none = BLOOM.findWitness(fb, config, traits, { excludeTraits: [...arms, ...moistSky] });
  check(!none.ok && none.layer === 4 && Math.abs(none.bestStatic.coverage - 0.676) < 0.0005,
    "with neither water Adaptation nor water Terraform, no legal build reaches 70% (best 67.6% — the same cap the tested generalist hits)", none.reason);
  const all = BLOOM.findStrategies(fb, config, traits, { minStrategies: 6 });
  check(all.status === "PASS" && all.strategies.some(s => /Water:\w+=Terraform/.test(s.signature)) && all.strategies.some(s => /Water:wet=Adapt/.test(s.signature)) && all.strategies.some(s => /Water:dry=Adapt/.test(s.signature)) || false,
    "First Bloom has distinct Drought, Flood and Humidify-based winning strategies",
    all.classes.filter(c => /Water/.test(c.signature)).map(c => c.signature.match(/Water:\S+/g).join("+")).filter((x, i, a) => a.indexOf(x) === i).join(" | "));
}

console.log(`\n${fails ? fails + " check(s) FAILED" : "ALL CHECKS PASS"}  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
process.exit(fails ? 1 : 0);
