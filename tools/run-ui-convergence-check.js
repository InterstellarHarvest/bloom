// BLOOM — gameplay UI convergence checks (BLOOM-029E). The 28th regression suite.
//
//   NODE_PATH="$(npm root -g)" node tools/run-ui-convergence-check.js [--browsers chromium,firefox] [--evidence]
//
// Node: the branch starts at the accepted 029D final candidate 0f5ce81; AtmosphereTransition, the sphere, the canonical surface, the
// engine, generator, validators, content, planets, menu, survey (the 029F seam) and the training layer are byte-identical; scope;
// the routing policy in the run page (production by default, ?ui=legacy the one developer flag, ?ui=18 an alias); no player-facing
// file links ui=legacy; the transition bridge consumes the component through its public API only (constructor, prepare, run preset
// subdued, dispose, running / phase — no private member), the rooms and the report reach it only through the bridge; the report
// truth is factored in the run page (winReport / lossReport) and read by both the engineering modal and the adapter; the production
// report component holds no rule; the adapter stays api 1 with the 10 events and its additions are the report seams; every bloom:*
// dispatch site and detail key list is identical to 0f5ce81; no migration / developer copy or emoji in the production sources; the
// title uses the game's identity; the legacy-harness suites are documented and really open ?ui=legacy.
// Browser (a static server on 127.0.0.1; Chromium 1280×800 / 1024×768 / 1440×900 + reduced motion + file://; Firefox 1280×800): the
// no-query run and every launch kind mount production (shell visually absent, inert, not keyboard reachable; one sim); ?ui=18 alias;
// ?ui=legacy restores the shell; one transition instance prepared early; Planet View → each room, room → room, room → Planet View
// through the SUBDUED preset with the locked pause / swap / resume ordering (timeline evidence); concurrency (double click, repeated
// Escape: no AtmosphereTransitionBusy, no double pause / resume, never two rooms); failure fallbacks (a rejecting run, a hidden page, a
// run that never settles); reduced motion through the component's own path, no card transform; file:// immediate swaps; the
// production Bloom Report / Extinction over the dimmed Planet View, reading adapter.report() (parity with the legacy calculation and
// the legacy markup from the same truth), the production plant specimen from the real owned tiers, Terraform shown apart, scenario
// summaries (pressure / competition / climate), the real actions, Keep playing through the mist with the resume after the reveal,
// focus trapped, Escape never dismissing; the three report anchors production-owned and every 028D1 anchor resolving once; training
// by default (paused, rooms, report, actions, completion store); no external requests, console errors or unhandled rejections; no
// horizontal scroll; generated and training action URLs return to the default UI. --evidence writes docs/evidence/bloom-029e/
// (screenshots, a deterministic frame strip and convergence-proof.json with the measured timings). Exits 1 on failure.
"use strict";
const path = require("path"), fs = require("fs"), http = require("http"), { execSync } = require("child_process");
const ROOT = path.resolve(__dirname, ".."), BASE_SHA = "0f5ce811704cc58fb77147952e7f6fc21e776f0c";
// (BLOOM-029F) the accepted 029E final candidate: the byte-identity / scope guards below (N2, N3) are bounded to 0f5ce81 … 3ab9933 once a
// later milestone has built on it (029F changes the title page, content/play.js and the adapter by design), exactly as the 029B–029D suites
// bound theirs (END_SHA); at 3ab9933 itself the working tree is checked as before
const END_SHA = "3ab99337676e214c200b34cbbeeff844f67c7e8f";
const argv = process.argv, argOf = k => { const i = argv.indexOf(k); return i > 0 ? argv[i + 1] : null; };
const BROWSERS = (argOf("--browsers") || "chromium,firefox").split(","), EVIDENCE = argv.includes("--evidence");
const EVD = path.join(ROOT, "docs/evidence/bloom-029e");
const read = f => fs.readFileSync(path.join(ROOT, f), "utf8"), J = JSON.stringify, git = c => execSync("git " + c, { cwd: ROOT, encoding: "utf8" }).trim();
const AT_END = (() => { try { return git(`merge-base --is-ancestor ${END_SHA} HEAD`) === "" && git("rev-parse HEAD") !== END_SHA; } catch { return false; } })();
const RANGE = AT_END ? `${BASE_SHA} ${END_SHA}` : BASE_SHA, untracked = () => AT_END ? [] : git("ls-files --others --exclude-standard").split("\n").filter(Boolean);
const hashAt = f => AT_END ? git(`rev-parse ${END_SHA}:${f}`) : git(`hash-object ${f}`);
let fails = 0; const t0 = Date.now();
const check = (ok, name, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); if (!ok) fails++; };
const info = (name, detail) => console.log(`INFO  ${name}  — ${detail}`);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const strip = src => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");
const PROOF = { generatedAt: new Date().toISOString(), base: BASE_SHA };
const EVTS = ["run-ready", "play-pause", "speed", "region-select", "upgrade-preview", "upgrade-purchase", "growth-focus", "local-upgrade", "bubble-collect", "win"];
const SHAPES = { "run-ready": "planetId,kind,training,running", "play-pause": "running", speed: "speed", "region-select": "index,id,name,previous,water,tile", "upgrade-preview": "id,board,name,available,gain,lose,better,worse,reachHostile",
  "upgrade-purchase": "id,board,name,cost,tier,biomass", "growth-focus": "index,id,name,focus,previous,changed", "local-upgrade": "index,id,name,upgrade,upgradeName,cost", "bubble-collect": "how,tile,index,id,name,value", win: "coverage,ticks,planetId,training" };
const DEV_COPY = /ui=18|BLOOM-0\d\d|arrives in|development view|temporary shell|migration|playtest harness|engineering shell|milestone/i;
const EMOJI = /\p{Extended_Pictographic}/u;
// the suites that still open the engineering shell on purpose (the 028D1 / 029A oracles and the pre-029 playtest suites), as README documents
const LEGACY_SUITES = ["slice-check", "economy-check", "procedural-run-check", "colony-development-check", "desert-check", "frozen-check", "dying-world-check", "native-competition-check", "volatile-climate-check", "run-ui-check", "training-check"];

