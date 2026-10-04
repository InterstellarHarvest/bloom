#!/usr/bin/env node
/*
  BLOOM-023 QA driver for the UI concept sandbox (demos/ui-mockups/): Concept 15, "Decision Rooms Convergence".
  VISUAL MOCKUP ONLY. This checks the sandbox page, not the game. Needs Playwright (Chromium; Firefox with --firefox):
    NODE_PATH="$(npm root -g)" node docs/evidence/bloom-023/qa-ui-mockups-c15.js [--shots] [--firefox]
  Writes docs/evidence/bloom-023/qa-results.json (+ screenshots with --shots). Exit code 1 on any failed check.

  Verified per viewport (1280×800, 1024×768, 1440×900), plus reduced motion and Firefox at 1280×800:
    gallery reaches Concepts 1–15 and defaults to the new Rooms convergence tab · Concept 15 loads with no console errors, no
    external requests, no horizontal scroll · the main map fills the frame width (the SVG viewBox matches the frame aspect, the
    ocean rect covers it, no dead side columns) · the bottom region banner appears ONLY while a region is selected; the X closes
    it and deselects; a click on empty map / ocean closes it and deselects; Pause and speed do not close it · Map View layers:
    hover / focus previews, click sets (Planet View and room mini-maps) · entering any room auto-pauses, deselects the home map
    and applies that region as the room's mini-map context · room mini-map clicks change the room context only; back on Planet
    View nothing is selected · the main map keeps the same geometry across open / close · Region Inspect tabs · Adapt / Spread
    share the room family (same zones, same tree kind, leader lanes from plant parts, none crossing) · Adapt hover changes the
    plant and the LEFT info block, lights the matching leader and marks regions on the mini-map · Spread hover does the same with
    dispersal arcs · Terraform hover changes the land scene, the globe and the mini-map tint, never a plant (there is none) · the
    globe spins by drag and by arrow keys · trees have no node collisions · room UI is measurably larger than Concept 11 · room →
    room links keep the pause and context · Back / Resume / Escape rules · keyboard walk stays inside the room with visible focus ·
    deep links · no emoji on the page · static isolation of the new files · root index.html, gameplay folders, shared mockup
    files and Concepts 1–14 untouched (git status).
*/
'use strict';
const path = require('path'), fs = require('fs'), cp = require('child_process');
const { chromium, firefox } = require('playwright');
const ROOT = path.resolve(__dirname, '../../..');
const DIR = path.join(ROOT, 'demos/ui-mockups');
const OUT = __dirname;
const SHOTS = process.argv.includes('--shots');
const url = f => 'file://' + path.join(DIR, f);
const PAGE = 'concept-15-convergence.html';
const ROOMS = ['region', 'adapt', 'spread', 'terraform'];
const VIEWPORTS = [[1280, 800], [1024, 768], [1440, 900]];
const results = { when:new Date().toISOString(), checks:[], geometry:{}, trees:{}, sizes:{}, icons:{}, external:[], errors:[] };
let fails = 0;
function check(name, ok, detail){ results.checks.push({ name, ok:!!ok, detail:detail === undefined ? null : detail }); if (!ok) { fails++; console.log('  ✗', name, detail !== undefined ? JSON.stringify(detail) : ''); } }
const wait = ms => new Promise(r => setTimeout(r, ms));
async function newPage(browser, vp, opts){
  const ctx = await browser.newContext(Object.assign({ viewport:{ width:vp[0], height:vp[1] } }, opts || {}));
  const page = await ctx.newPage(); page._errs = [];
  page.on('console', m => { if (m.type() === 'error') page._errs.push(m.text()); }); page.on('pageerror', e => page._errs.push(e.message));
  ctx.on('request', r => { const u = r.url(); if (!/^(file|data|blob|about):/.test(u)) results.external.push(u); });
  return { ctx, page };
}
const noHScroll = page => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.body.scrollWidth <= innerWidth);
const isVisible = (page, sel) => page.$eval(sel, e => !e.closest('[hidden]') && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden').catch(() => false);
const text = (page, sel) => page.$eval(sel, e => e.textContent.replace(/\s+/g, ' ').trim()).catch(() => '');
const st = page => page.evaluate(() => ({ sel:ROOMS23.state.sel, ctx:ROOMS23.state.ctx, room:ROOMS23.state.room, banner:!document.getElementById('banner').hidden, paused:BM.clock.paused, lens:ROOMS23.state.lens, lensPv:ROOMS23.state.lensPv, mainLens:map.lens, miniLens:ROOMS23.miniMaps.map(m => m.lens), miniSel:ROOMS23.miniMaps.map(m => m.selected) }));
const mapRect = page => page.$eval('#mapwrap svg', e => { const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height].map(v => Math.round(v)); });
const same = (a, b) => a.every((v, k) => Math.abs(v - b[k]) <= 1);
async function clickRegion(page, id, scope){
  const pt = await page.evaluate(([id, scope]) => { const host = document.querySelector(scope); const rects = [...host.querySelectorAll('.rg[data-r="' + id + '"] rect')].map(r => r.getBoundingClientRect()).map(b => ({ x:b.x + b.width / 2, y:b.y + b.height / 2 })); for (const p of rects) { const el = document.elementFromPoint(p.x, p.y); const g = el && el.closest && el.closest('.rg'); if (g && g.dataset.r === id && host.contains(g)) return p; } return null; }, [id, scope]);
  if (!pt) throw new Error('region not clickable: ' + id + ' in ' + scope);
  await page.mouse.click(pt.x, pt.y); return pt;
}
async function hoverEl(page, sel){ const h = await page.$(sel); if (!h) throw new Error('no element ' + sel); const b = await h.boundingBox(); await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await wait(280); return b; }
const specParts = (page, sel) => page.$eval(sel, host => { const svg = host.querySelector('.bm-spec svg'); if (!svg) return { plant:'', env:'' }; const ls = svg.querySelectorAll(':scope > g.layer'); const g = ls[ls.length - 1]; const c = g.cloneNode(true); c.querySelectorAll('[data-f="env"]').forEach(n => n.remove()); c.querySelectorAll('.dim,.glow').forEach(n => n.classList.remove('dim', 'glow')); c.querySelectorAll('[class=""]').forEach(n => n.removeAttribute('class')); return { plant:c.innerHTML, env:g.querySelector('[data-f="env"]').innerHTML.replace(/sk[a-z0-9]{6}/g, '') }; });
async function tabWalk(page, n){
  const bad = [], outside = []; let count = 0;
  for (let k = 0; k < n; k++) {
    await page.keyboard.press('Tab');
    const d = await page.evaluate(() => { const a = document.activeElement; if (!a || a === document.body) return null; const r = a.getBoundingClientRect(); let op = 1; for (let e = a; e && e.nodeType === 1; e = e.parentElement) op *= +getComputedStyle(e).opacity; const ring = a instanceof SVGElement ? 'svg' : getComputedStyle(a).outlineStyle; return { id:a.id || a.dataset.node || a.dataset.r || a.dataset.tool || a.dataset.roomGo || a.dataset.lens || (a.textContent || '').trim().slice(0, 20), w:r.width, h:r.height, hiddenAnc:!!a.closest('[hidden]'), op:Math.round(op * 100) / 100, ring, inRooms:!!a.closest('#rooms') }; });
    if (!d) continue; count++;
    if (d.hiddenAnc || d.w < 1 || d.h < 1 || d.op < .5 || d.ring === 'none') bad.push(d);
    if (!d.inRooms) outside.push(d.id);
  }
  return { bad, outside, count };
}
async function shot(page, name){ if (!SHOTS || !name) return; await page.evaluate(() => document.querySelectorAll('.toast').forEach(t => t.remove())); await wait(200); await page.screenshot({ path:path.join(OUT, name) }); }
const EMOJI = /\p{Extended_Pictographic}/u;
const emojiScan = page => page.evaluate(() => { const re = /\p{Extended_Pictographic}/u; const hits = []; const t = document.body.innerText || ''; const m = t.match(/\p{Extended_Pictographic}/gu); if (m) hits.push({ where:'innerText', chars:[...new Set(m)].slice(0, 6) }); [...document.querySelectorAll('button, .st, .cat-l, .rk, .mm-k, .node, .lb, .rc, .alab, .li-part')].forEach(e => { if (re.test(e.textContent)) hits.push({ where:(e.className || e.tagName).toString().slice(0, 30), chars:e.textContent.match(/\p{Extended_Pictographic}/gu).slice(0, 3) }); }); return { hits:hits.slice(0, 5), svgIcons:document.querySelectorAll('svg.ic').length }; });
const treeStats = (page, room) => page.evaluate(room => { const sec = document.querySelector('.room[data-room="' + room + '"]'); const tr = sec.querySelector('.tree'); const nodes = [...tr.querySelectorAll('.node:not([hidden])')]; const boxes = nodes.map(n => n.getBoundingClientRect()); const host = tr.getBoundingClientRect();
  let overlaps = 0; for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) { const a = boxes[i], b = boxes[j]; const ix = Math.min(a.right, b.right) - Math.max(a.left, b.left), iy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top); if (ix > 2 && iy > 2) overlaps++; }
  const outside = boxes.filter(b => b.left < host.left - 2 || b.right > host.right + 2 || b.top < host.top - 2 || b.bottom > host.bottom + 2).length;
  const lds = [...sec.querySelectorAll('.leaders .ld')].map(p => { const d = p.getAttribute('d'); const m = d.match(/M([\d.]+) ([\d.]+)H([\d.]+)Q[\d. ]+V([\d.]+)/); return m ? { ay:+m[2], lane:+m[3], py:+m[4] } : null; }).filter(Boolean);
  // leaders never cross: anchors and ports are both ordered top → bottom, and lanes are ordered the other way round (upper = nearer the tree)
  let ordered = true; for (let i = 1; i < lds.length; i++) if (!(lds[i].ay > lds[i - 1].ay && lds[i].py > lds[i - 1].py && lds[i].lane < lds[i - 1].lane)) ordered = false;
  return { kind:[...tr.classList].find(c => c.startsWith('k-')), nodes:nodes.length, edges:tr.querySelectorAll('.edges path.edge').length, overlaps, outside, leaders:lds.length, leadersOrdered:ordered, nodeW:Math.round(boxes[0].width), em:parseFloat(getComputedStyle(sec).fontSize), zones:['.z-focus .lf-top', '.z-focus .lf-info', '.z-main .tree', '.z-map .mm-map'].map(s => !!sec.querySelector(s)) }; }, room);

