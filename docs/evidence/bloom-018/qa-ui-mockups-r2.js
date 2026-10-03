#!/usr/bin/env node
/*
  BLOOM-018 QA driver for the UI concept sandbox (demos/ui-mockups/). VISUAL MOCKUPS ONLY. This checks the sandbox pages,
  not the game. Needs Playwright (Chromium; Firefox / WebKit optional):
    NODE_PATH="$(npm root -g)" node docs/evidence/bloom-018/qa-ui-mockups-r2.js [--shots] [--firefox] [--webkit]
  Writes docs/evidence/bloom-018/qa-results.json (+ screenshots with --shots). Exit code 1 on any failed check.

  Covers: gallery Round 1 / Round 2 switching; Concepts 5–8 at 1280×800, 1024×768, 1440×900 (+ reduced motion);
  Concepts 1–4 smoke; map geometry per surface (A overlay / B intentional push); Pause + speed; region tabs; colony focus;
  Regions browser pick; lens switching; Adapt / Spread / Terraform previews on the real map; specimen rule (Adapt changes the
  plant layers, Terraform changes only the environment layer); keyboard + Esc + focus return; hidden controls not tabbable;
  no horizontal scroll; no external requests; no console errors.
*/
'use strict';
const path = require('path'), fs = require('fs');
const { chromium, firefox, webkit } = require('playwright');
const ROOT = path.resolve(__dirname, '../../..');
const DIR = path.join(ROOT, 'demos/ui-mockups');
const OUT = __dirname;
const SHOTS = process.argv.includes('--shots');
const url = f => 'file://' + path.join(DIR, f);

const CONCEPTS = {
  5:{ file:'concept-5-popover.html', regions:{ open:'#rbBtn', host:'#rbHost', geo:'B' }, lensItem:id => `.lens-menu [data-lens="${id}"]`, board:{ launch:b => `.launch [data-b="${b}"]`, host:b => `#pal-${b}`, surface:'#palette', geo:'A' } },
  6:{ file:'concept-6-sidecar.html', regions:{ open:'#rbBtn', host:'#rbHost', geo:'B' }, lensItem:id => `.lens-menu [data-lens="${id}"]`, board:{ launch:b => `.launch [data-b="${b}"]`, host:b => `#st-${b}`, surface:'#stack', geo:'A' } },
  7:{ file:'concept-7-bottom-bench.html', regions:{ open:'.launch [data-b="regions"]', host:'#b-regions', geo:'A' }, lensItem:id => `#lensStrip [data-lens="${id}"]`, board:{ launch:b => `.launch [data-b="${b}"]`, host:b => `#b-${b}`, surface:'#bench', geo:'A' } },
  8:{ file:'concept-8-side-bench.html', regions:{ open:'#rbBtn', host:'#w-regions', geo:'B' }, lensItem:id => `.lens-menu [data-lens="${id}"]`, board:{ launch:b => `.launch [data-b="${b}"]`, host:b => `#w-${b}`, surface:'#wb', geo:'B' } },
};
const BM_NAMES = { marsh:'Marsh Low', fern:'Fern Hollow', cloud:'Cloud Steps', mossy:'Mossy Basin', sunny:'Sunny Shelf' };
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
async function clickRegion(page, id){
  const pt = await page.evaluate(id => {
    const c = map.screenPoint(id);
    const rects = [...document.querySelectorAll('#mapwrap .rg[data-r="' + id + '"] rect')].map(r => r.getBoundingClientRect()).map(b => ({ x:b.x + b.width / 2, y:b.y + b.height / 2 }));
    rects.sort((a, b) => Math.hypot(a.x - c.x, a.y - c.y) - Math.hypot(b.x - c.x, b.y - c.y));
    for (const p of rects) { const el = document.elementFromPoint(p.x, p.y); const g = el && el.closest && el.closest('.rg'); if (g && g.dataset.r === id && g.closest('#mapwrap')) return p; }
    return null;
  }, id);
  if (!pt) throw new Error('region not clickable: ' + id);
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
      return { tag:a.tagName, id:a.id || a.dataset.r || a.dataset.b || a.dataset.lens || (a.textContent || '').trim().slice(0, 24), w:r.width, h:r.height, hiddenAnc, op:Math.round(op * 100) / 100, ring };
    });
    if (!d) continue; seen.push(d);
    if (d.hiddenAnc || d.w < 1 || d.h < 1 || d.op < .5 || d.ring === 'none') bad.push(d);
  }
  return { bad, count:seen.length };
}
async function shot(page, name){
  if (!SHOTS) return;
  await page.evaluate(() => document.querySelectorAll('.toast').forEach(t => t.remove()));
  await wait(520);   // let the specimen cross-fade and button transitions settle
  await page.screenshot({ path:path.join(OUT, name) });
}

