// BLOOM-038 design audit — VISUAL STATE ATLAS: a deterministic representative matrix of the released game's screens and run states,
// captured at 1024×768 · 1440×900 · 2560×1440 (gameplay) and also 390×844 (planning screens with phone layouts), with per-screenshot
// layout metrics (tools/research/design-audit/atlas-lib.js MEASURE). READ-ONLY: nothing in the product is changed.
//
//   NODE_PATH="$(npm root -g)" node tools/research/design-audit/atlas.js [--only H1,C3,P] [--append]
//
// Routes: "app" = the released index.html (title → Expedition / Challenges / Training, real clicks; ?bg=, ?sector= and
// MENU_DEV.entry.nextLaunchSeed fix the painting, the survey sector and the Challenge launch); "harness" = demos/demo-run.html (the same
// GameSession + Planet View + decision rooms) for Expedition worlds chosen by archetype + seed + species. Time is skipped with
// BLOOM_API.advance (the run is left paused by it); purchases go through the run UI adapter's real buy action (the one the room buttons
// call), choosing what the previews say opens the most regions; Biomass grants (only when stuck) are recorded. Every capture is
// recorded in docs/evidence/bloom-038/visual-atlas-index.json (route, species, world, seed / launch seed, phase, coverage, UI state,
// viewport, condition tags, purchases, metrics).
"use strict";
const path = require("path"), fs = require("fs");
const L = require("./atlas-lib.js");
const ROOT = L.ROOT, EVD = path.join(ROOT, "docs/evidence/bloom-038"), OUTD = path.join(EVD, "visual-atlas"), INDEX = path.join(EVD, "visual-atlas-index.json");
const argv = process.argv, argOf = k => { const i = argv.indexOf(k); return i > 0 ? argv[i + 1] : null; };
const ONLY = argOf("--only") ? argOf("--only").split(",") : null, APPEND = argv.includes("--append");
const GVP = [[1024, 768], [1440, 900], [2560, 1440]], PVP = [[390, 844], [1024, 768], [1440, 900], [2560, 1440]];
const fmtVp = ([w, h]) => `${w}x${h}`;
const t0 = Date.now();

