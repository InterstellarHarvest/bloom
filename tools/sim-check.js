// BLOOM — engine/content boundary checks, in plain Node (no browser, no dependencies).
//
//   node tools/sim-check.js            verify against tools/golden/first_bloom.json
//   node tools/sim-check.js --write    regenerate the golden (ONLY for an intended retune — say so in the commit)
//
// The golden was first captured from the pre-extraction demos/demo-run.html (adc87d0) under a
// seeded RNG, so a match proved the extracted engine + content reproduced the accepted slice
// bit-for-bit: layout, category evaluation, previews, prices, and full 2400-tick runs.
// BLOOM-008 (owner-authorized gameplay retune: colony establishment + Colony Focus) and BLOOM-009 (owner-authorized
// retune: per-region allocation + local specializations, smaller seedlings, slower thickening) regenerated the run
// parts on purpose; the static part (layout, evaluation, previews, prices) is unchanged from adc87d0.
"use strict";
const fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "..");
for (const f of ["content/config.js", "content/traits.js", "planets/first_bloom.js", "resources/bloom-sim.js"]) require(path.join(ROOT, f));
const { BLOOM, BLOOM_DATA } = globalThis;
const GOLD = require("./golden/scenarios.js");
const GOLDEN_PATH = path.join(__dirname, "golden/first_bloom.json");

let fails = 0;
const check = (ok, name, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); if (!ok) fails++; };
const clone = o => JSON.parse(JSON.stringify(o));

// the golden pins the traits that existed when it was captured (adc87d0); traits added later are
// checked separately below (not offered on First Bloom, and unpurchased they change nothing)
function adapter(planet, config, traits, goldenIds) {
  let sim;
  return {
    reset(seed) { sim = BLOOM.createSim(planet, config, traits, { rng: GOLD.mulberry32(seed) }); },
    tick() { sim.tick(); }, buy(id) { return sim.buy(id); }, addBiomass(x) { sim.biomass += x; },
    read() { return { biomass: sim.biomass, ticks: sim.ticks, won: sim.won, tiles: sim.state, vigor: sim.vigor, dens: sim.dens, bubbles: sim.bubbles.length }; },
    setColonyFocus(id, mode) { return sim.setColonyFocus(sim.map.SIDX[id], mode); },
    buySpecialization(id, spec) { return sim.buySpecialization(sim.map.SIDX[id], spec); },
    colonies() { return { focus: [...sim.colonies.focus], spec: [...sim.colonies.spec] }; },
    setCondition(c) { Object.assign(sim.genome, c.genome); Object.assign(sim.sky, c.sky); for (const k in sim.tf) sim.tf[k] = 0; Object.assign(sim.tf, c.tf || {}); },
    evaluate(i) { return sim.evaluate(i); }, previewOf(id) { return sim.previewOf(id); }, price(id) { return sim.price(sim.traitById[id]); },
    traitIds: traits.map(t => t.id).filter(id => !goldenIds || goldenIds.includes(id)),
    get sectionCount() { return sim.map.SC; },
    get map() { return { tilemap: sim.map.TILEMAP, area: sim.map.AREA, cent: sim.map.CENT }; },
  };
}
function firstDiff(a, b, p = "") {
  if (typeof a !== typeof b || Array.isArray(a) !== Array.isArray(b)) return `${p}: ${JSON.stringify(a)} vs ${JSON.stringify(b)}`;
  if (a && typeof a === "object") { for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) { const d = firstDiff(a[k], b[k], `${p}.${k}`); if (d) return d; } return null; }
  return a === b ? null : `${p}: ${JSON.stringify(a)} vs ${JSON.stringify(b)}`;
}

const { config, traits } = BLOOM_DATA, planet = BLOOM_DATA.planets.first_bloom;

// 1 · golden equivalence
const WRITE = process.argv.includes("--write");
// the pinned trait set stays the golden's own (the 12 adc87d0 traits) even when the runs are rewritten
const goldenIds = fs.existsSync(GOLDEN_PATH) ? Object.keys(JSON.parse(fs.readFileSync(GOLDEN_PATH, "utf8")).static.prices.start) : null;
const got = GOLD.runGolden(adapter(planet, config, traits, goldenIds));
if (WRITE) { fs.writeFileSync(GOLDEN_PATH, JSON.stringify(got)); console.log("golden written:", GOLDEN_PATH); }
const want = JSON.parse(fs.readFileSync(GOLDEN_PATH, "utf8"));
for (const part of GOLD.PARTS) {
  const d = firstDiff(JSON.parse(JSON.stringify(got[part])), want[part], part);
  const extra = part === "static" ? "layout, 7 conditions × 9 sections, previews, prices"
    : `buys ${got[part].buys.map(b => b.join("@")).join(" ")} · final cov-hash ${got[part].trace.at(-1)[2]} won=${got[part].trace.at(-1)[5]}`;
  check(!d, `golden ${part} matches bit-for-bit`, d || extra);
}

// 2 · content is pure data (no functions / code hidden in config, traits, planet)
for (const [name, obj] of [["config", config], ["traits", traits], ["first_bloom", planet]])
  check(JSON.stringify(clone(obj)) === JSON.stringify(obj) && !/function|=>/.test(JSON.stringify(obj)), `${name} is plain JSON-shaped data`);
