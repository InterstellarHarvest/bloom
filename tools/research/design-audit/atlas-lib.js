// BLOOM-038 design audit — shared helpers for the visual state atlas (atlas.js), the 1024 full run (atlas-run1024.js) and the 2560
// traversal (atlas-2560.js). READ-ONLY research tooling: it serves the repository, drives the released app / the developer harness with
// Playwright (Chromium) and measures the rendered layout. It changes no production file and no game rule.
//
//   const L = require("./atlas-lib.js")
//
// Measurement (in the page, L.measure): viewport; the map canvas + the drawn world rect (renderer.info); every visible panel / room card /
// overlay rect and its overlap with the world; world points visible (elementFromPoint === map canvas); prose line lengths (Range rects,
// grouped by line); primary-action ↔ target distances; whitespace share + largest empty rectangle on a 16 px grid; content-cluster
// isolation; canvas-drawn region labels (an init-script hook on CanvasRenderingContext2D records the map canvas's fillText calls — the
// labels' text, position and font — page-side instrumentation only) with pairwise overlaps; font sizes of key status numbers.
"use strict";
const path = require("path"), fs = require("fs"), http = require("http");
const ROOT = path.resolve(__dirname, "../../..");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml", ".woff2": "font/woff2" };

async function serve() {
  const srv = http.createServer((req, res) => { let p = decodeURIComponent(new URL(req.url, "http://x").pathname); if (p.endsWith("/")) p += "index.html";
    const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream", "Cache-Control": "no-store" }); fs.createReadStream(f).pipe(res); });
  await new Promise(r => srv.listen(0, "127.0.0.1", r));
  return { O: `http://127.0.0.1:${srv.address().port}`, close: () => srv.close() };
}

// page-side instrumentation: the map canvas's text draws (region labels) per frame. A frame starts with the full-canvas stage fill.
const INIT = () => {
  try { localStorage.setItem("strange-bloom.training", '{"v":1,"status":"completed","at":1}'); } catch (e) { /* storage blocked */ }
  const P = CanvasRenderingContext2D.prototype, ft = P.fillText, fr = P.fillRect;
  window.__ATLAS = { labels: [], cur: [], frames: 0 };
  P.fillRect = function (x, y, w, h) { const c = this.canvas; if (c && c.id === "pvMap" && x === 0 && y === 0 && w === c.width && h === c.height) { window.__ATLAS.labels = window.__ATLAS.cur; window.__ATLAS.cur = []; window.__ATLAS.frames++; } return fr.apply(this, arguments); };
  P.fillText = function (t, x, y) { const c = this.canvas; if (c && c.id === "pvMap") { let w = 0; try { w = this.measureText(t).width; } catch (e) { /* none */ } window.__ATLAS.cur.push({ t: String(t), x, y, w, font: this.font }); } return ft.apply(this, arguments); };
};

async function newContext(browser, w, h, { training = "completed" } = {}) {
  const c = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await c.addInitScript(INIT);
  if (training !== "completed") await c.addInitScript(tr => { try { if (tr) localStorage.setItem("strange-bloom.training", JSON.stringify({ v: 1, status: tr, at: 1 })); else localStorage.removeItem("strange-bloom.training"); } catch (e) { /* none */ } }, training);
  return c;
}
async function newPage(c) { const p = await c.newPage(); p.errs = []; p.on("pageerror", e => p.errs.push("pageerror: " + e.message)); p.on("console", m => { if (m.type() === "error") p.errs.push("console: " + m.text()); }); p.on("dialog", d => d.accept()); return p; }

// ---------------------------------------------------------------- waits (selectors / hooks from tools/ui-polish-check.js)
const W = {
  menu: p => p.waitForFunction(() => window.MENU_DEV && MENU_DEV.ready && MENU_DEV.entry.state === "menu" && MENU_DEV.entry.black.style.display === "none", null, { timeout: 90000, polling: 50 }),
  hub: p => p.waitForFunction(() => { const e = MENU_DEV.entry, v = e.challengeView; return e.state === "challenges" && v && v.inner && e.black.style.display === "none"; }, null, { timeout: 120000, polling: 50 }),
  species: p => p.waitForFunction(() => { const e = MENU_DEV.entry, v = e.speciesView; return e.state === "species" && v && v.inner && v.inner.state === "cards" && !e.covered && e.black.style.display === "none"; }, null, { timeout: 120000, polling: 50 }),
  world: p => p.waitForFunction(() => { const e = MENU_DEV.entry, v = e.worldView; return e.state === "challenge-world" && v && v.inner && v.inner.state === "ready" && e.black.style.display === "none"; }, null, { timeout: 180000, polling: 50 }),
  survey: p => p.waitForFunction(() => { const s = MENU_DEV.entry.survey; return s && s.state === "survey" && MENU_DEV.entry.black.style.display === "none"; }, null, { timeout: 120000, polling: 50 }),
  cells: (p, n = 1) => p.waitForFunction(n => MENU_DEV.entry.survey && MENU_DEV.entry.survey.cells.filter(Boolean).length >= n, n, { timeout: 300000, polling: 100 }),
  run: (p, n) => p.waitForFunction(n => window.BLOOM_APP && BLOOM_APP.session && BLOOM_APP.stats.sessions.length >= n && BLOOM_APP.stats.sessions[n - 1].readyMs !== null && !BLOOM_APP.busy
    && !document.querySelector(".atx") && MENU_DEV.entry.state === "away" && MENU_DEV.entry.black.style.display === "none", n, { timeout: 180000, polling: 50 }),
  train: (p, n) => p.waitForFunction(n => window.BLOOM_TRAINING_UI && BLOOM_TRAINING_UI.stats.liftedAt && BLOOM_TRAINING_UI.guide.mounted && BLOOM_APP.stats.sessions.length >= n && !BLOOM_APP.busy, n, { timeout: 180000, polling: 50 }),
  harness: p => p.waitForFunction(() => window.BLOOM_API && BLOOM_API.sim && window.BLOOM && BLOOM.planetView && BLOOM.planetView.instance && window.BLOOM_RUN_UI && BLOOM_RUN_UI.adapter && BLOOM.decisionRooms && BLOOM.decisionRooms.instance, null, { timeout: 240000, polling: 100 }),
  report: p => p.waitForFunction(() => BLOOM.runReport.instance && BLOOM.runReport.instance.state().open && !BLOOM.runReport.instance.state().busy, null, { timeout: 60000, polling: 30 }),
  room: (p, room) => p.waitForFunction(r => { const st = BLOOM.decisionRooms.instance.state(); return st.room === r && !st.transitioning; }, room, { timeout: 30000, polling: 30 }),
  noRoom: p => p.waitForFunction(() => { const st = BLOOM.decisionRooms.instance.state(); return !st.room && !st.transitioning; }, null, { timeout: 30000, polling: 30 }),
};
const frames = (p, n = 3) => p.evaluate(n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
const settle = async (p, ms = 450) => { await frames(p, 3); await p.waitForTimeout(ms); await frames(p, 2); };

// ---------------------------------------------------------------- room / map helpers (real buttons)
async function openRoom(p, room) {
  const st = await p.evaluate(() => BLOOM.decisionRooms.instance.state());
  if (st.room === room) return;
  if (st.room) await p.click(`.dr .dr-room:not([hidden]) .rn[data-go="${room}"]`);
  else await p.click(`.pv-tool[data-tool="${room}"]`);
  await W.room(p, room); await settle(p, 500);
}
async function closeRoom(p) { const st = await p.evaluate(() => BLOOM.decisionRooms.instance.state()); if (!st.room) return; await p.click(".dr .dr-room:not([hidden]) .rb.back"); await W.noRoom(p); await settle(p, 300); }
// a physical click at a region's centre on the home map (the real canvas click path); falls back to the adapter action
async function clickRegion(p, idx) {
  const pt = await p.evaluate(i => { const A = BLOOM_RUN_UI.adapter, r = A.regions()[i]; const q = BLOOM.planetView.instance.regionPoint(r.id); return q ? { x: q.x, y: q.y } : null; }, idx);
  let ok = false;
  if (pt) { const sz = p.viewportSize(); if (pt.x > 2 && pt.y > 2 && pt.x < sz.width - 2 && pt.y < sz.height - 2) { await p.mouse.click(pt.x, pt.y); await settle(p, 250); ok = await p.evaluate(i => BLOOM_RUN_UI.adapter.selection().index === i, idx); } }
  if (!ok) { await p.evaluate(i => BLOOM_RUN_UI.adapter.actions.selectRegion(i), idx); await settle(p, 250); }
  return ok ? "click" : "action";
}
async function deselect(p) { await p.evaluate(() => BLOOM_RUN_UI.adapter.actions.deselect()); await settle(p, 200); }

// an automatic player that reaches a coverage target: alternate advance(step) with the purchase the previews say opens the most regions
// (else the cheapest Spread, else nothing). Biomass is only granted when `grant` is set and nothing has been affordable for `patience` steps.
async function progressTo(p, target, { step = 10, maxTicks = 20000, grant = 0, patience = 12, buy = true, avoid = [] } = {}) {
  return p.evaluate(async ([target, step, maxTicks, grant, patience, buy, avoid]) => {
    const A = BLOOM_RUN_UI.adapter, API = BLOOM_API, bought = [], granted = []; let ticks = 0, idle = 0;
    const flat = () => A.upgrades().flatMap(b => b.items);
    const pick = () => { const its = flat().filter(u => u.canBuy && !avoid.includes(u.id)); if (!its.length) return null;
      const sc = its.map(u => { const pv = A.previewOf(u.id) || {}; const g = (pv.gain || []).length - 0.6 * (pv.lose || []).length; return { u, g }; });
      sc.sort((a, b) => b.g - a.g || a.u.price - b.u.price); if (sc[0].g > 0) return sc[0].u;
      const sp = its.filter(u => u.board === "Spread").sort((a, b) => a.price - b.price)[0]; return sp || null; };
    while (API.coverage() < target && ticks < maxTicks) {
      const s = API.sim; if (s.won || s.lost) break;
      API.advance(step); ticks += step;
      if (buy) { const u = pick(); if (u) { const cost = u.price; if (A.actions.buy(u.id)) { bought.push({ id: u.id, tier: u.tier + 1, price: cost, atTick: API.sim.ticks, cov: +API.coverage().toFixed(3) }); idle = 0; } }
        else if (++idle >= patience && grant) { const want = flat().filter(u => !u.owned && u.rules !== false && !avoid.includes(u.id)).map(u => ({ u, g: ((A.previewOf(u.id) || {}).gain || []).length })).sort((a, b) => b.g - a.g || a.u.price - b.u.price)[0];
          if (want && want.g > 0) { const need = Math.max(0, want.u.price - API.state().biomass + 1); if (need > 0 && need <= grant) { API.addBiomass(need); granted.push({ amount: need, for: want.u.id, atTick: API.sim.ticks }); } } idle = 0; } }
      await new Promise(r => setTimeout(r, 0));
    }
    return { coverage: +API.coverage().toFixed(4), ticks: API.sim.ticks, advanced: ticks, bought, granted, won: !!API.sim.won, lost: !!API.sim.lost };
  }, [target, step, maxTicks, grant, patience, buy, avoid]);
}

// ---------------------------------------------------------------- measurement (runs in the page)
function MEASURE(opt) {
  const vw = innerWidth, vh = innerHeight, rd = v => Math.round(v);
  const RR = r => ({ x: rd(r.left), y: rd(r.top), w: rd(r.width), h: rd(r.height) });
  const shown = e => { if (!e || !e.isConnected) return false; if (e.closest("[hidden]")) return false; let n = e; while (n && n.nodeType === 1) { const cs = getComputedStyle(n); if (cs.display === "none" || cs.visibility === "hidden" || +cs.opacity < 0.05) return false; n = n.parentElement; }
    const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1 && r.bottom > 0 && r.right > 0 && r.left < vw && r.top < vh; };
  const inter = (a, b) => { const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y); return w > 0 && h > 0 ? w * h : 0; };
  const gap = (a, b) => { const dx = Math.max(0, Math.max(a.x, b.x) - Math.min(a.x + a.w, b.x + b.w)), dy = Math.max(0, Math.max(a.y, b.y) - Math.min(a.y + a.h, b.y + b.h)); return rd(Math.hypot(dx, dy)); };
  const cdist = (a, b) => rd(Math.hypot(a.x + a.w / 2 - b.x - b.w / 2, a.y + a.h / 2 - b.y - b.h / 2));
  const clipV = r => { const x0 = Math.max(0, r.x), y0 = Math.max(0, r.y), x1 = Math.min(vw, r.x + r.w), y1 = Math.min(vh, r.y + r.h); return x1 > x0 && y1 > y0 ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } : null; };
  const out = { viewport: { w: vw, h: vh }, scroll: { docW: document.documentElement.scrollWidth, docH: document.documentElement.scrollHeight, overflowX: document.documentElement.scrollWidth > vw + 1, overflowY: document.documentElement.scrollHeight > vh + 1 } };
  const PV = window.BLOOM && BLOOM.planetView && BLOOM.planetView.instance;
  const cv = document.getElementById("pvMap");
  const runShown = !!(PV && cv && shown(cv));
  let world = null;
  // ---- map + world
  if (PV && cv && cv.isConnected) {
    const r = cv.getBoundingClientRect(), I = PV.renderer.info();
    world = { x: rd(r.left + I.offsetX), y: rd(r.top + I.offsetY), w: rd(I.worldWidth), h: rd(I.worldHeight) };
    const wv = clipV(world) || { x: 0, y: 0, w: 0, h: 0 };
    out.map = { canvas: RR(r), world, worldVisible: wv, tilePx: I.tilePx, grid: [I.gridWidth, I.gridHeight], wrapX: I.wrapX, copies: I.copies.count,
      canvasShareOfViewport: +((r.width * r.height) / (vw * vh)).toFixed(3), worldShareOfViewport: +((wv.w * wv.h) / (vw * vh)).toFixed(3), worldShareOfCanvas: +((world.w * world.h) / Math.max(1, r.width * r.height)).toFixed(3),
      letterbox: { left: rd(I.offsetX), right: rd(r.width - I.offsetX - I.worldWidth), top: rd(I.offsetY), bottom: rd(r.height - I.offsetY - I.worldHeight) }, lastFrame: I.lastFrame };
    // world points actually visible (not covered by any panel / veil)
    let n = 0, vis = 0; const st = Math.max(8, Math.round(Math.min(wv.w, wv.h) / 40));
    for (let y = wv.y + st / 2; y < wv.y + wv.h; y += st) for (let x = wv.x + st / 2; x < wv.x + wv.w; x += st) { n++; const e = document.elementFromPoint(x, y); if (e === cv) vis++; }
    out.map.worldUnobscuredShare = n ? +(vis / n).toFixed(3) : 0;
    // blank-canvas guard: distinct colours over the world
    try { const ctx = cv.getContext("2d"), cols = new Set(); for (let k = 0; k < 120; k++) { const x = Math.floor(I.offsetX + ((k * 37) % 100) / 100 * I.worldWidth), y = Math.floor(I.offsetY + ((k * 61) % 100) / 100 * I.worldHeight); const d = ctx.getImageData(x * I.dpr, y * I.dpr, 1, 1).data; cols.add(d[0] + "," + d[1] + "," + d[2]); } out.map.distinctColours = cols.size; } catch (e) { out.map.distinctColours = null; }
    // labels (canvas-drawn, from the init hook); pill ≈ text rect padded by the glyph (≈1.8 em left) and 0.55 em right, 1.7 em tall
    const L = ((window.__ATLAS && (__ATLAS.cur.length ? __ATLAS.cur : __ATLAS.labels)) || []).filter(t => t.t && t.t.length > 1); // the last drawn frame (frames draw synchronously, so `cur` is complete when read)
    const labs = L.map(t => { const fs = parseFloat((t.font.match(/(\d+(?:\.\d+)?)px/) || [0, 12])[1]); const h = fs * 1.7, left = t.x - fs * 1.8, right = t.x + t.w + fs * 0.55;
      return { name: t.t, fontPx: fs, rect: { x: rd(r.left + left), y: rd(r.top + t.y - h / 2), w: rd(right - left), h: rd(h) } }; });
    let ov = 0; const pairs = [];
    for (let i = 0; i < labs.length; i++) for (let j = i + 1; j < labs.length; j++) { const a = inter(labs[i].rect, labs[j].rect); if (a > 0) { ov++; pairs.push([labs[i].name, labs[j].name, a]); } }
    const covered = labs.filter(l => { const c = { x: l.rect.x + l.rect.w / 2, y: l.rect.y + l.rect.h / 2 }; const e = document.elementFromPoint(c.x, c.y); return e && e !== cv; }).map(l => l.name);
    const ws = Math.max(1, wv.w * wv.h);
    const wr = out.map.world; const outsideWorld = labs.filter(l => l.rect.x < wr.x - 1 || l.rect.x + l.rect.w > wr.x + wr.w + 1).map(l => l.name), clipped = labs.filter(l => l.rect.x < 0 || l.rect.x + l.rect.w > vw || l.rect.y < r.top || l.rect.y + l.rect.h > r.bottom).map(l => l.name);
    out.labels = { count: labs.length, extendBeyondWorld: outsideWorld, clippedByViewportOrCanvas: clipped, fontPx: labs.length ? labs[0].fontPx : null, overlaps: ov, overlapPairs: pairs.slice(0, 12), coveredByPanels: covered, labelAreaShareOfWorld: +(labs.reduce((a, l) => a + l.rect.w * l.rect.h, 0) / ws).toFixed(3),
      perMegapixelWorld: +(labs.length / (ws / 1e6)).toFixed(1), rects: labs.map(l => ({ n: l.name, ...l.rect })) };
  }
  // ---- panels / overlays / room cards
  const PANELS = [["hud", "#pvHud"], ["footer", ".pv-foot"], ["banner", "#pvBanner"], ["scenario", "#pvScn"], ["legend", "#pvLegend"], ["toast", "#pvToast"], ["mapViewPopover", "#pvLens"], ["runMenu", "#pvMenu"],
    ["room", ".dr .dr-room:not([hidden])"], ["report", "#rr .rr-card"], ["coach", ".tc-card"], ["coachLayer", ".tc-layer"],
    ["title", ".mm-plaque"], ["speciesCards", ".ss-cards"], ["speciesDossier", ".ss-dossier"], ["surveyGrid", ".ds-grid"], ["surveyDossier", ".ds-dossier"], ["surveyFocus", ".ds-focus-slot"],
    ["hubList", ".ch-list"], ["hubDossier", ".ch-dossier"], ["worldDossier", ".cw-dossier"], ["worldGlobe", ".cw-globe-col"], ["dialog", "dialog[open]"]];
  out.panels = [];
  for (const [name, sel] of PANELS) for (const e of document.querySelectorAll(sel)) { if (!shown(e)) continue; const r = RR(e.getBoundingClientRect()), o = { name, rect: r, areaShareOfViewport: +((r.w * r.h) / (vw * vh)).toFixed(3) };
    if (world) { const wv = out.map.worldVisible; o.overlapWorldPx = inter(r, wv); o.overlapShareOfWorld = +(o.overlapWorldPx / Math.max(1, wv.w * wv.h)).toFixed(3); }
    if (e.scrollHeight > e.clientHeight + 2 && /auto|scroll/.test(getComputedStyle(e).overflowY)) o.scrolls = { scrollH: e.scrollHeight, clientH: e.clientHeight };
    out.panels.push(o); }
  // room / report cards: visible boxes with an opaque-ish background inside the open room / report / planning screen
  const cardRoot = document.querySelector(".dr .dr-room:not([hidden])") || document.querySelector("#rr:not([hidden])") || document.querySelector(".cw, .ch, .ds, .ss, .mm");
  out.cards = [];
  if (cardRoot && shown(cardRoot)) { const seen = []; for (const e of cardRoot.querySelectorAll("*")) { if (!shown(e)) continue; const cs = getComputedStyle(e), bg = cs.backgroundColor.match(/[\d.]+/g), a = bg ? (bg.length > 3 ? +bg[3] : 1) : 0;
      if (a < 0.5 && cs.backgroundImage === "none") continue; const r = e.getBoundingClientRect(); if (r.width < 90 || r.height < 40 || r.width * r.height > 0.9 * vw * vh) continue; if (seen.some(s => s.contains(e))) continue; seen.push(e);
      out.cards.push({ cls: (e.className && e.className.baseVal === undefined ? String(e.className) : e.tagName).slice(0, 40), rect: RR(r) }); if (out.cards.length > 40) break; } }
  // ---- scroll containers that hide content / buttons outside reach
  out.scrollers = []; for (const e of document.querySelectorAll("body *")) { if (!shown(e)) continue; const cs = getComputedStyle(e); if (!/auto|scroll/.test(cs.overflowY) || e.scrollHeight <= e.clientHeight + 2) continue;
    out.scrollers.push({ cls: String(e.className).slice(0, 40), rect: RR(e.getBoundingClientRect()), scrollH: e.scrollHeight, clientH: e.clientHeight, hiddenPx: e.scrollHeight - e.clientHeight }); if (out.scrollers.length > 12) break; }
  const btns = [...document.querySelectorAll("button, [role=button], a[href]")].filter(b => { if (!b.isConnected || b.closest("[hidden]") || b.closest("[inert]")) return false; const cs = getComputedStyle(b); if (cs.display === "none" || cs.visibility === "hidden") return false; const r = b.getBoundingClientRect(); return r.width > 1 && r.height > 1; });
  const offscreen = btns.filter(b => { const r = b.getBoundingClientRect(); return r.bottom > vh + 1 || r.right > vw + 1 || r.top < -1; });
  const clipped = btns.filter(b => { const r = b.getBoundingClientRect(); if (r.bottom > vh || r.top < 0) return false; const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return e && !(e === b || b.contains(e)) && !e.closest(".tc-layer"); });
  out.buttons = { total: btns.length, outsideViewport: offscreen.length, outsideViewportNames: offscreen.slice(0, 8).map(b => (b.textContent || b.getAttribute("aria-label") || "").trim().replace(/\s+/g, " ").slice(0, 30)), coveredOrScrolledAway: clipped.length };
  // ---- prose blocks: line lengths
  const blocks = new Set(); const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: t => t.nodeValue.trim().length ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT });
  for (let t = tw.nextNode(); t; t = tw.nextNode()) { let b = t.parentElement; while (b && /^inline/.test(getComputedStyle(b).display) && b.parentElement) b = b.parentElement; if (b && shown(b)) blocks.add(b); }
  const prose = [];
  for (const b of blocks) { const txt = b.innerText ? b.innerText.replace(/\s+/g, " ").trim() : ""; if (txt.length < 30) continue; if ([...blocks].some(o => o !== b && b.contains(o) && (o.innerText || "").replace(/\s+/g, " ").trim().length >= txt.length * 0.9)) continue;
    const rg = document.createRange(); rg.selectNodeContents(b); const rects = [...rg.getClientRects()].filter(r => r.width > 1 && r.height > 1); if (!rects.length) continue;
    const lines = []; for (const r of rects) { const l = lines.find(l => Math.abs(l.top - r.top) < r.height * 0.5); if (l) { l.left = Math.min(l.left, r.left); l.right = Math.max(l.right, r.right); } else lines.push({ top: r.top, left: r.left, right: r.right, h: r.height }); }
    const totalW = lines.reduce((a, l) => a + (l.right - l.left), 0), maxW = Math.max(...lines.map(l => l.right - l.left)), cs = getComputedStyle(b);
    prose.push({ cls: String(b.className || b.tagName).slice(0, 40), text: txt.slice(0, 70), chars: txt.length, lines: lines.length, maxLineW: rd(maxW), maxLineChars: rd(txt.length * maxW / Math.max(1, totalW)), fontPx: parseFloat(cs.fontSize), rect: RR(b.getBoundingClientRect()) }); }
  prose.sort((a, b) => b.maxLineChars - a.maxLineChars);
  out.prose = { blocks: prose.length, maxLineChars: prose.length ? prose[0].maxLineChars : 0, over75: prose.filter(x => x.maxLineChars > 75 && x.lines > 1).length, over90: prose.filter(x => x.maxLineChars > 90).length, maxLineW: prose.length ? Math.max(...prose.map(x => x.maxLineW)) : 0,
    minFontPx: prose.length ? Math.min(...prose.map(x => x.fontPx)) : null, top: prose.slice(0, 8) };
  // ---- primary action ↔ target distances
  const q = s => { const e = [...document.querySelectorAll(s)].find(shown); return e ? RR(e.getBoundingClientRect()) : null; };
  const PAIRS = [
    ["banner.inspect→region", "#pvBanner .pv-btn:not(.hb)", "@region"], ["banner.wouldHelp→region", "#pvBanner .hb[data-item]", "@region"], ["banner.close→region", "#pvBanner .bx, #pvBanner [data-act=close]", "@region"],
    ["room.resume→nodes", ".dr .dr-room:not([hidden]) .rb.resume", ".dr .dr-room:not([hidden]) .node"], ["room.nodes→contextMap", ".dr .dr-room:not([hidden]) .node", ".dr .dr-room:not([hidden]) .mm-cv, .dr .dr-room:not([hidden]) canvas"],
    ["room.back→title", ".dr .dr-room:not([hidden]) .rb.back", ".dr .dr-room:not([hidden]) h2"],
    ["species.choose→selectedCard", ".ss-btn.go", ".ss-card[aria-pressed=true], .ss-card[aria-current=true], .ss-card.sel, .ss-card.is-sel"], ["species.choose→dossierTitle", ".ss-btn.go", ".ss-dossier h2"],
    ["survey.begin→focusGlobe", ".ds-btn.go", ".ds-focus-slot canvas, .ds-focus-slot"], ["survey.begin→dossierTitle", ".ds-btn.go", ".ds-dossier h2"],
    ["hub.begin→selectedCard", ".ch-btn.go", ".ch-card[aria-pressed=true], .ch-card[aria-selected=true], .ch-card[aria-current=true]"], ["hub.begin→dossierTitle", ".ch-btn.go", ".ch-dossier h2, .ch-dossier .ch-title"],
    ["world.begin→globe", ".cw-btn.go", ".cw-globe-col canvas, .cw-globe-col"], ["world.begin→dossierTitle", ".cw-btn.go", ".cw-dossier h2"],
    ["report.continue→heading", "#rr .rr-actions button, #rrContinue", "#rr h2, #rr h1"], ["title.menu→title", ".mm-nav", "#mm-title"], ["coach.ack→target", ".tc-card .tc-ack, .tc-card button", ".tc-ring"]];
  out.actions = [];
  // the selected region: its bounding box (PV.regionRect) — on a cylinder a region crossing the seam spans the whole width, so the target
  // used for distances is then the region's centre point (PV.regionPoint) ± 1 tile
  let regionRect = null, regionBox = null, seamSplit = false; try { const A = window.BLOOM_RUN_UI && BLOOM_RUN_UI.adapter, s = A && A.selection(); if (s && s.index >= 0 && PV) { const rr = PV.regionRect(s.id), pt = PV.regionPoint(s.id), tp = PV.renderer.info().tilePx;
    if (rr) regionBox = { x: rd(rr.left), y: rd(rr.top), w: rd(rr.width), h: rd(rr.height) }; seamSplit = !!(rr && world && rr.width > world.w * 0.6);
    regionRect = rr && !seamSplit ? regionBox : pt ? { x: rd(pt.x - tp), y: rd(pt.y - tp), w: rd(2 * tp), h: rd(2 * tp) } : null; } } catch (e) { /* none */ }
  for (const [name, a, b] of PAIRS) { const ra = q(a); if (!ra) continue; const rb = b === "@region" ? regionRect : (() => { const els = [...document.querySelectorAll(b)].filter(shown); if (!els.length) return null; const rs = els.map(e => e.getBoundingClientRect()); const x0 = Math.min(...rs.map(r => r.left)), y0 = Math.min(...rs.map(r => r.top)), x1 = Math.max(...rs.map(r => r.right)), y1 = Math.max(...rs.map(r => r.bottom)); return { x: rd(x0), y: rd(y0), w: rd(x1 - x0), h: rd(y1 - y0) }; })();
    if (!rb) continue; out.actions.push({ name, from: ra, to: rb, edgeGapPx: gap(ra, rb), centreDistPx: cdist(ra, rb), shareOfDiagonal: +(cdist(ra, rb) / Math.hypot(vw, vh)).toFixed(3) }); }
  out.selectedRegion = { target: regionRect, box: regionBox, seamSplit, unobscured: (() => { if (!regionRect) return null; const e = document.elementFromPoint(regionRect.x + regionRect.w / 2, regionRect.y + regionRect.h / 2); return !!e && e === cv; })() };
  // ---- whitespace on a 16 px grid: "bare" = no panel / card / text / image / control / world under the point; "ink-free" = no text / image / control / world
  const S = 16, gx = Math.ceil(vw / S), gy = Math.ceil(vh / S);
  const inkRects = [], panelRects = [];
  const twa = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: t => t.nodeValue.trim().length ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT });
  for (let t = twa.nextNode(); t; t = twa.nextNode()) { const pe = t.parentElement; if (!pe || !shown(pe) || pe.closest(".sr-only") || pe.closest("[inert]")) continue; const rg = document.createRange(); rg.selectNodeContents(t); for (const r of rg.getClientRects()) if (r.width > 1) inkRects.push(r); }
  for (const e of document.querySelectorAll("img, svg, canvas, button, input, select, video, [role=img]")) { if (!shown(e) || e.closest("[inert]") || (e.tagName === "svg" && e.closest("button"))) continue;
    if (e === cv && world) { inkRects.push(new DOMRect(world.x, world.y, world.w, world.h)); continue; } const r = e.getBoundingClientRect(); if (r.width * r.height > 0.85 * vw * vh) continue; inkRects.push(r); }
  for (const e of document.querySelectorAll("body *")) { if (e === cv || !shown(e) || e.closest("[inert]")) continue; const cs = getComputedStyle(e), bg = cs.backgroundColor.match(/[\d.]+/g), a = bg ? (bg.length > 3 ? +bg[3] : 1) : 0;
    const hasBox = a >= 0.35 || (cs.borderTopWidth !== "0px" && cs.borderTopStyle !== "none" && cs.borderLeftWidth !== "0px"); if (!hasBox) continue; const r = e.getBoundingClientRect(); if (r.width * r.height > 0.85 * vw * vh || r.width < 4 || r.height < 4) continue; panelRects.push(r); }
  const mk = rects => { const g = new Uint8Array(gx * gy); for (const r of rects) { const x0 = Math.max(0, Math.floor(r.left / S)), x1 = Math.min(gx - 1, Math.floor((r.right - 0.01) / S)), y0 = Math.max(0, Math.floor(r.top / S)), y1 = Math.min(gy - 1, Math.floor((r.bottom - 0.01) / S)); for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) g[y * gx + x] = 1; } return g; };
  const ink = mk(inkRects), bare = mk([...inkRects, ...panelRects]);
  const share = g => +(1 - g.reduce((a, v) => a + v, 0) / g.length).toFixed(3);
  const lmr = g => { const h = new Array(gx).fill(0); let best = { a: 0 }; for (let y = 0; y < gy; y++) { for (let x = 0; x < gx; x++) h[x] = g[y * gx + x] ? 0 : h[x] + 1; const st = []; for (let x = 0; x <= gx; x++) { const hh = x < gx ? h[x] : 0; let s = x; while (st.length && st[st.length - 1][1] >= hh) { const [sx, sh] = st.pop(); const a = sh * (x - sx); if (a > best.a) best = { a, x: sx, y: y - sh + 1, w: x - sx, h: sh }; s = sx; } st.push([s, hh]); } }
    return best.a ? { x: best.x * S, y: best.y * S, w: best.w * S, h: best.h * S, shareOfViewport: +((best.w * best.h) / (gx * gy)).toFixed(3) } : null; };
  out.whitespace = { gridPx: S, inkFreeShare: share(ink), bareShare: share(bare), largestBareRect: lmr(bare), largestInkFreeRect: lmr(ink) };
  // ---- isolation: top-level content clusters (panels / cards / world) and the gap to the nearest other one
  const blocksForIso = [...out.panels.map(p => ({ n: p.name, r: p.rect })), ...out.cards.map(c => ({ n: "card:" + c.cls, r: c.rect })), ...(world ? [{ n: "world", r: out.map.worldVisible }] : [])].filter(b => b.r && b.r.w > 0);
  const top = blocksForIso.filter((b, i) => !blocksForIso.some((o, j) => j !== i && o.r.x <= b.r.x && o.r.y <= b.r.y && o.r.x + o.r.w >= b.r.x + b.r.w && o.r.y + o.r.h >= b.r.y + b.r.h && (o.r.w * o.r.h > b.r.w * b.r.h || j < i)));
  out.isolation = top.map((b, i) => { let best = Infinity, who = null; top.forEach((o, j) => { if (i === j) return; const g = gap(b.r, o.r); if (g < best) { best = g; who = o.n; } }); return { n: b.n, rect: b.r, nearestGapPx: best === Infinity ? null : best, nearest: who }; }).sort((a, b) => (b.nearestGapPx || 0) - (a.nearestGapPx || 0)).slice(0, 10);
  // ---- key status numbers: font sizes
  const F = {}; for (const [k, s] of [["coverage", "#pvCov"], ["goal", "#pvGoal"], ["state", "#pvState"], ["biomass", "#pvBio"], ["biomassRate", "#pvRate"], ["sky", "#pvSky"], ["footerLog", "#pvLog"], ["scenarioName", "#pvScn .sh b"], ["scenarioLine", "#pvScn .sl, #pvScn .sl2"], ["bannerName", "#pvBanner h2, #pvBanner .bn-t b"], ["roomTitle", ".dr .dr-room:not([hidden]) h2"], ["roomBiomass", ".dr .dr-room:not([hidden]) .rbio-n"], ["reportHeading", "#rr h2"], ["labelsCanvas", null]]) {
    if (!s) continue; const e = [...document.querySelectorAll(s)].find(shown); if (e) { const cs = getComputedStyle(e); F[k] = { px: parseFloat(cs.fontSize), weight: cs.fontWeight, colour: cs.color, text: e.textContent.trim().replace(/\s+/g, " ").slice(0, 60) }; } }
  if (out.labels) F.mapLabels = { px: out.labels.fontPx };
  out.fonts = F;
  // ---- planning-screen extras: globe canvases (size and share)
  out.globes = [...document.querySelectorAll("canvas")].filter(c => c !== cv && shown(c)).map(c => { const r = RR(c.getBoundingClientRect()); return { cls: String(c.className || c.parentElement.className).slice(0, 40), rect: r, shareOfViewport: +((r.w * r.h) / (vw * vh)).toFixed(3) }; }).slice(0, 14);
  out.runShown = runShown;
  return out;
}

