/*
  BLOOM UI concept mockups — REFINEMENT (BLOOM-020, + BLOOM-021 top banner) · Concept 10 — Refined unified workbench.
  Loads AFTER shared.js + r2.js.

  VISUAL CONCEPT MOCKUP ONLY. Everything is still the BLOOM-017 fake world (BM.*) plus round-2 components (BM2.*): fake planet,
  fake Biomass clock, scripted trait effects. Nothing here loads or calls the engine, generator, validator, scenarios, balance
  data or Bloom Report. Pause / speed only drive the fake clock.

  Forked from c9.js (Concept 9 stays unchanged). Owner direction after BLOOM-019 (docs/UI_CONCEPT_REVIEW_v4.md):
    - keep the one side workbench and its six modes: Region · Regions · Map View · Adapt · Spread · Terraform;
    - Region details use layout A (fixed summary + Overview / Colony / Science tabs) only;
    - the workbench is top-aligned and only as tall as its content (max-height + internal scroll), never a full-height slab;
    - no permanent full-height tool rail. Review-only switch, same modes and selection either way:
        dock  · 1 Attached dock: a short Explore / Change dock joined to the panel; a small floating stack when closed;
        panel · 2 In-panel navigation: Explore / Change controls in the panel header; a small "Tools" opener when closed;
        top   · 3 Top banner (BLOOM-021): compact Explore / Change controls in the HUD between the run status and Pause / speed;
                no dock and no opener over the planet; Region has no banner button (map click, Details or a Regions row opens it).
                A second review-only switch compares icon + text with icons only (?labels=text|icons); tooltips either way;
    - opening reframes the map once; region → region, mode → mode and dock ↔ panel never move it again; closing restores it;
    - while Adapt / Spread / Terraform is open, a map click on ANOTHER region changes "Considering for" and stays in the mode.
      Clicking the selected region again, the context bar's "Details" button or the Region tool opens Region details.
*/
(function(){
'use strict';
const S = BM.store.s, esc = BM.esc, $ = id => document.getElementById(id);

/* ───────── ribbon + review-only Tool access switch ───────── */
BM.ribbon('Concept 10 · Refined unified workbench');
const rib = document.querySelector('.mock-ribbon');
const back = rib.querySelector('a'); back.href = 'index.html#refinement'; back.setAttribute('aria-label', 'Back to the mockup gallery, Refinement');
rib.querySelector('.tag').textContent = 'REFINEMENT MOCKUP';
const ACCESS = [['dock', '1', 'Attached dock', 'Dock'], ['panel', '2', 'In-panel navigation', 'In-panel'], ['top', '3', 'Top banner', 'Top']];
const ACCESS_IDS = ACCESS.map(a => a[0]);
const vsw = document.createElement('div');
vsw.className = 'vswitch'; vsw.setAttribute('role', 'group'); vsw.setAttribute('aria-label', 'Design review only, not game UI: Tool access');
vsw.innerHTML = '<span class="vl" aria-hidden="true">Review only · Tool access</span>' +
  ACCESS.map(([k, n, t, sh]) => '<button type="button" data-tools="' + k + '" aria-pressed="false" title="Tool access ' + n + ': ' + t + ' (design review only)"><b>' + n + '</b><span><span class="lg">' + t + '</span><span class="sh">' + sh + '</span></span></button>').join('');
rib.insertBefore(vsw, rib.querySelector('.spacer').nextSibling);
/* BLOOM-021: second review-only switch, shown only for 3 · Top banner — icon + text vs icons only */
const lsw = document.createElement('div');
lsw.className = 'vswitch lsw'; lsw.setAttribute('role', 'group'); lsw.setAttribute('aria-label', 'Design review only, not game UI: top-banner tool labels');
lsw.innerHTML = '<span class="vl" aria-hidden="true">Labels</span>' +
  [['text', 'Icon + text', 'Text'], ['icons', 'Icons only', 'Icons']].map(([k, t, sh]) => '<button type="button" data-labels="' + k + '" aria-pressed="false" title="Top-banner labels: ' + t + (k === 'text' ? ' where it fits (below 1200 px wide the banner always shows icons only)' : '') + ' (design review only)"><span><span class="lg">' + t + '</span><span class="sh">' + sh + '</span></span></button>').join('') +
  '<span class="auto" aria-hidden="true">icons at this width</span>';
rib.insertBefore(lsw, vsw.nextSibling);

let access = 'dock', labels = 'text';
try { const m = localStorage.getItem('bloomC10Tools'); if (ACCESS_IDS.includes(m)) access = m; } catch (e) {}
try { const m = localStorage.getItem('bloomC10Labels'); if (m === 'text' || m === 'icons') labels = m; } catch (e) {}
const qs = new URLSearchParams(location.search), qv = qs.get('tools'), ql = qs.get('labels');
if (ACCESS_IDS.includes(qv)) access = qv;
if (ql === 'text' || ql === 'icons') labels = ql;

/* ───────── top status banner (carried from Concept 9) ───────── */
const banner = $('banner');
banner.innerHTML =
  '<div class="bn-cov"><span class="bn-k"><span aria-hidden="true">🌍</span> In bloom</span><span class="bn-v"><b class="v">0%</b><small><span class="bn-x">of the land · </span>goal 70%</small></span>' +
    '<span class="bar"><i></i><span class="goal" style="left:70%"></span></span><span class="bn-sub"><b class="liv">0</b> of 10 regions living</span></div>' +
  '<div class="bn-bio biomass"><span class="ico" aria-hidden="true">✦</span><span><span class="lbl">Biomass</span><span class="num">0</span><span class="rate"></span></span></div>' +
  '<div class="bn-scn"><span class="bn-k"><span aria-hidden="true">💨</span> Dying World</span><span class="bn-v"><b class="v">0%</b><small><span class="bn-x">of the </span>air lost</small></span>' +
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
const world = $('world'), bench = $('bench'), wb = $('wb'), dock = $('dock'), nav = $('nav'), opener = $('opener'), live = $('c10live');
const top = $('topTools'), topBar = document.querySelector('.top9'), tip = $('tip');
const map = window.map = BM.mountMap($('mapwrap'), { labels:'all', onSelect:id => selectRegion(id, { via:'map' }) });
const regionEl = id => document.querySelector('#mapwrap .rg[data-r="' + id + '"]');
const say = t => { live.textContent = ''; setTimeout(() => { live.textContent = t; }, 30); };

/* ───────── state ───────── */
let mode = null, sel = null, lastOpener = null, lastTool = 'regions';
let committed = '', previewView = null, tab = 'over';
const MODES = {
  region:{ ico:'📍', label:'Explore · Region' },
  regions:{ ico:'🗂', label:'Explore · Regions', title:'Every region at a glance' },
  mapview:{ ico:'🗺️', label:'Explore · Map View', title:'Colour the map by…' },
  adapt:{ ico:'🌿', label:'Change · your plant', title:'Adapt your plant' },
  spread:{ ico:'🌱', label:'Change · how seeds travel', title:'Spread your seeds' },
  terraform:{ ico:'🌍', label:'Change · the planet', title:'Terraform the planet' },
};
const isBoard = m => m === 'adapt' || m === 'spread' || m === 'terraform';
const panes = [...wb.querySelectorAll('.pane')];
const hIco = wb.querySelector('.mi'), hLbl = wb.querySelector('.ml'), hT = $('wbT'), wbHead = wb.querySelector('.wb10-h'), ctxBar = $('ctx');

/* ───────── tools: ONE list, three presentations (attached dock / in-panel navigation / top banner) ───────── */
const GROUPS = [
  ['explore', 'Explore', [['region', '📍', 'Region'], ['regions', '🗂', 'Regions'], ['mapview', '🗺️', 'Map View']]],
  ['change', 'Change', [['adapt', '🌿', 'Adapt'], ['spread', '🌱', 'Spread'], ['terraform', '🌍', 'Terraform']]],
];
/* BLOOM-021 decision: the top banner has no Region button. A map click always opens Region; from Adapt / Spread / Terraform the
   context bar's Details (or clicking the selected region again) returns to it; a Regions row leads into it too. */
const KIND = { dock:['tl10', 'dk-g', 'dk-h', false], panel:['nv10', 'ng', 'ng-h', true], top:['tt10', 'tg', 'tg-h', true] };
function toolsHTML(kind){
  const [cls, gcls, hcls, track] = KIND[kind];
  return GROUPS.map(([g, gn, items], k) => (k && kind === 'dock' ? '<span class="dk-div" role="presentation"></span>' : '') +
    '<div class="' + gcls + ' g-' + g + '" role="group" aria-labelledby="' + kind + 'H-' + g + '"><span class="' + hcls + '" id="' + kind + 'H-' + g + '">' + gn + '</span>' +
      (track ? '<span class="' + (kind === 'top' ? 'tg-b' : 'ng-b') + '">' : '') +
      items.filter(([id]) => !(kind === 'top' && id === 'region')).map(([id, ico, n]) => '<button type="button" class="' + cls + '" data-tool="' + id + '" aria-pressed="false" aria-controls="wb"><span class="ti" aria-hidden="true">' + ico + '</span><span class="tn">' + n + '</span>' +
        (id === 'regions' ? '<span class="badge" aria-hidden="true">0</span>' : '') + (id === 'mapview' ? '<span class="vdot" aria-hidden="true" hidden></span>' : '') + '</button>').join('') +
      (track ? '</span>' : '') + '</div>').join('');
}
dock.innerHTML = toolsHTML('dock');
nav.innerHTML = toolsHTML('panel');
top.innerHTML = toolsHTML('top');
const hosts = { dock, panel:nav, top };
const allTools = () => [...dock.querySelectorAll('[data-tool]'), ...nav.querySelectorAll('[data-tool]'), ...top.querySelectorAll('[data-tool]')];
const isTool = el => !!(el && el.dataset && el.dataset.tool && (dock.contains(el) || nav.contains(el) || top.contains(el)));
const toolBtn = t => hosts[access].querySelector('[data-tool="' + t + '"]');
allTools().forEach(b => b.addEventListener('click', () => {
  const t = b.dataset.tool, outside = !!b.closest('#dock, #topTools');
  if (t === 'region' && !sel) { BM.toast('📍 Click a region on the map to see its details here.'); say('No region selected. Click a region on the map to see its details.'); return; }
  lastOpener = b;
  hideTip();
  /* pressing the active tool again closes the workbench when the tools live outside it (dock, top banner) */
  if (mode === t) { if (outside) closeBench(); return; }
  setMode(t, { opener:b, focus:!BM2.viaPointer() });
}));

/* top-banner tooltips: name + what it does (+ state). Hover shows after a short delay; keyboard focus shows at once. */
const TIPS = { regions:'Every region at a glance', mapview:'Colour the map by temperature, water, soil or hazard', adapt:'Change your plant', spread:'Change how seeds travel', terraform:'Change the planet' };
let tipT = 0, tipFor = null, tipGone = 0;
function tipHTML(b){
  const t = b.dataset.tool, n = GROUPS.flatMap(g => g[2]).find(x => x[0] === t)[2];
  let extra = '';
  if (t === 'regions') { const k = BM.REGIONS.filter(r => BM.view(r.id).st !== 'ok').length; extra = k + ' need help'; }
  if (t === 'mapview') { const L = BM2.LENSES.find(l => l.id === committed); extra = 'Showing ' + (committed ? L.name : 'Plants (normal)'); }
  return '<b>' + n + '</b><span>' + TIPS[t] + (extra ? ' · ' + extra : '') + '</span>' + (t === mode ? '<em>Open · press again to close</em>' : '');
}
function showTip(b){
  clearTimeout(tipT); tipFor = b;
  tip.innerHTML = tipHTML(b); tip.hidden = false;
  const r = b.getBoundingClientRect(), w = tip.offsetWidth, x = Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2));
  tip.style.left = x + 'px'; tip.style.top = (r.bottom + 12) + 'px';
  tip.style.setProperty('--ax', (r.left + r.width / 2 - x) + 'px');
}
function hideTip(){ clearTimeout(tipT); if (!tip.hidden) tipGone = performance.now(); tipFor = null; tip.hidden = true; }
top.querySelectorAll('[data-tool]').forEach(b => {
  /* moving along the bar while a tooltip is (or was just) showing switches it at once; a cold hover waits a moment */
  b.addEventListener('pointerenter', () => { clearTimeout(tipT); tipT = setTimeout(() => showTip(b), !tip.hidden || performance.now() - tipGone < 400 ? 0 : 280); });
  b.addEventListener('pointerleave', hideTip);
  b.addEventListener('focus', () => { if (b.matches(':focus-visible')) showTip(b); });
  b.addEventListener('blur', hideTip);
});
/* Esc dismisses a showing tooltip first (and only that), so it can be hidden without moving focus or closing anything */
window.addEventListener('keydown', e => { if (e.key === 'Escape' && !tip.hidden) { e.preventDefault(); e.stopImmediatePropagation(); hideTip(); } }, true);
opener.addEventListener('click', () => { lastOpener = opener; setMode(lastTool, { opener, focus:!BM2.viaPointer() }); });
function paintTools(){
  const n = BM.REGIONS.filter(r => BM.view(r.id).st !== 'ok').length;
  const L = BM2.LENSES.find(l => l.id === committed);
  allTools().forEach(b => {
    const t = b.dataset.tool;
    b.setAttribute('aria-pressed', t === mode ? 'true' : 'false');
    if (t === 'region') {
      b.setAttribute('aria-disabled', sel ? 'false' : 'true');
      b.title = sel ? 'Region details: ' + BM.region(sel).name : 'Click a region on the map first';
      b.setAttribute('aria-label', sel ? 'Region details: ' + BM.region(sel).name : 'Region details. No region selected: click a region on the map');
    } else if (top.contains(b) && TIPS[t] && t !== 'mapview' && t !== 'regions') {
      b.setAttribute('aria-label', b.querySelector('.tn').textContent + ': ' + TIPS[t].toLowerCase());
    } else if (t === 'regions') {
      b.querySelector('.badge').textContent = n;
      b.setAttribute('aria-label', 'Regions: browse every region. ' + n + ' need help');
    } else if (t === 'mapview') {
      b.querySelector('.ti').textContent = committed ? L.ico : '🗺️';
      b.querySelector('.vdot').hidden = !committed;
      if (!top.contains(b)) b.title = 'Map View: ' + (committed ? L.name : 'Plants');
      b.setAttribute('aria-label', 'Map View: showing ' + (committed ? L.name : 'Plants, the normal view') + '. Choose what the map shows');
    }
  });
  if (tipFor && !tip.hidden) tip.innerHTML = tipHTML(tipFor);
}

