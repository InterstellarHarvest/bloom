// BLOOM-028C — Main Menu + Destination Entry QA.
//
//   NODE_PATH="$(npm root -g)" node docs/evidence/bloom-028c/qa-main-menu.js [--shots] [--no-firefox] [--port 8796]
//
// Part N (Node): provenance (start SHA d036ea3, only intended files changed, sphere / generator / content / index.html untouched,
//   survey-data.js + survey-worker.js byte-identical, the twelve backgrounds tracked and byte-identical to the owner's files) and
//   the 22nd suite tools/main-menu-check.js.
// Part M (demos/main-menu.html; Chromium, Firefox): title and menu; one painting + one preload requested; random choice without
//   an immediate repeat (reloads and returns); readability of the plaque on all twelve paintings (pixel contrast behind the text);
//   first-sector prefetch while the title shows, with no WebGL context; BEGIN before the prefetch completes (honest fill-in of the
//   very prefetched objects) and after it (one sweep, survey usable < 1.6 s); frame-sampled menu → survey transition (recede, mist,
//   swap only under an opaque veil, ≈ 0.35 s); return to the menu (survey disposed: workers, context, DOM, listeners; new painting
//   already preloaded; fresh prefetch); exit while loading; double Begin; dialogs; keyboard; reduced motion (forced, system, Settings);
//   console clean. Results → qa-results.json (+ perf.json, timelines.json); --shots writes the evidence PNGs. Exit 1 on any failure.
"use strict";
const path = require("path"), fs = require("fs"), crypto = require("crypto"), { spawn, spawnSync } = require("child_process"), http = require("http");
const ROOT = path.resolve(__dirname, "../../.."), OUT = __dirname;
const argv = process.argv.slice(2), SHOTS = argv.includes("--shots"), FIREFOX = !argv.includes("--no-firefox");
const PORT = +(argv[argv.indexOf("--port") + 1] || 0) || 8796;
const BASE = "d036ea3"; // BLOOM-028B final evidence (accepted start state)
const HOST = `http://127.0.0.1:${PORT}`, MENU = `${HOST}/demos/main-menu.html`, SURVEY = `${HOST}/demos/destination-survey.html`;
const SECTOR = 4242;
const BG_SHA = "b0831d12a1a27dc83a26e7333e4e7f7950da7af5b44f32d383574b3a4ca04ef7,0b5e86400ebd7489127551102303ab81ed14bdb6aeae80da3a0cffce8cc023ce,50208d194f9d19edb731b79ded27c69759934e135166866c714a268a2abd0a47,df24a8d71d229b8541d2a90ca890be106078f7dfdd05ae5c7a38cd5b9be8b5a4,a31429ddb070fe34c4c0197736e5b850f1c6c7140b4b4ccfa21c76d8826b65ce,314c38e5d3516d241c5f766d9fe29c5a7e01a356c81f9122304143c4a2f57f21,13f4ee264663befa3fe135bebbb91f1a2b9ea5ca2e7ad8bfc0a957e2d41a13da,0ad94e1466b2c2b7e95cdb575cc8443339db44a037329b5480cdfbe97bbb7f1b,2a4fa91d24413bf52a2375251b8399f6698295b94602ac13414c27a3495fe128,9138f38d81089658357291b86750559104ed55d704df162dba4d29f772dd445b,b08960497ac49e4a632de7b25864fc0f4c59ba9d855f3a84fcca75cf563ccaa2,6796d6e2e8e55d316c6a53e7d467db28e476708054ee9284f81144974c5f3587".split(",");
const results = []; let fails = 0; const PREEXISTING = new Set(); const perf = {}, timelines = {};
const J = o => JSON.stringify(o);
const check = (ok, name, detail = "") => { results.push({ ok: !!ok, name, detail: String(detail) }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); if (!ok) fails++; };
const info = (name, detail) => { results.push({ ok: true, info: true, name, detail: typeof detail === "string" ? detail : J(detail) }); console.log(`INFO  ${name}  — ${typeof detail === "string" ? detail : J(detail)}`); };
const git = (...a) => spawnSync("git", a, { cwd: ROOT }).stdout.toString();
const ALLOWED = [/^resources\/main-menu\//, /^resources\/destination-survey\/destination-survey\.(js|css)$/, /^resources\/destination-survey\/sector-pool\.js$/, /^demos\/main-menu\.html$/,
  /^tools\/main-menu-check\.js$/, /^docs\/MAIN_MENU_v1\.md$/, /^docs\/DESTINATION_SURVEY_v1\.md$/, /^docs\/evidence\/bloom-028c\//, /^README\.md$/];
const stats = a => { const s = [...a].sort((x, y) => x - y), n = s.length; if (!n) return { n: 0 };
  return { n, mean: +(s.reduce((x, y) => x + y, 0) / n).toFixed(1), p95: +s[Math.min(n - 1, Math.floor(n * 0.95))].toFixed(1), max: +s[n - 1].toFixed(1), over50: s.filter(x => x > 50).length }; };
// text colours of the plaque (sRGB → relative luminance): ivory #f3e9d2 and gold #f1d58a
const lum = hex => { const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const L_IVORY = lum("#f3e9d2"), L_GOLD = lum("#f1d58a");
const contrast = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

// ---------------------------------------------------------------- before any page script
const INIT = () => {
  const L = window.__LEAK = { listeners: 0, observers: 0, glCreated: 0, keyCapture: 0, contextWarnings: 0 }, fid = new WeakMap(); let nid = 0;
  const reg = new WeakMap(), keyOf = (type, fn, o) => { if (!fid.has(fn)) fid.set(fn, ++nid); return `${type}|${fid.get(fn)}|${o === true || !!(o && o.capture)}`; };
  const cap = (t, o) => /^key/.test(t) && (o === true || !!(o && o.capture));
  const oa = EventTarget.prototype.addEventListener, or = EventTarget.prototype.removeEventListener;
  EventTarget.prototype.addEventListener = function (type, fn, o) { if (fn) { let s = reg.get(this); if (!s) reg.set(this, s = new Set()); const k = keyOf(type, fn, o); if (!s.has(k)) { s.add(k); L.listeners++; if (cap(type, o)) L.keyCapture++; } } return oa.call(this, type, fn, o); };
  EventTarget.prototype.removeEventListener = function (type, fn, o) { if (fn) { const s = reg.get(this), k = keyOf(type, fn, o); if (s && s.delete(k)) { L.listeners--; if (cap(type, o)) L.keyCapture--; } } return or.call(this, type, fn, o); };
  const RO = window.ResizeObserver;
  window.ResizeObserver = class extends RO { constructor(cb) { super(cb); this.__t = new Set(); }
    observe(t, o) { if (!this.__t.has(t)) { this.__t.add(t); L.observers++; } return super.observe(t, o); }
    unobserve(t) { if (this.__t.delete(t)) L.observers--; return super.unobserve(t); }
    disconnect() { L.observers -= this.__t.size; this.__t.clear(); return super.disconnect(); } };
  const gls = []; const og = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, a) { const had = this.__gl; const c = og.call(this, type, a);
    if (c && /webgl/.test(type) && !had) { this.__gl = true; L.glCreated++; gls.push(new WeakRef(c)); } return c; };
  L.liveGL = () => gls.filter(r => { const c = r.deref(); return c && !c.isContextLost(); }).length;
  const ow = console.warn; console.warn = function (...a) { if (/webgl/i.test(String(a[0]))) L.contextWarnings++; return ow.apply(this, a); };
  window.__workers = { created: 0, posts: 0, live: new Set() };
  const OW = window.Worker; window.Worker = class extends OW { constructor(...a) { super(...a); __workers.created++; __workers.live.add(this); }
    postMessage(...a) { __workers.posts++; return super.postMessage(...a); } terminate() { __workers.live.delete(this); return super.terminate(); } };
  window.__gen = { calls: 0, log: [] };
  window.__armGen = () => { const B = window.BLOOM; if (!B) return false;
    const wrap = (obj, k, label) => { const f = obj && obj[k]; if (typeof f !== "function" || f.__wrapped) return; const w = function (...a) { __gen.calls++; __gen.log.push(label); return f.apply(this, a); }; w.__wrapped = true; obj[k] = w; };
    for (const k of ["generatePlanet", "generateFromArchetype", "validatePlanet"]) wrap(B, k, k);
    if (B.archetype) for (const k of ["attemptPlanet", "generateFromArchetype"]) wrap(B.archetype, k, "archetype." + k);
    if (B.play) for (const k of ["runSearch", "searchWorld"]) wrap(B.play, k, "play." + k);
    return true; };
  document.addEventListener("DOMContentLoaded", () => window.__armGen());
  window.__longTasks = []; if ((PerformanceObserver.supportedEntryTypes || []).includes("longtask")) try { new PerformanceObserver(l => { for (const e of l.getEntries()) window.__longTasks.push({ t: e.startTime, d: e.duration }); }).observe({ type: "longtask", buffered: true }); } catch { /* Firefox */ }
  // the prefetch's progress over time, from page start (every 25 ms): [ms, confirmed, entry state]
  window.__pre = []; const pi = setInterval(() => { const E = window.MENU_DEV && MENU_DEV.entry; if (!E) return; const p = E.prefetch && E.prefetch.progress; __pre.push([Math.round(performance.now()), p ? p.confirmed : null, E.state]); if (__pre.length > 4000) clearInterval(pi); }, 25);
  // a frame sampler for a menu ↔ survey transition; resolves when the entry settles with no overlay left
  window.__sample = (until) => new Promise(res => { const rows = window.__rows = []; let last = performance.now(); const E = MENU_DEV.entry;
    const f = now => { const ov = document.querySelector(".atx"), v = ov && ov.querySelector(".atx-veil"), ds = document.querySelector(".ds"), menuOn = E.menuHost.style.display !== "none";
      rows.push({ t: +now.toFixed(1), dt: +(now - last).toFixed(1), state: E.state, atx: ov ? ov.dataset.atxPhase : "none", veil: v ? +getComputedStyle(v).opacity : 0, kind: ov ? ov.className : null,
        menuOn, plaque: menuOn ? +getComputedStyle(E.menu.plaque).opacity : null, ds: !!ds, dsState: ds ? ds.dataset.state : null, cells: E.survey ? E.survey.cells.filter(Boolean).length : 0,
        incoming: document.querySelectorAll(".is-incoming").length, gl: __LEAK.glCreated, liveGL: __LEAK.liveGL(), workers: __workers.live.size, bg: E.menu.background ? E.menu.background.index : null });
      last = now; if (rows.length < 3 || !(until(E) && !ov)) requestAnimationFrame(f); else res(rows); };
    requestAnimationFrame(f); });
};

function waitHttp(url, ms) { const t0 = Date.now(); return new Promise(res => { const go = () => http.get(url, r => { r.resume(); res(r.statusCode === 200); }).on("error", () => Date.now() - t0 > ms ? res(false) : setTimeout(go, 200)); go(); }); }

async function openPage(browser, url, { viewport = { width: 1280, height: 800 }, reducedMotion = "no-preference", init = null } = {}) {
  const ctx = await browser.newContext({ viewport, reducedMotion });
  await ctx.addInitScript(INIT); if (init) await ctx.addInitScript(init);
  const page = await ctx.newPage(), log = { errors: [], warnings: [], all: [], requests: [] };
  page.on("console", m => { const t = `[${m.type()}] ${m.text()}`; log.all.push(t); if (m.type() === "error") log.errors.push(t); if (m.type() === "warning") log.warnings.push(t); });
  page.on("pageerror", e => log.errors.push("[pageerror] " + e.message));
  page.on("request", r => { if (/main-menu\/backgrounds\//.test(r.url())) log.requests.push({ file: r.url().split("/").pop(), at: Date.now() }); });
  await page.goto(url);
  return { ctx, page, log };
}
const ev = (page, fn, arg) => page.evaluate(fn, arg);
async function openMenu(browser, q = "", opts) { const o = await openPage(browser, `${MENU}?${q}`, opts); await o.page.waitForFunction(() => window.MENU_DEV && MENU_DEV.ready, null, { timeout: 60000 }); return o; }
const consoleIssues = (log, B) => { const known = e => /GPU stall due to ReadPixels/.test(e) || (PREEXISTING.has(B) && /WebGL context was lost\./.test(e)); return [...log.errors, ...log.warnings].filter(e => !known(e)); };

// screenshot crop → luminance statistics, decoded in a helper page (never in the page under test)
let helper = null;
async function cropLuminance(buf, rect) {
  return helper.evaluate(async ({ b64, r }) => {
    const img = new Image(); img.src = "data:image/png;base64," + b64; await img.decode();
    const c = document.createElement("canvas"); c.width = Math.round(r.width); c.height = Math.round(r.height); const x = c.getContext("2d"); x.drawImage(img, r.x, r.y, r.width, r.height, 0, 0, c.width, c.height);
    const d = x.getImageData(0, 0, c.width, c.height).data, ls = []; const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    for (let i = 0; i < d.length; i += 4) ls.push(0.2126 * lin(d[i]) + 0.7152 * lin(d[i + 1]) + 0.0722 * lin(d[i + 2]));
    ls.sort((a, b) => a - b); const n = ls.length;
    return { n, mean: +(ls.reduce((a, b) => a + b, 0) / n).toFixed(4), p50: +ls[n >> 1].toFixed(4), p95: +ls[Math.floor(n * 0.95)].toFixed(4), p99: +ls[Math.floor(n * 0.99)].toFixed(4), max: +ls[n - 1].toFixed(4) };
  }, { b64: buf.toString("base64"), r: rect });
}

// ---------------------------------------------------------------- Part N
function partN() {
  const head = git("rev-parse", "HEAD").trim(), base = git("rev-parse", BASE).trim();
  const anc = spawnSync("git", ["merge-base", "--is-ancestor", BASE, "HEAD"], { cwd: ROOT }).status === 0;
  const branch = git("rev-parse", "--abbrev-ref", "HEAD").trim(), first = git("rev-list", "--reverse", `${BASE}..HEAD`).trim().split("\n")[0];
  const firstParent = first ? git("rev-parse", `${first}^`).trim() : base;
  check(anc && base.startsWith("d036ea3") && firstParent === base, "N1 provenance: this work sits directly on d036ea3 (BLOOM-028B final evidence, accepted start state)", `HEAD ${head.slice(0, 7)} on ${branch}; base ${base.slice(0, 7)}`);
  const changed = [...new Set([...git("diff", "--name-only", BASE).split("\n"), ...git("ls-files", "--others", "--exclude-standard").split("\n")].filter(Boolean))];
  const bad = changed.filter(f => !ALLOWED.some(r => r.test(f)));
  check(!bad.length, "N2 only intended files changed (main-menu module + backgrounds, survey JS / CSS + sector-pool, the menu demo, the 22nd suite, docs, 028C evidence)", bad.join(", ") || `${changed.length} files`);
  const sphere = git("diff", "--name-only", BASE, "--", "resources/planet-sphere").trim();
  check(!sphere, "N3 PlanetSphereView / PlanetSphereRenderer / planet-texture / vendored Three.js unchanged", sphere || "unchanged");
  const gen = git("diff", "--name-only", BASE, "--", "resources/bloom-sim.js", "resources/bloom-gen.js", "resources/bloom-validate.js", "resources/bloom-witness.js", "resources/bloom-archetype.js",
    "resources/bloom-scenario.js", "resources/bloom-play.js", "resources/bloom-play-worker.js", "resources/atmosphere-transition", "content", "planets", "index.html").trim();
  check(!gen, "N4 generator, validator, witness, play flow, AtmosphereTransition, content, planets and index.html unchanged", gen || "unchanged");
  const sd = git("diff", "--name-only", BASE, "--", "resources/destination-survey/survey-data.js", "resources/destination-survey/survey-worker.js").trim();
  check(!sd, "N4b survey-data.js and survey-worker.js byte-identical to d036ea3 (sector semantics untouched; the pool moved, it did not change)", sd || "unchanged");
  const tracked = git("ls-files", "resources/main-menu/backgrounds").trim().split("\n").filter(Boolean);
  const shas = Array.from({ length: 12 }, (_, i) => { const f = path.join(ROOT, `resources/main-menu/backgrounds/menu-${String(i + 1).padStart(2, "0")}.jpg`); return fs.existsSync(f) ? crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex") : null; });
  const shaOk = shas.every((s, i) => s === BG_SHA[i]);
  check(tracked.length === 12 && shaOk, "N5 the twelve backgrounds are tracked by git and byte-identical (SHA-256) to the owner's files in the main checkout", `${tracked.length} tracked; ${shas.filter((s, i) => s === BG_SHA[i]).length}/12 hashes match`);
  const r = spawnSync(process.execPath, [path.join(ROOT, "tools/main-menu-check.js")], { cwd: ROOT }).stdout.toString();
  const p = (r.match(/^PASS/gm) || []).length, f = (r.match(/^FAIL/gm) || []).length;
  check(!f && p >= 12 && /ALL CHECKS PASS/.test(r), "N6 tools/main-menu-check.js (22nd suite): backgrounds, title, background rule, settings, SectorPool = buildSector, source rules", `${p} pass / ${f} fail`);
  info("N provenance", { head: head.slice(0, 7), branch, changed });
}

// ---------------------------------------------------------------- Part M
async function menuBasics(browser, B) {
  const tag = s => `${B} ${s}`;
  const { ctx, page, log } = await openMenu(browser, `bg=3&sector=${SECTOR}`);
  await page.waitForTimeout(2500);
  const a = await ev(page, () => { const E = MENU_DEV.entry, m = E.menu, imgs = [...document.querySelectorAll(".mm img")];
    return { title: document.querySelector("#mm-title").textContent, sub: document.querySelector(".mm-sub").textContent, docTitle: document.title, items: [...document.querySelectorAll(".mm-item")].map(b => b.textContent),
      tt: [...document.querySelectorAll(".mm-item, #mm-title, .mm-sub")].map(e => getComputedStyle(e).textTransform), bg: m.background, next: m.next, imgs: imgs.length, art: { complete: m.art.complete, w: m.art.naturalWidth, h: m.art.naturalHeight, shown: m.art.classList.contains("is-shown"), src: m.art.src.split("/").pop() },
      preloaded: m._preload ? { complete: m._preload.complete, w: m._preload.naturalWidth, src: m._preload.src.split("/").pop() } : null, continueBtn: !!document.querySelector('[data-act="continue"]'),
      canvasesInMenu: E.menuHost.querySelectorAll("canvas").length, gl: __LEAK.glCreated, liveGL: __LEAK.liveGL(), workers: __workers.created, state: E.state, status: document.querySelector(".mm-status").textContent,
      plaque: (() => { const p = m.plaque, i = p.querySelector(".mm-plaque-inner"), h1 = p.querySelector("h1"); return { scrollW: i.scrollWidth, clientW: i.clientWidth, scrollH: i.scrollHeight, clientH: i.clientHeight, h1W: Math.round(h1.getBoundingClientRect().width), innerW: Math.round(i.getBoundingClientRect().width), overflow: getComputedStyle(p).overflow }; })(),
      prefetch: E.prefetch.progress, gen: __gen.calls }; });
  check(a.title === "Strange Bloom" && a.sub === "Unknown Soils" && a.docTitle === "Strange Bloom — Unknown Soils" && J(a.items) === J(["Begin Expedition", "Training", "Settings", "Credits"]) && a.tt.every(t => t === "uppercase") && !a.continueBtn,
    tag("M1 title STRANGE BLOOM / UNKNOWN SOILS (text exactly \"Strange Bloom\" / \"Unknown Soils\", capitals by CSS), the four entries in order, no CONTINUE EXPEDITION (no save state exists)"), J({ title: a.title, sub: a.sub, items: a.items }));
  const files = [...new Set(log.requests.map(r => r.file))];
  check(a.bg.index === 2 && a.art.src === "menu-03.jpg" && a.art.complete && a.art.w === 1280 && a.art.h === 720 && a.art.shown && a.imgs === 1 && files.length === 2 && files[0] === "menu-03.jpg" && a.next && a.next.index !== 2 && files[1] === a.next.src.split("/").pop() && a.preloaded && a.preloaded.complete && a.preloaded.w === 1280,
    tag("M2 asset loading: the forced painting (bg=3) is the one <img> on the menu, decoded at 1280 × 720 and faded in; exactly TWO background files requested in 2.5 s — the active one and the one preloaded for the next show (never all twelve)"),
    `requests ${J(files)}; next ${a.next && a.next.index + 1}; preload complete ${a.preloaded && a.preloaded.complete}`);
  check(a.plaque.scrollW === a.plaque.clientW && a.plaque.scrollH === a.plaque.clientH && a.plaque.h1W < a.plaque.innerW && a.plaque.overflow === "visible", tag("M2b the plaque fits its content: the title is narrower than the plaque, its scroll box has no overflow at 1280 × 800 (the frame itself clips nothing)"), J(a.plaque));
  check(a.workers > 0 && a.gl === 0 && a.liveGL === 0 && a.canvasesInMenu === 0 && a.state === "menu" && a.prefetch && a.prefetch.seed === SECTOR && a.gen === 0,
    tag("M5 prefetch on the title screen: workers were started while the menu shows, NO WebGL context and no canvas exist for it (the menu is HTML over one <img>), the main thread never generates"), `workers ${a.workers}, gl ${a.gl}, prefetch ${J(a.prefetch)}`);
  const pre = await ev(page, () => __pre.filter(r => r[2] === "menu"));
  const firstConfirmed = pre.find(r => r[1] >= 1), statusSeen = await ev(page, () => document.querySelector(".mm-status").textContent);
  check(firstConfirmed && /Surveying sector|Sector surveyed/.test(statusSeen), tag("M5b worlds are confirmed while the player is still on the menu (the first within the sample), and the status line reports it quietly"), `first confirmed at ${firstConfirmed && firstConfirmed[0]} ms; status "${statusSeen}"`);
  perf[tag("menu load")] = { loads: await ev(page, () => MENU_DEV.entry.menu.stats.loads), firstConfirmedMs: firstConfirmed && firstConfirmed[0], longTasks: await ev(page, () => __longTasks.map(x => Math.round(x.d))) };
  // dialogs + keyboard
  const d = await ev(page, async () => { const E = MENU_DEV.entry, m = E.menu, out = {}, tick = () => new Promise(r => setTimeout(r, 30)); // (a dialog's close event is dispatched asynchronously)
    m.items.training.click(); out.trainingOpen = m.dialogs.training.open; out.trainingText = m.dialogs.training.textContent.replace(/\s+/g, " ").trim().slice(0, 80); m.dialogs.training.close(); await tick(); out.focusBack = document.activeElement === m.items.training;
    m.items.credits.click(); out.creditsOpen = m.dialogs.credits.open; out.creditsHasTitle = /Strange Bloom/.test(m.dialogs.credits.textContent); m.dialogs.credits.close();
    m.items.settings.click(); out.settingsOpen = m.dialogs.settings.open; const r = m.dialogs.settings.querySelector('input[value="reduced"]'); r.click(); r.dispatchEvent(new Event("change", { bubbles: true }));
    out.stored = localStorage.getItem("strange-bloom.settings"); out.entryRm = E.reducedMotion; out.menuRm = m.root.classList.contains("rm"); m.dialogs.settings.close();
    const f = m.dialogs.settings.querySelector('input[value="full"]'); m.items.settings.click(); f.click(); f.dispatchEvent(new Event("change", { bubbles: true })); out.entryFull = E.reducedMotion; out.menuFull = m.root.classList.contains("motion-full"); m.dialogs.settings.close();
    const s = m.dialogs.settings.querySelector('input[value="system"]'); m.items.settings.click(); s.click(); s.dispatchEvent(new Event("change", { bubbles: true })); out.entrySystem = E.reducedMotion; m.dialogs.settings.close(); await tick();
    return out; });
  check(d.trainingOpen && /not yet open|Not yet open/i.test(d.trainingText) && d.focusBack && d.creditsOpen && d.creditsHasTitle && d.settingsOpen && d.stored === '{"motion":"reduced"}' && d.entryRm === true && d.menuRm && d.entryFull === false && d.menuFull && d.entrySystem === null,
    tag("M13 dialogs: TRAINING opens the clearly-marked placeholder (focus returns to its button on close), CREDITS opens, SETTINGS motion persists to localStorage and takes effect at once (reduced → true, full → false, system → null)"), J(d));
  await page.waitForTimeout(100); await ev(page, () => MENU_DEV.entry.menu.items.begin.focus());
  await page.keyboard.press("ArrowDown"); const k1 = await ev(page, () => document.activeElement.dataset.act);
  await page.keyboard.press("ArrowUp"); await page.keyboard.press("ArrowUp"); const k2 = await ev(page, () => document.activeElement.dataset.act);
  await page.keyboard.press("End"); const k3 = await ev(page, () => document.activeElement.dataset.act); await page.keyboard.press("Home"); const k4 = await ev(page, () => document.activeElement.dataset.act);
  check(k1 === "training" && k2 === "credits" && k3 === "credits" && k4 === "begin", tag("M14 keyboard: ↓ ↑ move through the entries (wrapping), Home / End jump; Enter / Space activate as native buttons"), `${k1} ${k2} ${k3} ${k4}`);
  if (SHOTS && B === "chromium") { await ev(page, () => MENU_DEV.entry.menu.items.settings.click()); await page.waitForTimeout(250); fs.writeFileSync(path.join(OUT, "03-settings.png"), await page.screenshot()); await ev(page, () => MENU_DEV.entry.menu.dialogs.settings.close()); }
  const issues = consoleIssues(log, B), devErr = await ev(page, () => MENU_DEV.errors);
  check(!issues.length && !devErr.length, tag("M15 menu page: no console errors or warnings, no uncaught errors"), J([...issues, ...devErr]).slice(0, 300));
  await ctx.close();
}

async function randomization(browser, B) {
  const tag = s => `${B} ${s}`;
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } }); await ctx.addInitScript(INIT); const page = await ctx.newPage();
  const seq = []; let repeats = 0, unknown = 0;
  for (let i = 0; i < 10; i++) { await page.goto(`${MENU}?workers=1`); await page.waitForFunction(() => window.MENU_DEV && MENU_DEV.ready, null, { timeout: 60000 });
    const r = await ev(page, () => ({ bg: MENU_DEV.entry.menu.background.index, last: sessionStorage.getItem("strange-bloom.menu.last-background") })); if (i && r.bg === seq[i - 1]) repeats++; if (!(r.bg >= 0 && r.bg < 12)) unknown++; seq.push(r.bg); }
  check(repeats === 0 && unknown === 0 && new Set(seq).size >= 4, tag("M3 ten page loads in one tab: a random painting each time, never the one just shown (sessionStorage remembers it across reloads), several distinct"), `sequence ${J(seq.map(x => x + 1))}`);
  // returns without leaving: show() ×30 — the next painting was chosen and preloaded in advance, and is never the current one
  // (a player spends seconds on the menu before leaving and returning; here the gap is modelled by awaiting the preload's decode)
  const s = await ev(page, async () => { const m = MENU_DEV.entry.menu, out = { seq: [m.background.index], notPreloaded: 0, repeats: 0, swapMs: [], preloadWaitMs: [] };
    for (let i = 0; i < 30; i++) { const planned = m.next.index, pre = m._preload, t = performance.now(); await pre.decode().catch(() => {}); out.preloadWaitMs.push(Math.round(performance.now() - t));
      if (!(pre.complete && pre.naturalWidth === 1280)) out.notPreloaded++;
      m.hide(); const t0 = performance.now(); await m.show(); out.swapMs.push(Math.round(performance.now() - t0));
      if (m.background.index !== planned || m.background.index === out.seq.at(-1)) out.repeats++; out.seq.push(m.background.index); }
    out.loads = m.stats.loads.length; out.preloads = m.stats.preloads; return out; });
  const hist = {}; for (const x of s.seq) hist[x + 1] = (hist[x + 1] || 0) + 1;
  check(s.repeats === 0 && s.notPreloaded === 0 && new Set(s.seq).size >= 8 && Math.max(...s.swapMs) < 400, tag("M3b thirty returns to the menu: each show takes the painting chosen and preloaded during the previous one (already decoded), never an immediate repeat; swaps are quick"),
    `repeats ${s.repeats}, not preloaded ${s.notPreloaded}, distinct ${new Set(s.seq).size}/12, max swap ${Math.max(...s.swapMs)} ms, preload wait max ${Math.max(...s.preloadWaitMs)} ms, histogram ${J(hist)}`);
  await ctx.close();
}

/** Readability: the plaque's text hidden for one frame, the pixels behind it measured; contrast of ivory / gold text vs the 95th-percentile background luminance. */
async function readability(browser, B) {
  const tag = s => `${B} ${s}`, rows = [];
  const measure = async (page, bg, viewport, mode) => {
    const rect = await ev(page, () => { const i = document.querySelector(".mm-plaque-inner"), r = i.getBoundingClientRect(); const pad = 8; return { x: r.x + pad, y: r.y + pad, width: r.width - 2 * pad, height: r.height - 2 * pad }; });
    await ev(page, () => { document.querySelector(".mm-plaque-inner").style.visibility = "hidden"; });
    await page.waitForTimeout(80);
    const buf = await page.screenshot(); const L = await cropLuminance(buf, rect);
    await ev(page, () => { document.querySelector(".mm-plaque-inner").style.visibility = ""; });
    const c = { ivoryP95: +contrast(L_IVORY, L.p95).toFixed(2), goldP95: +contrast(L_GOLD, L.p95).toFixed(2), ivoryMax: +contrast(L_IVORY, L.max).toFixed(2), goldMax: +contrast(L_GOLD, L.max).toFixed(2) };
    rows.push({ bg, viewport: `${viewport.width}×${viewport.height}`, mode, ...L, ...c }); return c;
  };
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } }); await ctx.addInitScript(INIT); const page = await ctx.newPage();
  const thumbs = [];
  for (let bg = 1; bg <= 12; bg++) { await page.goto(`${MENU}?bg=${bg}&workers=1`); await page.waitForFunction(() => window.MENU_DEV && MENU_DEV.ready && MENU_DEV.entry.menu.art.classList.contains("is-shown"), null, { timeout: 60000 }); await page.waitForTimeout(800);
    if (SHOTS && B === "chromium") thumbs.push((await page.screenshot()).toString("base64"));
    await measure(page, bg, { width: 1280, height: 800 }, "desktop"); }
  await ctx.close();
  for (const [vp, bgs, mode] of [[{ width: 1920, height: 1080 }, [4, 9], "large"], [{ width: 390, height: 844 }, [2, 7], "phone"], [{ width: 1024, height: 768 }, [6], "4:3"]]) {
    const c2 = await browser.newContext({ viewport: vp }); await c2.addInitScript(INIT); const p2 = await c2.newPage();
    for (const bg of bgs) { await p2.goto(`${MENU}?bg=${bg}&workers=1`); await p2.waitForFunction(() => window.MENU_DEV && MENU_DEV.ready && MENU_DEV.entry.menu.art.classList.contains("is-shown"), null, { timeout: 60000 }); await p2.waitForTimeout(800); await measure(p2, bg, vp, mode); }
    await c2.close(); }
  const worst = rows.reduce((a, r) => Math.min(a, r.ivoryP95, r.goldP95), Infinity), worstMax = rows.reduce((a, r) => Math.min(a, r.ivoryMax, r.goldMax), Infinity);
  check(worst >= 4.5 && worstMax >= 3, tag("M4 readability: on every painting (12 at 1280 × 800; 1920 × 1080, 1024 × 768 and phone samples) the plaque's text keeps ≥ 4.5 : 1 contrast against the 95th-percentile luminance behind it, ≥ 3 : 1 against the single brightest pixel"),
    `worst p95 contrast ${worst.toFixed(2)}, worst brightest-pixel contrast ${worstMax.toFixed(2)} (${rows.length} measurements)`);
  perf[tag("readability")] = rows;
  if (SHOTS && B === "chromium" && thumbs.length === 12) { // contact sheet: all twelve paintings under the same overlay
    const png = await helper.evaluate(async list => { const W = 640, H = 400, cols = 3; const c = document.createElement("canvas"); c.width = W * cols; c.height = H * Math.ceil(list.length / cols); const x = c.getContext("2d");
      for (let i = 0; i < list.length; i++) { const img = new Image(); img.src = "data:image/png;base64," + list[i]; await img.decode(); x.drawImage(img, (i % cols) * W, Math.floor(i / cols) * H, W, H); x.fillStyle = "#000c"; x.fillRect((i % cols) * W + 8, Math.floor(i / cols) * H + 8, 92, 26); x.fillStyle = "#ffd479"; x.font = "bold 16px system-ui"; x.fillText(`menu-${String(i + 1).padStart(2, "0")}`, (i % cols) * W + 14, Math.floor(i / cols) * H + 27); }
      return c.toDataURL("image/png").split(",")[1]; }, thumbs);
    fs.writeFileSync(path.join(OUT, "09-contact-sheet-all-twelve.png"), Buffer.from(png, "base64")); }
}