// ---------------------------------------------------------------- the matrix
// phase targets (land coverage): landing (as it opens) · early (~4%) · mid (~20%) · cov45 · late (~58%) · nearBloom (~65%) · bloom (the win) · extinction
const T = { early: 0.04, mid: 0.20, cov45: 0.45, late: 0.58, nearBloom: 0.65, bloom: 0.70 };
const FULL = ["base", "selected:origin", "selected:blocked", "regions", "regions:colony", "mapview", "adapt", "adapt:preview", "spread", "terraform", "home:preview", "banner:wouldhelp"];
const RUNS = [
  { id: "H1", route: "harness", archetype: "desert_world", seed: 5, species: "cinder_rosette", tags: ["very-dry", "little-water", "warm"],
    phases: [["landing", null, FULL], ["early", T.early, ["base", "selected:blocked"]], ["mid", T.mid, ["base", "adapt", "lens:water"]], ["cov45", T.cov45, ["base", "selected:living", "colony-badges"]],
      ["late", T.late, ["base", "spread"]], ["nearBloom", T.nearBloom, ["base", "selected:blocked", "lens:temperature"]], ["bloom", T.bloom, ["report"]]] },
  { id: "H2", route: "harness", archetype: "frozen_world", seed: 26, species: "woolly_candle", tags: ["very-cold", "high-radiation", "little-water"],
    phases: [["landing", null, ["base", "selected:blocked", "lens:water", "terraform"]], ["mid", T.mid, ["base", "terraform"]], ["cov45", T.cov45, ["base"]], ["nearBloom", T.nearBloom, ["base", "selected:living"]], ["bloom", T.bloom, ["report"]]] },
  { id: "H3", route: "harness", archetype: "ocean_archipelago", seed: 21, species: "reed_spire", tags: ["mostly-water", "very-wet"],
    phases: [["landing", null, ["base", "selected:blocked", "spread", "home:preview"]], ["mid", T.mid, ["base", "selected:living"]], ["cov45", T.cov45, ["base"]], ["nearBloom", T.nearBloom, ["base"]]] },
  { id: "H4", route: "harness", archetype: "ocean_archipelago", seed: 33, species: "organic_hybrid", tags: ["salt", "very-wet", "mostly-water"],
    phases: [["landing", null, ["base", "selected:blocked", "adapt"]], ["mid", T.mid, ["base"]], ["late", T.late, ["base"]]] },
  { id: "H5", route: "harness", archetype: "desert_world", seed: 57, species: "organic_hybrid", tags: ["high-radiation", "very-dry"],
    phases: [["landing", null, ["base", "selected:blocked", "lens:hazard"]], ["cov45", T.cov45, ["base"]]] },
  { id: "H6", route: "harness", archetype: "frozen_world", seed: 1, species: "reed_spire", tags: ["very-cold", "more-water-frozen"],
    phases: [["landing", null, ["base", "selected:blocked", "regions"]], ["mid", T.mid, ["base"]]] },
  // Challenges through the released app (hub → BEGIN CHALLENGE → [species] → Challenge Planet Dossier → BEGIN)
  { id: "C1", route: "app-challenge", challenge: "dying_world", launchSeed: 1, species: "cinder_rosette", tags: ["scenario-pressure", "drying", "extinction"],
    phases: [["landing", null, ["base", "scenario:details", "selected:origin"]], ["decline", "advance:600", ["base", "scenario:details", "selected:blocked"]], ["extinctionWarning", "extinction-warning", ["base"]], ["extinction", "extinction", ["report"]]] },
  { id: "C2", route: "app-challenge", challenge: "native_competition", launchSeed: 2, species: "organic_hybrid", tags: ["dense-native-vegetation", "native-fronts"],
    phases: [["landing", null, ["base", "selected:native", "scenario:details", "regions"]], ["mid", T.mid, ["base", "selected:native"]], ["cov30", 0.30, ["base"]]] },
  { id: "C3", route: "app-challenge", challenge: "volatile_climate", launchSeed: 1, species: "cinder_rosette", tags: ["climate-instability"],
    phases: [["landing", null, ["base", "terraform"]], ["shock", "shock", ["climate:warning", "climate:active", "scenario:details"]]] },
  { id: "C4", route: "app-challenge", challenge: "low_tide", launchSeed: 1, species: "organic_hybrid", tags: ["prescribed-start", "salt", "mostly-water", "scenario-pressure"],
    phases: [["landing", null, ["base", "selected:origin", "adapt"]], ["mid", T.mid, ["base"]]] },
  { id: "C5", route: "app-challenge", challenge: "oasis_line", launchSeed: 1, species: "reed_spire", tags: ["refuge", "low-arrival", "dense-native-vegetation", "very-dry"],
    phases: [["landing", null, ["base", "selected:origin", "selected:native", "scenario:details"]], ["mid", T.mid, ["base"]]] },
  { id: "C7", route: "app-challenge", challenge: "oasis_line", launchSeed: 3, species: "reed_spire", tags: ["refuge", "protected-landing-refuge", "low-arrival", "dense-native-vegetation"],
    phases: [["landing", null, ["base", "selected:origin", "regions", "adapt"]]] },
  { id: "C6", route: "app-challenge", challenge: "thin_air", launchSeed: 1, species: "woolly_candle", tags: ["scenario-pressure", "completion-condition", "warm"],
    phases: [["landing", null, ["base", "scenario:details", "selected:origin"]], ["mid", T.mid, ["base", "scenario:details"]]] },
  // Expedition through the released app (Species Selection → Destination Survey → focus → Begin Expedition) + the report
  { id: "E1", route: "app-expedition", sector: 7, species: "organic_hybrid", tags: ["expedition"],
    phases: [["landing", null, ["base", "selected:origin"]], ["bloom", T.bloom, ["report"]]] },
  { id: "TR", route: "app-training", species: "organic_hybrid", tags: ["training"], phases: [["training", null, ["coach:start", "coach:next", "coach:room"]]] },
];
const PLANNING = { id: "P", route: "app", bg: 3, sector: 7 };

