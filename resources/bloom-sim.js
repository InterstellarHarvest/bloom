// BLOOM — shared simulation engine (no DOM). Extracted from demos/demo-run.html (BLOOM-002).
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

  function createSim(planet, config, traits, opts = {}) {
    const rng = opts.rng || Math.random;
    const C = config, CAT = C.categories;
    const W = planet.gridWidth, H = planet.gridHeight, N = W * H;
    const SEC = planet.sections, SC = SEC.length;
    if (SEC.some(s => s.kind && s.kind !== "land"))
      throw new Error("bloom-sim: water/impassable sections are not supported yet (all-land planets only)");
    const SIDX = Object.fromEntries(SEC.map((s, i) => [s.id, i]));
    const ORIGIN = SIDX[planet.origin];
    const TILEMAP = growVoronoi(SEC, W, H, C.layout);
    const AREA = new Int32Array(SC), CENT = SEC.map(() => ({ x: 0, y: 0, n: 0 })), SEC_TILES = SEC.map(() => []);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const o = TILEMAP[y * W + x]; AREA[o]++; SEC_TILES[o].push(y * W + x); const c = CENT[o]; c.x += x; c.y += y; c.n++; }
    CENT.forEach(c => { c.x = c.x / c.n + .5; c.y = c.y / c.n + .5; });
    const LAND = N; // all-land planets only (guarded above)
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
      map: { W, H, N, LAND, SEC, SC, SIDX, ORIGIN, TILEMAP, AREA, CENT, SEC_TILES },
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

    function livingCountBySection() { const c = new Int32Array(SC); for (let i = 0; i < N; i++) if (state[i] === LIV) c[TILEMAP[i]]++; return c; }
    function coverage() { let l = 0; for (let i = 0; i < N; i++) if (state[i] === LIV) l++; return l / LAND; }

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
        const i = y * W + x, s = TILEMAP[i], v = vigor[s], st = state[i];
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

  root.BLOOM = Object.assign(root.BLOOM || {}, { createSim, growVoronoi, util: { clamp, lerp, band, overLimit } });
})(typeof window !== "undefined" ? window : globalThis);
