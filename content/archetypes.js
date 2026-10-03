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
//                   alone can never win → a crossing strategy is required); BLOOM-010: maxLandmasses and
//                   minOriginLandmassShare (a mostly contiguous world), minOriginFitness (the origin's own fitness,
//                   before the protected-refuge floor, must be at least this → the home region is a genuine refuge);
//                   BLOOM-011: minRefuges (at least this many OTHER regions are green at the start → several refuges, not
//                   one safe home surrounded by instant death)
//   render          optional temporary map treatment for the demo harness (ground tint + mix, water colours, dunes;
//                   BLOOM-011: tintBy "dry" (default) | "cold" — which ground takes the tint — and frost glints)
//   naming          optional word pools for generated region names (cold/mild/warm/hot/wet/dry/noun), so a world's
//                   names match its climate; pools left out use the generator's defaults
//   generation      maxAttempts for the deterministic retry loop
//   display         (BLOOM-016) player-facing card + briefing copy for the launcher (index.html): tagline (one-sentence
//                   identity), character (the planet's main problem, a short label), cue (a hint that helps form a hypothesis,
//                   never a build), detail (one briefing sentence), icon (a temporary icon key), previewSeed (the public seed
//                   whose raw terrain draws the card's mini map; generation only, nothing is validated for a preview)
//   validation      what a finished world of this archetype must pass (winnable → bible §10.3 layers 4–6;
//                   minStrategies → layer 7 strategy diversity; pacing → layer 8 time bands, optionally with
//                   maxTerminalWaitSeconds; requiredConditions → every proven strategy must answer these conditions)
// Each archetype owns its policy: changing one never changes another.
(function (root) {
  "use strict";
  const D = root.BLOOM_DATA || (root.BLOOM_DATA = { planets: {} });
  D.archetypes = [
    {
      id: "ocean_archipelago", name: "Ocean Archipelago",
      display: { tagline: "Fragmented islands surrounded by water.", character: "Crossing water",
        cue: "Crossing between islands is part of the puzzle.", detail: "The land is split into islands, and no single island is big enough on its own.",
        icon: "islands", previewSeed: 13 },
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
      // Pacing bands are validator hypotheses for a perfect-knowledge witness (a person is slower; the bible's session
      // target is 10–20 human minutes), in game-seconds at config.tickMs. BLOOM-013 replaced the provisional bands
      // (margin 360–900 s, first purchase 45–120 s, gap ≤ 240 s) with the owner's decision-cadence requirement: the first
      // global purchase within 60 s, no gap between purchases above 120 s, and a margin band scaled to the faster economy
      // (240–720 s; it still rejects trivially fast and very slow worlds). Desert and Frozen share these bands.
      validation: { winnable: true, crossingRequiredToWin: true, minStrategies: 2,
        pacing: { marginSeconds: [240, 720], firstPurchaseSeconds: [0, 60], maxPurchaseGapSeconds: 120 } },
    },
    {
      id: "desert_world", name: "Desert World",
      display: { tagline: "A hot, dry world with scattered wet refuges.", character: "Dry ground",
        cue: "Water strategy matters most.", detail: "Most ground is dry; wet basins and lakeshores are the refuges.",
        icon: "dunes", previewSeed: 25 },
      intent: "Hot, dry, mostly contiguous world: water is the problem. Scattered wet basins are refuges; the plant must either evolve to live dry or humidify the sky — and each answer gives up different ground.",
      sections: [12, 18],
      // a few lakes/playas in the lowest ground, not seas (sweep of public seeds 1–40: actual water 2–12%)
      water: { min: 2, max: 12, tolerance: 4 },
      // arid, warm climate (tuned on the BLOOM-010 sweep, see docs/evidence/bloom-010):
      //  · dry sky (18) and a dry bias: most ground sits below the plant's starting water window (32–68), so Water is
      //    the most common limit; basinMoisture makes the LOW ground wetter (water collects in basins, often beside
      //    the lakes, whose shores gain coastMoisture) — those wet basins are the refuges, and the origin is one of them
      //  · warm (≈ 4 °C north … 34 °C south ± 5): a hot southern band, not a lethal planet; hot ground keeps the
      //    generator's usual strong-sun radiation
      //  · clear skies: +20 light (a growth bonus); dry ground has poor nutrients (slower, never blocked) and some
      //    dry sections are salt pans (drySaltChance) where evaporation left salt behind; few volcanic soils
      climate: { temperature: 14, moisture: 18, tempBase: -10, tempSpan: 30, tempJitter: 10,
        moistureSpread: 56, moistureBias: -4, coastMoisture: 60, basinMoisture: 30, dryOffset: -8, wetOffset: 18,
        volcanicChance: 0.05, coastalSaltAbove: 0.25, coastalSaltChance: 0.35, saltChance: 0.04, drySaltChance: 0.2,
        lightBias: 20, originTemp: 10, originMoistureOffset: 32, originMoistureWeight: 1 },
      // continent-scale terrain (generator default) → one landmass, occasionally a second; crossing is never the puzzle
      geography: { minLandmassTiles: 16, maxCrossingGap: 5, maxLandmasses: 2, minOriginLandmassShare: 0.85, minOriginFitness: 0.72 },
      naming: { wet: ["Oasis", "Spring", "Wadi", "Seep", "Palm"], dry: ["Dune", "Dust", "Glass", "Bone", "Chalk", "Sand", "Stone"],
        hot: ["Cinder", "Scorch", "Ember", "Blaze", "Furnace"], warm: ["Amber", "Ochre", "Gold", "Saffron", "Sienna", "Copper"],
        mild: ["Sage", "Juniper", "Pale", "Wind", "Shade"],
        noun: ["Basin", "Flats", "Reach", "Mesa", "Erg", "Playa", "Plateau", "Dunes", "Pan", "Hollow", "Wastes", "Rise", "Canyon", "Shelf"] },
      // temporary map treatment for playtests (demo-run.html, data only; not the final visual direction): sandy bare
      // ground, lighter lake water, a faint dune stipple — so a desert reads as dry at a glance
      render: { ground: [232, 180, 100], groundMix: 0.6, water: [40, 104, 132], waterAlt: [52, 118, 146], dunes: true },
      generation: { maxAttempts: 24 },
      // Desert World's own policy. The Ocean Archipelago bands measured cleanly on the Desert sweep (BLOOM-010: witness margins
      // 362–692 s, first purchase 47–102 s, largest gap 78–165 s; BLOOM-013 economy: 128–431 s, 16–29 s, 54–98 s), so they are reused; Desert adds a cap on
      // the wait after the last purchase (one early purchase then minutes of nothing to decide is not a desert puzzle)
      // and requires every proven strategy to answer the dry ground (Water:dry — by Adaptation, Terraform or both).
      validation: { winnable: true, minStrategies: 2, requiredConditions: ["Water:dry"],
        pacing: { marginSeconds: [240, 720], firstPurchaseSeconds: [0, 60], maxPurchaseGapSeconds: 120, maxTerminalWaitSeconds: 240 } },
    },
    {
      id: "frozen_world", name: "Frozen World",
      display: { tagline: "A mostly frozen planet with warmer refuges.", character: "Cold ground",
        cue: "Surviving the cold and warming the climate compete.", detail: "Cold dominates most of the planet, but geothermal refuges are warmer.",
        icon: "snowflake", previewSeed: 22 },
      intent: "Cold, mostly contiguous world: temperature is the problem. Milder lowlands and geothermal pockets are refuges; the plant must either evolve for the cold or warm the sky — and a warmer sky also pushes the warm refuges toward too hot.",
      sections: [12, 18],
      // lakes and inlets, not seas (sweep of public seeds 1–40: actual water 6–20%)
      water: { min: 6, max: 20, tolerance: 5 },
      // cold climate (tuned on the BLOOM-011 sweep, see docs/evidence/bloom-011):
      //  · a −18 °C sky with a north–south gradient (tempBase −20, span 34) and colder uplands (elevationCooling 20: the
      //    highest region is 10 °C colder, the lowest 10 °C warmer) → most land sits below the plant's starting cold limit
      //    (about −10 °C); the coldest regions reach about −45 °C, which even Cold Tolerance ×3 only just covers
      //  · geothermal pockets (a quarter of regions, +34 °C from below): the refuges, often clustered — most near 0…+15 °C,
      //    some warm (+20…+28 °C) and a few too hot (vents above +28 °C). Warming the sky pushes the warm ones out of range:
      //    that is Warm the Sky's cost. Geothermal heat is not strong sunlight, so it adds no radiation hazard
      //  · ordinary moisture (46 sky, modest spread): water is rarely the limit; few salt or volcanic soils; slightly dimmer light
      //  · origin preference +6 °C → the home region is one of the milder refuges
      climate: { temperature: -18, moisture: 46, tempBase: -20, tempSpan: 34, tempJitter: 8, elevationCooling: 20,
        geothermalChance: 0.25, geothermalWarmth: 34, moistureSpread: 50, moistureBias: 0, coastMoisture: 12,
        volcanicChance: 0.04, coastalSaltAbove: 0.4, coastalSaltChance: 0.3, saltChance: 0.04, lightBias: -6, originTemp: 6 },
      // continent-scale terrain → usually one landmass, sometimes two or three: crossings may exist but never define the world
      // (Waterborne Seeds appears only where the generic offer rule finds one). The origin must be a genuine refuge, and at
      // least two OTHER regions must be green at the start
      geography: { minLandmassTiles: 16, maxCrossingGap: 5, maxLandmasses: 3, minOriginLandmassShare: 0.7, minOriginFitness: 0.72, minRefuges: 2 },
      naming: { cold: ["Frost", "Glacier", "Rime", "Tundra", "Hoar", "Snow", "Ice", "Permafrost", "Polar", "Sleet"],
        mild: ["Thaw", "Lichen", "Sedge", "Willow", "Moss", "Heath"], warm: ["Steam", "Geyser", "Spring", "Thermal", "Mist"],
        hot: ["Fumarole", "Vent", "Caldera", "Cinder", "Scald"], wet: ["Meltwater", "Fen", "Bog", "Slush", "Mire"],
        dry: ["Scree", "Gravel", "Flint", "Windswept", "Barren"],
        noun: ["Basin", "Flats", "Reach", "Shelf", "Plateau", "Fields", "Hollow", "Rise", "Ridge", "Valley", "Moraine", "Cirque", "Slope", "Expanse"] },
      // temporary map treatment for playtests (demo-run.html, data only; not the final visual direction): pale snow tint on
      // cold ground (the colder, the paler — refuges keep their own colour, and warming the sky visibly thaws the map), ice
      // glints on frozen ground, dark cold lake water
      render: { ground: [222, 232, 244], groundMix: 0.7, tintBy: "cold", water: [38, 78, 112], waterAlt: [120, 160, 186], frost: true },
      generation: { maxAttempts: 24 },
      // Frozen World's own policy. The shared pacing bands measured cleanly on the Frozen sweep (BLOOM-011: witness margins
      // 360–680 s, first purchase 48–112 s, largest gap 73–174 s, terminal wait 11–198 s; BLOOM-013 economy: 146–481 s, 16–30 s,
      // 51–113 s, 17–234 s), so they are reused; every proven
      // strategy must answer the cold ground (Temperature:cold — by Cold Tolerance, warming the sky, or both)
      validation: { winnable: true, minStrategies: 2, requiredConditions: ["Temperature:cold"],
        pacing: { marginSeconds: [240, 720], firstPurchaseSeconds: [0, 60], maxPurchaseGapSeconds: 120, maxTerminalWaitSeconds: 240 } },
    },
  ];
})(typeof window !== "undefined" ? window : globalThis);
