// BLOOM-028B — AtmosphereTransition + Dramatic Descent QA.
//
//   NODE_PATH="$(npm root -g)" node docs/evidence/bloom-028b/qa-atmosphere-transition.js [--shots] [--no-firefox] [--no-gpu] [--port 8791]
//
// Part N (Node): provenance (start SHA, only intended files changed, sphere / generator / content untouched) and the 21st suite
//   tools/atmosphere-transition-check.js (presets, screen-agnostic, no WebGL).
// Part S (standalone demos/atmosphere-transition.html; Chromium, Firefox): DRAMATIC / SUBDUED lifecycle, frame-sampled proof that
//   the swap happens only under full cover, delayed (async) covered hold stays concealed and alive, pixel concealment, reduced
//   motion (forced and system), failure, busy, dispose, timeout, input blocking, repeated-run cleanup, element counts, frames.
// Part D (demos/expedition-descent.html; Chromium, Firefox): the Destination Survey departure — one renderer / nine views, no
//   double Begin, the same live view grows (one visible globe, yaw never reset), exact detail.planet through the hidden handoff,
//   no generation, survey disposed and destination mounted only under cover, reveal, failure recovery, reduced motion, cleanup.
// WebKit availability; GPU frame timing (report). Results → qa-results.json (+ timelines.json, perf.json). Exit 1 on any failure.
"use strict";
const path = require("path"), fs = require("fs"), { spawn, spawnSync } = require("child_process"), http = require("http");
const ROOT = path.resolve(__dirname, "../../.."), OUT = __dirname;
const argv = process.argv.slice(2), SHOTS = argv.includes("--shots"), FIREFOX = !argv.includes("--no-firefox"), GPU = !argv.includes("--no-gpu");
const PORT = +(argv[argv.indexOf("--port") + 1] || 0) || 8791;
const BASE = "80a39ce"; // BLOOM-028A1 — Validated Destination Identity (accepted)
const HOST = `http://127.0.0.1:${PORT}`, STANDALONE = `${HOST}/demos/atmosphere-transition.html`, DESCENT = `${HOST}/demos/expedition-descent.html`;
const SECTOR = 4242, CELL = 4;
const results = []; let fails = 0; const PREEXISTING = new Set(); const perf = {}, timelines = {};
const J = o => JSON.stringify(o);
const check = (ok, name, detail = "") => { results.push({ ok: !!ok, name, detail: String(detail) }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); if (!ok) fails++; };
const info = (name, detail) => { results.push({ ok: true, info: true, name, detail: typeof detail === "string" ? detail : J(detail) }); console.log(`INFO  ${name}  — ${typeof detail === "string" ? detail : J(detail)}`); };
const git = (...a) => spawnSync("git", a, { cwd: ROOT }).stdout.toString();
const ALLOWED = [/^resources\/atmosphere-transition\//, /^resources\/destination-survey\/destination-survey\.(js|css)$/, /^demos\/atmosphere-transition\.html$/, /^demos\/expedition-descent\.html$/,
  /^tools\/atmosphere-transition-check\.js$/, /^docs\/ATMOSPHERE_TRANSITION_v1\.md$/, /^docs\/DESTINATION_SURVEY_v1\.md$/, /^docs\/evidence\/bloom-028b\//, /^README\.md$/];
const stats = a => { const s = [...a].sort((x, y) => x - y), n = s.length; if (!n) return { n: 0 };
  return { n, mean: +(s.reduce((x, y) => x + y, 0) / n).toFixed(1), p95: +s[Math.min(n - 1, Math.floor(n * 0.95))].toFixed(1), max: +s[n - 1].toFixed(1), over50: s.filter(x => x > 50).length }; };

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
    for (const k of ["generatePlanet", "generateFromArchetype", "validatePlanet", "resolveLayout"]) wrap(B, k, k);
    if (B.archetype) for (const k of ["attemptPlanet", "generateFromArchetype"]) wrap(B.archetype, k, "archetype." + k);
    if (B.play) for (const k of ["runSearch", "searchWorld"]) wrap(B.play, k, "play." + k);
    return true; };
  window.__longTasks = []; if ((PerformanceObserver.supportedEntryTypes || []).includes("longtask")) try { new PerformanceObserver(l => { for (const e of l.getEntries()) window.__longTasks.push({ t: e.startTime, d: e.duration }); }).observe({ type: "longtask", buffered: true }); } catch { /* Firefox */ }
  window.__nodes = () => document.getElementsByTagName("*").length - (document.getElementById("log") ? document.getElementById("log").getElementsByTagName("*").length : 0); // (the demo's own run log excluded)
};

function waitHttp(url, ms) { const t0 = Date.now(); return new Promise(res => { const go = () => http.get(url, r => { r.resume(); res(r.statusCode === 200); }).on("error", () => Date.now() - t0 > ms ? res(false) : setTimeout(go, 200)); go(); }); }

async function openPage(browser, url, { viewport = { width: 1280, height: 800 }, reducedMotion = "no-preference" } = {}) {
  const ctx = await browser.newContext({ viewport, reducedMotion });
  await ctx.addInitScript(INIT);
  const page = await ctx.newPage(), log = { errors: [], warnings: [], all: [] };
  page.on("console", m => { const t = `[${m.type()}] ${m.text()}`; log.all.push(t); if (m.type() === "error") log.errors.push(t); if (m.type() === "warning") log.warnings.push(t); });
  page.on("pageerror", e => log.errors.push("[pageerror] " + e.message));
  await page.goto(url);
  return { ctx, page, log };
}
const ev = (page, fn, arg) => page.evaluate(fn, arg);

// screenshot → pixel statistics, decoded in a helper page (never in the page under test)
let helper = null;
async function pixels(buf) {
  return helper.evaluate(async b64 => {
    const img = new Image(); img.src = "data:image/png;base64," + b64; await img.decode();
    const c = document.createElement("canvas"); c.width = img.width; c.height = img.height; const x = c.getContext("2d"); x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height).data; let dark = 0, magenta = 0, minLum = 1; const n = d.length / 4;
    for (let i = 0; i < d.length; i += 4) { const r = d[i], g = d[i + 1], b = d[i + 2], lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      if (lum < minLum) minLum = lum; if (lum < 0.6) dark++; if (r > 200 && g < 90 && b > 140) magenta++; }
    return { n, dark, magenta, minLum: +minLum.toFixed(3) };
  }, buf.toString("base64"));
}

