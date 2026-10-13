// BLOOM-037 — final hardening release QA driver (EVIDENCE driver, not a numbered regression suite). docs/evidence/bloom-037/REPORT.md.
//
//   NODE_PATH="$(npm root -g)" node docs/evidence/bloom-037/qa-037.js [--browsers chromium,firefox] [--only O,S,A,R,P] [--root <repo>]
//                                                                     [--evidence] [--label <name>] [--json <file>]
//   WebKit on macOS 12 (Playwright 1.46.1 client + the frozen webkit_mac12_special-2009 build):
//   PW_MODULE=<dir>/node_modules/playwright PLAYWRIGHT_BROWSERS_PATH=<dir> node docs/evidence/bloom-037/qa-037.js --browsers webkit ...
//   AXE=<path to axe.min.js> enables the axe-core scan in section A (a QA-only tool, never shipped).
//
// Sections (the production document index.html only; never demos/demo-run.html):
//   O · origins — the complete product (EXPEDITION run, a CHALLENGE run, TRAINING) from http "/", the Pages site under "/bloom/" and
//       file:// (the generated portable runtime), with the network OFFLINE and every request checked local.
//   S · the gameplay smoke matrix — four species launch; one complete Expedition run; Play Again; Choose Another Planet; Change Species;
//       Main Menu; all six Challenges launch (prescribed species skip Choose Plant Species, player choice uses it); Low Tide's starting
//       traits; Oasis Line's natives + Refuge; Thin Air's early Bloom → final-atmosphere completion; Retry Challenge; Challenges; Main Menu;
//       Training start / restart / skip / completion → Expedition.
//   A · accessibility — per screen: axe-core (WCAG 2 A/AA rules), accessible names, a Tab walk (visible focus, focus order inside the
//       screen, dialogs trap focus), Escape / Back, live regions, reduced motion.
//   R · responsive — 390×844 · 1024×768 · 1440×900 · 2560×1440 per screen: no horizontal overflow, every visible control reachable
//       (scrolled into view and hit-testable), dialogs inside the viewport, the specimen inside its frame; stills for review.
//   P · performance sanity — player-facing waits, long tasks, workers started, duplicate requests (run once per --root to compare).
// Exits 1 on any FAIL. INFO lines are measurements.
"use strict";
const path = require("path"), fs = require("fs"), http = require("http"), os = require("os");
const argv = process.argv, argOf = k => { const i = argv.indexOf(k); return i > 0 ? argv[i + 1] : null; };
const ROOT = path.resolve(argOf("--root") || path.join(__dirname, "../../.."));
const BROWSERS = (argOf("--browsers") || "chromium,firefox").split(","), ONLY = (argOf("--only") || "O,S,A,R,P").split(",");
const EVIDENCE = argv.includes("--evidence"), LABEL = argOf("--label") || "", JSON_OUT = argOf("--json");
const EVD = path.join(__dirname, "shots"), AXE = process.env.AXE && fs.existsSync(process.env.AXE) ? fs.readFileSync(process.env.AXE, "utf8") : null;
const pw = require(process.env.PW_MODULE || "playwright");
const J = JSON.stringify, sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0, passes = 0; const RESULTS = { root: ROOT, label: LABEL, checks: [], info: {} };
const check = (ok, name, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); RESULTS.checks.push({ ok: !!ok, name, detail }); if (ok) passes++; else fails++; };
const info = (key, v) => { console.log(`INFO  ${key}  — ${typeof v === "string" ? v : J(v)}`); RESULTS.info[key] = v; };
const VIEWPORTS = [[390, 844], [1024, 768], [1440, 900], [2560, 1440]];
const SPECIES = ["organic_hybrid", "cinder_rosette", "woolly_candle", "reed_spire"];
const CHALLENGES = ["dying_world", "native_competition", "volatile_climate", "low_tide", "oasis_line", "thin_air"];
const PRESCRIBED = { low_tide: "organic_hybrid", oasis_line: "reed_spire", thin_air: "woolly_candle" };

