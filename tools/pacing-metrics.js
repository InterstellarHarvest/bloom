// BLOOM — deterministic opening / pacing metrics (BLOOM-008). Plain Node, no browser.
//
//   node tools/pacing-metrics.js [--json <out.json>] [--seeds N] [--no-procedural]
//
// Measures, under seeded mulberry32 RNGs (averaged over N run seeds, default 8):
//   · autonomous growth (no purchases): living coverage + Biomass at 30 / 60 / 120 / 180 s, and the origin's
//     living share / vigor / colony establishment at those points;
//   · first NORMAL upgrade: the first moment the cheapest shop trait is affordable (no purchases made);
//   · full runs: a bot that buys a known recipe 4 s after each upgrade becomes affordable (as tools/slice-check.js
//     does through real buttons) → first-purchase and win times;
//   · each of the above with no allocation and with Roots / Leaves / Seeds held on the origin from t = 0
//     (BLOOM-008 engine: its one global Colony Focus on the origin; BLOOM-009+: the origin's own allocation — so the
//     same tool captures the earlier baselines; per-region strategies are tools/colony-study.js);
//   · the first-upgrade time again with Biomass bubbles switched off (bubbles are a large, random share of early
//     income, so this isolates what the colony itself — and its focus — earns).
// Procedural worlds (Ocean Archipelago seeds 13 and 8) run the recipe the accepted world's first strategy used.
"use strict";
const fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "..");
for (const f of ["content/config.js", "content/traits.js", "content/archetypes.js", "planets/first_bloom.js", "resources/bloom-sim.js",
  "resources/bloom-gen.js", "resources/bloom-validate.js", "resources/bloom-witness.js", "resources/bloom-archetype.js"]) require(path.join(ROOT, f));
const { BLOOM, BLOOM_DATA } = globalThis, { config, traits } = BLOOM_DATA;
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const NSEEDS = +arg("--seeds", 8), OUT = arg("--json", null), PROC = !process.argv.includes("--no-procedural");
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const TPS = 1000 / config.tickMs, MARKS = [30, 60, 120, 180], REACT = 25;
const probe = BLOOM.createSim(BLOOM_DATA.planets.first_bloom, config, traits, { rng: () => 0.5 });
const HAS_REGION = typeof probe.setColonyFocus === "function", HAS_FOCUS = HAS_REGION || typeof probe.setFocus === "function";
const MODES = HAS_FOCUS ? [null, ...Object.keys((config.colony || config.focus).modes)] : [null];
const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length;
const r1 = x => x === null || x === undefined ? null : Math.round(x * 10) / 10;

function make(planet, seed, mode, cfg = config) {
  const sim = BLOOM.createSim(planet, cfg, traits, { rng: mulberry32(seed) });
  if (mode) HAS_REGION ? sim.setColonyFocus(sim.map.ORIGIN, mode) : sim.setFocus(sim.map.ORIGIN, mode);
  return sim;
}
const originEst = sim => HAS_FOCUS ? sim.establishment(sim.map.ORIGIN) : null;
const NOBUB = JSON.parse(JSON.stringify(config)); NOBUB.econ.bubbleChance = 0;
function firstAffordNoBubbles(planet, seed, mode) {
  const sim = make(planet, seed, mode, NOBUB), cheapest = Math.min(...traits.filter(t => sim.offered(t)).map(t => sim.price(t)));
  for (let t = 1; t < 6000; t++) { sim.tick(); if (sim.biomass >= cheapest) return t / TPS; } return null;
}
function autonomous(planet, seed, mode) {
  const sim = make(planet, seed, mode), M = sim.map, marks = {}, cheapest = Math.min(...traits.filter(t => sim.offered(t)).map(t => sim.price(t)));
  let firstAfford = null;
  for (let t = 1; t <= Math.round(180 * TPS); t++) {
    const cov = sim.tick();
    if (firstAfford === null && sim.biomass >= cheapest) firstAfford = t / TPS;
    for (const s of MARKS) if (t === Math.round(s * TPS)) marks[s] = { cov, bio: sim.biomass,
      originShare: sim.livingCountBySection()[M.ORIGIN] / M.AREA[M.ORIGIN], originVigor: sim.vigor[M.ORIGIN], originEst: originEst(sim) };
  }
  for (let t = Math.round(180 * TPS) + 1; firstAfford === null && t < 6000; t++) { sim.tick(); if (sim.biomass >= cheapest) firstAfford = t / TPS; }
  return { marks, firstAfford };
}
function botRun(planet, seed, mode, plan, maxTicks = 12000) {
  const sim = make(planet, seed, mode); let i = 0, affordAt = null; const buys = [];
  for (let t = 1; t <= maxTicks; t++) {
    sim.tick(); if (sim.won) return { win: t / TPS, buys };
    if (i < plan.length) { const tr = sim.traitById[plan[i]];
      if (sim.canBuy(tr) && sim.biomass >= sim.price(tr)) { affordAt ??= t; if (t - affordAt >= REACT && sim.buy(plan[i])) { buys.push(r1(t / TPS)); i++; affordAt = null; } } }
  }
  return { win: null, buys };
}
function summarize(planet, plans, seeds) {
  const out = {};
  for (const mode of MODES) {
    const key = mode || "none", A = seeds.map(s => autonomous(planet, s, mode));
    const row = { autonomous: {}, firstAffordableSeconds: r1(mean(A.map(a => a.firstAfford))),
      firstAffordableNoBubblesSeconds: r1(mean(seeds.map(s => firstAffordNoBubbles(planet, s, mode)))) };
    for (const s of MARKS) row.autonomous[s] = { coveragePct: r1(100 * mean(A.map(a => a.marks[s].cov))), biomass: r1(mean(A.map(a => a.marks[s].bio))),
      originLivingPct: r1(100 * mean(A.map(a => a.marks[s].originShare))), originVigor: +mean(A.map(a => a.marks[s].originVigor)).toFixed(3),
      originEstablishment: HAS_FOCUS ? +mean(A.map(a => a.marks[s].originEst)).toFixed(3) : null };
    row.runs = {};
    for (const [name, plan] of Object.entries(plans)) {
      const R = seeds.map(s => botRun(planet, s, mode, plan)), wins = R.filter(r => r.win !== null);
      row.runs[name] = { plan: plan.join(" → "), won: `${wins.length}/${R.length}`, winSecondsMean: wins.length ? r1(mean(wins.map(r => r.win))) : null,
        winSecondsRange: wins.length ? [r1(Math.min(...wins.map(r => r.win))), r1(Math.max(...wins.map(r => r.win)))] : null,
        firstBuySecondsMean: r1(mean(R.filter(r => r.buys.length).map(r => r.buys[0]))) };
    }
    out[key] = row;
  }
  return out;
}

