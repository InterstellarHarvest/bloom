// BLOOM-040 — Edge Assemble transitions + specimen consistency. The 47th regression suite. docs/evidence/bloom-040/REPORT.md.
//
//   NODE_PATH="$(npm root -g)" node tools/transition-check.js [--browsers chromium,firefox] [--only N,E,M,F,V,W,I,A,P,T] [--viewports 1024x768,…] [--evidence]
//   WebKit (macOS 12: Playwright 1.46.1 client + the frozen webkit_mac12_special build): PW_MODULE=<dir>/node_modules/playwright
//   PLAYWRIGHT_BROWSERS_PATH=<dir> node tools/transition-check.js --browsers webkit      AXE=<axe.min.js> adds the axe scan (A).
//
// Sections (the developer harness demos/demo-run.html — the same production Planet View and rooms — for the geometry; the production document
// index.html for Training):
//   N · static — the room controller animates transform / opacity only (the map's blur filter only while it fades) and never runs the mist;
//       the timing table is the locked one (open ≈ 450–550 ms, a quicker reverse, room → room 250–350 ms with a 12–24 px nudge, reduced = no
//       travel); ONE canonical specimen rule (no room-specific size, Terraform's left column = 21 %); plantEnvironment.paint without margins is
//       byte-identical to the BLOOM-040 base and its margin extension keeps the window byte-identical; no mechanic / bank / content file changed.
//   E · Edge Assemble (Planet View → Region Inspect from the banner's real button), every viewport: the selected region is emphasised on the
//       map first; the header starts ABOVE its final position, the specimen column LEFT of it, the work panels RIGHT of it; staggered; nothing
//       overshoots or resizes; every piece settles on the exact static geometry (no animation left, transform none, opacity 1); the motion
//       takes the target time; R · Back: the reverse directions, the same region still selected, the map interactive again.
//   M · reduced motion (the OS setting and the game's Settings choice): no travel at all (every sampled rect = the final one), a short fade.
//   F · the fixed specimen: Region / Adapt / Spread / Terraform share ONE specimen rectangle (x, y, width, height, the pixel scale) at every
//       viewport, and on EVERY frame of every room → room switch it never moves, resizes or fades, and two rooms are never shown.
//   V · the environment fill: under normal, rain, snow, dry, wet / flood and frozen scenes the scene reaches the left, right and bottom edges of
//       the box (no card background pixel at any edge; the environment layer covers the box).
//   W · weather legibility A / B against the base's own overlay at the same instant (the same drops, the same count): rain and snow carry
//       clearly more visible ink over overcast sky, dunes, frozen peaks and dark ridges; two overlays of one scene draw the same frame at the
//       same moment (the page clock: a room switch never restarts the weather); the incoming room's weather is drawn on its first frame.
//   I · interruption: double-click, Escape during an opening, a room tab during a switch, Escape during a switch, a burst of mixed input:
//       one room at most, no stuck opacity / transform, no invisible specimen, no stray input-blocking state, focus where it belongs, and the
//       final route = the last action.
//   A · accessibility: exactly one of {room, Planet View} exposed on every frame; the leaving room inert; focus lands after the motion
//       (room title / requested node; the opener on Back); room tabs and Back by keyboard; axe (AXE) 0 critical / 0 serious on the stable states.
//   P · performance: no specimen repaint while the containers move (putImageData on the specimen canvas = 0 during the motion), no long task
//       over 200 ms in an opening / switch / closing, keyframes limited to transform / opacity (+ the map's filter fade).
//   T · Training's specimen (production index.html → TRAINING): the canonical production Organic Hybrid path (pack, body plan, the organism
//       pixels = BLOOM.plantSpecimen.draw of the same state, = an Expedition's at the same state), no retired SVG specimen, the anatomy
//       callouts anchored on the real specimen; (PMO correction) the anatomy lessons show the FULL canonical specimen on a no-colony region
//       (no ghost dither) while every other lesson keeps the ghost, and no colony is created.
//   X · (PMO correction) the Bloom / Extinction report: a quiet CROSSFADE, never the mist / cloud page transition — Expedition Bloom,
//       Dying World Extinction and Bloom, Native Competition Bloom (the harness) and Thin Air (the production Challenge flow): the correct report,
//       its actions, Keep playing, no duplicate report, no stuck opacity, rapid input / Escape cannot strand it, reduced motion, axe.
//   Exits 1 on any FAIL.
"use strict";
const path = require("path"), fs = require("fs"), http = require("http"), cp = require("child_process"), crypto = require("crypto");
const argv = process.argv, argOf = k => { const i = argv.indexOf(k); return i > 0 ? argv[i + 1] : null; };
const ROOT = path.resolve(__dirname, ".."), J = JSON.stringify, BASE = "d03c6f9";   // the BLOOM-040 starting production SHA
const BROWSERS = (argOf("--browsers") || "chromium,firefox").split(","), ONLY = (argOf("--only") || "N,E,M,F,V,W,I,A,P,T,X").split(","), EVIDENCE = argv.includes("--evidence");
const VIEWPORTS = (argOf("--viewports") || "1024x768,1440x900,1920x1080,2560x1440").split(",").map(v => v.split("x").map(Number));
const EVD = path.join(ROOT, "docs/evidence/bloom-040"), AXE = process.env.AXE && fs.existsSync(process.env.AXE) ? fs.readFileSync(process.env.AXE, "utf8") : null;
let fails = 0, passes = 0; const t0 = Date.now();
const check = (ok, name, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); if (ok) passes++; else fails++; };
const info = (name, detail) => console.log(`INFO  ${name}  — ${typeof detail === "string" ? detail : J(detail)}`);
const git = c => cp.execSync(`git ${c}`, { cwd: ROOT, encoding: "utf8", maxBuffer: 64 << 20 }).trim();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const has = k => ONLY.includes(k);
const PROOF = { base: BASE, browsers: {} };

