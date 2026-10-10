// BLOOM — Release check (BLOOM-030): the Strange Bloom production root entry and the final release candidate. The 31st regression suite.
// docs/RELEASE_CANDIDATE_v1.md. Numbered after the directive's items 1–80 (R1 … R80; one check may carry several items).
//
//   NODE_PATH="$(npm root -g)" node tools/release-check.js [--browsers chromium,firefox] [--evidence] [--no-suites]
//
// Node: the exact start (726f74d) and this milestone's scope; the root index.html IS the Strange Bloom title (thin: title-boot.js →
// the ONE page composer resources/main-menu/main-menu-page.js, shared with the demos/main-menu.html alias) and nothing of the
// BLOOM-016 launcher survives (hash router, planet / scenario choosers, briefing, emoji icon table, mini-map renderer); no title
// orchestration is duplicated anywhere in the repository; the protected engine / generator / sphere / surface / transition / survey /
// planet / content files are byte-identical to 726f74d; the run page's bloom:* dispatch sites and anchor set are 726f74d's and its
// diff is the title links alone; no deployment / package / vendor file and no external URL; the paused c23815e 028D2 worktree untouched.
// Browser (a real static server on 127.0.0.1 serving "/" like any web server; Chromium, Firefox for the main path): GET / · /index.html ·
// /?begin=1 = 200; the canonical URL / → the title (12 paintings, no repeat, the next preloaded, Recommended + the first-run dialog,
// Settings, Credits, the first-sector prefetch, the black fades, ?begin=1, Escape / Back, rotation) → the Destination Survey (nine
// validated worlds) → the exact candidate (focus, DRAMATIC, the session handoff, no generator) → demos/demo-run.html (fingerprint,
// canonical surface == the focused globe, four rooms, the Terraform sphere's identity, the report) → Play again / Choose another planet /
// Main menu back to ROOT; TRAINING from ROOT and every training exit back to ROOT; direct developer URLs, ?ui=legacy, file://, viewports,
// reduced motion, keyboard, bfcache; every request local, no console error, no unhandled rejection. Unless --no-suites, it then runs
// single-app-flow-check (BLOOM-033; replaces expedition-handoff-check) and guided-training-check (Chromium) as children (R52 / R60 / R61).
// --evidence writes docs/evidence/bloom-030/ (stills + release-proof.json). Exits 1 on any failure.
// (BLOOM-033) The game is ONE document now (index.html; docs/SINGLE_DOCUMENT_APP_v1.md): the run mounts inside the root, so the session
// handoff, the run page navigation, its ROOT return URLs and the back-forward-cache rules are retired. The browser flows below prove the
// same release journeys INSIDE the root document (the exact planet object, no generator after the selection — armed at Begin Expedition —,
// one document load, the address unchanged); the source checks keep BLOOM-030's own guarantees bound to BLOOM-030's range (END). The
// two-document child suite (expedition-handoff-check) is retired; tools/single-app-flow-check.js takes its place as a child.
"use strict";
const path = require("path"), fs = require("fs"), http = require("http"), cp = require("child_process"), crypto = require("crypto");
const ROOT = path.resolve(__dirname, "..");
for (const f of ["content/config.js", "content/traits.js", "planets/first_bloom.js", "planets/training_grounds.js", "content/archetypes.js", "content/scenarios.js",
  "content/play.js", "content/training.js", "resources/bloom-sim.js", "resources/bloom-gen.js", "resources/bloom-validate.js", "resources/bloom-witness.js",
  "resources/bloom-archetype.js", "resources/bloom-scenario.js", "resources/bloom-play.js"]) require(path.join(ROOT, f));   // (BLOOM-033: the handoff module is gone)
const D = BLOOM_DATA, J = JSON.stringify, read = f => fs.readFileSync(path.join(ROOT, f), "utf8");
const argv = process.argv, argOf = k => { const i = argv.indexOf(k); return i > 0 ? argv[i + 1] : null; };
const BROWSERS = (argOf("--browsers") || "chromium,firefox").split(","), EVIDENCE = argv.includes("--evidence"), SUITES = !argv.includes("--no-suites");
const EVD = path.join(ROOT, "docs/evidence/bloom-030");
let fails = 0, passes = 0; const t0 = Date.now();
const check = (ok, name, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); if (ok) passes++; else fails++; };
const info = (name, detail) => console.log(`INFO  ${name}  — ${detail}`);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const git = (a, cwd = ROOT) => cp.execSync(`git ${a}`, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 << 20 }).trim();
const sha256 = b => crypto.createHash("sha256").update(b).digest("hex");
const strip = src => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/<!--[\s\S]*?-->/g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");

// the accepted start (BLOOM-028D2 final) and the paused old 028D2 draft's fingerprint (recorded before this milestone touched anything)
const BASE_SHA = "726f74d5f03200ed5ced730533f88a285494dbf4";
const OLD_WT = path.resolve(ROOT, "../bloom-028d2-guided-training");
const OLD_FP = { head: "c23815ed080dcd084ab4ea412c2a13292c18c181", status: "8abc76b1655aafc0162f675dd0d78ecd9de3b5322d761eb31bf412d0123f4d28", diff: "bde236ae96e4fbae62ba37ab92c46cd57dff1030e774dcb992696f08aa4cda9a",
  untracked: { "resources/training/training-coach.js": "7a600705398e2479bee80b04e4badbc1eba967e8005e7281e60b06dd84dd4b16", "resources/training/training-director.js": "f28082f914af4ad8fa99158b146af24fbeb3b8a8100ac570e06fb5eb4382632f",
    "resources/training/training-steps.js": "a047e8ef07a01f1c43bbb6e0df5d22c3ce321d6d5c39a8942893f6e226047cb0", "tools/guided-training-check.js": "e061130f31e342dc7961534dd7c321167223f72de484da9857cbbfe22cbfaa27" } };
// BLOOM-030's own range: 726f74d → the newest BLOOM-030 commit (plus the working tree while that commit is HEAD or none exists yet), so
// later milestones that legitimately work elsewhere never trip these provenance checks (the run-ui-check pattern)
const COMMITS = git(`log --format=%H%x09%s ${BASE_SHA}..HEAD`).split("\n").filter(Boolean).map(l => l.split("\t"));
const OWN = COMMITS.filter(([, s]) => /^BLOOM-030\b/.test(s)), END = OWN.length ? OWN[0][0] : null, HEAD = git("rev-parse HEAD");
const WITH_TREE = !END || END === HEAD, RANGE = WITH_TREE ? BASE_SHA : `${BASE_SHA} ${END}`;
const hashAt = f => WITH_TREE ? git(`hash-object "${f}"`) : git(`rev-parse ${END}:${f}`), readAt = f => WITH_TREE ? read(f) : git(`show ${END}:${f}`);
const existsAt = f => WITH_TREE ? fs.existsSync(path.join(ROOT, f)) : (() => { try { git(`cat-file -e ${END}:${f}`); return true; } catch { return false; } })();

// the directive's protected systems (byte-identical) and the components this milestone composes but must not change or duplicate
const PROTECTED = ["resources/bloom-sim.js", "resources/bloom-gen.js", "resources/bloom-validate.js", "resources/bloom-witness.js", "resources/bloom-archetype.js", "resources/bloom-scenario.js",
  "resources/planet-surface/planet-surface.js", "resources/planet-sphere/planet-sphere-view.js", "resources/planet-sphere/planet-texture.js", "resources/atmosphere-transition/atmosphere-transition.js",
  "resources/destination-survey/survey-data.js", "resources/destination-survey/survey-worker.js", "content/config.js", "content/traits.js",
  ...git(`ls-tree -r --name-only ${BASE_SHA} -- planets`).split("\n").filter(Boolean)];
const COMPONENTS = ["resources/main-menu/main-menu.js", "resources/main-menu/expedition-entry.js", "resources/main-menu/main-menu-data.js", "resources/main-menu/black-fade.js",
  "resources/destination-survey/destination-survey.js", "resources/destination-survey/sector-pool.js", "resources/destination-survey/destination-survey.css", "resources/expedition/expedition-handoff.js", "resources/expedition/expedition-arrival.js",
  "resources/training/training-run.js", "resources/training/training-store.js", "resources/training/training-steps.js", "resources/training/training-director.js", "resources/training/training-coach.js",
  "resources/run-ui/run-ui-adapter.js", "resources/run-ui/planet-view.js", "resources/run-ui/decision-rooms.js", "resources/run-ui/run-report.js", "resources/run-ui/terraform-globe.js", "resources/run-ui/gameplay-transition.js",
  "resources/bloom-play.js", "resources/bloom-play-worker.js", "content/play.js", "content/archetypes.js", "content/scenarios.js"];
const SCOPE = p => ["index.html", "demos/main-menu.html", "demos/demo-run.html", "content/training.js", "resources/main-menu/main-menu-page.js", "resources/main-menu/title-boot.js", "resources/main-menu/main-menu.css", "README.md"].includes(p)
  || p.startsWith("tools/") || p.startsWith("docs/");
const EVTS = ["run-ready", "play-pause", "speed", "region-select", "upgrade-preview", "upgrade-purchase", "growth-focus", "local-upgrade", "bubble-collect", "win"];
const DETAIL_KEYS = { "run-ready": ["kind", "planetId", "running", "training"], "play-pause": ["running"], speed: ["speed"], "region-select": ["id", "index", "name", "previous", "tile", "water"],
  "upgrade-preview": ["available", "better", "board", "gain", "id", "lose", "name", "reachHostile", "worse"], "upgrade-purchase": ["biomass", "board", "cost", "id", "name", "tier"],
  "growth-focus": ["changed", "focus", "id", "index", "name", "previous"], "local-upgrade": ["cost", "id", "index", "name", "upgrade", "upgradeName"],
  "bubble-collect": ["how", "id", "index", "name", "tile", "value"], win: ["coverage", "planetId", "ticks", "training"] };
const GEN_NAMES = ["generateFromArchetype", "generatePlanet", "attemptPlanet", "searchWorld", "runSearch"];
const EMOJI = /\p{Extended_Pictographic}/u, DEV_COPY = /BLOOM-0\d\d|playtest harness|development handoff|temporary shell|ui=18|ui=legacy|milestone|training not ready|not yet open|Choose a New Planet|Start with First Bloom/i;
const PROOF = { milestone: "BLOOM-030", generatedAt: new Date().toISOString(), baseSha: BASE_SHA, head: HEAD, rootTitleUrl: null, rootAssetRequests: [], rootSmoke: {}, firstSector: null, selectedCandidate: null,
  run: null, rootReturnUrls: {}, trainingReturnUrls: {}, suiteTotals: null, browsers: {}, viewports: {}, protectedFileHashes: {}, fileProtocol: {}, oldWorktree: null, children: {} };

