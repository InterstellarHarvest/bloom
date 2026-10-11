// BLOOM — Challenge worlds (BLOOM-036B): ONE generated qualifying planet per Challenge instance. docs/CHALLENGES_SYSTEM_v1.md §4–§5.
// Pure ES module: no DOM, no Three.js, no module state written, so Node imports it (tools/challenge-world-check.js, the recipe study)
// and the survey worker runs it (resources/destination-survey/survey-worker.js "challenge-*" tasks). The BLOOM classic scripts are passed
// in as `deps = { BLOOM, BLOOM_DATA }` (default: globalThis), never re-implemented here.
//
// NOT A SECOND WORLD SYSTEM. A Challenge world is a world of the normal physical stream, produced by the survey's own production path
// (survey-data physicalCandidate: BLOOM.play.runSearch, default scenario, archetype layers 1–8 → stripPlanet — the same species-free
// planet object for every species), judged by the survey's own species evaluation (evaluateSpecies: engine evaluate() + BLOOM.species
// .validateFor S2) and by the engine's own scenario validation (BLOOM.validateScenario, layer P, with the species and the starting state).
// The Challenge's RECIPE (content/challenges.js launch.world.recipe) only decides which FINISHED world is accepted; the species, the recipe
// and the scenario never alter the planet a (archetype, World Seed) generates.
//
// THE STREAM. A Challenge instance has a LAUNCH SEED (a fresh one per BEGIN CHALLENGE on the hub). Its draw stream is a pure function of
// (launch seed, Challenge id, Challenge version, recipe version) — NOT of the species — so every species looks at the same physical worlds
// in the same order: draw i = (archetype from recipe.archetypes, World Seed in content/play.js search.seedMin…seedMax), computed directly
// from i (drawAt; no replay). No Math.random anywhere here.
//
// THE RULE (stages, in this order — the first that fails rejects the draw for this species; nothing rejected is ever shown):
//   predicted   (only with a recipe.arrival band) the draw's cheap STRUCTURAL world (layers 1–3, never shown) assessed for the species must
//               fall in the band — the survey's own prediction step, so slow validations are spent on draws that can qualify
//   physical    the fully validated world exists for that seed (physicalCandidate; null = none passes)
//   recipe      archetype ∈ recipe.archetypes · arrival habitable share (species-relative, with the starting state) ∈ the band
//   species     the species can win it (S2, from the prescribed starting state when there is one)
//   cover       (recipe.nativeCover) the scenario's native cover starts on at least that share of the land (engine probe, planet-derived)
//   scenario    layer P passes (BLOOM.validateScenario with the species + starting state) within the PROOF BUDGET (below)
// The instance's world is the FIRST draw in stream order that passes every stage (acceptInOrder): parallel workers may finish draws in
// any order, but acceptance waits for every earlier draw, so a launch seed + Challenge version + species always selects the same planet.
//
//   streamSeed(launchSeed, challenge)                     → uint32 (species-free)
//   drawAt(stream, i, recipe, deps)                       → { draw: i, archetypeId, seed }
//   evaluateDraw(pick, ctx, deps, cache, onStage)         → { draw, archetypeId, seed, stage, ok, physical, evaluation, scenarioValidation, ms }
//                                                           ctx = { species, scenarioId, recipe, startingState, physical? (a held world) }
//   acceptInOrder(results)                                → { done, index } (results[i] in draw order; holes = still running)
//   selectWorld(challenge, launchSeed, species, deps, { maxDraws, cache, onDraw })   → the synchronous path (Node, QA, fallback)
//   makeInstance({ challenge, species, launchSeed, result, … }) → the Challenge instance (application state; see §5)
//   recipeCheck(stage, …) / dossierFor(instance)          → the recipe's own verdicts / the dossier rows
import { physicalCandidate, evaluateSpecies, assessWorld, classFor, physicalKey, planetFingerprint, speciesFor } from "../destination-survey/survey-data.js";

