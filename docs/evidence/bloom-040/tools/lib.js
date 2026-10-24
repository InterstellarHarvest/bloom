// scratch QA helpers for BLOOM-040 (not committed)
const http = require("http"), fs = require("fs"), path = require("path");
const pw = require(process.env.PW_MODULE || "playwright");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".json": "application/json", ".svg": "image/svg+xml", ".webp": "image/webp", ".jpg": "image/jpeg" };
function serve(ROOT) { const server = http.createServer((req, res) => { const u = decodeURIComponent(new URL(req.url, "http://x").pathname), f = path.join(ROOT, u === "/" ? "/index.html" : u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream", "cache-control": "no-store" }); fs.createReadStream(f).pipe(res); });
  return new Promise(r => server.listen(0, "127.0.0.1", () => r({ server, origin: `http://127.0.0.1:${server.address().port}` }))); }
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function openRun(browser, origin, q, { w = 1440, h = 900, rm = false } = {}) {
  const c = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: rm ? "reduce" : "no-preference" });
  const p = await c.newPage(); p.errs = []; p.on("pageerror", e => p.errs.push(e.message)); p.on("console", m => { if (m.type() === "error") p.errs.push(m.text()); });
  await p.goto(origin + "/demos/demo-run.html" + q);
  await p.waitForFunction(() => window.BLOOM && BLOOM.planetView && BLOOM.planetView.instance && BLOOM.decisionRooms && BLOOM.decisionRooms.instance && BLOOM.planetView.instance.renderer.info().frames > 0, null, { timeout: 60000, polling: 100 });
  await sleep(400); return p; }
const settled = p => p.waitForFunction(() => !BLOOM.decisionRooms.instance.state().transitioning, null, { timeout: 8000, polling: 20 });
async function room(p, name, ctx) { await settled(p); await p.evaluate(([n, c]) => BLOOM.planetView.instance.openRoom(n, c || {}), [name, ctx || null]); await settled(p); await sleep(250); }
const specRect = p => p.evaluate(() => { const r = document.querySelector(".dr .dr-room:not([hidden]) .lf-top"); if (!r) return null; const b = r.getBoundingClientRect(); const c = r.querySelector(".ps-canvas").getBoundingClientRect(); return { box: [b.x, b.y, b.width, b.height].map(v => +v.toFixed(2)), canvas: [c.x, c.y, c.width, c.height].map(v => +v.toFixed(2)) }; });
module.exports = { pw, serve, sleep, openRun, settled, room, specRect };
// production flows through index.html
const menuReady = p => p.waitForFunction(() => window.MENU_DEV && MENU_DEV.ready && MENU_DEV.entry.state === "menu", null, { timeout: 60000, polling: 50 });
const viaSpecies = async p => { const at = await (await p.waitForFunction(() => { const e = MENU_DEV.entry, v = e.speciesView, s = e.survey;
    if (e.state === "species") return v && v.inner && v.inner.state === "cards" && !e.covered && e.black.style.display === "none" ? "species" : false; return s && s.state !== "disposed" ? "survey" : false; }, null, { timeout: 120000, polling: 50 })).jsonValue();
  if (at === "species") { await p.evaluate(() => { const s = MENU_DEV.entry.speciesView.inner; s.open(s.selected.id); }); await p.click(".ss-btn.go"); } return at; };
const waitProd = async p => { await p.waitForFunction(() => window.BLOOM_APP && BLOOM_APP.session && !BLOOM_APP.busy && !document.querySelector(".atx") && BLOOM.planetView && BLOOM.planetView.instance && BLOOM.planetView.instance.renderer.info().frames > 0 && BLOOM.decisionRooms.instance, null, { timeout: 120000, polling: 100 }); await sleep(500); };
async function prodContext(browser, origin, { w = 1440, h = 900, rm = false } = {}) {
  const c = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: rm ? "reduce" : "no-preference" });
  const p = await c.newPage(); p.errs = []; p.on("pageerror", e => p.errs.push(e.message)); p.on("console", m => { if (m.type() === "error") p.errs.push(m.text()); }); return p; }
async function prodTraining(browser, origin, o) { const p = await prodContext(browser, origin, o); await p.goto(origin + "/index.html"); await menuReady(p);
  await p.click('.mm-item[data-act="training"]');
  await p.waitForFunction(() => window.BLOOM_APP && BLOOM_APP.session && BLOOM_APP.session.run.training && window.BLOOM_TRAINING_UI && BLOOM_TRAINING_UI.stats.liftedAt && !BLOOM_APP.busy, null, { timeout: 60000, polling: 50 });
  await waitProd(p); return p; }
async function prodExpedition(browser, origin, o = {}) { const p = await prodContext(browser, origin, o); await p.goto(origin + `/index.html?begin=1&sector=${o.sector || 77}&workers=3`);
  await p.waitForFunction(() => window.MENU_DEV && MENU_DEV.ready, null, { timeout: 60000, polling: 50 });
  await viaSpecies(p); await p.waitForFunction(() => MENU_DEV.entry.survey && MENU_DEV.entry.survey.state === "survey" && MENU_DEV.entry.state === "survey", null, { timeout: 180000, polling: 100 });
  await p.click(`.ds-cand[data-index="${o.cell || 4}"]`); await p.waitForFunction(() => MENU_DEV.entry.survey.state === "focus", null, { timeout: 20000, polling: 50 });
  await p.click(".ds-btn.go"); await waitProd(p); return p; }
Object.assign(module.exports, { menuReady, viaSpecies, waitProd, prodContext, prodTraining, prodExpedition });
