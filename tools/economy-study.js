// BLOOM — Biomass economy + decision-cadence study (BLOOM-013). Plain Node, no browser. A report, not pass/fail
// (tools/economy-check.js holds the pass/fail proofs; it reuses this file's measurements).
//
//   node tools/economy-study.js [--json <out.json>] [--seeds N] [--quick] [--brief] [--worlds fb,o13,d25,f22,o13dw,d25dw,f22dw]
//                               (BLOOM-014, opt-in, not in the default set: --worlds d25nc,o13nc,f22nc = Native Competition)
//                               [--set econ.startBiomass=100,traits.seedOut.base=20,…]
//
// The question is not "how fast is a run" but "how long does a player wait between meaningful Biomass decisions".
// Worlds are pinned by (archetype, public seed, generation attempt) through BLOOM.archetype.attemptPlanet, so a what-if
// economy (--set) is measured on the SAME planet even when it would change which attempt the validator accepts.
// Recipes are the broad strategies each world was accepted with at 4d1e52c (Eden) / the layer-P strategies (Dying World).
// Dying World worlds also run "ignore…" recipes: an Eden strategy of the same planet bought as if there were no decline —
// if one of those still wins comfortably, the pressure can simply be ignored.
//
// Measured per world, averaged over N seeded mulberry32 run seeds (never Math.random):
//   OPENING (a player who has not bought anything yet): when the first meaningful option becomes affordable — the first
//     local specialization, the first meaningful GLOBAL upgrade — and when TWO materially different options are
//     affordable at once (each meaningful global upgrade is one option; "specialize a colony" is one more).
//   CADENCE (a recipe bot that buys its next upgrade 4 s after it becomes affordable, as tools/pacing-metrics.js does):
//     1st/2nd/3rd purchase, every gap (start → 1st, 1st → 2nd …), largest and median gap before the win, last purchase,
//     the wait from the last purchase to the win (spread only), win time, total spend, Biomass unspent at the win,
//     coverage + Biomass at checkpoints.
//   AFFORDABILITY WINDOWS (same bot, sampled every second before the win): share of time with 0 / 1 / ≥2 meaningful
//     affordable options, and the longest stretch with NONE before the last purchase ("dead wait").
//   PRESSURE (scenario worlds): scenario progress at the win, and the largest share of land the drift had closed to the
//     bot's current build (growable without the drift, not with it) — is the decline strategically present before the win?
// Bubble policies: "click" (every bubble clicked 2 s after it appears — a player who chases them) and "auto" (never
// clicked: only the engine's half-value auto-collect). Colony policies come from tools/colony-study.js.
//
// A MEANINGFUL global option is a legal, offered upgrade that either opens ground now (net land gained > lost in the
// upgrade preview), or is still needed by some sufficient strategy core of this world (BLOOM.witness.strategyClasses; in
// the scenario's final state under pressure), or is a Spread upgrade (Seed Output / Early Maturity / Waterborne Seeds)
// with levels left. Anything else (e.g. Heat Tolerance on a world with no hot ground) is clickable but not a decision.
// A meaningful LOCAL option is a specialization the player can afford for a Living colony (≥ econ.bubbleMinLiving tiles)
// that has none yet.
"use strict";
const fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "..");
for (const f of ["content/config.js", "content/traits.js", "content/archetypes.js", "content/scenarios.js", "planets/first_bloom.js", "resources/bloom-sim.js",
  "resources/bloom-gen.js", "resources/bloom-validate.js", "resources/bloom-witness.js", "resources/bloom-archetype.js"]) require(path.join(ROOT, f));
