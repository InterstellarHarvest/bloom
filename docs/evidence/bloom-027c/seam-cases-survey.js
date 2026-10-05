// BLOOM-027C evidence: survey the PRODUCTION archetype path (generateFromArchetype, winnability on — what the game plays)
// for Ocean Archipelago / Desert World / Frozen World × public seeds 1–40, and characterise what sits across the texture cut
// (column x = 59 | x = 0, longitude zero of the 2:1 texture). Picks the evidence set captured on the globe.
//   node docs/evidence/bloom-027c/seam-cases-survey.js            → seam-cases-survey.json (+ a summary on stdout)
// Read-only: imports the production modules and the spike's projection module; changes nothing.
"use strict";
const path = require("path"), fs = require("fs");
const ROOT = path.resolve(__dirname, "../../.."), OUT = path.join(__dirname, "seam-cases-survey.json");
for (const f of ["content/config.js", "content/traits.js", "planets/first_bloom.js", "content/archetypes.js", "resources/bloom-sim.js",
  "resources/bloom-gen.js", "resources/bloom-validate.js", "resources/bloom-witness.js", "resources/bloom-archetype.js"]) require(path.join(ROOT, f));
const { BLOOM, BLOOM_DATA } = globalThis, { config, traits, archetypes } = BLOOM_DATA, geo = BLOOM.geo;
const r3 = v => Math.round(v * 1000) / 1000;

// Rows the yaw-only, equator-on globe shows comfortably: a tile row spanning latitudes [a, b] has on-screen height ∝ |sin b − sin a|
// at the central meridian. VISIBLE = rows whose height is ≥ 60 % of an equator row (|lat| ≲ 53°): rows 8–31 of 40.
const H0 = 40, rowLat = y => [90 - 180 * y / H0, 90 - 180 * (y + 1) / H0], deg = Math.PI / 180;
const rowHeight = y => { const [a, b] = rowLat(y); return Math.abs(Math.sin(a * deg) - Math.sin(b * deg)) / Math.sin(180 / H0 * deg); };
const VIS = y => rowHeight(y) >= 0.6;
// Yaw-only horizon: with pitch fixed at 0 and the camera at distance d, a surface point is visible only within acos(1/d) of the
// view direction, so latitudes beyond acos(1/d) are NEVER on screen at any yaw. Spike camera: default d = 4.2 (76.2°), zoom
// range 1.45 … 6 (max zoom-out 80.4°). A row is hidden when its most equatorial latitude is beyond that limit.
const horizonLat = d => Math.acos(1 / d) / deg, rowMinAbsLat = y => Math.min(...rowLat(y).map(Math.abs));
const HIDDEN_DEFAULT = y => rowMinAbsLat(y) >= horizonLat(4.2), HIDDEN_ALWAYS = y => rowMinAbsLat(y) >= horizonLat(6);

function runs(flags) { // longest run of true values, plus where it starts
  let best = 0, at = -1, cur = 0; flags.forEach((f, i) => { cur = f ? cur + 1 : 0; if (cur > best) { best = cur; at = i - cur + 1; } }); return { len: best, start: at };
}

