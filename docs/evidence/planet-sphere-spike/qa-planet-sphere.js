// BLOOM — planet-sphere TECHNICAL SPIKE QA (structural + behavioural; no exact-pixel GPU screenshot assertions).
//
//   NODE_PATH="$(npm root -g)" node docs/evidence/planet-sphere-spike/qa-planet-sphere.js [--shots] [--no-firefox] [--port 8765]
//
// Part N (Node): the spike touched no simulation / generator / validator / content / tool / production-UI file; UV ↔ tile math.
// Part B (browser): serves the repository root with the DOCUMENTED command (python3 -m http.server <port>) and drives
// demos/planet-sphere-spike.html in Chromium (+ a Firefox smoke when installed). Writes qa-results.json next to this file;
// --shots also writes the PMO evidence screenshots. Exit code 1 on any failure.
"use strict";
const path = require("path"), fs = require("fs"), { spawn, execSync } = require("child_process"), http = require("http"), crypto = require("crypto");
const ROOT = path.resolve(__dirname, "../../.."), OUT = __dirname;
const argv = process.argv.slice(2), SHOTS = argv.includes("--shots"), FIREFOX = !argv.includes("--no-firefox");
const PORT = +(argv[argv.indexOf("--port") + 1] || 0) || 8765;
const BASE_SHA = "6c0357ba9cc0f61e39042a9e6cf7378efd05f9d6"; // main when the spike branched
const URL0 = `http://localhost:${PORT}/demos/planet-sphere-spike.html`;

