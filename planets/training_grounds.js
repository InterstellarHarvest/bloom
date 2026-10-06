// BLOOM — authored TRAINING planet "Training Grounds" (BLOOM-028D1). Six regions, all land, no pressure: the world the Main
// Menu's TRAINING opens (demos/demo-run.html?training=1). Same planet model as First Bloom and the generator (bible §15/§18);
// loaded by id (planet=training_grounds), never generated, so it is identical on every load.
// effTemp = globalClimate.temperature + tempOffset ; effMoist = globalClimate.moisture + moistureOffset.
//
// Each region carries exactly one lesson, with one obvious answer and a second honest one (measured with the real engine,
// base genome: suits −6…+24 °C, moisture 32…68, salinity ≤ 15; growth needs fitness > 0.55):
//   Landing Meadow ★  origin, +14 °C / 50: home colony, thrives
//   Green Verge       +12 °C / 56: open ground the plant fills on its own (spread)
//   Chill Hollow      −12 °C: too cold (fitness 0.40) → Adapt: Cold Tolerance ×1 (floor −18 °C) or Terraform: Warm the Sky ×1
//   Thirsty Flats     moisture 24: too dry (0.33) → Terraform: Humidify ×1 (→ 32) or Adapt: Drought ×1
//   Reed Fen          moisture 64: wet but fine; Humidify makes it worse but it still grows (0.67) — the preview's tradeoff;
//                     Drought closes it (0.08), the water-strategy cost
//   Salt Pan          salinity 80: hostile soil, not terraformable — ground to give up (Salt Handling opens it, never needed)
// Win at 65 % living land at once. Plateaus (real sim, any seed): nothing 39 % · one answer (Cold, or Humidify) 59–60 % · Cold +
// Humidify 80 % · Cold + Drought 72 % · Warm + Humidify 80 % · Cold + Salt 80 %. So one answer is never enough, either pair of
// answers wins with room to spare, and the hostile region is never required.
(function (root) {
  "use strict";
  const D = root.BLOOM_DATA || (root.BLOOM_DATA = { planets: {} });
  D.planets = D.planets || {};
  D.planets.training_grounds = {
  id:"training_grounds", name:"Training Grounds",
  gridWidth:48, gridHeight:32, origin:"landing_meadow", winThreshold:0.65,
  globalClimate:{ temperature:8, moisture:50 },
  sections:[
    // (neighbors are informational: the engine derives adjacency from the layout)
    { id:"landing_meadow", name:"Landing Meadow", isOrigin:true, area:80, center:{x:0.44,y:0.48},
      neighbors:["green_verge","chill_hollow","thirsty_flats","salt_pan"],
      local:{ tempOffset:6, moistureOffset:0, light:70, ph:6.8, salinity:0, toxicity:0, radiation:8, nutrients:60 } },
    { id:"green_verge", name:"Green Verge", area:75, center:{x:0.74,y:0.22},
      neighbors:["landing_meadow","reed_fen","salt_pan"],
      local:{ tempOffset:4, moistureOffset:6, light:65, ph:6.6, salinity:0, toxicity:0, radiation:8, nutrients:55 } },
    { id:"chill_hollow", name:"Chill Hollow", area:110, center:{x:0.17,y:0.22},
      neighbors:["landing_meadow","thirsty_flats"],
      local:{ tempOffset:-20, moistureOffset:-2, light:50, ph:6.6, salinity:0, toxicity:0, radiation:10, nutrients:50 } },
    { id:"reed_fen", name:"Reed Fen", area:25, center:{x:0.85,y:0.62},
      neighbors:["green_verge","salt_pan"],
      local:{ tempOffset:6, moistureOffset:14, light:60, ph:6.4, salinity:0, toxicity:0, radiation:8, nutrients:60 } },
    { id:"thirsty_flats", name:"Thirsty Flats", area:110, center:{x:0.18,y:0.76},
      neighbors:["landing_meadow","chill_hollow","salt_pan"],
      local:{ tempOffset:8, moistureOffset:-26, light:80, ph:7.0, salinity:5, toxicity:0, radiation:14, nutrients:40 } },
    { id:"salt_pan", name:"Salt Pan", area:100, center:{x:0.57,y:0.86},
      neighbors:["landing_meadow","green_verge","reed_fen","thirsty_flats"],
      local:{ tempOffset:6, moistureOffset:-8, light:85, ph:8.0, salinity:80, toxicity:0, radiation:14, nutrients:25 } }
  ]
  };
})(typeof window !== "undefined" ? window : globalThis);
