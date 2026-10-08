// BLOOM — player game flow QA (BLOOM-016). Numbered after the directive's items 1–58 (51–58 = the other suites, run
// separately: README → QA). Two parts:
//   A · Node: the launcher's copy is data (content/play.js, archetype `display`, scenario `display.card`) and is plain data;
//       no difficulty ladder; BLOOM.play.searchWorld runs the REAL production path (generateFromArchetype layers 1–8, then
//       validateScenario layer P for a scenario that changes the run), never starts a rejected candidate, retries the next seed,
//       stops with an explicit failure when every candidate is rejected, stops at once on a DISALLOWED combination (scenario
//       data), never falls back to Eden or another planet, never uses Math.random, never hands back solution data; an accepted
//       World Seed reproduces the same planet
//   B · real browser (file:// = main-thread search; http = worker search): (BLOOM-030) the BLOOM-016 launcher is RETIRED — the root
//       index.html is the Strange Bloom title (RT1; over file:// its HTTP-required notice, RT2) — so its screen checks (1–19, 30 / AA,
//       48–50, R2) went with it, and the player path it launched is driven from its direct developer URL (?play=1&archetype=…&scenario=…):
//       the "Preparing planet…" screen, retry / bounded failure / cancel (→ the title), the accepted run (identity, World Seed, reproducible
//       URL), Play again / Same planet, new world / Change planet (→ the title's Destination Survey) / Home (→ the title), state isolation,
//       First Bloom, Bloom Report + extinction actions, and the developer harness URLs unchanged. The title flow itself:
//       tools/release-check.js
//
//   NODE_PATH="$(npm root -g)" node tools/game-flow-check.js [--shots <dir>] [--no-browser]
//
// Exits 1 on failure.
"use strict";
const path = require("path"), fs = require("fs"), http = require("http");
const ROOT = path.resolve(__dirname, "..");
for (const f of ["content/config.js", "content/traits.js", "planets/first_bloom.js", "content/archetypes.js", "content/scenarios.js", "content/play.js",
  "resources/bloom-sim.js", "resources/bloom-gen.js", "resources/bloom-validate.js", "resources/bloom-witness.js", "resources/bloom-archetype.js",
  "resources/bloom-scenario.js", "resources/bloom-play.js"]) require(path.join(ROOT, f));
const { BLOOM, BLOOM_DATA } = globalThis, { config, traits, archetypes, scenarios, play: PLAYDATA } = BLOOM_DATA;
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const SHOTS = arg("--shots"), NO_BROWSER = process.argv.includes("--no-browser");
const J = o => JSON.stringify(o), clone = o => JSON.parse(J(o));
const fnv = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return (h >>> 0).toString(16).padStart(8, "0"); };
let fails = 0; const t0 = Date.now();
const check = (ok, name, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); if (!ok) fails++; };
const arch = id => archetypes.find(a => a.id === id), scen = id => scenarios.find(s => s.id === id);
const INDEX_SRC = fs.readFileSync(path.join(ROOT, "index.html"), "utf8"), RUN_SRC = fs.readFileSync(path.join(ROOT, "demos/demo-run.html"), "utf8");
// player-visible developer terms (AD): never on a player screen
const JARGON = /\b(archetypes?|layer\s*P|layers?\s*\d|witness(es)?|validat(e|ed|ion|or)|generation attempts?|attempt \d|fixtures?|public seed|sweep)\b/i;
const RANKING = /\b(Easy|Medium|Hard|Extreme|Normal|Difficulty)\b/;

/* ============================== A · Node ============================== */
console.log("— A · Node: data, world search, retry, failure —");
// 7 / 12 · card copy comes from data, once
const dA = archetypes.map(a => a.display || {}), dS = scenarios.map(s => (s.display && s.display.card) || {});
check(dA.every(d => d.tagline && d.character && d.cue && d.detail && d.icon && Number.isInteger(d.previewSeed))
  && dA.every(d => ![d.tagline, d.cue, d.detail, d.character].some(t => INDEX_SRC.includes(t) || RUN_SRC.includes(t))),
  "7 · planet descriptions come from data (content/archetypes.js display: tagline, character, cue, detail, icon, previewSeed); none is written into index.html or demo-run.html",
  archetypes.map(a => `${a.name}: "${a.display.tagline}"`).join(" · "));
check(dS.every(c => c.tagline && c.detail && c.cue && c.icon) && dS.every(c => ![c.tagline, c.cue, c.detail].some(t => INDEX_SRC.includes(t) || RUN_SRC.includes(t)))
  && [PLAYDATA.home.premise, PLAYDATA.firstBloom.tagline, PLAYDATA.briefing.goal].every(t => !INDEX_SRC.includes(t)),
  "12 · scenario descriptions come from data (content/scenarios.js display.card), flow copy from content/play.js; none is duplicated into the pages",
  scenarios.map(s => `${s.name}: "${s.display.card.tagline}"`).join(" · "));
check(!/function|=>/.test(J(BLOOM_DATA.play) + J(archetypes) + J(scenarios)) && J(clone(BLOOM_DATA.play)) === J(BLOOM_DATA.play)
  && J(clone(archetypes)) === J(archetypes) && J(clone(scenarios)) === J(scenarios) && !/<[a-z]/i.test(J(BLOOM_DATA.play) + J(dA) + J(dS)),
  "7/12b · the display metadata and flow content are plain data (no code, no DOM markup)");