async function runConcept(browser, vp, rm, engine){
  const tag = 'c15@' + vp.join('x') + (rm ? '+rm' : '') + (engine ? '+' + engine : '');
  const main = vp[0] === 1280 && !rm && !engine;
  const { ctx, page } = await newPage(browser, vp, rm ? { reducedMotion:'reduce' } : {});
  await page.goto(url(PAGE)); await wait(700);
  let s = await st(page);
  check(tag + ': loads (HUD, main map, five tools, Pause / speed), no console errors, nothing selected, no banner, clock running', (await isVisible(page, '#hud')) && (await isVisible(page, '#mapwrap svg')) && (await page.$$('#tools .tool')).length === 5 && (await isVisible(page, '#ckPause')) && page._errs.length === 0 && s.sel === null && !s.banner && !s.paused, { errs:page._errs.slice(0, 3), s });
  check(tag + ': Planet View no horizontal scroll', await noHScroll(page));
  // map fills the width
  const fit = await page.evaluate(() => { const svg = document.querySelector('#mapwrap svg'); const wrap = document.getElementById('mapwrap').getBoundingClientRect(); const zone = document.getElementById('mapzone').getBoundingClientRect(); const r = svg.getBoundingClientRect(); const vb = svg.getAttribute('viewBox').split(' ').map(Number); const bg = svg.querySelector(':scope > rect'); return { svgW:Math.round(r.width), wrapW:Math.round(wrap.width), zoneW:Math.round(zone.width), boxAR:r.width / r.height, vbAR:vb[2] / vb[3], bgCovers:+bg.getAttribute('x') <= vb[0] && +bg.getAttribute('width') >= vb[2] - .5 && +bg.getAttribute('height') >= vb[3] - .5, vb:svg.getAttribute('viewBox') }; });
  check(tag + ': main map fills the available width: SVG spans the frame, viewBox aspect = frame aspect, ocean rect covers the widened viewBox (no dead side columns)', fit.svgW >= fit.zoneW - 2 && Math.abs(fit.boxAR - fit.vbAR) < .01 && fit.bgCovers, fit);
  results.geometry[tag] = { fit };
  await shot(page, main ? '01-planet-no-selection.png' : null);
  // banner rules
  const r0 = await mapRect(page);
  await clickRegion(page, 'frost', '#mapwrap'); await wait(250); s = await st(page);
  check(tag + ': clicking Frost Ridge selects it and shows the bottom region banner (X button, name, status, four conditions, Inspect)', s.sel === 'frost' && s.banner && (await isVisible(page, '#banner .bx')) && /Frost Ridge/.test(await text(page, '#banner .bn-h')) && (await page.$$('#banner .bn-c .bc')).length === 4 && (await isVisible(page, '#banner [data-tool="region"]')), s);
  const r0b = await mapRect(page);
  check(tag + ': selecting a region does not move or resize the main map', same(r0, r0b), { r0, r0b });
  await page.click('#ckPause'); await wait(120); const sP = await st(page); await page.click('#ckSpeed'); await wait(120); const sS = await st(page); await page.click('#ckPause'); await wait(120);
  check(tag + ': Pause and Speed do NOT close the banner or change the selection', sP.paused && sP.banner && sP.sel === 'frost' && sS.banner && sS.sel === 'frost' && !(await st(page)).paused, { sP, sS });
  await shot(page, main ? '02-planet-banner.png' : null);
  const ocean = await page.evaluate(() => { const z = document.getElementById('mapzone').getBoundingClientRect(); for (const p of [[z.left + 24, z.bottom - 24], [z.right - 24, z.top + 24], [z.left + 24, z.top + 90], [z.right - 24, z.bottom - 24]]) { const el = document.elementFromPoint(p[0], p[1]); if (el && !el.closest('.rg, button, .banner, .lensbar, [role="button"]') && el.closest('#mapzone')) return { x:p[0], y:p[1] }; } return null; });
  if (ocean) { await page.mouse.click(ocean.x, ocean.y); await wait(250); } s = await st(page);
  check(tag + ': clicking empty map / ocean closes the banner and deselects', !!ocean && s.sel === null && !s.banner, { ocean, s });
  await clickRegion(page, 'frost', '#mapwrap'); await wait(200); await page.click('#banner .bx'); await wait(250); s = await st(page);
  check(tag + ': the X-in-a-circle closes the banner and deselects', s.sel === null && !s.banner, s);
  // Map View: hover previews, click sets
  await page.click('[data-tool="mapview"]'); await wait(200);
  const tb = await hoverEl(page, '#lensbar [data-lens="temp"]'); const sH = await st(page); await page.mouse.move(4, 300); await wait(200); const sL = await st(page);
  await page.mouse.click(tb.x + tb.width / 2, tb.y + tb.height / 2); await wait(200); const sC = await st(page);
  await hoverEl(page, '#lensbar [data-lens="water"]'); const sH2 = await st(page); if (main) await shot(page, '08-mapview-hover-preview.png'); await page.mouse.move(4, 300); await wait(200); const sL2 = await st(page);
  check(tag + ': Map View layer: hover previews Temperature on the map without setting it, leaving restores, click sets it, hovering Water previews over the set layer and leaving returns to Temperature', sH.lensPv === 'temp' && sH.lens === null && sH.mainLens === 'temp' && sL.mainLens === null && sC.lens === 'temp' && sC.mainLens === 'temp' && sH2.lensPv === 'water' && sH2.mainLens === 'water' && sH2.lens === 'temp' && sL2.mainLens === 'temp', { sH, sL, sC, sH2, sL2 });
  await page.focus('#lensbar [data-lens="soil"]'); await wait(120); const sF = await st(page); await page.click('#lensbar [data-lens=""]'); await wait(120);
  check(tag + ': keyboard focus on a layer button previews it too', sF.lensPv === 'soil' && sF.mainLens === 'soil' && (await st(page)).lens === null, sF);
  await page.click('[data-tool="mapview"]'); await wait(100);
  // rooms
  const trees = {};
  for (const room of ROOMS) {
    await clickRegion(page, 'frost', '#mapwrap'); await wait(200);
    await page.click('[data-tool="' + room + '"]'); await wait(500); s = await st(page);
    const pill = await page.$eval('.room[data-room="' + room + '"] .paused', e => e.classList.contains('on') && getComputedStyle(e).opacity === '1').catch(() => false);
    const bg = await page.evaluate(() => document.getElementById('planet').hidden && document.getElementById('hud').hidden);
    check(tag + ' ' + room + ': opens from its tool, AUTO-PAUSES, PAUSED pill on, Planet View hidden; the home selection is CLEARED and Frost Ridge becomes the room context on the mini-map', s.paused && pill && bg && (await isVisible(page, '.room[data-room="' + room + '"]')) && s.sel === null && !s.banner && s.ctx === 'frost' && s.miniSel.every(x => x === 'frost') && /Frost Ridge/.test(await text(page, '.room[data-room="' + room + '"] .mm-name')), { s, pill, bg });
    check(tag + ' ' + room + ': no horizontal scroll, no console errors', (await noHScroll(page)) && page._errs.length === 0, page._errs.slice(0, 2));
    check(tag + ' ' + room + ': header names the room and offers Planet, four room links, Resume play', (await text(page, '.room[data-room="' + room + '"] h2')).length > 2 && (await page.$$('.room[data-room="' + room + '"] [data-room-go]')).length === 4 && (await isVisible(page, '.room[data-room="' + room + '"] [data-act="resume"]')) && (await isVisible(page, '.room[data-room="' + room + '"] [data-act="back"]')));
    const mmSel = '.room[data-room="' + room + '"] .mm-map';
    check(tag + ' ' + room + ': has a smaller interactive map in the right column', await isVisible(page, mmSel + ' svg.bm-map'));
    await clickRegion(page, 'dust', mmSel); await wait(250); s = await st(page);
    check(tag + ' ' + room + ': clicking Dust Reach on the mini-map changes the ROOM context only (home selection stays empty)', s.ctx === 'dust' && s.sel === null && /Dust Reach/.test(await text(page, '.room[data-room="' + room + '"] .mm-name')), s);
    const hp = await page.evaluate(([id, scope]) => { const host = document.querySelector(scope); const r = [...host.querySelectorAll('.rg[data-r="' + id + '"] rect')].map(r => r.getBoundingClientRect()).find(b => { const el = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2); return el && el.closest('.rg') && el.closest('.rg').dataset.r === id; }); return r ? { x:r.x + r.width / 2, y:r.y + r.height / 2 } : null; }, ['salt', mmSel]);
    if (hp) { await page.mouse.move(hp.x, hp.y); await wait(200); }
    check(tag + ' ' + room + ': hovering Salt Flats on the mini-map peeks its status', !!hp && /Salt Flats/.test(await text(page, '.room[data-room="' + room + '"] .mm-peek')));
    await page.mouse.move(2, 2); await wait(100);
    const mlb = await hoverEl(page, '.room[data-room="' + room + '"] .mm-lens [data-lens="hazard"]'); const mH = await st(page); await page.mouse.move(2, 2); await wait(150); const mL = await st(page);
    await page.mouse.click(mlb.x + mlb.width / 2, mlb.y + mlb.height / 2); await wait(150); const mC = await st(page); await page.click('.room[data-room="' + room + '"] .mm-lens [data-lens=""]'); await wait(100);
    check(tag + ' ' + room + ': mini-map Map View chips: hover previews Hazard on the mini-maps, leaving restores, click sets', mH.lensPv === 'hazard' && mH.miniLens.every(x => x === 'hazard') && mL.miniLens.every(x => x === null) && mC.lens === 'hazard' && (await st(page)).lens === null, { mH, mL, mC });
    if (room !== 'region') {
      const t = await treeStats(page, room); trees[room] = t;
      check(tag + ' ' + room + ': renders a tree (' + t.kind + ': ' + t.nodes + ' nodes, ' + t.edges + ' edges), no node collisions, nodes inside the tree area', t.nodes >= 8 && t.edges >= 7 && t.overlaps === 0 && t.outside === 0, t);
      if (room !== 'terraform') check(tag + ' ' + room + ': plant upper-left, info lower-left, tree centre, mini-map right; leader lanes from plant parts to the category rail, one per category, never crossing', t.zones.every(Boolean) && t.leaders === (room === 'adapt' ? 4 : 3) && t.leadersOrdered, t);
      const host = '.room[data-room="' + room + '"]';
      const nodeId = room === 'adapt' ? 'cold' : room === 'spread' ? 'waterSeeds' : 'warm';
      const before = await specParts(page, host); const infoBefore = await text(page, host + ' .lf-info');
      const sceneBefore = room === 'terraform' ? await page.$eval(host + ' .scene stop', e => e.getAttribute('stop-color')) : '';
      await hoverEl(page, host + ' .node[data-node="' + nodeId + '"]');
      const after = await specParts(page, host);
      const pv = await page.evaluate(([host, room]) => { const r = document.querySelector(host); const tint = r.querySelector('.mm-map .tint'); const info = r.querySelector('.lf-info'); return { infoPv:info.classList.contains('pv'), info:info.textContent.replace(/\s+/g, ' ').trim(), open:r.querySelectorAll('.mm-map .pv-open').length, arcs:r.querySelectorAll('.mm-map .seedarc').length, tint:+tint.getAttribute('opacity'), previewing:!!r.querySelector('.bm-spec.previewing'), glow:[...new Set([...r.querySelectorAll('.bm-spec [data-f].glow')].map(n => n.dataset.f))], ldOn:r.querySelectorAll('.leaders .ld.on').length, ctx:(r.querySelector('.mm-ctx') || {}).textContent || '', scenePv:!!r.querySelector('.scene.pv'), sceneStop:r.querySelector('.scene stop') ? r.querySelector('.scene stop').getAttribute('stop-color') : '', globeOpen:[...r.querySelectorAll('.globe .land.open')].map(e => e.dataset.r), globePv:!!r.querySelector('.globe.pv'), readout:(r.querySelector('.e-tp') || {}).textContent || '', specimens:r.querySelectorAll('.bm-spec').length }; }, [host, room]);
      if (room === 'adapt') check(tag + ' adapt: hovering Cold Tolerance previews on the PLANT (not the environment), explains it in the LEFT info block, lights the Stem leader, marks opening regions on the mini-map and names them in the right-column region context', after.plant !== before.plant && after.env === before.env && pv.previewing && pv.glow.includes('temp') && pv.infoPv && /Cold Tolerance/.test(pv.info) && /120 Biomass/.test(pv.info) && /Changes Stem/i.test(pv.info) && pv.ldOn === 1 && pv.open >= 1 && /Opens .*Frost Ridge/.test(pv.ctx), { plantChanged:after.plant !== before.plant, envChanged:after.env !== before.env, pv:Object.assign({}, pv, { info:pv.info.slice(0, 80) }) });
      if (room === 'spread') check(tag + ' spread: hovering Waterborne Seeds previews on the plant (seed parts), explains it in the left block, lights the Pods leader and draws dispersal arcs on the mini-map', after.plant !== before.plant && after.env === before.env && pv.glow.includes('spread') && pv.infoPv && /Waterborne Seeds/.test(pv.info) && /Changes Pods/i.test(pv.info) && pv.ldOn === 1 && pv.arcs >= 1 && /Tide Isle/.test(pv.ctx), { arcs:pv.arcs, glow:pv.glow, ldOn:pv.ldOn, info:pv.info.slice(0, 80) });
      if (room === 'terraform') check(tag + ' terraform: hovering Warm the Sky changes the LAND SCENE (sky colour, preview tag), the GLOBE (lit regions, glow) and the mini-map tint, shows 14 → 20 °C in the right-column readout and explains it in the left block; there is no plant drawing in the room', pv.scenePv && pv.sceneStop !== sceneBefore && pv.globePv && pv.globeOpen.length >= 1 && pv.tint > 0 && pv.open >= 1 && /20 °C/.test(pv.readout) && pv.infoPv && /Warm the Sky/.test(pv.info) && /not the plant/i.test(pv.info) && pv.specimens === 0, { sceneBefore, pv:Object.assign({}, pv, { info:pv.info.slice(0, 80) }) });
      if (main) await shot(page, room === 'adapt' ? '04-adapt-hover-preview.png' : room === 'spread' ? '05-spread-hover-preview.png' : '06-terraform-hover-preview.png');
      if (!rm && !engine && vp[0] !== 1280 && (room === 'adapt' || room === 'terraform')) await shot(page, (vp[0] === 1024 ? (room === 'adapt' ? '09' : '10') : (room === 'adapt' ? '11' : '12')) + '-' + vp[0] + '-' + room + '.png');
      await page.mouse.move(2, 2); await wait(250);
      const restored = await specParts(page, host); const infoAfter = await text(page, host + ' .lf-info');
      check(tag + ' ' + room + ': leaving the node restores the visual, the left info block and the mini-map', restored.plant === before.plant && restored.env === before.env && infoAfter === infoBefore && (await page.evaluate(h => document.querySelector(h + ' .mm-map .pv-open, ' + h + ' .mm-map .seedarc') === null && !document.querySelector(h + ' .lf-info').classList.contains('pv'), host)), { infoBefore:infoBefore.slice(0, 50), infoAfter:infoAfter.slice(0, 50) });
      if (room === 'terraform') {
        const g = await page.$(host + ' .globe'); const gb = await g.boundingBox(); const rot0 = await page.evaluate(() => ROOMS23.rooms.terraform.globe.rot);
        await page.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2); await page.mouse.down(); await page.mouse.move(gb.x + gb.width / 2 + 140, gb.y + gb.height / 2, { steps:7 }); await page.mouse.up(); await wait(120);
        const rot1 = await page.evaluate(() => ROOMS23.rooms.terraform.globe.rot);
        await g.focus(); await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowLeft'); const rot2 = await page.evaluate(() => ROOMS23.rooms.terraform.globe.rot);
        const vis = await page.evaluate(h => { const ls = [...document.querySelectorAll(h + ' .globe .land')]; return { total:ls.length, hidden:ls.filter(e => e.getAttribute('opacity') === '0').length }; }, host);
        check(tag + ' terraform: the globe spins by click-drag and by arrow keys (lightweight, stable: no errors, land shows on the front and hides on the back)', rot1 > rot0 + .5 && rot2 < rot1 && vis.total === 16 && vis.hidden > 2 && vis.hidden < 14 && page._errs.length === 0, { rot0, rot1, rot2, vis });
        if (main) await shot(page, '07-terraform-globe-emphasis.png');
      }
    } else {
      const conds = (await page.$$('.room[data-room="region"] .cond')).length;
      await page.click('#tab-colony'); await wait(150); const tabOk = (await isVisible(page, '#pane-colony')) && !(await isVisible(page, '#pane-overview')); await page.click('#tab-overview');
      const tabH = await page.$eval('#tab-overview', e => e.getBoundingClientRect().height);
      check(tag + ' region: four condition rows, limiting factor, large Overview / Colony / Science tabs (≥ 40 px), plant upper-left, colony info lower-left, mini-map right', conds === 4 && tabOk && tabH >= 40 && (await isVisible(page, '.room[data-room="region"] .limit')) && (await isVisible(page, '.room[data-room="region"] .lf-top .bm-spec')) && (await isVisible(page, '.room[data-room="region"] .lf-info')), { conds, tabOk, tabH });
      if (main) await shot(page, '03-region-inspect.png');
    }
    if (room === 'adapt') {
      await page.click('.room[data-room="adapt"] [data-room-go="terraform"]'); await wait(300); s = await st(page);
      check(tag + ': Adapt → Terraform link switches rooms without leaving the paused mode or changing the room context', (await isVisible(page, '.room[data-room="terraform"]')) && !(await isVisible(page, '.room[data-room="adapt"]')) && s.paused && s.ctx === 'dust', s);
    }
    await page.keyboard.press('Escape'); await wait(300); s = await st(page);
    check(tag + ' ' + room + ': Escape returns to Planet View, RESUMES the clock (it was running before) and leaves NO region selected (the mini-map choice did not come back as a home selection)', !s.room && !s.paused && s.sel === null && !s.banner && (await isVisible(page, '#mapwrap svg')) && (await page.evaluate(() => map.selected === null)), s);
    const r1 = await mapRect(page);
    check(tag + ' ' + room + ': the main map has exactly the same geometry after the room as before (no reframing)', same(r0, r1), { before:r0, after:r1 });
  }
  results.trees[tag] = trees;
  if (trees.adapt && trees.spread) check(tag + ': Adapt and Spread share the room family (same tree kind, same zones, same em scale)', trees.adapt.kind === trees.spread.kind && trees.adapt.zones.join() === trees.spread.zones.join() && trees.adapt.em === trees.spread.em, { adapt:trees.adapt.kind, spread:trees.spread.kind });
  if (trees.terraform) check(tag + ': Terraform uses a distinct tree design (orbit) around the globe', trees.terraform.kind === 'k-orbit' && trees.adapt.kind === 'k-anat', { terraform:trees.terraform.kind });
  // exits
  await page.click('[data-tool="spread"]'); await wait(300); await page.click('.room[data-room="spread"] [data-act="resume"]'); await wait(250);
  check(tag + ': Resume play closes the room and runs the clock', await page.evaluate(() => document.getElementById('rooms').hidden && !BM.clock.paused));
  await page.click('#ckPause'); await wait(100); await page.click('[data-tool="terraform"]'); await wait(300); await page.click('.room[data-room="terraform"] [data-act="back"]'); await wait(250);
  check(tag + ': Back from a run that was already paused stays paused', await page.evaluate(() => document.getElementById('rooms').hidden && BM.clock.paused));
  await page.click('#ckPause'); await wait(100);
  // keyboard
  await page.focus('[data-tool="adapt"]'); await page.keyboard.press('Enter'); await wait(400);
  const walk = await tabWalk(page, 28); await page.keyboard.press('Escape'); await wait(300);
  const focusBack = await page.evaluate(() => document.activeElement && document.activeElement.dataset.tool === 'adapt');
  check(tag + ': keyboard: Enter on Adapt opens it, 28 Tabs stay inside the room with visible focus, Escape returns focus to the Adapt tool', walk.bad.length === 0 && walk.outside.length === 0 && walk.count >= 20 && focusBack, { bad:walk.bad.slice(0, 3), outside:walk.outside.slice(0, 3), count:walk.count, focusBack });
  // deep link
  await page.goto(url(PAGE) + '?room=adapt&region=frost'); await wait(600); s = await st(page);
  check(tag + ': deep link ?room=adapt&region=frost opens Adapt paused with Frost Ridge as the room context and nothing selected at home', s.paused && s.room === 'adapt' && s.ctx === 'frost' && s.sel === null, s);
  const em = await emojiScan(page); results.icons[tag] = em;
  check(tag + ': no emoji anywhere on the page; inline SVG icons in use (' + em.svgIcons + ')', em.hits.length === 0 && em.svgIcons >= 40, em);
  check(tag + ': no console errors over the whole run', page._errs.length === 0, page._errs.slice(0, 3));
  await ctx.close();
}