function survey(p) {
  const W = p.gridWidth, H = p.gridHeight, T = p.tilemap, SC = p.sections.length, E = W - 1;
  const L = y => T[y * W + E], R = y => T[y * W]; // west side of the cut (x = 59) | east side (x = 0)
  const rows = Array.from({ length: H }, (_, y) => { const a = L(y), b = R(y);
    return a >= 0 && b >= 0 ? (a === b ? "same" : "diff") : a >= 0 || b >= 0 ? "coast" : "water"; });
  // same-id sections across the cut: rows, and how much of the section lies on each half of the map (a "strong" span has bulk on both)
  const spans = [];
  for (let s = 0; s < SC; s++) {
    const ys = rows.map((k, y) => k === "same" && L(y) === s);
    if (!ys.some(Boolean)) continue;
    let west = 0, east = 0; for (let i = 0; i < W * H; i++) if (T[i] === s) (i % W >= W / 2 ? west++ : east++);
    const run = runs(ys);
    spans.push({ section: s, id: p.sections[s].id, name: p.sections[s].name, rows: ys.filter(Boolean).length, visibleRows: ys.filter((f, y) => f && VIS(y)).length,
      run: run.len, runStart: run.start, tilesWestHalf: west, tilesEastHalf: east, balance: Math.min(west, east) });
  }
  // different sections meeting across the cut: per unordered pair, rows of contact
  const pairs = new Map();
  rows.forEach((k, y) => { if (k !== "diff") return; const key = [L(y), R(y)].join("|"); const e = pairs.get(key) || { west: L(y), east: R(y), rows: 0, visibleRows: 0, ys: [] };
    e.rows++; if (VIS(y)) e.visibleRows++; e.ys.push(y); pairs.set(key, e); });
  const contacts = [...pairs.values()].map(e => ({ ...e, westId: p.sections[e.west].id, eastId: p.sections[e.east].id })).sort((a, b) => b.visibleRows - a.visibleRows);
  // the landmass the cut runs through (cylinder components) and whether reading it as a rectangle would split it
  const land = Array.from(T, v => (v >= 0 ? 1 : 0)), cyl = geo.components(land, W, H, geo.CYLINDER), rect = geo.components(land, W, H, geo.RECT);
  const lmAcross = new Set(); rows.forEach((k, y) => { if (k === "same" || k === "diff") lmAcross.add(cyl.id[y * W]); });
  const landmasses = [...lmAcross].map(c => { const tiles = []; cyl.id.forEach((v, i) => v === c && tiles.push(i)); const rectPieces = new Set(tiles.map(i => rect.id[i])).size;
    return { size: cyl.sizes[c], rectPieces, rowsAcross: rows.filter((k, y) => (k === "same" || k === "diff") && cyl.id[y * W] === c).length }; });
  // coastline crossing the cut: going down the cut, both sides switch land ↔ water together (a coast running east–west through it)
  let coastCross = 0, coastCrossVisible = 0;
  for (let y = 0; y + 1 < H; y++) { const a = rows[y], b = rows[y + 1], landA = a === "same" || a === "diff", landB = b === "same" || b === "diff";
    if ((landA && b === "water") || (a === "water" && landB) || (a === "coast" && b !== "coast") || (a !== "coast" && b === "coast")) { coastCross++; if (VIS(y) && VIS(y + 1)) coastCrossVisible++; } }
  const water = runs(rows.map(k => k === "water")), waterVis = rows.filter((k, y) => k === "water" && VIS(y)).length;
  // polar-row exposure under yaw-only: land tiles / whole sections that live only in rows beyond the horizon
  let landHidden = 0, landHiddenAlways = 0; for (let i = 0; i < W * H; i++) if (T[i] >= 0) { const y = Math.floor(i / W); if (HIDDEN_DEFAULT(y)) landHidden++; if (HIDDEN_ALWAYS(y)) landHiddenAlways++; }
  const shown = new Array(SC).fill(false), shownZoomOut = new Array(SC).fill(false), best = new Array(SC).fill(0);
  for (let i = 0; i < W * H; i++) if (T[i] >= 0) { const y = Math.floor(i / W); if (!HIDDEN_DEFAULT(y)) shown[T[i]] = true; if (!HIDDEN_ALWAYS(y)) shownZoomOut[T[i]] = true; best[T[i]] = Math.max(best[T[i]], rowHeight(y)); }
  const originIdx = p.sections.findIndex(x => x.id === p.origin);
  const hiddenSections = shown.map((v, s) => (v ? null : { id: p.sections[s].id, name: p.sections[s].name, tiles: T.filter(t => t === s).length, visibleAtMaxZoomOut: shownZoomOut[s] })).filter(Boolean);
  return {
    topology: p.topology, W, H, sections: SC, waterPct: p.archetype.actualWaterPct, landmasses: p.archetype.landmasses,
    cutRows: { same: rows.filter(k => k === "same").length, diff: rows.filter(k => k === "diff").length, coast: rows.filter(k => k === "coast").length, water: rows.filter(k => k === "water").length },
    cutRowsVisible: { same: rows.filter((k, y) => k === "same" && VIS(y)).length, diff: rows.filter((k, y) => k === "diff" && VIS(y)).length,
      coast: rows.filter((k, y) => k === "coast" && VIS(y)).length, water: waterVis },
    rowPattern: rows.map(k => ({ same: "S", diff: "D", coast: "c", water: "~" })[k]).join(""),
    spans: spans.sort((a, b) => b.balance * b.visibleRows - a.balance * a.visibleRows), contacts, landmassesAcross: landmasses,
    coastCross, coastCrossVisible, waterRun: water.len, waterRunStart: water.start,
    polar: { landTilesHiddenAtDefaultZoom: landHidden, landTilesHiddenAtAnyZoom: landHiddenAlways, hiddenSections, originHidden: originIdx >= 0 && !shown[originIdx],
      minBestRowHeight: r3(Math.min(...best)), originBestRowHeight: originIdx >= 0 ? r3(best[originIdx]) : null },
  };
}

const t0 = Date.now(), worlds = [];
for (const A of archetypes) for (let seed = 1; seed <= 40; seed++) {
  let p; try { p = BLOOM.generateFromArchetype(A, seed, { config, traits }); } catch (e) { worlds.push({ archetype: A.id, seed, error: String(e.message).slice(0, 200) }); continue; }
  worlds.push({ archetype: A.id, seed, name: p.name, attempt: p.archetype.attempt, ...survey(p) });
}
const ok = worlds.filter(w => !w.error);

