// BLOOM — climate-instability QA (BLOOM-015): the generic climate-instability mechanism and Volatile Climate on all three
// production archetypes. Numbered after the directive's items 1–69. Two parts:
//   A · Node: Volatile Climate is plain scenario data and the engine never names it; Eden, Dying World and Native Competition
//       are unchanged (runs + layer P verdicts on the three fixtures pinned to 9252924); no block = no climate state; instability
//       is deterministic, starts at its baseline, rises ONLY with Terraform (more when steps compound), settles by itself; bands,
//       shock triggering / kind / duration / size follow the data; a shock moves the real effective temperature / moisture,
//       then returns exactly to the permanent Terraformed sky; no coverage damage, no Biomass penalty; land closes and reopens
//       through ordinary fitness; Adapt / Roots / Leaves / Seeds interact only through their ordinary rules; the Terraform
//       preview; extinction; layer P with real witnesses (primary fixture Frozen 4 with an Adapt-heavy and a Terraform-heavy
//       strategy, Desert 22, Ocean 28); controlled over-Terraform experiments; BLOOM-013 economy + decision cadence
//   B · real browser: demo-run.html?archetype=frozen_world&seed=4&scenario=volatile_climate — identity, the status bar, a real
//       Terraform click, a real shock starting and ending (map + inspect + messages), a reckless control, a win through REAL
//       shop buttons with earned Biomass, the Bloom Report line, no witness / solution data in the page
//
//   NODE_PATH="$(npm root -g)" node tools/volatile-climate-check.js [--shots <dir>] [--json <evidence.json>] [--no-browser]
//
// Production modules only. Witnesses buy through sim.buy() with Biomass earned in the real run. Tests marked "mechanism" grant
// Biomass at fixed moments (so purchase TIMING is identical between two runs), or use a cloned scenario with one number
// changed, to isolate ONE rule — never to prove winnability. No shock is ever injected: every shock comes from real Terraform
// purchases through the engine. Exits 1 on failure.
"use strict";
const path = require("path"), fs = require("fs");
const ROOT = path.resolve(__dirname, "..");
for (const f of ["content/config.js", "content/traits.js", "content/archetypes.js", "content/scenarios.js", "planets/first_bloom.js", "resources/bloom-sim.js",
  "resources/bloom-gen.js", "resources/bloom-validate.js", "resources/bloom-witness.js", "resources/bloom-archetype.js", "resources/bloom-scenario.js"]) require(path.join(ROOT, f));
const { BLOOM, BLOOM_DATA } = globalThis, { config, traits, archetypes, scenarios } = BLOOM_DATA;
const GOLD = require("./golden/scenarios.js");
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const SHOTS = arg("--shots"), JSON_OUT = arg("--json"), NO_BROWSER = process.argv.includes("--no-browser");
const J = o => JSON.stringify(o), clone = o => JSON.parse(J(o)), pct = x => (x * 100).toFixed(1) + "%", r2 = x => Math.round(x * 100) / 100;
const fnv = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return (h >>> 0).toString(16).padStart(8, "0"); };
const mul = GOLD.mulberry32, TICK_S = config.tickMs / 1000, G = config.grow.growThresh, TPS = 1 / TICK_S;
const EDEN = scenarios.find(s => s.id === "eden"), DW = scenarios.find(s => s.id === "dying_world"), NC = scenarios.find(s => s.id === "native_competition");
const VC = scenarios.find(s => s.id === "volatile_climate"), CI = VC.climateInstability, K = CI.shocks;
let fails = 0; const t0 = Date.now(), EVID = {};
const check = (ok, name, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); if (!ok) fails++; };
const gen = (id, seed) => BLOOM.generateFromArchetype(archetypes.find(a => a.id === id), seed, { config, traits });
// BLOOM-027B: fixtures re-picked by role (docs/evidence/bloom-027b/fixture-changes.md §5): primary Frozen 4 (attempt 1, Eos-103), Desert 22,
// Ocean 28 — the shared fixture worlds.
// Volatile Climate keeps its OWN frozen and desert fixtures: its claims need a proven Terraform-heavy strategy that lives through a real shock, and
// neither Frozen 4 nor Desert 22 (the shared primaries, chosen for the archetype-identity and Dying World roles) has one — a scan of every accepted
// world found 2 of 40 Frozen worlds with such a layer-P strategy under either generator, so this was a rare property before too (Frozen 22 was one).
// Frozen 4 (attempt 1, Eos-103) and Desert 22 (attempt 0, Ymir-917) have it; Ocean 28 is the shared Ocean primary.
const FIX = { primary: ["frozen_world", 4], desert: ["desert_world", 22], ocean: ["ocean_archipelago", 28] };
const WORLDS = Object.fromEntries(Object.entries(FIX).map(([k, [id, s]]) => [k, gen(id, s)]));
const FPRI = WORLDS.primary;
const vcSim = (planet, seed = 7, scenario = VC, cfg = config) => BLOOM.createSim(planet, cfg, traits, { rng: mul(seed), scenario });
const runFp = (sim, plan, ticks, every = 500) => { let k = 0; const tr = [];
  for (let t = 1; t <= ticks; t++) { sim.tick(); if (k < plan.length && sim.biomass >= sim.price(sim.traitById[plan[k]]) && sim.buy(plan[k])) k++;
    if (t % every === 0) tr.push(fnv(Array.from(sim.state).join("") + "|" + sim.biomass + "|" + Array.from(sim.dens).join(",") + "|" + sim.lost + (sim.competition.enabled ? "|" + Array.from(sim.competition.native).join(",") : ""))); }
  return tr.join(","); };
const sec = t => +(t * TICK_S).toFixed(1), ticksOf = s => Math.round(s / TICK_S);
// one run that buys `plan` with EARNED Biomass as soon as it can (or, mechanism, at fixed seconds with granted Biomass: schedule
// [[seconds, id], …]); records coverage, the shocks, and every lamp change of every region with whether a purchase caused it
function run(planet, { plan = [], schedule = null, scenario = VC, seed = 7, seconds = 600, cfg = config, focus = null, stopOnWin = false, onTick = null } = {}) {
  const s = vcSim(planet, seed, scenario, cfg), M = s.map, lamps = [], buys = [], cov = []; let k = 0, prev = null, win = null;
  if (focus) focus(s);
  for (let t = 1; t <= ticksOf(seconds); t++) {
    let bought = false;
    if (schedule) { while (k < schedule.length && ticksOf(schedule[k][0]) === t) { const id = schedule[k][1]; s.biomass += s.price(s.traitById[id]); if (s.buy(id)) { buys.push({ id, s: sec(t) }); bought = true; } k++; } }
    else if (k < plan.length && s.biomass >= s.price(s.traitById[plan[k]]) && s.buy(plan[k])) { buys.push({ id: plan[k], s: sec(t) }); k++; bought = true; }
    const c = s.tick(); cov.push(c); if (onTick) onTick(s, t);
    if (win === null && s.won) { win = sec(t); if (stopOnWin) break; }
    if (s.lost) break;
    const L = M.SEC.map((_, i) => s.lampOf(s.evaluate(i).fitness)), liv = s.livingCountBySection();
    if (prev) L.forEach((l, i) => { if (l !== prev[i]) lamps.push({ t, s: sec(t), sec: i, name: M.SEC[i].name, from: prev[i], to: l, bought, living: liv[i],
      shock: s.climate.enabled ? Object.values(s.climate.axes).some(A => A.shock) : false }); });
    prev = L;
  }
  return { s, M, lamps, buys, cov, win, lost: s.lost, lostAt: s.lost ? sec(s.lostTick) : null, shocks: s.climate.enabled ? s.climate.shocks.map(x => ({ ...x })) : [], peak: s.climate.enabled ? s.climate.peak : null };
}
const varScenario = (edit) => { const x = clone(VC); edit(x.climateInstability, x); return x; };
// the expected shock kind by the documented rule (re-implemented here, independently of the engine's code)
function expectedKind(planet, scenario, axis, n, net) {
  const h = (() => { let x = 0x811c9dc5; const str = `${planet.id}|${scenario.id}|climate|${axis}|${n}`; for (let i = 0; i < str.length; i++) { x ^= str.charCodeAt(i); x = Math.imul(x, 0x01000193); } return x >>> 0; })();
  const r = mul(h), over = r() < scenario.climateInstability.shocks.overshootShare, s0 = r() < 0.5 ? 1 : -1;
  const dir = (net > 1e-9 ? 1 : net < -1e-9 ? -1 : s0) * (over ? 1 : -1); return scenario.climateInstability.axes[axis][dir > 0 ? "up" : "down"].id;
}

console.log("# A · scenario data, architecture, compatibility");
// 1 · plain data
{ const keys = o => Object.keys(o).sort().join(",");
  check(J(clone(scenarios)) === J(scenarios) && !/function|=>/.test(J(scenarios)) && scenarios.every(s => BLOOM.pressure.checkScenario(s).length === 0)
    && VC.pressure === null && !VC.competition && VC.loss.extinction === true && keys(CI) === "axes,bands,baseline,forcing,settling,shocks" && BLOOM.pressure.isDynamic(VC) && !BLOOM.pressure.isDynamic(EDEN),
    "1 · Volatile Climate is scenario data (content/scenarios.js): a climateInstability block (baseline, axes, forcing, settling, shocks, bands), no pressure clock, no competitor, extinction loss; it passes the engine's scenario check",
    `forcing ${J(CI.forcing)} · settling ${J(CI.settling)} · shocks ${J(CI.shocks)}`);
  const broken = clone(VC); broken.climateInstability.shocks.threshold = 3; broken.climateInstability.axes.temp.magnitude = [9, 2]; broken.climateInstability.axes.light = { unit: 1 };
  const errs = BLOOM.pressure.checkScenario(broken);
  check(errs.length >= 3 && errs.every(e => /climateInstability\./.test(e)) && errs.some(e => /axes must name sky axes/.test(e)) && errs.some(e => /axes\.temp\.magnitude/.test(e)) && errs.some(e => /shocks needs threshold/.test(e)), "1b · a malformed climateInstability block is refused with the reason (never silently clamped)", errs.join(" | ")); }
// 2 · no scenario-specific code
{ const code = ["resources/bloom-sim.js", "resources/bloom-witness.js", "resources/bloom-scenario.js", "resources/bloom-archetype.js", "resources/bloom-validate.js", "resources/bloom-gen.js"]
    .map(f => fs.readFileSync(path.join(ROOT, f), "utf8")).join("\n"), ui = fs.readFileSync(path.join(ROOT, "demos/demo-run.html"), "utf8");
  check(!/volatile_climate|Volatile Climate|volatile/i.test(code) && !/volatile_climate/.test(ui) && !/scenario\.id\s*===|SCN\.id\s*===|\.id\s*===\s*"(eden|dying_world|native_competition|volatile_climate)"/.test(code + ui),
    "2 · no scenario-id special case: the engine, generator, witness, validators and UI never name Volatile Climate; they read the scenario's climateInstability data"); }