async function runSizes(browser){
  const sizes = async (file) => { const { ctx, page } = await newPage(browser, [1280, 800]); await page.goto(url(file) + '?room=adapt&region=frost'); await wait(600); const r = await page.evaluate(() => { const q = s => document.querySelector(s); const fs = e => e ? parseFloat(getComputedStyle(e).fontSize) : 0; const h = e => e ? e.getBoundingClientRect().height : 0; const w = e => e ? e.getBoundingClientRect().width : 0; const node = q('.r-adapt .node[data-node="cold"]'); return { nodeName:fs(node && node.querySelector('.nt b')), nodeW:Math.round(w(node)), nodeIcon:Math.round(w(node && node.querySelector('.ni'))), roomTab:fs(q('.r-adapt .rn')), roomTabH:Math.round(h(q('.r-adapt .rn'))), chip:fs(q('.r-adapt .rc')), chipH:Math.round(h(q('.r-adapt .rc'))), h2:fs(q('.r-adapt h2')), mmName:fs(q('.r-adapt .mm-name')), catLabel:fs(q('.r-adapt .cat-l')), lensChip:fs(q('.r-adapt .mm-lens .lb')) }; }); await ctx.close(); return r; };
  const c11 = await sizes('concept-11-balanced-rooms.html'), c15 = await sizes(PAGE); results.sizes = { c11, c15 };
  const bigger = ['nodeName', 'nodeW', 'nodeIcon', 'roomTab', 'roomTabH', 'chip', 'chipH', 'h2', 'mmName', 'catLabel', 'lensChip'].filter(k => c15[k] >= c11[k] * 1.08);
  check('sizing: at 1280×800 the Concept 15 room UI is measurably larger than Concept 11 (node name, node width, node icon, room tabs, chips, title, mini-map name, category label, lens chips all ≥ 8 % larger)', bigger.length === 11, { c11, c15, bigger });
}