// ---- evidence picks (each case must sit in rows the yaw-only globe shows well)
const top = (arr, score) => arr.map(w => ({ w, s: score(w) })).filter(x => x.s > 0).sort((a, b) => b.s - a.s);
const pick = {
  sectionSpan: top(ok, w => (w.spans[0] ? w.spans[0].balance * w.spans[0].visibleRows : 0)),
  landmassSpan: top(ok, w => Math.max(0, ...w.landmassesAcross.map(l => l.rowsAcross * (l.rectPieces > 1 ? 1 : 0.5))) * (w.cutRowsVisible.same + w.cutRowsVisible.diff)),
  coastCross: top(ok, w => w.coastCrossVisible * 10 + w.cutRowsVisible.water + w.cutRowsVisible.same),
  diffContact: top(ok, w => (w.contacts[0] ? w.contacts[0].visibleRows : 0) * 10 + w.cutRowsVisible.diff),
  mostlyWater: top(ok, w => w.cutRowsVisible.water * 10 + w.waterRun),
};
const brief = x => x.slice(0, 6).map(({ w, s }) => `${w.archetype}#${w.seed}(${r3(s)}) ${w.rowPattern}`);
const byArch = id => ok.filter(w => w.archetype === id);
const sum = (arr, f) => arr.reduce((a, w) => a + f(w), 0);
const summary = Object.fromEntries(archetypes.map(A => { const a = byArch(A.id); return [A.id, {
  accepted: a.length, failed: worlds.filter(w => w.archetype === A.id && w.error).map(w => w.seed), cylinders: a.filter(w => w.topology.wrapX === true && w.topology.wrapY === false).length,
  gridAll60x40: a.every(w => w.W === 60 && w.H === 40),
  worldsWithSameIdAcrossCut: a.filter(w => w.cutRows.same > 0).length, worldsWithDiffContact: a.filter(w => w.cutRows.diff > 0).length,
  worldsWithCoastCross: a.filter(w => w.coastCross > 0).length, worldsWithWaterAcross: a.filter(w => w.cutRows.water > 0).length,
  meanCutRows: { same: r3(sum(a, w => w.cutRows.same) / a.length), diff: r3(sum(a, w => w.cutRows.diff) / a.length), coast: r3(sum(a, w => w.cutRows.coast) / a.length), water: r3(sum(a, w => w.cutRows.water) / a.length) },
  polar: { meanLandTilesHiddenAtDefaultZoom: r3(sum(a, w => w.polar.landTilesHiddenAtDefaultZoom) / a.length), meanLandPctHiddenAtDefaultZoom: r3(100 * sum(a, w => w.polar.landTilesHiddenAtDefaultZoom / Math.max(1, w.W * w.H * (1 - w.waterPct / 100))) / a.length),
    meanLandTilesHiddenAtAnyZoom: r3(sum(a, w => w.polar.landTilesHiddenAtAnyZoom) / a.length),
    worldsWithAHiddenSection: a.filter(w => w.polar.hiddenSections.length).map(w => w.seed), worldsWithASectionHiddenAtAnyZoom: a.filter(w => w.polar.hiddenSections.some(h => !h.visibleAtMaxZoomOut)).map(w => w.seed),
    worldsWithOriginHidden: a.filter(w => w.polar.originHidden).length },
}]; }));
const out = { generated: new Date().toISOString(), ms: Date.now() - t0,
  hiddenRowsDefaultZoom: Array.from({ length: H0 }, (_, y) => y).filter(HIDDEN_DEFAULT), hiddenRowsAnyZoom: Array.from({ length: H0 }, (_, y) => y).filter(HIDDEN_ALWAYS), visibleRows: Array.from({ length: H0 }, (_, y) => y).filter(VIS), rowHeights: Array.from({ length: H0 }, (_, y) => r3(rowHeight(y))),
  legend: "rowPattern per row y=0..39 across the cut: S same section both sides · D different sections · c land one side / water the other · ~ water both sides",
  summary, picks: Object.fromEntries(Object.entries(pick).map(([k, v]) => [k, brief(v)])), worlds };
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log(JSON.stringify({ ms: out.ms, hiddenRowsDefaultZoom: out.hiddenRowsDefaultZoom.join(","), hiddenRowsAnyZoom: out.hiddenRowsAnyZoom.join(","), visibleRows: `${out.visibleRows[0]}–${out.visibleRows[out.visibleRows.length - 1]}`, summary, picks: out.picks }, null, 1));
