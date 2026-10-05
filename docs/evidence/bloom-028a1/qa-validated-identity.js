// BLOOM-028A1 — Validated Destination Identity QA.
//
//   NODE_PATH="$(npm root -g)" node docs/evidence/bloom-028a1/qa-validated-identity.js [--shots] [--no-firefox] [--no-gpu] [--no-028a-qa] [--port 8771]
//
// Contract under test: every world the Destination Survey shows is a FULLY VALIDATED BLOOM world before it is shown, and that
// exact planet object is what the globe draws, the dossier describes, focus shows and Begin Expedition hands on (event and
// callback) — nothing regenerates or substitutes it.
// Part N (Node): start SHA, only intended files changed, sphere / generator / content untouched, the survey data suite,
//   menu-code hygiene, 028A → 028A1 comparison (how many of 028A's shown worlds were NOT the validated world), and the
//   accepted 028A browser QA re-run on this branch (which itself re-runs the 027D sphere QA).
// Part I (Chromium): every setPlanet recorded from page start; identity through render → dossier → focus → event → callback for
//   all nine positions in two sectors; no main-thread generator call; prefetch + scan latency; scan before prefetch is ready;
//   main-thread lag while workers validate; repeated scans (leaks, contexts); reduced motion; one renderer / nine views.
// Firefox smoke; WebKit availability; GPU timing + a browser-side generation-cost sample (report only).
// Results → qa-results.json (+ perf-samples.json). Exit 1 on any failure.
"use strict";
const path = require("path"), fs = require("fs"), { spawn, spawnSync, execSync } = require("child_process"), http = require("http");
const ROOT = path.resolve(__dirname, "../../.."), OUT = __dirname;
const argv = process.argv.slice(2), SHOTS = argv.includes("--shots"), FIREFOX = !argv.includes("--no-firefox"), GPU = !argv.includes("--no-gpu"), QA028A = !argv.includes("--no-028a-qa");
const PORT = +(argv[argv.indexOf("--port") + 1] || 0) || 8771;
const BASE = "7913fbe"; // BLOOM-028A — Destination Survey Foundation (accepted)
const HOST = `http://127.0.0.1:${PORT}`, PAGE = `${HOST}/demos/destination-survey.html`;
const results = []; let fails = 0; const perf = {};
const J = o => JSON.stringify(o);
const check = (ok, name, detail = "") => { results.push({ ok: !!ok, name, detail: String(detail) }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); if (!ok) fails++; };
const info = (name, detail) => { results.push({ ok: true, info: true, name, detail: typeof detail === "string" ? detail : J(detail) }); console.log(`INFO  ${name}  — ${typeof detail === "string" ? detail : J(detail)}`); };
const ALLOWED = [/^resources\/destination-survey\//, /^demos\/destination-survey\.html$/, /^tools\/destination-survey-check\.js$/, /^docs\/DESTINATION_SURVEY_v1\.md$/, /^docs\/evidence\/bloom-028a1\//];
const SCRIPTS = ["content/config.js", "content/traits.js", "planets/first_bloom.js", "content/archetypes.js", "content/scenarios.js", "content/play.js", "resources/bloom-sim.js",
  "resources/bloom-gen.js", "resources/bloom-validate.js", "resources/bloom-witness.js", "resources/bloom-archetype.js", "resources/bloom-scenario.js", "resources/bloom-play.js"];

// before any page script: leak accounting (028A / 027D QA), main-thread generator call counters, event-loop lag probe
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
  window.__workers = 0; const OW = window.Worker; window.Worker = class extends OW { constructor(...a) { super(...a); window.__workers++; } };
  // main-thread generator calls: wrap the entry points as soon as the classic scripts define them
  window.__gen = { calls: 0, log: [] };
  const wrap = (obj, k, label) => { const f = obj[k]; if (typeof f !== "function" || f.__wrapped) return; const w = function (...a) { __gen.calls++; __gen.log.push(label); return f.apply(this, a); }; w.__wrapped = true; obj[k] = w; };
  const arm = () => { const B = window.BLOOM; if (!B) return;
    wrap(B, "generatePlanet", "generatePlanet"); wrap(B, "generateFromArchetype", "generateFromArchetype"); wrap(B, "validatePlanet", "validatePlanet");
    if (B.archetype) { wrap(B.archetype, "attemptPlanet", "attemptPlanet"); wrap(B.archetype, "generateFromArchetype", "archetype.generateFromArchetype"); }
    if (B.play) { wrap(B.play, "runSearch", "runSearch"); wrap(B.play, "searchWorld", "searchWorld"); } };
  document.addEventListener("DOMContentLoaded", arm); window.__armGen = arm;
  // event-loop lag: a 10 ms timer chain; the gap beyond 10 ms is main-thread blocking
  window.__lag = []; let last = performance.now(); const tick = () => { const n = performance.now(); window.__lag.push([n, n - last - 10]); if (window.__lag.length > 20000) window.__lag.splice(0, 10000); last = n; setTimeout(tick, 10); }; setTimeout(tick, 10);
  window.__longTasks = []; try { new PerformanceObserver(l => { for (const e of l.getEntries()) window.__longTasks.push({ t: e.startTime, d: e.duration }); }).observe({ type: "longtask", buffered: true }); } catch { /* Firefox */ }
};

