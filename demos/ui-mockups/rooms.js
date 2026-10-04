/*
  BLOOM-022 · Concepts 11–14 — shared framework for the "Planet View + paused decision rooms" architecture.

  VISUAL CONCEPT MOCKUPS ONLY. Fake data (shared.js), scripted behaviour, not connected to the game. Not the production UI.
  Nothing here loads or calls the engine, generator, validators, scenarios, balance data or Bloom Report.

  One file drives all four concepts. document.body.dataset.concept (11–14) picks a configuration that changes ONLY what the
  round is meant to compare: shell (chamber over the planet vs full new screen), HUD composition, mini-map prominence,
  specimen prominence, and which upgrade-tree layout each room uses. Everything else (fake data, rooms, pause rule,
  mini-map behaviour, previews) is shared so the comparison is fair.

  Shared rules (all four concepts):
    - Planet View is the stable home: the main map is mounted once and never resized by exploration.
    - Opening Region Inspect / Adapt / Spread / Terraform AUTO-PAUSES the fake clock and shows a visible PAUSED state.
      Closing a room returns to Planet View and restores the clock (Back = as it was; Resume play = running).
    - Every room carries a smaller interactive mini-map: select / hover-peek / "Considering for" / previews.
    - Adapt and Spread preview on the plant (specimen layers); Terraform previews on the environment layer only.
    - No emoji icons: the inline SVG set below is the whole icon language for these concepts.
  Tree layouts: branchV (organic top-down), radial (ring around a specimen / planet), network (tech graph),
  route (dispersal path), anatomy (rows linked to plant parts), systems (planetary-systems columns with gauges).
*/
(function(){
'use strict';
const BM = window.BM, sv = BM.sv, esc = BM.esc, S = BM.store.s;
const CID = +document.body.dataset.concept || 11;
const q = new URLSearchParams(location.search);

/* ───────────────────────── concept configuration (what varies) ───────────────────────── */
const CFG = {
  11:{ name:'Concept 11 · Balanced decision rooms', shell:'chamber', hud:'banner',
       rooms:{ region:{ focus:'specimen' }, adapt:{ tree:'branch', focus:'specimen' }, spread:{ tree:'branch', focus:'specimen' },
               terraform:{ tree:'radial', center:'planet', focus:'env' } } },
  12:{ name:'Concept 12 · Specimen-first evolution rooms', shell:'screen', hud:'banner',
       rooms:{ region:{ focus:'specimen-big' }, adapt:{ tree:'radial', center:'specimen' }, spread:{ tree:'radial', center:'specimen' },
               terraform:{ tree:'radial', center:'scene', focus:'env' } } },
  13:{ name:'Concept 13 · World-control strategy rooms', shell:'screen', hud:'strip',
       rooms:{ region:{ focus:'specimen-thumb' }, adapt:{ tree:'network', focus:'specimen-thumb' }, spread:{ tree:'routeH', focus:'specimen-thumb' },
               terraform:{ tree:'network', focus:'env' } } },
  14:{ name:'Concept 14 · Category labs', shell:'screen', hud:'banner',
       titles:{ region:'Ecology dossier', adapt:'Evolution lab', spread:'Dispersal lab', terraform:'Planet systems lab' },
       rooms:{ region:{ focus:'specimen', dossier:true }, adapt:{ tree:'anatomy' }, spread:{ tree:'route', focus:'specimen-thumb' },
               terraform:{ tree:'systems', focus:'env' } } },
}[CID];
const ROOM_IDS = ['region', 'adapt', 'spread', 'terraform'];
const ROOMS = {
  region:{ kicker:'EXPLORE', title:'Region Inspect', tool:'Regions', ico:'regions', kind:'explore', verb:'Compare regions and their colonies' },
  adapt:{ kicker:'CHANGE · YOUR PLANT', title:'Adapt', tool:'Adapt', ico:'adapt', kind:'plant', verb:'Change your plant' },
  spread:{ kicker:'CHANGE · HOW IT TRAVELS', title:'Spread', tool:'Spread', ico:'spread', kind:'spread', verb:'Reach new land' },
  terraform:{ kicker:'CHANGE · THE PLANET', title:'Terraform', tool:'Terraform', ico:'terraform', kind:'planet', verb:'Change the planet, not the plant' },
};
if (CFG.titles) Object.keys(CFG.titles).forEach(k => ROOMS[k].title = CFG.titles[k]);

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
  speed:'<path d="M5 6l7 6-7 6zM12 6l7 6-7 6z"/>',
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
  next:'<path d="M9 5l7 7-7 7"/>',
  layers:'<path d="M3 8l9-4 9 4-9 4z"/><path d="M3 12l9 4 9-4"/><path d="M3 16l9 4 9-4"/>',
  off:'<circle cx="12" cy="12" r="8"/><path d="M6.5 6.5l11 11"/>',
};
const ico = (n, cls) => '<svg class="ic' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + (I[n] || I.plus) + '</svg>';
const CAT_ICO = { Temperature:'temp', Water:'water', Soil:'soil', Hazard:'hazard', Seeds:'seedOut', Growth:'colony', Reach:'reach', 'Sky temperature':'temp', Rain:'humid', Ground:'soil', Air:'air' };
const ITEM_ICO = { cold:'cold', heat:'heat', drought:'drought', flood:'flood', salt:'salt', rad:'rad', seedOut:'seedOut', waterSeeds:'waterSeeds', earlyMat:'earlyMat', warm:'warm', cool:'cool', humid:'humid', dry:'dry' };
const chip = (st, word) => '<span class="st ' + st + '"><i aria-hidden="true">' + ico(st === 'ok' ? 'check' : st === 'warn' ? 'alert' : 'x') + '</i>' + esc(word || BM.ST_WORD[st]) + '</span>';

/* ───────────────────────── upgrade trees (fake, deterministic) ─────────────────────────
   The 13 purchasable items are the shared fake items (BM.ITEMS) so previews / purchases use the same scripted effects as every
   earlier concept. Nodes marked future:true are LATER-TIER PLACEHOLDERS: they give the trees their shape, unlock visually when
   their parent is owned, and cannot be bought in this mockup. Costs and names are not proposals. */
const TREES = {
  adapt:{ root:{ id:'a0', name:'Pioneer plant', short:'Plant', text:'Your starting plant. Every adaptation grows out of this body.', ico:'root' },
    cats:['Temperature', 'Water', 'Soil', 'Hazard'], chan:{ Temperature:'temp', Water:'water', Soil:'soil', Hazard:'hazard' },
    nodes:[
      { id:'cold', item:true, cat:'Temperature', parent:'a0' },
      { id:'heat', item:true, cat:'Temperature', parent:'a0' },
      { id:'f-anti', future:true, name:'Antifreeze Sap', cat:'Temperature', parent:'cold', cost:220, ico:'cold', desc:'Sugars in the sap stop cells freezing. Deeper cold.', look:'Thicker stem, darker leaves' },
      { id:'f-wax', future:true, name:'Waxy Cuticle', cat:'Temperature', parent:'heat', cost:200, ico:'heat', desc:'A waxy coat slows water loss in heat.', look:'Glossy leaf edges' },
      { id:'drought', item:true, cat:'Water', parent:'a0' },
      { id:'flood', item:true, cat:'Water', parent:'a0' },
      { id:'f-tap', future:true, name:'Deep Taproot', cat:'Water', parent:'drought', cost:240, ico:'roots', desc:'One long root finds water far below.', look:'Long single root' },
      { id:'f-aer', future:true, name:'Air Roots', cat:'Water', parent:'flood', cost:240, ico:'roots', desc:'Roots that breathe above the waterline.', look:'Knobbly roots above ground' },
      { id:'salt', item:true, cat:'Soil', parent:'a0' },
      { id:'f-nfix', future:true, name:'Nitrogen Partners', cat:'Soil', parent:'a0', cost:190, ico:'soil', desc:'Root bacteria turn poor soil into food.', look:'Root nodules' },
      { id:'f-gland', future:true, name:'Salt Glands', cat:'Soil', parent:'salt', cost:230, ico:'salt', desc:'Leaves sweat salt out as crystals.', look:'White leaf tips' },
      { id:'rad', item:true, cat:'Hazard', parent:'a0' },
      { id:'f-bark', future:true, name:'Thick Bark', cat:'Hazard', parent:'rad', cost:260, ico:'rad', desc:'Corky bark shrugs off vent heat and radiation.', look:'Ridged dark stem' },
    ] },
  spread:{ root:{ id:'s0', name:'Seeds', short:'Seeds', text:'How your plant travels. Every route starts with a seed.', ico:'seedOut' },
    cats:['Seeds', 'Growth', 'Reach'], chan:{ Seeds:'spread', Growth:'spread', Reach:'spread' },
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
  terraform:{ root:{ id:'t0', name:'Planet systems', short:'Planet', text:'The sky, the rain, the ground and the air. The plant itself never changes here.', ico:'planet' },
    cats:['Sky temperature', 'Rain', 'Ground', 'Air'], chan:{ 'Sky temperature':'env', Rain:'env', Ground:'env', Air:'env' },
    nodes:[
      { id:'warm', item:true, cat:'Sky temperature', parent:'t0' },
      { id:'cool', item:true, cat:'Sky temperature', parent:'t0' },
      { id:'f-veil', future:true, name:'Greenhouse Veil', cat:'Sky temperature', parent:'warm', cost:320, ico:'veil', desc:'Trap more heat: warmer nights everywhere.', look:'Hazy warm sky' },
      { id:'f-bright', future:true, name:'Bright Clouds', cat:'Sky temperature', parent:'cool', cost:320, ico:'bright', desc:'Reflective clouds bounce sunlight back.', look:'White cloud decks' },
      { id:'humid', item:true, cat:'Rain', parent:'t0' },
      { id:'dry', item:true, cat:'Rain', parent:'t0' },
      { id:'f-monsoon', future:true, name:'Monsoon Cycle', cat:'Rain', parent:'humid', cost:340, ico:'monsoon', desc:'Seasonal rains sweep the whole planet.', look:'Heavy seasonal rain' },
      { id:'f-soil', future:true, name:'Soil Building', cat:'Ground', parent:'t0', cost:280, ico:'soilb', desc:'Dead leaves become topsoil faster.', look:'Darker, deeper ground' },
      { id:'f-leach', future:true, name:'Wash the Salt', cat:'Ground', parent:'f-soil', cost:300, ico:'leach', desc:'Flush salt down out of the root zone.', look:'Salt crust fades' },
      { id:'f-ozone', future:true, name:'Thicker Air', cat:'Air', parent:'t0', cost:360, ico:'air', desc:'A denser sky screens the worst radiation.', look:'Softer light' },
    ] },
};
function buildTree(board){
  const tr = TREES[board];
  const nodes = tr.nodes.map(n => n.item ? Object.assign({}, BM.item(n.id), n, { ico:ITEM_ICO[n.id] }) : Object.assign({}, n));
  const byId = {}; nodes.forEach(n => { byId[n.id] = n; n.children = []; n.chan = tr.chan[n.cat]; });
  nodes.forEach(n => { if (n.parent !== tr.root.id) byId[n.parent].children.push(n); });
  const depth = n => n.parent === tr.root.id ? 1 : depth(byId[n.parent]) + 1;
  nodes.forEach(n => n.depth = depth(n));
  const slots = n => n._s || (n._s = Math.max(1, n.children.reduce((a, c) => a + slots(c), 0)));
  nodes.forEach(slots);
  const GAP = .7; let cursor = 0; const catSpan = {};
  const assign = (n, start) => { n.slot = start + n._s / 2; let c = start; n.children.forEach(ch => { assign(ch, c); c += ch._s; }); };
  tr.cats.forEach(c => { const start = cursor; nodes.filter(n => n.cat === c && n.depth === 1).forEach(t1 => { assign(t1, cursor); cursor += t1._s; }); catSpan[c] = [start, cursor]; cursor += GAP; });
  return { board, root:tr.root, cats:tr.cats, nodes, byId, total:cursor, D:Math.max.apply(null, nodes.map(n => n.depth)), catSpan };
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

/* ───────────────────────── tree layouts (px, relaid on resize) ─────────────────────────
   Six kinds, three node styles:
     branch   category columns, depth-first rows, trunk + bracket edges            cards   (C11 Adapt / Spread)
     systems  the same columns under planetary-system gauge headers, orthogonal     cards   (C14 Terraform)
     anatomy  category rows anchored to plant parts, one sub-row per chain          cards   (C14 Adapt)
     radial   rings around a specimen / planet; labels flip inward / outward        pills   (C11 Terraform, C12)
     route    depth rows across a wide band, dashed dispersal edges                 pills   (C14 Spread)
     network  depth columns in a narrow side panel, orthogonal tech-tree edges      chips   (C13 Adapt / Terraform)
     routeH   network geometry with dashed route edges                              chips   (C13 Spread)                 */
const STYLE = { branch:'card', systems:'card', anatomy:'card', radial:'pill', route:'pill', network:'chip', routeH:'chip' };
const CARD_H = 48, CHIP_H = 30, PILL_R = 22;
function dfsByCat(T){ const out = {}; T.cats.forEach(c => { const o = []; const walk = n => { o.push(n); n.children.forEach(walk); }; T.nodes.filter(n => n.cat === c && n.depth === 1).forEach(walk); out[c] = o; }); return out; }
function layout(T, kind, w, h, opts){
  opts = opts || {}; const pos = {}, anchors = {}, D = T.D, tot = T.total, K = T.cats.length, root = T.root.id;
  const dims = { nw:152, cw:150, pw:96, trunk:{} };
  if (kind === 'branch' || kind === 'systems') {
    const colW = w / K, hdr = kind === 'systems' ? (opts.headerH || 104) : 0;
    const rows = dfsByCat(T); const maxRows = Math.max.apply(null, T.cats.map(c => rows[c].length));
    const tight = kind === 'branch' && colW < 150; dims.style = tight ? 'pill' : 'card';
    const top = hdr + (kind === 'systems' ? 46 : tight ? 150 : 116), bot = tight ? 70 : 34;
    const rowH = Math.max(tight ? 86 : CARD_H + 10, Math.min(tight ? 100 : 92, (h - top - bot) / Math.max(1, maxRows - 1)));
    const indent = tight ? 0 : Math.max(8, Math.min(22, (colW - 22 - 100) / Math.max(1, D - 1)));
    dims.nw = tight ? 50 : Math.max(100, Math.min(152, colW - (kind === 'systems' ? 30 : 22) - indent * (D - 1))); dims.pw = tight ? Math.min(100, colW - 8) : dims.pw;
    T.cats.forEach((c, k) => {
      const cx = colW * (k + .5), x0 = cx - (D - 1) * indent / 2;
      rows[c].forEach((n, i) => pos[n.id] = { x:x0 + (n.depth - 1) * indent, y:top + i * rowH });
      anchors[c] = { x:cx, y:kind === 'systems' ? hdr - 2 : top - 50, label:kind !== 'systems' };
      dims.trunk[c] = { x:x0 - dims.nw / 2 - (tight ? 16 : 12), top:anchors[c].y, bottom:rows[c].length ? pos[rows[c].filter(n => n.depth === 1).slice(-1)[0].id].y : top };
    });
    if (kind === 'branch') pos[root] = { x:w / 2, y:tight ? 44 : 34 };
  } else if (kind === 'anatomy') {
    const leftW = opts.leftW || w * .38, left = leftW + 64, right = 72, padT = 46, padB = 30;
    const chains = []; T.cats.forEach(c => T.nodes.filter(n => n.cat === c && n.depth === 1).forEach(n => chains.push(n)));
    const rowH = (h - padT - padB) / Math.max(1, chains.length - 1);
    dims.nw = Math.max(104, Math.min(148, (w - left - right) / Math.max(1, D) - 14));
    const colX = d => D === 1 ? (left + w - right) / 2 : left + dims.nw / 2 + (d - 1) / (D - 1) * (w - left - right - dims.nw);
    chains.forEach((t1, i) => { const y = padT + i * rowH; const walk = n => { pos[n.id] = { x:colX(n.depth), y }; n.children.forEach(walk); }; walk(t1); });
    T.cats.forEach(c => { const a = anatomyAnchor(c, leftW, h); const first = chains.find(n => n.cat === c); const p = first ? pos[first.id] : a;
      anchors[c] = { x:a.x, y:a.y, label:true, left:true, lx:p.x - dims.nw / 2, ly:p.y - 38 }; });
  } else if (kind === 'network' || kind === 'routeH') {
    const noRoot = D >= 3; const left = noRoot ? 22 : 118, right = 12, padT = 34, padB = 18;
    const slotPx = (h - padT - padB) / tot; dims.cw = Math.max(118, Math.min(156, (w - left - right) / Math.max(1, D) - 10));
    const colX = d => D === 1 ? (left + w - right) / 2 : left + dims.cw / 2 + (d - 1) / (D - 1) * (w - left - right - dims.cw);
    pos[root] = { x:52, y:h / 2, hidden:noRoot };
    T.nodes.forEach(n => pos[n.id] = { x:colX(n.depth), y:padT + n.slot * slotPx });
    T.cats.forEach(c => { const [a] = T.catSpan[c]; anchors[c] = { x:colX(1) - dims.cw / 2, y:padT + a * slotPx - 16, label:true, left:true }; });
  } else if (kind === 'route') {
    const padX = 54, top = 84, bot = h < 360 ? 50 : 64, x0 = padX + 96;
    const slotPx = (w - padX - x0) / tot; dims.pw = Math.max(60, Math.min(100, slotPx * 1.05));
    const rowY = d => D === 1 ? top : top + (d - 1) / (D - 1) * (h - top - bot);
    pos[root] = { x:padX, y:rowY(1) };
    T.nodes.forEach(n => pos[n.id] = { x:x0 + n.slot * slotPx, y:rowY(n.depth) });
    T.cats.forEach(c => { const [a, b] = T.catSpan[c]; anchors[c] = { x:x0 + (a + b) / 2 * slotPx, y:rowY(1) - 54, label:true }; });
  } else if (kind === 'radial') {
    /* two rings around the centre art. Inner labels point outward into a fixed ring gap; outer children sit half a slot off their
       parent's angle so the inner label never lands on the outer icon; only outer nodes near the vertical carry side labels. */
    const cx = w / 2, cy = h / 2, hole = opts.hole || { rx:60, ry:60 }, GAPR = 90;
    const rxMin = hole.rx + 54, ryMin = hole.ry + 42;
    dims.pw = Math.max(64, Math.min(100, (Math.PI * (rxMin + ryMin)) / tot * 1.1));
    const rxMax = Math.max(rxMin + GAPR, Math.min(w / 2 - dims.pw / 2 - 8, rxMin + 150)), ryMax = Math.max(ryMin + GAPR, Math.min(h / 2 - 62, ryMin + 130));
    const ring = d => D === 1 ? [rxMax, ryMax] : d >= 2 ? [rxMax, ryMax] : [rxMin, ryMin];
    pos[root] = { x:cx, y:cy, hidden:!!opts.hideRoot };
    T.nodes.forEach(n => { const a = -Math.PI / 2 + (n.slot + (n.depth > 1 ? .5 * (n.depth - 1) : 0)) / tot * Math.PI * 2; const [rx, ry] = ring(n.depth); const c = Math.cos(a), inner = n.depth === 1 && D > 1;
      pos[n.id] = { x:cx + c * rx, y:cy + Math.sin(a) * ry, top:Math.sin(a) < 0, inward:false, inner, side:(!inner && Math.abs(c) < .46) ? 'auto' : null, a }; });
    // pills are as wide as the tightest neighbour spacing on either ring allows (labels wrap; the cost line hides under 76 px)
    let minD = 999; [1, 2].forEach(r => { const ns = T.nodes.filter(n => Math.min(n.depth, 2) === r).sort((x, y) => pos[x.id].a - pos[y.id].a); for (let i = 1; i < ns.length; i++) minD = Math.min(minD, Math.hypot(pos[ns[i].id].x - pos[ns[i - 1].id].x, pos[ns[i].id].y - pos[ns[i - 1].id].y)); });
    dims.pw = Math.max(60, Math.min(100, minD - 4));
    // a side label points to whichever side has more clearance from the other nodes on the same ring
    T.nodes.forEach(n => { const p = pos[n.id]; if (!p.side) return; const ring = Math.min(n.depth, 2); let cl = 999, cr = 999;
      T.nodes.forEach(m => { if (m === n || Math.min(m.depth, 2) !== ring) return; const q = pos[m.id]; if (Math.abs(q.y - p.y) > 80) return; if (q.x < p.x) cl = Math.min(cl, p.x - q.x); else cr = Math.min(cr, q.x - p.x); });
      p.side = cl > cr + 4 ? 'left' : cr > cl + 4 ? 'right' : (Math.cos(p.a) < 0 ? 'left' : 'right'); });
    T.cats.forEach(c => { const [a0] = T.catSpan[c]; const a = -Math.PI / 2 + (a0 - .35) / tot * Math.PI * 2; const rx = (rxMin + rxMax) / 2, ry = (ryMin + ryMax) / 2; anchors[c] = { x:cx + Math.cos(a) * rx, y:cy + Math.sin(a) * ry, label:true, gap:true }; });
  }
  return { pos, anchors, dims };
}
function anatomyAnchor(cat, leftW, h){            // where on the specimen drawing a category "lives" (approximate, placeholder)
  const bx = 14, by = 14, bw = leftW - 28, bh = h - 28;
  const P = { Temperature:[.5, .56], Water:[.63, .4], Soil:[.5, .85], Hazard:[.4, .3] }[cat] || [.5, .5];
  return { x:bx + bw * P[0], y:by + bh * P[1] };
}
const curveH = (a, b) => { const mx = (a.x + b.x) / 2; return 'M' + a.x + ' ' + a.y + 'C' + mx + ' ' + a.y + ',' + mx + ' ' + b.y + ',' + b.x + ' ' + b.y; };
const curveV = (a, b) => { const my = (a.y + b.y) / 2; return 'M' + a.x + ' ' + a.y + 'C' + a.x + ' ' + my + ',' + b.x + ' ' + my + ',' + b.x + ' ' + b.y; };
const orthoH = (a, b) => { const mx = (a.x + b.x) / 2; return 'M' + a.x + ' ' + a.y + 'H' + mx + 'V' + b.y + 'H' + b.x; };

/* ───────────────────────── tree renderer ───────────────────────── */
function renderTree(host, board, kind, opts){
  opts = opts || {};
  const T = buildTree(board); let style = STYLE[kind];
  const el = document.createElement('div'); el.className = 'tree k-' + kind + ' s-' + style + ' b-' + board; host.appendChild(el);
  const edges = sv('svg', { class:'edges', 'aria-hidden':'true', focusable:'false' }, el);
  const center = document.createElement('div'); center.className = 'center'; el.appendChild(center);
  const lbls = {}; T.cats.forEach(c => { const l = document.createElement('div'); l.className = 'cat-l'; l.innerHTML = ico(CAT_ICO[c]) + '<span>' + esc(c) + '</span>'; el.appendChild(l); lbls[c] = l; });
  const rootEl = document.createElement('button'); rootEl.type = 'button'; rootEl.className = 'node root ' + style; rootEl.dataset.node = T.root.id;
  rootEl.innerHTML = '<span class="ni">' + ico(T.root.ico) + '</span><span class="nt"><b>' + esc(style === 'chip' ? T.root.short : T.root.name) + '</b><small>' + (board === 'terraform' ? 'Planet' : 'Your plant') + '</small></span>';
  rootEl.setAttribute('aria-label', T.root.name + '. ' + T.root.text);
  el.appendChild(rootEl); if (kind === 'anatomy' || kind === 'systems') rootEl.hidden = true;
  const nodeEls = {};
  T.nodes.forEach(n => { const b = document.createElement('button'); b.type = 'button'; b.dataset.node = n.id; nodeEls[n.id] = b; el.appendChild(b); });
  function paintNodes(){
    T.nodes.forEach(n => {
      const b = nodeEls[n.id], st = nodeState(T, n);
      const meta = style === 'chip' ? (st === 'avail' || st === 'poor' || st === 'blocked' ? '<i class="bd" aria-hidden="true"></i>' + n.cost : '') : (STATE_WORD[st] || (n.cost + ' Biomass'));
      b.className = 'node ' + style + ' ch-' + n.chan + ' st-' + st + (n.future ? ' future' : '') + ['lab-up', 'lab-side', 'lab-left'].filter(k => b.classList.contains(k)).map(k => ' ' + k).join('');
      b.innerHTML = '<span class="ni">' + ico(n.ico || CAT_ICO[n.cat]) + (st === 'locked' || st === 'future' ? '<span class="nl">' + ico('lock') + '</span>' : st === 'owned' ? '<span class="nl ok">' + ico('check') + '</span>' : '') + '</span>' +
        '<span class="nt"><b>' + esc(n.name) + '</b><small>' + (style === 'chip' ? meta : esc(meta)) + (n.future && st !== 'locked' && style !== 'chip' ? ' · placeholder' : '') + '</small></span>';
      b.setAttribute('aria-label', n.name + ', ' + n.cat + ', ' + (st === 'avail' || st === 'poor' ? n.cost + ' Biomass' : (STATE_WORD[st] || '')) + (n.future ? ' (placeholder, not purchasable in this mockup)' : '') + '. ' + n.desc);
      b.setAttribute('aria-disabled', st === 'owned' || st === 'locked' || st === 'future' ? 'true' : 'false');
    });
    paintEdges();
  }
  let L = null;
  function relayout(){
    const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return;
    const lopts = Object.assign({}, opts);
    if (kind === 'radial') { const c = center.getBoundingClientRect(); lopts.hole = { rx:c.width / 2, ry:c.height / 2 }; }
    if (kind === 'anatomy') lopts.leftW = center.getBoundingClientRect().width || w * .38;
    L = layout(T, kind, w, h, lopts);
    if (L.dims.style && L.dims.style !== style) { style = L.dims.style; rootEl.className = 'node root ' + style; paintNodes(); }
    el.classList.toggle('tight', L.dims.style === 'pill' && kind === 'branch');
    el.style.setProperty('--nw', L.dims.nw + 'px'); el.style.setProperty('--cw', L.dims.cw + 'px'); el.style.setProperty('--pw', L.dims.pw + 'px');
    el.classList.toggle('narrow', L.dims.pw < 76); el.classList.toggle('short', kind === 'route' && h < 360);
    edges.setAttribute('viewBox', '0 0 ' + w + ' ' + h); edges.setAttribute('width', w); edges.setAttribute('height', h);
    const put = (node, p) => { node.style.left = p.x + 'px'; node.style.top = p.y + 'px'; };
    if (!(kind === 'anatomy' || kind === 'systems')) rootEl.hidden = !!L.pos[T.root.id].hidden; if (!rootEl.hidden) put(rootEl, L.pos[T.root.id]);
    T.nodes.forEach(n => { const p = L.pos[n.id]; put(nodeEls[n.id], p); if (kind === 'radial') { const b = nodeEls[n.id]; b.classList.toggle('lab-up', !p.side && p.top); b.classList.toggle('lab-side', !!p.side); b.classList.toggle('lab-left', p.side === 'left'); } });
    T.cats.forEach(c => { const a = L.anchors[c]; lbls[c].hidden = !a.label; if (a.label) { put(lbls[c], a.lx !== undefined ? { x:a.lx, y:a.ly } : a); lbls[c].classList.toggle('left', !!a.left); lbls[c].classList.toggle('gap', !!a.gap); } });
    paintEdges();
  }
  function paintEdges(){
    if (!L) return; edges.textContent = '';
    const P = L.pos, nw = L.dims.nw, cw = L.dims.cw;
    const cls = n => { const st = nodeState(T, n); return st === 'owned' ? 'on' : (st === 'avail' || st === 'poor' || st === 'blocked' || st === 'future') ? 'open' : 'off'; };
    const add = (d, c) => sv('path', { class:'edge ' + c, d }, edges);
    if (kind === 'branch' || kind === 'systems') {
      T.cats.forEach(c => {
        const a = L.anchors[c], tr = L.dims.trunk[c], t1 = T.nodes.filter(n => n.cat === c && n.depth === 1);
        const any = t1.some(n => cls(n) !== 'off') ? 'open' : 'off', own = t1.some(n => cls(n) === 'on') ? 'on' : any;
        if (kind === 'branch') add(curveV(P[T.root.id], { x:a.x, y:a.y + 14 }), own);
        add('M' + a.x + ' ' + (a.y + (kind === 'branch' ? 14 : 0)) + 'V' + (a.y + 30) + 'H' + tr.x + 'V' + tr.bottom, own);
        t1.forEach(n => add('M' + tr.x + ' ' + P[n.id].y + 'H' + (P[n.id].x - nw / 2), cls(n)));
      });
      T.nodes.filter(n => n.depth > 1).forEach(n => { const p = P[n.parent], c = P[n.id]; add(L.dims.style === 'pill' ? 'M' + p.x + ' ' + (p.y + PILL_R) + 'V' + (c.y - PILL_R) : 'M' + (p.x - nw / 2 + 12) + ' ' + (p.y + CARD_H / 2) + 'V' + c.y + 'H' + (c.x - nw / 2), cls(n)); });
    } else if (kind === 'anatomy') {
      T.cats.forEach(c => { const a = L.anchors[c]; sv('circle', { class:'anchor', cx:a.x, cy:a.y, r:6 }, edges); });
      T.nodes.forEach(n => { const from = n.depth === 1 ? L.anchors[n.cat] : { x:P[n.parent].x + nw / 2, y:P[n.parent].y }; add(curveH(from, { x:P[n.id].x - nw / 2, y:P[n.id].y }), cls(n)); });
    } else if (kind === 'network' || kind === 'routeH') {
      T.nodes.forEach(n => { const from = n.depth === 1 ? { x:P[T.root.id].x + 30, y:P[T.root.id].y } : { x:P[n.parent].x + cw / 2, y:P[n.parent].y }; add(orthoH(from, { x:P[n.id].x - cw / 2, y:P[n.id].y }), cls(n)); });
    } else {
      T.nodes.forEach(n => { const from = n.depth === 1 ? P[T.root.id] : P[n.parent]; add(kind === 'route' ? curveV(from, P[n.id]) : 'M' + from.x + ' ' + from.y + 'L' + P[n.id].x + ' ' + P[n.id].y, cls(n)); });
    }
  }
  /* hover / focus → preview; click → buy (fake) */
  const nodeOf = id => id === T.root.id ? Object.assign({ root:true, chan:null }, T.root) : T.byId[id];
  el.addEventListener('pointerover', e => { const b = e.target.closest('.node'); if (b && opts.onPreview) opts.onPreview(nodeOf(b.dataset.node), T); });
  el.addEventListener('pointerleave', () => opts.onPreview && opts.onPreview(null));
  el.addEventListener('focusin', e => { const b = e.target.closest('.node'); if (b && opts.onPreview) opts.onPreview(nodeOf(b.dataset.node), T); });
  el.addEventListener('focusout', e => { if (!el.contains(e.relatedTarget)) opts.onPreview && opts.onPreview(null); });
  el.addEventListener('click', e => {
    const b = e.target.closest('.node'); if (!b) return; const n = nodeOf(b.dataset.node);
    if (n.root) { BM.toast(n.text); return; }
    const st = nodeState(T, n);
    if (st === 'owned') return BM.toast(n.name + ' is already part of ' + (board === 'terraform' ? 'the planet.' : 'your plant.'));
    if (st === 'locked') return BM.toast('Needs ' + T.byId[n.parent].name + ' first.');
    if (st === 'future') return BM.toast(n.name + ' is a later-tier placeholder: not purchasable in this mockup.');
    const res = BM.store.buy(n.id);
    if (!res.ok) return BM.toast(res.reason);
    BM.toast((board === 'terraform' ? 'The planet changes: ' : 'Your plant changes: ') + n.look.toLowerCase() + (res.opened.length ? '. ' + res.opened.map(id => BM.region(id).name).join(', ') + ' opens.' : '.'));
    if (opts.onBought) opts.onBought(n, res);
  });
  if (kind === 'network' || kind === 'routeH') el.style.minHeight = Math.round(T.total * 36 + 60) + 'px';
  const ro = new ResizeObserver(() => relayout()); ro.observe(el); if (kind === 'radial' || kind === 'anatomy') ro.observe(center);
  BM.store.on(e => { if (e.type !== 'gain') paintNodes(); });
  paintNodes(); requestAnimationFrame(relayout);
  return { el, center, T, relayout, focusNode:id => { const b = nodeEls[id]; if (b) b.focus(); }, nodeState:id => nodeState(T, T.byId[id]) };
}

/* ───────────────────────── planet disc (environment only) ───────────────────────── */
function mountDisc(host, big){
  const svg = sv('svg', { viewBox:'0 0 200 200', class:'disc' + (big ? ' big' : ''), role:'img', 'aria-label':'The planet (placeholder): sky temperature and rain' });
  const gid = 'pd' + Math.random().toString(36).slice(2, 7);
  const grad = sv('radialGradient', { id:gid, cx:'38%', cy:'35%', r:'72%' }, sv('defs', {}, svg));
  const s1 = sv('stop', { offset:0, 'stop-color':'#c9ecf9' }, grad), s2 = sv('stop', { offset:1, 'stop-color':'#4f94c9' }, grad);
  sv('circle', { cx:100, cy:100, r:92, fill:'url(#' + gid + ')' }, svg);
  const land = sv('g', {}, svg);
  [[70, 82, 28, 18], [122, 60, 20, 13], [132, 122, 30, 20], [68, 138, 18, 11], [100, 108, 14, 9]].forEach(([x, y, rx, ry]) => sv('ellipse', { cx:x, cy:y, rx, ry, fill:'#9fcf8a' }, land));
  const ice = sv('g', { opacity:0 }, svg); sv('ellipse', { cx:100, cy:16, rx:44, ry:11, fill:'#fff', opacity:.9 }, ice); sv('ellipse', { cx:100, cy:186, rx:40, ry:9, fill:'#fff', opacity:.9 }, ice);
  const cloud = sv('g', { opacity:0 }, svg); [[40, 70], [110, 40], [150, 110], [60, 150], [120, 160]].forEach(([x, y]) => { sv('ellipse', { cx:x, cy:y, rx:22, ry:8, fill:'#fff', opacity:.85 }, cloud); });
  const haze = sv('circle', { cx:100, cy:100, r:92, fill:'#f0cf86', opacity:0 }, svg);
  const glow = sv('circle', { cx:100, cy:100, r:92, fill:'none', stroke:'#ffb347', 'stroke-width':0, opacity:.7 }, svg);
  sv('circle', { cx:100, cy:100, r:92, fill:'none', stroke:'rgba(255,255,255,.65)', 'stroke-width':3 }, svg);
  sv('ellipse', { cx:100, cy:100, rx:120, ry:26, fill:'none', stroke:'rgba(47,58,44,.25)', 'stroke-width':2, transform:'rotate(-18 100 100)' }, svg);
  host.appendChild(svg);
  return { el:svg, update(sky, pv){
    const dt = sky.dt, dm = sky.dm;
    s1.setAttribute('stop-color', dt > 0 ? '#ffe3b3' : dt < 0 ? '#eaf2ff' : '#c9ecf9'); s2.setAttribute('stop-color', dt > 0 ? '#df8e52' : dt < 0 ? '#6b8fc7' : '#4f94c9');
    land.setAttribute('fill', dm > 0 ? '#7fbf6a' : dm < 0 ? '#c8b57a' : '#9fcf8a'); land.querySelectorAll('ellipse').forEach(e => e.setAttribute('fill', dm > 0 ? '#7fbf6a' : dm < 0 ? '#c8b57a' : '#9fcf8a'));
    ice.setAttribute('opacity', dt < 0 ? 1 : 0); cloud.setAttribute('opacity', dm > 0 ? 1 : 0); haze.setAttribute('opacity', dm < 0 ? .45 : 0);
    glow.setAttribute('stroke-width', pv ? 6 : 0); glow.setAttribute('stroke', dt > 0 ? '#ffb347' : dt < 0 ? '#7fb4ff' : dm > 0 ? '#5f87a8' : '#e8c27a');
    svg.classList.toggle('pv', !!pv);
  } };
}

/* ───────────────────────── fake spread routes (arcs) ───────────────────────── */
const NEIGH = { sunny:['fern', 'cloud', 'frost', 'dust', 'mossy'], fern:['marsh', 'cloud'], marsh:['mossy'], cloud:['frost'], dust:['ember', 'salt'], mossy:['salt', 'dust'] };
function arcsFor(id){
  const living = r => S.reg[r].colony === 'living';
  const out = [];
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
BM.ribbon(CFG.name);
const app = document.getElementById('app');
app.innerHTML =
  '<header class="hud h-' + CFG.hud + '" id="hud">' +
    '<div class="hud-l"><b>Eden</b><small>Fake planet · Dying World scenario</small></div>' +
    '<div class="hud-s" role="group" aria-label="Run status">' +
      '<div class="hs-state"><span class="dot" aria-hidden="true"></span><div><b>IN BLOOM</b><small id="hsCov"></small></div></div>' +
      '<div class="hs-bio biomass" id="bio"><span class="ico" aria-hidden="true"></span><div><span class="num">0</span><span class="rate"></span></div></div>' +
      '<div class="hs-meter"><small>Native pressure</small><div class="bar"><i id="hsPress"></i></div></div>' +
      '<div class="hs-meter"><small>Instability</small><div class="bar sky"><i id="hsInst"></i></div></div>' +
    '</div>' +
    '<nav class="hud-tools" id="tools" aria-label="Tools"></nav>' +
    '<div class="hud-clock" id="clock" role="group" aria-label="Pause and speed">' +
      '<button type="button" class="ck" id="ckPause" aria-pressed="false" aria-label="Pause">' + ico('pause') + '</button>' +
      '<button type="button" class="ck sp" id="ckSpeed" aria-label="Speed, 1 times. Press to cycle 1, 2, 4">1×</button>' +
    '</div>' +
  '</header>' +
  '<main class="planet" id="planet">' +
    '<nav class="cmd" id="cmd" aria-label="Tools" hidden></nav>' +
    '<div class="mapzone"><div class="mapwrap" id="mapwrap"></div>' +
      '<div class="lensbar" id="lensbar" hidden role="group" aria-label="Map View layer"></div>' +
      '<aside class="rsum" id="rsum" hidden></aside></div>' +
  '</main>' +
  '<div class="rooms s-' + CFG.shell + '" id="rooms" hidden></div>' +
  '<div class="sr-only" id="live" role="status" aria-live="polite"></div>';

/* tools: Explore (Regions, Map View) · Change (Adapt, Spread, Terraform) */
const toolsHTML =
  '<div class="tg"><small>Explore</small><div class="tt">' +
    '<button type="button" class="tool" data-tool="region" aria-pressed="false">' + ico('regions') + '<span class="tn">Regions</span></button>' +
    '<button type="button" class="tool" data-tool="mapview" aria-pressed="false" aria-expanded="false" aria-controls="lensbar">' + ico('mapview') + '<span class="tn">Map View</span></button>' +
  '</div></div>' +
  '<div class="tg"><small>Change</small><div class="tt">' +
    '<button type="button" class="tool plant" data-tool="adapt" aria-pressed="false">' + ico('adapt') + '<span class="tn">Adapt</span></button>' +
    '<button type="button" class="tool spread" data-tool="spread" aria-pressed="false">' + ico('spread') + '<span class="tn">Spread</span></button>' +
    '<button type="button" class="tool planet" data-tool="terraform" aria-pressed="false">' + ico('terraform') + '<span class="tn">Terraform</span></button>' +
  '</div></div>';
const toolHost = CFG.hud === 'strip' ? document.getElementById('cmd') : document.getElementById('tools');
toolHost.innerHTML = toolsHTML; toolHost.hidden = false;
toolHost.querySelectorAll('.tool').forEach(b => b.dataset.tip = b.querySelector('.tn').textContent);
if (CFG.hud === 'strip') { document.getElementById('tools').hidden = true; document.getElementById('cmd').appendChild(document.getElementById('rsum')); }

BM.bindBiomass(document.getElementById('bio'));
BM.store.on(() => {
  document.getElementById('hsCov').textContent = S.coverage + ' % of land · goal ' + S.goal + ' %';
  document.getElementById('hsPress').style.width = Math.round(S.pressure * 100) + '%';
  document.getElementById('hsInst').style.width = Math.round(S.instab * 100) + '%';
});
const live = m => { document.getElementById('live').textContent = m; };

/* clock */
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

/* main map (mounted once, never resized by exploration) */
const state = { sel:null, lens:null, room:null, wasPaused:false, opener:null };
const maps = [];
const mainMap = BM.mountMap(document.getElementById('mapwrap'), { labels:'all', bubbles:true, onSelect:id => { setSel(id, 'main'); }, onHover:null });
maps.push(mainMap);
window.map = mainMap;                       // QA hook, as in earlier concepts

/* lens bar (Map View) */
const LENSES = [['', 'Off', 'off'], ['temp', 'Temperature', 'temp'], ['water', 'Water', 'water'], ['soil', 'Soil', 'soil'], ['hazard', 'Hazard', 'hazard']];
const lensHTML = (cls) => LENSES.map(([id, name, ic]) => '<button type="button" class="lb ' + cls + '" data-lens="' + id + '" aria-pressed="' + (state.lens === (id || null)) + '">' + ico(ic) + '<span>' + esc(name) + '</span></button>').join('');
const lensbar = document.getElementById('lensbar');
lensbar.innerHTML = '<span class="lk">Map View</span>' + lensHTML('') + '<span class="ll" id="lensLegend"></span>';
function setLens(f){
  state.lens = f || null; maps.forEach(m => m.setLens(state.lens));
  document.querySelectorAll('[data-lens]').forEach(b => b.setAttribute('aria-pressed', (b.dataset.lens || null) === state.lens));
  document.querySelectorAll('[data-tool="mapview"]').forEach(b => b.setAttribute('aria-pressed', !!state.lens));
  document.getElementById('lensLegend').innerHTML = state.lens ? '<i class="sw ok"></i>OK <i class="sw warn"></i>Strained <i class="sw bad"></i>Blocked' : 'Colours show how each region treats your plant.';
  live(state.lens ? 'Map View: ' + BM.COND_META[state.lens].name : 'Map View off');
}
document.addEventListener('click', e => { const b = e.target.closest('[data-lens]'); if (b) setLens(b.dataset.lens); });

/* tools */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-tool]'); if (!b) return;
  const t = b.dataset.tool;
  if (t === 'mapview') { const open = lensbar.hidden; lensbar.hidden = !open; b.setAttribute('aria-expanded', open); if (open) lensbar.querySelector('[data-lens]').focus(); return; }
  openRoom(t, b);
});

/* region summary on the main map (lightweight) */
const rsum = document.getElementById('rsum');
function paintSummary(){
  if (!state.sel) { rsum.hidden = true; return; }
  const v = BM.view(state.sel), r = v.r;
  const help = v.fixers.slice(0, 2).map(it => '<button type="button" class="btn small ' + (it.board === 'terraform' ? 'planet' : it.board === 'spread' ? 'spread' : 'plant') + '" data-go="' + it.board + ':' + it.id + '">' + ico(ITEM_ICO[it.id]) + esc(it.name) + '</button>').join('');
  rsum.innerHTML = '<div class="rs-h">' + ico('inspect') + '<b>' + esc(r.name) + '</b>' + chip(v.st) + '</div>' +
    '<p>' + esc(v.estWord) + (v.limit ? ' · ' + esc(v.limit.text) : ' · Nothing holding the plant back') + '</p>' +
    '<div class="rs-a"><button type="button" class="btn small" data-tool="region">' + ico('regions') + 'Inspect</button>' + help + '</div>';
  rsum.hidden = false;
}
document.addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (!b) return; const [board, id] = b.dataset.go.split(':'); openRoom(board, b, id); });

