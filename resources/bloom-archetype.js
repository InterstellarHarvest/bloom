// BLOOM — archetype generation: deterministic generate → check → retry (BLOOM-005). No DOM.
//
//   BLOOM.generateFromArchetype(archetype, publicSeed, { config, traits, winnability }) → planet (ordinary planet model)
//
// Attempt k (0 ≤ k < archetype.generation.maxAttempts) uses generationSeed = FNV-1a("<id>|<publicSeed>|<k>"),
// and draws its section count and requested water % from mulberry32(generationSeed) — no Math.random.
// An attempt is ACCEPTED only if, all at once:
//   · the structural + reachability validator passes (strongest Spread reaches every section);
//   · |actual water − requested water| ≤ water.tolerance (drowning out-of-range islands can't drift it);
//   · landmasses ≥ geography.minLandmasses and origin-landmass share ≤ geography.maxOriginLandmassShare;
//   · (BLOOM-010, each optional) landmasses ≤ geography.maxLandmasses, origin-landmass share ≥ geography.minOriginLandmassShare
//     (a mostly contiguous world), and the origin's OWN fitness — before the engine's protected-refuge floor, under the
//     starting genome and sky — ≥ geography.minOriginFitness (the home region is a genuine refuge, not just protected);
//   · (BLOOM-011, optional) at least geography.minRefuges OTHER regions are green (fitness above the green lamp) under the
//     starting genome and sky — a world with several refuges, not one safe home surrounded by instant death;
//   · (BLOOM-010, optional) every proven layer-7 strategy answers each of validation.requiredConditions (e.g. "Water:dry":
//     a Desert World's identity is its water problem, the way crossing is an Ocean Archipelago's);
//   · if archetype.validation.winnable: bible §10.3 layers 4–6 (a real no-cheat witness wins with margin;
//     needs resources/bloom-witness.js), and — when the archetype sets minStrategies / pacing — layers 7–8
//     (that many materially distinct broad strategies win with margin inside the pacing time bands; only a
//     PASS is accepted, INCONCLUSIVE is a rejection). Pass { winnability: false } for structure-only diagnostics.
// The first accepted attempt wins; `planet.archetype` records which one (and its witness summary). If
// none is accepted, it throws with every attempt's reasons — it never returns a bad planet.
(function (root) {
  "use strict";
  const BLOOM = root.BLOOM;
  if (!BLOOM || !BLOOM.generatePlanet || !BLOOM.validatePlanet) throw new Error("bloom-archetype.js needs bloom-sim, bloom-gen and bloom-validate loaded first");

  function fnv1a(str) { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; }

  function checkArchetype(a, config) {
    const e = [];
    if (!a || typeof a.id !== "string" || !a.id) e.push("id missing");
    if (!a.name) e.push("name missing");
    const r2 = (v, lo, hi) => Array.isArray(v) && v.length === 2 && v[0] <= v[1] && v[0] >= lo && v[1] <= hi;
    if (!r2(a.sections, 1, 24)) e.push("sections must be [min,max] within 1..24");
    if (!a.water || !(a.water.min >= 0 && a.water.max <= 90 && a.water.min <= a.water.max) || !(a.water.tolerance > 0)) e.push("water needs min ≤ max within 0..90 and tolerance > 0");
    if (a.climate) for (const k of Object.keys(a.climate)) if (!(k in BLOOM.gen.CLIMATE_DEFAULTS)) e.push(`unknown climate key ${k}`);
    if (a.naming != null) { const pools = ["cold", "mild", "warm", "hot", "wet", "dry", "noun"];
      if (typeof a.naming !== "object" || Array.isArray(a.naming)) e.push("naming must be an object of word pools");
      else for (const [k, v] of Object.entries(a.naming)) if (!pools.includes(k) || !(Array.isArray(v) && v.length && v.every(w => typeof w === "string" && w)))
        e.push(`naming.${k} must be one of ${pools.join("/")} with a non-empty list of words`); }
    if (a.render != null) { const rgb = c => Array.isArray(c) && c.length === 3 && c.every(v => Number.isFinite(v) && v >= 0 && v <= 255), R = a.render;
      if (typeof R !== "object" || Array.isArray(R) || ["ground", "water", "waterAlt"].some(k => R[k] != null && !rgb(R[k])) ||
        (R.ground != null && !(R.groundMix >= 0 && R.groundMix <= 1)) || ["dunes", "frost"].some(k => R[k] != null && typeof R[k] !== "boolean") ||
        (R.tintBy != null && !["dry", "cold"].includes(R.tintBy)))
        e.push("render must be { ground?/water?/waterAlt?: [r,g,b] 0..255, groundMix 0..1 with ground, tintBy?: \"dry\"|\"cold\", dunes?/frost?: boolean }"); }
    const g = a.geography || {};
    if (g.maxCrossingGap != null && !(g.maxCrossingGap >= 1 && g.maxCrossingGap <= ((config.crossing || {}).maxGap || 0)))
      e.push("geography.maxCrossingGap must be 1..config.crossing.maxGap (islands must stay in Waterborne Seeds range)");
    if (g.minOriginFitness != null && !(g.minOriginFitness > 0 && g.minOriginFitness <= 1)) e.push("geography.minOriginFitness must be in (0, 1]");
    if (g.maxLandmasses != null && !(Number.isInteger(g.maxLandmasses) && g.maxLandmasses >= 1)) e.push("geography.maxLandmasses must be a positive integer");
    if (g.minRefuges != null && !(Number.isInteger(g.minRefuges) && g.minRefuges >= 0)) e.push("geography.minRefuges must be a non-negative integer");
    if (g.minOriginLandmassShare != null && !(g.minOriginLandmassShare > 0 && g.minOriginLandmassShare <= 1)) e.push("geography.minOriginLandmassShare must be in (0, 1]");
    if (!(a.generation && a.generation.maxAttempts >= 1 && a.generation.maxAttempts <= 64)) e.push("generation.maxAttempts must be 1..64");
    if (a.validation && a.validation.crossingRequiredToWin && !(g.maxOriginLandmassShare < config.win))
      e.push("validation.crossingRequiredToWin needs geography.maxOriginLandmassShare < the win threshold");
    const v = a.validation || {}, P = v.pacing;
    if ((v.minStrategies != null || P) && !v.winnable) e.push("validation.minStrategies / pacing need validation.winnable");
    if (v.requiredConditions != null && !(Array.isArray(v.requiredConditions) && v.requiredConditions.length && v.minStrategies != null
      && v.requiredConditions.every(c => /^(Temperature|Water|Defense|Crossing):[a-z]+$/i.test(c))))
      e.push("validation.requiredConditions must be a non-empty list of signature conditions (e.g. \"Water:dry\") and needs minStrategies");
    if (v.minStrategies != null && !(Number.isInteger(v.minStrategies) && v.minStrategies >= 1 && v.minStrategies <= 4)) e.push("validation.minStrategies must be an integer 1..4");
    if (P) {
      const band = x => Array.isArray(x) && x.length === 2 && x[0] >= 0 && x[0] < x[1];
      if (!band(P.marginSeconds) || !band(P.firstPurchaseSeconds)) e.push("validation.pacing marginSeconds / firstPurchaseSeconds must be [min, max] with 0 ≤ min < max");
      if (!(P.maxPurchaseGapSeconds > 0)) e.push("validation.pacing.maxPurchaseGapSeconds must be > 0");
      if (P.maxTerminalWaitSeconds != null && !(P.maxTerminalWaitSeconds > 0)) e.push("validation.pacing.maxTerminalWaitSeconds must be > 0");
      if (band(P.marginSeconds) && P.marginSeconds[1] * 1000 / config.tickMs > config.validation.maxTicks) e.push("validation.pacing.marginSeconds max exceeds the witness time budget (config.validation.maxTicks)");
    }
    return e;
  }

  // attempt k's raw planet for an archetype + public seed (before any validation) — the deterministic unit
  // generateFromArchetype retries over; exposed so fixtures/diagnostics can address one attempt directly
  // (BLOOM-035B) WORLD_GEN_VERSION: the version of the world a (archetype, public seed) pair names — this generator, its acceptance
  // rules and the reference physiology they read (config.referencePlant). A World Seed names ONE physical planet per version, whatever
  // species the player brings. Changing config.referencePlant (or anything else that changes accepted worlds) is a deliberate bump.
  const WORLD_GEN_VERSION = 1;

  function attemptPlanet(A, publicSeed, k) {
    const g = A.geography || {}, seed = publicSeed >>> 0;
    const generationSeed = fnv1a(`${A.id}|${seed}|${k}`), r = BLOOM.gen.mulberry32(generationSeed ^ 0x5eed5eed);
    const sections = A.sections[0] + ((r() * (A.sections[1] - A.sections[0] + 1)) | 0);
    const requestedWater = Math.round(A.water.min + r() * (A.water.max - A.water.min));
    const planet = BLOOM.generatePlanet({ seed: generationSeed, waterPct: requestedWater, sections,
      minLandmassTiles: g.minLandmassTiles, maxCrossingGap: g.maxCrossingGap ?? null,
      ...(g.terrainWeights ? { terrainWeights: g.terrainWeights } : {}), ...(A.naming ? { names: A.naming } : {}), climate: A.climate });
    return { planet, generationSeed, sections, requestedWater };
  }

  // (BLOOM-035B) WORLD CONSTRUCTION IS SPECIES-FREE: every probe below (origin refuge, refuges, the layer 4–8 witness and the
  // archetype's requiredConditions) runs on the reference physiology, config.referencePlant — createSim / validatePlanet are called
  // WITHOUT a species. A species can only accept or reject a finished world (BLOOM.species.validateFor), never shape one, so a
  // `species` (or a physiology) passed here is refused: one (archetype, seed, WORLD_GEN_VERSION) = one physical planet.
  const SPECIES_FREE = ["species", "speciesId", "physiology", "referencePlant"];
  function generateFromArchetype(archetype, publicSeed, opts = {}) {
    const refused = Object.keys(opts || {}).filter(k => SPECIES_FREE.includes(k));
    if (refused.length) throw new Error(`generateFromArchetype: world construction is species-free — "${refused.join("\", \"")}" is refused (a World Seed names one physical planet for every species; evaluate a species on the finished world with BLOOM.species.validateFor)`);
    const { config, traits, winnability } = opts || {};
    if (!config || !traits) throw new Error("generateFromArchetype: pass { config, traits }");
    const bad = checkArchetype(archetype, config);
    if (bad.length) throw new Error(`archetype ${archetype && archetype.id}: ${bad.join("; ")}`);
    if (!Number.isFinite(publicSeed)) throw new Error("generateFromArchetype: an explicit numeric seed is required");
    const A = archetype, g = A.geography || {}, seed = publicSeed >>> 0, attempts = [];
    const needWin = !!(A.validation && A.validation.winnable) && winnability !== false;
    if (needWin && !BLOOM.findWitness) throw new Error("generateFromArchetype: archetype requires winnability — load resources/bloom-witness.js");
    for (let k = 0; k < A.generation.maxAttempts; k++) {
      const { planet, generationSeed, sections, requestedWater } = attemptPlanet(A, seed, k);
      const v = BLOOM.validatePlanet(planet, config, { traits, regenerate: BLOOM.generatePlanet }), s = v.stats, why = [];
      if (!v.ok) why.push(...v.errors);
      if (s.waterPct !== undefined && Math.abs(s.waterPct - requestedWater) > A.water.tolerance) why.push(`water ${s.waterPct}% drifted > ${A.water.tolerance} from requested ${requestedWater}%`);
      if (g.minLandmasses && s.landmasses < g.minLandmasses) why.push(`${s.landmasses} landmass(es) < ${g.minLandmasses}`);
      const originShare = s.originLandmassTiles / s.landTiles;
      if (g.maxOriginLandmassShare != null && originShare > g.maxOriginLandmassShare) why.push(`origin landmass holds ${(originShare * 100).toFixed(1)}% of land > ${(g.maxOriginLandmassShare * 100).toFixed(0)}%`);
      if (g.maxLandmasses && s.landmasses > g.maxLandmasses) why.push(`${s.landmasses} landmasses > ${g.maxLandmasses}`);
      if (g.minOriginLandmassShare != null && originShare < g.minOriginLandmassShare) why.push(`origin landmass holds only ${(originShare * 100).toFixed(1)}% of land < ${(g.minOriginLandmassShare * 100).toFixed(0)}%`);
      if (!why.length && g.minOriginFitness != null) { // layer 2 tightened per archetype: the origin must be a real refuge
        const probe = BLOOM.createSim(planet, config, traits, { rng: () => 0.5 }), e = probe.evaluate(probe.map.ORIGIN);
        const raw = Object.values(e.cats).reduce((a, c) => a * c.f, 1); // its own conditions, before the protected-refuge floor
        if (raw < g.minOriginFitness) why.push(`origin ${planet.sections.find(x => x.isOrigin).name} is not a refuge: its own fitness ${raw.toFixed(2)} < ${g.minOriginFitness} (limited by ${e.limitKey})`);
      }
      if (!why.length && g.minRefuges != null) { // (BLOOM-011) not one safe home surrounded by instant death: other green regions
        const probe = BLOOM.createSim(planet, config, traits, { rng: () => 0.5 }), M = probe.map;
        const n = M.SEC.filter((_, i) => i !== M.ORIGIN && probe.evaluate(i).fitness > config.categories.lamp.green).length;
        if (n < g.minRefuges) why.push(`only ${n} refuge region(s) besides the origin (green under the starting plant and sky) < ${g.minRefuges}`);
      }
      let witness = null, strategies = null;
      const policy = A.validation && (A.validation.minStrategies != null || A.validation.pacing)
        ? { minStrategies: A.validation.minStrategies || 1, pacing: A.validation.pacing || null } : null;
      if (!why.length && needWin) { // only structurally acceptable attempts pay for the (costlier) witness search
        const w = BLOOM.validatePlanet(planet, config, { traits, winnability: true, strategies: policy });
        if (!w.ok) why.push(...w.errors); else { witness = w.stats.witness.witness; strategies = w.stats.strategies || null; }
        // the archetype's defining problem (BLOOM-010): every proven strategy must answer these conditions somehow
        for (const c of (strategies && A.validation.requiredConditions) || [])
          for (const x of strategies.strategies) if (!x.tokens.some(t => t.startsWith(c + "=")))
            why.push(`layer 7 (archetype identity): strategy [${x.signature}] wins without answering ${c}`);
      }
      attempts.push({ attempt: k, generationSeed, sections, requestedWater, actualWater: s.waterPct, landmasses: s.landmasses, rejected: why });
      if (!why.length) {
        planet.archetype = { id: A.id, name: A.name, publicSeed: seed, attempt: k, generationSeed, requestedWaterPct: requestedWater,
          actualWaterPct: s.waterPct, landmasses: s.landmasses, originLandmassShare: +originShare.toFixed(3), winnabilityChecked: needWin,
          validatedLayers: needWin ? (policy ? [1, 2, 3, 4, 5, 6, 7, 8] : [1, 2, 3, 4, 5, 6]) : [1, 2, 3],
          witness: witness && { purchases: witness.purchases.map(p => [p.id, p.tick]), totalSpent: witness.totalSpent,
            usedCrossing: witness.usedCrossing, winTick: witness.winTick, marginTick: witness.marginTick, target: witness.target },
          strategies: strategies && { required: strategies.required, found: strategies.strategies.length, early: strategies.early,
            list: strategies.strategies.map(x => ({ signature: x.signature, minimalBuild: x.minimalBuild, purchases: x.purchases.map(p => [p.id, p.seconds]),
              winSeconds: x.winSeconds, marginSeconds: x.marginSeconds, firstPurchaseSeconds: x.pacing.firstPurchaseSeconds,
              maxPurchaseGapSeconds: x.pacing.maxPurchaseGapSeconds, terminalWaitSeconds: x.pacing.terminalWaitSeconds })),
            differences: strategies.differences.map(d => ({ onlyA: d.onlyA, onlyB: d.onlyB, heldOnlyA: d.heldOnlyA, heldOnlyB: d.heldOnlyB })) },
          rejectedAttempts: attempts.slice(0, k) };
        return planet;
      }
    }
    const err = new Error(`archetype ${A.id} seed ${seed}: no acceptable world in ${A.generation.maxAttempts} attempts — ` +
      attempts.map(a => `#${a.attempt}: ${a.rejected[0]}`).join(" | "));
    err.attempts = attempts; throw err;
  }

  root.BLOOM.generateFromArchetype = generateFromArchetype;
  root.BLOOM.archetype = { WORLD_GEN_VERSION, generateFromArchetype, attemptPlanet, checkArchetype, fnv1a };
})(typeof window !== "undefined" ? window : globalThis);