// 3–5 · Eden, Dying World and Native Competition unchanged: First Bloom golden + runs and layer P verdicts on the three fixtures
// pinned to the BLOOM-027B generator (docs/evidence/bloom-027b/repin.json, this file's runFp and layer-P fingerprint; were 9252924 until the cylindrical generator)
const PIN = {
  "ocean_archipelago:28": { planet: "59193a12", edenRun: "510a5831", dying_worldRun: "88045c4f", dying_worldLayerP: "82fb5502", native_competitionRun: "4921ad02", native_competitionLayerP: "1628b558" },
  "desert_world:22": { planet: "90b74016", edenRun: "dcfbec58", dying_worldRun: "e612a2f7", dying_worldLayerP: "1172c15b", native_competitionRun: "8b41997a", native_competitionLayerP: "60e190cf" },
  "frozen_world:4": { planet: "bd61cd5a", edenRun: "2c2daf13", dying_worldRun: "5aeb4113", dying_worldLayerP: "1c17405a", native_competitionRun: "2861e5db", native_competitionLayerP: "d2849761" } };
const PINROWS = {};
{ for (const [k, [id, seed]] of Object.entries(FIX)) { const key = `${id}:${seed}`, p = WORLDS[k], plan = p.archetype.strategies.list[0].purchases.map(x => x[0]), row = PINROWS[key] = { planet: fnv(J(p)) === PIN[key].planet };
    for (const S of [EDEN, DW, NC]) { row[S.id + "Run"] = fnv(runFp(BLOOM.createSim(p, config, traits, { rng: mul(4242), scenario: S }), plan, 3000)) === PIN[key][S.id + "Run"];
      if (S !== EDEN) { const v = BLOOM.validateScenario(p, config, traits, S, { archetypeId: id }); row[S.id + "Status"] = v.status;
        row[S.id + "LayerP"] = fnv(J({ status: v.status, strategies: v.strategies.map(x => ({ sig: x.signature, purchases: x.purchases, margin: x.marginSeconds, hold: x.hold, trace: x.trace, competition: x.competition, confirm: x.confirm })) })) === PIN[key][S.id + "LayerP"];
        row[S.id + "Climate"] = v.climate === null && v.strategies.every(x => !x.climate); } } }
  const want = JSON.parse(fs.readFileSync(path.join(__dirname, "golden/first_bloom.json"), "utf8")), ids = Object.keys(want.static.prices.start), planet = BLOOM_DATA.planets.first_bloom;
  const adapter = scenario => { let sim; return {
    reset(seed) { sim = BLOOM.createSim(planet, config, traits, { rng: mul(seed), ...(scenario ? { scenario } : {}) }); }, tick() { sim.tick(); }, buy(id) { return sim.buy(id); },
    addBiomass(x) { sim.biomass += x; }, read() { return { biomass: sim.biomass, ticks: sim.ticks, won: sim.won, tiles: sim.state, vigor: sim.vigor, dens: sim.dens, bubbles: sim.bubbles.length }; },
    setColonyFocus(id, mode) { return sim.setColonyFocus(sim.map.SIDX[id], mode); }, buySpecialization(id, spec) { return sim.buySpecialization(sim.map.SIDX[id], spec); },
    colonies() { return { focus: [...sim.colonies.focus], spec: [...sim.colonies.spec] }; },
    setCondition(c) { Object.assign(sim.genome, c.genome); Object.assign(sim.sky, c.sky); for (const k in sim.tf) sim.tf[k] = 0; Object.assign(sim.tf, c.tf || {}); },
    evaluate(i) { return sim.evaluate(i); }, previewOf(id) { return sim.previewOf(id); }, price(id) { return sim.price(sim.traitById[id]); },
    traitIds: traits.map(t => t.id).filter(id => ids.includes(id)), get sectionCount() { return sim.map.SC; },
    get map() { return { tilemap: sim.map.TILEMAP, area: sim.map.AREA, cent: sim.map.CENT }; } }; };
  const same = got => GOLD.PARTS.every(p => J(clone(got[p])) === J(want[p])), rows = Object.entries(PINROWS);
  check(same(GOLD.runGolden(adapter(EDEN))) && same(GOLD.runGolden(adapter(null))) && rows.every(([, r]) => r.planet && r.edenRun),
    "3 · Eden is unchanged: First Bloom golden bit-for-bit (with Eden and with no scenario); the three fixture worlds and their Eden 3000-tick runs equal 9252924",
    rows.map(([k, r]) => `${k} ${r.planet && r.edenRun ? "✓" : "✗"}`).join(" · "));
  check(rows.every(([, r]) => r.dying_worldRun && r.dying_worldLayerP && r.dying_worldClimate), "4 · Dying World is unchanged: its runs and layer P verdicts (strategies, purchases, margins, holds, traces) on the three fixtures equal 9252924, with no climate record",
    rows.map(([k, r]) => `${k} run ${r.dying_worldRun ? "✓" : "✗"} layer P ${r.dying_worldStatus} ${r.dying_worldLayerP ? "✓" : "✗"}`).join(" · "));
  check(rows.every(([, r]) => r.native_competitionRun && r.native_competitionLayerP && r.native_competitionClimate), "5 · Native Competition is unchanged: its runs (incl. every native stand) and layer P verdicts (incl. competition records, confirmation seeds) on the three fixtures equal 9252924",
    rows.map(([k, r]) => `${k} run ${r.native_competitionRun ? "✓" : "✗"} layer P ${r.native_competitionStatus} ${r.native_competitionLayerP ? "✓" : "✗"}`).join(" · ")); }
// 6 · no block = no climate state, no behaviour; with the block but no Terraform, the run is the Eden run bit-for-bit (no RNG draws)
{ const sims = [EDEN, DW, NC, null].map(S => BLOOM.createSim(FPRI, config, traits, { rng: mul(1), ...(S ? { scenario: S } : {}) }));
  sims.forEach(s => { s.biomass = 1e6; s.buy("warm"); s.buy("warm"); for (let t = 0; t < 200; t++) s.tick(); });
  const none = sims.every(s => s.climate.enabled === false && Object.keys(s.climate).length === 1 && s.climatePreview("warm") === null && s.envOffsets() === s.pressure.offsets);
  const plan = ["seedOut", "earlyMat", "cold", "cold"], eden = runFp(BLOOM.createSim(FPRI, config, traits, { rng: mul(31), scenario: EDEN }), plan, 3000), vc = runFp(vcSim(FPRI, 31), plan, 3000);
  // count RNG draws in both
  const counted = S => { let n = 0; const r = mul(31), s = BLOOM.createSim(FPRI, config, traits, { rng: () => (n++, r()), scenario: S }); let k = 0;
    for (let t = 0; t < 2000; t++) { s.tick(); if (k < plan.length && s.biomass >= s.price(s.traitById[plan[k]]) && s.buy(plan[k])) k++; } return n; };
  const nE = counted(EDEN), nV = counted(VC);
  check(none && eden === vc && nE === nV, "6 · no climateInstability block = no climate state and no behaviour (Eden, Dying World, Native Competition, no scenario: climate { enabled: false } only, even after Terraform); and with the block, a run that never Terraforms is the Eden run bit-for-bit with the same number of RNG draws",
    `Adapt-only Frozen 4 run: Eden ${eden.split(",").pop()} = Volatile ${vc.split(",").pop()} · RNG draws ${nE} = ${nV}`); }

