// BLOOM — the SPECIMEN ENVIRONMENT (BLOOM-035C2). docs/VISUAL_DIRECTION_v1.0.md §3–4: "ADAPT changes the ORGANISM. TERRAFORM changes the
// ENVIRONMENT around it."
//
// A deterministic generated environment scene BEHIND / AROUND the canonical pixel organism, kept apart from it: the organism (authored
// sprites + compositor) never reads a scene, and a scene never touches an organism pixel. The scene is REGION-driven, never species-driven:
// planet + region + the sky its ground sees now (Terraform + scenario drift) → the same scene for every species shown there.
//
//   const S = BLOOM.plantEnvironment.region({ planetId, archetypeId, regionId, local: { tempOffset, moistureOffset }, sky: { temperature,
//               moisture }, salinity, toxicity, radiation })                      → a frozen scene descriptor (plain data)
//   const S = BLOOM.plantEnvironment.showcase()                                    → the neutral, presentation-only Species Selection scene
//   BLOOM.plantEnvironment.paint(S, W, H, soilY)   → Uint8ClampedArray RGBA: the STATIC geography (sky gradient, sun, horizon, ground,
//                                                    standing water, soil cutaway) — a low-resolution procedural raster on the organism's grid
//   BLOOM.plantEnvironment.fx(S)                   → the weather FX spec (clouds drifting, rain, snow, haze, dust, water ripples) — data only
//   BLOOM.plantEnvironment.signature(S, W, H, soilY) → "<raster fnv>-<fx fnv>": the environment signature (organism-independent)
//   BLOOM.plantEnvironment.mountFx(canvas, { reducedMotion })  (browser) → { set(spec, { W, H, soilY, scale }), frame(), state(), dispose() }:
//                                                    the FX overlay — simple runtime particles on its own canvas above the specimen;
//                                                    reduced motion draws ONE still frame (the weather state stays visible, nothing moves)
//
// Environment art is NOT bound by the plant sprite pixel contract (free colours, soft gradients); it only keeps to the organism's logical
// grid so the specimen reads as one picture. Thresholds follow the Terraform room's region scene (decision-rooms paintScene), so the two
// views agree. Deterministic: integer hashing of stable ids (planet id, region id), no Math.random, no clock (the FX overlay's animation
// time is presentation only and never feeds a signature). Classic script; DOM only in mountFx; Node can require it.
(function (root) {
  "use strict";
  const VERSION = 1, R = Math.round;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), mix = (a, b, t) => a.map((v, k) => v + (b[k] - v) * t);
  const fnv = arr => { let h = 0x811c9dc5; for (let i = 0; i < arr.length; i++) { h ^= arr[i] & 255; h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(16).padStart(8, "0"); };
  const strHash = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h >>> 0; };
  const hash = (seed, a, b = 0) => { let h = Math.imul((seed ^ (a + 1) * 0x9e3779b1) ^ (b + 7) * 0x85ebca6b, 0x27d4eb2f) >>> 0; h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d) >>> 0; h ^= h >>> 12; return (h >>> 0) / 4294967296; };
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
  const HORIZON = { ocean_archipelago: "sea", desert_world: "dunes", frozen_world: "peaks" };   // otherwise rolling ridges
  const r1 = v => Math.round(v * 10) / 10;

  // ================================================================ scenes (plain, frozen data)
  /** The scene of one REGION of one planet under a sky. Species never enters. */
  function region({ planetId, archetypeId = null, regionId, local = {}, sky, salinity = 0, toxicity = 0, radiation = 0 } = {}) {
    if (planetId == null || regionId == null || !sky) throw new TypeError("BLOOM.plantEnvironment.region: planetId, regionId and sky are required");
    const t = (+sky.temperature) + (+local.tempOffset || 0), m = clamp((+sky.moisture) + (+local.moistureOffset || 0), 0, 100);
    return Object.freeze({ v: VERSION, kind: "region", planet: String(planetId), region: String(regionId), horizon: HORIZON[archetypeId] || "ridges",
      seed: strHash(`${planetId}|${regionId}`), skyline: strHash(String(planetId)), t: r1(t), m: r1(m), salt: r1(+salinity || 0), toxic: r1(+toxicity || 0), rad: r1(+radiation || 0) });
  }
  /** Species Selection happens before any planet exists: one restrained, neutral showcase scene (no weather, no region implied). */
  const SHOWCASE = Object.freeze({ v: VERSION, kind: "showcase", planet: null, region: null, horizon: "ridges", seed: 0x51e0c0de, skyline: 0x51e0c0de, t: 14, m: 46, salt: 0, toxic: 0, rad: 0 });
  const showcase = () => SHOWCASE;
  const isScene = s => !!s && typeof s === "object" && (s.kind === "region" || s.kind === "showcase") && s.v === VERSION;
  const keyOf = s => JSON.stringify([s.v, s.kind, s.planet, s.region, s.horizon, s.seed, s.skyline, s.t, s.m, s.salt, s.toxic, s.rad]);

  /** The physical reading of a scene → what is shown. Pure. */
  function look(s) {
    const show = s.kind === "showcase", t = s.t, m = s.m;
    // the sky's temperature impression is CONTINUOUS (a Terraform step always reads): pale cold blue → clear temperate blue → warm amber
    let top = t < 10 ? mix([206, 220, 240], [126, 188, 232], clamp((t + 30) / 40, 0, 1)) : mix([126, 188, 232], [236, 164, 116], clamp((t - 10) / 40, 0, 1));
    let bot = t < 10 ? mix([232, 240, 250], [222, 238, 248], clamp((t + 30) / 40, 0, 1)) : mix([222, 238, 248], [250, 228, 200], clamp((t - 10) / 40, 0, 1));
    // humidity: continuously greyer and softer toward wet, yellower and hazier toward dry
    if (m > 45) { const k = Math.min(1, (m - 45) / 55) * 0.75; top = mix(top, [138, 156, 174], k); bot = mix(bot, [206, 214, 222], k); }
    if (m < 45) { const k = Math.min(1, (45 - m) / 45) * 0.6; top = mix(top, [228, 196, 136], k); bot = mix(bot, [246, 232, 200], k); }
    if (show) { top = [158, 178, 196]; bot = [220, 226, 230]; }
    const rain = !show && m > 68 && t >= 0, snow = !show && m > 55 && t < -2, overcast = rain || snow || (!show && m > 60);
    const ground = show ? [122, 116, 92] : t < -8 ? [236, 240, 246] : m < 22 ? [200, 168, 112] : m < 40 ? [170, 150, 96] : m > 75 ? [86, 92, 60] : m > 58 ? [104, 112, 64] : [128, 132, 76];
    const soil = show ? [[104, 90, 74], [88, 76, 62], [134, 120, 100]] : m < 30 ? [[176, 140, 96], [152, 118, 80], [212, 186, 140]] : m > 62 ? [[76, 58, 44], [62, 48, 36], [104, 86, 68]] : [[120, 92, 66], [100, 78, 56], [150, 126, 96]];
    return { top, bot, ground, soil, overcast, rain, snow,
      clouds: show ? 0.15 : overcast ? 0.85 : clamp(0.1 + m / 90, 0.1, 0.8), sun: !overcast && !show, hot: !show && t > 32,
      haze: !show && m < 28, dust: !show && m < 22 && t > 12, snowGround: !show && t < -8, frost: !show && t < 0, caps: !show && t < 4,
      cracks: !show && m < 32, mud: !show && m > 60 && t >= 0, water: show ? 0 : t >= 0 && m >= 72 ? clamp((m - 72) / 20, 0, 1) : 0, ice: !show && t < 0 && m >= 72,
      salt: !show && s.salt > 1.2, toxic: !show && s.toxic > 0.5, rad: show ? 0 : s.rad };
  }

  // ================================================================ the static raster
  const cache = new Map();
  function paint(s, W, H, soilY) {
    if (!isScene(s)) throw new TypeError("BLOOM.plantEnvironment.paint: not a scene (region() / showcase())");
    const ck = keyOf(s) + `|${W}x${H}@${soilY}`; let hit = cache.get(ck); if (hit) return new Uint8ClampedArray(hit);
    const L = look(s), o = new Uint8ClampedArray(W * H * 4), set = (x, y, c) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const i = (y * W + x) * 4; o[i] = R(c[0]); o[i + 1] = R(c[1]); o[i + 2] = R(c[2]); o[i + 3] = 255; };
    const get = (x, y) => { const i = (y * W + x) * 4; return [o[i], o[i + 1], o[i + 2]]; };
    // SKY: a soft gradient with a light ordered dither (retro, not a painting)
    for (let y = 0; y < soilY; y++) { const f = y / Math.max(1, soilY - 1); for (let x = 0; x < W; x++) { const d = (BAYER[(y & 3) * 4 + (x & 3)] - 0.5) * 0.06; set(x, y, mix(L.top, L.bot, clamp(f + d, 0, 1))); } }
    // SUN (a clear sky only), a radiation glow ring when the region's radiation is high
    if (L.sun) { const cx = W - 16, cy = 12, r0 = L.hot ? 5.5 : 4.5, core = L.hot ? [255, 178, 84] : [255, 222, 120];
      for (let y = 0; y < soilY; y++) for (let x = 0; x < W; x++) { const d = Math.hypot(x - cx, y - cy); if (d <= r0) set(x, y, core); else if (d <= r0 + 3) set(x, y, mix(get(x, y), [255, 246, 200], 0.55 * (1 - (d - r0) / 3) + Math.min(0.25, L.rad / 160))); } }
    // static cloud banks (the FX overlay adds the drifting wisps): soft, lighter or greyer with the weather
    const cloudN = R(1 + L.clouds * 4), cloudC = L.overcast ? [196, 202, 210] : [246, 248, 250];
    for (let k = 0; k < cloudN; k++) { const cx = R(hash(s.seed, k, 3) * W), cy = R(6 + hash(s.seed, k, 4) * (soilY * 0.42)), rx = 6 + R(hash(s.seed, k, 5) * 9), ry = 2 + R(hash(s.seed, k, 6) * 2);
      for (let y = cy - ry; y <= cy + ry; y++) for (let x = cx - rx; x <= cx + rx; x++) { const e = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2; if (e <= 1 && y < soilY - 14) set(x, y, mix(get(x, y), cloudC, e < 0.6 ? 0.85 : 0.5)); } }
    // HORIZON: a distant skyline for the planet (the same planet keeps its silhouette; the region shifts the view), atmospheric depth
    const far = mix(mix(L.ground, L.bot, 0.55), [150, 160, 172], 0.25), near = mix(L.ground, L.bot, 0.3), hz = soilY - 1;
    const ridge = (x, seed, amp, base, rough) => { let h = 0; for (let o2 = 1; o2 <= 3; o2++) { const p = (x + R(hash(seed, 91) * 400)) / (24 / o2); const i = Math.floor(p), f = p - i, a = hash(seed, i, o2), b = hash(seed, i + 1, o2); h += (a + (b - a) * (f * f * (3 - 2 * f))) * amp / o2; } return base + h * rough; };
    const skyline = s.skyline ^ (s.seed & 0xffff);
    for (let x = 0; x < W; x++) {
      let hFar, hNear;
      if (s.horizon === "sea") { hFar = 2 + (hash(skyline, Math.floor((x + 3) / 9)) > 0.72 ? 2 + R(hash(skyline, x >> 3, 7) * 3) : 0); hNear = 0; }
      else if (s.horizon === "dunes") { hFar = R(ridge(x, skyline, 6, 4, 0.8)); hNear = R(ridge(x, skyline ^ 77, 4, 2, 0.7)); }
      else if (s.horizon === "peaks") { const p = ridge(x, skyline, 14, 5, 1); hFar = R(p + (hash(skyline, x >> 2, 9) > 0.8 ? 2 : 0)); hNear = R(ridge(x, skyline ^ 55, 6, 2, 0.8)); }
      else { hFar = R(ridge(x, skyline, 9, 4, 0.9)); hNear = R(ridge(x, skyline ^ 33, 5, 2, 0.8)); }
      for (let k = 0; k < hFar; k++) { const y = hz - k; if (y < 0) break; const cap = L.caps && s.horizon !== "sea" && k >= hFar - 2 && hFar > 6; set(x, y, cap ? [240, 244, 248] : far); }
      if (s.horizon === "sea") for (let y = hz - 1; y <= hz; y++) set(x, y, mix([92, 140, 168], L.bot, 0.35));
      for (let k = 0; k < hNear; k++) { const y = hz - k; if (y >= 0) set(x, y, L.snowGround ? [226, 232, 240] : near); }
    }
    // GROUND line + turf
    for (let x = 0; x < W; x++) { const tuft = x % 4 === 1 && hash(s.seed, x, 11) > 0.35;
      set(x, soilY, L.salt ? mix(L.ground, [236, 232, 220], 0.5) : L.ground);
      if (tuft && !L.snowGround && !L.water) set(x, soilY - 1, L.cracks ? mix(L.ground, [150, 130, 80], 0.4) : mix(L.ground, [70, 96, 52], 0.5)); }
    // SOIL cutaway: strata + moisture / dryness / mineral cues
    for (let y = soilY + 1; y < H; y++) { const f = (y - soilY) / (H - soilY), layer = Math.min(2, Math.floor(f * 3)), seam = (f * 3) % 1;
      for (let x = 0; x < W; x++) { let c = layer % 2 ? L.soil[1] : L.soil[0]; if (layer && seam < 0.15 && BAYER[(y & 3) * 4 + (x & 3)] < 0.5) c = layer % 2 ? L.soil[0] : L.soil[1];
        if (L.frost && y <= soilY + 3) c = mix(c, [214, 226, 238], 0.45 - (y - soilY) * 0.1); set(x, y, c); } }
    for (let k = 0; k < 14; k++) { const x = R(2 + hash(s.seed, k, 21) * (W - 5)), y = R(soilY + 4 + hash(s.seed, k, 22) * (H - soilY - 6)); set(x, y, L.soil[2]); set(x + 1, y, L.soil[2]); }
    if (L.mud) for (let k = 0; k < 18; k++) { const x = R(hash(s.seed, k, 31) * (W - 1)), y = R(soilY + 2 + hash(s.seed, k, 32) * 12); set(x, y, [70, 86, 96]); }
    if (L.cracks) for (let k = 0; k < 5; k++) { let x = R(6 + hash(s.seed, k, 41) * (W - 12)), y = soilY + 1; for (let j = 0; j < 4 + R(hash(s.seed, k, 42) * 4); j++) { set(x, y, mix(L.soil[1], [80, 60, 40], 0.5)); x += hash(s.seed, k * 9 + j, 43) > 0.5 ? 1 : -1; y++; } }
    if (L.salt) for (let k = 0; k < 26; k++) set(R(hash(s.seed, k, 51) * (W - 1)), R(soilY + 1 + hash(s.seed, k, 52) * 8), [244, 242, 236]);
    if (L.toxic) for (let k = 0; k < 10; k++) set(R(hash(s.seed, k, 61) * (W - 1)), R(soilY + 3 + hash(s.seed, k, 62) * 14), [112, 72, 150]);
    // SNOW on the ground, STANDING WATER over the soil line (regional, never a species property)
    if (L.snowGround) for (let x = 0; x < W; x++) { set(x, soilY, [244, 247, 252]); if (hash(s.seed, x, 71) > 0.4) set(x, soilY - 1, [236, 241, 248]); }
    if (L.water || L.ice) { const rows = L.ice ? 2 : 2 + R(L.water * 2), deep = L.ice ? [188, 214, 232] : [70, 122, 150], lite = L.ice ? [226, 238, 246] : [128, 176, 198];
      for (let y = soilY - rows; y < soilY; y++) for (let x = 0; x < W; x++) set(x, y, y === soilY - rows && BAYER[(y & 3) * 4 + (x & 3)] < 0.5 ? lite : deep); }
    cache.set(ck, new Uint8ClampedArray(o)); if (cache.size > 64) cache.delete(cache.keys().next().value);
    return o;
  }

  // ================================================================ the weather FX spec (data) + the overlay (browser)
  function fx(s) {
    if (!isScene(s)) throw new TypeError("BLOOM.plantEnvironment.fx: not a scene");
    const L = look(s);
    return Object.freeze({ seed: s.seed, clouds: { n: R(1 + L.clouds * 3), shade: L.overcast ? "grey" : "white", speed: L.overcast ? 0.5 : 0.25 },
      rain: L.rain ? { density: R(18 + (s.m - 68) * 1.2) } : null, snow: L.snow ? { density: R(14 + (s.m - 55) * 0.6) } : null,
      haze: L.haze ? { strength: r1(clamp((28 - s.m) / 28, 0.1, 1) * 0.5) } : null, dust: L.dust ? { n: 10 } : null, ripples: L.water > 0 && !L.ice ? { n: 5 } : null });
  }
  function signature(s, W, H, soilY) { return `${fnv(paint(s, W, H, soilY))}-${fnv(Array.from(JSON.stringify(fx(s)), c => c.charCodeAt(0)))}`; }

  /** The FX overlay on its own canvas (above the specimen, pointer-events none). Particle positions come from the scene seed; only their motion
   *  uses animation time. Reduced motion: one still frame. */
  function mountFx(cv, { reducedMotion = () => false } = {}) {
    const ctx = cv.getContext("2d"); let spec = null, lay = null, raf = 0, t0 = 0, frames = 0, still = false;
    const rm = () => !!(typeof reducedMotion === "function" ? reducedMotion() : reducedMotion);
    function size() { if (!lay) return; const w = lay.W * lay.scale, h = lay.H * lay.scale; if (cv.width !== w) cv.width = w; if (cv.height !== h) cv.height = h; }
    function draw(time) {
      frames++; if (!spec || !lay) return; size(); const k = lay.scale, W = lay.W, H = lay.H, sy = lay.soilY, T = time / 1000;
      ctx.clearRect(0, 0, cv.width, cv.height);
      const px = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x * k), Math.round(y * k), Math.max(1, Math.round(w * k)), Math.max(1, Math.round(h * k))); };
      // drifting cloud wisps (sky band only)
      for (let i = 0; i < spec.clouds.n; i++) { const w = 10 + hash(spec.seed, i, 101) * 12, y = 4 + hash(spec.seed, i, 102) * (sy * 0.35), x = ((hash(spec.seed, i, 103) * (W + w) + T * spec.clouds.speed * (1 + i * 0.3)) % (W + w)) - w;
        ctx.globalAlpha = spec.clouds.shade === "grey" ? 0.35 : 0.45; px(x, y, w, 1.6, spec.clouds.shade === "grey" ? "#c4cad2" : "#ffffff"); px(x + w * 0.2, y - 1, w * 0.55, 1.2, spec.clouds.shade === "grey" ? "#ccd1d8" : "#ffffff"); }
      ctx.globalAlpha = 1;
      if (spec.haze) { const g = ctx.createLinearGradient(0, (sy - 26) * k, 0, sy * k); g.addColorStop(0, "rgba(245,222,170,0)"); g.addColorStop(1, `rgba(245,222,170,${spec.haze.strength + 0.04 * Math.sin(T * 0.6)})`); ctx.fillStyle = g; ctx.fillRect(0, 0, cv.width, sy * k); }
      if (spec.rain) { ctx.globalAlpha = 0.55; for (let i = 0; i < spec.rain.density; i++) { const x = hash(spec.seed, i, 111) * W, y = ((hash(spec.seed, i, 112) * sy + T * 38 * (0.8 + hash(spec.seed, i, 113) * 0.4)) % sy); px(x - (y / sy) * 2, y, 0.5, 3, "#7b9cba"); } ctx.globalAlpha = 1; }
      if (spec.snow) { for (let i = 0; i < spec.snow.density; i++) { const y = ((hash(spec.seed, i, 121) * sy + T * 6 * (0.7 + hash(spec.seed, i, 122) * 0.6)) % sy), x = hash(spec.seed, i, 123) * W + Math.sin(T * 0.8 + i) * 1.2; px(x, y, 1, 1, "#ffffff"); } }
      if (spec.dust) { ctx.globalAlpha = 0.5; for (let i = 0; i < spec.dust.n; i++) { const x = ((hash(spec.seed, i, 131) * W + T * 4 * (0.5 + hash(spec.seed, i, 132))) % W), y = sy - 6 - hash(spec.seed, i, 133) * 14 + Math.sin(T + i) * 1.5; px(x, y, 1, 1, "#c8a46a"); } ctx.globalAlpha = 1; }
      if (spec.ripples) { ctx.globalAlpha = 0.6; for (let i = 0; i < spec.ripples.n; i++) { const x = hash(spec.seed, i, 141) * (W - 6), ph = (T * 0.9 + hash(spec.seed, i, 142) * 6) % 3, w = 1 + ph * 1.6; px(x + 3 - w / 2, sy - 2, w, 0.6, "#d6ecf5"); } ctx.globalAlpha = 1; }
    }
    const loop = time => { raf = 0; if (!spec) return; if (!t0) t0 = time; draw(time - t0); if (!still) raf = requestAnimationFrame(loop); };
    return Object.freeze({
      set(s2, l2) { spec = s2 || null; lay = l2 || lay; still = rm(); if (raf) { cancelAnimationFrame(raf); raf = 0; }
        if (!spec) { ctx.clearRect(0, 0, cv.width, cv.height); return; } if (still) { draw(0); return; } raf = requestAnimationFrame(loop); },
      frame() { draw(still ? 0 : performance.now() - (t0 || performance.now())); },
      state: () => ({ spec, animating: !!raf, still, frames }),
      dispose() { if (raf) cancelAnimationFrame(raf); raf = 0; spec = null; } });
  }

  root.BLOOM = Object.assign(root.BLOOM || {}, { plantEnvironment: Object.freeze({ VERSION, region, showcase, isScene, keyOf, look, paint, fx, signature, mountFx, fnv }) });
})(typeof window !== "undefined" ? window : globalThis);