async function runGallery(browser){
  for (const vp of VIEWPORTS) {
    const { ctx, page } = await newPage(browser, vp);
    await page.goto(url('index.html')); await wait(400);
    check('gallery @' + vp.join('x') + ': defaults to Rooms convergence (BLOOM-023), no horizontal scroll, no console errors', (await page.$eval('[role="tab"][aria-selected="true"]', e => e.id)) === 'tab-c15' && (await noHScroll(page)) && page._errs.length === 0, page._errs.slice(0, 2));
    if (vp[0] === 1280) {
      await shot(page, '00-gallery-c15.png');
      const tabs = await page.$$eval('[role="tab"]', es => es.map(e => e.id));
      check('gallery: six rounds in order', tabs.join(',') === 'tab-c15,tab-rooms,tab-refinement,tab-convergence,tab-round2,tab-round1', tabs);
      const links = await page.$$eval('#panel-c15 a.open', es => es.map(e => e.getAttribute('href')));
      check('gallery: Rooms convergence launches Concept 15 only', links.join(',') === PAGE, links);
      const hiddenTabbable = await page.$$eval('.round[hidden] a, .round[hidden] button', es => es.filter(e => e.offsetParent !== null).length);
      check('gallery: hidden tabs’ links not visible / tabbable', hiddenTabbable === 0);
      await page.focus('#tab-c15'); const order = [];
      for (let k = 0; k < 6; k++) { await page.keyboard.press('ArrowRight'); order.push(await page.$eval('[role="tab"][aria-selected="true"]', e => e.id.slice(4))); }
      check('gallery tabs: arrow keys walk rooms → refinement → convergence → round2 → round1 → c15 (wrap)', order.join(',') === 'rooms,refinement,convergence,round2,round1,c15', order);
      const all = [];
      for (const t of ['c15', 'rooms', 'refinement', 'convergence', 'round2', 'round1']) { await page.goto(url('index.html') + '#' + t); await wait(200); all.push(...await page.$$eval('.round:not([hidden]) a.open', es => es.map(e => e.getAttribute('href')))); }
      const uniq = [...new Set(all)];
      check('gallery: 15 concept pages linked across the six tabs (Concepts 1–15 reachable)', uniq.length === 15 && uniq.includes(PAGE), uniq);
      const bad = [];
      for (const h of uniq) { const { ctx:c2, page:p2 } = await newPage(browser, [1280, 800]); await p2.goto(url(h)); await wait(500); if (p2._errs.length || !(await isVisible(p2, '.mock-ribbon'))) bad.push({ h, errs:p2._errs.slice(0, 2) }); await c2.close(); }
      check('gallery: all 15 concept pages load with the mockup ribbon and no console errors (Concepts 1–14 regression)', bad.length === 0, bad);
      await page.goto(url('index.html')); await page.evaluate(() => { try { localStorage.setItem('bloomMockTab22', 'round1'); localStorage.removeItem('bloomMockTab23'); } catch (e) {} }); await page.reload(); await wait(300);
      check('gallery: an old BLOOM-022 remembered tab does not hide the new default', (await page.$eval('[role="tab"][aria-selected="true"]', e => e.id)) === 'tab-c15');
    }
    await ctx.close();
  }
}

