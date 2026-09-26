// BLOOM — engine/content boundary checks, in plain Node (no browser, no dependencies).
//
//   node tools/sim-check.js            verify against tools/golden/first_bloom.json
//   node tools/sim-check.js --write    regenerate the golden (ONLY for an intended retune — say so in the commit)
//
// The golden was first captured from the pre-extraction demos/demo-run.html (adc87d0) under a
// seeded RNG, so a match proves the extracted engine + content reproduce the accepted slice
// bit-for-bit: layout, category evaluation, previews, prices, and four full 2400-tick runs.
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

function adapter(planet, config, traits) {
  let sim;
  return {
    reset(seed) { sim = BLOOM.createSim(planet, config, traits, { rng: GOLD.mulberry32(seed) }); },
    tick() { sim.tick(); }, buy(id) { return sim.buy(id); }, addBiomass(x) { sim.biomass += x; },
    read() { return { biomass: sim.biomass, ticks: sim.ticks, won: sim.won, tiles: sim.state, vigor: sim.vigor, bubbles: sim.bubbles.length }; },
    setCondition(c) { Object.assign(sim.genome, c.genome); Object.assign(sim.sky, c.sky); for (const k in sim.tf) sim.tf[k] = 0; Object.assign(sim.tf, c.tf || {}); },
    evaluate(i) { return sim.evaluate(i); }, previewOf(id) { return sim.previewOf(id); }, price(id) { return sim.price(sim.traitById[id]); },
    traitIds: traits.map(t => t.id),
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
const got = GOLD.runGolden(adapter(planet, config, traits));
if (process.argv.includes("--write")) { fs.writeFileSync(GOLDEN_PATH, JSON.stringify(got)); console.log("golden written:", GOLDEN_PATH); }
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
const KNOWN = new Set(["tempPoint", "waterArm", "level", "sky"]);
check(traits.every(t => t.id && t.board && t.name && KNOWN.has(t.effect.type) && Number.isFinite(t.cost.base) && Number.isFinite(t.cost.step)),
  "every trait has id/board/name/known effect type/cost");
check(traits.filter(t => t.board !== "Terraform").every(t => typeof t.science === "string" && t.science.length > 20),
  "every Adapt/Spread trait carries its one-line science explanation");

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
  let threw = false; try { BLOOM.createSim({ ...tiny, sections: [...tiny.sections, { ...tiny.sections[1], id: "sea", kind: "water" }] }, config, traits); } catch { threw = true; }
  check(threw, "engine refuses water/impassable sections until procedural reconnection adds them");
}

console.log(fails ? `\n${fails} check(s) FAILED` : "\nALL CHECKS PASS");
process.exit(fails ? 1 : 0);