// ---------------------------------------------------------------- Part N
function partN() {
  const head = git("rev-parse", "HEAD").trim(), base = git("rev-parse", BASE).trim();
  const anc = spawnSync("git", ["merge-base", "--is-ancestor", BASE, "HEAD"], { cwd: ROOT }).status === 0;
  const branch = git("rev-parse", "--abbrev-ref", "HEAD").trim(), first = git("rev-list", "--reverse", `${BASE}..HEAD`).trim().split("\n")[0];
  const firstParent = first ? git("rev-parse", `${first}^`).trim() : base;
  check(anc && base.startsWith("80a39ce") && firstParent === base, "N1 provenance: this work sits directly on 80a39ce (BLOOM-028A1 accepted)", `HEAD ${head.slice(0, 7)} on ${branch}; base ${base.slice(0, 7)}`);
  const changed = [...new Set([...git("diff", "--name-only", BASE).split("\n"), ...git("ls-files", "--others", "--exclude-standard").split("\n")].filter(Boolean))];
  const bad = changed.filter(f => !ALLOWED.some(r => r.test(f)));
  check(!bad.length, "N2 only intended files changed (transition module, survey JS / CSS, two demos, the 21st suite, docs, 028B evidence)", bad.join(", ") || `${changed.length} files`);
  const sphere = git("diff", "--name-only", BASE, "--", "resources/planet-sphere").trim();
  check(!sphere, "N3 PlanetSphereView / PlanetSphereRenderer / planet-texture / vendored Three.js unchanged", sphere || "unchanged");
  const gen = git("diff", "--name-only", BASE, "--", "resources/bloom-sim.js", "resources/bloom-gen.js", "resources/bloom-validate.js", "resources/bloom-witness.js", "resources/bloom-archetype.js",
    "resources/bloom-scenario.js", "resources/bloom-play.js", "resources/bloom-play-worker.js", "resources/destination-survey/survey-data.js", "resources/destination-survey/survey-worker.js", "content", "planets", "index.html").trim();
  check(!gen, "N4 generator, validator, witness, play flow, survey data / worker, content, planets and index.html unchanged", gen || "unchanged");
  const r = spawnSync(process.execPath, [path.join(ROOT, "tools/atmosphere-transition-check.js")], { cwd: ROOT }).stdout.toString();
  const p = (r.match(/^PASS/gm) || []).length, f = (r.match(/^FAIL/gm) || []).length;
  check(!f && p >= 12 && /ALL CHECKS PASS/.test(r), "N5 tools/atmosphere-transition-check.js (21st suite): presets, screen-agnostic, no WebGL, one survey renderer, departure never generates", `${p} pass / ${f} fail`);
  info("N provenance", { head: head.slice(0, 7), branch, changed });
}

// ---------------------------------------------------------------- Part S: standalone
/** One sampled DEV.run in the standalone page: per frame phase, veil opacity, which screen shows, drift transform. */
const SAMPLED_RUN = async opts => {
  const rows = []; let last = performance.now(), done = false, rec = null;
  const vis = id => !document.getElementById(id).hidden, inc = vis("A") ? "B" : "A"; // the incoming screen
  const f = now => { const ov = document.querySelector(".atx"), v = ov && ov.querySelector(".atx-veil"), dr = ov && ov.querySelector(".atx-drift");
    rows.push({ t: +(now).toFixed(1), dt: +(now - last).toFixed(1), phase: ov ? ov.dataset.atxPhase : "none", veil: v ? +getComputedStyle(v).opacity : 0, B: vis(inc), inc,
      drift: dr ? getComputedStyle(dr).transform : null, nodes: ov ? ov.getElementsByTagName("*").length + 1 : 0 });
    last = now; if (!done) requestAnimationFrame(f); };
  requestAnimationFrame(f);
  const lt0 = (window.__longTasks || []).length, t0 = performance.now();
  rec = await ATX_DEV.run(opts); done = true;
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  return { rec: { ...rec }, rows, t0, longTasks: (window.__longTasks || []).slice(lt0) };
};
const phaseSeq = rows => rows.map(r => r.phase).filter((p, i, a) => i === 0 || p !== a[i - 1]);
function framesBy(rows) { const by = {}; for (const r of rows.slice(1)) (by[r.phase] = by[r.phase] || []).push(r.dt); return Object.fromEntries(Object.entries(by).map(([k, v]) => [k, stats(v)])); }

