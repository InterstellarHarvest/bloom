// BLOOM — Colony Focus + colony establishment checks (BLOOM-008).
//
//   NODE_PATH="$(npm root -g)" node tools/colony-focus-check.js [--shots <dir>]
//
// Part A (Node, production engine): deterministic controlled experiments — the same map, the same seeded RNG,
// one variable changed (focus mode, focus config, ground fitness). Part B (Chromium): the real inspect-panel
// control, the map's density shading and the 1× opening, driven through real clicks. Page RNG is seeded
// (Math.random → mulberry32) so UI comparisons are deterministic too. Exits 1 on any failure.
"use strict";
const path = require("path");
let chromium;
try { ({ chromium } = require("playwright")); }
catch { console.error('Playwright not found. Run with NODE_PATH="$(npm root -g)" after `npm i -g playwright`.'); process.exit(2); }
const ROOT = path.resolve(__dirname, "..");
for (const f of ["content/config.js", "content/traits.js", "content/archetypes.js", "planets/first_bloom.js", "resources/bloom-sim.js",
  "resources/bloom-gen.js", "resources/bloom-validate.js", "resources/bloom-witness.js", "resources/bloom-archetype.js"]) require(path.join(ROOT, f));
const { BLOOM, BLOOM_DATA } = globalThis, { config, traits, archetypes } = BLOOM_DATA, FB = BLOOM_DATA.planets.first_bloom;
const OA = archetypes.find(a => a.id === "ocean_archipelago"), CROSS_ID = traits.find(t => t.effect.type === "crossing").id;
const PAGE = "file://" + encodeURI(path.join(ROOT, "demos/demo-run.html"));
const shotsArg = process.argv.indexOf("--shots"), SHOTS = shotsArg > 0 ? process.argv[shotsArg + 1] : null;
const TPS = 1000 / config.tickMs, G = config.grow, F = config.focus, EST = config.establish;
const mb = BLOOM.gen.mulberry32, clone = o => JSON.parse(JSON.stringify(o)), fnv = BLOOM.archetype.fnv1a;
const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length, pct = x => (x * 100).toFixed(1) + "%";
let fails = 0;
const check = (ok, name, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); if (!ok) fails++; };
const hashState = sim => fnv(Array.from(sim.state).join(""));

// ---- lab planet: Home (origin, ideal) | Test (temperature offset sets its fitness exactly); optional water gap between
const GOOD = { tempOffset: 0, moistureOffset: 0, light: 70, ph: 6.8, salinity: 0, toxicity: 0, radiation: 8, nutrients: 60 };
function labPlanet({ testTempOffset = 0, gap = 0 } = {}) {
  const H = 12, hw = 12, tw = 12, W = hw + gap + tw, tilemap = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) tilemap.push(x < hw ? 0 : x < hw + gap ? -1 : 1);
  return { id: "lab", name: "Lab", gridWidth: W, gridHeight: H, origin: "home", globalClimate: { temperature: 10, moisture: 50 }, tilemap,
    sections: [{ id: "home", name: "Home", isOrigin: true, area: 0, local: GOOD }, { id: "test", name: "Test", area: 0, local: { ...GOOD, tempOffset: testTempOffset } }] };
}
// temperature offset that gives the Test section fitness f (< 1) under the lab sky: band ceiling + soft × (1 − f)
const offFor = f => config.genomeBase.tempCeil + config.categories.Temperature.soft * (1 - f) - 10;
// fill a section with Living seedling stands (no Barren tiles left there → its own spread draws no randomness)
function fill(sim, i, d = EST.seedlingDensity) { for (const t of sim.map.SEC_TILES[i]) { sim.state[t] = sim.LIV; sim.dens[t] = d; } }
function labRun({ fit, mode, seed = 7, ticks = 400, cfg = config, fillHome = true }) {
  const sim = BLOOM.createSim(labPlanet({ testTempOffset: offFor(fit) }), cfg, traits, { rng: mb(seed) }), T = sim.map.SIDX.test;
  if (fillHome) fill(sim, 0, 1); fill(sim, T);
  if (mode) sim.setFocus(T, mode);
  sim.map.SEC.forEach((_, i) => { sim.vigor[i] = sim.evaluate(i).fitness; }); // a colony already living under these conditions
  const start = { est: sim.establishment(T), living: sim.livingCountBySection()[T] };
  for (let t = 0; t < ticks; t++) sim.tick();
  return { sim, T, start, est: sim.establishment(T), living: sim.livingCountBySection()[T], fitness: sim.evaluate(T).fitness, lamp: sim.lampOf(sim.evaluate(T).fitness) };
}

