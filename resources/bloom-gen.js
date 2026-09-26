// BLOOM — shared procedural surface generator (BLOOM-003). Moved out of demos/demo-surface.html
// (Portion 1, "Generator B"); emits the SAME planet model BLOOM.createSim consumes: sections with
// `local` signals, plus an explicit `tilemap` (section index per tile, -1 = water).
//
//   BLOOM.generatePlanet({ seed, waterPct, sections, width, height, minLandmassTiles, maxCrossingGap, terrainWeights, climate })
//
// climate (BLOOM-005, optional): the condition-layout knobs archetypes set (content/archetypes.js).
// Any key left out uses CLIMATE_DEFAULTS, which reproduce the Portion 1 layout exactly.
//
// maxCrossingGap (BLOOM-004, default null = off): when set, any landmass the main landmass cannot
// reach through water crossings of at most that many tiles is turned into water, so every land tile
// is reachable with the strongest Spread (bible §9). Product callers pass config.crossing.maxGap.
//
// Deterministic: everything is drawn from mulberry32(seed) in a fixed order — no Math.random.
// Needs resources/bloom-sim.js first (shared geometry helpers).
(function (root) {
  "use strict";
  const BLOOM = root.BLOOM;
  if (!BLOOM || !BLOOM.geo) throw new Error("bloom-gen.js needs resources/bloom-sim.js loaded first");
  const { clamp } = BLOOM.util, { components, sectionAdjacency, waterCrossings, reachableLandmasses } = BLOOM.geo;

  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const smooth = t => t * t * (3 - 2 * t);
  const pick = (rng, arr) => arr[(rng() * arr.length) | 0];

  const DEFAULTS = { waterPct: 0, sections: 14, width: 60, height: 40, minLandmassTiles: 12, maxCrossingGap: null,
    terrainWeights: [1, 0.5, 0.25] }; // elevation octave mix: continent-scale → local-scale landforms
  // section conditions: effTemp = temperature + tempBase + latitude·tempSpan ± tempJitter/2;
  // moistureOffset = noise·moistureSpread − moistureSpread/2 + moistureBias + coastFraction·coastMoisture
  const CLIMATE_DEFAULTS = { temperature: -8, moisture: 45, tempBase: -25, tempSpan: 72, tempJitter: 12,
    moistureSpread: 80, moistureBias: 0, coastMoisture: 20, volcanicChance: 0.14,
    coastalSaltAbove: 0.4, coastalSaltChance: 0.5, saltChance: 0.10 };
  const LIMITS = { waterPct: [0, 90], sections: [1, 24] };

  // value-noise octave: lattice of rng() values, smoothstep-interpolated over the grid
  function octave(rng, cols, rows, W, H) {
    const lat = new Float32Array((cols + 1) * (rows + 1));
    for (let i = 0; i < lat.length; i++) lat[i] = rng();
    const out = new Float32Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const gx = x / (W - 1) * cols, gy = y / (H - 1) * rows;
      // clamp the lattice cell: on the last row/column gx = cols exactly, and reading cell cols+1 ran
      // past the lattice (Portion 1 bug: NaN on the bottom row → NaN moisture, a forced land strip)
      const x0 = Math.min(gx | 0, cols - 1), y0 = Math.min(gy | 0, rows - 1), fx = smooth(gx - x0), fy = smooth(gy - y0);
      const a = lat[y0 * (cols + 1) + x0], b = lat[y0 * (cols + 1) + x0 + 1];
      const c = lat[(y0 + 1) * (cols + 1) + x0], d = lat[(y0 + 1) * (cols + 1) + x0 + 1];
      const top = a + (b - a) * fx, bot = c + (d - c) * fx;
      out[y * W + x] = top + (bot - top) * fy;
    }
    return out;
  }
  // three octaves (continent / regional / local scale) mixed by `weights`; the rng draws never change
  function elevationField(rng, W, H, weights = [1, 0.5, 0.25]) {
    const N = W * H, o1 = octave(rng, 3, 2, W, H), o2 = octave(rng, 6, 4, W, H), o3 = octave(rng, 11, 7, W, H);
    const f = new Float32Array(N); let mn = Infinity, mx = -Infinity; const [a, b, c] = weights;
    for (let i = 0; i < N; i++) { const v = o1[i] * a + o2[i] * b + o3[i] * c; f[i] = v; if (v < mn) mn = v; if (v > mx) mx = v; }
    const r = (mx - mn) || 1; for (let i = 0; i < N; i++) f[i] = (f[i] - mn) / r;
    return f;
  }

  const NAME_COLD = ["Frost", "Glacier", "Rime", "Tundra", "Hoar", "Pale", "Snow"];
  const NAME_MILD = ["Green", "Moss", "Fern", "Mild", "Verdant", "Heath"];
  const NAME_WARM = ["Amber", "Sun", "Gold", "Saffron", "Sienna"];
  const NAME_HOT = ["Cinder", "Ash", "Ember", "Scorch", "Basalt"];
  const NAME_WET = ["River", "Marsh", "Fen", "Bog", "Tidal", "Mire"];
  const NAME_DRY = ["Dust", "Salt", "Glass", "Bone", "Chalk"];
  const NAME_NOUN = ["Basin", "Flats", "Reach", "Steppe", "Shelf", "Expanse", "Vale", "Plain", "Rise", "Span", "Pan", "Fields", "Hollow", "Wastes"];
  const PLANET_STEMS = ["Vesper", "Ymir", "Tharsis", "Eos", "Umbra", "Hollow", "Atlas", "Mistral", "Coriol", "Pallas", "Nyx", "Borea"];
  function biomeName(rng, effTemp, dry, wet) {
    let pool;
    if (wet) pool = NAME_WET; else if (dry) pool = NAME_DRY;
    else if (effTemp < -12) pool = NAME_COLD; else if (effTemp < 8) pool = NAME_MILD;
    else if (effTemp < 26) pool = NAME_WARM; else pool = NAME_HOT;
    return pick(rng, pool) + " " + pick(rng, NAME_NOUN);
  }

  function normalizeParams(p = {}) {
    const q = { ...DEFAULTS, ...p };
    if (!Number.isFinite(q.seed)) throw new Error("generatePlanet: an explicit numeric seed is required");
    q.seed = q.seed >>> 0;
    for (const k of ["waterPct", "sections", "width", "height", "minLandmassTiles"])
      if (!Number.isFinite(q[k])) throw new Error(`generatePlanet: ${k} must be a number`);
    q.waterPct = clamp(q.waterPct, ...LIMITS.waterPct); q.sections = clamp(Math.round(q.sections), ...LIMITS.sections);
    q.width = Math.round(q.width); q.height = Math.round(q.height); q.minLandmassTiles = Math.max(1, Math.round(q.minLandmassTiles));
    if (q.width < 8 || q.height < 8) throw new Error("generatePlanet: grid must be at least 8×8");
    if (!(Array.isArray(q.terrainWeights) && q.terrainWeights.length === 3 && q.terrainWeights.every(w => Number.isFinite(w) && w >= 0) && q.terrainWeights.some(w => w > 0)))
      throw new Error("generatePlanet: terrainWeights must be three non-negative numbers (not all 0)");
    if (q.maxCrossingGap !== null && !(Number.isInteger(q.maxCrossingGap) && q.maxCrossingGap >= 1))
      throw new Error("generatePlanet: maxCrossingGap must be null or a positive integer");
    const climate = { ...CLIMATE_DEFAULTS, ...(p.climate || {}) };
    for (const [k, v] of Object.entries(climate)) {
      if (!(k in CLIMATE_DEFAULTS)) throw new Error(`generatePlanet: unknown climate key "${k}"`);
      if (!Number.isFinite(v)) throw new Error(`generatePlanet: climate.${k} must be a number`);
    }
    return { seed: q.seed, waterPct: q.waterPct, sections: q.sections, width: q.width, height: q.height,
             minLandmassTiles: q.minLandmassTiles, maxCrossingGap: q.maxCrossingGap, terrainWeights: q.terrainWeights.slice(), climate };
  }

  function generatePlanet(params) {
    const P = normalizeParams(params), { seed, waterPct, width: W, height: H } = P, N = W * H;
    const rng = mulberry32(seed);
    // 1. water mask: threshold a noise elevation field at the requested water percentile
    const field = elevationField(rng, W, H, P.terrainWeights);
    const waterDepth = new Float32Array(N), isLand = new Uint8Array(N);
    let threshold = -1;
    if (waterPct > 0) { const sorted = Float32Array.from(field).sort(); threshold = sorted[clamp((waterPct / 100 * N) | 0, 0, N - 1)]; }
    for (let i = 0; i < N; i++) {
      if (waterPct > 0 && field[i] < threshold) waterDepth[i] = clamp((threshold - field[i]) / (threshold || 1), 0, 1);
      else isLand[i] = 1;
    }
    // 2. landmasses; islets below minLandmassTiles become shallow water (a 1–4 tile "section" is unreadable)
    let lm = components(isLand, W, H);
    if (lm.sizes.some(n => n < P.minLandmassTiles)) {
      for (let i = 0; i < N; i++) if (isLand[i] && lm.sizes[lm.id[i]] < P.minLandmassTiles) isLand[i] = 0;
      lm = components(isLand, W, H);
    }
    // 2b. optional reachability constraint: drop landmasses the largest one cannot reach by water crossing
    if (P.maxCrossingGap !== null && lm.sizes.length > 1) {
      const big = lm.sizes.indexOf(Math.max(...lm.sizes));
      const cr = waterCrossings(Array.from(isLand, v => v ? 0 : -1), W, H, P.maxCrossingGap);
      const keep = reachableLandmasses(big, cr.links);
      if (keep.size < lm.sizes.length) {
        for (let i = 0; i < N; i++) if (isLand[i] && !keep.has(lm.id[i])) isLand[i] = 0;
        lm = components(isLand, W, H);
      }
    }
    const comp = lm.id, compSize = lm.sizes, nComp = compSize.length;
    if (!nComp) throw new Error(`generatePlanet: seed ${seed} left no landmass ≥ ${P.minLandmassTiles} tiles`);
    const landCount = compSize.reduce((a, b) => a + b, 0);
    // 3. section seeds: ≥1 per landmass, the rest by land area (farthest point within the landmass)
    const K = clamp(P.sections, Math.max(1, nComp), 24);
    const tilesOf = c => { const out = []; for (let t = 0; t < N; t++) if (comp[t] === c) out.push(t); return out; };
    const seeds = [];
    for (let c = 0; c < nComp; c++) seeds.push({ tile: pick(rng, tilesOf(c)), comp: c });
    let remaining = K - seeds.length;
    while (remaining > 0) {
      let r = rng() * landCount, c = 0; for (; c < nComp; c++) { r -= compSize[c]; if (r <= 0) break; } c = Math.min(c, nComp - 1);
      const tiles = tilesOf(c), cs = seeds.filter(s => s.comp === c); let bestT = tiles[0], bestD = -1;
      for (const t of tiles) { const x = t % W, y = (t / W) | 0; let md = Infinity;
        for (const s of cs) { const sx = s.tile % W, sy = (s.tile / W) | 0; const d = (x - sx) ** 2 + (y - sy) ** 2; if (d < md) md = d; }
        if (md > bestD) { bestD = md; bestT = t; } }
      seeds.push({ tile: bestT, comp: c }); remaining--;
    }
    const SECN = seeds.length;
    // 4. geodesic multi-source BFS over land only → every section is contiguous and never spans water
    const owner = new Int16Array(N).fill(-1), q = [];
    seeds.forEach((s, i) => { owner[s.tile] = i; q.push(s.tile); });
    for (let head = 0; head < q.length; head++) {
      const t = q[head], o = owner[t], x = t % W, y = (t / W) | 0;
      if (x > 0 && isLand[t - 1] && owner[t - 1] < 0) { owner[t - 1] = o; q.push(t - 1); }
      if (x < W - 1 && isLand[t + 1] && owner[t + 1] < 0) { owner[t + 1] = o; q.push(t + 1); }
      if (y > 0 && isLand[t - W] && owner[t - W] < 0) { owner[t - W] = o; q.push(t - W); }
      if (y < H - 1 && isLand[t + W] && owner[t + W] < 0) { owner[t + W] = o; q.push(t + W); }
    }
    const tilemap = new Int16Array(N);
    for (let i = 0; i < N; i++) tilemap[i] = isLand[i] ? owner[i] : -1;
    // 5. per-section conditions from latitude + noise (+ coastal moisture/salt)
    const cent = Array.from({ length: SECN }, () => ({ x: 0, y: 0, n: 0, coast: 0 }));
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const o = tilemap[y * W + x]; if (o < 0) continue; const c = cent[o]; c.x += x; c.y += y; c.n++;
      if ((x > 0 && tilemap[y * W + x - 1] < 0) || (x < W - 1 && tilemap[y * W + x + 1] < 0) ||
          (y > 0 && tilemap[(y - 1) * W + x] < 0) || (y < H - 1 && tilemap[(y + 1) * W + x] < 0)) c.coast++;
    }
    const moistField = elevationField(rng, W, H);
    const CL = P.climate, gTemp = CL.temperature;
    const sections = seeds.map((s, i) => {
      const c = cent[i]; const yN = c.n ? (c.y / c.n) / (H - 1) : ((s.tile / W | 0) / (H - 1));
      const coastFrac = c.n ? c.coast / c.n : 0;
      const tempOffset = Math.round((CL.tempBase + yN * CL.tempSpan) + (rng() - 0.5) * CL.tempJitter);
      const effTemp = gTemp + tempOffset;
      const moistureOffset = clamp(Math.round((moistField[s.tile] * CL.moistureSpread - CL.moistureSpread / 2) + CL.moistureBias + coastFrac * CL.coastMoisture), -45, 45);
      const dry = moistureOffset < -22, wet = moistureOffset > 22, hot = effTemp > 26, cold = effTemp < -12;
      const volcanic = !cold && rng() < CL.volcanicChance;
      const salt = (coastFrac > CL.coastalSaltAbove && rng() < CL.coastalSaltChance) || rng() < CL.saltChance;
      const local = {
        tempOffset, moistureOffset,
        light: clamp(Math.round(30 + yN * 55 + (rng() - 0.5) * 25), 10, 100),
        ph: volcanic ? +(4 + rng() * 1.2).toFixed(1) : salt ? +(7.8 + rng() * 0.9).toFixed(1) : +(6 + rng() * 1.4).toFixed(1),
        salinity: salt ? Math.round(55 + rng() * 35) : Math.round(rng() * 12),
        toxicity: volcanic ? Math.round(40 + rng() * 35) : Math.round(rng() * 12),
        radiation: Math.round((hot ? 40 : 10) + rng() * 25),
        nutrients: wet ? Math.round(55 + rng() * 20) : dry ? Math.round(12 + rng() * 18) : Math.round(35 + rng() * 22)
      };
      return { id: "sec_" + i, name: biomeName(rng, effTemp, dry, wet), kind: "land", area: c.n, landmass: s.comp, isOrigin: false, neighbors: [], local };
    });
    // 6. origin: temperate, low-stress section on the largest landmass (the protected refuge)
    let biggest = 0; for (let c = 1; c < nComp; c++) if (compSize[c] > compSize[biggest]) biggest = c;
    let origin = -1, best = Infinity;
    sections.forEach((sec, i) => {
      if (sec.landmass !== biggest) return;
      const L = sec.local, eff = gTemp + L.tempOffset;
      const score = Math.abs(eff - 2) + L.toxicity * 0.3 + L.radiation * 0.15 + L.salinity * 0.2 + Math.abs(L.moistureOffset) * 0.2;
      if (score < best) { best = score; origin = i; }
    });
    sections[origin].isOrigin = true;
    // 7. neighbours from the generated geography (never authored/guessed)
    sectionAdjacency(tilemap, W, H, SECN).forEach((nb, i) => { sections[i].neighbors = nb.map(j => sections[j].id); });

    return {
      id: "proc_" + seed, name: PLANET_STEMS[seed % PLANET_STEMS.length] + "-" + (seed % 1000), procedural: true, params: P,
      gridWidth: W, gridHeight: H, winThreshold: 0.70, origin: sections[origin].id,
      globalClimate: { temperature: gTemp, moisture: CL.moisture, o2: 8, co2: 60, pressure: 90 },
      sections,
      tilemap: Array.from(tilemap),                               // section index per tile, -1 = water
      waterDepth: Array.from(waterDepth, v => v),                 // render-only shading (0 shallow … 1 deep)
    };
  }

  root.BLOOM.generatePlanet = generatePlanet;
  root.BLOOM.gen = { generatePlanet, normalizeParams, DEFAULTS, CLIMATE_DEFAULTS, mulberry32 };
})(typeof window !== "undefined" ? window : globalThis);