async function standalone(browser, B) {
  const tag = s => `${B} ${s}`;
  const { ctx, page, log } = await openPage(browser, STANDALONE);
  await page.waitForFunction(() => window.ATX_DEV && ATX_DEV.ready);
  const base = await ev(page, () => ({ nodes: __nodes(), listeners: __LEAK.listeners, keyCapture: __LEAK.keyCapture, styles: document.querySelectorAll("#bloom-atx-style").length, gl: __LEAK.glCreated }));

  // S1 dramatic, immediate callback
  { const r = await ev(page, SAMPLED_RUN, { preset: "dramatic" }), rec = r.rec, rows = r.rows;
    const seq = phaseSeq(rows), firstB = rows.find(x => x.B), coveredB = rows.filter(x => x.B && x.phase === "covered");
    const ok = J(rec.phases.map(p => p[0])) === J(["concealing", "covered", "revealing", "idle"]) && rec.covered.veil === 1 && rec.covered.concealed === true
      && rec.swapAt >= rec.covered.at && rec.swapAt <= rec.result.times.revealStart + 5 && !rec.overlayLeft && !rec.error;
    check(ok, tag("S1 DRAMATIC, immediate onCovered: concealing → covered → revealing → idle; at covered the veil is opaque (1); the swap A → B happens after covered and before the reveal; overlay removed"),
      `covered @${rec.covered.at} ms, swap @${rec.swapAt}, reveal @${rec.result.times.revealStart}, end @${rec.result.totalMs} ms`);
    check(firstB && firstB.phase === "covered" && coveredB.every(x => x.veil >= 0.999) && rows.filter(x => x.phase === "concealing").every(x => !x.B),
      tag("S2 frame-sampled: the incoming screen is never on screen while concealing, and every frame that has it under a covered overlay has the veil at full opacity"),
      `${rows.length} frames; first B frame phase=${firstB && firstB.phase} veil=${firstB && firstB.veil}`);
    timelines[tag("standalone dramatic immediate")] = rows.map(({ t, phase, veil, B }) => [Math.round(t - r.t0), phase, +veil.toFixed(3), B ? "incoming" : "outgoing"]);
    perf[tag("dramatic immediate frames")] = framesBy(rows); perf[tag("dramatic long tasks")] = r.longTasks.length;
    perf[tag("dramatic overlay nodes")] = Math.max(...rows.map(x => x.nodes)); }

  // S3 delayed covered callback (2.5 s): concealment held, alive, swap only at the end; pixel concealment during the hold
  { const p = ev(page, SAMPLED_RUN, { preset: "dramatic", holdMs: 2500 });
    await page.waitForFunction(() => ATX_DEV.runs.at(-1) && ATX_DEV.runs.at(-1).covered);
    await page.waitForTimeout(1200);
    const px = await pixels(await page.screenshot());
    if (SHOTS) fs.writeFileSync(path.join(OUT, B === "chromium" ? "10-standalone-dramatic-covered-hold.png" : "13-firefox-standalone-covered.png"), await page.screenshot());
    const r = await p, rec = r.rec, cov = r.rows.filter(x => x.phase === "covered"), drifts = new Set(cov.map(x => x.drift));
    const firstInc = r.rows.find(x => x.B), wait = firstInc && cov.length ? firstInc.t - cov[0].t : -1, holdFrames = cov.filter(x => !x.B);
    check(rec.result.coveredHoldMs >= 2500 && cov.every(x => x.veil >= 0.999) && wait >= 2450 && drifts.size > 5 && !rec.overlayLeft,
      tag("S3 async covered hold (2.5 s): the reveal waits for onCovered; the veil stays opaque throughout; the incoming screen appears only after the work; the clouds keep drifting (living hold, not frozen)"),
      `hold ${rec.result.coveredHoldMs} ms; incoming first on screen ${Math.round(wait)} ms after cover; ${cov.length} covered frames (${holdFrames.length} before the swap), ${drifts.size} distinct drift transforms`);
    check(px.dark === 0 && px.magenta === 0, tag("S4 pixel concealment during the hold: no pixel of the screen underneath (no dark pixel, no #ff00aa marker) in a full screenshot"), J(px));
    perf[tag("dramatic covered-hold frames")] = stats(cov.slice(1).map(x => x.dt)); }

  // S5 subdued (and subdued with full conceal)
  { const r = await ev(page, SAMPLED_RUN, { preset: "subdued" }), rec = r.rec;
    const t = rec.result.totalMs;
    check(rec.result.concealed === false && Math.abs(rec.covered.veil - 0.74) < 0.02 && t >= 180 && t <= 330 && !rec.overlayLeft && rec.swapAt >= rec.covered.at,
      tag("S5 SUBDUED: a light mist (veil peak .74, partial), ~200–300 ms in total, same lifecycle and swap point"), `total ${t} ms (conceal ${rec.result.times.covered}, reveal ${t - rec.result.times.revealStart}); peak ${rec.covered.veil}`);
    perf[tag("subdued total ms")] = t; perf[tag("subdued overlay nodes")] = Math.max(...r.rows.map(x => x.nodes));
    timelines[tag("standalone subdued")] = r.rows.map(({ t, phase, veil, B }) => [Math.round(t - r.t0), phase, +veil.toFixed(3), B ? "incoming" : "outgoing"]);
    const r2 = await ev(page, SAMPLED_RUN, { preset: "subdued", conceal: "full" });
    check(r2.rec.covered.veil === 1 && r2.rec.result.concealed === true && r2.rec.result.totalMs <= 360, tag("S6 SUBDUED with conceal: \"full\": opaque at covered when a consumer needs a hidden swap"), `total ${r2.rec.result.totalMs} ms`); }

  // S7 reduced motion, forced: no travel / scaling, no drift; still a reliable covered state and normal cleanup
  { const p = ev(page, SAMPLED_RUN, { preset: "dramatic", reducedMotion: true, holdMs: 400 });
    await page.waitForFunction(() => document.querySelector(".atx"));
    const anim = await ev(page, () => { const ov = document.querySelector(".atx");
      const kf = ov.getAnimations({ subtree: true }).filter(a => a.effect && a.effect.getKeyframes);
      return { n: kf.length, transforms: kf.filter(a => a.effect.getKeyframes().some(k => k.transform && k.transform !== "none")).length,
        drift: getComputedStyle(ov.querySelector(".atx-drift")).animationName, rm: ov.classList.contains("rm") }; });
    const r = await p;
    check(anim.rm && anim.transforms === 0 && anim.drift === "none" && r.rec.covered.veil === 1 && r.rec.result.reducedMotion && !r.rec.overlayLeft && r.rec.swapAt >= r.rec.covered.at && r.rec.result.totalMs < 1500,
      tag("S7 reduced motion (forced): opacity-only veil fade with static clouds (no transform animation, no drift), still opaque at covered, same callback and cleanup"), `${J(anim)}; total ${r.rec.result.totalMs} ms`);
    const s = await ev(page, SAMPLED_RUN, { preset: "subdued", reducedMotion: true });
    check(s.rec.result.reducedMotion && !s.rec.overlayLeft && s.rec.result.totalMs < 400, tag("S7b reduced-motion SUBDUED: a plain short mist fade"), `total ${s.rec.result.totalMs} ms`); }

  // S8 failing callback: overlay still clears, run rejects with the error, screen unchanged
  { const before = await ev(page, () => ATX_DEV.showing);
    const r = await ev(page, SAMPLED_RUN, { preset: "dramatic", fail: true, holdMs: 200 }), rec = r.rec;
    check(rec.error && rec.error.message === "demo: covered work failed" && !rec.overlayLeft && J(rec.phases.map(p => p[0])) === J(["concealing", "covered", "revealing", "idle"]) && (await ev(page, () => ATX_DEV.showing)) === before,
      tag("S8 onCovered rejects: the clouds still reveal and remove themselves, run() rejects with that same error (not swallowed), the screen underneath is unchanged"), J(rec.error)); }

  // S9 busy / dispose / timeout (fresh instances from the module)
  { const r = await ev(page, async () => {
      const { AtmosphereTransition } = await import("/resources/atmosphere-transition/atmosphere-transition.js");
      const out = {};
      const a = new AtmosphereTransition(), first = a.run({ preset: "subdued", onCovered: () => new Promise(r => setTimeout(r, 200)) });
      out.busy = await a.run({ preset: "subdued" }).then(() => "resolved", e => e.name);
      out.firstOk = await first.then(x => !!x.totalMs, e => e.name); a.dispose();
      const kc0 = __LEAK.keyCapture;
      const b = new AtmosphereTransition(); let sig = null;
      const run = b.run({ preset: "dramatic", onCovered: info => { sig = info.signal; return new Promise(r => setTimeout(r, 5000)); } });
      while (b.phase !== "covered") await new Promise(r => setTimeout(r, 20));
      out.kcDuring = __LEAK.keyCapture - kc0;
      const t0 = performance.now(); b.dispose();
      out.dispose = await run.then(() => "resolved", e => e.name); out.disposeMs = Math.round(performance.now() - t0);
      out.signalAborted = sig.aborted; out.overlayAfterDispose = !!document.querySelector(".atx"); out.kcAfter = __LEAK.keyCapture - kc0;
      out.afterDispose = await b.run({}).then(() => "resolved", e => e.name);
      const c = new AtmosphereTransition(); let sig2 = null;
      out.timeout = await c.run({ preset: "subdued", coveredTimeoutMs: 300, onCovered: info => { sig2 = info.signal; return new Promise(() => {}); } }).then(() => "resolved", e => e.name);
      out.timeoutSignal = sig2.aborted; out.overlayAfterTimeout = !!document.querySelector(".atx"); c.dispose();
      out.badPreset = await new AtmosphereTransition().run({ preset: "nope" }).then(() => "resolved", e => e.name);
      return out; });
    check(r.busy === "AtmosphereTransitionBusy" && r.firstOk === true, tag("S9 reentrancy: a second run() on a busy instance rejects at once (AtmosphereTransitionBusy) and the active run completes normally"), J({ busy: r.busy, firstOk: r.firstOk }));
    check(r.dispose === "AbortError" && r.disposeMs < 100 && r.signalAborted && !r.overlayAfterDispose && r.kcDuring === 3 && r.kcAfter === 0 && r.afterDispose === "AbortError",
      tag("S10 dispose() mid-hold: overlay removed at once, run() rejects AbortError promptly, onCovered's AbortSignal aborted, keyboard capture listeners removed; a disposed instance refuses new runs"), J(r));
    check(r.timeout === "AtmosphereTransitionTimeout" && r.timeoutSignal && !r.overlayAfterTimeout && r.badPreset === "TypeError",
      tag("S11 coveredTimeoutMs: a never-settling onCovered is abandoned (signal aborted), the overlay reveals and clears, run() rejects AtmosphereTransitionTimeout; an unknown preset is a TypeError"), J({ timeout: r.timeout, badPreset: r.badPreset })); }

  // S12 input blocking during a run
  { const n0 = await ev(page, () => ATX_DEV.runs.length);
    const box = await page.locator('[data-run="dramatic"]').boundingBox();
    const p = ev(page, () => ATX_DEV.run({ preset: "dramatic", holdMs: 1200 }));
    await page.waitForFunction(() => ATX_DEV.runs.at(-1).covered);
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await ev(page, () => document.querySelector('[data-run="subdued"]').focus()); await page.keyboard.press("Enter"); await page.keyboard.press("Space");
    const hit = await ev(page, ([x, y]) => !!document.elementFromPoint(x, y).closest(".atx"), [box.x + 5, box.y + 5]);
    await p;
    const n1 = await ev(page, () => ATX_DEV.runs.length);
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    const n2 = await ev(page, () => ATX_DEV.runs.length);
    await page.waitForFunction(() => !document.querySelector(".atx") && ATX_DEV.runs.at(-1).result);
    check(hit && n1 === n0 + 1 && n2 === n1 + 1, tag("S12 input blocked while the overlay is up: a click on a control underneath and Enter / Space on a focused control start nothing; the same click works after cleanup"),
      `hit overlay ${hit}; runs ${n0} → ${n1} (during) → ${n2} (after)`); }

  // S13 repeated runs clean up (DOM, listeners, animations, the one shared style element, no WebGL)
  { await ev(page, async () => { const seq = ["dramatic", "subdued", "subdued", "dramatic", "subdued", "subdued", "dramatic", "subdued"];
      for (let i = 0; i < seq.length; i++) await ATX_DEV.run({ preset: seq[i], fail: i === 5, reducedMotion: i === 6 ? true : null }); });
    await page.waitForTimeout(100);
    const end = await ev(page, () => ({ nodes: __nodes(), listeners: __LEAK.listeners, keyCapture: __LEAK.keyCapture, styles: document.querySelectorAll("#bloom-atx-style").length, gl: __LEAK.glCreated,
      anims: document.getAnimations().length, overlays: document.querySelectorAll(".atx").length, runs: ATX_DEV.runs.length, canvases: document.querySelectorAll("canvas").length }));
    const ok = end.nodes === base.nodes && end.listeners === base.listeners && end.keyCapture === 0 && end.styles === 1 && end.gl === 0 && end.anims === 0 && end.overlays === 0 && end.canvases === 0;
    check(ok, tag("S13 repeated runs (dramatic / subdued / failure / reduced; all runs on this page): DOM node count, listeners, keyboard captures and running animations back at baseline; one shared <style>; zero WebGL contexts, zero canvases"),
      `${end.runs} runs; nodes ${base.nodes} → ${end.nodes}, listeners ${base.listeners} → ${end.listeners}, gl ${end.gl}, anims ${end.anims}`); }

  // S16 not a canned animation: fresh runs lay their clouds out differently; a given seed reproduces its layout exactly
  { const v = await ev(page, async () => {
      const sig = () => [...document.querySelectorAll(".atx-cloud")].map(e => e.className + "@" + e.style.left + "," + e.style.top + "," + e.style.width).join("|");
      const grab = async seed => { let s = null, n = 0; const r = await ATX_DEV.atx.run({ preset: "dramatic", seed, onCovered: () => { s = sig(); n = document.querySelectorAll(".atx-cloud").length; } }); return { seed: r.seed, sig: s, n, mirrored: r.mirrored }; };
      const a = await grab(null), b = await grab(null), c = await grab(4242), d = await grab(4242);
      return { seeds: [a.seed, b.seed, c.seed, d.seed], counts: [a.n, b.n, c.n], mirrored: [a.mirrored, b.mirrored, c.mirrored], differ: a.sig !== b.sig && a.seed !== b.seed, same: c.sig === d.sig && c.seed === 4242 && d.seed === 4242 }; });
    check(v.differ && v.same, tag("S16 not a canned animation: two default runs get different random seeds and different cloud layouts; run({ seed }) reproduces a layout exactly (and the result reports the seed)"), J(v)); }

  if (SHOTS && B === "chromium") {
    for (const [seed, file] of [[11, "11a-seed-variation.png"], [2024, "11b-seed-variation.png"], [77777, "11c-seed-variation.png"]]) {
      const p = ev(page, s => ATX_DEV.run({ preset: "dramatic", holdMs: 600, seed: s }), seed);
      await page.waitForFunction(() => ATX_DEV.runs.at(-1).covered); await page.waitForTimeout(200);
      fs.writeFileSync(path.join(OUT, file), await page.screenshot()); await p; }
    const p = ev(page, () => ATX_DEV.run({ preset: "subdued", holdMs: 500 }));
    await page.waitForFunction(() => ATX_DEV.runs.at(-1).covered); await page.waitForTimeout(150);
    fs.writeFileSync(path.join(OUT, "09-standalone-subdued-peak.png"), await page.screenshot()); await p;
    const p2 = ev(page, () => ATX_DEV.run({ preset: "dramatic", holdMs: 400 })); await page.waitForTimeout(650);
    fs.writeFileSync(path.join(OUT, "09b-standalone-dramatic-building.png"), await page.screenshot()); await p2;
  }
  const errs = log.errors.filter(e => !/GPU stall due to ReadPixels/.test(e)), warns = log.warnings.filter(e => !/GPU stall due to ReadPixels/.test(e));
  const devErr = await ev(page, () => ATX_DEV.errors);
  check(!errs.length && !warns.length && !devErr.length, tag("S14 standalone page: no console errors or warnings, no uncaught errors"), J([...errs, ...warns, ...devErr]).slice(0, 300));
  await ctx.close();
}

