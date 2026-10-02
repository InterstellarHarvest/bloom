// BLOOM — pressure-scenario validation layer (BLOOM-012). No DOM.
//
//   BLOOM.validateScenario(planet, config, traits, scenario, { archetypeId, minStrategies }) → verdict
//
// The archetype layers 1–8 (bloom-validate / bloom-archetype) keep validating the underlying EDEN planet; they say nothing
// about a pressure run. This separate layer ("layer P") proves that ONE planet + ONE scenario is a fair combination, using
// the same no-cheat witness machinery (resources/bloom-witness.js) with the scenario switched on:
//   · the static search estimates every build in the scenario's FINAL pressure state;
//   · every witness is a real engine run WITH the scenario: pressure advances on the real clock, purchases happen through
//     sim.buy() with Biomass earned under the real (pressured) economy, extinction loss is live — no immunity, no grants;
//   · a witness passes only if it reaches the planet's win threshold + config.validation.winMargin AND still holds the win
//     threshold scenario.validation.holdFinalSeconds after the final pressure state is reached;
//   · scenario.validation.minStrategies materially distinct broad strategies (layer-7 signatures) must pass, inside the
//     scenario's own pacing bands (scenario.validation.pacing; pressure runs are longer than Eden runs).
// Per-archetype policy is data: scenario.validation.archetypes[archetypeId] = { allowed: false, reason } rejects that
// combination explicitly (DISALLOWED) without a search. A scenario with no pressure (Eden) adds nothing to prove (EDEN).
// Statuses: PASS · FAIL · INCONCLUSIVE (a search cap was hit; never accepted) · DISALLOWED · EDEN.
(function (root) {
  "use strict";
  const BLOOM = root.BLOOM;
  if (!BLOOM || !BLOOM.findStrategies || !BLOOM.pressure) throw new Error("bloom-scenario.js needs bloom-sim.js and bloom-witness.js loaded first");

  function validateScenario(planet, config, traits, scenario, opts = {}) {
    const bad = BLOOM.pressure.checkScenario(scenario);
    if (bad.length) throw new Error(`scenario ${scenario && scenario.id}: ${bad.join("; ")}`);
    const S = scenario, V = S.validation || {}, base = { scenario: S.id, planet: planet.id, archetype: opts.archetypeId || null };
    if (!S.pressure) return { ...base, ok: true, status: "EDEN", reason: null, required: 0, strategies: [] };
    const policy = (V.archetypes || {})[opts.archetypeId];
    if (policy && policy.allowed === false) return { ...base, ok: false, status: "DISALLOWED", reason: `${S.name} is not offered on this archetype: ${policy.reason}`, required: 0, strategies: [] };
    const need = opts.minStrategies || V.minStrategies || 1, t0 = Date.now();
    const r = BLOOM.findStrategies(planet, config, traits, { minStrategies: need, pacing: V.pacing || null, scenario: S });
    const max = BLOOM.pressure.maxOffsets(S.pressure, planet.globalClimate);
    const pressure = { graceSeconds: S.pressure.graceSeconds, fullAtSeconds: S.pressure.graceSeconds + S.pressure.durationSeconds,
      maxOffsets: { temp: +max.temp.toFixed(2), moist: +max.moist.toFixed(2), rad: +max.rad.toFixed(2) }, holdFinalSeconds: V.holdFinalSeconds || 0 };
    return { ...base, ok: r.status === "PASS", status: r.status, reason: r.reason ? `layer P (${S.id}): ${r.reason}` : null, required: need,
      strategies: r.strategies || [], slow: r.slow || [], differences: r.differences || [], classes: r.classes || [], pressure,
      search: { ...r.search, ms: Date.now() - t0 }, layer: r.layer };
  }

  root.BLOOM.validateScenario = validateScenario;
  root.BLOOM.scenarioValidation = { validateScenario };
})(typeof window !== "undefined" ? window : globalThis);
