// BLOOM — planet-sphere spike: how often does the non-wrapping seam show, and how much does the sphere distort polar regions?
// Report only (no pass/fail). Reads production planets; changes nothing.
//
//   node docs/evidence/planet-sphere-spike/seam-pole-survey.js [--seeds 40]      → seam-pole-survey.json next to this file
//
// Seam: rows whose x = 0 and x = W−1 tiles disagree on land vs water (a coastline cut by a straight meridian on the globe),
//       rows where both are land but different sections (a region border on the seam), colour step across the seam.
// Poles: on an equirectangular sphere the whole top / bottom row shrinks to a point. Each tile's on-globe area ∝
//       sin(lat_top) − sin(lat_bottom), so a section's share of the globe's land AREA differs from its share of land TILES
//       (the number BLOOM's coverage % counts). Reported: the worst section's area-share / tile-share ratio per world.
"use strict";
const path = require("path"), fs = require("fs");
const ROOT = path.resolve(__dirname, "../../.."), argv = process.argv.slice(2);
const SEEDS = +(argv[argv.indexOf("--seeds") + 1] || 0) || 40;
for (const f of ["content/config.js", "content/traits.js", "planets/first_bloom.js", "content/archetypes.js", "resources/bloom-sim.js",
  "resources/bloom-gen.js", "resources/bloom-validate.js", "resources/bloom-witness.js", "resources/bloom-archetype.js"]) require(path.join(ROOT, f));
const { BLOOM, BLOOM_DATA } = globalThis, { config, traits, archetypes } = BLOOM_DATA;

(async () => {
  const P = await import(path.join(ROOT, "demos/planet-sphere/planet-projection.js"));
  const rows = [];
  for (const A of archetypes) for (let seed = 1; seed <= SEEDS; seed++) {
    let p; try { p = BLOOM.generateFromArchetype(A, seed, { config, traits }); } catch { rows.push({ archetype: A.id, seed, rejected: true }); continue; }
    const W = p.gridWidth, H = p.gridHeight, T = p.tilemap, s = P.seamStats(p, P.baseTileColors(p, A.render || null));
    const rowArea = y => { const a = Math.PI / 2 - y * Math.PI / H, b = Math.PI / 2 - (y + 1) * Math.PI / H; return Math.sin(a) - Math.sin(b); };
    const tiles = new Array(p.sections.length).fill(0), area = new Array(p.sections.length).fill(0); let landTiles = 0, landArea = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const k = T[y * W + x]; if (k < 0) continue; tiles[k]++; area[k] += rowArea(y); landTiles++; landArea += rowArea(y); }
    const ratio = tiles.map((n, i) => (area[i] / landArea) / (n / landTiles));
    const poleRow = y => { const set = new Set(); let land = 0; for (let x = 0; x < W; x++) { const k = T[y * W + x]; if (k >= 0) { land++; set.add(k); } } return { landTiles: land, sections: set.size }; };
    rows.push({ archetype: A.id, seed, name: p.name, seam: s, north: poleRow(0), south: poleRow(H - 1),
      worstSectionAreaVsTiles: +Math.min(...ratio).toFixed(2), bestSectionAreaVsTiles: +Math.max(...ratio).toFixed(2) });
  }
  const ok = rows.filter(r => !r.rejected), pct = (n, d) => Math.round(100 * n / d);
  const summary = { worlds: ok.length, rejectedSeeds: rows.length - ok.length, rowsPerWorld: 40,
    seamLandVsWaterRows: { mean: +(ok.reduce((a, r) => a + r.seam.landVsWater, 0) / ok.length).toFixed(1), max: Math.max(...ok.map(r => r.seam.landVsWater)),
      worldsWithAtLeast10: ok.filter(r => r.seam.landVsWater >= 10).length, worldsWithZero: ok.filter(r => r.seam.landVsWater === 0).length },
    worldsWhereASectionSpansTheSeam: ok.filter(r => r.seam.sameSection > 0).length,
    seamColourStepVsInterior: +(ok.reduce((a, r) => a + r.seam.meanSeamColourStep / Math.max(0.1, r.seam.meanInteriorColourStep), 0) / ok.length).toFixed(1),
    poleRowsWithLand: pct(ok.reduce((a, r) => a + (r.north.landTiles > 0) + (r.south.landTiles > 0), 0), 2 * ok.length) + "%",
    poleRowSectionsMean: +(ok.reduce((a, r) => a + r.north.sections + r.south.sections, 0) / (2 * ok.length)).toFixed(1),
    worstSectionAreaVsTiles: { mean: +(ok.reduce((a, r) => a + r.worstSectionAreaVsTiles, 0) / ok.length).toFixed(2), min: Math.min(...ok.map(r => r.worstSectionAreaVsTiles)) },
    bestSectionAreaVsTiles: { mean: +(ok.reduce((a, r) => a + r.bestSectionAreaVsTiles, 0) / ok.length).toFixed(2), max: Math.max(...ok.map(r => r.bestSectionAreaVsTiles)) },
    byArchetype: Object.fromEntries(archetypes.map(A => { const a = ok.filter(r => r.archetype === A.id);
      return [A.id, { worlds: a.length, meanLandVsWaterRows: +(a.reduce((s, r) => s + r.seam.landVsWater, 0) / a.length).toFixed(1), meanSectionBreakRows: +(a.reduce((s, r) => s + r.seam.sectionBreak, 0) / a.length).toFixed(1) }]; })) };
  fs.writeFileSync(path.join(__dirname, "seam-pole-survey.json"), JSON.stringify({ when: new Date().toISOString(), seeds: `1–${SEEDS}`, summary, worlds: rows }, null, 1));
  console.log(JSON.stringify(summary, null, 1));
})();
