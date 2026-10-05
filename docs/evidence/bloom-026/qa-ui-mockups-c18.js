#!/usr/bin/env node
/*
  BLOOM-026 QA driver for the UI concept sandbox (demos/ui-mockups/): Concept 18, "Final UI Lock Polish".
  VISUAL MOCKUP ONLY. This checks the sandbox page, not the game. Needs Playwright (Chromium; Firefox with --firefox):
    NODE_PATH="$(npm root -g)" node docs/evidence/bloom-026/qa-ui-mockups-c18.js [--shots] [--firefox]
  Writes docs/evidence/bloom-026/qa-results.json (+ screenshots with --shots). Exit code 1 on any failed check.

  Forked from the BLOOM-025 driver. Everything Concept 17 was checked for still holds (Planet View rules, banner, selection vs
  room context, Map View popover, rooms floating over the inert blurred world, content-height boxes, pill fit, proportional
  scale, category colours, leaders never crossing, banks, exclusion zone, pill hover, hover reset, click commits, keyboard,
  deep links, emoji, isolation), minus the review-only Plant link switch, plus the BLOOM-026 brief's list:
    1 Concepts 1–18 reachable · 2 Concept 18 is the default review target · 3 Organic is the normal (only) Adapt / Spread
    treatment · 4 Organic tendrils measurably thicker than Concept 17 Organic (idle and lit, at every viewport) · 5 no leader
    crossings, and clear space between neighbouring tendrils even with one lit · 6 category colour continuity · 7 the
    atmosphere is a soft gradient with no hard edge (structure + a pixel probe vs Concept 17) · 8 it does not cover the globe
    face · 9 Soil arrows end closer to the globe than Concept 17 (pixel probe) without touching it · 10 exclusion-zone rules
    otherwise intact · 11–13 banner actions are intrinsic-width buttons, suggestions do not stretch, the row wraps at narrow
    widths · 14 four condition boxes with distinct category identity · 15 unfavourable status distinguishable from category ·
    16 not colour alone (icons + words) · 17 Map View · 18 region-pill hover · 19 hover reset · 20 no emoji · 21 no console
    errors · 22 no external requests.
*/
'use strict';
const path = require('path'), fs = require('fs'), cp = require('child_process');
const { chromium, firefox } = require('playwright');
const ROOT = path.resolve(__dirname, '../../..');
const DIR = path.join(ROOT, 'demos/ui-mockups');
const OUT = __dirname;
const SHOTS = process.argv.includes('--shots');
const url = f => 'file://' + path.join(DIR, f);
const PAGE = 'concept-18-final-ui-lock.html', PREV = 'concept-17-final-interaction.html';
const ROOMS = ['region', 'adapt', 'spread', 'terraform'];
const VIEWPORTS = [[1280, 800], [1024, 768], [1440, 900]];
const results = { when:new Date().toISOString(), checks:[], geometry:{}, trees:{}, organic:{}, terraform:{}, spread:{}, banner:{}, compare:{}, scale:{}, colours:{}, icons:{}, external:[], errors:[] };
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
const st = page => page.evaluate(() => ({ sel:ROOMS26.state.sel, ctx:ROOMS26.state.ctx, room:ROOMS26.state.room, banner:!document.getElementById('banner').hidden, paused:BM.clock.paused, lens:ROOMS26.state.lens, lensPv:ROOMS26.state.lensPv, mainLens:map.lens, miniLens:ROOMS26.miniMaps.map(m => m.lens), miniSel:ROOMS26.miniMaps.map(m => m.selected), em:ROOMS26.state.em, emBy:ROOMS26.state.emBy, link:ROOMS26.link, pop:!ROOMS26.lenspop.hidden }));
const mapRect = page => page.$eval('#mapwrap svg', e => { const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height].map(v => Math.round(v)); });
const same = (a, b) => a.every((v, k) => Math.abs(v - b[k]) <= 1);
async function regionPoint(page, id, scope){
  return page.evaluate(([id, scope]) => { const host = document.querySelector(scope); const rects = [...host.querySelectorAll('.rg[data-r="' + id + '"] rect')].map(r => r.getBoundingClientRect()).map(b => ({ x:b.x + b.width / 2, y:b.y + b.height / 2 })); for (const p of rects) { const el = document.elementFromPoint(p.x, p.y); const g = el && el.closest && el.closest('.rg'); if (g && g.dataset.r === id && host.contains(g)) return p; } return null; }, [id, scope]);
}
async function clickRegion(page, id, scope){ const pt = await regionPoint(page, id, scope); if (!pt) throw new Error('region not clickable: ' + id + ' in ' + scope); await page.mouse.click(pt.x, pt.y); return pt; }
async function hoverEl(page, sel){ const h = await page.$(sel); if (!h) throw new Error('no element ' + sel); if (/\.mm-strip/.test(sel)) await h.evaluate(e => e.scrollIntoView({ block:'nearest' })); const b = await h.boundingBox(); await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await wait(280); return b; }
const specParts = (page, sel) => page.$eval(sel, host => { const svg = host.querySelector('.bm-spec svg'); if (!svg) return { plant:'', env:'' }; const ls = svg.querySelectorAll(':scope > g.layer'); const g = ls[ls.length - 1]; const c = g.cloneNode(true); c.querySelectorAll('[data-f="env"]').forEach(n => n.remove()); c.querySelectorAll('.dim,.glow').forEach(n => n.classList.remove('dim', 'glow')); c.querySelectorAll('[class=""]').forEach(n => n.removeAttribute('class')); return { plant:c.innerHTML, env:g.querySelector('[data-f="env"]').innerHTML.replace(/sk[a-z0-9]{6}/g, '') }; });
async function tabWalk(page, n){
  const bad = [], outside = []; let count = 0;
  for (let k = 0; k < n; k++) {
    await page.keyboard.press('Tab');
    const d = await page.evaluate(() => { const a = document.activeElement; if (!a || a === document.body) return null; const r = a.getBoundingClientRect(); let op = 1; for (let e = a; e && e.nodeType === 1; e = e.parentElement) op *= +getComputedStyle(e).opacity; const ring = a instanceof SVGElement ? 'svg' : getComputedStyle(a).outlineStyle; return { id:a.id || a.dataset.node || a.dataset.r || a.dataset.tool || a.dataset.roomGo || a.dataset.lens || a.dataset.link || (a.textContent || '').trim().slice(0, 20), w:r.width, h:r.height, hiddenAnc:!!a.closest('[hidden]'), op:Math.round(op * 100) / 100, ring, inRooms:!!a.closest('#rooms'), inRibbon:!!a.closest('.mock-ribbon') }; });
    if (!d) continue; count++;
    if (d.hiddenAnc || d.w < 1 || d.h < 1 || d.op < .5 || d.ring === 'none') bad.push(d);
    if (!d.inRooms && !d.inRibbon) outside.push(d.id);
  }
  return { bad, outside, count };
}
async function shot(page, name, clip){ if (!SHOTS || !name) return; await page.evaluate(() => document.querySelectorAll('.toast').forEach(t => t.remove())); await wait(200); await page.screenshot(Object.assign({ path:path.join(OUT, name) }, clip ? { clip } : {})); }
const clipOf = async (page, sel, pad) => page.$eval(sel, (e, pad) => { const r = e.getBoundingClientRect(); return { x:Math.max(0, Math.round(r.x) - pad), y:Math.max(0, Math.round(r.y) - pad), width:Math.round(r.width) + 2 * pad, height:Math.round(r.height) + 2 * pad }; }, pad || 6);
const EMOJI = /\p{Extended_Pictographic}/u;
const emojiScan = page => page.evaluate(() => { const re = /\p{Extended_Pictographic}/u; const hits = []; const t = document.body.innerText || ''; const m = t.match(/\p{Extended_Pictographic}/gu); if (m) hits.push({ where:'innerText', chars:[...new Set(m)].slice(0, 6) }); [...document.querySelectorAll('button, .st, .cat-l, .cat-cap, .bank-legend, .rk, .mm-k, .node, .lb, .rc, .alab, .li-part, .lenspop, .vswitch')].forEach(e => { if (re.test(e.textContent)) hits.push({ where:(e.className || e.tagName).toString().slice(0, 30), chars:e.textContent.match(/\p{Extended_Pictographic}/gu).slice(0, 3) }); }); return { hits:hits.slice(0, 5), svgIcons:document.querySelectorAll('svg.ic').length }; });
/* tree geometry: collisions, leader paths (sampled, for a generic crossing test), banks, halo, zone */
const treeStats = (page, room) => page.evaluate(room => { const sec = document.querySelector('.room[data-room="' + room + '"]'); const tr = sec.querySelector('.tree'); const nodes = [...tr.querySelectorAll('.node:not([hidden])')]; const boxes = nodes.map(n => n.getBoundingClientRect()); const host = tr.getBoundingClientRect();
  let overlaps = 0; for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) { const a = boxes[i], b = boxes[j]; const ix = Math.min(a.right, b.right) - Math.max(a.left, b.left), iy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top); if (ix > 2 && iy > 2) overlaps++; }
  const outside = boxes.filter(b => b.left < host.left - 2 || b.right > host.right + 2 || b.top < host.top - 2 || b.bottom > host.bottom + 2).length;
  const paths = [...sec.querySelectorAll('.leaders .ld')];
  const sample = p => { const L = p.getTotalLength(); const out = []; for (let k = 0; k <= 48; k++) { const q = p.getPointAtLength(L * k / 48); out.push([q.x, q.y]); } return out; };
  const segs = paths.map(sample);
  const inter = (a, b, c, d) => { const o = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])); return o(a, b, c) !== o(a, b, d) && o(c, d, a) !== o(c, d, b) && o(a, b, c) !== 0 && o(c, d, a) !== 0; };
  let crossings = 0; for (let i = 0; i < segs.length; i++) for (let j = i + 1; j < segs.length; j++) for (let a = 1; a < segs[i].length; a++) for (let b = 1; b < segs[j].length; b++) if (inter(segs[i][a - 1], segs[i][a], segs[j][b - 1], segs[j][b])) crossings++;
  const lds = paths.map(p => ({ w:parseFloat(getComputedStyle(p).strokeWidth), d:p.getAttribute('d'), cat:p.dataset.cat }));
  const anchors = [...sec.querySelectorAll('.leaders .anchor')].map(c => [Math.round(+c.getAttribute('cx')), Math.round(+c.getAttribute('cy'))]);
  const halo = sec.querySelector('.edges .halo'); const center = sec.querySelector('.tree .center');
  const cx = host.left + host.width / 2, R = center ? center.getBoundingClientRect().width / 2 : 0;
  const banks = nodes.map(n => ({ id:n.dataset.node, cat:n.dataset.cat, x:(n.querySelector('.ni') || n).getBoundingClientRect().left + (n.querySelector('.ni') || n).getBoundingClientRect().width / 2 - cx, y:n.getBoundingClientRect().top + n.getBoundingClientRect().height / 2 - (host.top + host.height / 2) }));
  const truncated = [...tr.querySelectorAll('.node .nt small')].filter(s => s.scrollWidth > s.clientWidth + 1).map(s => s.closest('.node').dataset.node);
  return { kind:[...tr.classList].find(c => c.startsWith('k-')), nodes:nodes.length, nodeIds:nodes.map(n => n.dataset.node).join(','), edges:tr.querySelectorAll('.edges path.edge').length, overlaps, outside, leaders:lds.length, crossings, leaderW:lds.length ? Math.min(...lds.map(l => l.w)) : 0, lds, anchors, plates:sec.querySelectorAll('.leaders .aplate').length, nodeW:Math.round(boxes[0].width), em:parseFloat(getComputedStyle(sec).fontSize), treeH:Math.round(host.height), zones:['.z-focus .lf-top', '.z-focus .lf-info', '.z-main .tree', '.z-map .mm-map'].map(s => !!sec.querySelector(s)), host:{ left:host.left, top:host.top, right:host.right, bottom:host.bottom }, truncated,
    halo:halo ? { r:+halo.getAttribute('r'), fill:getComputedStyle(halo).fill, R, stroke:parseFloat(getComputedStyle(halo).strokeWidth), count:sec.querySelectorAll('.edges .halo').length, extra:sec.querySelectorAll('.edges .halo-glow, .edges .h2').length } : null, banks, R, cx, labelMode:tr.classList.contains('lab-icon') ? 'icon' : 'full', tight:tr.classList.contains('tight') }; }, room);
