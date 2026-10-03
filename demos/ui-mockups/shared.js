/*
  BLOOM UI concept mockups (BLOOM-017) — shared mock utilities.

  VISUAL CONCEPT MOCKUPS ONLY. Everything here is FAKE: a hand-placed fake planet, fake regions, fake Biomass that ticks on a
  timer, fake trait effects (a region "opens" because a list says so), fake coverage. Nothing loads or calls the real engine
  (resources/bloom-sim.js), generator, validator, scenarios or Bloom Report, and nothing here is evidence that gameplay works
  this way. It exists so the owner and PMO can compare run-screen layouts and judge interaction feel.

  Exposes window.BM:
    BM.ribbon(name)                         mockup ribbon + "back to gallery" (every page)
    BM.REGIONS / BM.ITEMS / BM.item(id)     fake content
    BM.store                                fake run state + subscribe/tick/buy/setFocus/buySpec
    BM.view(regionId)                       region readout with fake purchases applied
    BM.previewOf(itemId)                    { open:[regionIds], worse:[regionIds] } for highlight
    BM.mountMap(container, opts)            SVG tile map (select / hover / preview / bubbles / labels)
    BM.mountSpecimen(container, opts)       SVG modular specimen (sky / plant / soil) with cross-fade
    BM.bindBiomass(el)                      live Biomass number + flashes
    BM.openLayer(el, opener) / closeLayer   panels/boards with Escape + focus return
    BM.toast(msg) / BM.floatAt(el, text, kind)
*/
(function(){
'use strict';
const BM = window.BM = {};
const reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
BM.reduceMotion = reduceMotion;

/* ───────────────────────── ribbon ───────────────────────── */
BM.ribbon = function(name){
  const r = document.createElement('div');
  r.className = 'mock-ribbon';
  r.setAttribute('role','note');
  r.innerHTML = '<a href="index.html" aria-label="Back to the mockup gallery">← Gallery</a>' +
    '<span class="tag">CONCEPT MOCKUP</span><span>' + name + '</span><span class="spacer"></span>' +
    '<span class="hint">Fake data · not connected to the game · not the production UI</span>';
  document.body.prepend(r);
};

/* ───────────────────────── fake content ───────────────────────── */
// cond: [status, short text]  status ∈ ok | warn | bad
BM.REGIONS = [
  { id:'sunny', name:'Sunny Shelf', terrain:'meadow', cx:15, cy:13, origin:true, colony:'living', est:.88, focus:'balanced', spec:'canopy',
    env:{ tempC:19, sky:'clear', soil:'loam' },
    cond:{ temp:['ok','Mild · 19 °C'], water:['ok','Just right'], soil:['ok','Rich loam'], hazard:['ok','Calm'] },
    limit:null, needs:[], worse:null,
    raw:{ 'Ground temp':'19 °C', 'Sky temp':'14 °C', 'Plant range':'4 – 30 °C', 'Moisture':'52 %', 'pH':'6.6', 'Salinity':'low', 'Nutrients':'high', 'Radiation':'0.4' } },
  { id:'fern', name:'Fern Hollow', terrain:'fern', cx:5.5, cy:10, colony:'living', est:.6, focus:'leaves', spec:null,
    env:{ tempC:16, sky:'clear', soil:'dry' },
    cond:{ temp:['ok','Cool · 16 °C'], water:['warn','A little dry'], soil:['ok','Loam'], hazard:['ok','Calm'] },
    limit:{ f:'water', text:'A little dry: the colony grows slowly' }, needs:['drought','humid'], worse:{ ids:['dry'], f:'water' },
    raw:{ 'Ground temp':'16 °C', 'Sky temp':'14 °C', 'Plant range':'4 – 30 °C', 'Moisture':'31 %', 'pH':'6.2', 'Salinity':'low', 'Nutrients':'medium', 'Radiation':'0.3' } },
  { id:'marsh', name:'Marsh Low', terrain:'marsh', cx:6, cy:20, colony:'living', est:.34, focus:'roots', spec:null,
    env:{ tempC:17, sky:'rain', soil:'wet' },
    cond:{ temp:['ok','Mild · 17 °C'], water:['warn','Soggy'], soil:['ok','Peat'], hazard:['ok','Calm'] },
    limit:{ f:'water', text:'Waterlogged: roots run short of air' }, needs:['flood','dry'], worse:{ ids:['humid','drought'], f:'water' },
    raw:{ 'Ground temp':'17 °C', 'Sky temp':'14 °C', 'Plant range':'4 – 30 °C', 'Moisture':'88 %', 'pH':'5.4', 'Salinity':'low', 'Nutrients':'medium', 'Radiation':'0.3' } },
  { id:'cloud', name:'Cloud Steps', terrain:'highland', cx:10, cy:4, colony:'living', est:.14, focus:'balanced', spec:null,
    env:{ tempC:5, sky:'snow', soil:'rocky' },
    cond:{ temp:['warn','Chilly · 5 °C'], water:['ok','Fine'], soil:['ok','Thin, stony'], hazard:['ok','Calm'] },
    limit:{ f:'temp', text:'Chilly: seedlings struggle to settle' }, needs:['cold','warm'], worse:{ ids:['cool'], f:'temp' },
    raw:{ 'Ground temp':'5 °C', 'Sky temp':'14 °C', 'Plant range':'4 – 30 °C', 'Moisture':'48 %', 'pH':'6.8', 'Salinity':'low', 'Nutrients':'low', 'Radiation':'0.5' } },
  { id:'frost', name:'Frost Ridge', terrain:'frost', cx:20.5, cy:3, colony:'barren', est:0, focus:'balanced', spec:null,
    env:{ tempC:-6, sky:'snow', soil:'rocky' },
    cond:{ temp:['bad','Too cold · −6 °C'], water:['ok','Frozen but fine'], soil:['ok','Gravel'], hazard:['ok','Calm'] },
    limit:{ f:'temp', text:'Too cold: below your plant’s range' }, needs:['cold','warm'], worse:{ ids:['cool'], f:'temp' },
    raw:{ 'Ground temp':'−6 °C', 'Sky temp':'14 °C', 'Plant range':'4 – 30 °C', 'Moisture':'40 %', 'pH':'7.0', 'Salinity':'low', 'Nutrients':'low', 'Radiation':'0.6' } },
  { id:'ember', name:'Ember Rise', terrain:'ember', cx:28, cy:6.5, colony:'barren', est:0, focus:'balanced', spec:null,
    env:{ tempC:33, sky:'ember', soil:'ash' },
    cond:{ temp:['warn','Hot · 33 °C'], water:['ok','Fine'], soil:['ok','Ash'], hazard:['bad','Radiation'] },
    limit:{ f:'hazard', text:'Radiation from the vents burns young leaves' }, needs:['rad'], worse:{ ids:['warm'], f:'temp' },
    raw:{ 'Ground temp':'33 °C', 'Sky temp':'14 °C', 'Plant range':'4 – 30 °C', 'Moisture':'35 %', 'pH':'5.9', 'Salinity':'low', 'Nutrients':'high', 'Radiation':'3.8' } },
  { id:'dust', name:'Dust Reach', terrain:'dust', cx:24.5, cy:14, colony:'barren', est:0, focus:'balanced', spec:null,
    env:{ tempC:27, sky:'haze', soil:'dry' },
    cond:{ temp:['ok','Warm · 27 °C'], water:['bad','Too dry'], soil:['ok','Sand'], hazard:['ok','Calm'] },
    limit:{ f:'water', text:'Too dry: no water for roots' }, needs:['drought','humid'], worse:{ ids:['dry','warm'], f:'water' },
    raw:{ 'Ground temp':'27 °C', 'Sky temp':'14 °C', 'Plant range':'4 – 30 °C', 'Moisture':'9 %', 'pH':'7.6', 'Salinity':'medium', 'Nutrients':'low', 'Radiation':'0.9' } },
  { id:'salt', name:'Salt Flats', terrain:'salt', cx:22.5, cy:22, colony:'barren', est:0, focus:'balanced', spec:null,
    env:{ tempC:22, sky:'clear', soil:'salty' },
    cond:{ temp:['ok','Warm · 22 °C'], water:['ok','Fine'], soil:['bad','Salty'], hazard:['ok','Calm'] },
    limit:{ f:'soil', text:'Salty soil burns the roots' }, needs:['salt'], worse:{ ids:['dry'], f:'soil' },
    raw:{ 'Ground temp':'22 °C', 'Sky temp':'14 °C', 'Plant range':'4 – 30 °C', 'Moisture':'44 %', 'pH':'8.4', 'Salinity':'very high', 'Nutrients':'low', 'Radiation':'0.5' } },
  { id:'mossy', name:'Mossy Basin', terrain:'meadow', cx:13, cy:21.5, colony:'living', est:.66, focus:'seeds', spec:'reserve',
    env:{ tempC:18, sky:'clear', soil:'loam' },
    cond:{ temp:['ok','Mild · 18 °C'], water:['ok','Damp'], soil:['ok','Loam'], hazard:['ok','Calm'] },
    limit:null, needs:[], worse:{ ids:['dry'], f:'water' },
    raw:{ 'Ground temp':'18 °C', 'Sky temp':'14 °C', 'Plant range':'4 – 30 °C', 'Moisture':'61 %', 'pH':'6.4', 'Salinity':'low', 'Nutrients':'high', 'Radiation':'0.3' } },
  { id:'tide', name:'Tide Isle', terrain:'island', cx:37, cy:19, colony:'barren', est:0, focus:'balanced', spec:null,
    env:{ tempC:20, sky:'clear', soil:'loam' },
    cond:{ temp:['ok','Mild · 20 °C'], water:['ok','Sea air'], soil:['ok','Sandy loam'], hazard:['ok','Calm'] },
    limit:{ f:'reach', text:'Across the water: your seeds can’t reach it' }, needs:['waterSeeds'], worse:null,
    raw:{ 'Ground temp':'20 °C', 'Sky temp':'14 °C', 'Plant range':'4 – 30 °C', 'Moisture':'58 %', 'pH':'7.1', 'Salinity':'medium', 'Nutrients':'medium', 'Radiation':'0.4' } },
];
BM.region = id => BM.REGIONS.find(r => r.id === id);

BM.ITEMS = [
  // Adapt: changes the PLANT
  { id:'cold', board:'adapt', cat:'Temperature', name:'Cold Tolerance', ico:'❄️', cost:120, desc:'Hardier, compact growth survives frost.', look:'Shorter, tighter plant · fuzzy leaves' },
  { id:'heat', board:'adapt', cat:'Temperature', name:'Heat Tolerance', ico:'🔥', cost:110, desc:'Silvery leaves reflect strong sun.', look:'Silver-green leaves' },
  { id:'drought', board:'adapt', cat:'Water', name:'Drought Adaptation', ico:'🌵', cost:140, desc:'Thick leaves store water.', look:'Plump leaves · deep taproot', excl:'flood' },
  { id:'flood', board:'adapt', cat:'Water', name:'Flood Adaptation', ico:'💧', cost:140, desc:'Air channels let roots breathe in wet soil.', look:'Long strap leaves · taller stem', excl:'drought' },
  { id:'salt', board:'adapt', cat:'Soil', name:'Salt Handling', ico:'🧂', cost:160, desc:'Pushes salt out through the leaves.', look:'Glossy leaves · salt crystals' },
  { id:'rad', board:'adapt', cat:'Hazard', name:'Radiation Shielding', ico:'🛡️', cost:180, desc:'Dark pigments protect the leaves.', look:'Deep purple pigment' },
  // Spread: how the plant travels (still the PLANT)
  { id:'seedOut', board:'spread', cat:'Seeds', name:'Seed Output', ico:'🌼', cost:80, desc:'More seeds from every colony.', look:'Seed puffs at the top' },
  { id:'waterSeeds', board:'spread', cat:'Seeds', name:'Waterborne Seeds', ico:'🥥', cost:150, desc:'Floating seeds cross the sea.', look:'Round floating pods' },
  { id:'earlyMat', board:'spread', cat:'Growth', name:'Early Maturity', ico:'🌸', cost:130, desc:'New colonies start seeding sooner.', look:'Flowers open early' },
  // Terraform: changes the PLANET (sky / weather / soil) — never the plant's body
  { id:'warm', board:'terraform', cat:'Temperature', name:'Warm the Sky', ico:'☀️', cost:200, desc:'The whole planet gets warmer.', look:'Warmer sky, more sun', sky:{ dt:+6 } },
  { id:'cool', board:'terraform', cat:'Temperature', name:'Cool the Sky', ico:'🌨️', cost:200, desc:'The whole planet gets cooler.', look:'Cooler sky, light snow', sky:{ dt:-6 } },
  { id:'humid', board:'terraform', cat:'Water', name:'Humidify', ico:'🌧️', cost:220, desc:'More rain everywhere.', look:'Clouds, rain, wetter soil', sky:{ dm:+1 }, excl:'dry' },
  { id:'dry', board:'terraform', cat:'Water', name:'Dry the Sky', ico:'🏜️', cost:220, desc:'Less rain everywhere.', look:'Hazy sky, cracked soil', sky:{ dm:-1 }, excl:'humid' },
];
BM.item = id => BM.ITEMS.find(i => i.id === id);
BM.BOARDS = {
  adapt:{ name:'Adapt', verb:'Change your plant', kind:'plant', ico:'🌿' },
  spread:{ name:'Spread', verb:'Reach new land', kind:'spread', ico:'🌱' },
  terraform:{ name:'Terraform', verb:'Change the planet', kind:'planet', ico:'🌍' },
};
BM.FOCUS = [
  { id:'balanced', name:'Balanced', ico:'⚖️', text:'Even growth. No bonus, no cost.' },
  { id:'roots', name:'Roots', ico:'🪴', text:'Holds ground and settles faster · −10 % Biomass' },
  { id:'leaves', name:'Leaves', ico:'🍃', text:'More Biomass from this colony · −40 % seeds' },
  { id:'seeds', name:'Seeds', ico:'🌾', text:'Spreads to neighbours faster · −30 % Biomass' },
];
BM.SPECS = [
  { id:'network', name:'Root Network', ico:'🕸️', text:'Colony holds on through bad spells.' },
  { id:'canopy', name:'Leaf Canopy', ico:'🌳', text:'Extra Biomass once established.' },
  { id:'reserve', name:'Seed Reserve', ico:'🫘', text:'Keeps seeding even when stressed.' },
];
BM.SPEC_COST = 90;
BM.COND_META = {
  temp:{ name:'Temperature', ico:'🌡️' }, water:{ name:'Water', ico:'💧' }, soil:{ name:'Soil', ico:'🟫' }, hazard:{ name:'Hazard', ico:'⚠️' },
  reach:{ name:'Reach', ico:'🌊' },
};
BM.ST_ICON = { ok:'✓', warn:'!', bad:'✕' };
BM.ST_WORD = { ok:'OK', warn:'Strained', bad:'Blocked' };
BM.stHTML = (st, word) => '<span class="st ' + st + '"><i aria-hidden="true">' + BM.ST_ICON[st] + '</i>' + (word || BM.ST_WORD[st]) + '</span>';
BM.estWord = est => est <= 0 ? 'No colony' : est < .2 ? 'Seedlings' : est < .45 ? 'Establishing' : est < .75 ? 'Established' : 'Dense';
BM.esc = s => String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));

