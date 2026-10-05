// BLOOM-027C — Cylindrical Sphere Validation QA (structural + behavioural; no exact-pixel GPU assertions).
//
//   NODE_PATH="$(npm root -g)" node docs/evidence/bloom-027c/qa-sphere-validation.js [--shots] [--no-firefox] [--port 8766]
//
// Part N (Node): isolation from f6bca30, production worlds are 60×40 cylinders, topology-aware UV → tile math, and the
//   section-boundary diagnostic treats the cut pair exactly like an interior pair.
// Part B (browser): serves the worktree root with the documented command (python3 -m http.server <port>) and drives
//   demos/planet-sphere-spike.html in Chromium: yaw-only interaction, idle / reduced motion, UV → tile → region picking on
//   both sides of longitude zero for every evidence world, texture uploads, resize / DPR cap, frame timing.
//   --shots writes the evidence screenshots next to this file. Results → qa-results.json. Exit 1 on any failure.
"use strict";
const path = require("path"), fs = require("fs"), { spawn, execSync } = require("child_process"), http = require("http");
const ROOT = path.resolve(__dirname, "../../.."), OUT = __dirname;
const argv = process.argv.slice(2), SHOTS = argv.includes("--shots"), FIREFOX = !argv.includes("--no-firefox");
const PORT = +(argv[argv.indexOf("--port") + 1] || 0) || 8766;
const BASE_SHA = "f6bca30"; // BLOOM-027B, the base of this branch
const URL0 = `http://localhost:${PORT}/demos/planet-sphere-spike.html`;
const EVIDENCE = ["ocean6", "ocean36", "frozen7", "desert5", "desert25", "frozen25", "ocean40"];

const results = []; let fails = 0;
const J = o => JSON.stringify(o);
const check = (ok, name, detail = "") => { results.push({ ok: !!ok, name, detail: String(detail) }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); if (!ok) fails++; };
const info = (name, detail) => { results.push({ ok: true, info: true, name, detail: typeof detail === "string" ? detail : J(detail) }); console.log(`INFO  ${name}  — ${typeof detail === "string" ? detail : J(detail)}`); };

