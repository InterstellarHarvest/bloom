// BLOOM — production Planet View (BLOOM-029B, Concept 18). docs/PRODUCTION_PLANET_VIEW_v1.md.
//
// The run screen's home: a stable, dominant full-width map (resources/run-ui/run-map-renderer.js over the canonical planet
// surface), a centred HUD (status: coverage + win threshold, Biomass, sky; Explore / Change tools; Pause, 1× / 2× / 4×, run
// menu), the Map View popover (Plants / Normal · Temperature · Water · Soil · Hazard), the selected-region banner (real region,
// colony, limiting factor, four category condition boxes, "Would help" from adapter.wouldHelp), a compact scenario status card
// and the run's message line.
//
// PRESENTATION ONLY. It reads the run through window.BLOOM_RUN_UI.adapter and acts only through adapter.actions (each fires its
// unchanged bloom:* event); it reads no page global, owns no rule, price or simulation, and imports no Concept 18 mockup file or
// data. The rooms (Region Inspect, Adapt, Spread, Terraform) are NOT built here: their buttons go through one navigation seam
// (rooms.register / openRoom) that 029C / 029D fill; until then a request says so (migration build only).
//
//   const pv = BLOOM.planetView.mount(adapter, { root: document.body })   → the instance (also BLOOM.planetView.instance)
//
// Migration (029B): demos/demo-run.html mounts it only with &ui=18, over the same run as the temporary shell, which it hides.
// Classic script, no dependencies besides BLOOM.surface and BLOOM.runMap: boots over file://.
(function (root) {
  "use strict";
  // ---- the production icon family (24×24 strokes, inline SVG; never emoji)
  const I = {
    regions: '<rect x="3" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5"/>',
    mapview: '<path d="M3 8l9-4 9 4-9 4z"/><path d="M3 12l9 4 9-4"/><path d="M3 16l9 4 9-4"/>',
    inspect: '<path d="M12 21s-6-5.3-6-10a6 6 0 0 1 12 0c0 4.7-6 10-6 10z"/><circle cx="12" cy="11" r="2.2"/>',
    adapt: '<path d="M5 19C5 10 10 5 20 4c0 10-5 15-14 15z"/><path d="M5 19l9-9"/>',
    spread: '<circle cx="12" cy="12" r="2.4"/><path d="M12 9.4V3.5M9.6 6l2.4-2.5L14.4 6"/><path d="M14.1 13.2l5 3.6M15.9 19.2l3.2-2.4-.5-4"/><path d="M9.9 13.2l-5 3.6M8.1 19.2l-3.2-2.4.5-4"/>',
    terraform: '<circle cx="12" cy="12" r="6.2"/><path d="M2.5 10.2c6.5 4.2 12.5 4.2 19 0M2.5 13.8c6.5-4.2 12.5-4.2 19 0" opacity=".9"/>',
    pause: '<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>',
    play: '<path d="M7.5 5l11 7-11 7z"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    temp: '<path d="M10 4a2 2 0 0 1 4 0v9.5a4 4 0 1 1-4 0z"/><circle cx="12" cy="17" r="1.6"/>',
    water: '<path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z"/>',
    soil: '<path d="M3 14h18M3 18h18"/><circle cx="8" cy="9" r="1.3"/><circle cx="14" cy="7" r="1.3"/><circle cx="17" cy="11" r="1.3"/>',
    hazard: '<path d="M12 4l9 16H3z"/><path d="M12 10v4"/><circle cx="12" cy="17" r=".9"/>',
    off: '<circle cx="12" cy="12" r="8"/><path d="M6.5 6.5l11 11"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7"/>', alert: '<path d="M12 5v9"/><circle cx="12" cy="18" r="1"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>',
    sky: '<path d="M7 17a4 4 0 0 1-.5-8A6 6 0 0 1 18 9a3.5 3.5 0 0 1 0 8z"/>',
    star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.25 4.15 1 5.85L12 16.9l-5.25 2.8 1-5.85L3.5 9.7l5.9-.9z"/>',
    pressure: '<path d="M4 8c3-2 5 2 8 0s5-2 8 0M4 12c3-2 5 2 8 0s5-2 8 0M4 16c3-2 5 2 8 0s5-2 8 0"/>',
    competition: '<path d="M12 21V9"/><path d="M12 9c-3 0-5-3-5-6 3 0 5 2 5 6zM12 12c0-4 2-6 5-6 0 3-2 6-5 6z"/><path d="M4 21l4-4M20 21l-4-4"/>',
    climate: '<path d="M3 8h10a2.5 2.5 0 1 0-2.5-2.5M3 12h15a2.5 2.5 0 1 1-2.5 2.5M3 16h8a2.5 2.5 0 1 1-2.5 2.5"/>',
    chevron: '<path d="M6 9l6 6 6-6"/>', up: '<path d="M12 19V5M6 11l6-6 6 6"/>', down: '<path d="M12 5v14M6 13l6 6 6-6"/>', flat: '<path d="M5 12h14"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><circle cx="12" cy="7.6" r=".9"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    cold: '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9"/><path d="M10 4l2 2 2-2M10 20l2-2 2 2"/>',
    heat: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  };
  const ico = (n, cls) => `<svg class="ic${cls ? " " + cls : ""}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${I[n] || I.info}</svg>`;
  const esc = t => String(t == null ? "" : t).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const CATS = ["Temperature", "Water", "Soil", "Hazard"], CAT_ICON = { Temperature: "temp", Water: "water", Soil: "soil", Hazard: "hazard" };
  const LENSES = [["", "Plants / Normal", "off"], ["Temperature", "Temperature", "temp"], ["Water", "Water", "water"], ["Soil", "Soil", "soil"], ["Hazard", "Hazard", "hazard"]];
  const LAMP_ST = { green: "ok", yellow: "warn", red: "bad" }, ST_WORD = { ok: "OK", warn: "Strained", bad: "Blocked" }, ST_ICON = { ok: "check", warn: "alert", bad: "x" };
  const BOARD_CLASS = { Adapt: "plant", Spread: "spread", Terraform: "planet" }, BOARD_ROOM = { Adapt: "adapt", Spread: "spread", Terraform: "terraform" };
  const ROOM_TITLE = { region: "Region Inspect", adapt: "Adapt", spread: "Spread", terraform: "Terraform" }, ROOM_MILESTONE = { region: "029C", adapt: "029C", spread: "029C", terraform: "029D" };
  const SHOCK_TINT = { tempUp: [255, 130, 60], tempDown: [110, 170, 255], moistUp: [70, 200, 200], moistDown: [230, 190, 110] };
  const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  const mmss = s => { s = Math.max(0, Math.round(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
  const sgn = (v, d = 1) => { const r = +(+v).toFixed(d); return (r > 0 ? "+" : r < 0 ? "−" : "±") + Math.abs(r); };
  const degC = t => `${Math.round(t) < 0 ? "−" : ""}${Math.abs(Math.round(t))} °C`;
  // the page's messages are its copy (kept as they are); a leading pictograph is shown as the production icon instead
  const stripGlyph = m => String(m || "").replace(/^(?:\p{Extended_Pictographic}|[★☁⚠▲▼])️?\s*/u, "");

  let instance = null;
  function mount(A, { root: host = document.body } = {}) {
    if (instance) return instance;
    if (!A || A.api !== 1 || typeof A.surface !== "function") throw new TypeError("BLOOM.planetView: needs the run UI adapter (api 1, with the 029B reads)");
    const S = root.BLOOM.surface, RM = root.BLOOM.runMap;
    const RUN = A.run(), MENU = A.runMenu(), mq = root.matchMedia ? root.matchMedia("(prefers-reduced-motion: reduce)") : null;
    const reduced = () => !!(mq && mq.matches) || document.documentElement.classList.contains("reduce-motion");
    const state = { lens: null, lensPv: null, hover: -1, focus: -1, helpPreview: null, lensOpen: false, menuOpen: false, scnOpen: false, toastTimer: 0 };
    const MAP0 = A.map(), IDX = {}; MAP0.regions.forEach(r => { IDX[r.id] = r.index; });
    const idx = list => (list || []).map(id => IDX[id]).filter(i => i >= 0);

    // ---------------------------------------------------------------- DOM
    document.documentElement.classList.add("ui18");
    const el = document.createElement("div"); el.className = "pv"; el.id = "pv"; el.dataset.ui = "18";
    const kindLine = RUN.training ? "Training" : [RUN.kind === "procedural" ? RUN.archetypeName : null, RUN.scenarioId !== "eden" ? RUN.scenarioName : null].filter(Boolean).join(" · ") || "Authored world";
    const tool = (id, label, extra = "") => `<button type="button" class="pv-tool" data-tool="${id}" aria-pressed="false"${extra}>${ico(id === "region" ? "regions" : id)}<span class="tn">${label}</span></button>`;
    el.innerHTML =
      `<header class="pv-hud" id="pvHud">` +
        `<div class="pv-id"><b id="pvName">${esc(RUN.planetName)}</b><small>${esc(kindLine)}<span class="pv-dev" title="BLOOM-029B migration path (&amp;ui=18)">UI 18</span></small></div>` +
        `<div class="pv-c">` +
          `<div class="pv-status" role="group" aria-label="Run status">` +
            `<div class="pv-cov" data-tutorial="coverage"><div class="row"><span class="pv-dot" aria-hidden="true"></span><span class="pv-state" id="pvState">GROWING</span></div>` +
              `<div class="row"><b id="pvCov">0%</b><span class="goal" id="pvGoal"></span></div>` +
              `<div class="pv-meter" aria-hidden="true"><i id="pvCovFill"></i><em id="pvCovWin"></em></div></div>` +
            `<div class="pv-bio" data-tutorial="biomass" title="Biomass: the energy your plant has stored. Spend it on upgrades."><span class="pv-coin" aria-hidden="true"></span><div><b id="pvBio">0</b><small id="pvRate"></small></div></div>` +
            `<div class="pv-sky" data-tutorial="sky">${ico("sky")}<div><small>Sky</small><b id="pvSky"></b></div><span class="pv-skyd" id="pvSkyD"></span></div>` +
          `</div>` +
          `<nav class="pv-tools" aria-label="Tools">` +
            `<div class="pv-tg"><small>Explore</small><div class="pv-tt">${tool("region", "Regions")}${tool("mapview", "Map View", ' aria-haspopup="true" aria-expanded="false" aria-controls="pvLens" data-tutorial="map-view"')}</div></div>` +
            `<div class="pv-tg"><small>Change</small><div class="pv-tt">${tool("adapt", "Adapt")}${tool("spread", "Spread")}${tool("terraform", "Terraform")}</div></div>` +
          `</nav>` +
        `</div>` +
        `<div class="pv-clock" role="group" aria-label="Pause, speed and menu">` +
          `<button type="button" class="pv-ck" id="pvPause" data-tutorial="play-pause"></button>` +
          `<button type="button" class="pv-ck" id="pvSpeed" data-tutorial="speed"></button>` +
          (MENU ? `<button type="button" class="pv-ck menu" id="pvMenuBtn" data-tutorial="run-menu" aria-haspopup="true" aria-expanded="false" aria-controls="pvMenu">${ico("menu")}<span class="tn">${esc(MENU.label)}</span></button>` : "") +
        `</div>` +
      `</header>` +
      `<main class="pv-stage" id="pvStage">` +
        `<canvas class="pv-map" id="pvMap" data-tutorial="map" tabindex="0" role="application" aria-roledescription="planet map" aria-describedby="pvMapHelp"></canvas>` +
        `<span class="sr-only" id="pvMapHelp">Click or tap a region to select it, water to clear the selection. With the keyboard: arrow keys move between regions, Enter selects, Escape clears.</span>` +
        `<section class="pv-scn" id="pvScn" data-tutorial="scenario-status" hidden aria-live="off"></section>` +
        `<div class="pv-legend" id="pvLegend" hidden></div>` +
        `<aside class="pv-banner" id="pvBanner" data-tutorial="inspect" hidden aria-label="Selected region"></aside>` +
        `<div class="pv-toast" id="pvToast" role="status" hidden></div>` +
      `</main>` +
      `<footer class="pv-foot"><span class="pv-log" id="pvLog" data-tutorial="message-log" aria-live="polite"></span><span class="pv-runid" id="pvRunId"></span></footer>` +
      `<div class="pv-pop pv-lens" id="pvLens" role="group" aria-label="Map View" hidden><span class="lk">Map View</span>` +
        LENSES.map(([k, name, ic]) => `<button type="button" class="pv-lb" data-lens="${k}" aria-pressed="${k === ""}">${ico(ic)}<span>${name}</span></button>`).join("") + `</div>` +
      (MENU ? `<div class="pv-pop pv-menu" id="pvMenu" role="menu" aria-label="${esc(MENU.label)}" hidden>` +
        MENU.items.map(a => `<button type="button" role="menuitem" class="pv-lb${a.primary ? " primary" : ""}" data-act="${esc(a.id)}" data-tutorial="action-${esc(a.id)}"><b>${esc(a.label)}</b>${a.note ? `<small>${esc(a.note)}</small>` : ""}</button>`).join("") + `</div>` : "") +
      `<div class="sr-only" id="pvLive" role="status" aria-live="polite"></div>`;
    // the anchors this view re-homes: the hidden shell's copies are renamed so every name resolves to ONE (production) element
    // (the shell re-renders its inspect panel, so this runs again whenever an anchor reappears there; the shell keeps every other
    // anchor — growth focus, local upgrades, boards, upgrades, report — until the rooms that show them exist: 029C / 029D)
    const REHOMED = ["biomass", "coverage", "sky", "play-pause", "speed", "run-menu", "map", "message-log", "inspect", "readout", "limiting-factor", "colony-status"];
    const rehome = () => {
      for (const n of REHOMED) document.querySelectorAll(`[data-tutorial="${n}"]`).forEach(e => { if (!el.contains(e)) { e.setAttribute("data-tutorial-legacy", n); e.removeAttribute("data-tutorial"); } });
      if (MENU) document.querySelectorAll('#playMenu [data-tutorial^="action-"]').forEach(e => { e.setAttribute("data-tutorial-legacy", e.dataset.tutorial); e.removeAttribute("data-tutorial"); });
    };
    host.appendChild(el); rehome();
    let rehomeQueued = false;
    const anchorWatch = new MutationObserver(() => { if (rehomeQueued) return; rehomeQueued = true; queueMicrotask(() => { rehomeQueued = false; rehome(); }); });
    anchorWatch.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["data-tutorial"] });
    const $ = id => el.querySelector("#" + id);
    const canvas = $("pvMap"), stage = $("pvStage"), banner = $("pvBanner"), lensPop = $("pvLens"), menuPop = $("pvMenu"), scn = $("pvScn");
    const mapviewBtn = el.querySelector('[data-tool="mapview"]'), menuBtn = $("pvMenuBtn");
    const live = m => { $("pvLive").textContent = m; };
    if (reduced()) el.classList.add("reduced");

    // ---------------------------------------------------------------- the map
    const R = RM.createRenderer(canvas, { surface: S, reducedMotion: reduced, onInvalidate: () => { dirty = true; } });
    R.setSource(A.surface());
    let lastSkyKey = "";
    const relayout = () => { const r = stage.getBoundingClientRect(); R.layout({ width: r.width, height: r.height, dpr: Math.max(1, Math.min(2, root.devicePixelRatio || 1)) }); dirty = true; };

    // ---------------------------------------------------------------- reads (pull, on adapter notices; heavier ones throttled)
    let regs = A.regions(), regsAt = 0, conds = null, condsAt = 0, helpFor = -1, help = [], helpAt = 0, dirty = true;
    const now = () => performance.now();
    function readRegions(force) { if (force || now() - regsAt > 250) { regs = A.regions(); regsAt = now(); dirty = true; } }
    // real condition lamps for every region (Map View layers): region(i).conditions — the same read the banner shows
    function readConds(force) { if (!force && conds && now() - condsAt < 400) return conds; conds = regs.map(r => A.region(r.index).conditions); condsAt = now(); return conds; }
    function layerLamps(key) { const C = readConds(); return C.map(cs => { const c = cs.find(x => x.key === key); return c ? c.lamp : "green"; }); }

    // ---------------------------------------------------------------- HUD
    const hudEls = { bio: $("pvBio"), rate: $("pvRate"), cov: $("pvCov"), goal: $("pvGoal"), fill: $("pvCovFill"), win: $("pvCovWin"), sky: $("pvSky"), skyd: $("pvSkyD"), state: $("pvState") };
    let bioShown = null, bioFxUntil = 0;
    function paintHud() {
      const h = A.hud(), r = A.run(), bioBox = el.querySelector(".pv-bio"), t = now();
      if (bioShown !== null && h.biomass !== bioShown && t > bioFxUntil - 400) { const d = h.biomass - bioShown;
        if (d >= 5 || d < 0) { bioBox.classList.remove("up", "down"); bioBox.classList.add(d > 0 ? "up" : "down"); bioFxUntil = t + 650;
          if (d < 0 && !reduced()) { const s = document.createElement("span"); s.className = "pv-spend"; s.textContent = "−" + (-d); bioBox.appendChild(s); setTimeout(() => s.remove(), 1100); } } }
      if (t > bioFxUntil) bioBox.classList.remove("up", "down");
      bioShown = h.biomass;
      hudEls.bio.textContent = h.biomass; hudEls.rate.textContent = h.biomassRate === null ? "Biomass" : `+${h.biomassRate.toFixed(1)} / s`;
      hudEls.cov.textContent = `${(h.coverage * 100).toFixed(1)}%`; hudEls.goal.textContent = `of land · goal ${h.winPct}%`;
      hudEls.fill.style.width = Math.min(100, h.coverage / Math.max(h.winAt, 1e-6) * 100) + "%"; hudEls.win.style.left = "100%";
      el.querySelector(".pv-cov").setAttribute("aria-label", `Coverage ${(h.coverage * 100).toFixed(1)} percent of land; the planet blooms at ${h.winPct} percent`);
      const sk = h.skyNow; hudEls.sky.textContent = `${degC(sk.temp)} · ${Math.round(sk.moist)}% moist`;
      hudEls.skyd.textContent = h.skyChange ? stripGlyph(h.skyChange.text).replace(/^[▲▼]\s*/, "") : "";
      el.querySelector(".pv-sky").setAttribute("aria-label", `Sky ${degC(sk.temp)}, moisture ${Math.round(sk.moist)}${h.skyChange ? ", just changed " + h.skyChange.text : ""}`);
      const st = r.won ? "won" : r.lost ? "lost" : r.running ? "running" : "paused";
      el.dataset.state = st; hudEls.state.textContent = { won: "BLOOMED", lost: "EXTINCT", running: "GROWING", paused: "PAUSED" }[st];
      const pb = $("pvPause"); pb.innerHTML = ico(r.running ? "pause" : "play"); pb.setAttribute("aria-pressed", String(!r.running)); pb.setAttribute("aria-label", r.running ? "Pause" : "Resume"); pb.title = r.running ? "Pause" : "Resume";
      const sp = $("pvSpeed"); sp.textContent = r.speed + "×"; sp.setAttribute("aria-label", `Speed ${r.speed} times. Press to cycle 1, 2, 4`); sp.title = "Speed: 1× → 2× → 4×";
      const name = r.kind === "procedural" ? `${r.archetypeName} · ${r.play ? "World Seed" : "seed"} ${r.seed}` : r.planetName;
      $("pvRunId").textContent = [r.training ? "Training" : null, name, r.scenarioId !== "eden" ? r.scenarioName : null].filter(Boolean).join(" · ");
    }
    function paintLog() { const m = stripGlyph(A.message()); const L = $("pvLog"); if (L.dataset.m !== m) { L.dataset.m = m; L.innerHTML = ico("info") + esc(m); } }

    // ---------------------------------------------------------------- scenario status (compact; every live value on "Details")
    let scnKey = "", scnPhase = null, scnShock = "", scnComp = 0;
    function paintScenario() {
      const sc = A.scenario(), h = A.hud();
      if (!sc.pressure && !sc.competition && !sc.climate) { scn.hidden = true; return; }
      scn.hidden = false;
      let kind, icon, meter = 0, marks = [], line = "", line2 = "", warn = "", details = [];
      const skyLine = `Sky <b>${degC(h.skyBase.temp)} → ${degC(h.skyNow.temp)}</b> · moisture <b>${Math.round(h.skyBase.moist)} → ${Math.round(h.skyNow.moist)}</b> (start → now)`;
      if (sc.pressure) { const P = sc.pressure; kind = "pressure"; icon = "pressure"; meter = P.progress; marks = P.phaseMarks || [];
        line = `${P.phaseName} · ${Math.round(P.progress * 100)}% lost`; line2 = cap(P.next);
        if (P.extinctionIn !== null) warn = `No living plants left. Extinction in ${mmss(P.extinctionIn)}`;
        details.push(`Drift now: temperature <b>${sgn(P.offsets.temp)} °C</b> · moisture <b>${sgn(P.offsets.moist)}</b> · radiation <b>${sgn(P.offsets.rad)}</b>`, skyLine);
        if (scnPhase !== null && P.phase !== scnPhase) pulse(); scnPhase = P.phase; }
      if (sc.competition) { const C = sc.competition; kind = kind || "competition"; icon = icon || "competition";
        const tr = C.trend || "flat", tw = stripGlyph(C.trendText || "steady").replace(/^[▲▼]\s*/, "");
        const cl = `Native plants hold <b>${Math.round(C.share * 100)}%</b> <span class="trend ${tr}">${ico(tr === "up" ? "up" : tr === "dn" ? "down" : "flat")}${esc(tw)}</span>`;
        const c2 = C.contested ? `${C.contested} contested · you lead ${C.playerLeads || 0} · natives lead ${C.nativeLeads || 0}` : "No contested regions";
        if (!sc.pressure) { meter = C.share; line = cl; line2 = c2; } else details.push(cl, c2);
        details.push(`Native share: start <b>${Math.round(C.startShare * 100)}%</b> · peak <b>${Math.round(C.peakShare * 100)}%</b>`);
        const n = A.effects().competition.length; if (n > scnComp) pulse(); scnComp = n; }
      if (sc.climate) { const C = sc.climate; kind = kind || "climate"; icon = icon || "climate";
        const axes = Object.entries(C.axes), shock = axes.find(([, X]) => X.shock), pend = axes.find(([, X]) => X.pending);
        const cl = `Instability <b>${Math.round(C.level * 100)}%</b> · ${esc(C.bandName)}`;
        const c2 = shock ? `${esc(shock[1].shock.name)}: ${esc(shock[1].name)} ${sgn(shock[1].offset)}${shock[0] === "temp" ? " °C" : ""} · ends in ${mmss(shock[1].shock.endsIn)}`
          : pend ? `${esc(pend[1].pending.name)} coming: ${esc(pend[1].name)} in ${mmss(pend[1].pending.startsIn)}` : esc(stripGlyph(C.forecast));
        if (!sc.pressure && !sc.competition) { meter = C.level; marks = [C.threshold]; line = cl; line2 = c2; } else details.push(cl, c2);
        details.push(`Each axis: ${axes.map(([, X]) => `${esc(X.name)} <b>${Math.round(X.level * 100)}%</b>`).join(" · ")} · shock above <b>${Math.round(C.threshold * 100)}%</b>`);
        if (shock || pend) details.push(esc(stripGlyph(C.forecast)));
        if (!sc.pressure) details.push(skyLine);
        const sk = shock ? "s" + shock[0] : pend ? "p" + pend[0] : ""; if (sk && sk !== scnShock) pulse(); scnShock = sk; }
      const key = [kind, line, line2, warn, details.join("|"), Math.round(meter * 400), state.scnOpen].join("¦"); if (key === scnKey) return; scnKey = key;
      scn.dataset.kind = kind;
      scn.innerHTML = `<div class="sh">${ico(icon)}<b>${esc(sc.name)}</b><button type="button" class="more" aria-expanded="${state.scnOpen}" aria-controls="pvScnD">Details${ico("chevron")}</button></div>` +
        `<div class="sm" role="meter" aria-label="${esc(sc.name)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(meter * 100)}"><i style="width:${Math.min(100, meter * 100).toFixed(1)}%"></i>${marks.filter(m => m > 0 && m < 1).map(m => `<em style="left:${(m * 100).toFixed(1)}%"></em>`).join("")}</div>` +
        `<div class="sl">${line}</div>${line2 ? `<div class="sl2">${line2}</div>` : ""}${warn ? `<div class="warn">${esc(warn)}</div>` : ""}` +
        `<div class="sd" id="pvScnD"${state.scnOpen ? "" : " hidden"}>${details.map(d => `<div>${d}</div>`).join("")}</div>`;
    }
    function pulse() { if (reduced()) return; scn.classList.add("pulse"); setTimeout(() => scn.classList.remove("pulse"), 1800); }
    scn.addEventListener("click", e => { if (e.target.closest(".more")) { state.scnOpen = !state.scnOpen; scnKey = ""; paintScenario(); } });

    // ---------------------------------------------------------------- selected-region banner (real region, colony, limiting factor)
    let bannerKey = "";
    function paintBanner(force) {
      const sel = A.selection();
      if (sel.index < 0) { if (!banner.hidden) { banner.hidden = true; bannerKey = ""; } helpFor = -1; return; }
      const r = A.region(sel.index), t = now();
      if (force || helpFor !== sel.index || t - helpAt > 1000) { help = A.wouldHelp(sel.index) || []; helpFor = sel.index; helpAt = t; }
      const st = r.limiting.blocked ? "bad" : LAMP_ST[r.lamp] || "ok";
      const conds = r.conditions.map(c => { const s = LAMP_ST[c.lamp] || "ok";
        const reading = cap(c.word) + (c.key === "Temperature" ? ` · ${degC(r.temperature.ground)}` : "");
        return `<div class="bc st-${s}" data-cat="${c.key}"><span class="bc-i">${ico(CAT_ICON[c.key])}</span><span class="bc-t"><small>${c.key}</small><b>${esc(reading)}</b></span>` +
          `<span class="sb sb-${s}" title="${ST_WORD[s]}">${ico(ST_ICON[s])}<span${s === "ok" ? ' class="sr-only"' : ""}>${ST_WORD[s]}</span></span></div>`; }).join("");
      const lim = r.limiting.blocked ? `Limiting: <b>${esc(r.limiting.key)}</b> · ${esc(r.limiting.text)}` : r.limiting.softSoil ? "Growing · the soil is marginal here" : "Nothing holding the plant back";
      const helpHtml = help.length ? help.map(u => `<button type="button" class="pv-btn hb ${BOARD_CLASS[u.board]}" data-go="${BOARD_ROOM[u.board]}" data-item="${esc(u.id)}">${ico(u.board === "Terraform" ? "terraform" : u.board === "Spread" ? "spread" : "adapt")}<span class="hb-t"><b>${esc(u.name)}</b><small>${u.board}</small></span></button>`).join("")
        : `<span class="none">${r.limiting.blocked ? "No offered upgrade opens it right now" : "Nothing needed"}</span>`;
      const key = [sel.index, st, lim, r.colony.label, r.isOrigin, conds, help.map(u => u.id).join()].join("¦");
      if (key === bannerKey && !banner.hidden) return; bannerKey = key;
      const focused = banner.contains(document.activeElement) ? (document.activeElement.dataset.item || document.activeElement.className) : null;
      banner.innerHTML = `<button type="button" class="bx" data-act="deselect" aria-label="Close and deselect ${esc(r.name)}">${ico("close")}</button>` +
        `<div class="bn-h"><div class="bn-t">${ico("inspect")}<b>${esc(r.name)}</b><span class="pv-st ${st}">${ico(ST_ICON[st])}${ST_WORD[st]}</span>${r.isOrigin ? `<span class="rg-o">${ico("star")}Origin</span>` : ""}</div>` +
          `<p><span data-tutorial="colony-status">${esc(r.colony.label)}</span> · <span class="lim" data-tutorial="limiting-factor">${lim}</span></p></div>` +
        `<div class="bn-c" role="group" aria-label="Conditions" data-tutorial="readout">${conds}</div>` +
        `<div class="bn-a"><button type="button" class="pv-btn" data-go="region">${ico("regions")}Inspect region</button>` +
          `<div class="bn-help" role="group" aria-label="Would help"><small>Would help</small>${helpHtml}</div></div>`;
      banner.hidden = false;
      if (focused) { const b = [...banner.querySelectorAll("button")].find(x => (x.dataset.item || x.className) === focused); if (b) b.focus(); }
    }
    banner.addEventListener("click", e => {
      if (e.target.closest('[data-act="deselect"]')) { A.actions.deselect(); canvas.focus(); return; }
      const b = e.target.closest("[data-go]"); if (b) openRoom(b.dataset.go, { region: A.selection().index, item: b.dataset.item || null, opener: b });
    });
    // a "Would help" suggestion previews its real effect on the map while hovered / focused (silent: adapter.previewOf, no event)
    const helpPv = b => { state.helpPreview = b && b.dataset.item ? A.previewOf(b.dataset.item) : null; dirty = true; };
    banner.addEventListener("pointerover", e => helpPv(e.target.closest("[data-item]")));
    banner.addEventListener("pointerleave", () => helpPv(null));
    banner.addEventListener("focusin", e => helpPv(e.target.closest("[data-item]")));
    banner.addEventListener("focusout", () => helpPv(null));

    // ---------------------------------------------------------------- Map View: hover / focus = preview, click = commit (stays open)
    function paintLens() {
      const shown = state.lensPv !== null ? (state.lensPv || null) : state.lens;
      lensPop.querySelectorAll("[data-lens]").forEach(b => { const k = b.dataset.lens || null;
        b.setAttribute("aria-pressed", String(k === state.lens)); b.classList.toggle("pv-prev", state.lensPv !== null && (b.dataset.lens || "") === state.lensPv && (state.lensPv || null) !== state.lens); });
      mapviewBtn.setAttribute("aria-pressed", String(!!state.lens));
      const lg = $("pvLegend");
      if (shown) { lg.hidden = false; lg.innerHTML = `<span class="lt">${esc(shown)}</span><span class="k"><i class="g"></i>${ico("check")}OK</span><span class="k"><i class="y"></i>${ico("alert")}Strained</span><span class="k"><i class="r"></i>${ico("x")}Blocked</span>`; }
      else lg.hidden = true;
      el.dataset.layer = shown || ""; dirty = true;
    }
    function setLens(k) { state.lens = k || null; state.lensPv = null; paintLens(); live(state.lens ? `Map View: ${state.lens}` : "Map View: plants"); }
    function previewLens(k) { state.lensPv = k === undefined ? null : (k || ""); paintLens(); }
    function placePop(pop, btn, alignRight) {
      const b = btn.getBoundingClientRect(), a = el.getBoundingClientRect(), w = pop.offsetWidth || 220;
      pop.style.top = (b.bottom - a.top + 9) + "px";
      const left = alignRight ? Math.max(8, Math.min(b.right - a.left - w, a.width - w - 8)) : Math.max(8, Math.min(b.left - a.left, a.width - w - 8));
      pop.style.left = left + "px"; pop.style.setProperty("--nub", Math.max(12, Math.min(w - 26, b.left - a.left - left + b.width / 2 - 7)) + "px");
    }
    function openLens(open, focusBack) {
      if (open === state.lensOpen) return; state.lensOpen = open; lensPop.hidden = !open; mapviewBtn.setAttribute("aria-expanded", String(open));
      if (open) { closeMenu(); placePop(lensPop, mapviewBtn); (lensPop.querySelector('[aria-pressed="true"]') || lensPop.querySelector("[data-lens]")).focus(); }
      else { if (state.lensPv !== null) previewLens(undefined); if (focusBack) mapviewBtn.focus(); }
    }
    lensPop.addEventListener("click", e => { const b = e.target.closest("[data-lens]"); if (b) setLens(b.dataset.lens); });
    lensPop.addEventListener("pointerover", e => { const b = e.target.closest("[data-lens]"); if (b) previewLens(b.dataset.lens); });
    lensPop.addEventListener("pointerout", e => { const b = e.target.closest("[data-lens]"); if (b && !(e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest("[data-lens]") === b)) previewLens(undefined); });
    lensPop.addEventListener("focusin", e => { const b = e.target.closest("[data-lens]"); if (b) previewLens(b.dataset.lens); });
    lensPop.addEventListener("focusout", e => { if (!lensPop.contains(e.relatedTarget)) previewLens(undefined); });
    lensPop.addEventListener("keydown", e => { if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return; e.preventDefault();
      const bs = [...lensPop.querySelectorAll("[data-lens]")], k = bs.indexOf(document.activeElement); bs[(k + (e.key === "ArrowDown" ? 1 : bs.length - 1)) % bs.length].focus(); });
    root.addEventListener("blur", () => { if (state.lensPv !== null) previewLens(undefined); });

    // ---------------------------------------------------------------- run menu (player / training): the page's own items and path
    function openMenu(open) { if (!menuPop || open === state.menuOpen) return; state.menuOpen = open; menuPop.hidden = !open; menuBtn.setAttribute("aria-expanded", String(open));
      if (open) { openLens(false); placePop(menuPop, menuBtn, true); menuPop.querySelector("[data-act]").focus(); } }
    function closeMenu(focusBack) { if (state.menuOpen) { openMenu(false); if (focusBack) menuBtn.focus(); } }
    if (menuPop) { menuBtn.addEventListener("click", () => openMenu(!state.menuOpen));
      menuPop.addEventListener("click", e => { const b = e.target.closest("[data-act]"); if (!b) return; openMenu(false); A.actions.runAction(b.dataset.act); });
      menuPop.addEventListener("keydown", e => { if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return; e.preventDefault();
        const bs = [...menuPop.querySelectorAll("[data-act]")], k = bs.indexOf(document.activeElement); bs[(k + (e.key === "ArrowDown" ? 1 : bs.length - 1)) % bs.length].focus(); }); }

    // ---------------------------------------------------------------- tools · room navigation seam (029C / 029D fill it)
    const rooms = { region: null, adapt: null, spread: null, terraform: null };
    function paintTools() { el.querySelectorAll(".pv-tool[data-tool]").forEach(b => { const t = b.dataset.tool; if (t === "mapview") return;
      b.dataset.room = rooms[t] ? "ready" : "unavailable"; b.title = rooms[t] ? ROOM_TITLE[t] : `${ROOM_TITLE[t]} (arrives in BLOOM-${ROOM_MILESTONE[t]})`; }); }
    /**
     * Open a room: name ∈ region | adapt | spread | terraform; ctx = { region (index or −1), item (upgrade id or null), opener }.
     * 029C / 029D register the rooms (rooms.register(name, { open(ctx) → close() })). The accepted rules they implement: a room
     * pauses the run (restoring it on Back), takes the home selection as its own context and clears the home selection.
     * Until a room is registered this says so (development path only) and changes nothing.
     */
    function openRoom(name, ctx = {}) {
      openLens(false); closeMenu();
      const impl = rooms[name]; if (!impl) { toast(`${ROOM_TITLE[name]} arrives in BLOOM-${ROOM_MILESTONE[name]}. This development view has the Planet View only; open the run without &ui=18 for every control.`); return false; }
      return impl.open({ adapter: A, region: ctx.region === undefined ? A.selection().index : ctx.region, item: ctx.item || null, opener: ctx.opener || null, view: api });
    }
    function toast(m) { const t = $("pvToast"); t.innerHTML = ico("lock") + `<span>${esc(m)}</span>`; t.hidden = false; live(m); clearTimeout(state.toastTimer); state.toastTimer = setTimeout(() => { t.hidden = true; }, 4200); }
    el.querySelector(".pv-tools").addEventListener("click", e => { const b = e.target.closest("[data-tool]"); if (!b) return;
      if (b.dataset.tool === "mapview") { openLens(!state.lensOpen, state.lensOpen); return; }   // tool toggle
      openLens(false); openRoom(b.dataset.tool, { opener: b }); });
    paintTools();

    // ---------------------------------------------------------------- clock (never touches the selection)
    $("pvPause").addEventListener("click", () => A.actions.togglePlay());
    $("pvSpeed").addEventListener("click", () => A.actions.cycleSpeed());

    // ---------------------------------------------------------------- map input
    canvas.addEventListener("pointermove", e => { if (e.pointerType === "touch") return; const h = R.hitTest(e.clientX, e.clientY), b = R.bubbleAt(e.clientX, e.clientY, lastBubbles);
      const hv = h.region >= 0 ? h.region : -1; canvas.classList.toggle("over", hv >= 0 || !!b); if (hv !== state.hover) { state.hover = hv; dirty = true; } });
    canvas.addEventListener("pointerleave", () => { if (state.hover !== -1) { state.hover = -1; dirty = true; } canvas.classList.remove("over"); });
    canvas.addEventListener("click", e => {
      const b = R.bubbleAt(e.clientX, e.clientY, A.bubbles()); if (b) { A.actions.collectBubble(b.tile); return; }   // a bubble first (as the shell)
      const h = R.hitTest(e.clientX, e.clientY);
      // a physical click: the canonical tile under it (a repeated cylinder copy resolves to x mod W) through the run's own map-click
      // path — the event carries that tile, the selected region clicked again deselects, water deselects with water:true. Only a
      // click on the frame outside the planet (no tile) clears through the abstract deselect.
      if (h.tile >= 0) A.actions.selectTile(h.tile); else A.actions.deselect();
      if (state.focus >= 0) { state.focus = -1; dirty = true; }
    });
    canvas.addEventListener("keydown", e => {
      const k = e.key, sel = A.selection().index;
      if (k === "Escape") { if (sel >= 0) { e.preventDefault(); A.actions.deselect(); } return; }
      if (k === "Enter" || k === " ") { const f = state.focus >= 0 ? state.focus : sel; if (f >= 0) { e.preventDefault(); A.actions.selectRegion(f); } return; }
      const dir = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[k]; if (!dir) return; e.preventDefault();
      const from = state.focus >= 0 ? state.focus : sel >= 0 ? sel : (regs.find(r => r.isOrigin) || regs[0]).index;
      const W = MAP0.width, wrap = !!(MAP0.topology && MAP0.topology.wrapX), c0 = regs[from].center; let best = -1, bs = Infinity;
      if (state.focus < 0 && sel < 0) best = from;
      else for (const r of regs) { if (r.index === from) continue; let dx = r.center.x - c0.x; const dy = r.center.y - c0.y;
        if (wrap && Math.abs(dx) > W / 2) dx -= Math.sign(dx) * W;
        const along = dx * dir[0] + dy * dir[1], across = Math.abs(dx * dir[1]) + Math.abs(dy * dir[0]); if (along <= 0.5) continue;
        const score = along + 2 * across; if (score < bs) { bs = score; best = r.index; } }
      if (best >= 0) { state.focus = best; dirty = true; const r = regs[best]; live(`${r.name}: ${r.lamp === "red" ? "blocked" : r.lamp === "yellow" ? "strained" : "open"}. Enter selects.`); }
    });
    canvas.addEventListener("blur", () => { if (state.focus >= 0) { state.focus = -1; dirty = true; } });

    // ---------------------------------------------------------------- global close rules (outside click, Escape)
    document.addEventListener("click", e => {
      if (state.lensOpen && !e.target.closest("#pvLens") && !e.target.closest('[data-tool="mapview"]')) openLens(false);
      if (state.menuOpen && !e.target.closest("#pvMenu") && !e.target.closest("#pvMenuBtn")) openMenu(false);
    });
    document.addEventListener("keydown", e => { if (e.key !== "Escape") return;
      if (state.lensOpen) { e.preventDefault(); openLens(false, true); } else if (state.menuOpen) { e.preventDefault(); closeMenu(true); } });

    // ---------------------------------------------------------------- frame: draw the map when something changed (or is animating)
    let lastBubbles = [], lastFx = null;
    function frameState() {
      const sel = A.selection().index, shown = state.lensPv !== null ? (state.lensPv || null) : state.lens;
      const fx = A.effects(), sc = A.scenario(), tints = [];
      if (sc.climate) for (const [ax, X] of Object.entries(sc.climate.axes)) if (X.shock && X.offset) {
        tints.push({ rgb: SHOCK_TINT[ax + (X.offset > 0 ? "Up" : "Down")] || [220, 220, 220], k: Math.min(1, Math.abs(X.offset) / (X.shock.magnitude || 1)) }); }
      const ap = A.activePreview(), hp = state.helpPreview, pv = hp && hp.available ? hp : ap;
      lastBubbles = A.bubbles(); lastFx = fx;
      return { tiles: shown ? null : A.mapState(), regions: regs, selected: sel, hover: state.hover, focus: state.focus,
        preview: pv ? { gain: idx(pv.gain), lose: idx(pv.lose), reachHostile: idx(pv.reachHostile), better: pv.better && pv.better.length ? idx(pv.better) : null, worse: idx(pv.worse) } : null,
        effects: { crossings: fx.crossings, crossingTiming: fx.crossingTiming, thresholds: fx.thresholds, competition: fx.competition,
          skyChange: fx.skyChange ? { gain: idx(fx.skyChange.gain), lose: idx(fx.skyChange.lose), better: idx(fx.skyChange.better), worse: idx(fx.skyChange.worse) } : null },
        bubbles: lastBubbles, layer: shown ? { key: shown, lamps: layerLamps(shown) } : null,
        haze: sc.pressure ? sc.pressure.progress : 0, tints, labels: true, now: now() };
    }
    const animating = () => !!(lastFx && (lastFx.crossings.length || lastFx.thresholds.length || lastFx.competition.length || lastFx.skyChange));
    let raf = 0, disposed = false;
    function loop() {
      if (disposed) return; raf = requestAnimationFrame(loop);
      if (!(dirty || animating())) return; dirty = false;
      const src = A.hud(), key = `${src.skyNow.temp.toFixed(3)}|${src.skyNow.moist.toFixed(3)}`;
      if (key !== lastSkyKey) { lastSkyKey = key; R.setSky({ temperature: src.skyNow.temp, moisture: src.skyNow.moist }); }
      R.draw(frameState());
    }

    // ---------------------------------------------------------------- adapter notices (pull model)
    const unsub = A.subscribe(ch => {
      const r = ch.reasons, sel = r.includes("region-select"), buy = r.includes("upgrade-purchase") || r.includes("local-upgrade") || r.includes("growth-focus");
      readRegions(sel || buy || r.includes("continue") || r.includes("loss"));
      if (state.lens || state.lensPv !== null) readConds(buy);
      paintHud(); paintLog(); paintScenario();
      paintBanner(sel || buy);
      if (sel) { const s = A.selection(); live(s.index >= 0 ? `${s.name} selected` : "No region selected"); }
      dirty = true;
    });
    new ResizeObserver(() => { relayout(); if (state.lensOpen) placePop(lensPop, mapviewBtn); if (state.menuOpen) placePop(menuPop, menuBtn, true); }).observe(stage);
    if (mq && mq.addEventListener) mq.addEventListener("change", () => { el.classList.toggle("reduced", reduced()); dirty = true; });
    relayout(); paintHud(); paintLog(); paintScenario(); paintBanner(true); paintLens(); loop();

    const api = {
      el, renderer: R, adapter: A,
      rooms: Object.freeze({ register(name, impl) { if (!(name in rooms)) throw new Error(`BLOOM.planetView: unknown room "${name}"`); rooms[name] = impl || null; paintTools(); }, has: n => !!rooms[n] }),
      openRoom, setLens, previewLens, openLens, openMenu,
      state: () => ({ lens: state.lens, lensPreview: state.lensPv, lensOpen: state.lensOpen, menuOpen: state.menuOpen, hover: state.hover, focus: state.focus,
        selection: A.selection().index, banner: !banner.hidden, scenarioOpen: state.scnOpen, layerShown: el.dataset.layer || null }),
      redraw() { dirty = true; },
      dispose() { disposed = true; cancelAnimationFrame(raf); unsub(); anchorWatch.disconnect(); el.remove(); document.documentElement.classList.remove("ui18"); instance = null; },
    };
    instance = api; PV.instance = api;
    return api;
  }

  const PV = { mount, version: 1, instance: null };
  root.BLOOM = Object.assign(root.BLOOM || {}, { planetView: PV });
})(typeof window !== "undefined" ? window : globalThis);
