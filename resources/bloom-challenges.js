// BLOOM — Challenges (BLOOM-036A foundation; BLOOM-036B contained-Challenge launch model). No DOM. docs/CHALLENGES_SYSTEM_v1.md
// (schema §2, flow §3, world recipe §4, instance §5, invariants §6).
//
//   BLOOM.challenges.resolve(id)             → the FROZEN resolved Challenge { id, version, status, name, short, scenario, presentation,
//                                              launch, completion, sources, schema, recipeKey } — an unknown id THROWS (err.code
//                                              "UNKNOWN_CHALLENGE"); never a silent fallback to another Challenge or to a plain Expedition
//   BLOOM.challenges.list()                  → every RELEASED Challenge, resolved, in content order (the hub's order — not a ranking)
//   BLOOM.challenges.ids()                   → their ids
//   BLOOM.challenges.check(defs, scenarios)  → errors for the whole catalogue ([] = valid)
//   BLOOM.challenges.checkChallenge(def, scenarios) → schema errors for one definition
//   BLOOM.challenges.fixture(def)            → (QA) a NON-RELEASED fixture Challenge (status "fixture"), checked exactly like the catalogue and
//                                              resolved; resolve(def.id) finds it afterwards. Never listed: list() is released content only
//   BLOOM.challenges.scenarioOf(ch)          → the scenario object the Challenge plays (BLOOM.pressure.resolveScenario on the catalogue)
//   BLOOM.challenges.speciesOf(ch)           → the prescribed species (BLOOM.species.resolve object) or null (player choice)
//   BLOOM.challenges.startingStateOf(ch)     → the prescribed starting state { adaptations, biomass, source: "challenge" } (frozen) or null
//   BLOOM.challenges.provenance(ch)          → { id, name, version, recipeVersion, scenarioId, icon } (run summaries, reports)
//   BLOOM.challenges.SCHEMA_VERSION / LAUNCH_POLICIES / RECIPE_KEYS / COMPLETION_WINS / MECHANICS_KEYS
//
// A Challenge is a PRODUCT definition that references one scenario (content/scenarios.js) by id; the scenario's mechanics stay in the
// scenario and in the engine. This layer proves that: a definition carrying any scenario-mechanics key is refused, and its player-facing
// copy may only REFERENCE the scenario's own copy ("@scenario.<path>") or add copy the scenario does not have (a verbatim copy of a
// scenario string is refused: reference it instead).
//
// LAUNCH (036B, schema 2). A Challenge is a contained situation: CHALLENGES → the Challenge → (the species, if it allows a choice) → ONE
// generated qualifying planet → its dossier → the run. Three policies, each a { policy, … } object:
//   species        { policy: "player-choice" }                         the normal Choose Plant Species screen (every released species)
//                  { policy: "prescribed", species: "<species id>" }   that species; the species screen is skipped
//   world          { policy: "recipe", recipe }                        ONE world generated for this Challenge from its RECIPE (§4): the normal
//                                                                       physical world stream filtered by product-level constraints, the
//                                                                       species evaluation and the scenario's own validation. A recipe never
//                                                                       changes a planet — it only decides which finished world is accepted
//   startingState  { policy: "normal" }                                nothing owned at landing, config.econ.startBiomass
//                  { policy: "prescribed", adaptations, biomass }      plant adaptations owned at landing (trait ids, one tier each) and / or
//                                                                       the starting Biomass (null = the normal amount); the engine's own
//                                                                       createSim startingState applies it (refused here if it cannot)
// Completion keeps the normal Bloom; `completion.conditions` must stay [] until Challenge-specific conditions exist (the schema path is kept).
// Every value the runtime cannot honour is REFUSED by check(), so the schema can never describe something the game ignores.
// VERSIONING: the recipe decides which planet a launch generates, so it is versioned (recipe.version) and part of the Challenge instance's
// provenance. Changing a released recipe is an explicit definition change: bump recipe.version AND the Challenge version.
(function (root) {
  "use strict";
  const BLOOM = root.BLOOM || (root.BLOOM = {});
  const SCHEMA_VERSION = 2;
  const DEF_KEYS = ["id", "version", "status", "name", "short", "scenario", "presentation", "launch", "completion"];
  const PRESENTATION_KEYS = ["tagline", "briefing", "strategicIdea", "icon", "science"];
  // "released": on the hub. "fixture": a QA-only definition (BLOOM.challenges.fixture), never on the hub and never in content/challenges.js
  const STATUSES = Object.freeze(["released", "fixture"]);
  // 036B: the supported values of each launch policy (docs/CHALLENGES_SYSTEM_v1.md §2.3); later milestones add values, never meanings
  const LAUNCH_POLICIES = Object.freeze({
    species: Object.freeze(["player-choice", "prescribed"]),
    world: Object.freeze(["recipe"]),
    startingState: Object.freeze(["normal", "prescribed"]),
  });
  const POLICY_KEYS = Object.freeze({
    species: { "player-choice": ["policy"], prescribed: ["policy", "species"] },
    world: { recipe: ["policy", "recipe"] },
    startingState: { normal: ["policy"], prescribed: ["policy", "adaptations", "biomass"] },
  });
  // the world recipe's vocabulary: product-level selection constraints the runtime (resources/challenges/challenge-world.js) honours —
  // never generator parameters, never scenario mechanics. Each constraint is optional except version + archetypes.
  //   version        integer ≥ 1: the recipe's own revision (instance provenance)
  //   archetypes     the archetype ids a Challenge world may be (the stream draws only these; ≥ 1, known, no repeats)
  //   arrival        { minHabitable?, maxHabitable? } — the species-relative share of land green on arrival (the survey's habitable
  //                  share, engine evaluate()), 0…1, min < max — or null (any)
  //   nativeCover    { minStartShare } — (a competition scenario only) the native cover's starting share of the land, as layer P reports
  //                  it (planet-derived, 0…1) — or null
  const RECIPE_KEYS = Object.freeze(["version", "archetypes", "arrival", "nativeCover"]);
  const COMPLETION_WINS = Object.freeze(["bloom"]);     // the normal Bloom win (the planet's own threshold)
  // the scenario-mechanics vocabulary (content/scenarios.js): never inside a Challenge definition, at any depth
  const MECHANICS_KEYS = Object.freeze(["pressure", "competition", "climateInstability", "validation", "loss", "channels", "phases", "graceSeconds",
    "durationSeconds", "extinctionGraceSeconds", "pacing", "tolerance", "growth", "contest", "forcing", "settling", "shocks", "bands", "axes", "intent"]);
  // the scenario copy a Challenge may reference (the scenario's own player-facing display copy)
  const REFERABLE = Object.freeze(["display.card.tagline", "display.card.detail", "display.card.cue", "display.summary", "display.science", "display.channels", "display.title"]);
  const ICONS = Object.freeze(["pressure", "competition", "climate"]); // the shared icon family's scenario glyphs (resources/ui/bloom-icons.js)
  // no difficulty ranking: no Easy / Medium / Hard, no stars, no scores, no recommended skill
  const FORBIDDEN_COPY = /\b(easy|easier|easiest|medium|hard|harder|hardest|difficulty|difficult mode|beginner|expert|novice|veteran|stars?|rating|score|recommended|skill|tier|best|strongest|weakest)\b/i;
  const REF = /^@scenario\.(.+)$/;

  const isStr = x => typeof x === "string" && x.trim().length > 0;
  const isInt = x => Number.isInteger(x) && x >= 1;
  const isShare = x => typeof x === "number" && Number.isFinite(x) && x >= 0 && x <= 1;
  const get = (o, path) => path.split(".").reduce((a, k) => (a == null ? undefined : a[k]), o);
  const scenarioCopy = s => { const out = []; const walk = v => { if (typeof v === "string") out.push(v); else if (v && typeof v === "object") Object.values(v).forEach(walk); }; walk(s && s.display); return out; };

  /** A copy field → { text } | { points } | { error }: a reference is resolved on the scenario; a literal is the Challenge's own copy. */
  function copyOf(value, scenario, { list = false, nullable = false } = {}) {
    if (value === null && nullable) return { text: null, points: null, source: null };
    if (!isStr(value)) return { error: "must be text or an @scenario reference" };
    const m = value.match(REF);
    if (!m) return { text: value, points: null, source: "challenge" };
    if (!REFERABLE.includes(m[1])) return { error: `references ${m[1]}, which is not player-facing scenario copy (${REFERABLE.join(", ")})` };
    const v = get(scenario, m[1]);
    if (isStr(v)) return { text: v, points: null, source: "scenario." + m[1] };
    if (list && v && typeof v === "object" && !Array.isArray(v) && Object.values(v).length && Object.values(v).every(isStr))
      return { text: null, points: Object.values(v), source: "scenario." + m[1] };
    return { error: `references ${m[1]}, which this scenario does not have` };
  }

  /** The recipe's errors (the runtime's vocabulary only; never a mechanic, never a generator parameter). */
  function checkRecipe(R, S) {
    const e = [], D = root.BLOOM_DATA || {};
    if (!R || typeof R !== "object" || Array.isArray(R)) return ["launch.world.recipe must be an object"];
    const extra = Object.keys(R).filter(k => !RECIPE_KEYS.includes(k));
    if (extra.length) e.push(`launch.world.recipe: unknown key(s) ${extra.join(", ")} (the runtime honours ${RECIPE_KEYS.join(", ")})`);
    if (!isInt(R.version)) e.push("launch.world.recipe.version must be an integer ≥ 1");
    const known = (D.archetypes || []).map(a => a.id);
    if (!Array.isArray(R.archetypes) || !R.archetypes.length) e.push("launch.world.recipe.archetypes must list ≥ 1 archetype id");
    else {
      const bad = R.archetypes.filter(a => !known.includes(a)), dup = R.archetypes.filter((a, i) => R.archetypes.indexOf(a) !== i);
      if (bad.length) e.push(`launch.world.recipe.archetypes: unknown archetype(s) ${bad.join(", ")} (known: ${known.join(", ")})`);
      if (dup.length) e.push(`launch.world.recipe.archetypes: repeated ${[...new Set(dup)].join(", ")}`);
      // a scenario that explicitly disallows an archetype (scenario.validation.archetypes) can never accept a world of it
      const pol = S && S.validation && S.validation.archetypes || {};
      const off = R.archetypes.filter(a => pol[a] && pol[a].allowed === false);
      if (off.length) e.push(`launch.world.recipe.archetypes: ${off.join(", ")} ${off.length > 1 ? "are" : "is"} disallowed by the scenario`);
    }
    if (R.arrival != null) {
      const A = R.arrival, ak = A && typeof A === "object" ? Object.keys(A) : null;
      if (!ak || ak.some(k => !["minHabitable", "maxHabitable"].includes(k)) || !ak.length) e.push("launch.world.recipe.arrival must be { minHabitable?, maxHabitable? } or null");
      else {
        if ("minHabitable" in A && !isShare(A.minHabitable)) e.push("launch.world.recipe.arrival.minHabitable must be a share 0…1");
        if ("maxHabitable" in A && !isShare(A.maxHabitable)) e.push("launch.world.recipe.arrival.maxHabitable must be a share 0…1");
        if (isShare(A.minHabitable) && isShare(A.maxHabitable) && !(A.minHabitable < A.maxHabitable)) e.push("launch.world.recipe.arrival: minHabitable must be < maxHabitable");
      }
    }
    if (R.nativeCover != null) {
      const N = R.nativeCover;
      if (!N || typeof N !== "object" || Object.keys(N).join() !== "minStartShare" || !isShare(N.minStartShare)) e.push("launch.world.recipe.nativeCover must be { minStartShare: 0…1 } or null");
      else if (S && !S.competition) e.push("launch.world.recipe.nativeCover needs a scenario with native vegetation (a competition scenario)");
    }
    return e;
  }

  /** The prescribed starting state's errors — the engine itself decides (createSim with it on the authored First Bloom), so nothing the
   *  runtime would refuse at landing can pass here. */
  function checkStart(L) {
    const e = [], B = root.BLOOM, D = root.BLOOM_DATA || {};
    if (!Array.isArray(L.adaptations) || L.adaptations.some(x => !isStr(x))) e.push("launch.startingState.adaptations must be a list of trait ids ([] = none)");
    if (L.biomass !== null && !(Number.isInteger(L.biomass) && L.biomass >= 0)) e.push("launch.startingState.biomass must be an integer ≥ 0, or null (the normal starting Biomass)");
    if (!e.length && !L.adaptations.length && L.biomass === null) e.push(`launch.startingState: a prescribed start must give something (use { policy: "normal" } otherwise)`);
    if (!e.length && B.createSim && D.planets && D.planets.first_bloom) {
      try { B.createSim(D.planets.first_bloom, D.config, D.traits, { rng: () => 0.5, startingState: { adaptations: L.adaptations, biomass: L.biomass } }); }
      catch (err) { e.push(`launch.startingState: the engine refuses it (${String(err && err.message || err).replace(/^bloom-sim: /, "")})`); }
    }
    return e;
  }

  function checkChallenge(def, scenarios) {
    const e = [], at = def && typeof def.id === "string" ? def.id : "?";
    if (!def || typeof def !== "object") return ["a Challenge definition must be an object"];
    const extra = Object.keys(def).filter(k => !DEF_KEYS.includes(k)), missing = DEF_KEYS.filter(k => !(k in def));
    if (extra.length) e.push(`unknown key(s) ${extra.join(", ")}`);
    if (missing.length) e.push(`missing key(s) ${missing.join(", ")}`);
    // no scenario mechanics at any depth: a Challenge references its scenario, it never restates or overrides it
    const mech = []; const walk = (o, p) => { if (!o || typeof o !== "object") return; for (const k of Object.keys(o)) { if (MECHANICS_KEYS.includes(k)) mech.push(p + k); walk(o[k], p + k + "."); } };
    walk(def, ""); if (mech.length) e.push(`carries scenario mechanics (${mech.join(", ")}): a Challenge references its scenario, the mechanics stay in content/scenarios.js`);
    if (!/^[a-z][a-z0-9_]{1,40}$/.test(def.id || "")) e.push("id must be a stable lower_snake id");
    if (!isInt(def.version)) e.push("version must be an integer ≥ 1");
    if (!STATUSES.includes(def.status)) e.push(`status must be one of ${STATUSES.join(" / ")}`);
    if (!isStr(def.name)) e.push("name is required");
    // the scenario: real, never the default
    const B = root.BLOOM, list = Array.isArray(scenarios) ? scenarios : [];
    let S = null;
    if (!isStr(def.scenario)) e.push("scenario (a scenario id) is required");
    else if (B.pressure && def.scenario === B.pressure.DEFAULT_SCENARIO) e.push(`scenario must be a real challenge scenario, not "${def.scenario}" (no special mechanics)`);
    else if (B.pressure && Object.prototype.hasOwnProperty.call(B.pressure.LEGACY_SCENARIO_ALIASES || {}, def.scenario)) e.push(`scenario "${def.scenario}" is a retired alias`);
    else if (!(S = list.find(s => s.id === def.scenario))) e.push(`scenario "${def.scenario}" is not in content/scenarios.js`);
    else if (B.pressure && !B.pressure.isDynamic(S)) e.push(`scenario "${def.scenario}" has no mechanics`);
    // copy: references resolve, literals are not verbatim scenario copy, no difficulty language
    const P = def.presentation, words = [def.name];
    if (S) { const own = scenarioCopy(S);
      const field = (name, v, opts) => { const r = copyOf(v, S, opts); if (r.error) e.push(`${name} ${r.error}`);
        else { if (r.source === "challenge" && own.includes(v)) e.push(`${name} copies the scenario's text verbatim: reference it ("@scenario.<path>") instead`);
          words.push(r.text || "", ...(r.points || [])); } };
      field("short", def.short);
      if (!P || typeof P !== "object") e.push("presentation is required");
      else {
        const pe = Object.keys(P).filter(k => !PRESENTATION_KEYS.includes(k)), pm = PRESENTATION_KEYS.filter(k => !(k in P));
        if (pe.length) e.push(`presentation: unknown key(s) ${pe.join(", ")}`);
        if (pm.length) e.push(`presentation: missing key(s) ${pm.join(", ")}`);
        field("presentation.tagline", P.tagline); field("presentation.briefing", P.briefing); field("presentation.strategicIdea", P.strategicIdea);
        field("presentation.science", P.science, { list: true, nullable: true });
        if (!ICONS.includes(P.icon)) e.push(`presentation.icon must be one of ${ICONS.join(" / ")} (the shared icon family's scenario glyphs)`);
      }
    }
    const bad = words.filter(Boolean).join(" · ").match(FORBIDDEN_COPY);
    if (bad) e.push(`copy must not rank Challenges ("${bad[0]}"): no difficulty labels, stars, scores or recommended skill`);
    // launch: 036B's policies, each { policy, … } with exactly the keys that policy takes
    const L = def.launch;
    if (!L || typeof L !== "object") e.push("launch is required");
    else {
      const le = Object.keys(L).filter(k => !(k in LAUNCH_POLICIES)), lm = Object.keys(LAUNCH_POLICIES).filter(k => !(k in L));
      if (le.length) e.push(`launch: unknown polic(ies) ${le.join(", ")}`);
      if (lm.length) e.push(`launch: missing polic(ies) ${lm.join(", ")}`);
      for (const k of Object.keys(LAUNCH_POLICIES)) {
        if (!(k in L)) continue;
        const v = L[k], pol = v && typeof v === "object" && !Array.isArray(v) ? v.policy : undefined;
        if (!LAUNCH_POLICIES[k].includes(pol)) { e.push(`launch.${k}.policy "${pol}" is not supported (${LAUNCH_POLICIES[k].join(" / ")})`); continue; }
        const want = POLICY_KEYS[k][pol], have = Object.keys(v);
        if (have.length !== want.length || want.some(x => !have.includes(x))) { e.push(`launch.${k} (${pol}) must be exactly { ${want.join(", ")} }`); continue; }
        if (k === "species" && pol === "prescribed") {
          try { const sp = B.species && B.species.resolve(v.species); if (!sp || sp.status !== "released") e.push(`launch.species.species "${v.species}" is not a released species`); }
          catch { e.push(`launch.species.species "${v.species}" is not a known species`); }
        }
        if (k === "world") e.push(...checkRecipe(v.recipe, S));
        if (k === "startingState" && pol === "prescribed") e.push(...checkStart(v));
      }
    }
    const C = def.completion;
    if (!C || typeof C !== "object" || Object.keys(C).some(k => !["win", "conditions"].includes(k))) e.push("completion must be { win, conditions }");
    else {
      if (!COMPLETION_WINS.includes(C.win)) e.push(`completion.win must be one of ${COMPLETION_WINS.join(" / ")}`);
      if (!Array.isArray(C.conditions) || C.conditions.length) e.push("completion.conditions must be [] (Challenge-specific conditions are not implemented yet)");
    }
    return e.map(m => `challenge ${at}: ${m}`);
  }

  function check(defs, scenarios) {
    if (!Array.isArray(defs) || !defs.length) return ["BLOOM_DATA.challenges must be a non-empty list (load content/challenges.js)"];
    const e = [];
    for (const d of defs) { e.push(...checkChallenge(d, scenarios)); if (d && d.status === "fixture") e.push(`challenge ${d.id}: content/challenges.js holds released Challenges only (a fixture is QA data: BLOOM.challenges.fixture)`); }
    const ids = defs.map(d => d && d.id), dup = ids.filter((x, i) => ids.indexOf(x) !== i);
    if (dup.length) e.push(`challenge ids must be unique (${[...new Set(dup)].join(", ")})`);
    return e;
  }

  const deepFreeze = o => { if (o && typeof o === "object" && !Object.isFrozen(o)) { Object.freeze(o); for (const k of Object.keys(o)) deepFreeze(o[k]); } return o; };
  const cache = new WeakMap(), fixtures = new Map();
  let checkedFor = null;

  function catalogue() {
    const D = root.BLOOM_DATA, defs = D && D.challenges;
    if (!Array.isArray(defs)) throw new Error("BLOOM.challenges: load content/challenges.js first");
    if (!Array.isArray(D.scenarios)) throw new Error("BLOOM.challenges: load content/scenarios.js first");
    if (!root.BLOOM.pressure) throw new Error("BLOOM.challenges: load resources/bloom-sim.js first");
    if (checkedFor !== defs) { const bad = check(defs, D.scenarios); if (bad.length) throw new Error("BLOOM.challenges: " + bad.join("; ")); checkedFor = defs; }
    return defs;
  }

  function resolveDef(def) {
    let r = cache.get(def);
    if (!r) {
      const S = scenarioOf(def), c = JSON.parse(JSON.stringify(def)), P = c.presentation, sources = {};
      const take = (name, v, opts) => { const x = copyOf(v, S, opts); sources[name] = x.source; return x; };
      const sh = take("short", c.short), tg = take("tagline", P.tagline), br = take("briefing", P.briefing), si = take("strategicIdea", P.strategicIdea);
      const sc = take("science", P.science, { list: true, nullable: true });
      r = deepFreeze({ ...c, schema: SCHEMA_VERSION, short: sh.text,
        presentation: { tagline: tg.text, briefing: br.text, strategicIdea: si.text, icon: P.icon, science: sc.text, sciencePoints: sc.points },
        recipeKey: `${c.id}@${c.version}/recipe-${c.launch.world.recipe.version}`, sources });
      cache.set(def, r);
    }
    return r;
  }

  function resolve(id) {
    if (typeof id !== "string") throw new TypeError(`BLOOM.challenges.resolve: a Challenge id string is required (got ${id === null ? "null" : typeof id})`);
    const def = catalogue().find(d => d.id === id);
    if (def) return resolveDef(def);
    if (fixtures.has(id)) return fixtures.get(id);
    throw Object.assign(new Error(`BLOOM.challenges: unknown Challenge "${id}" (known: ${catalogue().map(d => d.id).join(", ")})`), { code: "UNKNOWN_CHALLENGE", challengeId: id });
  }
  /** (036B, QA) a non-released fixture Challenge: the same checks as the catalogue, status "fixture", never on the hub. */
  function fixture(def) {
    const D = root.BLOOM_DATA, cat = catalogue();
    if (!def || def.status !== "fixture") throw new Error("BLOOM.challenges.fixture: a fixture definition must have status \"fixture\"");
    if (cat.some(d => d.id === def.id)) throw new Error(`BLOOM.challenges.fixture: "${def.id}" is a catalogue Challenge`);
    const bad = checkChallenge(def, D.scenarios); if (bad.length) throw new Error("BLOOM.challenges.fixture: " + bad.join("; "));
    if (fixtures.has(def.id)) return fixtures.get(def.id);
    const r = resolveDef(def); fixtures.set(def.id, r); return r;
  }
  /** The scenario a Challenge (or its definition) plays: the catalogue's own object, through the engine's resolver (checked, never copied). */
  function scenarioOf(ch) { return root.BLOOM.pressure.resolveScenario(root.BLOOM_DATA.scenarios, ch.scenario); }
  /** (036B) the prescribed species (the canonical BLOOM.species object) or null when the player chooses */
  const speciesOf = ch => ch.launch.species.policy === "prescribed" ? root.BLOOM.species.resolve(ch.launch.species.species) : null;
  /** (036B) the prescribed starting state (frozen plain data, createSim's startingState) or null (the normal start) */
  const startCache = new WeakMap();
  function startingStateOf(ch) {
    const L = ch.launch.startingState; if (L.policy !== "prescribed") return null;
    let s = startCache.get(ch); if (!s) { s = deepFreeze({ adaptations: [...L.adaptations], biomass: L.biomass, source: "challenge" }); startCache.set(ch, s); }
    return s;
  }
  const list = () => catalogue().filter(d => d.status === "released").map(resolveDef);
  const ids = () => list().map(c => c.id);
  const provenance = ch => ({ id: ch.id, name: ch.name, version: ch.version, recipeVersion: ch.launch.world.recipe.version, scenarioId: ch.scenario, icon: ch.presentation.icon });

  BLOOM.challenges = { SCHEMA_VERSION, LAUNCH_POLICIES, POLICY_KEYS, RECIPE_KEYS, COMPLETION_WINS, MECHANICS_KEYS, REFERABLE, ICONS, FORBIDDEN_COPY, STATUSES,
    resolve, list, ids, check, checkChallenge, checkRecipe, fixture, scenarioOf, speciesOf, startingStateOf, provenance };
})(typeof window !== "undefined" ? window : globalThis);
