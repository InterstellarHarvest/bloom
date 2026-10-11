// BLOOM — Challenges (BLOOM-036A). No DOM. docs/CHALLENGES_SYSTEM_v1.md (schema §2, flow §3, invariants §4).
//
//   BLOOM.challenges.resolve(id)             → the FROZEN resolved Challenge { id, version, status, name, short, scenario, presentation,
//                                              launch, completion, sources } — an unknown id THROWS (err.code "UNKNOWN_CHALLENGE");
//                                              never a silent fallback to another Challenge or to a plain Expedition
//   BLOOM.challenges.list()                  → every released Challenge, resolved, in content order (the hub's order — not a ranking)
//   BLOOM.challenges.ids()                   → their ids
//   BLOOM.challenges.check(defs, scenarios)  → errors for the whole catalogue ([] = valid)
//   BLOOM.challenges.checkChallenge(def, scenarios) → schema errors for one definition
//   BLOOM.challenges.scenarioOf(ch)          → the scenario object the Challenge plays (BLOOM.pressure.resolveScenario on the catalogue)
//   BLOOM.challenges.provenance(ch)          → { id, name, version, scenarioId, icon } (run summaries, reports)
//   BLOOM.challenges.SCHEMA_VERSION / LAUNCH_POLICIES / COMPLETION_WINS / MECHANICS_KEYS
//
// A Challenge is a PRODUCT definition that references one scenario (content/scenarios.js) by id; the scenario's mechanics stay in the
// scenario and in the engine. This layer proves that: a definition carrying any scenario-mechanics key is refused, and its player-facing
// copy may only REFERENCE the scenario's own copy ("@scenario.<path>") or add copy the scenario does not have (a verbatim copy of a
// scenario string is refused: reference it instead).
//
// Launch / completion are deliberately simple in 036A: only the policies listed in LAUNCH_POLICIES / COMPLETION_WINS exist, and
// `completion.conditions` must be empty. Prescribed species, starting adaptations, special Biomass, authored worlds and bespoke win
// thresholds are BLOOM-036B+ — refused here until they are implemented, so the schema can never describe something the game ignores.
(function (root) {
  "use strict";
  const BLOOM = root.BLOOM || (root.BLOOM = {});
  const SCHEMA_VERSION = 1;
  const DEF_KEYS = ["id", "version", "status", "name", "short", "scenario", "presentation", "launch", "completion"];
  const PRESENTATION_KEYS = ["tagline", "briefing", "strategicIdea", "icon", "science"];
  const STATUSES = Object.freeze(["released"]);
  // 036A: one supported value per launch policy (docs/CHALLENGES_SYSTEM_v1.md §2.3); later milestones add values, never meanings
  const LAUNCH_POLICIES = Object.freeze({
    species: Object.freeze(["player-choice"]),          // the normal Choose Plant Species screen, every released species
    world: Object.freeze(["destination-survey"]),       // the species- and scenario-relative Destination Survey
    startingState: Object.freeze(["none"]),             // nothing owned at landing, normal starting Biomass
    seed: Object.freeze(["sector"]),                    // the survey's sector-seed stream (normal physical planet generation)
  });
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
    // the scenario: real, never the default (a Challenge with no special mechanics is a later, recipe-driven Challenge — 036B+)
    const B = root.BLOOM, list = Array.isArray(scenarios) ? scenarios : [];
    let S = null;
    if (!isStr(def.scenario)) e.push("scenario (a scenario id) is required");
    else if (B.pressure && def.scenario === B.pressure.DEFAULT_SCENARIO) e.push(`scenario must be a real challenge scenario, not "${def.scenario}" (no special mechanics in 036A)`);
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
    // launch: 036A's policies only
    const L = def.launch;
    if (!L || typeof L !== "object") e.push("launch is required");
    else {
      const le = Object.keys(L).filter(k => !(k in LAUNCH_POLICIES)), lm = Object.keys(LAUNCH_POLICIES).filter(k => !(k in L));
      if (le.length) e.push(`launch: unknown polic(ies) ${le.join(", ")}`);
      if (lm.length) e.push(`launch: missing polic(ies) ${lm.join(", ")}`);
      for (const k of Object.keys(LAUNCH_POLICIES)) if (k in L && !LAUNCH_POLICIES[k].includes(L[k]))
        e.push(`launch.${k} "${L[k]}" is not supported (036A: ${LAUNCH_POLICIES[k].join(" / ")}; more arrive with BLOOM-036B)`);
    }
    const C = def.completion;
    if (!C || typeof C !== "object" || Object.keys(C).some(k => !["win", "conditions"].includes(k))) e.push("completion must be { win, conditions }");
    else {
      if (!COMPLETION_WINS.includes(C.win)) e.push(`completion.win must be one of ${COMPLETION_WINS.join(" / ")}`);
      if (!Array.isArray(C.conditions) || C.conditions.length) e.push("completion.conditions must be [] (Challenge-specific conditions arrive with BLOOM-036B+)");
    }
    return e.map(m => `challenge ${at}: ${m}`);
  }

  function check(defs, scenarios) {
    if (!Array.isArray(defs) || !defs.length) return ["BLOOM_DATA.challenges must be a non-empty list (load content/challenges.js)"];
    const e = [];
    for (const d of defs) e.push(...checkChallenge(d, scenarios));
    const ids = defs.map(d => d && d.id), dup = ids.filter((x, i) => ids.indexOf(x) !== i);
    if (dup.length) e.push(`challenge ids must be unique (${[...new Set(dup)].join(", ")})`);
    return e;
  }

  const deepFreeze = o => { if (o && typeof o === "object" && !Object.isFrozen(o)) { Object.freeze(o); for (const k of Object.keys(o)) deepFreeze(o[k]); } return o; };
  const cache = new WeakMap();
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
        sources });
      cache.set(def, r);
    }
    return r;
  }

  function resolve(id) {
    if (typeof id !== "string") throw new TypeError(`BLOOM.challenges.resolve: a Challenge id string is required (got ${id === null ? "null" : typeof id})`);
    const def = catalogue().find(d => d.id === id);
    if (!def) throw Object.assign(new Error(`BLOOM.challenges: unknown Challenge "${id}" (known: ${catalogue().map(d => d.id).join(", ")})`), { code: "UNKNOWN_CHALLENGE", challengeId: id });
    return resolveDef(def);
  }
  /** The scenario a Challenge (or its definition) plays: the catalogue's own object, through the engine's resolver (checked, never copied). */
  function scenarioOf(ch) { return root.BLOOM.pressure.resolveScenario(root.BLOOM_DATA.scenarios, ch.scenario); }
  const list = () => catalogue().filter(d => d.status === "released").map(resolveDef);
  const ids = () => list().map(c => c.id);
  const provenance = ch => ({ id: ch.id, name: ch.name, version: ch.version, scenarioId: ch.scenario, icon: ch.presentation.icon });

  BLOOM.challenges = { SCHEMA_VERSION, LAUNCH_POLICIES, COMPLETION_WINS, MECHANICS_KEYS, REFERABLE, ICONS, FORBIDDEN_COPY,
    resolve, list, ids, check, checkChallenge, scenarioOf, provenance };
})(typeof window !== "undefined" ? window : globalThis);