/** BEGIN: sample the transition; `when` = "early" (click once a world is confirmed but before the sector is complete) or "ready". */
async function begin(browser, B, { when, q = "", viewport, reducedMotion = "no-preference", name, shots = null, rm = false }) {
  const tag = s => `${B} ${name}: ${s}`;
  const { ctx, page, log } = await openMenu(browser, `sector=${SECTOR}${q}`, { viewport, reducedMotion });
  if (when === "early") await page.waitForFunction(() => { const p = MENU_DEV.entry.prefetch.progress; return p.confirmed >= 1 && !p.ready; }, null, { timeout: 60000 });
  else { await page.waitForFunction(() => MENU_DEV.entry.prefetch.progress.ready, null, { timeout: 120000 }); await ev(page, () => MENU_DEV.entry.prefetch.ready.then(s => { window.__preSector = s; })); await page.waitForFunction(() => window.__preSector); }
  const pre = await ev(page, () => { const E = MENU_DEV.entry, e = E.prefetch.first.entry; window.__preShown = e.shown.flat().slice(); window.__preEntry = e;
    return { progress: E.prefetch.progress, shown: __preShown.length, listeners: __LEAK.listeners, observers: __LEAK.observers, gl: __LEAK.glCreated, workers: __workers.created, live: __workers.live.size, bg: E.menu.background.index, gen: __gen.calls }; });
  const sampling = ev(page, () => __sample(E => E.state === "survey"));
  await page.waitForTimeout(30);
  const tClick = Date.now();
  await page.dblclick('[data-act="begin"]');                              // a double click must enter once
  if (shots && shots.mist) { await page.waitForFunction(() => document.querySelector(".atx") && +getComputedStyle(document.querySelector(".atx .atx-veil")).opacity > 0.3); fs.writeFileSync(path.join(OUT, shots.mist), await page.screenshot()); }
  const rows = await sampling;
  const tRevealed = Date.now() - tClick;
  const atMount = await ev(page, () => { const E = MENU_DEV.entry, S = E.survey; return { state: E.state, begins: E.stats.begins, surveys: document.querySelectorAll(".ds").length, dsState: S && S.state, cells: S ? S.cells.filter(Boolean).length : 0, incoming: document.querySelectorAll(".is-incoming").length,
    adopted: S && S.stats.adopted, gl: __LEAK.glCreated, liveGL: __LEAK.liveGL(), hostViews: S && S.host.views.length, canvases: E.surveyHost.querySelectorAll("canvas").length, menuOn: E.menuHost.style.display !== "none", exitShown: S && !S.exitBtn.hidden,
    fromPrefetch: S ? S.cells.filter(Boolean).every(c => __preEntry.shown.flat().includes(c) || __preEntry.cols.some(col => col && col.cells.includes(c)) || (window.__preSector && __preSector.cells.includes(c))) : null, entry: E.stats.entries.at(-1), rm: S && S.reducedMotion }; });
  if (shots && shots.mount) { await page.waitForTimeout(when === "early" ? 350 : 1100); fs.writeFileSync(path.join(OUT, shots.mount), await page.screenshot()); }
  await page.waitForFunction(() => MENU_DEV.entry.survey && MENU_DEV.entry.survey.state === "survey", null, { timeout: 120000 });
  const tReady = Date.now() - tClick;
  const after = await ev(page, () => { const E = MENU_DEV.entry, S = E.survey, D = window.__preSector, cells = S.cells.filter(Boolean);
    const inSector = cells.every(c => S.sector.cells.includes(c)) && S.sector.cells.every(c => cells.includes(c)), fromPre = D ? cells.every(c => D.cells.includes(c)) && D.cells.every(c => cells.includes(c)) : null;
    return { n: cells.length, inSector, fromPre, validated: cells.every(c => c.authored || (c.planet.archetype && c.planet.archetype.winnabilityChecked && c.planet.archetype.validatedLayers.join() === "1,2,3,4,5,6,7,8")),
      cols: cells.every(c => c.classId === ["stable", "volatile", "extreme"][S.cells.indexOf(c) % 3]), gen: __gen.calls, incoming: document.querySelectorAll(".is-incoming").length, enabled: S.buttons.filter(b => !b.disabled).length,
      sectorTimes: S.stats.sectorTimes.length, adopted: S.stats.adopted, entry: E.stats.entries.at(-1), hostViews: S.host.views.length, gl: __LEAK.glCreated, liveGL: __LEAK.liveGL(), seed: S.sectorSeed, prefetchNull: E.prefetch === null }; });
  const out = { pre, rows, atMount, after, tReady: after.entry.surveyReadyMs, tReadyExternal: tReady, tRevealed, log, page, ctx, tag, rm, when };
  timelines[`${B} ${name}`] = rows.map(r => [Math.round(r.t - rows[0].t), r.state, r.atx, +r.veil.toFixed(3), r.menuOn ? (r.plaque == null ? "menu" : `menu@${r.plaque.toFixed(2)}`) : "-", r.ds ? `ds:${r.dsState}:${r.cells}` : "-"]);
  perf[`${B} ${name} frames`] = Object.fromEntries(Object.entries(rows.slice(1).reduce((by, r) => { const k = r.atx === "none" ? (r.ds ? "survey" : "menu") : r.atx; (by[k] = by[k] || []).push(r.dt); return by; }, {})).map(([k, v]) => [k, stats(v)]));
  perf[`${B} ${name} timing`] = { coveredMs: after.entry.coveredMs, revealedMs: after.entry.revealedMs, surveyReadyMs: after.entry.surveyReadyMs, externalRevealedMs: tRevealed, prefetchAtClick: pre.progress };
  return out;
}

