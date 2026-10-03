#!/usr/bin/env node
/*
  BLOOM-019 QA driver for the UI concept sandbox (demos/ui-mockups/), Concept 9 — Unified side workbench.
  VISUAL MOCKUPS ONLY. This checks the sandbox pages, not the game. Needs Playwright (Chromium; Firefox optional):
    NODE_PATH="$(npm root -g)" node docs/evidence/bloom-019/qa-ui-mockups-c9.js [--shots] [--firefox]
  Writes docs/evidence/bloom-019/qa-results.json (+ screenshots with --shots). Exit code 1 on any failed check.

  Geometry is MEASURED: a ResizeObserver on the map SVG records every size the map takes. After the workbench has opened once,
  the log is cleared, and every later step (region → region, Regions pick, mode switches, A/B/C switches, Map View) must add
  ZERO entries. The bounding box is also compared before / after each step.

  Covers: gallery (Convergence default, Concepts 1–9 reachable, hidden tabs not tabbable, back links); Concepts 1–8 smoke
  (r2.js got one additive hook); Concept 9 at 1280×800, 1024×768, 1440×900 (+ reduced motion, + Firefox): HUD banner, Pause /
  speed, region click → workbench once, region → region in place, A/B/C preserving the selection, Regions → Region, Region →
  Adapt → Spread → Terraform → Map View → Regions without a second reframe, Map View hover / focus preview + restore + commit,
  upgrade previews on the uncovered map, region context, specimen rule (Adapt changes the plant layers, Terraform only the
  environment layer), fake purchase, keyboard + Esc + focus return, Tab walks, no horizontal scroll, no external requests,
  no console errors.
*/
'use strict';
const path = require('path'), fs = require('fs');
const { chromium, firefox } = require('playwright');
const ROOT = path.resolve(__dirname, '../../..');
const DIR = path.join(ROOT, 'demos/ui-mockups');
const OUT = __dirname;
const SHOTS = process.argv.includes('--shots');
const url = f => 'file://' + path.join(DIR, f);
const C9 = 'concept-9-unified-bench.html';
const VIEWPORTS = [[1280, 800], [1024, 768], [1440, 900]];
const results = { when:new Date().toISOString(), checks:[], geometry:{}, external:[], errors:[] };
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
      return { tag:a.tagName, id:a.id || a.dataset.r || a.dataset.tool || a.dataset.view || (a.textContent || '').trim().slice(0, 24), w:r.width, h:r.height, hiddenAnc, op:Math.round(op * 100) / 100, ring, inX };
    });
    if (!d) continue; seen.push(d);
    if (d.hiddenAnc || d.w < 1 || d.h < 1 || d.op < .5 || d.ring === 'none' || !d.inX) bad.push(d);
  }
  return { bad, count:seen.length };
}
async function shot(page, name, clip){
  if (!SHOTS) return;
  await page.evaluate(() => document.querySelectorAll('.toast').forEach(t => t.remove()));
  const wasPaused = await page.evaluate(() => !!(window.BM && BM.clock.paused));   // capture the running look; checks that need a frozen clock re-pause
  if (wasPaused) await page.evaluate(() => BM.clock.setPaused(false));
  await wait(520);
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

async function runC9(browser, vp, rm, engine){
  const tag = 'c9@' + vp.join('x') + (rm ? '+rm' : '') + (engine ? '+' + engine : '');
  const { ctx, page } = await newPage(browser, vp, rm ? { reducedMotion:'reduce' } : {});
  await page.goto(url(C9)); await wait(rm ? 500 : 900);
  const T = rm ? 80 : 560, t = rm ? 60 : 160;
  const main = vp[0] === 1280 && !rm && !engine;
  const geo = results.geometry[tag] = {};
  await geoInstall(page);

  /* 2. opens cleanly */
  const r0 = await mapRect(page); geo.closed = r0;
  check(tag + ' opens cleanly: workbench closed, no region popup element', !(await isVisible(page, '#wb')) && await page.evaluate(() => !document.getElementById('rp') && C9.mode === null));
  check(tag + ' default map is large (≥ 80% of viewport width available, ≥ 55% height)', r0[2] >= vp[0] * .8 && r0[3] >= (vp[1] - 40) * .55, r0);
  check(tag + ' rail: five tools in two groups (Explore: Regions, Map View · Change: Adapt, Spread, Terraform)', await page.evaluate(() => {
    const ts = [...document.querySelectorAll('#rail [data-tool]')].map(b => b.dataset.tool).join(',');
    const hs = [...document.querySelectorAll('#rail .rg-h')].map(h => h.textContent.trim()).join(',');
    return ts === 'regions,mapview,adapt,spread,terraform' && hs === 'Explore,Change';
  }));
  check(tag + ' rail is compact (≤ 84 px wide) and every tool visible', await page.evaluate(() => document.getElementById('rail').offsetWidth <= 84) && (await Promise.all(['regions','mapview','adapt','spread','terraform'].map(x => isVisible(page, '#rail [data-tool="' + x + '"]')))).every(Boolean));
  check(tag + ' player-facing UI says "Map View", never "Lens"', await page.evaluate(() => { const c = document.body.cloneNode(true); c.querySelector('.mock-ribbon').remove(); return !/\bLens\b/i.test(c.textContent) && /Map View/.test(c.textContent); }));
  check(tag + ' no horizontal scroll (idle)', await noHScroll(page));
  if (rm) check(tag + ' reduced motion detected by page', await page.evaluate(() => BM.reduceMotion === true));

  /* top banner */
  const hud = await page.evaluate(() => {
    const b = document.getElementById('banner').getBoundingClientRect();
    const bio = parseFloat(getComputedStyle(document.querySelector('.bn-bio .num')).fontSize);
    const others = [...document.querySelectorAll('.bn-v b')].map(e => parseFloat(getComputedStyle(e).fontSize));
    return { centre:Math.round(b.x + b.width / 2), vw:innerWidth, h:Math.round(b.height), w:Math.round(b.width), bio, max:Math.max(...others), top:document.querySelector('.top9').offsetHeight };
  });
  geo.hud = hud;
  check(tag + ' top banner centred (±3 px)', Math.abs(hud.centre - hud.vw / 2) <= 3, hud);
  check(tag + ' Biomass is the strongest number in the banner', hud.bio > hud.max * 1.5, hud);
  check(tag + ' banner is substantial but not tall (60–90 px, top band ≤ 90 px)', hud.h >= 60 && hud.h <= 90 && hud.top <= 90, hud);
  check(tag + ' banner shows Biomass, In bloom vs goal, living regions, Dying World, climate', (await isVisible(page, '.bn-bio .num')) && /goal 70%/.test(await text(page, '.bn-cov')) && /of 10 regions living/.test(await text(page, '.bn-cov')) && /Dying World/.test(await text(page, '.bn-scn')) && /Climate/.test(await text(page, '.bn-scn')));
  check(tag + ' Pause and speed visible', (await isVisible(page, '.clk-play')) && (await isVisible(page, '.clk-speed')));
  if (main) { await wait(2600); await shot(page, 'c9-01-run.png'); await shot(page, 'c9-02-hud.png', { x:0, y:40, width:vp[0], height:hud.top + 10 }); }

  /* 11–12. Pause / speed */
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

  /* 3. clicking a region opens the workbench once, in Region mode */
  await geoReset(page);
  await clickRegion(page, 'frost'); await wait(T);
  const r1 = await mapRect(page); geo.open = r1;
  const openLog = await geoLog(page);
  check(tag + ' region click opens the workbench in Region mode (Frost Ridge)', await page.evaluate(() => C9.mode === 'region' && C9.sel === 'frost' && map.selected === 'frost') && (await text(page, '#wbT')) === 'Frost Ridge' && await isVisible(page, '#p-region'));
  check(tag + ' Region mode is obvious in the workbench header', /^Region/.test(await text(page, '#wb .ml')) && await isVisible(page, '#wbAll'));
  check(tag + ' opening reframes the map once (box changed, one open transition)', !same(r1, r0) && openLog.flips === 1, { r0, r1, flips:openLog.flips });
  check(tag + ' map stays large with the workbench open (≥ 50% of viewport width)', r1[2] >= vp[0] * .5, r1);
  check(tag + ' workbench sits beside the map, never over it', await page.evaluate(() => document.getElementById('wb').getBoundingClientRect().left >= document.querySelector('#mapwrap svg').getBoundingClientRect().right - 1));
  check(tag + ' no horizontal scroll (workbench open)', await noHScroll(page));

  /* 4. region → region: in place, zero geometry movement */
  await geoReset(page);
  const seq = ['ember', 'dust', 'marsh', 'cloud', 'salt'], seen = [];
  for (const id of seq) { await clickRegion(page, id); await wait(t); seen.push(await text(page, '#wbT')); }
  const rr = await geoLog(page), r2 = await mapRect(page);
  check(tag + ' region → region updates the workbench each click (' + seen.join(' → ') + ')', seen.join('|') === 'Ember Rise|Dust Reach|Marsh Low|Cloud Steps|Salt Flats', seen);
  check(tag + ' region → region: zero map geometry change, workbench never closed/reopened', rr.sizes.length === 0 && rr.flips === 0 && same(r2, r1), { rr, r1, r2 });
  check(tag + ' selected region outline follows the selection', await page.evaluate(() => map.selected === 'salt' && document.querySelector('#mapwrap .sel-o').getAttribute('d').length > 10));
  geo.regionToRegion = { sizes:rr.sizes.length, flips:rr.flips };

  /* Region content + 13. A/B/C preserving the selection */
  await clickRegion(page, 'marsh'); await wait(t);
  await page.evaluate(() => BM.clock.setPaused(true));
  const VAR = {};
  for (const v of ['a', 'b', 'c']) {
    await page.click('.vswitch [data-variant="' + v + '"]'); await wait(t);
    const ok = await page.evaluate(() => C9.mode === 'region' && C9.sel === 'marsh' && map.selected === 'marsh') && (await text(page, '#wbT')) === 'Marsh Low';
    VAR[v] = ok;
    const pane = await page.evaluate(() => {
      const p = document.getElementById('p-region'), vis = el => el && !el.closest('[hidden]') && el.getClientRects().length > 0;
      const visText = p.innerText;
      return { visText, tabs:p.querySelectorAll('[role=tab]').length, spec:vis(p.querySelector('.bm-spec')), fix:p.querySelectorAll('[data-fix]').length, more:/More ▾/.test(p.textContent),
        secs:[...p.querySelectorAll('.sec > h3')].map(h => h.lastChild.textContent.trim()) };
    });
    const need = [/Strained/, /Establishing|Established|Seedlings|Dense/, /Waterlogged/, /Temp/, /Water/, /Soil/, /Hazard/, /\+\d/, /Roots/];
    const missing = need.filter(re => !re.test(pane.visText)).map(String);
    if (v === 'a') {
      check(tag + ' A tabbed: fixed summary (plant, status, limit, fixes) + Overview / Colony / Science tabs', pane.tabs === 3 && pane.spec && pane.fix === 2 && !pane.more);
      check(tag + ' A tabbed: Overview shows conditions, stand density, Biomass; summary shows focus', missing.length === 0, missing);
      await page.click('#p-region [data-tab="colony"]'); await wait(60);
      check(tag + ' A tabbed: Colony tab shows Roots / Leaves / Seeds + local specialization', await page.evaluate(() => document.querySelectorAll('#p-region [data-focus]').length === 4 && document.querySelectorAll('#p-region [data-spec]').length === 3));
      if (main) { await page.click('#p-region [data-tab="over"]'); await page.mouse.move(5, vp[1] - 5); await shot(page, 'c9-03-region-a.png'); }
    } else if (v === 'b') {
      check(tag + ' B dashboard: compact grid (4 conditions + stand / Biomass / focus / local upgrade) visible with tabs below', pane.tabs === 3 && pane.spec && pane.fix === 2 && !pane.more && await page.evaluate(() => document.querySelectorAll('#p-region .rv-dash .dc').length === 8));
      check(tag + ' B dashboard: required state visible without switching tabs', missing.length === 0, missing);
      if (main) { await page.mouse.move(5, vp[1] - 5); await shot(page, 'c9-04-region-b.png'); }
    } else {
      check(tag + ' C sections: no category tabs; Holding it back / Conditions / Colony / Plant sections', pane.tabs === 0 && pane.secs.join('|') === 'What’s holding it back|Conditions|Colony|Plant' && pane.fix === 2 && !pane.more, pane.secs);
      check(tag + ' C sections: specimen + focus + local specialization live in the scrolling workbench', await page.evaluate(() => !!document.querySelector('#c9s-plant .bm-spec') && document.querySelectorAll('#p-region [data-focus]').length === 4 && document.querySelectorAll('#p-region [data-spec]').length === 3));
      await page.click('#p-region [data-jump="colony"]'); await wait(rm ? 80 : 500);
      check(tag + ' C sections: jump buttons scroll to a section', await page.evaluate(() => document.querySelector('#p-region [data-s="scroll"]').scrollTop > 40));
      await clickRegion(page, 'mossy'); await wait(t);
      check(tag + ' C sections: region → region keeps the scroll position for comparison', await page.evaluate(() => document.querySelector('#p-region [data-s="scroll"]').scrollTop > 40) && (await text(page, '#wbT')) === 'Mossy Basin');
      await clickRegion(page, 'marsh'); await wait(t);
      await page.evaluate(() => { document.querySelector('#p-region [data-s="scroll"]').scrollTop = 0; });
      if (main) { await page.mouse.move(5, vp[1] - 5); await shot(page, 'c9-05-region-c.png'); }
    }
  }
  check(tag + ' A/B/C switch preserves the selected region (Marsh Low) in all three', VAR.a && VAR.b && VAR.c, VAR);
  await page.click('.vswitch [data-variant="a"]'); await wait(t);

  /* region fix preview: Terraform keeps plant anatomy, Adapt changes it (in the Region workbench) */
  await clickRegion(page, 'frost'); await wait(t);
  const idleR = await specParts(page, '#p-region .slot-spec');
  await page.hover('#p-region [data-fix="warm"]'); await wait(90);
  const tfR = await specParts(page, '#p-region .slot-spec');
  check(tag + ' Region: Terraform fix preview keeps plant layers identical, changes environment', tfR.plant === idleR.plant && tfR.env !== idleR.env);
  await page.hover('#p-region [data-fix="cold"]'); await wait(90);
  const adR = await specParts(page, '#p-region .slot-spec');
  check(tag + ' Region: Adapt fix preview changes plant layers', adR.plant !== idleR.plant);
  check(tag + ' Region: fix hover previews on the real map', await page.evaluate(() => document.querySelectorAll('#mapwrap .pv-open').length > 0));
  await page.mouse.move(5, vp[1] - 5); await wait(60);
  await page.evaluate(() => BM.clock.setPaused(false));

  /* colony focus inside the workbench */
  await clickRegion(page, 'mossy'); await wait(t);
  await page.click('#p-region [data-tab="colony"]');
  const fr = [];
  for (const f of ['roots', 'leaves', 'seeds']) { await page.click('#p-region [data-focus="' + f + '"]'); await wait(40); fr.push(await page.evaluate(f => BM.store.s.reg.mossy.focus === f && document.querySelector('#p-region [data-focus="' + f + '"]').getAttribute('aria-pressed') === 'true', f)); }
  check(tag + ' colony focus Roots / Leaves / Seeds changes state from the workbench', fr.every(Boolean), fr);
  await page.click('#p-region [data-tab="over"]');

  /* 5. Regions → Region with no geometry change */
  await geoReset(page);
  await page.click('#rail [data-tool="regions"]'); await wait(t);
  check(tag + ' Regions mode: rail tool pressed, header says Regions, 10 rows with triage status', await page.evaluate(() => C9.mode === 'regions' && document.querySelector('#rail [data-tool="regions"]').getAttribute('aria-pressed') === 'true' && document.querySelectorAll('#p-regions [data-go]').length === 10 && document.querySelectorAll('#p-regions .r9row .st').length === 10 && document.querySelectorAll('#p-regions .r9row .mc').length === 40));
  check(tag + ' Regions mode shows limiting factors and Blocked / Strained / Thriving groups', /Too cold/.test(await text(page, '#p-regions')) && (await page.$$eval('#p-regions .r9-g', g => g.length)) === 3);
  await page.hover('#p-regions [data-go="tide"]'); await wait(40);
  check(tag + ' Regions: hovering a row outlines it on the map', await page.evaluate(() => document.querySelector('#mapwrap .hover-o').getAttribute('d').length > 10));
  if (main) { await shot(page, 'c9-06-regions.png'); }
  await page.click('#p-regions [data-go="salt"]'); await wait(t);
  const rp = await geoLog(page);
  check(tag + ' Regions → pick switches to Region mode for that region (Salt Flats), selected on the map', await page.evaluate(() => C9.mode === 'region' && C9.sel === 'salt' && map.selected === 'salt') && (await text(page, '#wbT')) === 'Salt Flats');
  check(tag + ' Regions → Region: zero map geometry change', rp.sizes.length === 0 && rp.flips === 0 && same(await mapRect(page), r1), rp);
  await page.click('#wbAll'); await wait(t);
  check(tag + ' Region header "All regions" returns to Regions mode', await page.evaluate(() => C9.mode === 'regions'));
  await page.click('#p-regions [data-go="frost"]'); await wait(t);

  /* 6 + 10. Region → Adapt → Spread → Terraform (+ Map View → Regions): previews on the uncovered map, no second reframe */
  await geoReset(page);
  await page.evaluate(() => BM.clock.setPaused(true));
  for (const b of ['adapt', 'spread', 'terraform']) {
    await page.click('#rail [data-tool="' + b + '"]'); await wait(t);
    const host = '#p-' + b;
    check(tag + ' ' + b + ': same workbench, rail tool pressed, region context kept ("Considering for Frost Ridge")', await page.evaluate(b => C9.mode === b && C9.sel === 'frost' && map.selected === 'frost' && document.querySelector('#rail [data-tool="' + b + '"]').getAttribute('aria-pressed') === 'true', b) && /Considering for Frost Ridge/.test(await text(page, '#ctx9')) && /Global upgrade/.test(await text(page, '#ctx9')));
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
      check(tag + ' Adapt: card tagged as helping the selected region; verdict names it', /helps Frost Ridge/.test(await text(page, host + ' [data-id="cold"]')) && /Would open Frost Ridge/.test(await text(page, '#ctx9 .verdict')));
      if (main) await shot(page, 'c9-07-adapt-preview.png');
    }
    if (b === 'spread') check(tag + ' Spread preview draws seed paths on the real map', mp.arcs > 0, mp);
    if (b === 'terraform') {
      check(tag + ' Terraform preview: plant layers identical (anatomy unchanged), environment changed', pv.plant === idle.plant && pv.env !== idle.env);
      check(tag + ' Terraform preview: "plant unchanged" tag + planet tint on the real map', (await isVisible(page, host + ' .unch')) && mp.tint > 0, mp);
      if (main) await shot(page, 'c9-08-terraform-preview.png');
    }
    await page.mouse.move(5, vp[1] - 5); await wait(40);
    check(tag + ' ' + b + ': no horizontal scroll', await noHScroll(page));
  }
  await page.click('#rail [data-tool="mapview"]'); await wait(t);
  await page.click('#rail [data-tool="regions"]'); await wait(t);
  const sw = await geoLog(page);
  check(tag + ' Region → Adapt → Spread → Terraform → Map View → Regions: zero further map geometry change', sw.sizes.length === 0 && sw.flips === 0 && same(await mapRect(page), r1), sw);
  geo.modeSwitches = { sizes:sw.sizes.length, flips:sw.flips };
  await page.evaluate(() => BM.clock.setPaused(false));

  /* fake purchase from the workbench */
  await page.click('#p-regions [data-go="frost"]'); await wait(t);
  await page.click('#rail [data-tool="adapt"]'); await wait(t);
  await page.click('#p-adapt [data-id="cold"]'); await wait(120);
  check(tag + ' buying Cold Tolerance works (fake), opens Frost Ridge, clears the card tag', await page.evaluate(() => BM.store.s.owned.cold === true && BM.store.s.reg.frost.colony === 'living' && document.querySelector('#p-adapt [data-id="cold"] .ctx-tag').hidden));
  await page.mouse.move(5, vp[1] - 5);

  /* 7–9. Map View: hover / focus previews, leaving restores, click commits */
  await geoReset(page);
  await page.click('#rail [data-tool="mapview"]'); await wait(t);
  check(tag + ' Map View mode: five choices, Plants is committed by default', await page.evaluate(() => C9.mode === 'mapview' && document.querySelectorAll('#p-mapview [data-view]').length === 5 && C9.committed === '' && map.lens === null && document.querySelector('#p-mapview [data-view=""]').getAttribute('aria-pressed') === 'true'));
  await page.hover('#p-mapview [data-view="water"]'); await wait(60);
  check(tag + ' Map View hover previews the Water overlay on the map (uncommitted)', await page.evaluate(() => map.lens === 'water' && C9.preview === 'water' && C9.committed === '') && (await isVisible(page, '#mvLegend')) && /PREVIEW/.test(await text(page, '#mvLegend')));
  if (main) await shot(page, 'c9-09-mapview-preview.png');
  await page.hover('#wb .wb9-h'); await wait(60);
  check(tag + ' leaving an uncommitted Map View option restores the committed view', await page.evaluate(() => map.lens === null && C9.preview === null) && !(await isVisible(page, '#mvLegend')));
  await page.focus('#p-mapview [data-view="temp"]'); await wait(40);
  check(tag + ' keyboard focus on a Map View option previews it', await page.evaluate(() => map.lens === 'temp' && C9.committed === ''));
  await page.keyboard.press('ArrowDown'); await wait(40);
  check(tag + ' arrow keys move the preview (Temperature → Water)', await page.evaluate(() => map.lens === 'water' && document.activeElement.dataset.view === 'water'));
  await page.focus('#wbX'); await wait(40);
  check(tag + ' moving focus away restores the committed view', await page.evaluate(() => map.lens === null));
  await page.click('#p-mapview [data-view="soil"]'); await wait(60);
  check(tag + ' clicking commits a Map View (Soil); it is visibly active in the chooser, legend and rail', await page.evaluate(() => C9.committed === 'soil' && map.lens === 'soil' && document.querySelector('#p-mapview [data-view="soil"]').getAttribute('aria-pressed') === 'true' && /Soil/.test(document.querySelector('#rail [data-tool="mapview"]').textContent) && !document.querySelector('#rail [data-tool="mapview"] .vdot').hidden) && /Soil/.test(await text(page, '#mvLegend')));
  await page.hover('#p-mapview [data-view="hazard"]'); await wait(60);
  const hz = await page.evaluate(() => map.lens);
  await page.hover('#wb .wb9-h'); await wait(60);
  check(tag + ' with Soil committed: hover Hazard previews, leaving returns to Soil', hz === 'hazard' && await page.evaluate(() => map.lens === 'soil'), hz);
  await page.click('#rail [data-tool="adapt"]'); await wait(t);
  check(tag + ' committed Map View persists while another mode is open', await page.evaluate(() => map.lens === 'soil' && C9.mode === 'adapt') && await isVisible(page, '#mvLegend'));
  await page.click('#mvLegend .clr'); await wait(60);
  check(tag + ' returning to Plants removes the heatmap', await page.evaluate(() => map.lens === null && C9.committed === '') && !(await isVisible(page, '#mvLegend')));
  const mvg = await geoLog(page);
  check(tag + ' Map View preview / commit: zero map geometry change', mvg.sizes.length === 0 && mvg.flips === 0, mvg);

  /* closing restores the original geometry */
  await page.click('#wbX'); await wait(T);
  const r3 = await mapRect(page); geo.closedAgain = r3;
  check(tag + ' closing the workbench restores the map exactly and clears the selection', same(r3, r0) && !(await isVisible(page, '#wb')) && await page.evaluate(() => C9.mode === null && map.selected === null), { r0, r3 });

  /* keyboard: region select, Esc + focus return, rail tool */
  await page.focus('#mapwrap .rg[data-r="sunny"]'); await page.keyboard.press('Enter'); await wait(T);
  check(tag + ' keyboard: Enter on a region opens Region mode and keeps focus on the map for quick comparison', await page.evaluate(() => C9.mode === 'region' && C9.sel === 'sunny' && document.activeElement.dataset.r === 'sunny') && /Sunny Shelf/.test(await text(page, '#c9live')));
  await page.keyboard.press('Tab'); await page.keyboard.press('Enter'); await wait(t);
  check(tag + ' keyboard: Tab + Enter on the next region updates the workbench in place', await page.evaluate(() => C9.mode === 'region' && C9.sel !== 'sunny' && document.activeElement.dataset.r === C9.sel));
  const kbSel = await page.evaluate(() => C9.sel);
  await page.keyboard.press('Escape'); await wait(T);
  check(tag + ' keyboard: Esc closes the workbench, focus returns to the region, map restored', await page.evaluate(id => C9.mode === null && document.activeElement.dataset.r === id, kbSel) && same(await mapRect(page), r0));
  await page.focus('#rail [data-tool="terraform"]'); await page.keyboard.press('Enter'); await wait(T);
  check(tag + ' keyboard: rail tool opens its mode and moves focus into the workbench', await page.evaluate(() => C9.mode === 'terraform' && document.getElementById('wb').contains(document.activeElement)));
  await page.keyboard.press('Escape'); await wait(T);
  check(tag + ' keyboard: Esc returns focus to the rail tool', await page.evaluate(() => document.activeElement === document.querySelector('#rail [data-tool="terraform"]')));
  await page.focus('#rail [data-tool="adapt"]'); await page.keyboard.press('Enter'); await wait(T);
  await page.keyboard.press('Enter');   // focus is on the heading: Enter does nothing harmful
  await page.focus('#rail [data-tool="adapt"]'); await page.keyboard.press('Enter'); await wait(T);
  check(tag + ' keyboard: pressing the active rail tool again closes the workbench', await page.evaluate(() => C9.mode === null));

  /* hidden controls not tabbable */
  const walk = await tabWalk(page, 40);
  check(tag + ' Tab walk (closed): every stop visible, focus ring present, nothing hidden (' + walk.count + ' stops)', walk.bad.length === 0 && walk.count > 10, walk.bad.slice(0, 4));
  check(tag + ' closed workbench contents are not tabbable', await page.evaluate(() => document.getElementById('wb').hidden));
  await clickRegion(page, 'salt'); await wait(T);
  const walk2 = await tabWalk(page, 60);
  check(tag + ' Tab walk (Region open): no hidden stops (inactive panes / tabs excluded)', walk2.bad.length === 0, walk2.bad.slice(0, 4));
  if (main || (vp[0] === 1024 && !rm && !engine)) {
    await page.click('.vswitch [data-variant="a"]'); await clickRegion(page, 'marsh'); await wait(t);
    if (vp[0] === 1024) { await page.mouse.move(5, vp[1] - 5); await shot(page, 'c9-10-1024-workbench.png'); await page.click('#rail [data-tool="adapt"]'); await wait(t); await page.hover('#p-adapt [data-id="flood"]'); await wait(120); await shot(page, 'c9-11-1024-adapt.png'); }
  }
  if (vp[0] === 1440 && !rm && !engine) { await page.click('.vswitch [data-variant="b"]'); await clickRegion(page, 'fern'); await wait(t); await page.mouse.move(5, vp[1] - 5); await shot(page, 'c9-12-1440-region-b.png'); }
  check(tag + ' no horizontal scroll (end)', await noHScroll(page));
  check(tag + ' no console errors', page._errs.length === 0, page._errs.slice(0, 3));
  results.errors.push(...page._errs.map(e => tag + ': ' + e));
  await ctx.close();
}

