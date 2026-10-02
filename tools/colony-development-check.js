// BLOOM — colony development checks (BLOOM-009; grew out of BLOOM-008's colony-focus-check.js): per-region persistent
// allocation (Balanced / Roots / Leaves / Seeds), Biomass-bought local specializations, the seedling → dense stand range,
// the Biomass HUD and the Waterborne crossing feedback.
//
//   NODE_PATH="$(npm root -g)" node tools/colony-development-check.js [--shots <dir>]
//
// Part A (Node, production engine): deterministic controlled experiments — the same map, the same seeded RNG, one
// variable changed. Part B (Chromium): the real inspect-panel controls, map badges, density rendering, HUD and crossing
// animations, driven through real clicks. Page RNG is seeded (Math.random → mulberry32). Numbers in brackets refer to
// the BLOOM-009 directive's required proofs. Exits 1 on any failure.
"use strict";
const path = require("path");
let chromium;
try { ({ chromium } = require("playwright")); }
catch { console.error('Playwright not found. Run with NODE_PATH="$(npm root -g)" after `npm i -g playwright`.'); process.exit(2); }
const ROOT = path.resolve(__dirname, "..");
for (const f of ["content/config.js", "content/traits.js", "content/archetypes.js", "planets/first_bloom.js", "resources/bloom-sim.js",
  "resources/bloom-gen.js", "resources/bloom-validate.js", "resources/bloom-witness.js", "resources/bloom-archetype.js"]) require(path.join(ROOT, f));
const { BLOOM, BLOOM_DATA } = globalThis, { config, traits, archetypes } = BLOOM_DATA, FB = BLOOM_DATA.planets.first_bloom;
const STUDY = require("./colony-study.js");
const OA = archetypes.find(a => a.id === "ocean_archipelago"), CROSS_ID = traits.find(t => t.effect.type === "crossing").id;
const PAGE = "file://" + encodeURI(path.join(ROOT, "demos/demo-run.html"));
const shotsArg = process.argv.indexOf("--shots"), SHOTS = shotsArg > 0 ? process.argv[shotsArg + 1] : null;
const TPS = 1000 / config.tickMs, G = config.grow, COL = config.colony, EST = config.establish;
const mb = BLOOM.gen.mulberry32, clone = o => JSON.parse(JSON.stringify(o)), fnv = BLOOM.archetype.fnv1a;
const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length, pct = x => (x * 100).toFixed(1) + "%";
let fails = 0;
const check = (ok, name, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); if (!ok) fails++; };
const hashState = sim => fnv(Array.from(sim.state).join(""));
const BLOOM008_SEEDLING = 0.15; // BLOOM-008's config.establish.seedlingDensity (for [24])

// ---- lab planet: Home (origin, ideal) | Test (temperature offset sets its fitness exactly); optional water gap between
const GOOD = { tempOffset: 0, moistureOffset: 0, light: 70, ph: 6.8, salinity: 0, toxicity: 0, radiation: 8, nutrients: 60 };
function labPlanet({ testTempOffset = 0, gap = 0, third = false } = {}) {
  const H = 12, hw = 12, tw = 12, W = hw + gap + tw + (third ? tw : 0), tilemap = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) tilemap.push(x < hw ? 0 : x < hw + gap ? -1 : x < hw + gap + tw ? 1 : 2);
  const sections = [{ id: "home", name: "Home", isOrigin: true, area: 0, local: GOOD }, { id: "test", name: "Test", area: 0, local: { ...GOOD, tempOffset: testTempOffset } }];
  if (third) sections.push({ id: "far", name: "Far", area: 0, local: GOOD });
  return { id: "lab", name: "Lab", gridWidth: W, gridHeight: H, origin: "home", globalClimate: { temperature: 10, moisture: 50 }, tilemap, sections };
}
// temperature offset that gives the Test section fitness f (< 1) under the lab sky: band ceiling + soft × (1 − f)
const offFor = f => config.genomeBase.tempCeil + config.categories.Temperature.soft * (1 - f) - 10;
// fill a section with Living stands of density d (no Barren tiles left there → its own spread draws no randomness)
function fill(sim, i, d = EST.seedlingDensity) { for (const t of sim.map.SEC_TILES[i]) { sim.state[t] = sim.LIV; sim.dens[t] = d; } }
function labRun({ fit, mode, spec, seed = 7, ticks = 400, cfg = config, fillHome = true, d0 }) {
  const sim = BLOOM.createSim(labPlanet({ testTempOffset: offFor(fit) }), cfg, traits, { rng: mb(seed) }), T = sim.map.SIDX.test;
  if (fillHome) fill(sim, 0, 1); fill(sim, T, d0);
  if (mode) sim.setColonyFocus(T, mode);
  if (spec) { sim.biomass = 1e6; sim.buySpecialization(T, spec); sim.biomass = 0; }
  sim.map.SEC.forEach((_, i) => { sim.vigor[i] = sim.evaluate(i).fitness; }); // a colony already living under these conditions
  const start = { est: sim.establishment(T), living: sim.livingCountBySection()[T] };
  for (let t = 0; t < ticks; t++) sim.tick();
  return { sim, T, start, est: sim.establishment(T), living: sim.livingCountBySection()[T], fitness: sim.evaluate(T).fitness, lamp: sim.lampOf(sim.evaluate(T).fitness) };
}
// economy lab: Home dense, Test filled at stand density d (no Barren ground anywhere → spread and die-back cannot differ,
// so any Biomass difference is the economy). own = what the Test colony itself earned (its tiles' yield, config.econ).
function econRun({ d, mode = null, spec = null, ticks = 300 }) {
  const x = BLOOM.createSim(labPlanet(), config, traits, { rng: mb(5) }); fill(x, 0, 1); fill(x, 1, d); x.map.SEC.forEach((_, i) => { x.vigor[i] = x.evaluate(i).fitness; });
  if (mode) x.setColonyFocus(1, mode); if (spec) { x.biomass = 1e6; x.buySpecialization(1, spec); } x.biomass = 0;
  const E = config.econ; let own = 0;
  for (let t = 0; t < ticks; t++) { x.tick(); let y = 0; for (const k of x.map.SEC_TILES[1]) if (x.state[k] === x.LIV) y += E.youngYield + (1 - E.youngYield) * x.dens[k]; own += y * (x.secFit[1] > E.thrivingAbove ? E.thriving : E.marginal); }
  return { gain: x.biomass, own, h: hashState(x) };
}
const bot = (planet, plan, sd, { policy = null, invest = null } = {}) => STUDY.run(planet, plan, sd, policy || "balanced", invest || "none");
const PLANS = { wet: ["seedOut", "cold", "flood", "cold", "heat", "salt", "earlyMat", "seedOut"], dry: ["seedOut", "cold", "drought", "cold", "heat", "salt", "earlyMat", "seedOut"],
  terraformWater: ["seedOut", "heat", "salt", "cold", "humid", "humid"] };