export const FORMAT = 1;                       // the Challenge instance format
export const RULE_VERSION = 1;                 // the selection rule below (stages + proof budget); recorded in every instance
// PROOF BUDGET (early stop, BLOOM-036B recipe study): layer P may run at most this many witness simulations for a Challenge world (the
// scenario validator's own budget is config.validation.diversity.maxSimulations = 40). Counted in simulations, never in time, so it is
// deterministic. It never weakens a proof: the validator's search is ordered, so a world proven within the budget gets the SAME witness
// and verdict as under the full budget; a world that cannot be proven within it (most such searches end INCONCLUSIVE / FAIL after all 40
// simulations — the slow 30–140 s waits) is simply not offered. Confirmation-seed runs are not part of the budget (as in the validator).
export const MAX_DRAWS = 160;                  // a launch's draw budget: only bounds a pathological stream (the study's worst case is far below)
export const RULE_PATH = "challenge-world rule 1: stream (launch seed · Challenge id · version · recipe version) → structural prediction (arrival band) → "
  + "physicalCandidate (BLOOM.play.runSearch, layers 1–8) → recipe → BLOOM.species.validateFor S2 → native cover → BLOOM.validateScenario (layer P, proof budget 6 simulations)";
export const STAGES = Object.freeze(["predicted", "physical", "recipe", "species", "cover", "scenario", "ok"]);

const deps0 = deps => ({ BLOOM: (deps && deps.BLOOM) || globalThis.BLOOM, BLOOM_DATA: (deps && deps.BLOOM_DATA) || globalThis.BLOOM_DATA });
const now = () => (globalThis.performance ? performance.now() : Date.now());
const mulberry32 = a => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const fnv = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193); return h >>> 0; };
const r4 = x => x == null ? null : +x.toFixed(4);

/** The recipe of a resolved Challenge (or a recipe object itself). */
const recipeOf = ch => ch && ch.launch ? ch.launch.world.recipe : ch;

/** A fresh launch seed (1 … 2³¹−1) from a caller-supplied source of randomness — the only non-deterministic input of a Challenge instance.
 *  `random` defaults to crypto.getRandomValues (never Math.random); QA passes a fixed seed instead of calling this. */
export function newLaunchSeed(random = null) {
  if (typeof random === "function") return 1 + Math.floor(random() * 0x7ffffffe);
  const c = globalThis.crypto; if (!c || !c.getRandomValues) throw new Error("challenge-world: no crypto.getRandomValues for a launch seed (pass one)");
  const a = new Uint32Array(1); c.getRandomValues(a); return 1 + (a[0] % 0x7ffffffe);
}

/** The instance's stream seed: launch seed × Challenge id × Challenge version × recipe version. Species-free by construction. */
export function streamSeed(launchSeed, ch) {
  if (!Number.isInteger(launchSeed) || launchSeed < 1) throw new TypeError("challenge-world: a launch seed is a positive integer");
  return (fnv(`${ch.id}|v${ch.version}|recipe${recipeOf(ch).version}`) ^ Math.imul(launchSeed >>> 0, 0x9e3779b1)) >>> 0;
}

/** Draw i of a stream: an archetype the recipe allows and a World Seed in the play search range (pure; any i directly). */
export function drawAt(stream, i, recipe, deps) {
  const { BLOOM_DATA: D } = deps0(deps), pol = (D.play && D.play.search) || { seedMin: 1, seedMax: 99999 }, A = recipe.archetypes;
  const rng = mulberry32((stream + Math.imul(i + 1, 0x85ebca6b)) >>> 0); rng();
  const archetypeId = A[Math.floor(rng() * A.length)], seed = pol.seedMin + Math.floor(rng() * (pol.seedMax - pol.seedMin + 1));
  return { draw: i, archetypeId, seed };
}

/** The recipe's arrival band (species-relative habitable share). */
export function inArrival(habitable, recipe) {
  const A = recipe.arrival; if (!A) return true;
  return !(A.minHabitable != null && habitable < A.minHabitable) && !(A.maxHabitable != null && habitable > A.maxHabitable);
}

