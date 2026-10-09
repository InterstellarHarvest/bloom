// BLOOM — Production plant integration check (BLOOM-032C). The focused suite for the Organic Hybrid sprite organism in REAL gameplay:
// resources/run-ui/plant-specimen.js (BLOOM.plantSpecimen, the 029C API kept) is now an adapter over the accepted BLOOM-032B pipeline
// (pack "organic-hybrid"). docs/PRODUCTION_PLANT_INTEGRATION_v1.md · docs/evidence/bloom-032c/REPORT.md.
//
//   NODE_PATH="$(npm root -g)" node tools/production-plant-integration-check.js [--browsers chromium,firefox] [--evidence]
//
// Node: the exact start (032B2 integrated main ea1b785); scope (no gameplay / trait / balance / pipeline / art file changed; the retired
// 029C SVG is not on any production path); the production page loads the classic sprite runtime before the specimen; every required
// state renders with the real pack, unclipped and distinct; art cap; maximal dry / wet fit; GLOBAL genome vs LOCAL colony (local
// presentation never changes the genome signature, never overwrites the organism); preview / cancel exact; highlights + anchors on
// visible anatomy in tendril order. Browser (each origin: file://, HTTP /, HTTP /bloom/; viewports 1024×768 · 1280×800 · 1440×900):
// Region Inspect · Adapt · Spread · report (win + loss) · Guided Training all show the real pack with browser pixels == the adapter's
// pixels; same genome → same organism everywhere; Terraform changes no anatomy; preview on / off exact; a REAL purchase GROWS once and
// ends exactly on the target; ordinary re-renders never replay it; reduced motion = one exact swap; keyboard; region switch; no console
// error, no unhandled rejection, no external request. FIREFOX IS A HARD PRE-MERGE GATE: a browser that cannot launch is a FAIL.
// --evidence writes docs/evidence/bloom-032c/ (18 stills + production-plant-proof.json). Exits 1 on any failure.
"use strict";
const path = require("path"), fs = require("fs"), cp = require("child_process"), http = require("http"), zlib = require("zlib");
const ROOT = path.resolve(__dirname, "..");
const argv = process.argv, argOf = k => { const i = argv.indexOf(k); return i > 0 ? argv[i + 1] : null; };
const BROWSERS = (argOf("--browsers") ?? "chromium,firefox").split(",").filter(Boolean), EVIDENCE = argv.includes("--evidence"), EVD = path.join(ROOT, "docs/evidence/bloom-032c");
const J = JSON.stringify, read = f => fs.readFileSync(path.join(ROOT, f), "utf8"), sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0, passes = 0; const RESULTS = [], t0 = Date.now();
const check = (ok, name, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); RESULTS.push({ ok: !!ok, name: name.slice(0, 200) }); ok ? passes++ : fails++; };
const git = a => cp.execSync(`git ${a}`, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 << 20 }).trim();
const BASE = "ea1b785517ccc9586cc7bb1ce91fc26f1f46c922";   // BLOOM-032B2 integrated into main
const OWN = ["resources/run-ui/plant-specimen.js", "resources/run-ui/decision-rooms.css", "resources/run-ui/run-report.css", "demos/demo-run.html", "demos/plant-sprite-pipeline-lab.html",
  "resources/plant-sprite-lab/lab.js", "resources/plant-sprite-lab/legacy-svg-specimen.js", "tools/production-plant-integration-check.js"];
const ALLOWED = p => OWN.includes(p) || p.startsWith("docs/") || /^tools\/[a-z-]+-check\.js$/.test(p);
const RUNTIME = ["resources/plant-visual/generated/plant-atlas.js", "resources/plant-visual/plant-visual-model.js", "resources/plant-visual/plant-components.js", "resources/plant-visual/plant-compositor.js", "resources/plant-visual/plant-fx.js"];

for (const f of ["content/config.js", "content/traits.js", ...RUNTIME, "resources/run-ui/plant-specimen.js"]) require(path.join(ROOT, f));
const PS = BLOOM.plantSpecimen, PV = BLOOM.plantVisual, PC = BLOOM.plantCompositor, FX = BLOOM.plantFx, RULES = PV.model.rules(BLOOM_DATA);
const TRAITS_SNAPSHOT = J(BLOOM_DATA.traits), CONFIG_SNAPSHOT = J(BLOOM_DATA.config);
const STATES = { base: {}, cold1: { cold: 1 }, cold2: { cold: 2 }, cold3: { cold: 3 }, heat1: { heat: 1 }, heat2: { heat: 2 }, heat3: { heat: 3 }, cold2heat1: { cold: 2, heat: 1 },
  drought1: { drought: 1 }, drought2: { drought: 2 }, drought3: { drought: 3 }, flood1: { flood: 1 }, flood2: { flood: 2 }, flood3: { flood: 3 }, salt: { salt: 1 }, rad: { rad: 1 },
  seed1: { seedOut: 1 }, seed2: { seedOut: 2 }, early: { earlyMat: 1 }, water: { waterSeeds: 1 },
  maxDry: { cold: 2, heat: 1, drought: 3, salt: 1, rad: 1, seedOut: 2, earlyMat: 1, waterSeeds: 1 }, maxWet: { cold: 2, heat: 1, flood: 3, salt: 1, rad: 1, seedOut: 2, earlyMat: 1, waterSeeds: 1 } };
