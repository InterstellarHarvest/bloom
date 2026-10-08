// BLOOM — Portable runtime check (BLOOM-031): the double-clicked index.html (file://) runs the whole Strange Bloom game, and the same
// production game runs over http(s) at / and under a GitHub Pages project subpath (/bloom/). The 32nd regression suite.
// docs/PORTABLE_RUNTIME_v1.md. Numbered after the directive's items 1–46 (P1 … P46; one check may carry several items).
//
//   NODE_PATH="$(npm root -g)" node tools/portable-runtime-check.js [--browsers chromium,firefox] [--evidence] [--no-suites]
//
// Node: the exact start (main 85ddd76 = the 3cd91b9 production code + a docs-only README); every file outside the module seam is
// byte-identical to it and the seam's changed code names no gameplay rule; the generated portable runtime (dist/portable/) equals a fresh
// in-memory build AND two builds from a clean copy of the committed tree (deterministic, no timestamp); its inputs are exactly source
// files (no handwritten rule in the generated layer; one Three.js); the root no longer carries the HTTP-required notice; the thirteen
// lessons, the ten bloom:* dispatch sites and the tutorial anchors unchanged; the Pages workflow is static-only; no runtime dependency.
// Browser (Chromium and Firefox, launched with NO arguments — default file:// security): the root index.html as a FILE, OFFLINE (every
// http(s) request blocked and recorded): title, paintings, Settings, keyboard, the first-run dialog, the Destination Survey (nine validated
// worlds from the bundled survey worker, truthful Incoming), the real PlanetSphereView (drag), Scan New Sector, focus, DRAMATIC, the
// exact planet through the file-safe handoff (window.name; no generator on the run page), Planet View, Region / Adapt / Spread /
// Terraform (the real sphere), the report, Play Again (same planet), Main menu, a second expedition, Choose another planet, TRAINING and
// its exits; storage blocked (degrades safely); reduced motion. Then the served path: http://127.0.0.1/ (module workers, no bundle) and
// the Pages artifact (tools/build-pages-site.mjs) under http://127.0.0.1/bloom/ — every request inside /bloom/, the exact handoff,
// training, every return URL subpath-safe. Unless --no-suites it runs guided-training-check --file (the complete guided training over
// file://, all lessons by real input) as a child. --evidence writes docs/evidence/bloom-031/ (8 stills + portable-proof.json).
"use strict";
const path = require("path"), fs = require("fs"), http = require("http"), cp = require("child_process"), crypto = require("crypto"), os = require("os");
const { pathToFileURL } = require("url");
const ROOT = path.resolve(__dirname, "..");
const argv = process.argv, argOf = k => { const i = argv.indexOf(k); return i > 0 ? argv[i + 1] : null; };
const BROWSERS = (argOf("--browsers") || "chromium,firefox").split(","), EVIDENCE = argv.includes("--evidence"), SUITES = !argv.includes("--no-suites");
const EVD = path.join(ROOT, "docs/evidence/bloom-031");
const J = JSON.stringify, read = f => fs.readFileSync(path.join(ROOT, f), "utf8");
let fails = 0, passes = 0; const t0 = Date.now(); const RESULTS = [];
const check = (ok, name, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); RESULTS.push({ ok: !!ok, name: name.slice(0, 160) }); if (ok) passes++; else fails++; };
const info = (name, detail) => console.log(`INFO  ${name}  — ${detail}`);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const git = (a, cwd = ROOT) => cp.execSync(`git ${a}`, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 256 << 20 }).trim();
const sha256 = b => crypto.createHash("sha256").update(b).digest("hex");
const strip = src => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/<!--[\s\S]*?-->/g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");

// the authoritative start: production main at the start of BLOOM-031 (85ddd76) = the 3cd91b9 release code + a docs-only README commit
const BASE_SHA = "3cd91b935008710e1e8c344d8445706b42ecbbc5", MAIN_SHA = "85ddd7619479d80ecf04a66481eb01971e13b5bf";
// BLOOM-031's own range (later milestones that legitimately change these files never trip the provenance checks; the run-ui-check pattern)
const COMMITS = git(`log --format=%H%x09%s ${MAIN_SHA}..HEAD`).split("\n").filter(Boolean).map(l => l.split("\t"));
const OWN = COMMITS.filter(([, s]) => /^BLOOM-031\b/.test(s)), END = OWN.length ? OWN[0][0] : null, HEAD = git("rev-parse HEAD");
const WITH_TREE = !END || END === HEAD;
const readAt = f => WITH_TREE ? read(f) : git(`show ${END}:"${f}"`);
const hashAt = f => WITH_TREE ? git(`hash-object "${f}"`) : git(`rev-parse ${END}:"${f}"`);
const changedFiles = () => { const tracked = git(WITH_TREE ? `diff --name-only ${MAIN_SHA}` : `diff --name-only ${MAIN_SHA} ${END}`).split("\n").filter(Boolean);
  const untracked = WITH_TREE ? git("ls-files -o --exclude-standard").split("\n").filter(Boolean) : []; return [...new Set([...tracked, ...untracked])].sort(); };

// the module seam: the only pre-existing runtime files BLOOM-031 may touch (each change names the seam, never a rule)
const SEAM = ["index.html", "demos/demo-run.html", "resources/main-menu/title-boot.js", "resources/main-menu/main-menu-page.js", "resources/destination-survey/sector-pool.js",
  "resources/expedition/expedition-handoff.js", "resources/expedition/expedition-arrival.js", "resources/run-ui/terraform-globe.js", "resources/run-ui/gameplay-transition.js"];
const NEW_RUNTIME = ["resources/portable/module-loader.js", "resources/portable/portable-entry.js", "resources/portable/portable-root.js"];
const GENERATED = ["dist/portable/strange-bloom.portable.js", "dist/portable/manifest.json"];
const ALLOWED = p => SEAM.includes(p) || NEW_RUNTIME.includes(p) || GENERATED.includes(p) || p === "README.md" || p.startsWith("docs/") || p.startsWith("tools/")
  || [".github/workflows/pages.yml", ".gitignore"].includes(p);