async function runConcept(browser, n, vp, rm, engine){
  const C = CONCEPTS[n], tag = 'c' + n + '@' + vp.join('x') + (rm ? '+rm' : '') + (engine ? '+' + engine : '');
  const { ctx, page } = await newPage(browser, vp, rm ? { reducedMotion:'reduce' } : {});
  await page.goto(url(C.file)); await wait(rm ? 500 : 900);
  const main = vp[0] === 1280 && !rm && !engine;
  const geo = results.geometry[tag] = {};
  const r0 = await mapRect(page);
  check(tag + ' map is large (≥60% of viewport width or ≥55% height)', r0[2] >= vp[0] * .6 || r0[3] >= (vp[1] - 40) * .55, r0);
  check(tag + ' HUD: Biomass, goal, scenario, Pause, speed visible', (await isVisible(page, '.h-bio .num')) && (await isVisible(page, '.h-cov')) && (await isVisible(page, '.h-air')) && (await isVisible(page, '.clk-play')) && (await isVisible(page, '.clk-speed')));
  check(tag + ' no horizontal scroll (idle)', await noHScroll(page));
  if (rm) check(tag + ' reduced motion detected by page', await page.evaluate(() => BM.reduceMotion === true));
  if (main) { await wait(3200); await shot(page, 'c' + n + '-1-run.png'); }

  /* Pause / speed */
  await page.click('.clk-play'); await wait(80);
  const b1 = await page.evaluate(() => BM.store.s.t); await wait(1300); const b2 = await page.evaluate(() => BM.store.s.t);
  check(tag + ' Pause stops the fake clock', b1 === b2 && await page.evaluate(() => document.body.classList.contains('is-paused') && !document.querySelector('.paused-flag').hidden), [b1, b2]);
  check(tag + ' Pause button reads Play while paused', (await page.textContent('.clk-play')).includes('Play'));
  if (main) await shot(page, 'c' + n + '-5-paused.png');
  await page.click('.clk-play');
  const sp = [];
  for (let k = 0; k < 3; k++) { await page.click('.clk-speed'); sp.push((await page.textContent('.clk-speed .cs')).trim()); }
  check(tag + ' speed cycles 2× → 4× → 1×', sp.join(',') === '2×,4×,1×', sp);
  await page.click('.clk-speed'); await page.click('.clk-speed');
  const t1 = await page.evaluate(() => BM.store.s.t); await wait(1100); const t2 = await page.evaluate(() => BM.store.s.t);
  check(tag + ' 4× runs the fake clock faster', t2 - t1 >= 3, t2 - t1);
  await page.click('.clk-speed');
  check(tag + ' back to 1×', (await page.textContent('.clk-speed .cs')).trim() === '1×');

  /* region inspection: several regions, tabs, colony focus */
  await clickRegion(page, 'frost'); await wait(rm ? 60 : 380);
  check(tag + ' region popup opens (Frost Ridge)', (await isVisible(page, '#rp')) && (await page.textContent('#rp h2')) === 'Frost Ridge');
  geo.regionPopup = same(await mapRect(page), r0) ? 'A' : 'CHANGED';
  check(tag + ' region popup leaves map geometry unchanged', geo.regionPopup === 'A');
  check(tag + ' popup shows information immediately (conditions + limiting factor + fixes)', await page.evaluate(() => document.querySelectorAll('#rp .ctile2').length === 4 && /Too cold/.test(document.querySelector('#rp .rp-limit').textContent) && document.querySelectorAll('#rp [data-fix]').length === 2));
  check(tag + ' popup has a contextual specimen', await isVisible(page, '#rp .rp-spec .bm-spec'));
  check(tag + ' no "More" expander in popup', await page.evaluate(() => !/More ▾/.test(document.querySelector('#rp').textContent)));
  await page.evaluate(() => BM.clock.setPaused(true));   // freeze fake growth so only the preview can change the drawing
  const idleF = await specParts(page, '#rp .rp-spec');
  await page.hover('#rp [data-fix="warm"]'); await wait(80);
  const tfF = await specParts(page, '#rp .rp-spec');
  check(tag + ' popup: Terraform fix preview keeps plant layers identical, changes environment', tfF.plant === idleF.plant && tfF.env !== idleF.env);
  await page.hover('#rp [data-fix="cold"]'); await wait(80);
  const adF = await specParts(page, '#rp .rp-spec');
  check(tag + ' popup: Adapt fix preview changes plant layers', adF.plant !== idleF.plant);
  check(tag + ' fix hover previews on the real map', await page.evaluate(() => document.querySelectorAll('#mapwrap .pv-open').length > 0));
  await page.evaluate(() => BM.clock.setPaused(false));
  await page.mouse.move(5, vp[1] - 5);
  if (main) await shot(page, 'c' + n + '-2-region.png');
  const tabs = await page.$$eval('#rp [role=tab]', ts => ts.map(t => t.dataset.tab));
  let tabsOk = true;
  for (const t of tabs) { await page.click('#rp [data-tab="' + t + '"]'); if ((await page.getAttribute('#rp [data-tab="' + t + '"]', 'aria-selected')) !== 'true') tabsOk = false; }
  check(tag + ' all popup tabs switch (' + tabs.join('/') + ')', tabsOk && tabs.length >= 3);
  let second = null;   // a visible second region (the sidecar may legitimately cover some)
  for (const id of ['marsh', 'fern', 'cloud', 'mossy', 'sunny']) { try { await clickRegion(page, id); second = id; break; } catch (e) {} }
  await wait(rm ? 60 : 300);
  check(tag + ' second region replaces popup content (' + second + ')', second && (await page.textContent('#rp h2')) === BM_NAMES[second]);
  check(tag + ' still no geometry change after region-to-region', same(await mapRect(page), r0));
  await page.keyboard.press('Escape'); await wait(rm ? 60 : 380);
  await clickRegion(page, 'mossy'); await wait(rm ? 60 : 300);
  await page.click('#rp [data-tab="colony"]');
  const fr = [];
  for (const f of ['roots', 'leaves', 'seeds']) { await page.click('#rp [data-focus="' + f + '"]'); await wait(40); fr.push(await page.evaluate(f => BM.store.s.reg.mossy.focus === f && document.querySelector('#rp [data-focus="' + f + '"]').getAttribute('aria-pressed') === 'true', f)); }
  check(tag + ' colony focus Roots / Leaves / Seeds changes state', fr.every(Boolean), fr);
  await page.hover('#rp [data-focus="roots"]'); await wait(60);
  if (main) await shot(page, 'c' + n + '-3-colony.png');
  await page.mouse.move(5, vp[1] - 5);
  await page.keyboard.press('Escape'); await wait(rm ? 60 : 400);
  check(tag + ' Esc closes the region popup', !(await isVisible(page, '#rp')));

  /* keyboard region select + focus return */
  await page.focus('#mapwrap .rg[data-r="sunny"]'); await page.keyboard.press('Enter'); await wait(150);
  check(tag + ' keyboard: Enter on a region opens popup and focuses its active tab', (await isVisible(page, '#rp')) && await page.evaluate(() => document.activeElement.getAttribute('role') === 'tab'));
  const tabOrder = await page.$$eval('#rp [role=tab]', ts => ts.map(t => t.dataset.tab));
  const before = await page.evaluate(() => document.activeElement.dataset.tab);   // the popup remembers the last tab used
  await page.keyboard.press('ArrowRight'); await wait(40);
  const expectTab = tabOrder[(tabOrder.indexOf(before) + 1) % tabOrder.length];
  check(tag + ' keyboard: arrow keys move between popup tabs', await page.evaluate(t => document.activeElement.getAttribute('role') === 'tab' && document.activeElement.dataset.tab === t && document.activeElement.getAttribute('aria-selected') === 'true', expectTab), { before, expectTab });
  await page.keyboard.press('Escape'); await wait(rm ? 60 : 380);
  check(tag + ' keyboard: Esc returns focus to the region', await page.evaluate(() => document.activeElement && document.activeElement.dataset && document.activeElement.dataset.r === 'sunny'));

  /* lens */
  await page.click('.lens-btn'); await wait(120);
  geo.lensControl = same(await mapRect(page), r0) ? 'A' : 'CHANGED';
  await page.click(C.lensItem('temp')); await wait(80);
  check(tag + ' lens → Temperature', await page.evaluate(() => map.lens === 'temp') && await isVisible(page, '#legend'));
  if (n === 7) { await page.click(C.lensItem('water')); } else { await page.click('.lens-btn'); await wait(80); await page.click(C.lensItem('water')); }
  await wait(80);
  check(tag + ' lens → Water (switch)', await page.evaluate(() => map.lens === 'water'));
  check(tag + ' lens leaves map geometry unchanged', geo.lensControl === 'A' && same(await mapRect(page), r0));
  check(tag + ' four lens options + off, behind one control', await page.evaluate(() => document.querySelectorAll('.lens-wrap [data-lens], #lensStrip [data-lens]').length === 5 && document.querySelectorAll('.lens-btn').length === 1));
  if (main) await shot(page, 'c' + n + '-6-lens.png');
  await page.click('#legend .clr'); await wait(80);
  check(tag + ' lens off via legend ✕', await page.evaluate(() => map.lens === null || map.lens === ''));
  if (n === 7 && await page.$eval('#lensStrip .lens-seg', e => !e.hidden)) { await page.keyboard.press('Escape'); await wait(60); }

  /* Regions browser */
  await page.click(C.regions.open); await wait(rm ? 80 : 520);
  const rr = await mapRect(page);
  geo.regionsBrowser = same(rr, r0) ? 'A' : 'B';
  check(tag + ' Regions browser geometry is as designed (' + C.regions.geo + ')', geo.regionsBrowser === C.regions.geo, { r0, rr });
  check(tag + ' Regions browser lists all 10 regions with status', await page.evaluate(sel => document.querySelectorAll(sel + ' [data-go]').length === 10 && (document.querySelectorAll(sel + ' .st, ' + sel + ' .mc').length >= 10 || document.querySelectorAll(sel + ' .rb-col h3 .st').length === 3), C.regions.host));
  check(tag + ' map still large with Regions open (≥ 50% of viewport width)', rr[2] >= vp[0] * .5 || rr[3] >= (vp[1] - 40) * .55, rr);
  check(tag + ' no horizontal scroll (Regions open)', await noHScroll(page));
  if (main) await shot(page, 'c' + n + '-7-regions.png');
  await page.click(C.regions.host + ' [data-go="dust"]'); await wait(rm ? 80 : 450);
  check(tag + ' picking a region in the browser opens its popup', (await isVisible(page, '#rp')) && (await page.textContent('#rp h2')) === 'Dust Reach');
  const rr2 = await mapRect(page);
  check(tag + ' picking from the browser does not move the map again', same(rr2, rr) || (n === 7 && same(rr2, r0)), { rr, rr2 });
  if (main) await shot(page, 'c' + n + '-8-regions-pick.png');
  for (let k = 0; k < 3; k++) { await page.keyboard.press('Escape'); await wait(rm ? 60 : 200); }
  await wait(rm ? 60 : 500);
  check(tag + ' closing everything returns the map exactly', same(await mapRect(page), r0));

  /* Adapt / Spread / Terraform */
  let bought = false;
  for (const b of ['adapt', 'spread', 'terraform']) {
    const launcher = C.board.launch(b);
    await page.click(launcher); await wait(rm ? 80 : 520);
    const br = await mapRect(page);
    geo[b] = same(br, r0) ? 'A' : 'B';
    check(tag + ' ' + b + ' surface geometry is as designed (' + C.board.geo + ')', geo[b] === C.board.geo, { r0, br });
    check(tag + ' ' + b + ' surface is not a full-screen takeover (map stays visible)', await page.evaluate(sel => { const s = document.querySelector(sel).getBoundingClientRect(), m = document.querySelector('#mapwrap svg').getBoundingClientRect(); const vis = Math.max(0, m.width * m.height - Math.max(0, Math.min(s.right, m.right) - Math.max(s.left, m.left)) * Math.max(0, Math.min(s.bottom, m.bottom) - Math.max(s.top, m.top))); return vis / (m.width * m.height) > .4; }, C.board.surface));
    const host = C.board.host(b);
    await page.evaluate(() => BM.clock.setPaused(true));
    const idle = await specParts(page, host + ' .ab-specbox');
    const card = b === 'adapt' ? 'drought' : b === 'spread' ? 'waterSeeds' : 'humid';
    await page.hover(host + ' [data-id="' + card + '"]'); await wait(120);
    const pv = await specParts(page, host + ' .ab-specbox');
    const mp = await page.evaluate(() => ({ open:document.querySelectorAll('#mapwrap .pv-open').length, worse:document.querySelectorAll('#mapwrap .pv-worse').length, arcs:document.querySelectorAll('#mapwrap .seedarc').length, tint:+document.querySelector('#mapwrap .tint').getAttribute('opacity') }));
    if (b === 'adapt') { check(tag + ' Adapt preview changes the plant', pv.plant !== idle.plant); check(tag + ' Adapt preview draws + / − on the real map', mp.open > 0 && mp.worse > 0, mp); }
    if (b === 'spread') { check(tag + ' Spread preview draws seed paths on the real map', mp.arcs > 0 && mp.open > 0, mp); }
    if (b === 'terraform') {
      check(tag + ' Terraform preview: plant layers identical, environment changed', pv.plant === idle.plant && pv.env !== idle.env);
      check(tag + ' Terraform preview: "plant unchanged" tag + planet tint on the real map', (await isVisible(page, host + ' .unch')) && mp.tint > 0, mp);
    }
    await page.evaluate(() => BM.clock.setPaused(false));
    check(tag + ' ' + b + ': no horizontal scroll', await noHScroll(page));
    if (main && b !== 'spread') await shot(page, 'c' + n + '-4-' + b + '.png');
    if (b === 'adapt' && !bought) {
      await page.click(host + ' [data-id="cold"]'); await wait(100);
      bought = await page.evaluate(() => BM.store.s.owned.cold === true && BM.store.s.reg.frost.colony === 'living');
      check(tag + ' buying Cold Tolerance works (fake) and opens Frost Ridge', bought);
    }
    if (b === 'adapt') {
      await page.mouse.move(5, vp[1] - 5); await wait(60);
      let ctxId = null;
      for (const id of ['cloud', 'dust', 'ember', 'salt', 'tide']) { try { await clickRegion(page, id); ctxId = id; break; } catch (e) {} }
      await wait(120);
      const ctxName = ctxId && await page.evaluate(id => BM.region(id).name, ctxId);
      check(tag + ' clicking the map while Adapt is open sets the specimen context (' + ctxId + ')', ctxName && (await page.textContent(C.board.surface)).includes(ctxName) && !(await isVisible(page, '#rp')));
    }
    await page.mouse.move(5, vp[1] - 5);
    await page.keyboard.press('Escape'); await wait(rm ? 60 : 450);
    check(tag + ' Esc closes ' + b + ' and focus returns to its launcher', !(await isVisible(page, C.board.surface)) && await page.evaluate(sel => document.activeElement === document.querySelector(sel), launcher));
    check(tag + ' ' + b + ' closed: map back to original geometry', same(await mapRect(page), r0));
  }
  if (n === 7) {
    await page.click(C.board.launch('adapt')); await wait(rm ? 80 : 450);
    await page.click('#peek'); await wait(260);
    check(tag + ' Peek makes the workbench see-through', await page.evaluate(() => document.getElementById('bench').classList.contains('peeking') && +getComputedStyle(document.querySelector('#bench .bench-b')).opacity < .3));
    if (main) await shot(page, 'c7-9-peek.png');
    await page.click('#peek'); await page.keyboard.press('Escape'); await wait(rm ? 60 : 450);
  }

  /* keyboard: launcher via keyboard, Esc, and hidden controls never tabbable */
  await page.focus(C.board.launch('terraform')); await page.keyboard.press('Enter'); await wait(rm ? 80 : 450);
  check(tag + ' keyboard: launcher opens surface and moves focus into it', await page.evaluate(sel => document.querySelector(sel).contains(document.activeElement), C.board.surface));
  await page.keyboard.press('Escape'); await wait(rm ? 60 : 450);
  const walk = await tabWalk(page, 40);
  check(tag + ' Tab walk: every stop visible, focus ring present, none hidden (' + walk.count + ' stops)', walk.bad.length === 0 && walk.count > 10, walk.bad.slice(0, 4));
  await clickRegion(page, 'salt'); await wait(rm ? 60 : 350);
  const walk2 = await tabWalk(page, 50);
  check(tag + ' Tab walk with popup open: no hidden stops', walk2.bad.length === 0, walk2.bad.slice(0, 4));
  check(tag + ' no console errors', page._errs.length === 0, page._errs.slice(0, 3));
  results.errors.push(...page._errs.map(e => tag + ': ' + e));
  await ctx.close();
}

