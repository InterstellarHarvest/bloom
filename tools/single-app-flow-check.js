// BLOOM — Single-document app flow check (BLOOM-033): the whole game is ONE document, index.html. docs/SINGLE_DOCUMENT_APP_v1.md.
// It replaces the retired tools/expedition-handoff-check.js: the product guarantees that suite proved for the two-document handoff
// (the exact planet, no regeneration, no generator after selection, the four rooms, the report and its actions) are proved here for the
// one-document app — and so are the new ones (no navigation, no storage, no token, no other document).
//
//   NODE_PATH="$(npm root -g)" node tools/single-app-flow-check.js [--browsers chromium,firefox] [--evidence]
//
// Node (S1–S9): the production document graph (index.html → title-boot.js → the app; nothing of it names demos/, opens a document, an
// iframe or a popup); the handoff / arrival modules are gone and nothing references them; demos/demo-run.html is a thin harness over the
// SAME GameSession (no run implementation of its own; one createSim in the whole run path, in game-session.js); default == old Eden
// bit-for-bit (the f5623d7 engine and this one, side by side, five worlds × five scenario spellings); the default scenario is canonical
// and "eden" survives only as the resolver's one marked legacy alias; Favorable / Precarious / Extreme (same thresholds, same columns,
// same classification as Stable / Volatile / Extreme); the portable runtime rebuilds deterministically, matches dist/ and carries no
// handoff code; the Pages site is the one production document and its resources.
// Browser (Chromium AND Firefox; a real static server on 127.0.0.1 serving "/" → index.html and the Pages site under "/bloom/"):
//   F · the root flow: title (EXPEDITION · TRAINING · SETTINGS · CREDITS) → the Destination Survey (nine validated worlds, Favorable /
//       Precarious / Extreme columns) → focus → Begin Expedition (DRAMATIC, full cover) → the EXACT selected planet object is the run's
//       (JSON, planetFingerprint, render hints, canonical surface; generateFromArchetype / generatePlanet / attemptPlanet / searchWorld /
//       runSearch called ZERO times, no worker started) → the run mounted in the same document (no navigation, no shell DOM) → Region /
//       Adapt / Spread / Terraform (Organic Hybrid specimen, a real purchase, the Terraform sphere shows this planet, the Reach note) →
//       the report → Play Again (a fresh session, the same planet object; the old one fully disposed) → Choose Another Planet (the survey,
//       a fresh sector) → a second world → Main Menu → Training: Restart · Skip (its confirmation) · Main Menu · Begin Expedition.
//       Throughout: one document load, the address never changes, demos/demo-run.html never requested, no token, no planet in the URL,
//       window.name untouched, no planet in any storage, no console error, no unhandled rejection.
//   B · storage blocked (localStorage AND sessionStorage throw): the exact selected planet still starts, Play Again works.
//   P · file:// (the double-clicked index.html, OFFLINE: the browser context has no network) — the same index.html stays open.
//   H · HTTP /bloom/ (the Pages artifact under a project subpath): the pathname stays /bloom/.
//   M · reduced motion (the OS setting) · K · keyboard only (title → survey → focus → Begin Expedition → a room → the report → Main Menu).
// --evidence writes docs/evidence/bloom-033/ (10 stills, single-app-proof.json). Exits 1 on any failure.
"use strict";
const path = require("path"), fs = require("fs"), http = require("http"), cp = require("child_process"), crypto = require("crypto"), vm = require("vm"), os = require("os");
const ROOT = path.resolve(__dirname, "..");
const argv = process.argv, argOf = k => { const i = argv.indexOf(k); return i > 0 ? argv[i + 1] : null; };
const BROWSERS = (argOf("--browsers") || "chromium,firefox").split(","), EVIDENCE = argv.includes("--evidence");
const EVD = path.join(ROOT, "docs/evidence/bloom-033");
const BASE_SHA = "f5623d771b1956a2ba7ed3592a62fd20c460afe5";   // the accepted start (BLOOM-032C, main)
let fails = 0, passes = 0; const t0 = Date.now();
const check = (ok, name, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); if (ok) passes++; else fails++; return ok; };
const info = (name, detail) => console.log(`INFO  ${name}  — ${detail}`);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const J = JSON.stringify, read = f => fs.readFileSync(path.join(ROOT, f), "utf8");
const sha256 = b => crypto.createHash("sha256").update(b).digest("hex");
const git = a => cp.execSync(`git ${a}`, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 << 20 }).trim();
const strip = src => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/<!--[\s\S]*?-->/g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");
const PROOF = { milestone: "BLOOM-033", base: BASE_SHA, head: null, browsers: {}, node: {} };
try { PROOF.head = git("rev-parse HEAD"); } catch (e) { /* not a checkout */ }

// the generator / search entry points that must never run after a selection (their names on window.BLOOM)
const GEN = [["generateFromArchetype", null], ["generatePlanet", null], ["attemptPlanet", "archetype"], ["searchWorld", "play"], ["runSearch", "play"]];

