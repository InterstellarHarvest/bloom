// BLOOM — pressure-scenario validation layer (BLOOM-012). No DOM.
//
//   BLOOM.validateScenario(planet, config, traits, scenario, { archetypeId, minStrategies }) → verdict
//
// The archetype layers 1–8 (bloom-validate / bloom-archetype) keep validating the underlying DEFAULT-scenario planet; they say nothing
// about a pressure run. This separate layer ("layer P") proves that ONE planet + ONE scenario is a fair combination, using
// the same no-cheat witness machinery (resources/bloom-witness.js) with the scenario switched on:
//   · the static search estimates every build in the scenario's FINAL pressure state;
//   · every witness is a real engine run WITH the scenario: pressure advances on the real clock, purchases happen through
//     sim.buy() with Biomass earned under the real (pressured) economy, extinction loss is live — no immunity, no grants;
//   · a witness passes only if it reaches the planet's win threshold + config.validation.winMargin AND still holds the win
//     threshold scenario.validation.holdFinalSeconds after the final pressure state is reached;
//   · scenario.validation.minStrategies materially distinct broad strategies (layer-7 signatures) must pass, inside the
//     scenario's own pacing bands (scenario.validation.pacing; pressure runs are longer than default runs).
// Per-archetype policy is data: scenario.validation.archetypes[archetypeId] = { allowed: false, reason } rejects that
// combination explicitly (DISALLOWED) without a search. A scenario with no pressure (the default) adds nothing to prove (DEFAULT).
// Statuses: PASS · FAIL · INCONCLUSIVE (a search cap was hit; never accepted) · DISALLOWED · DEFAULT.
// BLOOM-014: the same layer validates a responsive COMPETITION scenario (scenario.competition, no clock): a default-scenario witness
// proves nothing there either. Every witness runs the real competitor (established native cover, live spread / contest /
// recession), earns all its Biomass, survives extinction, reaches the margin and must still hold the win threshold
// holdFinalSeconds after it — and, with validation.confirmRngSeeds, do all of that again under each extra simulation seed.
// There is no fake "final native state": the static stage only ranks builds by where an established colony would beat mature
// native cover (bloom-witness.js); the verdict is the simulation's.
// BLOOM-015: likewise a CLIMATE-INSTABILITY scenario (scenario.climateInstability): every witness's own Terraform purchases
// unsettle the climate live, its shocks run in the real engine, and it must hold the win threshold holdFinalSeconds after the
// later of its margin and its last shock; a Terraform-heavy witness counts only with real shocks behind it
// (validation.mechanicEvidence). No shock is ever injected for the validator.
(function (root) {
  "use strict";
  const BLOOM = root.BLOOM;
  if (!BLOOM || !BLOOM.findStrategies || !BLOOM.pressure) throw new Error("bloom-scenario.js needs bloom-sim.js and bloom-witness.js loaded first");

  function validateScenario(planet, config, traits, scenario, opts = {}) {
    const bad = BLOOM.pressure.checkScenario(scenario);
    if (bad.length) throw new Error(`scenario ${scenario && scenario.id}: ${bad.join("; ")}`);
    const S = scenario, V = S.validation || {}, base = { scenario: S.id, planet: planet.id, archetype: opts.archetypeId || null };
    if (!BLOOM.pressure.isDynamic(S)) return { ...base, ok: true, status: "DEFAULT", reason: null, required: 0, strategies: [] };
    const policy = (V.archetypes || {})[opts.archetypeId];
    if (policy && policy.allowed === false) return { ...base, ok: false, status: "DISALLOWED", reason: `${S.name} is not offered on this archetype: ${policy.reason}`, required: 0, strategies: [] };
    const need = opts.minStrategies || V.minStrategies || 1, t0 = Date.now();
    const r = BLOOM.findStrategies(planet, config, traits, { minStrategies: need, pacing: V.pacing || null, scenario: S });
    const max = BLOOM.pressure.maxOffsets(S.pressure, planet.globalClimate);
    const pressure = S.pressure ? { graceSeconds: S.pressure.graceSeconds, fullAtSeconds: S.pressure.graceSeconds + S.pressure.durationSeconds,
      maxOffsets: { temp: +max.temp.toFixed(2), moist: +max.moist.toFixed(2), rad: +max.rad.toFixed(2) }, holdFinalSeconds: V.holdFinalSeconds || 0 } : null;
    // competition (BLOOM-014): the competitor's starting state on this planet (planet-derived, so the same for every run)
    let competition = null;
    if (S.competition) { const probe = BLOOM.createSim(planet, config, traits, { rng: () => 0.5, scenario: S }), C = probe.competition;
      competition = { startShare: +C.startShare.toFixed(4), startTiles: C.tiles, holdAfterMarginSeconds: V.holdFinalSeconds || 0, confirmRngSeeds: V.confirmRngSeeds || [] }; }
    // climate instability (BLOOM-015): the mechanism's thresholds (the shocks themselves are each witness's own, in strategies[].climate)
    const climate = S.climateInstability ? { threshold: S.climateInstability.shocks.threshold, holdAfterShockSeconds: V.holdFinalSeconds || 0,
      mechanicEvidence: V.mechanicEvidence || null, confirmRngSeeds: V.confirmRngSeeds || [] } : null;
    return { ...base, ok: r.status === "PASS", status: r.status, reason: r.reason ? `layer P (${S.id}): ${r.reason}` : null, required: need,
      strategies: r.strategies || [], slow: r.slow || [], differences: r.differences || [], classes: r.classes || [], pressure, competition, climate,
      search: { ...r.search, ms: Date.now() - t0 }, layer: r.layer };
  }

  root.BLOOM.validateScenario = validateScenario;
  root.BLOOM.scenarioValidation = { validateScenario };
})(typeof window !== "undefined" ? window : globalThis);
