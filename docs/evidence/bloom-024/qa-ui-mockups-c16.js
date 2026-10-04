#!/usr/bin/env node
/*
  BLOOM-024 QA driver for the UI concept sandbox (demos/ui-mockups/): Concept 16, "Concept 15 Presentation Refinement".
  VISUAL MOCKUP ONLY. This checks the sandbox page, not the game. Needs Playwright (Chromium; Firefox with --firefox):
    NODE_PATH="$(npm root -g)" node docs/evidence/bloom-024/qa-ui-mockups-c16.js [--shots] [--firefox]
  Writes docs/evidence/bloom-024/qa-results.json (+ screenshots with --shots). Exit code 1 on any failed check.

  Forked from the BLOOM-023 driver. Everything Concept 15 was checked for still holds (Planet View rules, banner, selection vs
  room context, Map View previews, room open / close, keyboard, deep links, emoji, isolation), plus the BLOOM-024 brief's list:
    1 gallery reaches Concept 16 (seven tabs, 16 pages) · 2 Planet View still follows the Concept 15 rules · 3 rooms float over
    the blurred / dimmed world (planet visible underneath, inert, blurred; a click on it does nothing) · 4 side boxes are not
    forced to full height · 5 scale is measurably larger than Concept 15 · 6 three ordinary region pills fit across the right
    column · 7 the room shrinks proportionally at 1024 and grows at 1440 (em ratio = width ratio) · 8 Adapt / Spread category
    colours are present and consistent across label, node, port, leader and info · 9 leaders are thicker and still never cross ·
    10 Spread's tree box is shorter than Adapt's · 11 Terraform uses Soil / Atmosphere banks left and right of the globe, not a
    full orbit · 12 the atmosphere halo is drawn around the globe (stroke only, larger than the globe) · 13 hover leave resets
    previews (node → empty tree space, chip → away, mini-map → away, window blur) · 14 click still commits (a fake buy persists
    after leaving) · 15 no emoji · 16 no console errors, no external requests.
*/
'use strict';
const path = require('path'), fs = require('fs'), cp = require('child_process');
const { chromium, firefox } = require('playwright');
const ROOT = path.resolve(__dirname, '../../..');
const DIR = path.join(ROOT, 'demos/ui-mockups');
const OUT = __dirname;
const SHOTS = process.argv.includes('--shots');
const url = f => 'file://' + path.join(DIR, f);
const PAGE = 'concept-16-presentation-refinement.html', PREV = 'concept-15-convergence.html';
const ROOMS = ['region', 'adapt', 'spread', 'terraform'];
const VIEWPORTS = [[1280, 800], [1024, 768], [1440, 900]];
const results = { when:new Date().toISOString(), checks:[], geometry:{}, trees:{}, sizes:{}, scale:{}, colours:{}, icons:{}, external:[], errors:[] };
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
const st = page => page.evaluate(() => ({ sel:ROOMS24.state.sel, ctx:ROOMS24.state.ctx, room:ROOMS24.state.room, banner:!document.getElementById('banner').hidden, paused:BM.clock.paused, lens:ROOMS24.state.lens, lensPv:ROOMS24.state.lensPv, mainLens:map.lens, miniLens:ROOMS24.miniMaps.map(m => m.lens), miniSel:ROOMS24.miniMaps.map(m => m.selected), em:ROOMS24.state.em, emBy:ROOMS24.state.emBy }));
const mapRect = page => page.$eval('#mapwrap svg', e => { const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height].map(v => Math.round(v)); });
const same = (a, b) => a.every((v, k) => Math.abs(v - b[k]) <= 1);
async function regionPoint(page, id, scope){
  return page.evaluate(([id, scope]) => { const host = document.querySelector(scope); const rects = [...host.querySelectorAll('.rg[data-r="' + id + '"] rect')].map(r => r.getBoundingClientRect()).map(b => ({ x:b.x + b.width / 2, y:b.y + b.height / 2 })); for (const p of rects) { const el = document.elementFromPoint(p.x, p.y); const g = el && el.closest && el.closest('.rg'); if (g && g.dataset.r === id && host.contains(g)) return p; } return null; }, [id, scope]);
}
async function clickRegion(page, id, scope){ const pt = await regionPoint(page, id, scope); if (!pt) throw new Error('region not clickable: ' + id + ' in ' + scope); await page.mouse.click(pt.x, pt.y); return pt; }
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
async function shot(page, name, clip){ if (!SHOTS || !name) return; await page.evaluate(() => document.querySelectorAll('.toast').forEach(t => t.remove())); await wait(200); await page.screenshot(Object.assign({ path:path.join(OUT, name) }, clip ? { clip } : {})); }
const EMOJI = /\p{Extended_Pictographic}/u;
const emojiScan = page => page.evaluate(() => { const re = /\p{Extended_Pictographic}/u; const hits = []; const t = document.body.innerText || ''; const m = t.match(/\p{Extended_Pictographic}/gu); if (m) hits.push({ where:'innerText', chars:[...new Set(m)].slice(0, 6) }); [...document.querySelectorAll('button, .st, .cat-l, .cat-cap, .bank-legend, .rk, .mm-k, .node, .lb, .rc, .alab, .li-part')].forEach(e => { if (re.test(e.textContent)) hits.push({ where:(e.className || e.tagName).toString().slice(0, 30), chars:e.textContent.match(/\p{Extended_Pictographic}/gu).slice(0, 3) }); }); return { hits:hits.slice(0, 5), svgIcons:document.querySelectorAll('svg.ic').length }; });
const treeStats = (page, room) => page.evaluate(room => { const sec = document.querySelector('.room[data-room="' + room + '"]'); const tr = sec.querySelector('.tree'); const nodes = [...tr.querySelectorAll('.node:not([hidden])')]; const boxes = nodes.map(n => n.getBoundingClientRect()); const host = tr.getBoundingClientRect();
  let overlaps = 0; for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) { const a = boxes[i], b = boxes[j]; const ix = Math.min(a.right, b.right) - Math.max(a.left, b.left), iy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top); if (ix > 2 && iy > 2) overlaps++; }
  const outside = boxes.filter(b => b.left < host.left - 2 || b.right > host.right + 2 || b.top < host.top - 2 || b.bottom > host.bottom + 2).length;
  const lds = [...sec.querySelectorAll('.leaders .ld')].map(p => { const d = p.getAttribute('d'); const m = d.match(/M([\d.]+) ([\d.]+)H([\d.]+)Q[\d. ]+V([\d.]+)/); return m ? { ay:+m[2], lane:+m[3], py:+m[4], w:parseFloat(getComputedStyle(p).strokeWidth) } : null; }).filter(Boolean);
  // leaders never cross: anchors and ports are both ordered top → bottom, and lanes are ordered the other way round (upper = nearer the tree)
  let ordered = true; for (let i = 1; i < lds.length; i++) if (!(lds[i].ay > lds[i - 1].ay && lds[i].py > lds[i - 1].py && lds[i].lane < lds[i - 1].lane)) ordered = false;
  const zone = { top:host.top, bottom:host.bottom };
  const halo = sec.querySelector('.edges .halo'); const center = sec.querySelector('.tree .center');
  const cx = host.left + host.width / 2, R = center ? center.getBoundingClientRect().width / 2 : 0;
  const banks = nodes.map(n => ({ id:n.dataset.node, cat:n.dataset.cat, x:(n.querySelector('.ni') || n).getBoundingClientRect().left + (n.querySelector('.ni') || n).getBoundingClientRect().width / 2 - cx, y:n.getBoundingClientRect().top + n.getBoundingClientRect().height / 2 - (host.top + host.height / 2) }));
  return { kind:[...tr.classList].find(c => c.startsWith('k-')), nodes:nodes.length, edges:tr.querySelectorAll('.edges path.edge').length, overlaps, outside, leaders:lds.length, leadersOrdered:ordered, leaderW:lds.length ? Math.min(...lds.map(l => l.w)) : 0, plates:sec.querySelectorAll('.leaders .aplate').length, nodeW:Math.round(boxes[0].width), em:parseFloat(getComputedStyle(sec).fontSize), treeH:Math.round(host.height), zones:['.z-focus .lf-top', '.z-focus .lf-info', '.z-main .tree', '.z-map .mm-map'].map(s => !!sec.querySelector(s)), zone,
    halo:halo ? { r:+halo.getAttribute('r'), fill:getComputedStyle(halo).fill, R, stroke:getComputedStyle(halo).strokeWidth } : null, banks, R, cx }; }, room);
