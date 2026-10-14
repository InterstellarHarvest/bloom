// BLOOM-038 design audit · M — SPEED / PAUSE audit (read-only research; measures, changes nothing in the game).
//
//   NODE_PATH="$(npm root -g)" node tools/research/design-audit/pause-audit.js
//
// Empirically establishes what advances the simulation and what does not, with performance.now() + adapter.run().ticks (tick = config
// tickMs) through REAL clicks on the production UI:
//   A · the released index.html Expedition run: default + available speeds and the measured tick rate at each; the Pause button; each room
//       (Regions / Adapt / Spread / Terraform) opened from the HUD tool while running — ticks during the open transition, while open, during
//       the close transition, the running state after Back (Escape) and after Resume, and Back when the run was paused before; region
//       selection + the selected-region banner; the Map View popover (and a lens hover preview); the run menu popover; the win report and
//       Keep playing; a frozen / hidden page (CDP Page.setWebLifecycleState frozen → active: does the run catch up on return?).
//   B · the same UI on the developer harness (deterministic world): a typical inspection sequence — select a blocked region → read →
//       hover a "Would help" suggestion (silent preview) → open Adapt from it → hover the node (preview) → buy → close — done from the MAP
//       vs done from INSIDE the rooms (Regions room → strip → Adapt); simulated time per phase.
//   C · scenario consequences while a room is open vs on the map for the same wall time: Dying World (real Challenge run: decline progress,
//       next-stage timer, extinction countdown), Native Competition and Volatile Climate (harness: native share, instability, an announced
//       shock's start timer), Thin Air (HOLDING timer), plus wall-clock-driven map feedback (threshold / competition outlines, toasts).
// Output: docs/evidence/bloom-038/pause-audit.json
"use strict";
const B = require("./browser-common.js");
const sleep = ms => new Promise(r => setTimeout(r, ms));

// in-page snapshot of everything time-dependent the player can see
const SNAP = () => { const A = BLOOM_RUN_UI.adapter, r = A.run(), sc = A.scenario(), fx = A.effects(), cp = A.completion ? A.completion() : null, DR = BLOOM.decisionRooms.instance.state();
  return { t: performance.now(), ticks: r.ticks, running: r.running, speed: r.speed, room: DR.room, banner: !document.getElementById("pvBanner").hidden, biomass: A.hud().biomass, coverage: +A.hud().coverage.toFixed(4),
    pressure: sc.pressure ? { progress: +sc.pressure.progress.toFixed(4), seconds: sc.pressure.seconds, nextIn: sc.pressure.nextIn, extinctionIn: sc.pressure.extinctionIn, phase: sc.pressure.phaseName } : null,
    competition: sc.competition ? { share: +sc.competition.share.toFixed(4), contested: sc.competition.contested } : null,
    climate: sc.climate ? { level: +sc.climate.level.toFixed(4), band: sc.climate.bandName, axes: Object.fromEntries(Object.entries(sc.climate.axes).map(([k, X]) => [k, { pendingIn: X.pending ? +X.pending.startsIn.toFixed(2) : null, shockEndsIn: X.shock ? +X.shock.endsIn.toFixed(2) : null }])) } : null,
    completion: cp ? { status: cp.status, line: cp.line, sub: cp.sub } : null, bubbles: A.bubbles().length,
    wallFx: { thresholds: fx.thresholds.map(x => Math.round(x.left)), competition: fx.competition.map(x => Math.round(x.left)), crossings: fx.crossings.length, toast: !document.getElementById("pvToast").hidden },
    scnText: (document.getElementById("pvScn") || {}).innerText || null }; };
const delta = (a, b, tickMs) => ({ wallMs: Math.round(b.t - a.t), ticks: b.ticks - a.ticks, simSeconds: +((b.ticks - a.ticks) * tickMs / 1000).toFixed(2), runningBefore: a.running, runningAfter: b.running });

