/*
  BLOOM-025 · Concept 17 — Final Interaction & Connector Refinement.

  VISUAL CONCEPT MOCKUP ONLY. Fake data (shared.js), scripted behaviour, not connected to the game. Not the production UI.
  Nothing here loads or calls the engine, generator, validators, scenarios, balance data or Bloom Report.

  Forked from c16.js (Concept 16, BLOOM-024, unchanged). Same architecture, same scale system, same floating rooms; this round
  is a FINAL refinement of Concept 16's interaction and connector details (docs/UI_CONCEPT_REVIEW_v9.md), not a new round:
    - PLANT LINK (review-only switch in the top ribbon, ?link=bridge|docked|organic): three treatments of the plant → tree
      connection on the same page. BRIDGE (baseline): separate cards with a deliberate connector gutter between them; leaders
      run inside it and enter the tree through sockets on its left edge. DOCKED: the plant card docks against the tree card
      (shared seam, no gap) and the leaders run inside a lane bay on the tree's left edge. ORGANIC: cards as in Concept 16,
      thicker smooth tendril leaders with a vein highlight. Fake data, positions, tree content, colours and room scale are
      identical in all three; only the drawing of the link changes.
    - RIGHT-PANEL REGION PILLS: hover / focus on a region pill outlines that region on the mini-map and peeks its status;
      leaving restores the room's selected context; only a click selects.
    - PAUSE WORDING: "PAUSED" and "Resume", nothing more. Behaviour unchanged.
    - "WOULD HELP" ACTIONS (Region Inspect): intrinsic-width buttons, two columns when there are two, one when there is one.
    - MAP VIEW: on Planet View it is a compact popover directly under the Map View button with the five view choices only
      (no legend, no explanation); hover / focus previews, click commits; closes on outside click, Escape and tool toggle.
    - TERRAFORM EXCLUSION ZONE: one atmosphere halo band around the globe; a reserved clearance outside it that nothing may
      enter except the intended Soil (surface pin) and Atmosphere (halo ring) endpoints; subskill connectors are straight or
      short elbows along the bank; lock badges sit on the node's outer corner; readout and legend sit outside the zone.
    - SPREAD PADDING: the anat layout pads top and bottom symmetrically from the real card height, so the content-height
      Spread card has equal breathing room on every side.
    - HOVER RESET, strengthened: node → empty space, node → node, node → other panel, pill → away, Map View item → outside
      the popover, Terraform node → globe, window blur, tab hidden, focus-out: everything restores the committed state at once.
  Deep links for review / QA: ?room=adapt|spread|terraform|region&region=frost&lens=temp&link=docked
*/
(function(){
'use strict';
const BM = window.BM, sv = BM.sv, esc = BM.esc, S = BM.store.s;
const q = new URLSearchParams(location.search);
/* review-only Plant link switch (BLOOM-025): how the plant card and the tree card are joined. Not game UI. */
const LINKS = [['bridge', '1', 'Bridge'], ['docked', '2', 'Docked'], ['organic', '3', 'Organic']];
const LINK_IDS = LINKS.map(l => l[0]);
const LINK_RAIL = { bridge:1.5, docked:3.0, organic:1.5 };     // em: where the category rail sits inside the tree card (docked keeps a lane bay)
let link = 'bridge';
try { const m = localStorage.getItem('bloomC17Link'); if (LINK_IDS.includes(m)) link = m; } catch (e) {}
if (LINK_IDS.includes(q.get('link'))) link = q.get('link');
const ROOM_IDS = ['region', 'adapt', 'spread', 'terraform'];
const ROOMS = {
  region:{ kicker:'EXPLORE', title:'Region Inspect', tool:'Regions', ico:'regions', kind:'explore', verb:'Compare regions and their colonies' },
  adapt:{ kicker:'CHANGE · YOUR PLANT', title:'Adapt', tool:'Adapt', ico:'adapt', kind:'plant', verb:'Change your plant' },
  spread:{ kicker:'CHANGE · HOW IT TRAVELS', title:'Spread', tool:'Spread', ico:'spread', kind:'spread', verb:'Reach new land' },
  terraform:{ kicker:'CHANGE · THE PLANET', title:'Terraform', tool:'Terraform', ico:'terraform', kind:'planet', verb:'Change the planet, not the plant' },
};

/* ───────────────────────── inline SVG icon set (no emoji) ───────────────────────── */
const I = {
  regions:'<rect x="3" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5"/>',
  mapview:'<path d="M3 8l9-4 9 4-9 4z"/><path d="M3 12l9 4 9-4"/><path d="M3 16l9 4 9-4"/>',
  inspect:'<path d="M12 21s-6-5.3-6-10a6 6 0 0 1 12 0c0 4.7-6 10-6 10z"/><circle cx="12" cy="11" r="2.2"/>',
  adapt:'<path d="M5 19C5 10 10 5 20 4c0 10-5 15-14 15z"/><path d="M5 19l9-9"/>',
  spread:'<circle cx="12" cy="12" r="2.4"/><path d="M12 9.4V3.5M9.6 6l2.4-2.5L14.4 6"/><path d="M14.1 13.2l5 3.6M15.9 19.2l3.2-2.4-.5-4"/><path d="M9.9 13.2l-5 3.6M8.1 19.2l-3.2-2.4.5-4"/>',
  terraform:'<circle cx="12" cy="12" r="6.2"/><path d="M2.5 10.2c6.5 4.2 12.5 4.2 19 0M2.5 13.8c6.5-4.2 12.5-4.2 19 0" opacity=".9"/>',
  pause:'<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>',
  play:'<path d="M7.5 5l11 7-11 7z"/>',
  close:'<path d="M6 6l12 12M18 6L6 18"/>',
  back:'<path d="M15 5l-7 7 7 7"/><path d="M8 12h12"/>',
  temp:'<path d="M10 4a2 2 0 0 1 4 0v9.5a4 4 0 1 1-4 0z"/><circle cx="12" cy="17" r="1.6"/>',
  water:'<path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z"/>',
  soil:'<path d="M3 14h18M3 18h18"/><circle cx="8" cy="9" r="1.3"/><circle cx="14" cy="7" r="1.3"/><circle cx="17" cy="11" r="1.3"/>',
  hazard:'<path d="M12 4l9 16H3z"/><path d="M12 10v4"/><circle cx="12" cy="17" r=".9"/>',
  reach:'<path d="M3 9c3-3 6 3 9 0s6-3 9 0M3 15c3-3 6 3 9 0s6-3 9 0"/>',
  cold:'<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9"/><path d="M10 4l2 2 2-2M10 20l2-2 2 2"/>',
  heat:'<circle cx="12" cy="12" r="4"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  drought:'<path d="M12 21V11"/><path d="M12 11c-5 0-7-4-7-7 4 0 7 2 7 7zM12 14c0-5 3-7 7-7 0 4-2 7-7 7z"/>',
  flood:'<path d="M12 3s5 6 5 9.5a5 5 0 0 1-10 0C7 9 12 3 12 3z"/><path d="M3 20c3-2 6 2 9 0s6-2 9 0"/>',
  salt:'<path d="M12 3l7 7-7 11-7-11z"/><path d="M5 10h14M12 3v18"/>',
  rad:'<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  seedOut:'<circle cx="12" cy="12" r="2.4"/><circle cx="12" cy="5.5" r="2.1"/><circle cx="12" cy="18.5" r="2.1"/><circle cx="5.5" cy="12" r="2.1"/><circle cx="18.5" cy="12" r="2.1"/>',
  waterSeeds:'<ellipse cx="12" cy="10" rx="5" ry="4"/><path d="M12 6v8"/><path d="M3 18c3-2 6 2 9 0s6-2 9 0"/>',
  earlyMat:'<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>',
  wind:'<path d="M3 8h10a2.5 2.5 0 1 0-2.5-2.5M3 12h15a2.5 2.5 0 1 1-2.5 2.5M3 16h8a2.5 2.5 0 1 1-2.5 2.5"/>',
  burr:'<circle cx="12" cy="12" r="4"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>',
  runner:'<path d="M3 17c4 0 4-6 8-6s4 6 8 6"/><path d="M7 14v3M15 14v3M11 11V8"/>',
  bank:'<rect x="4" y="9" width="16" height="11" rx="2"/><path d="M4 13h16M9 9V6a3 3 0 0 1 6 0v3"/>',
  drift:'<ellipse cx="11" cy="9" rx="5" ry="3.6"/><path d="M2 16c3-2 6 2 9 0s6-2 9 0M2 20c3-2 6 2 9 0s6-2 9 0"/>',
  warm:'<circle cx="12" cy="12" r="4"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  cool:'<path d="M7 16a4 4 0 0 1-.5-8A6 6 0 0 1 18 8a3.5 3.5 0 0 1 0 8z"/><path d="M8 19l-1 2M12 19l-1 2M16 19l-1 2"/>',
  humid:'<path d="M7 15a4 4 0 0 1-.5-8A6 6 0 0 1 18 7a3.5 3.5 0 0 1 0 8z"/><path d="M8 18l-1 3M12 18l-1 3M16 18l-1 3"/>',
  dry:'<circle cx="12" cy="8" r="3.5"/><path d="M12 1.5v2M5 8H3M21 8h-2M7 3l1.4 1.4M17 3l-1.4 1.4"/><path d="M3 17h18M8 17l-1.5 4M13 17l1 4M18 17l-1 3"/>',
  veil:'<path d="M4 8c3-2 5 2 8 0s5-2 8 0M4 12c3-2 5 2 8 0s5-2 8 0M4 16c3-2 5 2 8 0s5-2 8 0"/>',
  bright:'<path d="M7 16a4 4 0 0 1-.5-8A6 6 0 0 1 18 8a3.5 3.5 0 0 1 0 8z"/><path d="M12 2v2M6 4l1.5 1.5M18 4l-1.5 1.5"/>',
  monsoon:'<path d="M7 13a4 4 0 0 1-.5-8A6 6 0 0 1 18 5a3.5 3.5 0 0 1 0 8z"/><path d="M6 16l-1 3M9.5 16l-1 3M13 16l-1 3M16.5 16l-1 3"/>',
  soilb:'<path d="M3 20h18"/><path d="M5 16c2-4 5-6 7-6s5 2 7 6"/><path d="M3 12h18" opacity=".5"/>',
  leach:'<path d="M12 3s5 6 5 9.5a5 5 0 0 1-10 0C7 9 12 3 12 3z"/><path d="M4 21h16M8 18l1-3M15 18l-1-3"/>',
  air:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4.5" opacity=".6"/>',
  lock:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  check:'<path d="M5 12.5l4.5 4.5L19 7"/>',
  alert:'<path d="M12 5v9"/><circle cx="12" cy="18" r="1"/>',
  x:'<path d="M6 6l12 12M18 6L6 18"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  roots:'<path d="M12 3v8M12 11l-5 5M12 11l5 5M7 16l-2 4M7 16l2 4M17 16l-2 4M17 16l2 4"/>',
  leaves:'<path d="M5 19C5 10 10 5 20 4c0 10-5 15-14 15z"/><path d="M5 19l9-9"/>',
  seeds:'<path d="M12 21V9"/><path d="M12 9c-3 0-5-3-5-6 3 0 5 2 5 6zM12 12c0-4 2-6 5-6 0 3-2 6-5 6z"/>',
  balanced:'<path d="M12 3v18M4 7h16M6 7l-3 6a3 3 0 0 0 6 0zM18 7l-3 6a3 3 0 0 0 6 0z"/>',
  network:'<circle cx="12" cy="5" r="2"/><circle cx="5" cy="18" r="2"/><circle cx="19" cy="18" r="2"/><path d="M12 7v5m0 0l-5.5 4.5M12 12l5.5 4.5"/>',
  canopy:'<path d="M12 21v-6"/><path d="M12 15c-6 0-8-4-8-8 0-2 1-4 3-4 1-2 4-2 5 0 1-2 4-2 5 0 2 0 3 2 3 4 0 4-2 8-8 8z"/>',
  reserve:'<path d="M12 21v-8"/><ellipse cx="12" cy="8" rx="5" ry="5"/><path d="M12 3v10"/>',
  overview:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  colony:'<path d="M12 21v-9"/><path d="M12 12c-4 0-6-3-6-6 3 0 6 2 6 6zM12 12c0-4 2-6 6-6 0 3-2 6-6 6z"/>',
  science:'<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3"/><path d="M7.5 16h9"/>',
  root:'<path d="M12 3c5 0 8 4 8 9s-3 9-8 9-8-4-8-9 3-9 8-9z"/><path d="M12 3v18"/>',
  planet:'<circle cx="12" cy="12" r="6.2"/><path d="M2.5 10.2c6.5 4.2 12.5 4.2 19 0M2.5 13.8c6.5-4.2 12.5-4.2 19 0" opacity=".9"/>',
  off:'<circle cx="12" cy="12" r="8"/><path d="M6.5 6.5l11 11"/>',
  crown:'<path d="M12 21V9"/><circle cx="12" cy="6" r="3"/><path d="M12 3v-1M9.5 3.5l-.7-.7M14.5 3.5l.7-.7M8.5 6h-1M15.5 6h1"/>',
  stem:'<path d="M12 21V6"/><path d="M12 12c-3 0-5-2-5-5 3 0 5 2 5 5zM12 16c0-3 2-5 5-5 0 3-2 5-5 5z"/>',
  land:'<path d="M2 18l5-7 4 5 3-4 8 6z"/><path d="M2 21h20"/><circle cx="17" cy="7" r="2.2"/>',
  drag:'<path d="M8 5l4-3 4 3M8 19l4 3 4-3M5 8l-3 4 3 4M19 8l3 4-3 4"/>',
};
const ico = (n, cls) => '<svg class="ic' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + (I[n] || I.plus) + '</svg>';
const CAT_ICO = { Temperature:'temp', Water:'water', Soil:'soil', Hazard:'hazard', Seeds:'seedOut', Growth:'colony', Reach:'reach', 'Sky temperature':'temp', Rain:'humid', Ground:'soil', Air:'air' };
const ITEM_ICO = { cold:'cold', heat:'heat', drought:'drought', flood:'flood', salt:'salt', rad:'rad', seedOut:'seedOut', waterSeeds:'waterSeeds', earlyMat:'earlyMat', warm:'warm', cool:'cool', humid:'humid', dry:'dry' };
const chip = (st, word) => '<span class="st ' + st + '"><i aria-hidden="true">' + ico(st === 'ok' ? 'check' : st === 'warn' ? 'alert' : 'x') + '</i>' + esc(word || BM.ST_WORD[st]) + '</span>';

/* ───────────────────────── upgrade trees (fake, deterministic; same 13 items as every concept) ─────────────────────────
   Adapt / Spread categories are ORDERED TOP-TO-BOTTOM LIKE THE PLANT (part: which plant feature the category points at and
   where that feature sits on the placeholder drawing, in the specimen's own coordinates), so leader lines never cross. */
const TREES = {
  adapt:{ root:{ id:'a0', name:'Pioneer plant', text:'Your starting plant. Every adaptation grows out of this body.', ico:'root' },
    cats:['Hazard', 'Water', 'Temperature', 'Soil'], chan:{ Temperature:'temp', Water:'water', Soil:'soil', Hazard:'hazard' },
    part:{ Hazard:{ name:'Leaf pigment', at:[86, 102], ico:'leaves' }, Water:{ name:'Leaf shape', at:[116, 122], ico:'water' }, Temperature:{ name:'Stem', at:[100, 143], ico:'stem' }, Soil:{ name:'Roots', at:[106, 190], ico:'roots' } },
    nodes:[
      { id:'rad', item:true, cat:'Hazard', parent:'a0' },
      { id:'f-bark', future:true, name:'Thick Bark', cat:'Hazard', parent:'rad', cost:260, ico:'rad', desc:'Corky bark shrugs off vent heat and radiation.', look:'Ridged dark stem' },
      { id:'drought', item:true, cat:'Water', parent:'a0' },
      { id:'f-tap', future:true, name:'Deep Taproot', cat:'Water', parent:'drought', cost:240, ico:'roots', desc:'One long root finds water far below.', look:'Long single root' },
      { id:'flood', item:true, cat:'Water', parent:'a0' },
      { id:'f-aer', future:true, name:'Air Roots', cat:'Water', parent:'flood', cost:240, ico:'roots', desc:'Roots that breathe above the waterline.', look:'Knobbly roots above ground' },
      { id:'cold', item:true, cat:'Temperature', parent:'a0' },
      { id:'f-anti', future:true, name:'Antifreeze Sap', cat:'Temperature', parent:'cold', cost:220, ico:'cold', desc:'Sugars in the sap stop cells freezing. Deeper cold.', look:'Thicker stem, darker leaves' },
      { id:'heat', item:true, cat:'Temperature', parent:'a0' },
      { id:'f-wax', future:true, name:'Waxy Cuticle', cat:'Temperature', parent:'heat', cost:200, ico:'heat', desc:'A waxy coat slows water loss in heat.', look:'Glossy leaf edges' },
      { id:'salt', item:true, cat:'Soil', parent:'a0' },
      { id:'f-gland', future:true, name:'Salt Glands', cat:'Soil', parent:'salt', cost:230, ico:'salt', desc:'Leaves sweat salt out as crystals.', look:'White leaf tips' },
      { id:'f-nfix', future:true, name:'Nitrogen Partners', cat:'Soil', parent:'a0', cost:190, ico:'soil', desc:'Root bacteria turn poor soil into food.', look:'Root nodules' },
    ] },
  spread:{ root:{ id:'s0', name:'Seeds', text:'How your plant travels. Every route starts with a seed.', ico:'seedOut' },
    cats:['Seeds', 'Growth', 'Reach'], chan:{ Seeds:'spread', Growth:'spread', Reach:'spread' },
    part:{ Seeds:{ name:'Seed head', at:[100, 82], ico:'crown' }, Growth:{ name:'Flowers', at:[112, 124], ico:'colony' }, Reach:{ name:'Pods', at:[90, 156], ico:'waterSeeds' } },
    nodes:[
      { id:'seedOut', item:true, cat:'Seeds', parent:'s0' },
      { id:'f-wind', future:true, name:'Wind Lift', cat:'Seeds', parent:'seedOut', cost:170, ico:'wind', desc:'Feathered seeds ride the wind two regions over.', look:'Fluffy seed heads' },
      { id:'f-burr', future:true, name:'Burr Hooks', cat:'Seeds', parent:'f-wind', cost:210, ico:'burr', desc:'Hooked seeds hitch rides on passing animals.', look:'Spiky seed cases' },
      { id:'earlyMat', item:true, cat:'Growth', parent:'s0' },
      { id:'f-bank', future:true, name:'Seed Bank', cat:'Growth', parent:'earlyMat', cost:200, ico:'bank', desc:'Dormant seeds wait out a bad season in the soil.', look:'Buried seed stores' },
      { id:'f-runner', future:true, name:'Runner Stems', cat:'Growth', parent:'s0', cost:150, ico:'runner', desc:'Creeping stems root wherever they touch.', look:'Low creeping stems' },
      { id:'waterSeeds', item:true, cat:'Reach', parent:'s0' },
      { id:'f-drift', future:true, name:'Long Drift', cat:'Reach', parent:'waterSeeds', cost:260, ico:'drift', desc:'Buoyant pods survive weeks at sea.', look:'Large sealed pods' },
    ] },
  /* Terraform: two BANKS. Soil (left C) points at the globe's surface; Atmosphere (reversed C, right) points at the halo.
     Node order inside a bank runs top → bottom like the real thing: Atmosphere = upper air → sky → weather near the ground;
     Soil = bare rock at the surface → topsoil → the deep root zone. The three Ground placeholders marked (new) are mockup-only
     later-tier placeholders added so the Soil bank reads as a bank; like every placeholder they cannot be bought. */
  terraform:{ root:{ id:'t0', name:'Planet systems', text:'The sky, the rain, the ground and the air. The plant itself never changes here.', ico:'planet' },
    cats:['Air', 'Sky temperature', 'Rain', 'Ground'], chan:{ 'Sky temperature':'env', Rain:'env', Ground:'env', Air:'env' },
    banks:{ soil:{ name:'Soil', cats:['Ground'], ico:'soil', to:'surface' }, atmo:{ name:'Atmosphere', cats:['Air', 'Sky temperature', 'Rain'], ico:'air', to:'halo' } },
    nodes:[
      { id:'f-ozone', future:true, name:'Thicker Air', cat:'Air', parent:'t0', cost:360, ico:'air', desc:'A denser sky screens the worst radiation.', look:'Softer light' },
      { id:'warm', item:true, cat:'Sky temperature', parent:'t0' },
      { id:'f-veil', future:true, name:'Greenhouse Veil', cat:'Sky temperature', parent:'warm', cost:320, ico:'veil', desc:'Trap more heat: warmer nights everywhere.', look:'Hazy warm sky' },
      { id:'cool', item:true, cat:'Sky temperature', parent:'t0' },
      { id:'f-bright', future:true, name:'Bright Clouds', cat:'Sky temperature', parent:'cool', cost:320, ico:'bright', desc:'Reflective clouds bounce sunlight back.', look:'White cloud decks' },
      { id:'humid', item:true, cat:'Rain', parent:'t0' },
      { id:'f-monsoon', future:true, name:'Monsoon Cycle', cat:'Rain', parent:'humid', cost:340, ico:'monsoon', desc:'Seasonal rains sweep the whole planet.', look:'Heavy seasonal rain' },
      { id:'dry', item:true, cat:'Rain', parent:'t0' },
      { id:'f-weather', future:true, name:'Rock Weathering', cat:'Ground', parent:'t0', cost:260, ico:'soil', desc:'Lichen and frost crack bare rock into grit. (new placeholder)', look:'Gritty pale ground' },
      { id:'f-dust', future:true, name:'Mineral Dust', cat:'Ground', parent:'f-weather', cost:290, ico:'wind', desc:'Wind spreads rock dust as fresh soil minerals. (new placeholder)', look:'Pale dusty surface' },
      { id:'f-soil', future:true, name:'Soil Building', cat:'Ground', parent:'t0', cost:280, ico:'soilb', desc:'Dead leaves become topsoil faster.', look:'Darker, deeper ground' },
      { id:'f-humus', future:true, name:'Deep Humus', cat:'Ground', parent:'f-soil', cost:310, ico:'roots', desc:'Layers of dead leaves become a dark, deep topsoil. (new placeholder)', look:'Dark deep ground' },
      { id:'f-leach', future:true, name:'Wash the Salt', cat:'Ground', parent:'f-soil', cost:300, ico:'leach', desc:'Flush salt down out of the root zone.', look:'Salt crust fades' },
    ] },
};
/* category colours with a reason (docs/UI_CONCEPT_REVIEW_v8.md §5). Adapt = the condition the plant answers; Spread = the
   dispersal logic (what carries the seed, how the colony grows, how far it reaches); Terraform = the planet layer. */
const CAT_COLOR = {
  Hazard:['#8a5bb8', '#efe5f8', '#5e3a86'], Water:['#3b8fd0', '#dcecf8', '#23679f'], Temperature:['#d9601f', '#fde6d6', '#9c3f0e'], Soil:['#8a6a3e', '#f1e6d2', '#5f452a'],
  Seeds:['#c58a1a', '#fbefcf', '#8a5d00'], Growth:['#3f9d4b', '#e2f2d6', '#2a7636'], Reach:['#1f8f8f', '#d8f1ef', '#136060'],
  Air:['#6f84c9', '#e6eaf8', '#44579a'], 'Sky temperature':['#d9601f', '#fde6d6', '#9c3f0e'], Rain:['#3b8fd0', '#dcecf8', '#23679f'], Ground:['#8a6a3e', '#f1e6d2', '#5f452a'],
};
const catStyle = c => { const k = CAT_COLOR[c]; return k ? '--cat:' + k[0] + ';--cat-soft:' + k[1] + ';--cat-dark:' + k[2] : ''; };
function buildTree(board){
  const tr = TREES[board];
  const nodes = tr.nodes.map(n => n.item ? Object.assign({}, BM.item(n.id), n, { ico:ITEM_ICO[n.id] }) : Object.assign({}, n));
  const byId = {}; nodes.forEach(n => { byId[n.id] = n; n.children = []; n.chan = tr.chan[n.cat]; });
  nodes.forEach(n => { if (n.parent !== tr.root.id) byId[n.parent].children.push(n); });
  const depth = n => n.parent === tr.root.id ? 1 : depth(byId[n.parent]) + 1;
  nodes.forEach(n => n.depth = depth(n));
  const slots = n => n._s || (n._s = Math.max(1, n.children.reduce((a, c) => a + slots(c), 0)));
  nodes.forEach(slots);
  const GAP = ANAT_GAP; let cursor = 0; const catSpan = {};
  const assign = (n, start) => { n.slot = start + n._s / 2; let c = start; n.children.forEach(ch => { assign(ch, c); c += ch._s; }); };
  tr.cats.forEach(c => { const start = cursor; nodes.filter(n => n.cat === c && n.depth === 1).forEach(t1 => { assign(t1, cursor); cursor += t1._s; }); catSpan[c] = [start, cursor]; cursor += GAP; });
  // bank order (Terraform): every node gets its own place along its bank's arc (pre-order per chain, data order), with a small
  // gap before each category; each node remembers its bank so the layout can split them left / right of the globe
  const GAPO = 0; const seq = {}, catGap = {}, bankOf = {}, bankLen = {};
  if (tr.banks) Object.keys(tr.banks).forEach(bk => { let s = 0; tr.banks[bk].cats.forEach((c, ci) => { if (ci) s += GAPO; catGap[c] = s; nodes.filter(n => n.cat === c && n.depth === 1).forEach(t1 => { const walk = n => { seq[n.id] = s + .5; bankOf[n.id] = bk; s += 1; n.children.forEach(walk); }; walk(t1); }); }); bankLen[bk] = s; });
  return { board, root:tr.root, cats:tr.cats, banks:tr.banks || null, part:tr.part || {}, nodes, byId, total:cursor, D:Math.max.apply(null, nodes.map(n => n.depth)), catSpan, seq, catGap, bankOf, bankLen, GAPO };
}
function nodeState(T, n){
  const parentOwned = n.parent === T.root.id || !!S.owned[n.parent];
  if (n.item) {
    if (S.owned[n.id]) return 'owned';
    if (!parentOwned) return 'locked';
    if (BM.store.blockedBy(n.id)) return 'blocked';
    return S.biomass >= n.cost ? 'avail' : 'poor';
  }
  return parentOwned ? 'future' : 'locked';
}
const STATE_WORD = { owned:'Owned', locked:'Locked', future:'Later tier', blocked:'Blocked', avail:'', poor:'' };

/* ───────────────────────── tree layouts (px, relaid on resize; all sizes derived from the room's em) ─────────────────────────
   anat   Adapt / Spread: a category RAIL at the left, one row per adaptation chain, later tiers to the right. Categories are
          ordered like the plant (top → bottom), so the leader lines from the plant (room-level overlay) never cross. The row
          step is CAPPED (STEP_MAX), so a small tree (Spread) stays compact and its box ends where the tree ends; the layout
          reports the height it wants (dims.wantH) and the room sizes the box to it.
   banks  Terraform: two vertical banks curving around the globe, a C (Soil, left) and a reversed C (Atmosphere, right), spread
          north / south rather than a full orbit. Nodes are spaced evenly in y along each bank and the bank bows outward at the
          middle (x = sqrt profile), so the tips curl in towards the poles. Soil leaders end on the globe's surface; Atmosphere
          leaders end on the dotted halo drawn around the globe. Children sit next to their parent along the bank. */
const curveH = (a, b) => { const mx = (a.x + b.x) / 2; return 'M' + a.x + ' ' + a.y + 'C' + mx + ' ' + a.y + ',' + mx + ' ' + b.y + ',' + b.x + ' ' + b.y; };
const STEP_MAX = 5.4;        // em: the largest row step the anat layout will use (Spread compactness)
const ANAT_GAP = .35;        // rows: the gap between categories in the anat layout
const TIER_SHRINK = .78;     // later-tier cards are this fraction of a tier-1 card's width (visual hierarchy, room for costs)
const CAT_SHORT = { 'Sky temperature':'Sky temp' };   // short captions on the Terraform banks (full name everywhere else)
const BANK_ICO = 1.55, BANK_STEP_MAX = 4.9;   // em: half the icon size and the largest node step in the Terraform banks
function layout(T, kind, w, h, em, nh){
  const pos = {}, anchors = {}, D = T.D, root = T.root.id, dims = { nw:12 * em, pw:8 * em };
  if (kind === 'anat') {
    /* BLOOM-025: equal outside breathing room. The first and last rows are padded by half a card plus PAD on both ends, so the
       content-height card (Spread) and the full-height card (Adapt) both show the same margin above and below the tree. */
    const PAD = 1 * em, half = (nh || 3.9 * em) / 2;
    const railX = LINK_RAIL[link] * em, padT = half + PAD, padB = half + PAD;
    /* Bridge gives 1.6 em of the tree's width to the connector gutter; it takes most of that back from the tier gap, the
       right margin and the later-tier ratio so tier-1 cards stay within a few per cent of the other two variants */
    const right = (link === 'bridge' ? .8 : 1) * em, gapX = (link === 'bridge' ? 1.1 : 1.3) * em, shrink = link === 'bridge' ? .74 : TIER_SHRINK;
    let labelW = 8.2 * em, left = railX + labelW + .9 * em;
    const widths = () => (w - left - right - gapX * (D - 1)) / (1 + shrink * (D - 1));   // tier-1 card width; later tiers are narrower
    let nw = widths();
    /* the label mode (full names vs icons) is decided from the LINK-INDEPENDENT width (the Concept 16 geometry), so the three
       Plant link variants always show the same category labels; only the cards flex by the gutter's width */
    const wBase = w + (link === 'bridge' ? 1.6 * em : link === 'docked' ? -1 * em : 0), leftBase = 1.5 * em + 8.2 * em + .9 * em;
    const nwBase = (wBase - leftBase - 1 * em - 1.3 * em * (D - 1)) / (1 + TIER_SHRINK * (D - 1));
    if (nwBase < 9.4 * em) { labelW = 2.8 * em; left = railX + labelW + .9 * em; nw = widths(); dims.labelMode = 'icon'; } else dims.labelMode = 'full';
    dims.nw = Math.max(7 * em, Math.min(13 * em, nw)); dims.nw2 = dims.nw * shrink; dims.tight = dims.nw < 9 * em;
    const rows = Math.max(1, T.total - ANAT_GAP - 1);
    const step = Math.min(STEP_MAX * em, (h - padT - padB) / rows);
    dims.wantH = padT + rows * STEP_MAX * em + padB;        // the height the tree WANTS (content height; the room caps it)
    const colX = d => left + dims.nw / 2 + (d > 1 ? dims.nw / 2 + gapX + (d - 2) * (dims.nw2 + gapX) + dims.nw2 / 2 : 0);
    T.nodes.forEach(n => pos[n.id] = { x:colX(n.depth), y:padT + (n.slot - .5) * step });
    pos[root] = { x:railX, y:padT, hidden:true };
    T.cats.forEach(c => { const rs = T.nodes.filter(n => n.cat === c && n.depth === 1).map(n => pos[n.id].y); const cy = rs.reduce((a, b) => a + b, 0) / rs.length;
      anchors[c] = { x:railX, y:cy, lx:railX + .8 * em, ly:cy, label:true }; });
    dims.railX = railX; dims.pad = PAD; dims.half = half; dims.railTop = Math.min.apply(null, T.cats.map(c => anchors[c].y)); dims.railBottom = Math.max.apply(null, T.cats.map(c => anchors[c].y));
  } else if (kind === 'banks') {
    const cx = w / 2, cy = h / 2;
    const ICO = BANK_ICO * em, LAB = 5 * em, GAP = .4 * em, M = .5 * em, padY = .5 * em;
    /* BLOOM-025 exclusion zone (docs/UI_CONCEPT_REVIEW_v9.md §7): ONE atmosphere halo band from R + HALO_IN to R + HALO_IN +
       HALO_W, then CLEAR of reserved clearance. zone = the radius nothing may enter except the intended Soil / Atmosphere
       endpoints. Subskill connectors run in a LANE just outside the zone; the bank icons sit outside the lane. */
    const HALO_IN = .3 * em, HALO_W = 1 * em, CLEAR = 1 * em, LANE = .7 * em, TOPBOT = 3.6 * em;
    const banks = Object.keys(T.banks);
    // the globe takes the width left after both banks (icon + label), the halo, the clearance and the lane
    const bankW = ICO * 2 + GAP + LAB;
    let R = Math.min(w / 2 - bankW - (HALO_IN + HALO_W + CLEAR + LANE) - M, h / 2 - (HALO_IN + HALO_W + CLEAR) - TOPBOT - .4 * em);
    R = Math.max(5.5 * em, R);
    const zone = R + HALO_IN + HALO_W + CLEAR;
    dims.gw = 2 * R; dims.R = R; dims.halo = R + HALO_IN + HALO_W / 2; dims.haloW = HALO_W; dims.haloOut = R + HALO_IN + HALO_W; dims.zone = zone; dims.lane = LANE; dims.ico = ICO;
    dims.pw = LAB; dims.narrow = false; dims.labelMode = 'full';
    pos[root] = { x:cx, y:cy, hidden:true };
    const ryMax = h / 2 - ICO - padY;                       // the banks may run from near the top to near the bottom
    banks.forEach(bk => {
      const B = T.banks[bk], sign = B.to === 'surface' ? -1 : 1;    // Soil left, Atmosphere right
      const ids = T.nodes.filter(n => T.bankOf[n.id] === bk).map(n => n.id);
      const len = T.bankLen[bk], n = ids.length;
      // even spacing in y: step is as large as the bank can afford, capped so a short bank stays compact
      const stepMax = (2 * ryMax) / Math.max(1, len - 1 + 2 * .5);
      const step = Math.min(BANK_STEP_MAX * em, stepMax);
      const span = (len - 1) * step;                         // from the first node centre to the last
      const ry = Math.max(span / 2, 1);
      const rxIn = zone + LANE + ICO;                        // the bank's closest approach to the globe (middle of the C)
      /* the tips curl back in towards the poles, but never into the zone: the bow is reduced until every icon (and the lane
         beside it) stays outside the reserved radius */
      let bow = Math.max(0, Math.min(rxIn - R * .45, 4.2 * em));
      const place = b => ids.map(id => { const s = T.seq[id] - .5, y = cy - span / 2 + s * step, t = span ? (y - cy) / ry : 0; return { id, x:cx + sign * (rxIn - b * (1 - Math.sqrt(Math.max(0, 1 - t * t)))), y, t }; });
      const clear = ps => ps.every(p => Math.hypot(p.x - cx, p.y - cy) - ICO - LANE >= zone - .5);
      let ps = place(bow); while (bow > 0 && !clear(ps)) { bow = Math.max(0, bow - .1 * em); ps = place(bow); }
      ps.forEach(p => { pos[p.id] = { x:p.x, y:p.y, left:sign < 0, bank:bk, t:p.t }; });
      dims['bow_' + bk] = bow;
      // category labels sit in the gap above each category's first node, hugging the bank
      B.cats.forEach((c, ci) => { const first = ids.find(id => T.byId[id].cat === c); const p = pos[first]; if (!p) return;
        anchors[c] = { x:p.x + sign * (ICO + GAP), y:p.y - (ICO + .45 * em), label:true, gap:true, left:sign < 0, bank:bk, first:ci === 0 }; });
      dims['bank_' + bk] = { x:cx + sign * (rxIn - bow), top:cy - span / 2 - ICO - 1.7 * em, left:sign < 0, len:n };
      void n;
    });
    dims.cx = cx; dims.cy = cy;
  }
  return { pos, anchors, dims };
}
const roomEm = el => parseFloat(getComputedStyle(el.closest('.room') || el).fontSize) || 16;

/* ───────────────────────── tree renderer: hover / focus = preview, click = fake buy ───────────────────────── */
function renderTree(host, board, kind, opts){
  opts = opts || {};
  const T = buildTree(board), style = kind === 'banks' ? 'pill' : 'card';
  const el = document.createElement('div'); el.className = 'tree k-' + kind + ' s-' + style + ' b-' + board; host.appendChild(el);
  const bankEls = {};
  if (kind === 'banks') {
    const bg = document.createElement('div'); bg.className = 'tree-bg'; el.appendChild(bg);
    const lg = document.createElement('div'); lg.className = 'bank-legend'; lg.setAttribute('aria-label', 'Planet systems: Soil on the left points at the ground, Atmosphere on the right points at the air around the planet');
    lg.innerHTML = Object.keys(T.banks).map(bk => { const B = T.banks[bk]; return '<span class="' + bk + '">' + ico(B.ico) + '<b>' + esc(B.name) + '</b><small>' + (B.to === 'surface' ? 'left · points at the ground' : 'right · points at the air around the planet') + '</small></span>'; }).join('');
    el.appendChild(lg);
  }
  const edges = sv('svg', { class:'edges', 'aria-hidden':'true', focusable:'false' }, el);
  const center = document.createElement('div'); center.className = 'center'; el.appendChild(center); if (kind !== 'banks') center.hidden = true;
  const lbls = {}; T.cats.forEach(c => { const l = document.createElement('div'); l.className = 'cat-l'; l.dataset.cat = c; l.setAttribute('style', catStyle(c)); l.innerHTML = ico(CAT_ICO[c]) + '<span>' + esc(c) + '</span>'; l.title = c; el.appendChild(l); lbls[c] = l; });
  const nodeEls = {};
  T.nodes.forEach(n => { const b = document.createElement('button'); b.type = 'button'; b.dataset.node = n.id; b.dataset.cat = n.cat; b.setAttribute('style', catStyle(n.cat)); nodeEls[n.id] = b; el.appendChild(b); });
  let hovered = null;
  function paintNodes(){
    T.nodes.forEach(n => {
      const b = nodeEls[n.id], st = nodeState(T, n);
      const meta = STATE_WORD[st] || (n.cost + ' Biomass');
      b.className = 'node ' + style + ' ch-' + n.chan + ' st-' + st + (n.depth > 1 ? ' d2' : '') + (n.future ? ' future' : '') + (hovered === n.id ? ' pv' : '') + ['lab-side', 'lab-left'].filter(k => b.classList.contains(k)).map(k => ' ' + k).join('');
      const cap = kind === 'banks' && T.nodes.find(x => x.cat === n.cat) === n ? '<i class="cat-cap">' + ico(CAT_ICO[n.cat]) + esc(CAT_SHORT[n.cat] || n.cat) + '</i>' : '';   // banks: the first node of a category carries its caption
      b.innerHTML = '<span class="ni">' + ico(n.ico || CAT_ICO[n.cat]) + (st === 'locked' || st === 'future' ? '<span class="nl">' + ico('lock') + '</span>' : st === 'owned' ? '<span class="nl ok">' + ico('check') + '</span>' : '') + '</span>' +
        '<span class="nt">' + cap + '<b>' + esc(n.name) + '</b><small>' + esc(meta) + '</small></span>';
      b.setAttribute('aria-label', n.name + ', ' + n.cat + ', ' + (st === 'avail' || st === 'poor' ? n.cost + ' Biomass' : (STATE_WORD[st] || '')) + (n.future ? ' (placeholder, not purchasable in this mockup)' : '') + '. ' + n.desc);
      b.setAttribute('aria-disabled', st === 'owned' || st === 'locked' || st === 'future' ? 'true' : 'false');
    });
    paintEdges();
  }
  let L = null;
  function relayout(){
    const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return;
    const em = roomEm(el);
    const nh = kind === 'anat' ? Math.max.apply(null, T.nodes.map(n => nodeEls[n.id].offsetHeight || 0)) || 0 : 0;   // the real card height (symmetric padding)
    L = layout(T, kind, w, h, em, nh);
    if (kind === 'anat') el.style.setProperty('--bay', (L.dims.railX + .4 * em) + 'px');
    el.style.setProperty('--nw', L.dims.nw + 'px'); el.style.setProperty('--nw2', (L.dims.nw2 || L.dims.nw) + 'px'); el.style.setProperty('--pw', L.dims.pw + 'px'); if (L.dims.gw) el.style.setProperty('--gw', L.dims.gw + 'px');
    el.classList.toggle('tight', !!L.dims.tight); el.classList.toggle('narrow', !!L.dims.narrow); el.classList.toggle('lab-icon', L.dims.labelMode === 'icon');
    edges.setAttribute('viewBox', '0 0 ' + w + ' ' + h); edges.setAttribute('width', w); edges.setAttribute('height', h);
    const put = (node, p) => { node.style.left = p.x + 'px'; node.style.top = p.y + 'px'; };
    T.nodes.forEach(n => { const p = L.pos[n.id]; const b = nodeEls[n.id]; put(b, p); if (kind === 'banks') { b.classList.add('lab-side'); b.classList.toggle('lab-left', !!p.left); } });
    T.cats.forEach(c => { const a = L.anchors[c]; put(lbls[c], a.lx !== undefined ? { x:a.lx, y:a.ly } : a); lbls[c].classList.toggle('gap', !!a.gap); lbls[c].classList.toggle('lab-left', !!a.left); lbls[c].querySelector('span').hidden = L.dims.labelMode === 'icon'; });
    paintEdges();
    if (opts.onLayout) opts.onLayout(L, T);
  }
  function paintEdges(){
    if (!L) return; edges.textContent = '';
    const P = L.pos, nw = L.dims.nw, em = roomEm(el);
    const cls = n => { const st = nodeState(T, n); return st === 'owned' ? 'on' : (st === 'avail' || st === 'poor' || st === 'blocked' || st === 'future') ? 'open' : 'off'; };
    const add = (d, c, cat) => { const p = sv('path', { class:'edge ' + c, d }, edges); if (cat) { p.dataset.cat = cat; p.setAttribute('style', catStyle(cat)); } return p; };
    if (kind === 'anat') {
      const rx = L.dims.railX;
      add('M' + rx + ' ' + L.dims.railTop + 'V' + L.dims.railBottom, 'rail-e open');
      const wOf = n => n.depth === 1 ? nw : (L.dims.nw2 || nw);
      T.nodes.forEach(n => { const from = n.depth === 1 ? L.anchors[n.cat] : { x:P[n.parent].x + wOf(T.byId[n.parent]) / 2, y:P[n.parent].y }; add(curveH(from, { x:P[n.id].x - wOf(n) / 2, y:P[n.id].y }), cls(n) + (hovered === n.id ? ' on' : ''), n.cat); });
      T.cats.forEach(c => { const a = L.anchors[c], lit = hovered && T.byId[hovered].cat === c;
        if (link !== 'organic') { const en = sv('path', { class:'entry' + (lit ? ' on' : ''), d:'M0 ' + a.y + 'H' + a.x }, edges); en.setAttribute('style', catStyle(c)); }   // the leader's last step from the card edge to the rail
        const port = sv('circle', { class:'port' + (lit ? ' on' : ''), cx:a.x, cy:a.y, r:(link === 'organic' ? .62 : .5) * em }, edges); port.setAttribute('style', catStyle(c)); });
    } else {
      /* banks: the globe's surface, a dotted HALO around it (the atmosphere, never over the face), and one leader per node:
         Soil leaders end on the surface with a ground pin; Atmosphere leaders end on the halo with a ring. Children are joined
         to their parent by a short arc along the bank. */
      const cx = L.dims.cx, cy = L.dims.cy, R = L.dims.R, HR = L.dims.halo;
      /* ONE atmosphere halo: a translucent band around the globe (never over its face); Atmosphere leaders end on its centre line */
      const halo = sv('circle', { class:'halo', cx, cy, r:HR }, edges); halo.style.strokeWidth = L.dims.haloW + 'px';
      T.nodes.forEach(n => {
        const p = P[n.id], lit = hovered === n.id, bank = T.banks[p.bank], toSurface = bank.to === 'surface';
        if (n.depth === 1) {
          const a = Math.atan2(p.y - cy, p.x - cx);                    // aim at the globe centre
          const r0 = toSurface ? R - .15 * em : HR;
          const end = { x:cx + Math.cos(a) * r0, y:cy + Math.sin(a) * r0 };
          const start = { x:p.x - Math.cos(a) * (BANK_ICO * em + .3 * em), y:p.y - Math.sin(a) * (BANK_ICO * em + .3 * em) };
          const mx = (start.x + end.x) / 2, my = (start.y + end.y) / 2 + (p.y - cy) * .18;
          const e = add('M' + start.x + ' ' + start.y + 'Q' + mx + ' ' + my + ' ' + end.x + ' ' + end.y, 'lead ' + (toSurface ? 'to-surface' : 'to-halo') + ' ' + cls(n) + (lit ? ' on' : ''), n.cat);
          e.dataset.node = n.id;
          if (toSurface) { const pin = sv('path', { class:'pin' + (lit ? ' on' : ''), d:'M' + end.x + ' ' + end.y + 'l' + (-.45 * em) + ' ' + (-.75 * em) + 'h' + (.9 * em) + 'z', transform:'rotate(' + (a * 180 / Math.PI + 90) + ' ' + end.x + ' ' + end.y + ')' }, edges); pin.setAttribute('style', catStyle(n.cat)); }
          else { const ring = sv('circle', { class:'ring' + (lit ? ' on' : ''), cx:end.x, cy:end.y, r:.42 * em }, edges); ring.setAttribute('style', catStyle(n.cat)); }
        } else {
          /* later tier (BLOOM-025): a SHORT connection along the bank that never enters the zone. Adjacent parent / child:
             one straight segment from the parent's icon bottom to the child's icon top. Otherwise (a second child further
             down the bank): a short elbow in the lane just outside the icons, on the globe side, still outside the zone. */
          const pp = P[n.parent]; const ICO = L.dims.ico, inward = p.left ? 1 : -1;
          const adjacent = Math.abs(T.seq[n.id] - T.seq[n.parent]) <= 1.01;
          let d;
          if (adjacent) d = 'M' + pp.x + ' ' + (pp.y + ICO + .15 * em) + 'L' + p.x + ' ' + (p.y - ICO - .15 * em);
          else { /* the lane follows the bank: one short segment per node passed, each lane point just outside that node's icon */
            const lanePt = m => (P[m.id].x + inward * (ICO + L.dims.lane * .55)) + ' ' + P[m.id].y;
            const between = T.nodes.filter(m => T.bankOf[m.id] === p.bank && T.seq[m.id] > T.seq[n.parent] && T.seq[m.id] < T.seq[n.id]);
            d = 'M' + (pp.x + inward * (ICO + .15 * em)) + ' ' + pp.y + 'H' + lanePt(T.byId[n.parent]).split(' ')[0] + between.map(m => 'L' + lanePt(m)).join('') + 'L' + lanePt(n) + 'H' + (p.x + inward * (ICO + .15 * em)); }
          add(d, 'chain ' + cls(n) + (lit ? ' on' : ''), n.cat);
        }
      });
    }
  }
  const nodeOf = id => T.byId[id];
  const setHover = id => { if (hovered === id) return; hovered = id; paintNodes(); };
  /* HOVER RESET RULE: a node previews only while the pointer is over it or it has keyboard focus. Moving onto empty tree space,
     onto another element, out of the tree, out of the window, or losing focus restores the committed state at once. */
  const previewOf = id => { setHover(id); if (opts.onPreview) opts.onPreview(id ? nodeOf(id) : null, T); };
  const clear = () => { if (hovered !== null) previewOf(null); };
  /* after the window loses focus (or the tab is hidden) the browser may re-fire a pointerover for the node still under the
     stationary pointer once its contents repaint; that must not bring the preview back. Previews resume on a real move. */
  let suspended = false;
  el.addEventListener('pointerover', e => { if (suspended) return; const b = e.target.closest('.node'); if (b) previewOf(b.dataset.node); else clear(); });
  el.addEventListener('pointermove', e => { if (!suspended) return; suspended = false; const b = e.target.closest('.node'); if (b) previewOf(b.dataset.node); });   // a real move resumes previews
  window.addEventListener('focus', () => { suspended = false; });
  el.addEventListener('pointerout', e => { const b = e.target.closest('.node'); if (!b) return; const to = e.relatedTarget; if (!to || !(to.closest && to.closest('.node') === b)) clear(); });
  el.addEventListener('pointerleave', clear); el.addEventListener('pointercancel', clear);
  el.addEventListener('focusin', e => { const b = e.target.closest('.node'); if (b) previewOf(b.dataset.node); });
  el.addEventListener('focusout', e => { if (!el.contains(e.relatedTarget)) clear(); });
  window.addEventListener('blur', () => { suspended = true; clear(); }); document.addEventListener('visibilitychange', () => { if (document.hidden) { suspended = true; clear(); } });
  document.addEventListener('pointerout', e => { if (!e.relatedTarget) clear(); });   // pointer left the window
  el.addEventListener('click', e => {
    const b = e.target.closest('.node'); if (!b) return; const n = nodeOf(b.dataset.node);
    const st = nodeState(T, n);
    if (st === 'owned') return BM.toast(n.name + ' is already part of ' + (board === 'terraform' ? 'the planet.' : 'your plant.'));
    if (st === 'locked') return BM.toast('Needs ' + T.byId[n.parent].name + ' first.');
    if (st === 'future') return BM.toast(n.name + ' is a later-tier placeholder: not purchasable in this mockup.');
    const res = BM.store.buy(n.id);                                     // CLICK COMMITS (fake buy); the preview is re-read from the new state
    if (!res.ok) return BM.toast(res.reason);
    BM.toast((board === 'terraform' ? 'The planet changes: ' : 'Your plant changes: ') + n.look.toLowerCase() + (res.opened.length ? '. ' + res.opened.map(id => BM.region(id).name).join(', ') + ' opens.' : '.'));
    if (opts.onBought) opts.onBought(n, res);
    if (hovered === n.id && opts.onPreview) opts.onPreview(n, T);     // still hovering: the preview now shows the owned state
  });
  const ro = new ResizeObserver(() => relayout()); ro.observe(el);
  BM.store.on(e => { if (e.type !== 'gain') paintNodes(); });
  paintNodes(); requestAnimationFrame(relayout);
  return { el, center, T, relayout, get L(){ return L; }, get hovered(){ return hovered; }, clear, focusNode:id => { const b = nodeEls[id]; if (b) b.focus(); }, nodeEl:id => nodeEls[id], nodeState:id => nodeState(T, T.byId[id]) };
}

/* ───────────────────────── globe (Terraform centre): stylised textured sphere, click-drag / arrow keys to spin ─────────────────────────
   Land blobs sit at fake longitudes / latitudes; the ten fake regions each own one blob so a hover preview can light the same
   regions the mini-map marks (green = would open, pink = made harder). Not a map projection: a convincing sphere is the goal. */
const GLOBE_LAND = [
  { r:'sunny', lon:0, lat:12, rx:30, ry:20 }, { r:'fern', lon:-28, lat:22, rx:18, ry:13 }, { r:'marsh', lon:-26, lat:-6, rx:16, ry:12 },
  { r:'cloud', lon:-12, lat:40, rx:17, ry:9 }, { r:'frost', lon:18, lat:52, rx:26, ry:10 }, { r:'ember', lon:42, lat:32, rx:17, ry:12 },
  { r:'dust', lon:32, lat:4, rx:24, ry:15 }, { r:'salt', lon:26, lat:-24, rx:20, ry:12 }, { r:'mossy', lon:-4, lat:-22, rx:22, ry:14 }, { r:'tide', lon:64, lat:-10, rx:10, ry:8 },
  { lon:120, lat:30, rx:28, ry:16 }, { lon:150, lat:-18, rx:34, ry:20 }, { lon:-120, lat:8, rx:30, ry:22 }, { lon:-150, lat:-40, rx:22, ry:10 }, { lon:95, lat:-48, rx:20, ry:9 }, { lon:-80, lat:44, rx:18, ry:9 },
];
function mountGlobe(host){
  const R = 190, C = 200;
  const svg = sv('svg', { viewBox:'0 0 400 400', class:'globe', role:'img', tabindex:0, 'aria-label':'The planet (placeholder globe). Drag or use the arrow keys to spin it. Sky temperature and rain change with Terraform previews.' });
  const defs = sv('defs', {}, svg); const gid = 'gl' + Math.random().toString(36).slice(2, 7);
  const grad = sv('radialGradient', { id:gid, cx:'36%', cy:'32%', r:'75%' }, defs);
  const s1 = sv('stop', { offset:0, 'stop-color':'#cfeefb' }, grad), s2 = sv('stop', { offset:.75, 'stop-color':'#4f94c9' }, grad), s3 = sv('stop', { offset:1, 'stop-color':'#2b5f8e' }, grad);
  const clip = sv('clipPath', { id:gid + 'c' }, defs); sv('circle', { cx:C, cy:C, r:R }, clip);
  sv('circle', { cx:C, cy:C, r:R + 8, fill:'rgba(255,255,255,.35)' }, svg);
  sv('circle', { cx:C, cy:C, r:R, fill:'url(#' + gid + ')' }, svg);
  const inner = sv('g', { 'clip-path':'url(#' + gid + 'c)' }, svg);
  const merid = sv('g', { fill:'none', stroke:'rgba(255,255,255,.22)', 'stroke-width':1.2 }, inner);
  const landG = sv('g', {}, inner);
  const blobs = GLOBE_LAND.map(b => { const e = sv('ellipse', { class:'land' + (b.r ? ' rg-' + b.r : ''), 'data-r':b.r || '' }, landG); return { b, e }; });
  const ice = sv('g', { opacity:0 }, inner); sv('ellipse', { cx:C, cy:C - R + 6, rx:R * .62, ry:26, fill:'#fff', opacity:.92 }, ice); sv('ellipse', { cx:C, cy:C + R - 4, rx:R * .56, ry:22, fill:'#fff', opacity:.92 }, ice);
  const cloud = sv('g', { opacity:0 }, inner); [[70, 120, 46, 14], [230, 90, 56, 16], [300, 230, 50, 15], [120, 290, 60, 18], [220, 330, 44, 13]].forEach(([x, y, rx, ry]) => sv('ellipse', { cx:x, cy:y, rx, ry, fill:'#fff', opacity:.85 }, cloud));
  const haze = sv('circle', { cx:C, cy:C, r:R, fill:'#f0cf86', opacity:0 }, inner);
  const warm = sv('circle', { cx:C, cy:C, r:R, fill:'#ffb347', opacity:0 }, inner);
  sv('circle', { cx:C, cy:C, r:R, fill:'none', stroke:'rgba(20,50,80,.35)', 'stroke-width':10, opacity:.5, 'clip-path':'url(#' + gid + 'c)' }, svg);
  sv('circle', { cx:C, cy:C, r:R, fill:'none', stroke:'rgba(255,255,255,.7)', 'stroke-width':3 }, svg);
  sv('ellipse', { cx:C - 70, cy:C - 90, rx:60, ry:28, fill:'rgba(255,255,255,.28)', transform:'rotate(-30 130 110)', 'pointer-events':'none' }, svg);
  host.appendChild(svg);
  let rot = 0, lit = { open:[], worse:[] };
  const rad = d => d * Math.PI / 180;
  function paint(){
    merid.textContent = '';
    for (let m = 0; m < 180; m += 45) { const s = Math.sin(rad(m) + rot); sv('ellipse', { cx:C, cy:C, rx:Math.max(.5, Math.abs(s) * R), ry:R }, merid); }
    [-50, 0, 50].forEach(lat => sv('ellipse', { cx:C, cy:C - Math.sin(rad(lat)) * R, rx:Math.cos(rad(lat)) * R, ry:Math.cos(rad(lat)) * R * .22 }, merid));
    blobs.forEach(({ b, e }) => {
      const lon = rad(b.lon) + rot, lat = rad(b.lat);
      const z = Math.cos(lat) * Math.cos(lon);
      e.classList.toggle('open', lit.open.includes(b.r)); e.classList.toggle('worse', lit.worse.includes(b.r)); e.classList.toggle('lit', lit.sel === b.r);
      if (z <= .04) { e.setAttribute('opacity', 0); e.setAttribute('pointer-events', 'none'); return; }
      const x = C + R * Math.cos(lat) * Math.sin(lon), y = C - R * Math.sin(lat);
      e.setAttribute('cx', x.toFixed(1)); e.setAttribute('cy', y.toFixed(1));
      e.setAttribute('rx', (b.rx * Math.max(.18, z) + b.rx * .1).toFixed(1)); e.setAttribute('ry', (b.ry * (1 - .35 * (1 - z))).toFixed(1));
      e.setAttribute('opacity', Math.min(1, .35 + z)); e.removeAttribute('pointer-events');
    });
  }
  let drag = null;
  svg.addEventListener('pointerdown', e => { drag = { x:e.clientX, rot }; svg.setPointerCapture(e.pointerId); e.preventDefault(); });
  svg.addEventListener('pointermove', e => { if (!drag) return; rot = drag.rot + (e.clientX - drag.x) / 90; paint(); });
  const end = () => { drag = null; }; svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', end);
  svg.addEventListener('keydown', e => { const d = { ArrowLeft:-.25, ArrowRight:.25 }[e.key]; if (d) { e.preventDefault(); rot += d; paint(); } });
  paint();
  return { el:svg, paint, get rot(){ return rot; }, set rot(v){ rot = v; paint(); },
    update(sky, pv){
      const dt = sky.dt, dm = sky.dm;
      s1.setAttribute('stop-color', dt > 0 ? '#ffe3b3' : dt < 0 ? '#eaf2ff' : '#cfeefb'); s2.setAttribute('stop-color', dt > 0 ? '#df8e52' : dt < 0 ? '#6b8fc7' : '#4f94c9'); s3.setAttribute('stop-color', dt > 0 ? '#9a5a2e' : dt < 0 ? '#3f5c8f' : '#2b5f8e');
      const landFill = dm > 0 ? '#5faf5a' : dm < 0 ? '#c8b57a' : '#8fc77a'; blobs.forEach(({ e }) => e.style.setProperty('--lf', landFill)); landG.style.fill = landFill;
      ice.setAttribute('opacity', dt < 0 ? 1 : 0); cloud.setAttribute('opacity', dm > 0 ? 1 : 0); haze.setAttribute('opacity', dm < 0 ? .4 : 0); warm.setAttribute('opacity', dt > 0 ? .18 : 0);
      lit = { open:(pv && pv.open) || [], worse:(pv && pv.worse) || [], sel:pv && pv.sel };
      svg.classList.toggle('pv', !!(pv && pv.on)); paint();
    } };
}

/* ───────────────────────── land / environment scene (Terraform, upper-left): no plant, only sky, weather and ground ───────────────────────── */
const SKYC = { clear:['#8fcdf2', '#e6f5fd'], snow:['#b4c9e2', '#f1f5fb'], haze:['#efd294', '#fbf0d2'], rain:['#9cb0c2', '#e0e8ef'], ember:['#e59a74', '#fbe0c6'] };
const GROUND = { meadow:['#9ccb6a', '#6fa84a'], fern:['#8fbf66', '#5f9a48'], marsh:['#86b58e', '#5c8f6a'], frost:['#e8eef3', '#c5d2dd'], highland:['#c7bda4', '#9a8f78'], dust:['#e9cf92', '#c9a86a'], salt:['#f1ebe0', '#d8cdb8'], ember:['#b98a74', '#7b5a4b'], island:['#c9dc8e', '#8fb55c'] };
const hexv = h => [1, 3, 5].map(k => parseInt(h.slice(k, k + 2), 16));
const mixc = (a, b, t) => { const A = hexv(a), B = hexv(b); return '#' + A.map((v, k) => Math.max(0, Math.min(255, Math.round(v + (B[k] - v) * t))).toString(16).padStart(2, '0')).join(''); };
function mountScene(host){
  const box = document.createElement('div'); box.className = 'scene'; host.appendChild(box);
  const svg = sv('svg', { viewBox:'0 0 400 300', role:'img', 'aria-label':'The land around the colony (placeholder scene): sky, weather and ground. No plant is drawn here: Terraform changes the environment.' }, box);
  const gid = 'sc' + Math.random().toString(36).slice(2, 7);
  const grad = sv('linearGradient', { id:gid, x1:0, y1:0, x2:0, y2:1 }, sv('defs', {}, svg));
  const st1 = sv('stop', { offset:0, 'stop-color':'#8fcdf2' }, grad), st2 = sv('stop', { offset:1, 'stop-color':'#e6f5fd' }, grad);
  sv('rect', { x:0, y:0, width:400, height:300, fill:'url(#' + gid + ')' }, svg);
  const sunG = sv('g', {}, svg); const sunHalo = sv('circle', { cx:310, cy:70, r:30, fill:'#fff3b0', opacity:.45 }, sunG), sun = sv('circle', { cx:310, cy:70, r:20, fill:'#ffd65a' }, sunG);
  const cloudG = sv('g', {}, svg);
  const cloud = (x, y, s, c) => { const cg = sv('g', { opacity:.92 }, cloudG); [[0, 0, 16], [16, -8, 13], [32, 0, 15], [16, 6, 14]].forEach(([dx, dy, r]) => sv('circle', { cx:x + dx * s, cy:y + dy * s, r:r * s, fill:c }, cg)); };
  const hazeG = sv('g', { opacity:0 }, svg); for (let k = 0; k < 4; k++) sv('rect', { x:0, y:80 + k * 26, width:400, height:10, rx:5, fill:'#f5deaa', opacity:.5 }, hazeG);
  const far = sv('path', { d:'M0 190 L60 120 L110 165 L160 105 L215 160 L260 125 L320 170 L360 140 L400 175 V300 H0z', fill:'#b7c3cc' }, svg);
  const caps = sv('path', { d:'M48 134 L60 120 L72 134z M148 118 L160 105 L173 120z M250 136 L260 125 L271 137z M350 150 L360 140 L371 152z', fill:'#fff', opacity:0 }, svg);
  const hills = sv('path', { d:'M0 215 C60 190 110 195 170 205 C230 215 280 185 340 200 C370 208 390 212 400 214 V300 H0z', fill:'#8fbf66' }, svg);
  const lake = sv('ellipse', { cx:120, cy:258, rx:70, ry:16, fill:'#7fb4d6', opacity:.9 }, svg);
  const fore = sv('path', { d:'M0 262 C80 246 160 250 220 262 C300 276 360 262 400 268 V300 H0z', fill:'#6fa84a' }, svg);
  const cracks = sv('g', { stroke:'#8a6a3e', 'stroke-width':1.8, fill:'none', opacity:0 }, svg); ['M250 282l14 6-5 9', 'M320 274l-10 7 7 10', 'M60 286l12-4 6 8'].forEach(d => sv('path', { d }, cracks));
  const saltG = sv('g', { opacity:0 }, svg); for (let k = 0; k < 40; k++) sv('rect', { x:(k * 37) % 400, y:238 + (k * 53) % 55, width:3, height:3, fill:'#fff' }, saltG);
  const snowG = sv('path', { d:'M0 215 C60 190 110 195 170 205 C230 215 280 185 340 200 C370 208 390 212 400 214 V222 C330 214 280 228 200 218 C130 210 70 220 0 223z', fill:'#fff', opacity:0 }, svg);
  const W_ = sv('g', { class:'weather' }, svg); const flakes = [], drops = [];
  for (let k = 0; k < 34; k++) { const c = sv('circle', { class:'fall', cx:(k * 97) % 400, cy:(k * 61) % 200, r:2.2, fill:'#fff', opacity:0 }, W_); c.style.animationDelay = (-(k % 7) * .23) + 's'; flakes.push(c); }
  for (let k = 0; k < 36; k++) { const l = sv('line', { x1:(k * 89) % 400, y1:20 + (k * 47) % 180, x2:(k * 89) % 400 - 4, y2:30 + (k * 47) % 180, stroke:'#6f93b3', 'stroke-width':1.6, 'stroke-linecap':'round', opacity:0 }, W_); l.style.animationDelay = (-(k % 8) * .2) + 's'; drops.push(l); }
  const read = document.createElement('div'); read.className = 'spec-cap'; read.innerHTML = '<b class="sc-n"></b><small class="sc-w"></small>'; box.appendChild(read);
  return { el:box, cap:read, update(rid, sky, pv){
    const r = BM.region(rid), dt = sky.dt, dm = sky.dm; let skyT = r.env.sky;
    let [top, bot] = SKYC[skyT];
    if (dt > 0) { top = mixc(top, '#ffb35c', .35); bot = mixc(bot, '#ffe7b8', .4); } if (dt < 0) { top = mixc(top, '#9fbfff', .35); bot = mixc(bot, '#eef4ff', .3); }
    if (dm > 0) top = mixc(top, '#8396a8', .35); if (dm < 0) { top = mixc(top, '#efd294', .35); bot = mixc(bot, '#fbefd0', .3); }
    st1.setAttribute('stop-color', top); st2.setAttribute('stop-color', bot);
    const rainy = skyT === 'rain' || dm > 0; sunG.setAttribute('opacity', rainy && dm >= 0 ? 0 : 1); sun.setAttribute('r', 20 + (dt > 0 ? 8 : 0) - (dt < 0 ? 5 : 0)); sunHalo.setAttribute('r', 30 + (dt > 0 ? 10 : 0)); sun.setAttribute('fill', skyT === 'ember' || dt > 0 ? '#ffb347' : '#ffd65a');
    cloudG.textContent = ''; if (rainy) { cloud(60, 70, 1.1, '#e9eef2'); cloud(220, 56, 1, '#dfe6ec'); cloud(330, 95, .8, '#e3e9ee'); } else if (skyT !== 'haze' && skyT !== 'ember') { cloud(70, 80, .8, '#ffffff'); cloud(230, 60, .6, '#ffffff'); }
    hazeG.setAttribute('opacity', skyT === 'haze' || dm < 0 ? 1 : 0);
    const g = GROUND[r.terrain] || GROUND.meadow; let g1 = g[0], g2 = g[1];
    if (dm > 0) { g1 = mixc(g1, '#4d9a3c', .35); g2 = mixc(g2, '#3a7e33', .35); } if (dm < 0) { g1 = mixc(g1, '#d9b56e', .45); g2 = mixc(g2, '#b89350', .45); }
    if (dt > 0) { g1 = mixc(g1, '#d8c070', .15); } if (dt < 0) { g1 = mixc(g1, '#dfe8ee', .3); g2 = mixc(g2, '#c8d4dc', .3); }
    hills.setAttribute('fill', g1); fore.setAttribute('fill', g2); far.setAttribute('fill', dt < 0 || r.terrain === 'frost' ? '#d6e0e8' : r.terrain === 'ember' ? '#9b6a5a' : '#b7c3cc');
    caps.setAttribute('opacity', dt < 0 || r.terrain === 'frost' || r.terrain === 'highland' ? 1 : 0); snowG.setAttribute('opacity', dt < 0 || r.terrain === 'frost' ? .9 : 0);
    const wet = (r.env.soil === 'wet' || dm > 0) && dm >= 0; lake.setAttribute('opacity', wet ? .95 : r.env.soil === 'dry' || dm < 0 ? 0 : .7); lake.setAttribute('rx', wet ? 90 : 70);
    cracks.setAttribute('opacity', (r.env.soil === 'dry' && dm <= 0) || dm < 0 ? 1 : 0); saltG.setAttribute('opacity', r.env.soil === 'salty' ? 1 : 0);
    const snowing = skyT === 'snow' || dt < 0, raining = rainy; flakes.forEach(c => c.setAttribute('opacity', snowing ? 1 : 0)); drops.forEach(l => l.setAttribute('opacity', raining ? 1 : 0));
    box.classList.toggle('pv', !!pv);
  } };
}

/* ───────────────────────── fake spread routes (arcs on the mini-map) ───────────────────────── */
const NEIGH = { sunny:['fern', 'cloud', 'frost', 'dust', 'mossy'], fern:['marsh', 'cloud'], marsh:['mossy'], cloud:['frost'], dust:['ember', 'salt'], mossy:['salt', 'dust'] };
function arcsFor(id){
  const living = r => S.reg[r].colony === 'living'; const out = [];
  if (id === 'seedOut') Object.keys(NEIGH).forEach(a => { if (living(a)) NEIGH[a].forEach(b => { if (!living(b) || S.reg[b].est < .3) out.push([a, b]); }); });
  else if (id === 'earlyMat') Object.keys(NEIGH).forEach(a => { if (living(a) && S.reg[a].est < .5) NEIGH[a].forEach(b => out.push([a, b])); });
  else if (id === 'waterSeeds') ['mossy', 'sunny', 'salt'].forEach(a => { if (living(a)) out.push([a, 'tide']); });
  else if (id === 'f-wind') out.push(['sunny', 'ember'], ['fern', 'frost'], ['mossy', 'salt']);
  else if (id === 'f-runner') out.push(['sunny', 'dust'], ['marsh', 'mossy']);
  else if (id === 'f-drift') out.push(['sunny', 'tide'], ['mossy', 'tide']);
  else if (id === 'f-burr') out.push(['sunny', 'salt'], ['fern', 'dust']);
  return out.slice(0, 8);
}

/* ───────────────────────── page shell ───────────────────────── */
BM.ribbon('Concept 17 · Final Interaction & Connector Refinement');
const rib = document.querySelector('.mock-ribbon');
rib.querySelector('a').href = 'index.html#c17';
const vsw = document.createElement('div');
vsw.className = 'vswitch'; vsw.setAttribute('role', 'group'); vsw.setAttribute('aria-label', 'Design review only, not game UI: Plant link');
vsw.innerHTML = '<span class="vl" aria-hidden="true">Review only · Plant link</span>' +
  LINKS.map(([k, n, t]) => '<button type="button" data-link="' + k + '" aria-pressed="false" title="Plant link ' + n + ': ' + t + ' (design review only; changes only how the plant and the tree are joined)"><b>' + n + '</b><span>' + t + '</span></button>').join('');
rib.insertBefore(vsw, rib.querySelector('.spacer').nextSibling);
function setLink(k){
  if (!LINK_IDS.includes(k)) return; link = k;
  try { localStorage.setItem('bloomC17Link', k); } catch (e) {}
  roomsEl.dataset.link = k; document.body.dataset.link = k;
  vsw.querySelectorAll('[data-link]').forEach(b => b.setAttribute('aria-pressed', b.dataset.link === k));
  /* the switch changes only the drawing of the plant → tree link: the active room, its context, the hover state, the Map
     View and the pause state are untouched. The trees re-lay out (the rail moves in Docked) and the leaders redraw. */
  ['adapt', 'spread'].forEach(id => rooms[id] && rooms[id].redraw && rooms[id].redraw());
}
vsw.addEventListener('click', e => { const b = e.target.closest('[data-link]'); if (b) setLink(b.dataset.link); });
const app = document.getElementById('app');
app.innerHTML =
  '<header class="hud" id="hud">' +
    '<div class="hud-l"><b>Eden</b><small>Fake planet · Dying World scenario</small></div>' +
    '<div class="hud-c">' +
      '<div class="hud-s" role="group" aria-label="Run status">' +
        '<div class="hs-state"><span class="dot" aria-hidden="true"></span><div><b>IN BLOOM</b><small id="hsCov"></small></div></div>' +
        '<div class="hs-bio biomass" id="bio"><span class="ico" aria-hidden="true"></span><div><span class="num">0</span><span class="rate"></span></div></div>' +
        '<div class="hs-meter"><small>Native pressure</small><div class="bar"><i id="hsPress"></i></div></div>' +
        '<div class="hs-meter"><small>Instability</small><div class="bar sky"><i id="hsInst"></i></div></div>' +
      '</div>' +
      '<nav class="hud-tools" id="tools" aria-label="Tools"></nav>' +
    '</div>' +
    '<div class="hud-clock" id="clock" role="group" aria-label="Pause and speed">' +
      '<button type="button" class="ck" id="ckPause" aria-pressed="false" aria-label="Pause">' + ico('pause') + '</button>' +
      '<button type="button" class="ck sp" id="ckSpeed" aria-label="Speed, 1 times. Press to cycle 1, 2, 4">1×</button>' +
    '</div>' +
  '</header>' +
  '<main class="planet" id="planet">' +
    '<div class="mapzone" id="mapzone"><div class="mapwrap" id="mapwrap"></div>' +
      '<aside class="banner" id="banner" hidden aria-label="Selected region"></aside></div>' +
  '</main>' +
  '<div class="lenspop" id="lenspop" hidden role="group" aria-label="Map View"></div>' +
  '<div class="rooms" id="rooms" hidden></div>' +
  '<div class="sr-only" id="live" role="status" aria-live="polite"></div>';
document.getElementById('tools').innerHTML =
  '<div class="tg"><small>Explore</small><div class="tt">' +
    '<button type="button" class="tool" data-tool="region" aria-pressed="false">' + ico('regions') + '<span class="tn">Regions</span></button>' +
    '<button type="button" class="tool" data-tool="mapview" aria-pressed="false" aria-expanded="false" aria-haspopup="true" aria-controls="lenspop">' + ico('mapview') + '<span class="tn">Map View</span></button>' +
  '</div></div>' +
  '<div class="tg"><small>Change</small><div class="tt">' +
    '<button type="button" class="tool plant" data-tool="adapt" aria-pressed="false">' + ico('adapt') + '<span class="tn">Adapt</span></button>' +
    '<button type="button" class="tool spread" data-tool="spread" aria-pressed="false">' + ico('spread') + '<span class="tn">Spread</span></button>' +
    '<button type="button" class="tool planet" data-tool="terraform" aria-pressed="false">' + ico('terraform') + '<span class="tn">Terraform</span></button>' +
  '</div></div>';
document.querySelectorAll('#tools .tool').forEach(b => b.dataset.tip = b.querySelector('.tn').textContent);
BM.bindBiomass(document.getElementById('bio'));
BM.store.on(() => {
  document.getElementById('hsCov').textContent = S.coverage + ' % of land · goal ' + S.goal + ' %';
  document.getElementById('hsPress').style.width = Math.round(S.pressure * 100) + '%';
  document.getElementById('hsInst').style.width = Math.round(S.instab * 100) + '%';
});
const live = m => { document.getElementById('live').textContent = m; };

/* clock (Pause / speed never touch the region selection or the banner) */
const ckP = document.getElementById('ckPause'), ckS = document.getElementById('ckSpeed');
ckP.addEventListener('click', () => BM.clock.toggle());
ckS.addEventListener('click', () => BM.clock.cycleSpeed());
function paintClock(){
  const p = BM.clock.paused;
  ckP.setAttribute('aria-pressed', p); ckP.setAttribute('aria-label', p ? 'Resume' : 'Pause'); ckP.innerHTML = ico(p ? 'play' : 'pause');
  ckS.textContent = BM.clock.speed + '×'; ckS.setAttribute('aria-label', 'Speed, ' + BM.clock.speed + ' times. Press to cycle 1, 2, 4');
  document.body.classList.toggle('is-paused', p);
  document.querySelectorAll('.room .paused').forEach(e => e.classList.toggle('on', p));
}
BM.store.on(e => { if (e.type === 'clock' || e.type === 'init') paintClock(); });

/* ───────────────────────── state: home selection (sel) is separate from the room context (ctx) ───────────────────────── */
const state = { sel:null, ctx:null, lens:null, lensPv:null, room:null, wasPaused:false, opener:null };
const miniMaps = [];

/* main map: mounted once; fitMap widens its viewBox with more ocean so the world fills the frame with no dead side columns */
const mainMap = BM.mountMap(document.getElementById('mapwrap'), { labels:'all', bubbles:true, onSelect:id => selectHome(id), onHover:null });
window.map = mainMap;                                   // QA hook, as in earlier concepts
const BASE_VB = { x:-6, y:-6, w:BM.MAP.W * BM.MAP.T + 12, h:BM.MAP.H * BM.MAP.T + 12 };
function fitMap(map, host){
  const svg = map.el, r = host.getBoundingClientRect(); if (!r.width || !r.height) return;
  const ar = r.width / r.height, base = BASE_VB.w / BASE_VB.h;
  let w = BASE_VB.w, h = BASE_VB.h; if (ar > base) w = h * ar; else h = w / ar;
  const R = v => Math.round(v * 100) / 100;
  w = R(w); h = R(h); const x = R(BASE_VB.x - (w - BASE_VB.w) / 2), y = R(BASE_VB.y - (h - BASE_VB.h) / 2);
  svg.setAttribute('viewBox', [x, y, w, h].join(' '));
  svg.querySelectorAll(':scope > rect').forEach(rc => { rc.setAttribute('x', x); rc.setAttribute('y', y); rc.setAttribute('width', w); rc.setAttribute('height', h); rc.setAttribute('rx', 0); });
  svg.dataset.fit = w.toFixed(0) + 'x' + h.toFixed(0);
}
fitMap(mainMap, document.getElementById('mapwrap'));
new ResizeObserver(() => fitMap(mainMap, document.getElementById('mapwrap'))).observe(document.getElementById('mapwrap'));

/* ───────────────────────── Map View layers: hover / focus = preview, click = commit (Planet View and every room mini-map) ───────────────────────── */
const LENSES = [['', 'Plants / Normal', 'off', 'Plants'], ['temp', 'Temperature', 'temp'], ['water', 'Water', 'water'], ['soil', 'Soil', 'soil'], ['hazard', 'Hazard', 'hazard']];
const lensHTML = (cls, short) => LENSES.map(([id, name, ic, sh]) => '<button type="button" class="lb ' + cls + '" data-lens="' + id + '" aria-pressed="' + (state.lens === (id || null)) + '">' + ico(ic) + '<span>' + esc(short && sh ? sh : name) + '</span></button>').join('');
/* BLOOM-025: Map View is a compact popover under the Map View button: the five view choices and nothing else */
const lenspop = document.getElementById('lenspop');
lenspop.innerHTML = '<span class="lk">Map View</span>' + lensHTML('pop');
const mapviewBtn = document.querySelector('[data-tool="mapview"]');
function placeLensPop(){
  const b = mapviewBtn.getBoundingClientRect(), a = app.getBoundingClientRect();
  lenspop.style.top = (b.bottom - a.top + 8) + 'px';
  const w = lenspop.offsetWidth || 200; lenspop.style.left = Math.max(8, Math.min(b.left - a.left, a.width - w - 8)) + 'px';
}
function openLensPop(open, focusBack){
  const was = !lenspop.hidden; if (open === was) return;
  lenspop.hidden = !open; mapviewBtn.setAttribute('aria-expanded', open);
  if (open) { placeLensPop(); (lenspop.querySelector('[aria-pressed="true"]') || lenspop.querySelector('[data-lens]')).focus(); }
  else { if (state.lensPv !== null) previewLens(undefined); if (focusBack) mapviewBtn.focus(); }
}
document.addEventListener('click', e => { if (lenspop.hidden) return; if (e.target.closest('#lenspop') || e.target.closest('[data-tool="mapview"]')) return; openLensPop(false); });   // outside click closes
window.addEventListener('resize', () => { if (!lenspop.hidden) placeLensPop(); });
const allMaps = () => [mainMap].concat(miniMaps);
function paintLens(){
  const shown = state.lensPv !== null ? (state.lensPv || null) : state.lens;
  allMaps().forEach(m => { if (m.lens !== shown) m.setLens(shown); });
  document.querySelectorAll('[data-lens]').forEach(b => { b.setAttribute('aria-pressed', (b.dataset.lens || null) === state.lens); b.classList.toggle('pv', state.lensPv !== null && (b.dataset.lens || '') === state.lensPv && state.lensPv !== (state.lens || '')); });
  document.querySelectorAll('[data-tool="mapview"]').forEach(b => b.setAttribute('aria-pressed', !!state.lens));
}
function setLens(f){ state.lens = f || null; state.lensPv = null; paintLens(); live(state.lens ? 'Map View: ' + BM.COND_META[state.lens].name : 'Map View off'); }
function previewLens(f){ state.lensPv = f === undefined ? null : (f || ''); paintLens(); }   // '' previews "no layer" (the Off chip)
document.addEventListener('click', e => { const b = e.target.closest('[data-lens]'); if (b) setLens(b.dataset.lens); });
document.addEventListener('pointerover', e => { const b = e.target.closest('[data-lens]'); if (b) previewLens(b.dataset.lens); });
document.addEventListener('pointerout', e => { const b = e.target.closest('[data-lens]'); if (b && !(e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('[data-lens]') === b)) previewLens(undefined); });
document.addEventListener('focusin', e => { const b = e.target.closest('[data-lens]'); if (b) previewLens(b.dataset.lens); });
document.addEventListener('focusout', e => { const b = e.target.closest('[data-lens]'); if (b) previewLens(undefined); });
/* hover reset safety net: the pointer leaving the window, or the window losing focus, ends any layer preview */
document.addEventListener('pointerout', e => { if (!e.relatedTarget && state.lensPv !== null) previewLens(undefined); });
window.addEventListener('blur', () => { if (state.lensPv !== null) previewLens(undefined); });

/* ───────────────────────── scale calibration: "three pills across" ─────────────────────────
   The room's em is not a fixed clamp any more. A hidden probe room at two known font sizes measures (a) the inner width of the
   right-hand column's region strip and (b) the width of one region chip of ordinary (median) name length, both in em terms.
   The em is then the largest value at which THREE such chips plus two gaps fit across that strip. It is capped by the window
   height (DESIGN_H em of room height) and by EM_MAX, and floored by EM_MIN. Because every room measurement is in em and the
   side columns are percentages, the whole room shrinks proportionally when the window is too crowded for the calibrated size. */
const DESIGN_H = 40, EM_MIN = 12, EM_MAX = 22, PILLS = 3;
const probe = document.createElement('section'); probe.className = 'room probe'; probe.setAttribute('aria-hidden', 'true');
const medianName = (() => { const ns = BM.REGIONS.map(r => r.name).sort((a, b) => a.length - b.length); return ns[Math.floor(ns.length / 2)]; })();
probe.innerHTML = '<header class="rh"></header><div class="rz z-focus"></div><div class="rz z-main"></div><div class="rz z-map"><div class="mm"><div class="mm-strip"><span class="rc st-ok living"><i class="sd"></i>' + esc(medianName) + '</span></div></div></div>';
app.appendChild(probe);
function calibrateScale(){
  const W = app.clientWidth, H = app.clientHeight; if (!W || !H) return state.em;
  const strip = probe.querySelector('.mm-strip'), chip = probe.querySelector('.rc');
  const at = px => { probe.style.fontSize = px + 'px'; const s = strip.getBoundingClientRect().width, c = chip.getBoundingClientRect().width, g = parseFloat(getComputedStyle(strip).columnGap || getComputedStyle(strip).gap) || 0; return { s, c, g }; };
  const m10 = at(10), m20 = at(20);
  const chrome = (m10.s - m20.s) / 10;                   // em of column chrome (room padding, grid gap, box padding and borders)
  const pctW = m10.s + 10 * chrome;                      // the column's share of the room width, in px
  const chipEm = m20.c / 20, gapEm = m20.g / 20;
  const byPills = pctW / (PILLS * chipEm + (PILLS - 1) * gapEm + chrome);
  const byHeight = H / DESIGN_H;
  const em = Math.round(Math.max(EM_MIN, Math.min(EM_MAX, byPills, byHeight)) * 10) / 10;
  state.em = em; state.emBy = byPills <= byHeight ? 'pills' : 'height'; state.emPills = Math.round(byPills * 10) / 10; state.emHeight = Math.round(byHeight * 10) / 10;
  roomsEl.style.setProperty('--room-em', em + 'px');
  return em;
}
new ResizeObserver(() => calibrateScale()).observe(app);

/* tools */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-tool]'); if (!b) return;
  const t = b.dataset.tool;
  if (t === 'mapview') { openLensPop(lenspop.hidden, !lenspop.hidden); return; }   // tool toggle
  openLensPop(false); openRoom(t, b);
});

