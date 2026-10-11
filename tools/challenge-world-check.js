// BLOOM — the ONE-PLANET Challenge launch (BLOOM-036B). docs/CHALLENGES_SYSTEM_v1.md §3–§6.
//
//   NODE_PATH="$(npm root -g)" node tools/challenge-world-check.js [--browsers chromium,firefox] [--evidence] [--node-only]
//
// NODE (resources/challenges/challenge-world.js, the engine's starting state, BLOOM.gameSession.challengeRun):
//   W1 the stream is species-free and versioned: launch seed × Challenge id × Challenge version × recipe version decide the draws; any
//      draw is computed directly; the recipe's archetypes are the only ones drawn
//   W2 exactly ONE planet: selectWorld accepts the first draw in stream order that passes every stage; the same launch seed + version +
//      species is the same planet (fingerprint) from a fresh engine; acceptInOrder waits for every earlier draw (timing never decides)
//   W3 species never alter physical generation: the same draw is the same physical planet object / fingerprint for every species, and
//      evaluating it (species, recipe, layer P, a starting state) never changes it
//   W4 recipe enforced: Native Competition's arrival band (≥ 20 %), a fixture's archetype list + arrival cap, a native-cover floor (stage "cover")
//   W5 scenario validation enforced: a draw whose layer P fails is rejected (stage "scenario") and never becomes an instance
//   W6 prescribed species (QA fixture, never on the hub): speciesOf() is that species; an instance for another species is refused
//   W7 starting state (QA fixture): createSim starts with exactly the owned adaptations and the Biomass (nothing spent), refuses what it
//      cannot honour; the S2 and layer-P proofs run from that start; the instance carries it
//   W9 the proof budget (6 simulation runs, confirmations included) is an early stop: identical witness within it, a longer proof is not offered
//   W8 the run (BLOOM.gameSession.challengeRun): the exact instance objects; provenance (challenge id / version, recipe version, launch
//      seed, planet seed / fingerprint, species, scenario, starting state); an old / tampered / foreign instance is refused; expeditionRun
//      refuses a Challenge (never through the Destination Survey)
// BROWSER (Chromium AND Firefox; "/" = the repository, "/bloom/" = the Pages site, file:// offline):
//   F · each Challenge: hub → BEGIN CHALLENGE → Choose Plant Species ("Continue with …") → PREPARING CHALLENGE WORLD (real phases, no
//       percentage, no world shown) → the Challenge Planet Dossier (ONE globe: Challenge · Your plant · Your world, "Expected hazards",
//       World Seed; Back + Begin challenge; NO Destination Survey ever mounted) → BEGIN CHALLENGE (the dramatic descent) → the run plays the
//       EXACT instance (planet / species / Challenge / scenario objects) → the report names the Challenge, carries its provenance and offers
//       KEEP PLAYING · RETRY CHALLENGE · CHALLENGES · MAIN MENU
//   E · the specimen environment reads the real region sky (Dying World drift, a real Volatile Climate shock; Native Competition adds nothing)
//   I · invariants: Back while preparing cancels cleanly (workers terminated) · Back from the dossier → Choose Plant Species (same launch:
//       the same species again = the same planet) · RETRY = the same planet / species / Challenge, a fresh simulation · CHALLENGES → the hub,
//       a new launch (a new launch seed) · MAIN MENU clears it · EXPEDITION keeps its 3 × 3 survey ("Expected hazards"), no residue ·
//       TRAINING unchanged · the run refuses a tampered instance
//   X · QA fixtures (never on the hub): a prescribed species skips Choose Plant Species; a prescribed start lands owned + exact Biomass,
//       the report says the Challenge gave it
//   K · keyboard: Escape = Back on the Challenge world screen, Tab reaches Begin challenge, Enter begins
//   D · one document: no navigation, the address never changes, nothing about a Challenge in storage / window.name / a request URL
//   P · file:// offline · B · /bloom/ — a complete Challenge launch
// --evidence writes docs/evidence/bloom-036b/ stills. Exits 1 on any failure.
"use strict";
const path = require("path"), fs = require("fs"), http = require("http"), os = require("os");
const ROOT = path.resolve(__dirname, "..");
for (const f of ["content/config.js", "content/traits.js", "content/species.js", "planets/first_bloom.js", "planets/training_grounds.js", "content/archetypes.js", "content/scenarios.js", "content/challenges.js",
  "content/play.js", "content/training.js", "resources/bloom-sim.js", "resources/bloom-species.js", "resources/bloom-gen.js", "resources/bloom-validate.js", "resources/bloom-witness.js", "resources/bloom-archetype.js",
  "resources/bloom-scenario.js", "resources/bloom-play.js", "resources/bloom-challenges.js", "resources/run/game-session.js"]) require(path.join(ROOT, f));
const argv = process.argv, argOf = k => { const i = argv.indexOf(k); return i > 0 ? argv[i + 1] : null; };
const BROWSERS = (argOf("--browsers") || "chromium,firefox").split(","), EVIDENCE = argv.includes("--evidence"), NODE_ONLY = argv.includes("--node-only");
const EVD = path.join(ROOT, "docs/evidence/bloom-036b");
let fails = 0, passes = 0; const t0 = Date.now();
const check = (ok, name, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); if (ok) passes++; else fails++; return ok; };
const J = JSON.stringify;
const IDS = ["dying_world", "native_competition", "volatile_climate"], NAMES = { dying_world: "Dying World", native_competition: "Native Competition", volatile_climate: "Volatile Climate" };
const SPECIES = ["organic_hybrid", "cinder_rosette", "woolly_candle", "reed_spire"];
// the flows' species and launch seeds (fixed so a run is reproducible; every species is open on the hub's Challenges)
const FLOW = { dying_world: ["woolly_candle", 2], native_competition: ["woolly_candle", 2], volatile_climate: ["cinder_rosette", 2] };
const { BLOOM, BLOOM_DATA: D } = globalThis;
// QA fixtures (never in content/challenges.js, never on the hub)
const base = D.challenges[0];
const FX_PRESCRIBED = { ...base, id: "qa_prescribed_reed", status: "fixture", name: "QA Prescribed Plant",
  launch: { ...base.launch, species: { policy: "prescribed", species: "reed_spire" } } };
const FX_START = { ...base, id: "qa_starting_state", status: "fixture", name: "QA Starting State",
  launch: { ...base.launch, species: { policy: "prescribed", species: "woolly_candle" }, startingState: { policy: "prescribed", adaptations: ["cold", "salt"], biomass: 250 } } };
const FX_RECIPE = { ...base, id: "qa_desert_recipe", status: "fixture", name: "QA Desert Recipe",
  launch: { ...base.launch, world: { policy: "recipe", recipe: { version: 3, archetypes: ["desert_world"], arrival: { maxHabitable: 0.35 }, nativeCover: null } } } };

