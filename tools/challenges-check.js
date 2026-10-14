// BLOOM — CHALLENGES: the data layer and the hub (BLOOM-036A foundation, kept; BLOOM-036B schema 2). docs/CHALLENGES_SYSTEM_v1.md.
// The one-planet launch (species → PREPARING CHALLENGE WORLD → the dossier → the run → retry / hub) is tools/challenge-world-check.js.
//
//   NODE_PATH="$(npm root -g)" node tools/challenges-check.js [--browsers chromium,firefox] [--evidence] [--node-only]
//
// NODE (content/challenges.js + resources/bloom-challenges.js):
//   C1 exactly the released Challenges in content order: the original three + the 036C1 authored batch (Low Tide · Oasis Line [· Windfall])
//      + (036D1) Thin Air, the first Challenge with a completion condition (its own suite: tools/challenge-completion-check.js)
//   C2 each references a real, non-default scenario with mechanics; scenarioOf() is the catalogue's own object
//   C3 Challenge ≠ scenario: no mechanics key anywhere in a definition; copy is a reference to the scenario's own player-facing copy or the
//      Challenge's own text (never a verbatim copy); no number but versions and the recipe's own shares; check() refuses mechanics (also
//      inside a recipe), verbatim copy, the default / an unknown scenario, every launch value the runtime cannot honour (an unknown policy,
//      a prescribed species that is not released, an unknown recipe key / archetype, a bad arrival band, a Terraform / crossing / over-max
//      starting adaptation, negative Biomass, a fixture in the catalogue), completion conditions / another win and difficulty words
//   C4 validated and frozen: resolve() is deep-frozen and identical per id; an unknown id throws UNKNOWN_CHALLENGE
//   C5 the launch of the three released Challenges: player-choice species · a SEED-BANK world (the calibrated recipe + bank { 1, 50 }) · the
//      normal start · completion bloom / []; Challenge version 3 (036B1) / recipe 1; the recipe key
//   C6 no Challenge plumbing in the Destination Survey any more (036A's scenario layer removed: the survey is the Expedition's only)
//   C21 (036C1) the copy corrections: Native Competition's strategic idea; Volatile Climate: stable until Terraformed, Terraform unsettles,
//       quick / repeated steps swing it, Adapt never adds instability · C22 the authored launches exactly (Low Tide, Oasis Line, Windfall if released)
//   C20 no difficulty-ranking language in any Challenge copy
// BROWSER (Chromium AND Firefox):
//   M · the main menu: EXPEDITION · CHALLENGES · TRAINING · SETTINGS · CREDITS, CHALLENGES a real chunky icon + word button (the shared
//       challenge glyph), never disabled, no "coming soon"
//   H · the hub at 390 × 844, 1024 × 768, 1440 × 900, 2560 × 1440: every released Challenge as an equal card (icon + name + line), the dossier (its "How the run works"
//       says one qualifying Challenge world is generated — no survey), BEGIN CHALLENGE visible (the phone: pinned in the sheet), the 036B
//       lede, no horizontal overflow, contrast, no ranking words
//   K · keyboard: ↓ to CHALLENGES, Enter → hub, the radiogroup (↓ ↑ Home End), visible focus, Enter / Space opens the dossier, Escape
//       closes it, Escape again → the title; R · reduced motion: nothing animates on the hub
// --evidence writes docs/evidence/bloom-036c1/ hub stills. Exits 1 on any failure.
"use strict";
const path = require("path"), fs = require("fs"), http = require("http"), os = require("os");
const ROOT = path.resolve(__dirname, "..");
const argv = process.argv, argOf = k => { const i = argv.indexOf(k); return i > 0 ? argv[i + 1] : null; };
const BROWSERS = (argOf("--browsers") || "chromium,firefox").split(","), EVIDENCE = argv.includes("--evidence"), NODE_ONLY = argv.includes("--node-only");
const EVD = path.join(ROOT, "docs/evidence/bloom-036c1");   // (036C1) current evidence; the 036B stills stay as they were accepted
let fails = 0, passes = 0; const t0 = Date.now();
const check = (ok, name, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); if (ok) passes++; else fails++; return ok; };
const info = (name, detail) => console.log(`INFO  ${name}  — ${detail}`);
const J = JSON.stringify;
// the three original Challenges (036B1) + the first AUTHORED batch (036C1; Windfall only if it passed its recalibration and is in the catalogue)
const ORIG = ["dying_world", "native_competition", "volatile_climate"], ORIG_VERSION = { dying_world: 3, native_competition: 4, volatile_climate: 4 };
const ALL_NAMES = { dying_world: "Dying World", native_competition: "Native Competition", volatile_climate: "Volatile Climate", low_tide: "Low Tide", oasis_line: "Oasis Line", windfall: "Windfall", thin_air: "Thin Air" };
const SCN = { dying_world: "dying_world", native_competition: "native_competition", volatile_climate: "volatile_climate", low_tide: "dying_world", oasis_line: "native_competition", windfall: "volatile_climate", thin_air: "dying_world" };
let IDS = null, NAMES = null;   // set once content/challenges.js is loaded
const MENU = ["Expedition", "Challenges", "Training", "Settings"];   // (v1.0.1: no Credits)
const VIEWPORTS = [[390, 844], [1024, 768], [1440, 900], [2560, 1440]];
// no difficulty ranking (the hub, the Challenge's species screen / survey / run / report)
const RANKING = /\b(easy|easier|easiest|medium|hard|harder|hardest|difficulty|difficult|beginner|expert|novice|veteran|stars?|rating|score|recommended|skill|tier|coming soon)\b/i;