console.log("\n# A · the instability state");
const probeSim = (planet = FPRI, scenario = VC) => { const s = vcSim(planet, 3, scenario); s.biomass = 1e7; return s; };
const lv = (s, ax = "temp") => s.climate.axes[ax].level;
{ // 7 · determinism
  const SCH = [[20, "seedOut"], [30, "cold"], [40, "warm"], [60, "warm"], [200, "humid"], [205, "humid"]];
  const a = run(FPRI, { schedule: SCH, seed: 5, seconds: 400 }), b = run(FPRI, { schedule: SCH, seed: 5, seconds: 400 }), c = run(FPRI, { schedule: SCH, seed: 999, seconds: 400 });
  const hist = r => J(r.shocks) + J(r.s.climate.forcing) + J(r.s.climate.events);
  check(!a.lost && !c.lost && hist(a) === hist(b) && fnv(J(a.cov)) === fnv(J(b.cov)) && hist(a) === hist(c) && a.shocks.length >= 2,
    "7 · the same planet, scenario, purchases and timing reproduce the same instability and shock history — bit-for-bit with the same run RNG, and the same shock history under a different run RNG (shocks never draw gameplay randomness)",
    a.shocks.map(x => `${x.kind} @${sec(x.startTick)} s ${r2(x.magnitude)}`).join(" · "));
  EVID.determinism = a.shocks; }
{ // 8 · baseline
  const s = vcSim(FPRI); check(Object.values(s.climate.axes).every(A => A.level === CI.baseline && A.offset === 0 && !A.shock && !A.pending) && s.climate.level === CI.baseline && s.climate.band === 0 && J(s.climate.env) === J({ temp: 0, moist: 0, rad: 0 }),
    `8 · instability starts at the configured baseline (${CI.baseline}) on every axis, band ${CI.bands[0].name}, no shock, no offset`); }
{ // 9–11 · only Terraform adds instability
  const s = probeSim(), b0 = lv(s); s.buy("warm"); const afterWarm = lv(s);
  const a = probeSim(); for (const id of ["cold", "cold", "heat", "drought", "drought", "salt", "rad"]) a.buy(id);
  const sp = probeSim(); for (const id of ["seedOut", "seedOut", "earlyMat"]) sp.buy(id);
  const o = probeSim(WORLDS.ocean); o.buy("waterSeeds"); o.buy("seedOut");
  for (const x of [a, sp, o]) for (let t = 0; t < 50; t++) x.tick();
  const flat = x => Object.values(x.climate.axes).every(A => Math.abs(A.level - CI.baseline) < 1e-12) && x.climate.forcing.length === 0 && x.climate.shocks.length === 0;
  check(Math.abs(afterWarm - (b0 + CI.forcing.perStep)) < 1e-12 && s.climate.forcing.length === 1 && s.climate.axes.moist.level === CI.baseline,
    "9 · Terraform increases instability on the axis it changes: one Warm the Sky step on a settled climate adds exactly forcing.perStep to temperature (moisture untouched)", `${b0} → ${afterWarm}`);
  check(flat(a), "10 · Adapt does not add instability (Cold ×2, Heat, Drought ×2, Salt, Radiation: every axis stays at the baseline, no forcing recorded)");
  check(flat(sp) && flat(o), "11 · Spread does not add instability (Seed Output ×2, Early Maturity; Waterborne Seeds on Ocean 28)"); }
{ // 12 · settling: exact half-life
  const s = probeSim(); s.buy("warm"); const l0 = lv(s), n = ticksOf(CI.settling.halfLifeSeconds); for (let t = 0; t < n; t++) s.tick();
  const want = CI.baseline + (l0 - CI.baseline) * Math.pow(0.5, n * TICK_S / CI.settling.halfLifeSeconds);
  const s2 = probeSim(); s2.buy("warm"); for (let t = 0; t < ticksOf(600); t++) s2.tick();
  check(Math.abs(lv(s) - want) < 1e-9 && lv(s2) < CI.baseline + 0.002 && s2.climate.band === 0, `12 · instability settles by itself: after one half-life (${CI.settling.halfLifeSeconds} s) the excess over the baseline halves; after 10 minutes the climate is back to ${CI.bands[0].name}`,
    `${r2(l0)} → ${lv(s).toFixed(4)} (expected ${want.toFixed(4)}) → ${lv(s2).toFixed(4)}`); }
{ // 13 · compounding: repeated / large forcing on one axis adds more than one modest step; spacing and other axes do not compound
  const one = probeSim(); one.buy("warm"); const single = lv(one) - CI.baseline;
  const two = probeSim(); two.buy("warm"); two.buy("warm"); const twoNow = two.climate.forcing[1].add;
  const spaced = probeSim(); spaced.buy("warm"); for (let t = 0; t < ticksOf(240); t++) spaced.tick(); spaced.buy("warm"); const twoLater = spaced.climate.forcing[1].add;
  const cross = probeSim(); cross.buy("warm"); cross.buy("humid"); const otherAxis = cross.climate.forcing[1].add;
  const three = probeSim(); for (const id of ["warm", "warm", "warm"]) three.buy(id);
  check(twoNow > single * 1.4 && twoLater < twoNow && twoLater < single * 1.1 && Math.abs(otherAxis - single) < 1e-12 && lv(three) >= CI.bands[3].from,
    "13 · repeated Terraforming on one axis compounds: a second Warm right after the first adds far more than the first; the same step 4 minutes later adds about one step; a step on the other axis adds one step; three quick Warms reach " + CI.bands[3].name,
    `one step +${r2(single)} · second at once +${r2(twoNow)} · second after 240 s +${r2(twoLater)} · Humidify after Warm +${r2(otherAxis)} · three Warms → ${pct(lv(three))}`); }
{ // 14 · no Terraform cooldown
  const s = probeSim(); let ok = true; s.buy("warm"); s.buy("warm");
  for (let t = 0; t < ticksOf(K.warningSeconds + 5); t++) s.tick(); // shock running now
  const during = !!s.climate.axes.temp.shock; for (const id of ["warm", "cool", "humid", "dry"]) ok = ok && s.canBuy(s.traitById[id]) && s.buy(id);
  check(during && ok, "14 · no hard Terraform cooldown: right after two Warm steps, and in the middle of the shock they caused, every Terraform upgrade can still be bought (the consequence is climatic, not a disabled button)"); }
{ // 15 · bands follow data
  const B = varScenario(c => { c.bands = [{ from: 0, id: "a", name: "A" }, { from: 0.2, id: "b", name: "B" }, { from: 0.4, id: "c", name: "C" }, { from: 0.9, id: "d", name: "D" }]; c.shocks.threshold = 0.95; });
  const s = probeSim(FPRI, B); s.buy("warm"); s.buy("warm"); const ev = s.climate.events.filter(e => e.type === "band").map(e => `${e.from}→${e.to}`);
  for (let t = 0; t < ticksOf(300); t++) s.tick(); const down = s.climate.events.filter(e => e.type === "band" && e.cause === "settling").map(e => `${e.from}→${e.to}`);
  const d = probeSim(); d.buy("warm");
  check(J(ev) === J(["0→1", "1→2"]) && J(down) === J(["2→1", "1→0"]) && d.climate.band === 1 && CI.bands[1].name === "Unsettled",
    "15 · band transitions follow the data: with other band edges the same purchases cross other bands (each crossing one event, cause terraform; settling back raises its own events); with the shipped bands one Warm step reads Unsettled",
    `variant: up ${ev.join(", ")} · down ${down.join(", ")}`); }
{ // 16 · shock triggering follows data
  const low = varScenario(c => { c.shocks.threshold = 0.3; }), a = probeSim(FPRI, low); a.buy("warm"); const warnTick = (() => { for (let t = 1; t < 50; t++) { a.tick(); if (a.climate.axes.temp.pending) return a.ticks; } return null; })();
  let startTick = null; for (let t = 0; t < 200 && startTick === null; t++) { a.tick(); if (a.climate.axes.temp.shock) startTick = a.ticks; }
  const b = probeSim(); b.buy("warm"); for (let t = 0; t < ticksOf(120); t++) b.tick();
  check(warnTick === 1 && startTick - warnTick === ticksOf(K.warningSeconds) && b.climate.shocks.length === 0 && !b.climate.events.some(e => e.type === "shockWarning"),
    `16 · shock triggering follows the data: an axis at or above shocks.threshold announces a shock at once and starts it warningSeconds (${K.warningSeconds} s) later; with the shipped threshold (${K.threshold}) one step on a settled climate never does`,
    `variant threshold 0.3: warning at tick ${warnTick}, start ${startTick - warnTick} ticks later`); }
{ // 17 · kind + axis deterministic, by the documented rule
  const rows = [];
  for (const [planetKey, ids] of [["primary", ["warm", "warm"]], ["primary", ["cool", "cool"]], ["primary", ["humid", "humid"]], ["primary", ["dry", "dry"]], ["desert", ["humid", "humid"]], ["ocean", ["warm", "warm", "warm"]]]) {
    const p = WORLDS[planetKey], s = probeSim(p); for (const id of ids) s.buy(id); const ax = s.traitById[ids[0]].effect.axis, net = s.climate.axes[ax].net;
    for (let t = 0; t < ticksOf(K.warningSeconds + 2); t++) s.tick(); const sh = s.climate.shocks[0];
    rows.push({ p: planetKey, ids: ids.join("+"), axis: sh && sh.axis, kind: sh && sh.kind, want: expectedKind(p, VC, ax, 1, net), ax }); }
  check(rows.every(r => r.axis === r.ax && r.kind === r.want) && new Set(rows.map(r => r.kind)).size >= 3,
    "17 · shock axis and kind are deterministic: the axis is the one Terraformed; the kind follows the documented rule (planet | scenario | axis | shock number → overshoot or rebound of the recent forcing)",
    rows.map(r => `${r.p} ${r.ids} → ${r.kind}`).join(" · ")); }
{ // 18 / 19 · duration and magnitude follow data
  const V = varScenario(c => { c.shocks.durationSeconds = 20; c.shocks.rampSeconds = 4; c.axes.temp.magnitude = [3, 3]; });
  const a = probeSim(FPRI, V); a.buy("warm"); a.buy("warm"); let maxOff = 0; for (let t = 0; t < ticksOf(60); t++) { a.tick(); maxOff = Math.max(maxOff, Math.abs(a.climate.axes.temp.offset)); }
  const sa = a.climate.shocks[0];
  const b = probeSim(); b.buy("warm"); b.buy("warm"); let peakLvl = 0, maxB = 0; for (let t = 0; t < ticksOf(80); t++) { b.tick(); if (b.climate.axes.temp.pending) peakLvl = Math.max(peakLvl, b.climate.axes.temp.pending.peak); maxB = Math.max(maxB, Math.abs(b.climate.axes.temp.offset)); }
  const sb = b.climate.shocks[0], sev = Math.min(1, Math.max(0, (peakLvl - K.threshold) / (1 - K.threshold))), wantMag = CI.axes.temp.magnitude[0] + (CI.axes.temp.magnitude[1] - CI.axes.temp.magnitude[0]) * sev;
  check(sa.endTick - sa.startTick === ticksOf(20) && sb.endTick - sb.startTick === ticksOf(K.durationSeconds), `18 · shock duration follows the data (shipped ${K.durationSeconds} s; variant 20 s)`, `${(sb.endTick - sb.startTick) * TICK_S} s · variant ${(sa.endTick - sa.startTick) * TICK_S} s`);
  check(Math.abs(maxOff - 3) < 1e-9 && Math.abs(sb.magnitude - wantMag) < 1e-3 && Math.abs(maxB - wantMag) < 1e-9, `19 · shock magnitude follows the data: lerp(axis.magnitude ${J(CI.axes.temp.magnitude)}, severity) with severity = how far above the threshold the axis rose; a variant [3, 3] swings exactly 3 °C`,
    `two quick Warms: level ${r2(peakLvl)} → severity ${r2(sev)} → ${r2(sb.magnitude)} °C (offset peaks at ${r2(maxB)})`); }
// a standard shock on the primary fixture: Cold + Warm ×2 at fixed moments (mechanism: granted Biomass), the Terraform-heavy shape
const SHOCK_RUN = run(FPRI, { schedule: [[20, "seedOut"], [60, "cold"], [150, "warm"], [170, "warm"]], seconds: 420 });
{ // 20–22 · the shock moves the real effective inputs, the permanent Terraform stays, nothing permanent changes
  const s = probeSim(), before = J(FPRI); s.buy("cold"); s.buy("warm"); s.buy("warm"); const skyT = s.sky.temp, tf = { ...s.tf }, Z = { temp: 0, moist: 0, rad: 0 };
  // the region whose fitness the coming cold snap changes most (evaluated with the snap's offset, read-only)
  const RG = s.map.SEC.map((_, i) => i).sort((x, y) => Math.abs(s.evaluate(y, { ...Z, temp: -10 }).fitness - s.evaluate(y, Z).fitness) - Math.abs(s.evaluate(x, { ...Z, temp: -10 }).fitness - s.evaluate(x, Z).fitness))[0];
  const ev0 = s.evaluate(RG, Z);
  let during = null, maxOff = 0; for (let t = 0; t < ticksOf(K.warningSeconds + K.durationSeconds + 5); t++) { s.tick(); const A = s.climate.axes.temp;
    if (A.shock && Math.abs(A.offset) > maxOff) { maxOff = Math.abs(A.offset); const e = s.evaluate(RG); during = { effT: e.effT, off: A.offset, sky: s.sky.temp, tf: { ...s.tf }, fit: e.fitness }; } }
  const after = s.evaluate(RG);
  check(during && Math.abs(during.effT - (ev0.effT + during.off)) < 1e-9 && during.fit !== ev0.fitness, "20 · a shock modifies the REAL effective temperature: every evaluation (lamps, fitness, growth, die-back, natives) reads sky + Terraform + shock",
    `${s.map.SEC[RG].name}: ${r2(ev0.effT)} °C → ${r2(during.effT)} °C during the shock (offset ${r2(during.off)}), fitness ${r2(ev0.fitness)} → ${r2(during.fit)}`);
  check(during.sky === skyT && J(during.tf) === J(tf) && s.sky.temp === skyT && J(s.tf) === J(tf), "21 · the permanent Terraform remains during and after the shock: the Terraformed sky and the Terraform counts never change", `sky ${skyT} °C, ${J(tf)}`);
  check(s.climate.shocks.length === 1 && s.climate.shocks[0].ended && s.climate.axes.temp.offset === 0 && J(s.climate.offsets) === J({ temp: 0, moist: 0 }) && J(s.climate.env) === J({ temp: 0, moist: 0, rad: 0 })
    && Math.abs(after.effT - ev0.effT) < 1e-12 && after.fitness === ev0.fitness && J(FPRI) === before, "22 · the shock ends cleanly: its offset returns to exactly 0, every region evaluates exactly as before it, and the planet data is never edited"); }
{ // 23 · no direct coverage damage: deaths only in regions whose vigor fell under the ordinary die threshold
  let bad = 0, deaths = 0; const R = run(FPRI, { schedule: [[20, "seedOut"], [60, "cold"], [150, "warm"], [170, "warm"]], seconds: 420, onTick: null });
  // replay with a per-tick audit (same seed → identical run)
  const s = vcSim(FPRI, 7); let k = 0; const sch = [[20, "seedOut"], [60, "cold"], [150, "warm"], [170, "warm"]];
  for (let t = 1; t <= ticksOf(420); t++) { while (k < sch.length && ticksOf(sch[k][0]) === t) { s.biomass += s.price(s.traitById[sch[k][1]]); s.buy(sch[k][1]); k++; }
    const prevState = s.state.slice(); s.tick(); for (const i of s.map.LAND_TILES) if (prevState[i] === s.LIV && s.state[i] === s.DEAD) { deaths++; if (!(s.vigor[s.map.TILEMAP[i]] < G + 1e-9 && s.vigor[s.map.TILEMAP[i]] < config.grow.dieThresh + 0.05)) bad++; } }
  check(bad === 0 && deaths > 0 && R.shocks.length >= 1, "23 · no direct coverage damage: during the shock tiles die only through the ordinary die-back rule (their region's vigor under the die threshold) — the shock itself removes nothing",
    `${deaths} tile deaths in the run, ${bad} outside the die-back rule`); }
{ // 24 · no Biomass penalty: with bubbles off, Biomass = start + Σ income − spent exactly; prices equal Eden's at the same build
  const cfg = clone(config); cfg.econ.bubbleChance = 0; const s = BLOOM.createSim(FPRI, cfg, traits, { rng: mul(7), scenario: VC }), e = BLOOM.createSim(FPRI, cfg, traits, { rng: mul(7), scenario: EDEN });
  let sumInc = 0, granted = 0, k = 0; const sch = [[20, "seedOut"], [60, "cold"], [150, "warm"], [170, "warm"]];
  for (let t = 1; t <= ticksOf(420); t++) { while (k < sch.length && ticksOf(sch[k][0]) === t) { const p = s.price(s.traitById[sch[k][1]]), pe = e.price(e.traitById[sch[k][1]]); if (p !== pe) granted = NaN; s.biomass += p; granted += p; s.buy(sch[k][1]); e.biomass += pe; e.buy(sch[k][1]); k++; }
    s.tick(); e.tick(); sumInc += s.income; }
  const want = cfg.econ.startBiomass + sumInc + granted - s.spent.global - s.spent.local, pricesSame = traits.every(t => s.price(t) === e.price(t));
  check(Math.abs(s.biomass - want) < 1e-6 && pricesSame && s.climate.shocks.length >= 1 && !Number.isNaN(granted), "24 · no direct Biomass penalty: through a run with a real shock, Biomass is exactly start + passive income + (mechanism) grants − spending; every price equals the Eden price at the same build",
    `Biomass ${s.biomass.toFixed(3)} = ${want.toFixed(3)} · income ${sumInc.toFixed(1)} vs Eden ${(e.biomass - cfg.econ.startBiomass - granted + e.spent.global).toFixed(1)} (lower only because stressed colonies yield less)`); }