// after the survey object exists (before its first sector lands): record every globe assignment
const RECORD = async () => {
  const S = SURVEY_DEV.survey, D = await import("/resources/destination-survey/survey-data.js");
  window.__fp = D.planetFingerprint; window.__D = D; window.__armGen();
  window.__assign = [];
  S.views.forEach((v, i) => { const orig = v.setPlanet.bind(v); v.setPlanet = (p, o) => {
    if (p) { const a = p.archetype; __assign.push({ i, t: performance.now(), fp: D.planetFingerprint(p), name: p.name,
      validated: p.id === "first_bloom" ? "authored" : !!(a && a.winnabilityChecked && a.validatedLayers && a.validatedLayers.join() === "1,2,3,4,5,6,7,8"),
      stripped: !(a && ("witness" in a || "strategies" in a)), ref: p }); }
    return orig(p, o); }; });
  return true;
};
const HELPERS = () => {
  const S = () => SURVEY_DEV.survey;
  window.__settle = (st = "survey") => new Promise(res => { const f = () => (S().state === st && !document.getAnimations().some(a => a.playState === "running")) ? res(true) : requestAnimationFrame(f); f(); });
  window.__frames = n => new Promise(res => { let k = 0; const f = () => (++k >= n ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); });
  window.__until = (fn, ms = 120000) => new Promise((res, rej) => { const t0 = performance.now(), f = () => fn() ? res(performance.now() - t0) : performance.now() - t0 > ms ? rej(new Error("timeout")) : setTimeout(f, 25); f(); });
  window.__frameStats = (n = 120) => new Promise(res => { const R = S().host, t = []; let last = performance.now();
    const f = now => { t.push(now - last); last = now; t.length < n ? requestAnimationFrame(f) : done(); }; requestAnimationFrame(f);
    const done = () => { t.shift(); const s = t.slice().sort((a, b) => a - b); const g = R.three.getContext(), x = g.getExtension("WEBGL_debug_renderer_info");
      res({ meanFrameMs: +(t.reduce((a, b) => a + b, 0) / t.length).toFixed(2), p95FrameMs: +s[Math.floor(s.length * .95)].toFixed(2), maxFrameMs: +s[s.length - 1].toFixed(1), frames: t.length,
        gl: x ? g.getParameter(x.UNMASKED_RENDERER_WEBGL) : g.getParameter(g.RENDERER) }); }; });
  window.__lagIn = (t0, t1) => { const xs = __lag.filter(([t]) => t >= t0 && t <= t1).map(([, d]) => d); return { samples: xs.length, maxMs: +Math.max(0, ...xs).toFixed(1), over50: xs.filter(d => d > 50).length }; };
  // the full identity chain for cell i: rendered globe, dossier, focus, event, callback; no generator call, no worker task
  window.__identity = async i => {
    const s = S(), c = s.cells[i], wfp = c.fingerprint, v = s.views[i], T = await import("/resources/planet-sphere/planet-texture.js");
    const g0 = __gen.calls, tasks0 = s.stats.workerTasks, a0 = __assign.length;
    // (an authored world has no tilemap of its own: the view resolves its layout, so compare id + the texture it drew)
    const sameData = p => p && p.id === c.planet.id && (c.planet.tilemap ? p.tilemap === c.planet.tilemap && p.sections === c.planet.sections : true);
    const rendered = sameData(v.planet) && v.state().textureSignature === T.textureSignature(T.texturePlanet(c.planet), { render: c.render, width: v.state().textureWidth });
    const lastAssign = __assign.filter(x => x.i === i).pop(), assigned = lastAssign && lastAssign.ref === c.planet && lastAssign.fp === wfp;
    const dossier = JSON.stringify(__D.surveyDossier({ ...c, assessment: __D.assessWorld(c.planet) })) === JSON.stringify(c.dossier);
    await s.select(i); await __settle("focus");
    const rows = [...s.dossier.querySelectorAll(".ds-rows dd b")].map(b => b.textContent), want = c.dossier.rows.map(r => r.word);
    const focus = s.globes[i].parentElement === s.focusSlot && s.views[i] === v && sameData(v.planet) && s.dossierTitle.textContent === c.planet.name && JSON.stringify(rows) === JSON.stringify(want);
    let ev = null; const onEv = e => { ev = e.detail; }; document.addEventListener("bloom:begin-expedition", onEv, { once: true });
    const hooks0 = SURVEY_DEV.hooks.length; const ret = s.beginExpedition(); const cb = SURVEY_DEV.hooks[hooks0] && SURVEY_DEV.hooks[hooks0].detail;
    const event = ev && ev.planet === c.planet && __fp(ev.planet) === wfp && ev.container === s.globes[i] && ev.view === v && ev.candidate.seed === c.seed && ev.candidate.validation === c.validation;
    const callback = cb && cb === ev && cb.planet === c.planet && __fp(cb.planet) === wfp && ret === ev;
    document.getElementById("devHook").hidden = true;
    await s.returnToSurvey(); await __settle("survey");
    const unchanged = __fp(c.planet) === wfp && s.cells[i] === c;
    return { i, name: c.name, validated: c.validation.validated || c.validation.path === "authored", rendered, assigned, dossier, focus, event, callback, unchanged,
      genCalls: __gen.calls - g0, workerTasks: s.stats.workerTasks - tasks0, newAssigns: __assign.length - a0 };
  };
};

