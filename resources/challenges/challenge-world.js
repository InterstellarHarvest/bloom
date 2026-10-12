// BLOOM — Challenge world helpers (BLOOM-036B; 036B1: the live per-launch world search is RETIRED). docs/CHALLENGES_SYSTEM_v1.md §4.
// Pure ES module (Node and browser). Since BLOOM-036B1 a Challenge takes its world from a prevalidated SEED BANK (./challenge-bank.js, built
// offline by tools/build-challenge-seed-bank.mjs): the browser no longer searches a stream and proves candidates. What remains here is shared
// by the runtime (the launch seed) and the offline tools (the bank builder, the latency study):
//   newLaunchSeed(random?)                         → a fresh launch seed (crypto.getRandomValues; never Math.random)
//   inArrival(habitable, recipe)                   → is an arrival share inside the recipe's band
//   predictHabitable(pick, deps, species, start)   → the cheap structural (layers 1–3) arrival share of an (archetype, World Seed)
//   nativeStartShare(planet, scenarioId, species)  → the scenario's native cover at the start (the engine's own probe)
import { assessWorld, physicalKey } from "../destination-survey/survey-data.js";

const deps0 = deps => ({ BLOOM: (deps && deps.BLOOM) || globalThis.BLOOM, BLOOM_DATA: (deps && deps.BLOOM_DATA) || globalThis.BLOOM_DATA });

/** A fresh launch seed (1 … 2³¹−1) — the only non-deterministic input of a Challenge instance. `random` (QA) replaces crypto. */
export function newLaunchSeed(random = null) {
  if (typeof random === "function") return 1 + Math.floor(random() * 0x7ffffffe);
  const c = globalThis.crypto; if (!c || !c.getRandomValues) throw new Error("challenge-world: no crypto.getRandomValues for a launch seed (pass one)");
  const a = new Uint32Array(1); c.getRandomValues(a); return 1 + (a[0] % 0x7ffffffe);
}

/** The recipe's arrival band (species-relative habitable share). */
export function inArrival(habitable, recipe) {
  const A = recipe.arrival; if (!A) return true;
  return !(A.minHabitable != null && habitable < A.minHabitable) && !(A.maxHabitable != null && habitable > A.maxHabitable);
}

/** The cheap structural prediction for (archetype, World Seed): its arrival share for the species (layers 1–3, never shown). */
export function predictHabitable(pick, deps, species, startingState, cache) {
  const { BLOOM, BLOOM_DATA: D } = deps0(deps), A = D.archetypes.find(a => a.id === pick.archetypeId);
  const k = physicalKey(pick, deps), C = cache && cache.structural;
  let w = C ? C.get(k) : undefined;
  if (w === undefined) {
    try { w = BLOOM.generateFromArchetype(A, pick.seed, { config: D.config, traits: D.traits, winnability: false }); }
    catch (e) { if (!e.attempts) throw e; w = null; }
    if (C) C.set(k, w);
  }
  return w ? assessWorld(w, deps, species, startingState).habitable : null;
}

/** The scenario's native cover on this planet at the start (the engine's own probe; planet-derived). Null without a competitor. */
export function nativeStartShare(planet, scenarioId, species, deps) {
  const { BLOOM, BLOOM_DATA: D } = deps0(deps), S = BLOOM.pressure.resolveScenario(D.scenarios, scenarioId);
  if (!S.competition) return null;
  return BLOOM.createSim(planet, D.config, D.traits, { rng: () => 0.5, scenario: S, species }).competition.startShare;
}
