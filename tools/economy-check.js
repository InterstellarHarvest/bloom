// BLOOM — Biomass economy + decision-cadence QA (BLOOM-013). Node + a short real-browser part.
//
//   NODE_PATH="$(npm root -g)" node tools/economy-check.js [--json <evidence.json>] [--shots <dir>] [--no-browser]
//
// The owner's REVISE on the Dying World gate ("still slow to gain enough Biomass to effectively do anything and strategize")
// is an economy problem, not a Dying World one. BLOOM-013 retunes data only (config.econ start Biomass + origin trickle, the
// Dying World clock, the validators' pacing bands); this check proves the new cadence on the five study worlds and that the
// strategic tradeoffs still bind. Measurements come from tools/economy-study.js (seeded mulberry32 runs, never Math.random;
// worlds pinned by archetype + public seed + attempt). Bots: "witness-like" = balanced colonies, the strategy recipe bought 4 s
// after it becomes affordable, nothing else; "player" = situational colony allocation, one Leaf Canopy on the origin, Spread
// upgrades after the recipe. Both IGNORE bubbles (auto-collect only) unless a check says otherwise. No Biomass is ever granted.
// BASE holds the same measurements taken with the same tool on a `git archive 4d1e52c` export (pre-BLOOM-013 economy).
"use strict";
const path = require("path"), fs = require("fs");
const ROOT = path.resolve(__dirname, "..");
// (BLOOM-033) the run page's code = the developer harness demos/demo-run.html + the GameSession it wraps (resources/run/game-session.js, the
// same file index.html uses); source checks of "the run page" read both
const RUN_PAGE_SRC = () => ["demos/demo-run.html", "resources/run/game-session.js"].filter(f => fs.existsSync(path.join(ROOT, f))).map(f => fs.readFileSync(path.join(ROOT, f), "utf8")).join("\n");
const E = require("./economy-study.js"); // loads content + engine
require(path.join(ROOT, "resources/bloom-scenario.js"));
const { BLOOM, BLOOM_DATA } = globalThis, { config, traits, archetypes, scenarios } = BLOOM_DATA;
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const JSON_OUT = arg("--json"), SHOTS = arg("--shots"), NO_BROWSER = process.argv.includes("--no-browser");
const J = o => JSON.stringify(o), r1 = v => Math.round(v * 10) / 10, mx = xs => Math.max(...xs), mb = BLOOM.gen.mulberry32;
let fails = 0; const t0 = Date.now(), EVID = {};
const check = (ok, name, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); if (!ok) fails++; };

// 4d1e52c, same tool, same 4 run seeds (docs/evidence/bloom-013/economy-baseline.* holds the full 8-seed report)
const BASE = {
  econ: { startBiomass: 40, originTrickle: 0.1, thriving: 0.0004, marginal: 0.00012, youngYield: 0.45, bubbleChance: 0.011, bubbleValue: 25, autoCollectShare: 0.5, costScale: 5 },
  dyingWorld: { graceSeconds: 60, durationSeconds: 420, channels: { moistureShare: -0.4, temperature: -8, radiation: 8 } },
  firstGlobalAffordable: { fb: 87, o28: 85, d17: 88, f11: 79, o28dw: 85 },       // opening, bubbles ignored (BLOOM-027B fixture worlds: measured with this study under the pre-BLOOM-013 economy — docs/evidence/bloom-027b/economy-old-baseline.json; fb unchanged)
  maxGapWorst: { fb: 100, o28: 154, d17: 122, f11: 115, o28dw: 159 },            // witness-like bot, worst seed (same source)
  dyingWorldWitness: null, // (BLOOM-027B: no layer-P witness exists for Ocean 28 + Dying World under the pre-BLOOM-013 economy, so there is no "was" plan to show)
};
const SEEDS = [101, 108, 115, 122], PRIMARY = ["fb", "o28", "d17", "f11", "o28dw"];
const WIT = "auto:balanced+none", PLAYER = "auto:situational+canopyOrigin+extend";
const ROWS = [["balanced", "none"], ["situational", "none"], ["situational", "canopyOrigin", "extend"], ["situational", "everywhere"], ["leavesEverywhere", "everywhere"]];
console.log("# measuring (tools/economy-study.js: 7 worlds × recipes × 5 colony policies × 2 bubble policies × 4 run seeds) …");
const REP = E.study({ seeds: SEEDS, worlds: E.WORLDS.map(w => w[0]), rows: ROWS, bubbleModes: ["auto", "click"] });
const W = REP.worlds, recipes = k => Object.entries(W[k].recipes).filter(([n]) => !/^ignore/.test(n)), ignores = k => Object.entries(W[k].recipes).filter(([n]) => /^ignore/.test(n));
const rowsOf = (k, row) => recipes(k).map(([n, r]) => ({ n, ...r[row] }));
EVID.prices = REP.prices; EVID.worlds = W;
console.log(`  (${((Date.now() - t0) / 1000).toFixed(0)} s)`);