/** The cheap structural prediction for a draw (layers 1–3, never shown) — the arrival share it would have for the species. */
export function predictHabitable(pick, deps, species, startingState, cache) {
  const { BLOOM, BLOOM_DATA: D } = deps0(deps), A = D.archetypes.find(a => a.id === pick.archetypeId);
  const k = physicalKey(pick, deps), C = cache && cache.structural;
  let w = C ? C.get(k) : undefined;
  if (w === undefined) {
    try { w = BLOOM.generateFromArchetype(A, pick.seed, { config: D.config, traits: D.traits, winnability: false }); }
    catch (e) { if (!e.attempts) throw e; w = null; }
    if (C) { if (C.size >= 800) C.delete(C.keys().next().value); C.set(k, w); }
  }
  return w ? assessWorld(w, deps, species, startingState).habitable : null;
}

/** The scenario's native cover on this planet at the start (the engine's own probe; planet-derived — what layer P reports as startShare). */
export function nativeStartShare(planet, scenarioId, species, deps) {
  const { BLOOM, BLOOM_DATA: D } = deps0(deps), S = BLOOM.pressure.resolveScenario(D.scenarios, scenarioId);
  if (!S.competition) return null;
  return BLOOM.createSim(planet, D.config, D.traits, { rng: () => 0.5, scenario: S, species }).competition.startShare;
}

export const PROOF_BUDGET = 6;
/** the scenario validator's config with the Challenge proof budget: a deep copy (BLOOM.play.deriveConfig), every other value identical */
const proofConfigs = new WeakMap();
export function proofConfig(BLOOM, C) {
  let c = proofConfigs.get(C);
  if (!c) { c = BLOOM.play.deriveConfig(C, { validation: { diversity: { maxSimulations: Math.min(PROOF_BUDGET, C.validation.diversity.maxSimulations) } } }); proofConfigs.set(C, c); }
  return c;
}

/** Layer P for a Challenge world: the engine's BLOOM.validateScenario with the species and the starting state (plain verdict + evidence). */
export function validateScenarioFor(phys, species, scenarioId, startingState, deps) {
  const { BLOOM, BLOOM_DATA: D } = deps0(deps), sp = speciesFor(species, deps), S = BLOOM.pressure.resolveScenario(D.scenarios, scenarioId);
  if (S.id !== scenarioId || S.id === BLOOM.pressure.DEFAULT_SCENARIO) throw new Error(`challenge-world: "${scenarioId}" is not a real Challenge scenario`);
  const t0 = now(), v = BLOOM.validateScenario(phys.planet, proofConfig(BLOOM, D.config), D.traits, S, { archetypeId: phys.archetypeId || undefined, species: sp, ...(startingState ? { startingState } : {}) });
  const w = (v.strategies || [])[0] || null;
  return { scenarioId: S.id, ok: !!v.ok, status: v.status, reason: v.reason || null, required: v.required, strategiesProven: (v.strategies || []).length,
    proofBudget: PROOF_BUDGET, simulations: v.search ? v.search.simulations : null,
    path: "BLOOM.validateScenario (layer P) with the species" + (startingState ? " and the prescribed starting state" : ""), ms: Math.round(now() - t0),
    competition: v.competition ? { startShare: v.competition.startShare } : null,
    witness: w ? { signature: w.signature, marginSeconds: w.marginSeconds, purchases: w.purchases.length,
      terraformSteps: w.purchases.filter(p => (D.traits.find(t => t.id === p.id) || {}).board === "Terraform").length,
      ...(w.climate ? { shocksBeforeHold: w.climate.shocksBeforeHold } : {}), ...(w.competition ? { nativePeakShare: w.competition.peakShare } : {}) } : null };
}

/**
 * One draw through the rule (header): the stage it stopped at, and what was measured. Plain data (postable from a worker); `physical`
 * (with its planet) is returned for every draw that passed the physical stage, so the page can keep the canonical object for a later
 * species. ctx.physical: a physical candidate the caller already holds for this draw (skips the validation, never the prediction).
 */
