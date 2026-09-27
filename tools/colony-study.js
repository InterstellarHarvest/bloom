// BLOOM — per-colony allocation + local investment balance study (BLOOM-009). Plain Node, no browser. A report, not
// pass/fail (tools/colony-development-check.js holds the pass/fail proofs).
//
//   node tools/colony-study.js [--json <out.json>] [--seeds N] [--quick] [--worlds fb,13,8,d25,d9]
//
// Worlds: fb = First Bloom; a number = that Ocean Archipelago public seed; d<N> = Desert World public seed N (BLOOM-010).
// Desert worlds also run two desert-minded local investments (a Root Network on the most marginal colony, a Seed
// Reserve on the widest land frontier). The closing summary compares each focus with Balanced per world.
//
// A bot buys a fixed global recipe (each upgrade 4 s after it becomes affordable, as tools/pacing-metrics.js does) while
// an ALLOCATION POLICY directs its colonies (re-read every 2 s; a change = one player click) and an optional
// INVESTMENT POLICY buys local specializations. Everything runs under seeded mulberry32 RNGs, averaged over N run seeds.
// Measures: first global purchase; earned Biomass (held + spent) and coverage at 60/120/180 s; origin establishment at
// 30/60/120/180 s; win time; allocation changes (clicks); specializations bought; Biomass spent locally vs globally.
"use strict";
const fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "..");
for (const f of ["content/config.js", "content/traits.js", "content/archetypes.js", "planets/first_bloom.js", "resources/bloom-sim.js",
  "resources/bloom-gen.js", "resources/bloom-validate.js", "resources/bloom-witness.js", "resources/bloom-archetype.js"]) require(path.join(ROOT, f));
const { BLOOM, BLOOM_DATA } = globalThis, { traits } = BLOOM_DATA;
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
// --set a.b.c=value[,x.y=value…]: what-if overrides of config for tuning sweeps (the committed report uses none)
const config = JSON.parse(JSON.stringify(BLOOM_DATA.config));
for (const kv of (arg("--set", "") || "").split(",").filter(Boolean)) { const [k, v] = kv.split("="), ks = k.split("."); let o = config;
  for (const x of ks.slice(0, -1)) o = o[x]; o[ks.at(-1)] = JSON.parse(v); }
const ONLY = arg("--only", null), WORLDS = arg("--worlds", "fb,13,8,d25,d9").split(",");
const QUICK = process.argv.includes("--quick"), NSEEDS = +arg("--seeds", QUICK ? 4 : 8), OUT = arg("--json", null);
const TPS = 1000 / config.tickMs, REACT = 25, EVERY = 12, MARKS = [60, 120, 180], EMARKS = [30, 60, 120, 180];
const mb = BLOOM.gen.mulberry32, mean = xs => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
const r1 = x => x === null || x === undefined ? null : Math.round(x * 10) / 10;
const S = config.establish.status, G = config.grow, GREEN = config.categories.lamp.green;

