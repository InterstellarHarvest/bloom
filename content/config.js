// BLOOM — tuning configuration (GAME_BIBLE §15, invariant 11: rates, costs,
// thresholds, scales and category boundaries live here, not in engine code).
// Classic script (not JSON + fetch) so it loads over file:// with no fallback copy.
// Values are the accepted First Bloom slice balance (2026-09-26 tuning pass), retuned since by owner-authorized passes
// (BLOOM-008/009 growth, BLOOM-013 economy).
(function (root) {
  "use strict";
  const D = root.BLOOM_DATA || (root.BLOOM_DATA = { planets: {} });
  D.config = {
    tickMs: 160,
    win: 0.70,                      // default simultaneous-coverage win; a planet may override with winThreshold

    // section layout: weighted Voronoi from per-section `center` seeds
    layout: { iterations: 40, weightRate: 0.010, weightCap: 7, stopWithinTiles: 4 },

    // trait points → environmental tolerance (bible trait effects are unit points)
    scales: { degPerTempPoint: 12, tempCap: 3, waterShiftPerPt: 20, waterTolPerPt: 5, saltPerPt: 70, radPerPt: 30 },
    genomeBase: { tempFloor: -6, tempCeil: 24, waterPos: 50, waterTol: 18, saltTol: 15, radTol: 30, toxTol: 25 },

    // raw signals → the four player-facing categories (bible §5)
    categories: {
      lamp: { green: 0.72, yellow: 0.30 },   // factor > green → green; > yellow → yellow; else red
      blockedBelow: 0.72,                    // limiting factor is shown as "growth blocked" under this
      originFitnessFloor: 0.62,              // protected refuge (invariant 1)
      Temperature: { soft: 10, freezingBeyond: 6, coldWithin: 4, scorchingBeyond: 6, hotWithin: 4, terraformable: true },
      Water:       { soft: 12, parchedBeyond: 14, dryWithin: 4, floodedBeyond: 14, wetWithin: 4, terraformable: true },
      Soil: { saltSoft: 26, phMin: 5, phMax: 8.5, phSoft: 1.2, hostileBelow: 0.4, workableBelow: 0.85,
              nutrientFloor: 35, nutrientMinMod: 0.55, poorBelowMod: 0.85, terraformable: false },
      Hazard: { radSoft: 20, toxSoft: 26, lethalBelow: 0.3, dangerousBelow: 0.7, stressfulBelow: 0.95, terraformable: false },
      light: { reference: 70, minMod: 0.45, maxMod: 1.15 },  // light = growth modifier, not a gate
    },

    // spread / die-back / recovery
    // maturity = the section ESTABLISHMENT (see establish) at which a colony seeds outward at full strength; below it
    // seed output ramps up from youngSeedShare. Early Maturity lowers the mark by maturityPerEarlyLevel per level.
    grow: { growThresh: 0.55, dieThresh: 0.35, baseFill: 0.034, seedPerNeighbor: 0.34, maturity: 0.45, seedTiles: 30,
            originStartVigor: 0.7, youngSeedShare: 0.4, seedOutPerLevel: 0.6, maturityPerEarlyLevel: 0.12 },
    // colony establishment (BLOOM-008; start density lowered and curve retuned by BLOOM-009). A newly Living tile is a
    // tiny seedling stand (seedlingDensity) that thickens toward 1 at `rate` × soil/light growth modifier × vigor while its
    // section can grow, holds in the marginal band, and thins (never below minDensity) under lethal conditions.
    // Section establishment = Σ stand density / area. `status` bands turn it into the inspect panel's colony word.
    establish: { seedlingDensity: 0.05, minDensity: 0.03, rate: 0.0025, thinning: 0.01,
                 status: { establishing: 0.12, established: 0.4, dense: 0.75 } },
    // Colony development (BLOOM-009; replaces BLOOM-008's single global Colony Focus). EVERY Living region keeps its own
    // growth allocation — "balanced" (the default, no modifiers) or one of `modes` — and may own ONE local specialization,
    // bought with ordinary Biomass. Both belong to the region: they persist while other regions change, through die-back,
    // and through total loss (dormant while nothing lives there, active again when the region is recolonized).
    // An allocation REDISTRIBUTES a colony's sugar budget, so each mode has a benefit and a cost (fractions, +0.6 = 60%):
    //   roots:  establishBonus (stands thicken faster), marginalEstablish (stands still thicken, slowly, in the marginal
    //           band where they would otherwise only hold), dieBackCut / thinningCut (less die-back and thinning under
    //           stress) — the protective parts only where section fitness > protectAbove (never red, blocked ground);
    //           yieldCost (sugar goes below ground, not into surplus Biomass)
    //   leaves: yieldBonus — more Biomass, ramping from 0 on bare seedlings to the full bonus once the colony's
    //           establishment reaches yieldRampTo (leaf area needs an established stand); seedCost (fewer seeds)
    //   seeds:  seedBonus (stronger outward spread), crossingBonus (stronger Waterborne source pressure); yieldCost
    // A specialization adds its `effect` (same keys, never a cost) whatever the allocation; when the region's allocation
    // matches the specialization's `mode` its effect is scaled by (1 + synergy). Each key is then capped by `caps`.
    // Price = round((specCost.base + specCost.step × specializations already bought anywhere) × econ.costScale).
    // Nothing here changes fitness, tolerances or the grow/die thresholds: destination ground still decides establishment.
    colony: { protectAbove: 0.30, yieldRampTo: 0.75,
              modes: { roots:  { establishBonus: 1.5, marginalEstablish: 0.4, dieBackCut: 0.5, thinningCut: 0.5, yieldCost: 0.1 },
                       leaves: { yieldBonus: 0.5, seedCost: 0.4 },
                       seeds:  { seedBonus: 0.6, crossingBonus: 0.6, yieldCost: 0.3 } },
              specializations: {
                rootNetwork: { name: "Root Network", mode: "roots",  effect: { establishBonus: 2, marginalEstablish: 0.4, dieBackCut: 0.3, thinningCut: 0.3, recoverBonus: 2 } },
                leafCanopy:  { name: "Leaf Canopy",  mode: "leaves", effect: { yieldBonus: 0.5 } },
                seedReserve: { name: "Seed Reserve", mode: "seeds",  effect: { seedBonus: 0.4, crossingBonus: 0.8 } } },
              specCost: { base: 18, step: 8 }, synergy: 0.25,
              caps: { establishBonus: 3, marginalEstablish: 0.8, dieBackCut: 0.75, thinningCut: 0.75, recoverBonus: 3,
                      yieldBonus: 1.2, seedBonus: 1.2, crossingBonus: 1.6, yieldCost: 0.9, seedCost: 0.9 } },
    die: { rate: 0.06, damping: 0.5, slope: 4 },
    recover: { deadToBarren: 0.02 },
    vigorEase: 0.20,

    // water crossing (bible §9, BLOOM-004), used only once a `crossing` trait (Waterborne Seeds) is owned.
    // A landing tile on another landmass within maxGap water tiles of a Living coastal tile gets seed
    // pressure Σ chancePerSource × gapFalloff^(gap−1); it establishes under the ordinary grow rule.
    // arrivalUnit (BLOOM-009): every `arrivalUnit` of seed pressure accumulated on a landing tile is reported as one seed
    // ARRIVAL event (sim.crossing.events, for the map's crossing feedback); it draws no randomness and changes no outcome.
    crossing: { maxGap: 6, chancePerSource: 0.0005, gapFalloff: 0.7, arrivalUnit: 0.5 },

    // procedural winnability validation (bible §10.3 layers 4–6, BLOOM-005). Validation policy only —
    // the player still wins at the planet's winThreshold. A planet passes when a real, no-cheat witness
    // run (earned Biomass, sim.buy) holds winThreshold + winMargin of the land alive at once.
    validation: {
      winMargin: 0.03,          // witness must reach e.g. 0.70 + 0.03 = 0.73 simultaneous living coverage
      rngSeed: 20260926,        // fixed sim RNG for witness runs → deterministic verdicts
      maxTicks: 12000,          // witness time budget per simulation (~32 game-minutes at 160 ms/tick)
      plateauTicks: 2000,       // stop a finished-buying witness that stops growing for this long
      maxStaticStates: 20000,   // hard cap on enumerated terminal builds (diagnosed if hit)
      maxSimulations: 16,       // hard cap on witness simulations per planet
      maxWaterPts: 2,           // water-strategy levels the solver considers (0..2)
      maxSkySteps: 2,           // Terraform steps per sky axis the solver considers (0..2)
      // strategy diversity + pacing search (bible §10.3 layers 7–8, BLOOM-006): candidate builds grouped by
      // strategy signature; ≤ maxBuildsPerClass cheapest builds per signature (each under every Spread opening),
      // ≤ maxSimulations real runs in all. A cap reached before a verdict makes the result INCONCLUSIVE.
      diversity: { maxSimulations: 40, maxBuildsPerClass: 2 },
    },

    // biomass economy (bible §8). bubbleChance is planet-wide per tick (~1 per 14 s while anything thrives)
    // youngYield (BLOOM-008): Biomass share a fresh seedling stand yields vs a fully established one; the origin's
    // trickle is the home colony's own production and follows its establishment the same way
    // BLOOM-013 (owner-authorized retune; docs/ECONOMY_v1.md): startBiomass 40 → 100 (the run opens with one decision — a
    // local upgrade for the origin now, or the first global upgrade ~30 s later — never a strategy) and originTrickle
    // 0.1 → 0.3 (the home colony pays for the opening, so a player who ignores bubbles still reaches a first global upgrade
    // in ~30 s and the next ones every ~30–90 s). Every price, yield and bubble value is unchanged.
    econ: { thriving: 0.0004, marginal: 0.00012, thrivingAbove: 0.7, originTrickle: 0.3, startBiomass: 100, youngYield: 0.45,
            bubbleChance: 0.011, bubbleValue: 25, bubbleAutoTicks: 60, autoCollectShare: 0.5,
            bubbleFitAbove: 0.72, bubbleMinLiving: 8, costScale: 5 },
  };
})(typeof window !== "undefined" ? window : globalThis);
