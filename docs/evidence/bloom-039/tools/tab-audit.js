// BLOOM-039 hidden-tab / long-gap timing audit. usage: node tab-audit.js <before|after> <out.json> [browser]
const Q = require("./q.js"), fs = require("fs");
const [which, OUT, BR = "chromium"] = process.argv.slice(2);
const INIT = () => { // a controllable rAF timestamp offset (a synthetic laptop sleep) and a synthetic visibility state
  let off = 0; window.__rafJump = ms => { off += ms; }; const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = cb => raf(ts => cb(ts + off));
  let hid = null; window.__setHidden = h => { hid = h; document.dispatchEvent(new Event("visibilitychange")); };
  const pd = (o, k, f) => { try { Object.defineProperty(o, k, { configurable: true, get: f }); } catch (e) { } };
  pd(Document.prototype, "hidden", function () { return hid === null ? this.visibilityState === "hidden" : hid; });
  const vs = Object.getOwnPropertyDescriptor(Document.prototype, "visibilityState"); pd(Document.prototype, "visibilityState", function () { return hid === null ? vs.get.call(this) : hid ? "hidden" : "visible"; }); };
(async () => { const S = await Q.serve(Q.rootOf(which)), b = await Q.launch(BR), out = { which, browser: BR, cases: {} };
  const fresh = async () => { const p = await Q.newPage(b, { width: 1024, height: 768, seeded: true }); await p.context().addInitScript(INIT); await p.goto(Q.nav.harnessURL(S.origin, { archetype: "desert_world", seed: 7, species: "organic_hybrid" })); await Q.waits.harness(p); await p.waitForTimeout(500); return p; };
  const snap = p => p.evaluate(() => ({ ticks: BLOOM_API.sim.ticks, t: performance.now(), running: BLOOM_RUN_UI.adapter.run().running, speed: BLOOM_RUN_UI.adapter.run().speed }));
  const rate = async (p, ms) => { const a = await snap(p); await p.waitForTimeout(ms); const z = await snap(p); return (z.ticks - a.ticks) / ((z.t - a.t) / 1000); };
  const tickMs = 160;
  // 1 · synthetic hidden 5 s at 1× (running), then visible: catch-up ticks on return (beyond ordinary frames)
  { const p = await fresh(); await p.evaluate(() => BLOOM_RUN_UI.adapter.actions.setSpeed(1)); await p.evaluate(() => BLOOM_RUN_UI.adapter.actions.play()); const r1 = await rate(p, 2000);
    const a = await snap(p); await p.evaluate(() => __setHidden(true)); await p.waitForTimeout(5000); const h = await snap(p); await p.evaluate(() => __setHidden(false)); await p.waitForTimeout(250); const z = await snap(p);
    out.cases.hidden5s = { ticksPerSecondBefore: +r1.toFixed(2), ticksWhileHidden: h.ticks - a.ticks, ticksIn250msAfterReturn: z.ticks - h.ticks, expectedIf5sReplayed: Math.round(5000 / tickMs), running: z.running, speed: z.speed }; await p.context().close(); }
  // 2 · synthetic hidden at 4×, then visible: speed and running preserved; and paused-before-hide stays paused
  { const p = await fresh(); await p.evaluate(() => { BLOOM_RUN_UI.adapter.actions.setSpeed(4); BLOOM_RUN_UI.adapter.actions.play(); }); await p.waitForTimeout(600);
    const a = await snap(p); await p.evaluate(() => __setHidden(true)); await p.waitForTimeout(3000); await p.evaluate(() => __setHidden(false)); await p.waitForTimeout(250); const z = await snap(p); const r4 = await rate(p, 1500);
    await p.evaluate(() => BLOOM_RUN_UI.adapter.actions.pause()); const pa = await snap(p); await p.evaluate(() => __setHidden(true)); await p.waitForTimeout(2000); await p.evaluate(() => __setHidden(false)); await p.waitForTimeout(500); const pz = await snap(p);
    out.cases.speedAndPause = { at4x: { ticksAcrossHidden3s: z.ticks - a.ticks, expectedIfReplayed: Math.round(3000 * 4 / tickMs), runningAfter: z.running, speedAfter: z.speed, ticksPerSecondAfter: +r4.toFixed(2) },
      pausedBeforeHide: { runningAfter: pz.running, ticksAcross: pz.ticks - pa.ticks, speedAfter: pz.speed } }; await p.context().close(); }
  // 3 · a 10-minute synthetic frame gap (laptop sleep: the next animation frame arrives 600 000 ms later), visible, running at 1×
  { const p = await fresh(); await p.evaluate(() => { BLOOM_RUN_UI.adapter.actions.setSpeed(1); BLOOM_RUN_UI.adapter.actions.play(); }); await p.waitForTimeout(500);
    const a = await snap(p); await p.evaluate(() => __rafJump(600000)); await p.waitForTimeout(400); const z = await snap(p);
    out.cases.gap10min = { ticksAcrossGap: z.ticks - a.ticks, expectedIfReplayed: Math.round(600000 / tickMs), ordinaryTicksIn400ms: Math.round(400 / tickMs), running: z.running }; await p.context().close(); }
  // 4 · CDP frozen 5 s (the BLOOM-038 method; Chromium only)
  if (BR === "chromium") { const p = await fresh(); await p.evaluate(() => { BLOOM_RUN_UI.adapter.actions.setSpeed(1); BLOOM_RUN_UI.adapter.actions.play(); }); await p.waitForTimeout(500);
    const cdp = await p.context().newCDPSession(p); const a = await snap(p); await cdp.send("Page.setWebLifecycleState", { state: "frozen" }); await new Promise(r => setTimeout(r, 5000)); await cdp.send("Page.setWebLifecycleState", { state: "active" }); await p.waitForTimeout(300); const z = await snap(p);
    out.cases.frozen5s = { ticks: z.ticks - a.ticks, wallSeconds: +((z.t - a.t) / 1000).toFixed(2), expectedIfReplayed: Math.round((z.t - a.t) / tickMs) }; await p.context().close(); }
  // 5 · a REAL background tab: another page brought to the front for 5 s (if the engine reports it hidden)
  { const p = await fresh(); await p.evaluate(() => { BLOOM_RUN_UI.adapter.actions.setSpeed(1); BLOOM_RUN_UI.adapter.actions.play(); }); await p.waitForTimeout(500);
    const a = await snap(p); const q = await p.context().newPage(); await q.bringToFront(); await new Promise(r => setTimeout(r, 5000)); const vis = await p.evaluate(() => document.visibilityState);
    await p.bringToFront(); await p.waitForTimeout(300); const z = await snap(p); await q.close();
    out.cases.realBackgroundTab = { visibilityWhileBehind: vis, ticks: z.ticks - a.ticks, wallSeconds: +((z.t - a.t) / 1000).toFixed(2) }; await p.context().close(); }
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1)); console.log(JSON.stringify(out)); await b.close(); S.close(); })();
