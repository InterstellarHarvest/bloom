// BLOOM — authored PIXEL PARTS (BLOOM-032A Plant Evolution Visual Lab). docs/PLANT_EVOLUTION_VISUAL_LAB_v1.md §3.
//
// Two kinds of authored part, both pixel-exact (no anti-aliasing, no smooth curves at display resolution):
//   · SPRITES — small indexed pixel drawings (strings; one character = one logical pixel) for the details a rule cannot draw
//     well: buds, flowers, seed heads, drifting seeds, pods, salt crystals, air-root tips, seed caches, companion sprouts, nodules.
//     Each concept authors its own set (a concept is not a palette swap).
//   · PROFILES — the authored leaf / root silhouettes a rasterizer stamps at a socket, at the tier's size, pixel by pixel:
//     width(u, side) along the leaf (u 0 → 1 from base to tip, side ±1 for an asymmetric leaf). The renderer adds the outline
//     and the light-from-the-upper-left shading, so a profile reads as hand-placed pixels rather than a vector shape.
//
// Sprite legend (character → material, shade 0 dark · 1 shadow · 2 base · 3 light); "." = transparent:
//   s S z  stem          l L k  leaf          p P q  petal        c C  flower centre   w W v  pappus (seed fluff)
//   e E    seed          o O u  pod           f F    frost hair   x X  salt crystal     b B n  bud
//   a A    water         m M    nodule        r R    root         g G  storage core     t T  spore / alien sac
//   #      outline (the concept's line colour)
// Classic script, no dependencies, no DOM.
(function (root) {
  "use strict";
  // material ids (shared with plant-renderer.js)
  const MAT = { STEM: 1, LEAF: 2, VEIN: 3, ROOT: 4, PETAL: 5, CENTER: 6, PAPPUS: 7, SEED: 8, POD: 9, FROST: 10, WAX: 11, SALT: 12, RADLEAF: 13, RADSTEM: 14,
    BUD: 15, WATER: 16, NODULE: 17, STRESS: 18, FX: 19, CORE: 20, INK: 21, TUBER: 22, SAC: 23 };
  const LEGEND = { s: [1, 2], S: [1, 3], z: [1, 1], l: [2, 2], L: [2, 3], k: [2, 1], p: [5, 2], P: [5, 3], q: [5, 1], c: [6, 2], C: [6, 3],
    w: [7, 2], W: [7, 3], v: [7, 1], e: [8, 2], E: [8, 3], o: [9, 2], O: [9, 3], u: [9, 1], f: [10, 2], F: [10, 3], x: [12, 2], X: [12, 3],
    b: [15, 2], B: [15, 3], n: [15, 1], a: [16, 2], A: [16, 3], m: [17, 2], M: [17, 3], r: [4, 2], R: [4, 3], g: [20, 2], G: [20, 3], t: [23, 2], T: [23, 3], "#": [21, 0] };

  // ---------------------------------------------------------------- leaf profiles: width fraction 0…1 at u (0 base → 1 tip), side ±1
  const P = {
    // A · botanical: an ovate, pointed field-guide leaf with a short petiole
    ovate: (u) => u < 0.12 ? 0.18 : Math.pow(Math.sin(Math.PI * Math.pow((u - 0.12) / 0.88, 0.75)), 0.85),
    // B · journal: a slightly broader elliptic leaf (veins are drawn by the renderer)
    elliptic: (u) => u < 0.1 ? 0.2 : Math.pow(Math.sin(Math.PI * (u - 0.1) / 0.9), 0.7),
    // C · alien: an asymmetric lobed paddle — the upper side broad and scalloped, the lower side narrow
    paddle: (u, side) => { const base = u < 0.15 ? 0.15 : Math.pow(Math.sin(Math.PI * Math.pow((u - 0.15) / 0.85, 0.6)), 0.6);
      return side > 0 ? base * (1.05 + 0.22 * Math.sin(u * Math.PI * 4)) : base * 0.55; },
    // D · hybrid: a friendly rounded teardrop (broad end towards the tip)
    teardrop: (u) => u < 0.1 ? 0.22 : Math.pow(Math.sin(Math.PI * Math.pow((u - 0.1) / 0.9, 0.6)), 0.6),
    // water-arm forms (shared rules, concept-scaled): drought thickens, flood narrows into straps
    thick: (u) => u < 0.08 ? 0.3 : Math.pow(Math.sin(Math.PI * (u - 0.08) / 0.92), 0.55),
    succulent: (u) => Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.02)), 0.42),
    storage: (u) => u < 0.08 ? 0.45 : Math.pow(Math.sin(Math.PI * Math.min(1, (u - 0.08) / 0.92 * 0.92 + 0.04)), 0.32),
    strap: (u) => u < 0.06 ? 0.5 : Math.pow(Math.sin(Math.PI * Math.min(1, (u - 0.06) / 0.94)), 0.3),
  };
  /** The profile a concept uses for a model leaf form. */
  function profileFor(concept, form) {
    if (form === "thick") return P.thick; if (form === "succulent") return P.succulent; if (form === "storage") return P.storage;
    if (form === "strap" || form === "ribbon" || form === "emergent") return P.strap;
    return P[concept.leafProfile] || P.ovate;
  }

  // ---------------------------------------------------------------- sprites, per concept
  const S = {};
  // A · BOTANICAL PIXEL SPECIMEN — restrained, recognisable: white five-petal flower, dandelion-like seed clock, fibrous pods
  S.A = {
    bud: ["..B..", ".bBb.", ".bBn.", ".nbn.", "..z.."],
    budBig: ["..BB..", ".bBBb.", ".bBbn.", ".bbbn.", "..nn..", "..zz.."],
    flower: ["..P.P..", ".PPpPP.", "PpPCPpP", ".pCcCp.", "..qcq..", "...z..."],
    flowerBig: ["...P.P...", "..PPpPP..", ".PpPPPpP.", "PPpCCCpPP", ".pPCcCPp.", "..pqcqp..", "...qzq...", "....z...."],
    headS: ["...wWw...", ".wWWWWWw.", ".WWvWvWW.", "wWvWWWvWw", "WWWWeWWWW", "wWvWWWvWw", ".WWvWvWW.", ".wWWWWWw.", "...wzw..."],
    headL: ["w...W...w", ".w.wWw.w.", "..WWWWW..", ".WWvWvWW.", "wWvWWWvWw", "WWWWeWWWWW", "wWvWeWvWw", ".WWvWvWW.", "..WWWWW..", ".w.wzw.w.", "w...z...w"],
    drift: ["W.W", ".W.", ".e."],
    pod: [".uou.", "uoOOu", "oOOoo", "ooOou", "uooou", ".uuu."],
    floatPod: [".uou..", "uoOOu.", "ooOou.", ".uuu..", "aAaaAa"],
    crystal: [".X.", "XxX", ".X."],
    airTip: ["R", "r"],
    sideBud: [".B.", "bBb", ".n."],
    cache: [".eEe.", "eEeEe", ".eee."],
    nodule: ["mM", "Mm"],
    companion: ["..L..", ".lLl.", "lk.kl", "..z..", "..z.."],
  };
  // B · FIELD-JOURNAL CUTAWAY — the same anatomy drawn as a pressed, inked plate: flatter fills, clear diagram shapes
  S.B = {
    bud: ["..b..", ".bBb.", ".bBb.", ".bbb.", "..s.."],
    budBig: ["..bb..", ".bBBb.", ".bBBb.", ".bbbb.", "..bb..", "..ss.."],
    flower: ["..P.P..", ".PPPPP.", "PPPcPPP", ".PcCcP.", "..PcP..", "...s..."],
    flowerBig: ["...P.P...", "..PPPPP..", ".PPPPPPP.", "PPPcccPPP", ".PPcCcPP.", "..PPcPP..", "...PsP...", "....s...."],
    headS: ["..w.w.w..", ".wWWWWWw.", "wWWwWwWWw", ".WwWWWwW.", "wWWWeWWWw", ".WwWWWwW.", "wWWwWwWWw", ".wWWWWWw.", "....s...."],
    headL: ["w.w.w.w.w", ".wWWWWWw.", "wWWwWwWWw", ".WwWWWwW.", "wWWWeWWWw", "WWwWeWwWW", "wWWWeWWWw", ".WwWWWwW.", "wWWwWwWWw", ".wWWWWWw.", "....s...."],
    drift: ["w.w", ".w.", ".e."],
    pod: [".ooo.", "oOOoo", "oOooo", "ooooo", "ooooo", ".ooo."],
    floatPod: [".ooo..", "oOOoo.", "ooooo.", ".ooo..", "aaAaaa"],
    crystal: [".X.", "XXX", ".X."],
    airTip: ["R", "r"],
    sideBud: [".b.", "bBb", ".b."],
    cache: [".eee.", "eEeEe", ".eee."],
    nodule: ["mm", "mm"],
    companion: ["..l..", ".lLl.", "l.s.l", "..s..", "..s.."],
  };
  // C · STRANGE ALIEN HERBARIUM — a curled crozier bud, hanging coral bells, spore-sac clusters, translucent bladder floats
  S.C = {
    bud: [".bb..", "b.Bb.", "bnB.b", ".bbb.", "...z."],
    budBig: [".bbb..", "b..Bb.", "b.nB.b", "b..bb.", ".bbb..", "....z."],
    flower: ["..zz...", ".PPPP..", "PPpPPq.", "PpPPpq.", ".qPPq..", "..c.c..", "..C.C.."],
    flowerBig: ["...zz....", "..PPPP...", ".PPPpPP..", "PPpPPPPq.", "PpPPpPPq.", ".qPPPPq..", "..qPPq...", "..c.c.c..", "..C.C.C.."],
    headS: [".tT..tT.", "tTTt.TTt", "tTTttTTt", ".tTTTTt.", "..tTTt..", "...zz..."],
    headL: ["tT..tT..", "TTt.TTt.", "tTt.tTt.tT", ".tTTtTT.TT", "tTTTTTTtt.", ".tTTTTTt..", "..tTTTt...", "...zz....."],
    drift: [".T.", "tTt", ".t."],
    pod: [".OOO.", "OoAoO", "OAaAo", "OoAoO", ".ooo."],
    floatPod: [".OOO..", "OoAoO.", "OAaAo.", ".ooo..", "aAaaAa"],
    crystal: ["X.X", ".x.", "XxX"],
    airTip: ["RR", "r."],
    sideBud: [".bb", "b.B", ".bb"],
    cache: [".tTt.", "tTtTt", ".ttt."],
    nodule: ["MM", "mM"],
    companion: [".l...", "lLl..", ".kLl.", "..z..", "...z."],
  };
  // D · ORGANIC HYBRID — chunky, friendly shapes: a round bud, a big open flower, a fluffy seed globe, round floats
  S.D = {
    bud: [".bBb.", "bBBBb", "bBBbn", ".bbn.", "..z.."],
    budBig: ["..bBb..", ".bBBBb.", "bBBBBbn", "bBBbbbn", ".bbbnn.", "...z..."],
    flower: ["..PPP..", ".PPpPP.", "PPpCpPP", "PpCCcpP", ".PpcpP.", "..qqq..", "...z..."],
    flowerBig: ["...PPP...", "..PPpPP..", ".PPPpPPP.", "PPpCCCpPP", "PpCCCccpP", ".PpCccpP.", "..PpppP..", "...qqq...", "....z...."],
    headS: ["...wWw...", ".wWWWWWw.", "wWWWWWWWv", "WWWWEWWWv", "WWWEeEWWv", "wWWWEWWWv", ".wWWWWWv.", "...vvv...", "....z...."],
    headL: ["w...wWw...w", "..wWWWWWw..", ".wWWWWWWWv.", "wWWWWEWWWWv", "WWWWEeEWWWv", "WWWEeeeEWWv", "WWWWEeEWWWv", "wWWWWEWWWWv", ".wWWWWWWWv.", "..vvvvvvv..", ".....z....."],
    drift: ["wW", ".e"],
    pod: [".oOo.", "oOOOo", "oOOoo", "ooOou", "uooou", ".uuu."],
    floatPod: [".oOo..", "oOOOo.", "ooOou.", ".uuu..", "aAaaAa"],
    crystal: [".X.", "XxX", ".X."],
    airTip: ["RR", "rr"],
    sideBud: [".B.", "bBb", ".n."],
    cache: [".eEe.", "eEEEe", ".eee."],
    nodule: ["mM", "Mm"],
    companion: [".lL..", "lLLl.", ".kll.", "..z..", "..z.."],
  };

  /** Parse a sprite once → [{dx, dy, mat, shade}] (cached). Anchor = bottom-centre unless the caller passes another. */
  const cache = new Map();
  function cells(sprite) {
    const k = sprite.join("\n"); if (cache.has(k)) return cache.get(k);
    const out = [], h = sprite.length, w = Math.max(...sprite.map(r => r.length));
    for (let y = 0; y < h; y++) for (let x = 0; x < sprite[y].length; x++) { const L = LEGEND[sprite[y][x]]; if (L) out.push({ x, y, mat: L[0], shade: L[1] }); }
    const r = { cells: out, w, h }; cache.set(k, r); return r;
  }

  root.BLOOM = Object.assign(root.BLOOM || {}, { plantVisual: Object.assign((root.BLOOM && root.BLOOM.plantVisual) || {}, {
    parts: Object.freeze({ MAT, LEGEND, profiles: P, profileFor, sprites: S, cells }) }) });
})(typeof window !== "undefined" ? window : globalThis);
