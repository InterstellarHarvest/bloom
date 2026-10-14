// BLOOM-038 design audit — shared browser plumbing for the DOM audits (affordance.js · copy-density.js · pause-audit.js · failure-ui.js).
// READ-ONLY research: serves the repository over http, drives the released index.html (and the developer harness demos/demo-run.html,
// the same production run UI) through Playwright Chromium, and never writes anything but its own evidence under docs/evidence/bloom-038/.
// The only runtime change it makes to a page is test state (localStorage training record, BLOOM_API.advance / addBiomass / buy, tiles
// thinned for the Thin Air dip) — exactly the hooks the existing QA suites use. CommonJS; NODE_PATH="$(npm root -g)".
"use strict";
const path = require("path"), fs = require("fs"), http = require("http");
const ROOT = path.resolve(__dirname, "../../..");
const OUT = path.join(ROOT, "docs/evidence/bloom-038");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml", ".woff2": "font/woff2" };
const J = JSON.stringify;

function serve() {
  const srv = http.createServer((req, res) => { let p = decodeURIComponent(new URL(req.url, "http://x").pathname); if (p.endsWith("/")) p += "index.html";
    const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream", "Cache-Control": "no-store" }); fs.createReadStream(f).pipe(res); });
  return new Promise(r => srv.listen(0, "127.0.0.1", () => r({ origin: `http://127.0.0.1:${srv.address().port}`, close: () => srv.close() })));
}

async function launch() {
  let pw; try { pw = require("playwright"); } catch (e) { console.error('playwright not installed: NODE_PATH="$(npm root -g)"'); process.exit(2); }
  return pw.chromium.launch();
}
// a fresh context: training record seeded as completed (skips the first-run recommendation); optional seeded Math.random (repeatable sim randomness)
async function newPage(browser, { width = 1440, height = 900, training = "completed", seeded = false } = {}) {
  const c = await browser.newContext({ viewport: { width, height } });
  await c.addInitScript(tr => { try { if (tr) localStorage.setItem("strange-bloom.training", JSON.stringify({ v: 1, status: tr, at: 1 })); else localStorage.removeItem("strange-bloom.training"); } catch (e) { /* blocked */ } }, training);
  if (seeded) await c.addInitScript(() => { let a = 20261014; Math.random = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; });
  const p = await c.newPage(); p.errs = [];
  p.on("pageerror", e => p.errs.push("pageerror: " + e.message)); p.on("console", m => { if (m.type() === "error") p.errs.push("console: " + m.text()); }); p.on("dialog", d => d.accept());
  return p;
}

// ---- readiness (the same predicates as tools/ui-polish-check.js)
const W = (p, fn, arg, timeout = 120000) => p.waitForFunction(fn, arg, { timeout, polling: 50 });
const waits = {
  menu: p => W(p, () => window.MENU_DEV && MENU_DEV.ready && MENU_DEV.entry.state === "menu" && MENU_DEV.entry.black.style.display === "none"),
  hub: p => W(p, () => { const e = MENU_DEV.entry, v = e.challengeView; return e.state === "challenges" && v && v.inner && e.black.style.display === "none"; }),
  species: p => W(p, () => { const e = MENU_DEV.entry, v = e.speciesView; return e.state === "species" && v && v.inner && v.inner.state === "cards" && !e.covered && e.black.style.display === "none"; }),
  world: p => W(p, () => { const e = MENU_DEV.entry, v = e.worldView; return e.state === "challenge-world" && v && v.inner && v.inner.state === "ready" && e.black.style.display === "none"; }),
  survey: p => W(p, () => { const s = MENU_DEV.entry.survey; return s && s.state === "survey" && MENU_DEV.entry.black.style.display === "none"; }),
  cells: p => W(p, () => MENU_DEV.entry.survey && MENU_DEV.entry.survey.cells.some(Boolean), null, 240000),
  run: (p, n = 1) => W(p, n => window.BLOOM_APP && BLOOM_APP.session && BLOOM_APP.stats.sessions.length >= n && BLOOM_APP.stats.sessions[n - 1].readyMs !== null && !BLOOM_APP.busy
    && !document.querySelector(".atx") && MENU_DEV.entry.state === "away" && MENU_DEV.entry.black.style.display === "none", n),
  training: (p, n = 1) => W(p, n => window.BLOOM_TRAINING_UI && BLOOM_TRAINING_UI.stats.liftedAt && BLOOM_TRAINING_UI.guide.mounted && BLOOM_APP.stats.sessions.length >= n && !BLOOM_APP.busy, n),
  report: p => W(p, () => BLOOM.runReport.instance && BLOOM.runReport.instance.state().open && !BLOOM.runReport.instance.state().busy, null, 60000),
  room: (p, room) => W(p, r => { const st = BLOOM.decisionRooms.instance.state(); return st.room === r && !st.transitioning; }, room, 30000),
  noRoom: p => W(p, () => { const st = BLOOM.decisionRooms.instance.state(); return !st.room && !st.transitioning && !document.querySelector(".atx"); }, null, 30000),
  harness: p => W(p, () => window.BLOOM && BLOOM.planetView && BLOOM.planetView.instance && window.BLOOM_RUN_UI && BLOOM_RUN_UI.adapter && window.BLOOM_API && BLOOM_API.sim && BLOOM.decisionRooms && BLOOM.decisionRooms.instance, null, 60000),
};
const HUB = "MENU_DEV.entry.challengeView.inner", SS = "MENU_DEV.entry.speciesView.inner";
const nav = {
  toSpecies: async p => { await p.click('.mm-item[data-act="begin"]'); await waits.species(p); },
  chooseSpecies: async (p, sp) => { await p.evaluate(([SSX, sp]) => eval(SSX).open(sp), [SS, sp]); await p.waitForTimeout(250); await p.click(".ss-btn.go"); },
  focusFirst: async p => { await waits.cells(p); const i = await p.evaluate(() => MENU_DEV.entry.survey.cells.findIndex(Boolean)); await p.evaluate(i => MENU_DEV.entry.survey.select(i), i);
    await W(p, () => MENU_DEV.entry.survey.state === "focus", null, 20000); return i; },
  // hub → BEGIN CHALLENGE (→ species when the Challenge allows a choice) → the Challenge Planet Dossier
  challenge: async (p, id, sp = "organic_hybrid", launchSeed = null) => {
    if (await p.evaluate(() => MENU_DEV.entry.state) !== "challenges") { await p.click('.mm-item[data-act="challenges"]'); await waits.hub(p); }
    await p.evaluate(([HUBX, id, s]) => { eval(HUBX).select(id); if (s !== null) MENU_DEV.entry.nextLaunchSeed = s; }, [HUB, id, launchSeed]); await p.click(".ch-btn.go");
    const st = await W(p, () => ["species", "challenge-world"].includes(MENU_DEV.entry.state) && MENU_DEV.entry.black.style.display === "none" ? MENU_DEV.entry.state : false).then(h => h.jsonValue());
    if (st === "species") { await waits.species(p); await nav.chooseSpecies(p, sp); }
    await waits.world(p); },
  harnessURL: (O, { archetype, seed, species, scenario, planet } = {}) => {
    const q = new URLSearchParams(); if (archetype) q.set("archetype", archetype); if (seed !== undefined && seed !== null) q.set("seed", seed);
    if (species) q.set("species", species); if (scenario) q.set("scenario", scenario); if (planet) q.set("planet", planet); return `${O}/demos/demo-run.html?${q}`; },
};
const shot = async (p, file, opt = {}) => { fs.mkdirSync(path.dirname(file), { recursive: true }); await p.screenshot({ path: file, ...opt }).catch(e => console.log("shot failed", file, e.message)); return path.relative(ROOT, file); };
const writeJSON = (name, obj) => { fs.mkdirSync(OUT, { recursive: true }); const f = path.join(OUT, name); fs.writeFileSync(f, JSON.stringify(obj, null, 1) + "\n"); console.log("wrote", path.relative(ROOT, f), Math.round(fs.statSync(f).size / 1024) + " KB"); return f; };

// ---- CDP: every node with an event listener (DOMDebugger.getEventListeners over the whole document, pierce), published to the page as
// window.__audL : Map(element → [types]) so the in-page inventory can read real listener evidence (own and delegated).
async function markListeners(p) {
  const cdp = await p.context().newCDPSession(p);
  try {
    await cdp.send("DOM.enable"); await cdp.send("DOM.getDocument", { depth: 0 });
    const { result } = await cdp.send("Runtime.evaluate", { expression: "document", objectGroup: "aud" });
    const { listeners } = await cdp.send("DOMDebugger.getEventListeners", { objectId: result.objectId, depth: -1, pierce: true });
    const by = new Map(); for (const l of listeners) { if (!l.backendNodeId) continue; const s = by.get(l.backendNodeId) || new Set(); s.add(l.type); by.set(l.backendNodeId, s); }
    // window-level listeners (not in the subtree)
    const { result: w } = await cdp.send("Runtime.evaluate", { expression: "window", objectGroup: "aud" });
    const { listeners: wl } = await cdp.send("DOMDebugger.getEventListeners", { objectId: w.objectId });
    await p.evaluate(() => { window.__audL = new Map(); });
    let n = 0;
    for (const [backendNodeId, types] of by) {
      try { const { object } = await cdp.send("DOM.resolveNode", { backendNodeId, objectGroup: "aud" });
        await cdp.send("Runtime.callFunctionOn", { objectId: object.objectId, functionDeclaration: "function(t){ window.__audL.set(this, t); }", arguments: [{ value: [...types] }] }); n++; } catch (e) { /* detached */ }
    }
    await cdp.send("Runtime.releaseObjectGroup", { objectGroup: "aud" });
    return { nodesWithListeners: n, windowListenerTypes: [...new Set(wl.map(l => l.type))] };
  } finally { await cdp.detach().catch(() => {}); }
}

// icon identity: the production icon table (planet-view.js + decision-rooms.js), inner SVG → name
function iconTable() {
  const T = {};
  for (const f of ["resources/run-ui/planet-view.js", "resources/run-ui/decision-rooms.js"]) {
    const src = fs.readFileSync(path.join(ROOT, f), "utf8"); const re = /([A-Za-z_]\w*):\s*'(<[^']+)'/g; let m;
    while ((m = re.exec(src))) if (!T[m[2]]) T[m[2]] = m[1];
  }
  return T;
}

