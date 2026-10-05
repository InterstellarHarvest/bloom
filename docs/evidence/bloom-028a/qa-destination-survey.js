// BLOOM-028A — Destination Survey Foundation QA (structural + behavioural; no exact-pixel GPU assertions).
//
//   NODE_PATH="$(npm root -g)" node docs/evidence/bloom-028a/qa-destination-survey.js [--shots] [--no-firefox] [--no-gpu] [--no-sphere-qa] [--port 8769]
//
// Part N (Node): isolation from 027D (15c301d) — only new 028A files; the sphere component, generator, simulation, content,
//   First Bloom, game shell and run page byte-identical; the survey data suite; menu-code hygiene (stock component API only,
//   ONE PlanetSphereRenderer); the 027D sphere QA re-run on this branch (T18).
// Part B (Chromium, demos/destination-survey.html): T1–T17 of the brief — one shared renderer, nine views, independent state,
//   context warnings, SCAN NEW SECTOR (replacement + staged sweep), reduced motion (forced and via the OS media query), every
//   grid position → focus, yaw / box continuity through grid → focus → grid, drag in focus (horizontal spins, vertical
//   ignored), RETURN TO SURVEY, repeated cycles (leaks), resize, Begin Expedition hook, keyboard.
// Firefox smoke; WebKit availability; GPU frame timing (report only); First Bloom seam evidence (report only; no fix).
// --shots writes the evidence screenshots next to this file. Results → qa-results.json. Exit 1 on any failure.
"use strict";
const path = require("path"), fs = require("fs"), { spawn, spawnSync, execSync } = require("child_process"), http = require("http");
const ROOT = path.resolve(__dirname, "../../.."), OUT = __dirname;
const argv = process.argv.slice(2), SHOTS = argv.includes("--shots"), FIREFOX = !argv.includes("--no-firefox"), GPU = !argv.includes("--no-gpu"), SPHERE_QA = !argv.includes("--no-sphere-qa");
const PORT = +(argv[argv.indexOf("--port") + 1] || 0) || 8769;
const BASE = "15c301d"; // BLOOM-027D — PlanetSphereView productionized
const HOST = `http://127.0.0.1:${PORT}`, PAGE = `${HOST}/demos/destination-survey.html`;
const results = []; let fails = 0;
const J = o => JSON.stringify(o);
const check = (ok, name, detail = "") => { results.push({ ok: !!ok, name, detail: String(detail) }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); if (!ok) fails++; };
const info = (name, detail) => { results.push({ ok: true, info: true, name, detail: typeof detail === "string" ? detail : J(detail) }); console.log(`INFO  ${name}  — ${typeof detail === "string" ? detail : J(detail)}`); };
const ALLOWED_NEW = [/^resources\/destination-survey\//, /^demos\/destination-survey\.html$/, /^tools\/destination-survey-check\.js$/, /^docs\/DESTINATION_SURVEY_v1\.md$/, /^docs\/evidence\/bloom-028a\//];

// Installed before any page script: live listeners, ResizeObservers, WebGL contexts, context-limit warnings (027D QA, same accounting)
const INIT = () => {
  const L = window.__LEAK = { listeners: 0, observers: 0, glCreated: 0, contextWarnings: 0, warnings: [] }, fid = new WeakMap(); let nid = 0;
  const reg = new WeakMap(), keyOf = (type, fn, o) => { if (!fid.has(fn)) fid.set(fn, ++nid); return `${type}|${fid.get(fn)}|${o === true || !!(o && o.capture)}`; };
  const oa = EventTarget.prototype.addEventListener, or = EventTarget.prototype.removeEventListener;
  EventTarget.prototype.addEventListener = function (type, fn, o) { if (fn) { let s = reg.get(this); if (!s) reg.set(this, s = new Set()); const k = keyOf(type, fn, o); if (!s.has(k)) { s.add(k); L.listeners++; } } return oa.call(this, type, fn, o); };
  EventTarget.prototype.removeEventListener = function (type, fn, o) { if (fn) { const s = reg.get(this), k = keyOf(type, fn, o); if (s && s.delete(k)) L.listeners--; } return or.call(this, type, fn, o); };
  const RO = window.ResizeObserver;
  window.ResizeObserver = class extends RO { constructor(cb) { super(cb); this.__t = new Set(); }
    observe(t, o) { if (!this.__t.has(t)) { this.__t.add(t); L.observers++; } return super.observe(t, o); }
    unobserve(t) { if (this.__t.delete(t)) L.observers--; return super.unobserve(t); }
    disconnect() { L.observers -= this.__t.size; this.__t.clear(); return super.disconnect(); } };
  const gls = []; const og = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, a) { const had = this.__gl; const c = og.call(this, type, a);
    if (c && /webgl/.test(type) && !had) { this.__gl = true; L.glCreated++; gls.push(new WeakRef(c)); } return c; };
  L.liveGL = () => gls.filter(r => { const c = r.deref(); return c && !c.isContextLost(); }).length;
  const ow = console.warn; console.warn = function (...a) { const s = String(a[0]); if (/too many active webgl contexts/i.test(s)) L.contextWarnings++; L.warnings.push(s.slice(0, 160)); return ow.apply(this, a); };
  window.__longTasks = [];
  try { new PerformanceObserver(l => { for (const e of l.getEntries()) window.__longTasks.push({ t: e.startTime, d: e.duration }); }).observe({ type: "longtask", buffered: true }); } catch { /* not supported (Firefox) */ }
};