// ---- what a player can see about a colony (all from public sim state)
function survey(sim) {
  const M = sim.map, { W, H, TILEMAP, SC } = M, liv = sim.livingCountBySection(), frontier = new Int32Array(SC);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x, s = TILEMAP[i]; if (s < 0 || sim.state[i] !== sim.BAR || sim.vigor[s] <= G.growThresh) continue;
    for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1])
      if (j >= 0 && sim.state[j] === sim.LIV) frontier[TILEMAP[j]]++; }
  return M.SEC.map((_, s) => ({ s, living: liv[s], est: sim.establishment(s), fit: sim.secFit[s], frontier: frontier[s], coast: coastScore(sim, s) }));
}
// crossing sources: Living tiles of s that can send seeds to Barren land on another landmass (needs Waterborne Seeds)
const coastCache = new WeakMap();
function coastScore(sim, s) {
  const M = sim.map; if (!M.CROSSINGS.links.length) return 0;
  let c = coastCache.get(sim); if (!c) { c = BLOOM.geo.waterCrossings(M.TILEMAP, M.W, M.H, config.crossing.maxGap).pairs; coastCache.set(sim, c); }
  const crossTrait = traits.find(t => t.effect.type === "crossing"); if (!sim.ownedTier(crossTrait)) return 0;
  let n = 0; for (const [src, t] of c) if (M.TILEMAP[src] === s && sim.state[src] === sim.LIV && sim.state[t] === sim.BAR && sim.vigor[M.TILEMAP[t]] > G.growThresh) n++;
  return n;
}
const open = (sim, c) => c.coast > 0 || c.frontier >= 3 || (c.frontier > 0 && sim.getColonyFocus(c.s) === "seeds");
const young = c => c.est < S.established, stressed = c => c.fit <= GREEN && c.fit > config.colony.protectAbove;
// ---- allocation policies: (sim, colony survey) → desired mode per Living colony (undefined = leave as is)
const POLICIES = {
  balanced: null,
  originRoots: (sim, c) => c.s === sim.map.ORIGIN ? "roots" : undefined,
  originLeaves: (sim, c) => c.s === sim.map.ORIGIN ? "leaves" : undefined,
  originSeeds: (sim, c) => c.s === sim.map.ORIGIN ? "seeds" : undefined,
  leavesEverywhere: () => "leaves",
  rootsEverywhere: () => "roots",
  seedsEverywhere: () => "seeds",
  // the situational reading the design intends: stressed or young → Roots; established with open, growable ground next
  // to it (or live Waterborne landings) → Seeds; established and hemmed in → Leaves
  // (a frontier colony keeps Seeds until it has no open ground left at all, so a colony changes at most a few times)
  situational: (sim, c) => stressed(c) || young(c) ? "roots" : open(sim, c) ? "seeds" : "leaves",
  // same, but a young frontier colony spreads (Seeds) rather than thickening (Roots)
  situationalSeedFirst: (sim, c) => stressed(c) ? "roots" : open(sim, c) ? "seeds" : young(c) ? "roots" : "leaves",
  // a light-touch human: Roots on the origin until it is Established, then Leaves there; nothing else
  originRootsThenLeaves: (sim, c) => c.s !== sim.map.ORIGIN ? undefined : young(c) ? "roots" : "leaves",
  // the opposite of the design intent: Leaves on young colonies, Seeds on hemmed-in ones, Roots on thriving established ones
  misplaced: (sim, c) => young(c) ? "leaves" : open(sim, c) ? "roots" : "seeds",
};
// ---- investment policies: when to buy which local specialization (after every global purchase that is affordable)
const INVEST = {
  none: null,
  // one Leaf Canopy on the origin once it is Established
  canopyOrigin: (sim, cols) => { const o = cols[sim.map.ORIGIN]; return !young(o) && !sim.getSpecialization(o.s) ? [o.s, "leafCanopy"] : null; },
  // Leaf Canopy on the origin, then ONE Seed Reserve on the busiest Waterborne source colony
  canopyThenReserve: (sim, cols) => { const o = cols[sim.map.ORIGIN]; if (!young(o) && !sim.getSpecialization(o.s)) return [o.s, "leafCanopy"];
    if (sim.colonies.spec.includes("seedReserve")) return null;
    const best = cols.filter(c => c.coast > 0 && !sim.getSpecialization(c.s)).sort((a, b) => b.coast - a.coast)[0]; return best ? [best.s, "seedReserve"] : null; },
  // a Root Network on the origin at the start of the run
  rootNetworkOrigin: (sim, cols) => !sim.getSpecialization(sim.map.ORIGIN) ? [sim.map.ORIGIN, "rootNetwork"] : null,
  // BLOOM-010 (desert-minded): ONE Root Network on the Living colony with the poorest ground that still holds (yellow, above
  // colony.protectAbove) — where stands struggle to thicken — once it has any real presence
  rootNetworkMarginal: (sim, cols) => { if (sim.colonies.spec.includes("rootNetwork")) return null;
    const c = cols.filter(c => c.living >= 8 && stressed(c) && !sim.getSpecialization(c.s)).sort((a, b) => a.fit - b.fit)[0]; return c ? [c.s, "rootNetwork"] : null; },
  // ONE Seed Reserve on the colony pushing into the most open, growable land (no water crossing needed), once established
  seedReserveFrontier: (sim, cols) => { if (sim.colonies.spec.includes("seedReserve")) return null;
    const c = cols.filter(c => c.frontier >= 3 && !young(c) && !sim.getSpecialization(c.s)).sort((a, b) => b.frontier - a.frontier)[0]; return c ? [c.s, "seedReserve"] : null; },
  // greedy over-investor: a specialization of its allocation's kind on every Living colony whenever affordable
  everywhere: (sim, cols) => { const c = cols.find(c => c.living > 0 && !sim.getSpecialization(c.s)); if (!c) return null;
    const m = sim.getColonyFocus(c.s); return [c.s, m === "roots" ? "rootNetwork" : m === "seeds" ? "seedReserve" : "leafCanopy"]; },
};