(async () => {
  const W = await import("file://" + path.join(ROOT, "resources/challenges/challenge-world.js"));
  const S = await import("file://" + path.join(ROOT, "resources/destination-survey/survey-data.js"));
  const C = BLOOM.challenges, DW = C.resolve("dying_world"), NC = C.resolve("native_competition");
  console.log("# W · the one-planet selection (Node)");
  // W1
  { const s1 = W.streamSeed(4242, DW), s2 = W.streamSeed(4242, DW), s3 = W.streamSeed(4243, DW), fxR = C.fixture(FX_RECIPE), sr = W.streamSeed(4242, fxR);
    const bumped = { ...DW, version: 3 }, recipeBumped = { ...DW, launch: { ...DW.launch, world: { policy: "recipe", recipe: { ...DW.launch.world.recipe, version: 2 } } } };
    const draws = s => Array.from({ length: 40 }, (_, i) => W.drawAt(s, i, DW.launch.world.recipe));
    const a = draws(s1), b = draws(s2), direct = W.drawAt(s1, 37, DW.launch.world.recipe), fx = Array.from({ length: 40 }, (_, i) => W.drawAt(sr, i, fxR.launch.world.recipe));
    check(s1 === s2 && s1 !== s3 && W.streamSeed(4242, bumped) !== s1 && W.streamSeed(4242, recipeBumped) !== s1 && J(a) === J(b) && J(direct) === J(a[37]) && W.streamSeed.length === 2
        && new Set(a.map(d => d.archetypeId)).size === 3 && fx.every(d => d.archetypeId === "desert_world") && a.every(d => d.seed >= 1 && d.seed <= 99999),
      "W1 · the draw stream is a pure function of (launch seed, Challenge id, Challenge version, recipe version) — never of the species (streamSeed takes no species); a version or recipe bump is another stream; draw i is computed directly; only the recipe's archetypes are drawn",
      `stream ${s1} · first draws ${a.slice(0, 3).map(d => d.archetypeId + ":" + d.seed).join(", ")} · fixture all desert ${fx.every(d => d.archetypeId === "desert_world")}`); }
  // W2 / W3
  let inst = null;
  { const cacheA = S.createSurveyCache(), t = Date.now();
    const r1 = W.selectWorld(DW, 4242, "woolly_candle", undefined, { cache: cacheA }), ms1 = Date.now() - t;
    const r2 = W.selectWorld(DW, 4242, "woolly_candle", undefined, { cache: S.createSurveyCache() });
    inst = W.makeInstance({ challenge: DW, species: BLOOM.species.resolve("woolly_candle"), launchSeed: 4242, result: r1.result, draws: r1.draws, stream: r1.stream });
    const rej = r1.results.slice(0, -1);
    const synthetic = [W.acceptInOrder([undefined, { ok: true }]), W.acceptInOrder([{ ok: false }, { ok: true }, { ok: true }]), W.acceptInOrder([{ ok: false }, undefined, { ok: true }]), W.acceptInOrder([{ ok: false }, { ok: false }])];
    check(r1.ok && r2.ok && r1.result.physical.fingerprint === r2.result.physical.fingerprint && r1.result.draw === r2.result.draw && rej.every(x => !x.ok) && r1.results.filter(x => x.ok).length === 1
        && inst.kind === "challenge-instance" && inst.format === 1 && inst.challenge === DW && inst.planet === r1.result.physical.planet && inst.fingerprint === S.planetFingerprint(inst.planet)
        && inst.launchSeed === 4242 && inst.recipeVersion === 1 && inst.challengeVersion === 2 && inst.candidate.scenarioValidation.ok && inst.startingState === null
        && J(synthetic) === J([{ done: false, frontier: 0 }, { done: true, index: 1 }, { done: false, frontier: 1 }, { done: false, frontier: 2 }]),
      "W2 · exactly ONE planet: the first draw in stream order that passes every stage becomes the instance (every earlier draw was rejected, nothing after it is evaluated); the same launch seed + Challenge version + species gives the same planet from a fresh cache; acceptInOrder waits for every earlier draw, so worker timing can never choose the planet",
      `Dying World · Woolly Candle · launch 4242 → draw ${r1.result.draw} ${r1.result.archetypeId}:${r1.result.seed} ${inst.fingerprint} (${ms1} ms, stages ${J(r1.stages)})`);
    // W3: the same draw for another species — the SAME physical object (shared cache) and fingerprint; evaluation never changes the planet
    const fp0 = S.planetFingerprint(inst.planet), json0 = J(inst.planet);
    const pick = W.drawAt(W.streamSeed(4242, DW), inst.draw, DW.launch.world.recipe);
    const other = SPECIES.map(id => W.evaluateDraw(pick, { species: id, scenarioId: "dying_world", recipe: DW.launch.world.recipe, startingState: null }, undefined, cacheA));
    const fresh = S.physicalCandidate({ archetypeId: pick.archetypeId, seed: pick.seed });
    check(other.every(o => o.physical && o.physical.planet === inst.planet) && fresh.fingerprint === fp0 && S.planetFingerprint(inst.planet) === fp0 && J(inst.planet) === json0,
      "W3 · species never alter physical generation: the instance's draw is the SAME physical planet object for all four species (one cache) and the same fingerprint from a fresh, species-free generation; species evaluation, the recipe and layer P (Dying World's, for every species) leave the planet byte-identical",
      `${pick.archetypeId}:${pick.seed} ${fp0} · stages for the four species: ${other.map(o => o.stage).join(", ")}`); }
  // W4 — recipes
  { const t = Date.now(), r = W.selectWorld(NC, 2, "cinder_rosette", undefined, { cache: S.createSurveyCache() }), ms = Date.now() - t;
    const fxR = C.fixture(FX_RECIPE), rf = W.selectWorld(fxR, 11, "organic_hybrid", undefined, { cache: S.createSurveyCache() });
    const cover = W.evaluateDraw(W.drawAt(W.streamSeed(4242, DW), inst.draw, DW.launch.world.recipe), { species: "woolly_candle", scenarioId: "native_competition",
      recipe: { ...NC.launch.world.recipe, arrival: null, nativeCover: { minStartShare: 0.99 } }, startingState: null }, undefined, null);
    check(r.ok && r.result.evaluation.habitable >= 0.2 && r.result.predicted >= 0.2 && r.results.slice(0, -1).every(x => !x.ok)
        && rf.ok && rf.result.archetypeId === "desert_world" && rf.result.evaluation.habitable <= 0.35 && rf.results.every(x => x.archetypeId === "desert_world")
        && cover.stage === "cover" && cover.nativeStartShare > 0 && cover.nativeStartShare < 0.99 && !cover.scenarioValidation,
      "W4 · the recipe is enforced: Native Competition accepts only a world whose arrival share for the species is ≥ 20 % (its structural prediction too); a fixture recipe draws only its archetype and caps the arrival share; a native-cover floor rejects a world before its layer P (stage \"cover\")",
      `NC · Cinder · launch 2 → ${r.result.archetypeId}:${r.result.seed} habitable ${r.result.evaluation.habitable.toFixed(3)} (${ms} ms, ${J(r.stages)}) · fixture → ${rf.result.archetypeId} ${rf.result.evaluation.habitable.toFixed(3)} (${J(rf.stages)}) · cover ${cover.nativeStartShare}`); }
  // W5 — layer P enforced (a known fast-failing draw from the recipe study: ocean_archipelago 23947, Organic Hybrid, Dying World)
  { const pick = { draw: 0, archetypeId: "ocean_archipelago", seed: 23947 };
    const r = W.evaluateDraw(pick, { species: "organic_hybrid", scenarioId: "dying_world", recipe: DW.launch.world.recipe, startingState: null }, undefined, null);
    let refused = null; try { W.makeInstance({ challenge: DW, species: "organic_hybrid", launchSeed: 1, result: { ...r, ok: true }, draws: 1, stream: 1 }); } catch (e) { refused = e.message; }
    let refused2 = null; try { W.makeInstance({ challenge: DW, species: "organic_hybrid", launchSeed: 1, result: r, draws: 1, stream: 1 }); } catch (e) { refused2 = e.message; }
    check(r.stage === "scenario" && !r.ok && r.scenarioValidation && !r.scenarioValidation.ok && r.evaluation.playability.ok && !!refused2,
      "W5 · scenario validation is enforced: a world the species can win (S2) but whose Dying World proof fails (layer P) is rejected at stage \"scenario\" and can never become an instance",
      `${pick.archetypeId}:${pick.seed} → ${r.stage} (${r.scenarioValidation && r.scenarioValidation.status}: ${(r.scenarioValidation && r.scenarioValidation.reason || "").slice(0, 80)}) · makeInstance refuses: ${!!refused2}`); }
  // W6 — prescribed species (fixture)
  { const fx = C.fixture(FX_PRESCRIBED), reed = BLOOM.species.resolve("reed_spire");
    const r = W.selectWorld(fx, 7, "reed_spire", undefined, { cache: S.createSurveyCache() });
    let wrong = null; try { W.makeInstance({ challenge: fx, species: "organic_hybrid", launchSeed: 7, result: r.result, draws: r.draws, stream: r.stream }); } catch (e) { wrong = e.message; }
    const X = W.makeInstance({ challenge: fx, species: reed, launchSeed: 7, result: r.result, draws: r.draws, stream: r.stream });
    check(C.speciesOf(fx) === reed && !C.ids().includes(fx.id) && C.resolve(fx.id) === fx && !C.list().includes(fx) && r.ok && X.species === reed && X.speciesPolicy === "prescribed" && !!wrong,
      "W6 · prescribed species (a QA fixture, status \"fixture\", never on the hub): speciesOf() is the canonical prescribed species; its instance is for that species and one for any other species is refused",
      `${fx.id} → ${C.speciesOf(fx).id} · ${X.archetypeId}:${X.worldSeed} · wrong species: ${wrong && wrong.slice(0, 60)}`); }
  // W7 — starting state (fixture)
  { const fx = C.fixture(FX_START), st = C.startingStateOf(fx), wool = BLOOM.species.resolve("woolly_candle");
    const sim = BLOOM.createSim(inst.planet, D.config, D.traits, { rng: () => 0.5, species: wool, startingState: st }), plain = BLOOM.createSim(inst.planet, D.config, D.traits, { rng: () => 0.5, species: wool });
    const refuse = [["warm"], ["waterSeeds"], ["salt", "salt"], ["drought", "flood"], ["cold", "cold", "cold", "cold", "cold", "cold", "cold"]].map(a => { try { BLOOM.createSim(inst.planet, D.config, D.traits, { startingState: { adaptations: a, biomass: null } }); return "accepted"; } catch (e) { return "refused"; } });
    const t = Date.now(), r = W.selectWorld(fx, 4242, wool, undefined, { cache: S.createSurveyCache() }), ms = Date.now() - t;
    const X = r.ok ? W.makeInstance({ challenge: fx, species: wool, launchSeed: 4242, result: r.result, draws: r.draws, stream: r.stream }) : null;
    const ev = r.ok && r.result.evaluation, wit = r.ok && r.result.scenarioValidation.witness;
    check(sim.genome.cold === 1 && sim.genome.salt === 1 && sim.biomass === 250 && sim.spent.global === 0 && Object.isFrozen(sim.startingState) && J(sim.startingState) === J({ adaptations: ["cold", "salt"], biomass: 250, source: "challenge" })
        && plain.startingState === null && plain.genome.cold === 0 && plain.biomass === D.config.econ.startBiomass && refuse.every(x => x === "refused")
        && r.ok && X.startingState === st && X.startingStatePolicy === "prescribed" && /\|start:cold\+salt:250$/.test(ev.key) && ev.playability.s2.reused === false && !(wit && wit.signature || "").includes("Defense:salt"),
      "W7 · a prescribed starting state (QA fixture): createSim lands the plant with EXACTLY those adaptations owned and that Biomass (nothing spent, sim.startingState frozen; a normal sim has none) and refuses a Terraform step, a crossing, an over-max level, two water arms or past the temperature cap; the S2 proof runs from that start (never the construction proof) and so does layer P (the witness needs no salt it already owns); the instance carries the definition's starting state",
      `genome cold ${sim.genome.cold} salt ${sim.genome.salt} · biomass ${sim.biomass} · spent ${sim.spent.global} · refused ${refuse.join("/")} · selection ${ms} ms → ${X && X.archetypeId}:${X && X.worldSeed} · S2 reused ${ev && ev.playability.s2.reused} · witness ${wit && wit.signature}`); }
  // W8 — the run
  { const G = BLOOM.gameSession, run = G.challengeRun(inst, { fingerprint: inst.fingerprint }), P = W.instanceProvenance(inst);
    const tamper = { version: { ...inst, challengeVersion: 1 }, recipe: { ...inst, recipeVersion: 2 }, foreignChallenge: { ...inst, challenge: JSON.parse(JSON.stringify(inst.challenge)) },
      foreignSpecies: { ...inst, species: JSON.parse(JSON.stringify(inst.species)) }, start: { ...inst, startingState: { adaptations: ["cold"], biomass: null, source: "challenge" } },
      unproven: { ...inst, candidate: { ...inst.candidate, scenarioValidation: { ...inst.candidate.scenarioValidation, ok: false } } }, otherScenario: { ...inst, scenarioId: "volatile_climate" },
      notAnInstance: { ...inst, kind: "survey-detail" } };
    const out = Object.fromEntries(Object.entries(tamper).map(([k, x]) => { try { G.challengeRun(x); return [k, "accepted"]; } catch (e) { return [k, "refused"]; } }));
    const expRefuse = (() => { const det = { planet: inst.planet, species: inst.species, candidate: { key: "x", speciesId: inst.speciesId, physiologyKey: inst.species.physiologyKey } };
      const t = d => { try { G.expeditionRun(d); return "accepted"; } catch (e) { return "refused"; } };
      return { plain: t(det), withChallenge: t({ ...det, challenge: DW }), withInstance: t({ ...det, instance: inst }), residue: t({ ...det, candidate: { ...det.candidate, scenarioId: "dying_world" } }) }; })();
    const cr = run.challengeRun;
    check(run.planet === inst.planet && run.species === inst.species && run.challenge === DW && run.scenario === D.scenarios.find(s => s.id === "dying_world") && run.startingState === null && run.expedition === null
        && cr.challengeId === "dying_world" && cr.challengeVersion === 2 && cr.recipeVersion === 1 && cr.launchSeed === 4242 && cr.planetSeed === inst.worldSeed && cr.fingerprint === inst.fingerprint
        && cr.speciesId === "woolly_candle" && cr.scenarioId === "dying_world" && cr.source === "challenge-recipe" && run.summary.challenge.recipeVersion === 1
        && P.planetSeed === inst.worldSeed && P.launchSeed === 4242 && Object.values(out).every(x => x === "refused") && J(expRefuse) === J({ plain: "accepted", withChallenge: "refused", withInstance: "refused", residue: "refused" }),
      "W8 · BLOOM.gameSession.challengeRun plays the EXACT instance (its planet, species, Challenge and the catalogue's own scenario objects) with its provenance (challenge id / version, recipe version, launch seed, planet seed / fingerprint, species, scenario); an instance from another Challenge version or recipe version, a foreign Challenge / species object, another starting state, an unproven planet, another scenario or a non-instance is REFUSED (never reinterpreted); expeditionRun refuses a Challenge, an instance and scenario residue",
      `${J(out)} · expedition ${J(expRefuse)}`); }

  // W9 — the proof budget is an early stop, never a weaker proof
  { const S0 = BLOOM.pressure.resolveScenario(D.scenarios, "dying_world"), SN = BLOOM.pressure.resolveScenario(D.scenarios, "native_competition");
    const OH = BLOOM.species.resolve("organic_hybrid"), WC = BLOOM.species.resolve("woolly_candle"), RS = BLOOM.species.resolve("reed_spire");
    const runs = v => v.search.simulations + (v.search.confirmations || 0);
    // a Dying World pass (no confirmation seeds) and a Native Competition pass WITH its two confirmation reruns: identical under the budget
    const easy = S.physicalCandidate({ archetypeId: "frozen_world", seed: 16220 }), ncPass = S.physicalCandidate({ archetypeId: "ocean_archipelago", seed: 74907 });
    const full = BLOOM.validateScenario(easy.planet, D.config, D.traits, S0, { archetypeId: "frozen_world", species: OH }), cut = W.validateScenarioFor(easy, OH, "dying_world", null);
    const fullNc = BLOOM.validateScenario(ncPass.planet, D.config, D.traits, SN, { archetypeId: "ocean_archipelago", species: RS }), cutNc = W.validateScenarioFor(ncPass, RS, "native_competition", null);
    // a Dying World proof that needs 7 witness runs, and a Native Competition draw whose failing search ran 6 witnesses + 4 confirmations
    const hard = S.physicalCandidate({ archetypeId: "ocean_archipelago", seed: 98731 }), ncFail = S.physicalCandidate({ archetypeId: "frozen_world", seed: 9252 });
    const fullHard = BLOOM.validateScenario(hard.planet, D.config, D.traits, S0, { archetypeId: "ocean_archipelago", species: WC }), cutHard = W.validateScenarioFor(hard, WC, "dying_world", null);
    const t = Date.now(), cutFail = W.validateScenarioFor(ncFail, RS, "native_competition", null), failMs = Date.now() - t;
    const same = (a, b) => a.ok && b.ok && b.witness.signature === a.strategies[0].signature && b.witness.marginSeconds === a.strategies[0].marginSeconds && b.simulations === a.search.simulations && b.confirmations === (a.search.confirmations || 0);
    check(same(full, cut) && same(fullNc, cutNc) && runs(fullNc) === 3 && fullHard.ok && fullHard.search.simulations > W.PROOF_BUDGET && !cutHard.ok
        && !cutFail.ok && cutFail.simulations + cutFail.confirmations <= W.PROOF_BUDGET + 2 && cut.proofBudget === 6,
      "W9 · the PROOF BUDGET (6 simulation runs in all, confirmation reruns included — the validator's opt-in maxRuns, checked only before a new witness run) is an early stop, never a weaker proof: a Dying World pass and a Native Competition pass with its two confirmation reruns get the IDENTICAL witness, margin and run counts as under the full budget; a proof that needs more runs is not offered, and a failing competition search stops within the budget (+ the last winner's confirmations)",
      `DW frozen_world:16220 OH ${full.status} ${runs(full)} runs · NC ocean_archipelago:74907 RS ${fullNc.status} ${runs(fullNc)} runs → ${cutNc.status} · DW ocean_archipelago:98731 WC full ${fullHard.status} after ${fullHard.search.simulations} → ${cutHard.status} · NC frozen_world:9252 RS → ${cutFail.status} after ${cutFail.simulations}+${cutFail.confirmations} runs (${failMs} ms)`); }

  if (NODE_ONLY) return done();
  await browserChecks();
  done();
})().catch(e => { console.error(e); check(false, "uncaught", e.stack || String(e)); done(); });

