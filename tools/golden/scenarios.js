// BLOOM — golden First Bloom scenarios (shared by the Node check and the browser capture).
// Everything runs through a small adapter so the SAME scenarios can drive the
// pre-extraction demo (browser globals) and the extracted engine (Node).
//
// adapter = {
//   reset(seed)                    fresh run with Math.random seeded (mulberry32)
//   tick()  buy(id)  addBiomass(x)
//   read() -> {biomass, ticks, won, tiles, vigor, bubbles}
//   setCondition({genome, sky, tf})  evaluate(i)  previewOf(id)  price(id)
//   traitIds  sectionCount  map -> {tilemap, area, cent}
// }
(function (root) {
  "use strict";
  function mulberry32(a) {
    return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function fnv(arr) { let h = 0x811c9dc5; for (let i = 0; i < arr.length; i++) { h ^= arr[i] & 0xff; h = Math.imul(h, 0x01000193) >>> 0; h ^= (arr[i] >> 8) & 0xff; h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16); }

  const G0 = { cold: 0, heat: 0, waterArm: null, waterPts: 0, salt: 0, rad: 0, seedOut: 0, earlyMat: 0 };
  const CONDITIONS = {
    start:      { genome: { ...G0 }, sky: { temp: 6, moist: 50 } },
    wetBuild:   { genome: { ...G0, cold: 2, heat: 1, waterArm: "wet", waterPts: 1, salt: 1 }, sky: { temp: 6, moist: 50 } },
    dryBuild:   { genome: { ...G0, cold: 2, heat: 1, waterArm: "dry", waterPts: 1, salt: 1 }, sky: { temp: 6, moist: 50 } },
    floodII:    { genome: { ...G0, cold: 2, heat: 1, waterArm: "wet", waterPts: 2, salt: 1 }, sky: { temp: 6, moist: 50 } },
    shielded:   { genome: { ...G0, heat: 3, rad: 1, seedOut: 2, earlyMat: 1 }, sky: { temp: 6, moist: 50 } },
    hotWetSky:  { genome: { ...G0, cold: 1 }, sky: { temp: 18, moist: 74 } },
    coldDrySky: { genome: { ...G0, heat: 1, waterArm: "dry", waterPts: 2 }, sky: { temp: -6, moist: 26 } },
  };
  const RUNS = {
    wet:        { seed: 11, plan: ["seedOut", "cold", "flood", "cold", "heat", "salt", "earlyMat", "seedOut"] },
    dry:        { seed: 22, plan: ["seedOut", "cold", "drought", "cold", "heat", "salt", "earlyMat", "seedOut"] },
    terraform:  { seed: 33, plan: ["seedOut", "humid", "cold", "cool", "salt", "flood", "warm", "dry", "earlyMat"] },
    generalist: { seed: 44, grant: 99999, plan: ["seedOut", "seedOut", "earlyMat", "cold", "cold", "heat", "salt", "rad"] },
  };
  const TICKS = 2400, EVERY = 100;

  // one part per fresh run, so a browser capture can load a clean page for each
  const PARTS = ["static", ...Object.keys(RUNS)];
  function runPart(A, part) {
    if (part === "static") {
      const out = { map: null, evals: {}, previews: {}, prices: {} };
      A.reset(1);
      out.map = { tilemap: fnv(A.map.tilemap), area: Array.from(A.map.area), cent: A.map.cent.map(c => [c.x, c.y]) };
      for (const [name, c] of Object.entries(CONDITIONS)) {
        A.setCondition(c);
        out.evals[name] = Array.from({ length: A.sectionCount }, (_, i) => {
          const e = A.evaluate(i);
          return { fitness: e.fitness, growthMod: e.growthMod, limitKey: e.limitKey, limitF: e.limitF, effT: e.effT, effM: e.effM,
            cats: Object.fromEntries(Object.entries(e.cats).map(([k, v]) => [k, [v.f, v.word, !!v.soft]])) };
        });
        out.previews[name] = Object.fromEntries(A.traitIds.map(id => { const p = A.previewOf(id); return [id, p ? [p.gain, p.lose] : null]; }));
        out.prices[name] = Object.fromEntries(A.traitIds.map(id => [id, A.price(id)]));
      }
      return out;
    }
    const r = RUNS[part];
    A.reset(r.seed); if (r.grant) A.addBiomass(r.grant);
    let i = 0; const trace = [], buys = [];
    for (let t = 1; t <= TICKS; t++) {
      A.tick();
      if (i < r.plan.length && A.buy(r.plan[i])) { buys.push([r.plan[i], t]); i++; }
      if (t % EVERY === 0) { const s = A.read();
        trace.push([s.ticks, s.biomass, fnv(s.tiles), Array.from(s.vigor).reduce((a, b) => a + b, 0), s.bubbles, s.won]); }
    }
    return { buys, trace };
  }
  function runGolden(A) { const out = {}; for (const p of PARTS) out[p] = runPart(A, p); return out; }
  const api = { runGolden, runPart, PARTS, mulberry32, fnv, CONDITIONS, RUNS };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.BLOOM_GOLDEN = api;
})(typeof window !== "undefined" ? window : globalThis);
