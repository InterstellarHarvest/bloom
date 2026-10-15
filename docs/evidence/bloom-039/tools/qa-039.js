// BLOOM-039 browser QA matrix. usage: [PW_MODULE=… PLAYWRIGHT_BROWSERS_PATH=…] [AXE=axe.min.js] node qa-039.js <chromium|firefox|webkit> <out.json> [sizes] [shotsDir]
const Q = require("./q.js"), fs = require("fs"), path = require("path");
const [BR, OUT, SIZES = "1024x768,1440x900,1920x1080,2560x1440,2200x1200", SHOTS] = process.argv.slice(2);
const AXE = process.env.AXE && fs.existsSync(process.env.AXE) ? fs.readFileSync(process.env.AXE, "utf8") : null;
const L = require(path.join(Q.WT, "tools/research/design-audit/atlas-lib.js"));
const res = { browser: BR, rows: [], axe: [] }; let pass = 0, fail = 0;
const check = (ok, name, detail) => { res.rows.push({ ok: !!ok, name, detail }); ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"}  [${BR}] ${name}${detail ? "  — " + JSON.stringify(detail).slice(0, 300) : ""}`); };
async function axe(p, label) { if (!AXE) return; await p.addScriptTag({ content: AXE }); const r = await p.evaluate(async () => { const x = await axe.run(document, { resultTypes: ["violations"] }); return x.violations.map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length, t: v.nodes[0] && v.nodes[0].target.join(" ") })); });
  const bad = r.filter(v => v.impact === "critical" || v.impact === "serious"); res.axe.push({ label, all: r, bad }); check(!bad.length, `A · axe ${label}: 0 critical / 0 serious`, bad); }
