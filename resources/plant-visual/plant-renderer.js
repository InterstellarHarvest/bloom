// BLOOM — plant RENDERER (BLOOM-032A Plant Evolution Visual Lab). docs/PLANT_EVOLUTION_VISUAL_LAB_v1.md §3, §8.
//
// Assembles ONE organism from the visual model (plant-model.js), the skeleton (plant-skeleton.js) and a concept's authored parts
// (pixel-parts.js, concepts.js), into an indexed pixel buffer at the concept's logical resolution, then composites it over the
// specimen-box environment (sky above, soil cutaway below):
//
//   const F = BLOOM.plantVisual.renderer.render(model, concept, { W, H })
//   F.rgba (W × H RGBA) · F.plant (indexed buffer: material·shade, part, primitive per pixel) · F.sk (skeleton anchors)
//   F.sig = { anatomy, env, full, key }   anatomy = the plant pixels only (Terraform never changes it); key = the model's component key
//   BLOOM.plantVisual.renderer.paint(canvas, rgba)   (the canvas is W × H; CSS scales it with image-rendering: pixelated)
//
// Drawing order: roots → colony (local) underground → companions → stem → branches → leaves → reproductive parts → (shading,
// separation lines, outline) → surface overlays (frost hairs, wax, salt crystals) → stress marks. Every pixel is placed by an
// authored rule or sprite; nothing is random (a fixed hash places small irregularities). It knows no price, rule or mechanic.
// Classic script, no dependencies besides BLOOM.plantVisual.parts / skeleton; no DOM except paint().
(function (root) {
  "use strict";
  const R = Math.round, clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const PART = { roots: 1, stem: 2, leaves: 3, surface: 4, repro: 5, local: 6, stress: 7 };
  const PART_NAMES = Object.fromEntries(Object.entries(PART).map(([k, v]) => [v, k]));
  const hash = (a, b = 0) => { let h = Math.imul((a + 1) * 0x9e3779b1 ^ (b + 7) * 0x85ebca6b, 0x27d4eb2f) >>> 0; h ^= h >>> 15; return (h >>> 0) / 4294967296; };
  const fnv = arr => { let h = 0x811c9dc5; for (let i = 0; i < arr.length; i++) { h ^= arr[i]; h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(16).padStart(8, "0"); };
  const hex = h => [1, 3, 5].map(k => parseInt(h.slice(k, k + 2), 16));
  const mixRgb = (a, b, t) => a.map((v, k) => R(v + (b[k] - v) * t));
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);

  // ================================================================ the indexed buffer and its primitives
  function Buf(W, H) { return { W, H, m: new Uint8Array(W * H), part: new Uint8Array(W * H), prim: new Uint16Array(W * H), fixed: new Uint8Array(W * H), over: new Uint8Array(W * H), primN: 0, clip: 0 }; }
  const prim = b => ++b.primN;
  function put(b, x, y, mat, shade, part, p, fixed) {
    x = R(x); y = R(y); if (x < 0 || y < 0 || x >= b.W || y >= b.H) { b.clip++; return; }
    const i = y * b.W + x; b.m[i] = mat * 4 + shade; b.part[i] = part; b.prim[i] = p; b.fixed[i] = fixed ? 1 : 0;
  }
  const matAt = (b, x, y) => (x < 0 || y < 0 || x >= b.W || y >= b.H) ? 0 : b.m[y * b.W + x] >> 2;
  const filled = (b, x, y) => !(x < 0 || y < 0 || x >= b.W || y >= b.H) && b.m[y * b.W + x] !== 0;
  /** A clean 1-px path through points (duplicates and L-corners removed: pixel-perfect lines). */
  function cleanPath(pts) {
    const out = []; for (const p of pts) { const q = { x: R(p.x), y: R(p.y) }; const l = out[out.length - 1]; if (!l || l.x !== q.x || l.y !== q.y) out.push(q); }
    for (let i = 1; i < out.length - 1; i++) { const a = out[i - 1], c = out[i + 1]; if (Math.abs(a.x - c.x) === 1 && Math.abs(a.y - c.y) === 1) { out.splice(i, 1); i--; } }
    return out;
  }
  const quad = (a, c, e, n) => { const pts = []; for (let k = 0; k <= n; k++) { const t = k / n, s = 1 - t; pts.push({ x: s * s * a.x + 2 * s * t * c.x + t * t * e.x, y: s * s * a.y + 2 * s * t * c.y + t * t * e.y }); } return pts; };
  function stroke(b, pts, w, mat, shade, part, p, fixed) {
    const path = cleanPath(pts);
    path.forEach((q, k) => { const ww = typeof w === "function" ? w(k / Math.max(1, path.length - 1)) : w;
      for (let dx = -Math.floor((ww - 1) / 2); dx <= Math.ceil((ww - 1) / 2); dx++) put(b, q.x + dx, q.y, mat, shade, part, p, fixed); });
    return path;
  }
  function blob(b, cx, cy, rx, ry, mat, shade, part, p, fixed) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const d = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2; if (d <= 1.02) put(b, x, y, mat, shade, part, p, fixed); }
  }
  /** Stamp an authored sprite. anchor "bottom" (default: bottom-centre at x, y), "top" (top-centre), "center". matMap swaps materials. */
  function stamp(b, PV, sprite, x, y, part, { anchor = "bottom", flip = false, matMap = null, fixed = true, p = null } = {}) {
    const c = PV.parts.cells(sprite), id = p || prim(b);
    const ox = R(x - (c.w - 1) / 2), oy = anchor === "top" ? R(y) : anchor === "center" ? R(y - (c.h - 1) / 2) : R(y - c.h + 1);
    for (const q of c.cells) { const mat = matMap && matMap[q.mat] ? matMap[q.mat] : q.mat; put(b, ox + (flip ? c.w - 1 - q.x : q.x), oy + q.y, mat, q.shade, part, id, fixed); }
    return { x: ox, y: oy, w: c.w, h: c.h, p: id };
  }

  /**
   * Rasterize one leaf from a socket: pixel centres are mapped into leaf space (u along the blade 0 → 1, v across, upper side +)
   * and kept where |v| ≤ half the profile's width. Returns the leaf's pixels with their (u, v) for the overlays.
   */
  function leaf(b, o) {
    const a = o.angle * Math.PI / 180, dir = { x: Math.sin(a), y: -Math.cos(a) };
    let n = { x: -dir.y, y: dir.x }; if (n.y > 0 || (n.y === 0 && n.x < 0)) n = { x: -n.x, y: -n.y };           // the upper side's normal
    const base = { x: o.x + dir.x * o.offset, y: o.y + dir.y * o.offset }, L = o.len, Wd = o.wid, p = prim(b), px = [];
    const x0 = Math.floor(Math.min(base.x, base.x + dir.x * L) - Wd - 2), x1 = Math.ceil(Math.max(base.x, base.x + dir.x * L) + Wd + 2);
    const y0 = Math.floor(Math.min(base.y, base.y + dir.y * L) - Wd - 2), y1 = Math.ceil(Math.max(base.y, base.y + dir.y * L) + Wd + 2);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const dx = x + 0.5 - base.x, dy = y + 0.5 - base.y, uu = (dx * dir.x + dy * dir.y) / L; if (uu < 0 || uu > 1) continue;
      const vv = dx * n.x + dy * n.y + o.bend * L * uu * uu, side = vv >= 0 ? 1 : -1, half = Wd / 2 * o.profile(uu, side);
      if (Math.abs(vv) > half + 0.2) continue;
      const edge = Math.abs(vv) > half - 1.05;
      if (o.serrate && edge && R(uu * L) % 3 === 0 && uu > 0.2 && uu < 0.92) continue;          // salt: a toothed, toughened margin
      let mat = o.mat, shade = 2, fixed = false;
      if (o.core && Math.abs(vv) < half * 0.42 && uu > 0.18 && uu < 0.82) { mat = o.mat === 2 ? 20 : o.mat; shade = 3; fixed = true; }    // water-storage tissue (in the leaf's own pigment)
      if (o.brownTip && uu > 0.84) { mat = 18; shade = 2; fixed = true; }                                                      // stress: a scorched tip
      if (o.blotch && uu < 0.32 && Math.abs(vv) < half * 0.7) { shade = 1; fixed = true; }                                  // rad: anthocyanin at the base
      put(b, x, y, mat, shade, PART.leaves, p, fixed); px.push({ x, y, u: uu, v: half > 0 ? vv / half : 0 });
    }
    // veins: the midrib (and, for the journal plate, side veins); parallel channels on straps; pores on the alien paddle
    const at = (s, off = 0) => ({ x: base.x + dir.x * s - n.x * (o.bend * L * (s / L) ** 2) + n.x * off, y: base.y + dir.y * s - n.y * (o.bend * L * (s / L) ** 2) + n.y * off });
    const own = q => { const x = Math.floor(q.x), y = Math.floor(q.y); return x >= 0 && y >= 0 && x < b.W && y < b.H && b.prim[y * b.W + x] === p && !b.fixed[y * b.W + x]; };
    const vein = (q, mat, shade) => { if (own(q)) put(b, Math.floor(q.x), Math.floor(q.y), mat, shade, PART.leaves, p, true); };
    if (Wd >= 3.5 && o.veins !== "none") {
      if (o.strap) { for (let s = L * 0.08; s < L * 0.9; s += 0.5) { vein(at(s, Wd * 0.18), o.veinMat, 3); } }
      else for (let s = L * 0.1; s < L * 0.86; s += 0.5) vein(at(s), o.veinMat, o.veinShade);
      if (o.veins === "pinnate" && Wd >= 5) for (const f of [0.32, 0.52, 0.72]) for (let k = 1; k <= Math.min(3, Wd / 2 - 0.5); k++) {
        vein({ x: at(L * f).x + dir.x * k * 0.8 + n.x * k, y: at(L * f).y + dir.y * k * 0.8 + n.y * k }, o.veinMat, o.veinShade);
        vein({ x: at(L * f).x + dir.x * k * 0.8 - n.x * k, y: at(L * f).y + dir.y * k * 0.8 - n.y * k }, o.veinMat, o.veinShade); }
      if (o.veins === "pores") for (const f of [0.35, 0.6]) vein(at(L * f, Wd * 0.22), o.mat, 3);
    }
    const tip = at(L * 0.97);
    return { p, px, tip: { x: R(tip.x), y: R(tip.y) }, base, dir, n, L, Wd };
  }

  // ================================================================ passes
  function shadePass(b, flat) {
    const { W, H, m, prim: P, fixed } = b, out = m.slice();
    const same = (i, x, y) => x >= 0 && y >= 0 && x < W && y < H && P[y * W + x] === P[i] && (m[y * W + x] >> 2) === (m[i] >> 2);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (!m[i] || fixed[i] || (m[i] & 3) !== 2) continue;
      const top = !same(i, x, y - 1), left = !same(i, x - 1, y), bottom = !same(i, x, y + 1), right = !same(i, x + 1, y);
      if (flat) { if (top) out[i] = (m[i] & ~3) | 3; continue; }
      if ((top || left) && !(bottom && right)) out[i] = (m[i] & ~3) | 3; else if (bottom || right) out[i] = (m[i] & ~3) | 1; }
    b.m.set(out);
  }
  /** Dark separation lines where a later part overlaps an earlier one (a leaf over the stem, a flower over a leaf). */
  function separationPass(b, inkMat) {
    const { W, H, m, prim: P } = b, out = m.slice();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (!m[i] || b.over[i]) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= W || Y >= H) continue; const j = Y * W + X;
        if (m[j] && !b.over[j] && P[j] > P[i] && (m[j] >> 2) !== 20 && b.part[j] !== PART.roots) { out[i] = inkMat ? inkMat * 4 : (m[i] & ~3); break; } } }
    b.m.set(out);
  }
  function outlinePass(b, inkMat, skipParts) {
    const { W, H, m } = b, add = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (m[i]) continue; let best = -1;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= W || Y >= H) continue; const j = Y * W + X;
        if (m[j] && !b.over[j] && !skipParts.includes(b.part[j]) && (best < 0 || b.prim[j] > b.prim[best])) best = j; }
      if (best >= 0) add.push([i, best]); }
    for (const [i, j] of add) { b.m[i] = (inkMat || (b.m[j] >> 2)) * 4; b.part[i] = b.part[j]; b.prim[i] = b.prim[j]; b.fixed[i] = 1; }
  }

  // ================================================================ the organism
  function drawPlant(M, C, W, H, PV) {
    const sk = PV.skeleton.build(M, C, W, H), b = Buf(W, H), u = sk.u, S = PV.parts.sprites[C.id], g = M.genome, MAT = PV.parts.MAT;
    const leafMat = M.surface.pigment ? MAT.RADLEAF : M.surface.wax >= 2 ? MAT.WAX : MAT.LEAF, stemMat = M.stem.pigment ? MAT.RADSTEM : MAT.STEM;
    const matMap = { 2: leafMat, 1: stemMat };
    const strained = M.life.condition === "strained", lifeLeaf = { seedling: 0.62, young: 0.82, established: 1, mature: 1.05 }[M.life.stage];
    const soilY = sk.soilY, cx = sk.cx;
    const leafOverlays = [];

    // ---- ROOTS (below the soil line; flood's air roots and prop roots rise above it)
    { const pr = prim(b), tap = M.roots.taproot;
      stroke(b, sk.primaryRoot, t => t < 0.3 ? (tap >= 2 ? 3 : 2) : t < 0.7 ? (tap >= 2 ? 2 : 1) : 1, MAT.ROOT, 2, PART.roots, pr);
      if (M.roots.tuber) blob(b, sk.primaryRoot[R(sk.primaryRoot.length * 0.32)].x, sk.primaryRoot[R(sk.primaryRoot.length * 0.32)].y, 3.2 * u, 5.5 * u, MAT.TUBER, 2, PART.roots, prim(b));
      sk.lateralAnchors.forEach((a, k) => { const len = a.len * (M.roots.dense ? 1.15 : 1), end = { x: a.x + a.side * len, y: a.y + len * (0.42 + hash(k, 3) * 0.3) };
        const mid = { x: a.x + a.side * len * 0.55, y: a.y + 1 + hash(k, 4) * 2 };
        const path = stroke(b, quad(a, mid, end, R(len * 2)), M.roots.dense && k < 4 ? 2 : 1, MAT.ROOT, 2, PART.roots, prim(b));
        if (M.roots.dense && path.length > 6) { const q = path[R(path.length * 0.6)]; stroke(b, quad(q, { x: q.x + a.side * 2, y: q.y + 3 }, { x: q.x + a.side * 3, y: q.y + 6 }, 8), 1, MAT.ROOT, 2, PART.roots, prim(b)); } });
      for (let k = 0; k < M.roots.air * 2; k++) { const side = k % 2 ? 1 : -1, x = cx + side * R((4 + (k >> 1) * 3) * u), h = R((3 + M.roots.air * 2 + (k % 3)) * u);   // pneumatophores
        stroke(b, [{ x, y: soilY + 2 }, { x, y: soilY - h }], 1, MAT.ROOT, 2, PART.roots, prim(b)); stamp(b, PV, S.airTip, x, soilY - h, PART.roots, { anchor: "bottom" }); }
      if (M.roots.prop) for (const side of [-1, 1]) for (const t of [0.16, 0.28]) { const s = sk.stemPath[R(t * sk.stemH)], e = { x: s.x + side * R((9 + t * 14) * u), y: soilY + 3 };   // stilt roots
        stroke(b, quad(s, { x: s.x + side * 7 * u, y: s.y - 1 }, e, 24), 2, MAT.ROOT, 2, PART.roots, prim(b)); }
    }
    // ---- LOCAL colony underground: the root network reaching neighbouring colonies, its nodules, the seed bank, the seed cache
    if (M.roots.network) { const p = prim(b);
      for (const side of [-1, 1]) for (const d of [0.3, 0.55]) { const y = soilY + R((H - soilY) * d), x0 = cx + side * 6, x1 = side < 0 ? 2 : W - 3;
        stroke(b, quad({ x: x0, y: y - 2 }, { x: (x0 + x1) / 2, y: y + 2 }, { x: x1, y }, 40), 1, MAT.NODULE, 1, PART.local, p); }
      for (let k = 0; k < M.local.nodules; k++) { const side = k % 2 ? 1 : -1, x = cx + side * R((8 + (k >> 1) * 7) * u), y = soilY + R((H - soilY) * (0.3 + (k % 3) * 0.12)); stamp(b, PV, S.nodule, x, y, PART.local, { anchor: "center" }); } }
    for (let k = 0; k < M.local.seedBank; k++) { const x = R(6 + hash(k, 21) * (W - 12)), y = soilY + 2 + R(hash(k, 22) * 4); if (!filled(b, x, y)) { put(b, x, y, MAT.SEED, 3, PART.local, prim(b), true); put(b, x + 1, y, MAT.SEED, 2, PART.local, b.primN, true); } }
    if (M.local.seedCache) stamp(b, PV, S.cache, cx - R(11 * u), soilY + R(5 * u), PART.local, { anchor: "center" });
    // ---- LOCAL colony above ground: canopy companions (the same species, small) at the box edges
    for (let k = 0; k < M.local.companions; k++) stamp(b, PV, S.companion, k ? W - R(9 * u) : R(9 * u), soilY, PART.local, { matMap, flip: !!k });

    // ---- STEM
    const sw0 = C.stemW * u + M.stem.stout + (M.stem.storage ? 1 : 0);
    const stemW = t => Math.max(1, R(sw0 * (1 - 0.42 * t)));
    const ps = prim(b); stroke(b, sk.stemPath, stemW, stemMat, 2, PART.stem, ps);
    if (C.nodeBulbs) sk.leafSockets.forEach((s, k) => { if (k % 2 === 0) blob(b, s.x, s.y, 1.6 * u + 0.4, 1.4 * u + 0.3, stemMat, 2, PART.stem, ps); });
    if (M.stem.storage) blob(b, sk.stemPath[R(sk.stemH * 0.22)].x, sk.stemPath[R(sk.stemH * 0.22)].y, sw0 * 0.9, 4 * u, stemMat, 2, PART.stem, ps);   // drought T3: a swollen storage stem
    if (M.stem.airChannels) for (let k = 2; k < sk.stemH - 2; k += M.stem.airChannels >= 2 ? 2 : 3) { const q = sk.stemPath[k]; if (stemW(k / sk.stemH) >= 2) put(b, q.x, q.y, MAT.WATER, 3, PART.stem, ps, true); }   // aerenchyma

    // ---- branches + reproductive sockets in use
    const R0 = M.repro, sockets = [], useHead = [], useFlower = [];
    if (R0.flowers) { useFlower.push(sk.flowerSockets[0]); if (R0.flowers > 1) useFlower.push(sk.flowerSockets[1]); }
    // with flowers at the apex and the right branch, seed heads take the left branches first (never the flower's place)
    const headPool = R0.flowers ? [sk.headSockets[1], sk.headSockets[3], sk.headSockets[2]] : sk.headSockets; for (let k = 0; k < R0.heads && k < headPool.length; k++) useHead.push(headPool[k]);
    const branchTo = s => { if (s.from) stroke(b, [s.from, { x: (s.from.x + s.x) / 2 + s.side, y: (s.from.y + s.y) / 2 + 1 }, s], 1, stemMat, 2, PART.repro, prim(b)); };
    useFlower.forEach(branchTo); useHead.forEach(branchTo); sockets.push(...useFlower, ...useHead);
    const pods = R0.pods ? sk.podSockets.slice(0, R0.pods) : [];
    pods.forEach(s => stroke(b, [s.from, { x: s.from.x + s.side * 3, y: s.from.y + 1 }, { x: s.x, y: s.y }], 1, stemMat, 2, PART.repro, prim(b)));
    const sideBuds = M.local.sideBuds ? sk.sideBudSockets.slice(0, M.local.sideBuds) : [];
    sideBuds.forEach(s => stroke(b, [s.from, s], 1, stemMat, 2, PART.local, prim(b)));

    // ---- LEAVES (bottom → top); flood T3 adds emergent basal blades; the hybrid curls its top leaves
    const form = M.leaf.form, profile = PV.parts.profileFor(C, form), strap = form === "strap" || form === "ribbon" || form === "emergent";
    const lenK = (M.local.focus === "leaves" ? 1.08 : 1) * (M.local.upgrade === "leafCanopy" ? 1.14 : 1);
    const mk = (s, k, extra = {}) => leaf(b, { x: s.x, y: s.y, angle: s.angle, offset: Math.max(1, sw0 / 2), len: C.leafLen * u * M.leaf.length * s.size * lenK * lifeLeaf, wid: Math.max(2.5, C.leafWid * u * M.leaf.width * s.size * (M.local.upgrade === "leafCanopy" ? 1.1 : 1) * lifeLeaf),
      profile, bend: (C.leafBend + (form === "ribbon" ? 0.25 : 0) + (strained ? 0.28 : 0)) * (C.curlTop && k >= sk.leafSockets.length - 2 && !strained ? -1.4 : 1), mat: leafMat, veinMat: leafMat === MAT.LEAF ? MAT.VEIN : leafMat, veinShade: 1,
      veins: C.veins, strap, serrate: M.surface.toughEdge, core: form === "succulent" || form === "storage", brownTip: strained && k % 2 === 0, blotch: M.surface.pigment, ...extra });
    if (form === "emergent") for (const [ang, f] of [[-12, 1.5], [9, 1.7], [-4, 1.25]]) leafOverlays.push(mk({ x: cx + R(ang / 4), y: soilY - 1, angle: ang, size: f, side: ang < 0 ? -1 : 1 }, -1, { offset: 0 }));
    sk.leafSockets.forEach((s, k) => leafOverlays.push(mk(s, k)));

    // ---- REPRODUCTIVE parts (sprites at their sockets)
    const big = M.local.prominent;
    if (R0.bud) stamp(b, PV, big ? S.budBig : S.bud, sk.apex.x, sk.apex.y + 1, PART.repro, { matMap: { 1: stemMat } });
    useHead.forEach((s, k) => stamp(b, PV, R0.headSize === "large" && k === 0 ? S.headL : S.headS, s.x, s.y + 1, PART.repro, { matMap: { 1: stemMat } }));
    useFlower.forEach(s => stamp(b, PV, big ? S.flowerBig : S.flower, s.x, s.y + 1, PART.repro, { matMap: { 1: stemMat } }));   // flowers last: in front
    for (let k = 0; k < R0.drift; k++) stamp(b, PV, S.drift, sk.apex.x + R((7 + k * 6) * u), sk.apex.y - R((3 + k * 5) * u) + (k === 1 ? 3 : 0), PART.repro);
    pods.forEach(s => stamp(b, PV, S.pod, s.x, s.y, PART.repro, { anchor: "top" }));
    if (R0.floating && M.life.stage !== "seedling") stamp(b, PV, S.floatPod, cx - R(18 * u), soilY + 1, PART.repro);
    sideBuds.forEach(s => stamp(b, PV, S.sideBud, s.x, s.y, PART.local, { anchor: "center" }));

    // ---- passes: shading, separation lines, outline (concept treatment); roots read as light lines in the soil without an outline
    shadePass(b, C.shading === "flat");
    // cold: a silvery insulating fringe on every leaf margin (T1 upper margin, T2+ both) — readable before any hair is
    if (M.surface.hairs) leafOverlays.forEach(L => L.px.forEach(q => { if (q.u > 0.1 && (q.v > 0.72 || (M.surface.hairs >= 3 && q.v < -0.72))) put(b, q.x, q.y, MAT.FROST, M.surface.hairs >= 3 ? 3 : 2, PART.surface, L.p, true); }));
    // heat: wax / reflective cuticle — a light streak along each leaf's upper edge (T1 sparse; T2 the whole leaf is glaucous; T3 bright tips)
    if (M.surface.wax) leafOverlays.forEach((L, k) => L.px.forEach((q, j) => { if (q.v > 0.45 && q.v < 0.9 && q.u > 0.18 && q.u < 0.86 && (M.surface.wax >= 2 || j % 2 === 0)) put(b, q.x, q.y, MAT.WAX, 3, PART.surface, L.p, true); }));
    if (M.stem.waxEdge) sk.stemPath.forEach((q, k) => { if (k % 2 === 0) { const x = q.x - Math.floor((stemW(k / sk.stemH) - 1) / 2); if ((b.m[q.y * W + x] >> 2) === stemMat) put(b, x, q.y, MAT.WAX, 3, PART.surface, ps, true); } });
    // salt: crystalline glands at every leaf tip (outlined, so they read at room size)
    if (M.surface.salt) leafOverlays.forEach((L, k) => { if (L.Wd >= 2.5 && k % 2 === leafOverlays.length % 2) stamp(b, PV, S.crystal, L.tip.x, L.tip.y, PART.surface, { anchor: "center" }); });
    const inkMat = C.outline === "ink" ? MAT.INK : 0;
    separationPass(b, inkMat);
    outlinePass(b, inkMat, C.rootOutline ? [] : [PART.roots]);
    // ---- overlays outside the silhouette (not outlined): frost hairs (cold), woolly collars (cold T3)
    const over = (x, y, mat, shade, part) => { x = R(x); y = R(y); if (x < 0 || y < 0 || x >= W || y >= H) return; const i = y * W + x; if (b.m[i] && (b.m[i] & 3) !== 0) return;
      b.m[i] = mat * 4 + shade; b.part[i] = part; b.fixed[i] = 1; b.over[i] = 1; };
    if (M.surface.hairs) { const step = [0, 4, 3, 2][M.surface.hairs];
      // cold: insulating hairs along the leaf margin — T1 sparse single hairs, T2 denser 2-px hairs, T3 both margins (the fringe is drawn before the outline)
      leafOverlays.forEach(L => { const edge = L.px.filter(q => q.u > 0.12 && (q.v > 0.62 || (M.surface.hairs >= 3 && q.v < -0.62))).sort((a, c) => a.u - c.u);
        edge.forEach((q, j) => { if (j % step) return; const s = q.v > 0 ? 1 : -1, len = M.surface.hairs >= 2 ? 2 : 1;
          for (let d = 1; d <= len; d++) over(q.x + s * L.n.x * (d + 0.6), q.y + s * L.n.y * (d + 0.6), MAT.FROST, d === len ? 2 : 1, PART.surface); }); });
      if (M.stem.hairs) sk.stemPath.forEach((q, k) => { if (k % 3 === 1 && k > 2) { const w = stemW(k / sk.stemH); over(q.x - Math.floor((w - 1) / 2) - 2, q.y, MAT.FROST, 1, PART.surface); over(q.x + Math.ceil((w - 1) / 2) + 2, q.y - 1, MAT.FROST, 2, PART.surface); } });
      if (M.stem.collars) [...sk.leafSockets.filter((s, k) => k % 2 === 0), { x: sk.apex.x, y: sk.apex.y - 2 }].forEach(s => { for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2; over(s.x + Math.cos(a) * 2.6 * u, s.y + Math.sin(a) * 2 * u, MAT.FROST, k % 2 ? 1 : 2, PART.surface); } });
    }
    if (M.surface.wax >= 3) leafOverlays.forEach(L => over(L.tip.x + L.dir.x * 1.5, L.tip.y + L.dir.y * 1.5, MAT.WAX, 3, PART.surface));
    return { b, sk };
  }

  // ================================================================ the specimen box environment (sky, weather, soil, turf)
  function paintEnv(C, M, sk, W, H) {
    const E = C.env, env = M.env, rgba = new Uint8ClampedArray(W * H * 4), soilY = sk.soilY;
    const set = (x, y, c) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const i = (y * W + x) * 4; rgba[i] = c[0]; rgba[i + 1] = c[1]; rgba[i + 2] = c[2]; rgba[i + 3] = 255; };   // every pixel opaque (exact canvas round-trips)
    const get = (x, y) => { const i = (y * W + x) * 4; return [rgba[i], rgba[i + 1], rgba[i + 2]]; };
    const tC = clamp((env.temp - 2) / 26, 0, 1), sky2 = (k) => tC < 0.5 ? mixRgb(hex(E.sky.cold[k]), hex(E.sky.mild[k]), tC * 2) : mixRgb(hex(E.sky.mild[k]), hex(E.sky.hot[k]), (tC - 0.5) * 2);
    const top = sky2(0), bot = sky2(1), wet = clamp((env.moist - 30) / 50, 0, 1);
    const cloudy = mixRgb(top, [196, 204, 214], wet * 0.45), cloudyBot = mixRgb(bot, [214, 220, 228], wet * 0.4);
    for (let y = 0; y < soilY; y++) { const f = y / Math.max(1, soilY - 1);
      for (let x = 0; x < W; x++) { const th = BAYER[(y & 3) * 4 + (x & 3)], band = Math.floor(f * 5) / 5 + (f * 5 % 1 > th ? 0.2 : 0); set(x, y, mixRgb(cloudy, cloudyBot, clamp(band, 0, 1))); } }
    // the concept's sky furniture
    if (E.style === "journal") { for (let y = 0; y < soilY; y += 8) for (let x = 0; x < W; x++) set(x, y, mixRgb(get(x, y), [176, 160, 132], 0.25)); for (let x = 0; x < W; x += 8) for (let y = 0; y < soilY; y++) set(x, y, mixRgb(get(x, y), [176, 160, 132], 0.25)); }
    if (E.style === "alien") { for (let k = 0; k < 18; k++) { const x = R(hash(k, 31) * W), y = R(hash(k, 32) * soilY * 0.7); if (x < W && y < soilY) set(x, y, mixRgb(get(x, y), [232, 236, 255], 0.5 + hash(k, 33) * 0.5)); }
      const px = W - 16, py = 11; for (let y = -4; y <= 4; y++) for (let x = -4; x <= 4; x++) if (x * x + y * y <= 17) set(px + x, py + y, mixRgb([214, 168, 140], [150, 110, 120], (x + y + 8) / 16));
      for (let x = -8; x <= 8; x++) { const y = R(x * 0.28); if (Math.abs(x) > 3 || y > 1) set(px + x, py + y, [236, 210, 178]); } set(14, 9, [236, 236, 250]); set(15, 9, [210, 214, 236]); set(14, 10, [210, 214, 236]); }
    if (E.style === "field" || E.style === "friendly") { const hot = env.temp > 24, r = E.style === "friendly" ? 5 : 4, sx = W - 12, sy = 10, sun = hot ? [255, 214, 120] : [255, 240, 180];
      if (env.moist < 82) { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + 1) set(sx + x, sy + y, x + y < -2 ? [255, 250, 220] : sun);
        if (E.style === "friendly") for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; set(R(sx + Math.cos(a) * (r + 3)), R(sy + Math.sin(a) * (r + 3)), sun); } } }
    // weather from the (Terraform-previewed) climate: clouds and rain when wet, haze when hot and dry, snow specks when cold
    if (env.moist >= 62) for (const [cx0, cy0, w] of [[14, 12, 13], [W - 30, 18, 11]]) for (let y = -2; y <= 2; y++) for (let x = -w / 2; x <= w / 2; x++) { if (Math.abs(y) === 2 && Math.abs(x) > w / 2 - 3) continue; set(R(cx0 + x), cy0 + y, y < 0 ? [250, 252, 255] : [222, 230, 240]); }
    if (env.moist >= 78) for (let k = 0; k < 26; k++) { const x = R(hash(k, 41) * W), y = R(16 + hash(k, 42) * (soilY - 22)); set(x, y, [120, 160, 210]); set(x - 1, y + 1, [150, 186, 226]); }
    if (env.temp >= 27 && env.moist < 40) for (let k = 0; k < 3; k++) { const y = soilY - 4 - k * 4; for (let x = 0; x < W; x++) if ((x + k * 3) % 7 < 3) set(x, y + (((x >> 2) + k) & 1), mixRgb(get(x, y), [255, 246, 214], 0.55)); }
    if (env.temp <= 2) for (let k = 0; k < 22; k++) set(R(hash(k, 51) * W), R(hash(k, 52) * (soilY - 4)), [255, 255, 255]);
    // soil cutaway: moisture-coloured strata with dithered seams, pebbles; saline crust; turf along the surface
    const sd = env.moist < 30 ? "dry" : env.moist > 70 ? "wet" : "loam", sc = E.soil[sd].map(hex);
    const strata = E.style === "journal" ? 4 : 3;
    for (let y = soilY; y < H; y++) { const f = (y - soilY) / Math.max(1, H - soilY), layer = Math.min(strata - 1, Math.floor(f * strata));
      for (let x = 0; x < W; x++) { const th = BAYER[(y & 3) * 4 + (x & 3)], seam = (f * strata) % 1; let c = layer % 2 ? sc[1] : sc[0]; if (seam < 0.18 && th < 0.5 && layer > 0) c = layer % 2 ? sc[0] : sc[1]; set(x, y, c); } }
    if (E.style === "journal") for (let k = 1; k < strata; k++) { const y = soilY + R((H - soilY) * k / strata); for (let x = 0; x < W; x++) if ((x >> 1) % 3) set(x, y, mixRgb(get(x, y), [43, 33, 24], 0.55)); }
    if (E.style === "alien") for (let k = 0; k < 3; k++) { let y = soilY + 6 + k * 9; for (let x = 0; x < W; x++) { if (hash(x, k + 60) > 0.7) y += hash(x, k + 61) > 0.5 ? 1 : -1; set(x, clamp(y, soilY + 2, H - 1), [196, 150, 82]); } }
    for (let k = 0; k < 14; k++) { const x = R(hash(k, 71) * W), y = R(soilY + 4 + hash(k, 72) * (H - soilY - 6)); set(x, y, sc[2]); set(x + 1, y, sc[2]); set(x, y + 1, mixRgb(sc[2], sc[1], 0.5)); }
    if (env.soil === "saline") for (let x = 0; x < W; x++) { if (hash(x, 81) > 0.35) set(x, soilY, [244, 248, 250]); if (hash(x, 82) > 0.82) set(x, soilY + 1 + R(hash(x, 83) * 3), [236, 242, 246]); }
    const turf = hex(env.moist < 30 ? E.turfDry : E.turf);
    for (let x = 0; x < W; x++) { if (env.soil !== "saline") set(x, soilY, mixRgb(turf, sc[0], 0.25)); if (x % 5 === 1 && hash(x, 91) > 0.3) { set(x, soilY - 1, turf); if (hash(x, 92) > 0.5) set(x + 1, soilY - 2, turf); } }
    if (env.temp <= 2) for (let x = 0; x < W; x++) if (hash(x, 93) > 0.3) set(x, soilY - (x % 5 === 1 ? 2 : 0), [246, 250, 255]);
    if (env.moist >= 85) for (let x = 0; x < W; x++) if ((x >> 2) % 3 === 0) set(x, soilY, [150, 196, 230]);
    // the journal plate's ink frame with ruler ticks
    if (E.style === "journal") { const ink = [43, 33, 24]; for (let x = 0; x < W; x++) { set(x, 0, ink); set(x, H - 1, ink); if (x % 4 === 0) set(x, H - 2, ink); } for (let y = 0; y < H; y++) { set(0, y, ink); set(W - 1, y, ink); if (y % 4 === 0) set(1, y, ink); } }
    return rgba;
  }

  // ================================================================ compose + signatures
  const palCache = new WeakMap();
  function paletteRgb(C) { let p = palCache.get(C); if (!p) { p = C.palette.map(r => r ? r.map(hex) : null); palCache.set(C, p); } return p; }
  /** Plant over environment. life: thriving as authored · strained: drier, yellowed colours · unviable: a dithered ghost of the same anatomy. */
  function compose(env, b, C, life, out) {
    const P = paletteRgb(C), o = out || new Uint8ClampedArray(env), W = b.W;
    if (out) o.set(env);
    const strained = life.condition === "strained", ghost = life.condition === "unviable";
    for (let i = 0; i < b.m.length; i++) { const v = b.m[i]; if (!v) continue; const ramp = P[v >> 2]; if (!ramp) continue; let c = ramp[v & 3];
      if (strained) { const gray = (c[0] + c[1] + c[2]) / 3; c = mixRgb(mixRgb(c, [gray, gray, gray], 0.25), [176, 150, 84], 0.26); }
      if (ghost) { const x = i % W, y = (i / W) | 0; if ((v & 3) !== 0 && (x + y) % 2) continue; const gray = (c[0] + c[1] + c[2]) / 3; c = mixRgb([gray, gray, gray], [226, 232, 238], 0.5); }
      const k = i * 4; o[k] = c[0]; o[k + 1] = c[1]; o[k + 2] = c[2]; o[k + 3] = 255; }
    return o;
  }
  function bbox(b) { let x0 = b.W, y0 = b.H, x1 = -1, y1 = -1; for (let i = 0; i < b.m.length; i++) if (b.m[i] && b.part[i] !== PART.local) { const x = i % b.W, y = (i / b.W) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } return { x0, y0, x1, y1 }; }
  function partCounts(b) { const c = {}; for (let i = 0; i < b.m.length; i++) if (b.m[i]) { const n = PART_NAMES[b.part[i]]; c[n] = (c[n] || 0) + 1; } return c; }

  function render(M, C, { W = C.W, H = C.H } = {}) {
    const PV = root.BLOOM.plantVisual, { b, sk } = drawPlant(M, C, W, H, PV), env = paintEnv(C, M, sk, W, H), rgba = compose(env, b, C, M.life);
    return { W, H, rgba, env, plant: b, sk, concept: C.id, life: M.life,
      sig: { anatomy: fnv(b.m), env: fnv(env), full: fnv(rgba), key: fnv(new TextEncoder().encode(M.key)) }, bbox: bbox(b), clip: b.clip, parts: partCounts(b) };
  }
  function paint(canvas, rgba, W, H) { if (canvas.width !== W) canvas.width = W; if (canvas.height !== H) canvas.height = H; const ctx = canvas.getContext("2d"); ctx.putImageData(new ImageData(new Uint8ClampedArray(rgba), W, H), 0, 0); }

  root.BLOOM = Object.assign(root.BLOOM || {}, { plantVisual: Object.assign((root.BLOOM && root.BLOOM.plantVisual) || {}, {
    renderer: Object.freeze({ render, paint, compose, paintEnv, fnv, PART, PART_NAMES, hash }) }) });
})(typeof window !== "undefined" ? window : globalThis);
