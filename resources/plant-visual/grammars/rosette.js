// BLOOM — plant GRAMMAR of body plan "rosette" (Cinder Rosette, dry / heat specialist). BLOOM-035B-5. docs/SPECIES_BODY_PLANS_v1.md §2.3, §3.1.
//
// VISUAL MODEL (plant-visual-model.js, shared by every species) → this plan's components and sockets (art/plant/body-plans/rosette.json,
// art/plant/contracts/rosette.json). The ONLY place where "what a trait looks like" on a Cinder Rosette is decided; the compositor draws
// whatever it is given. Compatible axes STACK, exactly as on Organic Hybrid:
//
//   1 BODY / ARCHITECTURE  architecture.compact 0–3 → open · cupped · closed · ball (the rosette closes into a tight, hair-fringed ball)
//   2 PRIMARY LEAF         leaf.water → "leaf.base" (already thick and fleshy) | "leaf.drought.<1–3>" (fatter, windowed tips; T3 on the
//                                        architecture's fewer-leaf set) | "leaf.flood.<1–3>" (softer, longer, channelled)
//   3 HEAT MODIFIER        leaf.heat 1 / 2 / 3 → authored angle step +1 capped at mid / +1 / the structure's ".heat" variant (+1) + wax 1–3
//   4 SURFACE              frost 1–3 → "frost.hair.<t>" on leaf points (T1 tips · T2/T3 tips + margins) + "frost.collar.<t>" rim fringe (T2, T3)
//                          salt → "salt.crystal" on leaf tips (the leaf channel) + "salt.gland" on margin 1 + treatment "toothed"
//                          pigment → treatment "pigment"
//   5 REPRODUCTIVE         base → a closed "bud" in the rosette heart; any reproduction grows the SPIKE axis:
//                          flower → "flower" on the spike apex (or its flower branch when a seed head holds the apex)
//                          seedHead 1 / 2 → "seedHead.small" capsule at the apex / "seedHead.large" + 2 × "seedHead.small" on spike
//                          branches + "seed.drift" winged seeds · pods → 2 × "pod" corky capsules on low spike stalks
//   ROOTS                  storage 1 / 2 / 3 → deeper procedural root fan (tier) / + "root.storage.2" / "root.storage.3" (caudex tuber)
//                          aerial 1 / 2 / 3 → "root.aerial.<t>" breathing roots at the crown on 2 / 3 / 4 anchors
// Pure, deterministic, no DOM.
(function (root) {
  "use strict";
  const PLAN = "rosette", ARCHITECTURES = ["open", "cupped", "closed", "ball"];

  function select(M) {
    const w = M.leaf.water, heat = M.leaf.heat, frost = M.surface.frost, salt = !!M.surface.salt, Rp = M.repro;
    const structure = w.arm ? `${w.arm}.${w.tier}` : "base", leafComponent = `leaf.${structure}${heat >= 3 ? ".heat" : ""}`;
    const spike = !!(Rp.flower || Rp.seedHead || Rp.pods), place = [], put = (component, sockets, o) => place.push({ component, sockets, ...o });
    const S = {
      plan: PLAN, architecture: ARCHITECTURES[M.architecture.compact], axes: spike ? ["main", "spike"] : ["main"],
      leaf: { component: leafComponent, set: structure, angle: { shift: (heat ? 1 : 0) + (M.condition === "strained" ? -1 : 0), cap: heat === 1 ? "mid" : "high" } },
      leafPoints: [], place, roots: { taproot: M.roots.storage },
      treatments: [M.surface.pigment ? { id: "pigment", level: 1 } : null, M.surface.wax ? { id: "wax", level: M.surface.wax } : null, salt ? { id: "toothed", level: 1 } : null].filter(Boolean),
      stress: M.condition === "strained", capped: M.capped.slice(),
    };
    if (salt) S.leafPoints.push({ component: "salt.crystal", at: "tip" }, { component: "salt.gland", at: "margin:1" });
    if (frost) S.leafPoints.push({ component: `frost.hair.${frost}`, at: salt ? "margin:0,2" : frost === 1 ? "tip" : "tip+margin" });
    if (frost >= 2) put(`frost.collar.${frost}`, "main.collar.*");
    if (M.roots.storage >= 2) put(`root.storage.${M.roots.storage}`, "primaryRoot");
    if (M.roots.aerial) put(`root.aerial.${M.roots.aerial}`, "aerial.*", { count: [0, 2, 3, 4][M.roots.aerial] });
    // reproduction: the closed bud in the heart (base), or the spike's apex
    if (Rp.seedHead >= 2) put("seedHead.large", "spike.seedHead.0"); else if (Rp.seedHead) put("seedHead.small", "spike.seedHead.0");
    else if (Rp.flower) put("flower", "spike.flower.0"); else put("bud", spike ? "spike.apex" : "main.apex");
    if (Rp.flower && Rp.seedHead) put("flower", "spike.flower.1");
    if (Rp.seedHead >= 2) { put("seedHead.small", ["spike.seedHead.1", "spike.seedHead.2"]); put("seed.drift", "spike.drift.*"); }
    if (Rp.pods) put("pod", "spike.pod.*");
    const ids = new Set([leafComponent]);
    for (const p of S.leafPoints) ids.add(p.component);
    for (const p of place) ids.add(p.component);
    S.components = [...ids].sort();
    S.key = JSON.stringify([S.plan, S.architecture, S.axes, S.leaf, S.leafPoints, S.place, S.roots, S.treatments, S.stress]);
    return S;
  }

  const grammar = Object.freeze({ plan: PLAN, select, ARCHITECTURES });
  const PV = root.BLOOM && root.BLOOM.plantVisual;
  root.BLOOM = Object.assign(root.BLOOM || {}, { plantVisual: Object.assign(PV || {}, { grammars: Object.assign((PV && PV.grammars) || {}, { [PLAN]: grammar }) }) });
})(typeof window !== "undefined" ? window : globalThis);