/* ───────────────────────── home selection + bottom region banner ─────────────────────────
   Banner only while a region is selected. X closes + deselects. A click on empty map (ocean) closes + deselects.
   Pause / speed do not touch it. */
const banner = document.getElementById('banner');
function paintBanner(){
  if (!state.sel) { banner.hidden = true; return; }
  const v = BM.view(state.sel), r = v.r;
  const help = v.fixers.slice(0, 2).map(it => '<button type="button" class="btn small ' + (it.board === 'terraform' ? 'planet' : it.board === 'spread' ? 'spread' : 'plant') + '" data-go="' + it.board + ':' + it.id + '">' + ico(ITEM_ICO[it.id]) + esc(it.name) + '</button>').join('');
  const conds = ['temp', 'water', 'soil', 'hazard'].map(f => { const cd = v.cond[f]; return '<span class="bc st-' + cd[0] + '">' + ico(f) + '<span>' + esc(BM.COND_META[f].name) + ' · ' + esc(cd[1]) + '</span></span>'; }).join('');
  banner.innerHTML = '<button type="button" class="bx" data-act="deselect" aria-label="Close and deselect ' + esc(r.name) + '">' + ico('close') + '</button>' +
    '<div class="bn-h"><div class="bn-t">' + ico('inspect') + '<b>' + esc(r.name) + '</b>' + chip(v.st) + (r.origin ? '<span class="rg-o">Origin</span>' : '') + '</div>' +
      '<p>' + esc(v.estWord) + ' · ' + (v.limit ? esc(v.limit.text) : 'Nothing holding the plant back') + '</p></div>' +
    '<div class="bn-c">' + conds + '</div>' +
    '<div class="bn-a"><button type="button" class="btn small" data-tool="region">' + ico('regions') + 'Inspect region</button>' + help + '</div>';
  banner.hidden = false;
}
function selectHome(id){
  state.sel = id || null;
  if (mainMap.selected !== state.sel) mainMap.select(state.sel);
  paintBanner();
  if (!state.sel) live('No region selected'); else live(BM.region(state.sel).name + ' selected');
}
banner.addEventListener('click', e => { if (e.target.closest('[data-act="deselect"]')) { selectHome(null); mainMap.focusRegion && document.getElementById('mapwrap').querySelector('.rg') && mainMap.el.focus && 0; } });
/* a click on ocean / empty map (not a region, not a Biomass bubble, not the lens bar or the banner) deselects */
document.getElementById('mapzone').addEventListener('click', e => {
  if (e.target.closest('.rg, [role="button"], .lenspop, .banner, button')) return;
  if (state.sel) selectHome(null);
});
document.addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (!b) return; const [board, id] = b.dataset.go.split(':'); openRoom(board, b, id); });