/* ───────────────────────── fake world geometry (hand-placed, deterministic) ───────────────────────── */
const W = 40, H = 26, T = 10;
BM.MAP = { W, H, T };
const nz = (x, y) => Math.sin(x * .9 + y * .4) * .5 + Math.sin(x * .35 - y * .8 + 1.3) * .5;
const hash = (x, y, s) => { let h = (x * 374761393 + y * 668265263 + s * 982451653) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
const grid = new Array(W * H).fill(-1);       // region index or -1 water
(function build(){
  const isle = BM.REGIONS.findIndex(r => r.id === 'tide');
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const px = x + .5, py = y + .5;
    const e = ((px - 16.5) / 17.2) ** 2 + ((py - 12.8) / 13.4) ** 2 + nz(x, y) * .12;
    if (Math.hypot(px - 37, py - 19) + nz(x * 2, y * 2) * .5 < 2.7) { grid[y * W + x] = isle; continue; }
    if (e >= 1) continue;
    let best = -1, bd = 1e9;
    BM.REGIONS.forEach((r, i) => {
      if (i === isle) return;
      const d = Math.hypot(px - r.cx, py - r.cy) + nz(x * 1.3 + i * 5, y * 1.3 - i * 3) * 1.4;
      if (d < bd) { bd = d; best = i; }
    });
    grid[y * W + x] = best;
  }
  for (let pass = 0; pass < 3; pass++) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {   // tidy stray tiles
    const g = grid[y * W + x]; if (g < 0) continue;
    const n = [[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy]) => (x+dx<0||y+dy<0||x+dx>=W||y+dy>=H) ? -1 : grid[(y+dy)*W+x+dx]);
    if (n.filter(v => v === g).length <= 1) {
      const cnt = {}; n.forEach(v => { if (v >= 0) cnt[v] = (cnt[v] || 0) + 1; });
      const top = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0];
      if (top && top[1] >= 2) grid[y * W + x] = +top[0];
    }
  }
})();
const tilesOf = BM.REGIONS.map(() => []);
grid.forEach((g, i) => { if (g >= 0) tilesOf[g].push(i); });
const tileNd = new Float32Array(W * H);         // normalised distance from region centre (spread front)
BM.REGIONS.forEach((r, ri) => {
  let max = 0; const ds = tilesOf[ri].map(i => { const d = Math.hypot(i % W + .5 - r.cx, ((i / W) | 0) + .5 - r.cy); max = Math.max(max, d); return d; });
  tilesOf[ri].forEach((i, k) => tileNd[i] = ds[k] / (max || 1));
});
const LAND = grid.filter(g => g >= 0).length;