// in-page helpers (installed after load)
const HELPERS = () => {
  const S = () => SURVEY_DEV.survey;
  window.__rc = i => [Math.floor(i / 3), i % 3];
  window.__settle = (st = "survey") => new Promise(res => { const f = () => (S().state === st && !document.getAnimations().some(a => a.playState === "running")) ? res(true) : requestAnimationFrame(f); f(); });
  window.__frames = n => new Promise(res => { let k = 0; const f = () => (++k >= n ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); });
  // per-frame samples of one view: yaw, its container's on-screen box, its parent, its texture uploads
  window.__sample = (i, ms) => new Promise(res => { const out = [], v = S().views[i], g = S().globes[i], t0 = performance.now();
    const f = () => { const r = g.getBoundingClientRect(); out.push({ t: performance.now() - t0, yaw: v.getYaw(), w: r.width, x: r.left + r.width / 2, y: r.top + r.height / 2,
      parent: g.parentElement.className, up: v.textureUploads, view: S().views[i] === v && v.container === g, box: v._box && v._box.visible });
      performance.now() - t0 < ms ? requestAnimationFrame(f) : res(out); }; requestAnimationFrame(f); });
  // per frame: does the travelling globe's disc overlap another globe's disc that is still > 15% of its full size? (one shared
  // depth buffer: overlapping globes would intersect by depth, so the choreography must keep them apart)
  window.__overlaps = (i, ms) => new Promise(res => { const s = S(), out = [], t0 = performance.now();
    const disc = g => { const r = g.getBoundingClientRect(); return r.width ? { x: r.left + r.width / 2, y: r.top + r.height / 2, r: r.width * 0.46, k: r.width / g.offsetWidth } : null; };
    const f = () => { const a = disc(s.globes[i]); let worst = 0;
      s.globes.forEach((g, j) => { if (j === i) return; const b = disc(g); if (!a || !b || b.k <= 0.15) return; const d = Math.hypot(a.x - b.x, a.y - b.y); if (d < a.r + b.r) worst = Math.max(worst, (a.r + b.r - d) / b.r); });
      out.push(worst); performance.now() - t0 < ms ? requestAnimationFrame(f) : res({ frames: out.length, overlapping: out.filter(w => w > 0.02).length, worst: Math.max(...out) }); }; requestAnimationFrame(f); });
  // GL alpha at the centre / corner of each view's box (shared canvas is transparent outside the globes)
  window.__pixels = () => { const s = S(), R = s.host; R.render(); const gl = R.three.getContext(), dpr = R.three.getPixelRatio(), H = gl.drawingBufferHeight, px = new Uint8Array(4);
    const at = (x, y) => { gl.readPixels(Math.round(x * dpr), Math.round(H - y * dpr), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); return px[3]; };
    return s.views.map(v => { const b = v._box; return b && b.visible ? { centre: at(b.x + b.w / 2, b.y + b.h / 2), corner: at(b.x + 2, b.y + 2) } : null; }); };
  // the view's drawing box vs its container's rectangle in stage coordinates
  window.__boxes = () => { const s = S(), st = s.root.getBoundingClientRect(); return s.views.map(v => { const r = v.container.getBoundingClientRect(), b = v._box;
    return { visible: !!(b && b.visible), dx: b ? Math.abs(b.x - (r.left - st.left)) + Math.abs(b.y - (r.top - st.top)) : null, dw: b ? Math.abs(b.w - r.width) + Math.abs(b.h - r.height) : null, w: r.width }; }); };
  window.__frameStats = (n = 120) => new Promise(res => { const R = S().host, r0 = R.renders, t = []; let last = performance.now();
    const f = now => { t.push(now - last); last = now; t.length < n ? requestAnimationFrame(f) : done(); }; requestAnimationFrame(f);
    const done = () => { t.shift(); const s = t.slice().sort((a, b) => a - b); const g = R.three.getContext(), x = g.getExtension("WEBGL_debug_renderer_info");
      res({ meanFrameMs: +(t.reduce((a, b) => a + b, 0) / t.length).toFixed(2), p95FrameMs: +s[Math.floor(s.length * .95)].toFixed(2), maxFrameMs: +s[s.length - 1].toFixed(1),
        drawn: R.renders - r0, frames: t.length, gl: x ? g.getParameter(x.UNMASKED_RENDERER_WEBGL) : g.getParameter(g.RENDERER) }); }; });
};