/* room context: changed by room mini-maps; never written back to the home selection */
function setCtx(id, from){
  state.ctx = id;
  miniMaps.forEach(m => { if (m.selected !== id) m.select(id); });
  ROOM_IDS.forEach(k => rooms[k] && rooms[k].onCtx && rooms[k].onCtx());
  if (from === 'mini' && state.room) live('Considering ' + BM.region(id).name);
}

/* ───────────────────────── rooms ───────────────────────── */
const roomsEl = document.getElementById('rooms');
const rooms = {};
function roomShell(id){
  const R = ROOMS[id];
  const sec = document.createElement('section'); sec.className = 'room r-' + id; sec.dataset.room = id; sec.hidden = true;
  sec.setAttribute('aria-labelledby', 'rt-' + id);
  sec.innerHTML =
    '<header class="rh">' +
      '<button type="button" class="rb back" data-act="back">' + ico('back') + '<span>Planet</span></button>' +
      '<div class="rt"><span class="rk">' + esc(R.kicker) + '</span><h2 id="rt-' + id + '" tabindex="-1">' + esc(R.title) + '</h2><small>' + esc(R.verb) + '</small></div>' +
      '<nav class="rnav" aria-label="Rooms">' + ROOM_IDS.map(k => '<button type="button" class="rn ' + ROOMS[k].kind + '" data-room-go="' + k + '" aria-pressed="' + (k === id) + '">' + ico(ROOMS[k].ico) + '<span>' + esc(ROOMS[k].title) + '</span></button>').join('') + '</nav>' +
      '<div class="paused" role="status"><span class="pi">' + ico('pause') + '</span><b>PAUSED</b></div>' +
      '<button type="button" class="rb resume" data-act="resume">' + ico('play') + '<span>Resume</span></button>' +
    '</header>' +
    '<div class="rz z-focus"></div><div class="rz z-main"></div><div class="rz z-map"></div>';
  roomsEl.appendChild(sec);
  return sec;
}
/* mini-map + region context block (right column of every room) */
function mapBlock(id, host, ctxHTML){
  host.innerHTML =
    '<div class="mm">' +
      '<div class="mm-h"><span class="mm-k">' + (id === 'region' ? 'Looking at' : 'Considering for') + '</span><b class="mm-name"></b><span class="mm-st"></span></div>' +
      '<div class="mm-map" aria-label="Smaller planet map"></div>' +
      '<p class="mm-peek">Hover a region to peek · click to switch</p>' +
      '<div class="mm-lens" role="group" aria-label="Map View layer (hover previews, click sets)">' + lensHTML('mini', true) + '</div>' +
      '<div class="mm-strip" role="group" aria-label="Switch region"></div>' +
    '</div>' +
    (ctxHTML || '');                                      /* the context block is its own floating box under the mini-map box */
  const peek = host.querySelector('.mm-peek');
  const peekText = rid => { if (!rid) { peek.textContent = 'Hover a region to peek · click to switch'; peek.classList.remove('on'); return; } const v = BM.view(rid); peek.innerHTML = '<b>' + esc(v.r.name) + '</b> · ' + esc(v.estWord) + ' · ' + esc(v.limit ? BM.ST_WORD[v.st] + ': ' + v.limit.text : 'Nothing holding the plant back'); peek.classList.add('on'); };
  const mini = BM.mountMap(host.querySelector('.mm-map'), { labels:'hover', bubbles:false, calm:true, onSelect:rid => setCtx(rid, 'mini'), onHover:peekText });
  miniMaps.push(mini);
  const strip = host.querySelector('.mm-strip');
  strip.innerHTML = BM.REGIONS.map(r => '<button type="button" class="rc" data-r="' + r.id + '" aria-pressed="false"><i class="sd"></i>' + esc(r.name) + '</button>').join('');
  strip.addEventListener('click', e => { const b = e.target.closest('[data-r]'); if (b) setCtx(b.dataset.r, 'mini'); });
  /* BLOOM-025 region pill hover: outline the same region on the mini-map and peek its status while the pointer / focus is on
     the pill; leaving restores the selected context (the selection outline never moved). Only a click selects. */
  let pk = null;
  const pillPeek = rid => { if (pk === rid) return; pk = rid; mini.highlight(rid); peekText(rid); strip.querySelectorAll('.rc.pk').forEach(b => b.classList.remove('pk')); if (rid) { const b = strip.querySelector('[data-r="' + rid + '"]'); b && b.classList.add('pk'); } };
  strip.addEventListener('pointerover', e => { const b = e.target.closest('[data-r]'); pillPeek(b ? b.dataset.r : null); });
  strip.addEventListener('pointerout', e => { const b = e.target.closest('[data-r]'); if (!b) return; const to = e.relatedTarget; if (!to || !(to.closest && to.closest('[data-r]') === b)) pillPeek(null); });
  strip.addEventListener('pointerleave', () => pillPeek(null)); strip.addEventListener('pointercancel', () => pillPeek(null));
  strip.addEventListener('focusin', e => { const b = e.target.closest('[data-r]'); if (b) pillPeek(b.dataset.r); });
  strip.addEventListener('focusout', e => { if (!strip.contains(e.relatedTarget)) pillPeek(null); });
  window.addEventListener('blur', () => pillPeek(null)); document.addEventListener('visibilitychange', () => { if (document.hidden) pillPeek(null); });
  document.addEventListener('pointerout', e => { if (!e.relatedTarget) pillPeek(null); });
  const paintStrip = () => { strip.querySelectorAll('[data-r]').forEach(b => { const v = BM.view(b.dataset.r); b.className = 'rc st-' + v.st + (S.reg[b.dataset.r].colony === 'living' ? ' living' : ''); b.setAttribute('aria-pressed', b.dataset.r === state.ctx); }); };
  BM.store.on(e => { if (e.type !== 'gain' && e.type !== 'tick') paintStrip(); });
  const name = host.querySelector('.mm-name'), st = host.querySelector('.mm-st'), ctx = host.querySelector('.mm-ctx');
  return { mini, ctx, paint(){ if (!state.ctx) return; const v = BM.view(state.ctx); name.textContent = v.r.name; st.innerHTML = chip(v.st); paintStrip(); }, setText(){}, get peek(){ return pk; }, pillPeek };
}
const regionCtxHTML = '<div class="mm-ctx"><span class="mc-k">Region effect of this choice</span><div class="mc-row"><b class="mc-open">Hover a skill to see which regions it would open</b></div></div>';
function paintRegionCtx(mm, pv, isItem, n){
  const names = a => a.map(r => BM.region(r).name).join(', ');
  const open = mm.ctx.querySelector('.mc-open');
  if (!n) { open.innerHTML = 'Hover a skill to see which regions it would open'; mm.ctx.classList.remove('pv'); return; }
  let t = '';
  if (isItem) { t = (pv.open.length ? ico('check') + '<b>Opens ' + esc(names(pv.open)) + '</b>' : '') + (pv.worse.length ? (t ? '<br>' : '') + ico('alert') + '<b>Harder: ' + esc(names(pv.worse)) + '</b>' : ''); if (!t) t = 'No region changes right away.'; }
  else t = '<em>Later-tier placeholder</em>: region effects not scripted.';
  open.innerHTML = t; mm.ctx.classList.add('pv');
}
/* specimen / scene block (upper-left) */
function specBlock(host, caption, cls){
  const wrap = document.createElement('div'); wrap.className = 'lf-top ' + (cls || ''); host.appendChild(wrap);
  const spec = BM.mountSpecimen(wrap, {});
  const c = document.createElement('div'); c.className = 'spec-cap'; c.innerHTML = caption; wrap.appendChild(c);
  return { wrap, spec, cap:c };
}
const skyTemp = sky => (14 + sky.dt) + ' °C';
const rainWord = dm => dm > 0 ? 'Wetter than normal' : dm < 0 ? 'Drier than normal' : 'Normal rain';
const chanWord = { temp:'stem and stature', water:'leaf shape', soil:'roots', hazard:'leaf surface and pigment', spread:'flowers and seeds', env:'sky and ground' };

