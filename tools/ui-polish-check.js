// BLOOM — v1.0.1 UI polish checks (owner direction, 2026-10-13). The 46th regression suite. docs/evidence/bloom-v1.0.1/REPORT.md.
//
//   NODE_PATH="$(npm root -g)" node tools/ui-polish-check.js [--browsers chromium,firefox] [--only T,M,S,P,W,C,O] [--evidence]
//   WebKit (macOS 12: Playwright 1.46.1 client + the frozen webkit_mac12_special build): PW_MODULE=<dir>/node_modules/playwright
//   PLAYWRIGHT_BROWSERS_PATH=<dir> node tools/ui-polish-check.js --browsers webkit --only T,M      AXE=<axe.min.js> adds the axe scan (S).
//
// Sections (the production document index.html; the map geometry on the developer harness demos/demo-run.html, the same Planet View):
//   T · text selection — no player-facing text is pointer-selectable: a real pointer drag (and a double-click) over the title, a menu
//       label, Settings copy, Species Selection, the Destination Survey, the Challenge dossier, the Challenge Planet Dossier, the gameplay
//       HUD / banner, the Adapt room, the Bloom report and Training leaves window.getSelection() empty; the one central rule is on the
//       document root and the controls still work (the drag ends outside the control, as a selection drag would).
//   M · Main Menu — exactly EXPEDITION · CHALLENGES · TRAINING · SETTINGS (no CREDITS entry or dialog); keyboard traversal wraps over four;
//       while the sector prefetch is actively progressing the title carries NO status text ("Surveying sector", "n of 9 worlds", "Sector
//       surveyed", "worlds ready"), the prefetch still advances to ready, BEGIN EXPEDITION's survey ADOPTS it, and no banner appears after.
//   S · Settings — Motion + "Show Training recommendation again" + "Reset preferences": after a completed AND a skipped Training the action
//       restores the first-run state (Recommended tag back, the recommendation dialog on the next EXPEDITION, nothing launched); Reset puts
//       Motion back to Follow system and the training record to first-run, changes only the two BLOOM keys (unrelated storage survives), the
//       controls update in place; accessible names, keyboard activation, focus stays inside, Escape / Done; axe (with AXE) finds nothing.
//   P · planning panels — the Challenge dossier (Dying World · Thin Air), the species dossier (short · long), the Destination Survey's
//       focused-planet dossier (two worlds) and the Challenge Planet Dossier (ordinary · authored) take their CONTENT's height, top-aligned,
//       up to the available height, scrolling inside only when the content overflows; 390×844 keeps the sheet / stacked behaviour.
//   W · one flat world — on a cylindrical generated planet at 1024 / 1440 / 2560 the map draws exactly one copy, centred; the side gutters
//       are outside the map (no tile, a click deselects — never x mod W); labels drawn once; the topology still wraps; rectangles unchanged.
//   C · icy water — on a Frozen planet every water tile is cold: deeper and cooler than plain water, ripple marks darker than the surface,
//       the white frost glints on land only; Ocean / Desert water is byte-identical to the plain palette; globe = map (one surface).
//   O · origins — http "/", the Pages site "/bloom/" and file:// (the portable runtime) all show the same title (no status, four entries,
//       the Settings actions, the root selection rule). Exits 1 on any FAIL.
"use strict";
const path = require("path"), fs = require("fs"), http = require("http"), os = require("os");
const argv = process.argv, argOf = k => { const i = argv.indexOf(k); return i > 0 ? argv[i + 1] : null; };
const ROOT = path.resolve(__dirname, ".."), J = JSON.stringify;
const BROWSERS = (argOf("--browsers") || "chromium,firefox").split(","), ONLY = (argOf("--only") || "T,M,S,P,W,C,O").split(","), EVIDENCE = argv.includes("--evidence");
const EVD = path.join(ROOT, "docs/evidence/bloom-v1.0.1/shots"), AXE = process.env.AXE && fs.existsSync(process.env.AXE) ? fs.readFileSync(process.env.AXE, "utf8") : null;
const pw = require(process.env.PW_MODULE || "playwright");
let fails = 0, passes = 0; const t0 = Date.now();
const check = (ok, name, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); if (ok) passes++; else fails++; };
const info = (name, detail) => console.log(`INFO  ${name}  — ${typeof detail === "string" ? detail : J(detail)}`);
const BAN = /surveying sector|sector surveyed|worlds ready|of 9 worlds/i, VIEWPORTS = [[390, 844], [1024, 768], [1440, 900], [2560, 1440]], PRESCRIBED = { low_tide: "organic_hybrid", oasis_line: "reed_spire", thin_air: "woolly_candle" };
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml" };