(async () => {
  const git = c => execSync(`git ${c}`, { cwd: ROOT }).toString();
  // ================================================================ Part N — Node
  { const head = git("rev-parse HEAD").trim(), base = git(`rev-parse ${BASE}`).trim(), anc = spawnSync("git", ["merge-base", "--is-ancestor", BASE, "HEAD"], { cwd: ROOT }).status === 0;
    const firstNew = git(`rev-list --reverse ${BASE}..HEAD`).trim().split("\n").filter(Boolean)[0];
    const parent = firstNew ? git(`rev-parse ${firstNew}^`).trim() : head;
    check(anc && parent === base, `N0 the 028A1 work starts from exactly ${BASE} (BLOOM-028A, accepted)`, `base ${base.slice(0, 7)} · head ${head.slice(0, 7)}`); }
  { const changed = [...new Set([...git(`diff --name-only ${BASE}`).split("\n"), ...git("ls-files --others --exclude-standard").split("\n")].filter(Boolean))];
    const stray = changed.filter(f => !ALLOWED.some(r => r.test(f)));
    check(!stray.length, `N1 only intended 028A1 files changed since ${BASE}: the survey module / worker / CSS, its dev page, the survey data suite, the handoff doc and this evidence`, stray.length ? "stray: " + stray.join(", ") : changed.join(", ")); }
  { const PROTECTED = ["resources/planet-sphere", "demos/planet-sphere.html", "demos/planet-sphere-grid.html", "docs/PLANET_SPHERE_VIEW_v1.md", "resources/bloom-sim.js", "resources/bloom-gen.js",
      "resources/bloom-validate.js", "resources/bloom-witness.js", "resources/bloom-archetype.js", "resources/bloom-scenario.js", "resources/bloom-play.js", "resources/bloom-play-worker.js",
      "content", "planets", "index.html", "demos/demo-run.html", "demos/demo-surface.html", "demos/ui-mockups", "GAME_BIBLE.md", "tools/golden", "docs/evidence/bloom-027d", "docs/evidence/bloom-028a"];
    const d = git(`diff --name-only ${BASE} -- ${PROTECTED.map(p => `'${p}'`).join(" ")}`).trim();
    check(!d, "N2 PlanetSphereView / PlanetSphereRenderer / texture / Three.js, generator, validators, witness, play flow, content, First Bloom, goldens, index.html, run page and the 027D / 028A evidence byte-identical to 028A", d || PROTECTED.length + " protected paths"); }
  { const r = spawnSync(process.execPath, [path.join(ROOT, "tools/destination-survey-check.js")], { cwd: ROOT }).stdout.toString();
    const pass = (r.match(/^PASS/gm) || []).length, fail = (r.match(/^FAIL/gm) || []).length;
    check(fail === 0 && /ALL CHECKS PASS/.test(r), "N3 tools/destination-survey-check.js green (incl. S4: every shown world = an independent production re-validation of its seed, byte for byte)", `${pass} pass / ${fail} fail`); }
  { const src = fs.readFileSync(path.join(ROOT, "resources/destination-survey/destination-survey.js"), "utf8").replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
    const gen = src.match(/generateFromArchetype|generatePlanet|attemptPlanet|runSearch|searchWorld|validatePlanet|makeCandidate|predictClass/g) || [];
    const renderers = (src.match(/new PlanetSphereRenderer\(/g) || []).length, internals = src.match(/\b(?:views\[[^\]]+\]|view|v|host|this\.host|renderer)\._[A-Za-z]+/g) || [];
    check(!gen.length && renderers === 1 && !internals.length && /container: this\.globes\[i\]/.test(src) && /planet: c\.planet/.test(src),
      "N4 the screen never generates or validates a world itself (all generation is survey-data.js inside column tasks), creates ONE PlanetSphereRenderer, touches no sphere internals, and Begin Expedition hands on the candidate's own planet object + container",
      `generator refs ${J(gen)} · renderers ${renderers}`); }
  { // 028A → 028A1: build 028A's own sectors with 028A's own module, then validate each shown world for real
    for (const f of SCRIPTS) require(path.join(ROOT, f));
    const { BLOOM, BLOOM_DATA: D } = globalThis;
    const old = await import("data:text/javascript;base64," + Buffer.from(git(`show ${BASE}:resources/destination-survey/survey-data.js`)).toString("base64"));
    const cur = await import(path.join(ROOT, "resources/destination-survey/survey-data.js"));
    let shown = 0, notValidated = 0, ocean = [0, 0]; const t = Date.now();
    for (const seed of [1, 2, 3]) for (const c of old.buildSector(seed).cells) {
      shown++; const A = D.archetypes.find(a => a.id === c.archetypeId), r = BLOOM.play.runSearch({ archetype: A, scenario: null, seeds: [c.seed], config: D.config, traits: D.traits });
      const differs = !r.ok || cur.planetFingerprint(r.planet) !== cur.planetFingerprint(c.planet); if (differs) notValidated++;
      if (A.id === "ocean_archipelago") { ocean[1]++; if (differs) ocean[0]++; } }
    info("N5 028A → 028A1: of the worlds 028A showed (sectors 1–3), how many were NOT the world a validated run of that seed plays", `${notValidated} / ${shown} (Ocean ${ocean[0]} / ${ocean[1]}) — 028A1 shows 0 such worlds (N3 S4, I2, I3) · ${Date.now() - t} ms`);
    perf.compare028A = { shown, notValidated, ocean }; }
  if (QA028A) { // the accepted 028A browser QA, re-run on this branch (a copy at the same depth; it re-runs the 027D sphere QA too)
    const tmp = path.join(ROOT, "docs/evidence/.bloom-028a-rerun"); fs.mkdirSync(tmp, { recursive: true });
    fs.copyFileSync(path.join(ROOT, "docs/evidence/bloom-028a/qa-destination-survey.js"), path.join(tmp, "qa-destination-survey.js"));
    const r = spawnSync(process.execPath, [path.join(tmp, "qa-destination-survey.js"), "--no-gpu", "--port", String(PORT + 20)], { cwd: ROOT, env: process.env, timeout: 1800000 });
    let res = null; try { res = JSON.parse(fs.readFileSync(path.join(tmp, "qa-results.json"), "utf8")); } catch { /* crashed */ }
    let nested = null; try { nested = JSON.parse(fs.readFileSync(path.join(tmp, "sphere-qa-027d-rerun.json"), "utf8")); } catch { /* none */ }
    fs.rmSync(tmp, { recursive: true, force: true });
    if (!res) check(false, "N6 028A QA re-run", ((r.stdout || "") + "").slice(-600) + ((r.stderr || "") + "").slice(-400));
    else {
      fs.writeFileSync(path.join(OUT, "qa-028a-rerun.json"), JSON.stringify({ ...res, nested027d: nested && { passed: nested.passed, failed: nested.failed, failedNames: nested.results.filter(x => !x.ok).map(x => x.name.slice(0, 80)) } }, null, 1));
      const checks = res.results.filter(x => !x.info), failed = checks.filter(x => !x.ok);
      // Provenance-only failures, by design: 028A's N1 ("only 028A files since 027D") lists the new 028A1 files; 028A's N5 gates on
      // its nested 027D re-run, whose own N1 / N2 ("nothing since 027C / f6bca30 outside the sphere work") list the 028A + 028A1
      // files — N2 flags tools/destination-survey-check.js, the 028A suite (untracked when 028A's QA ran, committed since).
      const nestedFailed = nested ? nested.results.filter(x => !x.info && !x.ok).map(x => x.name) : null, nestedProvOnly = !!nestedFailed && nestedFailed.every(n => /^N[12] /.test(n));
      const toolsSince = git("diff --name-only f6bca30 -- tools").split("\n").filter(Boolean).sort();
      const protectedSince = git("diff --name-only f6bca30 -- resources/bloom-sim.js resources/bloom-gen.js resources/bloom-validate.js resources/bloom-witness.js resources/bloom-archetype.js resources/bloom-scenario.js resources/bloom-play.js resources/bloom-play-worker.js content planets index.html demos/demo-run.html demos/demo-surface.html demos/ui-mockups GAME_BIBLE.md").trim();
      const isProv = x => /^N1 /.test(x.name) || (/^N5 /.test(x.name) && nestedProvOnly && J(toolsSince) === J(["tools/destination-survey-check.js", "tools/sphere-texture-check.js"]) && !protectedSince);
      const prov = failed.filter(isProv), rest = failed.filter(x => !isProv(x));
      const listed = prov.filter(x => /^N1 /.test(x.name)).flatMap(x => x.detail.split(/stray\s*|,\s*|·\s*modified\s*/).map(t => t.trim()).filter(t => t.includes("/")));
      check(!rest.length && listed.every(f => ALLOWED.some(rx => rx.test(f)) || /^docs\/evidence\/\.bloom-02/.test(f)),
        `N6 (QA 15) the accepted 028A browser QA re-run on this branch: every behavioural check green (${checks.length - failed.length}/${checks.length}; the ${prov.length} failing checks are provenance-only, as designed), and its nested 027D sphere QA re-run behaviourally green (${nested ? nested.passed + "/" + (nested.passed + nested.failed) : "n/a"}; only 027D's N1 / N2 provenance)`,
        rest.map(x => x.name.slice(0, 90) + " :: " + x.detail.slice(0, 200)).join(" | ") || `028A provenance: ${prov.map(x => x.name.slice(0, 3)).join(", ")} · tools since f6bca30 ${J(toolsSince)} · protected gameplay paths since f6bca30: none`);
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
    page.on("response", r => { if (r.status() >= 400) log.failed.push(r.status() + " " + r.url()); });
    const t0 = Date.now();
    await page.goto(PAGE + query);
    await page.waitForFunction(() => window.SURVEY_DEV && SURVEY_DEV.survey, null, { timeout: 30000 });
    const early = await page.evaluate(() => SURVEY_DEV.survey.state);
    if (SHOTS && !shotLoading) { shotLoading = true; await page.waitForTimeout(1200); await page.screenshot({ path: path.join(OUT, "00-first-sector-loading.png") }); }
    await page.evaluate(RECORD);
    await page.waitForFunction(() => SURVEY_DEV.ready || SURVEY_DEV.errors.length, null, { timeout: 180000 });
    const wall = Date.now() - t0;
    await page.evaluate(HELPERS); await page.evaluate(() => __settle("survey"));
    return { ctx, page, log, wall, early };
  }
  let shotLoading = false;
  const ev = (page, fn, arg) => page.evaluate(fn, arg);
  const leak = page => ev(page, () => ({ listeners: __LEAK.listeners, observers: __LEAK.observers, liveGL: __LEAK.liveGL(), glCreated: __LEAK.glCreated, contextWarnings: __LEAK.contextWarnings }));
  const shot = (page, name) => SHOTS ? page.screenshot({ path: path.join(OUT, name) }) : null;

  // ================================================================ Part I — Chromium
  async function mainSuite(browser) {
    const o = await openPage(browser, "?sector=1&firstBloom=1&workers=3"), page = o.page, S = fn => ev(page, fn);
    { const r = await S(() => { const s = SURVEY_DEV.survey; return { src: s.sectorSource, pool: s.poolSize, workers: __workers, first: s.stats.sectorTimes[0], errs: SURVEY_DEV.errors, n: s.cells.filter(Boolean).length,
      gl: __LEAK.glCreated, live: __LEAK.liveGL(), views: s.host.views.length, shared: s.views.every(v => v.renderer === s.host), canvases: document.querySelectorAll("canvas").length }; });
      check(o.early === "loading" && r.src === "worker" && r.n === 9 && !r.errs.length && !o.log.errors.length && !o.log.failed.length,
        "I1 the dev entry loads over localhost: the first sector is validated in the worker pool while the screen shows its loading state, then nine worlds; no errors", `first sector ${r.first.ms} ms (page ready ${o.wall} ms) · pool ${r.pool}`);
      check(r.gl === 1 && r.live === 1 && r.views === 9 && r.shared && r.canvases === 1 && r.workers <= 3, "I9 (QA 13) one PlanetSphereRenderer, one WebGL context, nine views — and at most three survey workers", J({ gl: r.gl, views: r.views, workers: r.workers })); }
    await shot(page, "01-validated-survey-1440x900.png");

    // ---- I2 every displayed world was validated before display; exactly one assignment per cell (no substitution)
    { const r = await S(() => ({ a: __assign.map(x => ({ i: x.i, validated: x.validated, stripped: x.stripped, fp: x.fp, t: x.t })), cells: SURVEY_DEV.survey.cells.map(c => c.fingerprint),
      ready: SURVEY_DEV.survey.stats.sectorTimes[0] }));
      const per = [...Array(9)].map((_, i) => r.a.filter(x => x.i === i));
      check(r.a.length === 9 && per.every((xs, i) => xs.length === 1 && xs[0].fp === r.cells[i] && (xs[0].validated === true || xs[0].validated === "authored") && xs[0].stripped),
        "I2 (QA 3, 4) every globe was assigned exactly once, with a world already validated (layers 1–8, winnability checked, validator solutions stripped; First Bloom authored) whose fingerprint equals the worker's — no unvalidated world was ever shown and no world was swapped afterwards",
        `${r.a.length} assignments · ${r.a.filter(x => x.validated === true).length} validated + ${r.a.filter(x => x.validated === "authored").length} authored`); }

    // ---- I3 identity chain for all nine positions
    const chain = async label => { const rows = []; for (let i = 0; i < 9; i++) rows.push(await ev(page, i => __identity(i), i));
      const ok = r => r.validated && r.rendered && r.assigned && r.dossier && r.focus && r.event && r.callback && r.unchanged && r.genCalls === 0 && r.workerTasks === 0 && r.newAssigns === 0;
      check(rows.every(ok), `I3 (QA 5, 6, 7, 12) ${label}: for all nine positions the SAME validated planet is rendered (view draws its tilemap; texture signature of that planet), described (dossier recomputed from it = shown dossier; focus panel rows), focused (same view in the focus slot), and handed on by bloom:begin-expedition AND onBeginExpedition (same object; fingerprint = the worker's); no generator call, no worker task and no globe re-assignment from selection through Begin and back`,
        rows.filter(r => !ok(r)).map(r => J(r)).join(" | ") || rows.map(r => r.name).join(", ")); return rows; };
    await chain("sector 1 (incl. First Bloom)");
    { const g = await S(() => ({ calls: __gen.calls, log: [...new Set(__gen.log)] }));
      check(g.calls === 0, "I4 (QA 6) no main-thread generator / validator call at all in worker mode (generatePlanet, generateFromArchetype, attemptPlanet, validatePlanet, runSearch, searchWorld wrapped from page start)", J(g)); }

    // ---- I5 prefetch → scan latency
    { const r = await S(async () => { const s = SURVEY_DEV.survey, waited = await __until(() => s.nextSectorReady); const t0 = performance.now(), a0 = __assign.length; await s.scan(); await __settle("survey");
        return { waitedForPrefetchMs: Math.round(waited), scanMs: Math.round(performance.now() - t0), last: s.stats.lastScan, assigns: __assign.slice(a0).map(x => ({ validated: x.validated, fp: x.fp })), cells: s.cells.map(c => c.fingerprint),
          times: s.stats.sectorTimes.map(x => x.ms), progressHidden: s.progressEl.hidden }; });
      check(r.last.prefetched && r.last.waitedMs < 50 && r.scanMs < 1600 && r.assigns.length === 9 && r.assigns.every((a, k) => a.validated === true) && r.assigns.map(a => a.fp).sort().join() === r.cells.slice().sort().join() && r.progressHidden,
        "I5 SCAN with the next sector prefetched swaps in nine already-validated worlds at once (no wait; the staged sweep only)", `scan ${r.scanMs} ms (waited ${r.last.waitedMs} ms) · prefetched sector built in ${r.times[1]} ms`);
      perf.scanPrefetched = r; }
    await chain("sector 2 after SCAN (repeated scan)");

    // ---- I6 scan before the prefetch is ready: honest wait, nothing shown early
    { await S(async () => { const s = SURVEY_DEV.survey; await __until(() => s.nextSectorReady); await s.scan(); await __settle("survey"); }); // the next prefetch has just started
      const r = await S(async () => { const s = SURVEY_DEV.survey, a0 = __assign.length, ready0 = s.nextSectorReady, t0 = performance.now(), seen = [];
        const p = s.scan(); const watch = () => { seen.push({ t: performance.now() - t0, busy: s.scanBtn.getAttribute("aria-busy"), prog: s.progressEl.hidden ? null : s.progressEl.textContent, assigns: __assign.length - a0 }); if (s.state === "scanning") setTimeout(watch, 100); }; watch();
        await p; await __settle("survey");
        const firstAssign = __assign[a0] ? __assign[a0].t - t0 : null, sectorReadyAt = s.stats.lastScan.waitedMs;
        return { ready0, waited: s.stats.lastScan, firstAssign, sectorReadyAt, during: seen.filter(x => x.prog), assignsDuringWait: seen.filter(x => x.prog && x.assigns).length,
          validated: __assign.slice(a0).every(x => x.validated === true), n: __assign.length - a0, lag: __lagIn(performance.timeOrigin ? t0 : t0, t0 + s.stats.lastScan.waitedMs) }; });
      check(!r.ready0 && !r.waited.prefetched && r.waited.waitedMs > 200 && r.during.length > 0 && r.during.every(x => x.busy === "true" && /Confirming worlds \d \/ 9/.test(x.prog)) && r.assignsDuringWait === 0 && r.firstAssign >= r.sectorReadyAt - 5 && r.n === 9 && r.validated,
        "I6 SCAN before the prefetch is ready: the button stays busy and the header counts the worlds confirmed so far (\"Confirming worlds n / 9\"); no globe changes until all nine are validated; then the normal sweep",
        `waited ${r.waited.waitedMs} ms · progress seen ${[...new Set(r.during.map(x => x.prog))].join(" → ")} · main-thread lag while waiting max ${r.lag.maxMs} ms`);
      perf.scanBeforePrefetch = r; }
    await shot(page, "02-after-scans.png");
    if (SHOTS) { // the honest wait, on screen: SCAN pressed again right away (the next sector is still being validated)
      await S(() => { window.__p = SURVEY_DEV.survey.scan(); }); await page.waitForTimeout(900); await shot(page, "02b-scan-waiting-for-validation.png");
      await S(async () => { await window.__p; await __settle("survey"); }); }

    // ---- I7 main thread while the workers validate (prefetch window) vs idle
    { const r = await S(async () => { const s = SURVEY_DEV.survey; await __until(() => s.nextSectorReady); await s.scan(); await __settle("survey");
        const t0 = performance.now(), lt0 = __longTasks.length; const busy = await __frameStats(60); const t1 = performance.now(); await __until(() => s.nextSectorReady); const t2 = performance.now();
        const idle = await __frameStats(60); const t3 = performance.now();
        return { busy, idle, lagBusy: __lagIn(t0, t2), lagIdle: __lagIn(t2, t3), longTasksBusy: __longTasks.slice(lt0).filter(x => x.t >= t0 && x.t <= t2).map(x => Math.round(x.d)), prefetchMs: Math.round(t2 - t0) }; });
      info("I7a (software GL) main thread while the pool validates vs idle — headless SwiftShader renders WebGL on the CPU, so ~50 ms frames are long tasks even when idle; the GPU check I7 below decides",
        `lag busy max ${r.lagBusy.maxMs} ms over ${r.lagBusy.samples} samples · idle max ${r.lagIdle.maxMs} ms · software-GL frames busy ${r.busy.meanFrameMs} / idle ${r.idle.meanFrameMs} ms · long tasks ${J(r.longTasksBusy)}`);
      perf.mainThreadDuringPrefetch = r; }

    // ---- I8 repeated validated scans: correctness + leaks
    { const base = await leak(page);
      const r = await S(async () => { const s = SURVEY_DEV.survey, out = [];
        for (let k = 0; k < 5; k++) { await __until(() => s.nextSectorReady); const a0 = __assign.length; await s.scan(); await __settle("survey");
          const as = __assign.slice(a0); out.push(as.length === 9 && as.every(x => x.validated === true) && s.cells.every((c, i) => as.find(x => x.i === i).ref === c.planet && __fp(c.planet) === c.fingerprint)); }
        await s.select(5); await __settle("focus"); await s.returnToSurvey(); await __settle("survey");
        return { ok: out, mem: { ...s.host.three.info.memory }, workers: __workers, pool: s._pool.length, cache: s._sectors.size, gen: __gen.calls, anims: document.getAnimations().length,
          times: s.stats.sectorTimes.map(x => x.ms), cols: s.stats.sectorTimes.map(x => x.columns) }; });
      const end = await leak(page);
      check(r.ok.every(Boolean) && end.listeners === base.listeners && end.observers === base.observers && end.liveGL === 1 && end.glCreated === 1 && r.mem.textures === 9 && r.workers <= 3 && r.pool <= 3 && r.cache <= 1 && r.gen === 0 && !o.log.errors.length,
        "I8 (QA 8) five more validated scans: every sector nine validated worlds, each globe = its cell's planet; listeners / observers / contexts at baseline, 9 textures, never more than three workers, the sector cache holds at most the next sector, still no main-thread generation",
        `${J(base)} → ${J(end)} · workers ${r.workers} · cache ${r.cache} · sectors ${J(r.times)} ms`);
      perf.browserSectors = r; }
    // dispose: workers stop, nothing held
    { const r = await S(async () => { const s = SURVEY_DEV.survey, held = s.cells[0].planet, fp = s.cells[0].fingerprint; s.dispose(); await __frames(2);
        return { pool: s._pool.length, queue: s._queue.length, live: __LEAK.liveGL(), heldOk: __fp(held) === fp }; });
      check(r.pool === 0 && r.queue === 0 && r.live === 0 && r.heldOk, "I8b dispose() stops the worker pool and the renderer; a planet already handed on (detail.planet) is left intact for its consumer", J(r)); }
    await o.ctx.close();
  }

  // ---- reduced motion still works with validated sectors
  async function reducedMotion(browser) {
    const o = await openPage(browser, "?sector=5&rm=1"), page = o.page;
    const r = await ev(page, async () => { const s = SURVEY_DEV.survey; await __until(() => s.nextSectorReady); const a0 = __assign.length; await s.scan(); await __settle("survey");
      const as = __assign.slice(a0), spread = Math.max(...as.map(x => x.t)) - Math.min(...as.map(x => x.t));
      const id = await __identity(4); return { n: as.length, validated: as.every(x => x.validated === true), spread, id, rm: s.reducedMotion, still: s.views.every(v => !v.state().autoRotate) }; });
    check(r.rm && r.still && r.n === 9 && r.validated && r.spread < 60 && r.id.event && r.id.callback && r.id.focus && !o.log.errors.length,
      "I10 (QA 10, 11) reduced motion: validated scan swaps all nine at once behind the fade; select → Begin → RETURN keep the same planet", J({ spread: +r.spread.toFixed(1), n: r.n }));
    await o.ctx.close();
  }

  // ---- Firefox smoke
  async function firefoxSmoke(ff) {
    const o = await openPage(ff, "?sector=1&workers=3"), page = o.page;
    const r = await ev(page, async () => { const s = SURVEY_DEV.survey, id = await __identity(2); await __until(() => s.nextSectorReady); const a0 = __assign.length; await s.scan(); await __settle("survey");
      return { id, src: s.sectorSource, gl: __LEAK.glCreated, views: s.host.views.length, scanned: __assign.length - a0, validated: __assign.every(x => x.validated === true), gen: __gen.calls, first: s.stats.sectorTimes[0].ms, errs: SURVEY_DEV.errors }; });
    await shot(page, "03-firefox-validated-survey.png");
    const idOk = ["validated", "rendered", "assigned", "dossier", "focus", "event", "callback", "unchanged"].every(k => r.id[k]);
    check(idOk && r.src === "worker" && r.gl === 1 && r.views === 9 && r.scanned === 9 && r.validated && r.gen === 0 && !r.errs.length && !o.log.errors.length,
      "F1 (QA 18) Firefox: validated sectors from the worker pool, one context / nine views, identity chain render → dossier → focus → event / callback, validated scan, no main-thread generation, no errors", `first sector ${r.first} ms · ${J({ gen: r.gen })}`);
    await o.ctx.close();
  }

  // ---- GPU: frame rate while the workers validate; browser-side generation sample (several first sectors + prefetched sectors)
  async function gpuSample(b) {
    const firsts = [];
    for (const seed of [101, 202, 303, 404, 505]) { const o = await openPage(b, `?sector=${seed}&workers=3`); firsts.push(await ev(o.page, () => ({ ms: SURVEY_DEV.survey.stats.sectorTimes[0].ms, cols: SURVEY_DEV.survey.stats.sectorTimes[0].columns.map(c => c.ms) })));
      if (seed === 101) { // frames while the prefetch validates vs after
        const r = await ev(o.page, async () => { const s = SURVEY_DEV.survey, t0 = performance.now(), lt0 = __longTasks.length; const busy = await __frameStats(120); const stillBusy = !s.nextSectorReady;
          await __until(() => s.nextSectorReady); const t1 = performance.now(); await new Promise(r => setTimeout(r, 3500)); const t2 = performance.now(); const idle = await __frameStats(120);
          const t3 = performance.now(); await s.scan(); const scanMs = performance.now() - t3; await __settle("survey");
          return { busy, idle, stillBusy, prefetchMs: Math.round(t1 - t0), lagBusy: __lagIn(t0, t1), lagIdle: __lagIn(t2, t3), longTasksBusy: __longTasks.slice(lt0).filter(x => x.t >= t0 && x.t <= t1).map(x => Math.round(x.d)), scanMs: Math.round(scanMs) }; });
        check(r.stillBusy && r.lagBusy.maxMs < 50 && !r.longTasksBusy.length && r.busy.meanFrameMs < 18 && r.busy.maxFrameMs < 40,
          "I7 (QA 9) GPU: while three workers validate the next sector the main thread stays free — no long task, event-loop lag < 50 ms, the nine globes hold ~60 fps",
          `prefetch ${r.prefetchMs} ms · lag busy max ${r.lagBusy.maxMs} ms (idle ${r.lagIdle.maxMs}) · frames busy ${r.busy.meanFrameMs} mean / ${r.busy.maxFrameMs} max ms, idle ${r.idle.meanFrameMs} / ${r.idle.maxFrameMs} · prefetched scan ${r.scanMs} ms`);
        perf.gpuFrames = r; }
      await o.ctx.close(); }
    { // control: the same work on the main thread (worker=0) — what the workers save the player from
      const c = await openPage(b, "?sector=101&worker=0");
      const r = await ev(c.page, async () => { const s = SURVEY_DEV.survey, t0 = performance.now(), lt0 = __longTasks.length; const f = await __frameStats(120); await __until(() => s.nextSectorReady, 240000); const t1 = performance.now();
        const lt = __longTasks.slice(lt0).filter(x => x.t >= t0 && x.t <= t1).map(x => x.d); return { src: s.sectorSource, frames: f, lag: __lagIn(t0, t1), longTasks: lt.length, longestMs: Math.round(Math.max(0, ...lt)), ms: Math.round(t1 - t0) }; });
      info("perf GPU control — the same prefetch on the MAIN thread (worker=0, fallback path)", r); perf.mainThreadControl = r; await c.ctx.close(); }
    const one = await openPage(b, "?sector=101&workers=1"); const single = await ev(one.page, () => SURVEY_DEV.survey.stats.sectorTimes[0].ms); await one.ctx.close();
    info("perf — FIRST validated sector, 5 fresh page loads, pool of 3 (ms; slowest column decides)", firsts.map(f => `${f.ms} (${f.cols.join("/")})`).join(" · ") + ` · same first sector with ONE worker: ${single} ms`);
    perf.firstSectors = { pool3: firsts, pool1Sector101: single };
    // a longer prefetch run: 8 sectors back to back
    const o = await openPage(b, "?sector=909&workers=3");
    const run = await ev(o.page, async () => { const s = SURVEY_DEV.survey; for (let k = 0; k < 8; k++) { await __until(() => s.nextSectorReady, 240000); await s.scan(); await __settle("survey"); }
      const by = {}; for (const st of s.stats.sectorTimes) for (const c of st.columns) for (const [a, x] of Object.entries(c.byArchetype)) { const t = by[a] || (by[a] = { validations: 0, ms: 0, maxMs: 0 }); t.validations += x.validations; t.ms += x.ms; t.maxMs = Math.max(t.maxMs, x.maxMs); }
      const cols = s.stats.sectorTimes.flatMap(st => st.columns); const sum = k => cols.reduce((a, c) => a + c[k], 0);
      return { sectors: s.stats.sectorTimes.map(x => x.ms), byArchetype: Object.fromEntries(Object.entries(by).map(([a, t]) => [a, { validations: t.validations, meanMs: Math.round(t.ms / t.validations), maxMs: Math.round(t.maxMs) }])),
        validations: sum("validations"), wasted: sum("wasted"), predictions: sum("predictions"), predictMs: sum("predictMs"), validateMs: sum("validateMs") }; });
    info("perf — 9 validated sectors in the browser (first + 8 prefetched), per-archetype validation cost inside the workers", run); perf.browserRun = run;
    await o.ctx.close();
  }

  // ================================================================ run
  let pw; try { pw = require("playwright"); } catch { check(false, "B0 playwright available", 'run with NODE_PATH="$(npm root -g)"'); return finish(); }
  const server = spawn("python3", ["-m", "http.server", String(PORT), "--bind", "127.0.0.1"], { cwd: ROOT, stdio: "ignore" });
  check(await waitHttp(PAGE, 8000), "B0 `python3 -m http.server` from the repository root serves demos/destination-survey.html", PAGE);
  try {
    const chromium = await pw.chromium.launch();
    await mainSuite(chromium); await reducedMotion(chromium); await chromium.close();
    if (FIREFOX) { let ff = null; try { ff = await pw.firefox.launch(); } catch (err) { info("Firefox", "not available: " + err.message.split("\n")[0]); } if (ff) { await firefoxSmoke(ff); await ff.close(); } }
    { let wk = null; try { wk = await pw.webkit.launch(); info("WebKit", "available"); await wk.close(); } catch (err) { info("WebKit (Safari engine)", "not available on this machine: " + err.message.split("\n")[0].slice(0, 140)); } }
    if (GPU) { try { const g = await pw.chromium.launch({ args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] }); await gpuSample(g); await g.close(); } catch (err) { info("GPU sample", "unavailable: " + err.message.split("\n")[0]); } }
  } catch (err) { check(false, "browser suite crashed", err.stack); }
  finally { server.kill(); }
  return finish();

  function finish() {
    const checks = results.filter(r => !r.info);
    fs.writeFileSync(path.join(OUT, "qa-results.json"), JSON.stringify({ when: new Date().toISOString(), head: git("rev-parse HEAD").trim(), passed: checks.filter(r => r.ok).length, failed: fails, results }, null, 1));
    fs.writeFileSync(path.join(OUT, "perf-samples.json"), JSON.stringify(perf, (k, v) => (k === "ref" ? undefined : v), 1));
    console.log(`\n${checks.length - fails}/${checks.length} passed`); process.exit(fails ? 1 : 0);
  }
})();