/* selection is shared by the main map, every mini-map and every room */
function setSel(id, from){
  state.sel = id;
  maps.forEach(m => { if (m.selected !== id) m.select(id); });
  paintSummary();
  ROOM_IDS.forEach(k => rooms[k] && rooms[k].onSel && rooms[k].onSel());
  if (from === 'mini' && state.room) live('Considering ' + BM.region(id).name);
}

/* ───────────────────────── rooms ───────────────────────── */
const roomsEl = document.getElementById('rooms');
const rooms = {};
function roomShell(id){
  const R = ROOMS[id], c = CFG.rooms[id];
  const sec = document.createElement('section'); sec.className = 'room r-' + id + ' f-' + (c.focus || 'none') + (c.center ? ' c-' + c.center : '') + (c.dossier ? ' dossier' : ''); sec.dataset.room = id; sec.hidden = true;
  sec.setAttribute('aria-labelledby', 'rt-' + id);
  sec.innerHTML =
    '<header class="rh">' +
      '<button type="button" class="rb back" data-act="back">' + ico('back') + '<span>Planet</span></button>' +
      '<div class="rt"><span class="rk">' + esc(R.kicker) + '</span><h2 id="rt-' + id + '" tabindex="-1">' + esc(R.title) + '</h2><small>' + esc(R.verb) + '</small></div>' +
      '<nav class="rnav" aria-label="Rooms">' + ROOM_IDS.map(k => '<button type="button" class="rn ' + ROOMS[k].kind + '" data-room-go="' + k + '" aria-pressed="' + (k === id) + '">' + ico(ROOMS[k].ico) + '<span>' + esc(ROOMS[k].title) + '</span></button>').join('') + '</nav>' +
      '<div class="paused" role="status"><span class="pi">' + ico('pause') + '</span><span><b>PAUSED</b><small>strategy mode</small></span></div>' +
      '<button type="button" class="rb resume" data-act="resume">' + ico('play') + '<span>Resume play</span></button>' +
    '</header>' +
    '<div class="rz z-focus"></div><div class="rz z-main"></div><div class="rz z-map"></div>';
  roomsEl.appendChild(sec);
  return sec;
}
/* mini-map block shared by every room */
function mapBlock(id, host){
  host.innerHTML =
    '<div class="mm">' +
      '<div class="mm-h"><span class="mm-k">' + (id === 'region' ? 'Looking at' : 'Considering for') + '</span><b class="mm-name"></b><span class="mm-st"></span></div>' +
      '<div class="mm-map" aria-label="Smaller planet map"></div>' +
      '<p class="mm-peek">Hover a region to peek · click to switch</p>' +
      '<div class="mm-lens" role="group" aria-label="Map View layer">' + lensHTML('mini') + '</div>' +
      '<div class="mm-strip" role="group" aria-label="Switch region"></div>' +
      '<p class="mm-pv" aria-live="polite"></p>' +
    '</div>';
  const peek = host.querySelector('.mm-peek');
  const mini = BM.mountMap(host.querySelector('.mm-map'), { labels:'hover', bubbles:false, calm:true,
    onSelect:rid => setSel(rid, 'mini'),
    onHover:rid => { if (!rid) { peek.textContent = 'Hover a region to peek · click to switch'; peek.classList.remove('on'); return; } const v = BM.view(rid); peek.innerHTML = '<b>' + esc(v.r.name) + '</b> · ' + esc(v.estWord) + ' · ' + esc(v.limit ? BM.ST_WORD[v.st] + ': ' + v.limit.text : 'Nothing holding the plant back'); peek.classList.add('on'); } });
  maps.push(mini);
  const strip = host.querySelector('.mm-strip');
  strip.innerHTML = BM.REGIONS.map(r => '<button type="button" class="rc" data-r="' + r.id + '" aria-pressed="false"><i class="sd"></i>' + esc(r.name) + '</button>').join('');
  strip.addEventListener('click', e => { const b = e.target.closest('[data-r]'); if (b) setSel(b.dataset.r, 'mini'); });
  const paintStrip = () => { strip.querySelectorAll('[data-r]').forEach(b => { const v = BM.view(b.dataset.r); b.className = 'rc st-' + v.st + (S.reg[b.dataset.r].colony === 'living' ? ' living' : ''); b.setAttribute('aria-pressed', b.dataset.r === state.sel); }); };
  BM.store.on(e => { if (e.type !== 'gain' && e.type !== 'tick') paintStrip(); });
  const name = host.querySelector('.mm-name'), st = host.querySelector('.mm-st'), pv = host.querySelector('.mm-pv');
  return { mini, paint(){ const v = BM.view(state.sel); name.textContent = v.r.name; st.innerHTML = chip(v.st); paintStrip(); }, setText(t){ pv.innerHTML = t || ''; pv.classList.toggle('on', !!t); } };
}
/* specimen block (size by class) */
function specBlock(host, size, caption){
  const wrap = document.createElement('div'); wrap.className = 'specwrap ' + size; host.appendChild(wrap);
  const spec = BM.mountSpecimen(wrap, { compact:size === 'thumb' });
  if (caption) { const c = document.createElement('div'); c.className = 'spec-cap'; c.innerHTML = caption; wrap.appendChild(c); }
  return { wrap, spec, cap:wrap.querySelector('.spec-cap') };
}
const skyTemp = sky => (14 + sky.dt) + ' °C';
const rainWord = dm => dm > 0 ? 'Wetter than normal' : dm < 0 ? 'Drier than normal' : 'Normal rain';
/* environment panel for Terraform (sky / rain / instability + "plant unchanged" thumb) */
function envBlock(host, withThumb){
  const el = document.createElement('div'); el.className = 'env'; host.appendChild(el);
  el.innerHTML = '<div class="env-h">' + ico('planet') + '<b>Planet environment</b></div>' +
    '<div class="env-disc"></div>' +
    '<dl class="env-rows">' +
      '<div><dt>' + ico('temp') + 'Sky temperature</dt><dd><b class="e-t"></b><small class="e-tp"></small></dd></div>' +
      '<div><dt>' + ico('humid') + 'Rain</dt><dd><b class="e-r"></b><small class="e-rp"></small></dd></div>' +
      '<div><dt>' + ico('hazard') + 'Climate instability</dt><dd><div class="bar sky"><i class="e-i"></i><i class="e-ip"></i></div></dd></div>' +
    '</dl>' +
    (withThumb ? '<div class="env-plant"><div class="env-thumb"></div><div><b>Plant anatomy unchanged</b><small>Terraform changes the sky and ground. Your plant’s body stays as it is.</small></div></div>' : '');
  const disc = mountDisc(el.querySelector('.env-disc'));
  let thumb = null; if (withThumb) thumb = BM.mountSpecimen(el.querySelector('.env-thumb'), { compact:true });
  return { el, disc, thumb, update(pvId){
    const now = BM.skyNow(), nx = BM.skyNow(pvId);
    el.querySelector('.e-t').textContent = skyTemp(now); el.querySelector('.e-tp').textContent = pvId && nx.dt !== now.dt ? '→ ' + skyTemp(nx) : '';
    el.querySelector('.e-r').textContent = rainWord(now.dm); el.querySelector('.e-rp').textContent = pvId && nx.dm !== now.dm ? '→ ' + rainWord(nx.dm).toLowerCase() : '';
    el.querySelector('.e-i').style.width = Math.round(S.instab * 100) + '%'; el.querySelector('.e-ip').style.width = pvId && BM.item(pvId) ? Math.round(Math.min(1, S.instab + .22) * 100) + '%' : '0%';
    disc.update(nx, !!pvId); el.classList.toggle('pv', !!pvId);
    if (thumb) { thumb.render(BM.specState(state.sel, pvId ? { sky:pvId } : {}), !!pvId); thumb.highlight(pvId ? 'env' : null); }
  } };
}

