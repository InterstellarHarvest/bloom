// BLOOM — CHALLENGES foundation + first playable hub (BLOOM-036A). docs/CHALLENGES_SYSTEM_v1.md.
//
//   NODE_PATH="$(npm root -g)" node tools/challenges-check.js [--browsers chromium,firefox] [--evidence] [--node-only]
//
// NODE (the data layer — content/challenges.js + resources/bloom-challenges.js + the survey's scenario layer):
//   C1 exactly three released Challenges (Dying World · Native Competition · Volatile Climate), in that order
//   C2 each references a real, non-default scenario with mechanics; scenarioOf() is the catalogue's own object
//   C3 no duplicated scenario mechanics: no mechanics key anywhere in a definition; copy is a reference to the scenario's own player-facing
//      copy or the Challenge's own text (never a verbatim copy); check() refuses mechanics, verbatim copy, the default scenario, unknown /
//      036B launch policies, Challenge-specific completion conditions and difficulty words
//   C4 validated and frozen: resolve() is deep-frozen and identical per id; an unknown id throws UNKNOWN_CHALLENGE
//   C5 the 036A schema: launch { species player-choice · world destination-survey · startingState none · seed sector }, completion bloom / []
//   C6 the survey's scenario layer: a Challenge sector of the same seed reuses the Expedition's physical planet OBJECTS (one world system), every
//      offered world passed layer P with the species, a world that fails is only not offered, validation never changes a planet; the
//      Expedition sector carries no scenario provenance
//   C20 no difficulty-ranking language in any Challenge copy
// BROWSER (Chromium AND Firefox; "/" = the repository, "/bloom/" = the Pages site, file:// offline):
//   M · the main menu: EXPEDITION · CHALLENGES · TRAINING · SETTINGS · CREDITS, CHALLENGES a real chunky icon + word button (the shared
//       challenge glyph), never disabled, no "coming soon"
//   H · the hub at 390 × 844, 1024 × 768, 1440 × 900, 2560 × 1440: three cards (icon + name + line), the dossier, BEGIN CHALLENGE visible
//       (the phone: pinned in the sheet), no horizontal overflow, contrast, no ranking words
//   K · keyboard: ↓ to CHALLENGES, Enter → hub, the radiogroup (↓ ↑ Home End), visible focus, Enter / Space opens the dossier, Escape
//       closes it, Escape again → the title; R · reduced motion: nothing animates on the hub
//   F · each Challenge: hub → BEGIN CHALLENGE → Choose Plant Species (all four, the kicker names the Challenge) → its Survey (every world
//       proven under the scenario, the title kicker names the Challenge, "Begin challenge") → the run plays EXACTLY that Challenge / scenario /
//       species / planet (object identity) → the HUD names the Challenge, the scenario's own status card runs → the report names it
//   E · the specimen environment reads the real region sky: Dying World's drift dries / cools the scene; a real Volatile Climate shock (bought
//       Terraform, no injected shock) moves the scene by the shock's offset; Native Competition adds nothing but the region's own data
//   I · invariants: Play Again (same Challenge, scenario, species, planet objects; a fresh sim) · Choose Another Planet (that Challenge's
//       survey, same species) · Change Species (same Challenge, same sector seed, same pool; re-evaluated) · Back from species → the hub ·
//       Main Menu clears the Challenge · EXPEDITION = default scenario, no residue · TRAINING = Organic Hybrid, no scenario · the survey's
//       Main menu and the hub's Main menu clear it · the run refuses a tampered detail (wrong scenario, unproven, residue, a foreign object)
//   D · one document: no navigation, the address never changes, nothing in localStorage / sessionStorage / window.name about a Challenge
//   P · file:// offline · B · /bloom/ — a complete Challenge launch, no request outside the site
// --evidence writes docs/evidence/bloom-036a/ stills. Exits 1 on any failure.
"use strict";
const path = require("path"), fs = require("fs"), http = require("http"), os = require("os");
const ROOT = path.resolve(__dirname, "..");
const argv = process.argv, argOf = k => { const i = argv.indexOf(k); return i > 0 ? argv[i + 1] : null; };
const BROWSERS = (argOf("--browsers") || "chromium,firefox").split(","), EVIDENCE = argv.includes("--evidence"), NODE_ONLY = argv.includes("--node-only");
const EVD = path.join(ROOT, "docs/evidence/bloom-036a");
let fails = 0, passes = 0; const t0 = Date.now();
const check = (ok, name, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); if (ok) passes++; else fails++; return ok; };
const info = (name, detail) => console.log(`INFO  ${name}  — ${detail}`);
const J = JSON.stringify;
const IDS = ["dying_world", "native_competition", "volatile_climate"], NAMES = ["Dying World", "Native Competition", "Volatile Climate"];
const MENU = ["Expedition", "Challenges", "Training", "Settings", "Credits"];
const VIEWPORTS = [[390, 844], [1024, 768], [1440, 900], [2560, 1440]];
// no difficulty ranking (the hub, the Challenge's species screen / survey / run / report)
const RANKING = /\b(easy|easier|easiest|medium|hard|harder|hardest|difficulty|difficult|beginner|expert|novice|veteran|stars?|rating|score|recommended|skill|tier|coming soon)\b/i;
// which species each Challenge flow brings (every species stays open; these keep the survey's layer-P work short)
const FLOW = { dying_world: "woolly_candle", native_competition: "woolly_candle", volatile_climate: "cinder_rosette" };

for (const f of ["content/config.js", "content/traits.js", "content/species.js", "planets/first_bloom.js", "content/archetypes.js", "content/scenarios.js", "content/challenges.js", "content/play.js",
  "resources/bloom-sim.js", "resources/bloom-species.js", "resources/bloom-gen.js", "resources/bloom-validate.js", "resources/bloom-witness.js", "resources/bloom-archetype.js",
  "resources/bloom-scenario.js", "resources/bloom-play.js", "resources/bloom-challenges.js"]) require(path.join(ROOT, f));
const { BLOOM, BLOOM_DATA: D } = globalThis;