/* ───────── opening / switching / closing the ONE workbench ───────── */
function setMode(m, o){
  o = o || {};
  const first = !BM.isOpen(wb);
  if (mode && mode !== m) leave(mode);
  mode = m;
  if (m !== 'region') lastTool = m;
  panes.forEach(p => p.hidden = p.dataset.mode !== m);
  wb.dataset.mode = m;
  paintHeader(); paintTools(); paintCtx();
  enter(m);
  $('wbBody').scrollTop = 0;
  if (first) {
    world.classList.add('wb-open'); document.body.classList.add('wb-open');
    BM.openLayer(wb, o.opener || document.activeElement, { noFocus:true, onClose });
    paintAccess();
  }
  if (o.focus) setTimeout(() => { if (o.card && boards[m]) boards[m].focusCard(o.card); else hT.focus({ preventScroll:true }); }, 60);
  else if (o.card && boards[m]) setTimeout(() => boards[m].focusCard(o.card), 60);
}
function leave(m){
  if (boards[m]) boards[m].hide();
  if (m === 'mapview') setPreviewView(null);
  if (m === 'region') map.setPreview(null);
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
  paintTools(); paintAccess();
}
function closeBench(){
  if (!BM.isOpen(wb)) return;
  const backTo = lastOpener, was = mode;
  BM.closeLayer(wb, { noReturn:true });
  /* the panel is now closing: never return focus into it. Fall back to the visible launcher for the same tool. */
  let f = backTo && document.contains(backTo) && !wb.contains(backTo) && !backTo.closest('[hidden]') && backTo.getClientRects().length ? backTo : null;
  if (!f) f = access === 'panel' ? opener : hosts[access].querySelector('[data-tool="' + (was === 'region' ? 'regions' : was) + '"]');
  if (f) f.focus({ preventScroll:true });
}
/* Esc closes the workbench and returns focus to whatever opened the current mode (region, dock tool or Tools opener) */
window.addEventListener('keydown', e => { if (e.key === 'Escape' && BM.isOpen(wb)) { e.preventDefault(); e.stopPropagation(); closeBench(); } }, true);
$('wbX').addEventListener('click', closeBench);