for (const f of ["content/config.js", "content/traits.js", "content/species.js", "planets/first_bloom.js", "content/archetypes.js", "content/scenarios.js", "content/challenges.js", "content/play.js",
  "resources/bloom-sim.js", "resources/bloom-species.js", "resources/bloom-gen.js", "resources/bloom-validate.js", "resources/bloom-witness.js", "resources/bloom-archetype.js",
  "resources/bloom-scenario.js", "resources/bloom-play.js", "resources/bloom-challenges.js", "resources/challenges/challenge-completion.js"]) require(path.join(ROOT, f));
const { BLOOM, BLOOM_DATA: D } = globalThis;
IDS = [...ORIG, "low_tide", "oasis_line", ...(D.challenges.some(c => c.id === "windfall") ? ["windfall"] : []), "thin_air"]; NAMES = IDS.map(id => ALL_NAMES[id]);
// (036D1) the completion provenance every Challenge carries (BLOOM.challenges.provenance): the contract's fingerprint + its condition types
const COMPLETION = c => ({ fingerprint: BLOOM.challengeCompletion.fingerprint(c), conditions: c.completion.conditions.map(x => x.type) });

(async () => {
  console.log("# C · the Challenge data layer (Node)");
  const C = BLOOM.challenges, list = C.list(), scenarios = D.scenarios;
  // C1
  check(J(list.map(c => c.id)) === J(IDS) && J(list.map(c => c.name)) === J(NAMES) && J(C.ids()) === J(IDS) && D.challenges.length === IDS.length && list.every(c => c.status === "released"),
    `C1 · exactly the released Challenges, in content order (not a ranking): ${NAMES.join(" · ")} (036C1: the original three + the authored batch)`, J(list.map(c => c.id)));
  // C2
  { const rows = list.map(c => { const S = C.scenarioOf(c); return { id: c.id, scenario: c.scenario, same: S === scenarios.find(s => s.id === c.scenario), dynamic: BLOOM.pressure.isDynamic(S), isDefault: S.id === BLOOM.pressure.DEFAULT_SCENARIO }; });
    check(rows.every(r => r.same && r.dynamic && !r.isDefault) && J(rows.map(r => r.scenario)) === J(IDS.map(id => SCN[id])),
      "C2 · each Challenge references a REAL non-default scenario with mechanics (pressure · competition · climate instability); BLOOM.challenges.scenarioOf() returns the catalogue's own scenario object (nothing copied)", J(rows)); }
  // C3
  { const src = fs.readFileSync(path.join(ROOT, "content/challenges.js"), "utf8").replace(/\/\/.*$/gm, "");
    const keyHits = C.MECHANICS_KEYS.filter(k => new RegExp(`\\b${k}\\s*:`).test(src));
    const numbers = /\b\d+(\.\d+)?\b/.test(src.replace(/(version|size): \d+/g, "").replace(/(minHabitable|maxHabitable|minStartShare): [\d.]+/g, "").replace(/biomass: \d+/g, "").replace(/\b0x[0-9a-f]+\b/gi, ""));
    const ownCopy = s => { const out = []; const w = v => { if (typeof v === "string") out.push(v); else if (v && typeof v === "object") Object.values(v).forEach(w); }; w(s.display); return out; };
    const verbatim = list.flatMap(c => { const own = ownCopy(C.scenarioOf(c)), d = D.challenges.find(x => x.id === c.id);
      return [d.short, ...Object.values(d.presentation)].filter(v => typeof v === "string" && !v.startsWith("@scenario.") && own.includes(v)).map(v => `${c.id}: ${v.slice(0, 30)}`); });
    const refs = list.map(c => c.sources), d0 = D.challenges[0], d1 = D.challenges[1], S = scenarios, L = d0.launch, R0 = L.world.recipe;
    const W = recipe => ({ ...d0, launch: { ...L, world: { ...L.world, recipe: { ...R0, ...recipe } } } });
    const ST = st => ({ ...d0, launch: { ...L, startingState: { policy: "prescribed", adaptations: [], biomass: null, ...st } } });
    const refuse = {
      mechanics: C.check([{ ...d0, launch: { ...L }, pressure: { graceSeconds: 1 } }], S),
      nestedMechanics: C.check([{ ...d0, presentation: { ...d0.presentation, channels: { moisture: "x" } } }], S),
      recipeMechanics: C.check([W({ competition: { growth: 1 } })], S),
      verbatim: C.check([{ ...d0, short: "The atmosphere is thinning." }], S),
      defaultScenario: C.check([{ ...d0, scenario: "default" }], S),
      unknownScenario: C.check([{ ...d0, scenario: "meteor_rain" }], S),
      oldPolicyString: C.check([{ ...d0, launch: { ...L, species: "player-choice" } }], S),
      surveyWorld: C.check([{ ...d0, launch: { ...L, world: { policy: "destination-survey" } } }], S),
      authoredWorld: C.check([{ ...d0, launch: { ...L, world: { policy: "authored", planet: "first_bloom" } } }], S),
      liveRecipeWorld: C.check([{ ...d0, launch: { ...L, world: { policy: "recipe", recipe: R0 } } }], S),          // (036B1) the retired live search
      noBank: C.check([{ ...d0, launch: { ...L, world: { policy: "seed-bank", recipe: R0 } } }], S),
      badBank: C.check([{ ...d0, launch: { ...L, world: { ...L.world, bank: { version: 1, size: 0 } } } }], S),
      recipeProofKey: C.check([W({ proof: { maxRuns: 3 } })], S),
      badFoothold: C.check([W({ foothold: { minShare: 2 } })], S),
      prescribedNoSpecies: C.check([{ ...d0, launch: { ...L, species: { policy: "prescribed" } } }], S),
      prescribedUnknown: C.check([{ ...d0, launch: { ...L, species: { policy: "prescribed", species: "moss_king" } } }], S),
      recipeUnknownKey: C.check([W({ water: [20, 40] })], S),
      recipeUnknownArchetype: C.check([W({ archetypes: ["lava_world"] })], S),
      recipeEmpty: C.check([W({ archetypes: [] })], S),
      recipeBadBand: C.check([W({ arrival: { minHabitable: 0.5, maxHabitable: 0.2 } })], S),
      recipeShare: C.check([W({ arrival: { minHabitable: 1.4 } })], S),
      coverWithoutNatives: C.check([W({ nativeCover: { minStartShare: 0.1 } })], S),
      recipeNoVersion: C.check([W({ version: 0 })], S),
      startTerraform: C.check([ST({ adaptations: ["warm"] })], S),
      startCrossing: C.check([ST({ adaptations: ["waterSeeds"] })], S),
      startOverMax: C.check([ST({ adaptations: ["salt", "salt"] })], S),
      startTwoArms: C.check([ST({ adaptations: ["drought", "flood"] })], S),
      startNegative: C.check([ST({ biomass: -5 })], S),
      startEmpty: C.check([ST({})], S),
      startUnknownKey: C.check([{ ...d0, launch: { ...L, startingState: { policy: "normal", biomass: 200 } } }], S),
      bonusBiomass: C.check([{ ...d0, launch: { ...L, biomass: 200 } }], S),
      fixtureInCatalogue: C.check([{ ...d0, status: "fixture" }], S),
      conditions: C.check([{ ...d0, completion: { win: "bloom", conditions: [{ coverage: 0.8 }] } }], S),
      winThreshold: C.check([{ ...d0, completion: { win: "coverage-80" , conditions: [] } }], S),
      difficulty: C.check([{ ...d0, name: "Dying World (Hard)" }], S),
      stars: C.check([{ ...d0, presentation: { ...d0.presentation, tagline: "Three stars for a fast bloom." } }], S),
      badRef: C.check([{ ...d0, presentation: { ...d0.presentation, briefing: "@scenario.intent" } }], S),
    };
    // and what the runtime CAN honour passes (a legal prescribed start, a prescribed released species, a native-cover recipe on the competition scenario)
    const accept = { start: C.check([ST({ adaptations: ["salt", "cold", "cold"], biomass: 250 })], S), prescribed: C.check([{ ...d0, launch: { ...L, species: { policy: "prescribed", species: "reed_spire" } } }], S),
      cover: C.check([{ ...d1, launch: { ...d1.launch, world: { ...d1.launch.world, recipe: { ...d1.launch.world.recipe, nativeCover: { minStartShare: 0.15 } } } } }], S),
      foothold: C.check([W({ foothold: { minShare: 0.1 } })], S) };
    const allRefused = Object.values(refuse).every(e => e.length > 0), allAccepted = Object.values(accept).every(e => e.length === 0);
    check(!keyHits.length && !numbers && !verbatim.length && allRefused && allAccepted && refs.every(r => Object.values(r).every(x => x === null || x === "challenge" || /^scenario\.display\./.test(x))) && /^scenario\.display\./.test(refs[0].strategicIdea),
      "C3 · Challenge ≠ scenario: content/challenges.js carries no mechanics key and no number but versions and the recipe's own shares; every copy field references the scenario's own player-facing copy (\"@scenario.display.*\") or is the Challenge's own text, never a verbatim copy; check() refuses a mechanics key at any depth (also in a recipe), verbatim scenario copy, the default / an unknown scenario, every launch value the runtime cannot honour (036A policy strings, a survey / authored world, an unreleased or missing prescribed species, an unknown recipe key or archetype, a bad arrival band, a Terraform / crossing / over-max / two-arm starting adaptation, negative or ungiven start, launch-level Biomass, a fixture in the catalogue), completion conditions / another win, difficulty words and a non-player-facing reference — and accepts what the runtime does honour",
      `${keyHits.length ? "keys " + keyHits : ""}${numbers ? " numbers" : ""}${verbatim.length ? " verbatim " + verbatim : ""} refused: ${Object.entries(refuse).map(([k, e]) => `${k}${e.length ? "✓" : "✗"}`).join(" ")} · accepted: ${Object.entries(accept).map(([k, e]) => `${k}${e.length ? "✗ " + e[0] : "✓"}`).join(" ")}`); }
  // C4
  { const a = C.resolve("dying_world"), b = C.resolve("dying_world"); let unknown = null, mutated = false;
    try { C.resolve("ice_age"); } catch (e) { unknown = e.code; }
    try { a.presentation.icon = "x"; } catch (e) { /* strict mode */ } try { a.launch.species.policy = "prescribed"; } catch (e) { /* frozen */ }
    try { a.launch.world.recipe.archetypes.push("x"); } catch (e) { /* frozen */ }
    mutated = a.presentation.icon !== "pressure" || a.launch.species.policy !== "player-choice" || a.launch.world.recipe.archetypes.length !== 3;
    const deep = o => Object.isFrozen(o) && Object.values(o).every(v => !v || typeof v !== "object" || deep(v));
    check(a === b && deep(a) && !mutated && unknown === "UNKNOWN_CHALLENGE" && list.every(deep) && C.check(D.challenges, scenarios).length === 0,
      "C4 · validated and frozen: the catalogue passes check(); resolve() returns ONE deep-frozen object per id (a write changes nothing); an unknown id throws UNKNOWN_CHALLENGE (never a silent Expedition)", `unknown → ${unknown}`); }
  // C5
  { const ARCH = ["ocean_archipelago", "desert_world", "frozen_world"];
    const want = { dying_world: { arrival: null }, native_competition: { arrival: { minHabitable: 0.2 } }, volatile_climate: { arrival: null } };
    const orig = list.filter(c => ORIG.includes(c.id)), rows = orig.map(c => ({ id: c.id, v: c.version, schema: c.schema, key: c.recipeKey, launch: c.launch }));
    check(orig.length === 3 && orig.every(c => J(c.launch) === J({ species: { policy: "player-choice" }, world: { policy: "seed-bank", recipe: { version: 1, archetypes: ARCH, arrival: want[c.id].arrival, nativeCover: null }, bank: { version: 1, size: 50 } }, startingState: { policy: "normal" } })
        && c.completion.win === "bloom" && c.completion.conditions.length === 0 && c.schema === 2 && C.SCHEMA_VERSION === 2 && c.version === ORIG_VERSION[c.id] && c.recipeKey === `${c.id}@${ORIG_VERSION[c.id]}/recipe-1`
        && C.speciesOf(c) === null && C.startingStateOf(c) === null && J(C.provenance(c)) === J({ id: c.id, name: c.name, version: ORIG_VERSION[c.id], recipeVersion: 1, bankVersion: 1, scenarioId: c.scenario, icon: c.presentation.icon, completion: COMPLETION(c) })
        && C.ICONS.includes(c.presentation.icon) && c.presentation.tagline && c.presentation.briefing && c.presentation.strategicIdea)
      && J(orig.map(c => c.presentation.icon)) === J(["pressure", "competition", "climate"]) && !!orig[0].presentation.sciencePoints && !!orig[2].presentation.science,
      "C5 · the launch of the three released Challenges (036B1): species { player-choice } · world { seed-bank: recipe v1 (every archetype; Dying World and Volatile Climate BROAD, Native Competition arrival ≥ 20 % — what the offline bank builder accepts) · bank { version 1, size 50 } } · startingState { normal } · completion { bloom, [] }; Challenge version 3 (the live-search v2 is retired), recipe version 1, recipe key <id>@3/recipe-1; nothing prescribed",
      rows.map(r => `${r.id} v${r.v} ${r.key} arrival ${J(r.launch.world.recipe.arrival)}`).join(" · ")); }
  // C21 — (036C1) the released-copy corrections: Native Competition's strategic idea; Volatile Climate says the climate is stable until Terraformed
  { const nc = C.resolve("native_competition").presentation, vc = C.resolve("volatile_climate").presentation, vcAll = [vc.tagline, vc.briefing, vc.strategicIdea].join(" ");
    const facts = { startsStable: /stable until you (change|Terraform)/i.test(vc.briefing) && /stable until you Terraform/i.test(vc.tagline), terraformUnsettles: /Each Terraform step unsettles it/.test(vc.briefing),
      quickOrRepeated: /quick or repeated steps can (make it )?swing/.test(vc.briefing) && /temporary heat pulse, cold snap, wet surge or dry spell/.test(vc.briefing),
      adaptSafe: /^Adapting your plant never unsettles the climate\./.test(vc.strategicIdea) };
    check(nc.strategicIdea === "Win ground where your plant suits it better than the natives do, and thicken young colonies before they are overgrown." && /suited to its conditions/.test(nc.science)
        && Object.values(facts).every(Boolean) && !/random/i.test(vcAll),
      "C21 · the 036C1 copy corrections: Native Competition's strategic idea is a real strategy (the native-adaptation fact stays in its science line); Volatile Climate states that the climate STARTS STABLE, that each TERRAFORM step unsettles it, that QUICK OR REPEATED steps swing it to a temporary extreme, and that ADAPTING never unsettles it (both the hub's What changes and the planet dossier's lines carry it)",
      J(facts)); }
  // C22 — (036C1) the authored launches, exactly
  { const ARCH = ["ocean_archipelago", "desert_world", "frozen_world"], B = { version: 1, size: 50 }, wf = IDS.includes("windfall") ? C.resolve("windfall") : null;
    const want = { low_tide: { species: { policy: "prescribed", species: "organic_hybrid" }, world: { policy: "seed-bank", recipe: { version: 1, archetypes: ["ocean_archipelago"], arrival: null, nativeCover: null }, bank: B },
        startingState: { policy: "prescribed", adaptations: ["flood", "salt"], biomass: null } },
      oasis_line: { species: { policy: "prescribed", species: "reed_spire" }, world: { policy: "seed-bank", recipe: { version: 1, archetypes: ["desert_world"], arrival: null, nativeCover: null }, bank: B }, startingState: { policy: "normal" } },
      ...(wf ? { windfall: { species: { policy: "player-choice" }, world: { policy: "seed-bank", recipe: { version: 1, archetypes: ARCH, arrival: null, nativeCover: null }, bank: B }, startingState: { policy: "prescribed", adaptations: [], biomass: wf.launch.startingState.biomass } } } : {}) };
    const rows = Object.entries(want).map(([id, L]) => { const c = C.resolve(id); return { id, ok: J(c.launch) === J(L) && c.version === 1 && c.scenario === SCN[id] && c.completion.win === "bloom" && !c.completion.conditions.length
      && J(C.provenance(c)) === J({ id, name: ALL_NAMES[id], version: 1, recipeVersion: 1, bankVersion: 1, scenarioId: SCN[id], icon: c.presentation.icon, completion: COMPLETION(c) }) && c.presentation.icon === { dying_world: "pressure", native_competition: "competition", volatile_climate: "climate" }[SCN[id]] }; });
    check(rows.every(r => r.ok) && J(C.closedByStart(C.resolve("low_tide")).map(t => t.id)) === J(["drought"]) && IDS.every(id => id === "low_tide" || !C.closedByStart(C.resolve(id)).length)
        && (!wf || [200, 225, 250].includes(wf.launch.startingState.biomass)),
      "C22 · the authored Challenges, exactly as approved: Low Tide (Dying World · prescribed Organic Hybrid · Ocean only · Flood + Salt given, normal Biomass), Oasis Line (Native Competition · prescribed Reed Spire · Desert only · NO arrival floor · normal start)" + (wf ? `, Windfall (Volatile Climate · player choice · every archetype · ${wf.launch.startingState.biomass} Biomass)` : "") + "; version 1, recipe 1, bank 1, the normal Bloom, the scenario family's icon; only Low Tide's start closes anything (Drought Adaptation)",
      rows.map(r => r.id + (r.ok ? "✓" : "✗")).join(" ")); }
  // C20
  { const words = list.map(c => [c.name, c.short, ...Object.values(c.presentation).flat()].filter(v => typeof v === "string").join(" ")).join(" "), hit = words.match(RANKING);
    check(!hit, "C20 · no difficulty-ranking language in any Challenge copy (no Easy / Medium / Hard, stars, scores, recommended skill)", hit ? `"${hit[0]}"` : "clean"); }
  // C6 — the survey carries no Challenge plumbing any more (036A's interim scenario layer is removed: a Challenge generates its own world)
  { const read = f => fs.readFileSync(path.join(ROOT, f), "utf8").replace(/\/\/.*$/gm, "");
    const sd = read("resources/destination-survey/survey-data.js"), sp = read("resources/destination-survey/sector-pool.js"), sw = read("resources/destination-survey/survey-worker.js"), ds = read("resources/destination-survey/destination-survey.js");
    const S = await import("file://" + path.join(ROOT, "resources/destination-survey/survey-data.js"));
    const sector = S.buildSector(77, undefined, { species: "woolly_candle" });
    const dead = { scenarioFor: "scenarioFor" in S, validateScenarioFor: "validateScenarioFor" in S, scenarioKey: "scenarioKey" in S, scenarioRejected: /scenarioRejected/.test(sd + sp),
      poolScenario: /_scenario\(/.test(sp), workerScenarioTask: /type === "scenario"/.test(sw), surveyChallengeOption: /challenge\s*=\s*null|this\.challenge/.test(ds),
      beginChallenge: /Begin challenge/.test(ds), provenFor: /proven for/.test(ds), sectorScenario: "scenario" in sector || sector.cells.some(c => c && ("scenarioId" in c || "scenarioValidation" in c)) };
    check(Object.values(dead).every(x => !x) && sector.cells.filter(Boolean).length === 9,
      "C6 · the Destination Survey carries no Challenge plumbing any more: no scenario layer / key / rejection counter in survey-data or the sector pool, no \"scenario\" worker task, no Challenge option, \"Begin challenge\" or \"proven for\" on the screen; a sector carries no scenario provenance (the Expedition's survey only)", J(dead)); }

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
    // the dossier's "How the run works" per Challenge (036C1: a prescribed plant / a given start say so; Low Tide's start says what it closes)
    const WORLD = "One qualifying Challenge world is generated for your plant: there is no survey and no choosing among worlds.", WIN = "Win with the normal Bloom: cover the planet's target share of land.";
    // (036D1) a gated Challenge's win words: an early Bloom is a milestone there
    const WIN_FINAL = "Win with the Bloom held in the final atmosphere: reaching it earlier is a milestone, and the run goes on (extinction stays possible) until the atmosphere has settled.";
    const HOW = Object.fromEntries(IDS.map(id => [id, { low_tide: ["This Challenge prescribes the plant: Organic Hybrid.", WORLD, "Your plant lands with what the Challenge gives it: Flood Adaptation · Salt Handling. Drought Adaptation is not available: a plant commits to one water strategy — Flood is already chosen.", WIN],
      oasis_line: ["This Challenge prescribes the plant: Reed Spire.", WORLD, "Your plant lands as it always does: nothing owned yet.", WIN],
      thin_air: ["This Challenge prescribes the plant: Woolly Candle.", WORLD, "Your plant lands as it always does: nothing owned yet.", WIN_FINAL],
      windfall: ["You choose your plant: every species is open.", WORLD, `Your plant lands with what the Challenge gives it: ${(D.challenges.find(c => c.id === "windfall") || { launch: { startingState: {} } }).launch.startingState.biomass} Biomass.`, WIN] }[id]
      || ["You choose your plant: every species is open.", WORLD, "Your plant lands as it always does: nothing owned yet.", WIN]]));
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
        // ↓ ↓ ↓ Home End ↑ over the catalogue's cards (wrapping): 036C1 has more than three
        const n = IDS.length, want = [IDS[1 % n], IDS[2 % n], IDS[3 % n], IDS[0], IDS[n - 1], IDS[n - 2]];
        check(kf === "challenges" && K.focused === "dying_world" && K.sel === "dying_world" && K.role === "radio" && K.checked === "true" && K.tab === ["0", ...IDS.slice(1).map(() => "-1")].join("") && K.ring && K.group === "radiogroup"
            && J(keys.map(x => x.f)) === J(want) && keys.every(x => x.f === x.s && x.s === x.d) && opened.state === "detail" && opened.focusH2 && closed.state === "list" && closed.focus === want[5]
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
          await p.evaluate(([id, H]) => { const h = eval(H); h.select(id); if (h.narrow) h.open(id); }, [id, HUB]);   // every card, the authored ones included
          await p.evaluate(() => Promise.all(document.querySelector(".ch").getAnimations({ subtree: true }).map(a => a.finished.catch(() => {})))); await p.waitForTimeout(60);
          const R = await p.evaluate(([H, RANK]) => { const h = eval(H), go = document.querySelector(".ch-btn.go"), r = go.getBoundingClientRect(), d = document.querySelector(".ch-dossier");
            const card = document.querySelector(`.ch-card[data-challenge="${h.selected.id}"]`);
            return { id: h.selected.id, sheet: h.root.dataset.sheet, title: d.querySelector("h2").textContent, dossierFor: d.dataset.challenge, label: go.innerText.trim(),
              visible: r.width > 0 && r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth, rows: [...d.querySelectorAll(".ch-row dt")].map(x => x.textContent.trim()),
              run: [...d.querySelectorAll(".ch-row.run li")].map(x => x.textContent.trim()), lede: document.querySelector(".ch-lede").textContent.replace(/\s+/g, " ").trim(),
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
            // (036D1) a gated Challenge opens its dossier with the contract ("To win": BLOOM + the condition); the others are unchanged
            && (r.id === "thin_air" ? r.rows[0] === "To win" && r.rows[1] === "What changes" && r.rows[2] === "Strategic idea" && r.rows.length === 5 : r.rows[0] === "What changes" && r.rows[1] === "Strategic idea" && r.rows.length === 4)
            && r.rows.includes("How the run works") && (w !== 390 || r.sheet === "true")
            && J(r.run.slice(0, 4)) === J(HOW[r.id]) && /extinction/i.test(r.run[4] || "")
            && r.lede === "Each Challenge is a contained run with its own starting situation and pressure. Read the brief, choose what the Challenge allows, and find a way to bloom."
            && !/Destination Survey|choose your plant and your world/i.test(r.run.join(" ") + r.lede))
            && J(cards.map(x => x.id)) === J(IDS) && sameSize,
          `[${bn}] H1 ${w}×${h} · the hub: ${IDS.length} equal cards (scenario glyph + name + one line; no ranking cue) and the selected Challenge's dossier (What changes · Strategic idea · the science / why · How the run works: choose your plant · ONE qualifying Challenge world is generated (no survey) · nothing owned at landing · the normal Bloom · extinction); the 036B lede (\"choose what the Challenge allows\"); BEGIN CHALLENGE fully visible${w === 390 ? " (pinned in the phone sheet)" : ""} with contrast ≥ 4.5 : 1; no horizontal overflow; no difficulty words`,
          rows.map(r => `${r.id} ${r.contrast}:1${r.visible ? "" : " HIDDEN"}${r.rank ? ` RANK "${r.rank}"` : ""}`).join(" · ") + ` · cards ${J(cards.map(x => x.w + "×" + x.h))}`);
        if (w === 1024) check(rows.every(r => r.anims === 0), `[${bn}] R1 · reduced motion (the OS setting): nothing animates on the hub`, J(rows.map(r => r.anims)));
        check(!p.errs.length, `[${bn}] H2 ${w}×${h} · no console / page error`, p.errs.join(" | ") || "clean");
        await c.close();
      }

    } catch (e) { check(false, `[${bn}] uncaught`, e.stack || String(e)); }
    await browser.close();
  }
  srv.close();
}
