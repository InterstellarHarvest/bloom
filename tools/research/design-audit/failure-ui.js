// BLOOM-038 design audit · J (UI half) — FAILURE-STATE MESSAGING (read-only research; copy and rules untouched).
//
//   NODE_PATH="$(npm root -g)" node tools/research/design-audit/failure-ui.js [--no-shots]
//
// Builds DETERMINISTIC examples of each failure state on the production run UI and records exactly what the player is told, next to
// the engine's truth for the same region:
//   · developer harness worlds (demos/demo-run.html?archetype=&seed=&species=[&scenario=]) scanned at landing for: blocked by
//     Temperature (cold / hot), Water (dry / wet), hostile soil (salt-driven and pH-driven), a Hazard (radiation- / toxicity-driven),
//     several factors failing at once, the protected landing Refuge, growable land reachable only across water (no Waterborne Seeds);
//     low Biomass (Biomass set to 0 on a blocked region); native takeover (Native Competition: a nativeRetake / nativeDominated region);
//     Volatile Climate (an announced shock, then the active shock);
//   · real Challenge runs in index.html (seeded Math.random, fixed launch seeds): Dying World late decline (regions turning blocked) and
//     the extinction warning + Extinction report; Thin Air early Bloom (HOLDING) then coverage loss below the goal.
// Per state: the selected-region banner (status pill, limiting line, the four condition boxes with their status word / colour / icon,
// "Would help"), the map label lamp, the HUD state word, the scenario card (text, kind, icon, colours), adapter.message() + the log line +
// messages seen while it played, wouldHelp, every upgrade's buyability / reason, the Region Inspect room text, the report (if any), a
// screenshot — and the engine: condition factors f, the true limit (lowest f), every factor below the blocked threshold, the salt / pH /
// radiation / toxicity sub-cause, what each trait named by the hint would actually do (previewOf), and which offered traits truly
// open or improve the region. Then five structured answers per state (true cause · symptom vs root cause · a genuinely helpful action ·
// next step inferable · symbol / wording collisions) with the rule used for each.
// Output: docs/evidence/bloom-038/failure-ui.json (+ docs/evidence/bloom-038/failure-ui/<state>.png)
"use strict";
const path = require("path");
const B = require("./browser-common.js");
const SHOTS = !process.argv.includes("--no-shots"), SHOT_DIR = path.join(B.OUT, "failure-ui");
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ------------------------------------------------------------------ in-page: classify every region at the current moment
function scanRegions() {
  const A = BLOOM_RUN_UI.adapter, d = BLOOM_API.sim.derived(), C = BLOOM_DATA.config.categories, rs = A.regions();
  const liveMass = new Set(rs.filter(r => r.living > 0).map(r => r.landmass)), waterOwned = (A.upgrade("waterSeeds") || {}).tier > 0;
  return rs.map(r => { const R = A.region(r.index), raw = R.raw, failing = R.conditions.filter(c => c.f < C.blockedBelow).map(c => c.key);
    const tw = (R.conditions.find(c => c.key === "Temperature") || {}).word, ww = (R.conditions.find(c => c.key === "Water") || {}).word;
    return { index: r.index, id: r.id, name: r.name, origin: r.isOrigin, blocked: r.blocked, refuge: r.refuge, lamp: r.lamp, living: r.living, landmass: r.landmass, limitKey: R.limiting.key, failing, tw, ww,
      salt: raw.salinity > d.saltTol, ph: raw.ph < C.Soil.phMin || raw.ph > C.Soil.phMax, rad: raw.effectiveRadiation > d.radTol, tox: raw.toxicity > d.toxTol,
      unreachable: !r.blocked && !r.isOrigin && r.living === 0 && !liveMass.has(r.landmass) && !waterOwned }; });
}