function beginChecks(d) {
  const { tag, rows, pre, atMount: m, after: a, rm, when } = d;
  const coveredIdx = rows.findIndex(r => r.atx === "covered"), firstDs = rows.find(r => r.ds), firstOv = rows.find(r => r.atx !== "none"), beforeOv = rows.slice(0, rows.indexOf(firstOv));
  const lastMenu = rows.filter(r => r.menuOn).at(-1), plaqueReceding = firstOv && firstOv.plaque != null && firstOv.plaque < 1 && rows.slice(0, coveredIdx).some(r => r.plaque != null && r.plaque < 0.6);
  check(m.begins === 1 && m.surveys === 1 && m.state === "survey", tag("E1 a double click on BEGIN EXPEDITION enters once: one survey, one transition, state survey"), `begins ${m.begins}, surveys ${m.surveys}`);
  // (the menu is hidden and the survey mounted inside the covered callback, in one task: the first frame that has the survey
  // — and the first frame without the menu — must be a covered frame with the veil at 1; no frame ever shows both)
  const firstNoMenu = rows.find(r => !r.menuOn && r.t > rows[0].t);
  check(firstOv && /atx-sweep/.test(firstOv.kind) && rows[coveredIdx] && rows[coveredIdx].veil >= 0.999 && firstDs && firstDs.atx === "covered" && firstDs.veil >= 0.999 && firstNoMenu && firstNoMenu.atx === "covered" && firstNoMenu.veil >= 0.999
    && rows.filter(r => r.ds && r.atx === "covered").every(r => r.veil >= 0.999) && rows.filter(r => r.atx === "concealing").every(r => !r.ds) && rows.every(r => !(r.ds && r.menuOn)),
    tag("E2 frame-sampled handoff: the SUBDUED mist (sweep) with full concealment — the survey first exists, and the menu is first gone, on a covered frame with the veil at 1; never while concealing; no frame shows both screens"),
    `overlay ${firstOv && firstOv.kind}; first survey frame ${firstDs && firstDs.atx} veil ${firstDs && firstDs.veil}; menu last seen ${lastMenu && lastMenu.atx} veil ${lastMenu && lastMenu.veil}`);
  if (!rm) check(plaqueReceding, tag("E3 the title / menu recede (plaque opacity falling) before and under the mist"), `plaque at first overlay frame ${firstOv && firstOv.plaque}`);
  else check(a.entry.revealedMs < 700, tag("E3 reduced motion: a short fade, no travel; the whole handoff well under a second"), `revealed ${a.entry.revealedMs} ms`);
  const t = a.entry;
  check(t.revealedMs <= (rm ? 700 : 1100) && t.coveredMs <= (rm ? 400 : 600) && !rows.at(-1).menuOn, tag("E4 restrained and fast: covered ≈ 0.3 s after the click; fully revealed on the survey ≈ 0.6–1.0 s headless (the survey's first layout and globe frame are drawn under cover; real-GPU numbers in the GPU sample); the menu is hidden under cover"), `covered ${t.coveredMs} ms, revealed ${t.revealedMs} ms`);
  check(m.gl === 1 && m.liveGL === 1 && m.hostViews === 9 && m.canvases === 1 && pre.gl === 0 && a.hostViews === 9 && a.gl === 1,
    tag("E5 one PlanetSphereRenderer: zero WebGL contexts on the menu, exactly one (nine views, one canvas) once the survey exists — the prefetch created none"), `gl before ${pre.gl} → ${m.gl}; views ${m.hostViews}`);
  if (when === "early") {
    const firstDsRow = rows.find(r => r.ds);
    check(m.adopted && m.adopted.ready === false && m.adopted.confirmed >= 1 && firstDsRow && firstDsRow.cells >= m.adopted.confirmed && firstDsRow.cells < 9 && firstDsRow.incoming === 9 - firstDsRow.cells && m.cells >= m.adopted.confirmed && m.incoming === 9 - m.cells && m.fromPrefetch === true && (m.dsState === "loading" || m.dsState === "survey"),
      tag("E6 BEGIN before the prefetch completes: the survey adopts the half-built sector honestly — the worlds already confirmed are on screen in its very first frame (the objects the pool validated), the rest show \"Incoming\" and fill in as confirmed"),
      `confirmed at click ${pre.progress.confirmed}, at mount ${m.adopted && m.adopted.confirmed}; first survey frame cells ${firstDsRow && firstDsRow.cells} / incoming ${firstDsRow && firstDsRow.incoming}; after the reveal ${m.cells} / ${m.incoming}`);
  } else {
    check(m.adopted && m.adopted.ready === true && m.adopted.confirmed === 9 && m.incoming === 0 && m.fromPrefetch === true && a.fromPre === true && d.tReady <= 1700 && a.sectorTimes === 1,
      tag("E6 BEGIN after the prefetch completed: the survey arrives with the prefetched sector in one sweep (no \"Incoming\", nothing validated again: one sectorTimes entry) and is fully usable within 1.7 s of the click; its nine worlds ARE the nine prefetched objects"),
      `click → survey usable ${d.tReady} ms; prefetch took ${pre.progress.ms} ms before the click`);
  }
  check(a.n === 9 && a.inSector && a.validated && a.cols && a.gen === 0 && a.incoming === 0 && a.enabled === 9 && a.seed === SECTOR && a.prefetchNull,
    tag("E7 identity when ready: nine fully validated worlds (layers 1–8), the cells are exactly the sector's objects, each in its class's column, no main-thread generation ever, all buttons enabled; the pool now belongs to the survey"), `gen ${a.gen}, enabled ${a.enabled}`);
}

