// BLOOM-028C1 — Menu ↔ Destination Survey fade-through-black QA.
//
//   NODE_PATH="$(npm root -g)" node docs/evidence/bloom-028c1/qa-menu-fade.js [--shots] [--no-firefox] [--no-gpu] [--port 8797]
//
// Part N (Node): provenance (start SHA 1b0e375, only the entry / menu / suite / doc / demo comment changed; AtmosphereTransition,
//   survey, sphere, generator, content, index.html untouched) and the 22nd suite.
// Part F (demos/main-menu.html; Chromium, Firefox): repeated round trips menu → survey → menu in one page, every transition
//   frame-sampled (black layer opacity, which screens are mounted / displayed, painting state, any cloud overlay, host
//   transforms): the screens swap only on fully black frames, no frame shows both, no clouds / zoom / wipe; the black lifts only
//   after the new screen has drawn; the return's painting is the preloaded next one, decoded and at rest before the lift;
//   prefetch adoption and exact planet identity; per-cycle leak snapshots (listeners, observers, key captures, WebGL contexts,
//   workers, DOM, running animations) back at the pre-survey baseline. Slow preparation injected both ways (slow WebGL init, a
//   painting that has not arrived) stays black. Reduced motion (forced, system). The survey's dramatic departure still runs the
//   AtmosphereTransition's DRAMATIC preset from the menu-entered survey. Results → qa-results.json, perf.json, timelines.json.
"use strict";
const path = require("path"), fs = require("fs"), { spawn, spawnSync } = require("child_process"), http = require("http");
const ROOT = path.resolve(__dirname, "../../.."), OUT = __dirname;
const argv = process.argv.slice(2), SHOTS = argv.includes("--shots"), FIREFOX = !argv.includes("--no-firefox");
const PORT = +(argv[argv.indexOf("--port") + 1] || 0) || 8797;
const BASE = "1b0e375"; // BLOOM-028C final evidence (accepted start state)
const HOST = `http://127.0.0.1:${PORT}`, MENU = `${HOST}/demos/main-menu.html`, SURVEY = `${HOST}/demos/destination-survey.html`;
const SECTOR = 4242;
const results = []; let fails = 0; const PREEXISTING = new Set(); const perf = {}, timelines = {};
const J = o => JSON.stringify(o);
const check = (ok, name, detail = "") => { results.push({ ok: !!ok, name, detail: String(detail) }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); if (!ok) fails++; };
const info = (name, detail) => { results.push({ ok: true, info: true, name, detail: typeof detail === "string" ? detail : J(detail) }); console.log(`INFO  ${name}  — ${typeof detail === "string" ? detail : J(detail)}`); };
const git = (...a) => spawnSync("git", a, { cwd: ROOT }).stdout.toString();
const ALLOWED = [/^resources\/main-menu\/(expedition-entry\.js|main-menu\.js|main-menu\.css)$/, /^tools\/main-menu-check\.js$/, /^docs\/MAIN_MENU_v1\.md$/, /^demos\/main-menu\.html$/, /^docs\/evidence\/bloom-028c1\//];
const stats = a => { const s = [...a].sort((x, y) => x - y), n = s.length; if (!n) return { n: 0 };
  return { n, mean: +(s.reduce((x, y) => x + y, 0) / n).toFixed(1), p95: +s[Math.min(n - 1, Math.floor(n * 0.95))].toFixed(1), max: +s[n - 1].toFixed(1), over50: s.filter(x => x > 50).length }; };

// ---------------------------------------------------------------- before any page script
const INIT = () => {
  const L = window.__LEAK = { listeners: 0, observers: 0, glCreated: 0, keyCapture: 0 }, fid = new WeakMap(); let nid = 0;
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
  HTMLCanvasElement.prototype.getContext = function (type, a) { const had = this.__gl;
    if (/webgl/.test(type) && !had && window.__slowGL) { const t = performance.now(); while (performance.now() - t < window.__slowGL) { /* QA: a slow GPU / driver init */ } window.__slowGL = 0; }
    const c = og.call(this, type, a);
    if (c && /webgl/.test(type) && !had) { this.__gl = true; L.glCreated++; gls.push(new WeakRef(c)); } return c; };
  L.liveGL = () => gls.filter(r => { const c = r.deref(); return c && !c.isContextLost(); }).length;
  window.__workers = { created: 0, live: new Set() };
  const OW = window.Worker; window.Worker = class extends OW { constructor(...a) { super(...a); __workers.created++; __workers.live.add(this); } terminate() { __workers.live.delete(this); return super.terminate(); } };
  window.__gen = { calls: 0 };
  window.__armGen = () => { const B = window.BLOOM; if (!B) return;
    const wrap = (obj, k) => { const f = obj && obj[k]; if (typeof f !== "function" || f.__wrapped) return; const w = function (...a) { __gen.calls++; return f.apply(this, a); }; w.__wrapped = true; obj[k] = w; };
    for (const k of ["generatePlanet", "generateFromArchetype", "validatePlanet"]) wrap(B, k);
    if (B.archetype) for (const k of ["attemptPlanet", "generateFromArchetype"]) wrap(B.archetype, k);
    if (B.play) for (const k of ["runSearch", "searchWorld"]) wrap(B.play, k); };
  document.addEventListener("DOMContentLoaded", () => window.__armGen());
  // a frame sampler: one row per animation frame until `until(entry)` holds and the black layer is gone
  window.__sample = (until) => new Promise(res => { const rows = window.__rows = []; let last = performance.now(); const E = MENU_DEV.entry;
    const f = now => { const cs = getComputedStyle(E.black), black = cs.display === "none" ? 0 : +cs.opacity, ds = document.querySelector(".ds"), m = E.menu, menuOn = E.menuHost.style.display !== "none";
      const ov = document.querySelector(".atx"), S = E.survey;
      rows.push({ t: +now.toFixed(1), dt: +(now - last).toFixed(1), state: E.state, black: +black.toFixed(4), blackShown: cs.display !== "none",
        menuOn, ds: !!ds, dsVisible: !!ds && !E.surveyHost.hidden, dsState: ds ? ds.dataset.state : null, cells: S ? S.cells.filter(Boolean).length : 0, renders: S && S.host ? S.host.renders : null,
        bg: m.background ? m.background.index : null, artShown: m.art.classList.contains("is-shown"), artOp: +getComputedStyle(m.art).opacity, artReady: m.art.complete && m.art.naturalWidth > 0,
        plaque: menuOn ? +getComputedStyle(m.plaque).opacity : null, atx: ov ? ov.className : null,
        tf: [getComputedStyle(E.menuHost).transform, getComputedStyle(E.surveyHost).transform, cs.transform, getComputedStyle(E.root).transform].filter(x => x && x !== "none").length,
        clip: [E.menuHost, E.surveyHost, E.black].map(e => getComputedStyle(e).clipPath).filter(x => x && x !== "none").length,
        dur: (a => a ? a.effect.getTiming().duration : null)(E.black.getAnimations()[0]), gl: __LEAK.liveGL(), workers: __workers.live.size });
      last = now; if (rows.length < 3 || !(until(E) && !rows.at(-1).blackShown)) requestAnimationFrame(f); else res(rows); };
    requestAnimationFrame(f); });
  window.__snap = () => { const E = MENU_DEV.entry; return { listeners: __LEAK.listeners, observers: __LEAK.observers, keyCapture: __LEAK.keyCapture, liveGL: __LEAK.liveGL(), glCreated: __LEAK.glCreated,
    workersLive: __workers.live.size, workersCreated: __workers.created, poolWorkers: E.prefetch ? E.prefetch._pool.length : 0, dsNodes: document.querySelectorAll(".ds, .ds *").length, atx: document.querySelectorAll(".atx").length,
    black: getComputedStyle(E.black).display, blackStyleOpacity: E.black.style.opacity, anims: document.getAnimations().filter(a => a.playState === "running").length, blackAnims: E.black.getAnimations().length,
    rootChildren: E.root.children.length, inert: [E.menuHost.inert, E.surveyHost.inert], state: E.state }; };
};

function waitHttp(url, ms) { const t0 = Date.now(); return new Promise(res => { const go = () => http.get(url, r => { r.resume(); res(r.statusCode === 200); }).on("error", () => Date.now() - t0 > ms ? res(false) : setTimeout(go, 200)); go(); }); }
async function openMenu(browser, q = "", { viewport = { width: 1280, height: 800 }, reducedMotion = "no-preference" } = {}) {
  const ctx = await browser.newContext({ viewport, reducedMotion });
  await ctx.addInitScript(INIT);
  const page = await ctx.newPage(), log = { errors: [], warnings: [] };
  page.on("console", m => { const t = `[${m.type()}] ${m.text()}`; if (m.type() === "error") log.errors.push(t); if (m.type() === "warning") log.warnings.push(t); });
  page.on("pageerror", e => log.errors.push("[pageerror] " + e.message));
  await page.goto(`${MENU}?${q}`);
  await page.waitForFunction(() => window.MENU_DEV && MENU_DEV.ready, null, { timeout: 60000 });
  return { ctx, page, log };
}
const ev = (page, fn, arg) => page.evaluate(fn, arg);
const consoleIssues = (log, B) => [...log.errors, ...log.warnings].filter(e => !(/GPU stall due to ReadPixels/.test(e) || (PREEXISTING.has(B) && /WebGL context was lost\./.test(e))));

// ---------------------------------------------------------------- Part N
function partN() {
  const head = git("rev-parse", "HEAD").trim(), base = git("rev-parse", BASE).trim();
  const branch = git("rev-parse", "--abbrev-ref", "HEAD").trim(), first = git("rev-list", "--reverse", `${BASE}..HEAD`).trim().split("\n")[0];
  const firstParent = first ? git("rev-parse", `${first}^`).trim() : base;
  check(spawnSync("git", ["merge-base", "--is-ancestor", BASE, "HEAD"], { cwd: ROOT }).status === 0 && firstParent === base, "N1 provenance: this work sits directly on 1b0e375 (BLOOM-028C final evidence, accepted start state)", `HEAD ${head.slice(0, 7)} on ${branch}; base ${base.slice(0, 7)}`);
  const changed = [...new Set([...git("diff", "--name-only", BASE).split("\n"), ...git("ls-files", "--others", "--exclude-standard").split("\n")].filter(Boolean))];
  const bad = changed.filter(f => !ALLOWED.some(r => r.test(f)));
  check(!bad.length, "N2 only intended files changed (expedition-entry.js, main-menu.js / .css, the 22nd suite, MAIN_MENU_v1.md, the demo's comment, 028C1 evidence)", bad.join(", ") || J(changed));
  const fixed = git("diff", "--name-only", BASE, "--", "resources/atmosphere-transition", "resources/destination-survey", "resources/planet-sphere", "resources/bloom-sim.js", "resources/bloom-gen.js",
    "resources/bloom-validate.js", "resources/bloom-witness.js", "resources/bloom-archetype.js", "resources/bloom-scenario.js", "resources/bloom-play.js", "resources/bloom-play-worker.js", "resources/main-menu/backgrounds",
    "resources/main-menu/main-menu-data.js", "content", "planets", "index.html").trim();
  check(!fixed, "N3 AtmosphereTransition (code + presets), Destination Survey + SectorPool + worker, PlanetSphereView / renderer, generator / play flow, menu data + paintings, content, index.html: unchanged", fixed || "unchanged");
  const strip = t => t.replace(/<!--[\s\S]*?-->/g, ""), demoNow = fs.readFileSync(path.join(ROOT, "demos/main-menu.html"), "utf8"), demoBase = git("show", `${BASE}:demos/main-menu.html`);
  check(strip(demoNow) === strip(demoBase), "N4 demos/main-menu.html: only its header comment changed (no markup or script)", demoNow === demoBase ? "unchanged" : "comment only");
  const r = spawnSync(process.execPath, [path.join(ROOT, "tools/main-menu-check.js")], { cwd: ROOT }).stdout.toString();
  const p = (r.match(/^PASS/gm) || []).length, f = (r.match(/^FAIL/gm) || []).length;
  check(!f && p >= 17 && /ALL CHECKS PASS/.test(r) && /PASS  M7g/.test(r) && /PASS  M7h/.test(r), "N5 tools/main-menu-check.js (22nd suite) incl. M7g (entry never runs the AtmosphereTransition itself; opacity-only fade) and M7h (settled return)", `${p} pass / ${f} fail`);
  info("N provenance", { head: head.slice(0, 7), branch, changed });
}

// ---------------------------------------------------------------- frame analysis
/** The swap evidence for one transition `from` → `to` ("menu" | "survey"). */
function analyse(rows, from, to, rec) {
  const on = (r, s) => s === "menu" ? r.menuOn : r.dsVisible;
  const both = rows.filter(r => r.menuOn && r.ds).length, neither = rows.filter(r => !r.menuOn && !r.ds && r.black < 0.999).length;
  const swapIdx = rows.findIndex(r => !on(r, from));
  const firstTo = rows.find(r => on(r, to)), firstNoFrom = rows[swapIdx];
  const pre = rows.slice(0, swapIdx), post = swapIdx < 0 ? [] : rows.slice(swapIdx);
  const liftIdx = post.findIndex(r => r.black < 0.999), blackAfterSwap = liftIdx < 0 ? post.length : liftIdx;
  const partial = rows.filter(r => r.blackShown && r.black > 0.001 && r.black < 0.999);
  return {
    both, neither, swapAtBlack: !!firstNoFrom && firstNoFrom.black >= 0.999 && !!firstTo && firstTo.black >= 0.999,
    preOnlyFrom: pre.every(r => on(r, from) && !on(r, to)), postOnlyTo: post.every(r => on(r, to) && !on(r, from)),
    blackFramesAfterSwap: blackAfterSwap, fadeOutFrames: pre.filter(r => r.black > 0.001 && r.black < 0.999).length, fadeInFrames: post.filter(r => r.black > 0.001 && r.black < 0.999).length,
    partial: partial.length, noClouds: rows.every(r => !r.atx), noTransform: rows.every(r => !r.tf && !r.clip),
    durOut: [...new Set(pre.map(r => r.dur).filter(x => x != null))], durIn: [...new Set(post.map(r => r.dur).filter(x => x != null))],
    swapRow: firstNoFrom ? { black: firstNoFrom.black, menuOn: firstNoFrom.menuOn, ds: firstNoFrom.ds } : null,
    lastBlackRow: post[Math.max(0, blackAfterSwap - 1)] || null, firstLiftRow: post[liftIdx] || null, post, rec,
  };
}
const tl = rows => rows.map(r => [Math.round(r.t - rows[0].t), r.state, r.black, r.menuOn ? `menu(bg${r.bg + 1}${r.artShown ? "" : ",art-pending"},plaque ${r.plaque})` : "-", r.ds ? `ds:${r.dsState}:${r.cells}${r.renders != null ? ` r${r.renders}` : ""}` : "-", r.atx || "", r.gl, r.workers]);

async function begin(page, { dbl = false } = {}) {
  const sampling = ev(page, () => __sample(E => E.state === "survey"));
  await page.waitForTimeout(30);
  if (dbl) await page.dblclick('[data-act="begin"]'); else await page.click('[data-act="begin"]');
  const rows = await sampling;
  const rec = await ev(page, () => MENU_DEV.entry.stats.entries.at(-1));
  return { rows, rec };
}
async function back(page) {
  const sampling = ev(page, () => __sample(E => E.state === "menu"));
  await page.waitForTimeout(30);
  await page.click('[data-act="exit"]');
  const rows = await sampling;
  const rec = await ev(page, () => MENU_DEV.entry.stats.exits.at(-1));
  return { rows, rec };
}

/** Nominal durations are exact (the black layer's animation effect, sampled every frame); headless wall-clock times are reported
 *  and bounded loosely: SwiftShader draws nine globes on the main thread, so `finished` can resolve a few frames after the
 *  compositor has reached the target. */
function timingCheck(id, a, rm, held) {
  const r = a.rec, fadeIn = r.revealedMs - r.liftMs, want = rm ? [80, 80] : [220, 250], slack = 700; // (wall clock: a hang guard only — SwiftShader can take 300 ms a frame while a sector fills in)
  check(J(a.durOut) === J([want[0]]) && J(a.durIn) === J([want[1]]) && r.blackMs <= want[0] + slack && fadeIn <= want[1] + slack,
    `${id} timings${rm ? " (reduced motion)" : ""}: fade to black ${a.durOut} ms and from black ${a.durIn} ms nominal (spec ${want[0]} / ${want[1]}); wall clock headless — black reached ${r.blackMs} ms after the click, held ${r.liftMs - r.blackMs} ms (${held}), lifted in ${fadeIn} ms, revealed at ${r.revealedMs} ms`,
    J({ durOut: a.durOut, durIn: a.durIn, blackMs: r.blackMs, swappedMs: r.swappedMs, liftMs: r.liftMs, revealedMs: r.revealedMs }));
}

function beginChecks(tag, a, { rm = false, slowMs = 0 } = {}) {
  const r = a.rec, fadeIn = r.revealedMs - r.liftMs;
  check(a.both === 0 && a.neither === 0 && a.swapAtBlack && a.preOnlyFrom && a.postOnlyTo && a.blackFramesAfterSwap >= 1,
    tag("F1 menu → survey: the menu is first gone and the survey first displayed on fully black frames (opacity 1); every partly black frame shows exactly one screen (menu before, survey after); no frame shows both or neither; ≥ 1 black frame holds the new screen before the lift"),
    `swap frame ${J(a.swapRow)}; fade-out frames ${a.fadeOutFrames}, black frames after swap ${a.blackFramesAfterSwap}, fade-in frames ${a.fadeInFrames}`);
  check(a.noClouds && a.noTransform, tag("F2 a plain fade: no AtmosphereTransition overlay on any frame, no transform or clip-path on the screens or the black layer (no zoom, no wipe)"));
  timingCheck(tag("F3"), a, rm, "mount + first frames");
  const lb = a.lastBlackRow;
  check(lb && lb.dsVisible && lb.renders >= 1 && (!slowMs || r.swappedMs - r.blackMs >= slowMs - 50) && a.post.slice(0, a.blackFramesAfterSwap).every(x => x.black >= 0.999),
    tag(`F4 the black lifts only after the survey has drawn its globes (renderer frames ≥ 1 on the last black frame)${slowMs ? ` — with a ${slowMs} ms slow WebGL init injected, the screen stays black for it` : ""}`),
    `last black frame renders ${lb && lb.renders}; black → mounted ${r.swappedMs - r.blackMs} ms, mounted → lift ${r.liftMs - r.swappedMs} ms`);
}
function returnChecks(tag, a, before, { rm = false, slowMs = 0 } = {}) {
  const r = a.rec, fadeIn = r.revealedMs - r.liftMs, visible = a.post.filter(x => x.black < 0.999);
  check(a.both === 0 && a.neither === 0 && a.swapAtBlack && a.preOnlyFrom && a.postOnlyTo && a.blackFramesAfterSwap >= 1,
    tag("F5 survey → menu: the survey is first gone and the menu first displayed on fully black frames; every partly black frame shows exactly one screen; never both or neither"),
    `swap frame ${J(a.swapRow)}; fade-out ${a.fadeOutFrames}, black after swap ${a.blackFramesAfterSwap}, fade-in ${a.fadeInFrames}`);
  check(a.noClouds && a.noTransform, tag("F6 a plain fade back: no cloud overlay, no transform / clip-path"));
  timingCheck(tag("F7"), a, rm, "dispose + painting + first frames");
  const bg = visible.length ? visible[0].bg : null;
  check(visible.length && visible.every(x => x.bg === bg && x.artShown && x.artReady && x.artOp === 1 && x.plaque === 1) && bg === before.next && bg !== before.bg && (!slowMs || r.liftMs - r.swappedMs >= slowMs - 100),
    tag(`F8 the next painting (the preloaded one, never the one just shown) is swapped in while black: decoded, at full opacity, the plaque at rest (no entrance replay) on every frame the black is lifting${slowMs ? ` — with the painting held back ${slowMs} ms, the screen stays black until it is decoded` : ""}`),
    `painting ${before.bg + 1} → ${bg + 1} (planned ${before.next + 1}); visible frames ${visible.length}; swap → lift ${r.liftMs - r.swappedMs} ms`);
}

/** Repeated round trips in one page. */
async function cycles(browser, B, n, { q = "", viewport, reducedMotion = "no-preference", rm = false, label = "cycles", shots = false } = {}) {
  const tag = s => `${B} ${label}: ${s}`;
  const { ctx, page, log } = await openMenu(browser, `sector=${SECTOR}${q}`, { viewport, reducedMotion });
  await page.waitForFunction(() => MENU_DEV.entry.prefetch.progress.ready, null, { timeout: 120000 });
  const base = await ev(page, () => __snap());
  const per = [];
  let leakBad = [], identity = [];
  for (let c = 0; c < n; c++) {
    const early = c % 2 === 1;                                           // odd cycles: BEGIN as soon as one world is confirmed (honest fill-in)
    if (early) await page.waitForFunction(() => { const p = MENU_DEV.entry.prefetch.progress; return p.confirmed >= 1; }, null, { timeout: 60000 });
    else { await page.waitForFunction(() => MENU_DEV.entry.prefetch.progress.ready, null, { timeout: 120000 }); await ev(page, () => MENU_DEV.entry.prefetch.ready.then(s => { window.__preSector = s; })); await page.waitForFunction(() => window.__preSector); }
    const pre = await ev(page, () => { const E = MENU_DEV.entry, e = E.prefetch.first.entry; window.__preEntry = e; return { progress: E.prefetch.progress, gen: __gen.calls, gl: __LEAK.glCreated }; });
    const b = await begin(page, { dbl: c === 0 });
    const ab = analyse(b.rows, "menu", "survey", b.rec); timelines[tag(`cycle ${c + 1} begin${early ? " (early)" : ""}`)] = tl(b.rows);
    beginChecks(s => tag(`cycle ${c + 1}${early ? " early" : ""} ${s}`), ab, { rm });
    const id = await ev(page, () => { const E = MENU_DEV.entry, S = E.survey;
      return { begins: E.stats.begins, surveys: document.querySelectorAll(".ds").length, adopted: S.stats.adopted, gl: __LEAK.glCreated, liveGL: __LEAK.liveGL(), views: S.host.views.length,
        fromPrefetch: S.cells.filter(Boolean).every(c => __preEntry.shown.flat().includes(c) || __preEntry.cols.some(col => col && col.cells.includes(c)) || (window.__preSector && __preSector.cells.includes(c))) }; });
    await page.waitForFunction(() => MENU_DEV.entry.survey && MENU_DEV.entry.survey.state === "survey", null, { timeout: 120000 });
    const ready = await ev(page, () => { const S = MENU_DEV.entry.survey, D = window.__preSector, cells = S.cells.filter(Boolean);
      return { n: cells.length, inSector: cells.every(c => S.sector.cells.includes(c)), fromPre: D && !D.__used ? cells.every(c => D.cells.includes(c)) && D.cells.every(c => cells.includes(c)) : null, gen: __gen.calls,
        validated: cells.every(c => c.authored || (c.planet.archetype && c.planet.archetype.winnabilityChecked && c.planet.archetype.validatedLayers.join() === "1,2,3,4,5,6,7,8")) }; });
    identity.push({ c: c + 1, early, confirmedAtClick: pre.progress.confirmed, adopted: id.adopted, ...ready });
    check(id.surveys === 1 && id.gl === pre.gl + 1 && id.liveGL === 1 && id.views === 9 && id.fromPrefetch && ready.n === 9 && ready.inSector && ready.validated && ready.gen === 0 && (early || (ready.fromPre && id.adopted && id.adopted.ready)) && (c || id.begins === 1),
      tag(`cycle ${c + 1} F9 prefetch + identity: one survey${c ? "" : " (a double click entered once)"}, exactly one new WebGL context (nine views), the survey's worlds ARE the prefetched objects${early ? " (adopted half-built, the rest filled in)" : " (sector adopted complete)"}, all validated (layers 1–8), no main-thread generation`),
      J({ confirmedAtClick: pre.progress.confirmed, adopted: id.adopted, gl: `${pre.gl}→${id.gl}`, ...ready }));
    await ev(page, () => { if (window.__preSector) window.__preSector.__used = true; window.__preSector = null; });
    const before = await ev(page, () => { const m = MENU_DEV.entry.menu; window.__surveyWorkers = [...__workers.live]; return { bg: m.background.index, next: m.next.index }; });
    const r = await back(page);
    const ar = analyse(r.rows, "survey", "menu", r.rec); timelines[tag(`cycle ${c + 1} return`)] = tl(r.rows);
    returnChecks(s => tag(`cycle ${c + 1} ${s}`), ar, before, { rm });
    await page.waitForTimeout(200);
    const s = await ev(page, () => ({ ...__snap(), surveyWorkersLeft: __surveyWorkers.filter(w => __workers.live.has(w)).length, active: document.activeElement && document.activeElement.dataset.act, prefetchSeed: MENU_DEV.entry.prefetch && MENU_DEV.entry.prefetch.first.seed }));
    const ok = s.listeners === base.listeners && s.observers === base.observers && s.keyCapture === 0 && s.liveGL === 0 && s.glCreated === c + 1 && s.workersLive === s.poolWorkers && s.surveyWorkersLeft === 0 && s.dsNodes === 0
      && s.atx === 0 && s.black === "none" && s.blackAnims === 0 && s.rootChildren === base.rootChildren && !s.inert[0] && !s.inert[1] && s.state === "menu" && s.active === "begin" && s.prefetchSeed != null;
    if (!ok) leakBad.push({ c: c + 1, s });
    per.push({ c: c + 1, early, listeners: s.listeners, observers: s.observers, liveGL: s.liveGL, glCreated: s.glCreated, workersLive: s.workersLive, poolWorkers: s.poolWorkers, created: s.workersCreated, anims: s.anims });
    perf[tag(`cycle ${c + 1}`)] = { begin: b.rec, return: r.rec, beginFrames: stats(b.rows.slice(1).map(x => x.dt)), returnFrames: stats(r.rows.slice(1).map(x => x.dt)) };
  }
  check(!leakBad.length, tag(`F10 ${n} round trips — after every return: listeners / observers at the pre-survey baseline (${base.listeners} / ${base.observers}), no key capture, 0 live WebGL contexts (exactly one created per visit), the survey's workers all terminated (only the fresh prefetch's are live), no survey DOM, no overlay, black layer display: none with no animation left, nothing inert, focus on BEGIN, a fresh prefetch running`),
    leakBad.length ? J(leakBad).slice(0, 600) : J(per));
  info(tag("identity per cycle"), identity);
  const issues = consoleIssues(log, B), devErr = await ev(page, () => MENU_DEV.errors);
  check(!issues.length && !devErr.length, tag("F11 no console errors / warnings, no uncaught errors across all round trips") + (PREEXISTING.has(B) ? " (Firefox's \"WebGL context was lost.\" on each dispose is the unmodified renderer's own message, F0)" : ""), J([...issues, ...devErr]).slice(0, 300));
  await ctx.close();
}

/** Slow preparation, both ways: the black holds. */
async function slow(browser, B) {
  const tag = s => `${B} slow: ${s}`;
  const { ctx, page, log } = await openMenu(browser, `sector=${SECTOR}&bg=3`);
  await page.waitForFunction(() => MENU_DEV.entry.prefetch.progress.ready, null, { timeout: 120000 });
  await ev(page, () => { window.__slowGL = 700; });
  const b = await begin(page); const ab = analyse(b.rows, "menu", "survey", b.rec); timelines[tag("begin, slow WebGL init 700 ms")] = tl(b.rows);
  beginChecks(tag, ab, { slowMs: 700 });
  await page.waitForFunction(() => MENU_DEV.entry.survey.state === "survey", null, { timeout: 120000 });
  // the next painting has not arrived: pick one never requested and hold its response 1200 ms
  const plan = await ev(page, () => { const m = MENU_DEV.entry.menu, used = new Set([m.background.index, m.next.index]); let k = 0; while (used.has(k)) k++; return { bg: m.background.index, next: k }; });
  const file = `menu-${String(plan.next + 1).padStart(2, "0")}.jpg`;
  await page.route(`**/backgrounds/${file}`, async route => { await new Promise(r => setTimeout(r, 1200)); await route.continue(); });
  await ev(page, k => { const m = MENU_DEV.entry.menu; m.next = { index: k, src: m._url(k) }; }, plan.next);
  const r = await back(page); const ar = analyse(r.rows, "survey", "menu", r.rec); timelines[tag(`return, painting held 1200 ms`)] = tl(r.rows);
  returnChecks(tag, ar, plan, { slowMs: 1200 });
  const issues = consoleIssues(log, B); check(!issues.length, tag("F12 no console errors / warnings with slow preparation"), J(issues).slice(0, 300));
  await ctx.close();
}

async function reduced(browser, B) {
  for (const [label, q, mode] of [["reduced (forced ?rm=1)", "&rm=1", "no-preference"], ["reduced (system)", "", "reduce"]]) {
    const tag = s => `${B} ${label}: ${s}`;
    const { ctx, page, log } = await openMenu(browser, `sector=${SECTOR}${q}`, { reducedMotion: mode });
    await page.waitForFunction(() => MENU_DEV.entry.prefetch.progress.ready, null, { timeout: 120000 });
    const b = await begin(page); beginChecks(tag, analyse(b.rows, "menu", "survey", b.rec), { rm: true }); timelines[tag("begin")] = tl(b.rows);
    const srm = await ev(page, () => MENU_DEV.entry.survey.reducedMotion);
    await page.waitForFunction(() => MENU_DEV.entry.survey.state === "survey", null, { timeout: 120000 });
    const before = await ev(page, () => ({ bg: MENU_DEV.entry.menu.background.index, next: MENU_DEV.entry.menu.next.index }));
    const r = await back(page); returnChecks(tag, analyse(r.rows, "survey", "menu", r.rec), before, { rm: true }); timelines[tag("return")] = tl(r.rows);
    check(b.rec.reducedMotion === (q ? true : null) && srm === true && J(analyse(b.rows, "menu", "survey", b.rec).durOut) === "[80]" && b.rec.revealedMs < 700, tag(`RM ${q ? "forced" : "the OS setting (entry value null = follow the OS)"}: the fade takes its 80 ms path and the survey its reduced path`), `revealed ${b.rec.revealedMs} ms, return ${r.rec.revealedMs} ms`);
    perf[tag("timing")] = { begin: b.rec, return: r.rec };
    const issues = consoleIssues(log, B); check(!issues.length, tag("no console errors / warnings"), J(issues).slice(0, 300));
    await ctx.close();
  }
}

/** The survey's dramatic departure from a menu-entered survey: still the AtmosphereTransition DRAMATIC preset; the black layer stays out of it. */
async function descent(browser, B) {
  const tag = s => `${B} descent: ${s}`;
  const { ctx, page, log } = await openMenu(browser, `sector=${SECTOR}&seed=7`);
  await page.waitForFunction(() => MENU_DEV.entry.prefetch.progress.ready, null, { timeout: 120000 });
  await begin(page); await page.waitForFunction(() => MENU_DEV.entry.survey.state === "survey", null, { timeout: 120000 });
  // one return + re-entry first, so the departure runs on a survey entered after a full round trip
  await back(page); await page.waitForFunction(() => MENU_DEV.entry.prefetch.progress.confirmed >= 1, null, { timeout: 60000 });
  await begin(page); await page.waitForFunction(() => MENU_DEV.entry.survey.state === "survey", null, { timeout: 120000 });
  await ev(page, () => MENU_DEV.entry.survey.select(4)); await page.waitForFunction(() => MENU_DEV.entry.survey.state === "focus", null, { timeout: 10000 });
  const r = await ev(page, () => new Promise(res => { const E = MENU_DEV.entry, S = E.survey, planet = S.cells[4].planet, rows = []; let seen = new Set();
    const f = () => { const ov = document.querySelector(".atx"); if (ov) seen.add(ov.className); rows.push({ black: getComputedStyle(E.black).display, atx: ov ? ov.dataset.atxPhase : null });
      if (MENU_DEV.results.length) res({ classes: [...seen], blackShown: rows.filter(x => x.black !== "none").length, frames: rows.length, covered: rows.filter(x => x.atx === "covered").length,
        handoffs: MENU_DEV.handoffs.length, same: MENU_DEV.handoffs[0] && MENU_DEV.handoffs[0].planet === planet, concealed: MENU_DEV.handoffs[0] && MENU_DEV.handoffs[0].concealed, result: MENU_DEV.results[0], state: E.state, liveGL: __LEAK.liveGL() });
      else requestAnimationFrame(f); };
    requestAnimationFrame(f); S.beginExpedition(); }));
  check(r.classes.some(c => /atx-descent/.test(c)) && !r.classes.some(c => /atx-sweep/.test(c)) && r.covered > 0 && r.blackShown === 0 && r.handoffs === 1 && r.same && r.result && r.result.ok && r.state === "departed" && r.liveGL === 0,
    tag("D1 focused planet → gameplay is unchanged: the AtmosphereTransition DRAMATIC preset (atx-descent) covers, the handoff gets the very planet object the survey showed, the survey is disposed under the clouds; the menu's black layer never appears"), J(r));
  const issues = consoleIssues(log, B); check(!issues.length, tag("no console errors / warnings"), J(issues).slice(0, 300));
  await ctx.close();
}

/** Evidence stills: each fade paused at its midpoint (a separate, unmeasured run). */
async function stills(browser) {
  const { ctx, page } = await openMenu(browser, `sector=${SECTOR}&bg=4`, { viewport: { width: 1440, height: 900 } });
  await page.waitForFunction(() => MENU_DEV.entry.prefetch.progress.ready, null, { timeout: 120000 }); await page.waitForTimeout(1200);
  const pauseAt = (pred) => ev(page, p => new Promise(res => { const E = MENU_DEV.entry, f = () => { const a = E.black.getAnimations()[0], cs = getComputedStyle(E.black);
    const st = { state: E.state, menuOn: E.menuHost.style.display !== "none", ds: !!document.querySelector(".ds") && !E.surveyHost.hidden };
    if (a && new Function("s", "o", "return " + p)(st, +cs.opacity)) { a.pause(); res({ ...st, black: +cs.opacity }); } else requestAnimationFrame(f); }; requestAnimationFrame(f); }), pred.toString());
  const resume = () => ev(page, () => { for (const a of MENU_DEV.entry.black.getAnimations()) a.play(); });
  const shot = async (file, p) => { const s = await p; fs.writeFileSync(path.join(OUT, file), await page.screenshot()); await resume(); return s; };
  const s = {};
  s.a = shot("01-menu-fading-to-black.png", pauseAt("s.menuOn && o > 0.45 && o < 0.75")); await page.click('[data-act="begin"]'); await s.a;
  s.b = shot("02-survey-fading-in.png", pauseAt("s.ds && o > 0.3 && o < 0.6")); await s.b;
  await page.waitForFunction(() => MENU_DEV.entry.state === "survey" && MENU_DEV.entry.survey.state === "survey", null, { timeout: 120000 }); await page.waitForTimeout(600);
  s.c = shot("03-survey-fading-to-black.png", pauseAt("s.ds && o > 0.45 && o < 0.75")); await page.click('[data-act="exit"]'); await s.c;
  s.d = shot("04-menu-fading-in-next-painting.png", pauseAt("s.menuOn && o > 0.3 && o < 0.6")); await s.d;
  await page.waitForFunction(() => MENU_DEV.entry.state === "menu"); await page.waitForTimeout(300);
  fs.writeFileSync(path.join(OUT, "05-menu-after-return.png"), await page.screenshot());
  info("evidence stills (each fade paused near its midpoint)", { a: await s.a, b: await s.b, c: await s.c, d: await s.d });
  await ctx.close();
}

// ---------------------------------------------------------------- main
(async () => {
  partN();
  const pw = require("playwright");
  const server = spawn("python3", ["-m", "http.server", String(PORT), "--bind", "127.0.0.1"], { cwd: ROOT, stdio: "ignore" });
  check(await waitHttp(MENU, 8000), "B0 `python3 -m http.server` from the repository root serves the menu page", MENU);
  try {
    if (argv.includes("--gpu-only")) { const g = await pw.chromium.launch({ args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] }); await cycles(g, "gpu", 4, { label: "GPU (Metal) cycles" }); await g.close(); throw Object.assign(new Error("gpu-only"), { gpuOnly: true }); }
    const chromium = await pw.chromium.launch();
    console.log("\n— Chromium: 6 round trips"); await cycles(chromium, "chromium", 6, {});
    console.log("\n— Chromium: 4 round trips at 390 × 844"); await cycles(chromium, "chromium", 4, { viewport: { width: 390, height: 844 }, label: "phone cycles" });
    console.log("\n— Chromium: slow preparation"); await slow(chromium, "chromium");
    console.log("\n— Chromium: reduced motion"); await reduced(chromium, "chromium");
    console.log("\n— Chromium: dramatic descent"); await descent(chromium, "chromium");
    if (SHOTS) { console.log("\n— evidence stills"); await stills(chromium); }
    await chromium.close();
    if (FIREFOX) { let ff = null; try { ff = await pw.firefox.launch(); } catch (err) { info("Firefox", "not available: " + err.message.split("\n")[0]); }
      if (ff) {
        { const ctx = await ff.newContext(); const page = await ctx.newPage(), warn = []; page.on("console", m => { if (m.type() === "warning") warn.push(m.text()); });
          await page.goto(`${SURVEY}?sector=${SECTOR}`); await page.waitForFunction(() => window.SURVEY_DEV && SURVEY_DEV.ready, null, { timeout: 120000 });
          await page.evaluate(() => SURVEY_DEV.survey.dispose()); await page.waitForTimeout(300);
          const lost = warn.filter(w => /WebGL context was lost\./.test(w)).length; if (lost) PREEXISTING.add("firefox");
          check(lost >= 1, "firefox F0 control: the accepted survey page's own dispose (unmodified renderer, forceContextLoss) already logs \"WebGL context was lost.\" — pre-existing, not new", `lost ${lost}`); await ctx.close(); }
        console.log("\n— Firefox: 6 round trips"); await cycles(ff, "firefox", 6, {});
        console.log("\n— Firefox: slow preparation"); await slow(ff, "firefox");
        console.log("\n— Firefox: reduced motion"); await reduced(ff, "firefox");
        console.log("\n— Firefox: dramatic descent"); await descent(ff, "firefox");
        await ff.close(); } }
    if (!argv.includes("--no-gpu")) { // real GPU (ANGLE / Metal): two round trips, report-only timings + frames
      try { const g = await pw.chromium.launch({ args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
        await cycles(g, "gpu", 2, { label: "GPU (Metal) cycles" }); await g.close(); } catch (err) { info("GPU sample", "unavailable: " + err.message.split("\n")[0]); } }
  } catch (err) { if (!err.gpuOnly) throw err; } finally { server.kill(); }
  fs.writeFileSync(path.join(OUT, "qa-results.json"), J({ date: new Date().toISOString(), head: git("rev-parse", "HEAD").trim(), pass: results.filter(r => !r.info && r.ok).length, fail: fails, results }, null, 1));
  fs.writeFileSync(path.join(OUT, "perf.json"), JSON.stringify(perf, null, 1));
  fs.writeFileSync(path.join(OUT, "timelines.json"), J({ legend: ["ms", "entry state", "black opacity", "menu (painting, plaque opacity)", "survey (state:cells renderer-frames)", "cloud overlay", "live WebGL", "live workers"], timelines }));
  console.log(fails ? `\n${fails} check(s) FAILED` : `\nALL CHECKS PASS (${results.filter(r => !r.info).length})`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