// ================================================================ N · static
if (has("N")) {
  console.log("# Node");
  const DR = fs.readFileSync(path.join(ROOT, "resources/run-ui/decision-rooms.js"), "utf8"), CSS = fs.readFileSync(path.join(ROOT, "resources/run-ui/decision-rooms.css"), "utf8");
  global.window = undefined; require(path.join(ROOT, "resources/run-ui/decision-rooms.js")); const E = globalThis.BLOOM.decisionRooms.EDGE;
  const end = o => Math.max(...Object.values(o).filter(Array.isArray).map(([d, m]) => d + m));
  const openMs = end(E.open), closeMs = end(E.close), switchMs = E.switch.out + E.switch.in;
  const ctrl = DR.slice(DR.indexOf("(BLOOM-040) EDGE ASSEMBLE —"), DR.indexOf("function closeImmediate"));
  const props = [...ctrl.matchAll(/\{\s*(transform|opacity|filter)\s*:/g)].map(m => m[1]), otherProps = [...ctrl.matchAll(/\{\s*(width|height|top|left|right|bottom|margin|padding)\s*:/g)];
  check(openMs >= 450 && openMs <= 550 && closeMs < openMs && closeMs >= 250 && switchMs >= 250 && switchMs <= 350 && E.switch.nudge >= 12 && E.switch.nudge <= 24 && E.open.header[0] < E.open.focus[0] && E.open.focus[0] < E.open.work[0]
    && E.open.header[0] >= 40 && E.open.header[0] <= 80 && E.open.focus[0] >= 80 && E.open.focus[0] <= 130 && E.open.work[0] >= 120 && E.open.work[0] <= 170 && E.ease === "cubic-bezier(.2,.8,.2,1)" && E.reduced.open <= 200,
    "N1 · the Edge Assemble timing table: opening settles at 450–550 ms (header ~40–80 ms, specimen ~80–130 ms, work panels ~120–170 ms, ease cubic-bezier(.2,.8,.2,1)), the reverse is quicker, room → room 250–350 ms with a 12–24 px nudge, reduced motion short",
    J({ openMs, closeMs, switchMs, nudge: E.switch.nudge, open: E.open, reduced: E.reduced }));
  check(props.length > 8 && !otherProps.length && !/\.run\(\{\s*onCovered/.test(ctrl) && !/swapThrough|AtmosphereTransition/.test(ctrl) && /filter: SHARP|filter: BLURRED/.test(ctrl) && !/backdrop-filter/.test(CSS.replace(/\/\*[\s\S]*?\*\//g, "")),
    "N2 · the room controller animates transform / opacity only (+ the map's own blur filter while the veil fades), never layout properties; room swaps never run the AtmosphereTransition mist; no backdrop filter", J({ props: [...new Set(props)], other: otherProps.length }));
  const lfRules = [...CSS.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{}]*\.lf-top[^{}]*)\{([^}]*)\}/g)].filter(m => /(aspect-ratio|max-height|(^|[;\s])width|(^|[;\s])height)\s*:/.test(m[2])).map(m => m[1].trim());
  const tfCols = (CSS.match(/\.dr \.r-terraform\{grid-template-columns:([^;]+);/) || [])[1], baseCols = (CSS.match(/\.dr-room\{[^}]*grid-template-columns:([^;]+);/) || [])[1];
  check(lfRules.length === 1 && lfRules[0] === ".dr .lf-top" && tfCols && tfCols.trim().startsWith("21%") && baseCols && baseCols.trim().startsWith("21%") && /\.dr \.z-focus\{[^}]*height:100%/.test(CSS),
    "N3 · ONE canonical specimen rule (.dr .lf-top: the full 21 % left column, 170 : 196, capped at 56 % of the zone): no room-specific specimen size; Terraform's left column is the same 21 %", J({ lfRules, tfCols, baseCols }));
  // plantEnvironment: the frame is unchanged; the margin extension keeps the window byte-identical
  const oldSrc = git(`show ${BASE}:resources/plant-visual/plant-environment.js`), O = {}; new Function("window", oldSrc)(O); const PO = O.BLOOM.plantEnvironment;
  require(path.join(ROOT, "resources/plant-visual/plant-environment.js")); const PE = globalThis.BLOOM.plantEnvironment;
  let n = 0, same = 0, windowOk = 0; const W = 84, H = 98, SOIL = 70;
  for (const a of ["ocean_archipelago", "desert_world", "frozen_world", null]) for (let t = -30; t <= 45; t += 15) for (let m = 0; m <= 100; m += 20) for (const salt of [0, 3]) {
    const s = PE.region({ planetId: `p${t}${a}`, archetypeId: a, regionId: `r${m}`, sky: { temperature: t, moisture: m }, salinity: salt, toxicity: salt ? 2 : 0, radiation: 40 }); n++;
    const f = PE.paint(s, W, H, SOIL); if (!Buffer.compare(Buffer.from(f), Buffer.from(PO.paint(s, W, H, SOIL))) && PE.signature(s, W, H, SOIL) === PO.signature(s, W, H, SOIL) && J(PE.fx(s)) === J(PO.fx(s))) same++;
    const e = { left: 5 + (t & 3), top: 4, right: 9, bottom: 11 }, X = PE.paint(s, W, H, SOIL, e), EW = W + e.left + e.right; let ok = X.length === EW * (H + e.top + e.bottom) * 4;
    for (let y = 0; ok && y < H; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4, j = ((y + e.top) * EW + x + e.left) * 4; if (f[i] !== X[j] || f[i + 1] !== X[j + 1] || f[i + 2] !== X[j + 2] || f[i + 3] !== X[j + 3]) { ok = false; break; } }
    for (let i = 3; ok && i < X.length; i += 4) if (X[i] !== 255) ok = false; if (ok) windowOk++; }
  check(same === n && windowOk === n, `N4 · plantEnvironment: for ${n} scenes the 84 × 98 frame, its signature and FX spec are byte-identical to ${BASE} (every organism / environment signature is unchanged), and the box-filling margin extension is opaque with its window byte-identical to the frame`, J({ n, same, windowOk }));
  const prot = ["resources/bloom-sim.js", "resources/bloom-species.js", "resources/bloom-gen.js", "resources/bloom-validate.js", "resources/bloom-witness.js", "resources/bloom-archetype.js", "resources/bloom-scenario.js", "resources/bloom-challenges.js",
    "resources/challenges", "content", "planets", "resources/plant-visual/generated", "resources/plant-visual/plant-compositor.js", "resources/plant-visual/plant-components.js", "resources/plant-visual/plant-visual-model.js", "resources/plant-visual/grammars", "art", "resources/atmosphere-transition",
    "resources/training/training-coach.js", "resources/training/training-coach.css", "resources/training/training-director.js", "resources/training/training-store.js", "resources/run-ui/gameplay-transition.js"];
  const changed = git(`diff --name-only ${BASE} -- ${prot.join(" ")}`).split("\n").filter(Boolean);
  const bank = crypto.createHash("sha256").update(fs.readFileSync(path.join(ROOT, "content/challenge-seed-banks.js"))).digest("hex");
  // (PMO correction) the training lessons are unchanged: training-steps.js only ADDS the anatomy-lesson list, training-run.js only the anatomy hook
  const tdiff = f => git(`diff -U0 ${BASE} -- ${f}`).split("\n").filter(l => /^[-+][^-+]/.test(l) || /^[-+]$/.test(l));
  const steps = tdiff("resources/training/training-steps.js"), trun = tdiff("resources/training/training-run.js");
  const lessonsOk = steps.every(l => l.startsWith("+")) && steps.some(l => /ANATOMY_LESSONS = Object\.freeze\(\["limiting-factor", "adapt-buy"\]\)/.test(l))
    && trun.filter(l => l.startsWith("-")).every(l => /KEEP_CLEAR \} from|onFinish: outcome|unmount\(\) \{|readUi,$|placeBubble/.test(l)) && trun.filter(l => l.startsWith("+")).every(l => /anatomy|ANATOMY|^\+\s*\/\/|^\+\s*\}$|^\+\s*const dr|^\+\s*const on|^\+\s*dr\.set|KEEP_CLEAR|placeBubble|unmount/.test(l));
  check(!changed.length && lessonsOk && bank === "8506124b462cf4d47710a1eb37806ddead9dd3f600c28c36cfcfd071fda59e40",
    `N5 · presentation only: no engine, species, generator, scenario, Challenge, content, planet, plant-art (atlas included), compositor, mist, bridge or training coach / director / store file differs from ${BASE}; the lessons are unchanged (training-steps.js only adds the anatomy-lesson list; training-run.js only the anatomy hook); the seed bank is the released one (sha256 8506124b…)`, J({ changed, lessonsOk, steps: steps.length, trun: trun.length, bank: bank.slice(0, 8) }));
  const FXsrc = PE.mountFx.toString(), ctrlWeather = /mountFx|\.fx\(|rain|snow|clouds/.test(ctrl);
  const RR = fs.readFileSync(path.join(ROOT, "resources/run-ui/run-report.js"), "utf8").replace(/\/\/[^\n]*/g, ""), RRC = fs.readFileSync(path.join(ROOT, "resources/run-ui/run-report.css"), "utf8");
  check(!/T\.run\(|\.run\(\{\s*onCovered|through\(/.test(RR) && /function crossfade\(/.test(RR) && /crossfade\("report-open"/.test(RR) && /crossfade\("report-close"/.test(RR) && !/rrEnter|\.entering/.test(RRC),
    "N7 · (PMO correction) the Bloom / Extinction report never runs the mist / cloud page transition (no bridge run in run-report.js): it opens and closes with its own crossfade; the card has no entrance transform", "");
  check(/clock\(\)/.test(FXsrc) && !/t0/.test(FXsrc) && !ctrlWeather, "N6 · weather is environment, never a transition device: the room controller never touches the weather; the overlay's animation time is the page clock (no per-overlay restart)", J({ ctrlWeather }));
}

(async () => {
  if (!["E", "M", "F", "V", "W", "I", "A", "P", "T", "X"].some(has)) return finish();
  const pw = require(process.env.PW_MODULE || "playwright");
  const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".json": "application/json", ".svg": "image/svg+xml", ".webp": "image/webp", ".jpg": "image/jpeg" };
  const server = http.createServer((req, res) => { let u = decodeURIComponent(new URL(req.url, "http://x").pathname); if (u.endsWith("/")) u += "index.html"; const f = path.join(ROOT, u);
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream", "cache-control": "no-store" }); fs.createReadStream(f).pipe(res); });
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  const ORIGIN = `http://127.0.0.1:${server.address().port}`, RUN = ORIGIN + "/demos/demo-run.html", HOME = ORIGIN + "/";
  if (EVIDENCE) fs.mkdirSync(path.join(EVD, "frames"), { recursive: true });
  const OLD_PE = git(`show ${BASE}:resources/plant-visual/plant-environment.js`);
  const INIT = () => { window.__EV = []; for (const t of ["play-pause", "region-select", "upgrade-preview"]) document.addEventListener("bloom:" + t, e => window.__EV.push({ type: t, detail: e.detail }));
    // P: count specimen repaints (putImageData on the organism canvas) — read while the containers move
    window.__PUT = 0; const put = CanvasRenderingContext2D.prototype.putImageData; CanvasRenderingContext2D.prototype.putImageData = function (...a) { if (this.canvas && this.canvas.classList && this.canvas.classList.contains("ps-canvas")) window.__PUT++; return put.apply(this, a); };
    window.__LT = []; try { new PerformanceObserver(l => { for (const e of l.getEntries()) window.__LT.push(Math.round(e.duration)); }).observe({ type: "longtask", buffered: false }); } catch { window.__LT = null; } };
  // in-page helpers: rects, the visible room, sampling a transition on every animation frame until it settles
  const H = `(() => { const R = el => { if (!el) return null; const r = el.getBoundingClientRect(); return [r.x, r.y, r.width, r.height].map(v => Math.round(v * 100) / 100); };
    const rooms = () => [...document.querySelectorAll(".dr .dr-room")].filter(s => !s.hidden), room = () => rooms()[0] || null;
    const DR = () => BLOOM.decisionRooms.instance, PV = () => BLOOM.planetView.instance, A = () => BLOOM_RUN_UI.adapter;
    const parts = s => ({ header: R(s.querySelector(".rh")), focus: R(s.querySelector(".z-focus")), main: R(s.querySelector(".z-main")), map: R(s.querySelector(".z-map")), box: R(s.querySelector(".lf-top")),
      op: ["rh", ".z-focus", ".z-main", ".z-map", ".lf-top"].map(q => +getComputedStyle(s.querySelector(q === "rh" ? ".rh" : q)).opacity) });
    const exposed = () => { const pvHidden = [".pv-hud", ".pv-stage", ".pv-foot"].every(q => { const e = document.querySelector(q); return e.getAttribute("aria-hidden") === "true" && e.inert; }); return { rooms: rooms().length, pvHidden, layer: !document.getElementById("dr").hidden }; };
    const delays = s => s ? Object.fromEntries([["header", ".rh"], ["focus", ".z-focus"], ["main", ".z-main"], ["map", ".z-map"]].map(([k, q]) => { const a = s.querySelector(q).getAnimations()[0]; return [k, a ? a.effect.getTiming().delay : null]; })) : null;
    async function sample(fn, { min = 60, max = 3000 } = {}) { const out = [], t0 = performance.now(); fn(); window.__delays = delays(rooms()[0] || null);
      await new Promise(res => { const f = () => { const s = room(), st = DR().state(); out.push({ t: Math.round(performance.now() - t0), n: rooms().length, tr: st.transitioning, kind: st.transitionKind, ex: exposed(),
          p: s ? parts(s) : null, veil: +getComputedStyle(document.querySelector(".dr-veil")).opacity, put: window.__PUT, spot: PV().state().spot });
        if ((st.transitioning || performance.now() - t0 < min) && performance.now() - t0 < max) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); }); return out; }
    const quiet = () => document.getAnimations().filter(a => a.playState === "running" || a.playState === "paused").filter(a => a.effect && a.effect.target && a.effect.target.closest && (a.effect.target.closest(".dr") || a.effect.target.closest(".pv"))).length;
    const settledState = () => { const s = room(); return { room: DR().state().room, n: rooms().length, layer: !document.getElementById("dr").hidden, anims: quiet(), ex: exposed(),
      inline: s ? [...s.querySelectorAll(".rh,.z-focus,.z-main,.z-map,.lf-top,.lf-info")].map(e => getComputedStyle(e).transform + "|" + getComputedStyle(e).opacity).filter(x => x !== "none|1") : [],
      pvInert: document.querySelector(".pv-stage").inert, active: document.activeElement ? (document.activeElement.closest(".dr-room") ? "room:" + (document.activeElement.tagName) : document.activeElement.dataset.tool || document.activeElement.tagName) : null,
      run: A().run().running, sel: A().selection().index, specOk: s ? (b => b.width > 50 && +getComputedStyle(s.querySelector(".lf-top")).opacity === 1)(s.querySelector(".lf-top").getBoundingClientRect()) : null }; };
    const specOf = () => { const s = room(); return s && BLOOM.plantSpecimen.mounted().find(x => s.querySelector(".lf-top").contains(x.el)); };
    window.__T = { R, rooms, room, DR, PV, A, parts, sample, settledState, specOf, exposed, quiet }; return true; })()`;
  const frames = (p, n = 3) => p.evaluate(n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
  // settled = no transition in flight and every room / map animation drained (the tendrils' short fade-in after a room settles included)
  const settled = p => p.waitForFunction(() => !BLOOM.decisionRooms.instance.state().transitioning && !BLOOM.decisionRooms.instance.state().motion && (!window.__T || __T.quiet() === 0), null, { timeout: 10000, polling: 20 });

  for (const bn of BROWSERS) {
    let browser; try { browser = await pw[bn].launch(); } catch (e) { check(false, `[${bn}] browser launches`, e.message.split("\n")[0]); continue; }
    console.log(`\n# ${bn} ${browser.version()}`); const tag = s => `[${bn}] ${s}`, P = PROOF.browsers[bn] = {};
    const open = async (q = "?archetype=ocean_archipelago&seed=28", { w = 1440, h = 900, rm = false, settings = null } = {}) => {
      const c = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: rm ? "reduce" : "no-preference" }); await c.addInitScript(INIT);
      if (settings) await c.addInitScript(s => { try { localStorage.setItem("strange-bloom.settings", s); } catch { /* blocked */ } }, J(settings));
      const p = await c.newPage(); p.errs = []; p.on("pageerror", e => p.errs.push(e.message)); p.on("console", m => { if (m.type() === "error") p.errs.push(m.text()); });
      await p.goto(RUN + q);
      await p.waitForFunction(() => window.BLOOM && BLOOM.planetView && BLOOM.planetView.instance && BLOOM.decisionRooms && BLOOM.decisionRooms.instance && BLOOM.planetView.instance.renderer.info().frames > 0, null, { timeout: 60000, polling: 100 });
      await p.evaluate(H); await frames(p, 4); await p.evaluate(() => BLOOM.decisionRooms.instance.transition && BLOOM.decisionRooms.instance.transition.prepared).catch(() => null); await sleep(250); return p; };
    const close = async p => { try { await p.context().close(); } catch { /* gone */ } };
    const selectLand = p => p.evaluate(() => { const A = __T.A(), r = A.regions().filter(x => !x.isOrigin)[1] || A.regions()[0]; A.actions.selectRegion(r.index); return r.index; });
    const shot = async (p, name, clip) => { if (EVIDENCE) await p.screenshot({ path: path.join(EVD, "frames", `${bn}-${name}.png`), ...(clip ? { clip } : {}) }).catch(() => {}); };
    try {
      // ============================================================ E · R · Edge Assemble and its reverse, every viewport
      if (has("E")) for (const [w, h] of VIEWPORTS) {
        const p = await open(undefined, { w, h }); const vt = `${w}×${h}`;
        await p.evaluate(() => __T.A().actions.play()); const sel = await selectLand(p); await frames(p, 6); await sleep(200);
        const n0 = await p.evaluate(() => __EV.length);
        const S = await p.evaluate(() => __T.sample(() => document.querySelector('.pv-banner [data-go="region"]').click()));
        await settled(p); await frames(p, 3);
        const fin = await p.evaluate(() => ({ p: __T.parts(__T.room()), st: __T.settledState(), e: __T.DR().timeline().slice(-1)[0], spot: __T.PV().state().spot, ev: __EV.slice(0).map(e => e.type) }));
        const F = fin.p, mid = S.filter(s => s.p && s.tr), first = mid[0], near = (a, b, d = 0.6) => Math.abs(a - b) <= d;
        const noOvershoot = mid.every(s => s.p.header[1] <= F.header[1] + 0.6 && s.p.focus[0] <= F.focus[0] + 0.6 && s.p.main[0] >= F.main[0] - 0.6 && s.p.map[0] >= F.map[0] - 0.6
          && near(s.p.header[2], F.header[2]) && near(s.p.focus[2], F.focus[2]) && near(s.p.main[2], F.main[2]) && near(s.p.map[2], F.map[2]));
        const D = await p.evaluate(() => window.__delays), staggered = !!D && D.header < D.focus && D.focus < D.main && D.main === D.map && D.header >= 40 && D.main <= 170;   // the pieces' own animation delays
        const motionMs = fin.e.tEnd - fin.e.tStart, lead = fin.e.tMotion - fin.e.tStart;
        check(first && first.p.header[1] < F.header[1] - 20 && first.p.focus[0] < F.focus[0] - 20 && first.p.main[0] > F.main[0] + 20 && first.p.map[0] > F.map[0] + 20 && first.p.op.slice(0, 4).every(o => o < 0.5),
          tag(`E1 · ${vt} Planet View → Region Inspect: the header begins ABOVE its final position, the specimen column LEFT of it, the work panels RIGHT of it (faded in from their edges)`),
          J({ header: [first && first.p.header[1], F.header[1]], focus: [first && first.p.focus[0], F.focus[0]], main: [first && first.p.main[0], F.main[0]], map: [first && first.p.map[0], F.map[0]] }));
        check(noOvershoot && staggered && fin.st.anims === 0 && !fin.st.inline.length && fin.st.n === 1 && fin.e.ran && !fin.e.superseded,
          tag(`E2 · ${vt} the pieces travel toward their place without overshoot or resize, staggered (header → specimen → work), and settle on the exact static geometry (no animation left, transform none, opacity 1)`),
          J({ samples: mid.length, noOvershoot, delays: D, anims: fin.st.anims, inline: fin.st.inline.slice(0, 3) }));
        const spotFirst = S.find(s => s.spot), emph = !!spotFirst && spotFirst.spot.index === sel && S[0].veil <= 0.15;
        check(emph && fin.spot && fin.spot.index === sel && fin.st.sel === sel && motionMs >= 430 && motionMs <= (bn === "chromium" ? 800 : 1100) && lead <= 250 && fin.e.ticksAtEnd === fin.e.ticksAtStart && fin.e.runningAtSwap === false,
          tag(`E3 · ${vt} the map emphasises THIS region first (the rest dims, one pulse — no zoom, no pan; the veil arrives after), the run pauses at once and never advances, the motion settles in ≈ 0.5 s (measured, headless)`),
          J({ sel, spot: fin.spot, motionMs: Math.round(motionMs), firstFrameMs: Math.round(lead), veil0: S[0].veil, ticks: [fin.e.ticksAtStart, fin.e.ticksAtEnd] }));
        P[`open-${vt}`] = { motionMs: Math.round(motionMs), firstFrameMs: Math.round(lead), samples: mid.length, first: first && first.p, final: F };
        if (w === 1440) { await shot(p, "edge-assemble-end"); }
        // ---- R · Back: the reverse
        const B = await p.evaluate(() => __T.sample(() => document.querySelector(".dr .dr-room:not([hidden]) .rb.back").click(), { min: 0 }));
        await settled(p); await frames(p, 3);
        const fb = await p.evaluate(() => ({ st: __T.settledState(), e: __T.DR().timeline().slice(-1)[0] })), bm = B.filter(s => s.p && s.tr), last = bm[bm.length - 1];
        const rev = bm.length >= 2 && bm.every(s => s.p.header[1] <= F.header[1] + 0.6 && s.p.focus[0] <= F.focus[0] + 0.6 && s.p.main[0] >= F.main[0] - 0.6 && s.p.map[0] >= F.map[0] - 0.6)
          && last.p.header[1] < F.header[1] - 10 && last.p.focus[0] < F.focus[0] - 10 && last.p.main[0] > F.main[0] + 10;
        const veilDown = bm.length >= 2 && bm[bm.length - 1].veil < bm[0].veil;
        const backMs = fb.e.tEnd - fb.e.tStart;
        // the map takes input again: a click on another region selects it
        const other = await p.evaluate(s => { const A = __T.A(); for (const r of A.regions()) { if (r.index === s) continue; const pt = __T.PV().regionPoint(r.id), e = pt && document.elementFromPoint(pt.x, pt.y);
          if (e && e.tagName === "CANVAS" && !e.closest(".pv-banner")) return { i: r.index, pt }; } return null; }, sel);
        await p.mouse.click(other.pt.x, other.pt.y); await frames(p, 3); const after = await p.evaluate(() => __T.A().selection().index);
        check(rev && veilDown && fb.st.room === null && !fb.st.layer && !fb.st.pvInert && fb.st.sel === sel && fb.st.run === true && backMs < motionMs && after !== sel && after >= 0,
          tag(`R1 · ${vt} Back is the reverse (work panels exit RIGHT, specimen LEFT, header UP; the veil clears, quicker), the map resolves with the SAME region selected, the run restored, and the map takes clicks again`),
          J({ samples: bm.length, rev, veilDown, backMs: Math.round(backMs), sel: [sel, fb.st.sel], clickSelects: after }));
        P[`back-${vt}`] = { backMs: Math.round(backMs) };
        if (EVIDENCE && w === 1440) { // start / middle / end frames of both motions, paused at fixed points of the animation (deterministic)
          for (const [nm, fn] of [["edge-assemble", () => document.querySelector('.pv-banner [data-go="region"]').click()]]) {
            for (const [k, ms] of [["start", 50], ["middle", 160], ["end", 460]]) {
              await p.evaluate(() => { __T.A().actions.selectRegion(__T.A().selection().index); }); await settled(p);
              await p.evaluate(fn); await p.evaluate(ms => { for (const a of document.getAnimations()) { a.pause(); a.currentTime = ms; } }, ms); await frames(p, 2); await shot(p, `${nm}-${k}`);
              await p.evaluate(() => { for (const a of document.getAnimations()) a.finish(); }); await settled(p); await frames(p, 2);
              await p.evaluate(() => __T.DR().close(false)); await p.evaluate(() => { for (const a of document.getAnimations()) a.finish(); }); await settled(p); await sleep(150); } }
          await p.evaluate(() => document.querySelector('.pv-banner [data-go="region"]') ? document.querySelector('.pv-banner [data-go="region"]').click() : __T.PV().openRoom("region", {})); await settled(p); await frames(p, 2);
          for (const [k, ms] of [["start", 20], ["middle", 140], ["end", 290]]) { await p.evaluate(() => __T.DR().close(false)); await p.evaluate(ms => { for (const a of document.getAnimations()) { a.pause(); a.currentTime = ms; } }, ms); await frames(p, 2); await shot(p, `reverse-${k}`);
            await p.evaluate(() => { for (const a of document.getAnimations()) a.finish(); }); await settled(p); if (k !== "end") { await p.evaluate(() => __T.PV().openRoom("region", {})); await p.evaluate(() => { for (const a of document.getAnimations()) a.finish(); }); await settled(p); } } }
        check(!p.errs.length, tag(`E4 · ${vt} no console error`), p.errs.slice(0, 2).join(" | ")); await close(p);
      }

      // ============================================================ M · reduced motion (the OS setting, then the game's own Settings choice)
      if (has("M")) for (const how of ["os", "settings"]) {
        const p = await open(undefined, { w: 1440, h: 900, rm: how === "os", settings: how === "settings" ? { v: 1, motion: "reduced" } : null });
        await p.waitForFunction(() => __T.DR().transition && __T.DR().transition.kind !== "pending", null, { timeout: 15000 }).catch(() => null);
        await selectLand(p); await frames(p, 4);
        const S = await p.evaluate(() => __T.sample(() => document.querySelector('.pv-banner [data-go="region"]').click())); await settled(p); await frames(p, 2);
        const F = await p.evaluate(() => __T.parts(__T.room())), mid = S.filter(s => s.p && s.tr);
        const still = mid.every(s => ["header", "focus", "main", "map", "box"].every(k => s.p[k].every((v, i) => Math.abs(v - F[k][i]) <= 0.6))), fades = mid.some(s => s.p.op[0] < 1);
        const sw = await p.evaluate(() => __T.sample(() => __T.room().querySelector('.rn[data-go="terraform"]').click())); await settled(p);
        const boxes = [...new Set(sw.filter(s => s.p).map(s => s.p.box.join(",")))], e = await p.evaluate(() => __T.DR().timeline().slice(-2)), F2 = await p.evaluate(() => __T.parts(__T.room()));   // Terraform's own settled geometry
        const B = await p.evaluate(() => __T.sample(() => document.querySelector(".dr .dr-room:not([hidden]) .rb.back").click(), { min: 0 })); await settled(p);
        const bStill = B.filter(s => s.p && s.tr).every(s => ["header", "focus", "main", "map"].every(k => s.p[k].every((v, i) => Math.abs(v - F2[k][i]) <= 0.6)));
        check(still && fades && bStill && boxes.length === 1 && e.every(x => x.motion === "reduced") && sw.every(s => s.n <= 1),
          tag(`M1 · reduced motion (${how === "os" ? "the OS prefers-reduced-motion" : "Settings → Motion: Reduced"}): no directional travel at all (every sampled rect = the final one), a short cross-fade still marks the change; the specimen stays fixed between rooms`),
          J({ samples: mid.length, still, fades, back: bStill, boxes, kinds: e.map(x => [x.kind, x.motion, Math.round(x.tEnd - x.tStart)]) }));
        await close(p);
      }

      // ============================================================ F · the fixed specimen (every viewport, every room, every frame of every switch)
      if (has("F")) for (const [w, h] of VIEWPORTS) {
        const p = await open(undefined, { w, h }); const vt = `${w}×${h}`; await selectLand(p); await frames(p, 3);
        await p.evaluate(() => __T.PV().openRoom("region", {})); await settled(p); await frames(p, 4);
        const rect = () => p.evaluate(() => { const s = __T.specOf(); return { box: __T.R(__T.room().querySelector(".lf-top")), canvas: __T.R(s.canvas), scale: s.scale(), sig: s.signature(), org: s.organismSignature(), env: s.environmentSignature() }; });
        const stable = { region: await rect() }, perFrame = [];
        for (const r of ["adapt", "spread", "terraform", "region", "terraform", "adapt"]) {
          const S = await p.evaluate(r => __T.sample(() => __T.room().querySelector(`.rn[data-go="${r}"]`).click(), { min: 50 }), r); await settled(p); await frames(p, 3);
          perFrame.push({ to: r, frames: S.length, two: S.filter(s => s.n !== 1).length, boxes: [...new Set(S.filter(s => s.p).map(s => s.p.box.join(",")))], minOp: Math.min(...S.filter(s => s.p).map(s => s.p.op[4])) });
          stable[r] = await rect(); }
        const keys = Object.keys(stable), ref = stable.region, sameAll = keys.every(k => J(stable[k].box) === J(ref.box) && J(stable[k].canvas) === J(ref.canvas) && stable[k].scale === ref.scale);
        const sameFrames = perFrame.every(f => f.two === 0 && f.boxes.length === 1 && f.boxes[0] === ref.box.join(",") && f.minOp === 1);
        check(sameAll, tag(`F1 · ${vt} ONE specimen rectangle for Region Inspect · Adapt · Spread · Terraform — x, y, width, height, the organism canvas and its pixel scale identical`), J(Object.fromEntries(keys.map(k => [k, [stable[k].box, stable[k].scale]]))));
        check(sameFrames, tag(`F2 · ${vt} on EVERY frame of six room → room switches the specimen box never moves, resizes or fades, and two rooms are never shown`), J(perFrame.map(f => [f.to, f.frames, f.boxes.length, f.two, f.minOp])));
        const T0 = stable.terraform, ratio = ref.box[3] / ref.box[2];
        check(J(T0.box) === J(ref.box) && T0.scale === ref.scale && T0.org === ref.org && T0.env === ref.env && T0.sig === ref.sig && (Math.abs(ratio - 196 / 170) < 0.02 || ref.box[3] < ref.box[2] * 196 / 170),
          tag(`F3 · ${vt} Terraform conforms: the same box, the same scale, the same organism / environment / displayed pixels as Region Inspect at rest (170 : 196, or the 56 % cap)`), J({ terraform: T0.box, region: ref.box, scale: [T0.scale, ref.scale], ratio: +ratio.toFixed(3) }));
        P[`specimen-${vt}`] = stable.region; P[`specimen-${vt}`].rooms = Object.fromEntries(keys.map(k => [k, stable[k].box]));
        await close(p);
      }

      // ============================================================ V · the environment fill under representative weather
      if (has("V")) for (const [w, h] of [[1024, 768], [1440, 900]]) {
        const p = await open(undefined, { w, h }); await selectLand(p); await p.evaluate(() => __T.PV().openRoom("region", {})); await settled(p); await frames(p, 3);
        const STATES = { normal: [14, 46, "ocean_archipelago"], rain: [12, 86, "ocean_archipelago"], snow: [-12, 70, "frozen_world"], dry: [30, 12, "desert_world"], "wet-flood": [16, 96, "ocean_archipelago"], frozen: [-22, 40, "frozen_world"] }, res = {};
        for (const [k, [t, m, a]] of Object.entries(STATES)) {
          const g = await p.evaluate(([t, m, a]) => { const s = __T.specOf(), PE = BLOOM.plantEnvironment;
            s.render({ ...s.state, scene: PE.region({ planetId: "qa-fill", archetypeId: a, regionId: "qa", sky: { temperature: t, moisture: m } }) }); const f = s.fill(), b = __T.room().querySelector(".lf-top .ps").getBoundingClientRect();
            return { env: f.env, covers: !!f.envRect && f.envRect.left <= b.left + 0.5 && f.envRect.top <= b.top + 0.5 && f.envRect.right >= b.right - 0.5 && f.envRect.bottom >= b.bottom - 0.5, box: [b.x, b.y, b.width, b.height], fx: Object.entries(s.fxState().spec || {}).filter(([q, v]) => v && q !== "seed").map(([q]) => q) }; }, [t, m, a]);
          await frames(p, 2);
          // the rendered pixels at the box's left, right and bottom edges (2 px inside): never the card's own background colour
          const png = await p.screenshot({ clip: { x: g.box[0], y: g.box[1], width: g.box[2], height: g.box[3] } });
          const edge = await p.evaluate(async b64 => { const im = new Image(); im.src = "data:image/png;base64," + b64; await im.decode(); const c = document.createElement("canvas"); c.width = im.width; c.height = im.height; const x = c.getContext("2d"); x.drawImage(im, 0, 0);
            const d = x.getImageData(0, 0, c.width, c.height).data, at = (i, j) => { const o = (j * c.width + i) * 4; return [d[o], d[o + 1], d[o + 2]]; }, bg = [220, 238, 250], isBg = q => Math.abs(q[0] - bg[0]) + Math.abs(q[1] - bg[1]) + Math.abs(q[2] - bg[2]) < 6;
            const R = 18; let n = 0, hits = 0, where = []; for (let j = 0; j < c.height - R; j++) for (const i of [2, c.width - 3]) { n++; if (isBg(at(i, j))) { hits++; where.push([i, j]); } } for (let i = R; i < c.width - R; i++) { n++; if (isBg(at(i, c.height - 3))) { hits++; where.push([i, c.height - 3]); } } return { n, hits, where: where.slice(0, 4), size: [c.width, c.height] }; }, png.toString("base64"));
          res[k] = { ...g, edge };
          if (EVIDENCE && w === 1440) fs.writeFileSync(path.join(EVD, "frames", `${bn}-fill-${k}.png`), png);
        }
        await p.evaluate(() => __T.DR().setCtx(__T.DR().state().context)); // the real scene back
        check(Object.values(res).every(r => r.env && r.covers && r.edge.hits === 0) && res.rain.fx.includes("rain") && res.snow.fx.includes("snow"),
          tag(`V1 · ${w}×${h} the specimen environment reaches the left, right and bottom edges of its box under normal · rain · snow · dry · wet / flood · frozen scenes (the scene layer covers the box; no card-background pixel at any edge; the caption overlays it)`),
          J(Object.fromEntries(Object.entries(res).map(([k, r]) => [k, [r.covers, r.edge.hits, r.fx.join("+")]]))));
        await close(p);
      }

      // ============================================================ W · weather legibility A / B (the base's overlay vs this one, the same instant) + continuity
      if (has("W")) for (const [w, h] of [[1440, 900], [1024, 768]]) {
        const p = await open(undefined, { w, h }); await selectLand(p); await p.evaluate(() => __T.PV().openRoom("region", {})); await settled(p); await frames(p, 3);
        const ab = await p.evaluate(async ([oldSrc, cases]) => {
          const O = {}; new Function("window", oldSrc)(O); const PO = O.BLOOM.plantEnvironment, PE = BLOOM.plantEnvironment, sp = __T.specOf(), k = sp.scale(), W = 84, H = 98, SOIL = 70;
          const lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b, out = {};
          for (const [name, t, m, a] of cases) {
            const sc = PE.region({ planetId: "qa-wx-" + name, archetypeId: a, regionId: "qa", sky: { temperature: t, moisture: m } }), bg = PE.paint(sc, W, H, SOIL), spec = PE.fx(sc);
            const draw = (P, still) => { const cv = document.createElement("canvas"), fx = P.mountFx(cv, { reducedMotion: () => true }); fx.set(spec, { W, H, soilY: SOIL, scale: k, fw: W }); return cv; };
            const real = performance.now; performance.now = () => 0; let cOld, cNew; try { cOld = draw(PO); cNew = draw(PE); } finally { performance.now = real; }
            const comp = cv => { const c = document.createElement("canvas"); c.width = W * k; c.height = H * k; const x = c.getContext("2d"), b = document.createElement("canvas"); b.width = W; b.height = H; b.getContext("2d").putImageData(new ImageData(new Uint8ClampedArray(bg), W, H), 0, 0);
              x.imageSmoothingEnabled = false; x.drawImage(b, 0, 0, W * k, H * k); const base = x.getImageData(0, 0, c.width, c.height).data.slice(); x.drawImage(cv, 0, 0); return { c, base, d: x.getImageData(0, 0, c.width, c.height).data }; };
            const measure = (C, kind) => { let ink = 0, px = 0, sky = 0, low = 0; const hz = (SOIL - 24) * k; for (let i = 0, n = 0; i < C.d.length; i += 4, n++) { const dl = Math.abs(lum(C.d[i], C.d[i + 1], C.d[i + 2]) - lum(C.base[i], C.base[i + 1], C.base[i + 2])) / 255;
                if (dl > 0.03) { ink += dl; px++; const y = Math.floor(n / C.c.width); if (y < hz) sky += dl; else low += dl; } } return { ink: +ink.toFixed(1), px, sky: +sky.toFixed(1), low: +low.toFixed(1) }; };
            const A = comp(cOld), B = comp(cNew), kind = spec.rain ? "rain" : "snow";
            out[name] = { kind, count: (spec.rain || spec.snow).density, old: measure(A, kind), new: measure(B, kind), oldPng: A.c.toDataURL(), newPng: B.c.toDataURL() }; }
          return out; }, [OLD_PE, [["rain-overcast", 12, 86, "ocean_archipelago"], ["rain-dunes", 22, 80, "desert_world"], ["snow-frozen-peaks", -14, 72, "frozen_world"], ["snow-ridges", -6, 64, null]]]);
        const rows = Object.entries(ab).map(([k, r]) => [k, r.kind, r.count, r.old.ink, r.new.ink, +(r.new.ink / Math.max(1, r.old.ink)).toFixed(2), r.old.low, r.new.low]);
        check(Object.values(ab).every(r => r.new.ink >= r.old.ink * 1.4 && r.new.low >= r.old.low && r.new.px >= r.old.px), tag(`W1 · ${w}×${h} rain and snow read clearly better than the base at the SAME instant and the SAME particle count (size + contrast only): visible ink ×1.4 or more over overcast sky, dunes, frozen peaks and dark ridges, and more of it against the low horizon`), J(rows));
        if (EVIDENCE) for (const [k, r] of Object.entries(ab)) for (const v of ["old", "new"]) fs.writeFileSync(path.join(EVD, "frames", `${bn}-weather-${w}-${k}-${v === "old" ? "before" : "after"}.png`), Buffer.from(r[v + "Png"].split(",")[1], "base64"));
        P[`weather-${w}`] = Object.fromEntries(rows.map(r => [r[0], { kind: r[1], particles: r[2], inkBefore: r[3], inkAfter: r[4], ratio: r[5] }]));
        if (w === 1440) {
          const cont = await p.evaluate(async () => { const PE = BLOOM.plantEnvironment, sc = PE.region({ planetId: "qa-cont", archetypeId: "ocean_archipelago", regionId: "qa", sky: { temperature: 12, moisture: 86 } }), spec = PE.fx(sc), lay = { W: 100, H: 112, soilY: 77, scale: 3, fw: 84 };
            const a = document.createElement("canvas"), b = document.createElement("canvas"); document.body.append(a, b); const A = PE.mountFx(a), B = PE.mountFx(b); A.set(spec, lay); await new Promise(r => setTimeout(r, 180)); B.set(spec, lay);
            const real = performance.now, T = real.call(performance); performance.now = () => T; try { A.frame(); B.frame(); } finally { performance.now = real; }
            const same = a.toDataURL() === b.toDataURL(); A.dispose(); B.dispose(); a.remove(); b.remove(); return same; });
          // a room switch: the incoming room's weather is drawn on its first frame (never an empty overlay)
          const first = await p.evaluate(async () => { const S = []; const t0 = performance.now(); __T.room().querySelector('.rn[data-go="adapt"]').click();
            await new Promise(res => { const f = () => { const r = __T.room(), fx = r.querySelector(".ps-fx"), st = __T.DR().state(); if (r.dataset.room === "adapt") { const d = fx.getContext("2d").getImageData(0, 0, fx.width, fx.height).data; let n = 0; for (let i = 3; i < d.length; i += 16) if (d[i]) n++; S.push(n); }
              if ((st.transitioning || S.length < 2) && performance.now() - t0 < 3000) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); }); return S; });
          await settled(p);
          check(cont && first.length && first[0] > 0, tag("W2 · weather never restarts on a room switch: two overlays of one scene and layout, started at different times, draw the identical frame at the same moment (the page clock), and the incoming room's weather is already drawn on its first frame"), J({ identical: cont, firstFrameInk: first.slice(0, 3) }));
        }
        await close(p);
      }

      // ============================================================ I · interruption
      if (has("I")) {
        const p = await open(undefined, { w: 1440, h: 900 }); await p.evaluate(() => __T.A().actions.play()); await selectLand(p); await frames(p, 3);
        const ok = s => s.anims === 0 && !s.inline.length && s.n <= 1 && (s.room ? s.layer && s.ex.pvHidden && s.specOk && s.pvInert : !s.layer && !s.pvInert && !s.ex.pvHidden);
        // I1 double-click on the map's Regions tool
        let n0 = await p.evaluate(() => __EV.length); await p.dblclick('.pv-tool[data-tool="region"]'); await settled(p); await frames(p, 3);
        const i1 = await p.evaluate(n => ({ st: __T.settledState(), pp: __EV.slice(n).filter(e => e.type === "play-pause").map(e => e.detail.running) }), n0);
        check(ok(i1.st) && i1.st.room === "region" && J(i1.pp) === "[false]", tag("I1 · a double-click on a map tool opens ONE room (one pause), the second click never reaches an arriving control"), J(i1));
        await p.keyboard.press("Escape"); await settled(p); await frames(p, 3);
        // I2 Escape 100 ms into an opening → back on the map, run restored, focus on the opener
        await p.evaluate(() => __T.A().actions.play()); n0 = await p.evaluate(() => __EV.length);
        await p.click('.pv-tool[data-tool="adapt"]'); await sleep(100); await p.keyboard.press("Escape"); await settled(p); await frames(p, 3);
        const i2 = await p.evaluate(n => ({ st: __T.settledState(), pp: __EV.slice(n).filter(e => e.type === "play-pause").map(e => e.detail.running), sup: __T.DR().state().superseded }), n0);
        check(ok(i2.st) && i2.st.room === null && i2.st.run === true && i2.st.active === "adapt" && J(i2.pp) === "[false,true]", tag("I2 · Escape during an opening: the opening lands, then Back runs — the map, the run running again, focus on the opener, nothing stuck"), J(i2));
        // I3 a second room tab during a switch → the last choice wins; I4 Escape during a switch
        await p.click('.pv-tool[data-tool="region"]'); await settled(p);
        const i3s = await p.evaluate(async () => { const S = []; const t0 = performance.now(); __T.room().querySelector('.rn[data-go="adapt"]').click();
          await new Promise(r => setTimeout(r, 60)); __T.room().querySelector('.rn[data-go="spread"]').click();
          await new Promise(res => { const f = () => { S.push(__T.rooms().length); if (__T.DR().state().transitioning && performance.now() - t0 < 3000) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); }); return S; });
        await settled(p); await frames(p, 3); const i3 = await p.evaluate(() => __T.settledState());
        check(ok(i3) && i3.room === "spread" && i3s.every(n => n === 1) && i3.active === "room:H2", tag("I3 · a room tab pressed while a switch settles: the newer choice wins (Spread), never two rooms, the specimen visible, focus in the room"), J({ st: i3, frames: i3s.length }));
        await p.evaluate(() => __T.room().querySelector('.rn[data-go="terraform"]').click()); await sleep(70); await p.keyboard.press("Escape"); await settled(p); await frames(p, 3);
        const i4 = await p.evaluate(() => __T.settledState());
        check(ok(i4) && i4.room === null && i4.run === true, tag("I4 · Escape during a switch: back on the map, the run restored, no stuck opacity / transform, no blocking layer"), J(i4));
        // I5 a burst of mixed input (tools, room tabs, Back, Escape at 25–90 ms) → the final state is the last action's
        const plan = []; let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
        for (let k = 0; k < 14; k++) plan.push(["tool:region", "tool:adapt", "tool:terraform", "tab:spread", "tab:region", "esc", "back"][Math.floor(rnd() * 7)]);
        const burst = await p.evaluate(async plan => { let expect = null; const t0 = performance.now(); let two = 0;
          const tick = () => { if (__T.rooms().length > 1) two++; if (performance.now() - t0 < 4000) requestAnimationFrame(tick); }; requestAnimationFrame(tick);
          for (const a of plan) { const [k, v] = a.split(":"), inRoom = !!__T.DR().state().room;
            if (k === "tool") { const b = document.querySelector(`.pv-tool[data-tool="${v}"]`); if (!inRoom && !__T.DR().state().transitioning) { b.click(); expect = v; } }
            else if (k === "tab") { const b = __T.room() && __T.room().querySelector(`.rn[data-go="${v}"]`); if (b && __T.DR().state().transitionKind !== "open" && __T.DR().state().transitionKind !== "back") { b.click(); if (__T.DR().state().room) expect = v; } }
            else if (k === "esc") { document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); expect = null; }
            else if (k === "back") { const b = __T.room() && __T.room().querySelector(".rb.back"); if (b && getComputedStyle(b).pointerEvents !== "none") { b.click(); expect = null; } }
            await new Promise(r => setTimeout(r, 25 + Math.floor(Math.random() * 65))); }
          await new Promise(r => setTimeout(r, 1200)); return { expect, two }; }, plan);
        await settled(p); await frames(p, 3); const i5 = await p.evaluate(() => __T.settledState());
        check(ok(i5) && i5.room === burst.expect && burst.two === 0, tag("I5 · a burst of 14 mixed inputs (tools, room tabs, Back, Escape, 25–90 ms apart): the final route is the last valid action, never two rooms, nothing stuck"), J({ plan, expect: burst.expect, room: i5.room, two: burst.two, superseded: await p.evaluate(() => __T.DR().state().superseded) }));
        check(!p.errs.length, tag("I6 · no console error under interruption"), p.errs.slice(0, 2).join(" | "));
        await close(p);
      }

      // ============================================================ A · accessibility / focus
      if (has("A")) {
        const p = await open(undefined, { w: 1440, h: 900 }); await selectLand(p); await frames(p, 3);
        await p.focus('.pv-banner [data-go="region"]');
        const S = await p.evaluate(() => __T.sample(() => document.activeElement.click())); await settled(p); await frames(p, 3);
        const fOpen = await p.evaluate(() => ({ st: __T.settledState(), id: document.activeElement.id || document.activeElement.tagName }));
        const exposedOnce = S.every(s => (s.n === 1) === s.ex.pvHidden && s.n <= 1);
        // keyboard: the room tabs (Tab to the nav, Enter), then Back by keyboard
        await p.focus('.dr .dr-room:not([hidden]) .rn[data-go="spread"]'); await p.keyboard.press("Enter"); await settled(p); await frames(p, 2);
        const k1 = await p.evaluate(() => ({ room: __T.DR().state().room, focus: document.activeElement.closest(".dr-room") ? document.activeElement.closest(".dr-room").dataset.room : null }));
        const C = await p.evaluate(() => __T.sample(() => { document.querySelector(".dr .dr-room:not([hidden]) .rb.back").focus(); document.activeElement.click(); }, { min: 0 }));
        await settled(p); await frames(p, 2);
        const closeInert = await p.evaluate(() => __T.DR().timeline().slice(-1)[0].kind), cExposed = C.every(s => s.n <= 1 && (s.n === 1) === s.ex.pvHidden);
        const fBack = await p.evaluate(() => ({ st: __T.settledState(), focus: document.activeElement.dataset.go || document.activeElement.dataset.tool || null, inBanner: !!document.activeElement.closest(".pv-banner") }));
        const leavingInert = await p.evaluate(async () => { __T.PV().openRoom("adapt", {}); await new Promise(r => { const f = () => (__T.DR().state().transitioning ? requestAnimationFrame(f) : r()); requestAnimationFrame(f); });
          __T.DR().close(false); const sec = __T.room(), inert = sec.inert, focusable = sec.contains(document.activeElement); await new Promise(r => { const f = () => (__T.DR().state().transitioning ? requestAnimationFrame(f) : r()); requestAnimationFrame(f); }); return { inert, focusable }; });
        check(exposedOnce && cExposed && fOpen.st.active === "room:H2" && k1.room === "spread" && k1.focus === "spread" && fBack.st.room === null && fBack.inBanner && leavingInert.inert,
          tag("A1 · one layer exposed at a time on every frame (the Planet View aria-hidden + inert exactly while a room shows); focus lands on the room title after the motion, a room tab by keyboard focuses the new room, Back by keyboard returns focus to the opener (the banner's button); the leaving room is inert"),
          J({ exposedOnce, cExposed, open: fOpen.st.active, tab: k1, back: [fBack.focus, fBack.inBanner], leavingInert }));
        if (AXE) {
          await p.addScriptTag({ content: AXE }); const res = {};
          for (const r of [null, "region", "adapt", "spread", "terraform"]) {
            if (r) { await p.evaluate(r => __T.DR().state().room ? __T.room().querySelector(`.rn[data-go="${r}"]`).click() : __T.PV().openRoom(r, {}), r); await settled(p); await frames(p, 3); }
            const v = await p.evaluate(async () => { const out = await axe.run(document, { resultTypes: ["violations"] }); return out.violations.filter(x => x.impact === "critical" || x.impact === "serious").map(x => `${x.id}:${x.nodes.length}:${x.nodes.map(n => n.target.join(" ")).join(",")}`); });
            res[r || "map"] = v; }
          check(Object.values(res).every(v => !v.length), tag("A2 · axe-core: 0 critical / 0 serious on the map and the four rooms after Edge Assemble"), J(res));
        } else info(tag("A2 · axe"), "skipped (set AXE=<axe.min.js>)");
        await close(p);
      }

      // ============================================================ P · performance
      if (has("P")) {
        const p = await open(undefined, { w: 1440, h: 900 }); await selectLand(p); await frames(p, 3);
        const run = async fn => { await p.evaluate(() => { window.__LT && (window.__LT.length = 0); }); const S = await p.evaluate(fn); await settled(p); await frames(p, 2);
          const lt = await p.evaluate(() => window.__LT ? window.__LT.slice() : null); const afterSwap = S.filter(s => s.tr); return { puts: afterSwap.length > 1 ? afterSwap[afterSwap.length - 1].put - afterSwap[1].put : 0, lt }; };
        const kf = await p.evaluate(async () => { const props = new Set(); __T.PV().openRoom("region", {}); await new Promise(r => requestAnimationFrame(r)); const pvParts = [".pv-hud", ".pv-stage", ".pv-foot"].map(q => document.querySelector(q));
          for (const a of document.getAnimations().filter(a => a.effect && a.effect.target && (a.effect.target.closest(".dr") || pvParts.includes(a.effect.target)))) for (const k of a.effect.getKeyframes()) for (const q of Object.keys(k)) if (!["offset", "computedOffset", "easing", "composite"].includes(q)) props.add(q + (q === "filter" ? (a.effect.target.closest(".pv") && !a.effect.target.closest(".dr") ? "@map" : "@room") : ""));
          return [...props]; }); await settled(p); await p.evaluate(() => __T.DR().close(false)); await settled(p);
        const o = await run(() => __T.sample(() => __T.PV().openRoom("region", {}))), s = await run(() => __T.sample(() => __T.room().querySelector('.rn[data-go="adapt"]').click())), c = await run(() => __T.sample(() => __T.DR().close(false), { min: 0 }));
        const lts = [o, s, c].map(x => x.lt), longs = lts.flat().filter(x => typeof x === "number" && x > 200);
        check(kf.every(q => ["transform", "opacity", "filter@map"].includes(q)) && o.puts === 0 && c.puts === 0 && !longs.length,
          tag("P1 · lightweight motion: keyframes are transform / opacity (the map's blur fade the only filter), the specimen is never repainted while the containers move (0 putImageData during the opening / closing motion), no long task over 200 ms"),
          J({ keyframes: kf, puts: [o.puts, s.puts, c.puts], longTasks: lts }));
        await close(p);
      }

      // ============================================================ T · Training's specimen = the production art path
      if (has("T") && bn !== "webkit") {
        const c = await browser.newContext({ viewport: { width: 1440, height: 900 } }); await c.addInitScript(() => { try { localStorage.setItem("strange-bloom.training", JSON.stringify({ v: 1, status: "completed", at: 1 })); } catch { /* blocked */ } });
        const p = await c.newPage(); p.errs = []; p.on("pageerror", e => p.errs.push(e.message)); const urls = []; p.on("request", r => urls.push(r.url()));
        await p.goto(HOME); await p.waitForFunction(() => window.MENU_DEV && MENU_DEV.ready && MENU_DEV.entry.state === "menu", null, { timeout: 60000, polling: 50 });
        await p.click('.mm-item[data-act="training"]');
        await p.waitForFunction(() => window.BLOOM_APP && BLOOM_APP.session && BLOOM_APP.session.run.training && window.BLOOM_TRAINING_UI && BLOOM_TRAINING_UI.stats.liftedAt && !BLOOM_APP.busy && BLOOM.decisionRooms && BLOOM.decisionRooms.instance, null, { timeout: 60000, polling: 50 });
        await p.evaluate(H); await sleep(400);
        await p.evaluate(() => __T.PV().openRoom("adapt", {})); await settled(p); await frames(p, 4);
        const t = await p.evaluate(() => { const s = __T.specOf(), st = s.state, room = __T.room();
          const ref = BLOOM.plantSpecimen.draw(st, { species: BLOOM_RUN_UI.adapter.run().species }), cr = s.canvas.getBoundingClientRect();
          const anchors = s.anchors().filter(a => a.client), inside = anchors.every(a => a.client.x >= cr.left && a.client.x <= cr.right && a.client.y >= cr.top && a.client.y <= cr.bottom);
          return { pack: s.pack, plan: s.plan, species: s.species, org: s.organismSignature(), refOrg: ref.organismSig, sig: s.signature(), refSig: ref.sig, svg: !!room.querySelector(".lf-top svg"), legacy: !!BLOOM.legacyPlantSpecimen,
            plates: room.querySelectorAll(".dr-leaders .aplate").length, inside, anchors: anchors.length, renderer: BLOOM.plantSpecimen.renderer, state: { traits: st.traits, colony: st.colony, condition: st.condition, focus: st.focus, local: st.local } }; });
        const legacyLoaded = urls.some(u => /legacy-svg-specimen|plant-sprite-lab/.test(u));
        // the same state drawn in Node by the canonical pipeline (plant-specimen.js draw, the generated atlas): byte-identical organism pixels
        const NB = (() => { const g = {}; for (const f of ["resources/plant-visual/generated/plant-atlas.js", "resources/plant-visual/plant-visual-model.js", "resources/plant-visual/plant-components.js", "resources/plant-visual/plant-compositor.js", "resources/plant-visual/plant-fx.js",
          "resources/plant-visual/grammars/oh-stem.js", "resources/plant-visual/grammars/rosette.js", "resources/plant-visual/grammars/candle.js", "resources/plant-visual/grammars/reed.js", "resources/plant-visual/plant-environment.js", "resources/run-ui/plant-specimen.js"])
          new Function("window", fs.readFileSync(path.join(ROOT, f), "utf8"))(g); return g.BLOOM; })();
        const nd = NB.plantSpecimen.draw({ ...t.state, preview: null, names: {}, viable: true }, {});
        check(t.pack === "organic-hybrid" && t.plan === "oh-stem@1" && t.renderer === "organic-hybrid-sprite" && t.org === t.refOrg && t.sig === t.refSig && nd.organismSig === t.org && !t.svg && !t.legacy && !legacyLoaded,
          tag("T1 · Training's specimen is the canonical production Organic Hybrid path: pack organic-hybrid · body plan oh-stem@1 · the sprite compositor; its organism pixels = BLOOM.plantSpecimen.draw of the same state in the page AND in Node (the generated atlas); no retired SVG specimen, no lab file loaded"),
          J({ pack: t.pack, plan: t.plan, org: [t.org, t.refOrg, nd.organismSig], svg: t.svg, legacyLoaded }));
        check(t.plates === 4 && t.inside && t.anchors === 7, tag("T2 · the Adapt anatomy callouts (four plates: pigment · leaf shape · stem · roots) stay where they were, anchored on the REAL specimen (every anatomy anchor inside its canvas)"), J({ plates: t.plates, anchors: t.anchors, inside: t.inside }));
        if (EVIDENCE) { await p.locator(".dr .dr-room:not([hidden]) .lf-top").screenshot({ path: path.join(EVD, "frames", `${bn}-training-adapt-specimen.png`) }).catch(() => {}); }
        P.training = { org: t.org, state: t.state };
        // T4 · (PMO correction) the anatomy lessons show Chill Hollow's Adapt specimen in FULL; another lesson keeps the no-colony ghost; no colony is made
        await p.keyboard.press("Escape"); await settled(p);
        const anat = [];
        for (const [i, id] of [[2, "biomass"], [4, "limiting-factor"], [5, "adapt-buy"], [6, "spread"]]) {
          const r = await p.evaluate(async ([i]) => { const d = BLOOM_TRAINING_UI.guide.director; d._enter(i); d.evaluate("qa"); const A = BLOOM_RUN_UI.adapter, chill = A.regions().find(r => r.id === "chill_hollow");
            __T.PV().openRoom("adapt", { region: chill.index }); await new Promise(r => { const f = () => (__T.DR().state().transitioning || __T.DR().state().motion ? requestAnimationFrame(f) : r()); requestAnimationFrame(f); });
            const sp = __T.specOf(), S = sp.state, ref = BLOOM.plantSpecimen.draw({ traits: S.traits, names: {}, preview: null, colony: { living: true, establishment: 0, word: "" }, focus: "balanced", local: null, condition: "ok", viable: true }, { species: A.run().species });
            const out = { lesson: d.current.id, active: !!(__T.DR().state().presentation && __T.DR().state().presentation.active), org: sp.organismSignature(), canonical: ref.organismSig, living: A.region(chill.index).living,
              caption: __T.room().querySelector(".spec-cap").textContent, label: sp.canvas.getAttribute("aria-label") };
            __T.DR().close(false); await new Promise(r => { const f = () => (__T.DR().state().transitioning || __T.DR().state().motion ? requestAnimationFrame(f) : r()); requestAnimationFrame(f); }); return out; }, [i]);
          anat.push(r); if (EVIDENCE && bn === "chromium" && (id === "biomass" || id === "limiting-factor")) { /* the stills come from the evidence driver */ } }
        if (AXE) {   // axe on the anatomy instructional state itself (lesson 5, the Adapt room on Chill Hollow, the full specimen)
          await p.evaluate(async () => { const d = BLOOM_TRAINING_UI.guide.director; d._enter(4); d.evaluate("qa"); __T.PV().openRoom("adapt", { region: BLOOM_RUN_UI.adapter.regions().find(r => r.id === "chill_hollow").index }); });
          await settled(p); await frames(p, 3); await p.addScriptTag({ content: AXE });
          const v = await p.evaluate(async () => (await axe.run(document, { resultTypes: ["violations"] })).violations.filter(x => x.impact === "critical" || x.impact === "serious").map(x => `${x.id}:${x.nodes.map(n => n.target.join(" ")).join(",")}`));
          const active = await p.evaluate(() => !!(__T.DR().state().presentation && __T.DR().state().presentation.active));
          check(active && !v.length, tag("T5 · axe-core on the Training anatomy state (the Adapt room, full specimen, the coach): 0 critical / 0 serious"), J({ active, v }));
          await p.keyboard.press("Escape"); await settled(p); }
        const [b0, l4, l5, s6] = anat, full = x => x.active && x.org === x.canonical && x.living === 0 && /No colony yet/.test(x.caption);
        check(!b0.active && b0.org !== b0.canonical && full(l4) && full(l5) && l4.org === l5.org && !s6.active && s6.org === b0.org && /shown in full/.test(l4.label),
          tag("T4 · (PMO) the anatomy lessons (limiting-factor, adapt-buy) show Chill Hollow's Adapt specimen as the FULL canonical organism (= the production draw for the same adaptation state; no ghost dither), the same in both; the Biomass and Spread lessons keep the ordinary no-colony ghost; no colony is created and the caption still says No colony yet"),
          J(anat.map(x => [x.lesson, x.active, x.org, x.living]))); 
        check(!p.errs.length, tag("T3 · Training: no page error"), p.errs.slice(0, 2).join(" | ")); await c.close();
      }

      // ============================================================ X · (PMO correction) the Bloom / Extinction report: a quiet crossfade, no mist
      if (has("X")) {
        const XH = `(() => { window.__atx = 0; new MutationObserver(m => { for (const r of m) for (const n of r.addedNodes) if (n.nodeType === 1 && n.classList && n.classList.contains("atx")) window.__atx++; }).observe(document.body, { childList: true, subtree: true });
          window.__X = { RR: () => BLOOM.runReport.instance, runs: () => { const T = BLOOM.decisionRooms.instance.transition; return T ? T.runs : 0; },
            async sample(fn) { const out = [], t0 = performance.now(), RR = BLOOM.runReport.instance, layer = RR.el; await fn();
              await new Promise(res => { const f = () => { out.push({ t: Math.round(performance.now() - t0), op: +getComputedStyle(layer).opacity, hidden: layer.hidden, tf: getComputedStyle(layer.querySelector(".rr-card")).transform, busy: RR.state().busy });
                if ((RR.state().busy || performance.now() - t0 < 80) && performance.now() - t0 < 4000) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); }); return out; },
            after: () => { const RR = BLOOM.runReport.instance, st = RR.state(), layer = RR.el, stage = document.querySelector(".pv-stage");
              return { open: st.open, kind: st.kind, shown: st.shown, busy: st.busy, actions: st.actions, rr: document.querySelectorAll(".rr").length, op: +getComputedStyle(layer).opacity, hidden: layer.hidden, anims: document.getAnimations().filter(a => a.playState === "running").filter(a => a.effect && (a.effect.target === layer || [".pv-hud", ".pv-stage", ".pv-foot"].some(q => a.effect.target === document.querySelector(q)))).length,
                pvInert: stage.inert, mapFilter: getComputedStyle(stage).filter, focusIn: !!(document.activeElement && document.activeElement.closest(".rr")), heading: (layer.querySelector("h2") || {}).textContent || "", atx: window.__atx, runs: __X.runs(), running: BLOOM_RUN_UI.adapter.run().running, e: RR.timeline().slice(-1)[0] }; } };
          return true; })()`;
        const reportOpen = p => p.waitForFunction(() => BLOOM.runReport.instance.state().open && !BLOOM.runReport.instance.state().busy, null, { timeout: 30000, polling: 30 });
        const fadeOk = (S, dir) => { const mid = S.filter(x => !x.hidden && x.op > 0.02 && x.op < 0.98), mono = S.every((x, k) => k === 0 || x.hidden || S[k - 1].hidden || (dir > 0 ? x.op >= S[k - 1].op - 0.01 : x.op <= S[k - 1].op + 0.01));
          return { mid: mid.length, mono, notf: S.every(x => x.tf === "none") }; };
        const WIN = "() => { const s = BLOOM_API.sim; BLOOM_API.advance(30); s.won = true; s.onWin(s.coverage()); }";
        const CASES = [["Expedition Bloom", "?play=1&archetype=ocean_archipelago&seed=28", "win"], ["Dying World Extinction", "?play=1&archetype=frozen_world&seed=9&scenario=dying_world", "loss"],
          ["Dying World Bloom", "?play=1&archetype=ocean_archipelago&seed=13&scenario=dying_world", "win"], ["Native Competition Bloom", "?play=1&archetype=desert_world&seed=17&scenario=native_competition", "win"]];
        for (const [label, q, kind] of CASES) for (const rm of label === "Expedition Bloom" ? [false, true] : [false]) {
          const p = await open(q, { w: 1440, h: 900, rm }); await p.evaluate(XH); const n0 = await p.evaluate(() => __X.runs());
          // rapid input WHILE it opens (30 ms in): Escape ×2, a premature Keep playing and a second open() never dismiss or double it; Escape once it stands
          const S = await p.evaluate(async ([kind, WIN]) => __X.sample(async () => { if (kind === "win") (0, eval)(WIN)(); else BLOOM_API.advance(3000);
            setTimeout(() => { const esc = () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); esc(); esc(); window.__early = { busy: BLOOM.runReport.instance.state().busy, keep: BLOOM.runReport.instance.keepPlaying(), reopen: BLOOM.runReport.instance.open() }; }, 30); }), [kind, WIN]);
          await reportOpen(p); await frames(p, 3); await p.keyboard.press("Escape"); await frames(p, 2); const early = await p.evaluate(() => window.__early);
          const A1 = await p.evaluate(() => __X.after()), f1 = fadeOk(S, 1);
          const okOpen = early && early.busy && early.keep === false && early.reopen === false && A1.open && A1.kind === kind && A1.shown === 1 && A1.rr === 1 && A1.op === 1 && !A1.hidden && A1.anims === 0 && A1.pvInert && A1.focusIn && A1.atx === 0 && A1.runs === n0 && A1.e.motion === "crossfade" && f1.notf
            && (rm ? A1.e.reducedMotion === true && A1.e.tEnd - A1.e.tStart <= 450 : f1.mid >= 1 && f1.mono && A1.e.tEnd - A1.e.tStart >= 250 && A1.e.tEnd - A1.e.tStart <= 1100);
          check(okOpen, tag(`X1 · ${label}${rm ? " (reduced motion)" : ""}: the ${kind === "win" ? "Bloom" : "Extinction"} report opens with a quiet crossfade (opacity only, no card transform; ${rm ? "a very short fade" : "≈ 340 ms"}), never the mist / cloud page transition (no .atx overlay, the bridge never runs); Escape and a premature Keep playing cannot dismiss or double it: ONE report, opacity 1, the map dimmed and inert, focus in the dialog`),
            J({ early, fade: f1, ms: Math.round(A1.e.tEnd - A1.e.tStart), atx: A1.atx, runs: [n0, A1.runs], shown: A1.shown, rr: A1.rr, actions: A1.actions, heading: A1.heading.slice(0, 30) }));
          if (AXE && !rm && (label === "Expedition Bloom" || label === "Dying World Extinction")) { await p.addScriptTag({ content: AXE });
            const v = await p.evaluate(async () => (await axe.run(document, { resultTypes: ["violations"] })).violations.filter(x => x.impact === "critical" || x.impact === "serious").map(x => `${x.id}:${x.nodes.map(n => n.target.join(" ")).join(",")}`));
            check(!v.length, tag(`X2 · axe-core on the ${label} report: 0 critical / 0 serious`), J(v)); }
          if (kind === "win") {   // Keep playing: the crossfade reversed (two quick clicks = one close), then the run runs again
            const S2 = await p.evaluate(() => __X.sample(() => { const b = document.getElementById("rrContinue"); b.click(); b.click(); })); await frames(p, 3);
            const A2 = await p.evaluate(() => __X.after()), f2 = fadeOk(S2, -1);
            check(!A2.open && A2.hidden && A2.shown === 1 && A2.anims === 0 && !A2.pvInert && A2.mapFilter === "none" && A2.running && A2.atx === 0 && A2.runs === n0 && A2.e.kind === "report-close" && A2.e.motion === "crossfade" && (rm || (f2.mid >= 1 && f2.mono)),
              tag(`X3 · ${label}${rm ? " (reduced motion)" : ""}: Keep playing fades the report out (the reversed crossfade; a double click closes once), restores the map (no stuck opacity / filter, not inert) and only then resumes the run`),
              J({ fade: f2, ms: Math.round(A2.e.tEnd - A2.e.tStart), running: A2.running, mapFilter: A2.mapFilter })); }
          else {   // an extinction: the report's own way out (the player run's actions: Play again · New world · Change planet · Home) — Home leaves the run
            const acts = A1.actions; await p.evaluate(() => { window.__left = false; addEventListener("pagehide", () => { window.__left = true; }); });
            p.once("dialog", d => d.accept().catch(() => {})); const nav = p.waitForNavigation({ timeout: 15000 }).then(() => true).catch(() => false);
            const out = acts.includes("mainMenu") ? "mainMenu" : "home"; await p.click(`.rr [data-act="${out}"]`).catch(() => {}); const left = await nav;
            check(acts.includes(out) && !acts.includes("keepPlaying") && left, tag(`X3 · ${label}: no Keep playing on a loss; the report's ${out === "home" ? "Home" : "Main Menu"} action leaves the run`), J({ acts, left })); }
          check(!p.errs.length, tag(`X4 · ${label}${rm ? " (reduced)" : ""}: no console error`), p.errs.slice(0, 2).join(" | ")); await close(p);
        }
        // Thin Air through the production Challenge flow: its report (Challenge actions) crossfades too; the Challenges action returns to the hub
        if (bn !== "webkit" || true) {
          const c = await browser.newContext({ viewport: { width: 1440, height: 900 } }); await c.addInitScript(() => { try { localStorage.setItem("strange-bloom.training", JSON.stringify({ v: 1, status: "completed", at: 1 })); } catch { /* blocked */ } });
          const p = await c.newPage(); p.errs = []; p.on("pageerror", e => p.errs.push(e.message)); p.on("console", m => { if (m.type() === "error") p.errs.push(m.text()); }); p.on("dialog", d => d.accept().catch(() => {}));
          await p.goto(HOME + "?launch=7&bg=7"); await p.waitForFunction(() => window.MENU_DEV && MENU_DEV.ready && MENU_DEV.entry.state === "menu", null, { timeout: 60000, polling: 50 });
          await p.click('.mm-item[data-act="challenges"]'); await p.waitForFunction(() => { const e = MENU_DEV.entry, v = e.challengeView; return e.state === "challenges" && v && v.inner && e.black.style.display === "none"; }, null, { timeout: 60000, polling: 50 });
          await p.evaluate(() => MENU_DEV.entry.challengeView.inner.select("thin_air")); await p.click(".ch-btn.go");
          await p.waitForFunction(() => { const e = MENU_DEV.entry, v = e.worldView; return e.state === "challenge-world" && v && v.inner && v.inner.state === "ready" && e.black.style.display === "none"; }, null, { timeout: 120000, polling: 50 });
          await p.click(".cw-btn.go"); await p.waitForFunction(() => window.BLOOM_APP && BLOOM_APP.session && !BLOOM_APP.busy && !document.querySelector(".atx") && BLOOM.runReport && BLOOM.runReport.instance && BLOOM.decisionRooms.instance, null, { timeout: 120000, polling: 50 });
          await p.evaluate(XH); await sleep(300); const n0 = await p.evaluate(() => __X.runs());
          const S = await p.evaluate(WIN => __X.sample(() => (0, eval)(WIN)()), WIN); await reportOpen(p); await frames(p, 3);
          const A1 = await p.evaluate(() => __X.after()), f1 = fadeOk(S, 1);
          await p.click('.rr [data-act="challenges"]').catch(() => {});
          const hub = await p.waitForFunction(() => window.MENU_DEV && MENU_DEV.entry.state === "challenges" && !(window.BLOOM_APP && BLOOM_APP.session), null, { timeout: 30000, polling: 50 }).then(() => true).catch(() => false);
          check(A1.open && A1.kind === "win" && A1.shown === 1 && A1.rr === 1 && A1.op === 1 && A1.atx === 0 && A1.runs === n0 && A1.e.motion === "crossfade" && f1.mid >= 1 && f1.notf && A1.actions.includes("challenges") && A1.actions.includes("mainMenu") && hub && !p.errs.length,
            tag("X5 · Thin Air (the production Challenge flow): its report opens with the crossfade (no mist), carries the Challenge actions, and Challenges returns to the hub; no console error"),
            J({ fade: f1, ms: Math.round(A1.e.tEnd - A1.e.tStart), actions: A1.actions, hub, errs: p.errs.slice(0, 2) }));
          await c.close();
        }
      }
    } catch (err) { check(false, tag("the browser checks ran to completion"), (err && err.stack || String(err)).split("\n").slice(0, 3).join(" | ")); }
    await browser.close();
  }
  server.close(); finish();
})().catch(e => { console.error(e); process.exit(1); });

function finish() {
  if (EVIDENCE) { fs.mkdirSync(EVD, { recursive: true }); fs.writeFileSync(path.join(EVD, "transition-proof.json"), J(PROOF, null, 1) + "\n"); }
  console.log(`\n${fails ? `${fails} check(s) FAILED` : `all ${passes} checks passed`}  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  process.exit(fails ? 1 : 0);
}