const { BLOOM, BLOOM_DATA } = globalThis;
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
// --set a.b.c=value[,…]: what-if overrides for tuning sweeps (the committed report uses none). "traits.<id|board|*>.base|step"
// edits trait costs; "scenarios.<id>.a.b=value" edits a scenario (e.g. scenarios.dying_world.pressure.graceSeconds=30).
function withOverrides(spec) {
  const config = JSON.parse(JSON.stringify(BLOOM_DATA.config)), traits = JSON.parse(JSON.stringify(BLOOM_DATA.traits)), scenarios = JSON.parse(JSON.stringify(BLOOM_DATA.scenarios));
  for (const kv of (spec || "").split(",").filter(Boolean)) { const [k, v] = kv.split("="), ks = k.split(".");
    if (ks[0] === "traits") { for (const t of traits.filter(t => ks[1] === "*" || t.id === ks[1] || t.board === ks[1])) t.cost[ks[2]] = JSON.parse(v); continue; }
    let o = config, rest = ks;
    if (ks[0] === "scenarios") { o = scenarios.find(x => x.id === ks[1]); rest = ks.slice(2); }
    for (const x of rest.slice(0, -1)) o = o[x]; o[rest.at(-1)] = JSON.parse(v); }
  return { config, traits, scenarios };
}
const { POLICIES, INVEST, survey } = require("./colony-study.js");
const mb = BLOOM.gen.mulberry32, mean = xs => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
const median = xs => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const r1 = x => x === null || x === undefined ? null : Math.round(x * 10) / 10;
const REACT = 25, EVERY = 12, CLICK_AFTER = 12, CHECK = [30, 60, 120, 180, 300, 450, 600];

// ---- worlds: [key, label, archetype id | null, public seed, attempt, scenario id, recipes]
const WORLDS = [
  ["fb", "First Bloom · Eden", null, null, null, "eden", {
    wet: ["seedOut", "cold", "flood", "cold", "heat", "salt", "earlyMat", "seedOut"],
    dry: ["seedOut", "cold", "drought", "cold", "heat", "salt", "earlyMat", "seedOut"],
    terraformWater: ["seedOut", "heat", "salt", "cold", "humid", "humid"] }],
  ["o13", "Ocean Archipelago 13 · Eden", "ocean_archipelago", 13, 6, "eden", {
    coldSalt: ["seedOut", "waterSeeds", "salt", "cold"], heatRad: ["seedOut", "waterSeeds", "rad", "heat"] }],
  ["d25", "Desert World 25 · Eden", "desert_world", 25, 0, "eden", {
    drought2: ["seedOut", "drought", "drought"], humidify: ["seedOut", "drought", "humid", "rad", "heat"] }],
  ["f22", "Frozen World 22 · Eden", "frozen_world", 22, 1, "eden", {
    cold2: ["seedOut", "earlyMat", "cold", "cold"], warm2: ["seedOut", "earlyMat", "cold", "warm", "warm"] }],
  ["o13dw", "Ocean Archipelago 13 · Dying World", "ocean_archipelago", 13, 6, "dying_world", {
    drought: ["seedOut", "rad", "drought", "waterSeeds"], humidify: ["seedOut", "rad", "humid", "waterSeeds"],
    ignoreColdSalt: ["seedOut", "waterSeeds", "salt", "cold"], ignoreHeatRad: ["seedOut", "waterSeeds", "rad", "heat"] }],
  ["d25dw", "Desert World 25 · Dying World", "desert_world", 25, 0, "dying_world", {
    drought2: ["seedOut", "rad", "drought", "drought"], humidify2: ["seedOut", "salt", "rad", "drought", "humid", "humid"],
    ignoreDrought2: ["seedOut", "drought", "drought"] }],
  ["f22dw", "Frozen World 22 · Dying World", "frozen_world", 22, 1, "dying_world", {
    cold3: ["seedOut", "drought", "cold", "cold", "cold"], coldWarm: ["seedOut", "drought", "rad", "cold", "cold", "warm"],
    ignoreCold2: ["seedOut", "earlyMat", "cold", "cold"] }],
];
// BLOOM-014: Native Competition worlds (a competing native organism; no clock). Opt-in only (--worlds …), so the default
// world set — and tools/economy-check.js, which runs it — is exactly BLOOM-013's. Recipes = the layer-P witnesses' plans +
// "ignore…" recipes (the planet's Eden strategy, bought as if the planet were empty).
const COMPETITION_WORLDS = [
  ["d25nc", "Desert World 25 · Native Competition", "desert_world", 25, 0, "native_competition", {
    adapt: ["seedOut", "salt", "rad", "drought", "drought", "heat"], terraform: ["seedOut", "salt", "rad", "drought", "drought", "cool"],
    ignoreDrought2: ["seedOut", "drought", "drought"], ignoreHumidify: ["seedOut", "drought", "humid", "rad", "heat"] }],
  ["o13nc", "Ocean Archipelago 13 · Native Competition", "ocean_archipelago", 13, 6, "native_competition", {
    witness: ["seedOut", "waterSeeds", "salt", "rad", "heat", "dry", "dry", "drought"], ignoreColdSalt: ["seedOut", "waterSeeds", "salt", "cold"], ignoreHeatRad: ["seedOut", "waterSeeds", "rad", "heat"] }],
  ["f22nc", "Frozen World 22 · Native Competition", "frozen_world", 22, 1, "native_competition", {
    coldHeat: ["seedOut", "heat", "cold", "cold"], coldRad: ["seedOut", "rad", "cold", "cold"], ignoreCold2: ["seedOut", "earlyMat", "cold", "cold"] }],
];
// colony rows: [allocation policy, investment policy]
// "player" = situational allocation + one Leaf Canopy on the origin + Spread upgrades after the recipe (a reasonable human)
const ROWS_FULL = [["balanced", "none"], ["situational", "none"], ["situational", "canopyOrigin"], ["situational", "canopyOrigin", "extend"],
  ["situational", "everywhere"], ["leavesEverywhere", "everywhere"]];
