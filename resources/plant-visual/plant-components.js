// BLOOM — plant COMPONENT SELECTOR (BLOOM-032B1 production sprite pipeline). docs/PLANT_SPRITE_PIPELINE_v1.md §4.
//
// Stage 2: VISUAL MODEL (plant-visual-model.js) → which authored COMPONENTS the organism is made of. This is the ONLY place where "what a
// trait looks like" becomes a component choice; the compositor draws whatever it is given and knows no trait, tier, price or rule.
//
//   architecture.compact ≥ 2  → layout "compact" (short stout stem, low crowded rosette)        else layout "open"
//   leaf.succulence ≥ 2       → leaf set "leaf.succulent" (on the body plan's succulent sockets)  else compact ≥ 2 → "leaf.cold"  else "leaf.base"
//   surface.frost 1 / ≥ 2     → "frost.tuft" on every leaf tip / on every tip + margin point, plus "frost.collar" on the stem nodes (≥ 2)
//   roots.storage 1 / ≥ 2     → a deeper procedural taproot / + "root.storage" on the primary-root socket
//   surface.pigment           → treatment "pigment" (a recolour of masked pixels; no new component)
//   surface.wax               → treatment "wax" (contract slot; drawn only if the pack defines the waxLeaf ramp)
//   repro.seedHead 1 / ≥ 2    → "seedHead.small" at the apex / "seedHead.large" at the apex + two "seedHead.small" on side branches + "seed.drift" ×3
//   repro.flower              → "flower" at the apex, or on the flower branch when a seed head holds the apex
//   neither                   → "bud" at the apex
// Tiers beyond the authored golden slice are HELD at the deepest authored tier and reported (heldAt); traits with no art yet are reported
// (pending) and draw nothing. Pure, deterministic, no DOM.
(function (root) {
  "use strict";
  const AUTHORED_MAX = { cold: 2, drought: 2, seedOut: 2, rad: 1, earlyMat: 1, heat: 1 };

  function select(M) {
    const compact = M.architecture.compact >= 2, succ = M.leaf.succulence >= 2;
    const S = {
      layout: compact ? "compact" : "open",
      leafSet: succ ? "leaf.succulent" : compact ? "leaf.cold" : "leaf.base",
      leafSockets: succ ? "succulent" : "all",
      frost: { tufts: M.surface.frost >= 2 ? "tip+margin" : M.surface.frost >= 1 ? "tip" : null, collars: M.surface.frost >= 2 },
      roots: { taproot: Math.min(3, M.roots.storage), storage: M.roots.storage >= 2 },
      apex: M.repro.seedHead >= 2 ? "seedHead.large" : M.repro.seedHead >= 1 ? "seedHead.small" : M.repro.flower ? "flower" : "bud",
      flower: M.repro.flower ? (M.repro.seedHead ? "flower.1" : "flower.0") : null,
      sideHeads: M.repro.seedHead >= 2 ? 2 : 0,
      drift: M.repro.seedHead >= 2 ? 3 : 0,
      treatments: [M.surface.pigment ? "pigment" : null, M.surface.wax ? "wax" : null].filter(Boolean),
      posture: M.condition === "strained" ? -1 : 0,
      stress: M.condition === "strained",
      heldAt: Object.entries({ cold: M.genome.cold, drought: M.genome.drought, seedOut: M.genome.seedOut, heat: M.genome.heat })
        .filter(([id, v]) => v > AUTHORED_MAX[id]).map(([id, v]) => ({ trait: id, tier: v, drawnAs: AUTHORED_MAX[id] })),
      pending: Object.keys(M.pending),
    };
    const ids = new Set([S.leafSet, S.apex === "flower" ? "flower" : S.apex]);
    if (S.frost.tufts) ids.add("frost.tuft"); if (S.frost.collars) ids.add("frost.collar"); if (S.roots.storage) ids.add("root.storage");
    if (S.flower) ids.add("flower"); if (S.sideHeads) ids.add("seedHead.small"); if (S.drift) ids.add("seed.drift");
    S.components = [...ids].sort();
    S.key = JSON.stringify([S.layout, S.leafSet, S.leafSockets, S.frost, S.roots, S.apex, S.flower, S.sideHeads, S.drift, S.treatments, S.posture, S.stress]);
    return S;
  }

  root.BLOOM = Object.assign(root.BLOOM || {}, { plantVisual: Object.assign((root.BLOOM && root.BLOOM.plantVisual) || {}, {
    components: Object.freeze({ select, AUTHORED_MAX }) }) });
})(typeof window !== "undefined" ? window : globalThis);
