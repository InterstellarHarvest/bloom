// BLOOM — plant GRAMMAR of body plan "reed" (Reed Spire, wet / flood specialist). BLOOM-035B-5. docs/SPECIES_BODY_PLANS_v1.md §2.3, §3.3.
//
// VISUAL MODEL (plant-visual-model.js, shared by every species) → this plan's components and sockets (art/plant/body-plans/reed.json,
// art/plant/contracts/reed.json). Several `stem` CULMS rise from a horizontal RHIZOME on waterlogged ground; leaves are two SHEATHING culm leaves per culm;
// every culm ends in an umbel. Compatible axes STACK, exactly as on Organic Hybrid:
//
//   1 BODY / ARCHITECTURE  architecture.compact 0–3 → open · dense · bunched · tight (the culms bunch together)
//                          culm count: 3 tall culms c0–c2; Flood T1–T2 → + c3; Flood T3 → + c4 · Drought → 3 SHORT culms s0–s2 instead
//   2 PRIMARY LEAF         leaf.water → "leaf.base" sheaths | "leaf.drought.<1–3>" (hardened) | "leaf.flood.<1–3>" (aerenchyma bands)
//   3 HEAT MODIFIER        leaf.heat 1 / 2 / 3 → authored angle step +1 capped at mid / +1 / the structure's ".heat" variant (+1) + wax 1–3
//   4 SURFACE              frost 1–3 → "frost.hair.<t>" on sheath points + "frost.collar.<t>" on every culm node (T2, T3)
//                          salt → "salt.crystal" tips + "salt.gland" margin 1 + "toothed" · pigment → treatment "pigment"
//   5 REPRODUCTIVE         every culm apex: a closed bract umbel "bud" (base); seed heads take the first apices (T1: small on the first
//                          culm · T2: large on the first, small on the next two, "seed.drift" from the first); the flower takes the first
//                          free apex, else culm 1's flower branch · pods → 2 × "pod" floating seed bundles on culms 1 and 2
//   ROOTS                  the rhizome deepens with the water tier (storage or aerial) · storage 2 / 3 → "root.storage.<t>" rhizome node
//                          aerial 1 / 2 / 3 → "root.aerial.<t>" breathing roots on 2 / 3 / 4 anchors
// Pure, deterministic, no DOM.
(function (root) {
  "use strict";
  const PLAN = "reed", ARCHITECTURES = ["open", "dense", "bunched", "tight"];

  function select(M) {
    const w = M.leaf.water, heat = M.leaf.heat, frost = M.surface.frost, salt = !!M.surface.salt, Rp = M.repro;
    const structure = w.arm ? `${w.arm}.${w.tier}` : "base", leafComponent = `leaf.${structure}${heat >= 3 ? ".heat" : ""}`;
    const culms = M.roots.storage ? ["s0", "s1", "s2"] : ["c0", "c1", "c2", ...(M.roots.aerial >= 1 ? ["c3"] : []), ...(M.roots.aerial >= 3 ? ["c4"] : [])];
    const place = [], put = (component, sockets, o) => place.push({ component, sockets, ...o });
    const S = {
      plan: PLAN, architecture: ARCHITECTURES[M.architecture.compact], axes: culms,
      leaf: { component: leafComponent, set: structure, angle: { shift: (heat ? 1 : 0) + (M.condition === "strained" ? -1 : 0), cap: heat === 1 ? "mid" : "high" } },
      leafPoints: [], place, roots: { taproot: Math.max(M.roots.storage, M.roots.aerial) },
      treatments: [M.surface.pigment ? { id: "pigment", level: 1 } : null, M.surface.wax ? { id: "wax", level: M.surface.wax } : null, salt ? { id: "toothed", level: 1 } : null].filter(Boolean),
      stress: M.condition === "strained", capped: M.capped.slice(),
    };
    if (salt) S.leafPoints.push({ component: "salt.crystal", at: "tip" }, { component: "salt.gland", at: "margin:1" });
    if (frost) S.leafPoints.push({ component: `frost.hair.${frost}`, at: salt ? "margin:0,2" : frost === 1 ? "tip" : "tip+margin" });
    if (frost >= 2) put(`frost.collar.${frost}`, "*.collar.*");
    if (M.roots.storage >= 2) put(`root.storage.${M.roots.storage}`, "primaryRoot");
    if (M.roots.aerial) put(`root.aerial.${M.roots.aerial}`, "aerial.*", { count: [0, 2, 3, 4][M.roots.aerial] });
    // the umbels: seed heads first, then the flower on the first free apex (else culm 1's flower branch), closed bract umbels elsewhere
    const held = new Set();
    if (Rp.seedHead >= 2) { put("seedHead.large", `${culms[0]}.seedHead.0`); put("seedHead.small", [`${culms[1]}.seedHead.0`, `${culms[2]}.seedHead.0`]); put("seed.drift", `${culms[0]}.drift.*`); held.add(0).add(1).add(2); }
    else if (Rp.seedHead) { put("seedHead.small", `${culms[0]}.seedHead.0`); held.add(0); }
    if (Rp.flower) { const free = culms.findIndex((_, i) => !held.has(i)); if (free >= 0) { put("flower", `${culms[free]}.flower.0`); held.add(free); } else put("flower", `${culms[1]}.flower.1`); }
    const buds = culms.filter((_, i) => !held.has(i)).map(c => `${c}.apex`); if (buds.length) put("bud", buds);
    if (Rp.pods) put("pod", [`${culms[1]}.pod.0`, `${culms[2]}.pod.0`]);
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