function paintHeader(){
  const M = MODES[mode];
  hIco.textContent = M.ico; hLbl.textContent = M.label;
  hT.textContent = mode === 'region' ? BM.region(sel).name : M.title;
  wb.setAttribute('aria-label', 'Workbench: ' + (mode === 'region' ? 'Region, ' + BM.region(sel).name : M.title));
}

/* ───────── region selection (the core interaction) ───────── */
function selectRegion(id, o){
  o = o || {};
  const changed = sel !== id;
  /* BLOOM-020: in Adapt / Spread / Terraform a click on ANOTHER region re-targets "Considering for" and stays in the mode.
     The mode's opener (its tool) stays the Esc focus-return target: the region click did not open anything. */
  if (o.via === 'map' && isBoard(mode) && BM.isOpen(wb) && changed) {
    sel = id; map.select(id);
    retarget();
    const v = BM.view(id);
    say('Now considering ' + v.r.name + ' in ' + MODES[mode].title + '. ' + (v.limit ? BM.ST_WORD[v.st] + ': ' + v.limit.text + '. ' : '') + 'Click it again, or press Details, to open the region.');
    return;
  }
  if (o.via === 'map') lastOpener = regionEl(id);
  sel = id; map.select(id);
  if (mode === 'region') {
    if (changed) { paintHeader(); paintTools(); fillRegion(); swapFlash(wbHead); }
  } else setMode('region', { opener:o.via === 'map' ? regionEl(id) : o.opener, focus:!!o.focus });
  const v = BM.view(id);
  say(v.r.name + '. ' + (v.limit ? BM.ST_WORD[v.st] + ': ' + v.limit.text : 'Thriving') + '. Details are in the workbench.');
}
function retarget(){
  paintCtx(); paintTools();
  boards[mode].show(); tagCards(mode); verdict(null);
  swapFlash(ctxBar);
}
function swapFlash(el){ if (BM.reduceMotion) return; el.classList.remove('swap'); void el.offsetWidth; el.classList.add('swap'); }