export function evaluateDraw(pick, ctx, deps, cache, onStage = null) {
  const { species, scenarioId, recipe, startingState = null } = ctx, sp = speciesFor(species, deps), out = { draw: pick.draw, archetypeId: pick.archetypeId, seed: pick.seed,
    stage: null, ok: false, physical: null, evaluation: null, scenarioValidation: null, predicted: null, nativeStartShare: null, ms: {} };
  const stop = stage => { out.stage = stage; out.ok = stage === "ok"; return out; };
  let t = now();
  if (!recipe.archetypes.includes(pick.archetypeId)) return stop("recipe");
  if (recipe.arrival) { out.predicted = r4(predictHabitable(pick, deps, sp, startingState, cache)); out.ms.predict = Math.round(now() - t);
    if (out.predicted == null || !inArrival(out.predicted, recipe)) return stop("predicted"); }
  t = now(); const phys = ctx.physical && ctx.physical.physicalKey === physicalKey(pick, deps) ? ctx.physical : physicalCandidate({ archetypeId: pick.archetypeId, seed: pick.seed }, deps, cache);
  out.ms.physical = ctx.physical ? 0 : Math.round(now() - t);
  if (!phys) return stop("physical");
  out.physical = phys;
  t = now(); const ev = evaluateSpecies(phys, sp, deps, cache, startingState); out.ms.species = Math.round(now() - t);
  out.evaluation = ev;
  if (!inArrival(ev.habitable, recipe)) return stop("recipe");
  if (!ev.playability.ok) return stop("species");
  if (recipe.nativeCover) { out.nativeStartShare = r4(nativeStartShare(phys.planet, scenarioId, sp, deps));
    if (out.nativeStartShare == null || out.nativeStartShare < recipe.nativeCover.minStartShare) return stop("cover"); }
  if (onStage) onStage("scenario");          // (the Challenge's own proof starts: the longest stage — a page may say so, never which world)
  t = now(); const sv = validateScenarioFor(phys, sp, scenarioId, startingState, deps); out.ms.scenario = Math.round(now() - t);
  out.scenarioValidation = sv;
  return stop(sv.ok ? "ok" : "scenario");
}

/** Stream-order acceptance: the first draw that passed, once every earlier draw is known (results[i]: undefined = still running). */
export function acceptInOrder(results, from = 0) {
  for (let i = from; i < results.length; i++) { const r = results[i]; if (r === undefined) return { done: false, frontier: i }; if (r && r.ok) return { done: true, index: i }; }
  return { done: false, frontier: results.length };
}

/** The synchronous selection (Node, QA, the page's no-worker fallback): draws in order until one passes or the budget runs out. */
export function selectWorld(challenge, launchSeed, species, deps, { maxDraws = MAX_DRAWS, cache = null, onDraw = null, startingState = undefined } = {}) {
  const { BLOOM } = deps0(deps), stream = streamSeed(launchSeed, challenge), recipe = recipeOf(challenge), t0 = now();
  const st = startingState === undefined ? BLOOM.challenges.startingStateOf(challenge) : startingState, stages = {}, results = [];
  for (let i = 0; i < maxDraws; i++) {
    const r = evaluateDraw(drawAt(stream, i, recipe, deps), { species, scenarioId: challenge.scenario, recipe, startingState: st }, deps, cache);
    results.push(r); stages[r.stage] = (stages[r.stage] || 0) + 1; if (onDraw) onDraw(r);
    if (r.ok) return { ok: true, result: r, draws: i + 1, stream, stages, ms: Math.round(now() - t0), results };
  }
  return { ok: false, exhausted: true, draws: maxDraws, stream, stages, ms: Math.round(now() - t0), results };
}