// ------------------------------------------------------------------ in-page: everything the player is told about region i + the engine truth
function capture(i) {
  const A = BLOOM_RUN_UI.adapter, d = BLOOM_API.sim.derived(), C = BLOOM_DATA.config.categories, txt = e => e ? e.innerText.replace(/\s+/g, " ").trim() : null;
  const col = e => { if (!e) return null; const c = getComputedStyle(e); return { color: c.color, background: c.backgroundColor, border: c.borderTopColor }; };
  const svg = e => { const s = e && (e.matches && e.matches("svg") ? e : e.querySelector("svg")); return s ? s.innerHTML : null; };
  const ban = document.getElementById("pvBanner"), scn = document.getElementById("pvScn");
  const banner = i < 0 || ban.hidden ? null : {
    text: txt(ban), status: (() => { const s = ban.querySelector(".bn-t .pv-st"); return s ? { word: txt(s), cls: s.className, title: s.getAttribute("title"), ...col(s), icon: svg(s) } : null; })(),
    colonyAndLimit: txt(ban.querySelector(".bn-h p")), limiting: txt(ban.querySelector(".lim")),
    conditions: [...ban.querySelectorAll(".bc")].map(b => { const sb = b.querySelector(".sb"); return { cat: b.dataset.cat, reading: txt(b.querySelector(".bc-t b")), status: txt(sb) || (sb && sb.getAttribute("title")), cls: b.className, ...col(sb), icon: svg(sb) }; }),
    wouldHelp: [...ban.querySelectorAll(".hb")].map(b => txt(b)), wouldHelpNone: txt(ban.querySelector(".bn-help .none")) };
  const R = i >= 0 ? A.region(i) : null, raw = R ? R.raw : null;
  const ups = A.upgrades().flatMap(b => b.items);
  // traits named by the fix hint (by name / short name), and what each would really do for THIS region
  const hint = R && R.limiting.hint || "";
  const named = ups.filter(u => hint && (hint.toLowerCase().includes(u.name.toLowerCase()) || (u.short && new RegExp("\\b" + u.short + "\\b", "i").test(hint)))).map(u => u.id);
  const pv = id => { const p = A.previewOf(id); if (!p) return null; const has = L => (L || []).some(x => x === R.id || x === i || (x && (x.id === R.id || x.index === i)));
    const u = A.upgrade(id); return { id, name: u.name, board: u.board, available: p.available, opens: has(p.gain), better: has(p.better), worse: has(p.worse), closes: has(p.lose), canBuy: u.canBuy, affordable: u.affordable, price: u.price, tier: u.tier, maxTier: u.maxTier, reason: u.reason }; };
  const truth = R ? ups.map(u => pv(u.id)).filter(x => x && (x.opens || x.better)) : [];
  const cp = A.completion ? A.completion() : null, rep = A.report();
  return {
    selected: i, banner, region: R ? { id: R.id, name: R.name, origin: R.isOrigin, lamp: R.lamp, blocked: R.blocked, refuge: R.refuge, fitness: +R.fitness.toFixed(4), living: R.vitals.living, landmass: R.landmass,
      conditions: R.conditions.map(c => ({ key: c.key, f: +c.f.toFixed(4), word: c.word, lamp: c.lamp, soft: c.soft, terraformable: c.terraformable })), limiting: R.limiting, colony: R.colony,
      temperature: R.temperature, raw, competition: R.competition, pressure: R.pressure } : null,
    engine: R ? { trueLimit: R.conditions.slice().sort((a, b) => a.f - b.f)[0].key, failing: R.conditions.filter(c => c.f < C.blockedBelow).map(c => c.key), blockedBelow: C.blockedBelow, lampThresholds: C.lamp,
      subCause: { saltOver: raw.salinity > d.saltTol, phOut: raw.ph < C.Soil.phMin || raw.ph > C.Soil.phMax, radOver: raw.effectiveRadiation > d.radTol, toxOver: raw.toxicity > d.toxTol,
        salinity: raw.salinity, saltTol: d.saltTol, ph: raw.ph, phRange: [C.Soil.phMin, C.Soil.phMax], radiation: raw.effectiveRadiation, radTol: d.radTol, toxicity: raw.toxicity, toxTol: d.toxTol },
      tolerance: { tempFloor: d.tempFloor, tempCeil: d.tempCeil, waterPos: d.waterPos, waterTol: d.waterTol } } : null,
    hintTraits: R ? named.map(pv) : [], trulyHelps: truth, wouldHelp: R ? A.wouldHelp(i) : null,
    upgrades: ups.map(u => ({ id: u.id, board: u.board, name: u.name, canBuy: u.canBuy, affordable: u.affordable, price: u.price, tier: u.tier, reason: u.reason })),
    hud: { state: txt(document.getElementById("pvState")), biomass: A.hud().biomass, coverage: txt(document.getElementById("pvCov")), goal: txt(document.getElementById("pvGoal")) },
    scenarioCard: scn && !scn.hidden ? { text: txt(scn), kind: scn.dataset.kind, completion: scn.dataset.completion || null, icon: svg(scn.querySelector(".sh")), headColor: col(scn.querySelector(".sh b")),
      warn: scn.querySelector(".warn") ? { text: txt(scn.querySelector(".warn")), ...col(scn.querySelector(".warn")) } : null, cond: scn.querySelector(".cond") ? { text: txt(scn.querySelector(".cond")), status: scn.querySelector(".cond").dataset.status, icon: svg(scn.querySelector(".cond")), ...col(scn.querySelector(".cond")) } : null,
      meterFill: (() => { const m = scn.querySelector(".sm i"); return m ? getComputedStyle(m).backgroundImage.slice(0, 120) + " " + getComputedStyle(m).backgroundColor : null; })() } : null,
    message: A.message(), log: txt(document.getElementById("pvLog")), logIcon: svg(document.getElementById("pvLog")), toast: (() => { const t = document.getElementById("pvToast"); return t && !t.hidden ? txt(t) : null; })(),
    messagesSeen: (window.__msgs || []).slice(-12), scenario: A.scenario(), completion: cp,
    report: rep ? { kind: rep.kind, heading: rep.heading, reason: rep.reason || null, text: txt(document.querySelector("#rr")) } : null,
    effects: (() => { const f = A.effects(); return { thresholds: f.thresholds.map(x => ({ id: x.id, worse: x.worse })), competition: f.competition.map(x => ({ id: x.id, type: x.type })) }; })(),
  };
}