const room = (traits, o = {}) => Object.assign({ traits, names: {}, preview: null, colony: { living: true, establishment: 0.6, word: "" }, focus: "balanced", local: null, condition: "ok", viable: true }, o);
const nz = t => Object.fromEntries(Object.entries(t || {}).filter(([, v]) => v > 0).sort());   // owned tiers only
const fnv = arr => { let h = 0x811c9dc5; for (let i = 0; i < arr.length; i++) { h ^= arr[i]; h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(16).padStart(8, "0"); };
const PROOF = { milestone: "BLOOM-032C", base: BASE, head: git("rev-parse HEAD"), pack: PS.PACK, states: {}, browsers: {}, firefox: "HARD PRE-MERGE GATE" };

// ---------------------------------------------------------------- tiny PNG (evidence composites)
const CRC = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = b => { let c = 0xffffffff; for (const x of b) c = CRC[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t, "ascii"), d]), c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
function png(W, H, rgba) { const h = Buffer.alloc(13); h.writeUInt32BE(W, 0); h.writeUInt32BE(H, 4); h[8] = 8; h[9] = 6; const raw = Buffer.alloc((W * 4 + 1) * H);
  for (let y = 0; y < H; y++) Buffer.from(rgba.buffer, rgba.byteOffset + y * W * 4, W * 4).copy(raw, y * (W * 4 + 1) + 1);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", h), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]); }

(async () => {
  console.log("# Node — scope");
  { const first = git(`rev-list --first-parent --reverse ${BASE}..HEAD`).split("\n").filter(Boolean)[0] || null, parent = first ? git(`rev-parse ${first}^`) : git("rev-parse HEAD");
    let main = null; try { main = git("rev-parse origin/main"); } catch {}
    check(parent === BASE && (!main || git(`merge-base --is-ancestor ${BASE} ${main}`) === ""), "1 · 032C starts from the exact integrated BLOOM-032B2 main ea1b785", J({ firstParent: parent.slice(0, 7), originMain: main && main.slice(0, 7) })); }
  { const tracked = git(`diff --name-only ${BASE}`).split("\n").filter(Boolean), untracked = git("ls-files -o --exclude-standard").split("\n").filter(Boolean);
    const changed = [...new Set([...tracked, ...untracked])].sort(), outside = changed.filter(p => !ALLOWED(p));
    const frozen = git(`ls-tree -r --name-only ${BASE} -- content planets index.html dist resources art`).split("\n").filter(f => f && !OWN.includes(f));
    const diff = frozen.filter(f => !fs.existsSync(path.join(ROOT, f)) || git(`hash-object "${f}"`) !== git(`rev-parse ${BASE}:"${f}"`));
    PROOF.changedFiles = changed;
    check(!diff.length && !outside.length, `38 · no gameplay / trait / balance change: all ${frozen.length} files under content/, planets/, index.html, dist/, resources/ and art/ are byte-identical to ea1b785 except the specimen adapter and its two style sheets — the rules, the sim, decision-rooms.js, run-report.js, the adapter, training, the accepted sprite pipeline (model, selector, compositor, FX, generated atlas) and the approved art are untouched`, J({ diff, outside })); }
  { const html = read("demos/demo-run.html"), srcs = [...html.matchAll(/<script([^>]*)src="\.\.\/([^"]+)"/g)].map(m => ({ attrs: m[1], src: m[2] })), at = s => srcs.findIndex(x => x.src === s);
    const order = [...RUNTIME, "resources/run-ui/plant-specimen.js", "resources/run-ui/decision-rooms.js", "resources/run-ui/run-report.js"].map(at);
    const psSrc = read("resources/run-ui/plant-specimen.js"), code = psSrc.replace(/\/\/.*$/gm, "");
    const classic = RUNTIME.concat("resources/run-ui/plant-specimen.js").every(s => !/type=/.test(srcs[at(s)].attrs));
    const legacyUsers = [...new Set([...git("grep -l legacy-svg-specimen -- '*.html'").split("\n"), ...git("ls-files -o --exclude-standard -- '*.html'").split("\n").filter(f => f && read(f).includes("legacy-svg-specimen"))])].filter(Boolean);
    const svgPath = /createElementNS|<svg|innerHTML/.test(code), fetchy = /\bfetch\(|new Image\(|createImageBitmap|import\(/.test(code);
    PROOF.loadOrder = order;
    check(order.every((v, i) => v >= 0 && (i === 0 || v > order[i - 1])) && classic && !fetchy && PS.PACK === "organic-hybrid" && PS.renderer === "organic-hybrid-sprite",
      "2 · the production run page loads the accepted classic sprite runtime (generated atlas → model → selector → compositor → FX) BEFORE plant-specimen.js, which loads before decision-rooms.js and run-report.js; no module-only loading, no fetch, no image decode; the specimen selects pack organic-hybrid", J({ order }));
    check(!svgPath && J(legacyUsers) === J(["demos/plant-sprite-pipeline-lab.html"]) && !/legacy-svg-specimen/.test(html) && !BLOOM.legacyPlantSpecimen,
      "3 · the provisional 029C SVG is NOT the production path: plant-specimen.js builds no SVG and no markup; the retired renderer survives only as resources/plant-sprite-lab/legacy-svg-specimen.js (BLOOM.legacyPlantSpecimen), loaded by the developer lab page alone — never by demo-run.html / index.html", J({ legacyUsers })); }

  console.log("# Node — the organism through the production adapter");
  { const rows = Object.entries(STATES).map(([k, t]) => { const D = PS.draw(room(t)), F = D.frame, ref = PC.render(PV.components.select(PV.model.normalize({ traits: t, condition: "thriving" }, RULES)), "organic-hybrid");
      PROOF.states[k] = { traits: t, global: D.globalSig, display: D.sig, clip: F.clip, bbox: F.bbox };
      return { k, clip: F.clip, real: F.pack === "organic-hybrid" && F.sig.full === ref.sig.full, global: D.globalSig, display: D.sig }; });
    const dup = rows.filter((r, i) => rows.findIndex(q => q.global === r.global) !== i).map(r => r.k);
    check(rows.every(r => !r.clip && r.real) && !dup.length, `11–23 · every required state renders through the production adapter as the real organic-hybrid compositor organism, unclipped and distinct: ${Object.keys(STATES).join(" · ")}`, J({ dup, bad: rows.filter(r => r.clip || !r.real).map(r => r.k) }));
    const cap = [4, 5, 9].every(n => PS.draw(room({ drought: n })).globalSig === PS.draw(room({ drought: 3 })).globalSig && PS.draw(room({ flood: n })).globalSig === PS.draw(room({ flood: 3 })).globalSig);
    const fits = ["maxDry", "maxWet"].flatMap(k => ["ok", "bad"].map(c => { const F = PS.draw(room(STATES[k], { condition: c })).frame; return Math.min(F.bbox.x0, F.bbox.y0, F.W - 1 - F.bbox.x1, F.H - 1 - F.bbox.y1); }));
    check(cap && fits.every(m => m >= 1), "22 · 23 · maximal legal dry and wet fit 84×98 thriving and stressed (≥ 1 px clear); Drought / Flood T4 · T5 · T9 draw exactly the T3 organism (art cap)", J({ margins: fits })); }
  // 9 · 33–36 · GLOBAL genome vs LOCAL colony
  { const t = STATES.cold2heat1, variants = { est0: { colony: { living: true, establishment: 0.05, word: "" } }, est5: {}, est1: { colony: { living: true, establishment: 1, word: "" } },
      roots: { focus: "roots" }, leaves: { focus: "leaves" }, seeds: { focus: "seeds" }, rootNetwork: { focus: "roots", local: "rootNetwork" }, leafCanopy: { focus: "leaves", local: "leafCanopy" }, seedReserve: { focus: "seeds", local: "seedReserve" },
      warn: { condition: "warn" }, bad: { condition: "bad" }, none: { colony: { living: false, establishment: 0, word: "" } }, unviable: { colony: { living: false, establishment: 0, word: "" }, viable: false, condition: "bad" } };
    const D = Object.fromEntries(Object.entries(variants).map(([k, o]) => [k, PS.draw(room(t, o))])), g = new Set(Object.values(D).map(d => d.globalSig)), disp = new Set(Object.values(D).map(d => d.sig));
    // local extras only ever land on pixels the organism leaves empty; the organism keeps every one of its pixels (all living variants)
    const kept = Object.entries(D).filter(([k]) => !["none", "unviable", "warn", "bad"].includes(k)).every(([, d]) => { for (const i of d.extras.keys()) if (d.frame.plant.m[i]) return false; return true; });
    const strained = D.warn.frame.sig.full !== D.est5.frame.sig.full && PS.draw(room(t, { condition: "warn", colony: { living: false } })).frame.sig.full === D.est5.frame.sig.full;   // stress applies to a living colony only
    PROOF.local = Object.fromEntries(Object.entries(D).map(([k, d]) => [k, { display: d.sig, global: d.globalSig, extras: d.extras.size }]));
    // (warn and bad are one presentation by design: both are the accepted strained posture; every other local state is distinct)
    check(g.size === 1 && disp.size === Object.keys(variants).length - 1 && D.warn.sig === D.bad.sig && kept && strained && D.est1.extras.size > D.est0.extras.size && D.rootNetwork.extras.size > D.roots.extras.size,
      "9 · 33–36 · GLOBAL vs LOCAL: one owned genome keeps ONE organism signature through every local colony state, while establishment (sprout density), growth focus (roots / leaves / seeds), local upgrades (root network / leaf canopy / seed reserve), stress (warn and bad → the one accepted strained posture), no colony (ghost) and unviable (desaturated) each change only the presentation; local extras never overwrite an organism pixel", J({ globals: g.size, displays: disp.size })); }
  // 24 · 25 · preview exact, cancel exact
  { const rows = [["base", "cold", 1], ["cold1", "cold", 2], ["base", "drought", 1], ["drought2", "rad", 1], ["base", "earlyMat", 1], ["seed1", "seedOut", 2], ["base", "waterSeeds", 1]].map(([k, id, tier]) => {
      const cur = PS.draw(room(STATES[k])), pv = PS.draw(room(STATES[k], { preview: { id, tier } })), back = PS.draw(room(STATES[k])), tgtT = Object.assign({}, STATES[k], { [id]: tier });
      const ghost = FX.preview(cur.frame, PS.draw(room(tgtT)).frame);
      return { k, id, previewDiffers: pv.sig !== cur.sig, ghostIsAccepted: pv.previewing && pv.target.sig.full === PS.draw(room(tgtT)).frame.sig.full && fnv(ghost) !== cur.frame.sig.full, cancelExact: back.sig === cur.sig, globalUntouched: pv.globalSig === cur.globalSig }; });
    check(rows.every(r => r.previewDiffers && r.ghostIsAccepted && r.cancelExact && r.globalUntouched), "24 · 25 · preview = the accepted GHOST / OUTLINE of current → the REAL next tier (never mutates the owned organism); cancelling returns EXACTLY to the current pixels", J(rows.filter(r => !(r.previewDiffers && r.ghostIsAccepted && r.cancelExact)))); }
  // 30 · 31 · highlight + anchors (Node)
  { const bad = [];
    for (const [k, t] of Object.entries(STATES)) { const d = PS.draw(room(t)), A = d.anchors;
      for (const part of PS.PARTS) { const h = PS.draw(room(t), { highlight: part }); if (h.sig === d.sig) bad.push(`${k}: ${part} highlight shows nothing`);
        const a = A[part], i = a.y * d.W + a.x; if (!(a.x >= 0 && a.y >= 0 && a.x < d.W && a.y < d.H) || !(d.frame.plant.m[i] || d.extras.has(i))) bad.push(`${k}: ${part} anchor off the anatomy`); }
      const ad = ["pigment", "leafShape", "stem", "roots"].map(p => A[p].y), sp = ["seedHead", "flowers", "pods"].map(p => A[p].y);
      if (!ad.every((y, i) => !i || y > ad[i - 1]) || !sp.every((y, i) => !i || y > sp[i - 1])) bad.push(`${k}: anchors out of tendril order`); }
    check(!bad.length, "30 · 31 · the seven logical parts (seedHead · pigment · flowers · leafShape · pods · stem · roots) map onto real placements: each highlight visibly changes the picture, each anchor sits ON a visible organism pixel, and anchors keep the rooms' top → bottom tendril order (Adapt: pigment < leaf shape < stem < roots · Spread: seed head < flowers < pods) in every state", J(bad.slice(0, 5))); }
  check(J(BLOOM_DATA.traits) === TRAITS_SNAPSHOT && J(BLOOM_DATA.config) === CONFIG_SNAPSHOT, "G1 · rendering, previewing and highlighting never touch BLOOM_DATA (traits, config)");

  // ---------------------------------------------------------------- browser
  console.log("# Browser");
  let pw = null; try { pw = require("playwright"); } catch { check(false, "B0 · Playwright available (NODE_PATH=\"$(npm root -g)\")"); }
  const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".json": "application/json", ".svg": "image/svg+xml", ".webp": "image/webp", ".jpg": "image/jpeg", ".wasm": "application/wasm" };
  const serve = prefix => new Promise(res => { const s = http.createServer((q, r) => { let u = decodeURIComponent(q.url.split("?")[0]); if (prefix) { if (!u.startsWith(prefix)) { r.writeHead(404); return r.end(); } u = "/" + u.slice(prefix.length); }
      const f = path.join(ROOT, u); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream", "cache-control": "no-store" }); fs.createReadStream(f).pipe(r); });
    s.listen(0, "127.0.0.1", () => res(s)); });
  const INIT = () => { window.__EV = []; window.__REJ = []; addEventListener("unhandledrejection", e => __REJ.push(String(e.reason && e.reason.message || e.reason)));
    for (const t of ["upgrade-purchase", "upgrade-preview", "region-select", "win"]) document.addEventListener("bloom:" + t, e => __EV.push({ type: t, detail: e.detail })); };
  // in-page probe: the specimen in the visible room (or the report), its pixels vs the adapter's own draw of its state
  const PROBE = `window.__ps = {
    vis: () => BLOOM.plantSpecimen.mounted().find(s => s.el.isConnected && s.el.getClientRects().length && !s.el.closest("[hidden]")),
    rep: () => BLOOM.runReport.instance && BLOOM.runReport.instance.specimen,
    hash: cv => { const d = cv.getContext("2d").getImageData(0, 0, cv.width, cv.height).data; let h = 0x811c9dc5; for (let i = 0; i < d.length; i++) { h ^= d[i]; h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(16).padStart(8, "0"); },
    probe(s) { s = s || __ps.vis(); if (!s) return null; const r = s.canvas.getBoundingClientRect(), D = BLOOM.plantSpecimen.draw(s.state, { highlight: s.highlighted });
      const A = {}; for (const a of s.anchors()) A[a.part] = a.client && { x: a.client.x, y: a.client.y, inside: a.client.x >= r.left && a.client.x <= r.right && a.client.y >= r.top && a.client.y <= r.bottom,
        onPx: (() => { const v = D.anchors[a.part], i = v.y * D.W + v.x; return !!(D.frame.plant.m[i] || D.extras.has(i)); })() };
      return { pack: s.pack, canvas: __ps.hash(s.canvas), expect: D.sig, global: s.globalSignature(), globalExpect: D.globalSig, svg: !!s.el.querySelector("svg"), role: s.canvas.getAttribute("role"), aria: s.canvas.getAttribute("aria-label"),
        scale: s.canvas.offsetWidth / s.canvas.width, cssW: r.width, cssH: r.height, render: getComputedStyle(s.canvas).imageRendering, previewing: s.el.classList.contains("previewing"),
        highlighted: s.highlighted, fx: s.lastFx, animating: s.animating(), state: s.state, anchors: A }; } };`;
  const frames = (p, n = 3) => p.evaluate(n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
  const settled = p => p.waitForFunction(() => !BLOOM.decisionRooms.instance.state().transitioning, null, { timeout: 8000, polling: 20 });
  const openRoom = async (p, name) => { await settled(p); const inRoom = await p.evaluate(() => BLOOM.decisionRooms.instance.state().room); if (inRoom === name) { await frames(p, 3); return; } await p.click(inRoom ? `.dr .dr-room:not([hidden]) .rn[data-go="${name}"]` : `.pv-tool[data-tool="${name}"]`); await settled(p); await frames(p, 4); await sleep(80); };
  const back = async p => { await p.click(".dr .dr-room:not([hidden]) .rb.back"); await settled(p); await frames(p, 3); };
  const hoverNode = async (p, id) => { await p.hover(`.dr .dr-room:not([hidden]) .node[data-node="${id}"]`); await frames(p, 3); };
  const leaveTree = async p => { const r = await p.evaluate(() => { const h = document.querySelector(".dr .dr-room:not([hidden]) .rh").getBoundingClientRect(); return [h.x + h.width / 2, h.y + h.height - 4]; }); await p.mouse.move(r[0], r[1]); await frames(p, 3); };
  const fxDone = p => p.waitForFunction(() => { const s = __ps.vis(); return s && !s.animating() && s.lastFx && !s.lastFx.pending; }, null, { timeout: 8000, polling: 20 });
  const probe = p => p.evaluate(() => __ps.probe(null));
  const nodeSig = st => PS.draw(st).sig;
  const shot = async (p, name, sel) => { if (!EVIDENCE) return; fs.mkdirSync(EVD, { recursive: true }); const el = sel ? await p.$(sel) : null; if (el) await el.screenshot({ path: path.join(EVD, name) }); else await p.screenshot({ path: path.join(EVD, name) }); };
  const RUNQ = "?archetype=ocean_archipelago&seed=28&ui=18";

  if (pw) for (const bname of BROWSERS) {
    const tag = `[${bname}]`; let browser;
    try { browser = await pw[bname].launch(); } catch (e) { check(false, `${tag} ${bname === "firefox" ? "50" : "49"} · ${bname} launches${bname === "firefox" ? " — HARD PRE-MERGE GATE for BLOOM-032C" : ""}`, e.message.split("\n")[0]); PROOF.browsers[bname] = { unavailable: e.message.split("\n")[0] }; continue; }
    PROOF.browsers[bname] = { version: browser.version() }; console.log(`# ${bname} ${browser.version()}`);
    const srvRoot = await serve(null), srvSub = await serve("/bloom/");
    const ORIGINS = { file: "file://" + encodeURI(ROOT) + "/", http: `http://127.0.0.1:${srvRoot.address().port}/`, subpath: `http://127.0.0.1:${srvSub.address().port}/bloom/` };
    const pages = [];
    const open = async (origin, q, { w = 1280, h = 800, rm = false } = {}) => {
      const c = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: rm ? "reduce" : "no-preference" }); await c.addInitScript(INIT);
      const p = await c.newPage(); p.errs = []; p.ext = []; p.on("pageerror", e => p.errs.push(e.message)); p.on("console", m => { if (m.type() === "error") p.errs.push(m.text()); });
      p.on("request", r => { const u = r.url(); if (!(u.startsWith("file:") || u.startsWith("data:") || u.startsWith("blob:") || u.startsWith("http://127.0.0.1:"))) p.ext.push(u); }); pages.push(p);
      await p.goto(origin + "demos/demo-run.html" + q);
      await p.waitForFunction(() => window.BLOOM && BLOOM.decisionRooms && BLOOM.decisionRooms.instance && BLOOM.planetView && BLOOM.planetView.instance && BLOOM.planetView.instance.renderer.info().frames > 0, null, { timeout: 30000, polling: 100 });
      await p.evaluate(PROBE); await frames(p, 4); return p; };
    try {
      // ---- 42 · 43 · 44 · 45 · the three origins: Region Inspect shows the real pack, browser pixels == the adapter == Node, offline
      for (const [where, origin] of Object.entries(ORIGINS)) {
        const p = await open(origin, RUNQ); await openRoom(p, "region"); const r = await probe(p);
        const nodeEq = r && nodeSig(r.state) === r.canvas;
        check(r && r.pack === "organic-hybrid" && !r.svg && r.canvas === r.expect && nodeEq && !p.errs.length && !p.ext.length,
          `${tag} ${where === "file" ? "42" : where === "http" ? "43" : "44"} · 4 · ${where === "file" ? "double-clicked file://" : where === "http" ? "HTTP /" : "HTTP under /bloom/"}: Region Inspect shows the real Organic Hybrid canvas (no SVG), its pixels == the adapter's draw == the Node render, byte for byte; no console error; ${where === "file" ? "45 · offline: no request leaves file:" : "every request local"}`,
          J({ pack: r && r.pack, canvas: r && r.canvas, expect: r && r.expect, nodeEq, errs: p.errs.slice(0, 2), ext: p.ext.slice(0, 2) }));
        PROOF.browsers[bname][where] = { region: r && { canvas: r.canvas, scale: r.scale } };
        if (where !== "file") await p.context().close(); else pages.fileMain = p; }
      const p = pages.fileMain;
      // ---- 32 · region switch: another region, no FX, pixels exact
      { const a = await probe(p); await back(p); await p.evaluate(() => { const A = BLOOM_RUN_UI.adapter, cur = A.selection().index, r = A.regions().find(x => x.index !== cur && x.living) || A.regions().find(x => x.index !== cur); A.actions.selectRegion(r.index); });
        await openRoom(p, "region"); const b = await probe(p);
        check(b && b.canvas === b.expect && b.global === a.global && !b.fx && J(b.state.traits) === J(a.state.traits), `${tag} 32 · region switch: the specimen re-renders the new region's local colony exactly (no FX replay; same global organism signature)`, J({ a: a.canvas, b: b.canvas, fx: b.fx }));
        await shot(p, "01-region-base.png", ".dr .dr-room:not([hidden])"); }
      // ---- 5 · 24 · 25 · 30 · 31 · Adapt: preview / cancel exact, category highlight, anchors on anatomy
      await p.evaluate(() => BLOOM_API.addBiomass(20000)); await openRoom(p, "adapt");
      { const cur = await probe(p); await hoverNode(p, "cold"); const pv = await probe(p);
        if (EVIDENCE) await shot(p, "02-adapt-cold-preview.png", ".dr .dr-room:not([hidden])");
        await leaveTree(p); const off = await probe(p);
        check(cur.pack === "organic-hybrid" && pv.previewing && pv.canvas === pv.expect && pv.canvas !== cur.canvas && /Previewing/.test(pv.aria) && off.canvas === cur.canvas && !off.previewing && pv.global === cur.global && pv.highlighted === "stem" && off.highlighted === null,
          `${tag} 5 · 24 · 25 · 30 · Adapt: hovering Cold Tolerance shows the accepted GHOST / OUTLINE of the real next tier with the Temperature part (stem) highlighted — canvas == adapter pixels, PREVIEW tag, accessible text "Previewing" — and leaving returns EXACTLY to the current organism; the owned genome never changes`, J({ cur: cur.canvas, pv: pv.canvas, off: off.canvas, aria: pv.aria }));
        const anchorsOk = Object.entries(cur.anchors).every(([, a]) => a && a.inside && a.onPx);
        check(anchorsOk, `${tag} 31 · every category anchor (client px) lies inside the specimen canvas on a visible organism pixel`, J(cur.anchors)); }
      // ---- 26 · 27 · 28 · a REAL purchase grows once, ends exact; ordinary re-renders never replay it
      { await hoverNode(p, "cold"); const before = await probe(p); await p.click(`.dr .dr-room:not([hidden]) .node[data-node="cold"]`);
        const mid = await p.evaluate(() => { const s = __ps.vis(); return { animating: s.animating(), pending: !!(s.lastFx && s.lastFx.pending) }; }); await fxDone(p); await frames(p, 2);
        const after = await probe(p); await leaveTree(p); const off = await probe(p);
        if (EVIDENCE) await shot(p, "03-adapt-after-cold-purchase.png", ".dr .dr-room:not([hidden])");
        const seq = off.fx && off.fx.seq;
        await p.evaluate(() => BLOOM_API.advance(10)); await frames(p, 3); await back(p); await openRoom(p, "adapt"); await hoverNode(p, "heat"); await leaveTree(p);
        await p.evaluate(() => BLOOM_RUN_UI.adapter.actions.selectRegion(BLOOM_RUN_UI.adapter.regions()[0].index)); await frames(p, 3); const later = await probe(p);
        check(mid.animating && mid.pending && after.fx && after.fx.style === "grow" && after.fx.frames > 5 && after.fx.exact && after.fx.endSig === after.fx.targetSig && after.canvas === after.expect && off.canvas === off.expect && off.state.traits.cold === 1 && before.state.traits.cold !== 1,
          `${tag} 26 · 27 · buying Cold Tolerance (the page's real bloom:upgrade-purchase) GROWS the change into the specimen (${after.fx && after.fx.frames} frames) and the last frame is EXACTLY the new committed organism; the specimen then shows exactly the adapter's pixels (the still-hovered next-tier preview, then the plain organism)`, J({ fx: after.fx, mid, afterEq: after.canvas === after.expect, offEq: off.canvas === off.expect, cold: [before.state.traits.cold, off.state.traits.cold] }));
        check(later.fx && later.fx.seq === seq && !later.animating && later.canvas === later.expect, `${tag} 28 · ordinary re-renders — a sim tick, Back + reopening the room, a hover preview, a region selection — never replay the GROW (one FX per purchase)`, J({ seq, later: later.fx && later.fx.seq }));
        // ---- 46 · keyboard: focus previews, Enter buys (and grows)
        const kb0 = await probe(p); await p.focus(`.dr .dr-room:not([hidden]) .node[data-node="salt"]`); await frames(p, 3); const kbPv = await probe(p);
        await p.keyboard.press("Enter"); await fxDone(p); await frames(p, 2); const kb = await probe(p);
        check(kbPv.previewing && /Previewing/.test(kbPv.aria) && kb.fx.seq === seq + 1 && kb.fx.exact && kb.state.traits.salt === 1 && kb0.state.traits.salt !== 1, `${tag} 46 · keyboard: focusing a node previews it (accessible text says so); Enter buys it and the specimen grows it exactly`, J({ aria: kbPv.aria, fx: kb.fx })); }
      // ---- 6 · Spread: preview + purchase
      { await openRoom(p, "spread"); const cur = await probe(p); await hoverNode(p, "seedOut"); const pv = await probe(p);
        if (EVIDENCE) await shot(p, "04-spread-seed-preview.png", ".dr .dr-room:not([hidden])");
        await p.click(`.dr .dr-room:not([hidden]) .node[data-node="seedOut"]`); await fxDone(p); await leaveTree(p); const after = await probe(p);
        if (EVIDENCE) await shot(p, "05-spread-after-seed-purchase.png", ".dr .dr-room:not([hidden])");
        check(cur.pack === "organic-hybrid" && pv.previewing && pv.highlighted === "seedHead" && pv.canvas === pv.expect && after.fx.style === "grow" && after.fx.exact && after.canvas === after.expect && after.state.traits.seedOut === 1,
          `${tag} 6 · Spread renders the real pack; Seed Output previews as ghost / outline (seed head highlighted) and its real purchase grows exactly`, J({ fx: after.fx })); }
      // ---- 9 · same owned genome → same organism on every surface; 10 · Terraform changes no anatomy
      { const sig = {}; for (const r of ["region", "adapt", "spread"]) { await openRoom(p, r); sig[r] = (await probe(p)).global; }
        await openRoom(p, "terraform"); const tf = await p.evaluate(() => { const A = BLOOM_RUN_UI.adapter, b = A.upgrades().find(x => x.board === "Terraform"), u = b && b.items.find(x => x.canBuy); return u ? { id: u.id, ok: A.actions.buy(u.id) } : null; });
        await frames(p, 3); await openRoom(p, "region"); const afterTf = await probe(p);
        check(new Set(Object.values(sig)).size === 1 && afterTf.global === sig.region && tf && tf.ok, `${tag} 9 · 10 · the same owned genome draws the SAME organism (one signature) in Region Inspect, Adapt and Spread; a real Terraform purchase (${tf && tf.id}) changes the sky only — the organism signature is unchanged`, J({ sig, tf, after: afterTf.global })); }
      // ---- 39 · 40 · 41 · room sizes: 2× at 1024, 3× at 1280 / 1440; anchors still on anatomy after resize
      { const out = {};
        for (const [w, h, k] of [[1024, 768, 2], [1440, 900, 3], [1280, 800, 3]]) { await p.setViewportSize({ width: w, height: h }); await sleep(250); await frames(p, 4); await openRoom(p, "adapt"); const r = await probe(p);
          out[`${w}x${h}`] = { scale: r.scale, k, anchors: Object.values(r.anchors).every(a => a && a.inside && a.onPx), exact: r.canvas === r.expect, render: r.render }; }
        PROOF.browsers[bname].sizes = out;
        check(Object.values(out).every(o => o.scale === o.k && o.anchors && o.exact && /pixelated|crisp-edges/.test(o.render)), `${tag} 39 · 40 · 41 · one 84×98 organism at a whole-number nearest-neighbour scale — 1024×768 → 2×, 1280×800 → 3×, 1440×900 → 3× — pixels exact and every anchor on the anatomy after each resize`, J(out)); }
      // ---- 15 · 16 · 17 · 18 · evidence rooms: drought / flood / salt+rad / maximal builds as REAL purchases
      if (EVIDENCE) { const room2 = async (traits, name) => { const q = await open(ORIGINS.file, RUNQ); await q.evaluate(t => { BLOOM_API.addBiomass(50000); for (const [id, n] of Object.entries(t)) for (let k = 0; k < n; k++) BLOOM_RUN_UI.adapter.actions.buy(id); }, traits);
          await openRoom(q, "adapt"); await fxDone(q).catch(() => {}); await shot(q, name, ".dr .dr-room:not([hidden])"); await q.context().close(); };
        await room2({ drought: 3 }, "06-drought-real-room.png"); await room2({ flood: 3 }, "07-flood-real-room.png"); await room2({ salt: 1, rad: 1 }, "08-salt-radiation.png");
        await room2(STATES.maxDry, "09-maximal-dry-room.png"); await room2({ cold: 2, heat: 1, flood: 3, salt: 1, rad: 1, seedOut: 2, earlyMat: 1, waterSeeds: 1 }, "10-maximal-wet-room.png"); }
      // ---- 33 · 34 · 35 · local colony presentation in the real Region Inspect (real growth focus / local upgrade actions)
      { const q = await open(ORIGINS.file, RUNQ); const rows = {};
        const reg = await q.evaluate(() => { const A = BLOOM_RUN_UI.adapter; BLOOM_API.addBiomass(50000); const r = A.regions().find(x => x.living); A.actions.selectRegion(r.index); return r.index; });
        await openRoom(q, "region"); rows.base = await probe(q);
        for (const [k, act] of [["roots", ["focus", "roots"]], ["leaves", ["focus", "leaves"]], ["seeds", ["focus", "seeds"]]]) { await back(q);
          await q.evaluate(([i, mode]) => BLOOM_RUN_UI.adapter.actions.setGrowthFocus(i, mode), [reg, act[1]]); await q.evaluate(i => BLOOM_RUN_UI.adapter.actions.selectRegion(i), reg); await openRoom(q, "region"); rows[k] = await probe(q);
          if (EVIDENCE) await shot(q, `1${k === "roots" ? 1 : k === "leaves" ? 2 : 3}-region-local-${k}.png`, ".dr .dr-room:not([hidden])"); }
        const ok = Object.values(rows).every(r => r.canvas === r.expect && r.global === rows.base.global) && new Set(Object.values(rows).map(r => r.canvas)).size === 4 && rows.roots.state.focus === "roots";
        check(ok, `${tag} 33 · 34 · the real growth focus (roots / leaves / seeds, set through the page's own action) changes only the LOCAL presentation of the specimen in Region Inspect; the global organism signature stays identical; establishment ${Math.round(rows.base.state.colony.establishment * 100)} % is shown as colony sprouts`, J(Object.fromEntries(Object.entries(rows).map(([k, r]) => [k, r.canvas]))));
        // ---- 14 · 35 · 36 · stressed / no colony / would not survive — whatever the real map offers
        const kinds = await q.evaluate(() => { const A = BLOOM_RUN_UI.adapter, R = A.regions().map(r => A.region(r.index)); return { stressed: (R.find(r => r.living && r.lamp !== "green" && !r.limiting.blocked) || {}).index, empty: (R.find(r => !r.living && !r.limiting.blocked) || {}).index, blocked: (R.find(r => !r.living && r.limiting.blocked) || {}).index }; });
        const seen = {};
        for (const [k, i] of Object.entries(kinds)) { if (i === undefined) continue; await back(q); await q.evaluate(i => BLOOM_RUN_UI.adapter.actions.selectRegion(i), i); await openRoom(q, "region"); const r = await probe(q);
          seen[k] = { exact: r.canvas === r.expect, global: r.global === rows.base.global, cls: await q.evaluate(() => __ps.vis().el.className), cond: r.state.condition, living: r.state.colony.living, viable: r.state.viable };
          if (EVIDENCE && k === "stressed") await shot(q, "14-stressed.png", ".dr .dr-room:not([hidden])"); }
        // a living colony under stress: on First Bloom, real Terraform purchases (Warm ×3 after 600 ticks) push living colonies out of their comfort
        { const t = await open(ORIGINS.file, "?ui=18"); const i = await t.evaluate(() => { const A = BLOOM_RUN_UI.adapter; BLOOM_API.addBiomass(1e6); BLOOM_API.advance(600); for (let k = 0; k < 3; k++) A.actions.buy("warm");
            const r = A.regions().map(x => A.region(x.index)).find(x => x.living && (x.lamp !== "green" || x.limiting.blocked)); if (r) A.actions.selectRegion(r.index); return r ? r.index : -1; });
          if (i >= 0) { await openRoom(t, "region"); const r = await probe(t); const plain = PS.draw(Object.assign({}, r.state, { condition: "ok" }));
            seen.stressed = { exact: r.canvas === r.expect, global: r.global === plain.globalSig, cls: await t.evaluate(() => __ps.vis().el.className), cond: r.state.condition, living: r.state.colony.living, viable: r.state.viable, differsFromThriving: plain.sig !== r.canvas };
            if (EVIDENCE) await shot(t, "14-stressed.png", ".dr .dr-room:not([hidden])"); }
          await t.context().close(); }
        PROOF.browsers[bname].localKinds = seen;
        check(seen.stressed && seen.stressed.living && seen.stressed.cond !== "ok" && seen.stressed.differsFromThriving && /stressed/.test(seen.stressed.cls) && Object.keys(seen).length >= 2 && Object.values(seen).every(s => s.exact && s.global), `${tag} 14 · 35 · 36 · stressed (${seen.stressed ? "seen" : "not on this map"}), no-colony ghost (${seen.empty ? "seen" : "not on this map"}) and would-not-survive (${seen.blocked ? "seen" : "not on this map"}) regions draw exactly the adapter's local presentation of the SAME global organism (stress = the accepted strained posture, reached through real Terraform purchases)`, J(seen));
        await q.context().close(); }
      // ---- 29 · reduced motion: one exact swap
      { const q = await open(ORIGINS.file, RUNQ, { rm: true }); await q.evaluate(() => BLOOM_API.addBiomass(20000)); await openRoom(q, "adapt"); await hoverNode(q, "heat"); await q.click(`.dr .dr-room:not([hidden]) .node[data-node="heat"]`); await fxDone(q); const r = await probe(q);
        check(r.fx.style === "reduced" && r.fx.frames === 1 && r.fx.exact && r.canvas === r.expect, `${tag} 29 · reduced motion (OS setting): the purchase is one exact direct swap to the target`, J(r.fx)); await q.context().close(); }
      // ---- 7 · 37 · the report: win (training) and loss (Dying World extinction) — same genome, same organism; Terraform apart
      { const q = await open(ORIGINS.file, "?training=1&return=" + encodeURIComponent("/demos/main-menu.html"));
        const adaptSig = await q.evaluate(() => { BLOOM_API.addBiomass(5000); const A = BLOOM_RUN_UI.adapter; A.actions.buy("cold"); A.actions.buy("humid"); return true; });
        await openRoom(q, "adapt"); const live = await probe(q); await back(q);
        await q.evaluate(() => { let n = 0; while (!BLOOM_API.sim.won && n < 20000) { BLOOM_API.advance(200); n += 200; } });
        await q.waitForFunction(() => BLOOM.runReport.instance.state().open && !BLOOM.runReport.instance.state().busy, null, { timeout: 15000, polling: 30 }); await frames(q, 4);
        const win = await q.evaluate(() => __ps.probe(__ps.rep())), owned = await q.evaluate(() => Object.fromEntries(BLOOM_RUN_UI.adapter.upgrades().filter(b => b.board !== "Terraform").flatMap(b => b.items).filter(u => u.owned).map(u => [u.id, u.tier])));
        const sky = await q.evaluate(() => !!document.querySelector(".rr-sky"));
        if (EVIDENCE) await shot(q, "15-report-win.png", "#rrCard");
        void adaptSig; await q.context().close();
        const l = await open(ORIGINS.file, "?play=1&archetype=frozen_world&seed=9&scenario=dying_world"); await l.evaluate(() => BLOOM_API.advance(3000));
        await l.waitForFunction(() => BLOOM.runReport.instance.state().open && !BLOOM.runReport.instance.state().busy, null, { timeout: 15000, polling: 30 }); await frames(l, 4);
        const loss = await l.evaluate(() => __ps.probe(__ps.rep())), lossCls = await l.evaluate(() => __ps.rep().el.className);
        if (EVIDENCE) await shot(l, "16-report-loss.png", "#rrCard");
        await l.context().close();
        check(win.pack === "organic-hybrid" && win.canvas === win.expect && J(nz(win.state.traits)) === J(nz(owned)) && J(nz(live.state.traits)) === J(nz(owned)) && win.global === live.global && win.scale === 3 && !win.svg,
          `${tag} 7 · 37 · Bloom Report (win): the report's specimen is the real Organic Hybrid organism at 3×, pixels exact, from the SAME owned genome as gameplay (same organism signature as the Adapt room)${sky ? "; Terraform is listed apart and does not alter anatomy" : ""}`, J({ scale: win.scale, traits: win.state.traits, owned, global: [win.global, live.global] }));
        check(loss.pack === "organic-hybrid" && loss.canvas === loss.expect && loss.state.viable === false && /unviable/.test(lossCls) && !loss.svg,
          `${tag} 37 · Extinction report (loss): the real organism in its restrained unviable presentation, pixels exact`, J({ cls: lossCls, scale: loss.scale })); }
      // ---- 8 · Guided Training: the real rooms show the real specimen; previews and purchases do not disturb the director
      { const q = await open(ORIGINS.file, "?training=1"); await q.waitForFunction(() => window.BLOOM_TRAINING_UI && BLOOM_TRAINING_UI.guide && BLOOM_TRAINING_UI.guide.mounted && BLOOM_TRAINING_UI.guide.coach.stats.places > 0 && BLOOM_TRAINING_UI.guide.director.current, null, { timeout: 20000 });
        await q.evaluate(() => BLOOM_API.addBiomass(5000)); await openRoom(q, "adapt"); const r = await probe(q);
        const d0 = await q.evaluate(() => ({ cur: BLOOM_TRAINING_UI.guide.director.current && BLOOM_TRAINING_UI.guide.director.current.id }));
        await hoverNode(q, "cold"); const pv = await probe(q); await leaveTree(q);
        const d1 = await q.evaluate(() => ({ cur: BLOOM_TRAINING_UI.guide.director.current && BLOOM_TRAINING_UI.guide.director.current.id }));
        if (EVIDENCE) await shot(q, "17-training-specimen.png", ".dr .dr-room:not([hidden])");
        check(r.pack === "organic-hybrid" && r.canvas === r.expect && pv.previewing && d1.cur === d0.cur && !q.errs.length, `${tag} 8 · Guided Training uses the real rooms: Adapt shows the real Organic Hybrid specimen; a preview does not move the training director (lesson "${d0.cur}" before and after)`, J({ d0, d1, errs: q.errs.slice(0, 2) }));
        await q.context().close(); }
      // ---- 47 · 48 · no console error, no unhandled rejection on any page
      { const errs = pages.flatMap(q => q.errs), rej = (await Promise.all(pages.filter(q => !q.isClosed()).map(q => q.evaluate(() => window.__REJ || [])))).flat();
        check(!errs.length && !rej.length, `${tag} 47 · 48 · no console error and no unhandled promise rejection on any page`, J({ errs: errs.slice(0, 3), rej: rej.slice(0, 3) })); }
      if (EVIDENCE && bname === "chromium") await comparison(p);
      check(true, `${tag} ${bname === "firefox" ? "50" : "49"} · ${bname} ${browser.version()} ran every flow above`);
    } catch (e) { check(false, `${tag} the browser flow ran to the end`, e.message.split("\n")[0] + " @ " + ((e.stack || "").split("\n").find(l => /production-plant-integration-check\.js:\d+/.test(l)) || "").trim()); }
    await browser.close(); srvRoot.close(); srvSub.close();
  }

  // ---------------------------------------------------------------- 18 · the retired 029C SVG vs the new production specimen, identical states
  async function comparison(p) {
    const legacy = git(`show ${BASE}:resources/run-ui/plant-specimen.js`).replace("plantSpecimen:", "oldPlantSpecimen:");
    await p.addScriptTag({ content: legacy });
    const clip = await p.evaluate(STATES => {
      const old = document.createElement("div"); old.id = "__cmp"; old.style.cssText = "position:fixed;left:0;top:0;z-index:9999;background:#f3efe4;padding:12px;display:grid;grid-template-columns:repeat(6,auto);gap:8px;font:12px system-ui";
      const rows = [["BASE", {}], ["COLD T2 + HEAT T1", STATES.cold2heat1], ["DROUGHT T3", STATES.drought3], ["FLOOD T3", STATES.flood3], ["SEED T2 + EARLY + WATERBORNE", { seedOut: 2, earlyMat: 1, waterSeeds: 1 }], ["MAXIMAL DRY", STATES.maxDry]];
      const st = t => ({ traits: t, names: {}, preview: null, colony: { living: true, establishment: 1, word: "" }, focus: "balanced", local: null, condition: "ok", viable: true });
      for (const [label] of rows) { const h = document.createElement("b"); h.textContent = label; old.append(h); }
      for (const [, t] of rows) { const b = document.createElement("div"); b.style.cssText = "width:170px;height:196px;position:relative;background:#dceefa"; old.append(b); const s = BLOOM.oldPlantSpecimen.mount(b, { reducedMotion: () => true }); s.render(st(t)); b.querySelector("svg").style.cssText = "width:100%;height:100%"; }
      for (const [, t] of rows) { const b = document.createElement("div"); b.style.cssText = "width:170px;height:196px;position:relative"; old.append(b); const s = BLOOM.plantSpecimen.mount(b, { reducedMotion: () => true }); s.render(st(t)); }
      const cap = document.createElement("div"); cap.style.cssText = "grid-column:1/-1;color:#444"; cap.textContent = "Top: the RETIRED provisional 029C SVG (production before BLOOM-032C). Bottom: the BLOOM-032C production specimen — the approved Organic Hybrid organism, 84×98 at 2×. Identical states."; old.append(cap);
      document.body.append(old); const r = old.getBoundingClientRect(); return { x: 0, y: 0, width: Math.ceil(r.width), height: Math.ceil(r.height) }; }, STATES);
    await sleep(200); await p.screenshot({ path: path.join(EVD, "18-current-vs-new-production-comparison.png"), clip }); await p.evaluate(() => document.getElementById("__cmp").remove());
  }

  PROOF.results = RESULTS; PROOF.summary = { passes, fails, seconds: Math.round((Date.now() - t0) / 1000), browsers: BROWSERS };
  if (EVIDENCE) { fs.mkdirSync(EVD, { recursive: true }); fs.writeFileSync(path.join(EVD, "production-plant-proof.json"), JSON.stringify(PROOF, null, 1) + "\n"); }
  console.log(`\n${fails ? "FAIL" : "OK"} — ${passes}/${passes + fails} checks passed (${PROOF.summary.seconds} s)`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