function run(planet, plan, seed, policyName, investName, maxTicks = 12000) {
  const sim = BLOOM.createSim(planet, config, traits, { rng: mb(seed) }), pol = POLICIES[policyName], inv = INVEST[investName], O = sim.map.ORIGIN;
  let i = 0, at = null, clicks = 0, firstBuy = null; const marks = {}, emarks = {}, specs = [];
  for (let t = 1; t <= maxTicks; t++) {
    if (pol && (t === 1 || t % EVERY === 0)) { const cols = survey(sim);
      for (const c of cols) { if (!c.living) continue; const m = pol(sim, c); if (m && m !== sim.getColonyFocus(c.s) && sim.setColonyFocus(c.s, m)) clicks++; } }
    const cov = sim.tick(); if (sim.won) return { win: t / TPS, firstBuy, marks, emarks, clicks, specs, spent: { ...sim.spent } };
    for (const s of MARKS) if (t === Math.round(s * TPS)) marks[s] = { cov, earned: sim.biomass + sim.spent.global + sim.spent.local };
    for (const s of EMARKS) if (t === Math.round(s * TPS)) emarks[s] = sim.establishment(O);
    if (i < plan.length) { const tr = sim.traitById[plan[i]];
      if (sim.canBuy(tr) && sim.biomass >= sim.price(tr)) { at ??= t; if (t - at >= REACT && sim.buy(plan[i])) { firstBuy ??= t / TPS; i++; at = null; } } }
    // local investment competes with the NEXT global purchase: the bot invests only when it can still afford that trait
    // within its normal reaction window (i.e. never while it is waiting on a global purchase it could already make)
    if (inv && t % EVERY === 0 && at === null) { const want = inv(sim, survey(sim));
      if (want && sim.buySpecialization(want[0], want[1])) specs.push([sim.map.SEC[want[0]].id, want[1], r1(t / TPS)]); }
  }
  return { win: null, firstBuy, marks, emarks, clicks, specs, spent: { ...sim.spent } };
}
function row(planet, plan, seeds, policy, invest) {
  const R = seeds.map(sd => run(planet, plan, sd, policy, invest)), W = R.filter(r => r.win !== null);
  const out = { won: `${W.length}/${R.length}`, win: r1(mean(W.map(r => r.win))), winRange: W.length ? [r1(Math.min(...W.map(r => r.win))), r1(Math.max(...W.map(r => r.win)))] : null,
    firstBuy: r1(mean(R.map(r => r.firstBuy).filter(x => x !== null))), clicks: r1(mean(R.map(r => r.clicks))),
    specs: r1(mean(R.map(r => r.specs.length))), localSpent: r1(mean(R.map(r => r.spent.local))), globalSpent: r1(mean(R.map(r => r.spent.global))), marks: {}, originEst: {} };
  for (const s of MARKS) out.marks[s] = { cov: r1(100 * mean(R.filter(r => r.marks[s]).map(r => r.marks[s].cov))), earned: r1(mean(R.filter(r => r.marks[s]).map(r => r.marks[s].earned))) };
  for (const s of EMARKS) out.originEst[s] = +(mean(R.filter(r => r.emarks[s] !== undefined).map(r => r.emarks[s])) ?? 0).toFixed(3);
  out.example = R[0].specs;
  return out;
}