function staticChecks(){
  const files = ['c15.js', 'c15.css', PAGE].map(f => path.join(DIR, f));
  const banned = /bloom-sim|resources\/|planets\/|content\/|scenario|validator|generator|\bbalance\b|Bloom Report|bloom-report|fetch\(|XMLHttpRequest|import\s|require\(/i;
  const hits = [];
  files.forEach(f => { const s = fs.readFileSync(f, 'utf8'); s.split('\n').forEach((l, i) => { if (banned.test(l) && !/^\s*(\/\/|\*|\/\*|<!--|  )/.test(l) && !/VISUAL|Nothing here|never loads|not connected|Nothing in|validators, scenarios|balance data|Bloom Report\./.test(l)) hits.push(path.basename(f) + ':' + (i + 1) + ' ' + l.trim().slice(0, 80)); }); });
  check('isolation: c15.js / c15.css / the Concept 15 page contain no engine, generator, validator, scenario, balance, Bloom Report or network references outside comments', hits.length === 0, hits.slice(0, 5));
  const scripts = fs.readFileSync(path.join(DIR, PAGE), 'utf8').match(/<script src="([^"]+)"/g).join(' ');
  check('isolation: the Concept 15 page loads only shared.js and c15.js', scripts === '<script src="shared.js" <script src="c15.js"', scripts);
  const emojiFiles = files.filter(f => EMOJI.test(fs.readFileSync(f, 'utf8')));
  check('icons: no emoji characters in c15.js, c15.css or the Concept 15 page', emojiFiles.length === 0, emojiFiles.map(f => path.basename(f)));
  let st = ''; try { st = cp.execSync('git status --porcelain -- index.html resources content planets tools GAME_BIBLE.md demos/ui-mockups/shared.js demos/ui-mockups/shared.css demos/ui-mockups/rooms.js demos/ui-mockups/rooms.css demos/ui-mockups/r2.js demos/ui-mockups/r2.css demos/ui-mockups/c9.js demos/ui-mockups/c9.css demos/ui-mockups/c10.js demos/ui-mockups/c10.css "demos/ui-mockups/concept-1*.html" demos/ui-mockups/concept-[2-9]-*.html', { cwd:ROOT }).toString().trim(); } catch (e) { st = 'git unavailable'; }
  st = st.split('\n').filter(l => l && !/concept-15/.test(l)).join('\n');
  check('scope: repository-root index.html, gameplay folders, shared mockup files, rooms.js / rooms.css and Concepts 1–14 are untouched (git status)', st === '', st);
}

(async () => {
  staticChecks();
  const browser = await chromium.launch();
  console.log('gallery…'); await runGallery(browser);
  console.log('sizes…'); await runSizes(browser);
  for (const vp of VIEWPORTS) { console.log('concept 15', vp.join('x')); await runConcept(browser, vp, false); }
  console.log('concept 15 reduced motion'); await runConcept(browser, [1280, 800], true);
  await browser.close();
  if (process.argv.includes('--firefox')) { const fb = await firefox.launch(); console.log('concept 15 firefox'); await runConcept(fb, [1280, 800], false, 'firefox'); await fb.close(); }
  check('no external network requests', results.external.length === 0, results.external.slice(0, 5));
  results.summary = { total:results.checks.length, failed:fails };
  fs.writeFileSync(path.join(OUT, 'qa-results.json'), JSON.stringify(results, null, 1));
  console.log((fails ? 'FAIL' : 'PASS') + ' — ' + (results.checks.length - fails) + '/' + results.checks.length + ' checks');
  for (const k of Object.keys(results.trees)) console.log('trees', k, JSON.stringify(results.trees[k]));
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