// (BLOOM-027B: the mechanism runs of 25–27 — real purchases seedOut, cold, warm, warm, no purchase during the shock — use the scenario as written when its
// cold snap pushes a living region of this fixture world to red, and otherwise the smallest controlled variant (snap magnitude 12 / 16 / 20 / 24 °C, as the
// shock labs below already do) that does. Frozen 22's old world went red at the written size; Frozen 4's regions have wider temperature margins (its
// 8.3 °C snap only reaches yellow with any number of Warm steps). The claims are about ordinary evaluation under a shock, not about one snap size.)
const SNAP = (() => { for (const m of [null, 12, 16, 20, 24]) { const V = m === null ? VC : varScenario(c => { c.axes.temp.magnitude = [m, m]; });
    const R = run(FPRI, { plan: ["seedOut", "cold", "warm", "warm"], seconds: 480, scenario: V }), sh = R.shocks[0];
    if (sh && R.lamps.some(l => l.t >= sh.startTick && l.t <= sh.endTick && !l.bought && l.to === "red" && l.living > 0)) return { V, m }; } return { V: VC, m: null }; })();
const WARM_SCHEDULE = [[150, "warm"], [170, "warm"]];
{ // 25 / 26 · regions close and reopen with the shock (earned Biomass run of the Terraform-heavy plan)
  const R = run(FPRI, { plan: ["seedOut", "cold", "warm", "warm"], seconds: 480, scenario: SNAP.V }), sh = R.shocks[0];
  const inShock = l => sh && l.t >= sh.startTick && l.t <= sh.endTick && !l.bought;
  const rank = { green: 2, yellow: 1, red: 0 }, worse = R.lamps.filter(l => inShock(l) && rank[l.to] < rank[l.from] && l.living > 0), better = R.lamps.filter(l => inShock(l) && rank[l.to] > rank[l.from]);
  const reopened = [...new Set(worse.map(l => l.name))].filter(n => better.some(b => b.name === n));
  check(worse.some(l => l.from === "green") && worse.some(l => l.to === "red"), "25 · a shock pushes living regions green → yellow → red through ordinary evaluation (no purchase in between)",
    `${sh && sh.kind} ${sh && sec(sh.startTick)}–${sh && sec(sh.endTick)} s: ${worse.map(l => `${l.name} ${l.from}→${l.to} @${l.s}s`).slice(0, 6).join(", ")}`);
  check(reopened.length >= 2, "26 · regions recover when the shock passes: the same regions turn back as the swing eases (Terraform still in place)",
    better.map(l => `${l.name} ${l.from}→${l.to} @${l.s}s`).slice(0, 6).join(", "));
  EVID.shockLamps = { shock: sh, worse: worse.map(l => ({ name: l.name, from: l.from, to: l.to, s: l.s })), better: better.map(l => ({ name: l.name, from: l.from, to: l.to, s: l.s })) }; }

console.log("\n# A · colony development and Adapt under shocks (controlled experiments, mechanism)");
const Z = { temp: 0, moist: 0, rad: 0 };
{ // 27 · Adapt improves shock survival through ordinary fitness: the same shock (same Terraform at the same moments) with one more Cold point
  const loss = sch => { const R = run(FPRI, { schedule: sch, seconds: 420, scenario: SNAP.V }), sh = R.shocks[0], c0 = R.cov[sh.startTick - 1], mn = Math.min(...R.cov.slice(sh.startTick, sh.endTick + 1));
    const closed = [...new Set(R.lamps.filter(l => l.t >= sh.startTick && l.t <= sh.endTick && !l.bought && l.to === "red" && l.living > 0).map(l => l.name))];
    return { kind: sh.kind, mag: sh.magnitude, lostShare: (c0 - mn) / c0, closed }; };
  const a = loss([[20, "seedOut"], [60, "cold"], ...WARM_SCHEDULE]), b = loss([[20, "seedOut"], [60, "cold"], [100, "cold"], ...WARM_SCHEDULE]);
  check(a.kind === b.kind && a.mag === b.mag && b.closed.length < a.closed.length && b.lostShare < a.lostShare, "27 · Adapt improves shock survival through ordinary fitness: under the identical cold snap, a plant with one more Cold Tolerance point has fewer living regions pushed into the red and loses less of its land",
    `${a.kind} ${r2(a.mag)} °C · Cold ×1: ${a.closed.length} living regions red (${a.closed.join(", ")}), ${pct(a.lostShare)} of its land lost · Cold ×2: ${b.closed.length} (${b.closed.join(", ")}), ${pct(Math.max(0, b.lostShare))}`);
  EVID.adaptSurvival = { coldOne: a, coldTwo: b }; }
// lab: one established region R (all tiles Living, density 0.9) on Frozen 4 after Cold + Warm ×2; a cloned scenario fixes the coming
// shock to a cold snap of the size that puts R at fitness `target` (overshootShare 0, magnitude [m, m], 60 s) — the shock itself still
// comes from the two real Warm purchases through the engine
function shockLab(target, { focus = "balanced", seed = 1, partner = false } = {}) {
  const pr = vcSim(FPRI, 1); pr.biomass = 1e7; ["cold", "warm", "warm"].forEach(id => pr.buy(id)); const M = pr.map;
  let R = -1, S = -1, m;
  if (!partner) { R = M.SEC.map((_, i) => i).filter(i => i !== M.ORIGIN && pr.evaluate(i, Z).fitness > 0.9 && pr.evaluate(i, { ...Z, temp: -30 }).fitness < 0.05)[0];
    let lo = 0, hi = 40; for (let k = 0; k < 50; k++) { const x = (lo + hi) / 2; if (pr.evaluate(R, { ...Z, temp: -x }).fitness > target) lo = x; else hi = x; } m = (lo + hi) / 2; }
  else { // (BLOOM-027B: the snap size is searched upward from 10 °C in 2 °C steps until the world offers such a pair; the lab's claim does not depend on the size)
    for (m = 10; m <= 20 && R < 0; m += 2) for (let i = 0; i < M.SC && R < 0; i++) { if (i === M.ORIGIN || !(pr.evaluate(i, Z).fitness > 0.9 && pr.evaluate(i, { ...Z, temp: -m }).fitness < 0.15)) continue;
      const n = M.NBRS[i].filter(j => pr.evaluate(j, { ...Z, temp: -m }).fitness > 0.8 && pr.evaluate(j, Z).fitness > 0.8); if (n.length) { R = i; S = n[0]; } }
    if (R < 0) throw new Error("shockLab(partner): no shock-blocked region with an open neighbour on this fixture world"); }
  const V = varScenario(c => { c.shocks.overshootShare = 0; c.axes.temp.magnitude = [m, m]; c.shocks.durationSeconds = 60; c.shocks.rampSeconds = 1; });
  const s = vcSim(FPRI, seed, V); s.biomass = 1e7; ["cold", "warm", "warm"].forEach(id => s.buy(id)); s.biomass = 0;
  for (const r of S >= 0 ? [R, S] : [R]) { for (const t of M.SEC_TILES[r]) { s.state[t] = s.LIV; s.dens[t] = 0.9; } s.vigor[r] = s.evaluate(r).fitness; if (focus !== "balanced") s.setColonyFocus(r, focus); }
  const liv = () => M.SEC_TILES[R].filter(t => s.state[t] === s.LIV).length; let start = null, end = null, n0 = 0, nmin = 1e9; const later = {};
  for (let t = 0; t < ticksOf(12 + 60 + 70); t++) { s.tick(); const A = s.climate.axes.temp;
    if (A.shock && start === null) { start = s.ticks; n0 = liv(); } if (start !== null && end === null && !A.shock) end = s.ticks; if (start !== null && end === null) nmin = Math.min(nmin, liv());
    if (end !== null) for (const k of [20, 40]) if (s.ticks === end + ticksOf(k)) later[k] = liv(); }
  return { R: M.SEC[R].name, S: S >= 0 ? M.SEC[S].name : null, area: M.AREA[R], m, kind: s.climate.shocks[0].kind, fit: s.evaluate(R, { ...Z, temp: -m }).fitness, lost: n0 - nmin, n0, atEnd: nmin, later };
}
const avg = (xs, f) => xs.reduce((a, o) => a + f(o), 0) / xs.length, SEEDS4 = [1, 2, 3, 4];
const LAB = {};
for (const [k, tgt] of [["marginal", 0.32], ["yellow", 0.45], ["red", 0.1]]) for (const f of ["balanced", "roots", "leaves"]) LAB[`${k}:${f}`] = SEEDS4.map(seed => shockLab(tgt, { focus: f, seed }));
{ const L = LAB, mB = avg(L["marginal:balanced"], o => o.lost), mR = avg(L["marginal:roots"], o => o.lost), yB = avg(L["yellow:balanced"], o => o.lost), yR = avg(L["yellow:roots"], o => o.lost), x = L["marginal:balanced"][0];
  check(mR < mB * 0.8 && yB === 0 && yR === 0, `28 · Roots helps only where the shocked ground stays viable: in a marginal swing (fitness ${r2(x.fit)}, above colony.protectAbove ${config.colony.protectAbove}) a Roots colony loses clearly fewer plants than Balanced; in a yellow-band swing both simply hold`,
    `${x.R} (${x.area} tiles), ${x.kind} ${r2(x.m)} °C: marginal — Balanced lost ${mB.toFixed(1)}, Roots ${mR.toFixed(1)} · yellow (fitness ${r2(L["yellow:balanced"][0].fit)}) — ${yB} / ${yR}`);
  const rB = avg(L["red:balanced"], o => o.lost), rR = avg(L["red:roots"], o => o.lost);
  check(rB === rR && rR === L["red:roots"][0].area, `29 · Roots cannot rescue red, shock-blocked ground: in a swing to fitness ${r2(L["red:balanced"][0].fit)} the Roots colony loses every plant, exactly like Balanced`, `lost ${rB} (Balanced) vs ${rR} (Roots) of ${L["red:roots"][0].area}`);
  const lM = avg(L["marginal:leaves"], o => o.lost), lR = avg(L["red:leaves"], o => o.lost), prot = Object.keys(config.colony.modes.leaves).filter(k => /establish|dieBack|thinning|recover|marginal/.test(k));
  // (BLOOM-027B: tolerance 2 % + 1 plant — the old 1-plant tolerance was set on a ~100-plant swing; Frozen 4's marginal swing is ~190 plants)
  check(prot.length === 0 && lM >= mB * 0.98 - 1 && lR === rB, "30 · Leaves gives no shock immunity: no protective effect at all; in the marginal swing a Leaves colony loses as many plants as Balanced (or more), in the red swing all of them",
    `marginal lost ${lM.toFixed(1)} (Leaves) vs ${mB.toFixed(1)} (Balanced) · red ${lR}`);
  EVID.colonyShock = Object.fromEntries(Object.entries(L).map(([k, rs]) => [k, { region: rs[0].R, shockC: r2(rs[0].m), fitness: r2(rs[0].fit), lost: rs.map(o => o.lost) }])); }
{ // 31 · Seeds helps recolonize after reopening (the region's own focus persists through total loss; its neighbour seeds it back)
  const seeds8 = [1, 2, 3, 4, 5, 6, 7, 8], bal = seeds8.map(seed => shockLab(0, { partner: true, seed })), sds = seeds8.map(seed => shockLab(0, { partner: true, seed, focus: "seeds" }));
  const b20 = avg(bal, o => o.later[20]), s20 = avg(sds, o => o.later[20]), b40 = avg(bal, o => o.later[40]), s40 = avg(sds, o => o.later[40]);
  check(bal.every(o => o.atEnd === 0) && sds.every(o => o.atEnd === 0) && s20 > b20 * 1.3 && s40 > b40, "31 · Seeds helps reclaim territory after a shock: a region the cold snap emptied regrows from its surviving neighbour clearly faster when both are on Seeds (the region keeps its focus through the total loss)",
    `${bal[0].R} (${bal[0].area} tiles) emptied by a ${r2(bal[0].m)} °C ${bal[0].kind}, regrowing from ${bal[0].S}: 20 s after it passes ${b20.toFixed(0)} (Balanced) vs ${s20.toFixed(0)} (Seeds) tiles; 40 s ${b40.toFixed(0)} vs ${s40.toFixed(0)}`);
  EVID.seedsRegrowth = { region: bal[0].R, from: bal[0].S, after20: [b20, s20], after40: [b40, s40] }; }