/* Terraform exclusion zone: distances of every forbidden thing from the globe centre; sampled connector points vs badges */
const zoneStats = page => page.evaluate(() => { const sec = document.querySelector('.room[data-room="terraform"]'); const tree = ROOMS26.rooms.terraform.tree; const L = tree.L; const tr = sec.querySelector('.tree').getBoundingClientRect(); const em = parseFloat(getComputedStyle(sec).fontSize);
  const cx = tr.left + L.dims.cx, cy = tr.top + L.dims.cy, R = L.dims.R, zone = L.dims.zone, haloOut = L.dims.haloOut;
  const rectDist = r => { const dx = Math.max(r.left - cx, 0, cx - r.right), dy = Math.max(r.top - cy, 0, cy - r.bottom); return Math.hypot(dx, dy); };
  const items = [];
  [...sec.querySelectorAll('.tree .node .ni, .tree .node .nt, .tree .node .nl, .bank-legend, .g-read, .tree .cat-cap')].forEach(e => { const r = e.getBoundingClientRect(); if (!r.width) return; items.push({ what:(e.className.baseVal !== undefined ? e.className.baseVal : e.className).toString().split(' ')[0] + ':' + ((e.closest('.node') || {}).dataset || {}).node, dist:Math.round(rectDist(r)) }); });
  const minItem = items.reduce((a, b) => b.dist < a.dist ? b : a, { dist:1e9 });
  const sample = (p, n) => { const len = p.getTotalLength(); const out = []; for (let k = 0; k <= n; k++) { const q = p.getPointAtLength(len * k / n); out.push({ x:q.x + tr.left, y:q.y + tr.top }); } return out; };
  const chains = [...sec.querySelectorAll('.edges .edge.chain')]; const leads = [...sec.querySelectorAll('.edges .edge.lead')];
  const chainMin = Math.min.apply(null, chains.map(p => Math.min.apply(null, sample(p, 40).map(q => Math.hypot(q.x - cx, q.y - cy)))));
  const badges = [...sec.querySelectorAll('.tree .node .nl')].map(b => { const r = b.getBoundingClientRect(); return { id:b.closest('.node').dataset.node, left:r.left - 1, top:r.top - 1, right:r.right + 1, bottom:r.bottom + 1 }; });
  const badgeHits = [];
  chains.concat(leads).forEach(p => sample(p, 60).forEach(q => badges.forEach(b => { if (q.x >= b.left && q.x <= b.right && q.y >= b.top && q.y <= b.bottom) badgeHits.push(b.id); })));
  const legend = sec.querySelector('.bank-legend').getBoundingClientRect(), read = sec.querySelector('.g-read').getBoundingClientRect();
  const rings = [...sec.querySelectorAll('.edges .ring')].map(c => Math.round(Math.hypot(+c.getAttribute('cx') + tr.left - cx, +c.getAttribute('cy') + tr.top - cy)));
  const pins = sec.querySelectorAll('.edges .pin').length;
  // text vs connector collisions: no sampled connector point inside the legend or readout boxes
  const textHits = chains.concat(leads).reduce((n, p) => n + sample(p, 60).filter(q => [legend, read].some(r => q.x >= r.left && q.x <= r.right && q.y >= r.top && q.y <= r.bottom)).length, 0);
  return { em, R:Math.round(R), zone:Math.round(zone), haloOut:Math.round(haloOut), halo:Math.round(L.dims.halo), haloW:Math.round(L.dims.haloW), minItem, chains:chains.length, chainMin:Math.round(chainMin), chainStraight:chains.filter(p => /^M[\d. -]+L[\d. -]+$/.test(p.getAttribute('d').trim())).length, chainElbow:chains.filter(p => /^M[\d. -]+H[\d. -]+(L[\d. -]+)+H[\d. -]+$/.test(p.getAttribute('d').trim())).length, badges:badges.length, badgeHits:[...new Set(badgeHits)], legendDist:Math.round(rectDist(legend)), readDist:Math.round(rectDist(read)), rings, pins, textHits, bow:[Math.round(L.dims.bow_soil), Math.round(L.dims.bow_atmo)], gw:Math.round(2 * R) }; });
/* Spread padding: the tree card's four margins around its content */
const padStats = (page, room) => page.evaluate(room => { const sec = document.querySelector('.room[data-room="' + room + '"]'); const card = sec.querySelector('.z-main').getBoundingClientRect(); const nodes = [...sec.querySelectorAll('.tree .node')].map(n => n.getBoundingClientRect()); const ports = [...sec.querySelectorAll('.edges .port')].map(p => p.getBoundingClientRect()); const labels = [...sec.querySelectorAll('.tree .cat-l')].map(l => l.getBoundingClientRect());
  const all = nodes.concat(ports, labels); const top = Math.min(...all.map(r => r.top)), bottom = Math.max(...all.map(r => r.bottom)), left = Math.min(...all.map(r => r.left)), right = Math.max(...all.map(r => r.right));
  const cs = getComputedStyle(sec); const rr = sec.getBoundingClientRect(); const zoneBottom = rr.bottom - parseFloat(cs.paddingBottom);
  return { top:Math.round(top - card.top), bottom:Math.round(card.bottom - bottom), left:Math.round(left - card.left), right:Math.round(card.right - right), cardH:Math.round(card.height), cardBottom:Math.round(card.bottom), zoneBottom:Math.round(zoneBottom), em:parseFloat(cs.fontSize) }; }, room);
const boxes = (page, room) => page.evaluate(room => { const sec = document.querySelector('.room[data-room="' + room + '"]'); const r = s => { const e = sec.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); const cs = getComputedStyle(e); const kids = [...e.children].filter(k => k.getClientRects().length); const content = kids.length ? Math.round(kids[kids.length - 1].getBoundingClientRect().bottom - kids[0].getBoundingClientRect().top + parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom) + parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth)) : 0; return { top:Math.round(b.top), bottom:Math.round(b.bottom), height:Math.round(b.height), content, slack:Math.round(b.height) - content, scrolls:e.scrollHeight > e.clientHeight + 2 }; };
  const rr = sec.getBoundingClientRect(); const cs = getComputedStyle(sec); const zoneBottom = Math.round(rr.bottom - parseFloat(cs.paddingBottom));
  const planet = document.getElementById('planet'); const rooms = document.getElementById('rooms');
  const mmEl = sec.querySelector('.z-map .mm'); const mmOverflow = mmEl ? mmEl.scrollHeight - mmEl.clientHeight : 0;
  return { zoneBottom, mmOverflow, info:r('.lf-info'), main:r('.z-main'), mm:r('.z-map .mm'), ctx:r('.z-map > .mm-ctx'), ctxSeparate:!!sec.querySelector('.z-map > .mm-ctx'), planetHidden:planet.hidden, planetInert:!!planet.inert, planetAria:planet.getAttribute('aria-hidden'), planetFilter:getComputedStyle(planet).filter, hudFilter:getComputedStyle(document.getElementById('hud')).filter, roomsBg:getComputedStyle(rooms).backgroundColor, roomBg:getComputedStyle(sec).backgroundColor, em:parseFloat(cs.fontSize) }; }, room);
const stripRows = (page, room) => page.evaluate(room => { const strip = document.querySelector('.room[data-room="' + room + '"] .mm-strip'); const chips = [...strip.querySelectorAll('.rc')]; const t0 = chips[0].getBoundingClientRect().top; const row1 = chips.filter(c => Math.abs(c.getBoundingClientRect().top - t0) < 2); const sb = strip.getBoundingClientRect(); const last = row1[row1.length - 1].getBoundingClientRect(); return { row1:row1.length, names:row1.map(c => c.textContent.trim()), stripW:Math.round(sb.width), chipW:Math.round(chips[0].getBoundingClientRect().width), slack:Math.round(sb.right - last.right) }; }, room);
const catColours = (page, room) => page.evaluate(room => { const sec = document.querySelector('.room[data-room="' + room + '"]'); const out = {}; [...sec.querySelectorAll('.tree .cat-l[data-cat]')].forEach(l => { const c = l.dataset.cat; const node = sec.querySelector('.tree .node[data-cat="' + c + '"]'); const lead = sec.querySelector('.leaders .lead-g[data-cat="' + c + '"]'); const port = sec.querySelector('.edges .port[style*="' + getComputedStyle(l).getPropertyValue('--cat').trim() + '"]');
    out[c] = { label:getComputedStyle(l).borderColor, node:getComputedStyle(node).borderLeftColor, nodeIcon:getComputedStyle(node.querySelector('.ni')).color, glow:lead ? getComputedStyle(lead.querySelector('.ld-glow')).stroke : null, anchor:lead ? getComputedStyle(lead.querySelector('.anchor')).stroke : null, port:port ? getComputedStyle(port).stroke : null, labelInk:getComputedStyle(l).color }; }); return out; }, room);
const pillPeek = (page, room) => page.evaluate(room => { const sec = document.querySelector('.room[data-room="' + room + '"]'); const mm = sec.querySelector('.mm-map'); return { hov:mm.querySelector('.hover-o').getAttribute('d') || '', sel:mm.querySelector('.sel-o').getAttribute('d') || '', peek:sec.querySelector('.mm-peek').textContent.replace(/\s+/g, ' ').trim(), pk:[...sec.querySelectorAll('.mm-strip .rc.pk')].map(b => b.dataset.r), pressed:[...sec.querySelectorAll('.mm-strip .rc[aria-pressed="true"]')].map(b => b.dataset.r), ctx:ROOMS26.state.ctx, miniSel:ROOMS26.rooms[room].mm.mini.selected, peekState:ROOMS26.rooms[room].mm.peek, peekH:Math.round(sec.querySelector('.mm-peek').getBoundingClientRect().height), stripTop:Math.round(sec.querySelector('.mm-strip').getBoundingClientRect().top) }; }, room);
const hoverState = (page, room) => page.evaluate(room => { const r = document.querySelector('.room[data-room="' + room + '"]'); return { hovered:ROOMS26.rooms[room].tree.hovered, infoPv:r.querySelector('.lf-info').classList.contains('pv'), info:r.querySelector('.lf-info').textContent.replace(/\s+/g, ' ').trim().slice(0, 60), pvOpen:r.querySelectorAll('.mm-map .pv-open, .mm-map .seedarc').length, previewing:!!r.querySelector('.bm-spec.previewing'), scenePv:!!r.querySelector('.scene.pv'), globePv:!!r.querySelector('.globe.pv'), nodePv:r.querySelectorAll('.tree .node.pv').length, litLinks:r.querySelectorAll('.leaders .ld.on, .leaders .aplate.on, .leaders .socket.on, .edges .ring.on, .edges .pin.on, .edges .entry.on').length }; }, room);
const popStats = page => page.evaluate(() => { const pop = document.getElementById('lenspop'), btn = document.querySelector('[data-tool="mapview"]'); const p = pop.getBoundingClientRect(), b = btn.getBoundingClientRect(); const items = [...pop.querySelectorAll('[data-lens]')]; return { hidden:pop.hidden, expanded:btn.getAttribute('aria-expanded'), top:Math.round(p.top), btnBottom:Math.round(b.bottom), left:Math.round(p.left), btnLeft:Math.round(b.left), right:Math.round(p.right), vw:innerWidth, items:items.map(i => i.textContent.trim()), text:pop.textContent.replace(/\s+/g, ' ').trim(), extras:pop.querySelectorAll('.ll, .lh, .sw, p, .legend').length, w:Math.round(p.width), h:Math.round(p.height), focusIn:pop.contains(document.activeElement), inHud:!!pop.closest('#hud'), z:getComputedStyle(pop).zIndex }; });
const helpStats = page => page.evaluate(() => { const pane = document.querySelector('#pane-overview .pb').getBoundingClientRect(); const help = document.querySelector('.room[data-room="region"] .help'); if (!help) return { none:true }; const grid = help.querySelector('.help-b'); const btns = [...help.querySelectorAll('.hb')].map(b => { const r = b.getBoundingClientRect(); const cs = getComputedStyle(b); return { w:Math.round(r.width), h:Math.round(r.height), top:Math.round(r.top), left:Math.round(r.left), padL:parseFloat(cs.paddingLeft), padR:parseFloat(cs.paddingRight), text:b.textContent.replace(/\s+/g, ' ').trim(), tag:b.tagName, display:cs.display }; });
  const widest = Math.max(...btns.map(b => b.w)); const cols = getComputedStyle(grid).gridTemplateColumns.split(' ').length; const sameRow = btns.every(b => b.top === btns[0].top); const gap = btns.length > 1 ? btns[1].left - (btns[0].left + btns[0].w) : 0;
  return { n:btns.length, cls:help.className, cols, sameRow, gap, widest, paneW:Math.round(pane.width), btns, sum:btns.reduce((a, b) => a + b.w, 0) }; });

/* ── BLOOM-026 helpers ── */
/* pixels of a clip, decoded in the page from the screenshot (data: URL, no network) */
async function pixels(page, clip){
  const buf = await page.screenshot({ clip });
  return page.evaluate(async b64 => { const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode(); const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img, 0, 0); return { w:img.width, h:img.height, d:Array.from(x.getImageData(0, 0, img.width, img.height).data) }; }, buf.toString('base64'));
}
const px = (P, x, y) => { x = Math.max(0, Math.min(P.w - 1, Math.round(x))); y = Math.max(0, Math.min(P.h - 1, Math.round(y))); const k = (y * P.w + x) * 4; return [P.d[k], P.d[k + 1], P.d[k + 2]]; };
const lum = c => .2126 * c[0] + .7152 * c[1] + .0722 * c[2];
/* Terraform globe geometry in page coordinates, for either concept (hook = ROOMS25 / ROOMS26) */
const globeGeo = (page, hook) => page.evaluate(hook => { const sec = document.querySelector('.room[data-room="terraform"]'); const L = window[hook].rooms.terraform.tree.L; const tr = sec.querySelector('.tree').getBoundingClientRect(); const em = parseFloat(getComputedStyle(sec).fontSize);
  const R = L.dims.R; const cx = tr.left + L.dims.cx, cy = tr.top + L.dims.cy;
  const pins = [...sec.querySelectorAll('.edges .pin')].map(p => { const b = p.getBoundingClientRect(); const pc = { x:b.left + b.width / 2, y:b.top + b.height / 2 }; return Math.atan2(pc.y - cy, pc.x - cx); });
  return { cx, cy, R, face:R * 191.5 / 200, halo:L.dims.halo, zone:L.dims.zone, haloOut:L.dims.haloOut, em, pins }; }, hook);
/* atmosphere pixel profile straight up from the globe centre (a direction no node, label or connector uses): from just
   outside the visible face to beyond the zone. maxStep = largest brightness jump between neighbouring pixels (a hard ring
   edge shows as a jump); depth = how much darker (bluer) the atmosphere's strongest point is than open space. */