/* ── Region Inspect ── */
function buildRegion(){
  const id = 'region', sec = roomShell(id), c = CFG.rooms[id];
  const zf = sec.querySelector('.z-focus'), zm = sec.querySelector('.z-main'), zmap = sec.querySelector('.z-map');
  const sp = specBlock(zf, c.focus === 'specimen-big' ? 'big' : c.focus === 'specimen-thumb' ? 'thumb' : 'medium', '<b class="sc-n"></b><small class="sc-w"></small>');
  const mm = mapBlock(id, zmap);
  const tabs = ['overview', 'colony', 'science'], TAB = { overview:['Overview', 'overview'], colony:['Colony', 'colony'], science:['Science', 'science'] };
  zm.innerHTML = '<div class="rg-head"><h3 class="rg-name"></h3><div class="rg-sub"></div></div>' +
    (c.dossier ? '' : '<div class="tabs" role="tablist" aria-label="Region details">' + tabs.map((t, k) => '<button type="button" role="tab" id="tab-' + t + '" aria-controls="pane-' + t + '" aria-selected="' + (k === 0) + '" tabindex="' + (k ? -1 : 0) + '">' + ico(TAB[t][1]) + TAB[t][0] + '</button>').join('') + '</div>') +
    tabs.map((t, k) => '<section class="pane' + (c.dossier ? ' sect' : '') + '" id="pane-' + t + '" role="' + (c.dossier ? 'region' : 'tabpanel') + '" aria-labelledby="tab-' + t + '"' + (!c.dossier && k ? ' hidden' : '') + '>' + (c.dossier ? '<h4 id="tab-' + t + '">' + ico(TAB[t][1]) + TAB[t][0] + '</h4>' : '') + '<div class="pb"></div></section>').join('');
  let cur = 'overview';
  if (!c.dossier) {
    const tb = [...zm.querySelectorAll('[role="tab"]')];
    const showTab = t => { cur = t; tb.forEach(b => { const on = b.id === 'tab-' + t; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; zm.querySelector('#pane-' + t.replace(/^/, '')).hidden = false; }); tabs.forEach(x => zm.querySelector('#pane-' + x).hidden = x !== t); };
    tb.forEach((b, k) => { b.addEventListener('click', () => showTab(b.id.slice(4))); b.addEventListener('keydown', e => { const d = { ArrowRight:1, ArrowLeft:-1 }[e.key]; if (d) { e.preventDefault(); const n = tb[(k + d + tb.length) % tb.length]; showTab(n.id.slice(4)); n.focus(); } }); });
  }
  function paint(){
    if (!state.sel) return;
    const v = BM.view(state.sel), r = v.r, rs = S.reg[r.id];
    sp.spec.highlight(null); sp.spec.render(BM.specState(r.id), false);
    sp.cap.querySelector('.sc-n').textContent = 'Your plant in ' + r.name; sp.cap.querySelector('.sc-w').textContent = rs.colony === 'living' ? v.estWord + (v.st !== 'ok' ? ' · stressed' : ' · thriving') : 'No colony yet' + (v.st === 'bad' ? ' · would not survive' : '');
    zm.querySelector('.rg-name').textContent = r.name;
    zm.querySelector('.rg-sub').innerHTML = chip(v.st) + '<span class="rg-w">' + esc(v.estWord) + '</span>' + (r.origin ? '<span class="rg-o">Origin</span>' : '');
    const conds = ['temp', 'water', 'soil', 'hazard'].map(f => { const cd = v.cond[f]; return '<div class="cond st-' + cd[0] + '">' + ico(f) + '<span class="cn">' + BM.COND_META[f].name + '</span>' + chip(cd[0]) + '<span class="ct">' + esc(cd[1]) + '</span></div>'; }).join('');
    const help = v.fixers.length ? '<div class="help"><small>Would help</small>' + v.fixers.map(it => '<button type="button" class="btn small ' + (it.board === 'terraform' ? 'planet' : it.board === 'spread' ? 'spread' : 'plant') + '" data-go="' + it.board + ':' + it.id + '">' + ico(ITEM_ICO[it.id]) + esc(it.name) + '<small>' + (it.board === 'terraform' ? 'Terraform' : it.board === 'spread' ? 'Spread' : 'Adapt') + '</small></button>').join('') + '</div>' : '';
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
    const f = e.target.closest('[data-focus]'); if (f) { if (!BM.store.setFocus(state.sel, f.dataset.focus)) BM.toast('Grow a colony here first.'); return; }
    const s = e.target.closest('[data-spec]'); if (s) { const res = BM.store.buySpec(state.sel, s.dataset.spec); if (!res.ok) BM.toast(res.reason); }
  });
  BM.store.on(e => { if (sec.hidden || e.type === 'gain') return; if (e.type === 'tick') { paint(); return; } paint(); });
  rooms[id] = { sec, mm, onSel:paint, onOpen:paint, focusFirst:() => sec.querySelector('h2').focus() };
}

