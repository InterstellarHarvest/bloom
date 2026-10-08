// BLOOM — plant visual MODEL (BLOOM-032A Plant Evolution Visual Lab). docs/PLANT_EVOLUTION_VISUAL_LAB_v1.md.
//
// The first stage of the plant-visual pipeline:
//
//   REAL STATE ──normalize()──▶ VISUAL MODEL ──(plant-skeleton.js)──▶ anchors ──(pixel-parts.js + plant-renderer.js)──▶ organism
//
// It reads the REAL trait data (BLOOM_DATA.traits from content/traits.js and BLOOM_DATA.config.scales.tempCap) to learn which
// traits exist, which board they belong to and their legal tiers; it never reads a price or a mechanic and never changes the data.
// The output is plain data: the owned genome (clamped to what the art authors), the deterministic COMPONENT SELECTION every
// concept draws from (structural / surface / reproductive, per trait and tier), the colony's LOCAL development, its life stage
// and condition, and the specimen's ENVIRONMENT (region climate + Terraform preview). Same input → same model → same organism.
//
//   const R = BLOOM.plantVisual.model.rules(BLOOM_DATA)          // legal tiers, pools, exclusivity — from the real data
//   const M = BLOOM.plantVisual.model.normalize(input, R)          // input: { traits {id→tier}, est 0…1, condition, focus, local, env }
//   M.key                                                           // deterministic component key (genome + local + life; never env)
//
// Classic script, no dependencies, no DOM: Node can require it; boots over file://.
(function (root) {
  "use strict";
  const ADAPT = ["cold", "heat", "drought", "flood", "salt", "rad"], SPREAD = ["seedOut", "earlyMat", "waterSeeds"];
  const FOCI = ["balanced", "roots", "leaves", "seeds"], LOCALS = [null, "rootNetwork", "leafCanopy", "seedReserve"];
  const CONDITIONS = ["thriving", "strained", "unviable"];
  const ART_MAX = 3;            // the deepest tier the art authors for the uncapped water arm (drought / flood) and the temperature pool
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  /**
   * The legal trait structure, from the real data (never invented):
   *   tempPoint (cold, heat)  each 0…tempCap, and cold + heat ≤ tempCap (one shared pool)
   *   waterArm  (drought, flood) one arm only; the engine sets no cap (the price rises) — the art authors T1…T3 and holds T3 beyond
   *   level / crossing        0…effect.max
   */
  function rules(DATA) {
    const D = DATA || root.BLOOM_DATA || {}, tempCap = (D.config && D.config.scales && D.config.scales.tempCap) || 3;
    const traits = (D.traits || []).filter(t => t.board === "Adapt" || t.board === "Spread").map(t => {
      const e = t.effect || {}, pool = e.type === "tempPoint" ? "temp" : e.type === "waterArm" ? "water" : null;
      const max = e.type === "tempPoint" ? tempCap : e.type === "waterArm" ? null : (e.max !== undefined ? e.max : 1);
      return { id: t.id, name: t.name, board: t.board, category: t.uiCategory || null, effect: e.type, pool, max, artMax: max === null ? ART_MAX : Math.min(max, ART_MAX) };
    });
    const terraform = (D.traits || []).filter(t => t.board === "Terraform").map(t => ({ id: t.id, name: t.name, axis: t.effect && t.effect.axis, delta: t.effect && t.effect.delta }));
    return { tempCap, traits, byId: Object.fromEntries(traits.map(t => [t.id, t])), terraform, ids: traits.map(t => t.id) };
  }

  /** Is this build legal under the real rules? → { legal, issues[] } (the lab allows an impossible build only for QA). */
  function validate(traits, R) {
    const T = traits || {}, issues = [];
    for (const [id, v] of Object.entries(T)) { const r = R.byId[id]; if (!r) { issues.push(`unknown trait ${id}`); continue; }
      if (v < 0 || !Number.isInteger(v)) issues.push(`${id}: tier ${v}`); if (r.max !== null && v > r.max) issues.push(`${id}: above max ${r.max}`); }
    if ((T.cold || 0) + (T.heat || 0) > R.tempCap) issues.push(`cold + heat > ${R.tempCap} (one temperature pool)`);
    if ((T.drought || 0) > 0 && (T.flood || 0) > 0) issues.push("drought and flood together (one water strategy)");
    return { legal: !issues.length, issues };
  }

  /** The next legal tier of a trait for this build (null when none): what a real Adapt / Spread purchase could add. */
  function nextTier(id, traits, R) {
    const r = R.byId[id], T = traits || {}, cur = T[id] || 0; if (!r) return null;
    if (r.pool === "temp" && (T.cold || 0) + (T.heat || 0) >= R.tempCap) return null;
    if (r.pool === "water" && ((id === "drought" && T.flood) || (id === "flood" && T.drought))) return null;
    if (r.max !== null && cur >= r.max) return null;
    if (cur >= r.artMax) return null;   // (the uncapped water arm: the art holds T3; the lab does not offer an un-authored tier)
    return cur + 1;
  }

  const stageOf = est => est < 0.25 ? "seedling" : est < 0.55 ? "young" : est < 0.85 ? "established" : "mature";

  /**
   * input: { traits {id → tier}, est 0…1, condition "thriving" | "strained" | "unviable", focus, local, env { temp °C, moist 0…100,
   *          soil "loam" | "saline", terraform { warm, cool, humid, dry } } }
   * → the visual model. Component selection is authored per tier (not a scale factor): each step adds or alters named features.
   */
  function normalize(input, R) {
    const I = input || {}, T = I.traits || {}, g = {};
    for (const id of ADAPT.concat(SPREAD)) { const r = R.byId[id]; g[id] = clamp(T[id] | 0, 0, r ? r.artMax : ART_MAX); }
    const est = clamp(+(I.est ?? 1), 0, 1), stage = stageOf(est), condition = CONDITIONS.includes(I.condition) ? I.condition : "thriving";
    const focus = FOCI.includes(I.focus) ? I.focus : "balanced", local = LOCALS.includes(I.local) ? I.local : null;
    const v = validate(T, R);
    const wet = g.flood > 0 && !(g.drought > g.flood), dry = g.drought > 0 && !wet;   // an impossible both-arms build: the larger leads the leaves (QA only)

    // ---- STRUCTURAL: architecture and stem (cold = architecture; flood T3 = wetland architecture; drought T3 = storage stem)
    const architecture = g.cold >= 3 ? "cushion" : g.cold >= 2 ? "compact" : wet && g.flood >= 3 ? "wetland" : "open";
    const stem = { stout: [0, 0, 1, 2][g.cold], storage: dry && g.drought >= 3, airChannels: g.flood, waxEdge: g.heat >= 1, pigment: g.rad > 0, collars: g.cold >= 3, hairs: g.cold >= 2 };
    // ---- leaves: one FORM (water arm) modified by temperature (cold shortens / clusters, heat narrows / turns edge-on)
    const form = dry ? ["base", "thick", "succulent", "storage"][g.drought] : wet ? ["base", "strap", "ribbon", "emergent"][g.flood] : "base";
    const leaf = { form, length: [1, 1, 0.82, 0.68][g.cold] * (wet ? [1, 1.3, 1.45, 1.6][g.flood] : 1) * (dry ? [1, 0.92, 0.85, 0.8][g.drought] : 1),
      width: [1, 0.92, 0.78, 0.62][g.heat] * (dry ? [1, 1.35, 1.6, 1.8][g.drought] : 1) * (wet ? [1, 0.55, 0.48, 0.44][g.flood] : 1),
      upright: [0, 0, 1, 2][g.heat],                                  // heat T2: steeper, T3: edge-on to the sun
      count: 0, clustered: g.cold >= 3 };
    // ---- SURFACE overlays (never silhouette): hairs (cold), wax / reflective cuticle (heat), salt glands (salt), protective pigment (rad)
    const surface = { hairs: g.cold, wax: g.heat, salt: g.salt > 0, pigment: g.rad > 0, toughEdge: g.salt > 0 };
    // ---- roots
    const roots = { taproot: dry ? g.drought : 0, tuber: dry && g.drought >= 3, air: wet ? g.flood : 0, prop: wet && g.flood >= 3, laterals: 2, dense: 0, network: false };
    // ---- REPRODUCTIVE: seed heads (seedOut T1 / T2), early flowers (earlyMat), floating pods (waterSeeds)
    const repro = { flowers: g.earlyMat ? 2 : 0, heads: g.seedOut, headSize: g.seedOut >= 2 ? "large" : g.seedOut ? "small" : null, drift: g.seedOut >= 2 ? 3 : 0,
      pods: g.waterSeeds ? 2 : 0, floating: g.waterSeeds > 0, bud: !g.earlyMat && !g.seedOut };

    // ---- life: establishment changes size / how much has grown — never what is owned. Without Early Maturity a young colony has no
    // open flower or seed head yet; with it, the flower opens even on a young plant (that is what the trait means)
    let nodes = { seedling: 2, young: 4, established: 6, mature: 7 }[stage];
    if (stage === "seedling" || stage === "young") { repro.heads = 0; repro.drift = 0; repro.flowers = g.earlyMat ? 1 : 0; repro.pods = Math.min(repro.pods, stage === "young" ? 1 : 0); repro.bud = !g.earlyMat; }
    // ---- LOCAL colony development: THIS colony's presentation (denser roots / canopy / seed structures, neighbours, soil) — never a trait
    const loc = { focus, upgrade: local, companions: 0, seedBank: 0, nodules: 0, prominent: false, sideBuds: 0, seedCache: false };
    if (focus === "roots") { roots.laterals += 2; roots.dense += 1; }
    if (focus === "leaves") nodes += 2;
    if (focus === "seeds") { nodes -= 1; loc.prominent = stage !== "seedling"; loc.sideBuds = stage === "seedling" ? 0 : 2; loc.seedBank += 3; }
    if (local === "rootNetwork") { roots.network = true; roots.dense += 1; loc.nodules = 7; }
    if (local === "leafCanopy") { nodes += 1; loc.companions = 2; }
    if (local === "seedReserve") { loc.seedBank += 7; loc.seedCache = true; }
    if (g.cold >= 3) nodes -= 1; if (dry && g.drought >= 2) nodes -= 1;
    leaf.count = Math.max(2, nodes);
    if (repro.heads || repro.flowers) repro.bud = false;

    // ---- environment: region climate shifted by a Terraform PREVIEW (real deltas from content/traits.js) — the surroundings only
    const E = I.env || {}, TF = E.terraform || {}, dOf = id => { const t = R.terraform.find(x => x.id === id); return t ? t.delta || 0 : 0; };
    const temp = (E.temp ?? 14) + (TF.warm || 0) * dOf("warm") + (TF.cool || 0) * dOf("cool"), moist = clamp((E.moist ?? 50) + (TF.humid || 0) * dOf("humid") + (TF.dry || 0) * dOf("dry"), 0, 100);
    const env = { temp, moist, soil: E.soil === "saline" ? "saline" : "loam", terraformed: !!(TF.warm || TF.cool || TF.humid || TF.dry), terraform: { warm: TF.warm || 0, cool: TF.cool || 0, humid: TF.humid || 0, dry: TF.dry || 0 } };

    const life = { est, stage, condition, living: condition !== "unviable" };
    const model = { genome: g, legal: v.legal, issues: v.issues, architecture, stem, leaf, surface, roots, repro, local: loc, life, env };
    model.key = JSON.stringify([g, architecture, stem, leaf, surface, roots, repro, loc, life]);   // NOT env: Terraform never changes anatomy
    return model;
  }

  /** Which anchor a trait's mutation grows from (the FX's origin): structural traits from the stem / roots, reproductive from their socket. */
  const TRAIT_ANCHOR = { cold: "stemMid", heat: "leafTop", drought: "rootCrown", flood: "rootCrown", salt: "leafTop", rad: "stemMid", seedOut: "apex", earlyMat: "apex", waterSeeds: "podSocket" };
  /** The visual layer a trait belongs to (docs §5): structural · surface · reproductive. */
  const TRAIT_LAYER = { cold: "structural + surface", heat: "surface + leaf form", drought: "structural leaves + roots", flood: "structural roots + leaves", salt: "surface / detail",
    rad: "surface / pigment", seedOut: "reproductive", earlyMat: "reproductive (flower)", waterSeeds: "reproductive (pods)" };

  root.BLOOM = Object.assign(root.BLOOM || {}, { plantVisual: Object.assign((root.BLOOM && root.BLOOM.plantVisual) || {}, {
    model: Object.freeze({ rules, validate, nextTier, normalize, stageOf, ADAPT, SPREAD, FOCI, LOCALS, CONDITIONS, ART_MAX, TRAIT_ANCHOR, TRAIT_LAYER }) }) });
})(typeof window !== "undefined" ? window : globalThis);