const seeds = Array.from({ length: NSEEDS }, (_, k) => 101 + k * 7);
const report = { engine: HAS_REGION ? "per-region-allocation" : HAS_FOCUS ? "colony-focus" : "pre-focus", seeds, marksSeconds: MARKS, reactionTicks: REACT, worlds: {} };
const t0 = Date.now();
report.worlds.first_bloom = summarize(BLOOM_DATA.planets.first_bloom, {
  wet: ["seedOut", "cold", "flood", "cold", "heat", "salt", "earlyMat", "seedOut"],
  dry: ["seedOut", "cold", "drought", "cold", "heat", "salt", "earlyMat", "seedOut"],
  terraformWater: ["seedOut", "heat", "salt", "cold", "humid", "humid"],
}, seeds);
if (PROC) {
  const OA = BLOOM_DATA.archetypes.find(a => a.id === "ocean_archipelago");
  for (const s of [13, 8]) {
    let planet; try { planet = BLOOM.generateFromArchetype(OA, s, { config, traits }); }
    catch (e) { report.worlds[`oa_seed_${s}`] = { failed: e.message.slice(0, 200) }; continue; }
    const st = planet.archetype.strategies, plans = {};
    st.list.forEach((x, k) => { plans[`strategy${k + 1}`] = x.purchases.map(p => p[0]); });
    report.worlds[`oa_seed_${s}`] = { attempt: planet.archetype.attempt, name: planet.name, strategies: st.list.map(x => ({ signature: x.signature, witnessMarginSeconds: x.marginSeconds, witnessFirstPurchaseSeconds: x.firstPurchaseSeconds })),
      ...summarize(planet, plans, seeds.slice(0, Math.min(4, seeds.length))) };
  }
}
report.ms = Date.now() - t0;

// ---- print
for (const [w, R] of Object.entries(report.worlds)) {
  console.log(`\n## ${w}${R.attempt !== undefined ? ` (attempt ${R.attempt}, ${R.name})` : ""}${R.failed ? " — " + R.failed : ""}`);
  for (const mode of MODES) { const row = R[mode || "none"]; if (!row) continue;
    console.log(`  focus=${mode || "none"}  first normal upgrade affordable ≈ ${row.firstAffordableSeconds} s (bubbles off: ${row.firstAffordableNoBubblesSeconds} s)`);
    for (const s of MARKS) { const a = row.autonomous[s];
      console.log(`    ${String(s).padStart(3)} s  cov ${String(a.coveragePct).padStart(5)}%  bio ${String(a.biomass).padStart(6)}  origin living ${a.originLivingPct}% vigor ${a.originVigor}${a.originEstablishment !== null ? ` est ${a.originEstablishment}` : ""}`); }
    for (const [n, r] of Object.entries(row.runs)) console.log(`    run ${n.padEnd(15)} won ${r.won}  win ≈ ${r.winSecondsMean} s ${JSON.stringify(r.winSecondsRange)}  first buy ≈ ${r.firstBuySecondsMean} s`);
  }
}
console.log(`\n(${report.ms} ms, engine ${report.engine})`);
if (OUT) { fs.writeFileSync(OUT, JSON.stringify(report, null, 1)); console.log("wrote", OUT); }
