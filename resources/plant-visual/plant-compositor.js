// BLOOM — plant COMPOSITOR (BLOOM-032B1 production sprite pipeline). docs/PLANT_SPRITE_PIPELINE_v1.md §5–§6.
//
// Stage 3: component selection (plant-components.js) + body plan (art/plant/body-plan.json) + an art pack (generated
// resources/plant-visual/generated/plant-atlas.js) → ONE organism on the ONE canonical canvas (84 × 98 logical pixels).
//
//   skeleton   the body plan's integer geometry: stem path, sockets (leaf · apex · flower · seedHead · pod · drift · stemNode · rootCrown ·
//              primaryRoot), primary root, lateral roots. sockets() is ALSO what tools/build-plant-art.mjs uses for its static clip proof.
//   placement  the skeleton chooses WHERE (a socket); the sprite owns its pixels and says, by its anchor, which of its pixels sits there.
//              Leaf sockets choose an authored ANGLE variant (low / mid / high) and a side (right, or its left twin) — never a rotation.
//   procedural only the connective tissue: stem, side branches to reproductive sockets, primary + lateral roots.
//   treatments recolours declared by the contract (pigment, wax) applied through each sprite's mask; condition "strained" = one angle step
//              of posture (authored variants) + a restrained colour shift at compose time.
//   environment a plain specimen-box backdrop (sky, soil cutaway) from the pack's environment colours — identical for every build.
//
//   const F = BLOOM.plantCompositor.render(selection, packId)   → { W, H, rgba, plant { m, owner }, placements[], sig { anatomy, full }, clip }
//   BLOOM.plantCompositor.paint(canvas, F.rgba)                 the canvas is exactly W × H; CSS scales it by a whole number, pixelated
//
// The renderer knows no trait, tier, price, rule or sprite pixel: every pixel of every part comes from the atlas. Classic script; no DOM
// except paint(); Node can require it.
(function (root) {
  "use strict";
  const R = Math.round;
  const fnv = arr => { let h = 0x811c9dc5; for (let i = 0; i < arr.length; i++) { h ^= arr[i]; h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(16).padStart(8, "0"); };
  const hash = (a, b = 0) => { let h = Math.imul((a + 1) * 0x9e3779b1 ^ (b + 7) * 0x85ebca6b, 0x27d4eb2f) >>> 0; h ^= h >>> 15; return (h >>> 0) / 4294967296; };
  const hex = h => [1, 3, 5].map(k => parseInt(h.slice(k, k + 2), 16));
  const mix = (a, b, t) => a.map((v, k) => R(v + (b[k] - v) * t));
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
  const ANGLES = ["low", "mid", "high"];
  const art = () => root.BLOOM && root.BLOOM.plantArt;

  // ================================================================ skeleton (integer geometry from the body plan)
  function stemOf(L, crown) {
    const H = L.stem.height, bend = L.stem.bend, [cx, soilY] = crown;
    const xAt = k => { const t = k / H, f = t * (bend.length - 1), i = Math.min(bend.length - 2, Math.floor(f)); return cx + R(bend[i] + (bend[i + 1] - bend[i]) * (f - i)); };
    const wAt = k => R(L.stem.width[0] + (L.stem.width[1] - L.stem.width[0]) * k / H);
    const path = []; for (let k = 0; k <= H; k++) { const w = wAt(k); path.push({ x: xAt(k), y: soilY - k, w, l: Math.floor((w - 1) / 2), r: Math.ceil((w - 1) / 2) }); }
    const at = t => path[R(t * H)];
    return { H, path, at };
  }
  /** Every socket of every layout (+ the root sockets), with the room to the canvas edges — the art contract's size budget. */
  function sockets(B, canvas) {
    const out = [];
    for (const [lid, L] of Object.entries(B.layouts)) {
      const S = stemOf(L, B.crown), apex = S.path[S.H];
      L.leaves.forEach((s, i) => { const p = S.at(s.t); out.push({ layout: lid, socket: `leaf.${i}`, attach: "leafSocket", x: s.side < 0 ? p.x - p.l - 1 : p.x + p.r + 1, y: p.y, side: s.side, angle: s.angle }); });
      out.push({ layout: lid, socket: "apex", attach: "apex", x: apex.x, y: apex.y - 1, side: 0 });
      const br = b => { const p = S.at(b.t); return { x: p.x + b.dx, y: p.y + b.dy, side: b.side }; };
      out.push({ layout: lid, socket: "flower.0", attach: "flower", x: apex.x, y: apex.y - 1, side: 0 }, { layout: lid, socket: "flower.1", attach: "flower", ...br(L.flowerBranch) });
      out.push({ layout: lid, socket: "seedHead.0", attach: "seedHead", x: apex.x, y: apex.y - 1, side: 0 });
      L.headBranches.forEach((b, i) => out.push({ layout: lid, socket: `seedHead.${i + 1}`, attach: "seedHead", ...br(b) }));
      L.podBranches.forEach((b, i) => out.push({ layout: lid, socket: `pod.${i}`, attach: "pod", ...br(b) }));
      L.drift.forEach(([dx, dy], i) => out.push({ layout: lid, socket: `drift.${i}`, attach: "drift", x: apex.x + dx, y: apex.y + dy, side: 0 }));
      L.collars.forEach((t, i) => { const p = S.at(t); out.push({ layout: lid, socket: `stemNode.${i}`, attach: "stemNode", x: p.x, y: p.y, side: 0 }); });
    }
    out.push({ layout: "*", socket: "rootCrown", attach: "rootCrown", x: B.crown[0], y: B.crown[1], side: 0 });
    out.push({ layout: "*", socket: "primaryRoot", attach: "primaryRoot", x: B.crown[0], y: B.crown[1] + B.roots.storageSocket, side: 0 });
    for (const s of out) s.room = { left: s.x, right: canvas.w - 1 - s.x, up: s.y, down: canvas.h - 1 - s.y };
    return out;
  }
  function skeleton(B, layoutId, taproot) {
    const L = B.layouts[layoutId], S = stemOf(L, B.crown), [cx, soilY] = B.crown, Rt = B.roots;
    const so = {}; for (const s of sockets({ ...B, layouts: { [layoutId]: L } }, { w: 1e6, h: 1e6 })) so[s.socket] = s;
    const D = Rt.depth[taproot], wv = Rt.wiggle, [w0, w1] = Rt.width[taproot], primary = [];
    for (let j = 0; j <= D; j++) { const f = j / D * (wv.length - 1), i = Math.min(wv.length - 2, Math.floor(f)); primary.push({ x: cx + R(wv[i] + (wv[i + 1] - wv[i]) * (f - i)), y: soilY + j, w: Math.max(1, R(w0 + (w1 - w0) * j / D)) }); }
    const laterals = Rt.laterals.map(l => { const p = primary[R(l.f * D)]; return { from: { x: p.x, y: p.y }, mid: { x: p.x + l.side * R(l.len * 0.6), y: p.y + 1 }, to: { x: p.x + l.side * l.len, y: p.y + l.drop } }; });
    return { layout: layoutId, L, stem: S, sockets: so, primary, laterals };
  }

  // ================================================================ the indexed buffer
  function Buf(W, H) { return { W, H, m: new Uint8Array(W * H), owner: new Uint16Array(W * H), clip: 0 }; }
  function put(b, x, y, v, owner) { if (x < 0 || y < 0 || x >= b.W || y >= b.H) { b.clip++; return; } const i = y * b.W + x; b.m[i] = v; b.owner[i] = owner; }
  function line(pts) { const out = []; for (let k = 0; k + 1 < pts.length; k++) { const a = pts[k], c = pts[k + 1], n = Math.max(Math.abs(c.x - a.x), Math.abs(c.y - a.y), 1);
      for (let s = 0; s <= n; s++) { const q = { x: R(a.x + (c.x - a.x) * s / n), y: R(a.y + (c.y - a.y) * s / n) }, l = out[out.length - 1]; if (!l || l.x !== q.x || l.y !== q.y) out.push(q); } }
    for (let i = 1; i < out.length - 1; i++) { const a = out[i - 1], c = out[i + 1]; if (Math.abs(a.x - c.x) === 1 && Math.abs(a.y - c.y) === 1) { out.splice(i, 1); i--; } }   // no L-corners
    return out; }
  const quad = (a, c, e, n) => { const pts = []; for (let k = 0; k <= n; k++) { const t = k / n, s = 1 - t; pts.push({ x: s * s * a.x + 2 * s * t * c.x + t * t * e.x, y: s * s * a.y + 2 * s * t * c.y + t * t * e.y }); } return pts; };
  const b64 = s => { if (typeof atob === "function") { const t = atob(s), o = new Uint8Array(t.length); for (let i = 0; i < t.length; i++) o[i] = t.charCodeAt(i); return o; } return new Uint8Array(Buffer.from(s, "base64")); };
  const decoded = new Map();
  function spritePx(packId, key, sp) { const k = packId + "|" + key; let d = decoded.get(k);
    if (!d) { d = { px: b64(sp.px), masks: Object.fromEntries(Object.entries(sp.masks || {}).map(([t, v]) => [t, v === "auto" ? "auto" : b64(v)])) }; decoded.set(k, d); } return d; }

  // ================================================================ compose one organism
  function render(sel, packId, { canvas } = {}) {
    const A = art(), P = A.packs[packId]; if (!P) throw new Error(`plant art pack "${packId}" is not in the generated atlas`);
    const C = A.contract, W = (canvas || C.canvas).w, H = (canvas || C.canvas).h, B = A.bodyPlan, MAT = A.materials, MID = Object.fromEntries(MAT.map((m, i) => [m, i + 1]));
    const sk = skeleton(B, sel.layout, sel.roots.taproot), b = Buf(W, H), placements = [], ops = [];
    const treat = {}; for (const t of sel.treatments) { const T = C.treatments[t]; if (!T) continue; const map = {};
      for (const [from, to] of Object.entries(T.map)) if (P.palette[to]) map[MID[from]] = MID[to]; if (Object.keys(map).length) treat[t] = { map, procedural: T.procedural }; }
    const stemV = shade => { let m = MID.stem; for (const t of Object.values(treat)) if (t.procedural.includes("stem") && t.map[m]) m = t.map[m]; return m * 4 + shade; };
    const own = (kind, extra) => { placements.push({ kind, ...extra }); return placements.length; };

    // ---- PROCEDURAL connective tissue: roots, stem, side branches (z from the contract layers)
    const zL = n => C.layers[n] * 100;
    ops.push({ z: zL("roots"), seq: 0, draw: () => { const o = own("procedural", { component: "roots", socket: "rootCrown", anchor: { x: B.crown[0], y: B.crown[1] }, trait: null });
      for (const p of sk.primary) for (let d = 0; d < p.w; d++) put(b, p.x - Math.floor((p.w - 1) / 2) + d, p.y, MID.root * 4 + (d === 0 && p.w > 1 ? 3 : 2), o);
      for (const l of sk.laterals) line(quad(l.from, l.mid, l.to, 16)).forEach((q, k) => { if (k) put(b, q.x, q.y, MID.root * 4 + 1, o); }); } });
    ops.push({ z: zL("stem"), seq: 0, draw: () => { const o = own("procedural", { component: "stem", socket: "rootCrown", anchor: { x: B.crown[0], y: B.crown[1] }, trait: null });
      const outl = (P.render && P.render.stemOutline) || "self";
      for (const p of sk.stem.path) { const x0 = p.x - p.l;
        for (let d = 0; d < p.w; d++) put(b, x0 + d, p.y, stemV(p.w === 1 ? 2 : d === 0 ? 3 : d === p.w - 1 ? 1 : 2), o);
        if (outl !== "none") for (const x of [x0 - 1, x0 + p.w]) { const i = p.y * W + x; if (x >= 0 && x < W && !b.m[i]) put(b, x, p.y, outl === "ink" ? MID.ink * 4 : stemV(0), o); } } } });
    const branchTo = (fromT, s, socket) => ops.push({ z: zL("branch"), seq: ops.length, draw: () => { const o = own("procedural", { component: "branch", socket, anchor: { x: s.x, y: s.y }, trait: null }), p = sk.stem.at(fromT);
      line([{ x: p.x, y: p.y }, { x: R((p.x + s.x) / 2), y: R((p.y + s.y) / 2) + 1 }, { x: s.x, y: s.y }]).forEach(q => put(b, q.x, q.y, stemV(1), o)); } });

    // ---- AUTHORED sprites at sockets
    const keyFor = (component, angle, side) => { const c = C.components[component];
      if (c.orientation !== "right") return `${component}@${c.orientation}`;
      return `${component}.${angle}@${side < 0 ? "left" : "right"}`; };
    function place(component, at, { angle = null, side = 1, socket, z, trait = null } = {}) {
      const key = keyFor(component, angle, side), sp = P.sprites[key]; if (!sp) throw new Error(`pack ${packId} has no sprite ${key}`);
      const x0 = at.x - sp.ax, y0 = at.y - sp.ay, rec = { kind: "sprite", component, key, socket, x0, y0, w: sp.w, h: sp.h, anchor: { x: at.x, y: at.y }, trait: trait || sp.trait, category: sp.category, sp };
      ops.push({ z: z !== undefined ? z : sp.z, seq: ops.length, draw: () => { const o = own("sprite", rec), d = spritePx(packId, key, sp);
        for (let y = 0; y < sp.h; y++) for (let x = 0; x < sp.w; x++) { const i = y * sp.w + x; let v = d.px[i]; if (!v) continue;
          for (const [t, T] of Object.entries(treat)) { const mk = d.masks[t], m = v >> 2; if (!mk || !T.map[m]) continue; if (mk === "auto" || mk[i]) v = T.map[m] * 4 + (v & 3); }
          put(b, x0 + x, y0 + y, v, o); } } });
      return rec;
    }
    const so = sk.sockets, L = sk.L;
    // leaves (bottom → top), on the body plan's sockets for this leaf set; posture steps the AUTHORED angle variant
    const leafIdx = sel.leafSockets === "succulent" ? L.succulentLeaves : L.leaves.map((_, i) => i), comp = C.components[sel.leafSet];
    const leaves = leafIdx.map((i, n) => { const s = so[`leaf.${i}`]; let a = ANGLES.indexOf(s.angle) + sel.posture; a = Math.max(0, Math.min(2, a));
      let angle = ANGLES[a]; if (!comp.angles.includes(angle)) angle = comp.angles.reduce((best, x) => Math.abs(ANGLES.indexOf(x) - a) < Math.abs(ANGLES.indexOf(best) - a) ? x : best);
      return place(sel.leafSet, s, { angle, side: s.side, socket: `leaf.${i}`, z: zL("leaves") + n }); });
    // surface: frost tufts ride on the points each LEAF SPRITE declares; collars on stem nodes
    if (sel.frost.tufts) leaves.forEach(lf => { const pts = [lf.sp.points.tip, ...(sel.frost.tufts === "tip+margin" ? lf.sp.points.margin : [])].filter(Boolean);
      pts.forEach(p => place("frost.tuft", { x: lf.x0 + p[0], y: lf.y0 + p[1] - 1 }, { socket: lf.socket + ":margin" })); });
    if (sel.frost.collars) L.collars.forEach((_, i) => place("frost.collar", so[`stemNode.${i}`], { socket: `stemNode.${i}` }));
    if (sel.roots.storage) place("root.storage", so.primaryRoot, { socket: "primaryRoot" });
    // reproductive: apex, flower, side heads (+ their procedural branches), drifting seeds
    place(sel.apex, so.apex, { socket: "apex" });
    if (sel.flower === "flower.1") { branchTo(L.flowerBranch.t, so["flower.1"], "flower.1"); place("flower", so["flower.1"], { socket: "flower.1" }); }
    for (let k = 1; k <= sel.sideHeads; k++) { branchTo(L.headBranches[k - 1].t, so[`seedHead.${k}`], `seedHead.${k}`); place("seedHead.small", so[`seedHead.${k}`], { socket: `seedHead.${k}` }); }
    for (let k = 0; k < sel.drift; k++) place("seed.drift", so[`drift.${k}`], { socket: `drift.${k}` });

    ops.sort((a, c) => a.z - c.z || a.seq - c.seq).forEach(op => op.draw());

    // ---- environment + compose
    const env = paintEnv(P, B, W, H), rgba = new Uint8ClampedArray(env), ramps = MAT.map(m => P.palette[m] ? P.palette[m].map(hex) : null);
    const stressed = new Set(["leaf", "core", "pigLeaf", "waxLeaf"].map(m => MID[m]));
    for (let i = 0; i < b.m.length; i++) { const v = b.m[i]; if (!v) continue; const ramp = ramps[(v >> 2) - 1]; if (!ramp) continue; let c = ramp[Math.min(ramp.length - 1, v & 3)];
      if (sel.stress && stressed.has(v >> 2)) c = mix(c, [176, 150, 84], 0.3);
      rgba[i * 4] = c[0]; rgba[i * 4 + 1] = c[1]; rgba[i * 4 + 2] = c[2]; rgba[i * 4 + 3] = 255; }
    let x0 = W, y0 = H, x1 = -1, y1 = -1; for (let i = 0; i < b.m.length; i++) if (b.m[i]) { const x = i % W, y = (i / W) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    return { W, H, pack: packId, rgba, env, plant: b, placements, skeleton: sk, clip: b.clip, bbox: { x0, y0, x1, y1 },
      unrendered: sel.treatments.filter(t => !treat[t]), sig: { anatomy: fnv(b.m), full: fnv(rgba), key: sel.key } };
  }

  // ================================================================ the specimen-box backdrop (identical for every build of a pack)
  function paintEnv(P, B, W, H) {
    const E = P.environment, soilY = B.crown[1], o = new Uint8ClampedArray(W * H * 4), sky = E.sky.map(hex), soil = E.soil.map(hex), turf = hex(E.turf);
    const set = (x, y, c) => { const i = (y * W + x) * 4; o[i] = c[0]; o[i + 1] = c[1]; o[i + 2] = c[2]; o[i + 3] = 255; };
    for (let y = 0; y < soilY; y++) { const f = y / (soilY - 1); for (let x = 0; x < W; x++) { const band = Math.floor(f * 4) / 4 + ((f * 4) % 1 > BAYER[(y & 3) * 4 + (x & 3)] ? 0.25 : 0); set(x, y, mix(sky[0], sky[1], Math.min(1, band))); } }
    for (let y = soilY; y < H; y++) { const f = (y - soilY) / (H - soilY), layer = Math.min(2, Math.floor(f * 3)), seam = (f * 3) % 1;
      for (let x = 0; x < W; x++) { let c = layer % 2 ? soil[1] : soil[0]; if (layer && seam < 0.15 && BAYER[(y & 3) * 4 + (x & 3)] < 0.5) c = layer % 2 ? soil[0] : soil[1]; set(x, y, c); } }
    for (let k = 0; k < 12; k++) { const x = R(2 + hash(k, 7) * (W - 5)), y = R(soilY + 4 + hash(k, 8) * (H - soilY - 6)); set(x, y, soil[2]); set(x + 1, y, soil[2]); }
    for (let x = 0; x < W; x++) { set(x, soilY, mix(turf, soil[0], 0.35)); if (x % 4 === 1 && hash(x, 9) > 0.3) set(x, soilY - 1, turf); }
    return o;
  }

  function paint(canvas, rgba, W, H) {
    W = W || canvas.width; H = H || canvas.height; if (canvas.width !== W) canvas.width = W; if (canvas.height !== H) canvas.height = H;
    canvas.getContext("2d").putImageData(new ImageData(new Uint8ClampedArray(rgba), W, H), 0, 0);
  }

  root.BLOOM = Object.assign(root.BLOOM || {}, { plantCompositor: Object.freeze({ sockets, skeleton, render, paintEnv, paint, fnv, ANGLES }) });
})(typeof window !== "undefined" ? window : globalThis);