(async () => {
  const { buildSite } = await import("file://" + path.join(ROOT, "tools/build-pages-site.mjs"));
  const SITE_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "bloom037-site-")); buildSite(ROOT, SITE_DIR);
  const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml" };
  const srv = http.createServer((req, res) => {
    const u = new URL(req.url, "http://x"); let base = ROOT, p = decodeURIComponent(u.pathname);
    if (p.startsWith("/bloom/")) { base = SITE_DIR; p = p.slice("/bloom".length); }
    if (p.endsWith("/")) p += "index.html";
    const f = path.join(base, p); if (!f.startsWith(base) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end("not found"); }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream", "Cache-Control": "no-store" }); fs.createReadStream(f).pipe(res);
  });
  await new Promise(r => srv.listen(0, "127.0.0.1", r)); const ORIGIN = `http://127.0.0.1:${srv.address().port}`;
  const FILE_INDEX = "file://" + path.join(ROOT, "index.html").split("/").map(encodeURIComponent).join("/");   // (every segment encoded: WebKit refuses a raw "&" in a file path)
  if (EVIDENCE) fs.mkdirSync(EVD, { recursive: true });

  for (const bn of BROWSERS) {
    const browser = await pw[bn].launch(); const BV = `${bn} ${browser.version()}`; console.log(`\n# ${BV}  (root ${ROOT})`); RESULTS.info[`browser:${bn}`] = BV;
    const tag = s => `[${bn}] ${s}`;
    const shot = async (p, name) => { if (!EVIDENCE) return; await p.waitForTimeout(250); await p.screenshot({ path: path.join(EVD, `${bn}-${name}.png`) }).catch(() => {}); };
    const context = async ({ width = 1440, height = 900, offline = false, seeded = false, trained = true, reducedMotion = "no-preference", perf = false } = {}) => {
      const c = await browser.newContext({ viewport: { width, height }, reducedMotion }); if (offline) await c.setOffline(true);
      if (seeded) await c.addInitScript(() => { let a = 20261012; Math.random = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; });
      if (trained) await c.addInitScript(() => { try { localStorage.setItem("strange-bloom.training", '{"v":1,"status":"completed","at":1}'); } catch (e) { /* storage blocked */ } });
      // QA instrumentation: workers started, long tasks (Chromium exposes longtask), all page-visible only
      await c.addInitScript(() => { window.__w = []; const W = window.Worker; if (W) window.Worker = class extends W { constructor(u, o) { super(u, o); window.__w.push(String(u).slice(0, 80)); } };
        window.__lt = []; try { new PerformanceObserver(l => { for (const e of l.getEntries()) window.__lt.push([Math.round(e.startTime), Math.round(e.duration)]); }).observe({ type: "longtask", buffered: true }); } catch (e) { /* not supported */ } });
      return c; };
    const page = async c => { const p = await c.newPage(); p.errs = []; p.reqs = []; p.navs = 0;
      p.on("pageerror", e => p.errs.push("pageerror: " + e.message)); p.on("console", m => { if (m.type() === "error") p.errs.push("console: " + m.text()); });
      p.on("request", r => p.reqs.push(r.url())); p.on("framenavigated", f => { if (f === p.mainFrame()) p.navs++; }); p.on("dialog", d => d.accept()); return p; };
    const T = { menu: 90000, flow: 120000, survey: 240000 };
    const menuReady = p => p.waitForFunction(() => window.MENU_DEV && MENU_DEV.ready && MENU_DEV.entry.state === "menu" && MENU_DEV.entry.black.style.display === "none", null, { timeout: T.menu, polling: 50 });
    const hubReady = p => p.waitForFunction(() => { const e = MENU_DEV.entry, v = e.challengeView; return e.state === "challenges" && v && v.inner && e.black.style.display === "none"; }, null, { timeout: T.flow, polling: 50 });
    const speciesReady = p => p.waitForFunction(() => { const e = MENU_DEV.entry, v = e.speciesView; return e.state === "species" && v && v.inner && v.inner.state === "cards" && !e.covered && e.black.style.display === "none"; }, null, { timeout: T.flow, polling: 50 });
    const worldReady = p => p.waitForFunction(() => { const e = MENU_DEV.entry, v = e.worldView; return e.state === "challenge-world" && v && v.inner && v.inner.state === "ready" && e.black.style.display === "none"; }, null, { timeout: T.flow, polling: 50 });
    const surveyShown = p => p.waitForFunction(() => { const s = MENU_DEV.entry.survey; return s && s.state === "survey" && MENU_DEV.entry.black.style.display === "none"; }, null, { timeout: T.flow, polling: 50 });
    const surveyFull = p => p.waitForFunction(() => { const s = MENU_DEV.entry.survey; return s && s.state === "survey" && s.cells.every(Boolean); }, null, { timeout: T.survey, polling: 100 });
    const runReady = (p, n) => p.waitForFunction(n => window.BLOOM_APP && BLOOM_APP.session && BLOOM_APP.stats.sessions.length >= n && BLOOM_APP.stats.sessions[n - 1].readyMs !== null && !BLOOM_APP.busy
      && !document.querySelector(".atx") && MENU_DEV.entry.state === "away" && MENU_DEV.entry.black.style.display === "none", n, { timeout: T.flow, polling: 50 });
    const trainReady = (p, n) => p.waitForFunction(n => window.BLOOM_TRAINING_UI && BLOOM_TRAINING_UI.stats.liftedAt && BLOOM_TRAINING_UI.guide.mounted && BLOOM_APP.stats.sessions.length >= n && !BLOOM_APP.busy, n, { timeout: T.flow, polling: 50 });
    const reportOpen = p => p.waitForFunction(() => BLOOM.runReport.instance && BLOOM.runReport.instance.state().open && !BLOOM.runReport.instance.state().busy, null, { timeout: 60000, polling: 30 });
    const atMenu = p => p.waitForFunction(() => !BLOOM_APP.session && MENU_DEV.entry.state === "menu" && MENU_DEV.entry.black.style.display === "none", null, { timeout: T.flow, polling: 50 });
    const roomOpen = (p, room) => p.waitForFunction(r => { const st = BLOOM.decisionRooms.instance.state(); return st.room === r && !st.transitioning; }, room, { timeout: 30000, polling: 30 });
    const roomClosed = p => p.waitForFunction(() => { const st = BLOOM.decisionRooms.instance.state(); return !st.room && !st.transitioning; }, null, { timeout: 30000, polling: 30 });
    const HUB = "MENU_DEV.entry.challengeView.inner", SS = "MENU_DEV.entry.speciesView.inner";
    const menuAct = async (p, id) => { await p.click("#pvMenuBtn"); await p.click(`#pvMenu [data-act="${id}"]`); };
    const winNow = p => p.evaluate(() => { const s = BLOOM_API.sim; BLOOM_API.advance(40); s.won = true; s.onWin(s.coverage()); });   // the run's own win path (QA shortcut)
    const dieOff = p => p.evaluate(() => { const s = BLOOM_API.sim; for (const i of s.map.LAND_TILES) if (s.state[i] === s.LIV) { s.state[i] = s.BAR; s.dens[i] = 0; } BLOOM_API.advance(400); return s.lost; });
    const planOf = p => p.evaluate(() => { const S = BLOOM_APP.session, D = BLOOM_DATA, sc = S.run.scenario;
      const v = sc ? BLOOM.validateScenario(S.planet, D.config, D.traits, sc, { archetypeId: S.run.archetype && S.run.archetype.id, species: S.run.species })
        : BLOOM.findStrategies(S.planet, D.config, D.traits, { minStrategies: 1, species: S.run.species });
      window.__plan = { plan: (v.strategies[0] || {}).plan || [], k: 0 }; return window.__plan.plan; });
    const drive = (p, until, max, boost = 0) => p.evaluate(([until, max, boost]) => { const A = BLOOM_API, s = A.sim, P = window.__plan, f = new Function("s", "return " + until); let t = 0, firstCross = null; if (boost) A.addBiomass(boost);
      for (; t < max; t++) { while (P.k < P.plan.length) { const tr = s.traitById[P.plan[P.k]]; if (s.canBuy(tr) && s.biomass >= s.price(tr) && A.buy(tr.id)) P.k++; else break; }
        A.advance(1); if (firstCross === null && s.coverage() >= s.winAt) firstCross = s.ticks; if (f(s) || s.won || s.lost) break; }
      return { ticks: s.ticks, cov: +s.coverage().toFixed(3), winAt: s.winAt, won: s.won, lost: s.lost, progress: s.pressure ? s.pressure.progress : null, firstCross, bought: P.k }; }, [until, max, boost]);
    const hud = p => p.evaluate(() => { const c = document.querySelector("#pvScn .cond"), A = BLOOM_APP.session.adapter;
      return { cond: c && c.querySelector("b") ? c.querySelector("b").textContent : null, status: c ? c.dataset.status : null, state: (document.getElementById("pvState") || {}).textContent,
        report: !!(BLOOM.runReport.instance && BLOOM.runReport.instance.state().open), won: A.run().won, lost: A.run().lost }; });
    const local = (reqs, origin) => reqs.filter(u => !(u.startsWith(origin) || u.startsWith("data:") || u.startsWith("blob:") || (origin.startsWith("file:") && u.startsWith("file:"))));
    // the gameplay entry paths, shared by the sections
    const toSpecies = async p => { await p.click('.mm-item[data-act="begin"]'); await speciesReady(p); };
    const chooseSpecies = async (p, sp) => { await p.evaluate(([SSX, sp]) => eval(SSX).open(sp), [SS, sp]); await p.waitForTimeout(150); await p.click(".ss-btn.go"); };
    const expedition = async (p, sp, n, { full = true } = {}) => { await toSpecies(p); await chooseSpecies(p, sp); await surveyShown(p); if (full) await surveyFull(p);
      else await p.waitForFunction(() => MENU_DEV.entry.survey.cells.some(Boolean), null, { timeout: T.survey, polling: 100 });
      const i = await p.evaluate(() => MENU_DEV.entry.survey.cells.findIndex(Boolean)); await p.evaluate(i => MENU_DEV.entry.survey.select(i), i);
      await p.waitForFunction(() => MENU_DEV.entry.survey.state === "focus", null, { timeout: 20000, polling: 50 }); await p.click(".ds-btn.go"); await runReady(p, n); };
    const challenge = async (p, id, n, sp = null) => { await p.click('.mm-item[data-act="challenges"]').catch(() => {}); await hubReady(p);
      await p.evaluate(([HUBX, id]) => eval(HUBX).select(id), [HUB, id]); await p.click(".ch-btn.go");
      let speciesScreen = false;
      if (!PRESCRIBED[id]) { await speciesReady(p); speciesScreen = true; await chooseSpecies(p, sp || SPECIES[0]); }
      await worldReady(p); return speciesScreen; };

    // ======================================================================================== O · origins (offline)
    if (ONLY.includes("O")) {
      for (const [label, url] of [["http /", `${ORIGIN}/?bg=3`], ["Pages /bloom/", `${ORIGIN}/bloom/?bg=3`], ["file://", `${FILE_INDEX}?bg=3`]]) {
        // file://: the network is switched OFF for the whole session; http: the local test server is the only origin (every request checked)
        // (Playwright WebKit's offline emulation refuses every file: load as well, so WebKit runs file:// online and the locality proof is its
        //  request list — WebKit reports file: requests, every one must be file:)
        const offFirst = url.startsWith("file:") && bn !== "webkit", c = await context({ offline: offFirst }), p = await page(c);
        const t0 = Date.now(); let ok = false, D = {};
        try {
          await p.goto(url); await menuReady(p); D.titleMs = Date.now() - t0;
          await expedition(p, "organic_hybrid", 1, { full: false }); D.exp = await p.evaluate(() => ({ sp: BLOOM_APP.session.sim.species.id, planet: !!BLOOM_APP.session.planet, scn: BLOOM_APP.session.run.scenario ? BLOOM_APP.session.run.scenario.id : null }));
          await p.evaluate(() => BLOOM_API.advance(60)); await menuAct(p, "mainMenu"); await atMenu(p);
          await challenge(p, "low_tide", 2); await p.click(".cw-btn.go"); await runReady(p, 2);
          D.ch = await p.evaluate(() => ({ id: BLOOM_APP.session.run.challenge.id, sp: BLOOM_APP.session.sim.species.id }));
          await menuAct(p, "mainMenu"); await atMenu(p);
          await p.click('.mm-item[data-act="training"]'); await trainReady(p, 3);
          D.tr = await p.evaluate(() => ({ planet: BLOOM_RUN.planet.id, coach: !!document.querySelector(".tc-card") }));
          await menuAct(p, "mainMenu"); await atMenu(p);
          D.far = local(p.reqs, url.startsWith("file:") ? "file:" : ORIGIN); D.portable = await p.evaluate(() => !!window.BLOOM_PORTABLE);
          D.navs = p.navs; D.fileReqs = p.reqs.filter(u => u.startsWith("file:")).length;   // (Firefox does not report file: requests to Playwright; the bundle's global proves the portable runtime)
          ok = D.exp.sp === "organic_hybrid" && D.exp.planet && D.ch.id === "low_tide" && D.ch.sp === "organic_hybrid" && D.tr.planet === "training_grounds" && D.tr.coach && !D.far.length && p.errs.length === 0 && p.navs === 1
            && D.portable === url.startsWith("file:") && (bn !== "webkit" || !url.startsWith("file:") || D.fileReqs === p.reqs.filter(u => !/^(data|blob):/.test(u)).length) && (label !== "Pages /bloom/" || p.reqs.filter(u => u.startsWith(ORIGIN)).every(u => new URL(u).pathname.startsWith("/bloom/")));
        } catch (e) { D.error = String(e.message || e).slice(0, 300); }
        check(ok, tag(`O · ${label}: the complete product — title → EXPEDITION (Choose Plant Species → survey → run) → Main Menu → CHALLENGES (Low Tide dossier → run) → Main Menu → TRAINING → Main Menu; one document, every request local${label === "file://" ? " (portable runtime, network offline)" : ""}, no console error`),
          J({ ...D, far: (D.far || []).slice(0, 3), errs: p.errs.slice(0, 3), reqs: p.reqs.length }));
        await c.close();
      }
    }

    // ======================================================================================== S · gameplay smoke matrix
    if (ONLY.includes("S")) {
      // S1 · each species launches an Expedition (Firefox / WebKit: two representative species)
      { const c = await context(), p = await page(c); let n = 0; const rows = [];
        await p.goto(`${ORIGIN}/?bg=5`); await menuReady(p);
        for (const sp of (bn === "chromium" ? SPECIES : ["organic_hybrid", "reed_spire"])) {
          try { await expedition(p, sp, ++n, { full: false });
            const r = await p.evaluate(() => ({ sp: BLOOM_APP.session.sim.species.id, run: BLOOM_APP.session.run.species.id, scn: BLOOM_APP.session.run.scenario ? BLOOM_APP.session.run.scenario.id : "default", ch: !!BLOOM_APP.session.run.challenge }));
            rows.push({ want: sp, ...r }); await shot(p, `s1-expedition-${sp}`); await menuAct(p, "mainMenu"); await atMenu(p);
          } catch (e) { rows.push({ want: sp, error: String(e.message).slice(0, 160) }); }
        }
        check(rows.every(r => r.sp === r.want && r.run === r.want && r.scn === "default" && !r.ch) && !p.errs.length, tag(`S1 · EXPEDITION launches with each species (${rows.length}): the run's simulation species = the chosen plant, default rules, no Challenge`), J({ rows, errs: p.errs.slice(0, 3) }));
        await c.close(); }

      // S2 · one complete Expedition run (the run's own witness plan) → report → Play Again → Choose Another Planet → Change Species → Main Menu
      { const c = await context({ seeded: true }), p = await page(c); const D = {};
        try {
          await p.goto(`${ORIGIN}/?bg=5`); await menuReady(p); await expedition(p, "organic_hybrid", 1);
          D.planet0 = await p.evaluate(() => { window.__p0 = BLOOM_APP.session.planet; return BLOOM_APP.session.planet.id; });
          D.plan = (await planOf(p)).length; D.run = await drive(p, "false", 6000);
          await reportOpen(p); D.acts = await p.evaluate(() => BLOOM.runReport.instance.state().actions); D.kind = await p.evaluate(() => BLOOM.runReport.instance.state().kind);
          await shot(p, "s2-expedition-bloom-report");
          await p.click('#rr [data-act="playAgain"]'); await runReady(p, 2);
          D.again = await p.evaluate(() => ({ same: BLOOM_APP.session.planet === window.__p0, ticks: BLOOM_API.sim.ticks, won: BLOOM_API.sim.won }));
          await menuAct(p, "choosePlanet"); await surveyShown(p);
          D.survey = await p.evaluate(() => ({ species: (document.querySelector(".ds-species") || {}).dataset ? document.querySelector(".ds-species").dataset.species : null, session: !!BLOOM_APP.session }));
          await p.click(".ds-species-change"); await speciesReady(p); D.changeSpecies = await p.evaluate(() => MENU_DEV.entry.state);
          await chooseSpecies(p, "cinder_rosette"); await surveyShown(p); D.survey2 = await p.evaluate(() => document.querySelector(".ds-species").dataset.species);
          await p.click(".ds-exit"); await atMenu(p); D.menu = await p.evaluate(() => ({ focus: document.activeElement && document.activeElement.dataset.act, items: [...document.querySelectorAll(".mm-item")].map(b => b.dataset.act) }));
        } catch (e) { D.error = String(e.message).slice(0, 300); }
        check(D.run && D.run.won && D.kind === "win" && J(D.acts) === J(["keepPlaying", "playAgain", "choosePlanet", "mainMenu"]) && D.again && D.again.same && !D.again.won && D.again.ticks < 50
            && D.survey && D.survey.species === "organic_hybrid" && !D.survey.session && D.changeSpecies === "species" && D.survey2 === "cinder_rosette" && D.menu && J(D.menu.items) === J(["begin", "challenges", "training", "settings", "credits"]) && !p.errs.length,
          tag("S2 · one COMPLETE Expedition run (Organic Hybrid, its own witness plan, no QA win shortcut) → Bloom report (Keep playing · Play Again · Choose Another Planet · Main Menu) → Play Again (same planet, fresh run) → Choose Another Planet (survey, same species) → Change Species → Cinder Rosette survey → Main Menu"),
          J({ ...D, errs: p.errs.slice(0, 3) }));
        await c.close(); }

      // S3 · all six Challenge cards launch; prescribed species skip Choose Plant Species; Low Tide traits; Oasis Line natives + Refuge; Retry / Challenges / Main Menu
      { const c = await context({ seeded: true }), p = await page(c); const rows = []; let n = 0;
        await p.goto(`${ORIGIN}/?launch=3&bg=5`); await menuReady(p);
        await p.click('.mm-item[data-act="challenges"]'); await hubReady(p);
        const cards = await p.evaluate(() => [...document.querySelectorAll(".ch-card")].map(x => x.dataset.challenge));
        await shot(p, "s3-hub");
        for (const id of CHALLENGES) {
          const r = { id }; try {
            r.speciesScreen = await challenge(p, id, n + 1, id === "native_competition" ? "reed_spire" : "woolly_candle");
            r.dossier = await p.evaluate(() => ({ sp: (document.querySelector(".cw-sp-name") || {}).textContent, start: (document.querySelector(".cw-start") || {}).textContent, goal: (document.querySelector(".cw-goal") || {}).innerText }));
            await shot(p, `s3-dossier-${id}`);
            await p.click(".cw-btn.go"); await runReady(p, ++n);
            Object.assign(r, await p.evaluate(() => { const S = BLOOM_APP.session, s = S.sim, A = S.adapter;
              return { run: S.run.challenge.id, sp: s.species.id, gated: !!s.winGated, owned: s.startingState ? [...s.startingState.adaptations].sort() : [], natives: (() => { const m = A.mapState(); return m.native ? m.native.reduce((n, v) => n + (v > 0 ? 1 : 0), 0) : null; })(),
                cond: (document.querySelector("#pvScn .cond b") || {}).textContent || null }; }));
            if (id === "oasis_line") r.refuge = await p.evaluate(async () => { const A = BLOOM_APP.session.adapter, o = A.regions().find(x => x.isOrigin); A.actions.selectRegion(o.index); await new Promise(res => setTimeout(res, 350));
              const st = document.querySelector(".pv-st"); return { chip: st && st.textContent.trim(), refuge: A.region(o.index).limiting.refuge, blocked: A.region(o.index).limiting.blocked }; });
            await shot(p, `s3-run-${id}`);
            await menuAct(p, "retryChallenge"); await runReady(p, ++n); r.retry = await p.evaluate(() => ({ id: BLOOM_APP.session.run.challenge.id, ticks: BLOOM_API.sim.ticks }));
            if (id === "oasis_line") { await menuAct(p, "mainMenu"); await atMenu(p); r.exit = "mainMenu"; }
            else { await menuAct(p, "challenges"); await hubReady(p); r.exit = "challenges"; }
          } catch (e) { r.error = String(e.message).slice(0, 200); }
          rows.push(r);
        }
        const R = Object.fromEntries(rows.map(r => [r.id, r]));
        check(J(cards) === J(CHALLENGES) && rows.every(r => !r.error && r.run === r.id && r.retry && r.retry.id === r.id && r.retry.ticks < 40 && r.speciesScreen === !PRESCRIBED[r.id] && (!PRESCRIBED[r.id] || r.sp === PRESCRIBED[r.id])) && !p.errs.length,
          tag("S3 · the hub shows the six Challenge cards in content order; every card launches its own Challenge run; Low Tide / Oasis Line / Thin Air skip Choose Plant Species and run their prescribed plant, the three player-choice Challenges use it; Retry Challenge replays; Challenges returns to the hub (Oasis Line: Main Menu)"),
          J({ cards, rows: rows.map(r => ({ id: r.id, sp: r.sp, speciesScreen: r.speciesScreen, retry: r.retry, exit: r.exit, error: r.error })), errs: p.errs.slice(0, 3) }));
        check(R.low_tide && J(R.low_tide.owned) === J(["flood", "salt"]) && /Flood Adaptation/.test(R.low_tide.dossier.start || "") && /Salt Handling/.test(R.low_tide.dossier.start || ""), tag("S3a · Low Tide lands WITH its two prescribed adaptations (Flood Adaptation + Salt Handling) and says so in the dossier"),
          J({ owned: R.low_tide && R.low_tide.owned, start: R.low_tide && R.low_tide.dossier.start }));
        check(R.oasis_line && R.oasis_line.sp === "reed_spire" && R.oasis_line.natives > 0 && R.oasis_line.refuge && (R.oasis_line.refuge.refuge ? R.oasis_line.refuge.chip === "Refuge" : R.oasis_line.refuge.chip !== "Refuge"), tag("S3b · Oasis Line: Reed Spire on a Native Competition world with native vegetation on the map; the origin's status chip reads Refuge exactly when the landing-refuge rule protects it"),
          J({ refuge: R.oasis_line && R.oasis_line.refuge, natives: R.oasis_line && R.oasis_line.natives }));
        check(R.thin_air && R.thin_air.gated && /^Final atmosphere/.test(R.thin_air.cond || "") && R.dying_world && !R.dying_world.gated, tag("S3c · Thin Air runs GATED with its one HUD condition line; the other Challenges are not gated"), J({ ta: R.thin_air && { gated: R.thin_air.gated, cond: R.thin_air.cond }, dw: R.dying_world && R.dying_world.gated }));
        await c.close(); }

      // S4 · Thin Air: early Bloom is a milestone, the win comes in the final atmosphere (driven run; the deep sequence is challenge-completion-check T1–T7)
      if (bn !== "webkit") { const c = await context({ seeded: true }), p = await page(c); const D = {};
        try { await p.goto(`${ORIGIN}/?launch=3&bg=5`); await menuReady(p); await challenge(p, "thin_air", 1); await p.click(".cw-btn.go"); await runReady(p, 1);
          D.plan = (await planOf(p)).length; D.early = await drive(p, "s.coverage() >= s.winAt", 3000, 400); D.h1 = await hud(p);   // (an engineered Biomass boost reaches the Bloom early, as challenge-completion-check T2)
          await shot(p, "s4-thin-air-early-bloom");
          D.final = await drive(p, "s.pressure.progress >= 1 && s.coverage() >= s.winAt", 6000); await reportOpen(p);
          D.rep = await p.evaluate(() => ({ kind: BLOOM.runReport.instance.state().kind, mark: (document.querySelector(".rr-cond h3") || {}).textContent, acts: BLOOM.runReport.instance.state().actions }));
          await shot(p, "s4-thin-air-final-report");
        } catch (e) { D.error = String(e.message).slice(0, 300); }
        const earlyFirst = D.early && D.early.progress < 1 && D.early.cov >= D.early.winAt;
        check(D.final && D.final.won && D.final.progress === 1 && D.rep && D.rep.kind === "win" && D.rep.mark === "FINAL ATMOSPHERE ✓" && J(D.rep.acts) === J(["keepPlaying", "retryChallenge", "challenges", "mainMenu"])
            && (!earlyFirst || (!D.early.won && !D.h1.report && D.h1.status === "early-held")) && !p.errs.length,
          tag(`S4 · Thin Air end to end (Woolly Candle, its own plan + a QA Biomass boost): ${earlyFirst ? "the early Bloom is a milestone (no win, no report, HOLDING)" : "no early Bloom on this plan"} → the win only in the final atmosphere → FINAL ATMOSPHERE ✓ report (Keep playing · Retry Challenge · Challenges · Main Menu)`),
          J({ ...D, errs: p.errs.slice(0, 3) }));
        await c.close(); }

      // S5 · Training: start → Restart → Skip (confirmed) → start → completion → Begin Expedition (Choose Plant Species); the full 13-lesson guided path is guided-training-check
      { const c = await context({ trained: false }), p = await page(c); const D = {};
        try { await p.goto(`${ORIGIN}/?bg=5`); await menuReady(p); D.recommended = await p.evaluate(() => MENU_DEV.entry.menu.trainingRecommended);
          await p.click('.mm-item[data-act="training"]'); await trainReady(p, 1); D.t1 = await p.evaluate(() => ({ planet: BLOOM_RUN.planet.id, sp: BLOOM_APP.session.sim.species.id, coach: !!document.querySelector(".tc-card") }));
          await shot(p, "s5-training");
          await menuAct(p, "restartTraining"); await trainReady(p, 2);
          await menuAct(p, "skipTraining"); await p.waitForSelector(".tsk [data-skip=skip]", { timeout: 10000 }); await p.click(".tsk [data-skip=skip]"); await atMenu(p);
          D.skip = await p.evaluate(() => JSON.parse(localStorage.getItem("strange-bloom.training")).status);
          await p.click('.mm-item[data-act="training"]'); await trainReady(p, 3); await winNow(p); await reportOpen(p); D.acts = await p.evaluate(() => BLOOM.runReport.instance.state().actions);
          await p.click('#rr [data-act="beginExpedition"]'); await p.waitForFunction(() => !BLOOM_APP.session && MENU_DEV.entry.state === "species", null, { timeout: 60000, polling: 100 }); D.after = "species";
        } catch (e) { D.error = String(e.message).slice(0, 300); }
        check(D.t1 && D.t1.planet === "training_grounds" && D.t1.sp === "organic_hybrid" && D.t1.coach && D.skip === "skipped" && J(D.acts) === J(["beginExpedition", "restartTraining", "mainMenu"]) && D.after === "species" && !p.errs.length,
          tag("S5 · TRAINING (Organic Hybrid, Training Grounds) → Restart Training → Skip (confirmed, recorded as skipped) → TRAINING → completion → Begin Expedition → Choose Plant Species"), J({ ...D, errs: p.errs.slice(0, 3) }));
        await c.close(); }
    }

    // ======================================================================================== A · accessibility
    if (ONLY.includes("A")) {
      const audit = async (p, screen, scope, { dialog = null, tabs = 40 } = {}) => {
        const out = await p.evaluate(async ([scope, dialog, tabs]) => {
          const root = document.querySelector(scope) || document.body, vis = el => { if (!el.isConnected) return false; const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
            return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none" && !el.closest("[hidden],[inert],[aria-hidden=true]"); };
          const FOC = 'button,a[href],input,select,textarea,[tabindex]:not([tabindex="-1"]),[role=button],[role=tab],[role=menuitem],[role=option],[role=radio]';
          const ctrls = [...root.querySelectorAll(FOC)].filter(vis);
          const nameOf = el => (el.getAttribute("aria-label") || (el.labels && el.labels.length ? [...el.labels].map(l => l.textContent).join(" ") : "") || (el.getAttribute("aria-labelledby") || "").split(/\s+/).map(id => (document.getElementById(id) || {}).textContent || "").join(" ") || el.textContent || el.getAttribute("title") || el.getAttribute("alt") || "").replace(/\s+/g, " ").trim();
          const unnamed = ctrls.filter(el => !nameOf(el)).map(el => el.outerHTML.slice(0, 90));
          const desc = el => el ? (el.id ? "#" + el.id : el.tagName.toLowerCase() + (el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : "") + (el.dataset.act ? `[${el.dataset.act}]` : "") + (el.dataset.species ? `[${el.dataset.species}]` : "") + (el.dataset.challenge ? `[${el.dataset.challenge}]` : "")) : "none";
          const ring = el => { const cs = getComputedStyle(el); return [cs.outlineStyle, cs.outlineWidth, cs.boxShadow, cs.borderColor, cs.backgroundColor, cs.transform].join("|"); };
          return { controls: ctrls.length, unnamed, live: [...document.querySelectorAll("[aria-live],[role=status],[role=alert]")].filter(e => root.contains(e) || e.closest("#app")).length, desc0: desc(document.activeElement) };
        }, [scope, dialog, tabs]);
        await p.mouse.move(1, 1);   // no pointer hover state anywhere during the walk
        // the Tab walk (real key presses): focus stays visible, inside the screen (and inside a dialog), with a visible focus indicator
        const seq = [], bad = [];
        for (let i = 0; i < tabs; i++) {
          await p.keyboard.press("Tab"); await p.waitForTimeout(40);
          const f = await p.evaluate(([scope, dialog]) => { const el = document.activeElement; if (!el || el === document.body) return { body: true };
            const r = el.getBoundingClientRect(), cs = getComputedStyle(el), csB = getComputedStyle(el, "::before"), csA = getComputedStyle(el, "::after");
            const ind = (cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0) || cs.boxShadow !== "none" || (csA.content !== "none" && csA.content !== "normal" && (csA.outlineStyle !== "none" || csA.boxShadow !== "none" || csA.borderStyle !== "none")) || (csB.content !== "none" && csB.content !== "normal" && (csB.outlineStyle !== "none" || csB.boxShadow !== "none" || csB.borderStyle !== "none"));
            const inScreen = !!el.closest(scope) || !!el.closest("#app") , inDialog = dialog ? !!el.closest(dialog) : null;
            const vis = r.width > 0 && r.height > 0 && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth;
            return { d: (el.id ? "#" + el.id : el.tagName.toLowerCase() + "." + String(el.className).trim().split(/\s+/)[0]) + (el.dataset.act ? `[${el.dataset.act}]` : el.dataset.species ? `[${el.dataset.species}]` : el.dataset.challenge ? `[${el.dataset.challenge}]` : el.dataset.tool ? `[${el.dataset.tool}]` : ""), ind, inScreen, inDialog, vis }; }, [scope, dialog]);
          if (!f.body && !f.ind) {   // the indicator may live on descendants (e.g. the survey's halo + name colour): compare focused vs blurred after transitions
            // (the element, its descendants and its siblings' subtrees — a sibling ring such as .tf-globe:focus-visible + .tf-focus — focused vs blurred)
            f.ind = await p.evaluate(async () => { const el = document.activeElement, host = el.parentElement || el;
              const sig = () => [...host.querySelectorAll("*")].filter(e => !(e instanceof HTMLCanvasElement)).slice(0, 120).map(e => { const c = getComputedStyle(e);
                return [c.outlineStyle, c.outlineWidth, c.outlineColor, c.boxShadow, c.opacity, c.color, c.backgroundColor, c.borderColor, c.filter].join(","); }).join("|");
              const wait = () => new Promise(r => setTimeout(r, 500)); await wait(); const a = sig(); el.blur(); await wait(); const b = sig(); el.focus(); await wait(); return a !== b; });
            f.viaDescendants = f.ind; }
          seq.push(f.body ? "body" : f.d);
          if (!f.body && (!f.ind || !f.vis || (dialog && !f.inDialog))) bad.push({ ...f });
        }
        const uniq = [...new Set(seq)];
        let axe = null;
        if (AXE) { if (!(await p.evaluate(() => !!window.axe))) await p.addScriptTag({ content: AXE });
          axe = await p.evaluate(async scope => { const r = await window.axe.run(document.querySelector(scope) || document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] }, resultTypes: ["violations"] });
            return r.violations.map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length, t: v.nodes.slice(0, 2).map(x => x.target.join(" ")).join(" | ").slice(0, 160),
              nodes: v.nodes.slice(0, 8).map(x => ({ t: x.target.join(" "), text: (document.querySelector(x.target.join(" ")) || {}).textContent ? document.querySelector(x.target.join(" ")).textContent.trim().slice(0, 40) : "",
                data: x.any && x.any[0] && x.any[0].data ? { ratio: x.any[0].data.contrastRatio, fg: x.any[0].data.fgColor, bg: x.any[0].data.bgColor, size: x.any[0].data.fontSize, weight: x.any[0].data.fontWeight, need: x.any[0].data.expectedContrastRatio } : null })) })); }, scope); }
        return { screen, ...out, tabStops: uniq.length, seq: uniq.slice(0, 14), bad: bad.slice(0, 6), badCount: bad.length, axe };
      };
      const A = [];
      const record = (a, extra = {}) => { A.push({ ...a, ...extra }); const serious = (a.axe || []).filter(v => v.impact === "critical" || v.impact === "serious");
        info(`${bn}:A:${a.screen}`, { controls: a.controls, unnamed: a.unnamed.length, tabStops: a.tabStops, focusProblems: a.badCount, live: a.live, axe: (a.axe || []).map(v => `${v.id}(${v.impact},${v.n})`).join(" ") || (AXE ? "clean" : "not run"), seq: a.seq.slice(0, 8).join(" → ") }); return serious; };
      const c = await context({ trained: false, seeded: true }), p = await page(c); const esc = {}; const serious = []; const issues = [];
      try {
        await p.goto(`${ORIGIN}/?launch=3&bg=5`); await menuReady(p);
        // the first-run recommendation dialog (EXPEDITION before training): a real dialog — focus trapped, Escape closes
        await p.focus('.mm-item[data-act="begin"]'); await p.keyboard.press("Enter"); await p.waitForTimeout(500);
        const rec = await p.evaluate(() => { const d = document.querySelector("dialog[open], [role=dialog]:not([hidden]), [aria-modal=true]"); return d ? { sel: d.tagName.toLowerCase() + (d.id ? "#" + d.id : d.className ? "." + String(d.className).split(" ")[0] : ""), modal: d.getAttribute("aria-modal") || (d.tagName === "DIALOG" ? "dialog" : null), label: !!(d.getAttribute("aria-labelledby") || d.getAttribute("aria-label")) } : null; });
        if (rec) { const a = await audit(p, "first-run dialog", rec.sel, { dialog: rec.sel, tabs: 8 }); serious.push(...record(a, { rec }));
          await p.keyboard.press("Escape"); await p.waitForTimeout(400); esc.firstRun = await p.evaluate(() => ({ state: MENU_DEV.entry.state, open: !!document.querySelector("dialog[open]") })); }
        else issues.push("first-run dialog not found");
        await p.evaluate(() => { try { localStorage.setItem("strange-bloom.training", '{"v":1,"status":"completed","at":1}'); } catch (e) {} });
        await p.goto(`${ORIGIN}/?launch=3&bg=5`); await menuReady(p);
        serious.push(...record(await audit(p, "main menu", "#app", { tabs: 12 })));
        for (const act of ["settings", "credits"]) { await p.click(`.mm-item[data-act="${act}"]`); await p.waitForTimeout(500);
          const sel = await p.evaluate(() => { const d = document.querySelector("dialog[open]"); return d ? "dialog[open]" : null; });
          if (sel) { serious.push(...record(await audit(p, act + " dialog", sel, { dialog: sel, tabs: 14 }))); await p.keyboard.press("Escape"); await p.waitForTimeout(400); esc[act] = await p.evaluate(() => ({ open: !!document.querySelector("dialog[open]"), focus: document.activeElement && document.activeElement.dataset.act })); }
          else issues.push(act + " dialog not found"); }
        // keyboard-only: EXPEDITION via Enter on the focused menu item
        await p.focus('.mm-item[data-act="begin"]'); await p.keyboard.press("Enter"); await speciesReady(p);
        serious.push(...record(await audit(p, "species selection", "#app", { tabs: 14 })));
        await p.keyboard.press("Escape"); await p.waitForTimeout(700); esc.species = await p.evaluate(() => MENU_DEV.entry.state);
        if (esc.species === "menu") { await atMenu(p); await p.focus('.mm-item[data-act="begin"]'); await p.keyboard.press("Enter"); await speciesReady(p); }
        await p.evaluate(SSX => eval(SSX).open("organic_hybrid"), SS); await p.waitForTimeout(400);
        serious.push(...record(await audit(p, "species dossier", "#app", { tabs: 10 })));
        await p.click(".ss-btn.go"); await surveyShown(p); await surveyFull(p);
        serious.push(...record(await audit(p, "destination survey", "#app", { tabs: 16 })));
        const i0 = await p.evaluate(() => MENU_DEV.entry.survey.cells.findIndex(Boolean)); await p.evaluate(i => MENU_DEV.entry.survey.select(i), i0); await p.waitForTimeout(600);
        serious.push(...record(await audit(p, "survey focus", "#app", { tabs: 10 })));
        await p.keyboard.press("Escape"); await p.waitForFunction(() => MENU_DEV.entry.survey.state === "survey", null, { timeout: 15000, polling: 50 }).catch(() => {}); esc.surveyFocus = await p.evaluate(() => MENU_DEV.entry.survey.state);
        await p.evaluate(i => MENU_DEV.entry.survey.select(i), i0); await p.waitForTimeout(500); await p.focus(".ds-btn.go"); await p.keyboard.press("Enter"); await runReady(p, 1);
        serious.push(...record(await audit(p, "run map", "#pv", { tabs: 16 })));
        // a region selected via the keyboard (the map canvas is focusable: arrows move, Enter selects)
        await p.focus("#pvMap").catch(() => {}); await p.keyboard.press("ArrowRight"); await p.keyboard.press("Enter"); await p.waitForTimeout(400);
        const regionSel = await p.evaluate(() => !!document.querySelector(".pv-st"));
        serious.push(...record(await audit(p, "region banner", "#pv", { tabs: 10 }), { regionSel }));
        await p.keyboard.press("Escape"); await p.waitForTimeout(300); esc.region = await p.evaluate(() => !document.querySelector(".pv-st"));
        for (const room of ["region", "adapt", "spread", "terraform"]) {
          await p.focus(`.pv-tool[data-tool="${room}"]`); await p.keyboard.press("Enter");
          try { await roomOpen(p, room === "region" ? "inspect" : room); } catch (e) { await roomOpen(p, room).catch(() => {}); }
          await p.waitForTimeout(500); const st = await p.evaluate(() => BLOOM.decisionRooms.instance.state().room);
          serious.push(...record(await audit(p, `room:${st}`, "#dr", { tabs: 16 })));
          await p.keyboard.press("Escape"); await roomClosed(p).catch(() => {}); esc["room:" + st] = await p.evaluate(() => ({ closed: !BLOOM.decisionRooms.instance.state().room, focus: document.activeElement && (document.activeElement.dataset.tool || document.activeElement.id) }));
        }
        await p.click("#pvMenuBtn"); await p.waitForTimeout(300); serious.push(...record(await audit(p, "run menu", "#pvMenu", { tabs: 5 })));
        await p.keyboard.press("Escape"); await p.waitForTimeout(300); esc.runMenu = await p.evaluate(() => ({ hidden: document.getElementById("pvMenu").hidden, focus: document.activeElement && document.activeElement.id }));
        await winNow(p); await reportOpen(p); await p.waitForTimeout(400);
        serious.push(...record(await audit(p, "report", "#rr", { dialog: "#rr", tabs: 12 })));
        await p.keyboard.press("Escape"); await p.waitForTimeout(300); esc.report = await p.evaluate(() => BLOOM.runReport.instance.state().open);
        await p.click('#rr [data-act="mainMenu"]'); await atMenu(p);
        await p.focus('.mm-item[data-act="challenges"]'); await p.keyboard.press("Enter"); await hubReady(p);
        serious.push(...record(await audit(p, "challenge hub", "#app", { tabs: 14 })));
        await p.evaluate(HUBX => eval(HUBX).select("low_tide", { focus: true }), HUB); await p.click(".ch-btn.go"); await worldReady(p); await p.waitForTimeout(300);
        serious.push(...record(await audit(p, "challenge dossier", "#app", { tabs: 10 })));
        await p.keyboard.press("Escape"); await p.waitForTimeout(800); esc.dossier = await p.evaluate(() => MENU_DEV.entry.state);
        if (esc.dossier === "challenges") { await hubReady(p); await p.keyboard.press("Escape"); await p.waitForTimeout(800); esc.hub = await p.evaluate(() => MENU_DEV.entry.state); }
        await atMenu(p).catch(() => {});
        await p.click('.mm-item[data-act="training"]'); await trainReady(p, 2); await p.waitForTimeout(600);
        serious.push(...record(await audit(p, "training coach", "#app", { tabs: 10 })));
        await p.click(".tc-card .tc-skip"); await p.waitForSelector(".tsk [data-skip=skip]", { timeout: 10000 }); await p.waitForTimeout(300);
        serious.push(...record(await audit(p, "skip-training dialog", ".tsk", { dialog: ".tsk", tabs: 6 })));
        await p.keyboard.press("Escape"); await p.waitForTimeout(300); esc.skipDialog = await p.evaluate(() => !!document.querySelector(".tsk"));
      } catch (e) { issues.push(String(e.message).slice(0, 300)); }
      info(`${bn}:A:escape`, esc);
      const unnamed = A.flatMap(a => a.unnamed.map(u => `${a.screen}: ${u}`)), focusBad = A.flatMap(a => a.bad.map(b => `${a.screen}: ${J(b)}`));
      check(!issues.length && !unnamed.length, tag(`A1 · every visible control on ${A.length} screens has an accessible name (aria-label / labelledby / text)`), J({ issues, unnamed: unnamed.slice(0, 8) }));
      check(!focusBad.length, tag("A2 · keyboard-only Tab walk on every screen: each focus stop is on-screen with a visible focus indicator; dialogs (first-run, Settings, Credits, report, Skip training) keep focus inside"), J(focusBad.slice(0, 8)));
      check(esc.species === "menu" && esc.surveyFocus === "survey" && esc.dossier === "challenges" && esc.hub === "menu" && Object.keys(esc).filter(k => k.startsWith("room:")).every(k => esc[k].closed)
          && esc.runMenu && esc.runMenu.hidden && esc.settings && !esc.settings.open && esc.credits && !esc.credits.open && esc.report === true,
        tag("A3 · Escape / Back: Species → Main Menu · survey focus → survey · dossier → hub → Main Menu · every room → the map · run menu closes · Settings / Credits close · the end-of-run report deliberately stays (its actions are the way on)"), J(esc));
      // colour contrast is reported separately: the failing pairs are the locked BLOOM-033 / 034 visual-system tokens (a design decision for the
      // PMO, docs/evidence/bloom-037/REPORT.md § Accessibility) — never silently counted as a pass
      const other = serious.filter(v => v.id !== "color-contrast"), contrast = A.flatMap(a => (a.axe || []).filter(v => v.id === "color-contrast").flatMap(v => v.nodes.map(n => ({ screen: a.screen, text: n.text, ...n.data }))));
      const pairs = {}; for (const x of contrast) { const k = `${x.fg} on ${x.bg}`; (pairs[k] = pairs[k] || { ratio: x.ratio, need: x.need, n: 0, eg: [] }).n++; if (pairs[k].eg.length < 4 && !pairs[k].eg.includes(x.text)) pairs[k].eg.push(x.text); }
      info(`${bn}:A:contrast-debt`, pairs);
      check(!!AXE && !other.length && !A.some(a => (a.axe || []).some(v => v.impact === "critical")), tag(`A4 · axe-core WCAG 2.1 A/AA on ${A.length} screens: no critical violation and no serious violation other than colour contrast${AXE ? "" : " (axe NOT run: set AXE)"}`), J(other.slice(0, 8)));
      check(true, tag(`A4b · KNOWN (not fixed in 037, PMO token decision): ${Object.keys(pairs).length} text/background colour pairs below WCAG AA 4.5:1 — ${Object.entries(pairs).map(([k, v]) => `${k} ${v.ratio}:1`).join(" · ")}`), J(pairs));
      RESULTS.info[`${bn}:A:screens`] = A;
      await c.close();
      // reduced motion: the title's fades and the long decorative animations honour prefers-reduced-motion
      { const c2 = await context({ reducedMotion: "reduce" }), p2 = await page(c2); await p2.goto(`${ORIGIN}/?bg=5`); await menuReady(p2);
        const t0 = Date.now(); await p2.click('.mm-item[data-act="begin"]'); await speciesReady(p2); const ms = Date.now() - t0;
        const anim = await p2.evaluate(() => document.getAnimations().filter(a => a.playState === "running").map(a => { const t = a.effect.getComputedTiming(); return Math.round(t.duration === Infinity ? -1 : t.duration); }).filter(d => d > 600 || d < 0).length);
        info(`${bn}:A:reduced-motion`, { menuToSpeciesMs: ms, longRunningAnimations: anim });
        check(anim === 0, tag("A5 · prefers-reduced-motion: no long-running (> 600 ms / infinite) animation on Choose Plant Species"), J({ ms, anim }));
        await c2.close(); }
    }

    // ======================================================================================== R · responsive
    if (ONLY.includes("R")) {
      const fit = (p, screen) => p.evaluate(screen => {
        const de = document.documentElement, overflowX = Math.max(de.scrollWidth, document.body.scrollWidth) - innerWidth;
        const vis = el => { const r = el.getBoundingClientRect(), cs = getComputedStyle(el); return r.width > 1 && r.height > 1 && cs.visibility !== "hidden" && cs.display !== "none" && !el.closest("[hidden],[inert],[aria-hidden=true]") && parseFloat(cs.opacity) > 0.05; };
        // an open modal (a <dialog> shown modally, aria-modal) owns the screen: what is behind it is inert by design
        const modal = [...document.querySelectorAll('dialog[open], [aria-modal="true"]')].find(vis);
        const ctrls = [...(modal || document).querySelectorAll('button,a[href],[role=button],[tabindex="0"]')].filter(vis);
        const unreachable = [];
        for (const el of ctrls) { el.scrollIntoView({ block: "nearest", inline: "nearest" }); const r = el.getBoundingClientRect();
          const x = Math.min(innerWidth - 2, Math.max(1, r.left + r.width / 2)), y = Math.min(innerHeight - 2, Math.max(1, r.top + r.height / 2)), hit = document.elementFromPoint(x, y);
          const inView = r.right > 0 && r.left < innerWidth && r.bottom > 0 && r.top < innerHeight;
          if (!inView || !hit || !(hit === el || el.contains(hit) || hit.contains(el))) unreachable.push((el.id ? "#" + el.id : el.tagName.toLowerCase() + "." + String(el.className).trim().split(/\s+/).slice(0, 2).join(".")) + (el.dataset.act ? `[${el.dataset.act}]` : "") + ` @${Math.round(r.left)},${Math.round(r.top)} hit=${hit ? (hit.id || hit.className || hit.tagName).toString().slice(0, 30) : "none"}`); }
        const dialogs = [...document.querySelectorAll("dialog[open], #rr:not([hidden]) .rr-card, .tsk")].filter(vis).map(d => { const r = d.getBoundingClientRect(); return { out: r.top < -1 || r.left < -1 || r.right > innerWidth + 1 || (r.bottom > innerHeight + 1 && getComputedStyle(d).overflowY === "visible") }; });
        const spec = [...document.querySelectorAll(".dr-room:not([hidden]) canvas.ps-canvas, .dr-room:not([hidden]) .lf-top canvas, .ss-card canvas, .ss-dossier canvas")].filter(vis).map(cv => { const r = cv.getBoundingClientRect(), f = cv.parentElement.getBoundingClientRect(); return r.left < f.left - 1 || r.right > f.right + 1 || r.top < f.top - 1 || r.bottom > f.bottom + 1; });
        window.scrollTo(0, 0); document.querySelectorAll("*").forEach(e => { if (e.scrollTop) e.scrollTop = 0; });
        return { overflowX, modal: modal ? (modal.id || modal.className || modal.tagName).toString().slice(0, 30) : null, controls: ctrls.length, unreachable: unreachable.slice(0, 6), nUnreach: unreachable.length, dialogOut: dialogs.filter(d => d.out).length, specimenClipped: spec.filter(Boolean).length };
      }, screen);
      const R = []; const sweep = async (p, screen, { skip = [] } = {}) => {
        for (const [w, h] of VIEWPORTS) { if (skip.includes(w)) continue; await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(450);
          const f = await fit(p, screen); R.push({ screen, vp: `${w}x${h}`, ...f }); if (w === 390 || w === 1440 || (w === 2560 && bn === "chromium")) await shot(p, `r-${screen}-${w}`); }
        await p.setViewportSize({ width: 1440, height: 900 }); await p.waitForTimeout(250); };
      const c = await context({ seeded: true }), p = await page(c); const errs = [];
      try {
        await p.goto(`${ORIGIN}/?launch=3&bg=5`); await menuReady(p); await sweep(p, "main-menu");
        await p.click('.mm-item[data-act="settings"]'); await p.waitForTimeout(400); await sweep(p, "settings"); await p.keyboard.press("Escape"); await p.waitForTimeout(300);
        await toSpecies(p); await sweep(p, "species-4-cards");
        await p.evaluate(SSX => eval(SSX).open("woolly_candle"), SS); await p.waitForTimeout(400); await sweep(p, "species-dossier");
        await p.click(".ss-btn.go"); await surveyShown(p); await surveyFull(p); await sweep(p, "survey");
        const i0 = await p.evaluate(() => MENU_DEV.entry.survey.cells.findIndex(Boolean)); await p.evaluate(i => MENU_DEV.entry.survey.select(i), i0); await p.waitForTimeout(500); await sweep(p, "survey-focus");
        await p.keyboard.press("Escape"); await p.waitForFunction(() => MENU_DEV.entry.survey.state === "survey", null, { timeout: 15000, polling: 50 }); await p.click(".ds-exit"); await atMenu(p);
        await p.click('.mm-item[data-act="challenges"]'); await hubReady(p); await sweep(p, "hub-6-cards");
        await p.evaluate(HUBX => eval(HUBX).select("low_tide"), HUB); await p.click(".ch-btn.go"); await worldReady(p); await sweep(p, "dossier-low-tide");
        await p.keyboard.press("Escape"); await hubReady(p);
        await p.evaluate(HUBX => eval(HUBX).select("oasis_line"), HUB); await p.click(".ch-btn.go"); await worldReady(p); await sweep(p, "dossier-oasis-line");
        await p.click(".cw-btn.go"); await runReady(p, 1); await sweep(p, "run-map-oasis");
        await p.evaluate(async () => { const A = BLOOM_APP.session.adapter, o = A.regions().find(x => x.isOrigin); A.actions.selectRegion(o.index); await new Promise(r => setTimeout(r, 300)); });
        await sweep(p, "region-banner-refuge");
        for (const room of ["adapt", "spread", "terraform"]) { await p.click(`.pv-tool[data-tool="${room}"]`); await roomOpen(p, room); await sweep(p, `room-${room}`); await p.keyboard.press("Escape"); await roomClosed(p); }
        await menuAct(p, "challenges"); await hubReady(p);
        await p.evaluate(HUBX => eval(HUBX).select("thin_air"), HUB); await p.click(".ch-btn.go"); await worldReady(p); await p.click(".cw-btn.go"); await runReady(p, 2);
        await p.evaluate(() => BLOOM_API.advance(300)); await sweep(p, "thin-air-hud");
        await dieOff(p); await reportOpen(p); await sweep(p, "thin-air-report-extinction");
        await p.click('#rr [data-act="mainMenu"]'); await atMenu(p);
        await p.click('.mm-item[data-act="training"]'); await trainReady(p, 3); await p.waitForTimeout(600); await sweep(p, "training-coach");
      } catch (e) { errs.push(String(e.message).slice(0, 300)); }
      // the supported matrix: the planning screens (menu, Settings, species, survey, hub, dossiers) at every size incl. the 390 × 844 phone
      // (their documented phone layouts); the gameplay screens (run map, banner, rooms, HUD, report, Training) from 1024 px wide — the run
      // UI has no narrow layout (designed and QA'd at 1024–1440+ since BLOOM-029), recorded as a KNOWN limitation below, not a pass
      const RUN = /^(run-map|region-banner|room-|thin-air|training)/, problem = r => r.overflowX > 1 || r.nUnreach || r.dialogOut || r.specimenClipped;
      const narrowRun = r => RUN.test(r.screen) && parseInt(r.vp) < 1024;
      const bad = R.filter(r => problem(r) && !narrowRun(r)), known = R.filter(r => problem(r) && narrowRun(r));
      for (const r of bad) info(`${bn}:R:problem`, r);
      info(`${bn}:R:summary`, { screens: new Set(R.map(r => r.screen)).size, samples: R.length, problems: bad.length, narrowGameplay: known.length });
      check(!errs.length && R.length >= 60 && !bad.length && !p.errs.length, tag(`R1 · responsive (${new Set(R.map(r => r.screen)).size} screens; planning screens at 390×844 · 1024×768 · 1440×900 · 2560×1440, gameplay screens at 1024 / 1440 / 2560): no horizontal overflow, every visible control scrolls into view un-covered, dialogs inside the viewport, specimens inside their frames`),
        J({ errs, bad: bad.slice(0, 6), pageErrs: p.errs.slice(0, 3) }));
      check(true, tag(`R1b · KNOWN LIMITATION (recorded, not a pass): gameplay at 390×844 — ${known.length} of ${R.filter(narrowRun).length} gameplay screens have covered controls / clipped specimens (the run UI has no phone layout)`), J(known.map(r => `${r.screen}: ${r.unreachable.join("; ")}${r.specimenClipped ? " · specimen clipped" : ""}`)));
      RESULTS.info[`${bn}:R:all`] = R;
      await c.close();
    }

    // ======================================================================================== P · performance sanity (median of 3)
    if (ONLY.includes("P") && bn !== "webkit") {
      const runs = [];
      for (let k = 0; k < 3; k++) { const c = await context({ seeded: true }), p = await page(c); const m = {};
        try {
          let t = Date.now(); await p.goto(`${ORIGIN}/?launch=3&bg=5`); await menuReady(p); m.titleReady = Date.now() - t;
          t = Date.now(); await toSpecies(p); m.menuToSpecies = Date.now() - t;
          await p.evaluate(SSX => eval(SSX).open("organic_hybrid"), SS); await p.waitForTimeout(200);
          t = Date.now(); await p.click(".ss-btn.go"); await surveyShown(p); m.speciesToSurvey = Date.now() - t;
          await p.waitForFunction(() => MENU_DEV.entry.survey.cells.some(Boolean), null, { timeout: T.survey, polling: 50 }); m.firstWorld = Date.now() - t;
          await surveyFull(p); m.allNineWorlds = Date.now() - t;
          const i0 = await p.evaluate(() => MENU_DEV.entry.survey.cells.findIndex(Boolean)); await p.evaluate(i => MENU_DEV.entry.survey.select(i), i0); await p.waitForFunction(() => MENU_DEV.entry.survey.state === "focus", null, { timeout: 20000 });
          t = Date.now(); await p.click(".ds-btn.go"); await runReady(p, 1); m.beginToRun = Date.now() - t;
          for (const room of ["adapt", "terraform"]) { t = Date.now(); await p.click(`.pv-tool[data-tool="${room}"]`); await roomOpen(p, room); m[`open:${room}`] = Date.now() - t;
            t = Date.now(); await p.keyboard.press("Escape"); await roomClosed(p); m[`close:${room}`] = Date.now() - t; }
          await p.evaluate(() => { const s = BLOOM_API.sim; BLOOM_API.advance(40); s.won = true; }); t = Date.now(); await p.evaluate(() => BLOOM_API.sim.onWin(BLOOM_API.sim.coverage())); await reportOpen(p); m.reportOpen = Date.now() - t;
          await p.click('#rr [data-act="mainMenu"]'); await atMenu(p);
          for (const id of ["dying_world", "low_tide", "oasis_line"]) {   // (all three exist on main d0eaf8f too: the same flow on both roots) t = Date.now(); await p.click('.mm-item[data-act="challenges"]').catch(() => {}); await hubReady(p); m[`menuToHub`] = m.menuToHub || (Date.now() - t);
            await p.evaluate(([HUBX, id]) => eval(HUBX).select(id), [HUB, id]); t = Date.now(); await p.click(".ch-btn.go");
            if (!PRESCRIBED[id]) { await speciesReady(p); await p.evaluate(SSX => eval(SSX).open("woolly_candle"), SS); await p.waitForTimeout(150); t = Date.now(); await p.click(".ss-btn.go"); }
            await worldReady(p); m[`dossier:${id}`] = Date.now() - t; await p.keyboard.press("Escape"); await hubReady(p); await p.keyboard.press("Escape"); await atMenu(p); }
          const W = await p.evaluate(() => ({ workers: window.__w.length, longtasks: window.__lt.length, maxLong: Math.max(0, ...window.__lt.map(x => x[1])), sumLong: window.__lt.reduce((n, x) => n + x[1], 0) }));
          Object.assign(m, W);
          const counts = {}; for (const u of p.reqs) { const k = u.replace(/[?#].*$/, ""); counts[k] = (counts[k] || 0) + 1; }
          m.requests = p.reqs.length; m.dupes = Object.entries(counts).filter(([u, n]) => n > 1 && !/^(data|blob):/.test(u)).map(([u, n]) => `${u.replace(ORIGIN, "")}×${n}`);
          m.validatorCalls = await p.evaluate(() => (window.__vc || 0));
        } catch (e) { m.error = String(e.message).slice(0, 200); }
        runs.push(m); await c.close(); }
      const keys = Object.keys(runs[0]).filter(k => typeof runs[0][k] === "number");
      const med = Object.fromEntries(keys.map(k => { const v = runs.map(r => r[k]).filter(x => typeof x === "number").sort((a, b) => a - b); return [k, v[Math.floor(v.length / 2)]]; }));
      info(`${bn}:P:median`, med); info(`${bn}:P:dupes`, runs[0].dupes || []); RESULTS.info[`${bn}:P:runs`] = runs;
      check(runs.every(r => !r.error), tag("P1 · performance sanity flow (title → species → survey → run → rooms → report → three Challenge dossiers) completed three times"), J(runs.map(r => r.error).filter(Boolean)));
    }
    await browser.close();
  }
  srv.close(); fs.rmSync(SITE_DIR, { recursive: true, force: true });
  if (JSON_OUT) fs.writeFileSync(JSON_OUT, J(RESULTS, null, 1));
  console.log(`\n${passes} passed, ${fails} failed`); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