const KNOWN = new Set(["tempPoint", "waterArm", "level", "sky", "crossing"]);
check(traits.every(t => t.id && t.board && t.name && KNOWN.has(t.effect.type) && Number.isFinite(t.cost.base) && Number.isFinite(t.cost.step)),
  "every trait has id/board/name/known effect type/cost");
check(traits.filter(t => t.board !== "Terraform").every(t => typeof t.science === "string" && t.science.length > 20),
  "every Adapt/Spread trait carries its one-line science explanation");

{ // traits added after the golden: First Bloom has no water, so a crossing trait is not offered there
  const later = traits.filter(t => !goldenIds || !goldenIds.includes(t.id));
  const s = BLOOM.createSim(planet, config, traits, { rng: GOLD.mulberry32(1) }); s.biomass = 1e9;
  check(later.every(t => !s.offered(t) && !s.buy(t.id)) && s.map.CROSSINGS.links.length === 0,
    "traits added after the golden are not offered on First Bloom (no water → no crossings)", later.map(t => t.name).join(", ") || "none");
}

// 3 · the engine has no DOM dependency
const src = fs.readFileSync(path.join(ROOT, "resources/bloom-sim.js"), "utf8").replace(/\/\/.*$/gm, "");
check(!/\bdocument\b|\bwindow\.(?!BLOOM)|localStorage|requestAnimationFrame/.test(src.replace(/typeof window !== "undefined" \? window/, "")), "resources/bloom-sim.js touches no DOM/browser APIs");

// 4 · balance really comes from config (change a number → behavior follows)
{
  const c2 = clone(config); c2.econ.costScale = 1; c2.econ.startBiomass = 0;
  const s = BLOOM.createSim(planet, c2, traits, { rng: GOLD.mulberry32(5) });
  check(s.price(s.traitById.cold) === 28 && s.biomass === 0, "prices + starting biomass follow config.econ", `cold=${s.price(s.traitById.cold)}`);
  const c3 = clone(config); c3.win = 0.05;
  const w = BLOOM.createSim(planet, c3, traits, { rng: GOLD.mulberry32(5) }); let t = 0; while (!w.won && t < 2000) { w.tick(); t++; }
  check(w.won && t < 400, "win threshold follows config.win", `won at tick ${t}`);
  const c4 = clone(config); c4.categories.originFitnessFloor = 0.9;
  const o = BLOOM.createSim(planet, c4, traits); o.sky.temp = -60;
  check(Math.abs(o.evaluate(o.map.ORIGIN).fitness - 0.9) < 1e-9, "category boundaries follow config.categories");
}

// 5 · a second planet runs on the same engine with no engine changes (next step: procedural planets)
{
  const tiny = { id: "test_trio", name: "Test Trio", gridWidth: 30, gridHeight: 20, origin: "a", winThreshold: 0.6,
    globalClimate: { temperature: 10, moisture: 50 },
    sections: ["a", "b", "c"].map((id, k) => ({ id, name: id.toUpperCase(), isOrigin: k === 0, area: 100, center: { x: 0.2 + 0.3 * k, y: 0.5 },
      local: { tempOffset: [0, 4, 30][k], moistureOffset: 0, light: 70, ph: 6.8, salinity: 0, toxicity: 0, radiation: 8, nutrients: 60 } })) };
  const s = BLOOM.createSim(tiny, config, traits, { rng: GOLD.mulberry32(9) });
  let t = 0; while (!s.won && t < 3000) { s.tick(); t++; }
  const byS = s.livingCountBySection();
  check(s.won && s.map.SC === 3 && byS[2] === 0, "a second (synthetic) planet runs on the unchanged engine and respects its own winThreshold",
    `won at tick ${t}, hot section c stays barren (${byS[2]} living)`);
  // BLOOM-003: water/impassable terrain is supported (full coverage in tools/gen-check.js); malformed terrain is still refused
  const wet = { ...tiny, sections: [tiny.sections[0], { ...tiny.sections[1], id: "sea", name: "Sea", kind: "water" }, tiny.sections[2]] };
  const ws = BLOOM.createSim(wet, config, traits, { rng: GOLD.mulberry32(9) });
  check(ws.map.SC === 2 && ws.map.impassable.length === 1 && ws.map.LAND < ws.map.N && ws.map.LAND_TILES.every(i => ws.map.TILEMAP[i] >= 0),
    "engine models a kind:\"water\" section as impassable and leaves it out of the denominator", `LAND ${ws.map.LAND}/${ws.map.N}`);
  let threw = false; try { BLOOM.createSim({ ...wet, sections: wet.sections.map(x => x.id === "sea" ? { ...x, kind: "magma_ocean" } : x) }, config, traits); } catch { threw = true; }
  check(threw, "engine still refuses unknown terrain kinds (guard narrowed, not removed)");
}

console.log(fails ? `\n${fails} check(s) FAILED` : "\nALL CHECKS PASS");
process.exit(fails ? 1 : 0);