(async () => {
  // ================================================================ Part N — Node
  const changed = new Set([...execSync(`git diff --name-only ${BASE_SHA}`, { cwd: ROOT }).toString().split("\n"),
    ...execSync("git ls-files --others --exclude-standard", { cwd: ROOT }).toString().split("\n")].filter(Boolean));
  const ALLOWED = [/^demos\/planet-sphere\//, /^demos\/planet-sphere-spike\.html$/, /^docs\/evidence\/bloom-027c\//];
  const stray = [...changed].filter(f => !ALLOWED.some(r => r.test(f)));
  check(!stray.length, "N1 only isolated sphere-demo + 027C evidence paths changed since " + BASE_SHA, stray.length ? "stray: " + stray.join(", ") : `${changed.size} path(s)`);
  const PROTECTED = ["resources", "content", "planets", "tools", "index.html", "demos/demo-run.html", "demos/demo-surface.html", "demos/ui-mockups", "GAME_BIBLE.md", "README.md"];
  const protDiff = execSync(`git diff --name-only ${BASE_SHA} -- ${PROTECTED.join(" ")}`, { cwd: ROOT }).toString().trim();
  check(!protDiff, "N2 generator / sim / validators / content / tools / production UI (Concept 17/18) byte-identical to f6bca30", protDiff || PROTECTED.join(" · "));

  for (const f of ["content/config.js", "content/traits.js", "planets/first_bloom.js", "content/archetypes.js", "resources/bloom-sim.js",
    "resources/bloom-gen.js", "resources/bloom-validate.js", "resources/bloom-witness.js", "resources/bloom-archetype.js"]) require(path.join(ROOT, f));
  const { BLOOM, BLOOM_DATA } = globalThis, { config, traits, archetypes } = BLOOM_DATA;
  const P = await import(path.join(ROOT, "demos/planet-sphere/planet-projection.js"));
  const ref = {
    ocean6: ["ocean_archipelago", 6], ocean36: ["ocean_archipelago", 36], frozen7: ["frozen_world", 7], desert5: ["desert_world", 5],
    desert25: ["desert_world", 25], frozen25: ["frozen_world", 25], ocean40: ["ocean_archipelago", 40] };
  const nodeWorld = {};
  for (const [k, [a, s]] of Object.entries(ref)) nodeWorld[k] = BLOOM.generateFromArchetype(archetypes.find(x => x.id === a), s, { config, traits });
  check(Object.values(nodeWorld).every(p => J(p.topology) === J({ wrapX: true, wrapY: false }) && p.gridWidth === 60 && p.gridHeight === 40 && p.tilemap.length === 2400),
    "N3 every evidence world (production path @ f6bca30) is a 60×40 cylinder { wrapX: true, wrapY: false }");

  let rt = 0; for (let y = 0; y < 40; y++) for (let x = 0; x < 60; x++) { const c = P.tileCenterUV(60, 40, x, y), t = P.uvToTile(60, 40, c.u, c.v, true); if (t.x === x && t.y === y) rt++; }
  const e = [P.uvToTile(60, 40, 1, 0.5, true).x, P.uvToTile(60, 40, 1, 0.5, false).x, P.uvToTile(60, 40, 1 - 1e-9, 0.5, true).x, P.uvToTile(60, 40, 0, 0.5, true).x, P.uvToTile(60, 40, 0.5, 0, true).y];
  check(rt === 2400 && J(e) === J([0, 59, 59, 0, 39]), "N4 UV ↔ tile round-trips all 2400 tiles; u = 1 ≡ column 0 on a cylinder (59 on a rectangle)", `round-trip ${rt}/2400 · ${J(e)}`);

  // N5 regionAtUV straddling the cut = the authoritative tilemap on each side (data level, every row of every evidence world)
  let n5 = 0, n5bad = []; for (const [k, p] of Object.entries(nodeWorld)) for (let y = 0; y < 40; y++) {
    const v = 1 - (y + 0.5) / 40, L = P.regionAtUV(p, 1 - 1e-4, v), R = P.regionAtUV(p, 1e-4, v), tl = p.tilemap[y * 60 + 59], tr = p.tilemap[y * 60];
    const ok = L.x === 59 && R.x === 0 && L.sectionIndex === (tl < 0 ? -1 : tl) && R.sectionIndex === (tr < 0 ? -1 : tr) && (tl === tr) === (L.sectionId === R.sectionId); if (ok) n5++; else n5bad.push(`${k}:${y}`); }
  check(!n5bad.length, "N5 regionAtUV at u = 1 − ε / u = ε returns the tilemap's own region on each side (same id ⇔ same section)", `${n5}/${Object.keys(nodeWorld).length * 40} rows${n5bad.length ? " bad " + n5bad.slice(0, 5) : ""}`);

  // N6 the boundary diagnostic draws the cut pair exactly as an interior pair (cylinder) and not at all on a rectangle
  const recordRects = (planet) => { const ctx = { set fillStyle(v) { this.fs = v; }, get fillStyle() { return this.fs; }, imageSmoothingEnabled: true };
    const cv = { width: 0, height: 0, getContext: () => ctx };
    const rec = []; ctx.fillRect = (x, y, w, h) => rec.push({ x, y, w, h, c: ctx.fs });
    P.drawPlanetTexture(cv, planet, { diag: { boundaries: true } }); return rec.filter(r => r.c === "rgb(250,250,250)"); };
  { const p = nodeWorld.desert25, lines = recordRects(p), T = p.tilemap;
    const at = (px, y) => lines.some(r => r.x === px && r.w === 1 && r.y === y * 6);
    let good = 0, bad = []; for (let y = 0; y < 40; y++) { const a = T[y * 60 + 59], b = T[y * 60], want = a >= 0 && b >= 0 && a !== b;
      if (at(479, y) === want && at(0, y) === want) good++; else bad.push(y); }
    // interior reference: same rule at an interior column pair (29 | 30)
    let gi = 0; for (let y = 0; y < 40; y++) { const a = T[y * 60 + 29], b = T[y * 60 + 30], want = a >= 0 && b >= 0 && a !== b; if (at(239, y) === want && at(240, y) === want) gi++; }
    const rectLines = recordRects({ ...p, topology: undefined }).filter(r => (r.x === 479 || r.x === 0) && r.w === 1).length;
    check(good === 40 && gi === 40 && rectLines === 0, "N6 section-boundary diagnostic: the x=59|x=0 pair is drawn exactly like an interior pair (and never on a legacy rectangle)",
      `cut rows ${good}/40 · interior 29|30 rows ${gi}/40 · rectangle cut lines ${rectLines}${bad.length ? " bad rows " + bad : ""}`); }

  // ================================================================ Part B — browser
  let pw; try { pw = require("playwright"); } catch { check(false, "B0 playwright available", 'run with NODE_PATH="$(npm root -g)"'); return finish(); }
  const server = spawn("python3", ["-m", "http.server", String(PORT), "--bind", "127.0.0.1"], { cwd: ROOT, stdio: "ignore" });
  const up = await waitHttp(URL0, 8000);
  check(up, "B0 documented launch: `python3 -m http.server " + PORT + "` from the worktree root serves the demo", URL0);
  try {
    const chromium = await pw.chromium.launch();
    await chromiumSuite(chromium);
    await chromium.close();
    if (FIREFOX) {
      let ff = null; try { ff = await pw.firefox.launch(); } catch (err) { console.log("(firefox not available: " + err.message.split("\n")[0] + ")"); }
      if (ff) { await firefoxSmoke(ff); await ff.close(); }
    }
    try { const g = await pw.chromium.launch({ args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] }); const o = await openPage(g, "?planet=ocean6&idle=1");
      info("perf GPU (report only)", await framePerf(o.page)); await g.close(); }
    catch (err) { console.log("(GPU perf sample unavailable: " + err.message.split("\n")[0] + ")"); }
  } catch (err) { check(false, "browser suite crashed", err.stack); }
  finally { server.kill(); }
  return finish();

  // ---------------------------------------------------------------- helpers
  function finish() {
    const checks = results.filter(r => !r.info);
    fs.writeFileSync(path.join(OUT, "qa-results.json"), JSON.stringify({ when: new Date().toISOString(), head: execSync("git rev-parse HEAD", { cwd: ROOT }).toString().trim(),
      passed: checks.filter(r => r.ok).length, failed: fails, results }, null, 1));
    console.log(`\n${checks.length - fails}/${checks.length} passed`); process.exit(fails ? 1 : 0);
  }
  function waitHttp(url, ms) { const t0 = Date.now(); return new Promise(res => { const go = () => http.get(url, r => { r.resume(); res(r.statusCode === 200); })
    .on("error", () => Date.now() - t0 > ms ? res(false) : setTimeout(go, 150)); go(); }); }
  async function openPage(browser, query = "", ctxOpts = {}) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, ...ctxOpts });
    const page = await ctx.newPage(), log = { errors: [], failed: [] };
    page.on("console", m => { if (m.type() === "error") log.errors.push(m.text()); });
    page.on("pageerror", err => log.errors.push("pageerror: " + err.message));
    page.on("requestfailed", r => log.failed.push(r.url()));
    page.on("response", r => { if (r.status() >= 400) log.failed.push(r.status() + " " + r.url()); });
    await page.goto(URL0 + query);
    await page.waitForFunction(() => window.SPHERE_SPIKE && SPHERE_SPIKE.ready && SPHERE_SPIKE.view, null, { timeout: 90000 });
    await page.waitForTimeout(300);
    return { ctx, page, log };
  }
  function settled(page) { return page.waitForFunction(() => { const v = SPHERE_SPIKE.view; return !v.interacting && v.vYaw === 0 && !v.anim && Math.abs(v.targetYaw - v.yaw) < 1e-6; }, null, { timeout: 15000 }); }
  function state(page) { return page.evaluate(() => SPHERE_SPIKE.view.state()); }
  function canvasBox(page) { return page.evaluate(() => { const r = SPHERE_SPIKE.view.renderer.domElement.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height, left: r.left, top: r.top }; }); }
  async function loadPreset(page, key) { await page.evaluate(k => SPHERE_SPIKE.load(SPHERE_SPIKE.presets.find(p => p.key === k)), key); await page.waitForTimeout(150); }
  async function shot(page, name, clip) { if (SHOTS) await page.screenshot({ path: path.join(OUT, name), ...(clip ? { clip } : {}) }); }
  // screen position of the north pole and of a point on the longitude-zero meridian (proves the axis never tilts)
  function poleScreen(page) { return page.evaluate(() => { const v = SPHERE_SPIKE.view, V = v.globe.position.constructor; v._applyOrientation(); v.scene.updateMatrixWorld();
    const p = v.globe.localToWorld(new V(0, 1, 0)).project(v.camera); return [+p.x.toFixed(6), +p.y.toFixed(6)]; }); }

  function framePerf(page) { // 180 idle-rotating frames + 200 picks
    return page.evaluate(async () => { const v = SPHERE_SPIKE.view; v.setAutoRotate(true); v.lookAt(0.5, { instant: true }); v.lastInteraction = -1e9;
      const up0 = v.textureUploads, ver0 = v.texture.version;
      const t = []; let last = performance.now(); await new Promise(r => { const f = now => { t.push(now - last); last = now; t.length < 180 ? requestAnimationFrame(f) : r(); }; requestAnimationFrame(f); });
      const r = v.renderer.domElement.getBoundingClientRect(), p0 = performance.now(); for (let i = 0; i < 200; i++) v.pickAt(r.left + r.width * (0.3 + 0.002 * i), r.top + r.height * 0.5);
      const pickMs = +((performance.now() - p0) / 200).toFixed(3);
      t.shift(); t.sort((a, b) => a - b); return { pickMs, meanFrameMs: +(t.reduce((a, b) => a + b, 0) / t.length).toFixed(2), p95FrameMs: +t[Math.floor(t.length * 0.95)].toFixed(2), jsRenderMs: +v.cpuFrameMs.toFixed(2),
        uploadsDuring: v.textureUploads - up0, textureVersionDelta: v.texture.version - ver0,
        gl: (() => { const g = v.renderer.getContext(), x = g.getExtension("WEBGL_debug_renderer_info"); return x ? g.getParameter(x.UNMASKED_RENDERER_WEBGL) : g.getParameter(g.RENDERER); })(),
        calls: v.renderer.info.render.calls, triangles: v.renderer.info.render.triangles }; });
  }

  /** Pick on both sides of longitude zero for every row, with the cut at screen offset `cutDeg` (0 = centred). In-page:
   *  project the meridian point (u = 0, row-centre latitude) to the screen and raycast exactly on it; then either ±1 px
   *  horizontally (mode "px1") or at the projected centres of tiles (59, y) and (0, y) (mode "tile" — the nearest tile on each
   *  side, which near the horizon can be narrower on screen than a few pixels). */
  function cutPicks(page, cutDeg, mode) {
    return page.evaluate(({ cutDeg, mode }) => {
      const S = SPHERE_SPIKE, v = S.view, p = S.planet, W = p.gridWidth, H = p.gridHeight, T = p.tilemap, V = v.globe.position.constructor;
      v.lookAt(((-cutDeg / 360) % 1 + 1) % 1, { instant: true }); v._applyOrientation(); v.scene.updateMatrixWorld();
      const r = v.renderer.domElement.getBoundingClientRect(), rows = [];
      for (let y = 0; y < H; y++) {
        const lat = (90 - 180 * (y + 0.5) / H) * Math.PI / 180, th = Math.PI / 2 - lat; // SphereGeometry: (−cos φ sin θ, cos θ, sin φ sin θ), φ = 0 at u = 0
        const w = v.globe.localToWorld(new V(-Math.sin(th), Math.cos(th), 0)), visible = w.z > 1 / v.distance + 0.03; // in front of the horizon, with margin
        const s = w.clone().project(v.camera);
        const cx = r.left + (s.x + 1) / 2 * r.width, cy = r.top + (1 - s.y) / 2 * r.height;
        const scr = phi => { const q = v.globe.localToWorld(new V(-Math.cos(phi) * Math.sin(th), Math.cos(th), Math.sin(phi) * Math.sin(th))).project(v.camera); return [r.left + (q.x + 1) / 2 * r.width, r.top + (1 - q.y) / 2 * r.height]; };
        const [lx, ly] = mode === "tile" ? scr(2 * Math.PI * (W - 0.5) / W) : [cx - 1, cy], [rx, ry] = mode === "tile" ? scr(2 * Math.PI * 0.5 / W) : [cx + 1, cy];
        const L = v.pickAt(lx, ly), R = v.pickAt(rx, ry), O = v.pickAt(cx, cy);
        const reg = h => { if (!h) return null; const g = S.regionAtUV(h.uv.u, h.uv.v); return { ...g, truth: T[g.index] }; };
        rows.push({ y, visible, L: L && { u: L.uv.u, analytic: !!L.analytic, ...reg(L) }, R: R && { u: R.uv.u, analytic: !!R.analytic, ...reg(R) }, O: O && { u: O.uv.u, analytic: !!O.analytic, ...reg(O) },
          truthL: T[y * W + W - 1], truthR: T[y * W] });
      }
      return rows;
    }, { cutDeg, mode });
  }
  function judgeCut(rows, rowsToCheck = () => true) {
    rows = rows.filter(r => r.visible); // rows beyond the yaw-only horizon cannot be on screen (see B4d)
    // Reliability = each hit resolves to the AUTHORITATIVE region of the tile it actually hit, on the correct side of the cut, and
    // a west/east pair in one row relates as the tilemap says (same id ⇔ same section). Near the horizon a ±3 px offset can land
    // one row up/down (latitude circles are curved on screen); that is counted (rowShift) and judged on the tile actually hit.
    let ok = 0, bad = [], same = 0, diff = 0, water = 0, coast = 0, analytic = 0, onLineOk = 0, rowShift = 0;
    for (const r of rows.filter(r => rowsToCheck(r.y))) {
      const auth = h => h && h.sectionIndex === (h.truth < 0 ? -1 : h.truth) && h.water === (h.truth < 0);
      const pairOk = r.L && r.R && r.L.y === r.R.y ? ((r.L.truth >= 0 && r.L.truth === r.R.truth) === (r.L.sectionId !== null && r.L.sectionId === r.R.sectionId)) : true;
      const good = r.L && r.R && r.L.x === 59 && r.R.x === 0 && auth(r.L) && auth(r.R) && pairOk;
      if (good) ok++; else bad.push(r.y);
      if (r.L && r.R && (r.L.y !== r.y || r.R.y !== r.y)) rowShift++;
      if (r.truthL >= 0 && r.truthL === r.truthR) same++; else if (r.truthL >= 0 && r.truthR >= 0) diff++; else if (r.truthL < 0 && r.truthR < 0) water++; else coast++;
      if (r.O && (r.O.x === 0 || r.O.x === 59) && auth(r.O)) onLineOk++;
      analytic += [r.L, r.R, r.O].filter(h => h && h.analytic).length;
    }
    const ys = rows.filter(r => rowsToCheck(r.y)).map(r => r.y);
    return { ok, bad, same, diff, water, coast, analytic, onLineOk, rowShift, n: ys.length, rows: ys.length ? `${ys[0]}–${ys[ys.length - 1]}` : "none" };
  }

  async function chromiumSuite(browser) {
    // ---- B1 every evidence world loads clean, as a cylinder, one texture upload
    const o = await openPage(browser, "?planet=ocean6&idle=0");
    const page = o.page;
    const loads = [];
    for (const k of EVIDENCE) { await loadPreset(page, k);
      loads.push(await page.evaluate(k => { const S = SPHERE_SPIKE; return { k, topo: S.planet.topology, W: S.planet.gridWidth, H: S.planet.gridHeight, tex: [S.texture.width, S.texture.height], name: S.planet.name }; }, k)); }
    const nodeNames = Object.fromEntries(Object.entries(nodeWorld).map(([k, p]) => [k, p.name]));
    check(loads.every(l => J(l.topo) === J({ wrapX: true, wrapY: false }) && l.W === 60 && l.H === 40 && J(l.tex) === J([480, 240]) && l.name === nodeNames[l.k]),
      "B1 the browser generates the same production worlds as Node: 60×40 cylinders, 480×240 texture", loads.map(l => `${l.k}=${l.name}`).join(" "));

    // ---- B2 yaw-only interaction
    await loadPreset(page, "ocean6");
    const c = await canvasBox(page), pole0 = await poleScreen(page), st0 = await state(page);
    await page.mouse.move(c.x, c.y); await page.mouse.down(); for (let i = 1; i <= 20; i++) await page.mouse.move(c.x + i * 12, c.y + i * 10); await page.mouse.up(); await settled(page);
    const st1 = await state(page), pole1 = await poleScreen(page);
    await page.mouse.move(c.x, c.y - 100); await page.mouse.down(); for (let i = 1; i <= 20; i++) await page.mouse.move(c.x, c.y - 100 + i * 12); await page.mouse.up(); await settled(page);
    const st2 = await state(page), pole2 = await poleScreen(page);
    await page.focus("canvas.sphere-canvas"); for (const k of ["ArrowUp", "ArrowUp", "ArrowDown", "PageUp"]) await page.keyboard.press(k); await page.waitForTimeout(300); await settled(page);
    const st3 = await state(page);
    for (const k of ["ArrowRight", "ArrowRight"]) await page.keyboard.press(k); await settled(page);
    const st4 = await state(page);
    await page.mouse.move(c.x, c.y); await page.mouse.wheel(0, -400); await page.waitForTimeout(400); const st5 = await state(page), pole5 = await poleScreen(page);
    await page.mouse.wheel(0, 400); await page.waitForTimeout(200);
    const qIdentityTilt = await page.evaluate(() => { const q = SPHERE_SPIKE.view.tilt.quaternion; return [q.x, q.y, q.z, q.w]; });
    const allPitch = [st0, st1, st2, st3, st4, st5].map(s => s.pitch);
    check(allPitch.every(p => p === 0) && J(qIdentityTilt) === J([0, 0, 0, 1]), "B2a pitch stays exactly 0 through diagonal drag, vertical drag, ↑/↓/PgUp keys, ←/→ keys and wheel zoom (tilt quaternion identity)", J(allPitch));
    check(Math.abs(st1.yaw - st0.yaw) > 0.3 && Math.abs(st2.yaw - st1.yaw) < 1e-6 && Math.abs(st3.yaw - st2.yaw) < 1e-6 && Math.abs(st4.yaw - st3.yaw - 0.24) < 0.02,
      "B2b horizontal drag + ←/→ spin longitude; pure vertical drag and ↑/↓ do nothing",
      `diag drag Δyaw ${(st1.yaw - st0.yaw).toFixed(3)} · vertical drag Δyaw ${(st2.yaw - st1.yaw).toExponential(1)} · ↑↓ Δyaw ${(st3.yaw - st2.yaw).toExponential(1)} · →→ Δyaw ${(st4.yaw - st3.yaw).toFixed(3)}`);
    // the north pole projects to the same horizontal screen x (0 = centre) whatever the yaw; only the zoom changes its height
    check([pole0, pole1, pole2].every(p => Math.abs(p[0]) < 1e-6 && Math.abs(p[1] - pole0[1]) < 1e-6) && Math.abs(pole5[0]) < 1e-6,
      "B2c the globe's axis never moves on screen: north pole fixed at the top centre through every drag (spinning a globe on a fixed axis)", `pole NDC ${J(pole0)} → ${J(pole1)} → ${J(pole2)} · zoomed ${J(pole5)}`);
    const api = await page.evaluate(() => { const v = SPHERE_SPIKE.view; v.lookAt(0.3, { instant: true }); const s = v.state(); return { u: s.centerU, pitch: s.pitch }; });
    check(Math.abs(api.u - 0.3) < 1e-9 && api.pitch === 0, "B2d lookAt(u) is longitude only", J(api));

    // B3 idle stops on interaction and resumes as before (trace every frame)
    const idle = await page.evaluate(async () => {
      const v = SPHERE_SPIKE.view; v.setAutoRotate(true); v.lastInteraction = performance.now() - 1e5; const tr = [];
      const f = v.onFrame; v.onFrame = x => { f(x); tr.push([performance.now(), x.yaw, x.idleFactor, x.interacting ? 1 : 0, x.pitch]); };
      const wait = ms => new Promise(r => setTimeout(r, ms)); await wait(700); const tDrag = performance.now(); return { tDrag, n: tr.length, f: (SPHERE_SPIKE._tr = tr) && 1 };
    });
    const c2 = await canvasBox(page);
    await page.mouse.move(c2.x, c2.y); await page.mouse.down(); await page.mouse.move(c2.x - 30, c2.y, { steps: 5 }); await page.waitForTimeout(200); await page.mouse.up(); // held still 200 ms → no fling
    const tUp = await page.evaluate(() => performance.now());
    await page.waitForTimeout(6200);
    const tr = await page.evaluate(() => { const v = SPHERE_SPIKE.view; v.setAutoRotate(false); return SPHERE_SPIKE._tr; });
    const before = tr.filter(r => r[0] < idle.tDrag), after = tr.filter(r => r[0] > tUp);
    const rotatingBefore = before.length > 10 && before[before.length - 1][1] > before[0][1] && before[before.length - 1][2] === 1;
    const stoppedAt = after.filter(r => r[0] - tUp < 2500 && r[0] - tUp > 1500).every(r => r[2] === 0);
    const resumed = after.find(r => r[2] > 0), resumedAfter = resumed ? resumed[0] - tUp : null, fullAfter = after.find(r => r[2] === 1);
    check(rotatingBefore && stoppedAt && resumed && resumedAfter > 2900 && resumedAfter < 4200 && fullAfter && tr.every(r => r[4] === 0),
      "B3 idle spin is horizontal only, stops on interaction and ramps back in ~3 s after release (fling settle included)",
      `resumed ${resumedAfter && (resumedAfter / 1000).toFixed(2)} s after release · full speed ${fullAfter && ((fullAfter[0] - tUp) / 1000).toFixed(2)} s · pitch during idle ${[...new Set(tr.map(r => r[4]))]}`);

    // ---- B4 UV → tile → region on both sides of longitude zero, every evidence world, three cut positions
    const totals = { ok: 0, n: 0, same: 0, diff: 0, water: 0, coast: 0, analytic: 0, onLineOk: 0, rowShift: 0 }, perWorld = [], rowsBy = {};
    for (const k of EVIDENCE) { await loadPreset(page, k);
      for (const cutDeg of [0, 30, -30]) for (const dpx of ["px1", "tile"]) {
        const rows = await cutPicks(page, cutDeg, dpx), v = judgeCut(rows);
        for (const key of Object.keys(totals)) totals[key] += v[key]; rowsBy[cutDeg] = v.rows;
        if (cutDeg === 0 && dpx === "px1") perWorld.push(`${k}: ${v.ok}/${v.n} (S${v.same} D${v.diff} c${v.coast} ~${v.water})`);
        if (v.bad.length) console.log(`   ${k} cut ${cutDeg}° ${dpx} bad rows ${v.bad}`);
      } }
    check(totals.ok === totals.n, "B4a raycast just west (x=59) and just east (x=0) of longitude zero → the tilemap's own region on each side; same-id rows give ONE id, different-section rows give their two ids, water gives water",
      `${totals.ok}/${totals.n} row-picks (7 worlds × every on-screen row [cut 0°: rows ${rowsBy[0]}, cut ±30°: rows ${rowsBy[30]}] × ±1 px and the two nearest tile centres) · same ${totals.same} · different ${totals.diff} · coast ${totals.coast} · water ${totals.water} · near-horizon picks that landed one row over ${totals.rowShift}`);
    info("B4 per-world (cut centred, ±1 px)", perWorld.join(" · "));
    check(totals.onLineOk === totals.n, "B4b a raycast exactly ON the meridian resolves to one of the two adjacent cut tiles (never null)", `${totals.onLineOk}/${totals.n} · analytic fallback used ${totals.analytic}×`);
    // B4d the yaw-only horizon: which logical rows can ANY pixel of the canvas reach, at min / default / max zoom
    const reach = {}; for (const d of [1.45, 4.2, 6]) reach[d] = await page.evaluate(async d => { const S = SPHERE_SPIKE, v = S.view; v.setZoom(d); v.lookAt(0.37, { instant: true });
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      const r = v.renderer.domElement.getBoundingClientRect(), rows = new Set();
      for (let py = r.top; py < r.bottom; py += 1) for (let px = r.left; px < r.right; px += 3) { const h = v.pickAt(px, py); if (h) rows.add(S.regionAtUV(h.uv.u, h.uv.v).y); }
      const a = [...rows].sort((x, y) => x - y); return { first: a[0], last: a[a.length - 1], horizonLat: +(Math.acos(1 / d) * 180 / Math.PI).toFixed(1) }; }, d);
    await page.evaluate(() => SPHERE_SPIKE.view.setZoom(4.2));
    check(reach[4.2].first === 3 && reach[4.2].last === 36 && reach[6].first === 2 && reach[6].last === 37,
      "B4d yaw-only horizon (evidence for G): at the default zoom rows 0–2 / 37–39 are never on screen at any yaw; rows 0–1 / 38–39 not even at max zoom-out", J(reach));
    // analytic fallback agrees with the mesh UV away from the seam
    const agree = await page.evaluate(() => { const v = SPHERE_SPIKE.view, r = v.renderer.domElement.getBoundingClientRect(), S = SPHERE_SPIKE; v.lookAt(0.37, { instant: true }); let same = 0, n = 0, maxDu = 0;
      for (let i = 0; i < 40; i++) for (let j = 0; j < 40; j++) { const x = r.left + r.width * (0.3 + 0.4 * i / 39), y = r.top + r.height * (0.12 + 0.76 * j / 39), a = v.pickAt(x, y), b = v.pickAt(x, y, { forceAnalytic: true });
        if (!a || !b || a.analytic) continue; n++; const ra = S.regionAtUV(a.uv.u, a.uv.v), rb = S.regionAtUV(b.uv.u, b.uv.v); if (ra.index === rb.index) same++; maxDu = Math.max(maxDu, Math.abs(a.uv.u - b.uv.u)); }
      return { same, n, maxDu }; });
    check(agree.n > 1000 && agree.same / agree.n > 0.99, "B4c analytic fallback UV agrees with the mesh UV (same tile)", `${agree.same}/${agree.n} · max |Δu| ${agree.maxDu.toExponential(2)}`);

    // ---- B5 no texture upload per frame; diagnostics upload once per change
    const upl = await page.evaluate(async () => { const v = SPHERE_SPIKE.view; v.setAutoRotate(true); v.lastInteraction = -1e9; const u0 = v.textureUploads, ver0 = v.texture.version, f0 = v.frames;
      await new Promise(r => setTimeout(r, 1500)); const mid = { uploads: v.textureUploads - u0, ver: v.texture.version - ver0, frames: v.frames - f0 };
      SPHERE_SPIKE.setDiag({ boundaries: true }); SPHERE_SPIKE.setDiag({ boundaries: false }); SPHERE_SPIKE.setHighlight("sec_1");
      await new Promise(r => setTimeout(r, 300)); v.setAutoRotate(false); return { ...mid, afterThreeToggles: v.textureUploads - u0 }; });
    check(upl.uploads === 0 && upl.ver === 0 && upl.frames > 30 && upl.afterThreeToggles === 3, "B5 no texture upload while rotating; each diagnostics toggle = exactly one upload", J(upl));

    // ---- B6 hover readout at the cut (the real pointer path) + console cleanliness
    await loadPreset(page, "ocean6"); await page.evaluate(() => SPHERE_SPIKE.view.lookAt(0, { instant: true }));
    const hov = [];
    for (const dx of [-3, 3]) { const y = await page.evaluate(() => { const v = SPHERE_SPIKE.view, r = v.renderer.domElement.getBoundingClientRect(); return r.top + r.height / 2 - v.radiusPx * Math.sin(20 * Math.PI / 180); });
      const cc = await canvasBox(page); await page.mouse.move(cc.x + dx, y); await page.waitForTimeout(250); hov.push(await page.evaluate(() => SPHERE_SPIKE.hover)); }
    check(hov[0] && hov[1] && hov[0].x === 59 && hov[1].x === 0 && hov[0].y === hov[1].y && hov[0].sectionId === "sec_13" && hov[1].sectionId === "sec_13",
      "B6 pointer hover 3 px either side of the cut on Ocean 6: tiles (59, y) and (0, y), both sec_13 Moss Steppe", J(hov.map(h => h && [h.x, h.y, h.sectionId])));
    await page.mouse.move(5, 5);
    check(!o.log.errors.length && !o.log.failed.length, "B7 no console errors / failed requests across all evidence worlds and interactions", J(o.log));

    // ---- B8 performance sample (SwiftShader in headless Chromium: CPU-rendered, so a pessimistic bound)
    const perf = await framePerf(page);
    info("perf headless (software GL)", perf);
    check(perf.uploadsDuring === 0 && perf.textureVersionDelta === 0 && perf.pickMs < 2, "B8 180 idle frames: zero texture uploads; pick < 2 ms", J({ uploads: perf.uploadsDuring, pickMs: perf.pickMs }));

    // drag smoothness: per-frame |Δyaw| during a steady 60 Hz drag (no stalls = no frame with zero motion mid-drag, no spikes)
    const drag = await page.evaluate(async () => { const v = SPHERE_SPIKE.view, el = v.renderer.domElement, r = el.getBoundingClientRect(); v.setAutoRotate(false);
      const tr = []; const f = v.onFrame; v.onFrame = x => { f(x); tr.push([performance.now(), x.yaw]); };
      const ev = (type, x) => el.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: r.top + r.height / 2, pointerId: 1, button: 0, bubbles: true }));
      const x0 = r.left + r.width * 0.3; ev("pointerdown", x0); for (let i = 1; i <= 60; i++) { await new Promise(res => requestAnimationFrame(res)); ev("pointermove", x0 + i * 6); } ev("pointerup", x0 + 360);
      await new Promise(res => setTimeout(res, 800)); v.onFrame = f;
      const d = []; for (let i = 1; i < tr.length; i++) d.push([tr[i][0] - tr[i - 1][0], tr[i][1] - tr[i - 1][1]]);
      const mid = d.slice(8, 55), dts = d.map(x => x[0]).sort((a, b) => a - b);
      return { frames: tr.length, midStalls: mid.filter(x => Math.abs(x[1]) < 1e-5).length, monotonic: mid.every(x => x[1] >= 0), p95FrameMs: +dts[Math.floor(dts.length * 0.95)].toFixed(1), meanFrameMs: +(dts.reduce((a, b) => a + b, 0) / dts.length).toFixed(1) }; });
    check(drag.midStalls === 0 && drag.monotonic, "B9 a steady drag moves the globe every frame, in one direction (target-smoothed, no stalls)", J(drag));

    // ---- B10 resize + DPR cap
    await page.setViewportSize({ width: 900, height: 700 }); await page.waitForTimeout(400);
    const bb1 = await page.evaluate(() => SPHERE_SPIKE.view.globeBBox());
    await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(400);
    const bb2 = await page.evaluate(() => SPHERE_SPIKE.view.globeBBox()), st6 = await state(page);
    await page.setViewportSize({ width: 1280, height: 800 }); await page.waitForTimeout(300);
    const round = b => b && Math.abs(b.width - b.height) <= 3 && b.width <= b.bufferWidth && b.height <= b.bufferHeight;
    check(round(bb1) && round(bb2) && st6.pitch === 0, "B10 resize (900×700, phone 390×844): globe stays round and inside the canvas", J({ bb1, bb2 }));
    await o.ctx.close();
    const hi = await openPage(browser, "?planet=desert25&idle=0", { deviceScaleFactor: 3 });
    const sh = await state(hi.page);
    check(sh.pixelRatio === 2 && sh.deviceDpr === 3 && sh.bufferWidth === Math.round(sh.cssWidth * 2), "B11 DPR capped at 2 on a 3× display", `${sh.cssWidth}×${sh.cssHeight} css → ${sh.bufferWidth}×${sh.bufferHeight} buffer · pixelRatio ${sh.pixelRatio}`);
    await hi.ctx.close();

    // ---- B12 reduced motion
    const rm = await openPage(browser, "?planet=frozen7", { reducedMotion: "reduce" });
    const r0 = await state(rm.page); const cc = await canvasBox(rm.page);
    await rm.page.mouse.move(cc.x, cc.y); await rm.page.mouse.down(); await rm.page.mouse.move(cc.x + 120, cc.y + 80, { steps: 4 }); await rm.page.mouse.up();
    await settled(rm.page); const r1 = await state(rm.page); await rm.page.waitForTimeout(4500); const r2 = await state(rm.page); // r1: after the τ = 90 ms drag smoothing has settled
    const lk = await rm.page.evaluate(() => { const v = SPHERE_SPIKE.view; v.lookAt(0.0); return v.state().centerU; });
    check(r0.reducedMotion && !r0.autoRotate && r0.idleFactor === 0 && Math.abs(r2.yaw - r1.yaw) < 1e-6 && r1.pitch === 0 && r2.pitch === 0 && (Math.abs(lk) < 1e-9 || Math.abs(lk - 1) < 1e-9),
      "B12 prefers-reduced-motion: no idle spin, no fling after a drag, lookAt jumps instantly, pitch stays 0", `reducedMotion ${r0.reducedMotion} · autoRotate ${r0.autoRotate} · idleFactor ${r0.idleFactor} · pitch ${r1.pitch}/${r2.pitch} · yaw after release ${r1.yaw.toFixed(4)} → 4.5 s later ${r2.yaw.toFixed(4)} · lookAt(0) centre u ${lk}`);
    check(!rm.log.errors.length, "B13 reduced-motion page: no console errors", J(rm.log.errors));
    await rm.ctx.close();

    if (SHOTS) await screenshots(browser);
  }

  async function firefoxSmoke(ff) {
    const o = await openPage(ff, "?planet=ocean6&idle=0");
    const rows = await cutPicks(o.page, 0, "px1"), v = judgeCut(rows);
    const st = await state(o.page);
    check(v.ok === v.n && st.pitch === 0 && !o.log.errors.length, "F1 Firefox smoke: Ocean 6 loads, cut picks correct both sides, no errors", `${v.ok}/${v.n} · ${J(o.log.errors)}`);
    await o.ctx.close();
  }

  // ---------------------------------------------------------------- evidence screenshots
  async function screenshots(browser) {
    const o = await openPage(browser, "?planet=ocean6&idle=0"), page = o.page;
    const globeClip = async () => { const b = await canvasBox(page); const s = Math.min(b.w, b.h) * 0.8; return { x: b.x - s / 2, y: b.y - s / 2, width: s, height: s }; };
    const setup = async (key, { hl = null, seam = false, bounds = false, cols = false, grid = false, cut = 0, dist = null } = {}) => {
      await loadPreset(page, key);
      await page.evaluate(({ hl, seam, bounds, cols, grid, cut, dist }) => { const S = SPHERE_SPIKE, v = S.view;
        document.getElementById("seamMark").checked = seam; v.setSeamMarker(seam);
        S.setDiag({ boundaries: bounds, seamColumns: cols, grid }); S.setHighlight(hl);
        v.lookAt(((-cut / 360) % 1 + 1) % 1, { instant: true }); if (dist) v.setZoom(dist); else v.setZoom(4.2); }, { hl, seam, bounds, cols, grid, cut, dist });
      await page.mouse.move(2, 2); await page.waitForTimeout(350);
    };
    const S1 = [
      ["01a-ocean6-cut-centred-plain.png", "ocean6", {}], ["01b-ocean6-cut-centred-marked.png", "ocean6", { hl: "sec_13", seam: true }],
      ["02a-ocean36-cut-centred-plain.png", "ocean36", {}], ["02b-ocean36-cut-centred-marked.png", "ocean36", { hl: "sec_1", seam: true }],
      ["03a-frozen7-cut-centred-plain.png", "frozen7", {}], ["03b-frozen7-cut-centred-marked.png", "frozen7", { hl: "sec_9", seam: true }],
      ["04a-desert5-cut-centred-plain.png", "desert5", {}], ["04b-desert5-cut-centred-marked.png", "desert5", { hl: "sec_0", seam: true, bounds: true }],
      ["05a-desert25-cut-centred-plain.png", "desert25", {}], ["05b-desert25-cut-centred-boundaries.png", "desert25", { seam: true, bounds: true }],
      ["06a-frozen25-cut-centred-plain.png", "frozen25", {}], ["06b-frozen25-cut-centred-boundaries.png", "frozen25", { seam: true, bounds: true }],
      ["07a-ocean40-cut-centred-plain.png", "ocean40", {}], ["07b-ocean40-cut-centred-marked.png", "ocean40", { seam: true, cols: true }],
    ];
    for (const [name, key, opt] of S1) { await setup(key, opt); await shot(page, name); }
    // rotation strips: the cut sweeping across the face of the globe (−60° … +60°), plain, for two worlds
    for (const [key, opt, tag] of [["ocean6", {}, "ocean6"], ["desert25", {}, "desert25"], ["frozen7", {}, "frozen7"]]) for (const cut of [-60, -30, 0, 30, 60]) {
      await setup(key, { ...opt, cut }); await shot(page, `strip-${tag}-${cut < 0 ? "m" + -cut : "p" + cut}.png`, await globeClip()); }
    // the 3:2 → 2:1 stretch judgment: map-centre view (plain + tile grid), and a closer zoom at the equator
    await setup("ocean13", { cut: 180 }); await shot(page, "08a-ocean13-front-plain.png");
    await setup("ocean13", { cut: 180, grid: true }); await shot(page, "08b-ocean13-front-tilegrid.png");
    await setup("desert25", { cut: 160, grid: true, dist: 2.3 }); await shot(page, "08c-desert25-zoomed-tilegrid.png");
    // polar-row exposure under yaw-only (normal view, no pole view): Ocean 15's section that lives only in rows 1 / 38
    await setup("ocean15", {}); const thin = await page.evaluate(() => { const p = SPHERE_SPIKE.planet, W = p.gridWidth;
      // the section whose MOST equatorial tile is farthest from the equator (fewest rows from the map's top / bottom edge)
      const eq = p.sections.map(() => 0); p.tilemap.forEach((s, i) => { if (s >= 0) { const y = Math.floor(i / W); eq[s] = Math.max(eq[s], Math.min(y, p.gridHeight - 1 - y)); } });
      const worst = eq.indexOf(Math.min(...eq)); const xs = []; p.tilemap.forEach((s, i) => { if (s === worst) xs.push(i % W); });
      return { id: p.sections[worst].id, name: p.sections[worst].name, rowsFromEdge: eq[worst], u: (xs.reduce((a, b) => a + b, 0) / xs.length + 0.5) / W }; });
    await page.evaluate(t => { SPHERE_SPIKE.setHighlight(t.id); SPHERE_SPIKE.view.lookAt(t.u, { instant: true }); }, thin); await page.waitForTimeout(300);
    await shot(page, "09-ocean15-polar-only-section-normal-view.png"); info("polar-only section shown in 09", thin);
    // yaw-only proof: before / after a diagonal drag (readout shows pitch 0, the pole stays top-centre)
    await setup("frozen25", { seam: true }); await shot(page, "10a-yaw-only-before-drag.png");
    const b = await canvasBox(page); await page.mouse.move(b.x - 150, b.y - 120); await page.mouse.down();
    for (let i = 1; i <= 25; i++) await page.mouse.move(b.x - 150 + i * 10, b.y - 120 + i * 10); await page.mouse.up(); await page.waitForTimeout(1300); await page.mouse.move(2, 2); await page.waitForTimeout(200);
    await shot(page, "10b-yaw-only-after-diagonal-drag.png");
    // UV picking proof: hover 3 px west / east of the cut on Ocean 6 (tooltip shows tile 59 / 0, the same sec_13)
    await setup("ocean6", { seam: true });
    for (const [dx, nm] of [[-3, "11a-pick-west-of-cut.png"], [3, "11b-pick-east-of-cut.png"]]) { const bb = await canvasBox(page), y = await page.evaluate(() => { const v = SPHERE_SPIKE.view, r = v.renderer.domElement.getBoundingClientRect(); return r.top + r.height / 2 - v.radiusPx * Math.sin(20 * Math.PI / 180); });
      await page.mouse.move(bb.x + dx, y); await page.waitForTimeout(300); await shot(page, nm); }
    // different sections either side: Desert 25 rows 13–19 (sec_4 | sec_11)
    await setup("desert25", { seam: true, bounds: true });
    for (const [dx, nm] of [[-3, "11c-pick-west-of-cut-desert25.png"], [3, "11d-pick-east-of-cut-desert25.png"]]) { const bb = await canvasBox(page), y = await page.evaluate(() => { const v = SPHERE_SPIKE.view, r = v.renderer.domElement.getBoundingClientRect(); return r.top + r.height / 2 - v.radiusPx * Math.sin((90 - 180 * 16.5 / 40) * Math.PI / 180); });
      await page.mouse.move(bb.x + dx, y); await page.waitForTimeout(300); await shot(page, nm); }
    await o.ctx.close();
  }
})();
