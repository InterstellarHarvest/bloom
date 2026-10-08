// BLOOM — the four plant-visual CONCEPT DIRECTIONS (BLOOM-032A Plant Evolution Visual Lab). docs/PLANT_EVOLUTION_VISUAL_LAB_v1.md §4.
//
// A concept is a complete art direction over the SAME model, skeleton rules and renderer: its native logical resolution, its body
// plan proportions (stem curve, leaf rhythm and angle, root habit), its leaf profile and sprite set (pixel-parts.js), its palette,
// its line / shading treatment, its specimen-box environment and its default preview / purchase treatment. None of them is chosen;
// production stays on resources/run-ui/plant-specimen.js until the owner picks one.
// Classic script, no dependencies, no DOM.
(function (root) {
  "use strict";
  const ramp = s => s.split(" ");
  // shared material order (pixel-parts.js MAT): 1 STEM 2 LEAF 3 VEIN 4 ROOT 5 PETAL 6 CENTER 7 PAPPUS 8 SEED 9 POD 10 FROST 11 WAX
  // 12 SALT 13 RADLEAF 14 RADSTEM 15 BUD 16 WATER 17 NODULE 18 STRESS 19 FX 20 CORE 21 INK 22 TUBER 23 SAC
  const pal = o => { const out = []; for (const [k, v] of Object.entries(o)) out[+k] = ramp(v); return out; };

  const A = {
    id: "A", name: "Botanical Pixel Specimen", short: "Botanical",
    blurb: "A field-guide plant in crisp, restrained pixels: recognisable leaves, roots, flower and seed clock; every trait alters real anatomy.",
    W: 80, H: 96, resolutions: [[80, 96], [96, 112], [112, 136]],
    soilFrac: 0.68, crownX: 0.5, topMargin: 15, stemFrac: 0.92, stemW: 2, rootDepth: 0.48, rootWiggle: 0.3, lateralLen: 12,
    bend: t => 1.6 * Math.sin(t * Math.PI * 1.15), droopSide: 1, droopAngle: 34,
    leafProfile: "ovate", leafLen: 13, leafWid: 6, leafAngle: 62, leafAngleTaper: 22, leafTaper: 0.38, nodeStart: 0.2, nodeEnd: 0.84, leafBend: 0.12,
    outline: "selective", shading: "full", veins: "midrib", fx: "grow", preview: "ghost", basalPair: 0.62, basalAngle: 78,
    palette: pal({ 1: "#2b4a22 #42692c #5a8a3a #7aa64e", 2: "#264f22 #3b7431 #5a9c43 #86c25e", 3: "#264f22 #2f5f2a #3b7431 #4a8a3a", 4: "#5e4528 #977348 #c4a173 #e4cea3",
      5: "#8a4a6e #d690b6 #f2c4dc #fff0f6", 6: "#7a4c0c #c08418 #eeb92e #ffe17a", 7: "#87847e #c5c2b8 #ebe8df #ffffff", 8: "#45301c #684826 #8a6236 #b08450",
      9: "#432a15 #6b4724 #93673a #bd9060", 10: "#5f86aa #93b8d6 #cfe4f4 #ffffff", 11: "#3a5c58 #5d8781 #8db6ac #c4e2d8", 12: "#7f96a2 #bccdd6 #ecf5f8 #ffffff",
      13: "#2a1230 #4c1f48 #7a2c64 #a8507f", 14: "#2a1424 #4a2238 #6a3048 #8c4660", 15: "#2a5424 #4c8a38 #7db357 #a8d27a", 16: "#2a5878 #4c84a6 #7cb2d4 #b6dcf0",
      17: "#6a4a6a #a07aa0 #d2b2d2 #f0dcf0", 18: "#4a3010 #7a5020 #a87838 #caa262", 19: "#fff6c8 #fff6c8 #fff6c8 #ffffff", 20: "#3f7a34 #5f9e48 #95cc74 #c6eca4",
      21: "#1e2a1a #1e2a1a #1e2a1a #1e2a1a", 22: "#6a4626 #966a3e #bf955e #dfbf8e", 23: "#432a15 #6b4724 #93673a #bd9060" }),
    env: { style: "field", sky: { cold: ["#c8dcec", "#e4eef6"], mild: ["#bfe0f0", "#e6f4fa"], hot: ["#f4dfa8", "#fbefd0"] },
      soil: { dry: ["#c9a874", "#b69060", "#e2c898"], loam: ["#8a6440", "#74522f", "#a07a52"], wet: ["#5e4630", "#4a3624", "#76583c"] }, turf: "#6aa84a", turfDry: "#b6aa6a" },
  };

  const B = {
    id: "B", name: "Field-Journal Cutaway", short: "Journal",
    blurb: "An inked journal plate: a specimen box with a deep soil cutaway, so the roots read as clearly as the leaves; changes travel through it.",
    W: 96, H: 112, resolutions: [[96, 112], [80, 96], [112, 136]],
    soilFrac: 0.56, crownX: 0.5, topMargin: 16, stemFrac: 0.8, stemW: 2, rootDepth: 0.66, rootWiggle: 1.1, lateralLen: 19, leafPairs: true, leafCountDelta: 2, rootOutline: true,
    bend: t => 0.9 * Math.sin(t * Math.PI), droopSide: 1, droopAngle: 30,
    leafProfile: "elliptic", leafLen: 15, leafWid: 7, leafAngle: 66, leafAngleTaper: 20, leafTaper: 0.34, nodeStart: 0.2, nodeEnd: 0.82, leafBend: 0.08,
    outline: "ink", shading: "flat", veins: "pinnate", fx: "pulse", preview: "ghost", frame: true,
    palette: pal({ 1: "#2b2118 #6f8a4a #86a45a #a8c47a", 2: "#2b2118 #6a9448 #84ad5c #b3d08a", 3: "#2b2118 #4f7436 #4f7436 #5f8442", 4: "#2b2118 #b28a5c #cfaa7c #e8d0a4",
      5: "#2b2118 #e7cbd6 #f7e6ec #ffffff", 6: "#2b2118 #d39a2a #efc04a #ffe08a", 7: "#2b2118 #ddd6c4 #f2ecdc #ffffff", 8: "#2b2118 #7a5530 #946a3e #b8905c",
      9: "#2b2118 #9a7046 #b88a58 #d6ac7a", 10: "#2b2118 #8fb4d0 #d2e6f4 #ffffff", 11: "#2b2118 #86aca4 #a6c8be #cfe6de", 12: "#2b2118 #cfdde2 #f2f8fa #ffffff",
      13: "#2b2118 #7a3a6a #96487e #b86e9c", 14: "#2b2118 #6a3048 #844058 #a05a72", 15: "#2b2118 #86ad5c #a3c876 #c6e09a", 16: "#2b2118 #7aaed0 #9cc8e4 #c8e4f4",
      17: "#2b2118 #b494b4 #d4b8d4 #eedcee", 18: "#2b2118 #b8904a #cfa860 #e2c488", 19: "#c0392b #e74c3c #ff7a5a #ffd0b0", 20: "#2b2118 #a6cc84 #c4e2a6 #e0f4c8",
      21: "#2b2118 #2b2118 #2b2118 #2b2118", 22: "#2b2118 #b08454 #cca070 #e6c696", 23: "#2b2118 #9a7046 #b88a58 #d6ac7a" }),
    env: { style: "journal", sky: { cold: ["#eef0ea", "#f4f4ee"], mild: ["#f3ecd8", "#f8f2e2"], hot: ["#f6e6c4", "#faf0da"] },
      soil: { dry: ["#dcc49a", "#c8ae80", "#ead6b0"], loam: ["#b68e62", "#a07a50", "#caa47a"], wet: ["#8e6c4a", "#7a5a3c", "#a07e5c"] }, turf: "#7da653", turfDry: "#c2b47a" },
  };

  const C = {
    id: "C", name: "Strange Alien Herbarium", short: "Alien",
    blurb: "A real organism from an unknown world: an asymmetric, curling body plan with bolder trait changes — strange, never magic.",
    W: 88, H: 104, resolutions: [[88, 104], [80, 96], [112, 136]],
    soilFrac: 0.7, crownX: 0.44, topMargin: 15, stemFrac: 0.9, stemW: 3, rootDepth: 0.46, rootWiggle: 2.1, lateralLen: 11,
    bend: t => 9 * Math.pow(t, 1.4) - 11 * Math.pow(t, 5), droopSide: 1, droopAngle: 28,
    sidePattern: k => [1, -1, 1, 1, -1, 1, -1, -1, 1][k % 9],
    leafProfile: "paddle", leafLen: 14, leafWid: 8, leafAngle: 74, leafAngleTaper: 26, leafTaper: 0.3, nodeStart: 0.16, nodeEnd: 0.8, leafBend: 0.22,
    outline: "ink", shading: "full", veins: "pores", nodeBulbs: true, fx: "dissolve", preview: "glow",
    palette: pal({ 1: "#2a2040 #4e3e68 #6e5c8c #9484b2", 2: "#163f46 #24706e #3fa494 #84dcc0", 3: "#163f46 #1d5a5a #24706e #2f8a82", 4: "#6a3a2a #a8603e #d08a5a #f0b888",
      5: "#6a1e34 #b8405a #f07078 #ffb4a4", 6: "#6a5a1a #b8a03a #e8d060 #fff4a0", 7: "#4a5a2a #8aa848 #b8d868 #e4ff9c", 8: "#6a4a1a #a8782a #e0b048 #ffe08a",
      9: "#3a6a6a #7ab0a8 #b8e4d8 #ecfff8", 10: "#7a90b0 #b4c8e4 #e2ecfa #ffffff", 11: "#5a6a7a #9aaabb #d0dce8 #f4faff", 12: "#5ab0c0 #9ee4ec #d8fcff #ffffff",
      13: "#3a0a20 #6a1430 #a02840 #d0485a", 14: "#2a0a1a #4a1428 #6e2036 #922c46", 15: "#2a2040 #5a4878 #8a74b0 #b8a4dc", 16: "#183a5a #2a6488 #4a92b8 #8ac4e0",
      17: "#4a3a1a #8a7038 #c8a85a #ecd894", 18: "#3a2a1a #6a4a2a #9a7040 #c09a60", 19: "#e0ffd8 #e0ffd8 #f4fff0 #ffffff", 20: "#1d5a5a #4fa8a0 #8ad8c8 #c8fff0",
      21: "#1b1530 #1b1530 #1b1530 #1b1530", 22: "#6a3a2a #a8603e #d08a5a #f0b888", 23: "#6a4a1a #a8782a #e0b048 #ffe08a" }),
    env: { style: "alien", sky: { cold: ["#2c3c64", "#5a6ea0"], mild: ["#2a3a5c", "#6a7aa8"], hot: ["#5a3450", "#b8706a"] },
      soil: { dry: ["#7a6a5a", "#665848", "#948270"], loam: ["#4e4a5e", "#3e3a4e", "#64607a"], wet: ["#2e3448", "#242a3a", "#3e465e"] }, turf: "#3fa494", turfDry: "#8a8070" },
  };

  const D = {
    id: "D", name: "Organic Hybrid", short: "Hybrid",
    blurb: "Friendly and readable like A / B with a little of C's weirdness: chunky shapes, a curl of personality, bold silhouette changes.",
    W: 80, H: 96, resolutions: [[80, 96], [96, 112], [112, 136]],
    soilFrac: 0.68, crownX: 0.5, topMargin: 16, stemFrac: 0.86, stemW: 4, rootDepth: 0.5, rootWiggle: 0.8, lateralLen: 12,
    bend: t => 3.2 * Math.sin(t * Math.PI * 0.85), droopSide: -1, droopAngle: 32,
    leafProfile: "teardrop", leafLen: 15, leafWid: 10, leafAngle: 54, leafCountDelta: -2, basalPair: 1.05, basalAngle: 70, leafAngleTaper: 18, leafTaper: 0.32, nodeStart: 0.2, nodeEnd: 0.82, leafBend: 0.28,
    outline: "ink", shading: "full", veins: "midrib", curlTop: true, fx: "bloom", preview: "glow",
    palette: pal({ 1: "#2a1f1a #3e7a30 #5aa040 #8ccc5c", 2: "#2a1f1a #339040 #56bc48 #a4e46e", 3: "#2a1f1a #2a7a36 #339040 #3fa046", 4: "#2a1f1a #c08a50 #e0b078 #f6d8a6",
      5: "#2a1f1a #d0507e #ff86ac #ffc8dc", 6: "#2a1f1a #e0801a #ffb436 #ffe48a", 7: "#2a1f1a #d8d4ca #f6f2e8 #ffffff", 8: "#2a1f1a #8a5a2a #b07a3c #d8a460",
      9: "#2a1f1a #a86a34 #d08c48 #f2b46a", 10: "#2a1f1a #8cc4ec #d4ecfc #ffffff", 11: "#2a1f1a #78b4b0 #a6dcd2 #dafaf0", 12: "#2a1f1a #c2e4f0 #f0fcff #ffffff",
      13: "#2a1f1a #8a2a6a #c0408a #e874b0", 14: "#2a1f1a #6a2a4a #8e3a60 #b05880", 15: "#2a1f1a #4caa40 #7cd458 #b8f08a", 16: "#2a1f1a #3a90c8 #66b8ea #a8dcff",
      17: "#2a1f1a #b48ac8 #d6b2ea #f4dcff", 18: "#2a1f1a #b07a2a #d2a040 #f0c868", 19: "#fff2a0 #fff2a0 #ffffff #ffffff", 20: "#2a1f1a #7ad070 #aaf09a #dcffc8",
      21: "#2a1f1a #2a1f1a #2a1f1a #2a1f1a", 22: "#2a1f1a #b07842 #d29a5c #f0c48a", 23: "#2a1f1a #a86a34 #d08c48 #f2b46a" }),
    env: { style: "friendly", sky: { cold: ["#a8d4f4", "#e2f2fe"], mild: ["#8ccaf2", "#d8f0fe"], hot: ["#ffcc80", "#fff0c8"] },
      soil: { dry: ["#d8b07a", "#c09060", "#ecd0a0"], loam: ["#9a6a40", "#84582f", "#b48452"], wet: ["#6a4a30", "#563a24", "#86603e"] }, turf: "#56bc48", turfDry: "#c4b46a" },
  };

  const LIST = [A, B, C, D];
  root.BLOOM = Object.assign(root.BLOOM || {}, { plantVisual: Object.assign((root.BLOOM && root.BLOOM.plantVisual) || {}, {
    concepts: Object.freeze({ A, B, C, D, list: LIST, ids: LIST.map(c => c.id) }) }) });
})(typeof window !== "undefined" ? window : globalThis);
