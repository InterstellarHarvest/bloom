#!/usr/bin/env node
/*
  BLOOM-022 QA driver for the UI concept sandbox (demos/ui-mockups/): Concepts 11–14, "Planet View + paused decision rooms".
  VISUAL MOCKUPS ONLY. This checks the sandbox pages, not the game. Needs Playwright (Chromium; Firefox with --firefox):
    NODE_PATH="$(npm root -g)" node docs/evidence/bloom-022/qa-ui-mockups-rooms.js [--shots] [--firefox]
  Writes docs/evidence/bloom-022/qa-results.json (+ screenshots with --shots). Exit code 1 on any failed check.

  What is verified, per concept × viewport (1280×800, 1024×768, 1440×900), plus reduced motion and Firefox:
    gallery reaches Concepts 1–14 and defaults to the Decision rooms tab · each concept loads with no console errors, no external
    requests, no horizontal scroll · main-map selection · every room opens from its tool, AUTO-PAUSES the fake clock and shows the
    PAUSED state · the main map keeps the same geometry across open / close (measured) · every room's mini-map is interactive
    (click re-targets "Considering for" and the main selection, hover peeks) · Adapt / Spread / Terraform each render a tree
    (nodes + edges) · hovering a node previews on the right thing (Adapt: plant layer changes, environment layer does not;
    Terraform: environment changes, plant layer does not; Spread: dispersal arcs) · room → room links keep the pause · Back
    restores the clock, Resume play runs it, Back from a paused run stays paused · Escape closes and returns focus · keyboard walk
    inside a room stays inside it with visible focus · no emoji anywhere in the concept pages (Extended_Pictographic scan) ·
    isolation: the new files reference only shared.js / shared.css and never the engine, generator, validators, scenarios,
    balance or Bloom Report · repository-root index.html and gameplay folders are untouched (git status).
*/
'use strict';
const path = require('path'), fs = require('fs'), cp = require('child_process');
const { chromium, firefox } = require('playwright');
const ROOT = path.resolve(__dirname, '../../..');
const DIR = path.join(ROOT, 'demos/ui-mockups');
const OUT = __dirname;
const SHOTS = process.argv.includes('--shots');
const url = f => 'file://' + path.join(DIR, f);
const CONCEPTS = { 11:'concept-11-balanced-rooms.html', 12:'concept-12-specimen-rooms.html', 13:'concept-13-world-control-rooms.html', 14:'concept-14-category-labs.html' };
const ROOMS = ['region', 'adapt', 'spread', 'terraform'];
const VIEWPORTS = [[1280, 800], [1024, 768], [1440, 900]];
const results = { when:new Date().toISOString(), checks:[], geometry:{}, trees:{}, icons:{}, external:[], errors:[] };
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
const noHScroll = page => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.body.scrollWidth <= innerWidth);
const isVisible = (page, sel) => page.$eval(sel, e => !e.closest('[hidden]') && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden').catch(() => false);
const text = (page, sel) => page.$eval(sel, e => e.textContent.replace(/\s+/g, ' ').trim()).catch(() => '');
const mapRect = page => page.$eval('#mapwrap svg', e => { const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height].map(v => Math.round(v)); });
const same = (a, b) => a.every((v, k) => Math.abs(v - b[k]) <= 1);
/* click a region on a given map SVG (main map or a room's mini-map) through the real hit-test */
async function clickRegion(page, id, scope){
  const pt = await page.evaluate(([id, scope]) => {
    const host = document.querySelector(scope);
    const rects = [...host.querySelectorAll('.rg[data-r="' + id + '"] rect')].map(r => r.getBoundingClientRect()).map(b => ({ x:b.x + b.width / 2, y:b.y + b.height / 2 }));
    for (const p of rects) { const el = document.elementFromPoint(p.x, p.y); const g = el && el.closest && el.closest('.rg'); if (g && g.dataset.r === id && host.contains(g)) return p; }
    return null;
  }, [id, scope]);
  if (!pt) throw new Error('region not clickable (covered or off-screen): ' + id + ' in ' + scope);
  await page.mouse.click(pt.x, pt.y);
  return pt;
}
async function hoverEl(page, sel){ const h = await page.$(sel); if (!h) throw new Error('no element ' + sel); const b = await h.boundingBox(); await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await wait(260); return b; }
/* plant vs environment layers of the newest specimen drawing inside `sel` */
const specParts = (page, sel) => page.$eval(sel, host => {
  const svg = host.querySelector('.bm-spec svg'); const ls = svg.querySelectorAll(':scope > g.layer'); const g = ls[ls.length - 1];
  const c = g.cloneNode(true); c.querySelectorAll('[data-f="env"]').forEach(n => n.remove()); c.querySelectorAll('.dim,.glow').forEach(n => n.classList.remove('dim', 'glow')); c.querySelectorAll('[class=""]').forEach(n => n.removeAttribute('class'));
  return { plant:c.innerHTML, env:g.querySelector('[data-f="env"]').innerHTML.replace(/sk[a-z0-9]{6}/g, '') };
});
async function tabWalk(page, n){
  const bad = [], seen = [], outside = [];
  for (let k = 0; k < n; k++) {
    await page.keyboard.press('Tab');
    const d = await page.evaluate(() => {
      const a = document.activeElement; if (!a || a === document.body) return null;
      const r = a.getBoundingClientRect(); const hiddenAnc = !!a.closest('[hidden]');
      let op = 1; for (let e = a; e && e.nodeType === 1; e = e.parentElement) op *= +getComputedStyle(e).opacity;
      const ring = a instanceof SVGElement ? 'svg' : getComputedStyle(a).outlineStyle;
      return { id:a.id || a.dataset.node || a.dataset.r || a.dataset.tool || a.dataset.roomGo || (a.textContent || '').trim().slice(0, 20), w:r.width, h:r.height, hiddenAnc, op:Math.round(op * 100) / 100, ring, inRooms:!!a.closest('#rooms'), inView:r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth };
    });
    if (!d) continue; seen.push(d);
    if (d.hiddenAnc || d.w < 1 || d.h < 1 || d.op < .5 || d.ring === 'none') bad.push(d);
    if (!d.inRooms) outside.push(d.id);
  }
  return { bad, outside, count:seen.length };
}
async function shot(page, name){
  if (!SHOTS) return;
  await page.evaluate(() => document.querySelectorAll('.toast').forEach(t => t.remove()));
  await wait(200);
  await page.screenshot({ path:path.join(OUT, name) });
}
const EMOJI = /\p{Extended_Pictographic}/u;
async function emojiScan(page){
  return page.evaluate(() => {
    const re = /\p{Extended_Pictographic}/u; const hits = [];
    const t = document.body.innerText || ''; const m = t.match(/\p{Extended_Pictographic}/gu); if (m) hits.push({ where:'innerText', chars:[...new Set(m)].slice(0, 6) });
    [...document.querySelectorAll('button, .st, .cat-l, .rk, .mm-k, .node, .lb, .rc')].forEach(e => { if (re.test(e.textContent)) hits.push({ where:(e.className || e.tagName).toString().slice(0, 30), chars:e.textContent.match(/\p{Extended_Pictographic}/gu).slice(0, 3) }); });
    return { hits:hits.slice(0, 5), svgIcons:document.querySelectorAll('svg.ic').length };
  });
}