/**
 * The CHALLENGE INSTANCE (docs/CHALLENGES_SYSTEM_v1.md §5): application state, never serialized to the URL or storage. It names everything
 * the run is: the canonical Challenge object (its id, version, recipe version, scenario), the canonical species object, the launch seed,
 * the prescribed starting state, and the EXACT planet object the selection accepted (with its fingerprint, archetype, World Seed and the
 * verdicts it passed). RETRY CHALLENGE replays this object; a new BEGIN CHALLENGE on the hub makes a new one.
 */
export function makeInstance({ challenge, species, launchSeed, result, draws, stream, stages = null, ms = null }, deps) {
  const { BLOOM } = deps0(deps), sp = speciesFor(species, deps), ch = BLOOM.challenges.resolve(challenge.id);
  if (ch !== challenge) throw new Error(`challenge-world: ${challenge.id} is not the canonical Challenge object`);
  if (!result || !result.ok || !result.physical || !result.evaluation || !result.scenarioValidation) throw new Error("challenge-world: an instance needs an accepted draw");
  const P = result.physical, ev = result.evaluation, sv = result.scenarioValidation, recipe = recipeOf(ch), start = BLOOM.challenges.startingStateOf(ch);
  const pres = BLOOM.challenges.speciesOf(ch);
  if (pres && pres !== sp) throw new Error(`challenge-world: ${ch.name} prescribes ${pres.name}, not ${sp.name}`);
  if (ev.species.id !== sp.id || ev.species.physiologyKey !== sp.physiologyKey) throw new Error("challenge-world: the accepted draw was evaluated for another species");
  const fingerprint = planetFingerprint(P.planet);
  if (fingerprint !== P.fingerprint) throw new Error("challenge-world: the accepted planet does not match its validated fingerprint");
  const candidate = { key: P.key, physicalKey: P.physicalKey, worldGenVersion: P.worldGenVersion, name: P.name, authored: false, archetypeId: P.archetypeId, seed: P.seed, attempt: P.attempt,
    worldType: P.worldType, tagline: P.tagline, cue: P.cue, validation: P.validation, fingerprint,
    speciesId: sp.id, physiologyVersion: sp.physiologyVersion, physiologyKey: sp.physiologyKey, habitable: ev.habitable, classId: ev.classId, playability: ev.playability,
    scenarioId: sv.scenarioId, scenarioValidation: sv, nativeStartShare: result.nativeStartShare,
    // provenance of the selection: where in this launch's stream the world was, and the rule it passed
    challenge: { launchSeed, stream, draw: result.draw, draws, recipeVersion: recipe.version, ruleVersion: RULE_VERSION, proofBudget: PROOF_BUDGET, rule: RULE_PATH } };
  return Object.freeze({ kind: "challenge-instance", format: FORMAT,
    challenge: ch, challengeId: ch.id, challengeVersion: ch.version, recipeVersion: recipe.version, recipeKey: ch.recipeKey, scenarioId: ch.scenario,
    species: sp, speciesId: sp.id, speciesPolicy: ch.launch.species.policy,
    launchSeed, stream, draw: result.draw, draws, ruleVersion: RULE_VERSION,
    startingState: start, startingStatePolicy: ch.launch.startingState.policy,
    planet: P.planet, fingerprint, worldSeed: P.seed, archetypeId: P.archetypeId, candidate,
    dossier: ev.dossier, assessment: ev.assessment, render: P.render || null,
    search: { stages, ms } });
}

/** The provenance a run / report keeps of an instance (plain data). */
export const instanceProvenance = X => ({ challengeId: X.challengeId, challengeVersion: X.challengeVersion, recipeVersion: X.recipeVersion, recipeKey: X.recipeKey, ruleVersion: X.ruleVersion,
  scenarioId: X.scenarioId, speciesId: X.speciesId, speciesPolicy: X.speciesPolicy, launchSeed: X.launchSeed, draw: X.draw,
  planetSeed: X.worldSeed, archetypeId: X.archetypeId, fingerprint: X.fingerprint,
  startingState: X.startingState ? { adaptations: [...X.startingState.adaptations], biomass: X.startingState.biomass, source: "challenge" } : null });

export { classFor };