async function atmoProfile(page, hook){
  const g = await globeGeo(page, hook);
  const r0 = Math.ceil(g.face + 2), r1 = Math.floor(g.zone + 6);
  const clip = { x:Math.round(g.cx) - 1, y:Math.round(g.cy - r1), width:3, height:r1 - r0 };
  const P = await pixels(page, clip);
  const L = []; for (let y = 0; y < P.h; y++) L.push((lum(px(P, 0, y)) + lum(px(P, 1, y)) + lum(px(P, 2, y))) / 3);
  const rad = y => g.cy - (clip.y + y + .5);   // radius of a row
  let maxStep = 0, at = 0; for (let k = 1; k < L.length; k++) { const s = Math.abs(L[k] - L[k - 1]); if (s > maxStep) { maxStep = s; at = rad(k); } }
  const minL = Math.min(...L), kMin = L.indexOf(minL), outer = L[0], inner = L[L.length - 1];
  return { maxStep:Math.round(maxStep * 10) / 10, stepAt:Math.round(at - g.R), depth:Math.round((outer - minL) * 10) / 10, darkest:Math.round(rad(kMin) - g.R), halo:Math.round(g.halo - g.R), r:[Math.round(r0 - g.R), Math.round(r1 - g.R)], em:g.em, edgeIn:Math.round((inner - minL) * 10) / 10 };
}
/* Soil arrow pixel gap: along each Soil leader's axis (centre → node), the first arrow-coloured pixel outside the visible face */
async function soilGap(page, hook){
  const g = await globeGeo(page, hook);
  const out = [];
  for (const a of g.pins) {
    const ra = g.face - 6, rb = g.face + 2.2 * g.em;
    const p0 = { x:g.cx + Math.cos(a) * ra, y:g.cy + Math.sin(a) * ra }, p1 = { x:g.cx + Math.cos(a) * rb, y:g.cy + Math.sin(a) * rb };
    const clip = { x:Math.floor(Math.min(p0.x, p1.x)) - 2, y:Math.floor(Math.min(p0.y, p1.y)) - 2, width:Math.ceil(Math.abs(p1.x - p0.x)) + 5, height:Math.ceil(Math.abs(p1.y - p0.y)) + 5 };
    const P = await pixels(page, clip);
    const ARROW = [138, 106, 62];   // Ground (Soil) category colour #8a6a3e
    let first = null, inside = 0;
    for (let r = ra; r <= rb; r += .25) { const x = g.cx + Math.cos(a) * r - clip.x, y = g.cy + Math.sin(a) * r - clip.y; const c = px(P, x, y); const dist = Math.hypot(c[0] - ARROW[0], c[1] - ARROW[1], c[2] - ARROW[2]); if (dist < 46) { if (r < g.face + .5) inside++; else if (first === null) first = r; } }
    out.push({ angle:Math.round(a * 180 / Math.PI), gap:first === null ? null : Math.round((first - g.face) * 10) / 10, touching:inside });
  }
  return out;
}
/* Organic tendril geometry: widths, clear space between neighbours (idle and with one lit), curves, veins, gutter */
const organicStats = (page, room) => page.evaluate(room => { const sec = document.querySelector('.room[data-room="' + room + '"]'); const ps = [...sec.querySelectorAll('.leaders .ld')]; const lv = sec.querySelector('.leaders');
  const w = ps.length ? parseFloat(getComputedStyle(ps[0]).strokeWidth) : 0, lit = parseFloat(getComputedStyle(lv).getPropertyValue('--ld-on')) || 0;
  const S = ps.map(p => { const L = p.getTotalLength(); const o = []; for (let k = 0; k <= 240; k++) { const q = p.getPointAtLength(L * k / 240); o.push([q.x, q.y]); } return o; });
  let min = 1e9, pair = null; for (let i = 0; i < S.length; i++) for (let j = i + 1; j < S.length; j++) for (const a of S[i]) for (const c of S[j]) { const d = Math.hypot(a[0] - c[0], a[1] - c[1]); if (d < min) { min = d; pair = [ps[i].dataset.cat, ps[j].dataset.cat]; } }
  const tr = sec.querySelector('.z-main').getBoundingClientRect(), pl = sec.querySelector('.lf-top').getBoundingClientRect(); const em = parseFloat(getComputedStyle(sec).fontSize);
  const plateOver = [...sec.querySelectorAll('.leaders .aplate')].every(r => +r.getAttribute('height') >= lit);
  return { em, w:Math.round(w * 10) / 10, lit:Math.round(lit * 10) / 10, glow:parseFloat(getComputedStyle(lv).getPropertyValue('--ld-glow')) || 0, edgeGap:Math.round((min - w) * 10) / 10, litGap:Math.round((min - (w + lit) / 2) * 10) / 10, pair, curves:ps.filter(p => /C/.test(p.getAttribute('d'))).length, veins:sec.querySelectorAll('.leaders .vein').length, anchorR:sec.querySelector('.leaders .anchor') ? +sec.querySelector('.leaders .anchor').getAttribute('r') : 0, portR:sec.querySelector('.edges .port') ? +sec.querySelector('.edges .port').getAttribute('r') : 0, gutter:Math.round(tr.left - pl.right), plateOver,
    titleRoom:Math.min(...[...sec.querySelectorAll('.tree .node')].map(n => { const rg = document.createRange(); rg.selectNodeContents(n.querySelector('.nt b')); return Math.round(n.getBoundingClientRect().right - rg.getBoundingClientRect().right); })),
    titleCol:Math.min(...[...sec.querySelectorAll('.tree .node')].map(n => { const rg = document.createRange(); rg.selectNodeContents(n.querySelector('.nt b')); return Math.round(n.querySelector('.nt').getBoundingClientRect().right - rg.getBoundingClientRect().right); })),
    fitted:[...sec.querySelectorAll('.tree .node .nt b')].filter(b => b.style.getPropertyValue('--fit')).map(b => b.closest('.node').dataset.node + ':' + b.style.getPropertyValue('--fit')), nodeW:Math.round(sec.querySelector('.tree .node').getBoundingClientRect().width),
    other:sec.querySelectorAll('.leaders .bridge-bg, .leaders .socket, .edges .entry').length, bay:getComputedStyle(sec.querySelector('.tree'), '::before').content, n:ps.length }; }, room);
