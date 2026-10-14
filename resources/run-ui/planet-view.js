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
// (rooms.register / openRoom) that 029C (resources/run-ui/decision-rooms.js: Region Inspect, Adapt, Spread) and 029D (Terraform)
// fill; until a room is registered a request says so (migration build only).
//
//   const pv = BLOOM.planetView.mount(adapter, { root: document.body })   → the instance (also BLOOM.planetView.instance)
//
// BLOOM-029E: this is the DEFAULT run interface. demos/demo-run.html mounts it on every run (First Bloom, planet=, generated, every
// scenario, play=1, training=1) over the same run as the retired engineering shell, which stays hidden as the sim host; only the
// developer flag ?ui=legacy shows that shell instead. The production run report (resources/run-ui/run-report.js) mounts over this view.
// BLOOM-028D2: regionPoint(id) / regionRect(id) — read-only screen geometry of a region on the current map layout, for the guided
// training's callout (resources/training/training-coach.js); presentation only.
// BLOOM-039 (pre-playtest clarity): the banner's status pill is the adapter's ONE aggregate status (OK · Strained · Blocked · Refuge, from the
// engine's grow rule); condition boxes name the physical condition (Toxic, Salty …) with the same three status words; "Would help" is the
// adapter's multi-step advice (fewest steps on one track, real prices, what still blocks, toxicity truth); in Native Competition the
// banner names the competition reason and who holds the ground, and the scenario card shows a FRONT STALLED cue after ~120 game seconds
// without front progress while a native-held viable frontier remains (presentation only). The banner flips from the bottom to the top of
// the map (under the HUD) when the bottom placement would materially cover the selected region (decided once per selection / layout). A
// click inside a region-name pill selects the region that pill names.
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
    refuge: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
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
  // (036C1) "refuge": the protected landing refuge — the origin's ground would be Blocked, the refuge rule keeps the plant alive there
  const LAMP_ST = { green: "ok", yellow: "warn", red: "bad" }, ST_WORD = { ok: "OK", warn: "Strained", bad: "Blocked", refuge: "Refuge" }, ST_ICON = { ok: "check", warn: "alert", bad: "x", refuge: "refuge" };
  const ST_TIP = { refuge: "Protected landing refuge: this ground does not suit your plant yet, but your landing region keeps it alive while you adapt." };
  // (BLOOM-039) the adapter's aggregate region status / a condition's own status → the shared ok / warn / bad / refuge styles and words
  const STATUS_ST = { ok: "ok", strained: "warn", blocked: "bad", refuge: "refuge" };
  const regionSt = r => STATUS_ST[r.status] || (r.limiting && r.limiting.refuge ? "refuge" : r.limiting && r.limiting.blocked ? "bad" : LAMP_ST[r.lamp] || "ok");
  const condSt = c => STATUS_ST[c.status] || LAMP_ST[c.lamp] || "ok";
  // (BLOOM-039) ONE severity vocabulary: a condition box names WHAT the condition is (physical words); how bad it is, is the status chip's job
  function reading(c, r) {
    const F = r.facts || {};
    if (c.key === "Temperature") return cap(c.word) + ` · ${degC(r.temperature.ground)}`;
    if (c.key === "Hazard") return c.word === "low" ? "Low" : F.radiation && F.toxic ? "Radioactive · toxic" : F.toxic ? "Toxic" : F.radiation ? "Radioactive" : cap(c.word);
    if (c.key === "Soil" && (c.word === "hostile" || c.word === "workable")) return F.salty && F.ph ? `Salty · ${F.ph}` : F.salty ? "Salty" : F.ph ? cap(F.ph) : cap(c.word);
    return cap(c.word);
  }
  // the limiting condition in physical words (the page's own "too cold" / "too dry" for temperature and water)
  function limitPhrase(r) {
    const F = r.facts || {}, k = r.limiting.key;
    if (k === "Hazard") return F.toxic && F.radiation ? "toxic and radioactive ground" : F.toxic ? "toxic ground" : F.radiation ? "too much radiation" : r.limiting.text || "";
    if (k === "Soil" && !r.limiting.softSoil) return F.salty ? "salty soil" : F.ph ? `${F.ph} soil` : r.limiting.text || "";
    return r.limiting.text || "";
  }
  // (BLOOM-039) Native Competition: the competition reason, when it is what holds the plant back on ground it could grow on
  const NATIVE_REASON = {
    "native-better-suited": { line: "Natives are better suited to this ground.", hint: "A sky change that favors your plant — or hurts the natives more — can tip the front.", terraform: true },
    "native-young": { line: "Established natives are reclaiming your young colony here.", hint: "Roots thicken a young colony faster." },
    "native-established": { line: "The native plants here are more established and are holding this ground.", hint: "Strengthening your colony next to it, or changing what suits each plant, can tip it.", terraform: true },
    "player-better-suited": { line: "Your plant is better suited here and is pushing native cover back.", hint: "" },
    "player-established": { line: "Your colony is more established here and is pushing native cover back.", hint: "" },
    "even": { line: "An even contest with the native plants: the more established side holds.", hint: "Strengthening your colony here, or changing what suits each plant, tips it." },
  };
  // ground the natives hold where no front has formed yet (the competition's side is "none": the plant has not reached it) — never "Nothing holding"
  const NATIVE_UNREACHED = { line: "Native plants hold this ground; your plant has not reached it yet.", hint: "" };
  const nativeFront = r => { const c = r.competition; if (!c || !(c.nativeTiles > 0) || r.status === "blocked") return null;
    return NATIVE_REASON[c.reason] || (r.nativeHeld || !c.playerTiles ? NATIVE_UNREACHED : { line: "Native plants hold part of this ground.", hint: "" }); };
  const STANDOFF_S = 120; // game seconds without front progress before the FRONT STALLED cue (presentation only)
  const BOARD_CLASS = { Adapt: "plant", Spread: "spread", Terraform: "planet" }, BOARD_ROOM = { Adapt: "adapt", Spread: "spread", Terraform: "terraform" };
  const ROOM_TITLE = { region: "Region Inspect", adapt: "Adapt", spread: "Spread", terraform: "Terraform" };
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
    // (BLOOM-033) one run of many in the same document: the global listeners and observers below are released by dispose()
    const life = new AbortController(), LIFE = { signal: life.signal };
    const MAP0 = A.map(), IDX = {}; MAP0.regions.forEach(r => { IDX[r.id] = r.index; });
    const idx = list => (list || []).map(id => IDX[id]).filter(i => i >= 0);
    // (BLOOM-039) each region's tiles (banner placement measures them) and the tile nearest its centre (a label click selects through it)
    const TILES = MAP0.regions.map(() => []); MAP0.tilemap.forEach((s, t) => { if (s >= 0) TILES[s].push(t); });
    const REP = MAP0.regions.map((g, i) => { let best = TILES[i][0], bd = Infinity; for (const t of TILES[i]) { const dx = (t % MAP0.width) + 0.5 - g.center.x, dy = ((t / MAP0.width) | 0) + 0.5 - g.center.y, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = t; } } return best; });
    const PLACE = { material: 0.15, gap: 12 };
    let placeKey = "", lastPlace = null;

    // ---------------------------------------------------------------- DOM
    document.documentElement.classList.add("ui18");
    const el = document.createElement("div"); el.className = "pv"; el.id = "pv"; el.dataset.ui = "production";
    // (036A) a Challenge run's line names its Challenge (the world type stays in the footer's run identity)
    const kindLine = RUN.training ? "Training" : RUN.challenge ? `Challenge · ${RUN.challenge.name}` : [RUN.kind === "procedural" ? RUN.archetypeName : null, !RUN.scenarioIsDefault ? RUN.scenarioName : null].filter(Boolean).join(" · ") || "Authored world";
    const tool = (id, label, extra = "") => `<button type="button" class="pv-tool" data-tool="${id}" aria-pressed="false"${extra}>${ico(id === "region" ? "regions" : id)}<span class="tn">${label}</span></button>`;
    el.innerHTML =
      `<header class="pv-hud" id="pvHud">` +
        `<div class="pv-id"><b id="pvName">${esc(RUN.planetName)}</b><small>${esc(kindLine)}</small></div>` +
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
        `<canvas class="pv-map" id="pvMap" data-tutorial="map" tabindex="0" role="application" aria-label="Planet map" aria-roledescription="planet map" aria-describedby="pvMapHelp"></canvas>` +
        `<span class="sr-only" id="pvMapHelp">Click or tap a region to select it, water to clear the selection. With the keyboard: arrow keys move between regions, Enter selects, Escape clears.</span>` +
        `<section class="pv-scn" id="pvScn" data-tutorial="scenario-status" hidden aria-live="off"></section>` +
        `<div class="pv-legend" id="pvLegend" hidden></div>` +
        `<aside class="pv-banner" id="pvBanner" data-tutorial="inspect" hidden aria-label="Selected region"></aside>` +
      `</main>` +
      `<div class="pv-toast" id="pvToast" role="status" hidden></div>` + // at the root: readable above the 029C room veil
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
    // (BLOOM-029C) the rooms claim more names through rooms.claimAnchors(names); the same rule then applies to them
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
    // (BLOOM-039) a layer shows each condition's own status (blocked = it alone stops growth), the same words as the banner's boxes
    const COND_LAMP = { ok: "green", strained: "yellow", blocked: "red" };
    function layerLamps(key) { const C = readConds(); return C.map(cs => { const c = cs.find(x => x.key === key); return c ? COND_LAMP[c.status] || c.lamp : "green"; }); }

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
      // (036D1) a gated Challenge holding an early Bloom says so (the run is not won yet: the report waits for the condition)
      const cp = A.completion ? A.completion() : null, holding = !!(cp && cp.status === "early-held" && st === "running");
      el.dataset.state = st; hudEls.state.textContent = holding ? "HOLDING" : { won: "BLOOMED", lost: "EXTINCT", running: "GROWING", paused: "PAUSED" }[st];
      if (cp) el.dataset.completion = cp.status; else delete el.dataset.completion;
      const pb = $("pvPause"); pb.innerHTML = ico(r.running ? "pause" : "play"); pb.setAttribute("aria-pressed", String(!r.running)); pb.setAttribute("aria-label", r.running ? "Pause" : "Resume"); pb.title = r.running ? "Pause" : "Resume";
      const sp = $("pvSpeed"); sp.textContent = r.speed + "×"; sp.setAttribute("aria-label", `Speed ${r.speed} times. Press to cycle 1, 2, 4`); sp.title = "Speed: 1× → 2× → 4×";
      const name = r.kind === "procedural" ? `${r.archetypeName} · ${r.play ? "World Seed" : "seed"} ${r.seed}` : r.planetName;
      $("pvRunId").textContent = [r.training ? "Training" : null, r.challenge ? `Challenge · ${r.challenge.name}` : null, name, !r.challenge && !r.scenarioIsDefault ? r.scenarioName : null].filter(Boolean).join(" · ");
    }
    function paintLog() { const m = stripGlyph(A.message()); const L = $("pvLog"); if (L.dataset.m !== m) { L.dataset.m = m; L.innerHTML = ico("info") + esc(m); } }

    // ---------------------------------------------------------------- scenario status (compact; every live value on "Details")
    let scnKey = "", scnPhase = null, scnShock = "", scnComp = 0, scnCond = null;
    // (BLOOM-039) FRONT STALLED: in Native Competition, below the Bloom target, with native-held ground the plant could grow on, and no front
    // progress (+1 point of land, or −1 point of native cover) for STANDOFF_S GAME seconds (paused time and rooms never count: sim time)
    const SO = { since: null, cov: 0, nat: 0, frontier: false, shown: false, last: 0 };
    function standoff(sc, h) {
      const r = A.run(), C = sc.competition, t = r.seconds;
      SO.frontier = !!C && regs.some(g => g.growable && g.nativeSide === "native" && g.nativeTiles > 0);
      if (!C || r.won || r.lost || h.coverage >= h.winAt || !SO.frontier) { SO.since = null; return false; }
      if (SO.since === null || h.coverage >= SO.cov + 0.01 || C.share <= SO.nat - 0.01) { SO.since = t; SO.cov = h.coverage; SO.nat = C.share; }
      SO.last = t; return t - SO.since >= STANDOFF_S;
    }
    function paintScenario() {
      const sc = A.scenario(), h = A.hud();
      if (!sc.pressure && !sc.competition && !sc.climate) { scn.hidden = true; return; }
      scn.hidden = false;
      let kind, icon, meter = 0, marks = [], line = "", line2 = "", warn = "", details = [], stall = "";
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
        if (standoff(sc, h)) stall = `<div class="stall" role="status"><b>Front stalled</b><span>Native plants are holding the remaining ground. Preview Terraforming to see whether a sky change can tip the competition.</span>` +
          `<button type="button" class="tf" data-go="terraform">${ico("terraform")}Preview Terraform</button></div>`;
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
      // (BLOOM-036D1) a gated Challenge's completion condition: ONE persistent line under the pressure state it is tied to (the tracker's own
      // words: "Final atmosphere · 82% of decline" → early Bloom "BLOOM REACHED — hold it …" → "Final atmosphere reached · regain Bloom …" → ✓)
      const cp = A.completion ? A.completion() : null;
      const cond = cp ? `<div class="cond" data-status="${esc(cp.status)}" role="status">${ico(cp.status === "complete" ? "check" : cp.status === "early-held" ? "star" : "pressure")}<span><b>${esc(cp.line)}</b>${cp.sub ? `<small>${esc(cp.sub)}</small>` : ""}</span></div>` : "";
      if (cp && scnCond !== null && cp.status !== scnCond) pulse(); scnCond = cp ? cp.status : null;
      if (stall && !SO.shown) pulse(); SO.shown = !!stall;
      const key = [kind, line, line2, warn, cond, stall, details.join("|"), Math.round(meter * 400), state.scnOpen].join("¦"); if (key === scnKey) return; scnKey = key;
      // (BLOOM-039) a Challenge run's card is titled by the Challenge itself; the scenario it runs under follows when the names differ
      const ttl = RUN.challenge ? RUN.challenge.name : sc.name, sub = RUN.challenge && RUN.challenge.name !== sc.name ? (sc.pressure ? `${sc.name} pressure` : sc.name) : "";
      scn.dataset.kind = kind; if (cp) scn.dataset.completion = cp.status; else delete scn.dataset.completion;
      scn.innerHTML = `<div class="sh">${ico(icon)}<b>${esc(ttl)}${sub ? `<small class="ssub">${esc(sub)}</small>` : ""}</b><button type="button" class="more" aria-expanded="${state.scnOpen}" aria-controls="pvScnD">Details${ico("chevron")}</button></div>` +
        `<div class="sm" role="meter" aria-label="${esc(sub ? `${ttl} · ${sub}` : ttl)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(meter * 100)}"><i style="width:${Math.min(100, meter * 100).toFixed(1)}%"></i>${marks.filter(m => m > 0 && m < 1).map(m => `<em style="left:${(m * 100).toFixed(1)}%"></em>`).join("")}</div>` +
        `<div class="sl">${line}</div>${line2 ? `<div class="sl2">${line2}</div>` : ""}${cond}${warn ? `<div class="warn">${esc(warn)}</div>` : ""}${stall}` +
        `<div class="sd" id="pvScnD"${state.scnOpen ? "" : " hidden"}>${details.map(d => `<div>${d}</div>`).join("")}</div>`;
    }
    function pulse() { if (reduced()) return; scn.classList.add("pulse"); setTimeout(() => scn.classList.remove("pulse"), 1800); }
    scn.addEventListener("click", e => { if (e.target.closest(".more")) { state.scnOpen = !state.scnOpen; scnKey = ""; paintScenario(); return; }
      const g = e.target.closest("[data-go]"); if (g) openRoom(g.dataset.go, { opener: g }); });

    // ---------------------------------------------------------------- selected-region banner (real region, colony, limiting factor)
    let bannerKey = "", advice = null;
    // (BLOOM-039) "Would help": the adapter's multi-step advice — at most two opening routes (fewest steps, then cheapest), real prices, what is
    // still missing; else the truthful reason nothing on offer opens it (another condition still blocks · lethal toxicity · nothing on offer)
    const routeCost = u => `${u.cost} Biomass${u.steps > 1 ? " total" : ""}${u.need > 0 ? ` · need ${u.need} more` : ""}`;
    const routeBtn = u => `<button type="button" class="pv-btn hb ${BOARD_CLASS[u.board]}${u.need > 0 ? " short" : ""}" data-go="${BOARD_ROOM[u.board]}" data-item="${esc(u.id)}" data-steps="${u.steps}" aria-label="${esc(`${u.name}${u.steps > 1 ? ` ${u.steps} times` : ""} opens it: ${routeCost(u)}`)}">${ico(u.board === "Terraform" ? "terraform" : u.board === "Spread" ? "spread" : "adapt")}<span class="hb-t"><b>${esc(u.name)}${u.steps > 1 ? ` <i class="x">×${u.steps}</i>` : ""}</b><small>${esc("opens it · " + routeCost(u))}</small></span></button>`;
    const helpLine = h => h.stillBlocks ? `${h.name} helps; ${h.stillBlocks} would still block this region.` : `${h.name} helps, but cannot open it on its own.`;
    function helpBlock(r) {
      const nf = nativeFront(r);
      if (r.status === "blocked") { const a = advice;
        if (a && a.routes.length) return a.routes.slice(0, 2).map((u, k) => routeBtn(u).replace('<button type="button" class="pv-btn hb', `<button type="button" data-route="${k + 1}" class="pv-btn hb`)).join("");
        if (a && a.toxic) return `<span class="none tox">${ico("hazard")}Toxicity is lethal here. No current adaptation removes it.</span>`;
        if (a && a.helps.length) { const h2 = a.helps.slice(1).find(h => h.category !== a.helps[0].category);
          return `<span class="none multi">${esc(helpLine(a.helps[0]))}${h2 ? ` ${esc(`${h2.name} helps with ${h2.category}.`)}` : ""}</span>`; }
        return `<span class="none">No offered upgrade opens it right now</span>`; }
      if (r.status === "refuge") return `<span class="none">Nothing needed while the refuge keeps it alive</span>`;
      if (nf && nf.terraform) return `<button type="button" class="pv-btn hb planet" data-go="terraform" data-native="1">${ico("terraform")}<span class="hb-t"><b>Terraform</b><small>preview a sky change</small></span></button>`;
      return `<span class="none">Nothing needed</span>`;
    }
    function paintBanner(force) {
      const sel = A.selection();
      if (sel.index < 0) { if (!banner.hidden) { banner.hidden = true; bannerKey = ""; } helpFor = -1; return; }
      const r = A.region(sel.index), t = now();
      if (force || helpFor !== sel.index || t - helpAt > 1000) { advice = A.advice ? A.advice(sel.index) : null; helpFor = sel.index; helpAt = t; }
      const st = regionSt(r), nf = nativeFront(r), C = r.competition;
      const conds = r.conditions.map(c => { const s = condSt(c);
        return `<div class="bc st-${s}" data-cat="${c.key}"><span class="bc-i">${ico(CAT_ICON[c.key])}</span><span class="bc-t"><small>${c.key}</small><b>${esc(reading(c, r))}</b></span>` +
          `<span class="sb sb-${s}" title="${ST_WORD[s]}">${ico(ST_ICON[s])}<span${s === "ok" ? ' class="sr-only"' : ""}>${ST_WORD[s]}</span></span></div>`; }).join("");
      const named = `<b>${esc(r.limiting.key)}</b> · ${esc(limitPhrase(r))}`;
      const lim = (r.status === "blocked" || r.status === "refuge") ? (r.limiting.combined ? "Limiting: <b>conditions together</b> · none fails alone, but together they are too harsh" : `Limiting: ${named}`)
        : nf ? `<b class="nat">${esc(nf.line)}</b>${nf.hint ? ` <span class="nat-h">${esc(nf.hint)}</span>` : ""}`
        : r.status === "strained" && r.limiting.text ? `Grows here · strained by ${named}`
        : r.limiting.softSoil ? "Growing · the soil is marginal here" : "Nothing holding the plant back";
      // (BLOOM-039) who holds the ground (Native Competition): separate from how well the ground suits the plant
      const own = C && C.nativeTiles > 0 ? `<span class="pv-own${r.nativeHeld ? " held" : ""}" title="${esc(r.nativeHeld ? "Native plants hold this region" : "Native plants hold part of this region")}">${ico("competition")}${r.nativeHeld ? "Native-held" : "Natives"} ${Math.round(C.nativeShare * 100)}%</span>` : "";
      const helpHtml = helpBlock(r);
      const key = [sel.index, st, lim, own, r.colony.label, r.isOrigin, conds, helpHtml].join("¦");
      if (key === bannerKey && !banner.hidden) return; bannerKey = key;
      const focused = banner.contains(document.activeElement) ? (document.activeElement.dataset.item || document.activeElement.className) : null;
      banner.innerHTML = `<button type="button" class="bx" data-act="deselect" aria-label="Close and deselect ${esc(r.name)}">${ico("close")}</button>` +
        `<div class="bn-h"><div class="bn-t">${ico("inspect")}<b>${esc(r.name)}</b><span class="pv-st ${st}"${ST_TIP[st] ? ` title="${esc(ST_TIP[st])}" aria-label="${esc(ST_TIP[st])}"` : ""}>${ico(ST_ICON[st])}${ST_WORD[st]}</span>${own}${r.isOrigin ? `<span class="rg-o">${ico("star")}Origin</span>` : ""}</div>` +
          `<p><span data-tutorial="colony-status">${esc(r.colony.label)}</span> · <span class="lim" data-tutorial="limiting-factor">${lim}</span></p></div>` +
        `<div class="bn-c" role="group" aria-label="Conditions" data-tutorial="readout">${conds}</div>` +
        `<div class="bn-a"><button type="button" class="pv-btn" data-go="region">${ico("regions")}Inspect region</button>` +
          `<div class="bn-help" role="group" aria-label="Would help"><small>Would help</small>${helpHtml}</div></div>`;
      const wasHidden = banner.hidden; banner.hidden = false; if (wasHidden || placeKey.split("|")[0] !== String(sel.index)) placeBanner();
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

    // ---------------------------------------------------------------- (BLOOM-039) banner placement: bottom by default; the top of the map (just under
    // the HUD, clear of the scenario card) when the bottom placement would materially cover the selected region. Measured on the region's REAL
    // tiles (the renderer's own screen geometry), decided once per selection and per stage size — never per frame, so it never jitters.
    const coverOf = (i, rc) => { const T = TILES[i]; if (!T || !T.length) return 0; let n = 0;
      for (const t of T) { const p = R.clientOf((t % MAP0.width) + 0.5, ((t / MAP0.width) | 0) + 0.5); if (p.x >= rc.left && p.x <= rc.right && p.y >= rc.top && p.y <= rc.bottom) n++; }
      return n / T.length; };
    function placeBanner() {
      const sel = A.selection().index; if (banner.hidden || sel < 0) return;
      const sr = stage.getBoundingClientRect(); placeKey = `${sel}|${Math.round(sr.width)}x${Math.round(sr.height)}`;
      banner.removeAttribute("style"); delete banner.dataset.place;
      const b = banner.getBoundingClientRect(), fb = coverOf(sel, b); let ft = null, place = "bottom", top = 0, left = 0;
      if (fb > PLACE.material) {
        top = sr.top + PLACE.gap; left = b.left; const w = b.width, h = b.height;
        // clear of the scenario card (top-left): slide right if there is room, else sit just below it
        const sc = scn.hidden ? null : scn.getBoundingClientRect();
        if (sc && left < sc.right + PLACE.gap) { const maxLeft = sr.right - PLACE.gap - w; if (sc.right + PLACE.gap <= maxLeft) left = sc.right + PLACE.gap; else top = sc.bottom + PLACE.gap; }
        const tr = { left, top, right: left + w, bottom: top + h }; ft = coverOf(sel, tr);
        if (tr.bottom <= sr.bottom - PLACE.gap && ft < fb) place = "top";
      }
      if (place === "top") { banner.dataset.place = "top"; Object.assign(banner.style, { top: (top - sr.top) + "px", left: (left - sr.left) + "px", bottom: "auto", transform: "none" }); }
      lastPlace = { region: sel, place, coverBottom: +fb.toFixed(3), coverTop: ft === null ? null : +ft.toFixed(3), stage: [Math.round(sr.width), Math.round(sr.height)] };
    }

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
    root.addEventListener("blur", () => { if (state.lensPv !== null) previewLens(undefined); }, LIFE);

    // ---------------------------------------------------------------- run menu (player / training): the page's own items and path
    function openMenu(open) { if (!menuPop || open === state.menuOpen) return; state.menuOpen = open; menuPop.hidden = !open; menuBtn.setAttribute("aria-expanded", String(open));
      if (open) { openLens(false); placePop(menuPop, menuBtn, true); menuPop.querySelector("[data-act]").focus(); } }
    function closeMenu(focusBack) { if (state.menuOpen) { openMenu(false); if (focusBack) menuBtn.focus(); } }
    if (menuPop) { menuBtn.addEventListener("click", () => openMenu(!state.menuOpen));
      menuPop.addEventListener("click", e => { const b = e.target.closest("[data-act]"); if (!b) return; openMenu(false); A.actions.runAction(b.dataset.act); });
      menuPop.addEventListener("keydown", e => { if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return; e.preventDefault();
        const bs = [...menuPop.querySelectorAll("[data-act]")], k = bs.indexOf(document.activeElement); bs[(k + (e.key === "ArrowDown" ? 1 : bs.length - 1)) % bs.length].focus(); }); }

    // ---------------------------------------------------------------- tools · room navigation seam (029C / 029D fill it)
    const rooms = { region: null, adapt: null, spread: null, terraform: null }; let activeRoom = null;
    function paintTools() { el.querySelectorAll(".pv-tool[data-tool]").forEach(b => { const t = b.dataset.tool; if (t === "mapview") return;
      b.dataset.room = rooms[t] ? "ready" : "unavailable"; b.title = rooms[t] ? ROOM_TITLE[t] : `${ROOM_TITLE[t]} is not available`; }); }
    /**
     * Open a room: name ∈ region | adapt | spread | terraform; ctx = { region (index or −1), item (upgrade id or null), opener }.
     * The rooms register themselves (rooms.register(name, { open(ctx) → close() })). The accepted rules they implement: a room
     * pauses the run (restoring it on Back), takes the home selection as its own context and clears the home selection; (029E) the
     * swap is wrapped in the SUBDUED mist and a request during a swap is ignored. Without a registered room nothing happens.
     */
    function openRoom(name, ctx = {}) {
      openLens(false); closeMenu();
      const impl = rooms[name]; if (!impl || el.dataset.transitioning) { if (!impl) toast(`${ROOM_TITLE[name]} is not available.`); return false; }
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
    // (BLOOM-039) a region-name pill is the region it names: inside a pill, hover / click mean THAT region (never the tile under the pill's edge)
    const labelAt = (x, y) => R.labelAt ? R.labelAt(x, y) : -1;
    canvas.addEventListener("pointermove", e => { if (e.pointerType === "touch") return; const b = R.bubbleAt(e.clientX, e.clientY, lastBubbles), lr = b ? -1 : labelAt(e.clientX, e.clientY), h = R.hitTest(e.clientX, e.clientY);
      const hv = lr >= 0 ? lr : h.region >= 0 ? h.region : -1; canvas.classList.toggle("over", hv >= 0 || !!b); if (hv !== state.hover) { state.hover = hv; dirty = true; } });
    canvas.addEventListener("pointerleave", () => { if (state.hover !== -1) { state.hover = -1; dirty = true; } canvas.classList.remove("over"); });
    canvas.addEventListener("click", e => {
      const b = R.bubbleAt(e.clientX, e.clientY, A.bubbles()); if (b) { A.actions.collectBubble(b.tile); return; }   // a bubble first (as the shell)
      // (BLOOM-039) then a region-name pill: when the pill names ANOTHER region than the tile under the pointer (a pill straddling a border,
      // water or the frame), the click means the named region — through that region's own tile; over its own region it is an ordinary click
      const lr = labelAt(e.clientX, e.clientY), h = R.hitTest(e.clientX, e.clientY);
      if (lr >= 0 && lr !== h.region && REP[lr] >= 0) { A.actions.selectTile(REP[lr]); if (state.focus >= 0) { state.focus = -1; dirty = true; } return; }
      // a physical click: the canonical tile under it (v1.0.1: the one drawn world; the frame is no tile) through the run's own map-click
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
      if (best >= 0) { state.focus = best; dirty = true; const r = regs[best]; live(`${r.name}: ${r.status === "refuge" ? "protected landing refuge" : r.status === "blocked" ? "blocked" : r.status === "strained" ? "strained" : "open"}${r.nativeHeld ? ", held by native plants" : ""}. Enter selects.`); }
    });
    canvas.addEventListener("blur", () => { if (state.focus >= 0) { state.focus = -1; dirty = true; } });

    // ---------------------------------------------------------------- global close rules (outside click, Escape)
    document.addEventListener("click", e => {
      if (state.lensOpen && !e.target.closest("#pvLens") && !e.target.closest('[data-tool="mapview"]')) openLens(false);
      if (state.menuOpen && !e.target.closest("#pvMenu") && !e.target.closest("#pvMenuBtn")) openMenu(false);
    }, LIFE);
    document.addEventListener("keydown", e => { if (e.key !== "Escape") return;
      if (state.lensOpen) { e.preventDefault(); openLens(false, true); } else if (state.menuOpen) { e.preventDefault(); closeMenu(true); } }, LIFE);

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
    const stageRO = new ResizeObserver(() => { if (disposed) return; relayout(); if (state.lensOpen) placePop(lensPop, mapviewBtn); if (state.menuOpen) placePop(menuPop, menuBtn, true);
      const sr = stage.getBoundingClientRect(); if (!banner.hidden && !placeKey.endsWith(`|${Math.round(sr.width)}x${Math.round(sr.height)}`)) placeBanner(); }); stageRO.observe(stage);
    if (mq && mq.addEventListener) mq.addEventListener("change", () => { el.classList.toggle("reduced", reduced()); dirty = true; }, LIFE);
    relayout(); paintHud(); paintLog(); paintScenario(); paintBanner(true); paintLens(); loop();

    // (BLOOM-028D2) read-only presentation geometry for an instruction placed over the map (the guided training's callout): where a region
    // is on screen NOW, from the renderer's current layout (client px; v1.0.1: the one drawn world). Nothing is cached
    // in screen space, so a resize / relayout is reflected on the next read. Unknown region → null. No rule, no selection, no event.
    const BOX = MAP0.regions.map(() => ({ x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity }));
    MAP0.tilemap.forEach((s, t) => { if (s < 0) return; const b = BOX[s], x = t % MAP0.width, y = (t / MAP0.width) | 0;
      b.x0 = Math.min(b.x0, x); b.y0 = Math.min(b.y0, y); b.x1 = Math.max(b.x1, x + 1); b.y1 = Math.max(b.y1, y + 1); });
    function regionPoint(id) { const i = IDX[id]; if (i === undefined) return null; const c = MAP0.regions[i].center; return R.clientOf(c.x, c.y); }
    function regionRect(id) { const i = IDX[id]; if (i === undefined || !Number.isFinite(BOX[i].x0)) return null; const b = BOX[i], a = R.clientOf(b.x0, b.y0), z = R.clientOf(b.x1, b.y1);
      return { left: a.x, top: a.y, right: z.x, bottom: z.y, width: z.x - a.x, height: z.y - a.y }; }

    const api = {
      el, renderer: R, adapter: A,
      rooms: Object.freeze({ register(name, impl) { if (!(name in rooms)) throw new Error(`BLOOM.planetView: unknown room "${name}"`); rooms[name] = impl || null; paintTools(); }, has: n => !!rooms[n],
        // (BLOOM-029C) a registered room re-homes shell anchors it now owns: the hidden shell's copies become data-tutorial-legacy
        claimAnchors(names) { for (const n of names) if (!REHOMED.includes(n)) REHOMED.push(n); rehome(); },
        // (BLOOM-029C) the room controller reports the open room; the tools show it pressed
        setActive(name) { activeRoom = name || null; el.querySelectorAll(".pv-tool[data-tool]").forEach(b => { if (b.dataset.tool !== "mapview") b.setAttribute("aria-pressed", String(b.dataset.tool === activeRoom)); }); },
        get active() { return activeRoom; }, parts: () => [el.querySelector(".pv-hud"), stage, el.querySelector(".pv-foot")] }),
      toast,
      openRoom, setLens, previewLens, openLens, openMenu,
      state: () => ({ lens: state.lens, lensPreview: state.lensPv, lensOpen: state.lensOpen, menuOpen: state.menuOpen, hover: state.hover, focus: state.focus,
        selection: A.selection().index, banner: !banner.hidden, scenarioOpen: state.scnOpen, layerShown: el.dataset.layer || null, room: activeRoom,
        // (BLOOM-039) QA: the banner's placement decision and the stand-off watch (game seconds)
        bannerPlace: lastPlace ? { ...lastPlace } : null, standoff: { frontier: SO.frontier, watching: SO.since !== null, stalledFor: SO.since === null ? 0 : +(SO.last - SO.since).toFixed(1), shown: SO.shown } }),
      redraw() { dirty = true; },
      regionPoint, regionRect, // (BLOOM-028D2) read-only map geometry (above)
      dispose() { if (disposed) return; disposed = true; cancelAnimationFrame(raf); clearTimeout(state.toastTimer); unsub(); anchorWatch.disconnect(); stageRO.disconnect(); life.abort(); el.remove(); document.documentElement.classList.remove("ui18");
        if (R.dispose) R.dispose(); instance = null; if (PV.instance === api) PV.instance = null; },
    };
    instance = api; PV.instance = api;
    return api;
  }

  const PV = { mount, version: 1, instance: null };
  root.BLOOM = Object.assign(root.BLOOM || {}, { planetView: PV });
})(typeof window !== "undefined" ? window : globalThis);
