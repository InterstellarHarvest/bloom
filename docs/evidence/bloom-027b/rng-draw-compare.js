// BLOOM-027B evidence: does the periodic noise keep the generator's RNG stream in step with the ae9c780 (rectangular) generator?
//   node docs/evidence/bloom-027b/rng-draw-compare.js <baseline-root> <after-root> <out.json>
// Each tree's bloom-gen.js is loaded in its own vm context with two textual hooks (identical in both trees): the generator's
// rng is wrapped to count draws, and a mark is recorded right after the terrain field and right after the moisture field.
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const [BASE, AFTER, OUT] = process.argv.slice(2).map((p, i) => i < 2 ? path.resolve(p) : p);
function load(root) {
  const ctx = vm.createContext({ console, __marks: null, __count: 0 });
  const run = (f, edit) => { let src = fs.readFileSync(path.join(root, f), "utf8"); if (edit) src = edit(src); vm.runInContext(src, ctx, { filename: f }); };
  run("content/config.js"); run("content/traits.js"); run("content/archetypes.js"); run("resources/bloom-sim.js");
  run("resources/bloom-gen.js", src => {
    const hooks = [["const rng = mulberry32(seed);", "const rng = (() => { const r = mulberry32(seed); root.__count = 0; return () => { root.__count++; return r(); }; })();"],
      ["const field = elevationField(rng, W, H, P.terrainWeights);", "const field = elevationField(rng, W, H, P.terrainWeights); root.__marks.terrain = root.__count;"],
      ["const moistField = elevationField(rng, W, H);", "const moistField = elevationField(rng, W, H); root.__marks.moisture = root.__count;"]];
    for (const [a, b] of hooks) { if (!src.includes(a)) throw new Error(`hook not found in ${root}: ${a}`); src = src.replace(a, b); }
    return src; });
  run("resources/bloom-validate.js"); run("resources/bloom-archetype.js");
  return ctx;
}
const B = load(BASE), A = load(AFTER), rows = [];
const cases = [];
for (const seed of [1, 2, 3, 7, 13, 25, 42, 2024, 12345]) for (const p of [{ waterPct: 0, sections: 14 }, { waterPct: 30, sections: 14, maxCrossingGap: 6 }, { waterPct: 60, sections: 14, maxCrossingGap: 6 }, { waterPct: 45, sections: 10, width: 48, height: 32 }]) cases.push({ seed, ...p });
for (const c of cases) {
  const r = {};
  for (const [k, ctx] of [["base", B], ["after", A]]) { ctx.__marks = {}; const p = ctx.BLOOM.generatePlanet(c); r[k] = { terrainDraws: ctx.__marks.terrain, seedStagePlusMoistureDraws: ctx.__marks.moisture - ctx.__marks.terrain, totalDraws: ctx.__count, sections: p.sections.length, landmasses: new Set(p.sections.map(s => s.landmass)).size, topology: p.topology || null };
    r[k].seedStageDraws = r[k].seedStagePlusMoistureDraws - 143; }
  rows.push({ params: c, ...r });
}
// the noise sampler draws, measured directly on the 027B production code
const cnt = () => { let n = 0; const rng = A.BLOOM.gen.mulberry32(5); return { rng: () => { n++; return rng(); }, n: () => n }; };
const direct = {}; for (const [cols, rows_] of [[3, 2], [6, 4], [11, 7]]) { const c = cnt(); const o = A.BLOOM.gen.noise.octave(c.rng, cols, rows_, 60, 40); direct[`octave ${cols}x${rows_}`] = { draws: c.n(), reported: o.draws, lattice: (cols + 1) * (rows_ + 1) }; }
{ const c = cnt(); A.BLOOM.gen.noise.elevationField(c.rng, 60, 40); direct.elevationField = c.n(); }
const same = rows.every(r => r.base.terrainDraws === r.after.terrainDraws && r.base.terrainDraws === 143);
const summary = { cases: rows.length, terrainDrawsBase: [...new Set(rows.map(r => r.base.terrainDraws))], terrainDrawsAfter: [...new Set(rows.map(r => r.after.terrainDraws))],
  noiseDrawCountPreserved: same, directSamplerDraws: direct,
  note: "The noise consumes 143 draws per field in both trees (12 + 35 + 96 lattice values; the ring's closing column is drawn and not read). Draws BETWEEN the terrain and moisture fields (section-seed picks) and after the moisture field (per-section conditions, names) depend on the generated geometry (number of landmasses, coast fractions, dry/volcanic short-circuits), which is what the cylinder legitimately changes, so those totals differ per world; the position of every draw relative to its stage is unchanged.",
  rows };
fs.writeFileSync(OUT, JSON.stringify(summary, null, 1));
console.log(JSON.stringify({ ...summary, rows: rows.slice(0, 4) }, null, 1));