// ---------------------------------------------------------------- state machinery
async function reset(p) {
  await L.closeRoom(p).catch(() => {});
  await p.evaluate(() => { const PV = BLOOM.planetView.instance, A = BLOOM_RUN_UI.adapter; const s = PV.state(); if (s.lensOpen) document.querySelector('.pv-tool[data-tool="mapview"]').click();
    if (s.lens) PV.setLens(null); if (s.scenarioOpen) { const m = document.querySelector("#pvScn .more"); if (m) m.click(); } if (A.activePreview && A.activePreview()) A.actions.clearPreview(); A.actions.deselect(); }).catch(() => {});
  await p.mouse.move(2, 2); await L.settle(p, 250);
}
async function pickRegion(p, kind) {
  return p.evaluate(kind => { const A = BLOOM_RUN_UI.adapter, R = A.regions(); let c = [];
    if (kind === "origin") c = R.filter(r => r.isOrigin);
    else if (kind === "blocked") c = R.filter(r => r.blocked && !r.isOrigin).sort((a, b) => b.area - a.area);
    else if (kind === "living") c = R.filter(r => r.living > 0 && !r.isOrigin).sort((a, b) => b.living - a.living);
    else if (kind === "native") { let comp = null; try { comp = BLOOM_API.competition(); } catch (e) { /* none */ } if (comp && comp.enabled) { const sc = comp.regions.map((x, i) => ({ i, x })); const pick = sc.filter(o => o.x && (o.x.contested || o.x.nativeShare > 0.3 || o.x.native > 0)).sort((a, b) => ((b.x.native || b.x.nativeShare || 0) - (a.x.native || a.x.nativeShare || 0))); c = pick.map(o => R[o.i]); } if (!c.length) c = R.filter(r => r.blocked).sort((a, b) => b.area - a.area); }
    const r = c[0] || R[0]; return { index: r.index, name: r.name, blocked: r.blocked, refuge: r.refuge, isOrigin: r.isOrigin, limitKey: r.limitKey }; }, kind);
}
// each state: enter(p) → description; re-entered after every resize (idempotent), so hovers and popovers are placed at that viewport
const STATES = {
  base: async () => ({}),
  "selected:origin": async p => sel(p, "origin"), "selected:blocked": async p => sel(p, "blocked"), "selected:living": async p => sel(p, "living"), "selected:native": async p => sel(p, "native"),
  regions: async p => { await L.openRoom(p, "region"); return {}; },
  "regions:colony": async p => { await L.openRoom(p, "region"); await p.click(".dr .dr-room:not([hidden]) #drtab-colony").catch(() => {}); await L.settle(p, 250); return {}; },
  adapt: async p => { await L.openRoom(p, "adapt"); return {}; }, spread: async p => { await L.openRoom(p, "spread"); return {}; }, terraform: async p => { await L.openRoom(p, "terraform"); return {}; },
  "adapt:preview": async p => { await L.openRoom(p, "adapt"); const id = await bestNode(p, "Adapt"); if (id) { await p.hover(`.dr .dr-room:not([hidden]) .node[data-node="${id}"]`).catch(() => {}); await L.settle(p, 350); } return { previewed: id }; },
  mapview: async p => { const open = await p.evaluate(() => BLOOM.planetView.instance.state().lensOpen); if (!open) await p.click('.pv-tool[data-tool="mapview"]'); await L.settle(p, 200);
    await p.click('#pvLens .pv-lb[data-lens="Temperature"]').catch(() => {}); await L.settle(p, 300);
    if (!(await p.evaluate(() => BLOOM.planetView.instance.state().lensOpen))) { await p.click('.pv-tool[data-tool="mapview"]'); await L.settle(p, 250); } return { lens: "Temperature", popoverOpen: true }; },
  "lens:water": async p => lens(p, "Water"), "lens:temperature": async p => lens(p, "Temperature"), "lens:hazard": async p => lens(p, "Hazard"),
  "home:preview": async p => { const id = await bestNode(p, null); if (id) await p.evaluate(id => BLOOM_RUN_UI.adapter.actions.preview(id), id); await L.settle(p, 350); return { previewed: id, via: "adapter.actions.preview (the deliberate player preview; outline on the home map)" }; },
  "banner:wouldhelp": async p => { const r = await sel(p, "blocked"); const h = await p.$("#pvBanner .hb[data-item]"); if (h) { await h.hover(); await L.settle(p, 350); } return { ...r, hovered: !!h }; },
  "scenario:details": async p => { const open = await p.evaluate(() => BLOOM.planetView.instance.state().scenarioOpen); if (!open) await p.click("#pvScn .more").catch(() => {}); await L.settle(p, 250); return {}; },
  "colony-badges": async p => ({}),
  report: async p => ({}),
  "climate:warning": async () => ({}), "climate:active": async () => ({}),
};
async function sel(p, kind) { const r = await pickRegion(p, kind); const how = await L.clickRegion(p, r.index); await p.mouse.move(2, 2); await L.settle(p, 200); return { region: r, how }; }
async function lens(p, name) { await p.evaluate(n => BLOOM.planetView.instance.setLens(n), name); await L.settle(p, 300); return { lens: name, via: "Map View lens (planetView.setLens, the popover's own action)" }; }
async function bestNode(p, board) {
  return p.evaluate(board => { const A = BLOOM_RUN_UI.adapter; const its = A.upgrades().flatMap(b => b.items).filter(u => (!board || u.board === board) && u.rules !== false && u.tier < u.maxTier);
    const sc = its.map(u => ({ id: u.id, g: ((A.previewOf(u.id) || {}).gain || []).length })).sort((a, b) => b.g - a.g); return sc.length ? sc[0].id : null; }, board);
}

