// BLOOM — pressure-scenario QA (BLOOM-012): the scenario catalogue, the generic pressure model, extinction loss, the
// scenario validation layer ("layer P") and Dying World on all three production archetypes. Two parts:
//   A · Node: plain-data catalogue, default-scenario = the pre-BLOOM-012 engine bit-for-bit (First Bloom golden, Ocean / Desert / Frozen
//       fixture worlds and runs pinned to 1b7ea2a), the pressure clock (grace, monotonic rise, final state), each channel
//       following the data, pressure acting ONLY through the ordinary environmental evaluation (a default-scenario sim of the same
//       shifted conditions evaluates and earns identically), green → yellow → red caused by the decline, Adapt and
//       Terraform answers, Roots never rescuing red ground, extinction grace, layer P on Ocean 28 / Desert 17 / Frozen 11 (extinction on Frozen 9)
//       with real pressured witnesses (≥ 2 broad strategies on the primary fixture), water / Waterborne Seeds untouched
//   B · real browser: demo-run.html?archetype=…&seed=…&scenario=dying_world — identity, explicit failure for unknown ids,
//       the pressure bar updating with the real simulation, effective readouts, Terraform vs drift, milestones at the
//       configured thresholds, a win through REAL shop buttons, a doomed control losing by extinction, the Bloom Report,
//       no witness / solution data in the page
//
//   NODE_PATH="$(npm root -g)" node tools/dying-world-check.js [--shots <dir>] [--json <evidence.json>] [--no-browser]
//
// Production modules only. Witnesses buy through sim.buy() with Biomass earned under the real, pressured economy. Tests
// marked "mechanism" set Biomass or tile state directly to isolate ONE rule (never to prove winnability). Exits 1 on failure.
"use strict";
const path = require("path"), fs = require("fs");
const ROOT = path.resolve(__dirname, "..");
// (BLOOM-033) the run page's code = the developer harness demos/demo-run.html + the GameSession it wraps (resources/run/game-session.js, the
// same file index.html uses); source checks of "the run page" read both
const RUN_PAGE_SRC = () => ["demos/demo-run.html", "resources/run/game-session.js"].filter(f => fs.existsSync(path.join(ROOT, f))).map(f => fs.readFileSync(path.join(ROOT, f), "utf8")).join("\n");
for (const f of ["content/config.js", "content/traits.js", "content/archetypes.js", "content/scenarios.js", "planets/first_bloom.js", "resources/bloom-sim.js",
  "resources/bloom-gen.js", "resources/bloom-validate.js", "resources/bloom-witness.js", "resources/bloom-archetype.js", "resources/bloom-scenario.js"]) require(path.join(ROOT, f));
const { BLOOM, BLOOM_DATA } = globalThis, { config, traits, archetypes, scenarios } = BLOOM_DATA;
const GOLD = require("./golden/scenarios.js");
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const SHOTS = arg("--shots"), JSON_OUT = arg("--json"), NO_BROWSER = process.argv.includes("--no-browser");
const J = o => JSON.stringify(o), clone = o => JSON.parse(J(o)), pct = x => (x * 100).toFixed(1) + "%", r1 = v => Math.round(v * 10) / 10;
const fnv = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return (h >>> 0).toString(16).padStart(8, "0"); };
const mul = GOLD.mulberry32, TICK_S = config.tickMs / 1000, G = config.grow.growThresh;
const DEFAULT_SCN = scenarios.find(s => s.id === "default"), DW = scenarios.find(s => s.id === "dying_world"), P = DW.pressure;
const at = s => Math.round(s / TICK_S); // seconds → tick
// GRACE_TICK = the first tick whose clock has reached graceSeconds (the decline's start); a grace that is not a whole number of
// ticks (e.g. 45 s = 281.25 ticks, tried during BLOOM-013) starts on the next whole tick. FIRST_DRIFT = the first tick with progress > 0.
const FULL_TICK = Math.ceil((P.graceSeconds + P.durationSeconds) / TICK_S - 1e-9), GRACE_TICK = Math.ceil(P.graceSeconds / TICK_S - 1e-9);
const FIRST_DRIFT = Math.floor(P.graceSeconds / TICK_S + 1e-9) + 1, DECLINE = f => Math.round((P.graceSeconds + f * P.durationSeconds) / TICK_S); // fraction of the decline → tick
let fails = 0; const t0 = Date.now(), EVID = {};
const check = (ok, name, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); if (!ok) fails++; };
const gen = (id, seed) => BLOOM.generateFromArchetype(archetypes.find(a => a.id === id), seed, { config, traits });
// BLOOM-027B (cylindrical generator): the fixture worlds were re-picked BY ROLE from scans of every accepted world (docs/evidence/bloom-027b/
// fixture-changes.md §5): primary Ocean 28 (attempt 8, Borea-495; Ocean 13's new world has no radiation- or water-blocked regions for 17/18 and only
// one pressure strategy), Desert 17 (attempt 0, Ymir-961; Desert 17's new world keeps winning under full pressure), Frozen 11 (attempt 1, Pallas-609).
// `extinct` = Frozen 9 (attempt 4, Mistral-735): the world whose no-purchase Dying World run dies out — AFTER the final state (~390–400 s), as Ocean 13's did, and early enough for the browser suites — for the extinction mechanism (23 / 25) —
// under BOTH generators that is a rare property (1 of 36 old Ocean worlds, 0 of 40 new ones; 10 of 40 Frozen worlds either way).
const FIX = { primary: ["ocean_archipelago", 28], desert: ["desert_world", 17], frozen: ["frozen_world", 11], extinct: ["frozen_world", 9] };
const WORLDS = Object.fromEntries(Object.entries(FIX).map(([k, [id, s]]) => [k, gen(id, s)]));
const OAP = WORLDS.primary;
const lampOf = f => f > config.categories.lamp.green ? "green" : f > config.categories.lamp.yellow ? "yellow" : "red";
const G0 = { cold: 0, heat: 0, salt: 0, rad: 0, seedOut: 0, earlyMat: 0, waterSeeds: 0, waterArm: null, waterPts: 0 };
// a probe in one build at one pressure progress (static environment, no ticking)
function probeAt(planet, items = [], progress = 0, scenario = DW) {
  const s = BLOOM.createSim(planet, config, traits, { rng: () => 0.5, scenario }); s.biomass = Infinity; for (const id of items) s.buy(id); s.biomass = 0;
  const off = scenario && scenario.pressure ? BLOOM.pressure.offsetsAt(scenario.pressure, progress, planet.globalClimate) : undefined;
  return { s, off, ev: i => s.evaluate(i, off) };
}
const runFp = (sim, plan, ticks, every = 500) => { let k = 0; const tr = [];
  for (let t = 1; t <= ticks; t++) { sim.tick(); if (k < plan.length && sim.biomass >= sim.price(sim.traitById[plan[k]]) && sim.buy(plan[k])) k++;
    if (t % every === 0) tr.push(fnv(Array.from(sim.state).join("") + "|" + sim.biomass + "|" + Array.from(sim.dens).join(","))); }
  return tr.join(","); };

console.log("# A · catalogue + default-scenario compatibility");
// 1 · plain data
check(J(clone(scenarios)) === J(scenarios) && !/function|=>/.test(J(scenarios)) && new Set(scenarios.map(s => s.id)).size === scenarios.length
  && scenarios.every(s => BLOOM.pressure.checkScenario(s).length === 0),
  "1 · the scenario catalogue (content/scenarios.js) is plain JSON-shaped data; every entry passes the engine's scenario check", scenarios.map(s => s.id).join(", "));