// identifiers of game rules / mechanics: none may appear on a changed code line of the seam, nor in a handwritten portable file
const RULE_WORDS = /\b(createSim|BLOOM_API|biomass|Biomass|coverage|winThreshold|growThresh|traits|price|cost|ownedTier|generateFromArchetype|generatePlanet|attemptPlanet|searchWorld|runSearch|validate[A-Z]\w*|stripPlanet|columnCandidates|planColumn|makeCandidate|SURVEY_CLASSES|minHabitable|fitness|tick\b|advance\()/;
const EVTS = ["run-ready", "play-pause", "speed", "region-select", "upgrade-preview", "upgrade-purchase", "growth-focus", "local-upgrade", "bubble-collect", "win"];
const DETAIL_KEYS = { "run-ready": ["kind", "planetId", "running", "training"], "play-pause": ["running"], speed: ["speed"], "region-select": ["id", "index", "name", "previous", "tile", "water"],
  "upgrade-preview": ["available", "better", "board", "gain", "id", "lose", "name", "reachHostile", "worse"], "upgrade-purchase": ["biomass", "board", "cost", "id", "name", "tier"],
  "growth-focus": ["changed", "focus", "id", "index", "name", "previous"], "local-upgrade": ["cost", "id", "index", "name", "upgrade", "upgradeName"],
  "bubble-collect": ["how", "id", "index", "name", "tile", "value"], win: ["coverage", "planetId", "ticks", "training"] };
const GEN_NAMES = ["generateFromArchetype", "generatePlanet", "attemptPlanet", "searchWorld", "runSearch"];
const LESSONS = ["start", "natural-spread", "biomass", "inspect-chill", "limiting-factor", "adapt-buy", "spread", "growth-focus", "local-upgrade", "terraform-preview", "tradeoff", "sacrifice", "goal"];
const PROOF = { milestone: "BLOOM-031", baseSha: BASE_SHA, mainSha: MAIN_SHA, head: HEAD, build: null, cleanRebuild: null, sizes: null, launchOptions: {}, browsers: {}, file: {}, http: {}, pages: {}, children: {}, checks: null };

(async () => {
  // ================================================================ Node
  console.log("# Node");
  // P1 · the exact start
  { const anc = (() => { try { git(`merge-base --is-ancestor ${BASE_SHA} ${MAIN_SHA}`); return true; } catch { return false; } })();
    const mainDiff = git(`diff --name-only ${BASE_SHA} ${MAIN_SHA}`).split("\n").filter(Boolean);
    const first = git(`rev-list --first-parent --reverse ${MAIN_SHA}..HEAD`).split("\n").filter(Boolean)[0] || null, parent = first ? git(`rev-parse ${first}^`) : HEAD;
    let origin = null; try { origin = git("rev-parse origin/main"); } catch { /* no remote */ }
    check(anc && mainDiff.every(f => f === "README.md" || f.startsWith("docs/")) && parent === MAIN_SHA && OWN.every(([h]) => git(`merge-base --is-ancestor ${MAIN_SHA} ${h}`) === ""),
      "P1 · the exact start: BLOOM-031 branches from production main 85ddd76, which is the 3cd91b9 production code plus a docs-only README commit (3cd91b9 → 85ddd76 touches README.md and docs/ only)",
      J({ firstParent: parent.slice(0, 7), mainDiff: mainDiff.length, own: OWN.length, originMain: origin && origin.slice(0, 7) })); }

  // P37 · no gameplay source changed: everything outside the seam is byte-identical to main; the seam's changed code names no rule
  const CHANGED = changedFiles(), unexpected = CHANGED.filter(p => !ALLOWED(p));
  const PROTECTED = git(`ls-tree -r --name-only ${MAIN_SHA} -- content planets resources demos index.html`).split("\n").filter(Boolean).filter(p => !SEAM.includes(p));
  const protDiff = PROTECTED.filter(p => { try { return hashAt(p) !== git(`rev-parse ${MAIN_SHA}:"${p}"`); } catch { return true; } });
  const seamCode = {}; let ruleHits = [];
  for (const f of SEAM) { const a = new Set(strip(git(`show ${MAIN_SHA}:"${f}"`)).split("\n").map(s => s.trim()).filter(Boolean)), b = new Set(strip(readAt(f)).split("\n").map(s => s.trim()).filter(Boolean));
    const added = [...b].filter(l => !a.has(l)), removed = [...a].filter(l => !b.has(l)); seamCode[f] = { added: added.length, removed: removed.length };
    ruleHits.push(...[...added, ...removed].filter(l => RULE_WORDS.test(l)).map(l => `${f}: ${l.slice(0, 120)}`)); }
  // demo-run.html: its seam lines stand next to existing code on the same line (the training-layer load) — exempt only that line shape
  ruleHits = ruleHits.filter(l => !/demo-run\.html: (const res=combined\.length|if\(BLOOM\.modules&&BLOOM\.modules\.portable\))/.test(l));
  check(!unexpected.length && !protDiff.length && !ruleHits.length,
    `P37 · no gameplay source changed: of ${PROTECTED.length} runtime files outside the module seam (engine, generator, validator, sphere, surface, transitions, survey, rooms, report, training, content, planets, stylesheets, demos) none differs from main; every other change is the seam (${SEAM.length} files), the new portable files, the generated layer, tools, docs or the Pages workflow; no changed seam code line names a game rule`,
    J({ unexpected, protDiff, ruleHits: ruleHits.slice(0, 4), seamCode }));
  PROOF.changedFiles = CHANGED; PROOF.seamCode = seamCode;

  // P2 · source mode unchanged (served): import() of the source modules, module workers, sessionStorage handoff
  { const boot = readAt("resources/main-menu/title-boot.js"), loader = readAt("resources/portable/module-loader.js"), pool = readAt("resources/destination-survey/sector-pool.js"), xh = readAt("resources/expedition/expedition-handoff.js");
    const helpers = ["resources/run-ui/terraform-globe.js", "resources/run-ui/gameplay-transition.js", "resources/expedition/expedition-arrival.js"].map(f => readAt(f));
    check(/\(served \? import\(page\) : window\.BLOOM\.modules\.load\(page\)\)/.test(boot) && /var scripts = served \? CLASSIC :/.test(boot) && /if \(!portable\) return import\(url\);/.test(loader)
      && /const served = !!\(root\.location && \/\^https\?:\$\/\.test\(root\.location\.protocol\)\);/.test(loader)
      && /static workerFactory = null;/.test(pool) && /SectorPool\.workerFactory \? SectorPool\.workerFactory\(\) : new Worker\(new URL\("\.\/survey-worker\.js", import\.meta\.url\), \{ type: "module" \}\)/.test(pool)
      && helpers.every(s => /const importModule = url => \(modules\(\) && modules\(\)\.portable \? modules\(\)\.load\(url\) : import\(url\)\);/.test(s))
      && /if \(win\.location && \/\^https\?:\$\/\.test\(win\.location\.protocol\)\) return S;/.test(xh),
      "P2 · source mode unchanged: served over http(s) the title imports the source composer (no extra script), the survey starts its module workers (SectorPool.workerFactory stays null), every classic helper still import()s the source module and the handoff stays in sessionStorage — the portable branches exist only for non-http(s) pages"); }

  // P6 (source) · the HTTP-required notice is retired
  { const boot = readAt("resources/main-menu/title-boot.js"), idx = readAt("index.html");
    check(!/needs to be opened through a web server|needs-server|needsServer|python3 -m http\.server/.test(boot) && !/Opened as a file it shows a plain notice/.test(idx),
      "P6 (source) · the file:// \"This build needs to be opened through a web server\" notice is retired from the title boot and the root document (a plain notice remains only for a damaged copy whose portable runtime is missing)"); }

  // P3 · P4 · P5 · P40 · the generated layer
  const BUILD = await import(pathToFileURL(path.join(ROOT, "tools/build-portable.mjs")).href).catch(e => ({ error: e }));
  if (BUILD.error) check(false, "P3 · the portable build runs (esbuild installed: npm --prefix tools ci)", BUILD.error.message.split("\n")[0]);
  else {
    const built = await BUILD.buildPortable(ROOT), cmp = BUILD.compare(ROOT, built.files);
    const committed = GENERATED.map(p => { try { return [p, git(`rev-parse HEAD:"${p}"`) === git(`hash-object "${p}"`)]; } catch { return [p, false]; } });
    PROOF.build = { fingerprint: built.manifest.fingerprint, esbuild: built.manifest.esbuild, format: built.manifest.format, compare: cmp, committedAtHead: committed };
    check(cmp.every(c => c.ok), `P3 · the portable artifacts are generated from source: an in-memory build of tools/build-portable.mjs equals dist/portable/ byte for byte (${GENERATED.join(", ")})`, cmp.map(c => `${c.path.split("/").pop()} ${c.reason}`).join(" · "));
    info("P3 · committed", committed.map(([p, ok]) => `${p.split("/").pop()} ${ok ? "= HEAD" : "NOT YET COMMITTED / differs from HEAD"}`).join(" · "));
    // P4 · a clean checkout builds the same bytes, twice
    const tmp = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "bloom-031-clean-")); let clean = { source: null };
    try {
      const dirty = git("status --porcelain --untracked-files=no").length > 0;
      if (!dirty) { cp.execSync(`git archive HEAD | tar -x -C "${tmp}"`, { cwd: ROOT, stdio: "ignore", shell: "/bin/sh" }); clean.source = `git archive ${HEAD.slice(0, 7)}`; }
      else { for (const f of git("ls-files -co --exclude-standard").split("\n").filter(Boolean)) { if (!fs.existsSync(path.join(ROOT, f))) continue; fs.mkdirSync(path.dirname(path.join(tmp, f)), { recursive: true }); fs.copyFileSync(path.join(ROOT, f), path.join(tmp, f)); }
        clean.source = "working tree (tracked + untracked, uncommitted changes present)"; }
      fs.rmSync(path.join(tmp, "dist"), { recursive: true, force: true });
      fs.symlinkSync(path.join(ROOT, "tools/node_modules"), path.join(tmp, "tools/node_modules"), "dir");
      const runBuild = () => cp.spawnSync(process.execPath, [path.join(tmp, "tools/build-portable.mjs")], { cwd: tmp, encoding: "utf8" });
      const b1 = runBuild(), h1 = GENERATED.map(p => fs.existsSync(path.join(tmp, p)) ? sha256(fs.readFileSync(path.join(tmp, p))) : null);
      fs.rmSync(path.join(tmp, "dist"), { recursive: true, force: true });
      const b2 = runBuild(), h2 = GENERATED.map(p => fs.existsSync(path.join(tmp, p)) ? sha256(fs.readFileSync(path.join(tmp, p))) : null);
      const mine = GENERATED.map(p => sha256(fs.readFileSync(path.join(ROOT, p))));
      const chk = cp.spawnSync(process.execPath, [path.join(tmp, "tools/build-portable.mjs"), "--check"], { cwd: tmp, encoding: "utf8" });
      clean = { ...clean, build1: b1.status, build2: b2.status, hashes1: h1, hashes2: h2, committed: mine, checkExit: chk.status };
      check(b1.status === 0 && b2.status === 0 && h1.every(Boolean) && J(h1) === J(mine) && J(h2) === J(mine) && chk.status === 0,
        `P4 · deterministic rebuild: from a clean copy (${clean.source}) with dist/ deleted, \`npm --prefix tools run build:portable\` twice gives byte-identical artifacts that equal the committed dist/portable/ (and \`npm --prefix tools run check:portable\` there exits 0)`,
        `${mine.map(h => h.slice(0, 12)).join(" · ")}${b1.status ? " · build1: " + (b1.stderr || "").slice(0, 200) : ""}`);
    } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
    PROOF.cleanRebuild = clean;
    // header: format + fingerprint, no timestamp
    const bundle = read(GENERATED[0]), man = JSON.parse(read(GENERATED[1])), head = bundle.slice(0, 900);
    const hf = (head.match(/Source fingerprint: ([0-9a-f]{64})/) || [])[1];
    check(/GENERATED FILE — do not edit by hand/.test(head) && /Format: bloom-portable\/1/.test(head) && hf === man.fingerprint && hf === built.manifest.fingerprint && !/\b20\d\d-\d\d-\d\d(T| )\d\d:/.test(head + read(GENERATED[1])) && !bundle.includes(ROOT) && !read(GENERATED[1]).includes(os.userInfo().username),
      "P4b · the generated header names the build (GENERATED — do not edit; format bloom-portable/1; esbuild version; the source fingerprint, equal to manifest.json's and to a fresh build's); no timestamp, absolute path or user name in the generated files", hf && hf.slice(0, 16));
    // P5 · no handwritten rules in the generated layer
    const tracked = new Set(git("ls-files").split("\n")), untracked = new Set(WITH_TREE ? git("ls-files -o --exclude-standard").split("\n") : []);
    const badInput = man.inputs.filter(i => !(tracked.has(i.path) || untracked.has(i.path)) || i.sha256 !== sha256(fs.readFileSync(path.join(ROOT, i.path))));
    const markers = [...bundle.matchAll(/^\s*\/\/ ((?:resources|content|planets)\/\S+\.js)$/gm)].map(m => m[1]);
    const inputSet = new Set(man.inputs.map(i => i.path)), workerSet = new Set(man.workerInputs);
    const strayMarkers = markers.filter(m => !inputSet.has(m));
    const handwritten = NEW_RUNTIME.map(f => [f, strip(read(f))]).filter(([, s]) => RULE_WORDS.test(s)).map(([f]) => f);
    const three = ["three.core.min.js", "three.module.min.js"].map(n => markers.filter(m => m.endsWith(n)).length), threeInWorker = man.workerInputs.filter(p => /three/.test(p));
    const workerEngine = ["resources/bloom-sim.js", "resources/bloom-gen.js", "resources/bloom-validate.js", "resources/bloom-play.js", "resources/destination-survey/survey-data.js", "resources/destination-survey/survey-worker.js"].every(p => workerSet.has(p));
    check(!badInput.length && !strayMarkers.length && !handwritten.length && J(three) === "[1,1]" && !threeInWorker.length && workerEngine && J(man.modules) === J(["resources/main-menu/main-menu-page.js", "resources/main-menu/main-menu-data.js", "resources/planet-sphere/planet-sphere-view.js", "resources/atmosphere-transition/atmosphere-transition.js", "resources/training/training-run.js"]),
      `P5 · no handwritten rules in the generated layer: every bundled module is a tracked source file at its current hash (${man.inputs.length} inputs; the survey worker's ${man.workerInputs.length} are the real worker and the BLOOM classic scripts it imports); the three handwritten portable files name no game rule; Three.js is bundled exactly once (none in the worker); the bundle registers exactly the five dynamically imported modules`,
      J({ badInput: badInput.map(i => i.path), strayMarkers, handwritten, three, threeInWorker }));
    // P40 · sizes
    const dirBytes = d => fs.readdirSync(path.join(ROOT, d)).reduce((n, f) => n + fs.statSync(path.join(ROOT, d, f)).size, 0);
    const threeBytes = man.inputs.filter(i => /three-0\.185\.1/.test(i.path)).reduce((n, i) => n + i.bytesInBundle, 0), srcBytes = man.inputs.filter(i => !/three-0\.185\.1/.test(i.path)).reduce((n, i) => n + i.bytesInBundle, 0);
    PROOF.sizes = { bundleJs: man.output.bytes, generatedCss: 0, manifest: Buffer.byteLength(read(GENERATED[1])), distPortableTotal: dirBytes("dist/portable"), threeJsInBundle: threeBytes, gameModulesInBundle: srcBytes, surveyWorkerText: man.output.surveyWorkerTextBytes,
      vendoredThreeOnDisk: man.inputs.filter(i => /three-0\.185\.1/.test(i.path)).reduce((n, i) => n + i.bytes, 0) };
    check(man.output.bytes < 4e6 && three[0] === 1, `P40 · portable build size recorded: ${(man.output.bytes / 1024).toFixed(0)} KiB JS (Three.js ${(threeBytes / 1024).toFixed(0)} KiB once · game modules ${(srcBytes / 1024).toFixed(0)} KiB · survey worker text ${(man.output.surveyWorkerTextBytes / 1024).toFixed(0)} KiB), no generated CSS (the stylesheets load as files), dist/portable/ ${(PROOF.sizes.distPortableTotal / 1024).toFixed(0)} KiB in total`, J(PROOF.sizes));
  }

  // P13 (source) · the thirteen lessons; P38 / P39 (source) · bloom:* dispatch sites and anchors
  { const { trainingSteps } = await import(pathToFileURL(path.join(ROOT, "resources/training/training-steps.js")).href);
    const same = ["resources/training/training-steps.js", "resources/training/training-director.js", "resources/training/training-coach.js", "content/training.js", "planets/training_grounds.js"].every(f => hashAt(f) === git(`rev-parse ${MAIN_SHA}:"${f}"`));
    check(J(trainingSteps().map(s => s.id)) === J(LESSONS) && same, "P13 (source) · the thirteen guided lessons are unchanged (training-steps / director / coach / content/training.js / Training Grounds byte-identical to main)", trainingSteps().map(s => s.id).join(" · ")); }
  { const emits = s => [...s.matchAll(/emit\("([a-z-]+)",\{[^}]*\}\)/g)].map(m => m[0]).sort(), runNow = readAt("demos/demo-run.html"), runMain = git(`show ${MAIN_SHA}:demos/demo-run.html`);
    check(J(emits(runNow)) === J(emits(runMain)) && [...new Set([...runNow.matchAll(/emit\("([a-z-]+)"/g)].map(m => m[1]))].sort().join() === [...EVTS].sort().join(),
      "P38 (source) · the ten bloom:* dispatch sites on the run page are character-identical to main (the same events, the same detail objects)", `${emits(runNow).length} sites`);
    const anchors = s => [...s.matchAll(/data-tutorial="([^"$]+)"/g)].map(m => m[1]).sort();
    const files = ["demos/demo-run.html", ...git(`ls-tree -r --name-only ${MAIN_SHA} -- resources/run-ui resources/training`).split("\n").filter(f => f.endsWith(".js"))];
    const now = files.flatMap(f => anchors(readAt(f))), was = files.flatMap(f => anchors(git(`show ${MAIN_SHA}:"${f}"`)));
    check(J(now) === J(was), "P39 (source) · the tutorial anchors (every data-tutorial literal on the run page and in the run UI / training) are unchanged", `${now.length} anchors`); }

  // P35 · the GitHub Pages workflow is static-only; P36 · no external runtime dependency
  let SITE = null;
  { const wf = fs.existsSync(path.join(ROOT, ".github/workflows/pages.yml")) ? read(".github/workflows/pages.yml") : "";
    const uses = [...wf.matchAll(/^\s*-?\s*uses:\s*(\S+)/gm)].map(m => m[1]), runs = [...wf.matchAll(/^\s*run:\s*(.+)$/gm)].map(m => m[1].trim());
    const OFFICIAL = ["actions/checkout@v7", "actions/configure-pages@v6", "actions/upload-pages-artifact@v5", "actions/deploy-pages@v5"];
    SITE = await import(pathToFileURL(path.join(ROOT, "tools/build-pages-site.mjs")).href);
    check(J(uses) === J(OFFICIAL) && J(runs) === J(["node tools/build-pages-site.mjs _site"]) && /branches: \[main\]/.test(wf) && /pages: write/.test(wf) && /id-token: write/.test(wf) && !/npm|secrets\.|curl|wget|docker|server/i.test(strip(wf.replace(/#.*$/gm, "")))
      && J(SITE.SITE) === J(["index.html", "demos/demo-run.html", "demos/main-menu.html", "content", "planets", "resources"]),
      "P35 · the GitHub Pages workflow is static-only: on push to main (or by hand) it copies the game's own files (tools/build-pages-site.mjs: index.html, the run page + alias, content, planets, resources; Node built-ins, no npm install, no build) and deploys them with the official actions only (checkout, configure-pages, upload-pages-artifact, deploy-pages); no secret, no server", J({ uses, runs })); }
  { const pkg = JSON.parse(read("tools/package.json")), rootPkg = fs.existsSync(path.join(ROOT, "package.json")), entry = ["index.html", "demos/demo-run.html", "resources/main-menu/title-boot.js", "resources/portable/module-loader.js", "resources/portable/portable-entry.js", "resources/portable/portable-root.js", "resources/main-menu/main-menu-page.js"];
    const urls = entry.flatMap(f => [...strip(read(f)).matchAll(/https?:\/\/[^\s"'`)<]+/g)].map(m => `${f}: ${m[0]}`));
    check(!rootPkg && !pkg.dependencies && J(Object.keys(pkg.devDependencies || {})) === J(["esbuild"]) && pkg.private === true && !urls.length && !/analytics|gtag|googletagmanager|fonts\.googleapis/.test(entry.map(read).join("\n")),
      "P36 (source) · no external runtime dependency: the repository root stays a static site (no package.json there); tools/package.json declares no runtime dependency (one dev dependency, esbuild, for developers only); the entry documents, boot, seam and composer name no external URL, no analytics, no web font", J({ dev: pkg.devDependencies, urls })); }

  // ================================================================ browser
  let pw = null; try { pw = require("playwright"); } catch { check(false, "Playwright available (NODE_PATH=\"$(npm root -g)\")", "require('playwright') failed"); }
  const S = await import(pathToFileURL(path.join(ROOT, "resources/destination-survey/survey-data.js")).href);   // the survey's own planetFingerprint, in Node
  const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".json": "application/json", ".svg": "image/svg+xml", ".md": "text/markdown" };
  const serve = (dir, prefix, LOG) => http.createServer((req, res) => {
    const p0 = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (prefix !== "/" && p0 === prefix.slice(0, -1)) { LOG.push([p0, 301]); res.writeHead(301, { location: prefix }); return res.end(); }   // GitHub Pages: /bloom → /bloom/
    if (!p0.startsWith(prefix)) { LOG.push([p0, 404, "outside"]); res.writeHead(404); return res.end(); }
    const rel = p0.slice(prefix.length), u = rel === "" || rel.endsWith("/") ? rel + "index.html" : rel, f = path.join(dir, u);
    if (!f.startsWith(dir) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { LOG.push([p0, 404]); res.writeHead(404); return res.end(); }
    LOG.push([p0, 200]); res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream", "cache-control": "no-store" }); fs.createReadStream(f).pipe(res); });
  const LOG_ROOT = [], LOG_PAGES = [];
  const SITE_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "bloom-031-pages-")), siteFiles = SITE.buildSite(ROOT, SITE_DIR);
  const srvRoot = serve(ROOT, "/", LOG_ROOT), srvPages = serve(SITE_DIR, "/bloom/", LOG_PAGES);
  await new Promise(r => srvRoot.listen(0, "127.0.0.1", r)); await new Promise(r => srvPages.listen(0, "127.0.0.1", r));
  const HO = `http://127.0.0.1:${srvRoot.address().port}`, HOME = HO + "/", PO = `http://127.0.0.1:${srvPages.address().port}`, PHOME = PO + "/bloom/";
  const FROOT = "file://" + encodeURI(ROOT), FINDEX = FROOT + "/index.html";
  PROOF.pages.site = { files: siteFiles.length, bytes: siteFiles.reduce((n, f) => n + fs.statSync(path.join(SITE_DIR, f)).size, 0) };
  if (EVIDENCE) fs.mkdirSync(EVD, { recursive: true });

  // in every page: generator / search counters (on an expedition page every world-making function THROWS), the bloom:* log, unhandled rejections
  const INIT = () => {
    const XP = window.__XP = { calls: { generateFromArchetype: 0, generatePlanet: 0, attemptPlanet: 0, searchWorld: 0, runSearch: 0, createSim: 0 }, forbid: /[?&]expedition=/.test(location.search), threw: [] };
    const wrap = (holder, name, forbidable) => { const d = Object.getOwnPropertyDescriptor(holder, name); if (d && d.get && d.get.__xp) return; let raw = d ? d.value : undefined;
      const mk = fn => fn && typeof fn === "function" ? function (...a) { XP.calls[name]++; if (forbidable && XP.forbid) { XP.threw.push(name); throw new Error("031 guard: " + name + " on an expedition page"); } return fn.apply(this, a); } : fn;
      let cur = mk(raw); const get = () => cur; get.__xp = true; Object.defineProperty(holder, name, { configurable: true, enumerable: true, get, set(v) { raw = v; cur = mk(v); } }); };
    const guard = obj => { if (!obj || typeof obj !== "object") return; wrap(obj, "generateFromArchetype", true); wrap(obj, "generatePlanet", true); wrap(obj, "createSim", false);
      for (const sub of ["play", "archetype"]) { const d = Object.getOwnPropertyDescriptor(obj, sub); if (d && d.get && d.get.__xp) continue; let o = d ? d.value : undefined; const g = v => { if (v && typeof v === "object") { if (sub === "play") { wrap(v, "searchWorld", true); wrap(v, "runSearch", true); } else wrap(v, "attemptPlanet", true); } return v; };
        o = g(o); const get = () => o; get.__xp = true; Object.defineProperty(obj, sub, { configurable: true, enumerable: true, get, set(v) { o = g(v); } }); } };
    let B = window.BLOOM; guard(B); Object.defineProperty(window, "BLOOM", { configurable: true, get: () => B, set(v) { B = v; guard(v); } });
    window.__EV = []; for (const t of ["run-ready", "play-pause", "speed", "region-select", "upgrade-preview", "upgrade-purchase", "growth-focus", "local-upgrade", "bubble-collect", "win"])
      document.addEventListener("bloom:" + t, e => window.__EV.push({ type: t, keys: Object.keys(e.detail || {}).sort() }));
    window.__UNHANDLED = []; addEventListener("unhandledrejection", e => { window.__UNHANDLED.push(String(e.reason && e.reason.message || e.reason)); });
  };
  const SEED_RECORD = status => { try { if (!sessionStorage.getItem("__seeded")) { sessionStorage.setItem("__seeded", "1"); if (status) localStorage.setItem("strange-bloom.training", JSON.stringify({ v: 1, status, at: 1 })); else localStorage.removeItem("strange-bloom.training"); } } catch {} };
  // persistence failure: both web storages throw on access, as with blocked site data
  const BLOCK_STORAGE = () => { for (const k of ["localStorage", "sessionStorage"]) Object.defineProperty(window, k, { configurable: true, get() { throw new DOMException("storage blocked (QA)", "SecurityError"); } }); };
  const frames = (p, n = 3) => p.evaluate(n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
  const menuReady = p => p.waitForFunction(() => window.MENU_DEV && MENU_DEV.ready, null, { timeout: 60000, polling: 50 });
  const surveyReady = p => p.waitForFunction(() => MENU_DEV.entry.survey && MENU_DEV.entry.survey.state === "survey" && MENU_DEV.entry.state === "survey", null, { timeout: 180000, polling: 100 });
  const menuBack = p => p.waitForFunction(() => MENU_DEV.entry.state === "menu" && getComputedStyle(MENU_DEV.entry.black).display === "none", null, { timeout: 20000, polling: 50 });
  const waitRun = p => p.waitForFunction(() => window.BLOOM_RUN && (BLOOM_RUN.started || BLOOM_RUN.failed), null, { timeout: 120000, polling: 50 });
  const waitProd = async p => { await p.waitForFunction(() => BLOOM.planetView && BLOOM.planetView.instance && BLOOM.planetView.instance.renderer.info().frames > 0 && BLOOM.decisionRooms.instance && BLOOM.runReport.instance, null, { timeout: 30000, polling: 100 }); await frames(p, 3); };
  const waitLift = p => p.waitForFunction(() => !BLOOM.expeditionArrival || !BLOOM.expeditionArrival.instance || BLOOM.expeditionArrival.stats.state === "lifted" || BLOOM.expeditionArrival.stats.state === "failed", null, { timeout: 20000, polling: 50 });
  const coached = p => p.waitForFunction(() => window.BLOOM_TRAINING_UI && BLOOM_TRAINING_UI.guide && BLOOM_TRAINING_UI.guide.mounted && BLOOM_TRAINING_UI.guide.coach.stats.places > 0, null, { timeout: 30000 });
  const settledDR = p => p.waitForFunction(() => !BLOOM.decisionRooms.instance.state().transitioning, null, { timeout: 8000, polling: 20 });
  const openRoom = async (p, name) => { const inRoom = await p.evaluate(() => !!BLOOM.decisionRooms.instance.state().room); await p.click(inRoom ? `.dr .dr-room:not([hidden]) .rn[data-go="${name}"]` : `.pv-tool[data-tool="${name}"]`); await settledDR(p); await frames(p, 2); };
  const reportOpen = p => p.waitForFunction(() => BLOOM.runReport.instance.state().open && !BLOOM.runReport.instance.state().busy, null, { timeout: 15000, polling: 30 });
  const win = p => p.evaluate(() => { const s = BLOOM_API.sim; BLOOM_API.advance(30); s.won = true; s.onWin(s.coverage()); }); // a QA shortcut into the run's own win path (the report reads the real state)
  const runMenu = async (p, act) => { if (await p.evaluate(() => document.getElementById("pvMenu").hidden)) await p.click("#pvMenuBtn"); await p.click(`#pvMenu [data-act="${act}"]`); };
  // the survey: sample truthfulness (an Incoming slot exactly where no world is shown yet) until the sector is in
  const surveySamples = async p => { const out = []; for (let k = 0; k < 1800; k++) {
    const s = await p.evaluate(() => { const E = MENU_DEV.entry, s = E.survey; if (!s) return null; return { state: s.state, entry: E.state, incoming: s.slots.filter(x => x.classList.contains("is-incoming")).length, shown: s.cells.filter(Boolean).length,
      both: s.slots.filter((x, i) => x.classList.contains("is-incoming") && s.cells[i]).length }; });
    if (s) out.push(s); if (s && s.state === "survey" && s.entry === "survey") break; await sleep(100); } return out; };
  const CELLS = p => p.evaluate(() => { const s = MENU_DEV.entry.survey, cls = ["stable", "volatile", "extreme"];
    return { seed: s.sectorSeed, source: s.sectors.source, cells: s.cells.map((c, i) => c && { key: c.key, ok: c.authored || (c.validation.validated && c.planet.archetype.winnabilityChecked && c.planet.archetype.validatedLayers.join() === "1,2,3,4,5,6,7,8"), col: c.classId === cls[i % 3] }),
      tasks: s.sectors.stats.workerTasks, renders: s.host.renders, canvases: document.querySelectorAll(".planet-sphere-canvas").length, gl: !!(s.host.three && s.host.three.getContext && s.host.three.getContext()) }; });
  const PICK = (p, i) => p.evaluate(i => { const s = MENU_DEV.entry.survey, c = s.cells[i]; return { key: c.key, name: c.name, classId: c.classId, fingerprint: c.fingerprint, planet: JSON.stringify(c.planet), selected: s.selected, inFocus: s.focusSlot.contains(s.globes[i]), state: s.state }; }, i);
  const GAME = p => p.evaluate(() => { const A = BLOOM_RUN_UI.adapter, R = BLOOM_RUN, X = BLOOM.expedition, T = X.transportOf(window), st = R.expedition ? X.load(R.expedition.token, T) : null;
    let ss = null; try { ss = sessionStorage === T; } catch { ss = "blocked"; }
    return { url: location.href, path: location.pathname, id: R.planet.id, name: R.planet.name, planet: JSON.stringify(R.planet), counters: __XP.calls, threw: __XP.threw, forbid: __XP.forbid,
      stored: st && st.ok ? { planet: JSON.stringify(st.payload.planet), fingerprint: st.payload.fingerprint, returnTo: st.payload.returnTo } : null, transport: T && (T.kind || "sessionStorage"), transportIsSession: ss,
      nameHas: R.expedition ? window.name.startsWith(X.NAME_PREFIX) && window.name.includes(R.expedition.token) : null, handoffs: X.list(T).length,
      ui18: document.documentElement.classList.contains("ui18"), pv: document.querySelectorAll(".pv").length, title: document.title, menu: A.runMenu().items.map(a => [a.id, a.href || null]),
      xp: R.expedition ? { token: R.expedition.token, returnTo: R.expedition.returnTo, chooseHref: R.expedition.chooseHref, playAgainHref: R.expedition.playAgainHref } : null, unhandled: window.__UNHANDLED }; });
  const TF = p => p.evaluate(() => { const DR = BLOOM.decisionRooms.instance, T = DR.rooms.terraform, src = T.source(), gl = T.globe(), A = BLOOM_RUN_UI.adapter, s = A.surface();
    const snap = BLOOM.terraformGlobe.snapshot(src.planet, src.sky || s.sky), expect = BLOOM.surface.surfaceSignature(snap, { render: src.render, extra: { diag: null, width: 480 } });
    return { kind: T.globeKind(), planetId: src.planet.id, sphereSig: gl && gl.view ? gl.view.state().textureSignature : null, expect, canvas: !!document.querySelector("#dr .planet-sphere-canvas, .dr .planet-sphere-canvas"), sky: s.sky }; });
  const ROOMS = async p => {   // the four production rooms + a real Adapt and Spread purchase + Terraform's real sphere before / after a purchase
    await p.evaluate(() => { const A = BLOOM_RUN_UI.adapter; A.actions.play(); const r = A.regions().find(x => !x.isOrigin); A.actions.selectRegion(r.index); BLOOM_API.addBiomass(5000); });
    const rooms = [], bought = {};
    for (const name of ["region", "adapt", "spread"]) { await openRoom(p, name); rooms.push(await p.evaluate(() => BLOOM.decisionRooms.instance.state().room));
      if (name !== "region") bought[name] = await p.evaluate(board => { const A = BLOOM_RUN_UI.adapter, items = A.upgrades().find(b => b.board === board).items, u = items.find(x => x.canBuy);
        if (!u) return null; const before = A.upgrades().find(b => b.board === board).items.find(x => x.id === u.id).tier; A.actions.buy(u.id);
        const after = A.upgrades().find(b => b.board === board).items.find(x => x.id === u.id).tier; return { id: u.id, before, after }; }, name === "adapt" ? "Adapt" : "Spread"); }
    await openRoom(p, "terraform"); await p.waitForFunction(() => BLOOM.decisionRooms.instance.rooms.terraform.globeKind() !== "pending", null, { timeout: 30000, polling: 50 }); await frames(p, 4);
    rooms.push(await p.evaluate(() => BLOOM.decisionRooms.instance.state().room));
    const t1 = await TF(p);
    await p.evaluate(() => { const A = BLOOM_RUN_UI.adapter, items = A.upgrades().find(b => b.board === "Terraform").items, u = items.find(x => x.canBuy) || items[0]; A.actions.buy(u.id); }); await frames(p, 5);
    const t2 = await TF(p);
    await p.evaluate(() => { const A = BLOOM_RUN_UI.adapter; A.actions.setSpeed(2); A.actions.setSpeed(1); const u = A.upgrades().find(b => b.board === "Adapt").items[0]; A.actions.preview(u.id); A.actions.clearPreview && A.actions.clearPreview();
      const o = A.regions().find(x => x.isOrigin); A.actions.setGrowthFocus(o.index, "roots"); }); await frames(p, 2);
    const ev = await p.evaluate(() => { const o = {}; for (const e of window.__EV) o[e.type] = e.keys; return o; });
    const an = await p.evaluate(() => { const a = [...document.querySelectorAll("[data-tutorial]")].filter(e => e.offsetParent !== null || e.closest(".pv")).map(e => e.dataset.tutorial); return { n: a.length, dup: a.filter((x, i) => a.indexOf(x) !== i) }; });
    await p.click(".dr .dr-room:not([hidden]) .rb.back, .dr .dr-room:not([hidden]) .rb.resume"); await settledDR(p);
    return { rooms, bought, t1, t2, ev, an }; };
  const shapesOk = o => Object.entries(o).every(([t, k]) => J(k) === J(DETAIL_KEYS[t]));
  let SHOTS = false; const shot = async (p, name) => { if (EVIDENCE && SHOTS) await p.screenshot({ path: path.join(EVD, name) }); };   // Chromium only: 8 stills
  const errsAll = [], unhandledAll = [], externalAll = [];

  for (const bname of BROWSERS) {
    if (!pw) break; if (!pw[bname]) { info(`browser ${bname}`, "not a Playwright browser: skipped"); continue; }
    // P9 · NO special browser flag: the browsers are launched exactly as Playwright's defaults (no args, no prefs)
    const launchOptions = {}; let browser; try { browser = await pw[bname].launch(launchOptions); } catch (e) { check(false, `[${bname}] browser launches`, e.message.split("\n")[0]); continue; }
    const B = `[${bname}]`, CH = bname === "chromium"; SHOTS = CH; console.log(`# ${bname}`); PROOF.launchOptions[bname] = launchOptions; PROOF.browsers[bname] = { version: browser.version(), flows: [] };
    const ctx = async ({ vw = 1280, vh = 800, record = undefined, rm = false, offline = false, blockStorage = false } = {}) => {
      const c = await browser.newContext({ viewport: { width: vw, height: vh }, reducedMotion: rm ? "reduce" : "no-preference" });
      await c.addInitScript(INIT); if (record !== undefined) await c.addInitScript(SEED_RECORD, record); if (blockStorage) await c.addInitScript(BLOCK_STORAGE);
      c.reqs = []; c.blocked = [];
      if (offline) { await c.setOffline(true); await c.route(/^https?:\/\//, r => { c.blocked.push(r.request().url()); return r.abort(); }); }
      c.on("request", r => c.reqs.push(r.url())); return c; };
    const watch = (p, label) => { p.errs = []; p.on("pageerror", e => { p.errs.push(e.message); errsAll.push(`${B} ${label}: ${e.message}`); }); p.on("console", m => { if (m.type() === "error") { p.errs.push(m.text()); errsAll.push(`${B} ${label}: ${m.text()}`); } }); p.on("dialog", d => d.accept()); return p; };
    const collectUnhandled = async p => { try { const u = await p.evaluate(() => window.__UNHANDLED || []); if (u.length) unhandledAll.push(...u.map(x => `${B} ${x}`)); } catch {} };
    const nonLocal = (c, okPrefix) => c.reqs.filter(u => !(okPrefix ? u.startsWith(okPrefix) : false) && !/^(file|data|blob|about):/.test(u));
    const F = PROOF.file[bname] = {};
    try {
      // ============================================================ FILE:// — the double-clicked index.html, offline, a first-time player
      { const c = await ctx({ record: null, offline: true }), p = watch(await c.newPage(), "file");
        // every resource each page references (its scripts, stylesheets, images and CSS url() backgrounds, as resolved URLs): Firefox's Playwright emits no
        // request event for file: URLs and neither browser records file: in Resource Timing, so this DOM inventory is the positive list in both
        const res = [], grab = async () => { try { res.push(...await p.evaluate(() => [location.href, ...[...document.scripts].map(s => s.src).filter(Boolean), ...[...document.querySelectorAll("link[href]")].map(l => l.href),
          ...[...document.images].map(i => i.currentSrc || i.src).filter(Boolean), ...[...document.querySelectorAll("*")].map(e => getComputedStyle(e).backgroundImage).filter(b => b && b !== "none")
            .flatMap(b => [...b.matchAll(/url\("?([^")]+)"?\)/g)].map(m => m[1]))])); } catch {} };
        await p.goto(FINDEX); await menuReady(p); await sleep(400);
        const boot = await p.evaluate(() => ({ url: location.href, protocol: location.protocol, state: BLOOM_TITLE_BOOT.state, served: BLOOM_TITLE_BOOT.served, portable: BLOOM_TITLE_BOOT.portable, scripts: BLOOM_TITLE_BOOT.scripts.length,
          bundle: !!window.BLOOM_PORTABLE, loaded: window.BLOOM_PORTABLE ? BLOOM_PORTABLE.loaded() : [], notice: !!document.getElementById("needsServer") || /needs to be opened through a web server/.test(document.body.innerText), failed: !!document.getElementById("bootFailed"),
          title: document.title, h1: document.getElementById("mm-title").textContent.replace(/\s+/g, " ").trim(), items: [...document.querySelectorAll(".mm-item")].map(b => b.dataset.act), tag: MENU_DEV.entry.menu.trainingRecommended,
          prefetch: MENU_DEV.entry.prefetch ? MENU_DEV.entry.prefetch.progress : null }));
        F.boot = { ...boot, url: boot.url.replace(FROOT, "<repo>") };   // (no local path in the evidence)
        check(boot.protocol === "file:" && boot.state === "mounted" && !boot.served && boot.portable && boot.scripts === 15 && boot.bundle && boot.loaded.includes("resources/main-menu/main-menu-page.js") && !boot.notice && !boot.failed
          && boot.title === "Strange Bloom — Unknown Soils" && /^Strange Bloom$/i.test(boot.h1) && J(boot.items) === J(["begin", "training", "settings", "credits"]) && boot.tag && boot.prefetch && boot.prefetch.total === 9,
          `${B} P6 · P7 · P8 · ${FINDEX.replace(FROOT, "<repo>")} over file:// boots the REAL title (no HTTP-required notice, no failure notice): the classic engine scripts, the module seam and the portable runtime's page composer; STRANGE BLOOM, BEGIN EXPEDITION · TRAINING (Recommended) · SETTINGS · CREDITS; the first sector already prefetching`,
          J({ state: boot.state, loaded: boot.loaded, prefetch: boot.prefetch }));
        await shot(p, `01-file-title.png`);
        // P9 · default security really applies: the source modules themselves cannot be imported from file:// in Chromium (the bundle is what runs)
        const probePage = await c.newPage(); await probePage.goto(FINDEX + "?bg=1");   // a separate, unwatched page: the refused loads below are expected console errors
        const sec = await probePage.evaluate(async () => { const u = new URL("resources/main-menu/main-menu-data.js", location.href).href; let mod = "loaded", worker = "started";
          try { await import(u); } catch (e) { mod = "refused"; }
          try { const w = new Worker(new URL("resources/destination-survey/survey-worker.js", location.href).href, { type: "module" }); await new Promise(r => { w.onerror = e => { e.preventDefault(); worker = "error"; r(); }; setTimeout(r, 800); }); w.terminate(); } catch (e) { worker = "refused"; }
          return { mod, worker }; });
        await probePage.close(); F.defaultSecurity = sec;
        check(J(PROOF.launchOptions[bname]) === "{}" && (CH ? sec.mod === "refused" && sec.worker !== "started" : true),
          `${B} P9 · no special browser flag: launched with Playwright's defaults only (no --allow-file-access-from-files, no --disable-web-security, no prefs)${CH ? " — and Chromium's default file:// security is in force: importing a source module or starting a module worker from this page is refused, so the game above runs from the portable runtime" : " (Firefox's own default file:// policy)"}`, J(sec));
        // P11 · the twelve paintings are local files
        const pt = await p.evaluate(async () => { const m = MENU_DEV.entry.menu, out = [];
          for (let i = 0; i < 12; i++) { const img = new Image(), src = m._url(i); img.src = src; try { await img.decode(); out.push([src.replace(/^.*\/resources\//, "resources/"), src.slice(0, 5), img.naturalWidth, img.naturalHeight]); } catch { out.push([src, "fail"]); } }
          return out; });
        check(pt.length === 12 && pt.every(x => x[1] === "file:" && x[2] === 1280 && x[3] === 720), `${B} P11 · all twelve menu paintings resolve to local files (file:///…/resources/main-menu/backgrounds/menu-01…12.jpg) and decode at 1280 × 720`, pt.map(x => x[0].split("/").pop()).join(" "));
        // Settings (a real motion change, persisted) + P44 keyboard on the title
        await p.focus('.mm-item[data-act="begin"]'); const kbd = [];
        for (const key of ["ArrowDown", "ArrowDown", "ArrowDown", "ArrowDown", "End", "Home"]) { await p.keyboard.press(key); kbd.push(await p.evaluate(() => document.activeElement && document.activeElement.dataset.act)); }
        await p.keyboard.press("ArrowDown"); await p.keyboard.press("ArrowDown"); await p.keyboard.press("Enter"); await sleep(200);
        const st1 = await p.evaluate(() => ({ open: document.querySelector('[data-dialog="settings"]').open, focusIn: !!document.activeElement.closest('[data-dialog="settings"]') }));
        await p.click('[data-dialog="settings"] input[value="reduced"]'); await sleep(100);
        const st2 = await p.evaluate(() => ({ stored: localStorage.getItem("strange-bloom.settings"), rm: MENU_DEV.entry.reducedMotion }));
        await p.click('[data-dialog="settings"] input[value="system"]'); await p.keyboard.press("Escape"); await sleep(150);
        const st3 = await p.evaluate(() => ({ open: document.querySelector('[data-dialog="settings"]').open, focus: document.activeElement.dataset.act }));
        check(J(kbd) === J(["training", "settings", "credits", "begin", "credits", "begin"]) && st1.open && st1.focusIn && /"motion":"reduced"/.test(st2.stored) && st2.rm === true && !st3.open && st3.focus === "settings",
          `${B} P44 · Settings works over file:// · keyboard: arrows / Home / End walk the title menu, Enter opens SETTINGS (focus inside); its motion choice persists in this browser's file storage and applies at once; Escape closes it back to SETTINGS`, J({ kbd, stored: st2.stored }));
        // the first-run recommendation (Enter on BEGIN) → Go to Expedition → the survey; P14 · P15 truthful Incoming, nine validated worlds
        await p.focus('.mm-item[data-act="begin"]'); await p.keyboard.press("Enter"); await sleep(300);
        const dlg = await p.evaluate(() => { const d = document.querySelector('[data-dialog="recommend"]'); return { open: d.open, btns: [...d.querySelectorAll(".mm-btn")].map(b => b.textContent) }; });
        await p.click('[data-act="recommend-expedition"]');
        const samples = await surveySamples(p), cells = await CELLS(p);
        const last = samples[samples.length - 1], truthful = samples.every(s => s.both === 0) && last && last.incoming === 0 && last.shown === 9;   // an Incoming slot never holds a world; none left at the end
        F.firstSurvey = { samples: samples.length, incomingSeen: Math.max(0, ...samples.map(s => s.incoming)), cells: cells.cells.map(x => x && x.key), source: cells.source, workersStarted: await p.evaluate(() => BLOOM_PORTABLE.stats.workersStarted), workerUrl: await p.evaluate(() => BLOOM_PORTABLE.stats.workerUrl), workerTasks: cells.tasks };
        check(dlg.open && J(dlg.btns) === J(["Go to Expedition", "Start Training (~5 min)"]) && cells.cells.length === 9 && cells.cells.every(x => x && x.ok && x.col) && new Set(cells.cells.map(x => x.key)).size === 9 && truthful
          && cells.source === "worker" && F.firstSurvey.workersStarted > 0 && /^blob:/.test(F.firstSurvey.workerUrl || "") && cells.tasks > 0,
          `${B} P14 · P15 · the first BEGIN EXPEDITION offers the one first-run recommendation (Go to Expedition · Start Training); the Destination Survey opens over file:// with nine distinct, fully validated worlds (layers 1–8, one class per column) built by the SAME survey worker, started from the portable runtime as blob: workers; an empty slot reads "Incoming" and never one that holds a world, none at the end (${samples.length} samples, up to ${F.firstSurvey.incomingSeen} incoming at once)`,
          J({ truthful, dialog: dlg.open, source: cells.source, workers: F.firstSurvey.workersStarted, url: (F.firstSurvey.workerUrl || "").slice(0, 10), tasks: cells.tasks, keys: F.firstSurvey.cells }));
        await shot(p, `02-file-survey.png`); await grab();
        // P16 · Scan New Sector
        const seed0 = cells.seed; await p.click('.ds-btn.scan'); await p.waitForFunction(s => MENU_DEV.entry.survey.sectorSeed !== s && MENU_DEV.entry.survey.state === "survey", seed0, { timeout: 180000, polling: 100 });
        const cells2 = await CELLS(p);
        check(cells2.seed !== seed0 && cells2.cells.every(x => x && x.ok && x.col) && new Set(cells2.cells.map(x => x.key)).size === 9 && !cells2.cells.some(x => cells.cells.some(y => y.key === x.key)),
          `${B} P16 · Scan New Sector over file:// brings the next sector (seed ${seed0} → ${cells2.seed}): nine new validated worlds`, cells2.cells.map(x => x.key).join(" "));
        // P17 · the real PlanetSphereView: one WebGL renderer drawing nine globes; candidate focus; a drag spins the focused globe
        await p.click('.ds-cand[data-index="4"]'); await p.waitForFunction(() => MENU_DEV.entry.survey.state === "focus", null, { timeout: 20000, polling: 50 }); await frames(p, 4);
        const pick = await PICK(p, 4);
        const box = await p.evaluate(() => { const r = MENU_DEV.entry.survey.focusSlot.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, yaw: MENU_DEV.entry.survey.views[4].getYaw(), renders: MENU_DEV.entry.survey.host.renders }; });
        await p.mouse.move(box.x, box.y); await p.mouse.down(); for (let k = 1; k <= 8; k++) await p.mouse.move(box.x + k * 18, box.y); await p.mouse.up(); await sleep(300);
        const after = await p.evaluate(() => ({ yaw: MENU_DEV.entry.survey.views[4].getYaw(), renders: MENU_DEV.entry.survey.host.renders, ctor: MENU_DEV.entry.survey.views[4].constructor.name }));
        check(cells2.gl && cells2.canvases >= 1 && cells2.renders > 0 && pick.selected === 4 && pick.inFocus && pick.state === "focus" && Math.abs(after.yaw - box.yaw) > 0.2 && after.renders > box.renders,
          `${B} P17 · candidate focus · sphere interaction: the survey's real PlanetSphereView globes draw through one WebGL renderer; the chosen world's own globe moves into the focus slot and a mouse drag spins it (yaw ${box.yaw.toFixed(2)} → ${after.yaw.toFixed(2)} rad)`, J({ key: pick.key, renders: after.renders }));
        await shot(p, `03-file-selected-globe.png`);
        // dramatic departure → the run page through the file-safe handoff
        await p.click(".ds-btn.go"); await p.waitForFunction(() => document.querySelector(".atx") && document.querySelector(".atx").dataset.atxPreset === "dramatic", null, { timeout: 10000, polling: 20 });
        const atx = await p.evaluate(() => ({ preset: document.querySelector(".atx").dataset.atxPreset, rm: document.querySelector(".atx").classList.contains("rm") }));
        await p.waitForURL(u => /\/demos\/demo-run\.html$/.test(new URL(u).pathname) && /^\?play=1&expedition=x[0-9a-f]{20}$/.test(new URL(u).search), { timeout: 30000 });
        await waitRun(p); await waitProd(p); await waitLift(p); await frames(p, 3);
        const g = await GAME(p), fpRun = S.planetFingerprint(JSON.parse(g.planet));
        F.run = { url: g.url.replace(FROOT, "<repo>"), token: g.xp.token, planet: g.id, name: g.name, fingerprint: fpRun, transport: g.transport, counters: g.counters };
        check(atx.preset === "dramatic" && !atx.rm && g.transport === "file" && g.nameHas && g.stored && g.stored.planet === pick.planet && g.planet === pick.planet && g.stored.returnTo === FINDEX && g.xp.returnTo === FINDEX,
          `${B} P12 (expedition) · P18 · the DRAMATIC departure, then the exact selected candidate survives the FILE-SAFE handoff: the envelope travels in the tab's window.name (file transport), the address carries only the token, and the run page's planet JSON equals the survey's detail.planet character for character; returnTo is the file title`, J({ token: g.xp.token, transport: g.transport }));
        check(fpRun === pick.fingerprint && g.stored.fingerprint === pick.fingerprint && g.counters.createSim === 1 && GEN_NAMES.every(n => g.counters[n] === 0) && !g.threw.length && g.forbid,
          `${B} P19 · P20 · no regeneration on the file:// expedition page (every generator / search / attempt function guarded to throw, none called; one createSim) and the fingerprint is preserved: survey == stored == gameplay (${fpRun})`, J(g.counters));
        check(g.ui18 && g.pv === 1 && g.title === `Strange Bloom — ${pick.name}` && J(g.menu.map(a => a[0])) === J(["playAgain", "choosePlanet", "mainMenu"]),
          `${B} P21 · the production gameplay UI over file:// (Planet View, ui18), titled with the chosen world; run menu Play again · Choose another planet · Main menu`, g.name);
        await shot(p, `04-file-gameplay.png`);
        // P22 · P23 · the four rooms, real Adapt / Spread purchases, Terraform's real sphere
        const R1 = await ROOMS(p); await grab();
        F.rooms = { rooms: R1.rooms, bought: R1.bought, terraform: [R1.t1.kind, R1.t2.kind] };
        check(J(R1.rooms) === J(["region", "adapt", "spread", "terraform"]) && R1.bought.adapt && R1.bought.adapt.after === R1.bought.adapt.before + 1 && R1.bought.spread && R1.bought.spread.after === R1.bought.spread.before + 1,
          `${B} P22 · Region Inspect, Adapt, Spread and Terraform all open over file://; a real Adapt purchase (${R1.bought.adapt && R1.bought.adapt.id}) and a real Spread purchase (${R1.bought.spread && R1.bought.spread.id}) each raise their tier through the run's own buy`, J(R1.bought));
        check(R1.t1.kind === "sphere" && R1.t1.canvas && R1.t1.planetId === g.id && R1.t1.sphereSig === R1.t1.expect && R1.t2.sphereSig === R1.t2.expect && J(R1.t2.sky) !== J(R1.t1.sky),
          `${B} P23 · Terraform over file:// uses the REAL PlanetSphereView (from the portable runtime — never the flat fallback): it shows THIS planet and its texture equals the canonical surface under the current sky, before and after a real Terraform purchase changed the sky`, J({ kind: R1.t1.kind, sky: [R1.t1.sky, R1.t2.sky] }));
        check(shapesOk(R1.ev) && ["run-ready", "play-pause", "speed", "region-select", "upgrade-preview", "upgrade-purchase", "growth-focus"].every(t => R1.ev[t]) && !R1.an.dup.length && R1.an.n > 20,
          `${B} P38 · P39 (runtime) · over file:// every bloom:* event that fired has its frozen detail shape (${Object.keys(R1.ev).length} kinds) and every production data-tutorial anchor is present and unique (${R1.an.n})`, J({ dup: R1.an.dup }));
        // P24 · the report
        await win(p); await reportOpen(p); await frames(p, 3);
        const rep = await p.evaluate(() => { const A = BLOOM_RUN_UI.adapter, d = A.report(); return { kind: d.kind, name: d.identity.planetName, xp: d.identity.expedition && d.identity.expedition.fingerprint, acts: A.reportActions().map(a => [a.id, a.href || null]), shown: BLOOM.runReport.instance.state().actions }; });
        const H = Object.fromEntries(rep.acts); F.returnUrls = { playAgain: H.playAgain, choosePlanet: H.choosePlanet && H.choosePlanet.replace(FROOT, "<repo>"), mainMenu: H.mainMenu && H.mainMenu.replace(FROOT, "<repo>") };
        check(rep.kind === "win" && rep.name === pick.name && rep.xp === pick.fingerprint && J(rep.shown) === J(["keepPlaying", "playAgain", "choosePlanet", "mainMenu"]) && H.playAgain === `demo-run.html?play=1&expedition=${g.xp.token}` && H.choosePlanet === FINDEX + "?begin=1" && H.mainMenu === FINDEX,
          `${B} P24 · the production Bloom Report over file:// names the chosen world and carries its fingerprint; Keep playing · Play again (same token) · Choose another planet (the file title + begin=1) · Main menu (the file title)`, J(F.returnUrls));
        await shot(p, `05-file-report.png`);
        // P25 · Play Again: the same exact planet
        await Promise.all([p.waitForEvent("load", { timeout: 30000 }), p.click('#rr [data-act="playAgain"]')]); await waitRun(p); await waitProd(p); await waitLift(p);
        const g2 = await GAME(p), own2 = await p.evaluate(() => ({ owned: BLOOM_API.sim.traits.filter(u => BLOOM_API.sim.ownedTier(u) > 0).length, won: BLOOM_API.sim.won }));
        check(g2.xp.token === g.xp.token && g2.planet === pick.planet && S.planetFingerprint(JSON.parse(g2.planet)) === pick.fingerprint && own2.owned === 0 && !own2.won && g2.counters.createSim === 1 && GEN_NAMES.every(n => g2.counters[n] === 0),
          `${B} P25 · Play Again over file:// replays the SAME exact planet (same token, planet JSON, fingerprint) on a fresh simulation (nothing owned, not won), no generator`, g2.xp.token);
        // P27 · Main menu → the file title
        await Promise.all([p.waitForURL(u => u.href === FINDEX, { timeout: 30000 }), runMenu(p, "mainMenu")]); await menuReady(p); await sleep(300);
        const mm = await p.evaluate(() => ({ url: location.href, state: MENU_DEV.entry.state, title: document.title, prefetch: MENU_DEV.entry.prefetch && MENU_DEV.entry.prefetch.progress }));
        check(mm.url === FINDEX && mm.state === "menu" && mm.title === "Strange Bloom — Unknown Soils" && mm.prefetch && mm.prefetch.total === 9, `${B} P27 · Main menu from the run returns to the file:// title (a fresh prefetch starts)`, mm.url.replace(FROOT, "<repo>"));
        // a second expedition (another world; the transport stays bounded) → win → P26 · Choose another planet
        await p.click('.mm-item[data-act="begin"]'); await surveyReady(p);
        const prompts = await p.evaluate(() => MENU_DEV.entry.stats.prompts);
        await p.click('.ds-cand[data-index="0"]'); await p.waitForFunction(() => MENU_DEV.entry.survey.state === "focus", null, { timeout: 20000, polling: 50 });
        const pick2 = await PICK(p, 0); await p.click(".ds-btn.go");
        await p.waitForURL(u => /\/demos\/demo-run\.html$/.test(new URL(u).pathname), { timeout: 30000 }); await waitRun(p); await waitProd(p); await waitLift(p);
        const g3 = await GAME(p);
        await win(p); await reportOpen(p);
        await Promise.all([p.waitForURL(u => u.href.startsWith(FINDEX), { timeout: 30000 }), p.click('#rr [data-act="choosePlanet"]')]); await menuReady(p); await surveyReady(p);
        const ca = await p.evaluate(() => ({ url: location.href, state: MENU_DEV.entry.state, events: MENU_DEV.events.map(e => e.type), cells: MENU_DEV.entry.survey.cells.filter(Boolean).length, nameLen: window.name.length }));
        F.secondExpedition = { key: pick2.key, token: g3.xp.token, handoffsKept: g3.handoffs, windowNameBytes: ca.nameLen };
        check(!prompts && g3.planet === pick2.planet && g3.xp.token !== g.xp.token && g3.handoffs === 2 && GEN_NAMES.every(n => g3.counters[n] === 0) && ca.url === FINDEX && ca.state === "survey" && ca.events.includes("auto-begin") && ca.cells === 9,
          `${B} P26 · a second file:// expedition (another exact world, a new token; the transport keeps at most two handoffs, ${(ca.nameLen / 1024).toFixed(0)} KiB in window.name) → its report's Choose another planet lands on the file title with begin=1 and enters the Destination Survey at once (begin=1 consumed)`, J(F.secondExpedition));
        // P12 · TRAINING over file:// (the complete guided training is guided-training-check --file, run below)
        await p.keyboard.press("Escape"); await menuBack(p).catch(() => {});
        if ((await p.evaluate(() => MENU_DEV.entry.state)) !== "menu") { await p.goto(FINDEX); await menuReady(p); }
        await Promise.all([p.waitForURL(u => /demo-run\.html$/.test(new URL(u).pathname) && new URL(u).searchParams.get("training") === "1", { timeout: 20000 }), p.click('.mm-item[data-act="training"]')]);
        await waitRun(p); await coached(p); await sleep(300);
        const t = await p.evaluate(() => ({ url: location.href, ret: BLOOM_RUN.training.returnTo, steps: BLOOM_TRAINING_UI.guide.director.steps.map(s => s.id), planet: BLOOM_RUN.planet.id, winAt: BLOOM_RUN_UI.adapter.hud().winPct,
          paused: !BLOOM_API.state().running, lesson: BLOOM_TRAINING_UI.guide.director.index + 1, coachCss: [...document.styleSheets].some(s => s.href && /training-coach\.css$/.test(s.href)), menu: BLOOM_RUN_UI.adapter.runMenu().items.map(a => a.id) }));
        await shot(p, `06-file-training.png`); await grab();
        await p.click(".tc-card .tc-skip"); await sleep(250);
        const sk = await p.evaluate(() => { const d = document.querySelector("[data-training-skip]"); return d ? { title: d.querySelector("h2").textContent, btns: [...d.querySelectorAll("button")].map(b => b.textContent) } : null; });
        await p.click('[data-skip="keep"]'); await sleep(150);
        await Promise.all([p.waitForURL(u => u.href === FINDEX, { timeout: 20000 }), runMenu(p, "mainMenu")]); await menuReady(p);
        const back = await p.evaluate(() => ({ url: location.href, rec: JSON.parse(localStorage.getItem("strange-bloom.training")) }));
        check(new URL(t.url).searchParams.get("return") === FINDEX && t.ret === FINDEX && J(t.steps) === J(LESSONS) && t.planet === "training_grounds" && t.winAt === 65 && t.paused && t.lesson === 1 && t.coachCss
          && sk && sk.title === "Skip training?" && J(sk.btns) === J(["Keep training", "Skip training"]) && back.url === FINDEX && back.rec && back.rec.status === "skipped",
          `${B} P12 · P13 · TRAINING over file:// opens the guided training on Training Grounds (65 % goal), paused, the coach mounted with its own stylesheet and the thirteen locked lessons; Skip opens the production confirmation (Keep training keeps it); Main menu returns to the file title (the earlier "skipped" kept)`, J({ lesson: t.lesson, winAt: t.winAt, ret: t.ret.replace(FROOT, "<repo>") }));
        await grab(); const ext = nonLocal(c, null), resOut = res.filter(u => !/^(file|data|blob):/.test(u) || (u.startsWith("file:") && !u.startsWith(FROOT)));
        const want = ["/dist/portable/strange-bloom.portable.js", "/resources/main-menu/backgrounds/menu-", "/resources/main-menu/main-menu.css", "/resources/training/training-coach.css", "/resources/bloom-sim.js"].filter(w => !res.some(u => u.includes(w)));
        check(!ext.length && !c.blocked.length && c.reqs.every(u => /^(file|data|blob):/.test(u)) && c.reqs.filter(u => u.startsWith("file:")).every(u => u.startsWith(FROOT)) && new Set(res).size > 30 && !resOut.length && !want.length,
          `${B} P10 · P36 (runtime) · OFFLINE (network disabled, every http(s) request routed to a block that logged none): every resource the file:// session's pages reference (${new Set(res).size} distinct scripts, stylesheets, images and backgrounds from the pages themselves${c.reqs.length ? `; ${c.reqs.length} request events, all file:` : "; Playwright reports no request events for file: in this browser"}) is file: inside the game folder, data: or blob: — the portable runtime, the paintings, the stylesheets, the engine; no http(s) request was even attempted`,
          [...ext, ...resOut].slice(0, 3).join(" | ") || (want.length ? "missing " + want.join(", ") : `${new Set(res).size} local resources`));
        F.requests = { requestEvents: c.reqs.length, referencedDistinct: new Set(res).size, referencedFile: new Set(res.filter(u => u.startsWith("file:"))).size, blockedHttp: c.blocked.length };
        await collectUnhandled(p); PROOF.browsers[bname].flows.push("file:// full player flow"); await c.close(); }

      // ============================================================ P28 · storage blocked over file:// (private mode, blocked site data)
      { const c = await ctx({ offline: true, blockStorage: true }), p = watch(await c.newPage(), "file-nostorage");
        await p.goto(FINDEX); await menuReady(p); await sleep(300);
        const s0 = await p.evaluate(() => { let ls = "ok"; try { void localStorage; } catch (e) { ls = e.name; } return { ls, state: BLOOM_TITLE_BOOT.state }; });
        await p.click('.mm-item[data-act="settings"]'); await sleep(150); await p.click('[data-dialog="settings"] input[value="reduced"]'); await sleep(100); await p.keyboard.press("Escape"); await sleep(150);
        await p.click('.mm-item[data-act="begin"]'); await sleep(300); await p.click('[data-act="recommend-expedition"]'); await surveyReady(p);
        await p.click('.ds-cand[data-index="2"]'); await p.waitForFunction(() => MENU_DEV.entry.survey.state === "focus", null, { timeout: 20000, polling: 50 });
        const pick = await PICK(p, 2); await p.click(".ds-btn.go");
        await p.waitForURL(u => /\/demos\/demo-run\.html$/.test(new URL(u).pathname), { timeout: 30000 }); await waitRun(p); await waitProd(p); await waitLift(p);
        const g = await GAME(p);
        await Promise.all([p.waitForURL(u => u.href === FINDEX, { timeout: 20000 }), runMenu(p, "mainMenu")]); await menuReady(p);
        await Promise.all([p.waitForURL(u => new URL(u).searchParams.get("training") === "1", { timeout: 20000 }), p.click('.mm-item[data-act="training"]')]); await waitRun(p); await coached(p);
        await p.click(".tc-card .tc-skip"); await sleep(200); await Promise.all([p.waitForURL(u => u.href === FINDEX, { timeout: 20000 }), p.click('[data-skip="skip"]')]); await menuReady(p);
        const s1 = await p.evaluate(() => ({ state: MENU_DEV.entry.state, tag: MENU_DEV.entry.menu.trainingRecommended }));
        F.noStorage = { localStorage: s0.ls, transport: g.transport, transportIsSession: g.transportIsSession, exact: g.planet === pick.planet };
        check(s0.ls === "SecurityError" && s0.state === "mounted" && g.planet === pick.planet && g.transport === "file" && g.transportIsSession === "blocked" && GEN_NAMES.every(n => g.counters[n] === 0) && s1.state === "menu" && !p.errs.length,
          `${B} P28 · persistence failure degrades safely: with localStorage AND sessionStorage throwing, the file:// title still boots, Settings still applies (nothing saved), the exact selected planet still reaches gameplay (window.name alone), and TRAINING → Skip still returns to the title (nothing recorded, still Recommended: ${s1.tag}); no page error`, J(F.noStorage));
        await collectUnhandled(p); PROOF.browsers[bname].flows.push("file:// storage blocked"); await c.close(); }

      // ============================================================ P43 · reduced motion over file://
      { const c = await ctx({ record: "completed", offline: true, rm: true }), p = watch(await c.newPage(), "file-rm");
        await p.goto(FINDEX); await menuReady(p); const rm0 = await p.evaluate(() => MENU_DEV.entry.reducedMotion === true || (MENU_DEV.entry.reducedMotion === null && matchMedia("(prefers-reduced-motion: reduce)").matches));
        await p.click('.mm-item[data-act="begin"]'); await surveyReady(p);
        await p.click('.ds-cand[data-index="1"]'); await p.waitForFunction(() => MENU_DEV.entry.survey.state === "focus", null, { timeout: 20000, polling: 50 }); await p.click(".ds-btn.go");
        await p.waitForFunction(() => document.querySelector(".atx"), null, { timeout: 10000, polling: 20 }); const rmA = await p.evaluate(() => document.querySelector(".atx").classList.contains("rm"));
        await p.waitForURL(u => /\/demos\/demo-run\.html$/.test(new URL(u).pathname), { timeout: 30000 }); await waitRun(p); await waitProd(p); await waitLift(p);
        const rmX = await p.evaluate(() => BLOOM.expeditionArrival.stats.reducedMotion);
        check(rm0 === true && rmA && rmX === true && !p.errs.length, `${B} P43 · reduced motion (the OS setting) over file://: the title, the DRAMATIC descent (its reduced variant) and the run's arrival all honour it`, J({ title: rm0, descent: rmA, arrival: rmX }));
        await collectUnhandled(p); PROOF.browsers[bname].flows.push("file:// reduced motion"); await c.close(); }

      // ============================================================ HTTP — the served source path at / (P29 · P31)
      { const c = await ctx({ record: "completed" }), p = watch(await c.newPage(), "http-root"); const lf = LOG_ROOT.length;
        await p.goto(HOME); await menuReady(p);
        const b = await p.evaluate(() => ({ served: BLOOM_TITLE_BOOT.served, portable: BLOOM_TITLE_BOOT.portable, scripts: BLOOM_TITLE_BOOT.scripts.length, bundle: !!window.BLOOM_PORTABLE, seam: !!(window.BLOOM && BLOOM.modules), factory: null }));
        await p.click('.mm-item[data-act="begin"]'); await surveyReady(p);
        const cells = await CELLS(p);
        await p.click('.ds-cand[data-index="5"]'); await p.waitForFunction(() => MENU_DEV.entry.survey.state === "focus", null, { timeout: 20000, polling: 50 });
        const pick = await PICK(p, 5); await p.click(".ds-btn.go");
        await p.waitForURL(u => new URL(u).pathname === "/demos/demo-run.html", { timeout: 30000 }); await waitRun(p); await waitProd(p); await waitLift(p);
        const g = await GAME(p); await openRoom(p, "terraform"); await p.waitForFunction(() => BLOOM.decisionRooms.instance.rooms.terraform.globeKind() !== "pending", null, { timeout: 30000, polling: 50 });
        const tf = await TF(p), seen = LOG_ROOT.slice(lf).map(r => r[0]);
        check(b.served && !b.portable && b.scripts === 14 && !b.bundle && !b.seam && cells.source === "worker" && seen.includes("/resources/destination-survey/survey-worker.js") && seen.includes("/resources/main-menu/main-menu-page.js") && !seen.some(u => u.startsWith("/dist/"))
          && g.transport === "sessionStorage" && g.transportIsSession === true && g.planet === pick.planet && GEN_NAMES.every(n => g.counters[n] === 0) && tf.kind === "sphere" && seen.includes("/resources/planet-sphere/planet-sphere-view.js") && !p.errs.length,
          `${B} P29 · P31 · the served root (http://…/) is the unchanged source path: the title imports the source composer (14 classic scripts, no seam, no portable runtime — dist/ is never requested), the survey runs its MODULE workers (survey-worker.js), the handoff is sessionStorage, the exact planet arrives, and Terraform imports the source PlanetSphereView`, J({ requests: seen.length, transport: g.transport }));
        PROOF.http[bname] = { requests: seen.length, distRequested: seen.some(u => u.startsWith("/dist/")), source: cells.source, transport: g.transport };
        await collectUnhandled(p); PROOF.browsers[bname].flows.push("http root"); await c.close(); }

      // ============================================================ HTTP under the Pages subpath /bloom/ (P30 · P32 · P33 · P34)
      { const c = await ctx({ record: "completed" }), p = watch(await c.newPage(), "pages"); const lf = LOG_PAGES.length;
        await p.goto(PHOME); await menuReady(p); await sleep(300);
        const tb = await p.evaluate(() => ({ url: location.href, title: document.title, bg: MENU_DEV.entry.menu._url(MENU_DEV.entry.menu.background.index), page: MENU_DEV.page }));
        await shot(p, `07-http-bloom-title.png`);
        await p.click('.mm-item[data-act="begin"]'); await surveyReady(p); const cells = await CELLS(p);
        await p.click('.ds-cand[data-index="3"]'); await p.waitForFunction(() => MENU_DEV.entry.survey.state === "focus", null, { timeout: 20000, polling: 50 });
        const pick = await PICK(p, 3); await p.click(".ds-btn.go");
        await p.waitForURL(u => new URL(u).pathname === "/bloom/demos/demo-run.html", { timeout: 30000 }); await waitRun(p); await waitProd(p); await waitLift(p);
        const g = await GAME(p); await shot(p, `08-http-bloom-gameplay.png`);
        await openRoom(p, "terraform"); await p.waitForFunction(() => BLOOM.decisionRooms.instance.rooms.terraform.globeKind() !== "pending", null, { timeout: 30000, polling: 50 }); const tf = await TF(p);
        await p.click(".dr .dr-room:not([hidden]) .rb.back, .dr .dr-room:not([hidden]) .rb.resume"); await settledDR(p);
        await win(p); await reportOpen(p);
        const acts = Object.fromEntries(await p.evaluate(() => BLOOM_RUN_UI.adapter.reportActions().map(a => [a.id, a.href || null])));
        await Promise.all([p.waitForEvent("load", { timeout: 30000 }), p.click('#rr [data-act="playAgain"]')]); await waitRun(p); await waitProd(p); await waitLift(p);
        const g2 = await GAME(p);
        await Promise.all([p.waitForURL(u => new URL(u).pathname === "/bloom/" && new URL(u).searchParams.get("begin") === "1", { timeout: 30000 }), runMenu(p, "choosePlanet")]); await menuReady(p); await surveyReady(p);
        const ch = await p.evaluate(() => ({ url: location.href, state: MENU_DEV.entry.state }));
        await p.keyboard.press("Escape"); await menuBack(p).catch(() => {});
        if ((await p.evaluate(() => MENU_DEV.entry.state)) !== "menu") { await p.goto(PHOME); await menuReady(p); }
        await Promise.all([p.waitForURL(u => new URL(u).pathname === "/bloom/demos/demo-run.html" && new URL(u).searchParams.get("training") === "1", { timeout: 20000 }), p.click('.mm-item[data-act="training"]')]);
        await waitRun(p); await coached(p);
        const tr = await p.evaluate(() => ({ url: location.href, ret: BLOOM_RUN.training.returnTo, steps: BLOOM_TRAINING_UI.guide.director.steps.length, css: [...document.styleSheets].some(s => s.href && /\/bloom\/resources\/training\/training-coach\.css$/.test(s.href)) }));
        await Promise.all([p.waitForURL(u => u.href === PHOME, { timeout: 20000 }), runMenu(p, "mainMenu")]); await menuReady(p);
        const tm = await p.evaluate(() => location.href);
        const req = LOG_PAGES.slice(lf), outside = req.filter(r => r[2] === "outside"), notOk = req.filter(r => r[1] !== 200 && r[1] !== 301);
        const redirect = await new Promise(res => http.get(PO + "/bloom", r => { res({ status: r.statusCode, location: r.headers.location }); r.resume(); }));
        PROOF.pages[bname] = { title: tb.url.replace(PO, "<pages>"), painting: tb.bg.replace(PO, "<pages>"), run: g.url.replace(PO, "<pages>"), returns: { playAgain: acts.playAgain, choosePlanet: acts.choosePlanet && acts.choosePlanet.replace(PO, "<pages>"), mainMenu: acts.mainMenu && acts.mainMenu.replace(PO, "<pages>") },
          training: tr.url.replace(PO, "<pages>"), trainingReturn: tr.ret.replace(PO, "<pages>"), requests: req.length, outside: outside.length, workerRequests: req.filter(r => /survey-worker\.js$/.test(r[0])).length };
        check(tb.url === PHOME && tb.title === "Strange Bloom — Unknown Soils" && tb.bg.startsWith(PHOME + "resources/main-menu/backgrounds/") && tb.page.title === PHOME && tb.page.run === PHOME + "demos/demo-run.html" && !outside.length && !notOk.length && redirect.status === 301 && redirect.location === "/bloom/",
          `${B} P30 · the Pages artifact under the project subpath: ${PHOME.replace(PO, "")} is the Strange Bloom title (painting, composer, run page all resolved inside /bloom/); ${req.length} requests, none outside /bloom/, none failed (/bloom → 301 /bloom/, as GitHub Pages)`, J({ painting: PROOF.pages[bname].painting, outside: outside.slice(0, 3) }));
        check(cells.source === "worker" && PROOF.pages[bname].workerRequests >= 1 && cells.cells.every(x => x && x.ok) && g.path === "/bloom/demos/demo-run.html" && g.transport === "sessionStorage" && g.planet === pick.planet && S.planetFingerprint(JSON.parse(g.planet)) === pick.fingerprint && GEN_NAMES.every(n => g.counters[n] === 0) && tf.kind === "sphere"
          && g2.planet === pick.planet && g2.xp.token === g.xp.token,
          `${B} P31 · P32 · under /bloom/ the survey's module workers load (/bloom/resources/destination-survey/survey-worker.js), nine validated worlds; the exact selected planet reaches /bloom/demos/demo-run.html (same JSON, fingerprint, no generator), the Terraform sphere loads, and Play Again keeps it`, J({ fp: pick.fingerprint, token: g.xp.token }));
        check(acts.playAgain === `demo-run.html?play=1&expedition=${g.xp.token}` && acts.choosePlanet === PHOME + "?begin=1" && acts.mainMenu === PHOME && new URL(ch.url).pathname === "/bloom/" && ch.state === "survey"
          && new URL(tr.url).searchParams.get("return") === PHOME && tr.ret === PHOME && tr.steps === 13 && tr.css && tm === PHOME,
          `${B} P33 · P34 · every production return is subpath-safe: the report's Play again (relative, same token) · Choose another planet (/bloom/?begin=1 → the survey) · Main menu (/bloom/); TRAINING opens /bloom/demos/demo-run.html?training=1&return=/bloom/ (13 lessons, the coach's stylesheet from /bloom/resources/) and its Main menu returns to /bloom/`, J(PROOF.pages[bname].returns));
        await collectUnhandled(p); PROOF.browsers[bname].flows.push("http /bloom/ subpath"); await c.close(); }

      // ============================================================ P39 · the anchor set: the same First Bloom run over file:// and http
      { const c = await ctx({ offline: false }), p = watch(await c.newPage(), "anchors");
        const anchorsOf = async u => { await p.goto(u); await waitRun(p); await waitProd(p); return p.evaluate(() => [...document.querySelectorAll("[data-tutorial]")].map(e => e.dataset.tutorial).sort()); };
        const af = await anchorsOf(FROOT + "/demos/demo-run.html?play=1"), ah = await anchorsOf(HOME + "demos/demo-run.html?play=1");
        check(af.length > 20 && J(af) === J(ah), `${B} P39 · the direct run page (First Bloom) carries the identical tutorial anchor set over file:// and over http (${af.length})`);
        await c.close(); }
    } catch (e) { check(false, `${B} browser flow completed without an exception`, (e && e.message || String(e)).split("\n")[0]); }
    PROOF.browsers[bname].errors = errsAll.filter(x => x.startsWith(B)).length;
    check(PROOF.browsers[bname].flows.length === 5, `${B} P${CH ? 45 : 46} · ${bname} ${browser.version()} ran every flow: ${PROOF.browsers[bname].flows.join(" · ")}`);
    await browser.close();
  }
  srvRoot.close(); srvPages.close(); fs.rmSync(SITE_DIR, { recursive: true, force: true });
  check(!errsAll.length, "P41 · no console error and no page error on any page (file://, http root, /bloom/; both browsers)", errsAll.slice(0, 4).join(" | "));
  check(!unhandledAll.length, "P42 · no unhandled promise rejection on any page", unhandledAll.slice(0, 4).join(" | "));

  // ================================================================ child: the complete guided training over file://
  if (SUITES) {
    const t1 = Date.now(), r = cp.spawnSync(process.execPath, [path.join(ROOT, "tools/guided-training-check.js"), "--file", "--browsers", BROWSERS.join(",")], { cwd: ROOT, env: process.env, encoding: "utf8", maxBuffer: 256 << 20, timeout: 1800000 });
    const out = (r.stdout || "") + (r.stderr || ""), m = out.match(/ALL (\d+) CHECKS PASS/), f = out.match(/(\d+) check\(s\) FAILED, (\d+) passed/);
    PROOF.children["guided-training-check --file"] = { exit: r.status, pass: m ? +m[1] : f ? +f[2] : 0, fail: f ? +f[1] : 0, seconds: Math.round((Date.now() - t1) / 1000) };
    check(r.status === 0 && !!m, `P12 · P13 (child) · guided-training-check --file: the COMPLETE guided training over file:// in ${BROWSERS.join(" + ")} — Recommended tag, the first-run recommendation, all 13 lessons by real input on Training Grounds (65 %), the scripted bubble, the Warm / Drought route, Skip confirmation, TRAINING COMPLETE, Begin Expedition, Restart, Main menu`,
      m ? `${m[1]} checks pass` : out.split("\n").filter(l => /^FAIL|Error/.test(l)).slice(0, 3).join(" | ") || `exit ${r.status}`);
  } else info("child suite", "--no-suites: guided-training-check --file not run here (run it on its own)");

  // ================================================================ proof
  if (EVIDENCE) {
    PROOF.checks = { pass: passes, fail: fails, results: RESULTS };
    fs.writeFileSync(path.join(EVD, "portable-proof.json"), JSON.stringify(PROOF, null, 1) + "\n");
    console.log(`INFO  evidence  — ${path.relative(ROOT, EVD)}: portable-proof.json + stills`);
  }
  console.log(fails ? `\n${fails} check(s) FAILED, ${passes} passed  (${((Date.now() - t0) / 1000).toFixed(1)} s)` : `\nALL ${passes} CHECKS PASS  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