/* ───────────────────────── fake store ───────────────────────── */
const S = {
  biomass:260, income:0, coverage:0, goal:70, pressure:.38, instab:.12, t:0,
  owned:{ seedOut:true }, reg:{},
};
BM.REGIONS.forEach(r => S.reg[r.id] = { colony:r.colony, est:r.est, focus:r.focus, spec:r.spec });
const subs = [];
function emit(evt){ subs.forEach(f => { try { f(evt || {}); } catch (e) { console.error(e); } }); }
function densityOf(i){
  const g = grid[i]; if (g < 0) return 0;
  const rs = S.reg[BM.REGIONS[g].id]; if (rs.colony !== 'living') return 0;
  return Math.max(0, Math.min(1, rs.est * 1.3 - tileNd[i] * .8 + (hash(i % W, (i / W) | 0, 3) - .5) * .25 + .12));
}
function recompute(){
  let living = 0; for (let i = 0; i < grid.length; i++) if (densityOf(i) > .15) living++;
  S.coverage = Math.round(living / LAND * 1000) / 10;
  let inc = .6;
  BM.REGIONS.forEach(r => { const rs = S.reg[r.id]; if (rs.colony !== 'living') return;
    const m = { balanced:1, roots:.9, leaves:1.45, seeds:.7 }[rs.focus];
    inc += rs.est * 1.2 * m + (rs.spec === 'canopy' ? .35 * rs.est : 0); });
  S.income = Math.round(inc * 10) / 10;
}
recompute();
BM.store = {
  s:S,
  on(fn){ subs.push(fn); fn({ type:'init' }); },
  owned:id => !!S.owned[id],
  blockedBy(id){ const it = BM.item(id); return it && it.excl && S.owned[it.excl] ? BM.item(it.excl) : null; },
  canBuy(id){ const it = BM.item(id); return it && !S.owned[id] && !this.blockedBy(id) && S.biomass >= it.cost; },
  buy(id){
    const it = BM.item(id);
    if (!it || S.owned[id]) return { ok:false, reason:'owned' };
    if (this.blockedBy(id)) return { ok:false, reason:'Your plant can only follow one ' + it.cat.toLowerCase() + ' path (' + this.blockedBy(id).name + ').' };
    if (S.biomass < it.cost) return { ok:false, reason:'Need ' + Math.ceil(it.cost - S.biomass) + ' more Biomass.' };
    S.biomass -= it.cost; S.owned[id] = true;
    const opened = [];
    BM.REGIONS.forEach(r => { if (r.needs.includes(id) && S.reg[r.id].colony === 'barren') { S.reg[r.id].colony = 'living'; S.reg[r.id].est = .04; opened.push(r.id); } });
    if (it.board === 'terraform') S.instab = Math.min(1, S.instab + .22);
    recompute(); emit({ type:'buy', id, cost:it.cost, opened });
    return { ok:true, opened };
  },
  setFocus(rid, f){ const rs = S.reg[rid]; if (rs.colony !== 'living') return false; rs.focus = f; recompute(); emit({ type:'focus', rid }); return true; },
  buySpec(rid, spec){
    const rs = S.reg[rid];
    if (rs.colony !== 'living') return { ok:false, reason:'Grow a colony here first.' };
    if (rs.spec) return { ok:false, reason:'This colony already has its local upgrade.' };
    if (S.biomass < BM.SPEC_COST) return { ok:false, reason:'Need ' + Math.ceil(BM.SPEC_COST - S.biomass) + ' more Biomass.' };
    S.biomass -= BM.SPEC_COST; rs.spec = spec; recompute(); emit({ type:'spec', rid, cost:BM.SPEC_COST }); return { ok:true };
  },
  collect(n){ S.biomass += n; emit({ type:'gain', n }); },
  density:densityOf,
};
setInterval(() => {                               // fake clock: Biomass ticks, new colonies thicken, pressure creeps
  S.t++; S.biomass += S.income;
  BM.REGIONS.forEach(r => { const rs = S.reg[r.id]; if (rs.colony === 'living' && rs.est < .9) rs.est = Math.min(.9, rs.est + (rs.est < .5 ? .012 : .003) * (rs.focus === 'roots' ? 1.4 : 1)); });
  S.pressure = Math.min(.92, S.pressure + .0015); S.instab = Math.max(.08, S.instab - .004);
  recompute(); emit({ type:'tick' });
}, 1000);

/* region readout with fake purchases applied */
BM.view = function(rid){
  const r = BM.region(rid), rs = S.reg[rid];
  const cond = {}; Object.keys(r.cond).forEach(k => cond[k] = r.cond[k].slice());
  let limit = r.limit ? Object.assign({}, r.limit) : null;
  const fixer = r.needs.find(id => S.owned[id]);
  if (limit && fixer) { if (cond[limit.f]) cond[limit.f] = ['ok', 'Handled by ' + BM.item(fixer).name]; limit = null; }
  let worsened = null;
  if (r.worse) { const w = r.worse.ids.find(id => S.owned[id]); if (w) { worsened = BM.item(w); const c = cond[r.worse.f]; c[0] = c[0] === 'ok' ? 'warn' : 'bad'; c[1] = 'Worse since ' + worsened.name; if (!limit) limit = { f:r.worse.f, text:worsened.name + ' made this region harder' }; } }
  const st = !limit ? 'ok' : (limit.f === 'reach' ? 'bad' : (cond[limit.f] ? cond[limit.f][0] : 'bad'));
  const fixers = r.needs.filter(id => !S.owned[id]).map(BM.item);
  return { r, rs, cond, limit, st, fixers, worsened, opened:!!fixer, estWord:BM.estWord(rs.colony === 'living' ? rs.est : 0) };
};
BM.previewOf = function(id){
  const open = [], worse = [];
  BM.REGIONS.forEach(r => {
    if (r.needs.includes(id) && !r.needs.some(n => S.owned[n]) && (r.limit)) open.push(r.id);
    if (r.worse && r.worse.ids.includes(id)) worse.push(r.id);
  });
  return { open, worse };
};
BM.skyNow = function(extra){
  let dt = 0, dm = 0;
  BM.ITEMS.forEach(it => { if (it.sky && (S.owned[it.id] || it.id === extra)) { dt += it.sky.dt || 0; dm += it.sky.dm || 0; } });
  return { dt, dm };
};