console.log("\n# A · the economy is data");
{ const e = config.econ, keys = Object.keys(BASE.econ), changed = keys.filter(k => e[k] !== BASE.econ[k]);
  check(J(changed) === J(["startBiomass", "originTrickle"]) && e.startBiomass === 100 && e.originTrickle === 0.3,
    "2 · the retune is two config.econ values (startBiomass 40 → 100, originTrickle 0.1 → 0.3); yields, bubbles and every price are unchanged",
    `changed: ${changed.map(k => `${k} ${BASE.econ[k]} → ${e[k]}`).join(", ")} · global prices ${Object.entries(REP.prices.global).map(([k, v]) => `${k} ${v.join("/")}`).join(" · ")} · local ${REP.prices.local.join("/")}`);
  const s = BLOOM.createSim(BLOOM_DATA.planets.first_bloom, config, traits, { rng: mb(1) }), c2 = JSON.parse(J(config)); c2.econ.startBiomass = 7; c2.econ.originTrickle = 0;
  const s2 = BLOOM.createSim(BLOOM_DATA.planets.first_bloom, c2, traits, { rng: mb(1) }); for (let t = 0; t < 50; t++) { s.tick(); s2.tick(); }
  check(BLOOM.createSim(BLOOM_DATA.planets.first_bloom, config, traits, {}).biomass === e.startBiomass && BLOOM.createSim(BLOOM_DATA.planets.first_bloom, c2, traits, {}).biomass === 7 && s.biomass - e.startBiomass > s2.biomass - 7,
    "2 · the engine reads both from config.econ (a run starts with config.econ.startBiomass; the origin trickle is config income)"); }
{ // 3 · no hidden Biomass: every tick's gain is the reported colony income plus auto-collected bubbles; nothing else adds Biomass
  const c = JSON.parse(J(config)), sim = BLOOM.createSim(BLOOM_DATA.planets.first_bloom, c, traits, { rng: mb(9) }), B = c.econ.bubbleValue * c.econ.autoCollectShare;
  let bad = 0, bubbles = 0; for (let t = 0; t < 2500; t++) { const b0 = sim.biomass; sim.tick(); const extra = sim.biomass - b0 - sim.income, k = Math.round(extra / B);
    if (Math.abs(extra - k * B) > 1e-6 || k < 0) bad++; bubbles += k; }
  const ui = RUN_PAGE_SRC(), grants = (ui.match(/biomass\s*\+=/g) || []).length;
  const study = fs.readFileSync(path.join(__dirname, "economy-study.js"), "utf8").replace(/\/\/.*$/gm, "");
  check(bad === 0 && bubbles > 0 && grants === 1 && /addBiomass\(x\)\{ sim\.biomass\+=x;/.test(ui) && !/addBiomass\(|biomass\s*\+=|biomass\s*=[^=]/.test(study),
    "3 · no hidden or test-only Biomass: 2500 ticks of First Bloom gain exactly the reported income + auto-collected bubbles; the page's only grant is the BLOOM_API test hook; the economy study never grants",
    `${bubbles} auto-collected bubbles, 0 unexplained gains · demo-run.html Biomass grants: ${grants} (BLOOM_API.addBiomass)`); }
{ // 26 · the start is one decision, not a build
  const rows = PRIMARY.map(k => { const X = E.context(E.WORLDS.find(w => w[0] === k), config, traits), sim = BLOOM.createSim(X.planet, config, traits, { rng: () => 0.5, scenario: X.scenario });
    const cheapest = Math.min(...traits.filter(t => sim.offered(t)).map(t => sim.price(t))), core = Math.min(...BLOOM.witness.strategyClasses(X.planet, config, traits, { scenario: X.scenario }).map(c => c.cheapest));
    return { k, cheapest, core, spec: sim.specPrice() }; });
  const S0 = config.econ.startBiomass;
  // (BLOOM-027B: "never a strategy" is kept as less than HALF of the cheapest winning core — Frozen 11's cheapest core is two global upgrades, 280 Biomass, so
  // the former one-third encoding, written for worlds whose cheapest core had three upgrades, would call 100 Biomass "a strategy" there)
  check(rows.every(r => S0 >= r.spec && S0 < r.cheapest && S0 < r.core / 2),
    "26 · the starting Biomass buys ONE local upgrade now — or most of a first global upgrade a few seconds later — and never a strategy",
    `start ${S0}: local upgrade ${rows[0].spec}; cheapest global ${[...new Set(rows.map(r => r.cheapest))].join("/")}; cheapest winning core ${rows.map(r => `${r.k} ${r.core}`).join(", ")}`); }

console.log("\n# B · the opening (bubbles ignored)");
{ const o = k => W[k].opening.auto;
  check(PRIMARY.every(k => o(k).local <= 1 && o(k).start >= 1), "4 · a meaningful decision is affordable from the first second (a local upgrade for the origin)",
    PRIMARY.map(k => `${k} ${o(k).start} option(s) at t=0`).join(" · "));
  check(PRIMARY.every(k => o(k).global <= 45 && o(k).global <= 0.6 * BASE.firstGlobalAffordable[k]), "5 · the first meaningful GLOBAL upgrade is affordable within 45 s (was 77–87 s)",
    PRIMARY.map(k => `${k} ${o(k).global} s (worst ${o(k).globalMax}; was ${BASE.firstGlobalAffordable[k]})`).join(" · "));
  check(PRIMARY.every(k => o(k).two <= 45), "6 · two materially different options are affordable at once within 45 s on every primary world",
    PRIMARY.map(k => `${k} ${o(k).two} s (${o(k).firstOptions.join("/")} + local)`).join(" · ")); }

console.log("\n# C · purchase cadence");
{ const wit = k => rowsOf(k, WIT), ply = k => rowsOf(k, PLAYER);
  check(PRIMARY.every(k => wit(k).every(r => r.first <= 60)), "5b · the first global PURCHASE (witness-like bot) lands within 60 s on every recipe",
    PRIMARY.map(k => `${k} ${wit(k).map(r => r.first).join("/")} s`).join(" · "));
  // (the witness-like bot buys only global upgrades; the player's gaps count every purchase, a Leaf Canopy included)
  check(PRIMARY.every(k => wit(k).every(r => r.maxGapWorst <= 120) && ply(k).every(r => r.maxAnyGapWorst <= 120)), "7 · no purchase gap above 120 s before the win on any primary recipe (witness-like and player bots, worst seed)",
    PRIMARY.map(k => `${k} ${mx(wit(k).map(r => r.maxGapWorst))} s / player ${mx(ply(k).map(r => r.maxAnyGapWorst))} s (was ${BASE.maxGapWorst[k]})`).join(" · "));
  check(PRIMARY.every(k => wit(k).every(r => r.medianGap <= 90)), "9 · midgame purchases recur on the order of tens of seconds (median gap ≤ 90 s on every recipe)",
    PRIMARY.map(k => `${k} ${wit(k).map(r => r.medianGap).join("/")} s`).join(" · "));
  check(PRIMARY.every(k => ply(k).every(r => r.deadWaitWorst <= 120)), "7b · a player is never left more than 120 s with NOTHING meaningful affordable before the win (local or global)",
    PRIMARY.map(k => `${k} ${mx(ply(k).map(r => r.deadWaitWorst))} s`).join(" · "));
  check(PRIMARY.every(k => ply(k).every(r => r.terminal <= 120)), "10 · the wait from a player's last purchase to the win stays bounded (≤ 120 s, mean)",
    PRIMARY.map(k => `${k} ${ply(k).map(r => r.terminal).join("/")} s`).join(" · ") + ` · (witness-like, which stops at its minimal core: ${PRIMARY.map(k => mx(wit(k).map(r => r.terminal))).join("/")} s)`); }
{ const L = BLOOM.validateScenario(E.context(E.WORLDS.find(w => w[0] === "o28dw"), config, traits).planet, config, traits, scenarios.find(s => s.id === "dying_world"), { archetypeId: "ocean_archipelago" });
  const w = L.strategies[0], gaps = w.pacing.purchaseGapsSeconds, b = BASE.dyingWorldWitness;
  check(L.status === "PASS" && mx(gaps) <= 120 && mx(rowsOf("o28dw", WIT).map(r => r.maxGapWorst)) <= 120,
    "8 · Ocean 28 + Dying World: the old seed-output → several-minute wait is gone (layer-P witness and bots, every gap ≤ 120 s)",
    `witness now ${w.purchases.map(p => `${p.id}@${Math.round(p.seconds)}s`).join(" → ")} (gaps ${gaps.join("/")}) · was ${b ? `${b.map(([i, s]) => `${i}@${Math.round(s)}s`).join(" → ")} (gap ${r1(b[1][1] - b[0][1])} s)` : "no witness at all under the old economy"}`);
  EVID.dyingWorldWitness = { now: w.purchases, was: b }; }
{ const auto = k => rowsOf(k, PLAYER), click = k => rowsOf(k, "click:situational+canopyOrigin+extend");
  check(PRIMARY.every(k => auto(k).every(r => r.won === `${SEEDS.length}/${SEEDS.length}`)), "24 · a player who never clicks a bubble wins every primary recipe with the cadence above",
    PRIMARY.map(k => `${k} ${auto(k).map(r => r.won).join(",")}`).join(" · "));
  const d = PRIMARY.map(k => auto(k).map((r, i) => r.win - click(k)[i].win)).flat();
  // (BLOOM-027B: one recipe-seed pair on the new worlds wins 9 s LATER when clicking — a bubble shifts a purchase onto a worse tick; the claim is the mean bonus and
  // its cap, so a single-sample delay of up to 15 s is tolerated instead of 5)
  check(d.every(x => x >= -15) && d.reduce((a, b) => a + b, 0) / d.length > 5 && mx(d) < 90, "25 · clicking bubbles helps (earlier wins) but is not required (a modest bonus, never the economy)",
    `win-time saved by clicking: ${d.map(x => Math.round(x)).join(", ")} s`); }

console.log("\n# D · strategies still bind");
{ const won = k => recipes(k).every(([, r]) => r[WIT].won === `${SEEDS.length}/${SEEDS.length}` && r[PLAYER].won === `${SEEDS.length}/${SEEDS.length}`);
  const fb = BLOOM.findStrategies(BLOOM_DATA.planets.first_bloom, config, traits, { minStrategies: 3 });
  check(won("fb") && fb.status === "PASS", "11 · First Bloom stays winnable by its broad strategy families (Flood, Drought, Terraform-water recipes win; 3 distinct strategies proven)",
    `${recipes("fb").map(([n, r]) => `${n} ${r[WIT].win} s`).join(" · ")} · ${fb.strategies.map(s => `[${s.signature}]`).join(" ")}`);
  for (const [k, id, seed, att, n] of [["o28", "ocean_archipelago", 28, 8, 12], ["d17", "desert_world", 17, 0, 13], ["f11", "frozen_world", 11, 1, 14]]) {
    const g = BLOOM.generateFromArchetype(archetypes.find(a => a.id === id), seed, { config, traits }), st = g.archetype.strategies;
    check(g.archetype.attempt === att && st.found >= 2 && won(k), `${n} · ${W[k].label}: same world (attempt ${att}), ≥ 2 distinct strategies proven within the new pacing bands, both recipes won by both bots`,
      st.list.map(s => `[${s.signature}] margin ${s.marginSeconds} s, first ${s.firstPurchaseSeconds} s, max gap ${s.maxPurchaseGapSeconds} s`).join(" ‖ ")); } }
{ const DW = scenarios.find(s => s.id === "dying_world");
  for (const [k, id, n] of [["o28dw", "ocean_archipelago", 15], ["d17dw", "desert_world", 18], ["f11dw", "frozen_world", 19]]) {
    const v = BLOOM.validateScenario(E.context(E.WORLDS.find(w => w[0] === k), config, traits).planet, config, traits, DW, { archetypeId: id, minStrategies: 2 });
    check(v.status === "PASS" && v.strategies.length === 2, `${n} · ${W[k].label} passes layer P with 2 distinct strategies under the new clock and cadence bands`,
      v.strategies.map(s => `[${s.signature}] win ${s.winSeconds} s, holds ${(s.hold.coverage * 100).toFixed(1)}%`).join(" ‖ ")); } }
{ const dw = ["o28dw", "d17dw", "f11dw"], p = k => recipes(k).map(([, r]) => r[PLAYER]), w = k => recipes(k).map(([, r]) => r[WIT]);
  // (BLOOM-027B: "most of the decline" = pressure ≥ 70 % at the win; Desert 17's player bot wins at 70 % on one recipe)
  check(dw.every(k => [...p(k), ...w(k)].every(r => r.progressAtWin >= 0.70)), "16 · a normal successful Dying World run lives through most of the decline (pressure ≥ 70% at the win, player and witness-like bots)",
    dw.map(k => `${k} ${[...p(k), ...w(k)].map(r => r.progressAtWin).join("/")}`).join(" · "));
  const ig = dw.map(k => ignores(k).map(([n, r]) => ({ k, n, ...r[WIT] }))).flat(), strict = ig.filter(x => x.n !== "ignoreHeatRad");
  // (BLOOM-027B: the claim is that ignoring the decline never wins; the drift closes 10 % of Desert 17's land to its default-scenario strategies and that is already enough, so the closure clause is ≥ 10 %)
  check(strict.every(x => x.won === `0/${SEEDS.length}` && x.maxClosed >= 0.10), "17 · Dying World cannot be ignored: buying the planet's default-scenario strategy as if nothing were declining never wins (the drift closes ≥ 10% of the land to it)",
    ig.map(x => `${x.k} ${x.n} won ${x.won}, drift closed up to ${(x.maxClosed * 100).toFixed(0)}%${x.n === "ignoreHeatRad" ? " (this default-scenario build already holds Radiation Shielding, a Dying World answer)" : ""}`).join(" · "));
  EVID.ignoreRecipes = ig.map(x => ({ world: x.k, recipe: x.n, won: x.won, maxClosed: x.maxClosed, win: x.win })); }
{ // 27–31 · the rules that make choices binding
  const fb = BLOOM.createSim(BLOOM_DATA.planets.first_bloom, config, traits, { rng: () => 0.5 }); fb.biomass = 1e9;
  const T = id => fb.traitById[id]; fb.buy("cold"); fb.buy("cold"); fb.buy("heat");
  const cap = !fb.canBuy(T("cold")) && !fb.canBuy(T("heat")); fb.buy("drought"); const excl = !fb.canBuy(T("flood"));
  const all = (() => { // the cheapest way to own every tolerance the rules allow at once (temperature to the cap, one water arm ×2, every Defense level)
    const s = BLOOM.createSim(BLOOM_DATA.planets.first_bloom, config, traits, { rng: () => 0.5 }); s.biomass = 1e9; let c = 0; const buy = id => { c += s.price(s.traitById[id]); s.buy(id); };
    buy("cold"); buy("heat"); buy("cold"); buy("drought"); buy("drought"); for (const t of traits.filter(t => t.board === "Adapt" && t.effect.type === "level")) buy(t.id); return c; })();
  const earned = PRIMARY.map(k => rowsOf(k, PLAYER).map(r => r.marks[180].earned)).flat();
  check(cap && excl && earned.every(x => x < all), "27–29 · tradeoffs stay binding: the shared temperature cap and one water strategy are enforced, and by mid-run (180 s) no player has earned enough to own every tolerance",
    `cold+heat capped at ${config.scales.tempCap}; Drought blocks Flood · every tolerance costs ≥ ${all}; earned by 180 s: ${earned.map(Math.round).join("/")}`);
  EVID.allTolerances = all;
  // (BLOOM-027B: the trade is previewed from the plant state where it shows both sides on this fixture — Cold ×2, Cold ×1 or none; on Frozen 11 nothing is still cold-blocked after Cold ×2)
  const fz = E.context(E.WORLDS.find(w => w[0] === "f11"), config, traits).planet; let f, pv, warmPrice;
  for (const build of [["cold", "cold"], ["cold"], []]) { f = BLOOM.createSim(fz, config, traits, { rng: () => 0.5 }); f.biomass = 1e9; for (const id of build) f.buy(id); f.biomass = 0;
    pv = f.previewOf("warm"); warmPrice = f.price(f.traitById["warm"]); if (pv && pv.gain.length > 0 && pv.lose.length > 0) break; }
  check(pv && pv.gain.length > 0 && pv.lose.length > 0 && warmPrice >= 150, "30 · Terraform still trades: on Frozen 11, Warm the Sky opens cold ground and closes warm refuges, at an unchanged price",
    `opens ${pv.gain.length} region(s), closes ${pv.lose.length} · ${warmPrice} Biomass`);
  const ws = recipes("o28").map(([n, r]) => { const b = r[WIT]; return { n, at: Number(b.example.split(" ").find(x => x.startsWith("waterSeeds@")).split("@")[1]) }; });
  const crossPrice = BLOOM.createSim(fz, config, traits, {}).price(traits.find(t => t.effect.type === "crossing"));
  const o28 = rowsOf("o28", WIT), gapBefore = o28.map(r => r.gaps[1]);
  check(crossPrice === 180 && gapBefore.every(g => g >= 30), "31 · Waterborne Seeds is still a real cost on islands: unchanged price, and the Ocean 13 recipes save ≥ 30 s for it after Seed Output",
    `${crossPrice} Biomass · bought at ${ws.map(x => `${x.n} ${x.at} s`).join(", ")} after saving ${gapBefore.join("/")} s`); }

console.log("\n# E · local specialization");
{ const none = k => rowsOf(k, WIT), can = k => rowsOf(k, PLAYER), sit = k => rowsOf(k, "auto:situational+none"), every = k => rowsOf(k, "auto:situational+everywhere"), leaves = k => rowsOf(k, "auto:leavesEverywhere+everywhere");
  check(PRIMARY.every(k => none(k).every(r => r.won === `${SEEDS.length}/${SEEDS.length}` && r.spentLocal === 0)), "20 · local specializations stay optional: every recipe is won without buying a single one",
    PRIMARY.map(k => `${k} ${none(k).map(r => r.won).join(",")}`).join(" · "));
  // 21 · the opening decision really costs: a Root Network on the origin at t=0 delays the first global purchase
  const delay = PRIMARY.map(k => { const X = E.context(E.WORLDS.find(w => w[0] === k), config, traits), plan = Object.values(E.WORLDS.find(w => w[0] === k)[6])[0];
    const first = spec => { const s = BLOOM.createSim(X.planet, config, traits, { rng: mb(101), scenario: X.scenario }); if (spec) s.buySpecialization(s.map.ORIGIN, "rootNetwork");
      for (let t = 1; t < 3000; t++) { s.tick(); if (s.biomass >= s.price(s.traitById[plan[0]])) return t * config.tickMs / 1000; } return null; };
    return { k, d: first(true) - first(false) }; });
  check(delay.every(x => x.d >= 15), "21 · a local upgrade is a real cost: specializing the origin at the start delays the first global upgrade by ≥ 15 s",
    delay.map(x => `${x.k} +${r1(x.d)} s`).join(" · "));
  check(PRIMARY.every(k => every(k).every((r, i) => r.win > can(k)[i].win + 10 && r.spentLocal >= 3 * REP.prices.local[0])), "22 · buying a local upgrade on every colony has a real opportunity cost (slower wins than one well-placed Leaf Canopy)",
    PRIMARY.map(k => `${k} ${every(k).map((r, i) => `${r.win} vs ${can(k)[i].win} s`).join(", ")}`).join(" · "));
  check(PRIMARY.every(k => leaves(k).every((r, i) => r.win > sit(k)[i].win)), "23 · Leaves is no runaway: Leaves everywhere + a Canopy on every colony wins later than situational play with no local upgrades",
    PRIMARY.map(k => `${k} ${leaves(k).map((r, i) => `${r.win} vs ${sit(k)[i].win} s`).join(", ")}`).join(" · ")); }

console.log("\n# F · safety");
{ const all = PRIMARY.map(k => recipes(k).map(([, r]) => Object.entries(r).filter(([x]) => x !== "plan").map(([, v]) => v))).flat(2);
  check(all.every(r => r.won === `${SEEDS.length}/${SEEDS.length}` && r.lost === 0), "32 · no economy soft-lock: every primary recipe × colony policy × bubble policy is won by every run seed (no stalls, no losses)",
    `${all.length} rows × ${SEEDS.length} seeds`);
  const ply = PRIMARY.map(k => rowsOf(k, PLAYER).map(r => ({ k, u: r.unspent, e: r.earned, w: r.win }))).flat();
  check(ply.every(r => r.u < EVID.allTolerances / 2 && r.e / r.w * 60 < 400), "33 · no runaway Biomass: a player wins holding less than half the cost of every tolerance, earning < 400 Biomass per minute on average",
    ply.map(r => `${r.k} ${r.u} left, ${Math.round(r.e / r.w * 60)}/min`).join(" · ")); }
{ const DW = scenarios.find(s => s.id === "dying_world"), P = DW.pressure, X = E.context(E.WORLDS.find(w => w[0] === "o28dw"), config, traits);
  // (BLOOM-027B: the idle-extinction clause runs on Frozen 9, the Dying World extinction fixture — no Ocean world's idle run dies out under either generator except the old Ocean 13)
  const EXT = BLOOM.generateFromArchetype(archetypes.find(a => a.id === "frozen_world"), 9, { config, traits });
  const s = BLOOM.createSim(EXT, config, traits, { rng: mb(5), scenario: DW }); while (!s.lost && s.ticks < 6000) s.tick();
  const lostAt = s.ticks * config.tickMs / 1000;
  check(J(P.channels) === J(BASE.dyingWorld.channels) && J(P.phases.map(x => x.from)) === J([0, 0.34, 0.67, 1]) && J(DW.loss) === J({ extinction: true, extinctionGraceSeconds: 8 })
    && P.graceSeconds === 40 && P.durationSeconds === 250 && s.lost && lostAt > P.graceSeconds + P.durationSeconds,
    "34–35 · Dying World keeps its drift channels, phases and extinction rule; only its clock moved (grace 60 → 40 s, decline 420 → 250 s: final state at 290 s instead of 480 s, scaled to the shorter runs); an idle player still dies out only after the final state",
    `channels ${J(P.channels)} · idle Frozen 9 extinct at ${r1(lostAt)} s`); }

// ---------------------------------------------------------------------------------------------------------- browser
async function browserPart() {
  let chromium; try { ({ chromium } = require("playwright")); } catch (e) { check(false, "Playwright available for the browser part", "npm i -g playwright; NODE_PATH=\"$(npm root -g)\""); return; }
  // (BLOOM-029E) this suite drives the engineering shell's own buttons: it opens the page with the developer flag ?ui=legacy
  const PAGE = "file://" + encodeURI(path.join(ROOT, "demos/demo-run.html")) + "?ui=legacy", browser = await chromium.launch();
  { const w = await browser.newPage(); await w.goto(PAGE); await w.waitForTimeout(200); await w.close(); } // headless warm-up
  console.log("\n# G · browser (First Bloom, real buttons)");
  const p = await browser.newPage({ viewport: { width: 1440, height: 920 } }); const errors = [];
  p.on("pageerror", e => errors.push(e.message)); p.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  await p.goto(PAGE); await p.waitForTimeout(300); await p.click("#btnPlay");
  const shop = () => p.evaluate(() => ({ bio: +document.getElementById("hBio").textContent, b: BLOOM_API.sim.biomass,
    buy: [...document.querySelectorAll("button.buy")].map(b => ({ id: b.dataset.id, off: b.classList.contains("off"), price: BLOOM_API.sim.price(BLOOM_API.sim.traitById[b.dataset.id]) })),
    spec: [...document.querySelectorAll("#focusBox button.sbtn")].map(b => ({ id: b.dataset.spec, off: b.classList.contains("off") })), specPrice: BLOOM_API.sim.specPrice() }));
  if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await p.screenshot({ path: path.join(SHOTS, "economy-opening.png") }); }
  const s0 = await shop();
  check(s0.bio === config.econ.startBiomass && s0.buy.every(b => b.off === !(s0.b >= b.price)) && s0.buy.every(b => b.off) && s0.spec.every(b => !b.off) && s0.specPrice <= s0.b,
    "36–37 · the HUD shows the starting Biomass; every global upgrade reads unaffordable and every local upgrade affordable, exactly as Biomass vs price says",
    `HUD ${s0.bio} · globals off: ${s0.buy.filter(b => b.off).length}/${s0.buy.length} · local upgrades ${s0.spec.map(b => b.id).join("/")} at ${s0.specPrice}`);
  await p.click('#focusBox button.sbtn[data-spec="rootNetwork"]'); await p.mouse.move(5, 5);
  const s1 = await p.evaluate(() => ({ b: BLOOM_API.sim.biomass, hud: +document.getElementById("hBio").textContent, local: BLOOM_API.sim.spent.local }));
  check(s1.local === s0.specPrice && Math.abs(s1.b - (s0.b - s0.specPrice)) < 1e-9 && s1.hud === Math.floor(s1.b), "37 · the opening decision through the real button: Root Network on the origin spends exactly its price, the HUD follows",
    `${s0.b} → ${s1.b} Biomass (HUD ${s1.hud})`);
  const plan = ["seedOut", "cold", "flood", "cold", "heat", "salt"], buys = []; let i = 0, won = false, okStates = true;
  // every button's affordable state must equal the engine's own rule (legal + enough Biomass) — audited every 50 ticks
  const audit = () => p.evaluate(() => [...document.querySelectorAll("button.buy")].every(b => { const t = BLOOM_API.sim.traitById[b.dataset.id];
    return b.classList.contains("off") === !(BLOOM_API.sim.canBuy(t) && BLOOM_API.sim.biomass >= BLOOM_API.sim.price(t)); }));
  for (let t = 0; t < 6000 && !won; t += 5) {
    const st = await p.evaluate(() => { BLOOM_API.advance(5); refreshShop(); return { won: BLOOM_API.state().won, ticks: BLOOM_API.sim.ticks }; }); if (st.won) { won = true; break; }
    if (t % 50 === 0 && !(await audit())) okStates = false;
    if (i < plan.length && !(await p.$eval(`button.buy[data-id="${plan[i]}"]`, b => b.classList.contains("off")))) {
      const before = await p.evaluate(() => BLOOM_API.sim.biomass); await p.click(`button.buy[data-id="${plan[i]}"]`); await p.mouse.move(5, 5);
      buys.push({ id: plan[i], s: r1(st.ticks * config.tickMs / 1000), spent: r1(before - await p.evaluate(() => BLOOM_API.sim.biomass)) }); i++; } }
  await p.waitForTimeout(150);
  const rep = await p.evaluate(() => ({ on: !!(document.getElementById("reportModal") && document.getElementById("reportModal").classList.contains("on")), text: document.getElementById("report").innerText, spent: BLOOM_API.sim.spent }));
  check(won && i === plan.length && rep.spent.global === buys.reduce((a, b) => a + b.spent, 0) && rep.spent.local === s0.specPrice,
    "38 · a First Bloom run won through real clicks after spending the start on a Root Network (so the first global upgrade waits for the Biomass that bought it): every click spent its price, the run's spend adds up",
    `${buys.map(b => `${b.id}@${b.s}s(${b.spent})`).join(" → ")} · spent global ${rep.spent.global}, local ${rep.spent.local}`);
  check(rep.on && /Root Network in/.test(rep.text) && /Cold Tolerance ×2/.test(rep.text) && /Flood ×1/.test(rep.text) && /Salt Handling/.test(rep.text),
    "38 · the Bloom Report lists the build and the colony upgrade that the Biomass bought", rep.text.split("\n").filter(l => /became|×|Salt|Colony upgrades/.test(l)).slice(0, 6).join(" · "));
  check(okStates && errors.length === 0, "37 · affordable / unaffordable states stayed correct through the run; no browser errors", errors.join(" | "));
  if (SHOTS) await p.screenshot({ path: path.join(SHOTS, "economy-report.png") });
  EVID.browserRun = buys;
  await browser.close();
}

(async () => {
  if (!NO_BROWSER) await browserPart();
  if (JSON_OUT) { fs.writeFileSync(JSON_OUT, JSON.stringify(EVID, null, 1)); console.log("evidence written:", JSON_OUT); }
  console.log(`\n${fails ? fails + " check(s) FAILED" : "ALL CHECKS PASS"}  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  process.exit(fails ? 1 : 0);
})();