(async () => {
  // ================================================================================================ NODE
  console.log("# S · the one production document, the thin harness, default, the survey axis, the portable runtime, Pages");
  // S1 · the production document graph
  { const idx = read("index.html"), boot = read("resources/main-menu/title-boot.js"), app = read("resources/app/app-controller.js");
    const scripts = [...strip(idx).matchAll(/<script\b[^>]*src="([^"]+)"/g)].map(m => m[1]);
    const lists = [...strip(boot).matchAll(/"((?:content|planets|resources)\/[^"]+\.js)"/g)].map(m => m[1]);
    const product = ["resources/main-menu/title-boot.js", "resources/app/app-controller.js", "resources/main-menu/expedition-entry.js", "resources/main-menu/main-menu.js",
      "resources/destination-survey/destination-survey.js", "resources/run/game-session.js", "resources/training/training-run.js", "resources/run-ui/planet-view.js",
      "resources/run-ui/decision-rooms.js", "resources/run-ui/run-report.js"];
    // (the GameSession / training layer keep the HARNESS's historical navigation behind `onAction` — every such line is a harness fallback,
    // reached only without onAction, and the app always passes onAction; every other product module has no navigation at all)
    const HARNESS_NAV = /if\(onAction\)|href:"demo-run\.html\?|if\(act==="restartTraining"\) location\.reload\(\)|if \(action === "restartTraining"\) location\.reload\(\)|\$\("lossRestart"\)|the harness: the historical navigation|const u = new URL\(T\.returnTo/;
    const bad = product.filter(f => strip(read(f)).split("\n").some(l => /demo-run|demos\/|<iframe|window\.open\s*\(|location\.(assign|replace|reload)\s*\(|location\.href\s*=/.test(l) && !HARNESS_NAV.test(l)));
    const sessionNav = /if\(onAction\)\{ onAction\(act\); return true; \} location\.href=href;/.test(read("resources/run/game-session.js")) && /if \(onAction\) \{ onAction\(action\); return true; \}/.test(read("resources/training/training-run.js"));
    const appPassesOnAction = /gameSession\.create\(run, \{ host: this\.runHost, onAction:/.test(app) && /T\.mountTraining\(s, \{ fader: [^}]*\}, onAction:/.test(app);
    check(J(scripts) === J(["resources/main-menu/title-boot.js"]) && !lists.some(f => /^demos\//.test(f)) && lists.includes("resources/run/game-session.js") && !bad.length && sessionNav && appPassesOnAction,
      "S1 · index.html is the ONE production document: it loads only title-boot.js, which loads the engine + the app and (after the title is up) the run's classic scripts — none in demos/; no product module names demos/, opens an iframe / popup or assigns a location (the session's and the training layer's historical hrefs are harness-only, behind onAction, which the app always passes)",
      `index scripts ${J(scripts)} · ${lists.length} boot scripts · offenders ${J(bad)}`); }
  // S2 · the handoff is gone
  { const gone = ["resources/expedition/expedition-handoff.js", "resources/expedition/expedition-arrival.js", "resources/main-menu/main-menu-page.js", "tools/expedition-handoff-check.js"].filter(f => fs.existsSync(path.join(ROOT, f)));
    const files = git("ls-files resources content planets index.html demos/demo-run.html demos/main-menu.html tools/build-portable.mjs tools/build-pages-site.mjs").split("\n").filter(f => /\.(js|mjs|html|css)$/.test(f) && !/generated|vendor|ui-mockups|plant-sprite-lab/.test(f));
    const refs = files.filter(f => /expedition-handoff|expedition-arrival|BLOOM\.expedition\b|expeditionArrival|transportOf|MAX_HANDOFFS|strange-bloom\.(expedition|handoffs)|window\.name/.test(strip(read(f))));
    const copy = /lives only in|this tab any more|not open in this tab/i.test(strip(read("content/play.js")));
    check(!gone.length && !refs.length && !copy, "S2 · the two-document handoff is gone: expedition-handoff.js, expedition-arrival.js, the page composer and the old handoff suite are deleted; no source file references a token, the handoff transport, window.name or MAX_HANDOFFS; the impossible \"lives only in this tab\" failure copy is removed",
      `still present ${J(gone)} · references ${J(refs)} · stale copy ${copy}`); }
  // S3 · demo-run.html is a thin harness over the same GameSession
  { const dr = read("demos/demo-run.html"), drs = strip(dr), gs = strip(read("resources/run/game-session.js"));
    const RUN_FNS = ["winReport", "lossReport", "renderShop", "renderInspect", "computePreview", "skyWhatIf", "upgradeState", "goAction", "placeBubble", "checkThresholds", "pollCrossings"];
    const inHarness = RUN_FNS.filter(n => new RegExp(`function ${n}\\b`).test(drs)), inSession = RUN_FNS.filter(n => new RegExp(`function ${n}\\b`).test(gs));
    const creates = (drs.match(/createSim\(/g) || []).length, sessionCreates = (gs.match(/BLOOM\.createSim\(/g) || []).length, calls = (drs.match(/BLOOM\.gameSession\.create\(/g) || []).length;
    const lines = dr.split("\n").length, inert = /type="text\/plain"/.test(dr), shellTpl = /<template id="shellTemplate">[\s\S]*id="shellHeader"[\s\S]*<\/template>/.test(dr) && !/<body>\s*<header/.test(dr);
    check(!inHarness.length && inSession.length === RUN_FNS.length && creates === 0 && sessionCreates === 1 && calls === 1 && !inert && shellTpl && lines < 700,
      "S3 · demos/demo-run.html is a THIN developer harness: no run implementation (none of the run's functions, no createSim, no inert run script), ONE BLOOM.gameSession.create call; the engineering shell exists only as a <template> it instantiates for ?ui=legacy; resources/run/game-session.js holds the run (every function) and the ONE createSim",
      `harness ${lines} lines · run functions in harness ${J(inHarness)} · in session ${inSession.length}/${RUN_FNS.length} · createSim harness ${creates} / session ${sessionCreates} · gameSession.create ${calls}`); }
  // S4 · default == the old Eden, bit for bit (the accepted f5623d7 engine + content beside this one)
  { const FILES = ["content/config.js", "content/traits.js", "planets/first_bloom.js", "planets/training_grounds.js", "content/archetypes.js", "content/scenarios.js", "content/play.js",
      "resources/bloom-sim.js", "resources/bloom-gen.js", "resources/bloom-validate.js", "resources/bloom-witness.js", "resources/bloom-archetype.js", "resources/bloom-scenario.js", "resources/bloom-play.js"];
    const ctxOf = src => { const c = vm.createContext({ console }); c.globalThis = c; for (const f of FILES) vm.runInContext(src(f), c, { filename: f }); return c; };
    const OLD = ctxOf(f => git(`show ${BASE_SHA}:${f}`)), NEW = ctxOf(f => read(f));
    const play = (C, planet, scenario, seed) => {
      const B = C.BLOOM, D = C.BLOOM_DATA, sim = B.createSim(planet, D.config, D.traits, { scenario: scenario || undefined, rng: B.gen.mulberry32(seed) }), marks = [];
      for (let k = 1; k <= 3000 && !sim.won && !sim.lost; k++) {
        sim.tick();
        if (k % 20 === 0) for (const t of D.traits) { if (sim.canBuy(t) && sim.biomass >= sim.price(t)) { sim.buy(t.id); break; } }
        if (k === 150) sim.setColonyFocus(sim.map.ORIGIN, "leaves");
        if (k % 97 === 0) for (let i = 0; i < sim.map.SC; i++) if (!sim.getSpecialization(i) && !sim.specBlock(i, "seedReserve")) { sim.buySpecialization(i, "seedReserve"); break; }
        if (k % 250 === 0 || sim.won || sim.lost) marks.push(sha256(J({ k, b: sim.biomass, t: sim.ticks, w: sim.won, l: sim.lost, s: [...sim.state], d: [...sim.dens], v: [...sim.vigor], g: sim.genome, sky: sim.sky, tf: sim.tf,
          c: [...sim.colonies.focus, ...sim.colonies.spec], bub: sim.bubbles.map(x => x.tile), inc: sim.income, cov: sim.coverage() })));
      }
      return { hash: sha256(marks.join()), ticks: sim.ticks, won: sim.won, label: `${sim.pressure.id}/${sim.pressure.name}` };
    };
    const worlds = C => { const D = C.BLOOM_DATA, B = C.BLOOM, P = [D.planets.first_bloom, D.planets.training_grounds];
      for (const [aid, seed] of [["ocean_archipelago", 13], ["desert_world", 25], ["frozen_world", 22]]) { const p = B.generateFromArchetype(D.archetypes.find(x => x.id === aid), seed, { config: D.config, traits: D.traits }); B.play.stripPlanet(p); P.push(p); }
      return P; };
    const WO = worlds(OLD), WN = worlds(NEW), rows = [];
    WO.forEach((po, i) => { const pn = WN[i], R = (C, s) => C.BLOOM.pressure.resolveScenario(C.BLOOM_DATA.scenarios, s);
      const r = [play(OLD, po, null, 7 + i), play(OLD, po, R(OLD, "eden"), 7 + i), play(NEW, pn, null, 7 + i), play(NEW, pn, R(NEW, "default"), 7 + i), play(NEW, pn, R(NEW, "eden"), 7 + i)];
      rows.push({ planet: po.id, sameWorld: J(po) === J(pn), hash: r[0].hash, identical: r.every(x => x.hash === r[0].hash), ticks: r[0].ticks, won: r[0].won, labels: r.map(x => x.label) }); });
    const vo = OLD.BLOOM.validateScenario(WO[2], OLD.BLOOM_DATA.config, OLD.BLOOM_DATA.traits, OLD.BLOOM.pressure.resolveScenario(OLD.BLOOM_DATA.scenarios, "eden"), {});
    const vn = NEW.BLOOM.validateScenario(WN[2], NEW.BLOOM_DATA.config, NEW.BLOOM_DATA.traits, NEW.BLOOM.pressure.resolveScenario(NEW.BLOOM_DATA.scenarios, "default"), {});
    PROOF.node.defaultVsEden = { base: BASE_SHA, rows, layerP: { old: vo.status, new: vn.status, okOld: vo.ok, okNew: vn.ok } };
    check(rows.every(r => r.sameWorld && r.identical) && rows.every(r => J(r.labels) === J(["eden/Eden", "eden/Eden", "default/Default", "default/Default", "default/Default"])) && vo.ok === vn.ok && vo.status === "EDEN" && vn.status === "DEFAULT",
      "S4 · default == the old Eden BIT FOR BIT: the f5623d7 engine + content and this branch's, side by side, on five worlds (First Bloom, Training Grounds, generated ocean 13 / desert 25 / frozen 22 — the generated worlds JSON-identical) under five spellings (old none · old \"eden\" · new none · new \"default\" · new legacy alias \"eden\"): the same state hash every 250 ticks through a scripted 3000-tick game (purchases, a growth focus, local upgrades); only the label changed; layer P's verdict unchanged (status EDEN → DEFAULT)",
      rows.map(r => `${r.planet} ${r.hash.slice(0, 10)} ${r.won ? "won" : "running"}@${r.ticks}`).join(" · ")); }
  // S5 · "default" is canonical; "eden" survives only as the resolver's one marked alias
  { const files = git("ls-files resources content planets index.html demos/demo-run.html demos/main-menu.html").split("\n").filter(f => /\.(js|html|css|json)$/.test(f) && !/generated|vendor|ui-mockups/.test(f));
    const hits = []; for (const f of files) read(f).split("\n").forEach((l, i) => { if (/\beden\b/i.test(l)) hits.push(`${f}:${i + 1}`); });
    const aliasLines = hits.filter(h => /^resources\/bloom-sim\.js:/.test(h)), sim = read("resources/bloom-sim.js");
    const scn = (() => { const c = vm.createContext({}); c.globalThis = c; vm.runInContext(read("content/scenarios.js"), c); return c.BLOOM_DATA.scenarios; })();
    const okAlias = /LEGACY ALIAS[\s\S]{0,400}const LEGACY_SCENARIO_ALIASES = Object\.freeze\(\{ eden: DEFAULT_SCENARIO \}\);/.test(sim) && aliasLines.length === 2 && hits.length === 2;
    check(okAlias && scn[0].id === "default" && !scn.some(s => s.id === "eden") && /const DEFAULT_SCENARIO = "default";/.test(sim),
      "S5 · \"default\" is the canonical no-challenge mode (content/scenarios.js id default; null / \"\" resolve to it); \"eden\" appears in active source ONLY in the one marked legacy alias at the resolver boundary (bloom-sim.js) — nowhere else",
      `scenario ids ${J(scn.map(s => s.id))} · "eden" lines ${J(hits)}`); }
  // S6 · the survey's difficulty axis: Favorable / Precarious / Extreme, same thresholds, same classification
  { const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "bloom033-")), oldF = path.join(tmp, "survey-data-old.mjs");
    fs.writeFileSync(oldF, git(`show ${BASE_SHA}:resources/destination-survey/survey-data.js`));
    const O = await import("file://" + oldF), N = await import("file://" + path.join(ROOT, "resources/destination-survey/survey-data.js"));
    const MAP = { stable: "favorable", volatile: "precarious", extreme: "extreme" };
    let same = 0, n = 0; for (let h = 0; h <= 1.0001; h += 0.0025) { n++; if (MAP[O.classFor(h).id] === N.classFor(h).id) same++; }
    const cls = N.SURVEY_CLASSES.map(c => `${c.id}:${c.label}:${c.minHabitable}`), olds = O.SURVEY_CLASSES.map(c => c.minHabitable);
    const stale = ["resources/destination-survey/destination-survey.js", "resources/destination-survey/destination-survey.css", "resources/destination-survey/survey-data.js"].filter(f => /["'=]\s*(stable|volatile)\b|--stable|--volatile|"Stable|"Volatile|Stable, Volatile/.test(read(f)));
    fs.rmSync(tmp, { recursive: true, force: true });
    PROOF.node.surveyClasses = { classes: cls, oldThresholds: olds, sampled: n, identicalClassification: same };
    check(J(cls) === J(["favorable:Favorable:0.35", "precarious:Precarious:0.2", "extreme:Extreme:0"]) && J(olds) === J([0.35, 0.2, 0]) && same === n && !stale.length && N.SURVEY_CLASSES.length === 3,
      "S6 · the Destination Survey's difficulty axis is FAVORABLE / PRECARIOUS / EXTREME (ids favorable / precarious / extreme): the same thresholds (35 % / 20 % / 0) and, over a 0…100 % habitable sweep, the same classification as Stable / Volatile / Extreme on f5623d7; no stable / volatile class id is left in the survey's code or styles (the Volatile Climate challenge keeps its own word)",
      `${J(cls)} · ${same}/${n} identical · stale ${J(stale)}`); }
  // S7 · the Spread room explains an absent Reach category; the survey and the title wording
  { const dr = read("resources/run-ui/decision-rooms.js"), ds = read("resources/destination-survey/destination-survey.js"), mm = read("resources/main-menu/main-menu.js");
    check(/const CAT_ABSENT = \{ Reach: "No Reach upgrades on this world: there is no water gap your seeds would need to cross\." \};/.test(dr) && /absentNote:/.test(dr)
      && /<span class="ds-kicker">Strange Bloom<\/span><h1>Destination Survey<\/h1>/.test(ds) && !/BLOOM · Expedition planning/.test(ds)
      && /\{ id: "begin", label: "Expedition", primary: true \}/.test(mm) && !/label: "Begin Expedition"/.test(mm),
      "S7 · product wording: the title's main action is EXPEDITION (the survey's own button keeps \"Begin expedition\"); the survey kicker reads Strange Bloom over \"Destination Survey\" (no \"BLOOM · Expedition planning\"); the Spread room explains a Reach category the world does not offer instead of dropping it silently");
  }
  // S8 · the portable runtime: deterministic, current, no handoff code; the module list
  { const { buildPortable, BUNDLE, MANIFEST } = await import("file://" + path.join(ROOT, "tools/build-portable.mjs"));
    const a = await buildPortable(ROOT), b = await buildPortable(ROOT);
    const det = Object.keys(a.files).every(k => a.files[k].equals(b.files[k])), cur = Object.entries(a.files).every(([k, v]) => fs.existsSync(path.join(ROOT, k)) && fs.readFileSync(path.join(ROOT, k)).equals(v));
    const text = a.files[BUNDLE].toString("utf8"), handoff = /strange-bloom\.handoffs|expedition-handoff|transportOf|MAX_HANDOFFS|window\.name/.test(text);
    PROOF.node.portable = { fingerprint: a.manifest.fingerprint, bytes: a.manifest.output.bytes, sha256: a.manifest.output.sha256, modules: a.manifest.modules, inputs: a.manifest.inputs.length };
    check(det && cur && !handoff && a.manifest.modules.includes("resources/app/app-controller.js") && !a.manifest.modules.some(m => /main-menu-page|expedition/.test(m)),
      "S8 · the portable runtime (file://) rebuilds DETERMINISTICALLY (two clean in-memory builds byte-identical), equals the committed dist/portable/, bundles the app (resources/app/app-controller.js) and carries no handoff code (no token store, no window.name transport)",
      `fingerprint ${a.manifest.fingerprint.slice(0, 16)}… · ${a.manifest.output.bytes} B · modules ${J(a.manifest.modules)}`); }
  // S10 · the training layer loads only for training: the harness only for ?training=1, the app only on TRAINING (an expedition never loads it)
  { const dr = strip(read("demos/demo-run.html")), app = strip(read("resources/app/app-controller.js"));
    const harness = /if\(BLOOM_RUN\.training\) BLOOM\.modules\.load\(new URL\("\.\.\/resources\/training\/training-run\.js",location\.href\)\.href\)/.test(dr) && (dr.match(/training-run\.js/g) || []).length === 1;
    const lazy = /const loadTraining = \(\) => trainingModule \|\| \(trainingModule = /.test(app) && !/^import[^\n]*training-run/m.test(app) && /T = run\.training \? await loadTraining\(\) : null/.test(app);
    check(harness && lazy, "S10 · the training layer (coach, director, lessons) is loaded only for training: the harness for ?training=1, the app on the first TRAINING (lazily; an expedition never loads it)"); }
  // S11 · current documentation reconciled (historical milestone documents keep their history, with a pointer)
  { const D = f => fs.existsSync(path.join(ROOT, f)) ? read(f) : "", pd = D("docs/PRODUCT_DIRECTION_CURRENT.md"), readme = D("README.md"), bible = D("GAME_BIBLE.md"), rc = D("docs/RELEASE_CANDIDATE_v1.md"), dev = D("docs/DEVELOPMENT_NOTES.md"), app = D("docs/SINGLE_DOCUMENT_APP_v1.md");
    const links = [readme, bible, dev, rc].every(t => t.includes("PRODUCT_DIRECTION_CURRENT.md"));
    const status = ["LOCKED DESIGN", "IMPLEMENTED", "PLANNED"].every(w => pd.includes(w)) && /this file wins/.test(pd) && /BLOOM-034/.test(pd) && /BLOOM-035/.test(pd) && /BLOOM-036/.test(pd) && /Source: GitHub Actions/.test(pd);
    const records = /`index\.html` is the \*\*only\*\* player-facing document/.test(app) && /developer harness/.test(app) && /`default`/.test(pd) && /FAVORABLE · PRECARIOUS · EXTREME/.test(pd);
    const noStale = !/Next up: the plant's visual evolution|press \*\*Begin Expedition\*\*|\*\*Stable\*\*|\*\*Volatile\*\*/.test(readme) && /Milestone-era document/.test(rc) && /Current status \(2026-10-10, BLOOM-033\)/.test(bible);
    const honest = !/Species (exist|are implemented)|Challenges (exist|are implemented)|BLOOM-034 (has begun|is in progress)/i.test(pd);
    check(links && status && records && noStale && honest, "S11 · current docs reconciled: docs/PRODUCT_DIRECTION_CURRENT.md (LOCKED DESIGN / IMPLEMENTED / PLANNED; it wins about the current direction; the ordered roadmap BLOOM-034 → 035 → species art → 036 → final hardening; Pages = the owner's one-time setting) is linked from README, GAME_BIBLE, DEVELOPMENT_NOTES and RELEASE_CANDIDATE; index.html = the production app, demo-run.html = developer harness, default, Favorable / Precarious / Extreme recorded; README's stale lines gone; no claim that species, Challenges or BLOOM-034 exist",
      J({ links, status, records, noStale, honest })); }
  // S9 · the Pages site: the one production document and what it loads
  let SITE_DIR = null;
  { const { buildSite } = await import("file://" + path.join(ROOT, "tools/build-pages-site.mjs"));
    SITE_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "bloom033-site-")); const files = buildSite(ROOT, SITE_DIR);
    const html = files.filter(f => f.endsWith(".html"));
    check(J(html) === J(["index.html"]) && !files.some(f => /^(demos|dist|docs|tools)\//.test(f)) && files.includes("resources/run/game-session.js") && files.includes("resources/app/app-controller.js"),
      "S9 · the static GitHub Pages site (tools/build-pages-site.mjs) is the ONE production document (index.html, its only HTML) and the content / planets / resources it loads — no developer harness, no portable bundle, docs or tools; no server-side requirement",
      `${files.length} files · html ${J(html)}`); }

  // ================================================================================================ BROWSER
  let pw; try { pw = require("playwright"); } catch (e) { check(false, "playwright", "not installed: NODE_PATH=\"$(npm root -g)\""); return done(); }
  // the static server: "/" → the repository (index.html at "/"), "/bloom/" → the Pages site (a project subpath); every request logged
  const REQ = [];
  const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml" };
  const srv = http.createServer((req, res) => {
    const u = new URL(req.url, "http://x"); REQ.push(u.pathname + u.search);
    let base = ROOT, p = decodeURIComponent(u.pathname);
    if (p === "/bloom") { res.writeHead(301, { Location: "/bloom/" }); return res.end(); }
    if (p.startsWith("/bloom/")) { base = SITE_DIR; p = p.slice("/bloom".length); }
    if (p.endsWith("/")) p += "index.html";
    const f = path.join(base, p); if (!f.startsWith(base) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end("not found"); }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream", "Cache-Control": "no-store" }); fs.createReadStream(f).pipe(res);
  });
  await new Promise(r => srv.listen(0, "127.0.0.1", r)); const PORT = srv.address().port, ORIGIN = `http://127.0.0.1:${PORT}`;
  const FILE_INDEX = "file://" + encodeURI(path.join(ROOT, "index.html"));
  if (EVIDENCE) fs.mkdirSync(EVD, { recursive: true });
  const SD = await import("file://" + path.join(ROOT, "resources/destination-survey/survey-data.js"));   // the survey's own identity algorithm

  for (const bn of BROWSERS) {
    const browser = await pw[bn].launch(); const ver = browser.version();
    console.log(`\n# ${bn} ${ver}`); const B = PROOF.browsers[bn] = { version: ver };
    const shot = async (p, name) => { if (EVIDENCE && bn === "chromium") await p.screenshot({ path: path.join(EVD, name) }); };
    try {
      // ------------------------------------------------------------------ context / page helpers
      const context = async ({ blockStorage = false, trained = true, reducedMotion = null, offline = false } = {}) => {
        const c = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...(reducedMotion ? { reducedMotion } : {}) });
        if (offline) await c.setOffline(true);
        await c.addInitScript(({ blockStorage, trained }) => {
          window.__QA = { name0: window.name, sets: [], blocked: blockStorage, gen: null, workers: 0 };
          if (blockStorage) { for (const k of ["localStorage", "sessionStorage"]) Object.defineProperty(window, k, { configurable: true, get() { throw new DOMException("storage blocked (QA)", "SecurityError"); } }); }
          else { const set = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { window.__QA.sets.push({ k, bytes: String(v).length, session: this === sessionStorage }); return set.call(this, k, v); };
            if (trained) try { localStorage.setItem("strange-bloom.training", '{"v":1,"status":"completed","at":1}'); } catch (e) { /* none */ } }
          const W = window.Worker; window.Worker = function (...a) { window.__QA.workers++; return new W(...a); }; window.Worker.prototype = W.prototype;
        }, { blockStorage, trained });
        return c;
      };
      const page = async c => { const p = await c.newPage(); p.errs = []; p.navs = 0; p.reqs = [];
        p.on("pageerror", e => p.errs.push("pageerror: " + e.message)); p.on("console", m => { if (m.type() === "error") p.errs.push("console: " + m.text()); });
        p.on("framenavigated", f => { if (f === p.mainFrame()) p.navs++; }); p.on("request", r => p.reqs.push(r.url())); p.on("dialog", d => d.accept()); return p; };
      const menuReady = p => p.waitForFunction(() => window.MENU_DEV && MENU_DEV.ready && MENU_DEV.entry.state === "menu", null, { timeout: 60000, polling: 100 });
      const surveyReady = p => p.waitForFunction(() => { const s = MENU_DEV.entry.survey; return s && s.state === "survey" && s.cells.every(Boolean); }, null, { timeout: 120000, polling: 100 });
      const runReady = (p, n) => p.waitForFunction(n => window.BLOOM_APP && BLOOM_APP.session && BLOOM_APP.stats.sessions.length >= n && BLOOM_APP.stats.sessions[n - 1].readyMs !== null && !BLOOM_APP.busy
        && !document.querySelector(".atx") && MENU_DEV.entry.state === "away", n, { timeout: 60000, polling: 50 });
      const frames = (p, n = 2) => p.evaluate(n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
      const armGen = p => p.evaluate(G => { const B = window.BLOOM, c = window.__QA.gen = {}; window.__QA.workers0 = window.__QA.workers;
        for (const [n, ns] of G) { const o = ns ? B[ns] : B; if (!o || typeof o[n] !== "function") { c[n] = "missing"; continue; } c[n] = 0; const f = o[n]; try { o[n] = function (...a) { c[n]++; return f.apply(this, a); }; } catch (e) { c[n] = "frozen"; } } return c; }, GEN);
      const genCounts = p => p.evaluate(() => ({ gen: window.__QA.gen, workers: window.__QA.workers - (window.__QA.workers0 || 0) }));
      const pick = async (p, i) => {               // focus cell i; remember the exact candidate objects
        await p.evaluate(i => { const s = MENU_DEV.entry.survey, c = s.cells[i]; window.__pick = { planet: c.planet, render: c.render, json: JSON.stringify(c.planet), fingerprint: c.fingerprint, key: c.key, classId: c.classId, name: c.name }; s.select(i); }, i);
        await p.waitForFunction(() => MENU_DEV.entry.survey.state === "focus", null, { timeout: 20000, polling: 50 }); };
      // (the fingerprint is recomputed HERE, in Node, from the session planet's own JSON with the survey's algorithm — independent of the page)
      const identity = async p => { const r = await p.evaluate(() => { const S = BLOOM_APP.session, k = window.__pick, A = S.adapter, src = A.surface();
        return { same: S.planet === k.planet, json: JSON.stringify(S.planet) === k.json, planetJson: JSON.stringify(S.planet), fpSurvey: k.fingerprint, fpDepart: BLOOM_APP.stats.departures.at(-1).fingerprint, renderSame: S.run.render === k.render,
          surface: J2(src.render) === J2(k.render || null) && src.planet.id === k.planet.id && src.planet.gridWidth === k.planet.gridWidth && src.planet.gridHeight === k.planet.gridHeight
            && J2(src.planet.sections.map(x => [x.id, x.local.tempOffset, x.local.moistureOffset])) === J2(k.planet.sections.map(x => [x.id, x.local.tempOffset, x.local.moistureOffset])) && J2(src.planet.globalClimate) === J2(k.planet.globalClimate),
          scenario: A.run().scenarioId, kind: S.run.kind, title: document.title, key: S.run.expedition.candidateKey === k.key, seedProv: S.run.expedition.seed };
        function J2(x) { return JSON.stringify(x === undefined ? null : x); } });
        r.fp = SD.planetFingerprint(JSON.parse(r.planetJson)); delete r.planetJson; return r; };
      const dom = p => p.evaluate(() => ({ pv: document.querySelectorAll("#pv").length, dr: document.querySelectorAll("#dr").length, rr: document.querySelectorAll("#rr").length,
        shell: document.querySelectorAll("#shellHeader, #shop, #inspect, #cv, #reportModal, #bloomUI, body > header, body > main, body > footer").length, iframes: document.querySelectorAll("iframe, frame, object, embed").length,
        specimens: BLOOM.plantSpecimen ? BLOOM.plantSpecimen.mounted().length : null, path: location.pathname, href: location.href, ui18: document.documentElement.classList.contains("ui18") }));
      const winNow = p => p.evaluate(() => { const s = BLOOM_API.sim; BLOOM_API.advance(40); s.won = true; s.onWin(s.coverage()); });   // the run's own win path (QA shortcut; the engine is untouched)
      const reportOpen = p => p.waitForFunction(() => BLOOM.runReport.instance && BLOOM.runReport.instance.state().open && !BLOOM.runReport.instance.state().busy, null, { timeout: 20000, polling: 30 });
      const menuAct = async (p, id) => { await p.click("#pvMenuBtn"); await p.click(`#pvMenu [data-act="${id}"]`); };
      const audit = (p, url0) => p.evaluate(u0 => ({ href: location.href, same: location.href === u0, name: window.name, name0: window.__QA.name0, sets: window.__QA.sets, devErrors: MENU_DEV.errors.slice() }), url0);
      const urlsBad = (urls) => urls.filter(u => /demo-run|expedition=|[?&](planet|token)=|handoff/.test(u) || (u.startsWith("http") && !u.startsWith(ORIGIN)));

      // ------------------------------------------------------------------ F · the root flow over HTTP
      { const c = await context(), p = await page(c), U = `${ORIGIN}/?sector=77&workers=3&bg=3`; REQ.length = 0;
        await p.goto(U); await menuReady(p);
        const t = await p.evaluate(() => ({ items: [...document.querySelectorAll(".mm-item")].map(b => b.innerText.trim()), title: document.title, state: MENU_DEV.entry.state, run: !!document.getElementById("pv"), boot: BLOOM_TITLE_BOOT.state }));
        check(J(t.items) === J(["EXPEDITION", "TRAINING", "SETTINGS", "CREDITS"]) && t.title === "Strange Bloom — Unknown Soils" && !t.run && t.boot === "mounted",
          `[${bn}] F1 · GET / is the title: EXPEDITION · TRAINING · SETTINGS · CREDITS ("Begin Expedition" is now the survey's decision), no run mounted`, J(t.items));
        if (EVIDENCE && bn === "chromium") await sleep(2500);   // the title's entrance (painting, plaque, menu) has settled before the still
        await shot(p, "01-title.png");
        await p.click('.mm-item[data-act="begin"]'); await surveyReady(p);
        const s = await p.evaluate(() => { const S = MENU_DEV.entry.survey, cl = ["favorable", "precarious", "extreme"];
          return { n: S.cells.filter(Boolean).length, cols: S.cells.map((c, i) => c.classId === cl[i % 3]), valid: S.cells.every(c => c.authored || (c.validation.validated && c.planet.archetype.validatedLayers.join() === "1,2,3,4,5,6,7,8")),
            dom: [...document.querySelectorAll(".ds-cell")].map(e => e.dataset.class), kicker: document.querySelector(".ds-kicker").textContent, h1: document.querySelector(".ds-title h1").textContent,
            text: document.querySelector(".ds").innerText, aria: document.querySelector(".ds-grid").getAttribute("aria-label"), seed: S.sectorSeed }; });
        check(s.n === 9 && s.cols.every(Boolean) && s.valid && J(s.dom) === J(["favorable", "precarious", "extreme", "favorable", "precarious", "extreme", "favorable", "precarious", "extreme"])
          && s.kicker === "Strange Bloom" && s.h1 === "Destination Survey" && /Favorable, Precarious and Extreme/.test(s.aria) && !/\b(Stable|Volatile)\b|Expedition planning/i.test(s.text),
          `[${bn}] F2 · EXPEDITION → the Destination Survey inside index.html: nine validated worlds (layers 1–8), columns FAVORABLE · PRECARIOUS · EXTREME (each cell of its column's class), "Strange Bloom · Destination Survey" (no Stable / Volatile / "Expedition planning")`,
          `sector ${s.seed} · ${s.dom.join(",")} · "${s.aria}"`);
        await shot(p, "02-survey.png");
        await pick(p, 4);
        const fo = await p.evaluate(() => { const S = MENU_DEV.entry.survey; return { title: S.dossierTitle.textContent, cls: S.root.dataset.class, name: window.__pick.name, cell: window.__pick.classId }; });
        check(fo.title === fo.name && fo.cls === fo.cell, `[${bn}] F3 · focus / detail: the dossier names the selected world and carries its class`, `${fo.title} · ${fo.cls}`);
        await shot(p, "03-world-focus.png");
        const before = await armGen(p); const navs0 = p.navs;
        await p.click(".ds-btn.go"); await runReady(p, 1);
        const id1 = await identity(p), g1 = await genCounts(p), d1 = await dom(p), dep = await p.evaluate(() => { const d = BLOOM_APP.stats.departures[0]; return { concealed: d.concealed, phaseRun: MENU_DEV.results[0] && MENU_DEV.results[0].transition && MENU_DEV.results[0].transition.preset, planetIsSelected: d.planetIsSelected, sessionAt: d.sessionAt, at: d.at }; });
        B.identity = { first: id1, gen: g1 };
        check(dep.concealed === true && dep.phaseRun === "dramatic" && dep.planetIsSelected && p.navs === navs0,
          `[${bn}] F4 · Begin Expedition plays the DRAMATIC departure; under its FULL cover the run is created inside the same document (no navigation)`, J(dep));
        check(id1.same && id1.json && id1.fp === id1.fpSurvey && id1.fp === id1.fpDepart && id1.renderSame && id1.surface && id1.key && id1.scenario === "default" && id1.kind === (id1.seedProv === null ? "authored" : "procedural"),
          `[${bn}] F5 · EXACT PLANET: the GameSession's planet IS the selected detail.planet (the same object; JSON equal; planetFingerprint unchanged = the survey's = the departure's), the same render hints, the canonical surface built from it; default scenario`,
          `fingerprint ${id1.fp} · ${id1.title}`);
        check(Object.values(before).every(v => v === 0) && Object.values(g1.gen).every(v => v === 0) && g1.workers === 0,
          `[${bn}] F6 · after the selection NOTHING is generated: generateFromArchetype / generatePlanet / attemptPlanet / searchWorld / runSearch called 0 times, no worker started`, J(g1));
        check(d1.pv === 1 && d1.shell === 0 && d1.iframes === 0 && d1.ui18 && d1.path === "/" && d1.href === U,
          `[${bn}] F7 · the run is mounted in index.html WITHOUT navigation: one production Planet View, NO engineering shell in the DOM (visible or hidden), no iframe, the address unchanged`, J(d1));
        await shot(p, "05-run-same-document.png");
        // rooms
        const room = async name => { await p.click(`.pv-tool[data-tool="${name}"]`); await p.waitForFunction(n => BLOOM.decisionRooms.instance.state().room === n && !BLOOM.decisionRooms.instance.state().transitioning, name, { timeout: 15000, polling: 30 }); await frames(p, 3); };
        const back = async () => { await p.keyboard.press("Escape"); await p.waitForFunction(() => !BLOOM.decisionRooms.instance.state().room && !BLOOM.decisionRooms.instance.state().transitioning, null, { timeout: 15000, polling: 30 }); };
        await p.evaluate(() => BLOOM_API.addBiomass(2000));
        await room("region"); const rr = await p.evaluate(() => BLOOM.decisionRooms.instance.state().room); await back();
        await room("adapt");
        const ad = await p.evaluate(() => { const sp = BLOOM.plantSpecimen.mounted(); return { packs: [...new Set(sp.map(x => x.pack))], renderer: BLOOM.plantSpecimen.renderer, visible: sp.filter(x => x.el.isConnected && x.el.getClientRects().length && !x.el.closest("[hidden]")).length }; });
        await shot(p, "06-adapt.png");
        const buyId = await p.evaluate(() => { const b = BLOOM_RUN_UI.adapter.upgrades().find(x => x.board === "Adapt"); const u = b.items.find(x => x.canBuy); return u ? u.id : null; });
        const tier0 = await p.evaluate(id => BLOOM_RUN_UI.adapter.upgrade(id).tier, buyId);
        await p.evaluate(() => { window.__buys = 0; document.addEventListener("bloom:upgrade-purchase", () => { window.__buys++; }); });
        await p.click(`#dr [data-node="${buyId}"]`); await frames(p, 4);
        const tier1 = await p.evaluate(id => ({ tier: BLOOM_RUN_UI.adapter.upgrade(id).tier, buys: window.__buys }), buyId);
        await back();
        await room("spread"); const sp = await p.evaluate(() => { const m = BLOOM.decisionRooms.instance.measure("spread"), A = BLOOM_RUN_UI.adapter, items = A.upgrades().find(b => b.board === "Spread").items.map(u => u.id);
          const note = document.querySelector('#dr .dr-room[data-room="spread"] .cat-absent'); return { cats: m.categories, note: m.absentNote, shown: !!(note && !note.hidden && note.getClientRects().length), items }; });
        await back();
        await room("terraform"); await p.waitForFunction(() => BLOOM.decisionRooms.instance.state().globe !== "pending", null, { timeout: 20000, polling: 50 }); await frames(p, 4);
        const tg = await p.evaluate(() => { const t = BLOOM.decisionRooms.instance.rooms.terraform, src = t.source(), g = BLOOM.decisionRooms.instance.state().globe; return { kind: g, id: src && src.planet ? src.planet.id : null, want: BLOOM_APP.session.planet.id }; });
        await shot(p, "07-terraform.png"); await back();
        const reachOk = sp.items.includes("waterSeeds") ? sp.note === null && sp.cats.includes("Reach") : (sp.note === "No Reach upgrades on this world: there is no water gap your seeds would need to cross." && sp.shown && !sp.cats.includes("Reach"));
        check(rr === "region" && J(ad.packs) === J(["organic-hybrid"]) && ad.renderer === "organic-hybrid-sprite" && ad.visible >= 1 && buyId && tier1.tier === tier0 + 1 && tier1.buys === 1 && reachOk && tg.kind === "sphere" && tg.id === tg.want,
          `[${bn}] F8 · on the selected planet: Region Inspect, Adapt (the Organic Hybrid sprite specimen), a REAL purchase through the room's node (tier +1, one bloom:upgrade-purchase), Spread (Reach shown only where Waterborne Seeds is offered, else the explanatory note), Terraform (the unmodified sphere shows THIS planet)`,
          `bought ${buyId} ${tier0}→${tier1.tier} · spread ${J(sp.cats)} note ${sp.note ? "shown" : "none"} · globe ${tg.kind} ${tg.id}`);
        await winNow(p); await reportOpen(p); await frames(p, 3);
        const rep = await p.evaluate(() => { const A = BLOOM_RUN_UI.adapter, d = A.report(); return { kind: d.kind, acts: A.reportActions().map(a => a.id), shown: BLOOM.runReport.instance.state().actions, scen: d.identity.scenarioId, text: document.getElementById("rrCard").innerText }; });
        check(rep.kind === "win" && J(rep.acts) === J(["keepPlaying", "playAgain", "choosePlanet", "mainMenu"]) && rep.scen === "default" && !/\bEden\b|Default scenario/i.test(rep.text),
          `[${bn}] F9 · the Bloom Report (part of the run): Keep playing · Play again · Choose another planet · Main menu; default scenario, never named "Eden" or "Default scenario" to the player`, J(rep.acts));
        await shot(p, "08-report.png");
        const spec1 = d1.specimens;
        await p.click('#rr [data-act="playAgain"]'); await runReady(p, 2);
        const id2 = await identity(p), d2 = await dom(p), g2 = await genCounts(p), fresh = await p.evaluate(() => ({ ticks: BLOOM_API.state().ticks, won: BLOOM_API.sim.won, owned: BLOOM_RUN_UI.adapter.upgrades().flatMap(b => b.items).filter(u => u.owned).length, sessions: BLOOM_APP.stats.sessions.length, report: BLOOM.runReport.instance.state().open, prevDisposed: true }));
        check(id2.same && id2.json && id2.fp === id1.fp && fresh.ticks < 30 && !fresh.won && fresh.owned === 0 && !fresh.report && d2.pv === 1 && d2.dr === 1 && d2.rr === 1 && d2.specimens === spec1 && d2.shell === 0 && Object.values(g2.gen).every(v => v === 0) && g2.workers === 0 && d2.href === U,
          `[${bn}] F10 · Play Again: a FRESH simulation (tick ~0, nothing owned, no report) on the SAME planet object (JSON, fingerprint), default scenario; the previous session fully disposed (one view / rooms / report, the same specimen count — nothing accumulates); still nothing generated, no page load`,
          `ticks ${fresh.ticks} · specimens ${spec1}→${d2.specimens} · navs ${p.navs}`);
        await menuAct(p, "choosePlanet"); await p.waitForFunction(() => !BLOOM_APP.session && MENU_DEV.entry.state === "survey", null, { timeout: 60000, polling: 100 }); await surveyReady(p);
        const cs = await p.evaluate(() => ({ seed: MENU_DEV.entry.survey.sectorSeed, pv: !!document.getElementById("pv"), dr: !!document.getElementById("dr"), title: document.title, specimens: BLOOM.plantSpecimen.mounted().length, run: window.BLOOM_RUN, api: window.BLOOM_API }));
        check(cs.seed !== 77 && !cs.pv && !cs.dr && cs.specimens === 0 && cs.run === null && cs.api === null && cs.title === "Strange Bloom — Unknown Soils" && p.navs === 1,
          `[${bn}] F11 · Choose Another Planet → the Destination Survey inside index.html, scanning a fresh sector; the run is gone (no view, no rooms, no specimens, the run globals withdrawn)`, `sector ${cs.seed}`);
        await shot(p, "09-back-to-survey.png");
        await pick(p, 2); await armGen(p); await p.click(".ds-btn.go"); await runReady(p, 3);
        const id3 = await identity(p), g3 = await genCounts(p);
        check(id3.same && id3.json && id3.fp === id3.fpSurvey && id3.fp !== id1.fp && Object.values(g3.gen).every(v => v === 0) && g3.workers === 0,
          `[${bn}] F12 · a second world from the new sector: again the exact selected planet object, nothing generated after the selection`, `${id3.title} · ${id3.fp}`);
        await menuAct(p, "mainMenu"); await p.waitForFunction(() => !BLOOM_APP.session && MENU_DEV.entry.state === "menu", null, { timeout: 30000, polling: 100 });
        const mm = await p.evaluate(() => ({ title: document.title, items: document.querySelectorAll(".mm-item").length, focus: document.activeElement && document.activeElement.dataset.act, prefetch: !!MENU_DEV.entry.prefetch }));
        check(mm.title === "Strange Bloom — Unknown Soils" && mm.items === 4 && mm.focus === "begin" && mm.prefetch, `[${bn}] F13 · Main Menu → the title inside index.html (focus on EXPEDITION, a fresh sector prefetching)`, J(mm));
        // Training: every return path
        const trainReady = n => p.waitForFunction(n => window.BLOOM_TRAINING_UI && BLOOM_TRAINING_UI.stats.liftedAt && BLOOM_TRAINING_UI.guide.mounted && BLOOM_APP.stats.sessions.length >= n && !BLOOM_APP.busy, n, { timeout: 30000, polling: 50 });
        await p.click('.mm-item[data-act="training"]'); await trainReady(4);
        const tr1 = await p.evaluate(() => ({ planet: BLOOM_RUN.planet.id, training: !!BLOOM_RUN.training, coach: !!document.querySelector(".tc-card"), href: location.href, ticks: BLOOM_API.state().ticks, running: BLOOM_API.state().running }));
        await p.waitForFunction(() => { const c = document.querySelector(".tc-card"); return c && !c.getAnimations().length && getComputedStyle(c).opacity === "1"; }, null, { timeout: 10000 }).catch(() => {}); await frames(p, 2);   // the coach's callout has settled
        await shot(p, "10-training.png");
        await menuAct(p, "restartTraining"); await trainReady(5);
        const tr2 = await p.evaluate(() => ({ sessions: BLOOM_APP.stats.sessions.length, pv: document.querySelectorAll("#pv").length, coaches: document.querySelectorAll(".tc-card").length, lesson: BLOOM_TRAINING_UI.guide.director.index }));
        await menuAct(p, "skipTraining"); await p.waitForSelector(".tsk [data-skip=skip]", { timeout: 10000 }); const asked = await p.evaluate(() => document.querySelector(".tsk h2").textContent);
        await p.click(".tsk [data-skip=skip]"); await p.waitForFunction(() => !BLOOM_APP.session && MENU_DEV.entry.state === "menu", null, { timeout: 30000, polling: 100 });
        const sk = await p.evaluate(() => ({ rec: JSON.parse(localStorage.getItem("strange-bloom.training")).status, coach: document.querySelectorAll(".tc-card, .tsk").length, ui: window.BLOOM_TRAINING_UI }));
        await p.click('.mm-item[data-act="training"]'); await trainReady(6);
        await menuAct(p, "mainMenu"); await p.waitForFunction(() => !BLOOM_APP.session && MENU_DEV.entry.state === "menu", null, { timeout: 30000, polling: 100 });
        await p.click('.mm-item[data-act="training"]'); await trainReady(7);
        await winNow(p); await reportOpen(p);
        const tacts = await p.evaluate(() => BLOOM.runReport.instance.state().actions);
        await p.click('#rr [data-act="beginExpedition"]'); await p.waitForFunction(() => !BLOOM_APP.session && MENU_DEV.entry.state === "survey", null, { timeout: 60000, polling: 100 });
        const be = await p.evaluate(() => ({ rec: JSON.parse(localStorage.getItem("strange-bloom.training")).status, survey: !!MENU_DEV.entry.survey }));
        check(tr1.planet === "training_grounds" && tr1.training && tr1.coach && !tr1.running && tr2.sessions === 5 && tr2.pv === 1 && tr2.coaches === 1 && asked === "Skip training?" && sk.rec === "completed" && sk.coach === 0 && sk.ui === null
          && J(tacts) === J(["beginExpedition", "restartTraining", "mainMenu"]) && be.rec === "completed" && be.survey && p.navs === 1,
          `[${bn}] F14 · TRAINING is a run configuration inside index.html: the training world, paused, the guided coach; Restart Training (a fresh training session, one coach); Skip Training (its one confirmation; a completed training is never downgraded; back to the title, no coach left); Main Menu; the finished training's Begin Expedition · Restart training · Main menu → Begin Expedition opens the survey (records "completed") — one document load for all of it`,
          `restart lesson ${tr2.lesson} · skip asked "${asked}" · training report ${J(tacts)}`);
        const au = await audit(p, U), bad = urlsBad(p.reqs).concat(REQ.filter(r => /demo-run|expedition=|handoff/.test(r))), html = REQ.filter(r => /\.html(\?|$)|\/(\?|$)/.test(r));
        const planetStored = au.sets.filter(s => !/^strange-bloom\.(training|settings|menu\.)/.test(s.k) || s.bytes > 400);
        B.flow = { navs: p.navs, html, sets: au.sets.map(s => s.k), name: au.name };
        check(p.navs === 1 && au.same && J(html) === J(["/?sector=77&workers=3&bg=3"]) && !bad.length && au.name === "" && au.name0 === "" && !planetStored.length,
          `[${bn}] F15 · across title → survey → run → report → Play Again → Choose Another Planet → a second run → Main Menu → Training (all paths): ONE document load, the address never changed (no token, no planet payload), demos/demo-run.html never requested (page or server), no other HTML document, window.name untouched (""), and nothing but the settings / training record / painting in storage`,
          `html ${J(html)} · storage keys ${J([...new Set(au.sets.map(s => s.k))])} · bad ${J(bad.slice(0, 3))}`);
        check(!p.errs.length && !au.devErrors.length, `[${bn}] F16 · no console error and no unhandled rejection in the whole flow`, J(p.errs.concat(au.devErrors).slice(0, 4)));
        await c.close(); }

      // ------------------------------------------------------------------ the departure, covered (evidence still + the cover order)
      { const c = await context(), p = await page(c); await p.goto(`${ORIGIN}/?sector=77&workers=3&bg=3&hold=1500`); await menuReady(p);
        await p.click('.mm-item[data-act="begin"]'); await surveyReady(p); await pick(p, 0);
        await p.click(".ds-btn.go");
        await p.waitForFunction(() => { const o = document.querySelector(".atx"); return o && o.dataset.atxPhase === "covered" && BLOOM_APP.stats.departures.length; }, null, { timeout: 20000, polling: 30 });
        const cov = await p.evaluate(() => { const v = document.querySelector(".atx-veil"); return { phase: document.querySelector(".atx").dataset.atxPhase, veil: v ? +getComputedStyle(v).opacity : null, pv: !!document.getElementById("pv") }; });
        await shot(p, "04-departure-covered.png");
        await runReady(p, 1);
        check(cov.phase === "covered" && cov.veil >= 0.99 && !cov.pv && !p.errs.length, `[${bn}] F17 · the departure covers fully BEFORE the run exists (the run is built under the DRAMATIC cover, then the clouds part over it)`, J(cov));
        await c.close(); }

      // ------------------------------------------------------------------ B · storage blocked
      { const c = await context({ blockStorage: true }), p = await page(c), U = `${ORIGIN}/?sector=77&workers=3`; await p.goto(U); await menuReady(p);
        const blocked = await p.evaluate(() => { let a = false, b = false; try { localStorage.length; } catch (e) { a = true; } try { sessionStorage.length; } catch (e) { b = true; } return a && b; });
        await p.click('.mm-item[data-act="begin"]');
        const rec = await p.waitForFunction(() => document.querySelector('dialog[data-dialog="recommend"][open]') || (MENU_DEV.entry.survey && true), null, { timeout: 20000 }).then(() => p.evaluate(() => !!document.querySelector('dialog[data-dialog="recommend"][open]')));
        if (rec) await p.click('dialog[data-dialog="recommend"] [data-act="recommend-expedition"]');
        await surveyReady(p); await pick(p, 5); await armGen(p); await p.click(".ds-btn.go"); await runReady(p, 1);
        const id = await identity(p), g = await genCounts(p);
        await winNow(p); await reportOpen(p); await p.click('#rr [data-act="playAgain"]'); await runReady(p, 2); const id2 = await identity(p);
        check(blocked && id.same && id.json && id.fp === id.fpSurvey && id2.same && Object.values(g.gen).every(v => v === 0) && p.navs === 1 && !p.errs.length,
          `[${bn}] B1 · BOTH localStorage and sessionStorage blocked (every access throws): the exact selected planet still starts (planet transfer never touches storage), Play Again on the same planet; settings / the training record degrade as before (the first-run question: ${rec ? "asked" : "not asked"})`,
          `${id.title} · errors ${J(p.errs.slice(0, 2))}`);
        B.storageBlocked = { ok: id.same && id.json, fingerprint: id.fp, recommendAsked: rec };
        await c.close(); }

      // ------------------------------------------------------------------ P · file:// (offline)
      { const c = await context({ offline: true }), p = await page(c), U = `${FILE_INDEX}?sector=77&workers=3`; await p.goto(U); await menuReady(p);
        const bt = await p.evaluate(() => ({ portable: BLOOM_TITLE_BOOT.portable, rt: !!window.BLOOM_PORTABLE }));
        await p.click('.mm-item[data-act="begin"]'); await surveyReady(p); await pick(p, 1); await armGen(p); await p.click(".ds-btn.go"); await runReady(p, 1);
        const id = await identity(p), g = await genCounts(p);
        await winNow(p); await reportOpen(p); await p.click('#rr [data-act="playAgain"]'); await runReady(p, 2); const id2 = await identity(p);
        await menuAct(p, "mainMenu"); await p.waitForFunction(() => !BLOOM_APP.session && MENU_DEV.entry.state === "menu", null, { timeout: 30000, polling: 100 });
        const au = await audit(p, U), bad = p.reqs.filter(u => !u.startsWith("file:") && !u.startsWith("blob:") && !u.startsWith("data:")).concat(p.reqs.filter(u => /demo-run/.test(u)));
        check(bt.portable && bt.rt && id.same && id.json && id.fp === id.fpSurvey && id2.same && Object.values(g.gen).every(v => v === 0) && g.workers === 0 && p.navs === 1 && au.same && au.name === "" && !bad.length && !p.errs.length,
          `[${bn}] P1 · file:// (a double-clicked index.html), OFFLINE: the portable runtime boots the same app; title → survey → the exact planet → report → Play Again → Main Menu; the SAME index.html stays open (one load, the address unchanged), window.name untouched, no network request, no demo-run request`,
          `navs ${p.navs} · ${id.title} · non-file requests ${J(bad.slice(0, 3))}`);
        B.file = { ok: id.same, navs: p.navs, offline: true };
        await c.close(); }

      // ------------------------------------------------------------------ H · HTTP /bloom/ (the Pages artifact)
      { const c = await context(), p = await page(c), U = `${ORIGIN}/bloom/?sector=77&workers=3`; REQ.length = 0; await p.goto(U); await menuReady(p);
        await p.click('.mm-item[data-act="begin"]'); await surveyReady(p); await pick(p, 3); await armGen(p); await p.click(".ds-btn.go"); await runReady(p, 1);
        const id = await identity(p), d = await dom(p);
        await menuAct(p, "choosePlanet"); await p.waitForFunction(() => !BLOOM_APP.session && MENU_DEV.entry.state === "survey", null, { timeout: 60000, polling: 100 });
        await menuReady(p).catch(() => {}); const path1 = await p.evaluate(() => location.pathname);
        const outside = REQ.filter(r => !r.startsWith("/bloom/")), dr = REQ.filter(r => /demo-run/.test(r));
        check(id.same && id.json && d.path === "/bloom/" && path1 === "/bloom/" && !outside.length && !dr.length && p.navs === 1 && !p.errs.length,
          `[${bn}] H1 · HTTP /bloom/ (the static Pages site under a project subpath): the whole flow stays at /bloom/ (one load), every request under /bloom/, the exact planet, no demo-run (the site does not even ship it)`,
          `${REQ.length} requests · outside ${J(outside.slice(0, 3))}`);
        B.pages = { ok: id.same, path: path1 };
        await c.close(); }

      // ------------------------------------------------------------------ T · a first visit (no training record): the recommendation, Skip records "skipped"
      { const c = await context({ trained: false }), p = await page(c); await p.goto(`${ORIGIN}/?sector=77&workers=3`); await menuReady(p);
        const tag = await p.evaluate(() => MENU_DEV.entry.menu.trainingRecommended);
        await p.click('.mm-item[data-act="begin"]'); await p.waitForSelector('dialog[data-dialog="recommend"][open]', { timeout: 10000 });
        await p.keyboard.press("Escape"); await p.waitForFunction(() => !document.querySelector('dialog[data-dialog="recommend"][open]'), null, { timeout: 10000 });
        await p.click('.mm-item[data-act="training"]'); await p.waitForFunction(() => window.BLOOM_TRAINING_UI && BLOOM_TRAINING_UI.stats.liftedAt && BLOOM_TRAINING_UI.guide.mounted, null, { timeout: 30000, polling: 50 });
        await p.click(".tc-skip");   // the coach's own Skip Tutorial (the run menu's Skip training takes the same confirmed path: F14)
        await p.waitForSelector(".tsk [data-skip=skip]", { timeout: 10000 }); await p.click(".tsk [data-skip=skip]");
        await p.waitForFunction(() => !BLOOM_APP.session && MENU_DEV.entry.state === "menu", null, { timeout: 30000, polling: 100 });
        const after = await p.evaluate(() => ({ rec: JSON.parse(localStorage.getItem("strange-bloom.training")).status, tag: MENU_DEV.entry.menu.trainingRecommended }));
        await p.click('.mm-item[data-act="begin"]'); await surveyReady(p); const asked = await p.evaluate(() => !!document.querySelector('dialog[data-dialog="recommend"][open]'));
        check(tag && after.rec === "skipped" && !after.tag && !asked && p.navs === 1 && !p.errs.length,
          `[${bn}] T1 · a first visit (no training record): TRAINING carries "Recommended" and the first EXPEDITION asks once; Skip Training (confirmed) records "skipped", the tag goes, EXPEDITION then goes straight to the survey — all in index.html`, J(after));
        await c.close(); }

      // ------------------------------------------------------------------ M · reduced motion (the OS)
      { const c = await context({ reducedMotion: "reduce" }), p = await page(c); await p.goto(`${ORIGIN}/?sector=77&workers=3`); await menuReady(p);
        await p.click('.mm-item[data-act="begin"]'); await surveyReady(p); await pick(p, 6); await p.click(".ds-btn.go"); await runReady(p, 1);
        const rm = await p.evaluate(() => ({ dep: BLOOM_APP.stats.departures[0].reducedMotion, pv: document.getElementById("pv").classList.contains("reduced") }));
        const id = await identity(p);
        await menuAct(p, "mainMenu"); await p.waitForFunction(() => !BLOOM_APP.session && MENU_DEV.entry.state === "menu", null, { timeout: 30000, polling: 100 });
        await p.click('.mm-item[data-act="training"]'); await p.waitForFunction(() => window.BLOOM_TRAINING_UI && BLOOM_TRAINING_UI.stats.liftedAt, null, { timeout: 30000 });
        check(rm.dep === true && rm.pv && id.same && !p.errs.length, `[${bn}] M1 · reduced motion (the OS setting): the departure runs reduced, the run's view is reduced, the flow and training work`, J(rm));
        await c.close(); }

      // ------------------------------------------------------------------ K · keyboard only
      { const c = await context(), p = await page(c); await p.goto(`${ORIGIN}/?sector=77&workers=3`); await menuReady(p);
        let tabs = 0; while (tabs++ < 8 && await p.evaluate(() => !(document.activeElement && document.activeElement.dataset.act === "begin"))) await p.keyboard.press("Tab");
        const f0 = await p.evaluate(() => document.activeElement && document.activeElement.dataset.act);
        await p.keyboard.press("Enter"); await surveyReady(p);
        await p.evaluate(() => { const s = MENU_DEV.entry.survey, c = s.cells[7]; window.__pick = { planet: c.planet, render: c.render, json: JSON.stringify(c.planet), fingerprint: c.fingerprint, key: c.key }; document.querySelector('.ds-cand[data-index="7"]').focus(); });
        await p.keyboard.press("Enter"); await p.waitForFunction(() => MENU_DEV.entry.survey.state === "focus", null, { timeout: 20000 });
        await p.evaluate(() => document.querySelector(".ds-btn.go").focus()); await p.keyboard.press("Enter"); await runReady(p, 1);
        const id = await identity(p);
        await p.evaluate(() => document.querySelector('.pv-tool[data-tool="adapt"]').focus()); await p.keyboard.press("Enter");
        await p.waitForFunction(() => BLOOM.decisionRooms.instance.state().room === "adapt" && !BLOOM.decisionRooms.instance.state().transitioning, null, { timeout: 15000 });
        await p.keyboard.press("Escape"); await p.waitForFunction(() => !BLOOM.decisionRooms.instance.state().room && !BLOOM.decisionRooms.instance.state().transitioning, null, { timeout: 15000 });
        await winNow(p); await reportOpen(p);
        let k = 0; while (k++ < 12 && await p.evaluate(() => !(document.activeElement && document.activeElement.dataset && document.activeElement.dataset.act === "mainMenu"))) await p.keyboard.press("Tab");
        const onMenu = await p.evaluate(() => document.activeElement.dataset.act === "mainMenu" && document.getElementById("rr").contains(document.activeElement));
        await p.keyboard.press("Enter"); await p.waitForFunction(() => !BLOOM_APP.session && MENU_DEV.entry.state === "menu", null, { timeout: 30000, polling: 100 });
        check(f0 === "begin" && id.same && onMenu && !p.errs.length, `[${bn}] K1 · keyboard only: Tab to EXPEDITION, Enter → a survey cell → Begin Expedition → the exact planet → a room (Enter / Escape) → the report's focus trap → Main menu (Enter) → the title`, `Tab presses to Main menu ${k}`);
        await c.close(); }

      // ------------------------------------------------------------------ the developer harness stays a harness (same GameSession; developer paths)
      { const c = await context(), p = await page(c); REQ.length = 0;
        await p.goto(`${ORIGIN}/demos/demo-run.html`); await p.waitForFunction(() => window.BLOOM_RUN && BLOOM_RUN.started, null, { timeout: 20000 });
        const fb = await p.evaluate(() => { const A = BLOOM_RUN_UI.adapter, it = A.upgrades().find(b => b.board === "Spread").items.map(u => u.id); return { session: !!(window.BLOOM_SESSION && BLOOM_SESSION === BLOOM.gameSession.instance), shell: document.querySelectorAll("#shellHeader,#shop").length, items: it, planet: BLOOM_RUN.planet.id }; });
        await p.evaluate(() => BLOOM.planetView.instance.openRoom("spread")); await p.waitForFunction(() => BLOOM.decisionRooms.instance.state().room === "spread" && !BLOOM.decisionRooms.instance.state().transitioning, null, { timeout: 15000 });
        const fbNote = await p.evaluate(() => BLOOM.decisionRooms.instance.measure("spread").absentNote);
        await p.goto(`${ORIGIN}/demos/demo-run.html?archetype=ocean_archipelago&seed=13&scenario=default`); await p.waitForFunction(() => window.BLOOM_RUN && BLOOM_RUN.started, null, { timeout: 30000 });
        await p.evaluate(() => BLOOM.planetView.instance.openRoom("spread")); await p.waitForFunction(() => BLOOM.decisionRooms.instance.state().room === "spread" && !BLOOM.decisionRooms.instance.state().transitioning, null, { timeout: 15000 });
        const oc = await p.evaluate(() => ({ note: BLOOM.decisionRooms.instance.measure("spread").absentNote, cats: BLOOM.decisionRooms.instance.measure("spread").categories, scn: BLOOM_RUN.summary.scenarioId }));
        await p.goto(`${ORIGIN}/demos/demo-run.html?ui=legacy`); await p.waitForFunction(() => window.BLOOM_RUN && BLOOM_RUN.started, null, { timeout: 20000 });
        const lg = await p.evaluate(() => ({ shell: document.querySelectorAll("#shellHeader,#shop,#cv").length, pv: !!document.getElementById("pv"), draw: typeof draw, sel: typeof selected, devGlobals: BLOOM_HARNESS.devGlobals }));
        const scen = {};
        for (const s of ["dying_world", "native_competition", "volatile_climate"]) { await p.goto(`${ORIGIN}/demos/demo-run.html?play=1&archetype=desert_world&seed=25&scenario=${s}`).catch(() => {});
          await p.waitForFunction(() => window.BLOOM_RUN && (BLOOM_RUN.started || BLOOM_RUN.failed) || (window.BLOOM_PLAY_LOG && /failed|error/.test(BLOOM_PLAY_LOG.state)), null, { timeout: 120000, polling: 200 }).catch(() => {});
          scen[s] = await p.evaluate(() => window.BLOOM_RUN && BLOOM_RUN.started ? { id: BLOOM_RUN.scenario && BLOOM_RUN.scenario.id, press: !!BLOOM_API.sim.pressure.active, comp: !!BLOOM_API.sim.competition.enabled, clim: !!BLOOM_API.sim.climate.enabled } : { failed: true, log: window.BLOOM_PLAY_LOG && BLOOM_PLAY_LOG.state }); }
        check(fb.session && fb.shell === 0 && fb.planet === "first_bloom" && !fb.items.includes("waterSeeds") && fbNote === "No Reach upgrades on this world: there is no water gap your seeds would need to cross."
          && oc.note === null && oc.cats.includes("Reach") && oc.scn === "default" && lg.shell >= 3 && !lg.pv && lg.draw === "function" && lg.sel === "number"
          && scen.dying_world.press && scen.native_competition.comp && scen.volatile_climate.clim && !p.errs.length,
          `[${bn}] D1 · demos/demo-run.html stays a developer harness over the SAME GameSession: First Bloom (no water → the Spread room explains the missing Reach), Ocean Archipelago 13 with scenario=default (Reach offered, no note), ?ui=legacy (the historical shell + its bridged bindings), and Dying World / Native Competition / Volatile Climate fully functional through it`,
          `legacy dev globals ${lg.devGlobals} · scenarios ${J(scen)}`);
        await c.close(); }
    } catch (e) { check(false, `[${bn}] the browser flow ran to the end`, e.stack.split("\n").slice(0, 3).join(" | ")); }
    await browser.close();
  }
  srv.close(); if (SITE_DIR) fs.rmSync(SITE_DIR, { recursive: true, force: true });
  done();
})().catch(e => { console.error(e); process.exit(1); });

function done() {
  PROOF.result = { passes, fails, seconds: Math.round((Date.now() - t0) / 1000) };
  if (EVIDENCE) { fs.mkdirSync(EVD, { recursive: true }); fs.writeFileSync(path.join(EVD, "single-app-proof.json"), JSON.stringify(PROOF, null, 2) + "\n"); }
  console.log(`\n${fails ? "FAILED" : "OK"} — ${passes} passed, ${fails} failed (${Math.round((Date.now() - t0) / 1000)} s)`);
  process.exit(fails ? 1 : 0);
}