async function roomText(p, i) {
  try { await p.evaluate(i => BLOOM.planetView.instance.openRoom("region", { region: i }), i); await B.waits.room(p, "region"); await p.waitForTimeout(300);
    const t = await p.evaluate(() => { const r = document.querySelector(".dr .dr-room:not([hidden])"); return r ? r.innerText.replace(/\s+\n/g, "\n").replace(/\n{2,}/g, "\n").trim().slice(0, 2400) : null; });
    await p.keyboard.press("Escape"); await B.waits.noRoom(p); await p.waitForTimeout(200); return t; } catch (e) { return "room error: " + e.message; }
}
const listen = p => p.evaluate(() => { window.__msgs = []; BLOOM_RUN_UI.adapter.subscribe(() => { const m = BLOOM_RUN_UI.adapter.message(); if (m && m !== window.__msgs[window.__msgs.length - 1]) window.__msgs.push(m); }); });
const select = async (p, i) => { await p.evaluate(i => { if (i >= 0) BLOOM_RUN_UI.adapter.actions.selectRegion(i); else BLOOM_RUN_UI.adapter.actions.deselect(); }, i); await p.waitForTimeout(600); };
// play at 4× for `ms` (the frame loop's own messages / outlines appear as in play), then pause
const playFor = async (p, ms, speed = 4) => { await p.evaluate(sp => { const A = BLOOM_RUN_UI.adapter; A.actions.setSpeed(sp); A.actions.play(); }, speed); await sleep(ms); await p.evaluate(() => BLOOM_RUN_UI.adapter.actions.pause()); };