/* ───────────────────────── helpers: biomass / floaters / toasts / layers ───────────────────────── */
BM.fmt = n => Math.floor(n).toLocaleString('en-US');
BM.bindBiomass = function(el){
  const num = el.querySelector('.num'), rate = el.querySelector('.rate');
  BM.store.on(e => {
    num.textContent = BM.fmt(S.biomass);
    if (rate) rate.textContent = '+' + S.income.toFixed(1) + ' / s';
    if (e.type === 'buy' || e.type === 'spec') { el.classList.remove('flash-spend'); void el.offsetWidth; el.classList.add('flash-spend'); BM.floatAt(el, '−' + e.cost, 'spend'); }
    if (e.type === 'gain') { el.classList.remove('flash-gain'); void el.offsetWidth; el.classList.add('flash-gain'); BM.floatAt(el, '+' + e.n, 'gain'); }
  });
};
BM.floatAt = function(el, text, kind){
  const f = document.createElement('span'); f.className = 'floater ' + (kind || 'gain'); f.textContent = text;
  const host = el; if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
  f.style.left = '40%'; f.style.top = '-6px'; host.appendChild(f); setTimeout(() => f.remove(), 1200);
};
BM.toast = function(msg){
  let box = document.querySelector('.toasts');
  if (!box) { box = document.createElement('div'); box.className = 'toasts'; box.setAttribute('role','status'); box.setAttribute('aria-live','polite'); document.body.appendChild(box); }
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; box.appendChild(t); setTimeout(() => t.remove(), 3200);
};
const layerStack = [];
BM.openLayer = function(el, opener, opts){
  if (layerStack.some(l => l.el === el)) return;
  el.hidden = false; void el.offsetWidth; el.classList.add('open');
  layerStack.push({ el, opener: opener || document.activeElement, opts: opts || {} });
  const f = el.querySelector('[data-autofocus]') || el.querySelector('button, [href], [tabindex]:not([tabindex="-1"])');
  if (f && !(opts && opts.noFocus)) setTimeout(() => f.focus({ preventScroll:true }), 30);
};
BM.closeLayer = function(el, opts){
  const k = layerStack.findIndex(l => l.el === el); if (k < 0) return;
  const [l] = layerStack.splice(k, 1);
  el.classList.remove('open');
  setTimeout(() => { if (!el.classList.contains('open')) el.hidden = true; }, reduceMotion ? 0 : 320);
  if (l.opts.onClose) l.opts.onClose();
  if (!(opts && opts.noReturn) && l.opener && l.opener.focus && document.contains(l.opener)) l.opener.focus({ preventScroll:true });
};
BM.isOpen = el => layerStack.some(l => l.el === el);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && layerStack.length) { e.preventDefault(); BM.closeLayer(layerStack[layerStack.length - 1].el); } });


/* ───────────────────────── trait cards (shared by every concept) ───────────────────────── */
// opts: { compact, groups (default true), onPreview(id|null), onBought(id, res) }
BM.renderCards = function(container, board, opts){
  opts = Object.assign({ groups:true, compact:false }, opts || {});
  const kind = BM.BOARDS[board].kind;
  const items = BM.ITEMS.filter(i => i.board === board);
  const cats = [...new Set(items.map(i => i.cat))];
  container.innerHTML = cats.map(c => (opts.groups ? '<h3 class="cards-cat">' + c + '</h3>' : '') +
    '<div class="cards-grid' + (opts.compact ? ' compact' : '') + '">' + items.filter(i => i.cat === c).map(i =>
      '<button type="button" class="tcard" data-id="' + i.id + '" data-kind="' + kind + '">' +
        '<span class="t-top"><span class="t-ico" aria-hidden="true">' + i.ico + '</span><h4>' + i.name + '</h4></span>' +
        (opts.compact ? '' : '<p>' + i.desc + '</p>') +
        '<span class="cost"></span></button>').join('') + '</div>').join('');
  const btns = [...container.querySelectorAll('.tcard')];
  function refresh(){
    btns.forEach(b => {
      const it = BM.item(b.dataset.id), own = BM.store.owned(it.id), blk = BM.store.blockedBy(it.id), poor = !own && BM.store.s.biomass < it.cost;
      b.classList.toggle('owned', own); b.classList.toggle('poor', poor && !blk); b.classList.toggle('blocked', !!blk);
      b.setAttribute('aria-disabled', own || blk ? 'true' : 'false');
      const c = b.querySelector('.cost');
      const html = own ? '✓ Owned' : blk ? '<span class="tiny">Not with ' + blk.name + '</span>' : '● ' + it.cost + (poor ? ' <span class="tiny">need ' + Math.ceil(it.cost - BM.store.s.biomass) + ' more</span>' : '');
      if (c.innerHTML !== html) c.innerHTML = html;
      b.setAttribute('aria-label', it.name + '. ' + it.desc + ' ' + (own ? 'Owned.' : blk ? 'Not available with ' + blk.name + '.' : 'Costs ' + it.cost + ' Biomass.') + ' Looks like: ' + it.look + '.');
    });
  }
  let pv = null;
  const setPv = id => { if (id === pv) return; pv = id; opts.onPreview && opts.onPreview(id); };
  btns.forEach(b => {
    b.addEventListener('pointerenter', () => setPv(b.dataset.id));
    b.addEventListener('pointerleave', () => setPv(null));
    b.addEventListener('focus', () => setPv(b.dataset.id));
    b.addEventListener('blur', () => setPv(null));
    b.addEventListener('click', () => {
      const id = b.dataset.id; if (BM.store.owned(id)) return;
      const res = BM.store.buy(id);
      if (!res.ok) { BM.toast(res.reason); if (!BM.reduceMotion) b.animate([{ transform:'translateX(0)' }, { transform:'translateX(-6px)' }, { transform:'translateX(6px)' }, { transform:'translateX(0)' }], { duration:260 }); return; }
      b.classList.remove('just'); void b.offsetWidth; b.classList.add('just');
      const it = BM.item(id);
      BM.toast(it.ico + ' ' + it.name + (res.opened.length ? ': ' + res.opened.map(r => BM.region(r).name).join(', ') + ' can now be colonized!' : ' bought.'));
      pv = null; opts.onBought && opts.onBought(id, res); opts.onPreview && opts.onPreview(null);
    });
  });
  BM.store.on(refresh);
  return { refresh, focusCard:id => { const b = btns.find(x => x.dataset.id === id); if (b) { b.focus(); b.scrollIntoView({ block:'nearest' }); } } };
};
/* one-line preview sentence for a purchase */
BM.previewText = function(id){
  const it = BM.item(id), p = BM.previewOf(id);
  const names = a => a.map(r => BM.region(r).name).join(', ');
  return (it.board === 'terraform' ? 'Changes the planet: ' : 'Changes your plant: ') + it.look.toLowerCase() + '. ' +
    (p.open.length ? 'Opens ' + names(p.open) + '. ' : '') + (p.worse.length ? 'Makes ' + names(p.worse) + ' harder. ' : '') +
    (!p.open.length && !p.worse.length ? 'No region changes right away.' : '');
};