/* ───────── Region workbench: layout A · tabbed (owner choice after BLOOM-019) ───────── */
const regionPane = $('p-region');
const rspec = BM.mountSpecimen(document.createElement('div'), { compact:true });
let paneHover = false, lastT = 0;
regionPane.addEventListener('pointerenter', () => { paneHover = true; }); regionPane.addEventListener('pointerleave', () => { paneHover = false; });
const TABS = [['over', '🔎', 'Overview'], ['colony', '🌱', 'Colony'], ['sci', '🔬', 'Science']];
function buildRegion(){
  regionPane.innerHTML = '<div class="rv rv-a"><div class="rv-sum"><div class="slot-spec"></div><div><div class="rv-chips" data-s="chips"></div><div data-s="limit"></div><div class="rp-fix" data-s="fix"></div></div></div>' +
    '<div class="rtabs" role="tablist" aria-label="Region details">' + TABS.map(([id, ico, n]) =>
      '<button type="button" role="tab" id="c10t-' + id + '" data-tab="' + id + '" aria-controls="c10tab"><span aria-hidden="true">' + ico + '</span>' + n + '</button>').join('') + '</div>' +
    '<div class="rv-body" id="c10tab" data-s="tab" role="tabpanel" tabindex="0"></div></div>';
  regionPane.querySelector('.slot-spec').appendChild(rspec.el);
  regionPane.querySelectorAll('[role=tab]').forEach((t, k, all) => {
    t.addEventListener('click', () => setTab(t.dataset.tab));
    t.addEventListener('keydown', e => {
      const d = { ArrowRight:1, ArrowLeft:-1 }[e.key];
      if (d) { e.preventDefault(); const n = all[(k + d + all.length) % all.length]; setTab(n.dataset.tab); n.focus(); }
    });
  });
  fillRegion();
}
function setTab(t){ tab = t; fillTab(); }
const slot = k => regionPane.querySelector('[data-s="' + k + '"]');