// ---- run helpers (in-page; the hooks the QA suites use)
const run = {
  winNow: p => p.evaluate(() => { const s = BLOOM_API.sim; BLOOM_API.advance(40); s.won = true; s.onWin(s.coverage()); }),
  plan: p => p.evaluate(() => { const S = BLOOM_APP.session, D = BLOOM_DATA, sc = S.run.scenario;
    const v = sc ? BLOOM.validateScenario(S.planet, D.config, D.traits, sc, { archetypeId: S.run.archetype && S.run.archetype.id, species: S.run.species })
      : BLOOM.findStrategies(S.planet, D.config, D.traits, { minStrategies: 1, species: S.run.species });
    window.__plan = { plan: (v.strategies[0] || {}).plan || [], k: 0 }; return window.__plan.plan; }),
  // advance tick by tick, buying the witness plan in order when affordable, until `until` (a JS expression over s = the sim) holds
  drive: (p, until, max, boost = 0) => p.evaluate(([until, max, boost]) => { const A = BLOOM_API, s = A.sim, P = window.__plan || { plan: [], k: 0 }, f = new Function("s", "return " + until);
    if (boost) A.addBiomass(boost); let t = 0;
    for (; t < max; t++) { while (P.k < P.plan.length) { const tr = s.traitById[P.plan[P.k]]; if (s.canBuy(tr) && s.biomass >= s.price(tr) && A.buy(tr.id)) P.k++; else break; }
      A.advance(1); if (f(s) || s.won || s.lost) break; }
    return { ticks: s.ticks, cov: s.coverage(), winAt: s.winAt, won: s.won, lost: s.lost, progress: s.pressure ? s.pressure.progress : null, bought: P.k }; }, [until, max, boost]),
  thinTo: (p, share) => p.evaluate(share => { const s = BLOOM_API.sim, keep = Math.floor(share * s.map.LAND); let n = 0;
    for (const i of s.map.LAND_TILES) if (s.state[i] === s.LIV && ++n > keep) { s.state[i] = s.BAR; s.dens[i] = 0; } return s.coverage(); }, share),
  dieOff: p => p.evaluate(() => { const s = BLOOM_API.sim; for (const i of s.map.LAND_TILES) if (s.state[i] === s.LIV) { s.state[i] = s.BAR; s.dens[i] = 0; } }),
  // a region worth selecting: a blocked non-origin region if any (the banner then shows a limiting factor + "Would help"), else the origin
  pickRegion: p => p.evaluate(() => { const A = BLOOM_RUN_UI.adapter, rs = A.regions(); const b = rs.find(r => r.blocked && !r.isOrigin) || rs.find(r => r.isOrigin) || rs[0]; return b.index; }),
};

