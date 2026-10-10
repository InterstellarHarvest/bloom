// BLOOM — plant GRAMMAR of body plan "candle" (Woolly Candle, cold specialist). BLOOM-035B-5. docs/SPECIES_BODY_PLANS_v1.md §2.3, §3.2.
//
// VISUAL MODEL (plant-visual-model.js, shared by every species) → this plan's components and sockets (art/plant/body-plans/candle.json,
// art/plant/contracts/candle.json). A `sprite` TRUNK (the authored woolly trunk + dead-leaf skirt, one drawing per architecture) carries a
// `rosette` CROWN; reproduction grows the `stem` COLUMN from the crown. Compatible axes STACK, exactly as on Organic Hybrid:
//
//   1 BODY / ARCHITECTURE  architecture.compact 0–3 → open · dense · compact · closed (thicker skirt "body.trunk.<t>", crown leaves fold
//                                        into a night-closed bud); the plan names each architecture's trunk drawing
//   2 PRIMARY LEAF         leaf.water → "leaf.base" | "leaf.drought.<1–3>" (narrow, silver) | "leaf.flood.<1–3>" (broad, soft)
//   3 HEAT MODIFIER        leaf.heat 1 / 2 / 3 → authored angle step +1 capped at mid / +1 / the structure's ".heat" variant (+1) + wax 1–3
//   4 SURFACE              frost 1–3 → "frost.hair.<t>" on leaf points (T1 tips · T2/T3 tips + margins) + "frost.collar.<t>" wool bands on
//                                        the trunk (T2, T3) · salt → "salt.crystal" tips + "salt.gland" margin 1 + "toothed" · pigment
//   5 REPRODUCTIVE         base → a closed "bud" in the crown; any reproduction grows the COLUMN: flower / seed heads / drift / pods on it
//   ROOTS                  storage 1 / 2 / 3 → deeper procedural taproot / + "root.storage.2" / "root.storage.3"
//                          aerial 1 / 2 / 3 → "root.aerial.<t>" on 2 / 3 / 4 anchors; T3 + "root.stilt" stilt-like trunk base (both sides)
// Pure, deterministic, no DOM.
(function (root) {
  "use strict";
  const PLAN = "candle", ARCHITECTURES = ["open", "dense", "compact", "closed"];

  function select(M) {
    const w = M.leaf.water, heat = M.leaf.heat, frost = M.surface.frost, salt = !!M.surface.salt, Rp = M.repro;
    const structure = w.arm ? `${w.arm}.${w.tier}` : "base", leafComponent = `leaf.${structure}${heat >= 3 ? ".heat" : ""}`;
    const column = !!(Rp.flower || Rp.seedHead || Rp.pods), place = [], put = (component, sockets, o) => place.push({ component, sockets, ...o });
    const S = {
      plan: PLAN, architecture: ARCHITECTURES[M.architecture.compact], axes: column ? ["trunk", "crown", "column"] : ["trunk", "crown"],
      body: `body.trunk.${M.architecture.compact}`,
      leaf: { component: leafComponent, set: structure, angle: { shift: (heat ? 1 : 0) + (M.condition === "strained" ? -1 : 0), cap: heat === 1 ? "mid" : "high" } },
      leafPoints: [], place, roots: { taproot: M.roots.storage },
      treatments: [M.surface.pigment ? { id: "pigment", level: 1 } : null, M.surface.wax ? { id: "wax", level: M.surface.wax } : null, salt ? { id: "toothed", level: 1 } : null].filter(Boolean),
      stress: M.condition === "strained", capped: M.capped.slice(),
    };
    if (salt) S.leafPoints.push({ component: "salt.crystal", at: "tip" }, { component: "salt.gland", at: "margin:1" });
    if (frost) S.leafPoints.push({ component: `frost.hair.${frost}`, at: salt ? "margin:0,2" : frost === 1 ? "tip" : "tip+margin" });
    if (frost >= 2) put(`frost.collar.${frost}`, "trunk.collar.*");
    if (M.roots.storage >= 2) put(`root.storage.${M.roots.storage}`, "primaryRoot");
    if (M.roots.aerial) put(`root.aerial.${M.roots.aerial}`, "aerial.*", { count: [0, 2, 3, 4][M.roots.aerial] });
    if (M.roots.aerial >= 3) put("root.stilt", "trunk.stilt.*");
    if (Rp.seedHead >= 2) put("seedHead.large", "column.seedHead.0"); else if (Rp.seedHead) put("seedHead.small", "column.seedHead.0");
    else if (Rp.flower) put("flower", "column.flower.0"); else put("bud", column ? "column.apex" : "crown.apex");
    if (Rp.flower && Rp.seedHead) put("flower", "column.flower.1");
    if (Rp.seedHead >= 2) { put("seedHead.small", ["column.seedHead.1", "column.seedHead.2"]); put("seed.drift", "column.drift.*"); }
    if (Rp.pods) put("pod", "column.pod.*");
    const ids = new Set([S.body, leafComponent]);
    for (const p of S.leafPoints) ids.add(p.component);
    for (const p of place) ids.add(p.component);
    S.components = [...ids].sort();
    S.key = JSON.stringify([S.plan, S.architecture, S.axes, S.body, S.leaf, S.leafPoints, S.place, S.roots, S.treatments, S.stress]);
    return S;
  }

  const grammar = Object.freeze({ plan: PLAN, select, ARCHITECTURES });
  const PV = root.BLOOM && root.BLOOM.plantVisual;
  root.BLOOM = Object.assign(root.BLOOM || {}, { plantVisual: Object.assign(PV || {}, { grammars: Object.assign((PV && PV.grammars) || {}, { [PLAN]: grammar }) }) });
})(typeof window !== "undefined" ? window : globalThis);
