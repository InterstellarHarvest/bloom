// BLOOM — the temporary slice upgrade set (docs/NEXT_PLAYABLE_SLICE_v1.0.md), as data.
// cost = round((base + step × tier) × config.econ.costScale), where tier is the count the
// effect type tracks. Effect types are implemented once in resources/bloom-sim.js:
//   tempPoint {stat}         shared cold+heat pool, capped by config.scales.tempCap
//   waterArm  {arm}          one water strategy (wet|dry); points shift + widen the water window
//   level     {stat, max}    simple capped genome level
//   sky       {axis, delta}  global Terraform shift (axis temp|moist; optional min/max clamp)
// `science` is the one-line real-plant explanation the Bloom Report shows (bible §17).
(function (root) {
  "use strict";
  const D = root.BLOOM_DATA || (root.BLOOM_DATA = { planets: {} });
  D.traits = [
    { id: "cold", board: "Adapt", name: "Cold Tolerance", sub: "tolerate colder ground",
      effect: { type: "tempPoint", stat: "cold" }, cost: { base: 28, step: 26 },
      blockedWhy: "temperature points are capped — cold+heat ≤ {tempCap}",
      science: "like winter wheat and arctic willow: cells fill with sugars and antifreeze proteins so ice crystals don't tear them apart." },
    { id: "heat", board: "Adapt", name: "Heat Tolerance", sub: "tolerate hotter ground",
      effect: { type: "tempPoint", stat: "heat" }, cost: { base: 28, step: 26 },
      blockedWhy: "temperature points are capped — cold+heat ≤ {tempCap}",
      science: "like the desert creosote bush: heat-shock proteins hold the plant's enzymes in shape when it gets scorching." },
    { id: "drought", board: "Adapt", name: "Drought Adaptation", short: "Drought", sub: "shift toward dry survival",
      effect: { type: "waterArm", arm: "dry" }, cost: { base: 30, step: 24 },
      blockedWhy: "a plant commits to one water strategy — Flood is already chosen",
      science: "like cacti and agave: thick water-storing tissue, waxy skin, and leaf pores (stomata) that open only in the cool night." },
    { id: "flood", board: "Adapt", name: "Flood Adaptation", short: "Flood", sub: "shift toward wet survival",
      effect: { type: "waterArm", arm: "wet" }, cost: { base: 30, step: 24 },
      blockedWhy: "a plant commits to one water strategy — Drought is already chosen",
      science: "like rice and mangroves: air channels in the stem (aerenchyma) and snorkel roots pipe oxygen down to roots stuck in waterlogged mud." },
    { id: "salt", board: "Adapt", name: "Salt Handling", sub: "survive saline soil",
      effect: { type: "level", stat: "salt", max: 1 }, cost: { base: 40, step: 0 },
      science: "like saltbush and mangroves: roots filter salt out, and salt glands on the leaves push extra salt back out." },
    { id: "rad", board: "Adapt", name: "Radiation Shielding", sub: "survive high radiation",
      effect: { type: "level", stat: "rad", max: 1 }, cost: { base: 44, step: 0 },
      science: "like high-mountain plants: red and purple pigments (anthocyanins, flavonoids) work as sunscreen against strong UV." },
    { id: "seedOut", board: "Spread", name: "Seed Output", sub: "colonize faster",
      effect: { type: "level", stat: "seedOut", max: 2 }, cost: { base: 26, step: 30 },
      science: "like dandelions: one plant releases thousands of light seeds so a few land on new ground." },
    { id: "earlyMat", board: "Spread", name: "Early Maturity", sub: "seed neighbors sooner",
      effect: { type: "level", stat: "earlyMat", max: 1 }, cost: { base: 34, step: 0 },
      science: "like desert wildflowers: these 'ephemerals' race from seed to flower in weeks, before conditions turn bad." },
    { id: "warm", board: "Terraform", name: "Warm the Sky", short: "Warm", sub: "+6°C globally",
      effect: { type: "sky", axis: "temp", delta: 6 }, cost: { base: 40, step: 18 } },
    { id: "cool", board: "Terraform", name: "Cool the Sky", short: "Cool", sub: "−6°C globally",
      effect: { type: "sky", axis: "temp", delta: -6 }, cost: { base: 40, step: 18 } },
    { id: "humid", board: "Terraform", name: "Humidify", short: "Humidify", sub: "+8 moisture globally",
      effect: { type: "sky", axis: "moist", delta: 8, min: 0, max: 100 }, cost: { base: 40, step: 18 } },
    { id: "dry", board: "Terraform", name: "Dry the Sky", short: "Dry", sub: "−8 moisture globally",
      effect: { type: "sky", axis: "moist", delta: -8, min: 0, max: 100 }, cost: { base: 40, step: 18 } },
  ];
})(typeof window !== "undefined" ? window : globalThis);
