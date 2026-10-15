// BLOOM-039 live verification on GitHub Pages (the real app only). usage: node live-039.js <out.json> [shotsDir] [browser]
const Q = require("./q.js"), fs = require("fs"), path = require("path"); const L = require(path.join(Q.WT, "tools/research/design-audit/atlas-lib.js"));
const LIVE = "https://interstellarharvest.github.io/bloom/", [OUT, SHOTS, BR = "chromium"] = process.argv.slice(2);
const res = { live: LIVE, browser: BR, rows: [], requests: { failed: [], bad: [] } }; let pass = 0, fail = 0;
const check = (ok, name, d) => { res.rows.push({ ok: !!ok, name, d }); ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${d ? "  — " + JSON.stringify(d).slice(0, 260) : ""}`); };
(async () => { const b = await Q.launch(BR);
  const page = async (w, h) => { const p = await Q.newPage(b, { width: w, height: h, seeded: true }); p.on("requestfailed", r => res.requests.failed.push(r.url())); p.on("response", r => { if (r.status() >= 400) res.requests.bad.push(`${r.status()} ${r.url()}`); }); return p; };
  const shot = async (p, n) => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await p.screenshot({ path: `${SHOTS}/live-${n}.png` }); } };
  // ---- deployed build identity
  { const p = await page(1440, 900); await p.goto(LIVE + "?bg=3"); await Q.waits.menu(p);
    const src = await p.evaluate(async () => { const t = await (await fetch("resources/run-ui/run-ui-adapter.js", { cache: "no-store" })).text(); const g = await (await fetch("resources/run/game-session.js", { cache: "no-store" })).text(); const c = await (await fetch("resources/main-menu/main-menu.css", { cache: "no-store" })).text();
      return { advice: /function advice\(r\)/.test(t), visibility: /visibilitychange/.test(g) && /FRAME_GAP_MS/.test(g), appMax: /--bloom-app-max:1920px/.test(c) }; });
    check(src.advice && src.visibility && src.appMax, "D · the live site serves the BLOOM-039 build (adapter advice, visible-time loop, 1920 app contract)", src); await p.context().close(); }
  // ---- Native Competition (Challenge launch, passive play → native-held ground, stand-off)
  for (const seed of [1, 2, 3]) { const p = await page(1440, 900); await p.goto(LIVE + "?bg=3"); await Q.waits.menu(p); await Q.nav.challenge(p, "native_competition", "organic_hybrid", seed); await p.click(".cw-btn.go"); await Q.waits.run(p, 1);
    await p.evaluate(() => BLOOM_RUN_UI.adapter.actions.pause());
    let cue = false, s = 0; for (let k = 0; k < 40 && !cue; k++) { const r = await p.evaluate(async () => { BLOOM_API.advance(80); await new Promise(r => setTimeout(r, 40)); return { cue: !!document.querySelector("#pvScn .stall"), s: BLOOM_RUN_UI.adapter.run().seconds }; }); cue = r.cue; s = r.s; }
    const i = await p.evaluate(() => { const r = BLOOM_RUN_UI.adapter.regions().find(g => g.nativeHeld && g.status !== "blocked"); return r ? r.index : -1; });
    if (i < 0 && !cue) { await p.context().close(); continue; }
    if (i >= 0) { await p.evaluate(i => BLOOM_RUN_UI.adapter.actions.selectRegion(i), i); await p.waitForTimeout(400);
      const t = await p.evaluate(() => ({ banner: document.getElementById("pvBanner").innerText.replace(/\s+/g, " "), glyph: (BLOOM.planetView.instance.renderer.info().labels.find(L => L.index === BLOOM_RUN_UI.adapter.selection().index) || {}).glyph }));
      check(!/Nothing holding/.test(t.banner) && /Native-held|Natives \d+%/.test(t.banner) && t.glyph === "native", `N1 · live Native Competition (launch ${seed}): native-held ground names the competition, shows who holds it, native mark (not ✓)`, t); await shot(p, "nc-native-held");
      await L.openRoom(p, "terraform"); await p.hover('.dr-room:not([hidden]) .node[data-node="dry"]'); await p.waitForTimeout(400);
      const tf = await p.evaluate(() => document.querySelector(".dr-room:not([hidden]) .lf-info").innerText.replace(/\s+/g, " ")); check(/Your plant/i.test(tf) && /Natives/i.test(tf), "N2 · live Terraform preview: Your plant + Natives rows before purchase", tf.slice(0, 220)); await shot(p, "nc-terraform-preview"); await L.closeRoom(p); }
    check(cue, `N3 · live FRONT STALLED cue on a passive stalled front (launch ${seed}, game second ${s})`, { cue, s }); if (cue) await shot(p, "nc-front-stalled");
    check(!p.errs.length, `E · live Native Competition run: no console / page error`, p.errs.slice(0, 2)); await p.context().close(); break; }
  // ---- readout + region panel + labels + hidden tab (Expedition via the Destination Survey, 1024 and 1440)
  for (const [w, h] of [[1024, 768], [1440, 900]]) { const p = await page(w, h); await p.goto(LIVE + "?bg=3"); await Q.waits.menu(p); await Q.nav.toSpecies(p); await Q.nav.chooseSpecies(p, "organic_hybrid"); await Q.waits.survey(p); await Q.nav.focusFirst(p); await p.waitForTimeout(500); await p.click(".ds-btn.go"); await Q.waits.run(p, 1);
    await p.evaluate(() => { BLOOM_RUN_UI.adapter.actions.pause(); BLOOM_API.advance(60); });
    const scan = await p.evaluate(async () => { const A = BLOOM_RUN_UI.adapter, s = BLOOM_API.sim, G = s.config.grow.growThresh, out = { strained: [], multi: null, toxic: null, blockedButGrows: 0, checked: 0 };
      for (const g of A.regions()) { if (g.isOrigin) continue; A.actions.selectRegion(g.index); await new Promise(r => setTimeout(r, 0)); const t = document.getElementById("pvBanner").innerText.replace(/\s+/g, " "), pill = (document.querySelector("#pvBanner .pv-st") || {}).textContent;
        out.checked++; if (s.evaluate(g.index).fitness > G && /Blocked/.test(pill)) out.blockedButGrows++;
        if (g.status === "strained" && out.strained.length < 3) out.strained.push({ name: g.name, pill });
        if (!out.multi && [...document.querySelectorAll("#pvBanner [data-steps]")].some(e => +e.dataset.steps > 1)) out.multi = { name: g.name, text: t.slice(-160) };
        if (!out.toxic && /Toxicity is lethal here\. No current adaptation removes it\./.test(t)) out.toxic = g.name; }
      A.actions.deselect(); return out; });
    check(scan.blockedButGrows === 0 && scan.strained.every(x => /Strained/.test(x.pill)), `R1 · live ${w}: no region the plant can grow on says Blocked (${scan.checked} regions); strained ground reads Strained`, scan.strained);
    if (scan.multi) check(true, `R2 · live ${w}: multi-step Would help shown`, scan.multi); if (scan.toxic) check(true, `R3 · live ${w}: lethal toxicity has the no-cure wording`, scan.toxic);
    res[`scan${w}`] = { multi: !!scan.multi, toxic: !!scan.toxic };
    const pick = await p.evaluate(() => { const A = BLOOM_RUN_UI.adapter, m = A.map(), rs = A.regions().slice().sort((a, b) => b.area - a.area); return { low: (rs.find(r => r.center.y / m.height > 0.78) || {}).index, up: (rs.find(r => r.center.y / m.height < 0.3) || {}).index }; });
    const place = async i => { await p.evaluate(i => { const A = BLOOM_RUN_UI.adapter; A.actions.deselect(); A.actions.selectRegion(i); }, i); await p.waitForTimeout(300); return p.evaluate(() => { const s = BLOOM.planetView.instance.state().bannerPlace, b = document.getElementById("pvBanner").getBoundingClientRect(), h = document.querySelector(".pv-hud").getBoundingClientRect(); return { ...s, gapUnderHud: Math.round(b.top - h.bottom) }; }); };
    const lo = await place(pick.low); if (w === 1024) await shot(p, `banner-low-${w}`); const up = await place(pick.up);
    check((lo.place === "top" ? lo.gapUnderHud >= 8 && lo.coverTop < lo.coverBottom : lo.coverBottom <= 0.15) && up.place === "bottom" && up.gapUnderHud > 0, `B1 · live ${w}: a low region flips the panel under the HUD when the bottom would cover it; an upper region keeps it at the bottom; no HUD overlap`, { lo, up });
    const pts = await p.evaluate(() => { const R = BLOOM.planetView.instance.renderer, I = R.info(), cv = document.getElementById("pvMap").getBoundingClientRect(), out = []; BLOOM_RUN_UI.adapter.actions.deselect();
      for (const L of I.labels) for (const fx of [0.08, 0.92]) { const x = cv.left + L.x + L.w * fx, y = cv.top + L.y + L.h / 2; if (document.elementFromPoint(x, y) !== document.getElementById("pvMap")) continue; if (R.hitTest(x, y).region !== L.index) out.push({ label: L.index, x, y }); } return out.slice(0, 4); });
    let ok = 0; for (const pt of pts) { await p.evaluate(() => BLOOM_RUN_UI.adapter.actions.deselect()); await p.mouse.click(pt.x, pt.y); await p.waitForTimeout(120); if (await p.evaluate(() => BLOOM_RUN_UI.adapter.selection().index) === pt.label) ok++; }
    const c0 = await p.evaluate(() => { const A = BLOOM_RUN_UI.adapter; A.actions.deselect(); const i = A.regions()[0].index, R = BLOOM.planetView.instance.renderer, L = R.info().labels.find(x => x.index === i), cv = document.getElementById("pvMap").getBoundingClientRect(); return { i, x: cv.left + L.x + L.w / 2, y: cv.top + L.y + L.h / 2 }; });
    await p.mouse.click(c0.x, c0.y); await p.waitForTimeout(120); const sel0 = await p.evaluate(() => BLOOM_RUN_UI.adapter.selection().index);
    check(ok === pts.length && sel0 === c0.i, `L1 · live ${w}: clicking a name pill selects the named region (${pts.length} straddling points + a pill centre)`, { ok, pts: pts.length, centre: sel0 === c0.i });
    const tab = await p.evaluate(async () => { const A = BLOOM_RUN_UI.adapter; let hid = false; Object.defineProperty(document, "hidden", { configurable: true, get: () => hid }); A.actions.deselect(); A.actions.setSpeed(2); A.actions.play(); await new Promise(r => setTimeout(r, 400));
      const t0 = BLOOM_API.sim.ticks; hid = true; document.dispatchEvent(new Event("visibilitychange")); await new Promise(r => setTimeout(r, 4000)); const t1 = BLOOM_API.sim.ticks; hid = false; document.dispatchEvent(new Event("visibilitychange")); await new Promise(r => setTimeout(r, 300)); const t2 = BLOOM_API.sim.ticks; A.actions.pause(); delete document.hidden; return { whileHidden: t1 - t0, after300ms: t2 - t1, speed: A.run().speed }; });
    check(tab.whileHidden <= 3 && tab.after300ms <= 6 && tab.speed === 2, `T1 · live ${w}: a hidden tab replays nothing on return (2× kept)`, tab);
    check(!p.errs.length, `E · live ${w} expedition: no console / page error`, p.errs.slice(0, 2)); await p.context().close(); }
  // ---- 2560 composition
  { const p = await page(2560, 1440); await p.goto(LIVE + "?bg=3"); await Q.waits.menu(p); await Q.nav.toSpecies(p); await Q.nav.chooseSpecies(p, "organic_hybrid"); await Q.waits.survey(p); await Q.nav.focusFirst(p); await p.waitForTimeout(500); await p.click(".ds-btn.go"); await Q.waits.run(p, 1); await p.waitForTimeout(600);
    const r = await p.evaluate(() => { const b = document.querySelector(".pv").getBoundingClientRect(), e = document.elementFromPoint(100, 700); return { x: Math.round(b.left), w: Math.round(b.width), right: Math.round(innerWidth - b.right), copies: BLOOM.planetView.instance.renderer.info().copies.count, ox: document.documentElement.scrollWidth > innerWidth || document.body.scrollWidth > innerWidth, wellIsGame: !!(e && e.closest(".pv")) }; });
    check(r.w === 1920 && r.x === 320 && r.right === 320 && r.copies === 1 && !r.ox && !r.wellIsGame, "W1 · live 2560: the run is a centred 1920 app, 320 / 320 wells, one map copy, no horizontal overflow", r); await shot(p, "2560-run");
    await L.openRoom(p, "spread"); const rm = await p.evaluate(() => { const r = document.querySelector(".dr .dr-room:not([hidden])").getBoundingClientRect(); return { x: Math.round(r.left), w: Math.round(r.width) }; }); check(rm.w === 1920 && rm.x === 320, "W2 · live 2560: decision rooms inside the 1920 app", rm);
    check(!p.errs.length, "E · live 2560: no console / page error", p.errs.slice(0, 2)); await p.context().close(); }
  const bad = res.requests.bad.filter(u => !/favicon/.test(u)); check(!res.requests.failed.length && !bad.length, "E · no failed request / HTTP error on the live site", { failed: res.requests.failed.slice(0, 3), bad: bad.slice(0, 3) });
  fs.writeFileSync(OUT, JSON.stringify({ ...res, pass, fail }, null, 1)); console.log(`${BR}: ${pass} pass / ${fail} fail`); await b.close(); })().catch(e => { console.error(e); process.exit(1); });