(async () => {
  // ================================================================ Part N — Node
  const git = c => execSync(`git ${c}`, { cwd: ROOT }).toString();
  { const changed = [...new Set([...git(`diff --name-only ${BASE}`).split("\n"), ...git("ls-files --others --exclude-standard").split("\n")].filter(Boolean))];
    const modified = git(`diff --name-only --diff-filter=MDR ${BASE}`).split("\n").filter(Boolean);
    const stray = changed.filter(f => !ALLOWED_NEW.some(r => r.test(f)));
    check(!stray.length && !modified.length, `N1 only NEW 028A files since ${BASE} (resources/destination-survey/, demos/destination-survey.html, tools/destination-survey-check.js, docs/DESTINATION_SURVEY_v1.md, this evidence); no existing file modified or deleted`,
      stray.length || modified.length ? `stray ${stray.join(", ")} · modified ${modified.join(", ")}` : `${changed.length} new path(s)`); }
  { const PROTECTED = ["resources/planet-sphere", "demos/planet-sphere.html", "demos/planet-sphere-grid.html", "docs/PLANET_SPHERE_VIEW_v1.md", "resources/bloom-sim.js", "resources/bloom-gen.js",
      "resources/bloom-validate.js", "resources/bloom-witness.js", "resources/bloom-archetype.js", "resources/bloom-scenario.js", "resources/bloom-play.js", "resources/bloom-play-worker.js",
      "content", "planets", "index.html", "demos/demo-run.html", "demos/demo-surface.html", "demos/ui-mockups", "GAME_BIBLE.md", "tools/golden", "docs/evidence/bloom-027d"];
    const d = git(`diff --name-only ${BASE} -- ${PROTECTED.map(p => `'${p}'`).join(" ")}`).trim();
    check(!d, "N2 PlanetSphereView / PlanetSphereRenderer / texture module / Three.js vendor / sphere demos + handoff doc, generator, simulation, validators, content, First Bloom, goldens, index.html, run page and UI mockups byte-identical to 027D", d || PROTECTED.length + " protected paths"); }
  { const r = spawnSync(process.execPath, [path.join(ROOT, "tools/destination-survey-check.js")], { cwd: ROOT }).stdout.toString();
    const pass = (r.match(/^PASS/gm) || []).length, fail = (r.match(/^FAIL/gm) || []).length;
    check(fail === 0 && /ALL CHECKS PASS/.test(r), "N3 tools/destination-survey-check.js (survey data: classes, production worlds, dossier derivation, determinism, no mutation) is green", `${pass} pass / ${fail} fail`); }
  { const src = fs.readFileSync(path.join(ROOT, "resources/destination-survey/destination-survey.js"), "utf8"), code = src.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
    const imports = [...code.matchAll(/import .* from "([^"]+)"/g)].map(m => m[1]);
    const internals = code.match(/\b(?:views\[[^\]]+\]|view|v|host|this\.host|renderer)\._[A-Za-z]+/g) || [];
    const renderers = (code.match(/new PlanetSphereRenderer\(/g) || []).length, three = /THREE|WebGLRenderer|getContext\(/.test(code);
    const menuInSphere = /DestinationSurvey|survey|dossier/i.test(fs.readFileSync(path.join(ROOT, "resources/planet-sphere/planet-sphere-view.js"), "utf8"));
    check(J(imports) === J(["../planet-sphere/planet-sphere-view.js", "./survey-data.js"]) && !internals.length && renderers === 1 && !three && !menuInSphere,
      "N4 menu code uses the stock component only: imports PlanetSphereView/Renderer + survey data, touches no `_` internals, creates exactly ONE PlanetSphereRenderer, no Three.js / WebGL of its own; no menu state in the sphere module",
      `imports ${J(imports)} · internals ${J(internals)} · renderers ${renderers}`); }
  if (SPHERE_QA) { // T18: the accepted 027D sphere QA, re-run against this branch (a copy at the same depth, so its ROOT resolves here)
    const tmp = path.join(ROOT, "docs/evidence/.bloom-027d-rerun"); fs.mkdirSync(tmp, { recursive: true });
    fs.copyFileSync(path.join(ROOT, "docs/evidence/bloom-027d/qa-sphere-production.js"), path.join(tmp, "qa-sphere-production.js"));
    const r = spawnSync(process.execPath, [path.join(tmp, "qa-sphere-production.js"), "--no-gpu", "--port", String(PORT + 11)], { cwd: ROOT, env: process.env, timeout: 900000 });
    let res = null; try { res = JSON.parse(fs.readFileSync(path.join(tmp, "qa-results.json"), "utf8")); } catch { /* crashed */ }
    fs.rmSync(tmp, { recursive: true, force: true });
    if (!res) check(false, "N5 027D sphere QA re-run", (r.stdout || "").toString().slice(-400) + (r.stderr || "").toString().slice(-400));
    else {
      fs.writeFileSync(path.join(OUT, "sphere-qa-027d-rerun.json"), JSON.stringify(res, null, 1));
      const checks = res.results.filter(x => !x.info), failed = checks.filter(x => !x.ok);
      // N1/N2 of the 027D QA pin "nothing changed since 027C outside the sphere work" — by design they list every later milestone's new files
      const provenance = failed.filter(x => /^N[12] /.test(x.name)), behavioural = failed.filter(x => !/^N[12] /.test(x.name));
      const listed = provenance.flatMap(x => x.detail.split(/stray:\s*|,\s*/).map(t => t.trim()).filter(t => t.includes("/")));
      const strayOk = listed.length > 0 && listed.every(f => ALLOWED_NEW.some(rx => rx.test(f)) || /^docs\/evidence\/\.bloom-027d-rerun\//.test(f));
      check(!behavioural.length && strayOk, `N5 (T18) the accepted 027D sphere QA re-run on this branch: every behavioural check green (${checks.length - failed.length}/${checks.length} pass; ${provenance.length} provenance check(s) flag only the new 028A files, as designed)`,
        behavioural.map(x => x.name).join("; ") || provenance.map(x => x.name.slice(0, 3) + ": " + x.detail.slice(0, 200)).join(" | ") || "all green");
    }
  }

  // ---------------------------------------------------------------- browser helpers
  function waitHttp(url, ms) { const t0 = Date.now(); return new Promise(res => { const go = () => http.get(url, r => { r.resume(); res(r.statusCode === 200); })
    .on("error", () => Date.now() - t0 > ms ? res(false) : setTimeout(go, 150)); go(); }); }
  async function openPage(browser, query = "", ctxOpts = {}) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...ctxOpts });
    await ctx.addInitScript(INIT);
    const page = await ctx.newPage(), log = { errors: [], warnings: [], failed: [] };
    page.on("console", m => { if (m.type() === "error") log.errors.push(m.text()); if (m.type() === "warning") log.warnings.push(m.text().slice(0, 200)); });
    page.on("pageerror", err => log.errors.push("pageerror: " + err.message));
    page.on("requestfailed", r => log.failed.push(r.url()));
    page.on("response", r => { if (r.status() >= 400) log.failed.push(r.status() + " " + r.url()); });
    await page.goto(PAGE + query);
    await page.waitForFunction(() => window.SURVEY_DEV && (SURVEY_DEV.ready || SURVEY_DEV.errors.length), null, { timeout: 90000 });
    await page.evaluate(HELPERS);
    await page.evaluate(() => __settle("survey"));
    return { ctx, page, log };
  }
  const ev = (page, fn, arg) => page.evaluate(fn, arg);
  const leak = page => ev(page, () => ({ listeners: __LEAK.listeners, observers: __LEAK.observers, liveGL: __LEAK.liveGL(), glCreated: __LEAK.glCreated, contextWarnings: __LEAK.contextWarnings }));
  const shot = (page, name, clip) => SHOTS ? page.screenshot({ path: path.join(OUT, name), ...(clip ? { clip } : {}) }) : null;
  /** start select(i) / returnToSurvey() and freeze every animation at `ms` (evidence frames of a transition) */
  const freezeAt = (page, start, ms) => ev(page, async ({ start, ms }) => { const s = SURVEY_DEV.survey; const p = start === "return" ? s.returnToSurvey() : start === "scan" ? s.scan() : s.select(start);
    window.__pending = p; await new Promise(r => setTimeout(r, start === "scan" ? 30 : 0)); getComputedStyle(s.root).opacity;
    for (const a of document.getAnimations()) { a.pause(); a.currentTime = Math.min(ms, (a.effect.getComputedTiming().endTime || ms)); }
    await __frames(3); }, { start, ms });
  const unfreeze = (page, st) => ev(page, async st => { for (const a of document.getAnimations()) a.play(); await window.__pending; await __settle(st); }, st);
  /** drag on the focused globe (dx, dy in px) */
  async function drag(page, dx, dy, steps = 20) {
    const b = await ev(page, () => { const r = SURVEY_DEV.survey.focusSlot.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await page.mouse.move(b.x - dx / 2, b.y - dy / 2); await page.mouse.down();
    for (let k = 1; k <= steps; k++) await page.mouse.move(b.x - dx / 2 + dx * k / steps, b.y - dy / 2 + dy * k / steps);
    await page.mouse.up();
  }

  // ================================================================ Part B — Chromium
  async function mainSuite(browser) {
    const o = await openPage(browser, "?sector=1&firstBloom=1"), page = o.page;
    const S = fn => ev(page, fn);

    // ---- T1 load
    { const r = await S(() => ({ ready: SURVEY_DEV.ready, errs: SURVEY_DEV.errors, state: SURVEY_DEV.survey.state, src: SURVEY_DEV.survey.sectorSource, label: SURVEY_DEV.survey.sector.label, n: SURVEY_DEV.survey.cells.filter(Boolean).length }));
      check(r.ready && r.state === "survey" && !r.errs.length && !o.log.errors.length && !o.log.failed.length && r.n === 9,
        "T1 the dev entry loads over localhost (python3 -m http.server from the repo root): survey state, nine candidates, no page / console errors, no failed requests", `${r.label} · sectors built by ${r.src} · ${J([...r.errs, ...o.log.errors, ...o.log.failed])}`);
      check(r.src === "worker", "T1b sectors are built in the module worker (main thread stays free for the spinning globes)", r.src); }
    await shot(page, "01-survey-1440x900.png");

    // ---- T2 one renderer, T3 nine visible views
    { const r = await S(() => { const s = SURVEY_DEV.survey; return { gl: __LEAK.glCreated, live: __LEAK.liveGL(), canvases: document.querySelectorAll("canvas").length, inStage: s.root.querySelectorAll("canvas").length,
      shared: s.views.every(v => v.renderer === s.host && !v.ownsRenderer), hostViews: s.host.views.length, programs: s.host.three.info.programs.length, geometries: s.host.three.info.memory.geometries }; });
      check(r.gl === 1 && r.live === 1 && r.canvases === 1 && r.inStage === 1 && r.shared && r.hostViews === 9 && r.programs === 1 && r.geometries === 1,
        "T2 exactly ONE PlanetSphereRenderer: one WebGL context created on the page, one canvas (inside the survey stage), all nine views attached to it, one shader program, one shared geometry", J(r)); }
    { const px = await S(() => __pixels()), st = await S(() => SURVEY_DEV.survey.views.map(v => { const s = v.state(); return { vis: s.box && s.box.visible, planet: !!v.planet, globe: !!(v._globe && v._globe.visible), interactive: s.interactive }; }));
      check(st.length === 9 && st.every(s => s.vis && s.planet && s.globe) && px.every(p => p && p.centre === 255 && p.corner === 0),
        "T3 nine visible PlanetSphereViews in the survey: each has a planet, an on-screen box, and drawn globe pixels at its box centre (transparent at its corners)", J(px.map(p => p && [p.centre, p.corner]))); }

    // ---- T4 independent state
    { const r = await S(async () => { const s = SURVEY_DEV.survey; // idle eases in 3 s after creation / a setYaw (First Bloom is turned to yaw 0 when assigned), full speed 1.5 s later
        await new Promise(res => { const t0 = performance.now(), f = () => (s.views.every(v => v.state().idleFactor === 1) || performance.now() - t0 > 8000 ? res() : requestAnimationFrame(f)); f(); });
        const y0 = s.views.map(v => v.getYaw()), sig = s.views.map(v => v.state().textureSignature);
        await new Promise(r => setTimeout(r, 1200)); const y1 = s.views.map(v => v.getYaw());
        s.views[4].setYaw(y1[4] + 2); await __frames(2); const y2 = s.views.map(v => v.getYaw());
        return { distinctYaw: new Set(y0.map(y => y.toFixed(4))).size, distinctTex: new Set(sig).size, spun: y1.map((y, i) => +(y - y0[i]).toFixed(4)), after: y2.map((y, i) => +(y - y1[i]).toFixed(4)),
          interactive: s.views.map(v => v.interactive), idle: s.views.map(v => v.state().autoRotate) }; });
      const others = r.after.filter((_, i) => i !== 4);
      check(r.distinctYaw === 9 && r.distinctTex === 9 && r.spun.every(d => d > 0.02) && r.after[4] > 1.9 && others.every(d => d >= 0 && d < 0.05) && r.idle.every(Boolean),
        "T4 independent globes: nine different orientations and textures; all idle-spin (the component's own idle rotation, no second system); turning one leaves the other eight untouched", J({ spun: r.spun, after: r.after }));
      check(r.interactive.every(x => x === false), "T4b in the survey each globe is part of its candidate button (not separately draggable), so a click selects without touching the globe's idle spin", J(r.interactive)); }

    // ---- T5 context warnings
    check((await leak(page)).contextWarnings === 0 && !o.log.warnings.some(w => /context/i.test(w) && /webgl/i.test(w)), "T5 no WebGL context-limit / context warnings", J(o.log.warnings.slice(0, 3)));

    // ---- T6 / T7 SCAN NEW SECTOR: replacement + a staged sweep, not a hard pop
    await S(() => { const s = SURVEY_DEV.survey; window.__swaps = []; s.views.forEach((v, i) => { const orig = v.setPlanet.bind(v); v.setPlanet = (p, o) => { const g = s.globes[i], r = g.getBoundingClientRect();
      if (p) __swaps.push({ i, t: performance.now(), scale: +(r.width / g.offsetWidth).toFixed(3) }); return orig(p, o); }; }); });
    { const before = await S(() => ({ keys: SURVEY_DEV.survey.cells.map(c => c.key), up: SURVEY_DEV.survey.views.map(v => v.textureUploads), gl: __LEAK.glCreated }));
      const t = await S(async () => { const s = SURVEY_DEV.survey, t0 = performance.now(); const pr = s.scan(); await new Promise(r => setTimeout(r, 0)); const busy = s.scanBtn.getAttribute("aria-busy"); await pr; return { ms: +(performance.now() - t0).toFixed(0), busy }; });
      const after = await S(() => ({ keys: SURVEY_DEV.survey.cells.map(c => c.key), up: SURVEY_DEV.survey.views.map(v => v.textureUploads), gl: __LEAK.glCreated, swaps: __swaps, label: SURVEY_DEV.survey.sector.label, scans: SURVEY_DEV.survey.stats.scans }));
      const fresh = after.keys.filter(k => !before.keys.includes(k)).length;
      check(fresh === 9 && after.up.every((u, i) => u === before.up[i] + 1) && after.gl === 1 && after.scans === 1,
        "T6 SCAN NEW SECTOR replaces all nine candidates (nine new worlds, one texture upload per globe, the same nine views and the same single context)", `${after.label} · ${t.ms} ms · ${fresh}/9 new`);
      const sw = after.swaps.slice().sort((a, b) => a.i - b.i), times = sw.map(s => s.t), spread = Math.max(...times) - Math.min(...times);
      const rank = a => { const o = a.map((v, i) => [v, i]).sort((x, y) => x[0] - y[0]); const r = new Array(a.length); o.forEach(([, i], k) => { r[i] = k; }); return r; };
      const diag = sw.map(s => { const [r, c] = [Math.floor(s.i / 3), s.i % 3]; return r + c; }), rt = rank(times), rd = rank(diag.map((d, i) => d + i * 1e-6));
      const rho = 1 - 6 * rt.reduce((a, r, i) => a + (r - rd[i]) ** 2, 0) / (9 * 80);
      const firstI = sw.reduce((a, b) => (b.t < a.t ? b : a)).i, lastI = sw.reduce((a, b) => (b.t > a.t ? b : a)).i;
      check(sw.length === 9 && spread >= 250 && rho >= 0.8 && firstI === 0 && lastI === 8 && sw.every(s => s.scale <= 0.15),
        "T7 the replacement is a staged sweep, not a hard pop: each globe shrinks away before its world changes (scale ≤ 0.15 at the swap), swaps spread over ≥ 250 ms, top-left first → bottom-right last, order follows the diagonal (Spearman ρ ≥ 0.8) with slight irregularity",
        `spread ${spread.toFixed(0)} ms · ρ ${rho.toFixed(2)} · order ${sw.slice().sort((a, b) => a.t - b.t).map(s => s.i).join(" ")} · scales ${J(sw.map(s => s.scale))}`);
      check(t.busy === "true" && t.ms < 1600, "T7b the scan is short (sector prefetched by the worker while the player looked at the last one); the button reports busy meanwhile", `${t.ms} ms end-to-end`); }
    { await freezeAt(page, "scan", 170); await shot(page, "04a-scan-sweep-early.png"); await unfreeze(page, "survey");
      await freezeAt(page, "scan", 380); await shot(page, "04b-scan-sweep-mid.png"); await unfreeze(page, "survey"); }

    // ---- T9 / T10 / T13 every grid position → focus → back, with yaw and box continuity
    { const rows = [];
      for (let i = 0; i < 9; i++) {
        const pre = await ev(page, i => { const s = SURVEY_DEV.survey, r = s.slots[i].getBoundingClientRect(); return { cellW: r.width, cx: r.left + r.width / 2, cy: r.top + r.height / 2, up: s.views[i].textureUploads }; }, i);
        const go = await ev(page, async i => { const s = SURVEY_DEV.survey, p = __sample(i, 1300); await (async () => { await new Promise(r => requestAnimationFrame(r)); s.buttons[i].click(); })(); const smp = await p; await __settle("focus");
          const slot = s.focusSlot.getBoundingClientRect(), v = s.views[i];
          return { smp, state: s.state, inSlot: s.globes[i].parentElement === s.focusSlot, interactive: v.interactive, title: s.dossierTitle.textContent, name: s.cells[i].name,
            receded: s.globes.filter((g, j) => j !== i && g.classList.contains("is-receded")).length, visibleViews: s.views.filter(x => x._box && x._box.visible).length,
            slotW: slot.width, active: document.activeElement === s.dossierTitle, up: v.textureUploads }; }, i);
        const back = await ev(page, async i => { const s = SURVEY_DEV.survey, p = __sample(i, 1200); await new Promise(r => requestAnimationFrame(r)); s.root.querySelector('[data-act="return"]').click(); const smp = await p; await __settle("survey");
          return { smp, state: s.state, inCell: s.globes[i].parentElement === s.slots[i], interactive: s.views[i].interactive, active: document.activeElement === s.buttons[i],
            visible: s.views.filter(x => x._box && x._box.visible).length, receded: s.globes.filter(g => g.classList.contains("is-receded")).length, up: s.views[i].textureUploads }; }, i);
        const judge = (smp, w0, w1) => { const d = smp.slice(1).map((s, k) => s.yaw - smp[k].yaw), ws = smp.map(s => s.w);
          const mono = w1 > w0 ? ws.every((w, k) => !k || w >= ws[k - 1] - 0.75) : ws.every((w, k) => !k || w <= ws[k - 1] + 0.75);
          return { maxStep: Math.max(...d), minStep: Math.min(...d), frames: smp.length, mono, startW: ws[0], endW: ws[ws.length - 1], same: smp.every(s => s.view) }; };
        const jg = judge(go.smp, pre.cellW, go.slotW), jb = judge(back.smp, go.slotW, pre.cellW);
        rows.push({ i, go: jg, back: jb, ok: go.state === "focus" && go.inSlot && go.interactive && go.title === go.name && go.receded === 8 && go.visibleViews === 1 && go.active && go.up === pre.up
          && back.state === "survey" && back.inCell && !back.interactive && back.active && back.visible === 9 && back.receded === 0 && back.up === pre.up,
          yawOk: jg.same && jb.same && jg.minStep >= -1e-9 && jb.minStep >= -1e-9 && jg.maxStep < 0.012 && jb.maxStep < 0.012,
          boxOk: jg.mono && jb.mono && Math.abs(jg.startW - pre.cellW) / pre.cellW < 0.06 && Math.abs(jg.endW - go.slotW) < 1.5 && Math.abs(jb.startW - go.slotW) / go.slotW < 0.06 && Math.abs(jb.endW - pre.cellW) < 1.5 });
      }
      check(rows.every(r => r.ok), "T9 / T13 every one of the nine grid positions enters focus (its own globe in the focus slot, draggable, dossier titled with its world, the other eight receded and not drawn, keyboard focus on the dossier) and RETURN TO SURVEY restores the 3 × 3 (globe back in its cell, not draggable, keyboard focus back on that candidate)",
        rows.filter(r => !r.ok).map(r => r.i).join(",") || "9 / 9");
      check(rows.every(r => r.yawOk), "T10 orientation continuity through grid → focus → grid: the SAME PlanetSphereView instance and container throughout, no texture re-upload, yaw never jumps or runs backwards (largest per-frame step < 0.012 rad: idle spin only)",
        rows.map(r => `#${r.i} ${r.go.maxStep.toFixed(4)}/${r.back.maxStep.toFixed(4)} (${r.go.frames}f)`).join(" "));
      check(rows.every(r => r.boxOk), "T10b the globe's on-screen box moves continuously: it starts the size of its cell, grows monotonically to the focus slot, and shrinks monotonically back (a FLIP transform the renderer follows; no reframing jump)",
        rows.map(r => `#${r.i} ${r.go.startW.toFixed(0)}→${r.go.endW.toFixed(0)}→${r.back.endW.toFixed(0)}`).join(" ")); }

    // ---- T10c no globe crosses a full-size neighbour (shared depth buffer)
    { const rows = [];
      for (const i of [2, 5, 8, 4, 6]) {
        const go = await ev(page, async i => { const p = __overlaps(i, 1100); SURVEY_DEV.survey.select(i); const r = await p; await __settle("focus"); return r; }, i);
        const back = await ev(page, async i => { const p = __overlaps(i, 1300); SURVEY_DEV.survey.returnToSurvey(); const r = await p; await __settle("survey"); return r; }, i);
        rows.push({ i, go, back }); }
      check(rows.every(r => r.go.overlapping === 0 && r.back.overlapping === 0), "T10c the travelling globe never overlaps another globe that is still > 15% of its size, out or back (globes on one renderer share a depth buffer, so overlap would intersect them)",
        rows.map(r => `#${r.i} ${r.go.overlapping}/${r.go.frames} · ${r.back.overlapping}/${r.back.frames} (worst ${Math.max(r.go.worst, r.back.worst).toFixed(2)})`).join(" ")); }

    // evidence frames of the grid → focus transition (cell 5) and the return
    await freezeAt(page, 5, 180); await shot(page, "02a-grid-to-focus-180ms.png"); await unfreeze(page, "focus");
    await shot(page, "03-focus-1440x900.png");
    await freezeAt(page, "return", 260); await shot(page, "05-focus-to-grid-260ms.png"); await unfreeze(page, "survey");
    await freezeAt(page, 1, 380); await shot(page, "02b-grid-to-focus-380ms.png"); await unfreeze(page, "focus");
    await S(async () => { await SURVEY_DEV.survey.returnToSurvey(); await __settle("survey"); });

    // ---- T11 / T12 focus interaction
    { await S(async () => { await SURVEY_DEV.survey.select(7); await __settle("focus"); });
      const st0 = await S(() => SURVEY_DEV.survey.views[7].state());
      await drag(page, 260, 0);
      await page.waitForFunction(() => { const v = SURVEY_DEV.survey.views[7]; return !v.interacting && v.vYaw === 0 && Math.abs(v.targetYaw - v.yaw) < 1e-6; }, null, { timeout: 15000 });
      const st1 = await S(() => SURVEY_DEV.survey.views[7].state());
      await drag(page, 0, 300); await page.waitForTimeout(900);
      const st2 = await S(() => SURVEY_DEV.survey.views[7].state());
      const tilt = q => Math.abs(q[0]) + Math.abs(q[2]);
      check(st1.yaw - st0.yaw > 0.4 && tilt(st1.quaternion) < 1e-12, "T11 the focused planet stays draggable: a horizontal drag spins it (yaw only)", `Δyaw ${(st1.yaw - st0.yaw).toFixed(3)} rad`);
      check(Math.abs(st2.yaw - st1.yaw) < 0.003 && tilt(st2.quaternion) < 1e-12 && st2.pitch === 0 && st2.roll === 0, "T12 a vertical drag on the focused planet changes nothing: no pitch, no roll (quaternion x = z = 0), yaw unchanged",
        `Δyaw ${(st2.yaw - st1.yaw).toFixed(5)} · q ${J(st2.quaternion.map(x => +x.toFixed(6)))}`);
      const keys = await S(async () => { const s = SURVEY_DEV.survey, g = s.globes[7], y0 = s.views[7].getYaw(); g.focus(); g.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })); await __frames(20);
        const y1 = s.views[7].getYaw(); g.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true })); await __frames(10); return { d: y1 - y0, up: s.views[7].getYaw() - y1, tab: g.tabIndex }; });
      check(keys.d > 0.1 && Math.abs(keys.up) < 0.01 && keys.tab === 0, "T12b keyboard: the focused globe is focusable and ← / → spin it; ↑ does nothing", J(keys)); }

    // ---- T16 Begin Expedition hook
    { const r = await S(async () => { const s = SURVEY_DEV.survey, href = location.href, sig = JSON.stringify(s.cells[7].planet.tilemap).length + ":" + s.cells[7].planet.sections.length; let ev = null;
        document.addEventListener("bloom:begin-expedition", e => { ev = e.detail; }, { once: true });
        s.root.querySelector('[data-act="begin"]').click(); await __frames(3);
        return { fired: !!ev, sameView: ev && ev.view === s.views[7] && ev.globe === s.globes[7], key: ev && ev.candidate.key, cellKey: s.cells[7].key, hooks: SURVEY_DEV.hooks.length,
          state: s.state, href: location.href === href, sig: sig === JSON.stringify(s.cells[7].planet.tilemap).length + ":" + s.cells[7].planet.sections.length,
          placeholder: !document.getElementById("devHook").hidden, scripts: [...document.scripts].map(x => x.src.split("/").pop()).filter(x => /demo-run|play-worker/.test(x)),
          sims: typeof BLOOM.createSim === "function", detailKeys: ev && Object.keys(ev).sort() }; });
      check(r.fired && r.sameView && r.key === r.cellKey && r.hooks === 1 && r.state === "focus" && r.href && r.sig && r.placeholder && !r.scripts.length,
        "T16 BEGIN EXPEDITION fires the hook (onBeginExpedition + a bubbling bloom:begin-expedition event carrying the candidate, its planet data and its live view / container) and stays on this screen: no navigation, no run started, the planet untouched; the page shows its dev placeholder",
        J({ key: r.key, detail: r.detailKeys })); }
    await shot(page, "09-begin-expedition-dev-hook.png");
    await S(async () => { document.getElementById("devHook").hidden = true; await SURVEY_DEV.survey.returnToSurvey(); await __settle("survey"); });

    // ---- keyboard: Tab to a candidate, Enter → focus, Escape → back
    { const r = await S(() => { SURVEY_DEV.survey.buttons[3].focus(); return document.activeElement === SURVEY_DEV.survey.buttons[3]; });
      await page.keyboard.press("Enter"); await S(() => __settle("focus"));
      const f = await S(() => ({ st: SURVEY_DEV.survey.state, sel: SURVEY_DEV.survey.selected, gridInert: SURVEY_DEV.survey.grid.inert }));
      await page.keyboard.press("Escape"); await S(() => __settle("survey"));
      const b = await S(() => ({ st: SURVEY_DEV.survey.state, active: document.activeElement === SURVEY_DEV.survey.buttons[3], focusInert: SURVEY_DEV.survey.focus.inert }));
      check(r && f.st === "focus" && f.sel === 3 && f.gridInert && b.st === "survey" && b.active && b.focusInert, "T-kbd candidates are real buttons: Enter opens the focus state (the hidden grid becomes inert), Escape returns and puts keyboard focus back on the candidate", J({ f, b })); }

    // ---- T14 repeated cycles + scans: no leaks, no degradation
    { const base = await leak(page), perf0 = await S(() => __frameStats(90));
      const r = await S(async () => { const s = SURVEY_DEV.survey;
        for (let k = 0; k < 12; k++) { await s.select((k * 4) % 9); await __settle("focus"); await s.returnToSurvey(); await __settle("survey"); if (k % 3 === 2) { await s.scan(); await __settle("survey"); } }
        for (let k = 0; k < 6; k++) { await s.scan(); await __settle("survey"); }
        return { mem: { ...s.host.three.info.memory }, programs: s.host.three.info.programs.length, anims: document.getAnimations().length, stats: s.stats, children: s.root.children.length,
          inStage: s.root.querySelectorAll(".ds-globe").length, canvases: document.querySelectorAll("canvas").length, errs: SURVEY_DEV.errors.length }; });
      const end = await leak(page), perf1 = await S(() => __frameStats(90));
      check(end.listeners === base.listeners && end.observers === base.observers && end.liveGL === 1 && end.glCreated === 1 && r.mem.textures === 9 && r.mem.geometries === 1 && r.programs === 1 && r.anims === 0 && r.canvases === 1 && r.inStage === 9 && !r.errs && !o.log.errors.length,
        "T14 12 grid ↔ focus cycles + 10 scans: listeners, observers and contexts at baseline (still one context ever created), GPU memory 9 textures / 1 geometry, one program, no lingering animations, no errors",
        `${J(base)} → ${J(end)} · ${J(r.mem)} · stats ${J(r.stats)}`);
      check(perf1.meanFrameMs < perf0.meanFrameMs * 1.35 + 4, "T14b no performance degradation after the cycles (mean frame time, headless software GL)", `${perf0.meanFrameMs} → ${perf1.meanFrameMs} ms (p95 ${perf0.p95FrameMs} → ${perf1.p95FrameMs})`); }

    // ---- T15 resize: grid, focus, focus → grid at a new size, portrait focus + scrolling
    { const at = async (w, h) => { await page.setViewportSize({ width: w, height: h }); await S(() => __frames(4)); return S(() => ({ boxes: __boxes(),
        stage: (() => { const R = SURVEY_DEV.survey.host, c = R.domElement; return { cw: c.width, ch: c.height, sw: R.stage.clientWidth, sh: R.stage.clientHeight, dpr: R.three.getPixelRatio() }; })() })); };
      const ok = r => r.boxes.filter(b => b.visible).every(b => b.dx <= 2 && b.dw <= 2) && Math.abs(r.stage.cw - r.stage.sw * r.stage.dpr) <= 1 && Math.abs(r.stage.ch - r.stage.sh * r.stage.dpr) <= 1;
      const g1 = await at(1024, 768); await shot(page, "07a-survey-1024x768.png");
      await S(async () => { await SURVEY_DEV.survey.select(2); await __settle("focus"); });
      const f1 = await at(1024, 768); await shot(page, "07b-focus-1024x768.png");
      const f2 = await at(1440, 900);
      await S(async () => { await SURVEY_DEV.survey.returnToSurvey(); await __settle("survey"); });
      const g2 = await at(1440, 900);
      const p0 = await at(820, 1180); await S(async () => { await SURVEY_DEV.survey.select(4); await __settle("focus"); });
      const p1 = await at(820, 1180); await shot(page, "08-focus-820x1180-portrait.png");
      const scroll = await S(async () => { const s = SURVEY_DEV.survey, f = s.focus, y0 = s.views[4]._box.y; f.scrollTop = 160; await __frames(3); const y1 = s.views[4]._box.y; f.scrollTop = 0; await __frames(2); return { y0, y1, scrolled: f.scrollHeight > f.clientHeight }; });
      await S(async () => { await SURVEY_DEV.survey.returnToSurvey(); await __settle("survey"); });
      const p2 = await at(820, 1180);
      const all = [g1, f1, f2, g2, p0, p1, p2];
      check(all.every(ok) && g1.boxes.filter(b => b.visible).length === 9 && f1.boxes.filter(b => b.visible).length === 1 && g2.boxes.filter(b => b.visible).length === 9 && p2.boxes.filter(b => b.visible).length === 9,
        "T15 resize: at 1024×768, 1440×900 and 820×1180 portrait — in the grid, in focus, and after focus → grid at a new size — every visible view's drawing box matches its container (≤ 2 px) and the canvas buffer tracks the stage × DPR",
        all.map((r, k) => `${["g1024", "f1024", "f1440", "g1440", "g820", "f820", "g820b"][k]}:${r.boxes.filter(b => b.visible).length}v max${Math.max(...r.boxes.filter(b => b.visible).map(b => b.dx + b.dw))}`).join(" "));
      check(!scroll.scrolled || Math.abs((scroll.y0 - scroll.y1) - 160) <= 2, "T15b portrait focus: the focus layer scrolls (dossier below the planet) and the globe's drawing box follows the scroll", J(scroll));
      await page.setViewportSize({ width: 1440, height: 900 }); await S(() => __frames(3)); }

    info("console warnings seen (Chromium, main page)", o.log.warnings.length ? [...new Set(o.log.warnings.map(w => w.replace(/0x[0-9a-f]+/g, "0x…")))].slice(0, 4).join(" | ") : "none");
    await o.ctx.close();
  }

  // ---- T8 reduced motion: forced (rm=1) and via the OS media query
  async function reducedMotionSuite(browser) {
    for (const mode of ["forced", "media"]) {
      const o = await openPage(browser, mode === "forced" ? "?sector=3&rm=1" : "?sector=3", mode === "media" ? { reducedMotion: "reduce" } : {}), page = o.page, S = fn => ev(page, fn);
      const r = await S(async () => { const s = SURVEY_DEV.survey, y0 = s.views.map(v => v.getYaw()); await new Promise(r => setTimeout(r, 1200)); const y1 = s.views.map(v => v.getYaw());
        window.__swaps = []; window.__anims = []; s.views.forEach((v, i) => { const orig = v.setPlanet.bind(v); v.setPlanet = (p, o) => { if (p) __swaps.push(performance.now()); return orig(p, o); }; });
        const keys0 = s.cells.map(c => c.key); const p = s.scan(); const seen = new Set();
        // every animation alive during the scan: target (screen root or an element), animated properties, duration
        const watch = () => { for (const a of document.getAnimations()) { const kf = a.effect.getKeyframes ? a.effect.getKeyframes() : [];
          seen.add(J0([a.effect.target === s.root ? "root" : "el", Object.keys(kf[0] || {}).filter(k => !["offset", "easing", "composite", "computedOffset"].includes(k)).join("+"), a.effect.getComputedTiming().duration])); }
          if (s.state === "scanning") requestAnimationFrame(watch); }; const J0 = JSON.stringify;
        watch(); await p; await __settle("survey");
        const fresh = s.cells.filter(c => !keys0.includes(c.key)).length, spread = Math.max(...__swaps) - Math.min(...__swaps);
        const sel = await s.select(5); await __settle("focus"); const inSlot = s.globes[5].parentElement === s.focusSlot;
        const seenSel = new Set(document.getAnimations().map(a => a.effect.target === s.root ? "root" : "el"));
        return { rm: s.reducedMotion, viewsRm: s.views.every(v => v.reducedMotion && !v.state().autoRotate), still: y1.every((y, i) => y === y0[i]), fresh, spread, seen: [...seen].map(x => JSON.parse(x)), sel, inSlot, seenSel: [...seenSel] }; });
      // allowed: the whole-screen opacity fade, and CSS colour / border state changes that reduced motion clamps to ≤ 20 ms; never a transform
      const motionOk = r.seen.some(([t, k]) => t === "root" && k === "opacity") && r.seen.every(([t, k, d]) => !/transform|translate|scale/.test(k) && (t === "root" ? k === "opacity" : d <= 20));
      const st0 = await S(() => SURVEY_DEV.survey.views[5].getYaw()); await drag(page, 240, 0); await page.waitForTimeout(150); const st1 = await S(() => ({ yaw: SURVEY_DEV.survey.views[5].getYaw(), v: SURVEY_DEV.survey.views[5].vYaw }));
      if (mode === "forced") await shot(page, "06-reduced-motion-focus.png");
      const back = await S(async () => { const ok = await SURVEY_DEV.survey.returnToSurvey(); await __settle("survey"); return ok && SURVEY_DEV.survey.globes[5].parentElement === SURVEY_DEV.survey.slots[5]; });
      check(r.rm && r.viewsRm && r.still && r.fresh === 9 && r.spread < 60 && motionOk && r.sel && r.inSlot && st1.yaw - st0 > 0.3 && st1.v === 0 && back && !o.log.errors.length,
        `T8 reduced motion (${mode === "forced" ? "forced by option" : "OS prefers-reduced-motion"}): globes do not idle-spin; SCAN replaces all nine at once behind a short whole-screen fade (no sweeping transforms); select / return swap with a fade; the focused globe still drags (no fling)`,
        J({ spread: +r.spread.toFixed(1), anims: [...new Set(r.seen.map(([t, k, d]) => `${t}:${k.length > 24 ? k.slice(0, 24) + "…" : k}@${d}ms`))], dragYaw: +(st1.yaw - st0).toFixed(3), fling: st1.v }));
      await o.ctx.close();
    }
  }

  // ---- First Bloom seam evidence (report only; no fix)
  async function firstBloomSeam(browser) {
    const o = await openPage(browser, "?sector=1&firstBloom=1"), page = o.page, S = fn => ev(page, fn);
    const data = await S(async () => { const T = await import("/resources/planet-sphere/planet-texture.js"), s = SURVEY_DEV.survey, i = s.cells.findIndex(c => c.authored), p = T.texturePlanet(s.cells[i].planet);
      const g = T.texturePlanet(s.cells.find(c => !c.authored).planet);
      return { i, fb: T.seamStats(p, T.baseTileColors(p, null)), generated: T.seamStats(g, T.baseTileColors(g, s.cells.find(c => !c.authored).render)) }; });
    info("First Bloom cut, measured on the data (rows across x = 59 | x = 0)", data.fb);
    info("…for comparison, a generated cylinder in the same sector", data.generated);
    const i = data.i;
    // evidence only: hold the globe still and turn the cut to face the viewer (public API: setAutoRotate / lookAt)
    const clipOf = sel => S(sel).then(r => ({ x: r.x, y: r.y, width: r.w, height: r.h }));
    await S(new Function(`return (async () => { const v = SURVEY_DEV.survey.views[${i}]; v.setAutoRotate(false); v.lookAt(0); await __frames(4); })()`));
    if (SHOTS) { const c = await clipOf(new Function(`const r = SURVEY_DEV.survey.slots[${i}].getBoundingClientRect(); return { x: r.left - 12, y: r.top - 12, w: r.width + 24, h: r.height + 60 };`));
      await page.screenshot({ path: path.join(OUT, "10-first-bloom-cut-facing-grid-size.png"), clip: c }); }
    await S(new Function(`return (async () => { const s = SURVEY_DEV.survey; await s.select(${i}); await __settle("focus"); s.views[${i}].setAutoRotate(false); s.views[${i}].lookAt(0); await __frames(4); })()`));
    if (SHOTS) {
      const c = await clipOf(() => { const r = SURVEY_DEV.survey.focusSlot.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
      await page.screenshot({ path: path.join(OUT, "11-first-bloom-cut-facing-focus-size.png"), clip: c });
      // rotating through the cut: five frames around longitude zero at focus size, composed into one strip
      const frames = [];
      for (const u of [0.92, 0.96, 0, 0.04, 0.08]) { await S(new Function(`return (async () => { SURVEY_DEV.survey.views[${i}].lookAt(${u}); await __frames(3); })()`)); frames.push((await page.screenshot({ clip: c })).toString("base64")); }
      const strip = await ev(page, new Function("frames", `return (async () => { const imgs = await Promise.all(frames.map(b => new Promise(r => { const im = new Image(); im.onload = () => r(im); im.src = "data:image/png;base64," + b; })));
        const w = imgs[0].width, h = imgs[0].height, k = 0.5, cv = document.createElement("canvas"); cv.width = Math.round(w * k) * 5; cv.height = Math.round(h * k) + 22; const g = cv.getContext("2d");
        g.fillStyle = "#03050b"; g.fillRect(0, 0, cv.width, cv.height); g.fillStyle = "#cdd6e6"; g.font = "14px monospace";
        imgs.forEach((im, n) => { g.drawImage(im, n * Math.round(w * k), 22, Math.round(w * k), Math.round(h * k)); g.fillText(["u 0.92", "u 0.96", "u 0 (cut centred)", "u 0.04", "u 0.08"][n], n * Math.round(w * k) + 8, 16); });
        return cv.toDataURL("image/png").split(",")[1]; })()`), frames);
      fs.writeFileSync(path.join(OUT, "12-first-bloom-rotating-through-cut-focus.png"), Buffer.from(strip, "base64"));
      await S(new Function(`return (async () => { SURVEY_DEV.survey.views[${i}].lookAt(0.5); await __frames(3); })()`));
      await page.screenshot({ path: path.join(OUT, "11b-first-bloom-map-centre-focus-size.png"), clip: c });
    }
    await o.ctx.close();
  }

  // ---- Firefox smoke
  async function firefoxSmoke(ff) {
    const o = await openPage(ff, "?sector=1&firstBloom=1"), page = o.page, S = fn => ev(page, fn);
    const r = await S(async () => { const s = SURVEY_DEV.survey, keys = s.cells.map(c => c.key), px = __pixels();
      await s.scan(); await __settle("survey"); const fresh = s.cells.filter(c => !keys.includes(c.key)).length;
      const y0 = s.views[4].getYaw(); await s.select(4); await __settle("focus"); const y1 = s.views[4].getYaw(); const inSlot = s.globes[4].parentElement === s.focusSlot;
      let fired = null; s.root.addEventListener("bloom:begin-expedition", e => { fired = e.detail.candidate.key; }, { once: true }); s.beginExpedition();
      await s.returnToSurvey(); await __settle("survey");
      return { gl: __LEAK.glCreated, live: __LEAK.liveGL(), views: s.host.views.length, px: px.filter(p => p && p.centre === 255).length, fresh, inSlot, yawFwd: y1 >= y0, fired: !!fired, back: s.state, src: s.sectorSource, errs: SURVEY_DEV.errors }; });
    await shot(page, "13-firefox-survey.png");
    check(r.gl === 1 && r.live === 1 && r.views === 9 && r.px === 9 && r.fresh === 9 && r.inSlot && r.yawFwd && r.fired && r.back === "survey" && !r.errs.length && !o.log.errors.length,
      "F1 Firefox: loads over localhost, one WebGL context with nine drawn globes, sectors from the module worker, SCAN replaces all nine, select → focus (same globe, yaw continuing) → Begin hook → return; no errors", J(r));
    await o.ctx.close();
  }

  // ---- GPU timing (report only): the real 3 × 3, a scan, a selection, after many cycles; worker vs main-thread generation
  async function gpuSample(b) {
    for (const worker of [true, false]) {
      const o = await openPage(b, `?sector=11${worker ? "" : "&worker=0"}`), page = o.page, S = fn => ev(page, fn);
      await page.waitForTimeout(3500); // idle ramps to full speed
      const idle = await S(() => __frameStats(180));
      const scan = await S(async () => { const s = SURVEY_DEV.survey; window.__longTasks.length = 0; const p = __frameStats(70); await s.scan(); const r = await p; return { ...r, longTasks: __longTasks.map(t => +t.d.toFixed(0)) }; });
      const sel = await S(async () => { const s = SURVEY_DEV.survey; const p = __frameStats(50); await s.select(4); const r = await p; await __settle("focus"); const f = await __frameStats(120); await s.returnToSurvey(); await __settle("survey"); return { during: r, focusIdle: f }; });
      const cyc = await S(async () => { const s = SURVEY_DEV.survey; for (let k = 0; k < 10; k++) { await s.scan(); await __settle("survey"); await s.select(k % 9); await __settle("focus"); await s.returnToSurvey(); await __settle("survey"); } await new Promise(r => setTimeout(r, 3500)); return __frameStats(180); });
      info(`perf GPU (${worker ? "module worker" : "main-thread generation"}) — 3×3 idle spin · during a scan · during select · focus idle · 3×3 after 10 scan + focus cycles`,
        { idle, scan, selectDuring: sel.during, focusIdle: sel.focusIdle, afterCycles: cyc });
      await o.ctx.close();
    }
  }

  // ================================================================ browser parts
  let pw; try { pw = require("playwright"); } catch { check(false, "B0 playwright available", 'run with NODE_PATH="$(npm root -g)"'); return finish(); }
  const server = spawn("python3", ["-m", "http.server", String(PORT), "--bind", "127.0.0.1"], { cwd: ROOT, stdio: "ignore" });
  const up = await waitHttp(PAGE, 8000);
  check(up, "B0 documented launch: `python3 -m http.server " + PORT + "` from the repository root serves demos/destination-survey.html", PAGE);
  try {
    const chromium = await pw.chromium.launch({ args: ["--js-flags=--expose-gc"] });
    await mainSuite(chromium);
    await reducedMotionSuite(chromium);
    await firstBloomSeam(chromium);
    await chromium.close();
    if (FIREFOX) { let ff = null; try { ff = await pw.firefox.launch(); } catch (err) { info("Firefox", "not available: " + err.message.split("\n")[0]); }
      if (ff) { await firefoxSmoke(ff); await ff.close(); } }
    { let wk = null; try { wk = await pw.webkit.launch(); info("WebKit", "available"); await wk.close(); } catch (err) { info("WebKit (Safari engine)", "not available on this machine: " + err.message.split("\n")[0].slice(0, 140)); } }
    if (GPU) { try { const g = await pw.chromium.launch({ args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] }); await gpuSample(g); await g.close(); }
      catch (err) { info("GPU sample", "unavailable: " + err.message.split("\n")[0]); } }
  } catch (err) { check(false, "browser suite crashed", err.stack); }
  finally { server.kill(); }
  return finish();

  function finish() {
    const checks = results.filter(r => !r.info);
    fs.writeFileSync(path.join(OUT, "qa-results.json"), JSON.stringify({ when: new Date().toISOString(), head: git("rev-parse HEAD").trim(), passed: checks.filter(r => r.ok).length, failed: fails, results }, null, 1));
    console.log(`\n${checks.length - fails}/${checks.length} passed`); process.exit(fails ? 1 : 0);
  }
})();