async function runConcept(browser, id, vp, rm, engine){
  const tag = 'c' + id + '@' + vp.join('x') + (rm ? '+rm' : '') + (engine ? '+' + engine : '');
  const { ctx, page } = await newPage(browser, vp, rm ? { reducedMotion:'reduce' } : {});
  const f = CONCEPTS[id], shell = id === 11 ? 'chamber' : 'screen';
  await page.goto(url(f)); await wait(700);
  check(tag + ': loads (HUD, main map, tools, Pause / speed) with no console errors', (await isVisible(page, '#hud')) && (await isVisible(page, '#mapwrap svg')) && (await page.$$('#tools .tool, #cmd .tool')).length === 5 && (await isVisible(page, '#ckPause')) && page._errs.length === 0, page._errs.slice(0, 3));
  check(tag + ': Planet View no horizontal scroll', await noHScroll(page));
  check(tag + ': fake clock is running on Planet View', !(await page.evaluate(() => BM.clock.paused)));
  const r0 = await mapRect(page);
  await clickRegion(page, 'frost', '#mapwrap'); await wait(300);
  check(tag + ': clicking Frost Ridge on the main map selects it and shows the lightweight summary (no room opens)', (await page.evaluate(() => ROOMS22.state.sel)) === 'frost' && (await isVisible(page, '#rsum')) && (await page.evaluate(() => document.getElementById('rooms').hidden)), { sel:await page.evaluate(() => ROOMS22.state.sel) });
  await shot(page, 'c' + id + '-01-planet' + (vp[0] !== 1280 ? '-' + vp[0] : '') + (rm ? '-rm' : '') + (engine ? '-' + engine : '') + '.png');
  const trees = {};
  for (const room of ROOMS) {
    await page.click('[data-tool="' + room + '"]'); await wait(450);
    const paused = await page.evaluate(() => BM.clock.paused);
    const vis = await isVisible(page, '.room[data-room="' + room + '"]');
    const pill = await page.$eval('.room[data-room="' + room + '"] .paused', e => e.classList.contains('on') && getComputedStyle(e).opacity === '1').catch(() => false);
    const bg = await page.evaluate(sh => { const p = document.getElementById('planet'), h = document.getElementById('hud'); return sh === 'chamber' ? (p.hasAttribute('inert') && h.hasAttribute('inert') && !p.hidden) : (p.hidden && h.hidden); }, shell);
    check(tag + ' ' + room + ': opens from its tool, AUTO-PAUSES, shows the PAUSED pill, background ' + (shell === 'chamber' ? 'inert' : 'hidden'), paused && vis && pill && bg, { paused, vis, pill, bg });
    check(tag + ' ' + room + ': no horizontal scroll, no console errors', (await noHScroll(page)) && page._errs.length === 0, page._errs.slice(0, 2));
    check(tag + ' ' + room + ': header names the room and offers Planet, room links, Resume play', (await text(page, '.room[data-room="' + room + '"] h2')).length > 2 && (await page.$$('.room[data-room="' + room + '"] [data-room-go]')).length === 4 && (await isVisible(page, '.room[data-room="' + room + '"] [data-act="resume"]')) && (await isVisible(page, '.room[data-room="' + room + '"] [data-act="back"]')));
    // mini-map: present, click re-targets, hover peeks
    const mmSel = '.room[data-room="' + room + '"] .mm-map';
    check(tag + ' ' + room + ': has a smaller interactive map', await isVisible(page, mmSel + ' svg.bm-map'));
    await clickRegion(page, 'dust', mmSel); await wait(300);
    const after = await page.evaluate(() => ({ sel:ROOMS22.state.sel, main:map.selected }));
    check(tag + ' ' + room + ': clicking Dust Reach on the mini-map re-targets the room and the shared selection', after.sel === 'dust' && after.main === 'dust' && /Dust Reach/.test(await text(page, '.room[data-room="' + room + '"] .mm-name')), after);
    const hp = await page.evaluate(([id, scope]) => { const host = document.querySelector(scope); const r = [...host.querySelectorAll('.rg[data-r="' + id + '"] rect')].map(r => r.getBoundingClientRect()).find(b => { const el = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2); return el && el.closest('.rg') && el.closest('.rg').dataset.r === id; }); return r ? { x:r.x + r.width / 2, y:r.y + r.height / 2 } : null; }, ['salt', mmSel]);
    if (hp) { await page.mouse.move(hp.x, hp.y); await wait(200); }
    check(tag + ' ' + room + ': hovering Salt Flats on the mini-map peeks its status', !!hp && /Salt Flats/.test(await text(page, '.room[data-room="' + room + '"] .mm-peek')));
    await page.mouse.move(2, 2); await wait(100);
    if (room === 'region' && vp[0] === 1280 && !rm && !engine) await shot(page, 'c' + id + '-06-minimap-retarget.png');
    if (room !== 'region') {
      const t = await page.evaluate(room => { const tr = document.querySelector('.room[data-room="' + room + '"] .tree'); const nodes = [...tr.querySelectorAll('.node:not([hidden])')]; const boxes = nodes.map(n => n.getBoundingClientRect()); const host = tr.getBoundingClientRect();
        let overlaps = 0; for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) { const a = boxes[i], b = boxes[j]; const ix = Math.min(a.right, b.right) - Math.max(a.left, b.left), iy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top); if (ix > 24 && iy > 24) overlaps++; }   /* > 24 px both ways = text on text; smaller label-box corner touches are allowed */
        const outside = boxes.filter(b => b.left < host.left - 2 || b.right > host.right + 2 || b.top < host.top - 2 || b.bottom > host.bottom + 2).length;
        return { kind:[...tr.classList].find(c => c.startsWith('k-')), nodes:nodes.length, edges:tr.querySelectorAll('.edges path.edge').length, overlaps, outside, scrolls:tr.parentElement.scrollHeight > tr.parentElement.clientHeight + 2 }; }, room);
      trees[room] = t;
      check(tag + ' ' + room + ': renders a tree (' + t.kind + ': ' + t.nodes + ' nodes, ' + t.edges + ' edges), no node collisions (> 24 px), nodes inside the tree area', t.nodes >= 8 && t.edges >= 7 && t.overlaps === 0 && (t.outside === 0 || t.scrolls), t);
      // preview on the proper thing
      const host = '.room[data-room="' + room + '"]';
      const nodeId = room === 'adapt' ? 'cold' : room === 'spread' ? 'waterSeeds' : 'warm';
      const before = await specParts(page, host);
      await hoverEl(page, host + ' .node[data-node="' + nodeId + '"]');
      const after2 = await specParts(page, host);
      const pv = await page.evaluate(([host, room]) => { const r = document.querySelector(host); const tint = r.querySelector('.mm-map .tint'); return { text:r.querySelector('.mm-pv').textContent, on:r.querySelector('.mm-pv').classList.contains('on'), open:r.querySelectorAll('.mm-map .pv-open').length, arcs:r.querySelectorAll('.mm-map .seedarc').length, tint:+tint.getAttribute('opacity'), previewing:!!r.querySelector('.bm-spec.previewing'), glow:[...r.querySelectorAll('.bm-spec [data-f].glow')].map(n => n.dataset.f), dim:r.querySelectorAll('.bm-spec [data-f].dim').length, envTxt:(r.querySelector('.e-tp') || r.querySelector('.g-p') || {}).textContent || '', disc:!!r.querySelector('.disc.pv') }; }, [host, room]);
      if (room === 'adapt') check(tag + ' adapt: hovering Cold Tolerance changes the PLANT layer, not the environment; mini-map marks regions opening; preview text names it', after2.plant !== before.plant && after2.env === before.env && pv.open >= 1 && pv.previewing && pv.glow.includes('temp') && /Cold Tolerance/.test(pv.text), { open:pv.open, glow:pv.glow, plantChanged:after2.plant !== before.plant, envChanged:after2.env !== before.env });
      if (room === 'spread') check(tag + ' spread: hovering Waterborne Seeds changes the plant (seed parts) and draws dispersal arcs on the mini-map', after2.plant !== before.plant && after2.env === before.env && pv.arcs >= 1 && pv.glow.includes('spread') && /Waterborne/.test(pv.text), { arcs:pv.arcs, glow:pv.glow });
      if (room === 'terraform') check(tag + ' terraform: hovering Warm the Sky changes the ENVIRONMENT (sky / disc / tint), not the plant anatomy', after2.env !== before.env && after2.plant === before.plant && pv.tint > 0 && pv.dim > 0 && (/20 °C/.test(pv.envTxt) || pv.disc) && /Warm the Sky/.test(pv.text), { tint:pv.tint, dim:pv.dim, envTxt:pv.envTxt, disc:pv.disc, plantChanged:after2.plant !== before.plant });
      if (vp[0] === 1280 && !rm && !engine) await shot(page, 'c' + id + '-0' + (room === 'adapt' ? 3 : room === 'spread' ? 4 : 5) + '-' + room + '-preview.png');
      if (vp[0] !== 1280 && !rm && !engine && (room === 'adapt' || (room === 'terraform' && vp[0] === 1440))) await shot(page, 'c' + id + '-0' + (room === 'adapt' ? 7 : 8) + '-' + vp[0] + '-' + room + '.png');
      await page.mouse.move(2, 2); await wait(200);
      const restored = await specParts(page, host);
      check(tag + ' ' + room + ': leaving the node restores the specimen and clears the mini-map preview', restored.plant === before.plant && restored.env === before.env && (await page.evaluate(h => document.querySelector(h + ' .mm-map .pv-open, ' + h + ' .mm-map .seedarc') === null, host)));
    } else {
      const dossier = await page.$eval('.room[data-room="region"]', e => e.classList.contains('dossier'));
      const conds = (await page.$$('.room[data-room="region"] .cond')).length;
      let tabOk = true;
      if (!dossier) { await page.click('#tab-colony'); await wait(150); tabOk = (await isVisible(page, '#pane-colony')) && !(await isVisible(page, '#pane-overview')); await page.click('#tab-overview'); }
      else tabOk = (await isVisible(page, '#pane-colony')) && (await isVisible(page, '#pane-science'));
      check(tag + ' region: four condition rows, limiting factor, ' + (dossier ? 'stacked dossier sections' : 'Overview / Colony / Science tabs') + ', specimen', conds === 4 && tabOk && (await isVisible(page, '.room[data-room="region"] .limit')) && (await isVisible(page, '.room[data-room="region"] .bm-spec')), { conds, tabOk, dossier });
      if (vp[0] === 1280 && !rm && !engine) await shot(page, 'c' + id + '-02-region.png');
    }
    // room → room link keeps the pause and the selection
    if (room === 'adapt') {
      await page.click('.room[data-room="adapt"] [data-room-go="terraform"]'); await wait(300);
      check(tag + ': Adapt → Terraform link switches rooms without leaving the paused mode or changing the region', (await isVisible(page, '.room[data-room="terraform"]')) && !(await isVisible(page, '.room[data-room="adapt"]')) && (await page.evaluate(() => BM.clock.paused && ROOMS22.state.sel === 'dust')));
    }
    await page.keyboard.press('Escape'); await wait(300);
    check(tag + ' ' + room + ': Escape returns to Planet View and RESUMES the clock (it was running before)', (await page.evaluate(() => document.getElementById('rooms').hidden && !BM.clock.paused)) && (await isVisible(page, '#mapwrap svg')));
    const r1 = await mapRect(page);
    check(tag + ' ' + room + ': the main map has exactly the same geometry after the room as before (no reframing)', same(r0, r1), { before:r0, after:r1 });
    await clickRegion(page, 'frost', '#mapwrap'); await wait(150);
  }
  results.trees[tag] = trees;
  // exits: Resume play; Back keeps a pre-existing pause
  await page.click('[data-tool="spread"]'); await wait(300);
  await page.click('.room[data-room="spread"] [data-act="resume"]'); await wait(250);
  check(tag + ': Resume play closes the room and runs the clock', await page.evaluate(() => document.getElementById('rooms').hidden && !BM.clock.paused));
  await page.click('#ckPause'); await wait(100);
  await page.click('[data-tool="terraform"]'); await wait(300);
  await page.click('.room[data-room="terraform"] [data-act="back"]'); await wait(250);
  check(tag + ': Back from a run that was already paused stays paused', await page.evaluate(() => document.getElementById('rooms').hidden && BM.clock.paused));
  await page.click('#ckPause'); await wait(100);
  // keyboard: open with Enter on the tool, walk inside the room, Escape returns focus to the opener
  await page.focus('[data-tool="adapt"]'); await page.keyboard.press('Enter'); await wait(350);
  const walk = await tabWalk(page, 28);
  await page.keyboard.press('Escape'); await wait(300);
  const focusBack = await page.evaluate(() => document.activeElement && document.activeElement.dataset.tool === 'adapt');
  check(tag + ': keyboard: Enter on Adapt opens it, 28 Tabs stay inside the room with visible focus, Escape returns focus to the Adapt tool', walk.bad.length === 0 && walk.outside.length === 0 && walk.count >= 20 && focusBack, { bad:walk.bad.slice(0, 3), outside:walk.outside.slice(0, 3), count:walk.count, focusBack });
  // deep link
  await page.goto(url(f) + '?room=adapt&region=frost'); await wait(600);
  check(tag + ': deep link ?room=adapt&region=frost opens Adapt paused on Frost Ridge', await page.evaluate(() => BM.clock.paused && ROOMS22.state.room === 'adapt' && ROOMS22.state.sel === 'frost'));
  // icons
  const em = await emojiScan(page); results.icons[tag] = em;
  check(tag + ': no emoji anywhere on the page; inline SVG icons in use (' + em.svgIcons + ')', em.hits.length === 0 && em.svgIcons >= 40, em);
  check(tag + ': no console errors over the whole run', page._errs.length === 0, page._errs.slice(0, 3));
  await ctx.close();
}