async function runGallery(browser){
  const { ctx, page } = await newPage(browser, [1280, 800]);
  await page.goto(url('index.html')); await wait(300);
  check('gallery defaults to Convergence (BLOOM-019)', !(await page.$eval('#panel-convergence', e => e.hidden)) && await page.$eval('#panel-round2', e => e.hidden) && await page.$eval('#panel-round1', e => e.hidden));
  check('gallery: Convergence launches Concept 9', await page.evaluate(() => !!document.querySelector('#panel-convergence a[href="concept-9-unified-bench.html"]')));
  check('gallery: Round 2 still launches Concepts 5–8, Round 1 still launches 1–4', await page.evaluate(() => ['5-popover','6-sidecar','7-bottom-bench','8-side-bench'].every(f => document.querySelector('#panel-round2 a[href="concept-' + f + '.html"]')) && ['1-hybrid','2-drawers','3-specimen','4-shelf'].every(f => document.querySelector('#panel-round1 a[href="concept-' + f + '.html"]'))));
  await shot(page, '00-gallery-convergence.png');
  const w = await tabWalk(page, 40);
  check('gallery: hidden Round 1 / Round 2 links not tabbable', w.bad.length === 0 && !(await page.evaluate(() => !!document.activeElement.closest('#panel-round1, #panel-round2'))), w.bad.slice(0, 3));
  await page.focus('#tab-convergence'); await page.keyboard.press('ArrowRight'); await wait(60);
  check('gallery tabs: arrow keys move Convergence → Round 2', !(await page.$eval('#panel-round2', e => e.hidden)) && await page.evaluate(() => document.activeElement.id === 'tab-round2'));
  await page.keyboard.press('ArrowRight'); await wait(60);
  check('gallery tabs: → Round 1', !(await page.$eval('#panel-round1', e => e.hidden)));
  await page.keyboard.press('ArrowRight'); await wait(60);
  check('gallery tabs: wrap back to Convergence', !(await page.$eval('#panel-convergence', e => e.hidden)));
  /* every concept 1–9 reachable from the gallery and back */
  const reach = [];
  for (const [tab, files] of [['round1', ['1-hybrid','2-drawers','3-specimen','4-shelf']], ['round2', ['5-popover','6-sidecar','7-bottom-bench','8-side-bench']], ['convergence', ['9-unified-bench']]]) {
    for (const f of files) {
      await page.goto(url('index.html#' + tab)); await wait(150);
      await page.click('#panel-' + tab + ' a[href="concept-' + f + '.html"]'); await page.waitForLoadState(); await wait(250);
      const ok = (await page.evaluate(() => location.pathname.split('/').pop())) === 'concept-' + f + '.html';
      await page.click('.mock-ribbon a'); await page.waitForLoadState(); await wait(150);
      const backOk = !(await page.$eval('#panel-' + tab, e => e.hidden));
      reach.push([f, ok, backOk]);
    }
  }
  check('gallery: Concepts 1–9 all reachable, and each back link returns to its own tab', reach.every(r => r[1] && r[2]), reach.filter(r => !r[1] || !r[2]));
  const ctx2 = await browser.newContext({ viewport:{ width:1280, height:800 } });
  const p2 = await ctx2.newPage();
  await p2.goto(url('index.html')); await p2.evaluate(() => localStorage.setItem('bloomMockRound', 'round2')); await p2.reload(); await wait(200);
  check('gallery: an old BLOOM-018 "Round 2" memory does not hide the new Convergence default', !(await p2.$eval('#panel-convergence', e => e.hidden)));
  await ctx2.close();
  for (const vp of VIEWPORTS) { await page.setViewportSize({ width:vp[0], height:vp[1] }); check('gallery no horizontal scroll @' + vp.join('x'), await noHScroll(page)); }
  check('gallery: no console errors', page._errs.length === 0, page._errs.slice(0, 3));
  await ctx.close();
}