// ---------------------------------------------------------------- run
(async () => {
  const pw = require("playwright"); const srv = await L.serve(); const O = srv.O;
  const browser = await pw.chromium.launch();
  let index = { shots: [], scenes: [] };
  if (APPEND && fs.existsSync(INDEX)) { const old = JSON.parse(fs.readFileSync(INDEX, "utf8")); index.shots = old.shots || []; index.scenes = old.scenes || []; }
  const want = id => !ONLY || ONLY.includes(id);
  if (ONLY) { index.shots = index.shots.filter(s => !ONLY.includes(s.runId)); index.scenes = index.scenes.filter(s => !ONLY.includes(s.runId)); }
  const shots = [];
  const shoot = L.makeShooter(OUTD, shots, { relTo: EVD });
  const log = (...a) => console.log(`[${Math.round((Date.now() - t0) / 1000)}s]`, ...a);

  // capture one state at the gameplay viewports (resizing in place); 2560 as JPEG
  async function capture(p, run, phase, sceneId, stateName, info, purchases, vps = GVP) {
    for (const vp of vps) {
      await p.setViewportSize({ width: vp[0], height: vp[1] }); await L.settle(p, 500);
      let d = {}; try { d = (await STATES[stateName](p)) || {}; } catch (e) { d = { error: String(e.message || e).slice(0, 160) }; }
      Object.assign(info, d);
      const id = `${sceneId}--${stateName.replace(/[:]/g, "-")}--${fmtVp(vp)}`;
      await shoot(p, id, { runId: run.id, scene: sceneId, route: run.route, species: run.species, archetype: run.archetype || null, seed: run.seed ?? null, challenge: run.challenge || null, launchSeed: run.launchSeed ?? null,
        sector: run.sector ?? null, scenario: run.scenario || null, phase, uiState: stateName, conditionTags: run.tags, purchases: purchases.slice(), notes: Object.keys(d).length ? d : null, gameplay: true }, { jpeg: vp[0] >= 2560, quality: 70 });
    }
    await p.setViewportSize({ width: 1440, height: 900 }); await L.settle(p, 300);
  }

  for (const run of RUNS) {
    if (!want(run.id)) continue;
    log(`# ${run.id} ${run.route} ${run.archetype || run.challenge || run.route} ${run.species || ""}`);
    const c = await L.newContext(browser, 1440, 900), p = await L.newPage(c); const purchases = [], grants = [];
    let worldInfo = {};
    try {
      if (run.route === "harness") {
        await p.goto(`${O}/demos/demo-run.html?archetype=${run.archetype}&seed=${run.seed}&species=${run.species}`); await L.W.harness(p); await L.settle(p, 900);
      } else if (run.route === "app-challenge") {
        await p.goto(`${O}/?bg=3`); await L.W.menu(p); await p.click('.mm-item[data-act="challenges"]'); await L.W.hub(p);
        await p.evaluate(([id, s]) => { MENU_DEV.entry.challengeView.inner.select(id); MENU_DEV.entry.nextLaunchSeed = s; }, [run.challenge, run.launchSeed]); await L.settle(p, 200);
        await p.click(".ch-btn.go");
        const st = await p.waitForFunction(() => { const e = MENU_DEV.entry; return (e.state === "species" && e.speciesView && e.speciesView.inner && !e.covered && e.black.style.display === "none") || (e.state === "challenge-world" && e.worldView && e.worldView.inner && e.worldView.inner.state === "ready" && e.black.style.display === "none") ? e.state : false; }, null, { timeout: 180000, polling: 50 }).then(h => h.jsonValue());
        if (st === "species") { await p.evaluate(sp => MENU_DEV.entry.speciesView.inner.open(sp), run.species); await L.settle(p, 200); await p.click(".ss-btn.go"); }
        await L.W.world(p); await L.settle(p, 700);
        worldInfo = await p.evaluate(() => { const X = MENU_DEV.entry.worldView.inner.instance; return { cell: X.bank && X.bank.cellKey, entry: X.entryIndex, fingerprint: X.fingerprint, species: X.speciesId }; }).catch(() => ({}));
        // the Challenge Planet Dossier (planning screen; phone layout too)
        for (const vp of PVP) { await p.setViewportSize({ width: vp[0], height: vp[1] }); await L.settle(p, 600);
          await shoot(p, `${run.id}-dossier--${fmtVp(vp)}`, { runId: run.id, scene: `${run.id}-dossier`, route: "app", species: run.species, challenge: run.challenge, launchSeed: run.launchSeed, phase: "planning", uiState: "challenge-planet-dossier", conditionTags: run.tags, purchases: [], notes: worldInfo, gameplay: false }, { jpeg: vp[0] >= 1440, quality: 82 }); }
        await p.setViewportSize({ width: 1440, height: 900 }); await L.settle(p, 300);
        await p.click(".cw-btn.go"); await L.W.run(p, 1); await L.settle(p, 900);
      } else if (run.route === "app-expedition") {
        await p.goto(`${O}/?bg=3&sector=${run.sector}`); await L.W.menu(p); await p.click('.mm-item[data-act="begin"]'); await L.W.species(p);
        await p.evaluate(sp => MENU_DEV.entry.speciesView.inner.open(sp), run.species); await L.settle(p, 200); await p.click(".ss-btn.go"); await L.W.survey(p); await L.W.cells(p, 1);
        const i = await p.evaluate(() => MENU_DEV.entry.survey.cells.findIndex(Boolean)); await p.evaluate(i => MENU_DEV.entry.survey.select(i), i);
        await p.waitForFunction(() => MENU_DEV.entry.survey.state === "focus", null, { timeout: 30000 }); await L.settle(p, 700);
        await p.click(".ds-btn.go"); await L.W.run(p, 1); await L.settle(p, 900); worldInfo = { surveyCell: i };
      } else if (run.route === "app-training") {
        await p.goto(`${O}/?bg=3`); await L.W.menu(p); await p.click('.mm-item[data-act="training"]'); await L.W.train(p, 1); await L.settle(p, 900);
      }
      const rs = await L.runState(p); Object.assign(worldInfo, { planet: rs.planet, planetId: rs.planetId, archetype: rs.archetype, seed: rs.seed, species: rs.species, scenario: rs.scenario, challenge: rs.challenge });
      if (!run.archetype) run.archetype = rs.archetype; if (run.seed == null) run.seed = rs.seed; run.scenario = rs.scenario;
      log(`  world ${rs.planet} (${rs.archetype} seed ${rs.seed}) ${rs.species} scenario ${rs.scenario}`);

      for (const [phase, target, states] of run.phases) {
        const sceneId = `${run.id}-${phase}`; const sceneInfo = { phase, target };
        if (run.route === "app-training") { await trainingStates(p, run, sceneId, purchases); index.scenes.push({ id: sceneId, runId: run.id, route: run.route, species: run.species, world: worldInfo, phase, states }); continue; }
        if (typeof target === "number") {
          const r = await L.progressTo(p, target, { grant: 600, step: 10, maxTicks: 30000 }); purchases.push(...r.bought.map(b => ({ ...b, phase }))); grants.push(...r.granted.map(g => ({ ...g, phase })));
          Object.assign(sceneInfo, { reached: r.coverage, ticks: r.ticks, won: r.won, lost: r.lost }); log(`  ${phase}: coverage ${r.coverage} at tick ${r.ticks}${r.won ? " WON" : ""}${r.lost ? " LOST" : ""} (+${r.bought.length} buys, ${r.granted.length} grants)`);
          if (phase === "bloom") { await L.W.report(p).catch(() => {}); await L.settle(p, 900); }
        } else if (target === "extinction") {
          const r = await p.evaluate(async () => { let k = 0; while (!BLOOM_API.sim.lost && !BLOOM_API.sim.won && k < 60000) { BLOOM_API.advance(100); k += 100; await new Promise(r => setTimeout(r, 0)); } return { lost: !!BLOOM_API.sim.lost, ticks: BLOOM_API.sim.ticks, cov: BLOOM_API.coverage() }; });
          Object.assign(sceneInfo, r); log(`  extinction: lost ${r.lost} at tick ${r.ticks}`); await L.W.report(p).catch(() => {}); await L.settle(p, 900);
        } else if (typeof target === "string" && target.startsWith("advance:")) { // time only, no purchases (the player waits)
          const n = +target.split(":")[1]; await p.evaluate(n => BLOOM_API.advance(n), n); await L.settle(p, 500); Object.assign(sceneInfo, { note: `advance(${n}) ticks, no purchases` }); log(`  ${phase}: advanced ${n}`);
        } else if (target === "extinction-warning") {
          const r = await p.evaluate(async () => { let k = 0; const A = BLOOM_RUN_UI.adapter; while (k < 20000) { const P = A.scenario().pressure; if (!P || P.extinctionIn !== null || BLOOM_API.sim.lost) break; BLOOM_API.advance(5); k += 5; await new Promise(r => setTimeout(r, 0)); } const P = A.scenario().pressure; return { advanced: k, extinctionIn: P && P.extinctionIn, lost: BLOOM_API.sim.lost }; });
          Object.assign(sceneInfo, r); log(`  ${phase}: ${JSON.stringify(r)}`); await L.settle(p, 500);
        } else if (target === "shock") { await shockStates(p, run, sceneId, purchases, grants); index.scenes.push({ id: sceneId, runId: run.id, route: run.route, species: run.species, world: worldInfo, ...sceneInfo, states }); continue; }
        else { await p.evaluate(() => BLOOM_API.advance(12)); await L.settle(p, 500); sceneInfo.note = "landing: advance(12) ticks (≈2 s) so the first seedlings show; the run is left paused"; }
        if (phase === "cov45" && states.includes("colony-badges")) { // a player's colony choices: growth focus on three living regions + one local upgrade (badges on the map)
          const g = await p.evaluate(() => { const A = BLOOM_RUN_UI.adapter, out = []; const liv = A.regions().filter(r => r.living > 0).sort((a, b) => b.living - a.living).slice(0, 3);
            ["roots", "leaves", "seeds"].forEach((m, k) => { if (liv[k] && A.actions.setGrowthFocus(liv[k].index, m)) out.push({ focus: m, region: liv[k].name }); });
            BLOOM_API.addBiomass(400); if (liv[0] && A.actions.buyLocalUpgrade(liv[0].index, "seedReserve")) out.push({ local: "seedReserve", region: liv[0].name, grant: 400 }); return out; });
          purchases.push(...g.map(x => ({ ...x, phase }))); await L.settle(p, 400); }
        for (const s of states) { await reset(p); const info = {}; await capture(p, run, phase, sceneId, s, info, purchases.concat(grants.map(g => ({ grant: g })))); }
        await reset(p);
        index.scenes.push({ id: sceneId, runId: run.id, route: run.route, species: run.species, archetype: run.archetype, seed: run.seed, challenge: run.challenge || null, launchSeed: run.launchSeed ?? null, scenario: run.scenario, world: worldInfo, conditionTags: run.tags, ...sceneInfo, states, purchasesSoFar: purchases.length, grantsSoFar: grants.slice() });
      }
    } catch (e) { log(`  ERROR ${run.id}: ${String(e.stack || e).slice(0, 400)}`); index.scenes.push({ id: `${run.id}-error`, runId: run.id, error: String(e.message || e).slice(0, 300) }); }
    if (p.errs.length) log(`  page errors: ${p.errs.slice(0, 3).join(" | ")}`);
    index.scenes.filter(s => s.runId === run.id).forEach(s => { s.pageErrors = p.errs.slice(0, 5); s.purchases = purchases; });
    await c.close(); flush();
  }

  // ---------------------------------------------------------------- planning screens (title, species, survey, hub, Training coach in TR)
  async function trainingStates(p, run, sceneId, purchases) {
    await capture(p, run, "training", sceneId, "base", {}, purchases); // coach: the first lesson (start)
    rename("base", "coach-start");
    await p.click("#pvPause").catch(() => {}); await p.waitForTimeout(400); // Play (real button); the world runs in real time for these captures
    await p.waitForFunction(() => { const d = BLOOM_TRAINING_UI.guide.director; return d && d.current && d.current.id !== "start"; }, null, { timeout: 15000 }).catch(() => {});
    await p.waitForTimeout(2500); await L.settle(p, 300);
    await capture(p, run, "training", sceneId, "base", {}, purchases); rename("base", "coach-next");
    await p.click('.pv-tool[data-tool="adapt"]').catch(() => {}); await L.W.room(p, "adapt").catch(() => {}); await L.settle(p, 600);
    await capture(p, run, "training", sceneId, "base", {}, purchases); rename("base", "coach-room");
  }
  function rename(from, to) { for (const s of shots) if (s.uiState === from && s.runId === "TR" && !s.renamed) { const nf = s.file.replace(`--${from}--`, `--${to}--`); fs.renameSync(path.join(EVD, s.file), path.join(EVD, nf)); s.file = nf; s.id = s.id.replace(`--${from}--`, `--${to}--`); s.uiState = to; s.renamed = true; } }

  // volatile climate: Terraform steps bought quickly (a player who saved up: Biomass granted and recorded), then wait for the forecast and the shock
  async function shockStates(p, run, sceneId, purchases, grants) {
    await L.openRoom(p, "terraform");
    const g = 3000; await p.evaluate(g => BLOOM_API.addBiomass(g), g); grants.push({ amount: g, for: "terraform steps (volatile climate)", phase: "shock" });
    for (let k = 0; k < 4; k++) { const id = await p.evaluate(() => { const A = BLOOM_RUN_UI.adapter; const u = A.upgrades().flatMap(b => b.items).find(u => u.board === "Terraform" && u.canBuy && (u.id === "warm" || u.id === "dry" || u.id === "cool" || u.id === "humid")); return u ? u.id : null; });
      if (!id) break; await p.click(`.dr .dr-room:not([hidden]) .node[data-node="${id}"]`).catch(() => {}); await L.settle(p, 250); purchases.push({ id, via: "Terraform room node click", phase: "shock" }); }
    await L.closeRoom(p);
    let warned = false, active = false;
    for (let k = 0; k < 400 && !(warned && active); k++) {
      const c = await p.evaluate(() => { const C = BLOOM_RUN_UI.adapter.scenario().climate; if (!C) return null; const ax = Object.values(C.axes); return { pend: ax.some(x => x.pending), shock: ax.some(x => x.shock), level: C.level }; });
      if (!c) break;
      if (c.pend && !warned) { warned = true; await capture(p, run, "shock", sceneId, "climate:warning", { level: c.level }, purchases); }
      if (c.shock && !active) { active = true; await capture(p, run, "shock", sceneId, "climate:active", { level: c.level }, purchases); await capture(p, run, "shock", sceneId, "scenario:details", {}, purchases); break; }
      await p.evaluate(() => BLOOM_API.advance(5));
      if (k % 40 === 39 && !c.pend && !c.shock) { const id = await p.evaluate(() => { const A = BLOOM_RUN_UI.adapter; const u = A.upgrades().flatMap(b => b.items).find(u => u.board === "Terraform" && u.canBuy); if (u && A.actions.buy(u.id)) return u.id; return null; }); if (id) purchases.push({ id, via: "adapter buy (another Terraform step)", phase: "shock" }); }
    }
    log(`  shock: warning ${warned} active ${active}`);
  }

  if (want("P")) {
    log("# P planning screens");
    const c = await L.newContext(browser, 1440, 900), p = await L.newPage(c);
    const pshot = async (sceneId, uiState, meta = {}, vps = PVP, prep = null) => { for (const vp of vps) { await p.setViewportSize({ width: vp[0], height: vp[1] }); await L.settle(p, 600); if (prep) await prep(vp);
      await shoot(p, `${sceneId}--${fmtVp(vp)}`, { runId: "P", scene: sceneId, route: "app", phase: "planning", uiState, conditionTags: [], purchases: [], gameplay: false, ...meta }, { jpeg: vp[0] >= 1440, quality: 82 }); }
      await p.setViewportSize({ width: 1440, height: 900 }); await L.settle(p, 300); };
    try {
      await p.goto(`${O}/?bg=${PLANNING.bg}&sector=${PLANNING.sector}`); await L.W.menu(p); await p.evaluate(() => Promise.all(document.getAnimations().map(a => a.finished.catch(() => {})))); await L.settle(p, 400);
      await pshot("P-title", "title", { notes: { bg: PLANNING.bg } });
      await p.click('.mm-item[data-act="begin"]'); await L.W.species(p); await L.settle(p, 500);
      await pshot("P-species", "species-selection");
      await pshot("P-species-dossier-organic", "species-dossier", { species: "organic_hybrid" }, PVP, async vp => { await p.evaluate(() => MENU_DEV.entry.speciesView.inner.open("organic_hybrid")); await L.settle(p, 400); });
      await pshot("P-species-dossier-woolly", "species-dossier", { species: "woolly_candle" }, PVP, async vp => { await p.evaluate(() => MENU_DEV.entry.speciesView.inner.open("woolly_candle")); await L.settle(p, 400); });
      await p.evaluate(() => MENU_DEV.entry.speciesView.inner.open("organic_hybrid")); await L.settle(p, 300); await p.click(".ss-btn.go"); await L.W.survey(p);
      await L.W.cells(p, 9).catch(() => {}); await L.settle(p, 1200);
      await pshot("P-survey-grid", "destination-survey-grid", { species: "organic_hybrid", sector: PLANNING.sector });
      const i = await p.evaluate(() => MENU_DEV.entry.survey.cells.findIndex(Boolean));
      await p.evaluate(i => MENU_DEV.entry.survey.select(i), i); await p.waitForFunction(() => MENU_DEV.entry.survey.state === "focus", null, { timeout: 30000 }); await L.settle(p, 900);
      const cell = await p.evaluate(i => { const c = MENU_DEV.entry.survey.cells[i]; return c ? JSON.parse(JSON.stringify({ name: c.name || (c.planet && c.planet.name), archetype: c.archetype || (c.planet && c.planet.archetype), seed: c.seed })) : null; }, i).catch(() => null);
      await pshot("P-survey-focus", "destination-survey-focus", { species: "organic_hybrid", sector: PLANNING.sector, notes: { cell: i, world: cell } });
      await p.goto(`${O}/?bg=${PLANNING.bg}`); await L.W.menu(p); await p.click('.mm-item[data-act="challenges"]'); await L.W.hub(p); await L.settle(p, 500);
      for (const id of ["dying_world", "thin_air"]) await pshot(`P-hub-${id}`, "challenge-hub", { challenge: id }, PVP, async vp => { await p.evaluate(([id, phone]) => { const h = MENU_DEV.entry.challengeView.inner; h.select(id); if (phone) h.open(id); }, [id, vp[0] <= 700]); await L.settle(p, 400); });
    } catch (e) { log("  ERROR P: " + String(e.stack || e).slice(0, 400)); }
    index.scenes.push({ id: "P", runId: "P", route: "app", phase: "planning", bg: PLANNING.bg, sector: PLANNING.sector, pageErrors: p.errs.slice(0, 5) });
    await c.close(); flush();
  }

  function flush() {
    const all = index.shots.concat(shots.filter(s => !index.shots.includes(s)));
    const out = { format: "bloom-038-visual-atlas@1", tool: "tools/research/design-audit/atlas.js (+ atlas-run1024.js, atlas-2560.js, contact-sheet.js)", generatedAt: new Date().toISOString(),
      viewports: { gameplay: GVP.map(fmtVp), planning: PVP.map(fmtVp) }, phases: T, notes: "Gameplay captured after BLOOM_API.advance (the run is paused by it); the HUD therefore shows Play. Map labels are read from a page-side hook on the map canvas's fillText (pill rect estimated from the font size). Gameplay 2560 and planning ≥1440 captures are JPEG.",
      scenes: index.scenes, shots: all, contactSheets: (fs.existsSync(INDEX) ? (JSON.parse(fs.readFileSync(INDEX, "utf8")).contactSheets || []) : []) };
    fs.mkdirSync(EVD, { recursive: true }); fs.writeFileSync(INDEX, JSON.stringify(out, null, 1));
  }
  index.shots = index.shots.concat(shots); flushFinal();
  function flushFinal() { const out = JSON.parse(fs.readFileSync(INDEX, "utf8")); out.shots = index.shots; out.scenes = index.scenes; out.generatedAt = new Date().toISOString(); out.runtimeSeconds = Math.round((Date.now() - t0) / 1000); fs.writeFileSync(INDEX, JSON.stringify(out)); }
  await browser.close(); srv.close();
  log(`done: ${shots.length} screenshots, ${Math.round(shots.reduce((a, s) => a + s.bytes, 0) / 1e6)} MB`);
})().catch(e => { console.error(e); process.exit(1); });