// ---------------------------------------------------------------- Part D: Destination Survey departure
async function openSurvey(browser, q = "", opts) {
  const o = await openPage(browser, `${DESCENT}?sector=${SECTOR}&workers=3${q}`, opts);
  await o.page.waitForFunction(() => window.DESCENT_DEV && DESCENT_DEV.ready, null, { timeout: 120000 });
  return o;
}
async function toFocus(page) {
  await page.click(`.ds-cand[data-index="${CELL}"]`);
  await page.waitForFunction(() => DESCENT_DEV.survey.state === "focus" && !document.getAnimations().some(a => a.playState === "running"));
  await page.waitForTimeout(300);
}
/** Arm spies + a per-frame sampler, then press Begin (real click) and try to Begin again; resolve when the descent settles. */
const ARM = async cell => {
  const S = DESCENT_DEV.survey, D = await import("/resources/destination-survey/survey-data.js");
  __armGen(); const view = S.views[cell], container = S.globes[cell];
  const spy = window.__spy = { setYaw: 0, lookAt: 0, setPlanet: 0, setDistance: 0 };
  for (const v of S.views) for (const k of ["setYaw", "lookAt", "setPlanet", "setDistance"]) { const f = v[k]; v[k] = function (...a) { if (!v.disposed) spy[k]++; return f.apply(this, a); }; }
  window.__sel = { planet: S.cells[cell].planet, fp: D.planetFingerprint(S.cells[cell].planet), view, container, yaw: view.getYaw(), workersPosts: __workers.posts, workersCreated: __workers.created,
    gen: __gen.calls, stage: S.root.getBoundingClientRect(), listeners: __LEAK.listeners, fpOf: D.planetFingerprint };
  const rows = window.__rows = []; let last = performance.now();
  const f = now => {
    const ov = document.querySelector(".atx"), v = ov && ov.querySelector(".atx-veil"), alive = S.state !== "disposed";
    const r = container.getBoundingClientRect();
    rows.push({ t: +now.toFixed(1), dt: +(now - last).toFixed(1), state: S.state, atx: ov ? ov.dataset.atxPhase : "none", veil: v ? +getComputedStyle(v).opacity : 0,
      yaw: view.disposed ? null : view.getYaw(), viewAlive: !view.disposed, same: alive ? S.views[cell] === view && S.host.views.includes(view) : null,
      globeW: alive && container.isConnected ? +r.width.toFixed(1) : null, dist: view.disposed ? null : +view.distance.toFixed(4), discPx: view.disposed ? null : Math.round(2 * view.radiusPx),
      inside: alive && container.isConnected ? r.left >= __sel.stage.left - 1 && r.top >= __sel.stage.top - 1 && r.right <= __sel.stage.right + 1 && r.bottom <= __sel.stage.bottom + 1 : null, visibleGlobes: alive ? S.globes.filter(g => g.isConnected && getComputedStyle(g).display !== "none" && g.getBoundingClientRect().width > 0).length : 0,
      dest: !document.getElementById("dest").hidden, pool: alive ? S._pool.length : 0, liveGL: __LEAK.liveGL() });
    last = now;
    if (!(DESCENT_DEV.results.length && !ov) || rows.length < 3) requestAnimationFrame(f);
  };
  requestAnimationFrame(f);
  window.__lt0 = __longTasks.length;
  return true;
};

