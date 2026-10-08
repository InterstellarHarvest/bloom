// BLOOM — Training foundation checks (BLOOM-028D1). The 23rd regression suite.
//
//   NODE_PATH="$(npm root -g)" node tools/training-check.js [--browsers chromium,firefox] [--shots <dir>]
//
// Node (production modules only): the authored Training Grounds loads identically every time and teaches what it claims (each
// blocked region has one answer + an honest second one; one answer is never enough, either pair wins, the hostile region is
// never needed); the training config is a derived copy (the shared config is never touched, typos refused); a training run is
// reproducible from its seed; sim.placeBubble draws no randomness; the training status store; the training URL contract; and
// the source rules (no training / tutorial branch in the engine, no second run page, no page-side Biomass grant).
// Browser (a static server on 127.0.0.1, Chromium and Firefox): ?training=1 opens paused on the derived config, under a black
// that lifts; every bloom:* event fires from real clicks with the documented detail; ordinary runs are unchanged; planet=
// selection and its failures; the title's TRAINING → fade → training → Main menu / Restart / Skip → back through the black, with
// the training status recorded; the Settings motion choice reaches both fades; back / forward never leaves a page black; the
// file:// fallback. Exits 1 on any failure.
"use strict";
const path = require("path"), fs = require("fs"), http = require("http");
const ROOT = path.resolve(__dirname, "..");
for (const f of ["content/config.js", "content/traits.js", "planets/first_bloom.js", "planets/training_grounds.js", "content/archetypes.js", "content/scenarios.js",
  "content/play.js", "content/training.js", "resources/bloom-sim.js", "resources/bloom-gen.js", "resources/bloom-validate.js", "resources/bloom-witness.js",
  "resources/bloom-archetype.js", "resources/bloom-scenario.js", "resources/bloom-play.js"]) require(path.join(ROOT, f));