/* ───────────────────────── map ───────────────────────── */
const NS = 'http://www.w3.org/2000/svg';
const sv = (tag, attrs, parent) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (parent) parent.appendChild(n); return n; };
BM.sv = sv;
const TERRAIN = { meadow:'#c4dc95', fern:'#b3d593', marsh:'#9fcdb6', frost:'#e6eef4', highland:'#d6cdb8', dust:'#efd69c', salt:'#f3ece0', ember:'#e2ab8a', island:'#cfe0a0' };
BM.TERRAIN = TERRAIN;
const hex = h => [1,3,5].map(k => parseInt(h.slice(k, k + 2), 16));
const mix = (a, b, t) => { const A = hex(a), B = hex(b); return '#' + A.map((v, k) => Math.max(0, Math.min(255, Math.round(v + (B[k] - v) * t))).toString(16).padStart(2, '0')).join(''); };
function outlinePath(pred){
  let d = '';
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!pred(grid[y * W + x])) continue;
    const X = x * T, Y = y * T;
    const nb = (dx, dy) => (x+dx<0||y+dy<0||x+dx>=W||y+dy>=H) ? false : pred(grid[(y+dy)*W+x+dx]);
    if (!nb(0,-1)) d += 'M' + X + ' ' + Y + 'h' + T;
    if (!nb(0, 1)) d += 'M' + X + ' ' + (Y+T) + 'h' + T;
    if (!nb(-1,0)) d += 'M' + X + ' ' + Y + 'v' + T;
    if (!nb(1, 0)) d += 'M' + (X+T) + ' ' + Y + 'v' + T;
  }
  return d;
}
function areaPath(ri){ let d = ''; tilesOf[ri].forEach(i => { d += 'M' + (i % W) * T + ' ' + ((i / W) | 0) * T + 'h' + T + 'v' + T + 'h-' + T + 'z'; }); return d; }

BM.mountMap = function(container, opts){
  opts = Object.assign({ labels:'all', bubbles:true, calm:false, onSelect:null, onHover:null }, opts || {});
  const svg = sv('svg', { class:'bm-map', viewBox:'-6 -6 ' + (W * T + 12) + ' ' + (H * T + 12), preserveAspectRatio:'xMidYMid meet', role:'group', 'aria-label':'Planet map (fake). Tab to a region and press Enter to select it.' });
  const defs = sv('defs', {}, svg);
  const pat = sv('pattern', { id:'bmHatch', width:5, height:5, patternUnits:'userSpaceOnUse', patternTransform:'rotate(45)' }, defs);
  sv('rect', { width:5, height:5, fill:'rgba(196,70,106,.18)' }, pat); sv('line', { x1:0, y1:0, x2:0, y2:5, stroke:'rgba(168,61,90,.75)', 'stroke-width':1.6 }, pat);
  const wave = sv('pattern', { id:'bmWave', width:24, height:12, patternUnits:'userSpaceOnUse' }, defs);
  sv('path', { d:'M0 8 q6 -4 12 0 t12 0', fill:'none', stroke:'rgba(255,255,255,.35)', 'stroke-width':1 }, wave);
  sv('rect', { x:-6, y:-6, width:W * T + 12, height:H * T + 12, fill: opts.calm ? '#a9d6ee' : '#9fd0ec', rx:14 }, svg);
  sv('rect', { x:-6, y:-6, width:W * T + 12, height:H * T + 12, fill:'url(#bmWave)', rx:14 }, svg);
  const land = sv('g', {}, svg);
  const tileEls = new Array(W * H), dotEls = new Array(W * H), rgEls = {};
  BM.REGIONS.forEach((r, ri) => {
    const g = sv('g', { class:'rg', 'data-r':r.id, tabindex:0, role:'button' }, land);
    rgEls[r.id] = g;
    tilesOf[ri].forEach(i => {
      const x = i % W, y = (i / W) | 0;
      tileEls[i] = sv('rect', { x:x * T, y:y * T, width:T + .4, height:T + .4 }, g);
    });
    tilesOf[ri].forEach(i => {
      const x = i % W, y = (i / W) | 0;
      dotEls[i] = sv('circle', { cx:x * T + 3 + hash(x, y, 9) * 4, cy:y * T + 3 + hash(x, y, 11) * 4, r:0, fill:'#2a7636', opacity:.5, 'pointer-events':'none' }, g);
    });
  });
  sv('path', { d:outlinePath(g => g >= 0), fill:'none', stroke:'rgba(47,58,44,.55)', 'stroke-width':1.3, 'stroke-linecap':'round' }, svg);
  const borders = BM.REGIONS.map((r, ri) => outlinePath(g => g === ri)).join('');
  sv('path', { d:borders, fill:'none', stroke: opts.calm ? 'rgba(47,58,44,.16)' : 'rgba(47,58,44,.3)', 'stroke-width':.7, 'stroke-linecap':'round', 'pointer-events':'none' }, svg);
  const tint = sv('rect', { class:'tint', x:-6, y:-6, width:W * T + 12, height:H * T + 12, fill:'transparent', opacity:0, rx:14 }, svg);
  const over = sv('g', {}, svg);
  const pvG = sv('g', {}, over), hovO = sv('path', { class:'hover-o', d:'', 'stroke-linecap':'round' }, over);
  const selO = sv('path', { class:'sel-o', d:'', 'stroke-linecap':'round' }, over), selO2 = sv('path', { class:'sel-o2', d:'', 'stroke-linecap':'round' }, over);
  const lblG = sv('g', {}, svg), bubG = sv('g', {}, svg);
  const outl = {}; BM.REGIONS.forEach((r, ri) => outl[r.id] = outlinePath(g => g === ri));
  const lbls = {};
  BM.REGIONS.forEach(r => {
    const g = sv('g', { class:'lbl' + (opts.labels === 'all' ? ' show' : ' hide') }, lblG);
    const w = r.name.length * 3.55 + 16;
    sv('rect', { x:r.cx * T - w / 2, y:r.cy * T - 6, width:w, height:12, rx:6 }, g);
    const st = sv('text', { x:r.cx * T - w / 2 + 6.5, y:r.cy * T + 2.3, 'font-size':6.4 }, g);
    const tx = sv('text', { x:r.cx * T - w / 2 + 13, y:r.cy * T + 2.3 }, g); tx.textContent = r.name;
    lbls[r.id] = { g, st };
  });
  container.appendChild(svg);

  let sel = null, hov = null, lens = null;
  const LENS = { ok:'#9fd18a', warn:'#f3c46b', bad:'#e98fa6' };
  function paint(){
    const vm = {}; BM.REGIONS.forEach(r => vm[r.id] = BM.view(r.id));
    for (let i = 0; i < grid.length; i++) {
      if (grid[i] < 0) continue;
      const r = BM.REGIONS[grid[i]], d = densityOf(i);
      if (lens) { const c = vm[r.id].cond[lens]; tileEls[i].setAttribute('fill', mix(LENS[c[0]], '#ffffff', (hash(i % W, (i / W) | 0, 5) - .5) * .1)); dotEls[i].setAttribute('r', c[0] === 'bad' && hash(i % W, (i / W) | 0, 2) > .55 ? 1.2 : 0); dotEls[i].setAttribute('fill', '#8f2846'); continue; }
      dotEls[i].setAttribute('fill', '#2a7636');
      const base = mix(TERRAIN[r.terrain], '#ffffff', (hash(i % W, (i / W) | 0, 5) - .5) * .12 + .04);
      const green = mix('#a6d36f', '#2f8a3e', Math.min(1, d * 1.1));
      tileEls[i].setAttribute('fill', d > .02 ? mix(base, green, Math.min(.92, .35 + d * .6)) : base);
      dotEls[i].setAttribute('r', d > .5 ? (1.3 + d * 1.6).toFixed(2) : 0);
    }
    BM.REGIONS.forEach(r => {
      const v = vm[r.id];
      const word = r.colony === 'living' || S.reg[r.id].colony === 'living' ? v.estWord : 'No colony';
      rgEls[r.id].setAttribute('aria-label', r.name + '. ' + word + '. ' + (v.limit ? BM.ST_WORD[v.st] + ': ' + v.limit.text : 'Nothing holding the plant back.'));
      rgEls[r.id].setAttribute('aria-pressed', sel === r.id ? 'true' : 'false');
      const L = lbls[r.id]; L.st.textContent = BM.ST_ICON[v.st];
      L.st.setAttribute('fill', { ok:'#2a7636', warn:'#b56d00', bad:'#a83d5a' }[v.st]);
    });
  }
  function showLabel(id, on){ if (opts.labels === 'all') return; const L = lbls[id]; if (!L) return; L.g.classList.toggle('show', on); L.g.classList.toggle('hide', !on); }
  function setHover(id){
    if (hov && hov !== sel) showLabel(hov, false);
    hov = id; hovO.setAttribute('d', id ? outl[id] : '');
    if (id) showLabel(id, true);
    if (opts.onHover) opts.onHover(id);
  }
  function select(id, fromUser){
    if (sel && sel !== id) showLabel(sel, false);
    sel = id;
    selO.setAttribute('d', id ? outl[id] : ''); selO2.setAttribute('d', id ? outl[id] : '');
    if (id) showLabel(id, true);
    paint();
    if (fromUser && opts.onSelect) opts.onSelect(id);
  }
  land.addEventListener('click', e => { const g = e.target.closest('.rg'); if (g) select(g.dataset.r, true); });
  land.addEventListener('keydown', e => { const g = e.target.closest('.rg'); if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); select(g.dataset.r, true); } });
  land.addEventListener('pointerover', e => { const g = e.target.closest('.rg'); if (g && g.dataset.r !== hov) setHover(g.dataset.r); });
  land.addEventListener('pointerleave', () => setHover(null));
  land.addEventListener('focusin', e => { const g = e.target.closest('.rg'); if (g) setHover(g.dataset.r); });
  land.addEventListener('focusout', () => setHover(null));

  function setPreview(p){
    pvG.textContent = '';
    p = p || {};
    (p.open || []).forEach(id => { sv('path', { class:'pv-open', d:areaPath(BM.REGIONS.findIndex(r => r.id === id)) }, pvG); badge(id, '+', '#2a7636'); });
    (p.worse || []).forEach(id => { sv('path', { class:'pv-worse', d:areaPath(BM.REGIONS.findIndex(r => r.id === id)) }, pvG); badge(id, '−', '#a83d5a'); });
    (p.arcs || []).forEach(([a, b]) => { const A = BM.region(a), B = BM.region(b); const mx = (A.cx + B.cx) / 2 * T, my = Math.min(A.cy, B.cy) * T - 30;
      sv('path', { class:'seedarc', d:'M' + A.cx * T + ' ' + A.cy * T + ' Q' + mx + ' ' + my + ' ' + B.cx * T + ' ' + B.cy * T }, pvG); });
    const tints = { warm:'#ffb347', cool:'#7fb4ff', humid:'#5f87a8', dry:'#e8c27a' };
    tint.setAttribute('fill', p.tint ? tints[p.tint] : 'transparent'); tint.setAttribute('opacity', p.tint ? .22 : 0);
  }
  function badge(id, ch, col){ const r = BM.region(id); const g = sv('g', { class:'pv-badge' }, pvG); sv('circle', { cx:r.cx * T, cy:r.cy * T - 13, r:6, fill:col }, g); const t = sv('text', { x:r.cx * T, y:r.cy * T - 13 }, g); t.textContent = ch; }
  function flash(ids){ ids.forEach(id => { const p = sv('path', { class:'pv-flash', d:areaPath(BM.REGIONS.findIndex(r => r.id === id)) }, pvG); setTimeout(() => p.remove(), 1500); }); }

  // fake Biomass bubbles (click/Enter to collect)
  function spawnBubble(){
    if (!opts.bubbles || bubG.childNodes.length >= 2 || document.hidden) return;
    const cands = []; for (let i = 0; i < grid.length; i++) if (densityOf(i) > .45) cands.push(i);
    if (!cands.length) return;
    const i = cands[Math.floor(Math.random() * cands.length)], x = (i % W) * T + 5, y = ((i / W) | 0) * T + 5;
    const g = sv('g', { tabindex:0, role:'button', 'aria-label':'Collect 25 Biomass', style:'cursor:pointer' }, bubG);
    sv('circle', { cx:x, cy:y, r:7.5, fill:'#f2b324', stroke:'#fff', 'stroke-width':1.6 }, g);
    const t = sv('text', { x, y:y + 2.6, 'text-anchor':'middle', 'font-size':8, 'font-weight':900, fill:'#5a3c00', 'pointer-events':'none' }, g); t.textContent = '+';
    if (!reduceMotion) g.animate([{ transform:'translateY(0)' }, { transform:'translateY(-2px)' }, { transform:'translateY(0)' }], { duration:1400, iterations:Infinity });
    const take = () => { BM.store.collect(25); g.remove(); };
    g.addEventListener('click', take); g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); take(); } });
    setTimeout(() => g.remove(), 9000);
  }
  setInterval(spawnBubble, 6000); setTimeout(spawnBubble, 1500);

  BM.store.on(e => { if (e.type !== 'gain') paint(); if (e.type === 'buy' && e.opened && e.opened.length) flash(e.opened); });
  return {
    el:svg, select:id => select(id, false), setLens(f){ lens = f || null; paint(); }, get lens(){ return lens; }, get selected(){ return sel; }, setPreview, flash, paint,
    screenPoint(id){ const r = BM.region(id); const pt = svg.createSVGPoint(); pt.x = r.cx * T; pt.y = r.cy * T; const m = svg.getScreenCTM(); const q = pt.matrixTransform(m); return { x:q.x, y:q.y }; },
    focusRegion(id){ rgEls[id] && rgEls[id].focus(); },
  };
};

