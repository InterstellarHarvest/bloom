// BLOOM-027B evidence: per-attempt production validation of an archetype over a seed range, to re-pick negative fixtures BY ROLE
// after the generator change (the same scan the earlier milestones ran by hand).
//   node docs/evidence/bloom-027b/fixture-scan.js <archetype-id> <seedFrom> <seedTo> <attempts> <out.json> [--all]
// By default a seed stops at its first accepted attempt (the production path); --all keeps validating the later attempts too
// (natural negatives production never reaches, e.g. a too-fast or purchase-gap world behind an accepted one).
// For every (seed, attempt): the archetype's structural reasons (exactly generateFromArchetype's), and when structurally accepted the
// full winnability verdict with the archetype's strategy policy (layer, status, reasons, classes, simulations), plus the plain witness
// layer when the policy run fails at 4–6. Deterministic; no Math.random.
"use strict";
const fs = require("fs"), path = require("path"), ROOT = path.resolve(__dirname, "../../..");
for (const f of ["content/config.js", "content/traits.js", "content/archetypes.js", "resources/bloom-sim.js", "resources/bloom-gen.js", "resources/bloom-validate.js", "resources/bloom-witness.js", "resources/bloom-archetype.js"]) require(path.join(ROOT, f));
const { BLOOM, BLOOM_DATA } = globalThis, { config, traits, archetypes } = BLOOM_DATA;
const ALL = process.argv.includes("--all"), [AID, FROM, TO, ATT, OUT] = process.argv.slice(2).filter(a => a !== "--all"), A = archetypes.find(a => a.id === AID), g = A.geography || {};
const policy = A.validation && (A.validation.minStrategies != null || A.validation.pacing) ? { minStrategies: A.validation.minStrategies || 1, pacing: A.validation.pacing || null } : null;
const rows = [], t0 = Date.now();
for (let seed = +FROM; seed <= +TO; seed++) {
  let acceptedAt = null;
  for (let k = 0; k < +ATT; k++) {
    const { planet, requestedWater } = BLOOM.archetype.attemptPlanet(A, seed, k);
    const v = BLOOM.validatePlanet(planet, config, { traits, regenerate: BLOOM.generatePlanet }), s = v.stats, why = [];
    if (!v.ok) why.push(...v.errors);
    if (s.waterPct !== undefined && Math.abs(s.waterPct - requestedWater) > A.water.tolerance) why.push(`water ${s.waterPct}% drifted > ${A.water.tolerance} from requested ${requestedWater}%`);
    if (g.minLandmasses && s.landmasses < g.minLandmasses) why.push(`${s.landmasses} landmass(es) < ${g.minLandmasses}`);
    const originShare = s.originLandmassTiles / s.landTiles;
    if (g.maxOriginLandmassShare != null && originShare > g.maxOriginLandmassShare) why.push(`origin landmass holds ${(originShare * 100).toFixed(1)}% of land > ${(g.maxOriginLandmassShare * 100).toFixed(0)}%`);
    if (g.maxLandmasses && s.landmasses > g.maxLandmasses) why.push(`${s.landmasses} landmasses > ${g.maxLandmasses}`);
    if (g.minOriginLandmassShare != null && originShare < g.minOriginLandmassShare) why.push(`origin landmass holds only ${(originShare * 100).toFixed(1)}% of land < ${(g.minOriginLandmassShare * 100).toFixed(0)}%`);
    if (!why.length && g.minOriginFitness != null) { const probe = BLOOM.createSim(planet, config, traits, { rng: () => 0.5 }), e = probe.evaluate(probe.map.ORIGIN);
      const raw = Object.values(e.cats).reduce((a, c) => a * c.f, 1); if (raw < g.minOriginFitness) why.push(`origin ${planet.sections.find(x => x.isOrigin).name} is not a refuge: its own fitness ${raw.toFixed(2)} < ${g.minOriginFitness} (limited by ${e.limitKey})`); }
    if (!why.length && g.minRefuges != null) { const probe = BLOOM.createSim(planet, config, traits, { rng: () => 0.5 }), M = probe.map;
      const n = M.SEC.filter((_, i) => i !== M.ORIGIN && probe.evaluate(i).fitness > config.categories.lamp.green).length; if (n < g.minRefuges) why.push(`only ${n} refuge region(s) besides the origin (green under the starting plant and sky) < ${g.minRefuges}`); }
    const row = { seed, attempt: k, name: planet.name, water: s.waterPct, landmasses: s.landmasses, structural: why.slice(0, 2), ok: false };
    if (!why.length) {
      const w = BLOOM.validatePlanet(planet, config, { traits, winnability: true, strategies: policy });
      const r = w.stats.strategies, first = w.stats.witness;
      row.verdict = { ok: w.ok, errors: w.errors.slice(0, 3), layer: r ? r.layer : (first && first.layer), status: r ? r.status : (w.ok ? "PASS" : "FAIL"),
        classes: r && r.classes ? r.classes.length : null, simulations: r && r.search ? r.search.simulations : null,
        layer7: r && r.layer7 ? r.layer7.status : null, layer8: r && r.layer8 ? r.layer8.status : null,
        strategies: r && r.strategies ? r.strategies.map(x => ({ sig: x.signature, margin: x.marginSeconds, first: x.pacing && x.pacing.firstPurchaseSeconds, gap: x.pacing && x.pacing.maxPurchaseGapSeconds, pacing: x.pacingCheck && x.pacingCheck.reasons })) : null,
        slow: r && r.slow ? r.slow.map(x => ({ sig: x.signature, reasons: x.pacingCheck && x.pacingCheck.reasons })) : null };
      if (!w.ok && r && r.layer >= 4 && r.layer <= 6) row.verdict.witnessLayer = r.layer;
      const req = A.validation && A.validation.requiredConditions;
      if (w.ok && req && r) for (const c of req) for (const x of r.strategies) if (!x.tokens.some(t => t.startsWith(c + "="))) { row.verdict.ok = false; row.verdict.errors.push(`layer 7 (archetype identity): strategy [${x.signature}] wins without answering ${c}`); }
      row.ok = row.verdict.ok;
    }
    rows.push(row);
    if (row.ok && acceptedAt === null) { acceptedAt = k; if (!ALL) break; }
  }
  rows.push({ seed, acceptedAttempt: acceptedAt, summary: true });
  if ((seed - FROM) % 5 === 4) { fs.writeFileSync(OUT, JSON.stringify({ archetype: AID, range: [+FROM, +TO], attempts: +ATT, ms: Date.now() - t0, rows }, null, 1)); console.error(`${AID} seed ${seed} done (${((Date.now() - t0) / 1000) | 0} s)`); }
}
fs.writeFileSync(OUT, JSON.stringify({ archetype: AID, range: [+FROM, +TO], attempts: +ATT, ms: Date.now() - t0, rows }, null, 1));
console.log(`${AID} ${FROM}–${TO} × ${ATT}: ${rows.filter(r => r.summary && r.acceptedAttempt !== null).length} accepted, ${rows.filter(r => r.summary && r.acceptedAttempt === null).length} failed, ${((Date.now() - t0) / 1000) | 0} s`);