(async () => {
  console.log("# C · the Challenge data layer (Node)");
  const C = BLOOM.challenges, list = C.list(), scenarios = D.scenarios;
  // C1
  check(J(list.map(c => c.id)) === J(IDS) && J(list.map(c => c.name)) === J(NAMES) && J(C.ids()) === J(IDS) && D.challenges.length === 3 && list.every(c => c.status === "released"),
    "C1 · exactly three released Challenges, in content order (not a ranking): Dying World · Native Competition · Volatile Climate", J(list.map(c => c.id)));
  // C2
  { const rows = list.map(c => { const S = C.scenarioOf(c); return { id: c.id, scenario: c.scenario, same: S === scenarios.find(s => s.id === c.scenario), dynamic: BLOOM.pressure.isDynamic(S), isDefault: S.id === BLOOM.pressure.DEFAULT_SCENARIO }; });
    check(rows.every(r => r.same && r.dynamic && !r.isDefault) && J(rows.map(r => r.scenario)) === J(["dying_world", "native_competition", "volatile_climate"]),
      "C2 · each Challenge references a REAL non-default scenario with mechanics (pressure · competition · climate instability); BLOOM.challenges.scenarioOf() returns the catalogue's own scenario object (nothing copied)", J(rows)); }
  // C3
  { const src = fs.readFileSync(path.join(ROOT, "content/challenges.js"), "utf8").replace(/\/\/.*$/gm, "");
    const keyHits = C.MECHANICS_KEYS.filter(k => new RegExp(`\\b${k}\\s*:`).test(src));
    const numbers = /\b\d+(\.\d+)?\b/.test(src.replace(/version: \d+/g, "").replace(/\b0x[0-9a-f]+\b/gi, ""));
    const ownCopy = s => { const out = []; const w = v => { if (typeof v === "string") out.push(v); else if (v && typeof v === "object") Object.values(v).forEach(w); }; w(s.display); return out; };
    const verbatim = list.flatMap(c => { const own = ownCopy(C.scenarioOf(c)), d = D.challenges.find(x => x.id === c.id);
      return [d.short, ...Object.values(d.presentation)].filter(v => typeof v === "string" && !v.startsWith("@scenario.") && own.includes(v)).map(v => `${c.id}: ${v.slice(0, 30)}`); });
    const refs = list.map(c => c.sources), d0 = D.challenges[0], S = scenarios;
    const refuse = {
      mechanics: C.check([{ ...d0, launch: { ...d0.launch }, pressure: { graceSeconds: 1 } }], S),
      nestedMechanics: C.check([{ ...d0, presentation: { ...d0.presentation, channels: { moisture: "x" } } }], S),
      verbatim: C.check([{ ...d0, short: "The atmosphere is thinning." }], S),
      defaultScenario: C.check([{ ...d0, scenario: "default" }], S),
      unknownScenario: C.check([{ ...d0, scenario: "meteor_rain" }], S),
      prescribedSpecies: C.check([{ ...d0, launch: { ...d0.launch, species: "prescribed" } }], S),
      authoredWorld: C.check([{ ...d0, launch: { ...d0.launch, world: "authored" } }], S),
      startingAdaptations: C.check([{ ...d0, launch: { ...d0.launch, startingState: "owned-adaptations" } }], S),
      bonusBiomass: C.check([{ ...d0, launch: { ...d0.launch, biomass: 200 } }], S),
      conditions: C.check([{ ...d0, completion: { win: "bloom", conditions: [{ coverage: 0.8 }] } }], S),
      winThreshold: C.check([{ ...d0, completion: { win: "coverage-80" , conditions: [] } }], S),
      difficulty: C.check([{ ...d0, name: "Dying World (Hard)" }], S),
      stars: C.check([{ ...d0, presentation: { ...d0.presentation, tagline: "Three stars for a fast bloom." } }], S),
      badRef: C.check([{ ...d0, presentation: { ...d0.presentation, briefing: "@scenario.intent" } }], S),
    };
    const allRefused = Object.values(refuse).every(e => e.length > 0);
    check(!keyHits.length && !numbers && !verbatim.length && allRefused && refs.every(r => /^scenario\.display\./.test(r.short) && /^scenario\.display\./.test(r.tagline) && /^scenario\.display\./.test(r.briefing) && /^scenario\.display\./.test(r.strategicIdea)),
      "C3 · no duplicated scenario mechanics: content/challenges.js carries no mechanics key and no number but versions; every copy field is a reference to the scenario's own player-facing copy (\"@scenario.display.*\") or the Challenge's own text, never a verbatim copy; check() refuses a mechanics key at any depth, verbatim scenario copy, the default / an unknown scenario, the 036B launch policies (prescribed species, authored world, starting adaptations, bonus Biomass), completion conditions / another win, difficulty words and a non-player-facing reference",
      `${keyHits.length ? "keys " + keyHits : ""}${numbers ? " numbers" : ""}${verbatim.length ? " verbatim " + verbatim : ""} refused: ${Object.entries(refuse).map(([k, e]) => `${k}${e.length ? "✓" : "✗"}`).join(" ")}`); }
  // C4
  { const a = C.resolve("dying_world"), b = C.resolve("dying_world"); let unknown = null, mutated = false;
    try { C.resolve("ice_age"); } catch (e) { unknown = e.code; }
    try { a.presentation.icon = "x"; } catch (e) { /* strict mode */ } try { a.launch.species = "prescribed"; } catch (e) { /* frozen */ }
    mutated = a.presentation.icon !== "pressure" || a.launch.species !== "player-choice";
    const deep = o => Object.isFrozen(o) && Object.values(o).every(v => !v || typeof v !== "object" || deep(v));
    check(a === b && deep(a) && !mutated && unknown === "UNKNOWN_CHALLENGE" && list.every(deep) && C.check(D.challenges, scenarios).length === 0,
      "C4 · validated and frozen: the catalogue passes check(); resolve() returns ONE deep-frozen object per id (a write changes nothing); an unknown id throws UNKNOWN_CHALLENGE (never a silent Expedition)", `unknown → ${unknown}`); }
  // C5
  check(list.every(c => J(c.launch) === J({ species: "player-choice", world: "destination-survey", startingState: "none", seed: "sector" }) && c.completion.win === "bloom" && c.completion.conditions.length === 0
      && c.schema === C.SCHEMA_VERSION && Number.isInteger(c.version) && C.ICONS.includes(c.presentation.icon) && c.presentation.tagline && c.presentation.briefing && c.presentation.strategicIdea)
    && J(list.map(c => c.presentation.icon)) === J(["pressure", "competition", "climate"]) && !!list[0].presentation.sciencePoints && !!list[2].presentation.science,
    "C5 · the 036A schema: id · version · status · name · short · scenario · presentation { tagline, briefing, strategicIdea, icon (the gameplay scenario glyph), science } · launch { species player-choice, world destination-survey, startingState none, seed sector } · completion { win bloom, conditions [] }",
    list.map(c => `${c.id}: ${c.presentation.icon}`).join(" · "));
  // C20
  { const words = list.map(c => [c.name, c.short, ...Object.values(c.presentation).flat()].filter(v => typeof v === "string").join(" ")).join(" "), hit = words.match(RANKING);
    check(!hit, "C20 · no difficulty-ranking language in any Challenge copy (no Easy / Medium / Hard, stars, scores, recommended skill)", hit ? `"${hit[0]}"` : "clean"); }
  // C6 — the survey's scenario layer (one world system)
  { const S = await import("file://" + path.join(ROOT, "resources/destination-survey/survey-data.js"));
    const cache = S.createSurveyCache(), sp = S.speciesFor("woolly_candle"), t1 = Date.now();
    const base = S.buildSector(77, undefined, { species: sp, cache }), fps = new Map(base.cells.filter(Boolean).map(c => [c.physicalKey, S.planetFingerprint(c.planet)]));
    const tb = Date.now() - t1, t2 = Date.now();
    const ch = S.buildSector(77, undefined, { species: sp, cache, scenario: "dying_world" }), tc = Date.now() - t2;
    const cells = ch.cells.filter(Boolean), shared = cells.filter(c => base.cells.some(b => b && b.physicalKey === c.physicalKey && b.planet === c.planet)).length;
    const unchanged = [...cache.physical.values()].filter(Boolean).every(P => !fps.has(P.physicalKey) || S.planetFingerprint(P.planet) === fps.get(P.physicalKey));
    const rejected = ch.columns.reduce((a, c) => a + (c.scenarioRejected || 0), 0);
    let unknownScn = null; try { S.scenarioFor("ice_age"); } catch (e) { unknownScn = e.message; }
    check(cells.length === 9 && cells.every(c => c.playable && c.scenarioId === "dying_world" && c.scenarioValidation && c.scenarioValidation.ok && c.scenarioValidation.status === "PASS" && c.species.id === "woolly_candle")
        && shared >= 6 && unchanged && base.cells.every(c => !c || (c.scenarioId === undefined && c.scenarioValidation === undefined)) && ch.scenario === "dying_world" && !base.scenario
        && S.sectorKey(77, sp, false, "dying_world") !== S.sectorKey(77, sp, false) && S.scenarioFor("default") === null && S.scenarioFor(null) === null && !!unknownScn,
      "C6 · the survey's scenario layer is ONE world system: a Challenge sector of the same seed reuses the Expedition sector's physical planet OBJECTS (the physical cache), every offered world passed layer P (BLOOM.validateScenario with the species) — a failing world is only not offered (scenarioRejected) — no planet is changed by validation, the sector key carries the scenario, the default / null is no scenario, an unknown scenario throws; the Expedition sector carries no scenario provenance",
      `Expedition ${tb} ms · Dying World ${tc} ms · ${shared}/9 shared planet objects · scenarioRejected ${rejected} · cache ${J(cache.stats)}`); }

  if (NODE_ONLY) return done();
  await browserChecks();
  done();
})().catch(e => { console.error(e); check(false, "uncaught", e.stack || String(e)); done(); });

