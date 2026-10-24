// BLOOM-040 live verification (the deployed Pages site): Edge Assemble, reverse, fixed specimen, Terraform size, fill, rain / snow, Training anatomy, report crossfade, console
const L = require("./lib.js"), fs = require("fs"); const ORIGIN = process.argv[2], OUT = process.argv[3], BR = process.argv[4] || "chromium";
let pass = 0, fail = 0; const check = (ok, n, d = "") => { console.log(`${ok ? "PASS" : "FAIL"}  [${BR}] ${n}${d ? "  — " + d : ""}`); ok ? pass++ : fail++; };
const R = el => { const r = el.getBoundingClientRect(); return [r.x, r.y, r.width, r.height].map(v => Math.round(v * 100) / 100); };
(async () => { const b = await L.pw[BR].launch();
  // ---- an Expedition on the live site
  const p = await L.prodExpedition(b, ORIGIN, { w: 1440, h: 900 }); await p.evaluate(() => { window.__atx = 0; new MutationObserver(m => { for (const r of m) for (const n of r.addedNodes) if (n.nodeType === 1 && n.classList && n.classList.contains("atx")) window.__atx++; }).observe(document.body, { childList: true, subtree: true }); });
  const sel = await p.evaluate(() => { const A = BLOOM_RUN_UI.adapter, r = A.regions().filter(x => !x.isOrigin)[1]; A.actions.selectRegion(r.index); return r.index; }); await L.sleep(300);
  const open = await p.evaluate(async () => { const out = [], t0 = performance.now(), q = s => document.querySelector(s); document.querySelector('.pv-banner [data-go="region"]').click();
    await new Promise(res => { const f = () => { const s = q(".dr-room:not([hidden])"); if (s) out.push({ rh: s.querySelector(".rh").getBoundingClientRect().y, fx: s.querySelector(".z-focus").getBoundingClientRect().x, mx: s.querySelector(".z-map").getBoundingClientRect().x, tr: BLOOM.decisionRooms.instance.state().transitioning });
      if (BLOOM.decisionRooms.instance.state().transitioning || performance.now() - t0 < 80) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
    const s = q(".dr-room:not([hidden])"), F = { rh: s.querySelector(".rh").getBoundingClientRect().y, fx: s.querySelector(".z-focus").getBoundingClientRect().x, mx: s.querySelector(".z-map").getBoundingClientRect().x };
    const e = BLOOM.decisionRooms.instance.timeline().slice(-1)[0]; return { first: out.find(x => x.tr), F, ms: Math.round(e.tEnd - e.tStart), motion: e.motion, spot: BLOOM.planetView.instance.state().spot }; });
  check(open.first && open.first.rh < open.F.rh - 20 && open.first.fx < open.F.fx - 20 && open.first.mx > open.F.mx + 20 && open.motion === "edge" && open.spot && open.spot.index === sel,
    "map → Regions: Edge Assemble (header from above, specimen from the left, work panels from the right) after the region's emphasis", JSON.stringify(open));
  await L.settled(p); await L.sleep(300);
  const rect = () => p.evaluate(() => { const s = document.querySelector(".dr-room:not([hidden])"), b = s.querySelector(".lf-top"), sp = BLOOM.plantSpecimen.mounted().find(x => b.contains(x.el)), r = b.getBoundingClientRect(), f = sp.fill();
    return { box: [r.x, r.y, r.width, r.height].map(v => Math.round(v * 100) / 100).join(","), scale: sp.scale(), fill: f.env && f.envRect.left <= f.boxRect.left + .5 && f.envRect.right >= f.boxRect.right - .5 && f.envRect.bottom >= f.boxRect.bottom - .5 && f.envRect.top <= f.boxRect.top + .5 }; });
  const rects = { region: await rect() }, frames = [];
  for (const r of ["adapt", "spread", "terraform", "region"]) { const S = await p.evaluate(async r => { const out = [], t0 = performance.now(); document.querySelector(`.dr-room:not([hidden]) .rn[data-go="${r}"]`).click();
      await new Promise(res => { const f = () => { const v = [...document.querySelectorAll(".dr-room")].filter(s => !s.hidden); out.push(v.map(s => { const b = s.querySelector(".lf-top").getBoundingClientRect(); return [b.x, b.y, b.width, b.height].map(x => Math.round(x * 100) / 100).join(","); }).join("|"));
        if (BLOOM.decisionRooms.instance.state().transitioning || performance.now() - t0 < 60) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); }); return [...new Set(out)]; }, r);
    frames.push(S); await L.settled(p); await L.sleep(200); rects[r] = await rect(); if (r === "terraform") await p.locator(".dr-room:not([hidden]) .lf-top").screenshot({ path: `${OUT}/${BR}-live-terraform-specimen.png` }); }
  const one = new Set(Object.values(rects).map(x => x.box + "@" + x.scale)).size === 1;
  check(one && frames.every(f => f.length === 1 && !f[0].includes("|")), "Regions → Adapt → Spread → Terraform → Regions: the specimen never moves or resizes (one rect on every frame, never two rooms); Terraform's specimen is the same size and scale", JSON.stringify({ rects, frames }));
  check(Object.values(rects).every(x => x.fill), "the environment fills the specimen box in every room", "");
  // rain / snow on the live specimen (the real overlay; a rainy and a snowy scene in the real box)
  const wx = await p.evaluate(async () => { const s = BLOOM.plantSpecimen.mounted().find(x => document.querySelector(".dr-room:not([hidden]) .lf-top").contains(x.el)), PE = BLOOM.plantEnvironment, out = {};
    for (const [k, t, m, a] of [["rain", 12, 86, "ocean_archipelago"], ["snow", -12, 70, "frozen_world"]]) { s.render({ ...s.state, scene: PE.region({ planetId: "live", archetypeId: a, regionId: "qa", sky: { temperature: t, moisture: m } }) });
      await new Promise(r => setTimeout(r, 250)); const c = s.el.querySelector(".ps-fx"), d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data; let ink = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 100) ink++;
      out[k] = { on: !!s.fxState().spec[k], ink }; } BLOOM.decisionRooms.instance.setCtx(BLOOM.decisionRooms.instance.state().context); return out; });
  await p.locator(".dr-room:not([hidden]) .lf-top").screenshot({ path: `${OUT}/${BR}-live-region-specimen.png` });
  check(wx.rain.on && wx.rain.ink > 150 && wx.snow.on && wx.snow.ink > 80, "rain and snow are drawn and visible on the live specimen overlay", JSON.stringify(wx));
  const back = await p.evaluate(async () => { const out = [], t0 = performance.now(), s = document.querySelector(".dr-room:not([hidden])"), F = s.querySelector(".z-focus").getBoundingClientRect().x; document.querySelector(".dr-room:not([hidden]) .rb.back").click();
    await new Promise(res => { const f = () => { out.push(s.querySelector(".z-focus").getBoundingClientRect().x); if (BLOOM.decisionRooms.instance.state().transitioning && performance.now() - t0 < 3000) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
    return { leftward: out.some(x => x < F - 10), sel: BLOOM_RUN_UI.adapter.selection().index, room: BLOOM.decisionRooms.instance.state().room, banner: !document.getElementById("pvBanner").hidden }; });
  check(back.leftward && back.sel === sel && back.room === null && back.banner, "Back: the reverse (the specimen column leaves left), the same region still selected, its banner back", JSON.stringify(back));
  // the report: a crossfade, never the mist
  const rep = await p.evaluate(async () => { const out = [], RR = BLOOM.runReport.instance, t0 = performance.now(); const s = BLOOM_API.sim; BLOOM_API.advance(30); s.won = true; s.onWin(s.coverage());
    await new Promise(res => { const f = () => { out.push(+getComputedStyle(RR.el).opacity); if ((RR.state().busy || performance.now() - t0 < 80) && performance.now() - t0 < 4000) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
    const e = RR.timeline().slice(-1)[0]; return { mid: out.filter(o => o > 0.02 && o < 0.98).length, open: RR.state().open, motion: e.motion, ms: Math.round(e.tEnd - e.tStart), atx: window.__atx }; });
  await p.screenshot({ path: `${OUT}/${BR}-live-report.png` });
  check(rep.open && rep.motion === "crossfade" && rep.mid > 0 && rep.atx === 0, "the Bloom report opens with the quiet crossfade — no mist / cloud overlay", JSON.stringify(rep));
  check(!p.errs.length, "Expedition: no console error", p.errs.slice(0, 2).join(" | ")); await p.context().close();
  // ---- Training: the anatomy lesson's Adapt specimen is the full plant
  const t = await L.prodTraining(b, ORIGIN, { w: 1440, h: 900 }); await t.waitForFunction(() => BLOOM_TRAINING_UI.guide.director && BLOOM_TRAINING_UI.guide.director.current, null, { timeout: 30000 });
  const an = await t.evaluate(async () => { const d = BLOOM_TRAINING_UI.guide.director, A = BLOOM_RUN_UI.adapter, chill = A.regions().find(r => r.id === "chill_hollow").index; d._enter(4); d.evaluate("qa");
    BLOOM.planetView.instance.openRoom("adapt", { region: chill }); await new Promise(r => { const f = () => (BLOOM.decisionRooms.instance.state().transitioning ? requestAnimationFrame(f) : setTimeout(r, 300)); requestAnimationFrame(f); });
    const s = BLOOM.plantSpecimen.mounted().find(x => document.querySelector(".dr-room:not([hidden]) .lf-top").contains(x.el)), S = s.state;
    const ref = BLOOM.plantSpecimen.draw({ traits: S.traits, names: {}, preview: null, colony: { living: true, establishment: 0, word: "" }, focus: "balanced", local: null, condition: "ok", viable: true }, { species: A.run().species });
    return { lesson: d.current.id, org: s.organismSignature(), canonical: ref.organismSig, living: A.region(chill).living, plates: document.querySelectorAll(".dr-room:not([hidden]) .dr-leaders .aplate").length }; });
  await t.locator(".dr-room:not([hidden]) .lf-top").screenshot({ path: `${OUT}/${BR}-live-training-anatomy.png` });
  check(an.lesson === "limiting-factor" && an.org === an.canonical && an.org === "7674b261" && an.living === 0 && an.plates === 4, "Training anatomy lesson: the Adapt specimen is the full canonical plant art (no ghost), four callouts, no colony created", JSON.stringify(an));
  check(!t.errs.length, "Training: no console error", t.errs.slice(0, 2).join(" | "));
  await b.close(); console.log(`\n${fail ? fail + " FAILED" : "all " + pass + " passed"}`); process.exit(fail ? 1 : 0); })().catch(e => { console.error(e); process.exit(1); });
