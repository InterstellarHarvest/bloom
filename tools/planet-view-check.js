// BLOOM — production Planet View + canonical planet surface checks (BLOOM-029B). The 25th regression suite.
//
//   NODE_PATH="$(npm root -g)" node tools/planet-view-check.js [--browsers chromium,firefox] [--evidence]
//
// Node: the branch starts at the accepted 029A tip; ONE canonical surface (resources/planet-surface/planet-surface.js) is the only
// terrain palette / algorithm in the two production paths (PlanetSphereView's texture and the production gameplay map); the same
// generated planet gives the same surface (signature and pixels) from the sphere's planet and from the run's adapter source; the
// surface is equivariant under a circular x-shift on a cylinder (no seam); the generator, topology, sphere view, survey, menu,
// transition, training layer, engine, content and planets are untouched; the presentation reads no page global and imports no
// Concept 18 mockup file or data; the adapter additions are additive.
// Browser (a static server on 127.0.0.1; Chromium at 1280×800 / 1024×768 / 1440×900 + reduced motion, Firefox 1280×800): the
// default run still boots the legacy shell; &ui=18 mounts the production Planet View over the SAME sim, reading adapter truth;
// the map's surface is the canonical one (and equals the sphere's texture for the same world, and every Destination Survey
// globe's texture); live overlays (stands, dead ground, native hatch, fronts, bubbles) render from mapState; selection, repeated
// cylinder copies, X / water deselect, pause / speed; the banner (real region, colony, limiting factor, four category boxes,
// "Would help" = adapter.wouldHelp, intrinsic buttons); Map View (five choices, hover / focus preview, click commit stays open,
// outside click / Escape close, layer colours from real conditions); HUD = adapter; scenario cards = adapter; training starts
// paused with the anchors on the new controls; no network beyond the server, no console errors, no horizontal scroll.
// --evidence also writes docs/evidence/bloom-029b/ (screenshots + surface-proof.json). Exits 1 on any failure.
"use strict";
const path = require("path"), fs = require("fs"), http = require("http"), { execSync } = require("child_process");
const ROOT = path.resolve(__dirname, ".."), BASE_SHA = "57c73f85a9ad4b949c55e6781724f9501d8d2d71";
const argv = process.argv, argOf = k => { const i = argv.indexOf(k); return i > 0 ? argv[i + 1] : null; };
const BROWSERS = (argOf("--browsers") || "chromium,firefox").split(","), EVIDENCE = argv.includes("--evidence");
const EVD = path.join(ROOT, "docs/evidence/bloom-029b");
const read = f => fs.readFileSync(path.join(ROOT, f), "utf8"), J = JSON.stringify, git = c => execSync("git " + c, { cwd: ROOT, encoding: "utf8" }).trim();
let fails = 0; const t0 = Date.now();
const check = (ok, name, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); if (!ok) fails++; };
const info = (name, detail) => console.log(`INFO  ${name}  — ${detail}`);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const strip = src => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");
const PROOF = { generatedAt: new Date().toISOString(), base: BASE_SHA };

