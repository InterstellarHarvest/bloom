// BLOOM — plant SKELETON (BLOOM-032A Plant Evolution Visual Lab). docs/PLANT_EVOLUTION_VISUAL_LAB_v1.md §2.
//
// The stable attachment points every concept assembles its parts around, computed from the VISUAL MODEL (plant-model.js) and a
// concept's proportions (concepts.js), in integer logical pixels:
//
//   rootCrown            where the stem meets the soil line
//   primaryRoot          the main root path (deeper with a taproot)          lateralAnchors   where side roots leave it
//   stemPath             one point per pixel row from the crown to the apex  stemNodes / leafSockets   alternate leaf positions
//   apex                 the growing tip (bud / flower / seed head)          flowerSockets · headSockets · podSockets
//   anchors              named points the mutation FX grows from (rootCrown · stemMid · leafTop · apex · podSocket)
//
// Pure and deterministic: the same model + concept + size always gives the same skeleton. Posture (droop under stress) moves the
// sockets; it never adds or removes one. Classic script, no dependencies, no DOM.
(function (root) {
  "use strict";
  const R = Math.round;
  const LIFE = { seedling: 0.34, young: 0.62, established: 0.88, mature: 1 };
  const ARCH = { open: 1, compact: 0.8, cushion: 0.64, wetland: 1.1 };

  function build(M, C, W, H) {
    const u = H / C.H;                                   // the concept's authored scale (1 at its native resolution)
    const soilY = R(H * C.soilFrac), cx = R(W * C.crownX);
    const strained = M.life.condition === "strained";
    const sky = soilY - R(C.topMargin * u);
    const stemH = Math.max(6, R(sky * C.stemFrac * LIFE[M.life.stage] * ARCH[M.architecture] * (M.stem.storage ? 0.92 : 1)));
    // posture: under strain the upper stem leans and the apex nods (the anatomy is the same organism)
    const droop = strained ? C.droopSide * 5 * u : 0;
    const stemPath = [];
    for (let k = 0; k <= stemH; k++) { const t = k / stemH;
      stemPath.push({ x: R(cx + C.bend(t) * u + droop * t * t), y: soilY - k, t }); }
    const at = t => stemPath[Math.max(0, Math.min(stemH, R(t * stemH)))];

    // leaf sockets: alternate sides up the stem (the alien concept uses its own irregular rhythm); cushion clusters them low
    // (a concept's body plan: alternate leaves, or opposite pairs — the journal plate — and its own leaf count offset)
    const n = Math.max(2, M.leaf.count + (C.leafCountDelta || 0)), lo = M.leaf.clustered ? 0.12 : C.nodeStart, hi = M.leaf.clustered ? 0.6 : C.nodeEnd;
    const leafSockets = [], pairs = !!C.leafPairs, nodesN = pairs ? Math.ceil(n / 2) : n;
    for (let k = 0; k < n; k++) { const node = pairs ? k >> 1 : k, t = nodesN === 1 ? lo : lo + (hi - lo) * node / (nodesN - 1), p = at(t),
      side = pairs ? (k % 2 ? 1 : -1) : C.sidePattern ? C.sidePattern(k) : (k % 2 ? 1 : -1);
      const ang = side * (C.leafAngle - t * C.leafAngleTaper - M.leaf.upright * 16 + (strained ? -C.droopAngle : 0));
      leafSockets.push({ k, t, x: p.x, y: p.y, side, angle: ang, size: 1 - t * C.leafTaper }); }
    if (M.life.stage === "seedling") leafSockets.forEach(s => { s.size *= 0.75; });
    // a basal pair at the crown (the botanical rosette; the hybrid's broad friendly base leaves)
    const basal = C.basalPair && M.life.stage !== "seedling" ? [-1, 1].map(side => ({ k: -1, t: 0, x: cx, y: soilY - 1, side, angle: side * (C.basalAngle - M.leaf.upright * 10 + (strained ? -12 : 0)), size: C.basalPair, basal: true })) : [];
    leafSockets.unshift(...basal);

    const apex = { x: stemPath[stemH].x, y: stemPath[stemH].y };
    // reproductive sockets: the apex first, then short side branches off the upper nodes (left / right), never on a leaf
    const branch = (t, side, len) => { const p = at(t); return { from: { x: p.x, y: p.y }, x: R(p.x + side * len * u), y: R(p.y - len * 0.8 * u), side }; };
    const headSockets = [{ from: null, x: apex.x, y: apex.y, side: 0 }, branch(0.78, -1, 9), branch(0.66, 1, 10), branch(0.55, -1, 11)];
    const flowerSockets = [{ from: null, x: apex.x, y: apex.y, side: 0 }, branch(0.72, 1, 8)];
    const podSockets = [branch(0.42, -1, 6), branch(0.5, 1, 6)].map(s => ({ ...s, y: s.from.y + R(3 * u) }));
    const sideBudSockets = [branch(0.62, -1, 5), branch(0.7, 1, 5)];

    // roots: the primary root runs down (deeper with a taproot); laterals leave it alternately
    const soilDepth = H - soilY - 2;
    const depth = R(soilDepth * Math.min(0.92, C.rootDepth + 0.16 * M.roots.taproot) * (M.life.stage === "seedling" ? 0.5 : M.life.stage === "young" ? 0.75 : 1));
    const primaryRoot = []; for (let k = 0; k <= depth; k++) primaryRoot.push({ x: R(cx + Math.sin(k * 0.35 + C.rootWiggle) * 0.9), y: soilY + k });
    const nl = M.roots.laterals + (M.life.stage === "seedling" ? -1 : 0);
    const lateralAnchors = []; for (let k = 0; k < Math.max(1, nl) * 2; k++) { const f = 0.12 + 0.72 * (k / Math.max(1, nl * 2 - 1)); const p = primaryRoot[R(f * depth)];
      lateralAnchors.push({ x: p.x, y: p.y, side: k % 2 ? 1 : -1, len: R((C.lateralLen * (1 - f * 0.45)) * u * (M.life.stage === "seedling" ? 0.5 : 1)) }); }

    const top = leafSockets[leafSockets.length - 1] || apex;
    return { W, H, u, soilY, cx, stemH, stemPath, leafSockets, apex, headSockets, flowerSockets, podSockets, sideBudSockets, primaryRoot, lateralAnchors,
      anchors: { rootCrown: { x: cx, y: soilY }, stemMid: at(0.45), leafTop: { x: top.x, y: top.y }, apex, podSocket: podSockets[0] } };
  }

  root.BLOOM = Object.assign(root.BLOOM || {}, { plantVisual: Object.assign((root.BLOOM && root.BLOOM.plantVisual) || {}, {
    skeleton: Object.freeze({ build, LIFE, ARCH }) }) });
})(typeof window !== "undefined" ? window : globalThis);
