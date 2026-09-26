// BLOOM — tuning configuration (GAME_BIBLE §15, invariant 11: rates, costs,
// thresholds, scales and category boundaries live here, not in engine code).
// Classic script (not JSON + fetch) so it loads over file:// with no fallback copy.
// Values are the accepted First Bloom slice balance (2026-09-26 tuning pass).
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
    grow: { growThresh: 0.55, dieThresh: 0.35, baseFill: 0.03, seedPerNeighbor: 0.34, maturity: 0.45, seedTiles: 30,
            originStartVigor: 0.7, immatureGate: 0.4, seedOutPerLevel: 0.6, maturityPerEarlyLevel: 0.12 },
    die: { rate: 0.06, damping: 0.5, slope: 4 },
    recover: { deadToBarren: 0.02 },
    vigorEase: 0.20,

    // biomass economy (bible §8). bubbleChance is planet-wide per tick (~1 per 14 s while anything thrives)
    econ: { thriving: 0.0004, marginal: 0.00012, thrivingAbove: 0.7, originTrickle: 0.08, startBiomass: 40,
            bubbleChance: 0.011, bubbleValue: 25, bubbleAutoTicks: 60, autoCollectShare: 0.5,
            bubbleFitAbove: 0.72, bubbleMinLiving: 8, costScale: 5 },
  };
})(typeof window !== "undefined" ? window : globalThis);