async function runGallery(browser){
  const { ctx, page } = await newPage(browser, [1280, 800]);
  await page.goto(url('index.html')); await wait(300);
  check('gallery defaults to Round 2', !(await page.$eval('#panel-round2', e => e.hidden)) && await page.$eval('#panel-round1', e => e.hidden));
  check('gallery Round 2 launches concepts 5–8', await page.evaluate(() => ['5-popover','6-sidecar','7-bottom-bench','8-side-bench'].every(f => document.querySelector('#panel-round2 a[href="concept-' + f + '.html"]'))));
  await shot(page, '00-gallery-round2.png');
  const w = await tabWalk(page, 30);
  check('gallery: hidden Round 1 links not tabbable', w.bad.length === 0 && !(await page.evaluate(() => !!document.activeElement.closest('#panel-round1'))), w.bad.slice(0, 3));
  await page.click('#tab-round1'); await wait(100);
  check('gallery switches to Round 1', !(await page.$eval('#panel-round1', e => e.hidden)) && await page.$eval("#panel-round2", e => e.hidden));
  check('gallery Round 1 still launches concepts 1–4', await page.evaluate(() => ['1-hybrid','2-drawers','3-specimen','4-shelf'].every(f => document.querySelector('#panel-round1 a[href="concept-' + f + '.html"]'))));
  await shot(page, '00-gallery-round1.png');
  await page.focus('#tab-round1'); await page.keyboard.press('ArrowLeft'); await wait(60);
  check('gallery tabs: arrow keys switch rounds', !(await page.$eval('#panel-round2', e => e.hidden)) && await page.evaluate(() => document.activeElement.id === 'tab-round2'));
  await page.click('#tab-round1');
  await page.click('#panel-round1 a[href="concept-1-hybrid.html"]'); await page.waitForLoadState(); await wait(300);
  await page.click('.mock-ribbon a'); await page.waitForLoadState(); await wait(200);
  check('gallery: back from Concept 1 returns to Round 1', !(await page.$eval('#panel-round1', e => e.hidden)));
  await page.goto(url('concept-6-sidecar.html')); await wait(300);
  await page.click('.mock-ribbon a'); await page.waitForLoadState(); await wait(200);
  check('gallery: back from Concept 6 returns to Round 2', !(await page.$eval('#panel-round2', e => e.hidden)));
  for (const vp of VIEWPORTS) { await page.setViewportSize({ width:vp[0], height:vp[1] }); check('gallery no horizontal scroll @' + vp.join('x'), await noHScroll(page)); }
  check('gallery: no console errors', page._errs.length === 0, page._errs.slice(0, 3));
  await ctx.close();
}