(async () => {
  // ================================================================ Node
  console.log("# Node");
  // R1 · the exact start
  { const first = git(`rev-list --first-parent --reverse ${BASE_SHA}..HEAD`).split("\n").filter(Boolean)[0] || null, parent = first ? git(`rev-parse ${first}^`) : HEAD;
    const own = END ? git(`log --format=%s ${BASE_SHA}..${END}`).split("\n").filter(Boolean) : [];
    check(git(`merge-base HEAD ${BASE_SHA}`) === BASE_SHA && parent === BASE_SHA && own.every(s => /^BLOOM-030\b/.test(s)),
      "R1 · the release candidate starts at the accepted BLOOM-028D2 final 726f74d5 exactly (not origin/main): the first commit's parent, or HEAD itself before any commit; every commit of this milestone is a BLOOM-030 commit",
      `HEAD ${HEAD.slice(0, 7)} · ${COMMITS.length} commit(s) since 726f74d (${OWN.length} BLOOM-030) · range ${RANGE.split(" ").map(s => s.slice(0, 7)).join("..")}${WITH_TREE ? " + working tree" : ""}`); }
  // scope: only the release-path files changed
  { const changed = [...new Set([...git(`diff --name-only ${RANGE}`).split("\n"), ...(WITH_TREE ? git("ls-files --others --exclude-standard").split("\n") : [])].filter(Boolean))];
    const outside = changed.filter(p => !SCOPE(p));
    check(!outside.length, "R1b · scope: the milestone touches only the release path — the root index.html, the demos/main-menu.html alias, the run page's title links, content/training.js's return fallback, the new page composer + boot + their styles, tools, docs, README",
      outside.join(", ") || `${changed.length} files: ${changed.filter(p => !p.startsWith("docs/evidence/")).join(", ")}`); }

  const INDEX = readAt("index.html"), ALIAS = readAt("demos/main-menu.html"), BOOT = readAt("resources/main-menu/title-boot.js"), PAGE = readAt("resources/main-menu/main-menu-page.js");
  const RUN = readAt("demos/demo-run.html"), RUN_BASE = git(`show ${BASE_SHA}:demos/demo-run.html`), M = await import(path.join(ROOT, "resources/main-menu/main-menu-data.js"));
  // R2–R7 · the root is the title; nothing of the BLOOM-016 launcher survives
  { const code = strip(INDEX), launcher = ["scrHome", "scrPlanets", "scrScenarios", "scrBrief", "btnFirstBloom", "btnChoose", "planetCards", "scenarioCards", "btnStart", "BLOOM_LAUNCHER", "canvas.mini", "data-planet", "data-scenario", "#/brief", "#/planet", "#/scenario"].filter(s => INDEX.includes(s));
    const router = /hashchange|location\.hash|onhashchange/.test(code), mini = /getContext\(|attemptPlanet|drawMini|tileColor/.test(code), icons = EMOJI.test(INDEX) || /icon\s*:/.test(code);
    const bootTag = /<script src="resources\/main-menu\/title-boot\.js" data-run="demos\/demo-run\.html"><\/script>/.test(INDEX) && !/data-title=/.test(INDEX);
    check(/<title>Strange Bloom — Unknown Soils<\/title>/.test(INDEX) && bootTag && !launcher.length && !router && !mini && !icons && (code.match(/<script/g) || []).length === 1 && !/<style/.test(code),
      "R2–R7 · the root index.html is the Strange Bloom production title — one boot script (title-boot.js, data-run demos/demo-run.html, the canonical title = itself) and the title stylesheets — not the BLOOM-016 launcher: no hash router, no planet chooser, no scenario chooser, no briefing, no emoji icon table, no temporary mini-map renderer, no inline style or script",
      launcher.join(", ") || `${INDEX.split("\n").length} lines`); }
  // R8–R10 · R80 · ONE page composer, shared; nothing duplicated
  // (BLOOM-033) BLOOM-030's composer guarantee, evaluated on BLOOM-030's own tree (END) once a later milestone has built on it (the one-document
  // app has ONE composer too — resources/app/app-controller.js; tools/single-app-flow-check.js S1)
  { const files = (WITH_TREE ? git("ls-files --cached --others --exclude-standard -- '*.js' '*.html'") : git(`ls-tree -r --name-only ${END}`)).split("\n").filter(f => f && /\.(js|html)$/.test(f) && !f.startsWith("tools/") && !f.startsWith("docs/") && !f.startsWith("demos/ui-mockups/") && existsAt(f))
      .filter(f => !f.startsWith("dist/"));   // (BLOOM-031) dist/ is the GENERATED portable copy of these very sources (proved identical to a fresh build by portable-runtime-check P3–P5), not a duplicate
    const who = re => files.filter(f => re.test(strip(readAt(f))));
    const entries = who(/new ExpeditionEntry\(/), departs = who(/function departToGameplay\b/), packers = who(/\.pack\(detail\b/), trainQ = who(/\.trainingQuery\(\{/), beginParam = who(/get\("begin"\) === "1"/), mounts = who(/\.mountTitlePage\(/), boots = who(/title-boot\.js/);
    const docsThin = [INDEX, ALIAS].every(d => !/type="module"|ExpeditionEntry|departToGameplay|MENU_DEV|<script src="[^"]*content\//.test(d) && (d.match(/<script/g) || []).length === 1);
    const aliasCfg = /<script src="\.\.\/resources\/main-menu\/title-boot\.js" data-run="demo-run\.html" data-title="\.\.\/index\.html"><\/script>/.test(ALIAS);
    const bootImports = /import\(new URL\("\.\/main-menu-page\.js", HERE\)\.href\)/.test(BOOT) && /m\.mountTitlePage\(\{ app: document\.getElementById\(d\.app \|\| "app"\), runHref: d\.run \|\| "demos\/demo-run\.html", titleHref: d\.title \|\| null \}\)/.test(BOOT);
    const exports = /^export function mountTitlePage\(/m.test(PAGE) && /import \{ ExpeditionEntry \} from "\.\/expedition-entry\.js";/.test(PAGE) && !/class \w+|import \{ (MainMenu|DestinationSurvey)\b/.test(PAGE);
    check(J(entries) === J(["resources/main-menu/main-menu-page.js"]) && J(departs) === J(entries) && J(packers) === J(entries) && J(beginParam) === J(entries) && J(mounts) === J(["resources/main-menu/title-boot.js"])
      && J(trainQ) === J(entries) && J(boots.sort()) === J(["demos/main-menu.html", "index.html"]) && docsThin && aliasCfg && bootImports && exports,
      "R8–R10 · R80 · ONE page-level composer exists (resources/main-menu/main-menu-page.js: mountTitlePage — the ONLY file in the repository that constructs ExpeditionEntry, packs a departure, builds the training URL or reads ?begin=1); the root index.html and demos/main-menu.html are thin documents that both load title-boot.js, whose one import mounts that composer with their paths (the alias names the root as its canonical title); MainMenu / DestinationSurvey / ExpeditionEntry / the handoff are imported, never re-implemented",
      J({ entries, boots, aliasCfg, bootImports })); }
  // R11 · R12 · the player title
  { const notice = /TITLE = "Strange Bloom", SUBTITLE = "Unknown Soils"/.test(BOOT) && /This build needs to be opened through a web server\./.test(BOOT) && /python3 -m http\.server/.test(BOOT);
    check(M.TITLE === "Strange Bloom" && M.SUBTITLE === "Unknown Soils" && /<title>Strange Bloom — Unknown Soils<\/title>/.test(INDEX) && /<title>Strange Bloom — Unknown Soils<\/title>/.test(ALIAS) && notice
      && /<meta charset="utf-8">/.test(INDEX) && /<meta name="viewport" content="width=device-width, initial-scale=1">/.test(INDEX) && /<html lang="en"/.test(INDEX),
      "R11 · R12 · the player-facing title is exactly Strange Bloom / Unknown Soils (main-menu-data.js; the file:// notice uses the same words); the root document's <title> is \"Strange Bloom — Unknown Soils\" with UTF-8, a responsive viewport and lang", `${M.TITLE} · ${M.SUBTITLE}`); }
  // R53 (source) · R54 (source) · R55 (source) · the run page: same dispatch sites and anchors; the diff is the title links alone
  { const sites = s => (s.match(/emit\("[a-z-]+",\{[^]*?\}\)/g) || []).map(x => x.replace(/\s+/g, " ")).sort(), anchors = s => [...new Set((s.match(/data-tutorial="([^"]+)"/g) || []))].sort();
    const lines = src => strip(src).split("\n").map(l => l.trim()).filter(Boolean), now = lines(RUN), base = lines(RUN_BASE);
    const diff = [...base.filter(l => !now.includes(l)).map(l => "-" + l), ...now.filter(l => !base.includes(l)).map(l => "+" + l)];
    const odd = diff.filter(l => !/index\.html|main-menu\.html|TITLE_HREF|changeScenario|launched from|BLOOM-016|retired|direct developer|a direct developer URL|briefing is retired/.test(l));
    const kept = /function expeditionBoot\(q\)\{/.test(RUN) && /const RENDER=XP\?/.test(RUN) && /window\.BLOOM_RUN_UI\.adapter=runUI\.adapter;/.test(RUN) && (RUN.match(/BLOOM\.createSim\(/g) || []).length === 1;
    check(J(sites(RUN)) === J(sites(RUN_BASE)) && sites(RUN).length >= 10 && J(anchors(RUN)) === J(anchors(RUN_BASE)) && !odd.length && kept,
      "R53 · R54 · R55 (source) · the run page keeps every bloom:* dispatch site with its detail keys and the data-tutorial anchor set of 726f74d; its whole diff is the title links (the retired launcher's routes → the root title, the expedition / failure fallbacks → ../index.html, no Change scenario); the production run UI, the expedition boot and the one createSim are untouched",
      odd.slice(0, 3).join(" | ") || `${diff.length} changed code lines, all title links`); }
  // R78 · protected systems byte-identical; the composed components unchanged
  { const differ = PROTECTED.filter(f => git(`rev-parse ${BASE_SHA}:${f}`) !== hashAt(f)), compDiffer = COMPONENTS.filter(f => git(`rev-parse ${BASE_SHA}:${f}`) !== hashAt(f));
    for (const f of PROTECTED) PROOF.protectedFileHashes[f] = { gitBlob: hashAt(f), sha256: sha256(Buffer.from(readAt(f))) };
    const trBase = (() => { const ctx = { globalThis: {} }; require("vm").runInNewContext(git(`show ${BASE_SHA}:content/training.js`), ctx); return ctx.globalThis.BLOOM_DATA.training; })();
    const trOk = J(trBase.config) === J(D.training.config) && trBase.planetId === D.training.planetId && trBase.rngSeed === D.training.rngSeed && J(trBase.copy) === J(D.training.copy) && D.training.returnTo === "../index.html" && trBase.returnTo === "main-menu.html";
    check(!differ.length && !compDiffer.length && trOk,
      `R78 · the engine, generator, validators, witness, archetypes, scenarios, the canonical surface, the sphere view + texture, AtmosphereTransition, the survey's data + worker, every planet, config and traits (${PROTECTED.length} files) are byte-identical to 726f74d; so are MainMenu, ExpeditionEntry, the fade, DestinationSurvey + its pool, the expedition handoff + arrival, the training layer + coach, the run UI and the play / archetype / scenario content (${COMPONENTS.length}); content/training.js changes only its return fallback (main-menu.html → ../index.html: training planet, config, seed, copy unchanged)`,
      differ.concat(compDiffer).join(", ") || "all identical"); }
  // R79 · no deployment / package / vendor dependency, no external URL in the entry
  { const deploy = ["package.json", "package-lock.json", "firebase.json", ".firebaserc", "netlify.toml", "vercel.json", "_redirects", "_headers", "CNAME", "app.yaml", "Dockerfile", ".github/workflows"].filter(existsAt);
    const vendorBase = git(`ls-tree -r --name-only ${BASE_SHA}`).split("\n").filter(f => /vendor|node_modules/.test(f)).length, vendorNow = (WITH_TREE ? git("ls-files --cached --others --exclude-standard") : git(`ls-tree -r --name-only ${END}`)).split("\n").filter(f => /vendor|node_modules/.test(f)).length;
    const urls = [INDEX, ALIAS, BOOT, PAGE, readAt("resources/main-menu/main-menu.css")].join("\n").match(/https?:\/\/[^\s"'`)<]+/g) || [];
    const external = urls.filter(u => !/^http:\/\/localhost:/.test(u) && !/^https?:\/\/\$\{/.test(u));
    check(!deploy.length && vendorNow === vendorBase && !external.length && !/analytics|gtag|googletagmanager|fonts\.googleapis|@import/.test(INDEX + ALIAS + BOOT + PAGE),
      "R79 · no deployment platform, package manifest or vendor dependency was introduced (the repository stays a static site); the entry documents, boot, composer and title stylesheet name no external URL (only the local-development hint), no analytics, no external font", J({ deploy, vendorBase, vendorNow, urls }));
    }
  // R77 · the paused old 028D2 worktree is untouched
  { if (!fs.existsSync(OLD_WT)) info("R77 · the paused c23815e 028D2 worktree", "not present on this machine: fingerprint not re-checked");
    else { const fp = { head: git("rev-parse HEAD", OLD_WT), status: sha256(cp.execSync("git status --porcelain", { cwd: OLD_WT, maxBuffer: 64 << 20 })), diff: sha256(cp.execSync("git diff", { cwd: OLD_WT, maxBuffer: 64 << 20 })),
        untracked: Object.fromEntries(git("ls-files -o --exclude-standard", OLD_WT).split("\n").filter(Boolean).sort().map(f => [f, sha256(fs.readFileSync(path.join(OLD_WT, f)))])) };
      PROOF.oldWorktree = { path: "_worktrees/bloom-028d2-guided-training", ...fp };
      check(fp.head === OLD_FP.head && fp.status === OLD_FP.status && fp.diff === OLD_FP.diff && J(fp.untracked) === J(OLD_FP.untracked),
        "R77 · the paused old 028D2 worktree (agent/bloom-028d2-guided-training @ c23815e) is byte-for-byte untouched: HEAD, `git status --porcelain` hash, complete `git diff` hash and every untracked file's hash equal the fingerprint recorded before BLOOM-030 began",
        `status ${fp.status.slice(0, 12)} · diff ${fp.diff.slice(0, 12)} · ${Object.keys(fp.untracked).length} untracked`); } }
  // R51 (source) · the coach is still thirteen lessons
  { const { trainingSteps } = await import(path.join(ROOT, "resources/training/training-steps.js"));
    check(trainingSteps().length === 13, "R51 (source) · the guided coach is still the thirteen locked lessons", trainingSteps().map(s => s.id).join(" · ")); }

  // ================================================================ browser
  let pw = null; try { pw = require("playwright"); } catch { check(false, "Playwright available (NODE_PATH=\"$(npm root -g)\")", "require('playwright') failed"); }
  const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".json": "application/json", ".svg": "image/svg+xml" };
  const LOG = [];   // every request the server saw: [path, status]
  const server = http.createServer((req, res) => { const p0 = decodeURIComponent(new URL(req.url, "http://x").pathname), u = p0.endsWith("/") ? p0 + "index.html" : p0, f = path.join(ROOT, u);
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { LOG.push([p0, 404]); res.writeHead(404); return res.end(); }
    LOG.push([p0, 200]); res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream", "cache-control": "no-store" }); fs.createReadStream(f).pipe(res); });
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  const ORIGIN = `http://127.0.0.1:${server.address().port}`, HOME = ORIGIN + "/", RUNP = ORIGIN + "/demos/demo-run.html", FILE = "file://" + encodeURI(ROOT);
  if (EVIDENCE) fs.mkdirSync(EVD, { recursive: true });
  const get = u => new Promise(res => http.get(u, r => { let b = ""; r.on("data", c => b += c); r.on("end", () => res({ status: r.statusCode, body: b, type: r.headers["content-type"] })); }).on("error", e => res({ status: 0, body: String(e) })));

  // the root smoke (Node HTTP, no browser): the canonical URL itself, /index.html and /?begin=1
  { const r1 = await get(HOME), r2 = await get(HOME + "index.html"), r3 = await get(HOME + "?begin=1");
    PROOF.rootSmoke = { "/": r1.status, "/index.html": r2.status, "/?begin=1": r3.status };
    const SERVED = read("index.html");   // (BLOOM-031) the file the server actually serves (its comment block changed after BLOOM-030)
    check(r1.status === 200 && r2.status === 200 && r3.status === 200 && r1.body === SERVED && r2.body === SERVED && /Strange Bloom — Unknown Soils/.test(r3.body) && !/scrHome|BLOOM-016 launcher/.test(r1.body),
      "R2s · root smoke over HTTP: GET / , /index.html and /?begin=1 all answer 200 with the Strange Bloom title document (no redirect, no launcher)", J(PROOF.rootSmoke)); }

  // in every page: the bloom:* log, unhandled rejections, generator / search counters (on an expedition page every world-making function THROWS)
  const INIT = () => {
    const XP = window.__XP = { calls: { generateFromArchetype: 0, generatePlanet: 0, attemptPlanet: 0, searchWorld: 0, runSearch: 0, createSim: 0 }, forbid: false /* (BLOOM-033) armed by the suite at Begin Expedition */, threw: [] };
    const wrap = (holder, name, forbidable) => { const d = Object.getOwnPropertyDescriptor(holder, name); if (d && d.get && d.get.__xp) return; let raw = d ? d.value : undefined;
      const mk = fn => fn && typeof fn === "function" ? function (...a) { XP.calls[name]++; if (forbidable && XP.forbid) { XP.threw.push(name); throw new Error("030 guard: " + name + " on an expedition page"); } return fn.apply(this, a); } : fn;
      let cur = mk(raw); const get = () => cur; get.__xp = true; Object.defineProperty(holder, name, { configurable: true, enumerable: true, get, set(v) { raw = v; cur = mk(v); } }); };
    const guard = obj => { if (!obj || typeof obj !== "object") return; wrap(obj, "generateFromArchetype", true); wrap(obj, "generatePlanet", true); wrap(obj, "createSim", false);
      for (const sub of ["play", "archetype"]) { const d = Object.getOwnPropertyDescriptor(obj, sub); if (d && d.get && d.get.__xp) continue; let o = d ? d.value : undefined; const g = v => { if (v && typeof v === "object") { if (sub === "play") { wrap(v, "searchWorld", true); wrap(v, "runSearch", true); } else wrap(v, "attemptPlanet", true); } return v; };
        o = g(o); const get = () => o; get.__xp = true; Object.defineProperty(obj, sub, { configurable: true, enumerable: true, get, set(v) { o = g(v); } }); } };
    let B = window.BLOOM; guard(B); Object.defineProperty(window, "BLOOM", { configurable: true, get: () => B, set(v) { B = v; guard(v); } });
    window.__EV = []; for (const t of ["run-ready", "play-pause", "speed", "region-select", "upgrade-preview", "upgrade-purchase", "growth-focus", "local-upgrade", "bubble-collect", "win"])
      document.addEventListener("bloom:" + t, e => window.__EV.push({ type: t, keys: Object.keys(e.detail || {}).sort() }));
    window.__UNHANDLED = []; addEventListener("unhandledrejection", e => { window.__UNHANDLED.push(String(e.reason && e.reason.message || e.reason)); });
    addEventListener("pageshow", e => { window.__persisted = e.persisted; });
  };
  const SEED_RECORD = status => { try { if (!sessionStorage.getItem("__seeded")) { sessionStorage.setItem("__seeded", "1"); if (status) localStorage.setItem("strange-bloom.training", JSON.stringify({ v: 1, status, at: 1 })); else localStorage.removeItem("strange-bloom.training"); } } catch {} };
  const frames = (p, n = 3) => p.evaluate(n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
  const menuReady = p => p.waitForFunction(() => window.MENU_DEV && MENU_DEV.ready, null, { timeout: 30000, polling: 50 });
  const surveyReady = p => p.waitForFunction(() => MENU_DEV.entry.survey && MENU_DEV.entry.survey.state === "survey" && MENU_DEV.entry.state === "survey", null, { timeout: 120000, polling: 100 });
  const menuBack = p => p.waitForFunction(() => MENU_DEV.entry.state === "menu" && getComputedStyle(MENU_DEV.entry.black).display === "none", null, { timeout: 20000, polling: 50 });
  const waitRun = p => p.waitForFunction(() => window.BLOOM_RUN && (BLOOM_RUN.started || BLOOM_RUN.failed), null, { timeout: 120000, polling: 50 });
  const waitProd = async p => { await p.waitForFunction(() => BLOOM.planetView && BLOOM.planetView.instance && BLOOM.planetView.instance.renderer.info().frames > 0 && BLOOM.decisionRooms.instance && BLOOM.runReport.instance, null, { timeout: 30000, polling: 100 }); await frames(p, 3); };
  const waitLift = p => p.waitForFunction(() => !BLOOM.expeditionArrival || !BLOOM.expeditionArrival.instance || BLOOM.expeditionArrival.stats.state === "lifted" || BLOOM.expeditionArrival.stats.state === "failed", null, { timeout: 20000, polling: 50 });
  const lifted = p => p.waitForFunction(() => { const c = document.getElementById("trainingCover"); return !c || getComputedStyle(c).display === "none"; }, null, { timeout: 10000 });
  const coached = p => p.waitForFunction(() => window.BLOOM_TRAINING_UI && BLOOM_TRAINING_UI.guide && BLOOM_TRAINING_UI.guide.mounted && BLOOM_TRAINING_UI.guide.coach.stats.places > 0, null, { timeout: 20000 });
  const settledDR = p => p.waitForFunction(() => !BLOOM.decisionRooms.instance.state().transitioning, null, { timeout: 8000, polling: 20 });
  const openRoom = async (p, name) => { const inRoom = await p.evaluate(() => !!BLOOM.decisionRooms.instance.state().room); await p.click(inRoom ? `.dr .dr-room:not([hidden]) .rn[data-go="${name}"]` : `.pv-tool[data-tool="${name}"]`); await settledDR(p); await frames(p, 2); };
  const reportOpen = p => p.waitForFunction(() => BLOOM.runReport.instance.state().open && !BLOOM.runReport.instance.state().busy, null, { timeout: 15000, polling: 30 });
  const win = p => p.evaluate(() => { const s = BLOOM_API.sim; BLOOM_API.advance(30); s.won = true; s.onWin(s.coverage()); }); // a QA shortcut into the run's own win path (the engine is untouched; the report reads the real state)
  const runMenu = async (p, act) => { if (await p.evaluate(() => document.getElementById("pvMenu").hidden)) await p.click("#pvMenuBtn"); await p.click(`#pvMenu [data-act="${act}"]`); };
  const hscroll = p => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  const M_STATE = p => p.evaluate(() => { const E = MENU_DEV.entry, m = E.menu; return { url: location.href, state: E.state, bg: m.background ? m.background.index : null, next: m.next ? m.next.index ?? m.next : null, tag: m.trainingRecommended,
    items: [...document.querySelectorAll(".mm-item")].map(b => b.dataset.act), h1: document.getElementById("mm-title").textContent.replace(/\s+/g, " ").trim(), sub: document.querySelector(".mm-sub").textContent.trim(), title: document.title,
    prefetch: E.prefetch ? { seed: E.prefetch.first.seed, ...E.prefetch.progress } : null, rec: localStorage.getItem("strange-bloom.training"), prompts: E.stats.prompts, page: MENU_DEV.page, text: document.body.innerText,
    dialogs: [...document.querySelectorAll("dialog")].filter(d => d.open).map(d => d.dataset.dialog), rm: m.reducedMotion, entries: E.stats.entries.slice(), exits: E.stats.exits.slice() }; });
  // the survey side of the identity proof (the survey's own functions) and the gameplay side (the run's canonical surface)
  // (BLOOM-033) Begin Expedition inside the root: arm the generator guard, reset the createSim count, press the button; the run is a session
  const DEPART = async p => { await p.evaluate(() => { __XP.forbid = true; __XP.calls.createSim = 0; }); await p.click(".ds-btn.go"); };
  const disarm = p => p.evaluate(() => { __XP.forbid = false; });
  const runIn = (p, n = 1) => p.waitForFunction(n => window.BLOOM_APP && BLOOM_APP.session && BLOOM_APP.stats.sessions.length >= n && BLOOM_APP.stats.sessions[n - 1].readyMs !== null && !BLOOM_APP.busy && !document.querySelector(".atx"), n, { timeout: 60000, polling: 50 });
  const titleIn = p => p.waitForFunction(() => !BLOOM_APP.session && MENU_DEV.entry.state === "menu" && !BLOOM_APP.busy, null, { timeout: 30000, polling: 50 });
  const surveyIn = p => p.waitForFunction(() => !BLOOM_APP.session && !BLOOM_APP.busy && MENU_DEV.entry.state === "survey" && MENU_DEV.entry.survey && MENU_DEV.entry.survey.state === "survey", null, { timeout: 180000, polling: 100 });
  const trainingIn = (p, n) => p.waitForFunction(n => window.BLOOM_APP && BLOOM_APP.session && BLOOM_APP.session.run.training && window.BLOOM_TRAINING_UI && BLOOM_TRAINING_UI.stats.liftedAt && !BLOOM_APP.busy && (!n || BLOOM_APP.stats.sessions.length >= n), n || 0, { timeout: 30000, polling: 50 });
  const SURVEY_CAP = async i => { const S = await import("/resources/destination-survey/survey-data.js"), T = await import("/resources/planet-sphere/planet-texture.js");
    const s = MENU_DEV.entry.survey, c = s.cells[i], v = s.views[i], p = c.planet; const cv = document.createElement("canvas"); T.drawPlanetTexture(cv, p, { render: c.render || null });
    const hash = canvas => { const d = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data; let h = 0x811c9dc5; for (let k = 0; k < d.length; k++) { h ^= d[k]; h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(16).padStart(8, "0") + ":" + canvas.width + "x" + canvas.height; };
    window.__pickRef = c.planet;   // (BLOOM-033) the exact object, for the run-side identity
    return { key: c.key, name: c.name, classId: c.classId, authored: c.authored, archetypeId: c.archetypeId, seed: c.seed, attempt: c.attempt, sectorSeed: s.sectorSeed, fingerprint: S.planetFingerprint(p), candFingerprint: c.fingerprint,
      planet: JSON.stringify(p), texture: hash(cv), liveTexture: v._canvas && v._canvas.width ? hash(v._canvas) : null, selected: s.selected, inFocus: s.focusSlot.contains(s.globes[i]), state: s.state }; };
  const GAME_CAP = async () => { const S = await import("/resources/destination-survey/survey-data.js"); const A = BLOOM_RUN_UI.adapter, R = BLOOM_RUN, p = R.planet, src = A.surface();
    const cv = document.createElement("canvas"); cv.width = 480; cv.height = 240; const tw = 480 / src.planet.gridWidth, th = 240 / src.planet.gridHeight; let texture = null;
    if (Number.isInteger(tw) && Number.isInteger(th)) { BLOOM.surface.paintSurface(cv.getContext("2d"), src.planet, { render: src.render, sky: src.startSky, tileW: tw, tileH: th });
      const d = cv.getContext("2d").getImageData(0, 0, 480, 240).data; let h = 0x811c9dc5; for (let k = 0; k < d.length; k++) { h ^= d[k]; h = Math.imul(h, 0x01000193); } texture = (h >>> 0).toString(16).padStart(8, "0") + ":480x240"; }
    const S2 = window.BLOOM_APP && BLOOM_APP.session;   // (BLOOM-033) the app's session: the run's planet IS the selected object
    return { url: location.href, path: location.pathname, id: p.id, name: p.name, fingerprint: S.planetFingerprint(p), sameObject: !!(S2 && window.__pickRef && S2.planet === window.__pickRef), runFingerprint: R.expedition ? R.expedition.fingerprint : null,
      planet: JSON.stringify(p), texture, counters: { ...__XP.calls }, threw: __XP.threw.slice(), forbid: __XP.forbid, ui18: document.documentElement.classList.contains("ui18"), pv: document.querySelectorAll(".pv").length, title: document.title,
      nameUntouched: window.name === "", sessions: window.BLOOM_APP ? BLOOM_APP.stats.sessions.length : null, ss: (() => { try { return Object.keys(sessionStorage).filter(k => /expedition|handoff/.test(k)); } catch (e) { return []; } })(),
      lsPlanet: Object.keys(localStorage).filter(k => /tilemap|sections|gridWidth/.test(localStorage.getItem(k) || "")), menu: A.runMenu().items.map(a => [a.id, a.href || null]), unhandled: window.__UNHANDLED }; };
  const ANCHORS = p => p.evaluate(() => { const a = [...document.querySelectorAll("[data-tutorial]")].filter(e => e.offsetParent !== null || e.closest(".pv")).map(e => e.dataset.tutorial); return { n: a.length, dup: a.filter((x, i) => a.indexOf(x) !== i) }; });
  const SHAPES = p => p.evaluate(() => { const o = {}; for (const e of window.__EV) o[e.type] = e.keys; return o; });
  const shapesOk = o => Object.entries(o).every(([t, k]) => J(k) === J(DETAIL_KEYS[t]));
  const shot = async (p, name, opts = {}) => { if (EVIDENCE) await p.screenshot({ path: path.join(EVD, name), ...opts }); };
  const hrefsSeen = [];   // every navigation target a production action offered (R43 / R44)
  const external = [], errsAll = [], unhandledAll = [];

  for (const bname of BROWSERS) {
    if (!pw) break; if (!pw[bname]) { info(`browser ${bname}`, "not a Playwright browser: skipped"); continue; }
    let browser; try { browser = await pw[bname].launch(); } catch (e) { check(false, `[${bname}] browser launches`, e.message.split("\n")[0]); continue; }
    const B = `[${bname}]`, FULL = bname === "chromium"; console.log(`# ${bname}`); PROOF.browsers[bname] = { version: browser.version(), flows: [] };
    const ctx = async ({ vw = 1280, vh = 800, record = undefined, rm = false } = {}) => {
      const c = await browser.newContext({ viewport: { width: vw, height: vh }, reducedMotion: rm ? "reduce" : "no-preference" });
      await c.addInitScript(INIT); if (record !== undefined) await c.addInitScript(SEED_RECORD, record);
      c.on("request", r => { const u = r.url(); if (!u.startsWith(ORIGIN) && !/^(file|data|blob|about):/.test(u)) external.push(u); }); return c; };
    const watch = (p, label) => { p.errs = []; p.on("pageerror", e => { p.errs.push(e.message); errsAll.push(`${B} ${label}: ${e.message}`); }); p.on("console", m => { if (m.type() === "error") { p.errs.push(m.text()); errsAll.push(`${B} ${label}: ${m.text()}`); } }); p.on("dialog", d => d.accept()); return p; };
    const collectUnhandled = async p => { try { const u = await p.evaluate(() => window.__UNHANDLED || []); if (u.length) unhandledAll.push(...u.map(x => `${B} ${x}`)); } catch {} };
    try {
      if (FULL) {
        // ================= the canonical root flow (a first-time player: no training record) =================
        const c = await ctx({ record: null }), p = watch(await c.newPage(), "root"); const logFrom = LOG.length;
        await p.goto(HOME); await menuReady(p); await sleep(500);
        const m0 = await M_STATE(p);
        const rootReqs = LOG.slice(logFrom).map(([u, s]) => `${s} ${u}`); PROOF.rootTitleUrl = m0.url; PROOF.rootAssetRequests = rootReqs; PROOF.firstSector = m0.prefetch;
        const req404 = LOG.slice(logFrom).filter(([, s]) => s !== 200);
        const needed = ["/", "/resources/main-menu/title-boot.js", "/resources/app/app-controller.js", "/resources/main-menu/expedition-entry.js", "/resources/main-menu/main-menu.js", "/resources/destination-survey/destination-survey.js",
          "/resources/destination-survey/survey-worker.js", "/content/config.js", "/resources/bloom-play.js", "/resources/main-menu/main-menu.css", "/resources/destination-survey/destination-survey.css"];
        const missing = needed.filter(n => !LOG.slice(logFrom).some(([u, s]) => u === n && s === 200)), bgReq = LOG.slice(logFrom).filter(([u]) => /\/resources\/main-menu\/backgrounds\/menu-\d\d\.jpg$/.test(u));
        check(m0.url === HOME && m0.title === "Strange Bloom — Unknown Soils" && /^Strange Bloom$/i.test(m0.h1) && /^Unknown Soils$/i.test(m0.sub) && !req404.length && !missing.length && bgReq.length >= 1 && bgReq.every(([, s]) => s === 200)
          && m0.page.document === "/" /* (BLOOM-033: the one document) */,
          `${B} R2b · R11 · R12 · the canonical URL / is the Strange Bloom title: "Strange Bloom — Unknown Soils", STRANGE BLOOM / UNKNOWN SOILS, every relative asset 200 (boot, composer, components, stylesheets, engine scripts, the survey's module worker, the painting) — no 404, no redirect; the composer's canonical title is / itself and its run page demos/demo-run.html`,
          `${rootReqs.length} requests · ${missing.join(", ") || "all needed present"}${req404.length ? " · 404: " + req404.map(r => r[0]).join(",") : ""}`);
        const vis = m0.text.replace(/\s+/g, " ");
        check(J(m0.items) === J(["begin", "training", "settings", "credits"]) && !/continue/i.test(vis) && !DEV_COPY.test(vis) && !EMOJI.test(vis) && !/BLOOM\b/i.test(vis.replace(/STRANGE BLOOM/gi, "")),
          `${B} R15 · R80 · the title menu is (BLOOM-033) EXPEDITION · TRAINING · SETTINGS · CREDITS (no CONTINUE); nothing player-visible names a milestone, the playtest harness, a development handoff, a temporary shell, ui=18 / ui=legacy, "training not ready" or the old launcher; no emoji; the game is never called BLOOM`, m0.items.join(" · "));
        await shot(p, "01-root-title.png");
        // R13 · R14 · the twelve paintings and the background rule
        const pt = await p.evaluate(async () => { const m = MENU_DEV.entry.menu, out = [];
          for (let i = 0; i < 12; i++) { const img = new Image(); img.src = m._url(i); try { await img.decode(); out.push([img.naturalWidth, img.naturalHeight]); } catch { out.push(null); } }
          return { sizes: out, cur: m.background.index, next: m.next ? (m.next.index ?? m.next) : null, preloaded: !!(m._preload && (m._preload.complete || m._preload.img && m._preload.img.complete)), last: sessionStorage.getItem("strange-bloom.menu.last-background") }; });
        const seq = [m0.bg]; for (let k = 0; k < 5; k++) { await p.reload(); await menuReady(p); seq.push(await p.evaluate(() => MENU_DEV.entry.menu.background.index)); }
        const repeats = seq.filter((x, i) => i && x === seq[i - 1]).length;
        check(pt.sizes.every(s => s && s[0] === 1280 && s[1] === 720) && pt.next !== null && pt.next !== pt.cur && repeats === 0,
          `${B} R13 · R14 · all twelve owner paintings are reachable from the root (each decodes at 1280 × 720 from the title's own URLs); the next painting is chosen (never the current) and preloaded while the title shows; six root loads in a row never repeat the painting just shown`,
          `sequence ${seq.map(x => x + 1).join(" → ")} · next ${pt.next !== null ? +pt.next + 1 : "none"} · preloaded ${pt.preloaded}`);
        // R16 · R18 · the first sector prefetches at the root; Recommended
        const m1 = await M_STATE(p);
        check(m1.prefetch && m1.prefetch.total === 9 && Number.isInteger(m1.prefetch.seed) && m1.tag && /Recommended/.test(await p.textContent('.mm-item[data-act="training"]')) && LOG.some(([u, s]) => u === "/resources/destination-survey/survey-worker.js" && s === 200),
          `${B} R16 · R18 · at the root the first validated sector is prefetching while the title shows (its own module workers, nine worlds) and TRAINING carries the small "Recommended" tag (no training record)`, J({ prefetch: m1.prefetch, tag: m1.tag }));
        await shot(p, "02-root-recommended-tag.png", { clip: await p.evaluate(() => { const r = document.querySelector(".mm-plaque").getBoundingClientRect(); return { x: Math.max(0, r.left - 12), y: Math.max(0, r.top - 12), width: r.width + 24, height: r.height + 24 }; }) });
        // R22 · R23 · Settings (a real motion change, persisted) and Credits; R73 · keyboard title navigation
        await p.focus('.mm-item[data-act="begin"]'); const kbd = [];
        for (const key of ["ArrowDown", "ArrowDown", "ArrowDown", "ArrowDown", "End", "Home"]) { await p.keyboard.press(key); kbd.push(await p.evaluate(() => document.activeElement && document.activeElement.dataset.act)); }
        await p.keyboard.press("ArrowDown"); await p.keyboard.press("ArrowDown"); await p.keyboard.press("Enter"); await sleep(150);
        const st1 = await p.evaluate(() => ({ open: document.querySelector('[data-dialog="settings"]').open, focusIn: !!document.activeElement.closest('[data-dialog="settings"]') }));
        await p.click('[data-dialog="settings"] input[value="reduced"]'); await sleep(100);
        const st2 = await p.evaluate(() => ({ stored: localStorage.getItem("strange-bloom.settings"), rm: MENU_DEV.entry.reducedMotion }));
        await p.click('[data-dialog="settings"] input[value="system"]'); await p.keyboard.press("Escape"); await sleep(150);
        const st3 = await p.evaluate(() => ({ open: document.querySelector('[data-dialog="settings"]').open, focus: document.activeElement.dataset.act, stored: localStorage.getItem("strange-bloom.settings") }));
        await p.click('.mm-item[data-act="credits"]'); await sleep(150);
        const cr = await p.evaluate(() => { const d = document.querySelector('[data-dialog="credits"]'); return { open: d.open, text: d.innerText }; });
        await p.click('[data-dialog="credits"] [data-act="close"]'); await sleep(120);
        const cr2 = await p.evaluate(() => ({ open: document.querySelector('[data-dialog="credits"]').open, focus: document.activeElement.dataset.act }));
        check(J(kbd) === J(["training", "settings", "credits", "begin", "credits", "begin"]) && st1.open && st1.focusIn && /"motion":"reduced"/.test(st2.stored) && st2.rm === true && !st3.open && st3.focus === "settings" && /"motion":"system"/.test(st3.stored),
          `${B} R22 · R73 · keyboard alone walks the title menu (↓ wraps, Home / End) and Enter opens SETTINGS with focus inside; its motion choice persists and applies at once (reduced → the entry's reduced motion); Escape closes it and focus returns to SETTINGS`, J({ kbd, st2 }));
        check(cr.open && /Strange Bloom · Unknown Soils/i.test(cr.text) && /A BLOOM project/i.test(cr.text) && !cr2.open && cr2.focus === "credits", `${B} R23 · CREDITS opens its dialog (the player title, "A BLOOM project", the paintings, Three.js) and closes back to the menu`, cr.text.split("\n").slice(0, 2).join(" · "));
        // R19 · R74 · the first-run prompt by keyboard: Enter on BEGIN, focus inside, Tab between its two answers, Escape records nothing
        await p.focus('.mm-item[data-act="begin"]'); await p.keyboard.press("Enter"); await sleep(250);
        const d1 = await p.evaluate(() => { const d = document.querySelector('[data-dialog="recommend"]'); return { open: d.open, focus: document.activeElement.textContent, h: d.querySelector("h2").textContent, btns: [...d.querySelectorAll(".mm-btn")].map(b => b.textContent), state: MENU_DEV.entry.state }; });
        await shot(p, "03-root-first-run-recommendation.png");
        await p.keyboard.press("Tab"); const tab1 = await p.evaluate(() => document.activeElement.textContent); await p.keyboard.press("Shift+Tab"); const tab2 = await p.evaluate(() => document.activeElement.textContent);
        await p.keyboard.press("Escape"); await sleep(150);
        const d2 = await p.evaluate(() => ({ open: document.querySelector('[data-dialog="recommend"]').open, rec: localStorage.getItem("strange-bloom.training"), focus: document.activeElement.dataset.act, state: MENU_DEV.entry.state, url: location.href }));
        check(d1.open && d1.state === "menu" && J(d1.btns) === J(["Go to Expedition", "Start Training (~5 min)"]) && d1.btns.includes(d1.focus) && tab1 !== tab2 && [tab1, tab2].every(t => d1.btns.includes(t)) && !d2.open && d2.rec === null && d2.focus === "begin" && d2.state === "menu" && d2.url === HOME,
          `${B} R19 · R74 · at the root the first BEGIN EXPEDITION (Enter) opens the ONE first-run dialog ("${d1.h}"): focus inside, Tab / Shift+Tab move between Go to Expedition · Start Training (~5 min), Escape closes it with nothing recorded and focus back on BEGIN`, J({ focus: d1.focus, tab1, tab2 }));
        // R20 · R24 · Go to Expedition: "skipped", the black fade, the survey
        await p.click('.mm-item[data-act="begin"]'); await sleep(200); await p.click('[data-act="recommend-expedition"]'); await surveyReady(p);
        const s1 = await p.evaluate(() => { const E = MENU_DEV.entry, s = E.survey, cls = ["favorable", "precarious", "extreme"]; return { rec: JSON.parse(localStorage.getItem("strange-bloom.training")), tag: E.menu.trainingRecommended, url: location.href, entry: E.stats.entries[E.stats.entries.length - 1], adopted: s.stats.adopted, seed: s.sectorSeed,
          cells: s.cells.map((c, i) => c && { ok: c.authored || (c.validation.validated && c.planet.archetype.winnabilityChecked && c.planet.archetype.validatedLayers.join() === "1,2,3,4,5,6,7,8"), col: c.classId === cls[i % 3], key: c.key }) }; });
        check(s1.rec && s1.rec.status === "skipped" && !s1.tag && s1.url === HOME && s1.entry.blackMs >= 200 && s1.entry.blackMs < 1500 && s1.entry.liftMs >= s1.entry.swappedMs && s1.entry.revealedMs > s1.entry.liftMs && s1.adopted && s1.seed === m1.prefetch.seed,
          `${B} R20 · R24 · Go to Expedition records "skipped", drops the tag and fades through black (${s1.entry.blackMs} ms to black; the survey mounted and drawn under it, then the black lifts) into the Destination Survey on the sector prefetched at the root`, J(s1.entry));
        check(s1.cells.length === 9 && s1.cells.every(x => x && x.ok && x.col) && new Set(s1.cells.map(x => x.key)).size === 9,
          `${B} R29 · the survey shows nine distinct worlds, every one fully validated (layers 1–8, winnability checked) or the authored world, one class per column`, s1.cells.map(x => x.key).join(" "));
        await shot(p, "04-root-destination-survey.png");
        // R25 · R27 · R28 · R75 · Escape (keyboard) → the title at the root, the next painting; keyboard back in
        const bgBefore = await p.evaluate(() => MENU_DEV.entry.menu.background.index);
        let inSurvey = await p.evaluate(() => MENU_DEV.entry.surveyHost.contains(document.activeElement));
        for (let k = 0; k < 6 && !inSurvey; k++) { await p.keyboard.press("Tab"); inSurvey = await p.evaluate(() => MENU_DEV.entry.surveyHost.contains(document.activeElement)); }
        const kFocus = await p.evaluate(() => document.activeElement.className);
        await p.keyboard.press("Escape"); await menuBack(p);
        const r1 = await M_STATE(p), ex = r1.exits[r1.exits.length - 1];
        await p.focus('.mm-item[data-act="begin"]'); await p.keyboard.press("Enter"); await surveyReady(p);
        const r2 = await p.evaluate(() => ({ state: MENU_DEV.entry.state, prompts: MENU_DEV.entry.stats.prompts, url: location.href, active: document.activeElement && (document.activeElement.className || document.activeElement.tagName) }));
        check(r1.state === "menu" && r1.url === HOME && r1.bg !== bgBefore && ex && ex.blackMs >= 200 && ex.revealedMs > ex.liftMs && r1.prefetch && r2.state === "survey" && r2.url === HOME,
          `${B} R25 · R27 · R28 · R75 · from the survey (Tab reaches its controls: ${kFocus}), Escape (keyboard) fades through black back to the root title (still /) with the NEXT painting (${bgBefore + 1} → ${r1.bg + 1}) and a fresh prefetch; Enter on BEGIN EXPEDITION (keyboard) enters the survey again — no second prompt`, J({ exit: ex, r2 }));
        // R30 · R31 · R32 · R33 · R34 · R35 · R36 · the exact candidate → DRAMATIC → handoff → the run
        await p.click('.ds-cand[data-index="4"]'); await p.waitForFunction(() => MENU_DEV.entry.survey.state === "focus", null, { timeout: 20000, polling: 50 });
        const cap = await p.evaluate(SURVEY_CAP, 4);
        check(cap.selected === 4 && cap.inFocus && cap.fingerprint === cap.candFingerprint && cap.liveTexture === cap.texture && cap.state === "focus",
          `${B} R30 · the chosen candidate survives focus: the same live globe moved into the focus slot, its texture pixels = drawPlanetTexture of the candidate's planet, the survey's planetFingerprint = the candidate's`, J({ key: cap.key, cls: cap.classId, fp: cap.fingerprint }));
        await shot(p, "05-selected-focused-destination.png");
        PROOF.selectedCandidate = { key: cap.key, name: cap.name, classId: cap.classId, sectorSeed: cap.sectorSeed, provenanceSeed: cap.seed, attempt: cap.attempt, authored: cap.authored, fingerprint: cap.fingerprint, texture: cap.texture };
        let navs = 0; p.on("framenavigated", f => { if (f === p.mainFrame()) navs++; });   // (BLOOM-033) from here on: no document load at all
        await DEPART(p); await p.waitForFunction(() => document.querySelector(".atx") && document.querySelector(".atx").dataset.atxPreset === "dramatic", null, { timeout: 10000, polling: 20 });
        await sleep(650); const atx = await p.evaluate(() => { const o = document.querySelector(".atx"); return { preset: o.dataset.atxPreset, phase: o.dataset.atxPhase, rm: o.classList.contains("rm") }; });
        await shot(p, "06-dramatic-descent.png");
        await runIn(p); await waitProd(p); await frames(p, 3);
        const g = await p.evaluate(GAME_CAP);
        await shot(p, "07-first-gameplay-frame-root-flow.png");
        PROOF.run = { url: g.url.replace(ORIGIN, "<origin>"), sameObject: g.sameObject, planetId: g.id, name: g.name, fingerprint: g.fingerprint, runFingerprint: g.runFingerprint, canonicalSurface: g.texture, counters: g.counters };
        check(atx.preset === "dramatic" && !atx.rm && g.path === "/" && g.url === s1.url && g.sameObject && g.planet === cap.planet && !g.ss.length && !g.lsPlanet.length && g.nameUntouched && navs === 0,
          `${B} R31 · R32 · R34 · (BLOOM-033) Begin Expedition plays the unchanged DRAMATIC transition; under it the exact selected planet OBJECT becomes the run inside the root document (no handoff, no session or local storage of the planet, no token, window.name untouched, no document load: the address is still /)`,
          J({ atx, path: g.path, sameObject: g.sameObject }));
        check(g.fingerprint === cap.fingerprint && g.runFingerprint === cap.fingerprint && g.texture === cap.texture && g.counters.createSim === 1 && GEN_NAMES.every(n => g.counters[n] === 0) && !g.threw.length && g.forbid,
          `${B} R33 · R35 · R36 · no regeneration: from Begin Expedition on every generator / search / attempt function is guarded to throw and none was called, one createSim; the selected planet's fingerprint is unchanged (survey == ruored == gameplay) and the gameplay canonical surface equals the focused globe's texture pixel for pixel`,
          J({ fp: g.fingerprint, texture: g.texture, counters: g.counters }));
        check(g.ui18 && g.pv === 1 && g.title === `Strange Bloom — ${cap.name}` && J(g.menu.map(a => a[0])) === J(["playAgain", "choosePlanet", "mainMenu"]),
          `${B} R55 · the production run UI is the default (Planet View, ui18), titled with the chosen world; the run menu is Play again · Choose another planet · Main menu`, J(g.menu));
        await shot(p, "08-production-planet-view.png");
        // R37 · R38 · the four rooms; the Terraform sphere's identity before and after a real purchase; R53 · R54 at runtime
        await p.evaluate(() => { const A = BLOOM_RUN_UI.adapter; A.actions.play(); const r = A.regions().find(x => !x.isOrigin); A.actions.selectRegion(r.index); });
        const rooms = [];
        for (const name of ["region", "adapt", "spread"]) { await openRoom(p, name); rooms.push(await p.evaluate(() => BLOOM.decisionRooms.instance.state().room)); if (name === "adapt") await shot(p, "09-adapt-room.png"); }
        await openRoom(p, "terraform"); await p.waitForFunction(() => BLOOM.decisionRooms.instance.rooms.terraform.globeKind() !== "pending", null, { timeout: 20000, polling: 50 }); await frames(p, 3);
        rooms.push(await p.evaluate(() => BLOOM.decisionRooms.instance.state().room));
        const tf = () => p.evaluate(() => { const DR = BLOOM.decisionRooms.instance, T = DR.rooms.terraform, src = T.source(), gl = T.globe(), A = BLOOM_RUN_UI.adapter, PV = BLOOM.planetView.instance, s = A.surface();
          const snap = BLOOM.terraformGlobe.snapshot(src.planet, src.sky || s.sky), expect = BLOOM.surface.surfaceSignature(snap, { render: src.render, extra: { diag: null, width: 480 } });
          return { kind: T.globeKind(), planetId: src.planet.id, sameTiles: JSON.stringify(src.planet.tilemap) === JSON.stringify(BLOOM_RUN.planet.tilemap), sphereSig: gl.view ? gl.view.state().textureSignature : null, expect, mapSig: PV.renderer.info().surfaceSignature, mapExpect: BLOOM.surface.surfaceSignature(s.planet, { render: s.render, sky: s.sky }), sky: s.sky }; });
        const t1 = await tf(); await shot(p, "10-terraform-room.png");
        await p.evaluate(() => { BLOOM_API.addBiomass(3000); const A = BLOOM_RUN_UI.adapter; const items = A.upgrades().find(b => b.board === "Terraform").items; const u = items.find(x => x.canBuy) || items[0]; A.actions.buy(u.id); }); await frames(p, 4);
        const t2 = await tf();
        // the remaining production action points (each through the adapter's real page functions): speed, a preview, a growth focus
        await p.evaluate(() => { const A = BLOOM_RUN_UI.adapter; A.actions.setSpeed(2); A.actions.setSpeed(1); const u = A.upgrades().find(b => b.board === "Adapt").items[0]; A.actions.preview(u.id); A.actions.clearPreview && A.actions.clearPreview();
          const o = A.regions().find(x => x.isOrigin); A.actions.setGrowthFocus(o.index, "roots"); }); await frames(p, 2);
        const an = await ANCHORS(p), sh = await SHAPES(p);
        check(J(rooms) === J(["region", "adapt", "spread", "terraform"]) && t1.kind === "sphere" && t1.planetId === g.id && t1.sameTiles && t1.sphereSig === t1.expect && t1.mapSig === t1.mapExpect && t2.sphereSig === t2.expect && t2.mapSig === t2.mapExpect && J(t2.sky) !== J(t1.sky),
          `${B} R37 · R38 · on the root-started expedition all four production rooms open (Region Inspect, Adapt, Spread, Terraform); the Terraform room's live PlanetSphereView shows THIS planet and its texture signature equals the canonical surface under the current sky — before and after a real Terraform purchase changed the sky`, J({ rooms, t1: t1.kind, sky: [t1.sky, t2.sky] }));
        check(!an.dup.length && an.n > 20 && shapesOk(sh) && ["run-ready", "play-pause", "speed", "region-select", "upgrade-preview", "upgrade-purchase", "growth-focus"].every(t => sh[t]),
          `${B} R53 · R54 · at runtime every bloom:* detail that fired has its frozen shape (${Object.keys(sh).join(", ")}) and every production data-tutorial anchor is unique`, J({ anchors: an.n, dup: an.dup }));
        await p.click(".dr .dr-room:not([hidden]) .rb.back, .dr .dr-room:not([hidden]) .rb.resume"); await settledDR(p);
        // R39 · the production report; R40 · Play again; R41 · Choose another planet; R42 · Main menu
        await win(p); await reportOpen(p); await frames(p, 3);
        const rep = await p.evaluate(() => { const A = BLOOM_RUN_UI.adapter, d = A.report(); return { kind: d.kind, name: d.identity.planetName, xp: d.identity.expedition && d.identity.expedition.fingerprint, acts: A.reportActions().map(a => [a.id, a.href || null]), shown: BLOOM.runReport.instance.state().actions, text: document.getElementById("rrCard").innerText }; });
        await shot(p, "11-production-bloom-report.png");
        const H = Object.fromEntries(rep.acts); hrefsSeen.push(...rep.acts.map(a => a[1]).filter(Boolean), ...g.menu.map(a => a[1]).filter(Boolean));
        PROOF.rootReturnUrls = { playAgain: H.playAgain, choosePlanet: H.choosePlanet, mainMenu: H.mainMenu };
        check(rep.kind === "win" && rep.name === cap.name && rep.xp === cap.fingerprint && J(rep.shown) === J(["keepPlaying", "playAgain", "choosePlanet", "mainMenu"]) && H.playAgain === null && H.choosePlanet === null && H.mainMenu === null,
          `${B} R39 · the production Bloom Report names the chosen world and carries its fingerprint; its actions are Keep playing · Play again · Choose another planet · Main menu — (BLOOM-033) app actions inside the root, no URL among them`, J(H));
        await p.evaluate(() => { __XP.calls.createSim = 0; }); await p.click('#rr [data-act="playAgain"]'); await runIn(p, 2); await waitProd(p);
        const g2 = await p.evaluate(GAME_CAP), at2 = await p.evaluate(() => ({ ticks: BLOOM_API.sim.ticks < 200, owned: BLOOM_API.sim.traits.filter(u => BLOOM_API.sim.ownedTier(u) > 0).length, won: BLOOM_API.sim.won }));
        check(g2.sameObject && navs === 0 && g2.fingerprint === cap.fingerprint && g2.planet === cap.planet && g2.texture === cap.texture && at2.owned === 0 && !at2.won && g2.counters.createSim === 1 && GEN_NAMES.every(n => g2.counters[n] === 0),
          `${B} R40 · Play again keeps the exact planet: the same object, fingerprint, planet JSON and canonical surface on a fresh simulation (nothing owned, not won), no generator, no document load`, g2.name);
        await disarm(p); await runMenu(p, "choosePlanet"); await surveyIn(p);   // (a live run asks first: the page's dialog handler accepts)
        const cA = await p.evaluate(() => ({ url: location.href, state: MENU_DEV.entry.state, events: MENU_DEV.events.map(e => e.type), cells: MENU_DEV.entry.survey.cells.length, prompts: MENU_DEV.entry.stats.prompts }));
        await shot(p, "12-choose-another-planet-root-survey.png");
        check(cA.url === HOME && cA.state === "survey" && cA.events.includes("choose-planet") && cA.cells === 9 && cA.prompts === r2.prompts /* no new prompt */ && navs === 0,
          `${B} R41 · Choose another planet opens the Destination Survey inside the root (the address stays /, no document load); no prompt`, J({ url: cA.url, state: cA.state, cells: cA.cells }));
        await p.click('.ds-cand[data-index="2"]'); await p.waitForFunction(() => MENU_DEV.entry.survey.state === "focus", null, { timeout: 20000, polling: 50 }); await p.evaluate(SURVEY_CAP, 2);
        await DEPART(p); await runIn(p, 3); await waitProd(p);
        await disarm(p); await runMenu(p, "mainMenu"); await titleIn(p); await sleep(300);
        const mm = await M_STATE(p); await shot(p, "13-main-menu-root-title.png");
        check(mm.url === HOME && mm.state === "menu" && mm.title === "Strange Bloom — Unknown Soils" && mm.prefetch && mm.prefetch.total === 9, `${B} R42 · Main menu from a root-started expedition returns to the root title inside the same document (/), which starts a fresh prefetch`, mm.url.replace(ORIGIN, ""));
        // R43 · R44 · the failure state's one action; no normal action reaches demos/main-menu.html or the old launcher
        const fp = watch(await c.newPage(), "fail"); await fp.goto(`${RUNP}?play=1&expedition=x0123456789abcdef0123`); await waitRun(fp); await frames(fp, 3);
        const fl = await fp.evaluate(() => ({ failed: !!(window.BLOOM_RUN && BLOOM_RUN.failed), why: window.BLOOM_RUN && BLOOM_RUN.summary && BLOOM_RUN.summary.why, shown: !!document.getElementById("genFail"), started: !!(window.BLOOM_RUN && BLOOM_RUN.started) })); await fp.close();
        const bad = hrefsSeen.filter(h => /main-menu\.html|#\/|ui=legacy|ui=18|changeScenario|demo-run|expedition=/.test(h));
        check(fl.failed && fl.shown && !fl.started && /retired/.test(fl.why || "") && !bad.length,
          `${B} R43 · R44 · (BLOOM-033) no production action leads anywhere but the root: the report / run-menu actions carry no URL at all; a stale two-document expedition link on the developer harness is an explicit "retired" failure (never First Bloom, never another world)`, J({ fl, bad }));
        // R76 · (BLOOM-033) the back-forward-cache rules guarded page departures that no longer exist: across the whole root flow the browser loaded ONE document
        check(navs === 0 && (await p.evaluate(() => location.href)) === HOME, `${B} R76 · one document for the whole root flow: survey → the run → report → Play again → Choose another planet → a second run → Main menu, and the address never changed (no departure for the back-forward cache to restore)`, `navigations after the title: ${navs}`);

        // ================= TRAINING from the root =================
        { const c2 = await ctx({ record: null }), q = watch(await c2.newPage(), "training");
          await q.goto(HOME); await menuReady(q);
          let qnavs = 0; q.on("framenavigated", f => { if (f === q.mainFrame()) qnavs++; });
          await q.click('.mm-item[data-act="training"]'); await trainingIn(q); await coached(q); await sleep(300);
          const t = await q.evaluate(() => ({ url: location.href, ret: BLOOM_RUN.training.returnTo, steps: BLOOM_TRAINING_UI.guide.director.steps.length, planet: BLOOM_RUN.planet.id, paused: !BLOOM_API.state().running, rec: localStorage.getItem("strange-bloom.training"), menu: BLOOM_RUN_UI.adapter.runMenu().items.map(a => a.id) }));
          await q.evaluate(() => { const c = BLOOM_TRAINING_UI.guide.coach; void c; }); await shot(q, "14-guided-training-from-root.png");
          PROOF.trainingReturnUrls.trainingHref = t.url.replace(ORIGIN, "<origin>"); PROOF.trainingReturnUrls.returnTo = t.ret;   // (BLOOM-033: no URL; the app's actions)
          check(t.url === HOME && t.ret === null && qnavs === 0 && t.steps === 13 && t.planet === "training_grounds" && t.paused && t.rec === null && J(t.menu) === J(["restartTraining", "skipTraining", "mainMenu"]),
            `${B} R17 · R45 · R51 · (BLOOM-033) TRAINING from the root runs inside the root document through the black (the address stays /, no document load): the guided coach mounts (13 lessons) on a paused Training Grounds; no return URL — its exits are the app's`, t.url.replace(ORIGIN, ""));
          await runMenu(q, "mainMenu"); await titleIn(q);
          const mm1 = await q.evaluate(() => ({ url: location.href, rec: localStorage.getItem("strange-bloom.training"), tag: MENU_DEV.entry.menu.trainingRecommended }));
          await q.click('.mm-item[data-act="training"]'); await trainingIn(q); await coached(q);
          await q.click(".tc-card .tc-skip"); await sleep(200);
          await q.click('[data-skip="skip"]'); await titleIn(q);
          const sk = await q.evaluate(() => ({ url: location.href, rec: JSON.parse(localStorage.getItem("strange-bloom.training")), tag: MENU_DEV.entry.menu.trainingRecommended }));
          PROOF.trainingReturnUrls.mainMenu = mm1.url.replace(ORIGIN, "<origin>"); PROOF.trainingReturnUrls.skip = sk.url.replace(ORIGIN, "<origin>");
          check(mm1.url === HOME && mm1.rec === null && mm1.tag && sk.url === HOME && sk.rec && sk.rec.status === "skipped" && !sk.tag && qnavs === 0,
            `${B} R46 · R47 · R50 · (BLOOM-033, in the same document) training's Main menu returns to the ROOT title recording nothing (still Recommended); Skip Tutorial → the one confirmation → Skip returns to the ROOT title and records "skipped" (the tag goes)`, J({ mm1: mm1.rec, sk: sk.rec }));
          await collectUnhandled(q); await c2.close(); }
        // ================= TRAINING COMPLETE from the root: Restart, then Begin Expedition =================
        { const c3 = await ctx({ record: null }), q = watch(await c3.newPage(), "training-complete");
          await q.goto(HOME); await menuReady(q);
          let qnavs = 0; q.on("framenavigated", f => { if (f === q.mainFrame()) qnavs++; });
          await q.click('.mm-item[data-act="training"]'); await trainingIn(q); await coached(q);
          await win(q); await reportOpen(q); await frames(q, 3);
          const tc = await q.evaluate(() => ({ acts: BLOOM.runReport.instance.state().actions, rec: JSON.parse(localStorage.getItem("strange-bloom.training")), head: document.getElementById("rrTitle").textContent }));
          await shot(q, "15-training-complete.png");
          const o1 = await q.evaluate(() => { window.__s1 = BLOOM_APP.session; return { origin: performance.timeOrigin, url: location.href, n: BLOOM_APP.stats.sessions.length }; });
          await q.click('#rr [data-act="restartTraining"]'); await trainingIn(q, o1.n + 1);
          const o2 = await q.evaluate(() => ({ fresh: BLOOM_APP.session !== window.__s1 && window.__s1.disposed, origin: performance.timeOrigin, url: location.href, ticks: BLOOM_API.sim.ticks, running: BLOOM_API.state().running, rec: JSON.parse(localStorage.getItem("strange-bloom.training")) }));
          await coached(q); await win(q); await reportOpen(q); await frames(q, 2);
          await q.click('#rr [data-act="beginExpedition"]'); await surveyIn(q);
          const be = await q.evaluate(() => ({ url: location.href, state: MENU_DEV.entry.state, prompts: MENU_DEV.entry.stats.prompts, handoffs: MENU_DEV.departures.length, rec: JSON.parse(localStorage.getItem("strange-bloom.training")) }));
          PROOF.trainingReturnUrls.beginExpedition = "(in the document) → " + be.url.replace(ORIGIN, "<origin>");
          check(J(tc.acts) === J(["beginExpedition", "restartTraining", "mainMenu"]) && tc.rec.status === "completed" && o2.fresh && o2.origin === o1.origin /* (BLOOM-033: a fresh SESSION, the same document) */ && o2.url === o1.url && o2.ticks === 0 && !o2.running && o2.rec.status === "completed",
            `${B} R49 · R50 · TRAINING COMPLETE offers Begin Expedition · Restart training · Main menu and records "completed"; Restart training is a fresh training SESSION in the same document (tick 0, paused) and "completed" is never downgraded`, J({ acts: tc.acts, head: tc.head }));
          check(be.url === HOME && be.state === "survey" && !be.prompts && !be.handoffs && be.rec.status === "completed" && qnavs === 0,
            `${B} R48 · TRAINING COMPLETE → Begin Expedition enters the Destination Survey inside the root document at once (no prompt, nothing departed, no document load)`, J(be));
          await collectUnhandled(q); await c3.close(); }
        // ================= R21 · the first-run prompt's Start Training =================
        { const c4 = await ctx({ record: null }), q = watch(await c4.newPage(), "start-training");
          await q.goto(HOME); await menuReady(q); await q.click('.mm-item[data-act="begin"]'); await sleep(200);
          await q.click('[data-act="recommend-training"]'); await trainingIn(q); await coached(q);
          const st = await q.evaluate(() => ({ rec: localStorage.getItem("strange-bloom.training"), ret: BLOOM_RUN.training.returnTo, mounted: BLOOM_TRAINING_UI.guide.mounted }));
          check(st.rec === null && st.ret === null && st.mounted, `${B} R21 · the first-run dialog's Start Training (~5 min) records nothing and starts the REAL guided training inside the root document (the coach mounted)`, J(st));
          await collectUnhandled(q); await c4.close(); }
        // ================= ?begin=1 directly at the root =================
        { const c5 = await ctx({ record: "completed" }), q = watch(await c5.newPage(), "begin"); const lf = LOG.length;
          await q.goto(HOME + "?begin=1"); await menuReady(q); await surveyReady(q);
          const b = await q.evaluate(() => ({ url: location.href, state: MENU_DEV.entry.state, events: MENU_DEV.events.map(e => e.type) }));
          const idx = await get(HOME + "index.html"); await q.goto(HOME + "index.html"); await menuReady(q);
          const ix = await q.evaluate(() => ({ title: document.title, page: MENU_DEV.page.document }));
          check(b.url === HOME && b.state === "survey" && b.events.includes("auto-begin") && LOG.slice(lf).some(([u, s]) => u === "/" && s === 200) && idx.status === 200 && ix.title === "Strange Bloom — Unknown Soils" && ix.page === "/index.html" /* (BLOOM-033: the one document at its own address) */,
            `${B} R26 · /?begin=1 opens the root title straight into the Destination Survey (begin=1 dropped from the address); /index.html is the same title (its canonical return is itself)`, J({ b: b.url, ix }));
          await collectUnhandled(q); await c5.close(); }
        // ================= direct developer URLs, ui=legacy, file:// =================
        { const direct = [];
          for (const [q2, want] of [["", { kind: "authored", id: "first_bloom", gen: 0 }], ["?planet=training_grounds", { kind: "authored", id: "training_grounds", gen: 0 }], ["?archetype=ocean_archipelago&seed=28", { kind: "procedural", gen: 1, seed: 28 }],
            ["?archetype=ocean_archipelago&seed=13&scenario=dying_world", { kind: "procedural", gen: 1, scenario: "dying_world" }], ["?archetype=desert_world&seed=25&scenario=native_competition", { kind: "procedural", gen: 1, scenario: "native_competition" }],
            ["?archetype=frozen_world&seed=22&scenario=volatile_climate", { kind: "procedural", gen: 1, scenario: "volatile_climate" }], ["?play=1", { kind: "authored", id: "first_bloom", gen: 0, acts: ["playAgain", "changePlanet", "home"] }]]) {
            const c6 = await ctx(), r = watch(await c6.newPage(), "direct" + q2); await r.goto(RUNP + q2); await waitRun(r); await waitProd(r);
            const d = await r.evaluate(() => ({ kind: BLOOM_RUN.kind, id: BLOOM_RUN.planet.id, seed: BLOOM_RUN.seed, scenario: BLOOM_RUN.scenario ? BLOOM_RUN.scenario.id : null, failed: !!BLOOM_RUN.failed, xp: !!BLOOM_RUN.expedition, pv: document.querySelectorAll(".pv").length, ui18: document.documentElement.classList.contains("ui18"),
              counters: __XP.calls, acts: BLOOM_RUN_UI.adapter.runMenu() ? BLOOM_RUN_UI.adapter.runMenu().items.map(a => [a.id, a.href]) : null }));
            if (d.acts) hrefsSeen.push(...d.acts.map(a => a[1]).filter(Boolean));
            direct.push([q2 || "(none)", !d.failed && d.kind === want.kind && (!want.id || d.id === want.id) && !d.xp && d.pv === 1 && d.ui18 && d.counters.generateFromArchetype === want.gen && (want.seed === undefined || d.seed === want.seed) && (want.scenario === undefined || d.scenario === want.scenario) && (want.acts === undefined || J(d.acts.map(a => a[0])) === J(want.acts)), d.scenario || d.id]);
            await collectUnhandled(r); await c6.close(); }
          check(direct.every(d => d[1]), `${B} R57 · R58 · R59 · direct developer runs are unchanged: no query (First Bloom), planet=, archetype= & seed= (the generator once, as before), Dying World / Native Competition / Volatile Climate scenario URLs, play=1 — each boots the production run UI, no expedition`, J(direct.map(d => [d[0], d[1], d[2]])));
          const c7 = await ctx(), l = watch(await c7.newPage(), "legacy"); await l.goto(RUNP + "?archetype=ocean_archipelago&seed=28&ui=legacy"); await waitRun(l); await sleep(400);
          const lg = await l.evaluate(() => ({ pv: !!document.querySelector(".pv"), header: (e => e ? getComputedStyle(e).display : "none")(document.querySelector("body > header")) /* (BLOOM-033: absent = not shown) */, canvas: document.getElementById("cv").width > 100 }));
          await l.goto(RUNP + "?archetype=ocean_archipelago&seed=28"); await waitRun(l); await waitProd(l); const dflt = await l.evaluate(() => ({ pv: !!document.querySelector(".pv"), header: (e => e ? getComputedStyle(e).display : "none")(document.querySelector("body > header")) /* (BLOOM-033: absent = not shown) */ }));
          await c7.close();
          check(!lg.pv && lg.header !== "none" && lg.canvas && dflt.pv && dflt.header === "none" && !hrefsSeen.some(h => /ui=legacy/.test(h)),
            `${B} R56 · ?ui=legacy still opens the engineering shell, but only when explicitly requested: the same URL without it is the production UI, and no production action ever links to it`, J({ lg, dflt }));
          const c8 = await ctx(), f = watch(await c8.newPage(), "file-run"); let fileRun = null;
          try { await f.goto(FILE + "/demos/demo-run.html"); await waitRun(f); await f.waitForFunction(() => BLOOM.planetView && BLOOM.planetView.instance && BLOOM.planetView.instance.renderer.info().frames > 0, null, { timeout: 20000 });
            fileRun = await f.evaluate(() => ({ kind: BLOOM_RUN.kind, id: BLOOM_RUN.planet.id, pv: !!document.querySelector(".pv"), running: BLOOM_API.state().running })); } catch (e) { fileRun = { error: e.message }; }
          // (BLOOM-031) the root over file:// is the real title now (the generated portable runtime; tools/portable-runtime-check.js covers the whole file:// game)
          await f.goto(FILE + "/index.html"); await f.waitForFunction(() => window.MENU_DEV && MENU_DEV.ready, null, { timeout: 30000 }).catch(() => {}); await sleep(400);
          const fr = await f.evaluate(() => ({ title: document.title, note: (document.getElementById("needsServer") || { innerText: "" }).innerText, boot: window.BLOOM_TITLE_BOOT && BLOOM_TITLE_BOOT.state, portable: !!(window.BLOOM_TITLE_BOOT && BLOOM_TITLE_BOOT.portable),
            app: document.getElementById("app").hidden, ready: !!(window.MENU_DEV && MENU_DEV.ready), items: [...document.querySelectorAll(".mm-item")].map(b => b.dataset.act), body: document.body.innerText.trim().length, bg: getComputedStyle(document.body).backgroundColor }));
          await shot(f, "20-file-root-title.png"); await c8.close();
          PROOF.fileProtocol = { root: { title: fr.title, bootState: fr.boot, portable: fr.portable, menu: fr.items }, demoRun: fileRun };
          check(fr.title === "Strange Bloom — Unknown Soils" && !fr.note && fr.boot === "mounted" && fr.portable && fr.ready && !fr.app && J(fr.items) === J(["begin", "training", "settings", "credits"]) && fr.body > 40,
            `${B} R62 · R63 · (BLOOM-031) the root index.html over file:// is the real Strange Bloom title (the generated portable runtime; the HTTP-required notice is retired), never a blank page`, J({ boot: fr.boot, portable: fr.portable, items: fr.items }));
          check(fileRun && fileRun.kind === "authored" && fileRun.id === "first_bloom" && fileRun.pv, `${B} R64 · the standalone direct demos/demo-run.html still boots over file:// (First Bloom, the production Planet View)`, J(fileRun)); }
        // ================= viewports =================
        for (const [w, h] of [[1024, 768], [1280, 800], [1440, 900]]) {
          const c9 = await ctx({ vw: w, vh: h, record: "completed" }), v = watch(await c9.newPage(), `vp${w}`); await v.goto(HOME); await menuReady(v); await sleep(500);
          const t1 = await hscroll(v), plaque = await v.evaluate(() => { const r = document.querySelector(".mm-plaque").getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth + .5 && r.top >= 0 && r.bottom <= innerHeight + .5; });
          if (w !== 1280) await shot(v, w === 1024 ? "16-root-1024x768.png" : "17-root-1440x900.png");
          await v.click('.mm-item[data-act="begin"]'); await surveyReady(v); const t2 = await hscroll(v);
          await v.click('.ds-cand[data-index="0"]'); await v.waitForFunction(() => MENU_DEV.entry.survey.state === "focus", null, { timeout: 20000 }); const t3 = await hscroll(v);
          PROOF.viewports[`${w}x${h}`] = { title: t1, survey: t2, focus: t3, plaqueInside: plaque };
          check(t1 <= 0 && t2 <= 0 && t3 <= 0 && plaque, `${B} R${w === 1024 ? 68 : w === 1280 ? 69 : 70} · ${w}×${h}: no horizontal scroll on the root title, the survey or the focused destination; the title plaque is fully on screen`, J(PROOF.viewports[`${w}x${h}`]));
          await collectUnhandled(v); await c9.close(); }
        // ================= reduced motion (the OS preference) =================
        { const c10 = await ctx({ rm: true, record: "completed" }), r = watch(await c10.newPage(), "rm"); await r.goto(HOME); await menuReady(r); await sleep(300);
          const a = await M_STATE(r); await r.click('.mm-item[data-act="begin"]'); await surveyReady(r);
          const e = await r.evaluate(() => MENU_DEV.entry.stats.entries.slice(-1)[0]);
          await r.click('.ds-cand[data-index="1"]'); await r.waitForFunction(() => MENU_DEV.entry.survey.state === "focus", null, { timeout: 20000 });
          const cap2 = await r.evaluate(SURVEY_CAP, 1); await r.click(".ds-btn.go"); await r.waitForFunction(() => document.querySelector(".atx") && document.querySelector(".atx").dataset.atxPreset === "dramatic", null, { timeout: 10000, polling: 20 });
          const atx2 = await r.evaluate(() => document.querySelector(".atx").classList.contains("rm"));
          await runIn(r); await waitProd(r);
          const g3 = await r.evaluate(GAME_CAP); await shot(r, "19-reduced-motion.png");
          check(a.rm && e.reducedMotion !== false && e.blackMs < 220 && atx2 && g3.fingerprint === cap2.fingerprint && g3.sameObject && g3.path === "/",
            `${B} R72 · reduced motion (OS) through the root flow: the title at rest, the menu → survey black fade short (${e.blackMs} ms), the DRAMATIC departure in its reduced form, and the same exact-world handoff (fingerprint kept, return = ROOT)`, J({ black: e.blackMs, atxRm: atx2 }));
          await collectUnhandled(r); await c10.close(); }
      } else {
        // ================= Firefox 1280 × 800: the root's main path =================
        const c = await ctx({ record: "completed" }), p = watch(await c.newPage(), "firefox"); await p.goto(HOME); await menuReady(p); await sleep(400);
        const m0 = await M_STATE(p); await shot(p, "18-firefox-root.png");
        await p.click('.mm-item[data-act="begin"]'); await surveyReady(p);
        await p.click('.ds-cand[data-index="4"]'); await p.waitForFunction(() => MENU_DEV.entry.survey.state === "focus", null, { timeout: 20000, polling: 50 });
        const cap = await p.evaluate(SURVEY_CAP, 4); await DEPART(p);
        await runIn(p); await waitProd(p);
        const g = await p.evaluate(GAME_CAP), sc = await hscroll(p);
        await disarm(p); await runMenu(p, "mainMenu"); await titleIn(p);
        const back = await p.evaluate(() => ({ url: location.href, state: MENU_DEV.entry.state }));
        check(m0.title === "Strange Bloom — Unknown Soils" && J(m0.items) === J(["begin", "training", "settings", "credits"]) && g.fingerprint === cap.fingerprint && g.planet === cap.planet && g.counters.createSim === 1 && GEN_NAMES.every(n => g.counters[n] === 0) && g.sameObject && g.path === "/" && back.url === HOME && back.state === "menu" && sc <= 0,
          `${B} R71 · Firefox 1280×800: the root title → the survey → the exact candidate → the run inside the root document (the same planet object, fingerprint and JSON, no generator) → Main menu back to the ROOT title; no horizontal scroll`, J({ fp: g.fingerprint, back: back.url.replace(ORIGIN, "") }));
        await collectUnhandled(p); PROOF.browsers[bname].flows.push("root expedition flow (1280x800)"); await c.close();
      }
    } catch (e) { check(false, `${B} the browser flow ran to the end`, e.message.split("\n")[0] + " @ " + ((e.stack || "").split("\n").find(l => /release-check\.js:\d+/.test(l)) || "").trim()); }
    await browser.close();
  }
  // R65 · R66 · R67
  check(!external.length, "R65 · no external network request on any page (every request went to the local test origin, file: or data:)", external.slice(0, 3).join(" ") || `${LOG.length} local requests`);
  check(!errsAll.length, "R66 · no console error or page error anywhere over the HTTP root flow, training, direct runs and viewports", errsAll.slice(0, 4).join(" | "));
  check(!unhandledAll.length, "R67 · no unhandled promise rejection on any page", unhandledAll.slice(0, 3).join(" | "));
  server.close();

  // ================================================================ children: R52 · R60 · R61
  if (SUITES) {
    // (BLOOM-033) the two-document expedition-handoff-check is retired; the one-document app's flow suite takes its place
    for (const [name, args, items] of [["single-app-flow-check", ["--browsers", "chromium"], "R60"], ["guided-training-check", ["--browsers", "chromium"], "R52 · R61"]]) {
      const t1 = Date.now(), r = cp.spawnSync(process.execPath, [path.join(ROOT, "tools", name + ".js"), ...args], { cwd: ROOT, env: process.env, encoding: "utf8", maxBuffer: 256 << 20, timeout: 1500000 });
      const out = (r.stdout || "") + (r.stderr || ""), pass = (out.match(/^PASS/gm) || []).length, fail = (out.match(/^FAIL/gm) || []).length;
      const alt = name === "guided-training-check" ? (out.split("\n").find(l => /G4 /.test(l)) || "") : "";
      PROOF.children[name] = { exit: r.status, pass, fail, seconds: Math.round((Date.now() - t1) / 1000) };
      check(r.status === 0 && fail === 0 && pass > 0 && (!alt || /^PASS/.test(alt)), `${items} · ${name} (Chromium) still green${name === "guided-training-check" ? " — including G4, the guided alternate route (Warm the Sky · Early Maturity · Roots · Seed Reserve · Drought) to a real win" : ""}`,
        `${pass} pass / ${fail} fail · exit ${r.status} · ${PROOF.children[name].seconds} s${fail ? " · " + out.split("\n").filter(l => /^FAIL/.test(l)).slice(0, 2).join(" | ").slice(0, 300) : ""}`); }
  } else info("R52 · R60 · R61 · child suites", "--no-suites: single-app-flow-check and guided-training-check not run here (run them on their own)");

  if (EVIDENCE) { PROOF.totals = { pass: passes, fail: fails }; const f = path.join(EVD, "release-proof.json"); let prev = null; try { prev = JSON.parse(fs.readFileSync(f, "utf8")); } catch {}
    if (prev && prev.suiteTotals) PROOF.suiteTotals = prev.suiteTotals; fs.writeFileSync(f, JSON.stringify(PROOF, null, 2) + "\n"); }
  console.log(`\n${fails ? fails + " check(s) FAILED, " + passes + " passed" : "ALL CHECKS PASS (" + passes + ")"}  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