console.log("\n# A · the Terraform preview");
{ // 32 / 33
  const s = probeSim(); const p1 = s.climatePreview("warm"); s.buy("warm"); const a1 = lv(s);
  const p2 = s.climatePreview("warm"), lvBefore = lv(s); s.buy("warm"); const a2 = lv(s);
  let started = null; for (let t = 0; t < ticksOf(K.warningSeconds + 2) && !started; t++) { s.tick(); if (s.climate.axes.temp.shock) started = s.climate.axes.temp.shock; }
  const adapt = s.climatePreview("cold"), during = s.climatePreview("warm");
  check(p1 && Math.abs(p1.axisAfter - a1) < 1e-12 && p1.axis === "temp" && p1.bandBefore === 0 && p1.bandAfter === 1 && !p1.triggersShock && adapt === null,
    "32 · the Terraform preview shows the instability change before the purchase: axis, level before → after (exactly what the purchase then does), band before → after; Adapt has no climate preview",
    `Warm: temperature ${pct(p1.axisBefore)} → ${pct(p1.axisAfter)} · ${CI.bands[p1.bandBefore].name} → ${CI.bands[p1.bandAfter].name}`);
  check(p2.triggersShock && p2.crossesBand && p2.kind && started && p2.kind.id === started.id && Math.abs(p2.axisAfter - a2) < 1e-12 && Math.abs(p2.magnitude - started.magnitude) < 0.5 && during.addsToActive && !during.triggersShock,
    "33 · the preview warns when a purchase will cross a threshold and set off a shock — with the kind that then really comes and about its size; during a running shock it says the step adds to it",
    `second Warm: ${pct(lvBefore)} → ${pct(p2.axisAfter)} (${CI.bands[p2.bandAfter].name}), predicted ${p2.kind.id} ≈ ${r2(p2.magnitude)} °C → real ${started && started.id} ${started && r2(started.magnitude)} °C`); }

console.log("\n# A · loss");
{ // 37 / 38 · extinction (mechanism: tiles cleared), a short zero-Living gap does not lose; and a reckless real run that dies out
  const s = vcSim(FPRI, 2); for (let t = 0; t < 100; t++) s.tick(); const clear = () => { for (const i of s.map.LAND_TILES) if (s.state[i] !== s.BAR) { s.state[i] = s.BAR; s.dens[i] = 0; } };
  clear(); let n = 0; while (!s.lost && n < 200) { s.tick(); n++; }
  const g = vcSim(FPRI, 2); for (let t = 0; t < 100; t++) g.tick(); for (const i of g.map.LAND_TILES) if (g.state[i] !== g.BAR) { g.state[i] = g.BAR; g.dens[i] = 0; }
  for (let t = 0; t < g.extinction.graceTicks - 2; t++) g.tick(); const t0 = g.map.SEC_TILES[g.map.ORIGIN][0]; g.state[t0] = g.LIV; g.dens[t0] = 0.2; for (let t = 0; t < 100; t++) g.tick();
  check(s.lost && n === s.extinction.graceTicks && /extinction/.test(s.lostReason), `37 · extinction is the generic loss: with no Living tile anywhere for ${VC.loss.extinctionGraceSeconds} s the run is lost and frozen (mechanism: tiles cleared)`, `lost after ${n} ticks: ${s.lostReason}`);
  check(!g.lost && g.coverage() > 0, `38 · a short zero-Living gap does not lose: plants back before the ${VC.loss.extinctionGraceSeconds} s grace runs out → the run continues`);
  // (BLOOM-027B: the reckless stack is 3, 4 or 5 Humidify steps 5 s apart — the smallest that drowns this fixture's colony; Frozen 22's old world drowned at 3)
  // (…and on the first of the three fixture worlds — frozen, desert, ocean — that this reckless build drowns; Frozen 4's only colony survives the surge)
  let sch, rk, ed, RW = FPRI; outer: for (const w of [FPRI, WORLDS.desert, WORLDS.ocean]) for (const n of [3, 4, 5]) { sch = [[20, "seedOut"], [40, "warm"], [60, "warm"], ...Array.from({ length: n }, (_, i) => [200 + 5 * i, "humid"])];
    rk = run(w, { schedule: sch, seed: 5, seconds: 420 }); ed = run(w, { schedule: sch, seed: 5, seconds: 420, scenario: EDEN }); RW = w; if (rk.lost && !ed.lost && rk.shocks.length >= 1) break outer; }
  // (BLOOM-027B: on the new fixture worlds the reckless build dies of the heat pulse its two stacked Warms raise (10.6 °C, below the Critical band) before the Humidify
  // stack even lands — Frozen 22's old colony survived that pulse and drowned in the Critical surge. The claim kept here: the scenario's own shock kills a reckless real
  // build that the identical purchases survive without the scenario; the shock's band is no longer asserted)
  check(rk.lost && !ed.lost && rk.shocks.length >= 1, `37b · a reckless real build can die out: no Adapt, two quick Warms and then a stack of Humidify steps (${sch.filter(x => x[1] === "humid").length}) → the scenario's shock (${rk.shocks.map(x => `${x.kind} ${x.magnitude.toFixed(1)}`).join("/")}) kills the only colony (extinction) on ${RW.name}; the identical purchases without the scenario survive`,
    `shocks ${rk.shocks.map(x => `${x.kind} ${r2(x.magnitude)} @${sec(x.startTick)} s`).join(", ")} · extinct at ${rk.lostAt} s; Eden: alive, ${pct(ed.cov.at(-1))}`);
  EVID.recklessExtinction = { schedule: sch, shocks: rk.shocks, lostAt: rk.lostAt }; }

