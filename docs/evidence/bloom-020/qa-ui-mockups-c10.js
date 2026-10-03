#!/usr/bin/env node
/*
  BLOOM-020 QA driver for the UI concept sandbox (demos/ui-mockups/), Concept 10 — Refined unified workbench.
  VISUAL MOCKUPS ONLY. This checks the sandbox pages, not the game. Needs Playwright (Chromium; Firefox optional):
    NODE_PATH="$(npm root -g)" node docs/evidence/bloom-020/qa-ui-mockups-c10.js [--shots] [--firefox]
  Writes docs/evidence/bloom-020/qa-results.json (+ screenshots with --shots). Exit code 1 on any failed check.

  Geometry is MEASURED, as in BLOOM-019: a ResizeObserver on the map SVG records every size the map takes, and a
  MutationObserver counts workbench open/close flips. After the workbench opens once, the log is cleared and every later step
  (region → region, mode switches, tool-access switches, Adapt re-targeting, Map View) must add ZERO entries.
  Panel height is measured too: each mode's panel bottom vs the bottom of the world area (content-height rule).

  Every Concept 10 run is done twice, once per tool-access presentation (dock = 1 Attached dock, panel = 2 In-panel nav),
  at 1280×800, 1024×768 and 1440×900, plus reduced motion and Firefox.
*/
'use strict';
const path = require('path'), fs = require('fs');
const { chromium, firefox } = require('playwright');
const ROOT = path.resolve(__dirname, '../../..');
const DIR = path.join(ROOT, 'demos/ui-mockups');
const OUT = __dirname;
const SHOTS = process.argv.includes('--shots');
const url = f => 'file://' + path.join(DIR, f);
const C10 = 'concept-10-refined-bench.html';
const VIEWPORTS = [[1280, 800], [1024, 768], [1440, 900]];
const results = { when:new Date().toISOString(), checks:[], geometry:{}, panel:{}, external:[], errors:[] };
let fails = 0;
function check(name, ok, detail){ results.checks.push({ name, ok:!!ok, detail:detail === undefined ? null : detail }); if (!ok) { fails++; console.log('  ✗', name, detail !== undefined ? JSON.stringify(detail) : ''); } }
const wait = ms => new Promise(r => setTimeout(r, ms));