function done() { console.log(`\n${fails ? "FAIL" : "OK"} — challenge-world-check: ${passes} passed, ${fails} failed (${Math.round((Date.now() - t0) / 1000)} s)`); process.exit(fails ? 1 : 0); }

async function browserChecks() {
  let pw; try { pw = require("playwright"); } catch (e) { check(false, "playwright", "not installed: NODE_PATH=\"$(npm root -g)\""); return; }
  const { buildSite } = await import("file://" + path.join(ROOT, "tools/build-pages-site.mjs"));
  const SITE_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "bloom036b-site-")); buildSite(ROOT, SITE_DIR);
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
    const settled = p => p.evaluate(() => Promise.race([Promise.all(document.getAnimations().filter(a => a.playState === "running" && isFinite(a.effect && a.effect.getComputedTiming().endTime)).map(a => a.finished.catch(() => {}))), new Promise(r => setTimeout(r, 4000))]));
    const shot = async (p, name, opts = {}) => { if (EVIDENCE && (bn === "chromium" || opts.firefox)) { await settled(p); await p.waitForTimeout(opts.wait || 250); await p.screenshot({ path: path.join(EVD, (bn === "firefox" ? "firefox-" : "") + name) }); } };
    const context = async ({ width = 1440, height = 900, offline = false } = {}) => {
      const c = await browser.newContext({ viewport: { width, height } });
      if (offline) await c.setOffline(true);
      await c.addInitScript(() => { try { localStorage.setItem("strange-bloom.training", '{"v":1,"status":"completed","at":1}'); } catch (e) { /* none */ } });
      return c; };
    const page = async c => { const p = await c.newPage(); p.errs = []; p.reqs = []; p.navs = 0;
      p.on("pageerror", e => p.errs.push("pageerror: " + e.message)); p.on("console", m => { if (m.type() === "error") p.errs.push("console: " + m.text()); });
      p.on("request", r => p.reqs.push(r.url())); p.on("framenavigated", f => { if (f === p.mainFrame()) p.navs++; }); p.on("dialog", d => d.accept()); return p; };
    const menuReady = p => p.waitForFunction(() => window.MENU_DEV && MENU_DEV.ready && MENU_DEV.entry.state === "menu" && MENU_DEV.entry.black.style.display === "none", null, { timeout: 60000, polling: 100 });
    const hubReady = p => p.waitForFunction(() => { const e = MENU_DEV.entry, v = e.challengeView; return e.state === "challenges" && v && v.inner && e.black.style.display === "none"; }, null, { timeout: 60000, polling: 50 });
    const speciesReady = p => p.waitForFunction(() => { const e = MENU_DEV.entry, v = e.speciesView; return e.state === "species" && v && v.inner && e.black.style.display === "none"; }, null, { timeout: 60000, polling: 50 });
    const worldOpen = p => p.waitForFunction(() => { const e = MENU_DEV.entry, v = e.worldView; return e.state === "challenge-world" && v && v.inner && e.black.style.display === "none"; }, null, { timeout: 60000, polling: 30 });
    const worldReady = p => p.waitForFunction(() => { const e = MENU_DEV.entry, v = e.worldView; return e.state === "challenge-world" && v && v.inner && v.inner.state === "ready" && e.black.style.display === "none"; }, null, { timeout: 300000, polling: 100 });
    const surveyReady = p => p.waitForFunction(() => { const s = MENU_DEV.entry.survey; return s && s.state === "survey" && s.cells.every(Boolean) && MENU_DEV.entry.black.style.display === "none"; }, null, { timeout: 420000, polling: 200 });
    const runReady = (p, n) => p.waitForFunction(n => window.BLOOM_APP && BLOOM_APP.session && BLOOM_APP.stats.sessions.length >= n && BLOOM_APP.stats.sessions[n - 1].readyMs !== null && !BLOOM_APP.busy
      && !document.querySelector(".atx") && MENU_DEV.entry.state === "away" && MENU_DEV.entry.black.style.display === "none", n, { timeout: 120000, polling: 50 });
    const reportOpen = p => p.waitForFunction(() => BLOOM.runReport.instance && BLOOM.runReport.instance.state().open && !BLOOM.runReport.instance.state().busy, null, { timeout: 20000, polling: 30 });
    const HUB = "MENU_DEV.entry.challengeView.inner", SS = "MENU_DEV.entry.speciesView.inner", CW = "MENU_DEV.entry.worldView.inner";
    const openHub = async p => { await p.click('.mm-item[data-act="challenges"]'); await hubReady(p); };
    const beginChallenge = async (p, id) => { await p.evaluate(([id, H]) => eval(H).select(id), [id, HUB]); await p.click(".ch-btn.go"); await speciesReady(p); };
    const chooseSpecies = async (p, id) => { await p.evaluate(([id, SS]) => eval(SS).open(id), [id, SS]); await p.click(".ss-btn.go"); await worldOpen(p); };
    const beginRun = async (p, n) => { await p.click(".cw-btn.go"); await runReady(p, n); };
    const winNow = p => p.evaluate(() => { const s = BLOOM_API.sim; BLOOM_API.advance(40); s.won = true; s.onWin(s.coverage()); });
    const surveyEver = p => p.evaluate(() => ({ survey: !!MENU_DEV.entry.survey, ds: !!document.querySelector(".ds"), entries: MENU_DEV.entry.stats.entries.filter(e => e.adopted !== undefined || e.surveyReadyMs !== undefined).length }));
    const runId = p => p.evaluate(() => { const S = BLOOM_APP.session, X = BLOOM_APP.challengeRun && BLOOM_APP.challengeRun.instance, ch = S.run.challenge;
      return { planetSame: !!X && S.planet === X.planet, speciesSame: !!X && S.run.species === X.species, challengeSame: !!X && ch === X.challenge, challengeCanon: !ch || ch === BLOOM.challenges.resolve(ch.id),
        scenario: S.run.scenario ? S.run.scenario.id : null, scenarioCanon: !S.run.scenario || S.run.scenario === BLOOM_DATA.scenarios.find(s => s.id === S.run.scenario.id),
        simScenario: S.sim.scenario ? S.sim.scenario.id : null, mech: S.adapter.run().mechanics, simSpecies: S.sim.species && S.sim.species.id, challenge: ch ? ch.id : null, adapter: S.adapter.run().challenge,
        hud: (document.querySelector(".pv-id small") || {}).textContent, footer: (document.getElementById("pvRunId") || {}).textContent, cr: S.run.challengeRun || null, expedition: S.run.expedition || null,
        fp: X && X.fingerprint, launchSeed: X && X.launchSeed,
        scn: (() => { const el = document.getElementById("pvScn"); return el && !el.hidden ? (el.querySelector(".sh b") || {}).textContent : null; })() }; });
    const storageClean = p => p.evaluate(() => { const keys = s => { try { return Object.keys(s).map(k => k + "=" + s.getItem(k)); } catch (e) { return []; } };
      const all = [...keys(localStorage), ...keys(sessionStorage)]; return { leak: all.filter(x => /challenge|dying_world|native_competition|volatile_climate|scenario|launch/i.test(x)), name: window.name, href: location.href }; });
    const reportFacts = p => p.evaluate(() => ({ facts: [...document.querySelectorAll(".rr-fact")].map(x => [x.querySelector("small").textContent, x.querySelector("b").textContent]), kicker: document.getElementById("rrKicker").textContent,
      acts: BLOOM.runReport.instance.state().actions, labels: [...document.querySelectorAll("#rrActs .rr-btn b")].map(x => x.textContent), given: (document.querySelector(".rr-given") || {}).textContent || null,
      identity: BLOOM_APP.session.adapter.report().identity }));

    try {
      // ------------------------------------------------------------------ F · each Challenge end to end · E · environment
      for (const id of IDS) {
        if (bn === "firefox" && id !== "dying_world" && id !== "native_competition") continue;   // Firefox: representative flows (the rest is Chromium)
        const [sp, seed] = FLOW[id], c = await context(), p = await page(c);
        await p.goto(`${ORIGIN}/?launch=${seed}&workers=6&bg=7`); await menuReady(p); const href0 = await p.evaluate(() => location.href);
        await openHub(p); await beginChallenge(p, id);
        const SPS = await p.evaluate(SS => { const s = eval(SS); return { kicker: document.querySelector(".ss-kicker").textContent, cards: [...document.querySelectorAll(".ss-card")].map(x => x.dataset.species), go: document.querySelector(".ss-go-l").textContent,
          launch: MENU_DEV.entry.launch && MENU_DEV.entry.launch.launchSeed, warm: MENU_DEV.entry.launch.search.stats.warms }; }, SS);
        await shot(p, `03-species-${id}.png`, { firefox: id === "dying_world" });
        await p.evaluate(([id, SS]) => eval(SS).open(id), [sp, SS]); const go = await p.evaluate(() => document.querySelector(".ss-go-l").textContent);
        await p.click(".ss-btn.go"); await worldOpen(p);
        const PREP = await p.evaluate(CW => { const v = eval(CW), r = v.root; return { state: v.state, h1: [...r.querySelectorAll("h1")].filter(h => getComputedStyle(h).display !== "none").map(h => h.textContent), steps: [...r.querySelectorAll(".cw-steps li")].map(x => x.textContent),
          pct: /%/.test(r.querySelector(".cw-prep").innerText), world: r.querySelector(".cw-dossier h2").textContent, globes: r.querySelectorAll("canvas.planet-sphere-canvas").length }; }, CW);
        if (PREP.state === "preparing") await shot(p, `04-preparing-${id}.png`, { firefox: id === "dying_world", wait: 50 });
        const tR = Date.now(); await worldReady(p); const readyMs = Date.now() - tR;
        const DOS = await p.evaluate(([CW, RANK]) => { const v = eval(CW), r = v.root, X = v.instance, e = MENU_DEV.entry;
          return { name: r.querySelector(".cw-dossier h2").textContent, fp: X.fingerprint, drawnFp: r.dataset.fingerprint, globes: r.querySelectorAll(".cw-globe").length, canvases: r.querySelectorAll("canvas.planet-sphere-canvas").length,
            secs: [...r.querySelectorAll(".cw-sec-k span")].map(x => x.textContent), hazards: (r.querySelector(".cw-hazards h3") || {}).textContent, seed: r.querySelector(".cw-seed").textContent,
            buttons: [...r.querySelectorAll(".cw-actions button")].map(b => b.innerText.trim()), sp: r.querySelector(".cw-sp-name").textContent, ch: r.querySelector(".cw-ch-name").textContent,
            start: r.querySelector(".cw-start").textContent, specimen: !!r.querySelector(".cw-specimen").dataset.signature, phases: v.stats.phases.map(x => x.phase),
            foot: r.querySelector(".cw-foot").hidden ? null : r.querySelector(".cw-foot").textContent, s1: Math.round(X.candidate.playability.s1.reachableShare * 100),
            screenKeys: Object.keys(v).filter(k => /result|candidate|reject/i.test(k)), rank: (r.innerText.match(new RegExp(RANK, "i")) || [null])[0],
            reroll: !!r.querySelector('[data-act="reroll"], [data-act="scan"]'), stages: e.launch.search.stats.selects.at(-1).stages, draws: X.draws, draw: X.draw, launchSeed: X.launchSeed, worldSeed: X.worldSeed, archetype: X.archetypeId, sv: X.candidate.scenarioValidation.status }; },
          [CW, "\\b(easy|hard|difficulty|reroll|re-roll)\\b"]);
        await shot(p, `05-dossier-${id}.png`, { firefox: true });
        const sv0 = await surveyEver(p);
        check(SPS.kicker === `Challenge · ${NAMES[id]}` && J(SPS.cards) === J(SPECIES) && /^Continue with /.test(go) && SPS.launch === seed && SPS.warm >= 1,
          `[${bn}] F1 ${id} · BEGIN CHALLENGE → a launch (launch seed ${seed}) → Choose Plant Species: all four species open, the kicker names the Challenge, the action reads "Continue with <plant>" (no survey), the selected plant's world is prepared early`, J({ ...SPS, go }));
        check(PREP.state === "preparing" && PREP.h1.includes("Preparing challenge world") && J(PREP.steps) === J(["Searching candidate worlds", `Checking ${NAMES[id]} conditions`, "Preparing your planet"]) && !PREP.pct && !PREP.world && !PREP.globes
            || PREP.state === "ready",
          `[${bn}] F2 ${id} · PREPARING CHALLENGE WORLD: the heading, the three real phases (Searching candidate worlds · Checking ${NAMES[id]} conditions · Preparing your planet), no percentage, no world shown while searching`, J(PREP));
        check(DOS.globes === 1 && DOS.canvases === 1 && DOS.drawnFp === DOS.fp && J(DOS.secs) === J(["The challenge", "Your plant", "Your world"]) && DOS.hazards === "Expected hazards" && DOS.seed === `World Seed ${DOS.worldSeed} · ${await p.evaluate(a => BLOOM_DATA.archetypes.find(x => x.id === a).name, DOS.archetype)}`
            && J(DOS.buttons) === J(["Back", "Begin challenge"]) && DOS.sp === await p.evaluate(s => BLOOM.species.resolve(s).name, sp) && DOS.ch === NAMES[id] && DOS.specimen && /nothing owned yet/.test(DOS.start) && DOS.foot === `Foothold: ${DOS.s1}% of the land is growable at landing and reachable over land from your landing region.`
            && !DOS.screenKeys.length && !DOS.rank && !DOS.reroll && DOS.sv === "PASS" && !sv0.survey && !sv0.ds && DOS.launchSeed === seed,
          `[${bn}] F3 ${id} · the Challenge Planet Dossier: ONE globe of the instance's planet, The challenge · Your plant (its specimen) · Your world (name, type, arrival share, foothold, conditions, Expected hazards, World Seed); Back + Begin challenge, no reroll; the screen holds no rejected candidate; no Destination Survey was ever mounted`,
          `${DOS.name} ${DOS.archetype}:${DOS.worldSeed} ${DOS.fp} · draw ${DOS.draw} of ${DOS.draws} · stages ${J(DOS.stages)} · ready ${readyMs} ms after the species · phases ${DOS.phases.join("→")}`);
        await beginRun(p, 1);
        const R = await runId(p);
        check(R.planetSame && R.speciesSame && R.challengeSame && R.challengeCanon && R.scenario === id && R.scenarioCanon && R.simScenario === id && R.simSpecies === sp && R.challenge === id && R.adapter && R.adapter.id === id
            && R.cr && R.cr.challengeId === id && R.cr.challengeVersion === 2 && R.cr.recipeVersion === 1 && R.cr.launchSeed === seed && R.cr.fingerprint === DOS.fp && R.cr.planetSeed === DOS.worldSeed && R.cr.speciesId === sp && R.cr.scenarioId === id
            && R.expedition === null && R.hud === `Challenge · ${NAMES[id]}` && /^Challenge · /.test(R.footer) && R.scn === NAMES[id],
          `[${bn}] F4 ${id} · BEGIN CHALLENGE (the dramatic descent) → the run plays EXACTLY the instance: its planet, species and Challenge objects, the catalogue's own scenario (sim.scenario); the run's provenance names challenge / version / recipe version / launch seed / planet seed + fingerprint / species / scenario; the HUD names the Challenge; the scenario's own status card runs`,
          `${R.hud} · ${R.footer} · ${J(R.cr && { v: R.cr.challengeVersion, r: R.cr.recipeVersion, launch: R.cr.launchSeed, seed: R.cr.planetSeed })}`);
        await p.evaluate(n => BLOOM_API.advance(n), id === "dying_world" ? 700 : 300); await p.waitForTimeout(400); await shot(p, `06-run-${id}.png`, { firefox: id === "dying_world" });
        // E · the specimen environment reads the real region sky (036A, kept)
        const spec = room => p.evaluate(r => { const s = BLOOM.plantSpecimen.mounted().find(x => x.el.closest(`.dr-room[data-room="${r}"]`) && !x.el.closest("[hidden]"));
          return s && s.scene ? { env: s.environmentSignature(), t: s.scene.t, m: s.scene.m, keys: Object.keys(s.scene).sort().join(",") } : null; }, room);
        const idle = () => p.waitForFunction(() => !BLOOM.decisionRooms.instance.state().transitioning, null, { timeout: 20000, polling: 50 });
        const openAdapt = async () => { await idle(); await p.evaluate(() => { const D = BLOOM.decisionRooms.instance; D.open("adapt", D.state().context); });
          await p.waitForFunction(() => { const st = BLOOM.decisionRooms.instance.state(); return st.room === "adapt" && !st.transitioning; }, null, { timeout: 20000, polling: 50 }); await p.waitForTimeout(300); };
        const closeRoom = async () => { await idle(); await p.evaluate(() => BLOOM.decisionRooms.instance.close()).catch(() => {}); await idle(); await p.waitForTimeout(150); };
        if (id === "dying_world") {
          await openAdapt(); const a = await spec("adapt");
          const b = await p.evaluate(() => { const D = BLOOM.decisionRooms.instance, r = D.adapter.region(D.state().context), S = BLOOM_API.sim; return { t: r.raw.effectiveTemp, m: r.raw.effectiveMoist, off: { ...S.pressure.offsets }, progress: S.pressure.progress }; });
          check(a && b.progress > 0.2 && b.off.temp < -1 && b.off.moist < -1 && Math.abs(a.t - Math.round(b.t * 10) / 10) < 0.11 && Math.abs(a.m - Math.round(b.m * 10) / 10) < 0.11,
            `[${bn}] E1 dying_world · the specimen scene reads the REAL region sky: with the decline under way (scenario drift, no Terraform) the scene is the drifted colder / drier sky the engine evaluates`, J({ scene: a && { t: a.t, m: a.m }, region: { t: b.t, m: b.m }, progress: +b.progress.toFixed(2) }));
          await closeRoom();
        }
        if (id === "volatile_climate") {
          await openAdapt(); const before = await spec("adapt"); await closeRoom();
          const shock = await p.evaluate(() => { BLOOM_API.addBiomass(4000); for (const id of ["warm", "warm"]) BLOOM_API.buy(id); const S = BLOOM_API.sim, CL = S.climate;
            for (let k = 0; k < 3000 && !S.lost && !(Math.abs(CL.offsets.temp) > 0.5 && CL.shocks.some(x => !x.ended)); k++) BLOOM_API.advance(1);
            return { offsets: { ...CL.offsets }, shocks: CL.shocks.map(x => ({ name: x.name, ended: x.ended })), forcing: CL.forcing.length, lost: !!S.lost }; });
          await openAdapt(); const during = await spec("adapt");
          const reg = await p.evaluate(() => { const D = BLOOM.decisionRooms.instance, r = D.adapter.region(D.state().context); return { t: r.raw.effectiveTemp }; });
          check(shock.forcing === 2 && !shock.lost && shock.shocks.some(x => !x.ended) && Math.abs(shock.offsets.temp) > 0.5 && during && Math.abs(during.t - Math.round(reg.t * 10) / 10) < 0.11 && during.env !== before.env,
            `[${bn}] E2 volatile_climate · a real climate shock (two bought Terraform steps; the engine's own shock — none injected) appears in the specimen scene`, J({ shock, before: before && before.t, during: during && during.t, region: reg }));
          await closeRoom();
        }
        if (id === "native_competition") {
          await openAdapt(); const a = await spec("adapt"); await closeRoom();
          check(a && a.keys === "horizon,kind,m,planet,rad,region,salt,seed,skyline,t,toxic,v", `[${bn}] E3 native_competition · the specimen scene is the region's own environment only (no fake native plants)`, a && a.keys);
        }
        // the report: the Challenge, its provenance, the Challenge actions
        await winNow(p); await reportOpen(p);
        const RP = await reportFacts(p), fact = RP.facts.find(x => x[0] === "Challenge"), I = RP.identity.challengeRun;
        check(fact && fact[1] === NAMES[id] && !RP.facts.some(x => x[0] === "Scenario") && /challenge debrief/.test(RP.kicker) && J(RP.acts) === J(["keepPlaying", "retryChallenge", "challenges", "mainMenu"])
            && J(RP.labels) === J(["Retry challenge", "Challenges", "Main menu"]) && !RP.acts.includes("choosePlanet") && !RP.acts.includes("playAgain")
            && I && I.challengeId === id && I.challengeVersion === 2 && I.recipeVersion === 1 && I.launchSeed === seed && I.planetSeed === DOS.worldSeed && I.fingerprint === DOS.fp && I.speciesId === sp && I.scenarioId === id && RP.identity.startingState === null && !RP.given,
          `[${bn}] F5 ${id} · the report names the Challenge under a challenge debrief, carries the run's provenance (challenge id / version, recipe version, launch seed, planet seed / fingerprint, species, scenario), and offers KEEP PLAYING · RETRY CHALLENGE · CHALLENGES · MAIN MENU (never "Choose another planet")`,
          `${J(RP.acts)} · ${J(RP.facts.find(x => x[0] === "Challenge"))}`);
        await shot(p, `07-report-${id}.png`, { firefox: id === "dying_world" });
        const D1 = await storageClean(p);
        check(p.navs === 1 && D1.href === href0 && !D1.leak.length && !D1.name && !p.reqs.some(u => /[?&](challenge|scenario|instance)=/.test(u)) && !p.errs.length,
          `[${bn}] D1 ${id} · one document: no navigation, the address never changed, no Challenge in localStorage / sessionStorage / window.name / a request URL (the launch seed is application state); no console error`,
          `navs ${p.navs} · leak ${J(D1.leak)}${p.errs.length ? " · " + p.errs.join(" | ") : ""}`);
        await c.close();
      }

      // ------------------------------------------------------------------ I · invariants (Dying World) · K · keyboard
      { const c = await context(), p = await page(c);
        await p.goto(`${ORIGIN}/?launch=9&workers=6&bg=9`); await menuReady(p);
        await openHub(p); await beginChallenge(p, "dying_world");
        // I1 · Back while PREPARING cancels the search cleanly (its workers terminated), then the same species again prepares normally
        await p.evaluate(SS => { const s = eval(SS); s.open("cinder_rosette"); }, SS); await p.click(".ss-btn.go"); await worldOpen(p);
        const pre = await p.evaluate(CW => { const s = MENU_DEV.entry.launch.search; window.__sel = s.selection; window.__selects = s.stats.selects.length; return eval(CW).state; }, CW);
        await p.keyboard.press("Escape"); await speciesReady(p);
        // the cancelled selection is gone (its queued draws dropped, its busy workers terminated); the species screen then prepares the
        // still-selected plant again as a NEW selection (the screen's warm-up) — never the cancelled one resumed
        const can = await p.evaluate(() => { const s = MENU_DEV.entry.launch.search, old = window.__sel, rec = s.stats.selects[window.__selects - 1];
          return { cancelled: !!(old && old.cancelled), rec: rec && { species: rec.species, cancelled: !!rec.cancelled }, leftovers: s._queue.filter(t => t.group === old.group).length + s._pool.filter(x => x.task && x.task.group === old.group).length,
            current: s.selection && s.selection !== old, worldView: !!MENU_DEV.entry.worldView, state: MENU_DEV.entry.state }; });
        await p.evaluate(SS => eval(SS).open("woolly_candle"), SS); await p.click(".ss-btn.go"); await worldReady(p);
        const W1 = await p.evaluate(CW => ({ fp: eval(CW).instance.fingerprint, launch: eval(CW).instance.launchSeed, sp: eval(CW).instance.speciesId }), CW);
        check(pre === "preparing" && can.cancelled && can.rec && can.rec.cancelled && can.leftovers === 0 && can.current !== false && !can.worldView && can.state === "species" && W1.sp === "woolly_candle" && W1.launch === 9 && !p.errs.length,
          `[${bn}] I1 · Back (Escape) while PREPARING cancels the search cleanly (no selection left, its busy workers terminated) and returns to Choose Plant Species; choosing again prepares normally on the same launch`, J({ pre, can, W1 }));
        // K1 · keyboard on the dossier: focus on the world's heading, Tab reaches Begin challenge; I2 · Back from the dossier → species; the same species = the same planet
        const K = await p.evaluate(() => document.activeElement && document.activeElement.tagName + (document.activeElement.closest(".cw-dossier") ? ".dossier" : ""));
        let tabbed = null; for (let i = 0; i < 40 && tabbed !== "begin"; i++) { await p.keyboard.press("Tab"); tabbed = await p.evaluate(() => document.activeElement && document.activeElement.dataset.act); }
        const ring = await p.evaluate(() => { const cs = getComputedStyle(document.activeElement); return cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) >= 2; });
        await p.keyboard.press("Escape"); await speciesReady(p);
        const back = await p.evaluate(SS => ({ state: MENU_DEV.entry.state, sel: eval(SS).selected.id, launch: MENU_DEV.entry.launch.launchSeed }), SS);
        const tSame = Date.now(); await p.evaluate(SS => eval(SS).open("woolly_candle"), SS); await p.click(".ss-btn.go"); await worldReady(p); const sameMs = Date.now() - tSame;
        const W2 = await p.evaluate(CW => ({ fp: eval(CW).instance.fingerprint, launch: eval(CW).instance.launchSeed }), CW);
        check(K === "H2.dossier" && tabbed === "begin" && ring && back.state === "species" && back.sel === "woolly_candle" && back.launch === 9 && W2.fp === W1.fp && W2.launch === 9,
          `[${bn}] K1 + I2 · keyboard: the dossier opens with focus on the world's heading, Tab reaches Begin challenge (visible focus ring), Escape is Back → Choose Plant Species (same launch); choosing the same plant again is the SAME planet (the launch's finished selection, ${sameMs} ms)`, J({ K, tabbed, back, W1: W1.fp, W2: W2.fp }));
        // another species on the same launch: evaluated for it (the same species-free stream)
        await p.keyboard.press("Escape"); await speciesReady(p);
        await p.evaluate(SS => eval(SS).open("organic_hybrid"), SS); await p.click(".ss-btn.go"); await worldReady(p);
        const W3 = await p.evaluate(CW => { const X = eval(CW).instance, L = MENU_DEV.entry.launch.search; return { fp: X.fingerprint, sp: X.speciesId, launch: X.launchSeed, stream: X.stream, hits: L.stats.selects.at(-1).physicalHits }; }, CW);
        check(W3.sp === "organic_hybrid" && W3.launch === 9 && W3.hits > 0,
          `[${bn}] I3 · Change Species (Back → another plant) evaluates the SAME launch's species-free stream for the new plant (its held physical worlds reused); no promise that the planet stays the same`, J(W3));
        await shot(p, "05b-dossier-organic_hybrid.png");
        await beginRun(p, 1);
        const R1 = await runId(p); await p.evaluate(() => { window.__sim1 = BLOOM_APP.session.sim; window.__session1 = BLOOM_APP.session; BLOOM_API.advance(120); });
        // I4 · RETRY CHALLENGE: the same instance objects, a fresh simulation
        await winNow(p); await reportOpen(p); await p.click('#rrActs [data-act="retryChallenge"]'); await runReady(p, 2);
        const R2 = await runId(p), fresh = await p.evaluate(() => ({ newSim: BLOOM_APP.session.sim !== window.__sim1, newSession: BLOOM_APP.session !== window.__session1, ticks: BLOOM_APP.session.sim.ticks, won: BLOOM_APP.session.sim.won,
          ev: MENU_DEV.events.filter(e => e.type === "retry-challenge").map(e => e.challenge) }));
        check(R1.planetSame && R2.planetSame && R2.speciesSame && R2.challengeSame && R2.fp === R1.fp && R2.launchSeed === 9 && R2.scenario === "dying_world" && R2.simScenario === "dying_world" && R2.simSpecies === "organic_hybrid"
            && fresh.newSim && fresh.newSession && fresh.ticks < 5 && !fresh.won && J(fresh.ev) === J(["dying_world"]),
          `[${bn}] I4 · RETRY CHALLENGE: the same Challenge, scenario, species and EXACT planet object (same fingerprint, same launch) in a fresh session with a fresh simulation`, J({ fp: R2.fp, fresh }));
        await shot(p, "08-retry-same-world.png");
        // I5 · CHALLENGES → the hub; beginning the Challenge again is a NEW launch (a new launch seed: a fresh instance)
        await winNow(p); await reportOpen(p); await p.click('#rrActs [data-act="challenges"]'); await hubReady(p);
        const H = await p.evaluate(H => ({ state: MENU_DEV.entry.state, sel: eval(H).selected.id, ch: MENU_DEV.entry.challenge, launch: MENU_DEV.entry.launch, app: BLOOM_APP.challenge, run: !!BLOOM_APP.session }), HUB);
        await shot(p, "09-back-to-hub.png");
        await p.click(".ch-btn.go"); await speciesReady(p);
        const L2 = await p.evaluate(() => MENU_DEV.entry.launch.launchSeed);
        await p.evaluate(SS => eval(SS).open("organic_hybrid"), SS); await p.click(".ss-btn.go"); await worldReady(p);
        const W4 = await p.evaluate(CW => ({ fp: eval(CW).instance.fingerprint, launch: eval(CW).instance.launchSeed }), CW);
        check(H.state === "challenges" && H.sel === "dying_world" && H.ch === null && H.launch === null && H.app === null && !H.run && L2 !== 9 && W4.launch === L2,
          `[${bn}] I5 · CHALLENGES from the report → the hub (the Challenge selected, no launch held); BEGIN CHALLENGE again is a NEW launch (launch seed ${L2} ≠ 9): a fresh instance (${W4.fp === W1.fp || W4.fp === W3.fp ? "this time the same planet by chance" : "a different planet"})`, J({ H, L2, W4 }));
        await shot(p, "09b-new-launch-dossier.png");
        // I6 · MAIN MENU clears the Challenge; EXPEDITION keeps its 3 × 3 Destination Survey (Expected hazards), no residue
        await p.keyboard.press("Escape"); await speciesReady(p); await p.keyboard.press("Escape"); await hubReady(p); await p.click('.ch-head [data-act="back"]'); await menuReady(p);
        const MM = await p.evaluate(() => ({ ch: MENU_DEV.entry.challenge, launch: MENU_DEV.entry.launch, app: BLOOM_APP.challenge, cr: BLOOM_APP.challengeRun }));
        await p.click('.mm-item[data-act="begin"]'); await speciesReady(p);
        await p.evaluate(SS => eval(SS).open("woolly_candle"), SS);
        const EK = await p.evaluate(() => ({ kicker: document.querySelector(".ss-kicker").textContent, go: document.querySelector(".ss-go-l").textContent, launch: MENU_DEV.entry.launch }));
        await p.click(".ss-btn.go"); await surveyReady(p);
        const ES = await p.evaluate(() => { const s = MENU_DEV.entry.survey; return { cells: s.cells.length, classes: [...new Set(s.cells.map(c => c.classId))].sort(), cols: document.querySelectorAll(".ds-cand").length,
          prov: s.cells.every(c => !("scenarioId" in c) && !("scenarioValidation" in c)), kicker: document.querySelector(".ds-kicker").textContent, change: !!document.querySelector(".ds-species-change"), scan: !!document.querySelector('[data-act="scan"]') }; });
        await p.evaluate(() => MENU_DEV.entry.survey.select(0)); await p.waitForFunction(() => MENU_DEV.entry.survey.state === "focus", null, { timeout: 20000, polling: 50 });
        const HZ = await p.evaluate(() => ({ h3: document.querySelector(".ds-challenges h3").textContent, label: document.querySelector(".ds-btn.go").innerText.trim() }));
        await shot(p, "10-expedition-survey-expected-hazards.png", { firefox: true });
        await p.click(".ds-btn.go"); await runReady(p, 3);
        const ER = await runId(p); await winNow(p); await reportOpen(p); const EF = await reportFacts(p);
        check(MM.ch === null && MM.launch === null && MM.app === null && MM.cr === null && EK.kicker === "Expedition" && /^Survey for /.test(EK.go) && EK.launch === null && ES.cells === 9 && ES.cols === 9 && J(ES.classes) === J(["extreme", "favorable", "precarious"])
            && ES.prov && ES.kicker === "Strange Bloom" && ES.change && ES.scan && HZ.h3 === "Expected hazards" && HZ.label === "Begin expedition"
            && ER.challenge === null && ER.scenario === null && ER.simScenario === null && !ER.mech.pressure && !ER.mech.competition && !ER.mech.climate && ER.cr === null && ER.expedition && ER.adapter === null
            && !/Challenge/.test(ER.hud + ER.footer) && J(EF.facts.find(x => x[0] === "Scenario")) === J(["Scenario", "None"]) && J(EF.acts) === J(["keepPlaying", "playAgain", "choosePlanet", "mainMenu"]) && EF.identity.challengeRun === null,
          `[${bn}] I6 · MAIN MENU clears the Challenge (no launch, no instance); EXPEDITION keeps its 3 × 3 Destination Survey (Favorable / Precarious / Extreme, Change Species, Scan New Sector, "EXPECTED HAZARDS", Begin expedition) and a run with no Challenge residue (default scenario, no Challenge provenance, report "Scenario · None", Play again · Choose another planet · Main menu)`,
          J({ MM, EK, ES, HZ, report: EF.acts }));
        await p.click('#rrActs [data-act="mainMenu"]'); await menuReady(p);
        // I7 · TRAINING unchanged
        await p.click('.mm-item[data-act="training"]');
        await p.waitForFunction(() => window.BLOOM_APP && BLOOM_APP.session && BLOOM_APP.session.run.training && BLOOM_APP.stats.sessions.at(-1).readyMs !== null, null, { timeout: 60000, polling: 50 });
        await p.waitForTimeout(800);
        const TR = await p.evaluate(() => { const S = BLOOM_APP.session, M = S.adapter.run().mechanics; return { mech: !M.pressure && !M.competition && !M.climate, training: !!S.run.training, species: S.run.species.id, scenario: S.run.scenario, challenge: S.run.challenge || null,
          cr: S.run.challengeRun || null, start: S.sim.startingState, sim: S.sim.scenario ? S.sim.scenario.id : null, app: BLOOM_APP.challenge, hud: (document.querySelector(".pv-id small") || {}).textContent }; });
        check(TR.training && TR.species === "organic_hybrid" && TR.scenario === null && TR.challenge === null && TR.cr === null && TR.start === null && TR.sim === null && TR.mech && TR.app === null && !/Challenge/.test(TR.hud || ""),
          `[${bn}] I7 · TRAINING unchanged: Organic Hybrid, the default scenario, no Challenge, no starting state`, J(TR));
        check(!p.errs.length, `[${bn}] I8 · no console / page error through the invariant walk`, p.errs.join(" | ") || "clean");
        await c.close(); }

      // ------------------------------------------------------------------ X · QA fixtures: prescribed species · prescribed starting state
      { const c = await context(), p = await page(c);
        await p.goto(`${ORIGIN}/?workers=6&bg=4`); await menuReady(p); await openHub(p);
        const hubIds = await p.evaluate(() => [...document.querySelectorAll(".ch-card")].map(x => x.dataset.challenge));
        // the prescribed-species fixture, started from the hub state the way BEGIN CHALLENGE starts a Challenge (it is never on the hub)
        await p.evaluate(fx => { const ch = BLOOM.challenges.fixture(fx); MENU_DEV.entry.nextLaunchSeed = 7; window.__speciesOpened = MENU_DEV.events.filter(e => e.type === "species-screen").length; MENU_DEV.entry._challengeChosen(ch); }, FX_PRESCRIBED);
        await worldReady(p);
        const XP = await p.evaluate(CW => { const v = eval(CW), r = v.root; return { species: v.instance.speciesId, policy: v.instance.speciesPolicy, note: (r.querySelector(".cw-sp-note") || {}).textContent || null, sp: r.querySelector(".cw-sp-name").textContent,
          speciesScreen: MENU_DEV.events.filter(e => e.type === "species-screen").length !== window.__speciesOpened, fx: v.instance.challengeId, hub: BLOOM.challenges.ids().includes(v.instance.challengeId) }; }, CW);
        await shot(p, "11-fixture-prescribed-species.png");
        await p.keyboard.press("Escape"); await hubReady(p);
        const XB = await p.evaluate(() => ({ state: MENU_DEV.entry.state, launch: MENU_DEV.entry.launch, ch: MENU_DEV.entry.challenge }));
        check(!hubIds.includes("qa_prescribed_reed") && XP.fx === "qa_prescribed_reed" && !XP.hub && XP.species === "reed_spire" && XP.policy === "prescribed" && XP.sp === "Reed Spire" && /prescribes the plant/.test(XP.note || "") && !XP.speciesScreen
            && XB.state === "challenges" && XB.launch === null && XB.ch === null,
          `[${bn}] X1 · a PRESCRIBED-species Challenge (QA fixture, never on the hub) skips Choose Plant Species: BEGIN CHALLENGE → PREPARING → the dossier names the prescribed plant ("This Challenge prescribes the plant."); Back returns to the hub`, J({ XP, XB }));
        // the starting-state fixture: the run lands owned + the exact Biomass; the report says the Challenge gave it
        await p.evaluate(fx => { const ch = BLOOM.challenges.fixture(fx); MENU_DEV.entry.nextLaunchSeed = 4242; MENU_DEV.entry._challengeChosen(ch); }, FX_START);
        await worldReady(p);
        const XS = await p.evaluate(CW => ({ start: eval(CW).root.querySelector(".cw-start").textContent, st: eval(CW).instance.startingState }), CW);
        await shot(p, "12-fixture-starting-state.png");
        await p.click(".cw-btn.go");
        await p.waitForFunction(() => window.BLOOM_APP && BLOOM_APP.session && BLOOM_APP.stats.sessions.at(-1).readyMs !== null && !document.querySelector(".atx") && MENU_DEV.entry.black.style.display === "none", null, { timeout: 120000, polling: 50 });
        const RS = await p.evaluate(() => { const S = BLOOM_APP.session.sim; return { genome: { cold: S.genome.cold, salt: S.genome.salt }, start: S.startingState, spent: S.spent.global, cr: BLOOM_APP.session.run.challengeRun.startingState }; });
        await winNow(p); await reportOpen(p); const RG = await reportFacts(p);
        await shot(p, "12b-fixture-starting-state-report.png");
        check(/Cold Tolerance · Salt Handling · 250 Biomass \(given by the Challenge\)/.test(XS.start) && RS.genome.cold === 1 && RS.genome.salt === 1 && RS.start.biomass === 250 && RS.spent === 0
            && J(RS.cr) === J({ adaptations: ["cold", "salt"], biomass: 250, source: "challenge" }) && J(RG.identity.startingState) === J({ adaptations: ["cold", "salt"], names: ["Cold Tolerance", "Salt Handling"], biomass: 250, source: "challenge" })
            && /Given by the Challenge at landing: Cold Tolerance · Salt Handling · 250 Biomass/.test(RG.given || ""),
          `[${bn}] X2 · a PRESCRIBED STARTING STATE (QA fixture): the dossier says what the plant lands with; the run starts with Cold Tolerance + Salt Handling owned and exactly 250 Biomass, nothing spent; the run / report provenance records it as the Challenge's (\"Given by the Challenge at landing\"), never as a purchase`,
          J({ XS: XS.start, RS, given: RG.given }));
        check(!p.errs.length, `[${bn}] X3 · no console / page error through the fixtures`, p.errs.join(" | ") || "clean");
        await c.close(); }

      // ------------------------------------------------------------------ P · file:// offline · B · /bloom/
      for (const [tag, url, offline] of [["P1 · file:// offline (a double-clicked index.html, the network off)", `${FILE_INDEX}?launch=2&workers=6`, true], ["B1 · HTTP /bloom/ (the static Pages site under a project subpath)", `${ORIGIN}/bloom/?launch=2&workers=6`, false]]) {
        const c = await context({ offline }), p = await page(c);
        await p.goto(url); await menuReady(p); await openHub(p); await beginChallenge(p, "dying_world"); await chooseSpecies(p, "woolly_candle"); await worldReady(p);
        const fp = await p.evaluate(CW => eval(CW).instance.fingerprint, CW); await beginRun(p, 1);
        const R = await runId(p), where = await p.evaluate(() => ({ path: location.pathname, protocol: location.protocol, portable: !!window.BLOOM_PORTABLE, workers: window.BLOOM_PORTABLE ? BLOOM_PORTABLE.stats.workersStarted : null }));
        const outside = offline ? p.reqs.filter(u => !u.startsWith("file:") && !u.startsWith("blob:") && !u.startsWith("data:")) : p.reqs.filter(u => !u.startsWith(`${ORIGIN}/bloom/`) && !u.startsWith("blob:") && !u.startsWith("data:"));
        check(R.planetSame && R.fp === fp && R.challenge === "dying_world" && R.simScenario === "dying_world" && R.simSpecies === "woolly_candle" && R.launchSeed === 2 && !outside.length && p.navs === 1 && !p.errs.length
            && (offline ? where.protocol === "file:" && where.portable && where.workers > 0 : where.path === "/bloom/"),
          `[${bn}] ${tag}: the hub and a complete one-planet Challenge launch (species → PREPARING → the dossier → the exact planet in a Dying World run), one document, no request outside ${offline ? "the local files (the portable runtime's blob workers)" : "/bloom/"}`,
          `${where.protocol}${where.path} · ${fp} · outside ${outside.length}${outside.length ? " " + outside.slice(0, 3).join(" ") : ""}${p.errs.length ? " · " + p.errs.join(" | ") : ""}`);
        await c.close();
      }
    } catch (e) { check(false, `[${bn}] uncaught`, e.stack || String(e)); }
    await browser.close();
  }
  srv.close();
}
