/*
  BLOOM UI concept mockups — ROUND 2 (BLOOM-018) shared components. Loads AFTER shared.js.

  VISUAL CONCEPT MOCKUPS ONLY. Everything is still the BLOOM-017 fake world (BM.*): fake planet, fake Biomass clock, scripted
  trait effects. Nothing here loads or calls the engine, generator, validator, scenarios, balance data or Bloom Report.

  Round-2 owner direction baked in here (docs/UI_CONCEPT_REVIEW_v2.md):
    - persistent Pause / Play + speed 1× → 2× → 4× (fake clock only)
    - ONE compact map-lens control (four treatments), never a permanent four-button block
    - rich region inspector with tabs (no "More ▾" expansion) and a medium contextual specimen
    - Adapt changes the organism; Terraform previews change ONLY the scene around it (plant layers are never re-derived)
    - Concept-2-style Regions browser (four treatments)

  Exposes window.BM2:
    BM2.ribbon(name)                            round-2 ribbon (back link → gallery Round 2)
    BM2.hud(host, opts) / clockControls(host) / pausedFlag(host)
    BM2.lens(host, map, opts)                   styles: menu | tool | expand | dropdown
    BM2.inspector(opts)                         modes: anchored | sidecar; tab styles: top | seg | pill | side
    BM2.board(host, boardId, opts)              Adapt / Spread / Terraform content (specimen + cards + map preview + effects)
    BM2.regions(host, opts)                     styles: grouped | matrix | kanban | list
    BM2.specFor(rid, previewItemId, extra)      specimen state honouring the Adapt-vs-Terraform rule
*/
(function(){
'use strict';
const BM2 = window.BM2 = {};
const S = BM.store.s, esc = BM.esc;

BM2.ribbon = function(name){
  BM.ribbon(name);
  const a = document.querySelector('.mock-ribbon a'); a.href = 'index.html#round2'; a.setAttribute('aria-label', 'Back to the mockup gallery, Round 2');
  document.querySelector('.mock-ribbon .tag').textContent = 'ROUND 2 MOCKUP';
};

/* pointer vs keyboard (whichever input came last): keyboard-opened surfaces take focus, pointer-opened ones don't steal it */
let lastPointer = 0, lastKey = 0;
document.addEventListener('pointerdown', () => { lastPointer = performance.now(); }, true);
document.addEventListener('keydown', () => { lastKey = performance.now(); }, true);
BM2.viaPointer = () => lastPointer >= lastKey;

/* keep focus on the "same" control across an innerHTML re-render */
function keyOf(el){
  if (!el || !el.attributes) return null;
  for (const a of ['data-go','data-focus','data-spec','data-fix','data-tab','data-filter','data-sort','data-lens','id']) if (el.hasAttribute(a)) return '[' + a + '="' + el.getAttribute(a) + '"]';
  return null;
}
BM2.keepFocus = function(root, fn){
  const a = document.activeElement, k = root.contains(a) ? keyOf(a) : null;
  const top = root.scrollTop;
  fn();
  if (k) { const n = root.querySelector(k); if (n) n.focus({ preventScroll:true }); }
  root.scrollTop = top;
};

/* ───────── fake helpers ───────── */
const NB = { sunny:['fern','cloud','frost','dust','mossy','marsh'], fern:['cloud','sunny','marsh'], marsh:['fern','sunny','mossy'], cloud:['fern','sunny','frost'], frost:['cloud','sunny','ember','dust'],
  ember:['frost','dust'], dust:['sunny','frost','ember','salt','mossy'], salt:['dust','mossy'], mossy:['marsh','sunny','dust','salt'], tide:[] };
BM2.neighbours = id => NB[id] || [];
const FMULT = { balanced:1, roots:.9, leaves:1.45, seeds:.7 };
BM2.income = rid => { const rs = S.reg[rid]; if (rs.colony !== 'living') return 0; return rs.est * 1.2 * FMULT[rs.focus] + (rs.spec === 'canopy' ? .35 * rs.est : 0); };
BM2.FSHORT = { balanced:'Even growth', roots:'Holds ground', leaves:'More Biomass', seeds:'Spreads faster' };
BM2.CH = { Temperature:'temp', Water:'water', Soil:'soil', Hazard:'hazard', Seeds:'spread', Growth:'spread' };
BM2.ARCS = { waterSeeds:[['sunny','tide'],['mossy','tide']], seedOut:[['sunny','dust'],['cloud','frost'],['mossy','salt']], earlyMat:[['marsh','mossy'],['fern','cloud']] };
BM2.KINDWORD = { plant:'Adapt', spread:'Spread', planet:'Terraform' };
function fakeLog(r, rs){
  if (rs.colony !== 'living') return ['🌬️ Seeds blew in 30 s ago and could not settle.', '👀 Your plant has scouted this region.'];
  return ['🌱 Stand thickened to ' + Math.round(rs.est * 100) + '%.', '✦ Earned ' + Math.round(BM2.income(r.id) * 60) + ' Biomass in the last minute.', r.origin ? '⭐ Your plant landed here.' : '🌬️ First seeds settled here.'];
}

/* Adapt changes the organism; Terraform changes ONLY the environment around it.
   For a Terraform preview we take today's plant state as-is and swap only the sky/soil, so no plant layer (shape, stance,
   colour, stress droop) is re-derived from the preview. */
BM2.specFor = function(rid, pid, extra){
  const it = pid && BM.item(pid);
  if (!it) return BM.specState(rid, extra);
  if (it.board === 'terraform') { const s = BM.specState(rid, extra); s.sky = BM.skyNow(pid); return s; }
  return BM.specState(rid, Object.assign({ addTrait:pid }, extra));
};

/* ───────── Pause / speed ───────── */
BM2.clockControls = function(host){
  host.classList.add('clock'); host.setAttribute('role', 'group'); host.setAttribute('aria-label', 'Simulation controls');
  host.innerHTML = '<button type="button" class="clk-play"><span class="ci" aria-hidden="true">⏸</span><span class="cl">Pause</span></button>' +
    '<button type="button" class="clk-speed"><span class="cs">1×</span><span class="cl">speed</span></button>';
  const play = host.querySelector('.clk-play'), spd = host.querySelector('.clk-speed');
  play.addEventListener('click', () => BM.clock.toggle());
  spd.addEventListener('click', () => BM.clock.cycleSpeed());
  BM.store.on(e => {
    if (e.type !== 'clock' && e.type !== 'init') return;
    const p = BM.clock.paused, s = BM.clock.speed;
    play.querySelector('.ci').textContent = p ? '▶' : '⏸';
    play.querySelector('.cl').textContent = p ? 'Play' : 'Pause';
    play.setAttribute('aria-label', p ? 'Paused. Press to play' : 'Running. Press to pause');
    play.title = p ? 'Play' : 'Pause';
    spd.querySelector('.cs').textContent = s + '×'; spd.dataset.speed = s;
    spd.setAttribute('aria-label', 'Speed ' + s + '×. Press to change: 1×, 2×, 4×');
    spd.title = 'Speed: 1× → 2× → 4×';
    document.body.classList.toggle('is-paused', p);
  });
};
BM2.pausedFlag = function(host){
  const b = document.createElement('button'); b.type = 'button'; b.className = 'paused-flag'; b.hidden = true;
  b.innerHTML = '<span aria-hidden="true">⏸</span> Paused · press to resume';
  b.addEventListener('click', () => BM.clock.setPaused(false));
  host.appendChild(b);
  BM.store.on(e => { if (e.type === 'clock' || e.type === 'init') b.hidden = !BM.clock.paused; });
  return b;
};

/* ───────── HUD: Biomass + bloom goal + scenario pressure + climate + attention ───────── */
BM2.hud = function(host, o){
  o = o || {};
  host.classList.add('hud2');
  host.innerHTML =
    '<div class="biomass h-bio"><span class="ico" aria-hidden="true">✦</span><span><span class="num">0</span><span class="rate"></span></span><span class="sr-only">Biomass</span></div>' +
    '<div class="h-stat h-cov" title="Cover 70% of the land to win"><span class="h-top">🌍 In bloom <b class="v">0%</b><span>· goal 70%</span></span><span class="bar"><i></i><span class="goal" style="left:70%"></span></span></div>' +
    '<div class="h-stat h-air" title="Dying World: the air is thinning"><span class="h-top">💨 Dying World <b class="v">0%</b></span><span class="bar pressure"><i></i></span></div>' +
    (o.climate === false ? '' : '<div class="h-stat h-clim" title="Terraforming unsettles the climate for a while"><span class="h-top">⚡ Climate</span><span><span class="word">Calm</span></span></div>') +
    (o.attention ? '<button type="button" class="h-att" aria-expanded="false"><span aria-hidden="true">⚠</span><b>0</b><span class="t">need help</span></button>' : '');
  const bio = host.querySelector('.h-bio');
  BM.bindBiomass(bio);
  const att = host.querySelector('.h-att');
  if (att) att.addEventListener('click', () => o.onAttention && o.onAttention(att));
  BM.store.on(() => {
    host.querySelector('.h-cov .v').textContent = S.coverage.toFixed(0) + '%';
    host.querySelector('.h-cov .bar i').style.width = Math.min(100, S.coverage) + '%';
    host.querySelector('.h-air .v').textContent = Math.round(S.pressure * 100) + '%';
    host.querySelector('.h-air .bar i').style.width = S.pressure * 100 + '%';
    if (BM.clock.paused) bio.querySelector('.rate').textContent = '⏸ paused';
    else if (BM.clock.speed > 1) bio.querySelector('.rate').textContent = '+' + S.income.toFixed(1) + ' / s · ' + BM.clock.speed + '×';
    const w = host.querySelector('.h-clim .word');
    if (w) { const k = S.instab < .3 ? ['', 'Calm'] : S.instab < .6 ? ['warn', 'Unsettled'] : ['bad', 'Volatile']; w.className = 'word ' + k[0]; w.textContent = k[1]; }
    if (att) {
      const n = BM.REGIONS.filter(r => BM.view(r.id).st !== 'ok').length;
      att.querySelector('b').textContent = n;
      att.setAttribute('aria-label', n + ' regions need help. Open the Regions browser');
    }
  });
  return { att, bio };
};

/* ───────── map lens: ONE compact control ───────── */
BM2.LENSES = [
  { id:'', name:'Plants', ico:'🌱', hint:'Normal view: where your plant grows' },
  { id:'temp', name:'Temperature', ico:'🌡️', hint:'Too hot or too cold for your plant?' },
  { id:'water', name:'Water', ico:'💧', hint:'Too dry or too wet?' },
  { id:'soil', name:'Soil', ico:'🟫', hint:'Salt, acidity and nutrients' },
  { id:'hazard', name:'Hazard', ico:'⚠️', hint:'Radiation and toxic ground' },
];
const lensOf = id => BM2.LENSES.find(l => l.id === id);
BM2.lens = function(host, map, o){
  o = Object.assign({ style:'menu', drop:'down', align:'left' }, o || {});
  let cur = '';
  const wrap = document.createElement('div'); wrap.className = 'lens-wrap lw-' + o.style; host.appendChild(wrap);
  const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'lens-btn' + (o.style === 'tool' ? ' round' : '');
  wrap.appendChild(btn);
  let pop;
  if (o.style === 'expand') {
    pop = document.createElement('div'); pop.className = 'lens-seg glass'; pop.setAttribute('role', 'group'); pop.setAttribute('aria-label', 'Map lens'); pop.hidden = true;
    pop.innerHTML = BM2.LENSES.map(l => '<button type="button" data-lens="' + l.id + '" aria-pressed="false" title="' + l.hint + '"><span class="li" aria-hidden="true">' + l.ico + '</span>' + (l.id ? l.name : 'Off') + '</button>').join('');
    (o.stripHost || wrap).appendChild(pop);
    btn.setAttribute('aria-expanded', 'false');
  } else {
    pop = document.createElement('div'); pop.className = 'lens-menu'; pop.setAttribute('role', 'menu'); pop.setAttribute('aria-label', 'Map lens'); pop.hidden = true;
    pop.dataset.drop = o.drop; pop.dataset.align = o.align;
    pop.innerHTML = '<div class="lm-h" aria-hidden="true">Colour the map by</div>' + BM2.LENSES.map(l => '<button type="button" role="menuitemradio" data-lens="' + l.id + '" aria-checked="false"><span class="li" aria-hidden="true">' + l.ico + '</span><span>' + l.name + (o.style === 'dropdown' ? '<small>' + l.hint + '</small>' : '') + '</span></button>').join('');
    wrap.appendChild(pop);
    btn.setAttribute('aria-haspopup', 'menu'); btn.setAttribute('aria-expanded', 'false');
  }
  const items = [...pop.querySelectorAll('[data-lens]')];
  function paint(){
    const L = lensOf(cur);
    btn.dataset.active = !!cur;
    if (o.style === 'tool') {
      btn.innerHTML = '<span class="li" aria-hidden="true">' + (cur ? L.ico : '◐') + '</span>' + (cur ? '<span class="dot" aria-hidden="true">●</span>' : '');
      btn.setAttribute('aria-label', 'Map lens: ' + L.name + '. Open lens menu'); btn.title = 'Map lens';
    } else if (o.style === 'expand') {
      const on = BM.isOpen(pop);
      btn.innerHTML = '<span class="li" aria-hidden="true">◐</span><span>Lens' + (on ? ' <small>✕ close</small>' : cur ? ' <small>' + L.name + '</small>' : '') + '</span>';
      btn.setAttribute('aria-label', on ? 'Close the map lens and return to the normal map' : 'Map lens. Show heatmap options');
    } else if (o.style === 'dropdown') {
      btn.innerHTML = '<span class="li" aria-hidden="true">' + L.ico + '</span><span>Lens: ' + L.name + '</span><span aria-hidden="true">▾</span>';
      btn.setAttribute('aria-label', 'Map lens: ' + L.name + '. Change lens');
    } else {
      btn.innerHTML = '<span class="li" aria-hidden="true">' + (cur ? L.ico : '◐') + '</span><span>Map view' + (cur ? ': ' + L.name : '') + '</span><span aria-hidden="true">▾</span>';
      btn.setAttribute('aria-label', 'Map view: ' + L.name + '. Change map lens');
    }
    items.forEach(b => { const on = b.dataset.lens === cur; if (o.style === 'expand') b.setAttribute('aria-pressed', on); else b.setAttribute('aria-checked', on); b.toggleAttribute('data-autofocus', on); });
    if (o.legendHost) {
      const lg = o.legendHost;
      lg.hidden = !cur;
      if (cur) {
        lg.className = 'lens-legend glass';
        lg.innerHTML = '<span>' + L.ico + ' ' + L.name + ' lens</span>' + BM.stHTML('ok') + BM.stHTML('warn') + BM.stHTML('bad') + '<button type="button" class="clr" aria-label="Turn the lens off">✕</button>';
        lg.querySelector('.clr').addEventListener('click', () => { set(''); btn.focus(); });
      }
    }
  }
  function set(id){
    cur = id; map.setLens(id); paint();
    if (o.onChange) o.onChange(id);
  }
  function openPop(){
    BM.openLayer(pop, btn, { onClose:() => { btn.setAttribute('aria-expanded', 'false'); pop.hidden = true; if (o.style === 'expand' && cur) set(''); paint(); } });
    btn.setAttribute('aria-expanded', 'true'); paint();
  }
  btn.addEventListener('click', () => { if (BM.isOpen(pop)) BM.closeLayer(pop); else openPop(); });
  items.forEach((b, k) => {
    b.addEventListener('click', () => {
      set(b.dataset.lens);
      if (o.style === 'expand') { if (!b.dataset.lens) BM.closeLayer(pop); }
      else BM.closeLayer(pop);
    });
    b.addEventListener('keydown', e => {
      const d = { ArrowDown:1, ArrowRight:1, ArrowUp:-1, ArrowLeft:-1 }[e.key];
      if (d) { e.preventDefault(); items[(k + d + items.length) % items.length].focus(); }
      if (e.key === 'Home') { e.preventDefault(); items[0].focus(); } if (e.key === 'End') { e.preventDefault(); items[items.length - 1].focus(); }
    });
  });
  if (o.style !== 'expand') document.addEventListener('pointerdown', e => { if (BM.isOpen(pop) && !wrap.contains(e.target)) BM.closeLayer(pop, { noReturn:true }); }, true);
  paint();
  return { set, get current(){ return cur; }, btn, pop };
};

/* ───────── region inspector (anchored popover or floating sidecar) ───────── */
BM2.TABSETS = {
  three:[ { id:'over', name:'Overview', ico:'🔎' }, { id:'colony', name:'Colony', ico:'🌱' }, { id:'sci', name:'Science', ico:'🔬' } ],
  four:[ { id:'over', name:'Conditions', ico:'🌡️' }, { id:'colony', name:'Colony', ico:'🌱' }, { id:'sci', name:'Details', ico:'🔬' }, { id:'near', name:'Nearby', ico:'🧭' } ],
  cond:[ { id:'over', name:'Conditions', ico:'🌡️' }, { id:'colony', name:'Colony', ico:'🌱' }, { id:'sci', name:'Science', ico:'🔬' } ],
};
BM2.inspector = function(o){
  o = Object.assign({ mode:'anchored', tabStyle:'top', tabs:BM2.TABSETS.three }, o);
  const el = o.el, map = o.map, tabs = o.tabs, hasNear = tabs.some(t => t.id === 'near');
  let rid = null, tab = tabs[0].id, bodyHover = false, lastT = 0;
  el.classList.add('rp', 'tabs-' + o.tabStyle);
  el.setAttribute('role', 'dialog'); el.setAttribute('aria-labelledby', el.id + 'T'); el.hidden = true;
  const tl = '<div class="' + (o.tabStyle === 'seg' ? 'segwrap' : 'tl') + '" role="tablist" aria-label="Region details"' + (o.tabStyle === 'side' ? ' aria-orientation="vertical"' : '') + '>' +
    tabs.map(t => '<button type="button" role="tab" id="' + el.id + '-t-' + t.id + '" aria-controls="' + el.id + '-body" data-tab="' + t.id + '"><span class="ti" aria-hidden="true">' + t.ico + '</span><span>' + t.name + '</span></button>').join('') + '</div>';
  el.innerHTML = '<div class="rp-head"><div class="rp-spec"></div><div class="rp-id"><h2 id="' + el.id + 'T" tabindex="-1"></h2><div class="rp-meta"></div><div class="rp-limit"></div><div class="rp-fix"></div></div>' +
    '<button type="button" class="x-btn" aria-label="Close region details">✕</button></div>' +
    '<div class="rp-tabs">' + tl + '</div><div class="rp-body" id="' + el.id + '-body" role="tabpanel" tabindex="0"></div>';
  if (o.tabStyle !== 'seg') el.querySelector('.rp-tabs .tl').style.display = 'contents';
  const head = el.querySelector('.rp-head'), h2 = el.querySelector('h2'), meta = el.querySelector('.rp-meta'), lim = el.querySelector('.rp-limit'), fix = el.querySelector('.rp-fix'), body = el.querySelector('.rp-body');
  const tbtns = [...el.querySelectorAll('[role=tab]')];
  const spec = BM.mountSpecimen(el.querySelector('.rp-spec'), { compact:true });
  el.querySelector('.x-btn').addEventListener('click', () => close());
  body.addEventListener('pointerenter', () => { bodyHover = true; }); body.addEventListener('pointerleave', () => { bodyHover = false; });

  function specIdle(){ if (!rid) return; spec.render(BM.specState(rid)); spec.highlight(null); }   // blur can fire after close
  function renderMeta(){
    const v = BM.view(rid), r = v.r, rs = v.rs, living = rs.colony === 'living';
    meta.innerHTML = (r.origin ? '<span class="chip">⭐ Start</span>' : '') +
      '<span class="chip">' + (living ? '🌱 ' + v.estWord + ' · ' + Math.round(rs.est * 100) + '%' : '◌ No colony') + '</span>' +
      (living ? '<span class="chip" title="Biomass from this region">✦ +' + BM2.income(rid).toFixed(1) + '/s</span>' : '') +
      BM.stHTML(v.st, v.limit ? BM.ST_WORD[v.st] : 'Thriving');
  }
  function renderHead(){
    const v = BM.view(rid), r = v.r, living = v.rs.colony === 'living';
    h2.textContent = r.name;
    head.style.background = 'linear-gradient(135deg,' + BM.TERRAIN[r.terrain] + ' 0%, var(--card) 66%)';
    renderMeta();
    lim.className = 'rp-limit ' + (v.limit ? v.st : 'ok');
    lim.innerHTML = '<small>Holding it back</small>' + (v.limit ? '<span aria-hidden="true">' + BM.COND_META[v.limit.f].ico + '</span> ' + esc(v.limit.text) : '✓ Nothing. ' + (living ? 'This colony is growing well.' : 'Seeds can settle here.'));
    BM2.keepFocus(fix, () => {
      fix.innerHTML = v.limit && v.fixers.length ? v.fixers.map(it => { const k = BM.BOARDS[it.board].kind; return '<button type="button" class="fixbtn" data-fix="' + it.id + '"><span aria-hidden="true">' + it.ico + '</span>' + it.name + ' <span class="kind ' + k + '">' + BM2.KINDWORD[k] + '</span></button>'; }).join('') : '';
    });
    fix.querySelectorAll('[data-fix]').forEach(b => {
      const id = b.dataset.fix, it = BM.item(id);
      b.setAttribute('aria-label', 'Fix with ' + it.name + ' (' + BM2.KINDWORD[BM.BOARDS[it.board].kind] + '). Opens ' + BM.BOARDS[it.board].name + ' with this card.');
      const on = () => { if (!rid) return; const p = BM.previewOf(id); map.setPreview({ open:p.open, worse:p.worse, tint:it.board === 'terraform' ? id : null, arcs:BM2.ARCS[id] }); spec.render(BM2.specFor(rid, id), true); if (it.board !== 'terraform') spec.highlight(BM2.CH[it.cat]); };
      const off = () => { map.setPreview(null); specIdle(); };
      b.addEventListener('pointerenter', on); b.addEventListener('pointerleave', off); b.addEventListener('focus', on); b.addEventListener('blur', off);
      b.addEventListener('click', () => { off(); o.onFix && o.onFix(id, b); });
    });
  }
  function rowsOfCond(v){
    return '<div class="ctiles2">' + ['temp','water','soil','hazard'].map(k => { const c = v.cond[k], M = BM.COND_META[k];
      return '<div class="ctile2 ' + c[0] + '"><span class="ci" aria-hidden="true">' + M.ico + '</span><span class="ch">' + M.name + BM.stHTML(c[0]) + '</span><small>' + esc(c[1]) + '</small></div>'; }).join('') + '</div>';
  }
  function nearHTML(){
    const ns = BM2.neighbours(rid);
    return ns.length ? '<div class="nbrow">' + ns.map(id => { const n = BM.view(id); return '<button type="button" data-go="' + id + '">' + BM.stHTML(n.st, '') + n.r.name + '</button>'; }).join('') + '</div>'
      : '<div class="empty2">🌊 No land touches this island. Only Waterborne Seeds can reach it.</div>';
  }
  function renderBody(){
    const v = BM.view(rid), r = v.r, rs = v.rs, living = rs.colony === 'living';
    tbtns.forEach(t => { const on = t.dataset.tab === tab; t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; });
    body.setAttribute('aria-labelledby', el.id + '-t-' + tab);
    let h = '';
    if (tab === 'over') {
      h += rowsOfCond(v);
      const tot = Math.max(.1, S.income), inc = BM2.income(rid);
      h += '<div class="rstats"><div class="rstat">Stand density<b>' + (living ? Math.round(rs.est * 100) + '% · ' + v.estWord : 'No colony') + '</b><span class="bar"><i style="width:' + (living ? rs.est * 100 : 0) + '%"></i></span></div>' +
        '<div class="rstat">Biomass from here<b>✦ +' + inc.toFixed(1) + ' / s</b>' + (living ? Math.round(inc / tot * 100) + '% of your income' : 'Nothing yet') + '</div></div>';
      if (!hasNear) h += '<h3 class="sub2">Recent</h3><ul class="rlog">' + fakeLog(r, rs).map(x => '<li>' + x + '</li>').join('') + '</ul>';
    } else if (tab === 'colony') {
      if (living) {
        h += '<h3 class="sub2">How should this colony grow?</h3><div class="focus4" role="group" aria-label="Growth focus">' + BM.FOCUS.map(f => '<button type="button" data-focus="' + f.id + '" aria-pressed="' + (f.id === rs.focus) + '" aria-label="' + f.name + ' focus. ' + f.text + '"><span class="fi" aria-hidden="true">' + f.ico + '</span>' + f.name + '<small>' + BM2.FSHORT[f.id] + '</small></button>').join('') + '</div>' +
          '<p class="focushint" aria-live="polite">' + BM.FOCUS.find(f => f.id === rs.focus).name + ': ' + BM.FOCUS.find(f => f.id === rs.focus).text + '</p>';
        h += '<h3 class="sub2">Local upgrade · one per colony</h3><div class="spec3">' + BM.SPECS.map(x => '<button type="button" class="' + (rs.spec === x.id ? 'has' : '') + '" data-spec="' + x.id + '" aria-disabled="' + (!!rs.spec) + '"><span class="si" aria-hidden="true">' + x.ico + '</span><span>' + x.name + '<small>' + x.text + '</small></span><span class="c">' + (rs.spec === x.id ? '✓ Built' : rs.spec ? '' : '● ' + BM.SPEC_COST) + '</span></button>').join('') + '</div>';
      } else {
        h += '<div class="empty2">No colony here yet. When seeds settle you choose how it grows: <b>Roots</b>, <b>Leaves</b> or <b>Seeds</b>.</div>';
        const src = BM2.neighbours(rid).filter(id => S.reg[id].colony === 'living');
        h += '<h3 class="sub2">Seeds can come from</h3>' + (src.length ? '<div class="nbrow">' + src.map(id => '<button type="button" data-go="' + id + '">' + BM.stHTML(BM.view(id).st, '') + BM.region(id).name + '</button>').join('') + '</div>' : '<div class="empty2">No living neighbour can reach it yet.</div>');
      }
    } else if (tab === 'sci') {
      const t = r.env.tempC, pos = x => Math.max(0, Math.min(100, (x + 10) / 50 * 100));
      h += '<h3 class="sub2">Ground temperature vs your plant</h3><div class="gauge" role="img" aria-label="Plant range 4 to 30 degrees. Here: ' + t + ' degrees."><span class="rng" style="left:' + pos(4) + '%; right:' + (100 - pos(30)) + '%"></span><span class="mk" style="left:' + pos(t) + '%"></span></div>' +
        '<div class="gauge-l"><span>−10 °C</span><span>Plant 4–30 °C · here ' + t + ' °C</span><span>40 °C</span></div>';
      const raw = Object.entries(r.raw), half = Math.ceil(raw.length / 2);
      h += '<h3 class="sub2">Measured signals</h3><div class="rawcols">' + [raw.slice(0, half), raw.slice(half)].map(col => '<div class="rawgrid">' + col.map(([k, x]) => '<span>' + k + '</span><b>' + x + '</b>').join('') + '</div>').join('') + '</div>';
      if (!hasNear) h += '<h3 class="sub2">Nearby</h3>' + nearHTML();
    } else {
      h += '<h3 class="sub2">Touching regions</h3>' + nearHTML() + '<p class="focushint">Seeds travel to touching regions. Crossing water needs Waterborne Seeds.</p>' +
        '<h3 class="sub2">Recent</h3><ul class="rlog">' + fakeLog(r, rs).map(x => '<li>' + x + '</li>').join('') + '</ul>';
    }
    BM2.keepFocus(body, () => { body.innerHTML = h; });
    body.querySelectorAll('[data-go]').forEach(b => { b.addEventListener('click', () => open(b.dataset.go, { focus:true, keepOpener:true })); b.addEventListener('pointerenter', () => map.highlight(b.dataset.go)); b.addEventListener('pointerleave', () => map.highlight(null)); });
    body.querySelectorAll('[data-focus]').forEach(b => {
      const f = BM.FOCUS.find(x => x.id === b.dataset.focus);
      b.addEventListener('click', () => { BM.store.setFocus(rid, f.id); BM.toast(f.ico + ' ' + r.name + ' now grows with a ' + f.name + ' focus.'); });
      const sh = () => { if (!rid) return; const hl = body.querySelector('.focushint'); if (hl) hl.textContent = f.name + ': ' + f.text; spec.render(BM.specState(rid, { focus:f.id }), true); spec.highlight(f.id === 'roots' ? 'soil' : f.id === 'leaves' ? 'water' : f.id === 'seeds' ? 'spread' : null); };
      b.addEventListener('pointerenter', sh); b.addEventListener('focus', sh);
      b.addEventListener('pointerleave', specIdle); b.addEventListener('blur', specIdle);
    });
    body.querySelectorAll('[data-spec]').forEach(b => {
      const x = BM.SPECS.find(q => q.id === b.dataset.spec);
      b.addEventListener('click', () => { if (S.reg[rid].spec) return; const res = BM.store.buySpec(rid, x.id); BM.toast(res.ok ? x.ico + ' ' + x.name + ' built in ' + r.name + '.' : res.reason); });
      if (!S.reg[rid].spec) { const sh = () => { if (rid) spec.render(BM.specState(rid, { spec:x.id }), true); }; b.addEventListener('pointerenter', sh); b.addEventListener('focus', sh); b.addEventListener('pointerleave', specIdle); b.addEventListener('blur', specIdle); }
    });
  }
  function setTab(t, focus){ tab = t; renderBody(); if (focus) el.querySelector('[data-tab="' + t + '"]').focus(); place(); }
  tbtns.forEach((t, k) => {
    t.addEventListener('click', () => setTab(t.dataset.tab));
    t.addEventListener('keydown', e => {
      const d = { ArrowRight:1, ArrowDown:1, ArrowLeft:-1, ArrowUp:-1 }[e.key];
      if (d) { e.preventDefault(); setTab(tbtns[(k + d + tbtns.length) % tbtns.length].dataset.tab, true); }
      if (e.key === 'Home') { e.preventDefault(); setTab(tbtns[0].dataset.tab, true); }
      if (e.key === 'End') { e.preventDefault(); setTab(tbtns[tbtns.length - 1].dataset.tab, true); }
    });
  });

  /* placement: anchored = beside the region with an arrow; sidecar = docked card (CSS) + leader line */
  function place(){
    if (!rid || el.hidden) return;
    const W = o.world.getBoundingClientRect(), p = map.screenPoint(rid), px = p.x - W.left, py = p.y - W.top;
    const sf = Object.assign({ top:12, bottom:12, left:12, right:12 }, o.safe ? o.safe() : {});
    const maxH = W.height - sf.top - sf.bottom;
    el.style.maxHeight = maxH + 'px';
    if (o.mode === 'sidecar') { if (o.placeSidecar) o.placeSidecar(el, px, py, sf); drawLeader(px, py); return; }
    el.style.width = '';
    let w = el.offsetWidth;
    const roomR = W.width - sf.right - (px + 32), roomL = px - 32 - sf.left;
    if (roomR < w && roomL < w && Math.max(roomR, roomL) >= 372) { w = Math.floor(Math.max(roomR, roomL)); el.style.width = w + 'px'; }   // squeeze before covering the region
    const h = el.offsetHeight;
    let side = 'right', x = px + 32;
    if (roomR < w) { side = 'left'; x = px - 32 - w; }
    if (side === 'left' && roomL < w) { side = 'none'; x = Math.max(sf.left, Math.min(W.width - sf.right - w, px - w / 2)); }
    let y = Math.max(sf.top, Math.min(W.height - sf.bottom - h, py - h * .38));
    el.style.left = Math.round(x) + 'px'; el.style.top = Math.round(y) + 'px'; el.dataset.side = side;
    el.style.setProperty('--ay', Math.max(24, Math.min(h - 24, py - y)) + 'px');
  }
  function drawLeader(px, py){
    const L = o.leader; if (!L) return;
    const W = o.world.getBoundingClientRect(), R = el.getBoundingClientRect();
    const toLeft = R.left - W.left > px;
    const ex = toLeft ? R.left - W.left : R.right - W.left, ey = Math.max(R.top - W.top + 40, Math.min(R.bottom - W.top - 40, py));
    L.innerHTML = '<line x1="' + px + '" y1="' + py + '" x2="' + ex + '" y2="' + ey + '"/><circle cx="' + px + '" cy="' + py + '" r="6"/><circle cx="' + ex + '" cy="' + ey + '" r="4"/>';
    L.removeAttribute('hidden');
  }
  window.addEventListener('resize', () => place());

  function open(id, oo){
    oo = oo || {};
    const kb = !BM2.viaPointer() || oo.focus;
    const was = BM.isOpen(el);
    rid = id; map.select(id);
    renderHead(); renderBody(); specIdle();
    if (!was) BM.openLayer(el, oo.opener || document.activeElement, { noFocus:true, onClose:() => { const old = rid; rid = null; map.select(null); map.setPreview(null); map.highlight(null); if (o.leader) o.leader.setAttribute('hidden', ''); if (o.onClose) o.onClose(old); } });
    requestAnimationFrame(place); place();
    if (kb) setTimeout(() => { const t = el.querySelector('[role=tab][aria-selected="true"]'); if (t) t.focus({ preventScroll:true }); }, 40);
    if (o.onOpen) o.onOpen(id);
  }
  function close(oo){ if (BM.isOpen(el)) BM.closeLayer(el, oo); }
  BM.store.on(e => {
    if (!rid || !BM.isOpen(el)) return;
    if (e.type === 'gain' || e.type === 'clock') return;
    if (e.type === 'tick') { renderMeta(); if (S.t - lastT >= 3 && !bodyHover && !body.contains(document.activeElement)) { lastT = S.t; renderBody(); } return; }
    renderHead(); renderBody(); specIdle();
  });
  return { open, close, place, setTab, get rid(){ return rid; }, get isOpen(){ return BM.isOpen(el); }, spec };
};

/* ───────── Adapt / Spread / Terraform board content ───────── */
BM2.board = function(host, board, o){
  o = Object.assign({ effects:true, compact:false, groups:true }, o);
  const B = BM.BOARDS[board], kind = B.kind, map = o.map;
  host.classList.add('ab-host');
  host.innerHTML = '<div class="ab"><div class="ab-spec"><div class="ab-specbox"></div><p class="ab-cap" aria-live="polite"></p></div><div class="ab-cards' + (o.flat ? ' flat' : '') + '"></div>' + (o.effects ? '<div class="ab-eff" aria-live="polite"></div>' : '') + '</div>';
  const box = host.querySelector('.ab-specbox'), cap = host.querySelector('.ab-cap'), eff = host.querySelector('.ab-eff');
  const spec = BM.mountSpecimen(box, { compact:true });
  const unch = document.createElement('span'); unch.className = 'unch'; unch.textContent = 'PLANT UNCHANGED'; unch.hidden = true; box.appendChild(unch);
  const where = () => (o.rid && o.rid()) || 'sunny';
  let last = null;
  function idle(){
    spec.render(BM2.specFor(where(), null, { showcase:true })); spec.highlight(null); unch.hidden = true;
    cap.className = 'ab-cap';
    cap.innerHTML = '<span class="who">Your plant in ' + BM.region(where()).name + (o.rid && o.rid() ? '' : ' (start)') + '</span>' +
      (board === 'terraform' ? 'Terraform changes the sky, weather and soil <b>around</b> your plant. It never reshapes the plant.' :
       board === 'adapt' ? 'Adapt changes your plant itself: leaves, stem, roots, colour.' : 'Spread changes how your plant’s seeds travel.');
  }
  function effects(pid, sticky){
    if (!eff) return;
    if (!pid) { eff.innerHTML = '<p class="eh">On the planet</p><p class="none">Hover or focus a card. The real map shows <b>+</b> where land opens and <b>−</b> where it gets harder.</p>'; return; }
    const it = BM.item(pid), p = BM.previewOf(pid);
    const chips = (ids, cls, sign) => '<div class="row">' + ids.map(id => '<button type="button" class="rc ' + cls + '" data-loc="' + id + '" aria-label="Find ' + BM.region(id).name + ' on the map">' + sign + ' ' + BM.region(id).name + '</button>').join('') + '</div>';
    eff.innerHTML = '<p class="eh">' + (sticky ? 'Last looked at' : 'Previewing') + ': ' + it.ico + ' ' + it.name + '</p>' +
      (it.board === 'terraform' ? '<p>🌍 Planet-wide: ' + it.look.toLowerCase() + '. Climate gets more unsettled for a while.</p>' : '') +
      (p.open.length ? '<p class="eh">Opens</p>' + chips(p.open, 'open', '+') : '') +
      (p.worse.length ? '<p class="eh">Harder</p>' + chips(p.worse, 'worse', '−') : '') +
      (!p.open.length && !p.worse.length ? '<p class="none">No region opens or closes right away.</p>' : '');
    eff.querySelectorAll('[data-loc]').forEach(b => {
      b.addEventListener('click', () => { map.flash([b.dataset.loc]); map.highlight(b.dataset.loc); setTimeout(() => map.highlight(null), 1500); });
      b.addEventListener('pointerenter', () => map.highlight(b.dataset.loc)); b.addEventListener('pointerleave', () => map.highlight(null));
    });
  }
  function preview(pid){
    if (!pid) { map.setPreview(null); idle(); if (last) effects(last, true); return; }
    last = pid;
    const it = BM.item(pid), p = BM.previewOf(pid);
    spec.render(BM2.specFor(where(), pid, { showcase:true }), true);
    if (it.board === 'terraform') {
      spec.highlight(null); unch.hidden = false; cap.className = 'ab-cap planet';
      cap.innerHTML = '<span class="who">Preview · the planet changes</span>' + it.look + '. Your plant’s body stays the same.';
    } else {
      spec.highlight(BM2.CH[it.cat]); unch.hidden = true; cap.className = 'ab-cap ' + kind;
      cap.innerHTML = '<span class="who">Preview · your plant changes</span>' + it.look + '.';
    }
    map.setPreview({ open:p.open, worse:p.worse, tint:it.board === 'terraform' ? pid : null, arcs:BM2.ARCS[pid] });
    effects(pid);
  }
  const api = BM.renderCards(host.querySelector('.ab-cards'), board, { compact:o.compact, groups:o.groups, onPreview:preview, onBought:id => { if (o.onBought) o.onBought(id); } });
  idle(); effects(null);
  return {
    show(){ last = null; idle(); effects(null); },
    hide(){ map.setPreview(null); },
    refresh: idle,
    focusCard: api.focusCard,
  };
};

/* ───────── Regions browser (Concept-2 triage info, four treatments) ───────── */
BM2.regions = function(host, o){
  o = Object.assign({ style:'grouped' }, o);
  const map = o.map;
  let filter = 'all', sort = 'help', hovering = false;
  const rank = { bad:0, warn:1, ok:2 };
  const cur = id => !!(o.current && o.current() === id);
  host.addEventListener('pointerenter', () => { hovering = true; }); host.addEventListener('pointerleave', () => { hovering = false; map.highlight(null); });
  function views(){ return BM.REGIONS.map(r => BM.view(r.id)); }
  function stat(v){ const living = v.rs.colony === 'living'; return { living, pct:living ? Math.round(v.rs.est * 100) : 0, fo:living ? BM.FOCUS.find(f => f.id === v.rs.focus) : null }; }
  function desc(v, s){ return v.limit ? esc(v.limit.text) : s.living ? 'Doing well · ✦ +' + BM2.income(v.r.id).toFixed(1) + '/s' : 'Ready for seeds'; }
  function row(v){
    const s = stat(v);
    return '<li><button type="button" class="rb-row" data-go="' + v.r.id + '" aria-current="' + cur(v.r.id) + '"><span class="sw" style="background:' + BM.TERRAIN[v.r.terrain] + '" aria-hidden="true"></span>' +
      '<span class="nm">' + (v.r.origin ? '<span aria-label="Start">⭐</span>' : '') + v.r.name + '</span>' +
      '<span class="rt">' + BM.stHTML(v.st, v.limit ? BM.ST_WORD[v.st] : 'Thriving') + '<span class="mini">' + (s.living ? '<span aria-label="' + s.fo.name + ' focus">' + s.fo.ico + '</span><span class="bar" aria-hidden="true"><i style="width:' + s.pct + '%"></i></span>' + s.pct + '%' : '◌ no colony') + '</span></span>' +
      '<span class="ds">' + desc(v, s) + '</span></button></li>';
  }
  function render(){
    const vs = views();
    let h = '';
    const n = { bad:0, warn:0, ok:0 }; vs.forEach(v => n[v.st]++);
    if (o.style === 'grouped') {
      h += '<div class="rb-top"><div class="rb-filters" role="group" aria-label="Show">' + [['all', 'All ' + vs.length], ['bad', '✕ Blocked ' + n.bad], ['warn', '! Strained ' + n.warn], ['ok', '✓ Thriving ' + n.ok]].map(([k, t]) => '<button type="button" data-filter="' + k + '" aria-pressed="' + (filter === k) + '">' + t + '</button>').join('') + '</div></div><div class="rb-scroll">';
      [['bad', '✕ Blocked: something stops your plant'], ['warn', '! Strained: growing slowly'], ['ok', '✓ Thriving']].forEach(([k, t]) => {
        if (filter !== 'all' && filter !== k) return;
        const g = vs.filter(v => v.st === k); if (!g.length) return;
        h += '<h3 class="rb-group">' + t + ' · ' + g.length + '</h3><ul class="rb-list">' + g.map(row).join('') + '</ul>';
      });
      h += '</div>';
    } else if (o.style === 'list') {
      const living = vs.filter(v => v.rs.colony === 'living');
      const top = living.slice().sort((a, b) => BM2.income(b.r.id) - BM2.income(a.r.id)).slice(0, 3);
      h += '<div class="rb-top"><p class="focushint" style="margin:0 0 8px">' + living.length + ' colonies · ' + (vs.length - living.length) + ' empty regions · top earners: ' + top.map(v => v.r.name + ' +' + BM2.income(v.r.id).toFixed(1)).join(', ') + '</p>' +
        '<div class="rb-filters" role="group" aria-label="Sort">' + [['help', 'Needs help first'], ['az', 'A–Z'], ['big', 'Biggest colony']].map(([k, t]) => '<button type="button" data-sort="' + k + '" aria-pressed="' + (sort === k) + '">' + t + '</button>').join('') + '</div></div>';
      const list = vs.slice().sort((a, b) => sort === 'help' ? rank[a.st] - rank[b.st] || a.r.name.localeCompare(b.r.name) : sort === 'az' ? a.r.name.localeCompare(b.r.name) : stat(b).pct - stat(a).pct);
      h += '<div class="rb-scroll"><ul class="rb-list">' + list.map(row).join('') + '</ul></div>';
    } else if (o.style === 'matrix') {
      h += '<div class="rb-top"><div class="rb-filters" role="group" aria-label="Sort">' + [['help', 'Needs help first'], ['az', 'A–Z']].map(([k, t]) => '<button type="button" data-sort="' + k + '" aria-pressed="' + (sort === k) + '">' + t + '</button>').join('') + '</div></div>';
      h += '<div class="rb-mxh" aria-hidden="true"><span>Region</span><span title="Temperature">🌡️</span><span title="Water">💧</span><span title="Soil">🟫</span><span title="Hazard">⚠️</span><span>Stand</span></div><div class="rb-scroll"><ul class="rb-list">';
      const list = vs.slice().sort((a, b) => sort === 'help' ? rank[a.st] - rank[b.st] || a.r.name.localeCompare(b.r.name) : a.r.name.localeCompare(b.r.name));
      h += list.map(v => { const s = stat(v);
        const cells = ['temp','water','soil','hazard'].map(k => { const c = v.cond[k][0]; return '<span class="mc ' + c + '" aria-hidden="true">' + BM.ST_ICON[c] + '</span>'; }).join('');
        const sr = ['temp','water','soil','hazard'].map(k => BM.COND_META[k].name + ' ' + BM.ST_WORD[v.cond[k][0]]).join(', ');
        return '<li><button type="button" class="mrow" data-go="' + v.r.id + '" aria-current="' + cur(v.r.id) + '" aria-label="' + v.r.name + '. ' + sr + '. ' + (s.living ? 'Stand ' + s.pct + '%' : 'No colony') + '. ' + (v.limit ? v.limit.text : '') + '">' +
          '<span class="nm">' + (v.r.origin ? '⭐ ' : '') + v.r.name + '<small>' + (v.limit ? (v.limit.f === 'reach' ? '🌊 ' : '') + esc(v.limit.text) : s.living ? 'Doing well' : 'Ready for seeds') + '</small></span>' + cells + '<span class="mpct">' + (s.living ? s.fo.ico + ' ' + s.pct + '%' : '◌') + '</span></button></li>'; }).join('');
      h += '</ul></div>';
    } else {
      h += '<div class="rb-kan">' + [['bad', '✕ Blocked'], ['warn', '! Strained'], ['ok', '✓ Thriving']].map(([k, t]) => {
        const g = vs.filter(v => v.st === k);
        return '<section class="rb-col" aria-label="' + t.slice(2) + '"><h3>' + BM.stHTML(k, t.slice(2) + ' · ' + g.length) + '</h3><div class="rb-scroll">' + (g.length ? g.map(v => { const s = stat(v);
          return '<button type="button" class="kcard" data-go="' + v.r.id + '" aria-current="' + cur(v.r.id) + '"><b>' + (v.r.origin ? '⭐ ' : '') + v.r.name + '</b><small>' + desc(v, s) + '</small><small>' + (s.living ? s.fo.ico + ' ' + s.fo.name + ' · stand ' + s.pct + '%' : '◌ no colony') + '</small></button>'; }).join('') : '<p class="focushint">None right now.</p>') + '</div></section>';
      }).join('') + '</div>';
    }
    BM2.keepFocus(host, () => { host.innerHTML = '<div class="rb">' + h + '</div>'; });
    host.querySelectorAll('[data-go]').forEach(b => {
      b.addEventListener('click', () => o.onPick && o.onPick(b.dataset.go, b));
      b.addEventListener('pointerenter', () => map.highlight(b.dataset.go)); b.addEventListener('focus', () => map.highlight(b.dataset.go));
      b.addEventListener('pointerleave', () => map.highlight(null)); b.addEventListener('blur', () => map.highlight(null));
    });
    host.querySelectorAll('[data-filter]').forEach(b => b.addEventListener('click', () => { filter = b.dataset.filter; render(); }));
    host.querySelectorAll('[data-sort]').forEach(b => b.addEventListener('click', () => { sort = b.dataset.sort; render(); }));
  }
  BM.store.on(e => {
    if (!host.offsetParent) return;
    if (e.type === 'gain' || e.type === 'clock') return;
    if (e.type === 'tick' && (S.t % 3 || hovering)) return;
    render();
  });
  return { render, setFilter(f){ filter = f; render(); } };
};

})();