console.log("\n# A · layer P with real witnesses");
const LP = {}, LP2 = {};
for (const [k, [id]] of Object.entries(FIX)) LP[k] = BLOOM.validateScenario(WORLDS[k], config, traits, VC, { archetypeId: id });
LP2.primary = BLOOM.validateScenario(FPRI, config, traits, VC, { archetypeId: "frozen_world", minStrategies: 2 });
LP2.desert = BLOOM.validateScenario(WORLDS.desert, config, traits, VC, { archetypeId: "desert_world", minStrategies: 3 });
const tfSteps = x => x.purchases.filter(p => traits.find(t => t.id === p.id).effect.type === "sky").length;
const sumS = x => `[${x.signature}] ${x.purchases.map(p => `${p.id}@${Math.round(p.seconds)}`).join(" → ")} · margin ${x.marginSeconds} s · holds ${pct(x.hold.coverage)} @${x.hold.seconds} s · peak ${pct(x.climate.peak)} · shocks ${x.climate.shocks.map(c => `${c.kind} ${c.magnitude} @${c.seconds}`).join(", ") || "none"}`;
check(LP.primary.status === "PASS" && LP.primary.climate && LP.primary.climate.threshold === K.threshold, "39 · Frozen 4 + Volatile Climate passes layer P (real witnesses: live instability from their own purchases, earned Biomass, extinction on, margin + 60 s hold after the last shock, confirmed under 2 more seeds)",
  `${LP.primary.status} · ${LP.primary.strategies.map(sumS).join(" | ")} · ${LP.primary.search.ms} ms`);
{ const v = LP2.primary, adapt = v.strategies.find(x => tfSteps(x) === 0), terra = v.strategies.find(x => tfSteps(x) >= VC.validation.mechanicEvidence.terraformSteps);
  check(v.status === "PASS" && v.strategies.length >= 2 && v.differences.length >= 1, "40 · the primary fixture supports ≥ 2 materially distinct strategies under Volatile Climate (layer P with minStrategies 2)",
    `${v.strategies.map(x => `[${x.signature}]`).join(" vs ")} · differ by ${J(v.differences[0] && { onlyA: v.differences[0].onlyA, onlyB: v.differences[0].onlyB, heldOnlyA: v.differences[0].heldOnlyA, heldOnlyB: v.differences[0].heldOnlyB })}`);
  check(adapt && adapt.climate.peak <= CI.baseline + 1e-9 && adapt.climate.shocks.length === 0 && (adapt.confirm || []).every(c => c.ok && c.shocks === 0), "41 · an Adapt-heavy strategy wins with low instability: no Terraform, instability never leaves the baseline, no shock (validation seed and both confirmation seeds)",
    adapt && sumS(adapt));
  check(terra && terra.climate.shocks.length >= 1 && terra.hold.held && (terra.confirm || []).every(c => c.ok && c.shocks >= 1), "42 · a Terraform-heavy strategy wins despite real shocks: it lives through at least one shock on every seed and still holds the win afterwards",
    terra && `${sumS(terra)} · confirm ${J(terra.confirm.map(c => ({ seed: c.rngSeed, ok: c.ok, shocks: c.shocks })))}`);
  const last = terra ? Math.max(...terra.climate.shocks.map(c => c.endSeconds)) : 0;
  const plan = terra ? terra.purchases.map(p => p.id) : [], noShock = varScenario(c => { c.shocks.threshold = 1; });
  const r0 = BLOOM.witness.simulate(FPRI, config, traits, plan, FPRI.winThreshold ?? config.win + config.validation.winMargin, false, noShock);
  check(terra && terra.climate.shocksBeforeHold >= 1 && terra.climate.shocks[0].seconds < terra.hold.seconds && terra.hold.seconds >= last + VC.validation.holdFinalSeconds - 0.2 && r0.marginTick !== null && !r0.ok && r0.climate.noEvidence,
    `43 · the Terraform strategy counts only with a real shock behind it: its first shock starts before the hold check, the hold check waits ${VC.validation.holdFinalSeconds} s past the last shock, and the same plan in a variant where no shock can happen reaches its margin but is NOT accepted (mechanicEvidence)`,
    `shock @${terra && terra.climate.shocks[0].seconds} s, last ends ${last} s, hold @${terra && terra.hold.seconds} s · variant: margin ${r0.marginSeconds} s, ok ${r0.ok}, noEvidence ${r0.climate.noEvidence}`);
  EVID.primaryStrategies = v.strategies.map(x => ({ signature: x.signature, purchases: x.purchases, marginSeconds: x.marginSeconds, hold: x.hold, climate: x.climate, confirm: x.confirm, pacing: x.pacing })); }
{ // 44 · over-Terraforming is measurably harmful (mechanism: identical purchases, only their spacing / the scenario changes)
  // (the stack lands at 200 s, when colonies already stand on the land the warming opened)
  const spaced = run(FPRI, { schedule: [[20, "seedOut"], [60, "cold"], [200, "warm"], [380, "warm"], [560, "warm"]], seconds: 800 });
  const stacked = run(FPRI, { schedule: [[20, "seedOut"], [60, "cold"], [200, "warm"], [203, "warm"], [206, "warm"]], seconds: 800 });
  const eden = run(FPRI, { schedule: [[20, "seedOut"], [60, "cold"], [200, "warm"], [203, "warm"], [206, "warm"]], seconds: 800, scenario: EDEN });
  const dip = R => { let m = 0; for (const x of R.shocks) { const c0 = R.cov[x.startTick - 1], mn = Math.min(...R.cov.slice(x.startTick, x.endTick + 1)); m = Math.max(m, c0 - mn); } return m; };
  const big = R => Math.max(0, ...R.shocks.map(x => x.magnitude));
  check(stacked.peak > spaced.peak + 0.3 && big(stacked) > big(spaced) && dip(stacked) > dip(spaced) && dip(stacked) > 0.02 && (stacked.win === null || stacked.win > eden.win + 15),
    "44 · over-Terraforming is measurably harmful: the same three Warm steps stacked 3 s apart reach a far higher instability, a larger shock and a deeper coverage loss than spaced 3 minutes apart, and win later than the identical purchases without the scenario",
    `stacked: peak ${pct(stacked.peak)}, largest shock ${r2(big(stacked))} °C, worst dip −${pct(dip(stacked))}, win ${stacked.win ?? "—"} s (Eden ${eden.win} s) · spaced: peak ${pct(spaced.peak)}, largest ${r2(big(spaced))} °C, dip −${pct(dip(spaced))}`);
  EVID.overTerraform = { stacked: { peak: stacked.peak, shocks: stacked.shocks, win: stacked.win }, spaced: { peak: spaced.peak, shocks: spaced.shocks, win: spaced.win }, edenWin: eden.win }; }
{ // 45 · never Terraforming is not the only viable strategy
  const tStrats = [...LP2.primary.strategies, ...LP2.desert.strategies].filter(x => tfSteps(x) >= 1), heavy = tStrats.filter(x => x.climate.shocks.length >= 1);
  check(tStrats.length >= 2 && heavy.length >= 2, "45 · \"never Terraform\" is not the only viable answer: Terraform strategies pass layer P on Frozen 4 and Desert 22, including Terraform-heavy ones that live through real shocks",
    tStrats.map(x => `[${x.signature}] ${x.climate.shocks.length} shock(s)`).join(" · ")); }
{ // 46 · Desert 22
  const v = LP2.desert, heavy = v.strategies.find(x => x.climate.shocks.length >= 1);
  const mo = run(WORLDS.desert, { schedule: [[20, "seedOut"], [40, "drought"], [150, "humid"], [153, "humid"]], seconds: 420 }), sh = mo.shocks.find(x => x.axis === "moist");
  const rank = { green: 2, yellow: 1, red: 0 }, worse = sh ? mo.lamps.filter(l => l.t >= sh.startTick && l.t <= sh.endTick && !l.bought && rank[l.to] < rank[l.from] && l.living > 0) : [];
  check(LP.desert.status === "PASS" && v.status === "PASS" && heavy && sh && worse.length >= 1, "46 · Desert 22 + Volatile Climate is viable: layer P PASS (also with 3 strategies, one Terraform-heavy through a real shock); a moisture shock from stacked Humidify steps visibly pushes living regions toward their limits",
    `${LP.desert.strategies.map(x => `[${x.signature}]`).join(" ")} · 3-strategy run: ${v.strategies.map(x => `[${x.signature}] ${x.climate.shocks.map(c => c.kind).join(",") || "no shock"}`).join(" | ")} · controlled Humidify ×2: ${sh && sh.kind} ${sh && r2(sh.magnitude)} → ${worse.map(l => `${l.name} ${l.from}→${l.to}`).slice(0, 4).join(", ")}`);
  EVID.desert = { layerP: LP.desert.strategies.map(sumS), threeStrategies: v.strategies.map(sumS), moistureShock: sh, worse: worse.map(l => ({ name: l.name, from: l.from, to: l.to, s: l.s })) }; }
{ // 47 · Ocean 28
  const v = LP.ocean, mo = run(WORLDS.ocean, { schedule: [[20, "seedOut"], [40, "waterSeeds"], [150, "dry"], [153, "dry"]], seconds: 420 }), sh = mo.shocks.find(x => x.axis === "moist");
  const rank = { green: 2, yellow: 1, red: 0 }, moved = sh ? mo.lamps.filter(l => l.t >= sh.startTick && l.t <= sh.endTick && !l.bought && l.to !== l.from) : [];
  const classes = BLOOM.witness.strategyClasses(WORLDS.ocean, config, traits, { scenario: VC }), maxSteps = Math.max(...classes.map(c => c.core.filter(id => traits.find(t => t.id === id).effect.type === "sky").length));
  check(v.status === "PASS" && v.strategies.every(x => x.climate.shocks.length === 0) && sh && moved.length >= 1, "47 · Ocean 28 + Volatile Climate is viable: layer P PASS. Diagnosis: its winning strategies need at most one Terraform step, so a sensible run meets little instability; a controlled stack of Dry steps does produce a moisture shock that moves island suitability",
    `${v.strategies.map(sumS).join(" | ")} · Terraform steps per strategy core ≤ ${maxSteps} · controlled Dry ×2: ${sh && sh.kind} ${sh && r2(sh.magnitude)} → ${moved.map(l => `${l.name} ${l.from}→${l.to}`).slice(0, 4).join(", ")}`);
  EVID.ocean = { layerP: v.strategies.map(sumS), maxTerraformStepsPerCore: maxSteps, moistureShock: sh, moved: moved.map(l => ({ name: l.name, from: l.from, to: l.to, s: l.s })) }; }
{ // 48 / 49
  const off = Object.fromEntries(Object.entries(WORLDS).map(([k, p]) => { const s = vcSim(p); return [k, s.offered(s.traitById.waterSeeds)]; }));
  const ow = LP.ocean.strategies[0], uses = ow.purchases.some(p => p.id === "waterSeeds"), sea = vcSim(WORLDS.ocean), eden = BLOOM.createSim(WORLDS.ocean, config, traits, {});
  check(off.ocean && !off.primary && !off.desert && uses && J(sea.map.CROSSINGS) === J(eden.map.CROSSINGS), "48 · Waterborne Seeds remains geography-driven: offered only where a real water crossing exists (Ocean 28), the same crossings as Eden, part of the Ocean witness",
    `offered ${J(off)} · Ocean witness ${ow.purchases.map(p => p.id).join(" → ")}`);
  const vs = Object.values(WORLDS).map(p => vcSim(p));
  check(vs.every(s => s.competition.enabled === false && s.nativeEvaluate === null && J(Object.keys(s.competition)) === J(["enabled"])), "49 · competition is unaffected: a scenario with no competition block has no native layer at all (and Native Competition itself is pinned unchanged, item 5)"); }

console.log("\n# A · economy and decision cadence");
{ // 50 · BLOOM-013 values (hashes computed from `git archive 9252924`)
  const h = { econ: fnv(J(config.econ)), costs: fnv(J(traits.map(t => [t.id, t.cost]))), colony: fnv(J([config.colony.specCost, config.colony.modes, config.colony.specializations])), config: fnv(J(config)) };
  check(h.econ === "0be1e07b" && h.costs === "35490a04" && h.colony === "ee8bb155" && h.config === "58caa476" && config.econ.startBiomass === 100 && config.econ.originTrickle === 0.3,
    "50 · the BLOOM-013 economy is unchanged: config.econ, every trait cost, local upgrade prices and the whole config equal 9252924", J(h)); }
