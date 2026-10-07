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
// BLOOM-029B (additive; api stays 1): four more reads and one action for the production Planet View — surface() (the canonical
// planet-surface source: the planet's own grid, tilemap, region climate offsets, topology, render hints and the sky the ground
// sees now), mapState() (per-tile living / dead / native state and density: what the map's live overlays draw), effects() (the
// page's own transient map feedback: water crossings, threshold / competition outlines, the last Terraform change) and runMenu()
// + actions.runAction(id) (the player / training run menu: the page's own items and its own leave / training path), and
// actions.selectTile(tile) (a physical map click: the page's own selectAt with the real tile). Each is a copy
// of existing truth; none adds a rule. docs/PRODUCTION_PLANET_VIEW_v1.md §6.
//
// BLOOM-029C (additive; api stays 1): upgrade items carry the content's `uiCategory` (presentation only; docs/PRODUCTION_PLANT_ROOMS_v1.md).
//
// BLOOM-029D (additive; api stays 1): upgrade items also carry the content's `uiBank` (presentation only: the Terraform room's
// Soil / Atmosphere side); preview results of a Terraform (sky) trait carry `sky` — the page's own what-if's exact current → preview
// SURFACE sky (Terraform + scenario drift / shock, i.e. what the ground is painted under) — and terraformPreview(id) reads just
// that without showing anything. No Terraform rule is here: the page's computePreview computes it (docs/PRODUCTION_TERRAFORM_ROOM_v1.md).
//
// BLOOM-029E (additive; api stays 1): report() — a plain copy of the page's structured run-end report (winReport / lossReport in
// demos/demo-run.html: coverage, time, identity, the owned Adapt / Spread build and the Terraform steps separately, regions held and given
// up with their limiting factor, colony upgrades, analogs from the trait content, each scenario's final state; null until the run ends) —
// reportActions() (the page's own post-run actions: Keep playing, the player / training actions, Restart this run) and
// actions.reportAction(id) (the page's own continue-after-win / reload / goAction). The production report only displays and delegates.
// Classic script, no dependencies: boots over file:// like every other run-page file.
(function (root) {
  "use strict";

  const API_VERSION = 1;
  // the 028D1 event contract (docs/TRAINING_FOUNDATION_v1.md §7): the adapter listens, it never dispatches
  const EVENTS = ["run-ready", "play-pause", "speed", "region-select", "upgrade-preview", "upgrade-purchase", "growth-focus",
    "local-upgrade", "bubble-collect", "win"];
  const HOST_SHAPE = {
    "": ["sim", "run", "labels", "events", "categories", "boards", "speeds", "scenario", "view", "read", "act", "map"],
    view: ["running", "speed", "selected", "selectedWater", "coverage", "preview", "skyFx", "message", "tilePx", "canvas", "compBar"],
    read: ["skyNow", "catLamp", "isBlocked", "tileCounts", "limitText", "fixHint", "colonyWord", "colonyHint", "colonyTip", "focusUI",
      "specUI", "geoInfo", "compWhy", "pressureStatus", "phaseName", "climForecast", "upgradeState", "offeredOn", "computePreview", "tileAt", "runMenu",
      "report", "reportActions"], // (BLOOM-029E) the structured run-end report and its actions
    act: ["setRunning", "setSpeed", "selectAt", "showPreview", "clearPreview", "buy", "chooseFocus", "buySpec", "collectBubbleAt", "placeBubble", "runAction", "reportAction"],
    map: ["render", "crossings", "crossingTiming", "flashes"], // (BLOOM-029B) the map's render hints and the page's transient map feedback
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
          offsets: plain(P.offsets), max: plain(P.max), next: st.next, nextIn: st.nextIn, extinctionIn: st.extinctionIn,
          phaseMarks: scn.pressure.phases.map(p => p.from) }; } // (029B) where each phase begins on the progress meter
      if (S.comp) { const C = sim.competition, bar = V.compBar();
        out.competition = { share: C.share, startShare: C.startShare, peakShare: C.peakShare, contested: C.contested,
          trend: bar ? bar.trend : null, trendText: bar ? bar.trendText : null, playerLeads: bar ? bar.playerLeads : null, nativeLeads: bar ? bar.nativeLeads : null }; }
      if (S.clim) { const C = sim.climate, axes = {};
        for (const ax of Object.keys(C.axes)) { const X = C.axes[ax];
          axes[ax] = { name: S.axisNames[ax], level: X.level, offset: X.offset,
            shock: X.shock ? { ...plain(X.shock), endsIn: tickSeconds(X.shock.endTick - sim.ticks) } : null,
            pending: X.pending ? { ...plain(X.pending), startsIn: tickSeconds(X.pending.startTick - sim.ticks) } : null }; }
        out.climate = { level: C.level, band: C.band, bandName: S.bands[C.band].name, bandNames: S.bands.map(b => b.name), peak: C.peak, offsets: plain(C.offsets), env: plain(C.env), // (029D) + every band's name, for the preview's band change
          axes, forecast: R.climForecast(), threshold: scn.climateInstability.shocks.threshold }; } // (029B) the shock threshold the meter marks
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
        uiCategory: u.uiCategory || null, // (BLOOM-029C) the content's presentation-only room category; the sim never reads it
        uiBank: u.uiBank || null,         // (BLOOM-029D) the content's presentation-only Terraform bank (Soil / Atmosphere); the sim never reads it
        tier: st.tier, maxTier: e.max !== undefined ? e.max : null, owned: st.tier > 0, price: st.cost,
        rules: st.rules, affordable: sim.biomass >= st.cost, canBuy: st.canBuy, reason: st.why || null, science: u.science || null };
    }
    function upgrades() {
      return host.boards.map(board => ({ board, items: R.offeredOn(board).map(upgradeItem),
        ...(board === "Adapt" ? { tempPoints: { cold: sim.genome.cold, heat: sim.genome.heat, cap: CFG.scales.tempCap } } : {}) }));
    }
    function upgrade(id) { const u = sim.traitById[id]; if (!u) return null; return { ...upgradeItem(u), offered: !!sim.offered(u) }; }
    // (BLOOM-029D) a sky preview's exact current → preview surface sky, as the page's what-if computed it ({ t, m } → { temperature, moisture })
    const skyShape = s => s ? { axis: s.axis, from: s.from, to: s.to, current: { temperature: s.current.t, moisture: s.current.m }, preview: { temperature: s.preview.t, moisture: s.preview.m } } : null;
    const previewShape = d => d ? { gain: ids(d.gain), lose: ids(d.lose), better: ids(d.better), worse: ids(d.worse),
      reachHostile: ids(d.reachHostile), climate: d.climate ? plain(d.climate) : null, sky: skyShape(d.sky) } : null;
    // the real preview calculation, without showing it (no outline, no footer, no event): what a room previews in place
    function previewOf(id) {
      const u = sim.traitById[id]; if (!u) return null; const r = R.computePreview(id), d = previewShape(r.data);
      return { id, board: u.board, name: u.name, available: !!r.data, ...(d || { gain: [], lose: [], better: [], worse: [], reachHostile: [], climate: null }), text: r.text };
    }
    function activePreview() { return previewShape(V.preview()); } // what the main map outlines now (null = no preview)
    // (BLOOM-029D) the exact REAL current → preview surface sky of one Terraform node, from the page's own what-if (the same
    // computePreview the footer and the map use), without showing it. Not a sky trait → null. Not buyable now → previewSurfaceSky
    // equals the current sky (nothing would change) and preview.available is false. No mutation is left behind (the page restores its sky).
    function terraformPreview(id) {
      const u = sim.traitById[id]; if (!u || u.effect.type !== "sky") return null;
      const p = previewOf(id), now = hud().skyNow, cur = { temperature: now.temp, moisture: now.moist };
      return { id, axis: u.effect.axis, available: p.available, currentSurfaceSky: p.sky ? p.sky.current : cur, previewSurfaceSky: p.sky ? p.sky.preview : cur, preview: p };
    }
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

    // ---- (BLOOM-029B) the production map's sources. Copies of existing truth: the planet the sim runs on, its tiles, the page's own
    // transient feedback. Read surface() when the sky changes; mapState() / effects() once per drawn frame.
    const MP = host.map;
    // the canonical planet surface's source (resources/planet-surface/planet-surface.js): the run's planet with the sim's own resolved
    // layout (land regions + tilemap, -1 = water / impassable), its archetype's render hints and the sky its ground sees now (Terraform
    // + scenario drift / shock: the sky the old map drew its ground under). Never regenerated: this is the planet the sim was built on.
    function surface() {
      const P = run.planet, sky = hud().skyNow;
      return { planet: { id: P.id, name: P.name, gridWidth: M.W, gridHeight: M.H, globalClimate: plain(P.globalClimate),
          sections: SEC.map(s => ({ id: s.id, name: s.name, local: { tempOffset: s.local.tempOffset, moistureOffset: s.local.moistureOffset } })),
          tilemap: Array.from(M.TILEMAP), topology: plain(M.topology) },
        render: MP.render ? plain(MP.render) : null,
        sky: { temperature: sky.temp, moisture: sky.moist }, startSky: { temperature: P.globalClimate.temperature, moisture: P.globalClimate.moisture } };
    }
    // per-tile live state (copies): state 0 bare · 1 living · 2 dead; stand density; native density (competition runs, else null);
    // per-region vigor. What the old map's vegetation / dead / native layers drew, tile for tile.
    function mapState() {
      const st = sim.state, out = new Uint8Array(M.N);
      for (let i = 0; i < M.N; i++) out[i] = st[i] === sim.LIV ? 1 : st[i] === sim.DEAD ? 2 : 0;
      return { ticks: sim.ticks, width: M.W, height: M.H, state: out, density: Float32Array.from(sim.dens),
        native: S.comp ? Float32Array.from(sim.competition.native) : null, vigor: Float32Array.from(sim.vigor) };
    }
    // the page's transient map feedback, as it is now: water-crossing animations (engine events; elapsed ms of each), threshold
    // outlines (scenario drift / shocks pushed a region worse or opened it), competition-event outlines, and the last Terraform
    // purchase's effect on the land (for a few seconds). Times are ms left / elapsed on the page's clock (performance.now()).
    function effects() {
      const now = performance.now(), fx = V.skyFx(), fl = MP.flashes(), T = MP.crossingTiming;
      return {
        crossings: MP.crossings().map(a => ({ id: a.id, from: a.from, to: a.to, took: !!a.took, elapsed: now - a.t0 })), crossingTiming: { travel: T.travel, land: T.land },
        thresholds: fl.thresholds.filter(x => now < x.until).map(x => ({ ...ref(x.sec), worse: !!x.worse, left: x.until - now })),
        competition: fl.competition.filter(x => now < x.until).map(x => ({ ...ref(x.sec), type: x.type || null, left: x.until - now })),
        skyChange: fx && now < fx.until ? { axis: fx.axis, text: fx.delta, gain: ids(fx.gain), lose: ids(fx.lose), better: ids(fx.better), worse: ids(fx.worse), left: fx.until - now } : null,
      };
    }
    // the player / training run menu (null in the developer harness): the page's own label and items
    function runMenu() { const m = R.runMenu(); return m ? { label: m.label, items: m.items.map(a => ({ id: a.id, label: a.label, note: a.note || null, primary: !!a.primary })) } : null; }
    // (BLOOM-029E) the run-end report as the page computed it at the win / extinction (a plain copy; null while the run is on) and the
    // page's own post-run actions for it (id, label, note, primary; href only for the player's navigation links — the page navigates)
    function report() { const r = R.report(); return r ? plain(r) : null; }
    function reportActions() { return (R.reportActions() || []).map(a => ({ id: a.id, label: a.label, note: a.note || null, primary: !!a.primary, href: a.href || "" })); }

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
      // (BLOOM-029B) a PHYSICAL map click on canonical tile `tile`: the page's own map-click path, selectAt(tilemap[tile], tile), so the
      // event reports the real tile, a click on the selected region deselects it and a water tile deselects with water:true.
      // (selectRegion above stays the abstract, idempotent selector: tile −1.) Not a map tile → false, nothing happens.
      selectTile(tile) { if (!Number.isInteger(tile) || tile < 0 || tile >= M.N) return false; A.selectAt(M.TILEMAP[tile], tile); return true; },
      preview(id) { if (!sim.traitById[id]) return null; A.showPreview(id); return previewOf(id); }, // shows it: outline + footer + event
      clearPreview() { A.clearPreview(); },
      buy(id) { return !!sim.traitById[id] && A.buy(id) === true; },
      setGrowthFocus(r, mode) { const i = indexOf(r); if (i < 0 || !sim.COLONY_MODES.includes(mode)) return false; return A.chooseFocus(mode, i) === true; },
      buyLocalUpgrade(r, id) { const i = indexOf(r); if (i < 0 || !Object.prototype.hasOwnProperty.call(CFG.colony.specializations, id)) return false; return A.buySpec(id, i) === true; },
      collectBubble(tile) { const k = sim.bubbles.findIndex(b => b.tile === tile); return k >= 0 && A.collectBubbleAt(k) === true; },
      placeBubble(regionId) { return A.placeBubble(regionId); },
      // (BLOOM-029B) a run-menu item: the page's own path (training layer / leave confirmation / navigation); unknown id → false
      runAction(id) { const m = R.runMenu(); if (!m || !m.items.some(a => a.id === id)) return false; return A.runAction(id) !== false; },
      // (BLOOM-029E) a report action: the page's own path (Keep playing = its continue-after-win, Restart this run = its reload, the player /
      // training actions = goAction with its confirm / training-layer fade); unknown or not offered now → false, nothing happens
      reportAction(id) { if (!(R.reportActions() || []).some(a => a.id === id)) return false; return A.reportAction(id) !== false; },
    });

    const adapter = Object.freeze({
      api: API_VERSION, events: Object.freeze(EVENTS.map(t => "bloom:" + t)),
      run: runInfo, hud, scenario, regions, region, selection, upgrades, upgrade, previewOf, activePreview, terraformPreview, wouldHelp, colony, bubbles,
      message: () => V.message(), map, tileAt, surface, mapState, effects, runMenu, report, reportActions, actions,
      subscribe(fn) { if (typeof fn !== "function") throw new TypeError("subscribe needs a function"); listeners.add(fn); return () => { listeners.delete(fn); }; },
      get revision() { return revision; },
    });
    return { adapter, invalidate: reason => invalidate(reason), frame };
  }

  root.BLOOM = Object.assign(root.BLOOM || {}, { runUI: Object.freeze({ createAdapter, API_VERSION, EVENTS: Object.freeze(EVENTS.slice()) }) });
})(typeof window !== "undefined" ? window : globalThis);