async function runRound1(browser){
  for (const [f, open] of [['concept-1-hybrid.html', '[data-board="adapt"]'], ['concept-2-drawers.html', '.rail [data-sheet="adapt"]'], ['concept-3-specimen.html', '[data-pp="adapt"]'], ['concept-4-shelf.html', '.pill [data-b="adapt"]']]) {
    const { ctx, page } = await newPage(browser, [1280, 800]);
    await page.goto(url(f)); await wait(700);
    await clickRegion(page, 'frost'); await wait(450);
    const sel = await page.evaluate(() => map.selected);
    await page.locator(open).first().click(); await wait(500);
    await page.keyboard.press('Escape'); await wait(400);
    check('Round 1 ' + f + ' loads, selects a region, opens Adapt, no errors', sel === 'frost' && page._errs.length === 0, { sel, errs:page._errs.slice(0, 2) });
    check('Round 1 ' + f + ' clock untouched (running, 1×)', await page.evaluate(() => !BM.clock.paused && BM.clock.speed === 1));
    await ctx.close();
  }
}

(async () => {
  const browser = await chromium.launch();
  console.log('gallery…'); await runGallery(browser);
  console.log('round 1 smoke…'); await runRound1(browser);
  for (const n of [5, 6, 7, 8]) for (const vp of VIEWPORTS) { console.log('concept', n, vp.join('x')); await runConcept(browser, n, vp, false); }
  for (const n of [5, 6, 7, 8]) { console.log('concept', n, 'reduced motion'); await runConcept(browser, n, [1280, 800], true); }
  await browser.close();
  for (const [flag, engine] of [['--firefox', firefox], ['--webkit', webkit]]) {
    if (!process.argv.includes(flag)) continue;
    const eb = await engine.launch();
    for (const n of [5, 6, 7, 8]) for (const vp of [[1280, 800], [1024, 768]]) { console.log('concept', n, flag.slice(2), vp.join('x')); await runConcept(eb, n, vp, false, flag.slice(2)); }
    await eb.close();
  }
  check('no external network requests', results.external.length === 0, results.external.slice(0, 5));
  results.summary = { total:results.checks.length, failed:fails };
  fs.writeFileSync(path.join(OUT, 'qa-results.json'), JSON.stringify(results, null, 1));
  console.log((fails ? 'FAIL' : 'PASS') + ' — ' + (results.checks.length - fails) + '/' + results.checks.length + ' checks');
  console.log('geometry:', JSON.stringify(results.geometry['c5@1280x800']), JSON.stringify(results.geometry['c6@1280x800']), JSON.stringify(results.geometry['c7@1280x800']), JSON.stringify(results.geometry['c8@1280x800']));
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
