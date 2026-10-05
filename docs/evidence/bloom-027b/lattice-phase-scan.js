// BLOOM-027B evidence: why the periodic lattice ring is turned by LATTICE_PHASE = 1/3 of a cell.
//   node docs/evidence/bloom-027b/lattice-phase-scan.js <out.json>
// For each candidate phase the three-octave terrain field (both production octave weightings, 60×40 and 48×32, seeds 1–60) is
// built with the 027B sampler at that phase, and the cut (x = W−1 → 0) is compared with the W−1 ordinary interior column
// boundaries: the mean |Δ| step across the cut over the mean interior step (ratio), where the cut would rank among the interior
// boundaries (0 = smoothest, 1 = steepest), and the same for land/water coast crossings at 15 / 45 / 60 % water thresholds.
// Phase 0 (the ring closing exactly at longitude zero) puts the cut on a lattice node of every octave at once — the smoothest
// boundary of almost every world. 1/3 of a cell puts it at the median.
"use strict";
const fs = require("fs"), path = require("path"), ROOT = path.resolve(__dirname, "../../..");
for (const f of ["content/config.js", "resources/bloom-sim.js", "resources/bloom-gen.js"]) require(path.join(ROOT, f));
const { BLOOM } = globalThis, smooth = t => t * t * (3 - 2 * t), mean = a => a.reduce((x, y) => x + y, 0) / a.length, r3 = v => Math.round(v * 1000) / 1000;
function octave(rng, cols, rows, W, H, phi) { // = resources/bloom-gen.js octave() with the phase as a parameter
  const stride = cols + 1, lat = new Float32Array(stride * (rows + 1)); for (let i = 0; i < lat.length; i++) lat[i] = rng();
  const f = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const gx = x / W * cols + phi, gy = y / (H - 1) * rows, fl = Math.floor(gx), x0 = ((fl % cols) + cols) % cols, x1 = x0 + 1 === cols ? 0 : x0 + 1, fx = smooth(gx - fl);
    const y0 = Math.min(gy | 0, rows - 1), fy = smooth(gy - y0), a = lat[y0 * stride + x0], b = lat[y0 * stride + x1], c = lat[(y0 + 1) * stride + x0], d = lat[(y0 + 1) * stride + x1];
    const top = a + (b - a) * fx, bot = c + (d - c) * fx; f[y * W + x] = top + (bot - top) * fy; }
  return f;
}
function fieldOf(rng, W, H, w, phi) { const N = W * H, o1 = octave(rng, 3, 2, W, H, phi), o2 = octave(rng, 6, 4, W, H, phi), o3 = octave(rng, 11, 7, W, H, phi), f = new Float32Array(N); let mn = Infinity, mx = -Infinity;
  for (let i = 0; i < N; i++) { const v = o1[i] * w[0] + o2[i] * w[1] + o3[i] * w[2]; f[i] = v; if (v < mn) mn = v; if (v > mx) mx = v; } for (let i = 0; i < N; i++) f[i] = (f[i] - mn) / (mx - mn); return f; }
function disc(f, W, H) { const seam = [], per = []; for (let x = 0; x < W - 1; x++) { let s = 0; for (let y = 0; y < H; y++) s += Math.abs(f[y * W + x] - f[y * W + x + 1]); per.push(s / H); }
  for (let y = 0; y < H; y++) seam.push(Math.abs(f[y * W + W - 1] - f[y * W])); const sm = mean(seam); return { ratio: sm / mean(per), rank: per.filter(v => v < sm).length / per.length }; }
function flips(f, W, H, pct) { const sorted = Float32Array.from(f).sort(), th = sorted[(pct / 100 * W * H) | 0], land = i => f[i] >= th; let seam = 0;
  for (let y = 0; y < H; y++) if (land(y * W + W - 1) !== land(y * W)) seam++; const per = []; for (let x = 0; x < W - 1; x++) { let n = 0; for (let y = 0; y < H; y++) if (land(y * W + x) !== land(y * W + x + 1)) n++; per.push(n); }
  return { ratio: seam / (mean(per) || 1), rank: per.filter(v => v < seam).length / per.length }; }
const out = { production: BLOOM.gen.noise.octave(BLOOM.gen.mulberry32(1), 3, 2, 60, 40).phase, phases: {} };
for (const phi of [0, 0.25, 0.2113, 0.28, 0.3, 1 / 3, 0.35, 0.375, 0.4, 0.5]) {
  const R = [], K = [], F = [], FR = [];
  for (const [W, H] of [[60, 40], [48, 32]]) for (const w of [[1, .5, .25], [0.5, 0.7, 1]]) for (let seed = 1; seed <= 60; seed++) {
    const f = fieldOf(BLOOM.gen.mulberry32(seed), W, H, w, phi), d = disc(f, W, H); R.push(d.ratio); K.push(d.rank);
    for (const pct of [15, 45, 60]) { const fl = flips(f, W, H, pct); F.push(fl.ratio); FR.push(fl.rank); } }
  out.phases[r3(phi)] = { terrainStepRatio: r3(mean(R)), terrainStepRatioRange: [r3(Math.min(...R)), r3(Math.max(...R))], terrainRank: r3(mean(K)), coastFlipRatio: r3(mean(F)), coastFlipRank: r3(mean(FR)), worlds: R.length };
  console.log(`phase ${r3(phi)}: terrain step seam/interior ${out.phases[r3(phi)].terrainStepRatio} rank ${out.phases[r3(phi)].terrainRank} · coast flips ${out.phases[r3(phi)].coastFlipRatio} rank ${out.phases[r3(phi)].coastFlipRank}`);
}
fs.writeFileSync(process.argv[2] || path.join(__dirname, "lattice-phase-scan.json"), JSON.stringify(out, null, 1));
console.log("production LATTICE_PHASE =", out.production);
