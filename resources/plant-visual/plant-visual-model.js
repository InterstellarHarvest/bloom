// BLOOM — plant visual MODEL (BLOOM-032B1 production sprite pipeline). docs/PLANT_SPRITE_PIPELINE_v1.md §3.
//
// Stage 1 of the pipeline:   REAL STATE ──normalize()──▶ VISUAL MODEL ──(plant-components.js)──▶ component ids ──(plant-compositor.js)──▶ organism
//
// Reads the REAL trait data (BLOOM_DATA.traits from content/traits.js, BLOOM_DATA.config.scales.tempCap) only to learn which traits
// exist and their legal tiers; never a price, never a mechanic, never a write. Its output is plain numbers per visual AXIS — what each
// owned trait means for the organism — with no sprite id, no pixel and no layout in it:
//
//   cold T2  → architecture.compact = 2, surface.frost = 2        drought T2 → leaf.succulence = 2, roots.storage = 2
//   rad      → surface.pigment = 1                                 heat       → surface.wax = tier
//   seedOut  → repro.seedHead = tier                               earlyMat   → repro.flower = 1
//   flood / salt / waterSeeds → recorded under `pending` (no golden-slice art yet; the selector reports them, nothing is drawn)
//
//   const R = BLOOM.plantVisual.model.rules(BLOOM_DATA);  const M = BLOOM.plantVisual.model.normalize({ traits, condition }, R);
// Classic script, no dependencies, no DOM: Node can require it; boots over file://.
(function (root) {
  "use strict";
  const TRAITS = ["cold", "heat", "drought", "flood", "salt", "rad", "seedOut", "earlyMat", "waterSeeds"];
  const CONDITIONS = ["thriving", "strained"];

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
    if ((T.cold || 0) + (T.heat || 0) > R.tempCap) issues.push(`cold + heat > ${R.tempCap}`);
    if ((T.drought || 0) > 0 && (T.flood || 0) > 0) issues.push("drought and flood together");
    return { legal: !issues.length, issues };
  }

  function normalize(input, R) {
    const I = input || {}, T = I.traits || {}, g = {};
    for (const id of TRAITS) { const r = R.byId[id], v = Math.max(0, T[id] | 0); g[id] = r && r.max !== null ? Math.min(v, r.max) : v; }
    const condition = CONDITIONS.includes(I.condition) ? I.condition : "thriving", v = validate(T, R);
    const model = {
      genome: g, legal: v.legal, issues: v.issues, condition,
      architecture: { compact: g.cold },
      leaf: { succulence: g.drought },
      roots: { storage: g.drought },
      surface: { frost: g.cold, pigment: g.rad > 0 ? 1 : 0, wax: g.heat },
      repro: { seedHead: g.seedOut, flower: g.earlyMat > 0 ? 1 : 0 },
      pending: Object.fromEntries(["flood", "salt", "waterSeeds"].filter(id => g[id] > 0).map(id => [id, g[id]])),
    };
    model.key = JSON.stringify([model.architecture, model.leaf, model.roots, model.surface, model.repro, model.pending, condition]);
    return model;
  }

  root.BLOOM = Object.assign(root.BLOOM || {}, { plantVisual: Object.assign((root.BLOOM && root.BLOOM.plantVisual) || {}, {
    model: Object.freeze({ rules, validate, normalize, TRAITS, CONDITIONS }) }) });
})(typeof window !== "undefined" ? window : globalThis);