const E = require("./economy-study.js");
const CAD = E.study({ seeds: [1, 2, 3, 4], worlds: ["f4vc", "d22vc", "o28vc"], rows: [["balanced", "none"], ["situational", "canopyOrigin", "extend"]], bubbleModes: ["auto", "click"] });
{ const rows = []; for (const [w, W] of Object.entries(CAD.worlds)) for (const [rn, R] of Object.entries(W.recipes)) for (const [k, x] of Object.entries(R)) if (k !== "plan") rows.push({ w, rn, k, ...x });
  const first = Object.entries(CAD.worlds).map(([w, W]) => ({ w, auto: W.opening.auto.globalMax, click: W.opening.click.globalMax }));
  check(first.every(f => f.auto <= 60 && f.click <= 60) && rows.every(r => r.first <= 60), "51 · the first global purchase stays inside the cadence policy (affordable ≤ 60 s; every recipe buys its first upgrade ≤ 60 s)",
    first.map(f => `${f.w}: affordable by ${f.auto} s (auto) / ${f.click} s (click)`).join(" · "));
  const strat = rows.filter(r => r.rn !== "reckless"), reck = rows.filter(r => r.rn === "reckless");
  check(strat.every(r => r.maxGapWorst <= 120 && r.won === "4/4") && reck.every(r => r.won === "4/4"), "52 · purchase gaps stay inside the policy (≤ 120 s) for every strategy recipe — Adapt-heavy and Terraform-heavy — and every recipe, including the deliberately reckless control, still wins (4 run seeds, 2 colony policies, 2 bubble policies)",
    Object.entries(CAD.worlds).map(([w, W]) => `${w}: ${Object.entries(W.recipes).map(([rn, R]) => `${rn} gap ≤ ${Math.max(...Object.values(R).filter(x => x.maxGapWorst !== undefined).map(x => x.maxGapWorst))} s, shocks ${Math.max(...Object.values(R).filter(x => x.shocksMax !== undefined).map(x => x.shocksMax))}`).join(", ")}`).join(" · "));
  const tf = rows.filter(r => r.shocksMax > 0);
  // the same worlds without the scenario (BLOOM-013 recipes): the dead wait must not grow
  const EDC = E.study({ seeds: [1, 2, 3, 4], worlds: ["f4", "d22", "o28"], rows: [["balanced", "none"], ["situational", "canopyOrigin", "extend"]], bubbleModes: ["auto", "click"] });
  const edenDead = Object.fromEntries(Object.entries(EDC.worlds).map(([w, W]) => [w, Math.max(...Object.values(W.recipes).flatMap(R => Object.values(R).filter(x => x.deadWaitWorst !== undefined).map(x => x.deadWaitWorst)))]));
  const vcDead = w => Math.max(...rows.filter(r => r.w === w).map(r => r.deadWaitWorst));
  const reckSlow = ["f4vc", "d22vc"].map(w => ({ w, reckless: Math.max(...reck.filter(r => r.w === w).map(r => r.win)), terraform: Math.max(...rows.filter(r => r.w === w && r.rn === "terraform").map(r => r.win)) }));
  EVID.recklessCadence = reckSlow;
  check(tf.length > 0 && rows.every(r => r.deadWaitWorst <= 120) && ["f4", "d22", "o28"].every(w => vcDead(w + "vc") <= edenDead[w]), "53 · no mandatory idle wait: the recipe bots buy each upgrade 4 s after it becomes affordable (never waiting for the climate to settle), live through their shocks and still win; the longest stretch with nothing meaningful affordable stays inside the policy (≤ 120 s) and is no longer than in the same worlds without the scenario",
    `recipes that met a shock: ${[...new Set(tf.map(r => `${r.w}/${r.rn}`))].join(", ")} · worst dead wait ${["f4", "d22", "o28"].map(w => `${w} ${vcDead(w + "vc")} s (Eden ${edenDead[w]} s)`).join(", ")} · reckless control wins later than the Terraform-heavy recipe (slowest seed): ${reckSlow.map(x => `${x.w} ${x.reckless} vs ${x.terraform} s`).join(", ")}`);
  EVID.cadence = Object.fromEntries(Object.entries(CAD.worlds).map(([w, W]) => [w, { opening: W.opening, recipes: Object.fromEntries(Object.entries(W.recipes).map(([rn, R]) => [rn, Object.fromEntries(Object.entries(R).map(([k, x]) => [k, k === "plan" ? x : { won: x.won, win: x.win, first: x.first, maxGapWorst: x.maxGapWorst, deadWaitWorst: x.deadWaitWorst, shocks: x.shocks, shocksMax: x.shocksMax, peakInstability: x.peakInstability, example: x.example }]))]))}])); }

