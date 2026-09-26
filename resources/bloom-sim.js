// BLOOM — shared simulation engine (no DOM). Extracted from demos/demo-run.html (BLOOM-002);
// water / impassable terrain + shared geometry added in BLOOM-003.
// createSim(planet, config, traits, {rng}) builds one run: section layout, the 4-category
// evaluation, the tick (spread / die-back / recovery / economy / bubbles / win), and the
// upgrade effects. All numbers come from `config`; all content from `planet` + `traits`.
// Classic script → works over file://, and loads in Node via tools/sim-check.js.
//
// ⚠ tools/golden/first_bloom.json pins this file's behavior bit-for-bit under a seeded RNG.
// Keep the order of rng() calls and arithmetic stable unless a retune is intended
// (then regenerate the golden with `node tools/sim-check.js --write` and say so in the commit).
(function (root) {
  "use strict";
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, t) => a + (b - a) * t;
  // smooth "band" membership: 1 inside [lo,hi], ramps to 0 over `soft` beyond each edge
  function band(v, lo, hi, soft) {
    if (v >= lo && v <= hi) return 1;
    const d = v < lo ? lo - v : v - hi;
    return clamp(1 - d / soft, 0, 1);
  }
  // ramp: 1 while v<=limit, →0 over `soft` above limit
  const overLimit = (v, limit, soft) => v <= limit ? 1 : clamp(1 - (v - limit) / soft, 0, 1);

  const BAR = 0, LIV = 1, DEAD = 2;

  // weighted Voronoi from per-section `center` seeds; weights nudge toward each section's area share
  function growVoronoi(sections, W, H, L) {
    const N = W * H;
    const cx = sections.map(s => s.center.x * W), cy = sections.map(s => s.center.y * H);
    const aSum = sections.reduce((a, s) => a + s.area, 0), target = sections.map(s => s.area / aSum * N);
    const w = new Float64Array(sections.length), map = new Int16Array(N), cnt = new Int32Array(sections.length), CAP = L.weightCap;
    for (let it = 0; it < L.iterations; it++) {
      cnt.fill(0);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        let best = 0, bd = Infinity; const px = x + .5, py = y + .5;
        for (let i = 0; i < sections.length; i++) { const dx = px - cx[i], dy = py - cy[i], d = Math.sqrt(dx * dx + dy * dy) - w[i]; if (d < bd) { bd = d; best = i; } }
        map[y * W + x] = best; cnt[best]++;
      }
      let me = 0; for (let i = 0; i < sections.length; i++) { const e = target[i] - cnt[i]; w[i] = clamp(w[i] + e * L.weightRate, -CAP, CAP); if (Math.abs(e) > me) me = Math.abs(e); }
      if (me < L.stopWithinTiles) break;
    }
    return map;
  }

  // ---- shared geometry (4-neighbour grid). Used by the engine, generator, validator and demos.
  // components(mask) labels connected runs of mask tiles; ids follow first-tile scan order.
  function components(mask, W, H) {
    const N = W * H, id = new Int32Array(N).fill(-1), sizes = [];
    for (let s = 0; s < N; s++) {
      if (!mask[s] || id[s] >= 0) continue;
      const c = sizes.length; let n = 0; const st = [s]; id[s] = c;
      while (st.length) { const t = st.pop(); n++; const x = t % W, y = (t / W) | 0;
        if (x > 0 && mask[t - 1] && id[t - 1] < 0) { id[t - 1] = c; st.push(t - 1); }
        if (x < W - 1 && mask[t + 1] && id[t + 1] < 0) { id[t + 1] = c; st.push(t + 1); }
        if (y > 0 && mask[t - W] && id[t - W] < 0) { id[t - W] = c; st.push(t - W); }
        if (y < H - 1 && mask[t + W] && id[t + W] < 0) { id[t + W] = c; st.push(t + W); } }
      sizes.push(n);
    }
    return { id, sizes };
  }
  // adjacency between land sections from actual geography (tilemap value -1 = impassable)
  function sectionAdjacency(tilemap, W, H, SC) {
    const nb = Array.from({ length: SC }, () => new Set());
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const a = tilemap[y * W + x]; if (a < 0) continue;
      if (x + 1 < W) { const b = tilemap[y * W + x + 1]; if (b >= 0 && b !== a) { nb[a].add(b); nb[b].add(a); } }
      if (y + 1 < H) { const b = tilemap[(y + 1) * W + x]; if (b >= 0 && b !== a) { nb[a].add(b); nb[b].add(a); } }
    }
    return nb.map(set => [...set].sort((p, q) => p - q));
  }
  // number of separate pieces each section's tiles form (1 = contiguous, 0 = empty)
  function sectionPieces(tilemap, W, H, SC) {
    return Array.from({ length: SC }, (_, k) => components(Array.from(tilemap, v => v === k ? 1 : 0), W, H).sizes.length);
  }

  // ---- planet → tile layout. A planet either supplies `tilemap` (section index per tile, -1 =
  // impassable: water/void/lava) or gets a weighted-Voronoi layout from section `center`s.
  // Sections may be kind "land" (default) or impassable kinds; the simulation only ever sees land
  // sections, and every impassable tile is -1. An all-land Voronoi planet (First Bloom) takes the
  // original path unchanged.
  const KINDS = new Set(["land", "water", "void", "lava"]);
  function resolveLayout(planet, config) {
    const W = planet.gridWidth, H = planet.gridHeight, N = W * H, ALL = planet.sections;
    for (const s of ALL) if (s.kind !== undefined && !KINDS.has(s.kind))
      throw new Error(`bloom-sim: section ${s.id} has unknown kind "${s.kind}"`);
    let full;
    if (planet.tilemap !== undefined) {
      const tm = planet.tilemap;
      if (!tm || tm.length !== N) throw new Error(`bloom-sim: tilemap must have ${N} entries`);
      for (let i = 0; i < N; i++) if (!Number.isInteger(tm[i]) || tm[i] < -1 || tm[i] >= ALL.length)
        throw new Error(`bloom-sim: tilemap[${i}] = ${tm[i]} is not a section index or -1`);
      full = Int16Array.from(tm);
    } else full = growVoronoi(ALL, W, H, config.layout);
    const isLand = ALL.map(s => (s.kind || "land") === "land");
    let hasImpassable = isLand.includes(false);
    for (let i = 0; i < N && !hasImpassable; i++) if (full[i] < 0) hasImpassable = true;
    if (!hasImpassable) return { tilemap: full, sections: ALL, impassable: [] };
    const landIdx = []; let k = 0; for (const l of isLand) landIdx.push(l ? k++ : -1);
    const tilemap = new Int16Array(N);
    for (let i = 0; i < N; i++) tilemap[i] = full[i] < 0 ? -1 : landIdx[full[i]];
    return { tilemap, sections: ALL.filter((_, i) => isLand[i]), impassable: ALL.filter((_, i) => !isLand[i]) };
  }

  function createSim(planet, config, traits, opts = {}) {
    const rng = opts.rng || Math.random;
    const C = config, CAT = C.categories;
    const W = planet.gridWidth, H = planet.gridHeight, N = W * H;
    // SEC = land sections only; TILEMAP holds their indices, -1 for water/void/lava
    const layout = resolveLayout(planet, C), TILEMAP = layout.tilemap, SEC = layout.sections, SC = SEC.length;
    const SIDX = Object.fromEntries(SEC.map((s, i) => [s.id, i]));
    const ORIGIN = SIDX[planet.origin];
    if (ORIGIN === undefined) throw new Error(`bloom-sim: origin "${planet.origin}" is not a land section`);
    const AREA = new Int32Array(SC), CENT = SEC.map(() => ({ x: 0, y: 0, n: 0 })), SEC_TILES = SEC.map(() => []), LAND_TILES = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const o = TILEMAP[y * W + x]; if (o < 0) continue; AREA[o]++; SEC_TILES[o].push(y * W + x); LAND_TILES.push(y * W + x); const c = CENT[o]; c.x += x; c.y += y; c.n++; }
    SEC.forEach((s, i) => { if (!AREA[i]) throw new Error(`bloom-sim: land section ${s.id} has no tiles`); });
    CENT.forEach(c => { c.x = c.x / c.n + .5; c.y = c.y / c.n + .5; });
    const LAND = LAND_TILES.length; // win/coverage denominator: colonizable tiles only (bible §9)
    const NBRS = sectionAdjacency(TILEMAP, W, H, SC); // from actual geography, never from authored lists
    const winAt = planet.winThreshold ?? C.win;

    // genome + global sky + terraform counts, shaped by the trait catalogue
    const traitById = Object.fromEntries(traits.map(t => [t.id, t]));
    const genome = {};
    for (const t of traits) {
      const e = t.effect;
      if (e.type === "tempPoint" || e.type === "level") genome[e.stat] = 0;
      else if (e.type === "waterArm" && !("waterArm" in genome)) { genome.waterArm = null; genome.waterPts = 0; }
    }
    const sky = { temp: planet.globalClimate.temperature, moist: planet.globalClimate.moisture };
    const tf = Object.fromEntries(traits.filter(t => t.effect.type === "sky").map(t => [t.id, 0]));
    const lvl = k => genome[k] || 0;

    function derived() {
      const s = C.scales, b = C.genomeBase;
      const waterPos = b.waterPos + (genome.waterArm === "wet" ? +1 : genome.waterArm === "dry" ? -1 : 0) * lvl("waterPts") * s.waterShiftPerPt;
      return {
        tempFloor: b.tempFloor - lvl("cold") * s.degPerTempPoint,
        tempCeil: b.tempCeil + lvl("heat") * s.degPerTempPoint,
        waterPos, waterTol: b.waterTol + lvl("waterPts") * s.waterTolPerPt,
        saltTol: b.saltTol + lvl("salt") * s.saltPerPt,
        radTol: b.radTol + lvl("rad") * s.radPerPt,
        toxTol: b.toxTol
      };
    }

    const T = CAT.Temperature, Wt = CAT.Water, So = CAT.Soil, Hz = CAT.Hazard, Li = CAT.light;
    const tempWord = (effT, d) => effT < d.tempFloor - T.freezingBeyond ? "freezing" : effT < d.tempFloor + T.coldWithin ? "cold"
      : effT > d.tempCeil + T.scorchingBeyond ? "scorching" : effT > d.tempCeil - T.hotWithin ? "hot" : "suitable";
    const waterWord = (m, d) => { const lo = d.waterPos - d.waterTol, hi = d.waterPos + d.waterTol;
      return m < lo - Wt.parchedBeyond ? "parched" : m < lo + Wt.dryWithin ? "dry" : m > hi + Wt.floodedBeyond ? "flooded" : m > hi - Wt.wetWithin ? "wet" : "suitable"; };
    const terraformable = { Temperature: T.terraformable, Water: Wt.terraformable, Soil: So.terraformable, Hazard: Hz.terraformable };

    // raw signals → gates → the four player-facing categories + one limiting factor (bible §5)
    function evaluate(i) {
      const L = SEC[i].local, d = derived();
      const effT = sky.temp + L.tempOffset, effM = sky.moist + L.moistureOffset;
      const tempF = band(effT, d.tempFloor, d.tempCeil, T.soft);
      const waterF = band(effM, d.waterPos - d.waterTol, d.waterPos + d.waterTol, Wt.soft);
      const saltF = overLimit(L.salinity, d.saltTol, So.saltSoft);
      const phF = (L.ph < So.phMin || L.ph > So.phMax) ? overLimit(Math.max(So.phMin - L.ph, L.ph - So.phMax, 0), 0, So.phSoft) : 1;
      const soilGate = Math.min(saltF, phF);
      const nutrientMod = L.nutrients < So.nutrientFloor ? lerp(So.nutrientMinMod, 1, clamp(L.nutrients / So.nutrientFloor, 0, 1)) : 1; // soft speed only
      const radF = overLimit(L.radiation, d.radTol, Hz.radSoft), toxF = overLimit(L.toxicity, d.toxTol, Hz.toxSoft);
      const hazF = Math.min(radF, toxF);
      const lightMod = clamp(L.light / Li.reference, Li.minMod, Li.maxMod);
      let fitness = tempF * waterF * soilGate * hazF;
      if (SEC[i].isOrigin) fitness = Math.max(fitness, CAT.originFitnessFloor); // protected refuge (invariant 1)
      const cats = {
        Temperature: { f: tempF, word: tempWord(effT, d) },
        Water: { f: waterF, word: waterWord(effM, d) },
        // Soil lamp/limit follow the salt/pH gate only; low nutrients just slow growth (soft → yellow, never "blocked")
        Soil: { f: soilGate, soft: nutrientMod < So.poorBelowMod, word: soilGate < So.hostileBelow ? "hostile" : soilGate < So.workableBelow ? "workable" : nutrientMod < So.poorBelowMod ? "poor" : "rich" },
        Hazard: { f: hazF, word: hazF < Hz.lethalBelow ? "lethal" : hazF < Hz.dangerousBelow ? "dangerous" : hazF < Hz.stressfulBelow ? "stressful" : "low" }
      };
      let limitKey = null, limitF = 1;
      for (const k in cats) { if (cats[k].f < limitF) { limitF = cats[k].f; limitKey = k; } }
      return { fitness, growthMod: nutrientMod * lightMod, cats, limitKey, limitF, effT, effM, terraformable };
    }
    const lampOf = f => f > CAT.lamp.green ? "green" : f > CAT.lamp.yellow ? "yellow" : "red";

    // ---- run state
    const state = new Uint8Array(N), vigor = new Float32Array(SC), secFit = new Float32Array(SC), bubbles = [];
    const sim = {
      planet, config, traits, BAR, LIV, DEAD,
      map: { W, H, N, LAND, LAND_TILES, SEC, SC, SIDX, ORIGIN, TILEMAP, AREA, CENT, SEC_TILES, NBRS, impassable: layout.impassable },
      state, vigor, secFit, bubbles, genome, sky, tf, winAt,
      biomass: C.econ.startBiomass, ticks: 0, won: false,
      onWin: null, // (coverage) => void, called once from the tick that crosses winAt
    };
    // seed the origin: fill the tiles nearest its centroid
    (function seedOrigin() {
      const tiles = SEC_TILES[ORIGIN].slice().sort((a, b) => {
        const ax = a % W, ay = (a / W) | 0, bx = b % W, by = (b / W) | 0;
        const cx = CENT[ORIGIN].x, cy = CENT[ORIGIN].y;
        return ((ax - cx) ** 2 + (ay - cy) ** 2) - ((bx - cx) ** 2 + (by - cy) ** 2);
      });
      for (let k = 0; k < Math.min(C.grow.seedTiles, tiles.length); k++) state[tiles[k]] = LIV;
      vigor[ORIGIN] = C.grow.originStartVigor;
    })();

    function livingCountBySection() { const c = new Int32Array(SC); for (const i of LAND_TILES) if (state[i] === LIV) c[TILEMAP[i]]++; return c; }
    function coverage() { let l = 0; for (const i of LAND_TILES) if (state[i] === LIV) l++; return l / LAND; }

    function tick() {
      const g = C.grow;
      sim.ticks++;
      // 1. evaluate fitness + ease vigor
      for (let i = 0; i < SC; i++) { const e = evaluate(i); secFit[i] = e.fitness; vigor[i] += (e.fitness - vigor[i]) * C.vigorEase; }
      // 2. transitions (double-buffer to avoid same-tick chaining)
      const next = state.slice();
      const seedMult = 1 + lvl("seedOut") * g.seedOutPerLevel;
      const matReduce = lvl("earlyMat") * g.maturityPerEarlyLevel;
      const liv = livingCountBySection();
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = y * W + x, s = TILEMAP[i];
        if (s < 0) continue; // water/void/lava: never Living or Dead, never seeds (no rng draw → First Bloom unchanged)
        const v = vigor[s], st = state[i];
        if (st === BAR) {
          let ln = 0;
          if (x > 0 && state[i - 1] === LIV) ln++; if (x < W - 1 && state[i + 1] === LIV) ln++;
          if (y > 0 && state[i - W] === LIV) ln++; if (y < H - 1 && state[i + W] === LIV) ln++;
          if (ln > 0 && v > g.growThresh) {
            // soft maturity gate: a young section seeds across more slowly unless 2+ neighbors push
            const mat = liv[s] / AREA[s];
            const gate = mat >= (g.maturity - matReduce) || ln >= 2 ? 1 : g.immatureGate;
            const p = g.baseFill * seedMult * secFit[s] * (1 + g.seedPerNeighbor * (ln - 1)) * gate;
            if (rng() < p) next[i] = LIV;
          }
        } else if (st === LIV) {
          if (v < g.dieThresh) {
            const p = C.die.rate * C.die.damping * (g.dieThresh - v) * C.die.slope;
            if (rng() < p) next[i] = DEAD;
          }
        } else { // DEAD
          if (rng() < C.recover.deadToBarren) next[i] = BAR;
        }
      }
      state.set(next);
      // 3. economy
      const E = C.econ;
      let income = E.originTrickle;
      const liv2 = livingCountBySection();
      for (let i = 0; i < SC; i++) { const rate = secFit[i] > E.thrivingAbove ? E.thriving : E.marginal; income += liv2[i] * rate; }
      sim.biomass += income;
      // 4. bubbles (bonus): one planet-wide roll per tick while anything thrives
      const thriving = []; for (let i = 0; i < SC; i++) if (secFit[i] > E.bubbleFitAbove && liv2[i] > E.bubbleMinLiving) thriving.push(i);
      if (thriving.length && rng() < E.bubbleChance) {
        const i = thriving[(rng() * thriving.length) | 0], t = SEC_TILES[i][(rng() * SEC_TILES[i].length) | 0];
        if (state[t] === LIV) bubbles.push({ tile: t, x: (t % W) + .5, y: ((t / W) | 0) + .5, life: 0 });
      }
      for (const b of bubbles) { b.life++; if (b.life > E.bubbleAutoTicks) { sim.biomass += E.bubbleValue * E.autoCollectShare; b.dead = true; } }
      for (let k = bubbles.length - 1; k >= 0; k--) if (bubbles[k].dead) bubbles.splice(k, 1);
      // 5. win check
      const cov = coverage();
      if (!sim.won && cov >= winAt) { sim.won = true; if (sim.onWin) sim.onWin(cov); }
      return cov;
    }
    function collectBubble(k) { sim.biomass += C.econ.bubbleValue; bubbles.splice(k, 1); }

    // ---- upgrades: one implementation per effect type (content/traits.js)
    function costTier(t) { const e = t.effect;
      return e.type === "sky" ? tf[t.id] : e.type === "waterArm" ? lvl("waterPts") : lvl(e.stat); }
    function ownedTier(t) { const e = t.effect;
      return e.type === "sky" ? tf[t.id] : e.type === "waterArm" ? (genome.waterArm === e.arm ? lvl("waterPts") : 0) : lvl(e.stat); }
    function canBuy(t) { const e = t.effect;
      if (e.type === "tempPoint") return lvl("cold") + lvl("heat") < C.scales.tempCap;
      if (e.type === "waterArm") return genome.waterArm === null || genome.waterArm === e.arm;
      if (e.type === "level") return lvl(e.stat) < e.max;
      return true; }
    function applyTrait(t) { const e = t.effect;
      if (e.type === "tempPoint" || e.type === "level") genome[e.stat]++;
      else if (e.type === "waterArm") { if (genome.waterArm !== e.arm) { genome.waterArm = e.arm; genome.waterPts = 0; } genome.waterPts++; }
      else if (e.type === "sky") { const v = sky[e.axis] + e.delta; sky[e.axis] = (e.min !== undefined || e.max !== undefined) ? clamp(v, e.min ?? -Infinity, e.max ?? Infinity) : v; tf[t.id]++; } }
    const price = t => Math.round((t.cost.base + costTier(t) * t.cost.step) * C.econ.costScale);
    const why = t => t.blockedWhy ? t.blockedWhy.replace("{tempCap}", C.scales.tempCap) : "";
    function buy(id) {
      const t = traitById[id]; if (!t) return false; const cost = price(t);
      if (!canBuy(t) || sim.biomass < cost) return false;
      sim.biomass -= cost; applyTrait(t);
      return true;
    }
    // what-if: apply the upgrade to a copy of the plant/sky, compare which regions can grow, then restore
    function previewOf(id) {
      const t = traitById[id]; if (!t || !canBuy(t)) return null;
      const g0 = { ...genome }, s0 = { ...sky }, t0 = { ...tf }, ok = () => SEC.map((_, i) => evaluate(i).fitness > C.grow.growThresh);
      const before = ok(); applyTrait(t); const after = ok();
      Object.assign(genome, g0); Object.assign(sky, s0); Object.assign(tf, t0);
      const gain = [], lose = []; SEC.forEach((_, i) => { if (after[i] && !before[i]) gain.push(i); if (before[i] && !after[i]) lose.push(i); });
      return { gain, lose };
    }

    Object.assign(sim, { derived, evaluate, lampOf, tick, coverage, livingCountBySection, collectBubble,
      traitById, price, canBuy, ownedTier, why, buy, previewOf });
    return sim;
  }

  root.BLOOM = Object.assign(root.BLOOM || {}, { createSim, resolveLayout, growVoronoi,
    geo: { components, sectionAdjacency, sectionPieces }, util: { clamp, lerp, band, overLimit } });
})(typeof window !== "undefined" ? window : globalThis);
