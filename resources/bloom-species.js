// BLOOM — plant species (BLOOM-035B). No DOM. docs/SPECIES_SYSTEM_v1.md (§0.1 PMO decisions, §3 data model, §4 the seam, §6.3 S-layers).
//
//   BLOOM.species.resolve(id)              → the FROZEN resolved species { id, version, physiologyVersion, physiologyKey, physiologyHash,
//                                            name, role, status, short, physiology, art, presentation } — an unknown id THROWS
//                                            (err.code "UNKNOWN_SPECIES"); there is never a silent fallback to another species
//   BLOOM.species.list()                   → every resolved species in content order (= role order: generalist first)
//   BLOOM.species.ids()                    → their ids
//   BLOOM.species.checkSpecies(def, cfg)   → schema errors for one content definition ([] = valid)
//   BLOOM.species.check(defs, cfg)         → errors for the whole catalogue (schema + unique ids + role order)
//   BLOOM.species.physiologyHash(p)        → 8-hex FNV of the seven physiology numbers (key order fixed)
//   BLOOM.species.sameAsReference(sp, cfg) → is this species' physiology numerically config.referencePlant?
//   BLOOM.species.DEFAULT_ID / TRAINING_ID → "organic_hybrid" (the Expedition flow without the species screen; Training, always)
//   BLOOM.species.validateFor(planet, sp, { config, traits, diagnostics }) → the species playability verdict (S-layers, 035B-2)
//
// A species is the PLAYER's starting physiology only (createSim(…, { species })). It is never an input to world generation
// (generateFromArchetype refuses it) and never reaches the native competitor (config.referencePlant). Content: content/species.js.
(function (root) {
  "use strict";
  const BLOOM = root.BLOOM || (root.BLOOM = {});
  const KEYS = Object.freeze(["tempFloor", "tempCeil", "waterPos", "waterTol", "saltTol", "radTol", "toxTol"]);
  const ROLES = Object.freeze(["generalist", "dry-heat", "cold", "wet"]);
  const CATEGORIES = Object.freeze(["Temperature", "Water", "Soil", "Hazard"]);
  const STATUSES = Object.freeze(["released", "candidate"]);
  const DEF_KEYS = ["id", "version", "physiologyVersion", "status", "name", "role", "short", "physiology", "edges", "startingGenome", "art", "presentation"];
  const DOSSIER_KEYS = ["habit", "water", "reproduction", "science"];
  const DEFAULT_ID = "organic_hybrid", TRAINING_ID = "organic_hybrid";
  // presentation copy rule (PMO): species are not difficulty levels — no Easy / Hard, no stars, no scores, no "best"
  const FORBIDDEN_COPY = /\b(easy|easier|easiest|hard mode|difficulty|difficult mode|beginner|expert|stars?|rating|score|best|strongest|weakest|overpowered)\b/i;

  const fnv = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(16).padStart(8, "0"); };
  const physiologyHash = p => fnv(KEYS.map(k => String(p[k])).join(","));
  const isStr = x => typeof x === "string" && x.trim().length > 0;
  const isInt = x => Number.isInteger(x) && x >= 1;

  function checkSpecies(def, config) {
    const e = [], at = def && typeof def.id === "string" ? def.id : "?";
    if (!def || typeof def !== "object") return ["a species definition must be an object"];
    const extra = Object.keys(def).filter(k => !DEF_KEYS.includes(k)), missing = DEF_KEYS.filter(k => !(k in def));
    if (extra.length) e.push(`unknown key(s) ${extra.join(", ")} (no growth / economy modifiers, scales or softness in v1)`);
    if (missing.length) e.push(`missing key(s) ${missing.join(", ")}`);
    if (!/^[a-z][a-z0-9_]{1,40}$/.test(def.id || "")) e.push("id must be a stable lower_snake id");
    if (!isInt(def.version)) e.push("version must be an integer ≥ 1");
    if (!isInt(def.physiologyVersion)) e.push("physiologyVersion must be an integer ≥ 1");
    if (!STATUSES.includes(def.status)) e.push(`status must be one of ${STATUSES.join(" / ")}`);
    if (!isStr(def.name)) e.push("name is required");
    if (!ROLES.includes(def.role)) e.push(`role must be one of ${ROLES.join(" / ")}`);
    if (!isStr(def.short)) e.push("short is required");
    const p = def.physiology;
    if (!p || typeof p !== "object" || Object.keys(p).length !== KEYS.length || !KEYS.every(k => Number.isFinite(p[k])))
      e.push(`physiology must be exactly { ${KEYS.join(", ")} } as finite numbers (the reference physiology's keys)`);
    else {
      if (!(p.tempFloor < p.tempCeil)) e.push("physiology: tempFloor must be below tempCeil");
      if (!(p.waterTol > 0) || p.waterPos - p.waterTol < 0 || p.waterPos + p.waterTol > 100) e.push("physiology: the water window (waterPos ± waterTol) must lie inside 0 … 100");
      for (const k of ["saltTol", "radTol", "toxTol"]) if (!(p[k] >= 0)) e.push(`physiology: ${k} must be ≥ 0`);
    }
    if (def.edges !== null) e.push("edges must be null in v1 (category softness is global)");
    if (def.startingGenome !== null) e.push("startingGenome must be null for an Expedition species (owned mutations at landing are a Challenge tool)");
    const a = def.art;
    if (!a || typeof a !== "object" || !/^[a-z][a-z0-9-]*@\d+$/.test(a.bodyPlan || "") || !/^[a-z][a-z0-9-]*$/.test(a.pack || "") || Object.keys(a).length !== 2)
      e.push("art must be { bodyPlan: \"<plan>@<n>\", pack: \"<pack id>\" }");
    const P = def.presentation;
    if (!P || typeof P !== "object") e.push("presentation is required");
    else {
      if (!isStr(P.roleLabel)) e.push("presentation.roleLabel is required");
      if (!(P.note === null || isStr(P.note))) e.push("presentation.note must be text or null");
      const chips = (list, name, lo, hi) => {
        if (!Array.isArray(list) || list.length < lo || list.length > hi) { e.push(`presentation.${name}: ${lo}–${hi} entries`); return; }
        list.forEach((x, i) => { if (!x || !CATEGORIES.includes(x.category) || !isStr(x.text) || Object.keys(x).some(k => !["category", "text", "latent"].includes(k)) || ("latent" in x && x.latent !== true))
          e.push(`presentation.${name}[${i}] must be { category: ${CATEGORIES.join(" | ")}, text[, latent: true] }`); });
      };
      chips(P.strengths, "strengths", 1, 3); chips(P.weaknesses, "weaknesses", 1, 3);
      if (Array.isArray(P.weaknesses) && P.weaknesses.some(x => x && x.latent)) e.push("presentation.weaknesses: a weakness is never latent");
      if (!P.dossier || DOSSIER_KEYS.some(k => !isStr(P.dossier[k])) || Object.keys(P.dossier).length !== DOSSIER_KEYS.length)
        e.push(`presentation.dossier must be { ${DOSSIER_KEYS.join(", ")} } text`);
      const words = [def.short, P.roleLabel, P.note, ...(P.strengths || []).map(x => x && x.text), ...(P.weaknesses || []).map(x => x && x.text), ...Object.values(P.dossier || {})].filter(Boolean).join(" · ");
      const bad = words.match(FORBIDDEN_COPY);
      if (bad) e.push(`presentation copy must not rank species ("${bad[0]}"): species are not difficulty levels`);
    }
    if (config && !config.referencePlant) e.push("config.referencePlant (the reference physiology) is missing");
    return e.map(m => `species ${at}: ${m}`);
  }

  function check(defs, config) {
    if (!Array.isArray(defs) || !defs.length) return ["BLOOM_DATA.species must be a non-empty list (load content/species.js)"];
    const e = [];
    for (const d of defs) e.push(...checkSpecies(d, config));
    const ids = defs.map(d => d && d.id), dup = ids.filter((x, i) => ids.indexOf(x) !== i);
    if (dup.length) e.push(`species ids must be unique (${[...new Set(dup)].join(", ")})`);
    if (!ids.includes(DEFAULT_ID)) e.push(`the catalogue needs "${DEFAULT_ID}" (the default Expedition species and Training's)`);
    // cards are shown in ROLE order (generalist first), never in a power order
    const order = defs.map(d => ROLES.indexOf(d && d.role));
    if (order.some((x, i) => i && x < order[i - 1])) e.push(`species must be listed in role order (${ROLES.join(" → ")})`);
    return e;
  }

  const deepFreeze = o => { if (o && typeof o === "object" && !Object.isFrozen(o)) { Object.freeze(o); for (const k of Object.keys(o)) deepFreeze(o[k]); } return o; };
  const cache = new WeakMap();   // content definition object → its resolved species (one frozen object per definition)
  let checkedFor = null;          // the catalogue array that last passed check()

  function catalogue() {
    const D = root.BLOOM_DATA, defs = D && D.species;
    if (!Array.isArray(defs)) throw new Error("BLOOM.species: load content/species.js first");
    if (checkedFor !== defs) { const bad = check(defs, D.config); if (bad.length) throw new Error("BLOOM.species: " + bad.join("; ")); checkedFor = defs; }
    return defs;
  }

  function resolveDef(def) {
    let r = cache.get(def);
    if (!r) {
      const c = JSON.parse(JSON.stringify(def)), hash = physiologyHash(c.physiology);
      r = deepFreeze({ ...c, physiologyHash: hash, physiologyKey: `${c.id}/p${c.physiologyVersion}#${hash}` });
      cache.set(def, r);
    }
    return r;
  }

  function resolve(id) {
    if (typeof id !== "string") throw new TypeError(`BLOOM.species.resolve: a species id string is required (got ${id === null ? "null" : typeof id})`);
    const def = catalogue().find(d => d.id === id);
    if (!def) throw Object.assign(new Error(`BLOOM.species: unknown species "${id}" (known: ${catalogue().map(d => d.id).join(", ")})`), { code: "UNKNOWN_SPECIES", speciesId: id });
    return resolveDef(def);
  }

  const list = () => catalogue().map(resolveDef);
  const ids = () => catalogue().map(d => d.id);
  const sameAsReference = (sp, config) => !!(config && config.referencePlant) && KEYS.every(k => sp.physiology[k] === config.referencePlant[k]);
  // provenance / reports: the small plain record that names a species and its exact physiology revision
  const provenance = sp => ({ id: sp.id, name: sp.name, version: sp.version, physiologyVersion: sp.physiologyVersion, physiologyKey: sp.physiologyKey });

  // ------------------------------------------------------------------------------------------------ species playability (035B-2)
  // The S-layers (docs/SPECIES_SYSTEM_v1.md §6.3, PMO decisions §0.1). A FINISHED physical planet + a species → a verdict. The planet
  // is never regenerated, re-rolled or edited; a species rejection only means "not offered to this species".
  //   S1 FOOTHOLD  measured and REPORTED: the share of the land growable at landing (fitness > grow.growThresh, no purchase, the
  //                starting sky) and reachable over land from the origin (= the witness's early.reachableShare in the default scenario),
  //                against FOOTHOLD.min (0.05). It is recorded with a `low` flag and never rejects a world: such a world is what the
  //                Survey shows as Extreme (SPECIES_STUDY §5.3), and as a gate it would remove a fifth of the Desert worlds the
  //                production Organic Hybrid survey offers today. The origin itself is always a protected refuge for every species.
  //   S2 WINNABLE  REQUIRED — the offer gate: BLOOM.findWitness with THIS species (layers 4–6: a real, no-cheat engine run that
  //                earns its Biomass and wins with margin). For a physiology numerically equal to config.referencePlant on a world
  //                whose own construction proved layers 4–6, that proof IS this species' proof (the engine is bit-identical): reused.
  //   S3 DIVERSE · S4 PACED  RECORDED ONLY (opts.diagnostics): findStrategies with the archetype's own policy — distinct strategies,
  //                pacing, the fastest margin, and whether a winner bypasses the archetype's requiredConditions. Never an offer gate.
  const FOOTHOLD = Object.freeze({ min: 0.05 });
  function foothold(planet, sp, { config, traits }) {
    const B = root.BLOOM, sim = B.createSim(planet, config, traits, { rng: () => 0.5, species: sp }), M = sim.map, G = config.grow;
    const grow = M.SEC.map((_, i) => sim.evaluate(i).fitness > G.growThresh), seen = new Set([M.ORIGIN]), st = [M.ORIGIN];
    while (st.length) { const a = st.pop(); for (const b of M.NBRS[a]) if (grow[b] && !seen.has(b)) { seen.add(b); st.push(b); } }
    let r = 0, g = 0; for (let i = 0; i < M.SC; i++) { if (seen.has(i)) r += M.AREA[i]; if (grow[i]) g += M.AREA[i]; }
    const reachableShare = +(r / M.LAND).toFixed(4);
    return { reachableShare, growableShare: +(g / M.LAND).toFixed(4), min: FOOTHOLD.min, low: reachableShare < FOOTHOLD.min };
  }
  const provedByConstruction = planet => { const a = planet && planet.archetype;
    return !!(a && a.winnabilityChecked && Array.isArray(a.validatedLayers) && [4, 5, 6].every(l => a.validatedLayers.includes(l))); };
  function validateFor(planet, sp, { config, traits, archetype = null, diagnostics = false } = {}) {
    const B = root.BLOOM, t0 = Date.now();
    if (!sp || typeof sp.physiologyKey !== "string") throw new TypeError("BLOOM.species.validateFor: a resolved species is required (BLOOM.species.resolve(id))");
    if (!config || !traits) throw new TypeError("BLOOM.species.validateFor: pass { config, traits }");
    if (!B.findWitness) throw new Error("BLOOM.species.validateFor: load resources/bloom-witness.js");
    const s1 = foothold(planet, sp, { config, traits });
    let s2;
    if (sameAsReference(sp, config) && provedByConstruction(planet)) s2 = { ok: true, reused: true, layer: null, reason: null,
      note: "the reference physiology's layers 4–6 proof from this world's construction (numerically identical physiology)" };
    else { const w = B.findWitness(planet, config, traits, { species: sp }), x = w.witness;
      s2 = { ok: !!w.ok, reused: false, layer: w.layer, reason: w.reason || null, inconclusive: !!w.inconclusive,
        ...(x ? { spend: x.totalSpent, purchases: x.purchases.length, build: x.purchases.map(p => p.id), winSeconds: x.winSeconds, marginSeconds: x.marginSeconds, usedCrossing: !!x.usedCrossing } : {}),
        simulations: w.search && w.search.simulations }; }
    let diag = null;
    if (diagnostics) {
      const V = archetype && archetype.validation || {}, need = V.minStrategies || 1, P = V.pacing || null;
      const r = B.findStrategies(planet, config, traits, { species: sp, minStrategies: need, pacing: P });
      const all = [...(r.strategies || []), ...(r.slow || [])], req = V.requiredConditions || [];
      diag = { s3: { status: r.layer7 ? r.layer7.status : r.status, distinct: r.layer7 ? r.layer7.strategies : 0, required: need },
        s4: { status: r.layer8 ? r.layer8.status : r.status, qualifying: r.layer8 ? r.layer8.qualifying : 0 },
        fastestMarginSeconds: all.length ? Math.min(...all.map(x => x.marginSeconds)) : null,
        minimalBuild: all.length ? Math.min(...all.map(x => x.minimalBuild.length)) : null,
        bypass: req.length ? all.filter(x => req.some(c => !x.tokens.some(t => t.startsWith(c + "=")))).map(x => x.signature) : [] };
    }
    return { ok: s2.ok, speciesId: sp.id, physiologyKey: sp.physiologyKey, s1, s2, diagnostics: diag, ms: Date.now() - t0 };
  }

  BLOOM.species = { KEYS, ROLES, CATEGORIES, DEFAULT_ID, TRAINING_ID, FOOTHOLD, resolve, list, ids, check, checkSpecies, physiologyHash, sameAsReference, provenance,
    foothold, validateFor };
})(typeof window !== "undefined" ? window : globalThis);