async function runGallery(browser){
  for (const vp of VIEWPORTS) {
    const { ctx, page } = await newPage(browser, vp);
    await page.goto(url('index.html')); await wait(400);
    check('gallery @' + vp.join('x') + ': defaults to Decision rooms (BLOOM-022), no horizontal scroll, no console errors', (await page.$eval('[role="tab"][aria-selected="true"]', e => e.id)) === 'tab-rooms' && (await noHScroll(page)) && page._errs.length === 0, page._errs.slice(0, 2));
    if (vp[0] === 1280) {
      await shot(page, '00-gallery-rooms.png');
      const tabs = await page.$$eval('[role="tab"]', es => es.map(e => e.id));
      check('gallery: five rounds in order', tabs.join(',') === 'tab-rooms,tab-refinement,tab-convergence,tab-round2,tab-round1', tabs);
      const links = await page.$$eval('#panel-rooms a.open', es => es.map(e => e.getAttribute('href')));
      check('gallery: Decision rooms launches Concepts 11–14', links.join(',') === Object.values(CONCEPTS).join(','), links);
      const hiddenTabbable = await page.$$eval('.round[hidden] a, .round[hidden] button', es => es.filter(e => e.offsetParent !== null).length);
      check('gallery: hidden tabs’ links not visible / tabbable', hiddenTabbable === 0);
      await page.focus('#tab-rooms'); const order = [];
      for (let k = 0; k < 5; k++) { await page.keyboard.press('ArrowRight'); order.push(await page.$eval('[role="tab"][aria-selected="true"]', e => e.id.slice(4))); }
      check('gallery tabs: arrow keys walk rooms → refinement → convergence → round2 → round1 → wrap', order.join(',') === 'refinement,convergence,round2,round1,rooms', order);
      // every concept 1–14 reachable and loads clean
      const all = [];
      for (const t of ['rooms', 'refinement', 'convergence', 'round2', 'round1']) { await page.goto(url('index.html') + '#' + t); await wait(200); all.push(...await page.$$eval('.round:not([hidden]) a.open', es => es.map(e => e.getAttribute('href')))); }
      const uniq = [...new Set(all)];
      check('gallery: 14 concept pages linked across the five tabs', uniq.length === 14, uniq);
      const bad = [];
      for (const h of uniq) { const { ctx:c2, page:p2 } = await newPage(browser, [1280, 800]); await p2.goto(url(h)); await wait(500); if (p2._errs.length || !(await isVisible(p2, '.mock-ribbon'))) bad.push({ h, errs:p2._errs.slice(0, 2) }); await c2.close(); }
      check('gallery: all 14 concept pages load with the mockup ribbon and no console errors (shared files unchanged, 1–10 regression)', bad.length === 0, bad);
      await page.goto(url('index.html')); await page.evaluate(() => { try { localStorage.setItem('bloomMockTab20', 'round1'); localStorage.removeItem('bloomMockTab22'); } catch (e) {} }); await page.reload(); await wait(300);
      check('gallery: an old BLOOM-020 remembered tab does not hide the new default', (await page.$eval('[role="tab"][aria-selected="true"]', e => e.id)) === 'tab-rooms');
    }
    await ctx.close();
  }
}