const ROWS_BRIEF = [["balanced", "none"], ["situational", "canopyOrigin", "extend"]];

function planetOf(W) {
  if (!W[2]) return BLOOM_DATA.planets.first_bloom;
  return BLOOM.archetype.attemptPlanet(BLOOM_DATA.archetypes.find(a => a.id === W[2]), W[3], W[4]).planet;
}

// ---- per-world context: the strategy cores the meaningful-option rule reads (static; no simulation)
function context(W, config, traits, scenarios = BLOOM_DATA.scenarios) {
  const planet = planetOf(W), scenario = BLOOM.pressure.resolveScenario(scenarios, W[5]);
  const dyn = BLOOM.pressure.isDynamic(scenario) ? scenario : null; // (pressure and/or competition; Eden = none, as before)
  const classes = BLOOM.witness.strategyClasses(planet, config, traits, { scenario: dyn });
  const cores = classes.map(c => c.core.reduce((m, id) => (m[id] = (m[id] || 0) + 1, m), {}));
  return { planet, scenario: dyn, cores, classes: classes.length };
}
const owned = (sim, t) => t.effect.type === "sky" ? sim.tf[t.id] : sim.ownedTier(t);
function meaningfulGlobal(sim, t, X) {
  if (!sim.offered(t) || !sim.canBuy(t)) return false;
  if (t.board === "Spread") return true;
  const p = sim.previewOf(t.id), A = sim.map.AREA, area = xs => xs.reduce((a, i) => a + A[i], 0);
  if (p && area(p.gain) > area(p.lose)) return true;
  const n = owned(sim, t); return X.cores.some(c => (c[t.id] || 0) > n);
}
// distinct meaningful options affordable right now → { global: [ids], local: bool, n }
function options(sim, traits, X, minLiving) {
  const global = traits.filter(t => sim.biomass >= sim.price(t) && meaningfulGlobal(sim, t, X)).map(t => t.id);
  let local = false;
  if (sim.biomass >= sim.specPrice()) { const liv = sim.livingCountBySection();
    for (let s = 0; s < sim.map.SC && !local; s++) if (liv[s] >= minLiving && !sim.getSpecialization(s)) local = true; }
  return { global, local, n: global.length + (local ? 1 : 0) };
}
function clickBubbles(sim) { for (let k = sim.bubbles.length - 1; k >= 0; k--) if (sim.bubbles[k].life >= CLICK_AFTER) sim.collectBubble(k); }
// share of land the scenario drift has closed to the current build (growable with zero drift, not with the current one)
function driftClosed(sim) {
  if (!sim.pressure.active || sim.pressure.progress <= 0) return 0;
  const M = sim.map, Z = { temp: 0, moist: 0, rad: 0 }, gt = BLOOM_DATA.config.grow.growThresh;
  let a = 0; for (let i = 0; i < M.SC; i++) if (sim.evaluate(i, Z).fitness > gt && !(sim.evaluate(i).fitness > gt)) a += M.AREA[i];
  return a / M.LAND;
}

