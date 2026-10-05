// BLOOM — headless QA for the procedural-run harness in demos/demo-run.html (BLOOM-007).
// Drives the production browser path: the page itself calls BLOOM.generateFromArchetype (validator
// layers 1–8), and every purchase below is a click on a REAL shop button (never BLOOM_API.buy).
// The sim is stepped with the existing BLOOM_API.advance hook, as in slice-check.
//
//   NODE_PATH="$(npm root -g)" node tools/procedural-run-check.js [--shots <dir>]
//
// Needs Playwright installed globally (npm i -g playwright). Exits 1 on any failure.
"use strict";
const path = require("path");
let chromium;
try { ({ chromium } = require("playwright")); }
catch { console.error('Playwright not found. Run with NODE_PATH="$(npm root -g)" after `npm i -g playwright`.'); process.exit(2); }
const ROOT = path.resolve(__dirname, "..");
for (const f of ["content/config.js", "content/traits.js", "content/archetypes.js", "planets/first_bloom.js", "resources/bloom-sim.js",
  "resources/bloom-gen.js", "resources/bloom-validate.js", "resources/bloom-witness.js", "resources/bloom-archetype.js"]) require(path.join(ROOT, f));
const { BLOOM, BLOOM_DATA } = globalThis, { config, traits, archetypes } = BLOOM_DATA, OA = archetypes.find(a => a.id === "ocean_archipelago");

const PAGE = "file://" + encodeURI(path.join(ROOT, "demos/demo-run.html"));
const url = (seed) => seed === undefined ? PAGE : `${PAGE}?archetype=ocean_archipelago&seed=${seed}`;
const shotsArg = process.argv.indexOf("--shots"), SHOTS = shotsArg > 0 ? process.argv[shotsArg + 1] : null;
const TICK_S = config.tickMs / 1000, WATERBORNE = traits.find(t => t.effect.type === "crossing");
const FB_NAMES = BLOOM_DATA.planets.first_bloom.sections.map(s => s.name);
let fails = 0;
const check = (ok, name, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); if (!ok) fails++; };
const shot = async (p, name) => { if (SHOTS) await p.screenshot({ path: path.join(SHOTS, name) }); };