(async () => {
  const t0 = Date.now();
  console.log("# A · engine: per-region allocation, local specializations, density (deterministic, production engine)");
  // ---------------------------------------------------------------- [1–7] persistent per-region allocation
  {
    const s = BLOOM.createSim(FB, config, traits, { rng: mb(1) }), I = s.map.SIDX, O = s.map.ORIGIN;
    check(s.map.SEC.every((_, i) => s.getColonyFocus(i) === "balanced" && s.getSpecialization(i) === null) && JSON.stringify(s.COLONY_MODES) === '["balanced","roots","leaves","seeds"]',
      "data model: every land region starts Balanced with no specialization; modes = Balanced / Roots / Leaves / Seeds",
      `sim.colonies = { focus: [${s.colonies.focus.length} × "balanced"], spec: [${s.colonies.spec.length} × null] }`);
    check(typeof s.setFocus === "undefined" && typeof s.clearFocus === "undefined" && s.focus === undefined && config.focus === undefined,
      "the BLOOM-008 single global focus is removed (no sim.setFocus / clearFocus / sim.focus, no config.focus): one model only");
    const refused = !s.setColonyFocus(I.fern_shade, "seeds") && !s.setColonyFocus(O, "fertilizer") && !s.setColonyFocus(99, "roots");
    for (let t = 0; t < 1400 && (s.livingCountBySection()[I.fern_shade] === 0 || s.livingCountBySection()[I.cool_glen] === 0); t++) s.tick();
    const a = s.setColonyFocus(O, "roots"), b = s.setColonyFocus(I.fern_shade, "seeds");
    check(refused && a && b && s.getColonyFocus(O) === "roots" && s.getColonyFocus(I.fern_shade) === "seeds",
      "[1] Region A set to Roots stays Roots after Region B is set to Seeds (an empty region / unknown mode / bad index is refused)",
      `A = Meadow Hollow: ${s.getColonyFocus(O)} · B = Fern Shade: ${s.getColonyFocus(I.fern_shade)}`);
    s.setColonyFocus(I.cool_glen, "leaves");
    const three = [O, I.fern_shade, I.cool_glen].map(i => s.getColonyFocus(i));
    check(new Set(three).size === 3 && s.colonies.focus.filter(m => m !== "balanced").length === 3,
      "[2] several regions hold different allocations at the same time", `Meadow Hollow ${three[0]} · Fern Shade ${three[1]} · Cool Glen ${three[2]} · the other ${s.map.SC - 3} Balanced`);
    const before = [...s.colonies.focus]; s.setColonyFocus(O, "leaves");
    check(s.colonies.focus.every((m, i) => i === O ? m === "leaves" : m === before[i]), "[4] changing Region A later changes only Region A", `Meadow Hollow roots → ${s.getColonyFocus(O)}; every other region unchanged`);
    const snap = JSON.stringify(s.colonies); for (let t = 0; t < 1500; t++) s.tick();
    check(JSON.stringify(s.colonies) === snap, "[6] allocations survive ordinary simulation ticks (1500 more ticks, bit-identical colony state)", snap);
    s.setColonyFocus(O, "balanced");
    check(s.getColonyFocus(O) === "balanced" && s.colonyMods(O).yieldBonus === 0 && Object.values(s.colonyMods(O)).every(v => v === 0),
      "Balanced can be chosen again and carries no modifier at all (the baseline)");
  }
  // [7] die-back, total loss, recolonization — the choice belongs to the REGION
  {
    const s = BLOOM.createSim(labPlanet(), config, traits, { rng: mb(12) }), T = 1;
    fill(s, 0, 1); fill(s, T, 0.6); s.map.SEC.forEach((_, i) => { s.vigor[i] = s.evaluate(i).fitness; });
    s.setColonyFocus(T, "seeds"); s.biomass = 1e6; s.buySpecialization(T, "seedReserve");
    s.sky.temp = 10 + offFor(0.3); // Test drops below the die threshold (but Home, the origin, is a protected refuge)
    let partial = null, lost = null;
    for (let t = 1; t <= 6000 && lost === null; t++) { s.tick(); const n = s.livingCountBySection()[T];
      if (partial === null && n > 0 && n < s.map.AREA[T] * 0.8) partial = { t, n, f: s.getColonyFocus(T), sp: s.getSpecialization(T) };
      if (n === 0) lost = t; }
    const s2 = BLOOM.createSim(labPlanet(), config, traits, { rng: mb(12) }); // a second test: push to total loss with red ground
    fill(s2, 0, 1); fill(s2, T, 0.6); s2.setColonyFocus(T, "roots"); s2.biomass = 1e6; s2.buySpecialization(T, "rootNetwork");
    s2.sky.temp = 60; let gone = null; for (let t = 1; t <= 8000 && gone === null; t++) { s2.tick(); if (s2.livingCountBySection()[T] === 0) gone = t; }
    const keptWhileEmpty = s2.getColonyFocus(T) === "roots" && s2.getSpecialization(T) === "rootNetwork", refusedEmpty = !s2.setColonyFocus(T, "leaves") && s2.specBlock(T, "leafCanopy") === "noColony";
    s2.sky.temp = 10; let back = null; for (let t = 1; t <= 8000 && back === null; t++) { s2.tick(); if (s2.livingCountBySection()[T] > 0) back = t; }
    const m = s2.colonyMods(T);
    check(partial && partial.f === "seeds" && partial.sp === "seedReserve",
      "[7] an allocation + specialization survive die-back while the colony still exists", partial ? `${partial.n}/${s.map.AREA[T]} tiles left after ${(partial.t / TPS).toFixed(0)} s: still ${partial.f} + ${partial.sp}` : "no partial die-back seen");
    check(gone && keptWhileEmpty && refusedEmpty && back && s2.getColonyFocus(T) === "roots" && s2.getSpecialization(T) === "rootNetwork" && m.establishBonus > 0,
      "[7] total loss: the region KEEPS its allocation and specialization (dormant — nothing lives there; it cannot be changed or upgraded while empty); when recolonized they apply again",
      `Test lost every plant at ${(gone / TPS).toFixed(0)} s (red ground), stayed roots + rootNetwork while empty, recolonized ${(back / TPS).toFixed(0)} s after the sky was restored → active again (establishBonus ${m.establishBonus})`);
  }

  // ---------------------------------------------------------------- [8] Roots: situational, environmentally bounded
  {
    const fitV = 0.62, a = labRun({ fit: fitV, ticks: 200 }), b = labRun({ fit: fitV, mode: "roots", ticks: 200 });
    check(a.lamp === "yellow" && a.fitness > G.growThresh && b.est > a.est * 1.3 && b.living === a.living,
      "Roots speeds establishment of a young, marginal-but-viable colony (yellow ground)", `fitness ${a.fitness.toFixed(2)}; establishment after ${200 / TPS} s: Balanced ${pct(a.est)} → Roots ${pct(b.est)}`);
    const fitM = 0.45, c = labRun({ fit: fitM }), d = labRun({ fit: fitM, mode: "roots" });
    check(Math.abs(c.est - c.start.est) < 1e-6 && d.est > c.est + 0.05 && d.living === c.living && c.fitness < G.growThresh && c.fitness > G.dieThresh,
      "…in the marginal band (between die and grow thresholds) stands only hold at Balanced; with Roots they keep thickening", `fitness ${c.fitness.toFixed(2)}; establishment Balanced ${pct(c.est)} (unchanged) vs Roots ${pct(d.est)}`);
    const fitS = 0.32, seeds = [1, 2, 3, 4, 5, 6], ctl = seeds.map(sd => labRun({ fit: fitS, seed: sd, ticks: 600, d0: 0.5 })), rts = seeds.map(sd => labRun({ fit: fitS, mode: "roots", seed: sd, ticks: 600, d0: 0.5 }));
    check(ctl[0].lamp === "yellow" && mean(rts.map(r => r.living)) > mean(ctl.map(r => r.living)) * 1.15 && rts.filter((r, k) => r.living > ctl[k].living).length >= 5,
      "…and under stress (yellow ground below the die threshold) Roots cuts die-back: more of the colony survives",
      `fitness ${ctl[0].fitness.toFixed(2)}; survivors of ${ctl[0].start.living} after ${600 / TPS} s: Balanced ${mean(ctl.map(r => r.living)).toFixed(1)} vs Roots ${mean(rts.map(r => r.living)).toFixed(1)}`);
    const fitR = 0.05, e = seeds.map(sd => labRun({ fit: fitR, seed: sd, ticks: 900, d0: 0.5 })), f = seeds.map(sd => labRun({ fit: fitR, mode: "roots", seed: sd, ticks: 900, d0: 0.5 })),
      f2 = seeds.map(sd => labRun({ fit: fitR, mode: "roots", spec: "rootNetwork", seed: sd, ticks: 900, d0: 0.5 }));
    check(e[0].lamp === "red" && e.every((r, k) => hashState(r.sim) === hashState(f[k].sim) && hashState(r.sim) === hashState(f2[k].sim) && r.est === f[k].est && r.est === f2[k].est) && mean(f2.map(r => r.living)) < 0.25 * f[0].start.living,
      "[8] Roots — even with a Root Network — does NOT rescue red, blocked ground: die-back, thinning and recovery are bit-identical to Balanced; the colony still collapses",
      `fitness ${e[0].fitness.toFixed(2)} (${e[0].lamp}); survivors after ${900 / TPS} s: Balanced ${mean(e.map(r => r.living)).toFixed(1)} = Roots ${mean(f.map(r => r.living)).toFixed(1)} = Roots + Root Network ${mean(f2.map(r => r.living)).toFixed(1)} of ${f[0].start.living}`);
    const g = ["roots", "leaves", "seeds"].map(m => { const s = BLOOM.createSim(labPlanet({ testTempOffset: offFor(0.45) }), config, traits, { rng: mb(3) });
      fill(s, 0, 1); s.setColonyFocus(0, m); s.biomass = 1e6; s.buySpecialization(0, { roots: "rootNetwork", leaves: "leafCanopy", seeds: "seedReserve" }[m]); for (let t = 0; t < 1500; t++) s.tick(); return s.livingCountBySection()[1]; });
    check(g.every(n => n === 0), "[8/10] no allocation or specialization lets plants spread into ground below the grow threshold (1500 ticks next to a dense, invested colony)", `Test living: ${g.join(" / ")}`);
    // Roots' cost: on a thriving, already dense colony it only costs Biomass
    const dense = mode => { const s = BLOOM.createSim(labPlanet(), config, traits, { rng: mb(4) }); fill(s, 0, 1); fill(s, 1, 1); if (mode) s.setColonyFocus(1, mode); for (let t = 0; t < 300; t++) s.tick(); return s.biomass; };
    check(dense("roots") < dense(null), "Roots has a cost: on a thriving colony that is already dense it only lowers that colony's Biomass (sugar goes below ground)", `300 ticks: Balanced ${dense(null).toFixed(1)} vs Roots ${dense("roots").toFixed(1)} Biomass`);
  }

  // ---------------------------------------------------------------- [9] Leaves: economy, not fitness; scales with establishment
  {
    const s = BLOOM.createSim(FB, config, traits, { rng: mb(2) }), snap = () => JSON.stringify([s.derived(), s.map.SEC.map((_, i) => s.evaluate(i)), traits.map(t => s.previewOf(t.id))]);
    const base = snap(), per = s.COLONY_MODES.map(m => { s.setColonyFocus(s.map.ORIGIN, m); return snap(); });
    check(per.every(x => x === base), "[9] no allocation changes environmental fitness, tolerance, category word, limiting factor or purchase preview", `${s.map.SC} sections × ${s.COLONY_MODES.length} modes compared`);
    // a colony with no Barren ground anywhere: spread and die-back cannot differ, so any Biomass difference is the economy
    const dB = econRun({ d: 1 }), dL = econRun({ d: 1, mode: "leaves" }), yB = econRun({ d: EST.seedlingDensity, ticks: 12 }), yL = econRun({ d: EST.seedlingDensity, ticks: 12, mode: "leaves" });
    const denseGain = (dL.gain - dB.gain) / dB.own, youngGain = (yL.gain - yB.gain) / yB.own;
    check(dB.h === dL.h && yB.h === yL.h && denseGain > 0.4 && youngGain < denseGain / 4,
      "[9] Leaves raises that colony's own Biomass with identical plant cover, and the bonus scales with establishment: large on a dense stand, tiny on fresh seedlings",
      `extra Biomass as a share of the Test colony's own yield: dense stand +${pct(denseGain)} · seedling stand (first ${12 / TPS} s) +${pct(youngGain)} (config.colony.yieldRampTo ${COL.yieldRampTo})`);
    const out = mode => { const x = BLOOM.createSim(labPlanet(), config, traits, { rng: mb(8) }); fill(x, 0, 0.6); x.map.SEC.forEach((_, i) => { x.vigor[i] = x.evaluate(i).fitness; });
      if (mode) x.setColonyFocus(0, mode); for (let t = 0; t < 40; t++) x.tick(); return x.livingCountBySection()[1]; };
    check(out("leaves") < out(null), "Leaves has a cost: fewer seeds, so the colony spreads more slowly into open ground", `Test tiles colonized in ${40 / TPS} s: Balanced ${out(null)} vs Leaves ${out("leaves")}`);
  }

  // ---------------------------------------------------------------- [10] Seeds: source pressure, not destination fitness
  {
    const outbound = (mode, sd, spec) => { const s = BLOOM.createSim(labPlanet(), config, traits, { rng: mb(sd) }); fill(s, 0, 0.6);
      s.map.SEC.forEach((_, i) => { s.vigor[i] = s.evaluate(i).fitness; }); if (mode) s.setColonyFocus(0, mode); if (spec) { s.biomass = 1e6; s.buySpecialization(0, spec); }
      const f0 = s.evaluate(1).fitness; for (let t = 0; t < 15; t++) s.tick(); return { n: s.livingCountBySection()[1], same: s.evaluate(1).fitness === f0 }; };
    const seeds = Array.from({ length: 12 }, (_, k) => k + 1), c = seeds.map(sd => outbound(null, sd)), x = seeds.map(sd => outbound("seeds", sd));
    check(mean(x.map(r => r.n)) > mean(c.map(r => r.n)) * 1.3 && x.filter((v, k) => v.n > c[k].n).length >= 9 && x.every(r => r.same),
      "[10] Seeds increases outbound colonization from its colony; the destination's fitness is untouched",
      `Test tiles colonized from Home in ${15 / TPS} s: Balanced ${mean(c.map(r => r.n)).toFixed(1)} → Seeds ${mean(x.map(r => r.n)).toFixed(1)} (${x.filter((v, k) => v.n > c[k].n).length}/${seeds.length} seeds higher)`);
    const cross = (mode, sd, { testTempOffset = 0, ticks = 3000, spec = null } = {}) => { const s = BLOOM.createSim(labPlanet({ gap: 3, testTempOffset }), config, traits, { rng: mb(sd) });
      fill(s, 0, 0.6); s.biomass = 1e9; s.buy(CROSS_ID); if (spec) s.buySpecialization(0, spec); s.biomass = 0; if (mode) s.setColonyFocus(0, mode);
      let first = null; for (let t = 1; t <= ticks && (first === null || testTempOffset); t++) { s.tick(); if (first === null && s.crossing.footholds > 0) first = t; }
      return { first: first ?? ticks, sim: s }; };
    const sds = [1, 2, 3, 4, 5, 6, 7, 8], cc = sds.map(sd => cross(null, sd).first), xx = sds.map(sd => cross("seeds", sd).first), rr = sds.map(sd => cross(null, sd, { spec: "seedReserve" }).first);
    check(mean(xx) < mean(cc) * 0.85 && xx.filter((v, k) => v <= cc[k]).length >= 6,
      "[10] Seeds strengthens Waterborne source pressure: the first foothold across a 3-tile strait arrives sooner", `first foothold: Balanced ${(mean(cc) / TPS).toFixed(1)} s → Seeds ${(mean(xx) / TPS).toFixed(1)} s (mean of ${sds.length} seeds)`);
    check(mean(rr) < mean(cc) * 0.8 && rr.filter((v, k) => v <= cc[k]).length >= 6,
      "[18] Seed Reserve (bought for the coastal source colony, allocation left Balanced) makes Waterborne footholds arrive sooner", `first foothold: ${(mean(cc) / TPS).toFixed(1)} s → Seed Reserve ${(mean(rr) / TPS).toFixed(1)} s`);
    const hostile = [1, 2, 3].map(sd => cross("seeds", sd, { testTempOffset: 40, ticks: 4000, spec: "seedReserve" }).sim), ev = hostile[0].evaluate(1);
    const evs = hostile.flatMap(s => s.crossing.events);
    check(hostile.every(s => s.crossing.arrivals > 0 && s.crossing.seedArrivals > 0 && s.crossing.footholds === 0 && s.livingCountBySection()[1] === 0) && evs.length > 0 && evs.every(e => !e.took) && ev.limitKey === "Temperature",
      "[10/18/32] Seeds + Seed Reserve + Waterborne Seeds cannot establish on a hostile island: seed ARRIVAL events happen, no FOOTHOLD event ever does",
      `${hostile.map(s => s.crossing.seedArrivals).join(" / ")} arrival events, 0 footholds; island limit: ${ev.cats.Temperature.word}`);
    // events are real: each one names a Living coastal source tile on another landmass within range and a landing tile
    const s = cross(null, 4, { ticks: 1200 }).sim, M = s.map, pairs = new Set(BLOOM.geo.waterCrossings(M.TILEMAP, M.W, M.H, config.crossing.maxGap).pairs.map(([a, b]) => a + ">" + b));
    const E = s.crossing.events, took = E.filter(e => e.took);
    check(E.length > 0 && E.every(e => pairs.has(e.from + ">" + e.to) && M.LANDMASS[M.TILEMAP[e.from]] !== M.LANDMASS[M.TILEMAP[e.to]] && e.gap >= 1 && e.gap <= config.crossing.maxGap) && took.length === Math.min(s.crossing.footholds, E.length) && took.every(e => s.state[e.to] !== s.BAR),
      "[30/31] every crossing event is a real engine source → landing pair (geography crossing, different landmasses, gap ≤ maxGap); each foothold event is exactly one real new foothold",
      `${E.length} events (${took.length} footholds = sim.crossing.footholds ${s.crossing.footholds}, ${E.length - took.length} arrivals) · gaps ${[...new Set(E.map(e => e.gap))].join(",")}`);
    const quiet = BLOOM.createSim(labPlanet({ gap: 3 }), config, traits, { rng: mb(4) }); fill(quiet, 0, 0.6); for (let t = 0; t < 1500; t++) quiet.tick();
    check(quiet.crossing.events.length === 0 && quiet.crossing.seedArrivals === 0, "[30] without Waterborne Seeds there is no crossing event at all (nothing for the map to animate)", "1500 ticks next to a 3-tile strait");
  }

  // ---------------------------------------------------------------- [12–20] local specializations
  {
    const s = BLOOM.createSim(FB, config, traits, { rng: mb(31) }), O = s.map.ORIGIN, I = s.map.SIDX;
    const price0 = s.specPrice(), want = Math.round((COL.specCost.base) * config.econ.costScale);
    s.biomass = price0 - 1; const blocked = s.specBlock(O, "leafCanopy"), noBuy = !s.buySpecialization(O, "leafCanopy"), untouched = s.biomass === price0 - 1 && s.getSpecialization(O) === null;
    check(price0 === want && blocked === "biomass" && noBuy && untouched,
      "[13] insufficient Biomass blocks a local purchase (no state change)", `price ${price0} = (${COL.specCost.base} + ${COL.specCost.step} × 0 bought) × costScale ${config.econ.costScale}; with ${price0 - 1} Biomass → refused, Biomass unchanged`);
    s.biomass = 500; const ok = s.buySpecialization(O, "leafCanopy");
    check(ok && s.biomass === 500 - price0 && s.spent.local === price0 && s.spent.global === 0 && s.getSpecialization(O) === "leafCanopy",
      "[12] a local specialization spends real, ordinary Biomass (the same sim.biomass the shop uses)", `500 → ${s.biomass} Biomass; sim.spent.local ${s.spent.local}`);
    const second = !s.buySpecialization(O, "rootNetwork") && s.specBlock(O, "seedReserve") === "hasOne" && s.getSpecialization(O) === "leafCanopy";
    check(second, "[15] at most one specialization per region: a second (of any kind) is refused", `Meadow Hollow keeps ${s.getSpecialization(O)}`);
    const others = s.map.SEC.map((_, i) => i).filter(i => i !== O);
    check(others.every(i => s.getSpecialization(i) === null && Object.values(s.colonyMods(i)).every(v => v === 0)) && s.colonyMods(O).yieldBonus > 0,
      "[14] a specialization belongs to the one region it was bought for: every other region's modifiers stay zero", `origin yieldBonus ${s.colonyMods(O).yieldBonus}; ${others.length} other regions 0`);
    s.setColonyFocus(O, "seeds");
    check(s.getSpecialization(O) === "leafCanopy" && s.spent.local === price0, "changing that colony's allocation afterwards keeps its specialization (no removal, no refund)", `now Seeds + Leaf Canopy`);
    const p1 = s.specPrice();
    check(p1 === Math.round((COL.specCost.base + COL.specCost.step) * config.econ.costScale), "each specialization bought makes the next one cost more (a bounded local sink)", `next price ${p1}`);
    s.setColonyFocus(O, "leaves"); const syn = s.colonyMods(O).yieldBonus, exp = Math.min(COL.caps.yieldBonus, COL.modes.leaves.yieldBonus + COL.specializations.leafCanopy.effect.yieldBonus * (1 + COL.synergy));
    check(Math.abs(syn - exp) < 1e-12 && syn <= COL.caps.yieldBonus, "matching allocation + specialization combine with a bounded, data-driven synergy (capped)",
      `Leaves ${COL.modes.leaves.yieldBonus} + Leaf Canopy ${COL.specializations.leafCanopy.effect.yieldBonus} × (1 + ${COL.synergy}) = ${syn.toFixed(3)} (cap ${COL.caps.yieldBonus})`);
    // [19] none changes the four-category environmental tolerance
    const t = BLOOM.createSim(FB, config, traits, { rng: mb(2) }), env = () => JSON.stringify([t.derived(), t.map.SEC.map((_, i) => t.evaluate(i))]); const e0 = env();
    t.biomass = 1e6; for (let t2 = 0; t2 < 1400 && t.livingCountBySection()[t.map.SIDX.fern_shade] === 0; t2++) t.tick();
    t.buySpecialization(t.map.ORIGIN, "rootNetwork"); t.buySpecialization(t.map.SIDX.fern_shade, "seedReserve"); const alive = t.map.SEC.map((_, i) => i).find(i => i !== t.map.ORIGIN && i !== t.map.SIDX.fern_shade && t.livingCountBySection()[i] > 0);
    if (alive !== undefined) t.buySpecialization(alive, "leafCanopy");
    check(env() === e0 && t.colonies.spec.filter(Boolean).length >= 2, "[19] no specialization changes the plant's tolerances or any region's Temperature / Water / Soil / Hazard evaluation",
      `after buying ${t.colonies.spec.filter(Boolean).join(", ")}: derived() + every evaluate() bit-identical`);
    // [20] global shop still works, prices are unaffected by local purchases
    const g = BLOOM.createSim(FB, config, traits, { rng: mb(3) }), gp = traits.map(tr => g.price(tr)); g.biomass = 1000; g.buySpecialization(g.map.ORIGIN, "leafCanopy");
    const bought = g.buy("seedOut") && g.buy("cold") && g.buy("salt");
    check(bought && traits.every((tr, k) => tr.id === "seedOut" || tr.id === "cold" || tr.id === "salt" || g.price(tr) === gp[k]) && g.genome.seedOut === 1 && g.genome.salt === 1 && g.spent.global === gp[traits.findIndex(x => x.id === "seedOut")] + gp[traits.findIndex(x => x.id === "cold")] + gp[traits.findIndex(x => x.id === "salt")],
      "[20] the global shop keeps working after local investment; local purchases never change global prices", `bought Seed Output, Cold, Salt after a Leaf Canopy; spent global ${g.spent.global} / local ${g.spent.local}`);
  }
  // [16] Root Network  [17] Leaf Canopy
  {
    const fit = 0.62, bal = labRun({ fit, ticks: 150 }), rts = labRun({ fit, mode: "roots", ticks: 150 }), net = labRun({ fit, spec: "rootNetwork", ticks: 150 }), both = labRun({ fit, mode: "roots", spec: "rootNetwork", ticks: 150 });
    check(net.est > rts.est && rts.est > bal.est && both.est >= net.est && net.living === bal.living,
      "[16] Root Network establishes a colony more strongly than the free Roots allocation (and stacks, capped, with it)",
      `establishment after ${150 / TPS} s on yellow ground: Balanced ${pct(bal.est)} · Roots ${pct(rts.est)} · Root Network ${pct(net.est)} · both ${pct(both.est)}`);
    // recovery: after a die-back, dead ground clears (and regrows) faster in a colony with a Root Network
    const rec = spec => { const R = [1, 2, 3, 4, 5, 6].map(sd => { const s = BLOOM.createSim(labPlanet(), config, traits, { rng: mb(sd) }); fill(s, 0, 1); fill(s, 1, 0.6);
      if (spec) { s.biomass = 1e6; s.buySpecialization(1, spec); } for (const t of s.map.SEC_TILES[1].filter((_, k) => k % 2)) { s.state[t] = s.DEAD; s.dens[t] = 0; }
      for (let t = 0; t < 60; t++) s.tick(); return { liv: s.livingCountBySection()[1], dead: s.map.SEC_TILES[1].filter(t => s.state[t] === s.DEAD).length }; });
      return { liv: mean(R.map(r => r.liv)), dead: mean(R.map(r => r.dead)) }; };
    const rb = rec(null), rn = rec("rootNetwork");
    check(rn.dead < rb.dead * 0.5 && rn.liv > rb.liv * 1.05, "[16] …and regrows faster after die-back (dead ground clears and is recolonized sooner under a Root Network)",
      `${60 / TPS} s after half the colony died: dead tiles left Balanced ${rb.dead.toFixed(1)} vs Root Network ${rn.dead.toFixed(1)} · living ${rb.liv.toFixed(1)} vs ${rn.liv.toFixed(1)}`);
    const cB = econRun({ d: 1 }), cL = econRun({ d: 1, spec: "leafCanopy" }), cyB = econRun({ d: EST.seedlingDensity, ticks: 12 }), cyL = econRun({ d: EST.seedlingDensity, ticks: 12, spec: "leafCanopy" });
    const gDense = (cL.gain - cB.gain) / cB.own, gYoung = (cyL.gain - cyB.gain) / cyB.own;
    check(cB.h === cL.h && gDense > 0.4 && gYoung < gDense / 4, "[17] Leaf Canopy raises that colony's Biomass, and pays far more on an established, productive colony than on a newly seeded patch",
      `extra Biomass as a share of the colony's own yield: dense colony +${pct(gDense)} · seedling colony (first ${12 / TPS} s) +${pct(gYoung)}`);
  }

  // ---------------------------------------------------------------- [24–27] density range
  {
    const s = BLOOM.createSim(FB, config, traits, { rng: mb(4) }), O = s.map.ORIGIN, fern = s.map.SIDX.fern_shade, words = [], firstSeen = {};
    const startD = [...s.map.SEC_TILES[O]].filter(t => s.state[t] === s.LIV).map(t => s.dens[t]);
    let fernAt = null, fernD = null, full = null, maxD = 0;
    for (let t = 1; t <= 3000; t++) { s.tick(); const w = s.colonyStatus(O).word; if (words[words.length - 1] !== w) { words.push(w); firstSeen[w] = +(t / TPS).toFixed(1); }
      if (fernAt === null && s.livingCountBySection()[fern] > 0) { fernAt = t; fernD = s.map.SEC_TILES[fern].filter(k => s.state[k] === s.LIV).map(k => s.dens[k]); }
      if (full === null && s.livingCountBySection()[O] === s.map.AREA[O]) full = { t, est: s.establishment(O) }; }
    for (const t of s.map.SEC_TILES[O]) maxD = Math.max(maxD, s.dens[t]);
    check(EST.seedlingDensity <= 0.08 && EST.seedlingDensity < BLOOM008_SEEDLING / 2 && startD.every(d => d === Math.fround(EST.seedlingDensity)) && fernD.every(d => d === Math.fround(EST.seedlingDensity)),
      "[24] a new Living tile starts as a tiny seedling stand, well under BLOOM-008's", `seedlingDensity ${BLOOM008_SEEDLING} → ${EST.seedlingDensity} (origin at t = 0 and Fern Shade's first tiles at ${(fernAt / TPS).toFixed(0)} s)`);
    check(words.join(">") === "sparse>establishing>established>dense" && maxD > 0.95 && s.colonyStatus(O).establishment > 0.95,
      "[25] density still reaches a mature, full stand: Sparse → Establishing → Established → Dense", `origin: ${Object.entries(firstSeen).map(([w, t]) => `${w} @ ${t} s`).join(", ")}; max stand density ${maxD.toFixed(3)}`);
    check(full && full.est < 0.75 && s.establishment(O) > full.est + 0.2, "[27] once every origin tile is Living the colony keeps thickening for a long time (tile-full ≠ mature)",
      `all tiles Living at ${(full.t / TPS).toFixed(0)} s at ${pct(full.est)} establishment → ${pct(s.establishment(O))} later`);
  }

  // ---------------------------------------------------------------- [5 / 11 / 21 / 22] strategies on First Bloom
  {
    const sds = [5, 6, 7, 8], rows = {};
    for (const [n, plan] of Object.entries(PLANS)) rows[n] = sds.map(sd => bot(FB, plan, sd));
    check(Object.values(rows).every(R => R.every(r => r.win !== null && r.clicks === 0 && r.spent.local === 0)),
      "[5/22] ignoring allocation and local investment entirely is legal: every broad First Bloom build wins with every region Balanced and nothing bought locally",
      Object.entries(rows).map(([n, R]) => `${n} ${Math.round(mean(R.map(r => r.win)))} s`).join(" · "));
    const sit = sds.map(sd => bot(FB, PLANS.wet, sd, { policy: "situational" })), bad = sds.map(sd => bot(FB, PLANS.wet, sd, { policy: "misplaced" })), bal = rows.wet;
    check(mean(sit.map(r => r.win)) < mean(bal.map(r => r.win)) * 0.95 && mean(bad.map(r => r.win)) > mean(bal.map(r => r.win)) * 1.05 && sit.every((r, k) => r.win < bad[k].win),
      "[11] a sensible multi-colony allocation (young/stressed → Roots, open frontier → Seeds, filled-in → Leaves) beats a badly placed one; Balanced sits between and still wins",
      `wet build, 4 RNG seeds: situational ${Math.round(mean(sit.map(r => r.win)))} s (${Math.round(mean(sit.map(r => r.clicks)))} focus changes) · Balanced ${Math.round(mean(bal.map(r => r.win)))} s · misplaced ${Math.round(mean(bad.map(r => r.win)))} s`);
    const lv = sds.map(sd => bot(FB, PLANS.wet, sd, { policy: "leavesEverywhere" }));
    check(mean(lv.map(r => r.win)) > mean(sit.map(r => r.win)) * 1.08 && mean(lv.map(r => r.firstBuy)) >= mean(bal.map(r => r.firstBuy)),
      "Leaves is not the automatic answer: Leaves on every colony loses to situational play by a clear margin and does not bring the first purchase forward",
      `Leaves everywhere ${Math.round(mean(lv.map(r => r.win)))} s (first buy ${mean(lv.map(r => r.firstBuy)).toFixed(0)} s) vs situational ${Math.round(mean(sit.map(r => r.win)))} s · Balanced first buy ${mean(bal.map(r => r.firstBuy)).toFixed(0)} s`);
    const over = sds.map(sd => bot(FB, PLANS.wet, sd, { policy: "situational", invest: "everywhere" })), early = sds.map(sd => bot(FB, PLANS.wet, sd, { invest: "rootNetworkOrigin" }));
    check([...over, ...early].every(r => r.win !== null && r.spent.global >= 1000) && mean(over.map(r => r.spent.local)) > 500,
      "[21] local investment never soft-locks the global game: even a bot that buys a specialization for every colony (or spends its opening Biomass on one) still buys its whole global recipe and wins",
      `over-investor: ${Math.round(mean(over.map(r => r.spent.local)))} local / ${Math.round(mean(over.map(r => r.spent.global)))} global Biomass, win ${Math.round(mean(over.map(r => r.win)))} s · opening Root Network: win ${Math.round(mean(early.map(r => r.win)))} s`);
  }
  // ---------------------------------------------------------------- [23 / 33–36] procedural worlds + validator
  for (const seed of [13, 8]) {
    const p = BLOOM.generateFromArchetype(OA, seed, { config, traits }), A = p.archetype, pol = { minStrategies: OA.validation.minStrategies, pacing: OA.validation.pacing };
    const v = BLOOM.validatePlanet(p, config, { traits, regenerate: BLOOM.generatePlanet, winnability: true, strategies: pol });
    const plan = A.strategies.list[0].purchases.map(x => x[0]), sds = [5, 6, 7, 8], w0 = sds.map(sd => bot(p, plan, sd)), wS = sds.map(sd => bot(p, plan, sd, { policy: "situational" }));
    const fmt = ws => `${Math.round(mean(ws))} s [${Math.round(Math.min(...ws))}–${Math.round(Math.max(...ws))}]`;
    const witnessPure = A.strategies.list.every(x => x.purchases.every(q => traits.some(t => t.id === q[0])));
    check(JSON.stringify(A.validatedLayers) === "[1,2,3,4,5,6,7,8]" && v.ok && witnessPure && [...w0, ...wS].every(r => r.win !== null),
      `[23/${seed === 13 ? 33 : 34}/36] Ocean Archipelago seed ${seed} stays production-valid (layers 1–8 re-validated, witnesses buy only global traits — no local choices) and winnable`,
      `attempt ${A.attempt} · ${p.name} · ${A.strategies.found} strategies · strategy 1 bot: Balanced ${fmt(w0.map(r => r.win))} · situational ${fmt(wS.map(r => r.win))}`);
  }
  {
    let e = null; try { BLOOM.generateFromArchetype(OA, 35, { config, traits }); } catch (x) { e = x; }
    check(e && e.attempts && e.attempts.length === OA.generation.maxAttempts, "[35] seed 35 still fails explicitly (no acceptable world in every attempt)", e ? `${e.attempts.length} attempts rejected` : "generated a world");
  }
  // ---------------------------------------------------------------- config-driven
  {
    const zero = clone(config); for (const m of Object.values(zero.colony.modes)) for (const k in m) m[k] = 0;
    const runFB = (cfg, mode, n = 1500) => { const s = BLOOM.createSim(FB, cfg, traits, { rng: mb(33) }); if (mode) s.setColonyFocus(s.map.ORIGIN, mode); for (let t = 0; t < n; t++) s.tick(); return [hashState(s), s.biomass, Array.from(s.dens).reduce((a, b) => a + b, 0)]; };
    const ctl = JSON.stringify(runFB(config, null)), z = Object.keys(COL.modes).map(m => JSON.stringify(runFB(zero, m)));
    const big = clone(config); big.colony.modes.leaves.yieldBonus = 1; big.colony.caps.yieldBonus = 2;
    const l1 = runFB(config, "leaves")[1], l3 = runFB(big, "leaves")[1];
    check(z.every(x => x === ctl) && l3 > l1, "allocation effects are config data: with every config.colony mode value at 0 each mode is bit-identical to Balanced; raising leaves.yieldBonus raises Biomass",
      `Leaves +${Math.round(COL.modes.leaves.yieldBonus * 100)}% → ${l1.toFixed(0)} Biomass at 240 s; +100% → ${l3.toFixed(0)}`);
  }

  // ================================================================= B · real UI
  console.log("\n# B · UI: per-region controls, badges, local upgrades, density rendering, Biomass HUD, crossing feedback (seeded page RNG)");
  const browser = await chromium.launch();
  const open = async ({ seed = 1, query = "", pause = true } = {}) => {
    const p = await browser.newPage({ viewport: { width: 1400, height: 900 } });
    p.errors = []; p.on("pageerror", e => p.errors.push(e.message)); p.on("console", m => { if (m.type() === "error") p.errors.push(m.text()); });
    await p.addInitScript(sd => { let a = sd; Math.random = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }, seed);
    await p.goto(PAGE + query); await p.waitForTimeout(300);
    if (pause) await p.click("#btnPlay");
    return p;
  };
  const step = (p, n) => p.evaluate(n => { BLOOM_API.advance(n); refreshShop(); renderInspect(); renderHUD(BLOOM_API.coverage()); draw(); }, n);
  const shot = async (p, name, clip) => { if (SHOTS) await p.screenshot({ path: path.join(SHOTS, name), ...(clip ? { clip } : {}) }); };
  const ui = p => p.evaluate(() => ({ btns: [...document.querySelectorAll("#focusBox button.fbtn")].map(b => ({ m: b.dataset.focus, off: b.classList.contains("off"), on: b.getAttribute("aria-pressed") })),
    specs: [...document.querySelectorAll("#focusBox button.sbtn")].map(b => ({ id: b.dataset.spec, off: b.classList.contains("off"), poor: b.classList.contains("poor"), cost: b.querySelector(".scost").innerText })),
    owned: (document.getElementById("specOwned") || {}).innerText || "", colony: (document.getElementById("colony") || {}).innerText || "", sel: selected,
    cols: BLOOM_API.colonies(), fstate: (document.getElementById("fstate") || {}).innerText || "" }));
  // click a region on the map (not if it is already selected: clicking the selected region again deselects it)
  const select = (p, i) => p.evaluate(i => { if (selected === i) return null; const r =cv.getBoundingClientRect(); const t = SEC_TILES[i][(SEC_TILES[i].length / 2) | 0]; return { x: r.left + ((t % W) + .5) * TILE, y: r.top + (((t / W) | 0) + .5) * TILE }; }, i)
    .then(async xy => { if (xy) await p.mouse.click(xy.x, xy.y); });
  const SI = FB.sections.reduce((o, s, k) => (o[s.id] = k, o), {});

  // [1–4, 12–15, 28] real clicks on First Bloom
  {
    const p = await open();
    const u0 = await ui(p);
    check(u0.sel >= 0 && u0.btns.map(b => b.m).join() === "balanced,roots,leaves,seeds" && u0.btns.find(b => b.m === "balanced").on === "true" && u0.specs.length === 3 && u0.specs.every(s => s.poor === (config.econ.startBiomass < COL.specCost.base * config.econ.costScale) && s.off === s.poor && s.cost.startsWith(String(COL.specCost.base * config.econ.costScale))),
      // BLOOM-013: the starting Biomass now covers one local upgrade (the opening decision: specialize the origin now or save
      // for the first global upgrade), so the buttons start affordable; they follow config.econ either way
      `a new run opens on the origin: four focus buttons (Balanced pressed), three local upgrades with their Biomass cost, ${config.econ.startBiomass >= COL.specCost.base * config.econ.costScale ? "affordable from the starting Biomass" : "all shown as unaffordable"}`,
      `buttons ${u0.btns.map(b => b.m).join("/")} · upgrades ${u0.specs.map(s => `${s.id} ${s.cost.replace(/\s+/g, " ")}`).join(" · ")}`);
    check(/^Colony: Sparse/.test(u0.colony), "the inspect panel leads with the colony status + establishment %", u0.colony.split("\n")[0]);
    await shot(p, "ui-opening.png");
    await p.click(`#focusBox button.fbtn[data-focus="roots"]`);
    for (let k = 0; k < 150 && !(await p.evaluate(f => livingCountBySection()[f] > 0 && livingCountBySection()[SIDX.cool_glen] > 0, SI.fern_shade)); k++) await step(p, 10);
    await select(p, SI.fern_shade); await p.click(`#focusBox button.fbtn[data-focus="seeds"]`);
    await select(p, SI.cool_glen); await p.click(`#focusBox button.fbtn[data-focus="leaves"]`);
    await select(p, SI.meadow_hollow); const u1 = await ui(p);
    check(u1.cols.focus[SI.meadow_hollow] === "roots" && u1.cols.focus[SI.fern_shade] === "seeds" && u1.cols.focus[SI.cool_glen] === "leaves" && u1.btns.find(b => b.m === "roots").on === "true" && u1.btns.filter(b => b.on === "true").length === 1,
      "[1/2/3/28] through real map + button clicks: origin Roots, Fern Shade Seeds, Cool Glen Leaves all held at once; selecting other regions cleared nothing; the origin's panel shows its own Roots pressed",
      `focus = ${JSON.stringify(u1.cols.focus)}`);
    await select(p, SI.fern_shade); await p.click(`#focusBox button.fbtn[data-focus="roots"]`); const u2 = await ui(p);
    check(u2.cols.focus[SI.meadow_hollow] === "roots" && u2.cols.focus[SI.fern_shade] === "roots" && u2.cols.focus[SI.cool_glen] === "leaves", "[4] changing Fern Shade later changes only Fern Shade", JSON.stringify(u2.cols.focus));
    await select(p, SI.fern_shade); await p.click(`#focusBox button.fbtn[data-focus="seeds"]`);
    // badges on the map: one per non-Balanced region, in its focus colour
    const badge = await p.evaluate(() => { const c = cv.getContext("2d"), d = window.devicePixelRatio || 1, r = Math.max(7, Math.min(11, TILE * 0.75)), fs = Math.max(8, Math.min(12, TILE));
      const hex = h => [1, 3, 5].map(k => parseInt(h.slice(k, k + 2), 16));
      return SEC.map((_, i) => { const m = sim.getColonyFocus(i); const x = CENT[i].x * TILE, y = CENT[i].y * TILE - fs - r - 1; let hit = 0;
        const want = m === "balanced" ? null : hex(FOCUS_UI[m].color);
        for (let dx = -r; dx <= r; dx += 2) for (let dy = -r; dy <= r; dy += 2) { const px = c.getImageData((x + dx) * d, (y + dy) * d, 1, 1).data; if (want && Math.abs(px[0] - want[0]) + Math.abs(px[1] - want[1]) + Math.abs(px[2] - want[2]) < 24) hit++; }
        return { m, hit }; }); });
    check(badge.filter(b => b.m !== "balanced").every(b => b.hit >= 6) && badge.filter(b => b.m !== "balanced").length === 3,
      "[28] each directed region shows a small focus badge on the map in its focus colour (Balanced regions show none)", badge.filter(b => b.m !== "balanced").map(b => `${b.m} ${b.hit}px`).join(" · "));
    await shot(p, "ui-badges.png");
    // local upgrade: insufficient → refused; then real purchase spends real Biomass
    await select(p, SI.meadow_hollow);
    const b0 = await p.evaluate(() => { sim.biomass = sim.specPrice() - 5; return sim.biomass; }); await p.waitForTimeout(80);
    const need = await p.evaluate(() => document.querySelector('#focusBox button.sbtn[data-spec="leafCanopy"] .need').innerText);
    await p.click(`#focusBox button.sbtn[data-spec="leafCanopy"]`, { force: true }); // aria-disabled, but a player can still click it (and is told why)
    const r1 = await p.evaluate(() => ({ spec: sim.getSpecialization(ORIGIN), bio: sim.biomass, log: document.getElementById("log").textContent }));
    check(r1.spec === null && r1.bio === b0 && /need 5 more/.test(need) && /5 more needed/.test(r1.log), "[13] UI: an unaffordable local upgrade says how much Biomass is missing, and clicking it changes nothing", `button: "${need}" · log: ${r1.log}`);
    const price = await p.evaluate(() => { sim.biomass = 400; return sim.specPrice(); }); await p.waitForTimeout(80);
    await p.click(`#focusBox button.sbtn[data-spec="leafCanopy"]`); await p.waitForTimeout(80);
    const r2 = await ui(p), bio2 = await p.evaluate(() => sim.biomass), hud = await p.evaluate(() => document.getElementById("hBio").textContent);
    check(r2.cols.spec[SI.meadow_hollow] === "leafCanopy" && bio2 === 400 - price && hud === String(Math.floor(bio2)) && /Leaf Canopy/.test(r2.owned) && r2.specs.length === 0,
      "[12/15] UI: buying Leaf Canopy for the origin spends real Biomass (HUD follows) and the panel then shows it as built — no second upgrade offered there",
      `400 → ${bio2} (price ${price}) · panel: ${r2.owned.split("\n")[0]}`);
    await shot(p, "ui-local-upgrade.png");
    await select(p, SI.fern_shade); const r3 = await ui(p);
    check(r3.specs.length === 3 && r3.cols.spec[SI.fern_shade] === null && r3.specs[0].cost.startsWith(String((COL.specCost.base + COL.specCost.step) * config.econ.costScale)),
      "[14] UI: another colony still offers its own upgrade (at the next, higher price); the origin's upgrade stays with the origin", `Fern Shade upgrades at ${r3.specs[0].cost.replace(/\s+/g, " ")}`);
    // [29] HUD prominence
    const hs = await p.evaluate(() => { const f = e => parseFloat(getComputedStyle(e).fontSize), r = e => e.getBoundingClientRect();
      const bio = document.getElementById("hBio"), cov = document.getElementById("hCov"), sky = document.getElementById("hSky"), box = document.getElementById("bioBox");
      return { bio: f(bio), cov: f(cov), sky: f(sky), boxArea: r(box).width * r(box).height, covArea: r(document.querySelector(".covwrap")).width * r(document.querySelector(".covwrap")).height, left: r(box).left }; });
    check(hs.bio >= 2 * Math.max(hs.cov, hs.sky) && hs.boxArea > hs.covArea && hs.left < 300,
      "[29] Biomass is the most prominent HUD element: its number is ≥ 2× the size of the other status text, in a larger box, near the top-left",
      `Biomass ${hs.bio}px vs coverage ${hs.cov}px / sky ${hs.sky}px · box ${Math.round(hs.boxArea)} px² vs coverage group ${Math.round(hs.covArea)} px²`);
    if (SHOTS) await p.screenshot({ path: path.join(SHOTS, "hud-biomass.png"), clip: { x: 0, y: 0, width: 900, height: 68 } });
    check(p.errors.length === 0, "no browser errors (per-region controls)", p.errors.join(" | ")); await p.close();
  }
  // [20 live] clicks land while the game runs at 1×
  {
    const p = await open({ seed: 9, pause: false }); let landed = 0; const modes = ["roots", "leaves", "seeds", "balanced", "seeds", "leaves", "roots", "leaves"];
    for (const m of modes) { await p.waitForTimeout(260); await p.click(`#focusBox button.fbtn[data-focus="${m}"]`); if ((await p.evaluate(() => BLOOM_API.colonies().focus[ORIGIN])) === m) landed++; }
    const t1 = await p.evaluate(() => BLOOM_API.state().ticks); await p.waitForTimeout(1500);
    const after = await p.evaluate(() => ({ f: BLOOM_API.colonies().focus[ORIGIN], t: BLOOM_API.state().ticks }));
    check(landed === modes.length && after.t > t1 && after.f === "leaves", "focus clicks land while the game runs live at 1×, and one click keeps working with no further input",
      `${landed}/${modes.length} live clicks registered; ${after.t - t1} ticks later the origin is still ${after.f}`);
    check(p.errors.length === 0, "no browser errors (live 1×)", p.errors.join(" | ")); await p.close();
  }
  // [24–27] density rendering: the same origin region from seedlings to Dense
  {
    const p = await open({ seed: 4 });
    const box = await p.evaluate(() => { const r = cv.getBoundingClientRect(); let x0 = 1e9, y0 = 1e9, x1 = 0, y1 = 0;
      for (const t of SEC_TILES[ORIGIN]) { const x = t % W, y = (t / W) | 0; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
      return { x: r.left + x0 * TILE - 4, y: r.top + y0 * TILE - 4, width: (x1 - x0 + 1) * TILE + 8, height: (y1 - y0 + 1) * TILE + 8 }; });
    // per Living origin tile (interior tiles not under the name/badge, so no outline or label pixels): drawn plant area =
    // Σ per-pixel blend between the tile's ground colour and its plant colour (anti-aliased edges count fractionally);
    // plant lum = luminance of the plant colour the tile is drawn in
    const sample = () => p.evaluate(() => { const c = cv.getContext("2d"), d = window.devicePixelRatio || 1, T = TILE, out = [];
      const L = q => 0.2126 * q[0] + 0.7152 * q[1] + 0.0722 * q[2], tiles = SEC_TILES[ORIGIN].filter(t => state[t] === LIV);
      const inner = t => { const x = t % W, y = (t / W) | 0; return x > 0 && y > 0 && x < W - 1 && y < H - 1 && [t - 1, t + 1, t - W, t + W].every(k => TILEMAP[k] === ORIGIN) &&
        !(Math.abs(x + .5 - CENT[ORIGIN].x) < 4.5 && y + .5 - CENT[ORIGIN].y > -2.8 && y + .5 - CENT[ORIGIN].y < 2); }; // not under the name / ★ / badge
      for (const t of tiles.filter(inner)) { const img = c.getImageData((t % W) * T * d, ((t / W) | 0) * T * d, T * d, T * d).data, fg = livingColor(dens[t], vigor[ORIGIN]), bg = barrenColor(ORIGIN);
        const v = [fg[0] - bg[0], fg[1] - bg[1], fg[2] - bg[2]], vv = v[0] * v[0] + v[1] * v[1] + v[2] * v[2]; let a = 0;
        for (let k = 0; k < img.length; k += 4) a += Math.min(1, Math.max(0, ((img[k] - bg[0]) * v[0] + (img[k + 1] - bg[1]) * v[1] + (img[k + 2] - bg[2]) * v[2]) / vv));
        out.push({ d: dens[t], area: patchFrac(dens[t]) >= 1 ? 1 : a / (img.length / 4), lum: L(fg), want: Math.min(1, patchFrac(dens[t])) ** 2 }); }
      return { tiles: out, est: BLOOM_API.colony()[ORIGIN], n: tiles.length, full: tiles.length === AREA[ORIGIN] }; });
    const stages = [];
    const grab = async (name, file) => { await p.evaluate(() => draw()); const s = await sample(); stages.push({ name, ...s }); await shot(p, file, box); };
    await grab("just seeded", "density-1-just-seeded.png");
    for (let k = 0; k < 400; k++) { const e = await p.evaluate(() => BLOOM_API.colony()[ORIGIN].establishment); if (e >= 0.06) break; await step(p, 5); }
    await grab("low density", "density-2-low.png");
    for (let k = 0; k < 400; k++) { const w = await p.evaluate(() => BLOOM_API.colony()[ORIGIN].word); if (w === "establishing") break; await step(p, 5); }
    await step(p, 60); await grab("establishing", "density-3-establishing.png");
    for (let k = 0; k < 400; k++) { const w = await p.evaluate(() => BLOOM_API.colony()[ORIGIN].word); if (w === "established") break; await step(p, 5); }
    await grab("established", "density-4-established.png");
    for (let k = 0; k < 600; k++) { const w = await p.evaluate(() => BLOOM_API.colony()[ORIGIN].word); if (w === "dense") break; await step(p, 5); }
    await step(p, 300); await grab("dense", "density-5-dense.png");
    const meanOf = (st, k) => st.tiles.reduce((a, t) => a + t[k], 0) / st.tiles.length;
    const rows = stages.map(st => ({ name: st.name, word: st.est.word, est: st.est.establishment, d: meanOf(st, "d"), area: meanOf(st, "area"), lum: meanOf(st, "lum"), n: st.n }));
    check(rows[0].area < 0.12 && rows[4].area > 0.85 && rows.every((r, k) => k === 0 || (r.d > rows[k - 1].d && r.area > rows[k - 1].area && r.lum < rows[k - 1].lum)) && rows[0].lum - rows[4].lum > 60,
      "[24/25/26] the same origin region, from just seeded to Dense: at every stage the plant patches are bigger and a darker green (tiny pale sprouts → full dark tiles)",
      rows.map(r => `${r.name} (${r.word} ${pct(r.est)}): mean stand ${r.d.toFixed(2)}, patch ${pct(r.area)} of tile, plant lum ${r.lum.toFixed(0)}`).join(" · "));
    const all = stages.flatMap(s => s.tiles), err = mean(all.map(t => Math.abs(t.area - t.want)));
    check(err < 0.03, "[26] rendering tracks the real stand density: each tile's drawn patch area matches its sim.dens mapping", `${all.length} tile samples, mean |drawn − expected| area ${pct(err)}`);
    check(stages[4].full ? (stages[4].est.establishment > stages[3].est.establishment + 0.1 && rows[4].lum < rows[3].lum - 20 && rows[4].area > rows[3].area + 0.2) : false,
      "[27] a filled region keeps visibly thickening inside (Established → Dense changes the picture)", `all ${stages[4].n} origin tiles Living; established ${pct(stages[3].est.establishment)} (patch ${pct(rows[3].area)}, lum ${rows[3].lum.toFixed(0)}) → dense ${pct(stages[4].est.establishment)} (patch ${pct(rows[4].area)}, lum ${rows[4].lum.toFixed(0)})`);
    const pal = await p.evaluate(() => { const hex = h => [1, 3, 5].map(k => parseInt(h.slice(k, k + 2), 16));
      return { living: [0.05, 0.2, 0.4, 0.7, 1].map(d => livingColor(d, 1)), water: [WATER_C, WATER_C2], dead: DEAD_C, barren: SEC.map((_, i) => barrenColor(i)),
        outlines: { selected: hex("#7fe3c0"), opens: hex("#66d17f"), closes: hex("#e2604f"), hostile: hex("#e7c14e") } }; });
    const dist = (x, y) => Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]), minTo = (xs, ys) => Math.min(...xs.flatMap(x => ys.map(y => dist(x, y))));
    const dW = minTo(pal.living, pal.water), dD = minTo(pal.living, [pal.dead]), dB = minTo(pal.living, pal.barren), dO = minTo(pal.living, Object.values(pal.outlines));
    check(dW > 60 && dD > 60 && dB > 35 && dO > 35, "every density shade stays distinct from water, dead ground, barren ground and the outline colours (RGB distance)",
      `min distance: water ${dW.toFixed(0)} · dead ${dD.toFixed(0)} · barren ${dB.toFixed(0)} · outlines ${dO.toFixed(0)}`);
    check(p.errors.length === 0, "no browser errors (density rendering)", p.errors.join(" | ")); await p.close();
  }
  // [30–32] Waterborne crossing feedback on seed 13
  {
    const p = await open({ seed: 3, query: "?archetype=ocean_archipelago&seed=13" });
    await step(p, 600); await p.waitForTimeout(200);
    const pre = await p.evaluate(() => ({ ev: sim.crossing.events.length, anims: BLOOM_API.crossAnims().history.length }));
    await p.evaluate(id => { BLOOM_API.addBiomass(2000); buy(id); }, CROSS_ID);
    // step a little at a time so each event gets animated (the map picks new events up every frame)
    let foot = null, arrival = null;
    for (let k = 0; k < 400 && !(foot && arrival); k++) { await step(p, 3); await p.waitForTimeout(20);
      const h = await p.evaluate(() => BLOOM_API.crossAnims().history); foot ??= h.find(a => a.took) || null; arrival ??= h.find(a => !a.took) || null; }
    const hist = await p.evaluate(() => ({ h: BLOOM_API.crossAnims().history, ev: sim.crossing.events.map(e => ({ ...e })), hostile: SEC.map((_, i) => evaluate(i).fitness <= CFG.grow.growThresh), tm: [...TILEMAP], mass: [...LANDMASS] }));
    const evIds = new Map(hist.ev.map(e => [e.id, e]));
    const real = hist.h.every(a => { const e = evIds.get(a.id); return !e || (e.from === a.from && e.to === a.to && e.took === a.took); }) && hist.h.every(a => hist.mass[hist.tm[a.from]] !== hist.mass[hist.tm[a.to]]);
    check(pre.ev === 0 && pre.anims === 0 && hist.h.length > 0 && real,
      "[30] crossing animations appear only for real engine events: none before Waterborne Seeds; after it, each animation copies one engine event's source → landing pair (different landmasses)",
      `before: ${pre.ev} events / ${pre.anims} animations · after: ${hist.h.length} animations (${hist.h.filter(a => a.took).length} footholds, ${hist.h.filter(a => !a.took).length} arrivals)`);
    const hostileArr = hist.h.filter(a => hist.hostile[hist.tm[a.to]]);
    check(hostileArr.every(a => !a.took) && hist.ev.filter(e => hist.hostile[hist.tm[e.to]]).every(e => !e.took),
      "[32] seeds that wash up on hostile ground show only the travel + faint arrival ripple — never a foothold burst", `${hostileArr.length} animations landed on currently hostile regions, 0 as footholds`);
    // replay each recorded event's animation at a pinned phase (travel, then just after landing), drawn and measured in the
    // same synchronous step; pixel-check the bright foothold burst vs the faint arrival ripple around the landing tile
    const phase = (a, ms) => p.evaluate(({ a, ms }) => { XANIM.length = 0; XANIM.push({ ...a, t0: performance.now() - ms }); draw();
      const c = cv.getContext("2d"), d = window.devicePixelRatio || 1, x = ((a.to % W) + .5) * TILE, y = (((a.to / W) | 0) + .5) * TILE, R = TILE * 2.2;
      const near = (q, w, tol) => Math.abs(q[0] - w[0]) + Math.abs(q[1] - w[1]) + Math.abs(q[2] - w[2]) < tol;
      let bright = 0, pale = 0; for (let dx = -R; dx <= R; dx += 1.5) for (let dy = -R; dy <= R; dy += 1.5) { const q = c.getImageData((x + dx) * d, (y + dy) * d, 1, 1).data;
        if (near(q, [255, 226, 120], 70) || near(q, [150, 240, 120], 70)) bright++; if (near(q, [190, 220, 255], 90)) pale++; } return { bright, pale }; }, { a, ms });
    const replay = async (a, file) => { await phase(a, 650); await shot(p, file.replace(".png", "-travel.png"));
      const px = await phase(a, 1300 + 120); await shot(p, file.replace(".png", "-landing.png")); return px; };
    const pxF = foot ? await replay(foot, "crossing-foothold.png") : null, pxA = arrival ? await replay(arrival, "crossing-arrival.png") : null;
    check(foot && arrival && pxF.bright > 12 && pxA.bright < pxF.bright / 3,
      "[31] a successful foothold ends in a distinct bright burst; a plain seed arrival only in a faint ripple",
      foot && arrival ? `foothold landing: ${pxF.bright} bright px · arrival landing: ${pxA.bright} bright px (${pxA.pale} pale-ripple px)` : `foothold ${!!foot}, arrival ${!!arrival}`);
    check(p.errors.length === 0, "no browser errors (crossing feedback)", p.errors.join(" | ")); await p.close();
  }
  await browser.close();
  console.log(`\n${fails ? fails + " check(s) FAILED" : "ALL CHECKS PASS"}  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  process.exit(fails ? 1 : 0);
})();