// OPENING: nothing bought; when do options appear?
function opening(X, config, traits, seed, bubbles, maxSeconds = 240) {
  const sim = BLOOM.createSim(X.planet, config, traits, { rng: mb(seed), scenario: X.scenario }), TPS = 1000 / config.tickMs, minL = config.econ.bubbleMinLiving;
  const out = { startOptions: options(sim, traits, X, minL).n, local: null, global: null, two: null, firstOptionIds: null };
  for (let t = 1; t <= maxSeconds * TPS; t++) {
    sim.tick(); if (bubbles === "click") clickBubbles(sim);
    if (t % Math.round(TPS) && t !== 1) continue;
    const o = options(sim, traits, X, minL), s = r1(t / TPS);
    if (out.local === null && o.local) out.local = s;
    if (out.global === null && o.global.length) { out.global = s; out.firstOptionIds = o.global; }
    if (out.two === null && o.n >= 2) out.two = s;
    if (out.local !== null && out.global !== null && out.two !== null) break;
  }
  return out;
}

// CADENCE: a recipe bot (+ colony policy) to the win
// extend: once the recipe is bought, keep buying the meaningful Spread upgrades left (Seed Output II, Early Maturity …)
// as a player who still has Biomass would — never another Adapt / Terraform upgrade, so the strategy stays the recipe's
function cadence(X, config, traits, plan, seed, bubbles, policyName, investName, extend = false, maxTicks = 12000) {
  const sim = BLOOM.createSim(X.planet, config, traits, { rng: mb(seed), scenario: X.scenario }), TPS = 1000 / config.tickMs, minL = config.econ.bubbleMinLiving;
  const pol = POLICIES[policyName], inv = INVEST[investName], buys = [], specs = [], marks = {}, windows = [0, 0, 0];
  let i = 0, at = null, zeroRun = 0, deadWait = 0, maxClosed = 0;
  for (let t = 1; t <= maxTicks; t++) {
    if (pol && (t === 1 || t % EVERY === 0)) for (const c of survey(sim)) { if (!c.living) continue; const m = pol(sim, c); if (m && m !== sim.getColonyFocus(c.s)) sim.setColonyFocus(c.s, m); }
    const cov = sim.tick(); if (bubbles === "click") clickBubbles(sim);
    const s = t / TPS;
    for (const c of CHECK) if (t === Math.round(c * TPS)) marks[c] = { cov, bio: sim.biomass, earned: sim.biomass + sim.spent.global + sim.spent.local };
    if (sim.lost) return finish(null, true);
    if (sim.won) return finish(s, false);
    if (i < plan.length) { const tr = sim.traitById[plan[i]];
      if (sim.canBuy(tr) && sim.biomass >= sim.price(tr)) { at ??= t; if (t - at >= REACT) { const c = sim.price(tr); if (sim.buy(plan[i])) { buys.push({ id: plan[i], s: r1(s), cost: c }); i++; at = null; } } } }
    else if (extend) { const next = traits.filter(x => x.board === "Spread" && meaningfulGlobal(sim, x, X)).sort((a, b) => sim.price(a) - sim.price(b))[0];
      if (next && sim.biomass >= sim.price(next)) { at ??= t; if (t - at >= REACT) { const c = sim.price(next); if (sim.buy(next.id)) { buys.push({ id: next.id, s: r1(s), cost: c, extra: true }); at = null; } } } }
    if (inv && t % EVERY === 0 && at === null) { const want = inv(sim, survey(sim)); const c = sim.specPrice();
      if (want && sim.buySpecialization(want[0], want[1])) specs.push({ id: want[1], s: r1(s), cost: c }); }
    if (t % Math.round(TPS) === 0) { const o = options(sim, traits, X, minL); windows[Math.min(2, o.n)]++;
      if (o.n === 0 && sim.coverage() < sim.winAt) { zeroRun++; deadWait = Math.max(deadWait, zeroRun); } else zeroRun = 0;
      if (X.scenario && t % (5 * Math.round(TPS)) === 0) maxClosed = Math.max(maxClosed, driftClosed(sim)); }
  }
  return finish(null, false);
  function finish(win, lost) {
    const core = buys.filter(b => !b.extra), times = buys.map(b => b.s), gaps = times.map((x, k) => r1(x - (k ? times[k - 1] : 0))), all = [...buys, ...specs].sort((a, b) => a.s - b.s);
    const tot = windows.reduce((a, b) => a + b, 0) || 1;
    return { win, lost, buys, specs, gaps, first: times[0] ?? null, second: times[1] ?? null, third: times[2] ?? null,
      maxGap: gaps.length ? Math.max(...gaps) : null, medianGap: median(gaps), last: times.at(-1) ?? null, coreDone: core.length === plan.length ? core.at(-1).s : null,
      // any purchase (global or local) counts as a decision for the all-purchase gap
      maxAnyGap: all.length ? r1(Math.max(...all.map((b, k) => b.s - (k ? all[k - 1].s : 0)))) : null,
      terminal: win !== null && all.length ? r1(win - all.at(-1).s) : null,
      spentGlobal: sim.spent.global, spentLocal: sim.spent.local, unspent: Math.round(sim.biomass), earned: Math.round(sim.biomass + sim.spent.global + sim.spent.local), marks,
      windows: windows.map(w => w / tot), deadWait, progressAtWin: X.scenario ? +sim.pressure.progress.toFixed(3) : null, maxClosed: +maxClosed.toFixed(3),
      completedPlan: i >= plan.length };
  }
}