if (require.main !== module) { module.exports = { POLICIES, INVEST, run, survey }; return; } // tools/colony-development-check.js reuses the policies
const seeds = Array.from({ length: NSEEDS }, (_, k) => 101 + k * 7), report = { seeds, worlds: {} }, t0 = Date.now();
const FB_PLANS = { wet: ["seedOut", "cold", "flood", "cold", "heat", "salt", "earlyMat", "seedOut"], terraformWater: ["seedOut", "heat", "salt", "cold", "humid", "humid"] };
const allocRows = Object.keys(POLICIES).map(p => [p, "none"]).filter(([p]) => !ONLY || ONLY.split("+").includes(p));
const investRows = ONLY ? [] : [["balanced", "canopyOrigin"], ["situational", "canopyOrigin"], ["situational", "canopyThenReserve"], ["situational", "rootNetworkOrigin"], ["situational", "everywhere"]];
function study(name, planet, plans, sds, extraRows = []) {
  const W = report.worlds[name] = {};
  for (const [pn, plan] of Object.entries(plans)) { W[pn] = {};
    for (const [pol, inv] of [...allocRows, ...investRows, ...(ONLY ? [] : extraRows)]) W[pn][inv === "none" ? pol : `${pol}+${inv}`] = row(planet, plan, sds, pol, inv); }
}
if (WORLDS.includes("fb")) study("first_bloom", BLOOM_DATA.planets.first_bloom, QUICK ? { wet: FB_PLANS.wet } : FB_PLANS, seeds);
const OA = BLOOM_DATA.archetypes.find(a => a.id === "ocean_archipelago");
for (const s of [13, 8].filter(x => WORLDS.includes(String(x)))) {
  const p = BLOOM.generateFromArchetype(OA, s, { config, traits }), plans = {};
  p.archetype.strategies.list.forEach((x, k) => { plans[`strategy${k + 1}`] = x.purchases.map(q => q[0]); });
  study(`oa_seed_${s} (attempt ${p.archetype.attempt}, ${p.name})`, p, QUICK ? { strategy1: plans.strategy1 } : plans, seeds.slice(0, Math.min(NSEEDS, 6)));
}
const DW = BLOOM_DATA.archetypes.find(a => a.id === "desert_world");
for (const w of WORLDS.filter(x => /^d\d+$/.test(x))) {
  const s = +w.slice(1), p = BLOOM.generateFromArchetype(DW, s, { config, traits }), plans = {};
  p.archetype.strategies.list.forEach((x, k) => { plans[`strategy${k + 1}`] = x.purchases.map(q => q[0]); });
  study(`desert_seed_${s} (attempt ${p.archetype.attempt}, ${p.name})`, p, QUICK ? { strategy1: plans.strategy1 } : plans, seeds.slice(0, Math.min(NSEEDS, 6)),
    [["situational", "rootNetworkMarginal"], ["situational", "seedReserveFrontier"], ["balanced", "rootNetworkMarginal"]]);
}
report.ms = Date.now() - t0;
for (const [w, P] of Object.entries(report.worlds)) for (const [pn, rows] of Object.entries(P)) {
  console.log(`\n## ${w} · ${pn}   (${pn === "wet" || pn === "terraformWater" ? FB_PLANS[pn].join(" → ") : "witness strategy recipe"})`);
  console.log("  policy                                   won   win s (range)          1st buy  clicks  specs local/global  earned@60/120/180    cov%@60/120/180  originEst@30/60/120/180");
  for (const [k, r] of Object.entries(rows))
    console.log(`  ${k.padEnd(40)} ${r.won.padEnd(5)} ${String(r.win).padStart(6)} ${JSON.stringify(r.winRange).padEnd(16)} ${String(r.firstBuy).padStart(6)}  ${String(r.clicks).padStart(5)}  ${String(r.specs).padStart(4)} ${String(r.localSpent).padStart(5)}/${String(r.globalSpent).padEnd(6)} ${MARKS.map(s => String(r.marks[s].earned).padStart(6)).join("")}  ${MARKS.map(s => String(r.marks[s].cov).padStart(5)).join("")}   ${EMARKS.map(s => r.originEst[s].toFixed(2)).join(" ")}`);
}
// summary: each focus vs Balanced (mean win-time change; negative = faster) — is any single focus dominant anywhere?
console.log("\n## focus vs Balanced — mean win-time change in seconds (negative = faster; averaged over each world's recipes)");
const CMP = ["originRoots", "rootsEverywhere", "leavesEverywhere", "seedsEverywhere", "situational", "misplaced"].filter(k => !ONLY || ONLY.split("+").includes(k));
console.log("  " + "world".padEnd(46) + CMP.map(k => k.padStart(17)).join(""));
report.summary = {};
for (const [w, P] of Object.entries(report.worlds)) { const d = {};
  for (const k of CMP) { const xs = Object.values(P).filter(r => r[k] && r[k].win !== null && r.balanced && r.balanced.win !== null).map(r => r[k].win - r.balanced.win); d[k] = xs.length ? r1(mean(xs)) : null; }
  report.summary[w] = d; console.log("  " + w.padEnd(46) + CMP.map(k => String(d[k]).padStart(17)).join("")); }
console.log(`\n(${report.ms} ms)`);
if (OUT) { fs.writeFileSync(OUT, JSON.stringify(report, null, 1)); console.log("wrote", OUT); }
