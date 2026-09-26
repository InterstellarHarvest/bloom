// BLOOM — planet archetypes (bible §10.1), as data. BLOOM-005.
// An archetype is design intent, not code: it picks generator parameters and states what a world of
// this kind must look like. BLOOM.generateFromArchetype (resources/bloom-archetype.js) turns an
// archetype + public seed into ONE ordinary planet (same model as First Bloom), deterministically.
//
//   sections        [min, max] section count, drawn per attempt
//   water           requested water % drawn from [min, max]; the ACCEPTED planet's actual water must be
//                   within `tolerance` points of the request (drowning out-of-range islands can't drift it)
//   climate         BLOOM.generatePlanet climate knobs (see CLIMATE_DEFAULTS in bloom-gen.js)
//   geography       terrainWeights (generator octave mix), minLandmassTiles, maxCrossingGap (≤ config.crossing.maxGap), minLandmasses,
//                   maxOriginLandmassShare (origin landmass / all land; < 0.70 means ordinary spread
//                   alone can never win → a crossing strategy is required)
//   generation      maxAttempts for the deterministic retry loop
//   validation      what a finished world of this archetype must pass (winnable → bible §10.3 layers 4–6;
//                   minStrategies → layer 7 strategy diversity; pacing → layer 8 time bands)
(function (root) {
  "use strict";
  const D = root.BLOOM_DATA || (root.BLOOM_DATA = { planets: {} });
  D.archetypes = [
    {
      id: "ocean_archipelago", name: "Ocean Archipelago",
      intent: "Fragmented, moist island world: no single island holds enough land to win, so the plant must cross water — and each island still asks its own adaptation questions.",
      sections: [12, 18],
      water: { min: 55, max: 68, tolerance: 5 },
      // maritime climate: the ocean evens out temperature (smaller pole-to-equator swing than the default
      // generator) and keeps the air humid; coasts get sea-salt spray, so coastal soils are more often saline
      climate: { temperature: 8, moisture: 54, tempBase: -18, tempSpan: 44, tempJitter: 8,
        moistureSpread: 60, moistureBias: 4, coastMoisture: 14, volcanicChance: 0.06,
        coastalSaltAbove: 0.35, coastalSaltChance: 0.55, saltChance: 0.05 },
      // terrainWeights favour regional/local landforms over one continent → many nearer islands
      geography: { terrainWeights: [0.5, 0.7, 1], minLandmassTiles: 16, maxCrossingGap: 5, minLandmasses: 3, maxOriginLandmassShare: 0.62 },
      generation: { maxAttempts: 24 },
      // layers 7–8 (BLOOM-006): ≥ 2 materially distinct broad strategies must win with margin AND keep pace.
      // Pacing bands are provisional validator hypotheses for a perfect-knowledge witness (a person is slower;
      // the bible's session target is 10–20 human minutes), in game-seconds at config.tickMs.
      validation: { winnable: true, crossingRequiredToWin: true, minStrategies: 2,
        pacing: { marginSeconds: [360, 900], firstPurchaseSeconds: [45, 120], maxPurchaseGapSeconds: 240 } },
    },
  ];
})(typeof window !== "undefined" ? window : globalThis);