(async () => {
  const browser = await chromium.launch(), t0 = Date.now();
  const open = async (seed, pause = true) => {
    const p = await browser.newPage({ viewport: { width: 1400, height: 900 } });
    p.errors = []; p.on("pageerror", e => p.errors.push(e.message)); p.on("console", m => { if (m.type() === "error") p.errors.push(m.text()); });
    await p.goto(url(seed)); await p.waitForTimeout(300);
    if (pause && await p.$("#btnPlay")) await p.click("#btnPlay"); // pause the RAF loop; we step the sim ourselves
    return p;
  };
  // click the canvas at tile index t (the real click handler resolves the tile)
  const clickTile = async (p, t) => { const r = await p.evaluate(t => { const b = document.getElementById("cv").getBoundingClientRect(), g = BLOOM_API.geometry();
    return { x: b.left + ((t % g.W) + 0.5) * g.tile, y: b.top + (((t / g.W) | 0) + 0.5) * g.tile }; }, t); await p.mouse.click(r.x, r.y); };
  // play a build through REAL shop clicks, with a 4 s "reaction" after each upgrade becomes affordable
  async function playRecipe(p, plan, { maxTicks = 9000, watchMasses = false } = {}) {
    let i = 0, affordAt = null, lastSample = -Infinity; const buys = [], masses = [];
    for (let t = 0; t < maxTicks; t += 5) {
      await p.evaluate(() => { BLOOM_API.advance(5); refreshShop(); });
      const st = await p.evaluate(() => ({ ...BLOOM_API.state(), mass: BLOOM_API.livingByMass(), x: BLOOM_API.crossing() }));
      if (watchMasses && st.ticks - lastSample >= 100) { lastSample = st.ticks; masses.push({ tick: st.ticks, mass: st.mass, footholds: st.x.footholds }); }
      if (st.won) return { won: true, secs: st.ticks * TICK_S, buys, masses, st };
      if (i < plan.length) {
        const off = await p.$eval(`button.buy[data-id="${plan[i]}"]`, b => b.classList.contains("off"));
        if (!off) { affordAt ??= st.ticks; if (st.ticks - affordAt >= 25) { await p.click(`button.buy[data-id="${plan[i]}"]`); buys.push({ id: plan[i], s: Math.round(st.ticks * TICK_S) }); i++; affordAt = null; } }
      }
    }
    return { won: false, buys, masses };
  }

  // ---------------------------------------------------------------- First Bloom stays the default
  console.log("# First Bloom (no query string)");
  {
    const p = await open(undefined);
    const r = await p.evaluate(() => ({ title: document.title, h1: document.querySelector("header h1").innerText, runId: document.getElementById("runId").textContent,
      run: BLOOM_API.run, shop: [...document.querySelectorAll("button.buy")].map(b => b.dataset.id), water: BLOOM_API.geometry().water }));
    check(r.title === "BLOOM — Next Playable Slice: First Bloom (Eden run)" && /first bloom/.test(r.h1) && r.runId === "" && r.run.kind === "authored" && r.water === 0,
      "no parameters → the accepted First Bloom run (same title/header, no run-identity line, no water)", `${r.shop.length} upgrades`);
    check(!r.shop.includes(WATERBORNE.id) && r.shop.length === traits.length - 1, "Waterborne Seeds is absent from the First Bloom shop (sim.offered)");
    await shot(p, "first-bloom.png");
    check(p.errors.length === 0, "no browser errors (First Bloom)", p.errors.join(" | ")); await p.close();
  }

  // ---------------------------------------------------------------- seed 28: full UI-driven run
  console.log("\n# Ocean Archipelago public seed 28 (full run through real controls)");
  const ref28 = BLOOM.generateFromArchetype(OA, 28, { config, traits }); // Node reference, same production path
  {
    const p = await open(28);
    const id = await p.evaluate(() => ({ run: BLOOM_API.run, runId: document.getElementById("runId").textContent, title: document.title,
      keys: Object.keys(BLOOM_RUN.planet.archetype), text: document.body.innerText, fnIsReal: typeof BLOOM.generateFromArchetype === "function" && BLOOM.generateFromArchetype === BLOOM.archetype.generateFromArchetype }));
    check(id.fnIsReal && id.run.kind === "procedural" && id.run.publicSeed === 28 && id.run.attempt === ref28.archetype.attempt && id.run.planetId === ref28.id &&
      JSON.stringify(id.run.validatedLayers) === "[1,2,3,4,5,6,7,8]",
      "the page generated seed 28 through BLOOM.generateFromArchetype: same accepted attempt and planet as the Node production path, layers 1–8",
      `attempt ${id.run.attempt}, ${id.run.name} (${id.run.planetId})`);
    check(/public seed 28/.test(id.runId) && /attempt 8/.test(id.runId) && id.runId.includes(id.run.name) && id.runId.includes("Ocean Archipelago"),
      "run identity (archetype, public seed, attempt, planet name/id) is visible in the footer", id.runId);
    check(!id.keys.includes("witness") && !id.keys.includes("strategies") && !/Crossing:|signature|witness|Adapt\(\d\)/i.test(id.text),
      "no witness plan, strategy signature or recommended purchase reaches the page", `planet.archetype keys: ${id.keys.join(",")}`);

    // water + landmasses render, water distinct from land
    const g = await p.evaluate(() => { const S = BLOOM_API.sim, M = S.map, c = document.getElementById("cv").getContext("2d"), d = window.devicePixelRatio || 1, T = BLOOM_API.geometry().tile;
      const px = t => [...c.getImageData(((t % M.W) + 0.5) * T * d, (((t / M.W) | 0) + 0.5) * T * d, 1, 1).data].slice(0, 3);
      const wt = []; for (let t = 0; t < M.N && wt.length < 40; t += 37) if (M.TILEMAP[t] < 0) wt.push(t);
      const lt = []; for (let t = 0; t < M.N && lt.length < 40; t += 37) if (M.TILEMAP[t] >= 0) lt.push(t);
      return { geo: BLOOM_API.geometry(), water: wt.map(px), land: lt.map(px), wt: wt[0], lt: lt }; });
    const blue = c => c[2] > c[0] + 40 && c[2] > c[1] + 20;
    check(g.geo.landmasses >= 3 && g.geo.water > 0 && g.water.length >= 20 && g.water.every(blue) && g.land.filter(blue).length === 0,
      "multiple landmasses and water render; sampled water pixels are water-blue, no sampled land pixel is", `${g.geo.landmasses} landmasses · ${g.geo.water} water / ${g.geo.land} land tiles`);
    // click water → water note, not a plantable section
    await clickTile(p, g.wt);
    const wv = await p.evaluate(() => ({ head: document.querySelector("#inspect h2").innerText, body: document.getElementById("inspect").innerText, sel: selected }));
    check(wv.head === "WATER" && /not count toward coverage/.test(wv.body) && wv.sel === -1, "clicking water shows a non-colonizable water note (no section selected)", wv.body.split("\n").slice(1, 3).join(" / "));
    // click an island section → normal four-category readout + limiting factor, plus the geography note
    const island = await p.evaluate(() => { const g = BLOOM_API.geometry(), M = BLOOM_API.sim.map; const i = M.SEC.findIndex((_, k) => g.mass[k] !== g.originMass);
      return { i, tile: M.SEC_TILES[i][(M.SEC_TILES[i].length / 2) | 0] }; });
    await clickTile(p, island.tile);
    const iv = await p.evaluate(i => { const e = BLOOM_API.sim.evaluate(i);
      return { sel: selected, cats: [...document.querySelectorAll("#inspect .cat .lbl")].map(x => x.innerText), limit: document.querySelector("#inspect .limit").innerText,
        geo: (document.querySelector("#inspect .geo") || {}).innerText, limitKey: e.limitKey, blocked: e.limitF < BLOOM_API.sim.config.categories.blockedBelow }; }, island.i);
    check(iv.sel === island.i && iv.cats.join() === "Temperature,Water,Soil,Hazard" && (iv.blocked ? /Growth blocked/.test(iv.limit) : /Thriving/.test(iv.limit)),
      "clicking a generated island section shows Temperature/Water/Soil/Hazard and the one limiting factor, as on authored sections", iv.limit.split("\n")[0]);
    check(/Island across water/.test(iv.geo || "") && /ordinary spread cannot cross/.test(iv.geo), "…plus a separate geography note: access across water vs the ground's environment", iv.geo);
    // previews: Adapt still works; Waterborne Seeds explains geographic access vs suitability
    await p.hover('button.buy[data-id="cold"]');
    const pc = await p.evaluate(() => document.getElementById("log").textContent);
    check(/^Cold Tolerance — /.test(pc), "Adapt purchase preview still works on a generated world", pc);
    await p.hover(`button.buy[data-id="${WATERBORNE.id}"]`);
    const pw = await p.evaluate(() => ({ log: document.getElementById("log").textContent, gain: preview.gain.length, hostile: (preview.reachHostile || []).length }));
    check(/seeds float across water gaps of up to 6 tiles/.test(pw.log) && /Reachable: \d+ region/.test(pw.log) && (pw.gain + pw.hostile) > 0 && new RegExp(`${pw.gain} can take root now \\(green outline\\), ${pw.hostile} reachable but hostile now`).test(pw.log),
      "Waterborne Seeds preview names the regions it makes reachable, split into 'can take root' vs 'reachable but hostile'", pw.log);
    await shot(p, "seed13-waterborne-preview.png");
    await p.mouse.move(5, 5); await p.evaluate(() => { selected = -1; renderInspect(); });

    // play strategy A of the accepted world (a known valid build) via real shop clicks
    const plan = ref28.archetype.strategies.list[0].purchases.map(x => x[0]); // (BLOOM-027B: the accepted world's own strategy A — seed 28: seedOut, waterSeeds, salt, cold, rad, heat; was Ocean 13's seedOut, waterSeeds, salt, cold)
    const run = await playRecipe(p, plan, { watchMasses: true });
    const origin = await p.evaluate(() => BLOOM_API.geometry().originMass);
    const firstFoothold = run.masses.find(m => Object.entries(m.mass).some(([k, n]) => +k !== origin && n > 0));
    const other = firstFoothold && Object.entries(firstFoothold.mass).find(([k, n]) => +k !== origin && n > 0)[0];
    const later = run.masses.filter(m => firstFoothold && m.tick >= firstFoothold.tick + 400);
    const grew = firstFoothold && later.length && later[later.length - 1].mass[other] >= firstFoothold.mass[other] + 20;
    check(run.buys.some(b => b.id === WATERBORNE.id) && run.buys.length === plan.length, "Waterborne Seeds bought through the real shop button (with the rest of the build)",
      run.buys.map(b => `${b.id} @ ${b.s} s`).join(" → "));
    check(!!firstFoothold && firstFoothold.footholds > 0 && grew,
      "a water crossing establishes, and ordinary spread then continues on the new landmass",
      firstFoothold ? `first foothold by tick ${firstFoothold.tick} on landmass ${other} (${firstFoothold.mass[other]} living) → ${later.length ? later[later.length - 1].mass[other] : "?"} living by tick ${later.length ? later[later.length - 1].tick : "?"}` : "no foothold");
    const fin = await p.evaluate(() => { const S = BLOOM_API.sim, M = S.map; let wl = 0; for (let t = 0; t < M.N; t++) if (M.TILEMAP[t] < 0 && S.state[t] !== S.BAR) wl++;
      return { cov: S.coverage(), land: M.LAND, n: M.N, water: M.TILEMAP.filter(v => v < 0).length, waterNotBarren: wl, living: M.LAND_TILES.filter(t => S.state[t] === S.LIV).length }; });
    check(run.won && fin.cov >= 0.70 && fin.land + fin.water === fin.n && Math.abs(fin.cov - fin.living / fin.land) < 1e-9 && fin.waterNotBarren === 0,
      "seed 28 reaches the 70% win through real UI clicks; coverage = living land / land tiles, water never colonized",
      `win at ${Math.round(run.secs || 0)} s · ${(fin.cov * 100).toFixed(1)}% of ${fin.land} land tiles (${fin.water} water tiles excluded)`);
    const rep = await p.evaluate(() => ({ on: document.getElementById("reportModal").classList.contains("on"), text: document.getElementById("report").innerText,
      analog: [...document.querySelectorAll(".analog li")].map(li => li.innerText), labels: SEC.map((_, i) => LABEL[i]) }));
    const namesInReport = rep.labels.filter(n => rep.text.includes(n));
    check(rep.on && rep.text.includes(ref28.name) && /Ocean Archipelago · public seed 28/.test(rep.text) && /Waterborne Seeds/.test(rep.text),
      "Bloom Report opens with the generated planet's identity and the build (Waterborne Seeds listed)", rep.text.split("\n").slice(0, 2).join(" / "));
    check(rep.analog.some(a => a.includes(WATERBORNE.science)) && ["Seed Output", "Salt Handling", "Cold Tolerance"].every(n => rep.text.includes(n)),
      "…every bought adaptation is represented; Waterborne Seeds uses its existing science line", `${rep.analog.length} real-plant analogs`);
    check(namesInReport.length > 0 && !FB_NAMES.some(n => rep.text.includes(n)), "…regions bloomed / given up come from this generated run; no First Bloom region names leak",
      (rep.text.match(/Regions bloomed:.*$/m) || [""])[0].slice(0, 140));
    await shot(p, "seed13-report.png");
    await p.evaluate(() => document.getElementById("reportModal").classList.remove("on"));
    await shot(p, "seed13-won-map.png");
    check(p.errors.length === 0, "no browser errors during the seed-28 run", p.errors.join(" | ")); await p.close();
  }
  // screenshot of the crossing: rerun to the first foothold + growth, then capture the map
  {
    const p = await open(28);
    // (BLOOM-027B: the plan is the accepted world's own strategy A — seed 28: seedOut, waterSeeds, salt, cold, rad, heat; was Ocean 13's seedOut, waterSeeds, salt, cold)
    const plan = ref28.archetype.strategies.list[0].purchases.map(x => x[0]); let i = 0, affordAt = null, ft = null;
    for (let t = 0; t < 6000; t += 5) {
      await p.evaluate(() => { BLOOM_API.advance(5); refreshShop(); });
      const st = await p.evaluate(() => ({ ticks: BLOOM_API.state().ticks, f: BLOOM_API.crossing().footholds }));
      if (st.f > 0 && ft === null) ft = st.ticks;
      if (ft !== null && st.ticks >= ft + 250) break;
      if (i < plan.length) { const off = await p.$eval(`button.buy[data-id="${plan[i]}"]`, b => b.classList.contains("off"));
        if (!off) { affordAt ??= st.ticks; if (st.ticks - affordAt >= 25) { await p.click(`button.buy[data-id="${plan[i]}"]`); i++; affordAt = null; } } }
    }
    await p.evaluate(() => draw()); await shot(p, "seed13-crossing.png");
    check(ft !== null, "crossing screenshot captured after the first waterborne foothold", `foothold at tick ${ft} (${Math.round(ft * TICK_S)} s)`); await p.close();
  }

  // ---------------------------------------------------------------- slice interactions on a generated world
  console.log("\n# slice interactions on seed 28 (bubbles, passive Biomass, pause/speed, inspect refresh)");
  {
    const p = await open(28, false);
    const sp = [];
    for (let k = 0; k < 3; k++) { await p.click("#btnSpeed"); sp.push(await p.$eval("#btnSpeed", b => b.textContent)); }
    await p.waitForTimeout(400); const t1 = await p.evaluate(() => BLOOM_API.state().ticks);
    await p.click("#btnPlay"); const paused = await p.$eval("#btnPlay", b => b.textContent);
    const tA = await p.evaluate(() => BLOOM_API.state().ticks); await p.waitForTimeout(400); const tB = await p.evaluate(() => BLOOM_API.state().ticks);
    check(sp.join("|") === "▶ 2×|▶ 4×|▶ 1×" && t1 > 0 && /play/.test(paused) && tA === tB, "speed cycles 1×→2×→4×→1×, the run advances in real time, pause stops it", `${t1} ticks live, paused at ${tA}`);
    const b0 = await p.evaluate(() => BLOOM_API.state().biomass); await p.evaluate(() => BLOOM_API.advance(300)); const b1 = await p.evaluate(() => BLOOM_API.state().biomass);
    check(b1 > b0, "passive Biomass accrues on a generated world", `${b0} → ${b1} over 300 ticks`);
    let got = null;
    for (let k = 0; k < 200 && !got; k++) { await p.evaluate(() => { BLOOM_API.advance(10); draw(); });
      got = await p.evaluate(() => { const b = BLOOM_API.sim.bubbles[0]; if (!b) return null; const r = document.getElementById("cv").getBoundingClientRect(), T = BLOOM_API.geometry().tile;
        return { x: r.left + b.x * T, y: r.top + b.y * T, bio: BLOOM_API.sim.biomass }; }); }
    if (got) await p.mouse.click(got.x, got.y);
    const after = await p.evaluate(() => ({ bio: BLOOM_API.sim.biomass, n: BLOOM_API.sim.bubbles.length }));
    check(!!got && after.bio >= got.bio + config.econ.bubbleValue - 1e-6, "a Biomass bubble appears and clicking it on the map collects it", got ? `+${(after.bio - got.bio).toFixed(0)} Biomass` : "no bubble");
    check(p.errors.length === 0, "no browser errors (interactions)", p.errors.join(" | ")); await p.close();
  }

  // ---------------------------------------------------------------- seed 8: lighter smoke
  console.log("\n# Ocean Archipelago public seed 8 (smoke)");
  {
    const ref8 = BLOOM.generateFromArchetype(OA, 8, { config, traits }), p = await open(8);
    const r = await p.evaluate(() => ({ run: BLOOM_API.run, geo: BLOOM_API.geometry(), shop: [...document.querySelectorAll("button.buy")].map(b => b.dataset.id) }));
    check(r.run.publicSeed === 8 && r.run.attempt === ref8.archetype.attempt && r.run.planetId === ref8.id && r.geo.landmasses >= 3 && r.geo.water > 0 && r.shop.includes(WATERBORNE.id),
      "seed 8 loads through the production path with water, several landmasses and Waterborne Seeds offered", `attempt ${r.run.attempt} · ${r.run.name} · ${r.geo.landmasses} landmasses`);
    // seed 8's nearer islands are saline: a valid build buys Salt Handling before the crossing pays off
    const run = await playRecipe(p, ["seedOut", "salt", WATERBORNE.id], { maxTicks: 4000 });
    let f = 0; for (let k = 0; k < 150 && !f; k++) f = await p.evaluate(() => { BLOOM_API.advance(20); return BLOOM_API.crossing().footholds; });
    check(run.buys.map(b => b.id).join() === `seedOut,salt,${WATERBORNE.id}` && f > 0, "Seed Output, Salt Handling and Waterborne Seeds bought via real buttons; a crossing establishes",
      `${run.buys.map(b => `${b.id} @ ${b.s} s`).join(" → ")} · ${f} foothold(s)`);
    // (BLOOM-008 opens with the origin already selected; start from no selection so this click selects it)
    const sec = await p.evaluate(() => { selected = -1; renderInspect(); const M = BLOOM_API.sim.map; return M.SEC_TILES[M.ORIGIN][0]; }); await clickTile(p, sec);
    const iv = await p.evaluate(() => ({ name: document.querySelector("#inspect .secname").innerText, cats: document.querySelectorAll("#inspect .cat").length }));
    check(/ORIGIN/.test(iv.name) && iv.cats === 4, "inspecting a seed-8 section works", iv.name.replace(/\n/g, " "));
    await p.evaluate(() => draw()); await shot(p, "seed8.png");
    check(p.errors.length === 0, "no browser errors (seed 8)", p.errors.join(" | ")); await p.close();
  }

  // ---------------------------------------------------------------- seed 35: explicit failure
  console.log("\n# Ocean Archipelago public seed 114 (known generation failure; was 35 before BLOOM-027B)");
  {
    let nodeErr = null; try { BLOOM.generateFromArchetype(OA, 114, { config, traits }); } catch (e) { nodeErr = e; }
    const p = await open(114, false); await p.waitForTimeout(500);
    const r = await p.evaluate(() => ({ fail: (document.getElementById("genFail") || {}).innerText || "", canvas: !!document.getElementById("cv"), shop: document.querySelectorAll("button.buy").length,
      run: window.BLOOM_API && BLOOM_API.run, hasSim: !!(window.BLOOM_API && BLOOM_API.sim), title: document.title }));
    check(nodeErr && nodeErr.attempts.length === OA.generation.maxAttempts && r.run.failed && /public seed 114/.test(r.fail) && /no acceptable world in 24 attempts/.test(r.fail),
      "seed 114 (was 35 before BLOOM-027B) shows the explicit generation-failure state naming the public seed", r.fail.split("\n").filter(Boolean).slice(0, 3).join(" / "));
    check(!r.canvas && r.shop === 0 && !r.hasSim && /No other seed was substituted/.test(r.fail), "…and no world starts (no map, no shop, no simulation; no substitute seed)");
    await shot(p, "seed114-failure.png");
    check(p.errors.length === 0, "no browser errors (failure state)", p.errors.join(" | ")); await p.close();
    const q = await open("12x", false); const bad = await q.evaluate(() => (document.getElementById("genFail") || {}).innerText || "");
    check(/must be a whole number/.test(bad) && q.errors.length === 0, "a malformed seed is also an explicit failure, never a fallback world", bad.split("\n")[2] || ""); await q.close();
  }

  await browser.close();
  console.log(`\n${fails ? fails + " check(s) FAILED" : "ALL CHECKS PASS"}  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  process.exit(fails ? 1 : 0);
})();