async function measure(p, extra = {}) { const m = await p.evaluate(MEASURE, extra); return m; }

// run state summary (coverage, phase, scenario state) for the index
async function runState(p) {
  return p.evaluate(() => { const A = window.BLOOM_RUN_UI && BLOOM_RUN_UI.adapter; if (!A) return null; const h = A.hud(), r = A.run(), s = A.scenario ? A.scenario() : null, sel = A.selection();
    let pres = null, comp = null, clim = null; try { pres = BLOOM_API.pressure && BLOOM_API.pressure(); } catch (e) { /* none */ } try { comp = BLOOM_API.competition && BLOOM_API.competition(); } catch (e) { /* none */ } try { clim = BLOOM_API.climate && BLOOM_API.climate(); } catch (e) { /* none */ }
    return { coverage: +h.coverage.toFixed(4), coveragePct: h.coveragePct, biomass: Math.floor(h.biomass), ticks: r.ticks, seconds: r.seconds, won: r.won, lost: r.lost, lostReason: r.lostReason, planet: r.planetName, planetId: r.planetId, archetype: r.archetypeId, seed: r.seed,
      species: r.species && r.species.id, scenario: r.scenarioId, challenge: r.challenge ? (r.challenge.id || r.challenge.name) : null, sky: h.skyNow, selected: sel.name,
      pressure: pres && pres.enabled !== false && pres.progress !== undefined ? { progress: +(+pres.progress).toFixed(3), phase: pres.phase } : null,
      competition: comp && comp.enabled ? { share: +(+comp.share).toFixed(3), contested: comp.contested, tiles: comp.tiles } : null,
      climate: clim && clim.enabled ? { level: +(+clim.level).toFixed(3), band: clim.bandName } : null,
      regions: A.regions().length, open: A.regions().filter(x => !x.blocked).length, living: A.regions().filter(x => x.living > 0).length }; });
}

