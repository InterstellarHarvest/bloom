// BLOOM — plant COMPOSITOR (BLOOM-032B1 production sprite pipeline; BLOOM-035B-5 body plans). docs/PLANT_SPRITE_PIPELINE_v1.md §5–§6,
// docs/SPECIES_BODY_PLANS_v1.md §2.
//
// Stage 3: component selection (a body plan's GRAMMAR, resources/plant-visual/grammars/<plan>.js) + the BODY PLAN the art pack declares
// (art/plant/body-plans/<plan>.json → generated resources/plant-visual/generated/plant-atlas.js) + the art pack → ONE organism on the ONE
// canonical canvas (84 × 98 logical pixels for every plan in v1).
//
//   plan       render(selection, packId) reads the plan THROUGH THE PACK (pack.bodyPlan "<plan>@<version>"; a pack without one is a
//              pre-035B Organic Hybrid pack = "oh-stem@1"). A selection made by another plan's grammar is refused (throws).
//   skeleton   "stem@2" (Organic Hybrid, oh-stem): the accepted body-plan@2 geometry (art/plant/body-plan.json), drawn by the accepted
//              BLOOM-032B code path below, unchanged. "axes" (body-plan@3): an architecture is ONE OR MORE axes, each a procedural
//              `stem`, a `rosette` (radial leaf sockets around an optional procedural caudex) or a `sprite` body (an authored body sprite);
//              axes may grow from another axis's socket. sockets() is ALSO what tools/build-plant-art.mjs uses for its static clip
//              proof and the artist size budget. Leaf TIP / MARGIN points are not sockets: each leaf sprite declares them.
//   placement  the skeleton chooses WHERE (a socket); the sprite owns its pixels and says, by its anchor, which of its pixels sits there.
//              Leaf sockets choose an authored ANGLE variant (the plan's angle steps) and a side (right, or its left twin) — never a rotation.
//   procedural only the connective tissue: stems / caudices, stalks to reproductive sockets, primary + lateral roots (or a rhizome).
//   angles     the selection's angle { shift, cap } steps each socket's authored angle variant (heat lifts, strain droops) — never a rotation.
//   treatments contract treatments through each sprite's masks: "recolour" (pigment, wax — optional per-level shade filter) or "clear"
//              (toothed: authored notches); condition "strained" = a restrained colour shift at compose time.
//   environment a plain specimen-box backdrop (sky, soil cutaway; a shallow water band on waterlogged ground) from the pack's environment
//              colours — identical for every build of a pack.
//
//   const F = BLOOM.plantCompositor.render(selection, packId)   → { W, H, rgba, plant { m, owner }, placements[], sig { anatomy, full }, clip, plan }
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
  const ANGLES = ["low", "mid", "high"];   // the Organic Hybrid (oh-stem) angle steps; a body plan @3 declares its own (plan.angles)
  const LEGACY_PLAN = "oh-stem@1";          // a pack without a bodyPlan declaration is a pre-035B Organic Hybrid pack
  const art = () => root.BLOOM && root.BLOOM.plantArt;

  // ================================================================ body plans (resolved through the pack)
  /** "<plan>@<version>" a pack declares. */
  function planRefOf(packId) { const A = art(), P = A && A.packs[packId]; if (!P) throw new Error(`plant art pack "${packId}" is not in the generated atlas`); return P.bodyPlan || LEGACY_PLAN; }
  /** The runtime body plan of a pack (throws on an unknown plan or version — never a silent fallback). */
  function planOf(packId) {
    const A = art(), ref = planRefOf(packId), id = ref.split("@")[0], Pl = A.bodyPlans && A.bodyPlans[id];
    if (!Pl) throw new Error(`plant art pack "${packId}" declares body plan "${ref}", which is not in the generated atlas`);
    if (`${Pl.id}@${Pl.version}` !== ref) throw new Error(`plant art pack "${packId}" declares body plan "${ref}", the atlas has "${Pl.id}@${Pl.version}"`);
    return Pl;
  }
  const contractOf = Pl => { const A = art(), C = A.contracts && A.contracts[Pl.id]; if (!C) throw new Error(`body plan "${Pl.id}" has no contract in the generated atlas`); return C; };

  // ================================================================ skeleton (integer geometry from the body plan)
  function stemOf(L, crown) {
    const H = L.stem.height, bend = L.stem.bend, [cx, soilY] = crown;
    const xAt = k => { const t = k / H, f = t * (bend.length - 1), i = Math.min(bend.length - 2, Math.floor(f)); return cx + R(bend[i] + (bend[i + 1] - bend[i]) * (f - i)); };
    const wAt = k => R(L.stem.width[0] + (L.stem.width[1] - L.stem.width[0]) * k / H);
    const path = []; for (let k = 0; k <= H; k++) { const w = wAt(k); path.push({ x: xAt(k), y: soilY - k, w, l: Math.floor((w - 1) / 2), r: Math.ceil((w - 1) / 2) }); }
    const at = t => path[R(t * H)];
    return { H, path, at };
  }
  const edge = (p, side) => side < 0 ? p.x - p.l - 1 : p.x + p.r + 1;
  /** Every socket of every layout (+ the shared root sockets), with the room to the canvas edges — the art contract's size budget.
   *  B = the accepted body-plan@2 geometry (Organic Hybrid), or a body plan @3 (every architecture's axes). */
  function sockets(B, canvas) {
    if (B && B.architectures) return planSockets(B, canvas);   // a body plan @3 (its manifest, or its runtime entry)
    if (B && B.stem2) return sockets(B.stem2, canvas);        // the runtime entry of the oh-stem plan: its body-plan@2 geometry
    const out = [], [cx, soilY] = B.crown;
    for (const [lid, L] of Object.entries(B.layouts)) {
      const S = stemOf(L, B.crown), apex = S.path[S.H], push = o => out.push({ layout: lid, side: 0, ...o });
      L.leaves.forEach((s, i) => { const p = S.at(s.t); push({ socket: `leaf.${i}`, attach: "leafSocket", x: edge(p, s.side), y: p.y, side: s.side, angle: s.angle }); });
      L.leaves.forEach((s, i) => { const p = S.at(s.t); push({ socket: `stemNode.${i}`, attach: "stemNode", x: p.x, y: p.y }); });
      L.collars.forEach((t, i) => { const p = S.at(t); push({ socket: `collar.${i}`, attach: "stemNode", x: p.x, y: p.y }); });
      L.axils.forEach((a, i) => { const p = S.at(a.t); push({ socket: `axil.${i}`, attach: "axil", x: edge(p, a.side), y: p.y, side: a.side }); });
      push({ socket: "apex", attach: "apex", x: apex.x, y: apex.y - 1 });
      const br = b => { const p = S.at(b.t); return { x: p.x + b.dx, y: p.y + b.dy, side: b.side }; };
      push({ socket: "flower.0", attach: "flower", x: apex.x, y: apex.y - 1 }); push({ socket: "flower.1", attach: "flower", ...br(L.flowerBranch) });
      push({ socket: "seedHead.0", attach: "seedHead", x: apex.x, y: apex.y - 1 });
      L.headBranches.forEach((b, i) => push({ socket: `seedHead.${i + 1}`, attach: "seedHead", ...br(b) }));
      L.podBranches.forEach((b, i) => push({ socket: `pod.${i}`, attach: "pod", ...br(b) }));
      L.drift.forEach(([dx, dy], i) => push({ socket: `drift.${i}`, attach: "drift", x: apex.x + dx, y: apex.y + dy }));
      L.stilts.forEach((st, i) => { const p = S.path[st.dy]; push({ socket: `stilt.${i}`, attach: "stiltRoot", x: edge(p, st.side), y: p.y, side: st.side }); });
    }
    out.push({ layout: "*", socket: "rootCrown", attach: "rootCrown", x: cx, y: soilY, side: 0 });
    out.push({ layout: "*", socket: "primaryRoot", attach: "primaryRoot", x: cx, y: soilY + B.roots.storageSocket, side: 0 });
    B.roots.aerial.dx.forEach((dx, i) => out.push({ layout: "*", socket: `aerial.${i}`, attach: "aerialRoot", x: cx + dx, y: soilY + B.roots.aerial.dy, side: dx < 0 ? -1 : 1 }));
    for (const s of out) s.room = { left: s.x, right: canvas.w - 1 - s.x, up: s.y, down: canvas.h - 1 - s.y };
    return out;
  }
  /** The procedural primary + lateral roots of a taproot (body-plan@2 roots, or a @3 plan's roots of kind "taproot"). */
  function taprootOf(Rt, crown, taproot) {
    const [cx, soilY] = crown, D = Rt.depth[taproot], wv = Rt.wiggle, [w0, w1] = Rt.width[taproot], primary = [];
    for (let j = 0; j <= D; j++) { const f = j / D * (wv.length - 1), i = Math.min(wv.length - 2, Math.floor(f)); primary.push({ x: cx + R(wv[i] + (wv[i + 1] - wv[i]) * (f - i)), y: soilY + j, w: Math.max(1, R(w0 + (w1 - w0) * j / D)) }); }
    const laterals = Rt.laterals.map(l => { const p = primary[R(l.f * D)]; return { from: { x: p.x, y: p.y }, mid: { x: p.x + l.side * R(l.len * 0.6), y: p.y + 1 }, to: { x: p.x + l.side * l.len, y: p.y + l.drop } }; });
    return { primary, laterals };
  }
  function skeleton(B, layoutId, taproot) {
    const L = B.layouts[layoutId], S = stemOf(L, B.crown);
    const so = {}; for (const s of sockets({ ...B, layouts: { [layoutId]: L } }, { w: 1e6, h: 1e6 })) so[s.socket] = s;   // this layout's sockets + the shared root sockets
    const { primary, laterals } = taprootOf(B.roots, B.crown, taproot);
    return { layout: layoutId, L, stem: S, sockets: so, primary, laterals };
  }

  // ---------------------------------------------------------------- body plan @3: axes
  // socket groups → attach kinds (a plan's contract components attach to these). Leaves: "radialLeaf" on a rosette, "leafSocket" on a stem.
  const GROUP_ATTACH = { collar: "stemNode", axil: "axil", stilt: "stiltRoot", pod: "pod", drift: "drift", flower: "flower", seedHead: "seedHead" };
  const PART_OF_GROUP = { pod: "pods", flower: "flowers", seedHead: "seedHead" };
  /** One architecture of a body plan @3 → its axes (geometry) and every socket { id, axis, attach, x, y, side, angle?, from? }. */
  function axesOf(Pl, archId) {
    const arch = Pl.architectures[archId]; if (!arch) throw new Error(`body plan "${Pl.id}" has no architecture "${archId}"`);
    const [cx, soilY] = Pl.crown, so = {}, list = [], axes = {};
    const push = s => { if (so[s.id]) throw new Error(`body plan "${Pl.id}" / ${archId}: socket ${s.id} declared twice`); so[s.id] = s; list.push(s); return s; };
    const pt = ref => { if (!ref || ref === "crown") return { x: cx, y: soilY }; const s = so[ref]; if (!s) throw new Error(`body plan "${Pl.id}" / ${archId}: axis origin "${ref}" is not a socket of an earlier axis`); return { x: s.x, y: s.y }; };
    for (const ax of arch.axes) {
      const o0 = pt(ax.from), o = { x: o0.x + (ax.at ? ax.at[0] : 0), y: o0.y + (ax.at ? ax.at[1] : 0) }, id = ax.id, g = ax.sockets || {};
      const geo = axes[id] = { id, kind: ax.kind, origin: o, part: ax.part || "stem", path: null, stem: null, body: ax.body || null };
      const S_ = (sid, attach, x, y, extra) => push({ id: `${id}.${sid}`, axis: id, attach, x, y, side: 0, ...extra });
      let top = o;
      if (ax.kind === "stem" || (ax.kind === "rosette" && ax.caudex)) {
        const st = ax.kind === "stem" ? { height: ax.height, width: ax.width, bend: ax.bend || [0, 0] } : { height: ax.caudex.height, width: ax.caudex.width, bend: [0, 0] };
        geo.stem = stemOf({ stem: st }, [o.x, o.y]); geo.path = geo.stem.path; top = geo.path[geo.stem.H];
      } else if (ax.kind === "sprite") { S_("body", "body", o.x, o.y); top = { x: o.x + ax.top[0], y: o.y + ax.top[1] }; S_("top", null, top.x, top.y); }
      else if (ax.kind !== "rosette") throw new Error(`body plan "${Pl.id}": axis ${id} has unknown kind "${ax.kind}"`);
      const apex = { x: top.x, y: top.y - 1 }, at = t => geo.stem.at(t);
      if (ax.kind !== "sprite") { S_("apex", "apex", apex.x, apex.y); S_("flower.0", "flower", apex.x, apex.y); S_("seedHead.0", "seedHead", apex.x, apex.y); }
      (g.leaf || []).forEach((s, i) => {
        if (ax.kind === "rosette") { const r = s.a * Math.PI / 180, side = s.a < 0 ? -1 : s.a > 0 ? 1 : (s.side || 1);
          S_(`leaf.${i}`, "radialLeaf", o.x + R(s.r * Math.sin(r)), o.y + R(s.r * Math.cos(r) * 0.5) + (s.dy || 0), { side, angle: s.angle }); }
        else { const p = at(s.t); S_(`leaf.${i}`, "leafSocket", edge(p, s.side), p.y, { side: s.side, angle: s.angle }); } });
      (g.collar || []).forEach((s, i) => { const p = s.t !== undefined ? at(s.t) : { x: o.x + s.dx, y: o.y + s.dy }; S_(`collar.${i}`, "stemNode", p.x, p.y); });
      (g.axil || []).forEach((s, i) => { const p = at(s.t); S_(`axil.${i}`, "axil", edge(p, s.side), p.y, { side: s.side }); });
      for (const grp of ["flower", "seedHead", "pod"]) (g[grp] || []).forEach((b, i) => { const p = at(b.t);
        S_(`${grp}.${grp === "pod" ? i : i + 1}`, GROUP_ATTACH[grp], p.x + b.dx, p.y + b.dy, { side: b.side, from: { x: p.x, y: p.y }, part: PART_OF_GROUP[grp] }); });
      (g.drift || []).forEach(([dx, dy], i) => S_(`drift.${i}`, "drift", top.x + dx, top.y + dy));   // relative to the axis top pixel, as body-plan@2
      (g.stilt || []).forEach((s, i) => { if (ax.kind === "sprite") S_(`stilt.${i}`, "stiltRoot", o.x + s.dx, o.y + s.dy, { side: s.side });
        else { const p = geo.path[s.dy]; S_(`stilt.${i}`, "stiltRoot", edge(p, s.side), p.y, { side: s.side }); } });
    }
    // shared root sockets (every architecture)
    const Rt = Pl.roots, rootSock = (id, attach, x, y, side = 0) => push({ id, axis: null, attach, x, y, side });
    rootSock("rootCrown", "rootCrown", cx, soilY);
    rootSock("primaryRoot", "primaryRoot", cx + (Rt.storage.dx || 0), soilY + Rt.storage.dy);
    Rt.aerial.dx.forEach((dx, i) => rootSock(`aerial.${i}`, "aerialRoot", cx + dx, soilY + Rt.aerial.dy, dx < 0 ? -1 : 1));
    return { arch, axes, sockets: so, list };
  }
  /** Every socket of every architecture of a body plan @3 (+ the shared root sockets once) — the plan's static clip proof / size budget. */
  function planSockets(Pl, canvas) {
    const out = [];
    for (const archId of Object.keys(Pl.architectures)) for (const s of axesOf(Pl, archId).list) {
      if (!s.attach || (!s.axis && archId !== Object.keys(Pl.architectures)[0])) continue;
      out.push({ layout: s.axis ? archId : "*", socket: s.id, attach: s.attach, x: s.x, y: s.y, side: s.side || 0, ...(s.angle ? { angle: s.angle } : {}) });
    }
    for (const s of out) s.room = { left: s.x, right: canvas.w - 1 - s.x, up: s.y, down: canvas.h - 1 - s.y };
    return out;
  }
  /** Roots of a body plan @3: a "taproot" (as body-plan@2) or a horizontal "rhizome" with hanging rootlets. */
  function rootsOf(Pl, taproot) {
    const Rt = Pl.roots, [cx, soilY] = Pl.crown;
    if ((Rt.kind || "taproot") === "taproot") return { kind: "taproot", ...taprootOf(Rt, Pl.crown, taproot) };
    const y = soilY + Rt.depth[taproot], w = Rt.width[taproot], [x0, x1] = Rt.span, wv = Rt.wiggle || [0, 0], primary = [];
    for (let x = cx + x0; x <= cx + x1; x++) { const f = (x - cx - x0) / (x1 - x0) * (wv.length - 1), i = Math.min(wv.length - 2, Math.floor(f)); primary.push({ x, y: y + R(wv[i] + (wv[i + 1] - wv[i]) * (f - i)), w }); }
    const laterals = Rt.rootlets.map(l => { const p = primary[R(l.f * (primary.length - 1))], from = { x: p.x, y: p.y + w - 1 }; return { from, mid: { x: p.x + R(l.dx * 0.5), y: from.y + R(l.len * 0.6) }, to: { x: p.x + l.dx, y: from.y + l.len } }; });
    return { kind: "rhizome", primary, laterals, y };
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
  /** Draws the selection with the pack's own body plan. A selection carries `plan` (body plan @3 grammars); the Organic Hybrid grammar's
   *  selection (no `plan`) is the oh-stem plan's. A selection for another plan than the pack's is refused. */
  function render(sel, packId, opts) {
    const A = art(); if (!A.packs[packId]) throw new Error(`plant art pack "${packId}" is not in the generated atlas`);
    const Pl = planOf(packId), selPlan = sel.plan || LEGACY_PLAN.split("@")[0];
    if (selPlan !== Pl.id) throw new Error(`plant selection is for body plan "${selPlan}", pack "${packId}" is body plan "${Pl.id}"`);
    const F = Pl.skeleton === "stem@2" ? renderStem2(sel, packId, opts) : renderAxes(sel, packId, Pl, opts);
    F.plan = Pl.id; return F;
  }
  function treatmentsOf(sel, C, P, MID) {
    const treat = [];
    for (const { id, level } of sel.treatments) { const T = C.treatments[id]; if (!T) continue;
      if (T.kind === "clear") { treat.push({ id, clear: true }); continue; }
      const map = {}; for (const [from, to] of Object.entries(T.map)) if (P.palette[to]) map[MID[from]] = MID[to];
      if (!Object.keys(map).length) continue;
      const lv = T.levels ? T.levels[String(Math.min(level, Math.max(...Object.keys(T.levels).map(Number))))] : null;
      treat.push({ id, map, shades: lv ? new Set(lv) : null, procedural: T.procedural }); }
    return treat;
  }
  /** The organism buffer + the pack's backdrop → the frame. */
  function compose(packId, P, sel, b, W, H, MAT, MID, treat, placements, sk, envOf) {
    const env = envOf(), rgba = new Uint8ClampedArray(env), ramps = MAT.map(m => P.palette[m] ? P.palette[m].map(hex) : null);
    const stressed = new Set(["leaf", "core", "pigLeaf", "waxLeaf"].map(m => MID[m]));
    for (let i = 0; i < b.m.length; i++) { const v = b.m[i]; if (!v) continue; const ramp = ramps[(v >> 2) - 1]; if (!ramp) continue; let c = ramp[Math.min(ramp.length - 1, v & 3)];
      if (sel.stress && stressed.has(v >> 2)) c = mix(c, [176, 150, 84], 0.3);
      rgba[i * 4] = c[0]; rgba[i * 4 + 1] = c[1]; rgba[i * 4 + 2] = c[2]; rgba[i * 4 + 3] = 255; }
    let x0 = W, y0 = H, x1 = -1, y1 = -1; for (let i = 0; i < b.m.length; i++) if (b.m[i]) { const x = i % W, y = (i / W) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    return { W, H, pack: packId, rgba, env, plant: b, placements, skeleton: sk, clip: b.clip, bbox: { x0, y0, x1, y1 },
      unrendered: sel.treatments.filter(t => !treat.some(T => T.id === t.id)).map(t => t.id), sig: { anatomy: fnv(b.m), full: fnv(rgba), key: sel.key } };
  }

  // ---------------------------------------------------------------- skeleton "stem@2": the accepted Organic Hybrid organism (BLOOM-032B)
  function renderStem2(sel, packId, { canvas } = {}) {
    const A = art(), P = A.packs[packId];
    const C = A.contract, W = (canvas || C.canvas).w, H = (canvas || C.canvas).h, B = A.bodyPlan, MAT = A.materials, MID = Object.fromEntries(MAT.map((m, i) => [m, i + 1]));
    const sk = skeleton(B, sel.layout, sel.roots.taproot), b = Buf(W, H), placements = [], ops = [];
    // treatments: contract-declared recolours (optionally limited to some shades at a level) and clears (authored notches)
    const treat = treatmentsOf(sel, C, P, MID);
    const recolour = (v, d, i) => { for (const T of treat) { if (T.clear) continue; const mk = d ? d.masks[T.id] : "auto", m = v >> 2;
        if (!mk || !T.map[m] || (T.shades && !T.shades.has(v & 3))) continue; if (mk === "auto" || mk[i]) v = T.map[m] * 4 + (v & 3); } return v; };
    const stemV = shade => { let v = MID.stem * 4 + shade; for (const T of treat) if (!T.clear && T.procedural.includes("stem") && T.map[v >> 2] && (!T.shades || T.shades.has(shade))) v = T.map[v >> 2] * 4 + shade; return v; };
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
      return `${c.angles ? component + "." + angle : component}@${side < 0 ? "left" : "right"}`; };
    function place(component, at, { angle = null, side = 1, socket, z } = {}) {
      const key = keyFor(component, angle, side), sp = P.sprites[key]; if (!sp) throw new Error(`pack ${packId} has no sprite ${key}`);
      const x0 = at.x - sp.ax, y0 = at.y - sp.ay, rec = { kind: "sprite", component, key, socket, x0, y0, w: sp.w, h: sp.h, anchor: { x: at.x, y: at.y }, trait: sp.trait, category: sp.category, family: sp.family, sp };
      ops.push({ z: z !== undefined ? z : sp.z, seq: ops.length, draw: () => { const o = own("sprite", rec), d = spritePx(packId, key, sp);
        for (let y = 0; y < sp.h; y++) for (let x = 0; x < sp.w; x++) { const i = y * sp.w + x; let v = d.px[i]; if (!v) continue;
          if (treat.some(T => T.clear && d.masks[T.id] && d.masks[T.id] !== "auto" && d.masks[T.id][i])) continue;   // authored notch
          put(b, x0 + x, y0 + y, recolour(v, d, i), o); } } });
      return rec;
    }
    const so = sk.sockets, L = sk.L;
    // leaves (bottom → top) on the body plan's leaf set for this structure; the angle step picks another AUTHORED variant
    const leafIdx = B.leafSets[sel.leaf.set] || L.leaves.map((_, i) => i), comp = C.components[sel.leaf.component], ang = sel.leaf.angle, capI = ANGLES.indexOf(ang.cap);
    const leaves = leafIdx.map((i, n) => { const s = so[`leaf.${i}`], a0 = ANGLES.indexOf(s.angle);
      let a = ang.shift > 0 ? Math.min(a0 + ang.shift, Math.max(a0, capI)) : Math.max(0, a0 + ang.shift);
      let angle = ANGLES[a]; if (!comp.angles.includes(angle)) angle = comp.angles.reduce((best, x) => Math.abs(ANGLES.indexOf(x) - a) < Math.abs(ANGLES.indexOf(best) - a) ? x : best);
      return place(sel.leaf.component, s, { angle, side: s.side, socket: `leaf.${i}`, z: zL("leaves") + n }); });
    // surface details ride on the points each LEAF SPRITE declares (tip / margin[i])
    for (const lp of sel.leafPoints) leaves.forEach(lf => pointsOf(lf.sp, lp.at).forEach(p => place(lp.component, { x: lf.x0 + p[0], y: lf.y0 + p[1] }, { socket: lf.socket + ":point" })));
    if (sel.collars) L.collars.forEach((_, i) => place(sel.collars, so[`collar.${i}`], { socket: `collar.${i}` }));
    if (sel.axils) L.axils.forEach((a, i) => place(sel.axils, so[`axil.${i}`], { side: a.side, socket: `axil.${i}` }));
    // roots: storage tuber, breathing roots, stilt roots
    if (sel.roots.storage) place(sel.roots.storage, so.primaryRoot, { socket: "primaryRoot" });
    if (sel.roots.aerial) for (let i = 0; i < sel.roots.aerial.count; i++) place(sel.roots.aerial.component, so[`aerial.${i}`], { socket: `aerial.${i}` });
    if (sel.roots.stilt) L.stilts.forEach((st, i) => place(sel.roots.stilt, so[`stilt.${i}`], { side: st.side, socket: `stilt.${i}` }));
    // reproductive: apex, flower, side heads, pods (+ their procedural stalks), drifting seeds
    place(sel.apex, so.apex, { socket: "apex" });
    if (sel.flower === "flower.1") { branchTo(L.flowerBranch.t, so["flower.1"], "flower.1"); place("flower", so["flower.1"], { socket: "flower.1" }); }
    for (let k = 1; k <= sel.sideHeads; k++) { branchTo(L.headBranches[k - 1].t, so[`seedHead.${k}`], `seedHead.${k}`); place("seedHead.small", so[`seedHead.${k}`], { socket: `seedHead.${k}` }); }
    if (sel.pods) L.podBranches.forEach((pb, i) => { branchTo(pb.t, so[`pod.${i}`], `pod.${i}`); place(sel.pods, so[`pod.${i}`], { socket: `pod.${i}` }); });
    for (let k = 0; k < sel.drift; k++) place("seed.drift", so[`drift.${k}`], { socket: `drift.${k}` });

    ops.sort((a, c) => a.z - c.z || a.seq - c.seq).forEach(op => op.draw());

    // ---- environment + compose
    return compose(packId, P, sel, b, W, H, MAT, MID, treat, placements, sk, () => paintEnv(P, B, W, H));
  }
  const pointsOf = (sp, at) => { const out = []; for (const part of at.split("+")) { if (part === "tip") { if (sp.points.tip) out.push(sp.points.tip); }
    else if (part === "margin") out.push(...sp.points.margin); else if (part.startsWith("margin:")) part.slice(7).split(",").forEach(k => { if (sp.points.margin[+k]) out.push(sp.points.margin[+k]); }); } return out; };

  // ---------------------------------------------------------------- skeleton "axes": a body plan @3 (rosette · candle · reed …)
  //   selection { plan, architecture, axes [drawn axis ids], leaf { component, set, angle { shift, cap } }, leafPoints [{ component, at }],
  //               place [{ component, sockets: "<axis|*>.<group>.<i|*>" | [ids], count? }], roots { taproot }, treatments, stress, key }
  const glob = s => new RegExp("^" + s.split(".").map(q => q === "*" ? "[^.]+" : q.replace(/[$()+?[\]\\^{|}]/g, "\\$&")).join("\\.") + "$");
  function renderAxes(sel, packId, Pl, { canvas } = {}) {
    const A = art(), P = A.packs[packId], C = contractOf(Pl);
    const W = (canvas || C.canvas).w, H = (canvas || C.canvas).h, MAT = A.materials, MID = Object.fromEntries(MAT.map((m, i) => [m, i + 1])), ANG = Pl.angles;
    const G = axesOf(Pl, sel.architecture), drawn = new Set(sel.axes);
    for (const a of drawn) if (!G.axes[a]) throw new Error(`body plan "${Pl.id}" / ${sel.architecture} has no axis "${a}"`);
    const live = G.list.filter(s => s.attach && (!s.axis || drawn.has(s.axis))), Rr = rootsOf(Pl, sel.roots.taproot);
    const stemAxis = Object.values(G.axes).find(a => drawn.has(a.id) && a.path && a.part === "stem") || null;
    const sk = { architecture: sel.architecture, axes: G.axes, drawn: [...drawn], sockets: G.sockets, primary: Rr.primary, laterals: Rr.laterals, roots: Rr.kind, stem: stemAxis && stemAxis.stem };
    const b = Buf(W, H), placements = [], ops = [];
    const treat = treatmentsOf(sel, C, P, MID);
    const recolour = (v, d, i) => { for (const T of treat) { if (T.clear) continue; const mk = d ? d.masks[T.id] : "auto", m = v >> 2;
        if (!mk || !T.map[m] || (T.shades && !T.shades.has(v & 3))) continue; if (mk === "auto" || mk[i]) v = T.map[m] * 4 + (v & 3); } return v; };
    const stemV = shade => { let v = MID.stem * 4 + shade; for (const T of treat) if (!T.clear && T.procedural.includes("stem") && T.map[v >> 2] && (!T.shades || T.shades.has(shade))) v = T.map[v >> 2] * 4 + shade; return v; };
    const own = (kind, extra) => { placements.push({ kind, ...extra }); return placements.length; };
    const zL = n => C.layers[n] * 100, crown = { x: Pl.crown[0], y: Pl.crown[1] };

    // ---- PROCEDURAL: roots (taproot or rhizome + risers), then every drawn stem / caudex
    ops.push({ z: zL("roots"), seq: 0, draw: () => { const o = own("procedural", { component: "roots", socket: "rootCrown", anchor: crown, trait: null, part: "roots" });
      if (Rr.kind === "rhizome") { for (const p of Rr.primary) for (let d = 0; d < p.w; d++) put(b, p.x, p.y + d, MID.root * 4 + (d === 0 && p.w > 1 ? 3 : 2), o);
        for (const a of Object.values(G.axes)) if (drawn.has(a.id) && a.path && a.origin.y === Pl.crown[1]) for (let y = a.origin.y + 1; y < Rr.y; y++) put(b, a.origin.x, y, MID.root * 4 + 2, o); }
      else for (const p of Rr.primary) for (let d = 0; d < p.w; d++) put(b, p.x - Math.floor((p.w - 1) / 2) + d, p.y, MID.root * 4 + (d === 0 && p.w > 1 ? 3 : 2), o);
      for (const l of Rr.laterals) line(quad(l.from, l.mid, l.to, 16)).forEach((q, k) => { if (k) put(b, q.x, q.y, MID.root * 4 + 1, o); }); } });
    const outl = (P.render && P.render.stemOutline) || "self";
    for (const a of Object.values(G.axes)) if (drawn.has(a.id) && a.path) ops.push({ z: zL("stem"), seq: ops.length, draw: () => {
      const o = own("procedural", { component: "stem", axis: a.id, socket: `${a.id}`, anchor: { x: a.origin.x, y: a.origin.y }, trait: null, part: a.part });
      for (const p of a.path) { const x0 = p.x - p.l;
        for (let d = 0; d < p.w; d++) put(b, x0 + d, p.y, stemV(p.w === 1 ? 2 : d === 0 ? 3 : d === p.w - 1 ? 1 : 2), o);
        if (outl !== "none") for (const x of [x0 - 1, x0 + p.w]) { const i = p.y * W + x; if (x >= 0 && x < W && !b.m[i]) put(b, x, p.y, outl === "ink" ? MID.ink * 4 : stemV(0), o); } } } });
    const stalk = s => ops.push({ z: zL("branch"), seq: ops.length, draw: () => { const o = own("procedural", { component: "branch", socket: s.id, anchor: { x: s.x, y: s.y }, trait: null, part: s.part || "flowers" }), p = s.from;
      line([{ x: p.x, y: p.y }, { x: R((p.x + s.x) / 2), y: R((p.y + s.y) / 2) + 1 }, { x: s.x, y: s.y }]).forEach(q => put(b, q.x, q.y, stemV(1), o)); } });

    // ---- AUTHORED sprites at sockets (a sprite only ever lands on a socket of its own attach kind)
    const keyFor = (component, angle, side) => { const c = C.components[component]; if (!c) throw new Error(`body plan "${Pl.id}" has no component "${component}"`);
      if (c.orientation !== "right") return `${component}@${c.orientation}`;
      return `${c.angles ? component + "." + angle : component}@${side < 0 ? "left" : "right"}`; };
    function place(component, at, { angle = null, side = 1, socket, z, attach } = {}) {
      const key = keyFor(component, angle, side), sp = P.sprites[key]; if (!sp) throw new Error(`pack ${packId} has no sprite ${key}`);
      if (attach && sp.attach !== attach) throw new Error(`body plan "${Pl.id}": ${component} (attach ${sp.attach}) cannot sit on socket ${socket} (attach ${attach})`);
      const x0 = at.x - sp.ax, y0 = at.y - sp.ay, rec = { kind: "sprite", component, key, socket, x0, y0, w: sp.w, h: sp.h, anchor: { x: at.x, y: at.y }, trait: sp.trait, category: sp.category, family: sp.family, sp };
      ops.push({ z: z !== undefined ? z : sp.z, seq: ops.length, draw: () => { const o = own("sprite", rec), d = spritePx(packId, key, sp);
        for (let y = 0; y < sp.h; y++) for (let x = 0; x < sp.w; x++) { const i = y * sp.w + x; let v = d.px[i]; if (!v) continue;
          if (treat.some(T => T.clear && d.masks[T.id] && d.masks[T.id] !== "auto" && d.masks[T.id][i])) continue;   // authored notch
          put(b, x0 + x, y0 + y, recolour(v, d, i), o); } } });
      return rec;
    }
    // body sprites (the plan names each sprite axis's body for this architecture)
    for (const a of Object.values(G.axes)) if (drawn.has(a.id) && a.kind === "sprite") { const s = G.sockets[`${a.id}.body`]; place(a.body, s, { socket: s.id, attach: "body" }); }
    // leaves: every leaf socket of every drawn axis, in plan order (a rosette lists back → front), on the architecture's leaf set
    const leafSocks = live.filter(s => s.attach === "radialLeaf" || s.attach === "leafSocket"), set = (G.arch.leafSets || {})[sel.leaf.set];
    const comp = C.components[sel.leaf.component]; if (!comp) throw new Error(`body plan "${Pl.id}" has no component "${sel.leaf.component}"`);
    const ang = sel.leaf.angle, capI = ANG.indexOf(ang.cap);
    const leaves = (set ? set.map(i => leafSocks[i]) : leafSocks).map((s, n) => { const a0 = ANG.indexOf(s.angle);
      let a = ang.shift > 0 ? Math.min(a0 + ang.shift, Math.max(a0, capI)) : Math.max(0, a0 + ang.shift);
      let angle = ANG[a]; if (!comp.angles.includes(angle)) angle = comp.angles.reduce((best, x) => Math.abs(ANG.indexOf(x) - a) < Math.abs(ANG.indexOf(best) - a) ? x : best);
      return place(sel.leaf.component, s, { angle, side: s.side, socket: s.id, z: zL("leaves") + n, attach: s.attach }); });
    for (const lp of sel.leafPoints) leaves.forEach(lf => pointsOf(lf.sp, lp.at).forEach(p => place(lp.component, { x: lf.x0 + p[0], y: lf.y0 + p[1] }, { socket: lf.socket + ":point", attach: "leafPoint" })));
    // everything else the grammar placed: sockets by id or pattern, only on drawn axes (+ the root sockets); stalks drawn to branch sockets
    for (const e of sel.place) { const pats = [].concat(e.sockets).map(glob);
      let hits = live.filter(s => pats.some(re => re.test(s.id))); if (e.count !== undefined) hits = hits.slice(0, e.count);
      if (!hits.length) throw new Error(`body plan "${Pl.id}" / ${sel.architecture}: no drawn socket matches ${[].concat(e.sockets).join(", ")} for ${e.component}`);
      for (const s of hits) { if (s.from) stalk(s); place(e.component, s, { side: s.side || 1, socket: s.id, attach: s.attach }); } }

    ops.sort((a, c) => a.z - c.z || a.seq - c.seq).forEach(op => op.draw());
    return compose(packId, P, sel, b, W, H, MAT, MID, treat, placements, sk, () => paintEnv(P, { crown: Pl.crown }, W, H, Pl.ground));
  }

  // ================================================================ the specimen-box backdrop (identical for every build of a pack)
  function paintEnv(P, B, W, H, ground) {
    const E = P.environment, soilY = B.crown[1], o = new Uint8ClampedArray(W * H * 4), sky = E.sky.map(hex), soil = E.soil.map(hex), turf = hex(E.turf);
    const set = (x, y, c) => { const i = (y * W + x) * 4; o[i] = c[0]; o[i + 1] = c[1]; o[i + 2] = c[2]; o[i + 3] = 255; };
    for (let y = 0; y < soilY; y++) { const f = y / (soilY - 1); for (let x = 0; x < W; x++) { const band = Math.floor(f * 4) / 4 + ((f * 4) % 1 > BAYER[(y & 3) * 4 + (x & 3)] ? 0.25 : 0); set(x, y, mix(sky[0], sky[1], Math.min(1, band))); } }
    for (let y = soilY; y < H; y++) { const f = (y - soilY) / (H - soilY), layer = Math.min(2, Math.floor(f * 3)), seam = (f * 3) % 1;
      for (let x = 0; x < W; x++) { let c = layer % 2 ? soil[1] : soil[0]; if (layer && seam < 0.15 && BAYER[(y & 3) * 4 + (x & 3)] < 0.5) c = layer % 2 ? soil[0] : soil[1]; set(x, y, c); } }
    for (let k = 0; k < 12; k++) { const x = R(2 + hash(k, 7) * (W - 5)), y = R(soilY + 4 + hash(k, 8) * (H - soilY - 6)); set(x, y, soil[2]); set(x + 1, y, soil[2]); }
    for (let x = 0; x < W; x++) { set(x, soilY, mix(turf, soil[0], 0.35)); if (x % 4 === 1 && hash(x, 9) > 0.3) set(x, soilY - 1, turf); }
    // waterlogged ground (body plan @3 ground.kind): a shallow standing-water band over the soil line, from the pack's water colours
    if (ground && ground.kind === "waterlogged" && E.water) { const water = E.water.map(hex);
      for (let y = soilY - 3; y < soilY; y++) for (let x = 0; x < W; x++) set(x, y, y === soilY - 3 && BAYER[(y & 3) * 4 + (x & 3)] < 0.5 ? water[1] : water[0]); }
    return o;
  }

  function paint(canvas, rgba, W, H) {
    W = W || canvas.width; H = H || canvas.height; if (canvas.width !== W) canvas.width = W; if (canvas.height !== H) canvas.height = H;
    canvas.getContext("2d").putImageData(new ImageData(new Uint8ClampedArray(rgba), W, H), 0, 0);
  }

  root.BLOOM = Object.assign(root.BLOOM || {}, { plantCompositor: Object.freeze({ sockets, skeleton, render, paintEnv, paint, fnv, ANGLES,
    planOf, planRefOf, axesOf, planSockets, LEGACY_PLAN }) });
})(typeof window !== "undefined" ? window : globalThis);