/* ── Region Inspect: bigger tabbed layout (owner-approved lineage), plant upper-left, colony info lower-left ── */
function buildRegion(){
  const id = 'region', sec = roomShell(id);
  const zf = sec.querySelector('.z-focus'), zm = sec.querySelector('.z-main'), zmap = sec.querySelector('.z-map');
  const sp = specBlock(zf, '<b class="sc-n"></b><small class="sc-w"></small>');
  const info = document.createElement('div'); info.className = 'lf-info'; zf.appendChild(info);
  const mm = mapBlock(id, zmap);
  const tabs = ['overview', 'colony', 'science'], TAB = { overview:['Overview', 'overview'], colony:['Colony', 'colony'], science:['Science', 'science'] };
  zm.innerHTML = '<div class="rg-head"><h3 class="rg-name"></h3><div class="rg-sub"></div></div>' +
    '<div class="tabs" role="tablist" aria-label="Region details">' + tabs.map((t, k) => '<button type="button" role="tab" id="tab-' + t + '" aria-controls="pane-' + t + '" aria-selected="' + (k === 0) + '" tabindex="' + (k ? -1 : 0) + '">' + ico(TAB[t][1]) + TAB[t][0] + '</button>').join('') + '</div>' +
    tabs.map((t, k) => '<section class="pane" id="pane-' + t + '" role="tabpanel" aria-labelledby="tab-' + t + '"' + (k ? ' hidden' : '') + '><div class="pb"></div></section>').join('');
  const tb = [...zm.querySelectorAll('[role="tab"]')];
  const showTab = t => { tb.forEach(b => { const on = b.id === 'tab-' + t; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; }); tabs.forEach(x => zm.querySelector('#pane-' + x).hidden = x !== t); };
  tb.forEach((b, k) => { b.addEventListener('click', () => showTab(b.id.slice(4))); b.addEventListener('keydown', e => { const d = { ArrowRight:1, ArrowLeft:-1 }[e.key]; if (d) { e.preventDefault(); const n = tb[(k + d + tb.length) % tb.length]; showTab(n.id.slice(4)); n.focus(); } }); });
  function paint(){
    if (!state.ctx) return;
    const v = BM.view(state.ctx), r = v.r, rs = S.reg[r.id];
    sp.spec.highlight(null); sp.spec.render(BM.specState(r.id), false);
    sp.cap.querySelector('.sc-n').textContent = 'Your plant in ' + r.name; sp.cap.querySelector('.sc-w').textContent = rs.colony === 'living' ? v.estWord + (v.st !== 'ok' ? ' · stressed' : ' · thriving') : 'No colony yet' + (v.st === 'bad' ? ' · would not survive' : '');
    const items = BM.ITEMS.filter(it => it.board !== 'terraform' && S.owned[it.id]);
    info.innerHTML = '<span class="li-k">This colony</span><div class="li-h"><span class="ni">' + ico(rs.colony === 'living' ? 'colony' : 'off') + '</span><div><b>' + esc(v.estWord) + '</b><small>' + (rs.colony === 'living' ? Math.round(rs.est * 100) + ' % established · focus ' + esc(BM.FOCUS.find(f => f.id === rs.focus).name) : (v.st === 'bad' ? 'Would not survive here yet' : 'No colony yet')) + '</small></div></div>' +
      (v.limit ? '<div class="li-row">' + ico(v.limit.f === 'reach' ? 'reach' : v.limit.f) + '<span><b>Holding it back:</b> ' + esc(v.limit.text) + '</span></div>' : '<div class="li-row">' + ico('check') + '<span><b>Nothing holding the plant back.</b></span></div>') +
      '<div class="owned"><small>Your plant everywhere</small>' + (items.length ? items.map(it => '<span class="ow">' + ico(ITEM_ICO[it.id]) + esc(it.name) + '</span>').join('') : '<span class="ow none">No adaptations yet</span>') + '</div>';
    zm.querySelector('.rg-name').textContent = r.name;
    zm.querySelector('.rg-sub').innerHTML = chip(v.st) + '<span class="rg-w">' + esc(v.estWord) + '</span>' + (r.origin ? '<span class="rg-o">Origin</span>' : '');
    const conds = ['temp', 'water', 'soil', 'hazard'].map(f => { const cd = v.cond[f]; return '<div class="cond st-' + cd[0] + '">' + ico(f) + '<span class="cn">' + BM.COND_META[f].name + '</span>' + chip(cd[0]) + '<span class="ct">' + esc(cd[1]) + '</span></div>'; }).join('');
    /* BLOOM-025: "Would help" actions are real buttons of intrinsic width; two columns when there are two or more, one when one */
    const help = v.fixers.length ? '<div class="help n' + Math.min(v.fixers.length, 2) + '"><small>Would help</small><div class="help-b">' + v.fixers.map(it => '<button type="button" class="btn small hb ' + (it.board === 'terraform' ? 'planet' : it.board === 'spread' ? 'spread' : 'plant') + '" data-go="' + it.board + ':' + it.id + '">' + ico(ITEM_ICO[it.id]) + '<span class="hb-t"><b>' + esc(it.name) + '</b><small>' + (it.board === 'terraform' ? 'Terraform' : it.board === 'spread' ? 'Spread' : 'Adapt') + '</small></span></button>').join('') + '</div></div>' : '';
    zm.querySelector('#pane-overview .pb').innerHTML = conds + (v.limit ? '<div class="limit st-' + v.st + '">' + ico(v.limit.f === 'reach' ? 'reach' : v.limit.f) + '<div><small>Holding the plant back</small><b>' + esc(v.limit.text) + '</b></div></div>' : '<div class="limit st-ok">' + ico('check') + '<div><small>Limiting factor</small><b>None: this region suits your plant.</b></div></div>') + help;
    const est = rs.colony === 'living' ? rs.est : 0;
    zm.querySelector('#pane-colony .pb').innerHTML =
      '<div class="est"><div class="est-h"><b>' + esc(v.estWord) + '</b><small>' + Math.round(est * 100) + ' % established</small></div><div class="bar leaf"><i style="width:' + Math.round(est * 100) + '%"></i></div></div>' +
      '<small class="lab">Growth focus</small><div class="opts">' + BM.FOCUS.map(f => '<button type="button" class="opt" data-focus="' + f.id + '" aria-pressed="' + (rs.focus === f.id) + '"' + (rs.colony !== 'living' ? ' aria-disabled="true"' : '') + '>' + ico(f.id) + '<span><b>' + f.name + '</b><small>' + esc(f.text) + '</small></span></button>').join('') + '</div>' +
      '<small class="lab">Local upgrade · ' + BM.SPEC_COST + ' Biomass</small><div class="opts">' + BM.SPECS.map(s => '<button type="button" class="opt" data-spec="' + s.id + '" aria-pressed="' + (rs.spec === s.id) + '"' + (rs.colony !== 'living' || (rs.spec && rs.spec !== s.id) ? ' aria-disabled="true"' : '') + '>' + ico(s.id) + '<span><b>' + s.name + '</b><small>' + esc(s.text) + '</small></span></button>').join('') + '</div>';
    zm.querySelector('#pane-science .pb').innerHTML = '<table class="raw"><tbody>' + Object.keys(r.raw).map(k => '<tr><th>' + esc(k) + '</th><td>' + esc(r.raw[k]) + '</td></tr>').join('') + '</tbody></table><p class="note">Eight raw signals sit under the four player-facing categories. Fake numbers.</p>';
    mm.paint();
  }
  zm.addEventListener('click', e => {
    const f = e.target.closest('[data-focus]'); if (f) { if (!BM.store.setFocus(state.ctx, f.dataset.focus)) BM.toast('Grow a colony here first.'); return; }
    const s = e.target.closest('[data-spec]'); if (s) { const res = BM.store.buySpec(state.ctx, s.dataset.spec); if (!res.ok) BM.toast(res.reason); }
  });
  BM.store.on(e => { if (sec.hidden || e.type === 'gain') return; paint(); });
  rooms[id] = { sec, mm, onCtx:paint, onOpen:paint, clear:() => mm.pillPeek(null), focusFirst:() => sec.querySelector('h2').focus() };
}