/* ── Adapt / Spread / Terraform ── */
function buildBoard(id){
  const sec = roomShell(id), c = CFG.rooms[id], R = ROOMS[id];
  const zf = sec.querySelector('.z-focus'), zm = sec.querySelector('.z-main'), zmap = sec.querySelector('.z-map');
  const mm = mapBlock(id, zmap);
  let sp = null, env = null, disc = null, tree = null;
  const treeOpts = { onPreview:n => preview(n), onBought:(n, res) => { preview(null); if (res.opened.length) mm.mini.flash(res.opened); } };
  if (c.tree === 'systems') treeOpts.headerH = 104;
  if (c.center) treeOpts.hideRoot = true;
  tree = renderTree(zm, id, c.tree, treeOpts);
  /* what sits in the middle of a radial / left of an anatomy tree */
  if (c.center === 'specimen' || c.tree === 'anatomy') { sp = specBlock(tree.center, c.tree === 'anatomy' ? 'lab' : 'hero', '<b class="sc-n"></b><small class="sc-w"></small>'); }
  else if (c.center === 'scene') { sp = specBlock(tree.center, 'hero', '<b class="sc-n"></b><small class="sc-w">Sky and ground change. The plant does not.</small>'); const d = document.createElement('div'); d.className = 'scene-disc'; tree.center.appendChild(d); disc = mountDisc(d); }
  else if (c.center === 'planet') { const d = document.createElement('div'); d.className = 'center-disc'; tree.center.appendChild(d); disc = mountDisc(d, true); }
  else tree.center.hidden = true;
  if (c.tree === 'systems') {   // column headers with gauges
    const hdr = document.createElement('div'); hdr.className = 'sys-h'; tree.el.appendChild(hdr);
    hdr.innerHTML = TREES.terraform.cats.map(cat => '<div class="sys" data-cat="' + esc(cat) + '">' + ico(CAT_ICO[cat]) + '<div><small>' + esc(cat) + '</small><b class="g-v"></b><em class="g-p"></em></div></div>').join('');
    sec.paintSys = pvId => { const now = BM.skyNow(), nx = BM.skyNow(pvId); const vals = { 'Sky temperature':[skyTemp(now), skyTemp(nx)], Rain:[rainWord(now.dm), rainWord(nx.dm)], Ground:['Baseline', 'Baseline'], Air:['Thin', 'Thin'] };
      hdr.querySelectorAll('.sys').forEach(s => { const [a, b] = vals[s.dataset.cat]; s.querySelector('.g-v').textContent = a; s.querySelector('.g-p').textContent = pvId && a !== b ? '→ ' + b : ''; s.classList.toggle('pv', !!pvId && a !== b); }); };
  }
  /* focus zone */
  if (c.focus === 'specimen' || c.focus === 'specimen-thumb') { sp = sp || specBlock(zf, c.focus === 'specimen-thumb' ? 'thumb' : 'medium', '<b class="sc-n"></b><small class="sc-w"></small>'); const owned = document.createElement('div'); owned.className = 'owned'; zf.appendChild(owned); sec.ownedEl = owned; }
  if (c.focus === 'env') { env = envBlock(zf, true); }
  const chanWord = { temp:'stature and stem', water:'leaf shape', soil:'roots', hazard:'leaf pigment', spread:'flowers and seeds', env:'sky and ground' };
  function paintOwned(){
    if (!sec.ownedEl) return;
    const items = BM.ITEMS.filter(it => it.board !== 'terraform' && S.owned[it.id]);
    sec.ownedEl.innerHTML = '<small>' + (id === 'terraform' ? 'Your plant (unchanged here)' : 'Already part of your plant') + '</small>' + (items.length ? items.map(it => '<span class="ow">' + ico(ITEM_ICO[it.id]) + esc(it.name) + '</span>').join('') : '<span class="ow none">Nothing yet</span>');
  }
  function paintBase(){
    if (!state.sel) return;
    const v = BM.view(state.sel);
    if (sp) { sp.spec.highlight(null); sp.spec.render(BM.specState(state.sel, { showcase:id !== 'terraform' && CID === 12 }), false); sp.cap.querySelector('.sc-n').textContent = (id === 'terraform' ? 'Sky over ' : 'Your plant in ') + v.r.name; const w = sp.cap.querySelector('.sc-w'); if (id !== 'terraform') w.textContent = S.reg[state.sel].colony === 'living' ? v.estWord + (v.st !== 'ok' ? ' · stressed' : '') : (v.st === 'bad' ? 'Would not survive here yet' : 'No colony yet'); }
    if (env) env.update(null);
    if (disc) { disc.update(BM.skyNow(), false); const t = sec.querySelector('.d-t'); if (t) { t.textContent = skyTemp(BM.skyNow()); sec.querySelector('.d-r').textContent = rainWord(BM.skyNow().dm); } }
    if (sec.paintSys) sec.paintSys(null);
    mm.paint(); mm.setText(''); paintOwned();
  }
  function preview(n){
    if (!n) { mm.mini.setPreview(null); paintBase(); return; }
    if (n.root) { mm.setText('<b>' + esc(n.name) + '</b> · ' + esc(n.text)); return; }
    const isItem = !!n.item, pv = isItem ? BM.previewOf(n.id) : { open:[], worse:[] };
    const arcs = id === 'spread' ? arcsFor(n.id) : [];
    mm.mini.setPreview({ open:pv.open, worse:pv.worse, arcs, tint:id === 'terraform' && isItem ? n.id : null });
    if (id === 'terraform') {
      if (sp) { sp.spec.render(BM.specState(state.sel, isItem ? { sky:n.id } : {}), true); sp.spec.highlight('env'); }
      if (env) env.update(isItem ? n.id : null);
      if (disc) { disc.update(BM.skyNow(isItem ? n.id : undefined), true); const t = sec.querySelector('.d-t'); if (t) { const nx = BM.skyNow(isItem ? n.id : undefined); t.textContent = skyTemp(nx); sec.querySelector('.d-r').textContent = rainWord(nx.dm); } }
      if (sec.paintSys) sec.paintSys(isItem ? n.id : null);
    } else if (sp) {
      sp.spec.render(BM.specState(state.sel, isItem ? { addTrait:n.id, showcase:CID === 12 } : { showcase:CID === 12 }), true); sp.spec.highlight(n.chan);
    }
    const names = a => a.map(r => BM.region(r).name).join(', ');
    const txt = isItem ? BM.previewText(n.id) : '<em>Later-tier placeholder.</em> ' + esc(n.desc) + ' Would change ' + chanWord[n.chan] + '.' + (arcs.length ? ' Routes shown are illustrative.' : '');
    mm.setText('<b>' + esc(n.name) + '</b> · ' + (isItem ? esc(txt) : txt) + (isItem && (pv.open.length || pv.worse.length) ? '' : '') + ' <span class="pvw">' + (id === 'terraform' ? 'Changes the environment' : 'Changes ' + chanWord[n.chan]) + '</span>');
  }
  BM.store.on(e => { if (sec.hidden || e.type === 'gain') return; paintBase(); });
  rooms[id] = { sec, mm, tree, onSel:paintBase, onOpen:() => { paintBase(); requestAnimationFrame(tree.relayout); }, focusNode:nid => tree.focusNode(nid), focusFirst:() => sec.querySelector('h2').focus() };
}
buildRegion(); ['adapt', 'spread', 'terraform'].forEach(buildBoard);