function staticChecks(){
  const files = ['rooms.js', 'rooms.css', ...Object.values(CONCEPTS)].map(f => path.join(DIR, f));
  const banned = /bloom-sim|resources\/|planets\/|content\/|scenario|validator|generator|\bbalance\b|Bloom Report|bloom-report|fetch\(|XMLHttpRequest|import\s|require\(/i;
  const hits = [];
  files.forEach(f => { const s = fs.readFileSync(f, 'utf8'); s.split('\n').forEach((l, i) => { if (banned.test(l) && !/^\s*(\/\/|\*|\/\*|<!--|  )/.test(l) && !/VISUAL|Nothing here|never loads|not connected|Nothing in|validators, scenarios|balance data|Bloom Report\./.test(l)) hits.push(path.basename(f) + ':' + (i + 1) + ' ' + l.trim().slice(0, 80)); }); });
  check('isolation: rooms.js / rooms.css / concept pages contain no engine, generator, validator, scenario, balance, Bloom Report or network references outside comments', hits.length === 0, hits.slice(0, 5));
  const scripts = Object.values(CONCEPTS).map(f => fs.readFileSync(path.join(DIR, f), 'utf8').match(/<script src="([^"]+)"/g).join(' '));
  check('isolation: each concept page loads only shared.js and rooms.js', scripts.every(s => s === '<script src="shared.js" <script src="rooms.js"'), scripts);
  const emojiFiles = files.filter(f => EMOJI.test(fs.readFileSync(f, 'utf8')));
  check('icons: no emoji characters in rooms.js, rooms.css or the concept pages', emojiFiles.length === 0, emojiFiles.map(f => path.basename(f)));
  let st = ''; try { st = cp.execSync('git status --porcelain -- index.html resources content planets tools GAME_BIBLE.md demos/ui-mockups/shared.js demos/ui-mockups/shared.css', { cwd:ROOT }).toString().trim(); } catch (e) { st = 'git unavailable'; }
  check('scope: repository-root index.html, gameplay folders and the shared mockup files are untouched (git status)', st === '', st);
}

(async () => {
  staticChecks();
  const browser = await chromium.launch();
  console.log('gallery…'); await runGallery(browser);
  for (const vp of VIEWPORTS) for (const id of Object.keys(CONCEPTS)) { console.log('concept', id, vp.join('x')); await runConcept(browser, +id, vp, false); }
  for (const id of Object.keys(CONCEPTS)) { console.log('concept', id, 'reduced motion'); await runConcept(browser, +id, [1280, 800], true); }
  await browser.close();
  if (process.argv.includes('--firefox')) {
    const fb = await firefox.launch();
    for (const id of Object.keys(CONCEPTS)) { console.log('concept', id, 'firefox'); await runConcept(fb, +id, [1280, 800], false, 'firefox'); }
    await fb.close();
  }
  check('no external network requests', results.external.length === 0, results.external.slice(0, 5));
  results.summary = { total:results.checks.length, failed:fails };
  fs.writeFileSync(path.join(OUT, 'qa-results.json'), JSON.stringify(results, null, 1));
  console.log((fails ? 'FAIL' : 'PASS') + ' — ' + (results.checks.length - fails) + '/' + results.checks.length + ' checks');
  for (const k of Object.keys(results.trees)) console.log('trees', k, JSON.stringify(results.trees[k]));
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
