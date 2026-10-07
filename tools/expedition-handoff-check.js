// BLOOM — Exact expedition handoff checks (BLOOM-029F). The 29th regression suite.
//
//   NODE_PATH="$(npm root -g)" node tools/expedition-handoff-check.js [--browsers chromium,firefox] [--evidence]
//
// Node: the branch starts at the accepted 029E final candidate 3ab9933; the survey, its data / worker / pool, PlanetSphereView, the
// canonical surface, AtmosphereTransition, the engine, generator, validators, play / scenario modules, content, planets, the training
// layer, the menu and the production view / rooms / report are byte-identical; scope; the handoff module's contract (pack = detail.planet
// verbatim, the survey's provenance, the survey's render hints, the survey's own planetFingerprint carried, a transport checksum; verify /
// store / load / prune: version, malformed, planet, integrity, missing; session-bounded); toRun never generates (the generator, world
// search and attempt loop are stubbed to throw; a mutated provenance seed changes nothing of the played world; the sim built from the
// rehydrated planet ticks identically to one built from the survey's object); the run page's expedition boot resolves the handoff before
// the one createSim, never names a generator, keeps every bloom:* dispatch site and anchor of 3ab9933, and its expedition actions never
// link ui=legacy or the root launcher; the title page departs by pack → store → dispose → navigate with only the token in the address;
// the training branch of the run page is unchanged; the adapter stays api 1 with the 10 events plus one additive provenance read.
// Browser (a static server on 127.0.0.1; Chromium 1280×800, Firefox opt-in): Main Menu → prefetch → 3×3 survey (nine validated worlds,
// one class per column) → focus (same candidate, same live view) → Begin Expedition (the exact detail.planet) → the DRAMATIC transition →
// the handoff written at full cover, the survey and its workers disposed, navigation with the opaque token → gameplay: the handoff
// resolved before the single sim, generator / search counters zero (and stubbed to throw), every authoritative field identical, the
// survey's planetFingerprint == the gameplay fingerprint, focused-globe canonical texture == gameplay canonical surface (pixel hash) ==
// the live map's signature, the arrival cover up at run-ready and lifted only after the surface painted; the four rooms, the Terraform
// globe on the handed-off planet (identity kept after a purchase); the production report naming the world and its provenance, its
// expedition actions; Play again = the same token, fresh state, same fingerprint; refresh = same planet; Choose another planet → the
// title's survey; Main menu → the title with a fresh prefetch; missing / corrupt / unsupported / planetless / tampered / over-specified
// handoffs → the explicit failure state (no sim, no generation, no First Bloom, one way out); TRAINING and every direct URL unchanged;
// file:// standalone; three worlds of three classes (one from a scanned second sector) with zero authoritative differences; session
// storage bounded, nothing in localStorage; no external requests, console errors or unhandled rejections. --evidence writes
// docs/evidence/bloom-029f/ (stills + identity-proof.json). Exits 1 on any failure.
"use strict";
const path = require("path"), fs = require("fs"), http = require("http"), { execSync } = require("child_process");
const ROOT = path.resolve(__dirname, ".."), BASE_SHA = "3ab99337676e214c200b34cbbeeff844f67c7e8f";
const argv = process.argv, argOf = k => { const i = argv.indexOf(k); return i > 0 ? argv[i + 1] : null; };
const BROWSERS = (argOf("--browsers") || "chromium").split(","), EVIDENCE = argv.includes("--evidence");
const EVD = path.join(ROOT, "docs/evidence/bloom-029f");
const read = f => fs.readFileSync(path.join(ROOT, f), "utf8"), J = JSON.stringify, git = c => execSync("git " + c, { cwd: ROOT, encoding: "utf8" }).trim();
let fails = 0; const t0 = Date.now();
const check = (ok, name, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); if (!ok) fails++; };
const info = (name, detail) => console.log(`INFO  ${name}  — ${detail}`);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const strip = src => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");
const fnv = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(16).padStart(8, "0"); };
const EVTS = ["run-ready", "play-pause", "speed", "region-select", "upgrade-preview", "upgrade-purchase", "growth-focus", "local-upgrade", "bubble-collect", "win"];
const SHAPES = { "run-ready": "planetId,kind,training,running", "play-pause": "running", speed: "speed", "region-select": "index,id,name,previous,water,tile", "upgrade-preview": "id,board,name,available,gain,lose,better,worse,reachHostile",
  "upgrade-purchase": "id,board,name,cost,tier,biomass", "growth-focus": "index,id,name,focus,previous,changed", "local-upgrade": "index,id,name,upgrade,upgradeName,cost", "bubble-collect": "how,tile,index,id,name,value", win: "coverage,ticks,planetId,training" };
const GEN_NAMES = ["generateFromArchetype", "generatePlanet", "attemptPlanet", "searchWorld", "runSearch"];
const PROOF = { generatedAt: new Date().toISOString(), base: BASE_SHA, head: null, worlds: [], failures: [], storage: null };
const memStorage = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), get length() { return m.size; }, key: i => [...m.keys()][i] ?? null, _m: m }; };