(async () => {
  // ================================================================ Node
  console.log("# Node");
  const head = git("rev-parse HEAD");
  check(git(`merge-base HEAD ${BASE_SHA}`) === BASE_SHA && git(`cat-file -t ${BASE_SHA}`) === "commit", "N1 · the branch starts from the accepted BLOOM-029D final candidate 0f5ce81 (not origin/main)", `HEAD ${head.slice(0, 7)} · ${git(`rev-list --count ${BASE_SHA}..HEAD`)} commit(s) since 0f5ce81`);
  // N2 · byte-identical: AtmosphereTransition, the sphere, the canonical surface, engine / generator / validators / content / planets, menu, survey (029F seam), training layer
  { const same = f => git(`rev-parse ${BASE_SHA}:${f}`) === hashAt(f);
    const files = ["resources/atmosphere-transition/atmosphere-transition.js", "resources/planet-sphere/planet-sphere-view.js", "resources/planet-sphere/planet-texture.js", "resources/planet-surface/planet-surface.js",
      "resources/bloom-sim.js", "resources/bloom-gen.js", "resources/bloom-validate.js", "resources/bloom-witness.js", "resources/bloom-archetype.js", "resources/bloom-scenario.js", "resources/bloom-play.js", "resources/bloom-play-worker.js",
      "content/config.js", "content/traits.js", "content/scenarios.js", "content/archetypes.js", "content/training.js", "content/play.js", "planets/first_bloom.js", "planets/training_grounds.js",
      "resources/training/training-run.js", "resources/training/training-store.js", "resources/main-menu/main-menu.js", "resources/main-menu/main-menu-data.js", "resources/main-menu/expedition-entry.js", "resources/main-menu/black-fade.js",
      "resources/run-ui/run-map-renderer.js", "resources/run-ui/plant-specimen.js", "resources/run-ui/terraform-globe.js", "index.html", "demos/main-menu.html", "demos/destination-survey.html", "GAME_BIBLE.md"];
    const diff = files.filter(f => !same(f)), surveyDiff = git(`diff --stat ${RANGE} -- resources/destination-survey/ resources/main-menu/ resources/planet-sphere/ resources/atmosphere-transition/ resources/training/ demos/ui-mockups/`);
    PROOF.unchanged = { files: files.length, differing: diff, atmosphereTransitionBlob: git("hash-object resources/atmosphere-transition/atmosphere-transition.js"), surveyDiffStat: surveyDiff || "(empty)" };
    check(!diff.length && !surveyDiff, "N2 · byte-identical to 0f5ce81: AtmosphereTransition (its presets and timings), PlanetSphereView + texture, the canonical surface, the engine, generator, validators, play / scenario modules, content, planets, the training layer, the main menu, the Destination Survey (the 029F selected-planet seam untouched), the map renderer, the specimen, the globe helper, root index.html and the mockups",
      diff.length ? "DIFFER: " + diff.join(", ") : `${files.length} files + 6 directories · AtmosphereTransition blob ${PROOF.unchanged.atmosphereTransitionBlob.slice(0, 10)}`); }
  // N3 · scope
  { const changed = git(`diff --name-only ${RANGE}`).split("\n").filter(Boolean).concat(untracked());
    const allowed = p => p === "demos/demo-run.html" || p.startsWith("resources/run-ui/") || p.startsWith("tools/") || p.startsWith("docs/") || p === "README.md";
    const out = changed.filter(p => !allowed(p));
    check(!out.length, "N3 · scope: 029E changes only the run page, resources/run-ui/, the suites, docs / evidence and README", `${changed.sort().join(", ")}${out.length ? " · OUTSIDE: " + out.join(", ") : ""}`); }
  // N4 · the routing policy and no player-facing link to the developer flag
  { const run = read("demos/demo-run.html"), code = strip(run);
    const policy = /const UI_MODE=new URLSearchParams\(location\.search\)\.get\("ui"\)==="legacy"\?"legacy":"production";/.test(code) && /const PROD=UI_MODE==="production"&&!!\(window\.BLOOM&&BLOOM\.planetView&&BLOOM\.decisionRooms&&BLOOM\.runUI\);/.test(code)
      && /if\(PROD\)\{ const pv=BLOOM\.planetView\.mount\(runUI\.adapter,\{root:document\.body\}\), dr=BLOOM\.decisionRooms\.mount\(pv\);/.test(code) && /BLOOM\.runReport\.mount\(pv,\{ transition:dr\.transition \}\)/.test(code) && !/get\("ui"\)==="18"/.test(code);
    const playerFiles = ["index.html", "demos/main-menu.html", "resources/main-menu/main-menu.js", "resources/main-menu/expedition-entry.js", "resources/main-menu/main-menu-data.js", "resources/destination-survey/destination-survey.js", "resources/training/training-run.js", "content/play.js", "content/training.js", "resources/bloom-play.js",
      "resources/run-ui/planet-view.js", "resources/run-ui/decision-rooms.js", "resources/run-ui/run-report.js"].filter(f => fs.existsSync(path.join(ROOT, f)));
    const links = playerFiles.filter(f => /ui=legacy|ui=18/.test(strip(read(f))));
    const pageLinks = (code.match(/ui=legacy/g) || []).length, hrefLegacy = /href[^\n]*ui=legacy|demo-run\.html\?[^"'`\n]*ui=legacy/.test(code);
    const DEVDOC = read("README.md") + "\n" + (fs.existsSync(path.join(ROOT, "docs/DEVELOPMENT_NOTES.md")) ? read("docs/DEVELOPMENT_NOTES.md") : "");   // (BLOOM-031 note) the developer README moved to docs/DEVELOPMENT_NOTES.md on main 85ddd76
    check(policy && !links.length && !hrefLegacy && /ui=legacy/.test(DEVDOC) && /developer/i.test(DEVDOC.split("ui=legacy")[1] || ""),
      "N4 · routing: no ui= and ui=18 mount production; ui=legacy is the one developer flag (documented in README as developer-only); no player-facing file (index, menu, survey, training layer, play data, the production view / rooms / report) links or mentions ui=legacy or ui=18; the run page builds no link to it",
      links.length ? "LINKS IN " + links.join(", ") : `policy ${policy} · run page mentions ui=legacy ${pageLinks}× (the policy line + comments), no href`); }
  // N5 · the transition bridge: public API only; the rooms and the report reach the component only through it
  { const br = strip(read("resources/run-ui/gameplay-transition.js")), dr = strip(read("resources/run-ui/decision-rooms.js")), rr = strip(read("resources/run-ui/run-report.js")), pv = strip(read("resources/run-ui/planet-view.js"));
    const pub = /new mod\.AtmosphereTransition\(/.test(br) && /B\.atx\.prepare\(\)/.test(br) && /atx\.run\(\{ preset: PRESET/.test(br) && /const PRESET = "subdued"/.test(br) && /B\.atx\.dispose\(\)/.test(br) && /atx\.running/.test(br) && /B\.atx\.phase/.test(br);
    const priv = /\.\s*_[a-zA-Z]/.test(br) || /_execute|_mount|_teardown|_block|_phase\b|_cloudKeys|_bitmaps|\.overlay\b|ATMOSPHERE_PRESETS|layoutClouds/.test(br);
    const guarded = /importModule\(MODULE_URL\)/.test(br) && /\? modules\(\)\.load\(url\) : import\(url\)\)/.test(br) && /\^https\?:\$/.test(br)   // (BLOOM-031) import() when served; the portable seam over file://
      && /atmosphere-transition\/atmosphere-transition\.js/.test(br) && /readSettings|reducedMotionFor/.test(br);
    const only = !/AtmosphereTransition|atmosphere-transition|import\(/.test(dr + rr + pv) && (dr.match(/GT\.create\(/g) || []).length === 1 && /transition: T,/.test(dr) && /transition = null/.test(rr) && /T\.run\(\{ onCovered/.test(dr) && /T\.run\(\{ onCovered/.test(rr);
    const noQueue = !/queue|Queue/.test(dr.replace(/queueMicrotask/g, "")) && /state\.ignored\+\+/.test(dr) && /if \(state\.transitioning\)/.test(dr);
    const safety = /WATCHDOG_MS/.test(br) && /HARD_CAP_MS/.test(br) && /doc\.hidden/.test(br) && /atx\.running/.test(br) && /swapped/.test(br) && !/\.catch\(\s*\)/.test(br);
    check(pub && !priv && guarded && only && noQueue && safety, "N5 · gameplay-transition.js consumes AtmosphereTransition through its public API only (constructor, prepare(), run({ preset: \"subdued\", onCovered, onPhase }), dispose(), running / phase; no private member, preset table or layout function), behind a guarded import (http(s); BLOOM-031: over file:// through the portable module seam; the Settings motion choice read through main-menu-data.js); the rooms, the Planet View and the report never import or name the component — they reach it only through ONE bridge instance created once by the rooms and shared with the report; a second request is ignored (no queue); the swap rolls forward on a rejecting run, a hidden page and a watchdog / hard cap",
      `bridge ${br.split("\n").length} lines · create() sites in decision-rooms ${(dr.match(/GT\.create\(/g) || []).length}`); }
  // N6 · report truth lives in the run page; the production report holds no rule; the adapter stays api 1 (+ the report seams)
  { const run = strip(read("demos/demo-run.html")), rr = strip(read("resources/run-ui/run-report.js")), ad = strip(read("resources/run-ui/run-ui-adapter.js"));
    for (const f of ["content/config.js", "content/traits.js", "planets/first_bloom.js", "planets/training_grounds.js", "resources/bloom-sim.js", "resources/run-ui/run-ui-adapter.js"]) require(path.join(ROOT, f));
    const RU = globalThis.BLOOM.runUI;
    const seam = /function winReport\(cov\)/.test(run) && /function lossReport\(why\)/.test(run) && /function legacyWinHtml\(d\)/.test(run) && /function legacyLossHtml\(d\)/.test(run) && /REPORT=winReport\(cov\);/.test(run) && /REPORT=lossReport\(why\);/.test(run)
      && /liv\[i\]\/AREA\[i\]>0\.4\) held\.push/.test(run) && /e\.fitness<=CFG\.grow\.growThresh\) gaveUp\.push/.test(run) && /report:\(\)=>REPORT, reportActions/.test(run) && /reportAction \}/.test(run) && /function continueAfterWin\(\)/.test(run)
      && /running=true; document\.getElementById\("btnPlay"\)\.textContent="⏸ pause"; runUI\.invalidate\("continue"\)/.test(run);
    const once = (run.match(/liv\[i\]\/AREA\[i\]>0\.4/g) || []).length === 1 && (run.match(/fitness<=CFG\.grow\.growThresh\) gaveUp/g) || []).length === 1;
    const noRule = !/growThresh|fitness|AREA\b|livingCount|ownedTier|\bsim\.|BLOOM_API|BLOOM_RUN\b|winAt\s*[<>]|coverage\s*[<>]|extinction|everContested|competitionAt|climatePreview|location\.(href|reload|assign)|confirm\(/.test(rr)
      && /A\.report\(\)/.test(rr) && /A\.reportActions\(\)/.test(rr) && /A\.actions\.reportAction\(/.test(rr) && /PS\.mount\(/.test(rr) && !/drawPlant|plantCv|getContext\("2d"\)/.test(rr) && /claimAnchors\(\["report", "report-continue", "run-actions"\]\)/.test(rr);
    const globals = /\b(BLOOM_RUN|BLOOM_API|BLOOM_DATA|BLOOM_TRAINING_UI|BLOOM_RUN_UI)\b|getElementById\("(cv|hBio|hCov|hSky|btnPlay|btnSpeed|log|inspMain|shop|report|reportModal)"\)|Math\.random/.test(rr);
    const adapterOk = RU.API_VERSION === 1 && RU.EVENTS.length === 10 && J(RU.EVENTS) === J(EVTS) && /"report", "reportActions"\]/.test(ad) && /"runAction", "reportAction"\]/.test(ad) && /function report\(\) \{ const r = R\.report\(\); return r \? plain\(r\) : null; \}/.test(ad)
      && /reportAction\(id\) \{ if \(!\(R\.reportActions\(\) \|\| \[\]\)\.some\(a => a\.id === id\)\) return false; return A\.reportAction\(id\) !== false; \}/.test(ad);
    check(seam && once && noRule && !globals && adapterOk, "N6 · the report truth is factored ONCE in the run page (winReport / lossReport: held > 40 % living, gave up = unfit + its limiting factor, the build, Terraform, colony upgrades, analogs, scenario state; the engineering modal renders legacyWinHtml / legacyLossHtml from the same data; Keep playing = the unchanged continue-after-win); run-report.js holds no rule, reads no page global or sim, draws no pixel plant and only displays adapter.report() / invokes actions.reportAction; the adapter stays api 1 with the 10 events plus report(), reportActions() and actions.reportAction(id)",
      `report seams ${seam} · rules once ${once} · component rule-free ${noRule} · adapter api ${RU.API_VERSION}`); }
  // N7 · every bloom:* dispatch site and detail key list identical to 0f5ce81; one Biomass grant; placeBubble kept
  { const runBase = git(`show ${BASE_SHA}:demos/demo-run.html`), runAt = read("demos/demo-run.html");
    const sites = s => EVTS.map(t => [t, (s.match(new RegExp(`emit\\("${t}"`, "g")) || []).length]), keysOf = s => EVTS.map(t => { const m = [...s.matchAll(new RegExp(`emit\\("${t}",\\s*\\{([^}]*)\\}`, "g"))].map(x => x[1].replace(/\s+/g, "")); return [t, m.join(" | ")]; });
    const same = J(sites(runBase)) === J(sites(runAt)) && J(keysOf(runBase)) === J(keysOf(runAt));
    check(same && sites(runAt).every(([, n]) => n > 0) && (runAt.match(/biomass\s*\+=/g) || []).length === 1 && /window\.BLOOM_RUN_UI=\{ placeBubble \}/.test(runAt) && /window\.BLOOM_API=\{/.test(runAt),
      "N7 · the run page keeps every bloom:* dispatch site with exactly the same detail keys as 0f5ce81 (the ten shapes frozen; no new event for room navigation), one Biomass grant (the QA hook), BLOOM_RUN_UI.placeBubble and BLOOM_API", sites(runAt).map(([t, n]) => `${t} ${n}`).join(", ")); }
  // N8 · no migration / developer copy or emoji in the production sources; the title identity
  { const prodFiles = ["resources/run-ui/planet-view.js", "resources/run-ui/decision-rooms.js", "resources/run-ui/run-report.js", "resources/run-ui/gameplay-transition.js", "resources/run-ui/planet-view.css", "resources/run-ui/decision-rooms.css", "resources/run-ui/run-report.css"];
    // string literals of the stripped source (regex literals such as the Planet View's leading-pictograph filter removed first); the warning
    // symbol ⚠ is a semantic warning (allowed where the climate preview warns of a shock), not an interface icon
    const literals = src => [...strip(src).replace(/\.replace\(\/[^\n]*?\/[a-z]*,/g, ".replace(RE,").matchAll(/(["'`])((?:\\.|(?!\1)[^\\])*)\1/g)].map(m => m[2].replace(/⚠/g, ""));
    const bad = prodFiles.flatMap(f => literals(read(f)).filter(s => DEV_COPY.test(s) && !/BLOOM-029E\b.*docs|docs\//.test(s)).map(s => `${f}: ${s.slice(0, 60)}`));
    const emoji = prodFiles.flatMap(f => literals(read(f)).filter(s => EMOJI.test(s)).map(s => `${f}: ${s.slice(0, 40)}`));
    const run = strip(read("demos/demo-run.html")), menuData = read("resources/main-menu/main-menu-data.js"), TITLE = /export const TITLE = "([^"]+)"/.exec(menuData)[1];
    const title = new RegExp(`if\\(PROD\\)\\{[\\s\\S]{0,300}?document\\.title=\`${TITLE} — \\$\\{`).test(run);
    const stripped = strip(read("resources/run-ui/planet-view.js")); const noBadge = !/pv-dev|UI 18/.test(stripped) && !/ROOM_MILESTONE/.test(stripped);
    check(!bad.length && !emoji.length && title && noBadge && TITLE === "Strange Bloom", `N8 · no player-visible migration / developer wording (ui=18, milestone numbers, "arrives in", "development view", "temporary shell", "playtest harness") and no emoji glyph in any production source string; the production title is "${TITLE} — <world>" from the main menu's identity; the UI 18 badge and the "arrives in" copy are gone`,
      bad.concat(emoji).join(" | ") || `${prodFiles.length} files scanned · title ${TITLE}`); }
  // N9 · the legacy-harness policy: the documented suites open ?ui=legacy; the production suites do not
  { const uses = LEGACY_SUITES.map(s => [s, /ui=legacy/.test(read(`tools/${s}.js`))]), missing = uses.filter(([, u]) => !u).map(([s]) => s);
    const prodSuites = ["planet-view-check", "plant-rooms-check", "terraform-check", "game-flow-check"].filter(s => /(open|goto)\([^)]*ui=legacy/.test(read(`tools/${s}.js`)));
    const readme = read("README.md") + "\n" + (fs.existsSync(path.join(ROOT, "docs/DEVELOPMENT_NOTES.md")) ? read("docs/DEVELOPMENT_NOTES.md") : ""), documented = LEGACY_SUITES.filter(s => !readme.includes(s));
    check(!missing.length && !documented.length && prodSuites.every(s => s === "planet-view-check" || s === "game-flow-check"), "N9 · legacy regression policy: the engineering-shell suites (the playtest suites, the 029A adapter-vs-shell oracle, the 028D1 training event oracle) open ?ui=legacy explicitly and README lists each with its reason; the production suites use the default (planet-view-check and game-flow-check open ?ui=legacy only to prove the developer flag)",
      `${LEGACY_SUITES.length} legacy suites${missing.length ? " · NOT OPENING ui=legacy: " + missing.join(", ") : ""}${documented.length ? " · UNDOCUMENTED: " + documented.join(", ") : ""}`); }
  // N10 · gameplay unchanged: the engine, content and planets are byte-identical (N2); a seeded run on three worlds reproduces 0f5ce81's engine output exactly
  { for (const f of ["content/archetypes.js", "content/scenarios.js", "content/play.js", "resources/bloom-gen.js", "resources/bloom-validate.js", "resources/bloom-witness.js", "resources/bloom-archetype.js", "resources/bloom-scenario.js", "resources/bloom-play.js"]) require(path.join(ROOT, f));
    const { BLOOM, BLOOM_DATA } = globalThis, { config, traits, archetypes } = BLOOM_DATA;
    const tmp = fs.mkdtempSync(path.join(require("os").tmpdir(), "bloom-029e-")), baseSim = path.join(tmp, "bloom-sim.js"); fs.writeFileSync(baseSim, git(`show ${BASE_SHA}:resources/bloom-sim.js`));
    const createNow = BLOOM.createSim; delete globalThis.BLOOM.createSim; require(baseSim); const createBase = globalThis.BLOOM.createSim; globalThis.BLOOM.createSim = createNow;
    const fnv = a => { let h = 0x811c9dc5; for (let i = 0; i < a.length; i++) { h ^= a[i] & 0xff; h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(16); };
    const rows = [];
    for (const [key, planet] of [["first_bloom", BLOOM_DATA.planets.first_bloom], ["training_grounds", BLOOM_DATA.planets.training_grounds], ["ocean_28", BLOOM.generateFromArchetype(archetypes.find(a => a.id === "ocean_archipelago"), 28, { config, traits })]]) {
      const mk = c => { const s = c(planet, config, traits, { rng: BLOOM.gen.mulberry32(5) }); s.biomass = 1e4; for (const id of ["cold", "humid", "seedOut"]) s.buy(id); let cov = 0; for (let t = 0; t < 900; t++) cov = s.tick(); return `${cov.toFixed(6)}/${fnv(s.state)}/${Math.round(s.biomass * 1000)}`; };
      const a = mk(createNow), b = mk(createBase); rows.push(`${key} ${a === b ? "identical" : "DIFF"}`); }
    check(rows.every(r => /identical/.test(r)), "N10 · gameplay balance unchanged: the current engine and the engine at 0f5ce81 give identical seeded 900-tick runs (coverage, tiles, Biomass) on First Bloom, Training Grounds and Ocean 28 with the same purchases", rows.join(" · ")); }

  // ================================================================ browser
  let pw = null; try { pw = require("playwright"); } catch { check(false, "Playwright available (NODE_PATH=\"$(npm root -g)\")", "require('playwright') failed"); }
  const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".json": "application/json", ".svg": "image/svg+xml" };
  const server = http.createServer((req, res) => { const u = decodeURIComponent(new URL(req.url, "http://x").pathname), f = path.join(ROOT, u);
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream", "cache-control": "no-store" }); fs.createReadStream(f).pipe(res); });
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  const ORIGIN = `http://127.0.0.1:${server.address().port}`, RUN = ORIGIN + "/demos/demo-run.html", FILE = "file://" + encodeURI(path.join(ROOT, "demos/demo-run.html"));
  if (EVIDENCE) fs.mkdirSync(EVD, { recursive: true });
  // in every page: the event log, an overlay observer (every .atx overlay: preset, reduced class, phases with timestamps, removal), a room
  // visibility log (#dr hidden + visible rooms on every change), unhandled rejections, and a freeze hook for deterministic phase screenshots
  const INIT = () => {
    window.__EV = []; for (const t of ["run-ready", "play-pause", "speed", "region-select", "upgrade-preview", "upgrade-purchase", "growth-focus", "local-upgrade", "bubble-collect", "win"]) document.addEventListener("bloom:" + t, e => window.__EV.push({ type: t, detail: e.detail, at: performance.now() }));
    window.__ATX = []; window.__VIS = []; window.__UNHANDLED = []; window.__freezeAt = null; window.__frozen = false;
    addEventListener("unhandledrejection", e => { window.__UNHANDLED.push(String(e.reason && e.reason.message || e.reason)); });
    const vis = () => { const dr = document.getElementById("dr"); if (!dr) return; const rooms = [...dr.querySelectorAll(".dr-room")].filter(r => !r.hidden).map(r => r.dataset.room);
      window.__VIS.push({ t: performance.now(), drHidden: dr.hidden, rooms, pvInert: !!document.querySelector(".pv-hud") && document.querySelector(".pv-hud").inert, rr: !!document.getElementById("rr") && !document.getElementById("rr").hidden }); };
    const mo = new MutationObserver(ms => { for (const m of ms) {
      if (m.type === "childList") for (const n of m.addedNodes) { if (n.nodeType === 1 && n.classList && n.classList.contains("atx")) { const rec = { preset: n.dataset.atxPreset, rm: n.classList.contains("rm"), at: performance.now(), phases: [{ p: n.dataset.atxPhase, t: performance.now() }], removedAt: null, seed: n.dataset.atxSeed };
          window.__ATX.push(rec); new MutationObserver(() => { rec.phases.push({ p: n.dataset.atxPhase, t: performance.now() }); if (window.__freezeAt && n.dataset.atxPhase === window.__freezeAt && !window.__frozen) { setTimeout(() => { document.getAnimations().forEach(a => { try { a.pause(); } catch {} }); window.__frozen = true; }, window.__freezeDelay || 30); } }).observe(n, { attributes: true, attributeFilter: ["data-atx-phase"] }); } }
      if (m.type === "childList") for (const n of m.removedNodes) { if (n.nodeType === 1 && n.classList && n.classList.contains("atx")) { const rec = window.__ATX.find(r => r.seed === n.dataset.atxSeed && r.removedAt === null); if (rec) rec.removedAt = performance.now(); } }
      if (m.type === "attributes" && (m.attributeName === "hidden" || m.attributeName === "inert")) vis(); } });
    mo.observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden", "inert"] });
  };
  const H = `(() => { const PV = BLOOM.planetView.instance, DR = BLOOM.decisionRooms.instance, RR = BLOOM.runReport.instance, A = BLOOM_RUN_UI.adapter, T = DR.transition;
    const geom = () => { const r = document.getElementById("pvMap").getBoundingClientRect(), I = PV.renderer.info(); return [r.x, r.y, r.width, r.height, I.tilePx, I.offsetX, I.offsetY, I.copies.count].map(v => Math.round(v * 100) / 100).join(","); };
    const ev = t => __EV.filter(e => e.type === t);
    const room = () => document.querySelector(".dr .dr-room:not([hidden])");
    const legacyHidden = () => ["body > header", "body > main", "body > footer", "#reportModal"].map(s => getComputedStyle(document.querySelector(s)).display);
    window.__cv = { PV, DR, RR, A, T, geom, ev, room, legacyHidden,
      state: () => ({ room: DR.state().room, transitioning: DR.state().transitioning, kind: T ? T.kind : "none", running: A.run().running, ticks: A.run().ticks, sel: A.selection().index, overlay: !!document.querySelector(".atx"), rooms: [...document.querySelectorAll(".dr .dr-room")].filter(r => !r.hidden).length,
        report: RR.state(), inert: !!document.querySelector(".pv-hud").inert, active: A.activePreview() ? A.activePreview().gain.length + "/" + A.activePreview().lose.length : null, ignored: DR.state().ignored, won: A.run().won, lost: A.run().lost }),
      tl: () => DR.timeline().map(e => ({ ...e })), rtl: () => RR.timeline().map(e => ({ ...e })),
      // the legacy authoritative classification, as 0f5ce81's onWin computed it (held = > 40 % living; gave up = unfit: fitness ≤ growThresh + the named limiting factor)
      legacyClassify: () => { const s = BLOOM_API.sim, M = s.map, liv = s.livingCountBySection(), held = [], gaveUp = []; M.SEC.forEach((x, i) => { if (liv[i] / M.AREA[i] > 0.4) held.push(M.SEC[i].id); else { const e = s.evaluate(i); if (e.fitness <= s.config.grow.growThresh) gaveUp.push([M.SEC[i].id, LIMIT_MSG[e.limitKey](e)]); } });
        const owned = s.traits.filter(u => u.board !== "Terraform" && s.ownedTier(u) > 0).map(u => [u.id, s.ownedTier(u)]), terra = s.traits.filter(u => u.board === "Terraform" && s.ownedTier(u) > 0).map(u => [u.id, s.ownedTier(u)]);
        const spec = M.SEC.map((_, i) => s.getSpecialization(i) ? [M.SEC[i].id, s.getSpecialization(i)] : null).filter(Boolean);
        return { held, gaveUp, owned, terra, spec, cov: Math.round(s.coverage() * 100), won: s.won, lost: s.lost, lostReason: s.lostReason }; },
      legacyText: () => { const d = REPORT; if (!d) return null; const el = document.createElement("div"); el.innerHTML = d.kind === "win" ? legacyWinHtml(d) : legacyLossHtml(d); return el.innerText.replace(/\\s+/g, " "); },
      reportText: () => document.getElementById("rrCard").innerText.replace(/\\s+/g, " ") };
    return true; })()`;
  const frames = (p, n = 3) => p.evaluate(n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
  const shot = async (p, name, clip) => { if (EVIDENCE) await p.screenshot({ path: path.join(EVD, name), ...(clip ? { clip } : {}) }); };
  const settledDR = p => p.waitForFunction(() => !BLOOM.decisionRooms.instance.state().transitioning, null, { timeout: 8000, polling: 20 });
  const settledRR = p => p.waitForFunction(() => !BLOOM.runReport.instance.state().busy, null, { timeout: 8000, polling: 20 });
  const state = p => p.evaluate(() => __cv.state());
  const openRoom = async (p, name) => { const inRoom = await p.evaluate(() => !!__cv.DR.state().room); await p.click(inRoom ? `.dr .dr-room:not([hidden]) .rn[data-go="${name}"]` : `.pv-tool[data-tool="${name}"]`); await settledDR(p); await frames(p, 2); };
  const back = async (p, resume) => { await p.click(`.dr .dr-room:not([hidden]) .rb.${resume ? "resume" : "back"}`); await settledDR(p); await frames(p, 2); };
  const waitAtx = p => p.waitForFunction(() => BLOOM.decisionRooms.instance.transition && BLOOM.decisionRooms.instance.transition.kind !== "pending", null, { timeout: 15000, polling: 50 }).catch(() => {});
  const lastTL = async p => (await p.evaluate(() => __cv.tl())).pop();
  const timing = e => ({ kind: e.kind, from: e.from, to: e.to, pauseAfterStartMs: e.tPause == null ? null : Math.round((e.tPause - e.tStart) * 10) / 10, coveredMs: Math.round((e.tCovered - e.tStart) * 10) / 10, swapDoneMs: Math.round((e.tSwapDone - e.tStart) * 10) / 10, revealCompleteMs: Math.round((e.tEnd - e.tStart) * 10) / 10,
    resumeMs: e.tResume == null ? null : Math.round((e.tResume - e.tStart) * 10) / 10, runningBefore: e.runningBefore, runningAtSwap: e.runningAtSwap, runningAtEnd: e.runningAtEnd, ticksAtStart: e.ticksAtStart, ticksAtEnd: e.ticksAtEnd, ran: e.ran, immediate: e.immediate, error: e.error || null });
  const winTraining = p => p.evaluate(() => { BLOOM_API.addBiomass(5000); const A = BLOOM_RUN_UI.adapter; A.actions.buy("cold"); A.actions.buy("humid"); let n = 0; while (!BLOOM_API.sim.won && n < 20000) { BLOOM_API.advance(200); n += 200; } return BLOOM_API.sim.won; });
  const reportOpen = p => p.waitForFunction(() => BLOOM.runReport.instance.state().open && !BLOOM.runReport.instance.state().busy, null, { timeout: 10000, polling: 30 });
  // a REAL scenario win through the adapter's buy (the page's own buy): the validator's first proven strategy, bought when affordable
  const { BLOOM: NB, BLOOM_DATA: ND } = globalThis;
  const planFor = (aid, seed, sid) => { const A = ND.archetypes.find(a => a.id === aid), planet = NB.generateFromArchetype(A, seed, { config: ND.config, traits: ND.traits }), S = NB.pressure.resolveScenario(ND.scenarios, sid);
    const v = NB.validateScenario(planet, ND.config, ND.traits, S, { archetypeId: aid }); return v.strategies[0].purchases.map(x => x.id); };
  const winScenario = async (p, plan) => p.evaluate(async plan => { const A = BLOOM_RUN_UI.adapter; let i = 0, t = 0; while (!BLOOM_API.sim.won && !BLOOM_API.sim.lost && t < 12000) { BLOOM_API.advance(5); t += 5;
      if (i < plan.length) { const u = A.upgrade(plan[i]); if (u && u.canBuy) { A.actions.buy(plan[i]); i++; } } if (t % 400 === 0) await new Promise(r => setTimeout(r, 0)); } return { won: BLOOM_API.sim.won, lost: BLOOM_API.sim.lost, bought: i, ticks: BLOOM_API.sim.ticks }; }, plan);

  for (const bname of BROWSERS) {
    if (!pw) break; const FF = bname === "firefox", tag = `[${bname}]`;
    let browser; try { browser = await pw[bname].launch(); } catch (e) { check(false, `${tag} browser launches`, e.message.split("\n")[0]); continue; }
    console.log(`# ${bname}`);
    const pages = [];
    const open = async (q, { w = 1280, h = 800, rm = false, file = false, settings = null, wait = true, failPortable = false } = {}) => {
      const c = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: rm ? "reduce" : "no-preference" }); await c.addInitScript(INIT);
      if (failPortable) await c.addInitScript(() => { window.BLOOM_PORTABLE = { load: () => Promise.reject(new Error("QA: the portable runtime is unavailable")) }; }); // (BLOOM-031) force the module-less fallback over file://
      if (settings) await c.addInitScript(s => { try { localStorage.setItem("strange-bloom.settings", s); } catch {} }, J(settings));
      const p = await c.newPage(); p.errs = []; p.reqs = []; p.on("pageerror", e => p.errs.push(e.message)); p.on("console", m => { if (m.type() === "error") p.errs.push(m.text()); }); p.on("request", r => p.reqs.push(r.url())); pages.push(p);
      await p.goto((file ? FILE : RUN) + q);
      await p.waitForFunction(() => window.BLOOM_RUN && BLOOM_RUN.started, null, { timeout: 60000, polling: 100 });
      if (wait && await p.evaluate(() => !!(window.BLOOM && BLOOM.planetView && BLOOM.planetView.instance))) { await p.waitForFunction(() => BLOOM.planetView.instance.renderer.info().frames > 0 && BLOOM.decisionRooms.instance && BLOOM.runReport.instance, null, { timeout: 30000, polling: 100 }); await waitAtx(p); await p.evaluate(H); await frames(p, 3); }
      await p.waitForFunction(() => { const c = document.getElementById("trainingCover"); return !c || getComputedStyle(c).display === "none"; }, null, { timeout: 8000 }).catch(() => {});
      return p; };
    try {
      // ---- B1 · no query = production (First Bloom): shell visually absent + inert + unreachable, one sim, the title, no developer copy / emoji, all four tools ready, report mounted
      { const p = await open("");
        const r = await p.evaluate(() => { const A = __cv.A, before = BLOOM_API.sim.ticks; BLOOM_API.advance(30); A.actions.pause();
          const shellBtns = [...document.querySelectorAll("body > header button, body > main button, body > footer button, #reportModal button")], focusable = shellBtns.filter(b => b.offsetParent !== null);
          const text = document.body.innerText; const pvText = document.querySelector(".pv").innerText;
          return { pv: !!document.querySelector(".pv"), ui18: document.documentElement.classList.contains("ui18"), hidden: __cv.legacyHidden(), sameSim: A.run().ticks === BLOOM_API.sim.ticks && BLOOM_API.sim.ticks === before + 30, sims: typeof sim === "object" && sim === BLOOM_API.sim,
            title: document.title, planet: A.run().planetName, dev: (text.match(/ui=18|BLOOM-0\d\d|arrives in|development view|temporary shell|playtest harness|migration/i) || [null])[0], emoji: (pvText.match(/\p{Extended_Pictographic}/u) || [null])[0],
            shellFocusable: focusable.length, tools: [...document.querySelectorAll(".pv-tool[data-room]")].map(b => b.dataset.tool + ":" + b.dataset.room), rooms: Object.keys(__cv.DR.rooms), report: !!__cv.RR && !!document.getElementById("rr"), pvCount: document.querySelectorAll(".pv").length, dataUi: document.querySelector(".pv").dataset.ui }; });
        // keyboard: 40 Tabs never land in the hidden shell
        const tabs = new Set(); for (let k = 0; k < 40; k++) { await p.keyboard.press("Tab"); tabs.add(await p.evaluate(() => { const e = document.activeElement; return e.closest(".pv") ? "pv" : e === document.body ? "body" : "shell:" + (e.id || e.className); })); }
        check(r.pv && r.ui18 && J(r.hidden) === J(["none", "none", "none", "none"]) && r.sameSim && r.sims && r.title === `Strange Bloom — ${r.planet}` && !r.dev && !r.emoji && r.shellFocusable === 0 && [...tabs].every(t => t === "pv" || t === "body") && J(r.tools) === J(["region:ready", "adapt:ready", "spread:ready", "terraform:ready"]) && r.rooms.length === 4 && r.report && r.pvCount === 1 && r.dataUi === "production" && !p.errs.length,
          `${tag} B1 · no ui= query: First Bloom mounts the PRODUCTION Planet View (one sim: adapter ticks = BLOOM_API's after advancing; the page's sim is the same object), the engineering shell's header / main / footer / report modal are display:none, no shell control is focusable and 40 Tab presses never reach it, the title reads "Strange Bloom — First Bloom", no migration / developer wording or emoji in the visible text, all four tools read ready, the report is mounted`,
          J({ title: r.title, hidden: r.hidden, tabs: [...tabs], dev: r.dev, emoji: r.emoji, tools: r.tools }) + (p.errs.length ? " errs " + p.errs.join(" | ") : ""));
        if (!FF) await shot(p, "01-default-production-planet-view.png"); await p.context().close(); }
      // ---- B2 · ?ui=18 alias → production; ?ui=legacy → the engineering shell, usable, without the production UI
      { const a = await open("?archetype=ocean_archipelago&seed=28&ui=18"); const ra = await a.evaluate(() => ({ pv: !!document.querySelector(".pv"), hidden: __cv.legacyHidden(), title: document.title })); await a.context().close();
        const l = await open("?archetype=ocean_archipelago&seed=28&ui=legacy", { wait: false }); await sleep(400);
        const rl = await l.evaluate(() => ({ pv: !!document.querySelector(".pv"), rr: !!document.getElementById("rr"), ui18: document.documentElement.classList.contains("ui18"), header: getComputedStyle(document.querySelector("body > header")).display, canvas: document.getElementById("cv").width > 100, title: document.title, adapter: BLOOM_RUN_UI.adapter.api, anchors: ["biomass", "map", "inspect", "readout", "report"].map(n => document.querySelectorAll(`[data-tutorial="${n}"]`).length), instances: [BLOOM.planetView.instance, BLOOM.decisionRooms.instance, BLOOM.runReport.instance].map(x => !!x) }));
        await l.click("#btnPlay"); const pp = await l.evaluate(() => __EV.filter(e => e.type === "play-pause").map(e => e.detail.running)); await l.hover("#shop button.buy"); await frames(l, 2); const pv = await l.evaluate(() => __EV.filter(e => e.type === "upgrade-preview").length);
        check(ra.pv && J(ra.hidden) === J(["none", "none", "none", "none"]) && /^Strange Bloom — /.test(ra.title) && !rl.pv && !rl.rr && !rl.ui18 && rl.header !== "none" && rl.canvas && rl.adapter === 1 && J(rl.anchors) === "[1,1,1,1,1]" && J(rl.instances) === "[false,false,false]" && /playtest harness/.test(rl.title) && J(pp) === "[false]" && pv >= 1 && !l.errs.length,
          `${tag} B2 · ?ui=18 stays a backwards-compatible alias of the production default; ?ui=legacy restores the engineering shell exactly (its own map drawn, its anchors, its title, no production view / rooms / report mounted) and it is usable (pause button → bloom:play-pause, shop hover → preview)`, J({ alias: ra.title, legacy: rl.title, anchors: rl.anchors, pp, pv }));
        if (!FF) await shot(l, "19-ui-legacy-engineering-harness.png"); await l.context().close(); }
      // ---- B3 · every launch kind mounts production: authored planet=, generated, pressure, competition, climate, play=1, training=1
      { const kinds = [["planet=training_grounds", "?planet=training_grounds", "Training Grounds"], ["generated", "?archetype=ocean_archipelago&seed=28", null], ["pressure", "?archetype=ocean_archipelago&seed=28&scenario=dying_world", "Dying World"], ["competition", "?archetype=desert_world&seed=22&scenario=native_competition", "Native Competition"],
          ["climate", "?archetype=frozen_world&seed=4&scenario=volatile_climate", "Volatile Climate"], ["play=1", "?play=1", "First Bloom"], ["training=1", "?training=1", "Training · Training Grounds"]];
        const rows = [], bad = [];
        for (const [label, q, want] of kinds) { const p = await open(q + (label === "training=1" ? "&return=" + encodeURIComponent("/demos/main-menu.html") : ""));
          const r = await p.evaluate(() => ({ pv: !!document.querySelector(".pv"), hidden: __cv.legacyHidden(), title: document.title, running: __cv.A.run().running, training: __cv.A.run().training, kind: __cv.T ? __cv.T.kind : "none", report: !!__cv.RR, rooms: [...document.querySelectorAll(".pv-tool[data-room]")].every(b => b.dataset.room === "ready"), scn: !document.getElementById("pvScn").hidden, menu: !!document.getElementById("pvMenuBtn") }));
          const ok = r.pv && J(r.hidden) === J(["none", "none", "none", "none"]) && /^Strange Bloom — /.test(r.title) && (!want || r.title.includes(want)) && r.report && r.rooms && (label !== "training=1" || (r.running === false && r.training)) && (!/pressure|competition|climate/.test(label) || r.scn) && (!/^(play=1|training=1)$/.test(label) || r.menu) && !p.errs.length;
          rows.push(`${label}: ${r.title}`); if (!ok) bad.push(`${label} ${J(r)}${p.errs.length ? " errs " + p.errs.join("|") : ""}`); await p.context().close(); }
        check(!bad.length, `${tag} B3 · planet= authored, generated, pressure, competition, volatile-climate, play=1 and training=1 runs ALL mount production (shell hidden, rooms ready, report mounted, the scenario card where a scenario runs, the run menu in player / training mode, training paused) with Strange Bloom titles`, bad.join(" || ") || rows.join(" · ")); }

      // ---- B4–B9 · the transition language on a running generated world
      const p = await open("?archetype=ocean_archipelago&seed=28");
      // B4 · one instance, prepared early, module served once (the bitmaps decode in idle time: wait for the prepare to report, at most a few seconds)
      { await p.waitForFunction(() => BLOOM.decisionRooms.instance.transition.prepareStats && BLOOM.decisionRooms.instance.transition.prepareStats.ms != null, null, { timeout: 10000, polling: 50 }).catch(() => {});
        const r = await p.evaluate(() => ({ same: __cv.DR.transition === __cv.RR.transition && __cv.DR.transition !== null, kind: __cv.T.kind, prep: __cv.T.prepareStats, runs: __cv.T.runs, atxRuns: __cv.T.atx ? __cv.T.atx.runs : null, readyAt: __cv.T.prepareStats && __cv.T.prepareStats.readyAt, instances: __cv.T.atx ? __cv.T.atx.uid : null }));
        const mod = p.reqs.filter(u => /atmosphere-transition\.js/.test(u));
        PROOF.prepare = PROOF.prepare || {}; PROOF.prepare[bname] = { ...r, moduleRequests: mod.length };
        check(r.same && r.kind === "atmosphere" && r.prep && r.prep.bitmaps === 8 && r.runs === 0 && r.atxRuns === 0 && mod.length === 1 && mod[0].startsWith(ORIGIN),
          `${tag} B4 · exactly ONE gameplay transition instance (the rooms' bridge is the report's), the module served once from the local server, built and prepared early (8 cloud bitmaps drawn in idle time ${r.prep && r.prep.ms} ms after mount) before any swap ran`, J({ kind: r.kind, prep: r.prep, mod: mod.length })); }
      // B5 · Planet View → each of the four rooms from a RUNNING run with a selection: subdued, pause before the conceal, one play-pause, selection carried at the covered point, Back resumes only after the reveal
      { const rows = [], bad = [];
        for (const name of ["region", "adapt", "spread", "terraform"]) {
          await p.evaluate(() => { const A = __cv.A; A.actions.play(); const r = A.regions().find(x => !x.isOrigin); A.actions.selectRegion(r.index); }); await frames(p, 2);
          const n0 = await p.evaluate(() => ({ ev: __EV.length, atx: __ATX.length, ticks: __cv.A.run().ticks, geom: __cv.geom(), sel: __cv.A.selection().index }));
          await p.click(`.pv-tool[data-tool="${name}"]`);
          const during = await p.evaluate(() => __cv.state());                                  // right after the click: concealing
          await settledDR(p); await frames(p, 2);
          const r = await p.evaluate(n => { const e = __cv.tl().pop(), atx = __ATX.slice(n.atx), pp = __EV.slice(n.ev).filter(x => x.type === "play-pause").map(x => ({ running: x.detail.running, at: x.at })), rs = __EV.slice(n.ev).filter(x => x.type === "region-select").map(x => ({ id: x.detail.id, at: x.at }));
            return { e, atx: atx.map(a => ({ preset: a.preset, rm: a.rm, phases: a.phases.map(x => x.p), removed: a.removedAt !== null })), pp, rs, st: __cv.state(), geom: __cv.geom(), roomVisible: !!__cv.room() && __cv.room().dataset.room, kicker: __cv.room().querySelector(".rk").textContent, focusIn: !!document.activeElement.closest("#dr") }; }, n0);
          const e = r.e, ok = during.transitioning && during.running === false && during.sel >= 0 && during.overlay === (r.atx.length === 1)   // paused at once, the selection still home while concealing
            && r.atx.length === 1 && r.atx[0].preset === "subdued" && J(r.atx[0].phases) === J(["concealing", "covered", "revealing"]) && r.atx[0].removed
            && e.kind === "open" && e.to === name && e.runningBefore === true && e.tPause !== null && e.tPause <= e.tCovered && e.runningAtSwap === false && e.runningAtEnd === false && e.ran && !e.immediate && e.ticksAtEnd === e.ticksAtStart
            && J(r.pp.map(x => x.running)) === "[false]" && r.pp[0].at <= e.tCovered && r.rs.length === 1 && r.rs[0].id === null && r.rs[0].at >= e.tCovered && r.st.room === name && r.st.sel === -1 && r.st.rooms === 1 && !r.st.overlay && !r.st.transitioning && r.st.inert && r.geom === n0.geom && r.focusIn;
          rows.push(`${name}: pause +${Math.round(e.tPause - e.tStart)} ms · covered ${Math.round(e.tCovered - e.tStart)} · revealed ${Math.round(e.tEnd - e.tStart)} ms`); if (!ok) bad.push(`${name} ${J({ during, r })}`);
          PROOF.timings = PROOF.timings || {}; PROOF.timings[bname] = PROOF.timings[bname] || []; PROOF.timings[bname].push(timing(e));
          if (!FF && name !== "adapt") await shot(p, { region: "02-region-room-after-subdued-reveal.png", spread: "04-spread-room-after-subdued-reveal.png", terraform: "05-terraform-room-after-subdued-reveal.png" }[name]);
          if (!FF && name === "adapt") await shot(p, "03-adapt-room-after-subdued-reveal.png");
          // Back from running: paused through the whole transition, resumed only after the reveal completed
          const b0 = await p.evaluate(() => ({ ev: __EV.length, atx: __ATX.length, ticks: __cv.A.run().ticks }));
          await p.click(".dr .dr-room:not([hidden]) .rb.back"); const dur = await p.evaluate(() => __cv.state()); await settledDR(p); await frames(p, 2);
          const rb = await p.evaluate(n => { const e = __cv.tl().pop(), atx = __ATX.slice(n.atx), pp = __EV.slice(n.ev).filter(x => x.type === "play-pause").map(x => ({ running: x.detail.running, at: x.at })); return { e, atx: atx.map(a => a.preset), pp, st: __cv.state(), focus: document.activeElement && document.activeElement.dataset.tool }; }, b0);
          const eb = rb.e, okb = dur.transitioning && dur.running === false && rb.atx.length === 1 && rb.atx[0] === "subdued" && eb.kind === "back" && eb.runningAtSwap === false && eb.tResume >= eb.tEnd && eb.runningAtEnd === true && eb.ticksAtEnd === eb.ticksAtStart && J(rb.pp.map(x => x.running)) === "[true]" && rb.pp[0].at >= eb.tEnd && rb.st.room === null && rb.st.running && !rb.st.overlay && !rb.st.inert && rb.st.sel === -1 && rb.focus === name;
          if (!okb) bad.push(`back from ${name} ${J({ dur, rb })}`); PROOF.timings[bname].push(timing(eb)); }
        check(!bad.length, `${tag} B5 · Planet View → Region / Adapt / Spread / Terraform from a running run with a region selected: the REAL pause lands before the conceal starts (one bloom:play-pause {running:false}), the home selection is still selected while the mist closes and is cleared (bloom:region-select {id:null}) at the covered point together with the room swap, the SUBDUED preset runs concealing → covered → revealing and its overlay is removed (idle), no tick passes, the map keeps its exact geometry, focus enters the room; Back: still paused through the mist, bloom:play-pause {running:true} only AFTER the reveal completed, no tick passed, focus back on the tool`,
          bad.join(" || ") || rows.join(" · ")); }
      // B6 · room → room: subdued, context kept, no play-pause, the old preview cleared before the swap, no intermediate Planet View, never two rooms
      { await openRoom(p, "adapt"); const ctx0 = await p.evaluate(() => __cv.DR.state().contextId);
        await p.hover('.dr .dr-room:not([hidden]) .node[data-node="cold"]'); await frames(p, 3); const pv0 = await p.evaluate(() => ({ pv: __cv.DR.state().preview, active: !!__cv.A.activePreview() }));
        const n0 = await p.evaluate(() => ({ ev: __EV.length, atx: __ATX.length, vis: __VIS.length }));
        const seq = ["terraform", "region", "spread"], rows = [], bad = [];
        for (const to of seq) { const from = await p.evaluate(() => __cv.DR.state().room); await p.click(`.dr .dr-room:not([hidden]) .rn[data-go="${to}"]`);
          const dur = await p.evaluate(() => ({ ...__cv.state(), preview: __cv.DR.state().preview }));   // right after the click: the old preview is already gone, still paused, still that room until covered
          await settledDR(p); await frames(p, 2);
          const r = await p.evaluate(() => { const e = __cv.tl().pop(); return { e, st: __cv.state(), ctx: __cv.DR.state().contextId }; });
          const e = r.e, ok = dur.transitioning && dur.running === false && dur.preview === null && dur.active === null && e.kind === "switch" && e.from === from && e.to === to && e.runningBefore === false && e.runningAtSwap === false && e.runningAtEnd === false && e.ran && e.ticksAtEnd === e.ticksAtStart && r.st.room === to && r.ctx === ctx0 && r.st.rooms === 1 && !r.st.overlay;
          rows.push(`${from} → ${to}: covered ${Math.round(e.tCovered - e.tStart)} · revealed ${Math.round(e.tEnd - e.tStart)} ms`); if (!ok) bad.push(`${from}→${to} ${J({ dur, r })}`); PROOF.timings[bname].push(timing(e)); }
        const r = await p.evaluate(n => { const pp = __EV.slice(n.ev).filter(x => x.type === "play-pause").length, atx = __ATX.slice(n.atx), vis = __VIS.slice(n.vis); return { pp, atx: atx.map(a => a.preset), flash: vis.filter(v => v.drHidden).length, twoRooms: vis.filter(v => v.rooms.length > 1).length, noRoom: vis.filter(v => !v.drHidden && v.rooms.length === 0).length, samples: vis.length }; }, n0);
        check(!bad.length && pv0.pv === "cold" && pv0.active && r.pp === 0 && r.atx.length === 3 && r.atx.every(a => a === "subdued") && r.flash === 0 && r.twoRooms === 0,
          `${tag} B6 · Adapt → Terraform → Region → Spread: each switch runs the SUBDUED mist with the simulation never running and no bloom:play-pause, the same room context, Adapt's real Cold Tolerance preview cleared BEFORE the swap (adapter.activePreview() null as the mist starts), the room layer never hidden in between (no Planet View flash) and never two rooms visible (${r.samples} visibility samples)`,
          bad.join(" || ") || rows.join(" · ") + ` · pp ${r.pp} · atx ${J(r.atx)}`);
        if (!FF) { // a room → room mid-transition still (deterministic: the animations are paused at the covered point)
          await p.evaluate(() => { window.__freezeAt = "covered"; window.__freezeDelay = 10; window.__frozen = false; }); await p.click('.dr .dr-room:not([hidden]) .rn[data-go="adapt"]');
          await p.waitForFunction(() => window.__frozen, null, { timeout: 3000 }).catch(() => {}); await shot(p, "07-room-to-room-mid-transition-covered.png");
          await p.evaluate(() => { window.__freezeAt = null; document.getAnimations().forEach(a => { try { a.play(); } catch {} }); }); await settledDR(p); await frames(p, 2); } }
      // B7 · Back from a pre-paused run stays paused; Resume runs only after the reveal; the overlay is gone after every run; the transitioning flag returns false
      { await back(p, false); await p.evaluate(() => __cv.A.actions.pause()); await openRoom(p, "region"); await back(p, false); const a = await state(p);   // paused before the room → Back leaves it paused
        await openRoom(p, "region"); const n0 = await p.evaluate(() => __EV.length);
        await p.click(".dr .dr-room:not([hidden]) .rb.resume"); const dur = await state(p); await settledDR(p); await frames(p, 2);
        const r = await p.evaluate(n => { const e = __cv.tl().pop(); return { e, st: __cv.state(), pp: __EV.slice(n).filter(x => x.type === "play-pause").map(x => x.detail.running), atxLeft: document.querySelectorAll(".atx").length, allRemoved: __ATX.every(x => x.removedAt !== null) }; }, n0);
        const e = r.e;
        check(a.room === null && a.running === false && dur.transitioning && dur.running === false && e.kind === "resume" && e.runningAtSwap === false && e.tResume >= e.tEnd && e.runningAtEnd === true && e.ticksAtEnd === e.ticksAtStart && J(r.pp) === "[true]" && r.st.running && !r.st.transitioning && r.atxLeft === 0 && r.allRemoved,
          `${tag} B7 · Back from a run paused before the room leaves it paused; Resume keeps it paused through the mist and runs it (one bloom:play-pause {running:true}) only after the reveal completed; after every run the overlay is gone and \`transitioning\` is false`, J({ back: a.running, resume: timing(e), pp: r.pp }));
        PROOF.timings[bname].push(timing(e)); }
      // B8 · concurrency: a rapid double click on a tool, on the nav and on Back; repeated Escape — no AtmosphereTransitionBusy, no double pause / resume, never two rooms, context kept, nothing sticky, focus coherent
      { await p.evaluate(() => { const A = __cv.A; A.actions.play(); A.actions.selectRegion(A.regions().find(x => !x.isOrigin).index); }); await frames(p, 2);
        const n0 = await p.evaluate(() => ({ ev: __EV.length, ign: __cv.DR.state().ignored, atx: __ATX.length }));
        await p.click('.pv-tool[data-tool="adapt"]', { clickCount: 2, delay: 15 }); await p.click('.pv-tool[data-tool="spread"]', { force: true }).catch(() => {}); await settledDR(p);
        const ctx = await p.evaluate(() => __cv.DR.state().contextId);
        await p.click('.dr .dr-room:not([hidden]) .rn[data-go="terraform"]', { clickCount: 2, delay: 15 }); await p.click('.dr .dr-room:not([hidden]) .rn[data-go="region"]', { force: true }).catch(() => {}); await settledDR(p);
        await p.keyboard.press("Escape"); await p.keyboard.press("Escape"); await p.keyboard.press("Escape"); await settledDR(p); await frames(p, 2);
        const r = await p.evaluate(n => ({ st: __cv.state(), ctxAfter: __cv.DR.state().contextId, ignored: __cv.DR.state().ignored - n.ign, pp: __EV.slice(n.ev).filter(x => x.type === "play-pause").map(x => x.detail.running), atx: __ATX.slice(n.atx).length, busy: __UNHANDLED.length, tl: __cv.tl().slice(-3).map(e => e.kind + ":" + (e.to || "-")) }), n0);
        const busyErr = p.errs.filter(e => /AtmosphereTransitionBusy|already running/.test(e));
        check(J(r.pp) === "[false,true]" && r.st.room === null && r.st.running && r.st.rooms === 0 && !r.st.overlay && !r.st.transitioning && r.st.active === null && r.ctxAfter === ctx && !busyErr.length && r.busy === 0 && r.atx === 3 && J(r.tl) === J(["open:adapt", "switch:terraform", "back:-"]),
          `${tag} B8 · click / key spam (a double click on Adapt + a click on Spread, a double click on Terraform + a click on Region, three Escapes): the extra requests are dropped (the mist's overlay and the controller's lock take no input; ${r.ignored} reached the controller and were ignored), exactly one pause and one resume, exactly three transitions (open Adapt, switch Terraform, Back), never two rooms, the context kept, no sticky preview, no AtmosphereTransitionBusy or unhandled rejection, the run back home and running`, J(r) + (busyErr.length ? " BUSY " + busyErr.join("|") : "")); }
      // B9 · failure safety: a rejecting component run, a hidden page, a run that never settles — the swap always happens, nothing stranded, no unhandled rejection
      { const r = await p.evaluate(async () => { const T = __cv.T, A = __cv.A, atx = T.atx, real = atx.run.bind(atx), out = {};
          const settle = () => new Promise(r => { const f = () => (__cv.DR.state().transitioning ? setTimeout(f, 20) : r()); f(); });
          // 1 · the component's run rejects at once (as a disposed / failing component would)
          atx.run = () => Promise.reject(Object.assign(new Error("boom"), { name: "TestFailure" })); A.actions.play(); __cv.DR.open("adapt"); await settle(); out.reject = { ...__cv.state(), last: __cv.tl().pop().error };
          __cv.DR.close(false); await settle(); out.rejectClose = __cv.state();
          // 2 · the page is hidden: immediate swap, no overlay
          atx.run = real; Object.defineProperty(document, "hidden", { configurable: true, get: () => true }); __cv.DR.open("spread"); await settle(); out.hidden = { ...__cv.state(), imm: __cv.tl().pop().immediate }; __cv.DR.close(false); await settle(); delete document.hidden; Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
          // 3 · a run that never settles: the watchdog swaps, the hard cap releases the controller; later swaps are immediate until it settles
          atx.run = () => new Promise(() => {}); const t0 = performance.now(); __cv.DR.open("region"); const mid = await new Promise(r => setTimeout(() => r({ ...__cv.state(), ms: Math.round(performance.now() - t0) }), 1200)); await settle(); out.stuck = { mid, after: { ...__cv.state(), ms: Math.round(performance.now() - t0) } };
          __cv.DR.close(false); await settle(); out.stuckClose = __cv.state(); atx.run = real; delete document.hidden;
          return { ...out, unhandled: __UNHANDLED.length }; });
        const ok = r.reject.room === "adapt" && !r.reject.transitioning && !r.reject.overlay && r.reject.running === false && /boom/.test(r.reject.last || "") && r.rejectClose.room === null && r.rejectClose.running === true
          && r.hidden.room === "spread" && r.hidden.imm === true && !r.hidden.overlay && r.stuck.mid.room === "region" && r.stuck.mid.transitioning === true && r.stuck.after.room === "region" && !r.stuck.after.transitioning && r.stuck.after.ms < 4000 && r.stuckClose.room === null && r.stuckClose.running === true && r.unhandled === 0;
        check(ok, `${tag} B9 · transition failure safety: a component run that rejects still swaps (the room opens, the error is recorded, nothing is stranded, Back restores the run); a hidden page swaps immediately with no overlay; a run that never settles is swapped by the watchdog (~0.9 s) and released by the hard cap (< 2.5 s) so the player is never locked; no unhandled promise rejection`, J(r)); }
      // B10 · network / console / shapes / horizontal scroll for the pages so far
      { const ext = p.reqs.filter(u => !u.startsWith(ORIGIN) && !u.startsWith("data:") && !u.startsWith("blob:"));
        const shapes = await p.evaluate(() => { const out = {}; for (const e of __EV) { const k = Object.keys(e.detail).join(); out[e.type] = out[e.type] || new Set(); out[e.type].add(k); } return Object.fromEntries(Object.entries(out).map(([t, s]) => [t, [...s]])); });
        const bad = Object.entries(shapes).filter(([t, ks]) => ks.length !== 1 || ks[0] !== SHAPES[t]);
        check(!ext.length && !p.errs.length && !bad.length && Object.keys(shapes).length >= 4, `${tag} B10 · no request leaves the local server, no console error; every bloom:* event seen (${Object.keys(shapes).join(", ")}) carries exactly its 028D1 detail keys`, `${p.reqs.length} requests${ext.length ? " · EXTERNAL " + ext.join(", ") : ""}${p.errs.length ? " · ERR " + p.errs.join(" | ") : ""}${bad.length ? " · SHAPES " + J(bad) : ""}`); }
      await p.context().close();

      // ---- B11 · the production Bloom Report on a training win: subdued open, the legacy modal hidden, data = the legacy authoritative calculation and the legacy markup from the same truth, the specimen from the real tiers, Terraform apart, actions, anchors, focus trap, Escape, Keep playing (resume after the reveal), run continues
      { const q = await open("?training=1&return=" + encodeURIComponent("/demos/main-menu.html"));
        const before = await q.evaluate(() => ({ anchors: ["report", "report-continue", "run-actions"].map(n => [n, document.querySelectorAll(`[data-tutorial="${n}"]`).length, !!document.querySelector(`[data-tutorial="${n}"]`) && !!document.querySelector(`[data-tutorial="${n}"]`).closest(".pv .rr"), document.querySelectorAll(`[data-tutorial-legacy="${n}"]`).length]), room: __cv.DR.state().room }));
        await openRoom(q, "adapt");                                                               // the win arrives under an open room: closed at once, nothing stale
        const n0 = await q.evaluate(() => ({ atx: __ATX.length, ev: __EV.length }));
        const won = await winTraining(q); await reportOpen(q); await frames(q, 3);
        const r = await q.evaluate(n => { const RR = __cv.RR, d = __cv.A.report(), L = __cv.legacyClassify(), atx = __ATX.slice(n.atx), e = __cv.rtl().pop();
          const ownedTiers = Object.fromEntries(__cv.A.upgrades().filter(b => b.board !== "Terraform").flatMap(b => b.items).filter(u => u.owned).map(u => [u.id, u.tier])), spec = RR.specimen.state;
          const fresh = BLOOM.plantSpecimen.draw(spec); const txt = __cv.reportText(), ltxt = __cv.legacyText();
          const build = document.querySelector(".rr-build .rr-sec:not(.rr-sky)").textContent, sky = (document.querySelector(".rr-sky") || {}).textContent || "";
          return { won: __cv.A.run().won, open: RR.state().open, kind: d.kind, heading: d.heading, h2: document.getElementById("rrTitle").textContent.trim(), cov: d.coveragePct, time: d.elapsed.text, world: d.identity.planetName, training: d.identity.training,
            held: d.held.map(h => h.region.id), gaveUp: d.gaveUp.map(g => [g.region.id, g.reason]), built: d.built.map(b => [b.id, b.tier]), terra: d.terraform.map(t => [t.id, t.tier]), spec: d.colonyUpgrades.map(c => [c.region.id, c.upgrade]), analogs: d.analogs.map(a => [a.id, a.science]), L,
            legacyModal: getComputedStyle(document.getElementById("reportModal")).display, legacyOn: document.getElementById("reportModal").classList.contains("on"), legacyReport: document.getElementById("report").innerHTML.length,
            atx: atx.map(a => a.preset), e, room: __cv.DR.state().room, inert: document.querySelector(".pv-hud").inert && document.querySelector(".pv-hud").getAttribute("aria-hidden") === "true", dialog: document.getElementById("rrCard").getAttribute("role") === "dialog" && document.getElementById("rrCard").getAttribute("aria-modal") === "true",
            focusIn: !!document.activeElement.closest("#rr"), focusId: document.activeElement.id, focusAct: document.activeElement.dataset.act || null, keepHidden: document.getElementById("rrContinue").hidden, keepRefused: __cv.A.actions.reportAction("keepPlaying") === false, specTraits: spec.traits, ownedTiers, specSig: RR.specimen.signature(), freshSig: (() => { let h = 0x811c9dc5; for (let i = 0; i < fresh.markup.length; i++) { h ^= fresh.markup.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(16); })(), specViable: fresh.viable, unviableClass: RR.specimen.el.classList.contains("unviable"),
            txt, ltxt, buildHasTerraform: d.terraform.some(t => build.includes(t.name)), skyHasTerraform: d.terraform.every(t => sky.includes(t.name)), actions: RR.state().actions, acts: __cv.A.reportActions().map(a => a.id + (a.href ? "=" + a.href : "")),
            anchors: ["report", "report-continue", "run-actions", "action-restartTraining", "action-mainMenu"].map(nm => [nm, document.querySelectorAll(`[data-tutorial="${nm}"]`).length, [...document.querySelectorAll(`[data-tutorial="${nm}"]`)].every(x => !!x.closest(".pv .rr"))]), covered: document.querySelectorAll('#pvMenu [data-tutorial-covered^="action-"]').length, status: BLOOM_TRAINING_UI.status().status }; }, n0);
        const names = {}; await q.evaluate(() => { const o = {}; for (const u of BLOOM_DATA.traits) o[u.id] = u.name; return o; }).then(o => Object.assign(names, o));
        const parity = r.cov === r.L.cov && J(r.held) === J(r.L.held) && J(r.gaveUp) === J(r.L.gaveUp) && J(r.built) === J(r.L.owned) && J(r.terra) === J(r.L.terra) && J(r.spec) === J(r.L.spec);
        const regionNames = await q.evaluate(() => Object.fromEntries(__cv.A.regions().map(x => [x.id, x.name])));
        const expectText = [`You held ${r.cov}`, ...r.held.map(id => regionNames[id] || id), ...r.gaveUp.map(([, why]) => why), ...r.built.map(([id]) => names[id]), ...r.terra.map(([id]) => names[id]), r.time];
        const missingText = expectText.filter(s => !r.txt.includes(s)).map(s => "prod:" + s).concat(expectText.filter(s => !r.ltxt.includes(s)).map(s => "legacy:" + s)); const textParity = !missingText.length;
        const sciences = await q.evaluate(() => Object.fromEntries(BLOOM_DATA.traits.map(u => [u.id, u.science || null])));
        const analogOk = r.analogs.every(([id, sci]) => r.txt.includes(sci) && sciences[id] === sci) && r.analogs.length === r.built.filter(([id]) => sciences[id]).length;
        const specOk = J(r.specTraits) === J(r.ownedTiers) && r.specSig === r.freshSig && r.specViable && !r.unviableClass;
        check(won && r.won && r.open && r.kind === "win" && r.heading === "TRAINING COMPLETE" && /TRAINING COMPLETE/.test(r.h2) && r.training && r.legacyModal === "none" && !r.legacyOn && r.legacyReport === 0 && r.atx.length === 1 && r.atx[0] === "subdued" && r.e.kind === "report-open" && r.e.ran && r.room === null && r.inert && r.dialog && r.focusIn && r.focusAct === "beginExpedition" && r.keepHidden && r.keepRefused
          && parity && textParity && analogOk && specOk && !r.buildHasTerraform && r.skyHasTerraform && J(r.actions) === J(["beginExpedition", "restartTraining", "mainMenu"]) && r.acts.every(a => !/ui=/.test(a)) && r.anchors.every(([, n, inPv]) => n === 1 && inPv) && J(before.anchors.map(a => a.slice(1))) === J([[1, true, 1], [1, true, 0], [1, true, 0]]) && r.status === "completed" && !q.errs.length,
          `${tag} B11 · a training win under an open Adapt room: the room closes at once, the production report opens through the SUBDUED mist as a modal dialog over the inert Planet View (TRAINING COMPLETE; (BLOOM-028D2) focus on Begin Expedition, no Keep playing — the hidden button keeps the report-continue anchor and the page refuses keepPlaying); the engineering modal never renders or shows; coverage / time / held / gave-up + reason / build tiers / Terraform / colony upgrades equal the legacy authoritative classification computed in place AND the legacy markup rendered from the same truth; analogs are the traits' own science text; the production plant specimen is rendered from the real owned tiers (signature = a fresh draw of the same state, viable); Terraform appears only in "You reshaped the sky"; actions = (BLOOM-028D2) Begin Expedition · Restart training · Main menu (no ui= in any href); report / report-continue / run-actions resolve to ONE production element before and after the win (the shell's report copy is legacy) and, while the report is open, action-restartTraining / action-mainMenu resolve ONLY to the report's buttons (the menu's copies are suspended); the training status is recorded completed`,
          J({ cov: [r.cov, r.L.cov], held: r.held, gaveUp: r.gaveUp, built: r.built, terra: r.terra, spec: r.spec, parity, textParity, missingText, analogOk, specOk, actions: r.actions, anchors: r.anchors, before: before.anchors, e: timing(r.e), flags: { won, open: r.open, heading: r.heading, training: r.training, legacyModal: r.legacyModal, legacyOn: r.legacyOn, legacyReport: r.legacyReport, atx: r.atx, room: r.room, inert: r.inert, dialog: r.dialog, focusIn: r.focusIn, focusId: r.focusId, focusAct: r.focusAct, keepHidden: r.keepHidden, keepRefused: r.keepRefused, buildHasTerraform: r.buildHasTerraform, skyHasTerraform: r.skyHasTerraform, hrefs: r.acts, status: r.status } }) + (q.errs.length ? " errs " + q.errs.join(" | ") : ""));
        PROOF.timings[bname].push(timing(r.e)); PROOF.report = PROOF.report || {}; PROOF.report[bname] = { training: { cov: r.cov, held: r.held, gaveUp: r.gaveUp, built: r.built, terra: r.terra, spec: r.spec, legacy: r.L, analogs: r.analogs.length } };
        if (!FF) { await shot(q, "14-training-complete-report.png"); const b = await q.evaluate(() => { const r = document.querySelector(".rr-plant").getBoundingClientRect(); return { x: r.x - 8, y: r.y - 8, width: r.width + 16, height: Math.min(r.height + 16, innerHeight - r.y) }; }); await shot(q, "09-report-plant-build-area.png", b); }
        // focus trap + Escape (win: never dismissed / resumed)
        const tabs = []; for (let k = 0; k < 30; k++) { await q.keyboard.press("Tab"); tabs.push(await q.evaluate(() => { const e = document.activeElement; return e.closest("#rr") ? "rr" : e === document.body ? "body" : "out:" + (e.id || e.className); })); }
        for (let k = 0; k < 3; k++) await q.keyboard.press("Escape"); await frames(q, 2);
        const esc = await q.evaluate(() => ({ open: __cv.RR.state().open, running: __cv.A.run().running, focusIn: !!document.activeElement.closest("#rr") }));
        check(tabs.every(t => t === "rr") && esc.open && esc.running === false && esc.focusIn, `${tag} B12 · the report traps focus (30 Tabs stay inside the dialog) and Escape never dismisses a win or resumes the run`, J({ tabs: [...new Set(tabs)], esc }));
        // training actions remain real: Restart training reopens the DEFAULT production training run paused; the completion store was written by the training layer
        await q.evaluate(() => { if (!__cv.RR.state().open) __cv.RR.open(); }); await settledRR(q).catch(() => {}); // (028D2) the training report is still open after B12
        const hasRestart = await q.evaluate(() => !!document.querySelector('#rr [data-act="restartTraining"]'));
        if (hasRestart) { await q.click('#rr [data-act="restartTraining"]'); await q.waitForFunction(() => window.BLOOM_RUN_UI && BLOOM_RUN_UI.adapter && BLOOM.runReport && BLOOM.runReport.instance && BLOOM_RUN_UI.adapter.run().ticks === 0, null, { timeout: 20000, polling: 100 }).catch(() => {}); await sleep(300); }
        const re = await q.evaluate(() => ({ search: location.search, pv: !!document.querySelector(".pv"), running: BLOOM_RUN_UI.adapter.run().running, ticks: BLOOM_RUN_UI.adapter.run().ticks, status: BLOOM_TRAINING_UI.status().status }));
        check(hasRestart && /training=1/.test(re.search) && !/ui=/.test(re.search) && re.pv && re.running === false && re.ticks === 0 && re.status === "completed", `${tag} B14 · Restart training from the production report (the page's own training path) reopens the DEFAULT production training run paused at tick 0 with no ui= in the URL; the stored training status stays "completed" (written by the unchanged training layer)`, J(re));
        await q.context().close(); }
        // Keep playing: subdued back, resume ONLY after the reveal, the run continues (continue-after-win unchanged: no play-pause event).
        // (BLOOM-028D2) a finished TRAINING no longer offers Keep playing, so this runs on an ORDINARY player-mode win on the same authored world
        { const q = await open("?play=1&planet=training_grounds"); await winTraining(q); await reportOpen(q); await frames(q, 3);
        const k0 = await q.evaluate(() => ({ atx: __ATX.length, ev: __EV.length, ticks: __cv.A.run().ticks }));
        await q.click("#rrContinue"); const dur = await q.evaluate(() => ({ ...__cv.state(), rrBusy: __cv.RR.state().busy })); await settledRR(q); await frames(q, 2); await sleep(500);
        const kp = await q.evaluate(n => { const e = __cv.rtl().pop(), atx = __ATX.slice(n.atx); return { e, atx: atx.map(a => a.preset), st: __cv.state(), pp: __EV.slice(n.ev).filter(x => x.type === "play-pause").length, ticks: __cv.A.run().ticks - n.ticks, focus: document.activeElement.id, shellOn: document.getElementById("reportModal").classList.contains("on"), hidden: document.getElementById("rr").hidden, menuAnchors: document.querySelectorAll('#pvMenu [data-tutorial^="action-"]').length, covered: document.querySelectorAll('[data-tutorial-covered]').length }; }, k0);
        check(dur.rrBusy && dur.running === false && kp.atx.length === 1 && kp.atx[0] === "subdued" && kp.e.kind === "report-close" && kp.e.ran && kp.e.runningBefore === false && kp.e.tResume >= kp.e.tEnd && kp.e.runningAtEnd === true && kp.st.running && !kp.st.inert && !kp.st.report.open && kp.hidden && kp.pp === 0 && kp.ticks > 0 && kp.focus === "pvPause" && !kp.shellOn && kp.menuAnchors === 3 && kp.covered === 0,
          `${tag} B13 · Keep playing: the SUBDUED mist closes the report, the run resumes ONLY after the reveal completed (the page's own continue-after-win: running again with no bloom:play-pause, exactly as the modal's button did), the Planet View takes input and focus again (Pause), its menu's action-* anchors are restored, and the run keeps advancing`, J({ e: timing(kp.e), ticks: kp.ticks, focus: kp.focus, menuAnchors: kp.menuAnchors }));
        PROOF.timings[bname].push(timing(kp.e)); await q.context().close(); }
      // ---- B15 · every 028D1 anchor resolves exactly once in the default (fresh training page, origin selected): the production controls own them all; the shell's copies are legacy
      { const q = await open("?training=1&return=" + encodeURIComponent("/demos/main-menu.html")); await sleep(300);
        const r = await q.evaluate(() => { const A = __cv.A, ids = A.upgrades().flatMap(b => b.items.map(u => "upgrade-" + u.id)), c0 = A.colony(A.regions().find(x => x.isOrigin).index);
          const names = ["biomass", "coverage", "sky", "play-pause", "speed", "run-menu", "action-restartTraining", "action-skipTraining", "action-mainMenu", "map", "map-view", "scenario-status", "message-log", "inspect", "readout", "limiting-factor", "colony-status", "raw-signals", "growth-focus", ...c0.focusChoices.map(f => "focus-" + f.id), "local-upgrade", ...c0.localChoices.map(l => "local-" + l.id), "upgrades", "board-spread", "board-adapt", "board-terraform", ...ids, "report", "report-continue", "run-actions"];
          const count = n => document.querySelectorAll(`[data-tutorial="${n}"]`).length, inPv = n => [...document.querySelectorAll(`[data-tutorial="${n}"]`)].every(e => !!e.closest(".pv"));
          const legacy = [...document.querySelectorAll("[data-tutorial-legacy]")].map(e => e.getAttribute("data-tutorial-legacy")), active = [...document.querySelectorAll("[data-tutorial]")].map(e => e.dataset.tutorial);
          return { n: names.length, bad: names.filter(n => count(n) !== 1 || !inPv(n)).map(n => `${n}:${count(n)}`), dup: active.filter((n, i) => active.indexOf(n) !== i), legacyOutside: legacy.every(n => true), shellActive: [...document.querySelectorAll("body > header [data-tutorial], body > main [data-tutorial], body > footer [data-tutorial], #reportModal[data-tutorial]")].length, legacyCount: legacy.length }; });
        check(!r.bad.length && !r.dup.length && r.shellActive === 0 && r.legacyCount >= 20, `${tag} B15 · all ${r.n} 028D1 anchors (HUD, run menu actions, map, map-view, scenario-status, log, banner, Region Inspect / Adapt / Spread / Terraform rooms, every offered upgrade, report / report-continue / run-actions) resolve to exactly ONE production element each on a fresh training page; no active duplicate anywhere; the hidden shell carries only data-tutorial-legacy copies (${r.legacyCount})`, J({ bad: r.bad, dup: r.dup, shellActive: r.shellActive })); await q.context().close(); }
      // ---- B16 · extinction: the production Extinction report (reason, time, world, scenario state, debrief, actions = the legacy policy), Escape cannot dismiss a dead run; parity with the legacy loss markup; harness mode keeps "Restart this run"
      { const q = await open("?play=1&archetype=frozen_world&seed=9&scenario=dying_world"); const n0 = await q.evaluate(() => __ATX.length);
        await q.evaluate(() => { BLOOM_API.advance(3000); }); await reportOpen(q); await frames(q, 3);
        const r = await q.evaluate(n => { const d = __cv.A.report(), L = __cv.legacyClassify(), e = __cv.rtl().pop(); return { lost: L.lost, kind: d.kind, heading: d.heading, reason: d.reason, lostReason: L.lostReason, time: d.elapsed.text, grace: d.graceSeconds, world: d.identity.planetName, pr: d.pressure, txt: __cv.reportText(), ltxt: __cv.legacyText(), actions: __cv.RR.state().actions, atx: __ATX.slice(n).map(a => a.preset), e,
            legacyModal: getComputedStyle(document.getElementById("reportModal")).display, keep: document.getElementById("rrContinue").hidden, unviable: __cv.RR.specimen.el.classList.contains("unviable"), h2: document.getElementById("rrTitle").textContent.trim(), focusIn: !!document.activeElement.closest("#rr") }; }, n0);
        for (let k = 0; k < 3; k++) await q.keyboard.press("Escape"); await frames(q, 2); const esc = await q.evaluate(() => ({ open: __cv.RR.state().open, running: __cv.A.run().running }));
        const low = r.txt.toLowerCase(); // (section headings are CSS-uppercased: innerText returns the rendered case)
        const prOk = r.pr && r.txt.includes(`${Math.round(r.pr.progress * 100)} % of the decline`) && r.ltxt.includes(`${Math.round(r.pr.progress * 100)}% of the decline`) && low.includes("pressure · dying world") && r.ltxt.includes("Pressure: Dying World");
        const conds = { lost: r.lost, kind: r.kind === "loss", heading: r.heading === "EXTINCTION" && /EXTINCTION/.test(r.h2), reason: r.reason === r.lostReason, grace: r.txt.includes(`for ${r.grace} s`) && r.ltxt.includes(`for ${r.grace} s`), time: r.txt.includes(r.time) && r.ltxt.includes(`${r.time.split("m ")[0]}m`), world: r.txt.includes(r.world), prOk, debrief: low.includes("what happened") && r.ltxt.includes("What happened"),
          actions: J(r.actions) === J(["playAgain", "newWorld", "changePlanet", "home"]), keep: r.keep, atx: r.atx.length === 1 && r.atx[0] === "subdued", e: r.e.kind === "report-open", legacyModal: r.legacyModal === "none", unviable: r.unviable, focusIn: r.focusIn, esc: esc.open && esc.running === false, errs: !q.errs.length };
        check(Object.values(conds).every(Boolean),
          `${tag} B16 · Dying World extinction (Frozen 9, player mode): the production Extinction report opens through the SUBDUED mist with the real reason (= sim.lostReason), how long the run lasted, the world, the final pressure state and the existing "What happened" debrief — the same words as the legacy loss markup from the same truth; the actions are the player's (no Keep playing; BLOOM-030: Play again · Same planet, new world · Change planet · Home — the retired launcher's Change scenario is gone); the specimen reads unviable; Escape cannot dismiss it into the dead run`, J({ reason: r.reason, time: r.time, actions: r.actions, esc, e: timing(r.e), failed: Object.entries(conds).filter(([, v]) => !v).map(([k]) => k) }) + (q.errs.length ? " errs " + q.errs.join(" | ") : ""));
        if (!FF) await shot(q, "10-production-extinction-report.png"); PROOF.timings[bname].push(timing(r.e)); await q.context().close();
        const h = await open("?archetype=frozen_world&seed=9&scenario=dying_world"); await h.evaluate(() => { BLOOM_API.advance(3000); }); await reportOpen(h); await frames(h, 2);
        const hr = await h.evaluate(() => ({ actions: __cv.RR.state().actions, acts: __cv.A.reportActions().map(a => a.id) })); check(J(hr.actions) === J(["restartRun"]) && J(hr.acts) === J(["restartRun"]), `${tag} B16b · outside player mode the extinction report keeps the harness's one action, Restart this run (the page's reload)`, J(hr)); await h.context().close(); }
      // ---- B17 · scenario win reports: pressure, competition, climate — real wins through the adapter's buy on the validator's first strategy; parity with the legacy scenario lines from the same truth
      { const cases = [["pressure", "ocean_archipelago", 28, "dying_world", "repPressure", "Pressure · Dying World", "11-pressure-win-report.png"], ["competition", "desert_world", 17, "native_competition", "repComp", "Competition · Native Competition", "12-competition-win-report.png"], ["climate", "frozen_world", 4, "volatile_climate", "repClimate", "Climate · Volatile Climate", "13-volatile-climate-win-report.png"]];
        for (const [label, aid, seed, sid, legacyId, title, shotName] of cases) {
          if (FF && label !== "climate") continue;
          const plan = planFor(aid, seed, sid), q = await open(`?archetype=${aid}&seed=${seed}&scenario=${sid}`);
          const w = await winScenario(q, plan); if (w.won) await reportOpen(q).catch(() => {}); await frames(q, 3);
          const r = await q.evaluate(([legacyId, title]) => { const d = __cv.A.report(); if (!d) return null; const el = document.createElement("div"); el.innerHTML = legacyWinHtml(d); const leg = el.querySelector("#" + legacyId); const L = __cv.legacyClassify();
            const S = JSON.stringify, nums = s => (s.match(/\d+(?:\.\d+)?/g) || []); const card = [...document.querySelectorAll(".rr-scn")].find(x => x.textContent.includes(title));
            return { kind: d.kind, open: __cv.RR.state().open, scn: d.identity.scenarioName, section: !!card, legacy: leg ? leg.innerText.replace(/\s+/g, " ") : null, prod: card ? card.innerText.replace(/\s+/g, " ") : null, numsSame: card && leg ? S(nums(card.innerText)) === S(nums(leg.innerText)) : false, cov: [d.coveragePct, L.cov], held: S(d.held.map(h => h.region.id)) === S(L.held), gaveUp: S(d.gaveUp.map(g => [g.region.id, g.reason])) === S(L.gaveUp), terra: S(d.terraform.map(t => [t.id, t.tier])) === S(L.terra), data: d.pressure || d.competition || d.climate }; }, [legacyId, title]);
          check(w.won && r && r.kind === "win" && r.open && r.section && r.numsSame && r.cov[0] === r.cov[1] && r.held && r.gaveUp && r.terra && !q.errs.length,
            `${tag} B17 · ${label} win (${aid} ${seed}, ${plan.join(" → ")} bought through the adapter when affordable): the production report shows the scenario's final state with exactly the numbers of the legacy "${title.replace(" · ", ": ")}" line from the same truth; coverage / held / gave-up / Terraform equal the legacy classification`,
            J({ won: w, prod: r && r.prod && r.prod.slice(0, 160), legacy: r && r.legacy && r.legacy.slice(0, 160) }) + (q.errs.length ? " errs " + q.errs.join(" | ") : ""));
          PROOF.report[bname][label] = r && { scenario: r.scn, data: r.data, legacyLine: r.legacy, cov: r.cov };
          if (!FF) await shot(q, shotName); await q.context().close(); } }
      // ---- B18 · widths: no horizontal scroll with a room and with the report; controls ≥ 44 px; Firefox production default
      for (const [w, h] of FF ? [[1280, 800]] : [[1024, 768], [1280, 800], [1440, 900]]) {
        const q = await open("?training=1&return=" + encodeURIComponent("/demos/main-menu.html"), { w, h }); await openRoom(q, "adapt");
        const a = await q.evaluate(() => ({ doc: document.documentElement.scrollWidth - innerWidth, dr: document.getElementById("dr").scrollWidth - document.getElementById("dr").clientWidth }));
        if (FF) await shot(q, "17-firefox-production-default-room.png");
        await back(q, false); await winTraining(q); await reportOpen(q); await frames(q, 3);
        const r = await q.evaluate(() => { const R = e => e.getBoundingClientRect(), card = document.getElementById("rrCard"), vis = [...document.querySelectorAll("#rr button")].filter(b => b.offsetParent);
          return { doc: document.documentElement.scrollWidth - innerWidth, rr: document.getElementById("rr").scrollWidth - document.getElementById("rr").clientWidth, card: [Math.round(R(card).width), Math.round(R(card).height)], inside: R(card).left >= 0 && R(card).right <= innerWidth && R(card).top >= 0 && R(card).bottom <= innerHeight,
            small: vis.filter(b => R(b).width < 43.5 || R(b).height < 43.5).map(b => b.dataset.act), mapVisible: getComputedStyle(document.getElementById("pvMap")).display !== "none" && getComputedStyle(document.querySelector(".pv-stage")).visibility !== "hidden", veil: getComputedStyle(document.querySelector(".rr-veil")).backgroundImage !== "none", actionsVisible: R(document.getElementById("rrActions")).bottom <= innerHeight && R(document.getElementById("rrContinue")).top >= 0 }; });
        check(a.doc <= 0 && a.dr <= 0 && r.doc <= 0 && r.rr <= 0 && r.inside && !r.small.length && r.mapVisible && r.veil && r.actionsVisible, `${tag} B18 · ${w}×${h}: no horizontal scroll with a room open or with the report; the report card sits inside the window with its actions in view (the body scrolls inside the card), every report control is at least 44 px, the dimmed Planet View stays visible around it`, J({ room: a, report: r }));
        if (!FF && w !== 1280) await shot(q, w === 1024 ? "15-report-1024x768.png" : "16-report-1440x900.png"); if (FF) await shot(q, "18-firefox-production-report.png");
        await q.context().close(); }
      // ---- B19 · reduced motion (OS): the component's own reduced path (rm overlay class, reduced result), no room-card transform, the report the same; the Settings "reduced" choice reaches the bridge
      if (!FF) { const q = await open("?training=1&return=" + encodeURIComponent("/demos/main-menu.html"), { rm: true });
        await q.click('.pv-tool[data-tool="adapt"]'); const dur = await q.evaluate(() => { const sec = document.querySelector(".dr .dr-room:not([hidden])"); return { entering: sec ? sec.classList.contains("entering") : null }; }); await settledDR(q); await frames(q, 2);
        const r = await q.evaluate(() => { const sec = document.querySelector(".dr .dr-room:not([hidden])"), e = __cv.tl().pop(); return { atx: __ATX.map(a => ({ preset: a.preset, rm: a.rm })), rm: e.ran, red: __cv.T.last && __cv.T.last.reducedMotion, entering: sec.classList.contains("entering"), transform: getComputedStyle(sec).transform, anims: document.getAnimations().filter(a => a.playState === "running").length, cls: document.querySelector(".pv").classList.contains("reduced"), bridgeReduced: __cv.T.reducedMotion() }; });
        await back(q, false); await winTraining(q); await reportOpen(q); await frames(q, 2);
        const rr = await q.evaluate(() => ({ card: document.getElementById("rrCard").classList.contains("entering"), transform: getComputedStyle(document.getElementById("rrCard")).transform, atx: __ATX.slice(-1).map(a => a.rm), red: __cv.RR.timeline().pop() && __cv.T.last.reducedMotion }));
        await shot(q, "18-reduced-motion-report.png");
        check(r.atx.length === 1 && r.atx[0].preset === "subdued" && r.atx[0].rm && r.red === true && r.bridgeReduced && !r.entering && dur.entering !== true && r.transform === "none" && r.anims === 0 && r.cls && !rr.card && rr.transform === "none" && rr.atx[0] === true && rr.red === true,
          `${tag} B19 · OS reduced motion: the SUBDUED run takes the component's own reduced path (overlay class rm, result reducedMotion true; no second algorithm), the room card gets no entrance transform (computed transform none, no entering class, no running animation), the report the same`, J({ r, rr }));
        await q.context().close();
        const s = await open("?training=1&return=" + encodeURIComponent("/demos/main-menu.html"), { settings: { motion: "reduced" } }); await openRoom(s, "adapt");
        const sr = await s.evaluate(() => ({ setting: __cv.T.settingsMotion, red: __cv.T.last.reducedMotion, rm: __ATX[0] && __ATX[0].rm, bridge: __cv.T.reducedMotion(), entering: document.querySelector(".dr .dr-room:not([hidden])").classList.contains("entering") }));
        check(sr.setting === true && sr.red === true && sr.rm && sr.bridge && !sr.entering, `${tag} B19b · the player's Settings motion choice ("Reduced", main-menu-data.js) reaches the bridge (constructor reducedMotion true → the component's reduced path) and the rooms, with the OS unchanged`, J(sr)); await s.context().close(); }
      // ---- B20 · (BLOOM-031) over file:// the real AtmosphereTransition now loads (the portable runtime: B20a); the module-less fallback — immediate
      // swaps, mechanics intact (open / close / switch / report open / Keep playing), no error — is forced by a failing portable runtime (B20)
      if (!FF) { const q = await open("?planet=training_grounds", { file: true });
        const r = await q.evaluate(async () => { const settle = () => new Promise(r => { const f = () => (__cv.DR.state().transitioning ? setTimeout(f, 10) : r()); f(); });
          const t = Date.now(); while (__cv.T.kind === "pending" && Date.now() - t < 10000) await new Promise(r => setTimeout(r, 50));
          __cv.DR.open("adapt"); await settle(); const imm = __cv.tl().pop().immediate; __cv.DR.close(false); await settle(); return { kind: __cv.T.kind, imm, portable: !!window.BLOOM_PORTABLE, room: __cv.DR.state().room }; });
        check(r.kind === "atmosphere" && r.imm === false && r.portable && r.room === null && !q.errs.length, `${tag} B20a · (BLOOM-031) over file:// the room swaps use the REAL AtmosphereTransition, loaded from the generated portable runtime (no immediate fallback), no error`, J(r)); await q.context().close(); }
      if (!FF) { const q = await open("?planet=training_grounds", { file: true, failPortable: true });   // (an authored run; the portable runtime forced to fail)
        const r = await q.evaluate(async () => { const T = __cv.T, A = __cv.A, out = { kind: T.kind, canLoad: BLOOM.gameplayTransition.canLoadModules() };
          const settle = () => new Promise(r => { const f = () => (__cv.DR.state().transitioning ? setTimeout(f, 10) : r()); f(); });
          __cv.DR.open("adapt"); await settle(); out.open = { ...__cv.state(), imm: __cv.tl().pop().immediate, atx: __ATX.length };
          __cv.DR.open("terraform"); await settle(); out.sw = { room: __cv.DR.state().room, running: A.run().running }; __cv.DR.close(false); await settle(); out.back = { room: __cv.DR.state().room, running: A.run().running, pp: __EV.filter(e => e.type === "play-pause").map(e => e.detail.running) };
          BLOOM_API.addBiomass(5000); A.actions.buy("cold"); A.actions.buy("humid"); let n = 0; while (!BLOOM_API.sim.won && n < 20000) { BLOOM_API.advance(200); n += 200; }
          await new Promise(r => setTimeout(r, 100)); const rs = () => new Promise(r => { const f = () => (__cv.RR.state().busy ? setTimeout(f, 10) : r()); f(); }); await rs(); out.report = { ...__cv.RR.state(), imm: __cv.rtl().pop().immediate, won: A.run().won };
          __cv.RR.keepPlaying(); await rs(); out.keep = { open: __cv.RR.state().open, running: A.run().running, atx: __ATX.length, unhandled: __UNHANDLED.length }; return out; });
        check(r.kind === "immediate" && r.canLoad && r.open.room === "adapt" && r.open.imm && r.open.atx === 0 && r.open.running === false && r.sw.room === "terraform" && r.sw.running === false && r.back.room === null && r.back.running === true && J(r.back.pp) === "[false,true]" && r.report.open && r.report.imm && r.report.won && J(r.report.actions) === '["keepPlaying"]' && !r.keep.open && r.keep.running && r.keep.atx === 0 && r.keep.unhandled === 0 && !q.errs.length,
          `${tag} B20 · when the transition module cannot load (over file:// with the portable runtime forced to fail): every swap is immediate (no overlay, no error), the mechanics are intact — open pauses, switch stays paused, Back resumes, the production report opens on the win and Keep playing resumes`, J(r) + (q.errs.length ? " errs " + q.errs.join(" | ") : "")); await q.context().close(); }
      // ---- B21 · a deterministic mid-conceal still (the animations paused inside the conceal) — evidence only, plus the run-report's generated hrefs
      if (!FF && EVIDENCE) { const q = await open("?archetype=ocean_archipelago&seed=28"); await q.evaluate(() => { const A = __cv.A; A.actions.selectRegion(A.regions().find(x => !x.isOrigin).index); });
        await q.evaluate(() => { window.__freezeAt = "concealing"; window.__freezeDelay = 45; window.__frozen = false; }); await q.click('.pv-tool[data-tool="adapt"]');
        await q.waitForFunction(() => window.__frozen, null, { timeout: 3000 }).catch(() => {}); await shot(q, "06-transition-mid-conceal.png");
        await q.evaluate(() => { window.__freezeAt = null; document.getAnimations().forEach(a => { try { a.play(); } catch {} }); }); await settledDR(q); await frames(q, 2);
        // a frame strip: four stills at the component's phases (concealing paused early / covered / revealing paused early / idle)
        const strip = []; for (const [ph, delay, name] of [["concealing", 25, "concealing"], ["covered", 5, "covered"], ["revealing", 40, "revealing"]]) {
          await q.evaluate(([ph, d]) => { window.__freezeAt = ph; window.__freezeDelay = d; window.__frozen = false; }, [ph, delay]); await q.click('.dr .dr-room:not([hidden]) .rn[data-go="terraform"]').catch(() => {}); if (ph !== "concealing") { /* the same run continues: resume, then freeze at the next phase */ }
          await q.waitForFunction(() => window.__frozen, null, { timeout: 3000 }).catch(() => {}); await shot(q, `frame-strip-${name}.png`); strip.push(name);
          await q.evaluate(() => { window.__freezeAt = null; document.getAnimations().forEach(a => { try { a.play(); } catch {} }); }); await settledDR(q); await back(q, false).catch(() => {}); await openRoom(q, "adapt").catch(() => {}); }
        await back(q, false); await frames(q, 2); await shot(q, "frame-strip-idle-planet-view.png"); info(`${tag} frame strip`, strip.concat("idle").join(" → ")); await q.context().close(); }
    } catch (e) { check(false, `${tag} crashed`, e.stack.split("\n").slice(0, 4).join(" | ")); }
    for (const pg of pages) await pg.context().close().catch(() => {});
    await browser.close();
  }
  server.close();
  // the timing proof: for every recorded swap, pause ≤ covered (open), resume ≥ reveal complete (close), never running at the swap
  { const all = Object.entries(PROOF.timings || {}).flatMap(([b, list]) => list.map(t => ({ browser: b, ...t })));
    const openOk = all.filter(t => t.kind === "open").every(t => t.pauseAfterStartMs === null || t.pauseAfterStartMs <= t.coveredMs), closeOk = all.filter(t => /back|resume|report-close/.test(t.kind)).every(t => t.resumeMs === null || t.resumeMs >= t.revealCompleteMs), swapOk = all.every(t => t.runningAtSwap !== true && t.ticksAtEnd === t.ticksAtStart);
    PROOF.timingSummary = { swaps: all.length, openOk, closeOk, swapOk, coveredMs: all.filter(t => t.ran).map(t => t.coveredMs), revealCompleteMs: all.filter(t => t.ran).map(t => t.revealCompleteMs) };
    check(all.length >= 6 && openOk && closeOk && swapOk, `timing proof · ${all.length} recorded swaps: every open pauses before its covered point, every close resumes only after its reveal completed, the simulation never runs at a swap and no tick passes during any transition`, `covered ${PROOF.timingSummary.coveredMs.join("/")} ms · revealed ${PROOF.timingSummary.revealCompleteMs.join("/")} ms`); }
  if (EVIDENCE) { fs.writeFileSync(path.join(EVD, "convergence-proof.json"), JSON.stringify(PROOF, null, 2) + "\n"); console.log("INFO  evidence written to docs/evidence/bloom-029e/"); }
  console.log(`\n${fails ? `${fails} check(s) FAILED` : "ALL CHECKS PASS"}  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log("FAIL  crashed — " + e.stack); console.log("\n1 check(s) FAILED"); process.exit(1); });