/* Terraform atmosphere structure: one gradient layer, no stroke, zero at the face, smooth stops, gone inside the zone */
const atmoStats = page => page.evaluate(() => { const sec = document.querySelector('.room[data-room="terraform"]'); const L = ROOMS26.rooms.terraform.tree.L; const h = sec.querySelectorAll('.edges .halo'); const e = h[0]; const cs = getComputedStyle(e);
  const id = (e.getAttribute('fill') || '').replace(/^url\(#|\)$/g, ''); const gr = id ? sec.querySelector('#' + id) : null; const RO = gr ? +gr.getAttribute('r') : 0;
  const stops = gr ? [...gr.querySelectorAll('stop')].map(s => ({ r:+s.getAttribute('offset') * RO, a:+s.getAttribute('stop-opacity') })) : [];
  let maxStep = 0; for (let k = 1; k < stops.length; k++) maxStep = Math.max(maxStep, Math.abs(stops[k].a - stops[k - 1].a));
  const peak = stops.reduce((a, b) => b.a > a.a ? b : a, { a:-1 });
  const firstLit = stops.find(s => s.a > 0);
  const zeroTo = Math.max(...stops.filter(s => s.a === 0 && (!firstLit || s.r < firstLit.r)).map(s => s.r));
  return { count:h.length, extra:sec.querySelectorAll('.edges .halo-glow, .edges .h2').length, stroke:cs.stroke, strokeW:cs.strokeWidth, gradient:!!gr && gr.tagName === 'radialGradient', stops:stops.length, maxStep:Math.round(maxStep * 1000) / 1000, first:stops[0] && stops[0].a, last:stops.length ? stops[stops.length - 1].a : null, zeroTo:Math.round(zeroTo * 10) / 10, face:Math.round(L.dims.face * 10) / 10, R:L.dims.R, peakR:Math.round(peak.r * 10) / 10, peakA:peak.a, halo:Math.round(L.dims.halo * 10) / 10, RO:Math.round(RO * 10) / 10, zone:Math.round(L.dims.zone * 10) / 10, whiteDisc:[...sec.querySelectorAll('.globe > circle')].filter(c => +c.getAttribute('r') > 190).length }; });
/* Planet View banner: action buttons (intrinsic?), rows, condition boxes (category identity vs status) */
const bannerStats = page => page.evaluate(() => { const bn = document.getElementById('banner'); const br = bn.getBoundingClientRect(); const a = bn.querySelector('.bn-a').getBoundingClientRect();
  const btns = [...bn.querySelectorAll('.bn-a .btn')].map(b => { const r = b.getBoundingClientRect(); const cs = getComputedStyle(b); const clone = b.cloneNode(true); clone.style.cssText = 'position:absolute; visibility:hidden; width:max-content; flex:none'; b.parentNode.appendChild(clone); const nat = clone.getBoundingClientRect().width; clone.remove(); return { t:b.textContent.replace(/\s+/g, ' ').trim(), w:Math.round(r.width), nat:Math.round(nat), h:Math.round(r.height), top:Math.round(r.top), left:Math.round(r.left), right:Math.round(r.right), grow:cs.flexGrow, padL:parseFloat(cs.paddingLeft), padR:parseFloat(cs.paddingRight), kind:b.classList.contains('planet') ? 'planet' : b.classList.contains('plant') ? 'plant' : b.classList.contains('spread') ? 'spread' : 'neutral' }; });
  const rows = new Set(btns.map(b => b.top)).size;
  const boxes = [...bn.querySelectorAll('.bn-c .bc')].map(b => { const cs = getComputedStyle(b); const lab = b.querySelector('.bc-t small'), val = b.querySelector('.bc-t b'), sbe = b.querySelector('.sb'), ic = b.querySelector('.bc-i'); return { cat:b.dataset.cat, st:[...b.classList].find(c => c.startsWith('st-')), accent:cs.borderLeftColor, accentW:parseFloat(cs.borderLeftWidth), bg:cs.backgroundImage.slice(0, 60), label:lab.textContent.trim(), labelInk:getComputedStyle(lab).color, value:val.textContent.trim(), valueInk:getComputedStyle(val).color, icon:!!ic.querySelector('svg.ic'), iconInk:getComputedStyle(ic).color, badge:sbe ? { cls:sbe.className, word:sbe.textContent.trim(), icon:!!sbe.querySelector('svg.ic'), bg:getComputedStyle(sbe).backgroundColor, border:getComputedStyle(sbe).borderTopColor, visibleWord:sbe.querySelector('span:not(.sr-only)') ? sbe.querySelector('span:not(.sr-only)').getBoundingClientRect().width > 2 : false } : null, overflow:val.scrollWidth > val.clientWidth + 1, w:Math.round(b.getBoundingClientRect().width), h:Math.round(b.getBoundingClientRect().height), inBanner:b.getBoundingClientRect().right <= br.right + .5 && b.getBoundingClientRect().left >= br.left - .5 }; });
  return { w:Math.round(br.width), left:Math.round(br.left), right:Math.round(br.right), aW:Math.round(a.width), btns, rows, boxes, sumW:btns.reduce((s, b) => s + b.w, 0), inside:btns.every(b => b.left >= br.left - .5 && b.right <= br.right + .5), help:!!bn.querySelector('.bn-help'), helpCap:(bn.querySelector('.bn-help > small') || {}).textContent || '' }; });
/* Region Inspect condition rows: the same category identity, status chip separate */
const condStats = page => page.evaluate(() => [...document.querySelectorAll('.room[data-room="region"] .cond')].map(c => { const cs = getComputedStyle(c); return { cat:c.dataset.cat, st:[...c.classList].find(k => k.startsWith('st-')), accent:cs.borderLeftColor, name:c.querySelector('.cn').textContent.trim(), nameInk:getComputedStyle(c.querySelector('.cn')).color, icon:!!c.querySelector('.cond-i svg.ic'), chip:(c.querySelector('.st') || {}).className || '', chipWord:(c.querySelector('.st') || {}).textContent || '' }; }));

async function runConcept(browser, vp, rm, engine){
  const tag = 'c18@' + vp.join('x') + (rm ? '+rm' : '') + (engine ? '+' + engine : '');
  const main = vp[0] === 1280 && !rm && !engine;
  const { ctx, page } = await newPage(browser, vp, rm ? { reducedMotion:'reduce' } : {});
  await page.goto(url(PAGE)); await wait(700);
  let s = await st(page);
  const sw = await page.$$eval('.vswitch, [data-link]', es => es.length);
  check(tag + ': loads (HUD, main map, five tools, Pause / speed), no console errors, nothing selected, no banner, clock running, Map View popover closed; Organic is THE plant link (no review-only Bridge / Docked / Organic switch anywhere)', (await isVisible(page, '#hud')) && (await isVisible(page, '#mapwrap svg')) && (await page.$$('#tools .tool')).length === 5 && (await isVisible(page, '#ckPause')) && sw === 0 && page._errs.length === 0 && s.sel === null && !s.banner && !s.paused && !s.pop && s.link === 'organic', { errs:page._errs.slice(0, 3), s, sw });
  check(tag + ': Planet View no horizontal scroll', await noHScroll(page));
  const fit = await page.evaluate(() => { const svg = document.querySelector('#mapwrap svg'); const zone = document.getElementById('mapzone').getBoundingClientRect(); const r = svg.getBoundingClientRect(); const vb = svg.getAttribute('viewBox').split(' ').map(Number); const bg = svg.querySelector(':scope > rect'); return { svgW:Math.round(r.width), zoneW:Math.round(zone.width), boxAR:r.width / r.height, vbAR:vb[2] / vb[3], bgCovers:+bg.getAttribute('x') <= vb[0] && +bg.getAttribute('width') >= vb[2] - .5 && +bg.getAttribute('height') >= vb[3] - .5, vb:svg.getAttribute('viewBox') }; });
  check(tag + ': main map fills the available width (unchanged Concept 15 / 16 rule)', fit.svgW >= fit.zoneW - 2 && Math.abs(fit.boxAR - fit.vbAR) < .01 && fit.bgCovers, fit);
  results.geometry[tag] = { fit };
  // banner rules (Planet View unchanged)
  const r0 = await mapRect(page);
  await clickRegion(page, 'frost', '#mapwrap'); await wait(250); s = await st(page);
  check(tag + ': clicking Frost Ridge selects it and shows the bottom region banner (X, name, status, four conditions, Inspect)', s.sel === 'frost' && s.banner && (await isVisible(page, '#banner .bx')) && /Frost Ridge/.test(await text(page, '#banner .bn-h')) && (await page.$$('#banner .bn-c .bc')).length === 4 && (await isVisible(page, '#banner [data-tool="region"]')), s);
  check(tag + ': selecting a region does not move or resize the main map', same(r0, await mapRect(page)), r0);
  /* BLOOM-026 banner: intrinsic action buttons; four category condition boxes with status kept separate */
  const bs = await page.evaluate(() => new Promise(r => requestAnimationFrame(() => r()))).then(() => bannerStats(page)); results.banner[tag] = bs;
  const sugg = bs.btns.filter(b => b.kind !== 'neutral');
  check(tag + ': banner actions are INTRINSIC-WIDTH buttons (each as wide as its own content, ± 2 px; no flex-grow), with comfortable padding (≥ 12 px each side) and strong touch targets (≥ 44 px tall), all inside the banner', bs.btns.length === 3 && bs.btns.every(b => Math.abs(b.w - b.nat) <= 2 && b.grow === '0' && b.padL >= 12 && b.padR >= 12 && b.h >= 44) && bs.inside, bs.btns);
  check(tag + ': the green / blue SUGGESTION buttons do not stretch across unused width: each ≤ 34 % of the action row, together < 60 % of it, grouped under a short "Would help" caption after Inspect region', sugg.length === 2 && sugg.every(b => b.w <= bs.aW * .34) && sugg.reduce((a, b) => a + b.w, 0) < bs.aW * .6 && sugg.map(b => b.kind).sort().join() === 'planet,plant' && bs.help && /Would help/i.test(bs.helpCap) && bs.btns[0].kind === 'neutral' && /Inspect region/.test(bs.btns[0].t), { aW:bs.aW, sugg, helpCap:bs.helpCap });
  const CAT_ACC = { Temperature:'rgb(217, 96, 31)', Water:'rgb(59, 143, 208)', Soil:'rgb(138, 106, 62)', Hazard:'rgb(138, 91, 184)' };
  const idOk = bx => bx.length === 4 && bx.map(b => b.cat).join() === 'Temperature,Water,Soil,Hazard' && bx.every(b => b.accent === CAT_ACC[b.cat] && b.accentW >= 4 && b.icon && b.label === b.cat && /gradient/.test(b.bg) && b.badge && b.badge.icon && b.inBanner) && new Set(bx.map(b => b.accent)).size === 4 && new Set(bx.map(b => b.labelInk)).size === 4 && new Set(bx.map(b => b.iconInk)).size === 4;
  check(tag + ': FOUR CONDITION BOXES with distinct CATEGORY identity in every state (Temperature orange, Water blue, Soil brown, Hazard purple: accent bar, tinted icon disc, category-coloured label, faint category wash); four different accents, label inks and icon inks; each box has an icon and its category name (not colour alone)', idOk(bs.boxes), bs.boxes.map(b => ({ cat:b.cat, st:b.st, accent:b.accent, labelInk:b.labelInk, iconInk:b.iconInk })));
  const tb2 = bs.boxes.find(b => b.cat === 'Temperature'), ok2 = bs.boxes.filter(b => b.st === 'st-ok');
  check(tag + ': STATUS is separate from category: Frost Ridge\'s Too cold Temperature box keeps its orange category accent and adds a red "Blocked" status badge (icon + word) and status-coloured reading; the OK boxes show a green check badge (icon, word for screen readers), not a category change', tb2 && tb2.st === 'st-bad' && tb2.accent === CAT_ACC.Temperature && /Blocked/.test(tb2.badge.word) && /sb-bad/.test(tb2.badge.cls) && tb2.badge.visibleWord && tb2.valueInk !== ok2[0].valueInk && ok2.length === 3 && ok2.every(b => /sb-ok/.test(b.badge.cls) && /OK/.test(b.badge.word) && !b.badge.visibleWord), { tb2, ok2:ok2.map(b => b.badge) });
  if (main) { await page.mouse.move(4, 300); await wait(150); await shot(page, '01-planet-region-popup.png'); await shot(page, '02-popup-action-buttons.png', await clipOf(page, '#banner .bn-a', 10)); await shot(page, '03-popup-condition-boxes.png', await clipOf(page, '#banner .bn-c', 10)); }
  await page.evaluate(() => ROOMS26.selectHome('marsh')); await wait(200); const bm = await bannerStats(page); const wb = bm.boxes.find(b => b.cat === 'Water');
  check(tag + ': an unfavourable reading keeps its category: Marsh Low\'s Soggy Water box is still the blue Water box (same accent, label ink and icon ink as an OK Water box) with an amber "Strained" badge (icon + word) and an amber reading; the four boxes stay a distinct category set', idOk(bm.boxes) && wb && wb.st === 'st-warn' && wb.value === 'Soggy' && wb.accent === CAT_ACC.Water && wb.labelInk === bs.boxes.find(b => b.cat === 'Water').labelInk && wb.iconInk === bs.boxes.find(b => b.cat === 'Water').iconInk && /sb-warn/.test(wb.badge.cls) && /Strained/.test(wb.badge.word) && wb.badge.visibleWord && wb.valueInk !== bs.boxes.find(b => b.cat === 'Water').valueInk, wb);
  await clickRegion(page, 'frost', '#mapwrap'); await wait(200);
  await page.click('#ckPause'); await wait(120); const sP = await st(page); await page.click('#ckSpeed'); await wait(120); const sS = await st(page); await page.click('#ckPause'); await wait(120);
  check(tag + ': Pause and Speed do NOT close the banner or change the selection', sP.paused && sP.banner && sP.sel === 'frost' && sS.banner && sS.sel === 'frost' && !(await st(page)).paused, { sP, sS });
  const ocean = await page.evaluate(() => { const z = document.getElementById('mapzone').getBoundingClientRect(); for (const p of [[z.left + 24, z.bottom - 24], [z.right - 24, z.top + 24], [z.left + 24, z.top + 90], [z.right - 24, z.bottom - 24]]) { const el = document.elementFromPoint(p[0], p[1]); if (el && !el.closest('.rg, button, .banner, .lenspop, [role="button"]') && el.closest('#mapzone')) return { x:p[0], y:p[1] }; } return null; });
  if (ocean) { await page.mouse.click(ocean.x, ocean.y); await wait(250); } s = await st(page);
  check(tag + ': clicking empty map / ocean closes the banner and deselects', !!ocean && s.sel === null && !s.banner, { ocean, s });
  await clickRegion(page, 'frost', '#mapwrap'); await wait(200); await page.click('#banner .bx'); await wait(250); s = await st(page);
  check(tag + ': the X-in-a-circle closes the banner and deselects', s.sel === null && !s.banner, s);
  // ── Map View popover (BLOOM-025) ──
  await page.click('[data-tool="mapview"]'); await wait(200);
  let pp = await popStats(page);
  check(tag + ': Map View opens a compact popover DIRECTLY UNDER the Map View button (top below the button, left aligned within the button\'s width, inside the viewport), focus inside it, aria-expanded true', !pp.hidden && pp.expanded === 'true' && pp.top > pp.btnBottom && pp.top < pp.btnBottom + 24 && Math.abs(pp.left - pp.btnLeft) <= 40 && pp.right <= pp.vw && pp.focusIn, pp);
  check(tag + ': the popover holds ONLY the five view choices (Plants / Normal, Temperature, Water, Soil, Hazard) and a short caption: no explanatory paragraph, no colour key, no instruction text', pp.items.join('|') === 'Plants / Normal|Temperature|Water|Soil|Hazard' && pp.extras === 0 && pp.text.replace(/\s+/g, '') === 'MapView' + pp.items.join('').replace(/\s+/g, '') && pp.h < 320, pp);
  const tb = await hoverEl(page, '#lenspop [data-lens="temp"]'); const sH = await st(page); await page.mouse.move(4, 300); await wait(200); const sL = await st(page);
  await page.mouse.click(tb.x + tb.width / 2, tb.y + tb.height / 2); await wait(200); const sC = await st(page);
  await hoverEl(page, '#lenspop [data-lens="water"]'); const sH2 = await st(page); if (main) await shot(page, '11-planet-mapview-popover.png'); await page.mouse.move(4, 300); await wait(200); const sL2 = await st(page);
  check(tag + ': Map View: hover previews Temperature without setting it, leaving the popover restores, click sets it (popover stays open for comparison), hovering Water previews over the set layer and leaving returns to Temperature', sH.lensPv === 'temp' && sH.lens === null && sH.mainLens === 'temp' && sL.mainLens === null && sC.lens === 'temp' && sC.mainLens === 'temp' && sC.pop && sH2.lensPv === 'water' && sH2.mainLens === 'water' && sH2.lens === 'temp' && sL2.mainLens === 'temp', { sH, sL, sC, sH2, sL2 });
  await hoverEl(page, '#lenspop [data-lens="soil"]'); await page.evaluate(() => window.dispatchEvent(new Event('blur'))); await wait(120); const sB = await st(page);
  check(tag + ': hover reset: the window losing focus ends a layer preview at once', sB.lensPv === null && sB.mainLens === 'temp', sB);
  await page.focus('#lenspop [data-lens="soil"]'); await wait(120); const sF = await st(page); await page.click('#lenspop [data-lens=""]'); await wait(120);
  check(tag + ': keyboard focus on a view choice previews it too; clicking Plants / Normal clears the layer', sF.lensPv === 'soil' && sF.mainLens === 'soil' && (await st(page)).lens === null, sF);
  await page.keyboard.press('Escape'); await wait(120); pp = await popStats(page); const escFocus = await page.evaluate(() => document.activeElement && document.activeElement.dataset.tool === 'mapview');
  check(tag + ': Escape closes the popover and returns focus to the Map View button', pp.hidden && pp.expanded === 'false' && escFocus, { pp, escFocus });
  await page.click('[data-tool="mapview"]'); await wait(120); await page.click('[data-tool="mapview"]'); await wait(120); const tog = (await popStats(page)).hidden;
  await page.click('[data-tool="mapview"]'); await wait(120); const sOpen = await st(page); await page.click('#ckPause'); await wait(150); const sPz = await st(page); const closedByPause = (await popStats(page)).hidden; await page.click('#ckPause'); await wait(100);
  await page.click('[data-tool="mapview"]'); await wait(120); await clickRegion(page, 'frost', '#mapwrap'); await wait(200); const sRg = await st(page); const closedByMap = (await popStats(page)).hidden;
  check(tag + ': the popover closes on tool toggle, on an outside click (Pause: the clock still toggles, the selection is untouched) and on a map click (the region still selects and the banner shows)', tog && sOpen.pop && closedByPause && sPz.paused && sPz.sel === sOpen.sel && closedByMap && sRg.sel === 'frost' && sRg.banner, { tog, sOpen, sPz, closedByPause, sRg, closedByMap });
  await page.click('#banner .bx'); await wait(150);
  await page.click('[data-tool="mapview"]'); await wait(120); await page.click('[data-tool="adapt"]'); await wait(500); const sRoom = await st(page); const popInRoom = (await popStats(page)).hidden; await page.keyboard.press('Escape'); await wait(300);
  check(tag + ': opening a room (tool toggle) closes the popover; Escape in the room closes the room, not a popover', popInRoom && sRoom.room === 'adapt' && (await st(page)).room === null, { sRoom, popInRoom });
  // ── rooms ──
  const trees = {}, bx = {};
  for (const room of ROOMS) {
    await clickRegion(page, 'frost', '#mapwrap'); await wait(200);
    await page.click('[data-tool="' + room + '"]'); await wait(600); s = await st(page);
    const pill = await page.$eval('.room[data-room="' + room + '"] .paused', e => e.classList.contains('on') && getComputedStyle(e).opacity === '1').catch(() => false);
    const b = await boxes(page, room); bx[room] = b;
    check(tag + ' ' + room + ': opens from its tool, AUTO-PAUSES, PAUSED pill on; the home selection is CLEARED and Frost Ridge becomes the room context on the mini-map', s.paused && pill && (await isVisible(page, '.room[data-room="' + room + '"]')) && s.sel === null && !s.banner && s.ctx === 'frost' && s.miniSel.every(x => x === 'frost') && /Frost Ridge/.test(await text(page, '.room[data-room="' + room + '"] .mm-name')), { s, pill });
    check(tag + ' ' + room + ': FLOATS OVER THE WORLD (Concept 16 intact): Planet View stays mounted and visible underneath, blurred and dimmed, inert and aria-hidden; the room layer is translucent and the room itself has no opaque background', !b.planetHidden && b.planetInert && b.planetAria === 'true' && /blur\(/.test(b.planetFilter) && /blur\(/.test(b.hudFilter) && /rgba\(.*, 0\.\d+\)$/.test(b.roomsBg) && /rgba\(0, 0, 0, 0\)|transparent/.test(b.roomBg), b);
    const pt = await page.evaluate(() => { const svg = document.querySelector('#mapwrap svg'); const r = svg.getBoundingClientRect(); return { x:r.left + r.width * .55, y:r.top + r.height * .55 }; });
    const over = await page.evaluate(p => { const el = document.elementFromPoint(p.x, p.y); return el ? (el.closest('#rooms') ? 'rooms' : el.closest('#planet') ? 'planet' : el.tagName) : 'none'; }, pt);
    const sBefore = await st(page); await page.mouse.click(pt.x, pt.y); await wait(200); const sAfter = await st(page);
    check(tag + ' ' + room + ': a click where the blurred world shows through hits the room layer, not the planet: selection and room context unchanged', over === 'rooms' && sAfter.sel === sBefore.sel && sAfter.ctx === sBefore.ctx && sAfter.room === room, { over, sBefore, sAfter });
    check(tag + ' ' + room + ': no horizontal scroll, no console errors', (await noHScroll(page)) && page._errs.length === 0, page._errs.slice(0, 2));
    const pausedTxt = await text(page, '.room[data-room="' + room + '"] .paused'), resumeTxt = await text(page, '.room[data-room="' + room + '"] [data-act="resume"]');
    check(tag + ' ' + room + ': header names the room and offers Planet, four room links; the pause pill says exactly PAUSED (no "strategy mode") and the button exactly Resume (no "play")', (await text(page, '.room[data-room="' + room + '"] h2')).length > 2 && (await page.$$('.room[data-room="' + room + '"] [data-room-go]')).length === 4 && (await isVisible(page, '.room[data-room="' + room + '"] [data-act="resume"]')) && (await isVisible(page, '.room[data-room="' + room + '"] [data-act="back"]')) && pausedTxt === 'PAUSED' && resumeTxt === 'Resume', { pausedTxt, resumeTxt });
    check(tag + ' ' + room + ': CONTENT-HEIGHT side boxes (Concept 16 intact): the lower-left info box and the right-hand context box are as tall as their content; the right column is a mini-map box plus its own context box (one box in Region Inspect)', (room === 'region' ? !b.ctxSeparate : b.ctxSeparate && b.ctx.bottom <= b.zoneBottom + 1 && Math.abs(b.ctx.slack) <= 6) && b.info && (Math.abs(b.info.slack) <= 6 || b.info.scrolls) && b.info.bottom <= b.zoneBottom + 1, b);
    const mmSel = '.room[data-room="' + room + '"] .mm-map';
    check(tag + ' ' + room + ': has a smaller interactive map in the right column; the mini-map box is not overflowed by its own content (the region strip is the part that scrolls, never hidden under the context box)', (await isVisible(page, mmSel + ' svg.bm-map')) && b.mmOverflow <= 2, { mmOverflow:b.mmOverflow, mm:b.mm, ctx:b.ctx });
    if (room !== 'terraform') { const sr = await stripRows(page, room); check(tag + ' ' + room + ': THREE ordinary region pills still fit across the right column strip', sr.row1 === 3 && sr.slack >= 0, sr); }
    await clickRegion(page, 'dust', mmSel); await wait(250); s = await st(page);
    check(tag + ' ' + room + ': clicking Dust Reach on the mini-map changes the ROOM context only (home selection stays empty)', s.ctx === 'dust' && s.sel === null && /Dust Reach/.test(await text(page, '.room[data-room="' + room + '"] .mm-name')), s);
    const hp = await regionPoint(page, 'salt', mmSel);
    if (hp) { await page.mouse.move(hp.x, hp.y); await wait(200); }
    const peekOn = !!hp && /Salt Flats/.test(await text(page, '.room[data-room="' + room + '"] .mm-peek'));
    await page.mouse.move(2, 2); await wait(150);
    check(tag + ' ' + room + ': hovering Salt Flats on the mini-map peeks its status; moving away resets the peek', peekOn && !/Salt Flats/.test(await text(page, '.room[data-room="' + room + '"] .mm-peek')));
    /* BLOOM-025: right-panel region pill hover → mini-map outline + peek; leave → selected context restored; click → selects */
    const pillSel = '.room[data-room="' + room + '"] .mm-strip [data-r="salt"]';
    const p0 = await pillPeek(page, room);
    await hoverEl(page, pillSel); const p1 = await pillPeek(page, room);
    if (main && room === 'spread') await shot(page, '17-region-pill-hover-minimap.png', await clipOf(page, '.room[data-room="spread"] .z-map', 8));
    const emptyPt = await page.$eval('.room[data-room="' + room + '"] .mm', e => { const r = e.getBoundingClientRect(); return { x:r.right - 6, y:r.top + 6 }; });
    await page.mouse.move(emptyPt.x, emptyPt.y); await wait(200); const p2 = await pillPeek(page, room);
    await page.focus(pillSel); await wait(150); const p3 = await pillPeek(page, room); await page.evaluate(() => document.activeElement.scrollIntoView({ block:'nearest' })); await page.evaluate(() => document.querySelector('.room:not([hidden]) h2').focus()); await wait(150); const p4 = await pillPeek(page, room);
    await hoverEl(page, pillSel); await page.evaluate(() => window.dispatchEvent(new Event('blur'))); await wait(120); const p5 = await pillPeek(page, room);
    await page.$eval(pillSel, e => { e.scrollIntoView({ block:'nearest' }); e.click(); }); await wait(200); const p6 = await pillPeek(page, room);   // a plain click on the pill (programmatic: Firefox's scroll container intercepts a synthetic pointer click on a scrolled chip)
    check(tag + ' ' + room + ': hovering the Salt Flats REGION PILL outlines Salt Flats on the mini-map (hover outline = the outline the selection later uses) and peeks its status WITHOUT selecting (context stays Dust Reach); moving onto empty panel space restores the selected context; keyboard focus does the same and blur restores; the window losing focus restores; a CLICK selects it; the peek never changes the panel\'s layout (same peek height, strip does not move)', p0.hov === '' && p1.hov !== '' && /Salt Flats/.test(p1.peek) && p1.peekH === p0.peekH && p1.stripTop === p0.stripTop && p1.pk.join() === 'salt' && p1.ctx === 'dust' && p1.miniSel === 'dust' && p1.pressed.join() === 'dust' && p2.hov === '' && p2.pk.length === 0 && !/Salt Flats/.test(p2.peek) && p2.ctx === 'dust' && p3.hov === p1.hov && p3.peekState === 'salt' && p4.hov === '' && p4.peekState === null && p5.hov === '' && p6.ctx === 'salt' && p6.sel === p1.hov && p6.pressed.join() === 'salt', { p0, p1:Object.assign({}, p1, { hov:p1.hov.slice(0, 20), sel:p1.sel.slice(0, 20) }), p2:Object.assign({}, p2, { hov:p2.hov.slice(0, 20), sel:p2.sel.slice(0, 20) }), p3:{ hov:p3.hov.slice(0, 20), peekState:p3.peekState }, p4:{ hov:p4.hov.slice(0, 20), peekState:p4.peekState }, p5:{ hov:p5.hov.slice(0, 20) }, p6:Object.assign({}, p6, { hov:p6.hov.slice(0, 20), sel:p6.sel.slice(0, 20) }) });
    await clickRegion(page, 'dust', mmSel); await wait(200); await page.mouse.move(2, 2); await wait(100);
    const mlb = await hoverEl(page, '.room[data-room="' + room + '"] .mm-lens [data-lens="hazard"]'); const mH = await st(page); await page.mouse.move(2, 2); await wait(150); const mL = await st(page);
    await page.mouse.click(mlb.x + mlb.width / 2, mlb.y + mlb.height / 2); await wait(150); const mC = await st(page); await page.click('.room[data-room="' + room + '"] .mm-lens [data-lens=""]'); await wait(100);
    check(tag + ' ' + room + ': mini-map Map View chips: hover previews Hazard, leaving restores, click sets', mH.lensPv === 'hazard' && mH.miniLens.every(x => x === 'hazard') && mL.miniLens.every(x => x === null) && mC.lens === 'hazard' && (await st(page)).lens === null, { mH, mL, mC });
    if (room !== 'region') {
      const t = await treeStats(page, room); trees[room] = t;
      check(tag + ' ' + room + ': renders a tree (' + t.kind + ': ' + t.nodes + ' nodes, ' + t.edges + ' edges), no node collisions, nodes inside the tree area', t.nodes >= 8 && t.edges >= 7 && t.overlaps === 0 && t.outside === 0, { nodes:t.nodes, edges:t.edges, overlaps:t.overlaps, outside:t.outside });
      if (room !== 'terraform') {
        check(tag + ' ' + room + ': plant upper-left, info lower-left, tree centre, mini-map right; one leader per category, no two leaders cross (sampled geometry), each with a label plate', t.zones.every(Boolean) && t.leaders === (room === 'adapt' ? 4 : 3) && t.crossings === 0 && t.plates === t.leaders, { zones:t.zones, leaders:t.leaders, crossings:t.crossings, plates:t.plates });
        const cc = await catColours(page, room); results.colours[tag + ':' + room] = cc;
        const cats = Object.keys(cc); const consistent = cats.every(c => { const v = cc[c]; return v.label === v.node && v.node === v.glow && v.port === v.anchor && v.anchor === v.labelInk; }); const distinct = new Set(cats.map(c => cc[c].label)).size === cats.length;
        check(tag + ' ' + room + ': category colours: one colour per category on label border, node accent and leader glow (one darker shade on label ink, port and anchor); ' + cats.length + ' categories, all distinct', cats.length === (room === 'adapt' ? 4 : 3) && consistent && distinct, cc);
      }
      const host = '.room[data-room="' + room + '"]';
      if (room !== 'terraform') {
        /* BLOOM-026 Organic: the only link, much thicker, clear space between neighbours, one chain anchor → plate → tendril → port */
        const o = await organicStats(page, room); results.organic[tag + ':' + room] = o;
        check(tag + ' ' + room + ': ORGANIC is the normal treatment: ' + o.n + ' smooth (cubic) tendrils, each with a vein; no bridge, socket, entry stub or lane bay; a clear gutter between the cards (1.5–2.4 em)', o.n === (room === 'adapt' ? 4 : 3) && o.curves === o.n && o.veins === o.n && o.other === 0 && /none|normal/.test(o.bay) && o.gutter >= 1.5 * o.em && o.gutter <= 2.4 * o.em, o);
        check(tag + ' ' + room + ': every node title stays inside its card and its text column (Concept 17 let Antifreeze / Waterborne run past the card edge): a title whose longest word cannot fit is scaled down just enough (never below 80 %), all others keep their size', o.titleRoom >= 3 && o.titleCol >= -1 && o.fitted.every(f => +f.split(':')[1] >= .8), { titleRoom:o.titleRoom, titleCol:o.titleCol, fitted:o.fitted, nodeW:o.nodeW });
        check(tag + ' ' + room + ': tendrils are THICK (idle ≥ 8.5 px, lit ≥ 12.5 px and ≥ 1.4× idle, glow ≥ 1.8× lit), yet never touch: ≥ 3 px clear between neighbouring tendrils at rest and ≥ 1.5 px with one lit; anchors, ports and label plates are wider than a lit tendril (the chain still reads, nothing is hidden)', o.w >= 8.5 && o.lit >= 12.5 && o.lit >= 1.4 * o.w && o.glow >= 1.8 * o.lit && o.edgeGap >= 3 && o.litGap >= 1.5 && 2 * o.anchorR > o.lit && 2 * o.portR > o.lit && o.plateOver, o);
        if (main && room === 'adapt') { await page.mouse.move(4, 300); await wait(150); await shot(page, '04-adapt-organic.png'); }
      }
      const nodeId = room === 'adapt' ? 'cold' : room === 'spread' ? 'waterSeeds' : 'warm';
      const before = await specParts(page, host); const infoBefore = await text(page, host + ' .lf-info');
      const sceneBefore = room === 'terraform' ? await page.$eval(host + ' .scene stop', e => e.getAttribute('stop-color')) : '';
      await hoverEl(page, host + ' .node[data-node="' + nodeId + '"]');
      const after = await specParts(page, host);
      const pv = await page.evaluate(([host, room]) => { const r = document.querySelector(host); const tint = r.querySelector('.mm-map .tint'); const info = r.querySelector('.lf-info'); return { infoPv:info.classList.contains('pv'), infoCat:info.dataset.cat || '', infoBorder:getComputedStyle(info).borderColor, info:info.textContent.replace(/\s+/g, ' ').trim(), open:r.querySelectorAll('.mm-map .pv-open').length, arcs:r.querySelectorAll('.mm-map .seedarc').length, tint:+tint.getAttribute('opacity'), previewing:!!r.querySelector('.bm-spec.previewing'), glow:[...new Set([...r.querySelectorAll('.bm-spec [data-f].glow')].map(n => n.dataset.f))], ldOn:r.querySelectorAll('.leaders .ld.on').length, ldOnW:r.querySelector('.leaders .ld.on') ? parseFloat(getComputedStyle(r.querySelector('.leaders .ld.on')).strokeWidth) : 0, plateOn:r.querySelectorAll('.leaders .aplate.on').length, glowOn:r.querySelector('.leaders .lead-g.on .ld-glow') ? +getComputedStyle(r.querySelector('.leaders .lead-g.on .ld-glow')).opacity : 0, ctx:(r.querySelector('.mm-ctx') || {}).textContent || '', ctxCat:(r.querySelector('.mm-ctx') || { dataset:{} }).dataset.cat || '', scenePv:!!r.querySelector('.scene.pv'), sceneStop:r.querySelector('.scene stop') ? r.querySelector('.scene stop').getAttribute('stop-color') : '', globeOpen:[...r.querySelectorAll('.globe .land.open')].map(e => e.dataset.r), globePv:!!r.querySelector('.globe.pv'), readout:(r.querySelector('.e-tp') || {}).textContent || '', specimens:r.querySelectorAll('.bm-spec').length, leadOn:r.querySelectorAll('.edges .edge.lead.on').length, ringOn:r.querySelectorAll('.edges .ring.on').length, pinOn:r.querySelectorAll('.edges .pin.on').length, catLabel:r.querySelector('.tree .cat-l[data-cat]') ? getComputedStyle(r.querySelector('.tree .node.pv')).borderLeftColor : '' }; }, [host, room]);
      if (room === 'adapt') check(tag + ' adapt: hovering Cold Tolerance previews on the PLANT, explains it in the LEFT info block (coloured Temperature), lights the Stem leader THICK with a glow and a filled plate, marks regions on the mini-map and colours the region-effect box', after.plant !== before.plant && after.env === before.env && pv.previewing && pv.glow.includes('temp') && pv.infoPv && pv.infoCat === 'Temperature' && pv.infoBorder === pv.catLabel && /Cold Tolerance/.test(pv.info) && /120 Biomass/.test(pv.info) && /Changes Stem/i.test(pv.info) && pv.ldOn === 1 && pv.ldOnW >= 5 && pv.plateOn === 1 && pv.glowOn > 0 && pv.open >= 1 && /Opens .*Frost Ridge/.test(pv.ctx) && pv.ctxCat === 'Temperature', { plantChanged:after.plant !== before.plant, pv:Object.assign({}, pv, { info:pv.info.slice(0, 80) }) });
      if (room === 'spread') check(tag + ' spread: hovering Waterborne Seeds previews on the plant, explains it in the left block (coloured Reach), lights the Pods leader thick with a plate and draws dispersal arcs on the mini-map', after.plant !== before.plant && after.env === before.env && pv.glow.includes('spread') && pv.infoPv && pv.infoCat === 'Reach' && /Waterborne Seeds/.test(pv.info) && /Changes Pods/i.test(pv.info) && pv.ldOn === 1 && pv.ldOnW >= 5 && pv.plateOn === 1 && pv.arcs >= 1 && /Tide Isle/.test(pv.ctx), { arcs:pv.arcs, glow:pv.glow, ldOn:pv.ldOn, ldOnW:pv.ldOnW, info:pv.info.slice(0, 80) });
      if (room === 'terraform') check(tag + ' terraform: hovering Warm the Sky changes the LAND SCENE, the GLOBE and the mini-map tint, lights its leader and its RING on the atmosphere halo, shows 14 → 20 °C in the readout and explains it in the left block; there is no plant drawing in the room', pv.scenePv && pv.sceneStop !== sceneBefore && pv.globePv && pv.globeOpen.length >= 1 && pv.tint > 0 && pv.open >= 1 && /20 °C/.test(pv.readout) && pv.infoPv && /Warm the Sky/.test(pv.info) && /not the plant/i.test(pv.info) && pv.specimens === 0 && pv.leadOn === 1 && pv.ringOn === 1 && pv.pinOn === 0, { sceneBefore, pv:Object.assign({}, pv, { info:pv.info.slice(0, 80) }) });
      if (main) await shot(page, room === 'adapt' ? '05-adapt-organic-hover.png' : room === 'spread' ? '06-spread-organic.png' : '18-terraform-hover.png');
      if (!rm && !engine && vp[0] !== 1280 && (room === 'adapt' || room === 'terraform')) await shot(page, (vp[0] === 1024 ? (room === 'adapt' ? '12' : '13') : (room === 'adapt' ? '14' : '15')) + '-' + vp[0] + '-' + room + '.png');
      /* HOVER RESET transitions (BLOOM-025): node → node, node → empty tree space, node → another panel, node → globe, window blur */
      const other = room === 'adapt' ? 'heat' : room === 'spread' ? 'earlyMat' : 'cool';
      await hoverEl(page, host + ' .node[data-node="' + other + '"]'); const hN = await hoverState(page, room);
      check(tag + ' ' + room + ': node → another node: the new node previews and the old preview is gone (exactly one lit node)', hN.hovered === other && hN.infoPv && hN.nodePv === 1, hN);
      await hoverEl(page, host + ' .node[data-node="' + nodeId + '"]');
      const empty = await page.$eval(host + ' .tree', e => { const r = e.getBoundingClientRect(); return { x:r.left + 10, y:r.top + 10 }; });
      await page.mouse.move(empty.x, empty.y); await wait(250);
      const onEmpty = await page.evaluate(([h, p]) => { const el = document.elementFromPoint(p.x, p.y); return { overNode:!!(el && el.closest('.node')), inTree:!!(el && el.closest('.tree')) }; }, [host, empty]);
      const hE = await hoverState(page, room); const restored = await specParts(page, host); const infoAfter = await text(page, host + ' .lf-info');
      check(tag + ' ' + room + ': node → EMPTY tree space (pointer still inside the tree box): the visual, the info block, the mini-map, the links and the node state restore at once', !onEmpty.overNode && onEmpty.inTree && !hE.infoPv && hE.pvOpen === 0 && !hE.previewing && !hE.scenePv && !hE.globePv && hE.hovered === null && hE.nodePv === 0 && hE.litLinks === 0 && restored.plant === before.plant && restored.env === before.env && infoAfter === infoBefore, { onEmpty, hE, infoBefore:infoBefore.slice(0, 50), infoAfter:infoAfter.slice(0, 50) });
      await hoverEl(page, host + ' .node[data-node="' + nodeId + '"]'); await hoverEl(page, host + ' .mm-map'); const hP = await hoverState(page, room);
      check(tag + ' ' + room + ': node → ANOTHER PANEL (the mini-map box): the preview clears', hP.hovered === null && !hP.infoPv && hP.litLinks === 0 && !hP.scenePv, hP);
      await hoverEl(page, host + ' .node[data-node="' + nodeId + '"]'); await page.evaluate(() => window.dispatchEvent(new Event('blur'))); await wait(120); const hB = await hoverState(page, room);
      check(tag + ' ' + room + ': node → WINDOW BLUR: the preview clears', hB.hovered === null && !hB.infoPv && hB.litLinks === 0, hB);
      await page.mouse.move(2, 2); await wait(200);
      check(tag + ' ' + room + ': leaving the tree altogether also leaves everything restored', (await page.evaluate(h => document.querySelector(h + ' .mm-map .pv-open, ' + h + ' .mm-map .seedarc') === null && !document.querySelector(h + ' .lf-info').classList.contains('pv'), host)));
      if (room === 'terraform') {
        await hoverEl(page, host + ' .node[data-node="warm"]'); const gb = await (await page.$(host + ' .globe')).boundingBox(); await page.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2); await wait(250); const hG = await hoverState(page, room);
        check(tag + ' terraform: node → GLOBE: the preview clears (scene, globe, readout, links)', hG.hovered === null && !hG.scenePv && !hG.globePv && !hG.infoPv && hG.litLinks === 0, hG);
        await page.mouse.move(2, 2); await wait(150);
        /* BLOOM-026 fixes of two Concept 17 leftovers: the readout's region line was not reset when a hover ended, and the
           taller readout then pushed the region strip out of the mini-map box */
        const rdOf = () => page.evaluate(() => { const sec = document.querySelector('.room[data-room="terraform"]'); const mm = sec.querySelector('.mm').getBoundingClientRect(), stp = sec.querySelector('.mm-strip').getBoundingClientRect(); return { text:sec.querySelector('.mc-open').textContent.replace(/\s+/g, ' ').trim(), over:Math.round(stp.bottom - mm.bottom), stripH:Math.round(stp.height), mapH:Math.round(sec.querySelector('.mm-map').getBoundingClientRect().height) }; });
        const rd0 = await rdOf(); await hoverEl(page, host + ' .node[data-node="warm"]'); const rd1 = await rdOf(); await page.mouse.move(2, 2); await wait(200); const rd2 = await rdOf();
        check(tag + ' terraform: hover reset also restores the Planet readout\'s region line (Concept 17 kept the last preview\'s lines after the hover ended); while a preview makes the readout taller the region strip stays inside the mini-map box (the map gives up height), and at rest the map is back to full size', /Hover a system/.test(rd0.text) && /Opens/.test(rd1.text) && /Hover a system/.test(rd2.text) && rd0.over <= 0 && rd1.over <= 0 && rd2.over <= 0 && rd2.mapH === rd0.mapH && rd1.stripH >= 40, { rd0, rd1, rd2 });
        const soil = t.banks.filter(n => n.cat === 'Ground'), atmo = t.banks.filter(n => n.cat !== 'Ground');
        const ys = a => a.map(n => n.y); const span = a => Math.max(...ys(a)) - Math.min(...ys(a));
        check(tag + ' terraform: SOIL bank (Ground, ' + soil.length + ' nodes) sits LEFT of the globe and the ATMOSPHERE bank (' + atmo.length + ' nodes) sits RIGHT, both spread north / south (Concept 16 banks intact)', soil.length >= 4 && atmo.length >= 7 && soil.every(n => n.x < -t.R * .6) && atmo.every(n => n.x > t.R * .6) && span(soil) > t.R * 1.6 && span(atmo) > t.R * 2.4, { R:Math.round(t.R), soil:soil.map(n => [n.id, Math.round(n.x), Math.round(n.y)]), atmo:atmo.map(n => [n.id, Math.round(n.x), Math.round(n.y)]) });
        const z = await zoneStats(page); results.terraform[tag] = z;
        const at = await atmoStats(page); results.terraform[tag].atmo = at;
        check(tag + ' terraform: ONE DIFFUSE ATMOSPHERE: a single layer (no second ring, no glow disc, no pale disc on the globe) filled with a radial gradient and NO stroke (so no drawn edge); ≥ 12 stops, opacity 0 at both ends and never jumping more than 0.1 between stops', at.count === 1 && at.extra === 0 && at.whiteDisc === 0 && at.gradient && (at.stroke === 'none' || /rgba\(0, 0, 0, 0\)/.test(at.stroke)) && at.stops >= 12 && at.first === 0 && at.last === 0 && at.maxStep <= .1, at);
        check(tag + ' terraform: the atmosphere does NOT cover the globe face (fully clear out to the visible face), is strongest where the Atmosphere rings sit (± 0.25 em), and has faded to nothing before the end of the exclusion zone; the five Atmosphere rings sit on that line and the two Soil arrows point at the surface', at.zeroTo >= at.face - .5 && Math.abs(at.peakR - at.halo) <= .25 * z.em && at.RO <= at.zone && at.peakA >= .35 && z.rings.length === 5 && z.rings.every(r => Math.abs(r - z.halo) <= 2) && z.pins === 2, { at, rings:z.rings, halo:z.halo, pins:z.pins });
        const prof = await atmoProfile(page, 'ROOMS26'); results.terraform[tag].profile = prof;
        check(tag + ' terraform: PIXEL PROBE (straight up from the globe, face to beyond the zone): the atmosphere is visible (≥ 12 brightness levels darker at its strongest point, within 0.6 em of the ring line) yet SOFT: no jump between neighbouring pixels larger than 4 levels, on either side', prof.depth >= 12 && Math.abs(prof.darkest - prof.halo) <= .6 * prof.em && prof.maxStep <= 4, prof);
        const sg = await soilGap(page, 'ROOMS26'); results.terraform[tag].soil = sg;
        check(tag + ' terraform: SOIL ARROWS (pixel probe along each arrow\'s axis): the arrow\'s first painted pixel is 1–5 px off the visible globe face, and no arrow pixel lies on the face (never touching)', sg.length === 2 && sg.every(a => a.gap !== null && a.gap >= 1 && a.gap <= 5 && a.touching === 0), sg);
        check(tag + ' terraform: EXCLUSION ZONE: no node icon, node label, category caption, lock badge, legend or readout enters the reserved radius (zone = halo outer edge + 1 em clearance); the nearest forbidden item is outside it', z.minItem.dist >= z.zone - 1 && z.legendDist >= z.zone - 1 && z.readDist >= z.zone - 1, { zone:z.zone, haloOut:z.haloOut, R:z.R, minItem:z.minItem, legendDist:z.legendDist, readDist:z.readDist, bow:z.bow });
        check(tag + ' terraform: SUBSKILL connectors (' + z.chains + ') are straight segments or short elbows along the bank and stay outside the zone (closest sampled point ≥ zone)', z.chains === 6 && z.chainStraight + z.chainElbow === z.chains && z.chainStraight >= 5 && z.chainMin >= z.zone - 1, { chains:z.chains, straight:z.chainStraight, elbow:z.chainElbow, chainMin:z.chainMin, zone:z.zone });
        check(tag + ' terraform: LOCK / owned badges (' + z.badges + ') sit on their node and never cover a Soil arrow, Atmosphere connector or subskill connector (no sampled connector point inside a badge); legend and readout text are clear of every connector', z.badges >= 8 && z.badgeHits.length === 0 && z.textHits === 0, { badges:z.badges, badgeHits:z.badgeHits, textHits:z.textHits });
        if (main) { await shot(page, '07-terraform.png'); await shot(page, '08-terraform-atmosphere-closeup.png', await clipOf(page, host + ' .tree .center', Math.round(z.zone - z.R + 2.2 * z.em))); }
        const g = await page.$(host + ' .globe'); const gb2 = await g.boundingBox(); const rot0 = await page.evaluate(() => ROOMS26.rooms.terraform.globe.rot);
        await page.mouse.move(gb2.x + gb2.width / 2, gb2.y + gb2.height / 2); await page.mouse.down(); await page.mouse.move(gb2.x + gb2.width / 2 + 140, gb2.y + gb2.height / 2, { steps:7 }); await page.mouse.up(); await wait(120);
        const rot1 = await page.evaluate(() => ROOMS26.rooms.terraform.globe.rot);
        await g.focus(); await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowLeft'); const rot2 = await page.evaluate(() => ROOMS26.rooms.terraform.globe.rot);
        check(tag + ' terraform: the globe still spins by click-drag and by arrow keys', rot1 > rot0 + .5 && rot2 < rot1 && page._errs.length === 0, { rot0, rot1, rot2 });
        await page.mouse.move(2, 2);
      }
      if (room === 'spread') {
        const pd = await padStats(page, room); results.spread[tag] = pd;
        check(tag + ' spread: BALANCED PADDING: the content-height tree card has equal top and bottom breathing room (± 3 px) and equal left and right breathing room (± 0.35 em), ≥ 0.8 em each, and the card still ends above the room bottom (not stretched)', Math.abs(pd.top - pd.bottom) <= 3 && Math.abs(pd.left - pd.right) <= .35 * pd.em + 1 && Math.min(pd.top, pd.bottom, pd.left, pd.right) >= .8 * pd.em - 1 && pd.cardBottom < pd.zoneBottom - 40, pd);
        if (main) await shot(page, '19-spread-padding.png', await clipOf(page, host + ' .z-main', 10));
      }
    } else {
      const conds = (await page.$$('.room[data-room="region"] .cond')).length;
      await page.click('#tab-colony'); await wait(150); const tabOk = (await isVisible(page, '#pane-colony')) && !(await isVisible(page, '#pane-overview')); await page.click('#tab-overview');
      check(tag + ' region: four condition rows, limiting factor, Overview / Colony / Science tabs, plant upper-left, colony info lower-left, mini-map right; the main box is content-height', conds === 4 && tabOk && (await isVisible(page, '.room[data-room="region"] .limit')) && (await isVisible(page, '.room[data-room="region"] .lf-top .bm-spec')) && (await isVisible(page, '.room[data-room="region"] .lf-info')) && b.main.bottom < b.zoneBottom - 20, { conds, tabOk, main:b.main, zoneBottom:b.zoneBottom });
      /* BLOOM-025 "Would help" buttons: intrinsic width, two columns for two actions, one column for one */
      await page.evaluate(() => ROOMS26.setCtx('frost')); await wait(200);
      const h2 = await helpStats(page);
      const one = await page.evaluate(() => BM.REGIONS.map(r => r.id).find(id => BM.view(id).fixers.length === 1) || null);
      let h1 = null; if (one) { await page.evaluate(id => ROOMS26.setCtx(id), one); await wait(200); h1 = await helpStats(page); await page.evaluate(() => ROOMS26.setCtx('frost')); await wait(200); }
      check(tag + ' region: Frost Ridge\'s two "Would help" actions are real BUTTONS of intrinsic width in a TWO-column row (same top, a visible gap, widest button < 45 % of the pane, both together < 85 % of the pane), each with comfortable padding (≥ 0.7 em)', !h2.none && h2.n === 2 && /\bn2\b/.test(h2.cls) && h2.cols === 2 && h2.sameRow && h2.gap >= 6 && h2.widest < h2.paneW * .45 && h2.sum < h2.paneW * .85 && h2.btns.every(x => x.tag === 'BUTTON' && x.padL >= .7 * b.em && x.padR >= .7 * b.em && x.h >= 2.6 * b.em), h2);
      check(tag + ' region: a region with ONE "Would help" action gets a single intrinsic-width button, not a forced second column' + (one ? ' (' + one + ')' : ' (no single-action region in the fake data: skipped)'), !one || (h1 && h1.n === 1 && /\bn1\b/.test(h1.cls) && h1.cols === 1 && h1.widest < h1.paneW * .5), h1);
      const cs2 = await condStats(page);
      check(tag + ' region: the four Region Inspect condition rows carry the SAME category identity as the banner (accent + tinted icon + category-coloured name), with the status chip kept as the status (Frost Ridge: Temperature row still orange with a Blocked chip)', cs2.length === 4 && cs2.map(c => c.cat).join() === 'Temperature,Water,Soil,Hazard' && new Set(cs2.map(c => c.accent)).size === 4 && new Set(cs2.map(c => c.nameInk)).size === 4 && cs2.every(c => c.icon && /\bst\b/.test(c.chip)) && cs2[0].st === 'st-bad' && /bad/.test(cs2[0].chip) && cs2[0].accent === 'rgb(217, 96, 31)', cs2);
      if (main) await shot(page, '10-region-inspect.png');
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
  check(tag + ': Adapt and Spread share the room family (same tree kind, same zones, same em scale); Terraform uses the banks design', trees.adapt.kind === trees.spread.kind && trees.adapt.zones.join() === trees.spread.zones.join() && trees.adapt.em === trees.spread.em && trees.terraform.kind === 'k-banks' && trees.adapt.kind === 'k-anat', { adapt:trees.adapt.kind, spread:trees.spread.kind, terraform:trees.terraform.kind });
  check(tag + ': Spread stays COMPACT (Concept 16 intact): its tree box is at least 80 px shorter than Adapt\'s and ends above the room bottom', bx.spread.main.height <= bx.adapt.main.height - 80 && bx.spread.main.bottom < bx.spread.zoneBottom - 40, { adapt:bx.adapt.main, spread:bx.spread.main, zoneBottom:bx.spread.zoneBottom });
  results.scale[tag] = { em:bx.adapt.em, by:(await st(page)).emBy };
  /* ── Organic (BLOOM-026): lit state, colour continuity, crossings, no truncation; state is untouched by the redraw ── */
  await clickRegion(page, 'frost', '#mapwrap'); await wait(150); await page.click('[data-tool="adapt"]'); await wait(500);
  await clickRegion(page, 'dust', '.room[data-room="adapt"] .mm-map'); await wait(200);
  await page.evaluate(() => ROOMS26.rooms.adapt.tree.focusNode('cold')); await wait(250);
  const oLit = await page.evaluate(() => { const sec = document.querySelector('.room[data-room="adapt"]'); const on = sec.querySelector('.leaders .ld.on'); const g = sec.querySelector('.leaders .lead-g.on'); return { cat:on && on.dataset.cat, w:on ? parseFloat(getComputedStyle(on).strokeWidth) : 0, ink:on ? getComputedStyle(on).stroke : '', glow:g ? +getComputedStyle(g.querySelector('.ld-glow')).opacity : 0, dimOthers:[...sec.querySelectorAll('.leaders .lead-g:not(.on)')].map(e => +getComputedStyle(e).opacity), plate:!!sec.querySelector('.leaders .aplate.on'), port:!!sec.querySelector('.edges .port.on'), label:getComputedStyle(sec.querySelector('.tree .cat-l[data-cat="Temperature"]')).color }; });
  const tO = await treeStats(page, 'adapt');
  check(tag + ': Organic LIT state is unmistakable: hovering / focusing Cold Tolerance lights ONLY the Temperature tendril, ≥ 12.5 px in the dark Temperature shade (the same ink as the Temperature label), over a visible glow, with its plate and port filled, the other tendrils dimmed', oLit.cat === 'Temperature' && oLit.w >= 12.5 && oLit.ink === oLit.label && oLit.glow >= .3 && oLit.plate && oLit.port && oLit.dimOthers.length === 3 && oLit.dimOthers.every(v => v <= .5), oLit);
  check(tag + ': Organic: tendrils never cross (sampled), keep their plates; nodes do not collide; no node cost line is truncated; category labels in full-text mode', tO.crossings === 0 && tO.leaders === 4 && tO.plates === 4 && tO.overlaps === 0 && tO.outside === 0 && tO.truncated.length === 0 && tO.labelMode === 'full', { crossings:tO.crossings, leaders:tO.leaders, overlaps:tO.overlaps, truncated:tO.truncated, labelMode:tO.labelMode });
  await page.mouse.move(2, 2); await page.keyboard.press('Escape'); await wait(300);
  // click commits: a fake buy persists after the pointer leaves
  await page.click('[data-tool="adapt"]'); await wait(500);
  const host = '.room[data-room="adapt"]'; const base0 = await specParts(page, host); const bio0 = await page.evaluate(() => BM.store.s.biomass);
  const nb = await hoverEl(page, host + ' .node[data-node="cold"]'); await page.mouse.click(nb.x + nb.width / 2, nb.y + nb.height / 2); await wait(300);
  const stillHover = await page.evaluate(h => ({ owned:document.querySelector(h + ' .node[data-node="cold"]').classList.contains('st-owned'), info:document.querySelector(h + ' .lf-info').textContent.replace(/\s+/g, ' ') }), host);
  await page.mouse.move(2, 2); await wait(300);
  const base1 = await specParts(page, host); const afterLeave = await page.evaluate(h => ({ owned:document.querySelector(h + ' .node[data-node="cold"]').classList.contains('st-owned'), info:document.querySelector(h + ' .lf-info').textContent.replace(/\s+/g, ' '), pv:document.querySelector(h + ' .lf-info').classList.contains('pv'), biomass:BM.store.s.biomass }), host);
  check(tag + ': CLICK COMMITS: clicking Cold Tolerance buys it (fake): Owned while still hovered, still Owned after the pointer leaves, the plant keeps the trait, the base info lists it and Biomass dropped by 120', stillHover.owned && /Owned/.test(stillHover.info) && afterLeave.owned && !afterLeave.pv && /Cold Tolerance/.test(afterLeave.info) && base1.plant !== base0.plant && Math.abs(bio0 - afterLeave.biomass - 120) < 1, { bio0, afterLeave:Object.assign({}, afterLeave, { info:afterLeave.info.slice(0, 120) }) });
  await page.keyboard.press('Escape'); await wait(300);
  // exits
  await page.click('[data-tool="spread"]'); await wait(300); await page.click('.room[data-room="spread"] [data-act="resume"]'); await wait(250);
  check(tag + ': Resume closes the room and runs the clock', await page.evaluate(() => document.getElementById('rooms').hidden && !BM.clock.paused));
  await page.click('#ckPause'); await wait(100); await page.click('[data-tool="terraform"]'); await wait(300); await page.click('.room[data-room="terraform"] [data-act="back"]'); await wait(250);
  check(tag + ': Back from a run that was already paused stays paused', await page.evaluate(() => document.getElementById('rooms').hidden && BM.clock.paused));
  await page.click('#ckPause'); await wait(100);
  // keyboard: focus previews, moving focus away resets; the blurred planet is unreachable
  await page.focus('[data-tool="adapt"]'); await page.keyboard.press('Enter'); await wait(400);
  await page.evaluate(() => ROOMS26.rooms.adapt.tree.focusNode('heat')); await wait(200);
  const fPv = await page.evaluate(() => ({ hovered:ROOMS26.rooms.adapt.tree.hovered, infoPv:document.querySelector('.room[data-room="adapt"] .lf-info').classList.contains('pv') }));
  await page.evaluate(() => document.querySelector('.room[data-room="adapt"] [data-act="back"]').focus()); await wait(200);
  const fOff = await page.evaluate(() => ({ hovered:ROOMS26.rooms.adapt.tree.hovered, infoPv:document.querySelector('.room[data-room="adapt"] .lf-info').classList.contains('pv') }));
  check(tag + ': keyboard: focusing a node previews it; moving focus out of the tree resets the preview', fPv.hovered === 'heat' && fPv.infoPv && fOff.hovered === null && !fOff.infoPv, { fPv, fOff });
  await page.focus('.room[data-room="adapt"] h2');
  const walk = await tabWalk(page, 30); await page.keyboard.press('Escape'); await wait(300);
  const focusBack = await page.evaluate(() => document.activeElement && document.activeElement.dataset.tool === 'adapt');
  check(tag + ': keyboard: 30 Tabs stay inside the room (or the review ribbon) with visible focus (the blurred Planet View is inert), Escape returns focus to the Adapt tool', walk.bad.length === 0 && walk.outside.length === 0 && walk.count >= 20 && focusBack, { bad:walk.bad.slice(0, 3), outside:walk.outside.slice(0, 3), count:walk.count, focusBack });
  // deep links
  await page.goto(url(PAGE) + '?room=adapt&region=frost&link=bridge'); await wait(600); s = await st(page);
  const oDeep = await organicStats(page, 'adapt');
  check(tag + ': deep link ?room=adapt&region=frost opens Adapt paused with Frost Ridge as the room context, nothing selected at home; an old Concept 17 ?link=bridge is ignored (still Organic, no bridge)', s.paused && s.room === 'adapt' && s.ctx === 'frost' && s.sel === null && s.link === 'organic' && oDeep.other === 0 && oDeep.curves === 4, { s, other:oDeep.other });
  await page.goto(url(PAGE) + '?lens=temp'); await wait(500); s = await st(page);
  check(tag + ': deep link ?lens=temp sets the Temperature view with the popover closed', s.lens === 'temp' && s.mainLens === 'temp' && !s.pop, s);
  const em = await emojiScan(page); results.icons[tag] = em;
  check(tag + ': no emoji anywhere on the page; inline SVG icons in use (' + em.svgIcons + ')', em.hits.length === 0 && em.svgIcons >= 40, em);
  check(tag + ': no console errors over the whole run', page._errs.length === 0, page._errs.slice(0, 3));
  await ctx.close();
}

async function runScale(browser){
  const emOf = async file => { const { ctx, page } = await newPage(browser, [1280, 800]); await page.goto(url(file) + '?room=adapt&region=frost'); await wait(700); const r = await page.evaluate(() => ({ em:parseFloat(getComputedStyle(document.querySelector('.r-adapt')).fontSize), gw:document.querySelector('.r-terraform .center') ? 0 : 0 })); await ctx.close(); return r; };
  const c17 = await emOf(PREV), c18 = await emOf(PAGE); results.scale.compare = { c17, c18 };
  check('scale: Concept 18 keeps Concept 17\'s calibrated room scale (same em at 1280×800)', c17.em === c18.em, { c17, c18 });
}

/* Concept 17 (Organic) vs Concept 18 at every viewport: tendril weights, atmosphere softness, Soil arrow gap */
async function runCompare(browser){
  for (const vp of VIEWPORTS) {
    const tag = 'compare@' + vp.join('x'); const out = {};
    for (const [k, file, hook, q] of [['c17', PREV, 'ROOMS25', '&link=organic'], ['c18', PAGE, 'ROOMS26', '']]) {
      const { ctx, page } = await newPage(browser, vp);
      await page.goto(url(file) + '?room=adapt&region=frost' + q); await wait(800);
      const idle = await organicStats(page, 'adapt');
      await page.evaluate(h => window[h].rooms.adapt.tree.focusNode('cold'), hook); await wait(250);
      const lit = await page.evaluate(() => { const on = document.querySelector('.room[data-room="adapt"] .leaders .ld.on'); return on ? parseFloat(getComputedStyle(on).strokeWidth) : 0; });
      await page.evaluate(h => window[h].open('terraform'), hook); await wait(700); await page.mouse.move(2, 2); await wait(200);
      const prof = await atmoProfile(page, hook), soil = await soilGap(page, hook);
      out[k] = { idle:idle.w, lit, prof, soil, errs:page._errs.slice(0, 2) };
      await ctx.close();
    }
    results.compare[tag] = out; const a = out.c17, b = out.c18;
    check(tag + ': Organic tendrils are MEASURABLY THICKER than Concept 17 Organic: idle ' + a.idle + ' → ' + b.idle + ' px, lit ' + a.lit + ' → ' + b.lit + ' px (both ≥ 1.5×)', b.idle >= 1.5 * a.idle && b.lit >= 1.5 * a.lit, { c17:[a.idle, a.lit], c18:[b.idle, b.lit] });
    check(tag + ': the atmosphere is SOFT where Concept 17\'s band had hard edges: largest neighbouring-pixel jump ' + a.prof.maxStep + ' → ' + b.prof.maxStep + ' brightness levels (≤ 4 and under a third of Concept 17), still visibly there', b.prof.maxStep <= 4 && b.prof.maxStep * 3 < a.prof.maxStep && b.prof.depth >= 12, { c17:a.prof, c18:b.prof });
    const gA = a.soil.map(x => x.gap), gB = b.soil.map(x => x.gap);
    check(tag + ': Soil arrows end CLOSER to the globe than Concept 17 (first painted arrow pixel off the visible face: ' + gA.join(' / ') + ' → ' + gB.join(' / ') + ' px), without touching it', gB.every((g, i) => g !== null && g >= 1 && gA[i] !== null && g < gA[i] - 1) && b.soil.every(x => x.touching === 0), { c17:a.soil, c18:b.soil });
    check(tag + ': both pages ran without console errors', !a.errs.length && !b.errs.length, { c17:a.errs, c18:b.errs });
  }
  if (SHOTS) {   /* close-ups at 3× device pixels: the Soil arrow against the globe, Concept 17 for reference and Concept 18 */
    for (const [file, hook, name] of [[PREV, 'ROOMS25', '09b-c17-soil-arrow-closeup-reference.png'], [PAGE, 'ROOMS26', '09-terraform-soil-arrow-closeup.png']]) {
      const { ctx, page } = await newPage(browser, [1280, 800], { deviceScaleFactor:3 });
      await page.goto(url(file) + '?room=terraform&region=frost'); await wait(900); await page.mouse.move(2, 2);
      const g = await globeGeo(page, hook); const a = g.pins.reduce((p, q) => Math.abs(Math.abs(q) - Math.PI) < Math.abs(Math.abs(p) - Math.PI) ? q : p);
      const r = g.face + 1.1 * g.em; const c = { x:g.cx + Math.cos(a) * r, y:g.cy + Math.sin(a) * r };
      await page.screenshot({ path:path.join(OUT, name), clip:{ x:c.x - 70, y:c.y - 40, width:140, height:80 } });
      await ctx.close();
    }
  }
}

/* the Planet View banner at narrower widths: buttons stay intrinsic, wrap onto more rows, and stay inside the banner */
async function runBannerWrap(browser){
  for (const vp of [[1024, 768], [800, 720], [600, 720]]) {
    const { ctx, page } = await newPage(browser, vp);
    await page.goto(url(PAGE) + '?region=frost'); await wait(700);
    const b = await bannerStats(page); results.banner['wrap@' + vp.join('x')] = b;
    check('banner @' + vp.join('x') + ': action buttons stay intrinsic (± 2 px of their own content width, no flex-grow) and inside the banner; condition boxes stay inside the banner' + (vp[0] <= 600 ? '; the row WRAPS (more than one row) instead of squeezing' : ''), b.btns.length === 3 && b.btns.every(x => Math.abs(x.w - x.nat) <= 2 && x.grow === '0' && x.h >= 44) && b.inside && b.boxes.every(x => x.inBanner) && (vp[0] > 600 || b.rows >= 2) && page._errs.length === 0, { w:b.w, rows:b.rows, btns:b.btns.map(x => [x.t, x.w, x.nat, x.top]), boxes:b.boxes.map(x => [x.cat, x.w, x.inBanner]) });
    if (vp[0] === 600) await shot(page, '16-banner-wrap-600.png', await clipOf(page, '#banner', 10));
    await ctx.close();
  }
}

async function runGallery(browser){
  for (const vp of VIEWPORTS) {
    const { ctx, page } = await newPage(browser, vp);
    await page.goto(url('index.html')); await wait(400);
    check('gallery @' + vp.join('x') + ': defaults to Final UI lock polish (BLOOM-026), no horizontal scroll, no console errors', (await page.$eval('[role="tab"][aria-selected="true"]', e => e.id)) === 'tab-c18' && (await noHScroll(page)) && page._errs.length === 0, page._errs.slice(0, 2));
    if (vp[0] === 1280) {
      await shot(page, '00-gallery-c18.png');
      const tabs = await page.$$eval('[role="tab"]', es => es.map(e => e.id));
      check('gallery: nine rounds in order', tabs.join(',') === 'tab-c18,tab-c17,tab-c16,tab-c15,tab-rooms,tab-refinement,tab-convergence,tab-round2,tab-round1', tabs);
      const links = await page.$$eval('#panel-c18 a.open', es => es.map(e => e.getAttribute('href')));
      check('gallery: the new tab launches Concept 18 only', links.join(',') === PAGE, links);
      const hiddenTabbable = await page.$$eval('.round[hidden] a, .round[hidden] button', es => es.filter(e => e.offsetParent !== null).length);
      check('gallery: hidden tabs’ links not visible / tabbable', hiddenTabbable === 0);
      await page.focus('#tab-c18'); const order = [];
      for (let k = 0; k < 9; k++) { await page.keyboard.press('ArrowRight'); order.push(await page.$eval('[role="tab"][aria-selected="true"]', e => e.id.slice(4))); }
      check('gallery tabs: arrow keys walk c17 → c16 → c15 → rooms → refinement → convergence → round2 → round1 → c18 (wrap)', order.join(',') === 'c17,c16,c15,rooms,refinement,convergence,round2,round1,c18', order);
      const all = [];
      for (const t of ['c18', 'c17', 'c16', 'c15', 'rooms', 'refinement', 'convergence', 'round2', 'round1']) { await page.goto(url('index.html') + '#' + t); await wait(200); all.push(...await page.$$eval('.round:not([hidden]) a.open', es => es.map(e => e.getAttribute('href')))); }
      const uniq = [...new Set(all)];
      check('gallery: 18 concept pages linked across the nine tabs (Concepts 1–18 reachable)', uniq.length === 18 && uniq.includes(PAGE) && uniq.includes(PREV), uniq);
      const bad = [];
      for (const h of uniq) { const { ctx:c2, page:p2 } = await newPage(browser, [1280, 800]); await p2.goto(url(h)); await wait(500); if (p2._errs.length || !(await isVisible(p2, '.mock-ribbon'))) bad.push({ h, errs:p2._errs.slice(0, 2) }); await c2.close(); }
      check('gallery: all 18 concept pages load with the mockup ribbon and no console errors (Concepts 1–17 regression)', bad.length === 0, bad);
      await page.goto(url('index.html')); await page.evaluate(() => { try { localStorage.setItem('bloomMockTab25', 'round1'); localStorage.removeItem('bloomMockTab26'); } catch (e) {} }); await page.reload(); await wait(300);
      check('gallery: an old BLOOM-025 remembered tab does not hide the new default', (await page.$eval('[role="tab"][aria-selected="true"]', e => e.id)) === 'tab-c18');
    }
    await ctx.close();
  }
}

function staticChecks(){
  const files = ['c18.js', 'c18.css', PAGE].map(f => path.join(DIR, f));
  const banned = /bloom-sim|resources\/|planets\/|content\/|scenario|validator|generator|\bbalance\b|Bloom Report|bloom-report|fetch\(|XMLHttpRequest|import\s|require\(/i;
  const hits = [];
  files.forEach(f => { const s = fs.readFileSync(f, 'utf8'); s.split('\n').forEach((l, i) => { if (banned.test(l) && !/^\s*(\/\/|\*|\/\*|<!--|  )/.test(l) && !/VISUAL|Nothing here|never loads|not connected|Nothing in|validators, scenarios|balance data|Bloom Report\./.test(l)) hits.push(path.basename(f) + ':' + (i + 1) + ' ' + l.trim().slice(0, 80)); }); });
  check('isolation: c18.js / c18.css / the Concept 18 page contain no engine, generator, validator, scenario, balance, Bloom Report or network references outside comments', hits.length === 0, hits.slice(0, 5));
  const scripts = fs.readFileSync(path.join(DIR, PAGE), 'utf8').match(/<script src="([^"]+)"/g).join(' ');
  check('isolation: the Concept 18 page loads only shared.js and c18.js', scripts === '<script src="shared.js" <script src="c18.js"', scripts);
  const src18 = fs.readFileSync(path.join(DIR, 'c18.js'), 'utf8');
  check('scope: no sphere / projection engineering in Concept 18 (no Three.js, WebGL, canvas 3D context or equirectangular projection code)', !/THREE\.|three(\.min)?\.js|WebGL|getContext\(|equirect/i.test(src18.replace(/\/\*[\s\S]*?\*\//g, '')), null);
  const emojiFiles = files.filter(f => EMOJI.test(fs.readFileSync(f, 'utf8')));
  check('icons: no emoji characters in c18.js, c18.css or the Concept 18 page', emojiFiles.length === 0, emojiFiles.map(f => path.basename(f)));
  const src = fs.readFileSync(path.join(DIR, 'c18.js'), 'utf8');
  check('wording: c18.js contains neither "strategy mode" nor "Resume play"', !/strategy mode|Resume play/.test(src));
  let gs = ''; try { gs = cp.execSync('git status --porcelain -- index.html resources content planets tools GAME_BIBLE.md demos/ui-mockups/shared.js demos/ui-mockups/shared.css demos/ui-mockups/rooms.js demos/ui-mockups/rooms.css demos/ui-mockups/r2.js demos/ui-mockups/r2.css demos/ui-mockups/c9.js demos/ui-mockups/c9.css demos/ui-mockups/c10.js demos/ui-mockups/c10.css demos/ui-mockups/c15.js demos/ui-mockups/c15.css demos/ui-mockups/c16.js demos/ui-mockups/c16.css demos/ui-mockups/c17.js demos/ui-mockups/c17.css "demos/ui-mockups/concept-1*.html" demos/ui-mockups/concept-[2-9]-*.html', { cwd:ROOT }).toString().trim(); } catch (e) { gs = 'git unavailable'; }
  gs = gs.split('\n').filter(l => l && !/concept-18/.test(l)).join('\n');
  check('scope: repository-root index.html, gameplay folders, shared mockup files, rooms / r2 / c9 / c10 / c15 / c16 / c17 files and Concepts 1–17 are untouched (git status)', gs === '', gs);
}

(async () => {
  staticChecks();
  const browser = await chromium.launch();
  console.log('gallery…'); await runGallery(browser);
  console.log('scale…'); await runScale(browser);
  console.log('compare c17 / c18…'); await runCompare(browser);
  console.log('banner wrap…'); await runBannerWrap(browser);
  for (const vp of VIEWPORTS) { console.log('concept 18', vp.join('x')); await runConcept(browser, vp, false); }
  console.log('concept 18 reduced motion'); await runConcept(browser, [1280, 800], true);
  await browser.close();
  if (process.argv.includes('--firefox')) { const fb = await firefox.launch(); console.log('concept 18 firefox'); await runConcept(fb, [1280, 800], false, 'firefox'); await fb.close(); }
  const e1280 = results.scale['c18@1280x800'], e1024 = results.scale['c18@1024x768'], e1440 = results.scale['c18@1440x900'];
  check('scale: the room still shrinks and grows PROPORTIONALLY with the window width (Concept 16 rule): em(1024) / em(1280) ≈ 0.80 and em(1440) / em(1280) ≈ 1.125 (± 3 %), calibrated by pill fit, em(1280) ≥ 17 px', e1280 && e1024 && e1440 && Math.abs(e1024.em / e1280.em - .8) < .03 && Math.abs(e1440.em / e1280.em - 1.125) < .03 && [e1280, e1024, e1440].every(e => e.by === 'pills') && e1280.em >= 17, { e1280, e1024, e1440 });
  check('no external network requests', results.external.length === 0, results.external.slice(0, 5));
  results.summary = { total:results.checks.length, failed:fails };
  fs.writeFileSync(path.join(OUT, 'qa-results.json'), JSON.stringify(results, null, 1));
  console.log((fails ? 'FAIL' : 'PASS') + ' — ' + (results.checks.length - fails) + '/' + results.checks.length + ' checks');
  for (const k of Object.keys(results.scale)) console.log('scale', k, JSON.stringify(results.scale[k]));
  for (const k of Object.keys(results.terraform)) console.log('terraform', k, JSON.stringify({ R:results.terraform[k].R, zone:results.terraform[k].zone, minItem:results.terraform[k].minItem, chainMin:results.terraform[k].chainMin, soil:(results.terraform[k].soil || []).map(x => x.gap), step:(results.terraform[k].profile || {}).maxStep }));
  for (const k of Object.keys(results.compare)) console.log(k, JSON.stringify({ c17:[results.compare[k].c17.idle, results.compare[k].c17.lit, results.compare[k].c17.prof.maxStep, results.compare[k].c17.soil.map(x => x.gap)], c18:[results.compare[k].c18.idle, results.compare[k].c18.lit, results.compare[k].c18.prof.maxStep, results.compare[k].c18.soil.map(x => x.gap)] }));
  for (const k of Object.keys(results.organic)) console.log('organic', k, JSON.stringify({ w:results.organic[k].w, lit:results.organic[k].lit, edgeGap:results.organic[k].edgeGap, litGap:results.organic[k].litGap, gutter:results.organic[k].gutter }));
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
