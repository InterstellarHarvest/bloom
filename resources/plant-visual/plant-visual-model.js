// BLOOM — plant visual MODEL (BLOOM-032B1 production sprite pipeline). docs/PLANT_SPRITE_PIPELINE_v1.md §3.
//
// Stage 1 of the pipeline:   REAL STATE ──normalize()──▶ VISUAL MODEL ──(plant-components.js)──▶ component ids ──(plant-compositor.js)──▶ organism
//
// Reads the REAL trait data (BLOOM_DATA.traits from content/traits.js, BLOOM_DATA.config.scales.tempCap) only to learn which traits
// exist and their legal tiers; never a price, never a mechanic, never a write. Its output is plain numbers per visual AXIS — the locked
// Organic Hybrid mutation language — with no sprite id, no pixel and no layout in it:
//
//   BODY / LAYOUT       cold T1–T3            → architecture.compact 1–3            (+ surface.frost 1–3: insulation)
//   PRIMARY LEAF        drought T1–T3+ | flood T1–T3+ → leaf.water { arm, tier ≤ 3 }  (one water arm; gameplay tiers uncapped; ≥ 3 draws as T3)
//                       drought → roots.storage 1–3        flood → roots.aerial 1–3
//   HEAT MODIFIER       heat T1–T3            → leaf.heat 1–3 (orientation / heat form) + surface.wax 1–3      — coexists with Cold
//   SURFACE             salt → surface.salt   rad → surface.pigment
//   REPRODUCTIVE        seedOut T1–T2 → repro.seedHead · earlyMat → repro.flower · waterSeeds → repro.pods
//
//   const R = BLOOM.plantVisual.model.rules(BLOOM_DATA);  const M = BLOOM.plantVisual.model.normalize({ traits, condition }, R);
// Classic script, no dependencies, no DOM: Node can require it; boots over file://.
(function (root) {
  "use strict";
  const TRAITS = ["cold", "heat", "drought", "flood", "salt", "rad", "seedOut", "earlyMat", "waterSeeds"];
  const CONDITIONS = ["thriving", "strained"];
  const VISUAL_CAP = 3;   // the deepest authored tier of any multi-tier trait; the uncapped water arms draw tier ≥ 3 as T3

  /** The legal tiers, from the real data: temperature pool (cold + heat ≤ tempCap), one water arm (uncapped in the engine), level traits. */
  function rules(DATA) {
    const D = DATA || root.BLOOM_DATA || {}, tempCap = (D.config && D.config.scales && D.config.scales.tempCap) || 3;
    const byId = {};
    for (const t of D.traits || []) { if (!TRAITS.includes(t.id)) continue; const e = t.effect || {};
      byId[t.id] = { id: t.id, name: t.name, board: t.board, pool: e.type === "tempPoint" ? "temp" : e.type === "waterArm" ? "water" : null,
        max: e.type === "tempPoint" ? tempCap : e.type === "waterArm" ? null : (e.max !== undefined ? e.max : 1) }; }
    return { tempCap, byId, ids: TRAITS.filter(id => byId[id]) };
  }
  function validate(traits, R) {
    const T = traits || {}, issues = [];
    for (const [id, v] of Object.entries(T)) { const r = R.byId[id]; if (!r) { issues.push(`unknown trait ${id}`); continue; }
      if (!Number.isInteger(v) || v < 0) issues.push(`${id}: tier ${v}`); else if (r.max !== null && v > r.max) issues.push(`${id}: above max ${r.max}`); }
    if ((T.cold || 0) + (T.heat || 0) > R.tempCap) issues.push(`cold + heat > ${R.tempCap} (one temperature pool)`);
    if ((T.drought || 0) > 0 && (T.flood || 0) > 0) issues.push("drought and flood together (one water strategy)");
    return { legal: !issues.length, issues };
  }

  function normalize(input, R) {
    const I = input || {}, T = I.traits || {}, g = {};
    for (const id of TRAITS) { const r = R.byId[id], v = Math.max(0, T[id] | 0); g[id] = r && r.max !== null ? Math.min(v, r.max) : v; }
    const condition = CONDITIONS.includes(I.condition) ? I.condition : "thriving", v = validate(T, R), cap = n => Math.min(n, VISUAL_CAP);
    // one water arm: on an (illegal, QA-only) both-arms build the larger leads, drought on a tie
    const arm = g.drought > 0 && g.drought >= g.flood ? "drought" : g.flood > 0 ? "flood" : null;
    const water = { arm, tier: arm ? cap(g[arm]) : 0 };
    const model = {
      genome: g, legal: v.legal, issues: v.issues, condition,
      architecture: { compact: cap(g.cold) },
      leaf: { water, heat: cap(g.heat) },
      roots: { storage: arm === "drought" ? water.tier : 0, aerial: arm === "flood" ? water.tier : 0 },
      surface: { frost: cap(g.cold), wax: cap(g.heat), salt: g.salt > 0 ? 1 : 0, pigment: g.rad > 0 ? 1 : 0 },
      repro: { seedHead: Math.min(g.seedOut, 2), flower: g.earlyMat > 0 ? 1 : 0, pods: g.waterSeeds > 0 ? 1 : 0 },
      capped: ["drought", "flood"].filter(id => g[id] > VISUAL_CAP).map(id => ({ trait: id, tier: g[id], drawnAs: VISUAL_CAP })),
    };
    // the anatomy key: everything that can change a pixel — never the raw genome (drought T4 and T3 share one key)
    model.key = JSON.stringify([model.architecture, model.leaf, model.roots, model.surface, model.repro, condition]);
    return model;
  }

  root.BLOOM = Object.assign(root.BLOOM || {}, { plantVisual: Object.assign((root.BLOOM && root.BLOOM.plantVisual) || {}, {
    model: Object.freeze({ rules, validate, normalize, TRAITS, CONDITIONS, VISUAL_CAP }) }) });
})(typeof window !== "undefined" ? window : globalThis);
