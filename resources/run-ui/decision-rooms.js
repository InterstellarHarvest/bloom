// BLOOM — production decision rooms (BLOOM-029C, Concept 18): Region Inspect · Adapt · Spread. docs/PRODUCTION_PLANT_ROOMS_v1.md.
//
// Three floating rooms over the production Planet View (resources/run-ui/planet-view.js), filled into its room seam
// (planetView.rooms.register / openRoom). Concept 18 supplies the presentation (the floating-card room family, the shared room
// header, the organic plant → tree tendrils, the category identity, the "three region chips across" scale); THE EXISTING RUN
// SUPPLIES TRUTH: every region, colony, trait, tier, price, availability, preview and purchase comes from window.BLOOM_RUN_UI's
// adapter (handed in by the Planet View) and acts only through adapter.actions, so every bloom:* event fires unchanged from
// the run page's own action functions. No mockup file, region, node, cost or rule is here.
//
//   BLOOM.decisionRooms.mount(planetView)   → the controller (also BLOOM.decisionRooms.instance)
//
// Room controller (presentation state only; the simulation has ONE pause, the run page's):
//   open    the real run pauses at once (adapter.actions.pause → the real bloom:play-pause); whether it was running is remembered;
//           the home selection (if any) becomes the ROOM CONTEXT, else the room's last context, else the origin; the home
//           selection is then cleared (adapter.actions.deselect, the real bloom:region-select); the Planet View stays mounted
//           underneath in the exact same geometry, blurred ≈ 7 px, dimmed by a 46 % ink veil, inert and aria-hidden.
//   Back / Escape   close, clear transient previews / peeks, restore the run to its pre-room state; no home region selected.
//   Resume          close, clear, and run regardless of the pre-room state.
//   room → room     no Planet View in between, still paused, same context, the old room's transient preview cleared.
//   Terraform       stays on the Planet View's seam (unavailable until BLOOM-029D): a request says so and changes nothing.
// Room context ≠ home selection: the right-hand mini-map (the SAME production map renderer, resources/run-ui/run-map-renderer.js,
// on its own canvas) and region strip change the room context only — never actions.selectRegion, never bloom:region-select.
// Real Adapt / Spread nodes preview through adapter.actions.preview(id) (the deliberate player preview: bloom:upgrade-preview,
// the home map's outline) and buy through adapter.actions.buy(id) (bloom:upgrade-purchase). Transitions: none here (immediate
// swaps); BLOOM-029E wraps planetView ↔ room and room ↔ room through the seam below (controller.transition).
// Classic script, no dependencies besides BLOOM.surface, BLOOM.runMap and BLOOM.plantSpecimen: boots over file://.
(function (root) {
  "use strict";
  // ---- the production icon family (24×24 strokes, inline SVG; never emoji). Shared language with the Planet View.
  const I = {
    regions: '<rect x="3" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5"/>',
    inspect: '<path d="M12 21s-6-5.3-6-10a6 6 0 0 1 12 0c0 4.7-6 10-6 10z"/><circle cx="12" cy="11" r="2.2"/>',
    adapt: '<path d="M5 19C5 10 10 5 20 4c0 10-5 15-14 15z"/><path d="M5 19l9-9"/>',
    spread: '<circle cx="12" cy="12" r="2.4"/><path d="M12 9.4V3.5M9.6 6l2.4-2.5L14.4 6"/><path d="M14.1 13.2l5 3.6M15.9 19.2l3.2-2.4-.5-4"/><path d="M9.9 13.2l-5 3.6M8.1 19.2l-3.2-2.4.5-4"/>',
    terraform: '<circle cx="12" cy="12" r="6.2"/><path d="M2.5 10.2c6.5 4.2 12.5 4.2 19 0M2.5 13.8c6.5-4.2 12.5-4.2 19 0" opacity=".9"/>',
    pause: '<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>', play: '<path d="M7.5 5l11 7-11 7z"/>',
    back: '<path d="M15 5l-7 7 7 7"/><path d="M8 12h12"/>', lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    temp: '<path d="M10 4a2 2 0 0 1 4 0v9.5a4 4 0 1 1-4 0z"/><circle cx="12" cy="17" r="1.6"/>', water: '<path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z"/>',
    soil: '<path d="M3 14h18M3 18h18"/><circle cx="8" cy="9" r="1.3"/><circle cx="14" cy="7" r="1.3"/><circle cx="17" cy="11" r="1.3"/>', hazard: '<path d="M12 4l9 16H3z"/><path d="M12 10v4"/><circle cx="12" cy="17" r=".9"/>',
    reach: '<path d="M3 9c3-3 6 3 9 0s6-3 9 0M3 15c3-3 6 3 9 0s6-3 9 0"/>', off: '<circle cx="12" cy="12" r="8"/><path d="M6.5 6.5l11 11"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7"/>', alert: '<path d="M12 5v9"/><circle cx="12" cy="18" r="1"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>',
    star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.25 4.15 1 5.85L12 16.9l-5.25 2.8 1-5.85L3.5 9.7l5.9-.9z"/>',
    cold: '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9"/><path d="M10 4l2 2 2-2M10 20l2-2 2 2"/>',
    heat: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
    drought: '<path d="M12 21V11"/><path d="M12 11c-5 0-7-4-7-7 4 0 7 2 7 7zM12 14c0-5 3-7 7-7 0 4-2 7-7 7z"/>',
    flood: '<path d="M12 3s5 6 5 9.5a5 5 0 0 1-10 0C7 9 12 3 12 3z"/><path d="M3 20c3-2 6 2 9 0s6-2 9 0"/>',
    salt: '<path d="M12 3l7 7-7 11-7-11z"/><path d="M5 10h14M12 3v18"/>', rad: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
    seedOut: '<circle cx="12" cy="12" r="2.4"/><circle cx="12" cy="5.5" r="2.1"/><circle cx="12" cy="18.5" r="2.1"/><circle cx="5.5" cy="12" r="2.1"/><circle cx="18.5" cy="12" r="2.1"/>',
    waterSeeds: '<ellipse cx="12" cy="10" rx="5" ry="4"/><path d="M12 6v8"/><path d="M3 18c3-2 6 2 9 0s6-2 9 0"/>', earlyMat: '<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>',
    roots: '<path d="M12 3v8M12 11l-5 5M12 11l5 5M7 16l-2 4M7 16l2 4M17 16l-2 4M17 16l2 4"/>', leaves: '<path d="M5 19C5 10 10 5 20 4c0 10-5 15-14 15z"/><path d="M5 19l9-9"/>',
    seeds: '<path d="M12 21V9"/><path d="M12 9c-3 0-5-3-5-6 3 0 5 2 5 6zM12 12c0-4 2-6 5-6 0 3-2 6-5 6z"/>', balanced: '<path d="M12 3v18M4 7h16M6 7l-3 6a3 3 0 0 0 6 0zM18 7l-3 6a3 3 0 0 0 6 0z"/>',
    rootNetwork: '<circle cx="12" cy="5" r="2"/><circle cx="5" cy="18" r="2"/><circle cx="19" cy="18" r="2"/><path d="M12 7v5m0 0l-5.5 4.5M12 12l5.5 4.5"/>',
    leafCanopy: '<path d="M12 21v-6"/><path d="M12 15c-6 0-8-4-8-8 0-2 1-4 3-4 1-2 4-2 5 0 1-2 4-2 5 0 2 0 3 2 3 4 0 4-2 8-8 8z"/>', seedReserve: '<path d="M12 21v-8"/><ellipse cx="12" cy="8" rx="5" ry="5"/><path d="M12 3v10"/>',
    overview: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>', colony: '<path d="M12 21v-9"/><path d="M12 12c-4 0-6-3-6-6 3 0 6 2 6 6zM12 12c0-4 2-6 6-6 0 3-2 6-6 6z"/>',
    science: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3"/><path d="M7.5 16h9"/>', stem: '<path d="M12 21V6"/><path d="M12 12c-3 0-5-2-5-5 3 0 5 2 5 5zM12 16c0-3 2-5 5-5 0 3-2 5-5 5z"/>',
    crown: '<path d="M12 21V9"/><circle cx="12" cy="6" r="3"/><path d="M12 3v-1M9.5 3.5l-.7-.7M14.5 3.5l.7-.7M8.5 6h-1M15.5 6h1"/>', pods: '<ellipse cx="12" cy="10" rx="5" ry="4"/><path d="M12 6v8"/><path d="M3 18c3-2 6 2 9 0s6-2 9 0"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><circle cx="12" cy="7.6" r=".9"/>', coin: '<circle cx="12" cy="12" r="8"/><path d="M12 7.5v9M9.5 10h3.5a1.75 1.75 0 0 1 0 3.5H10"/>',
  };
  const ico = (n, cls) => `<svg class="ic${cls ? " " + cls : ""}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${I[n] || I.info}</svg>`;
  const esc = t => String(t == null ? "" : t).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  const degC = t => `${Math.round(t) < 0 ? "−" : ""}${Math.abs(Math.round(t))} °C`;
  const num = v => typeof v === "number" ? (Number.isInteger(v) ? String(v) : (Math.round(v * 10) / 10).toString()) : String(v);
  const ROMAN = ["", "I", "II", "III", "IV", "V"];
  const ROOM_IDS = ["region", "adapt", "spread", "terraform"];
  const ROOMS = { // the accepted room-header language (docs/UI_CONCEPT_REVIEW_v10.md)
    region: { kicker: "EXPLORE", title: "Region Inspect", verb: "Compare regions and their colonies", ico: "regions", kind: "explore" },
    adapt: { kicker: "CHANGE · YOUR PLANT", title: "Adapt", verb: "Change your plant", ico: "adapt", kind: "plant", board: "Adapt" },
    spread: { kicker: "CHANGE · HOW IT TRAVELS", title: "Spread", verb: "Reach new land", ico: "spread", kind: "spread", board: "Spread" },
    terraform: { kicker: "CHANGE · THE PLANET", title: "Terraform", verb: "Change the planet, not the plant", ico: "terraform", kind: "planet" },
  };
  // PMO-locked presentation categories (content/traits.js uiCategory): order top → bottom = the plant's anatomy top → bottom, so
  // the organic tendrils cannot cross; the accepted category colours; which specimen part each category points at
  const CATS = { Adapt: ["Hazard", "Water", "Temperature", "Soil"], Spread: ["Seeds", "Growth", "Reach"] };
  const CAT_COLOR = { Hazard: ["#8a5bb8", "#efe5f8", "#5e3a86"], Water: ["#3b8fd0", "#dcecf8", "#23679f"], Temperature: ["#d9601f", "#fde6d6", "#9c3f0e"], Soil: ["#8a6a3e", "#f1e6d2", "#5f452a"],
    Seeds: ["#c58a1a", "#fbefcf", "#8a5d00"], Growth: ["#3f9d4b", "#e2f2d6", "#2a7636"], Reach: ["#1f8f8f", "#d8f1ef", "#136060"] };
  const CAT_ICON = { Hazard: "hazard", Water: "water", Temperature: "temp", Soil: "soil", Seeds: "seedOut", Growth: "colony", Reach: "reach" };
  const CAT_PART = { Hazard: ["pigment", "Leaf pigment", "leaves"], Water: ["leafShape", "Leaf shape", "water"], Temperature: ["stem", "Stem", "stem"], Soil: ["roots", "Roots", "roots"],
    Seeds: ["seedHead", "Seed head", "crown"], Growth: ["flowers", "Flowers", "colony"], Reach: ["pods", "Pods", "pods"] };
  const COND_CAT = ["Temperature", "Water", "Soil", "Hazard"];
  const catStyle = c => { const k = CAT_COLOR[c]; return k ? `--cat:${k[0]};--cat-soft:${k[1]};--cat-dark:${k[2]}` : ""; };
  const LAMP_ST = { green: "ok", yellow: "warn", red: "bad" }, ST_WORD = { ok: "OK", warn: "Strained", bad: "Blocked" }, ST_ICON = { ok: "check", warn: "alert", bad: "x" };
  const LENSES = [["", "Plants", "off"], ["Temperature", "Temperature", "temp"], ["Water", "Water", "water"], ["Soil", "Soil", "soil"], ["Hazard", "Hazard", "hazard"]];
  const chip = (st, word) => `<span class="stc ${st}">${ico(ST_ICON[st])}${esc(word || ST_WORD[st])}</span>`;
  // Concept 18 ORGANIC tendril weights (owner-approved; docs/UI_CONCEPT_REVIEW_v10.md §3): [em, px floor]
  const TENDRIL = { idle: [0.52, 8.5], lit: [0.8, 12.5], glow: 1.9, vein: [0.12, 2] }, TENSION = [0.3, 0.26], PORT_R = 0.66, RAIL_X = 1.5, STEP_MAX = 5.4, CAT_GAP = 0.35;
  const tendrilW = (k, em) => Math.max(TENDRIL[k][0] * em, TENDRIL[k][1]);
  // room scale: the largest em at which THREE median-length real region chips fit across the right column, capped by the height
  const DESIGN_H = 40, EM_MIN = 12, EM_MAX = 22, CHIPS = 3, CHIP_SLACK = 0.8; // em of slack beside the three chips

  let instance = null;
  function mount(view) {
    if (instance) return instance;
    if (!view || !view.adapter || !view.rooms || typeof view.rooms.register !== "function") throw new TypeError("BLOOM.decisionRooms: needs the production Planet View instance (BLOOM.planetView.mount)");
    const A = view.adapter, RM = root.BLOOM.runMap, SF = root.BLOOM.surface, PS = root.BLOOM.plantSpecimen;
    if (!RM || !SF || !PS) throw new TypeError("BLOOM.decisionRooms: needs BLOOM.runMap, BLOOM.surface and BLOOM.plantSpecimen");
    const mq = root.matchMedia ? root.matchMedia("(prefers-reduced-motion: reduce)") : null;
    const reduced = () => !!(mq && mq.matches) || document.documentElement.classList.contains("reduce-motion") || view.el.classList.contains("reduced");
    const MAP0 = A.map(), IDX = {}; MAP0.regions.forEach(r => { IDX[r.id] = r.index; });
    const idx = list => (list || []).map(id => IDX[id]).filter(i => i >= 0);
    const names = list => (list || []).map(id => (regs.find(r => r.id === id) || {}).name || id).join(", ");
    const origin = () => (regs.find(r => r.isOrigin) || regs[0]).index;
    let regs = A.regions();
    // presentation state only: the run has one pause (the page's); this remembers what the room must restore
    const state = { room: null, ctx: -1, wasRunning: null, opener: null, peek: -1, lens: null, lensPv: null, em: 16, emBy: "", preview: null, hovered: null, suspended: false };

    // ---------------------------------------------------------------- the layer (inside the Planet View, over the veil)
    const layer = document.createElement("div"); layer.className = "dr"; layer.id = "dr"; layer.hidden = true; view.el.appendChild(layer);
    const live = m => { const l = view.el.querySelector("#pvLive"); if (l) l.textContent = m; };
    const parts = view.rooms.parts();
    const rooms = {}; const miniMaps = [];

    // ---------------------------------------------------------------- scale calibration ("three chips across")
    const medianName = (() => { const ns = regs.map(r => r.name).sort((a, b) => a.length - b.length); return ns[Math.floor(ns.length / 2)] || "Region"; })();
    const probe = document.createElement("section"); probe.className = "dr-probe"; probe.setAttribute("aria-hidden", "true"); // never shown; never a room
    probe.innerHTML = `<header class="rh"></header><div class="rz z-focus"></div><div class="rz z-main"></div><div class="rz z-map"><div class="mm"><div class="mm-strip"><span class="rc st-ok living"><span class="rs">${ico("check")}</span>${esc(medianName)}</span></div></div></div>`;
    layer.appendChild(probe);
    function calibrate() {
      const W = layer.clientWidth || view.el.clientWidth, H = layer.clientHeight || view.el.clientHeight; if (!W || !H) return state.em;
      const strip = probe.querySelector(".mm-strip"), chipEl = probe.querySelector(".rc");
      const at = px => { probe.style.fontSize = px + "px"; const s = strip.getBoundingClientRect().width, c = chipEl.getBoundingClientRect().width, g = parseFloat(getComputedStyle(strip).columnGap) || 0; return { s, c, g }; };
      const m10 = at(10), m20 = at(20), chrome = (m10.s - m20.s) / 10, pctW = m10.s + 10 * chrome, chipEm = m20.c / 20, gapEm = m20.g / 20;
      const byChips = pctW / (CHIPS * chipEm + (CHIPS - 1) * gapEm + chrome + CHIP_SLACK), byHeight = H / DESIGN_H; // comfortably: a little slack
      const em = Math.round(Math.max(EM_MIN, Math.min(EM_MAX, byChips, byHeight)) * 10) / 10;
      state.em = em; state.emBy = byChips <= byHeight ? "chips" : "height"; state.emChips = Math.round(byChips * 10) / 10; state.emHeight = Math.round(byHeight * 10) / 10;
      layer.style.setProperty("--room-em", em + "px"); return em;
    }

    // ---------------------------------------------------------------- shared pieces
    const lampSt = r => r.limiting && r.limiting.blocked ? "bad" : LAMP_ST[r.lamp] || "ok";
    const limitLine = r => r.limiting.blocked ? `${cap(r.limiting.key)}: ${r.limiting.text}` : r.limiting.softSoil ? "Growing · the soil is marginal here" : "Nothing holding the plant back";
    const traitTiers = () => { const t = {}, nm = {}; for (const b of A.upgrades()) if (b.board !== "Terraform") for (const u of b.items) { t[u.id] = u.tier; nm[u.id] = u.name; } return { tiers: t, names: nm }; };
    const specState = (i, preview) => { const r = A.region(i), c = A.colony(i), { tiers, names: nm } = traitTiers();
      return { traits: tiers, names: nm, preview: preview || null, colony: { living: c.living, establishment: r.colony.establishment, word: r.colony.word }, focus: c.focus, local: c.localUpgrade,
        condition: lampSt(r), viable: !r.limiting.blocked, region: { name: r.name } }; };
    const specCaption = r => !r.living ? (r.limiting.blocked ? "No colony yet · would not survive yet" : "No colony yet") : `${r.colony.label} · ${lampSt(r) === "ok" ? "thriving" : "stressed"}`;
    function roomShell(id) {
      const R = ROOMS[id], sec = document.createElement("section"); sec.className = `dr-room r-${id}`; sec.dataset.room = id; sec.hidden = true; sec.setAttribute("role", "dialog"); sec.setAttribute("aria-modal", "true"); sec.setAttribute("aria-labelledby", `drt-${id}`);
      sec.innerHTML = `<header class="rh">` +
          `<button type="button" class="rb back" data-act="back">${ico("back")}<span>Back</span></button>` +
          `<div class="rt"><span class="rk">${esc(R.kicker)}</span><h2 id="drt-${id}" tabindex="-1">${esc(R.title)}</h2><small>${esc(R.verb)}</small></div>` +
          `<nav class="rnav" aria-label="Rooms">` + ROOM_IDS.map(k => `<button type="button" class="rn ${ROOMS[k].kind}" data-go="${k}" aria-pressed="${k === id}"${k === "terraform" ? ' data-room="unavailable" aria-disabled="true" title="Terraform (arrives in BLOOM-029D)"' : ""}>${ico(ROOMS[k].ico)}<span>${esc(ROOMS[k].title)}</span></button>`).join("") + `</nav>` +
          `<div class="rbio" title="Biomass: the energy your plant has stored">${ico("coin")}<b class="rbio-n">0</b><small>Biomass</small></div>` +
          `<div class="paused on" role="status"><span class="pi">${ico("pause")}</span><b>PAUSED</b></div>` +
          `<button type="button" class="rb resume" data-act="resume">${ico("play")}<span>Resume</span></button>` +
        `</header><div class="rz z-focus"></div><div class="rz z-main"></div><div class="rz z-map"></div>`;
      layer.appendChild(sec); return sec;
    }
    // the right column: a mini-map card (the production renderer on its own canvas; room context outlined, peeks on hover), Map
    // View chips, the region strip (click = context, hover / focus = peek), and a separate content-height context / effect card
    function mapBlock(id, host, ctxHTML) {
      host.innerHTML = `<div class="mm"><div class="mm-h"><span class="mm-k">${id === "region" ? "Looking at" : "Considering for"}</span><b class="mm-name"></b><span class="mm-st"></span></div>` +
        `<div class="mm-map"><canvas class="mm-cv" tabindex="-1" aria-label="Smaller planet map: click a region to consider it"></canvas></div>` +
        `<p class="mm-peek" aria-live="polite">Hover a region to peek · click to switch</p>` +
        `<div class="mm-lens" role="group" aria-label="Map View layer (hover previews, click sets)">${LENSES.map(([k, n, ic]) => `<button type="button" class="lb" data-lens="${k}" aria-pressed="${k === ""}" title="${esc(n)}">${ico(ic)}<span>${esc(n)}</span></button>`).join("")}</div>` +
        `<div class="mm-strip" role="group" aria-label="Switch region"></div></div>` + (ctxHTML || "");
      const cv = host.querySelector(".mm-cv"), mapBox = host.querySelector(".mm-map"), peek = host.querySelector(".mm-peek"), strip = host.querySelector(".mm-strip"), nameEl = host.querySelector(".mm-name"), stEl = host.querySelector(".mm-st"), ctxEl = host.querySelector(".mm-ctx");
      let dirty = true;
      // the same production renderer as the main map, on this card's canvas; the frame outside the planet is the card's own cream
      const R = RM.createRenderer(cv, { surface: SF, reducedMotion: reduced, frame: [255, 253, 247], onInvalidate: () => { dirty = true; } }); R.setSource(A.surface()); let skyKey = "";
      // whole-pixel tiles rarely fill the box's height exactly: the box takes the planet's real pixel height, so no bars show above / below
      const relayout = () => { const r = mapBox.getBoundingClientRect(); if (!r.width || !r.height) return; const dpr = Math.max(1, Math.min(2, root.devicePixelRatio || 1));
        const g = R.layout({ width: r.width, height: r.height, dpr }); const want = g.worldHeight; if (want && Math.abs(want - r.height) > 1) { mapBox.style.height = want + "px"; R.layout({ width: r.width, height: want, dpr }); } dirty = true; };
      new ResizeObserver(relayout).observe(mapBox);
      strip.innerHTML = regs.map(r => `<button type="button" class="rc" data-r="${r.index}" aria-pressed="false"><span class="rs"></span>${r.isOrigin ? ico("star", "org") : ""}${esc(r.name)}</button>`).join("");
      const peekText = i => { if (i < 0) { peek.textContent = "Hover a region to peek · click to switch"; peek.classList.remove("on"); return; } const r = A.region(i);
        peek.innerHTML = `<b>${esc(r.name)}</b> · ${esc(r.colony.label)} · ${esc(limitLine(r))}`; peek.classList.add("on"); };
      // hover / focus of a chip or the mini-map = a PEEK: the mini-map outlines that region and the line reads it; leaving restores the context
      const pk = i => { if (state.peek === i) return; state.peek = i; peekText(i); strip.querySelectorAll(".rc.pk").forEach(b => b.classList.remove("pk")); if (i >= 0) { const b = strip.querySelector(`[data-r="${i}"]`); if (b) b.classList.add("pk"); } dirty = true; };
      strip.addEventListener("click", e => { const b = e.target.closest("[data-r]"); if (b) setCtx(+b.dataset.r, "strip"); });
      strip.addEventListener("pointerover", e => { const b = e.target.closest("[data-r]"); pk(b ? +b.dataset.r : -1); });
      strip.addEventListener("pointerout", e => { const b = e.target.closest("[data-r]"); if (!b) return; const to = e.relatedTarget; if (!to || !(to.closest && to.closest("[data-r]") === b)) pk(-1); });
      strip.addEventListener("pointerleave", () => pk(-1)); strip.addEventListener("pointercancel", () => pk(-1));
      strip.addEventListener("focusin", e => { const b = e.target.closest("[data-r]"); if (b) pk(+b.dataset.r); });
      strip.addEventListener("focusout", e => { if (!strip.contains(e.relatedTarget)) pk(-1); });
      cv.addEventListener("pointermove", e => { if (e.pointerType === "touch") return; const h = R.hitTest(e.clientX, e.clientY); pk(h.region >= 0 ? h.region : -1); cv.classList.toggle("over", h.region >= 0); });
      cv.addEventListener("pointerleave", () => { pk(-1); cv.classList.remove("over"); });
      cv.addEventListener("click", e => { const h = R.hitTest(e.clientX, e.clientY); if (h.region >= 0) setCtx(h.region, "map"); });
      const paintStrip = () => { strip.querySelectorAll("[data-r]").forEach(b => { const r = regs[+b.dataset.r]; if (!r) return; const st = r.blocked ? "bad" : LAMP_ST[r.lamp] || "ok";
        b.className = `rc st-${st}${r.living > 0 ? " living" : ""}${state.peek === r.index ? " pk" : ""}`; b.setAttribute("aria-pressed", String(r.index === state.ctx)); b.querySelector(".rs").innerHTML = ico(ST_ICON[st]); b.title = `${r.name}: ${ST_WORD[st]}`; }); };
      function frame() {
        if (!dirty) return; dirty = false;
        const src = A.hud(), key = `${src.skyNow.temp.toFixed(3)}|${src.skyNow.moist.toFixed(3)}`; if (key !== skyKey) { skyKey = key; R.setSky({ temperature: src.skyNow.temp, moisture: src.skyNow.moist }); }
        const shown = state.lensPv !== null ? (state.lensPv || null) : state.lens, pv = state.preview, sc = A.scenario(), fx = A.effects();
        R.draw({ tiles: shown ? null : A.mapState(), regions: regs, selected: -1, hover: state.peek, focus: state.ctx,
          preview: pv && pv.available ? { gain: idx(pv.gain), lose: idx(pv.lose), reachHostile: idx(pv.reachHostile), better: pv.better && pv.better.length ? idx(pv.better) : null, worse: idx(pv.worse) } : null,
          effects: { crossings: fx.crossings, crossingTiming: fx.crossingTiming, thresholds: fx.thresholds, competition: fx.competition, skyChange: null },
          bubbles: A.bubbles(), layer: shown ? { key: shown, lamps: layerLamps(shown) } : null, haze: sc.pressure ? sc.pressure.progress : 0, tints: [], labels: false, now: performance.now() });
      }
      const mm = { R, cv, ctx: ctxEl, strip, paintStrip, frame, relayout, invalidate: () => { dirty = true; }, pk,
        paint() { if (state.ctx < 0) return; const r = A.region(state.ctx); nameEl.textContent = r.name; stEl.innerHTML = chip(lampSt(r)); paintStrip(); if (state.peek < 0) peekText(-1); dirty = true; } };
      miniMaps.push(mm); return mm;
    }
    let condCache = null, condAt = 0;
    function layerLamps(key) { const t = performance.now(); if (!condCache || t - condAt > 400) { condCache = regs.map(r => A.region(r.index).conditions); condAt = t; }
      return condCache.map(cs => { const c = cs.find(x => x.key === key); return c ? c.lamp : "green"; }); }
    // Map View chips in every room share one room lens (presentation only; the Planet View's committed lens is never touched)
    function paintLens() { layer.querySelectorAll("[data-lens]").forEach(b => { const k = b.dataset.lens || null; b.setAttribute("aria-pressed", String(k === state.lens));
      b.classList.toggle("pvw", state.lensPv !== null && (b.dataset.lens || "") === state.lensPv && (state.lensPv || null) !== state.lens); }); miniMaps.forEach(m => m.invalidate()); }
    const setLens = k => { state.lens = k || null; state.lensPv = null; paintLens(); live(state.lens ? `Mini-map layer: ${state.lens}` : "Mini-map layer: plants"); };
    const previewLens = k => { state.lensPv = k === undefined ? null : (k || ""); paintLens(); };
    layer.addEventListener("click", e => { const b = e.target.closest("[data-lens]"); if (b) setLens(b.dataset.lens); });
    layer.addEventListener("pointerover", e => { const b = e.target.closest("[data-lens]"); if (b) previewLens(b.dataset.lens); });
    layer.addEventListener("pointerout", e => { const b = e.target.closest("[data-lens]"); if (b && !(e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest("[data-lens]") === b)) previewLens(undefined); });
    layer.addEventListener("focusin", e => { const b = e.target.closest("[data-lens]"); if (b) previewLens(b.dataset.lens); });
    layer.addEventListener("focusout", e => { const b = e.target.closest("[data-lens]"); if (b && !(e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest("[data-lens]"))) previewLens(undefined); });

    // the upper-left plant card (the production specimen + caption) and the content-height information card under it
    function specBlock(host) {
      const wrap = document.createElement("div"); wrap.className = "lf-top"; host.appendChild(wrap);
      const spec = PS.mount(wrap, { reducedMotion: reduced });
      const capEl = document.createElement("div"); capEl.className = "spec-cap"; capEl.innerHTML = `<b class="sc-n"></b><small class="sc-w"></small>`; wrap.appendChild(capEl);
      const info = document.createElement("div"); info.className = "lf-info"; host.appendChild(info);
      return { wrap, spec, cap: capEl, info, caption(r, extra) { capEl.querySelector(".sc-n").textContent = `Your plant in ${r.name}`; capEl.querySelector(".sc-w").textContent = extra || specCaption(r); } };
    }
    const ownedChips = () => { const out = []; for (const b of A.upgrades()) if (b.board !== "Terraform") for (const u of b.items) if (u.owned) out.push(`<span class="ow" style="${catStyle(u.uiCategory)}">${ico(I[u.id] ? u.id : CAT_ICON[u.uiCategory])}${esc(u.name)}${u.tier > 1 ? ` <i>${ROMAN[u.tier] || u.tier}</i>` : ""}</span>`);
      return out.length ? out.join("") : `<span class="ow none">No adaptations yet</span>`; };
    function zoneHeight(sec) { const rr = sec.getBoundingClientRect(), hh = sec.querySelector(".rh").getBoundingClientRect(), cs = getComputedStyle(sec); return Math.floor(rr.bottom - parseFloat(cs.paddingBottom) - hh.bottom - (parseFloat(cs.rowGap) || 0)); }

    // ---------------------------------------------------------------- Region Inspect: Overview · Colony · Science (real tabs)
    function buildRegion() {
      const id = "region", sec = roomShell(id), zf = sec.querySelector(".z-focus"), zm = sec.querySelector(".z-main"), zmap = sec.querySelector(".z-map");
      const sp = specBlock(zf);
      const mm = mapBlock(id, zmap, `<div class="mm-ctx"><span class="mc-k">This region now</span><div class="mc-rows"></div></div>`);
      const TABS = [["overview", "Overview", "overview"], ["colony", "Colony", "colony"], ["science", "Science", "science"]];
      zm.innerHTML = `<div class="rg-head"><h3 class="rg-name"></h3><div class="rg-sub"></div></div>` +
        `<div class="tabs" role="tablist" aria-label="Region details">${TABS.map(([t, n, ic], k) => `<button type="button" role="tab" id="drtab-${t}" aria-controls="drpane-${t}" aria-selected="${k === 0}" tabindex="${k ? -1 : 0}">${ico(ic)}${n}</button>`).join("")}</div>` +
        TABS.map(([t], k) => `<section class="pane" id="drpane-${t}" role="tabpanel" aria-labelledby="drtab-${t}" tabindex="0"${k ? " hidden" : ""}><div class="pb"></div></section>`).join("");
      const tabs = [...zm.querySelectorAll('[role="tab"]')];
      const showTab = t => { tabs.forEach(b => { const on = b.id === "drtab-" + t; b.setAttribute("aria-selected", String(on)); b.tabIndex = on ? 0 : -1; }); TABS.forEach(([x]) => { zm.querySelector("#drpane-" + x).hidden = x !== t; }); };
      tabs.forEach((b, k) => { b.addEventListener("click", () => showTab(b.id.slice(6)));
        b.addEventListener("keydown", e => { const d = { ArrowRight: 1, ArrowLeft: -1, Home: -k, End: tabs.length - 1 - k }[e.key]; if (d === undefined) return; e.preventDefault(); const n = tabs[((k + d) % tabs.length + tabs.length) % tabs.length]; showTab(n.id.slice(6)); n.focus(); }); });
      const helpBtn = u => `<button type="button" class="hbtn hb ${u.board === "Terraform" ? "planet" : u.board === "Spread" ? "spread" : "plant"}" data-go="${u.board.toLowerCase()}" data-item="${esc(u.id)}">${ico(I[u.id] ? u.id : u.board.toLowerCase())}<span class="hb-t"><b>${esc(u.name)}</b><small>${u.board}</small></span></button>`;
      function paint() {
        if (state.ctx < 0) return; const i = state.ctx, r = A.region(i), c = A.colony(i), st = lampSt(r), help = A.wouldHelp(i) || [];
        sp.spec.highlight(null); sp.spec.render(specState(i)); sp.caption(r);
        const focusName = (c.focusChoices.find(f => f.selected) || {}).name || cap(c.focus);
        sp.info.innerHTML = `<span class="li-k">This colony</span><div class="li-h"><span class="ni">${ico(c.living ? "colony" : "off")}</span><div><b>${esc(r.colony.label)}</b><small>${c.living ? `${Math.round(r.colony.establishment * 100)} % established · focus ${esc(focusName)}${c.localUpgradeName ? ` · ${esc(c.localUpgradeName)}` : ""}` : esc(r.colony.hint)}</small></div></div>` +
          `<div class="li-row">${ico(r.limiting.blocked ? ST_ICON.bad : "check")}<span><b>${r.limiting.blocked ? "Holding it back:" : "Limiting factor:"}</b> ${esc(limitLine(r))}</span></div>` +
          `<div class="ownd"><small>Your plant everywhere · Adapt and Spread</small>${ownedChips()}</div>`;
        zm.querySelector(".rg-name").textContent = r.name; zm.querySelector(".rg-sub").innerHTML = chip(st) + `<span class="rg-w" data-tutorial-note="colony">${esc(r.colony.label)}</span>` + (r.isOrigin ? `<span class="rg-o">${ico("star")}Origin</span>` : "");
        const conds = r.conditions.map(cd => { const s = LAMP_ST[cd.lamp] || "ok", reading = cap(cd.word) + (cd.key === "Temperature" ? ` · ${degC(r.temperature.ground)}` : "");
          return `<div class="cond st-${s}" data-cat="${cd.key}" style="${catStyle(cd.key)}"><span class="cond-i">${ico(CAT_ICON[cd.key])}</span><span class="cnm">${cd.key}</span>${chip(s)}<span class="ct">${esc(reading)}</span></div>`; }).join("");
        const lim = r.limiting.blocked ? `<div class="limbox st-bad">${ico(CAT_ICON[r.limiting.key] || "alert")}<div><small>Holding the plant back · ${esc(r.limiting.key)}</small><b>${esc(cap(r.limiting.text))}</b></div></div>`
          : `<div class="limbox st-${st}">${ico("check")}<div><small>Limiting factor</small><b>${r.limiting.softSoil ? "None: it grows here, though the soil is marginal." : "None: this region suits your plant."}</b></div></div>`;
        const helpHtml = `<div class="help n${Math.min(help.length, 2) || 1}"><small>Would help</small>${help.length ? `<div class="help-b">${help.map(helpBtn).join("")}</div>` : `<span class="none">${r.limiting.blocked ? "No offered upgrade opens it right now" : "Nothing needed"}</span>`}</div>`;
        zm.querySelector("#drpane-overview .pb").innerHTML = conds + lim + helpHtml;
        // Colony: the real growth focus + local upgrade (adapter.colony: selected, availability, ownership, price, block reason, synergy)
        const est = c.living ? r.colony.establishment : 0;
        const focusBtns = c.focusChoices.map(f => `<button type="button" class="opt" data-focus="${f.id}" data-tutorial="focus-${f.id}" aria-pressed="${f.selected}" aria-disabled="${!f.available}" title="${esc(f.description)}">${ico(f.id)}<span><b>${esc(f.name)}</b><small>${esc(f.summary)}</small></span></button>`).join("");
        const localBtns = c.localChoices.map(l => { const owned = c.localUpgrade === l.id, off = !owned && !l.available, why = off ? (l.block === "biomass" ? `Needs ${c.localPrice} Biomass` : l.block === "taken" || c.localUpgrade ? `This colony already has ${c.localUpgradeName}` : cap(l.block)) : "";
          return `<button type="button" class="opt" data-spec="${l.id}" data-tutorial="local-${l.id}" aria-pressed="${owned}" aria-disabled="${off}" title="${esc(l.description)}${why ? " — " + esc(why) : ""}">${ico(l.id)}<span><b>${esc(l.name)}</b><small>${owned ? "Built here" + (l.mode === c.focus ? ` · focus matches: +${Math.round(c.synergy * 100)}%` : "") : off ? esc(why) : esc(l.summary)}</small></span></button>`; }).join("");
        zm.querySelector("#drpane-colony .pb").innerHTML = `<div class="est"><div class="est-h"><b>${esc(r.colony.label)}</b><small>${Math.round(est * 100)} % established</small></div><div class="bar"><i style="width:${Math.round(est * 100)}%"></i></div><p class="note">${esc(r.colony.hint)}</p></div>` +
          `<div class="ctl" data-tutorial="growth-focus"><small class="lab">Growth focus</small><div class="opts">${focusBtns}</div>${c.living ? `<p class="note">${esc((c.focusChoices.find(f => f.selected) || {}).description || "")}</p>` : `<p class="note">Grow a colony here first: focus and local upgrades belong to a living colony.</p>`}</div>` +
          `<div class="ctl" data-tutorial="local-upgrade"><small class="lab">Local upgrade · ${c.localPrice} Biomass</small><div class="opts">${localBtns}</div><p class="note">When the colony's focus matches its upgrade, the upgrade works ${Math.round(c.synergy * 100)}% better.${c.tip ? " " + esc(c.tip) : ""}</p></div>`;
        // Science: the eight real readings (adapter.region().raw), in player words
        const R = r.raw, rows = [["Ground temperature", `${degC(R.effectiveTemp)}`, "what the plant feels: sky + this region"], ["Ground moisture", num(R.effectiveMoist), "sky moisture + this region"], ["Light", num(R.light), ""], ["Soil pH", num(R.ph), ""],
          ["Salinity", num(R.salinity), ""], ["Nutrients", num(R.nutrients), ""], ["Toxicity", num(R.toxicity), ""], ["Radiation", R.effectiveRadiation !== R.radiation ? `${num(R.radiation)} · ${num(R.effectiveRadiation)} at the surface` : num(R.radiation), R.effectiveRadiation !== R.radiation ? "the sky adds to it" : ""]];
        zm.querySelector("#drpane-science .pb").innerHTML = `<table class="rawt" data-tutorial="raw-signals"><tbody>${rows.map(([k, v, n]) => `<tr><th scope="row">${esc(k)}${n ? `<small>${esc(n)}</small>` : ""}</th><td>${esc(v)}</td></tr>`).join("")}</tbody></table>` +
          `<p class="note">Eight readings sit under the four categories above. Your plant suits ${degC(r.temperature.plantMin)} to ${degC(r.temperature.plantMax)}.</p>`;
        mm.paint(); mm.ctx.querySelector(".mc-rows").innerHTML = `<div class="mc-row">${ico("colony")}<span><b>${esc(r.colony.label)}</b> · ${esc(r.vitals.living)} living of ${esc(r.vitals.area)} tiles</span></div>` +
          `<div class="mc-row">${ico(r.limiting.blocked ? "x" : "check")}<span>${esc(limitLine(r))}</span></div>` + (r.geo && r.geo.note ? `<div class="mc-row">${ico("reach")}<span>${esc(r.geo.note)}</span></div>` : "");
      }
      zm.addEventListener("click", e => {
        const f = e.target.closest("[data-focus]"); if (f) { if (f.getAttribute("aria-disabled") !== "true") A.actions.setGrowthFocus(state.ctx, f.dataset.focus); return; }
        const s = e.target.closest("[data-spec]"); if (s) { if (s.getAttribute("aria-disabled") !== "true") A.actions.buyLocalUpgrade(state.ctx, s.dataset.spec); return; }
        const g = e.target.closest("[data-go]"); if (g) view.openRoom(g.dataset.go, { region: state.ctx, item: g.dataset.item || null, opener: state.opener });
      });
      rooms[id] = { sec, mm, paint, onOpen: paint, clear() { mm.pk(-1); }, focusFirst: () => sec.querySelector("h2").focus() };
    }

    // ---------------------------------------------------------------- Adapt / Spread: one family (real tree + organic tendrils)
    function buildBoard(id) {
      const sec = roomShell(id), R0 = ROOMS[id], BOARD = R0.board, zf = sec.querySelector(".z-focus"), zm = sec.querySelector(".z-main"), zmap = sec.querySelector(".z-map");
      const mm = mapBlock(id, zmap, `<div class="mm-ctx"><span class="mc-k">Region effect of this choice</span><div class="mc-rows"><div class="mc-row"><b class="mc-open">Hover a skill to see what it does for this region</b></div></div></div>`);
      const sp = specBlock(zf);
      zm.dataset.tutorial = id === "adapt" ? "upgrades" : ""; if (!zm.dataset.tutorial) delete zm.dataset.tutorial;
      const tree = document.createElement("div"); tree.className = `tree b-${id}`; tree.dataset.tutorial = `board-${id}`; tree.setAttribute("role", "group"); tree.setAttribute("aria-label", `${R0.title} upgrades`); zm.appendChild(tree);
      const edges = document.createElementNS("http://www.w3.org/2000/svg", "svg"); edges.setAttribute("class", "edges"); edges.setAttribute("aria-hidden", "true"); tree.appendChild(edges);
      const leaders = document.createElementNS("http://www.w3.org/2000/svg", "svg"); leaders.setAttribute("class", "dr-leaders"); leaders.setAttribute("aria-hidden", "true"); sec.appendChild(leaders);
      let items = [], cats = [], nodeEls = {}, lbls = {}, L = null, fitRaf = 0;
      const nodeState = u => u.canBuy ? "avail" : u.rules ? "poor" : u.owned ? "owned" : "blocked";
      const stateWord = u => { const st = nodeState(u), t = u.tier ? `Tier ${ROMAN[u.tier] || u.tier} owned` : "";
        if (st === "avail" || st === "poor") return (t ? t + " · next " : "") + `${u.price} Biomass`;
        if (st === "owned") return t + (u.maxTier !== null && u.tier >= u.maxTier ? " · complete" : "");
        return u.reason ? cap(u.reason) : "Not available now"; };
      // the REAL tree: offered items of this board from the adapter, grouped by the content's presentation category
      function readTree() {
        const b = A.upgrades().find(x => x.board === BOARD); items = b ? b.items : []; cats = CATS[BOARD].filter(c => items.some(u => u.uiCategory === c));
        const want = new Set(items.map(u => u.id)); for (const k of Object.keys(nodeEls)) if (!want.has(k)) { nodeEls[k].remove(); delete nodeEls[k]; }
        for (const u of items) if (!nodeEls[u.id]) { const n = document.createElement("button"); n.type = "button"; n.className = "node card"; n.dataset.node = u.id; n.dataset.cat = u.uiCategory; n.dataset.tutorial = `upgrade-${u.id}`; n.setAttribute("style", catStyle(u.uiCategory)); tree.appendChild(n); nodeEls[u.id] = n; }
        for (const c of Object.keys(lbls)) if (!cats.includes(c)) { lbls[c].remove(); delete lbls[c]; }
        for (const c of cats) if (!lbls[c]) { const l = document.createElement("div"); l.className = "cat-l"; l.dataset.cat = c; l.setAttribute("style", catStyle(c)); l.innerHTML = `${ico(CAT_ICON[c])}<span>${esc(c)}</span>`; l.title = c; tree.appendChild(l); lbls[c] = l; }
      }
      function paintNodes() {
        for (const u of items) { const n = nodeEls[u.id], st = nodeState(u);
          n.className = `node card st-${st}${u.owned ? " has" : ""}${state.hovered === u.id ? " pvw" : ""}`;
          n.innerHTML = `<span class="ni">${ico(I[u.id] ? u.id : CAT_ICON[u.uiCategory])}${u.owned ? `<span class="nl ok">${ico("check")}</span>` : st === "blocked" ? `<span class="nl">${ico("lock")}</span>` : ""}</span><span class="nt"><b>${esc(u.name)}</b><small>${esc(stateWord(u))}</small></span>`;
          n.setAttribute("aria-label", `${u.name}, ${u.uiCategory}. ${stateWord(u)}. ${u.sub}${u.canBuy ? ". Press to buy" : ""}`); n.setAttribute("aria-disabled", String(!u.canBuy)); n.title = u.sub; }
        paintEdges(); fitTitles();
      }
      function fitTitles() { for (const u of items) { const b = nodeEls[u.id].querySelector(".nt b"); if (!b) continue; b.style.removeProperty("--fit"); if (b.scrollWidth > b.clientWidth + 0.5) b.style.setProperty("--fit", Math.max(0.8, Math.floor(b.clientWidth / b.scrollWidth * 100) / 100)); } }
      // layout (px, from the room em): a category rail at the left, one row per real trait, grouped by category; the row step is
      // capped so a small tree (Spread) stays compact and its card ends where the tree ends (dims.wantH)
      function layout(w, h, em) {
        const PAD = 1 * em, hOf = id => nodeEls[id].offsetHeight || 3.9 * em, railX = RAIL_X * em, right = 0.7 * em;
        let labelW = 8.2 * em, left = railX + labelW + 0.9 * em, nw = w - left - right, labelMode = "full";
        if (nw < 9.4 * em) { labelW = 2.8 * em; left = railX + labelW + 0.9 * em; nw = w - left - right; labelMode = "icon"; }
        nw = Math.max(7 * em, Math.min(13 * em, nw));
        const rowsOf = [], anchors = {}; let slot = 0;
        for (const c of cats) { const start = slot; for (const u of items.filter(x => x.uiCategory === c)) { rowsOf.push({ id: u.id, slot: slot + 0.5 }); slot += 1; } anchors[c] = [start, slot]; slot += CAT_GAP; }
        const total = slot - CAT_GAP, first = rowsOf[0], last = rowsOf[rowsOf.length - 1];
        const padT = (first ? hOf(first.id) : 3.9 * em) / 2 + PAD, padB = (last ? hOf(last.id) : 3.9 * em) / 2 + PAD, rows = Math.max(1, total - 1);
        const step = Math.min(STEP_MAX * em, (h - padT - padB) / rows), wantH = padT + rows * STEP_MAX * em + padB;
        const pos = {}; for (const r of rowsOf) pos[r.id] = { x: left + nw / 2, y: padT + (r.slot - 0.5) * step };
        const ports = {}; for (const c of cats) { const ys = items.filter(u => u.uiCategory === c).map(u => pos[u.id].y); ports[c] = { x: railX, y: ys.reduce((a, b) => a + b, 0) / ys.length, lx: railX + 0.8 * em }; }
        return { pos, ports, nw, labelMode, railX, wantH, railTop: Math.min(...cats.map(c => ports[c].y)), railBottom: Math.max(...cats.map(c => ports[c].y)), tight: nw < 9 * em, em };
      }
      function relayout(pass) {
        const w = tree.clientWidth, h = tree.clientHeight; if (!w || !h) return; const em = state.em; const hs = items.map(u => nodeEls[u.id].offsetHeight).join();
        L = layout(w, h, em); tree.style.setProperty("--nw", L.nw + "px"); tree.classList.toggle("tight", L.tight); tree.classList.toggle("lab-icon", L.labelMode === "icon");
        edges.setAttribute("viewBox", `0 0 ${w} ${h}`); edges.setAttribute("width", w); edges.setAttribute("height", h);
        for (const u of items) { const p = L.pos[u.id]; nodeEls[u.id].style.left = p.x + "px"; nodeEls[u.id].style.top = p.y + "px"; }
        for (const c of cats) { const a = L.ports[c]; lbls[c].style.left = a.lx + "px"; lbls[c].style.top = a.y + "px"; lbls[c].querySelector("span").hidden = L.labelMode === "icon"; }
        paintEdges(); fitTitles();
        if (!pass && items.map(u => nodeEls[u.id].offsetHeight).join() !== hs) return relayout(1);
        fitMain(); drawLeaders();
      }
      // content-height tree card: as tall as the tree wants (capped row step), up to the room's free height; next frame, so the
      // tree's own ResizeObserver never loops on itself
      function fitMain() { if (!L) return; cancelAnimationFrame(fitRaf); fitRaf = requestAnimationFrame(() => { const avail = zoneHeight(sec); if (!avail || avail < 0) return; const h = Math.min(Math.ceil(L.wantH) + 4, avail); if (Math.abs(parseFloat(zm.style.height || "0") - h) > 1) zm.style.height = h + "px"; }); }
      const svgEl = (tag, attrs, parent) => { const e = document.createElementNS("http://www.w3.org/2000/svg", tag); for (const k in attrs) e.setAttribute(k, attrs[k]); (parent || edges).appendChild(e); return e; };
      const curveH = (a, b) => { const mx = (a.x + b.x) / 2; return `M${a.x} ${a.y}C${mx} ${a.y},${mx} ${b.y},${b.x} ${b.y}`; };
      function paintEdges() {
        if (!L) return; edges.textContent = ""; const em = state.em;
        svgEl("path", { class: "edge rail-e", d: `M${L.railX} ${L.railTop}V${L.railBottom}` });
        for (const u of items) { const a = L.ports[u.uiCategory], p = L.pos[u.id], st = nodeState(u); const e = svgEl("path", { class: `edge ${u.owned ? "on" : st === "blocked" ? "off" : "open"}${state.hovered === u.id ? " on" : ""}`, d: curveH(a, { x: p.x - L.nw / 2, y: p.y }) }); e.setAttribute("style", catStyle(u.uiCategory)); }
        for (const c of cats) { const a = L.ports[c], lit = state.hovered && (items.find(u => u.id === state.hovered) || {}).uiCategory === c; const port = svgEl("circle", { class: `port${lit ? " on" : ""}`, cx: a.x, cy: a.y, r: PORT_R * em }); port.setAttribute("style", catStyle(c)); port.dataset.cat = c; }
      }
      // ORGANIC tendrils (the only treatment): plant anchor → label plate → thick tendril → tree port, one per category, same
      // x-profile and top → bottom order on both ends, so none can cross. Weights follow the room em (Concept 18 §3).
      function drawLeaders() {
        if (!L || sec.hidden) return; const rr = sec.getBoundingClientRect(); leaders.setAttribute("viewBox", `0 0 ${rr.width} ${rr.height}`); leaders.setAttribute("width", rr.width); leaders.setAttribute("height", rr.height); leaders.textContent = "";
        const em = state.em, idle = tendrilW("idle", em), lit = tendrilW("lit", em), vein = tendrilW("vein", em);
        leaders.style.setProperty("--ld-w", idle + "px"); leaders.style.setProperty("--ld-on", lit + "px"); leaders.style.setProperty("--ld-glow", lit * TENDRIL.glow + "px"); leaders.style.setProperty("--vein", vein + "px");
        const box = sp.wrap.getBoundingClientRect(), tr = tree.getBoundingClientRect(), boxR = box.right - rr.left, treeL = tr.left - rr.left, treeT = tr.top - rr.top;
        const on = state.hovered ? (items.find(u => u.id === state.hovered) || {}).uiCategory : null;
        for (const c of cats) { const part = CAT_PART[c], a = sp.spec.anchorPoint(part[0]), port = L.ports[c]; if (!a) continue;
          const Ax = a.x - rr.left, Ay = a.y - rr.top, Bx = treeL + port.x, By = treeT + port.y, x0 = boxR - 0.5 * em, dx = Bx - x0, isLit = on === c;
          const d = `M${Ax} ${Ay}H${x0}C${x0 + dx * TENSION[0]} ${Ay},${Bx - dx * TENSION[1]} ${By},${Bx} ${By}`;
          const g = svgEl("g", { class: `lead-g${isLit ? " on" : ""}`, "data-cat": c }, leaders); g.setAttribute("style", catStyle(c));
          svgEl("path", { class: "ld-glow", d }, g); svgEl("path", { class: `ld${isLit ? " on" : ""}`, d, "data-cat": c }, g); svgEl("path", { class: "vein", d }, g);
          const ar = Math.max(0.72 * em, lit * 0.62);
          svgEl("circle", { class: "anchor-halo", cx: Ax, cy: Ay, r: ar * 1.55 }, g); svgEl("circle", { class: `anchor${isLit ? " on" : ""}`, cx: Ax, cy: Ay, r: ar }, g); svgEl("circle", { class: "anchor-dot", cx: Ax, cy: Ay, r: ar * 0.33 }, g);
          const tw = part[1].length * 0.56 * em * 0.74 + 1.1 * em, th = Math.max(1.45 * em, lit + 0.5 * em), rightSide = Ax + ar + 0.45 * em + tw < boxR - 0.4 * em;
          const px = rightSide ? Ax + ar + 0.4 * em : Ax - ar - 0.4 * em - tw, py = Ay - th / 2;
          svgEl("rect", { class: `aplate${isLit ? " on" : ""}`, x: px, y: py, width: tw, height: th, rx: th / 2 }, g);
          const t = svgEl("text", { class: `alab${isLit ? " on" : ""}`, x: px + tw / 2, y: Ay + 0.27 * em, "text-anchor": "middle" }, g); t.textContent = part[1]; }
        leaders.classList.toggle("dim", !!on);
      }
      // information card + region-effect card: the REAL trait (adapter.upgrade), the real preview result for the room context
      function paintInfoBase() {
        const r = A.region(state.ctx);
        sp.info.innerHTML = `<span class="li-k">${id === "spread" ? "How your plant travels" : "Your plant"} · ${esc(r.name)}</span><div class="li-h"><span class="ni">${ico(R0.ico)}</span><div><b>${esc(r.living ? r.colony.label : r.limiting.blocked ? "Would not survive yet" : "No colony yet")}</b><small>${esc(limitLine(r))}</small></div></div>` +
          `<div class="ownd"><small>${id === "spread" ? "How it travels now" : "Already part of your plant"}</small>${ownedChips()}</div>` +
          `<p class="li-hint">${id === "spread" ? "This changes how your plant travels and takes root everywhere." : "This changes YOUR PLANT, everywhere it grows."} Hover or focus a skill: the plant previews it and the line shows which part changes.</p>`;
        sp.info.classList.remove("pvw"); sp.info.removeAttribute("style"); mm.ctx.removeAttribute("style"); mm.ctx.classList.remove("pvw");
        mm.ctx.querySelector(".mc-rows").innerHTML = `<div class="mc-row">${ico("inspect")}<span><b>${esc(r.name)}</b> · ${esc(r.colony.label)}</span></div><div class="mc-row">${ico(r.limiting.blocked ? "x" : "check")}<span>${esc(limitLine(r))}</span></div><div class="mc-row faint">${ico("info")}<span>Hover a skill to see what it does for this region</span></div>`;
      }
      function effectFor(pv, i) { // the real preview region lists (ids) read for the room context: never recalculated here
        const r = regs[i], rid = r.id, inL = k => (pv[k] || []).includes(rid);
        if (!pv.available) return { icon: "lock", text: pv.text || "Not available now", cls: "off" };
        if (inL("gain")) return { icon: "check", text: `Opens ${r.name}: your plant could take root here.`, cls: "gain" };
        if (inL("lose")) return { icon: "x", text: `Closes ${r.name}: your plant would no longer survive here.`, cls: "lose" };
        if (inL("reachHostile")) return { icon: "reach", text: `${r.name} becomes reachable across water, but is hostile for now.`, cls: "hostile" };
        if (inL("better")) return { icon: "alert", text: `${r.name}: closer to your plant's range, still blocked.`, cls: "better" };
        if (inL("worse")) return { icon: "alert", text: `${r.name}: worse for your plant, but it still grows.`, cls: "worse" };
        return { icon: "info", text: `Unchanged for ${r.name}.`, cls: "same" };
      }
      function paintPreview() {
        const pv = state.preview, u = state.hovered ? items.find(x => x.id === state.hovered) : null;
        if (!u || !pv) { sp.spec.highlight(null); sp.spec.render(specState(state.ctx)); sp.caption(A.region(state.ctx)); paintInfoBase(); return; }
        const part = CAT_PART[u.uiCategory], real = A.upgrade(u.id), r = A.region(state.ctx);
        sp.spec.render(specState(state.ctx, real && real.rules ? { id: u.id, tier: real.tier + 1 } : null)); sp.spec.highlight(part[0]); sp.caption(r, `Preview · ${u.name}`);
        const fx = effectFor(pv, state.ctx), elsewhere = [pv.gain && pv.gain.length ? `<b>Opens:</b> ${esc(names(pv.gain))}` : "", pv.lose && pv.lose.length ? `<b>Closes:</b> ${esc(names(pv.lose))}` : "", pv.reachHostile && pv.reachHostile.length ? `<b>Reachable, hostile:</b> ${esc(names(pv.reachHostile))}` : ""].filter(Boolean);
        sp.info.setAttribute("style", catStyle(u.uiCategory)); sp.info.classList.add("pvw");
        sp.info.innerHTML = `<span class="li-k">Preview · ${esc(u.uiCategory)}</span><div class="li-h"><span class="ni">${ico(I[u.id] ? u.id : CAT_ICON[u.uiCategory])}</span><div><b>${esc(u.name)}</b><small>${esc(stateWord(u))}</small></div></div>` +
          `<p>${esc(cap(u.sub))}.</p>` + (u.science ? `<div class="li-row">${ico("science")}<span><b>In real plants:</b> ${esc(u.science)}</span></div>` : "") +
          `<span class="li-part">${ico(part[2])}Changes ${esc(part[1])}</span>` + (elsewhere.length ? `<div class="li-row">${ico("regions")}<span>${elsewhere.join(" · ")}</span></div>` : "") +
          `<p class="li-hint">${u.canBuy ? "Click or press Enter to buy." : u.rules ? `Needs ${u.price} Biomass.` : esc(cap(u.reason || "Not available now"))}</p>`;
        mm.ctx.setAttribute("style", catStyle(u.uiCategory)); mm.ctx.classList.add("pvw");
        mm.ctx.querySelector(".mc-rows").innerHTML = `<div class="mc-row fx-${fx.cls}">${ico(fx.icon)}<span><b>${esc(fx.text)}</b></span></div>` + (elsewhere.length ? `<div class="mc-row faint">${ico("regions")}<span>${elsewhere.join(" · ")}</span></div>` : "");
      }
      // UPGRADE PREVIEW CONTRACT: a real node previews ONLY while the pointer is over it or it has keyboard focus, through
      // adapter.actions.preview(id) (bloom:upgrade-preview + the home map's outline). Every reset path clears it (no sticky previews).
      function setHover(nid) {
        if (state.hovered === nid) return; state.hovered = nid;
        if (nid) state.preview = A.actions.preview(nid); else { state.preview = null; if (A.activePreview()) A.actions.clearPreview(); }
        paintNodes(); paintPreview(); drawLeaders(); mm.invalidate();
      }
      const clear = () => { if (state.hovered !== null) setHover(null); };
      tree.addEventListener("pointerover", e => { if (state.suspended) return; const b = e.target.closest(".node"); if (b) setHover(b.dataset.node); else clear(); });
      tree.addEventListener("pointermove", e => { if (!state.suspended) return; state.suspended = false; const b = e.target.closest(".node"); if (b) setHover(b.dataset.node); });
      tree.addEventListener("pointerout", e => { const b = e.target.closest(".node"); if (!b) return; const to = e.relatedTarget; if (!to || !(to.closest && to.closest(".node") === b)) clear(); });
      tree.addEventListener("pointerleave", clear); tree.addEventListener("pointercancel", clear);
      tree.addEventListener("focusin", e => { const b = e.target.closest(".node"); if (b) setHover(b.dataset.node); });
      tree.addEventListener("focusout", e => { if (!tree.contains(e.relatedTarget)) clear(); });
      tree.addEventListener("click", e => {
        const b = e.target.closest(".node"); if (!b) return; const u = items.find(x => x.id === b.dataset.node); if (!u) return;
        if (!u.canBuy) { setHover(u.id); return; } // the card and the information card already say why
        if (A.actions.buy(u.id)) { // the real purchase (bloom:upgrade-purchase from the page's own buy); the specimen now shows it for good.
          live(`Bought ${u.name}.`); if (state.hovered === u.id) { state.hovered = null; setHover(u.id); } } // still on the node: the preview re-reads the NEXT real tier
      });
      tree.addEventListener("keydown", e => { if (e.key !== "Enter" && e.key !== " ") return; const b = e.target.closest(".node"); if (!b) return; e.preventDefault(); b.click(); });
      new ResizeObserver(() => relayout()).observe(tree); new ResizeObserver(() => drawLeaders()).observe(sp.wrap);
      function paint() { if (state.ctx < 0) return; readTree(); paintNodes(); paintPreview(); mm.paint(); relayout(); }
      rooms[id] = { sec, mm, tree, paint, onOpen() { paint(); requestAnimationFrame(() => { relayout(); drawLeaders(); }); }, clear() { clear(); mm.pk(-1); }, redraw() { relayout(); drawLeaders(); },
        focusNode(nid) { const n = nodeEls[nid]; if (n) { n.focus(); return true; } return false; }, focusFirst: () => sec.querySelector("h2").focus(),
        measure() { return { em: state.em, categories: cats.slice(), items: items.map(u => ({ id: u.id, cat: u.uiCategory, tier: u.tier, price: u.price, canBuy: u.canBuy, rules: u.rules })),
          tendrils: [...leaders.querySelectorAll(".ld")].map(p => ({ cat: p.dataset.cat, d: p.getAttribute("d"), width: parseFloat(getComputedStyle(p).strokeWidth), lit: p.classList.contains("on") })),
          glow: parseFloat(leaders.style.getPropertyValue("--ld-glow")), vein: parseFloat(leaders.style.getPropertyValue("--vein")), idle: parseFloat(leaders.style.getPropertyValue("--ld-w")), litW: parseFloat(leaders.style.getPropertyValue("--ld-on")),
          chain: cats.map(c => ({ cat: c, anchor: !!leaders.querySelector(`.lead-g[data-cat="${c}"] .anchor`), plate: !!leaders.querySelector(`.lead-g[data-cat="${c}"] .aplate`), tendril: !!leaders.querySelector(`.lead-g[data-cat="${c}"] .ld`), port: !!edges.querySelector(`.port[data-cat="${c}"]`), label: !!lbls[c], cards: items.filter(u => u.uiCategory === c).length })),
          treeHeight: zm.getBoundingClientRect().height, wantH: L ? L.wantH : null, labelMode: L ? L.labelMode : null }; } };
    }

    // ---------------------------------------------------------------- the controller: open / close / switch / context
    function setCtx(i, from) {
      if (i < 0 || i >= regs.length) return; state.ctx = i; state.peek = -1;
      miniMaps.forEach(m => m.paint()); for (const k in rooms) if (!rooms[k].sec.hidden) rooms[k].paint();
      if (from && state.room) live(`Considering ${regs[i].name}`);
    }
    function open(name, ctx = {}) {
      const room = rooms[name]; if (!room) return false;
      const first = !state.room;
      if (first) {
        const run = A.run(); state.wasRunning = run.running; state.opener = ctx.opener || null;
        if (run.running) A.actions.pause();                                        // the real pause (bloom:play-pause); remembered for Back
        const sel = A.selection().index, carry = ctx.region >= 0 ? ctx.region : sel >= 0 ? sel : state.ctx >= 0 ? state.ctx : origin();
        if (sel >= 0 || A.selection().water) A.actions.deselect();                 // the home selection is cleared (the real bloom:region-select)
        regs = A.regions(); state.ctx = carry; state.peek = -1;
        layer.hidden = false; view.el.classList.add("in-room"); calibrate();           // calibrate with the layer laid out
        parts.forEach(e => { e.inert = true; e.setAttribute("aria-hidden", "true"); });   // the Planet View stays, exactly where it was, inert
      } else if (state.room !== name) { const old = rooms[state.room]; old.clear(); old.sec.hidden = true; }
      else return () => close(false);
      state.room = name; view.rooms.setActive(name);
      room.sec.hidden = false; room.onOpen(); paintHeader();
      layer.querySelectorAll("[data-go]").forEach(b => { if (b.classList.contains("rn")) b.setAttribute("aria-pressed", String(b.dataset.go === name)); });
      live(`${ROOMS[name].title} open. Game paused. Considering ${regs[state.ctx].name}.`);
      requestAnimationFrame(() => { if (!(ctx.item && room.focusNode && room.focusNode(ctx.item))) room.focusFirst(); });
      return () => close(false);
    }
    function close(resume) {
      if (!state.room) return; const room = rooms[state.room]; room.clear(); if (A.activePreview()) A.actions.clearPreview();
      room.sec.hidden = true; state.room = null; state.hovered = null; state.preview = null; state.peek = -1; state.lensPv = null;
      layer.hidden = true; view.el.classList.remove("in-room"); parts.forEach(e => { e.inert = false; e.removeAttribute("aria-hidden"); });
      view.rooms.setActive(null);
      if (resume) A.actions.play(); else A.actions.setRunning(!!state.wasRunning);   // Resume = running; Back = as it was before the room
      live(`Back to Planet View${A.run().running ? ", running" : ", still paused"}. No region selected.`);
      const op = state.opener; state.opener = null;
      if (op && document.contains(op) && !op.closest("[hidden]")) op.focus(); else { const t = view.el.querySelector('.pv-tool[data-tool="region"]'); if (t) t.focus(); }
    }
    function paintHeader() { const h = A.hud(); layer.querySelectorAll(".rbio-n").forEach(e => { e.textContent = h.biomass; }); const r = A.run(); layer.querySelectorAll(".paused").forEach(e => e.classList.toggle("on", !r.running)); }
    layer.addEventListener("click", e => {
      const a = e.target.closest("[data-act]"); if (a) { close(a.dataset.act === "resume"); return; }
      const g = e.target.closest(".rn[data-go]"); if (g) { if (g.dataset.go === "terraform") { view.openRoom("terraform", { region: state.ctx, opener: g }); return; } open(g.dataset.go, { region: state.ctx, opener: state.opener }); }
    });
    document.addEventListener("keydown", e => { if (e.key === "Escape" && state.room) { e.preventDefault(); close(false); } });
    // preview safety nets: the window losing focus, the tab hidden, the pointer leaving the window
    root.addEventListener("blur", () => { state.suspended = true; for (const k in rooms) if (rooms[k].clear && !rooms[k].sec.hidden) rooms[k].clear(); });
    root.addEventListener("focus", () => { state.suspended = false; });
    document.addEventListener("visibilitychange", () => { if (document.hidden) { state.suspended = true; for (const k in rooms) if (!rooms[k].sec.hidden) rooms[k].clear(); } });
    document.addEventListener("pointerout", e => { if (!e.relatedTarget) for (const k in rooms) if (!rooms[k].sec.hidden) rooms[k].clear(); });

    // ---------------------------------------------------------------- build, subscribe, register
    buildRegion(); buildBoard("adapt"); buildBoard("spread");
    const unsub = A.subscribe(ch => {
      if (!state.room) return; const r = ch.reasons;
      if (r.some(x => x !== "tick" && x !== "message" && x !== "preview-clear" && x !== "upgrade-preview")) regs = A.regions();
      if (r.includes("upgrade-purchase") || r.includes("local-upgrade") || r.includes("growth-focus") || r.includes("tick") || r.includes("region-select")) { condCache = null; const room = rooms[state.room]; room.paint(); }
      paintHeader(); miniMaps.forEach(m => m.invalidate());
    });
    let raf = 0, disposed = false; (function loop() { if (disposed) return; raf = requestAnimationFrame(loop); if (!state.room) return; for (const m of miniMaps) m.frame(); })();
    new ResizeObserver(() => { if (!state.room) return; calibrate(); const room = rooms[state.room]; if (room.redraw) room.redraw(); miniMaps.forEach(m => m.relayout()); }).observe(layer);
    // the 028D1 anchors these rooms now own (the hidden shell's copies become data-tutorial-legacy): docs/PRODUCTION_PLANT_ROOMS_v1.md §11
    const claimed = ["raw-signals", "growth-focus", "local-upgrade", "upgrades", "board-adapt", "board-spread"];
    const c0 = A.colony(origin()); for (const f of c0.focusChoices) claimed.push(`focus-${f.id}`); for (const l of c0.localChoices) claimed.push(`local-${l.id}`);
    for (const b of A.upgrades()) if (b.board !== "Terraform") for (const u of b.items) claimed.push(`upgrade-${u.id}`);
    view.rooms.claimAnchors(claimed);
    // paint every room once now (hidden, context = origin): the claimed anchors exist before any room opens, so a coach can resolve
    // them first; the first open repaints for the real context
    state.ctx = origin(); for (const k in rooms) rooms[k].paint();
    for (const name of ["region", "adapt", "spread"]) view.rooms.register(name, { open: ctx => open(name, ctx) });

    const api = {
      el: layer, adapter: A, rooms, open, close, setCtx, setLens, previewLens, calibrate,
      // BLOOM-029E seam: wrap a swap in the SUBDUED AtmosphereTransition here (planetView ↔ room and room ↔ room); 029C swaps at once
      transition: null,
      // BLOOM-029D seam: Terraform registers through planetView.rooms.register("terraform", …) with its own PlanetSphereView room
      state: () => ({ room: state.room, context: state.ctx, contextId: state.ctx >= 0 ? regs[state.ctx].id : null, wasRunning: state.wasRunning, peek: state.peek, lens: state.lens, lensPreview: state.lensPv,
        hovered: state.hovered, preview: state.preview ? state.preview.id : null, em: state.em, emBy: state.emBy, emChips: state.emChips, emHeight: state.emHeight, medianName, claimedAnchors: claimed.slice() }),
      measure: name => rooms[name] && rooms[name].measure ? rooms[name].measure() : null,
      dispose() { disposed = true; cancelAnimationFrame(raf); unsub(); if (state.room) close(false); layer.remove(); instance = null; DR.instance = null; },
    };
    instance = api; DR.instance = api; return api;
  }
  const DR = { mount, version: 1, instance: null, CATS: Object.freeze(CATS), CAT_COLOR: Object.freeze(CAT_COLOR), CAT_PART: Object.freeze(CAT_PART), TENDRIL: Object.freeze(TENDRIL) };
  root.BLOOM = Object.assign(root.BLOOM || {}, { decisionRooms: DR });
})(typeof window !== "undefined" ? window : globalThis);
