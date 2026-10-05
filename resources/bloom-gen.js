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
//
// BLOOM-027B — every generated planet is a CYLINDER: it carries `topology: { wrapX: true, wrapY: false }` (the canonical
// BLOOM.geo.CYLINDER shape from BLOOM-027A), longitude wraps and latitude does not. The flat 60×40 map is one continuous
// world cut open at x = 0 / x = W − 1; a landmass, a section or a coastline may cross that cut. Everything geographic here
// goes through BLOOM.geo under that topology (components, water crossings, wrapDx seed spacing, forEachNeighbor4 region
// growth and coast detection, sectionAdjacency) — nothing in this file tests x > 0 / x < W − 1 itself — and the terrain and
// moisture noise is periodic in x by construction (§octave). There is NO seam repair pass of any kind: no column copying,
// no edge averaging, no region merging. First Bloom (authored, no `topology`) is untouched.
// Generator version: procedural World Seeds are an intentional break from pre-027B rectangular worlds — the same seed and
// params reproduce the same cylindrical world every time, but not the old rectangular one.
(function (root) {
  "use strict";
  const BLOOM = root.BLOOM;
  if (!BLOOM || !BLOOM.geo) throw new Error("bloom-gen.js needs resources/bloom-sim.js loaded first");
  const { clamp } = BLOOM.util, { components, sectionAdjacency, waterCrossings, reachableLandmasses, wrapDx, forEachNeighbor4, neighbors4 } = BLOOM.geo;
  const TOPO = BLOOM.geo.CYLINDER; // every generated planet's topology (BLOOM-027B); the planet record carries a plain copy

  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const smooth = t => t * t * (3 - 2 * t);
  const pick = (rng, arr) => arr[(rng() * arr.length) | 0];

  const DEFAULTS = { waterPct: 0, sections: 14, width: 60, height: 40, minLandmassTiles: 12, maxCrossingGap: null,
    terrainWeights: [1, 0.5, 0.25] }; // elevation octave mix: continent-scale → local-scale landforms
  // section conditions: effTemp = temperature + tempBase + latitude·tempSpan ± tempJitter/2;
  // moistureOffset = noise·moistureSpread − moistureSpread/2 + moistureBias + coastFraction·coastMoisture
  // BLOOM-010 knobs (their defaults draw no extra randomness and reproduce every earlier planet exactly):
  //   lightBias             added to every section's light (clear, cloudless skies → stronger sun)
  //   drySaltChance         chance a DRY section that is not already saline is a salt pan (evaporation leaves salt behind)
  //   basinMoisture         moisture moved downhill: each section's offset gains (lowness − 0.5) × basinMoisture, where
  //                         lowness runs from 1 (the lowest-lying section, by mean terrain height) to 0 (the highest) —
  //                         water collects in basins, so low ground (often beside the lakes) is wetter than high ground
  //   dryOffset / wetOffset a section is DRY below / WET above these moisture offsets (poor / rich soil nutrients,
  //                         salt pans, biome names); an arid world raises dryOffset so more of its land counts as dry
  //   originTemp / originMoistureOffset / originMoistureWeight  what the origin search prefers: effective temperature
  //                         (°C) and local moisture offset (0 = the sky's own moisture), and how much a moisture mismatch
  //                         counts per point against one °C of temperature mismatch; a dry world prefers a wetter offset
  //                         and weights it more, so the protected refuge is one of its wet basins
  // BLOOM-011 knobs (same rule: neutral defaults, no extra randomness unless switched on):
  //   elevationCooling      high ground is colder (air cools as it rises): each section's temperature offset gains
  //                         (lowness − 0.5) × elevationCooling °C — the lowest-lying section is warmed by half of it, the
  //                         highest cooled by half — so a cold world gets frozen uplands and milder lowlands, not just a
  //                         north–south band
  //   geothermalChance / geothermalWarmth   chance a section sits over geothermal heat (hot springs, warm ground) and is
  //                         geothermalWarmth °C warmer than its latitude and height alone would make it; a geothermal
  //                         section is never also volcanic-acid ground (its warmth is the point, not a toxic hazard)
  const CLIMATE_DEFAULTS = { temperature: -8, moisture: 45, tempBase: -25, tempSpan: 72, tempJitter: 12,
    moistureSpread: 80, moistureBias: 0, coastMoisture: 20, volcanicChance: 0.14,
    coastalSaltAbove: 0.4, coastalSaltChance: 0.5, saltChance: 0.10,
    lightBias: 0, drySaltChance: 0, basinMoisture: 0, dryOffset: -22, wetOffset: 22, originTemp: 2, originMoistureOffset: 0, originMoistureWeight: 0.2,
    elevationCooling: 0, geothermalChance: 0, geothermalWarmth: 0 };
  const LIMITS = { waterPct: [0, 90], sections: [1, 24] };

  // value-noise octave, periodic in x (BLOOM-027B). The lattice is drawn exactly as it always was — (cols + 1) × (rows + 1)
  // rng() values, row-major — so every later draw of the generator (moisture, section conditions, names) keeps its place in the
  // RNG stream. Horizontally the lattice is a RING of `cols` cells: lattice column `cols` IS column 0 (the circle closes), so the
  // last draw of each row is consumed but never read. x is a position on that circle — gx = x / W × cols, with x = W the same
  // place as x = 0 — so every grid column, x = W − 1 included, is an ordinary interior sample of one continuous field and the
  // step W − 1 → 0 is the same kind of step as any other adjacent pair (not an equality: the two columns are neighbours, not
  // the same place). Vertically nothing changed: gy = y / (H − 1) × rows is bounded, rows 0 and `rows` are the ends of the world
  // (the lattice cell is clamped on the last row — Portion 1 bug: reading past the lattice gave NaN moisture and a forced land
  // strip). The returned `at(u, y)` samples the same field at a continuous column u (any real, wrapping every W) and a grid row,
  // and exists so a test can prove the periodicity of the SAMPLER rather than compare two adjacent columns.
  // The ring is turned by LATTICE_PHASE = one third of a cell. Without it longitude zero would sit exactly on a lattice node of
  // every octave at once (the legacy rectangle had both its edges there, where the smoothstep slope is zero), and the cut would
  // be the one systematically smoothest column boundary of every world — a special column in the other direction. One third of
  // a cell puts the cut at the median interior boundary (docs/evidence/bloom-027b/lattice-phase-scan.json: terrain step 1.06× and
  // coast crossings 1.05× an ordinary boundary, rank ≈ 0.5). It is a fixed constant, not a draw, and the field stays periodic.
  const LATTICE_PHASE = 1 / 3;
  function octave(rng, cols, rows, W, H) {
    const stride = cols + 1, lat = new Float32Array(stride * (rows + 1));
    for (let i = 0; i < lat.length; i++) lat[i] = rng();
    const at = (u, y) => {
      const gx = u / W * cols + LATTICE_PHASE, gy = y / (H - 1) * rows, fl = Math.floor(gx);
      const x0 = ((fl % cols) + cols) % cols, x1 = x0 + 1 === cols ? 0 : x0 + 1, fx = smooth(gx - fl);
      const y0 = Math.min(gy | 0, rows - 1), fy = smooth(gy - y0);
      const a = lat[y0 * stride + x0], b = lat[y0 * stride + x1], c = lat[(y0 + 1) * stride + x0], d = lat[(y0 + 1) * stride + x1];
      const top = a + (b - a) * fx, bot = c + (d - c) * fx;
      return top + (bot - top) * fy;
    };
    const field = new Float32Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) field[y * W + x] = at(x, y);
    return { field, at, cols, rows, phase: LATTICE_PHASE, draws: lat.length };
  }
  // three octaves (continent / regional / local scale) mixed by `weights`; the rng draws never change. Each octave is periodic
  // in x, so their weighted sum (terrain) — and the same function's second use (moisture) — is periodic in x too.
  function elevationField(rng, W, H, weights = [1, 0.5, 0.25]) {
    const N = W * H, o1 = octave(rng, 3, 2, W, H).field, o2 = octave(rng, 6, 4, W, H).field, o3 = octave(rng, 11, 7, W, H).field;
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
  const NAME_POOLS = { cold: NAME_COLD, mild: NAME_MILD, warm: NAME_WARM, hot: NAME_HOT, wet: NAME_WET, dry: NAME_DRY, noun: NAME_NOUN };
  // `names` (BLOOM-010, optional): an archetype's own word pools, replacing any of NAME_POOLS' keys (one rng draw per
  // pick whatever a pool's length, so the rest of the planet is unchanged)
  function biomeName(rng, effTemp, dry, wet, names) {
    const P = names ? { ...NAME_POOLS, ...names } : NAME_POOLS; let pool;
    if (wet) pool = P.wet; else if (dry) pool = P.dry;
    else if (effTemp < -12) pool = P.cold; else if (effTemp < 8) pool = P.mild;
    else if (effTemp < 26) pool = P.warm; else pool = P.hot;
    return pick(rng, pool) + " " + pick(rng, P.noun);
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
    let names = null;
    if (q.names != null) {
      if (typeof q.names !== "object" || Array.isArray(q.names)) throw new Error("generatePlanet: names must be an object of word pools");
      names = {};
      for (const [k, v] of Object.entries(q.names)) {
        if (!(k in NAME_POOLS)) throw new Error(`generatePlanet: unknown names pool "${k}"`);
        if (!(Array.isArray(v) && v.length && v.every(w => typeof w === "string" && w))) throw new Error(`generatePlanet: names.${k} must be a non-empty list of words`);
        names[k] = v.slice();
      }
    }
    return { seed: q.seed, waterPct: q.waterPct, sections: q.sections, width: q.width, height: q.height,
             minLandmassTiles: q.minLandmassTiles, maxCrossingGap: q.maxCrossingGap, terrainWeights: q.terrainWeights.slice(), climate,
             ...(names ? { names } : {}) }; // (absent unless given → earlier planets' params are unchanged)
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
    // 2. landmasses (cylindrical: land continuing from x = W − 1 onto x = 0 is ONE landmass); islets below minLandmassTiles
    //    become shallow water (a 1–4 tile "section" is unreadable)
    let lm = components(isLand, W, H, TOPO);
    if (lm.sizes.some(n => n < P.minLandmassTiles)) {
      for (let i = 0; i < N; i++) if (isLand[i] && lm.sizes[lm.id[i]] < P.minLandmassTiles) isLand[i] = 0;
      lm = components(isLand, W, H, TOPO);
    }
    // 2b. optional reachability constraint: drop landmasses the largest one cannot reach by water crossing
    if (P.maxCrossingGap !== null && lm.sizes.length > 1) {
      const big = lm.sizes.indexOf(Math.max(...lm.sizes));
      const cr = waterCrossings(Array.from(isLand, v => v ? 0 : -1), W, H, P.maxCrossingGap, TOPO); // (a strait may cross longitude zero)
      const keep = reachableLandmasses(big, cr.links);
      if (keep.size < lm.sizes.length) {
        for (let i = 0; i < N; i++) if (isLand[i] && !keep.has(lm.id[i])) isLand[i] = 0;
        lm = components(isLand, W, H, TOPO);
      }
    }
    const comp = lm.id, compSize = lm.sizes, nComp = compSize.length;
    if (!nComp) throw new Error(`generatePlanet: seed ${seed} left no landmass ≥ ${P.minLandmassTiles} tiles`);
    const landCount = compSize.reduce((a, b) => a + b, 0);
    // 3. section seeds: ≥1 per landmass, the rest by land area (farthest point within the landmass; the horizontal distance is
    //    the shorter way round the cylinder, so a tile at x = 1 knows a seed at x = 59 is two columns away)
    const K = clamp(P.sections, Math.max(1, nComp), 24);
    const tilesOf = c => { const out = []; for (let t = 0; t < N; t++) if (comp[t] === c) out.push(t); return out; };
    const seeds = [];
    for (let c = 0; c < nComp; c++) seeds.push({ tile: pick(rng, tilesOf(c)), comp: c });
    let remaining = K - seeds.length;
    while (remaining > 0) {
      let r = rng() * landCount, c = 0; for (; c < nComp; c++) { r -= compSize[c]; if (r <= 0) break; } c = Math.min(c, nComp - 1);
      const tiles = tilesOf(c), cs = seeds.filter(s => s.comp === c); let bestT = tiles[0], bestD = -1;
      for (const t of tiles) { const x = t % W, y = (t / W) | 0; let md = Infinity;
        for (const s of cs) { const sx = s.tile % W, sy = (s.tile / W) | 0; const d = wrapDx(x, sx, W, TOPO) ** 2 + (y - sy) ** 2; if (d < md) md = d; }
        if (md > bestD) { bestD = md; bestT = t; } }
      seeds.push({ tile: bestT, comp: c }); remaining--;
    }
    const SECN = seeds.length;
    // 4. geodesic multi-source BFS over land only, through BLOOM.geo's cylindrical cardinal neighbours (west, east, north, south —
    //    the historical order) → every section is contiguous and never spans water. An owner that reaches x = W − 1 simply
    //    continues onto x = 0: ONE section id on both sides of the flat cut, decided here at growth time. Two different owners
    //    meeting at the cut stay two sections (geographic neighbours). Nothing merges ids afterwards.
    const owner = new Int16Array(N).fill(-1), q = [];
    seeds.forEach((s, i) => { owner[s.tile] = i; q.push(s.tile); });
    for (let head = 0; head < q.length; head++) {
      const t = q[head], o = owner[t];
      forEachNeighbor4(t, W, H, TOPO, u => { if (isLand[u] && owner[u] < 0) { owner[u] = o; q.push(u); } });
    }
    const tilemap = new Int16Array(N);
    for (let i = 0; i < N; i++) tilemap[i] = isLand[i] ? owner[i] : -1;
    // 5. per-section conditions from latitude + noise (+ coastal moisture/salt). A tile is coastal when one of its cylindrical
    //    cardinal neighbours is water: west of x = 0 is x = W − 1 (and vice versa), so the flat cut itself is never a coast;
    //    the top and bottom rows have no neighbour beyond the map and are coastal only beside real water, as before.
    const cent = Array.from({ length: SECN }, () => ({ x: 0, y: 0, n: 0, coast: 0, elev: 0 }));
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const t = y * W + x, o = tilemap[t]; if (o < 0) continue; const c = cent[o]; c.x += x; c.y += y; c.n++; c.elev += field[t];
      if (neighbors4(t, W, H, TOPO).some(u => tilemap[u] < 0)) c.coast++;
    }
    const moistField = elevationField(rng, W, H);
    const CL = P.climate, gTemp = CL.temperature;
    // lowness (for basinMoisture): 1 = lowest-lying section by mean terrain height … 0 = highest (ties: lower index first)
    const byElev = cent.map((c, i) => [c.n ? c.elev / c.n : 0, i]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const lowness = new Float64Array(SECN); byElev.forEach(([, i], r) => { lowness[i] = SECN > 1 ? 1 - r / (SECN - 1) : 0.5; });
    const sections = seeds.map((s, i) => {
      const c = cent[i]; const yN = c.n ? (c.y / c.n) / (H - 1) : ((s.tile / W | 0) / (H - 1));
      const coastFrac = c.n ? c.coast / c.n : 0;
      // (the elevation term is exactly 0 at the default, so earlier planets' offsets round identically; the geothermal
      // draw short-circuits at chance 0, so the rng sequence is unchanged)
      const geothermal = CL.geothermalChance > 0 && rng() < CL.geothermalChance;
      const tempOffset = Math.round((CL.tempBase + yN * CL.tempSpan) + (rng() - 0.5) * CL.tempJitter
        + (lowness[i] - 0.5) * CL.elevationCooling + (geothermal ? CL.geothermalWarmth : 0));
      const effTemp = gTemp + tempOffset;
      const moistureOffset = clamp(Math.round((moistField[s.tile] * CL.moistureSpread - CL.moistureSpread / 2) + CL.moistureBias + coastFrac * CL.coastMoisture
        + (lowness[i] - 0.5) * CL.basinMoisture), -45, 45);
      const dry = moistureOffset < CL.dryOffset, wet = moistureOffset > CL.wetOffset, hot = effTemp > 26, cold = effTemp < -12;
      // strong sun (→ radiation) follows the climate's own heat; geothermal warmth comes from below, not from the sky
      const sunHot = geothermal ? effTemp - CL.geothermalWarmth > 26 : hot;
      const volcanic = !cold && rng() < CL.volcanicChance && !geothermal; // (draw first: the sequence matches when off)
      const salt = (coastFrac > CL.coastalSaltAbove && rng() < CL.coastalSaltChance) || rng() < CL.saltChance
        || (CL.drySaltChance > 0 && dry && rng() < CL.drySaltChance); // (short-circuit: no draw at the default 0)
      const local = {
        tempOffset, moistureOffset,
        light: clamp(Math.round(30 + yN * 55 + (rng() - 0.5) * 25 + CL.lightBias), 10, 100),
        ph: volcanic ? +(4 + rng() * 1.2).toFixed(1) : salt ? +(7.8 + rng() * 0.9).toFixed(1) : +(6 + rng() * 1.4).toFixed(1),
        salinity: salt ? Math.round(55 + rng() * 35) : Math.round(rng() * 12),
        toxicity: volcanic ? Math.round(40 + rng() * 35) : Math.round(rng() * 12),
        radiation: Math.round((sunHot ? 40 : 10) + rng() * 25),
        nutrients: wet ? Math.round(55 + rng() * 20) : dry ? Math.round(12 + rng() * 18) : Math.round(35 + rng() * 22)
      };
      return { id: "sec_" + i, name: biomeName(rng, effTemp, dry, wet, P.names), kind: "land", area: c.n, landmass: s.comp, isOrigin: false, neighbors: [], local,
        ...(geothermal ? { geothermal: true } : {}) }; // (a descriptive tag only — the engine reads `local`; absent unless switched on)
    });
    // 6. origin: temperate, low-stress section on the largest landmass (the protected refuge)
    let biggest = 0; for (let c = 1; c < nComp; c++) if (compSize[c] > compSize[biggest]) biggest = c;
    let origin = -1, best = Infinity;
    sections.forEach((sec, i) => {
      if (sec.landmass !== biggest) return;
      const L = sec.local, eff = gTemp + L.tempOffset;
      const score = Math.abs(eff - CL.originTemp) + L.toxicity * 0.3 + L.radiation * 0.15 + L.salinity * 0.2 + Math.abs(L.moistureOffset - CL.originMoistureOffset) * CL.originMoistureWeight;
      if (score < best) { best = score; origin = i; }
    });
    sections[origin].isOrigin = true;
    // 7. neighbours from the generated geography (never authored/guessed); two different sections touching only across the
    //    cut are real neighbours
    sectionAdjacency(tilemap, W, H, SECN, TOPO).forEach((nb, i) => { sections[i].neighbors = nb.map(j => sections[j].id); });

    return {
      id: "proc_" + seed, name: PLANET_STEMS[seed % PLANET_STEMS.length] + "-" + (seed % 1000), procedural: true, params: P,
      gridWidth: W, gridHeight: H, topology: { wrapX: TOPO.wrapX, wrapY: TOPO.wrapY }, // BLOOM-027B: a cylinder (plain data, = BLOOM.geo.CYLINDER)
      winThreshold: 0.70, origin: sections[origin].id,
      globalClimate: { temperature: gTemp, moisture: CL.moisture, o2: 8, co2: 60, pressure: 90 },
      sections,
      tilemap: Array.from(tilemap),                               // section index per tile, -1 = water
      waterDepth: Array.from(waterDepth, v => v),                 // render-only shading (0 shallow … 1 deep)
    };
  }

  root.BLOOM.generatePlanet = generatePlanet;
  root.BLOOM.gen = { generatePlanet, normalizeParams, DEFAULTS, CLIMATE_DEFAULTS, mulberry32,
    TOPOLOGY: TOPO, noise: { octave, elevationField } }; // noise: narrowly scoped test access to the periodic sampler (not a product API)
})(typeof window !== "undefined" ? window : globalThis);