(async () => {
  // ================================================================ Node
  console.log("# Node");
  const head = git("rev-parse HEAD");
  check(git(`merge-base HEAD ${BASE_SHA}`) === BASE_SHA && git(`cat-file -t ${BASE_SHA}`) === "commit",
    "N1 · the branch starts from the accepted BLOOM-029A baseline 57c73f8 (not origin/main)", `HEAD ${head.slice(0, 7)} · ${git(`rev-list --count ${BASE_SHA}..HEAD`)} commit(s) since 57c73f8`);

  for (const f of ["content/config.js", "content/traits.js", "content/archetypes.js", "planets/first_bloom.js", "planets/training_grounds.js", "resources/bloom-sim.js", "resources/bloom-gen.js",
    "resources/bloom-validate.js", "resources/bloom-witness.js", "resources/bloom-archetype.js"]) require(path.join(ROOT, f));
  const { BLOOM, BLOOM_DATA } = globalThis, { config, traits, archetypes } = BLOOM_DATA;
  require(path.join(ROOT, "resources/planet-surface/planet-surface.js")); const SF = BLOOM.surface;
  const T = await import(path.join(ROOT, "resources/planet-sphere/planet-texture.js"));

  // N2 · one canonical surface: pure, frozen, one instance however often it is loaded
  { const src = read("resources/planet-surface/planet-surface.js"), code = strip(src);
    const first = BLOOM.surface; delete require.cache[require.resolve(path.join(ROOT, "resources/planet-surface/planet-surface.js"))]; require(path.join(ROOT, "resources/planet-surface/planet-surface.js"));
    const impure = { random: /Math\.random/.test(code), dom: /\bdocument\b|getElementById|querySelector|createElement/.test(code), time: /performance\.now|Date\.now|setTimeout|requestAnimationFrame/.test(code),
      imports: /^\s*(import|export)\b/m.test(code), sim: /createSim|\.tick\(|BLOOM_RUN|BLOOM_API/.test(code) };
    check(Object.values(impure).every(v => !v) && Object.isFrozen(SF) && SF.version === 1 && BLOOM.surface === first && T.texturePlanet && /paintSurface/.test(read("resources/planet-sphere/planet-texture.js")),
      "N2 · the canonical surface (BLOOM.surface) is pure (no randomness, DOM, clock, sim), frozen, a classic script that publishes ONE instance even when loaded twice, and planet-texture.js imports it",
      Object.entries(impure).filter(([, v]) => v).map(([k]) => k).join(", ") || `${src.split("\n").length} lines · ${Object.keys(SF).join(", ")}`); }

  // N3 · no second palette / terrain algorithm in the two production paths
  { const scan = f => { const c = strip(read(f));
      return { tempStops: /TEMP_STOPS|tempStops|stops\(/.test(c), barren: /barrenColor|coldWeight|groundMix|tintBy/.test(c), water: /WATER_C|waterAlt|render\.water/.test(c),
        dune: /duneAt|frostAt|\.dunes\b|\.frost\b/.test(c), stipple: /lattice\(|coprime\(|\(x \* 7|\(x\*7|% 7 ===|%7===/.test(c) }; };
    const files = ["resources/planet-sphere/planet-texture.js", "resources/run-ui/run-map-renderer.js", "resources/run-ui/planet-view.js"];
    const hits = files.map(f => [f, Object.entries(scan(f)).filter(([, v]) => v).map(([k]) => k)]).filter(([, h]) => h.length);
    const tex = strip(read("resources/planet-sphere/planet-texture.js")), map = strip(read("resources/run-ui/run-map-renderer.js"));
    check(!hits.length && /SURFACE\.paintSurface\(/.test(tex) && /surface\.paintSurface\(/.test(map) && /surface\.surfacePlanet\(/.test(map) && !/\[\s*\d{2,3}\s*,\s*\d{2,3}\s*,\s*\d{2,3}\s*\]/.test(tex),
      "N3 · no duplicated terrain palette or terrain algorithm: the sphere texture (planet-texture.js) and the production map (run-map-renderer.js) both paint BLOOM.surface; neither has colour stops, a ground tint, water colours or stipple rules of its own",
      hits.length ? hits.map(([f, h]) => `${f}: ${h.join("/")}`).join(" · ") : "planet-texture.js → SURFACE.paintSurface · run-map-renderer.js → surface.paintSurface (the old 2D palette now lives only in the migration-only legacy shell)");
    check(/MIGRATION-ONLY/.test(read("demos/demo-run.html")) && /BLOOM-029E/.test(read("demos/demo-run.html")),
      "N3b · the legacy shell (and its own map palette) is marked migration-only in the run page, to be retired by BLOOM-029E", "demo-run.html header comment"); }

  // N4 · the same generated planet → the same canonical surface from the sphere's planet and from the run adapter's source
  const WORLDS = [["ocean_archipelago", 28], ["desert_world", 17], ["frozen_world", 11], ["desert_world", 22], ["frozen_world", 4]].map(([a, s]) => {
    const A = archetypes.find(x => x.id === a); return { key: `${a}:${s}`, A, planet: BLOOM.generateFromArchetype(A, s, { config, traits }) }; });
  const raster = (planet, render, tw, th, sky) => { const W = planet.gridWidth, H = planet.gridHeight, px = new Uint8ClampedArray(W * tw * H * th * 3), w = W * tw;
    const ctx = { fillStyle: "", imageSmoothingEnabled: true, fillRect(x, y, ww, hh) { const m = /^rgb\((\d+),(\d+),(\d+)\)$/.exec(this.fillStyle); if (!m) throw new Error("fill " + this.fillStyle);
      for (let j = y; j < y + hh; j++) for (let i = x; i < x + ww; i++) { const k = (j * w + i) * 3; px[k] = +m[1]; px[k + 1] = +m[2]; px[k + 2] = +m[3]; } } };
    SF.paintSurface(ctx, planet, { render, tileW: tw, tileH: th, sky }); return px; };
  { let same = 0, sigs = 0, px = 0, diff = 0;
    for (const w of WORLDS) { const sim = BLOOM.createSim(w.planet, config, traits), M = sim.map;
      // what the run UI adapter's surface() returns for this run (planet + the sim's own resolved layout; sections reduced to their climate offsets)
      const runSrc = { id: w.planet.id, name: w.planet.name, gridWidth: M.W, gridHeight: M.H, globalClimate: { ...w.planet.globalClimate }, topology: { ...M.topology },
        sections: M.SEC.map(s => ({ id: s.id, name: s.name, local: { tempOffset: s.local.tempOffset, moistureOffset: s.local.moistureOffset } })), tilemap: Array.from(M.TILEMAP) };
      const sp = SF.surfacePlanet(runSrc, runSrc), tp = T.texturePlanet(w.planet);
      if (SF.surfaceSignature(sp, { render: w.A.render }) === SF.surfaceSignature(tp, { render: w.A.render })) sigs++;
      const a = raster(sp, w.A.render, 8, 6), cv = { width: 0, height: 0 }; let b = null;
      const ctx2 = { fillStyle: "", imageSmoothingEnabled: true, fillRect(x, y, ww, hh) { if (!b) b = new Uint8ClampedArray(cv.width * cv.height * 3); const m = /^rgb\((\d+),(\d+),(\d+)\)$/.exec(this.fillStyle);
        for (let j = y; j < y + hh; j++) for (let i = x; i < x + ww; i++) { const k = (j * cv.width + i) * 3; b[k] = +m[1]; b[k + 1] = +m[2]; b[k + 2] = +m[3]; } } };
      cv.getContext = () => ctx2; T.drawPlanetTexture(cv, tp, { render: w.A.render });
      for (let k = 0; k < a.length; k++) { px++; if (a[k] !== b[k]) diff++; }
      if (!diff) same++; }
    PROOF.node = { worlds: WORLDS.map(w => w.key), signaturesEqual: sigs, pixelValuesCompared: px, pixelValuesDifferent: diff };
    check(sigs === WORLDS.length && !diff, "N4 · the exact same generated planet gives the same canonical surface from the run adapter's source (sim layout) and from PlanetSphereView's texture path: equal signatures, identical pixels at the texture's 8×6 px per tile",
      `${WORLDS.map(w => w.key).join(" · ")}: signatures ${sigs}/${WORLDS.length}, ${px} channel values, ${diff} differ`); }

  // N5 · cylinders: the surface is equivariant under a circular x-shift (by one decoration period) — there is no seam at x = W − 1 → 0
  { const rot = (p, k) => { const W = p.gridWidth, H = p.gridHeight, tm = new Array(W * H); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) tm[y * W + ((x + k) % W)] = p.tilemap[y * W + x];
      return { ...p, tilemap: tm }; };
    let rows = 0, bad = 0; const per = SF.stipplesFor(60).periods, k = 30; // lcm of the decoration periods (6, 10, 10)
    for (const w of WORLDS) { const p = T.texturePlanet(w.planet), a = raster(p, w.A.render, 4, 4), b = raster(rot(p, k), w.A.render, 4, 4), W4 = 240;
      for (let y = 0; y < 160; y++) { rows++; for (let x = 0; x < W4; x++) { const i = (y * W4 + x) * 3, j = (y * W4 + (x + k * 4) % W4) * 3; if (a[i] !== b[j] || a[i + 1] !== b[j + 1] || a[i + 2] !== b[j + 2]) { bad++; break; } } } }
    check(!bad && 30 % per.water === 0 && 30 % per.dune === 0 && 30 % per.frost === 0 && 30 % per.grain === 0,
      "N5 · cylinder seam: rotating a generated world by 30 columns rotates its canonical surface pixel for pixel (coast, shallows, grain, waves, dunes, frost) — the cut x = W − 1 → 0 is drawn exactly like any interior column pair",
      `${WORLDS.length} worlds · ${rows} pixel rows · ${bad} rows differ · periods ${J(per)}`); }

  // N6 · scope: generator / topology / sim / content / planets / sphere view / survey / menu / transition / training untouched
  { const guarded = ["resources/bloom-gen.js", "resources/bloom-sim.js", "resources/bloom-validate.js", "resources/bloom-witness.js", "resources/bloom-archetype.js", "resources/bloom-scenario.js",
      "resources/bloom-play.js", "content", "planets", "resources/planet-sphere/planet-sphere-view.js", "resources/destination-survey", "resources/main-menu", "resources/atmosphere-transition",
      "resources/training", "index.html", "demos/ui-mockups", "demos/destination-survey.html", "demos/main-menu.html", "demos/atmosphere-transition.html", "demos/planet-sphere.html", "demos/planet-sphere-grid.html"];
    const changed = git(`diff --name-only ${BASE_SHA} -- ${guarded.join(" ")}`);
    const texExports = src => [...src.matchAll(/export (?:const|function|class) (\w+)/g)].map(m => m[1]).sort().join();
    const texBase = texExports(git(`show ${BASE_SHA}:resources/planet-sphere/planet-texture.js`)), texNow = texExports(read("resources/planet-sphere/planet-texture.js"));
    check(!changed && texBase === texNow, "N6 · untouched: generator, topology, sim, validators, content, planets, PlanetSphereView (public API, interaction, projection), the survey, menu, transition and training layer; planet-texture.js keeps exactly its exports",
      (changed ? "CHANGED: " + changed.replace(/\n/g, ", ") + " · " : "") + `planet-texture exports ${texNow}`); }

  // N7 · presentation reads no page global and holds no rule; no Concept 18 mockup file or data; the adapter additions are additive
  { const pv = strip(read("resources/run-ui/planet-view.js")), rm = strip(read("resources/run-ui/run-map-renderer.js")), ad = strip(read("resources/run-ui/run-ui-adapter.js"));
    const globals = /\b(BLOOM_RUN|BLOOM_API|BLOOM_DATA|BLOOM_TRAINING_UI|BLOOM_RUN_UI)\b|\bsim\.|getElementById\("(cv|hBio|hCov|hSky|btnPlay|btnSpeed|log|inspMain|shop)"\)|Math\.random/;
    const shared = read("demos/ui-mockups/shared.js"), c18 = read("demos/ui-mockups/c18.js");
    const names = [...shared.matchAll(/\{ id:'(\w+)', name:'([^']+)', terrain:/g)].map(m => m[2]).concat([...c18.matchAll(/future:true, name:'([^']+)'/g)].map(m => m[1]));
    const added = ["resources/run-ui/planet-view.js", "resources/run-ui/run-map-renderer.js", "resources/run-ui/planet-view.css", "resources/planet-surface/planet-surface.js"].map(read).join("\n")
      + git(`diff ${BASE_SHA} -- demos/demo-run.html resources/run-ui/run-ui-adapter.js resources/planet-sphere/planet-texture.js`).split("\n").filter(l => l.startsWith("+") && !l.startsWith("+++")).join("\n");
    const leaks = names.filter(n => added.includes(n)).concat(/ui-mockups|shared\.js|c18\.js|BM\.|ROOMS2\d/.test(added.replace(/demos\/ui-mockups\/c18\.(css|js)|Concept 18['’]s|mockup file/g, "")) ? ["mockup reference"] : []);
    const adapterRules = { random: /Math\.random/.test(ad), dom: /\bdocument\b|querySelector|innerHTML/.test(ad), loop: /requestAnimationFrame|setInterval|setTimeout/.test(ad), simWrites: /\bsim\.[\w$.[\]]+\s*(?:[-+*/]?=(?!=)|\+\+|--)/.test(ad) };
    require(path.join(ROOT, "resources/run-ui/run-ui-adapter.js")); const RU = BLOOM.runUI;
    check(!globals.test(pv) && !globals.test(rm) && !leaks.length && Object.values(adapterRules).every(v => !v) && RU.API_VERSION === 1 && RU.EVENTS.length === 10,
      "N7 · the Planet View and the map renderer read no page global (only the adapter they are handed), roll no dice; no Concept 18 mockup file, region, placeholder node or price is in any 029B addition; the adapter still owns no rules (api 1, the same 10 events)",
      leaks.length ? "LEAKS " + leaks.join(", ") : `scanned for ${names.length} mockup names · adapter reads added: surface, mapState, effects, runMenu · action runAction`); }

  // ================================================================ browser
  let pw = null; try { pw = require("playwright"); } catch { check(false, "Playwright available (NODE_PATH=\"$(npm root -g)\")", "require('playwright') failed"); }
  const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".jpg": "image/jpeg", ".png": "image/png", ".json": "application/json", ".webp": "image/webp", ".svg": "image/svg+xml" };
  const server = http.createServer((req, res) => { const u = decodeURIComponent(new URL(req.url, "http://x").pathname), f = path.join(ROOT, u);
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream", "cache-control": "no-store" }); fs.createReadStream(f).pipe(res); });
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  const ORIGIN = `http://127.0.0.1:${server.address().port}`, RUN = ORIGIN + "/demos/demo-run.html";
  if (EVIDENCE) fs.mkdirSync(EVD, { recursive: true });
  const INIT = () => { window.__EV = []; for (const t of ["run-ready", "play-pause", "speed", "region-select", "upgrade-preview", "upgrade-purchase", "growth-focus", "local-upgrade", "bubble-collect", "win"])
      document.addEventListener("bloom:" + t, e => window.__EV.push({ type: t, detail: e.detail })); };
  // in-page helpers (strings, so both engines evaluate the same code)
  const H = `(() => { const PV = BLOOM.planetView.instance, R = PV.renderer, A = BLOOM_RUN_UI.adapter;
    const hash = c => { const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data; let h = 0x811c9dc5; for (let i = 0; i < d.length; i++) { h ^= d[i]; h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(16); };
    const px = (c, x, y) => Array.from(c.getContext("2d").getImageData(Math.round(x), Math.round(y), 1, 1).data).slice(0, 3);
    const tileXY = (t, W) => [t % W, Math.floor(t / W)];
    window.__pv = { PV, R, A, hash, px, tileXY,
      worldPx(t, fx = 0.5, fy = 0.5) { const I = R.info(), [x, y] = tileXY(t, I.gridWidth); return px(R.worldCanvas, (x + fx) * I.tileDevicePx, (y + fy) * I.tileDevicePx); },
      client(t, copy = 0, fx = 0.5, fy = 0.5) { const I = R.info(), [x, y] = tileXY(t, I.gridWidth), p = R.clientOf(x + fx, y + fy); return { x: p.x + copy * I.worldWidth, y: p.y }; } };
    return true; })()`;
  const paused = async p => { await p.evaluate(() => { BLOOM_RUN_UI.adapter.actions.pause(); }); };
  const frames = (p, n = 3) => p.evaluate(n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
  const shot = async (p, name, clip) => { if (EVIDENCE) await p.screenshot({ path: path.join(EVD, name), ...(clip ? { clip } : {}) }); };

  for (const bname of BROWSERS) {
    if (!pw) break; const FF = bname === "firefox", tag = `[${bname}]`;
    let browser; try { browser = await pw[bname].launch(); } catch (e) { check(false, `${tag} browser launches`, e.message.split("\n")[0]); continue; }
    console.log(`# ${bname}`);
    const pages = [];
    const open = async (q, { w = 1280, h = 800, rm = false, wait = true } = {}) => {
      const c = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: rm ? "reduce" : "no-preference" }); await c.addInitScript(INIT);
      const p = await c.newPage(); p.errs = []; p.reqs = []; p.on("pageerror", e => p.errs.push(e.message)); p.on("console", m => { if (m.type() === "error") p.errs.push(m.text()); });
      p.on("request", r => p.reqs.push(r.url())); pages.push(p);
      await p.goto(q.startsWith("http") ? q : RUN + q);
      if (wait) { await p.waitForFunction(() => window.BLOOM_RUN_UI && BLOOM_RUN_UI.adapter && (!document.documentElement.classList.contains("ui18") || (BLOOM.planetView.instance && BLOOM.planetView.instance.renderer.info().frames > 0)), null, { timeout: 30000, polling: 100 });
        if (await p.evaluate(() => !!(window.BLOOM && BLOOM.planetView && BLOOM.planetView.instance))) await p.evaluate(H); await frames(p, 4); }
      return p; };
    try {
      // ---- B1 · the legacy default path still boots (the regression harness)
      { const p = await open("?archetype=ocean_archipelago&seed=28");
        const r = await p.evaluate(() => ({ pv: !!document.querySelector(".pv"), ui18: document.documentElement.classList.contains("ui18"), header: getComputedStyle(document.querySelector("body > header")).display,
          canvas: document.getElementById("cv").width > 100, adapter: BLOOM_RUN_UI.adapter.api, anchors: ["biomass", "map", "inspect", "readout"].map(n => document.querySelectorAll(`[data-tutorial="${n}"]`).length) }));
        check(!r.pv && !r.ui18 && r.header !== "none" && r.canvas && r.adapter === 1 && J(r.anchors) === "[1,1,1,1]" && !p.errs.length,
          `${tag} B1 · without &ui=18 the run is the legacy shell exactly (no production view, its own map drawn, its anchors in place)`, J(r) + (p.errs.length ? " errs " + p.errs.join(" | ") : "")); }

      // ---- B2–B9 · ocean 28 (a cylinder) in the production Planet View, 1280×800
      const p = await open("?archetype=ocean_archipelago&seed=28&ui=18");
      await paused(p); await frames(p);
      { const r = await p.evaluate(() => { const hid = s => getComputedStyle(document.querySelector(s)).display === "none";
          const A = __pv.A, before = BLOOM_API.sim.ticks; BLOOM_API.advance(30); A.actions.pause();
          return { mounted: !!document.querySelector(".pv[data-ui='18']"), legacyHidden: hid("body > header") && hid("body > main") && hid("body > footer"), wrap: __pv.R.info().wrapX,
            sameSim: A.run().ticks === BLOOM_API.sim.ticks && BLOOM_API.sim.ticks === before + 30, sameBio: A.hud().biomass === BLOOM_API.state().biomass,
            pvCount: document.querySelectorAll(".pv").length, cv: getComputedStyle(document.getElementById("cv")).display }; });
        check(r.mounted && r.legacyHidden && r.wrap && r.sameSim && r.sameBio && r.pvCount === 1,
          `${tag} B2 · &ui=18 mounts the production Planet View over the SAME run: one sim (adapter ticks / Biomass = BLOOM_API's after advancing), the legacy shell hidden`, J(r)); }
      { await frames(p, 2);
        const r = await p.evaluate(() => { const A = __pv.A, h = A.hud(), q = s => document.querySelector(s).textContent.trim();
          return { bio: q("#pvBio") === String(h.biomass), cov: q("#pvCov") === `${(h.coverage * 100).toFixed(1)}%`, goal: q("#pvGoal").includes(`goal ${h.winPct}%`),
            sky: q("#pvSky").startsWith(`${Math.round(h.skyNow.temp) < 0 ? "−" : ""}${Math.abs(Math.round(h.skyNow.temp))} °C · ${Math.round(h.skyNow.moist)}% moist`),
            state: q("#pvState"), speed: q("#pvSpeed") === A.run().speed + "×", log: q("#pvLog").length > 10 && A.message().includes(q("#pvLog").slice(0, 20)),
            names: [...new Set(__pv.A.regions().map(r => r.name))].length === __pv.A.regions().length }; });
        check(Object.values(r).every(v => v === true || v === "PAUSED"), `${tag} B3 · the HUD reads adapter truth: Biomass, coverage + win threshold, sky (now), state, speed, message line`, J(r)); }
      { const r = await p.evaluate(() => { const R = __pv.R, I = R.info(), A = __pv.A, src = A.surface(), sp = BLOOM.surface.surfacePlanet(src.planet, src.planet);
          const m = A.map(), c = document.createElement("canvas"); c.width = I.gridWidth * I.tileDevicePx; c.height = I.gridHeight * I.tileDevicePx;
          BLOOM.surface.paintSurface(c.getContext("2d"), sp, { render: src.render, sky: src.sky, tileW: I.tileDevicePx, tileH: I.tileDevicePx });
          const t8 = document.createElement("canvas"); t8.width = 480; t8.height = 240; BLOOM.surface.paintSurface(t8.getContext("2d"), sp, { render: src.render, sky: src.startSky, tileW: 8, tileH: 6 });
          return { tilemap: JSON.stringify(R.planet.tilemap) === JSON.stringify(m.tilemap), render: JSON.stringify(R.render) === JSON.stringify(src.render) && JSON.stringify(src.render) === JSON.stringify(BLOOM_RUN.archetype.render || null),
            surface: __pv.hash(R.surfaceCanvas) === __pv.hash(c), startSig: BLOOM.surface.surfaceSignature(sp, { render: src.render, sky: src.startSky }), sigNow: I.surfaceSignature,
            texture8x6: __pv.hash(t8), planetId: src.planet.id, sky: src.sky, startSky: src.startSky }; });
        PROOF.run = { url: "/demos/demo-run.html?archetype=ocean_archipelago&seed=28&ui=18", planetId: r.planetId, surfaceSignatureStartSky: r.startSig, surfaceSignatureNow: r.sigNow,
          flatSurfaceAt8x6Hash: r.texture8x6, mapSurfaceCanvasEqualsCanonicalPaint: r.surface, sky: r.sky, startSky: r.startSky };
        check(r.tilemap && r.render && r.surface, `${tag} B4 · the Planet View's base is the canonical surface of the run's authoritative planet: the sim's tilemap, the archetype's render hints, painted by BLOOM.surface (the map's surface canvas = a fresh canonical paint)`, J(r).slice(0, 300)); }
      { const s = await open(ORIGIN + "/demos/planet-sphere.html?archetype=ocean_archipelago&seed=28&debug=0&idle=0", { wait: false });
        await s.waitForFunction(() => window.SPHERE_DEMO && SPHERE_DEMO.ready && SPHERE_DEMO.view, null, { timeout: 30000, polling: 100 });
        const r = await s.evaluate(() => { const v = SPHERE_DEMO.view, c = v._canvas, d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data; let h = 0x811c9dc5; for (let i = 0; i < d.length; i++) { h ^= d[i]; h = Math.imul(h, 0x01000193); }
          return { hash: (h >>> 0).toString(16), size: [c.width, c.height], sig: BLOOM.surface.surfaceSignature(v.planet, { render: BLOOM_DATA.archetypes.find(a => a.id === "ocean_archipelago").render }), id: v.planet.id, uploads: v.textureUploads }; });
        PROOF.sphere = { url: "/demos/planet-sphere.html?archetype=ocean_archipelago&seed=28", planetId: r.id, textureSize: r.size, textureHash: r.hash, surfaceSignature: r.sig, textureUploads: r.uploads };
        PROOF.sameSurface = { planetIds: r.id === PROOF.run.planetId, signatures: r.sig === PROOF.run.surfaceSignatureStartSky, pixels: r.hash === PROOF.run.flatSurfaceAt8x6Hash };
        check(r.id === PROOF.run.planetId && r.sig === PROOF.run.surfaceSignatureStartSky && r.hash === PROOF.run.flatSurfaceAt8x6Hash,
          `${tag} B5 · ONE surface, two presentations: PlanetSphereView's texture for ocean 28 = the run's canonical surface painted at the texture's 8×6 px per tile (same planet id, same surface signature, same pixel hash)`,
          `sphere ${r.id} ${r.size.join("×")} ${r.hash} sig ${r.sig} · run ${PROOF.run.planetId} ${PROOF.run.flatSurfaceAt8x6Hash} sig ${PROOF.run.surfaceSignatureStartSky}`);
        if (!FF) await shot(s, "07-same-world-planet-sphere-view.png");
        await s.context().close(); }
      // B6 · overlays from mapState: stands (by density) and bubbles
      { const r = await p.evaluate(() => { BLOOM_API.advance(700); const A = __pv.A, st = A.mapState(), live = []; for (let t = 0; t < st.state.length; t++) if (st.state[t] === 1 && st.density[t] > 0.8) live.push(t);
          const tb = BLOOM_RUN_UI.placeBubble(); return { live: live.slice(0, 40), tb }; });
        await frames(p, 3);
        const q = await p.evaluate(r => { const surf = t => { const I = __pv.R.info(), [x, y] = __pv.tileXY(t, I.gridWidth); return __pv.px(__pv.R.surfaceCanvas, (x + 0.15) * I.tileDevicePx, (y + 0.15) * I.tileDevicePx); };
          const green = r.live.filter(t => { const c = __pv.worldPx(t, 0.15, 0.15), s = surf(t); return c[1] > c[0] + 25 && c[1] > c[2] + 15 && (c[0] !== s[0] || c[1] !== s[1]); }).length;
          const b = __pv.A.bubbles().find(b => b.tile === r.tb), I = __pv.R.info(), cv = document.getElementById("pvMap"), rect = cv.getBoundingClientRect(), pc = __pv.R.clientOf(b.x, b.y);
          const rad = Math.max(7, I.tilePx * 0.45), gold = __pv.px(cv, (pc.x - rect.left + rad * 0.62) * I.dpr, (pc.y - rect.top) * I.dpr);
          return { liveTiles: r.live.length, green, gold, bubble: !!b }; }, r);
        check(q.liveTiles > 10 && q.green === q.liveTiles && q.bubble && q.gold[0] > 200 && q.gold[1] > 140 && q.gold[2] < 120,
          `${tag} B6 · live overlays come from mapState: every full living stand is drawn green over the surface; a placed Biomass bubble is a gold coin on the map`, J(q)); }
      // B7 · selection: real ids; repeated cylinder copies resolve to the canonical tile; X / water deselect; pause / speed keep it
      { const r = await p.evaluate(() => { const I = __pv.R.info(), m = __pv.A.map(), W = m.width, TM = m.tilemap, rows = Math.floor((560 - 80 - I.offsetY) / I.tilePx) - 1;
          const minX = Math.ceil(W - I.offsetX / I.tilePx) + 1, maxX = Math.floor((1280 - I.offsetX - I.worldWidth) / I.tilePx) - 2, find = (x0, x1) => { for (let y = 1; y < rows; y++) for (let x = x0; x <= x1; x++) if (TM[y * W + x] >= 0) return y * W + x; return -1; };
          let water = -1; for (let y = 10; y < rows && water < 0; y++) for (let x = 20; x < 40; x++) if (TM[y * W + x] < 0) { water = y * W + x; break; }
          const right = find(0, maxX) >= 0 ? find(0, maxX) : 10 * W + Math.max(0, maxX); // (no land there on this world: a water tile, whose click must deselect)
          return { left: find(minX, W - 1), right, mid: find(20, 40), water, copies: I.copies, W }; });
        const click = async (t, copy) => { const c = await p.evaluate(([t, copy]) => __pv.client(t, copy), [t, copy]); await p.mouse.click(c.x, c.y); await frames(p, 2); return p.evaluate(() => __pv.A.selection()); };
        const reg = t => p.evaluate(t => __pv.A.map().tilemap[t], t);
        const sMid = await click(r.mid, 0), want = await reg(r.mid);
        const ev = await p.evaluate(() => __EV.filter(e => e.type === "region-select").slice(-1)[0]);
        const bannerName = await p.evaluate(() => document.querySelector("#pvBanner .bn-t b").textContent);
        const sL0 = await click(r.left, 0), sL1 = await click(r.mid, 0), sLm = await click(r.left, -1), sR1 = await click(r.right, 1), wantL = await reg(r.left), wantR = await reg(r.right);
        const hitCopies = await p.evaluate(([l, rr]) => { const a = __pv.client(l, -1), b = __pv.client(rr, 1), h1 = __pv.R.hitTest(a.x, a.y), h2 = __pv.R.hitTest(b.x, b.y); return [h1.tile === l && h1.copy === -1, h2.tile === rr && h2.copy === 1]; }, [r.left, r.right]);
        check(sMid.index === want && sMid.id === ev.detail.id && ev.detail.index === want && bannerName === sMid.name && r.copies.count === 3,
          `${tag} B7 · a map click selects the real region under it (adapter selection = the tilemap's region, bloom:region-select carries its id, the banner names it)`, `tile ${r.mid} → ${J(sMid)} · event ${J(ev.detail)}`);
        check(sL0.index === wantL && sLm.index === wantL && sL1.index !== wantL && sR1.index === (wantR >= 0 ? wantR : -1) && hitCopies.every(Boolean),
          `${tag} B8 · cylinder: the stage shows ${r.copies.count} copies; a click on the left repeated copy (copy −1) and on the right one (+1) selects the SAME canonical region as copy 0 (x mod W)`,
          `left tile ${r.left} copy0 ${sL0.index} copy−1 ${sLm.index} (want ${wantL}) · right tile ${r.right} copy+1 ${sR1.index} (want ${wantR}) · hitTest ${J(hitCopies)}`);
        await click(r.mid, 0);
        const s1 = await p.evaluate(() => __pv.A.selection().index);
        await p.click("#pvPause"); await p.click("#pvPause"); await p.click("#pvSpeed"); await p.click("#pvSpeed"); await p.click("#pvSpeed"); await frames(p, 2);
        const s2 = await p.evaluate(() => ({ sel: __pv.A.selection().index, banner: !document.getElementById("pvBanner").hidden }));
        await p.click("#pvBanner .bx"); await frames(p, 2); const s3 = await p.evaluate(() => ({ sel: __pv.A.selection().index, banner: !document.getElementById("pvBanner").hidden }));
        await click(r.mid, 0); const sW = await click(r.water, 0), bW = await p.evaluate(() => document.getElementById("pvBanner").hidden);
        check(s2.sel === s1 && s2.banner && s3.sel === -1 && !s3.banner && sW.index === -1 && bW, `${tag} B9 · Pause / speed leave the selection and banner alone; the banner's X deselects (banner gone); a water click deselects`, J({ s1, s2, s3, water: sW.index, bW })); }
      // B10 · pause / speed: real actions, bloom:play-pause / bloom:speed, exactly 1× → 2× → 4× → 1×
      { const r = await p.evaluate(() => { __EV.length = 0; return true; });
        await p.click("#pvPause"); const run1 = await p.evaluate(() => __pv.A.run().running); await p.click("#pvPause"); const run2 = await p.evaluate(() => __pv.A.run().running);
        const sp = []; for (let k = 0; k < 4; k++) { await p.click("#pvSpeed"); sp.push(await p.evaluate(() => [__pv.A.run().speed, document.getElementById("pvSpeed").textContent])); }
        const ev = await p.evaluate(() => __EV.map(e => e.type + ":" + JSON.stringify(e.detail)));
        check(r && run1 === true && run2 === false && J(sp.map(s => s[0])) === "[2,4,1,2]" && sp.every(s => s[1] === s[0] + "×")
          && J(ev) === J(['play-pause:{"running":true}', 'play-pause:{"running":false}', 'speed:{"speed":2}', 'speed:{"speed":4}', 'speed:{"speed":1}', 'speed:{"speed":2}']),
          `${tag} B10 · Pause / Resume and speed are the real adapter actions: bloom:play-pause, bloom:speed, exactly 1× → 2× → 4× → 1×`, J({ run1, run2, sp, ev })); }
      await p.evaluate(() => __pv.A.actions.setSpeed(1));
      // B11 · Map View: five choices, hover / focus preview, click commits and stays open, outside click / Escape close; real condition colours
      { await p.click('[data-tool="mapview"]'); await frames(p, 2);
        const choices = await p.evaluate(() => [...document.querySelectorAll("#pvLens [data-lens]")].map(b => b.textContent.trim()));
        const open1 = await p.evaluate(() => !document.getElementById("pvLens").hidden && document.activeElement.dataset.lens === "");
        await p.hover('#pvLens [data-lens="Temperature"]'); await frames(p, 2); const hov = await p.evaluate(() => __pv.PV.state());
        await p.mouse.move(640, 500); await frames(p, 2); const left = await p.evaluate(() => __pv.PV.state());
        await p.focus('#pvLens [data-lens="Water"]'); await frames(p, 2); const foc = await p.evaluate(() => __pv.PV.state());
        await p.keyboard.press("ArrowDown"); await frames(p, 2); const kb = await p.evaluate(() => [__pv.PV.state().lensPreview, document.activeElement.dataset.lens]);
        await p.click('#pvLens [data-lens="Temperature"]'); await frames(p, 2); const com = await p.evaluate(() => __pv.PV.state());
        if (!FF) await shot(p, "04-map-view-popover.png");
        check(J(choices) === J(["Plants / Normal", "Temperature", "Water", "Soil", "Hazard"]) && open1 && hov.lensPreview === "Temperature" && hov.layerShown === "Temperature" && hov.lens === null
          && left.lensPreview === null && left.layerShown === null && foc.lensPreview === "Water" && J(kb) === '["Soil","Soil"]' && com.lens === "Temperature" && com.lensOpen && com.layerShown === "Temperature",
          `${tag} B11 · Map View: exactly five choices; hover previews, leaving returns to the committed view; keyboard focus / ↓ previews; a click commits and the popover STAYS open`, J({ choices, hov: hov.layerShown, left: left.layerShown, foc: foc.layerShown, kb, com })); }
      { const r = await p.evaluate(() => { const A = __pv.A, m = A.map(), W = m.width, TM = m.tilemap, I = __pv.R.info(), LAY = { green: [156, 210, 136], yellow: [243, 196, 107], red: [233, 143, 166] };
          const lamps = A.regions().map(r => (A.region(r.index).conditions.find(c => c.key === "Temperature") || {}).lamp), out = { ok: 0, bad: [], kinds: {} };
          for (const r of A.regions()) { const t = TM.findIndex((s, i) => s === r.index && TM[i + 1] === s && TM[i - 1] === s && TM[i + W] === s && TM[i - W] === s); if (t < 0) continue;
            const c = __pv.worldPx(t, 0.12, 0.12), near = Object.entries(LAY).map(([k, v]) => [k, Math.hypot(c[0] - v[0], c[1] - v[1], c[2] - v[2])]).sort((a, b) => a[1] - b[1])[0][0];
            out.kinds[lamps[r.index]] = (out.kinds[lamps[r.index]] || 0) + 1; if (near === lamps[r.index]) out.ok++; else out.bad.push([r.name, lamps[r.index], near, c]); }
          return out; });
        check(r.ok > 5 && !r.bad.length, `${tag} B12 · the Temperature layer colours every region by its REAL Temperature condition (adapter.region().conditions lamp: green / yellow / red), over the canonical surface`, J(r)); }
      { await p.mouse.click(640, 520); await frames(p, 2); const out = await p.evaluate(() => __pv.PV.state());
        await p.click('[data-tool="mapview"]'); await frames(p, 1); await p.keyboard.press("Escape"); await frames(p, 1);
        const esc = await p.evaluate(() => [__pv.PV.state().lensOpen, document.activeElement.dataset.tool]);
        await p.click('[data-tool="mapview"]'); await p.click('[data-tool="mapview"]'); const tog = await p.evaluate(() => __pv.PV.state().lensOpen);
        check(!out.lensOpen && out.lens === "Temperature" && J(esc) === '[false,"mapview"]' && tog === false, `${tag} B13 · the popover closes on an outside click (the committed layer stays), on Escape (focus back to Map View) and on the tool toggle`, J({ out: out.lensOpen, esc, tog }));
        await p.evaluate(() => __pv.PV.setLens(null)); }
      // B14 · banner: real region / colony / limiting factor; four category identities; "Would help" = adapter.wouldHelp; intrinsic buttons
      { await p.evaluate(() => __pv.A.actions.selectRegion(__pv.A.regions().find(r => r.blocked).index)); await frames(p, 3);
        const r = await p.evaluate(() => { const A = __pv.A, sel = A.selection(), R = A.region(sel.index), b = document.getElementById("pvBanner"), q = s => b.querySelector(s);
          const boxes = [...b.querySelectorAll(".bc")].map(e => ({ cat: e.dataset.cat, st: e.className.match(/st-(\w+)/)[1], color: getComputedStyle(e).borderLeftColor, label: e.querySelector("small").textContent, word: e.querySelector("b").textContent, badge: e.querySelector(".sb").textContent.trim() }));
          const want = R.conditions.map(c => ({ cat: c.key, st: { green: "ok", yellow: "warn", red: "bad" }[c.lamp], word: c.word }));
          const help = [...b.querySelectorAll("[data-item]")].map(x => x.dataset.item), wh = A.wouldHelp(sel.index).map(u => u.id);
          const btns = [...b.querySelectorAll(".bn-a .pv-btn")].map(x => { const cs = getComputedStyle(x); return { w: x.getBoundingClientRect().width, grow: cs.flexGrow, sw: x.scrollWidth, cw: x.clientWidth }; });
          return { name: q(".bn-t b").textContent === R.name, colony: q('[data-tutorial="colony-status"]').textContent === R.colony.label,
            limiting: R.limiting.blocked && q('[data-tutorial="limiting-factor"]').textContent.includes(R.limiting.text) && q('[data-tutorial="limiting-factor"]').textContent.includes(R.limiting.key),
            boxes: JSON.stringify(boxes.map(x => ({ cat: x.cat, st: x.st }))) === JSON.stringify(want.map(x => ({ cat: x.cat, st: x.st }))) && boxes.every((x, i) => x.word.toLowerCase().startsWith(want[i].word.toLowerCase())),
            colors: boxes.map(x => x.cat + "=" + x.color), distinct: new Set(boxes.map(x => x.color)).size === 4, notOk: boxes.filter(x => x.st !== "ok").map(x => x.cat + ":" + x.badge),
            help, wh, helpEq: JSON.stringify(help) === JSON.stringify(wh), intrinsic: btns.every(x => x.grow === "0" && x.w < 420 && x.sw <= x.cw + 1), nBtns: btns.length }; });
        if (!FF) { await shot(p, "02-selected-region-banner.png"); const bb = await p.evaluate(() => { const r = document.querySelector("#pvBanner .bn-c").getBoundingClientRect(); return { x: r.x - 6, y: r.y - 6, width: r.width + 12, height: r.height + 12 }; }); await shot(p, "03-condition-boxes-closeup.png", bb); }
        // category identity holds across statuses: the same category is the same colour on an OK region
        const ok = await p.evaluate(() => { const A = __pv.A; A.actions.selectRegion(A.regions().find(r => r.isOrigin).index); return true; }); await frames(p, 3);
        const okCols = await p.evaluate(() => [...document.querySelectorAll("#pvBanner .bc")].map(e => e.dataset.cat + "=" + getComputedStyle(e).borderLeftColor));
        check(r.name && r.colony && r.limiting && r.boxes, `${tag} B14 · the banner shows the real region: name, colony status, limiting factor (key + the page's words) and the four condition readings / statuses from adapter.region()`, J({ name: r.name, colony: r.colony, limiting: r.limiting, notOk: r.notOk }));
        check(ok && r.distinct && J(okCols) === J(r.colors), `${tag} B15 · Temperature / Water / Soil / Hazard keep four distinct category colours whatever their status (a blocked region and an all-OK region show the same four); status is a separate icon + word badge`, r.colors.join(" · ") + " · " + r.notOk.join(", "));
        check(r.helpEq && r.help.length > 0 && r.intrinsic, `${tag} B16 · "Would help" = adapter.wouldHelp(region) exactly (real previews), and the banner's buttons are intrinsic-width (no flex-grow, no clipping)`, J({ help: r.help, wh: r.wh, buttons: r.nBtns })); }
      // B17 · rooms are not built: their requests are visibly unavailable (dev path) and change nothing
      { const before = await p.evaluate(() => [__pv.A.selection().index, __pv.A.run().running, __EV.length]);
        await p.click('[data-tool="adapt"]'); await frames(p, 2);
        const r = await p.evaluate(() => ({ toast: !document.getElementById("pvToast").hidden && document.getElementById("pvToast").textContent, st: [...document.querySelectorAll(".pv-tool[data-room]")].map(b => b.dataset.tool + ":" + b.dataset.room),
          after: [__pv.A.selection().index, __pv.A.run().running, __EV.length], rooms: ["region", "adapt", "spread", "terraform"].map(n => __pv.PV.rooms.has(n)) }));
        check(r.toast && /029C/.test(r.toast) && J(r.after) === J(before) && r.rooms.every(x => !x) && r.st.every(s => /unavailable/.test(s)),
          `${tag} B17 · the Region / Adapt / Spread / Terraform rooms are not built: their tool buttons are marked unavailable and a request says so through the room seam, touching nothing (no mock room)`, J(r)); }
      { const n = await p.evaluate(() => { const A = __pv.A, names = new Set(A.regions().map(r => r.name)); return [...document.querySelectorAll(".pv .bn-t b")].every(b => names.has(b.textContent)); });
        const ext = p.reqs.filter(u => !u.startsWith(ORIGIN) && !u.startsWith("data:") && !u.startsWith("blob:"));
        check(n && !ext.length && !p.reqs.some(u => /ui-mockups/.test(u)) && !p.errs.length, `${tag} B18 · no Concept 18 file is requested, no request leaves the local server, no console error`, `${p.reqs.length} requests${ext.length ? " · EXTERNAL " + ext.join(", ") : ""}${p.errs.length ? " · ERRORS " + p.errs.join(" | ") : ""}`); }
      // B27 · keyboard: the map takes focus, arrows move a visible region focus, Enter selects it, Escape clears; a "Would help" hover previews silently
      { await p.evaluate(() => { __pv.A.actions.deselect(); __EV.length = 0; }); await p.focus("#pvMap"); await p.keyboard.press("ArrowRight"); await frames(p, 2);
        const f0 = await p.evaluate(() => __pv.PV.state().focus); await p.keyboard.press("ArrowDown"); await frames(p, 2);
        const f1 = await p.evaluate(() => __pv.PV.state().focus); await p.keyboard.press("Enter"); await frames(p, 2);
        const s1 = await p.evaluate(() => __pv.A.selection().index); await p.keyboard.press("Escape"); await frames(p, 2); const s2 = await p.evaluate(() => __pv.A.selection().index);
        await p.evaluate(() => __pv.A.actions.selectRegion(__pv.A.regions().find(r => r.blocked).index)); await frames(p, 3);
        await p.hover("#pvBanner [data-item]"); await frames(p, 3);
        const pv = await p.evaluate(() => ({ events: __EV.filter(e => e.type === "upgrade-preview").length, active: __pv.A.activePreview() }));
        check(f0 >= 0 && f1 >= 0 && f1 !== f0 && s1 === f1 && s2 === -1 && pv.events === 0 && pv.active === null,
          `${tag} B27 · keyboard: arrow keys move the map's region focus, Enter selects it, Escape clears; hovering a "Would help" button previews it silently (adapter.previewOf: no bloom:upgrade-preview, no shell preview)`, J({ f0, f1, s1, s2, pv })); }
      // B28 · colony badges (growth focus / local upgrade) and Waterborne crossings are drawn from the run's own state / events
      { const r = await p.evaluate(() => { const A = __pv.A, o = A.regions().find(r => r.isOrigin).index; BLOOM_API.addBiomass(2000);
          A.actions.setGrowthFocus(o, "roots"); const local = A.actions.buyLocalUpgrade(o, "rootNetwork"); const cross = A.upgrades().flatMap(b => b.items).find(u => u.effect === "crossing");
          if (cross) A.actions.buy(cross.id); return { local, cross: cross && cross.id }; });
        let seen = 0; for (let k = 0; k < 40 && !seen; k++) { await p.evaluate(() => BLOOM_API.advance(40)); await frames(p, 2); seen = await p.evaluate(() => __pv.R.info().lastFrame.crossings); }
        const st = await p.evaluate(() => ({ last: __pv.R.info().lastFrame, fx: __pv.A.effects().crossings.length, focus: __pv.A.regions().find(r => r.isOrigin).focus, local: __pv.A.regions().find(r => r.isOrigin).localUpgrade }));
        check(r.local && st.focus === "roots" && st.local === "rootNetwork" && st.last.badges >= 1 && seen > 0,
          `${tag} B28 · the origin's growth focus (Roots) and local upgrade (Root Network) draw its colony badge; after buying ${r.cross}, real crossing events are animated on the map (effects().crossings)`, J({ r, seen, st })); }
      if (!FF) { await p.mouse.move(640, 300); await p.evaluate(() => __pv.A.actions.deselect()); await frames(p, 2); await shot(p, "06-generated-cylinder-world-planet-view.png"); }

      // ---- B19 · First Bloom (rectangle) + selection banner screenshot; no selection screenshot
      { const q = await open("?ui=18");
        const r = await q.evaluate(() => ({ wrap: __pv.R.info().wrapX, copies: __pv.R.info().copies.count, W: __pv.R.info().gridWidth }));
        check(!r.wrap && r.copies === 1, `${tag} B19 · authored First Bloom stays a rectangle: drawn once, centred in the frame (no repeat, no invented ocean)`, J(r));
        if (!FF) { await q.evaluate(() => __pv.A.actions.deselect()); await frames(q, 3); await shot(q, "01-planet-view-no-selection-1280x800.png");
          await q.click('[data-tool="mapview"]'); await q.hover('#pvLens [data-lens="Temperature"]'); await frames(q, 3); await shot(q, "05-temperature-preview.png"); }
        await q.context().close(); }

      // ---- B20 · scenarios: the compact card = adapter.scenario(); overlays (haze, native hatch, fronts, dead ground)
      for (const [label, qs, adv] of [["pressure", "?archetype=frozen_world&seed=9&scenario=dying_world&ui=18", 2400], ["competition", "?archetype=desert_world&seed=22&scenario=native_competition&ui=18", 700],
        ["climate", "?archetype=frozen_world&seed=4&scenario=volatile_climate&ui=18", 0]]) {
        const q = await open(qs); await paused(q);
        const r = await q.evaluate(([label, adv]) => { const A = __pv.A; if (label === "climate") { BLOOM_API.addBiomass(500); A.actions.buy("warm"); A.actions.buy("warm"); BLOOM_API.advance(200); }
          else if (label === "pressure") { for (let k = 0; k < adv / 50; k++) { BLOOM_API.advance(50); if (A.mapState().state.some(s => s === 2) || A.run().lost) break; } } // (frozen 9: die-back under the decline)
          else BLOOM_API.advance(adv);
          A.actions.play(); A.actions.pause(); A.actions.deselect(); return true; }, [label, adv]);
        await frames(q, 4);
        if (label === "competition") { // (a live-random run: advance until a front exists — a living tile next to a native stand — then let the event outlines fade)
          await q.evaluate(() => { const A = __pv.A, has = () => { const st = A.mapState(), W = st.width, nat = st.native, L = i => st.state[i] === 1, N = i => nat[i] > 0 && st.state[i] !== 1;
            for (let i = 0; i < nat.length - W; i++) if (((i + 1) % W && ((L(i) && N(i + 1)) || (N(i) && L(i + 1)))) || (L(i) && N(i + W)) || (N(i) && L(i + W))) return true; return false; };
            for (let k = 0; k < 40 && !has(); k++) BLOOM_API.advance(25); });
          await frames(q, 3); await q.waitForFunction(() => !__pv.A.effects().competition.length, null, { timeout: 9000, polling: 200 }).catch(() => {}); await frames(q, 2); }
        const c = await q.evaluate(label => { const A = __pv.A, sc = A.scenario(), card = document.getElementById("pvScn"), txt = card.textContent, st = A.mapState(), out = { label, visible: !card.hidden };
          if (label === "pressure") { const P = sc.pressure; out.ok = txt.includes(P.phaseName) && txt.includes(`${Math.round(P.progress * 100)}% lost`); out.dead = st.state.reduce((n, s) => n + (s === 2), 0);
            const t = st.state.findIndex(s => s === 2); out.deadPx = t >= 0 ? __pv.worldPx(t, 0.5, 0.15) : null; }
          if (label === "competition") { const C = sc.competition; out.ok = txt.includes(`Native plants hold ${Math.round(C.share * 100)}%`) && txt.includes(`${C.contested} contested`) || txt.includes(`Native plants hold ${Math.round(C.share * 100)}%`) && !C.contested;
            const nat = st.native, t = nat.findIndex((d, i) => d > 0.5 && st.state[i] === 0); out.natPx = t >= 0 ? __pv.worldPx(t, 0.85, 0.15) : null;
            // a front: a living tile whose east neighbour is native → amber on their shared edge
            const W = st.width, TM = A.map().tilemap; let f = -1; // (checked once the competition-event outlines have faded: none sits on the edge)
            const L = i => st.state[i] === 1, N = i => nat[i] > 0 && st.state[i] !== 1; let fx = 0, fy = 0;
            for (let i = 0; i < nat.length - W && f < 0; i++) { if ((i + 1) % W && TM[i + 1] >= 0 && ((L(i) && N(i + 1)) || (N(i) && L(i + 1)))) { f = i; fx = 1; fy = 0.5; }
              else if (TM[i + W] >= 0 && ((L(i) && N(i + W)) || (N(i) && L(i + W)))) { f = i; fx = 0.5; fy = 1; } }
            out.frontPx = f >= 0 ? __pv.worldPx(f, fx, fy) : null; }
          if (label === "climate") { const C = sc.climate; out.ok = txt.includes(`Instability ${Math.round(C.level * 100)}%`) && txt.includes(C.bandName); }
          return out; }, label);
        let ok = c.visible && c.ok;
        if (label === "pressure") ok = ok && c.dead > 0 && c.deadPx[0] > c.deadPx[2] + 30 && c.deadPx[0] > 110 && c.deadPx[0] < 190;
        if (label === "competition") ok = ok && c.natPx && c.natPx[2] > c.natPx[1] + 20 && c.frontPx && c.frontPx[0] > 200 && c.frontPx[2] < 90;
        check(ok, `${tag} B20 · ${label}: the compact scenario card shows the adapter's live values${label === "pressure" ? "; dead ground is drawn from mapState" : label === "competition" ? "; native stands are violet + hatched, fronts amber" : ""}`, J(c));
        if (!FF) { if (label === "pressure") { await q.click("#pvScn .more"); await frames(q, 2); } await shot(q, { pressure: "09-pressure-scenario.png", competition: "10-native-competition.png", climate: "11-volatile-climate.png" }[label]); }
        check(!q.errs.length, `${tag} B20b · ${label}: no console error`, q.errs.join(" | ") || "none");
        await q.context().close(); }

      // ---- B21 · training (?ui=18&training=1): paused start, anchors on the new controls, the training menu works
      { const q = await open("?training=1&ui=18&return=" + encodeURIComponent("/demos/main-menu.html"));
        await sleep(600); await frames(q, 3);
        const r = await q.evaluate(() => { const one = n => { const e = document.querySelectorAll(`[data-tutorial="${n}"]`); return e.length === 1 && !!e[0].closest(".pv"); };
          const A = __pv.A, names = ["biomass", "coverage", "sky", "play-pause", "speed", "run-menu", "map", "message-log", "inspect", "readout", "limiting-factor", "colony-status"];
          return { paused: A.run().running === false && A.run().training, pressed: document.getElementById("pvPause").getAttribute("aria-pressed") === "true", label: document.getElementById("pvPause").getAttribute("aria-label"),
            anchors: names.filter(one), missing: names.filter(n => !one(n)), legacyKept: ["growth-focus", "upgrades", "report"].every(n => document.querySelectorAll(`[data-tutorial="${n}"]`).length >= 1),
            ready: __EV.filter(e => e.type === "run-ready").map(e => e.detail), menu: [...document.querySelectorAll("#pvMenu [data-act]")].map(b => b.dataset.act) }; });
        check(r.paused && r.pressed && r.label === "Resume" && !r.missing.length && r.legacyKept && r.ready.length === 1 && r.ready[0].training === true && J(r.menu) === '["restartTraining","skipTraining","mainMenu"]',
          `${tag} B21 · training in the production view: starts PAUSED (Pause shows Resume, pressed), every re-homed anchor resolves to ONE production element (${r.anchors.length}), the shell keeps the rest, one bloom:run-ready {training:true}, the training menu lists Restart · Skip · Main menu`, J(r));
        if (!FF) await shot(q, "12-training-paused.png");
        await q.click("#pvPause"); await frames(q, 2); const go = await q.evaluate(() => [__pv.A.run().running, __EV.filter(e => e.type === "play-pause").map(e => e.detail.running)]);
        await q.click("#pvMenuBtn"); await q.click('#pvMenu [data-act="restartTraining"]'); await q.waitForFunction(() => window.BLOOM_RUN_UI && BLOOM_RUN_UI.adapter && BLOOM.planetView.instance, null, { timeout: 20000, polling: 100 }).catch(() => {});
        await sleep(400); const after = await q.evaluate(() => ({ url: location.search, running: BLOOM_RUN_UI.adapter.run().running, ticks: BLOOM_RUN_UI.adapter.run().ticks }));
        await q.evaluate(H); await q.click("#pvMenuBtn"); await q.click('#pvMenu [data-act="skipTraining"]'); await q.waitForURL(u => new URL(u).pathname.endsWith("/main-menu.html"), { timeout: 20000 }).catch(() => {});
        check(go[0] === true && J(go[1]) === "[true]" && /training=1/.test(after.url) && /ui=18/.test(after.url) && after.running === false && new URL(q.url()).pathname === "/demos/main-menu.html",
          `${tag} B22 · training actions: Resume = the real bloom:play-pause; Restart (production menu → the page's own path) reopens training paused in the production view; Skip leaves for the return page`, J({ go, after, skip: q.url().replace(ORIGIN, "") }));
        await q.context().close(); }

      // ---- B23 · widths: no horizontal scroll, the HUD fits (no overlap), touch-sized controls
      for (const [w, h] of FF ? [[1280, 800]] : [[1024, 768], [1280, 800], [1440, 900]]) {
        const q = await open("?archetype=desert_world&seed=17&ui=18", { w, h });
        await q.evaluate(() => { const A = __pv.A; A.actions.selectRegion(A.regions().find(r => r.blocked) ? A.regions().find(r => r.blocked).index : 0); }); await frames(q, 3);
        const r = await q.evaluate(() => { const de = document.documentElement, pv = document.querySelector(".pv"), hud = document.querySelector(".pv-hud"), R = el => el.getBoundingClientRect();
          const parts = [".pv-status", ".pv-tools", ".pv-clock"].map(s => R(document.querySelector(s))), vis = [...document.querySelectorAll(".pv-hud button, .pv-banner button")].filter(b => b.offsetParent);
          const small = vis.filter(b => { const r = R(b); return r.width < 43.5 || r.height < 43.5; }).map(b => (b.id || b.className) + ":" + Math.round(R(b).width) + "×" + Math.round(R(b).height));
          return { scrollX: de.scrollWidth - de.clientWidth, pvX: pv.scrollWidth - pv.clientWidth, hudX: hud.scrollWidth - hud.clientWidth, order: parts[0].right <= parts[1].left + 1 && parts[1].right <= parts[2].left + 1 && parts[2].right <= innerWidth,
            banner: R(document.getElementById("pvBanner")).right <= innerWidth && R(document.getElementById("pvBanner")).left >= 0, small, mapFill: Math.round(R(document.getElementById("pvMap")).width) === innerWidth }; });
        check(r.scrollX <= 0 && r.pvX <= 0 && r.hudX <= 0 && r.order && r.banner && !r.small.length && r.mapFill, `${tag} B23 · ${w}×${h}: no horizontal scroll, the HUD's status / tools / clock sit side by side inside the window, the banner fits, every HUD / banner control is at least 44×44 px, the map fills the stage width`, J(r));
        if (!FF && w !== 1280) await shot(q, w === 1024 ? "13-1024x768.png" : "14-1440x900.png");
        if (FF) await shot(q, "15-firefox-1280x800.png");
        await q.context().close(); }

      // ---- B24 · reduced motion
      if (!FF) { const q = await open("?archetype=ocean_archipelago&seed=28&ui=18", { rm: true });
        await q.evaluate(() => { BLOOM_API.addBiomass(200); __pv.A.actions.buy("seedOut"); }); await frames(q, 3);
        const r = await q.evaluate(() => ({ cls: document.querySelector(".pv").classList.contains("reduced"), anims: document.getAnimations().filter(a => a.playState === "running").length, spend: !!document.querySelector(".pv-spend") }));
        check(r.cls && r.anims === 0 && !r.spend, `${tag} B24 · reduced motion: the view runs no CSS animation (no spend floater, no pulses), map feedback is drawn still`, J(r));
        await shot(q, "16-reduced-motion.png"); await q.context().close(); }

      // ---- B25 · Destination Survey: every globe's texture IS the canonical surface of its exact validated world
      if (!FF) { const q = await open(ORIGIN + "/demos/destination-survey.html?rm=1", { w: 1280, h: 800, wait: false });
        await q.waitForFunction(() => window.SURVEY_DEV && SURVEY_DEV.ready && SURVEY_DEV.survey.cells && SURVEY_DEV.survey.cells.filter(Boolean).length >= 9, null, { timeout: 120000, polling: 250 }).catch(() => {});
        await sleep(800);
        const r = await q.evaluate(() => { const S = SURVEY_DEV.survey, out = [];
          S.cells.forEach((cand, i) => { if (!cand) return; const v = S.views[i], c = v._canvas, t = document.createElement("canvas"); t.width = c.width; t.height = c.height;
            const sp = BLOOM.surface.surfacePlanet(cand.planet); BLOOM.surface.paintSurface(t.getContext("2d"), sp, { render: cand.render, tileW: c.width / sp.gridWidth, tileH: c.height / sp.gridHeight });
            const a = c.getContext("2d").getImageData(0, 0, c.width, c.height).data, b = t.getContext("2d").getImageData(0, 0, t.width, t.height).data; let d = 0; for (let k = 0; k < a.length; k++) if (a[k] !== b[k]) d++;
            out.push({ i, id: cand.planet.id, diff: d, sig: v.textureSignature || null }); });
          return { n: out.length, same: out.filter(x => !x.diff).length, ids: out.map(x => x.id) }; });
        PROOF.survey = r;
        check(r.n === 9 && r.same === 9, "[chromium] B25 · Destination Survey: all nine globes' textures are the canonical surface of their exact validated worlds, pixel for pixel (the survey itself is unchanged: destination-survey-check)", J(r));
        await shot(q, "08-destination-survey-shared-surface.png"); check(!q.errs.length, "[chromium] B25b · survey page: no console error", q.errs.join(" | ") || "none"); await q.context().close(); }

      // ---- B26 · file:// boots the production view too (classic scripts only)
      if (!FF) { const c = await browser.newContext({ viewport: { width: 1280, height: 800 } }), q = await c.newPage(); const errs = []; q.on("pageerror", e => errs.push(e.message));
        await q.goto("file://" + encodeURI(path.join(ROOT, "demos/demo-run.html")) + "?ui=18"); await q.waitForFunction(() => window.BLOOM && BLOOM.planetView && BLOOM.planetView.instance, null, { timeout: 20000 }).catch(() => {});
        const r = await q.evaluate(() => !!(window.BLOOM && BLOOM.planetView && BLOOM.planetView.instance && BLOOM.planetView.instance.renderer.info().frames > 0));
        check(r && !errs.length, "[chromium] B26 · over file:// the production view boots (the surface, renderer and view are classic scripts)", errs.join(" | ") || "ok"); await c.close(); }
    } catch (e) { check(false, `${tag} crashed`, e.stack.split("\n").slice(0, 4).join(" | ")); }
    for (const pg of pages) await pg.context().close().catch(() => {});
    await browser.close();
  }
  server.close();
  if (EVIDENCE) { fs.writeFileSync(path.join(EVD, "surface-proof.json"), JSON.stringify(PROOF, null, 2) + "\n"); console.log(`INFO  evidence written to docs/evidence/bloom-029b/`); }
  console.log(`\n${fails ? `${fails} check(s) FAILED` : "ALL CHECKS PASS"}  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log("FAIL  crashed — " + e.stack); console.log("\n1 check(s) FAILED"); process.exit(1); });