/* section HTML (same content as Concept 9 layout A). To keep Region a medium-height panel, Overview is the four conditions only:
   stand density and Biomass are already in the summary chips, so their detail moved to Colony, and "Recent" moved to Science. */
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
  return '<span class="fx-h">Could help · hover to preview</span>' + v.fixers.map(it => { const k = BM.BOARDS[it.board].kind;
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

/* fill / refresh */
function fillTab(){
  const body = slot('tab'); if (!body) return;
  const v = BM.view(sel);
  regionPane.querySelectorAll('[role=tab]').forEach(b => { const on = b.dataset.tab === tab; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; });
  body.setAttribute('aria-labelledby', 'c10t-' + tab);
  const h = tab === 'over' ? condTilesHTML(v) : tab === 'colony' ? statsHTML(v) + focusHTML(v) : sciHTML(v) + nearHTML(v) + logHTML(v);
  BM2.keepFocus(body, () => { body.innerHTML = h; });
  bindBody(body);
}
function fillRegion(){
  if (!sel || mode !== 'region') return;
  const v = BM.view(sel);
  const put = (k, h) => { const el = slot(k); if (el) BM2.keepFocus(el, () => { el.innerHTML = h; }); };
  put('chips', chipsHTML(v)); put('limit', limitHTML(v)); put('fix', fixHTML(v));
  bindFix(slot('fix'));
  fillTab();
  specIdle();
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
    b.addEventListener('click', () => { off(); lastOpener = toolBtn(it.board); setMode(it.board, { card:id }); });
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
    const c = slot('chips'); if (c) c.innerHTML = chipsHTML(BM.view(sel));
    if (S.t - lastT >= 3 && !paneHover && !regionPane.contains(document.activeElement)) { lastT = S.t; fillRegion(); }
    return;
  }
  paintHeader(); fillRegion();
});