check(!RANKING.test(J(dS) + J(dA) + J(PLAYDATA)) && scenarios.every(s => !("difficulty" in s) && !("difficulty" in (s.display || {})))
  && dS.filter(c => c.tag).every(c => c.tag === "Relaxed"),
  "13 · no Easy / Medium / Hard ranking anywhere in the selection data; the only tag is Eden's \"Relaxed\"", dS.map(c => c.tag || "—").join(", "));

// spies on the production path (the module functions the search calls through BLOOM.*)
const CALLS = { gen: [], scen: [], random: 0 };
const realGen = BLOOM.generateFromArchetype, realScen = BLOOM.validateScenario;
BLOOM.generateFromArchetype = (A, seed, o) => { CALLS.gen.push({ id: A.id, seed, cfg: o.config === config, traits: o.traits === traits }); return realGen(A, seed, o); };
BLOOM.validateScenario = (p, c, t, S, o) => { CALLS.scen.push({ s: S.id, planet: p.id, arch: o.archetypeId }); return realScen(p, c, t, S, o); };
const realRandom = Math.random; Math.random = () => { CALLS.random++; return realRandom(); };
const reset = () => { CALLS.gen = []; CALLS.scen = []; CALLS.random = 0; };
const search = (aid, sid, seeds) => { const steps = [], r = BLOOM.play.runSearch({ archetype: arch(aid), scenario: sid ? scen(sid) : null, seeds, config, traits }, s => steps.push(s)); return { r, steps }; };

// 21 / 22 / 31 / 32 / 33 · a pressure combination: real layers 1–8 then real layer P on the same world
reset(); let { r: fz, steps: fzSteps } = search("frozen_world", "volatile_climate", [11]);
check(fz.ok && CALLS.gen.length === 1 && CALLS.gen[0].id === "frozen_world" && CALLS.gen[0].seed === 11 && CALLS.gen[0].cfg && CALLS.gen[0].traits
  && J(fz.planet.archetype.validatedLayers) === J([1, 2, 3, 4, 5, 6, 7, 8]),
  "21/22 · Start runs the real production generator for the chosen planet (generateFromArchetype with the game's config + traits: layers 1–8)",
  `Frozen World seed 11 → ${fz.planet.name}, attempt ${fz.planet.archetype.attempt}, layers ${fz.planet.archetype.validatedLayers.join("")}`);
check(CALLS.scen.length === 1 && CALLS.scen[0].s === "volatile_climate" && CALLS.scen[0].planet === fz.planet.id && CALLS.scen[0].arch === "frozen_world"
  && fz.scenarioValidation && fz.scenarioValidation.status === "PASS",
  "23 · a scenario that changes the run invokes the real layer P (validateScenario) on that same world", `${J(fz.scenarioValidation)} · steps ${fzSteps.map(s => s.step).join("→")}`);
check(fz.planet.archetype.id === "frozen_world" && fz.seed === 11 && fz.planet.archetype.publicSeed === 11,
  "31/33 · the accepted world is the selected planet and records its World Seed");
const FPRI = realGen(arch("frozen_world"), 11, { config, traits });
check(fnv(J(fz.planet.tilemap)) === fnv(J(FPRI.tilemap)) && fz.planet.name === FPRI.name && J(fz.planet.sections) === J(FPRI.sections),
  "33b · reproducible: generating the same World Seed again gives the identical planet (tilemap, regions, name)", `${FPRI.name} tilemap ${fnv(J(FPRI.tilemap))}`);