const D = BLOOM_DATA, J = JSON.stringify, read = f => fs.readFileSync(path.join(ROOT, f), "utf8"), mul = BLOOM.gen.mulberry32;
const argv = process.argv, argOf = k => { const i = argv.indexOf(k); return i > 0 ? argv[i + 1] : null; };
const BROWSERS = (argOf("--browsers") || "chromium,firefox").split(","), SHOTS = argOf("--shots");
let fails = 0; const t0 = Date.now();
const check = (ok, name, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); if (!ok) fails++; };
const info = (name, detail) => console.log(`INFO  ${name}  — ${detail}`);
const fnv = a => { let h = 0x811c9dc5; for (let i = 0; i < a.length; i++) { h ^= a[i] & 0xff; h = Math.imul(h, 0x01000193); h ^= (a[i] >>> 8) & 0xff; h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(16); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

const TP = D.planets.training_grounds, T = D.training, G = D.config.grow.growThresh;
const tcfg = () => BLOOM.play.deriveConfig(D.config, T.config);
const newSim = (cfg = tcfg(), seed = T.rngSeed) => BLOOM.createSim(TP, cfg, D.traits, { rng: mul(seed) });
const plateau = (buys, seed = 7, ticks = 6000) => { const s = newSim(tcfg(), seed); for (const b of buys) { s.biomass = 1e9; if (!s.buy(b)) throw new Error("buy " + b); } s.biomass = 0;
  let c = 0; for (let t = 0; t < ticks; t++) c = s.tick(); return c; };

(async () => {
  const store = await import(path.join(ROOT, "resources/training/training-store.js"));
  const CONFIG0 = J(D.config);

  // ================================================================ Node
  // T1 · the training world loads identically every time (authored; layout from its data alone)
  { const a = newSim(), b = BLOOM.createSim(TP, D.config, D.traits, {}), M = a.map, ids = M.SEC.map(s => s.id);
    const nb = id => [...M.NBRS[M.SIDX[id]]].map(j => M.SEC[j].id).sort();
    check(fnv(M.TILEMAP) === fnv(b.map.TILEMAP) && M.SC === 6 && M.LAND === M.N && M.SEC[M.ORIGIN].id === "landing_meadow" && a.winAt === 0.65
      && J(nb("landing_meadow")) === J(["chill_hollow", "green_verge", "salt_pan", "thirsty_flats"]) && nb("reed_fen").includes("green_verge"),
      "T1 · Training Grounds loads identically (same tilemap with any config / rng), six all-land regions, origin Landing Meadow, win at 65 %",
      `tilemap ${fnv(M.TILEMAP)} · ${M.W}×${M.H} · ${ids.map(id => `${id} ${M.AREA[M.SIDX[id]]}`).join(", ")} · meadow touches ${nb("landing_meadow").join("/")}`); }

  // T2 · each region carries one lesson with an obvious answer (and an honest second one)
  { const fit = buys => { const s = newSim(); for (const b of buys) { s.biomass = 1e9; s.buy(b); } return Object.fromEntries(s.map.SEC.map((x, i) => [x.id, s.evaluate(i)])); };
    const base = fit([]), ok = (e) => e.fitness > G, row = (k, e) => `${k} ${e.fitness.toFixed(2)}`;
    const c = fit(["cold"]), w = fit(["warm"]), h = fit(["humid"]), d = fit(["drought"]), sa = fit(["salt"]);
    check(["landing_meadow", "green_verge", "reed_fen"].every(k => ok(base[k])) && ["chill_hollow", "thirsty_flats", "salt_pan"].every(k => !ok(base[k]))
      && base.chill_hollow.limitKey === "Temperature" && base.chill_hollow.cats.Temperature.word === "cold"
      && base.thirsty_flats.limitKey === "Water" && /dry|parched/.test(base.thirsty_flats.cats.Water.word)
      && base.salt_pan.limitKey === "Soil" && base.salt_pan.cats.Soil.word === "hostile" && !base.salt_pan.terraformable.Soil,
      "T2a · at the landing: Meadow, Verge, Fen grow; Chill Hollow is too cold, Thirsty Flats too dry, Salt Pan hostile soil (not terraformable)",
      Object.entries(base).map(([k, e]) => row(k, e)).join(" · "));
    check(ok(c.chill_hollow) && ok(w.chill_hollow) && !ok(c.thirsty_flats) && ok(h.thirsty_flats) && ok(d.thirsty_flats) && !ok(h.chill_hollow)
      && ok(h.reed_fen) && h.reed_fen.fitness < base.reed_fen.fitness - 0.2 && !ok(d.reed_fen) && ok(sa.salt_pan),
      "T2b · Cold Tolerance or Warm the Sky opens Chill Hollow; Humidify or Drought opens Thirsty Flats; Humidify makes Reed Fen worse but it still grows, Drought closes it; Salt Handling opens Salt Pan",
      `cold→chill ${c.chill_hollow.fitness.toFixed(2)} · warm→chill ${w.chill_hollow.fitness.toFixed(2)} · humid→flats ${h.thirsty_flats.fitness.toFixed(2)}, fen ${h.reed_fen.fitness.toFixed(2)} · drought→flats ${d.thirsty_flats.fitness.toFixed(2)}, fen ${d.reed_fen.fitness.toFixed(2)}`);
    const s = newSim(), pv = id => { const p = s.previewOf(id); return { gain: p.gain.map(i => s.map.SEC[i].id), lose: p.lose.map(i => s.map.SEC[i].id) }; };
    check(J(pv("cold")) === J({ gain: ["chill_hollow"], lose: [] }) && J(pv("humid")) === J({ gain: ["thirsty_flats"], lose: [] }) && J(pv("drought")) === J({ gain: ["thirsty_flats"], lose: ["reed_fen"] }),
      "T2c · the shop preview tells the same story (Cold opens Chill Hollow; Humidify opens Thirsty Flats and closes nothing; Drought opens it but closes Reed Fen)",
      `cold ${J(pv("cold"))} · humid ${J(pv("humid"))} · drought ${J(pv("drought"))}`); }

  // T3 · forgiving and honest: one answer is never enough, either pair wins with room, the hostile region is never needed
  { const r = Object.fromEntries([["none", []], ["cold", ["cold"]], ["humid", ["humid"]], ["cold+humid", ["cold", "humid"]], ["cold+drought", ["cold", "drought"]], ["warm+humid", ["warm", "humid"]]]
      .map(([k, b]) => [k, plateau(b)])), win = TP.winThreshold, seeds = [1, 2, 3].map(sd => plateau(["cold", "humid"], sd));
    check(r.none < win - 0.2 && r.cold < win - 0.03 && r.humid < win - 0.03 && r["cold+humid"] > win + 0.1 && r["cold+drought"] > win + 0.05 && r["warm+humid"] > win + 0.1
      && Math.max(...seeds) - Math.min(...seeds) < 0.01,
      "T3 · plateaus (6000 ticks, real engine): one answer stays under 65 %, every pair of answers wins with room, without Salt Pan; the same for any seed",
      Object.entries(r).map(([k, v]) => `${k} ${(v * 100).toFixed(1)}%`).join(" · ") + ` · cold+humid seeds 1–3 ${seeds.map(v => (v * 100).toFixed(1)).join("/")}`); }

  // T4 · the training config is a derived copy: the shared config never changes and differs only where content/training.js says
  { const c = tcfg(), paths = [];
    const diff = (a, b, at) => { for (const k of Object.keys(a)) { const p = at ? `${at}.${k}` : k;
      if (a[k] && typeof a[k] === "object") diff(a[k], b[k], p); else if (a[k] !== b[k]) paths.push(`${p} ${a[k]}→${b[k]}`); } };
    diff(D.config, c, ""); let typo = null, kind = null;
    try { BLOOM.play.deriveConfig(D.config, { econ: { startBiomas: 1 } }); } catch (e) { typo = e.message; }
    try { BLOOM.play.deriveConfig(D.config, { econ: 5 }); } catch (e) { kind = e.message; }
    check(J(D.config) === CONFIG0 && c !== D.config && c.econ !== D.config.econ && J(paths.map(p => p.split(" ")[0]).sort()) === J(["econ.bubbleAutoTicks", "econ.bubbleChance", "econ.originTrickle", "econ.startBiomass"])
      && /not a config setting/.test(typo) && /must be a group/.test(kind) && newSim().biomass === 150 && BLOOM.createSim(TP, D.config, D.traits, {}).biomass === D.config.econ.startBiomass,
      "T4 · deriveConfig: a deep copy with exactly the four training overrides; the shared config is byte-identical after it; typos and wrong kinds refused",
      paths.join(" · ")); }

  // T5 · a training run is reproducible from its seed; sim.placeBubble draws no randomness
  { const script = s => { const out = []; for (let t = 0; t < 1500; t++) { if (t === 50) s.buy("cold"); if (t === 900) s.buy("humid"); if (t === 600) s.setColonyFocus(s.map.ORIGIN, "leaves"); s.tick(); } return s; };
    const a = script(newSim()), b = script(newSim()), h = s => `${fnv(s.state)}/${fnv(new Uint8Array(s.dens.buffer))}/${Math.round(s.biomass * 1000)}`;
    const x = newSim(), y = newSim(); let placed = -1, refused = [];
    for (let t = 0; t < 900; t++) { if (t === 200) { const tl = x.map.SEC_TILES[x.map.ORIGIN].find(i => x.state[i] === x.LIV);
        refused = [x.placeBubble(-1), x.placeBubble(x.map.N), x.placeBubble(x.map.SEC_TILES[x.map.SIDX.salt_pan][0]), x.placeBubble(1.5)];
        placed = x.placeBubble(tl) ? tl : -1; refused.push(x.placeBubble(tl)); } x.tick(); y.tick(); }
    const E = T.config.econ, auto = D.config.econ.bubbleValue * D.config.econ.autoCollectShare;
    check(h(a) === h(b) && a.genome.cold === 1 && a.tf.humid === 1,
      "T5a · same seed + same actions on the same ticks → the same run (tiles, stand density, Biomass)", `run ${h(a)}`);
    check(placed >= 0 && refused.every(r => r === false) && fnv(x.state) === fnv(y.state) && fnv(new Uint8Array(x.dens.buffer)) === fnv(new Uint8Array(y.dens.buffer))
      && Math.abs((x.biomass - y.biomass) - auto) < 1e-6 && x.bubbles.length === 0 && E.bubbleChance === 0,
      "T5b · placeBubble: only on a Living land tile, one per tile; it draws no randomness (the run is tile-for-tile the same) and pays exactly an auto-collected bubble after econ.bubbleAutoTicks",
      `placed on tile ${placed} · refused ${refused.length} · Biomass difference ${(x.biomass - y.biomass).toFixed(2)} = ${auto}`); }

  // T6 · the training status store
  { const mem = () => { const m = new Map(); return { getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), m }; };
    const bad = { getItem() { throw new Error("denied"); }, setItem() { throw new Error("quota"); }, removeItem() { throw new Error("denied"); } };
    const s = mem(), r0 = store.readTraining(s), w1 = store.writeTraining(s, "skipped", 5), r1 = store.readTraining(s), w2 = store.writeTraining(s, "completed", 6), w3 = store.writeTraining(s, "skipped", 7), r3 = store.readTraining(s);
    const junk = mem(); junk.setItem(store.TRAINING_KEY, "{nope"); const old = mem(); old.setItem(store.TRAINING_KEY, J({ v: 0, status: "completed", at: 1 }));
    let refused = false; try { store.writeTraining(s, "done"); } catch { refused = true; }
    store.clearTraining(s);
    check(r0.status === null && w1.status === "skipped" && r1.status === "skipped" && r1.at === 5 && w2.status === "completed" && w3.status === "completed" && r3.status === "completed" && r3.at === 6
      && store.readTraining(junk).status === null && store.readTraining(old).status === null && store.readTraining(bad).status === null && store.writeTraining(bad, "skipped").status === "skipped"
      && store.readTraining(null).status === null && refused && store.readTraining(s).status === null && store.TRAINING_KEY === "strange-bloom.training",
      "T6 · training status: none → skipped → completed, never downgraded to skipped; junk / another version / no storage / throwing storage read as none and never throw; unknown status refused",
      `stored ${s.m.get(store.TRAINING_KEY) ?? "(cleared)"} · key ${store.TRAINING_KEY} · v${store.TRAINING_VERSION}`); }

  // T7 · the training URL contract
  { const P = BLOOM.play, here = "http://127.0.0.1:9/demos/demo-run.html?training=1";
    const cases = [["main-menu.html?bg=2", "http://127.0.0.1:9/demos/main-menu.html?bg=2"], ["/index.html", "http://127.0.0.1:9/index.html"], ["https://example.com/", null], ["//example.com/x", null],
      ["javascript:alert(1)", null], ["data:text/html,x", null], ["http://127.0.0.1:10/demos/main-menu.html", null], [null, null], ["http://[bad", null]];
    const fb = "http://127.0.0.1:9/index.html", got = cases.map(([v, want]) => [v, P.safeReturn(v, here, T.returnTo), want || fb]);
    check(got.every(([, g, w]) => g === w) && P.trainingQuery() === "training=1" && P.trainingQuery({ planet: "first_bloom", returnTo: "http://a/b?c=1&d" }) === "training=1&planet=first_bloom&return=http%3A%2F%2Fa%2Fb%3Fc%3D1%26d",
      "T7 · return= goes back only to the same origin (else the title page, content/training.js returnTo — since BLOOM-030 the ROOT index.html, the canonical Strange Bloom title); trainingQuery builds the documented query",
      got.filter(([, g, w]) => g !== w).map(([v, g]) => `${v} → ${g}`).join(" | ") || `${cases.length} return values resolved as documented`); }

  // T8 · source rules
  { const simSrc = read("resources/bloom-sim.js"), run = read("demos/demo-run.html"), tr = read("resources/training/training-run.js"), ee = read("resources/main-menu/expedition-entry.js");
    const anchors = ["biomass", "coverage", "sky", "play-pause", "speed", "map", "inspect", "upgrades", "message-log", "report", "limiting-factor", "readout", "colony-status", "raw-signals",
      "growth-focus", "local-upgrade", "run-menu", "run-actions", "report-continue"].filter(a => !run.includes(`data-tutorial="${a}"`));
    const dyn = ["focus-${k}", "local-${id}", "board-${gname.toLowerCase()}", "upgrade-${u.id}", "action-${a.id}"].filter(a => !run.includes(`data-tutorial="${a}"`));
    const pages = fs.readdirSync(path.join(ROOT, "demos")).filter(f => /tutorial|training/i.test(f));
    check(!/training|tutorial/i.test(simSrc) && !/["'`](first_bloom|training_grounds|landing_meadow)["'`]/.test(simSrc) && (run.match(/biomass\s*\+=/g) || []).length === 1 && pages.length === 0
      && !/training/i.test(read("content/config.js")) && !/training/i.test(read("content/traits.js")),
      "T8a · no training or tutorial branch in the engine, no planet-id special case, no second run page, no page-side Biomass grant, config / traits never mention training",
      `demo pages named training/tutorial: ${pages.length} · demo-run Biomass grants: ${(run.match(/biomass\s*\+=/g) || []).length} (the BLOOM_API test hook)`);
    check(/from "\.\.\/main-menu\/black-fade\.js"/.test(tr) && /from "\.\/black-fade\.js"/.test(ee) && !/\.animate\(/.test(tr) && !/\.animate\(\[\{ opacity/.test(ee)
      && /readSettings, reducedMotionFor \} from "\.\.\/main-menu\/main-menu-data\.js"/.test(tr) && !/strange-bloom\.settings/.test(tr + run),
      "T8b · one fade (black-fade.js) for the title and the training page; the motion choice is read through main-menu-data.js, never re-parsed");
    check(!anchors.length && !dyn.length, "T8c · every documented data-tutorial anchor is on the run page", [...anchors, ...dyn].join(", ") || "19 static + 5 per-item families"); }

  // ================================================================ Browser
  let pw; try { pw = require("playwright"); } catch { console.error('Playwright not found. Run with NODE_PATH="$(npm root -g)".'); process.exit(2); }
  const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".jpg": "image/jpeg", ".png": "image/png", ".json": "application/json" };
  // (BLOOM-030) "/" serves the root index.html, as any static web server does: the canonical Strange Bloom title
  const server = http.createServer((req, res) => { const p0 = decodeURIComponent(new URL(req.url, "http://x").pathname), u = p0.endsWith("/") ? p0 + "index.html" : p0, f = path.join(ROOT, u);
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream", "cache-control": "no-store" }); fs.createReadStream(f).pipe(res); });
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  const BASE = `http://127.0.0.1:${server.address().port}`, RUN = `${BASE}/demos/demo-run.html`, MENU = `${BASE}/?bg=1&workers=2`; // (BLOOM-030) the canonical title: the repository root
  const EVTS = ["run-ready", "play-pause", "speed", "region-select", "upgrade-preview", "upgrade-purchase", "growth-focus", "local-upgrade", "bubble-collect", "win"];
  const INIT = types => { window.__EV = []; for (const t of types) document.addEventListener("bloom:" + t, e => window.__EV.push({ type: t, detail: e.detail, at: performance.now() }));
    // (BLOOM-029E) the arrival cover sampled AT bloom:run-ready (before the training layer's lift, two frames later): the production view's
    // heavier first frame made the suite's own post-boot sample land inside the fade
    document.addEventListener("bloom:run-ready", () => { const cv = document.getElementById("trainingCover"); window.__coverAtReady = { cover: !!cv, op: cv ? getComputedStyle(cv).opacity : null }; });
    addEventListener("pageshow", e => { window.__persisted = e.persisted; }); };

  for (const bname of BROWSERS) {
    let browser; try { browser = await pw[bname].launch(); } catch (e) { check(false, `[${bname}] browser launches`, e.message.split("\n")[0]); continue; }
    const B = `[${bname}]`;
    const ctx = async (settings) => { const c = await browser.newContext({ viewport: { width: 1400, height: 900 } });
      await c.addInitScript(INIT, EVTS);
      if (settings) await c.addInitScript(s => { try { if (!sessionStorage.getItem("__set")) { localStorage.setItem("strange-bloom.settings", s); sessionStorage.setItem("__set", "1"); } } catch {} }, J(settings));
      return c; };
    const watch = p => { p.errs = []; p.on("pageerror", e => p.errs.push(e.message)); p.on("console", m => { if (m.type() === "error") p.errs.push("console: " + m.text()); }); return p; };
    const ev = p => p.evaluate(() => window.__EV.map(e => ({ type: e.type, detail: e.detail })));
    const last = async (p, type) => (await ev(p)).filter(e => e.type === type).pop() || null;
    const ready = p => p.waitForFunction(() => window.BLOOM_RUN && BLOOM_RUN.started, null, { timeout: 15000 });
    const lifted = p => p.waitForFunction(() => { const c = document.getElementById("trainingCover"); return !c || getComputedStyle(c).display === "none"; }, null, { timeout: 8000 });
    // a region / tile on screen (the tile of region `id` nearest its centre)
    const tileXY = (p, t) => p.evaluate(t => { const r = cv.getBoundingClientRect(), W = sim.map.W; return { x: r.left + ((t % W) + .5) * TILE, y: r.top + (((t / W) | 0) + .5) * TILE }; }, t);
    const regionTile = (p, id) => p.evaluate(id => { const M = sim.map, s = M.SIDX[id], c = M.CENT[s]; let best = -1, bd = 1e9;
      for (const t of M.SEC_TILES[s]) { const d = ((t % M.W) + .5 - c.x) ** 2 + (((t / M.W) | 0) + .5 - c.y) ** 2; if (d < bd) { bd = d; best = t; } } return best; }, id);

    // B1 · ?training=1: paused, derived config, seeded, under a black that lifts
    { const c = await ctx(), p = watch(await c.newPage()); await p.goto(`${RUN}?training=1`); await ready(p);
      const atOpen = await p.evaluate(() => window.__coverAtReady || { cover: false, op: null });
      await lifted(p); await sleep(600);
      const s = await p.evaluate(() => ({ st: BLOOM_API.state(), btn: document.getElementById("btnPlay").textContent.trim(), pressed: document.getElementById("btnPlay").getAttribute("aria-pressed"),
        planet: BLOOM_RUN.planet.id, title: document.title, sub: document.querySelector("header h1 small").textContent, shared: JSON.stringify(BLOOM_DATA.config), own: sim.config !== BLOOM_DATA.config,
        start: sim.config.econ.startBiomass, sharedStart: BLOOM_DATA.config.econ.startBiomass, menu: [...document.querySelectorAll("#playMenu button")].map(b => b.dataset.act),
        ready: window.__EV.find(e => e.type === "run-ready"), ui: !!window.BLOOM_TRAINING_UI, ret: BLOOM_RUN.training.returnTo, liftedAt: BLOOM_TRAINING_UI.stats.liftedAt }));
      check(s.st.ticks === 0 && s.st.running === false && s.btn === "▶ play" && s.pressed === "false" && s.st.biomass === 150 && s.planet === "training_grounds" && s.ready && s.ready.detail.running === false && s.ready.detail.training === true,
        `${B} B1a · ?training=1 opens Training Grounds PAUSED at the landing (no tick after 0.6 s), with the training Biomass`, `ticks ${s.st.ticks} · button "${s.btn}" · Biomass ${s.st.biomass} · "${s.title}" ${s.sub}`);
      check(s.own && s.start === 150 && s.sharedStart === D.config.econ.startBiomass && s.shared === CONFIG0,
        `${B} B1b · the run's config is its own derived copy; the page's shared BLOOM_DATA.config is byte-identical to content/config.js`);
      check(atOpen.cover && +atOpen.op === 1 && s.ui && Number.isFinite(s.liftedAt) && J(s.menu) === J(["restartTraining", "skipTraining", "mainMenu"]) && s.ret === `${BASE}/index.html`,
        `${B} B1c · it opens under full black, the training layer lifts it once drawn; ☰ Training offers Restart · Skip · Main menu; no return= → the title page (BLOOM-030: the root index.html)`, `return ${s.ret}`);
      // seeded: the same scripted ticks + purchases on two loads → the same run
      const run = async () => { const q = watch(await c.newPage()); await q.goto(`${RUN}?training=1`); await ready(q);
        const h = await q.evaluate(() => { BLOOM_API.advance(60); BLOOM_API.buy("cold"); BLOOM_API.advance(500); return Array.from(sim.state).join("") + "|" + Math.round(sim.biomass * 1000) + "|" + sim.bubbles.length; }); await q.close(); return h; };
      const h1 = await run(), h2 = await run();
      check(h1 === h2, `${B} B1d · the training run is seeded: two page loads, same scripted ticks + purchase → tile-for-tile the same run`, `${h1.length} chars · ${fnv(Buffer.from(h1))}`);
      check(!p.errs.length, `${B} B1e · no page errors`, p.errs.join(" | "));
      if (SHOTS && bname === "chromium") await p.screenshot({ path: path.join(SHOTS, "01-training-paused-landing.png") });
      await c.close(); }

    // B2 · every bloom:* event fires from real player actions, with the documented detail — through the 028D1 engineering shell's own
    // controls, the foundation's oracle (BLOOM-029E: the shell is the hidden sim host by default, so this page opens it with the developer
    // flag ?ui=legacy; the production controls fire the same events through the same page functions: run-ui / planet-view / plant-rooms /
    // terraform / run-ui-convergence suites)
    { const c = await ctx(), p = watch(await c.newPage()); await p.goto(`${RUN}?training=1&ui=legacy`); await ready(p); await lifted(p);
      await p.click("#btnPlay"); await sleep(400); await p.click("#btnPlay");
      const pp = (await ev(p)).filter(e => e.type === "play-pause").map(e => e.detail.running), ticks = await p.evaluate(() => sim.ticks);
      await p.click("#btnSpeed"); const sp = await last(p, "speed");
      check(J(pp) === "[true,false]" && ticks > 0 && sp && sp.detail.speed === 2, `${B} B2a · ▶ / ⏸ → bloom:play-pause {running}; speed → bloom:speed {speed}`, `play-pause ${J(pp)} after ${ticks} ticks · speed ${sp && sp.detail.speed}`);
      const ch = await tileXY(p, await regionTile(p, "chill_hollow")); await p.mouse.click(ch.x, ch.y); const rs = await last(p, "region-select");
      await p.mouse.click(ch.x, ch.y); const rs2 = await last(p, "region-select");
      check(rs && rs.detail.id === "chill_hollow" && rs.detail.name === "Chill Hollow" && rs.detail.previous === "landing_meadow" && rs.detail.water === false && rs2.detail.id === null && rs2.detail.previous === "chill_hollow",
        `${B} B2b · a map click → bloom:region-select {index, id, name, previous, water, tile}; clicking it again deselects (id null)`, J(rs && rs.detail));
      await p.hover('[data-tutorial="upgrade-cold"]'); const pv = await last(p, "upgrade-preview");
      await p.click('[data-tutorial="upgrade-cold"]'); const pu = await last(p, "upgrade-purchase");
      check(pv && pv.detail.id === "cold" && pv.detail.board === "Adapt" && pv.detail.available && J(pv.detail.gain) === '["chill_hollow"]' && pu && pu.detail.id === "cold" && pu.detail.cost === 140 && pu.detail.tier === 1
        && await p.evaluate(() => sim.genome.cold === 1),
        `${B} B2c · hovering an upgrade → bloom:upgrade-preview {id, board, available, gain, lose, better, worse}; buying it → bloom:upgrade-purchase {id, board, cost, tier, biomass}`, `${J(pv && pv.detail.gain)} · ${J(pu && pu.detail)}`);
      await p.hover('[data-tutorial="upgrade-humid"]'); const ph = await last(p, "upgrade-preview");
      await p.click('[data-tutorial="upgrade-humid"]', { force: true }); const notBought = (await ev(p)).filter(e => e.type === "upgrade-purchase").length;
      check(ph && ph.detail.id === "humid" && J(ph.detail.gain) === '["thirsty_flats"]' && ph.detail.worse.includes("reed_fen") && notBought === 1,
        `${B} B2d · Humidify's preview names what it opens and what it makes worse; clicking it unaffordable buys nothing and sends no purchase event`, `gain ${J(ph && ph.detail.gain)} · worse ${J(ph && ph.detail.worse)}`);
      const mh = await tileXY(p, await regionTile(p, "landing_meadow")); await p.mouse.click(mh.x, mh.y);
      await p.click('[data-tutorial="focus-leaves"]'); const gf = await last(p, "growth-focus");
      await p.evaluate(() => { for (let k = 0; k < 40 && sim.biomass < sim.specPrice(); k++) BLOOM_API.advance(25); renderColonyCtl(true); });
      await p.click('[data-tutorial="local-rootNetwork"]'); const lu = await last(p, "local-upgrade");
      check(gf && gf.detail.id === "landing_meadow" && gf.detail.focus === "leaves" && gf.detail.previous === "balanced" && gf.detail.changed === true
        && lu && lu.detail.id === "landing_meadow" && lu.detail.name === "Landing Meadow" && lu.detail.upgrade === "rootNetwork" && lu.detail.upgradeName === "Root Network" && lu.detail.cost === 90 && await p.evaluate(() => sim.getSpecialization(sim.map.ORIGIN) === "rootNetwork"),
        `${B} B2e · a growth-focus button → bloom:growth-focus {id, focus, previous, changed}; a local upgrade → bloom:local-upgrade {id, upgrade, cost}`, `${J(gf && gf.detail)} · ${J(lu && lu.detail)}`);
      const bt = await p.evaluate(() => BLOOM_RUN_UI.placeBubble()), again = await p.evaluate(() => BLOOM_RUN_UI.placeBubble()), b0 = await p.evaluate(() => sim.biomass);
      await sleep(100); const bxy = await tileXY(p, bt); await p.mouse.click(bxy.x, bxy.y); const bc = await last(p, "bubble-collect"), b1 = await p.evaluate(() => sim.biomass);
      const bt2 = await p.evaluate(() => BLOOM_RUN_UI.placeBubble("green_verge")); await p.evaluate(n => BLOOM_API.advance(n), T.config.econ.bubbleAutoTicks + 2); await sleep(150);
      const ba = await last(p, "bubble-collect"), none = await p.evaluate(() => BLOOM_RUN_UI.placeBubble("salt_pan"));
      check(bt >= 0 && again >= 0 && again !== bt && bc && bc.detail.how === "click" && bc.detail.tile === bt && bc.detail.id === "landing_meadow" && bc.detail.value === 25 && Math.abs(b1 - b0 - 25) < 1e-6
        && bt2 >= 0 && ba && ba.detail.how === "auto" && ba.detail.tile === bt2 && ba.detail.id === "green_verge" && ba.detail.value === 12.5 && none === -1,
        `${B} B2f · BLOOM_RUN_UI.placeBubble puts a bubble on a chosen region (never on dead ground); clicking it → bloom:bubble-collect {how:"click", value 25}; left alone → {how:"auto", value 12.5}`,
        `click on tile ${bt} (+${(b1 - b0).toFixed(0)}) · auto ${J(ba && ba.detail)} (placed ${bt2}, second ${again}) · Salt Pan → ${none} · all ${J((await ev(p)).filter(e => e.type === "bubble-collect").map(e => e.detail.how + e.detail.tile))}`);
      // win: Humidify through the real button, then the run to 65 %
      await p.evaluate(() => { for (let k = 0; k < 80 && sim.biomass < sim.price(sim.traitById.humid); k++) BLOOM_API.advance(25); refreshShop(); }); await p.click('[data-tutorial="upgrade-humid"]');
      const won = await p.evaluate(() => { for (let k = 0; k < 40 && !sim.won; k++) BLOOM_API.advance(150); return sim.won; }); await sleep(200);
      const w = await last(p, "win"), rep = await p.evaluate(() => ({ h2: document.querySelector("#report h2").textContent, acts: [...document.querySelectorAll("#runActions button")].map(b => b.dataset.act),
        modal: document.getElementById("reportModal").classList.contains("on"), status: BLOOM_TRAINING_UI.status().status, order: window.__EV.map(e => e.type).filter(t => t !== "upgrade-preview") }));
      check(won && w && w.detail.training === true && w.detail.planetId === "training_grounds" && w.detail.coverage >= 0.65 && rep.modal && /TRAINING COMPLETE/.test(rep.h2)
        && J(rep.acts) === J(["beginExpedition", "restartTraining", "mainMenu"]) && rep.status === "completed",
        `${B} B2g · reaching 65 % → bloom:win {coverage, ticks, planetId, training}; the report reads Training complete with (BLOOM-028D2) Begin Expedition · Restart training · Main menu, and the status is recorded "completed"`,
        `coverage ${w && (w.detail.coverage * 100).toFixed(1)}% at tick ${w && w.detail.ticks} · ${rep.h2}`);
      check(EVTS.every(t => rep.order.includes(t) || t === "upgrade-preview") && !p.errs.length, `${B} B2h · all ten event types seen, no page errors`, rep.order.join(" → ").slice(0, 400));
      if (SHOTS && bname === "chromium") await p.screenshot({ path: path.join(SHOTS, "02-training-complete.png") });
      await c.close(); }

    // B3 · ordinary runs are unchanged
    { const c = await ctx(), p = watch(await c.newPage()); await p.goto(RUN); await ready(p); await sleep(700);
      const a = await p.evaluate(() => ({ st: BLOOM_API.state(), title: document.title, sub: document.querySelector("header h1 small").textContent, planet: BLOOM_RUN.planet.id, cover: !!document.getElementById("trainingCover"),
        mod: !!document.querySelector('script[src*="training-run"]'), ui: typeof window.BLOOM_TRAINING_UI, tr: BLOOM_RUN.training, same: sim.config === BLOOM_DATA.config, btn: document.getElementById("btnPlay").textContent.trim() }));
      check(a.st.running && a.st.ticks > 0 && a.st.biomass >= D.config.econ.startBiomass && a.title === "Strange Bloom — First Bloom" && a.sub === "· first bloom" && a.planet === "first_bloom"
        && !a.cover && !a.mod && a.ui === "undefined" && a.tr === undefined && a.same && a.btn === "⏸ pause",
        `${B} B3a · no query: First Bloom runs at once on the shared config, as before — no black, no training layer (BLOOM-029E: the production title "Strange Bloom — First Bloom")`, `ticks ${a.st.ticks} after 0.7 s · "${a.title}" ${a.sub}`);
      await p.goto(`${RUN}?play=1`); await ready(p);
      const pl = await p.evaluate(() => ({ acts: [...document.querySelectorAll("#playMenu button")].map(b => `${b.dataset.act}=${b.dataset.go}`), label: document.getElementById("btnMenu").textContent, title: document.title }));
      check(J(pl.acts) === J(["playAgain=demo-run.html?play=1", "changePlanet=../index.html?begin=1", "home=../index.html"]) && pl.label === "☰ Menu" && pl.title === "Strange Bloom — First Bloom",
        `${B} B3b · ?play=1: the same player menu actions as before (the page's own; the production run menu lists them), the production title; (BLOOM-030) the retired launcher's routes are now the root title: Change planet = its Destination Survey (begin=1), Home = the title`, pl.acts.join(" · "));
      const rnd = async () => { await p.goto(RUN); await ready(p); return p.evaluate(() => { BLOOM_API.advance(400); return Array.from(sim.state).join(""); }); };
      const r1 = await rnd(), r2 = await rnd();
      check(r1 !== r2, `${B} B3c · ordinary runs keep their own live randomness (two loads, same ticks → different runs; only training is seeded)`);
      check(!p.errs.length, `${B} B3d · no page errors`, p.errs.join(" | "));
      await c.close(); }

    // B4 · planet= selection and its explicit failures
    { const c = await ctx(), p = watch(await c.newPage()), go = async q => { await p.goto(`${RUN}?${q}`); await p.waitForFunction(() => window.BLOOM_API, null, { timeout: 15000 }); await sleep(150);
        return p.evaluate(() => ({ started: !!(window.BLOOM_RUN && BLOOM_RUN.started), planet: window.BLOOM_RUN && BLOOM_RUN.planet && BLOOM_RUN.planet.id, fail: (document.getElementById("genFail") || {}).innerText || null,
          running: window.BLOOM_API.state ? BLOOM_API.state().running : null })); };
      const fb = await go("planet=first_bloom"), tg = await go("planet=training_grounds"), tgc = await p.evaluate(() => ({ shared: sim.config === BLOOM_DATA.config, bio: sim.config.econ.startBiomass }));
      await p.goto(`${RUN}?play=1&planet=training_grounds`); await ready(p);
      const again = await p.evaluate(() => document.querySelector('#playMenu [data-act="playAgain"]').dataset.go);
      const bad = await go("planet=nowhere"), mix = await go("planet=first_bloom&archetype=desert_world&seed=3"), trA = await go("training=1&archetype=desert_world"), trS = await go("training=1&scenario=dying_world"),
        junk = await go("planet=__proto__");
      check(fb.started && fb.planet === "first_bloom" && fb.running && tg.started && tg.planet === "training_grounds" && tg.running && tgc.shared && tgc.bio === D.config.econ.startBiomass && again === "demo-run.html?play=1&planet=training_grounds",
        `${B} B4a · planet=<id> opens that authored world as an ordinary run (shared config, running); Play again keeps planet=`, `play again → ${again}`);
      check([bad, mix, trA, trS, junk].every(r => !r.started && r.fail) && /unknown planet "nowhere"/.test(bad.fail) && /cannot be combined/.test(mix.fail) && /leave out archetype/.test(trA.fail) && /no scenario/.test(trS.fail),
        `${B} B4b · an unknown planet, planet= with a seed, training with an archetype or a scenario → the explicit no-run page, never a substitute`, [bad, mix, trA, trS, junk].map(r => r.fail.split("\n")[2] || r.fail.split("\n")[1]).join(" | ").slice(0, 300));
      check(!p.errs.length, `${B} B4c · no page errors`, p.errs.join(" | ")); await c.close(); }

    // B5 · the title's TRAINING → training → Main menu / Restart / Skip, through the black; the training status
    for (const rmCase of [null, "reduced"]) {
      const c = await ctx(rmCase ? { motion: rmCase } : null), p = watch(await c.newPage()), R = rmCase ? " (Settings: reduced motion)" : "";
      const toBlack = rmCase ? 80 : 220, fromBlack = rmCase ? 80 : 250;
      const title = async () => { await p.waitForFunction(() => window.MENU_DEV && MENU_DEV.ready, null, { timeout: 20000 }); };
      const sampleTitleLeave = () => p.evaluate(() => { const E = MENU_DEV.entry; window.__leave = []; const f = () => { const cs = getComputedStyle(E.black);
        window.__leave.push(cs.display === "none" ? 0 : +cs.opacity); try { sessionStorage.setItem("__leave", JSON.stringify({ max: Math.max(...window.__leave), n: window.__leave.length,
          dur: (E.black.getAnimations()[0] || { effect: { getTiming: () => ({}) } }).effect.getTiming().duration ?? window.__dur, state: E.state })); } catch {} requestAnimationFrame(f); };
        new MutationObserver(() => { const a = E.black.getAnimations()[0]; if (a) window.__dur = a.effect.getTiming().duration; }).observe(E.black, { attributes: true }); f(); });
      await p.goto(MENU); await title(); await sampleTitleLeave();
      await Promise.all([p.waitForURL(/demo-run\.html\?training=1/, { timeout: 15000 }), p.click('.mm-item[data-act="training"]')]);
      await ready(p); const leave = await p.evaluate(() => JSON.parse(sessionStorage.getItem("__leave") || "null"));
      const coverAnim = await p.waitForFunction(() => { const c = document.getElementById("trainingCover"), a = c && c.getAnimations()[0]; return a ? a.effect.getTiming().duration : null; }, null, { timeout: 8000 }).then(h => h.jsonValue()).catch(() => null);
      await lifted(p);
      const arr = await p.evaluate(() => ({ url: location.href, ret: BLOOM_RUN.training.returnTo, paused: !BLOOM_API.state().running, status: BLOOM_TRAINING_UI.status().status }));
      check(leave && leave.max >= 0.999 && leave.state === "leaving" && leave.dur === toBlack && arr.url.startsWith(`${RUN}?training=1&return=`) && arr.ret === MENU && arr.paused && coverAnim === fromBlack && arr.status === null,
        `${B} B5a${R} · TRAINING: the title fades to full black and opens the training run (return= the title, query and all); it lifts its black (${fromBlack} ms) onto a paused landing`,
        `title black ${leave && leave.dur} ms, max ${leave && leave.max} over ${leave && leave.n} frames · lift ${coverAnim} ms · ${arr.url.replace(BASE, "")}`);
      const exitVia = async act => { await p.click("#pvMenuBtn"); const durP = p.waitForFunction(() => { const c = document.getElementById("trainingCover"), a = c && c.getAnimations()[0]; return a ? a.effect.getTiming().duration : null; }, null, { timeout: 5000, polling: "raf" }).then(h => h.jsonValue()).catch(() => null);
        const navP = act === "restartTraining" ? p.waitForEvent("load", { timeout: 15000 }) : p.waitForURL(u => u.pathname === "/", { timeout: 15000 });
        await p.click(`#pvMenu [data-act="${act}"]`);
        if (act === "skipTraining") await p.click('[data-training-skip] [data-skip="skip"]'); // (BLOOM-028D2) a guided training asks once before a skip
        const dur = await durP; await navP; return dur; };
      const d1 = await exitVia("mainMenu"); await title();
      const back1 = await p.evaluate(() => ({ url: location.href, status: (() => { try { return JSON.parse(localStorage.getItem("strange-bloom.training")); } catch { return "err"; } })() }));
      check(d1 === toBlack && back1.url === MENU && back1.status === null, `${B} B5b${R} · ☰ → Main menu: fades to black (${toBlack} ms) and returns to the very title page; nothing recorded`, `${d1} ms · ${back1.url.replace(BASE, "")}`);
      // back / forward never leaves a page black: the training page that left through its black (Back), the title that left through
      // its black (TRAINING, then Back) — restored from the back-forward cache (pageshow persisted) or reloaded
      await p.goBack({ timeout: 15000 }); await ready(p); await lifted(p);
      const bk = await p.evaluate(() => ({ persisted: window.__persisted, cover: (c => c ? getComputedStyle(c).display : "none")(document.getElementById("trainingCover")), leaving: BLOOM_TRAINING_UI.stats.leaving }));
      await p.goForward({ timeout: 15000 }); await title();
      await Promise.all([p.waitForURL(/demo-run\.html\?training=1/, { timeout: 15000 }), p.click('.mm-item[data-act="training"]')]); await ready(p);
      await p.goBack({ timeout: 15000 }); await title();
      await p.waitForFunction(() => getComputedStyle(MENU_DEV.entry.black).display === "none" && !MENU_DEV.entry.menuHost.inert && MENU_DEV.entry.state === "menu", null, { timeout: 5000 }).catch(() => null);
      const fw = await p.evaluate(() => ({ persisted: window.__persisted, black: getComputedStyle(MENU_DEV.entry.black).display, inert: MENU_DEV.entry.menuHost.inert, state: MENU_DEV.entry.state,
        focus: document.activeElement && document.activeElement.dataset.act }));
      check(bk.cover === "none" && !bk.leaving && fw.black === "none" && !fw.inert && fw.state === "menu", `${B} B5c${R} · Back to a training page that left through its black, and Back to a title that left for TRAINING: neither stays black`,
        `training page ${bk.persisted ? "restored from the back-forward cache" : "reloaded"} · title ${fw.persisted ? "restored from the back-forward cache" : "reloaded"} (focus ${fw.focus})`);
      await sampleTitleLeave();
      // Restart: the same URL again, a fresh page, paused
      await Promise.all([p.waitForURL(/demo-run\.html\?training=1/, { timeout: 15000 }), p.click('.mm-item[data-act="training"]')]); await ready(p); await lifted(p);
      const o1 = await p.evaluate(() => { BLOOM_API.advance(300); return { origin: performance.timeOrigin, url: location.href, ticks: sim.ticks }; });
      const d2 = await exitVia("restartTraining"); await ready(p); await lifted(p);
      const o2 = await p.evaluate(() => ({ origin: performance.timeOrigin, url: location.href, ticks: sim.ticks, running: BLOOM_API.state().running, bio: BLOOM_API.state().biomass }));
      check(d2 === toBlack && o2.origin !== o1.origin && o2.url === o1.url && o1.ticks === 300 && o2.ticks === 0 && !o2.running && o2.bio === 150,
        `${B} B5d${R} · ☰ → Restart training: through the black, the same URL as a fresh page — back at a paused landing (tick 0, 150 Biomass)`, `${d2} ms · tick ${o1.ticks} → ${o2.ticks}`);
      const d3 = await exitVia("skipTraining"); await title();
      const sk = await p.evaluate(() => JSON.parse(localStorage.getItem("strange-bloom.training")));
      check(d3 === toBlack && sk && sk.status === "skipped" && sk.v === 1 && Number.isFinite(sk.at) && p.url() === MENU,
        `${B} B5e${R} · ☰ → Skip training: records "skipped" and returns to the title through the black`, J(sk));
      // the back-forward-cache restore paths themselves (Playwright reloads on Back / Forward above, so restore them directly): a real
      // leaveTo() with navigation held back, then the browser's own pageshow { persisted: true }; the same for the training page
      const tr = await p.evaluate(async () => { const E = MENU_DEV.entry; let nav = null; const ok = await E.leaveTo("demo-run.html?training=1", { navigate: h => { nav = h; } });
        const during = { state: E.state, black: +getComputedStyle(E.black).opacity, inert: E.menuHost.inert };
        dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true })); await new Promise(r => setTimeout(r, 450));
        return { ok, nav, during, after: { state: E.state, black: getComputedStyle(E.black).display, inert: E.menuHost.inert } }; });
      await p.goto(`${RUN}?training=1`); await ready(p); await lifted(p);
      const rr = await p.evaluate(async () => { const U = BLOOM_TRAINING_UI, c = document.getElementById("trainingCover"); U.stats.leaving = true; c.style.display = ""; c.style.opacity = "1";
        dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true })); await new Promise(r => setTimeout(r, 450));
        return { display: getComputedStyle(c).display, leaving: U.stats.leaving }; });
      check(tr.ok && tr.nav === "demo-run.html?training=1" && tr.during.state === "leaving" && tr.during.black === 1 && tr.during.inert && tr.after.state === "menu" && tr.after.black === "none" && !tr.after.inert
        && rr.display === "none" && rr.leaving === false,
        `${B} B5g${R} · restored from the back-forward cache (pageshow persisted): the title that left for TRAINING and a training page that left through its black both lift their black and take input again`,
        `title ${J(tr.during)} → ${J(tr.after)} · training cover → ${rr.display}`);
      check(!p.errs.length, `${B} B5f${R} · no page errors across the title ↔ training crossings`, p.errs.join(" | "));
      if (SHOTS && bname === "chromium" && !rmCase) await p.screenshot({ path: path.join(SHOTS, "03-title-after-skip.png") });
      await c.close();
    }

    // B6 · file:// — (BLOOM-031) the training layer now loads there too, from the generated portable runtime (B6a); the degraded path
    // the run page keeps for a layer that cannot load (the black still goes, actions still leave) is forced by a failing runtime (B6b)
    if (bname === "chromium") {
      const FILE = "file://" + encodeURI(path.join(ROOT, "demos/demo-run.html"));
      { const c = await ctx(), p = await c.newPage(); const errs = []; p.on("pageerror", e => errs.push(e.message));
        await p.goto(`${FILE}?training=1`); await p.waitForFunction(() => window.BLOOM_RUN && BLOOM_RUN.started, null, { timeout: 15000 }); await lifted(p);
        await p.waitForFunction(() => window.BLOOM_TRAINING_UI && BLOOM_TRAINING_UI.guide && BLOOM_TRAINING_UI.guide.mounted, null, { timeout: 20000 }).catch(() => {});
        const s = await p.evaluate(() => ({ running: BLOOM_API.state().running, ui: typeof window.BLOOM_TRAINING_UI, mounted: !!(window.BLOOM_TRAINING_UI && BLOOM_TRAINING_UI.guide.mounted), portable: !!window.BLOOM_PORTABLE }));
        await p.click("#pvMenuBtn"); await Promise.all([p.waitForURL(u => /\/index\.html$/.test(u.pathname) && !/\/demos\//.test(u.pathname), { timeout: 10000 }), p.click('#pvMenu [data-act="mainMenu"]')]);
        await p.waitForFunction(() => window.MENU_DEV && MENU_DEV.ready, null, { timeout: 30000 }).catch(() => {});
        const t = await p.evaluate(() => ({ ready: !!(window.MENU_DEV && MENU_DEV.ready), notice: !!document.getElementById("needsServer") }));
        check(!s.running && s.ui === "object" && s.mounted && s.portable && t.ready && !t.notice && !errs.length,
          `${B} B6a · (BLOOM-031) over file:// the training layer loads from the portable runtime: the black lifts, the run is paused, the guided coach mounts; Main menu leaves (through the layer) for the root index.html, which over file:// is the real title`, J({ s, t }));
        await c.close(); }
      const c = await ctx(), p = await c.newPage();
      await c.addInitScript(() => { window.BLOOM_PORTABLE = { load: () => Promise.reject(new Error("QA: the portable runtime is unavailable")) }; });
      await p.goto(`${FILE}?training=1`); await p.waitForFunction(() => window.BLOOM_RUN && BLOOM_RUN.started, null, { timeout: 15000 });
      const t1 = Date.now(); await lifted(p); const gone = Date.now() - t1;
      const s = await p.evaluate(() => ({ running: BLOOM_API.state().running, ui: typeof window.BLOOM_TRAINING_UI, ret: BLOOM_RUN.training.returnTo }));
      await p.click("#pvMenuBtn"); await Promise.all([p.waitForURL(u => /\/index\.html$/.test(u.pathname) && !/\/demos\//.test(u.pathname), { timeout: 10000 }), p.click('#pvMenu [data-act="mainMenu"]')]);
      check(!s.running && s.ui === "undefined" && gone < 3000 && /^file:.*\/index\.html$/.test(p.url()) && !/\/demos\//.test(p.url()),
        `${B} B6b · when the training layer cannot load (here: the portable runtime forced to fail over file://) the black still clears (≤ 2 s), the run is paused, Main menu still leaves for the root index.html`, `black gone after ${gone} ms · → ${p.url().split("/").slice(-2).join("/")}`);
      await c.close();
    }
    await browser.close();
  }
  server.close();
  console.log(fails ? `\n${fails} check(s) FAILED  (${((Date.now() - t0) / 1000).toFixed(1)} s)` : `\nALL CHECKS PASS  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
