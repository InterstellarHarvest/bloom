// BLOOM-039 composition re-measure (BEFORE = main checkout, AFTER = worktree): app width / wells / overflow, room composition inside the
// game's own box (largest bare rect with the room / run containers NOT counted as panels), Resume → nodes distance, banner → region distance.
// usage: node measure-wide.js <before|after> <W> <H> <out.json> [shotsDir]
const Q = require("./q.js"), fs = require("fs"), path = require("path");
const L = require(path.join(Q.WT, "tools/research/design-audit/atlas-lib.js"));
const [which, W, H, OUT, SHOTS] = [process.argv[2], +process.argv[3], +process.argv[4], process.argv[5], process.argv[6]];
function M() {
  const vw = innerWidth, vh = innerHeight, rd = Math.round;
  const pick = ["#app > .app-run:not([hidden])", "#app > .ee-survey:not([hidden])", "#app > .ee-species:not([hidden])", "#app > .ee-challenges:not([hidden])", "#app > .ee-challenge-world:not([hidden])", "#app > .ee-menu"]
    .map(s => document.querySelector(s)).find(e => e && getComputedStyle(e).display !== "none");
  let box = pick ? pick.getBoundingClientRect() : new DOMRect(0, 0, vw, vh);
  const pv = document.querySelector(".pv"); if (pick && pick.classList.contains("app-run") && pv) box = pv.getBoundingClientRect();
  const shown = e => { if (!e || !e.isConnected || e.closest("[hidden]")) return false; for (let n = e; n && n.nodeType === 1; n = n.parentElement) { const cs = getComputedStyle(n); if (cs.display === "none" || cs.visibility === "hidden" || +cs.opacity < 0.05) return false; }
    const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1; };
  const SKIP = ".pv, .app-run, .dr, .dr-room, .pv-stage, #app, .ee-survey, .ee-species, .ee-challenges, .ee-challenge-world, .ee-menu, .ds, .ss, .ch, .cw, .mm-screen, .rr-veil";
  const S = 16, gx = Math.ceil(box.width / S), gy = Math.ceil(box.height / S), gi = new Uint8Array(gx * gy), g = new Uint8Array(gx * gy); let G0 = gi;
  const mark = r => { const x0 = Math.max(0, Math.floor((r.left - box.left) / S)), x1 = Math.min(gx - 1, Math.floor((r.right - box.left - 0.01) / S)), y0 = Math.max(0, Math.floor((r.top - box.top) / S)), y1 = Math.min(gy - 1, Math.floor((r.bottom - box.top - 0.01) / S)); for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { G0[y * gx + x] = 1; g[y * gx + x] = 1; } };
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: t => t.nodeValue.trim().length ? 1 : 2 });
  for (let t = tw.nextNode(); t; t = tw.nextNode()) { const pe = t.parentElement; if (!pe || !shown(pe) || pe.closest(".sr-only")) continue; const rg = document.createRange(); rg.selectNodeContents(t); for (const r of rg.getClientRects()) if (r.width > 1) mark(r); }
  const cv = document.getElementById("pvMap"), PV = window.BLOOM && BLOOM.planetView && BLOOM.planetView.instance;
  for (const e of document.querySelectorAll("img, svg, canvas, button, input, video, [role=img]")) { if (!shown(e)) continue; if (e === cv && PV) { if (document.querySelector(".pv.in-room")) continue; /* behind a room the map is a blurred backdrop, not content */ const I = PV.renderer.info(), r = cv.getBoundingClientRect(); mark(new DOMRect(r.left + I.offsetX, r.top + I.offsetY, I.worldWidth, I.worldHeight)); continue; } const er = e.getBoundingClientRect(); if (er.width * er.height > 0.3 * box.width * box.height) continue; /* full-card decorative overlays (tree edges, leader lines) are not ink */ mark(er); }
  G0 = g; // panels mark only the bare grid
  for (const e of document.querySelectorAll("body *")) { if (e === cv || e.matches(SKIP) || !shown(e)) continue; const cs = getComputedStyle(e), bg = cs.backgroundColor.match(/[\d.]+/g), a = bg ? (bg.length > 3 ? +bg[3] : 1) : 0;
    if (!(a >= 0.35 || (cs.borderTopWidth !== "0px" && cs.borderTopStyle !== "none"))) continue; const r = e.getBoundingClientRect(); if (r.width * r.height > 0.7 * box.width * box.height || r.width < 4 || r.height < 4) continue; mark(r); }
  const lmr = gg => { const h = new Array(gx).fill(0); let best = { a: 0 };
    for (let y = 0; y < gy; y++) { for (let x = 0; x < gx; x++) h[x] = gg[y * gx + x] ? 0 : h[x] + 1; const st = []; for (let x = 0; x <= gx; x++) { const hh = x < gx ? h[x] : 0; let s = x; while (st.length && st[st.length - 1][1] >= hh) { const [sx, sh] = st.pop(); const a = sh * (x - sx); if (a > best.a) best = { a, x: sx, y: y - sh + 1, w: x - sx, h: sh }; s = sx; } st.push([s, hh]); } }
    return best.a ? { x: best.x * S + Math.round(box.left), y: best.y * S, w: best.w * S, h: best.h * S, area: best.w * best.h * S * S, shareOfApp: +((best.w * best.h) / (gx * gy)).toFixed(3) } : null; };
  const bare = lmr(g), inkFree = lmr(gi);
  const U = els => { els = els.filter(shown); if (!els.length) return null; const rs = els.map(e => e.getBoundingClientRect()); const x0 = Math.min(...rs.map(r => r.left)), y0 = Math.min(...rs.map(r => r.top)), x1 = Math.max(...rs.map(r => r.right)), y1 = Math.max(...rs.map(r => r.bottom)); return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }; };
  const gap = (a, b) => a && b ? rd(Math.hypot(Math.max(0, Math.max(a.x, b.x) - Math.min(a.x + a.w, b.x + b.w)), Math.max(0, Math.max(a.y, b.y) - Math.min(a.y + a.h, b.y + b.h)))) : null;
  const cd = (a, b) => a && b ? rd(Math.hypot(a.x + a.w / 2 - b.x - b.w / 2, a.y + a.h / 2 - b.y - b.h / 2)) : null;
  const room = document.querySelector(".dr .dr-room:not([hidden])"), out = { app: { x: rd(box.left), w: rd(box.width), wellL: rd(box.left), wellR: rd(vw - box.right) }, overflowX: document.documentElement.scrollWidth > vw + 1, bare, inkFree };
  if (room) { const q = s => [...room.querySelectorAll(s)]; const resume = U(q(".rb.resume")), nodes = U(q(".node")), main = U(q(".rz.z-main")), mm = U(q(".mm-cv, canvas.mm-cv, .z-map canvas"));
    out.room = { width: rd(room.getBoundingClientRect().width), mainCard: main && rd(main.w), resumeToNodes: gap(resume, nodes), resumeToNodesCentre: cd(resume, nodes), nodesToMap: gap(nodes, mm) }; }
  if (PV && BLOOM_RUN_UI.adapter.selection().index >= 0) { const sel = BLOOM_RUN_UI.adapter.selection(), rr = PV.regionRect(sel.id), bn = document.getElementById("pvBanner");
    const reg = rr && { x: rr.left, y: rr.top, w: rr.width, h: rr.height }, b = bn && !bn.hidden ? U([bn]) : null, wh = U([...document.querySelectorAll("#pvBanner .bn-help button, #pvBanner .bn-help .none")]);
    out.selected = { region: sel.name, place: PV.state().bannerPlace, bannerToRegion: gap(b, reg), bannerToRegionCentre: cd(b, reg), wouldHelpToRegionCentre: cd(wh, reg) }; }
  return out;
}
(async () => { const S = await Q.serve(Q.rootOf(which)), b = await Q.launch(); const p = await Q.newPage(b, { width: W, height: H }); const res = {};
  const shot = async n => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await p.screenshot({ path: `${SHOTS}/${which}-${W}-${n}.jpg`, type: "jpeg", quality: 70 }); } };
  const st = async n => { await L.settle(p, 700); res[n] = await p.evaluate(M); await shot(n); console.log(which, W, n, JSON.stringify(res[n])); };
  try {
    await p.goto(`${S.origin}/?bg=3&sector=7`); await L.W.menu(p); await L.settle(p, 600); await st("title");
    await p.click('.mm-item[data-act="begin"]'); await L.W.species(p); await st("species");
    await p.evaluate(() => MENU_DEV.entry.speciesView.inner.open("organic_hybrid")); await st("species-dossier");
    await p.click(".ss-btn.go"); await L.W.survey(p); await L.W.cells(p, 9).catch(() => {}); await L.settle(p, 1200); await st("survey-grid");
    const i = await p.evaluate(() => MENU_DEV.entry.survey.cells.findIndex(Boolean)); await p.evaluate(i => MENU_DEV.entry.survey.select(i), i); await p.waitForFunction(() => MENU_DEV.entry.survey.state === "focus"); await st("survey-focus");
    await p.click(".ds-btn.go"); await L.W.run(p, 1); await L.settle(p, 900); await p.evaluate(() => BLOOM_API.advance(12)); await st("run-base");
    const blocked = await p.evaluate(() => BLOOM_RUN_UI.adapter.regions().filter(r => r.blocked && !r.isOrigin).sort((a, b) => b.area - a.area)[0].index);
    await p.evaluate(i => BLOOM_RUN_UI.adapter.actions.selectRegion(i), blocked); await p.mouse.move(2, 2); await st("run-selected");
    await L.deselect(p);
    for (const room of ["region", "adapt", "spread", "terraform"]) { if (room === "region") await p.evaluate(i => BLOOM_RUN_UI.adapter.actions.selectRegion(i), blocked); await L.openRoom(p, room); await st(`room-${room}`); }
    await L.closeRoom(p);
    await p.goto(`${S.origin}/?bg=3`); await L.W.menu(p); await p.click('.mm-item[data-act="challenges"]'); await L.W.hub(p); await p.evaluate(() => { MENU_DEV.entry.challengeView.inner.select("native_competition"); MENU_DEV.entry.nextLaunchSeed = 2; }); await st("challenge-hub");
    await p.click(".ch-btn.go"); await L.W.species(p); await p.evaluate(() => MENU_DEV.entry.speciesView.inner.open("organic_hybrid")); await L.settle(p, 200); await p.click(".ss-btn.go"); await L.W.world(p); await st("challenge-dossier");
  } catch (e) { console.log("ERROR", String(e.stack || e).slice(0, 400)); }
  res.errors = p.errs.slice(0, 5); fs.writeFileSync(OUT, JSON.stringify(res, null, 1)); await b.close(); S.close(); })();
