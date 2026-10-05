// BLOOM-027D — PlanetSphereView productionization QA (structural + behavioural; no exact-pixel GPU assertions).
//
//   NODE_PATH="$(npm root -g)" node docs/evidence/bloom-027d/qa-sphere-production.js [--shots] [--no-firefox] [--no-gpu] [--port 8768]
//
// Part N (Node): isolation from the accepted 027C state (3763641) and the accepted generator (f6bca30), the deterministic
//   texture suite (tools/sphere-texture-check.js), and static component hygiene (no DOM ids, no module state, relative three).
// Part B (Chromium, demos/planet-sphere.html): the 027C sphere QA ported to the production component (yaw only, idle, picking
//   at the cut, uploads, resize, DPR, reduced motion), plus the production API: callbacks, setInteractionEnabled, setYaw,
//   lifecycle / disposal, repeated create-destroy, independent instances, render-on-demand.
// Part G (Chromium, demos/planet-sphere-grid.html): nine globes on ONE shared renderer vs nine contexts.
// Firefox smoke; file:// probe (documents the HTTP requirement); optional GPU timing sample.
// --shots writes the evidence screenshots next to this file. Results → qa-results.json. Exit 1 on any failure.
"use strict";
const path = require("path"), fs = require("fs"), { spawn, spawnSync, execSync } = require("child_process"), http = require("http");
const ROOT = path.resolve(__dirname, "../../.."), OUT = __dirname;
const argv = process.argv.slice(2), SHOTS = argv.includes("--shots"), FIREFOX = !argv.includes("--no-firefox"), GPU = !argv.includes("--no-gpu");
const PORT = +(argv[argv.indexOf("--port") + 1] || 0) || 8768;
const BASE_027C = "3763641", BASE_GEN = "f6bca30";
const HOST = `http://127.0.0.1:${PORT}`, DEMO = `${HOST}/demos/planet-sphere.html`, GRID = `${HOST}/demos/planet-sphere-grid.html`;
const EVIDENCE = ["ocean6", "ocean36", "frozen7", "desert5", "desert25", "frozen25", "ocean40"];
const OLD_TEXTURE_SRC = execSync(`git show ${BASE_027C}:demos/planet-sphere/planet-projection.js`, { cwd: ROOT }).toString();

const results = []; let fails = 0;
const J = o => JSON.stringify(o);
const check = (ok, name, detail = "") => { results.push({ ok: !!ok, name, detail: String(detail) }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); if (!ok) fails++; };
const info = (name, detail) => { results.push({ ok: true, info: true, name, detail: typeof detail === "string" ? detail : J(detail) }); console.log(`INFO  ${name}  — ${typeof detail === "string" ? detail : J(detail)}`); };

// Installed before any page script: live event listeners, ResizeObservers and WebGL contexts (leak accounting)
const INIT = () => {
  const L = window.__LEAK = { listeners: 0, observers: 0, glCreated: 0, contextWarnings: 0 }, fid = new WeakMap(); let nid = 0;
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
  const ow = console.warn; console.warn = function (...a) { if (/too many active webgl contexts/i.test(String(a[0]))) L.contextWarnings++; return ow.apply(this, a); };
};

