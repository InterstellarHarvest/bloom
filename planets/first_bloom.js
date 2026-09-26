// BLOOM — authored tutorial planet "First Bloom" (friendly 9-section Eden; the Next Playable Slice).
// Same planet model the procedural generator will emit (bible §15/§18).
// effTemp = globalClimate.temperature + tempOffset ; effMoist = globalClimate.moisture + moistureOffset.
(function (root) {
  "use strict";
  const D = root.BLOOM_DATA || (root.BLOOM_DATA = { planets: {} });
  D.planets = D.planets || {};
  D.planets.first_bloom = {
  id:"first_bloom", name:"First Bloom",
  gridWidth:60, gridHeight:40, origin:"meadow_hollow",   // winThreshold omitted → config.win (0.70)
  globalClimate:{ temperature:6, moisture:50 },
  sections:[
    // effTemp = 6 + tempOffset ; effMoist = 50 + moistureOffset.
    // Designed so 70% needs a WATER strategy (generalist tops out ~67%): flood→marsh or drought→dust,
    // each sacrificing the opposite water-extreme + ember (hazard). Thermal build = cold×2+heat×1 (caps at 3),
    // which just clears frost (cold) & sun (heat) but never ember (would need heat×2). Salt×1 for salt_barren.
    { id:"meadow_hollow", name:"Meadow Hollow", isOrigin:true, area:130, center:{x:0.42,y:0.45},
      neighbors:["fern_shade","cool_glen","dust_reach","marsh_low","salt_barren"],
      local:{ tempOffset:8, moistureOffset:0, light:65, ph:6.8, salinity:0, toxicity:0, radiation:8, nutrients:60 } },
    { id:"fern_shade", name:"Fern Shade", area:110, center:{x:0.64,y:0.30},
      neighbors:["meadow_hollow","marsh_low"],
      local:{ tempOffset:4, moistureOffset:6, light:55, ph:6.5, salinity:0, toxicity:0, radiation:8, nutrients:50 } },
    { id:"cool_glen", name:"Cool Glen", area:110, center:{x:0.22,y:0.30},
      neighbors:["meadow_hollow","frost_shelf"],
      local:{ tempOffset:-14, moistureOffset:-4, light:45, ph:6.6, salinity:0, toxicity:0, radiation:10, nutrients:45 } },
    { id:"frost_shelf", name:"Frost Shelf", area:100, center:{x:0.15,y:0.10},
      neighbors:["cool_glen"],
      local:{ tempOffset:-28, moistureOffset:-6, light:35, ph:6.4, salinity:0, toxicity:0, radiation:12, nutrients:35 } },
    { id:"marsh_low", name:"Marsh Low", area:110, center:{x:0.68,y:0.55},
      neighbors:["meadow_hollow","fern_shade","sun_flats"],
      local:{ tempOffset:8, moistureOffset:42, light:60, ph:6.2, salinity:0, toxicity:0, radiation:8, nutrients:60 } },
    { id:"dust_reach", name:"Dust Reach", area:110, center:{x:0.20,y:0.66},
      neighbors:["meadow_hollow","salt_barren"],
      local:{ tempOffset:12, moistureOffset:-34, light:85, ph:7.4, salinity:20, toxicity:0, radiation:22, nutrients:25 } },
    { id:"salt_barren", name:"Salt Barren", area:100, center:{x:0.46,y:0.76},
      neighbors:["meadow_hollow","dust_reach","sun_flats","ember_scar"],
      local:{ tempOffset:2, moistureOffset:-6, light:75, ph:8.2, salinity:80, toxicity:5, radiation:20, nutrients:20 } },
    { id:"sun_flats", name:"Sun Flats", area:120, center:{x:0.67,y:0.79},
      neighbors:["salt_barren","marsh_low","ember_scar"],
      local:{ tempOffset:24, moistureOffset:4, light:90, ph:7.0, salinity:5, toxicity:0, radiation:26, nutrients:40 } },
    { id:"ember_scar", name:"Ember Scar", area:100, center:{x:0.70,y:0.95},
      neighbors:["salt_barren","sun_flats"],
      local:{ tempOffset:38, moistureOffset:-26, light:95, ph:5.0, salinity:5, toxicity:55, radiation:55, nutrients:30 } }
  ]
  };
})(typeof window !== "undefined" ? window : globalThis);