/* Concepts 1–8 regression smoke: r2.js received one additive hook (BM2.board opts.onPreview) */
async function runOlder(browser){
  const OLD = [['concept-1-hybrid.html', '[data-board="adapt"]'], ['concept-2-drawers.html', '.rail [data-sheet="adapt"]'], ['concept-3-specimen.html', '[data-pp="adapt"]'], ['concept-4-shelf.html', '.pill [data-b="adapt"]'],
    ['concept-5-popover.html', '.launch [data-b="adapt"]'], ['concept-6-sidecar.html', '.launch [data-b="adapt"]'], ['concept-7-bottom-bench.html', '.launch [data-b="adapt"]'], ['concept-8-side-bench.html', '.launch [data-b="adapt"]']];
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
    check('regression ' + f + ': loads, selects a region, opens Adapt and previews a card, no errors', sel === 'frost' && (!/concept-[5-8]/.test(f) || pv > 0) && page._errs.length === 0, { sel, pv, errs:page._errs.slice(0, 2) });
    await ctx.close();
  }
}

(async () => {
  const browser = await chromium.launch();
  console.log('gallery…'); await runGallery(browser);
  console.log('concepts 1–8 regression…'); await runOlder(browser);
  for (const vp of VIEWPORTS) { console.log('concept 9', vp.join('x')); await runC9(browser, vp, false); }
  console.log('concept 9 reduced motion'); await runC9(browser, [1280, 800], true);
  await browser.close();
  if (process.argv.includes('--firefox')) {
    const fb = await firefox.launch();
    for (const vp of [[1280, 800], [1024, 768]]) { console.log('concept 9 firefox', vp.join('x')); await runC9(fb, vp, false, 'firefox'); }
    await fb.close();
  }
  check('no external network requests', results.external.length === 0, results.external.slice(0, 5));
  results.summary = { total:results.checks.length, failed:fails };
  fs.writeFileSync(path.join(OUT, 'qa-results.json'), JSON.stringify(results, null, 1));
  console.log((fails ? 'FAIL' : 'PASS') + ' — ' + (results.checks.length - fails) + '/' + results.checks.length + ' checks');
  for (const k of Object.keys(results.geometry)) console.log(k, JSON.stringify(results.geometry[k]));
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