(async () => {
  // ================================================================ Part N — Node
  const changedSince = base => [...new Set([...execSync(`git diff --name-only ${base}`, { cwd: ROOT }).toString().split("\n"),
    ...execSync("git ls-files --others --exclude-standard", { cwd: ROOT }).toString().split("\n")].filter(Boolean))];
  { const ch = changedSince(BASE_027C);
    const ALLOWED = [/^resources\/planet-sphere\//, /^demos\/planet-sphere(-spike|-grid)?\.html$/, /^demos\/planet-sphere\//, /^docs\/evidence\/bloom-027d\//, /^docs\/PLANET_SPHERE_VIEW_v1\.md$/, /^tools\/sphere-texture-check\.js$/];
    const stray = ch.filter(f => !ALLOWED.some(r => r.test(f)));
    check(!stray.length, `N1 only the sphere component, its demo pages, the new texture suite, the handoff doc and 027D evidence changed since ${BASE_027C}`, stray.length ? "stray: " + stray.join(", ") : `${ch.length} path(s)`); }
  { const PROTECTED = ["resources/bloom-sim.js", "resources/bloom-gen.js", "resources/bloom-validate.js", "resources/bloom-witness.js", "resources/bloom-archetype.js",
      "resources/bloom-scenario.js", "resources/bloom-play.js", "resources/bloom-play-worker.js", "content", "planets", "index.html", "demos/demo-run.html", "demos/demo-surface.html", "demos/ui-mockups", "GAME_BIBLE.md"];
    const d = execSync(`git diff --name-only ${BASE_GEN} -- ${PROTECTED.join(" ")}`, { cwd: ROOT }).toString().trim();
    const tools = execSync(`git diff --name-only ${BASE_GEN} -- tools`, { cwd: ROOT }).toString().trim().split("\n").filter(Boolean).filter(f => f !== "tools/sphere-texture-check.js");
    check(!d && !tools.length, `N2 generator, simulation, validators, content, planets, game shell, run page and UI mockups byte-identical to the accepted generator ${BASE_GEN}; existing tools untouched`, d || tools.join(", ") || PROTECTED.length + " protected paths"); }
  { const r = spawnSync(process.execPath, [path.join(ROOT, "tools/sphere-texture-check.js")], { cwd: ROOT }).stdout.toString();
    const pass = (r.match(/^PASS/gm) || []).length, fail = (r.match(/^FAIL/gm) || []).length;
    check(fail === 0 && /ALL CHECKS PASS/.test(r), "N3 tools/sphere-texture-check.js (deterministic stipple-wrap + texture suite) is green", `${pass} pass / ${fail} fail`); }
  { const src = f => fs.readFileSync(path.join(ROOT, "resources/planet-sphere", f), "utf8");
    const view = src("planet-sphere-view.js"), tex = src("planet-texture.js"), code = s => s.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
    const dom = /getElementById|querySelector|document\.body|location\.|localStorage|sessionStorage/.test(code(view) + code(tex));
    const topState = /^(let|var) /m.test(code(view) + code(tex)), win = /window\.[A-Za-z_$]+\s*=[^=]/.test(code(view) + code(tex));
    const imp = [...code(view).matchAll(/import .* from "([^"]+)"/g)].map(m => m[1]), texImp = /^\s*import /m.test(code(tex));
    check(!dom && !topState && !win && J(imp) === J(["./vendor/three-0.185.1/three.module.min.js", "./planet-texture.js"]) && !texImp,
      "N4 component hygiene: no DOM ids / selectors / storage / globals written, no module-level mutable state; three is imported by relative path (no import map needed); the texture module imports nothing",
      `imports ${J(imp)} · texture imports ${texImp}`); }


  // ---------------------------------------------------------------- helpers
  function finish() {
    const checks = results.filter(r => !r.info);
    fs.writeFileSync(path.join(OUT, "qa-results.json"), JSON.stringify({ when: new Date().toISOString(), head: execSync("git rev-parse HEAD", { cwd: ROOT }).toString().trim(),
      passed: checks.filter(r => r.ok).length, failed: fails, results }, null, 1));
    console.log(`\n${checks.length - fails}/${checks.length} passed`); process.exit(fails ? 1 : 0);
  }
  function waitHttp(url, ms) { const t0 = Date.now(); return new Promise(res => { const go = () => http.get(url, r => { r.resume(); res(r.statusCode === 200); })
    .on("error", () => Date.now() - t0 > ms ? res(false) : setTimeout(go, 150)); go(); }); }
  async function openPage(browser, url, ctxOpts = {}, ready = "window.SPHERE_DEMO && SPHERE_DEMO.ready && SPHERE_DEMO.view") {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, ...ctxOpts });
    await ctx.addInitScript(INIT);
    const page = await ctx.newPage(), log = { errors: [], failed: [] };
    page.on("console", m => { if (m.type() === "error") log.errors.push(m.text()); });
    page.on("pageerror", err => log.errors.push("pageerror: " + err.message));
    page.on("requestfailed", r => log.failed.push(r.url()));
    page.on("response", r => { if (r.status() >= 400) log.failed.push(r.status() + " " + r.url()); });
    await page.goto(url);
    await page.waitForFunction(ready, null, { timeout: 90000 });
    await page.waitForTimeout(300);
    return { ctx, page, log };
  }
  function settled(page) { return page.waitForFunction(() => { const v = SPHERE_DEMO.view; return !v.interacting && v.vYaw === 0 && !v.anim && Math.abs(v.targetYaw - v.yaw) < 1e-6; }, null, { timeout: 15000 }); }
  const state = page => page.evaluate(() => SPHERE_DEMO.view.state());
  const box = page => page.evaluate(() => { const r = SPHERE_DEMO.view.container.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height, left: r.left, top: r.top }; });
  async function loadPreset(page, key) { await page.evaluate(k => SPHERE_DEMO.load(SPHERE_DEMO.presets.find(p => p.key === k)), key); await page.waitForTimeout(150); }
  async function shot(page, name, clip) { await page.screenshot({ path: path.join(OUT, name), ...(clip ? { clip } : {}) }); }
  // screen position (NDC) of the north pole and |x| + |z| of the globe quaternion (0 = a pure rotation about the vertical axis)
  const axis = page => page.evaluate(() => { const v = SPHERE_DEMO.view, V = v._globe.position.constructor; v._applyOrientation(); v.scene.updateMatrixWorld();
    const p = v._globe.localToWorld(new V(0, 1, 0)).project(v.camera), q = v._globe.quaternion; return { pole: [+p.x.toFixed(6), +p.y.toFixed(6)], tilt: Math.abs(q.x) + Math.abs(q.z) }; });
  const globeBBox = page => page.evaluate(() => { const v = SPHERE_DEMO.view, R = v.renderer; R.render(); const gl = R.three.getContext(), w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, px = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px); let x0 = w, y0 = h, x1 = -1, y1 = -1; // background #0b0e14
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4; if (Math.abs(px[i] - 11) + Math.abs(px[i + 1] - 14) + Math.abs(px[i + 2] - 20) > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
    return x1 < 0 ? null : { width: x1 - x0 + 1, height: y1 - y0 + 1, bufferWidth: w, bufferHeight: h }; });
  const leak = page => page.evaluate(() => ({ listeners: __LEAK.listeners, observers: __LEAK.observers, liveGL: __LEAK.liveGL(), glCreated: __LEAK.glCreated, contextWarnings: __LEAK.contextWarnings }));

  /** 027C cut picks, ported: raycast exactly on longitude zero and either side of it for every on-screen row. */
  function cutPicks(page, cutDeg, mode) {
    return page.evaluate(({ cutDeg, mode }) => {
      const S = SPHERE_DEMO, v = S.view, p = S.planet, W = p.gridWidth, H = p.gridHeight, T = p.tilemap, V = v._globe.position.constructor;
      v.lookAt(((-cutDeg / 360) % 1 + 1) % 1); v._applyOrientation(); v.scene.updateMatrixWorld();
      const r = v.container.getBoundingClientRect(), rows = [];
      for (let y = 0; y < H; y++) {
        const lat = (90 - 180 * (y + 0.5) / H) * Math.PI / 180, th = Math.PI / 2 - lat;
        const w = v._globe.localToWorld(new V(-Math.sin(th), Math.cos(th), 0)), visible = w.z > 1 / v.distance + 0.03;
        const s = w.clone().project(v.camera), cx = r.left + (s.x + 1) / 2 * r.width, cy = r.top + (1 - s.y) / 2 * r.height;
        const scr = phi => { const q = v._globe.localToWorld(new V(-Math.cos(phi) * Math.sin(th), Math.cos(th), Math.sin(phi) * Math.sin(th))).project(v.camera); return [r.left + (q.x + 1) / 2 * r.width, r.top + (1 - q.y) / 2 * r.height]; };
        const [lx, ly] = mode === "tile" ? scr(2 * Math.PI * (W - 0.5) / W) : [cx - 1, cy], [rx, ry] = mode === "tile" ? scr(2 * Math.PI * 0.5 / W) : [cx + 1, cy];
        const reg = h => h && { u: h.uv.u, analytic: !!h.analytic, ...h.region, truth: T[h.region.index] };
        rows.push({ y, visible, L: reg(v.pickAt(lx, ly)), R: reg(v.pickAt(rx, ry)), O: reg(v.pickAt(cx, cy)), truthL: T[y * W + W - 1], truthR: T[y * W] });
      }
      return rows;
    }, { cutDeg, mode });
  }
  function judgeCut(rows) {
    rows = rows.filter(r => r.visible);
    let ok = 0, bad = [], same = 0, diff = 0, water = 0, coast = 0, analytic = 0, onLineOk = 0;
    for (const r of rows) {
      const auth = h => h && h.sectionIndex === (h.truth < 0 ? -1 : h.truth) && h.water === (h.truth < 0);
      const pairOk = r.L && r.R && r.L.y === r.R.y ? ((r.L.truth >= 0 && r.L.truth === r.R.truth) === (r.L.sectionId !== null && r.L.sectionId === r.R.sectionId)) : true;
      if (r.L && r.R && r.L.x === 59 && r.R.x === 0 && auth(r.L) && auth(r.R) && pairOk) ok++; else bad.push(r.y);
      if (r.truthL >= 0 && r.truthL === r.truthR) same++; else if (r.truthL >= 0 && r.truthR >= 0) diff++; else if (r.truthL < 0 && r.truthR < 0) water++; else coast++;
      if (r.O && (r.O.x === 0 || r.O.x === 59) && auth(r.O)) onLineOk++;
      analytic += [r.L, r.R, r.O].filter(h => h && h.analytic).length;
    }
    return { ok, bad, same, diff, water, coast, analytic, onLineOk, n: rows.length, rows: rows.length ? `${rows[0].y}–${rows[rows.length - 1].y}` : "none" };
  }
  /** rAF timing over n frames + how many frames the sphere renderer(s) actually drew. */
  const framePerf = (page, expr, n = 180) => page.evaluate(async ({ expr, n }) => { const hosts = eval(expr); const r0 = hosts.map(h => h.renders);
    const t = []; let last = performance.now(); await new Promise(res => { const f = now => { t.push(now - last); last = now; t.length < n ? requestAnimationFrame(f) : res(); }; requestAnimationFrame(f); });
    t.shift(); const s = t.slice().sort((a, b) => a - b);
    return { meanFrameMs: +(t.reduce((a, b) => a + b, 0) / t.length).toFixed(2), p95FrameMs: +s[Math.floor(s.length * 0.95)].toFixed(2), drawnFrames: hosts.map((h, i) => h.renders - r0[i]).reduce((a, b) => a + b, 0), ticks: t.length + 1,
      gl: (() => { const g = hosts[0].three.getContext(), x = g.getExtension("WEBGL_debug_renderer_info"); return x ? g.getParameter(x.UNMASKED_RENDERER_WEBGL) : g.getParameter(g.RENDERER); })() }; }, { expr, n });

  // ================================================================ Part B — the demo page
  async function demoSuite(browser) {
    const o = await openPage(browser, DEMO + "?planet=ocean6&idle=0"), page = o.page;

    // ---- B1 evidence worlds: same production worlds as Node, 60×40 cylinders, 480×240, one upload per world
    { for (const f of ["content/config.js", "content/traits.js", "planets/first_bloom.js", "content/archetypes.js", "resources/bloom-sim.js", "resources/bloom-gen.js", "resources/bloom-validate.js", "resources/bloom-witness.js", "resources/bloom-archetype.js"]) require(path.join(ROOT, f));
      const { BLOOM, BLOOM_DATA } = globalThis, ref = { ocean6: ["ocean_archipelago", 6], ocean36: ["ocean_archipelago", 36], frozen7: ["frozen_world", 7], desert5: ["desert_world", 5], desert25: ["desert_world", 25], frozen25: ["frozen_world", 25], ocean40: ["ocean_archipelago", 40] };
      const names = Object.fromEntries(Object.entries(ref).map(([k, [a, s]]) => [k, BLOOM.generateFromArchetype(BLOOM_DATA.archetypes.find(x => x.id === a), s, { config: BLOOM_DATA.config, traits: BLOOM_DATA.traits }).name]));
      const u0 = (await state(page)).textureUploads, loads = [];
      for (const k of EVIDENCE) { await loadPreset(page, k); loads.push(await page.evaluate(k => { const S = SPHERE_DEMO, s = S.view.state(); return { k, topo: S.planet.topology, W: S.planet.gridWidth, H: S.planet.gridHeight, tex: [s.textureWidth, s.textureHeight], name: S.view.planet.name, up: s.textureUploads }; }, k)); }
      check(loads.every(l => J(l.topo) === J({ wrapX: true, wrapY: false }) && l.W === 60 && l.H === 40 && J(l.tex) === J([480, 240]) && l.name === names[l.k]) && loads[loads.length - 1].up - u0 === EVIDENCE.length - 1 + (loads[0].k === "ocean6" ? 0 : 1),
        "B1 the browser shows the same production worlds as Node: 60×40 cylinders, 480×240 texture, one upload per new world", loads.map(l => `${l.k}=${l.name}`).join(" ")); }

    // ---- B2 yaw only
    await loadPreset(page, "ocean6");
    { const c = await box(page), a0 = await axis(page), s0 = await state(page);
      await page.mouse.move(c.x, c.y); await page.mouse.down(); for (let i = 1; i <= 20; i++) await page.mouse.move(c.x + i * 12, c.y + i * 10); await page.mouse.up(); await settled(page);
      const s1 = await state(page), a1 = await axis(page);
      await page.mouse.move(c.x, c.y - 100); await page.mouse.down(); for (let i = 1; i <= 20; i++) await page.mouse.move(c.x, c.y - 100 + i * 12); await page.mouse.up(); await settled(page);
      const s2 = await state(page), a2 = await axis(page);
      await page.focus("#globe"); for (const k of ["ArrowUp", "ArrowUp", "ArrowDown", "PageUp", "PageDown"]) await page.keyboard.press(k); await page.waitForTimeout(300); await settled(page);
      const s3 = await state(page), a3 = await axis(page);
      for (const k of ["ArrowRight", "ArrowRight"]) await page.keyboard.press(k); await settled(page);
      const s4 = await state(page);
      await page.mouse.move(c.x, c.y); await page.mouse.wheel(0, -400); await page.waitForTimeout(400); const a5 = await axis(page);
      await page.mouse.wheel(0, 400); await page.waitForTimeout(200);
      const all = [a0, a1, a2, a3, a5];
      check(all.every(a => a.tilt < 1e-12), "B2a the globe's rotation is a pure rotation about its vertical axis through diagonal drag, vertical drag, ↑/↓/PgUp/PgDn, ←/→ and wheel zoom (no pitch, no roll)", J(all.map(a => a.tilt)));
      check(Math.abs(s1.yaw - s0.yaw) > 0.3 && Math.abs(s2.yaw - s1.yaw) < 1e-6 && Math.abs(s3.yaw - s2.yaw) < 1e-6 && Math.abs(s4.yaw - s3.yaw - 0.24) < 0.02,
        "B2b horizontal drag and ←/→ spin the globe; a pure vertical drag and ↑/↓ change nothing",
        `diagonal Δyaw ${(s1.yaw - s0.yaw).toFixed(3)} · vertical Δyaw ${(s2.yaw - s1.yaw).toExponential(1)} · ↑↓ Δyaw ${(s3.yaw - s2.yaw).toExponential(1)} · →→ Δyaw ${(s4.yaw - s3.yaw).toFixed(3)}`);
      check([a0, a1, a2, a3].every(a => Math.abs(a.pole[0]) < 1e-6 && Math.abs(a.pole[1] - a0.pole[1]) < 1e-6) && Math.abs(a5.pole[0]) < 1e-6,
        "B2c the axis never moves on screen: the north pole stays top-centre through every drag (a physical globe on a fixed axis); no view over a pole", `pole NDC ${J(a0.pole)} → ${J(a1.pole)} → ${J(a2.pole)} → ${J(a3.pole)} · zoomed ${J(a5.pole)}`);
      const api = await page.evaluate(() => { const V = SPHERE_DEMO.view, P = V.constructor;
        const names = [...Object.getOwnPropertyNames(P.prototype), ...Object.keys(V)].filter(n => /pitch|tilt|roll|orbit/i.test(n));
        const div = document.createElement("div"); Object.assign(div.style, { position: "fixed", left: "0", top: "0", width: "200px", height: "200px" }); document.body.appendChild(div);
        const t = new P(div, { planet: SPHERE_DEMO.view.planet, pitch: 0.7, tilt: 0.7, roll: 0.3, autoRotate: false }); t._applyOrientation(); const q = t._globe.quaternion, tilt = Math.abs(q.x) + Math.abs(q.z); t.dispose(); div.remove();
        V.lookAt(0.3); const c = V.state().centerU; return { names, tilt, c }; });
      check(!api.names.length && api.tilt === 0 && Math.abs(api.c - 0.3) < 1e-9, "B2d there is no pitch / tilt / roll API: such options are ignored; lookAt(u) is longitude only", J(api)); }

    // ---- B3 idle: horizontal only, stops the moment interaction starts, ramps back after the delay
    { const tDown = await page.evaluate(async () => { const v = SPHERE_DEMO.view; v.setAutoRotate(true); v.lastInteraction = performance.now() - 1e5;
        const tr = SPHERE_DEMO._tr = [], orig = v._step; v._step = function (now, dt) { const r = orig.call(this, now, dt); const q = this._globe.quaternion; tr.push([now, this.yaw, this.idleFactor, this.interacting ? 1 : 0, Math.abs(q.x) + Math.abs(q.z)]); return r; };
        await new Promise(r => setTimeout(r, 700)); return performance.now(); });
      const c = await box(page);
      await page.mouse.move(c.x, c.y); await page.mouse.down(); const tPressed = await page.evaluate(() => performance.now());
      await page.mouse.move(c.x - 30, c.y, { steps: 5 }); await page.waitForTimeout(200); await page.mouse.up(); // held still 200 ms → no fling
      const tUp = await page.evaluate(() => performance.now());
      await page.waitForTimeout(6200);
      const tr = await page.evaluate(() => { const v = SPHERE_DEMO.view; v.setAutoRotate(false); delete v._step; return SPHERE_DEMO._tr; });
      const before = tr.filter(r => r[0] < tDown), during = tr.filter(r => r[0] > tPressed && r[0] < tUp), after = tr.filter(r => r[0] > tUp);
      const rotatingBefore = before.length > 10 && before[before.length - 1][1] > before[0][1] && before[before.length - 1][2] === 1;
      const stoppedAtOnce = during.filter(r => r[3] === 1).length > 3 && during.every(r => r[2] === 0); // tUp is taken after mouse.up() returns, so the window ends with a few released frames
      const pausedAfter = after.filter(r => r[0] - tUp < 2500 && r[0] - tUp > 300).every(r => r[2] === 0);
      const resumed = after.find(r => r[2] > 0), resumedAfter = resumed ? resumed[0] - tUp : null, full = after.find(r => r[2] === 1);
      check(rotatingBefore && stoppedAtOnce && pausedAfter && resumed && resumedAfter > 2900 && resumedAfter < 4200 && full && tr.every(r => r[4] < 1e-12),
        "B3 idle spin is horizontal only, is zero from the first frame of a press, and ramps back in ~3 s after release (full speed ~1.5 s later)",
        `idle before ${rotatingBefore} · paused after release ${pausedAfter} · stopped at once ${stoppedAtOnce} · during press ${during.length} frames all idleFactor 0 · resumed ${resumedAfter && (resumedAfter / 1000).toFixed(2)} s after release · full speed ${full && ((full[0] - tUp) / 1000).toFixed(2)} s · max |qx|+|qz| ${Math.max(...tr.map(r => r[4]))}`); }

    // ---- B4 the 027C picking fixes: UV → tile → region on both sides of longitude zero (every evidence world, three cut positions)
    { const totals = { ok: 0, n: 0, same: 0, diff: 0, water: 0, coast: 0, analytic: 0, onLineOk: 0 }, rowsBy = {};
      for (const k of EVIDENCE) { await loadPreset(page, k);
        for (const cutDeg of [0, 30, -30]) for (const m of ["px1", "tile"]) { const v = judgeCut(await cutPicks(page, cutDeg, m)); for (const key of Object.keys(totals)) totals[key] += v[key]; rowsBy[cutDeg] = v.rows;
          if (v.bad.length) console.log(`   ${k} cut ${cutDeg}° ${m} bad rows ${v.bad}`); } }
      check(totals.ok === totals.n && totals.n > 1000, "B4a (027C fix kept) picks just west (x = 59) and just east (x = 0) of longitude zero resolve to the tilemap's own region on each side",
        `${totals.ok}/${totals.n} row-picks [cut 0°: rows ${rowsBy[0]}, ±30°: ${rowsBy[30]}] · same ${totals.same} · different ${totals.diff} · coast ${totals.coast} · water ${totals.water}`);
      check(totals.onLineOk === totals.n && totals.analytic > 0, "B4b (027C fix kept) a ray exactly ON the meridian resolves to an adjacent cut tile, never null — the analytic longitude-zero fallback is live", `${totals.onLineOk}/${totals.n} · analytic fallback used ${totals.analytic}×`);
      const zoomPick = await page.evaluate(() => { const v = SPHERE_DEMO.view, r = v.container.getBoundingClientRect(), x = r.left + r.width / 2 + v.radiusPx * 0.6, y = r.top + r.height / 2;
        v.setAutoRotate(false); v.lookAt(0.37); const a = v.pickAt(x, y); v.setDistance(2.2); const b = v.pickAt(x, y); const c = v.pickAt(x, y, { forceAnalytic: true }); v.setDistance(4.2);
        return { far: a.uv.u, near: b.uv.u, analyticNear: c.uv.u }; });
      check(Math.abs(zoomPick.near - zoomPick.analyticNear) < 2e-3 && Math.abs(zoomPick.near - zoomPick.far) > 0.005, "B4c (027C fix kept) a pick straight after a zoom change sees the NEW camera (matrices synced before picking, no frame in between)", J(zoomPick));
      const agree = await page.evaluate(() => { const v = SPHERE_DEMO.view, r = v.container.getBoundingClientRect(); v.lookAt(0.37); let same = 0, n = 0, maxDu = 0;
        for (let i = 0; i < 40; i++) for (let j = 0; j < 40; j++) { const x = r.left + r.width * (0.3 + 0.4 * i / 39), y = r.top + r.height * (0.12 + 0.76 * j / 39), a = v.pickAt(x, y), b = v.pickAt(x, y, { forceAnalytic: true });
          if (!a || !b || a.analytic) continue; n++; if (a.region.index === b.region.index) same++; maxDu = Math.max(maxDu, Math.abs(a.uv.u - b.uv.u)); }
        return { same, n, maxDu }; });
      check(agree.n > 1000 && agree.same / agree.n > 0.99, "B4d the analytic fallback agrees with the mesh UV (same tile)", `${agree.same}/${agree.n} · max |Δu| ${agree.maxDu.toExponential(2)}`);
      const reach = await page.evaluate(async () => { const v = SPHERE_DEMO.view, r = v.container.getBoundingClientRect(), rows = new Set(); v.lookAt(0.37);
        for (let py = r.top; py < r.bottom; py += 2) for (let px = r.left; px < r.right; px += 4) { const h = v.pickAt(px, py); if (h) rows.add(h.region.y); }
        const a = [...rows].sort((x, y) => x - y); return { firstRow: a[0], lastRow: a[a.length - 1] }; });
      info("B4e polar rows outside the fixed equatorial view (accepted by the PMO; not a requirement)", J(reach)); }

    // ---- B5 texture uploads: never per frame; re-applying the same planet uploads nothing; a real change uploads once
    { await loadPreset(page, "ocean6");
      const u = await page.evaluate(async () => { const S = SPHERE_DEMO, v = S.view; v.setAutoRotate(true); v.lastInteraction = -1e9;
        const u0 = v.textureUploads, ver0 = v.texture.version, f0 = v.renderer.renders;
        await new Promise(r => setTimeout(r, 1500)); const spin = { uploads: v.textureUploads - u0, ver: v.texture.version - ver0, drawn: v.renderer.renders - f0 };
        const tr = performance.now(); S.reapply(); S.reapply(); S.reapply(); const reapplyMs = +((performance.now() - tr) / 3).toFixed(2), same = v.textureUploads - u0;
        S.setDiag({ boundaries: true }); S.setDiag({ boundaries: false }); S.setHighlight("sec_1"); const toggles = v.textureUploads - u0 - same;
        await new Promise(r => setTimeout(r, 200)); v.setAutoRotate(false); return { ...spin, sameAgain: same, reapplyMsInclDemoPreview: reapplyMs, threeToggles: toggles, version: v.texture.version - ver0 }; });
      const sameMs = await page.evaluate(() => { const v = SPHERE_DEMO.view, p = v.planet; v.setPlanet(p); const u = v.textureUploads, t = performance.now(); for (let i = 0; i < 50; i++) v.setPlanet(p);
        const ms = +((performance.now() - t) / 50).toFixed(3), extra = v.textureUploads - u; SPHERE_DEMO.reapply(); return { ms, extraUploads: extra }; });
      info("B5 cost of setPlanet with unchanged content (signature only, no draw, no upload)", sameMs);
      check(u.uploads === 0 && u.ver === 0 && u.drawn > 30 && u.sameAgain === 0 && u.threeToggles === 3 && u.version === 3,
        "B5 no texture upload while rotating; setPlanet with an unchanged source uploads nothing; each real change uploads exactly once", J(u)); }

    // ---- B6 hover at the cut through the real pointer path (the optional pick helper)
    { await loadPreset(page, "ocean6"); await page.evaluate(() => { SPHERE_DEMO.setHighlight(null); SPHERE_DEMO.view.lookAt(0); });
      const hov = [];
      for (const dx of [-3, 3]) { const y = await page.evaluate(() => { const v = SPHERE_DEMO.view, r = v.container.getBoundingClientRect(); return r.top + r.height / 2 - v.radiusPx * Math.sin(20 * Math.PI / 180); });
        const c = await box(page); await page.mouse.move(c.x + dx, y); await page.waitForTimeout(250); hov.push(await page.evaluate(() => SPHERE_DEMO.hover)); }
      check(hov[0] && hov[1] && hov[0].x === 59 && hov[1].x === 0 && hov[0].y === hov[1].y && hov[0].sectionId === "sec_13" && hov[1].sectionId === "sec_13",
        "B6 pointer hover 3 px either side of the cut on Ocean 6: tiles (59, y) and (0, y), both sec_13 Moss Steppe", J(hov.map(h => h && [h.x, h.y, h.sectionId])));
      await page.mouse.move(5, 5); }

    // ---- B7 render on demand: a still globe draws nothing
    { const d = await page.evaluate(async () => { const v = SPHERE_DEMO.view; v.setAutoRotate(false); await new Promise(r => setTimeout(r, 400)); const f0 = v.renderer.frames, r0 = v.renderer.renders;
        await new Promise(r => setTimeout(r, 1000)); return { ticks: v.renderer.frames - f0, drawn: v.renderer.renders - r0 }; });
      check(d.ticks > 30 && d.drawn === 0, "B7 render on demand: with no idle spin and no input, the loop ticks but draws 0 frames (no GPU work for a still globe)", J(d)); }

    // ---- B8 performance + B9 drag smoothness
    { const perf = await framePerf(page, "(SPHERE_DEMO.view.setAutoRotate(true), SPHERE_DEMO.view.lastInteraction = -1e9, [SPHERE_DEMO.view.renderer])");
      const pick = await page.evaluate(() => { const v = SPHERE_DEMO.view, r = v.container.getBoundingClientRect(), t = performance.now(); for (let i = 0; i < 200; i++) v.pickAt(r.left + r.width * (0.3 + 0.002 * i), r.top + r.height * 0.5); v.setAutoRotate(false); return +((performance.now() - t) / 200).toFixed(3); });
      const tex = await page.evaluate(() => { const S = SPHERE_DEMO, t = performance.now(); for (let i = 0; i < 20; i++) S.setDiag({ grid: i % 2 === 0 }); S.setDiag({ grid: false }); return +((performance.now() - t) / 21).toFixed(2); });
      info("B8 performance, headless Chromium (software GL) — one globe", { ...perf, pickMs: pick, setPlanetWithChangeMs: tex });
      check(perf.drawnFrames > 100 && pick < 2, "B8 idle rotation draws every frame; pick < 2 ms", J({ drawn: perf.drawnFrames, pickMs: pick, meanFrameMs: perf.meanFrameMs }));
      const drag = await page.evaluate(async () => { const v = SPHERE_DEMO.view, el = v.container, r = el.getBoundingClientRect(); v.setAutoRotate(false);
        const tr = [], orig = v._step; v._step = function (now, dt) { const res = orig.call(this, now, dt); tr.push([now, this.yaw]); return res; };
        const ev = (type, x) => el.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: r.top + r.height / 2, pointerId: 1, button: 0, bubbles: true }));
        const x0 = r.left + r.width * 0.3; ev("pointerdown", x0); for (let i = 1; i <= 60; i++) { await new Promise(res => requestAnimationFrame(res)); ev("pointermove", x0 + i * 6); } ev("pointerup", x0 + 360);
        await new Promise(res => setTimeout(res, 800)); delete v._step;
        const d = []; for (let i = 1; i < tr.length; i++) d.push([tr[i][0] - tr[i - 1][0], tr[i][1] - tr[i - 1][1]]);
        const mid = d.slice(8, 55); return { frames: tr.length, midStalls: mid.filter(x => Math.abs(x[1]) < 1e-5).length, monotonic: mid.every(x => x[1] >= 0) }; });
      check(drag.midStalls === 0 && drag.monotonic, "B9 a steady drag moves the globe every frame, in one direction", J(drag)); }

    // ---- B10 callbacks + setInteractionEnabled + setYaw
    { await settled(page);
      const cb = await page.evaluate(async () => { const S = SPHERE_DEMO, v = S.view, el = v.container, r = el.getBoundingClientRect(), y = r.top + r.height / 2; S.interactionEvents.length = 0;
        const ev = (type, x, id = 7) => el.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, pointerId: id, button: 0, bubbles: true }));
        const frame = () => new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res)));
        ev("pointerdown", r.left + 300); ev("pointermove", r.left + 360); ev("pointerup", r.left + 360); await frame();
        const one = S.interactionEvents.map(e => e[0]).join(",");
        const attrsOn = { tabindex: el.getAttribute("tabindex"), aria: !!el.getAttribute("aria-label"), touch: el.style.touchAction, cursor: el.style.cursor };
        v.setYaw(v.getYaw()); // stop the fling of the drag above (public API: setYaw cancels fling)
        v.setInteractionEnabled(false); const y0 = v.targetYaw; S.interactionEvents.length = 0;
        ev("pointerdown", r.left + 300); ev("pointermove", r.left + 420); ev("pointerup", r.left + 420); el.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })); await frame();
        const offMoved = v.targetYaw - y0, offEvents = S.interactionEvents.length;
        const attrsOff = { tabindex: el.getAttribute("tabindex"), aria: el.getAttribute("aria-label"), touch: el.style.touchAction, cursor: el.style.cursor };
        v.setInteractionEnabled(true); ev("pointerdown", r.left + 300); ev("pointermove", r.left + 330); v.setInteractionEnabled(false); // disabled mid-drag
        const midDrag = { interacting: v.interacting, events: S.interactionEvents.map(e => e[0]).join(",") }; ev("pointerup", r.left + 330); v.setInteractionEnabled(true);
        v.setYaw(1.0); const sy = { yaw: v.getYaw(), centerU: v.state().centerU }; v.setYaw(-0.5, { animate: true }); await new Promise(res => setTimeout(res, 900));
        return { one, attrsOn, offMoved, offEvents, attrsOff, midDrag, sy, animEnd: v.getYaw() }; });
      check(cb.one === "start,end" && cb.offMoved === 0 && cb.offEvents === 0 && cb.midDrag.events === "start,end" && !cb.midDrag.interacting,
        "B10a onInteractionStart / onInteractionEnd fire once per drag; with interaction disabled a drag or key does nothing and fires nothing; disabling mid-drag ends the drag (end fires)", J({ one: cb.one, offMoved: cb.offMoved, offEvents: cb.offEvents, midDrag: cb.midDrag }));
      check(cb.attrsOn.tabindex === "0" && cb.attrsOn.aria && cb.attrsOn.touch === "pan-y" && cb.attrsOff.tabindex === null && cb.attrsOff.aria === null && cb.attrsOff.touch === "" && cb.attrsOff.cursor === "",
        "B10b an interactive container is focusable, labelled and claims horizontal touch only (touch-action: pan-y, so vertical swipes still scroll the page); disabling restores it", J({ on: cb.attrsOn, off: cb.attrsOff }));
      check(cb.sy.yaw === 1 && Math.abs(cb.sy.centerU - (0.5 - 1 / (2 * Math.PI))) < 1e-12 && Math.abs(cb.animEnd + 0.5) < 1e-9, "B10c setYaw / getYaw (instant and animated); yaw 0 = map centre", J({ sy: cb.sy, animEnd: cb.animEnd })); }

    // ---- B11 resize: window and container; globe stays round and inside its box
    { const sizes = [];
      for (const [w, h] of [[900, 700], [390, 844]]) { await page.setViewportSize({ width: w, height: h }); await page.waitForTimeout(400); sizes.push(await globeBBox(page)); }
      await page.setViewportSize({ width: 1280, height: 800 }); await page.waitForTimeout(300);
      await page.evaluate(() => { document.getElementById("globe").style.right = "300px"; }); await page.waitForTimeout(300); // the container alone changes size
      const cs = await state(page), cbb = await globeBBox(page); await page.evaluate(() => { document.getElementById("globe").style.right = ""; }); await page.waitForTimeout(200);
      const round = b => b && Math.abs(b.width - b.height) <= 3 && b.width <= b.bufferWidth && b.height <= b.bufferHeight;
      check(sizes.every(round) && round(cbb) && cs.box.w === 920 - 300 && cs.bufferWidth === 620, "B11 resize (900×700, phone 390×844, and the container alone shrinking 300 px): globe stays round and inside its box; buffer follows the container", J({ sizes, container: { box: cs.box, buffer: [cs.bufferWidth, cs.bufferHeight], bbox: cbb } })); }
    check(!o.log.errors.length && !o.log.failed.length, "B12 no console errors / failed requests across every world and interaction above", J(o.log));

    // ---- B13 lifecycle: one view created and disposed — listeners, observers, context, canvas, loop, GPU memory, container restored
    { const L0 = await leak(page);
      const d = await page.evaluate(async () => { const { PlanetSphereView } = await import("/resources/planet-sphere/planet-sphere-view.js");
        const div = document.createElement("div"); Object.assign(div.style, { position: "fixed", left: "10px", top: "10px", width: "240px", height: "240px" }); document.body.appendChild(div);
        const before = { style: div.getAttribute("style"), attrs: [...div.attributes].map(a => a.name).join(",") };
        const v = new PlanetSphereView(div, { planet: SPHERE_DEMO.view.planet, onInteractionStart() {}, onInteractionEnd() {} });
        await new Promise(r => setTimeout(r, 300)); const live = { ...__LEAK, liveGL: __LEAK.liveGL(), mem: { ...v.renderer.three.info.memory }, canvas: !!div.querySelector("canvas") };
        const R = v.renderer, gl = R.three.getContext(); v.dispose(); const f0 = R.frames; await new Promise(r => setTimeout(r, 300));
        const after = { style: div.getAttribute("style"), attrs: [...div.attributes].map(a => a.name).join(",") }; div.remove();
        return { live, before, after, memAfter: R.memoryAfterDispose, lost: gl.isContextLost(), canvasLeft: !!div.querySelector("canvas"), framesAfter: R.frames - f0, disposed: v.disposed && R.disposed, dispose2: (() => { try { v.dispose(); R.dispose(); return "ok"; } catch (e) { return e.message; } })() }; });
      const L1 = await leak(page);
      check(d.live.mem.textures === 1 && d.live.mem.geometries === 1 && d.memAfter.textures === 0 && d.memAfter.geometries === 0 && d.lost && !d.canvasLeft && d.framesAfter === 0 && d.disposed && d.dispose2 === "ok" && J(d.before) === J(d.after),
        "B13a dispose(): GPU geometry / texture freed (1 / 1 → 0 / 0), WebGL context lost, canvas removed, loop stopped, container's style and attributes restored exactly; a second dispose is a no-op",
        J({ mem: d.live.mem, memAfter: d.memAfter, lost: d.lost, framesAfter: d.framesAfter, container: [d.before.style, d.after.style] }));
      check(L1.listeners === L0.listeners && L1.observers === L0.observers && L1.liveGL === L0.liveGL && d.live.listeners > L0.listeners,
        "B13b dispose(): every event listener, ResizeObserver and WebGL context it added is gone (live counts back to the page's baseline)", J({ baseline: L0, whileLive: { listeners: d.live.listeners, observers: d.live.observers, liveGL: d.live.liveGL }, after: L1 })); }

    // ---- B14 repeated create / destroy (standalone ×30, shared 9-view ×10): no growth in listeners, observers, contexts or heap
    { const L0 = await leak(page);
      const r = await page.evaluate(async () => { const { PlanetSphereView, PlanetSphereRenderer } = await import("/resources/planet-sphere/planet-sphere-view.js");
        const planet = SPHERE_DEMO.view.planet, frame = () => new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res)));
        const stage = document.createElement("div"); Object.assign(stage.style, { position: "fixed", left: "0", top: "0", width: "600px", height: "600px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)" }); document.body.appendChild(stage);
        gc(); await frame(); const heap0 = performance.memory.usedJSHeapSize;
        for (let i = 0; i < 30; i++) { const v = new PlanetSphereView(stage, { planet }); await frame(); v.dispose(); }
        for (let i = 0; i < 10; i++) { stage.replaceChildren(...Array.from({ length: 9 }, () => document.createElement("div"))); const cells = [...stage.children];
          const host = new PlanetSphereRenderer(stage), views = cells.map(c => new PlanetSphereView(c, { renderer: host, planet })); await frame(); host.dispose(); }
        stage.remove(); for (let i = 0; i < 3; i++) { gc(); await frame(); } const heap1 = performance.memory.usedJSHeapSize;
        return { heapDeltaMB: +((heap1 - heap0) / 1048576).toFixed(2) }; });
      const L1 = await leak(page);
      check(L1.listeners === L0.listeners && L1.observers === L0.observers && L1.liveGL === L0.liveGL && L1.contextWarnings === 0 && Math.abs(r.heapDeltaMB) < 3,
        "B14 30 standalone + 10 × nine-view shared create/destroy cycles: listeners, observers and live WebGL contexts return to baseline, no 'too many contexts' warning, JS heap flat",
        J({ baseline: L0, after: L1, contextsCreated: L1.glCreated - L0.glCreated, ...r })); }

    // ---- B15 independent instances (two standalone + two on one shared renderer)
    { const ind = await page.evaluate(async () => { const { PlanetSphereView, PlanetSphereRenderer } = await import("/resources/planet-sphere/planet-sphere-view.js");
        const D = BLOOM_DATA, gen = (id, s) => BLOOM.archetype.attemptPlanet(D.archetypes.find(a => a.id === id), s, 0).planet;
        const made = [], mk = (x, y) => { const d = document.createElement("div"); made.push(d); Object.assign(d.style, { position: "fixed", left: x + "px", top: y + "px", width: "200px", height: "200px" }); document.body.appendChild(d); return d; };
        const stage = mk(400, 0); stage.style.width = "420px"; const c1 = document.createElement("div"), c2 = document.createElement("div");
        for (const c of [c1, c2]) { Object.assign(c.style, { display: "inline-block", width: "200px", height: "200px" }); stage.appendChild(c); }
        const host = new PlanetSphereRenderer(stage), pa = gen("desert_world", 3), pb = gen("frozen_world", 4);
        const pairs = [[new PlanetSphereView(mk(0, 0), { planet: pa, autoRotate: false }), new PlanetSphereView(mk(200, 0), { planet: pb, autoRotate: false })],
          [new PlanetSphereView(c1, { renderer: host, planet: pa, autoRotate: false }), new PlanetSphereView(c2, { renderer: host, planet: pb, autoRotate: false })]];
        const geo = host.geometry.attributes.position.array, sum0 = geo.reduce((a, b) => a + b, 0), out = [];
        for (const [a, b] of pairs) {
          const b0 = { yaw: b.getYaw(), up: b.textureUploads, sig: b.state().textureSignature, auto: b.autoRotatePref, inter: b.interactive };
          a.setYaw(2.0); a.setAutoRotate(true); a.setInteractionEnabled(false); a.setPlanet(pb); a.setDistance(3);
          await new Promise(r => setTimeout(r, 100));
          out.push({ bYawSame: b.getYaw() === b0.yaw, bUploadsSame: b.textureUploads === b0.up, bSigSame: b.state().textureSignature === b0.sig, bAuto: b.autoRotatePref === b0.auto, bInter: b.interactive === b0.inter, bDist: b.distance === 4.2,
            distinct: a.scene !== b.scene && a.camera !== b.camera && a.texture !== b.texture && a.material !== b.material && a._canvas !== b._canvas,
            aSigNow: a.state().textureSignature === b0.sig }); }
        const sharedGeo = pairs[1][0]._globe.geometry === pairs[1][1]._globe.geometry && geo.reduce((a, b) => a + b, 0) === sum0;
        for (const [a, b] of pairs) { a.dispose(); b.dispose(); } host.dispose(); made.forEach(d => d.remove());
        return { out, sharedGeo }; });
      check(ind.out.every(o => o.bYawSame && o.bUploadsSame && o.bSigSame && o.bAuto && o.bInter && o.bDist && o.distinct && o.aSigNow) && ind.sharedGeo,
        "B15 instances are independent: changing one view's yaw, idle, interaction, planet and distance leaves the other untouched (standalone and on one shared renderer); only the immutable sphere geometry is shared", J(ind)); }
    await o.ctx.close();

    // ---- B16 DPR cap
    { const hi = await openPage(browser, DEMO + "?planet=desert25&idle=0", { deviceScaleFactor: 3 }), s = await state(hi.page);
      check(s.pixelRatio === 2 && s.deviceDpr === 3 && s.bufferWidth === s.box.w * 2, "B16 DPR capped at 2 on a 3× display", `${s.box.w}×${s.box.h} css → ${s.bufferWidth}×${s.bufferHeight} buffer · pixelRatio ${s.pixelRatio}`);
      await hi.ctx.close(); }

    // ---- B17 reduced motion: no idle, no fling, instant turns — manual horizontal rotation still works; live media changes apply at once
    { const rm = await openPage(browser, DEMO + "?planet=frozen7", { reducedMotion: "reduce" }), p = rm.page;
      const r0 = await state(p); const c = await box(p);
      await p.mouse.move(c.x, c.y); await p.mouse.down(); await p.mouse.move(c.x + 120, c.y + 80, { steps: 4 }); await p.mouse.up();
      await p.waitForFunction(() => { const v = SPHERE_DEMO.view; return Math.abs(v.targetYaw - v.yaw) < 1e-6; }); const r1 = await state(p); await p.waitForTimeout(4500); const r2 = await state(p);
      const lk = await p.evaluate(() => { const v = SPHERE_DEMO.view; v.lookAt(0.0, { animate: true }); return v.state().centerU; });
      check(r0.reducedMotion && !r0.autoRotate && r0.idleFactor === 0 && Math.abs(r1.yaw - r0.yaw) > 0.2 && Math.abs(r2.yaw - r1.yaw) < 1e-9 && (Math.abs(lk) < 1e-9 || Math.abs(lk - 1) < 1e-9),
        "B17a prefers-reduced-motion: no idle spin, no fling, animated turns jump instantly — and a horizontal drag still spins the globe",
        `autoRotate ${r0.autoRotate} · drag Δyaw ${(r1.yaw - r0.yaw).toFixed(3)} · 4.5 s after release Δyaw ${(r2.yaw - r1.yaw).toExponential(1)} · lookAt(0, animate) → centre u ${lk}`);
      await p.emulateMedia({ reducedMotion: "no-preference" });
      const live = await p.evaluate(async () => { const v = SPHERE_DEMO.view, frame = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); v.lastInteraction = -1e9; await new Promise(r => setTimeout(r, 400));
        const spinning = v.idleFactor === 1; return { spinning }; });
      await p.emulateMedia({ reducedMotion: "reduce" });
      const live2 = await p.evaluate(async () => { const v = SPHERE_DEMO.view; await new Promise(r => requestAnimationFrame(r)); const y0 = v.targetYaw; await new Promise(r => setTimeout(r, 500)); return { idleFactor: v.idleFactor, targetMoved: v.targetYaw - y0 }; });
      check(live.spinning && live2.idleFactor === 0 && live2.targetMoved === 0, "B17b the media query is live: idle spin resumes when reduced motion is turned off and stops at once when it is turned back on", J({ live, live2 }));
      check(!rm.log.errors.length, "B17c reduced-motion page: no console errors", J(rm.log.errors)); await rm.ctx.close(); }
  }

  // ================================================================ Part G — nine globes
  async function gridSuite(browser) {
    const ready = "window.GRID_PROOF && GRID_PROOF.ready";
    const o = await openPage(browser, GRID + "?idle=0", {}, ready), page = o.page;
    const g = await page.evaluate(async () => { await new Promise(r => setTimeout(r, 300)); const G = GRID_PROOF, h = G.host, st = G.views.map(v => v.state());
      const cellsOk = G.views.every(v => { const c = v.container.getBoundingClientRect(), s = h.stage.getBoundingClientRect(), b = v._box; return Math.abs(b.x - (c.left - s.left)) <= 1 && Math.abs(b.y - (c.top - s.top)) <= 1 && b.w === v.container.clientWidth && b.h === v.container.clientHeight; });
      return { n: G.views.length, gl: __LEAK.glCreated, liveGL: __LEAK.liveGL(), mem: h.three.info.memory, programs: h.three.info.programs.length, uploads: st.map(s => s.textureUploads), cellsOk, createMs: G.createMs }; });
    check(g.n === 9 && g.gl === 1 && g.liveGL === 1 && g.mem.geometries === 1 && g.mem.textures === 9 && g.programs === 1 && g.uploads.every(u => u === 1) && g.cellsOk,
      "G1 nine globes on one PlanetSphereRenderer: ONE WebGL context, one shader program, one shared geometry, nine textures (one upload each), each placed on its own cell", J(g));
    const px = await page.evaluate(() => { const G = GRID_PROOF, h = G.host; h.render(); const gl = h.three.getContext(), dpr = h.three.getPixelRatio(), H = gl.drawingBufferHeight;
      const at = (x, y) => { const p = new Uint8Array(4); gl.readPixels(Math.round(x * dpr), Math.round(H - y * dpr), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, p); return p[3]; };
      return G.views.map(v => { const b = v._box; return { centre: at(b.x + b.w / 2, b.y + b.h / 2), corner: at(b.x + 3, b.y + 3), gapRight: at(b.x + b.w + 6, b.y + b.h / 2) }; }); });
    check(px.every(p => p.centre === 255 && p.corner === 0 && p.gapRight === 0), "G2 each globe is drawn inside its own cell only: opaque at the cell centre, transparent at the cell corner and in the gutter (the page shows through)", J(px.map(p => [p.centre, p.corner, p.gapRight])));
    const still = await page.evaluate(async () => { const h = GRID_PROOF.host, r0 = h.renders, f0 = h.frames; await new Promise(r => setTimeout(r, 1000)); return { ticks: h.frames - f0, drawn: h.renders - r0 }; });
    check(still.ticks > 30 && still.drawn === 0, "G3 render on demand across the grid: nine still globes draw 0 frames", J(still));
    const drag = await page.evaluate(() => { const G = GRID_PROOF, v = G.views[4], el = v.container, r = el.getBoundingClientRect(), y0 = G.views.map(x => x.targetYaw);
      const ev = (t, x) => el.dispatchEvent(new PointerEvent(t, { clientX: x, clientY: r.top + r.height / 2, pointerId: 3, button: 0, bubbles: true }));
      ev("pointerdown", r.left + 50); ev("pointermove", r.left + 150); ev("pointerup", r.left + 150); return G.views.map((x, i) => +(x.targetYaw - y0[i]).toFixed(4)); });
    check(drag[4] > 0.3 && drag.every((d, i) => i === 4 || d === 0), "G4 a drag on one cell spins only that globe (pointer input comes from each view's own container)", J(drag));
    await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(400);
    const small = await page.evaluate(() => GRID_PROOF.views.map(v => v._box).map(b => [b.w, b.h]));
    await page.setViewportSize({ width: 1280, height: 800 }); await page.waitForTimeout(200);
    check(small.every(([w, h]) => w === h && w < 140), "G5 the shared canvas and every cell re-measure on a phone-width resize (no per-view resize call needed)", J(small));
    const tf = await page.evaluate(async () => { const G = GRID_PROOF, v = G.views[4], cell = v.container, frame = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      v.setAutoRotate(false); const w0 = v._box.w; cell.style.transform = "scale(1.5)"; await frame();
      const r = cell.getBoundingClientRect(), wide = v._box.w, hit = v.pickAt(r.left + r.width * 0.5 + v.radiusPx * 0.9, r.top + r.height / 2);
      const stage = G.host.stage; stage.style.transformOrigin = "0 0"; stage.style.transform = "scale(0.5)"; await frame();
      const both = { box: v._box.w, buffer: G.host._size.w }; stage.style.transform = cell.style.transform = ""; await frame();
      return { w0, wide, pickAtScaledEdge: !!hit, stageScaled: both, back: v._box.w }; });
    check(Math.abs(tf.wide - tf.w0 * 1.5) <= 1 && tf.pickAtScaledEdge && Math.abs(tf.stageScaled.box - tf.wide) <= 1 && tf.back === tf.w0,
      "G5b a CSS scale on a cell (e.g. a grid → focus animation) is followed for drawing and picking; scaling the whole stage keeps every box in the stage's own units", J(tf));
    const td = await page.evaluate(async () => { const G = GRID_PROOF, h = G.host, gl = h.three.getContext(); G.teardown(); await new Promise(r => setTimeout(r, 200));
      return { mem: h.memoryAfterDispose, lost: gl.isContextLost(), canvas: !!document.querySelector("#stage canvas"), stagePos: document.getElementById("stage").style.position, liveGL: __LEAK.liveGL(), listeners: __LEAK.listeners, observers: __LEAK.observers }; });
    check(td.mem.geometries === 0 && td.mem.textures === 0 && td.lost && !td.canvas && td.stagePos === "" && td.liveGL === 0, "G6 host.dispose() tears all nine views down: GPU memory 0 / 0, context lost, canvas removed, stage style restored", J(td));
    // shared vs separate (nine contexts), all nine spinning (idle on), headless software GL
    const cmp = {};
    for (const mode of ["separate", "shared"]) {
      const m = await page.evaluate(mode => { const G = GRID_PROOF, t = G.build(mode); G.views.forEach(v => { v.setAutoRotate(true); v.lastInteraction = -1e9; }); return { createMs: t, contexts: G.contexts() }; }, mode);
      await page.waitForTimeout(600);
      const perf = await framePerf(page, mode === "shared" ? "[GRID_PROOF.host]" : "GRID_PROOF.views.map(v => v.renderer)", 120);
      const progs = await page.evaluate(() => GRID_PROOF.host ? GRID_PROOF.host.three.info.programs.length : GRID_PROOF.views.reduce((a, v) => a + v.renderer.three.info.programs.length, 0));
      cmp[mode] = { ...m, programs: progs, meanFrameMs: perf.meanFrameMs, p95FrameMs: perf.p95FrameMs, gl: perf.gl };
    }
    await page.evaluate(() => GRID_PROOF.build("shared"));
    info("G7 nine spinning globes, headless Chromium (software GL): shared renderer vs nine contexts", cmp);
    check(cmp.shared.contexts === 1 && cmp.separate.contexts === 9 && cmp.shared.programs === 1 && cmp.separate.programs === 9, "G7 shared: 1 context / 1 compiled program for nine globes; separate: 9 / 9", J({ shared: [cmp.shared.contexts, cmp.shared.programs], separate: [cmp.separate.contexts, cmp.separate.programs] }));
    check(!o.log.errors.length && !o.log.failed.length, "G8 grid page: no console errors / failed requests", J(o.log));
    await o.ctx.close();
  }

  // ================================================================ file:// probe (documents the HTTP requirement)
  async function fileProbe(browser) {
    const ctx = await browser.newContext(), p = await ctx.newPage(), errs = [];
    p.on("console", m => { if (m.type() === "error") errs.push(m.text()); }); p.on("pageerror", e => errs.push(e.message));
    await p.goto("file://" + encodeURI(path.join(ROOT, "demos/planet-sphere.html"))); await p.waitForTimeout(1500);
    const ready = await p.evaluate(() => !!(window.SPHERE_DEMO && window.SPHERE_DEMO.ready));
    info("F0 file:// probe (Chromium): ES modules do not load from file://, so PlanetSphereView needs the page served over http(s)", { moduleRan: ready, firstError: (errs[0] || "").slice(0, 160) });
    await ctx.close();
  }

  async function firefoxSmoke(ff) {
    const o = await openPage(ff, DEMO + "?planet=ocean6&idle=0");
    const v = judgeCut(await cutPicks(o.page, 0, "px1")), s = await state(o.page);
    const g = await openPage(ff, GRID + "?idle=0", {}, "window.GRID_PROOF && GRID_PROOF.ready");
    const gs = await g.page.evaluate(() => ({ n: GRID_PROOF.views.length, gl: __LEAK.glCreated, programs: GRID_PROOF.host.three.info.programs.length }));
    check(v.ok === v.n && s.quaternion && Math.abs(s.quaternion[0]) + Math.abs(s.quaternion[2]) < 1e-12 && !o.log.errors.length && gs.n === 9 && gs.gl === 1 && !g.log.errors.length,
      "F1 Firefox: demo loads, cut picks correct on both sides, yaw only; nine-globe grid on one context; no errors", `${v.ok}/${v.n} · grid ${J(gs)} · ${J([...o.log.errors, ...g.log.errors])}`);
    await o.ctx.close(); await g.ctx.close();
  }

  async function gpuSample(b) {
    const o = await openPage(b, DEMO + "?planet=ocean6");
    info("perf GPU — one globe idle-rotating (report only)", await framePerf(o.page, "(SPHERE_DEMO.view.setAutoRotate(true), SPHERE_DEMO.view.lastInteraction = -1e9, [SPHERE_DEMO.view.renderer])"));
    await o.ctx.close();
    const g = await openPage(b, GRID, {}, "window.GRID_PROOF && GRID_PROOF.ready"), cmp = {};
    for (const mode of ["separate", "shared"]) { const m = await g.page.evaluate(mode => { const G = GRID_PROOF, t = G.build(mode); G.views.forEach(v => { v.lastInteraction = -1e9; }); return { createMs: t }; }, mode); await g.page.waitForTimeout(800);
      cmp[mode] = { ...m, ...(await framePerf(g.page, mode === "shared" ? "[GRID_PROOF.host]" : "GRID_PROOF.views.map(v => v.renderer)", 180)) }; }
    info("perf GPU — nine spinning globes, shared vs separate (report only)", cmp);
    await g.ctx.close();
  }

  // ---------------------------------------------------------------- evidence screenshots
  async function screenshots(browser) {
    const o = await openPage(browser, DEMO + "?planet=ocean40&idle=0"), page = o.page;
    const clip = async (s = 0.86) => { const b = await box(page), d = Math.min(b.w, b.h) * s; return { x: b.x - d / 2, y: b.y - d / 2, width: d, height: d }; };
    const setup = async (key, { cut = 0, diag = {}, dist = 4.2 } = {}) => { await loadPreset(page, key);
      await page.evaluate(({ cut, diag, dist }) => { const S = SPHERE_DEMO; S.setDiag({ boundaries: false, seamColumns: false, grid: false, meridian: false, ...diag }); S.setHighlight(null); S.view.setDistance(dist); S.view.lookAt(((-cut / 360) % 1 + 1) % 1); }, { cut, diag, dist });
      await page.mouse.move(2, 2); await page.waitForTimeout(300); };
    // the 027C texture, drawn by the 027C module into the same view (evidence only: reaches into the view's texture canvas)
    const useOldWithRender = key => page.evaluate(async ({ src, key }) => { const old = await import(URL.createObjectURL(new Blob([src], { type: "text/javascript" }))), S = SPHERE_DEMO, v = S.view, p = S.presets.find(x => x.key === key);
      const A = BLOOM_DATA.archetypes.find(a => a.id === p.archetype); old.drawPlanetTexture(v._canvas, v.planet, { render: A.render || null }); v.texture.needsUpdate = true; v.renderer._dirty = true; }, { src: OLD_TEXTURE_SRC, key });
    for (const [key, dist, tag] of [["ocean40", 4.2, "01-ocean40"], ["ocean40", 2.0, "02-ocean40-zoomed"], ["desert5", 2.0, "03-desert5-zoomed"]]) { // frost is covered by the texture strip (05-…-frozen7): no frosty tile reaches the cut in the visible band
      await setup(key, { dist }); await useOldWithRender(key); await page.waitForTimeout(250); await shot(page, `${tag}-cut-centred-BEFORE-027c.png`, await clip());
      // back to the production texture: two real source changes (grid on → off) redraw it from planet-texture.js
      await setup(key, { dist, diag: { grid: true } }); await page.evaluate(() => SPHERE_DEMO.setDiag({ grid: false })); await page.waitForTimeout(250); await shot(page, `${tag}-cut-centred-AFTER.png`, await clip()); }
    // texture strips around the cut, ×4: 027C vs 027D (the last 10 columns, the cut, the first 10 columns)
    const strips = await page.evaluate(async src => { const old = await import(URL.createObjectURL(new Blob([src], { type: "text/javascript" }))), cur = await import("/resources/planet-sphere/planet-texture.js");
      const out = {}; for (const [key, id, seed] of [["ocean40", "ocean_archipelago", 40], ["desert5", "desert_world", 5], ["frozen7", "frozen_world", 7]]) {
        const A = BLOOM_DATA.archetypes.find(a => a.id === id), p = BLOOM.generateFromArchetype(A, seed, { config: BLOOM_DATA.config, traits: BLOOM_DATA.traits });
        const rows = []; for (const [mod, label] of [[old, "027C"], [cur, "027D"]]) { const t = document.createElement("canvas"); mod.drawPlanetTexture(t, p, { render: A.render || null }); rows.push([t, label]); }
        const k = 4, cols = 10 * 8, out2 = document.createElement("canvas"); out2.width = cols * 2 * k; out2.height = (240 * k + 24) * 2; const g = out2.getContext("2d"); g.imageSmoothingEnabled = false; g.fillStyle = "#0b0e14"; g.fillRect(0, 0, out2.width, out2.height);
        rows.forEach(([t, label], i) => { const y = i * (240 * k + 24); g.fillStyle = "#cdd6e6"; g.font = "16px monospace"; g.fillText(`${label} · ${key} · x = 50…59 | cut | x = 0…9`, 6, y + 17);
          g.drawImage(t, 480 - cols, 0, cols, 240, 0, y + 24, cols * k, 240 * k); g.drawImage(t, 0, 0, cols, 240, cols * k, y + 24, cols * k, 240 * k);
          g.fillStyle = "rgba(255,79,216,.9)"; g.fillRect(cols * k - 1, y + 24, 2, 10); g.fillRect(cols * k - 1, y + 24 + 240 * k - 10, 2, 10); });
        out[key] = out2.toDataURL("image/png"); } return out; }, OLD_TEXTURE_SRC);
    for (const [k, d] of Object.entries(strips)) fs.writeFileSync(path.join(OUT, `05-texture-strip-${k}-027c-vs-027d.png`), Buffer.from(d.split(",")[1], "base64"));
    // yaw only: before / after a diagonal drag, longitude-zero line on
    await setup("frozen25", { diag: { meridian: true } }); await shot(page, "06a-yaw-only-before-diagonal-drag.png");
    { const b = await box(page); await page.mouse.move(b.x - 150, b.y - 120); await page.mouse.down(); for (let i = 1; i <= 25; i++) await page.mouse.move(b.x - 150 + i * 10, b.y - 120 + i * 10); await page.mouse.up(); await page.waitForTimeout(1300); await page.mouse.move(2, 2); await page.waitForTimeout(200); }
    await shot(page, "06b-yaw-only-after-diagonal-drag.png");
    // authored First Bloom: a legacy rectangle, so longitude zero is a real map edge (documented, not changed)
    await setup("firstbloom", { diag: { meridian: true } }); await shot(page, "07-first-bloom-rectangle-cut-centred.png", await clip());
    await o.ctx.close();
    const g = await openPage(browser, GRID + "?idle=0", {}, "window.GRID_PROOF && GRID_PROOF.ready"); await g.page.waitForTimeout(400);
    await g.page.screenshot({ path: path.join(OUT, "08-nine-globes-one-context.png"), fullPage: true }); await g.ctx.close();
  }

  // ================================================================ browser parts
  let pw; try { pw = require("playwright"); } catch { check(false, "B0 playwright available", 'run with NODE_PATH="$(npm root -g)"'); return finish(); }
  const server = spawn("python3", ["-m", "http.server", String(PORT), "--bind", "127.0.0.1"], { cwd: ROOT, stdio: "ignore" });
  const up = await waitHttp(DEMO, 8000);
  check(up, "B0 documented launch: `python3 -m http.server " + PORT + "` from the repository root serves the demo", DEMO);
  try {
    const chromium = await pw.chromium.launch({ args: ["--js-flags=--expose-gc"] });
    await demoSuite(chromium);
    await gridSuite(chromium);
    await fileProbe(chromium);
    if (SHOTS) await screenshots(chromium);
    await chromium.close();
    if (FIREFOX) { let ff = null; try { ff = await pw.firefox.launch(); } catch (err) { console.log("(firefox not available: " + err.message.split("\n")[0] + ")"); }
      if (ff) { await firefoxSmoke(ff); await ff.close(); } }
    if (GPU) { try { const g = await pw.chromium.launch({ args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] }); await gpuSample(g); await g.close(); }
      catch (err) { console.log("(GPU sample unavailable: " + err.message.split("\n")[0] + ")"); } }
  } catch (err) { check(false, "browser suite crashed", err.stack); }
  finally { server.kill(); }
  return finish();
})();