function studyWorld(W, config, traits, seeds, rows, bubbleModes, scenarios) {
  const X = context(W, config, traits, scenarios), out = { label: W[1], classes: X.classes, opening: {}, recipes: {} };
  for (const b of bubbleModes) { const O = seeds.map(s => opening(X, config, traits, s, b));
    out.opening[b] = { start: O[0].startOptions, local: r1(mean(O.map(o => o.local ?? 240))), global: r1(mean(O.map(o => o.global ?? 240))), two: r1(mean(O.map(o => o.two ?? 240))),
      globalMax: Math.max(...O.map(o => o.global ?? 240)), twoMax: Math.max(...O.map(o => o.two ?? 240)), firstOptions: [...new Set(O.flatMap(o => o.firstOptionIds || []))] }; }
  for (const [rn, plan] of Object.entries(W[6])) { const R = out.recipes[rn] = { plan: plan.join(" → ") };
    for (const b of bubbleModes) for (const [pol, inv, ext] of rows) {
      const runs = seeds.map(s => cadence(X, config, traits, plan, s, b, pol, inv, ext === "extend")), won = runs.filter(r => r.win !== null), m = f => r1(mean(runs.map(f).filter(x => x !== null && x !== undefined)));
      R[`${b}:${pol}+${inv}${ext ? "+" + ext : ""}`] = { won: `${won.length}/${runs.length}`, lost: runs.filter(r => r.lost).length, win: r1(mean(won.map(r => r.win))),
        winRange: won.length ? [r1(Math.min(...won.map(r => r.win))), r1(Math.max(...won.map(r => r.win)))] : null,
        coreDone: m(r => r.coreDone), first: m(r => r.first), second: m(r => r.second), third: m(r => r.third), last: m(r => r.last),
        maxGap: m(r => r.maxGap), maxGapWorst: Math.max(...runs.map(r => r.maxGap ?? 0)), medianGap: m(r => r.medianGap), maxAnyGap: m(r => r.maxAnyGap),
        maxAnyGapWorst: Math.max(...runs.map(r => r.maxAnyGap ?? 0)),
        gaps: runs[0].gaps, terminal: m(r => r.terminal), deadWait: m(r => r.deadWait), deadWaitWorst: Math.max(...runs.map(r => r.deadWait)),
        windows: [0, 1, 2].map(k => +mean(runs.map(r => r.windows[k])).toFixed(2)),
        spentGlobal: m(r => r.spentGlobal), spentLocal: m(r => r.spentLocal), specs: m(r => r.specs.length), unspent: m(r => r.unspent), earned: m(r => r.earned),
        completedPlan: runs.filter(r => r.completedPlan).length, progressAtWin: m(r => r.progressAtWin), maxClosed: m(r => r.maxClosed),
        marks: Object.fromEntries(CHECK.map(c => [c, { cov: r1(100 * (mean(runs.filter(r => r.marks[c]).map(r => r.marks[c].cov)) ?? NaN)), bio: m(r => r.marks[c] && r.marks[c].bio),
          earned: m(r => r.marks[c] && r.marks[c].earned) }])),
        example: runs[0].buys.map(b => `${b.id}@${Math.round(b.s)}`).concat(runs[0].specs.map(b => `[${b.id}@${Math.round(b.s)}]`)).join(" ") };
    } }
  return out;
}

