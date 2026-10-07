// BLOOM — the temporary slice upgrade set (docs/NEXT_PLAYABLE_SLICE_v1.0.md), as data.
// cost = round((base + step × tier) × config.econ.costScale), where tier is the count the
// effect type tracks. Effect types are implemented once in resources/bloom-sim.js:
//   tempPoint {stat}         shared cold+heat pool, capped by config.scales.tempCap
//   waterArm  {arm}          one water strategy (wet|dry); points shift + widen the water window
//   level     {stat, max}    simple capped genome level
//   sky       {axis, delta}  global Terraform shift (axis temp|moist; optional min/max clamp)
//   crossing  {stat, max}    seeds cross water to other landmasses (range/pressure: config.crossing);
//                            only offered on maps where such a crossing exists
// `science` is the one-line real-plant explanation the Bloom Report shows (bible §17).
// `uiCategory` (BLOOM-029C) is PRESENTATION ONLY: the PMO-locked Concept 18 category a trait is shown under in the production
// Adapt / Spread rooms (Adapt: Hazard / Water / Temperature / Soil · Spread: Seeds / Growth / Reach). The simulation, effects,
// costs, availability, previews and validation never read it (tools/plant-rooms-check.js proves the gameplay outputs unchanged).
// `uiBank` + `uiCategory` on the Terraform traits (BLOOM-029D) are the same kind of PRESENTATION-ONLY metadata for the production
// Terraform room: which side of the globe a real node sits on (bank: Atmosphere = the sky, right of the globe; Soil = the ground,
// left — no real Soil Terraform trait exists yet) and its category inside the bank (Sky temperature · Rain). All four current
// Terraform traits change the atmosphere, so all four are Atmosphere; Dry the Sky lowers atmospheric moisture and is Rain, not Soil.
// Nothing in the engine reads uiBank either (tools/terraform-check.js proves gameplay identical with both fields stripped).
(function (root) {
  "use strict";
  const D = root.BLOOM_DATA || (root.BLOOM_DATA = { planets: {} });
  D.traits = [
    { id: "cold", board: "Adapt", name: "Cold Tolerance", uiCategory: "Temperature", sub: "tolerate colder ground",
      effect: { type: "tempPoint", stat: "cold" }, cost: { base: 28, step: 26 },
      blockedWhy: "temperature points are capped — cold+heat ≤ {tempCap}",
      science: "like winter wheat and arctic willow: cells fill with sugars and antifreeze proteins so ice crystals don't tear them apart." },
    { id: "heat", board: "Adapt", name: "Heat Tolerance", uiCategory: "Temperature", sub: "tolerate hotter ground",
      effect: { type: "tempPoint", stat: "heat" }, cost: { base: 28, step: 26 },
      blockedWhy: "temperature points are capped — cold+heat ≤ {tempCap}",
      science: "like the desert creosote bush: heat-shock proteins hold the plant's enzymes in shape when it gets scorching." },
    { id: "drought", board: "Adapt", name: "Drought Adaptation", uiCategory: "Water", short: "Drought", sub: "shift toward dry survival",
      effect: { type: "waterArm", arm: "dry" }, cost: { base: 30, step: 24 },
      blockedWhy: "a plant commits to one water strategy — Flood is already chosen",
      science: "like cacti and agave: thick water-storing tissue, waxy skin, and leaf pores (stomata) that open only in the cool night." },
    { id: "flood", board: "Adapt", name: "Flood Adaptation", uiCategory: "Water", short: "Flood", sub: "shift toward wet survival",
      effect: { type: "waterArm", arm: "wet" }, cost: { base: 30, step: 24 },
      blockedWhy: "a plant commits to one water strategy — Drought is already chosen",
      science: "like rice and mangroves: air channels in the stem (aerenchyma) and snorkel roots pipe oxygen down to roots stuck in waterlogged mud." },
    { id: "salt", board: "Adapt", name: "Salt Handling", uiCategory: "Soil", sub: "survive saline soil",
      effect: { type: "level", stat: "salt", max: 1 }, cost: { base: 40, step: 0 },
      science: "like saltbush and mangroves: roots filter salt out, and salt glands on the leaves push extra salt back out." },
    { id: "rad", board: "Adapt", name: "Radiation Shielding", uiCategory: "Hazard", sub: "survive high radiation",
      effect: { type: "level", stat: "rad", max: 1 }, cost: { base: 44, step: 0 },
      science: "like high-mountain plants: red and purple pigments (anthocyanins, flavonoids) work as sunscreen against strong UV." },
    { id: "seedOut", board: "Spread", name: "Seed Output", uiCategory: "Seeds", sub: "colonize faster",
      effect: { type: "level", stat: "seedOut", max: 2 }, cost: { base: 26, step: 30 },
      science: "like dandelions: one plant releases thousands of light seeds so a few land on new ground." },
    { id: "waterSeeds", board: "Spread", name: "Waterborne Seeds", uiCategory: "Reach", sub: "floating seeds cross narrow water",
      effect: { type: "crossing", stat: "waterSeeds", max: 1 }, cost: { base: 36, step: 0 },
      science: "like coconuts and sea beans: some seeds and fruits float, so currents can carry them across short stretches of water to new shorelines." },
    { id: "earlyMat", board: "Spread", name: "Early Maturity", uiCategory: "Growth", sub: "seed neighbors sooner",
      effect: { type: "level", stat: "earlyMat", max: 1 }, cost: { base: 34, step: 0 },
      science: "like desert wildflowers: these 'ephemerals' race from seed to flower in weeks, before conditions turn bad." },
    { id: "warm", board: "Terraform", name: "Warm the Sky", short: "Warm", uiBank: "Atmosphere", uiCategory: "Sky temperature", sub: "+6°C globally",
      effect: { type: "sky", axis: "temp", delta: 6 }, cost: { base: 40, step: 18 } },
    { id: "cool", board: "Terraform", name: "Cool the Sky", short: "Cool", uiBank: "Atmosphere", uiCategory: "Sky temperature", sub: "−6°C globally",
      effect: { type: "sky", axis: "temp", delta: -6 }, cost: { base: 40, step: 18 } },
    { id: "humid", board: "Terraform", name: "Humidify", short: "Humidify", uiBank: "Atmosphere", uiCategory: "Rain", sub: "+8 moisture globally",
      effect: { type: "sky", axis: "moist", delta: 8, min: 0, max: 100 }, cost: { base: 40, step: 18 } },
    { id: "dry", board: "Terraform", name: "Dry the Sky", short: "Dry", uiBank: "Atmosphere", uiCategory: "Rain", sub: "−8 moisture globally",
      effect: { type: "sky", axis: "moist", delta: -8, min: 0, max: 100 }, cost: { base: 40, step: 18 } },
  ];
})(typeof window !== "undefined" ? window : globalThis);