(async () => { const S = await Q.serve(Q.WT), b = await Q.launch(BR);
  for (const sz of SIZES.split(",")) { const [W, H] = sz.split("x").map(Number), tag = `${W}x${H}`;
    // ---- app width / wells / overflow through the real app (title → species → survey → run → rooms)
    { const p = await Q.newPage(b, { width: W, height: H });
      const app = () => p.evaluate(() => { const e = ["#app > .app-run:not([hidden])", "#app > .ee-survey:not([hidden])", "#app > .ee-species:not([hidden])"].map(s => document.querySelector(s)).find(x => x && getComputedStyle(x).display !== "none");
        const r = (e && e.classList.contains("app-run") ? document.querySelector(".pv") : e).getBoundingClientRect(); return { x: Math.round(r.left), w: Math.round(r.width), right: Math.round(innerWidth - r.right), ox: document.documentElement.scrollWidth > innerWidth || document.body.scrollWidth > innerWidth }; });
      const want = Math.min(W, 1920), wantWell = (W - want) / 2, okApp = a => Math.abs(a.w - want) <= 1 && Math.abs(a.x - wantWell) <= 1 && Math.abs(a.right - wantWell) <= 1 && !a.ox;
      await p.goto(S.origin + "/?bg=3"); await Q.waits.menu(p); const t = await p.evaluate(() => ({ ox: document.documentElement.scrollWidth > innerWidth, bg: Math.round(document.querySelector(".mm-bg").getBoundingClientRect().width), plaqueRight: Math.round(innerWidth - document.querySelector(".mm-plaque").getBoundingClientRect().right) }));
      check(!t.ox && t.bg === W && t.plaqueRight >= wantWell, `W1 · ${tag} title: painting full-bleed (${W}), menu plaque inside the ${want}px composition, no horizontal overflow`, t);
      await Q.nav.toSpecies(p); const sp = await app(); check(okApp(sp), `W2 · ${tag} species: app ${want}px, wells ${wantWell}px balanced, no overflow`, sp);
      await Q.nav.chooseSpecies(p, "organic_hybrid"); await Q.waits.survey(p); await Q.waits.cells(p); const sv = await app(); check(okApp(sv), `W3 · ${tag} survey: app ${want}px centred, no overflow`, sv);
      await Q.nav.focusFirst(p); await p.waitForTimeout(600); await p.click(".ds-btn.go"); await Q.waits.run(p, 1); await p.waitForTimeout(500);
      const rn = await app(); const wellClick = W > 1920 ? await p.evaluate(async ([x, y]) => { const A = BLOOM_RUN_UI.adapter, s0 = A.selection().index, e = document.elementFromPoint(x, y); return { el: e && e.tagName + "." + e.className, inApp: !!(e && e.closest(".pv")), sel: s0 }; }, [Math.max(2, wantWell / 2), H / 2]) : null;
      check(okApp(rn) && (!wellClick || !wellClick.inApp), `W4 · ${tag} run: the whole run view (HUD, map, footer) is ${want}px centred; the wells hold no game element; one world copy`, { rn, wellClick, copies: await p.evaluate(() => BLOOM.planetView.instance.renderer.info().copies.count) });
      for (const room of ["region", "adapt", "spread", "terraform"]) { if (room === "region") await p.evaluate(() => BLOOM_RUN_UI.adapter.actions.selectRegion(BLOOM_RUN_UI.adapter.regions().find(r => r.isOrigin).index)); await L.openRoom(p, room);
        const r = await p.evaluate(() => { const rm = document.querySelector(".dr .dr-room:not([hidden])").getBoundingClientRect(), rs = document.querySelector(".dr .dr-room:not([hidden]) .rb.resume"); return { x: Math.round(rm.left), w: Math.round(rm.width), ox: document.documentElement.scrollWidth > innerWidth, resume: !!rs && rs.getBoundingClientRect().right <= innerWidth }; });
        check(Math.abs(r.w - want) <= 2 && Math.abs(r.x - wantWell) <= 2 && !r.ox && r.resume, `W5 · ${tag} ${room} room inside the capped app (${want}px), Resume reachable, no overflow`, r);
        if (room === "adapt" && W === 1024) { const n = await p.evaluate(() => [...document.querySelectorAll(".dr .dr-room:not([hidden]) .node.st-poor .nt small")].map(e => e.textContent)); if (n.length) check(n.every(t => /need \d+ more/i.test(t)), `C3 · ${tag} unaffordable Adapt nodes say what is missing at rest`, n.slice(0, 3)); }
        if (SHOTS && (W === 2560 || W === 1024) && (room === "spread" || room === "terraform")) await p.screenshot({ path: `${SHOTS}/${BR}-${tag}-room-${room}.png` }); }
      await L.closeRoom(p); if (SHOTS && W === 2560) await p.screenshot({ path: `${SHOTS}/${BR}-${tag}-run.png` });
      if (W === 1440) await axe(p, `${tag} run (expedition)`);
      check(!p.errs.length, `E1 · ${tag} app flow: no page / console error`, p.errs.slice(0, 2)); await p.context().close(); }
    if (W > 1920 && W !== 2560) continue; // 2200: the width transition only
    // ---- harness runs: banner, native, Terraform preview, labels, hidden tab
    { const p = await Q.newPage(b, { width: W, height: H, seeded: true }); await p.goto(Q.nav.harnessURL(S.origin, { archetype: "frozen_world", seed: 7, species: "organic_hybrid" })); await Q.waits.harness(p); await p.evaluate(() => { BLOOM_RUN_UI.adapter.actions.pause(); BLOOM_API.advance(60); });
      const hoar = await p.evaluate(() => BLOOM_RUN_UI.adapter.regions().findIndex(r => r.name === "Hoar Reach")); await p.evaluate(i => BLOOM_RUN_UI.adapter.actions.selectRegion(i), hoar); await p.waitForTimeout(300);
      const bn = await p.evaluate(() => ({ text: document.getElementById("pvBanner").innerText.replace(/\s+/g, " "), steps: [...document.querySelectorAll("#pvBanner [data-steps]")].map(e => +e.dataset.steps) }));
      check(/Blocked/.test(bn.text) && bn.steps.some(n => n > 1) && /need \d+ more/i.test(bn.text), `R1 · ${tag} multi-step Would help with real price + what is missing (Hoar Reach: Cold Tolerance ×2)`, bn);
      const low = await p.evaluate(() => { const A = BLOOM_RUN_UI.adapter, m = A.map(); return A.regions().filter(r => r.center.y / m.height > 0.75).sort((a, b) => b.area - a.area)[0].index; });
      await p.evaluate(i => { BLOOM_RUN_UI.adapter.actions.deselect(); BLOOM_RUN_UI.adapter.actions.selectRegion(i); }, low); await p.waitForTimeout(300);
      const pl = await p.evaluate(() => { const s = BLOOM.planetView.instance.state().bannerPlace, b = document.getElementById("pvBanner").getBoundingClientRect(), h = document.querySelector(".pv-hud").getBoundingClientRect(); return { s, gapUnderHud: Math.round(b.top - h.bottom) }; });
      check(pl.s && (pl.s.place === "top" ? pl.gapUnderHud >= 8 && pl.s.coverTop < pl.s.coverBottom : pl.s.coverBottom <= 0.15), `B1 · ${tag} a low region's banner: top under the HUD (clear gap) when the bottom would cover it, else bottom`, pl);
      if (SHOTS && W === 1024) await p.screenshot({ path: `${SHOTS}/${BR}-${tag}-banner-low.png` });
      await axe(p, `${tag} banner (blocked, multi-step)`);
      // hidden tab (synthetic visibility) at 2×: no catch-up, speed kept
      const tab = await p.evaluate(async () => { const A = BLOOM_RUN_UI.adapter, d = Object.getOwnPropertyDescriptor(Document.prototype, "hidden"); let hid = false;
        Object.defineProperty(document, "hidden", { configurable: true, get: () => hid }); A.actions.setSpeed(2); A.actions.play(); await new Promise(r => setTimeout(r, 400));
        const t0 = BLOOM_API.sim.ticks; hid = true; document.dispatchEvent(new Event("visibilitychange")); await new Promise(r => setTimeout(r, 3000)); const t1 = BLOOM_API.sim.ticks;
        hid = false; document.dispatchEvent(new Event("visibilitychange")); await new Promise(r => setTimeout(r, 300)); const t2 = BLOOM_API.sim.ticks; A.actions.pause(); delete document.hidden;
        return { whileHidden: t1 - t0, afterReturn300ms: t2 - t1, speed: A.run().speed }; });
      check(tab.whileHidden <= 3 && tab.afterReturn300ms <= 6 && tab.speed === 2, `T1 · ${tag} hidden tab: no ticks while hidden, no burst on return, 2× kept`, tab);
      // label pill straddling another region: selects its own region
      const pts = await p.evaluate(() => { const R = BLOOM.planetView.instance.renderer, I = R.info(), cv = document.getElementById("pvMap").getBoundingClientRect(), out = [];
        for (const L of I.labels) for (const fx of [0.08, 0.92]) { const x = cv.left + L.x + L.w * fx, y = cv.top + L.y + L.h / 2, e = document.elementFromPoint(x, y); if (e !== document.getElementById("pvMap")) continue; if (R.hitTest(x, y).region !== L.index) out.push({ label: L.index, x, y }); } return out.slice(0, 4); });
      let lok = 0; for (const pt of pts) { await p.evaluate(() => BLOOM_RUN_UI.adapter.actions.deselect()); await p.mouse.click(pt.x, pt.y); await p.waitForTimeout(120); if (await p.evaluate(() => BLOOM_RUN_UI.adapter.selection().index) === pt.label) lok++; }
      check(lok === pts.length, `L1 · ${tag} a click inside a region-name pill selects the region it names (${pts.length} straddling points)`, { pts: pts.length, lok });
      check(!p.errs.length, `E2 · ${tag} harness (frozen): no page / console error`, p.errs.slice(0, 2)); await p.context().close(); }
    { const p = await Q.newPage(b, { width: W, height: H, seeded: true }); await p.goto(Q.nav.harnessURL(S.origin, { archetype: "desert_world", seed: 7, scenario: "native_competition", species: "organic_hybrid" })); await Q.waits.harness(p);
      await p.evaluate(() => { BLOOM_RUN_UI.adapter.actions.pause(); BLOOM_API.addBiomass(400); BLOOM_API.buy("drought"); BLOOM_API.buy("drought"); });
      for (let k = 0; k < 20; k++) await p.evaluate(async () => { BLOOM_API.advance(80); await new Promise(r => setTimeout(r, 40)); }); await p.waitForTimeout(400); // game time in steps: the stand-off watch reads it per paint
      const i = await p.evaluate(() => BLOOM_RUN_UI.adapter.regions().find(r => r.nativeHeld && r.status !== "blocked").index); await p.evaluate(i => BLOOM_RUN_UI.adapter.actions.selectRegion(i), i); await p.waitForTimeout(300);
      const t = await p.evaluate(() => ({ banner: document.getElementById("pvBanner").innerText.replace(/\s+/g, " "), stall: !!document.querySelector("#pvScn .stall"), glyph: (BLOOM.planetView.instance.renderer.info().labels.find(L => L.index === BLOOM_RUN_UI.adapter.selection().index) || {}).glyph }));
      check(!/Nothing holding/.test(t.banner) && /Native-held/.test(t.banner) && t.glyph === "native" && t.stall, `N1 · ${tag} Native Competition: native-held ground names the competition + who holds it (native mark, not ✓); FRONT STALLED after the stalled front`, t);
      if (SHOTS && W === 1440) await p.screenshot({ path: `${SHOTS}/${BR}-${tag}-nc-banner-stall.png` });
      await axe(p, `${tag} Native Competition banner + FRONT STALLED`);
      await L.openRoom(p, "terraform"); await p.hover('.dr-room:not([hidden]) .node[data-node="dry"]'); await p.waitForTimeout(400);
      const tf = await p.evaluate(() => ({ info: document.querySelector(".dr-room:not([hidden]) .lf-info").innerText.replace(/\s+/g, " "), ctx: document.querySelector(".dr-room:not([hidden]) .mm-ctx").innerText.replace(/\s+/g, " ") }));
      check(/Natives/i.test(tf.info) && /Your plant/i.test(tf.info) && /Suits natives less \d+/.test(tf.ctx), `N2 · ${tag} Terraform preview before purchase: Your plant + Natives rows, "Suits natives less" list`, { info: tf.info.slice(0, 200), ctx: tf.ctx.slice(0, 200) });
      if (SHOTS && W === 1440) await p.screenshot({ path: `${SHOTS}/${BR}-${tag}-nc-terraform-preview.png` });
      await axe(p, `${tag} Terraform room, native preview`);
      check(!p.errs.length, `E3 · ${tag} harness (Native Competition): no page / console error`, p.errs.slice(0, 2)); await p.context().close(); }
  }
  fs.writeFileSync(OUT, JSON.stringify({ ...res, pass, fail }, null, 1)); console.log(`${BR}: ${pass} pass / ${fail} fail`); await b.close(); S.close(); })().catch(e => { console.error(e); fs.writeFileSync(OUT, JSON.stringify({ ...res, pass, fail, crash: String(e.stack || e) }, null, 1)); process.exit(1); });