async function departure(browser, B, { q = "", viewport, reducedMotion, name, shots = null } = {}) {
  const o = await openSurvey(browser, q, { viewport, reducedMotion }), { page, log } = o;
  const pre = await ev(page, () => ({ gl: __LEAK.glCreated, live: __LEAK.liveGL(), views: DESCENT_DEV.survey.views.length, hostViews: DESCENT_DEV.survey.host.views.length, canvases: document.querySelectorAll("#survey canvas").length }));
  await toFocus(page);
  if (shots && shots.focus) fs.writeFileSync(path.join(OUT, shots.focus), await page.screenshot());
  await ev(page, ARM, CELL);
  const tBegin = Date.now();
  await page.dblclick('[data-act="begin"]');
  const second = await ev(page, () => DESCENT_DEV.survey.beginExpedition());
  const tShots = [];
  if (shots && shots.timed) for (const [ms, file] of shots.timed) { const w = ms - (Date.now() - tBegin); if (w > 0) await page.waitForTimeout(w); await page.screenshot({ path: path.join(OUT, file) }); tShots.push([file, Date.now() - tBegin]); }
  if (shots && shots.covered) { await page.waitForFunction(() => DESCENT_DEV.handoffs.length); await page.waitForTimeout(500); const buf = await page.screenshot(); fs.writeFileSync(path.join(OUT, shots.covered), buf); }
  let coveredPx = null;
  if (/hold=/.test(q) && !(shots && shots.covered)) { await page.waitForFunction(() => DESCENT_DEV.handoffs.length); await page.waitForTimeout(500); coveredPx = await pixels(await page.screenshot()); }
  await page.waitForFunction(() => DESCENT_DEV.results.length && !document.querySelector(".atx"), null, { timeout: 60000 });
  await page.waitForTimeout(200);
  if (shots && shots.after) fs.writeFileSync(path.join(OUT, shots.after), await page.screenshot());
  const out = await ev(page, () => {
    const S = DESCENT_DEV.survey, h = DESCENT_DEV.handoffs[0], res = DESCENT_DEV.results[0], hook = DESCENT_DEV.hooks[0];
    return { rows: __rows, res, hooks: DESCENT_DEV.hooks.length, begins: S.stats.begins, spy: __spy, gen: __gen.calls - __sel.gen, genLog: __gen.log,
      posts: __workers.posts - __sel.workersPosts, created: __workers.created - __sel.workersCreated, liveWorkers: __workers.live.size, state: S.state,
      identity: h ? { sameAsSel: h.planet === __sel.planet, sameAsHook: hook.detail.planet === __sel.planet, viewSame: hook.detail.view === __sel.view, fpSel: __sel.fp, fpHand: __sel.fpOf(h.planet),
        destText: document.getElementById("destMeta").textContent } : null,
      handoff: h ? { at: h.at, concealed: h.concealed, rm: h.reducedMotion, destHiddenAtCover: h.destHiddenAtCover, veil: h.veil, disposedAt: h.surveyDisposedAt, mountedAt: h.mountedAt } : null,
      yaw0: __sel.yaw, stage: { w: __sel.stage.width, h: __sel.stage.height }, approach: S.stats.approach || null,
      after: { overlay: !!document.querySelector(".atx"), anims: document.getAnimations().length, liveGL: __LEAK.liveGL(), gl: __LEAK.glCreated, surveyChildren: document.getElementById("survey").children.length,
        dsButtons: document.querySelectorAll(".ds-btn, .ds-cand").length, focusables: document.getElementById("survey").querySelectorAll("button,[tabindex],a,input").length,
        active: document.activeElement && document.activeElement.id, destVisible: !document.getElementById("dest").hidden, keyCapture: __LEAK.keyCapture, listenersBefore: __sel.listeners, listeners: __LEAK.listeners,
        styles: document.querySelectorAll("#bloom-atx-style").length, contextWarnings: __LEAK.contextWarnings,
        dossierOpacity: S.state === "focus" ? +getComputedStyle(S.dossier).opacity : null, dossierVis: S.state === "focus" ? getComputedStyle(S.dossier).visibility : null, focusInert: S.state === "focus" ? S.focus.inert : null,
        poolHalted: S._poolHalted, hostViews: S.state === "focus" ? S.host.views.length : null, selDisposed: __sel.view.disposed, errorBanner: !document.getElementById("devError").hidden, devErrors: DESCENT_DEV.errors },
      texSame: null, longTasks: __longTasks.slice(__lt0) };
  });
  out.second = second; out.pre = pre; out.log = log; out.coveredPx = coveredPx; out.tShots = tShots;
  // the mounted surface is pixel-identical to the selected planet's own texture (drawn fresh from the object the survey showed)
  if (out.after.destVisible) out.texSame = await ev(page, async () => { const { drawPlanetTexture } = await import("/resources/planet-sphere/planet-texture.js");
    const a = document.getElementById("destMap"), b = document.createElement("canvas"), h = DESCENT_DEV.hooks[0].detail;
    drawPlanetTexture(b, __sel.planet, { render: h.render || null });
    const da = a.getContext("2d").getImageData(0, 0, a.width, a.height).data, db = b.getContext("2d").getImageData(0, 0, b.width, b.height).data;
    if (da.length !== db.length) return false; for (let i = 0; i < da.length; i++) if (da[i] !== db[i]) return false; return `${a.width}×${a.height}`; });
  if (q.includes("fail=1")) out.recovery = await ev(page, async () => { const S = DESCENT_DEV.survey;
    const r = { focusOnTitle: document.activeElement === S.dossierTitle, yawA: S.views[4].getYaw() };
    await new Promise(res => setTimeout(res, 600)); r.yawB = S.views[4].getYaw();
    r.ret = await S.returnToSurvey(); r.stateAfterReturn = S.state; r.prefetch = S._pool.length > 0 || S.nextSectorReady; return r; });
  timelines[`${B} ${name}`] = out.rows.map(r => [Math.round(r.t - out.rows[0].t), r.state, r.atx, +r.veil.toFixed(3), r.yaw == null ? null : +r.yaw.toFixed(4), r.globeW, r.visibleGlobes, r.dest ? "dest" : "-"]);
  await o.ctx.close();
  return out;
}