reset(); const ed = search("frozen_world", "eden", [11]).r;
check(ed.ok && CALLS.scen.length === 0 && ed.scenarioValidation === null, "23b · Eden adds nothing to prove: no layer P call, the planet's layers 1–8 only");
// 20 · nothing the validators found reaches the run
const noSolutions = res => { const s = J(res); return !/witness|"strategies"|minimalBuild|signature|"purchases"|rejectedAttempts"/.test(s); };
check(noSolutions(fz) && noSolutions(ed) && !("strategies" in fz.scenarioValidation),
  "20 · no witness strategy is exposed: the accepted world carries no witness plan, strategy signatures or builds (only a proven-strategy count)",
  Object.keys(fz.planet.archetype).join(","));

// 24 / 25 · a scenario-rejected candidate is never returned; the search moves on
// (BLOOM-027B: no Frozen World seed is rejected by Dying World layer P any more — scanned seeds 1–120 — so the scenario-rejection roles use Ocean 7342 (Native
// Competition layer P INCONCLUSIVE → rejected) and Ocean 30 (accepted); the no-acceptable-planet role uses Ocean 114 (the generator's known failure, was 7))
reset(); const { r: rt, steps: rtSteps } = search("ocean_archipelago", "native_competition", [7342, 30]);
check(rt.ok && rt.seed === 30 && J(rt.tried.map(t => t.outcome)) === J(["scenario", "accepted"]) && rt.tried[0].status !== "PASS"
  && CALLS.scen.length === 2 && rt.planet.archetype.publicSeed === 30,
  "24/25 · a candidate layer P rejects is not started; the search retries the next World Seed and starts only the accepted one",
  `tried ${rt.tried.map(t => `${t.seed}:${t.outcome}${t.status ? "/" + t.status : ""}`).join(", ")} · steps ${rtSteps.map(s => s.step).join("→")}`);
reset(); const pl = search("ocean_archipelago", "eden", [114, 28]).r;
check(pl.ok && pl.seed === 28 && J(pl.tried.map(t => t.outcome)) === J(["planet", "accepted"]) && CALLS.gen.every(c => c.id === "ocean_archipelago"),
  "24/25b · a World Seed with no acceptable planet (archetype layers) is skipped the same way", `tried ${pl.tried.map(t => `${t.seed}:${t.outcome}`).join(", ")}`);
// 26 / 27 / 28 · bounded failure: explicit, no Eden, no other planet
reset(); const bf = search("ocean_archipelago", "native_competition", [7342]);
check(!bf.r.ok && bf.r.status === "EXHAUSTED" && !bf.r.planet && bf.r.tried.length === 1 && !bf.steps.some(s => s.step === "ready"),
  "26 · when every candidate is rejected the search ends in an explicit failure (no world)", `${bf.r.status}: ${bf.r.reason}`);
check(CALLS.scen.every(c => c.s === "native_competition") && CALLS.gen.every(c => c.id === "ocean_archipelago") && !bf.r.scenarioValidation,
  "27/28 · no silent Eden fallback and no silent planet substitution: every call is the chosen planet + chosen scenario");
// DISALLOWED (R) is scenario data, decided before any generation
const DIS = clone(scen("native_competition")); DIS.validation.archetypes = { desert_world: { allowed: false, reason: "test-only reason from data" } };
reset(); const ds = BLOOM.play.runSearch({ archetype: arch("desert_world"), scenario: DIS, seeds: [25, 9], config, traits });
check(!ds.ok && ds.status === "DISALLOWED" && ds.reason === "test-only reason from data" && CALLS.gen.length === 0
  && BLOOM.play.availability(DIS, "desert_world").allowed === false && BLOOM.play.availability(DIS, "frozen_world").allowed === true
  && scenarios.every(s => archetypes.every(a => BLOOM.play.availability(s, a.id).allowed)),
  "R · a combination the scenario data marks DISALLOWED stops at once with the data's own reason (no generation); every shipped combination is allowed");
// N · seeds: picked from the caller's random source (crypto in the browser), never Math.random, distinct, in range, avoiding the last world
let q = 0; const fake = () => [5, 5, 99998, 12345, 0, 7, 3][q++ % 7];
const ps = BLOOM.play.pickSeeds(4, PLAYDATA.search, fake, 6);
check(J(ps) === J([99999, 12346, 1, 8]),
  "N · pickSeeds: distinct World Seeds in range from the caller's random source, skipping the seed to avoid", J(ps));
check(CALLS.random === 0, "N2 · the world search, generator and layer P never call Math.random (the run's own live RNG is separate)", `${CALLS.random} calls during ${CALLS.gen.length ? "" : "all "}searches above`);
Math.random = realRandom; BLOOM.generateFromArchetype = realGen; BLOOM.validateScenario = realScen;
check(PLAYDATA.search.maxCandidates >= 2 && PLAYDATA.search.maxCandidates <= 12, "L · the search is bounded by data (content/play.js search.maxCandidates)", `${PLAYDATA.search.maxCandidates} candidates`);
check(BLOOM.play.runQuery({ archetype: "frozen_world", seed: 11, scenario: "volatile_climate" }) === "play=1&archetype=frozen_world&seed=11&scenario=volatile_climate",
  "U · a run's URL keeps the existing query parameters (+ play=1)");

if (NO_BROWSER) { finish(); return; }

/* ============================== B · browser ============================== */
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css", ".png": "image/png", ".json": "application/json" };
const server = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0].split("#")[0]), f = path.join(ROOT, u === "/" ? "index.html" : u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(res); });
(async () => {
  let chromium; try { ({ chromium } = require("playwright")); } catch (e) { check(false, "playwright available (npm i -g playwright)"); return finish(); }
  await new Promise(r => server.listen(0, "127.0.0.1", r)); const HTTP = `http://127.0.0.1:${server.address().port}`;
  const FILE = "file://" + encodeURI(ROOT);
  if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch();
  const errs = [];
  const newPage = async (vp = { width: 1366, height: 800 }) => { const ctx = await browser.newContext({ viewport: vp }); const p = await ctx.newPage();
    p.on("pageerror", e => errs.push(e.message)); p.on("console", m => { if (m.type() === "error") errs.push(m.text()); }); return p; };
  const shot = async (p, n) => { if (SHOTS) await p.screenshot({ path: path.join(SHOTS, n + ".png") }); };
  const visible = (p, sel) => p.$eval(sel, e => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none"; }).catch(() => false);
  const text = p => p.evaluate(() => document.body.innerText);
  // (BLOOM-029E) the run page's player UI is the production Planet View by default: its run menu (#pvMenuBtn / #pvMenu) and its report (#rr) carry the page's own actions
  const menuAct = async (p, act, answer) => { if (answer) p.once("dialog", d => answer === "accept" ? d.accept() : d.dismiss());
    if (await p.evaluate(() => document.getElementById("pvMenu").hidden)) await p.click("#pvMenuBtn");
    await p.click(`#pvMenu [data-act="${act}"]`); };
  const screenOn = p => p.evaluate(() => [...document.querySelectorAll(".screen.on")].map(e => e.id).join(","));
  const waitRun = (p, ms = 180000) => p.waitForFunction(() => (window.BLOOM_API && window.BLOOM_API.sim) || (window.BLOOM_API && window.BLOOM_API.run && window.BLOOM_API.run.failed), null, { timeout: ms });
  const ident = p => p.evaluate(() => ({ url: location.search, run: BLOOM_API.run, planet: BLOOM_RUN.planet.name, tiles: (() => { let h = 0x811c9dc5; const s = Array.from(BLOOM_API.sim.map.TILEMAP).join(","); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; })(),
    footer: document.getElementById("runId").textContent, title: document.title, scenario: BLOOM_RUN.scenario ? BLOOM_RUN.scenario.id : null, play: !!BLOOM_RUN.play }));

  // warm-up page (the first page of a headless session can read canvases back blank)
  { const w = await newPage(); await w.goto(FILE + "/demos/demo-run.html"); await w.waitForTimeout(200); await w.close(); }

  // ---- RT · (BLOOM-030) the BLOOM-016 launcher is retired: the repository root is the Strange Bloom title ----
  // Its Home / planet / scenario / briefing screens, hash routes, emoji cards, mini-map previews and their checks (1–19, 30 / AA / AA2,
  // 48–50, R2, the briefing Cancel target) went with it; what they launched — this run page's player path — is checked below from its
  // direct developer URL, unchanged. The title itself (paintings, BEGIN EXPEDITION, TRAINING, the survey, the exact handoff, returns,
  // keyboard, viewports, file:// notice) is tools/release-check.js and the 028C–029F suites.
  const p = await newPage();
  { const t = await newPage(); await t.goto(HTTP + "/"); await t.waitForFunction(() => window.MENU_DEV && MENU_DEV.ready, null, { timeout: 30000 });
    const r = await t.evaluate(() => ({ title: document.title, items: [...document.querySelectorAll(".mm-item")].map(b => b.dataset.act), launcher: ["scrHome", "scrPlanets", "scrScenarios", "scrBrief", "btnFirstBloom", "btnChoose", "planetCards", "scenarioCards"].filter(id => document.getElementById(id)), api: typeof window.BLOOM_LAUNCHER, hash: location.hash }));
    await t.evaluate(() => { location.hash = "#/brief/frozen_world/volatile_climate"; }); await t.waitForTimeout(200);
    const routed = await t.evaluate(() => ({ screens: document.querySelectorAll(".screen.on").length, state: MENU_DEV.entry.state }));
    check(r.title === "Strange Bloom — Unknown Soils" && J(r.items) === J(["begin", "training", "settings", "credits"]) && !r.launcher.length && r.api === "undefined" && !routed.screens && routed.state === "menu"
      && !/#\/(planet|scenario|brief)|BLOOM_LAUNCHER|scrBrief|btnFirstBloom/.test(INDEX_SRC),
      "RT1 · the root index.html is the Strange Bloom title (BEGIN EXPEDITION · TRAINING · SETTINGS · CREDITS); the BLOOM-016 launcher's screens, buttons, hash router and BLOOM_LAUNCHER are gone (a launcher hash route does nothing)", J({ title: r.title, items: r.items }));
    await t.context().close(); }
  { await p.goto(FILE + "/index.html"); await p.waitForFunction(() => window.MENU_DEV && MENU_DEV.ready, null, { timeout: 30000 }).catch(() => {}); await p.waitForTimeout(300);
    const r = await p.evaluate(() => ({ title: document.title, note: !!document.getElementById("needsServer"), boot: window.BLOOM_TITLE_BOOT && BLOOM_TITLE_BOOT.state, items: [...document.querySelectorAll(".mm-item")].map(b => b.dataset.act), launcher: !!document.getElementById("scrHome") }));
    check(r.title === "Strange Bloom — Unknown Soils" && !r.note && r.boot === "mounted" && J(r.items) === J(["begin", "training", "settings", "credits"]) && !r.launcher,
      "RT2 · (BLOOM-031) over file:// the root is the Strange Bloom title itself (the generated portable runtime; the HTTP-required notice is retired), not the old launcher and not a blank page", J(r)); }

  // ---- 21 / 29 / 31–33 · Start → Preparing planet → the accepted run (file://: the search runs between frames) ----
  await p.goto(FILE + "/demos/demo-run.html?play=1&archetype=frozen_world&scenario=volatile_climate", { waitUntil: "commit" }); // (BLOOM-030) the direct developer player URL
  await p.waitForSelector("#prep", { timeout: 5000 }).catch(() => {});
  let prepSeen = await visible(p, "#prep"), prepTxt = prepSeen ? await p.textContent("#prep") : "";
  await shot(p, "06-preparing");
  await waitRun(p);
  const run1 = await ident(p), log1 = await p.evaluate(() => window.BLOOM_PLAY_LOG);
  check(prepSeen && prepTxt.includes(PLAYDATA.loading.title) && prepTxt.includes("Frozen World · Volatile Climate") && !JARGON.test(prepTxt),
    "29 · loading feedback is visible: \"Preparing planet…\", the chosen planet + scenario, the current step, Cancel", prepTxt.replace(/\s+/g, " ").slice(0, 160));
  check(log1.state === "accepted" && log1.steps.some(s => s.step === "terrain") && log1.steps.some(s => s.step === "scenario") && log1.mode === "main",
    "21b · the player URL began a real world search (steps: terrain → scenario → ready); over file:// it runs on the page between frames", `${log1.mode} · ${log1.steps.map(s => s.step).join("→")} · tried ${J(log1.tried)}`);
  check(run1.run.archetypeId === "frozen_world" && run1.scenario === "volatile_climate" && run1.run.scenarioId === "volatile_climate" && run1.run.scenarioValidation.status === "PASS",
    "31/32 · the accepted run is the selected planet + the selected scenario (layer P passed on it)", `${run1.planet} · ${run1.run.archetype} · ${run1.run.scenario}`);
  const seed1 = run1.run.publicSeed;
  check(run1.url === `?play=1&archetype=frozen_world&seed=${seed1}&scenario=volatile_climate` && run1.footer.includes(`World Seed: ${seed1}`) && seed1 >= 1 && seed1 <= 99999,
    "33/O/U · the World Seed is chosen automatically, shown (\"World Seed: N\") and written into the address (reload = the same world)", `${run1.footer} · ${run1.url}`);
  const runText = await text(p);
  const runData = await p.evaluate(() => JSON.stringify([BLOOM_RUN.summary, BLOOM_RUN.planet.archetype, BLOOM_API.run, window.BLOOM_PLAY_LOG]));
  check(!JARGON.test(runText) && !/witness|minimalBuild|signature|"strategies"|"purchases"/.test(runData) && !/layer P/.test(run1.footer),
    "AD · the player's run screen shows no developer terms and the page holds no solution data", (runText.match(JARGON) || ["none"])[0]);
  await shot(p, "07-run");
  // the run menu (S): obvious routes out of a live run, with a confirmation
  await p.click("#pvMenuBtn"); await p.waitForTimeout(100);
  const menu = await p.$$eval("#pvMenu [data-act]", bs => bs.map(b => b.dataset.act));
  check(await visible(p, "#pvMenu") && J(menu) === J(["playAgain", "newWorld", "changePlanet", "home"]),
    "S · an active run has an obvious Menu: Play this world again · Same planet, new world · Change planet · Home (BLOOM-030: no Change scenario — the product has no scenario chooser; scenarios stay direct URLs)", menu.join(", "));
  await shot(p, "08-menu");
  let dlg = null; p.once("dialog", d => { dlg = d.message(); d.dismiss(); });
  await menuAct(p, "changePlanet"); await p.waitForTimeout(200);
  check(dlg === PLAYDATA.actions.confirmLeave && /demo-run\.html/.test(p.url()), "S2 · leaving a live run asks first; declining keeps the run", dlg || "no dialog");

  // ---- 37 / 42 · Play again: same planet + World Seed + scenario, a fresh state ----
  await p.evaluate(() => { window.__oldPage = true; BLOOM_API.addBiomass(5000); BLOOM_API.buy("warm"); BLOOM_API.buy("warm"); BLOOM_API.buy("cold"); BLOOM_API.advance(400); });
  const dirty = await p.evaluate(() => ({ tf: BLOOM_API.sim.tf.warm, steps: BLOOM_API.climate().forcing.length, bio: Math.floor(BLOOM_API.sim.biomass) }));
  await menuAct(p, "playAgain", "accept");
  await p.waitForFunction(() => !window.__oldPage && window.BLOOM_API && window.BLOOM_API.sim, null, { timeout: 120000 });
  const run2 = await ident(p);
  const fresh = await p.evaluate(() => { const s = BLOOM_API.sim; return { old: !!window.__oldPage, ticks: s.ticks, owned: BLOOM_DATA.traits.filter(u => s.ownedTier(u) > 0).map(u => u.id), tf: { ...s.tf },
    forcing: BLOOM_API.climate().forcing.length, shocks: BLOOM_API.climate().shocks.length, spec: s.colonies.spec.filter(Boolean).length, lost: s.lost, won: s.won,
    bio: s.biomass, log: document.getElementById("log").textContent }; });
  check(run2.run.publicSeed === seed1 && run2.run.archetypeId === "frozen_world" && run2.scenario === "volatile_climate" && run2.tiles === run1.tiles && run2.planet === run1.planet,
    "37 · Play this world again = the same planet, World Seed and scenario (identical map)", `${run2.planet} seed ${run2.run.publicSeed} map ${run2.tiles}`);
  check(dirty.tf > 0 && dirty.steps > 0 && !fresh.old && fresh.owned.length === 0 && J(Object.values(fresh.tf).filter(Boolean)) === "[]" && fresh.forcing === 0 && fresh.shocks === 0
    && fresh.spec === 0 && !fresh.lost && !fresh.won && fresh.ticks < 400,
    "42/Z · the replay starts clean: a new page, no purchased traits, no Terraform, no instability or shocks, no colony upgrades from the abandoned run",
    `before: Warm the Sky ×${dirty.tf}, ${dirty.steps} forcing steps · after: ${J(fresh.owned)} owned, ${fresh.forcing} steps, tick ${fresh.ticks}`);

  // ---- 38 / 41 · Same planet, new world ----
  await p.evaluate(() => { window.__oldPage = true; });
  await menuAct(p, "newWorld", "accept");
  await p.waitForFunction(() => !window.__oldPage && window.BLOOM_API && window.BLOOM_API.sim, null, { timeout: 180000 });
  const run3 = await ident(p);
  check(run3.run.archetypeId === "frozen_world" && run3.scenario === "volatile_climate" && run3.run.publicSeed !== seed1 && run3.url.includes(`seed=${run3.run.publicSeed}`),
    "38 · Same planet, new world = the same planet + scenario with a new World Seed", `${seed1} → ${run3.run.publicSeed} (${run3.planet})`);
  const fresh3 = await p.evaluate(() => ({ owned: BLOOM_DATA.traits.filter(u => BLOOM_API.sim.ownedTier(u) > 0).length, forcing: BLOOM_API.climate().forcing.length }));
  check(fresh3.owned === 0 && fresh3.forcing === 0 && run3.tiles !== run1.tiles, "41 · a new run is genuinely new (new page, new map, nothing purchased)");

  // ---- 39 / 40 · (BLOOM-030) Change planet → the root title's Destination Survey; Home → the root title (http: the title needs a server) ----
  { const t = await newPage(); await t.goto(HTTP + "/demos/demo-run.html?play=1&archetype=frozen_world&seed=11&scenario=eden"); await waitRun(t);
    await Promise.all([t.waitForURL(u => u.pathname === "/index.html" && u.searchParams.get("begin") === "1", { timeout: 20000 }), menuAct(t, "changePlanet", "accept")]);
    await t.waitForFunction(() => window.MENU_DEV && MENU_DEV.entry && MENU_DEV.entry.state === "survey", null, { timeout: 90000 });
    const cp = await t.evaluate(() => ({ url: location.pathname + location.search, state: MENU_DEV.entry.state }));
    await t.goto(HTTP + "/demos/demo-run.html?play=1&archetype=frozen_world&seed=11&scenario=eden"); await waitRun(t);
    await Promise.all([t.waitForURL(u => u.pathname === "/index.html" && !u.search, { timeout: 20000 }), menuAct(t, "home", "accept")]);
    await t.waitForFunction(() => window.MENU_DEV && MENU_DEV.ready, null, { timeout: 30000 });
    const hm = await t.evaluate(() => ({ url: location.pathname + location.search, state: MENU_DEV.entry.state, title: document.title }));
    check(cp.state === "survey" && cp.url === "/index.html" && hm.state === "menu" && hm.url === "/index.html" && hm.title === "Strange Bloom — Unknown Soils",
      "39/40 · Change planet opens the Strange Bloom title's Destination Survey at once (begin=1, consumed); Home returns to the title — never the retired launcher", J({ cp, hm }));
    await t.context().close(); }

  // ---- 24–28 in the browser: retry, bounded failure ----
  await p.goto(FILE + "/demos/demo-run.html?play=1&archetype=ocean_archipelago&scenario=native_competition&candidates=7342,30"); await waitRun(p);
  const rlog = await p.evaluate(() => window.BLOOM_PLAY_LOG), rrun = await ident(p);
  check(rrun.run.publicSeed === 30 && J(rlog.tried.map(t => t.outcome)) === J(["scenario", "accepted"]) && rlog.steps.some(s => s.step === "retry") && rrun.url.includes("seed=30"),
    "24/25c · in the page: the rejected World Seed is skipped (\"Finding another…\") and only the accepted one starts", J(rlog.tried));
  await p.goto(FILE + "/demos/demo-run.html?play=1&archetype=ocean_archipelago&scenario=native_competition&candidates=7342"); await waitRun(p);
  const ff = await p.evaluate(() => ({ api: window.BLOOM_API, sim: !!(window.BLOOM_API && window.BLOOM_API.sim), run: window.BLOOM_RUN || null, txt: document.getElementById("playFail") ? document.getElementById("playFail").innerText : "",
    btns: [...document.querySelectorAll("#playFail button")].map(b => b.id), go: [...document.querySelectorAll("#playFail button")].map(b => b.dataset.go), focus: document.activeElement.id }));
  check(!ff.sim && !ff.run && ff.txt.includes(PLAYDATA.failure.title) && ff.txt.includes("Ocean Archipelago") && ff.txt.includes("Native Competition") && !JARGON.test(ff.txt)
    && J(ff.btns) === J(["failRetry", "failChange", "failHome"]) && ff.focus === "failRetry" && J(ff.go) === J(["demo-run.html?play=1&archetype=ocean_archipelago&scenario=native_competition", "../index.html?begin=1", "../index.html"]),
    "26/27/28 · bounded failure: a friendly explicit screen (Try again / Change selection / Home), nothing started, no Eden or other planet swapped in; (BLOOM-030) Change selection = the title's Destination Survey, Home = the title", ff.txt.replace(/\s+/g, " ").slice(0, 170));
  await shot(p, "09-no-world");
  await p.goto(FILE + "/demos/demo-run.html?play=1&archetype=moon_base&scenario=eden"); await waitRun(p);
  check(!!(await p.$("#playFail")) && !(await p.evaluate(() => !!(window.BLOOM_API && window.BLOOM_API.sim))), "26b · an unknown planet in a player link starts nothing (friendly screen)");

  // ---- 34–36 · the developer harness is unchanged ----
  await p.goto(FILE + "/demos/demo-run.html?archetype=frozen_world&seed=11&scenario=volatile_climate"); await p.waitForFunction(() => window.BLOOM_API && window.BLOOM_API.sim);
  const dev = await ident(p);
  check(!dev.play && dev.run.publicSeed === 11 && dev.run.attempt === 1 && dev.planet === FPRI.name && /public seed 11 · attempt 1/.test(dev.footer) && /layer P PASS/.test(dev.footer)
    && !(await p.$("#pvMenuBtn")) && !(await p.$("#prep")) && dev.url === "?archetype=frozen_world&seed=11&scenario=volatile_climate",
    "34 · the direct developer URL still works exactly as before (same world, developer footer, no player menu, no search, URL untouched)", dev.footer);
  await p.goto(FILE + "/demos/demo-run.html?archetype=frozen_world&seed=11"); await p.waitForFunction(() => window.BLOOM_API && window.BLOOM_API.sim);
  const dev2 = await p.evaluate(() => ({ s: BLOOM_RUN.scenario, id: BLOOM_API.run.scenarioId, pr: BLOOM_API.sim.pressure.active, pid: BLOOM_API.sim.pressure.id, cl: BLOOM_API.sim.climate.enabled, co: BLOOM_API.sim.competition.enabled }));
  check(dev2.s === null && dev2.id === "eden" && dev2.pid === "eden" && dev2.pr === false && !dev2.cl && !dev2.co, "35 · no scenario in a developer URL still means Eden / default behaviour", J(dev2));
  const bad = [];
  for (const u of ["?archetype=frozen_world&seed=abc", "?archetype=frozen_world", "?archetype=nowhere&seed=3", "?archetype=frozen_world&seed=11&scenario=bogus", "?archetype=frozen_world&seed=11&scenario=Bad!"]) {
    await p.goto(FILE + "/demos/demo-run.html" + u); await p.waitForTimeout(150);
    const r = await p.evaluate(() => ({ fail: !!document.getElementById("genFail"), sim: !!(window.BLOOM_API && window.BLOOM_API.sim), search: !!document.getElementById("prep") }));
    if (!r.fail || r.sim || r.search) bad.push(u); }
  check(!bad.length, "36 · malformed developer URLs still fail explicitly (NO WORLD GENERATED / NO RUN STARTED), with no search and no substitute", bad.join(" ") || "5 URLs");

  // ---- 43 / 44 · First Bloom ----
  await p.goto(FILE + "/demos/demo-run.html?play=1"); await p.waitForFunction(() => window.BLOOM_API && window.BLOOM_API.sim); // (BLOOM-030) the retired launcher's First Bloom button opened exactly this URL
  const fbUrl = p.url(), fbP = await p.evaluate(() => { BLOOM_API.advance(0); const st = BLOOM_API.state(); return { kind: BLOOM_RUN.kind, id: BLOOM_RUN.planet.id, play: BLOOM_RUN.play, sections: st.sections, genome: st.genome, sky: st.sky, scen: BLOOM_API.run.scenarioId, footer: document.getElementById("runId").textContent, prep: !!document.getElementById("prep"), menu: !!document.getElementById("pvMenuBtn") }; });
  await p.goto(FILE + "/demos/demo-run.html"); await p.waitForFunction(() => window.BLOOM_API && window.BLOOM_API.sim);
  const fbH = await p.evaluate(() => { const st = BLOOM_API.state(); return { kind: BLOOM_RUN.kind, id: BLOOM_RUN.planet.id, sections: st.sections, genome: st.genome, sky: st.sky, scen: BLOOM_API.run.scenarioId, menu: !!document.getElementById("pvMenuBtn") }; });
  check(/demo-run\.html\?play=1$/.test(fbUrl) && fbP.kind === "authored" && fbP.id === "first_bloom" && fbP.play && !fbP.prep && fbP.menu && !fbH.menu
    && J([fbP.sections, fbP.genome, fbP.sky, fbP.scen]) === J([fbH.sections, fbH.genome, fbH.sky, fbH.scen]),
    "43/44 · First Bloom's player URL (?play=1) opens the accepted authored run straight away (no search): same planet, plant and sky as the plain demo URL, plus the player menu",
    `${fbUrl.split("/").pop()} · ${fbP.footer}`);

  // ---- 45 / 46 · a won run (the page's real buy through the production adapter, earned Biomass): the production Bloom Report + actions ----
  await p.goto(FILE + "/demos/demo-run.html?play=1&archetype=frozen_world&seed=11&scenario=eden"); await waitRun(p);
  await p.evaluate(() => { BLOOM_RUN_UI.adapter.actions.pause(); });
  const plan = ["cold", "cold"]; let bi = 0;
  for (let i = 0; i < 400 && !(await p.evaluate(() => BLOOM_API.sim.won)); i++) {
    if (bi < plan.length && await p.evaluate(id => { const u = BLOOM_RUN_UI.adapter.upgrade(id); return !!(u && u.canBuy); }, plan[bi])) { await p.evaluate(id => BLOOM_RUN_UI.adapter.actions.buy(id), plan[bi]); bi++; }
    await p.evaluate(() => { BLOOM_API.advance(25); }); }
  await p.waitForFunction(() => BLOOM.runReport.instance.state().open && !BLOOM.runReport.instance.state().busy, null, { timeout: 8000 }).catch(() => {}); await p.waitForTimeout(150);
  const win = await p.evaluate(() => ({ on: BLOOM.runReport.instance.state().open, h2: document.getElementById("rrTitle").textContent, sub: document.getElementById("rrSum").textContent,
    plant: !!document.querySelector("#rr .ps-svg"), build: /your plant became/i.test(document.getElementById("rrCard").innerText), cont: !document.getElementById("rrContinue").hidden,
    acts: [...document.querySelectorAll("#rrActs [data-act]")].map(b => b.dataset.act), txt: document.getElementById("rrCard").innerText, legacy: document.getElementById("reportModal").classList.contains("on") }));
  check(win.on && /BLOOM/.test(win.h2) && win.plant && win.build && win.sub.includes("Frozen World · World Seed 11") && win.cont && !win.legacy,
    "45 · the production Bloom Report renders (world identity, build, the production plant specimen, regions, Keep playing); the engineering modal stays closed", win.sub);
  check(J(win.acts) === J(["playAgain", "newWorld", "changePlanet", "home"]) && win.txt.search(/Play this world again/) > win.txt.search(/your plant became/i) && win.txt.search(/your plant became/i) >= 0 && !JARGON.test(win.txt),
    "46 · a win offers Play again / Same planet, new world / Change planet / Home, after the report's science", win.acts.join(", "));
  await shot(p, "10-win-report");
  const wa = await p.evaluate(() => BLOOM_RUN_UI.adapter.reportActions().find(a => a.id === "playAgain").href);
  check(wa === "demo-run.html?play=1&archetype=frozen_world&seed=11&scenario=eden", "T · Play again from the report = same planet + World Seed + scenario", wa);

  // ---- 47 · extinction (Dying World, an idle plant): actions instead of the developer restart ----
  // (BLOOM-027B: Frozen 9 is the world whose idle Dying World run dies out (at ~390–400 s, inside the 3000 ticks advanced here) — no Ocean world's does under the cylindrical generator; see tools/dying-world-check.js FIX)
  await p.goto(FILE + "/demos/demo-run.html?play=1&archetype=frozen_world&seed=9&scenario=dying_world"); await waitRun(p);
  await p.evaluate(() => { BLOOM_RUN_UI.adapter.actions.pause(); BLOOM_API.advance(3000); }); await p.waitForFunction(() => BLOOM.runReport.instance.state().open && !BLOOM.runReport.instance.state().busy, null, { timeout: 8000 }).catch(() => {}); await p.waitForTimeout(150);
  const loss = await p.evaluate(() => ({ lost: BLOOM_API.sim.lost, on: BLOOM.runReport.instance.state().open, why: document.getElementById("rrSum").textContent,
    deb: !!document.querySelector("#rr .rr-why"), restart: !!document.querySelector('#rr [data-act="restartRun"]'), acts: [...document.querySelectorAll("#rrActs [data-act]")].map(b => b.dataset.act), txt: document.getElementById("rrCard").innerText }));
  check(loss.lost && loss.on && loss.deb && !loss.restart && J(loss.acts) === J(["playAgain", "newWorld", "changePlanet", "home"]) && loss.why.includes("World Seed 9") && !JARGON.test(loss.txt),
    "47 · an extinction offers the same actions in the production Extinction report (the debrief stays; the developer \"Restart this run\" is the harness's only)", loss.why.slice(0, 120));
  await shot(p, "11-extinction");
  await p.goto(FILE + "/demos/demo-run.html?archetype=frozen_world&seed=9&scenario=dying_world"); await p.waitForFunction(() => window.BLOOM_API && window.BLOOM_API.sim);
  await p.evaluate(() => { BLOOM_RUN_UI.adapter.actions.pause(); BLOOM_API.advance(3000); }); await p.waitForFunction(() => BLOOM.runReport.instance.state().open && !BLOOM.runReport.instance.state().busy, null, { timeout: 8000 }).catch(() => {}); await p.waitForTimeout(150);
  check(await p.evaluate(() => !!document.querySelector('#rr [data-act="restartRun"]') && JSON.stringify([...document.querySelectorAll("#rrActs [data-act]")].map(b => b.dataset.act)) === '["restartRun"]'), "47b · the developer harness (no play=1) keeps its own extinction action in the production report (Restart this run, no player actions)");

  // ---- worker path (http): responsive loading, cancel, same world as the harness ----
  const h = await newPage();
  await h.goto(HTTP + "/demos/demo-run.html?play=1&archetype=frozen_world&scenario=volatile_climate&candidates=11"); await waitRun(h);
  const hw = await ident(h), hlog = await h.evaluate(() => window.BLOOM_PLAY_LOG);
  check(hlog.mode === "worker" && hw.run.publicSeed === 11 && hw.planet === FPRI.name && hw.run.attempt === 1 && hw.tiles === dev.tiles,
    "M · served over http the search runs in a background worker, and the world it accepts is the production world (Frozen 11 = Pallas-609, attempt 1, same map as the harness)", `${hlog.mode} · ${hw.planet}`);
  // a slow combination: the page stays responsive while the worker checks it, and Cancel stops it
  await h.goto(HTTP + "/demos/demo-run.html?play=1&archetype=ocean_archipelago&scenario=native_competition&candidates=7342");
  await h.waitForSelector("#prep"); await h.waitForTimeout(300);
  const fps = await h.evaluate(() => new Promise(res => { let n = 0; const t = performance.now(); const f = () => { n++; if (performance.now() - t < 1000) requestAnimationFrame(f); else res(n); }; requestAnimationFrame(f); }));
  const stillPrep = await h.evaluate(() => window.BLOOM_PLAY_LOG.state === "running" && window.BLOOM_PLAY_LOG.mode === "worker");
  await shot(h, "12-preparing-worker");
  const tc = Date.now(); await h.click("#prepCancel"); await h.waitForURL(u => u.pathname === "/index.html"); const cancelMs = Date.now() - tc;
  await h.waitForFunction(() => window.MENU_DEV && MENU_DEV.ready, null, { timeout: 30000 }).catch(() => {});
  check(stillPrep && fps >= 20 && cancelMs < 3000 && await h.evaluate(() => !!(window.MENU_DEV && MENU_DEV.ready && MENU_DEV.entry.state === "menu")),
    "M2/S3 · while a slow check runs (Ocean + Native Competition) the loading screen keeps animating and Cancel leaves at once for the Strange Bloom title (BLOOM-030; the briefing is retired), with nothing started",
    `${fps} frames in 1 s during the check · cancel → title in ${cancelMs} ms`);
  await h.context().close();

  // (R in the browser was the retired launcher's disabled scenario card; the Node check R above keeps the data rule itself)

  check(!errs.length, "no browser errors", errs.slice(0, 3).join(" | "));
  console.log("# 51–58 · the other suites run separately (README → QA): every pre-existing suite, including Eden / Dying World / Native Competition / Volatile Climate / economy / colony / archetype suites");
  await browser.close(); server.close(); finish();
})().catch(e => { console.error(e); fails++; server.close(); finish(); });

function finish() { console.log(`\n${fails ? fails + " CHECK(S) FAILED" : "ALL CHECKS PASS"}  (${((Date.now() - t0) / 1000).toFixed(1)} s)`); process.exit(fails ? 1 : 0); }
