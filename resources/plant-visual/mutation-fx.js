// BLOOM — PREVIEW treatments and MUTATION (purchase) FX (BLOOM-032A Plant Evolution Visual Lab). docs/PLANT_EVOLUTION_VISUAL_LAB_v1.md §9, §10.
//
// Both work on two rendered frames of the SAME concept (plant-renderer.js): CURRENT (what the colony is) and TARGET (the build with
// one more real tier). The difference between their indexed plant buffers is the mutation; the organism itself shows it.
//
//   previewFrame(cur, tgt, C, style, phase) → RGBA     style:
//     "ghost"   the current plant, with the proposed pixels as a dithered half-presence (and the pixels that would go, thinned)
//     "glow"    the current plant with the mutated region swapped in and a pulsing outline traced around it
//     "flip"    current ⇄ proposed, alternating (a slower, bolder read for a projector)
//   purchase(cur, tgt, C, { style, reducedMotion, anchor, onFrame }) → Promise<{ ms, frames, endSig }>   styles:
//     "grow"     new pixels grow outward from the mutation's attachment point (nearest first), a bright leading edge
//     "pulse"    a light pulse travels up the stem / roots from the crown to the attachment point, then the growth
//     "dissolve" the old part dissolves in an ordered dither while the new one condenses in the same pattern
//     "bloom"    growth + a few pollen / cell particles lifting from the attachment point + a brief specimen-box brightening
//   Every animation ends on EXACTLY the target frame (its RGBA). Reduced motion: a short two-step swap (≈160 ms), no movement.
// Durations 560–760 ms. Deterministic (no randomness). No sound. Classic script, no DOM except requestAnimationFrame timing.
(function (root) {
  "use strict";
  const R = Math.round, clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
  const DUR = { grow: 620, pulse: 760, dissolve: 600, bloom: 700 }, RM_MS = 160;
  const ease = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

  /** The mutation mask: pixels whose plant material differs between the two frames (added, removed or changed). */
  function diff(cur, tgt) {
    const a = cur.plant.m, b = tgt.plant.m, out = []; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) out.push({ i, add: !a[i] && !!b[i], del: !!a[i] && !b[i] });
    return out;
  }
  const px = (o, rgba, i) => { o[i * 4] = rgba[i * 4]; o[i * 4 + 1] = rgba[i * 4 + 1]; o[i * 4 + 2] = rgba[i * 4 + 2]; o[i * 4 + 3] = 255; };
  const tint = (o, i, c, t) => { for (let k = 0; k < 3; k++) o[i * 4 + k] = R(o[i * 4 + k] + (c[k] - o[i * 4 + k]) * t); };

  function previewFrame(cur, tgt, C, style = "ghost", phase = 0) {
    const W = cur.W, o = new Uint8ClampedArray(cur.rgba), d = diff(cur, tgt), glowC = C.id === "C" ? [214, 255, 220] : C.id === "B" ? [214, 70, 52] : [255, 214, 92];
    if (style === "flip") return (Math.floor(phase / 700) % 2) ? new Uint8ClampedArray(tgt.rgba) : o;
    if (style === "ghost") {
      for (const q of d) { const x = q.i % W, y = (q.i / W) | 0, on = (x + y) % 2 === 0;
        if (q.del) { if (on) px(o, tgt.rgba, q.i); }                                   // what would go: thinned to a dithered half
        else { px(o, tgt.rgba, q.i); if ((tgt.plant.m[q.i] & 3) !== 0) tint(o, q.i, [255, 255, 255], 0.38); } }   // what would grow: solid but pale, its outline whole
      return o;
    }
    // glow: the proposed region in full, traced with a pulsing outline (the rest stays current)
    const mask = new Uint8Array(cur.plant.m.length); for (const q of d) { mask[q.i] = 1; px(o, tgt.rgba, q.i); }
    const pulse = 0.55 + 0.45 * Math.sin(phase / 140);
    for (let i = 0; i < mask.length; i++) { if (mask[i] || tgt.plant.m[i]) continue; const x = i % W, y = (i / W) | 0;
      if ((x > 0 && mask[i - 1]) || (x < W - 1 && mask[i + 1]) || (y > 0 && mask[i - W]) || (i + W < mask.length && mask[i + W])) tint(o, i, glowC, pulse); }
    return o;
  }

  /** One animation frame at progress t (0 → 1) — pure, so QA can sample it (the frame strip evidence) and the lab can play it. */
  function fxFrame(cur, tgt, C, style, t, anchor, path) {
    const W = cur.W, H = cur.H, o = new Uint8ClampedArray(cur.rgba), d = diff(cur, tgt), a = anchor || { x: W / 2, y: H / 2 };
    if (t >= 1) return new Uint8ClampedArray(tgt.rgba);
    const grow0 = style === "pulse" ? 0.32 : 0, g = clamp((t - grow0) / (0.86 - grow0), 0, 1);
    let maxD = 1; for (const q of d) { const x = q.i % W, y = (q.i / W) | 0; maxD = Math.max(maxD, Math.hypot(x - a.x, y - a.y)); }
    const edge = C.id === "C" ? [224, 255, 214] : [255, 246, 196];
    for (const q of d) { const x = q.i % W, y = (q.i / W) | 0, dist = Math.hypot(x - a.x, y - a.y) / maxD;
      if (style === "dissolve") { const th = BAYER[(y & 3) * 4 + (x & 3)] * 0.85 + dist * 0.15; if (ease(g) > th) px(o, tgt.rgba, q.i); continue; }
      const r = ease(g) * 1.08; if (dist <= r) { px(o, tgt.rgba, q.i); if (r - dist < 0.12 && !q.del) tint(o, q.i, edge, 0.75); } }
    // the travelling pulse along the stem / root path (crown → attachment point)
    if ((style === "pulse" || style === "bloom") && path && path.length) { const p0 = style === "pulse" ? clamp(t / 0.36, 0, 1) : clamp(t / 0.28, 0, 1);
      if (p0 < 1) { const k = R(p0 * (path.length - 1)); for (let j = Math.max(0, k - 2); j <= k; j++) { const q = path[j]; if (q.x >= 0 && q.y >= 0 && q.x < W && q.y < H) tint(o, q.y * W + q.x, edge, 0.85 - (k - j) * 0.25); } } }
    // bloom: a few cells / pollen lifting from the attachment point, and a brief brightening of the specimen box
    if (style === "bloom" && t > 0.5) { const s = (t - 0.5) / 0.5;
      for (let k = 0; k < 7; k++) { const ang = -Math.PI / 2 + (k - 3) * 0.42, r = 2 + s * (6 + (k % 3) * 2), x = R(a.x + Math.cos(ang) * r), y = R(a.y + Math.sin(ang) * r - s * 3);
        if (x >= 0 && y >= 0 && x < W && y < H && (k + R(s * 6)) % 3 !== 0) tint(o, y * W + x, edge, 1 - s * 0.7); }
      if (t > 0.55 && t < 0.72) for (let i = 0; i < W * H; i++) if (!tgt.plant.m[i]) tint(o, i, [255, 255, 255], 0.1); }
    return o;
  }

  /** Play the purchase animation through onFrame(rgba); resolves with timing and the end frame's identity. */
  function purchase(cur, tgt, C, { style = "grow", reducedMotion = false, anchor = null, path = null, onFrame, now = () => performance.now(), raf = f => requestAnimationFrame(f) } = {}) {
    return new Promise(resolve => {
      const t0 = now(), frames = [];
      if (reducedMotion) {                                   // a short, still swap: half, then the target (no movement, no particles)
        const mid = new Uint8ClampedArray(cur.rgba); for (let i = 0; i < mid.length; i += 4) for (let k = 0; k < 3; k++) mid[i + k] = R((cur.rgba[i + k] + tgt.rgba[i + k]) / 2);
        onFrame(mid); frames.push(0);
        setTimeout(() => { onFrame(new Uint8ClampedArray(tgt.rgba)); frames.push(1); resolve({ ms: R(now() - t0), frames: frames.length, style: "reduced" }); }, RM_MS);
        return; }
      const D = DUR[style] || 620;
      const step = () => { const t = clamp((now() - t0) / D, 0, 1); onFrame(fxFrame(cur, tgt, C, style, t, anchor, path)); frames.push(t);
        if (t < 1) raf(step); else resolve({ ms: R(now() - t0), frames: frames.length, style }); };
      raf(step);
    });
  }

  root.BLOOM = Object.assign(root.BLOOM || {}, { plantVisual: Object.assign((root.BLOOM && root.BLOOM.plantVisual) || {}, {
    fx: Object.freeze({ diff, previewFrame, fxFrame, purchase, DUR, RM_MS, PREVIEW_STYLES: ["ghost", "glow", "flip"], FX_STYLES: ["grow", "pulse", "dissolve", "bloom"] }) }) });
})(typeof window !== "undefined" ? window : globalThis);