function departureChecks(B, name, d, { rm = false, hold = 0 } = {}) {
  const tag = s => `${B} ${name}: ${s}`, rows = d.rows, R = d.res && d.res.transition;
  const coveredIdx = rows.findIndex(r => r.atx === "covered"), pre = rows.slice(0, coveredIdx < 0 ? rows.length : coveredIdx), alivePre = pre.filter(r => r.state !== "disposed");
  check(d.pre.gl === 1 && d.pre.live === 1 && d.pre.views === 9 && d.pre.hostViews === 9 && d.pre.canvases === 1, tag("D1 before focus: one PlanetSphereRenderer, one WebGL context, nine views, one canvas"), J(d.pre));
  check(d.second === null && d.hooks === 1 && d.begins === 1, tag("D2 Begin cannot double-fire: a double click plus a programmatic beginExpedition() during the departure → one announcement, second call null"), `hooks ${d.hooks}, begins ${d.begins}, second ${J(d.second)}`);
  check(alivePre.length > 5 && alivePre.every(r => r.same && r.viewAlive && r.visibleGlobes === 1), tag("D3 the SAME live PlanetSphereView (same object, still on the shared renderer, not disposed) is the one visible globe in every frame from Begin to full cover"),
    `${alivePre.length} frames before cover`);
  const yaws = alivePre.map(r => r.yaw), dy = yaws.slice(1).map((y, i) => y - yaws[i]);
  const yawOk = d.spy.setYaw === 0 && d.spy.lookAt === 0 && d.spy.setPlanet === 0 && Math.abs(yaws[0] - d.yaw0) < 0.05 && dy.every(x => Math.abs(x) < 0.05)
    && (rm ? dy.every(x => x === 0) : dy.every(x => x >= -1e-9) && yaws.at(-1) > yaws[0]);
  check(yawOk, tag(`D4 yaw continuity: no setYaw / lookAt / setPlanet on any view; yaw at Begin carried on${rm ? " (reduced motion: the view does not spin, and nothing turns it)" : " — still spinning with its idle rotation, no jump"}; no landing alignment`),
    `yaw ${d.yaw0.toFixed(4)} → ${yaws.at(-1) && yaws.at(-1).toFixed(4)} over ${yaws.length} frames; max |Δ| ${Math.max(...dy.map(Math.abs)).toFixed(4)}; spies ${J(d.spy)}`);
  if (!rm) { const dep = alivePre.filter(r => r.state === "departing"), ds = dep.map(r => r.discPx), dist = dep.map(r => r.dist), big = Math.max(d.stage.w, d.stage.h);
    const firstBig = dep.find(r => r.discPx > big);
    check(ds.at(-1) > ds[0] * 2 && firstBig && firstBig.veil < 0.999 && ds.slice(1).every((x, i) => x >= ds[i] - 1) && dist.slice(1).every((x, i) => x <= dist[i] + 1e-6) && dep.every(r => r.inside),
      tag("D5 planet approach: the live globe moves to the centre and its camera dollies in (distance only ever decreases, the disc only grows) until, while still visible, the disc is wider than the screen; its box never leaves the canvas"),
      `disc ${ds[0]} → ${ds.at(-1)} px before cover (screen ${big} px; wider than the screen first at veil ${firstBig && firstBig.veil.toFixed(2)}); distance ${dist[0]} → ${dist.at(-1)}; setDistance calls ${d.spy.setDistance}`); }
  else check(pre.filter(r => r.globeW).every(r => Math.abs(r.globeW - pre[0].globeW) < 0.5) && d.spy.setDistance === 0, tag("D5 reduced motion: no planet approach (no box change, no camera dolly); only fades"), `box ${pre[0].globeW} px`);
  const id = d.identity;
  check(id && id.sameAsSel && id.sameAsHook && id.viewSame && id.fpSel === id.fpHand && id.destText.includes(id.fpSel) && d.texSame,
    tag("D6 planet identity: the object handed over under cover IS the selected cell's planet (===) and the hook's detail.planet; same fingerprint; the destination surface is pixel-identical to that object's own texture"),
    id ? `${id.fpSel}; surface ${d.texSame}` : "no handoff");
  check(d.gen === 0 && d.posts === 0 && d.created === 0 && d.liveWorkers === 0 && pre.filter(r => r.state === "departing").every(r => r.pool === 0),
    tag("D7 no generation during the departure: zero main-thread generator / validator / layout calls, zero worker messages or new workers; the prefetch pool is halted at Begin"), `gen ${d.gen} ${J(d.genLog.slice(0, 3))}, posts ${d.posts}, created ${d.created}, live ${d.liveWorkers}`);
  const h = d.handoff, revealAbs = R ? R.times.start + R.times.revealStart : 0;
  check(h && h.concealed && h.veil === 1 && h.destHiddenAtCover && h.disposedAt < revealAbs && h.mountedAt < revealAbs && h.rm === rm,
    tag("D8 hidden handoff: onCovered runs only at full cover (veil 1); the survey is disposed and the destination mounted before the reveal begins"),
    h ? `covered → disposed +${(h.disposedAt - h.at).toFixed(0)} ms → mounted +${(h.mountedAt - h.at).toFixed(0)} ms; reveal starts +${(revealAbs - h.at).toFixed(0)} ms` : "none");
  const firstDest = rows.find(r => r.dest), firstDisposed = rows.find(r => r.state === "disposed");
  check(firstDest && firstDest.atx === "covered" && firstDest.veil >= 0.999 && rows.filter(r => r.dest && r.atx === "covered").every(r => r.veil >= 0.999) && pre.every(r => !r.dest)
    && firstDisposed && firstDisposed.atx === "covered" && firstDisposed.veil >= 0.999,
    tag("D9 frame-sampled: the destination is never on screen before full cover, and the survey's disposal is first seen under an opaque veil"), `first destination frame: ${firstDest && firstDest.atx} veil ${firstDest && firstDest.veil}`);
  if (d.coveredPx) check(d.coveredPx.dark === 0, tag("D9b pixel concealment during the covered hold: no dark pixel of the survey or the destination anywhere on screen"), J(d.coveredPx));
  const a = d.after;
  check(R && !a.overlay && a.anims === 0 && a.destVisible && a.active === "destTitle" && a.surveyChildren === 0 && a.dsButtons === 0 && a.focusables === 0 && a.liveGL === 0 && a.keyCapture === 0 && a.styles === 1,
    tag("D10 reveal + cleanup: overlay gone, no animations left, destination shown and focused, the survey's DOM and every focusable control gone, its WebGL context released, no input capture left"),
    J({ totalMs: R && R.totalMs, hold: R && R.coveredHoldMs, listeners: `${a.listenersBefore} → ${a.listeners}`, liveGL: a.liveGL }));
  if (hold) { const cov = rows.filter(r => r.atx === "covered");
    check(R && R.coveredHoldMs >= hold && cov.every(r => r.veil >= 0.999) && cov.filter(r => !r.dest).length > 10, tag(`D11 async hold (${hold} ms of covered work): concealment held the whole time, the reveal waited`), `hold ${R && R.coveredHoldMs} ms, ${cov.length} covered frames`); }
  if (R) check(R.reducedMotion === rm, tag(`D12 the transition ran ${rm ? "its reduced-motion path" : "the full dramatic path"}`), `reducedMotion ${R.reducedMotion}; total ${R.totalMs} ms (+ ${rm ? 0 : 560} ms approach lead)`);
  const known = e => /GPU stall due to ReadPixels/.test(e) || (PREEXISTING.has(B) && /WebGL context was lost\./.test(e));
  const errs = d.log.errors.filter(e => !known(e)), warns = d.log.warnings.filter(e => !known(e));
  check(!errs.length && !warns.length && !a.devErrors.length && a.contextWarnings === 0, tag("D13 no console errors / warnings, no new WebGL warnings, no uncaught errors" + (PREEXISTING.has(B) ? " (Firefox's \"WebGL context was lost.\" on the survey's dispose is the unmodified renderer's own message, proven pre-existing by F0)" : "")),
    J([...errs, ...warns, ...a.devErrors]).slice(0, 300));
  departurePerf(B, name, d);
}
function departurePerf(B, name, d) {
  const phaseOf = r => r.atx === "none" ? (r.dest ? "after" : r.state === "focus" ? "before Begin" : "approach") : r.atx;
  const by = {}; for (const r of d.rows.slice(1)) (by[phaseOf(r)] = by[phaseOf(r)] || []).push(r.dt);
  perf[`${B} ${name} frames`] = Object.fromEntries(Object.entries(by).map(([k, v]) => [k, stats(v)]));
  perf[`${B} ${name} long tasks`] = d.longTasks.map(x => Math.round(x.d));
}