(async () => {
  const t0 = Date.now(), srv = await B.serve(), browser = await B.launch(), O = srv.origin, ICONS = B.iconTable();
  const iconKey = s => s ? (s.match(/="([^"]*)"/g) || []).join("|") : null, ICON_BY = {}; for (const [k, v] of Object.entries(ICONS)) ICON_BY[iconKey(k)] = v;
  const iconName = s => s ? ICON_BY[iconKey(s)] || "unknown" : null;
  const out = { format: "bloom-038-failure-ui@1", tool: "tools/research/design-audit/failure-ui.js", at: new Date().toISOString(), browser: "chromium " + browser.version(), viewport: "1440x900",
    method: "Each state is reproduced deterministically (harness URL = archetype + seed + species [+ scenario]; Challenge runs with a seeded Math.random and a fixed launch seed) and captured paused. Engine truth comes from adapter.region(i) (condition factors f; blocked = f < config.categories.blockedBelow), sim.derived() tolerances and adapter.previewOf for every offered trait. Answers use the rules in `rules`.",
    rules: {
      q1_trueCause: "the banner's named limiting category equals the lowest-f category AND, for Soil / Hazard, the hint's named fix targets the real sub-cause (salt vs pH, radiation vs toxicity); 'partial' when several factors fail and the named fix alone does not open the region (hint traits' previews do not open it)",
      q2_symptomVsRoot: "'yes' when the banner (or the scenario card shown with it) names the mechanism behind the symptom (decline / native / shock / water barrier / refuge / Biomass); 'room-only' when only Region Inspect says it; 'no' otherwise",
      q3_helpfulAction: "'yes' when a 'Would help' suggestion truly opens the region (previewOf gain) and can be bought now or shows its price; 'improves-only' when the only true effect is 'better'; 'no' when no visible action would help, 'misleading' when a visible suggestion does not help",
      q4_nextStepInferable: "heuristic: yes = q1 yes and q3 yes; partial = one of them; no = neither — HUMAN PLAYTEST NEEDED for the real answer",
      q5_collisions: "computed across all states: two mechanics sharing an icon or a status word, or the same text colour for different meanings",
    }, worlds: {}, states: {}, vocabulary: [], collisions: [], errors: [] };

  const shotOf = async (p, name) => SHOTS ? B.shot(p, path.join(SHOT_DIR, name + ".png")) : null;
  const record = async (p, name, i, meta = {}) => { const c = await p.evaluate(capture, i); c.roomText = i >= 0 ? await roomText(p, i) : null; if (i >= 0) await select(p, i);
    c.screenshot = await shotOf(p, name); c.meta = meta; out.states[name] = c; console.log(`  · ${name}${c.region ? " — " + c.region.name + " · " + (c.banner && c.banner.limiting || "") : ""}`); return c; };

  // ======================================================================== 1 · harness scan at landing
  const W = []; for (const a of ["frozen_world", "desert_world", "ocean_archipelago"]) for (const s of [7, 9, 13, 17, 22, 25, 28]) for (const sp of ["organic_hybrid", "woolly_candle", "cinder_rosette", "reed_spire"]) W.push({ archetype: a, seed: s, species: sp });
  const need = { temp_cold: r => r.blocked && !r.origin && r.limitKey === "Temperature" && /freez|cold/.test(r.tw) && r.failing.length === 1,
    temp_hot: r => r.blocked && !r.origin && r.limitKey === "Temperature" && !/freez|cold/.test(r.tw) && r.failing.length === 1,
    water_dry: r => r.blocked && !r.origin && r.limitKey === "Water" && /parch|dry/.test(r.ww) && r.failing.length === 1,
    water_wet: r => r.blocked && !r.origin && r.limitKey === "Water" && !/parch|dry/.test(r.ww) && r.failing.length === 1,
    soil_salt: r => r.blocked && !r.origin && r.limitKey === "Soil" && r.salt && !r.ph, soil_ph: r => r.blocked && !r.origin && r.limitKey === "Soil" && r.ph && !r.salt,
    hazard_radiation: r => r.blocked && !r.origin && r.limitKey === "Hazard" && r.rad && !r.tox, hazard_toxicity: r => r.blocked && !r.origin && r.limitKey === "Hazard" && r.tox,
    multi_factor: r => r.blocked && !r.origin && r.failing.length >= 2, refuge: r => r.refuge, unreachable_land: r => r.unreachable };
  const found = {};
  { const p = await B.newPage(browser);
    for (const w of W) { if (Object.keys(need).every(k => found[k])) break;
      try { await p.goto(B.nav.harnessURL(O, w)); await B.waits.harness(p); const rs = await p.evaluate(scanRegions);
        for (const [k, f] of Object.entries(need)) if (!found[k]) { const r = rs.find(f); if (r) found[k] = { ...w, region: r.index, name: r.name }; } }
      catch (e) { out.errors.push(`scan ${w.archetype}:${w.seed}:${w.species}: ${String(e.message).slice(0, 120)}`); } }
    await p.context().close(); }
  out.worlds = found; console.log("scan:", Object.entries(found).map(([k, v]) => `${k}=${v.archetype}:${v.seed}:${v.species}#${v.region}`).join(" "));
  for (const k of Object.keys(need)) if (!found[k]) out.errors.push(`no landing example found for ${k} in ${W.length} harness worlds`);

  // ======================================================================== 2 · landing states (harness)
  for (const [k, w] of Object.entries(found)) { const p = await B.newPage(browser, { seeded: true });
    try { await p.goto(B.nav.harnessURL(O, w)); await B.waits.harness(p); await listen(p); await p.evaluate(() => BLOOM_RUN_UI.adapter.actions.pause()); await select(p, w.region);
      const c = await record(p, k, w.region, { url: B.nav.harnessURL("", w), how: "landing (tick 0), paused" });
      // AFTER the capture (it mutates the run): would the hint's traits open the region if bought tier after tier? (Biomass added; the ground truth for "No offered upgrade opens it right now")
      // per trait, on a FRESH copy of the world (probes must not stack): buy it tier after tier (Biomass added) — does the region open?
      c.tierProbe = {};
      for (const id of (c.hintTraits || []).filter(Boolean).map(h => h.id)) { await p.goto(B.nav.harnessURL(O, w)); await B.waits.harness(p);
        c.tierProbe[id] = await p.evaluate(([i, id]) => { const A = BLOOM_RUN_UI.adapter, steps = []; BLOOM_API.addBiomass(5000);
          for (let t = 0; t < 6; t++) { const u = A.upgrade(id); if (!u || !u.canBuy) { steps.push({ stop: u ? (u.reason || "cannot buy") : "not offered" }); break; }
            BLOOM_API.buy(id); const R = A.region(i); steps.push({ tier: A.upgrade(id).tier, blocked: R.blocked, lamp: R.lamp, f: R.conditions.map(c => c.key[0] + "=" + c.f.toFixed(2)).join(" ") }); if (!R.blocked) break; }
          return steps; }, [w.region, id]).catch(e => [{ stop: "error " + e.message }]); }
      // a fresh copy of the same world, NOTHING bought: does the plant colonise this region anyway? (living tiles every 300 ticks)
      await p.goto(B.nav.harnessURL(O, w)); await B.waits.harness(p);
      c.growthProbe = await p.evaluate(i => { const A = BLOOM_RUN_UI.adapter, G = BLOOM_DATA.config.grow, R0 = A.region(i), series = [];
        for (let t = 0; t <= 2400; t += 300) { if (t) BLOOM_API.advance(300); const R = A.region(i); series.push({ tick: t, living: R.vitals.living, area: R.vitals.area, blocked: R.blocked, lamp: R.lamp }); }
        return { growThresh: G.growThresh, dieThresh: G.dieThresh, fitnessAtLanding: +R0.fitness.toFixed(3), engineGrowable: R0.fitness > G.growThresh, series, colonisedWithoutPurchase: series[series.length - 1].living > 0, stillLabelledBlocked: series[series.length - 1].blocked }; }, w.region); } catch (e) { out.errors.push(`${k}: ${String(e.message).slice(0, 200)}`); }
    await p.context().close(); }

  // ======================================================================== 3 · low Biomass (a blocked region whose fix exists, Biomass 0)
  { const w = found.temp_cold || found.water_dry || Object.values(found)[0]; const p = await B.newPage(browser, { seeded: true });
    try { await p.goto(B.nav.harnessURL(O, w)); await B.waits.harness(p); await listen(p); await p.evaluate(() => { BLOOM_RUN_UI.adapter.actions.pause(); BLOOM_API.sim.biomass = 0; BLOOM_API.advance(1); BLOOM_RUN_UI.adapter.actions.pause(); });
      await select(p, w.region); const c = await record(p, "low_biomass", w.region, { url: B.nav.harnessURL("", w), how: "landing, sim.biomass = 0, one tick" });
      // what the Adapt room says about an unaffordable suggestion (hover the first Would-help node)
      const tr = (c.wouldHelp || [])[0] || (c.hintTraits || []).find(Boolean); if (tr) { await p.evaluate(([i, id]) => BLOOM.planetView.instance.openRoom(id === "warm" || id === "cool" || id === "humid" || id === "dry" ? "terraform" : id === "waterSeeds" || id === "seedOut" || id === "earlyMat" ? "spread" : "adapt", { region: i }), [w.region, tr.id]);
        await p.waitForFunction(() => { const s = BLOOM.decisionRooms.instance.state(); return s.room && !s.transitioning; }, null, { timeout: 30000 }); await p.waitForTimeout(300);
        const n = await p.$(`.dr .dr-room:not([hidden]) .node[data-node="${tr.id}"]`); if (n) { await n.hover(); await p.waitForTimeout(400); await n.evaluate(e => e.click()); await p.waitForTimeout(300); }   // (aria-disabled: Playwright refuses a click; the DOM click is what a mouse click does)
        c.roomOnUnaffordable = await p.evaluate(() => { const r = document.querySelector(".dr .dr-room:not([hidden])"); const info = r && r.querySelector(".lf-info"); return { info: info ? info.innerText.replace(/\s+/g, " ").trim() : null, hint: (r && r.querySelector(".li-hint")) ? r.querySelector(".li-hint").innerText : null }; });
        c.roomScreenshot = await shotOf(p, "low_biomass-room"); await p.keyboard.press("Escape"); } }
    catch (e) { out.errors.push(`low_biomass: ${String(e.message).slice(0, 200)}`); } await p.context().close(); }

  // ======================================================================== 4 · native takeover (harness Native Competition)
  // (probe: Ocean 28 gave no retake / dominated event in 3000 ticks; Frozen 7 does)
  { const w = { archetype: "frozen_world", seed: 7, species: "organic_hybrid", scenario: "native_competition" }; const p = await B.newPage(browser, { seeded: true });
    try { await p.goto(B.nav.harnessURL(O, w)); await B.waits.harness(p); await listen(p);
      const ev = await p.evaluate(() => { const s = BLOOM_API.sim; BLOOM_API.addBiomass(500); BLOOM_API.buy("seedOut"); BLOOM_API.buy("waterSeeds"); let hit = null;
        for (let t = 0; t < 6000 && !hit; t += 20) { BLOOM_API.advance(20); const e = s.competition.events.find(x => x.type === "nativeRetake" || x.type === "nativeDominated"); if (e) hit = { type: e.type, sec: e.sec, tick: e.tick }; } return hit; });
      if (!ev) throw new Error("no nativeRetake / nativeDominated event in 6000 ticks");
      await playFor(p, 1500, 1); await select(p, ev.sec); await record(p, "native_takeover", ev.sec, { url: B.nav.harnessURL("", w), how: `seedOut + waterSeeds bought, advanced to the first ${ev.type} event (tick ${ev.tick}) then 1.5 s at 1×`, event: ev }); }
    catch (e) { out.errors.push(`native_takeover: ${String(e.message).slice(0, 200)}`); } await p.context().close(); }

  // ======================================================================== 5 · Volatile Climate: announced shock, then active shock (harness)
  { const w = { archetype: "desert_world", seed: 17, species: "organic_hybrid", scenario: "volatile_climate" }; const p = await B.newPage(browser, { seeded: true });
    try { await p.goto(B.nav.harnessURL(O, w)); await B.waits.harness(p); await listen(p);
      const warn = await p.evaluate(() => { const A = BLOOM_RUN_UI.adapter, s = BLOOM_API.sim; BLOOM_API.addBiomass(3000); let bought = [];
        for (let k = 0; k < 16; k++) { const ax = Object.entries(A.scenario().climate.axes).find(([, X]) => X.pending || X.shock); if (ax) return { axis: ax[0], bought, ticks: s.ticks };
          const id = k % 2 ? "humid" : "warm"; if (BLOOM_API.buy(id)) bought.push(id); BLOOM_API.advance(10); } return null; });
      if (!warn) throw new Error("no shock announced after 16 Terraform steps");
      await playFor(p, 600, 1);
      const living = await p.evaluate(() => { const rs = BLOOM_RUN_UI.adapter.regions(); const r = rs.filter(x => x.living > 0).sort((a, b) => a.fitness - b.fitness)[0]; return r ? r.index : -1; });
      await select(p, living); await record(p, "climate_shock_warning", living, { url: B.nav.harnessURL("", w), how: `Terraform ${warn.bought.join(", ")} until a shock was announced (tick ${warn.ticks}); weakest living region selected` });
      await p.evaluate(() => { const A = BLOOM_RUN_UI.adapter; for (let t = 0; t < 2000; t++) { if (Object.values(A.scenario().climate.axes).some(X => X.shock)) break; BLOOM_API.advance(1); } BLOOM_API.advance(8); });
      await playFor(p, 1200, 1);
      const hit = await p.evaluate(() => { const A = BLOOM_RUN_UI.adapter, f = A.effects(); const th = f.thresholds.find(x => x.worse); if (th) return th.index; const rs = A.regions(); const r = rs.filter(x => x.living > 0 && x.lamp !== "green").sort((a, b) => a.fitness - b.fitness)[0] || rs.filter(x => x.living > 0)[0]; return r ? r.index : -1; });
      await select(p, hit); await record(p, "climate_shock_active", hit, { url: B.nav.harnessURL("", w), how: "advanced to the shock start + 8 ticks, 1.2 s at 1×; a region pushed worse (threshold outline) or the weakest living one" }); }
    catch (e) { out.errors.push(`climate: ${String(e.message).slice(0, 200)}`); } await p.context().close(); }

  // ======================================================================== 6 · Dying World late decline + extinction (real Challenge run)
  { const p = await B.newPage(browser, { seeded: true });
    try { await p.goto(O + "/?bg=5"); await B.waits.menu(p); await B.nav.challenge(p, "dying_world", "organic_hybrid", 1); await p.click(".cw-btn.go"); await B.waits.run(p, 1); await listen(p);
      await p.evaluate(() => { window.__plan = { plan: [], k: 0 }; });   // NO purchases: the decline is not countered (a bought witness plan blooms before 80 % and ends the run)
      const dw = await B.run.drive(p, "s.pressure.progress >= 0.8", 4000); await playFor(p, 2500, 4);
      const i = await p.evaluate(() => { const A = BLOOM_RUN_UI.adapter, rs = A.regions(); const th = A.effects().thresholds.find(x => x.worse); if (th) return th.index;
        const r = rs.filter(x => x.blocked && !x.isOrigin && (x.living > 0 || BLOOM_API.sim.livingCountBySection ? true : false)).sort((a, b) => b.living - a.living)[0]; return r ? r.index : rs.findIndex(x => x.isOrigin); });
      await select(p, i); await record(p, "dying_world_late_decline", i, { how: "Challenge dying_world, launch seed 1, Organic Hybrid, nothing bought, driven to 80 % decline, 2.5 s at 4×", drive: dw });
      await B.run.dieOff(p); await p.evaluate(() => BLOOM_API.advance(3)); await playFor(p, 500, 1);
      await record(p, "extinction_warning", -1, { how: "every living tile removed (test hook), 3 ticks + 0.5 s at 1×" });
      await p.evaluate(() => { let n = 0; while (!BLOOM_API.sim.lost && n++ < 400) BLOOM_API.advance(1); }); await B.waits.report(p); await p.waitForTimeout(700);
      await record(p, "extinction_report", -1, { how: "advanced until sim.lost; the production Extinction report" }); }
    catch (e) { out.errors.push(`dying_world: ${String(e.message).slice(0, 200)}`); } await p.context().close(); }

  // ======================================================================== 7 · Thin Air early Bloom (HOLDING) → coverage loss (real Challenge run, launch 5)
  { const p = await B.newPage(browser, { seeded: true });
    try { await p.goto(O + "/?bg=7"); await B.waits.menu(p); await B.nav.challenge(p, "thin_air", null, 5); await p.click(".cw-btn.go"); await B.waits.run(p, 1); await listen(p); await B.run.plan(p);
      const e1 = await B.run.drive(p, "s.coverage() >= s.winAt", 3000);
      await p.evaluate(() => { const A = BLOOM_RUN_UI.adapter; A.actions.setSpeed(1); A.actions.play(); }); await sleep(700);
      const c = await p.evaluate(capture, -1); c.screenshot = await shotOf(p, "thin_air_holding"); c.meta = { how: "Challenge thin_air launch 5 (Woolly Candle), witness plan to coverage ≥ goal before the final atmosphere; captured RUNNING (HOLDING is the running word)", early: e1 };
      await p.evaluate(() => BLOOM_RUN_UI.adapter.actions.pause()); out.states.thin_air_holding = c; console.log("  · thin_air_holding —", c.hud.state, "·", c.scenarioCard && c.scenarioCard.cond && c.scenarioCard.cond.text);
      await B.run.thinTo(p, e1.winAt - 0.08); await p.evaluate(() => BLOOM_API.advance(1)); await playFor(p, 700, 1);
      const c2 = await p.evaluate(capture, -1); c2.screenshot = await shotOf(p, "thin_air_coverage_lost"); c2.meta = { how: "then coverage thinned to goal − 8 points (test hook), 1 tick + 0.7 s at 1×" }; out.states.thin_air_coverage_lost = c2;
      console.log("  · thin_air_coverage_lost —", c2.hud.state, "·", c2.scenarioCard && c2.scenarioCard.cond && c2.scenarioCard.cond.text); }
    catch (e) { out.errors.push(`thin_air: ${String(e.message).slice(0, 200)}`); } await p.context().close(); }

  // ======================================================================== 8 · answers + vocabulary / collisions
  const KEYWORD = { dying_world_late_decline: /declin|drift|dying|pressure|noticeable|severe/i, native_takeover: /native/i, climate_shock_warning: /shock|unstable|instabil|coming|storm|swing/i, climate_shock_active: /shock|temporary|storm|swing|unstable/i,
    unreachable_land: /water|reach|cross|island|seeds/i, refuge: /refuge|landing|protect/i, low_biomass: /biomass|need|afford/i, extinction_warning: /extinct|no living/i, thin_air_holding: /hold|settle/i, thin_air_coverage_lost: /regain|bloom|lost|below/i };
  for (const [name, c] of Object.entries(out.states)) {
    const R = c.region, E = c.engine, bn = c.banner, a = {};
    // q1 · true cause
    if (R && R.blocked) { const named = R.limiting.key, ok = named === E.trueLimit; let sub = null;
      if (named === "Soil") sub = E.subCause.saltOver && !E.subCause.phOut ? "salt (hint: Salt Handling) — correct" : E.subCause.phOut && !E.subCause.saltOver ? "pH (hint names Salt Handling, which does not change pH)" : E.subCause.phOut && E.subCause.saltOver ? "salt AND pH" : "neither over limit?";
      if (named === "Hazard") sub = E.subCause.radOver && !E.subCause.toxOver ? "radiation" : E.subCause.toxOver && !E.subCause.radOver ? "toxicity (no Adapt trait raises toxicity tolerance)" : E.subCause.toxOver && E.subCause.radOver ? "radiation AND toxicity" : "neither over limit?";
      const hintOpens = (c.hintTraits || []).some(h => h && h.opens);
      a.q1_trueCause = { answer: !ok ? "no" : E.failing.length > 1 && !hintOpens ? "partial" : (named === "Soil" && E.subCause.phOut && !E.subCause.saltOver) || (named === "Hazard" && E.subCause.toxOver && !E.subCause.radOver && !/toxic/i.test(R.limiting.hint || "")) ? "partial" : "yes",
        named, trueLimit: E.trueLimit, failing: E.failing, engineGrowable: c.growthProbe ? c.growthProbe.engineGrowable : null, colonisedWithoutPurchase: c.growthProbe ? c.growthProbe.colonisedWithoutPurchase : null, subCause: sub, hint: R.limiting.hint, hintTraitsOpenIt: hintOpens, labelLamp: R.lamp, bannerStatus: bn && bn.status && bn.status.word, lampVsStatusMismatch: !!(bn && bn.status && ((R.lamp === "yellow" && /blocked/i.test(bn.status.word)) || (R.lamp === "green" && /blocked/i.test(bn.status.word)))) };
    } else if (R) a.q1_trueCause = { answer: "n/a (region not blocked)", named: R.limiting.key, lamp: R.lamp, status: bn && bn.status && bn.status.word, limitingLine: bn && bn.limiting };
    else a.q1_trueCause = { answer: "n/a (no region selected)" };
    // q2 · symptom vs root cause
    const kw = KEYWORD[name]; if (kw) { const inBanner = kw.test([bn && bn.text, c.scenarioCard && c.scenarioCard.text, c.hud.state].filter(Boolean).join(" ")), inRoom = kw.test(c.roomText || ""), inMsg = kw.test([c.message, ...(c.messagesSeen || [])].join(" ")), inReport = kw.test(c.report ? c.report.text : "");
      a.q2_symptomVsRoot = { answer: inBanner ? "yes" : inRoom ? "room-only" : inMsg ? "message-only" : inReport ? "report-only" : "no", keyword: String(kw), inBannerOrCard: inBanner, inRegionInspect: inRoom, inMessages: inMsg, inReport }; }
    else a.q2_symptomVsRoot = { answer: R && R.blocked ? "n/a (the limiting factor is the root cause at landing)" : "n/a" };
    // q3 · a genuinely helpful action
    if (R) { const shown = (c.wouldHelp || []).map(x => x.id), truthOpen = (c.trulyHelps || []).filter(x => x.opens).map(x => x.id), truthBetter = (c.trulyHelps || []).filter(x => x.better && !x.opens).map(x => x.id);
      const shownHelps = shown.filter(id => truthOpen.includes(id));
      a.q3_helpfulAction = { answer: shown.length && shown.length === shownHelps.length ? "yes" : shown.length && shownHelps.length ? "partly-misleading" : shown.length ? "misleading" : truthBetter.length ? "improves-only (nothing shown)" : truthOpen.length ? "no (a fix exists but is not shown)" : "no",
        wouldHelpShown: shown, trulyOpens: truthOpen, trulyImprovesOnly: truthBetter, wouldHelpNoneText: bn && bn.wouldHelpNone, hintTraits: (c.hintTraits || []).map(h => h && `${h.id}: opens ${h.opens}, better ${h.better}, canBuy ${h.canBuy}, price ${h.price}${h.reason ? ", reason " + h.reason : ""}`) }; }
    else a.q3_helpfulAction = { answer: "n/a", note: "no region; see scenario card / report" };
    // q4 · next step inferable (heuristic)
    const y1 = a.q1_trueCause.answer === "yes", y3 = a.q3_helpfulAction.answer === "yes";
    a.q4_nextStepInferable = { answer: R ? (y1 && y3 ? "likely" : y1 || y3 ? "partial" : "unlikely") : "see note", humanPlaytestNeeded: true };
    c.answers = a;
  }
  // vocabulary: icon + colour + words used by each mechanic
  const V = out.vocabulary, add = (mechanic, state, where, words, icon, colour) => { if (words || icon) V.push({ mechanic, state, where, words: words ? String(words).slice(0, 160) : null, icon: iconName(icon), colour }); };
  for (const [name, c] of Object.entries(out.states)) {
    if (c.banner && c.banner.status) add(c.region.refuge ? "refuge" : /bad/.test(c.banner.status.cls) ? "blocked lamp" : /warn/.test(c.banner.status.cls) ? "strained lamp" : "ok lamp", name, "banner status pill", c.banner.status.word, c.banner.status.icon, c.banner.status.color);
    if (c.banner) for (const k of c.banner.conditions) if (!/st-ok/.test(k.cls)) add(/st-bad/.test(k.cls) ? "blocked lamp" : "strained lamp", name, `condition box ${k.cat}`, k.status, k.icon, k.color);
    if (c.scenarioCard) { add(c.scenarioCard.kind === "pressure" ? "Dying World pressure" : c.scenarioCard.kind === "competition" ? "native competition" : c.scenarioCard.kind === "climate" ? "Volatile Climate" : c.scenarioCard.kind, name, "scenario card header", c.scenarioCard.text.split(" ").slice(0, 8).join(" "), c.scenarioCard.icon, c.scenarioCard.headColor && c.scenarioCard.headColor.color);
      if (c.scenarioCard.warn) add("extinction warning", name, "scenario card warn line", c.scenarioCard.warn.text, null, c.scenarioCard.warn.color);
      if (c.scenarioCard.cond) add("Thin Air completion", name, "scenario card condition", c.scenarioCard.cond.text, c.scenarioCard.cond.icon, c.scenarioCard.cond.color); }
    if (c.log) add(name.startsWith("climate") ? "Volatile Climate" : name.startsWith("native") ? "native competition" : name.startsWith("dying") || name.startsWith("extinction") ? "Dying World pressure" : "log", name, "log line", c.log, c.logIcon, null);
    if (c.report) add("extinction", name, "report heading", c.report.heading + " · " + (c.report.reason || ""), null, null);
    if (c.hud) add("HUD state word", name, "HUD", c.hud.state, null, null);
  }
  // collisions: the same icon or the same colour carrying different mechanics; emoji left in player text
  const byIcon = {}, byColour = {}; for (const v of V) { if (v.icon && v.icon !== "unknown") (byIcon[v.icon] = byIcon[v.icon] || new Set()).add(v.mechanic); if (v.colour) (byColour[v.colour] = byColour[v.colour] || new Set()).add(v.mechanic); }
  for (const [k, s] of Object.entries(byIcon)) if (s.size > 1) out.collisions.push({ kind: "icon", icon: k, mechanics: [...s] });
  for (const [k, s] of Object.entries(byColour)) if (s.size > 1) out.collisions.push({ kind: "text colour", colour: k, mechanics: [...s] });
  const emoji = /\p{Extended_Pictographic}/u; for (const [name, c] of Object.entries(out.states)) for (const t of [c.log, ...(c.messagesSeen || [])]) if (t && emoji.test(t.replace(/^(?:\p{Extended_Pictographic}|[★☁⚠▲▼])️?\s*/u, ""))) out.collisions.push({ kind: "emoji survives stripGlyph in the log line", state: name, text: t.slice(0, 140) });
  out.summary = Object.fromEntries(Object.entries(out.states).map(([n, c]) => [n, { region: c.region && c.region.name, limiting: c.banner && c.banner.limiting, status: c.banner && c.banner.status && c.banner.status.word, lamp: c.region && c.region.lamp,
    q1: c.answers.q1_trueCause.answer, blockedButColonisedUnaided: !!(c.growthProbe && c.growthProbe.colonisedWithoutPurchase && c.region && c.region.blocked), tierProbe: c.tierProbe ? Object.fromEntries(Object.entries(c.tierProbe).map(([k, v]) => [k, Array.isArray(v) ? (v.find(x => x.blocked === false) ? "opens at tier " + v.find(x => x.blocked === false).tier : "does not open (" + (v[v.length - 1].stop || "max probed") + ")") : v])) : undefined, q2: c.answers.q2_symptomVsRoot.answer, q3: c.answers.q3_helpfulAction.answer, q4: c.answers.q4_nextStepInferable.answer, screenshot: c.screenshot }]));
  out.seconds = Math.round((Date.now() - t0) / 1000);
  B.writeJSON("failure-ui.json", out);
  await browser.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