(async () => {
  const t0 = Date.now();
  console.log("# A · engine: Colony Focus rules (deterministic, production engine)");
  // ---------------------------------------------------------------- API rules
  {
    const s = BLOOM.createSim(FB, config, traits, { rng: mb(1) }), O = s.map.ORIGIN, fern = s.map.SIDX.fern_shade;
    const okO = s.setFocus(O, "roots"), noFern = !s.setFocus(fern, "seeds"), noMode = !s.setFocus(O, "fertilizer");
    check(okO && noFern && noMode && s.focus.section === O && s.focus.mode === "roots",
      "a Living section accepts a focus; a section with no plants and an unknown mode are refused", `origin ok, Fern Shade (0 living) refused, "fertilizer" refused`);
    for (let t = 0; t < 900 && s.livingCountBySection()[fern] === 0; t++) s.tick();
    const moved = s.setFocus(fern, "seeds");
    check(moved && s.focus.section === fern && s.focus.mode === "seeds" && Object.keys(F.modes).every(m => m === "seeds" || s.focus.mode !== m),
      "3 · only one region holds directed focus: focusing Fern Shade moves it off the origin (one section, one mode)", `focus = { section: ${s.focus.section} (Fern Shade), mode: seeds }`);
    s.clearFocus(); check(s.focus.section === -1 && s.focus.mode === null, "focus can be cleared back to the normal balance");
  }

  // ---------------------------------------------------------------- 6 / 7 · Roots
  {
    const fitV = 0.62, a = labRun({ fit: fitV, ticks: 200 }), b = labRun({ fit: fitV, mode: "roots", ticks: 200 });
    check(a.lamp === "yellow" && a.fitness > G.growThresh && b.est > a.est * 1.3 && b.living === a.living,
      "6 · Roots speeds establishment of a marginal-but-viable colony (yellow ground, fitness above the grow threshold)",
      `fitness ${a.fitness.toFixed(2)} (${a.lamp}); establishment after ${200 / TPS} s: control ${pct(a.est)} → Roots ${pct(b.est)}`);
    const fitM = 0.45, c = labRun({ fit: fitM }), d = labRun({ fit: fitM, mode: "roots" });
    check(Math.abs(c.est - c.start.est) < 1e-6 && d.est > c.est + 0.05 && d.living === c.living && c.fitness < G.growThresh && c.fitness > G.dieThresh,
      "6 · …in the marginal band (between die and grow thresholds) stands only hold at baseline; with Roots they keep thickening",
      `fitness ${c.fitness.toFixed(2)}; establishment control ${pct(c.est)} (unchanged) vs Roots ${pct(d.est)}`);
    const fitS = 0.32, seeds = [1, 2, 3, 4, 5, 6], ctl = seeds.map(sd => labRun({ fit: fitS, seed: sd, ticks: 600 })), rts = seeds.map(sd => labRun({ fit: fitS, mode: "roots", seed: sd, ticks: 600 }));
    check(ctl[0].lamp === "yellow" && mean(rts.map(r => r.living)) > mean(ctl.map(r => r.living)) * 1.15 && rts.filter((r, k) => r.living > ctl[k].living).length >= 5,
      "6 · …and under stress (yellow ground below the die threshold) Roots cuts die-back: more of the colony survives",
      `fitness ${ctl[0].fitness.toFixed(2)} (${ctl[0].lamp}); survivors of ${ctl[0].start.living} after ${600 / TPS} s: control ${mean(ctl.map(r => r.living)).toFixed(1)} vs Roots ${mean(rts.map(r => r.living)).toFixed(1)} (mean of ${seeds.length} seeds)`);
    const fitR = 0.05, e = seeds.map(sd => labRun({ fit: fitR, seed: sd, ticks: 900 })), f = seeds.map(sd => labRun({ fit: fitR, mode: "roots", seed: sd, ticks: 900 }));
    check(e[0].lamp === "red" && e.every((r, k) => hashState(r.sim) === hashState(f[k].sim) && r.est === f[k].est) && mean(f.map(r => r.living)) < 0.25 * f[0].start.living,
      "7 · Roots does NOT rescue red, blocked ground: die-back and thinning are bit-identical to no focus, and the colony still collapses",
      `fitness ${e[0].fitness.toFixed(2)} (${e[0].lamp}); survivors after ${900 / TPS} s: control ${mean(e.map(r => r.living)).toFixed(1)} = Roots ${mean(f.map(r => r.living)).toFixed(1)} of ${f[0].start.living}`);
    // growth into blocked ground: Test section empty, fitness below the grow threshold, Home fully established + focus on Home (all modes)
    const g = ["roots", "leaves", "seeds"].map(m => { const s = BLOOM.createSim(labPlanet({ testTempOffset: offFor(0.45) }), config, traits, { rng: mb(3) });
      fill(s, 0, 1); s.setFocus(0, m); for (let t = 0; t < 1500; t++) s.tick(); return s.livingCountBySection()[1]; });
    check(g.every(n => n === 0), "no focus mode lets plants spread into ground below the grow threshold (1500 ticks next to a dense, focused colony)", `Test living: ${g.join(" / ")}`);
  }

  // ---------------------------------------------------------------- 8 / 9 · Leaves; no mode touches the environment
  {
    const A = BLOOM.createSim(FB, config, traits, { rng: mb(21) }), B = BLOOM.createSim(FB, config, traits, { rng: mb(21) });
    B.setFocus(B.map.ORIGIN, "leaves"); let same = true; const gaps = [];
    for (let t = 1; t <= 1500; t++) { A.tick(); B.tick(); if (t % 100 === 0) { same = same && hashState(A) === hashState(B); gaps.push(B.biomass - A.biomass); } }
    check(same && gaps.every((g, k) => g > 0 && (k === 0 || g > gaps[k - 1])),
      "8 · Leaves increases Biomass from the focused colony vs an otherwise identical deterministic control (same map, same RNG, identical plant spread)",
      `extra Biomass at 16 / 80 / 240 s: +${gaps[0].toFixed(1)} / +${gaps[4].toFixed(1)} / +${gaps[14].toFixed(1)}`);
    const s = BLOOM.createSim(FB, config, traits, { rng: mb(2) }), snap = () => JSON.stringify([s.derived(), s.map.SEC.map((_, i) => s.evaluate(i)), traits.map(t => s.previewOf(t.id))]);
    const base = snap(), per = Object.keys(F.modes).map(m => { s.setFocus(s.map.ORIGIN, m); return snap(); });
    check(per.every(x => x === base), "9 · Leaves (and Roots, Seeds) change no environmental fitness, tolerance, category word, limiting factor or purchase preview",
      `${s.map.SC} sections × ${Object.keys(F.modes).length} modes compared`);
  }

  // ---------------------------------------------------------------- 10 · Seeds outbound
  {
    // a full, established Home colony next to empty, suitable Test ground: what crosses the border in the first 2.4 s is
    // Home's push alone (later the border column saturates and Test's own young colony does the spreading)
    const outbound = (mode, sd) => { const s = BLOOM.createSim(labPlanet(), config, traits, { rng: mb(sd) }); fill(s, 0, 0.6);
      s.map.SEC.forEach((_, i) => { s.vigor[i] = s.evaluate(i).fitness; }); if (mode) s.setFocus(0, mode);
      for (let t = 0; t < 15; t++) s.tick(); return s.livingCountBySection()[1]; };
    const seeds = Array.from({ length: 12 }, (_, k) => k + 1), c = seeds.map(sd => outbound(null, sd)), x = seeds.map(sd => outbound("seeds", sd));
    const fbOut = mode => mean([1, 2, 3, 4].map(sd => { const s = BLOOM.createSim(FB, config, traits, { rng: mb(sd) }); if (mode) s.setFocus(s.map.ORIGIN, mode);
      for (let t = 0; t < 400; t++) s.tick(); return s.coverage(); }));
    check(mean(x) > mean(c) * 1.3 && x.filter((v, k) => v > c[k]).length >= 9,
      "10 · Seeds increases outbound colonization from the focused colony vs control",
      `Test tiles colonized from a focused Home in ${15 / TPS} s: control ${mean(c).toFixed(1)} → Seeds ${mean(x).toFixed(1)} (${x.filter((v, k) => v > c[k]).length}/${seeds.length} seeds higher); First Bloom coverage at ${400 / TPS} s: ${pct(fbOut(null))} → ${pct(fbOut("seeds"))}`);
  }

  // ---------------------------------------------------------------- 11 / 12 · Seeds × Waterborne Seeds
  {
    const cross = (mode, sd, testTempOffset = 0, ticks = 3000) => { const s = BLOOM.createSim(labPlanet({ gap: 3, testTempOffset }), config, traits, { rng: mb(sd) });
      fill(s, 0, 0.6); s.biomass = 1e9; s.buy(CROSS_ID); s.biomass = 0; if (mode) s.setFocus(0, mode);
      let first = null; for (let t = 1; t <= ticks && (first === null || testTempOffset); t++) { s.tick(); if (first === null && s.crossing.footholds > 0) first = t; }
      return { first: first ?? ticks, sim: s }; };
    const seeds = [1, 2, 3, 4, 5, 6, 7, 8], c = seeds.map(sd => cross(null, sd).first), x = seeds.map(sd => cross("seeds", sd).first);
    check(mean(x) < mean(c) * 0.85 && x.filter((v, k) => v <= c[k]).length >= 6,
      "11 · Seeds strengthens Waterborne source pressure: the first foothold across a 3-tile strait arrives sooner",
      `first foothold: control ${(mean(c) / TPS).toFixed(1)} s → Seeds ${(mean(x) / TPS).toFixed(1)} s (mean of ${seeds.length} seeds)`);
    const hostile = [1, 2, 3].map(sd => cross("seeds", sd, 40, 4000).sim), ev = hostile[0].evaluate(1);
    check(hostile.every(s => s.crossing.arrivals > 0 && s.crossing.footholds === 0 && s.livingCountBySection()[1] === 0) && ev.limitKey === "Temperature",
      "12 · Seeds focus + Waterborne Seeds cannot establish on a hostile island: seeds arrive, none take root (destination fitness governs)",
      `${hostile.map(s => s.crossing.arrivals).join(" / ")} arrivals, 0 footholds; island limit: ${ev.cats.Temperature.word}`);
  }

  // ---------------------------------------------------------------- 13 · config-driven
  {
    const zero = clone(config); for (const m of Object.values(zero.focus.modes)) for (const k in m) m[k] = 0;
    const runFB = (cfg, mode, n = 1500) => { const s = BLOOM.createSim(FB, cfg, traits, { rng: mb(33) }); if (mode) s.setFocus(s.map.ORIGIN, mode); for (let t = 0; t < n; t++) s.tick(); return [hashState(s), s.biomass, Array.from(s.dens).reduce((a, b) => a + b, 0)]; };
    const ctl = JSON.stringify(runFB(config, null)), z = Object.keys(F.modes).map(m => JSON.stringify(runFB(zero, m)));
    const big = clone(config); big.focus.modes.leaves.yieldBonus = 3;
    const l1 = runFB(config, "leaves")[1], l3 = runFB(big, "leaves")[1];
    check(z.every(x => x === ctl) && l3 > l1, "13 · focus effects are config data: with every config.focus bonus at 0 each mode is bit-identical to no focus; raising leaves.yieldBonus raises Biomass",
      `Leaves +${Math.round(F.modes.leaves.yieldBonus * 100)}% → ${l1.toFixed(0)} Biomass at 240 s; +300% → ${l3.toFixed(0)}`);
  }

  // ---------------------------------------------------------------- 14 · establishment ramp
  {
    const s = BLOOM.createSim(FB, config, traits, { rng: mb(4) }), O = s.map.ORIGIN, words = [], firstSeen = {};
    const w0 = s.colonyStatus(O).word, fern = s.map.SIDX.fern_shade; let fernAt = null, fernStart = null, fernFull = null;
    for (let t = 1; t <= 2200; t++) { s.tick(); const w = s.colonyStatus(O).word; if (words[words.length - 1] !== w) { words.push(w); firstSeen[w] = +(t / TPS).toFixed(1); }
      if (fernAt === null && s.livingCountBySection()[fern] > 0) { fernAt = t; const tl = s.map.SEC_TILES[fern].filter(k => s.state[k] === s.LIV);
        fernStart = { word: s.colonyStatus(fern).word, dens: tl.map(k => s.dens[k]) }; }
      if (fernAt !== null && fernFull === null && ["established", "dense"].includes(s.colonyStatus(fern).word)) fernFull = t; }
    check(w0 === "sparse" && words.join(">") === "sparse>establishing>established>dense",
      "14 · a new run's origin is a sparse, newly sown colony and matures in steps: Sparse → Establishing → Established → Dense",
      `origin: ${Object.entries(firstSeen).map(([w, t]) => `${w} @ ${t} s`).join(", ")}`);
    check(fernStart && fernStart.word === "sparse" && fernStart.dens.every(d => Math.abs(d - EST.seedlingDensity) < 1e-6) && fernFull && fernFull - fernAt > 150,
      "14 · newly colonized suitable ground starts as sparse seedling stands, not a mature colony, and takes a while to establish",
      `Fern Shade first Living at ${(fernAt / TPS).toFixed(0)} s (stand density ${EST.seedlingDensity}), established ${((fernFull - fernAt) / TPS).toFixed(0)} s later`);
    const g0 = lerp01(config.econ.youngYield, EST.seedlingDensity), sp = lerp01(G.youngSeedShare, 0);
    check(g0 < 0.5 && sp < 0.5, "14 · a seedling stand yields and seeds at a fraction of a mature one (config.econ.youngYield, config.grow.youngSeedShare)",
      `seedling yield ${(g0 * 100).toFixed(0)}% of mature, unestablished colony seed output ${(sp * 100).toFixed(0)}%`);
  }
  function lerp01(a, t) { return a + (1 - a) * t; }

  // ---------------------------------------------------------------- 5 / 21 / 22 / 23 / 24 / 27 · runs, worlds, validator
  const bot = (planet, plan, mode, sd, maxTicks = 12000) => { const s = BLOOM.createSim(planet, config, traits, { rng: mb(sd) }); if (mode) s.setFocus(s.map.ORIGIN, mode);
    let i = 0, at = null; for (let t = 1; t <= maxTicks; t++) { s.tick(); if (s.won) return t / TPS;
      if (i < plan.length) { const tr = s.traitById[plan[i]]; if (s.canBuy(tr) && s.biomass >= s.price(tr)) { at ??= t; if (t - at >= 25 && s.buy(plan[i])) { i++; at = null; } } } } return null; };
  {
    const plans = { wet: ["seedOut", "cold", "flood", "cold", "heat", "salt", "earlyMat", "seedOut"], dry: ["seedOut", "cold", "drought", "cold", "heat", "salt", "earlyMat", "seedOut"],
      terraformWater: ["seedOut", "heat", "salt", "cold", "humid", "humid"] };
    const rows = [];
    for (const [n, plan] of Object.entries(plans)) for (const mode of [null, "roots", "leaves", "seeds"]) rows.push({ n, mode: mode || "none", secs: [5, 6, 7].map(sd => bot(FB, plan, mode, sd)) });
    const none = rows.filter(r => r.mode === "none");
    check(none.every(r => r.secs.every(x => x !== null)), "5 · ignoring Colony Focus entirely is legal: every broad First Bloom build still wins with no focus ever set",
      none.map(r => `${r.n} ${Math.round(mean(r.secs))} s`).join(" · "));
    check(rows.every(r => r.secs.every(x => x !== null)) && new Set(Object.keys(plans)).size >= 2,
      "21 · First Bloom stays winnable after the retune through ≥ 2 broad strategies (wet / dry Adapt, Terraform water), with or without any focus mode",
      rows.filter(r => r.mode !== "none").map(r => `${r.n}+${r.mode} ${Math.round(mean(r.secs))} s`).join(" · "));
  }
  for (const seed of [13, 8]) {
    const p = BLOOM.generateFromArchetype(OA, seed, { config, traits }), A = p.archetype, pol = { minStrategies: OA.validation.minStrategies, pacing: OA.validation.pacing };
    const v = BLOOM.validatePlanet(p, config, { traits, regenerate: BLOOM.generatePlanet, winnability: true, strategies: pol });
    const plan = A.strategies.list[0].purchases.map(x => x[0]), sds = [5, 6, 7, 8], w0 = sds.map(sd => bot(p, plan, null, sd)), wS = sds.map(sd => bot(p, plan, "seeds", sd));
    const fmt = ws => `${Math.round(mean(ws))} s [${Math.round(Math.min(...ws))}–${Math.round(Math.max(...ws))}]`;
    check(JSON.stringify(A.validatedLayers) === "[1,2,3,4,5,6,7,8]" && v.ok && [...w0, ...wS].every(x => x !== null),
      `${seed === 13 ? 22 : 23} · Ocean Archipelago seed ${seed} stays production-valid (layers 1–8 re-validated) and winnable after the retune`,
      `attempt ${A.attempt} · ${p.name} · ${A.strategies.found} strategies · strategy 1 [${plan.join(" → ")}] bot wins ${fmt(w0)} with no focus, ${fmt(wS)} with Seeds held on the origin (4 RNG seeds)`);
  }
  {
    let e = null; try { BLOOM.generateFromArchetype(OA, 35, { config, traits }); } catch (x) { e = x; }
    check(e && e.attempts && e.attempts.length === OA.generation.maxAttempts, "27 · seed 35 still fails explicitly (no acceptable world in every attempt)", e ? `${e.attempts.length} attempts rejected` : "generated a world");
  }

  // ================================================================= B · real UI
  console.log("\n# B · UI: inspect-panel control, density shading, 1× opening (seeded page RNG)");
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
  const shot = async (p, name) => { if (SHOTS) await p.screenshot({ path: path.join(SHOTS, name) }); };
  const ui = p => p.evaluate(() => ({ focusBtns: [...document.querySelectorAll("#focusBox button.fbtn")].map(b => ({ m: b.dataset.focus, off: b.classList.contains("off"), on: b.getAttribute("aria-pressed") })),
    shopAffordable: document.querySelectorAll("#shop button.buy:not(.off)").length, colony: (document.getElementById("colony") || {}).innerText || "", sel: selected,
    focus: BLOOM_API.focus(), hud: document.getElementById("hFocus").textContent, fstate: (document.querySelector("#focusBox .fstate") || {}).innerText || "" }));

  // 1 / 2 / 4 / 17 · the control on a new run
  {
    const p = await open();
    const u0 = await ui(p);
    check(u0.sel >= 0 && u0.focusBtns.length === 3 && u0.focusBtns.every(b => !b.off) && u0.shopAffordable === 0,
      "1 · a new run opens on the origin with Colony Focus available while no normal trait is affordable yet", `focus buttons ${u0.focusBtns.map(b => b.m).join("/")} enabled · ${u0.shopAffordable} upgrades affordable`);
    check(/^Colony: Sparse/.test(u0.colony), "17 · inspect leads with an ordinary-language colony status", u0.colony.split("\n")[0]);
    await shot(p, "focus-ui-opening.png");
    const seq = [];
    for (const m of ["roots", "leaves", "seeds"]) { await p.click(`#focusBox button.fbtn[data-focus="${m}"]`); const u = await ui(p);
      seq.push(u.focus.mode === m && u.focusBtns.find(b => b.m === m).on === "true" && u.focusBtns.filter(b => b.on === "true").length === 1 && u.hud.startsWith(m[0].toUpperCase())); }
    check(seq.every(Boolean), "2 / 4 · Roots, Leaves and Seeds are each selected by one real click (mode switches in place, one pressed button, HUD follows)");
    await p.click(`#focusBox button.fbtn[data-focus="leaves"]`); await step(p, 5);
    await shot(p, "focus-ui-leaves.png");
    // move the focus to another region with one click once that region has plants
    const fern = await p.evaluate(() => SIDX.fern_shade);
    for (let k = 0; k < 120 && !(await p.evaluate(f => livingCountBySection()[f] > 0, fern)); k++) await step(p, 10);
    await p.evaluate(f => { selected = f; renderInspect(); draw(); }, fern);
    await p.click(`#focusBox button.fbtn[data-focus="seeds"]`);
    const u2 = await ui(p);
    check(u2.focus.section === fern && u2.focus.mode === "seeds" && /Fern Shade/.test(u2.hud),
      "3 / 4 · one click on another Living region moves the single focus there (the origin loses it)", `HUD: focus ${u2.hud}`);
    await p.evaluate(() => { selected = ORIGIN; renderInspect(); draw(); });
    const u3 = await ui(p);
    check(u3.focusBtns.every(b => b.on === "false") && /Focus is on Fern Shade/.test(u3.fstate), "…and the origin's panel now says where the focus is instead of showing it pressed", u3.fstate);
    await p.evaluate(() => { selected = SIDX.ember_scar; renderInspect(); });
    const u4 = await ui(p);
    check(u4.focusBtns.every(b => b.off), "a region with no plants shows the control disabled (focus needs a Living colony)");
    check(p.errors.length === 0, "no browser errors (focus control)", p.errors.join(" | ")); await p.close();
  }
  // 19 / 20 · the 1× opening: a real decision with a measurable effect before the first trait purchase
  {
    const firstAfford = async (p) => { for (let t = 0; t < 3000; t += 5) { await p.evaluate(() => { BLOOM_API.advance(5); refreshShop(); });
      if (await p.evaluate(() => !!document.querySelector("#shop button.buy:not(.off)"))) return p.evaluate(() => BLOOM_API.state().ticks); } return null; };
    const at = async (mode, n) => { const p = await open({ seed: 9 }); if (mode) await p.click(`#focusBox button.fbtn[data-focus="${mode}"]`);
      await p.evaluate(n => BLOOM_API.advance(n), n); const r = await p.evaluate(() => ({ bio: BLOOM_API.sim.biomass, c: BLOOM_API.colony()[ORIGIN], cov: BLOOM_API.coverage() })); await p.close(); return r; };
    const pc = await open({ seed: 9 }), fc = await firstAfford(pc); await pc.close();
    const pl = await open({ seed: 9 }); await pl.click(`#focusBox button.fbtn[data-focus="leaves"]`); const fl = await firstAfford(pl); await pl.close();
    const T = Math.round(45 * TPS), c = await at(null, T), r = await at("roots", T), s = await at("seeds", T);
    check(fc && fl && fl < fc && T < fc && r.c.establishment > c.c.establishment * 1.15 && s.cov > c.cov * 1.15,
      "19 · at 1× the opening has a real decision before the first purchase, and each choice shows a measurable effect before the shop opens",
      `first upgrade affordable: no focus ${(fc / TPS).toFixed(0)} s → Leaves ${(fl / TPS).toFixed(0)} s; at ${T / TPS} s origin establishment ${pct(c.c.establishment)} → Roots ${pct(r.c.establishment)}; coverage ${pct(c.cov)} → Seeds ${pct(s.cov)}`);
    // live clicks while the game runs at 1× (the inspect panel re-renders every few ticks; clicks must still land)
    const p = await open({ seed: 9, pause: false }); let landed = 0; const modes = ["roots", "leaves", "seeds", "roots", "seeds", "leaves", "roots", "leaves"];
    for (const m of modes) { await p.waitForTimeout(260); await p.click(`#focusBox button.fbtn[data-focus="${m}"]`); if ((await p.evaluate(() => BLOOM_API.focus().mode)) === m) landed++; }
    const t1 = await p.evaluate(() => BLOOM_API.state().ticks); await p.waitForTimeout(1500);
    const after = await p.evaluate(() => ({ f: BLOOM_API.focus(), t: BLOOM_API.state().ticks }));
    check(landed === modes.length && after.t > t1 && after.f.mode === "leaves", "20 · focus clicks land while the game runs live at 1×, and one click keeps working with no further input",
      `${landed}/${modes.length} live clicks registered; ${after.t - t1} ticks later focus is still ${after.f.mode}`);
    check(p.errors.length === 0, "no browser errors (live 1× opening)", p.errors.join(" | ")); await p.close();
  }
  // 15 / 16 / 18 · density shading on the map
  {
    const p = await open({ seed: 4 });
    const sample = () => p.evaluate(() => { const c = document.getElementById("cv").getContext("2d"), d = window.devicePixelRatio || 1, T = BLOOM_API.geometry().tile;
      const L = t => { const [r, g, b] = c.getImageData(((t % W) + 0.5) * T * d, (((t / W) | 0) + 0.5) * T * d, 1, 1).data; return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
      const tiles = SEC_TILES[ORIGIN].filter(t => state[t] === LIV); return { lum: tiles.reduce((a, t) => a + L(t), 0) / tiles.length, n: tiles.length, full: tiles.length === AREA[ORIGIN], est: BLOOM_API.colony()[ORIGIN] }; });
    await step(p, 20); const a = await sample(); await shot(p, "colony-sparse.png");
    let b = null; for (let k = 0; k < 200; k++) { await step(p, 5); b = await sample(); if (b.full) break; }
    await shot(p, "colony-establishing.png");
    await step(p, 400); const c = await sample(); await shot(p, "colony-dense.png");
    check(a.est.word === "sparse" && c.est.word === "dense" && c.lum < a.lum - 40,
      "15 · the map's vegetation darkens as the colony matures (mean origin plant luminance)", `${a.est.word} ${a.lum.toFixed(0)} → ${c.est.word} ${c.lum.toFixed(0)}`);
    check(b.full && b.est.word !== "dense" && c.full && c.est.establishment > b.est.establishment + 0.1 && c.lum < b.lum - 15,
      "16 · once every origin tile is Living the colony keeps maturing and the map keeps changing (tile-full ≠ visually finished)",
      `all ${b.n} tiles Living at ${b.est.word} ${pct(b.est.establishment)} (lum ${b.lum.toFixed(0)}) → 64 s later ${c.est.word} ${pct(c.est.establishment)} (lum ${c.lum.toFixed(0)})`);
    const col = await ui(p); check(/^Colony: Dense/.test(col.colony), "17 · …and the inspect status follows (Dense)", col.colony.split("\n")[0]);
    // palette separation: seedling → mature shades vs water, dead, every barren ground colour, and the outline colours
    const pal = await p.evaluate(() => { const hex = h => [1, 3, 5].map(k => parseInt(h.slice(k, k + 2), 16));
      return { living: [0.15, 0.4, 0.7, 1].map(d => livingColor(d, 1)), water: [WATER_C, WATER_C2], dead: DEAD_C, barren: SEC.map((_, i) => barrenColor(i)),
        outlines: { selected: hex("#7fe3c0"), opens: hex("#66d17f"), closes: hex("#e2604f"), hostile: hex("#e7c14e") } }; });
    const dist = (x, y) => Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]), minTo = (xs, ys) => Math.min(...xs.flatMap(x => ys.map(y => dist(x, y))));
    const dW = minTo(pal.living, pal.water), dD = minTo(pal.living, [pal.dead]), dB = minTo(pal.living, pal.barren), dO = minTo(pal.living, Object.values(pal.outlines));
    check(dW > 60 && dD > 60 && dB > 35 && dO > 45, "18 · every density shade stays distinct from water, dead ground, barren ground and the outline colours (RGB distance)",
      `min distance: water ${dW.toFixed(0)} · dead ${dD.toFixed(0)} · barren ${dB.toFixed(0)} · outlines ${dO.toFixed(0)}`);
    check(p.errors.length === 0, "no browser errors (density shading)", p.errors.join(" | ")); await p.close();
  }
  // 18 · outlines + Waterborne preview drawn over density-shaded vegetation on a generated world
  {
    const p = await open({ seed: 3, query: "?archetype=ocean_archipelago&seed=13" });
    await p.click(`#focusBox button.fbtn[data-focus="seeds"]`); await step(p, 900);
    await p.evaluate(() => { BLOOM_API.addBiomass(1000); }); await p.hover(`button.buy[data-id="${CROSS_ID}"]`); await p.evaluate(() => draw());
    const count = await p.evaluate(() => { const cv = document.getElementById("cv"), d = cv.getContext("2d").getImageData(0, 0, cv.width, cv.height).data;
      const want = { selected: [127, 227, 192], canRoot: [102, 209, 127], hostile: [231, 193, 78], water: [24, 52, 92] }, n = { vegetation: 0 };
      for (const k in want) n[k] = 0;
      for (let i = 0; i < d.length; i += 4) { for (const k in want) { const w = want[k]; if (Math.abs(d[i] - w[0]) + Math.abs(d[i + 1] - w[1]) + Math.abs(d[i + 2] - w[2]) < 18) n[k]++; }
        if (d[i + 1] > d[i] + 25 && d[i + 1] > d[i + 2] + 25) n.vegetation++; }
      return n; });
    await shot(p, "seed13-focus-preview.png");
    check(Object.values(count).every(n => n > 40), "18 · on seed 13 the selection outline, green 'can root' and yellow 'reachable but hostile' outlines, water and density-shaded vegetation all render",
      Object.entries(count).map(([k, n]) => `${k} ${n}px`).join(" · "));
    const lbl = await p.evaluate(() => BLOOM_API.focus());
    check(lbl.mode === "seeds" && p.errors.length === 0, "Colony Focus works on a generated world (Seeds on the seed-13 origin), no browser errors", p.errors.join(" | "));
    await p.close();
  }
  await browser.close();
  console.log(`\n${fails ? fails + " check(s) FAILED" : "ALL CHECKS PASS"}  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  process.exit(fails ? 1 : 0);
})();