async function failedDeparture(browser, B) {
  const d = await departure(browser, B, { q: "&fail=1&hold=300", name: "covered work fails" });
  const a = d.after, rc = d.recovery, tag = s => `${B} failure: ${s}`;
  check(d.res && /covered work failed/.test(d.res.error) && d.state === "focus" && !a.overlay && a.dossierOpacity === 1 && a.dossierVis === "visible" && a.focusInert === false && !a.selDisposed && a.hostViews === 9 && a.errorBanner,
    tag("D14 onCovered fails: the survey is restored UNDER cover (focus state, dossier back, same view), the clouds reveal it and clear, the caller's onError gets the error"), J({ res: d.res, state: d.state }));
  check(rc.focusOnTitle && rc.yawB !== rc.yawA && rc.ret === true && rc.stateAfterReturn === "survey" && !a.poolHalted && rc.prefetch,
    tag("D15 after the failure the screen is fully usable: focus back on the dossier, the globe still turning, Return to survey works, prefetching resumed"), J(rc));
  check(d.identity === null || d.identity.sameAsSel, tag("D16 the failure path never touched the planet"));
}

// ---------------------------------------------------------------- GPU (report only)
async function gpuSample(b) {
  const r = await departure(b, "gpu", { name: "GPU (Metal) departure" }); departurePerf("gpu", "GPU (Metal) departure", r);
  info("GPU departure frames (real GPU, ANGLE/Metal)", perf["gpu GPU (Metal) departure frames"]);
  const { ctx, page } = await openPage(b, STANDALONE);
  await page.waitForFunction(() => window.ATX_DEV && ATX_DEV.ready);
  const s = await ev(page, SAMPLED_RUN, { preset: "dramatic", holdMs: 1000 }), u = await ev(page, SAMPLED_RUN, { preset: "subdued" });
  perf["gpu standalone dramatic frames"] = framesBy(s.rows); perf["gpu standalone subdued total ms"] = u.rec.result.totalMs; perf["gpu standalone subdued frames"] = framesBy(u.rows);
  info("GPU standalone dramatic frames", perf["gpu standalone dramatic frames"]); info("GPU standalone subdued", { totalMs: u.rec.result.totalMs });
  await ctx.close();
  return r;
}