const results = []; let fails = 0;
const check = (ok, name, detail = "") => { results.push({ ok: !!ok, name, detail: String(detail) }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); if (!ok) fails++; };
const hash = o => crypto.createHash("sha256").update(JSON.stringify(o)).digest("hex").slice(0, 16);
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  // ================================================================ Part N — Node
  // N1 isolation: every change since BASE (committed or not) is a spike path; protected paths are byte-identical
  const changed = new Set([...execSync(`git diff --name-only ${BASE_SHA}`, { cwd: ROOT }).toString().split("\n"),
    ...execSync("git ls-files --others --exclude-standard", { cwd: ROOT }).toString().split("\n")].filter(Boolean));
  const ALLOWED = [/^demos\/planet-sphere\//, /^demos\/planet-sphere-spike\.html$/, /^docs\/evidence\/planet-sphere-spike\//, /^docs\/PLANET_SPHERE_SPIKE_v1\.md$/, /^README\.md$/];
  const stray = [...changed].filter(f => !ALLOWED.some(r => r.test(f)));
  check(!stray.length, "N1 spike-only changes since " + BASE_SHA.slice(0, 7), stray.length ? "stray: " + stray.join(", ") : `${changed.size} changed path(s), all spike files`);
  const PROTECTED = ["resources", "content", "planets", "tools", "index.html", "demos/demo-run.html", "demos/demo-surface.html", "demos/ui-mockups", "GAME_BIBLE.md"];
  const protDiff = execSync(`git diff --name-only ${BASE_SHA} -- ${PROTECTED.join(" ")}`, { cwd: ROOT }).toString().trim();
  check(!protDiff, "N2 simulation / generator / validators / content / tools / goldens / production UI untouched", protDiff || PROTECTED.join(" · "));

  // N3 production generator in Node (the browser must show these exact planets)
  for (const f of ["content/config.js", "content/traits.js", "planets/first_bloom.js", "content/archetypes.js", "resources/bloom-sim.js",
    "resources/bloom-gen.js", "resources/bloom-validate.js", "resources/bloom-witness.js", "resources/bloom-archetype.js"]) require(path.join(ROOT, f));
  const { BLOOM, BLOOM_DATA } = globalThis, { config, traits, archetypes } = BLOOM_DATA;
  const nodePlanet = (a, s) => BLOOM.generateFromArchetype(archetypes.find(x => x.id === a), s, { config, traits });
  const ref = { ocean13: nodePlanet("ocean_archipelago", 13), frozen9: nodePlanet("frozen_world", 9), desert4: nodePlanet("desert_world", 4) };
  const sig = p => hash({ id: p.id, W: p.gridWidth, H: p.gridHeight, t: p.tilemap, s: p.sections.map(x => [x.id, x.name, x.local]) });
  check(Object.values(ref).every(p => p.gridWidth === 60 && p.gridHeight === 40 && p.tilemap.length === 2400), "N3 production planets are the existing 60×40 grid");

  // N4 UV ↔ tile math (ES module imported straight into Node)
  const P = await import(path.join(ROOT, "demos/planet-sphere/planet-projection.js"));
  let rt = 0; for (let y = 0; y < 40; y++) for (let x = 0; x < 60; x++) { const c = P.tileCenterUV(60, 40, x, y), t = P.uvToTile(60, 40, c.u, c.v); if (t.x === x && t.y === y) rt++; }
  const e = [P.uvToTile(60, 40, 0, 0.5).x, P.uvToTile(60, 40, 1, 0.5).x, P.uvToTile(60, 40, 0.5, 1).y, P.uvToTile(60, 40, 0.5, 0).y, P.uvToTile(60, 40, 1 / 60 - 1e-9, 0.5).x, P.uvToTile(60, 40, 1 / 60, 0.5).x];
  check(rt === 2400 && J(e) === J([0, 59, 0, 39, 0, 1]), "N4 tile centre → UV → tile round-trips all 2400 tiles; seam/pole edges clamp", `round-trip ${rt}/2400 · edges ${J(e)}`);
  const fake = { width: 0, height: 0, getContext: () => ({}) };
  let threw = 0; for (const [w, h] of [[480, 300], [500, 250]]) try { P.drawPlanetTexture(fake, ref.ocean13, { width: w, height: h }); } catch { threw++; }
  check(threw === 2, "N5 texture renderer refuses a non-2:1 size and a non-whole-pixel tile footprint");
  const sm = P.seamStats(ref.frozen9, P.baseTileColors(ref.frozen9, archetypes.find(a => a.id === "frozen_world").render));
  check(sm.landVsWater === 30 && sm.sameSection === 0, "N6 seam test world Frozen 9: 30/40 edge rows land vs water, no section spans the seam", J(sm));

  // ================================================================ Part B — browser
  let pw; try { pw = require("playwright"); } catch { check(false, "B0 playwright available", 'run with NODE_PATH="$(npm root -g)"'); return finish(); }
  // the documented launch: python3 -m http.server <port> from the repository root
  const server = spawn("python3", ["-m", "http.server", String(PORT), "--bind", "127.0.0.1"], { cwd: ROOT, stdio: "ignore" });
  const up = await waitHttp(`http://localhost:${PORT}/demos/planet-sphere-spike.html`, 8000);
  check(up, "B0 documented launch: `python3 -m http.server " + PORT + "` from the repo root serves the spike", URL0);
  try {
    const chromium = await pw.chromium.launch();
    await chromiumSuite(chromium);
    await chromium.close();
    if (FIREFOX) {
      let ff = null; try { ff = await pw.firefox.launch(); } catch (err) { console.log("(firefox not available: " + err.message.split("\n")[0] + ")"); }
      if (ff) { await firefoxSmoke(ff); await ff.close(); }
    }
    // report only: the same frame sample on the real GPU (headless Chromium defaults to SwiftShader software GL)
    try { const g = await pw.chromium.launch({ args: ["--use-angle=gl", "--enable-gpu", "--ignore-gpu-blocklist"] }); const o = await openPage(g, "?planet=ocean13");
      const perf = await framePerf(o.page); results.push({ ok: true, name: "perf GPU (report only)", detail: J(perf) }); console.log("INFO  perf GPU " + J(perf)); await g.close(); }
    catch (err) { console.log("(GPU perf sample unavailable: " + err.message.split("\n")[0] + ")"); }
  } catch (err) { check(false, "browser suite crashed", err.stack); }
  finally { server.kill(); }
  return finish();

  // ---------------------------------------------------------------- helpers
  function J(o) { return JSON.stringify(o); }
  function finish() {
    fs.writeFileSync(path.join(OUT, "qa-results.json"), JSON.stringify({ when: new Date().toISOString(), head: execSync("git rev-parse HEAD", { cwd: ROOT }).toString().trim(),
      passed: results.filter(r => r.ok).length, failed: fails, results }, null, 1));
    console.log(`\n${results.length - fails}/${results.length} passed`); process.exit(fails ? 1 : 0);
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
    await page.waitForFunction(() => window.SPHERE_SPIKE && SPHERE_SPIKE.ready && SPHERE_SPIKE.view, null, { timeout: 60000 });
    await page.waitForTimeout(400);
    return { ctx, page, log };
  }
  function state(page) { return page.evaluate(() => SPHERE_SPIKE.view.state()); }
  function canvasCenter(page) { return page.evaluate(() => { const r = SPHERE_SPIKE.view.renderer.domElement.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }; }); }
  // record (t, yaw, idleFactor, interacting) every frame, in the page
  function startTrace(page) { return page.evaluate(() => { const v = SPHERE_SPIKE.view, f = v.onFrame; SPHERE_SPIKE.trace = []; v.onFrame = x => { f(x); SPHERE_SPIKE.trace.push([performance.now(), x.yaw, x.idleFactor, x.interacting ? 1 : 0]); }; return performance.now(); }); }
  function trace(page) { return page.evaluate(() => SPHERE_SPIKE.trace); }
  async function shot(page, name) { if (SHOTS) await page.screenshot({ path: path.join(OUT, name) }); }
  function settle(page, ms = 900) { return page.waitForTimeout(ms); }

  function framePerf(page) { // 180 idle-rotating frames: rAF interval mean / p95, JS cost per frame, GL renderer, draw calls
    return page.evaluate(async () => { const v = SPHERE_SPIKE.view; v.setAutoRotate(true); v.lookAt(0.5, 0.55, { instant: true }); v.lastInteraction = -1e9;
      const t = []; let last = performance.now(); await new Promise(r => { const f = now => { t.push(now - last); last = now; t.length < 180 ? requestAnimationFrame(f) : r(); }; requestAnimationFrame(f); });
      const r = v.renderer.domElement.getBoundingClientRect(), p0 = performance.now(); for (let i = 0; i < 200; i++) v.pickAt(r.left + r.width * (0.3 + 0.002 * i), r.top + r.height * 0.5);
      const pickMs = +((performance.now() - p0) / 200).toFixed(3);
      t.shift(); t.sort((a, b) => a - b); return { pickMs, meanFrameMs: +(t.reduce((a, b) => a + b, 0) / t.length).toFixed(2), p95FrameMs: +t[Math.floor(t.length * 0.95)].toFixed(2), jsRenderMs: +v.cpuFrameMs.toFixed(2),
        gl: (() => { const g = v.renderer.getContext(), x = g.getExtension("WEBGL_debug_renderer_info"); return x ? g.getParameter(x.UNMASKED_RENDERER_WEBGL) : g.getParameter(g.RENDERER); })(),
        calls: v.renderer.info.render.calls, triangles: v.renderer.info.render.triangles, generateMs: SPHERE_SPIKE.genMs, textureDrawMs: SPHERE_SPIKE.texMs }; });
  }

  async function pickSuite(page, label, planetKey, n) { // lookAt(tile) → real raycast at canvas centre → tile + authoritative region
    return page.evaluate(({ n }) => {
      const S = SPHERE_SPIKE, p = S.planet, W = p.gridWidth, H = p.gridHeight, T = p.tilemap, targets = [];
      const firstOf = new Map(); T.forEach((s, i) => { if (s >= 0 && !firstOf.has(s)) firstOf.set(s, i); });
      targets.push(...firstOf.values());                                      // one tile in every section
      let k = 12345; const rnd = () => (k = (k * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
      for (let i = 0; i < n; i++) targets.push((rnd() * W * H) | 0);             // random tiles (land and water)
      for (let y = 0; y < H; y += 3) targets.push(y * W, y * W + W - 1);          // both seam columns
      for (let x = 0; x < W; x += 5) targets.push(x, (H - 1) * W + x);            // both pole rows
      let ok = 0, land = 0, water = 0; const bad = [];
      for (const i of targets) {
        const x = i % W, y = (i / W) | 0, c = S.tileCenterUV(x, y);
        S.view.lookAt(c.u, c.v, { instant: true });
        const h = S.pickCenter(), s = T[i];
        const good = h && h.x === x && h.y === y && (s < 0 ? h.water && h.sectionId === null : !h.water && h.sectionId === p.sections[s].id && h.sectionIndex === s);
        if (good) { ok++; s < 0 ? water++ : land++; } else if (bad.length < 5) bad.push({ x, y, s, got: h });
      }
      return { total: targets.length, ok, land, water, sections: firstOf.size, bad };
    }, { n });
  }

  async function chromiumSuite(browser) {
    // ---- B1–B5 load, real planet, texture
    const { ctx, page, log } = await openPage(browser, "?planet=ocean13");
    const info = await page.evaluate(() => { const S = SPHERE_SPIKE, p = S.planet;
      return { id: p.id, W: p.gridWidth, H: p.gridHeight, t: p.tilemap, s: p.sections.map(x => [x.id, x.name, x.local]), tex: S.texture, summary: S.summary, three: S.three,
        canvasW: S.textureCanvas.width, canvasH: S.textureCanvas.height, gl: !!S.view.renderer.getContext() }; });
    check(log.errors.length === 0 && log.failed.length === 0, "B1 spike loads with no console errors, page errors or failed requests", J({ errors: log.errors, failed: log.failed }));
    check(hash({ id: info.id, W: info.W, H: info.H, t: info.t, s: info.s }) === sig(ref.ocean13), "B2 page shows the REAL production planet (Ocean Archipelago 13 identical to Node BLOOM.generateFromArchetype)",
      `${info.id} · ${info.summary.source} · layers ${info.summary.layers}`);
    check(info.W === 60 && info.H === 40, "B3 logical map stays the existing 60×40", `${info.W}×${info.H}`);
    check(info.tex.width === 480 && info.tex.height === 240 && info.tex.width / info.tex.height === 2 && info.canvasW === 480 && info.canvasH === 240 && info.tex.tileW === 8 && info.tex.tileH === 6,
      "B4 texture is exactly 2:1 (480×240, 8×6 px per tile)", J(info.tex));
    const px = await page.evaluate(async () => { // texture is drawn from the planet data: every tile's top-left pixel = its base colour
      const P = await import("./planet-sphere/planet-projection.js"), S = SPHERE_SPIKE, p = S.planet, cv = S.textureCanvas, d = cv.getContext("2d").getImageData(0, 0, cv.width, cv.height).data;
      const A = BLOOM_DATA.archetypes.find(a => a.id === S.summary.archetypeId), tiles = P.baseTileColors(p, A && A.render), W = p.gridWidth;
      let match = 0, waterOk = 0, waterN = 0;
      tiles.forEach((t, i) => { const x = i % W, y = (i / W) | 0, o = ((y * S.texture.tileH) * cv.width + x * S.texture.tileW) * 4;
        const diff = Math.abs(d[o] - Math.round(t.rgb[0])) + Math.abs(d[o + 1] - Math.round(t.rgb[1])) + Math.abs(d[o + 2] - Math.round(t.rgb[2]));
        if (diff <= 3) match++; if (p.tilemap[i] < 0) { waterN++; if (diff <= 3 && t.water) waterOk++; } });
      return { match, total: tiles.length, waterOk, waterN };
    });
    check(px.match === px.total && px.waterOk === px.waterN, "B5 texture canvas is rendered from the planet data (every tile's pixels = its base land / water colour)", J(px));

    // ---- B6 WebGL sphere renders, round
    const s0 = await state(page); const bb = await page.evaluate(() => SPHERE_SPIKE.view.globeBBox());
    check(s0.frames > 5 && bb && Math.abs(bb.width - bb.height) / Math.max(bb.width, bb.height) < 0.02 && s0.memory.geometries >= 1 && s0.memory.textures >= 1,
      "B6 Three.js sphere renders (frames advancing, round non-background silhouette)", `frames ${s0.frames} · bbox ${bb && bb.width}×${bb && bb.height} px · three r${info.three}`);

    // ---- B7 idle rotation when untouched
    await page.waitForTimeout(1500);
    const a1 = await state(page); await page.waitForTimeout(1000); const a2 = await state(page);
    const idleRate = (a2.yaw - a1.yaw) / 1.0;
    check(a2.idleFactor === 1 && idleRate > 0.06 && idleRate < 0.15 && !a2.interacting, "B7 slow idle rotation when untouched (≈ one turn a minute)", `${(idleRate * 180 / Math.PI).toFixed(2)}°/s`);
    await shot(page, "01-front.png");

    // ---- B8 drag rotates; idle stops during interaction
    const c = await canvasCenter(page), q0 = (await state(page)).quaternion;
    const t0 = await startTrace(page);
    await page.mouse.move(c.x, c.y); await page.mouse.down();
    const tDown = await page.evaluate(() => performance.now());
    for (let i = 1; i <= 20; i++) { await page.mouse.move(c.x + i * 10, c.y + i * 3); await page.waitForTimeout(16); }
    const tMoved = await page.evaluate(() => performance.now());
    await page.waitForTimeout(1200);                     // hold still, button down
    const held = await state(page);
    const tUp = await page.evaluate(() => performance.now()); await page.mouse.up();
    await page.waitForTimeout(4600);
    const tr = await trace(page), after = await state(page);
    const dq = 1 - Math.abs(q0.reduce((s, v, i) => s + v * held.quaternion[i], 0));
    const dragYaw = tr.filter(r => r[0] >= tDown).at(0), heldRows = tr.filter(r => r[0] > tMoved + 600 && r[0] < tUp);
    check(dq > 0.01 && held.yaw - dragYaw[1] > 0.4 && held.pitch !== s0.pitch, "B8 pointer drag changes the globe orientation (yaw and pitch)", `Δyaw ${(held.yaw - dragYaw[1]).toFixed(3)} rad for 200 px · globe radius ${held.globeRadiusPx.toFixed(0)} px · Δquat ${dq.toFixed(4)}`);
    const downRows = tr.filter(r => r[0] >= tDown && r[0] < tUp);
    check(downRows.length > 10 && downRows.every(r => r[2] === 0 && r[3] === 1) && Math.abs(heldRows.at(-1)[1] - heldRows[0][1]) < 2e-3,
      "B9 idle rotation stops immediately while interacting (idle factor 0 for every frame with the button down; globe still while held)", `${downRows.length} frames · drift while held ${Math.abs(heldRows.at(-1)[1] - heldRows[0][1]).toExponential(1)} rad`);
    const rel = r => r[0] - tUp, quiet = tr.filter(r => rel(r) > 300 && rel(r) < 2800), resumed = tr.filter(r => rel(r) > 3000 && r[2] > 0);
    const first = resumed[0], ramp = tr.filter(r => rel(r) > 3000 && rel(r) < 3400);
    check(quiet.length > 20 && quiet.every(r => r[2] === 0) && Math.abs(quiet.at(-1)[1] - quiet[0][1]) < 2e-3 && first && rel(first) < 3300 && after.idleFactor === 1,
      "B10 idle rotation resumes after the ~3 s idle delay", `still for ${(quiet.length)} frames to +2.8 s · resumed at +${first && (rel(first) / 1000).toFixed(2)} s`);
    check(ramp.length > 5 && ramp.every(r => r[2] < 0.6) && ramp.some(r => r[2] > 0), "B11 idle resume is gentle (eases in over ~1.5 s, no jump)", `idle factor over +3.0–3.4 s: ${ramp.map(r => r[2].toFixed(2)).filter((v, i, a) => i % Math.ceil(a.length / 6) === 0).join(" ")}`);

    // ---- B12 raycast UV → tile → authoritative region (ocean13)
    const pr = await pickSuite(page, "ocean13", "ocean13", 260);
    check(pr.ok === pr.total && pr.land > 50 && pr.water > 50, "B12 raycast UV → tile → region: every target resolves to its tile, land to the tilemap's section ID, water to water",
      `${pr.ok}/${pr.total} (land ${pr.land}, water ${pr.water}, all ${pr.sections} sections, seam columns, pole rows)${pr.bad.length ? " bad " + J(pr.bad) : ""}`);
    // B13 real pointer hover drives the DOM readout
    const tgt = await page.evaluate(() => { const p = SPHERE_SPIKE.planet, W = p.gridWidth; const li = p.tilemap.findIndex((s, i) => s >= 0 && i % W > 20 && i % W < 40 && ((i / W) | 0) > 12 && ((i / W) | 0) < 28);
      const wi = p.tilemap.findIndex((s, i) => s < 0 && ((i / W) | 0) > 12 && ((i / W) | 0) < 28); return { li, wi, W, sec: p.sections[p.tilemap[li]] }; });
    const hoverAt = async (i) => { await page.evaluate(({ i, W }) => { const c = SPHERE_SPIKE.tileCenterUV(i % W, (i / W) | 0); SPHERE_SPIKE.view.setAutoRotate(false); SPHERE_SPIKE.view.lookAt(c.u, c.v, { instant: true }); }, { i, W: tgt.W });
      await page.mouse.move(c.x - 3, c.y - 3); await page.mouse.move(c.x, c.y); await page.waitForTimeout(150); return page.evaluate(() => ({ tip: document.getElementById("hoverTip").textContent, hidden: document.getElementById("hoverTip").hidden })); };
    const hl = await hoverAt(tgt.li), lx = tgt.li % tgt.W, ly = (tgt.li / tgt.W) | 0;
    await shot(page, "06-hover-raycast-land.png");
    if (SHOTS) { await page.evaluate(() => { const a = document.getElementById("panel"); a.scrollTop = a.scrollHeight; }); await page.locator("#panel").screenshot({ path: path.join(OUT, "06b-hover-readout-panel.png") });
      await page.evaluate(() => { document.getElementById("panel").scrollTop = 0; }); }
    const hw = await hoverAt(tgt.wi), wx = tgt.wi % tgt.W, wy = (tgt.wi / tgt.W) | 0;
    check(!hl.hidden && hl.tip.includes(`Tile: ${lx}, ${ly}`) && hl.tip.includes(`Region: ${tgt.sec.id} — ${tgt.sec.name}`) && hw.tip.includes(`Tile: ${wx}, ${wy}`) && hw.tip.includes("Water (impassable)"),
      "B13 real pointer hover shows UV / tile / region in the developer readout (land and water)", hl.tip.replace(/\n/g, " | ") + "  ·  " + hw.tip.split("\n").slice(1, 3).join(" | "));
    // B14 hover sweep across the canvas: every hit is a valid tile and agrees with the tilemap
    const sweep = []; for (let gy = -2; gy <= 2; gy++) for (let gx = -3; gx <= 3; gx++) { await page.mouse.move(c.x + gx * c.h * 0.11, c.y + gy * c.h * 0.11); await page.waitForTimeout(40);
      sweep.push(await page.evaluate(() => { const h = SPHERE_SPIKE.hover, p = SPHERE_SPIKE.planet; if (!h) return null; const s = p.tilemap[h.y * p.gridWidth + h.x];
        return { inRange: h.uv.u >= 0 && h.uv.u <= 1 && h.uv.v >= 0 && h.uv.v <= 1 && h.x >= 0 && h.x < 60 && h.y >= 0 && h.y < 40, agrees: s < 0 ? h.water : h.sectionId === p.sections[s].id }; })); }
    const hits = sweep.filter(Boolean);
    check(hits.length >= 25 && hits.every(h => h.inRange && h.agrees), "B14 hover sweep: every sphere hit gives in-range UV and a tile that agrees with the authoritative tilemap", `${hits.length}/${sweep.length} points hit the sphere`);

    // ---- B15 texture uploads only when the canvas changes
    const u0 = await state(page); await page.waitForTimeout(1200); const u1 = await state(page);
    check(u0.textureUploads === 1 && u1.textureUploads === 1 && u0.textureVersion === u1.textureVersion && u1.frames > u0.frames + 20,
      "B15 no per-frame texture uploads (1 upload, texture version constant across frames, drags and hovers)", `uploads ${u1.textureUploads} · version ${u1.textureVersion} · ${u1.frames - u0.frames} frames`);

    // ---- screenshots: opposite / seam / poles
    await page.evaluate(() => { SPHERE_SPIKE.view.setAutoRotate(false); }); await page.mouse.move(5, 5);
    await page.click('[data-view="back"]'); await settle(page); await shot(page, "02-opposite-side-seam-centred.png");
    await page.click('[data-view="north"]'); await settle(page); await shot(page, "04-north-pole.png");
    await page.click('[data-view="south"]'); await settle(page); await shot(page, "05-south-pole.png");

    // ---- B16 another planet = exactly one more upload; seam test worlds
    await page.selectOption("#preset", "frozen9"); await page.waitForFunction(() => SPHERE_SPIKE.planet && SPHERE_SPIKE.planet.archetype && SPHERE_SPIKE.planet.archetype.publicSeed === 9);
    await page.waitForTimeout(300);
    const f9 = await page.evaluate(() => { const p = SPHERE_SPIKE.planet; return { sig: { id: p.id, W: p.gridWidth, H: p.gridHeight, t: p.tilemap, s: p.sections.map(x => [x.id, x.name, x.local]) }, seam: SPHERE_SPIKE.seam, st: SPHERE_SPIKE.view.state() }; });
    check(hash(f9.sig) === sig(ref.frozen9) && f9.st.textureUploads === 2 && f9.seam.landVsWater === 30, "B16 switching planet redraws the texture once (one more upload); seam-test world Frozen 9 is the real production planet",
      `uploads ${f9.st.textureUploads} · seam ${J(f9.seam)}`);
    // B17 the seam is where the readout says: just west of it is column x = W−1, just east is x = 0
    const seamPick = await page.evaluate(() => { const S = SPHERE_SPIKE, v = S.view, r = v.renderer.domElement.getBoundingClientRect(), out = [];
      for (const lat of [-0.3, 0, 0.3]) { v.lookAt(0, 0.5 + lat / Math.PI, { instant: true });
        const w = v.pickAt(r.left + r.width / 2 - 6, r.top + r.height / 2), e = v.pickAt(r.left + r.width / 2 + 6, r.top + r.height / 2);
        out.push([S.regionAtUV(w.uv.u, w.uv.v).x, S.regionAtUV(e.uv.u, e.uv.v).x]); } return out; });
    check(seamPick.every(([w, e]) => w === 59 && e === 0), "B17 seam location: 6 px west of the u=0 meridian picks column 59, 6 px east picks column 0 (no wrap in data)", J(seamPick));
    const pf = await pickSuite(page, "frozen9", "frozen9", 120);
    check(pf.ok === pf.total, "B18 picking on the seam-test world (Frozen 9)", `${pf.ok}/${pf.total} (land ${pf.land}, water ${pf.water})`);
    await page.evaluate(() => { SPHERE_SPIKE.view.setZoom(3.0); }); await page.check("#seamMark"); await page.click('[data-view="seam"]'); await settle(page); await shot(page, "03-seam-frozen9-marker.png");
    await page.uncheck("#seamMark"); await settle(page, 200); await shot(page, "03b-seam-frozen9-no-marker.png");
    await page.evaluate(() => SPHERE_SPIKE.view.lookAt(0, 0.5, { instant: true })); await settle(page, 200); await shot(page, "03c-seam-frozen9-centred.png");
    await page.evaluate(() => { SPHERE_SPIKE.view.setZoom(2.2); SPHERE_SPIKE.view.lookAt(0.5, 1, { instant: true }); }); await settle(page, 200); await shot(page, "04b-north-pole-frozen9-zoom.png");
    await page.evaluate(() => SPHERE_SPIKE.view.lookAt(0.5, 0, { instant: true })); await settle(page, 200); await shot(page, "05b-south-pole-frozen9-zoom.png");
    await page.evaluate(() => { SPHERE_SPIKE.view.setZoom(3.0); SPHERE_SPIKE.view.lookAt(0.5, 0.75, { instant: true }); }); await settle(page, 200); await shot(page, "04c-north-oblique-frozen9.png");
    await page.selectOption("#preset", "desert4"); await page.waitForFunction(() => SPHERE_SPIKE.planet.archetype && SPHERE_SPIKE.planet.archetype.publicSeed === 4);
    const d4 = await page.evaluate(() => SPHERE_SPIKE.seam);
    check(d4.landVsWater === 0 && d4.sectionBreak === 40, "B19 second seam world (Desert 4): land on both edges in all 40 rows, every row a section break", J(d4));
    await page.evaluate(() => { SPHERE_SPIKE.view.setZoom(3.0); SPHERE_SPIKE.view.lookAt(0, 0.55, { instant: true }); }); await settle(page, 200); await shot(page, "03d-seam-desert4-centred.png");

    // ---- B20 resize keeps rendering, round, unstretched
    await page.evaluate(() => SPHERE_SPIKE.view.setZoom(4.2));
    const sizes = [[900, 700], [1500, 900], [390, 844], [1280, 800]], rs = [];
    for (const [w, h] of sizes) { await page.setViewportSize({ width: w, height: h }); await page.waitForTimeout(350);
      const st = await state(page), b = await page.evaluate(() => SPHERE_SPIKE.view.globeBBox());
      rs.push({ vp: `${w}×${h}`, css: `${st.cssWidth}×${st.cssHeight}`, buf: `${st.bufferWidth}×${st.bufferHeight}`, aspectOk: Math.abs(st.cameraAspect - st.cssWidth / st.cssHeight) < 1e-6,
        bufOk: st.bufferWidth === Math.round(st.cssWidth * st.pixelRatio) && st.bufferHeight === Math.round(st.cssHeight * st.pixelRatio), round: b && Math.abs(b.width - b.height) / Math.max(b.width, b.height) < 0.02 && b.width < b.bufferWidth && b.height < b.bufferHeight, bbox: b && `${b.width}×${b.height}` });
      if (w === 390) await shot(page, "08-phone-390.png"); }
    check(rs.every(r => r.aspectOk && r.bufOk && r.round) && log.errors.length === 0, "B20 resize: drawing buffer follows the container, camera aspect matches, globe stays round (not stretched)", J(rs));

    // ---- B21 dispose + recreate frees resources
    const disp = await page.evaluate(async () => { const S = SPHERE_SPIKE, old = S.view, oldCanvas = old.renderer.domElement, before = { ...old.renderer.info.memory };
      const nv = S.recreateView(), f0 = old.frames; await new Promise(r => setTimeout(r, 400));
      return { before, after: old.memoryAfterDispose, oldDisposed: old.disposed, oldCanvasInDom: document.contains(oldCanvas), oldFramesStopped: old.frames === f0,
        canvases: document.querySelectorAll("#globe canvas").length, newFrames: nv.state().frames, newUploads: nv.state().textureUploads }; });
    check(disp.oldDisposed && disp.after.geometries === 0 && disp.after.textures === 0 && !disp.oldCanvasInDom && disp.oldFramesStopped && disp.canvases === 1 && disp.newFrames > 5,
      "B21 dispose frees geometry / material / texture / renderer, stops the loop and removes the canvas; a new view renders", J(disp));
    check(log.errors.length === 0 && log.failed.length === 0, "B22 still no console / page errors after the whole Chromium run", J(log));

    // ---- perf sample
    const perf = await framePerf(page);
    results.push({ ok: true, name: "perf (report only)", detail: J(perf) }); console.log("INFO  perf " + J(perf));
    await ctx.close();

    // ---- B23 reduced motion
    const rm = await openPage(browser, "?planet=ocean13", { reducedMotion: "reduce" });
    await rm.page.waitForTimeout(1500); const r1 = await state(rm.page); await rm.page.waitForTimeout(3500); const r2 = await state(rm.page);
    const ro = await rm.page.evaluate(() => document.getElementById("readout").textContent);
    check(r1.reducedMotion && !r2.autoRotate && r2.idleFactor === 0 && r1.yaw === r2.yaw && ro.includes("prefers-reduced-motion"), "B23 prefers-reduced-motion: no automatic rotation (globe still for 5 s)", `yaw ${r1.yaw.toFixed(4)} → ${r2.yaw.toFixed(4)}`);
    const rc = await canvasCenter(rm.page); await rm.page.mouse.move(rc.x, rc.y); await rm.page.mouse.down();
    for (let i = 1; i <= 10; i++) { await rm.page.mouse.move(rc.x + i * 15, rc.y); await rm.page.waitForTimeout(16); } await rm.page.mouse.up();
    await rm.page.waitForTimeout(700); const r3 = await state(rm.page); await rm.page.waitForTimeout(500); const r4 = await state(rm.page);
    check(r3.yaw - r2.yaw > 0.2 && Math.abs(r4.yaw - r3.yaw) < 1e-4 && r4.idleFactor === 0, "B24 reduced motion: manual drag still rotates; no fling or idle afterwards", `Δyaw ${(r3.yaw - r2.yaw).toFixed(3)} · after release ${(r4.yaw - r3.yaw).toExponential(1)}`);
    check(rm.log.errors.length === 0, "B25 reduced-motion run has no console errors", J(rm.log.errors));
    await rm.ctx.close();

    // ---- B26 device pixel ratio cap
    const dprs = [];
    for (const dsf of [2, 3]) { const d = await openPage(browser, "?planet=desert25", { deviceScaleFactor: dsf, viewport: { width: 1000, height: 700 } }); const st = await state(d.page);
      dprs.push({ device: dsf, used: st.pixelRatio, css: `${st.cssWidth}×${st.cssHeight}`, buf: `${st.bufferWidth}×${st.bufferHeight}` });
      if (dsf === 2) { await d.page.waitForTimeout(300); await shot(d.page, "07-desert25-dpr2.png"); } await d.ctx.close(); }
    check(dprs[0].used === 2 && dprs[1].used === 2 && dprs.every(d => d.buf === d.css.split("×").map(n => n * 2).join("×")), "B26 device pixel ratio capped at 2 (DPR 2 → 2, DPR 3 → 2)", J(dprs));

    // ---- B27 960×480 texture option
    const t9 = await openPage(browser, "?planet=frozen22&tex=960");
    const tx = await t9.page.evaluate(() => SPHERE_SPIKE.texture), p9 = await pickSuite(t9.page, "frozen22", "frozen22", 60);
    check(tx.width === 960 && tx.height === 480 && tx.tileW === 16 && tx.tileH === 12 && p9.ok === p9.total && t9.log.errors.length === 0, "B27 960×480 texture (16×12 px per tile) also 2:1 and picks correctly", `${J(tx)} · picks ${p9.ok}/${p9.total}`);
    if (SHOTS) { await t9.page.evaluate(() => { SPHERE_SPIKE.view.setAutoRotate(false); SPHERE_SPIKE.view.setZoom(2.6); SPHERE_SPIKE.view.lookAt(0.35, 0.62, { instant: true }); }); await settle(t9.page, 300); await shot(t9.page, "09-frozen22-tex960-closeup.png"); }
    await t9.ctx.close();

    // ---- 2D comparison shots from the existing demo-run (same seeds), untouched page
    if (SHOTS) for (const [q, name] of [["archetype=ocean_archipelago&seed=13", "10-demo-run-2d-ocean13.png"], ["archetype=frozen_world&seed=9", "11-demo-run-2d-frozen9.png"]]) {
      const c2 = await browser.newContext({ viewport: { width: 1280, height: 800 } }), p2 = await c2.newPage();
      await p2.goto(`http://localhost:${PORT}/demos/demo-run.html?${q}`); await p2.waitForFunction(() => window.BLOOM_API, null, { timeout: 60000 }).catch(() => {});
      await p2.waitForTimeout(600); const cv = await p2.$("#cv"); if (cv) await cv.screenshot({ path: path.join(OUT, name) }); await c2.close(); }
  }

  async function firefoxSmoke(browser) {
    const { ctx, page, log } = await openPage(browser, "?planet=ocean13");
    const c = await canvasCenter(page), s1 = await state(page);
    await page.evaluate(() => SPHERE_SPIKE.view.setAutoRotate(false));
    const y0 = (await state(page)).yaw;
    await page.mouse.move(c.x, c.y); await page.mouse.down(); for (let i = 1; i <= 10; i++) { await page.mouse.move(c.x + i * 15, c.y); await page.waitForTimeout(16); } await page.mouse.up();
    await page.waitForTimeout(600); const s2 = await state(page);
    const pr = await pickSuite(page, "ocean13", "ocean13", 80);
    check(log.errors.length === 0 && s1.frames > 5 && s2.yaw - y0 > 0.2 && pr.ok === pr.total && s2.textureUploads === 1, "F1 Firefox smoke: renders, drag rotates, picking correct, one texture upload, no console errors",
      `frames ${s2.frames} · Δyaw ${(s2.yaw - y0).toFixed(3)} · picks ${pr.ok}/${pr.total} · errors ${J(log.errors)}`);
    await ctx.close();
  }
})();
