// BLOOM — plant COMPONENT SELECTOR (BLOOM-032B1 production sprite pipeline). docs/PLANT_SPRITE_PIPELINE_v1.md §4.
//
// Stage 2: VISUAL MODEL (plant-visual-model.js) → which authored COMPONENTS the organism is made of. This is the ONLY place where "what a
// trait looks like" becomes a component choice; the compositor draws whatever it is given and knows no trait, tier, price or rule.
// Compatible axes STACK (no whole-plant combinations):
//
//   1 BODY / LAYOUT      architecture.compact 0–3  → layout open · dense · compact · cushion (body-plan data)
//   2 PRIMARY LEAF       leaf.water               → "leaf.base" | "leaf.drought.<1–3>" | "leaf.flood.<1–3>" (one at a time; ≥ 3 already capped)
//                                                     on the body plan's leaf set for that structure (fewer, larger storage / reed leaves)
//   3 HEAT MODIFIER      leaf.heat 1 / 2 / 3       → authored angle step +1 capped at mid / +1 / the structure's ".heat" variant (+1)
//                                                     + treatment wax level 1–3 — over WHICHEVER leaf structure is active
//   4 SURFACE OVERLAYS   frost 1–3                 → "frost.hair.<t>" on leaf points (T1 tips · T2/T3 tips + margins) + "frost.collar.<t>" (T2, T3)
//                        salt                      → "salt.crystal" on leaf tips + "salt.gland" on a margin point + treatment "toothed"
//                                                     (with both, frost hairs move to the other margin points: never the same point)
//                        pigment                   → treatment "pigment"
//   5 REPRODUCTIVE       base                      → "bud" (closed, apical) + "bud.axil" (closed, axillary) — BASE never has a flower / seed head
//                        flower                    → "flower" at the apex, or on the flower branch when a seed head holds the apex
//                        seedHead 1 / 2            → "seedHead.small" at the apex / "seedHead.large" + 2 × "seedHead.small" on branches + 3 × "seed.drift"
//                        pods                      → 2 × "pod" on the low pod stalks
//   ROOTS                storage 1 / 2 / 3         → deeper procedural taproot (tier) / + "root.storage.2" / "root.storage.3"
//                        aerial 1 / 2 / 3          → "root.aerial.<t>" on 2 / 3 / 4 aerial anchors; T3 + "root.stilt" on both stilt anchors
// Pure, deterministic, no DOM.
(function (root) {
  "use strict";
  const LAYOUTS = ["open", "dense", "compact", "cushion"];

  function select(M) {
    const w = M.leaf.water, heat = M.leaf.heat, frost = M.surface.frost, salt = !!M.surface.salt;
    const structure = w.arm ? `${w.arm}.${w.tier}` : "base", leafComponent = `leaf.${structure}${heat >= 3 ? ".heat" : ""}`;
    const S = {
      layout: LAYOUTS[M.architecture.compact],
      leaf: { component: leafComponent, set: structure, angle: { shift: (heat ? 1 : 0) + (M.condition === "strained" ? -1 : 0), cap: heat === 1 ? "mid" : "high" } },
      leafPoints: [],
      collars: frost >= 2 ? `frost.collar.${frost}` : null,
      axils: "bud.axil",
      roots: { taproot: M.roots.storage, storage: M.roots.storage >= 2 ? `root.storage.${M.roots.storage}` : null,
        aerial: M.roots.aerial ? { component: `root.aerial.${M.roots.aerial}`, count: [0, 2, 3, 4][M.roots.aerial] } : null, stilt: M.roots.aerial >= 3 ? "root.stilt" : null },
      apex: M.repro.seedHead >= 2 ? "seedHead.large" : M.repro.seedHead >= 1 ? "seedHead.small" : M.repro.flower ? "flower" : "bud",
      flower: M.repro.flower ? (M.repro.seedHead ? "flower.1" : "flower.0") : null,
      sideHeads: M.repro.seedHead >= 2 ? 2 : 0,
      drift: M.repro.seedHead >= 2 ? 3 : 0,
      pods: M.repro.pods ? "pod" : null,
      treatments: [M.surface.pigment ? { id: "pigment", level: 1 } : null, M.surface.wax ? { id: "wax", level: M.surface.wax } : null, salt ? { id: "toothed", level: 1 } : null].filter(Boolean),
      stress: M.condition === "strained",
      capped: M.capped.slice(),
    };
    if (salt) S.leafPoints.push({ component: "salt.crystal", at: "tip" }, { component: "salt.gland", at: "margin:1" });
    if (frost) S.leafPoints.push({ component: `frost.hair.${frost}`, at: salt ? "margin:0,2" : frost === 1 ? "tip" : "tip+margin" });
    const ids = new Set([leafComponent, S.apex, S.axils]);
    for (const p of S.leafPoints) ids.add(p.component);
    for (const c of [S.collars, S.roots.storage, S.roots.aerial && S.roots.aerial.component, S.roots.stilt, S.flower && "flower", S.pods]) if (c) ids.add(c);
    if (S.sideHeads) ids.add("seedHead.small"); if (S.drift) ids.add("seed.drift");
    S.components = [...ids].sort();
    S.key = JSON.stringify([S.layout, S.leaf, S.leafPoints, S.collars, S.roots, S.apex, S.flower, S.sideHeads, S.drift, S.pods, S.treatments, S.stress]);
    return S;
  }

  root.BLOOM = Object.assign(root.BLOOM || {}, { plantVisual: Object.assign((root.BLOOM && root.BLOOM.plantVisual) || {}, {
    components: Object.freeze({ select, LAYOUTS }) }) });
})(typeof window !== "undefined" ? window : globalThis);