// prices a player sees at the start and the cost of one more tier (global) / one more specialization (local)
function priceTable(config, traits) {
  const sim = BLOOM.createSim(BLOOM_DATA.planets.first_bloom, config, traits, { rng: () => 0.5 }), out = { global: {}, local: [] };
  for (const t of traits) { const tiers = [], max = t.effect.type === "tempPoint" ? config.scales.tempCap : t.effect.type === "waterArm" ? 2 : t.effect.type === "sky" ? 2 : t.effect.max || 1;
    for (let k = 0; k < max; k++) tiers.push(Math.round((t.cost.base + k * t.cost.step) * config.econ.costScale)); out.global[t.id] = tiers; }
  for (let n = 0; n < 4; n++) { out.local.push(sim.specPrice()); sim.colonies.spec[n] = "leafCanopy"; } // price of the (n+1)th specialization
  return out;
}

function study({ spec = "", seeds, worlds, rows, bubbleModes }) {
  const { config, traits, scenarios } = withOverrides(spec), out = { set: spec, prices: priceTable(config, traits), econ: config.econ, specCost: config.colony.specCost, worlds: {} };
  for (const W of [...WORLDS, ...COMPETITION_WORLDS].filter(w => worlds.includes(w[0]))) out.worlds[W[0]] = studyWorld(W, config, traits, seeds, rows, bubbleModes, scenarios);
  return out;
}
module.exports = { study, WORLDS, COMPETITION_WORLDS, withOverrides, options, meaningfulGlobal, context, cadence, opening, priceTable };
if (require.main !== module) return;

const QUICK = process.argv.includes("--quick"), BRIEF = process.argv.includes("--brief"), NSEEDS = +arg("--seeds", QUICK || BRIEF ? 4 : 8), OUT = arg("--json", null);
const seeds = Array.from({ length: NSEEDS }, (_, k) => 101 + k * 7), t0 = Date.now();
const rep = study({ spec: arg("--set", ""), seeds, worlds: arg("--worlds", WORLDS.map(w => w[0]).join(",")).split(","), rows: BRIEF || QUICK ? ROWS_BRIEF : ROWS_FULL, bubbleModes: ["auto", "click"] });
rep.seeds = seeds; rep.ms = Date.now() - t0;
const P = rep.prices;
if (!BRIEF) { console.log(`# economy ${rep.set || "(committed config)"} · start ${rep.econ.startBiomass} · trickle ${rep.econ.originTrickle} · thriving ${rep.econ.thriving} · costScale ${rep.econ.costScale}`);
  console.log("prices: " + Object.entries(P.global).map(([k, v]) => `${k} ${v.join("/")}`).join(" · ") + ` · local ${P.local.join("/")}`); }