/** Return to the menu from the survey state; also used after an early Begin (exit while loading). */
async function returnToMenu(d, { whileLoading = false, shots = null } = {}) {
  const { page, tag, log } = d, B = tag("").split(" ")[0];
  if (whileLoading) { /* the survey is still filling in */ } else await page.waitForFunction(() => MENU_DEV.entry.survey && MENU_DEV.entry.survey.state === "survey", null, { timeout: 120000 });
  const before = await ev(page, () => { const E = MENU_DEV.entry; window.__surveyWorkers = [...__workers.live]; return { bg: E.menu.background.index, next: E.menu.next.index, preComplete: E.menu._preload.complete, listeners: __LEAK.listeners, observers: __LEAK.observers, workers: __workers.created, live: __workers.live.size, liveGL: __LEAK.liveGL(), state: E.state, dsState: E.survey.state }; });
  const sampling = ev(page, () => __sample(E => E.state === "menu"));
  await page.waitForTimeout(30);
  await page.click('[data-act="exit"]');
  const rows = await sampling;
  await page.waitForTimeout(150);
  const after = await ev(page, () => { const E = MENU_DEV.entry; return { state: E.state, bg: E.menu.background.index, loads: E.menu.stats.loads, menuOn: E.menuHost.style.display !== "none", survey: E.survey, surveyChildren: E.surveyHost.children.length, dsNodes: document.querySelectorAll(".ds, .ds *").length,
    live: __workers.live.size, surveyWorkersLeft: __surveyWorkers.filter(w => __workers.live.has(w)).length, newPoolWorkers: E.prefetch ? E.prefetch._pool.length : 0, created: __workers.created, liveGL: __LEAK.liveGL(), gl: __LEAK.glCreated, listeners: __LEAK.listeners, observers: __LEAK.observers, keyCapture: __LEAK.keyCapture, anims: document.getAnimations().filter(a => a.playState === "running").length,
    active: document.activeElement && document.activeElement.dataset.act, prefetch: E.prefetch && E.prefetch.progress, overlay: !!document.querySelector(".atx"), artShown: E.menu.art.classList.contains("is-shown"), returns: E.stats.returns, errors: MENU_DEV.errors.slice() }; });
  if (shots) { await page.waitForFunction(() => MENU_DEV.entry.menu.art.classList.contains("is-shown")); await page.waitForTimeout(700); fs.writeFileSync(path.join(OUT, shots), await page.screenshot()); }
  // (dispose and the menu's return happen inside the covered callback, in one task: the first frame without the survey, and
  // the first with the menu, are covered frames with the veil at 1; the survey never comes back; no frame shows both)
  const firstNoDs = rows.find(r => !r.ds && r.t > rows[0].t), firstMenu = rows.find(r => r.menuOn && r.t > rows[0].t), lastDs = rows.filter(r => r.ds).at(-1), lastDsIdx = rows.indexOf(lastDs);
  check(firstNoDs && firstNoDs.atx === "covered" && firstNoDs.veil >= 0.999 && firstMenu && firstMenu.atx === "covered" && firstMenu.veil >= 0.999 && rows.slice(lastDsIdx + 1).every(r => !r.ds) && rows.every(r => !(r.ds && r.menuOn)) && rows.filter(r => r.atx === "concealing").every(r => !r.menuOn),
    tag(`R1${whileLoading ? " (while still loading)" : ""} return: the survey is first gone, and the menu first back, on covered frames with the veil at 1; the survey never comes back; no frame shows both screens`), `${rows.length} frames; survey last seen ${lastDs && lastDs.atx} veil ${lastDs && lastDs.veil}`);
  check(after.state === "menu" && after.menuOn && after.survey === null && after.surveyChildren === 0 && after.dsNodes === 0 && after.surveyWorkersLeft === 0 && after.live === after.newPoolWorkers && after.liveGL === 0 && !after.overlay && after.returns === 1 && !after.errors.length,
    tag("R2 cleanup: survey DOM gone, every worker of the pool it owned terminated (the only live workers are the next visit's fresh prefetch), its WebGL context released, overlay gone, no uncaught errors (a return mid-fill rejects `ready` quietly)"), J({ surveyWorkersLeft: after.surveyWorkersLeft, live: after.live, newPoolWorkers: after.newPoolWorkers, liveGL: after.liveGL, dsNodes: after.dsNodes, errors: after.errors }));
  check(after.listeners === d.pre.listeners && after.observers === d.pre.observers && after.keyCapture === 0, tag("R3 listeners and observers back to the pre-survey baseline (menu + transition + pool, measured before BEGIN); no key capture left"), `listeners ${d.pre.listeners} → ${before.listeners} (survey up) → ${after.listeners}, observers ${d.pre.observers} → ${before.observers} → ${after.observers}`);
  const lastLoad = after.loads.at(-1);
  check(after.bg === before.next && after.bg !== before.bg && before.preComplete && lastLoad && lastLoad.index === after.bg && lastLoad.ms < 250 && after.active === "begin" && after.artShown,
    tag("R4 the menu returns with its NEXT painting — chosen and preloaded during the previous show, decoded already (swap < 250 ms), never the painting just shown — and focus lands on BEGIN EXPEDITION"), `painting ${before.bg + 1} → ${after.bg + 1} (planned ${before.next + 1}); load ${lastLoad && lastLoad.ms} ms`);
  check(after.prefetch && after.created > before.workers && after.prefetch.seed !== SECTOR, tag("R5 a fresh sector prefetch starts for the next visit once the mist has cleared (new workers, a new random seed)"), `prefetch ${J(after.prefetch)}`);
  timelines[tag("return")] = rows.map(r => [Math.round(r.t - rows[0].t), r.state, r.atx, +r.veil.toFixed(3), r.menuOn ? "menu" : "-", r.ds ? `ds:${r.dsState}` : "-", r.workers, r.liveGL]);
  perf[tag("return frames")] = stats(rows.slice(1).map(r => r.dt));
  const issues = consoleIssues(log, B);
  check(!issues.length, tag("R6 no console errors / warnings across menu → survey → menu") + (PREEXISTING.has(B) ? " (Firefox's \"WebGL context was lost.\" on the survey's dispose is the unmodified renderer's own message, proven pre-existing by F0)" : ""), J(issues).slice(0, 300));
  await d.ctx.close();
}