/* ── leader lines: plant parts (left column) → category rail ports (centre tree), drawn at room level ──
   BLOOM-024: thicker, colour-coded per category, with a bigger anchor ring (outer ring + centre dot), a label PLATE naming the
   plant part next to the anchor, and a strong lit state (wide glow under the line, filled plate) on hover / focus. The lane
   logic is unchanged, so leaders still never cross. */
function leaders(sec, sp, tree){
  const svg = sv('svg', { class:'leaders', 'aria-hidden':'true', focusable:'false' }, sec);
  let on = null;
  function draw(){
    const L = tree.L; if (!L || sec.hidden) return;
    const rr = sec.getBoundingClientRect(); svg.setAttribute('viewBox', '0 0 ' + rr.width + ' ' + rr.height); svg.setAttribute('width', rr.width); svg.setAttribute('height', rr.height);
    svg.textContent = '';
    const specSvg = sp.wrap.querySelector('.bm-spec svg'); const m = specSvg.getScreenCTM(); if (!m) return;
    const tr = tree.el.getBoundingClientRect(); const em = roomEm(sec);
    /* each category gets its own vertical LANE between the plant box and the tree's rail. Upper categories take the lanes nearest
       the tree, lower ones the lanes nearest the plant, so with anchors and ports both ordered top-to-bottom no two leaders cross. */
    const box = sp.wrap.getBoundingClientRect(); const K = tree.T.cats.length;
    const boxR = box.right - rr.left, treeL = tr.left - rr.left;
    /* BLOOM-025 Plant link (review-only switch). The lane logic is the same in Bridge and Docked (upper categories take the
       lanes nearest the tree, lower ones the lanes nearest the plant; anchors and ports are both ordered top → bottom, so
       no two leaders cross). What moves is WHERE the lanes live:
         bridge   in the connector gutter between the two cards, drawn as a translucent bridge; the leader enters the tree
                  card through a socket on its left edge and ends on the rail port
         docked   the cards touch; the lanes live in a bay inside the tree card's left edge, so the travel is very short and
                  the anchors feed straight into the seam
         organic  the cards stay apart (Concept 16 gap); one smooth tendril per category from the plant's edge to the port */
    let laneL, laneR;
    if (link === 'docked') { laneL = treeL + .75 * em; laneR = treeL + L.dims.railX - .85 * em; }
    else { laneL = boxR + .55 * em; laneR = treeL - .55 * em; }
    const laneX = k => K === 1 ? (laneL + laneR) / 2 : laneR - (laneR - laneL) * k / (K - 1);
    const r = Math.min(.7 * em, (laneR - laneL) / Math.max(1, K - 1) * .48);
    const pts = tree.T.cats.map(c => { const part = tree.T.part[c]; const a = L.anchors[c]; if (!part || !a) return null; const pt = specSvg.createSVGPoint(); pt.x = part.at[0]; pt.y = part.at[1]; const sp0 = pt.matrixTransform(m); return { c, part, A:{ x:sp0.x - rr.left, y:sp0.y - rr.top }, B:{ x:treeL + a.x, y:tr.top - rr.top + a.y } }; }).filter(Boolean);
    if (link === 'bridge' && pts.length) {
      /* the bridge: a narrow translucent gutter that spans both cards' link rows; leaders run inside it */
      const ys = pts.map(p => p.A.y).concat(pts.map(p => p.B.y)); const y0 = Math.min.apply(null, ys) - 1.2 * em, y1 = Math.max.apply(null, ys) + 1.2 * em;
      sv('rect', { class:'bridge-bg', x:boxR - 2, y:y0, width:treeL - boxR + 4, height:y1 - y0, rx:.6 * em }, svg);
    }
    pts.forEach(({ c, part, A, B }, k) => {
      const lit = on === c, lx = laneX(k), dy = B.y > A.y ? 1 : -1, bend = Math.min(r, Math.abs(B.y - A.y) / 2);
      let d;
      if (link === 'organic') {
        /* one tendril: a short stem out of the plant to the card edge, then a smooth S to the port; every tendril shares the
           same x-profile, so with anchors and ports ordered alike they never cross */
        const x0 = boxR - .5 * em, dx = B.x - x0;
        d = 'M' + A.x + ' ' + A.y + 'H' + x0 + 'C' + (x0 + dx * .42) + ' ' + A.y + ',' + (B.x - dx * .36) + ' ' + B.y + ',' + B.x + ' ' + B.y;
      } else d = 'M' + A.x + ' ' + A.y + 'H' + (lx - r) + 'Q' + lx + ' ' + A.y + ' ' + lx + ' ' + (A.y + dy * bend) + 'V' + (B.y - dy * bend) + 'Q' + lx + ' ' + B.y + ' ' + (lx + r) + ' ' + B.y + 'H' + B.x;
      const g = sv('g', { class:'lead-g' + (lit ? ' on' : ''), 'data-cat':c }, svg); g.setAttribute('style', catStyle(c));
      sv('path', { class:'ld-glow', d }, g);
      sv('path', { class:'ld' + (lit ? ' on' : ''), d, 'data-cat':c }, g);
      if (link === 'organic') sv('path', { class:'vein', d }, g);
      if (link === 'bridge') { sv('rect', { class:'socket' + (lit ? ' on' : ''), x:treeL - .3 * em, y:B.y - .6 * em, width:.6 * em, height:1.2 * em, rx:.3 * em }, g);     // the leader's socket on the tree card's edge
        sv('rect', { class:'socket exit' + (lit ? ' on' : ''), x:boxR - .3 * em, y:A.y - .55 * em, width:.6 * em, height:1.1 * em, rx:.3 * em }, g); }            // … and its exit on the plant card's edge
      if (link === 'docked') sv('rect', { class:'socket seam' + (lit ? ' on' : ''), x:treeL - .32 * em, y:A.y - .55 * em, width:.64 * em, height:1.1 * em, rx:.32 * em }, g);   // the anchor feeds straight through the seam
      const ar = link === 'organic' ? 1.15 : 1;
      sv('circle', { class:'anchor-halo', cx:A.x, cy:A.y, r:.95 * em * ar }, g);
      sv('circle', { class:'anchor' + (lit ? ' on' : ''), cx:A.x, cy:A.y, r:.62 * em * ar }, g);
      sv('circle', { class:'anchor-dot', cx:A.x, cy:A.y, r:.22 * em * ar }, g);
      /* label plate beside the anchor: on the side with more room inside the plant box */
      const tw = part.name.length * .56 * em * .74 + 1.1 * em, th = 1.45 * em;
      const right = A.x + 1.1 * em + tw < boxR - .4 * em;
      const px = right ? A.x + 1.05 * em : A.x - 1.05 * em - tw, py = A.y - th / 2;
      sv('rect', { class:'aplate' + (lit ? ' on' : ''), x:px, y:py, width:tw, height:th, rx:th / 2 }, g);
      const t = sv('text', { class:'alab' + (lit ? ' on' : ''), x:px + tw / 2, y:A.y + .27 * em, 'text-anchor':'middle' }, g); t.textContent = part.name;
    });
    svg.classList.toggle('dim', !!on);
  }
  const ro = new ResizeObserver(draw); ro.observe(sec); ro.observe(sp.wrap);
  return { draw, set(c){ on = c; draw(); } };
}
/* free height of a room's content row (below the floating header), for content-height boxes */
function zoneHeight(sec){
  const rr = sec.getBoundingClientRect(), hh = sec.querySelector('.rh').getBoundingClientRect(), cs = getComputedStyle(sec);
  return Math.floor(rr.bottom - parseFloat(cs.paddingBottom) - hh.bottom - parseFloat(cs.rowGap || cs.gap || 0));
}