/* ───────── Regions mode (Concept-2 triage, list) ───────── */
const regionsPane = $('p-regions');
let rFilter = 'all', rSort = 'help', rHover = false;
regionsPane.addEventListener('pointerenter', () => { rHover = true; }); regionsPane.addEventListener('pointerleave', () => { rHover = false; map.highlight(null); });
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
  const sc = regionsPane.querySelector('.r9-scroll'), top = sc ? sc.scrollTop : 0;
  BM2.keepFocus(regionsPane, () => { regionsPane.innerHTML = h; });
  const sc2 = regionsPane.querySelector('.r9-scroll'); if (sc2) sc2.scrollTop = top;
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
  if (e.type !== 'tick') paintTools();
  if (mode !== 'regions') return;
  if (e.type === 'tick' && (S.t % 3 || rHover || regionsPane.contains(document.activeElement))) return;
  renderRegions();
});

/* ───────── Map View: hover / focus previews, click commits (unchanged from Concept 9, compact rows) ───────── */
const mvPane = $('p-mapview'), legend = $('mvLegend');
let mvHover = null, mvFocus = null;
const COLS = { ok:'#9fd18a', warn:'#f3c46b', bad:'#e98fa6' };
function renderMapView(){
  mvPane.innerHTML = '<div class="mv"><p class="mv-state" aria-live="polite"></p>' +
    '<div class="mv-list" role="group" aria-label="Map View">' + BM2.LENSES.map(L => {
      let sum;
      if (!L.id) { const n = BM.REGIONS.filter(r => S.reg[r.id].colony === 'living').length; sum = '<span>' + n + ' living</span>'; }
      else { const st = BM.REGIONS.map(r => BM.view(r.id).cond[L.id][0]); const c = k => st.filter(x => x === k).length;
        sum = '<span>' + (c('bad') ? c('bad') + ' ✕ ' : '') + (c('warn') ? c('warn') + ' ! ' : '') + (!c('bad') && !c('warn') ? 'all ✓' : '') + '</span><span class="dots" aria-hidden="true">' + st.map(k => '<i style="background:' + COLS[k] + '"></i>').join('') + '</span>'; }
      return '<button type="button" class="mv-opt" data-view="' + L.id + '" aria-pressed="false"><span class="mvi" aria-hidden="true">' + L.ico + '</span><span><b>' + (L.id ? L.name : 'Plants (normal)') + '</b><small>' + L.hint + '</small></span><span class="sum">' + sum + '</span></button>';
    }).join('') + '</div>' +
    '<div class="mv-key" aria-hidden="true">Heatmap key: ' + BM.stHTML('ok', 'Fine') + BM.stHTML('warn', 'Strained') + BM.stHTML('bad', 'Blocked') + '</div></div>';
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
  paintTools();
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
  if (st) st.textContent = previewView !== null ? 'Previewing ' + (eff ? L.name : 'Plants (normal)') + '. Move away to go back to ' + (committed ? C.name : 'Plants') + ', or click to keep it.' : 'Showing ' + (committed ? C.name : 'Plants (normal)') + '. Hover or focus a view to preview it on the map; click to keep it.';
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
/* content-height: one flat two-column card grid (no category headings), and no separate "On the planet" block — the context
   line's verdict and the +/− marks on the real map carry that information, so the panel does not jump while hovering */
['adapt', 'spread', 'terraform'].forEach(b => boards[b] = BM2.board($('p-' + b), b, { map, rid:() => sel, onPreview:verdict, onBought:() => tagCards(b), flat:true, groups:false, effects:false }));
function paintCtx(){
  const up = isBoard(mode);
  ctxBar.hidden = !up;
  if (!up) return;
  if (sel) {
    const v = BM.view(sel);
    ctxBar.innerHTML = '<span class="pin">📍 Considering for <b>' + v.r.name + '</b></span><span class="stw" title="' + (v.limit ? BM.ST_WORD[v.st] + ': ' + esc(v.limit.text) : 'Thriving') + '">' + BM.stHTML(v.st, ' ') + '<span class="sr-only">' + (v.limit ? BM.ST_WORD[v.st] : 'Thriving') + '</span></span>' +
      '<span class="ctx-acts"><button type="button" class="ctx-d" aria-label="Open Region details for ' + v.r.name + '">📍 Details</button>' +
      '<button type="button" class="ctx-x" aria-label="Stop considering ' + v.r.name + '">✕</button></span>' +
      '<span class="glob">🌍 Global upgrade: applies everywhere. <b>Click another region</b> on the map to consider it.</span><span class="verdict" aria-live="polite"></span>';
    ctxBar.querySelector('.ctx-d').addEventListener('click', e => { lastOpener = toolBtn('region') || toolBtn(mode); setMode('region', { focus:!BM2.viaPointer() }); });
    ctxBar.querySelector('.ctx-x').addEventListener('click', () => { sel = null; map.select(null); paintCtx(); paintTools(); boards[mode].show(); tagCards(mode); toolBtn(mode) && toolBtn(mode).focus({ preventScroll:true }); });
  } else {
    ctxBar.innerHTML = '<span class="pin">🌍 Global upgrades</span><span class="glob">Each applies everywhere. <b>Click a region</b> on the map to weigh them for it.</span><span class="verdict" aria-live="polite"></span>';
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
  $('p-' + b).querySelectorAll('.tcard').forEach(card => {
    let tg = card.querySelector('.ctx-tag');
    if (!tg) { tg = document.createElement('span'); tg.className = 'ctx-tag'; tg.setAttribute('aria-hidden', 'true'); card.querySelector('.t-top').after(tg); }   // own line under the title
    const id = card.dataset.id, p = BM.previewOf(id);
    if (sel && !BM.store.owned(id) && p.open.includes(sel)) { tg.hidden = false; tg.className = 'ctx-tag help'; tg.textContent = '📍 helps ' + BM.region(sel).name; }
    else if (sel && !BM.store.owned(id) && p.worse.includes(sel)) { tg.hidden = false; tg.className = 'ctx-tag hurt'; tg.textContent = '− harder for ' + BM.region(sel).name; }
    else tg.hidden = true;
  });
}

/* ───────── design-review switch: Tool access 1 · Attached dock / 2 · In-panel navigation / 3 · Top banner ───────── */
function paintAccess(){
  const open = BM.isOpen(wb);
  bench.dataset.tools = access;
  dock.hidden = access !== 'dock';
  nav.hidden = access !== 'panel';
  top.hidden = access !== 'top';
  topBar.classList.toggle('has-tools', access === 'top');
  opener.hidden = access !== 'panel' || open;
  lsw.hidden = access !== 'top';
  if (access !== 'top') hideTip();
}
function setTools(v){
  const had = document.activeElement, hadTool = isTool(had) ? had.dataset.tool : null;
  const hadOpener = had === opener;
  access = v;
  try { localStorage.setItem('bloomC10Tools', v); } catch (e) {}
  vsw.querySelectorAll('[data-tools]').forEach(b => b.setAttribute('aria-pressed', b.dataset.tools === v ? 'true' : 'false'));
  paintAccess(); paintTools();
  if (isTool(lastOpener)) lastOpener = toolBtn(lastOpener.dataset.tool);   // null when the top banner has no Region button: closing falls back
  /* keep keyboard focus on the equivalent control when the one it was on disappears */
  const near = () => toolBtn(mode && mode !== 'region' ? mode : 'regions');
  if (hadTool) { const b = toolBtn(hadTool) || (access === 'top' ? near() : null); if (b && b.getClientRects().length) b.focus({ preventScroll:true }); else if (!opener.hidden) opener.focus({ preventScroll:true }); }
  else if (hadOpener && opener.hidden) { const b = toolBtn(lastTool); if (b) b.focus({ preventScroll:true }); }
}
vsw.querySelectorAll('[data-tools]').forEach(b => b.addEventListener('click', () => setTools(b.dataset.tools)));
setTools(access);
function setLabels(v){
  labels = v;
  try { localStorage.setItem('bloomC10Labels', v); } catch (e) {}
  lsw.querySelectorAll('[data-labels]').forEach(b => b.setAttribute('aria-pressed', b.dataset.labels === v ? 'true' : 'false'));
  top.classList.toggle('icons', v === 'icons');
  hideTip();
}
lsw.querySelectorAll('[data-labels]').forEach(b => b.addEventListener('click', () => setLabels(b.dataset.labels)));
setLabels(labels);

/* QA / review hooks (read-only views of mockup state) */
window.C10 = {
  get mode(){ return mode; }, get sel(){ return sel; }, get tools(){ return access; },
  get committed(){ return committed; }, get preview(){ return previewView; }, get labels(){ return labels; }, setTools, setLabels,
};

paintTools();
setTimeout(() => BM.toast('Click any region. Its details open in the workbench, and the map stays visible.'), 600);
})();