async function reducedMotion(browser, B) {
  const tag = s => `${B} ${s}`;
  // forced via ?rm=1: menu entrances immediate, transition reduced, survey reduced
  { const { ctx, page } = await openMenu(browser, `rm=1&sector=${SECTOR}&bg=5`);
    const m = await ev(page, async () => { const E = MENU_DEV.entry, m = E.menu; await new Promise(r => setTimeout(r, 120));
      const anims = m.root.getAnimations({ subtree: true }).filter(a => a.playState === "running"); return { rmClass: m.root.classList.contains("rm"), running: anims.length, entryRm: E.reducedMotion, artTransition: getComputedStyle(m.art).transitionDuration }; });
    check(m.rmClass && m.running === 0 && m.entryRm === true && parseFloat(m.artTransition) <= 0.02, tag("RM1 forced reduced motion (?rm=1): the menu's entrance animations are immediate (none running after 120 ms), the painting appears without a fade"), J(m));
    await page.waitForFunction(() => MENU_DEV.entry.prefetch.progress.confirmed >= 1, null, { timeout: 60000 });
    const sampling = ev(page, () => __sample(E => E.state === "survey")); await page.waitForTimeout(30); await page.click('[data-act="begin"]'); const rows = await sampling;
    const r = await ev(page, () => ({ rm: MENU_DEV.entry.survey.reducedMotion, cls: MENU_DEV.entry.survey.root.classList.contains("rm"), entry: MENU_DEV.entry.stats.entries[0] }));
    const ov = rows.find(x => x.atx !== "none");
    check(ov && / rm/.test(ov.kind) && r.rm === true && r.cls && r.entry.revealedMs < 700, tag("RM2 forced: the transition runs its reduced path (overlay class rm) and the survey is constructed with reducedMotion true"), `revealed ${r.entry.revealedMs} ms; overlay ${ov && ov.kind}`);
    if (SHOTS && B === "chromium") { /* menu shot under reduced motion is identical in layout; the survey under rm: */ await page.waitForTimeout(300); fs.writeFileSync(path.join(OUT, "08-reduced-motion-survey.png"), await page.screenshot()); }
    await ctx.close(); }
  // system preference, no option
  { const { ctx, page } = await openMenu(browser, `sector=${SECTOR}&bg=6`, { reducedMotion: "reduce" });
    const m = await ev(page, async () => { const E = MENU_DEV.entry, m = E.menu; await new Promise(r => setTimeout(r, 120)); return { running: m.root.getAnimations({ subtree: true }).filter(a => a.playState === "running").length, entryRm: E.reducedMotion, menuRm: m.reducedMotion, matches: matchMedia("(prefers-reduced-motion: reduce)").matches }; });
    await page.waitForFunction(() => MENU_DEV.entry.prefetch.progress.confirmed >= 1, null, { timeout: 60000 });
    const sampling = ev(page, () => __sample(E => E.state === "survey")); await page.waitForTimeout(30); await page.click('[data-act="begin"]'); const rows = await sampling;
    const r = await ev(page, () => ({ rm: MENU_DEV.entry.survey.reducedMotion })), ov = rows.find(x => x.atx !== "none");
    check(m.matches && m.entryRm === null && m.menuRm === true && m.running === 0 && ov && / rm/.test(ov.kind) && r.rm === true, tag("RM3 system prefers-reduced-motion: reduce with no option: the menu, the transition and the survey each take their reduced path by themselves (the setting stays \"follow system\")"), J({ ...m, surveyRm: r.rm }));
    await ctx.close(); }
  // Settings → reduced, persisted across a reload
  { const { ctx, page } = await openMenu(browser, `sector=${SECTOR}&bg=2`);
    await ev(page, () => { const m = MENU_DEV.entry.menu; m.items.settings.click(); const r = m.dialogs.settings.querySelector('input[value="reduced"]'); r.click(); r.dispatchEvent(new Event("change", { bubbles: true })); m.dialogs.settings.close(); });
    await page.reload(); await page.waitForFunction(() => window.MENU_DEV && MENU_DEV.ready, null, { timeout: 60000 });
    const r = await ev(page, () => ({ entryRm: MENU_DEV.entry.reducedMotion, menuRm: MENU_DEV.entry.menu.root.classList.contains("rm"), checked: MENU_DEV.entry.menu.dialogs.settings.querySelector("input:checked").value, stored: localStorage.getItem("strange-bloom.settings") }));
    check(r.entryRm === true && r.menuRm && r.checked === "reduced" && r.stored === '{"motion":"reduced"}', tag("RM4 Settings → Reduced persists across a reload and applies to the menu and the entry"), J(r));
    await ev(page, () => localStorage.removeItem("strange-bloom.settings")); await ctx.close(); }
}