// ---------------------------------------------------------------- main
(async () => {
  partN();
  const pw = require("playwright");
  const server = spawn("python3", ["-m", "http.server", String(PORT), "--bind", "127.0.0.1"], { cwd: ROOT, stdio: "ignore" });
  check(await waitHttp(STANDALONE, 8000) && await waitHttp(DESCENT, 8000), "B0 `python3 -m http.server` from the repository root serves both demos", `${STANDALONE} · ${DESCENT}`);
  try {
    const chromium = await pw.chromium.launch();
    const hctx = await chromium.newContext(); helper = await hctx.newPage();
    console.log("\n— Chromium: standalone"); await standalone(chromium, "chromium");
    { const ctx = await chromium.newContext({ reducedMotion: "reduce" }); const page = await ctx.newPage(); await page.goto(STANDALONE); await page.waitForFunction(() => window.ATX_DEV && ATX_DEV.ready);
      const r = await page.evaluate(() => ATX_DEV.run({ preset: "dramatic" }));
      check(r.result && r.result.reducedMotion === true && r.covered.veil === 1 && !r.overlayLeft, "chromium S15 system prefers-reduced-motion: reduce (no option passed) → the component takes its reduced path by itself", `total ${r.result && r.result.totalMs} ms`); await ctx.close(); }
    console.log("\n— Chromium: Destination Survey departure");
    const d1 = await departure(chromium, "chromium", { name: "dramatic 1280×800" }); departureChecks("chromium", "dramatic 1280×800", d1);
    const d2 = await departure(chromium, "chromium", { q: "&hold=1500", name: "async hold 1.5 s" }); departureChecks("chromium", "async hold 1.5 s", d2, { hold: 1500 });
    check(d1.res && d2.res && Number.isInteger(d1.res.transition.seed) && d1.res.transition.seed !== d2.res.transition.seed,
      "chromium D19 each departure draws a fresh cloud layout (two expeditions, two different seeds)", `${d1.res && d1.res.transition.seed} vs ${d2.res && d2.res.transition.seed}`);
    const d3 = await departure(chromium, "chromium", { q: "&rm=1&hold=1200", name: "reduced motion" }); departureChecks("chromium", "reduced motion", d3, { rm: true, hold: 1200 });
    const d4 = await departure(chromium, "chromium", { viewport: { width: 1024, height: 768 }, name: "dramatic 1024×768" }); departureChecks("chromium", "dramatic 1024×768", d4);
    const d5 = await departure(chromium, "chromium", { reducedMotion: "reduce", name: "system reduced motion" });
    check(d5.res && d5.res.transition.reducedMotion === true && d5.rows.filter(r => r.globeW).every(r => r.globeW === d5.rows[0].globeW) && d5.after.destVisible,
      "chromium D17 system prefers-reduced-motion (no survey option): the survey's departure and the transition both take their reduced paths", `total ${d5.res && d5.res.transition.totalMs} ms`);
    await failedDeparture(chromium, "chromium");
    { const big = await departure(chromium, "chromium", { viewport: { width: 1440, height: 900 }, name: "dramatic 1440×900" }); departureChecks("chromium", "dramatic 1440×900", big);
      const all = big.rows.filter(r => r.inside !== null);
      check(all.every(r => r.inside) && big.approach && big.approach.dollyTo === 1.45, "chromium D18 the live globe's box never extends beyond the stage / canvas (so the WebGL viewport stays inside the drawing buffer); the approach is a camera dolly to the view's own closest distance", `${all.length} frames; ${J(big.approach)}`); }
    if (SHOTS) {
      console.log("\n— evidence shots");
      await departure(chromium, "shots", { viewport: { width: 1440, height: 900 }, name: "shots", q: "&hold=900",
        shots: { focus: "01-focused-before-begin.png", timed: [[420, "02-early-approach.png"], [1050, "03-partial-cloud-entry.png"], [1650, "04-near-full-concealment.png"]], covered: "05-covered-hold.png" } });
      { const o = await openSurvey(chromium, "", { viewport: { width: 1440, height: 900 } }); await toFocus(o.page);
        await o.page.click('[data-act="begin"]'); await o.page.waitForFunction(() => document.querySelector(".atx") && document.querySelector(".atx").dataset.atxPhase === "revealing");
        await o.page.waitForTimeout(380); await o.page.screenshot({ path: path.join(OUT, "06-cloud-reveal.png") });
        await o.page.waitForFunction(() => DESCENT_DEV.results.length && !document.querySelector(".atx")); await o.page.waitForTimeout(300);
        await o.page.screenshot({ path: path.join(OUT, "07-revealed-destination.png") }); await o.ctx.close(); }
      await departure(chromium, "shots", { viewport: { width: 1440, height: 900 }, name: "shots-rm", q: "&rm=1&hold=900", shots: { covered: "08-reduced-motion-covered.png" } });
    }
    await hctx.close(); await chromium.close();

    if (FIREFOX) { let ff = null; try { ff = await pw.firefox.launch(); } catch (err) { info("Firefox", "not available: " + err.message.split("\n")[0]); }
      if (ff) { const hc = await ff.newContext(); helper = await hc.newPage();
        console.log("\n— Firefox: standalone"); await standalone(ff, "firefox");
        console.log("\n— Firefox: Destination Survey departure");
        { // F0: the unmodified 028A dev page (no 028B code runs there): dispose the survey and record what Firefox logs
          const o = await openPage(ff, `${HOST}/demos/destination-survey.html?sector=${SECTOR}`); await o.page.waitForFunction(() => window.SURVEY_DEV && SURVEY_DEV.ready, null, { timeout: 120000 });
          await o.page.evaluate(() => SURVEY_DEV.survey.dispose()); await o.page.waitForTimeout(300);
          const lost = o.log.warnings.filter(w => /WebGL context was lost\./.test(w)).length, other = o.log.warnings.filter(w => !/WebGL context was lost\./.test(w));
          if (lost) PREEXISTING.add("firefox");
          check(lost >= 1, "firefox F0 control: the accepted 028A page's own survey.dispose() (PlanetSphereRenderer.dispose → forceContextLoss, unmodified) already logs \"WebGL context was lost.\" in Firefox — pre-existing, not new", `lost ${lost}; other warnings ${J(other).slice(0, 200)}`);
          await o.ctx.close(); }
        const f1 = await departure(ff, "firefox", { name: "dramatic", shots: SHOTS ? { after: "12-firefox-revealed-destination.png" } : null }); departureChecks("firefox", "dramatic", f1);
        const f2 = await departure(ff, "firefox", { q: "&hold=1500", name: "async hold 1.5 s" }); departureChecks("firefox", "async hold 1.5 s", f2, { hold: 1500 });
        const f3 = await departure(ff, "firefox", { q: "&rm=1", name: "reduced motion" }); departureChecks("firefox", "reduced motion", f3, { rm: true });
        await failedDeparture(ff, "firefox");
        await hc.close(); await ff.close(); } }
    { let wk = null; try { wk = await pw.webkit.launch(); info("WebKit", "available"); await wk.close(); } catch (err) { info("WebKit (Safari engine)", "not available on this machine: " + err.message.split("\n")[0].slice(0, 140)); } }
    if (GPU) { try { const g = await pw.chromium.launch({ args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] }); const hc = await g.newContext(); helper = await hc.newPage(); await gpuSample(g); await g.close(); }
      catch (err) { info("GPU sample", "unavailable: " + err.message.split("\n")[0]); } }
  } finally { server.kill(); }
  for (const [k, v] of Object.entries(perf)) if (!k.startsWith("gpu")) info("perf " + k, v);
  fs.writeFileSync(path.join(OUT, "qa-results.json"), J({ date: new Date().toISOString(), head: git("rev-parse", "HEAD").trim(), pass: results.filter(r => !r.info && r.ok).length, fail: fails, results }, null, 1));
  fs.writeFileSync(path.join(OUT, "perf.json"), JSON.stringify(perf, null, 1));
  fs.writeFileSync(path.join(OUT, "timelines.json"), J({ legendStandalone: ["ms", "phase", "veil", "screen"], legendDeparture: ["ms", "survey state", "transition phase", "veil", "yaw", "globe box px", "visible globes", "destination"], timelines }));
  console.log(fails ? `\n${fails} check(s) FAILED` : `\nALL CHECKS PASS (${results.filter(r => !r.info).length})`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