const pad = (x, n) => String(x ?? "—").padStart(n);
for (const [k, R] of Object.entries(rep.worlds)) {
  if (BRIEF) { const o = R.opening.auto, oc = R.opening.click, recs = Object.values(R.recipes);
    const g = f => recs.map(r => r["auto:situational+canopyOrigin+extend"]).map(f), gc = f => recs.map(r => r["click:situational+canopyOrigin+extend"]).map(f);
    console.log(`${k.padEnd(6)} open auto L${pad(o.local, 5)} G${pad(o.global, 5)} 2x${pad(o.two, 5)} | click G${pad(oc.global, 5)} 2x${pad(oc.two, 5)} | auto 1st ${g(r => pad(r.first, 5)).join(" ")} maxGap ${g(r => pad(r.maxGap, 5) + "/" + r.maxGapWorst).join(" ")} med ${g(r => pad(r.medianGap, 5)).join(" ")} dead ${g(r => pad(r.deadWait, 4)).join(" ")} win ${g(r => pad(r.win, 6)).join(" ")} term ${g(r => pad(r.terminal, 5)).join(" ")} won ${g(r => r.won).join(",")}${R.recipes[Object.keys(R.recipes)[0]]["auto:situational+canopyOrigin+extend"].progressAtWin !== null ? ` p@win ${g(r => r.progressAtWin).join("/")} closed ${g(r => r.maxClosed).join("/")}` : ""} | click win ${gc(r => pad(r.win, 6)).join(" ")} maxGap ${gc(r => pad(r.maxGap, 5)).join(" ")}`);
    continue; }
  console.log(`\n## ${R.label} (${R.classes} candidate strategy classes)`);
  for (const [b, o] of Object.entries(R.opening)) console.log(`  opening, bubbles ${b.padEnd(5)}: options at start ${o.start} · first local ${o.local} s · first global ${o.global} s (worst ${o.globalMax}) · two options ${o.two} s (worst ${o.twoMax}) · first global options: ${o.firstOptions.join(", ")}`);
  for (const [rn, rec] of Object.entries(R.recipes)) {
    console.log(`  recipe ${rn}: ${rec.plan}`);
    console.log("    bubbles:policy+invest                   won  win s (range)        1st   2nd   3rd  last  maxGap(worst) median anyGap term  dead(worst) win0/1/2+      spent G/L  specs unspent  cov%@60/120/180/300");
    for (const [rk, r] of Object.entries(rec)) { if (rk === "plan") continue;
      console.log(`    ${rk.padEnd(40)} ${r.won.padEnd(4)} ${pad(r.win, 6)} ${JSON.stringify(r.winRange).padEnd(16)} ${pad(r.first, 5)} ${pad(r.second, 5)} ${pad(r.third, 5)} ${pad(r.last, 5)} ${pad(r.maxGap, 6)}(${pad(r.maxGapWorst, 5)}) ${pad(r.medianGap, 5)} ${pad(r.maxAnyGap, 6)} ${pad(r.terminal, 5)} ${pad(r.deadWait, 4)}(${pad(r.deadWaitWorst, 3)}) ${r.windows.join("/").padEnd(14)} ${pad(r.spentGlobal, 5)}/${String(r.spentLocal).padEnd(5)} ${pad(r.specs, 4)} ${pad(r.unspent, 6)}  ${[60, 120, 180, 300].map(c => pad(r.marks[c].cov, 5)).join(" ")}` +
        (r.progressAtWin !== null ? `  pressure@win ${r.progressAtWin} drift-closed max ${r.maxClosed}` : ""));
    }
    const ex = rec[Object.keys(rec).find(k => k !== "plan")]; console.log(`    e.g. ${ex.example}`);
  }
}
console.log(`\n(${rep.ms} ms)`);
if (OUT) { fs.writeFileSync(OUT, JSON.stringify(rep, null, 1)); console.log("wrote", OUT); }
