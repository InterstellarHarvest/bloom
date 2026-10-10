// BLOOM — player launch flow helpers (BLOOM-016). No DOM. Used by the launcher (index.html), the run page in player mode
// (demos/demo-run.html?play=1) and its background worker (resources/bloom-play-worker.js), and by tools/game-flow-check.js.
//
//   BLOOM.play.availability(scenario, archetypeId)      → { allowed, reason } from the scenario's own data
//                                                          (scenario.validation.archetypes[id].allowed === false = DISALLOWED)
//   BLOOM.play.pickSeeds(n, policy, randomUint32, avoid) → n distinct World Seeds in [policy.seedMin, policy.seedMax]
//   BLOOM.play.searchWorld({ archetype, scenario, seeds, config, traits })
//                                                        → a generator: yields progress steps, returns the outcome
//   BLOOM.play.runSearch(opts, onStep)                   → drives searchWorld to the end synchronously (Node / fallback)
//   BLOOM.play.stripPlanet(planet)                       → the planet with its validator solutions removed
//   BLOOM.play.runQuery({ archetype, seed, scenario })   → "play=1&archetype=…&seed=…&scenario=…" for demo-run.html
//   BLOOM.play.deriveConfig(base, overrides)             → a NEW config: a deep copy of `base` with `overrides` merged in
//                                                          (BLOOM-028D1: the training run's config; `base` is never touched)
//   BLOOM.play.trainingQuery({ planet, returnTo })       → "training=1[&planet=…][&return=…]" for demo-run.html (028D1)
//   BLOOM.play.safeReturn(value, here, fallback)         → where a training run may go back to: `value` (the return= parameter)
//                                                          resolved against `here`, only if it is the same origin; else
//                                                          `fallback` resolved against `here`. Never another site, never
//                                                          javascript: or data: (028D1)
//
// The bounded world search: for each candidate World Seed in order, the real production path runs —
//   1. BLOOM.generateFromArchetype (archetype layers 1–8; its own deterministic attempt loop is part of that seed's identity);
//   2. when the scenario changes the run (BLOOM.pressure.isDynamic), BLOOM.validateScenario (layer P) on that world.
// The first candidate that passes both is the run. A rejected candidate is never returned; the search moves on to the next
// seed. A DISALLOWED combination stops at once (it is a property of planet + scenario, not of a seed). If every candidate is
// rejected the outcome is an explicit failure: never a different planet, never a weaker scenario, never the default instead.
(function (root) {
  "use strict";
  const BLOOM = root.BLOOM;
  if (!BLOOM || !BLOOM.generateFromArchetype || !BLOOM.validateScenario || !BLOOM.pressure)
    throw new Error("bloom-play.js needs bloom-sim, bloom-gen, bloom-validate, bloom-witness, bloom-archetype and bloom-scenario loaded first");

  function availability(scenario, archetypeId) {
    const p = scenario && scenario.validation && scenario.validation.archetypes && scenario.validation.archetypes[archetypeId];
    return p && p.allowed === false ? { allowed: false, reason: p.reason || "" } : { allowed: true, reason: null };
  }

  function pickSeeds(n, policy, randomUint32, avoid) {
    const lo = policy.seedMin, span = policy.seedMax - policy.seedMin + 1, out = [];
    for (let guard = 0; out.length < n && guard < n * 50; guard++) {
      const s = lo + (randomUint32() % span);
      if (s !== avoid && !out.includes(s)) out.push(s);
    }
    return out;
  }

  // the player never sees validator solutions: drop the witness plan and strategy signatures (same as the BLOOM-007 harness)
  function stripPlanet(planet) {
    const { witness, strategies, rejectedAttempts, ...ident } = planet.archetype;
    planet.archetype = { ...ident, rejectedAttemptCount: rejectedAttempts.length };
    return planet;
  }

  function* searchWorld({ archetype, scenario, seeds, config, traits }) {
    const A = archetype, S = scenario || null, dynamic = BLOOM.pressure.isDynamic(S), tried = [];
    const total = seeds.length;
    const av = availability(S, A.id);
    if (!av.allowed) return { ok: false, status: "DISALLOWED", reason: av.reason, tried };
    for (let i = 0; i < seeds.length; i++) {
      const seed = seeds[i];
      yield { step: "terrain", seed, index: i, total };
      let planet;
      try { planet = BLOOM.generateFromArchetype(A, seed, { config, traits }); }
      catch (e) { if (!e.attempts) throw e;
        tried.push({ seed, outcome: "planet" });
        if (i + 1 < total) yield { step: "retry", seed, index: i, total, why: "planet" };
        continue; }
      let verdict = null;
      if (dynamic) {
        yield { step: "scenario", seed, index: i, total };
        verdict = BLOOM.validateScenario(planet, config, traits, S, { archetypeId: A.id });
        if (verdict.status === "DISALLOWED") return { ok: false, status: "DISALLOWED", reason: verdict.reason, tried };
        if (!verdict.ok) { tried.push({ seed, outcome: "scenario", status: verdict.status });
          if (i + 1 < total) yield { step: "retry", seed, index: i, total, why: "scenario" };
          continue; }
      }
      tried.push({ seed, outcome: "accepted" });
      yield { step: "ready", seed, index: i, total };
      return { ok: true, seed, planet: stripPlanet(planet), tried,
        scenarioValidation: verdict ? { status: verdict.status, strategiesProven: verdict.strategies.length, required: verdict.required } : null };
    }
    return { ok: false, status: "EXHAUSTED", reason: `no candidate passed (${tried.length} tried)`, tried };
  }

  function runSearch(opts, onStep) {
    const it = searchWorld(opts);
    for (;;) { const r = it.next(); if (r.done) return r.value; if (onStep) onStep(r.value); }
  }

  function runQuery({ archetype, seed, scenario }) {
    const q = ["play=1"];
    if (archetype) q.push("archetype=" + encodeURIComponent(archetype));
    if (seed != null) q.push("seed=" + encodeURIComponent(seed));
    if (scenario) q.push("scenario=" + encodeURIComponent(scenario));
    return q.join("&");
  }

  // (BLOOM-028D1) A run that needs its own numbers (the training run) gets a derived copy, never an edit of the shared config:
  // `base` is deep-copied (config is plain data) and `overrides` merged in, object by object. An override may only change a
  // key the base already has, with a value of the same kind, so a typo is refused instead of silently adding a dead setting.
  function deriveConfig(base, overrides) {
    const out = JSON.parse(JSON.stringify(base));
    const merge = (dst, src, at) => { for (const k of Object.keys(src || {})) {
      const p = at ? `${at}.${k}` : k, v = src[k], o = dst[k];
      if (!(k in dst)) throw new Error(`deriveConfig: "${p}" is not a config setting`);
      const isObj = x => x !== null && typeof x === "object" && !Array.isArray(x);
      if (isObj(o) !== isObj(v) || (!isObj(o) && typeof o !== typeof v)) throw new Error(`deriveConfig: "${p}" must be a ${isObj(o) ? "group" : typeof o}`);
      if (isObj(o)) merge(o, v, p); else dst[k] = Array.isArray(v) ? v.slice() : v; } };
    merge(out, overrides, "");
    return out;
  }

  // (BLOOM-028D1) the training URL contract: demo-run.html?training=1 opens the training world (BLOOM_DATA.training.planetId)
  // paused; planet= names another authored world; return= is where Skip / Main menu / a finished training go back to
  function trainingQuery({ planet, returnTo } = {}) {
    const q = ["training=1"];
    if (planet) q.push("planet=" + encodeURIComponent(planet));
    if (returnTo) q.push("return=" + encodeURIComponent(returnTo));
    return q.join("&");
  }
  function safeReturn(value, here, fallback) {
    const base = new URL(here), ok = u => u.origin === base.origin && /^(https?|file):$/.test(u.protocol) && u.protocol === base.protocol;
    if (value) { try { const u = new URL(value, base); if (ok(u)) return u.href; } catch (e) { /* not a URL: the fallback */ } }
    return new URL(fallback, base).href;
  }

  root.BLOOM.play = { availability, pickSeeds, stripPlanet, searchWorld, runSearch, runQuery, deriveConfig, trainingQuery, safeReturn };
})(typeof window !== "undefined" ? window : globalThis);