// ---------------------------------------------------------------- main
(async () => {
  partN();
  const pw = require("playwright");
  const server = spawn("python3", ["-m", "http.server", String(PORT), "--bind", "127.0.0.1"], { cwd: ROOT, stdio: "ignore" });
  check(await waitHttp(MENU, 8000), "B0 `python3 -m http.server` from the repository root serves the menu page", MENU);
  try {
    const chromium = await pw.chromium.launch();
    const hctx = await chromium.newContext(); helper = await hctx.newPage();
    console.log("\n— Chromium: menu"); await menuBasics(chromium, "chromium");
    console.log("\n— Chromium: randomization"); await randomization(chromium, "chromium");
    console.log("\n— Chromium: readability on all twelve"); await readability(chromium, "chromium");
    console.log("\n— Chromium: BEGIN before the prefetch completes, then return");
    const e1 = await begin(chromium, "chromium", { when: "early", name: "begin early", shots: SHOTS ? { mist: "04-transition-mist.png", mount: "06-survey-filling-after-early-begin.png" } : null }); beginChecks(e1); await returnToMenu(e1, { shots: SHOTS ? "07-return-new-painting.png" : null });
    console.log("\n— Chromium: BEGIN after the prefetch completed");
    const e2 = await begin(chromium, "chromium", { when: "ready", name: "begin ready", viewport: { width: 1440, height: 900 }, shots: SHOTS ? { mount: "05-survey-arrival-prefetched.png" } : null }); beginChecks(e2);
    info("chromium timing: click → survey usable (in-page)", { early: e1.tReady, ready: e2.tReady, revealedEarly: e1.after.entry.revealedMs, revealedReady: e2.after.entry.revealedMs });
    await e2.ctx.close();
    console.log("\n— Chromium: exit while the survey is still loading");
    const e3 = await begin(chromium, "chromium", { when: "early", name: "begin early then exit" }); await returnToMenu(e3, { whileLoading: true });
    console.log("\n— Chromium: reduced motion"); await reducedMotion(chromium, "chromium");
    { // the standalone survey page's own first-sector time, for the comparison in the report (same seed, same pool size rule)
      const { ctx, page } = await openPage(chromium, `${SURVEY}?sector=${SECTOR}`); const t0 = Date.now(); await page.waitForFunction(() => window.SURVEY_DEV && SURVEY_DEV.ready, null, { timeout: 120000 });
      const ms = Date.now() - t0; perf["chromium standalone survey load → ready"] = ms; info("chromium standalone demos/destination-survey.html load → ready (no title-screen prefetch)", `${ms} ms`); await ctx.close(); }
    if (SHOTS) {
      console.log("\n— evidence shots");
      for (const [bg, vp, file] of [[4, { width: 1440, height: 900 }, "01-main-menu.png"], [8, { width: 390, height: 844 }, "02-main-menu-phone.png"], [11, { width: 1920, height: 1080 }, "01b-main-menu-1080p.png"]]) {
        const { ctx, page } = await openMenu(chromium, `bg=${bg}&workers=1`, { viewport: vp }); await page.waitForTimeout(1000); fs.writeFileSync(path.join(OUT, file), await page.screenshot()); await ctx.close(); }
    }
    await hctx.close(); await chromium.close();

    if (FIREFOX) { let ff = null; try { ff = await pw.firefox.launch(); } catch (err) { info("Firefox", "not available: " + err.message.split("\n")[0]); }
      if (ff) { const hc = await ff.newContext(); helper = await hc.newPage();
        { // F0 control: the accepted survey page's own dispose logs "WebGL context was lost." in Firefox (unmodified renderer)
          const o = await openPage(ff, `${SURVEY}?sector=${SECTOR}`); await o.page.waitForFunction(() => window.SURVEY_DEV && SURVEY_DEV.ready, null, { timeout: 120000 });
          await o.page.evaluate(() => SURVEY_DEV.survey.dispose()); await o.page.waitForTimeout(300);
          const lost = o.log.warnings.filter(w => /WebGL context was lost\./.test(w)).length; if (lost) PREEXISTING.add("firefox");
          check(lost >= 1, "firefox F0 control: the accepted survey page's own survey.dispose() (PlanetSphereRenderer.dispose → forceContextLoss, unmodified) already logs \"WebGL context was lost.\" — pre-existing, not new", `lost ${lost}`); await o.ctx.close(); }
        console.log("\n— Firefox: menu"); await menuBasics(ff, "firefox");
        console.log("\n— Firefox: randomization"); await randomization(ff, "firefox");
        console.log("\n— Firefox: BEGIN early, return"); const f1 = await begin(ff, "firefox", { when: "early", name: "begin early" }); beginChecks(f1); await returnToMenu(f1, { shots: SHOTS ? "10-firefox-return.png" : null });
        console.log("\n— Firefox: BEGIN ready"); const f2 = await begin(ff, "firefox", { when: "ready", name: "begin ready" }); beginChecks(f2); await f2.ctx.close();
        info("firefox timing: click → survey usable (in-page)", { early: f1.tReady, ready: f2.tReady });
        await hc.close(); await ff.close(); } }
    { let wk = null; try { wk = await pw.webkit.launch(); info("WebKit", "available"); await wk.close(); } catch (err) { info("WebKit (Safari engine)", "not available on this machine: " + err.message.split("\n")[0].slice(0, 140)); } }
    if (!argv.includes("--no-gpu")) { // real GPU (ANGLE / Metal): the menu → survey → menu frames and timings, report only
      try { const g = await pw.chromium.launch({ args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] }); const hc = await g.newContext(); helper = await hc.newPage();
        const r = await begin(g, "gpu", { when: "ready", name: "GPU (Metal) begin ready" }); await returnToMenu(r);
        info("GPU (Metal) begin ready → return: timings", perf["gpu GPU (Metal) begin ready timing"]); info("GPU (Metal) transition frames", { begin: perf["gpu GPU (Metal) begin ready frames"], return: perf["gpu GPU (Metal) begin ready: return frames"] });
        await g.close(); } catch (err) { info("GPU sample", "unavailable: " + err.message.split("\n")[0]); } }
  } finally { server.kill(); }
  for (const [k, v] of Object.entries(perf)) if (!/readability/.test(k)) info("perf " + k, v);
  fs.writeFileSync(path.join(OUT, "qa-results.json"), J({ date: new Date().toISOString(), head: git("rev-parse", "HEAD").trim(), pass: results.filter(r => !r.info && r.ok).length, fail: fails, results }, null, 1));
  fs.writeFileSync(path.join(OUT, "perf.json"), JSON.stringify(perf, null, 1));
  fs.writeFileSync(path.join(OUT, "timelines.json"), J({ legendBegin: ["ms", "entry state", "transition phase", "veil", "menu (plaque opacity)", "survey (state:cells)"], legendReturn: ["ms", "entry state", "transition phase", "veil", "menu", "survey", "live workers", "live WebGL contexts"], timelines }));
  console.log(fails ? `\n${fails} check(s) FAILED` : `\nALL CHECKS PASS (${results.filter(r => !r.info).length})`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
