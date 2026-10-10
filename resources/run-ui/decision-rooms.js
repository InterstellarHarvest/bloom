// BLOOM — production decision rooms (BLOOM-029C, Concept 18): Region Inspect · Adapt · Spread. docs/PRODUCTION_PLANT_ROOMS_v1.md.
// BLOOM-029D adds the fourth room, Terraform (docs/PRODUCTION_TERRAFORM_ROOM_v1.md): the environmental room over the same controller,
// with the EXISTING PlanetSphereView (through resources/run-ui/terraform-globe.js, public API only) showing the exact current planet
// under the run's CURRENT surface sky, the Concept 18 diffuse atmosphere around it, a real Soil environmental readout on the left and
// the real Atmosphere nodes (warm / cool / humid / dry — the only real Terraform traits) on the right.
//
// Four floating rooms over the production Planet View (resources/run-ui/planet-view.js), filled into its room seam
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
//   Terraform       (029D) the fourth room: same lifecycle; its preview repaints the globe to the exact real preview sky and clears
//                   back to the committed current surface on every reset path; no second Terraform state exists.
// Room context ≠ home selection: the right-hand mini-map (the SAME production map renderer, resources/run-ui/run-map-renderer.js,
// on its own canvas) and region strip change the room context only — never actions.selectRegion, never bloom:region-select.
// Real Adapt / Spread nodes preview through adapter.actions.preview(id) (the deliberate player preview: bloom:upgrade-preview,
// the home map's outline) and buy through adapter.actions.buy(id) (bloom:upgrade-purchase).
// BLOOM-029E — every swap is wrapped in the SUBDUED mist through ONE gameplay transition bridge (resources/run-ui/gameplay-transition.js,
// the unmodified AtmosphereTransition behind a guarded import; immediate swaps over file://). docs/GAMEPLAY_UI_CONVERGENCE_v1.md §5:
//   open     1 remember the running state · 2 pause the REAL run at once · 3 conceal · 4 at covered: carry the selection into the
//            context, clear the home selection (the real action), make the Planet View inert, reveal the room layer, swap · 5 reveal ·
//            6 focus the room control once the reveal has completed. The sim never advances while a room opens.
//   switch   paused throughout, same context, the old room's transient preview cleared BEFORE the swap, no Planet View in between.
//   close    1 clear the preview · 2 stay paused · 3 conceal · 4 at covered: hide the room, restore the Planet View, no selection ·
//            5 reveal · 6 ONLY after the transition completes: Back restores the pre-room state, Resume runs · 7 restore focus.
//   A second request while `transitioning` is ignored cleanly (no overlapping run, no double pause / resume, no two rooms, no lost
//   context); the swap itself always happens exactly once (the bridge rolls forward on any failure). `controller.timeline()` records
//   every swap's pause / covered / reveal / resume timestamps and running states (QA).
// Classic script, no dependencies besides BLOOM.surface, BLOOM.runMap, BLOOM.plantSpecimen, (029D) BLOOM.terraformGlobe and (029E)
// BLOOM.gameplayTransition: boots over file://.
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
    // (029D) Terraform: rain / air / land / geothermal / spin hint
    humid: '<path d="M7 15.5a4 4 0 0 1 .6-7.95A5.5 5.5 0 0 1 18 9a3.25 3.25 0 0 1-.5 6.5H7z"/><path d="M9 18l-1 2.6M13 18l-1 2.6M17 18l-1 2.6"/>',
    air: '<path d="M3 8h10.5a2.5 2.5 0 1 0-2.5-2.5M3 13h14.5a2.5 2.5 0 1 1-2.5 2.5M3 18h7.5a2 2 0 1 1-2 2"/>',
    land: '<path d="M3 17l5-6 4 4 3-3 6 5"/><path d="M3 21h18"/><circle cx="17.5" cy="6.5" r="2.2"/>',
    geo: '<path d="M12 21c-4 0-6.5-2.6-6.5-6.2 0-3.1 2.2-5.3 3.3-7.3.5 2 1.6 3.1 3.1 3.6-.5-3.2 1-5.8 3.1-8 .1 4.2 3.5 5.9 3.5 10.5 0 4.3-2.6 7.4-6.5 7.4z"/>',
    drag: '<path d="M4 12h16M8 8l-4 4 4 4M16 8l4 4-4 4"/>',
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
  // (029D) Terraform: the PMO-locked presentation categories (content/traits.js uiCategory, order = upper sky → weather near the ground) and
  // banks (uiBank): Soil = the ground, LEFT of the globe (no real node exists yet: an environmental readout only); Atmosphere = the sky, RIGHT.
  const CATS = { Adapt: ["Hazard", "Water", "Temperature", "Soil"], Spread: ["Seeds", "Growth", "Reach"], Terraform: ["Sky temperature", "Rain"] };
  const CAT_COLOR = { Hazard: ["#8a5bb8", "#efe5f8", "#5e3a86"], Water: ["#3b8fd0", "#dcecf8", "#23679f"], Temperature: ["#d9601f", "#fde6d6", "#9c3f0e"], Soil: ["#8a6a3e", "#f1e6d2", "#5f452a"],
    Seeds: ["#c58a1a", "#fbefcf", "#8a5d00"], Growth: ["#3f9d4b", "#e2f2d6", "#2a7636"], Reach: ["#1f8f8f", "#d8f1ef", "#136060"],
    "Sky temperature": ["#d9601f", "#fde6d6", "#9c3f0e"], Rain: ["#3b8fd0", "#dcecf8", "#23679f"] }; // Sky temperature = the warm / orange family, Rain = the blue family (Concept 18)
  // (BLOOM-033) a category a world does not offer is explained, never silently missing: Reach (Waterborne Seeds) is offered only where seeds
  // have real water to cross (the engine's own rule, sim.offered); on other worlds the Spread room says why it is not there
  const CAT_ABSENT = { Reach: "No Reach upgrades on this world: there is no water gap your seeds would need to cross." };
  const CAT_ICON = { Hazard: "hazard", Water: "water", Temperature: "temp", Soil: "soil", Seeds: "seedOut", Growth: "colony", Reach: "reach", "Sky temperature": "temp", Rain: "humid" };
  const BANKS = { Soil: { side: -1, ico: "soil", to: "surface", word: "the ground", color: CAT_COLOR.Soil }, Atmosphere: { side: 1, ico: "air", to: "halo", word: "the air around the planet", color: ["#5a6fa8", "#e3eaf6", "#44579a"] } };
  const BANK_ORDER = ["Soil", "Atmosphere"], BANK_OF = u => (u.uiBank && BANKS[u.uiBank] ? u.uiBank : "Atmosphere"); // a real sky trait without metadata still reads as the sky
  // Concept 18 Terraform geometry (em; docs/UI_CONCEPT_REVIEW_v9.md §7 exclusion zone, v10 §4–5): halo band from the face, the clearance nothing
  // may enter, the lane the banks start outside, top / bottom bands for the legend and readout, the bank step cap, the Soil arrow (future real nodes)
  const TF = { haloIn: 0.3, haloW: 1, clear: 1, lane: 0.7, topbot: 2.6, margin: 0.5, stepMax: 4.9, catGap: 0.45, soilW: [8, 9.6], nodeW: [7.8, 9.4], ring: 0.42, soilGap: 0.1, soilHead: [0.62, 1], soilNose: 0.16 };
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
    const A = view.adapter, RM = root.BLOOM.runMap, SF = root.BLOOM.surface, PS = root.BLOOM.plantSpecimen, TG = root.BLOOM.terraformGlobe, GT = root.BLOOM.gameplayTransition;
    if (!RM || !SF || !PS || !TG) throw new TypeError("BLOOM.decisionRooms: needs BLOOM.runMap, BLOOM.surface, BLOOM.plantSpecimen and BLOOM.terraformGlobe");
    // (029E) ONE gameplay transition per run (the SUBDUED mist); without the bridge file every swap is immediate
    const T = GT ? GT.create({ onError: err => console.error("BLOOM.decisionRooms: a room swap failed", err) }) : null;
    const mq = root.matchMedia ? root.matchMedia("(prefers-reduced-motion: reduce)") : null;
    // reduced motion: the OS, the page's class, the view's class, or (029E) the player's Settings choice as the transition bridge reads it
    const reduced = () => !!(mq && mq.matches) || document.documentElement.classList.contains("reduce-motion") || view.el.classList.contains("reduced") || !!(T && T.reducedMotion());
    const MAP0 = A.map(), IDX = {}; MAP0.regions.forEach(r => { IDX[r.id] = r.index; });
    const idx = list => (list || []).map(id => IDX[id]).filter(i => i >= 0);
    const names = list => (list || []).map(id => (regs.find(r => r.id === id) || {}).name || id).join(", ");
    const origin = () => (regs.find(r => r.isOrigin) || regs[0]).index;
    let regs = A.regions();
    // presentation state only: the run has one pause (the page's); this remembers what the room must restore
    const state = { room: null, ctx: -1, wasRunning: null, opener: null, peek: -1, lens: null, lensPv: null, em: 16, emBy: "", preview: null, hovered: null, suspended: false,
      transitioning: false, transitionKind: null, ignored: 0 }; // (029E) one swap at a time; `ignored` counts requests dropped while one ran (QA)
    const TL = []; // (029E) the swap timeline: pause / covered / reveal / resume timestamps and running states (QA evidence)

    // ---------------------------------------------------------------- the layer (inside the Planet View, over the veil)
    const layer = document.createElement("div"); layer.className = "dr"; layer.id = "dr"; layer.hidden = true; view.el.appendChild(layer);
    const live = m => { const l = view.el.querySelector("#pvLive"); if (l) l.textContent = m; };
    const parts = view.rooms.parts();
    const rooms = {}; const miniMaps = [];
    // (BLOOM-033) several runs share one document: everything global this controller attaches (document / window listeners, resize
    // observers, the plant specimens) is released by dispose(), so a disposed run leaves nothing listening behind it
    const life = new AbortController(), LIFE = { signal: life.signal }, ROS = [], SPECS = [];
    const observe = (fn, el) => { const ro = new ResizeObserver(fn); ro.observe(el); ROS.push(ro); return ro; };

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
          `<nav class="rnav" aria-label="Rooms">` + ROOM_IDS.map(k => `<button type="button" class="rn ${ROOMS[k].kind}" data-go="${k}" aria-pressed="${k === id}" title="${esc(ROOMS[k].title)}">${ico(ROOMS[k].ico)}<span>${esc(ROOMS[k].title)}</span></button>`).join("") + `</nav>` +
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
      observe(relayout, mapBox);
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
      const spec = PS.mount(wrap, { reducedMotion: reduced, species: A.run().species }); SPECS.push(spec); // (035B) the run's species: its body plan + pack
      const capEl = document.createElement("div"); capEl.className = "spec-cap"; capEl.innerHTML = `<b class="sc-n"></b><small class="sc-w"></small>`; wrap.appendChild(capEl);
      const info = document.createElement("div"); info.className = "lf-info"; host.appendChild(info);
      return { wrap, spec, cap: capEl, info, caption(r, extra) { capEl.querySelector(".sc-n").textContent = `Your plant in ${r.name}`; capEl.querySelector(".sc-w").textContent = extra || specCaption(r); } };
    }
    const ownedChips = () => { const out = []; for (const b of A.upgrades()) if (b.board !== "Terraform") for (const u of b.items) if (u.owned) out.push(`<span class="ow" style="${catStyle(u.uiCategory)}">${ico(I[u.id] ? u.id : CAT_ICON[u.uiCategory])}${esc(u.name)}${u.tier > 1 ? ` <i>${ROMAN[u.tier] || u.tier}</i>` : ""}</span>`);
      return out.length ? out.join("") : `<span class="ow none">No adaptations yet</span>`; };
    function zoneHeight(sec) { const rr = sec.getBoundingClientRect(), hh = sec.querySelector(".rh").getBoundingClientRect(), cs = getComputedStyle(sec); return Math.floor(rr.bottom - parseFloat(cs.paddingBottom) - hh.bottom - (parseFloat(cs.rowGap) || 0)); }
    // shared by the tree rooms (Adapt / Spread / Terraform): a real node's state and its state line, from the adapter's item only
    const nodeState = u => u.canBuy ? "avail" : u.rules ? "poor" : u.owned ? "owned" : "blocked";
    const stateWord = u => { const st = nodeState(u), t = u.tier ? `Tier ${ROMAN[u.tier] || u.tier} owned` : "";
      if (st === "avail" || st === "poor") return (t ? t + " · next " : "") + `${u.price} Biomass`;
      if (st === "owned") return t + (u.maxTier !== null && u.tier >= u.maxTier ? " · complete" : "");
      return u.reason ? cap(u.reason) : "Not available now"; };
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
    const svgMk = (tag, attrs, parent) => { const e = document.createElementNS("http://www.w3.org/2000/svg", tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };

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
      const absent = document.createElement("p"); absent.className = "cat-absent"; absent.hidden = true; absent.setAttribute("role", "note"); zm.appendChild(absent);
      // the REAL tree: offered items of this board from the adapter, grouped by the content's presentation category
      function readTree() {
        const b = A.upgrades().find(x => x.board === BOARD); items = b ? b.items : []; cats = CATS[BOARD].filter(c => items.some(u => u.uiCategory === c));
        const gone = CATS[BOARD].filter(c => !cats.includes(c) && CAT_ABSENT[c]), note = gone.map(c => CAT_ABSENT[c]).join(" ");   // (BLOOM-033)
        if (absent.textContent !== note) { absent.textContent = note; absent.hidden = !note; if (gone.length) { absent.dataset.cat = gone.join(" "); absent.setAttribute("style", catStyle(gone[0])); } }
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
      const svgEl = (tag, attrs, parent) => svgMk(tag, attrs, parent || edges);
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
      observe(() => relayout(), tree); observe(() => drawLeaders(), sp.wrap);
      function paint() { if (state.ctx < 0) return; readTree(); paintNodes(); paintPreview(); mm.paint(); relayout(); }
      rooms[id] = { sec, mm, tree, paint, onOpen() { paint(); requestAnimationFrame(() => { relayout(); drawLeaders(); }); }, clear() { clear(); mm.pk(-1); }, redraw() { relayout(); drawLeaders(); },
        focusNode(nid) { const n = nodeEls[nid]; if (n) { n.focus(); return true; } return false; }, focusFirst: () => sec.querySelector("h2").focus(),
        measure() { return { em: state.em, categories: cats.slice(), absentNote: absent.hidden ? null : absent.textContent, items: items.map(u => ({ id: u.id, cat: u.uiCategory, tier: u.tier, price: u.price, canBuy: u.canBuy, rules: u.rules })),
          tendrils: [...leaders.querySelectorAll(".ld")].map(p => ({ cat: p.dataset.cat, d: p.getAttribute("d"), width: parseFloat(getComputedStyle(p).strokeWidth), lit: p.classList.contains("on") })),
          glow: parseFloat(leaders.style.getPropertyValue("--ld-glow")), vein: parseFloat(leaders.style.getPropertyValue("--vein")), idle: parseFloat(leaders.style.getPropertyValue("--ld-w")), litW: parseFloat(leaders.style.getPropertyValue("--ld-on")),
          chain: cats.map(c => ({ cat: c, anchor: !!leaders.querySelector(`.lead-g[data-cat="${c}"] .anchor`), plate: !!leaders.querySelector(`.lead-g[data-cat="${c}"] .aplate`), tendril: !!leaders.querySelector(`.lead-g[data-cat="${c}"] .ld`), port: !!edges.querySelector(`.port[data-cat="${c}"]`), label: !!lbls[c], cards: items.filter(u => u.uiCategory === c).length })),
          treeHeight: zm.getBoundingClientRect().height, wantH: L ? L.wantH : null, labelMode: L ? L.labelMode : null }; } };
    }

    // ---------------------------------------------------------------- Terraform (029D): the environmental room — real PlanetSphereView, Soil-left / Atmosphere-right
    // CONCEPT 18 SUPPLIES PRESENTATION, THE RUN SUPPLIES TRUTH: the only nodes are the real offered Terraform traits (adapter.upgrades), the
    // globe is the unmodified PlanetSphereView painting a presentation snapshot of the exact authoritative planet under the run's CURRENT
    // surface sky (adapter.surface + BLOOM.terraformGlobe.snapshot), previews repaint it to the page's own what-if sky (preview.sky from
    // actions.preview) and the Soil side is the room-context region's real environmental readout (adapter.region) — no fake Soil skill,
    // cost, lock, arrow or pin. The plant specimen is never shown here. Future REAL Soil traits (uiBank "Soil") would take the Soil bank
    // and the accepted near-surface arrow; the layout, connectors and anchors below already handle both banks.
    function buildTerraform() {
      const id = "terraform", sec = roomShell(id), R0 = ROOMS[id], zf = sec.querySelector(".z-focus"), zm = sec.querySelector(".z-main"), zmap = sec.querySelector(".z-map");
      const mm = mapBlock(id, zmap, `<div class="mm-ctx tf"><span class="mc-k">Planet readout</span><dl class="env-rows"></dl><span class="mc-k mc-k2">Region effect of this choice</span><div class="mc-rows"></div></div>`);
      // LEFT: the environment / land focus (sky + ground of the room-context region, from real values; no plant) and the information card
      const env = document.createElement("div"); env.className = "lf-top env"; zf.appendChild(env);
      const envSvg = svgMk("svg", { viewBox: "0 0 400 300", class: "env-svg", role: "img", "aria-label": "The land around the region: its sky and ground now. No plant is drawn here: Terraform changes the environment." }, env);
      const envTag = document.createElement("div"); envTag.className = "ps-tag"; envTag.textContent = "PREVIEW"; env.appendChild(envTag);
      const envCap = document.createElement("div"); envCap.className = "spec-cap"; envCap.innerHTML = `<b class="sc-n"></b><small class="sc-w"></small>`; env.appendChild(envCap);
      const info = document.createElement("div"); info.className = "lf-info"; zf.appendChild(info);
      // CENTRE: the planet card — Soil bank (left) · diffuse atmosphere + globe (centre) · Atmosphere bank (right); legend top-left, sky readout bottom-left
      zm.classList.add("tf-main");
      const stage = document.createElement("div"); stage.className = "tf-stage"; stage.dataset.tutorial = "board-terraform"; stage.setAttribute("role", "group"); stage.setAttribute("aria-label", "Terraform: planet systems. Soil on the left is the ground; Atmosphere on the right is the sky around the planet"); zm.appendChild(stage);
      const edges = svgMk("svg", { class: "edges tf-edges", "aria-hidden": "true", focusable: "false" }, stage);
      const soil = document.createElement("div"); soil.className = "bank bank-soil"; soil.dataset.bank = "Soil"; soil.setAttribute("style", catStyle("Soil")); stage.appendChild(soil);
      const gh = document.createElement("div"); gh.className = "tf-globe"; gh.setAttribute("aria-roledescription", "planet globe"); stage.appendChild(gh);
      const gfocus = document.createElement("div"); gfocus.className = "tf-focus"; gfocus.setAttribute("aria-hidden", "true"); stage.appendChild(gfocus); // the visible keyboard-focus ring around the face
      const legend = document.createElement("div"); legend.className = "bank-legend"; legend.setAttribute("aria-label", "Planet systems: Soil on the left is the ground, Atmosphere on the right is the air around the planet");
      legend.innerHTML = BANK_ORDER.map(b => `<span class="bl-${b.toLowerCase()}">${ico(BANKS[b].ico)}<b>${esc(b)}</b><small>${BANKS[b].side < 0 ? "left" : "right"} · ${esc(BANKS[b].word)}</small></span>`).join(""); stage.appendChild(legend);
      const gread = document.createElement("div"); gread.className = "g-read"; gread.innerHTML = `<small class="gr-k">Sky now</small><b class="d-t"></b><small class="d-r"></small><span class="g-hint">${ico("drag")}drag or ← → to spin</span>`; stage.appendChild(gread);
      let items = [], cats = [], nodeEls = {}, lbls = {}, L = null, src = null, shownKey = "", globeKind = "pending", fitRaf = 0;
      const planetName = A.run().planetName || "the planet";
      // the globe slot: the real PlanetSphereView over http(s) (public API only), the flat canonical-surface fallback otherwise. Idle spin, yaw drag,
      // ← / →, reduced motion and focusability are the component's own; the room only hands it presentation snapshots.
      const globe = TG.mount(gh, { reducedMotion: reduced() ? true : null, surface: SF, ariaLabel: `The planet ${planetName} as it is now. Drag sideways or press the left and right arrow keys to spin it. Terraform previews repaint its sky.`,
        onReady: k => { globeKind = k; stage.dataset.globe = k; if (!sec.hidden) requestAnimationFrame(() => relayout()); } });
      const skyKey = s => `${(+s.temperature).toFixed(3)}|${(+s.moisture).toFixed(3)}`;
      const readSurface = () => { src = A.surface(); };
      // the EXACT authoritative planet (adapter.surface().planet: id, grid, sections, tilemap, topology) under `sky` → the sphere, as a
      // presentation snapshot. Never the run's planet object, never a regenerated world; the sphere repaints only when the signature changes.
      function showSky(sky) { if (!src) return; const k = `${src.planet.id}|${skyKey(sky)}`; if (k === shownKey) return; shownKey = k; globe.setSurface(TG.snapshot(src.planet, sky), src.render); }
      const fmtT = t => degC(t), fmtM = m => `${num(Math.round(m * 10) / 10)} moisture`;
      const axisName = ax => ax === "temp" ? "Sky temperature" : "Sky moisture";

      // ---- the real tree: offered Terraform items, in category order (upper sky → weather near the ground), each remembering its bank
      function readTree() {
        const b = A.upgrades().find(x => x.board === "Terraform"), raw = b ? b.items : [];
        items = CATS.Terraform.flatMap(c => raw.filter(u => u.uiCategory === c)).concat(raw.filter(u => !CATS.Terraform.includes(u.uiCategory)));
        cats = CATS.Terraform.filter(c => items.some(u => u.uiCategory === c)).concat([...new Set(items.filter(u => !CATS.Terraform.includes(u.uiCategory)).map(u => u.uiCategory || "Sky"))]);
        const want = new Set(items.map(u => u.id)); for (const k of Object.keys(nodeEls)) if (!want.has(k)) { nodeEls[k].remove(); delete nodeEls[k]; }
        for (const u of items) if (!nodeEls[u.id]) { const n = document.createElement("button"); n.type = "button"; n.className = "node card tf-node"; n.dataset.node = u.id; n.dataset.cat = u.uiCategory || ""; n.dataset.bank = BANK_OF(u); n.dataset.tutorial = `upgrade-${u.id}`; n.setAttribute("style", catStyle(u.uiCategory)); stage.appendChild(n); nodeEls[u.id] = n; }
        for (const c of Object.keys(lbls)) if (!cats.includes(c)) { lbls[c].remove(); delete lbls[c]; }
        for (const c of cats) if (!lbls[c]) { const l = document.createElement("div"); l.className = "cat-l tf-cat"; l.dataset.cat = c; l.setAttribute("style", catStyle(c)); l.innerHTML = `${ico(CAT_ICON[c] || "air")}<span>${esc(c)}</span>`; l.title = c; stage.appendChild(l); lbls[c] = l; }
      }
      function paintNodes() {
        for (const u of items) { const n = nodeEls[u.id], st = nodeState(u), bank = BANK_OF(u);
          n.className = `node card tf-node st-${st}${u.owned ? " has" : ""}${state.hovered === u.id ? " pvw" : ""} side-${bank === "Soil" ? "l" : "r"}`;
          n.innerHTML = `<span class="ni">${ico(I[u.id] ? u.id : CAT_ICON[u.uiCategory] || "air")}${u.owned ? `<span class="nl ok">${ico("check")}</span>` : st === "blocked" ? `<span class="nl">${ico("lock")}</span>` : ""}</span><span class="nt"><b>${esc(u.name)}</b><small>${esc(stateWord(u))}</small></span>`;
          n.setAttribute("aria-label", `${u.name}, ${u.uiCategory || "sky"} · ${bank}. ${stateWord(u)}. ${u.sub || ""}. Changes the planet, not the plant${u.canBuy ? ". Press to buy" : ""}`); n.setAttribute("aria-disabled", String(!u.canBuy)); n.title = u.sub || u.name; }
        paintEdges(); fitTitles();
      }
      function fitTitles() { for (const u of items) { const b = nodeEls[u.id].querySelector(".nt b"); if (!b) continue; b.style.removeProperty("--fit"); if (b.scrollWidth > b.clientWidth + 0.5) b.style.setProperty("--fit", Math.max(0.8, Math.floor(b.clientWidth / b.scrollWidth * 100) / 100)); } }
      const rectDist = (px, py, x0, y0, x1, y1) => Math.hypot(Math.max(x0 - px, 0, px - x1), Math.max(y0 - py, 0, py - y1));
      // ---- layout (px from the room em): the globe takes what the two banks, the halo band, the clearance and the lanes leave; each bank
      // is a C hugging the exclusion zone (Soil left, Atmosphere right), its bow reduced until every card stays outside the zone + half a lane
      function layout(w, h, em) {
        const K = TF, haloIn = K.haloIn * em, haloW = K.haloW * em, clear = K.clear * em, lane = K.lane * em, topbot = K.topbot * em, M = K.margin * em, badge = 0.7 * em;
        const banks = {}; for (const b of BANK_ORDER) banks[b] = items.filter(u => BANK_OF(u) === b);
        const soilW = Math.max(K.soilW[0] * em, Math.min(K.soilW[1] * em, w * 0.22)), nodeW = Math.max(K.nodeW[0] * em, Math.min(K.nodeW[1] * em, w * 0.22));
        const leftW = banks.Soil.length ? Math.max(soilW, nodeW + badge) : soilW, rightW = banks.Atmosphere.length ? nodeW + badge : soilW, ring = haloIn + haloW + clear + lane;
        let R = Math.min((w - leftW - rightW - 2 * ring - 2 * M) / 2, (h - 2 * topbot) / 2 - (haloIn + haloW + clear)); R = Math.max(3.6 * em, R);
        const cx = M + leftW + ring + R, cy = h / 2, face = R, HR = R + haloIn + haloW / 2, zone = R + haloIn + haloW + clear, RO = R + haloIn + haloW + clear * TG.ATMO.out;
        const pos = {}, labelPos = {}, cardH = nid => (nodeEls[nid] && nodeEls[nid].offsetHeight) || 3.6 * em, padY = Math.max(topbot, 1 * em);
        for (const b of BANK_ORDER) { const list = banks[b]; if (!list.length) continue; const sign = BANKS[b].side, ids = list.map(u => u.id);
          const slots = []; let s = 0, prev = null; for (const u of list) { if (prev && u.uiCategory !== prev) s += K.catGap; slots.push(s); s += 1; prev = u.uiCategory; }
          const total = slots[slots.length - 1], hMax = Math.max(...ids.map(cardH)), step = Math.min(K.stepMax * em, (h - 2 * padY - hMax) / Math.max(1e-6, total)), span = total * step, ry = Math.max(span / 2, 1);
          const rxIn = zone + lane; let bow = Math.max(0, Math.min(rxIn - R * 0.45, 3 * em));
          const place = bw => ids.map((nid, k) => { const y = cy - span / 2 + slots[k] * step, t = (y - cy) / ry; return { id: nid, x: cx + sign * (rxIn - bw * (1 - Math.sqrt(Math.max(0, 1 - t * t)))), y }; });
          const clearOf = ps => ps.every(p => { const hh = cardH(p.id), x0 = sign > 0 ? p.x : p.x - nodeW, x1 = sign > 0 ? p.x + nodeW : p.x; return rectDist(cx, cy, x0, p.y - hh / 2, x1, p.y + hh / 2) >= zone + lane * 0.5; });
          let ps = place(bow); while (bow > 0 && !clearOf(ps)) { bow = Math.max(0, bow - 0.1 * em); ps = place(bow); }
          for (const p of ps) pos[p.id] = { x: p.x, y: p.y, side: sign, bank: b }; // x = the card's INNER edge (globe side)
          for (const c of cats) { const first = list.find(u => (u.uiCategory || "Sky") === c); if (!first) continue; const p = pos[first.id]; let lx = p.x + sign * 0.3 * em; const ly = p.y - cardH(first.id) / 2 - 0.95 * em;
            for (let g = 0; g < 40 && Math.hypot(lx - cx, ly - cy) < zone + 0.2 * em; g++) lx += sign * 0.5 * em; labelPos[c] = { x: lx, y: ly, side: sign }; } }
        return { pos, labelPos, banks, R, face, HR, zone, RO, cx, cy, soilW: leftW, nodeW, M, em, lane, haloIn, haloW, clear, box: TG.boxFor(R), padY, w, h };
      }
      function relayout(pass) {
        const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return; const em = state.em, hs = items.map(u => nodeEls[u.id].offsetHeight).join();
        L = layout(w, h, em); stage.style.setProperty("--nw", L.nodeW + "px"); stage.style.setProperty("--sw", L.soilW + "px"); stage.style.setProperty("--pady", L.padY + "px");
        edges.setAttribute("viewBox", `0 0 ${w} ${h}`); edges.setAttribute("width", w); edges.setAttribute("height", h);
        Object.assign(gh.style, { left: (L.cx - L.box / 2) + "px", top: (L.cy - L.box / 2) + "px", width: L.box + "px", height: L.box + "px" });
        const fr = L.face + 0.45 * em; Object.assign(gfocus.style, { left: (L.cx - fr) + "px", top: (L.cy - fr) + "px", width: 2 * fr + "px", height: 2 * fr + "px" });
        soil.style.left = L.M + "px"; soil.style.width = L.soilW + "px";
        for (const u of items) { const p = L.pos[u.id], n = nodeEls[u.id]; if (!p) continue; n.style.left = (p.side > 0 ? p.x : p.x - L.nodeW) + "px"; n.style.top = p.y + "px"; }
        for (const c of cats) { const a = L.labelPos[c], l = lbls[c]; if (!a || !l) continue; l.style.left = a.x + "px"; l.style.top = a.y + "px"; l.classList.toggle("flip", a.side < 0); }
        paintEdges(); fitTitles();
        if (!pass && items.map(u => nodeEls[u.id].offsetHeight).join() !== hs) return relayout(1);
        if (globe.view) globe.view.resize();
      }
      // ---- the edges layer: ONE diffuse atmosphere (an SVG radial gradient AROUND the component — never in the sphere's materials: clear at the
      // face, strongest where the Atmosphere connectors end, gone by 80 % of the clearance; the colour leans to the previewed channel) and one
      // connector per real node: Atmosphere → a small ring on the atmosphere's strongest line, Soil (future real nodes) → a blunt arrow whose
      // nose stops a small gap off the visible face. Neither enters the face; both aim at the globe centre, so connectors fan out and never cross.
      function paintEdges() {
        if (!L) return; edges.textContent = ""; const em = state.em, { cx, cy, face, HR, RO } = L, pv = state.preview, chan = state.hovered && pv ? (pv.sky ? pv.sky.axis : (items.find(u => u.id === state.hovered) || {}).axis) : null;
        const color = chan === "temp" ? CAT_COLOR["Sky temperature"][0] : chan === "moist" ? CAT_COLOR.Rain[0] : TG.ATMO.rgb, gid = `tfatm-${id}`;
        const grad = svgMk("radialGradient", { id: gid, gradientUnits: "userSpaceOnUse", cx, cy, r: RO }, svgMk("defs", {}, edges));
        for (const [o, a] of TG.atmosphereStops(face, HR, RO)) svgMk("stop", { offset: o, "stop-color": color, "stop-opacity": a }, grad);
        svgMk("circle", { class: `atmo${chan ? " on" : ""}`, cx, cy, r: RO, fill: `url(#${gid})` }, edges);
        for (const u of items) { const p = L.pos[u.id]; if (!p) continue; const B = BANKS[p.bank], lit = state.hovered === u.id, st = nodeState(u), toSurface = B.to === "surface";
          const a = Math.atan2(p.y - cy, p.x - cx), nose = TF.soilNose * em, r0 = toSurface ? face + TF.soilGap * em + nose / 2 : HR;
          const end = { x: cx + Math.cos(a) * r0, y: cy + Math.sin(a) * r0 }, headL = TF.soilHead[0] * em, headW = TF.soilHead[1] * em;
          const tail = toSurface ? { x: end.x + Math.cos(a) * headL * 0.7, y: end.y + Math.sin(a) * headL * 0.7 } : end, start = { x: p.x - p.side * 0.05 * em, y: p.y };
          const mx = (start.x + tail.x) / 2, my = (start.y + tail.y) / 2 + (p.y - cy) * 0.18;
          const e = svgMk("path", { class: `lead ${toSurface ? "to-surface" : "to-halo"} ${u.owned ? "on-owned" : st === "blocked" ? "off" : "open"}${lit ? " on" : ""}`, d: `M${start.x} ${start.y}Q${mx} ${my} ${tail.x} ${tail.y}`, "data-node": u.id, "data-cat": u.uiCategory || "" }, edges); e.setAttribute("style", catStyle(u.uiCategory));
          if (toSurface) { const tf = `rotate(${a * 180 / Math.PI + 90} ${end.x} ${end.y})`, hd = `M${end.x} ${end.y}l${-headW / 2} ${-headL}h${headW}z`;
            svgMk("path", { class: "pin-under", d: hd, transform: tf, "stroke-width": nose + 2.4 }, edges); const pin = svgMk("path", { class: `pin${lit ? " on" : ""}`, d: hd, transform: tf, "stroke-width": nose, "data-node": u.id }, edges); pin.setAttribute("style", catStyle(u.uiCategory)); }
          else { const ring = svgMk("circle", { class: `ring${lit ? " on" : ""}`, cx: end.x, cy: end.y, r: TF.ring * em, "data-node": u.id }, edges); ring.setAttribute("style", catStyle(u.uiCategory)); } }
        edges.classList.toggle("dim", !!state.hovered);
      }
      // ---- the Soil side: the room-context region's REAL ground, as information (adapter.region.raw / conditions / limiting / geothermal).
      // Real Soil Terraform nodes would sit in this bank too; none exist, so one honest line says so and no card, arrow or pin is drawn.
      function paintSoil(r) {
        const R = r.raw, sc = r.conditions.find(c => c.key === "Soil") || { word: "", lamp: "green", terraformable: false }, st = LAMP_ST[sc.lamp] || "ok", limSoil = r.limiting.key === "Soil" && r.limiting.blocked;
        const rel = limSoil ? `<div class="li-row">${ico("x")}<span><b>Holding the plant back here.</b>${sc.terraformable ? "" : " No sky change reaches the ground."}</span></div>`
          : r.limiting.softSoil ? `<div class="li-row">${ico("alert")}<span>Marginal ground: the plant grows here, slowly.</span></div>` : `<div class="li-row">${ico("check")}<span>The ground suits your plant.</span></div>`;
        soil.innerHTML = `<div class="cat-l tf-cat bank-cat">${ico("soil")}<span>Soil</span></div><div class="soil-card"><span class="li-k">The ground · ${esc(r.name)}</span>` +
          `<div class="soil-st">${chip(st, cap(sc.word))}${r.geothermal ? `<span class="geo">${ico("geo")}Geothermal</span>` : ""}</div>` +
          `<dl class="soil-rows"><div><dt>pH</dt><dd>${esc(num(R.ph))}</dd></div><div><dt>Salinity</dt><dd>${esc(num(R.salinity))}</dd></div><div><dt>Nutrients</dt><dd>${esc(num(R.nutrients))}</dd></div><div><dt>Toxicity</dt><dd>${esc(num(R.toxicity))}</dd></div></dl>${rel}` +
          (L && L.banks.Soil.length ? "" : `<p class="bank-empty">No soil interventions available.</p>`) + `</div>`;
      }
      // ---- the environment focus (left): sky + ground of the room-context region under `sky`, from real values only. The ground colour is the
      // canonical surface's own colour for this region under that sky (BLOOM.surface, the one terrain palette); sky, snow, haze, rain, lake,
      // cracks, salt and toxicity cues follow the region's real raw readings. Static (no animation).
      const hex = c => `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`, mixc = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
      function paintScene(r, sky, previewing) {
        const sec0 = src.planet.sections.find(x => x.id === r.id) || { local: { tempOffset: 0, moistureOffset: 0 } };
        const tile = SF.surfaceTiles({ gridWidth: 1, gridHeight: 1, globalClimate: sky, sections: [{ local: sec0.local }], tilemap: [0], topology: null }, { render: src.render })[0];
        const t = sky.temperature + sec0.local.tempOffset, m = Math.max(0, Math.min(100, sky.moisture + sec0.local.moistureOffset)); // the ground's own temperature / moisture under this sky
        let top = t < 0 ? mixc([223, 233, 247], [143, 205, 242], Math.max(0, Math.min(1, (t + 30) / 30))) : t > 28 ? mixc([143, 205, 242], [242, 181, 138], Math.min(1, (t - 28) / 24)) : [143, 205, 242];
        let bot = [230, 245, 253]; if (m > 65) { const k = Math.min(1, (m - 65) / 35) * 0.7; top = mixc(top, [156, 176, 194], k); bot = mixc(bot, [224, 232, 239], k); } if (m < 30) { const k = Math.min(1, (30 - m) / 30) * 0.6; top = mixc(top, [239, 210, 148], k); bot = mixc(bot, [251, 240, 210], k); }
        const g1 = tile.rgb, g2 = mixc(g1, [47, 58, 44], 0.22), far = mixc(g1, [183, 195, 204], 0.55), snow = t < -8, caps = t < 4, rain = m > 68 && t >= 0, flakes = m > 55 && t < -2, haze = m < 28, lake = Math.max(0, Math.min(1, (m - 25) / 50)), cracks = m < 32;
        const salt = r.raw.salinity > 1.2, toxic = r.raw.toxicity > 0.5, rad = r.raw.effectiveRadiation, hot = t > 32;
        const pt = (n, f) => { let s = ""; for (let i = 0; i < n; i++) s += f(i); return s; };
        envSvg.innerHTML = `<defs><linearGradient id="tfsky-${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${hex(top)}"/><stop offset="1" stop-color="${hex(bot)}"/></linearGradient></defs>` +
          `<rect x="0" y="0" width="400" height="300" fill="url(#tfsky-${id})"/>` +
          (rain ? "" : `<circle cx="312" cy="68" r="${30 + (hot ? 10 : 0)}" fill="#fff3b0" opacity="${0.35 + Math.min(0.3, rad / 100)}"/><circle cx="312" cy="68" r="${20 + (hot ? 6 : 0)}" fill="${hot ? "#ffb347" : "#ffd65a"}"/>`) +
          (rad > 40 ? pt(7, i => `<line x1="${300 + Math.cos(i) * 42}" y1="${56 + Math.sin(i) * 42}" x2="${300 + Math.cos(i) * 56}" y2="${56 + Math.sin(i) * 56}" stroke="#f2b324" stroke-width="2.5" stroke-linecap="round" opacity=".8"/>`) : "") +
          (haze ? pt(4, i => `<rect x="0" y="${84 + i * 26}" width="400" height="10" rx="5" fill="#f5deaa" opacity=".5"/>`) : "") +
          (rain || flakes ? `<g fill="#e9eef2"><ellipse cx="70" cy="80" rx="46" ry="18"/><ellipse cx="230" cy="62" rx="54" ry="20"/><ellipse cx="330" cy="100" rx="40" ry="15"/></g>` : `<g fill="#fff" opacity=".9"><ellipse cx="90" cy="86" rx="34" ry="12"/><ellipse cx="236" cy="66" rx="30" ry="10"/></g>`) +
          `<path d="M0 190 L60 120 L110 165 L160 105 L215 160 L260 125 L320 170 L360 140 L400 175 V300 H0z" fill="${hex(far)}"/>` +
          (caps ? `<path d="M48 134 L60 120 L72 134z M148 118 L160 105 L173 120z M250 136 L260 125 L271 137z M350 150 L360 140 L371 152z" fill="#fff" opacity=".95"/>` : "") +
          `<path d="M0 215 C60 190 110 195 170 205 C230 215 280 185 340 200 C370 208 390 212 400 214 V300 H0z" fill="${hex(g1)}"/>` +
          (snow ? `<path d="M0 215 C60 190 110 195 170 205 C230 215 280 185 340 200 C370 208 390 212 400 214 V222 C330 214 280 228 200 218 C130 210 70 220 0 223z" fill="#fff" opacity=".9"/>` : "") +
          (lake > 0.05 ? `<ellipse cx="120" cy="258" rx="${50 + 44 * lake}" ry="${10 + 8 * lake}" fill="#7fb4d6" opacity="${0.55 + 0.4 * lake}"/>` : "") +
          `<path d="M0 262 C80 246 160 250 220 262 C300 276 360 262 400 268 V300 H0z" fill="${hex(g2)}"/>` +
          (cracks ? `<g stroke="#8a6a3e" stroke-width="1.8" fill="none"><path d="M250 282l14 6-5 9"/><path d="M320 274l-10 7 7 10"/><path d="M60 286l12-4 6 8"/></g>` : "") +
          (salt ? pt(28, i => `<rect x="${(i * 37) % 400}" y="${238 + (i * 53) % 55}" width="3" height="3" fill="#fff"/>`) : "") + (toxic ? pt(16, i => `<circle cx="${(i * 61 + 20) % 400}" cy="${246 + (i * 29) % 48}" r="2" fill="#5e3a86" opacity=".8"/>`) : "") +
          (rain ? pt(30, i => `<line x1="${(i * 89) % 400}" y1="${20 + (i * 47) % 170}" x2="${(i * 89) % 400 - 4}" y2="${30 + (i * 47) % 170}" stroke="#6f93b3" stroke-width="1.6" stroke-linecap="round"/>`) : "") +
          (flakes ? pt(26, i => `<circle cx="${(i * 97) % 400}" cy="${(i * 61) % 190}" r="2.2" fill="#fff"/>`) : "");
        env.classList.toggle("previewing", !!previewing);
        envCap.querySelector(".sc-n").textContent = `Land around ${r.name}`; envCap.querySelector(".sc-w").textContent = `${previewing ? "Preview · " : ""}sky ${fmtT(sky.temperature)} · ${fmtM(sky.moisture)}`;
      }
      // ---- the information card (left): the current environment, or the REAL Terraform action under preview (it changes the planet / sky, not the plant)
      const condRows = r => r.conditions.map(cd => { const s = LAMP_ST[cd.lamp] || "ok", reading = cap(cd.word) + (cd.key === "Temperature" ? ` · ${degC(r.temperature.ground)}` : "");
        return `<div class="cond mini st-${s}" data-cat="${cd.key}" style="${catStyle(cd.key)}"><span class="cond-i">${ico(CAT_ICON[cd.key])}</span><span class="cnm">${cd.key}<small class="ct">${esc(reading)}</small></span>${chip(s)}</div>`; }).join("");
      function paintInfoBase(r) {
        const sky = src.sky, dT = r.temperature.ground - sky.temperature, rel = Math.abs(dT) < 0.5 ? "as the sky" : `${Math.abs(Math.round(dT))} °C ${dT > 0 ? "warmer" : "colder"} than the sky`;
        info.innerHTML = `<span class="li-k">The land around ${esc(r.name)}</span><div class="li-h"><span class="ni">${ico("land")}</span><div><b>${esc(r.limiting.blocked ? "Blocked here" : r.limiting.softSoil ? "Marginal here" : "Suits your plant")}</b><small>${esc(limitLine(r))}</small></div></div>` +
          `<div class="conds">${condRows(r)}</div>` +
          `<div class="li-row">${ico("terraform")}<span><b>Sky</b> ${fmtT(sky.temperature)} · ${fmtM(sky.moisture)}${A.hud().skyAdjusted ? " (as the ground sees it now)" : ""} · ground here ${rel}</span></div>` +
          `<p class="li-hint">Hover a planet system to preview this land. Terraform never changes your plant.</p>`;
        info.classList.remove("pvw"); info.removeAttribute("style");
      }
      function paintInfoPreview(u, pv, r) {
        const s = pv.sky, axis = s ? s.axis : u.axis, cur = s ? s.current : src.sky, nx = s ? s.preview : cur, fx = effectFor(pv, state.ctx);
        const elsewhere = [pv.gain && pv.gain.length ? `<b>Opens:</b> ${esc(names(pv.gain))}` : "", pv.lose && pv.lose.length ? `<b>Closes:</b> ${esc(names(pv.lose))}` : "", pv.better && pv.better.length ? `<b>Closer, still blocked:</b> ${esc(names(pv.better))}` : "", pv.worse && pv.worse.length ? `<b>Worse, still growing:</b> ${esc(names(pv.worse))}` : ""].filter(Boolean);
        info.setAttribute("style", catStyle(u.uiCategory)); info.classList.add("pvw");
        info.innerHTML = `<span class="li-k">Preview · ${esc(u.uiCategory || "Sky")} · ${esc(BANK_OF(u))}</span><div class="li-h"><span class="ni">${ico(I[u.id] ? u.id : CAT_ICON[u.uiCategory] || "air")}</span><div><b>${esc(u.name)}</b><small>${esc(stateWord(u))}</small></div></div>` +
          `<p>${esc(cap(u.sub || ""))}.</p><span class="li-part">${ico("terraform")}Changes the planet's sky · not the plant</span>` +
          `<div class="li-row">${ico(axis === "temp" ? "temp" : "humid")}<span><b>${axisName(axis)}:</b> ${axis === "temp" ? `${fmtT(cur.temperature)} → ${fmtT(nx.temperature)}` : `${num(cur.moisture)} → ${num(nx.moisture)}`}${A.hud().skyAdjusted ? " (as the ground sees it)" : ""}</span></div>` +
          `<div class="li-row fx-${fx.cls}">${ico(fx.icon)}<span><b>${esc(fx.text)}</b></span></div>` + (elsewhere.length ? `<div class="li-row">${ico("regions")}<span>${elsewhere.join(" · ")}</span></div>` : "") +
          `<p class="li-hint">${u.canBuy ? "Click or press Enter to buy." : u.rules ? `Needs ${u.price} Biomass.` : esc(cap(u.reason || "Not available now"))}</p>`;
      }
      // ---- the right-hand card: the real current planet readout (current → preview while previewing, scenario-adjusted, climate instability from
      // the real preview) and the region / planet effect from the real preview lists
      const pct = v => `${Math.round(v * 100)} %`;
      function paintReadout(pv, r) {
        const sky = src.sky, hud = A.hud(), sc = A.scenario(), s = pv && pv.sky, c = pv && pv.climate, soilC = r.conditions.find(x => x.key === "Soil") || { word: "", lamp: "green" };
        const arrow = (ax, now, nxt) => s && s.axis === ax ? ` <i class="to">→ ${nxt}</i>` : "";
        const rows = [[ico("temp"), "Sky temperature", `${fmtT(sky.temperature)}${arrow("temp", sky.temperature, s ? fmtT(s.preview.temperature) : "")}`, hud.skyAdjusted ? `Terraformed ${fmtT(hud.sky.temp)} · the scenario adds the rest` : ""],
          [ico("humid"), "Rain · sky moisture", `${num(sky.moisture)}${arrow("moist", sky.moisture, s ? num(s.preview.moisture) : "")}`, hud.skyAdjusted ? `Terraformed ${num(hud.sky.moist)} · the scenario adds the rest` : ""]];
        if (sc.climate) { const C = sc.climate, ax = c ? C.axes[c.axis] : null;
          rows.push([ico("hazard"), "Climate instability", c ? `${pct(c.axisBefore)} <i class="to">→ ${pct(c.axisAfter)}</i> · ${esc(sc.climate.bandName)}${c.bandAfter !== c.bandBefore ? ` → ${esc((C.bandNames || [])[c.bandAfter] || "")}` : ""}` : `${pct(C.level)} · ${esc(C.bandName)}`,
            c ? (c.triggersShock ? `⚠ Sets off a ${c.kind ? lower(c.kind.name) : "shock"} (about ${c.axis === "temp" ? `${c.kind && c.kind.sign < 0 ? "−" : "+"}${num(c.magnitude)} °C` : `${c.kind && c.kind.sign < 0 ? "−" : "+"}${num(c.magnitude)} moisture`})` : c.addsToActive ? `Adds to the ${ax ? lower(ax.name) : ""} swing already under way` : c.afterQuiet ? "Stays volatile: another shock can follow the quiet spell" : c.crossesBand ? "Crosses into a less settled band · no shock from this step" : "No shock from this step") : (C.forecast || "")]); }
        rows.push([ico("soil"), "Soil here", `${chip(LAMP_ST[soilC.lamp] || "ok", cap(soilC.word))}`, ""], [ico(r.limiting.blocked ? "x" : "check"), "Limiting factor", r.limiting.blocked ? esc(cap(r.limiting.key)) : "None", r.limiting.blocked ? esc(r.limiting.text) : r.limiting.softSoil ? "marginal soil" : ""]);
        mm.ctx.querySelector(".env-rows").innerHTML = rows.map(([ic, k, v, n]) => `<div><dt>${ic}${k}</dt><dd><b>${v}</b>${n ? `<small>${n}</small>` : ""}</dd></div>`).join("");
        const rowsEl = mm.ctx.querySelector(".mc-rows");
        if (!pv) { rowsEl.innerHTML = `<div class="mc-row faint">${ico("info")}<span>Hover a planet system to see what it does for ${esc(r.name)} and the whole planet</span></div>`; mm.ctx.classList.remove("pvw"); mm.ctx.removeAttribute("style"); return; }
        const fx = effectFor(pv, state.ctx), tot = [["Opens", pv.gain, "check"], ["Closes", pv.lose, "x"], ["Closer, still blocked", pv.better, "alert"], ["Worse, still growing", pv.worse, "alert"]].filter(([, l]) => l && l.length);
        rowsEl.innerHTML = `<div class="mc-row fx-${fx.cls}">${ico(fx.icon)}<span><b>${esc(fx.text)}</b></span></div>` + (tot.length ? tot.map(([k, l, ic]) => `<div class="mc-row faint">${ico(ic)}<span><b>${k} ${l.length}:</b> ${esc(names(l))}</span></div>`).join("") : `<div class="mc-row faint">${ico("info")}<span>No region changes state right away.</span></div>`);
        const u = items.find(x => x.id === pv.id); mm.ctx.setAttribute("style", catStyle(u && u.uiCategory)); mm.ctx.classList.add("pvw");
      }
      const lower = s => (s || "").toLowerCase();
      function readoutGlobe(sky, s) { gread.querySelector(".d-t").innerHTML = s && s.axis === "temp" ? `${esc(fmtT(sky.temperature))} <i class="to">→ ${esc(fmtT(s.preview.temperature))}</i>` : esc(fmtT(sky.temperature));
        gread.querySelector(".d-r").innerHTML = s && s.axis === "moist" ? `${esc(fmtM(sky.moisture))} <i class="to">→ ${esc(num(s.preview.moisture))}</i>` : esc(fmtM(sky.moisture)); gread.classList.toggle("pvw", !!s); }
      function paintPreview() {
        const pv = state.preview, u = state.hovered ? items.find(x => x.id === state.hovered) : null, r = A.region(state.ctx);
        if (!u || !pv) { showSky(src.sky); paintScene(r, src.sky, false); paintInfoBase(r); paintReadout(null, r); readoutGlobe(src.sky, null); stage.dataset.chan = ""; paintEdges(); return; }
        const nx = pv.sky ? pv.sky.preview : src.sky; showSky(nx); paintScene(r, nx, true); paintInfoPreview(u, pv, r); paintReadout(pv, r); readoutGlobe(src.sky, pv.sky); stage.dataset.chan = pv.sky ? pv.sky.axis : (u.axis || ""); paintEdges();
      }
      // UPGRADE PREVIEW CONTRACT (as Adapt / Spread): a real node previews ONLY while hovered / focused, through adapter.actions.preview(id)
      // (bloom:upgrade-preview + the home map's outline); every reset path clears it and the globe returns to the committed current surface.
      function setHover(nid) {
        if (state.hovered === nid) return; state.hovered = nid;
        if (nid) state.preview = A.actions.preview(nid); else { state.preview = null; if (A.activePreview()) A.actions.clearPreview(); }
        paintNodes(); paintPreview(); mm.invalidate();
      }
      const clear = () => { if (state.hovered !== null) setHover(null); };
      stage.addEventListener("pointerover", e => { if (state.suspended) return; const b = e.target.closest(".node"); if (b) setHover(b.dataset.node); else clear(); });
      stage.addEventListener("pointermove", e => { if (!state.suspended) return; state.suspended = false; const b = e.target.closest(".node"); if (b) setHover(b.dataset.node); });
      stage.addEventListener("pointerout", e => { const b = e.target.closest(".node"); if (!b) return; const to = e.relatedTarget; if (!to || !(to.closest && to.closest(".node") === b)) clear(); });
      stage.addEventListener("pointerleave", clear); stage.addEventListener("pointercancel", clear);
      stage.addEventListener("focusin", e => { const b = e.target.closest(".node"); if (b) setHover(b.dataset.node); else clear(); }); // focus on the globe or elsewhere in the card = leaving the tree
      stage.addEventListener("focusout", e => { if (!stage.contains(e.relatedTarget)) clear(); });
      stage.addEventListener("click", e => {
        const b = e.target.closest(".node"); if (!b) return; const u = items.find(x => x.id === b.dataset.node); if (!u) return;
        if (!u.canBuy) { setHover(u.id); return; }
        if (A.actions.buy(u.id)) { live(`Bought ${u.name}. The sky changes.`); if (state.hovered === u.id) { state.hovered = null; setHover(u.id); } } // still on the node: the NEXT real tier previews
      });
      stage.addEventListener("keydown", e => { if (e.key !== "Enter" && e.key !== " ") return; const b = e.target.closest(".node"); if (!b) return; e.preventDefault(); b.click(); });
      observe(() => relayout(), stage);
      function paint() { if (state.ctx < 0) return; readSurface(); readTree(); paintNodes(); paintSoil(A.region(state.ctx)); paintPreview(); mm.paint(); relayout(); }
      rooms[id] = { sec, mm, stage, paint, onOpen() { paint(); requestAnimationFrame(() => relayout()); }, clear() { clear(); mm.pk(-1); }, redraw() { relayout(); },
        focusNode(nid) { const n = nodeEls[nid]; if (n) { n.focus(); return true; } return false; }, focusFirst: () => sec.querySelector("h2").focus(),
        globeKind: () => globeKind, globe: () => globe, source: () => src, dispose() { globe.dispose(); },
        measure() { const rect = el => { const r = el.getBoundingClientRect(); return [r.x, r.y, r.width, r.height].map(v => Math.round(v * 10) / 10); }, sr = stage.getBoundingClientRect();
          return { em: state.em, globe: globeKind, items: items.map(u => ({ id: u.id, cat: u.uiCategory, bank: BANK_OF(u), tier: u.tier, price: u.price, canBuy: u.canBuy, rules: u.rules, owned: u.owned })),
            banks: Object.fromEntries(BANK_ORDER.map(b => [b, L ? L.banks[b].length : 0])), layout: L ? { R: L.R, HR: L.HR, zone: L.zone, RO: L.RO, cx: L.cx + sr.x, cy: L.cy + sr.y, box: L.box, nodeW: L.nodeW, soilW: L.soilW } : null,
            faceMeasured: globe.view ? globe.view.state().globeRadiusPx : null, sphere: globe.view ? globe.view.state() : null, stage: rect(stage), globeBox: rect(gh), soil: rect(soil), legend: rect(legend), readout: rect(gread),
            nodes: items.map(u => ({ id: u.id, rect: rect(nodeEls[u.id]), lock: nodeEls[u.id].querySelector(".nl") ? rect(nodeEls[u.id].querySelector(".nl")) : null })), labels: cats.map(c => ({ cat: c, rect: rect(lbls[c]) })),
            connectors: [...edges.querySelectorAll(".lead")].map(p => ({ id: p.dataset.node, d: p.getAttribute("d"), width: parseFloat(getComputedStyle(p).strokeWidth), lit: p.classList.contains("on"), toSurface: p.classList.contains("to-surface") })),
            rings: edges.querySelectorAll(".ring").length, pins: edges.querySelectorAll(".pin").length, soilArrows: edges.querySelectorAll(".to-surface").length,
            atmo: L ? { stops: TG.atmosphereStops(L.face, L.HR, L.RO), color: (edges.querySelector("stop") || {}).getAttribute ? edges.querySelector("stop").getAttribute("stop-color") : null, peak: TG.ATMO.peak } : null,
            soilEmpty: !!soil.querySelector(".bank-empty"), soilText: soil.textContent.replace(/\s+/g, " ").trim(), specimen: !!sec.querySelector(".lf-top:not(.env), .aplate, .lead-g"), chan: stage.dataset.chan || "" }; } };
    }

    // ---------------------------------------------------------------- the controller: open / close / switch / context
    function setCtx(i, from) {
      if (i < 0 || i >= regs.length) return; state.ctx = i; state.peek = -1;
      miniMaps.forEach(m => m.paint()); for (const k in rooms) if (!rooms[k].sec.hidden) rooms[k].paint();
      if (from && state.room) live(`Considering ${regs[i].name}`);
    }
    // (029E) the transition lock: while a swap runs, every swap-affecting control is locked (the mist's overlay blocks input too) and a
    // second request is ignored cleanly; the lock is released when the transition has completed (resume / focus happen after that)
    const tnow = () => performance.now();
    const lock = (kind) => { state.transitioning = true; state.transitionKind = kind; layer.dataset.transitioning = kind; view.el.dataset.transitioning = kind; };
    const unlock = () => { state.transitioning = false; state.transitionKind = null; delete layer.dataset.transitioning; delete view.el.dataset.transitioning; };
    const record = e => { TL.push(e); if (TL.length > 60) TL.shift(); return e; };
    // the swap through the bridge (the mist when it can run, immediate otherwise); the swap function runs exactly once on every path
    const swapThrough = (kind, swap, origin) => T ? T.run({ onCovered: swap, kind, origin }) : Promise.resolve((swap({ immediate: true, why: "no-transition" }), { ran: false, immediate: true, covered: false, error: null }));
    // the incoming room's restrained card entrance (opacity rise, a few px of lift, scale → 1), only when the mist ran; never under reduced motion
    const entrance = (sec, ran) => { sec.classList.remove("entering"); if (!ran || reduced()) return; void sec.offsetWidth; sec.classList.add("entering"); sec.addEventListener("animationend", () => sec.classList.remove("entering"), { once: true }); };
    const focusRoom = (room, ctx) => {
      // a requested real node ("Would help") gets a deliberate focus preview; until the pointer really moves, a pointerover the browser may
      // synthesise for whatever now sits under the stationary pointer (Firefox does, on a room swap) must not clear it (the 029C suspended rule)
      if (ctx.item && room.focusNode) { state.suspended = true; if (room.focusNode(ctx.item)) return; state.suspended = false; } room.focusFirst(); };
    function open(name, ctx = {}) {
      const room = rooms[name]; if (!room) return false;
      if (state.transitioning) { state.ignored++; return false; }                   // (029E) one swap at a time: a repeated click / key is dropped
      const first = !state.room;
      if (!first && state.room === name) return () => close(false);
      const e = record({ kind: first ? "open" : "switch", from: state.room, to: name, tStart: tnow(), runningBefore: A.run().running, tPause: null, tCovered: null, tSwapDone: null, tEnd: null, runningAtSwap: null, runningAtEnd: null, ran: false, immediate: null, ticksAtStart: A.run().ticks, ticksAtEnd: null });
      if (first) {
        const run = A.run(); state.wasRunning = run.running; state.opener = ctx.opener || null;   // 1 · the pre-room running state, remembered for Back
        if (run.running) { A.actions.pause(); e.tPause = tnow(); }                                 // 2 · the REAL pause, at once (the one bloom:play-pause)
      } else { const old = rooms[state.room]; old.clear(); if (A.activePreview()) A.actions.clearPreview(); } // room → room: the old room's transient preview cleared BEFORE the swap
      lock(e.kind);
      const swap = () => {                                                                           // 4 · at the covered point
        e.tCovered = tnow(); e.runningAtSwap = A.run().running;
        if (first) {
          const sel = A.selection().index, carry = ctx.region >= 0 ? ctx.region : sel >= 0 ? sel : state.ctx >= 0 ? state.ctx : origin();
          if (sel >= 0 || A.selection().water) A.actions.deselect();                 // the home selection is cleared (the real bloom:region-select)
          regs = A.regions(); state.ctx = carry; state.peek = -1;
          layer.hidden = false; view.el.classList.add("in-room"); calibrate();           // calibrate with the layer laid out
          parts.forEach(x => { x.inert = true; x.setAttribute("aria-hidden", "true"); });   // the Planet View stays, exactly where it was, inert
        } else { rooms[state.room].sec.hidden = true; }                                   // no Planet View in between
        state.room = name; view.rooms.setActive(name);
        room.sec.hidden = false; room.onOpen(); paintHeader();
        layer.querySelectorAll("[data-go]").forEach(b => { if (b.classList.contains("rn")) b.setAttribute("aria-pressed", String(b.dataset.go === name)); });
        live(`${ROOMS[name].title} open. Game paused. Considering ${regs[state.ctx].name}.`);
        e.tSwapDone = tnow();
      };
      swapThrough(e.kind, swap, ctx.origin || null).then(res => {                                  // 5 · revealed → 6 · focus the room control
        e.tEnd = tnow(); e.ran = !!res.ran; e.immediate = !!res.immediate; e.runningAtEnd = A.run().running; e.ticksAtEnd = A.run().ticks; e.error = res.error || null;
        unlock(); entrance(room.sec, res.ran);
        requestAnimationFrame(() => { if (state.room === name && !state.transitioning) focusRoom(room, ctx); });
      });
      return () => close(false);
    }
    function close(resume) {
      if (!state.room || state.transitioning) { if (state.room) state.ignored++; return; }
      const room = rooms[state.room], from = state.room;
      const e = record({ kind: resume ? "resume" : "back", from, to: null, tStart: tnow(), runningBefore: A.run().running, wasRunning: !!state.wasRunning, tCovered: null, tSwapDone: null, tEnd: null, tResume: null, runningAtSwap: null, runningAtEnd: null, ran: false, immediate: null, ticksAtStart: A.run().ticks, ticksAtEnd: null });
      room.clear(); if (A.activePreview()) A.actions.clearPreview();                  // 1 · the transient preview cleared · 2 · still paused
      lock(e.kind);
      const swap = () => {                                                              // 4 · at the covered point: hide the room, restore the Planet View, no selection
        e.tCovered = tnow(); e.runningAtSwap = A.run().running;
        room.sec.hidden = true; room.sec.classList.remove("entering"); state.room = null; state.hovered = null; state.preview = null; state.peek = -1; state.lensPv = null;
        layer.hidden = true; view.el.classList.remove("in-room"); parts.forEach(x => { x.inert = false; x.removeAttribute("aria-hidden"); });
        view.rooms.setActive(null);
        e.tSwapDone = tnow();
      };
      swapThrough(e.kind, swap, null).then(res => {                                     // 5 · revealed → 6 · ONLY now: Resume runs; Back restores the pre-room state
        e.tEnd = tnow(); e.ran = !!res.ran; e.immediate = !!res.immediate; e.error = res.error || null;
        unlock();
        if (resume) A.actions.play(); else A.actions.setRunning(!!state.wasRunning);
        e.tResume = tnow(); e.runningAtEnd = A.run().running; e.ticksAtEnd = A.run().ticks;
        live(`Back to Planet View${A.run().running ? ", running" : ", still paused"}. No region selected.`);
        const op = state.opener; state.opener = null;                                   // 7 · focus back where the room was opened from
        if (op && document.contains(op) && !op.closest("[hidden]") && !op.closest("[inert]")) op.focus(); else { const t = view.el.querySelector('.pv-tool[data-tool="region"]'); if (t) t.focus(); }
      });
    }
    // (029E) an immediate close with no transition and no resume — the run has ended (win / loss) while a room was open: the production
    // report takes over the Planet View through its own SUBDUED swap, so nothing stale may stay open underneath it
    function closeImmediate() {
      if (!state.room) return false; const room = rooms[state.room];
      room.clear(); if (A.activePreview()) A.actions.clearPreview();
      room.sec.hidden = true; room.sec.classList.remove("entering"); state.room = null; state.hovered = null; state.preview = null; state.peek = -1; state.lensPv = null; state.opener = null;
      layer.hidden = true; view.el.classList.remove("in-room"); parts.forEach(x => { x.inert = false; x.removeAttribute("aria-hidden"); });
      view.rooms.setActive(null); unlock(); record({ kind: "end-of-run", from: room.sec.dataset.room, tStart: tnow(), tEnd: tnow(), immediate: true, ran: false });
      return true;
    }
    function paintHeader() { const h = A.hud(); layer.querySelectorAll(".rbio-n").forEach(e => { e.textContent = h.biomass; }); const r = A.run(); layer.querySelectorAll(".paused").forEach(e => e.classList.toggle("on", !r.running)); }
    layer.addEventListener("click", e => {
      if (state.transitioning) { state.ignored++; return; }
      const a = e.target.closest("[data-act]"); if (a) { close(a.dataset.act === "resume"); return; }
      const g = e.target.closest(".rn[data-go]"); if (g) open(g.dataset.go, { region: state.ctx, opener: state.opener });
    });
    document.addEventListener("keydown", e => { if (e.key === "Escape" && state.room) { e.preventDefault(); if (state.transitioning) { state.ignored++; return; } close(false); } }, LIFE);
    // preview safety nets: the window losing focus, the tab hidden, the pointer leaving the window
    root.addEventListener("blur", () => { state.suspended = true; for (const k in rooms) if (rooms[k].clear && !rooms[k].sec.hidden) rooms[k].clear(); }, LIFE);
    root.addEventListener("focus", () => { state.suspended = false; }, LIFE);
    document.addEventListener("visibilitychange", () => { if (document.hidden) { state.suspended = true; for (const k in rooms) if (!rooms[k].sec.hidden) rooms[k].clear(); } }, LIFE);
    document.addEventListener("pointerout", e => { if (!e.relatedTarget) for (const k in rooms) if (!rooms[k].sec.hidden) rooms[k].clear(); }, LIFE);

    // ---------------------------------------------------------------- build, subscribe, register
    buildRegion(); buildBoard("adapt"); buildBoard("spread"); buildTerraform();
    const unsub = A.subscribe(ch => {
      if (!state.room) return; const r = ch.reasons;
      if (r.includes("win") || r.includes("loss")) { closeImmediate(); return; }   // (029E) the run ended under an open room: nothing stale under the report
      if (r.some(x => x !== "tick" && x !== "message" && x !== "preview-clear" && x !== "upgrade-preview")) regs = A.regions();
      if (r.includes("upgrade-purchase") || r.includes("local-upgrade") || r.includes("growth-focus") || r.includes("tick") || r.includes("region-select")) { condCache = null; const room = rooms[state.room]; room.paint(); }
      paintHeader(); miniMaps.forEach(m => m.invalidate());
    });
    let raf = 0, disposed = false; (function loop() { if (disposed) return; raf = requestAnimationFrame(loop); if (!state.room) return; for (const m of miniMaps) m.frame(); })();
    observe(() => { if (!state.room) return; calibrate(); const room = rooms[state.room]; if (room.redraw) room.redraw(); miniMaps.forEach(m => m.relayout()); }, layer);
    // the 028D1 anchors these rooms now own (the hidden shell's copies become data-tutorial-legacy): docs/PRODUCTION_PLANT_ROOMS_v1.md §11
    const claimed = ["raw-signals", "growth-focus", "local-upgrade", "upgrades", "board-adapt", "board-spread", "board-terraform"]; // (029D) + the Terraform board and its real nodes
    const c0 = A.colony(origin()); for (const f of c0.focusChoices) claimed.push(`focus-${f.id}`); for (const l of c0.localChoices) claimed.push(`local-${l.id}`);
    for (const b of A.upgrades()) for (const u of b.items) claimed.push(`upgrade-${u.id}`);
    view.rooms.claimAnchors(claimed);
    // paint every room once now (hidden, context = origin): the claimed anchors exist before any room opens, so a coach can resolve
    // them first; the first open repaints for the real context
    state.ctx = origin(); for (const k in rooms) rooms[k].paint();
    for (const name of ROOM_IDS) view.rooms.register(name, { open: ctx => open(name, ctx) }); // (029D) Terraform registers too: its tool reads ready

    const api = {
      el: layer, adapter: A, rooms, open, close, closeImmediate, setCtx, setLens, previewLens, calibrate,
      // (029E) the ONE gameplay transition of this run (BLOOM.gameplayTransition bridge over the unmodified AtmosphereTransition, SUBDUED);
      // the production report shares it. null only when the bridge file is not loaded (every swap is then immediate)
      transition: T,
      timeline: () => TL.map(e => ({ ...e })),
      state: () => ({ room: state.room, context: state.ctx, contextId: state.ctx >= 0 ? regs[state.ctx].id : null, wasRunning: state.wasRunning, peek: state.peek, lens: state.lens, lensPreview: state.lensPv,
        hovered: state.hovered, preview: state.preview ? state.preview.id : null, em: state.em, emBy: state.emBy, emChips: state.emChips, emHeight: state.emHeight, medianName, claimedAnchors: claimed.slice(),
        globe: rooms.terraform ? rooms.terraform.globeKind() : null, // (029D) "pending" | "sphere" | "fallback"
        transitioning: state.transitioning, transitionKind: state.transitionKind, transition: T ? T.kind : "none", ignored: state.ignored, swaps: TL.length }), // (029E)
      measure: name => rooms[name] && rooms[name].measure ? rooms[name].measure() : null,
      // (029D) disposing the rooms disposes the Terraform globe (its WebGL context, canvas and listeners) with them; (029E) and the transition
      dispose() { if (disposed) return; disposed = true; cancelAnimationFrame(raf); unsub(); if (state.room) closeImmediate(); for (const k in rooms) if (rooms[k].dispose) rooms[k].dispose(); if (T) T.dispose();
        life.abort(); ROS.forEach(ro => ro.disconnect()); SPECS.forEach(sp => sp.dispose()); layer.remove(); instance = null; DR.instance = null; },
    };
    if (T) T.prepare(); // (029E) the mist's bitmaps drawn in idle time now, so the first room opens on the next frame (non-blocking; a swap before this resolves is immediate)
    // (029D) destroying the production view destroys the rooms with it (and the Terraform globe's WebGL context, canvas and listeners):
    // the Planet View's own dispose runs after ours. Additive: the view's api object is plain and knows nothing about the rooms.
    const pvDispose = view.dispose; view.dispose = () => { if (instance === api) api.dispose(); pvDispose(); };
    instance = api; DR.instance = api; return api;
  }
  const DR = { mount, version: 1, instance: null, CATS: Object.freeze(CATS), CAT_COLOR: Object.freeze(CAT_COLOR), CAT_PART: Object.freeze(CAT_PART), TENDRIL: Object.freeze(TENDRIL), BANKS: Object.freeze(BANKS), TF: Object.freeze(TF) };
  root.BLOOM = Object.assign(root.BLOOM || {}, { decisionRooms: DR });
})(typeof window !== "undefined" ? window : globalThis);