/* the floating-window presentation: boxes end with their content, the world shows behind */
const boxes = (page, room) => page.evaluate(room => { const sec = document.querySelector('.room[data-room="' + room + '"]'); const r = s => { const e = sec.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); const cs = getComputedStyle(e); const kids = [...e.children].filter(k => k.getClientRects().length); const content = kids.length ? Math.round(kids[kids.length - 1].getBoundingClientRect().bottom - kids[0].getBoundingClientRect().top + parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom) + parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth)) : 0; return { top:Math.round(b.top), bottom:Math.round(b.bottom), height:Math.round(b.height), content, slack:Math.round(b.height) - content, scrolls:e.scrollHeight > e.clientHeight + 2 }; };
  const rr = sec.getBoundingClientRect(); const cs = getComputedStyle(sec); const zoneBottom = Math.round(rr.bottom - parseFloat(cs.paddingBottom));
  const planet = document.getElementById('planet'); const rooms = document.getElementById('rooms');
  return { zoneBottom, info:r('.lf-info'), main:r('.z-main'), mm:r('.z-map .mm'), ctx:r('.z-map > .mm-ctx'), ctxSeparate:!!sec.querySelector('.z-map > .mm-ctx'), planetHidden:planet.hidden, planetInert:!!planet.inert, planetAria:planet.getAttribute('aria-hidden'), planetFilter:getComputedStyle(planet).filter, hudFilter:getComputedStyle(document.getElementById('hud')).filter, roomsBg:getComputedStyle(rooms).backgroundColor, roomBg:getComputedStyle(sec).backgroundColor, em:parseFloat(cs.fontSize) }; }, room);
const stripRows = (page, room) => page.evaluate(room => { const strip = document.querySelector('.room[data-room="' + room + '"] .mm-strip'); const chips = [...strip.querySelectorAll('.rc')]; const t0 = chips[0].getBoundingClientRect().top; const row1 = chips.filter(c => Math.abs(c.getBoundingClientRect().top - t0) < 2); const sb = strip.getBoundingClientRect(); const last = row1[row1.length - 1].getBoundingClientRect(); return { row1:row1.length, names:row1.map(c => c.textContent.trim()), stripW:Math.round(sb.width), chipW:Math.round(chips[0].getBoundingClientRect().width), slack:Math.round(sb.right - last.right) }; }, room);
const catColours = (page, room) => page.evaluate(room => { const sec = document.querySelector('.room[data-room="' + room + '"]'); const out = {}; [...sec.querySelectorAll('.tree .cat-l[data-cat]')].forEach(l => { const c = l.dataset.cat; const node = sec.querySelector('.tree .node[data-cat="' + c + '"]'); const lead = sec.querySelector('.leaders .lead-g[data-cat="' + c + '"]'); const port = sec.querySelector('.edges .port[style*="' + getComputedStyle(l).getPropertyValue('--cat').trim() + '"]');
    out[c] = { label:getComputedStyle(l).borderColor, node:getComputedStyle(node).borderLeftColor, nodeIcon:getComputedStyle(node.querySelector('.ni')).color, glow:lead ? getComputedStyle(lead.querySelector('.ld-glow')).stroke : null, anchor:lead ? getComputedStyle(lead.querySelector('.anchor')).stroke : null, port:port ? getComputedStyle(port).stroke : null, labelInk:getComputedStyle(l).color }; }); return out; }, room);

