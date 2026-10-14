// BLOOM-038 design audit — 1024×768 FULL RUNS, played like a player through the released index.html (READ-ONLY research).
//
//   NODE_PATH="$(npm root -g)" node tools/research/design-audit/atlas-run1024.js [--only expedition,challenge]
//
// Expedition: title → EXPEDITION → click a species card → Choose → the Destination Survey (?sector=7) → click a planet → Begin Expedition →
// the run at 4× (real clicks on the speed button) until the Bloom report. Then one Challenge (Native Competition, launch seed 2, Organic
// Hybrid) the same way until the Bloom (or a tick cap). Every purchase goes through the UI: select the region the purchase is for on the
// map (a real canvas click) → the banner's "Would help" button (or the room's tool button) → hover the node (the preview) → click it (the
// buy) → Resume. The player's DECISION (which upgrade) is read from the adapter's previews (what a player reads in the rooms). The sim
// runs in real time at 4×; when nothing is affordable for a while, BLOOM_API.advance skips the wait (each skip is logged in the timeline).
// At every action the timeline records clicks, reachability (target inside the viewport and not covered; room/panel scroll), the visible
// world share, the banner / room size vs the map, the message line and toasts. Output: docs/evidence/bloom-038/visual-atlas/run1024/ +
// docs/evidence/bloom-038/run1024.json.
"use strict";
const path = require("path"), fs = require("fs");
const L = require("./atlas-lib.js");
const EVD = path.join(L.ROOT, "docs/evidence/bloom-038"), OUTD = path.join(EVD, "visual-atlas/run1024"), OUT = path.join(EVD, "run1024.json");
const argv = process.argv, argOf = k => { const i = argv.indexOf(k); return i > 0 ? argv[i + 1] : null; };
const ONLY = (argOf("--only") || "expedition,challenge").split(",");
const t0 = Date.now(), sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const pw = require("playwright"); const srv = await L.serve(), O = srv.O; const browser = await pw.chromium.launch();
  const result = { format: "bloom-038-run1024@1", tool: "tools/research/design-audit/atlas-run1024.js", generatedAt: new Date().toISOString(), viewport: "1024x768", runs: [] };
  if (fs.existsSync(OUT)) { try { const old = JSON.parse(fs.readFileSync(OUT, "utf8")); result.runs = (old.runs || []).filter(r => !ONLY.includes(r.kind)); } catch (e) { /* fresh */ } }

  for (const kind of ONLY) {
    const c = await L.newContext(browser, 1024, 768), p = await L.newPage(c); const shots = [], timeline = []; let clicksTotal = 0, nShot = 0;
    const shoot0 = L.makeShooter(OUTD, shots, { relTo: EVD });
    const run = { kind, timeline, shots, purchases: [], skips: [], clicksTotal: 0 };
    const T = () => Math.round((Date.now() - t0) / 100) / 10;
    const shoot = async (label, gameplay = true) => { nShot++; const id = `${kind}-${String(nShot).padStart(2, "0")}-${label}`; const e = await shoot0(p, id, { runId: "run1024-" + kind, scene: "run1024-" + kind, route: "app", phase: label, uiState: label, gameplay, purchases: [] }); console.log(`  [${T()}s] shot ${id}`); return e.id; };
    const click = async (sel, why) => { const r = await reach(sel); await p.click(sel, { timeout: 10000 }); clicksTotal++; return r; };
    // reachability of a control: inside the viewport, not covered (elementFromPoint), and its scroll container state
    const reach = sel => p.evaluate(sel => { const e = document.querySelector(sel); if (!e) return { sel, missing: true }; const r = e.getBoundingClientRect(), vw = innerWidth, vh = innerHeight;
      const inView = r.top >= 0 && r.left >= 0 && r.bottom <= vh && r.right <= vw; const hit = inView ? document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) : null;
      let sc = e.parentElement; while (sc && !(/(auto|scroll)/.test(getComputedStyle(sc).overflowY) && sc.scrollHeight > sc.clientHeight + 2)) sc = sc.parentElement;
      return { sel, rect: [r.left, r.top, r.width, r.height].map(Math.round), inViewport: inView, uncovered: !!hit && (hit === e || e.contains(hit)), inScroller: sc ? { cls: String(sc.className).slice(0, 30), scrollH: sc.scrollHeight, clientH: sc.clientHeight, scrollTop: sc.scrollTop } : null }; }, sel);
    const snap = async (action, extra = {}) => { const m = await p.evaluate(() => { const A = window.BLOOM_RUN_UI && BLOOM_RUN_UI.adapter; const vw = innerWidth, vh = innerHeight; const cv = document.getElementById("pvMap");
        const rect = s => { const e = document.querySelector(s); if (!e || e.hidden || e.closest("[hidden]")) return null; const r = e.getBoundingClientRect(); return r.width ? [r.left, r.top, r.width, r.height].map(Math.round) : null; };
        let wv = null, vis = null; if (cv && window.BLOOM && BLOOM.planetView && BLOOM.planetView.instance) { const I = BLOOM.planetView.instance.renderer.info(), r = cv.getBoundingClientRect(); wv = [r.left + I.offsetX, r.top + I.offsetY, I.worldWidth, I.worldHeight].map(Math.round);
          let n = 0, k = 0; for (let y = wv[1] + 8; y < Math.min(vh, wv[1] + wv[3]); y += 16) for (let x = wv[0] + 8; x < Math.min(vw, wv[0] + wv[2]); x += 16) { n++; if (document.elementFromPoint(x, y) === cv) k++; } vis = n ? +(k / n).toFixed(3) : 0; }
        const room = document.querySelector(".dr .dr-room:not([hidden])"); const scrollers = room ? [...room.querySelectorAll("*")].filter(e => /(auto|scroll)/.test(getComputedStyle(e).overflowY) && e.scrollHeight > e.clientHeight + 2).map(e => ({ cls: String(e.className).slice(0, 30), hiddenPx: e.scrollHeight - e.clientHeight })) : [];
        const btnsOut = room ? [...room.querySelectorAll("button")].filter(b => { const r = b.getBoundingClientRect(); return r.width && (r.bottom > vh || r.right > vw); }).length : 0;
        return { ticks: A ? A.run().ticks : null, coverage: A ? +A.hud().coverage.toFixed(3) : null, biomass: A ? Math.floor(A.hud().biomass) : null, running: A ? A.run().running : null, speed: A ? A.run().speed : null,
          worldRect: wv, worldVisibleShare: vis, banner: rect("#pvBanner"), bannerShareOfWorld: (() => { const b = rect("#pvBanner"); return b && wv ? +((b[2] * b[3]) / (wv[2] * wv[3])).toFixed(3) : null; })(), scenario: rect("#pvScn"),
          room: room ? room.dataset.room : null, roomRect: room ? [room.getBoundingClientRect()].map(r => [r.left, r.top, r.width, r.height].map(Math.round))[0] : null, roomScrollers: scrollers, roomButtonsOutsideViewport: btnsOut,
          message: (document.getElementById("pvLog") || {}).textContent || null, toast: (() => { const t = document.getElementById("pvToast"); return t && !t.hidden ? t.textContent : null; })(),
          scenarioText: (() => { const s = document.getElementById("pvScn"); return s && !s.hidden ? s.innerText.replace(/\s+/g, " ").slice(0, 160) : null; })(), selected: A ? A.selection().name : null }; });
      const e = { t: T(), action, ...extra, ...m }; timeline.push(e); return e; };

    try {
      console.log(`# ${kind}`);
      // ------------------------------------------------ planning: real clicks
      if (kind === "expedition") {
        await p.goto(`${O}/?bg=3&sector=7`); await L.W.menu(p); await L.settle(p, 500); await shoot("title", false);
        let r = await click('.mm-item[data-act="begin"]'); await L.W.species(p); await L.settle(p, 500); await snap("open Expedition (title → EXPEDITION)", { clicks: 1, reach: r }); await shoot("species", false);
        const cardSel = await p.evaluate(() => { const cs = [...document.querySelectorAll(".ss-card")]; const i = cs.findIndex(c => /organic/i.test(c.textContent)); cs.forEach((c, k) => c.dataset.atlasK = k); return `.ss-card[data-atlas-k="${Math.max(0, i)}"]`; });
        r = await click(cardSel); await L.settle(p, 500); await shoot("species-dossier", false);
        const r2 = await click(".ss-btn.go"); await L.W.survey(p); await snap("choose species (card → Choose)", { clicks: 2, reach: [r, r2] });
        await L.W.cells(p, 9).catch(() => {}); await L.settle(p, 1000); await shoot("survey", false);
        const cellSel = await p.evaluate(() => `.ds-cand[data-index="${MENU_DEV.entry.survey.cells.findIndex(Boolean)}"]`); await p.waitForSelector(cellSel + ":not([disabled])", { timeout: 60000 });
        r = await click(cellSel); await p.waitForFunction(() => MENU_DEV.entry.survey.state === "focus", null, { timeout: 30000 }); await L.settle(p, 900); await shoot("survey-focus", false);
        const rb = await click(".ds-btn.go"); await snap("focus a planet → Begin Expedition", { clicks: 2, reach: [r, rb] }); await L.W.run(p, 1);
      } else {
        await p.goto(`${O}/?bg=3`); await L.W.menu(p); let r = await click('.mm-item[data-act="challenges"]'); await L.W.hub(p); await L.settle(p, 400);
        const cardSel = await p.evaluate(() => { const cs = [...document.querySelectorAll(".ch-card")]; cs.forEach((c, k) => c.dataset.atlasK = k); const i = cs.findIndex(c => /native competition/i.test(c.textContent)); return `.ch-card[data-atlas-k="${i}"]`; });
        const r1 = await click(cardSel); await L.settle(p, 400); await p.evaluate(() => { MENU_DEV.entry.nextLaunchSeed = 2; }); await shoot("challenge-hub", false);
        const r2 = await click(".ch-btn.go"); await L.W.species(p); await L.settle(p, 400);
        const sp = await p.evaluate(() => { const cs = [...document.querySelectorAll(".ss-card")]; cs.forEach((c, k) => c.dataset.atlasK = k); return `.ss-card[data-atlas-k="${Math.max(0, cs.findIndex(c => /organic/i.test(c.textContent)))}"]`; });
        const r3 = await click(sp); await L.settle(p, 300); const r4 = await click(".ss-btn.go"); await L.W.world(p); await L.settle(p, 800); await shoot("challenge-dossier", false);
        const r5 = await click(".cw-btn.go"); await snap("Challenges → Native Competition → BEGIN → species → BEGIN CHALLENGE", { clicks: 6, reach: [r, r1, r2, r3, r4, r5] }); await L.W.run(p, 1);
      }
      await L.settle(p, 900);
      const world = await L.runState(p); run.world = world; console.log(`  world ${world.planet} ${world.archetype} seed ${world.seed} ${world.species} ${world.scenario}`);
      await snap("run ready (landing)"); await shoot("landing");
      // ------------------------------------------------ first look: select the origin and a blocked region on the map
      const pick = kind => p.evaluate(kind => { const R = BLOOM_RUN_UI.adapter.regions(); const r = kind === "origin" ? R.find(r => r.isOrigin) : R.filter(r => r.blocked && !r.isOrigin).sort((a, b) => b.area - a.area)[0]; return r ? r.index : -1; }, kind);
      let how = await L.clickRegion(p, await pick("blocked")); clicksTotal++; await snap("select a blocked region on the map", { clicks: 1, how, reach: await reach("#pvBanner .hb[data-item], #pvBanner .pv-btn") }); await shoot("selected-blocked");
      // ------------------------------------------------ speed 4× (real clicks), play
      let sc = 0; while ((await p.evaluate(() => BLOOM_RUN_UI.adapter.run().speed)) !== 4 && sc < 4) { await click("#pvSpeed"); sc++; }
      await L.deselect(p); if (!(await p.evaluate(() => BLOOM_RUN_UI.adapter.run().running))) { await click("#pvPause"); sc++; }
      await snap("speed 4× and play", { clicks: sc });
      // ------------------------------------------------ the loop
      const did = { regionsRoom: false, mapView: false, terraformLook: false, spreadLook: false }, milestones = [0.1, 0.25, 0.45, 0.6, 0.66]; let mi = 0, idleSince = Date.now(), lastCov = 0;
      const CAP_TICKS = kind === "expedition" ? 12000 : 9000;
      const choose = () => p.evaluate(() => { const A = BLOOM_RUN_UI.adapter; const its = A.upgrades().flatMap(b => b.items).filter(u => u.rules !== false && u.tier < u.maxTier), IX = {}; A.regions().forEach(r => { IX[r.id] = r.index; });
        const sc = its.map(u => { const pv = A.previewOf(u.id) || {}; return { id: u.id, board: u.board, name: u.name, price: u.price, canBuy: u.canBuy, gain: (pv.gain || []).map(g => IX[g]).filter(i => i >= 0), lose: (pv.lose || []).length, better: (pv.better || []).length, worse: (pv.worse || []).length }; }).filter(x => x.price != null);
        sc.sort((a, b) => (b.gain.length - 0.6 * b.lose) - (a.gain.length - 0.6 * a.lose) || a.price - b.price);
        const best = sc.find(x => x.gain.length > 0 && x.gain.length - 0.6 * x.lose > 0) || null; const spread = sc.filter(x => x.canBuy && x.better - x.worse > 0 && x.lose === 0).sort((a, b) => (b.better - b.worse) - (a.better - a.worse) || a.price - b.price)[0] || sc.filter(x => x.board === "Spread" && x.canBuy).sort((a, b) => a.price - b.price)[0] || null; return { best, spread, bio: Math.floor(A.hud().biomass) }; });
      while (true) {
        const st = await p.evaluate(() => { const A = BLOOM_RUN_UI.adapter, r = A.run(); return { won: r.won, lost: r.lost, ticks: r.ticks, cov: A.hud().coverage, running: r.running, report: !!(BLOOM.runReport.instance && BLOOM.runReport.instance.state().open) }; });
        if (st.won || st.lost || st.report || st.ticks > CAP_TICKS) break;
        if (mi < milestones.length && st.cov >= milestones[mi]) { await p.evaluate(() => BLOOM_RUN_UI.adapter.actions.pause()); await L.settle(p, 300); await snap(`milestone coverage ≥ ${milestones[mi]}`); await shoot(`cov${Math.round(milestones[mi] * 100)}`); await p.evaluate(() => BLOOM_RUN_UI.adapter.actions.play()); mi++; }
        const ch = await choose(); let target = ch.best && ch.best.canBuy ? ch.best : null;
        if (!target && ch.spread && ch.spread.canBuy && Date.now() - idleSince > 8000) target = ch.spread; // nothing opens ground: strengthen what helps (previews: better), else Spread
        if (target) {
          // the purchase, through the UI
          let clicks = 0, path = [], reachLog = [];
          if (target.gain.length) { const gi = target.gain[0]; const h = await L.clickRegion(p, gi); clicks++; path.push(`map click → ${h}`); await L.settle(p, 250);
            const hbSel = `#pvBanner .hb[data-item="${target.id}"]`; const hasHb = await p.$(hbSel);
            if (hasHb) { await p.hover(hbSel); await L.settle(p, 300); reachLog.push(await click(hbSel)); clicks++; path.push("banner Would help"); }
            else { reachLog.push(await click(`.pv-tool[data-tool="${target.board.toLowerCase()}"]`)); clicks++; path.push("tool button"); } }
          else { reachLog.push(await click(`.pv-tool[data-tool="${target.board.toLowerCase()}"]`)); clicks++; path.push("tool button"); }
          await L.W.room(p, target.board.toLowerCase()).catch(() => {}); await L.settle(p, 500);
          const nodeSel = `.dr .dr-room:not([hidden]) .node[data-node="${target.id}"]`;
          const nr = await reach(nodeSel); await p.hover(nodeSel).catch(() => {}); await L.settle(p, 300);
          const pre = await snap(`room open for ${target.name}`, { reachNode: nr });
          if (run.purchases.length < 3 || run.purchases.length % 3 === 0) await shoot(`room-${target.board.toLowerCase()}-${target.id}`);
          await p.click(nodeSel).catch(() => {}); clicks++; await L.settle(p, 300);
          const ok = await p.evaluate(id => BLOOM_RUN_UI.adapter.upgrades().flatMap(b => b.items).find(u => u.id === id).tier, target.id);
          reachLog.push(await click(".dr .dr-room:not([hidden]) .rb.resume")); clicks++; await L.W.noRoom(p).catch(() => {}); await L.settle(p, 300);
          run.purchases.push({ id: target.id, name: target.name, board: target.board, price: target.price, tierAfter: ok, clicks, path, opens: target.gain.length, atTick: pre.ticks, atCoverage: pre.coverage });
          await snap(`bought ${target.name}`, { clicks, path, reach: reachLog, reachNode: nr }); idleSince = Date.now(); lastCov = st.cov;
          continue;
        }
        // one-time looks a player takes
        if (!did.mapView && st.cov > 0.05) { did.mapView = true; let k = 0; const r = await click('.pv-tool[data-tool="mapview"]'); k++; await L.settle(p, 300); await click('#pvLens .pv-lb[data-lens="Water"]'); k++; await L.settle(p, 300); await snap("Map View → Water", { clicks: k, reach: r }); await shoot("mapview-water");
          await p.keyboard.press("Escape").catch(() => {}); await p.evaluate(() => BLOOM.planetView.instance.setLens(null)); await L.settle(p, 200); continue; }
        if (!did.regionsRoom && st.cov > 0.25) { did.regionsRoom = true; const liv = await p.evaluate(() => BLOOM_RUN_UI.adapter.regions().filter(r => r.living > 0).sort((a, b) => b.living - a.living)[0].index);
          let k = 0; await L.clickRegion(p, liv); k++; const r = await click("#pvBanner .pv-btn:not(.hb)"); k++; await L.W.room(p, "region"); await L.settle(p, 500); await click(".dr .dr-room:not([hidden]) #drtab-colony").catch(() => {}); k++; await L.settle(p, 300);
          await shoot("regions-colony"); const fr = await reach('.dr .dr-room:not([hidden]) [data-focus="seeds"]'); await p.click('.dr .dr-room:not([hidden]) [data-focus="seeds"]').catch(() => {}); k++;
          await snap("Inspect region → Colony → Seeds focus", { clicks: k, reach: [r, fr] }); await click(".dr .dr-room:not([hidden]) .rb.resume"); await L.W.noRoom(p).catch(() => {}); continue; }
        if (!did.terraformLook && st.cov > 0.15) { did.terraformLook = true; const r = await click('.pv-tool[data-tool="terraform"]'); await L.W.room(p, "terraform"); await L.settle(p, 700); await snap("look at Terraform", { clicks: 1, reach: r }); await shoot("terraform");
          await click(".dr .dr-room:not([hidden]) .rb.resume"); await L.W.noRoom(p).catch(() => {}); continue; }
        // wait in real time (4×); skip long waits with advance (logged)
        await sleep(1500);
        if (Date.now() - idleSince > 20000) { const n = 150; await p.evaluate(n => { BLOOM_API.advance(n); }, n); run.skips.push({ atTick: st.ticks, ticks: n, why: "nothing worth buying for 20 s real time at 4×" }); await p.evaluate(() => BLOOM_RUN_UI.adapter.actions.play()); idleSince = Date.now() - 12000; timeline.push({ t: T(), action: `advance(${n}) skip`, ticks: st.ticks }); }
      }
      await L.settle(p, 600);
      const end = await p.evaluate(() => { const r = BLOOM_RUN_UI.adapter.run(); return { won: r.won, lost: r.lost, ticks: r.ticks, seconds: r.seconds, report: !!(BLOOM.runReport.instance && BLOOM.runReport.instance.state().open) }; });
      run.end = end; console.log(`  end ${JSON.stringify(end)}`);
      if (end.report || end.won || end.lost) { await L.W.report(p).catch(() => {}); await L.settle(p, 900);
        const rep = await p.evaluate(() => { const card = document.querySelector("#rr .rr-card"), sc = document.querySelector("#rr .rr-scroll"); const r = card ? card.getBoundingClientRect() : null; const acts = [...document.querySelectorAll("#rr .rr-actions button, #rr button")].map(b => { const x = b.getBoundingClientRect(); return { t: b.textContent.trim().slice(0, 30), inView: x.bottom <= innerHeight && x.top >= 0 }; });
          return { card: r && [r.left, r.top, r.width, r.height].map(Math.round), scroll: sc ? { scrollH: sc.scrollHeight, clientH: sc.clientHeight } : null, actions: acts }; });
        await snap("report", { report: rep }); await shoot("report");
        const scr = await p.evaluate(() => { const sc = document.querySelector("#rr .rr-scroll"); if (sc && sc.scrollHeight > sc.clientHeight + 2) { sc.scrollTop = sc.scrollHeight; return true; } return false; }); if (scr) { await L.settle(p, 300); await shoot("report-scrolled"); }
      } else { await snap("tick cap reached (no report)"); await shoot("cap"); }
    } catch (e) { console.log(`  ERROR ${kind}: ${String(e.stack || e).slice(0, 500)}`); run.error = String(e.message || e).slice(0, 300); await shoot("error").catch(() => {}); }
    run.clicksTotal = clicksTotal; run.pageErrors = p.errs.slice(0, 5); run.realSeconds = T();
    // summary
    const tl = timeline.filter(x => x.worldVisibleShare != null);
    run.summary = { purchases: run.purchases.length, clicksPerPurchase: run.purchases.length ? +(run.purchases.reduce((a, x) => a + x.clicks, 0) / run.purchases.length).toFixed(2) : null, skips: run.skips.length, skippedTicks: run.skips.reduce((a, s) => a + s.ticks, 0),
      minWorldVisibleShareWithBanner: Math.min(...tl.filter(x => x.banner).map(x => x.worldVisibleShare).concat([1])), bannerShareOfWorld: Math.max(...tl.map(x => x.bannerShareOfWorld || 0)),
      nodeNotReachable: run.purchases.length ? timeline.filter(x => x.reachNode && (!x.reachNode.inViewport || !x.reachNode.uncovered)).length : 0, roomScrollEvents: timeline.filter(x => x.roomScrollers && x.roomScrollers.length).length, roomButtonsOutsideViewport: Math.max(0, ...timeline.map(x => x.roomButtonsOutsideViewport || 0)) };
    result.runs.push(run); await c.close();
    fs.mkdirSync(EVD, { recursive: true }); result.runtimeSeconds = T(); fs.writeFileSync(OUT, JSON.stringify(result, null, 1));
  }
  await browser.close(); srv.close(); console.log(`done in ${Math.round((Date.now() - t0) / 1000)} s`);
})().catch(e => { console.error(e); process.exit(1); });