async function newPage(browser, vp, opts){
  const ctx = await browser.newContext(Object.assign({ viewport:{ width:vp[0], height:vp[1] } }, opts || {}));
  const page = await ctx.newPage();
  page._errs = [];
  page.on('console', m => { if (m.type() === 'error') page._errs.push(m.text()); });
  page.on('pageerror', e => page._errs.push(e.message));
  ctx.on('request', r => { const u = r.url(); if (!/^(file|data|blob|about):/.test(u)) results.external.push(u); });
  return { ctx, page };
}
const mapRect = page => page.$eval('#mapwrap svg', e => { const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height].map(v => Math.round(v)); });
const same = (a, b) => a.every((v, k) => Math.abs(v - b[k]) <= 1);
const noHScroll = page => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.body.scrollWidth <= innerWidth);
const isVisible = (page, sel) => page.$eval(sel, e => !e.closest('[hidden]') && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden').catch(() => false);
const text = (page, sel) => page.$eval(sel, e => e.textContent.replace(/\s+/g, ' ').trim()).catch(() => '');
async function clickRegion(page, id){
  const pt = await page.evaluate(id => {
    const c = map.screenPoint(id);
    const rects = [...document.querySelectorAll('#mapwrap .rg[data-r="' + id + '"] rect')].map(r => r.getBoundingClientRect()).map(b => ({ x:b.x + b.width / 2, y:b.y + b.height / 2 }));
    rects.sort((a, b) => Math.hypot(a.x - c.x, a.y - c.y) - Math.hypot(b.x - c.x, b.y - c.y));
    for (const p of rects) { const el = document.elementFromPoint(p.x, p.y); const g = el && el.closest && el.closest('.rg'); if (g && g.dataset.r === id && g.closest('#mapwrap')) return p; }
    return null;
  }, id);
  if (!pt) throw new Error('region not clickable (covered or off-screen): ' + id);
  await page.mouse.click(pt.x, pt.y);
}
/* plant vs environment layers of the newest specimen drawing inside `sel` */
const specParts = (page, sel) => page.$eval(sel, host => {
  const svg = host.querySelector('.bm-spec svg'); const ls = svg.querySelectorAll(':scope > g.layer'); const g = ls[ls.length - 1];
  const c = g.cloneNode(true); c.querySelectorAll('[data-f="env"]').forEach(n => n.remove()); c.querySelectorAll('.dim,.glow').forEach(n => n.classList.remove('dim', 'glow'));
  return { plant:c.innerHTML, env:g.querySelector('[data-f="env"]').innerHTML.replace(/sk[a-z0-9]{6}/g, '') };
});
async function tabWalk(page, n){
  await page.evaluate(() => { document.activeElement && document.activeElement.blur(); });
  await page.mouse.click(2, 60).catch(() => {});
  const bad = [], seen = [];
  for (let k = 0; k < n; k++) {
    await page.keyboard.press('Tab');
    const d = await page.evaluate(() => {
      const a = document.activeElement; if (!a || a === document.body) return null;
      const r = a.getBoundingClientRect(); const hiddenAnc = !!a.closest('[hidden]');
      let op = 1; for (let e = a; e && e.nodeType === 1; e = e.parentElement) op *= +getComputedStyle(e).opacity;
      const svg = a instanceof SVGElement;
      const ring = svg ? 'svg' : getComputedStyle(a).outlineStyle;
      const inX = r.right > 0 && r.left < innerWidth;
      const where = a.closest('#dock') ? 'dock' : a.closest('#nav') ? 'nav' : a === document.getElementById('opener') ? 'opener' : a.closest('#wb') ? 'wb' : 'other';
      return { tag:a.tagName, id:a.id || a.dataset.r || a.dataset.tool || a.dataset.view || (a.textContent || '').trim().slice(0, 24), w:r.width, h:r.height, hiddenAnc, op:Math.round(op * 100) / 100, ring, inX, where };
    });
    if (!d) continue; seen.push(d);
    if (d.hiddenAnc || d.w < 1 || d.h < 1 || d.op < .5 || d.ring === 'none' || !d.inX) bad.push(d);
  }
  return { bad, count:seen.length, where:[...new Set(seen.map(s => s.where))] };
}
async function shot(page, name, clip){
  if (!SHOTS) return;
  await page.evaluate(() => document.querySelectorAll('.toast').forEach(t => t.remove()));
  const wasPaused = await page.evaluate(() => !!(window.BM && BM.clock.paused));   // capture the running look; checks that need a frozen clock re-pause
  if (wasPaused) await page.evaluate(() => BM.clock.setPaused(false));
  await wait(520);
  await page.evaluate(() => document.querySelectorAll('.toast').forEach(t => t.remove()));
  await page.screenshot({ path:path.join(OUT, name), clip });
  if (wasPaused) await page.evaluate(() => BM.clock.setPaused(true));
}
/* geometry instrumentation */
const geoInstall = page => page.evaluate(() => {
  window.__geo = []; window.__wbFlips = 0;
  const svg = document.querySelector('#mapwrap svg');
  new ResizeObserver(es => es.forEach(e => { const r = e.target.getBoundingClientRect(); window.__geo.push([Math.round(r.width), Math.round(r.height)]); })).observe(svg);
  const wb = document.getElementById('wb'); let open = wb.classList.contains('open');
  new MutationObserver(() => { const o = wb.classList.contains('open') && !wb.hidden; if (o !== open) { open = o; window.__wbFlips++; } }).observe(wb, { attributes:true, attributeFilter:['class', 'hidden'] });
});
const geoReset = page => page.evaluate(() => { window.__geo = []; window.__wbFlips = 0; });
const geoLog = page => page.evaluate(() => ({ sizes:window.__geo.slice(), flips:window.__wbFlips }));
/* panel box vs the world area: content-height rule */
const panelBox = page => page.evaluate(() => {
  const w = document.getElementById('wb').getBoundingClientRect(), wo = document.getElementById('world').getBoundingClientRect();
  const gap = parseFloat(getComputedStyle(document.body).getPropertyValue('--gap')) || 12;
  const maxBottom = wo.bottom - gap;
  return { top:Math.round(w.top - wo.top), left:Math.round(w.left), right:Math.round(w.right), h:Math.round(w.height), worldH:Math.round(wo.height),
    gapBelow:Math.round(wo.bottom - w.bottom), atMax:w.bottom >= maxBottom - 1.5, panelScrolls:document.getElementById('wb').scrollHeight > document.getElementById('wb').clientHeight + 1 };
});
/* a launcher must never cover a map region (it floats in the sea corner) */
const coversRegion = (page, sel) => page.$eval(sel, el => {
  const b = el.getBoundingClientRect();
  return [...document.querySelectorAll('#mapwrap .rg rect')].some(r => { const q = r.getBoundingClientRect(); return q.right > b.left + 1 && q.left < b.right - 1 && q.bottom > b.top + 1 && q.top < b.bottom - 1; });
});

async function runC10(browser, vp, tools, rm, engine){
  const tag = 'c10-' + tools + '@' + vp.join('x') + (rm ? '+rm' : '') + (engine ? '+' + engine : '');
  const other = tools === 'dock' ? 'panel' : 'dock';
  const { ctx, page } = await newPage(browser, vp, rm ? { reducedMotion:'reduce' } : {});
  await page.goto(url(C10) + '?tools=' + tools); await wait(rm ? 500 : 900);
  const T = rm ? 80 : 560, t = rm ? 60 : 160;
  const main = vp[0] === 1280 && !rm && !engine;
  const geo = results.geometry[tag] = {}, pan = results.panel[tag] = {};
  const TB = x => (tools === 'dock' ? '#dock' : '#nav') + ' [data-tool="' + x + '"]';
  /* open a tool the way a player would: dock button, or (in-panel, while closed) the Tools opener first */
  async function tool(x){
    if (await page.evaluate(x => C10.mode === x, x)) return;   // already there (pressing an active dock tool would close it)
    if (tools === 'panel' && !(await page.evaluate(() => C10.mode))) { await page.click('#opener'); await wait(T); if (await page.evaluate(x => C10.mode === x, x)) return; }
    await page.click(TB(x)); await wait(t);
  }
  await geoInstall(page);

  /* opens cleanly */
  const r0 = await mapRect(page); geo.closed = r0;
  check(tag + ' opens cleanly: workbench closed, tool access = ' + tools, !(await isVisible(page, '#wb')) && await page.evaluate(t => C10.mode === null && C10.tools === t && document.getElementById('bench').dataset.tools === t, tools));
  check(tag + ' default map is large (≥ 85% of viewport width, ≥ 55% height)', r0[2] >= vp[0] * .85 && r0[3] >= (vp[1] - 40) * .55, r0);
  check(tag + ' no permanent full-height rail element', await page.evaluate(() => !document.getElementById('rail') && !document.querySelector('.rail9')));
  check(tag + ' player-facing UI says "Map View", never "Lens"', await page.evaluate(() => { const c = document.body.cloneNode(true); c.querySelector('.mock-ribbon').remove(); return !/\bLens\b/i.test(c.textContent) && /Map View/.test(c.textContent); }));
  check(tag + ' review-only Tool access switch is in the ribbon and shows ' + tools, await page.evaluate(t => !!document.querySelector('.mock-ribbon .vswitch') && document.querySelector('.vswitch [data-tools="' + t + '"]').getAttribute('aria-pressed') === 'true', tools));
  if (tools === 'dock') {
    const d = await page.evaluate(() => {
      const b = document.getElementById('dock').getBoundingClientRect(), wo = document.getElementById('world').getBoundingClientRect();
      return { w:Math.round(b.width), h:Math.round(b.height), worldH:Math.round(wo.height), tools:[...document.querySelectorAll('#dock [data-tool]')].map(x => x.dataset.tool).join(','), heads:[...document.querySelectorAll('#dock .dk-h')].map(x => x.textContent.trim()).join(',') };
    });
    geo.dock = d;
    check(tag + ' closed: dock is a short button stack (Explore: Region, Regions, Map View · Change: Adapt, Spread, Terraform)', d.tools === 'region,regions,mapview,adapt,spread,terraform' && d.heads === 'Explore,Change' && await isVisible(page, '#dock'), d);
    check(tag + ' closed: dock is only as tall as its buttons (≤ 75% of the world height, ≤ 84 px wide)', d.h <= d.worldH * .75 && d.w <= 84, d);
    check(tag + ' closed: dock floats clear of every map region', !(await coversRegion(page, '#dock')));
    check(tag + ' closed: in-panel controls and Tools opener are hidden', !(await isVisible(page, '#opener')) && !(await isVisible(page, '#nav')));
  } else {
    const o = await page.$eval('#opener', e => { const b = e.getBoundingClientRect(); return { w:Math.round(b.width), h:Math.round(b.height) }; });
    geo.opener = o;
    check(tag + ' closed: one small Tools opener (≤ 220 × 70 px), no dock', await isVisible(page, '#opener') && o.w <= 220 && o.h <= 70 && !(await isVisible(page, '#dock')), o);
    check(tag + ' closed: Tools opener floats clear of every map region', !(await coversRegion(page, '#opener')));
  }
  check(tag + ' no horizontal scroll (idle)', await noHScroll(page));
  if (rm) check(tag + ' reduced motion detected by page', await page.evaluate(() => BM.reduceMotion === true));

  /* top banner (carried from Concept 9: larger, centred) */
  const hud = await page.evaluate(() => {
    const b = document.getElementById('banner').getBoundingClientRect();
    const bio = parseFloat(getComputedStyle(document.querySelector('.bn-bio .num')).fontSize);
    const others = [...document.querySelectorAll('.bn-v b')].map(e => parseFloat(getComputedStyle(e).fontSize));
    return { centre:Math.round(b.x + b.width / 2), vw:innerWidth, h:Math.round(b.height), w:Math.round(b.width), bio, max:Math.max(...others), top:document.querySelector('.top9').offsetHeight };
  });
  geo.hud = hud;
  check(tag + ' top banner centred (±3 px)', Math.abs(hud.centre - hud.vw / 2) <= 3, hud);
  check(tag + ' Biomass is the strongest number in the banner', hud.bio > hud.max * 1.5, hud);
  check(tag + ' banner is substantial, not a thin bar (60–90 px; top band ≤ 90 px)', hud.h >= 60 && hud.h <= 90 && hud.top <= 90, hud);
  check(tag + ' banner shows Biomass, In bloom vs goal, living regions, Dying World, climate', (await isVisible(page, '.bn-bio .num')) && /goal 70%/.test(await text(page, '.bn-cov')) && /of 10 regions living/.test(await text(page, '.bn-cov')) && /Dying World/.test(await text(page, '.bn-scn')) && /Climate/.test(await text(page, '.bn-scn')));
  check(tag + ' Pause and speed visible', (await isVisible(page, '.clk-play')) && (await isVisible(page, '.clk-speed')));
  if (main) { await wait(2600); await shot(page, 'c10-01-run-' + tools + '.png'); }

  /* Pause / speed */
  await page.click('.clk-play'); await wait(80);
  const b1 = await page.evaluate(() => BM.store.s.t); await wait(1300); const b2 = await page.evaluate(() => BM.store.s.t);
  check(tag + ' Pause stops the fake clock', b1 === b2 && await page.evaluate(() => document.body.classList.contains('is-paused')), [b1, b2]);
  check(tag + ' Pause button reads Play while paused; banner says paused', (await text(page, '.clk-play')).includes('Play') && /paused/.test(await text(page, '.bn-bio .rate')));
  await page.click('.clk-play');
  const sp = [];
  for (let k = 0; k < 3; k++) { await page.click('.clk-speed'); sp.push((await text(page, '.clk-speed .cs'))); }
  check(tag + ' speed cycles 2× → 4× → 1×', sp.join(',') === '2×,4×,1×', sp);
  await page.click('.clk-speed'); await page.click('.clk-speed');
  const t1 = await page.evaluate(() => BM.store.s.t); await wait(1100); const t2 = await page.evaluate(() => BM.store.s.t);
  check(tag + ' 4× runs the fake clock faster', t2 - t1 >= 3, t2 - t1);
  await page.click('.clk-speed');

  /* Region tool with nothing selected: explains, does not open */
  await page.evaluate(sel => document.querySelector(sel).click(), (tools === 'dock' ? '#dock' : '#nav') + ' [data-tool="region"]');
  await wait(60);
  check(tag + ' Region tool with no selection is aria-disabled and does not open the workbench', await page.evaluate(() => C10.mode === null && [...document.querySelectorAll('[data-tool="region"]')].every(b => b.getAttribute('aria-disabled') === 'true')));

  /* region click opens the workbench once, in Region mode (layout A · tabbed) */
  await geoReset(page);
  await clickRegion(page, 'frost'); await wait(T);
  const r1 = await mapRect(page); geo.open = r1;
  const openLog = await geoLog(page);
  check(tag + ' map click opens Region mode directly (no opener needed)', await page.evaluate(() => C10.mode === 'region' && C10.sel === 'frost' && map.selected === 'frost') && (await text(page, '#wbT')) === 'Frost Ridge' && await isVisible(page, '#p-region'));
  check(tag + ' opening reframes the map once (box changed, one open transition)', !same(r1, r0) && openLog.flips === 1, { r0, r1, flips:openLog.flips });
  check(tag + ' map stays large with the workbench open (≥ 50% of viewport width)', r1[2] >= vp[0] * .5, r1);
  check(tag + ' workbench and its tools sit beside the map, never over it', await page.evaluate(() => {
    const svg = document.querySelector('#mapwrap svg').getBoundingClientRect(), wb = document.getElementById('wb').getBoundingClientRect(), d = document.getElementById('dock');
    return wb.left >= svg.right - 1 && (d.hidden || d.getBoundingClientRect().left >= svg.right - 1);
  }));
  check(tag + ' Region tool now enabled and pressed', await page.evaluate(sel => document.querySelector(sel).getAttribute('aria-pressed') === 'true' && document.querySelector(sel).getAttribute('aria-disabled') === 'false', TB('region')));
  if (tools === 'dock') check(tag + ' open: dock is attached to the panel edge (touching, top-aligned)', await page.evaluate(() => { const d = document.getElementById('dock').getBoundingClientRect(), w = document.getElementById('wb').getBoundingClientRect(); return Math.abs(d.left - (w.right - 3)) <= 1.5 && Math.abs(d.top - w.top) <= 1; }));
  else check(tag + ' open: Explore / Change navigation inside the panel header, Tools opener hidden, no dock', await isVisible(page, '#nav') && !(await isVisible(page, '#opener')) && !(await isVisible(page, '#dock')) && await page.evaluate(() => document.querySelector('#wb .wb10-h').contains(document.getElementById('nav')) && [...document.querySelectorAll('#nav .ng-h')].map(h => h.textContent).join(',') === 'Explore,Change' && document.querySelectorAll('#nav [data-tool]').length === 6));
  check(tag + ' no horizontal scroll (workbench open)', await noHScroll(page));

  /* Region layout A · tabbed */
  await page.evaluate(() => BM.clock.setPaused(true));
  await clickRegion(page, 'marsh'); await wait(t);
  const pane = await page.evaluate(() => {
    const p = document.getElementById('p-region'), vis = el => el && !el.closest('[hidden]') && el.getClientRects().length > 0;
    return { visText:p.innerText, tabs:[...p.querySelectorAll('[role=tab]')].map(x => x.lastChild.textContent.trim()).join(','), spec:vis(p.querySelector('.bm-spec')), fix:p.querySelectorAll('[data-fix]').length, more:/More ▾/.test(p.textContent), sum:!!p.querySelector('.rv-a .rv-sum'), b:!!p.querySelector('.rv-b,.rv-c,.rv-dash,.rv-jump') };
  });
  const need = [/Strained/, /Establishing|Established|Seedlings|Dense/, /Waterlogged/, /Temp/, /Water/, /Soil/, /Hazard/, /\+\d/, /Roots/];
  const missing = need.filter(re => !re.test(pane.visText)).map(String);
  check(tag + ' Region uses layout A only: fixed summary (plant, status, limit, fixes) + Overview / Colony / Science tabs, no "More"', pane.sum && !pane.b && pane.tabs === 'Overview,Colony,Science' && pane.spec && pane.fix === 2 && !pane.more, pane);
  check(tag + ' Region A: summary + Overview show status, stand, limit, conditions, Biomass, focus', missing.length === 0, missing);
  await page.click('#p-region [data-tab="colony"]'); await wait(60);
  check(tag + ' Region A: Colony tab shows Roots / Leaves / Seeds + local specialization', await page.evaluate(() => document.querySelectorAll('#p-region [data-focus]').length === 4 && document.querySelectorAll('#p-region [data-spec]').length === 3));
  await page.click('#p-region [data-tab="over"]'); await wait(60);
  pan.region = await panelBox(page);
  check(tag + ' content height: Region (Overview) panel is top-aligned and not stretched to fill the column', pan.region.top <= 14 && !pan.region.panelScrolls && (vp[1] <= 768 || pan.region.gapBelow >= 40), pan.region);
  if (main) { await page.mouse.move(5, vp[1] - 5); await shot(page, 'c10-03-region-tabbed-' + tools + '.png'); }

  /* region → region: in place, zero geometry movement */
  await geoReset(page);
  const seq = ['ember', 'dust', 'cloud', 'salt', 'frost'], seen = [];
  for (const id of seq) { await clickRegion(page, id); await wait(t); seen.push(await text(page, '#wbT')); }
  const rr = await geoLog(page), r2 = await mapRect(page);
  check(tag + ' region → region updates the workbench each click (' + seen.join(' → ') + ')', seen.join('|') === 'Ember Rise|Dust Reach|Cloud Steps|Salt Flats|Frost Ridge', seen);
  check(tag + ' region → region: zero map geometry change, workbench never closed/reopened', rr.sizes.length === 0 && rr.flips === 0 && same(r2, r1), { rr, r1, r2 });
  check(tag + ' panel stays top-aligned while its height follows the content', (await panelBox(page)).top <= 14);
  geo.regionToRegion = { sizes:rr.sizes.length, flips:rr.flips };

  /* region fix preview: Terraform keeps plant anatomy, Adapt changes it (in the Region workbench) */
  const idleR = await specParts(page, '#p-region .slot-spec');
  await page.hover('#p-region [data-fix="warm"]'); await wait(90);
  const tfR = await specParts(page, '#p-region .slot-spec');
  check(tag + ' Region: Terraform fix preview keeps plant layers identical, changes environment', tfR.plant === idleR.plant && tfR.env !== idleR.env);
  await page.hover('#p-region [data-fix="cold"]'); await wait(90);
  const adR = await specParts(page, '#p-region .slot-spec');
  check(tag + ' Region: Adapt fix preview changes plant layers', adR.plant !== idleR.plant);
  check(tag + ' Region: fix hover previews on the real map', await page.evaluate(() => document.querySelectorAll('#mapwrap .pv-open').length > 0));
  await page.mouse.move(5, vp[1] - 5); await wait(60);

  /* every mode switch: zero further geometry; content-height per mode */
  await geoReset(page);
  await tool('regions');
  check(tag + ' Regions mode: tool pressed, 10 rows with triage status', await page.evaluate(sel => C10.mode === 'regions' && document.querySelector(sel).getAttribute('aria-pressed') === 'true' && document.querySelectorAll('#p-regions [data-go]').length === 10 && document.querySelectorAll('#p-regions .r9row .mc').length === 40, TB('regions')));
  pan.regions = await panelBox(page);
  const rScroll = await page.$eval('#p-regions .r9-scroll', e => ({ sh:e.scrollHeight, ch:e.clientHeight }));
  check(tag + ' content height: Regions is the tall mode; if it reaches max-height its list scrolls inside, the panel never overflows', !pan.regions.panelScrolls && (!pan.regions.atMax || rScroll.sh > rScroll.ch) && pan.regions.h >= pan.region.h - 1, { box:pan.regions, rScroll });
  await page.hover('#p-regions [data-go="tide"]'); await wait(40);
  check(tag + ' Regions: hovering a row outlines it on the map', await page.evaluate(() => document.querySelector('#mapwrap .hover-o').getAttribute('d').length > 10));
  if (main) await shot(page, 'c10-08-regions-' + tools + '.png');
  await page.mouse.move(5, vp[1] - 5);
  await tool('mapview');
  pan.mapview = await panelBox(page);
  check(tag + ' content height: Map View is short and ends well above the bottom (≥ 15% of the world height free)', !pan.mapview.atMax && pan.mapview.gapBelow >= pan.mapview.worldH * .15 && pan.mapview.h < pan.regions.h, pan.mapview);
  if (main) { await page.mouse.move(5, vp[1] - 5); await shot(page, 'c10-05-mapview-short-' + tools + '.png'); }
  for (const b of ['adapt', 'spread', 'terraform']) { await tool(b); pan[b] = await panelBox(page); }
  check(tag + ' content height: no mode makes the panel itself overflow (each body scrolls inside)', ['adapt', 'spread', 'terraform'].every(b => !pan[b].panelScrolls), pan);
  /* at 1024×768 the world area is only 646 px tall: Spread may reach max-height there and scroll inside (recorded in results.panel) */
  if (vp[1] >= 800) check(tag + ' content height: Spread (3 cards) ends above the bottom, not stretched to max-height', !pan.spread.atMax && pan.spread.gapBelow >= 24, pan.spread);
  check(tag + ' content height: modes have different heights (not one fixed slab)', new Set(['region', 'regions', 'mapview', 'adapt', 'spread', 'terraform'].map(m => Math.round(pan[m].h / 8))).size >= 3, ['region', 'regions', 'mapview', 'adapt', 'spread', 'terraform'].map(m => pan[m].h));
  await tool('region');
  check(tag + ' Region tool returns to the selected region', await page.evaluate(() => C10.mode === 'region' && C10.sel === 'frost') && (await text(page, '#wbT')) === 'Frost Ridge');
  const sw = await geoLog(page);
  check(tag + ' Region → Regions → Map View → Adapt → Spread → Terraform → Region: zero further map geometry change', sw.sizes.length === 0 && sw.flips === 0 && same(await mapRect(page), r1), sw);
  geo.modeSwitches = { sizes:sw.sizes.length, flips:sw.flips };

  /* tool-access switch while open: same mode, same selection, zero geometry */
  await geoReset(page);
  const pb0 = await panelBox(page);
  await page.click('.vswitch [data-tools="' + other + '"]'); await wait(t);
  const pb1 = await panelBox(page);
  check(tag + ' tool-access switch → ' + other + ' keeps Region mode and the selected region', await page.evaluate(o => C10.tools === o && C10.mode === 'region' && C10.sel === 'frost' && map.selected === 'frost', other) && (await text(page, '#wbT')) === 'Frost Ridge');
  check(tag + ' tool-access switch: the panel keeps its left edge and top', Math.abs(pb0.left - pb1.left) <= 1 && pb0.top === pb1.top, { pb0, pb1 });
  await page.click('.vswitch [data-tools="' + tools + '"]'); await wait(t);
  await tool('adapt');
  await page.click('.vswitch [data-tools="' + other + '"]'); await wait(t);
  check(tag + ' tool-access switch keeps Adapt mode and "Considering for Frost Ridge"', await page.evaluate(() => C10.mode === 'adapt' && C10.sel === 'frost') && /Considering for Frost Ridge/.test(await text(page, '#ctx')));
  await page.click('.vswitch [data-tools="' + tools + '"]'); await wait(t);
  const vs = await geoLog(page);
  check(tag + ' tool-access switches (×4): zero map geometry change', vs.sizes.length === 0 && vs.flips === 0 && same(await mapRect(page), r1), vs);
  geo.toolAccessSwitch = { sizes:vs.sizes.length, flips:vs.flips };

  /* Adapt / Spread / Terraform: previews on the uncovered map; map click RE-TARGETS and stays in the mode */
  await geoReset(page);
  const RT = { adapt:['frost', 'dust'], spread:['dust', 'tide'], terraform:['tide', 'marsh'] };
  for (const b of ['adapt', 'spread', 'terraform']) {
    await tool(b);
    const host = '#p-' + b, [from, to] = RT[b];
    if (await page.evaluate(() => C10.sel) !== from) await clickRegion(page, from), await wait(t);
    check(tag + ' ' + b + ': same workbench, tool pressed, region context ("Considering for") + global wording', await page.evaluate(([b, sel, from]) => C10.mode === b && C10.sel === from && document.querySelector(sel).getAttribute('aria-pressed') === 'true', [b, TB(b), from]) && new RegExp('Considering for ' + (await page.evaluate(id => BM.region(id).name, from))).test(await text(page, '#ctx')) && /Global upgrade/.test(await text(page, '#ctx')));
    const idle = await specParts(page, host + ' .ab-specbox');
    const card = b === 'adapt' ? 'cold' : b === 'spread' ? 'waterSeeds' : 'warm';
    await page.hover(host + ' [data-id="' + card + '"]'); await wait(120);
    const pv = await specParts(page, host + ' .ab-specbox');
    const mp = await page.evaluate(() => {
      const svg = document.querySelector('#mapwrap svg').getBoundingClientRect(), wb = document.getElementById('wb').getBoundingClientRect();
      const paths = [...document.querySelectorAll('#mapwrap .pv-open, #mapwrap .pv-worse')];
      const uncovered = paths.every(p => { const r = p.getBoundingClientRect(), x = r.x + r.width / 2, y = r.y + r.height / 2; const el = document.elementFromPoint(x, y); return x < wb.left && el && !!el.closest('#mapwrap'); });
      return { open:document.querySelectorAll('#mapwrap .pv-open').length, worse:document.querySelectorAll('#mapwrap .pv-worse').length, arcs:document.querySelectorAll('#mapwrap .seedarc').length,
        tint:+document.querySelector('#mapwrap .tint').getAttribute('opacity'), uncovered, overlap:wb.left < svg.right - 1 };
    });
    check(tag + ' ' + b + ' hover preview is drawn on the real map and every highlighted region is uncovered', (mp.open + mp.worse > 0 || mp.arcs > 0) && mp.uncovered && !mp.overlap, mp);
    if (b === 'adapt') {
      check(tag + ' Adapt preview changes the plant (anatomy)', pv.plant !== idle.plant);
      check(tag + ' Adapt: card tagged as helping Frost Ridge; verdict names it', /helps Frost Ridge/.test(await text(page, host + ' [data-id="cold"]')) && /Would open Frost Ridge/.test(await text(page, '#ctx .verdict')));
    }
    if (b === 'spread') check(tag + ' Spread preview draws seed paths on the real map', mp.arcs > 0, mp);
    if (b === 'terraform') {
      check(tag + ' Terraform preview: plant layers identical (anatomy unchanged), environment changed', pv.plant === idle.plant && pv.env !== idle.env);
      check(tag + ' Terraform preview: "plant unchanged" tag + planet tint on the real map', (await isVisible(page, host + ' .unch')) && mp.tint > 0, mp);
      if (main) await shot(page, 'c10-07-terraform-' + tools + '.png');
    }
    await page.mouse.move(5, vp[1] - 5); await wait(40);
    /* the BLOOM-020 behaviour: click ANOTHER region → stay in the mode, re-target */
    const g0 = await geoLog(page);
    await clickRegion(page, to); await wait(t);
    const toName = await page.evaluate(id => BM.region(id).name, to);
    const g1 = await geoLog(page);
    check(tag + ' ' + b + ': clicking ' + toName + ' on the map stays in ' + b + ' and re-targets "Considering for"', await page.evaluate(([b, to]) => C10.mode === b && C10.sel === to && map.selected === to, [b, to]) && new RegExp('Considering for ' + toName).test(await text(page, '#ctx')) && (await text(page, '#wbT')) === (await page.evaluate(b => ({ adapt:'Adapt your plant', spread:'Spread your seeds', terraform:'Terraform the planet' })[b], b)));
    check(tag + ' ' + b + ': re-target updates the plant caption, verdict prompt and card tags for ' + toName, new RegExp('Your plant in ' + toName).test(await text(page, host + ' .ab-cap')) && new RegExp(toName).test(await text(page, '#ctx .verdict')) && await page.evaluate(([host, from]) => ![...document.querySelectorAll(host + ' .ctx-tag:not([hidden])')].some(x => x.textContent.includes(BM.region(from).name)), [host, from]));
    check(tag + ' ' + b + ': re-target moves the map zero times', g1.sizes.length === g0.sizes.length && g1.flips === g0.flips, { g0, g1 });
    if (b === 'adapt') {
      await page.hover(host + ' [data-id="drought"]'); await wait(120);
      check(tag + ' Adapt after re-target: verdict speaks about Dust Reach (Drought Adaptation opens it)', /Dust Reach/.test(await text(page, '#ctx .verdict')) && /helps Dust Reach/.test(await text(page, host + ' [data-id="drought"]')));
      if (main) await shot(page, 'c10-06-adapt-retarget-' + tools + '.png');
      await page.mouse.move(5, vp[1] - 5); await wait(40);
    }
  }
  /* intentional ways back to Region details */
  await page.click('#ctx .ctx-d'); await wait(t);
  check(tag + ' "Details" in the context bar opens Region details for the considered region (Marsh Low)', await page.evaluate(() => C10.mode === 'region' && C10.sel === 'marsh') && (await text(page, '#wbT')) === 'Marsh Low');
  await tool('spread');
  await clickRegion(page, 'marsh'); await wait(t);
  check(tag + ' clicking the already-selected region again opens its Region details', await page.evaluate(() => C10.mode === 'region' && C10.sel === 'marsh'));
  await tool('terraform');
  await tool('region');
  check(tag + ' the Region tool also opens Region details from Terraform', await page.evaluate(() => C10.mode === 'region' && C10.sel === 'marsh'));
  await tool('adapt');
  await page.click('#ctx .ctx-x'); await wait(t);
  check(tag + ' Clear drops the region context; Adapt stays open with global wording', await page.evaluate(() => C10.mode === 'adapt' && C10.sel === null && map.selected === null) && /Global upgrades/.test(await text(page, '#ctx')));
  await clickRegion(page, 'frost'); await wait(t);
  check(tag + ' with no context, a map click in Adapt sets "Considering for" and stays in Adapt', await page.evaluate(() => C10.mode === 'adapt' && C10.sel === 'frost') && /Considering for Frost Ridge/.test(await text(page, '#ctx')));
  const rtg = await geoLog(page);
  check(tag + ' all Adapt / Spread / Terraform work above: zero map geometry change', rtg.sizes.length === 0 && rtg.flips === 0 && same(await mapRect(page), r1), rtg);
  geo.retarget = { sizes:rtg.sizes.length, flips:rtg.flips };

  /* Adapt is tall: internal scroll with the plant pinned at the top */
  const ah = await page.evaluate(() => { const h = document.querySelector('#p-adapt.ab-host'); return { sh:h.scrollHeight, ch:h.clientHeight }; });
  if (ah.sh > ah.ch + 1) {
    await page.$eval('#p-adapt.ab-host', h => { h.scrollTop = h.scrollHeight; }); await wait(60);
    check(tag + ' Adapt scrolls inside the panel and the plant preview stays pinned in view', await page.evaluate(() => { const h = document.querySelector('#p-adapt.ab-host').getBoundingClientRect(), s = document.querySelector('#p-adapt .ab-spec').getBoundingClientRect(); return s.top >= h.top - 1 && s.bottom <= h.bottom; }), ah);
    await page.$eval('#p-adapt.ab-host', h => { h.scrollTop = 0; });
  } else check(tag + ' Adapt fits without internal scroll at this size (no scroll needed)', true, ah);

  /* fake purchase from the workbench */
  await page.evaluate(() => BM.clock.setPaused(false));
  await page.click('#p-adapt [data-id="cold"]'); await wait(120);
  check(tag + ' buying Cold Tolerance works (fake), opens Frost Ridge, clears the card tag', await page.evaluate(() => BM.store.s.owned.cold === true && BM.store.s.reg.frost.colony === 'living' && document.querySelector('#p-adapt [data-id="cold"] .ctx-tag').hidden));
  await page.mouse.move(5, vp[1] - 5);

  /* Map View: hover / focus previews, leaving restores, click commits */
  await geoReset(page);
  await tool('mapview');
  check(tag + ' Map View mode: five choices, Plants is committed by default', await page.evaluate(() => C10.mode === 'mapview' && document.querySelectorAll('#p-mapview [data-view]').length === 5 && C10.committed === '' && map.lens === null && document.querySelector('#p-mapview [data-view=""]').getAttribute('aria-pressed') === 'true'));
  await page.hover('#p-mapview [data-view="water"]'); await wait(60);
  check(tag + ' Map View hover previews the Water overlay on the map (uncommitted)', await page.evaluate(() => map.lens === 'water' && C10.preview === 'water' && C10.committed === '') && (await isVisible(page, '#mvLegend')) && /PREVIEW/.test(await text(page, '#mvLegend')));
  await page.hover('#wb .wb10-t'); await wait(60);
  check(tag + ' leaving an uncommitted Map View option restores the committed view', await page.evaluate(() => map.lens === null && C10.preview === null) && !(await isVisible(page, '#mvLegend')));
  await page.focus('#p-mapview [data-view="temp"]'); await wait(40);
  check(tag + ' keyboard focus on a Map View option previews it', await page.evaluate(() => map.lens === 'temp' && C10.committed === ''));
  await page.keyboard.press('ArrowDown'); await wait(40);
  check(tag + ' arrow keys move the preview (Temperature → Water)', await page.evaluate(() => map.lens === 'water' && document.activeElement.dataset.view === 'water'));
  await page.focus('#wbX'); await wait(40);
  check(tag + ' moving focus away restores the committed view', await page.evaluate(() => map.lens === null));
  await page.click('#p-mapview [data-view="soil"]'); await wait(60);
  check(tag + ' clicking commits a Map View (Soil); visibly active in the chooser, legend and tool button', await page.evaluate(sel => C10.committed === 'soil' && map.lens === 'soil' && document.querySelector('#p-mapview [data-view="soil"]').getAttribute('aria-pressed') === 'true' && /Soil/.test(document.querySelector(sel).title) && !document.querySelector(sel + ' .vdot').hidden, TB('mapview')) && /Soil/.test(await text(page, '#mvLegend')));
  await page.hover('#p-mapview [data-view="hazard"]'); await wait(60);
  const hz = await page.evaluate(() => map.lens);
  await page.hover('#wb .wb10-t'); await wait(60);
  check(tag + ' with Soil committed: hover Hazard previews, leaving returns to Soil', hz === 'hazard' && await page.evaluate(() => map.lens === 'soil'), hz);
  await tool('adapt');
  check(tag + ' committed Map View persists while another mode is open', await page.evaluate(() => map.lens === 'soil' && C10.mode === 'adapt') && await isVisible(page, '#mvLegend'));
  await page.click('#mvLegend .clr'); await wait(60);
  check(tag + ' returning to Plants removes the heatmap', await page.evaluate(() => map.lens === null && C10.committed === '') && !(await isVisible(page, '#mvLegend')));
  const mvg = await geoLog(page);
  check(tag + ' Map View preview / commit: zero map geometry change', mvg.sizes.length === 0 && mvg.flips === 0, mvg);

  /* closing restores the original geometry */
  await page.click('#wbX'); await wait(T);
  const r3 = await mapRect(page); geo.closedAgain = r3;
  check(tag + ' closing the workbench restores the map exactly and clears the selection', same(r3, r0) && !(await isVisible(page, '#wb')) && await page.evaluate(() => C10.mode === null && map.selected === null), { r0, r3 });
  check(tag + ' closed again: the ' + (tools === 'dock' ? 'dock is a floating stack again' : 'Tools opener is back'), tools === 'dock' ? await isVisible(page, '#dock') : await isVisible(page, '#opener'));
  /* tool-access switch while closed: zero geometry */
  await geoReset(page);
  await page.click('.vswitch [data-tools="' + other + '"]'); await wait(t);
  const swClosed = await page.evaluate(() => ({ dock:!document.getElementById('dock').hidden, opener:!document.getElementById('opener').hidden, mode:C10.mode }));
  await page.click('.vswitch [data-tools="' + tools + '"]'); await wait(t);
  const cg = await geoLog(page);
  check(tag + ' tool-access switch while closed swaps dock ↔ Tools opener with zero map geometry change', swClosed.mode === null && (other === 'dock' ? swClosed.dock && !swClosed.opener : !swClosed.dock && swClosed.opener) && cg.sizes.length === 0 && same(await mapRect(page), r0), { swClosed, cg });

  /* keyboard */
  await page.focus('#mapwrap .rg[data-r="sunny"]'); await page.keyboard.press('Enter'); await wait(T);
  check(tag + ' keyboard: Enter on a region opens Region mode and keeps focus on the map', await page.evaluate(() => C10.mode === 'region' && C10.sel === 'sunny' && document.activeElement.dataset.r === 'sunny') && /Sunny Shelf/.test(await text(page, '#c10live')));
  await page.keyboard.press('Tab'); await page.keyboard.press('Enter'); await wait(t);
  check(tag + ' keyboard: Tab + Enter on the next region updates the workbench in place', await page.evaluate(() => C10.mode === 'region' && C10.sel !== 'sunny' && document.activeElement.dataset.r === C10.sel));
  const kbSel = await page.evaluate(() => C10.sel);
  await page.keyboard.press('Escape'); await wait(T);
  check(tag + ' keyboard: Esc closes the workbench, focus returns to the region, map restored', await page.evaluate(id => C10.mode === null && document.activeElement.dataset.r === id, kbSel) && same(await mapRect(page), r0));
  if (tools === 'dock') {
    await page.focus('#dock [data-tool="terraform"]'); await page.keyboard.press('Enter'); await wait(T);
    check(tag + ' keyboard: dock tool opens its mode and moves focus into the workbench', await page.evaluate(() => C10.mode === 'terraform' && document.getElementById('wb').contains(document.activeElement)));
    await page.focus('#mapwrap .rg[data-r="ember"]'); await page.keyboard.press('Enter'); await wait(t);
    check(tag + ' keyboard: Enter on a region while in Terraform re-targets and stays in Terraform', await page.evaluate(() => C10.mode === 'terraform' && C10.sel === 'ember') && /Now considering Ember Rise/.test(await text(page, '#c10live')));
    await page.focus('#dock [data-tool="terraform"]');
    await page.keyboard.press('Escape'); await wait(T);
    check(tag + ' keyboard: Esc closes and focus is on the dock tool', await page.evaluate(() => C10.mode === null && document.activeElement === document.querySelector('#dock [data-tool="terraform"]')));
    await page.keyboard.press('Enter'); await wait(T); await page.focus('#dock [data-tool="terraform"]'); await page.keyboard.press('Enter'); await wait(T);
    check(tag + ' keyboard: pressing the active dock tool again closes the workbench', await page.evaluate(() => C10.mode === null));
  } else {
    await page.focus('#opener'); await page.keyboard.press('Enter'); await wait(T);
    check(tag + ' keyboard: Tools opener opens the last tool and moves focus into the workbench', await page.evaluate(() => C10.mode !== null && C10.mode !== 'region' && document.getElementById('wb').contains(document.activeElement)));
    await page.focus('#nav [data-tool="terraform"]'); await page.keyboard.press('Enter'); await wait(t);
    check(tag + ' keyboard: in-panel Terraform control switches mode', await page.evaluate(() => C10.mode === 'terraform'));
    await page.focus('#mapwrap .rg[data-r="ember"]'); await page.keyboard.press('Enter'); await wait(t);
    check(tag + ' keyboard: Enter on a region while in Terraform re-targets and stays in Terraform', await page.evaluate(() => C10.mode === 'terraform' && C10.sel === 'ember') && /Now considering Ember Rise/.test(await text(page, '#c10live')));
    await page.focus('#nav [data-tool="terraform"]');
    await page.keyboard.press('Escape'); await wait(T);
    check(tag + ' keyboard: Esc closes; focus moves to the Tools opener (the in-panel control is gone)', await page.evaluate(() => C10.mode === null && document.activeElement === document.getElementById('opener')));
  }

  /* hidden controls not tabbable */
  const walk = await tabWalk(page, 40);
  check(tag + ' Tab walk (closed): every stop visible with a focus ring (' + walk.count + ' stops)', walk.bad.length === 0 && walk.count > 10, walk.bad.slice(0, 4));
  check(tag + ' Tab walk (closed): never lands in the other variant\'s controls or the closed workbench', !walk.where.includes('wb') && !walk.where.includes('nav') && (tools === 'dock' ? !walk.where.includes('opener') : !walk.where.includes('dock')), walk.where);
  await clickRegion(page, 'salt'); await wait(T);
  const walk2 = await tabWalk(page, 70);
  check(tag + ' Tab walk (Region open): no hidden stops (inactive panes / tabs excluded)', walk2.bad.length === 0, walk2.bad.slice(0, 4));
  check(tag + ' Tab walk (Region open): reaches the ' + (tools === 'dock' ? 'dock' : 'in-panel navigation') + ' and never the hidden variant', walk2.where.includes(tools === 'dock' ? 'dock' : 'nav') && !walk2.where.includes(tools === 'dock' ? 'nav' : 'dock') && !walk2.where.includes('opener'), walk2.where);

  /* extra screenshots */
  if (vp[0] === 1024 && !rm && !engine) {
    await clickRegion(page, 'marsh'); await wait(t); await page.mouse.move(5, vp[1] - 5); await shot(page, 'c10-09-1024-region-' + tools + '.png');
    await tool('adapt'); await clickRegion(page, 'frost'); await wait(t); await page.hover('#p-adapt [data-id="cold"]'); await wait(120); await shot(page, 'c10-10-1024-adapt-' + tools + '.png');
    await page.mouse.move(5, vp[1] - 5);
  }
  if (vp[0] === 1440 && !rm && !engine) {
    await tool('mapview'); await page.hover('#p-mapview [data-view="temp"]'); await wait(80); await shot(page, 'c10-11-1440-mapview-preview-' + tools + '.png');
    await page.mouse.move(5, vp[1] - 5);
  }
  check(tag + ' no horizontal scroll (end)', await noHScroll(page));
  check(tag + ' no console errors', page._errs.length === 0, page._errs.slice(0, 3));
  results.errors.push(...page._errs.map(e => tag + ': ' + e));
  await ctx.close();
}

async function runGallery(browser){
  const { ctx, page } = await newPage(browser, [1280, 800]);
  await page.goto(url('index.html')); await wait(300);
  check('gallery defaults to Refinement (BLOOM-020)', !(await page.$eval('#panel-refinement', e => e.hidden)) && await page.$eval('#panel-convergence', e => e.hidden) && await page.$eval('#panel-round2', e => e.hidden) && await page.$eval('#panel-round1', e => e.hidden));
  check('gallery: Refinement launches Concept 10; Convergence still launches Concept 9', await page.evaluate(() => !!document.querySelector('#panel-refinement a[href="concept-10-refined-bench.html"]') && !!document.querySelector('#panel-convergence a[href="concept-9-unified-bench.html"]')));
  check('gallery: Round 2 still launches Concepts 5–8, Round 1 still launches 1–4', await page.evaluate(() => ['5-popover','6-sidecar','7-bottom-bench','8-side-bench'].every(f => document.querySelector('#panel-round2 a[href="concept-' + f + '.html"]')) && ['1-hybrid','2-drawers','3-specimen','4-shelf'].every(f => document.querySelector('#panel-round1 a[href="concept-' + f + '.html"]'))));
  await shot(page, '00-gallery-refinement.png');
  const w = await tabWalk(page, 40);
  check('gallery: hidden tabs\' links not tabbable', w.bad.length === 0 && !(await page.evaluate(() => !!document.activeElement.closest('#panel-convergence, #panel-round1, #panel-round2'))), w.bad.slice(0, 3));
  await page.focus('#tab-refinement');
  const order = [];
  for (let k = 0; k < 4; k++) { await page.keyboard.press('ArrowRight'); await wait(50); order.push(await page.evaluate(() => document.activeElement.id.slice(4) + (document.getElementById('panel-' + document.activeElement.id.slice(4)).hidden ? '!' : ''))); }
  check('gallery tabs: arrow keys walk Refinement → Convergence → Round 2 → Round 1 → wrap', order.join(',') === 'convergence,round2,round1,refinement', order);
  const reach = [];
  for (const [tab, files] of [['round1', ['1-hybrid','2-drawers','3-specimen','4-shelf']], ['round2', ['5-popover','6-sidecar','7-bottom-bench','8-side-bench']], ['convergence', ['9-unified-bench']], ['refinement', ['10-refined-bench']]]) {
    for (const f of files) {
      await page.goto(url('index.html#' + tab)); await wait(150);
      await page.click('#panel-' + tab + ' a[href="concept-' + f + '.html"]'); await page.waitForLoadState(); await wait(250);
      const ok = (await page.evaluate(() => location.pathname.split('/').pop())) === 'concept-' + f + '.html';
      await page.click('.mock-ribbon a'); await page.waitForLoadState(); await wait(150);
      const backOk = !(await page.$eval('#panel-' + tab, e => e.hidden));
      reach.push([f, ok, backOk]);
    }
  }
  check('gallery: Concepts 1–10 all reachable, and each back link returns to its own tab', reach.length === 10 && reach.every(r => r[1] && r[2]), reach.filter(r => !r[1] || !r[2]));
  const ctx2 = await browser.newContext({ viewport:{ width:1280, height:800 } });
  const p2 = await ctx2.newPage();
  await p2.goto(url('index.html')); await p2.evaluate(() => { localStorage.setItem('bloomMockTab', 'convergence'); localStorage.setItem('bloomMockRound', 'round2'); localStorage.removeItem('bloomMockTab20'); }); await p2.reload(); await wait(200);
  check('gallery: an old BLOOM-018 / BLOOM-019 remembered tab does not hide the new Refinement default', !(await p2.$eval('#panel-refinement', e => e.hidden)));
  await ctx2.close();
  for (const vp of VIEWPORTS) { await page.setViewportSize({ width:vp[0], height:vp[1] }); check('gallery no horizontal scroll @' + vp.join('x'), await noHScroll(page)); }
  check('gallery: no console errors', page._errs.length === 0, page._errs.slice(0, 3));
  await ctx.close();
}

/* Concepts 1–9 regression smoke: BLOOM-020 changed no shared file (shared.*, r2.*, c9.*) — this proves they still load and work */
async function runOlder(browser){
  const OLD = [['concept-1-hybrid.html', '[data-board="adapt"]'], ['concept-2-drawers.html', '.rail [data-sheet="adapt"]'], ['concept-3-specimen.html', '[data-pp="adapt"]'], ['concept-4-shelf.html', '.pill [data-b="adapt"]'],
    ['concept-5-popover.html', '.launch [data-b="adapt"]'], ['concept-6-sidecar.html', '.launch [data-b="adapt"]'], ['concept-7-bottom-bench.html', '.launch [data-b="adapt"]'], ['concept-8-side-bench.html', '.launch [data-b="adapt"]'],
    ['concept-9-unified-bench.html', '#rail [data-tool="adapt"]']];
  for (const [f, open] of OLD) {
    const { ctx, page } = await newPage(browser, [1280, 800]);
    await page.goto(url(f)); await wait(700);
    await clickRegion(page, 'frost'); await wait(450);
    const sel = await page.evaluate(() => map.selected);
    await page.keyboard.press('Escape'); await wait(350);
    await page.locator(open).first().click(); await wait(550);
    const card = page.locator('.tcard[data-id="drought"]:visible').first();
    let pv = null;
    if (await card.count()) { await card.hover(); await wait(120); pv = await page.evaluate(() => document.querySelectorAll('.bm-map .pv-open').length); }
    await page.keyboard.press('Escape'); await wait(400);
    check('regression ' + f + ': loads, selects a region, opens Adapt and previews a card, no errors', sel === 'frost' && (!/concept-[5-9]/.test(f) || pv > 0) && page._errs.length === 0, { sel, pv, errs:page._errs.slice(0, 2) });
    await ctx.close();
  }
}

(async () => {
  const browser = await chromium.launch();
  console.log('gallery…'); await runGallery(browser);
  console.log('concepts 1–9 regression…'); await runOlder(browser);
  for (const vp of VIEWPORTS) for (const tl of ['dock', 'panel']) { console.log('concept 10', tl, vp.join('x')); await runC10(browser, vp, tl, false); }
  for (const tl of ['dock', 'panel']) { console.log('concept 10 reduced motion', tl); await runC10(browser, [1280, 800], tl, true); }
  await browser.close();
  if (process.argv.includes('--firefox')) {
    const fb = await firefox.launch();
    for (const vp of [[1280, 800], [1024, 768]]) for (const tl of ['dock', 'panel']) { console.log('concept 10 firefox', tl, vp.join('x')); await runC10(fb, vp, tl, false, 'firefox'); }
    await fb.close();
  }
  check('no external network requests', results.external.length === 0, results.external.slice(0, 5));
  results.summary = { total:results.checks.length, failed:fails };
  fs.writeFileSync(path.join(OUT, 'qa-results.json'), JSON.stringify(results, null, 1));
  console.log((fails ? 'FAIL' : 'PASS') + ' — ' + (results.checks.length - fails) + '/' + results.checks.length + ' checks');
  for (const k of Object.keys(results.geometry)) console.log(k, JSON.stringify(results.geometry[k]));
  for (const k of Object.keys(results.panel)) console.log('panel', k, JSON.stringify(Object.fromEntries(Object.entries(results.panel[k]).map(([m, b]) => [m, b.h + 'h/' + b.gapBelow + 'below' + (b.atMax ? '/MAX' : '')]))));
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