/**
 * The screen tour shared by affordance.js and copy-density.js: walks the released app through every audited screen and calls
 * `await on(name, info)` with the page settled on that screen. `skip` = a set of phase names to leave out
 * (expedition · challenge · thinair · training · harness). Each phase gets a fresh page (a fresh document = a fresh run).
 */
async function tour(browser, O, on, { skip = new Set(), log = console.log } = {}) {
  const errs = [];
  const step = async (p, name, info = {}) => { log(`  · ${name}`); await p.waitForTimeout(350); await on(name, { ...info, page: p }); };
  // ---------------- phase 1: title → settings → species → survey → run → selected region → four rooms → win report
  if (!skip.has("expedition")) { const p = await newPage(browser);
    try {
      await p.goto(O + "/?bg=3"); await waits.menu(p); await p.waitForTimeout(600); await step(p, "title");
      await p.click('.mm-item[data-act="settings"]'); await p.waitForTimeout(300); await step(p, "settings"); await p.keyboard.press("Escape"); await p.waitForTimeout(250);
      await nav.toSpecies(p); await step(p, "species-cards");
      await p.evaluate(SSX => eval(SSX).open("organic_hybrid"), SS); await p.waitForTimeout(400); await step(p, "species-dossier", { species: "organic_hybrid" });
      await p.keyboard.press("Escape"); await p.waitForTimeout(300);
      await p.evaluate(SSX => eval(SSX).open("woolly_candle"), SS); await p.waitForTimeout(400); await step(p, "species-dossier-woolly_candle", { species: "woolly_candle", extra: true });
      await p.click(".ss-btn.go"); await waits.survey(p); await waits.cells(p);
      await p.waitForFunction(() => MENU_DEV.entry.survey.cells.filter(Boolean).length >= 9, null, { timeout: 90000, polling: 200 }).catch(() => {});
      await p.waitForTimeout(500); await step(p, "survey-grid");
      const cell = await nav.focusFirst(p); await p.waitForTimeout(800); await step(p, "survey-dossier", { cell });
      await p.click(".ds-btn.go"); await waits.run(p, 1); await p.waitForTimeout(600);
      await p.evaluate(() => BLOOM_API.advance(60)); await p.waitForTimeout(400); await step(p, "run-map", { note: "Expedition run, 60 ticks advanced, paused" });
      const ri = await run.pickRegion(p); await p.evaluate(i => BLOOM_RUN_UI.adapter.actions.selectRegion(i), ri); await p.waitForTimeout(500);
      await step(p, "selected-region", { region: ri });
      await p.click('#pvBanner [data-go="region"]'); await waits.room(p, "region"); await p.waitForTimeout(500); await step(p, "room-regions");
      for (const r of ["adapt", "spread", "terraform"]) { await p.keyboard.press("Escape"); await waits.noRoom(p); await p.waitForTimeout(200);
        await p.click(`.pv-tool[data-tool="${r}"]`); await waits.room(p, r); await p.waitForTimeout(r === "terraform" ? 1200 : 500); await step(p, "room-" + r); }
      await p.keyboard.press("Escape"); await waits.noRoom(p);
      await run.winNow(p); await waits.report(p); await p.waitForTimeout(500); await step(p, "report-win");
    } catch (e) { errs.push("expedition: " + String(e.message || e).slice(0, 300)); log("  ! " + errs[errs.length - 1]); }
    errs.push(...p.errs.map(x => "expedition " + x)); await p.context().close(); }
  // ---------------- phase 2: Challenge hub → Dying World dossier → run (scenario bar) → extinction warning → extinction report
  if (!skip.has("challenge")) { const p = await newPage(browser, { seeded: true });
    try {
      await p.goto(O + "/?bg=5"); await waits.menu(p); await p.click('.mm-item[data-act="challenges"]'); await waits.hub(p);
      await p.evaluate(HUBX => eval(HUBX).select("dying_world"), HUB); await p.waitForTimeout(400); await step(p, "challenge-hub", { challenge: "dying_world" });
      await p.evaluate(HUBX => eval(HUBX).select("thin_air"), HUB); await p.waitForTimeout(400); await step(p, "challenge-hub-thin_air", { challenge: "thin_air", extra: true });
      await nav.challenge(p, "dying_world", "organic_hybrid", 1); await p.waitForTimeout(600); await step(p, "challenge-dossier", { challenge: "dying_world" });
      await p.click(".cw-btn.go"); await waits.run(p, 1); await p.waitForTimeout(500);
      await run.plan(p); await run.drive(p, "s.pressure.progress >= 0.35", 2500); await p.waitForTimeout(500);
      await step(p, "run-dying_world", { note: "Dying World, witness plan bought, decline ≈35 %" });
      await p.click("#pvScn .more").catch(() => {}); await p.waitForTimeout(300); await step(p, "run-dying_world-details", { extra: true });
      await p.click("#pvScn .more").catch(() => {});
      await run.dieOff(p); await p.evaluate(() => BLOOM_API.advance(3)); await p.waitForTimeout(500); await step(p, "run-dying_world-extinction-warning", { extra: true });
      await p.evaluate(() => { let n = 0; while (!BLOOM_API.sim.lost && n++ < 400) BLOOM_API.advance(1); });
      await waits.report(p); await p.waitForTimeout(600); await step(p, "report-extinction");
    } catch (e) { errs.push("challenge: " + String(e.message || e).slice(0, 300)); log("  ! " + errs[errs.length - 1]); }
    errs.push(...p.errs.map(x => "challenge " + x)); await p.context().close(); }
  // ---------------- phase 3: Thin Air — dossier → early Bloom (HOLDING) → coverage dip → final atmosphere → win report
  if (!skip.has("thinair")) { const p = await newPage(browser, { seeded: true });
    try {
      await p.goto(O + "/?bg=7"); await waits.menu(p); await nav.challenge(p, "thin_air", null, 5); await p.waitForTimeout(600);   // launch seed 5: entry #17 desert_world, the witness plan blooms early (decline ≈68 %)
      await step(p, "challenge-dossier-thin_air", { challenge: "thin_air", extra: true });
      await p.click(".cw-btn.go"); await waits.run(p, 1); await p.waitForTimeout(400); await run.plan(p);
      const e1 = await run.drive(p, "s.coverage() >= s.winAt", 3000);
      await p.evaluate(() => BLOOM_RUN_UI.adapter.actions.play()); await p.waitForTimeout(500);   // HOLDING is the RUNNING state's word: captured while running
      await step(p, "run-thin_air-holding", { extra: true, early: e1, note: "captured while running (1x)" }); await p.evaluate(() => BLOOM_RUN_UI.adapter.actions.pause());
      await run.thinTo(p, e1.winAt - 0.08); await p.evaluate(() => BLOOM_API.advance(1)); await p.waitForTimeout(400);
      await step(p, "run-thin_air-early-lost", { extra: true });
      await run.drive(p, "s.pressure.progress >= 1 && s.coverage() >= s.winAt", 4000, 200);
      await waits.report(p).catch(() => {}); await p.waitForTimeout(600); await step(p, "report-thin_air", { extra: true });
    } catch (e) { errs.push("thinair: " + String(e.message || e).slice(0, 300)); log("  ! " + errs[errs.length - 1]); }
    errs.push(...p.errs.map(x => "thinair " + x)); await p.context().close(); }
  // ---------------- phase 4: Training (the coach over the production run)
  if (!skip.has("training")) { const p = await newPage(browser);
    try { await p.goto(O + "/?bg=2"); await waits.menu(p); await p.click('.mm-item[data-act="training"]'); await waits.training(p, 1); await p.waitForTimeout(800); await step(p, "training-coach"); }
    catch (e) { errs.push("training: " + String(e.message || e).slice(0, 300)); log("  ! " + errs[errs.length - 1]); }
    errs.push(...p.errs.map(x => "training " + x)); await p.context().close(); }
  // ---------------- phase 5: the other two scenario bars (developer harness, the same production run UI)
  if (!skip.has("harness")) for (const [scenario, archetype, seed] of [["native_competition", "ocean_archipelago", 28], ["volatile_climate", "desert_world", 17]]) {
    const p = await newPage(browser, { seeded: true });
    try { await p.goto(nav.harnessURL(O, { archetype, seed, scenario, species: "organic_hybrid" })); await waits.harness(p); await p.waitForTimeout(500);
      await p.evaluate(() => { BLOOM_API.addBiomass(400); for (const id of ["warm", "warm", "humid", "cool"]) BLOOM_API.buy(id); BLOOM_API.advance(400); });
      await p.click("#pvScn .more").catch(() => {}); await p.waitForTimeout(400); await step(p, "run-" + scenario, { extra: true, archetype, seed }); }
    catch (e) { errs.push(scenario + ": " + String(e.message || e).slice(0, 300)); log("  ! " + errs[errs.length - 1]); }
    errs.push(...p.errs.map(x => scenario + " " + x)); await p.context().close(); }
  return errs;
}

module.exports = { ROOT, OUT, J, serve, launch, newPage, waits, nav, run, tour, shot, writeJSON, markListeners, iconTable, HUB, SS };