(async () => {
  // ================================================================ Node
  console.log("# Node");
  const head = PROOF.head = git("rev-parse HEAD");
  check(git(`merge-base HEAD ${BASE_SHA}`) === BASE_SHA && git(`cat-file -t ${BASE_SHA}`) === "commit", "N1 · the branch starts from the accepted BLOOM-029E final candidate 3ab9933 (not origin/main)", `HEAD ${head.slice(0, 7)} · ${git(`rev-list --count ${BASE_SHA}..HEAD`)} commit(s) since 3ab9933`);
  // N2 · byte-identical protected files
  const PROTECTED = ["resources/destination-survey/destination-survey.js", "resources/destination-survey/survey-data.js", "resources/destination-survey/survey-worker.js", "resources/destination-survey/sector-pool.js", "resources/destination-survey/destination-survey.css",
    "resources/planet-sphere/planet-sphere-view.js", "resources/planet-sphere/planet-texture.js", "resources/planet-surface/planet-surface.js", "resources/atmosphere-transition/atmosphere-transition.js",
    "resources/bloom-sim.js", "resources/bloom-gen.js", "resources/bloom-validate.js", "resources/bloom-witness.js", "resources/bloom-archetype.js", "resources/bloom-scenario.js", "resources/bloom-play.js", "resources/bloom-play-worker.js",
    "content/config.js", "content/traits.js", "content/scenarios.js", "content/archetypes.js", "content/training.js", "planets/first_bloom.js", "planets/training_grounds.js",
    "resources/training/training-run.js", "resources/training/training-store.js", "resources/main-menu/main-menu.js", "resources/main-menu/main-menu-data.js", "resources/main-menu/main-menu.css", "resources/main-menu/expedition-entry.js", "resources/main-menu/black-fade.js",
    "resources/run-ui/planet-view.js", "resources/run-ui/planet-view.css", "resources/run-ui/decision-rooms.js", "resources/run-ui/decision-rooms.css", "resources/run-ui/run-report.js", "resources/run-ui/run-report.css", "resources/run-ui/gameplay-transition.js", "resources/run-ui/run-map-renderer.js", "resources/run-ui/plant-specimen.js", "resources/run-ui/terraform-globe.js",
    "index.html", "demos/destination-survey.html", "demos/expedition-descent.html", "demos/planet-sphere.html", "demos/planet-sphere-grid.html", "demos/atmosphere-transition.html", "GAME_BIBLE.md"];
  { const same = f => git(`rev-parse ${BASE_SHA}:${f}`) === git(`hash-object ${f}`);
    const diff = PROTECTED.filter(f => !same(f)), dirs = git(`diff --stat ${BASE_SHA} -- resources/destination-survey/ resources/planet-sphere/ resources/planet-surface/ resources/atmosphere-transition/ resources/training/ resources/main-menu/ planets/ demos/ui-mockups/`);
    PROOF.unchanged = { files: PROTECTED.length, differing: diff, surveyBlob: git("hash-object resources/destination-survey/destination-survey.js"), dirDiff: dirs || "(empty)" };
    check(!diff.length && !dirs, "N2 · byte-identical to 3ab9933: the Destination Survey (screen, data, worker, pool, css: generation, validation, grid, focus, dossier, selected identity, sphere choreography, DRAMATIC descent), PlanetSphereView + texture, the canonical surface, AtmosphereTransition, the engine, generator, validators, play / scenario modules, content, planets, the training layer, the menu + ExpeditionEntry + fade, the production view / rooms / report / bridge / map renderer / specimen / globe helper, root index.html, the standalone demo pages and the bible",
      diff.length ? "DIFFER: " + diff.join(", ") : `${PROTECTED.length} files + 8 directories · destination-survey.js blob ${PROOF.unchanged.surveyBlob.slice(0, 10)}`); }
  // N3 · scope
  { const changed = git(`diff --name-only ${BASE_SHA}`).split("\n").filter(Boolean).concat(git("ls-files --others --exclude-standard").split("\n").filter(Boolean));
    const allowed = p => p === "demos/demo-run.html" || p === "demos/main-menu.html" || p === "content/play.js" || p === "resources/run-ui/run-ui-adapter.js" || p.startsWith("resources/expedition/") || p.startsWith("tools/") || p.startsWith("docs/") || p === "README.md";
    const out = changed.filter(p => !allowed(p));
    check(!out.length && changed.includes("resources/expedition/expedition-handoff.js"), "N3 · scope: 029F adds resources/expedition/ and changes only the run page, the title page, content/play.js (action / failure copy), one additive adapter read, the suites, docs / evidence and README", `${changed.sort().join(", ")}${out.length ? " · OUTSIDE: " + out.join(", ") : ""}`); }

  // the production modules, as the run page loads them
  for (const f of ["content/config.js", "content/traits.js", "planets/first_bloom.js", "planets/training_grounds.js", "content/archetypes.js", "content/scenarios.js", "content/training.js", "content/play.js",
    "resources/bloom-sim.js", "resources/bloom-gen.js", "resources/bloom-validate.js", "resources/bloom-witness.js", "resources/bloom-archetype.js", "resources/bloom-scenario.js", "resources/bloom-play.js",
    "resources/expedition/expedition-handoff.js", "resources/run-ui/run-ui-adapter.js"]) require(path.join(ROOT, f));
  const { BLOOM, BLOOM_DATA: D } = globalThis, X = BLOOM.expedition;
  const S = await import(path.join(ROOT, "resources/destination-survey/survey-data.js"));
  const detailOf = (cand, sectorSeed = 77) => ({ planet: cand.planet, render: cand.render, dossier: cand.dossier, candidate: { key: cand.key, name: cand.name, authored: cand.authored, archetypeId: cand.archetypeId, seed: cand.seed, attempt: cand.attempt, classId: cand.classId, sectorSeed, validation: cand.validation } });
  const simHash = (planet, ticks = 300) => { const s = BLOOM.createSim(planet, D.config, D.traits, { rng: BLOOM.gen.mulberry32(5) }); s.biomass = 1e4; for (const id of ["cold", "humid", "seedOut"]) s.buy(id); let cov = 0; for (let t = 0; t < ticks; t++) cov = s.tick(); return `${cov.toFixed(6)}/${fnv(Array.from(s.state).join(","))}/${Math.round(s.biomass * 1000)}`; };

  // N4 · the handoff contract
  const cand = S.makeCandidate({ archetypeId: "ocean_archipelago", seed: 28 }), detail = detailOf(cand), token = X.newToken();
  { const env = X.pack(detail, { token, returnTo: "http://x/demos/main-menu.html", fingerprint: S.planetFingerprint(detail.planet), now: 1 });
    const rt = X.parse(X.serialize(env)).env;
    const ok1 = X.verify(env).ok && X.verify(rt).ok && X.isToken(token) && /^x[0-9a-f]{20}$/.test(token) && env.version === 1 && env.source === "destination-survey" && env.scenario === "eden"
      && J(env.planet) === J(detail.planet) && J(rt.planet) === J(detail.planet) && env.planet !== detail.planet && J(env.render) === J(cand.render) && J(env.candidate) === J(detail.candidate)
      && env.fingerprint === cand.fingerprint && env.fingerprint === S.planetFingerprint(rt.planet) && X.CANDIDATE_FIELDS.join() === "key,name,authored,archetypeId,seed,attempt,classId,sectorSeed,validation" && /^[0-9a-f]{16}$/.test(env.integrity) && rt.integrity === env.integrity;
    // refusals
    const bad = {}; const tweak = f => { const e = JSON.parse(J(env)); f(e); return X.verify(e).reason || "ok"; };
    bad.version = tweak(e => { e.version = 2; }); bad.token = tweak(e => { e.token = "nope"; }); bad.source = tweak(e => { e.source = "elsewhere"; });
    bad.tile = tweak(e => { e.planet.tilemap[5] = e.planet.tilemap[5] < 0 ? 0 : -1; }); bad.seed = tweak(e => { e.candidate.seed += 1; }); bad.render = tweak(e => { e.render = { ground: [1, 2, 3] }; });
    bad.noPlanet = tweak(e => { e.planet = null; e.integrity = X.integrity(e); }); bad.sections = tweak(e => { e.planet.sections = []; e.integrity = X.integrity(e); }); bad.grid = tweak(e => { e.planet.gridWidth = 0; e.integrity = X.integrity(e); });
    bad.tilemapLen = tweak(e => { e.planet.tilemap.push(0); e.integrity = X.integrity(e); }); bad.recomputed = tweak(e => { e.planet.tilemap[5] = e.planet.tilemap[5] < 0 ? 0 : -1; e.integrity = X.integrity(e); });
    const notObj = [null, 1, "x", [], {}].map(v => X.verify(v).reason);
    check(ok1 && bad.version === "version" && bad.token === "malformed" && bad.source === "malformed" && bad.tile === "integrity" && bad.seed === "integrity" && bad.render === "integrity" && bad.noPlanet === "planet" && bad.sections === "planet" && bad.grid === "planet" && bad.tilemapLen === "planet" && bad.recomputed === "ok" && notObj.every(r => r === "malformed"),
      "N4 · pack(): the envelope carries detail.planet VERBATIM (a plain copy, JSON-identical, not the same object), the survey's provenance fields in order, the survey's render hints and its own planetFingerprint (reused, not re-implemented), a 16-hex transport checksum; it survives serialize → parse; verify() refuses another version, a bad token / source, any edit of the planet / seed / render under the old checksum (integrity), and a planetless / sectionless / gridless / mis-sized planet (planet); non-envelopes are malformed",
      J({ bad, notObj, fp: env.fingerprint, integrity: env.integrity })); }
  // N5 · store / load / prune: session-bounded; failure reasons
  { const st = memStorage(), envs = [1, 2, 3].map(i => X.pack(detail, { token: X.newToken(), now: i }));
    const kept = envs.map(e => X.store(e, st)); const keys = [...st._m.keys()].filter(k => k.startsWith(X.KEY_PREFIX) && k !== X.INDEX_KEY);
    const l1 = X.load(envs[0].token, st), l2 = X.load(envs[1].token, st), l3 = X.load(envs[2].token, st);
    st.setItem(X.KEY_PREFIX + "x00000000000000000001", "{not json"); const lm = X.load("x00000000000000000001", st);
    const unknown = X.load(X.newToken(), st), noTok = X.load(null, st), noSt = X.load(envs[2].token, null), badTok = X.load("javascript:alert(1)", st);
    const ver = JSON.parse(J(envs[2])); ver.version = 99; st.setItem(X.KEY_PREFIX + ver.token, J(ver)); const lv = X.load(ver.token, st);
    const swapped = JSON.parse(J(envs[1])); st.setItem(X.KEY_PREFIX + envs[2].token, J(swapped)); const ls = X.load(envs[2].token, st); // a payload stored under another token
    let threw = null; try { X.store({ version: 1 }, st); } catch (e) { threw = e.message; }
    check(X.MAX_HANDOFFS === 2 && kept[2].length === 2 && keys.length === 2 && !l1.ok && l1.reason === "missing" && l2.ok && l3.ok && J(l3.payload) === J(envs[2]) && X.list(st).join() === [envs[1].token, envs[2].token].join()
      && lm.reason === "malformed" && unknown.reason === "missing" && noTok.reason === "missing" && noSt.reason === "missing" && badTok.reason === "missing" && lv.reason === "version" && ls.reason === "integrity" && /invalid handoff/.test(threw)
      && X.runUrl("x1234567890abcdef1234") === "demo-run.html?play=1&expedition=x1234567890abcdef1234" && X.tokenOf("?play=1&expedition=x1234567890abcdef1234&z=1") === "x1234567890abcdef1234" && X.tokenOf("?play=1") === null
      && X.withBegin("http://h/demos/main-menu.html?bg=1#x") === "http://h/demos/main-menu.html?bg=1&begin=1",
      "N5 · store() keeps the newest MAX_HANDOFFS (2) handoffs and prunes the oldest (its load → missing); the index lists what is there; load() reports missing (unknown / no token / no storage / a non-token), malformed (not JSON), version (99), integrity (a payload stored under another token); store() refuses an invalid envelope; runUrl / tokenOf / withBegin",
      J({ kept: kept.map(k => k.length), keys: keys.length, l1: l1.reason, lm: lm.reason, lv: lv.reason, ls: ls.reason })); }
  // N6 · toRun never generates; a mutated provenance seed changes nothing; the rehydrated planet plays identically
  { const env = X.pack(detail, { token, fingerprint: cand.fingerprint }), rt = X.parse(X.serialize(env)).env;
    const calls = {}; const stub = (holder, name) => { const raw = holder[name]; calls[name] = 0; holder[name] = function () { calls[name]++; throw new Error("029F guard: " + name + " called"); }; return () => { holder[name] = raw; }; };
    const restore = [stub(BLOOM, "generateFromArchetype"), stub(BLOOM, "generatePlanet"), stub(BLOOM.archetype, "attemptPlanet"), stub(BLOOM.play, "searchWorld"), stub(BLOOM.play, "runSearch")];
    let run = null, runMut = null, err = null;
    try { run = X.toRun(rt, { BLOOM_DATA: D });
      const mut = JSON.parse(J(rt)); mut.candidate.seed = (mut.candidate.seed + 4242) >>> 0; mut.candidate.attempt = 7; mut.integrity = X.integrity(mut); runMut = X.toRun(mut, { BLOOM_DATA: D }); }
    catch (e) { err = e.message; }
    restore.forEach(f => f());
    const A = D.archetypes.find(a => a.id === "ocean_archipelago");
    const ok = run && !err && run.planet === rt.planet && J(run.planet) === J(detail.planet) && run.kind === "procedural" && run.play === true && run.scenario === null && run.archetype === A && run.seed === 28 && J(run.render) === J(A.render || null)
      && run.expedition.token === token && run.expedition.candidateKey === "ocean_archipelago:28" && run.expedition.fingerprint === cand.fingerprint && run.expedition.seed === 28 && run.expedition.attempt === cand.attempt
      && run.summary.expedition === true && run.summary.planetId === detail.planet.id && run.summary.publicSeed === 28 && run.summary.scenarioId === "eden" && J(run.summary.validatedLayers) === J([1, 2, 3, 4, 5, 6, 7, 8])
      && runMut && J(runMut.planet) === J(detail.planet) && S.planetFingerprint(runMut.planet) === cand.fingerprint && runMut.seed === ((28 + 4242) >>> 0) && Object.values(calls).every(n => n === 0);
    const h0 = simHash(detail.planet), h1 = simHash(run.planet), h2 = simHash(runMut.planet);
    const fb = S.makeCandidate({ authored: "first_bloom" }), fbRun = X.toRun(X.pack(detailOf(fb), { token: X.newToken() }), { BLOOM_DATA: D });
    check(ok && h0 === h1 && h1 === h2 && fbRun.kind === "authored" && fbRun.archetype === null && fbRun.seed === null && J(fbRun.planet) === J(D.planets.first_bloom) && fbRun.expedition.authored === true,
      "N6 · toRun(): with the generator, generatePlanet, attemptPlanet, searchWorld and runSearch stubbed to THROW, the expedition run is built — run.planet IS the rehydrated payload planet (JSON-identical to the survey's), archetype = the static content object by id, seed / attempt = provenance, Eden, play; a copy whose provenance seed and attempt were changed yields the very same world (same fingerprint); a sim on the rehydrated planet ticks identically (300 ticks, same purchases) to one on the survey's object and to the mutated-seed copy; an authored candidate becomes an authored run",
      `generator calls ${J(calls)} · sim hashes ${h0 === h1 && h1 === h2 ? "identical" : "DIFFER"} · ${err || ""}`); }
  // N7 · the run page's expedition boot
  { const run = read("demos/demo-run.html"), code = strip(run);
    const boot = (code.match(/function expeditionBoot\(q\)\{[\s\S]*?\n\}\n/) || [""])[0], entry = (code.match(/\{ const q=new URLSearchParams\(location\.search\), play=q\.get\("play"\)==="1";[\s\S]*?startRun\(run\); \} \}/) || [""])[0];
    const noGen = boot && !GEN_NAMES.some(n => boot.includes(n)) && !/harnessRun|playBoot|first_bloom|BLOOM_DATA\.planets/.test(boot);
    const order = boot.indexOf("XA.cover()") > 0 && boot.indexOf("XA.cover()") < boot.indexOf("X.load(") && boot.indexOf("X.load(") < boot.indexOf("X.toRun(") && boot.indexOf("X.toRun(") < boot.indexOf("startRun(run)") && boot.indexOf("startRun(run)") < boot.indexOf("cover.lift()");
    const failPath = /if\(!res\.ok\)\{[\s\S]*?window\.BLOOM_RUN=\{kind:"expedition", failed:true[\s\S]*?cover\.fail\(\{[\s\S]*?href:"main-menu\.html"[\s\S]*?return; \}/.test(boot) && (boot.match(/startRun\(/g) || []).length === 1 && boot.indexOf("return; }") < boot.indexOf("startRun(run)");
    const precedence = /if\(q\.get\("expedition"\)!==null\) \(window\.BLOOM&&BLOOM\.expedition&&[^\n]*\)\?expeditionBoot\(q\):startRun\(\{kind:"missing"\}\);\n\s*else if\(play&&q\.get\("archetype"\)!==null[^\n]*\) playBoot\(q\);\n\s*else \{ const run=harnessRun\(\);/.test(entry);
    const combined = /\["archetype","seed","scenario","planet","training","candidates"\]\.filter\(k=>q\.get\(k\)!==null\)/.test(boot) && /reason:"link"/.test(boot);
    const scripts = /<script src="\.\.\/resources\/expedition\/expedition-handoff\.js"><\/script>\n<script src="\.\.\/resources\/expedition\/expedition-arrival\.js"><\/script>/.test(run) && run.indexOf("expedition-handoff.js") > run.indexOf("bloom-play.js") && run.indexOf("expedition-handoff.js") < run.indexOf("run-ui-adapter.js");
    const oneSim = (code.match(/BLOOM\.createSim\(/g) || []).length === 1 && /const sim=BLOOM\.createSim\(BLOOM_RUN\.planet,/.test(code);
    const acts = (code.match(/if\(XP\) return \[[\s\S]*?\];/) || [""])[0];
    const actsOk = acts && /id:"playAgain"[^\n]*href:XP\.playAgainHref, primary:true/.test(acts) && /id:"choosePlanet"[^\n]*href:XP\.chooseHref/.test(acts) && /id:"mainMenu"[^\n]*href:XP\.returnTo/.test(acts) && !/index\.html|ui=legacy|ui=18|newWorld|changeScenario|avoid=/.test(acts);
    const render = /const RENDER=XP\?\(BLOOM_RUN\.render\|\|null\):\(BLOOM_RUN\.kind==="procedural"&&BLOOM_RUN\.archetype\.render\)\|\|null;/.test(code);
    const ident = /expedition:XP\?\{ token:XP\.token, source:XP\.source, candidateKey:XP\.candidateKey, sectorSeed:XP\.sectorSeed, classId:XP\.classId, authored:XP\.authored, archetypeId:XP\.archetypeId, seed:XP\.seed, attempt:XP\.attempt, fingerprint:XP\.fingerprint, validation:XP\.validation \}:null/.test(code);
    const safeReturn = /BLOOM\.play\.safeReturn\(payload\.returnTo, location\.href, "main-menu\.html"\)/.test(boot) && /playAgainHref=X\.runUrl\(payload\.token\)/.test(boot) && /chooseHref=X\.withBegin\(returnTo\)/.test(boot);
    check(noGen && order && failPath && precedence && combined && scripts && oneSim && actsOk && render && ident && safeReturn,
      "N7 · run page: expedition= takes precedence over the play / harness boots (and never falls through to them: without the handoff modules it is the engine-missing state); expeditionBoot puts the arrival cover up first, then load → toRun → the ONE startRun (the page's single createSim site, from BLOOM_RUN.planet) → lift; it never names a generator, search, attempt loop, harnessRun, playBoot or First Bloom; a failed load sets BLOOM_RUN.failed, shows the explicit failure state with a Main menu way out and returns before any run; an expedition link carrying archetype / seed / scenario / planet / training / candidates is refused; the two expedition scripts load after bloom-play and before the adapter; the expedition actions are Play again (same token, primary) · Choose another planet (the title + begin=1) · Main menu (the validated return URL) with no root-launcher, ui=legacy, new-world or scenario link; RENDER is the handoff's exact render hints; the report identity carries the expedition provenance; returnTo goes through BLOOM.play.safeReturn",
      J({ noGen, order, failPath, precedence, combined, scripts, oneSim, actsOk, render, ident, safeReturn })); }
  // N8 · the title page's departure; session-only transport
  { const page = read("demos/main-menu.html"), code = strip(page), hand = read("resources/expedition/expedition-handoff.js"), arr = read("resources/expedition/expedition-arrival.js");
    const dep = (code.match(/async function departToGameplay\(detail, rec\) \{[\s\S]*?\n\}/) || [""])[0];
    const order = dep && dep.indexOf("X.pack(detail") > 0 && dep.indexOf("X.pack(detail") < dep.indexOf("X.store(env") && dep.indexOf("X.store(env") < dep.indexOf("detail.survey.dispose()") && dep.indexOf("detail.survey.dispose()") < dep.indexOf("location.assign(href)");
    const exact = /fingerprint: planetFingerprint\(detail\.planet\)/.test(dep) && /JSON\.stringify\(env\.planet\) !== JSON\.stringify\(detail\.planet\)/.test(dep) && /X\.runUrl\(env\.token\)/.test(dep) && !GEN_NAMES.some(n => dep.includes(n)) && /X\.storageOf\(window\)/.test(dep);
    const covered = /async onCovered\(detail, info\) \{[\s\S]*?await departToGameplay\(detail, rec\);/.test(code) && !/mountDestination|drawPlanetTexture|destMap|development harness/.test(code);
    const sessionOnly = !/localStorage/.test(strip(hand)) && /sessionStorage/.test(strip(hand)) && !/localStorage\.setItem|localStorage\[/.test(strip(arr)) && !/localStorage/.test(dep) && /sessionStorage/.test(strip(hand).match(/function storageOf[\s\S]*?\n  \}/)[0]);
    const begin = /q\.get\("begin"\) === "1"/.test(code) && /u\.searchParams\.delete\("begin"\)/.test(code) && /entry\.beginExpedition\(\)/.test(code) && /e\.persisted && entry\.state === "departed"\) location\.reload\(\)/.test(code);
    const training = /trainingQuery\(\{ returnTo: thisPage\(\) \}\)/.test(code) && /trainingHref/.test(code);
    const handoffScript = /<script src="\.\.\/resources\/expedition\/expedition-handoff\.js"><\/script>/.test(page);
    check(order && exact && covered && sessionOnly && begin && training && handoffScript,
      "N8 · title page: the DRAMATIC descent's onCovered → departToGameplay: pack (detail.planet, the survey's own planetFingerprint, the packaged planet re-checked JSON-identical) → store (sessionStorage) → survey.dispose() (renderer, views, workers) → location.assign(demo-run.html?play=1&expedition=<token>); no generator, no development target left; the transport module never names localStorage (session only; the arrival module reads only the Settings choice); ?begin=1 enters the survey and is dropped from the address; a title restored from the back-forward cache after a departure reloads; TRAINING still goes through trainingQuery",
      J({ order, exact, covered, sessionOnly, begin, training, handoffScript })); }
  // N9 · copy and production wording
  { const E = D.play.expedition, DEV_COPY = /ui=18|BLOOM-0\d\d|arrives in|development view|temporary shell|migration|playtest harness|engineering shell|milestone|regenerat/i, EMOJI = /\p{Extended_Pictographic}/u;
    const strings = [E.playAgain, E.playAgainNote, E.choosePlanet, E.choosePlanetNote, E.mainMenu, E.mainMenuNote, ...Object.values(E.failure)];
    const literals = src => [...strip(src).matchAll(/(["'`])((?:\\.|(?!\1)[^\\])*)\1/g)].map(m => m[2]);
    const arrBad = literals(read("resources/expedition/expedition-arrival.js")).filter(s => (DEV_COPY.test(s) && !/docs\//.test(s)) || EMOJI.test(s));
    check(strings.every(s => typeof s === "string" && s.length > 3 && !DEV_COPY.test(s) && !EMOJI.test(s)) && ["missing", "link", "malformed", "version", "planet", "integrity", "note", "title", "mainMenu"].every(k => typeof E.failure[k] === "string") && !arrBad.length && !/stack|Error:/.test(J(E)),
      "N9 · the expedition copy lives in content/play.js (three actions with notes; a failure title, one body per reason — missing / link / malformed / version / planet / integrity — a note that nothing was substituted, the Main menu label); no developer wording, no emoji, no stack-trace wording in it or in the arrival module's strings", `${strings.length} strings`); }
  // N10 · the training branch and the ten dispatch sites / detail keys / anchors are those of 3ab9933; the adapter's only addition
  { const runBase = git(`show ${BASE_SHA}:demos/demo-run.html`), runAt = read("demos/demo-run.html");
    const sites = s => EVTS.map(t => [t, (s.match(new RegExp(`emit\\("${t}"`, "g")) || []).length]), keysOf = s => EVTS.map(t => { const m = [...s.matchAll(new RegExp(`emit\\("${t}",\\s*\\{([^}]*)\\}`, "g"))].map(x => x[1].replace(/\s+/g, "")); return [t, m.join(" | ")]; });
    const anchors = s => [...new Set([...s.matchAll(/data-tutorial="([^"]+)"/g)].map(m => m[1]))].sort();
    const trainBlock = s => (s.match(/if\(BLOOM_RUN\.training\)\{[\s\S]*?document\.head\.appendChild\(m\); \}/) || [""])[0], harness = s => (s.match(/function harnessRun\(\)\{[\s\S]*?\n\}\nfunction startRun/) || [""])[0], play = s => (s.match(/function playBoot\(q\)\{[\s\S]*?\n\}\n/) || [""])[0];
    const same = J(sites(runBase)) === J(sites(runAt)) && J(keysOf(runBase)) === J(keysOf(runAt)) && J(anchors(runBase)) === J(anchors(runAt)) && trainBlock(runBase) && trainBlock(runBase) === trainBlock(runAt) && harness(runBase) && harness(runBase) === harness(runAt) && play(runBase) && play(runBase) === play(runAt);
    const RU = BLOOM.runUI, adDiff = git(`diff ${BASE_SHA} -- resources/run-ui/run-ui-adapter.js`).split("\n").filter(l => /^[+-][^+-]/.test(l));
    const adOk = RU.API_VERSION === 1 && RU.EVENTS.length === 10 && J(RU.EVENTS) === J(EVTS) && adDiff.length === 2 && adDiff.every(l => l.startsWith("+") && /expedition/.test(l));
    const trainingFiles = ["resources/training/training-run.js", "resources/training/training-store.js", "content/training.js", "planets/training_grounds.js"].every(f => git(`rev-parse ${BASE_SHA}:${f}`) === git(`hash-object ${f}`));
    check(same && adOk && trainingFiles, "N10 · the run page keeps every bloom:* dispatch site with the same detail keys, the same data-tutorial anchor set, the identical training branch, harnessRun() and playBoot() as 3ab9933 (direct / developer / training boots untouched); the training layer, data and world are byte-identical; the adapter stays api 1 with the 10 events and its whole diff is the one additive `expedition` provenance read in run()",
      `anchors ${anchors(runAt).length} · adapter diff lines ${adDiff.length}`); }

  // ================================================================ browser
  let pw = null; try { pw = require("playwright"); } catch { check(false, "Playwright available (NODE_PATH=\"$(npm root -g)\")", "require('playwright') failed"); }
  const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".json": "application/json", ".svg": "image/svg+xml" };
  const server = http.createServer((req, res) => { const u = decodeURIComponent(new URL(req.url, "http://x").pathname), f = path.join(ROOT, u);
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream", "cache-control": "no-store" }); fs.createReadStream(f).pipe(res); });
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  const ORIGIN = `http://127.0.0.1:${server.address().port}`, RUN = ORIGIN + "/demos/demo-run.html", MENU = ORIGIN + "/demos/main-menu.html", FILE = "file://" + encodeURI(path.join(ROOT, "demos/demo-run.html"));
  if (EVIDENCE) fs.mkdirSync(EVD, { recursive: true });
  // in every page: generator / search / attempt-loop / createSim counters on window.BLOOM (the production scripts assign them later, so the
  // global is an accessor that wraps each function as it arrives; on an expedition page every world-making function THROWS), the bloom:* log,
  // unhandled rejections, the arrival cover sampled at bloom:run-ready, every sessionStorage write of a handoff recorded WITH the transition's
  // phase / veil opacity / survey state (kept in sessionStorage so it survives the navigation), and the survey / pool / renderer state at pagehide
  const INIT = () => {
    const XP = window.__XP = { calls: { generateFromArchetype: 0, generatePlanet: 0, attemptPlanet: 0, searchWorld: 0, runSearch: 0, createSim: 0 }, forbid: /[?&]expedition=/.test(location.search), threw: [] };
    const wrap = (holder, name, forbidable) => { const d = Object.getOwnPropertyDescriptor(holder, name); if (d && d.get && d.get.__xp) return; let raw = d ? d.value : undefined;
      const mk = fn => fn && typeof fn === "function" ? function (...a) { XP.calls[name]++; if (forbidable && XP.forbid) { XP.threw.push(name); throw new Error("029F guard: " + name + " on an expedition page"); } return fn.apply(this, a); } : fn;
      let cur = mk(raw); const get = () => cur; get.__xp = true; Object.defineProperty(holder, name, { configurable: true, enumerable: true, get, set(v) { raw = v; cur = mk(v); } }); };
    const guard = obj => { if (!obj || typeof obj !== "object") return; wrap(obj, "generateFromArchetype", true); wrap(obj, "generatePlanet", true); wrap(obj, "createSim", false);
      for (const sub of ["play", "archetype"]) { const d = Object.getOwnPropertyDescriptor(obj, sub); if (d && d.get && d.get.__xp) continue; let o = d ? d.value : undefined; const g = v => { if (v && typeof v === "object") { if (sub === "play") { wrap(v, "searchWorld", true); wrap(v, "runSearch", true); } else wrap(v, "attemptPlanet", true); } return v; };
        o = g(o); const get = () => o; get.__xp = true; Object.defineProperty(obj, sub, { configurable: true, enumerable: true, get, set(v) { o = g(v); } }); } };
    let B = window.BLOOM; guard(B); Object.defineProperty(window, "BLOOM", { configurable: true, get: () => B, set(v) { B = v; guard(v); } });
    window.__EV = []; for (const t of ["run-ready", "play-pause", "speed", "region-select", "upgrade-preview", "upgrade-purchase", "growth-focus", "local-upgrade", "bubble-collect", "win"]) document.addEventListener("bloom:" + t, e => window.__EV.push({ type: t, detail: e.detail, at: performance.now() }));
    window.__UNHANDLED = []; addEventListener("unhandledrejection", e => { window.__UNHANDLED.push(String(e.reason && e.reason.message || e.reason)); });
    document.addEventListener("bloom:run-ready", () => { try { window.__atReady = { ticks: sim.ticks, biomass: sim.biomass, won: !!sim.won, owned: sim.traits.filter(u => sim.ownedTier(u) > 0).length }; } catch (e) { window.__atReady = null; } const c = document.getElementById("expeditionCover"); window.__coverAtReady = { cover: !!c, op: c ? getComputedStyle(c).opacity : null, state: c ? c.dataset.state : null, planet: window.BLOOM_RUN && BLOOM_RUN.planet ? BLOOM_RUN.planet.id : null, pv: !!document.querySelector(".pv"), ui18: document.documentElement.classList.contains("ui18") }; });
    const qa = () => { try { return JSON.parse(sessionStorage.getItem("__xp_qa") || "[]"); } catch { return []; } }, put = r => { try { const a = qa(); a.push(r); sessionStorage.setItem("__xp_qa", JSON.stringify(a)); } catch {} };
    const raw = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (this === sessionStorage && /^strange-bloom\.expedition\.x/.test(k)) { const ov = document.querySelector(".atx"), veil = document.querySelector(".atx-veil"), s = window.MENU_DEV && MENU_DEV.entry && MENU_DEV.entry.survey;
        put({ kind: "write", key: k, at: performance.now(), phase: ov ? ov.dataset.atxPhase : null, preset: ov ? ov.dataset.atxPreset : null, veil: veil ? +getComputedStyle(veil).opacity : null, surveyState: s ? s.state : null, entryState: window.MENU_DEV && MENU_DEV.entry ? MENU_DEV.entry.state : null, bytes: String(v).length, urlHasPlanet: /tilemap|sections/.test(location.href) }); }
      return raw.call(this, k, v); };
    addEventListener("pagehide", () => { const s = window.MENU_DEV && MENU_DEV.entry && MENU_DEV.entry.survey, h = s && s.host, pool = s && s.sectors; if (!window.MENU_DEV) return;
      put({ kind: "pagehide", at: performance.now(), entryState: MENU_DEV.entry.state, surveyState: s ? s.state : "(none)", rendererDisposed: h ? !!h.disposed : null, poolDisposed: pool ? !!pool.disposed : null, workers: pool ? pool._pool.length : null, phase: (document.querySelector(".atx") || { dataset: {} }).dataset.atxPhase || null }); });
  };
  const frames = (p, n = 3) => p.evaluate(n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
  const shot = async (p, name) => { if (EVIDENCE) await p.screenshot({ path: path.join(EVD, name) }); };
  const settledDR = p => p.waitForFunction(() => !BLOOM.decisionRooms.instance.state().transitioning, null, { timeout: 8000, polling: 20 });
  const openRoom = async (p, name) => { const inRoom = await p.evaluate(() => !!BLOOM.decisionRooms.instance.state().room); await p.click(inRoom ? `.dr .dr-room:not([hidden]) .rn[data-go="${name}"]` : `.pv-tool[data-tool="${name}"]`); await settledDR(p); await frames(p, 2); };
  const back = async p => { await p.click(`.dr .dr-room:not([hidden]) .rb.back, .dr .dr-room:not([hidden]) .rb.resume`); await settledDR(p); await frames(p, 2); };
  const waitRun = p => p.waitForFunction(() => window.BLOOM_RUN && (BLOOM_RUN.started || BLOOM_RUN.failed), null, { timeout: 60000, polling: 50 });
  const waitProd = async p => { await p.waitForFunction(() => BLOOM.planetView && BLOOM.planetView.instance && BLOOM.planetView.instance.renderer.info().frames > 0 && BLOOM.decisionRooms.instance && BLOOM.runReport.instance, null, { timeout: 30000, polling: 100 });
    await p.waitForFunction(() => BLOOM.decisionRooms.instance.transition && BLOOM.decisionRooms.instance.transition.kind !== "pending", null, { timeout: 15000, polling: 50 }).catch(() => {}); await frames(p, 3); };
  const waitLift = p => p.waitForFunction(() => !BLOOM.expeditionArrival.instance || BLOOM.expeditionArrival.stats.state === "lifted" || BLOOM.expeditionArrival.stats.state === "failed", null, { timeout: 15000, polling: 50 });
  const menuReady = p => p.waitForFunction(() => window.MENU_DEV && MENU_DEV.ready, null, { timeout: 30000, polling: 50 });
  const surveyReady = p => p.waitForFunction(() => MENU_DEV.entry.survey && MENU_DEV.entry.survey.state === "survey", null, { timeout: 90000, polling: 100 });
  // the survey side of the identity proof: what the player chose, measured with the survey's own functions (planetFingerprint, drawPlanetTexture)
  const SURVEY_CAP = async i => { const S = await import("/resources/destination-survey/survey-data.js"), T = await import("/resources/planet-sphere/planet-texture.js");
    const s = MENU_DEV.entry.survey, c = s.cells[i], v = s.views[i], p = c.planet; const cv = document.createElement("canvas"); const g = T.drawPlanetTexture(cv, p, { render: c.render || null });
    const hash = canvas => { const d = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data; let h = 0x811c9dc5; for (let k = 0; k < d.length; k++) { h ^= d[k]; h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(16).padStart(8, "0") + ":" + canvas.width + "x" + canvas.height; };
    const live = v._canvas && v._canvas.width ? hash(v._canvas) : null; // the focused globe's own texture source (white-boxed here only)
    return { key: c.key, name: c.name, classId: c.classId, authored: c.authored, archetypeId: c.archetypeId, seed: c.seed, attempt: c.attempt, sectorSeed: s.sectorSeed, validation: c.validation, fingerprint: S.planetFingerprint(p), candFingerprint: c.fingerprint,
      planet: JSON.stringify(p), render: JSON.stringify(c.render || null), texture: hash(cv), liveTexture: live, textureSig: v.state().textureSignature, viewPlanetSame: v.planet.id === p.id && v.planet.tilemap === p.tilemap && v.planet.sections === p.sections, // (the view keeps the texture's read of the same planet: same id, the very same tilemap / sections arrays)
      fields: { id: p.id, grid: [p.gridWidth, p.gridHeight], topology: JSON.stringify(p.topology || null), origin: p.origin || null, winThreshold: p.winThreshold ?? null, sectionIds: p.sections.map(x => x.id), sectionLocals: JSON.stringify(p.sections.map(x => x.local)), tilemap: p.tilemap ? (p.tilemap.length + ":" + p.tilemap.reduce((a, b, k) => (a ^ Math.imul(b + 2, k + 1)) >>> 0, 7)) : null, climate: JSON.stringify(p.globalClimate) },
      focus: { selected: s.selected, inFocusSlot: s.focusSlot.contains(s.globes[i]), state: s.state } }; };
  const GAME_CAP = async () => { const S = await import("/resources/destination-survey/survey-data.js"); const A = BLOOM_RUN_UI.adapter, R = BLOOM_RUN, p = R.planet, src = A.surface(), PV = BLOOM.planetView.instance;
    const cv = document.createElement("canvas"); cv.width = 480; cv.height = 240; const W = src.planet.gridWidth, H = src.planet.gridHeight; const tw = 480 / W, th = 240 / H;
    let texture = null; if (Number.isInteger(tw) && Number.isInteger(th)) { BLOOM.surface.paintSurface(cv.getContext("2d"), src.planet, { render: src.render, sky: src.startSky, tileW: tw, tileH: th });
      const d = cv.getContext("2d").getImageData(0, 0, 480, 240).data; let h = 0x811c9dc5; for (let k = 0; k < d.length; k++) { h ^= d[k]; h = Math.imul(h, 0x01000193); } texture = (h >>> 0).toString(16).padStart(8, "0") + ":480x240"; }
    const I = PV.renderer.info(), st = BLOOM.expeditionArrival.stats, X = BLOOM.expedition, stored = X.load(R.expedition.token, sessionStorage);
    return { url: location.href, id: p.id, name: p.name, fingerprint: S.planetFingerprint(p), storedFingerprint: stored.ok ? stored.payload.fingerprint : null, storedPlanet: stored.ok ? JSON.stringify(stored.payload.planet) : null, storedIntegrity: stored.ok ? stored.payload.integrity : null,
      planet: JSON.stringify(p), render: JSON.stringify(R.render || null), adapterRender: JSON.stringify(src.render || null), texture, mapSig: I.surfaceSignature, mapSigExpected: BLOOM.surface.surfaceSignature(src.planet, { render: src.render, sky: src.sky }), startSkyIsPlanetSky: src.sky.temperature === p.globalClimate.temperature && src.sky.moisture === p.globalClimate.moisture,
      fields: { id: p.id, grid: [p.gridWidth, p.gridHeight], topology: JSON.stringify(p.topology || null), origin: p.origin || null, winThreshold: p.winThreshold ?? null, sectionIds: p.sections.map(x => x.id), sectionLocals: JSON.stringify(p.sections.map(x => x.local)), tilemap: p.tilemap ? (p.tilemap.length + ":" + p.tilemap.reduce((a, b, k) => (a ^ Math.imul(b + 2, k + 1)) >>> 0, 7)) : null, climate: JSON.stringify(p.globalClimate) },
      run: { kind: R.kind, play: R.play, scenario: R.scenario, seed: R.seed, archetypeId: R.archetype ? R.archetype.id : null, archetypeStatic: !!(R.archetype && BLOOM_DATA.archetypes.includes(R.archetype)), xp: R.expedition, summary: R.summary, started: R.started, sameSim: typeof sim === "object" && sim === BLOOM_API.sim, simPlanetSame: BLOOM_API.sim && BLOOM_API.sim.map.SEC.length === p.sections.length, simWinAt: BLOOM_API.sim.winAt, ticks: BLOOM_API.sim.ticks, biomass: BLOOM_API.sim.biomass, owned: BLOOM_API.sim.traits.filter(u => BLOOM_API.sim.ownedTier(u) > 0).map(u => u.id) },
      adapterRun: A.run(), atReady: window.__atReady || null, counters: __XP.calls, threw: __XP.threw, forbid: __XP.forbid, cover: { ...st }, coverAtReady: window.__coverAtReady || null, title: document.title, pvName: document.getElementById("pvName").textContent, runId: document.getElementById("pvRunId").textContent, menu: A.runMenu(), ui18: document.documentElement.classList.contains("ui18"), pv: document.querySelectorAll(".pv").length,
      ss: Object.keys(sessionStorage).filter(k => k.startsWith("strange-bloom.expedition")), lsPlanet: Object.keys(localStorage).filter(k => /tilemap|sections|gridWidth/.test(localStorage.getItem(k) || "")), unhandled: window.__UNHANDLED }; };
  const sameFields = (a, b) => Object.keys(a).filter(k => J(a[k]) !== J(b[k]));

  for (const bname of BROWSERS) {
    if (!pw) break; const FF = bname === "firefox", tag = `[${bname}]`;
    let browser; try { browser = await pw[bname].launch(); } catch (e) { check(false, `${tag} browser launches`, e.message.split("\n")[0]); continue; }
    console.log(`# ${bname}`);
    const reqs = [], errs = [];
    const context = async (opts = {}) => { const c = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: opts.rm ? "reduce" : "no-preference" }); await c.addInitScript(INIT); return c; };
    const newPage = async (c, label) => { const p = await c.newPage(); p.label = label; p.on("pageerror", e => errs.push(`${label}: ${e.message}`)); p.on("console", m => { if (m.type() === "error") errs.push(`${label}: console: ${m.text()}`); }); p.on("request", r => reqs.push(r.url())); p.on("dialog", d => d.accept()); return p; };
    try {
      const c = await context(), p = await newPage(c, "flow");
      // ---- E1 · the Main Menu: the title, the sector prefetch under way, TRAINING / Settings / Credits
      await p.goto(MENU + "?bg=3&workers=3&sector=77"); await menuReady(p);
      const m1 = await p.evaluate(() => ({ title: document.title, prefetch: MENU_DEV.entry.prefetch ? MENU_DEV.entry.prefetch.progress : null, items: [...document.querySelectorAll(".mm-item")].map(b => b.dataset.act), bg: MENU_DEV.entry.menu.background.index + 1, state: MENU_DEV.entry.state, dest: !!document.getElementById("dest"), text: document.body.innerText }));
      check(m1.title === "Strange Bloom — Unknown Soils" && m1.prefetch && m1.prefetch.seed === 77 && m1.prefetch.total === 9 && J(m1.items) === J(["begin", "training", "settings", "credits"]) && m1.bg === 3 && m1.state === "menu" && !m1.dest && !/development harness|handoff target/i.test(m1.text),
        `${tag} E1 · the Strange Bloom Main Menu: the title, the first sector prefetching (seed 77, nine worlds) while the title shows, BEGIN EXPEDITION · TRAINING · SETTINGS · CREDITS, the painting; the development handoff target is gone`, J({ prefetch: m1.prefetch, items: m1.items }));
      await shot(p, "01-main-menu.png");
      // ---- E2 · BEGIN → the 3 × 3 survey: nine fully validated worlds, one class per column, the pool's own objects
      await p.click('.mm-item[data-act="begin"]'); await surveyReady(p);
      const s2 = await p.evaluate(() => { const s = MENU_DEV.entry.survey, cls = ["stable", "volatile", "extreme"]; return { n: s.cells.filter(Boolean).length, validated: s.cells.map(c => c && (c.authored || (c.validation.validated && c.planet.archetype.winnabilityChecked && c.planet.archetype.validatedLayers.join() === "1,2,3,4,5,6,7,8"))),
        cols: s.cells.map((c, i) => c && c.classId === cls[i % 3]), keys: s.cells.map(c => c && c.key), adopted: s.stats.adopted, seed: s.sectorSeed, views: s.views.length, renderer: !s.host.disposed, buttons: [...document.querySelectorAll(".ds-cand")].filter(b => !b.disabled).length, state: s.state }; });
      check(s2.n === 9 && s2.validated.every(Boolean) && s2.cols.every(Boolean) && new Set(s2.keys).size === 9 && s2.seed === 77 && s2.adopted && s2.views === 9 && s2.renderer && s2.buttons === 9 && s2.state === "survey",
        `${tag} E2 · BEGIN EXPEDITION opens the unchanged 3 × 3 survey on the prefetched sector: nine distinct worlds, every one fully validated (layers 1–8, winnability checked) or the authored world, each in its own class column, nine live views on one renderer, every cell selectable`, J({ keys: s2.keys, adopted: s2.adopted }));
      await shot(p, "02-destination-survey.png");
      // ---- the identity proof loop: three worlds of three classes (the third from a scanned second sector)
      const PICKS = [{ index: 4, scan: false, label: "volatile · first sector" }, { index: 0, scan: false, label: "stable · first sector" }, { index: 8, scan: true, label: "extreme · scanned second sector" }];
      let first = null, cur = null;
      for (let k = 0; k < PICKS.length; k++) {
        const pick = PICKS[k], L = `${tag} E${3 + k}`;
        if (k > 0) { await p.goto(MENU + "?bg=3&workers=3&sector=77"); await menuReady(p); await p.click('.mm-item[data-act="begin"]'); await surveyReady(p); }
        if (pick.scan) { await p.evaluate(() => MENU_DEV.entry.survey.scan()); await p.waitForFunction(() => MENU_DEV.entry.survey.state === "survey" && MENU_DEV.entry.survey.stats.scans === 1 && MENU_DEV.entry.survey.cells.every(Boolean), null, { timeout: 90000, polling: 100 }); }
        // select → focus: the same candidate, the same live view, moved into the focus slot
        const viewBefore = await p.evaluate(i => { const s = MENU_DEV.entry.survey; window.__viewRef = s.views[i]; window.__planetRef = s.cells[i].planet; return s.cells[i].key; }, pick.index);
        await p.evaluate(i => MENU_DEV.entry.survey.select(i), pick.index); await p.waitForFunction(() => MENU_DEV.entry.survey.state === "focus", null, { timeout: 20000, polling: 50 });
        const cap = await p.evaluate(SURVEY_CAP, pick.index);
        const fo = await p.evaluate(i => { const s = MENU_DEV.entry.survey; return { sameView: s.views[i] === window.__viewRef, samePlanet: s.cells[i].planet === window.__planetRef, title: s.dossierTitle.textContent, cls: s.root.dataset.class }; }, pick.index);
        check(cap.focus.selected === pick.index && cap.focus.inFocusSlot && fo.sameView && fo.samePlanet && cap.viewPlanetSame && fo.title === cap.name && fo.cls === cap.classId && cap.fingerprint === cap.candFingerprint && cap.liveTexture === cap.texture,
          `${L}a · ${pick.label}: selecting a world focuses the SAME candidate (same planet object, same live PlanetSphereView moved into the focus slot, dossier = its name / class); the survey's planetFingerprint equals the candidate's; the live globe's texture pixels equal drawPlanetTexture of detail.planet`, J({ key: cap.key, cls: cap.classId, sector: cap.sectorSeed, fp: cap.fingerprint, texture: cap.texture, live: cap.liveTexture, sig: cap.textureSig, flags: { sel: cap.focus.selected === pick.index, slot: cap.focus.inFocusSlot, sameView: fo.sameView, samePlanet: fo.samePlanet, viewPlanet: cap.viewPlanetSame, title: fo.title === cap.name, cls: fo.cls === cap.classId, fp: cap.fingerprint === cap.candFingerprint } }));
        if (k === 0) await shot(p, "03-focused-planet.png");
        // Begin Expedition: the announced detail.planet is the selected candidate's planet; the DRAMATIC transition; the handoff at full cover; navigation
        await p.evaluate(() => { window.__det = null; document.getElementById("app").addEventListener("bloom:begin-expedition", e => { const d = e.detail, s = MENU_DEV.entry.survey; window.__det = { samePlanet: d.planet === s.cells[s.selected].planet, sameView: d.view === s.views[s.selected], key: d.candidate.key, hasDescent: !!d.descent, state: s.state }; }, { once: true }); });
        await p.click(".ds-btn.go");
        const det = await p.evaluate(() => window.__det);
        await p.waitForFunction(() => document.querySelector(".atx") && document.querySelector(".atx").dataset.atxPreset === "dramatic", null, { timeout: 10000, polling: 20 });
        const atx = await p.evaluate(() => { const o = document.querySelector(".atx"); return { preset: o.dataset.atxPreset, phase: o.dataset.atxPhase, rm: o.classList.contains("rm") }; });
        await p.waitForURL(u => /demo-run\.html\?play=1&expedition=x[0-9a-f]{20}$/.test(u.href), { timeout: 30000 });
        await waitRun(p); await waitProd(p); await waitLift(p);
        const qa = await p.evaluate(() => JSON.parse(sessionStorage.getItem("__xp_qa") || "[]")), writes = qa.filter(r => r.kind === "write"), hide = qa.filter(r => r.kind === "pagehide").pop(), w = writes[writes.length - 1];
        const g = await p.evaluate(GAME_CAP);
        await p.evaluate(() => sessionStorage.removeItem("__xp_qa"));
        const tokenInUrl = decodeURIComponent(new URL(g.url).searchParams.get("expedition"));
        check(det && det.samePlanet && det.sameView && det.key === cap.key && det.hasDescent && det.state === "departing" && atx.preset === "dramatic" && w && w.phase === "covered" && w.preset === "dramatic" && w.veil === 1 && w.surveyState === "departing" && w.entryState === "survey" && !w.urlHasPlanet && hide && hide.surveyState === "disposed" && hide.rendererDisposed === true && hide.poolDisposed === true && hide.workers === 0 && hide.phase === "covered"
          && tokenInUrl === g.run.xp.token && new URL(g.url).search.length < 60 && !/tilemap|sections|seed=/.test(g.url),
          `${L}b · Begin Expedition announces the selected candidate's exact planet and live view (state departing), plays the DRAMATIC AtmosphereTransition, writes the handoff only at phase "covered" with the veil fully opaque (survey still departing, nothing in the address), then disposes the survey (renderer, pool, 0 workers) while still covered and navigates with ONLY the opaque token in the URL`,
          J({ det, atx, write: w && { phase: w.phase, veil: w.veil, surveyState: w.surveyState, bytes: w.bytes }, pagehide: hide, url: g.url.replace(ORIGIN, "") }));
        // gameplay identity: zero authoritative differences; fingerprints; surface; boot order; counters
        const diffs = sameFields(cap.fields, g.fields), cmp = { planet: cap.planet === g.planet, storedPlanet: cap.planet === g.storedPlanet, render: cap.render === g.render && cap.render === g.adapterRender, fp: cap.fingerprint === g.fingerprint && g.fingerprint === g.storedFingerprint && g.fingerprint === g.run.xp.fingerprint, texture: cap.texture === g.texture, mapSig: g.mapSig === g.mapSigExpected && g.startSkyIsPlanetSky };
        const boot = g.counters.createSim === 1 && GEN_NAMES.every(n => g.counters[n] === 0) && !g.threw.length && g.forbid && g.run.sameSim && g.run.started && g.coverAtReady && g.coverAtReady.cover && g.coverAtReady.op === "1" && g.coverAtReady.state === "covered" && g.coverAtReady.planet === cap.fields.id && g.cover.state === "lifted" && g.cover.framesAtLift > 0 && g.cover.surfaceRepaintsAtLift > 0 && g.cover.paintedAt !== null && g.cover.liftStartAt >= g.cover.paintedAt && g.cover.readyAt <= g.cover.paintedAt;
        const prov = g.run.kind === (cap.authored ? "authored" : "procedural") && g.run.play === true && g.run.scenario === null && g.run.seed === cap.seed && g.run.archetypeId === cap.archetypeId && (cap.authored || g.run.archetypeStatic) && g.run.xp.candidateKey === cap.key && g.run.xp.sectorSeed === cap.sectorSeed && g.run.xp.classId === cap.classId && g.run.xp.attempt === cap.attempt && J(g.run.xp.validation) === J(cap.validation) && g.run.summary.expedition === true && g.run.summary.scenarioId === "eden" && g.adapterRun.expedition && g.adapterRun.expedition.fingerprint === cap.fingerprint && g.adapterRun.scenarioId === "eden" && g.adapterRun.play && g.run.ticks >= 0 && J(g.run.owned) === "[]";
        const ui = g.ui18 && g.pv === 1 && g.title === `Strange Bloom — ${cap.name}` && g.pvName === cap.name && (cap.authored || g.runId.includes(`World Seed ${cap.seed}`)) && g.menu && J(g.menu.items.map(a => a.id)) === J(["playAgain", "choosePlanet", "mainMenu"]) && !g.lsPlanet.length && !g.unhandled.length;
        check(!diffs.length && Object.values(cmp).every(Boolean) && boot && prov && ui,
          `${L}c · gameplay plays THAT planet: id, grid, topology, origin, win threshold, section ids / order, section locals, tilemap and starting climate identical; planet JSON == stored payload == the survey's; render hints identical (run and adapter); survey planetFingerprint == stored == gameplay == BLOOM_RUN.expedition.fingerprint; focused-globe canonical texture == gameplay canonical surface at 480×240 (pixel hash) and the live map's signature is the planet under its starting sky; the handoff resolved before the ONE createSim (generator / search / attempt loop 0 calls while stubbed to throw); the arrival cover was up (opacity 1) at run-ready with the handoff planet already the run's, lifted only after the surface painted; Eden, play, provenance (seed, attempt, class, sector, validation) preserved; title and HUD name the world; the expedition run menu; nothing in localStorage; no unhandled rejection`,
          J({ diffs, cmp, counters: g.counters, cover: g.cover, coverAtReady: g.coverAtReady, title: g.title, ss: g.ss }));
        PROOF.worlds.push({ pick: pick.label, candidateKey: cap.key, classId: cap.classId, sectorSeed: cap.sectorSeed, provenanceSeed: cap.seed, attempt: cap.attempt, authored: cap.authored, planetId: cap.fields.id, name: cap.name, topology: cap.fields.topology, grid: cap.fields.grid,
          surveyFingerprint: cap.fingerprint, storedPayloadFingerprint: g.storedFingerprint, storedPayloadIntegrity: g.storedIntegrity, gameplayFingerprint: g.fingerprint, tilemapHash: cap.fields.tilemap, gameplayTilemapHash: g.fields.tilemap, sectionDataHash: fnv(cap.fields.sectionLocals + cap.fields.sectionIds.join()), gameplaySectionDataHash: fnv(g.fields.sectionLocals + g.fields.sectionIds.join()),
          renderHintsHash: fnv(cap.render), gameplayRenderHintsHash: fnv(g.render), startingSurfaceHash: cap.texture, liveGlobeTextureHash: cap.liveTexture, gameplaySurfaceHash: g.texture, gameplayMapSignature: g.mapSig, planetJsonIdentical: cap.planet === g.planet, authoritativeDifferences: diffs, generatorOrSearchCalled: GEN_NAMES.some(n => g.counters[n] > 0), counters: g.counters, createSimCalls: g.counters.createSim, token: g.run.xp.token, url: g.url.replace(ORIGIN, "<origin>"), cover: g.cover, coverAtReady: g.coverAtReady });
        cur = { cap, g, token: g.run.xp.token }; if (k === 0) { first = cur; await shot(p, "05-first-gameplay-frame-same-planet.png"); }
      }
      // ---- E6 · on the handed-off planet (the page now plays the last pick): the four rooms, the Terraform globe (identity kept after a purchase), the 029E ordering, events, anchors
      { const g = cur; void first;
        const tl0 = await p.evaluate(() => BLOOM.decisionRooms.instance.timeline().length);
        await p.evaluate(() => { const A = BLOOM_RUN_UI.adapter; A.actions.play(); const r = A.regions().find(x => !x.isOrigin); A.actions.selectRegion(r.index); });
        for (const name of ["region", "adapt", "spread"]) { await openRoom(p, name); }
        await openRoom(p, "terraform"); await p.waitForFunction(() => BLOOM.decisionRooms.instance.rooms.terraform.globeKind() !== "pending", null, { timeout: 20000, polling: 50 }); await frames(p, 3);
        const tf = () => p.evaluate(() => { const DR = BLOOM.decisionRooms.instance, T = DR.rooms.terraform, src = T.source(), gl = T.globe(), A = BLOOM_RUN_UI.adapter, PV = BLOOM.planetView.instance, s = A.surface();
          const snap = BLOOM.terraformGlobe.snapshot(src.planet, src.sky || s.sky), expect = BLOOM.surface.surfaceSignature(snap, { render: src.render, extra: { diag: null, width: 480 } });
          return { kind: T.globeKind(), planetId: src.planet.id, sameTiles: JSON.stringify(src.planet.tilemap) === JSON.stringify(BLOOM_RUN.planet.tilemap), sphereSig: gl.view ? gl.view.state().textureSignature : null, expect, mapSig: PV.renderer.info().surfaceSignature, mapExpect: BLOOM.surface.surfaceSignature(s.planet, { render: s.render, sky: s.sky }), sky: s.sky, room: DR.state().room }; });
        const t1 = await tf();
        await p.evaluate(() => { BLOOM_API.addBiomass(3000); const A = BLOOM_RUN_UI.adapter; const items = A.upgrades().find(b => b.board === "Terraform").items; const u = items.find(x => x.canBuy) || items.find(x => x.id === "warm") || items[0]; A.actions.buy(u.id); }); await frames(p, 4);
        const t2 = await tf();
        await shot(p, "07-terraform-globe-handed-off-planet.png");
        await back(p); await frames(p, 2);
        const r6 = await p.evaluate(tl0 => { const DR = BLOOM.decisionRooms.instance, tl = DR.timeline().slice(tl0), opens = tl.filter(e => e.kind === "open" || e.kind === "switch"), names = {};
          document.querySelectorAll("[data-tutorial]").forEach(e => { if (!e.closest("[data-tutorial-covered]") && e.offsetParent !== null || e.closest(".pv-menu")) names[e.dataset.tutorial] = (names[e.dataset.tutorial] || 0) + 1; });
          const dup = Object.entries(names).filter(([, n]) => n > 1).map(([k]) => k);
          const shapes = {}; for (const e of __EV) shapes[e.type] = Object.keys(e.detail).join(",");
          return { opens: opens.map(e => ({ kind: e.kind, to: e.to, ran: e.ran, immediate: e.immediate, ok: e.kind !== "open" || e.tPause === null || e.tPause <= e.tCovered, runningAtSwap: e.runningAtSwap, ticks: e.ticksAtEnd === e.ticksAtStart })), closes: tl.filter(e => e.kind === "back" || e.kind === "resume").length, kind: DR.transition.kind, dup, shapes, room: DR.state().room, counters: __XP.calls, threw: __XP.threw }; }, tl0);
        const shapesOk = Object.entries(r6.shapes).every(([t, k]) => SHAPES[t] === k);
        check(t1.kind === "sphere" && t1.planetId === g.cap.fields.id && t1.sameTiles && t1.sphereSig === t1.expect && t1.mapSig === t1.mapExpect && t2.sphereSig === t2.expect && t2.mapSig === t2.mapExpect && J(t2.sky) !== J(t1.sky) && t2.sphereSig !== t1.sphereSig
          && r6.opens.length === 4 && r6.opens.every(e => e.ran && !e.immediate && e.ok && e.runningAtSwap === false && e.ticks) && r6.kind === "atmosphere" && !r6.dup.length && shapesOk && r6.room === null && GEN_NAMES.every(n => r6.counters[n] === 0) && !r6.threw.length,
          `${tag} E6 · on the handed-off planet all four production rooms open through the SUBDUED mist with the locked ordering (pause ≤ covered, never running at a swap, no ticks during); the Terraform room's unmodified PlanetSphereView shows THIS planet (same tilemap) and its texture signature equals the canonical surface of the exact planet under the current sky, the flat map likewise — before and after a real Terraform purchase changed the sky; every bloom:* detail shape fired so far is the frozen one; every active anchor is unique; no generator / search call anywhere on the page`,
          J({ t1: { kind: t1.kind, id: t1.planetId, sphere: t1.sphereSig === t1.expect, map: t1.mapSig === t1.mapExpect }, t2: { sphere: t2.sphereSig === t2.expect, map: t2.mapSig === t2.mapExpect, sky: t2.sky }, opens: r6.opens.length, dup: r6.dup, shapes: Object.keys(r6.shapes) })); }
      // ---- E7 · the production report names the handed-off world and its provenance; the expedition actions; Play again = same token
      { const g = cur;
        await p.evaluate(() => { const s = BLOOM_API.sim; BLOOM_API.advance(60); s.won = true; s.onWin(s.coverage()); }); // a QA shortcut to the run's own win path (the engine is untouched; the report reads the real state)
        await p.waitForFunction(() => BLOOM.runReport.instance.state().open && !BLOOM.runReport.instance.state().busy, null, { timeout: 15000, polling: 30 }); await frames(p, 3);
        const r7 = await p.evaluate(() => { const A = BLOOM_RUN_UI.adapter, d = A.report(), acts = A.reportActions(), txt = document.getElementById("rrCard").innerText.replace(/\s+/g, " ");
          return { kind: d.kind, identity: d.identity, acts: acts.map(a => [a.id, a.href]), txt, shown: BLOOM.runReport.instance.state().actions, menu: A.runMenu().items.map(a => a.id) }; });
        const I = r7.identity, hrefs = Object.fromEntries(r7.acts);
        const identOk = I.planetName === g.cap.name && I.planetId === g.cap.fields.id && I.play && I.scenarioId === "eden" && I.expedition && I.expedition.fingerprint === g.cap.fingerprint && I.expedition.candidateKey === g.cap.key && I.expedition.sectorSeed === g.cap.sectorSeed && I.expedition.seed === g.cap.seed && I.expedition.attempt === g.cap.attempt && (g.cap.authored || (I.kind === "procedural" && I.seed === g.cap.seed && I.seedWord === "World Seed"));
        const actsOk = J(r7.acts.map(a => a[0])) === J(["keepPlaying", "playAgain", "choosePlanet", "mainMenu"]) && hrefs.playAgain === `demo-run.html?play=1&expedition=${g.token}` && hrefs.choosePlanet === `${MENU}?bg=3&workers=3&sector=77&begin=1` && hrefs.mainMenu === `${MENU}?bg=3&workers=3&sector=77` && !Object.values(hrefs).some(h => /index\.html|ui=legacy|ui=18|scenario=|archetype=|seed=/.test(h)) && J(r7.shown) === J(["keepPlaying", "playAgain", "choosePlanet", "mainMenu"]);
        const txtOk = r7.txt.includes(g.cap.name) && (g.cap.authored || r7.txt.includes(`World Seed ${g.cap.seed}`)) && !/regenerat|generated again|new world/i.test(r7.txt) && r7.txt.includes("Play again") && r7.txt.includes("Choose another planet") && r7.txt.includes("Main menu");
        check(r7.kind === "win" && identOk && actsOk && txtOk, `${tag} E7 · the production Bloom Report names the handed-off world (name, archetype · World Seed as provenance) and carries the expedition identity (candidate key, sector, seed, attempt, fingerprint); its actions are Keep playing · Play again (the SAME token) · Choose another planet (the title + begin=1) · Main menu (the exact title URL): no root launcher, no ui=legacy, no scenario / new-world link, no wording that the world was regenerated`,
          J({ identity: { name: I.planetName, kind: I.kind, seed: I.seed, xp: I.expedition && I.expedition.candidateKey }, hrefs }));
        await shot(p, "08-production-report-handed-off-planet.png");
        // Play again: the same stored planet, a fresh simulation
        await Promise.all([p.waitForEvent("load", { timeout: 30000 }), p.click('#rr [data-act="playAgain"]')]);
        await waitRun(p); await waitProd(p); await waitLift(p);
        const g2 = await p.evaluate(GAME_CAP);
        const startBio = D.config.econ.startBiomass;
        check(g2.url === g.g.url && g2.run.xp.token === g.token && g2.fingerprint === g.cap.fingerprint && g2.planet === g.cap.planet && g2.texture === g.cap.texture && g2.atReady && g2.atReady.ticks === 0 && g2.atReady.biomass === startBio && g2.atReady.owned === 0 && !g2.atReady.won && J(g2.run.owned) === "[]" && g2.counters.createSim === 1 && GEN_NAMES.every(n => g2.counters[n] === 0) && !g2.threw.length && g2.adapterRun.won === false && g2.cover.state === "lifted" && g2.coverAtReady && g2.coverAtReady.cover,
          `${tag} E7b · Play again reopens the same URL (same token): the SAME stored planet (fingerprint, planet JSON and canonical surface identical) on a FRESH simulation (0 ticks, start Biomass ${startBio}, no upgrades, not won), one createSim, no generator, the arrival cover again`, J({ token: g2.run.xp.token, fp: g2.fingerprint, atReady: g2.atReady, owned: g2.run.owned }));
        await shot(p, "09-play-again-same-planet.png");
        // refresh: the same planet
        await p.reload(); await waitRun(p); await waitProd(p); await waitLift(p);
        const g3 = await p.evaluate(GAME_CAP);
        check(g3.fingerprint === g.cap.fingerprint && g3.planet === g.cap.planet && g3.run.xp.token === g.token && g3.counters.createSim === 1 && GEN_NAMES.every(n => g3.counters[n] === 0),
          `${tag} E7c · a refresh with the same token plays the same exact planet (the handoff is not consumed on boot)`, g3.fingerprint);
        // Choose another planet → the title's survey; Main menu → the title with a fresh prefetch
        await p.click("#pvMenuBtn"); await Promise.all([p.waitForURL(u => u.href.startsWith(MENU) && u.searchParams.get("begin") === "1", { timeout: 30000 }), p.click('#pvMenu [data-act="choosePlanet"]')]);
        await menuReady(p); await p.waitForFunction(() => MENU_DEV.entry.state === "survey", null, { timeout: 60000, polling: 100 });
        const c1 = await p.evaluate(() => ({ url: location.href, state: MENU_DEV.entry.state, survey: !!MENU_DEV.entry.survey, cells: MENU_DEV.entry.survey.cells.length, events: MENU_DEV.events.map(e => e.type) }));
        await surveyReady(p);
        await p.evaluate(() => MENU_DEV.entry.survey.exit()); await p.waitForFunction(() => MENU_DEV.entry.state === "menu", null, { timeout: 20000, polling: 50 });
        const c2 = await p.evaluate(() => ({ state: MENU_DEV.entry.state, prefetch: !!MENU_DEV.entry.prefetch, items: [...document.querySelectorAll(".mm-item")].map(b => b.dataset.act) }));
        check(!/begin=1/.test(c1.url) && c1.state === "survey" && c1.survey && c1.cells === 9 && c1.events.includes("auto-begin") && c2.state === "menu" && c2.prefetch && J(c2.items) === J(["begin", "training", "settings", "credits"]),
          `${tag} E7d · Choose another planet opens the Strange Bloom title and enters the Destination Survey at once (begin=1 dropped from the address); "← Main menu" returns to the title, which starts a fresh sector prefetch; TRAINING / SETTINGS / CREDITS are there`, J({ url: c1.url.replace(ORIGIN, ""), c2 }));
        // Main menu from a live run (confirm accepted) → the exact title URL
        await p.goto(RUN + `?play=1&expedition=${g.token}`); await waitRun(p); await waitProd(p); await waitLift(p);
        await p.click("#pvMenuBtn"); await Promise.all([p.waitForURL(u => u.href === `${MENU}?bg=3&workers=3&sector=77`, { timeout: 30000 }), p.click('#pvMenu [data-act="mainMenu"]')]); await menuReady(p);
        const c3 = await p.evaluate(() => ({ url: location.href, state: MENU_DEV.entry.state, prefetch: MENU_DEV.entry.prefetch && MENU_DEV.entry.prefetch.progress.total }));
        check(c3.url === `${MENU}?bg=3&workers=3&sector=77` && c3.state === "menu" && c3.prefetch === 9, `${tag} E7e · Main menu from an expedition run returns to the real Strange Bloom title (the exact return URL), never the root launcher; a fresh prefetch starts`, c3.url.replace(ORIGIN, "")); }
      // ---- E8 · invalid / missing handoffs: the explicit failure state, no sim, no generation, no First Bloom, one way out
      { const cases = [];
        const failCase = async (label, prep, q, arg = null) => { const c2 = await context(), q2 = await newPage(c2, "fail:" + label); if (prep) await c2.addInitScript(prep, arg); await q2.goto(RUN + q); await waitRun(q2); await frames(q2, 3);
          const r = await q2.evaluate(() => ({ failed: !!BLOOM_RUN.failed, reason: BLOOM_RUN.summary && BLOOM_RUN.summary.reason, kind: BLOOM_RUN.kind, sim: typeof BLOOM_API.sim, pv: document.querySelectorAll(".pv").length, fail: !!document.getElementById("expeditionFail"), text: (document.getElementById("expeditionFail") || { innerText: "" }).innerText.replace(/\s+/g, " "), btn: (document.getElementById("xpFailAction") || { dataset: {} }).dataset.go, focus: document.activeElement && document.activeElement.id, title: document.title, header: getComputedStyle(document.querySelector("body > header")).display, counters: __XP.calls, planet: !!(BLOOM_RUN.planet), firstBloom: !!(window.sim), unhandled: __UNHANDLED.length, role: (document.getElementById("expeditionFail") || { getAttribute: () => null }).getAttribute("role") }));
          cases.push({ label, ...r }); const ok = r.failed && r.sim === "undefined" && r.pv === 0 && r.fail && r.btn === "main-menu.html" && r.focus === "xpFailAction" && r.header === "none" && r.counters.createSim === 0 && GEN_NAMES.every(n => r.counters[n] === 0) && !r.planet && !r.firstBloom && !r.unhandled && !/Error|stack|\bat \w+\.js/.test(r.text) && r.text.includes("No other world was substituted") && r.title === "Strange Bloom — No expedition to start" && r.role === "alertdialog";
          if (label === "missing") { await shot(q2, "10-missing-handoff-failure-state.png"); await Promise.all([q2.waitForURL(u => u.href === MENU, { timeout: 20000 }), q2.click("#xpFailAction")]); await menuReady(q2); }
          await c2.close(); return ok; };
        const okMissing = await failCase("missing", null, "?play=1&expedition=x0123456789abcdef0123");
        const okCorrupt = await failCase("malformed", () => { sessionStorage.setItem("strange-bloom.expedition.index", '["x0123456789abcdef0124"]'); sessionStorage.setItem("strange-bloom.expedition.x0123456789abcdef0124", "{not json at all"); }, "?play=1&expedition=x0123456789abcdef0124");
        const env = X.pack(detail, { token: "x0123456789abcdef0125", fingerprint: cand.fingerprint }), ver = JSON.parse(J(env)); ver.version = 99;
        const okVersion = await failCase("version", s => { sessionStorage.setItem("strange-bloom.expedition.index", '["x0123456789abcdef0125"]'); sessionStorage.setItem("strange-bloom.expedition.x0123456789abcdef0125", s); }, "?play=1&expedition=x0123456789abcdef0125", J(ver));
        const tam = JSON.parse(J(env)); tam.planet.tilemap[0] = tam.planet.tilemap[0] < 0 ? 0 : -1;
        const okIntegrity = await failCase("missing-fresh-tab", null, "?play=1&expedition=x0123456789abcdef0125"); // a valid token opened in a tab that never chose it: missing (the tampered one next)
        const c3 = await context(); await c3.addInitScript(s => { sessionStorage.setItem("strange-bloom.expedition.index", '["x0123456789abcdef0125"]'); sessionStorage.setItem("strange-bloom.expedition.x0123456789abcdef0125", s); }, J(tam));
        const q3 = await newPage(c3, "fail:tampered"); await q3.goto(RUN + "?play=1&expedition=x0123456789abcdef0125"); await waitRun(q3);
        const r3 = await q3.evaluate(() => ({ failed: !!BLOOM_RUN.failed, reason: BLOOM_RUN.summary.reason, sim: typeof BLOOM_API.sim, counters: __XP.calls })); cases.push({ label: "tampered", ...r3 }); await c3.close();
        const noPlanet = JSON.parse(J(env)); noPlanet.planet = null; noPlanet.integrity = X.integrity(noPlanet);
        const okPlanet = await failCase("planet", s => { sessionStorage.setItem("strange-bloom.expedition.index", '["x0123456789abcdef0125"]'); sessionStorage.setItem("strange-bloom.expedition.x0123456789abcdef0125", s); }, "?play=1&expedition=x0123456789abcdef0125", J(noPlanet));
        const okLink = await failCase("link", s => { sessionStorage.setItem("strange-bloom.expedition.index", '["x0123456789abcdef0125"]'); sessionStorage.setItem("strange-bloom.expedition.x0123456789abcdef0125", s); }, "?play=1&expedition=x0123456789abcdef0125&archetype=ocean_archipelago&seed=28", J(env));
        PROOF.failures = cases.map(c => ({ label: c.label, reason: c.reason, failed: c.failed, sim: c.sim, counters: c.counters, text: c.text }));
        const reasons = Object.fromEntries(cases.map(c => [c.label, c.reason]));
        check(okMissing && okCorrupt && okVersion && okIntegrity && okPlanet && okLink && r3.failed && r3.reason === "integrity" && r3.sim === "undefined" && r3.counters.createSim === 0 && reasons.missing === "missing" && reasons.malformed === "malformed" && reasons.version === "version" && reasons.planet === "planet" && reasons.link === "link",
          `${tag} E8 · an unknown token, a corrupt payload, an unsupported version, a planetless payload, a tampered planet (integrity) and an over-specified link each show the explicit failure state (alert dialog, plain copy, no stack trace, the engineering shell hidden, focus on the one action): no sim, no createSim, no generator / search call, no First Bloom, no other world; "Main menu" leads to the Strange Bloom title`, J(reasons)); }
      // ---- E9 · TRAINING unchanged; direct URLs unchanged; ui=legacy; file://
      { const c2 = await context(), q = await newPage(c2, "training");
        await q.goto(MENU + "?bg=2&workers=2"); await menuReady(q);
        await Promise.all([q.waitForURL(/demo-run\.html\?training=1&return=/, { timeout: 20000 }), q.click('.mm-item[data-act="training"]')]); await waitRun(q); await waitProd(q);
        await q.waitForFunction(() => { const c = document.getElementById("trainingCover"); return !c || getComputedStyle(c).display === "none"; }, null, { timeout: 10000 });
        const t = await q.evaluate(() => ({ training: !!BLOOM_RUN.training, planet: BLOOM_RUN.planet.id, paused: !BLOOM_API.state().running, xp: !!BLOOM_RUN.expedition, menu: BLOOM_RUN_UI.adapter.runMenu().items.map(a => a.id), ss: Object.keys(sessionStorage).filter(k => k.startsWith("strange-bloom.expedition")), cover: !!document.getElementById("expeditionCover"), title: document.title, counters: __XP.calls }));
        check(t.training && t.planet === "training_grounds" && t.paused && !t.xp && J(t.menu) === J(["restartTraining", "skipTraining", "mainMenu"]) && !t.ss.length && !t.cover && t.title === "Strange Bloom — Training · Training Grounds" && t.counters.createSim === 1 && GEN_NAMES.every(n => t.counters[n] === 0),
          `${tag} E9 · TRAINING is not an expedition: the title's TRAINING opens demo-run.html?training=1&return= (the 028D1 path), paused on Training Grounds with its own three actions, no handoff written, no arrival cover, its own black lift`, J(t.menu));
        await c2.close();
        const direct = [];
        for (const [q2, want] of [["", { kind: "authored", id: "first_bloom", gen: 0 }], ["?planet=training_grounds", { kind: "authored", id: "training_grounds", gen: 0 }], ["?archetype=ocean_archipelago&seed=28", { kind: "procedural", id: "proc_", gen: 1, seed: 28 }], ["?archetype=ocean_archipelago&seed=13&scenario=dying_world", { kind: "procedural", id: "proc_", gen: 1, scenario: "dying_world" }], ["?play=1", { kind: "authored", id: "first_bloom", gen: 0, acts: ["playAgain", "changePlanet", "home"] }]]) {
          const c3 = await context(), r = await newPage(c3, "direct" + q2); await r.goto(RUN + q2); await waitRun(r); await waitProd(r);
          const d = await r.evaluate(() => ({ kind: BLOOM_RUN.kind, id: BLOOM_RUN.planet.id, seed: BLOOM_RUN.seed, scenario: BLOOM_RUN.scenario ? BLOOM_RUN.scenario.id : null, xp: !!BLOOM_RUN.expedition, pv: document.querySelectorAll(".pv").length, counters: __XP.calls, acts: BLOOM_RUN_UI.adapter.runMenu() ? BLOOM_RUN_UI.adapter.runMenu().items.map(a => a.id) : null, cover: !!document.getElementById("expeditionCover") }));
          // (a generated direct run calls the generator once, exactly as before; its validator layers build witness sims, so createSim is ≥ 1 there)
          direct.push([q2 || "(none)", d.kind === want.kind && d.id.startsWith(want.id) && !d.xp && d.pv === 1 && d.counters.generateFromArchetype === want.gen && (want.gen ? d.counters.createSim >= 1 : d.counters.createSim === 1) && (want.seed === undefined || d.seed === want.seed) && (want.scenario === undefined || d.scenario === want.scenario) && (want.acts === undefined || J(d.acts) === J(want.acts)) && !d.cover, { kind: d.kind, id: d.id, gen: d.counters.generateFromArchetype, sims: d.counters.createSim }]);
          await c3.close(); }
        const c4 = await context(), l = await newPage(c4, "legacy"); await l.goto(RUN + "?archetype=ocean_archipelago&seed=28&ui=legacy"); await waitRun(l); await sleep(400);
        const lg = await l.evaluate(() => ({ pv: !!document.querySelector(".pv"), header: getComputedStyle(document.querySelector("body > header")).display, canvas: document.getElementById("cv").width > 100, xp: !!BLOOM_RUN.expedition })); await c4.close();
        const c5 = await context(), f = await newPage(c5, "file"); let fileOk = false; try { await f.goto(FILE); await waitRun(f); await f.waitForFunction(() => BLOOM.planetView && BLOOM.planetView.instance && BLOOM.planetView.instance.renderer.info().frames > 0, null, { timeout: 20000 }); fileOk = await f.evaluate(() => BLOOM_RUN.kind === "authored" && BLOOM_RUN.planet.id === "first_bloom" && !!document.querySelector(".pv") && !BLOOM_RUN.expedition); } catch (e) { fileOk = false; } await c5.close();
        check(direct.every(d => d[1]) && !lg.pv && lg.header !== "none" && lg.canvas && !lg.xp && fileOk, `${tag} E9b · direct boots unchanged: no query (First Bloom), planet=, archetype= & seed= (the generator runs once, as before), scenario=, play=1 (its old action set) all mount production without an expedition or an arrival cover; ui=legacy still shows the engineering shell; the standalone file:// run still boots`,
          J({ direct, legacy: lg, fileOk })); }
      // ---- E10 · storage bounded and session-only; no external requests; no errors; no unhandled rejections
      { await p.goto(MENU + "?bg=3&workers=3&sector=77"); await menuReady(p);
        const st = await p.evaluate(() => ({ ss: Object.keys(sessionStorage).filter(k => k.startsWith("strange-bloom.expedition")), index: JSON.parse(sessionStorage.getItem("strange-bloom.expedition.index") || "[]"), ls: Object.keys(localStorage), lsPlanet: Object.keys(localStorage).filter(k => /tilemap|sections|gridWidth|expedition/.test(k + (localStorage.getItem(k) || ""))), max: BLOOM.expedition.MAX_HANDOFFS }));
        PROOF.storage = st;
        const external = reqs.filter(u => !u.startsWith(ORIGIN) && !u.startsWith("file://") && !u.startsWith("data:") && !u.startsWith("blob:"));
        check(st.index.length <= st.max && st.ss.length === st.index.length + 1 && st.index.length === st.max && !st.lsPlanet.length && !external.length && !errs.length,
          `${tag} E10 · after ${PICKS.length + 1} departures the session holds exactly MAX_HANDOFFS (${st.max}) handoffs + the index (older ones pruned), localStorage holds no world payload or expedition; ${reqs.length} requests all to the test origin; no console error or page error on any page`, J({ ss: st.ss.length, index: st.index.length, ls: st.ls, external: external.slice(0, 3), errs: errs.slice(0, 5) })); }
      if (EVIDENCE) { // the descent under cloud cover: a departure held under the cover (the page's own development hold) for the still
        const c2 = await context(), q = await newPage(c2, "evidence-descent"); await q.goto(MENU + "?bg=3&workers=3&sector=77&hold=2500"); await menuReady(q); await q.click('.mm-item[data-act="begin"]'); await surveyReady(q);
        await q.evaluate(() => MENU_DEV.entry.survey.select(4)); await q.waitForFunction(() => MENU_DEV.entry.survey.state === "focus", null, { timeout: 20000 }); await q.click(".ds-btn.go");
        await q.waitForFunction(() => document.querySelector(".atx") && document.querySelector(".atx").dataset.atxPhase === "concealing", null, { timeout: 10000, polling: 10 }); await sleep(900); await shot(q, "04a-dramatic-descent-concealing.png");
        await q.waitForFunction(() => document.querySelector(".atx") && document.querySelector(".atx").dataset.atxPhase === "covered", null, { timeout: 10000, polling: 10 }); await sleep(300); await shot(q, "04b-dramatic-descent-full-cover.png");
        await q.waitForURL(/expedition=/, { timeout: 30000 }); await waitRun(q);
        // the first production frame UNDER the arrival cover: the lift's fade paused at its start (opacity 1), then released
        await q.waitForFunction(() => BLOOM.expeditionArrival.instance && BLOOM.expeditionArrival.stats.state === "lifting", null, { timeout: 15000, polling: 5 });
        await q.evaluate(() => { const a = BLOOM.expeditionArrival.instance.el.getAnimations()[0]; if (a) { a.pause(); a.currentTime = 0; } }); await shot(q, "04c-arrival-cover-first-frame.png");
        await q.evaluate(() => { const a = BLOOM.expeditionArrival.instance.el.getAnimations()[0]; if (a) a.play(); });
        await waitProd(q); await waitLift(q); await frames(q, 2); await shot(q, "06-same-planet-in-gameplay-map.png"); await c2.close(); }
      await c.close();
    } finally { await browser.close(); }
  }
  server.close();
  if (EVIDENCE) { fs.writeFileSync(path.join(EVD, "identity-proof.json"), J(PROOF, null, 2)); info("evidence", `docs/evidence/bloom-029f/ (identity-proof.json, ${fs.readdirSync(EVD).filter(f => f.endsWith(".png")).length} stills)`); }
  const proven = PROOF.worlds.filter(w => w.surveyFingerprint === w.gameplayFingerprint && w.planetJsonIdentical && !w.authoritativeDifferences.length && !w.generatorOrSearchCalled);
  check(proven.length >= 3 && new Set(proven.map(w => w.classId)).size === 3 && proven.some(w => w.pick.includes("scanned")), `identity proof: ${proven.length} worlds of ${new Set(proven.map(w => w.classId)).size} classes (one from a scanned second sector) with survey fingerprint == gameplay fingerprint, identical planet JSON, zero authoritative differences and no generator / search call`, proven.map(w => `${w.candidateKey} ${w.classId} ${w.surveyFingerprint}`).join(" · "));
  console.log(fails ? `\n${fails} check(s) FAILED  (${((Date.now() - t0) / 1000).toFixed(1)} s)` : `\nALL CHECKS PASS  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
