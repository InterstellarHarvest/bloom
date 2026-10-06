// BLOOM — run UI adapter (BLOOM-029A): the production boundary between the REAL run (demos/demo-run.html + resources/bloom-sim.js)
// and the run screen's presentation layer (the Concept 18 rebuild, BLOOM-029B onward). docs/RUN_UI_PRODUCTION_BOUNDARY_v1.md.
//
// THE EXISTING RUN SUPPLIES TRUTH. This file owns no simulation, no rules, no prices and no copy. The run page builds one explicit
// `host` object out of its own live state and its own functions (the same ones its temporary shell uses) and hands it to
// createAdapter. The adapter only:
//   · reads — fresh plain-data snapshots (never live engine arrays), with region references as { index, id, name };
//   · acts  — every action calls the run page's own action function, which changes the one sim, writes the footer, redraws the
//             map and fires the unchanged bloom:* event, exactly as the old shell's buttons do;
//   · notifies — subscribe(fn): one batched change notice per microtask, from the bloom:* events, the page's own invalidations
//             (preview cleared, message, loss, bubble placed …) and a "tick" at most once per animation frame on which the sim ran.
// It draws nothing, touches no DOM, runs no loop and keeps no game state of its own.
//
//   const runUI = BLOOM.runUI.createAdapter(host)   → { adapter, invalidate(reason), frame() }   (the latter two are the page's)
//   window.BLOOM_RUN_UI.adapter                      → the adapter (the run page publishes it before bloom:run-ready)
//
// Classic script, no dependencies: boots over file:// like every other run-page file.
(function (root) {
  "use strict";

  const API_VERSION = 1;
  // the 028D1 event contract (docs/TRAINING_FOUNDATION_v1.md §7): the adapter listens, it never dispatches
  const EVENTS = ["run-ready", "play-pause", "speed", "region-select", "upgrade-preview", "upgrade-purchase", "growth-focus",
    "local-upgrade", "bubble-collect", "win"];
  const HOST_SHAPE = {
    "": ["sim", "run", "labels", "events", "categories", "boards", "speeds", "scenario", "view", "read", "act"],
    view: ["running", "speed", "selected", "selectedWater", "coverage", "preview", "skyFx", "message", "tilePx", "canvas", "compBar"],
    read: ["skyNow", "catLamp", "isBlocked", "tileCounts", "limitText", "fixHint", "colonyWord", "colonyHint", "colonyTip", "focusUI",
      "specUI", "geoInfo", "compWhy", "pressureStatus", "phaseName", "climForecast", "upgradeState", "offeredOn", "computePreview", "tileAt"],
    act: ["setRunning", "setSpeed", "selectAt", "showPreview", "clearPreview", "buy", "chooseFocus", "buySpec", "collectBubbleAt", "placeBubble"],
  };

  // plain-data copy: arrays (and typed arrays) become arrays, objects are copied key by key, functions are dropped
  function plain(x) {
    if (x === null || typeof x !== "object") return typeof x === "function" ? undefined : x;
    if (Array.isArray(x) || ArrayBuffer.isView(x)) return Array.from(x, plain);
    const o = {}; for (const k of Object.keys(x)) { const v = plain(x[k]); if (v !== undefined) o[k] = v; } return o;
  }

  function createAdapter(host) {
    const missing = [];
    for (const [part, keys] of Object.entries(HOST_SHAPE)) { const obj = part ? host && host[part] : host;
      for (const k of keys) if (!obj || obj[k] === undefined) missing.push(part ? `${part}.${k}` : k); }
    if (missing.length) throw new TypeError("BLOOM.runUI.createAdapter: the host is missing " + missing.join(", "));

    const { sim, run, labels: LABEL, view: V, read: R, act: A } = host, S = host.scenario;
    const M = sim.map, SEC = M.SEC, CFG = sim.config;
    const tickSeconds = t => t * CFG.tickMs / 1000;

    // ---- region references (index or id in, { index, id, name } out)
    const indexOf = ref => typeof ref === "number" ? (Number.isInteger(ref) && ref >= 0 && ref < M.SC ? ref : -1)
      : typeof ref === "string" && Object.prototype.hasOwnProperty.call(M.SIDX, ref) ? M.SIDX[ref] : -1;
    const ref = i => i >= 0 ? { index: i, id: SEC[i].id, name: LABEL[i] } : { index: -1, id: null, name: null };
    const ids = list => (list || []).map(i => SEC[i].id);

    // ---- change notices: batched per microtask; "tick" at most once per frame that ran the sim
    const listeners = new Set(); let revision = 0, pending = null, lastTicks = sim.ticks;
    const later = typeof queueMicrotask === "function" ? queueMicrotask : f => Promise.resolve().then(f);
    function flush() {
      const p = pending; pending = null; revision++;
      const change = Object.freeze({ revision, ticks: sim.ticks, reasons: [...p.reasons], events: p.events });
      for (const fn of [...listeners]) { try { fn(change); } catch (err) { console.error("BLOOM run UI subscriber failed:", err); } }
    }
    function invalidate(reason, event) {
      if (!pending) { pending = { reasons: new Set(), events: [] }; later(flush); }
      pending.reasons.add(reason); if (event) pending.events.push(event);
    }
    function frame() { if (sim.ticks !== lastTicks) { lastTicks = sim.ticks; invalidate("tick"); } }
    for (const type of EVENTS) host.events.addEventListener("bloom:" + type, e => invalidate(type, { type, detail: plain(e.detail) }));

    // ---- reads
    function runInfo() {
      return {
        planetId: run.planet.id, planetName: run.planet.name, kind: run.kind,
        archetypeId: run.archetype ? run.archetype.id : null, archetypeName: run.archetype ? run.archetype.name : null,
        seed: run.kind === "procedural" ? run.seed : null,
        scenarioId: S.scn ? S.scn.id : "eden", scenarioName: S.scn ? S.scn.name : "Eden",
        mechanics: { pressure: S.press, competition: S.comp, climate: S.clim },
        training: !!run.training, play: !!run.play, started: !!run.started,
        running: V.running(), speed: V.speed(), speeds: host.speeds.slice(),
        ticks: sim.ticks, seconds: tickSeconds(sim.ticks), tickMs: CFG.tickMs,
        won: !!sim.won, lost: !!sim.lost, lostReason: sim.lostReason || null,
      };
    }
    function hud() {
      const cov = V.coverage(), base = run.planet.globalClimate, now = R.skyNow(), fx = V.skyFx(), t = performance.now();
      return {
        biomass: Math.floor(sim.biomass), biomassExact: sim.biomass,
        biomassRate: sim.ticks ? sim.income * 1000 / CFG.tickMs : null, // per second; none before the first tick (as the HUD)
        coverage: cov, coveragePct: Math.round(cov * 100), winAt: sim.winAt, winPct: Math.round(sim.winAt * 100),
        sky: { temp: sim.sky.temp, moist: sim.sky.moist },                 // the player's (Terraformed) sky
        skyBase: { temp: base.temperature, moist: base.moisture },          // the planet's starting sky
        skyNow: { temp: S.press || S.clim ? now.t : sim.sky.temp, moist: S.press || S.clim ? now.m : sim.sky.moist }, // + scenario drift / shock
        skyAdjusted: S.press || S.clim,
        skyChange: fx && t < fx.until ? { axis: fx.axis, text: fx.delta, until: fx.until } : null, // the last Terraform purchase, for a few s
      };
    }
    function scenario() {
      const scn = S.scn;
      const out = { id: scn ? scn.id : "eden", name: scn ? scn.name : "Eden", title: scn && scn.display ? scn.display.title : null,
        summary: scn && scn.display ? scn.display.summary : null, pressure: null, competition: null, climate: null };
      if (S.press) { const P = sim.pressure, st = R.pressureStatus();
        out.pressure = { phase: P.phase, phaseName: R.phaseName(P.phase), progress: P.progress, seconds: P.seconds,
          offsets: plain(P.offsets), max: plain(P.max), next: st.next, nextIn: st.nextIn, extinctionIn: st.extinctionIn }; }
      if (S.comp) { const C = sim.competition, bar = V.compBar();
        out.competition = { share: C.share, startShare: C.startShare, peakShare: C.peakShare, contested: C.contested,
          trend: bar ? bar.trend : null, trendText: bar ? bar.trendText : null, playerLeads: bar ? bar.playerLeads : null, nativeLeads: bar ? bar.nativeLeads : null }; }
      if (S.clim) { const C = sim.climate, axes = {};
        for (const ax of Object.keys(C.axes)) { const X = C.axes[ax];
          axes[ax] = { name: S.axisNames[ax], level: X.level, offset: X.offset,
            shock: X.shock ? { ...plain(X.shock), endsIn: tickSeconds(X.shock.endTick - sim.ticks) } : null,
            pending: X.pending ? { ...plain(X.pending), startsIn: tickSeconds(X.pending.startTick - sim.ticks) } : null }; }
        out.climate = { level: C.level, band: C.band, bandName: S.bands[C.band].name, peak: C.peak, offsets: plain(C.offsets), env: plain(C.env),
          axes, forecast: R.climForecast() }; }
      return out;
    }
    function regionSummary(i, liv) {
      const s = SEC[i], e = sim.evaluate(i), cs = sim.colonyStatus(i), sel = V.selected();
      return { ...ref(i), biome: s.name, isOrigin: !!s.isOrigin, selected: i === sel, landmass: M.LANDMASS[i], area: M.AREA[i],
        center: { x: M.CENT[i].x, y: M.CENT[i].y }, living: liv[i], fitness: e.fitness, lamp: sim.lampOf(e.fitness),
        blocked: R.isBlocked(e), limitKey: e.limitKey, colony: { word: cs.word, establishment: cs.establishment },
        focus: sim.getColonyFocus(i), localUpgrade: sim.getSpecialization(i) };
    }
    function regions() { const liv = sim.livingCountBySection(); return SEC.map((_, i) => regionSummary(i, liv)); }
    function region(r) {
      const i = indexOf(r); if (i < 0) return null;
      const s = SEC[i], L = s.local, e = sim.evaluate(i), liv = sim.livingCountBySection(), dv = sim.derived(), cs = sim.colonyStatus(i), tc = R.tileCounts(i);
      const blocked = R.isBlocked(e), c = S.comp ? sim.competitionAt(i) : null;
      return {
        ...regionSummary(i, liv), geothermal: !!s.geothermal,
        conditions: host.categories.map(k => { const C = e.cats[k];
          return { key: k, word: C.word, f: C.f, lamp: R.catLamp(C), soft: !!C.soft, terraformable: !!e.terraformable[k] }; }),
        limiting: { key: e.limitKey, f: e.limitF, blocked, text: blocked ? R.limitText(e) : null, hint: blocked ? R.fixHint(e) : null,
          softSoil: !blocked && !!e.cats.Soil.soft },
        temperature: { ground: e.effT, sky: e.skyT, plantMin: dv.tempFloor, plantMax: dv.tempCeil },
        colony: { word: cs.word, label: R.colonyWord(cs.word), hint: R.colonyHint(cs.word), establishment: cs.establishment },
        vitals: { vigor: sim.vigor[i], living: liv[i], dead: tc.dead, barren: tc.barr, native: S.comp ? tc.natv : null, area: M.AREA[i] },
        raw: { effectiveTemp: e.effT, effectiveMoist: e.effM, light: L.light, ph: L.ph, salinity: L.salinity, nutrients: L.nutrients,
          toxicity: L.toxicity, radiation: L.radiation, effectiveRadiation: e.effRad },
        geo: plain(R.geoInfo(i)),
        pressure: S.press ? { started: sim.pressure.progress > 0, offsets: plain(sim.pressure.offsets) } : null,
        competition: c ? { ...plain(c), why: R.compWhy(i, c) } : null,
      };
    }
    function selection() { const i = V.selected(); return { ...ref(i), water: i < 0 && V.selectedWater() }; }
    function upgradeItem(u) {
      const st = R.upgradeState(u), e = u.effect;
      return { id: u.id, board: u.board, name: u.name, short: u.short || null, sub: u.sub || null, effect: e.type, axis: e.axis || null,
        tier: st.tier, maxTier: e.max !== undefined ? e.max : null, owned: st.tier > 0, price: st.cost,
        rules: st.rules, affordable: sim.biomass >= st.cost, canBuy: st.canBuy, reason: st.why || null, science: u.science || null };
    }
    function upgrades() {
      return host.boards.map(board => ({ board, items: R.offeredOn(board).map(upgradeItem),
        ...(board === "Adapt" ? { tempPoints: { cold: sim.genome.cold, heat: sim.genome.heat, cap: CFG.scales.tempCap } } : {}) }));
    }
    function upgrade(id) { const u = sim.traitById[id]; if (!u) return null; return { ...upgradeItem(u), offered: !!sim.offered(u) }; }
    const previewShape = d => d ? { gain: ids(d.gain), lose: ids(d.lose), better: ids(d.better), worse: ids(d.worse),
      reachHostile: ids(d.reachHostile), climate: d.climate ? plain(d.climate) : null } : null;
    // the real preview calculation, without showing it (no outline, no footer, no event): what a room previews in place
    function previewOf(id) {
      const u = sim.traitById[id]; if (!u) return null; const r = R.computePreview(id), d = previewShape(r.data);
      return { id, board: u.board, name: u.name, available: !!r.data, ...(d || { gain: [], lose: [], better: [], worse: [], reachHostile: [], climate: null }), text: r.text };
    }
    function activePreview() { return previewShape(V.preview()); } // what the main map outlines now (null = no preview)
    // offered upgrades whose real preview opens this region now (the rules must allow buying it; affordability is not required)
    function wouldHelp(r) {
      const i = indexOf(r); if (i < 0) return null; const out = [];
      for (const board of host.boards) for (const u of R.offeredOn(board)) { const d = R.computePreview(u.id).data;
        if (d && d.gain.includes(i)) out.push({ id: u.id, board: u.board, name: u.name }); }
      return out;
    }
    function colony(r) {
      const i = indexOf(r); if (i < 0) return null;
      const living = sim.livingCountBySection()[i] > 0, focus = sim.getColonyFocus(i), spec = sim.getSpecialization(i), F = R.focusUI, SP = R.specUI;
      const specs = CFG.colony.specializations;
      return {
        ...ref(i), living, focus, synergy: CFG.colony.synergy,
        focusChoices: sim.COLONY_MODES.map(m => ({ id: m, name: F[m].name, icon: F[m].icon, summary: F[m].sub, description: F[m].what,
          selected: m === focus, available: living })),
        localUpgrade: spec, localUpgradeName: spec ? specs[spec].name : null, localPrice: sim.specPrice(),
        localChoices: Object.keys(SP).map(id => { const block = sim.specBlock(i, id);
          return { id, name: specs[id].name, mode: specs[id].mode, summary: SP[id].sub, description: SP[id].what, block, available: !block }; }),
        tip: living ? R.colonyTip(i) : "",
      };
    }
    function bubbles() { return sim.bubbles.map(b => ({ tile: b.tile, x: b.x, y: b.y, age: b.life, region: ref(M.TILEMAP[b.tile]) })); }
    function map() {
      return { width: M.W, height: M.H, tilePx: V.tilePx(), topology: plain(M.topology), canvas: V.canvas,
        regions: SEC.map((_, i) => ({ ...ref(i), landmass: M.LANDMASS[i], center: { x: M.CENT[i].x, y: M.CENT[i].y } })),
        tilemap: Array.from(M.TILEMAP) }; // tile → region index (−1 = water)
    }
    function tileAt(clientX, clientY) { const t = R.tileAt(clientX, clientY); return { tile: t.tile, region: t.sec, id: t.sec >= 0 ? SEC[t.sec].id : null }; }

    // ---- actions: the run page's own functions (each fires its bloom:* event itself)
    const actions = Object.freeze({
      setRunning(on) { on = !!on; if (on !== V.running()) A.setRunning(on); return V.running(); },
      play() { return actions.setRunning(true); },
      pause() { return actions.setRunning(false); },
      togglePlay() { A.setRunning(!V.running()); return V.running(); },
      setSpeed(n) { if (!host.speeds.includes(n)) return false; if (n !== V.speed()) A.setSpeed(n); return V.speed(); },
      cycleSpeed() { const sp = host.speeds, k = sp.indexOf(V.speed()); A.setSpeed(sp[(k + 1) % sp.length]); return V.speed(); },
      // select a region (idempotent: the selected region stays selected); the event's tile is −1 (not a map click)
      selectRegion(r) { const i = indexOf(r); if (i < 0) return false; if (i !== V.selected()) A.selectAt(i, -1); return true; },
      deselect() { if (V.selected() < 0 && !V.selectedWater()) return false; A.selectAt(-2, -1); return true; },
      preview(id) { if (!sim.traitById[id]) return null; A.showPreview(id); return previewOf(id); }, // shows it: outline + footer + event
      clearPreview() { A.clearPreview(); },
      buy(id) { return !!sim.traitById[id] && A.buy(id) === true; },
      setGrowthFocus(r, mode) { const i = indexOf(r); if (i < 0 || !sim.COLONY_MODES.includes(mode)) return false; return A.chooseFocus(mode, i) === true; },
      buyLocalUpgrade(r, id) { const i = indexOf(r); if (i < 0 || !Object.prototype.hasOwnProperty.call(CFG.colony.specializations, id)) return false; return A.buySpec(id, i) === true; },
      collectBubble(tile) { const k = sim.bubbles.findIndex(b => b.tile === tile); return k >= 0 && A.collectBubbleAt(k) === true; },
      placeBubble(regionId) { return A.placeBubble(regionId); },
    });

    const adapter = Object.freeze({
      api: API_VERSION, events: Object.freeze(EVENTS.map(t => "bloom:" + t)),
      run: runInfo, hud, scenario, regions, region, selection, upgrades, upgrade, previewOf, activePreview, wouldHelp, colony, bubbles,
      message: () => V.message(), map, tileAt, actions,
      subscribe(fn) { if (typeof fn !== "function") throw new TypeError("subscribe needs a function"); listeners.add(fn); return () => { listeners.delete(fn); }; },
      get revision() { return revision; },
    });
    return { adapter, invalidate: reason => invalidate(reason), frame };
  }

  root.BLOOM = Object.assign(root.BLOOM || {}, { runUI: Object.freeze({ createAdapter, API_VERSION, EVENTS: Object.freeze(EVENTS.slice()) }) });
})(typeof window !== "undefined" ? window : globalThis);