(async () => {
  const t0 = Date.now(), srv = await B.serve(), browser = await B.launch(), O = srv.origin;
  const out = { format: "bloom-038-pause-audit@1", tool: "tools/research/design-audit/pause-audit.js", at: new Date().toISOString(), browser: "chromium " + browser.version(), viewport: "1440x900",
    method: "Real clicks / keys on the production UI; ticks from adapter.run().ticks, wall time from performance.now() in the page. Waits are wall-clock (setTimeout) while the page's own requestAnimationFrame loop runs the sim. Headless Chromium on this machine; rates are what the loop delivered here.",
    A: {}, B: {}, C: {}, findings: [], errors: [] };
  const snap = p => p.evaluate(SNAP);
  const hold = async (p, ms) => { const a = await snap(p); await sleep(ms); const b = await snap(p); return { a, b }; };
  let tickMs = 160;

  // ================================================================== A · real app, Expedition
  { const p = await B.newPage(browser);
    try {
      await p.goto(O + "/?bg=3"); await B.waits.menu(p); await B.nav.toSpecies(p); await B.nav.chooseSpecies(p, "organic_hybrid"); await B.waits.survey(p); await B.nav.focusFirst(p); await p.waitForTimeout(500);
      await p.click(".ds-btn.go"); await B.waits.run(p, 1); await p.waitForTimeout(300);
      const r0 = await p.evaluate(() => { const r = BLOOM_RUN_UI.adapter.run(); return { running: r.running, speed: r.speed, speeds: r.speeds, tickMs: r.tickMs, ticks: r.ticks, pauseLabel: document.getElementById("pvPause").getAttribute("aria-label"), speedLabel: document.getElementById("pvSpeed").textContent, speedTitle: document.getElementById("pvSpeed").title, state: document.getElementById("pvState").textContent }; });
      tickMs = r0.tickMs; out.A.atLanding = r0;
      // speeds via the real speed button
      out.A.speeds = {};
      for (let k = 0; k < r0.speeds.length; k++) { const sp = await p.evaluate(() => BLOOM_RUN_UI.adapter.run().speed); const { a, b } = await hold(p, 3000);
        out.A.speeds[sp + "x"] = { ...delta(a, b, tickMs), ticksPerSecond: +((b.ticks - a.ticks) / ((b.t - a.t) / 1000)).toFixed(2), simSecondsPerRealSecond: +(((b.ticks - a.ticks) * tickMs / 1000) / ((b.t - a.t) / 1000)).toFixed(2) };
        await p.click("#pvSpeed"); await p.waitForTimeout(100); }
      out.A.speedCycle = await p.evaluate(() => BLOOM_RUN_UI.adapter.run().speed);   // back to the first after a full cycle
      // pause button
      await p.click("#pvPause"); const pz = await hold(p, 2000); out.A.pauseButton = { ...delta(pz.a, pz.b, tickMs), hudState: await p.evaluate(() => document.getElementById("pvState").textContent), label: await p.evaluate(() => document.getElementById("pvPause").getAttribute("aria-label")) };
      await p.click("#pvPause"); await p.waitForTimeout(200);
      // rooms opened from the HUD while running (1×)
      out.A.rooms = {};
      for (const room of ["region", "adapt", "spread", "terraform"]) {
        const s0 = await snap(p); await p.click(`.pv-tool[data-tool="${room}"]`); await B.waits.room(p, room); const s1 = await snap(p);
        await sleep(3000); const s2 = await snap(p); const visible = await p.evaluate(() => { const r = document.querySelector(".dr .dr-room:not([hidden])"); const pz = r && r.querySelector(".paused"); return { pausedPill: pz ? pz.innerText.trim() : null, pausedPillOn: !!(pz && pz.classList.contains("on")), resumeBtn: !!(r && r.querySelector('[data-act="resume"]')) }; });
        await p.keyboard.press("Escape"); await B.waits.noRoom(p); const s3 = await snap(p); await sleep(1500); const s4 = await snap(p);
        const tl = await p.evaluate(() => BLOOM.decisionRooms.instance.timeline ? BLOOM.decisionRooms.instance.timeline().slice(-2) : null);
        out.A.rooms[room] = { openTransition: delta(s0, s1, tickMs), whileOpen3s: delta(s1, s2, tickMs), closeTransition: delta(s2, s3, tickMs), afterBack1500ms: delta(s3, s4, tickMs), ...visible, timeline: tl }; }
      // Back vs Resume when the run was PAUSED before the room
      await p.click("#pvPause"); await p.click('.pv-tool[data-tool="adapt"]'); await B.waits.room(p, "adapt"); await p.keyboard.press("Escape"); await B.waits.noRoom(p); const backPaused = await snap(p);
      await p.click('.pv-tool[data-tool="adapt"]'); await B.waits.room(p, "adapt"); await p.click('.dr .dr-room:not([hidden]) [data-act="resume"]'); await B.waits.noRoom(p); await p.waitForTimeout(300); const resumed = await snap(p);
      out.A.pausedBeforeRoom = { afterBack: { running: backPaused.running }, afterResume: { running: resumed.running } };
      if (!resumed.running) await p.click("#pvPause");
      // region selection (physical map click) + banner
      const pt = await p.evaluate(() => { const A = BLOOM_RUN_UI.adapter, rs = A.regions(), r = rs.find(x => !x.isOrigin) || rs[0]; return BLOOM.planetView.instance.regionPoint(r.id); });
      await p.mouse.click(pt.x, pt.y); await p.waitForTimeout(150); const sel = await hold(p, 3000); out.A.selectRegion = { ...delta(sel.a, sel.b, tickMs), bannerShown: sel.b.banner };
      await p.keyboard.press("Escape"); await p.mouse.click(5, 450).catch(() => {});
      // Map View popover + a lens hover preview
      await p.click('.pv-tool[data-tool="mapview"]'); await p.waitForTimeout(150); const mv = await hold(p, 2000);
      const lb = await p.$('#pvLens [data-lens="Temperature"]'); if (lb) await lb.hover(); const mvh = await hold(p, 2000);
      await p.keyboard.press("Escape"); out.A.mapView = { popoverOpen2s: delta(mv.a, mv.b, tickMs), lensHoverPreview2s: delta(mvh.a, mvh.b, tickMs) };
      // run menu popover
      const hasMenu = await p.$("#pvMenuBtn"); if (hasMenu) { await p.click("#pvMenuBtn"); await p.waitForTimeout(150); const mn = await hold(p, 2000); out.A.runMenu = { ...delta(mn.a, mn.b, tickMs), items: await p.evaluate(() => [...document.querySelectorAll("#pvMenu [data-act]")].map(b => b.innerText.replace(/\s+/g, " ").trim())) }; await p.keyboard.press("Escape"); }
      // scenario details / banner deselect do not apply in an Expedition (default scenario)
      // frozen page (hidden-tab proxy): the loop has no dt clamp / visibility handler → measure the catch-up on return
      { const cdp = await p.context().newCDPSession(p); const a = await snap(p);
        await cdp.send("Page.setWebLifecycleState", { state: "frozen" }); await sleep(5000); await cdp.send("Page.setWebLifecycleState", { state: "active" });
        await p.waitForTimeout(250); const b = await snap(p); await cdp.detach();
        out.A.frozenPage5s = { ...delta(a, b, tickMs), note: "CDP Page.setWebLifecycleState frozen for 5 s (no rAF, no tasks), then active: the run loop adds the whole elapsed rAF dt (no clamp, no visibilitychange handler in game-session.js), so the frozen time is simulated on return" }; }
      // win report + Keep playing
      await p.evaluate(() => { const s = BLOOM_API.sim; s.won = true; s.onWin(s.coverage()); }); await B.waits.report(p); const rp = await hold(p, 2000);
      const acts = await p.evaluate(() => BLOOM_RUN_UI.adapter.reportActions().map(a => a.id + ":" + a.label));
      out.A.winReport = { ...delta(rp.a, rp.b, tickMs), actions: acts };
      if (acts.some(a => a.startsWith("continue") || /keep/i.test(a))) { const id = acts.find(a => a.startsWith("continue") || /keep/i.test(a)).split(":")[0];
        await p.click(`#rr [data-act="${id}"]`).catch(async () => { await p.evaluate(id => BLOOM_RUN_UI.adapter.actions.reportAction(id), id); });
        await p.waitForFunction(() => !BLOOM.runReport.instance.state().open && !BLOOM.runReport.instance.state().busy, null, { timeout: 30000 }).catch(() => {}); await p.waitForTimeout(400);
        const kp = await hold(p, 2000); out.A.keepPlaying = delta(kp.a, kp.b, tickMs); }
    } catch (e) { out.errors.push("A: " + String(e.message || e).slice(0, 300)); console.log("A error", e.message); }
    out.errors.push(...p.errs.map(x => "A " + x)); await p.context().close(); }
  console.log("A done");

  // ================================================================== B · inspection sequences (harness, deterministic world)
  const HURL = B.nav.harnessURL(O, { archetype: "frozen_world", seed: 7, species: "organic_hybrid" });
  for (const mode of ["from-map", "inside-rooms"]) { const p = await B.newPage(browser);
    try {
      await p.goto(HURL); await B.waits.harness(p); await p.waitForTimeout(400);
      // a blocked region whose "Would help" lists an Adapt trait; enough Biomass to buy it
      const ctx = await p.evaluate(() => { const A = BLOOM_RUN_UI.adapter; BLOOM_API.addBiomass(600); const rs = A.regions();
        for (const r of rs) { if (!r.blocked || r.isOrigin) continue; const h = A.wouldHelp(r.index) || []; const ad = h.find(u => u.board === "Adapt"); if (ad) return { region: r.index, id: r.id, name: r.name, trait: ad.id }; } return null; });
      if (!ctx) throw new Error("no blocked region with an Adapt suggestion");
      await p.evaluate(() => { BLOOM_RUN_UI.adapter.actions.setSpeed(1); BLOOM_RUN_UI.adapter.actions.play(); });
      const phases = []; const mark = async label => { phases.push({ label, ...(await snap(p)) }); };
      await mark("start");
      if (mode === "from-map") {
        const pt = await p.evaluate(id => BLOOM.planetView.instance.regionPoint(id), ctx.id); await p.mouse.click(pt.x, pt.y); await p.waitForTimeout(100); await mark("selected (banner)");
        await sleep(4000); await mark("read banner 4 s");
        const hb = await p.$(`#pvBanner [data-item="${ctx.trait}"]`); await hb.hover(); await sleep(2000); await mark("hover Would-help preview 2 s");
        await hb.click(); await B.waits.room(p, "adapt"); await mark("Adapt open (from Would help)");
      } else {
        await p.click('.pv-tool[data-tool="region"]'); await B.waits.room(p, "region"); await mark("Regions room open");
        await p.click(`.dr .dr-room:not([hidden]) .mm-strip [data-r="${ctx.region}"]`).catch(async () => { await p.evaluate(i => BLOOM.decisionRooms.instance.setContext && BLOOM.decisionRooms.instance.setContext(i), ctx.region); });
        await p.waitForTimeout(100); await mark("region chosen in strip"); await sleep(4000); await mark("read region 4 s");
        await p.click('.dr .dr-room:not([hidden]) .rn[data-go="adapt"]'); await B.waits.room(p, "adapt"); await mark("Adapt open (room → room)");
      }
      const node = await p.$(`.dr .dr-room:not([hidden]) .node[data-node="${ctx.trait}"]`); await node.hover(); await sleep(2000); await mark("hover node preview 2 s");
      await node.click(); await p.waitForTimeout(300); await mark("bought"); await p.keyboard.press("Escape"); await B.waits.noRoom(p); await mark("closed (Back)");
      const ph = phases.map((x, k) => ({ label: x.label, ticksSinceStart: x.ticks - phases[0].ticks, simSecondsSinceStart: +((x.ticks - phases[0].ticks) * tickMs / 1000).toFixed(2), wallSecondsSinceStart: +((x.t - phases[0].t) / 1000).toFixed(2), running: x.running, room: x.room }));
      const owned = await p.evaluate(id => BLOOM_RUN_UI.adapter.upgrade(id).tier, ctx.trait);
      out.B[mode] = { world: "frozen_world:7 organic_hybrid", region: ctx.name, trait: ctx.trait, bought: owned > 0, phases: ph, totalSimSeconds: ph[ph.length - 1].simSecondsSinceStart, totalWallSeconds: ph[ph.length - 1].wallSecondsSinceStart };
    } catch (e) { out.errors.push(`B ${mode}: ` + String(e.message || e).slice(0, 300)); console.log("B error", e.message); }
    out.errors.push(...p.errs.map(x => "B " + x)); await p.context().close(); }
  console.log("B done");

  // ================================================================== C · scenario consequences: room open vs map, same wall time
  const roomVsMap = async (p, label, prep) => {
    if (prep) await prep(p);
    await p.evaluate(() => { BLOOM_RUN_UI.adapter.actions.setSpeed(1); BLOOM_RUN_UI.adapter.actions.play(); }); await p.waitForTimeout(300);
    const m0 = await snap(p); await sleep(4000); const m1 = await snap(p);
    await p.click('.pv-tool[data-tool="adapt"]'); await B.waits.room(p, "adapt"); const r0 = await snap(p); await sleep(4000); const r1 = await snap(p);
    await p.keyboard.press("Escape"); await B.waits.noRoom(p); await p.waitForTimeout(300); const r2 = await snap(p);
    return { label, onMap4s: { ...delta(m0, m1, tickMs), before: m0, after: m1 }, inRoom4s: { ...delta(r0, r1, tickMs), before: r0, after: r1 }, afterClose: { running: r2.running } };
  };
  // Dying World (real Challenge run)
  { const p = await B.newPage(browser, { seeded: true });
    try { await p.goto(O + "/?bg=5"); await B.waits.menu(p); await B.nav.challenge(p, "dying_world", "organic_hybrid", 1); await p.click(".cw-btn.go"); await B.waits.run(p, 1); await B.run.plan(p);
      out.C.dying_world = await roomVsMap(p, "Dying World (Challenge, launch 1, Organic Hybrid), decline ≈40 %", async q => { await B.run.drive(q, "s.pressure.progress >= 0.4", 3000); });
      out.C.dying_world_extinctionCountdown = await roomVsMap(p, "Dying World: no living plants (extinction grace counting)", async q => { await B.run.dieOff(q); await q.evaluate(() => BLOOM_API.advance(2)); });
    } catch (e) { out.errors.push("C dying_world: " + String(e.message || e).slice(0, 300)); console.log("C dw error", e.message); }
    out.errors.push(...p.errs.map(x => "C-dw " + x)); await p.context().close(); }
  // Native Competition + Volatile Climate (harness)
  for (const [scenario, archetype, seed, prep] of [
    ["native_competition", "ocean_archipelago", 28, async q => { await q.evaluate(() => { BLOOM_API.addBiomass(300); BLOOM_API.buy("seedOut"); BLOOM_API.advance(500); }); }],
    ["volatile_climate", "desert_world", 17, async q => { await q.evaluate(() => { BLOOM_API.addBiomass(2000); const A = BLOOM_RUN_UI.adapter;
      for (let k = 0; k < 12; k++) { const sc = A.scenario().climate; if (Object.values(sc.axes).some(X => X.pending || X.shock)) break; BLOOM_API.buy(k % 2 ? "humid" : "warm"); BLOOM_API.advance(15); } }); }]]) {
    const p = await B.newPage(browser, { seeded: true });
    try { await p.goto(B.nav.harnessURL(O, { archetype, seed, scenario, species: "organic_hybrid" })); await B.waits.harness(p); await p.waitForTimeout(300);
      out.C[scenario] = await roomVsMap(p, `${scenario} (harness ${archetype}:${seed}, Organic Hybrid)`, prep); }
    catch (e) { out.errors.push(`C ${scenario}: ` + String(e.message || e).slice(0, 300)); console.log("C error", scenario, e.message); }
    out.errors.push(...p.errs.map(x => scenario + " " + x)); await p.context().close(); }
  // Thin Air HOLDING (real Challenge run, launch 5 — the witness plan blooms early)
  { const p = await B.newPage(browser, { seeded: true });
    try { await p.goto(O + "/?bg=7"); await B.waits.menu(p); await B.nav.challenge(p, "thin_air", null, 5); await p.click(".cw-btn.go"); await B.waits.run(p, 1); await B.run.plan(p);
      out.C.thin_air_holding = await roomVsMap(p, "Thin Air early Bloom (HOLDING)", async q => { await B.run.drive(q, "s.coverage() >= s.winAt", 3000); }); }
    catch (e) { out.errors.push("C thin_air: " + String(e.message || e).slice(0, 300)); console.log("C ta error", e.message); }
    out.errors.push(...p.errs.map(x => "C-ta " + x)); await p.context().close(); }
  console.log("C done");

  // ================================================================== findings (derived from the measurements above)
  const F = out.findings, A = out.A;
  if (A.atLanding) F.push(`Expedition run lands RUNNING at ${A.atLanding.speed}× (speeds ${A.atLanding.speeds.join(" / ")}; tick ${A.atLanding.tickMs} ms → ${(1000 / A.atLanding.tickMs).toFixed(2)} ticks/s at 1×). Measured: ${Object.entries(A.speeds || {}).map(([k, v]) => `${k} ${v.ticksPerSecond} ticks/s`).join(", ")}.`);
  if (A.rooms) for (const [r, v] of Object.entries(A.rooms)) F.push(`Room ${r}: ${v.openTransition.ticks} ticks during the open transition (${v.openTransition.wallMs} ms), ${v.whileOpen3s.ticks} ticks in 3 s open, ${v.closeTransition.ticks} during close; running after Back: ${v.afterBack1500ms.runningAfter}.`);
  if (A.selectRegion) F.push(`Selecting a region / showing the banner does NOT pause: ${A.selectRegion.ticks} ticks in ${A.selectRegion.wallMs} ms.`);
  if (A.mapView) F.push(`Map View popover does NOT pause: ${A.mapView.popoverOpen2s.ticks} ticks in 2 s (lens hover preview ${A.mapView.lensHoverPreview2s.ticks}).`);
  if (A.runMenu) F.push(`Run menu popover: ${A.runMenu.ticks} ticks in 2 s (running ${A.runMenu.runningAfter}).`);
  if (A.frozenPage5s) F.push(`Frozen/hidden page for 5 s: ${A.frozenPage5s.ticks} ticks simulated on return (${A.frozenPage5s.simSeconds} s of run time).`);
  if (out.B["from-map"] && out.B["inside-rooms"]) F.push(`Inspection sequence: from the map ${out.B["from-map"].totalSimSeconds} s of run time elapse (wall ${out.B["from-map"].totalWallSeconds} s); entirely inside rooms ${out.B["inside-rooms"].totalSimSeconds} s (wall ${out.B["inside-rooms"].totalWallSeconds} s).`);
  for (const [k, v] of Object.entries(out.C)) if (v && v.onMap4s) F.push(`${v.label}: on the map ${v.onMap4s.ticks} ticks / 4 s; in a room ${v.inRoom4s.ticks} ticks / 4 s.`);
  out.seconds = Math.round((Date.now() - t0) / 1000);
  B.writeJSON("pause-audit.json", out);
  await browser.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