async function runConcept(browser, vp, rm, engine){
  const tag = 'c16@' + vp.join('x') + (rm ? '+rm' : '') + (engine ? '+' + engine : '');
  const main = vp[0] === 1280 && !rm && !engine;
  const { ctx, page } = await newPage(browser, vp, rm ? { reducedMotion:'reduce' } : {});
  await page.goto(url(PAGE)); await wait(700);
  let s = await st(page);
  check(tag + ': loads (HUD, main map, five tools, Pause / speed), no console errors, nothing selected, no banner, clock running', (await isVisible(page, '#hud')) && (await isVisible(page, '#mapwrap svg')) && (await page.$$('#tools .tool')).length === 5 && (await isVisible(page, '#ckPause')) && page._errs.length === 0 && s.sel === null && !s.banner && !s.paused, { errs:page._errs.slice(0, 3), s });
  check(tag + ': Planet View no horizontal scroll', await noHScroll(page));
  const fit = await page.evaluate(() => { const svg = document.querySelector('#mapwrap svg'); const zone = document.getElementById('mapzone').getBoundingClientRect(); const r = svg.getBoundingClientRect(); const vb = svg.getAttribute('viewBox').split(' ').map(Number); const bg = svg.querySelector(':scope > rect'); return { svgW:Math.round(r.width), zoneW:Math.round(zone.width), boxAR:r.width / r.height, vbAR:vb[2] / vb[3], bgCovers:+bg.getAttribute('x') <= vb[0] && +bg.getAttribute('width') >= vb[2] - .5 && +bg.getAttribute('height') >= vb[3] - .5, vb:svg.getAttribute('viewBox') }; });
  check(tag + ': main map fills the available width (unchanged Concept 15 rule)', fit.svgW >= fit.zoneW - 2 && Math.abs(fit.boxAR - fit.vbAR) < .01 && fit.bgCovers, fit);
  results.geometry[tag] = { fit };
  await shot(page, main ? '01-planet-no-selection.png' : null);
  // banner rules (Planet View unchanged)
  const r0 = await mapRect(page);
  await clickRegion(page, 'frost', '#mapwrap'); await wait(250); s = await st(page);
  check(tag + ': clicking Frost Ridge selects it and shows the bottom region banner (X, name, status, four conditions, Inspect)', s.sel === 'frost' && s.banner && (await isVisible(page, '#banner .bx')) && /Frost Ridge/.test(await text(page, '#banner .bn-h')) && (await page.$$('#banner .bn-c .bc')).length === 4 && (await isVisible(page, '#banner [data-tool="region"]')), s);
  check(tag + ': selecting a region does not move or resize the main map', same(r0, await mapRect(page)), r0);
  await page.click('#ckPause'); await wait(120); const sP = await st(page); await page.click('#ckSpeed'); await wait(120); const sS = await st(page); await page.click('#ckPause'); await wait(120);
  check(tag + ': Pause and Speed do NOT close the banner or change the selection', sP.paused && sP.banner && sP.sel === 'frost' && sS.banner && sS.sel === 'frost' && !(await st(page)).paused, { sP, sS });
  await shot(page, main ? '02-planet-banner.png' : null);
  const ocean = await page.evaluate(() => { const z = document.getElementById('mapzone').getBoundingClientRect(); for (const p of [[z.left + 24, z.bottom - 24], [z.right - 24, z.top + 24], [z.left + 24, z.top + 90], [z.right - 24, z.bottom - 24]]) { const el = document.elementFromPoint(p[0], p[1]); if (el && !el.closest('.rg, button, .banner, .lensbar, [role="button"]') && el.closest('#mapzone')) return { x:p[0], y:p[1] }; } return null; });
  if (ocean) { await page.mouse.click(ocean.x, ocean.y); await wait(250); } s = await st(page);
  check(tag + ': clicking empty map / ocean closes the banner and deselects', !!ocean && s.sel === null && !s.banner, { ocean, s });
  await clickRegion(page, 'frost', '#mapwrap'); await wait(200); await page.click('#banner .bx'); await wait(250); s = await st(page);
  check(tag + ': the X-in-a-circle closes the banner and deselects', s.sel === null && !s.banner, s);
  // Map View: hover previews, click sets, leaving the window resets
  await page.click('[data-tool="mapview"]'); await wait(200);
  const tb = await hoverEl(page, '#lensbar [data-lens="temp"]'); const sH = await st(page); await page.mouse.move(4, 300); await wait(200); const sL = await st(page);
  await page.mouse.click(tb.x + tb.width / 2, tb.y + tb.height / 2); await wait(200); const sC = await st(page);
  await hoverEl(page, '#lensbar [data-lens="water"]'); const sH2 = await st(page); if (main) await shot(page, '13-mapview-hover-preview.png'); await page.mouse.move(4, 300); await wait(200); const sL2 = await st(page);
  check(tag + ': Map View layer: hover previews Temperature without setting it, leaving restores, click sets it, hovering Water previews over the set layer and leaving returns to Temperature', sH.lensPv === 'temp' && sH.lens === null && sH.mainLens === 'temp' && sL.mainLens === null && sC.lens === 'temp' && sC.mainLens === 'temp' && sH2.lensPv === 'water' && sH2.mainLens === 'water' && sH2.lens === 'temp' && sL2.mainLens === 'temp', { sH, sL, sC, sH2, sL2 });
  await hoverEl(page, '#lensbar [data-lens="soil"]'); await page.evaluate(() => window.dispatchEvent(new Event('blur'))); await wait(120); const sB = await st(page);
  check(tag + ': hover reset: the window losing focus ends a layer preview at once', sB.lensPv === null && sB.mainLens === 'temp', sB);
  await page.focus('#lensbar [data-lens="soil"]'); await wait(120); const sF = await st(page); await page.click('#lensbar [data-lens=""]'); await wait(120);
  check(tag + ': keyboard focus on a layer button previews it too', sF.lensPv === 'soil' && sF.mainLens === 'soil' && (await st(page)).lens === null, sF);
  await page.click('[data-tool="mapview"]'); await wait(100);
  // rooms
  const trees = {}, bx = {};
  for (const room of ROOMS) {
    await clickRegion(page, 'frost', '#mapwrap'); await wait(200);
    await page.click('[data-tool="' + room + '"]'); await wait(600); s = await st(page);
    const pill = await page.$eval('.room[data-room="' + room + '"] .paused', e => e.classList.contains('on') && getComputedStyle(e).opacity === '1').catch(() => false);
    const b = await boxes(page, room); bx[room] = b;
    check(tag + ' ' + room + ': opens from its tool, AUTO-PAUSES, PAUSED pill on; the home selection is CLEARED and Frost Ridge becomes the room context on the mini-map', s.paused && pill && (await isVisible(page, '.room[data-room="' + room + '"]')) && s.sel === null && !s.banner && s.ctx === 'frost' && s.miniSel.every(x => x === 'frost') && /Frost Ridge/.test(await text(page, '.room[data-room="' + room + '"] .mm-name')), { s, pill });
    check(tag + ' ' + room + ': FLOATS OVER THE WORLD: Planet View stays mounted and visible underneath (not hidden), blurred and dimmed, inert and aria-hidden; the room layer is translucent and the room itself has no opaque background', !b.planetHidden && b.planetInert && b.planetAria === 'true' && /blur\(/.test(b.planetFilter) && /blur\(/.test(b.hudFilter) && /rgba\(.*, 0\.\d+\)$/.test(b.roomsBg) && /rgba\(0, 0, 0, 0\)|transparent/.test(b.roomBg), b);
    const pt = await page.evaluate(() => { const svg = document.querySelector('#mapwrap svg'); const r = svg.getBoundingClientRect(); return { x:r.left + r.width * .55, y:r.top + r.height * .55 }; });
    const over = await page.evaluate(p => { const el = document.elementFromPoint(p.x, p.y); return el ? (el.closest('#rooms') ? 'rooms' : el.closest('#planet') ? 'planet' : el.tagName) : 'none'; }, pt);
    const sBefore = await st(page); await page.mouse.click(pt.x, pt.y); await wait(200); const sAfter = await st(page);
    check(tag + ' ' + room + ': a click where the blurred world shows through hits the room layer, not the planet: selection and room context unchanged', over === 'rooms' && sAfter.sel === sBefore.sel && sAfter.ctx === sBefore.ctx && sAfter.room === room, { over, sBefore, sAfter });
    check(tag + ' ' + room + ': no horizontal scroll, no console errors', (await noHScroll(page)) && page._errs.length === 0, page._errs.slice(0, 2));
    check(tag + ' ' + room + ': header names the room and offers Planet, four room links, Resume play', (await text(page, '.room[data-room="' + room + '"] h2')).length > 2 && (await page.$$('.room[data-room="' + room + '"] [data-room-go]')).length === 4 && (await isVisible(page, '.room[data-room="' + room + '"] [data-act="resume"]')) && (await isVisible(page, '.room[data-room="' + room + '"] [data-act="back"]')));
    check(tag + ' ' + room + ': CONTENT-HEIGHT side boxes: the lower-left info box and the right-hand context box are exactly as tall as their content (no slack inside, not stretched to the bottom); the right column is a mini-map box plus its own context box (one box in Region Inspect)', (room === 'region' ? !b.ctxSeparate : b.ctxSeparate && b.ctx.bottom <= b.zoneBottom + 1 && Math.abs(b.ctx.slack) <= 6) && b.info && (Math.abs(b.info.slack) <= 6 || b.info.scrolls) && b.info.bottom <= b.zoneBottom + 1, b);
    const mmSel = '.room[data-room="' + room + '"] .mm-map';
    check(tag + ' ' + room + ': has a smaller interactive map in the right column', await isVisible(page, mmSel + ' svg.bm-map'));
    if (room !== 'terraform') { const sr = await stripRows(page, room); check(tag + ' ' + room + ': THREE ordinary region pills fit across the right column strip (first row = 3 chips, with slack)', sr.row1 === 3 && sr.slack >= 0, sr); if (main && room === 'adapt') { const cb = await page.$eval('.room[data-room="adapt"] .z-map', e => { const r = e.getBoundingClientRect(); return { x:Math.round(r.x) - 6, y:Math.round(r.y) - 6, width:Math.round(r.width) + 12, height:Math.round(r.height) + 12 }; }); await shot(page, '08-three-pills-across.png', cb); } }
    await clickRegion(page, 'dust', mmSel); await wait(250); s = await st(page);
    check(tag + ' ' + room + ': clicking Dust Reach on the mini-map changes the ROOM context only (home selection stays empty)', s.ctx === 'dust' && s.sel === null && /Dust Reach/.test(await text(page, '.room[data-room="' + room + '"] .mm-name')), s);
    const hp = await regionPoint(page, 'salt', mmSel);
    if (hp) { await page.mouse.move(hp.x, hp.y); await wait(200); }
    const peekOn = !!hp && /Salt Flats/.test(await text(page, '.room[data-room="' + room + '"] .mm-peek'));
    await page.mouse.move(2, 2); await wait(150);
    check(tag + ' ' + room + ': hovering Salt Flats on the mini-map peeks its status; moving away resets the peek', peekOn && !/Salt Flats/.test(await text(page, '.room[data-room="' + room + '"] .mm-peek')));
    const mlb = await hoverEl(page, '.room[data-room="' + room + '"] .mm-lens [data-lens="hazard"]'); const mH = await st(page); await page.mouse.move(2, 2); await wait(150); const mL = await st(page);
    await page.mouse.click(mlb.x + mlb.width / 2, mlb.y + mlb.height / 2); await wait(150); const mC = await st(page); await page.click('.room[data-room="' + room + '"] .mm-lens [data-lens=""]'); await wait(100);
    check(tag + ' ' + room + ': mini-map Map View chips: hover previews Hazard, leaving restores, click sets', mH.lensPv === 'hazard' && mH.miniLens.every(x => x === 'hazard') && mL.miniLens.every(x => x === null) && mC.lens === 'hazard' && (await st(page)).lens === null, { mH, mL, mC });
    if (room !== 'region') {
      const t = await treeStats(page, room); trees[room] = t;
      check(tag + ' ' + room + ': renders a tree (' + t.kind + ': ' + t.nodes + ' nodes, ' + t.edges + ' edges), no node collisions, nodes inside the tree area', t.nodes >= 8 && t.edges >= 7 && t.overlaps === 0 && t.outside === 0, t);
      if (room !== 'terraform') {
        check(tag + ' ' + room + ': plant upper-left, info lower-left, tree centre, mini-map right; one leader lane per category, never crossing, each with a label plate', t.zones.every(Boolean) && t.leaders === (room === 'adapt' ? 4 : 3) && t.leadersOrdered && t.plates === t.leaders, t);
        check(tag + ' ' + room + ': leaders are noticeably thicker (stroke ≥ 3 px idle; Concept 15 was 2.2)', t.leaderW >= 3, { leaderW:t.leaderW });
        const cc = await catColours(page, room); results.colours[tag + ':' + room] = cc;
        const cats = Object.keys(cc); const consistent = cats.every(c => { const v = cc[c]; return v.label === v.node && v.node === v.glow && v.port === v.anchor && v.anchor === v.labelInk; }); const distinct = new Set(cats.map(c => cc[c].label)).size === cats.length;
        check(tag + ' ' + room + ': category colours: each category uses ONE colour on its label border, node accent and leader glow (and one darker shade on label ink, port and anchor); ' + cats.length + ' categories, all distinct', cats.length === (room === 'adapt' ? 4 : 3) && consistent && distinct, cc);
      }
      const host = '.room[data-room="' + room + '"]';
      const nodeId = room === 'adapt' ? 'cold' : room === 'spread' ? 'waterSeeds' : 'warm';
      const before = await specParts(page, host); const infoBefore = await text(page, host + ' .lf-info');
      const sceneBefore = room === 'terraform' ? await page.$eval(host + ' .scene stop', e => e.getAttribute('stop-color')) : '';
      await hoverEl(page, host + ' .node[data-node="' + nodeId + '"]');
      const after = await specParts(page, host);
      const pv = await page.evaluate(([host, room]) => { const r = document.querySelector(host); const tint = r.querySelector('.mm-map .tint'); const info = r.querySelector('.lf-info'); return { infoPv:info.classList.contains('pv'), infoCat:info.dataset.cat || '', infoBorder:getComputedStyle(info).borderColor, info:info.textContent.replace(/\s+/g, ' ').trim(), open:r.querySelectorAll('.mm-map .pv-open').length, arcs:r.querySelectorAll('.mm-map .seedarc').length, tint:+tint.getAttribute('opacity'), previewing:!!r.querySelector('.bm-spec.previewing'), glow:[...new Set([...r.querySelectorAll('.bm-spec [data-f].glow')].map(n => n.dataset.f))], ldOn:r.querySelectorAll('.leaders .ld.on').length, ldOnW:r.querySelector('.leaders .ld.on') ? parseFloat(getComputedStyle(r.querySelector('.leaders .ld.on')).strokeWidth) : 0, plateOn:r.querySelectorAll('.leaders .aplate.on').length, glowOn:r.querySelector('.leaders .lead-g.on .ld-glow') ? +getComputedStyle(r.querySelector('.leaders .lead-g.on .ld-glow')).opacity : 0, ctx:(r.querySelector('.mm-ctx') || {}).textContent || '', ctxCat:(r.querySelector('.mm-ctx') || { dataset:{} }).dataset.cat || '', scenePv:!!r.querySelector('.scene.pv'), sceneStop:r.querySelector('.scene stop') ? r.querySelector('.scene stop').getAttribute('stop-color') : '', globeOpen:[...r.querySelectorAll('.globe .land.open')].map(e => e.dataset.r), globePv:!!r.querySelector('.globe.pv'), readout:(r.querySelector('.e-tp') || {}).textContent || '', specimens:r.querySelectorAll('.bm-spec').length, leadOn:r.querySelectorAll('.edges .edge.lead.on').length, ringOn:r.querySelectorAll('.edges .ring.on').length, pinOn:r.querySelectorAll('.edges .pin.on').length, catLabel:r.querySelector('.tree .cat-l[data-cat]') ? getComputedStyle(r.querySelector('.tree .node.pv')).borderLeftColor : '' }; }, [host, room]);
      if (room === 'adapt') check(tag + ' adapt: hovering Cold Tolerance previews on the PLANT, explains it in the LEFT info block (coloured Temperature), lights the Stem leader THICK (≥ 5 px) with a glow and a filled plate, marks regions on the mini-map and colours the region-effect box', after.plant !== before.plant && after.env === before.env && pv.previewing && pv.glow.includes('temp') && pv.infoPv && pv.infoCat === 'Temperature' && pv.infoBorder === pv.catLabel && /Cold Tolerance/.test(pv.info) && /120 Biomass/.test(pv.info) && /Changes Stem/i.test(pv.info) && pv.ldOn === 1 && pv.ldOnW >= 5 && pv.plateOn === 1 && pv.glowOn > 0 && pv.open >= 1 && /Opens .*Frost Ridge/.test(pv.ctx) && pv.ctxCat === 'Temperature', { plantChanged:after.plant !== before.plant, envChanged:after.env === before.env, pv:Object.assign({}, pv, { info:pv.info.slice(0, 80) }) });
      if (room === 'spread') check(tag + ' spread: hovering Waterborne Seeds previews on the plant, explains it in the left block (coloured Reach), lights the Pods leader thick with a plate and draws dispersal arcs on the mini-map', after.plant !== before.plant && after.env === before.env && pv.glow.includes('spread') && pv.infoPv && pv.infoCat === 'Reach' && /Waterborne Seeds/.test(pv.info) && /Changes Pods/i.test(pv.info) && pv.ldOn === 1 && pv.ldOnW >= 5 && pv.plateOn === 1 && pv.arcs >= 1 && /Tide Isle/.test(pv.ctx), { arcs:pv.arcs, glow:pv.glow, ldOn:pv.ldOn, ldOnW:pv.ldOnW, info:pv.info.slice(0, 80) });
      if (room === 'terraform') check(tag + ' terraform: hovering Warm the Sky changes the LAND SCENE, the GLOBE and the mini-map tint, lights its leader and its RING on the atmosphere halo, shows 14 → 20 °C in the readout and explains it in the left block; there is no plant drawing in the room', pv.scenePv && pv.sceneStop !== sceneBefore && pv.globePv && pv.globeOpen.length >= 1 && pv.tint > 0 && pv.open >= 1 && /20 °C/.test(pv.readout) && pv.infoPv && /Warm the Sky/.test(pv.info) && /not the plant/i.test(pv.info) && pv.specimens === 0 && pv.leadOn === 1 && pv.ringOn === 1 && pv.pinOn === 0, { sceneBefore, pv:Object.assign({}, pv, { info:pv.info.slice(0, 80) }) });
      if (main) await shot(page, room === 'adapt' ? '04-adapt-hover.png' : room === 'spread' ? '05-spread-hover.png' : '06-terraform-hover.png');
      if (!rm && !engine && vp[0] !== 1280 && (room === 'adapt' || room === 'terraform')) await shot(page, (vp[0] === 1024 ? (room === 'adapt' ? '09' : '10') : (room === 'adapt' ? '11' : '12')) + '-' + vp[0] + '-' + room + '.png');
      /* HOVER RESET: move onto EMPTY tree space (still inside the tree box): the preview must clear at once */
      const empty = await page.$eval(host + ' .tree', e => { const r = e.getBoundingClientRect(); return { x:r.left + 10, y:r.top + 10 }; });
      await page.mouse.move(empty.x, empty.y); await wait(250);
      const onEmpty = await page.evaluate(([h, p]) => { const el = document.elementFromPoint(p.x, p.y); const r = document.querySelector(h); return { overNode:!!(el && el.closest('.node')), inTree:!!(el && el.closest('.tree')), infoPv:r.querySelector('.lf-info').classList.contains('pv'), pvOpen:r.querySelectorAll('.mm-map .pv-open, .mm-map .seedarc').length, previewing:!!r.querySelector('.bm-spec.previewing'), scenePv:!!r.querySelector('.scene.pv'), hovered:ROOMS24.rooms[r.dataset.room].tree.hovered, nodePv:r.querySelectorAll('.tree .node.pv').length, ldOn:r.querySelectorAll('.leaders .ld.on, .leaders .aplate.on, .edges .ring.on, .edges .pin.on').length }; }, [host, empty]);
      const restored = await specParts(page, host); const infoAfter = await text(page, host + ' .lf-info');
      check(tag + ' ' + room + ': HOVER RESET: moving from the node onto empty tree space (pointer still inside the tree box) restores the visual, the left info block, the mini-map, the leaders and the node state at once', !onEmpty.overNode && onEmpty.inTree && !onEmpty.infoPv && onEmpty.pvOpen === 0 && !onEmpty.previewing && !onEmpty.scenePv && onEmpty.hovered === null && onEmpty.nodePv === 0 && onEmpty.ldOn === 0 && restored.plant === before.plant && restored.env === before.env && infoAfter === infoBefore, { onEmpty, infoBefore:infoBefore.slice(0, 50), infoAfter:infoAfter.slice(0, 50) });
      await page.mouse.move(2, 2); await wait(200);
      check(tag + ' ' + room + ': leaving the tree altogether also leaves everything restored', (await page.evaluate(h => document.querySelector(h + ' .mm-map .pv-open, ' + h + ' .mm-map .seedarc') === null && !document.querySelector(h + ' .lf-info').classList.contains('pv'), host)));
      if (room === 'terraform') {
        // structure: two banks left / right of the globe, not a full orbit; halo around the globe
        const soil = t.banks.filter(n => n.cat === 'Ground'), atmo = t.banks.filter(n => n.cat !== 'Ground');
        const ys = a => a.map(n => n.y); const span = a => Math.max(...ys(a)) - Math.min(...ys(a));
        check(tag + ' terraform: SOIL bank (Ground, ' + soil.length + ' nodes) sits LEFT of the globe and the ATMOSPHERE bank (Air / Sky temperature / Rain, ' + atmo.length + ' nodes) sits RIGHT; both spread north / south (vertical span > globe diameter) and no node sits over the poles (every node is at least 0.6 R from the vertical axis): a C and a reversed C, not an orbit', soil.length >= 4 && atmo.length >= 7 && soil.every(n => n.x < -t.R * .6) && atmo.every(n => n.x > t.R * .6) && span(soil) > t.R * 1.6 && span(atmo) > t.R * 2.4 && span(atmo) > span(soil), { R:Math.round(t.R), soil:soil.map(n => [n.id, Math.round(n.x), Math.round(n.y)]), atmo:atmo.map(n => [n.id, Math.round(n.x), Math.round(n.y)]) });
        check(tag + ' terraform: the atmosphere HALO is a dotted ring AROUND the globe (radius larger than the globe, no fill over its face), and Soil leaders end in surface pins while Atmosphere leaders end in halo rings', !!t.halo && t.halo.r > t.R + 4 && (t.halo.fill === 'none' || /rgba\(0, 0, 0, 0\)/.test(t.halo.fill)) && (await page.evaluate(h => ({ pins:document.querySelectorAll(h + ' .edges .pin').length, rings:document.querySelectorAll(h + ' .edges .ring').length }), host)).pins === 2 && (await page.evaluate(h => document.querySelectorAll(h + ' .edges .ring').length, host)) === 5, t.halo);
        if (main) await shot(page, '07-terraform-structure.png');
        const g = await page.$(host + ' .globe'); const gb = await g.boundingBox(); const rot0 = await page.evaluate(() => ROOMS24.rooms.terraform.globe.rot);
        await page.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2); await page.mouse.down(); await page.mouse.move(gb.x + gb.width / 2 + 140, gb.y + gb.height / 2, { steps:7 }); await page.mouse.up(); await wait(120);
        const rot1 = await page.evaluate(() => ROOMS24.rooms.terraform.globe.rot);
        await g.focus(); await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowLeft'); const rot2 = await page.evaluate(() => ROOMS24.rooms.terraform.globe.rot);
        check(tag + ' terraform: the globe still spins by click-drag and by arrow keys', rot1 > rot0 + .5 && rot2 < rot1 && page._errs.length === 0, { rot0, rot1, rot2 });
        await page.mouse.move(2, 2);
      }
      if (room === 'spread' && main) await shot(page, '14-overlay-world-behind.png');
    } else {
      const conds = (await page.$$('.room[data-room="region"] .cond')).length;
      await page.click('#tab-colony'); await wait(150); const tabOk = (await isVisible(page, '#pane-colony')) && !(await isVisible(page, '#pane-overview')); await page.click('#tab-overview');
      const tabH = await page.$eval('#tab-overview', e => e.getBoundingClientRect().height);
      check(tag + ' region: four condition rows, limiting factor, large Overview / Colony / Science tabs (≥ 44 px at 1280), plant upper-left, colony info lower-left, mini-map right; the main box is content-height', conds === 4 && tabOk && tabH >= (vp[0] >= 1280 ? 44 : 36) && (await isVisible(page, '.room[data-room="region"] .limit')) && (await isVisible(page, '.room[data-room="region"] .lf-top .bm-spec')) && (await isVisible(page, '.room[data-room="region"] .lf-info')) && b.main.bottom < b.zoneBottom - 20, { conds, tabOk, tabH, main:b.main, zoneBottom:b.zoneBottom });
      if (main) await shot(page, '03-region-inspect.png');
    }
    if (room === 'adapt') {
      await page.click('.room[data-room="adapt"] [data-room-go="terraform"]'); await wait(300); s = await st(page);
      check(tag + ': Adapt → Terraform link switches rooms without leaving the paused mode or changing the room context', (await isVisible(page, '.room[data-room="terraform"]')) && !(await isVisible(page, '.room[data-room="adapt"]')) && s.paused && s.ctx === 'dust', s);
    }
    await page.keyboard.press('Escape'); await wait(300); s = await st(page);
    check(tag + ' ' + room + ': Escape returns to Planet View (planet un-blurred, not inert), RESUMES the clock and leaves NO region selected', !s.room && !s.paused && s.sel === null && !s.banner && (await isVisible(page, '#mapwrap svg')) && (await page.evaluate(() => map.selected === null && !document.getElementById('planet').inert && getComputedStyle(document.getElementById('planet')).filter === 'none')), s);
    check(tag + ' ' + room + ': the main map has exactly the same geometry after the room as before (no reframing)', same(r0, await mapRect(page)), r0);
  }
  results.trees[tag] = trees;
  check(tag + ': Adapt and Spread share the room family (same tree kind, same zones, same em scale)', trees.adapt.kind === trees.spread.kind && trees.adapt.zones.join() === trees.spread.zones.join() && trees.adapt.em === trees.spread.em, { adapt:trees.adapt.kind, spread:trees.spread.kind });
  check(tag + ': Terraform uses the distinct BANKS tree design (k-banks) around the globe', trees.terraform.kind === 'k-banks' && trees.adapt.kind === 'k-anat', { terraform:trees.terraform.kind });
  check(tag + ': Spread stays COMPACT: its tree box is at least 80 px shorter than Adapt\'s (content height) and ends above the room bottom', bx.spread.main.height <= bx.adapt.main.height - 80 && bx.spread.main.bottom < bx.spread.zoneBottom - 40, { adapt:bx.adapt.main, spread:bx.spread.main, zoneBottom:bx.spread.zoneBottom });
  results.scale[tag] = { em:bx.adapt.em, by:(await st(page)).emBy };
  // click commits: a fake buy persists after the pointer leaves
  await page.click('[data-tool="adapt"]'); await wait(500);
  const host = '.room[data-room="adapt"]'; const base0 = await specParts(page, host); const bio0 = await page.evaluate(() => BM.store.s.biomass);
  const nb = await hoverEl(page, host + ' .node[data-node="cold"]'); await page.mouse.click(nb.x + nb.width / 2, nb.y + nb.height / 2); await wait(300);
  const stillHover = await page.evaluate(h => ({ owned:document.querySelector(h + ' .node[data-node="cold"]').classList.contains('st-owned'), info:document.querySelector(h + ' .lf-info').textContent.replace(/\s+/g, ' ') }), host);
  await page.mouse.move(2, 2); await wait(300);
  const base1 = await specParts(page, host); const afterLeave = await page.evaluate(h => ({ owned:document.querySelector(h + ' .node[data-node="cold"]').classList.contains('st-owned'), info:document.querySelector(h + ' .lf-info').textContent.replace(/\s+/g, ' '), pv:document.querySelector(h + ' .lf-info').classList.contains('pv'), biomass:BM.store.s.biomass }), host);
  check(tag + ': CLICK COMMITS: clicking Cold Tolerance buys it (fake): the node is Owned while still hovered, and after the pointer leaves it stays Owned, the plant keeps the trait, the base info lists it and Biomass dropped by 120', stillHover.owned && /Owned/.test(stillHover.info) && afterLeave.owned && !afterLeave.pv && /Cold Tolerance/.test(afterLeave.info) && base1.plant !== base0.plant && Math.abs(bio0 - afterLeave.biomass - 120) < 1, { bio0, stillHover:Object.assign({}, stillHover, { info:stillHover.info.slice(0, 60) }), afterLeave:Object.assign({}, afterLeave, { info:afterLeave.info.slice(0, 160) }) });
  await page.keyboard.press('Escape'); await wait(300);
  // exits
  await page.click('[data-tool="spread"]'); await wait(300); await page.click('.room[data-room="spread"] [data-act="resume"]'); await wait(250);
  check(tag + ': Resume play closes the room and runs the clock', await page.evaluate(() => document.getElementById('rooms').hidden && !BM.clock.paused));
  await page.click('#ckPause'); await wait(100); await page.click('[data-tool="terraform"]'); await wait(300); await page.click('.room[data-room="terraform"] [data-act="back"]'); await wait(250);
  check(tag + ': Back from a run that was already paused stays paused', await page.evaluate(() => document.getElementById('rooms').hidden && BM.clock.paused));
  await page.click('#ckPause'); await wait(100);
  // keyboard: focus previews, moving focus away resets; the blurred planet is unreachable
  await page.focus('[data-tool="adapt"]'); await page.keyboard.press('Enter'); await wait(400);
  await page.evaluate(() => ROOMS24.rooms.adapt.tree.focusNode('heat')); await wait(200);
  const fPv = await page.evaluate(() => ({ hovered:ROOMS24.rooms.adapt.tree.hovered, infoPv:document.querySelector('.room[data-room="adapt"] .lf-info').classList.contains('pv') }));
  await page.evaluate(() => document.querySelector('.room[data-room="adapt"] [data-act="back"]').focus()); await wait(200);
  const fOff = await page.evaluate(() => ({ hovered:ROOMS24.rooms.adapt.tree.hovered, infoPv:document.querySelector('.room[data-room="adapt"] .lf-info').classList.contains('pv') }));
  check(tag + ': keyboard: focusing a node previews it; moving focus out of the tree resets the preview', fPv.hovered === 'heat' && fPv.infoPv && fOff.hovered === null && !fOff.infoPv, { fPv, fOff });
  await page.focus('.room[data-room="adapt"] h2');
  const walk = await tabWalk(page, 30); await page.keyboard.press('Escape'); await wait(300);
  const focusBack = await page.evaluate(() => document.activeElement && document.activeElement.dataset.tool === 'adapt');
  check(tag + ': keyboard: 30 Tabs stay inside the room with visible focus (the blurred Planet View is inert), Escape returns focus to the Adapt tool', walk.bad.length === 0 && walk.outside.length === 0 && walk.count >= 20 && focusBack, { bad:walk.bad.slice(0, 3), outside:walk.outside.slice(0, 3), count:walk.count, focusBack });
  // deep link
  await page.goto(url(PAGE) + '?room=adapt&region=frost'); await wait(600); s = await st(page);
  check(tag + ': deep link ?room=adapt&region=frost opens Adapt paused with Frost Ridge as the room context and nothing selected at home', s.paused && s.room === 'adapt' && s.ctx === 'frost' && s.sel === null, s);
  const em = await emojiScan(page); results.icons[tag] = em;
  check(tag + ': no emoji anywhere on the page; inline SVG icons in use (' + em.svgIcons + ')', em.hits.length === 0 && em.svgIcons >= 40, em);
  check(tag + ': no console errors over the whole run', page._errs.length === 0, page._errs.slice(0, 3));
  await ctx.close();
}

async function runSizes(browser){
  const sizes = async (file, cls) => { const { ctx, page } = await newPage(browser, [1280, 800]); await page.goto(url(file) + '?room=adapt&region=frost'); await wait(700); const r = await page.evaluate(cls => { const q = s => document.querySelector(cls + ' ' + s); const fs = e => e ? parseFloat(getComputedStyle(e).fontSize) : 0; const h = e => e ? e.getBoundingClientRect().height : 0; const w = e => e ? e.getBoundingClientRect().width : 0; const node = q('.node[data-node="cold"]'); return { em:fs(document.querySelector(cls)), nodeName:fs(node && node.querySelector('.nt b')), nodeW:Math.round(w(node)), nodeIcon:Math.round(w(node && node.querySelector('.ni'))), roomTab:fs(q('.rn')), roomTabH:Math.round(h(q('.rn'))), chip:fs(q('.rc')), chipH:Math.round(h(q('.rc'))), h2:fs(q('h2')), mmName:fs(q('.mm-name')), catLabel:fs(q('.cat-l')), lensChip:fs(q('.mm-lens .lb')), infoText:fs(q('.lf-info p')), infoTitle:fs(q('.lf-info .li-h b')), leaderW:parseFloat(getComputedStyle(q('.leaders .ld')).strokeWidth) }; }, cls); await ctx.close(); return r; };
  const c15 = await sizes(PREV, '.r-adapt'), c16 = await sizes(PAGE, '.r-adapt'); results.sizes = { c15, c16 };
  const keys = ['em', 'nodeName', 'nodeIcon', 'roomTab', 'roomTabH', 'chip', 'chipH', 'h2', 'mmName', 'catLabel', 'lensChip', 'infoText', 'infoTitle'];
  const bigger = keys.filter(k => c16[k] >= c15[k] * 1.08);
  check('sizing: at 1280×800 the Concept 16 room UI is measurably larger than Concept 15 (room em, node name, node icon, room tabs, chips, title, mini-map name, category label, lens chips, info text and title all ≥ 8 % larger; leaders thicker)', bigger.length === keys.length && c16.leaderW > c15.leaderW, { c15, c16, bigger });
}

async function runGallery(browser){
  for (const vp of VIEWPORTS) {
    const { ctx, page } = await newPage(browser, vp);
    await page.goto(url('index.html')); await wait(400);
    check('gallery @' + vp.join('x') + ': defaults to Presentation refinement (BLOOM-024), no horizontal scroll, no console errors', (await page.$eval('[role="tab"][aria-selected="true"]', e => e.id)) === 'tab-c16' && (await noHScroll(page)) && page._errs.length === 0, page._errs.slice(0, 2));
    if (vp[0] === 1280) {
      await shot(page, '00-gallery-c16.png');
      const tabs = await page.$$eval('[role="tab"]', es => es.map(e => e.id));
      check('gallery: seven rounds in order', tabs.join(',') === 'tab-c16,tab-c15,tab-rooms,tab-refinement,tab-convergence,tab-round2,tab-round1', tabs);
      const links = await page.$$eval('#panel-c16 a.open', es => es.map(e => e.getAttribute('href')));
      check('gallery: Presentation refinement launches Concept 16 only', links.join(',') === PAGE, links);
      const hiddenTabbable = await page.$$eval('.round[hidden] a, .round[hidden] button', es => es.filter(e => e.offsetParent !== null).length);
      check('gallery: hidden tabs’ links not visible / tabbable', hiddenTabbable === 0);
      await page.focus('#tab-c16'); const order = [];
      for (let k = 0; k < 7; k++) { await page.keyboard.press('ArrowRight'); order.push(await page.$eval('[role="tab"][aria-selected="true"]', e => e.id.slice(4))); }
      check('gallery tabs: arrow keys walk c15 → rooms → refinement → convergence → round2 → round1 → c16 (wrap)', order.join(',') === 'c15,rooms,refinement,convergence,round2,round1,c16', order);
      const all = [];
      for (const t of ['c16', 'c15', 'rooms', 'refinement', 'convergence', 'round2', 'round1']) { await page.goto(url('index.html') + '#' + t); await wait(200); all.push(...await page.$$eval('.round:not([hidden]) a.open', es => es.map(e => e.getAttribute('href')))); }
      const uniq = [...new Set(all)];
      check('gallery: 16 concept pages linked across the seven tabs (Concepts 1–16 reachable)', uniq.length === 16 && uniq.includes(PAGE) && uniq.includes(PREV), uniq);
      const bad = [];
      for (const h of uniq) { const { ctx:c2, page:p2 } = await newPage(browser, [1280, 800]); await p2.goto(url(h)); await wait(500); if (p2._errs.length || !(await isVisible(p2, '.mock-ribbon'))) bad.push({ h, errs:p2._errs.slice(0, 2) }); await c2.close(); }
      check('gallery: all 16 concept pages load with the mockup ribbon and no console errors (Concepts 1–15 regression)', bad.length === 0, bad);
      await page.goto(url('index.html')); await page.evaluate(() => { try { localStorage.setItem('bloomMockTab23', 'round1'); localStorage.removeItem('bloomMockTab24'); } catch (e) {} }); await page.reload(); await wait(300);
      check('gallery: an old BLOOM-023 remembered tab does not hide the new default', (await page.$eval('[role="tab"][aria-selected="true"]', e => e.id)) === 'tab-c16');
    }
    await ctx.close();
  }
}

function staticChecks(){
  const files = ['c16.js', 'c16.css', PAGE].map(f => path.join(DIR, f));
  const banned = /bloom-sim|resources\/|planets\/|content\/|scenario|validator|generator|\bbalance\b|Bloom Report|bloom-report|fetch\(|XMLHttpRequest|import\s|require\(/i;
  const hits = [];
  files.forEach(f => { const s = fs.readFileSync(f, 'utf8'); s.split('\n').forEach((l, i) => { if (banned.test(l) && !/^\s*(\/\/|\*|\/\*|<!--|  )/.test(l) && !/VISUAL|Nothing here|never loads|not connected|Nothing in|validators, scenarios|balance data|Bloom Report\./.test(l)) hits.push(path.basename(f) + ':' + (i + 1) + ' ' + l.trim().slice(0, 80)); }); });
  check('isolation: c16.js / c16.css / the Concept 16 page contain no engine, generator, validator, scenario, balance, Bloom Report or network references outside comments', hits.length === 0, hits.slice(0, 5));
  const scripts = fs.readFileSync(path.join(DIR, PAGE), 'utf8').match(/<script src="([^"]+)"/g).join(' ');
  check('isolation: the Concept 16 page loads only shared.js and c16.js', scripts === '<script src="shared.js" <script src="c16.js"', scripts);
  const emojiFiles = files.filter(f => EMOJI.test(fs.readFileSync(f, 'utf8')));
  check('icons: no emoji characters in c16.js, c16.css or the Concept 16 page', emojiFiles.length === 0, emojiFiles.map(f => path.basename(f)));
  let gs = ''; try { gs = cp.execSync('git status --porcelain -- index.html resources content planets tools GAME_BIBLE.md demos/ui-mockups/shared.js demos/ui-mockups/shared.css demos/ui-mockups/rooms.js demos/ui-mockups/rooms.css demos/ui-mockups/r2.js demos/ui-mockups/r2.css demos/ui-mockups/c9.js demos/ui-mockups/c9.css demos/ui-mockups/c10.js demos/ui-mockups/c10.css demos/ui-mockups/c15.js demos/ui-mockups/c15.css "demos/ui-mockups/concept-1*.html" demos/ui-mockups/concept-[2-9]-*.html', { cwd:ROOT }).toString().trim(); } catch (e) { gs = 'git unavailable'; }
  gs = gs.split('\n').filter(l => l && !/concept-16/.test(l)).join('\n');
  check('scope: repository-root index.html, gameplay folders, shared mockup files, rooms.js / rooms.css, c15.js / c15.css and Concepts 1–15 are untouched (git status)', gs === '', gs);
}

(async () => {
  staticChecks();
  const browser = await chromium.launch();
  console.log('gallery…'); await runGallery(browser);
  console.log('sizes…'); await runSizes(browser);
  for (const vp of VIEWPORTS) { console.log('concept 16', vp.join('x')); await runConcept(browser, vp, false); }
  console.log('concept 16 reduced motion'); await runConcept(browser, [1280, 800], true);
  await browser.close();
  if (process.argv.includes('--firefox')) { const fb = await firefox.launch(); console.log('concept 16 firefox'); await runConcept(fb, [1280, 800], false, 'firefox'); await fb.close(); }
  // proportional shrink / growth: the room em follows the window width (pill calibration) at all three target sizes
  const e1280 = results.scale['c16@1280x800'], e1024 = results.scale['c16@1024x768'], e1440 = results.scale['c16@1440x900'];
  check('scale: the room shrinks and grows PROPORTIONALLY with the window width: em(1024) / em(1280) ≈ 0.80 and em(1440) / em(1280) ≈ 1.125 (± 3 %), all three calibrated by pill fit, and em(1280) ≥ 17 px (Concept 15: 16 px)', e1280 && e1024 && e1440 && Math.abs(e1024.em / e1280.em - .8) < .03 && Math.abs(e1440.em / e1280.em - 1.125) < .03 && [e1280, e1024, e1440].every(e => e.by === 'pills') && e1280.em >= 17, { e1280, e1024, e1440 });
  check('no external network requests', results.external.length === 0, results.external.slice(0, 5));
  results.summary = { total:results.checks.length, failed:fails };
  fs.writeFileSync(path.join(OUT, 'qa-results.json'), JSON.stringify(results, null, 1));
  console.log((fails ? 'FAIL' : 'PASS') + ' — ' + (results.checks.length - fails) + '/' + results.checks.length + ' checks');
  for (const k of Object.keys(results.scale)) console.log('scale', k, JSON.stringify(results.scale[k]));
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
