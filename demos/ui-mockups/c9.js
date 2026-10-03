/*
  BLOOM UI concept mockups — CONVERGENCE (BLOOM-019) · Concept 9 — Unified side workbench. Loads AFTER shared.js + r2.js.

  VISUAL CONCEPT MOCKUP ONLY. Everything is still the BLOOM-017 fake world (BM.*) plus round-2 components (BM2.*): fake planet,
  fake Biomass clock, scripted trait effects. Nothing here loads or calls the engine, generator, validator, scenarios, balance
  data or Bloom Report. Pause / speed only drive the fake clock.

  Owner direction (docs/UI_CONCEPT_REVIEW_v3.md):
    - ONE right-side workbench with six modes: Region · Regions · Map View · Adapt · Spread · Terraform (one at a time);
    - clicking a map region opens the workbench in Region mode; clicking another region updates it in place;
    - one fixed tool rail (Explore: Regions, Map View · Change: Adapt, Spread, Terraform) at the right edge;
    - opening the workbench reframes the map once; switching modes never moves it again; closing restores it;
    - no region popup, no bottom workbench, no full-screen takeover, no permanent giant plant;
    - Map View (not "Lens"): hover/focus previews a heatmap, leaving restores the committed view, click commits;
    - the selected region stays as context in Adapt / Spread / Terraform without making global upgrades look local;
    - Region workbench organisation is switchable A (tabbed) / B (dashboard + tabs) / C (scrolling sections) for review only.
*/
(function(){
'use strict';
const S = BM.store.s, esc = BM.esc, $ = id => document.getElementById(id);

/* ───────── ribbon + review-only Region layout switch ───────── */
BM.ribbon('Concept 9 · Unified side workbench');
const rib = document.querySelector('.mock-ribbon');
const back = rib.querySelector('a'); back.href = 'index.html#convergence'; back.setAttribute('aria-label', 'Back to the mockup gallery, Convergence');
rib.querySelector('.tag').textContent = 'CONVERGENCE MOCKUP';
const VARIANTS = [['a', 'Tabbed'], ['b', 'Dashboard + tabs'], ['c', 'Sections']];
const vsw = document.createElement('div');
vsw.className = 'vswitch'; vsw.setAttribute('role', 'group'); vsw.setAttribute('aria-label', 'Design review only, not game UI: Region workbench layout');
vsw.innerHTML = '<span class="vl" aria-hidden="true">Review only · Region layout</span>' +
  VARIANTS.map(([k, n]) => '<button type="button" data-variant="' + k + '" aria-pressed="false" title="Region layout ' + k.toUpperCase() + ': ' + n + ' (design review only)"><b>' + k.toUpperCase() + '</b><span>' + n + '</span></button>').join('');
rib.insertBefore(vsw, rib.querySelector('.spacer').nextSibling);

let variant = 'a';
try { const m = localStorage.getItem('bloomC9Variant'); if (/^[abc]$/.test(m)) variant = m; } catch (e) {}
const qv = new URLSearchParams(location.search).get('v'); if (/^[abc]$/.test(qv || '')) variant = qv;

/* ───────── top status banner ───────── */
const banner = $('banner');
banner.innerHTML =
  '<div class="bn-cov"><span class="bn-k"><span aria-hidden="true">🌍</span> In bloom</span><span class="bn-v"><b class="v">0%</b><small>of the land · goal 70%</small></span>' +
    '<span class="bar"><i></i><span class="goal" style="left:70%"></span></span><span class="bn-sub"><b class="liv">0</b> of 10 regions living</span></div>' +
  '<div class="bn-bio biomass"><span class="ico" aria-hidden="true">✦</span><span><span class="lbl">Biomass</span><span class="num">0</span><span class="rate"></span></span></div>' +
  '<div class="bn-scn"><span class="bn-k"><span aria-hidden="true">💨</span> Dying World</span><span class="bn-v"><b class="v">0%</b><small>of the air lost</small></span>' +
    '<span class="row"><span class="bar pressure"><i></i></span><span class="bn-sub">⚡ <span class="word">Calm</span></span></span></div>';
BM.bindBiomass(banner.querySelector('.bn-bio'));
BM.store.on(() => {
  banner.querySelector('.bn-cov .v').textContent = S.coverage.toFixed(0) + '%';
  banner.querySelector('.bn-cov .bar i').style.width = Math.min(100, S.coverage) + '%';
  banner.querySelector('.bn-cov .liv').textContent = BM.REGIONS.filter(r => S.reg[r.id].colony === 'living').length;
  banner.querySelector('.bn-scn .v').textContent = Math.round(S.pressure * 100) + '%';
  banner.querySelector('.bn-scn .bar i').style.width = S.pressure * 100 + '%';
  const rate = banner.querySelector('.bn-bio .rate');
  if (BM.clock.paused) rate.textContent = '⏸ paused';
  else rate.textContent = '+' + S.income.toFixed(1) + ' / s' + (BM.clock.speed > 1 ? ' · ' + BM.clock.speed + '×' : '');
  const k = S.instab < .3 ? ['', 'Climate calm'] : S.instab < .6 ? ['warn', 'Climate unsettled'] : ['bad', 'Climate volatile'];
  const w = banner.querySelector('.bn-scn .word'); w.className = 'word ' + k[0]; w.textContent = k[1];
});
BM2.clockControls($('clock'));
BM2.pausedFlag($('mapzone'));

/* ───────── map ───────── */
const world = $('world'), wb = $('wb'), rail = $('rail'), live = $('c9live');
const map = window.map = BM.mountMap($('mapwrap'), { labels:'all', onSelect:id => selectRegion(id, { via:'map' }) });
const regionEl = id => document.querySelector('#mapwrap .rg[data-r="' + id + '"]');
const say = t => { live.textContent = ''; setTimeout(() => { live.textContent = t; }, 30); };

/* ───────── state ───────── */
let mode = null, sel = null, lastOpener = null;
let committed = '', previewView = null;
const tabOf = { a:'over', b:'grow' };
const MODES = {
  region:{ ico:'📍', label:'Region' },
  regions:{ ico:'🗂', label:'Explore · Regions', title:'Every region at a glance' },
  mapview:{ ico:'🗺️', label:'Explore · Map View', title:'Colour the map by…' },
  adapt:{ ico:'🌿', label:'Change · your plant', title:'Adapt your plant' },
  spread:{ ico:'🌱', label:'Change · how seeds travel', title:'Spread your seeds' },
  terraform:{ ico:'🌍', label:'Change · the planet', title:'Terraform the planet' },
};
const panes = [...wb.querySelectorAll('.pane')];
const hIco = wb.querySelector('.mi'), hLbl = wb.querySelector('.ml'), hT = $('wbT'), wbHead = wb.querySelector('.wb9-h');
const allBtn = $('wbAll'), ctxBar = $('ctx9');

/* ───────── tool rail ───────── */
const tools = [...rail.querySelectorAll('[data-tool]')];
tools.forEach(b => b.addEventListener('click', () => {
  const t = b.dataset.tool;
  lastOpener = b;
  if (mode === t) { closeBench(); return; }
  setMode(t, { opener:b, focus:!BM2.viaPointer() });
}));
function paintRail(){
  tools.forEach(b => b.setAttribute('aria-pressed', b.dataset.tool === mode ? 'true' : 'false'));
  const n = BM.REGIONS.filter(r => BM.view(r.id).st !== 'ok').length;
  const rb = rail.querySelector('[data-tool="regions"]');
  rb.querySelector('.badge').textContent = n;
  rb.setAttribute('aria-label', 'Regions: browse every region. ' + n + ' need help');
  const L = BM2.LENSES.find(l => l.id === committed), mv = rail.querySelector('[data-tool="mapview"]');
  mv.querySelector('.ti').textContent = committed ? L.ico : '🗺️';
  mv.querySelector('small').textContent = committed ? L.name : 'Plants';
  mv.querySelector('.vdot').hidden = !committed;
  mv.setAttribute('aria-label', 'Map View: showing ' + (committed ? L.name : 'Plants, the normal view') + '. Choose what the map shows');
}

/* ───────── opening / switching / closing the ONE workbench ───────── */
function setMode(m, o){
  o = o || {};
  const first = !BM.isOpen(wb);
  if (mode && mode !== m) leave(mode);
  mode = m;
  panes.forEach(p => p.hidden = p.dataset.mode !== m);
  wb.dataset.mode = m;
  paintHeader(); paintRail(); paintCtx();
  enter(m, o);
  if (first) {
    world.classList.add('wb-open'); document.body.classList.add('wb-open');
    BM.openLayer(wb, o.opener || document.activeElement, { noFocus:true, onClose });
  }
  if (o.focus) setTimeout(() => { if (o.card && boards[m]) boards[m].focusCard(o.card); else hT.focus({ preventScroll:true }); }, 60);
  else if (o.card && boards[m]) setTimeout(() => boards[m].focusCard(o.card), 60);
}
function leave(m){
  if (boards[m]) boards[m].hide();
  if (m === 'mapview') setPreviewView(null);
  if (m === 'region') { map.setPreview(null); }
}
function enter(m){
  if (m === 'region') buildRegion();
  else if (m === 'regions') renderRegions();
  else if (m === 'mapview') renderMapView();
  else { boards[m].show(); tagCards(m); verdict(null); }
}
function onClose(){
  if (mode) leave(mode);
  mode = null; delete wb.dataset.mode;
  world.classList.remove('wb-open'); document.body.classList.remove('wb-open');
  sel = null; map.select(null); map.setPreview(null); map.highlight(null);
  paintRail();
}
function closeBench(){
  if (!BM.isOpen(wb)) return;
  const backTo = lastOpener;
  BM.closeLayer(wb, { noReturn:true });
  if (backTo && document.contains(backTo) && backTo.getClientRects().length) backTo.focus({ preventScroll:true });
}
/* Esc closes the workbench and returns focus to whatever opened the current mode (region or rail tool) */
window.addEventListener('keydown', e => { if (e.key === 'Escape' && BM.isOpen(wb)) { e.preventDefault(); e.stopPropagation(); closeBench(); } }, true);
$('wbX').addEventListener('click', closeBench);
allBtn.addEventListener('click', () => { lastOpener = allBtn; setMode('regions', { focus:!BM2.viaPointer() }); });

function paintHeader(){
  const M = MODES[mode];
  hIco.textContent = M.ico; hLbl.textContent = M.label;
  hT.textContent = mode === 'region' ? BM.region(sel).name : M.title;
  allBtn.hidden = mode !== 'region';
  wb.setAttribute('aria-label', 'Workbench: ' + (mode === 'region' ? 'Region, ' + BM.region(sel).name : M.title));
}

/* ───────── region selection (the core interaction) ───────── */
function selectRegion(id, o){
  o = o || {};
  const changed = sel !== id;
  sel = id; map.select(id);
  if (o.via === 'map') lastOpener = regionEl(id);
  if (mode === 'region') {
    if (changed) { paintHeader(); fillRegion(); swapFlash(); }
  } else setMode('region', { opener:o.via === 'map' ? regionEl(id) : o.opener, focus:!!o.focus });
  const v = BM.view(id);
  say(v.r.name + '. ' + (v.limit ? BM.ST_WORD[v.st] + ': ' + v.limit.text : 'Thriving') + '. Details are in the workbench.');
}
function swapFlash(){ if (BM.reduceMotion) return; wbHead.classList.remove('swap'); void wbHead.offsetWidth; wbHead.classList.add('swap'); }

/* ───────── Region workbench: three organisations of the same information ───────── */
const regionPane = $('p-region');
const rspec = BM.mountSpecimen(document.createElement('div'), { compact:true });
let paneHover = false, lastT = 0;
regionPane.addEventListener('pointerenter', () => { paneHover = true; }); regionPane.addEventListener('pointerleave', () => { paneHover = false; });
const TABS = {
  a:[ ['over', '🔎', 'Overview'], ['colony', '🌱', 'Colony'], ['sci', '🔬', 'Science'] ],
  b:[ ['grow', '🌱', 'Grow'], ['sci', '🔬', 'Science'], ['near', '🧭', 'Nearby'] ],
};
const JUMP = [['limit', 'Holding back'], ['cond', 'Conditions'], ['colony', 'Colony'], ['plant', 'Plant']];
const tabsHTML = v => '<div class="rtabs" role="tablist" aria-label="Region details">' + TABS[v].map(([id, ico, n]) =>
  '<button type="button" role="tab" id="c9t-' + id + '" data-tab="' + id + '" aria-controls="c9tab"><span aria-hidden="true">' + ico + '</span>' + n + '</button>').join('') + '</div>';
function buildRegion(){
  let h;
  if (variant === 'a') h = '<div class="rv rv-a"><div class="rv-sum"><div class="slot-spec"></div><div><div class="rv-chips" data-s="chips"></div><div data-s="limit"></div><div class="rp-fix" data-s="fix"></div></div></div>' +
    tabsHTML('a') + '<div class="rv-body" id="c9tab" data-s="tab" role="tabpanel" tabindex="0"></div></div>';
  else if (variant === 'b') h = '<div class="rv rv-b"><div class="rv-top"><div class="slot-spec"></div><div><div class="rv-chips" data-s="chips"></div><div data-s="limit"></div></div></div>' +
    '<div class="rv-dash" data-s="dash"></div><div class="rp-fix rv-fixrow" data-s="fix"></div>' + tabsHTML('b') + '<div class="rv-body" id="c9tab" data-s="tab" role="tabpanel" tabindex="0"></div></div>';
  else h = '<div class="rv rv-c"><nav class="rv-jump" aria-label="Jump to a section">' + JUMP.map(([k, n]) => '<button type="button" data-jump="' + k + '" aria-current="false">' + n + '</button>').join('') + '</nav>' +
    '<div class="rv-body" data-s="scroll" tabindex="0" aria-label="Region details">' +
      '<section class="sec sec-limit" id="c9s-limit" data-s="limitsec" aria-labelledby="c9h-limit"><h3 id="c9h-limit"><span class="hi" aria-hidden="true">🚧</span>What’s holding it back</h3><div data-s="limit"></div><div class="rp-fix" data-s="fix"></div></section>' +
      '<section class="sec" id="c9s-cond" aria-labelledby="c9h-cond"><h3 id="c9h-cond"><span class="hi" aria-hidden="true">🌡️</span>Conditions</h3><div data-s="cond"></div></section>' +
      '<section class="sec" id="c9s-colony" aria-labelledby="c9h-colony"><h3 id="c9h-colony"><span class="hi" aria-hidden="true">🌱</span>Colony</h3><div class="rv-chips" data-s="chips"></div><div data-s="colony"></div></section>' +
      '<section class="sec" id="c9s-plant" aria-labelledby="c9h-plant"><h3 id="c9h-plant"><span class="hi" aria-hidden="true">🌿</span>Plant</h3><div class="slot-spec"></div><div data-s="plant"></div></section>' +
    '</div></div>';
  regionPane.innerHTML = h;
  regionPane.querySelector('.slot-spec').appendChild(rspec.el);
  regionPane.querySelectorAll('[role=tab]').forEach((t, k, all) => {
    t.addEventListener('click', () => setTab(t.dataset.tab));
    t.addEventListener('keydown', e => {
      const d = { ArrowRight:1, ArrowLeft:-1 }[e.key];
      if (d) { e.preventDefault(); const n = all[(k + d + all.length) % all.length]; setTab(n.dataset.tab); n.focus(); }
    });
  });
  const sc = regionPane.querySelector('[data-s="scroll"]');
  if (sc) {
    regionPane.querySelectorAll('[data-jump]').forEach(b => b.addEventListener('click', () => {
      const s = $('c9s-' + b.dataset.jump);
      sc.scrollTo({ top:s.offsetTop - sc.offsetTop - 8, behavior:BM.reduceMotion ? 'auto' : 'smooth' });
    }));
    sc.addEventListener('scroll', paintJump, { passive:true });
  }
  fillRegion();
}
function paintJump(){
  const sc = regionPane.querySelector('[data-s="scroll"]'); if (!sc) return;
  let cur = 'limit';
  JUMP.forEach(([k]) => { const s = $('c9s-' + k); if (s && s.offsetTop - sc.offsetTop - 24 <= sc.scrollTop) cur = k; });
  if (sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 4) cur = 'plant';
  regionPane.querySelectorAll('[data-jump]').forEach(b => b.setAttribute('aria-current', b.dataset.jump === cur ? 'true' : 'false'));
}
function setTab(t){ tabOf[variant] = t; fillTab(); }
const slot = k => regionPane.querySelector('[data-s="' + k + '"]');

/* section HTML */
function chipsHTML(v){
  const rs = v.rs, living = rs.colony === 'living', fo = BM.FOCUS.find(f => f.id === rs.focus), sp = BM.SPECS.find(x => x.id === rs.spec);
  return (v.r.origin ? '<span class="chip">⭐ Start</span>' : '') + BM.stHTML(v.st, v.limit ? BM.ST_WORD[v.st] : 'Thriving') +
    '<span class="chip">' + (living ? '🌱 ' + v.estWord + ' · ' + Math.round(rs.est * 100) + '%' : '◌ No colony') + '</span>' +
    (living ? '<span class="chip" title="Biomass from this region">✦ +' + BM2.income(v.r.id).toFixed(1) + '/s</span>' : '') +
    (living ? '<span class="chip" title="Growth focus">' + fo.ico + ' ' + fo.name + '</span>' : '') +
    (sp ? '<span class="chip" title="Local upgrade">' + sp.ico + ' ' + sp.name + '</span>' : '');
}
function limitHTML(v){
  const living = v.rs.colony === 'living';
  return '<div class="rp-limit ' + (v.limit ? v.st : 'ok') + '"><small>Holding it back</small>' +
    (v.limit ? '<span aria-hidden="true">' + BM.COND_META[v.limit.f].ico + '</span> ' + esc(v.limit.text) : '✓ Nothing. ' + (living ? 'This colony is growing well.' : 'Seeds can settle here.')) + '</div>';
}
function fixHTML(v){
  if (!v.limit || !v.fixers.length) return '';
  return '<span class="fx-h">Could help · hover to preview on the map</span>' + v.fixers.map(it => { const k = BM.BOARDS[it.board].kind;
    return '<button type="button" class="fixbtn" data-fix="' + it.id + '"><span aria-hidden="true">' + it.ico + '</span>' + it.name + ' <span class="kind ' + k + '">' + BM2.KINDWORD[k] + '</span></button>'; }).join('');
}
function condTilesHTML(v){
  return '<div class="ctiles2">' + ['temp','water','soil','hazard'].map(k => { const c = v.cond[k], M = BM.COND_META[k];
    return '<div class="ctile2 ' + c[0] + '"><span class="ci" aria-hidden="true">' + M.ico + '</span><span class="ch">' + M.name + BM.stHTML(c[0]) + '</span><small>' + esc(c[1]) + '</small></div>'; }).join('') + '</div>';
}
function statsHTML(v){
  const rs = v.rs, living = rs.colony === 'living', tot = Math.max(.1, S.income), inc = BM2.income(v.r.id);
  return '<div class="rstats"><div class="rstat">Stand density<b>' + (living ? Math.round(rs.est * 100) + '% · ' + v.estWord : 'No colony') + '</b><span class="bar"><i style="width:' + (living ? rs.est * 100 : 0) + '%"></i></span></div>' +
    '<div class="rstat">Biomass from here<b>✦ +' + inc.toFixed(1) + ' / s</b>' + (living ? Math.round(inc / tot * 100) + '% of your income' : 'Nothing yet') + '</div></div>';
}
function dashHTML(v){
  const rs = v.rs, living = rs.colony === 'living', fo = BM.FOCUS.find(f => f.id === rs.focus), sp = BM.SPECS.find(x => x.id === rs.spec), inc = BM2.income(v.r.id);
  const short = { temp:'Temp', water:'Water', soil:'Soil', hazard:'Hazard' };
  return '<div class="dash4">' + ['temp','water','soil','hazard'].map(k => { const c = v.cond[k];
      return '<div class="dc ' + c[0] + '" title="' + BM.COND_META[k].name + ': ' + esc(c[1]) + '"><span class="dh"><span><span aria-hidden="true">' + BM.COND_META[k].ico + '</span> ' + short[k] + '</span><span class="mc ' + c[0] + '" aria-label="' + BM.ST_WORD[c[0]] + '">' + BM.ST_ICON[c[0]] + '</span></span><small>' + esc(c[1]) + '</small></div>'; }).join('') + '</div>' +
    '<div class="dash4">' +
      '<div class="dc stat"><small>Stand</small><b>' + (living ? Math.round(rs.est * 100) + '%' : '—') + '</b><span class="bar"><i style="width:' + (living ? rs.est * 100 : 0) + '%"></i></span></div>' +
      '<div class="dc stat"><small>Biomass</small><b>✦ +' + inc.toFixed(1) + '/s</b></div>' +
      '<div class="dc stat"><small>Focus</small><b>' + (living ? fo.ico + ' ' + fo.name : '—') + '</b></div>' +
      '<div class="dc stat"><small>Local upgrade</small><b>' + (sp ? sp.ico + ' ' + sp.name.split(' ')[1] : living ? 'None yet' : '—') + '</b></div>' +
    '</div>';
}
function focusHTML(v){
  const rs = v.rs;
  if (rs.colony !== 'living') {
    const src = BM2.neighbours(v.r.id).filter(id => S.reg[id].colony === 'living');
    return '<div class="empty2">No colony here yet. When seeds settle you choose how it grows: <b>Roots</b>, <b>Leaves</b> or <b>Seeds</b>.</div>' +
      '<h3 class="sub2">Seeds can come from</h3>' + (src.length ? '<div class="nbrow">' + src.map(id => '<button type="button" data-go="' + id + '">' + BM.stHTML(BM.view(id).st, '') + BM.region(id).name + '</button>').join('') + '</div>' : '<div class="empty2">No living neighbour can reach it yet.</div>');
  }
  const cur = BM.FOCUS.find(f => f.id === rs.focus);
  return '<h3 class="sub2">How should this colony grow?</h3><div class="focus4" role="group" aria-label="Growth focus">' + BM.FOCUS.map(f => '<button type="button" data-focus="' + f.id + '" aria-pressed="' + (f.id === rs.focus) + '" aria-label="' + f.name + ' focus. ' + f.text + '"><span class="fi" aria-hidden="true">' + f.ico + '</span>' + f.name + '<small>' + BM2.FSHORT[f.id] + '</small></button>').join('') + '</div>' +
    '<p class="focushint" aria-live="polite">' + cur.name + ': ' + cur.text + '</p>' +
    '<h3 class="sub2">Local upgrade · one per colony</h3><div class="spec3">' + BM.SPECS.map(x => '<button type="button" class="' + (rs.spec === x.id ? 'has' : '') + '" data-spec="' + x.id + '" aria-disabled="' + (!!rs.spec) + '"><span class="si" aria-hidden="true">' + x.ico + '</span><span>' + x.name + '<small>' + x.text + '</small></span><span class="c">' + (rs.spec === x.id ? '✓ Built' : rs.spec ? '' : '● ' + BM.SPEC_COST) + '</span></button>').join('') + '</div>';
}
function sciHTML(v){
  const t = v.r.env.tempC, pos = x => Math.max(0, Math.min(100, (x + 10) / 50 * 100));
  const raw = Object.entries(v.r.raw), half = Math.ceil(raw.length / 2);
  return '<h3 class="sub2">Ground temperature vs your plant</h3><div class="gauge" role="img" aria-label="Plant range 4 to 30 degrees. Here: ' + t + ' degrees."><span class="rng" style="left:' + pos(4) + '%; right:' + (100 - pos(30)) + '%"></span><span class="mk" style="left:' + pos(t) + '%"></span></div>' +
    '<div class="gauge-l"><span>−10 °C</span><span>Plant 4–30 °C · here ' + t + ' °C</span><span>40 °C</span></div>' +
    '<h3 class="sub2">Measured signals</h3><div class="rawcols">' + [raw.slice(0, half), raw.slice(half)].map(col => '<div class="rawgrid">' + col.map(([k, x]) => '<span>' + k + '</span><b>' + x + '</b>').join('') + '</div>').join('') + '</div>';
}
function logOf(v){
  const rs = v.rs;
  if (rs.colony !== 'living') return ['🌬️ Seeds blew in 30 s ago and could not settle.', '👀 Your plant has scouted this region.'];
  return ['🌱 Stand thickened to ' + Math.round(rs.est * 100) + '%.', '✦ Earned ' + Math.round(BM2.income(v.r.id) * 60) + ' Biomass in the last minute.', v.r.origin ? '⭐ Your plant landed here.' : '🌬️ First seeds settled here.'];
}
function nearHTML(v){
  const ns = BM2.neighbours(v.r.id);
  return '<h3 class="sub2">Touching regions</h3>' + (ns.length ? '<div class="nbrow">' + ns.map(id => { const n = BM.view(id); return '<button type="button" data-go="' + id + '">' + BM.stHTML(n.st, '') + n.r.name + '</button>'; }).join('') + '</div>'
    : '<div class="empty2">🌊 No land touches this island. Only Waterborne Seeds can reach it.</div>');
}
const logHTML = v => '<h3 class="sub2">Recent</h3><ul class="rlog">' + logOf(v).map(x => '<li>' + x + '</li>').join('') + '</ul>';
function plantHTML(v){
  const st = BM.specState(v.r.id), looks = st.traits.map(id => BM.item(id));
  return '<p class="plantcap"><b>Your plant in ' + v.r.name + '.</b> ' + (st.ghost ? 'No colony yet: this is how it would look here. ' : st.stressed ? 'It is stressed here. ' : 'It is comfortable here. ') +
    'Adapt changes the plant itself. Terraform changes only the sky, weather and soil around it.</p>' +
    (looks.length ? '<div class="traitrow">' + looks.map(it => '<span class="chip">' + it.ico + ' ' + it.name + '</span>').join('') + '</div>' : '');
}

/* fill / refresh */
function keepScroll(el, fn){ const top = el ? el.scrollTop : 0; fn(); if (el) el.scrollTop = top; }
function fillTab(){
  const body = slot('tab'); if (!body) return;
  const v = BM.view(sel), t = tabOf[variant];
  regionPane.querySelectorAll('[role=tab]').forEach(b => { const on = b.dataset.tab === t; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; });
  body.setAttribute('aria-labelledby', 'c9t-' + t);
  let h = '';
  if (variant === 'a') h = t === 'over' ? condTilesHTML(v) + statsHTML(v) + logHTML(v) : t === 'colony' ? focusHTML(v) : sciHTML(v) + nearHTML(v);
  else h = t === 'grow' ? focusHTML(v) : t === 'sci' ? sciHTML(v) : nearHTML(v) + logHTML(v);
  BM2.keepFocus(body, () => { body.innerHTML = h; });
  bindBody(body);
}
function fillRegion(){
  if (!sel || mode !== 'region') return;
  const v = BM.view(sel);
  const put = (k, h) => { const el = slot(k); if (el) BM2.keepFocus(el, () => { el.innerHTML = h; }); };
  put('chips', chipsHTML(v)); put('limit', limitHTML(v)); put('fix', fixHTML(v)); put('dash', v && dashHTML(v));
  const ls = slot('limitsec'); if (ls) ls.className = 'sec sec-limit ' + (v.limit ? v.st : 'ok');
  const sc = slot('scroll');
  keepScroll(sc, () => {
    put('cond', condTilesHTML(v) + sciHTML(v)); put('colony', statsHTML(v) + focusHTML(v) + nearHTML(v)); put('plant', plantHTML(v));
  });
  ['colony', 'cond'].forEach(k => slot(k) && bindBody(slot(k)));
  bindFix(slot('fix'));
  fillTab();
  specIdle();
  paintJump();
}
function specIdle(){ if (!sel) return; rspec.render(BM.specState(sel)); rspec.highlight(null); }

/* handlers */
function bindFix(root){
  if (!root) return;
  root.querySelectorAll('[data-fix]').forEach(b => {
    const id = b.dataset.fix, it = BM.item(id);
    b.setAttribute('aria-label', it.name + ' (' + BM2.KINDWORD[BM.BOARDS[it.board].kind] + '). Hover or focus to preview on the map. Press to open ' + BM.BOARDS[it.board].name + ' with this card.');
    const on = () => { if (!sel) return; const p = BM.previewOf(id); map.setPreview({ open:p.open, worse:p.worse, tint:it.board === 'terraform' ? id : null, arcs:BM2.ARCS[id] }); rspec.render(BM2.specFor(sel, id), true); if (it.board !== 'terraform') rspec.highlight(BM2.CH[it.cat]); };
    const off = () => { map.setPreview(null); specIdle(); };
    b.addEventListener('pointerenter', on); b.addEventListener('pointerleave', off); b.addEventListener('focus', on); b.addEventListener('blur', off);
    b.addEventListener('click', () => { off(); lastOpener = rail.querySelector('[data-tool="' + it.board + '"]'); setMode(it.board, { card:id }); });
  });
}
function bindBody(body){
  const rid = sel, r = BM.region(rid);
  body.querySelectorAll('[data-go]').forEach(b => {
    b.addEventListener('click', () => selectRegion(b.dataset.go, { focus:false }));
    b.addEventListener('pointerenter', () => map.highlight(b.dataset.go)); b.addEventListener('pointerleave', () => map.highlight(null));
    b.addEventListener('focus', () => map.highlight(b.dataset.go)); b.addEventListener('blur', () => map.highlight(null));
  });
  body.querySelectorAll('[data-focus]').forEach(b => {
    const f = BM.FOCUS.find(x => x.id === b.dataset.focus);
    b.addEventListener('click', () => { BM.store.setFocus(rid, f.id); BM.toast(f.ico + ' ' + r.name + ' now grows with a ' + f.name + ' focus.'); });
    const sh = () => { if (sel !== rid) return; const hl = body.querySelector('.focushint'); if (hl) hl.textContent = f.name + ': ' + f.text; rspec.render(BM.specState(rid, { focus:f.id }), true); rspec.highlight(f.id === 'roots' ? 'soil' : f.id === 'leaves' ? 'water' : f.id === 'seeds' ? 'spread' : null); };
    b.addEventListener('pointerenter', sh); b.addEventListener('focus', sh); b.addEventListener('pointerleave', specIdle); b.addEventListener('blur', specIdle);
  });
  body.querySelectorAll('[data-spec]').forEach(b => {
    const x = BM.SPECS.find(q => q.id === b.dataset.spec);
    b.addEventListener('click', () => { if (S.reg[rid].spec) return; const res = BM.store.buySpec(rid, x.id); BM.toast(res.ok ? x.ico + ' ' + x.name + ' built in ' + r.name + '.' : res.reason); });
    if (!S.reg[rid].spec) { const sh = () => { if (sel === rid) rspec.render(BM.specState(rid, { spec:x.id }), true); }; b.addEventListener('pointerenter', sh); b.addEventListener('focus', sh); b.addEventListener('pointerleave', specIdle); b.addEventListener('blur', specIdle); }
  });
}
/* live updates: cheap readouts every tick; anything with buttons only when the player is not pointing at or inside it */
BM.store.on(e => {
  if (mode !== 'region' || !sel) return;
  if (e.type === 'gain' || e.type === 'clock' || e.type === 'init') return;
  if (e.type === 'tick') {
    const v = BM.view(sel);
    const c = slot('chips'); if (c) c.innerHTML = chipsHTML(v);
    const d = slot('dash'); if (d) d.innerHTML = dashHTML(v);
    if (S.t - lastT >= 3 && !paneHover && !regionPane.contains(document.activeElement)) { lastT = S.t; fillRegion(); }
    return;
  }
  paintHeader(); fillRegion();
});

/* ───────── Regions mode (Concept-2 triage, list) ───────── */
const regionsPane = $('p-regions');
let rFilter = 'all', rSort = 'help', rHover = false;
regionsPane.addEventListener('pointerenter', () => { rHover = true; }); regionsPane.addEventListener('pointerleave', () => { rHover = false; map.highlight(null); });
const RANK = { bad:0, warn:1, ok:2 };
function rowHTML(v){
  const living = v.rs.colony === 'living', pct = living ? Math.round(v.rs.est * 100) : 0;
  const cells = ['temp','water','soil','hazard'].map(k => { const c = v.cond[k][0]; return '<span class="mc ' + c + '" title="' + BM.COND_META[k].name + ': ' + BM.ST_WORD[c] + '" aria-hidden="true">' + BM.ST_ICON[c] + '</span>'; }).join('');
  const sr = ['temp','water','soil','hazard'].map(k => BM.COND_META[k].name + ' ' + BM.ST_WORD[v.cond[k][0]]).join(', ');
  const ds = v.limit ? esc(v.limit.text) : living ? 'Doing well · ✦ +' + BM2.income(v.r.id).toFixed(1) + '/s' : 'Ready for seeds';
  return '<li><button type="button" class="r9row" data-go="' + v.r.id + '" aria-current="' + (sel === v.r.id) + '" aria-label="' + v.r.name + '. ' + (v.limit ? BM.ST_WORD[v.st] : 'Thriving') + '. ' + (v.limit ? esc(v.limit.text) + '. ' : '') + sr + '. ' + (living ? 'Stand ' + pct + '%' : 'No colony') + '.">' +
    '<span class="sw" style="background:' + BM.TERRAIN[v.r.terrain] + '" aria-hidden="true"></span>' +
    '<span class="nm">' + (v.r.origin ? '⭐ ' : '') + v.r.name + '</span>' + BM.stHTML(v.st, v.limit ? BM.ST_WORD[v.st] : 'Thriving') +
    '<span class="ds">' + ds + '</span><span class="cd">' + cells + '<span class="pc">' + (living ? pct + '%' : '◌') + '</span></span></button></li>';
}
function renderRegions(){
  const vs = BM.REGIONS.map(r => BM.view(r.id)), n = { bad:0, warn:0, ok:0 };
  vs.forEach(v => n[v.st]++);
  const living = vs.filter(v => v.rs.colony === 'living').length;
  let h = '<div class="r9"><div class="r9-top"><p>' + living + ' colonies · ' + (vs.length - living) + ' empty · hover a row to find it on the map, pick one to inspect it.</p><div class="r9-ctl">' +
    [['all', 'All ' + vs.length], ['bad', '✕ Blocked ' + n.bad], ['warn', '! Strained ' + n.warn], ['ok', '✓ Thriving ' + n.ok]].map(([k, t]) => '<button type="button" data-filter="' + k + '" aria-pressed="' + (rFilter === k) + '">' + t + '</button>').join('') +
    '<span class="sep" role="presentation"></span>' + [['help', 'Needs help'], ['az', 'A–Z'], ['big', 'Biggest']].map(([k, t]) => '<button type="button" data-sort="' + k + '" aria-pressed="' + (rSort === k) + '">' + t + '</button>').join('') +
    '</div></div><div class="r9-scroll">';
  const list = vs.filter(v => rFilter === 'all' || v.st === rFilter);
  if (rSort === 'help') {
    [['bad', '✕ Blocked: something stops your plant'], ['warn', '! Strained: growing slowly'], ['ok', '✓ Thriving']].forEach(([k, t]) => {
      const g = list.filter(v => v.st === k).sort((a, b) => a.r.name.localeCompare(b.r.name)); if (!g.length) return;
      h += '<h3 class="r9-g">' + t + ' · ' + g.length + '</h3><ul class="r9-list">' + g.map(rowHTML).join('') + '</ul>';
    });
  } else {
    const s = list.slice().sort((a, b) => rSort === 'az' ? a.r.name.localeCompare(b.r.name) : (b.rs.colony === 'living' ? b.rs.est : 0) - (a.rs.colony === 'living' ? a.rs.est : 0));
    h += '<ul class="r9-list" style="margin-top:8px">' + s.map(rowHTML).join('') + '</ul>';
  }
  h += '</div></div>';
  const sc = regionsPane.querySelector('.r9-scroll');
  keepScroll(sc, () => BM2.keepFocus(regionsPane, () => { regionsPane.innerHTML = h; }));
  const sc2 = regionsPane.querySelector('.r9-scroll'); if (sc && sc2) sc2.scrollTop = sc.scrollTop;
  regionsPane.querySelectorAll('[data-go]').forEach(b => {
    b.addEventListener('click', () => { map.highlight(null); selectRegion(b.dataset.go, { opener:b, focus:!BM2.viaPointer() }); });
    b.addEventListener('pointerenter', () => map.highlight(b.dataset.go)); b.addEventListener('focus', () => map.highlight(b.dataset.go));
    b.addEventListener('pointerleave', () => map.highlight(null)); b.addEventListener('blur', () => map.highlight(null));
  });
  regionsPane.querySelectorAll('[data-filter]').forEach(b => b.addEventListener('click', () => { rFilter = b.dataset.filter; renderRegions(); }));
  regionsPane.querySelectorAll('[data-sort]').forEach(b => b.addEventListener('click', () => { rSort = b.dataset.sort; renderRegions(); }));
}
BM.store.on(e => {
  if (e.type === 'gain' || e.type === 'clock' || e.type === 'init') return;
  if (e.type !== 'tick') paintRail();
  if (mode !== 'regions') return;
  if (e.type === 'tick' && (S.t % 3 || rHover || regionsPane.contains(document.activeElement))) return;
  renderRegions();
});

/* ───────── Map View (replaces "Lens"): hover / focus previews, click commits ───────── */
const mvPane = $('p-mapview'), legend = $('mvLegend');
let mvHover = null, mvFocus = null;
const COLS = { ok:'#9fd18a', warn:'#f3c46b', bad:'#e98fa6' };
function renderMapView(){
  mvPane.innerHTML = '<div class="mv"><p class="mv-intro">Hover or focus a view to <b>preview</b> it on the map. Click to <b>keep</b> it. The map stays in place.</p>' +
    '<div class="mv-list" role="group" aria-label="Map View">' + BM2.LENSES.map(L => {
      let sum;
      if (!L.id) { const n = BM.REGIONS.filter(r => S.reg[r.id].colony === 'living').length; sum = '<span>' + n + ' living</span>'; }
      else { const st = BM.REGIONS.map(r => BM.view(r.id).cond[L.id][0]); const c = k => st.filter(x => x === k).length;
        sum = '<span>' + (c('bad') ? c('bad') + ' ✕ ' : '') + (c('warn') ? c('warn') + ' ! ' : '') + (!c('bad') && !c('warn') ? 'all ✓' : '') + '</span><span class="dots" aria-hidden="true">' + st.map(k => '<i style="background:' + COLS[k] + '"></i>').join('') + '</span>'; }
      return '<button type="button" class="mv-opt" data-view="' + L.id + '" aria-pressed="false"><span class="mvi" aria-hidden="true">' + L.ico + '</span><span><b>' + (L.id ? L.name : 'Plants (normal)') + '</b><small>' + L.hint + '</small></span><span class="sum">' + sum + '</span></button>';
    }).join('') + '</div>' +
    '<div class="mv-key" aria-hidden="true">Heatmap key: ' + BM.stHTML('ok', 'Fine') + BM.stHTML('warn', 'Strained') + BM.stHTML('bad', 'Blocked') + '</div>' +
    '<p class="mv-state" aria-live="polite"></p></div>';
  const opts = [...mvPane.querySelectorAll('[data-view]')];
  opts.forEach((b, k) => {
    const id = b.dataset.view;
    b.addEventListener('pointerenter', () => { mvHover = id; applyMV(); });
    b.addEventListener('pointerleave', () => { mvHover = null; applyMV(); });
    b.addEventListener('focus', () => { mvFocus = id; applyMV(); });
    b.addEventListener('blur', () => { mvFocus = null; applyMV(); });
    b.addEventListener('click', () => commitView(id));
    b.addEventListener('keydown', e => { const d = { ArrowDown:1, ArrowRight:1, ArrowUp:-1, ArrowLeft:-1 }[e.key]; if (d) { e.preventDefault(); opts[(k + d + opts.length) % opts.length].focus(); } });
  });
  mvHover = null; mvFocus = null; applyMV();
}
function applyMV(){ const p = mvHover !== null ? mvHover : mvFocus; setPreviewView(p === committed ? null : p); }
function setPreviewView(p){
  previewView = p;
  map.setLens(p !== null ? p : committed);
  paintMV();
}
function commitView(id){
  committed = id;
  if (BM.isOpen(wb) && mode === 'mapview') applyMV(); else setPreviewView(null);
  paintRail();
  const L = BM2.LENSES.find(l => l.id === id);
  say('Map View: ' + (id ? L.name : 'Plants, the normal view') + '.');
}
function paintMV(){
  const eff = previewView !== null ? previewView : committed, L = BM2.LENSES.find(l => l.id === eff), C = BM2.LENSES.find(l => l.id === committed);
  mvPane.querySelectorAll('[data-view]').forEach(b => {
    const id = b.dataset.view, on = id === committed, pv = previewView !== null && id === previewView;
    b.setAttribute('aria-pressed', on); b.classList.toggle('previewing', pv);
    b.querySelectorAll('.tagc,.tagp').forEach(n => n.remove());
    if (on) b.insertAdjacentHTML('beforeend', '<span class="tagc" aria-hidden="true">✓ SHOWING</span>');
    else if (pv) b.insertAdjacentHTML('beforeend', '<span class="tagp" aria-hidden="true">PREVIEW · CLICK TO KEEP</span>');
  });
  const st = mvPane.querySelector('.mv-state');
  if (st) st.textContent = previewView !== null ? 'Previewing ' + (eff ? L.name : 'Plants (normal)') + '. Move away to go back to ' + (committed ? C.name : 'Plants') + ', or click to keep it.' : 'Showing ' + (committed ? C.name : 'Plants (normal)') + '.';
  /* legend chip on the map: committed views and previews */
  if (!eff && previewView === null) { legend.hidden = true; return; }
  legend.hidden = false;
  legend.className = 'mv-legend' + (previewView !== null ? ' previewing' : '');
  legend.innerHTML = (previewView !== null ? '<span class="pv">PREVIEW</span>' : '') + '<span>' + L.ico + ' ' + (eff ? L.name : 'Plants (normal)') + '</span>' +
    (eff ? BM.stHTML('ok', 'Fine') + BM.stHTML('warn', '') + BM.stHTML('bad', '') : '') +
    (previewView === null && committed ? '<button type="button" class="clr" aria-label="Back to the normal Plants view">✕ Plants</button>' : '');
  const clr = legend.querySelector('.clr'); if (clr) clr.addEventListener('click', () => commitView(''));
}

/* ───────── Adapt / Spread / Terraform: the same workbench, previews on the real (uncovered) map ───────── */
const boards = {};
['adapt', 'spread', 'terraform'].forEach(b => boards[b] = BM2.board($('p-' + b), b, { map, rid:() => sel, onPreview:verdict, onBought:() => tagCards(b) }));
function paintCtx(){
  const up = !!boards[mode];
  ctxBar.hidden = !up;
  if (!up) return;
  if (sel) {
    const v = BM.view(sel);
    ctxBar.innerHTML = '<span class="pin">📍 Considering for <b>' + v.r.name + '</b></span>' + BM.stHTML(v.st, v.limit ? BM.ST_WORD[v.st] : 'Thriving') +
      '<button type="button" class="ctx-x" aria-label="Stop considering ' + v.r.name + '">✕ Clear</button>' +
      '<span class="glob">🌍 Global upgrade: it applies everywhere, not only here.</span><span class="verdict" aria-live="polite"></span>';
    ctxBar.querySelector('.ctx-x').addEventListener('click', () => { sel = null; map.select(null); paintCtx(); boards[mode].show(); tagCards(mode); });
  } else {
    ctxBar.innerHTML = '<span class="pin">🌍 Global upgrades</span><span class="glob">Each upgrade applies everywhere. Click a region on the map to inspect it, then come back here to weigh it for that region.</span><span class="verdict" aria-live="polite"></span>';
  }
}
function verdict(pid){
  const el = ctxBar.querySelector('.verdict'); if (!el) return;
  if (!pid) { el.className = 'verdict'; el.textContent = sel ? 'Hover or focus a card to see what it does for ' + BM.region(sel).name + ' and the rest of the planet.' : 'Hover or focus a card: the map shows + where land opens and − where it gets harder.'; return; }
  const it = BM.item(pid), p = BM.previewOf(pid), elsewhere = p.open.filter(x => x !== sel).length;
  if (!sel) { el.className = 'verdict none'; el.textContent = it.name + ': opens ' + p.open.length + ', harder ' + p.worse.length + ' (see the map).'; return; }
  const nm = BM.region(sel).name;
  if (BM.store.owned(pid)) { el.className = 'verdict none'; el.textContent = 'Already owned.'; }
  else if (p.open.includes(sel)) { el.className = 'verdict help'; el.textContent = '✓ Would open ' + nm + (elsewhere ? ', plus ' + elsewhere + ' more region' + (elsewhere > 1 ? 's' : '') + ' on the map.' : '.'); }
  else if (p.worse.includes(sel)) { el.className = 'verdict hurt'; el.textContent = '− Would make ' + nm + ' harder.' + (p.open.length ? ' Opens ' + p.open.length + ' elsewhere.' : ''); }
  else { el.className = 'verdict none'; el.textContent = 'No direct change to ' + nm + '. ' + (p.open.length || p.worse.length ? 'It still changes ' + (p.open.length + p.worse.length) + ' region' + (p.open.length + p.worse.length > 1 ? 's' : '') + ' elsewhere.' : 'Applies planet-wide.'); }
}
function tagCards(b){
  const p0 = $('p-' + b);
  p0.querySelectorAll('.tcard').forEach(card => {
    let tg = card.querySelector('.ctx-tag');
    if (!tg) { tg = document.createElement('span'); tg.className = 'ctx-tag'; tg.setAttribute('aria-hidden', 'true'); card.querySelector('.t-top').appendChild(tg); }
    const id = card.dataset.id, p = BM.previewOf(id);
    if (sel && !BM.store.owned(id) && p.open.includes(sel)) { tg.hidden = false; tg.className = 'ctx-tag help'; tg.textContent = '📍 helps ' + BM.region(sel).name; }
    else if (sel && !BM.store.owned(id) && p.worse.includes(sel)) { tg.hidden = false; tg.className = 'ctx-tag hurt'; tg.textContent = '− harder for ' + BM.region(sel).name; }
    else tg.hidden = true;
  });
}

/* ───────── design-review switch ───────── */
function setVariant(v){
  variant = v;
  try { localStorage.setItem('bloomC9Variant', v); } catch (e) {}
  vsw.querySelectorAll('[data-variant]').forEach(b => b.setAttribute('aria-pressed', b.dataset.variant === v ? 'true' : 'false'));
  if (mode === 'region') buildRegion();
}
vsw.querySelectorAll('[data-variant]').forEach(b => b.addEventListener('click', () => setVariant(b.dataset.variant)));
setVariant(variant);

/* QA / review hooks (read-only views of mockup state) */
window.C9 = {
  get mode(){ return mode; }, get sel(){ return sel; }, get variant(){ return variant; },
  get committed(){ return committed; }, get preview(){ return previewView; }, setVariant,
};

paintRail();
setTimeout(() => BM.toast('Click any region. Its details open in the side workbench, and the map stays visible.'), 600);
})();