/* ── Adapt / Spread (one family) and Terraform (globe room) ── */
function buildBoard(id){
  const sec = roomShell(id), R = ROOMS[id];
  const zf = sec.querySelector('.z-focus'), zm = sec.querySelector('.z-main'), zmap = sec.querySelector('.z-map');
  const isTf = id === 'terraform';
  const mm = mapBlock(id, zmap, isTf ?
    '<div class="mm-ctx tf"><span class="mc-k">Planet readout</span><dl class="env-rows">' +
      '<div><dt>' + ico('temp') + 'Sky temperature</dt><dd><b class="e-t"></b><small class="e-tp"></small></dd></div>' +
      '<div><dt>' + ico('humid') + 'Rain</dt><dd><b class="e-r"></b><small class="e-rp"></small></dd></div>' +
      '<div><dt>' + ico('hazard') + 'Instability</dt><dd><div class="bar sky"><i class="e-i"></i><i class="e-ip"></i></div></dd></div></dl>' +
      '<div class="mc-row"><b class="mc-open">Hover a system to see which regions it would open</b></div></div>' : regionCtxHTML);
  let sp = null, scene = null, globe = null, ld = null;
  const info = document.createElement('div'); info.className = 'lf-info';
  const tree = renderTree(zm, id, isTf ? 'banks' : 'anat', { onPreview:n => preview(n), onBought:(n, res) => { if (res.opened.length) mm.mini.flash(res.opened); }, onLayout:L => { ld && ld.draw(); if (!isTf) fitMain(L); } });
  /* content-height tree box (Adapt / Spread): as tall as the tree wants (capped row step), up to the room's free height.
     Applied on the next frame so the tree's own ResizeObserver never loops on itself. */
  let fitRaf = 0;
  function fitMain(L){
    const want = L.dims.wantH; if (!want) return;
    cancelAnimationFrame(fitRaf);
    fitRaf = requestAnimationFrame(() => { const avail = zoneHeight(sec); if (!avail || avail < 0) return; const h = Math.min(Math.ceil(want) + 4, avail); /* + 4 = the card's own borders */ if (Math.abs(parseFloat(zm.style.height || '0') - h) > 1) zm.style.height = h + 'px'; });
  }
  if (isTf) {
    scene = mountScene(zf); scene.el.classList.add('lf-top', 'scene'); zf.appendChild(info);
    const gh = document.createElement('div'); gh.className = 'globe-host'; tree.center.appendChild(gh); globe = mountGlobe(gh);
    const read = document.createElement('div'); read.className = 'g-read'; read.innerHTML = '<b class="d-t"></b><small class="d-r"></small>'; tree.el.appendChild(read);   // bottom-left of the tree box: outside the exclusion zone
    const hint = document.createElement('div'); hint.className = 'g-hint'; hint.innerHTML = ico('drag') + ' drag or arrows to spin'; read.appendChild(hint);
  } else {
    sp = specBlock(zf, '<b class="sc-n"></b><small class="sc-w"></small>'); zf.appendChild(info);
    ld = leaders(sec, sp, tree);
  }
  function paintInfoBase(){
    const v = BM.view(state.ctx);
    if (isTf) {
      const now = BM.skyNow();
      info.innerHTML = '<span class="li-k">The land around ' + esc(v.r.name) + '</span><div class="li-h"><span class="ni">' + ico('land') + '</span><div><b>' + esc(v.r.cond.temp[1]) + '</b><small>' + esc(v.r.cond.water[1]) + ' · ' + esc(v.r.cond.soil[1]) + '</small></div></div>' +
        '<div class="li-row">' + ico('temp') + '<span><b>Sky:</b> ' + skyTemp(now) + ' · ' + rainWord(now.dm).toLowerCase() + '</span></div>' +
        (v.limit ? '<div class="li-row">' + ico(v.limit.f === 'reach' ? 'reach' : v.limit.f) + '<span><b>Holding the plant back:</b> ' + esc(v.limit.text) + '</span></div>' : '<div class="li-row">' + ico('check') + '<span><b>Nothing holding the plant back here.</b></span></div>') +
        '<p class="li-hint">Hover a planet system to preview how this land changes. Terraform never changes your plant.</p>';
    } else {
      const items = BM.ITEMS.filter(it => it.board !== 'terraform' && S.owned[it.id]);
      info.innerHTML = '<span class="li-k">Your plant in ' + esc(v.r.name) + '</span><div class="li-h"><span class="ni">' + ico(R.ico) + '</span><div><b>' + esc(S.reg[state.ctx].colony === 'living' ? v.estWord : (v.st === 'bad' ? 'Would not survive yet' : 'No colony yet')) + '</b><small>' + esc(v.limit ? BM.ST_WORD[v.st] + ': ' + v.limit.text : 'Nothing holding the plant back') + '</small></div></div>' +
        '<div class="owned"><small>' + (id === 'spread' ? 'How it travels now' : 'Already part of your plant') + '</small>' + (items.length ? items.map(it => '<span class="ow">' + ico(ITEM_ICO[it.id]) + esc(it.name) + '</span>').join('') : '<span class="ow none">Nothing yet</span>') + '</div>' +
        '<p class="li-hint">Hover a skill: the plant previews it here and the line shows which part changes.</p>';
    }
    info.classList.remove('pv'); info.removeAttribute('data-cat'); info.removeAttribute('style'); mm.ctx.removeAttribute('data-cat'); mm.ctx.removeAttribute('style');
  }
  function paintInfo(n, isItem, pv){
    const names = a => a.map(r => BM.region(r).name).join(', ');
    const part = isTf ? null : tree.T.part[n.cat];
    info.dataset.cat = n.cat; info.setAttribute('style', catStyle(n.cat)); mm.ctx.dataset.cat = n.cat; mm.ctx.setAttribute('style', catStyle(n.cat));
    info.innerHTML = '<span class="li-k">' + (isItem ? 'Preview' : 'Later-tier placeholder') + ' · ' + esc(n.cat) + '</span>' +
      '<div class="li-h"><span class="ni">' + ico(n.ico || CAT_ICO[n.cat]) + '</span><div><b>' + esc(n.name) + '</b><small>' + (S.owned[n.id] ? 'Owned' : '<span class="cost"><i class="bd"></i>' + n.cost + ' Biomass</span>') + '</small></div></div>' +
      '<p>' + esc(n.desc) + '</p>' +
      '<div class="li-row">' + ico(isTf ? 'planet' : 'adapt') + '<span><b>Looks like:</b> ' + esc(n.look) + '</span></div>' +
      (part ? '<span class="li-part">' + ico(part.ico) + 'Changes ' + esc(part.name) + '</span>' : '<span class="li-part">' + ico('land') + 'Changes ' + esc(chanWord.env) + ' · not the plant</span>') +
      (isItem && isTf ? '<div class="li-row">' + ico('temp') + '<span><b>Sky:</b> ' + skyTemp(BM.skyNow(n.id)) + ' · ' + rainWord(BM.skyNow(n.id).dm).toLowerCase() + '</span></div>' : '') +
      (isItem && (pv.open.length || pv.worse.length) ? '<div class="li-row">' + ico('regions') + '<span>' + (pv.open.length ? '<b>Opens:</b> ' + esc(names(pv.open)) : '') + (pv.open.length && pv.worse.length ? ' · ' : '') + (pv.worse.length ? '<b>Harder:</b> ' + esc(names(pv.worse)) : '') + '</span></div>' : '') +
      (n.future ? '<p class="li-hint">Placeholder: not purchasable in this mockup.</p>' : '<p class="li-hint">Click to buy (fake).</p>');
    info.classList.add('pv');
  }
  function paintTf(pvId, on){
    const now = BM.skyNow(), nx = BM.skyNow(pvId);
    const c = mm.ctx;
    c.querySelector('.e-t').textContent = skyTemp(now); c.querySelector('.e-tp').textContent = pvId && nx.dt !== now.dt ? '→ ' + skyTemp(nx) : '';
    c.querySelector('.e-r').textContent = rainWord(now.dm); c.querySelector('.e-rp').textContent = pvId && nx.dm !== now.dm ? '→ ' + rainWord(nx.dm).toLowerCase() : '';
    c.querySelector('.e-i').style.width = Math.round(S.instab * 100) + '%'; c.querySelector('.e-ip').style.width = pvId && BM.item(pvId) ? Math.round(Math.min(1, S.instab + .22) * 100) + '%' : '0%';
    c.classList.toggle('pv', !!on);
    sec.querySelector('.d-t').textContent = skyTemp(nx); sec.querySelector('.d-r').textContent = rainWord(nx.dm);
    scene.update(state.ctx, nx, !!on); scene.cap.querySelector('.sc-n').textContent = 'Land around ' + BM.region(state.ctx).name; scene.cap.querySelector('.sc-w').textContent = on ? 'Preview · ' + skyTemp(nx) + ' · ' + rainWord(nx.dm).toLowerCase() : skyTemp(now) + ' · ' + rainWord(now.dm).toLowerCase();
  }
  function paintBase(){
    if (!state.ctx) return;
    const v = BM.view(state.ctx);
    if (sp) { sp.spec.highlight(null); sp.spec.render(BM.specState(state.ctx), false); sp.cap.querySelector('.sc-n').textContent = 'Your plant in ' + v.r.name; sp.cap.querySelector('.sc-w').textContent = S.reg[state.ctx].colony === 'living' ? v.estWord + (v.st !== 'ok' ? ' · stressed' : '') : (v.st === 'bad' ? 'Would not survive here yet' : 'No colony yet'); }
    if (isTf) { paintTf(null, false); globe.update(BM.skyNow(), { sel:state.ctx }); }
    mm.paint(); mm.setText(''); paintInfoBase(); if (!isTf) paintRegionCtx(mm, null, false, null);
    if (ld) ld.set(null);
  }
  function preview(n){
    if (!n) { mm.mini.setPreview(null); paintBase(); return; }
    const isItem = !!n.item, pv = isItem ? BM.previewOf(n.id) : { open:[], worse:[] };
    const arcs = id === 'spread' ? arcsFor(n.id) : [];
    mm.mini.setPreview({ open:pv.open, worse:pv.worse, arcs, tint:isTf && isItem ? n.id : null });
    if (isTf) { paintTf(isItem ? n.id : null, true); globe.update(BM.skyNow(isItem ? n.id : undefined), { open:pv.open, worse:pv.worse, on:true, sel:state.ctx }); }
    else { sp.spec.render(BM.specState(state.ctx, isItem ? { addTrait:n.id } : {}), true); sp.spec.highlight(n.chan); ld.set(n.cat); }
    paintInfo(n, isItem, pv);
    if (!isTf) paintRegionCtx(mm, pv, isItem, n); else { const names = a => a.map(r => BM.region(r).name).join(', '); const o = mm.ctx.querySelector('.mc-open'); o.innerHTML = isItem ? ((pv.open.length ? ico('check') + '<b>Opens ' + esc(names(pv.open)) + '</b>' : '') + (pv.worse.length ? (pv.open.length ? '<br>' : '') + ico('alert') + '<b>Harder: ' + esc(names(pv.worse)) + '</b>' : '') || 'No region changes right away.') : '<em>Later-tier placeholder</em>: region effects not scripted.'; }
    const txt = isItem ? BM.previewText(n.id) : 'Later-tier placeholder. ' + n.desc + (arcs.length ? ' Routes shown are illustrative.' : '');
    mm.setText('<b>' + esc(n.name) + '</b> · ' + esc(txt) + ' <span class="pvw">' + (isTf ? 'Changes the environment' : 'Changes ' + chanWord[n.chan]) + '</span>');
  }
  BM.store.on(e => { if (sec.hidden || e.type === 'gain') return; paintBase(); });
  rooms[id] = { sec, mm, tree, globe, onCtx:paintBase, onOpen:() => { paintBase(); requestAnimationFrame(() => { tree.relayout(); ld && ld.draw(); }); }, clear:() => { tree.clear(); mm.mini.setPreview(null); mm.pillPeek(null); }, redraw:() => { tree.relayout(); ld && ld.draw(); }, focusNode:nid => tree.focusNode(nid), focusFirst:() => sec.querySelector('h2').focus() };
}
buildRegion(); ['adapt', 'spread', 'terraform'].forEach(buildBoard);