/* ───────────────────────── specimen ───────────────────────── */
/*
  Code-drawn placeholder of the modular-plant direction (VISUAL_DIRECTION §§3–6). Channels:
  data-f="temp"   stature / stem (Cold → compact, Heat → silvery)      data-f="water"  leaf shape (Drought → plump, Flood → strap)
  data-f="soil"   roots + salt crystals                                 data-f="hazard" pigment spots (Radiation Shielding)
  data-f="spread" flowers / seed puffs / floating pods                  data-f="env"    sky, weather, soil surface (Terraform only)
  Terraform ONLY changes the env layer. Adapt/Spread ONLY change the plant layers.
*/
const SKY = { clear:['#8fcdf2','#e6f5fd'], snow:['#b4c9e2','#f1f5fb'], haze:['#efd294','#fbf0d2'], rain:['#9cb0c2','#e0e8ef'], ember:['#e59a74','#fbe0c6'] };
const SOIL = { loam:'#8a5a3b', wet:'#5b3f2e', dry:'#c49a62', salty:'#b49a80', rocky:'#8d8781', ash:'#6a4b40' };
function specKey(o){ return JSON.stringify(o); }
BM.specState = function(rid, extra){
  // extra: { addTrait:id } (Adapt/Spread preview) or { sky:id } (Terraform preview) or { focus } / { spec }
  extra = extra || {};
  const r = BM.region(rid), rs = S.reg[rid], v = BM.view(rid);
  const traits = BM.ITEMS.filter(it => it.board !== 'terraform' && (S.owned[it.id] || it.id === extra.addTrait)).map(it => it.id);
  const sky = BM.skyNow(extra.sky);
  const living = rs.colony === 'living';
  let stressed = v.st === 'bad' || (v.st === 'warn' && !living);
  if (extra.addTrait && r.needs.includes(extra.addTrait)) stressed = false;
  if (extra.sky && r.needs.includes(extra.sky)) stressed = false;
  return {
    rid, traits, sky, env:r.env, focus:extra.focus || rs.focus, spec:extra.spec || rs.spec,
    est: extra.showcase ? Math.max(.72, living ? rs.est : 0) : living ? Math.max(.08, rs.est) : .4, stressed, ghost:!living && !extra.showcase,
  };
};
BM.mountSpecimen = function(container, opts){
  opts = opts || {};
  const box = document.createElement('div'); box.className = 'bm-spec';
  box.innerHTML = '<span class="pv-tag">PREVIEW</span>';
  const svg = sv('svg', { viewBox:'15 22 170 208', preserveAspectRatio:'xMidYMid meet', role:'img', 'aria-label':'Your plant (placeholder drawing)' });
  box.prepend(svg); container.appendChild(box);
  let cur = null, key = '';
  function render(st, isPreview){
    const k = specKey(st) + (opts.compact ? 'c' : '');
    box.classList.toggle('previewing', !!isPreview);
    if (k === key) return; key = k;
    const g = sv('g', { class:'layer', opacity: cur && !reduceMotion ? 0 : 1 });
    draw(g, st, opts);
    svg.appendChild(g);
    svg.setAttribute('aria-label', describe(st));
    if (cur && !reduceMotion) { const old = cur; void g.getBoundingClientRect(); g.setAttribute('opacity', 1); old.setAttribute('opacity', 0); setTimeout(() => old.remove(), 480); }
    else if (cur) cur.remove();
    cur = g; if (hl) applyHl();
  }
  let hl = null;
  function highlight(f){ hl = f ? [].concat(f) : null; applyHl(); }
  function applyHl(){ svg.querySelectorAll('[data-f]').forEach(n => { const on = hl && hl.includes(n.dataset.f); n.classList.toggle('dim', !!hl && !on); n.classList.toggle('glow', !!on && n.dataset.f !== 'env'); }); }
  return { el:box, render, highlight };
};
function describe(st){
  const parts = st.traits.map(id => BM.item(id).look.toLowerCase());
  return 'Your plant (placeholder drawing)' + (parts.length ? ': ' + parts.join('; ') : '') + (st.stressed ? '. It is stressed here.' : '.');
}
function draw(g, st, opts){
  const has = id => st.traits.includes(id);
  const R = BM.region(st.rid), env = st.env;
  let skyType = env.sky; const dt = st.sky.dt, dm = st.sky.dm;
  // ── ENVIRONMENT (Terraform + region) ──
  const E = sv('g', { 'data-f':'env' }, g);
  const gid = 'sk' + Math.random().toString(36).slice(2, 8);
  const grad = sv('linearGradient', { id:gid, x1:0, y1:-20, x2:0, y2:170, gradientUnits:'userSpaceOnUse' }, sv('defs', {}, E));
  let [top, bot] = SKY[skyType];
  if (dt > 0) { top = mix(top, '#ffb35c', .35); bot = mix(bot, '#ffe7b8', .4); }
  if (dt < 0) { top = mix(top, '#9fbfff', .35); bot = mix(bot, '#eef4ff', .3); }
  if (dm > 0) { top = mix(top, '#8396a8', .35); }
  if (dm < 0) { top = mix(top, '#efd294', .35); bot = mix(bot, '#fbefd0', .3); }
  sv('stop', { offset:0, 'stop-color':top }, grad); sv('stop', { offset:1, 'stop-color':bot }, grad);
  sv('rect', { x:-400, y:-400, width:1000, height:570, fill:'url(#' + gid + ')' }, E);
  const sunR = 13 + (dt > 0 ? 6 : 0) - (dt < 0 ? 3 : 0);
  if (skyType !== 'rain' || dm < 0) {
    const sun = sv('g', {}, E);
    sv('circle', { cx:150, cy:70, r:sunR + 6, fill:'#fff3b0', opacity:.45 }, sun);
    sv('circle', { cx:150, cy:70, r:sunR, fill: skyType === 'ember' || dt > 0 ? '#ffb347' : '#ffd65a' }, sun);
  }
  const cloud = (x, y, s, c) => { const cg = sv('g', { opacity:.9 }, E); [[0,0,14],[12,-6,11],[24,0,13],[12,4,12]].forEach(([dx,dy,r]) => sv('circle', { cx:x + dx * s, cy:y + dy * s, r:r * s, fill:c }, cg)); };
  if (skyType === 'rain' || dm > 0) { cloud(36, 62, 1, '#e9eef2'); cloud(112, 56, .9, '#dfe6ec'); }
  else if (skyType !== 'haze' && skyType !== 'ember') cloud(40, 74, .7, '#ffffff');
  const W_ = sv('g', { class:'weather' }, E);
  const rnd = k => hash(k, st.rid.length, 17);
  if (skyType === 'snow' || dt < 0) for (let k = 0; k < 28; k++) { const c = sv('circle', { class:'fall', cx:rnd(k) * 400 - 100, cy:rnd(k + 40) * 140, r:1.6, fill:'#fff' }, W_); c.style.animationDelay = (-rnd(k + 80) * 1.6) + 's'; }
  if (skyType === 'rain' || dm > 0) for (let k = 0; k < 30; k++) { const l = sv('line', { x1:rnd(k) * 400 - 100, y1:30 + rnd(k + 9) * 110, x2:rnd(k) * 400 - 103, y2:38 + rnd(k + 9) * 110, stroke:'#6f93b3', 'stroke-width':1.2, 'stroke-linecap':'round' }, W_); l.style.animationDelay = (-rnd(k + 30) * 1.6) + 's'; }
  if (skyType === 'haze' || dm < 0) for (let k = 0; k < 4; k++) sv('rect', { x:-400, y:60 + k * 24, width:1000, height:9, rx:4, fill:'#f5deaa', opacity:.45 }, E);
  if (skyType === 'ember') for (let k = 0; k < 8; k++) sv('path', { d:'M' + (rnd(k) * 190 + 5) + ' ' + (rnd(k + 5) * 120 + 20) + 'l2 -5 2 5 5 2 -5 2 -2 5 -2 -5 -5 -2z', fill:'#e8f070', opacity:.8 }, E);
  // soil
  let soil = env.soil; if (dm > 0 && soil === 'dry') soil = 'loam'; if (dm < 0 && soil === 'loam') soil = 'dry'; if (dm > 0 && soil === 'loam') soil = 'wet';
  sv('rect', { x:-400, y:162, width:1000, height:400, fill:SOIL[soil] }, E);
  sv('path', { d:'M-400 161 Q-350 156 -300 161 T-200 160 T-100 161 T0 160 Q50 156 100 161 T200 160 T300 161 T400 160 T600 160 V170 H-400Z', fill: ({ frost:'#eef3f8', highland:'#b7ae98', dust:'#e5c88c', salt:'#efe6d6', ember:'#8b5a48', marsh:'#7fb39a' }[R.terrain]) || '#8cbf5a' }, E);
  if (soil === 'dry') ['M30 190l12 8 -4 10','M150 200l-10 6 6 12','M90 222l14 -4 6 8'].forEach(d => sv('path', { d, stroke:'#8a6a3e', 'stroke-width':1.4, fill:'none' }, E));
  if (soil === 'wet') sv('ellipse', { cx:44, cy:172, rx:22, ry:4, fill:'#7fb4d6', opacity:.8 }, E);
  if (soil === 'salty') for (let k = 0; k < 40; k++) sv('rect', { x:rnd(k) * 400 - 100, y:166 + rnd(k + 3) * 70, width:2, height:2, fill:'#fff', opacity:.9 }, E);
  if (R.terrain === 'frost' || (dt < 0)) sv('path', { d:'M-400 161 Q-350 156 -300 161 T-200 160 T-100 161 T0 160 Q50 156 100 161 T200 160 T300 161 T400 160 T600 160 V164 H-400Z', fill:'#fff', opacity:.9 }, E);

  // ── PLANT (Adapt + Spread + colony) ──
  const PT = 'translate(100 164) scale(1.32) translate(-100 -164)';
  const P = sv('g', { class: st.stressed || reduceMotion ? '' : 'sway' }, sv('g', { transform:PT }, g));
  const est = st.est, scale = .62 + est * .45;
  const cold = has('cold'), heat = has('heat'), drought = has('drought'), flood = has('flood'), salt = has('salt'), rad = has('rad');
  // roots
  const RT = sv('g', { 'data-f':'soil', transform:PT }, g);
  let nRoots = 4 + (st.focus === 'roots' ? 3 : 0) + (st.spec === 'network' ? 4 : 0);
  for (let k = 0; k < nRoots; k++) {
    const a = (k / (nRoots - 1 || 1) - .5) * (flood ? 2.6 : 1.8);
    const len = (26 + rnd(k + 60) * 20) * scale * (flood ? .7 : 1);
    const ex = 100 + Math.sin(a) * len * 1.3, ey = 164 + Math.cos(a) * len;
    sv('path', { d:'M100 164 Q' + (100 + Math.sin(a) * len * .5) + ' ' + (170 + len * .3) + ' ' + ex.toFixed(1) + ' ' + ey.toFixed(1), stroke:'#d8b58c', 'stroke-width':(st.spec === 'network' ? 2.2 : 1.6), fill:'none', 'stroke-linecap':'round' }, RT);
  }
  if (st.spec === 'network') for (let k = 0; k < 5; k++) sv('circle', { cx:70 + k * 15, cy:196 + rnd(k + 70) * 18, r:1.8, fill:'#f1d7b0' }, RT);
  if (drought) sv('path', { d:'M100 164 Q103 200 98 236', stroke:'#e2c49c', 'stroke-width':3.2, fill:'none', 'stroke-linecap':'round' }, RT);
  // stem
  const stemH = (40 + est * 52) * (cold ? .62 : 1) * (flood ? 1.16 : 1);
  const topY = 164 - stemH;
  const stemCol = rad ? '#4e3d62' : heat ? '#7f9b74' : '#4f8a3a';
  const STM = sv('g', { 'data-f':'temp' }, P);
  sv('path', { d:'M100 164 C' + (st.stressed ? '104 ' + (164 - stemH * .5) + ' 112 ' + (topY + 12) : '97 ' + (164 - stemH * .5) + ' 103 ' + (topY + 18)) + ' ' + (st.stressed ? 110 : 100) + ' ' + topY, stroke:stemCol, 'stroke-width':cold ? 6.5 : 4.2, fill:'none', 'stroke-linecap':'round' }, STM);
  // leaves
  const LV = sv('g', { 'data-f':'water' }, P);
  const HZ = sv('g', { 'data-f':'hazard' }, P);
  const SC = sv('g', { 'data-f':'soil' }, P);
  let leafCol = '#5fae4a';
  if (heat) leafCol = '#9fc0a0'; if (rad) leafCol = mix(leafCol, '#8e3b78', .6);
  if (st.stressed) leafCol = mix(leafCol, '#b9b06a', .55);
  const nLeaves = Math.max(3, 5 + (st.focus === 'leaves' ? 3 : 0) + (st.spec === 'canopy' ? 3 : 0) - (cold ? 1 : 0) - (st.focus === 'seeds' ? 1 : 0));
  const leafShape = drought ? [14, 10.5] : flood ? [32, 5] : cold ? [12, 6.5] : [20, 8.2];
  for (let k = 0; k < nLeaves; k++) {
    const t = .18 + (k / nLeaves) * .74, side = k % 2 ? 1 : -1;
    const y = 164 - stemH * t, x = 100 + (st.stressed ? t * 10 : 0);
    let ang = side * (st.stressed ? 110 : 55 - t * 20);
    const sz = (1 - t * .35) * scale;
    const lw = leafShape[0] * sz, lh = leafShape[1] * sz;
    const lg = sv('g', { transform:'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') rotate(' + (ang - 90 * side + (side > 0 ? 0 : 180)) + ')' }, LV);
    sv('path', { d:'M0 0 Q' + (lw * .5) + ' ' + (-lh) + ' ' + lw + ' 0 Q' + (lw * .5) + ' ' + lh + ' 0 0Z', fill:leafCol, stroke: heat ? '#e9f3e9' : 'rgba(30,70,30,.35)', 'stroke-width': heat ? 1.2 : .7 }, lg);
    if (drought) sv('ellipse', { cx:lw * .45, cy:-lh * .25, rx:lw * .2, ry:lh * .22, fill:'#fff', opacity:.35 }, lg);
    if (cold) for (let j = 1; j < 5; j++) sv('circle', { cx:lw * j / 5, cy:-lh * .55 * Math.sin(j / 5 * Math.PI) - .6, r:.7, fill:'#fff' }, lg);
    if (rad) { const hz = sv('g', { transform:lg.getAttribute('transform') }, HZ); sv('circle', { cx:lw * .35, cy:0, r:1.4 * sz, fill:'#3d2550' }, hz); sv('circle', { cx:lw * .62, cy:0, r:1.1 * sz, fill:'#3d2550' }, hz); }
    if (salt) { const sc = sv('g', { transform:lg.getAttribute('transform') }, SC); sv('rect', { x:lw * .5, y:-1.2, width:2, height:2, fill:'#fff', transform:'rotate(45 ' + (lw * .5 + 1) + ' 0)' }, sc); sv('ellipse', { cx:lw * .45, cy:-lh * .3, rx:lw * .28, ry:lh * .18, fill:'#fff', opacity:.4 }, sc); }
  }
  for (const side of [-1, 1]) {                         // basal rosette (fuller silhouette; wider when compact/cold)
    const lw = leafShape[0] * scale * (cold ? 1.1 : .85), lh = leafShape[1] * scale * (cold ? 1.1 : .85);
    const lg = sv('g', { transform:'translate(100 163) rotate(' + (side > 0 ? (st.stressed ? 15 : -12) : (st.stressed ? 165 : 192)) + ')' }, LV);
    sv('path', { d:'M0 0 Q' + (lw * .5) + ' ' + (-lh) + ' ' + lw + ' 0 Q' + (lw * .5) + ' ' + lh + ' 0 0Z', fill:leafCol, stroke: heat ? '#e9f3e9' : 'rgba(30,70,30,.35)', 'stroke-width': heat ? 1.2 : .7 }, lg);
  }
  // reproductive
  const SP = sv('g', { 'data-f':'spread' }, P);
  const tx = st.stressed ? 110 : 100;
  const puffs = (has('seedOut') ? 1 : 0) + (st.focus === 'seeds' ? 2 : 0) + (st.spec === 'reserve' ? 1 : 0);
  if (!puffs && !has('earlyMat')) sv('ellipse', { cx:tx, cy:topY - 3, rx:3.2, ry:5, fill:'#9ccf6a', stroke:'#4f8a3a', 'stroke-width':.8 }, SP);
  if (has('earlyMat')) { const fl = sv('g', {}, SP); for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; sv('ellipse', { cx:tx + Math.cos(a) * 5, cy:topY - 4 + Math.sin(a) * 5, rx:4, ry:2.6, fill:'#f19bb3', transform:'rotate(' + (a * 180 / Math.PI) + ' ' + (tx + Math.cos(a) * 5) + ' ' + (topY - 4 + Math.sin(a) * 5) + ')' }, fl); } sv('circle', { cx:tx, cy:topY - 4, r:2.6, fill:'#ffd65a' }, fl); }
  for (let k = 0; k < puffs; k++) {
    const px = tx + (k === 0 ? (has('earlyMat') ? 14 : 0) : (k % 2 ? -1 : 1) * (12 + k * 4)), py = topY - (k === 0 ? (has('earlyMat') ? 0 : 6) : 2 - k * 3);
    if (k > 0) sv('path', { d:'M' + tx + ' ' + (topY + 6) + ' Q' + ((tx + px) / 2) + ' ' + (py + 4) + ' ' + px + ' ' + py, stroke:stemCol, 'stroke-width':1.3, fill:'none' }, SP);
    const pg = sv('g', {}, SP);
    for (let j = 0; j < 10; j++) { const a = j / 10 * Math.PI * 2; sv('line', { x1:px, y1:py, x2:px + Math.cos(a) * 6, y2:py + Math.sin(a) * 6, stroke:'#fff', 'stroke-width':.8 }, pg); }
    sv('circle', { cx:px, cy:py, r:6.5, fill:'rgba(255,255,255,.35)', stroke:'#fff', 'stroke-width':.6 }, pg); sv('circle', { cx:px, cy:py, r:1.6, fill:'#c9a46a' }, pg);
  }
  if (has('waterSeeds')) [[-1, .45], [1, .55]].forEach(([s, t]) => {
    const y = 164 - stemH * t; sv('path', { d:'M100 ' + y + ' q' + (s * 6) + ' 2 ' + (s * 9) + ' 8', stroke:stemCol, 'stroke-width':1.2, fill:'none' }, SP);
    sv('circle', { cx:100 + s * 10, cy:y + 12, r:5, fill:'#9a6a3a', stroke:'#6b4523', 'stroke-width':.8 }, SP);
    sv('path', { d:'M' + (100 + s * 10 - 3) + ' ' + (y + 10) + ' q3 -2 6 0', stroke:'#c79a64', 'stroke-width':.8, fill:'none' }, SP);
  });
  if (st.ghost) sv('rect', { x:-400, y:-400, width:1000, height:1000, fill:'rgba(255,255,255,.12)' }, g);
}

})();