/* ───────────────────────── room open / close (auto-pause) ───────────────────────── */
const planet = document.getElementById('planet'), hud = document.getElementById('hud');
function openRoom(id, opener, focusNode){
  if (!rooms[id]) return;
  if (!state.sel) setSel(BM.REGIONS.find(r => r.origin).id);
  const first = !state.room;
  if (first) {
    state.wasPaused = BM.clock.paused; state.opener = opener || null;
    if (!state.wasPaused) BM.clock.setPaused(true);                        // AUTO-PAUSE on entering a deep room
    roomsEl.hidden = false; document.body.classList.add('in-room');
    if (CFG.shell === 'chamber') { planet.setAttribute('inert', ''); hud.setAttribute('inert', ''); planet.setAttribute('aria-hidden', 'true'); hud.setAttribute('aria-hidden', 'true'); }
    else { planet.hidden = true; hud.hidden = true; }
  }
  if (state.room && state.room !== id) rooms[state.room].sec.hidden = true;
  state.room = id;
  const r = rooms[id]; r.sec.hidden = false; r.onOpen();
  document.querySelectorAll('[data-tool]').forEach(b => b.setAttribute('aria-pressed', b.dataset.tool === id));
  document.querySelectorAll('[data-room-go]').forEach(b => b.setAttribute('aria-pressed', b.dataset.roomGo === id));
  live(ROOMS[id].title + ' open. Game paused.');
  if (focusNode && r.focusNode) requestAnimationFrame(() => r.focusNode(focusNode)); else r.focusFirst();
}
function closeRoom(resume){
  if (!state.room) return;
  rooms[state.room].sec.hidden = true; state.room = null;
  roomsEl.hidden = true; document.body.classList.remove('in-room');
  planet.hidden = false; hud.hidden = false; planet.removeAttribute('inert'); hud.removeAttribute('inert'); planet.removeAttribute('aria-hidden'); hud.removeAttribute('aria-hidden');
  document.querySelectorAll('[data-tool]').forEach(b => b.setAttribute('aria-pressed', b.dataset.tool === 'mapview' ? !!state.lens : false));
  maps.forEach(m => m.setPreview(null));
  if (resume || !state.wasPaused) BM.clock.setPaused(false);              // Back = as it was; Resume play = running
  live('Back to Planet View' + (BM.clock.paused ? ', still paused' : ', running'));
  if (state.opener && document.contains(state.opener)) state.opener.focus(); else mainMap.focusRegion(state.sel);
}
roomsEl.addEventListener('click', e => {
  const a = e.target.closest('[data-act]'); if (a) { closeRoom(a.dataset.act === 'resume'); return; }
  const g = e.target.closest('[data-room-go]'); if (g) openRoom(g.dataset.roomGo, state.opener);
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && state.room) { e.preventDefault(); closeRoom(false); } });

/* deep links for review / QA: ?region=frost&room=adapt&lens=temp */
setSel(BM.region(q.get('region')) ? q.get('region') : BM.REGIONS.find(r => r.origin).id);
if (q.get('lens') && BM.COND_META[q.get('lens')]) { setLens(q.get('lens')); lensbar.hidden = false; document.querySelector('[data-tool="mapview"]').setAttribute('aria-expanded', 'true'); }
if (ROOM_IDS.includes(q.get('room'))) openRoom(q.get('room'), document.querySelector('[data-tool="' + q.get('room') + '"]'));

window.ROOMS22 = { state, open:openRoom, close:closeRoom, rooms, maps, setSel, setLens, CFG };   // QA hook
})();