(async () => {
  // static server: the repository at "/" and the Pages site (tools/build-pages-site.mjs) under "/bloom/"
  const { buildSite } = await import("file://" + path.join(ROOT, "tools/build-pages-site.mjs"));
  const SITE = fs.mkdtempSync(path.join(os.tmpdir(), "bloom-v101-site-")); buildSite(ROOT, SITE);
  const srv = http.createServer((req, res) => { const u = new URL(req.url, "http://x"); let base = ROOT, p = decodeURIComponent(u.pathname);
    if (p.startsWith("/bloom/")) { base = SITE; p = p.slice("/bloom".length); } if (p.endsWith("/")) p += "index.html";
    const f = path.join(base, p); if (!f.startsWith(base) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end("not found"); }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream", "Cache-Control": "no-store" }); fs.createReadStream(f).pipe(res); });
  await new Promise(r => srv.listen(0, "127.0.0.1", r)); const O = `http://127.0.0.1:${srv.address().port}`;
  const FILE_INDEX = "file://" + path.join(ROOT, "index.html").split("/").map(encodeURIComponent).join("/");
  if (EVIDENCE) fs.mkdirSync(EVD, { recursive: true });

  for (const bn of BROWSERS) {
    const browser = await pw[bn].launch(); console.log(`\n# ${bn} ${browser.version()}`); const tag = s => `[${bn}] ${s}`;
    const shot = async (p, name) => { if (!EVIDENCE) return; await p.waitForTimeout(200); await p.screenshot({ path: path.join(EVD, `${bn}-${name}.png`) }).catch(() => {}); };
    const context = async ({ width = 1440, height = 900, offline = false, training = "completed", extra = null } = {}) => {
      const c = await browser.newContext({ viewport: { width, height } }); if (offline) await c.setOffline(true);
      await c.addInitScript(([tr, ex]) => { try { if (tr) localStorage.setItem("strange-bloom.training", JSON.stringify({ v: 1, status: tr, at: 1 })); else localStorage.removeItem("strange-bloom.training");
        for (const [k, v] of Object.entries(ex || {})) localStorage.setItem(k, v); } catch (e) { /* storage blocked */ } }, [training, extra]);
      return c; };
    const page = async c => { const p = await c.newPage(); p.errs = []; p.on("pageerror", e => p.errs.push("pageerror: " + e.message)); p.on("console", m => { if (m.type() === "error") p.errs.push("console: " + m.text()); }); p.on("dialog", d => d.accept()); return p; };
    const T = { menu: 90000, flow: 120000, survey: 240000 };
    const menuReady = p => p.waitForFunction(() => window.MENU_DEV && MENU_DEV.ready && MENU_DEV.entry.state === "menu" && MENU_DEV.entry.black.style.display === "none", null, { timeout: T.menu, polling: 50 });
    const hubReady = p => p.waitForFunction(() => { const e = MENU_DEV.entry, v = e.challengeView; return e.state === "challenges" && v && v.inner && e.black.style.display === "none"; }, null, { timeout: T.flow, polling: 50 });
    const speciesReady = p => p.waitForFunction(() => { const e = MENU_DEV.entry, v = e.speciesView; return e.state === "species" && v && v.inner && v.inner.state === "cards" && !e.covered && e.black.style.display === "none"; }, null, { timeout: T.flow, polling: 50 });
    const worldReady = p => p.waitForFunction(() => { const e = MENU_DEV.entry, v = e.worldView; return e.state === "challenge-world" && v && v.inner && v.inner.state === "ready" && e.black.style.display === "none"; }, null, { timeout: T.flow, polling: 50 });
    const surveyShown = p => p.waitForFunction(() => { const s = MENU_DEV.entry.survey; return s && s.state === "survey" && MENU_DEV.entry.black.style.display === "none"; }, null, { timeout: T.flow, polling: 50 });
    const someCells = p => p.waitForFunction(() => MENU_DEV.entry.survey && MENU_DEV.entry.survey.cells.some(Boolean), null, { timeout: T.survey, polling: 100 });
    const runReady = (p, n) => p.waitForFunction(n => window.BLOOM_APP && BLOOM_APP.session && BLOOM_APP.stats.sessions.length >= n && BLOOM_APP.stats.sessions[n - 1].readyMs !== null && !BLOOM_APP.busy
      && !document.querySelector(".atx") && MENU_DEV.entry.state === "away" && MENU_DEV.entry.black.style.display === "none", n, { timeout: T.flow, polling: 50 });
    const trainReady = (p, n) => p.waitForFunction(n => window.BLOOM_TRAINING_UI && BLOOM_TRAINING_UI.stats.liftedAt && BLOOM_TRAINING_UI.guide.mounted && BLOOM_APP.stats.sessions.length >= n && !BLOOM_APP.busy, n, { timeout: T.flow, polling: 50 });
    const reportOpen = p => p.waitForFunction(() => BLOOM.runReport.instance && BLOOM.runReport.instance.state().open && !BLOOM.runReport.instance.state().busy, null, { timeout: 60000, polling: 30 });
    const roomOpen = (p, room) => p.waitForFunction(r => { const st = BLOOM.decisionRooms.instance.state(); return st.room === r && !st.transitioning; }, room, { timeout: 30000, polling: 30 });
    const HUB = "MENU_DEV.entry.challengeView.inner", SS = "MENU_DEV.entry.speciesView.inner";
    const toSpecies = async p => { await p.click('.mm-item[data-act="begin"]'); await speciesReady(p); };
    const chooseSpecies = async (p, sp) => { await p.evaluate(([SSX, sp]) => eval(SSX).open(sp), [SS, sp]); await p.waitForTimeout(150); await p.click(".ss-btn.go"); };
    const focusFirst = async p => { await someCells(p); const i = await p.evaluate(() => MENU_DEV.entry.survey.cells.findIndex(Boolean)); await p.evaluate(i => MENU_DEV.entry.survey.select(i), i);
      await p.waitForFunction(() => MENU_DEV.entry.survey.state === "focus", null, { timeout: 20000, polling: 50 }); return i; };
    const challenge = async (p, id, sp = null) => { await p.click('.mm-item[data-act="challenges"]').catch(() => {}); await hubReady(p); await p.evaluate(([HUBX, id]) => eval(HUBX).select(id), [HUB, id]); await p.click(".ch-btn.go");
      if (!PRESCRIBED[id]) { await speciesReady(p); await chooseSpecies(p, sp || "organic_hybrid"); } await worldReady(p); };
    const winNow = p => p.evaluate(() => { const s = BLOOM_API.sim; BLOOM_API.advance(40); s.won = true; s.onWin(s.coverage()); });
    // a real selection drag: pointer down on the text, across it, released OUTSIDE the element (so a control is never "clicked"); then a double-click on plain text
    const drag = async (p, sel, dbl = false) => { const l = p.locator(sel).first(); const r = await l.boundingBox(); if (!r) return { sel, missing: true };
      await p.mouse.move(r.x + 3, r.y + r.height / 2); await p.mouse.down(); await p.mouse.move(r.x + r.width - 3, r.y + r.height / 2, { steps: 8 }); await p.mouse.move(r.x + r.width + 30, r.y + r.height + 30, { steps: 3 }); await p.mouse.up(); await p.waitForTimeout(60);
      const a = await p.evaluate(() => window.getSelection().toString()); let b = "";
      if (dbl) { await p.mouse.dblclick(r.x + Math.min(12, r.width / 2), r.y + r.height / 2); await p.waitForTimeout(60); b = await p.evaluate(() => window.getSelection().toString()); await p.evaluate(() => window.getSelection().removeAllRanges()); }
      // the EFFECTIVE value: Firefox reports the specified `auto` on descendants, so walk to the nearest ancestor whose computed value is not `auto`
      const us = await l.evaluate(e => { const v = x => getComputedStyle(x).userSelect || getComputedStyle(x).webkitUserSelect; let n = e; while (n && v(n) === "auto") n = n.parentElement; return n ? v(n) : "auto"; });
      return { sel, drag: a, dbl: b, us }; };
    const menuState = p => p.evaluate(() => ({ items: [...document.querySelectorAll(".mm-item")].map(b => b.dataset.act), status: !!document.querySelector(".mm-status, .mm [role=status]:not(.mm-set-msg)"), credits: !!document.querySelector('[data-act="credits"], [data-dialog="credits"]'),
      text: document.querySelector(".mm").innerText.replace(/\s+/g, " "), root: getComputedStyle(document.documentElement).userSelect || getComputedStyle(document.documentElement).webkitUserSelect, prefetch: MENU_DEV.entry.prefetch ? MENU_DEV.entry.prefetch.progress : null }));

    // ======================================================================================== T · text selection
    if (ONLY.includes("T")) {
      const c = await context(), p = await page(c); const R = []; let err = null;
      try {
        await p.goto(O + "/?bg=2"); await menuReady(p); await p.waitForTimeout(600);
        R.push(await drag(p, "#mm-title", true), await drag(p, ".mm-sub", true), await drag(p, '.mm-item[data-act="training"]'));
        const still = await p.evaluate(() => MENU_DEV.entry.state); // (the drag over TRAINING ended outside it: nothing launched)
        await p.click('.mm-item[data-act="settings"]'); await p.waitForTimeout(200); R.push(await drag(p, '[data-dialog="settings"] p', true), await drag(p, '[data-dialog="settings"] .mm-choice b'));
        const radio = await p.evaluate(() => { const x = document.querySelector('input[name="mm-motion"][value="reduced"]'); x.click(); return document.querySelector('input[name="mm-motion"]:checked').value; });
        await p.evaluate(() => document.querySelector('input[name="mm-motion"][value="system"]').click()); await p.keyboard.press("Escape"); await p.waitForTimeout(150);
        await toSpecies(p); R.push(await drag(p, ".ss-card h3", true)); await p.evaluate(SSX => eval(SSX).open("organic_hybrid"), SS); await p.waitForTimeout(200); R.push(await drag(p, ".ss-dossier h2", true)); await p.click(".ss-btn.go");
        await surveyShown(p); R.push(await drag(p, ".ds-title h1", true)); await focusFirst(p); await p.waitForTimeout(500); R.push(await drag(p, ".ds-dossier h2", true));
        await p.click(".ds-btn.go"); await runReady(p, 1); await p.waitForTimeout(300);
        R.push(await drag(p, "#pvBanner .bn-t b", true), await drag(p, ".pv-status", true));
        await p.click('.pv-tool[data-tool="adapt"]'); await roomOpen(p, "adapt"); await p.waitForTimeout(200); R.push(await drag(p, ".dr .dr-room:not([hidden]) :is(h2,h3,p,li):visible", true));
        await p.keyboard.press("Escape"); await p.waitForTimeout(400);
        await winNow(p); await reportOpen(p); await p.waitForTimeout(300); R.push(await drag(p, "#rr :is(h2,h3):visible", true), await drag(p, "#rr :is(p,.rr-fact):visible", true));
        await p.reload(); await menuReady(p); await challenge(p, "dying_world"); R.push(await drag(p, ".cw-dossier h2", true)); await p.reload(); await menuReady(p); await p.click('.mm-item[data-act="challenges"]'); await hubReady(p);
        await p.evaluate(HUBX => eval(HUBX).select("thin_air"), HUB); await p.waitForTimeout(200); R.push(await drag(p, ".ch-d-brief", true), await drag(p, ".ch-card h3", true));
        await p.reload(); await menuReady(p); await p.click('.mm-item[data-act="training"]'); await trainReady(p, 1); await p.waitForTimeout(400); R.push(await drag(p, ".tc-card .tc-body", true), await drag(p, ".tc-card .tc-title", true));
        const ok = R.every(r => !r.missing && r.drag === "" && r.dbl === "" && r.us === "none");
        check(ok && still === "menu" && radio === "reduced" && p.errs.length === 0, tag(`T1 · ${R.length} pointer drags (and double-clicks) over the title / subtitle / a menu label / Settings copy and a motion choice / Species Selection (card + dossier) / the Destination Survey (header + focused dossier) / the gameplay HUD + banner / the Adapt room / the Bloom report / the Challenge Planet Dossier / the Challenge hub (dossier + card) / Training all leave window.getSelection() empty; every one computes user-select:none from the root rule; the drag over TRAINING launched nothing and the Settings radio still toggles by click; no page error`),
          J({ bad: R.filter(r => r.missing || r.drag || r.dbl || r.us !== "none"), n: R.length, still, radio, errs: p.errs.slice(0, 2) }));
      } catch (e) { err = String(e.message || e).slice(0, 300); check(false, tag("T1 · text-selection flow completed"), J({ err, done: R.length, errs: p.errs.slice(0, 3) })); }
      await c.close();
    }

    // ======================================================================================== M · Main Menu
    if (ONLY.includes("M")) {
      const c = await context(), p = await page(c);
      await p.goto(O + "/?bg=4"); await menuReady(p);
      const m0 = await menuState(p);
      await p.focus('.mm-item[data-act="begin"]'); const kbd = [];
      for (const k of ["ArrowDown", "ArrowDown", "ArrowDown", "ArrowDown", "End", "Home", "ArrowUp"]) { await p.keyboard.press(k); kbd.push(await p.evaluate(() => document.activeElement.dataset.act)); }
      check(J(m0.items) === J(["begin", "challenges", "training", "settings"]) && !m0.credits && !/credits/i.test(m0.text) && J(kbd) === J(["challenges", "training", "settings", "begin", "settings", "begin", "settings"]),
        tag("M1 · the title menu is exactly EXPEDITION · CHALLENGES · TRAINING · SETTINGS (no CREDITS entry, no Credits dialog, the word nowhere); ↓ walks the four and wraps, End / Home, ↑ wraps up"), J({ items: m0.items, kbd }));
      // the prefetch: poll from the first frame; the title must never carry status text while worlds are being confirmed
      const seen = new Set(), bad = []; let last = null, polls = 0; const tEnd = Date.now() + 150000;
      while (Date.now() < tEnd) { const s = await menuState(p); polls++; if (s.prefetch) seen.add(s.prefetch.confirmed); if (s.status || BAN.test(s.text)) bad.push({ confirmed: s.prefetch && s.prefetch.confirmed, status: s.status, text: s.text.slice(0, 80) }); last = s; if (s.prefetch && s.prefetch.ready) break; await p.waitForTimeout(100); }
      await p.waitForTimeout(400); const after = await menuState(p);
      await toSpecies(p); await chooseSpecies(p, "organic_hybrid"); await surveyShown(p);
      const ad = await p.evaluate(() => { const s = MENU_DEV.entry.survey; return { adopted: !!(s.stats && s.stats.adopted), cells: s.cells.filter(Boolean).length }; });
      await p.click(".ds-exit"); await menuReady(p); await p.waitForTimeout(300); const back = await menuState(p);
      check(!bad.length && last && last.prefetch && last.prefetch.ready && last.prefetch.confirmed === 9 && (seen.size >= 2 || [...seen][0] === 9) && !after.status && !BAN.test(after.text) && ad.adopted && ad.cells >= 1 && !back.status && !BAN.test(back.text) && p.errs.length === 0,
        tag(`M2 · while the sector prefetch progressed (${polls} polls, confirmed seen ${J([...seen])}) the title never showed a status element or any of "Surveying sector" / "n of 9 worlds" / "Sector surveyed" / "worlds ready"; the prefetch still ran to 9 / 9 in the background; BEGIN EXPEDITION's survey ADOPTED the prefetched pool (${ad.cells} worlds already there); back on the title afterwards there is still no banner`), J({ bad: bad.slice(0, 2), seen: [...seen], ad, errs: p.errs.slice(0, 2) }));
      await shot(p, "01-title-1440x900"); await c.close();
      // M3 · the title at every viewport: the card and its entries sit where they did, nothing jumps when the prefetch completes, no gap, no overflow
      for (const [w, h] of VIEWPORTS) { const c = await context({ width: w, height: h }), p = await page(c); await p.goto(O + "/?bg=3"); await menuReady(p);
        await p.evaluate(() => Promise.all(document.getAnimations().map(a => a.finished.catch(() => {})))); await p.waitForTimeout(150);   // (the card's entrance rise has settled: what moves after this is a layout change)
        const geom = () => p.evaluate(() => { const R = s => { const e = document.querySelector(s); const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; };
          return { plaque: R(".mm-plaque"), nav: R(".mm-nav"), title: R("#mm-title"), ready: !!(MENU_DEV.entry.prefetch && MENU_DEV.entry.prefetch.progress.ready), ox: document.documentElement.scrollWidth > innerWidth || document.body.scrollWidth > innerWidth, oy: document.documentElement.scrollHeight > innerHeight + 1,
            inside: (() => { const r = document.querySelector(".mm-plaque").getBoundingClientRect(); return r.left >= 0 && r.top >= 0 && r.right <= innerWidth + 0.5 && r.bottom <= innerHeight + 0.5; })(), extra: [...document.querySelectorAll(".mm > *")].filter(e => !e.matches(".mm-bg, .mm-plaque, dialog")).map(e => e.className) }; });
        const g0 = await geom(); await p.waitForFunction(() => MENU_DEV.entry.prefetch && MENU_DEV.entry.prefetch.progress.ready, null, { timeout: 180000, polling: 100 }); await p.waitForTimeout(400); const g1 = await geom();
        check(J(g0.plaque) === J(g1.plaque) && J(g0.nav) === J(g1.nav) && J(g0.title) === J(g1.title) && g1.ready && !g0.ox && !g1.ox && !g1.oy && g1.inside && g1.extra.length === 0,
          tag(`M3 · ${w}×${h} title: the card ${J(g1.plaque)} and its entries are exactly where they were once the prefetch completed (no vertical jump), the card is inside the window, the title holds nothing but the painting, the card and its dialogs (no status slot, no gap), no overflow`), J({ before: g0.plaque, after: g1.plaque, extra: g1.extra, ready: [g0.ready, g1.ready] }));
        await shot(p, `01-title-${w}x${h}`); await c.close(); }
    }

    // ======================================================================================== S · Settings
    if (ONLY.includes("S")) {
      for (const prior of ["completed", "skipped"]) { const c = await context({ training: prior }), p = await page(c); await p.goto(O + "/?bg=5"); await menuReady(p);
        const before = await p.evaluate(() => ({ tag: MENU_DEV.entry.menu.trainingRecommended, rec: JSON.parse(localStorage.getItem("strange-bloom.training")).status }));
        await p.click('.mm-item[data-act="settings"]'); await p.waitForTimeout(200);
        // keyboard: Tab to the Training action, Enter
        let hops = 0; while (hops < 12 && !(await p.evaluate(() => document.activeElement.dataset.act === "training-again"))) { await p.keyboard.press("Tab"); hops++; }
        const focusIn = await p.evaluate(() => !!document.activeElement.closest('[data-dialog="settings"]')); await p.keyboard.press("Enter"); await p.waitForTimeout(150);
        const r = await p.evaluate(() => ({ rec: localStorage.getItem("strange-bloom.training"), tag: MENU_DEV.entry.menu.trainingRecommended, tagText: document.querySelector('.mm-item[data-act="training"]').innerText.replace(/\s+/g, " "), state: MENU_DEV.entry.state, session: !!(window.BLOOM_APP && BLOOM_APP.session),
          msg: document.querySelector(".mm-set-msg").textContent, open: document.querySelector('[data-dialog="settings"]').open, focusIn: !!document.activeElement.closest('[data-dialog="settings"]'), name: document.activeElement.textContent.trim(), desc: document.getElementById(document.activeElement.getAttribute("aria-describedby") || "") && document.getElementById(document.activeElement.getAttribute("aria-describedby")).textContent }));
        await p.keyboard.press("Escape"); await p.waitForTimeout(150); const esc = await p.evaluate(() => ({ open: document.querySelector('[data-dialog="settings"]').open, focus: document.activeElement.dataset.act }));
        await p.focus('.mm-item[data-act="begin"]'); await p.keyboard.press("Enter"); await p.waitForTimeout(300);
        const rec = await p.evaluate(() => ({ dlg: document.querySelector('[data-dialog="recommend"]').open, state: MENU_DEV.entry.state, btns: [...document.querySelectorAll('[data-dialog="recommend"] button')].map(b => b.textContent.trim()) }));
        await p.keyboard.press("Escape"); await p.waitForTimeout(150);
        check(!before.tag && before.rec === prior && focusIn && hops < 12 && r.rec === null && r.tag && /recommended/i.test(r.tagText) && r.state === "menu" && !r.session && r.msg && r.open && r.focusIn && r.name === "Show Training recommendation again" && /first-expedition Training suggestion/.test(r.desc || "")
          && !esc.open && esc.focus === "settings" && rec.dlg && rec.state === "menu" && J(rec.btns) === J(["Go to Expedition", "Start Training (~5 min)"]) && p.errs.length === 0,
          tag(`S1 · after a ${prior.toUpperCase()} Training: Settings → Tab to "Show Training recommendation again" (accessible name + helper) → Enter clears the record (first-run), TRAINING carries Recommended again, nothing launches (still the title, no session), focus stays in the dialog with a confirmation; Escape closes back to SETTINGS; Enter on EXPEDITION now opens the first-run recommendation (Go to Expedition · Start Training)`), J({ before, hops, r, esc, rec, errs: p.errs.slice(0, 3) }));
        await c.close(); }
      { const c = await context({ training: "skipped", extra: { "unrelated.key": "keep-me", "other.app": "1" } }), p = await page(c); await p.goto(O + "/?bg=6"); await menuReady(p);
        await p.click('.mm-item[data-act="settings"]'); await p.waitForTimeout(200); await p.click('[data-dialog="settings"] input[value="reduced"]'); await p.waitForTimeout(120);
        const pre = await p.evaluate(() => ({ store: Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)])), rm: MENU_DEV.entry.reducedMotion, cls: document.querySelector(".mm").classList.contains("rm") }));
        await p.click('[data-act="reset-prefs"]'); await p.waitForTimeout(150);
        const post = await p.evaluate(() => ({ store: Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)])), rm: MENU_DEV.entry.reducedMotion, cls: document.querySelector(".mm").classList.contains("rm"), checked: document.querySelector('input[name="mm-motion"]:checked').value, tag: MENU_DEV.entry.menu.trainingRecommended,
          msg: document.querySelector(".mm-set-msg").textContent, live: document.querySelector(".mm-set-msg").getAttribute("aria-live"), focusIn: !!document.activeElement.closest('[data-dialog="settings"]'), open: document.querySelector('[data-dialog="settings"]').open, name: document.querySelector('[data-act="reset-prefs"]').textContent.trim() }));
        const changed = [...new Set([...Object.keys(pre.store), ...Object.keys(post.store)])].filter(k => pre.store[k] !== post.store[k]);
        await p.click('[data-dialog="settings"] [data-act="close"]'); await p.waitForTimeout(150); const done = await p.evaluate(() => ({ open: document.querySelector('[data-dialog="settings"]').open, focus: document.activeElement.dataset.act }));
        let axe = null; if (AXE) { await p.click('.mm-item[data-act="settings"]'); await p.waitForTimeout(200); await p.addScriptTag({ content: AXE }); axe = await p.evaluate(async () => { const r = await axe.run(document.querySelector('[data-dialog="settings"]'), { runOnly: ["wcag2a", "wcag2aa"] }); return r.violations.map(v => `${v.id}×${v.nodes.length}`); }); await p.keyboard.press("Escape"); }
        check(pre.rm === true && pre.cls && JSON.parse(pre.store["strange-bloom.settings"]).motion === "reduced" && pre.store["strange-bloom.training"] && post.rm === null && !post.cls && post.checked === "system" && JSON.parse(post.store["strange-bloom.settings"]).motion === "system" && !("strange-bloom.training" in post.store) && post.tag
          && changed.every(k => k === "strange-bloom.settings" || k === "strange-bloom.training") && changed.length === 2 && post.store["unrelated.key"] === "keep-me" && post.store["other.app"] === "1" && post.msg && post.live === "polite" && post.focusIn && post.open && post.name === "Reset preferences" && !done.open && done.focus === "settings" && (!axe || axe.length === 0) && p.errs.length === 0,
          tag(`S2 · Reset preferences: with Motion = Reduced (applied: the title's rm class, reducedMotion true) and a skipped Training, one click puts Motion back to Follow system (radio, stored record, the class and reducedMotion null update in place — no reload), the training record to first-run (Recommended back), changes ONLY strange-bloom.settings + strange-bloom.training (unrelated keys survive, no storage-wide clear), announces it in the dialog's polite live line, keeps focus inside; Done closes back to SETTINGS${axe ? `; axe (WCAG 2 A/AA) on the open dialog: ${axe.length} violations` : ""}`),
          J({ changed, post: { rm: post.rm, checked: post.checked, tag: post.tag, msg: post.msg }, axe }));
        await p.click('.mm-item[data-act="settings"]'); await p.waitForTimeout(300); await shot(p, "02-settings-1440x900"); await c.close(); }
      // the dialog at every viewport: inside the window, actions reachable, no internal scrolling needed
      for (const [w, h] of VIEWPORTS) { const c = await context({ width: w, height: h }), p = await page(c); await p.goto(O + "/?bg=7"); await menuReady(p); await p.click('.mm-item[data-act="settings"]'); await p.waitForTimeout(250);
        const r = await p.evaluate(() => { const d = document.querySelector('[data-dialog="settings"]'), b = d.getBoundingClientRect(), go = [...d.querySelectorAll("button")].map(x => x.getBoundingClientRect());
          return { inside: b.top >= 0 && b.bottom <= innerHeight + 0.5 && b.left >= 0 && b.right <= innerWidth + 0.5, h: Math.round(b.height), scroll: d.scrollHeight > d.clientHeight + 1, btnsIn: go.every(g => g.top >= b.top && g.bottom <= b.bottom + 0.5), overflowX: document.documentElement.scrollWidth > innerWidth }; });
        check(r.inside && !r.scroll && r.btnsIn && !r.overflowX, tag(`S3 · ${w}×${h}: the Settings dialog (${r.h} px tall) sits inside the window, needs no internal scrolling, its three buttons are inside the card, no horizontal overflow`), J(r)); await c.close(); }
    }

    // ======================================================================================== P · planning panels
    if (ONLY.includes("P")) {
      const rect = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, h: r.height, w: r.width, sh: e.scrollHeight, ch: e.clientHeight }; }, sel);
      const overflowX = p => p.evaluate(() => document.documentElement.scrollWidth > innerWidth || document.body.scrollWidth > innerWidth);
      const visible = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(); const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return r.bottom <= innerHeight + 0.5 && r.top >= 0 && !!el && (el === e || e.contains(el)); }, sel);
      // P1 · Challenge hub
      { const c = await context(), p = await page(c); await p.goto(O + "/?bg=8"); await menuReady(p); await p.click('.mm-item[data-act="challenges"]'); await hubReady(p);
        for (const [w, h] of VIEWPORTS) { await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(250); const R = {};
          for (const id of ["dying_world", "thin_air"]) { await p.evaluate(([HUBX, id, phone]) => { const h = eval(HUBX); h.select(id); if (phone) h.open(id); }, [HUB, id, w <= 700]); await p.waitForTimeout(300);
            const d = await rect(p, ".ch-dossier"), card = await rect(p, ".ch-card"), list = await rect(p, ".ch-list"), main = await rect(p, ".ch-d-main"), rows = await rect(p, ".ch-rows"), act = await rect(p, ".ch-actions"), sheet = await p.evaluate(() => document.querySelector(".ch").dataset.sheet);
            R[id] = { top: Math.round(d.top), cardTop: Math.round(card.top), h: Math.round(d.h), listH: Math.round(list.h), contentBottom: Math.round(rows.bottom), actTop: Math.round(act.top), actBottom: Math.round(act.bottom), bottom: Math.round(d.bottom), mainScroll: main.sh > main.ch + 1, go: await visible(p, ".ch-btn.go"), sheet, ox: await overflowX(p) }; }
          const a = R.dying_world, b = R.thin_air;
          // (the list box is 14 px taller than its grid row: its scroll-box padding / negative margins; the dossier is capped at the ROW)
          const good = v => Math.abs(v.top - v.cardTop) <= 2 && v.h <= v.listH + 2 && v.go && !v.ox && (v.mainScroll ? v.h >= v.listH - 16 : (Math.abs(v.bottom - v.actBottom) <= 3 && v.actTop - v.contentBottom >= 8 && v.actTop - v.contentBottom <= 40));
          const short = w < 1400 || (!a.mainScroll && a.h < a.listH - 20);   // at 1440 / 2560 Dying World must visibly stop short of the row
          if (w > 700) check(good(a) && good(b) && short && (b.h >= a.h),
            tag(`P1 · ${w}×${h} Challenge hub: the dossier's top is the first card's top; Dying World's card is ${a.h} px ${a.mainScroll ? "(this short viewport caps it at the row; it scrolls inside)" : `= its content (BEGIN CHALLENGE ${a.actTop - a.contentBottom} px after the last section, no internal scrollbar), ${a.listH - 14 - a.h} px short of the row`}; Thin Air ${b.h} px ${b.mainScroll ? "(capped at the row, scrolls inside)" : "(fits)"}; BEGIN CHALLENGE reachable; no horizontal overflow`), J(R));
          else check(a.sheet === "true" && a.go && !a.ox && b.go && !b.ox && Math.abs(a.h - 0.86 * h) < 0.08 * h, tag(`P1 · ${w}×${h} phone: a card's own button opens the dossier as the 86 % bottom sheet with BEGIN CHALLENGE reachable (unchanged)`), J(R));
          if (w === 1440) { await p.evaluate(HUBX => eval(HUBX).select("dying_world"), HUB); await p.waitForTimeout(250); await shot(p, "03-challenge-hub-dying-world-1440x900"); } }
        await c.close(); }
      // P2 · species dossier (short · long)
      { const c = await context(), p = await page(c); await p.goto(O + "/?bg=9"); await menuReady(p); await toSpecies(p);
        for (const [w, h] of VIEWPORTS) { await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(250); const R = {};
          for (const sp of ["organic_hybrid", "woolly_candle"]) { await p.evaluate(([SSX, sp]) => eval(SSX).open(sp), [SS, sp]); await p.waitForTimeout(300);
            const d = await rect(p, ".ss-dossier"), inner = await rect(p, ".ss-dossier-in"), main = await rect(p, ".ss-d-main"), act = await rect(p, ".ss-actions");
            R[sp] = { top: Math.round(d.top), h: Math.round(d.h), bottom: Math.round(d.bottom), vh: h, innerScroll: inner.sh > inner.ch + 1, mainScroll: main.sh > main.ch + 1, actBottom: Math.round(act.bottom), go: await visible(p, ".ss-btn.go"), ox: await overflowX(p) };
            await p.keyboard.press("Escape"); await p.waitForTimeout(200); }
          const a = R.organic_hybrid, b = R.woolly_candle;
          if (w > 640) check(a.bottom <= h - 15 && b.bottom <= h - 15 && Math.abs(a.bottom - a.actBottom) <= 3 && Math.abs(b.bottom - b.actBottom) <= 3 && a.go && b.go && !a.ox && !b.ox && (a.h !== b.h || a.mainScroll || b.mainScroll) && (!a.mainScroll || a.bottom >= h - 20) && (!b.mainScroll || b.bottom >= h - 20),
            tag(`P2 · ${w}×${h} species dossier: each card ends at its own actions (${a.h} / ${b.h} px for Organic Hybrid / Woolly Candle), above the screen's foot, scrolling inside only when capped; Choose reachable; no horizontal overflow`), J(R));
          else check(a.go && b.go && !a.ox && !b.ox && Math.abs(a.h - 0.78 * h) < 0.06 * h, tag(`P2 · ${w}×${h} phone: the species sheet keeps its 78 % height with Choose pinned (unchanged)`), J(R));
          if (w === 1440) { await p.evaluate(SSX => eval(SSX).open("woolly_candle"), SS); await p.waitForTimeout(300); await shot(p, "04-species-dossier-woolly-candle-1440x900"); await p.keyboard.press("Escape"); } }
        await c.close(); }
      // P3 · Destination Survey focused-planet dossier (two worlds)
      { const c = await context(), p = await page(c); await p.goto(O + "/?bg=10"); await menuReady(p); await toSpecies(p); await chooseSpecies(p, "organic_hybrid"); await surveyShown(p); const first = await focusFirst(p); await p.waitForTimeout(700);
        const R = {};
        for (const [w, h] of VIEWPORTS) { await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(500);
          const d = await rect(p, ".ds-dossier"), slot = await rect(p, ".ds-focus-slot"), act = await rect(p, ".ds-actions"), ds = await rect(p, ".ds");
          let go = await visible(p, ".ds-btn.go"), scrolledTo = false; if (!go && w <= 820) { await p.evaluate(() => document.querySelector(".ds-btn.go").scrollIntoView({ block: "end" })); await p.waitForTimeout(200); go = await visible(p, ".ds-btn.go"); scrolledTo = true; }
          R[`${w}x${h}`] = { top: Math.round(d.top), slotTop: Math.round(slot.top), h: Math.round(d.h), bottom: Math.round(d.bottom), dsBottom: Math.round(ds.bottom), scroll: d.sh > d.ch + 1, actBottom: Math.round(act.bottom), go, scrolledTo, ox: await overflowX(p) }; }
        await p.setViewportSize({ width: 1440, height: 900 }); await p.waitForTimeout(300); await shot(p, "05-survey-focused-planet-a-1440x900");
        let second = null; await p.click('.ds-btn[data-act="return"]'); await p.waitForFunction(() => MENU_DEV.entry.survey.state === "survey", null, { timeout: 20000 }).catch(() => {}); await p.waitForTimeout(400);
        const st = await p.evaluate(() => MENU_DEV.entry.survey.state);
        if (st === "survey") { const j = await p.evaluate(f => { const cells = MENU_DEV.entry.survey.cells; let k = -1; for (let i = cells.length - 1; i >= 0; i--) if (cells[i] && i !== f) { k = i; break; } return k; }, first);
          if (j >= 0) { await p.evaluate(j => MENU_DEV.entry.survey.select(j), j); await p.waitForFunction(() => MENU_DEV.entry.survey.state === "focus", null, { timeout: 20000 }); await p.waitForTimeout(700); const d = await rect(p, ".ds-dossier"), slot = await rect(p, ".ds-focus-slot"); second = { cell: j, top: Math.round(d.top), slotTop: Math.round(slot.top), h: Math.round(d.h), scroll: d.sh > d.ch + 1 }; await shot(p, "06-survey-focused-planet-b-1440x900"); } }
        const desk = Object.entries(R).filter(([k]) => +k.split("x")[0] > 820).map(([, v]) => v), phone = Object.entries(R).filter(([k]) => +k.split("x")[0] <= 820).map(([, v]) => v);
        check(desk.every(v => Math.abs(v.top - v.slotTop) <= 3 && v.bottom <= v.dsBottom - 10 && v.go && !v.ox && (!v.scroll || v.bottom >= v.dsBottom - 30)) && phone.every(v => v.go && !v.ox) && (!second || (Math.abs(second.top - second.slotTop) <= 3)),
          tag(`P3 · Destination Survey focused dossier: at 1024 / 1440 / 2560 its top is level with the focused globe's top, it ends at its own actions above the screen's foot (${desk.map(v => v.h + " px").join(" / ")}), scrolls inside only when capped; 390×844 stacks (Begin reachable${R["390x844"].scrolledTo ? " by scrolling the stack, as before" : ""})${second ? `; a second world (cell ${second.cell}, ${second.h} px) lays out the same way` : " (second world: Return to survey did not reach the grid — skipped)"}`), J({ R, second }));
        await c.close(); }
      // P4 · Challenge Planet Dossier (ordinary · authored)
      { const c = await context(), p = await page(c); await p.goto(O + "/?bg=11"); await menuReady(p); const R = {};
        for (const id of ["dying_world", "low_tide"]) { await challenge(p, id); await p.waitForTimeout(500); R[id] = {};
          for (const [w, h] of VIEWPORTS) { await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(400);
            const d = await rect(p, ".cw-dossier"), col = await rect(p, ".cw-globe-col"), body = await rect(p, ".cw-body"), main = await rect(p, ".cw-d-main"), act = await rect(p, ".cw-actions");
            const row = await p.evaluate(() => { const b = document.querySelector(".cw-body"), s = getComputedStyle(b); return b.getBoundingClientRect().height - parseFloat(s.paddingTop) - parseFloat(s.paddingBottom); });
            R[id][`${w}x${h}`] = { top: Math.round(d.top), colTop: Math.round(col.top), h: Math.round(d.h), row: Math.round(row), bodyH: Math.round(body.h), bottom: Math.round(d.bottom), actBottom: Math.round(act.bottom), mainScroll: main.sh > main.ch + 1, go: await visible(p, ".cw-btn.go"), ox: await overflowX(p) }; }
          await p.setViewportSize({ width: 1440, height: 900 }); await p.waitForTimeout(300); await shot(p, `07-challenge-planet-dossier-${id.replace("_", "-")}-1440x900`);
          await p.reload(); await menuReady(p); }
        const ok = Object.values(R).every(S => Object.entries(S).every(([k, v]) => { const w = +k.split("x")[0]; return w <= 700 ? v.go && !v.ox : Math.abs(v.top - v.colTop) <= 2 && v.h <= v.row + 2 && Math.abs(v.bottom - v.actBottom) <= 3 && v.go && !v.ox && (!v.mainScroll || v.h >= v.row - 6); }));
        const tall = ["dying_world", "low_tide"].map(id => R[id]["2560x1440"]), fits = tall.filter(v => !v.mainScroll && v.h < v.row - 20).length;
        check(ok && fits >= 1, tag(`P4 · Challenge Planet Dossier (Dying World · Low Tide): at desktop widths the card is top-aligned with the globe column, never taller than the body's row, ends at BEGIN CHALLENGE and scrolls inside only when the content overflows the row (${["1024x768", "1440x900", "2560x1440"].map(k => k + ": " + ["dying_world", "low_tide"].map(id => R[id][k].h + (R[id][k].mainScroll ? "↕" : "")).join(" / ") + " of " + R.dying_world[k].row).join("; ")} px); at 2560×1440 ${fits} of 2 stop short of the row at their content's height; 390×844 stacks with BEGIN reachable`), J(R));
        await c.close(); }
    }

    // ======================================================================================== W · one flat world (the developer harness: the same Planet View + renderer)
    if (ONLY.includes("W")) {
      const RUN = O + "/demos/demo-run.html"; const runUp = p => p.waitForFunction(() => window.BLOOM && BLOOM.planetView && BLOOM.planetView.instance && window.BLOOM_RUN_UI && BLOOM_RUN_UI.adapter && window.BLOOM_API && BLOOM_API.sim, null, { timeout: 60000, polling: 50 });
      const geo = p => p.evaluate(() => { const PV = BLOOM.planetView.instance, R = PV.renderer, I = R.info(), cv = document.getElementById("pvMap"), r = cv.getBoundingClientRect(), A = BLOOM_RUN_UI.adapter, SF = BLOOM.surface;
        const hit = (x, y) => R.hitTest(x, y), yMid = r.top + r.height / 2, gL = hit(r.left + 2, yMid), gR = hit(r.right - 2, yMid), eL = hit(r.left + I.offsetX + 1, yMid), eR = hit(r.left + I.offsetX + I.worldWidth - 1, yMid);
        const ctx = cv.getContext("2d"), px = (x, y) => Array.from(ctx.getImageData(Math.round(x * I.dpr), Math.round(y * I.dpr), 1, 1).data).slice(0, 3), frame = px(1, r.height / 2), frameR = px(r.width - 2, r.height / 2);
        // a second visual copy would repeat the world's left-edge column just right of the world: compare the column of pixels there with the frame
        const W = I.gridWidth, H = I.gridHeight, tm = R.planet.tilemap; let landLeft = -1; for (let y = 0; y < H; y++) if (tm[y * W] >= 0) { landLeft = y; break; }
        const beyond = landLeft >= 0 && I.offsetX + I.worldWidth + I.tilePx / 2 < r.width ? px(I.offsetX + I.worldWidth + I.tilePx / 2, I.offsetY + (landLeft + 0.5) * I.tilePx) : null;
        return { copies: I.copies, wrap: I.wrapX, topo: R.planet.topology, tile: I.tilePx, cssW: Math.round(r.width), worldW: Math.round(I.worldWidth), offX: Math.round(I.offsetX), centred: Math.abs(I.offsetX - (r.width - I.worldWidth - I.offsetX)) <= I.tilePx, gL: gL.region, gR: gR.region, eL: [eL.x, eL.region], eR: [eR.x, eR.region], frame, frameR, beyond,
          labels: I.lastFrame.labels, regions: A.regions().length, sel: A.selection().index, W }; });
      for (const [w, h] of [[1024, 768], [1440, 900], [2560, 1440]]) { const c = await context({ width: w, height: h }), p = await page(c); await p.goto(RUN + "?archetype=frozen_world&seed=7&ui=18"); await runUp(p); await p.waitForTimeout(900);
        const g0 = await geo(p); const sel0 = g0.sel;
        const cv = await p.locator("#pvMap").boundingBox(); await p.mouse.click(cv.x + 3, cv.y + cv.height / 2); await p.waitForTimeout(200); // the left gutter
        const g1 = await geo(p);
        const frameOk = g => g.frame.join() === "36,44,34" && g.frameR.join() === "36,44,34" && (!g.beyond || g.beyond.join() === "36,44,34");
        check(g0.copies.count === 1 && g0.wrap && g0.topo && g0.topo.wrapX === true && g0.centred && g0.offX >= 0 && g0.worldW + 2 * g0.offX >= g0.cssW - 2 * g0.tile && g0.gL === -2 && g0.gR === -2 && g0.eL[0] === 0 && g0.eR[0] === g0.W - 1 && (g0.offX === 0 || frameOk(g0)) && g0.labels >= 1 && g0.labels <= g0.regions && sel0 >= 0 && g1.sel === -1,
          tag(`W1 · ${w}×${h} Frozen World 7 (a cylinder, topology.wrapX true): exactly ONE visual copy, ${g0.worldW} px wide at ${g0.tile} px tiles, centred with ${g0.offX} px of frame either side (the frame pixels are the stage colour, nothing drawn beyond the world's right edge); the gutters are outside the map (region −2) while the world's first / last columns are x = 0 / x = ${g0.W - 1}; ${g0.labels} labels for ${g0.regions} regions (drawn once); a click on the left gutter DESELECTS (origin was selected) instead of selecting x mod W`), J({ g0: { ...g0, frame: g0.frame.join(), frameR: g0.frameR.join() }, afterGutter: g1.sel }));
        if (w === 1440) { await p.evaluate(() => { const A = BLOOM_RUN_UI.adapter, rs = A.regions(); const i = rs.findIndex(r => /frost|ice|glacier|rime|snow|polar|tundra|hoar|permafrost|sleet/i.test(r.name)); A.actions.selectRegion(i >= 0 ? i : 0); }); await p.waitForTimeout(300); await shot(p, `08-frozen-world-7-selected-region-${w}x${h}`); }
        else await shot(p, `09-frozen-world-7-one-copy-${w}x${h}`); await c.close(); }
      { const c = await context({ width: 1440, height: 900 }), p = await page(c); await p.goto(RUN + "?ui=18"); await runUp(p); await p.waitForTimeout(600);
        const g = await geo(p); const cold = await p.evaluate(() => { const R = BLOOM.planetView.instance.renderer; return BLOOM.surface.surfaceTiles(R.planet, { render: R.render }).some(t => t.cold); });
        check(g.copies.count === 1 && !g.wrap && g.centred && !cold, tag(`W2 · the authored rectangle (First Bloom, the harness default) is unchanged: one copy, no wrap, centred, its water is not icy (6 °C sky)`), J({ copies: g.copies, wrap: g.wrap, topo: g.topo, offX: g.offX, cold })); await c.close(); }
    }

    // ======================================================================================== C · icy water vs frozen land (the canonical surface; globe = map)
    if (ONLY.includes("C")) {
      const c = await context({ width: 1280, height: 800 }), p = await page(c); await p.goto(O + "/demos/demo-run.html?archetype=frozen_world&seed=7&ui=18"); await p.waitForFunction(() => window.BLOOM && BLOOM.surface && window.BLOOM_DATA && BLOOM.generateFromArchetype, null, { timeout: 60000 }); await p.waitForTimeout(500);
      const r = await p.evaluate(() => { const SF = BLOOM.surface, out = {}; const cv = document.createElement("canvas"), ctx = cv.getContext("2d");
        for (const [a, seed] of [["frozen_world", 7], ["frozen_world", 25], ["ocean_archipelago", 28], ["desert_world", 17]]) { const A = BLOOM_DATA.archetypes.find(x => x.id === a), P = BLOOM.generateFromArchetype(A, seed, { config: BLOOM_DATA.config, traits: BLOOM_DATA.traits });
          const tiles = SF.surfaceTiles(P, { render: A.render }), W = P.gridWidth, td = 12; cv.width = W * td; cv.height = P.gridHeight * td; SF.paintSurface(ctx, P, { render: A.render, tileW: td, tileH: td });
          const px = (i, fx = 0.1, fy = 0.1) => Array.from(ctx.getImageData((i % W) * td + Math.round(td * fx), Math.floor(i / W) * td + Math.round(td * fy), 1, 1).data).slice(0, 3);
          const water = tiles.map((t, i) => [t, i]).filter(([t]) => t.water), open = water.find(([t]) => !t.shallow && !t.wave), wave = water.find(([t]) => !t.shallow && t.wave), plain = SF.lightWater(A.render && A.render.water), lum = c => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
          const base = px(open[1]), mark = px(wave[1], 0.25, 0.52), markBase = px(wave[1], 0.1, 0.1);
          out[`${a}:${seed}`] = { sky: P.globalClimate.temperature, water: water.length, cold: water.filter(([t]) => t.cold).length, frostOnWater: water.filter(([t]) => t.frost).length, frostOnLand: tiles.filter(t => !t.water && t.frost).length, base, plain, baseIsPlain: base.join() === plain.join(), baseLum: Math.round(lum(base)), plainLum: Math.round(lum(plain)), mark, markDarker: lum(mark) < lum(markBase) - 20, markLighter: lum(mark) > lum(markBase) + 20, sig: SF.surfaceSignature(P, { render: A.render }) }; }
        return out; });
      const f7 = r["frozen_world:7"], f25 = r["frozen_world:25"], oc = r["ocean_archipelago:28"], de = r["desert_world:17"];
      check([f7, f25].every(f => f.sky < -8 && f.cold === f.water && f.frostOnWater === 0 && f.frostOnLand > 0 && !f.baseIsPlain && f.baseLum < f.plainLum - 25 && f.markDarker) && [oc, de].every(o => o.cold === 0 && o.baseIsPlain && o.markLighter && o.frostOnWater === 0),
        tag("C1 · Frozen World (7 · 25, −18 °C sky): every water tile is cold — its base is a deeper, cooler blue than the plain palette (luminance well below), its ripple marks are DARKER than the water (never the land's white), frost glints appear on land only; Ocean Archipelago 28 and Desert World 17 (warm skies): no cold water, the base is exactly the plain palette colour and the wave marks stay lighter — unchanged"), J(r));
      // globe = map: the sphere texture is painted by the same function (sphere-texture-check D2 pins it pixel for pixel); here the signature is the same object either way
      info("C2 · one surface for globe and map", `surfaceSignature frozen 7 = ${f7.sig} (planet-texture.js imports and paints BLOOM.surface; see sphere-texture-check D2 / D3)`);
      await c.close();
    }

    // ======================================================================================== O · origins (http / · Pages /bloom/ · file://)
    if (ONLY.includes("O")) {
      for (const [label, url] of [["http /", `${O}/?bg=1`], ["Pages /bloom/", `${O}/bloom/?bg=1`], ["file://", `${FILE_INDEX}?bg=1`]]) {
        const offline = url.startsWith("file:") && bn === "chromium"; const c = await context({ offline }), p = await page(c); let m = null, s = null, err = null;
        try { await p.goto(url); await menuReady(p); m = await menuState(p); await p.click('.mm-item[data-act="settings"]'); await p.waitForTimeout(200);
          s = await p.evaluate(() => ({ open: document.querySelector('[data-dialog="settings"]').open, acts: [...document.querySelectorAll('[data-dialog="settings"] [data-act]')].map(b => b.dataset.act), portable: !!window.BLOOM_PORTABLE })); await p.keyboard.press("Escape"); }
        catch (e) { err = String(e.message || e).slice(0, 200); }
        check(!err && m && J(m.items) === J(["begin", "challenges", "training", "settings"]) && !m.status && !BAN.test(m.text) && !m.credits && m.root === "none" && s && s.open && J(s.acts) === J(["training-again", "reset-prefs", "close"]) && s.portable === url.startsWith("file:") && p.errs.length === 0,
          tag(`O1 · ${label}${offline ? " (offline)" : ""}: the title has four entries, no survey status, no Credits, user-select:none on the root; Settings opens with "Show Training recommendation again" · "Reset preferences" · Done${url.startsWith("file:") ? "; the portable runtime served it" : ""}`), J({ err, m: m && { items: m.items, status: m.status, root: m.root }, s, errs: p.errs.slice(0, 2) }));
        await c.close(); }
    }
    await browser.close();
  }
  srv.close(); fs.rmSync(SITE, { recursive: true, force: true });
  console.log(fails ? `\n${fails} check(s) FAILED, ${passes} passed (${Math.round((Date.now() - t0) / 1000)} s)` : `\nALL CHECKS PASS (${passes}; ${Math.round((Date.now() - t0) / 1000)} s)`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