check(DEFAULT_SCN.pressure === null && DEFAULT_SCN.loss.extinction === false && P.graceSeconds >= 0 && P.durationSeconds > 0 && DW.loss.extinction === true
  && DW.loss.extinctionGraceSeconds > 0 && DW.validation && DW.display && DW.display.title && Object.keys(DW.display.channels).length === 3,
  "1b · Dying World owns its numbers as data: grace, duration, channel maxima, extinction grace, validation policy, display labels",
  `grace ${P.graceSeconds} s · duration ${P.durationSeconds} s · channels ${J(P.channels)} · extinction after ${DW.loss.extinctionGraceSeconds} s · phases ${P.phases.map(p => `${p.name}@${p.from}`).join(", ")}`);
{ const code = ["resources/bloom-sim.js", "resources/bloom-witness.js", "resources/bloom-scenario.js", "resources/bloom-archetype.js", "resources/bloom-validate.js"]
    .map(f => fs.readFileSync(path.join(ROOT, f), "utf8")).join("\n"), ui = RUN_PAGE_SRC();
  check(!/dying/i.test(code) && !/["'`]dying_world["'`]/.test(ui) && !/moistureShare|extinctionGraceSeconds\s*[:=]\s*\d/.test(ui.replace(/SCN\.loss\.extinctionGraceSeconds/g, "")),
    "1c · no scenario-specific code: the engine, witness, validators and UI never name Dying World; the UI reads the scenario's own data"); }
// 2 / 3 · First Bloom golden, with an explicit default-scenario scenario and without any scenario
{ const want = JSON.parse(fs.readFileSync(path.join(__dirname, "golden/first_bloom.json"), "utf8")), ids = Object.keys(want.static.prices.start), planet = BLOOM_DATA.planets.first_bloom;
  const adapter = scenario => { let sim; return {
    reset(seed) { sim = BLOOM.createSim(planet, config, traits, { rng: mul(seed), ...(scenario ? { scenario } : {}) }); }, tick() { sim.tick(); }, buy(id) { return sim.buy(id); },
    addBiomass(x) { sim.biomass += x; }, read() { return { biomass: sim.biomass, ticks: sim.ticks, won: sim.won, tiles: sim.state, vigor: sim.vigor, dens: sim.dens, bubbles: sim.bubbles.length }; },
    setColonyFocus(id, mode) { return sim.setColonyFocus(sim.map.SIDX[id], mode); }, buySpecialization(id, spec) { return sim.buySpecialization(sim.map.SIDX[id], spec); },
    colonies() { return { focus: [...sim.colonies.focus], spec: [...sim.colonies.spec] }; },
    setCondition(c) { Object.assign(sim.genome, c.genome); Object.assign(sim.sky, c.sky); for (const k in sim.tf) sim.tf[k] = 0; Object.assign(sim.tf, c.tf || {}); },
    evaluate(i) { return sim.evaluate(i); }, previewOf(id) { return sim.previewOf(id); }, price(id) { return sim.price(sim.traitById[id]); },
    traitIds: traits.map(t => t.id).filter(id => ids.includes(id)), get sectionCount() { return sim.map.SC; },
    get map() { return { tilemap: sim.map.TILEMAP, area: sim.map.AREA, cent: sim.map.CENT }; } }; };
  const same = got => GOLD.PARTS.every(p => J(clone(got[p])) === J(want[p]));
  check(same(GOLD.runGolden(adapter(DEFAULT_SCN))), "2 · default-scenario as an explicit scenario reproduces the accepted First Bloom golden bit-for-bit (layout, evaluations, previews, prices, all 6 runs)");
  check(same(GOLD.runGolden(adapter(null))), "3 · First Bloom with no scenario is unchanged (same golden)"); }
// 4 / 29 · procedural default-scenario fixtures: the generated GEOMETRY (the planet minus its validator record) pinned to the pre-BLOOM-012
// engine (1b7ea2a), and a 3000-tick seeded run pinned to the 4d1e52c engine running the BLOOM-013 data. BLOOM-013 is a data-only
// retune (resources/ untouched since 4d1e52c): it changes the economy, so the runs and the `planet.archetype` record (witness
// times) move, while every fixture keeps its attempt and its exact geometry.
const BASE_FP = { // geometry + run: the BLOOM-027B cylindrical generator (docs/evidence/bloom-027b/repin.json; were `git archive 1b7ea2a` geometry and
  // the 4d1e52c-engine run on BLOOM-013 data until 027B changed every generated world on purpose). Fixtures (BLOOM-027B): Ocean 28 attempt 8 Borea-495,
  // Ocean 8 attempt 1 Coriol-220, Desert 17 attempt 0 Ymir-961, Desert 4 attempt 1 Coriol-536, Frozen 11 attempt 1 Pallas-609, Frozen 4 attempt 1 Eos-103,
  // plus Ocean 30 (Native Competition's ocean fixture) and Frozen 9 (the extinction fixture)
  "ocean_archipelago:28": { geometry: "cd7c2737", run: "7a39ec52,dc9a3f52,cbe30754,79a65626,d9159b6b,f4ab6a97" },
  "ocean_archipelago:8": { geometry: "698a0131", run: "ef5575ee,30e8e0e2,50d33ed2,81fc1155,f5230e5a,b5e7ace8" },
  "desert_world:17": { geometry: "e5cf32ef", run: "8aeda063,f99cae45,4fb52470,1e751fb5,d9691906,a99afb94" },
  "desert_world:4": { geometry: "5b176d43", run: "e19d1d3b,8d46ec6c,4bfbda1c,e70945b1,ba6936ef,d19a4562" },
  "frozen_world:11": { geometry: "e6107a80", run: "7a37679f,36899074,6ff6e65f,fd3d2368,0fde15ea,50a5bad2" },
  "frozen_world:4": { geometry: "ab40551e", run: "fc1a79f7,3c2e806e,388e8b75,1c0dadc4,b2e9447f,e2b90283" },
  "ocean_archipelago:30": { geometry: "68c6803b", run: "4f5d4a29,ef774658,ae0fbccc,6d7c152c,a9ab53f1,b65e2cd7" },
  "frozen_world:9": { geometry: "25597cac", run: "855146e4,9d66a50c,3954f349,a65cfc79,d0724ea6,bad40af0" },
  "desert_world:22": { geometry: "144c9496", run: "670d879a,39deaa17,2817add1,21c8aa61,b2387fbd,492cf740" } };
{ const rows = [];
  for (const key of Object.keys(BASE_FP)) { const [id, seed] = key.split(":"), p = gen(id, +seed), { archetype: _, ...geometry } = p, plan = p.archetype.strategies.list[0].purchases.map(x => x[0]);
    const a = runFp(BLOOM.createSim(p, config, traits, { rng: mul(12345) }), plan, 3000), b = runFp(BLOOM.createSim(p, config, traits, { rng: mul(12345), scenario: DEFAULT_SCN }), plan, 3000);
    rows.push({ key, planet: fnv(J(geometry)) === BASE_FP[key].geometry, run: a === BASE_FP[key].run, dflt: b === BASE_FP[key].run }); }
  check(rows.every(r => r.planet && r.run && r.dflt), "4 · Ocean 28/8, Desert 17/4, Frozen 11/4 (+ Ocean 30, Frozen 9) default-scenario worlds are pinned: the BLOOM-027B generated geometry, and the same 3000-tick run with no scenario and with default-scenario (were 1b7ea2a geometry / 4d1e52c runs until the cylindrical generator)",
    rows.map(r => `${r.key} ${r.planet && r.run && r.dflt ? "✓" : `geometry ${r.planet} run ${r.run} dflt ${r.dflt}`}`).join(" · ")); }
{ const sigs = OAP.archetype.strategies.list.map(x => x.signature);
  check(OAP.archetype.attempt === 8 && sigs.length === 2 && sigs.some(s => /Temperature:cold=Adapt/.test(s) && /salt/.test(s) && /rad/.test(s)) && sigs.some(s => /Water:wet=Terraform/.test(s) && /Temperature:heat/.test(s)),
    "29 · no-pressure Ocean 28 keeps its accepted default-scenario baseline (attempt 8, layers 1–8, Rad+Salt+Cold+Heat Adapt vs Rad+Salt+Heat + Dry the Sky)", sigs.join(" | ")); }

console.log("\n# A · the pressure clock and channels");
{ // 5 · determinism
  const plan = ["seedOut", "rad", "drought", "waterSeeds"], a = runFp(BLOOM.createSim(OAP, config, traits, { rng: mul(77), scenario: DW }), plan, 4000),
    b = runFp(BLOOM.createSim(OAP, config, traits, { rng: mul(77), scenario: DW }), plan, 4000);
  const v1 = J(BLOOM.validateScenario(OAP, config, traits, DW, { archetypeId: "ocean_archipelago" }).strategies), v2 = J(BLOOM.validateScenario(OAP, config, traits, DW, { archetypeId: "ocean_archipelago" }).strategies);
  check(a === b && v1 === v2, "5 · same planet + scenario + RNG reproduces bit-for-bit (4000-tick run fingerprints; layer P verdict)", a.split(",").slice(-2).join(",")); }
{ // 6 · unknown / malformed ids fail explicitly
  const throws = f => { try { f(); return null; } catch (e) { return e.message; } };
  const u = throws(() => BLOOM.pressure.resolveScenario(scenarios, "volcano_world")), c = throws(() => BLOOM.pressure.resolveScenario(scenarios, "Dying_World"));
  const bad = throws(() => BLOOM.createSim(OAP, config, traits, { scenario: { id: "broken", name: "Broken", pressure: { graceSeconds: 1, durationSeconds: 0, channels: { wind: 3 }, phases: [] }, loss: { extinction: true } } }));
  check(/unknown scenario "volcano_world"/.test(u || "") && /unknown scenario/.test(c || "") && /scenario broken/.test(bad || "") && BLOOM.pressure.resolveScenario(scenarios, null).id === "default",
    "6 · an unknown scenario id fails explicitly (never a substitute); a malformed definition is refused; no id = default-scenario", `${u} · ${bad && bad.slice(0, 90)}…`); }
const clock = (() => { // one no-purchase pressured run, recording the pressure state every tick
  const sim = BLOOM.createSim(OAP, config, traits, { rng: mul(5), scenario: DW }), rows = [];
  const fresh = { progress: sim.pressure.progress, offsets: { ...sim.pressure.offsets }, phase: sim.pressure.phase };
  for (let t = 1; t <= FULL_TICK + 800 && !sim.lost; t++) { sim.tick(); rows.push({ t, s: sim.pressure.seconds, p: sim.pressure.progress, o: { ...sim.pressure.offsets }, k: sim.pressure.phase }); }
  return { sim, rows, fresh }; })();
{ const { rows, fresh } = clock, max = BLOOM.pressure.maxOffsets(P, OAP.globalClimate);
  check(fresh.progress === 0 && fresh.offsets.temp === 0 && fresh.offsets.moist === 0 && fresh.offsets.rad === 0 && fresh.phase === -1 && rows[0].p === 0,
    "7 · Dying World pressure starts at zero (no drift, grace phase) on a fresh run and on its first tick");
  const inGrace = rows.filter(r => r.s < P.graceSeconds), first = rows.find(r => r.p > 0);
  check(inGrace.length === GRACE_TICK - 1 && inGrace.every(r => r.p === 0 && r.k === -1) && first.t === FIRST_DRIFT && rows[GRACE_TICK - 1].k === 0,
    "8 · the grace period behaves as configured: zero drift for the first graceSeconds, then the decline starts",
    `${P.graceSeconds} s = ${GRACE_TICK - 1} ticks stable; first drift at tick ${first.t} (${first.s.toFixed(2)} s)`);
  let mono = true; for (let i = 1; i < rows.length; i++) { const a = rows[i - 1], b = rows[i];
    if (b.p < a.p || Math.abs(b.o.temp) < Math.abs(a.o.temp) || Math.abs(b.o.moist) < Math.abs(a.o.moist) || b.o.rad < a.o.rad || b.k < a.k) mono = false; }
  check(mono, "9 · pressure increases monotonically (progress, every channel's drift and the phase never step back)");
  const full = rows.find(r => r.p === 1), after = rows.filter(r => r.t >= FULL_TICK);
  check(full && full.t === FULL_TICK && after.every(r => r.p === 1 && r.o.temp === max.temp && r.o.moist === max.moist && r.o.rad === max.rad && r.k === P.phases.length - 1),
    "10 · pressure reaches its configured maximum at grace + duration and then stays there (final harsh state, no further drift)",
    `full at tick ${full && full.t} (${(full && full.s).toFixed(1)} s); held for ${after.length} more ticks; max ${J(max)}`);
  // (sample points are fractions of the decline, so they follow the scenario's timing data; the no-purchase run outlives FULL_TICK)
  const sample = [DECLINE(0.25), DECLINE(0.5), DECLINE(0.75), FULL_TICK].map(t => rows[t - 1]);
  const okCh = (k, want) => sample.every(r => Math.abs(r.o[k] - want * r.p) < 1e-9);
  check(okCh("moist", P.channels.moistureShare * OAP.globalClimate.moisture) && max.moist < 0, "11 · moisture declines as the data says: moistureShare × the planet's starting sky moisture × progress",
    `${P.channels.moistureShare} × ${OAP.globalClimate.moisture} → ${sample.map(r => `${r.s.toFixed(0)} s ${r1(r.o.moist)}`).join(", ")}`);
  check(okCh("temp", P.channels.temperature) && max.temp < 0, "12 · temperature declines as the data says: temperature × progress", sample.map(r => `${r.s.toFixed(0)} s ${r1(r.o.temp)} °C`).join(", "));
  check(okCh("rad", P.channels.radiation) && max.rad > 0, "13 · radiation increases as the data says: radiation × progress", sample.map(r => `${r.s.toFixed(0)} s +${r1(r.o.rad)}`).join(", "));
  EVID.progression = [0, GRACE_TICK, DECLINE(0.17), DECLINE(0.34), DECLINE(0.5), DECLINE(0.67), DECLINE(0.84), FULL_TICK].map(t => { const r = t ? rows[t - 1] : { s: 0, p: 0, o: clock.fresh.offsets, k: -1 };
    return { seconds: +r.s.toFixed(1), progress: +r.p.toFixed(3), phase: r.k < 0 ? P.graceLabel : P.phases[r.k].name, moisture: r1(r.o.moist), temperature: r1(r.o.temp), radiation: r1(r.o.rad) }; });
  console.log("      progression: " + EVID.progression.map(x => `${x.seconds}s p${x.progress} ${x.phase} [m${x.moisture} t${x.temperature} r+${x.radiation}]`).join(" | ")); }
{ // 14 · nothing is mutated
  const before = fnv(J(OAP)), sb = fnv(J(DW)), sim = BLOOM.createSim(OAP, config, traits, { rng: mul(9), scenario: DW }); sim.biomass = 1e6;
  for (let t = 0; t < FULL_TICK + 200; t++) { sim.tick(); if (t === 900) ["rad", "humid", "warm", "drought"].forEach(id => sim.buy(id)); }
  check(fnv(J(OAP)) === before && fnv(J(DW)) === sb && sim.sky.temp === OAP.globalClimate.temperature + 6 && sim.sky.moist === OAP.globalClimate.moisture + 8,
    "14 · the planet data and the scenario data are never mutated by a full pressured run (the sky the player Terraformed is the sim's own state)"); }

console.log("\n# A · pressure acts through the ordinary environment");
// a default-scenario planet whose climate IS the pressured one: sky + drift (moisture clamped like the engine), radiation + drift
const shifted = (planet, off) => { const q = clone(planet); q.globalClimate.temperature += off.temp; q.globalClimate.moisture = Math.min(100, Math.max(0, q.globalClimate.moisture + off.moist));
  for (const s of q.sections) if (s.local) s.local.radiation = Math.max(0, s.local.radiation + off.rad); return q; };
{ // 15 · fitness and readouts use the effective conditions
  let n = 0, bad = []; for (const [k, w] of Object.entries(WORLDS)) for (const items of [[], ["rad", "drought"], ["cold", "humid"]]) {
    const A = probeAt(w, items, 1), off = A.off, B = BLOOM.createSim(shifted(w, off), config, traits, { rng: () => 0.5 }); B.biomass = Infinity; items.forEach(id => B.buy(id));
    A.s.map.SEC.forEach((s, i) => { if (i === A.s.map.ORIGIN) return; n++; const a = A.ev(i), b = B.evaluate(i);
      if (Math.abs(a.fitness - b.fitness) > 1e-9 || a.limitKey !== b.limitKey || Math.abs(a.effT - b.effT) > 1e-9 || Math.abs(a.effM - b.effM) > 1e-9 || Math.abs(a.effRad - s.local.radiation - off.rad) > 1e-9) bad.push(`${k}:${s.name}`); }); }
  check(!bad.length && n > 100, "15 · every pressured evaluation equals a default-scenario evaluation of the same shifted conditions (fitness, limiting factor, effective temperature / moisture / radiation)",
    `${n} region evaluations across 3 worlds × 3 builds at the final state${bad.length ? " · differ: " + bad.slice(0, 4).join(", ") : ""}`); }
// 16 · a region turns green → yellow → red because of the decline (no purchase, same plant, same sky)
const lampTrace = (planet, scenario, ticks) => { const sim = BLOOM.createSim(planet, config, traits, { rng: mul(5), ...(scenario ? { scenario } : {}) }), T = sim.map.SEC.map(() => []);
  for (let t = 1; t <= ticks && !sim.lost; t++) { sim.tick(); if (t % 25 === 0) sim.map.SEC.forEach((_, i) => { const L = lampOf(sim.secFit[i]); const a = T[i]; if (!a.length || a[a.length - 1].lamp !== L) a.push({ lamp: L, t, limit: sim.evaluate(i).limitKey }); }); }
  return { sim, T }; };
{ const P0 = lampTrace(OAP, DW, FULL_TICK + 100), E0 = lampTrace(OAP, null, FULL_TICK + 100), M = P0.sim.map, rows = [];
  M.SEC.forEach((s, i) => { const seq = P0.T[i].map(x => x.lamp).join(">"); if (/green>yellow.*>red/.test(seq) && E0.T[i].every(x => x.lamp === "green"))
    rows.push(`${s.name}: ${P0.T[i].map(x => `${x.lamp}@${Math.round(x.t * TICK_S)}s${x.lamp !== "green" ? `(${x.limit})` : ""}`).join(" → ")} (default-scenario: green throughout)`); });
  EVID.transitions = rows;
  check(rows.length >= 1, "16 · a region turns green → yellow → red purely through scenario pressure (it stays green in the same default-scenario run)", rows.join(" · ")); }
{ // 17 · Adapt reverses a scenario-induced blocker (and Radiation Shielding leaves temperature / moisture alone — 20)
  const start = probeAt(OAP, [], 0), fin = probeAt(OAP, [], 1), shield = probeAt(OAP, ["rad"], 1), dry = probeAt(OAP, ["drought"], 1), M = fin.s.map, out = [];
  M.SEC.forEach((s, i) => { if (i === M.ORIGIN) return; const a = start.ev(i), b = fin.ev(i);
    if (a.fitness > G && b.fitness <= G) { if (b.limitKey === "Hazard" && shield.ev(i).fitness > G) out.push(`${s.name}: Hazard (radiation ${s.local.radiation}→${r1(b.effRad)}) → Radiation Shielding reopens it`);
      if (b.limitKey === "Water" && dry.ev(i).fitness > G) out.push(`${s.name}: Water (${b.cats.Water.word}) → Drought Adaptation reopens it`); } });
  check(out.some(x => /Radiation Shielding/.test(x)) && out.some(x => /Drought/.test(x)), "17 · existing Adapt answers scenario-induced blockers: Radiation Shielding the radiation, Drought Adaptation the drying (open at the start, blocked in the final state, open again with the Adapt)", out.slice(0, 4).join(" · "));
  EVID.adaptAnswers = out;
  const same = M.SEC.every((_, i) => { const a = fin.ev(i), b = shield.ev(i); return a.effT === b.effT && a.effM === b.effM && a.skyT === b.skyT && a.skyM === b.skyM && a.cats.Temperature.f === b.cats.Temperature.f && a.cats.Water.f === b.cats.Water.f; });
  check(same && M.SEC.some((_, i) => shield.ev(i).cats.Hazard.f > fin.ev(i).cats.Hazard.f), "20 · Radiation Shielding changes only the Hazard answer: no region's temperature, moisture or their factors move"); }
{ // 18 · Terraform counters climate drift
  const fin = probeAt(OAP, [], 1), hum = probeAt(OAP, ["humid"], 1), M = fin.s.map, opened = [];
  const plus8 = M.SEC.every((_, i) => Math.abs(hum.ev(i).effM - fin.ev(i).effM - 8) < 1e-9);
  M.SEC.forEach((s, i) => { if (fin.ev(i).fitness <= G && fin.ev(i).limitKey === "Water" && hum.ev(i).fitness > G) opened.push(s.name); });
  const fz = WORLDS.frozen, ff = probeAt(fz, ["cold", "cold"], 1), fw = probeAt(fz, ["cold", "cold", "warm"], 1), warmed = [];
  ff.s.map.SEC.forEach((s, i) => { if (ff.ev(i).fitness <= G && ff.ev(i).limitKey === "Temperature" && fw.ev(i).fitness > G) warmed.push(s.name); });
  check(plus8 && opened.length >= 1 && warmed.length >= 1, "18 · existing Terraform counters the climate drift: Humidify adds its +8 on top of the drying and reopens dried-out regions; Warm the Sky reopens regions the cooling froze",
    `Ocean 28 final state, Humidify reopens: ${opened.join(", ")} · Frozen 11 final state (Cold ×2), Warm reopens: ${warmed.join(", ")}`); }
{ // 19 · Terraform never erases scenario progress (mechanism: Biomass granted so both runs buy at the same tick)
  const a = BLOOM.createSim(OAP, config, traits, { rng: mul(3), scenario: DW }), b = BLOOM.createSim(OAP, config, traits, { rng: mul(3), scenario: DW }); let ok = true, at1 = null;
  for (let t = 1; t <= FULL_TICK + 50; t++) { a.tick(); b.tick(); if (t === 1500) { b.biomass += 1e5; ["warm", "humid", "humid"].forEach(id => b.buy(id)); at1 = { ...b.pressure.offsets }; }
    if (J(a.pressure.offsets) !== J(b.pressure.offsets) || a.pressure.progress !== b.pressure.progress || a.pressure.phase !== b.pressure.phase) ok = false; }
  check(ok && J(a.pressure.events) === J(b.pressure.events) && b.sky.temp === a.sky.temp + 6 && b.sky.moist === a.sky.moist + 16,
    "19 · Terraform never erases scenario progress: a run that Terraforms mid-decline (240 s) has exactly the same pressure clock, drift and milestones as one that does not (only its own sky moved)",
    `drift at the purchase ${J({ temp: r1(at1.temp), moist: r1(at1.moist), rad: r1(at1.rad) })}; sky ${a.sky.temp}/${a.sky.moist} vs ${b.sky.temp}/${b.sky.moist}`); }
{ // 21 · Roots + Root Network cannot rescue ground the decline turned red (mechanism: focus + specialization set on a Living region)
  // (BLOOM-027B: the experiment runs on the first fixture world — primary, desert, frozen, extinct — whose final state turns an established colony red;
  // Ocean 28 has no such colony at 240 s, Desert 17 does)
  // The focus is set at 240 s, or earlier (180 / 120 s) on a world whose colonies the decline has already thinned by then (the extinction world dies out
  // before 240 s); the claim — Roots + Root Network do not keep a colony on ground the final state makes red — is the same at any of those moments.
  const pickWorld = () => { for (const k of ["primary", "desert", "frozen", "extinct"]) for (const fs of [240, 180, 120]) { const w = WORLDS[k], sim = BLOOM.createSim(w, config, traits, { rng: mul(5), scenario: DW });
      for (let t = 1; t <= at(fs); t++) sim.tick(); const liv = sim.livingCountBySection(), fin = probeAt(w, [], 1);
      if (sim.map.SEC.some((_, i) => liv[i] > 20 && fin.ev(i).fitness <= config.colony.protectAbove)) return [k, w, fs]; } return ["primary", OAP, 240]; };
  const [wKey, WR, FOCUS_S] = pickWorld();
  const run = roots => { const sim = BLOOM.createSim(WR, config, traits, { rng: mul(5), scenario: DW }); const M = sim.map; let sec = -1;
    for (let t = 1; t <= FULL_TICK + 900; t++) { sim.tick();
      if (t === at(FOCUS_S)) { const liv = sim.livingCountBySection(), fin = probeAt(WR, [], 1); // the most established colony the final state turns red
        sec = M.SEC.map((_, i) => i).filter(i => liv[i] > 20 && fin.ev(i).fitness <= config.colony.protectAbove).sort((x, y) => liv[y] - liv[x])[0] ?? -1;
        if (roots && sec >= 0) { sim.setColonyFocus(sec, "roots"); sim.biomass += 1e4; sim.buySpecialization(sec, "rootNetwork"); } } }
    return { sim, sec, living: sec >= 0 ? sim.livingCountBySection()[sec] : null, f: sec >= 0 ? sim.evaluate(sec).fitness : null }; };
  const a = run(true), b = run(false), name = a.sec >= 0 ? a.sim.map.SEC[a.sec].name : "—";
  check(a.sec >= 0 && a.sim.getColonyFocus(a.sec) === "roots" && a.sim.getSpecialization(a.sec) === "rootNetwork" && a.f <= config.colony.protectAbove && a.living === 0 && b.living === 0,
    "21 · Roots focus + Root Network cannot rescue a colony on ground the decline made red: it dies out exactly like the unprotected one",
    `${wKey} fixture (${WR.name}), focus at ${FOCUS_S} s, ${name}: fitness ${a.f && a.f.toFixed(2)} ≤ protectAbove ${config.colony.protectAbove} in the final state; living tiles 900 ticks after it: ${a.living} (Roots + Root Network) vs ${b.living} (Balanced)`); }
{ // 22 · Biomass changes only through real colony condition
  const e = BLOOM.createSim(OAP, config, traits, { rng: mul(21) }), d = BLOOM.createSim(OAP, config, traits, { rng: mul(21), scenario: DW }); let same = true;
  for (let t = 1; t < FIRST_DRIFT; t++) { e.tick(); d.tick(); if (e.biomass !== d.biomass || fnv(Array.from(e.state).join("")) !== fnv(Array.from(d.state).join(""))) same = false; }
  // final state: a pressured run vs a default-scenario run on the shifted planet, from the SAME colony state and the SAME random draws
  const plan = ["rad", "drought", "waterSeeds"]; let srcA = mul(8), srcB = mul(99);
  const A = BLOOM.createSim(OAP, config, traits, { rng: () => srcA(), scenario: DW }); A.biomass = 1e4; plan.forEach(id => A.buy(id));
  for (let t = 0; t < FULL_TICK + 250; t++) A.tick();
  const B = BLOOM.createSim(shifted(OAP, A.pressure.offsets), config, traits, { rng: () => srcB() }); B.biomass = 1e4; plan.forEach(id => B.buy(id));
  B.state.set(A.state); B.dens.set(A.dens); B.vigor.set(A.vigor); srcA = mul(4); srcB = mul(4);
  const oA = A.evaluate(A.map.ORIGIN).fitness, oB = B.evaluate(B.map.ORIGIN).fitness;
  let incA = 0, incB = 0, sameState = true; for (let k = 0; k < 40; k++) { A.tick(); B.tick(); incA += A.income; incB += B.income; if (fnv(Array.from(A.state).join("")) !== fnv(Array.from(B.state).join(""))) sameState = false; }
  const src = fs.readFileSync(path.join(ROOT, "resources/bloom-sim.js"), "utf8"), econ = src.slice(src.indexOf("// 3. economy"), src.indexOf("// 4. bubbles"));
  check(same && !/pressure|offsets|SCN|PR\b/.test(econ) && oA >= config.categories.originFitnessFloor && Math.abs(oA - oB) < 1e-9 && sameState && Math.abs(incA - incB) < 1e-9 && incA > 0,
    "22 · pressure reaches Biomass only through colony condition: identical to default-scenario while the atmosphere is stable, the economy code never reads pressure, and in the final state a pressured colony earns exactly what the same colony earns in a default-scenario world with those conditions",
    `grace: ${same ? "bit-identical" : "DIFFERS"} · final state, same colonies + same draws for 40 ticks: income ${incA.toFixed(4)} vs ${incB.toFixed(4)} (origin fitness ${oA.toFixed(3)} vs ${oB.toFixed(3)})`); }

console.log("\n# A · extinction loss");
{ const { sim } = clock; let zeroFrom = null; // (no purchases, Dying World, rng 5, on the extinction fixture world — see FIX)
  const s2 = BLOOM.createSim(WORLDS.extinct, config, traits, { rng: mul(5), scenario: DW }); let lossCalls = 0, why = null; s2.onLoss = w => { lossCalls++; why = w; };
  for (let t = 1; t <= 9000 && !s2.lost; t++) { const c = s2.tick(); if (c === 0 && zeroFrom === null) zeroFrom = t; if (c > 0) zeroFrom = null; }
  const gTicks = s2.extinction.graceTicks;
  check(s2.lost && s2.lostTick - zeroFrom + 1 === gTicks && gTicks === Math.round(DW.loss.extinctionGraceSeconds / TICK_S),
    "23 · extinction grace works: the run is lost exactly extinctionGraceSeconds after the last living tile died, not before",
    `no-purchase Frozen 9 (extinction fixture): last plants gone at ${(zeroFrom * TICK_S).toFixed(1)} s (pressure ${pct(sim.pressure.progress)}), lost at ${(s2.lostTick * TICK_S).toFixed(1)} s = ${gTicks} ticks later`);
  const frozen = { ticks: s2.ticks, bio: s2.biomass, st: fnv(Array.from(s2.state).join("")) }; for (let k = 0; k < 200; k++) s2.tick();
  check(lossCalls === 1 && /extinction/.test(why) && /extinction/.test(s2.lostReason) && s2.ticks === frozen.ticks && s2.biomass === frozen.bio && fnv(Array.from(s2.state).join("")) === frozen.st,
    "25 · a confirmed extinction is a clear loss: onLoss fires once with the reason, and the run is frozen (no more ticks, Biomass or tile changes)", s2.lostReason);
  EVID.extinction = { zeroFromSeconds: +(zeroFrom * TICK_S).toFixed(1), lostSeconds: +(s2.lostTick * TICK_S).toFixed(1), reason: s2.lostReason }; }
{ // 24 · (mechanism) a zero-Living gap shorter than the grace does not lose; one as long as the grace does
  const gap = n => { const s = BLOOM.createSim(OAP, config, traits, { rng: mul(5), scenario: DW }); for (let t = 0; t < 600; t++) s.tick();
    const st = s.state.slice(), de = s.dens.slice(); for (const i of s.map.LAND_TILES) if (s.state[i] === s.LIV) s.state[i] = s.BAR;
    for (let k = 0; k < n && !s.lost; k++) s.tick(); const lostDuring = s.lost; if (!s.lost) { s.state.set(st); s.dens.set(de); for (let k = 0; k < 200; k++) s.tick(); }
    return { lost: s.lost, lostDuring, zero: s.extinction.zeroTicks }; };
  const g = Math.round(DW.loss.extinctionGraceSeconds / TICK_S), short = gap(g - 1), long = gap(g);
  check(!short.lost && short.zero === 0 && long.lostDuring, "24 · a temporary zero-Living spell shorter than the grace never loses (the counter resets when plants are back); one lasting the full grace does",
    `${g - 1} ticks with no living plants → survives (counter back to ${short.zero}); ${g} ticks → lost`); }
{ // 26 · default-scenario never gets the new loss; a won pressure run is never lost afterwards
  const e = BLOOM.createSim(OAP, config, traits, { rng: mul(5), scenario: DEFAULT_SCN }), n = BLOOM.createSim(OAP, config, traits, { rng: mul(5) });
  for (const s of [e, n]) { for (const i of s.map.LAND_TILES) s.state[i] = s.BAR; for (let k = 0; k < 500; k++) s.tick(); }
  check(!e.lost && !n.lost && !e.extinction.enabled && !n.extinction.enabled && e.coverage() === 0,
    "26 · default-scenario is not given the pressure loss: a default-scenario run with no living plants for 80 s is still not lost (extinction disabled)"); }

console.log("\n# A · layer P — Dying World on the three production archetypes");
const LP = {};
for (const [k, [id, seed]] of Object.entries(FIX)) LP[k] = BLOOM.validateScenario(WORLDS[k], config, traits, DW, { archetypeId: id, minStrategies: 2 });
const show = s => `[${s.signature}] ${s.purchases.map(p => `${p.id}@${Math.round(p.seconds)}s`).join(" → ")} · win ${Math.round(s.winSeconds)} s · margin ${Math.round(s.marginSeconds)} s (pressure ${pct(s.pressureAtMargin)}) · holds ${pct(s.hold.coverage)} at ${Math.round(s.hold.seconds)} s`;
{ const v = BLOOM.validateScenario(OAP, config, traits, DW, { archetypeId: "ocean_archipelago" }), w = v.strategies[0];
  const plan = w.purchases.map(p => p.id), V = config.validation; // independent replay of the witness: earned Biomass only, real pressure
  const sim = BLOOM.createSim(OAP, config, traits, { rng: mul(V.rngSeed), scenario: DW }); let k = 0, earned = 0, neg = false, marginP = null;
  for (let t = 1; t <= V.maxTicks && marginP === null; t++) { const b0 = sim.biomass, c = sim.tick(); earned += sim.biomass - b0; if (sim.biomass < 0) neg = true;
    if (c >= sim.winAt + V.winMargin) marginP = sim.pressure.progress;
    if (k < plan.length && sim.biomass >= sim.price(sim.traitById[plan[k]])) { if (sim.buy(plan[k])) k++; } }
  check(v.status === "PASS" && w.hold.held && w.hold.coverage >= 0.70 && marginP > 0 && !neg && sim.spent.global <= config.econ.startBiomass + earned && k === plan.length,
    "27 · Ocean 28 + Dying World is winnable through earned Biomass under real pressure (layer P PASS; an independent replay buys only with earned Biomass while the decline advances, and still holds 70% in the final state)",
    `${show(w)} · replay: spent ${sim.spent.global} of ${config.econ.startBiomass} + ${Math.round(earned)} earned; pressure ${pct(marginP)} at the margin`);
  EVID.primaryLayerP = { status: v.status, strategy: w.signature, purchases: w.purchases, winSeconds: w.winSeconds, marginSeconds: w.marginSeconds, hold: w.hold, ms: v.search.ms }; }
{ const v = LP.primary, s = v.strategies, d = v.differences[0];
  check(v.status === "PASS" && s.length === 2 && BLOOM.witness.distinctSignatures(...s.map(x => ({ tokens: x.tokens }))) && s.some(x => x.tokens.includes("Water:dry=Adapt(1)")) && s.some(x => x.tokens.some(t => /^Water:dry=Terraform/.test(t))),
    "28 · the primary fixture has two legitimate, materially distinct pressure strategies: answer the drying by evolving (Drought Adaptation) or by Terraforming (Humidify)",
    s.map(show).join(" ‖ ") + (d ? ` · differ by ${d.onlyA.join("+")} vs ${d.onlyB.join("+")}; held land ${d.heldOnlyA.length || d.heldOnlyB.length ? "differs" : "the same"}` : ""));
  EVID.primaryStrategies = s.map(x => ({ signature: x.signature, purchases: x.purchases, winSeconds: x.winSeconds, marginSeconds: x.marginSeconds, pressureAtMargin: x.pressureAtMargin, hold: x.hold, held: x.held, order: x.order })); }
for (const [k, label, n] of [["desert", "Desert 17", 30], ["frozen", "Frozen 11", 31]]) { const v = LP[k];
  check(v.status === "PASS" && v.strategies.length >= 1, `${n} · ${label} + Dying World is proven viable by layer P (real pressured witnesses; ${v.strategies.length} distinct strategies)`,
    v.strategies.map(show).join(" ‖ ") || v.reason);
  EVID[k + "Strategies"] = v.strategies.map(x => ({ signature: x.signature, purchases: x.purchases, winSeconds: x.winSeconds, hold: x.hold, held: x.held })); }
{ // the default-scenario strategies are no longer enough in the final state (what changed per archetype)
  const rows = Object.entries(WORLDS).map(([k, w]) => { const M = probeAt(w).s.map; return `${k}: ` + w.archetype.strategies.list.map(st => {
    const cov = p => { const pr = probeAt(w, st.minimalBuild, p); return M.SEC.reduce((a, _, i) => a + (pr.ev(i).fitness > G ? M.AREA[i] : 0), 0) / M.LAND; };
    return `[${st.signature}] ${pct(cov(0))} → ${pct(cov(1))}`; }).join(" · "); });
  EVID.defaultStrategiesUnderPressure = rows;
  check(Object.entries(WORLDS).every(([k, w]) => w.archetype.strategies.list.every(st => { const M = probeAt(w).s.map, pr = probeAt(w, st.minimalBuild, 1);
    return M.SEC.reduce((a, _, i) => a + (pr.ev(i).fitness > G ? M.AREA[i] : 0), 0) / M.LAND < 0.70; })),
    "28b · every accepted default-scenario strategy of the three fixtures falls below 70% growable land in the final state — the earlier solution is no longer enough", rows.join(" | ")); }
{ // 32 · water never colonized under pressure; 33 · Waterborne Seeds stays geography-driven
  const plan = LP.primary.strategies[0].purchases.map(p => p.id), sim = BLOOM.createSim(OAP, config, traits, { rng: mul(31), scenario: DW }), dflt = BLOOM.createSim(OAP, config, traits, { rng: mul(31) });
  let k = 0, wet = 0; const water = []; for (let i = 0; i < sim.map.N; i++) if (sim.map.TILEMAP[i] < 0) water.push(i);
  for (let t = 1; t <= FULL_TICK + 1500 && !sim.lost; t++) { sim.tick(); if (k < plan.length && sim.biomass >= sim.price(sim.traitById[plan[k]]) && sim.buy(plan[k])) k++;
    if (t % 100 === 0) for (const i of water) if (sim.state[i] !== 0 || sim.dens[i] !== 0) wet++; }
  check(water.length > 0 && wet === 0 && sim.map.LAND === dflt.map.LAND, "32 · pressure never colonizes water or changes the land denominator (every water tile Barren with no plants, checked every 100 ticks through the final state)",
    `${water.length} water tiles · ${sim.map.LAND} land tiles in both runs`);
  const landing = new Set(BLOOM.geo.waterCrossings(sim.map.TILEMAP, sim.map.W, sim.map.H, config.crossing.maxGap).pairs.map(p => p[1])), took = sim.crossing.events.filter(e => e.took);
  const offerSame = Object.values(WORLDS).every(w => { const a = BLOOM.createSim(w, config, traits, { scenario: DW }), b = BLOOM.createSim(w, config, traits, {}), t = traits.find(x => x.effect.type === "crossing");
    return a.offered(t) === b.offered(t) && J(a.map.CROSSINGS) === J(b.map.CROSSINGS); });
  check(J(sim.map.CROSSINGS) === J(dflt.map.CROSSINGS) && took.length > 0 && took.every(e => landing.has(e.to)) && offerSame,
    "33 · Waterborne Seeds stays geography-driven under pressure: the same crossings and offer rule as default-scenario, footholds only on real landing tiles",
    `${sim.map.CROSSINGS.links.length} crossing links · ${sim.crossing.footholds} footholds, all on landing tiles · Desert 17 / Frozen 11 offer Waterborne Seeds exactly as in default-scenario`); }
{ // DISALLOWED + DEFAULT_SCN statuses of the generic layer (data-driven archetype policy)
  const d = clone(DW); d.validation.archetypes = { desert_world: { allowed: false, reason: "test policy" } };
  const x = BLOOM.validateScenario(WORLDS.desert, config, traits, d, { archetypeId: "desert_world" }), e = BLOOM.validateScenario(OAP, config, traits, DEFAULT_SCN, { archetypeId: "ocean_archipelago" });
  check(x.status === "DISALLOWED" && !x.ok && /test policy/.test(x.reason) && e.status === "DEFAULT" && e.ok && J(DW.validation.archetypes) === "{}",
    "P · layer P supports an explicit per-archetype rejection as data (DISALLOWED with its reason) and adds nothing to prove for default-scenario; Dying World currently disallows no archetype"); }
console.log(`\n(Node part ${((Date.now() - t0) / 1000).toFixed(1)} s)`);

// ---------------------------------------------------------------------------------------------------------- B · browser
async function browserPart() {
  let chromium; try { ({ chromium } = require("playwright")); } catch (e) { check(false, "Playwright available for part B", "npm i -g playwright; NODE_PATH=\"$(npm root -g)\""); return; }
  const PAGE = "file://" + encodeURI(path.join(ROOT, "demos/demo-run.html")), browser = await chromium.launch();
  // (BLOOM-029E) this suite drives the engineering shell's own controls and reads its DOM (the pre-029 playtest harness): it opens every page
  // with the developer flag ?ui=legacy. The production UI is the default run interface; its suites are planet-view / plant-rooms / terraform /
  // run-ui-convergence / game-flow.
  const legacy = q => (q ? q + "&" : "?") + "ui=legacy";
  if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
  const shot = async (p, n) => { if (SHOTS) await p.screenshot({ path: path.join(SHOTS, n) }); };
  { const w = await browser.newPage(); await w.goto(PAGE + legacy("")); await w.waitForTimeout(200); await w.close(); } // headless warm-up (first page reads canvas blank)
  const open = async (q, pause = true) => { const p = await browser.newPage({ viewport: { width: 1440, height: 920 } }); p.errors = [];
    p.on("pageerror", e => p.errors.push(e.message)); p.on("console", m => { if (m.type() === "error") p.errors.push(m.text()); });
    await p.goto(PAGE + legacy(q)); await p.waitForTimeout(300); if (pause && await p.$("#btnPlay")) await p.click("#btnPlay"); return p; };
  const DWQ = `?archetype=ocean_archipelago&seed=28&scenario=dying_world`, EXTQ = `?archetype=frozen_world&seed=${FIX.extinct[1]}&scenario=dying_world`;
  console.log("\n# B · browser");
  // 35 / 34 · launch identity, no solution data
  { const p = await open(DWQ), r = await p.evaluate(() => ({ run: BLOOM_API.run, title: document.title, h: document.querySelector("header h1 small").textContent, bar: (document.getElementById("pbar") || {}).innerText || "",
      foot: document.getElementById("runId").textContent, raw: JSON.stringify(window.BLOOM_RUN.summary) + JSON.stringify(window.BLOOM_RUN.planet.archetype), log: document.getElementById("log").textContent }));
    check(r.run.scenarioId === "dying_world" && /Dying World/.test(r.title) && /dying world/.test(r.h) && /DYING WORLD/.test(r.bar) && /scenario dying_world \(layer P PASS\)/.test(r.foot) && r.run.attempt === OAP.archetype.attempt,
      `35 · the browser launch identifies Dying World (title, header, pressure bar, footer) on the same Ocean 28 world (attempt ${OAP.archetype.attempt})`, `${r.title} · ${r.foot.slice(-60)}`);
    check(!/"purchases"|minimalBuild|"signature"|witness|"held"|"plan"|"strategies"/.test(r.raw) && J(Object.keys(r.run.scenarioValidation).sort()) === J(["required", "status", "strategiesProven"]),
      "34 · the page never holds witness or solution data: layer P hands the UI a status and a count only", J(r.run.scenarioValidation));
    check(/Atmosphere thinning/.test(r.log) && r.log.includes(`decline begins in ${Math.floor(P.graceSeconds / 60)}:${String(P.graceSeconds % 60).padStart(2, "0")}`), "Q · the run opens with the short science wording and when the decline starts", r.log.slice(0, 170));
    await shot(p, "dw-ocean13-start.png");
    // (mechanism, so this readout run survives the final state on its home island without winning: Biomass granted, the
    // radiation + drying answers bought through the real buttons; no Waterborne Seeds, so the islands stay out of reach)
    await p.evaluate(() => BLOOM_API.addBiomass(500)); for (const id of ["rad", "drought"]) { await p.click(`button.buy[data-id="${id}"]`); await p.mouse.move(5, 5); }
    // O2 · the map itself shows the decline: the ground colour of a bare far-island region (drawn from the effective climate)
    // and a water pixel (unchanged colour, so any change there is the haze), at the start and in the final state
    const readPx = () => p.evaluate(() => { draw(); const M = BLOOM_API.sim.map, far = M.SEC.map((_, i) => i).filter(i => M.LANDMASS[i] !== M.LANDMASS[M.ORIGIN])[0];
      const w = M.TILEMAP.findIndex(v => v < 0), d = Math.max(1, Math.min(2, window.devicePixelRatio || 1)), x = ((w % M.W) + 0.5) * TILE * d, y = (((w / M.W) | 0) + 0.5) * TILE * d;
      return { sec: far, ground: barrenColor(far).map(Math.round), water: [...cv.getContext("2d").getImageData(Math.floor(x), Math.floor(y), 1, 1).data].slice(0, 3) }; });
    const px0 = await readPx();
    // 36 / 37 / 39 · the bar follows the real sim; readouts are effective values; milestones at the configured thresholds
    const samples = [], phasesWant = P.phases.map(ph => ({ id: ph.id, tick: (() => { for (let t = GRACE_TICK; t < FULL_TICK + 2; t++) { const pr = BLOOM.pressure.progressAt(P, t * TICK_S); if (pr >= ph.from) return t; } })() }));
    for (let n = 0; n < 34; n++) { await p.evaluate(() => { BLOOM_API.advance(100); pollPressure(performance.now()); renderPressure(); renderHUD(BLOOM_API.coverage()); });
      if (n % 3 === 2) samples.push(await p.evaluate(() => ({ t: BLOOM_API.sim.ticks, p: BLOOM_API.pressure().progress, pct: document.getElementById("pPct").textContent, phase: document.getElementById("pPhase").textContent,
        fill: document.getElementById("pFill").style.width, moist: document.getElementById("pMoist").textContent, rad: document.getElementById("pRad").textContent, next: document.getElementById("pNext").textContent }))); }
    check(samples.every(s => s.pct === `${Math.round(s.p * 100)}% lost` && Math.abs(parseFloat(s.fill) - s.p * 100) < 0.11) && new Set(samples.map(s => s.pct)).size >= 4 && samples.at(-1).next === "conditions have stopped changing",
      "36 · the pressure bar updates with the real simulation (phase, % lost, fill, live drift, time to the next stage)", samples.map(s => `${Math.round(s.t * TICK_S)}s ${s.phase} ${s.pct} m${s.moist} r${s.rad}`).join(" | "));
    const ph = await p.evaluate(() => BLOOM_API.pressure()), px1 = await readPx(), dd = (a, b) => a.reduce((t, v, k) => t + Math.abs(v - b[k]), 0);
    check(dd(px0.ground, px1.ground) >= 6 && dd(px0.water, px1.water) >= 45, "O2 · the map itself shows the decline: bare ground is drawn from the effective (drier, colder) climate, under a haze that thickens with the loss",
      `bare-ground colour rgb ${px0.ground} → ${px1.ground} (Δ ${dd(px0.ground, px1.ground)}); water pixel ${px0.water} → ${px1.water} (haze, Δ ${dd(px0.water, px1.water)})`);
    check(J(ph.phases.map(x => [x.phase, x.tick])) === J(phasesWant.map(x => [x.id, x.tick])), "39 · milestone feedback fired exactly at the configured phase thresholds (UI history = engine events = the data's `from` values)",
      ph.phases.map(x => `${x.phase}@${(x.tick * TICK_S).toFixed(1)}s`).join(", "));
    const rd = await p.evaluate(() => { selected = BLOOM_API.sim.map.ORIGIN; renderInspect(); const e = evaluate(selected), k = skyNow();
      return { hud: document.getElementById("hSky").textContent, tline: document.getElementById("tline").innerText, note: (document.getElementById("pressNote") || {}).innerText || "",
        rawRad: [...document.querySelectorAll("#inspMore table.kv td")].map(td => td.textContent).join("|"), effT: e.effT, skyT: e.skyT, effRad: e.effRad, k, base: BLOOM_API.sim.planet.sections.find(s => s.isOrigin).local.radiation }; });
    const dc = t => `${t > 0 ? "+" : t < 0 ? "−" : ""}${Math.abs(r1(t))}°C`;
    check(rd.hud.startsWith(dc(rd.k.t)) && rd.hud.includes(`moist ${r1(rd.k.m)}`) && rd.tline.includes(`Ground here ${dc(rd.effT)}`) && rd.tline.includes(`sky ${dc(rd.skyT)}`) && rd.rawRad.includes(`${rd.base} + ${r1(ph.offsets.rad)} thin air = ${r1(rd.effRad)}`) && /Thinning atmosphere here/.test(rd.note),
      "37 · environmental readouts show the current effective values (HUD sky, region ground temperature, sky, radiation with its drift)", `${/Thinning/.test(rd.note) ? "" : "note: " + rd.note + " · "}${rd.rawRad.includes("thin air") ? "" : "raw: " + rd.rawRad + " · "}HUD ${rd.hud} · ${rd.tline.replace(/\n/g, " ")} · radiation ${rd.base} + ${r1(ph.offsets.rad)} = ${r1(rd.effRad)}`);
    await shot(p, "dw-ocean13-final-state.png");
    // 38 · Terraform vs drift (mechanism: Biomass granted to make the click possible now)
    await p.evaluate(() => BLOOM_API.addBiomass(1000)); await p.click('button.buy[data-id="humid"]'); await p.mouse.move(5, 5);
    const tf = await p.evaluate(() => { renderPressure(); return { sky: document.getElementById("pSky").innerText, log: document.getElementById("log").textContent, off: BLOOM_API.pressure().offsets }; });
    check(tf.sky.includes("Terraform +8") && tf.sky.includes(`thinning ${tf.off.moist < 0 ? "−" : ""}${Math.abs(r1(tf.off.moist))}`) && /Bought Humidify\. Sky moisture 54 → 62 \(thinning air −/.test(tf.log),
      "38 · the Terraform readout keeps the player's Terraform apart from the scenario drift (sky = base · Terraform · thinning), in the bar and in the purchase message", `${tf.sky.split("—")[1]} · ${tf.log.slice(0, 110)}`);
    await shot(p, "dw-ocean13-terraform-vs-drift.png");
    check(p.errors.length === 0, "no browser errors (Ocean 28 Dying World readouts)", p.errors.join(" | ")); await p.close(); }
  // 16b · the map reports regions the decline pushes across a threshold (BLOOM-027B: on the extinction fixture world, Frozen 9 — Ocean 28's regions never go red under the decline)
  { const p = await open(EXTQ); for (let n = 0; n < 640; n++) await p.evaluate(() => { BLOOM_API.advance(5); pollPressure(performance.now()); });
    const th = await p.evaluate(() => ({ h: BLOOM_API.pressure().thresholds, log: document.getElementById("log").textContent }));
    check(th.h.some(x => x.from === "green" && x.to !== "green") && th.h.some(x => x.to === "red"), "O · the UI notices living regions the decline pushes across a threshold (outlined on the map + one message)",
      th.h.slice(0, 5).map(x => `${x.name} ${x.from}→${x.to}${x.opened ? " (opened)" : ""} @${Math.round(x.tick * TICK_S)}s`).join(", "));
    check(p.errors.length === 0, "no browser errors (threshold feedback)", p.errors.join(" | ")); await p.close(); }
  // 40 · a Dying World run won through REAL shop buttons (earned Biomass only)
  { const p = await open(DWQ), plan = LP.primary.strategies[0].purchases.map(x => x.id); let i = 0, affordAt = null, won = null; const buys = [];
    for (let t = 0; t < 12000 && !won; t += 5) {
      await p.evaluate(() => { BLOOM_API.advance(5); refreshShop(); pollPressure(performance.now()); }); const st = await p.evaluate(() => ({ ...BLOOM_API.state(), lost: BLOOM_API.sim.lost }));
      if (st.won || st.lost) { won = st; break; }
      if (i < plan.length) { const off = await p.$eval(`button.buy[data-id="${plan[i]}"]`, b => b.classList.contains("off"));
        if (!off) { affordAt ??= st.ticks; if (st.ticks - affordAt >= 25) { await p.click(`button.buy[data-id="${plan[i]}"]`); await p.mouse.move(5, 5); buys.push(`${plan[i]} @ ${Math.round(st.ticks * TICK_S)} s`); i++; affordAt = null; } } } }
    const fin = await p.evaluate(() => ({ cov: BLOOM_API.sim.coverage(), pr: BLOOM_API.pressure().progress, spentGlobal: BLOOM_API.sim.spent.global, ticks: BLOOM_API.sim.ticks }));
    check(won && won.won && !won.lost && i === plan.length && fin.cov >= 0.70, "40 · a Dying World run is won through real shop clicks with earned Biomass (Ocean 28, the Drought strategy)",
      `${buys.join(" → ")} · win at ${won ? Math.round(won.ticks * TICK_S) : "—"} s with ${pct(fin.cov)} of the land, pressure ${pct(fin.pr)}`);
    EVID.browserWin = { buys, winSeconds: won && Math.round(won.ticks * TICK_S), coverage: fin.cov, pressure: fin.pr };
    await p.waitForTimeout(150);
    const rep = await p.evaluate(() => ({ on: !!(document.getElementById("reportModal") && document.getElementById("reportModal").classList.contains("on")), text: document.getElementById("report").innerText, pr: (document.getElementById("repPressure") || {}).innerText || "" }));
    check(rep.on && /under Dying World/.test(rep.text) && /Pressure: Dying World · Atmosphere thinning/.test(rep.pr) && /moisture −/.test(rep.pr) && /temperature −/.test(rep.pr) && /radiation \+/.test(rep.pr) && rep.text.includes(OAP.name) && /Ocean Archipelago · public seed 28/.test(rep.text),
      "42 · the Bloom Report names the planet, archetype and scenario, the final pressure state and the drift the plant endured, beside the usual build summary", rep.pr.replace(/\n/g, " "));
    await shot(p, "dw-ocean13-report.png"); check(p.errors.length === 0, "no browser errors (Dying World win)", p.errors.join(" | ")); await p.close(); }
  // 41 · an intentionally doomed control (no purchases) loses by extinction (BLOOM-027B: on the extinction fixture world, Frozen 9)
  { const p = await open(EXTQ); let st; for (let n = 0; n < 200; n++) { st = await p.evaluate(() => { BLOOM_API.advance(50); return { lost: BLOOM_API.sim.lost, t: BLOOM_API.sim.ticks }; }); if (st.lost) break; }
    await p.waitForTimeout(150);
    const r = await p.evaluate(() => ({ on: !!(document.getElementById("reportModal") && document.getElementById("reportModal").classList.contains("on")), text: document.getElementById("report").innerText, btn: !!document.getElementById("lossRestart"), why: BLOOM_API.pressure().lostReason }));
    check(st.lost && r.on && /EXTINCTION/.test(r.text) && /No living plants were left anywhere for 8 s/.test(r.text) && r.btn && /Final harsh state/.test(r.text),
      "41 · an intentionally doomed control (no purchases) loses by extinction: a clear loss screen with the reason, the pressure reached and a restart button", `${r.why} at ${Math.round(st.t * TICK_S)} s`);
    await shot(p, "dw-ocean13-extinction.png"); await p.click("#lossRestart"); await p.waitForTimeout(500);
    const again = await p.evaluate(() => ({ t: BLOOM_API.sim.ticks, lost: BLOOM_API.sim.lost, on: !!(document.getElementById("reportModal") && document.getElementById("reportModal").classList.contains("on")) }));
    check(!again.lost && !again.on && again.t < 20, "41b · restart reloads the same launch as a fresh run", J(again));
    check(p.errors.length === 0, "no browser errors (extinction control)", p.errors.join(" | ")); await p.close(); }
  // R · explicit failures and other launches
  for (const [q, want] of [["?archetype=ocean_archipelago&seed=28&scenario=volcano_world", /unknown scenario "volcano_world"/], ["?scenario=", /must be a scenario id/], ["?archetype=desert_world&seed=25&scenario=Dying%20World", /must be a scenario id/]]) {
    const p = await open(q, false), r = await p.evaluate(() => ({ fail: (document.getElementById("genFail") || {}).innerText || "", sim: !!(window.BLOOM_API && BLOOM_API.sim), title: document.title }));
    check(want.test(r.fail) && /NO RUN STARTED/.test(r.fail) && !r.sim && /run not started/.test(r.title), `R · ${q.slice(1)} fails explicitly: no run started, no substitute`, r.fail.split("\n").slice(1, 3).join(" / "));
    await p.close(); }
  { const p = await open("?archetype=ocean_archipelago&seed=28"), r = await p.evaluate(() => ({ bar: !!document.getElementById("pbar"), run: BLOOM_API.run, title: document.title, rid: document.getElementById("runId").textContent, ext: BLOOM_API.sim.extinction.enabled }));
    check(!r.bar && r.run.scenarioId === "default" && !/Dying/.test(r.title) && !/scenario/.test(r.rid) && !r.ext, "R · no scenario parameter = default-scenario: no pressure bar, no loss rule, the familiar title and footer", r.title);
    check(p.errors.length === 0, "no browser errors (Ocean 28 default-scenario)", p.errors.join(" | ")); await p.close(); }
  for (const [id, seed, name] of [["desert_world", 17, "Desert World"], ["frozen_world", 11, "Frozen World"]]) {
    const p = await open(`?archetype=${id}&seed=${seed}&scenario=dying_world`); await p.evaluate(() => { BLOOM_API.advance(2200); pollPressure(performance.now()); renderPressure(); });
    const r = await p.evaluate(() => ({ run: BLOOM_API.run, bar: document.getElementById("pbar").innerText, pr: BLOOM_API.pressure() }));
    check(r.run.scenarioId === "dying_world" && r.run.scenarioValidation.status === "PASS" && r.run.archetype === name && /DYING WORLD/.test(r.bar) && r.pr.phases.length >= 3,
      `J · ${name} ${seed} + Dying World launches (layer P PASS) and its pressure bar runs`, r.bar.split("\n").slice(1, 6).join(" · "));
    await shot(p, `dw-${id.split("_")[0]}${seed}-midgame.png`); check(p.errors.length === 0, `no browser errors (${name} Dying World)`, p.errors.join(" | ")); await p.close(); }
  await browser.close();
}

(async () => {
  if (!NO_BROWSER) await browserPart();
  if (JSON_OUT) { fs.writeFileSync(JSON_OUT, JSON.stringify({ scenario: DW, layerP: Object.fromEntries(Object.entries(LP).map(([k, v]) => [k, { status: v.status, strategies: v.strategies.map(s => ({ signature: s.signature,
    purchases: s.purchases, winSeconds: s.winSeconds, marginSeconds: s.marginSeconds, pressureAtMargin: s.pressureAtMargin, hold: s.hold, held: s.held, trace: s.trace })), differences: v.differences, pressure: v.pressure, ms: v.search.ms }])),
    evidence: EVID }, null, 1)); console.log("evidence written:", JSON_OUT); }
  console.log(`\n${fails ? fails + " check(s) FAILED" : "ALL CHECKS PASS"}  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  process.exit(fails ? 1 : 0);
})();