// ---------------------------------------------------------------- screenshots + index
function makeShooter(outDir, indexArr, { relTo }) {
  fs.mkdirSync(outDir, { recursive: true });
  return async function shoot(p, id, meta, { jpeg = false, quality = 80, measureIt = true, fullPage = false } = {}) {
    await settle(p, 120);
    if (measureIt && meta.gameplay !== false) { // blank-canvas guard (headless Chromium occasionally drops a canvas)
      for (let k = 0; k < 3; k++) { const dc = await p.evaluate(() => { const cv = document.getElementById("pvMap"); if (!cv || !window.BLOOM || !BLOOM.planetView || !BLOOM.planetView.instance) return 99; const I = BLOOM.planetView.instance.renderer.info(), ctx = cv.getContext("2d"), cols = new Set();
          for (let i = 0; i < 60; i++) { const d = ctx.getImageData(Math.floor((I.offsetX + (i * 37 % 100) / 100 * I.worldWidth) * I.dpr), Math.floor((I.offsetY + (i * 61 % 100) / 100 * I.worldHeight) * I.dpr), 1, 1).data; cols.add(d.join()); } return cols.size; }).catch(() => 99);
        if (dc >= 3) break; await p.evaluate(() => BLOOM.planetView.instance.redraw()).catch(() => {}); await settle(p, 400); } }
    const file = path.join(outDir, `${id}.${jpeg ? "jpg" : "png"}`);
    await p.screenshot({ path: file, type: jpeg ? "jpeg" : "png", quality: jpeg ? quality : undefined, fullPage });
    const metrics = measureIt ? await measure(p).catch(e => ({ error: String(e.message || e).slice(0, 200) })) : null;
    const rs = await runState(p).catch(() => null);
    const vp = p.viewportSize();
    const entry = { id, file: path.relative(relTo, file).split(path.sep).join("/"), viewport: `${vp.width}x${vp.height}`, ...meta, coverage: rs ? rs.coverage : meta.coverage ?? null, run: rs, metrics, bytes: fs.statSync(file).size };
    indexArr.push(entry); return entry;
  };
}

module.exports = { ROOT, serve, newContext, newPage, W, frames, settle, openRoom, closeRoom, clickRegion, deselect, progressTo, measure, runState, makeShooter, MEASURE };
