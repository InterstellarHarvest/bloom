// BLOOM — plant PREVIEW + MUTATION FX (BLOOM-032B1 production sprite pipeline). docs/PLANT_SPRITE_PIPELINE_v1.md §7.
//
// Works on two frames of the SAME pack from plant-compositor.js: CURRENT (what the colony is) and PROPOSED (the build after the purchase).
// The difference between their indexed plant buffers IS the mutation — no per-trait animation code exists.
//
//   diff(cur, tgt)                       → [{ i, add, del }]   pixels whose material·shade differs
//   anchorsOf(cur, tgt)                  → the attachment points the change grows from: the anchors of placements that are new or changed in
//                                          the proposed frame (a pure recolour — a treatment — grows from the root crown)
//   preview(cur, tgt)                    → RGBA: GHOST / OUTLINE — the current plant; proposed pixels as a pale half-presence; pixels that would go
//                                          thinned to a dither; a 1-px trace around the changed region. Static (no motion needed).
//   cancel                               = paint cur.rgba again (the preview never mutates a frame)
//   fxFrame(cur, tgt, style, t, anchors) → RGBA at progress t ∈ [0, 1]; t = 1 is EXACTLY tgt.rgba
//      "grow"     changed pixels appear outward from the attachment points, a bright leading edge (620 ms)
//      "dissolve" the old pixels give way to the new in an ordered 4 × 4 dither, biased outward from the anchors (560 ms)
//   purchase(cur, tgt, { style, reducedMotion, onFrame, … }) → Promise<{ style, frames, ms }>  plays it; ALWAYS ends on tgt.rgba.
//      reduced motion: a short direct swap — one frame, the target, no movement.
// Deterministic (no randomness). No sound. Classic script; no DOM (requestAnimationFrame only when playing).
(function (root) {
  "use strict";
  const R = Math.round, clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
  const DUR = { grow: 620, dissolve: 560 }, STYLES = Object.keys(DUR), TRACE = [255, 214, 74], EDGE = [255, 248, 210];
  const ease = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

  function diff(cur, tgt) { const a = cur.plant.m, b = tgt.plant.m, out = []; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) out.push({ i, add: !a[i], del: !b[i] }); return out; }
  const sigOf = p => `${p.component}|${p.key || ""}|${p.socket}|${p.x0},${p.y0}`;
  function anchorsOf(cur, tgt) {
    const have = new Set(cur.placements.map(sigOf)), fresh = tgt.placements.filter(p => p.kind === "sprite" && !have.has(sigOf(p)));
    const pts = fresh.map(p => p.anchor); if (pts.length) return pts;
    const crown = tgt.placements.find(p => p.component === "stem"); return [crown ? crown.anchor : { x: tgt.W >> 1, y: tgt.H >> 1 }];
  }
  const copy = (o, src, i) => { o[i * 4] = src[i * 4]; o[i * 4 + 1] = src[i * 4 + 1]; o[i * 4 + 2] = src[i * 4 + 2]; o[i * 4 + 3] = 255; };
  const tint = (o, i, c, t) => { for (let k = 0; k < 3; k++) o[i * 4 + k] = R(o[i * 4 + k] + (c[k] - o[i * 4 + k]) * t); };

  function preview(cur, tgt) {
    const W = cur.W, H = cur.H, o = new Uint8ClampedArray(cur.rgba), d = diff(cur, tgt), mask = new Uint8Array(W * H);
    for (const q of d) { mask[q.i] = 1; const x = q.i % W, y = (q.i / W) | 0;
      if (q.del) { if ((x + y) % 2) copy(o, cur.env, q.i); }                      // what would go: thinned to a dither over the backdrop
      else { copy(o, tgt.rgba, q.i); tint(o, q.i, cur.env.subarray(q.i * 4, q.i * 4 + 3), 0.45); } }   // what would grow / change: a pale half-presence
    for (let i = 0; i < W * H; i++) { if (mask[i] || tgt.plant.m[i]) continue; const x = i % W, y = (i / W) | 0;   // trace the changed region's outside edge
      if ((x > 0 && mask[i - 1] && tgt.plant.m[i - 1]) || (x < W - 1 && mask[i + 1] && tgt.plant.m[i + 1]) || (y > 0 && mask[i - W] && tgt.plant.m[i - W]) || (y < H - 1 && mask[i + W] && tgt.plant.m[i + W])) {
        o[i * 4] = TRACE[0]; o[i * 4 + 1] = TRACE[1]; o[i * 4 + 2] = TRACE[2]; o[i * 4 + 3] = 255; } }
    return o;
  }

  function fxFrame(cur, tgt, style, t, anchors) {
    if (t >= 1) return new Uint8ClampedArray(tgt.rgba);
    const W = cur.W, o = new Uint8ClampedArray(cur.rgba), d = diff(cur, tgt), A = anchors && anchors.length ? anchors : anchorsOf(cur, tgt);
    const dist = d.map(q => { const x = q.i % W, y = (q.i / W) | 0; let m = Infinity; for (const a of A) m = Math.min(m, Math.hypot(x - a.x, y - a.y)); return m; });
    const maxD = Math.max(1, ...dist), e = ease(clamp(t / 0.9, 0, 1));
    d.forEach((q, k) => { const f = dist[k] / maxD, x = q.i % W, y = (q.i / W) | 0;
      if (style === "dissolve") { if (e > BAYER[(y & 3) * 4 + (x & 3)] * 0.8 + f * 0.2) copy(o, tgt.rgba, q.i); return; }
      const r = e * 1.06; if (r > 0 && f <= r) { copy(o, tgt.rgba, q.i); if (!q.del && r - f < 0.1) tint(o, q.i, EDGE, 0.7); } });
    return o;
  }

  function purchase(cur, tgt, { style = "grow", reducedMotion = false, onFrame, anchors = null, now = () => performance.now(), raf = f => requestAnimationFrame(f) } = {}) {
    return new Promise(resolve => {
      const t0 = now();
      if (reducedMotion) { onFrame(new Uint8ClampedArray(tgt.rgba)); resolve({ style: "reduced", frames: 1, ms: 0 }); return; }   // a direct swap
      const D = DUR[style] || DUR.grow, A = anchors || anchorsOf(cur, tgt); let n = 0;
      const step = () => { const t = clamp((now() - t0) / D, 0, 1); onFrame(fxFrame(cur, tgt, style, t, A)); n++; if (t < 1) raf(step); else resolve({ style, frames: n, ms: R(now() - t0) }); };
      raf(step);
    });
  }

  root.BLOOM = Object.assign(root.BLOOM || {}, { plantFx: Object.freeze({ diff, anchorsOf, preview, fxFrame, purchase, DUR, STYLES }) });
})(typeof window !== "undefined" ? window : globalThis);