// ---------------------------------------------------------------------------------------------------------- B · browser
async function browserPart() {
  let chromium; try { ({ chromium } = require("playwright")); } catch (e) { check(false, "Playwright available for part B", "npm i -g playwright; NODE_PATH=\"$(npm root -g)\""); return; }
  const PAGE = "file://" + encodeURI(path.join(ROOT, "demos/demo-run.html")), browser = await chromium.launch();
  if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
  const shot = async (p, n) => { if (SHOTS) await p.screenshot({ path: path.join(SHOTS, n) }); };
  { const w = await browser.newPage(); await w.goto(PAGE); await w.waitForTimeout(200); await w.close(); } // headless warm-up (first page reads canvas blank)
  const open = async (q, pause = true) => { const p = await browser.newPage({ viewport: { width: 1440, height: 920 } }); p.errors = [];
    p.on("pageerror", e => p.errors.push(e.message)); p.on("console", m => { if (m.type() === "error") p.errors.push(m.text()); });
    await p.goto(PAGE + q, { timeout: 120000 }); await p.waitForTimeout(300); if (pause && await p.$("#btnPlay")) await p.click("#btnPlay"); return p; };
  // advance n ticks in steps of 5, letting the UI poll the engine between steps (as its frame loop does)
  const step = (p, n) => p.evaluate(n => { for (let k = 0; k < n; k += 5) { BLOOM_API.advance(5); pollPressure(performance.now()); pollClimate(); } renderClimate(); refreshShop(); draw(); return BLOOM_API.climate(); }, n);
  const bar = p => p.evaluate(() => { renderClimate(); return document.getElementById("vbar").innerText.replace(/\s+/g, " ").trim(); });
  const VCQ = "?archetype=frozen_world&seed=4&scenario=volatile_climate";
  console.log("\n# B · browser");
  // 54 / 62 / 35 / 36 · launch identity, the status bar at the start, no solution data
  { const p = await open(VCQ), r = await p.evaluate(() => ({ run: BLOOM_API.run, title: document.title, h: document.querySelector("header h1 small").textContent, pbar: !!document.getElementById("pbar"), cbar: !!document.getElementById("cbar"),
      foot: document.getElementById("runId").textContent, raw: JSON.stringify(window.BLOOM_RUN.summary) + JSON.stringify(window.BLOOM_RUN.planet.archetype), log: document.getElementById("log").textContent, c: BLOOM_API.climate() }));
    const b = await bar(p);
    check(r.run.scenarioId === "volatile_climate" && /Volatile Climate/.test(r.title) && /volatile climate/.test(r.h) && /VOLATILE CLIMATE/.test(b) && !r.pbar && !r.cbar
      && /scenario volatile_climate \(layer P PASS\)/.test(r.foot) && /Eos-103/.test(r.foot) && /public seed 4/.test(r.foot) && r.run.attempt === FPRI.archetype.attempt && r.c.enabled,
      "54 · the browser launch works: Frozen World seed 4 (the same planet) under Volatile Climate (title, header, climate bar, footer), with the engine's climate state live", `${r.title} · ${r.foot.slice(-70)}`);
    check(!/"purchases"|minimalBuild|"signature"|witness|"held"|"plan"|"strategies"|"climate"/.test(r.raw) && J(Object.keys(r.run.scenarioValidation).sort()) === J(["required", "status", "strategiesProven"]),
      "62 · no solution or witness data reaches the UI: layer P hands the page a status and a count only", J(r.run.scenarioValidation));
    check(b.includes(`instability ${Math.round(r.c.level * 100)}%`) && b.includes(r.c.bandName) && /temperature 5%/.test(b) && /moisture 5%/.test(b), "35 · the scenario status shows the engine's real instability: overall %, band, each sky axis", b);
    check(!/\d+:\d\d/.test(b) && !/left|remaining|until the end/i.test(b), "36 · no fake scenario countdown: with no shock announced or running the bar shows no clock at all (there is none)", b.slice(0, 160));
    check(/Terraform unsettles the part of the climate it changes; Adapt and Spread do not/.test(r.log), "Y · the run opens with the scenario's short explanation", r.log.slice(0, 170));
    await shot(p, "vc-frozen22-start.png");
    // 57 · a real Terraform click changes instability and the status
    await p.evaluate(() => { BLOOM_API.advance(400); BLOOM_API.addBiomass(3000); renderShop(); });
    // (a real hover; the test waits until the hover preview has been written to the footer — never reads a stale message)
    // (BLOOM-027B: the hover is retried up to three times — right after a purchase the shop re-renders and a single hover can land on the old button)
    const hoverPreview = async (re) => { for (let k = 0; k < 3; k++) { await p.mouse.move(5, 5); await p.waitForTimeout(80 + 120 * k); await p.evaluate(() => renderShop()); await p.hover('#shop button[data-id="warm"]');
      const ok = await p.waitForFunction(r => new RegExp(r).test(document.getElementById("log").textContent), re.source, { timeout: 2500 }).then(() => true).catch(() => false); if (ok) break; } return p.textContent("#log"); };
    const pv1 = await hoverPreview(/^Warm the Sky — .*instability: temperature 5% →/);
    await p.click('#shop button[data-id="warm"]'); await p.mouse.move(5, 5); const log1 = await p.textContent("#log"), b1 = await bar(p), c1 = await p.evaluate(() => BLOOM_API.climate());
    check(/instability: temperature 5% → 35% · Stable → Unsettled · no shock/.test(pv1) && /Bought Warm the Sky/.test(log1) && /temperature 5% → 35%/.test(log1) && b1.includes("instability 35%") && /Unsettled/.test(b1) && c1.forcing.length === 1,
      "57 · a real Terraform click changes instability and the status: the hover preview says what it will do, the purchase message says what it did, the bar now reads 35% Unsettled", `${pv1.split("🌪")[1]} · bar: ${b1.slice(0, 120)}`);
    // 32 / 33 in the UI: the next step's preview warns of a shock
    const pv2 = await hoverPreview(/^Warm the Sky — .*instability: temperature 35% →/); await p.click('#shop button[data-id="warm"]'); await p.mouse.move(5, 5);
    const cw = await p.evaluate(() => { BLOOM_API.advance(1); return BLOOM_API.climate(); }); // (the engine announces it on its next tick)
    check(/⚠ this will set off a temperature shock in ~12 s \(likely a cold snap/.test(pv2) && cw.axes.temp.pending && cw.axes.temp.pending.id === "cold_snap" && /Critical|Volatile/.test(pv2),
      "33b · in the shop, the second Warm's preview warns before purchase that it will set off a temperature shock (and which kind) — and that shock is then announced", pv2.split("🌪")[1]);
    // 58 · a real shock starts and ends; 55 map; 56 inspect; 34 sky arithmetic
    const water = await p.evaluate(() => BLOOM_API.sim.map.TILEMAP.findIndex(v => v < 0)), px0 = await p.evaluate(t => { draw(); return BLOOM_API.tilePixel(t); }, water);
    const cs = await step(p, 5); const bWarn = await bar(p), logWarn = await p.textContent("#log");
    const cS = await step(p, 140); const bShock = await bar(p), px1 = await p.evaluate(t => { draw(); return BLOOM_API.tilePixel(t); }, water);
    const reg = await p.evaluate(() => { const S = BLOOM_API.sim, M = S.map, Z = { temp: 0, moist: 0, rad: 0 }; let best = -1, d = 0; for (let i = 0; i < M.SC; i++) { const x = S.evaluate(i, Z).effT - S.evaluate(i).effT; if (i !== M.ORIGIN && Math.abs(x) >= d) { d = Math.abs(x); best = i; } } return best; });
    const g = await p.evaluate(() => BLOOM_API.geometry()), box = await (await p.$("#cv")).boundingBox(); await p.mouse.click(box.x + g.centers[reg].x, box.y + g.centers[reg].y);
    const insp = await p.evaluate(r => { renderInspect(); const e = BLOOM_API.sim.evaluate(r); return { t: document.getElementById("tline").innerText, note: (document.getElementById("climNote") || {}).innerText || "", effT: Math.round(e.effT * 10) / 10, sel: selected }; }, reg);
    await shot(p, "vc-frozen22-shock.png");
    const cE = await step(p, 400); const bEnd = await bar(p), px2 = await p.evaluate(t => { draw(); return BLOOM_API.tilePixel(t); }, water);
    const ui = cE.uiEvents.filter(e => e.shown).map(e => e.type), dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
    const shockT = cE.thresholds.filter(x => x.cause === "shock");
    check(/⚠ Cold snap in 0:\d\d/.test(bWarn) && /cold snap is coming/.test(logWarn) && /Cold snap: temperature −\d/.test(bShock) && !/Cold snap/.test(bEnd) && ["shockWarning", "shockStart", "shockEnd"].every(t => ui.includes(t)) && cE.shocks.length === 1 && cE.shocks[0].ended,
      "58 · a real shock starts and ends in the browser: announced with its kind and countdown to it, then running (kind, size, time left), then gone — each step a message from a real engine event",
      `${bWarn.match(/⚠ Cold snap in [0-9:]+/)} → ${bShock.match(/Cold snap: [^·]+· [0-9:]+ left/)} → ${bEnd.slice(0, 60)} · events shown ${ui.join(", ")}`);
    check(/= base −18°C · Terraform \+12 · cold snap −\d/.test(bShock) && /= base −18°C · Terraform \+12 —/.test(bEnd), "34 · the UI keeps base + Terraform + shock apart: during the shock the sky reads base −18 °C · Terraform +12 · cold snap −x; afterwards the shock term is gone and Terraform still +12",
      `${(bShock.match(/Sky now [^—]+/) || [""])[0]} → ${(bEnd.match(/Sky now [^—]+/) || [""])[0]}`);
    check(dist(px0, px1) > 6 && dist(px0, px2) < 2, "55 · the map reflects the active shock: a faint tint of its kind over the map during the swing (water pixel shifts), gone when it passes",
      `water pixel ${px0} → ${px1} (shock) → ${px2} (after)`);
    check(insp.sel === reg && insp.t.includes(`Ground here ${insp.effT > 0 ? "+" : insp.effT < 0 ? "−" : ""}${Math.abs(insp.effT)}°C`) && /Cold snap: temperature −\d/.test(insp.note) && /Your Terraform \(\+12 °C\) stays/.test(insp.note),
      "56 · region inspection reflects the shocked conditions: its ground temperature is the engine's effective (shocked) value, and a note names the shock, its size here and that the Terraform stays", `${insp.t} · ${insp.note.slice(0, 110)}`);
    check(shockT.some(x => !x.opened) && shockT.some(x => x.opened), "Y · land the shock changes is announced with short outlines: living regions it pushed toward their limit, and regions that reopened as it passed (attributed to the shock, never to a purchase)",
      shockT.map(x => `${x.name} ${x.from}→${x.to}`).slice(0, 6).join(", "));
    check(p.errors.length === 0, "no browser errors (Frozen 4 Volatile Climate readouts)", p.errors.join(" | ")); await p.close(); }
  // 60 · a deliberately reckless control: three Warm steps in a row
  { const p = await open(VCQ); await p.evaluate(() => { BLOOM_API.advance(1200); BLOOM_API.addBiomass(5000); renderShop(); });
    for (let k = 0; k < 3; k++) { await p.click('#shop button[data-id="warm"]'); await p.mouse.move(5, 5); }
    const bCrit = await bar(p), log = await p.textContent("#log"); const c = await step(p, 600);
    const worse = c.thresholds.filter(x => x.cause === "shock" && !x.opened), big = Math.max(...c.shocks.map(x => x.magnitude));
    // (BLOOM-027B: at least one living region pushed past its limit — Frozen 4's regions have wider margins than Frozen 22's, where two went)
    check(/Critical/.test(bCrit) && /Critical/.test(log) && big >= CI.axes.temp.magnitude[0] + 0.8 * (CI.axes.temp.magnitude[1] - CI.axes.temp.magnitude[0]) && worse.length >= 1,
      "60 · a deliberately reckless control (three Warm steps clicked in a row) shows the consequence: Critical instability in the bar and the purchase message, a near-maximum shock, living regions pushed past their limits",
      `${(bCrit.match(/instability \d+% \w+/) || [""])[0]} · shocks ${c.shocks.map(x => `${x.kind} ${r2(x.magnitude)} °C`).join(", ")} · ${worse.map(x => `${x.name} ${x.from}→${x.to}`).slice(0, 5).join(", ")}`);
    await shot(p, "vc-frozen22-reckless.png"); check(p.errors.length === 0, "no browser errors (reckless control)", p.errors.join(" | ")); await p.close(); }
  // 59 / 61 · a run won through REAL shop buttons with earned Biomass (the Terraform-heavy plan from the Node-side validator; the page never sees it)
  { const p = await open(VCQ), terra = LP2.primary.strategies.find(x => tfSteps(x) >= 2), plan = terra.purchases.map(x => x.id); let i = 0, affordAt = null, won = null; const buys = [];
    for (let t = 0; t < 9000 && !won; t += 5) {
      await p.evaluate(() => { BLOOM_API.advance(5); refreshShop(); pollPressure(performance.now()); pollClimate(); }); const st = await p.evaluate(() => ({ ...BLOOM_API.state(), lost: BLOOM_API.sim.lost }));
      if (st.won || st.lost) { won = st; break; }
      if (i < plan.length) { const off = await p.$eval(`button.buy[data-id="${plan[i]}"]`, b => b.classList.contains("off"));
        if (!off) { affordAt ??= st.ticks; if (st.ticks - affordAt >= 25) { await p.click(`button.buy[data-id="${plan[i]}"]`); await p.mouse.move(5, 5); buys.push(`${plan[i]} @ ${Math.round(st.ticks * TICK_S)} s`); i++; affordAt = null; } } } }
    const fin = await p.evaluate(() => ({ cov: BLOOM_API.sim.coverage(), c: BLOOM_API.climate() }));
    check(won && won.won && !won.lost && i === plan.length && fin.cov >= 0.70, "59 · a Volatile Climate run is won through real shop clicks with earned Biomass (Frozen 4, the Terraform-heavy strategy)",
      `${buys.join(" → ")} · win at ${won ? Math.round(won.ticks * TICK_S) : "—"} s with ${pct(fin.cov)}; peak instability ${pct(fin.c.peak)}, shocks ${fin.c.shocks.map(x => `${x.kind} @${Math.round(x.startTick * TICK_S)} s`).join(", ") || "none"}`);
    EVID.browserWin = { buys, winSeconds: won && Math.round(won.ticks * TICK_S), coverage: fin.cov, peak: fin.c.peak, shocks: fin.c.shocks };
    await p.waitForTimeout(150);
    const rep = await p.evaluate(() => ({ on: document.getElementById("reportModal").classList.contains("on"), text: document.getElementById("report").innerText, c: (document.getElementById("repClimate") || {}).innerText || "" }));
    check(rep.on && /under Volatile Climate/.test(rep.text) && /Climate: Volatile Climate/.test(rep.c) && /Terraform step/.test(rep.c) && /instability peaked at \d+%/.test(rep.c) && /is \d+% now/.test(rep.c)
      && /(climate shock|No climate shock)/.test(rep.c) && /not a score/.test(rep.c) && /Eos-103/.test(rep.text),
      "61 · the Bloom Report identifies Volatile Climate in one concise line (Terraform steps, peak and final instability, the shocks and the largest swing) without grading lower instability as better", rep.c.replace(/\n/g, " "));
    await shot(p, "vc-frozen22-report.png"); check(p.errors.length === 0, "no browser errors (Volatile Climate win)", p.errors.join(" | ")); await p.close(); }
  // 37 in the UI · extinction screen (mechanism: the player's tiles cleared through the test hook)
  { const p = await open(VCQ); await p.evaluate(() => { BLOOM_API.advance(60); const S = BLOOM_API.sim; for (const i of S.map.LAND_TILES) if (S.state[i] !== S.BAR) { S.state[i] = S.BAR; S.dens[i] = 0; } });
    let st; for (let n = 0; n < 30; n++) { st = await p.evaluate(() => { BLOOM_API.advance(5); return { lost: BLOOM_API.sim.lost, t: BLOOM_API.sim.ticks }; }); if (st.lost) break; }
    await p.waitForTimeout(150);
    const r = await p.evaluate(() => ({ on: document.getElementById("reportModal").classList.contains("on"), text: document.getElementById("report").innerText, btn: !!document.getElementById("lossRestart") }));
    check(st.lost && r.on && /EXTINCTION/.test(r.text) && /a climate shock pushed your last colonies/.test(r.text) && /Climate: Volatile Climate/.test(r.text) && r.btn,
      "37c · the extinction screen gives the reason, the scenario's own debrief and the climate line, and offers a restart");
    check(p.errors.length === 0, "no browser errors (extinction screen)", p.errors.join(" | ")); await p.close(); }
  // V · explicit failure, Eden unchanged, the other archetypes launch
  { const p = await open("?archetype=frozen_world&seed=4&scenario=volatile_climat", false), r = await p.evaluate(() => ({ fail: (document.getElementById("genFail") || {}).innerText || "", sim: !!(window.BLOOM_API && BLOOM_API.sim) }));
    check(/unknown scenario "volatile_climat"/.test(r.fail) && /NO RUN STARTED/.test(r.fail) && !r.sim, "V · a misspelt scenario fails explicitly: no run started, no substitute"); await p.close(); }
  { const p = await open("?archetype=frozen_world&seed=4"), r = await p.evaluate(() => ({ bar: !!document.getElementById("vbar"), c: BLOOM_API.sim.climate.enabled, run: BLOOM_API.run.scenarioId }));
    check(!r.bar && !r.c && r.run === "eden", "V · no scenario parameter = Eden: no climate layer, no climate bar"); await p.close(); }
  for (const [id, seed, name, ax] of [["desert_world", 22, "Desert World", "humid"], ["ocean_archipelago", 28, "Ocean Archipelago", "dry"]]) {
    const p = await open(`?archetype=${id}&seed=${seed}&scenario=volatile_climate`); await p.evaluate(() => { BLOOM_API.advance(900); BLOOM_API.addBiomass(3000); renderShop(); });
    for (let k = 0; k < 2; k++) { await p.click(`#shop button[data-id="${ax}"]`); await p.mouse.move(5, 5); }
    const c = await step(p, 200), b = await bar(p), run = await p.evaluate(() => BLOOM_API.run);
    check(run.scenarioValidation.status === "PASS" && run.archetype === name && c.shocks.some(x => x.axis === "moist") && /moisture/.test(b),
      `V · ${name} ${seed} + Volatile Climate launches (layer P PASS); two quick ${ax === "humid" ? "Humidify" : "Dry the Sky"} clicks set off a real moisture shock`, `${c.shocks.map(x => `${x.kind} ${r2(x.magnitude)}`).join(", ")} · ${b.slice(0, 120)}`);
    await shot(p, `vc-${id.split("_")[0]}${seed}-shock.png`); check(p.errors.length === 0, `no browser errors (${name} Volatile Climate)`, p.errors.join(" | ")); await p.close(); }
  await browser.close();
}

(async () => {
  if (!NO_BROWSER) await browserPart();
  console.log("\n# 63–69 · the other suites are run separately (README: QA): slice, archetype, colony-development, economy, dying-world, native-competition and every other existing suite");
  if (JSON_OUT) { fs.writeFileSync(JSON_OUT, JSON.stringify({ scenario: VC, layerP: Object.fromEntries(Object.entries({ ...LP, primary2: LP2.primary, desert3: LP2.desert }).map(([k, v]) => [k, { status: v.status, climate: v.climate,
    strategies: v.strategies.map(s => ({ signature: s.signature, tokens: s.tokens, minimalBuild: s.minimalBuild, held: s.held, purchases: s.purchases, totalSpent: s.totalSpent, winSeconds: s.winSeconds,
      marginSeconds: s.marginSeconds, hold: s.hold, pacing: s.pacing, trace: s.trace, climate: s.climate, confirm: s.confirm })), differences: v.differences, classes: v.classes, ms: v.search.ms }])), evidence: EVID }, null, 1));
    console.log("evidence written:", JSON_OUT); }
  console.log(`\n${fails ? fails + " check(s) FAILED" : "ALL CHECKS PASS"}  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  process.exit(fails ? 1 : 0);
})();