function done() { console.log(`\n${fails ? "FAIL" : "OK"} — challenges-check: ${passes} passed, ${fails} failed (${Math.round((Date.now() - t0) / 1000)} s)`); process.exit(fails ? 1 : 0); }

async function browserChecks() {
  let pw; try { pw = require("playwright"); } catch (e) { check(false, "playwright", "not installed: NODE_PATH=\"$(npm root -g)\""); return; }
  const { buildSite } = await import("file://" + path.join(ROOT, "tools/build-pages-site.mjs"));
  const SITE_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "bloom036a-site-")); buildSite(ROOT, SITE_DIR);
  const { ICONS } = await import("file://" + path.join(ROOT, "resources/ui/bloom-icons.js"));
  const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml" };
  const srv = http.createServer((req, res) => {
    const u = new URL(req.url, "http://x"); let base = ROOT, p = decodeURIComponent(u.pathname);
    if (p.startsWith("/bloom/")) { base = SITE_DIR; p = p.slice("/bloom".length); }
    if (p.endsWith("/")) p += "index.html";
    const f = path.join(base, p); if (!f.startsWith(base) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end("not found"); }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream", "Cache-Control": "no-store" }); fs.createReadStream(f).pipe(res);
  });
  await new Promise(r => srv.listen(0, "127.0.0.1", r)); const ORIGIN = `http://127.0.0.1:${srv.address().port}`;
  const FILE_INDEX = "file://" + encodeURI(path.join(ROOT, "index.html"));
  if (EVIDENCE) fs.mkdirSync(EVD, { recursive: true });

  for (const bn of BROWSERS) {
    const browser = await pw[bn].launch(); console.log(`\n# ${bn} ${browser.version()}`);
    // (stills only) wait for the screen's own entrance / fade animations to finish, so a still never catches a half-faded frame
    const settled = p => p.evaluate(() => Promise.race([Promise.all(document.getAnimations().filter(a => a.playState === "running" && isFinite(a.effect && a.effect.getComputedTiming().endTime)).map(a => a.finished.catch(() => {}))), new Promise(r => setTimeout(r, 4000))]));
    const shot = async (p, name, opts = {}) => { if (EVIDENCE && (bn === "chromium" || opts.firefox)) { await settled(p); await p.waitForTimeout(opts.wait || 250); await p.screenshot({ path: path.join(EVD, (bn === "firefox" ? "firefox-" : "") + name) }); } };
    const context = async ({ width = 1440, height = 900, reducedMotion = null, offline = false } = {}) => {
      const c = await browser.newContext({ viewport: { width, height }, ...(reducedMotion ? { reducedMotion } : {}) });
      if (offline) await c.setOffline(true);
      await c.addInitScript(() => { try { localStorage.setItem("strange-bloom.training", '{"v":1,"status":"completed","at":1}'); } catch (e) { /* none */ } });
      return c; };
    const page = async c => { const p = await c.newPage(); p.errs = []; p.reqs = []; p.navs = 0;
      p.on("pageerror", e => p.errs.push("pageerror: " + e.message)); p.on("console", m => { if (m.type() === "error") p.errs.push("console: " + m.text()); });
      p.on("request", r => p.reqs.push(r.url())); p.on("framenavigated", f => { if (f === p.mainFrame()) p.navs++; }); p.on("dialog", d => d.accept()); return p; };
    const lifted = "MENU_DEV.entry.black.style.display === 'none'";
    const menuReady = p => p.waitForFunction(() => window.MENU_DEV && MENU_DEV.ready && MENU_DEV.entry.state === "menu" && MENU_DEV.entry.black.style.display === "none", null, { timeout: 60000, polling: 100 });
    const hubReady = p => p.waitForFunction(() => { const e = MENU_DEV.entry, v = e.challengeView; return e.state === "challenges" && v && v.inner && e.black.style.display === "none"; }, null, { timeout: 60000, polling: 50 });
    const speciesReady = p => p.waitForFunction(() => { const e = MENU_DEV.entry, v = e.speciesView; return e.state === "species" && v && v.inner && e.black.style.display === "none"; }, null, { timeout: 60000, polling: 50 });
    const surveyReady = p => p.waitForFunction(() => { const s = MENU_DEV.entry.survey; return s && s.state === "survey" && s.cells.every(Boolean) && MENU_DEV.entry.black.style.display === "none"; }, null, { timeout: 420000, polling: 200 });
    const runReady = (p, n) => p.waitForFunction(n => window.BLOOM_APP && BLOOM_APP.session && BLOOM_APP.stats.sessions.length >= n && BLOOM_APP.stats.sessions[n - 1].readyMs !== null && !BLOOM_APP.busy
      && !document.querySelector(".atx") && MENU_DEV.entry.state === "away" && MENU_DEV.entry.black.style.display === "none", n, { timeout: 90000, polling: 50 });
    const reportOpen = p => p.waitForFunction(() => BLOOM.runReport.instance && BLOOM.runReport.instance.state().open && !BLOOM.runReport.instance.state().busy, null, { timeout: 20000, polling: 30 });
    const HUB = "MENU_DEV.entry.challengeView.inner", SS = "MENU_DEV.entry.speciesView.inner";
    const openHub = async p => { await p.click('.mm-item[data-act="challenges"]'); await hubReady(p); };
    const beginChallenge = async (p, id) => { await p.evaluate(([id, H]) => eval(H).select(id), [id, HUB]); await p.click(".ch-btn.go"); await speciesReady(p); };
    const chooseSpecies = async (p, id) => { await p.evaluate(([id, SS]) => eval(SS).open(id), [id, SS]); await p.click(".ss-btn.go"); await surveyReady(p); };
    const pick = async (p, i) => { await p.evaluate(i => { const s = MENU_DEV.entry.survey, c = s.cells[i]; window.__pick = { planet: c.planet, species: s.species, challenge: s.challenge, fingerprint: c.fingerprint, key: c.key, seed: s.sectorSeed }; s.select(i); }, i);
      await p.waitForFunction(() => MENU_DEV.entry.survey.state === "focus", null, { timeout: 20000, polling: 50 }); };
    const depart = async (p, n) => { await p.click(".ds-btn.go"); await runReady(p, n); };
    const winNow = p => p.evaluate(() => { const s = BLOOM_API.sim; BLOOM_API.advance(40); s.won = true; s.onWin(s.coverage()); });
    const noOverflow = p => p.evaluate(() => { const d = document.documentElement, x = document.querySelector(".ch-scroll") || document.querySelector(".ss");
      return { doc: d.scrollWidth <= window.innerWidth + 1, inner: !x || x.scrollWidth <= x.clientWidth + 1 }; });
    const contrast = (p, sel) => p.evaluate(sel => { const el = document.querySelector(sel), cs = getComputedStyle(el);
      const lum = c => { const m = c.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]; };
      const a = lum(cs.color), b = lum(cs.backgroundColor); return +((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)).toFixed(2); }, sel);
    const runId = p => p.evaluate(() => { const S = BLOOM_APP.session, k = window.__pick, ch = S.run.challenge;
      return { planetSame: S.planet === k.planet, speciesSame: S.run.species === k.species, challengeSame: (ch || null) === (k.challenge || null), challengeCanon: !ch || ch === BLOOM.challenges.resolve(ch.id),
        scenario: S.run.scenario ? S.run.scenario.id : null, scenarioCanon: !S.run.scenario || S.run.scenario === BLOOM_DATA.scenarios.find(s => s.id === S.run.scenario.id),
        simScenario: S.sim.scenario ? S.sim.scenario.id : null, mech: S.adapter.run().mechanics, lost: !!S.sim.lost, simSpecies: S.sim.species && S.sim.species.id, challenge: ch ? ch.id : null, adapter: S.adapter.run().challenge,
        fp: k.fingerprint, planetFp: null, hud: (document.querySelector(".pv-id small") || {}).textContent, footer: (document.getElementById("pvRunId") || {}).textContent,
        scn: (() => { const el = document.getElementById("pvScn"); return el && !el.hidden ? (el.querySelector(".sh b") || {}).textContent : null; })(),
        prov: { challengeId: S.run.expedition.challengeId, scenarioId: S.run.expedition.scenarioId, sv: S.run.expedition.scenarioValidation && S.run.expedition.scenarioValidation.status }, sim: S.sim, ticks: S.sim.ticks }; })
      .then(r => { delete r.sim; return r; });
    const storageClean = p => p.evaluate(() => { const keys = s => { try { return Object.keys(s).map(k => k + "=" + s.getItem(k)); } catch (e) { return []; } };
      const all = [...keys(localStorage), ...keys(sessionStorage)]; return { leak: all.filter(x => /challenge|dying_world|native_competition|volatile_climate|scenario/i.test(x)), name: window.name, href: location.href }; });

    try {
      // ------------------------------------------------------------------ M · the main menu
      { const c = await context(), p = await page(c); await p.goto(`${ORIGIN}/?sector=77&workers=4&bg=3`); await menuReady(p);
        const M = await p.evaluate(() => [...document.querySelectorAll(".mm-item")].map(b => ({ act: b.dataset.act, text: b.innerText.replace(/\s+/g, " ").trim(), disabled: b.disabled || b.getAttribute("aria-disabled") === "true",
          glyph: (b.querySelector(".mm-ico svg.bloom-ic") || {}).innerHTML || null, h: b.getBoundingClientRect().height, tag: b.tagName })));
        const ch = M.find(x => x.act === "challenges"), norm = s => s.replace(/<(\w+)([^>]*?)\/>/g, "<$1$2></$1>");
        const soon = await p.evaluate(() => /coming soon|soon|locked/i.test(document.querySelector(".mm-nav").innerText));
        check(J(M.map(x => x.text.toUpperCase())) === J(MENU.map(x => x.toUpperCase())) && ch && ch.tag === "BUTTON" && !ch.disabled && ch.glyph === norm(ICONS.challenge) && M.every(x => x.glyph && x.h >= 44) && !soon,
          `[${bn}] M1 · the main menu is EXPEDITION · CHALLENGES · TRAINING · SETTINGS · CREDITS; CHALLENGES is a real, enabled chunky button (≥ 44 px) with the shared challenge glyph + its word — never disabled, no "coming soon"`, J(M.map(x => x.text)));
        await shot(p, "01-main-menu-challenges.png", { firefox: true, wait: 2500 });
        // K · keyboard into the hub
        // a keyboard player Tabs into the menu (its first entry is EXPEDITION), then ↓
        for (let i = 0; i < 12 && (await p.evaluate(() => document.activeElement && document.activeElement.dataset.act)) !== "begin"; i++) await p.keyboard.press("Tab");
        await p.keyboard.press("ArrowDown"); const kf = await p.evaluate(() => document.activeElement.dataset.act);
        await p.keyboard.press("Enter"); await hubReady(p);
        const K = await p.evaluate(H => { const h = eval(H), a = document.activeElement, cs = getComputedStyle(a);
          return { focused: a.dataset.challenge, sel: h.selected.id, role: a.getAttribute("role"), checked: a.getAttribute("aria-checked"), tab: [...document.querySelectorAll(".ch-card")].map(x => x.tabIndex).join(""),
            ring: cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) >= 2, group: document.querySelector(".ch-list").getAttribute("role") }; }, HUB);
        const keys = [];
        for (const k of ["ArrowDown", "ArrowDown", "ArrowDown", "Home", "End", "ArrowUp"]) { await p.keyboard.press(k);
          keys.push(await p.evaluate(H => ({ f: document.activeElement.dataset.challenge, s: eval(H).selected.id, d: document.querySelector(".ch-dossier").dataset.challenge }), HUB)); }
        await p.keyboard.press("Space"); const opened = await p.evaluate(H => ({ state: eval(H).state, focusH2: document.activeElement === document.querySelector(".ch-dossier h2") }), HUB);
        await p.keyboard.press("Escape"); const closed = await p.evaluate(H => ({ state: eval(H).state, focus: document.activeElement.dataset.challenge }), HUB);
        await p.keyboard.press("Enter"); const opened2 = await p.evaluate(H => eval(H).state, HUB);
        await p.keyboard.press("Tab"); const tabTo = await p.evaluate(() => document.activeElement.dataset.act || document.activeElement.className);
        await p.keyboard.press("Escape"); await p.keyboard.press("Escape"); await menuReady(p);
        const back = await p.evaluate(() => ({ state: MENU_DEV.entry.state, ch: MENU_DEV.entry.challenge, focus: document.activeElement.dataset.act }));
        const want = ["native_competition", "volatile_climate", "dying_world", "dying_world", "volatile_climate", "native_competition"];
        check(kf === "challenges" && K.focused === "dying_world" && K.sel === "dying_world" && K.role === "radio" && K.checked === "true" && K.tab === "0-1-1" && K.ring && K.group === "radiogroup"
            && J(keys.map(x => x.f)) === J(want) && keys.every(x => x.f === x.s && x.s === x.d) && opened.state === "detail" && opened.focusH2 && closed.state === "list" && closed.focus === "native_competition"
            && opened2 === "detail" && tabTo === "choose" && back.state === "menu" && back.ch === null && back.focus === "begin",
          `[${bn}] K1 · keyboard: ↓ from EXPEDITION focuses CHALLENGES, Enter opens the hub on the first card (a roving-tabindex radiogroup, visible focus ring); ↓ ↑ Home End move the selection and the dossier follows; Space / Enter open the dossier (focus on its heading), Tab reaches BEGIN CHALLENGE, Escape closes it (focus back to the card) and Escape again returns to the title (focus on EXPEDITION, no Challenge)`,
          `${kf} → ${J(keys.map(x => x.f))} · open ${J(opened)} · close ${J(closed)} · tab → ${tabTo} · back ${J(back)}`);
        check(!p.errs.length, `[${bn}] M2 · no console / page error on the menu + hub keyboard walk`, p.errs.join(" | ") || "clean");
        await c.close(); }

      // ------------------------------------------------------------------ H · the hub at four viewports · R · reduced motion
      for (const [w, h] of VIEWPORTS) {
        const c = await context({ width: w, height: h, reducedMotion: w === 1024 ? "reduce" : null }), p = await page(c);
        await p.goto(`${ORIGIN}/?sector=77&workers=3&bg=5`); await menuReady(p);
        if (w === 390) await shot(p, "01-main-menu-390x844.png", { wait: 2500 });
        await openHub(p);
        const rows = [];
        for (const id of IDS) {
          await p.evaluate(([id, H]) => { const h = eval(H); h.select(id); if (h.narrow) h.open(id); }, [id, HUB]);
          await p.evaluate(() => Promise.all(document.querySelector(".ch").getAnimations({ subtree: true }).map(a => a.finished.catch(() => {})))); await p.waitForTimeout(60);
          const R = await p.evaluate(([H, RANK]) => { const h = eval(H), go = document.querySelector(".ch-btn.go"), r = go.getBoundingClientRect(), d = document.querySelector(".ch-dossier");
            const card = document.querySelector(`.ch-card[data-challenge="${h.selected.id}"]`);
            return { id: h.selected.id, sheet: h.root.dataset.sheet, title: d.querySelector("h2").textContent, dossierFor: d.dataset.challenge, label: go.innerText.trim(),
              visible: r.width > 0 && r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth, rows: [...d.querySelectorAll(".ch-row dt")].map(x => x.textContent.trim()),
              icon: !!card.querySelector(".ch-card-i svg.bloom-ic") && !!d.querySelector(".ch-d-i svg.bloom-ic"), words: !!card.querySelector("h3").textContent.trim(),
              rank: (document.querySelector(".ch").innerText.match(new RegExp(RANK, "i")) || [null])[0], anims: document.querySelector(".ch").getAnimations({ subtree: true }).filter(a => a.playState === "running").length }; }, [HUB, RANKING.source]);
          R.contrast = await contrast(p, ".ch-btn.go"); R.ov = await noOverflow(p);
          rows.push(R);
          if (w === 1440 || w === 390) await shot(p, `02-hub-${R.id}-${w}x${h}.png`, { firefox: w === 1440 && id === "dying_world" });
          if (w === 390) { await p.keyboard.press("Escape"); }
        }
        const cards = await p.evaluate(() => [...document.querySelectorAll(".ch-card")].map(x => ({ id: x.dataset.challenge, h: Math.round(x.getBoundingClientRect().height), w: Math.round(x.getBoundingClientRect().width) })));
        const sameSize = new Set(cards.map(x => x.w)).size === 1;
        check(rows.every(r => r.title === NAMES[IDS.indexOf(r.id)] && r.dossierFor === r.id && r.visible && r.contrast >= 4.5 && r.icon && r.words && !r.rank && r.ov.doc && r.ov.inner && r.label === "Begin challenge"
            && r.rows[0] === "What changes" && r.rows[1] === "Strategic idea" && r.rows.includes("How the run works") && r.rows.length === 4 && (w !== 390 || r.sheet === "true"))
            && J(cards.map(x => x.id)) === J(IDS) && sameSize,
          `[${bn}] H1 ${w}×${h} · the hub: three equal cards (scenario glyph + name + one line; no ranking cue) and the selected Challenge's dossier (What changes · Strategic idea · the science / why · How the run works); BEGIN CHALLENGE fully visible${w === 390 ? " (pinned in the phone sheet)" : ""} with contrast ≥ 4.5 : 1; no horizontal overflow; no difficulty words`,
          rows.map(r => `${r.id} ${r.contrast}:1${r.visible ? "" : " HIDDEN"}${r.rank ? ` RANK "${r.rank}"` : ""}`).join(" · ") + ` · cards ${J(cards.map(x => x.w + "×" + x.h))}`);
        if (w === 1024) check(rows.every(r => r.anims === 0), `[${bn}] R1 · reduced motion (the OS setting): nothing animates on the hub`, J(rows.map(r => r.anims)));
        check(!p.errs.length, `[${bn}] H2 ${w}×${h} · no console / page error`, p.errs.join(" | ") || "clean");
        await c.close();
      }

      // ------------------------------------------------------------------ F · each Challenge end to end · E · environment
      for (const id of IDS) {
        const c = await context(), p = await page(c), sp = FLOW[id];
        await p.goto(`${ORIGIN}/?sector=77&workers=6&bg=7`); await menuReady(p); const href0 = await p.evaluate(() => location.href);
        await openHub(p); await beginChallenge(p, id);
        const SP = await p.evaluate(([SS, RANK]) => { const s = eval(SS); return { kicker: document.querySelector(".ss-kicker").textContent, cards: [...document.querySelectorAll(".ss-card")].map(x => x.dataset.species),
          note: !!document.querySelector(".ss-note"), rank: (document.querySelector(".ss").innerText.match(new RegExp(RANK, "i")) || [null])[0], ch: MENU_DEV.entry.challenge && MENU_DEV.entry.challenge.id, data: s.root.dataset.challenge }; }, [SS, RANKING.source]);
        if (id === "dying_world") await shot(p, "03-species-from-challenge.png", { firefox: true });
        const tS = Date.now(); await chooseSpecies(p, sp); const surveyMs = Date.now() - tS;
        const SV = await p.evaluate(() => { const s = MENU_DEV.entry.survey, k = document.querySelector(".ds-kicker.ds-challenge");
          return { scn: s.scenario, ch: s.challenge && s.challenge.id, same: s.challenge === MENU_DEV.entry.challenge, species: s.species.id, seed: s.sectorSeed,
            cells: s.cells.map(c => [c.scenarioId, c.scenarioValidation && c.scenarioValidation.status, c.playable, c.species.id]), kicker: k && k.innerText, icon: !!(k && k.querySelector("svg.bloom-ic")),
            stats: s.sectors.cache.stats, rejected: s.sectors.stats.sectorTimes.filter(x => x.scenario).flatMap(x => x.columns.map(c => c.scenarioRejected || 0)).reduce((a, b) => a + b, 0) }; });
        if (id === "dying_world") await shot(p, "04-survey-under-challenge.png", { firefox: true });
        await pick(p, 0);
        const label = await p.evaluate(() => document.querySelector(".ds-btn.go").innerText.trim());
        await depart(p, 1);
        const R = await runId(p);
        check(SP.kicker === `Challenge · ${NAMES[IDS.indexOf(id)]}` && J(SP.cards) === J(["organic_hybrid", "cinder_rosette", "woolly_candle", "reed_spire"]) && !SP.note && !SP.rank && SP.ch === id && SP.data === id,
          `[${bn}] F1 ${id} · BEGIN CHALLENGE → Choose Plant Species: all four released species open (none prescribed), the kicker names the Challenge, no recommendation note or ranking words`, J(SP));
        check(SV.scn === id && SV.ch === id && SV.same && SV.species === sp && SV.cells.every(x => x[0] === id && x[1] === "PASS" && x[2] && x[3] === sp) && SV.kicker && SV.kicker.toUpperCase().includes(NAMES[IDS.indexOf(id)].toUpperCase()) && SV.icon && label === "Begin challenge",
          `[${bn}] F2 ${id} · its Destination Survey: FOR ${sp} and ${id} (the entry's own Challenge object), all nine worlds proven under the scenario (layer P PASS with the species), the title kicker names the Challenge (glyph + words), the primary action is "Begin challenge"`,
          `${surveyMs} ms · scenarioRejected ${SV.rejected} · cache ${J(SV.stats)}`);
        check(R.planetSame && R.speciesSame && R.challengeSame && R.challengeCanon && R.scenario === id && R.scenarioCanon && R.simScenario === id && R.simSpecies === sp && R.challenge === id
            && R.adapter && R.adapter.id === id && R.prov.challengeId === id && R.prov.scenarioId === id && R.prov.sv === "PASS"
            && R.hud === `Challenge · ${NAMES[IDS.indexOf(id)]}` && /^Challenge · /.test(R.footer) && R.scn === NAMES[IDS.indexOf(id)],
          `[${bn}] F3 ${id} · the run plays EXACTLY the chosen Challenge (the canonical object), its scenario (the catalogue's own object; sim.scenario), the species and the planet object the survey showed; the HUD and the footer name the Challenge; the scenario's own status card runs (reused feedback)`,
          `${R.hud} · ${R.footer} · card ${R.scn}`);
        if (id === "dying_world") { await p.evaluate(() => BLOOM_API.advance(700)); await p.waitForTimeout(400); await shot(p, `05-run-${id}.png`, { firefox: true }); }
        else { await p.evaluate(() => BLOOM_API.advance(300)); await p.waitForTimeout(400); await shot(p, `05-run-${id}.png`); }
        // E · the specimen environment reads the real region sky
        const spec = room => p.evaluate(r => { const s = BLOOM.plantSpecimen.mounted().find(x => x.el.closest(`.dr-room[data-room="${r}"]`) && !x.el.closest("[hidden]"));
          return s && s.scene ? { env: s.environmentSignature(), t: s.scene.t, m: s.scene.m, keys: Object.keys(s.scene).sort().join(",") } : null; }, room);
        const idle = () => p.waitForFunction(() => !BLOOM.decisionRooms.instance.state().transitioning, null, { timeout: 20000, polling: 50 });   // one room swap at a time
        const openAdapt = async () => { await idle(); await p.evaluate(() => { const D = BLOOM.decisionRooms.instance; D.open("adapt", D.state().context); });
          await p.waitForFunction(() => { const st = BLOOM.decisionRooms.instance.state(); return st.room === "adapt" && !st.transitioning; }, null, { timeout: 20000, polling: 50 }); await p.waitForTimeout(300); };
        const closeRoom = async () => { await idle(); await p.evaluate(() => BLOOM.decisionRooms.instance.close()).catch(() => {}); await idle(); await p.waitForTimeout(150); };
        if (id === "dying_world") {
          // a fresh look at the same region at the start (Play Again later) is not needed: compare against the region's own starting sky
          await openAdapt(); const a = await spec("adapt");
          const base = await p.evaluate(() => { const D = BLOOM.decisionRooms.instance, r = D.adapter.region(D.state().context), S = BLOOM_API.sim; return { t: r.raw.effectiveTemp, m: r.raw.effectiveMoist, off: { ...S.pressure.offsets }, progress: S.pressure.progress, tf: S.sky }; });
          check(a && base.progress > 0.2 && base.off.temp < -1 && base.off.moist < -1 && Math.abs(a.t - Math.round(base.t * 10) / 10) < 0.11 && Math.abs(a.m - Math.round(base.m * 10) / 10) < 0.11,
            `[${bn}] E1 dying_world · the specimen scene reads the REAL region sky: with the decline under way (scenario drift, no Terraform) the scene is the drifted colder / drier sky the engine evaluates`, J({ scene: a && { t: a.t, m: a.m }, region: { t: base.t, m: base.m }, drift: base.off, progress: +base.progress.toFixed(2) }));
          await closeRoom();
          if (EVIDENCE) { await openAdapt(); await shot(p, "06-adapt-room-dying_world-late.png"); await closeRoom(); }
        }
        if (id === "volatile_climate") {
          await openAdapt(); const before = await spec("adapt"); await closeRoom();
          // a REAL shock: Terraform bought through the run's own buy path, close together; the engine announces and starts the shock itself
          const shock = await p.evaluate(() => { BLOOM_API.addBiomass(4000); for (const id of ["warm", "warm"]) BLOOM_API.buy(id); const S = BLOOM_API.sim, CL = S.climate;
            for (let k = 0; k < 3000 && !S.lost && !(Math.abs(CL.offsets.temp) > 0.5 && CL.shocks.some(x => !x.ended)); k++) BLOOM_API.advance(1);
            return { offsets: { ...CL.offsets }, shocks: CL.shocks.map(x => ({ name: x.name, ended: x.ended })), forcing: CL.forcing.length, sky: S.sky.temp, lost: !!S.lost }; });
          await openAdapt(); const during = await spec("adapt");
          const reg = await p.evaluate(() => { const D = BLOOM.decisionRooms.instance, r = D.adapter.region(D.state().context); return { t: r.raw.effectiveTemp, m: r.raw.effectiveMoist }; });
          check(shock.forcing === 2 && !shock.lost && shock.shocks.some(x => !x.ended) && Math.abs(shock.offsets.temp) > 0.5 && during && Math.abs(during.t - Math.round(reg.t * 10) / 10) < 0.11 && during.env !== before.env,
            `[${bn}] E2 volatile_climate · a real climate shock (two bought Terraform steps close together; the engine's own shock — none injected) appears in the specimen scene: the scene temperature is the region's evaluated sky including the shock offset, and the environment changes`,
            J({ shock, before: before && { t: before.t }, during: during && { t: during.t }, region: reg }));
          await shot(p, "06-adapt-room-volatile_climate-shock.png"); await closeRoom();
        }
        if (id === "native_competition") {
          await openAdapt(); const a = await spec("adapt"); await closeRoom();
          check(a && a.keys === "horizon,kind,m,planet,rad,region,salt,seed,skyline,t,toxic,v",
            `[${bn}] E3 native_competition · the specimen scene is the region's own environment only (no native-plant layer is drawn into the specimen box)`, a && a.keys);
        }
        // the report names the Challenge
        await winNow(p); await reportOpen(p);
        const RP = await p.evaluate(() => ({ facts: [...document.querySelectorAll(".rr-fact")].map(x => [x.querySelector("small").textContent, x.querySelector("b").textContent]), kicker: document.getElementById("rrKicker").textContent }));
        const fact = RP.facts.find(x => x[0] === "Challenge");
        check(fact && fact[1] === NAMES[IDS.indexOf(id)] && !RP.facts.some(x => x[0] === "Scenario") && /challenge debrief/.test(RP.kicker),
          `[${bn}] F4 ${id} · the Bloom Report names the Challenge ("Challenge · ${NAMES[IDS.indexOf(id)]}" instead of an internal scenario id) under a challenge debrief`, J(RP.facts));
        if (id === "dying_world" || bn === "chromium") await shot(p, `07-report-${id}.png`, { firefox: id === "dying_world" });
        const D1 = await storageClean(p);
        check(p.navs === 1 && D1.href === href0 && !D1.leak.length && !D1.name && !p.reqs.some(u => /[?&](challenge|scenario)=/.test(u)) && !p.errs.length,
          `[${bn}] D1 ${id} · one document: no navigation, the address never changed, no Challenge / scenario in localStorage, sessionStorage, window.name or any request URL; no console error`,
          `navs ${p.navs} · ${D1.href === href0 ? "same address" : D1.href} · leak ${J(D1.leak)}${p.errs.length ? " · " + p.errs.join(" | ") : ""}`);
        await c.close();
      }

      // ------------------------------------------------------------------ I · state invariants (Dying World)
      { const c = await context(), p = await page(c);
        await p.goto(`${ORIGIN}/?sector=77&workers=6&bg=9`); await menuReady(p);
        await openHub(p); await beginChallenge(p, "dying_world");
        // Back from species → the hub, the Challenge kept
        await p.keyboard.press("Escape"); await hubReady(p);
        const B1 = await p.evaluate(H => ({ state: MENU_DEV.entry.state, sel: eval(H).selected.id, ch: MENU_DEV.entry.challenge && MENU_DEV.entry.challenge.id }), HUB);
        await p.click(".ch-btn.go"); await speciesReady(p); await chooseSpecies(p, "woolly_candle");
        const S1 = await p.evaluate(() => { const s = MENU_DEV.entry.survey; window.__pool = s.sectors; window.__ch = s.challenge; return { seed: s.sectorSeed, species: s.species.id, scn: s.scenario }; });
        // Change Species: same Challenge, same sector seed, same pool, re-evaluated for the new species under the same scenario
        await p.click(".ds-species-change"); await speciesReady(p);
        const kick = await p.evaluate(() => document.querySelector(".ss-kicker").textContent);
        await chooseSpecies(p, "cinder_rosette");
        const S2 = await p.evaluate(() => { const s = MENU_DEV.entry.survey; return { seed: s.sectorSeed, species: s.species.id, scn: s.scenario, samePool: s.sectors === window.__pool, sameCh: s.challenge === window.__ch,
          cells: s.cells.every(c => c.species.id === "cinder_rosette" && c.scenarioId === "dying_world" && c.scenarioValidation.ok) }; });
        check(B1.state === "challenges" && B1.sel === "dying_world" && B1.ch === "dying_world" && kick === "Challenge · Dying World" && S2.seed === S1.seed && S2.samePool && S2.sameCh && S2.scn === "dying_world" && S2.species === "cinder_rosette" && S2.cells,
          `[${bn}] I1 · Back from Choose Plant Species returns to the hub (the Challenge kept and selected); CHANGE SPECIES keeps the same Challenge object and the SAME sector seed and pool, and the survey is re-evaluated for the new species under the same scenario`,
          `back ${J(B1)} · seed ${S1.seed} → ${S2.seed} · ${S1.species} → ${S2.species}`);
        await pick(p, 0); await depart(p, 1);
        const R1 = await runId(p), sim1 = await p.evaluate(() => { window.__sim1 = BLOOM_APP.session.sim; window.__session1 = BLOOM_APP.session; return BLOOM_APP.session.sim.ticks; });
        await p.evaluate(() => BLOOM_API.advance(120));
        // PLAY AGAIN: the same Challenge, scenario, species and planet objects; a fresh simulation
        await winNow(p); await reportOpen(p); await p.click('#rrActs [data-act="playAgain"]'); await runReady(p, 2);
        const R2 = await runId(p), fresh = await p.evaluate(() => ({ newSim: BLOOM_APP.session.sim !== window.__sim1, newSession: BLOOM_APP.session !== window.__session1, ticks: BLOOM_APP.session.sim.ticks, won: BLOOM_APP.session.sim.won,
          ev: MENU_DEV.events.filter(e => e.type === "play-again").map(e => e.challenge) }));
        check(R1.challenge === "dying_world" && R2.planetSame && R2.speciesSame && R2.challengeSame && R2.scenario === "dying_world" && R2.simScenario === "dying_world" && R2.simSpecies === "cinder_rosette"
            && fresh.newSim && fresh.newSession && fresh.ticks < 5 && !fresh.won && J(fresh.ev) === J(["dying_world"]),
          `[${bn}] I2 · PLAY AGAIN: the same Challenge, scenario, species and planet OBJECTS in a fresh session with a fresh simulation`, J({ R2: { ch: R2.challenge, scn: R2.scenario, sp: R2.simSpecies }, fresh }));
        await shot(p, "08-play-again.png");
        // CHOOSE ANOTHER PLANET: that Challenge's survey for the same species
        await winNow(p); await reportOpen(p); await p.click('#rrActs [data-act="choosePlanet"]');
        await surveyReady(p);
        const CP = await p.evaluate(() => { const s = MENU_DEV.entry.survey; return { ch: s.challenge && s.challenge.id, same: s.challenge === window.__ch, scn: s.scenario, species: s.species.id,
          cells: s.cells.every(c => c.scenarioId === "dying_world" && c.scenarioValidation.ok && c.species.id === "cinder_rosette"), kicker: !!document.querySelector(".ds-kicker.ds-challenge"), app: BLOOM_APP.challenge && BLOOM_APP.challenge.id }; });
        check(CP.ch === "dying_world" && CP.same && CP.scn === "dying_world" && CP.species === "cinder_rosette" && CP.cells && CP.kicker && CP.app === "dying_world",
          `[${bn}] I3 · CHOOSE ANOTHER PLANET returns to THAT Challenge's Destination Survey (same Challenge object, scenario and species; every world proven again)`, J(CP));
        await shot(p, "09-choose-another-planet.png");
        // the survey's own Main menu clears the Challenge
        await p.click('.ds-exit'); await menuReady(p);
        const MM1 = await p.evaluate(() => ({ ch: MENU_DEV.entry.challenge, app: BLOOM_APP.challenge }));
        // back into the Challenge, a run, then MAIN MENU from the run
        await openHub(p); await beginChallenge(p, "dying_world"); await chooseSpecies(p, "woolly_candle"); await pick(p, 1); await depart(p, 3);
        await winNow(p); await reportOpen(p); await p.click('#rrActs [data-act="mainMenu"]'); await menuReady(p);
        const MM2 = await p.evaluate(() => ({ ch: MENU_DEV.entry.challenge, app: BLOOM_APP.challenge, expedition: BLOOM_APP.expedition, state: MENU_DEV.entry.state }));
        check(MM1.ch === null && MM1.app === null && MM2.ch === null && MM2.app === null && MM2.expedition === null && MM2.state === "menu",
          `[${bn}] I4 · MAIN MENU clears the Challenge launch state — from the survey's Main menu and from the run's Main Menu`, J({ MM1, MM2 }));
        // EXPEDITION afterwards: the default scenario, no Challenge residue
        await p.click('.mm-item[data-act="begin"]'); await speciesReady(p);
        const EK = await p.evaluate(() => ({ kicker: document.querySelector(".ss-kicker").textContent, note: !!document.querySelector(".ss-note") }));
        await chooseSpecies(p, "woolly_candle");
        const ES = await p.evaluate(() => { const s = MENU_DEV.entry.survey; return { ch: s.challenge, scn: s.scenario, kicker: !!document.querySelector(".ds-kicker.ds-challenge"), label: null,
          cells: s.cells.every(c => c.scenarioId === undefined && c.scenarioValidation === undefined) }; });
        await pick(p, 0); const elabel = await p.evaluate(() => document.querySelector(".ds-btn.go").innerText.trim()); await depart(p, 4);
        const ER = await runId(p);
        await winNow(p); await reportOpen(p);
        const EF = await p.evaluate(() => [...document.querySelectorAll(".rr-fact")].map(x => [x.querySelector("small").textContent, x.querySelector("b").textContent]));
        check(EK.kicker === "Expedition" && EK.note && ES.ch === null && ES.scn === null && !ES.kicker && ES.cells && elabel === "Begin expedition" && ER.challenge === null && ER.scenario === null && ER.simScenario === null && !ER.mech.pressure && !ER.mech.competition && !ER.mech.climate
            && ER.adapter === null && ER.prov.challengeId === null && ER.prov.scenarioId === null && !/Challenge/.test(ER.hud + ER.footer) && J(EF.find(x => x[0] === "Scenario")) === J(["Scenario", "None"]) && !EF.some(x => x[0] === "Challenge"),
          `[${bn}] I5 · EXPEDITION after a Challenge: the canonical default scenario and no Challenge residue (species screen "Expedition", a survey without scenario provenance, "Begin expedition", no scenario mechanics in the sim, report "Scenario · None")`,
          J({ EK, ES, elabel, run: { ch: ER.challenge, scn: ER.scenario, sim: ER.simScenario, hud: ER.hud }, report: EF.find(x => x[0] === "Scenario") }));
        await shot(p, "10-expedition-no-residue.png");
        await p.click('#rrActs [data-act="mainMenu"]'); await menuReady(p);
        // TRAINING: Organic Hybrid, no scenario, no Challenge
        await openHub(p); await p.click('.ch-head [data-act="back"]'); await menuReady(p); // (the hub's Main menu clears it too)
        const HB = await p.evaluate(() => MENU_DEV.entry.challenge);
        await p.click('.mm-item[data-act="training"]');
        await p.waitForFunction(() => window.BLOOM_APP && BLOOM_APP.session && BLOOM_APP.session.run.training && BLOOM_APP.stats.sessions.at(-1).readyMs !== null, null, { timeout: 60000, polling: 50 });
        await p.waitForTimeout(800);
        const TR = await p.evaluate(() => { const S = BLOOM_APP.session, M = S.adapter.run().mechanics; return { mech: !M.pressure && !M.competition && !M.climate, training: !!S.run.training, species: S.run.species.id, scenario: S.run.scenario, challenge: S.run.challenge || null, sim: S.sim.scenario ? S.sim.scenario.id : null,
          app: BLOOM_APP.challenge, adapter: S.adapter.run().challenge, hud: (document.querySelector(".pv-id small") || {}).textContent }; });
        check(HB === null && TR.training && TR.species === "organic_hybrid" && TR.scenario === null && TR.challenge === null && TR.sim === null && TR.mech && TR.app === null && TR.adapter === null && !/Challenge/.test(TR.hud || ""),
          `[${bn}] I6 · TRAINING stays independent: Organic Hybrid, the default scenario, no Challenge (also after the hub's own Main menu, which clears it)`, J(TR));
        await shot(p, "11-training-no-residue.png");
        // the run refuses a tampered detail
        const T = await p.evaluate(() => { const S = BLOOM.gameSession, k = window.__pick, ch = BLOOM.challenges.resolve("dying_world"), out = {};
          const base = (cand, extra) => ({ planet: k.planet, species: k.species, candidate: { key: "x", archetypeId: k.planet.archetype && k.planet.archetype.name, speciesId: k.species.id, physiologyKey: k.species.physiologyKey, ...cand }, ...extra });
          const tryRun = d => { try { S.expeditionRun(d); return "accepted"; } catch (e) { return "refused"; } };
          out.ok = tryRun(base({ scenarioId: "dying_world", scenarioValidation: { ok: true, status: "PASS" } }, { challenge: ch }));
          out.wrongScenario = tryRun(base({ scenarioId: "volatile_climate", scenarioValidation: { ok: true } }, { challenge: ch }));
          out.unproven = tryRun(base({ scenarioId: "dying_world", scenarioValidation: { ok: false, status: "FAIL" } }, { challenge: ch }));
          out.residue = tryRun(base({ scenarioId: "dying_world", scenarioValidation: { ok: true } }, {}));
          out.foreign = tryRun(base({ scenarioId: "dying_world", scenarioValidation: { ok: true } }, { challenge: JSON.parse(JSON.stringify(ch)) }));
          return out; });
        check(J(T) === J({ ok: "accepted", wrongScenario: "refused", unproven: "refused", residue: "refused", foreign: "refused" }),
          `[${bn}] I7 · the run accepts only a world proven under the Challenge's own scenario: a wrong scenario, an unproven world, an Expedition carrying scenario provenance (residue) and a non-canonical Challenge object are refused`, J(T));
        check(!p.errs.length, `[${bn}] I8 · no console / page error through the invariant walk`, p.errs.join(" | ") || "clean");
        await c.close(); }

      // ------------------------------------------------------------------ P · file:// offline · B · /bloom/
      for (const [tag, url, offline] of [["P1 · file:// offline (a double-clicked index.html, the network off)", `${FILE_INDEX}?sector=77&workers=6`, true], ["B1 · HTTP /bloom/ (the static Pages site under a project subpath)", `${ORIGIN}/bloom/?sector=77&workers=6`, false]]) {
        const c = await context({ offline }), p = await page(c);
        await p.goto(url); await menuReady(p); await openHub(p); await beginChallenge(p, "dying_world"); await chooseSpecies(p, "woolly_candle"); await pick(p, 2); await depart(p, 1);
        const R = await runId(p), where = await p.evaluate(() => ({ path: location.pathname, protocol: location.protocol }));
        const outside = offline ? p.reqs.filter(u => !u.startsWith("file:") && !u.startsWith("blob:") && !u.startsWith("data:")) : p.reqs.filter(u => !u.startsWith(`${ORIGIN}/bloom/`) && !u.startsWith("blob:") && !u.startsWith("data:"));
        check(R.planetSame && R.challenge === "dying_world" && R.simScenario === "dying_world" && R.simSpecies === "woolly_candle" && !outside.length && p.navs === 1 && !p.errs.length
            && (offline ? where.protocol === "file:" : where.path === "/bloom/"),
          `[${bn}] ${tag}: the hub and a complete Challenge launch (species → the Challenge's survey → the exact planet in a Dying World run), one document, no request outside ${offline ? "the local files (no network)" : "/bloom/"}`,
          `${where.protocol}${where.path} · outside ${outside.length}${outside.length ? " " + outside.slice(0, 3).join(" ") : ""}${p.errs.length ? " · " + p.errs.join(" | ") : ""}`);
        await c.close();
      }
    } catch (e) { check(false, `[${bn}] uncaught`, e.stack || String(e)); }
    await browser.close();
  }
  srv.close();
}