/* ───────────────────────── room open / close (auto-pause; home map deselected; region carried as room context) ───────────────────────── */
const planet = document.getElementById('planet'), hud = document.getElementById('hud');
function openRoom(id, opener, focusNode){
  if (!rooms[id]) return;
  const first = !state.room;
  if (first) {
    state.wasPaused = BM.clock.paused; state.opener = opener || null;
    if (!state.wasPaused) BM.clock.setPaused(true);                        // AUTO-PAUSE on entering a deep room
    const carry = state.sel || state.ctx || BM.REGIONS.find(r => r.origin).id;
    selectHome(null);                                                      // the home map is deselected while a room is open
    setCtx(carry);                                                         // … and that region becomes the room's context
    calibrateScale();
    roomsEl.hidden = false; document.body.classList.add('in-room');
    /* Planet View stays underneath (blurred and dimmed by CSS) but is inert: not clickable, not focusable, not read out */
    [planet, hud].forEach(e => { e.inert = true; e.setAttribute('aria-hidden', 'true'); });
  }
  if (state.room && state.room !== id) { rooms[state.room].clear && rooms[state.room].clear(); rooms[state.room].sec.hidden = true; }
  state.room = id;
  const r = rooms[id]; r.sec.hidden = false; r.onOpen();
  document.querySelectorAll('[data-tool]').forEach(b => b.setAttribute('aria-pressed', b.dataset.tool === id));
  document.querySelectorAll('[data-room-go]').forEach(b => b.setAttribute('aria-pressed', b.dataset.roomGo === id));
  live(ROOMS[id].title + ' open. Game paused. Considering ' + BM.region(state.ctx).name + '.');
  if (focusNode && r.focusNode) requestAnimationFrame(() => r.focusNode(focusNode)); else r.focusFirst();
}
function closeRoom(resume){
  if (!state.room) return;
  rooms[state.room].clear && rooms[state.room].clear();
  rooms[state.room].sec.hidden = true; state.room = null;
  roomsEl.hidden = true; document.body.classList.remove('in-room');
  [planet, hud].forEach(e => { e.inert = false; e.removeAttribute('aria-hidden'); });
  document.querySelectorAll('[data-tool]').forEach(b => b.setAttribute('aria-pressed', b.dataset.tool === 'mapview' ? !!state.lens : false));
  miniMaps.forEach(m => m.setPreview(null)); mainMap.setPreview(null);
  if (resume || !state.wasPaused) BM.clock.setPaused(false);              // Back = as it was; Resume = running
  live('Back to Planet View' + (BM.clock.paused ? ', still paused' : ', running') + '. No region selected.');
  if (state.opener && document.contains(state.opener) && !state.opener.closest('[hidden]')) state.opener.focus(); else document.querySelector('[data-tool="region"]').focus();
}
roomsEl.addEventListener('click', e => {
  const a = e.target.closest('[data-act]'); if (a) { closeRoom(a.dataset.act === 'resume'); return; }
  const g = e.target.closest('[data-room-go]'); if (g) openRoom(g.dataset.roomGo, state.opener);
});
document.addEventListener('keydown', e => { if (e.key !== 'Escape') return; if (state.room) { e.preventDefault(); closeRoom(false); } else if (!lenspop.hidden) { e.preventDefault(); openLensPop(false, true); } });

/* deep links for review / QA: ?region=frost&room=adapt&lens=temp */
if (BM.region(q.get('region'))) selectHome(q.get('region'));
if (q.get('lens') && BM.COND_META[q.get('lens')]) setLens(q.get('lens'));
if (ROOM_IDS.includes(q.get('room'))) openRoom(q.get('room'), document.querySelector('[data-tool="' + q.get('room') + '"]'));

setLink(link);
window.ROOMS25 = { state, open:openRoom, close:closeRoom, rooms, mainMap, miniMaps, selectHome, setCtx, setLens, previewLens, fitMap, calibrate:calibrateScale, medianName, get link(){ return link; }, setLink, LINK_IDS, lenspop, openLensPop };   // QA hook
})();
