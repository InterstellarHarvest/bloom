// BLOOM — shared simulation engine (no DOM). Extracted from demos/demo-run.html (BLOOM-002);
// water / impassable terrain + shared geometry added in BLOOM-003.
// createSim(planet, config, traits, {rng}) builds one run: section layout, the 4-category
// evaluation, the tick (spread / die-back / recovery / economy / bubbles / win), and the
// upgrade effects. All numbers come from `config`; all content from `planet` + `traits`.
// Classic script → works over file://, and loads in Node via tools/sim-check.js.
// BLOOM-008: colony establishment (per-tile stand density → section establishment, which sets seed output and yield).
// BLOOM-009: per-region colony development — every region keeps its own growth allocation (sim.setColonyFocus /
// getColonyFocus; config.colony.modes) and may own one Biomass-bought local specialization (sim.buySpecialization);
// waterborne crossings report discrete seed-arrival / foothold events (sim.crossing.events) for map feedback.
// BLOOM-012: pressure scenarios. createSim(…, { scenario }) takes a scenario definition (content/scenarios.js) that is
// orthogonal to the planet. A scenario's pressure channels shift the REAL environmental inputs through the ordinary
// evaluation (sky temperature / sky moisture / surface radiation offsets that grow with the scenario clock); the planet
// data and the player's Terraformed sky are never edited. A scenario may also enable extinction loss. No scenario (or
// the default scenario: no challenge modifier) = no pressure, no loss: exactly the pre-BLOOM-012 engine (golden unchanged).
// BLOOM-014: competition. A scenario's `competition` block (content/scenarios.js) switches on a second, native organism
// with real tile state (sim.competition.native = stand density per land tile). It starts established on part of the land,
// spreads into open ground, thickens, recedes where conditions turn against it, and contests the player's tiles at shared
// fronts: whichever organism is locally stronger (its fitness in the current environment × how established its stands
// are) pushes the other back. Its tolerances come from the planet's starting conditions, and it reads the same sky
// (Terraform included) and pressure offsets as the player. No competition block = no native layer, no extra RNG draws.
// BLOOM-015: climate instability. A scenario's `climateInstability` block (content/scenarios.js) makes the player's OWN
// Terraform purchases unsettle the climate, per sky axis (temperature / moisture). Each Terraform step adds forcing to its
// axis (more when steps on that axis come close together), instability settles back over time, and an axis that stays
// unsettled enough produces a temporary, deterministic climate SHOCK (heat pulse / cold snap / wet surge / dry spell): a
// warning, then a temporary offset on the same sky inputs every evaluation already reads, then a full return. Permanent
// Terraform is never undone and planet data is never edited. sim.climate holds the live state; no block = no state, no
// extra RNG draws (shock timing and type come from the purchases and a planet-derived hash, never from the run RNG).
//
// ⚠ tools/golden/first_bloom.json pins this file's behavior bit-for-bit under a seeded RNG
// (run traces last regenerated on purpose by BLOOM-009, an owner-authorized gameplay retune).
// Keep the order of rng() calls and arithmetic stable unless a retune is intended
// (then regenerate the golden with `node tools/sim-check.js --write` and say so in the commit).
// BLOOM-027A: cylindrical geography foundation. A planet may declare `topology: { wrapX, wrapY }` (absent = the legacy
// rectangle). wrapX wraps longitude (x = 0 and x = W − 1 are adjacent on every row); wrapY is reserved and must stay
// false — the world is a cylinder, never a torus. BLOOM.geo holds the ONE cardinal-neighbour rule (west / east / north /
// south / neighbors4) and every geography-sensitive system — components, section adjacency and pieces, water crossings,
// region centres, origin seeding, plant spread, native competition — reads it instead of testing x > 0 / x < W − 1 itself.
// Procedural generation is still rectangular in this milestone (it does not set `topology`), so no generated planet changes.
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

  // ---- pressure scenarios (BLOOM-012). A scenario is plain data (content/scenarios.js):
  //   pressure: null (default) | { graceSeconds, durationSeconds, channels: { temperature?, moisture?, moistureShare?, radiation? },
  //                             graceLabel, phases: [{ from (progress 0..1, ascending, first 0), id, name, note }] }
  //   loss:     { extinction: bool, extinctionGraceSeconds }
  // Progress is 0 through the grace period, then rises linearly to 1 over durationSeconds and stays there (the final,
  // degraded state — never a loss by itself). Each channel's offset = progress × its maximum: temperature in °C and
  // moisture in points added to the sky, radiation in points added to every land section's surface radiation;
  // moistureShare is a fraction of the planet's own STARTING sky moisture (−0.4 = the air ends up holding 40% less water
  // vapour than it began with), so a humid world loses more points than an already dry one. (The base is the planet's
  // data, never the Terraformed sky, so Terraform cannot change how far the scenario has progressed.)
  const CHANNELS = { temperature: "temp", moisture: "moist", moistureShare: "moist", radiation: "rad" };
  const ZERO_OFFSETS = Object.freeze({ temp: 0, moist: 0, rad: 0 });
  // (BLOOM-035B) createSim's species: a resolved species (BLOOM.species.resolve) — never an id string, never a bare physiology
  const PHYSIOLOGY_KEYS = ["tempFloor", "tempCeil", "waterPos", "waterTol", "saltTol", "radTol", "toxTol"];
  function checkedSpecies(sp) {
    if (typeof sp !== "object" || typeof sp.id !== "string" || typeof sp.physiologyKey !== "string" || !sp.physiology || !Object.isFrozen(sp.physiology))
      throw new Error("bloom-sim: opts.species must be a resolved species (BLOOM.species.resolve(id)), got " + (typeof sp === "string" ? `"${sp}"` : typeof sp));
    const keys = Object.keys(sp.physiology);
    if (keys.length !== PHYSIOLOGY_KEYS.length || !PHYSIOLOGY_KEYS.every(k => Number.isFinite(sp.physiology[k])))
      throw new Error(`bloom-sim: species ${sp.id}: physiology must be exactly { ${PHYSIOLOGY_KEYS.join(", ")} } (finite numbers)`);
    return sp;
  }
  function checkScenario(s) {
    const e = [], P = s && s.pressure, L = s && s.loss;
    if (!s || typeof s.id !== "string" || !/^[a-z][a-z0-9_]*$/.test(s.id)) e.push("id must be a lower-case identifier");
    if (!s || typeof s.name !== "string" || !s.name) e.push("name missing");
    // (BLOOM-035B, PMO) a scenario / Challenge NEVER changes the reference physiology (a world-generation constant) and never carries a
    // player physiology: it may name a species elsewhere (BLOOM-036), never edit one through scenario data
    for (const k of ["referencePlant", "genomeBase", "physiology", "playerPhysiology"]) if (s && k in s) e.push(`${k} is not scenario data (config.referencePlant is a world-generation constant; a player's physiology is a species)`);
    if (P != null) {
      if (!(P.graceSeconds >= 0)) e.push("pressure.graceSeconds must be ≥ 0");
      if (!(P.durationSeconds > 0)) e.push("pressure.durationSeconds must be > 0");
      const ch = P.channels || {};
      if (!Object.keys(ch).length) e.push("pressure.channels needs at least one channel");
      for (const k of Object.keys(ch)) if (!(k in CHANNELS) || !Number.isFinite(ch[k])) e.push(`pressure.channels.${k} is not a known channel with a finite maximum`);
      const ph = P.phases;
      if (!Array.isArray(ph) || !ph.length || ph[0].from !== 0 || ph.some((p, i) => !(p.from >= 0 && p.from <= 1) || (i && !(p.from > ph[i - 1].from)) || !p.id || !p.name))
        e.push("pressure.phases must be [{ from, id, name }] with from ascending from 0 to at most 1");
    }
    if (!L || typeof L.extinction !== "boolean") e.push("loss.extinction must be true or false");
    else if (L.extinction && !(L.extinctionGraceSeconds > 0)) e.push("loss.extinctionGraceSeconds must be > 0 when extinction is on");
    if (s && s.competition != null) e.push(...checkCompetition(s.competition));
    if (s && s.climateInstability != null) e.push(...checkClimateInstability(s.climateInstability));
    return e;
  }
  // climate-instability block (BLOOM-015): every number the instability layer uses, with its legal range
  const CLIMATE_AXES = ["temp", "moist"];
  function checkClimateInstability(c) {
    const e = [], num = (v, lo, hi) => Number.isFinite(v) && v >= lo && v <= hi;
    const F = c.forcing || {}, S = c.settling || {}, K = c.shocks || {}, A = c.axes || {}, B = c.bands;
    if (!num(c.baseline, 0, 0.5)) e.push("climateInstability.baseline must be 0..0.5");
    if (!Object.keys(A).length || Object.keys(A).some(k => !CLIMATE_AXES.includes(k))) e.push(`climateInstability.axes must name sky axes (${CLIMATE_AXES.join(", ")})`);
    for (const k in A) { const a = A[k] || {}, m = a.magnitude;
      if (!num(a.unit, 0.1, 100)) e.push(`climateInstability.axes.${k}.unit must be 0.1..100`);
      if (!Array.isArray(m) || m.length !== 2 || !m.every(x => num(x, 0, 60)) || m[0] > m[1]) e.push(`climateInstability.axes.${k}.magnitude must be [lo, hi] in 0..60`);
      for (const d of ["up", "down"]) if (!a[d] || typeof a[d].id !== "string" || !a[d].name) e.push(`climateInstability.axes.${k}.${d} needs { id, name }`); }
    if (!num(F.perStep, 0, 1) || !num(F.compounding, 0, 5) || !num(F.memorySeconds, 1, 3600)) e.push("climateInstability.forcing needs perStep 0..1, compounding 0..5, memorySeconds 1..3600");
    if (!num(S.halfLifeSeconds, 1, 3600)) e.push("climateInstability.settling.halfLifeSeconds must be 1..3600");
    if (!num(K.threshold, 0.05, 1) || !num(K.warningSeconds, 0, 120) || !num(K.durationSeconds, 1, 600) || !num(K.rampSeconds, 0, 300) || !(K.rampSeconds * 2 <= K.durationSeconds)
      || !num(K.release, 0, 1) || !num(K.quietSeconds, 0, 600) || !num(K.overshootShare, 0, 1))
      e.push("climateInstability.shocks needs threshold 0.05..1, warningSeconds 0..120, durationSeconds 1..600, rampSeconds ≤ half the duration, release 0..1, quietSeconds 0..600, overshootShare 0..1");
    if (!Array.isArray(B) || !B.length || B[0].from !== 0 || B.some((b, i) => !(b.from >= 0 && b.from <= 1) || (i && !(b.from > B[i - 1].from)) || !b.id || !b.name))
      e.push("climateInstability.bands must be [{ from, id, name }] with from ascending from 0 to at most 1");
    return e;
  }
  // competition block (BLOOM-014): every number the native layer uses, with its legal range
  function checkCompetition(c) {
    const e = [], num = (v, lo, hi) => Number.isFinite(v) && v >= lo && v <= hi;
    const pair = (v, lo, hi, int) => Array.isArray(v) && v.length === 2 && v.every(x => num(x, lo, hi) && (!int || Number.isInteger(x))) && v[0] <= v[1];
    const T = c.tolerance || {}, S = c.start || {}, G = c.growth || {}, K = c.contest || {}, E = c.events || {};
    if (!num(T.adaptation, 0, 1) || !num(T.breadth, 0.2, 3) || !num(T.hardyShare, 0, 1)) e.push("competition.tolerance needs adaptation 0..1, breadth 0.2..3, hardyShare 0..1");
    if (!pair(S.coverShare, 0, 0.9) || !pair(S.density, 0.01, 1) || !pair(S.patches, 1, 64, true) || !num(S.originBufferTiles, 0, 64) || !num(S.maxLandmassShare, 0.05, 1))
      e.push("competition.start needs coverShare [lo,hi] in 0..0.9, density [lo,hi] in 0..1, patches [lo,hi] whole numbers ≥ 1, originBufferTiles ≥ 0, maxLandmassShare 0.05..1");
    for (const k of ["growThresh", "dieThresh", "spread", "seedPerNeighbor", "seedlingDensity", "rate", "thinning", "minDensity", "vigorEase"])
      if (!num(G[k], 0, 1)) e.push(`competition.growth.${k} must be a number 0..1`);
    if (!(G.dieThresh < G.growThresh) || !(G.minDensity < G.seedlingDensity)) e.push("competition.growth needs dieThresh < growThresh and minDensity < seedlingDensity");
    if (!num(K.nativeVigour, 0.05, 1.5) || !num(K.holdBase, 0, 1) || !num(K.scale, 0.01, 2) || !num(K.crowding, 0, 0.95))
      e.push("competition.contest needs nativeVigour 0.05..1.5, holdBase 0..1, scale 0.01..2, crowding 0..0.95");
    if (!num(E.contestedTiles, 1, 1000) || !num(E.advantageMargin, 0, 1) || !num(E.dominatedShare, 0.05, 1) || !num(E.dominatedPlayerBelow, 0, 1) || !num(E.retakeTiles, 1, 1000) || !num(E.windowSeconds, 1, 600))
      e.push("competition.events needs contestedTiles ≥ 1, advantageMargin 0..1, dominatedShare 0.05..1, dominatedPlayerBelow 0..1, retakeTiles ≥ 1, windowSeconds 1..600");
    return e;
  }
  // a scenario changes the run at all (pressure clock and/or a competing organism); default / none = the plain engine
  const isDynamic = s => !!(s && (s.pressure || s.competition || s.climateInstability));
  // small deterministic helpers for planet-derived (not run-RNG) state: FNV-1a string hash → mulberry32 stream
  const fnv1a = str => { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h >>> 0; };
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  // (BLOOM-033) the canonical no-challenge mode: "default" (no special pressure, no competing organism, no climate instability)
  const DEFAULT_SCENARIO = "default";
  // (BLOOM-033) LEGACY ALIAS — the ONE place the retired id survives: old developer links / evidence named the default scenario "eden".
  // It is accepted here, at the resolver boundary only, and resolves to the default scenario; nothing else anywhere knows the old id.
  const LEGACY_SCENARIO_ALIASES = Object.freeze({ eden: DEFAULT_SCENARIO });
  // scenario id → definition from a catalogue. null / undefined / "" = the default scenario; an unknown id throws (never a substitute)
  function resolveScenario(catalogue, id) {
    const asked = id == null || id === "" ? DEFAULT_SCENARIO : id;
    const want = Object.prototype.hasOwnProperty.call(LEGACY_SCENARIO_ALIASES, asked) ? LEGACY_SCENARIO_ALIASES[asked] : asked, s = (catalogue || []).find(x => x.id === want);
    if (!s) throw new Error(`unknown scenario "${want}" (known: ${(catalogue || []).map(x => x.id).join(", ") || "none"})`);
    const bad = checkScenario(s); if (bad.length) throw new Error(`scenario ${want}: ${bad.join("; ")}`);
    return s;
  }
  const progressAt = (P, seconds) => !P ? 0 : clamp((seconds - P.graceSeconds) / P.durationSeconds, 0, 1);
  // the drift at full pressure for one planet (base = its globalClimate) → { temp, moist, rad }
  function maxOffsets(P, base) {
    const o = { temp: 0, moist: 0, rad: 0 }; if (!P) return o;
    for (const k in P.channels) o[CHANNELS[k]] += P.channels[k] * (k === "moistureShare" ? (base ? base.moisture : 0) : 1);
    return o;
  }
  function offsetsAt(P, progress, base) {
    const m = maxOffsets(P, base); return { temp: m.temp * progress, moist: m.moist * progress, rad: m.rad * progress };
  }
  // phase index: -1 = still in the grace period (atmosphere stable), else the last phase whose `from` ≤ progress
  function phaseAt(P, seconds) {
    if (!P || seconds < P.graceSeconds) return -1;
    const p = progressAt(P, seconds); let k = 0; for (let i = 0; i < P.phases.length; i++) if (p >= P.phases[i].from) k = i; return k;
  }

  // ---- topology (BLOOM-027A). Plain data: { wrapX, wrapY }. RECT is every planet without a `topology` field (First Bloom,
  // every planet the generator emits today); CYLINDER wraps longitude only. wrapY is reserved: it must be false.
  const RECT = Object.freeze({ wrapX: false, wrapY: false }), CYLINDER = Object.freeze({ wrapX: true, wrapY: false });
  // the planet's topology as plain data, or an error message. A missing field is the legacy rectangle; anything else must be a
  // { wrapX: boolean, wrapY: false } object (unknown keys are refused so a typo cannot silently stay rectangular).
  function normalizeTopology(t) {
    if (t === undefined || t === null) return RECT;
    if (typeof t !== "object" || Array.isArray(t)) return "topology must be an object { wrapX, wrapY }";
    for (const k of Object.keys(t)) if (k !== "wrapX" && k !== "wrapY") return `topology: unknown key "${k}"`;
    if (t.wrapX !== undefined && typeof t.wrapX !== "boolean") return "topology.wrapX must be true or false";
    if (t.wrapY !== undefined && typeof t.wrapY !== "boolean") return "topology.wrapY must be true or false";
    if (t.wrapY === true) return "topology.wrapY = true is not supported (a planet is a cylinder, never a torus)";
    return t.wrapX ? CYLINDER : RECT;
  }
  function topologyOf(planet) {
    const t = normalizeTopology(planet && planet.topology);
    if (typeof t === "string") throw new Error("bloom-sim: " + t);
    if (t.wrapX && !(planet.gridWidth >= 3)) throw new Error("bloom-sim: topology.wrapX needs gridWidth ≥ 3");
    return t;
  }
  // ---- the one cardinal-neighbour rule. Each step returns the neighbouring tile index or -1 (no neighbour), allocation-free.
  // Rectangle: no neighbour past any edge. Cylinder: west of x = 0 is x = W − 1 on the same row and east of x = W − 1 is x = 0;
  // north of y = 0 and south of y = H − 1 are never neighbours under either topology.
  const west = (t, W, topo) => { const x = t % W; return x > 0 ? t - 1 : (topo.wrapX ? t + W - 1 : -1); };
  const east = (t, W, topo) => { const x = t % W; return x < W - 1 ? t + 1 : (topo.wrapX ? t - W + 1 : -1); };
  const north = (t, W) => t >= W ? t - W : -1;
  const south = (t, W, H) => t < (H - 1) * W ? t + W : -1;
  // the existing cardinal neighbours of tile t, in the engine's historical order west, east, north, south
  function neighbors4(t, W, H, topo) {
    const o = [], l = west(t, W, topo), r = east(t, W, topo), u = north(t, W), d = south(t, W, H);
    if (l >= 0) o.push(l); if (r >= 0) o.push(r); if (u >= 0) o.push(u); if (d >= 0) o.push(d); return o;
  }
  function forEachNeighbor4(t, W, H, topo, fn) {
    const l = west(t, W, topo), r = east(t, W, topo), u = north(t, W), d = south(t, W, H);
    if (l >= 0) fn(l); if (r >= 0) fn(r); if (u >= 0) fn(u); if (d >= 0) fn(d);
  }
  // shortest signed horizontal offset from column b to column a (a − b on a rectangle; wrapped into (−W/2, W/2] on a cylinder)
  const wrapDx = (a, b, W, topo) => { const d = a - b; return topo.wrapX ? d - W * Math.ceil(d / W - 0.5) : d; };
  // mean longitude (tile-centre column, in [0, W)) of a set of tiles given as a per-column tile count.
  // Rectangle: the arithmetic mean, exactly as before. Cylinder: the occupied columns are unwrapped across the widest run of
  // EMPTY columns (the set's own far side), so tiles on x = 57,58,59,0,1,2 of a 60-wide world centre at 0.0 (the seam), not 30.
  // Ties between equally wide empty runs take the first one met walking east from the lowest occupied column. A set that
  // occupies every column has no empty run and is unwrapped from column 0 (= the arithmetic mean): the documented,
  // deterministic fallback for an unusually symmetric region, where no longitude is more central than another.
  function longitudeCenter(colCount, W, topo) {
    let n = 0, sx = 0, first = -1;
    for (let x = 0; x < W; x++) { const c = colCount[x]; if (c > 0) { n += c; sx += c * x; if (first < 0) first = x; } }
    if (!n) return NaN;
    if (!topo.wrapX) return sx / n + .5;
    let start = 0, bestGap = 0, run = 0;
    for (let k = 1; k <= W; k++) { const x = (first + k) % W;
      if (colCount[x] > 0) { if (run > bestGap) { bestGap = run; start = x; } run = 0; } else run++; }
    let su = 0; for (let x = 0; x < W; x++) if (colCount[x] > 0) su += colCount[x] * ((x < start ? x + W : x) + .5);
    const m = su / n; return m >= W ? m - W : m;
  }

  // weighted Voronoi from per-section `center` seeds; weights nudge toward each section's area share
  // (topology-aware: on a cylinder the horizontal distance to a seed is the shorter way round)
  function growVoronoi(sections, W, H, L, topo = RECT) {
    const N = W * H;
    const cx = sections.map(s => s.center.x * W), cy = sections.map(s => s.center.y * H);
    const aSum = sections.reduce((a, s) => a + s.area, 0), target = sections.map(s => s.area / aSum * N);
    const w = new Float64Array(sections.length), map = new Int16Array(N), cnt = new Int32Array(sections.length), CAP = L.weightCap;
    for (let it = 0; it < L.iterations; it++) {
      cnt.fill(0);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        let best = 0, bd = Infinity; const px = x + .5, py = y + .5;
        for (let i = 0; i < sections.length; i++) { const dx = wrapDx(px, cx[i], W, topo), dy = py - cy[i], d = Math.sqrt(dx * dx + dy * dy) - w[i]; if (d < bd) { bd = d; best = i; } }
        map[y * W + x] = best; cnt[best]++;
      }
      let me = 0; for (let i = 0; i < sections.length; i++) { const e = target[i] - cnt[i]; w[i] = clamp(w[i] + e * L.weightRate, -CAP, CAP); if (Math.abs(e) > me) me = Math.abs(e); }
      if (me < L.stopWithinTiles) break;
    }
    return map;
  }

  // ---- shared geometry (4-neighbour grid). Used by the engine, generator, validator and demos. Every function takes the
  // planet's topology last and defaults to the rectangle, so callers that never pass one (the generator today) are unchanged.
  // components(mask) labels connected runs of mask tiles; ids follow first-tile scan order. On a cylinder a run that leaves
  // the map at x = W − 1 and continues at x = 0 is ONE component.
  function components(mask, W, H, topo = RECT) {
    const N = W * H, id = new Int32Array(N).fill(-1), sizes = [];
    const visit = (u, c, st) => { if (u >= 0 && mask[u] && id[u] < 0) { id[u] = c; st.push(u); } };
    for (let s = 0; s < N; s++) {
      if (!mask[s] || id[s] >= 0) continue;
      const c = sizes.length; let n = 0; const st = [s]; id[s] = c;
      while (st.length) { const t = st.pop(); n++;
        visit(west(t, W, topo), c, st); visit(east(t, W, topo), c, st); visit(north(t, W), c, st); visit(south(t, W, H), c, st); }
      sizes.push(n);
    }
    return { id, sizes };
  }
  // adjacency between land sections from actual geography (tilemap value -1 = impassable). Two DIFFERENT sections touching
  // only across the seam of a cylinder are neighbours; touching never merges their ids (that is the generator's job).
  function sectionAdjacency(tilemap, W, H, SC, topo = RECT) {
    const nb = Array.from({ length: SC }, () => new Set());
    const touch = (a, u) => { if (u >= 0) { const b = tilemap[u]; if (b >= 0 && b !== a) { nb[a].add(b); nb[b].add(a); } } };
    for (let t = 0; t < W * H; t++) { const a = tilemap[t]; if (a < 0) continue; touch(a, east(t, W, topo)); touch(a, south(t, W, H)); }
    return nb.map(set => [...set].sort((p, q) => p - q));
  }
  // number of separate pieces each section's tiles form (1 = contiguous, 0 = empty); one section on both sides of a
  // cylinder's seam whose tiles connect across it is ONE piece
  function sectionPieces(tilemap, W, H, SC, topo = RECT) {
    return Array.from({ length: SC }, (_, k) => components(Array.from(tilemap, v => v === k ? 1 : 0), W, H, topo).sizes.length);
  }

  // water crossings (BLOOM-004): from every coastal land tile, walk through WATER tiles only
  // (4-neighbour BFS) for up to maxGap steps; any land tile of a DIFFERENT landmass touching a water
  // tile reached at step d is a landing site at gap d (= water tiles crossed). Pure geography —
  // never section neighbour lists. Returns tile pairs (for the simulation) and landmass links.
  // Topology-aware: on a cylinder the water walk and the landmasses both wrap, so a strait may cross longitude zero, while land
  // directly adjacent across the seam is one landmass (ordinary spread, never a crossing).
  function waterCrossings(tilemap, W, H, maxGap, topo = RECT) {
    const N = W * H, landMask = Array.from(tilemap, v => v >= 0 ? 1 : 0), lm = components(landMask, W, H, topo);
    const pairs = [], best = new Map(); // "a-b" landmass link → min gap
    if (!(maxGap > 0)) return { maxGap: maxGap || 0, landmass: lm.id, landmassSizes: lm.sizes, pairs, links: [] };
    const dist = new Int32Array(N).fill(-1), touched = [];
    const nb = t => neighbors4(t, W, H, topo);
    for (let s = 0; s < N; s++) {
      if (!landMask[s]) continue;
      const start = nb(s).filter(t => !landMask[t]); if (!start.length) continue; // not coastal
      const from = lm.id[s], landing = new Map(); let q = [];
      for (const t of start) if (dist[t] < 0) { dist[t] = 1; touched.push(t); q.push(t); }
      for (let d = 1; d <= maxGap && q.length; d++) {
        const nq = [];
        for (const w of q) for (const t of nb(w)) {
          if (landMask[t]) { if (lm.id[t] !== from && !landing.has(t)) landing.set(t, d); }
          else if (dist[t] < 0 && d < maxGap) { dist[t] = d + 1; touched.push(t); nq.push(t); }
        }
        q = nq;
      }
      for (const t of touched) dist[t] = -1; touched.length = 0;
      for (const [t, d] of landing) {
        pairs.push([s, t, d]);
        const key = from + "-" + lm.id[t]; if (!best.has(key) || best.get(key) > d) best.set(key, d);
      }
    }
    const links = [...best].map(([k, gap]) => { const [a, b] = k.split("-").map(Number); return { from: a, to: b, gap }; })
      .sort((p, q) => p.from - q.from || p.to - q.to);
    return { maxGap, landmass: lm.id, landmassSizes: lm.sizes, pairs, links };
  }
  // landmasses reachable from `startMass` using crossing links (links are symmetric by construction)
  function reachableLandmasses(startMass, links) {
    const seen = new Set([startMass]), st = [startMass];
    while (st.length) { const a = st.pop(); for (const l of links) if (l.from === a && !seen.has(l.to)) { seen.add(l.to); st.push(l.to); } }
    return seen;
  }

  // ---- planet → tile layout. A planet either supplies `tilemap` (section index per tile, -1 =
  // impassable: water/void/lava) or gets a weighted-Voronoi layout from section `center`s.
  // Sections may be kind "land" (default) or impassable kinds; the simulation only ever sees land
  // sections, and every impassable tile is -1. An all-land Voronoi planet (First Bloom) takes the
  // original path unchanged.
  // The result also carries the planet's `topology` (BLOOM-027A) so every consumer judges the same tiles the same way.
  const KINDS = new Set(["land", "water", "void", "lava"]);
  function resolveLayout(planet, config) {
    const W = planet.gridWidth, H = planet.gridHeight, N = W * H, ALL = planet.sections, topology = topologyOf(planet);
    for (const s of ALL) if (s.kind !== undefined && !KINDS.has(s.kind))
      throw new Error(`bloom-sim: section ${s.id} has unknown kind "${s.kind}"`);
    let full;
    if (planet.tilemap !== undefined) {
      const tm = planet.tilemap;
      if (!tm || tm.length !== N) throw new Error(`bloom-sim: tilemap must have ${N} entries`);
      for (let i = 0; i < N; i++) if (!Number.isInteger(tm[i]) || tm[i] < -1 || tm[i] >= ALL.length)
        throw new Error(`bloom-sim: tilemap[${i}] = ${tm[i]} is not a section index or -1`);
      full = Int16Array.from(tm);
    } else full = growVoronoi(ALL, W, H, config.layout, topology);
    const isLand = ALL.map(s => (s.kind || "land") === "land");
    let hasImpassable = isLand.includes(false);
    for (let i = 0; i < N && !hasImpassable; i++) if (full[i] < 0) hasImpassable = true;
    if (!hasImpassable) return { tilemap: full, sections: ALL, impassable: [], topology };
    const landIdx = []; let k = 0; for (const l of isLand) landIdx.push(l ? k++ : -1);
    const tilemap = new Int16Array(N);
    for (let i = 0; i < N; i++) tilemap[i] = full[i] < 0 ? -1 : landIdx[full[i]];
    return { tilemap, sections: ALL.filter((_, i) => isLand[i]), impassable: ALL.filter((_, i) => !isLand[i]), topology };
  }

  function createSim(planet, config, traits, opts = {}) {
    const rng = opts.rng || Math.random;
    const C = config, CAT = C.categories;
    const W = planet.gridWidth, H = planet.gridHeight, N = W * H;
    // SEC = land sections only; TILEMAP holds their indices, -1 for water/void/lava
    const layout = resolveLayout(planet, C), TILEMAP = layout.tilemap, SEC = layout.sections, SC = SEC.length, TOPO = layout.topology;
    const SIDX = Object.fromEntries(SEC.map((s, i) => [s.id, i]));
    const ORIGIN = SIDX[planet.origin];
    if (ORIGIN === undefined) throw new Error(`bloom-sim: origin "${planet.origin}" is not a land section`);
    const AREA = new Int32Array(SC), CENT = SEC.map(() => ({ x: 0, y: 0, n: 0 })), SEC_TILES = SEC.map(() => []), LAND_TILES = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const o = TILEMAP[y * W + x]; if (o < 0) continue; AREA[o]++; SEC_TILES[o].push(y * W + x); LAND_TILES.push(y * W + x); const c = CENT[o]; c.x += x; c.y += y; c.n++; }
    SEC.forEach((s, i) => { if (!AREA[i]) throw new Error(`bloom-sim: land section ${s.id} has no tiles`); });
    // region centres: the rectangle keeps its arithmetic mean bit-for-bit; a cylinder's longitude centre is wrap-aware
    // (BLOOM.geo.longitudeCenter), so a region on both sides of the seam centres at the seam, never in the middle of the map
    if (!TOPO.wrapX) CENT.forEach(c => { c.x = c.x / c.n + .5; c.y = c.y / c.n + .5; });
    else { const cols = SEC.map(() => new Int32Array(W)); for (const t of LAND_TILES) cols[TILEMAP[t]][t % W]++;
      CENT.forEach((c, i) => { c.x = longitudeCenter(cols[i], W, TOPO); c.y = c.y / c.n + .5; }); }
    const LAND = LAND_TILES.length; // win/coverage denominator: colonizable tiles only (bible §9)
    const NBRS = sectionAdjacency(TILEMAP, W, H, SC, TOPO); // from actual geography, never from authored lists
    // water crossings (only maps with water have any): landing tile → linked coastal source tiles + weights
    const XC = C.crossing || {}, CROSS = waterCrossings(TILEMAP, W, H, LAND < N ? (XC.maxGap || 0) : 0, TOPO);
    const landingIdx = new Map(), LANDING = [], LSRC = [], LW = [], LGAP = [];
    for (const [src, t, gap] of CROSS.pairs) {
      let k = landingIdx.get(t); if (k === undefined) { k = LANDING.length; landingIdx.set(t, k); LANDING.push(t); LSRC.push([]); LW.push([]); LGAP.push([]); }
      LSRC[k].push(src); LW[k].push(XC.chancePerSource * Math.pow(XC.gapFalloff, gap - 1)); LGAP[k].push(gap);
    }
    const arrAcc = new Float64Array(LANDING.length); // seed pressure accumulated per landing tile → arrival events
    const LANDMASS = SEC.map((_, i) => CROSS.landmass[SEC_TILES[i][0]]);
    const crossStat = (traits.find(t => t.effect.type === "crossing") || { effect: {} }).effect.stat;
    const winAt = planet.winThreshold ?? C.win;
    // pressure scenario (BLOOM-012): definition is data; this run's live pressure state is sim.pressure (below)
    const SCN = opts.scenario || null;
    if (SCN) { const bad = checkScenario(SCN); if (bad.length) throw new Error(`bloom-sim: scenario ${SCN.id}: ${bad.join("; ")}`); }
    const PR = SCN && SCN.pressure || null, LOSS = SCN && SCN.loss && SCN.loss.extinction ? SCN.loss : null;
    const CP = SCN && SCN.competition || null; // BLOOM-014: a competing native organism (null = none, no native layer at all)
    const CI = SCN && SCN.climateInstability || null; // BLOOM-015: Terraform-driven climate instability (null = none at all)
    // the environmental offsets every evaluation uses by default: the scenario drift, plus (climate instability only) the
    // active shock — without instability this is exactly sim.pressure.offsets, as before
    const envOffsets = CI ? () => sim.climate.env : () => sim.pressure.offsets;

    // genome + global sky + terraform counts, shaped by the trait catalogue
    const traitById = Object.fromEntries(traits.map(t => [t.id, t]));
    const genome = {};
    for (const t of traits) {
      const e = t.effect;
      if (e.type === "tempPoint" || e.type === "level" || e.type === "crossing") genome[e.stat] = 0;
      else if (e.type === "waterArm" && !("waterArm" in genome)) { genome.waterArm = null; genome.waterPts = 0; }
    }
    const sky = { temp: planet.globalClimate.temperature, moist: planet.globalClimate.moisture };
    // (BLOOM-035B) the PLAYER's starting physiology: the selected species' (opts.species, a BLOOM.species.resolve() object), else the
    // world-generation reference physiology (config.referencePlant) — so a call without a species, and an Organic Hybrid call (its
    // physiology is numerically the reference), are the pre-035B engine bit for bit. It feeds derived() ONLY: purchased adaptations stay
    // sim.genome + the shared config.scales, the environment stays planet / sky / scenario, and the native competitor reads
    // config.referencePlant explicitly (nativeProfile) — never the player's species. config is never copied or edited.
    const SPECIES = opts.species == null ? null : checkedSpecies(opts.species);
    const PB = SPECIES ? SPECIES.physiology : C.referencePlant;
    if (!PB) throw new Error("bloom-sim: config.referencePlant (the reference physiology) is missing");
    const tf = Object.fromEntries(traits.filter(t => t.effect.type === "sky").map(t => [t.id, 0]));
    const lvl = k => genome[k] || 0;

    function derived() {
      const s = C.scales, b = PB;
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
    // off = scenario pressure offsets { temp, moist, rad } — the run's current ones by default (zero without pressure);
    // static analysis (the witness) may pass another state, e.g. the final pressure state
    function rawFactors(L, off) {
      const skyM = off.moist ? clamp(sky.moist + off.moist, 0, 100) : sky.moist, rad = off.rad ? Math.max(0, L.radiation + off.rad) : L.radiation;
      const effT = sky.temp + off.temp + L.tempOffset, effM = skyM + L.moistureOffset;
      return { effT, effM, rad, skyT: sky.temp + off.temp, skyM };
    }
    function evaluate(i, off) {
      off = off || envOffsets();
      const L = SEC[i].local, d = derived(), pressed = off.temp || off.moist || off.rad;
      const { effT, effM, rad: effRad, skyT, skyM } = rawFactors(L, off);
      const tempF = band(effT, d.tempFloor, d.tempCeil, T.soft);
      const waterF = band(effM, d.waterPos - d.waterTol, d.waterPos + d.waterTol, Wt.soft);
      const saltF = overLimit(L.salinity, d.saltTol, So.saltSoft);
      const phF = (L.ph < So.phMin || L.ph > So.phMax) ? overLimit(Math.max(So.phMin - L.ph, L.ph - So.phMax, 0), 0, So.phSoft) : 1;
      const soilGate = Math.min(saltF, phF);
      const nutrientMod = L.nutrients < So.nutrientFloor ? lerp(So.nutrientMinMod, 1, clamp(L.nutrients / So.nutrientFloor, 0, 1)) : 1; // soft speed only
      const radF = overLimit(effRad, d.radTol, Hz.radSoft), toxF = overLimit(L.toxicity, d.toxTol, Hz.toxSoft);
      const hazF = Math.min(radF, toxF);
      const lightMod = clamp(L.light / Li.reference, Li.minMod, Li.maxMod);
      let fitness = tempF * waterF * soilGate * hazF;
      if (SEC[i].isOrigin) { // protected refuge (invariant 1): shields the home region from its own start and from the
        // player's Terraform — but not from scenario pressure (bible §11.3): under pressure the guarantee shrinks in
        // proportion to how much of the origin's own habitability the pressure has taken away
        let keep = 1;
        if (pressed) { const u = rawFactors(L, ZERO_OFFSETS);
          const f0 = band(u.effT, d.tempFloor, d.tempCeil, T.soft) * band(u.effM, d.waterPos - d.waterTol, d.waterPos + d.waterTol, Wt.soft)
            * soilGate * Math.min(overLimit(u.rad, d.radTol, Hz.radSoft), toxF);
          keep = f0 > 1e-9 ? Math.min(1, fitness / f0) : 1; }
        fitness = Math.max(fitness, CAT.originFitnessFloor * keep);
      }
      const cats = {
        Temperature: { f: tempF, word: tempWord(effT, d) },
        Water: { f: waterF, word: waterWord(effM, d) },
        // Soil lamp/limit follow the salt/pH gate only; low nutrients just slow growth (soft → yellow, never "blocked")
        Soil: { f: soilGate, soft: nutrientMod < So.poorBelowMod, word: soilGate < So.hostileBelow ? "hostile" : soilGate < So.workableBelow ? "workable" : nutrientMod < So.poorBelowMod ? "poor" : "rich" },
        Hazard: { f: hazF, word: hazF < Hz.lethalBelow ? "lethal" : hazF < Hz.dangerousBelow ? "dangerous" : hazF < Hz.stressfulBelow ? "stressful" : "low" }
      };
      let limitKey = null, limitF = 1;
      for (const k in cats) { if (cats[k].f < limitF) { limitF = cats[k].f; limitKey = k; } }
      return { fitness, growthMod: nutrientMod * lightMod, cats, limitKey, limitF, effT, effM, effRad, skyT, skyM, terraformable };
    }
    const lampOf = f => f > CAT.lamp.green ? "green" : f > CAT.lamp.yellow ? "yellow" : "red";

    // ---- run state
    // dens (BLOOM-008) = how established the plants on each Living tile are, 0..1: a tile colonized this tick
    // is a sparse seedling stand (config.establish.seedlingDensity) that thickens while its section's conditions
    // support growth. A section's ESTABLISHMENT = Σ dens over its Living tiles / its area — living extent and
    // density in one number — and replaces the old fill-share maturity: it sets how strongly the colony seeds
    // outward and how much Biomass it yields, and it is what the map's vegetation shade shows.
    const state = new Uint8Array(N), dens = new Float32Array(N), vigor = new Float32Array(SC), secFit = new Float32Array(SC), bubbles = [];
    const secGrowth = new Float32Array(SC).fill(1), estab = new Float32Array(SC); // per-tick: soil/light growth modifier, establishment
    const EST = C.establish, COL = C.colony, MODES = ["balanced", ...Object.keys(COL.modes)];
    const sim = {
      planet, config, traits, BAR, LIV, DEAD,
      map: { W, H, N, LAND, LAND_TILES, SEC, SC, SIDX, ORIGIN, TILEMAP, AREA, CENT, SEC_TILES, NBRS, topology: TOPO, impassable: layout.impassable,
             LANDMASS, CROSSINGS: { maxGap: CROSS.maxGap, links: CROSS.links, landingTiles: LANDING.length } },
      // arrivals / footholds: tile-ticks with waterborne seed pressure / new footholds made (BLOOM-004 counters).
      // events (BLOOM-009): the most recent discrete crossing events, oldest first, each { id, tick, from, to, gap,
      // took } — from = the strongest Living coastal source tile, to = the landing tile; took:false is a seed ARRIVAL
      // (every config.crossing.arrivalUnit of pressure landing on a tile), took:true a new FOOTHOLD. Deterministic:
      // derived from the same pressure the tick already computes, no extra randomness.
      crossing: { arrivals: 0, footholds: 0, seedArrivals: 0, events: [], nextEventId: 1 },
      state, dens, vigor, secFit, bubbles, genome, sky, tf, winAt,
      // (BLOOM-035B) provenance of the player's species (null: a reference-physiology run — world generation, validation probes)
      species: SPECIES ? Object.freeze({ id: SPECIES.id, name: SPECIES.name, version: SPECIES.version, physiologyVersion: SPECIES.physiologyVersion, physiologyKey: SPECIES.physiologyKey }) : null,
      // colony development (BLOOM-009): per land section, its growth allocation (one of MODES; "balanced" = default)
      // and its local specialization id (config.colony.specializations) or null. Region-owned, persistent.
      colonies: { focus: SEC.map(() => "balanced"), spec: SEC.map(() => null) },
      spent: { global: 0, local: 0 }, // Biomass spent on shop upgrades / local specializations
      biomass: C.econ.startBiomass, income: 0, ticks: 0, won: false,
      onWin: null, // (coverage) => void, called once from the tick that crosses winAt
      // scenario pressure (BLOOM-012). active = the scenario has pressure channels; seconds = scenario clock (run time);
      // progress 0..1; offsets = the CURRENT environmental drift every evaluation uses; phase = index into the scenario's
      // phases (-1 = grace period, still stable); events = phase changes { tick, phase, progress } (UI milestone feedback).
      scenario: SCN, pressure: { id: SCN ? SCN.id : DEFAULT_SCENARIO, name: SCN ? SCN.name : "Default", active: !!PR, seconds: 0, progress: 0,
        offsets: { ...ZERO_OFFSETS }, phase: PR ? -1 : null, events: [], startsAt: PR ? PR.graceSeconds : null,
        fullAt: PR ? PR.graceSeconds + PR.durationSeconds : null, max: maxOffsets(PR, planet.globalClimate) },
      // extinction loss (BLOOM-012, only when the scenario enables it): zero Living tiles for graceTicks in a row → lost.
      // A loss freezes the run (tick() no longer advances anything). A won run is never lost afterwards.
      extinction: { enabled: !!LOSS, graceTicks: LOSS ? Math.max(1, Math.round(LOSS.extinctionGraceSeconds * 1000 / C.tickMs)) : null, zeroTicks: 0 },
      lost: false, lostReason: null, lostTick: null,
      onLoss: null, // (reason) => void, called once from the tick that confirms extinction
    };
    // seed the origin: fill the tiles nearest its centroid (a sparse, newly sown stand — not a mature colony)
    (function seedOrigin() {
      const tiles = SEC_TILES[ORIGIN].slice().sort((a, b) => {
        const ax = a % W, ay = (a / W) | 0, bx = b % W, by = (b / W) | 0;
        const cx = CENT[ORIGIN].x, cy = CENT[ORIGIN].y, dax = wrapDx(ax, cx, W, TOPO), dbx = wrapDx(bx, cx, W, TOPO); // (wrapDx = ax − cx on a rectangle)
        return (dax ** 2 + (ay - cy) ** 2) - (dbx ** 2 + (by - cy) ** 2);
      });
      for (let k = 0; k < Math.min(C.grow.seedTiles, tiles.length); k++) { state[tiles[k]] = LIV; dens[tiles[k]] = EST.seedlingDensity; }
      vigor[ORIGIN] = C.grow.originStartVigor;
    })();

    // ---- competition (BLOOM-014). A native organism with real tile state; every number is scenario.competition data.
    //  · nat[t] = native stand density on land tile t (0 = no native cover). A tile is held by at most one organism:
    //    a native-held tile has player state BAR (never Living), so it never counts toward the player's coverage.
    //  · tolerance profile: the native is adapted to THIS planet's starting conditions. Its temperature and moisture windows
    //    have the baseline plant's width × tolerance.breadth and are centred `tolerance.adaptation` of the way from the
    //    baseline plant's centre to the planet's area-weighted median starting ground; its salt / radiation limits move the same
    //    way toward the hardyShare quantile of the starting land. It is evaluated with the SAME effective conditions as the
    //    player (current sky incl. Terraform, local offsets, scenario pressure), so a changed sky changes where it thrives.
    //  · at a front, ATTACK = how well the organism grows there: min(its vigor in that region, 1) (the native's × contest.
    //    nativeVigour); DEFENCE = the defender's attack × (holdBase + (1 − holdBase) × its SUPPORT), where support is the
    //    larger of its colony's maturity in that region (mean stand density there) and its local stand (its own density, or
    //    its same-organism neighbours' mean if larger). An established, well-suited colony holds; young stands, or a lone
    //    incursion, can be overgrown; the better-suited organism pushes into the other's cover.
    //  · fronts: a Living player tile beside native cover can be overgrown by it, and a native-held tile beside the player's
    //    colony (or on a shore its Waterborne Seeds reach) can be taken over, only when attack > defence: probability = the
    //    attacker's ordinary spread chance × min(1, (attack − defence) / contest.scale). The player still needs ground it can grow on (vigor > growThresh), the
    //    native ground it can grow on (native vigor > its growThresh). Roots (dieBackCut, only where the player's ground is
    //    at least marginal) lower the chance of being overgrown; nothing makes a colony immune.
    //  · open ground: both organisms spread into it by their own ordinary rule (the player first within a tick).
    //  · stands: native density thickens toward its own vigor, holds in its marginal band and thins under lethal conditions;
    //    a stand below minDensity disappears (the native recedes). A tile's stands of either organism thicken more slowly
    //    while the other organism crowds it (contest.crowding × share of the 4 neighbours it holds): light, water, nutrients.
    const nat = new Float32Array(N), nVig = new Float32Array(SC), nFit = new Float32Array(SC), nflip = new Int8Array(N);
    const pMat = new Float32Array(SC), nMat = new Float32Array(SC), pCnt = new Int32Array(SC), nCnt = new Int32Array(SC), contact = new Int32Array(SC);
    const gainR = new Float64Array(SC), lossR = new Float64Array(SC), spreadR = new Float64Array(SC), recedeR = new Float64Array(SC); // recent flips (decaying)
    const nb4 = t => neighbors4(t, W, H, TOPO); // the shared cardinal rule (wraps longitude on a cylinder)
    const NB = CP ? Array.from({ length: N }, (_, t) => TILEMAP[t] >= 0 ? nb4(t).filter(u => TILEMAP[u] >= 0) : []) : null; // land neighbours per tile
    const GN = CP && CP.growth, KC = CP && CP.contest, EV = CP && CP.events;
    const NP = CP ? (function nativeProfile() {
      const b = C.referencePlant, TL = CP.tolerance, gc = planet.globalClimate; // (BLOOM-035B) the reference, never the player's species
      const rows = SEC.map((s, i) => ({ a: AREA[i], t: gc.temperature + s.local.tempOffset, m: gc.moisture + s.local.moistureOffset, salt: s.local.salinity, rad: s.local.radiation }));
      const q = (key, share) => { const r = rows.slice().sort((x, y) => x[key] - y[key]); let acc = 0;
        for (const x of r) { acc += x.a; if (acc >= share * LAND) return x[key]; } return r[r.length - 1][key]; };
      const k = TL.adaptation, tC = lerp((b.tempFloor + b.tempCeil) / 2, q("t", 0.5), k), tH = (b.tempCeil - b.tempFloor) / 2 * TL.breadth;
      const mC = lerp(b.waterPos, q("m", 0.5), k), mH = b.waterTol * TL.breadth;
      return { tempLo: tC - tH, tempHi: tC + tH, moistLo: mC - mH, moistHi: mC + mH,
        saltTol: Math.max(b.saltTol, lerp(b.saltTol, q("salt", TL.hardyShare), k)), radTol: Math.max(b.radTol, lerp(b.radTol, q("rad", TL.hardyShare), k)),
        toxTol: b.toxTol, startMedian: { temp: q("t", 0.5), moist: q("m", 0.5) } };
    })() : null;
    // the native's fitness in region i under the current (or given) environment: same raw inputs and the same category
    // softness as the player's evaluate(), its own tolerance windows; side = which way the limiting factor is off
    function nativeEvaluate(i, off) {
      off = off || envOffsets();
      const L = SEC[i].local, { effT, effM, rad } = rawFactors(L, off), P = NP;
      const cats = { Temperature: band(effT, P.tempLo, P.tempHi, T.soft), Water: band(effM, P.moistLo, P.moistHi, Wt.soft),
        Soil: Math.min(overLimit(L.salinity, P.saltTol, So.saltSoft), (L.ph < So.phMin || L.ph > So.phMax) ? overLimit(Math.max(So.phMin - L.ph, L.ph - So.phMax, 0), 0, So.phSoft) : 1),
        Hazard: Math.min(overLimit(rad, P.radTol, Hz.radSoft), overLimit(L.toxicity, P.toxTol, Hz.toxSoft)) };
      let limitKey = null, limitF = 1; for (const k in cats) if (cats[k] < limitF) { limitF = cats[k]; limitKey = k; }
      const side = limitKey === "Temperature" ? (effT < P.tempLo ? "cold" : "hot") : limitKey === "Water" ? (effM < P.moistLo ? "dry" : "wet")
        : limitKey === "Soil" ? "salt" : limitKey === "Hazard" ? "hazard" : null;
      return { fitness: cats.Temperature * cats.Water * cats.Soil * cats.Hazard, cats, limitKey, limitF, side, effT, effM };
    }
    const hold = sup => KC.holdBase + (1 - KC.holdBase) * sup;
    const pAtk = s => Math.min(vigor[s], 1), nAtk = s => KC.nativeVigour * Math.min(nVig[s], 1);
    // a tile's support (see above): its region's colony maturity or its local stand, whichever is larger
    const pSup = i => { let n = 0, d = 0; for (const u of NB[i]) if (state[u] === LIV) { n++; d += dens[u]; } return Math.max(pMat[TILEMAP[i]], dens[i], n ? d / n : 0); };
    const nSup = j => { let n = 0, d = 0; for (const u of NB[j]) if (nat[u] > 0) { n++; d += nat[u]; } return Math.max(nMat[TILEMAP[j]], nat[j], n ? d / n : 0); };
    const pDef = i => pAtk(TILEMAP[i]) * hold(pSup(i)), nDef = j => nAtk(TILEMAP[j]) * hold(nSup(j));
    const frontEdge = new Float64Array(SC); // mean over this region's front tiles of (player push − native push), as the contest is now
    // per-region tallies the contest, the UI and the events read: player / native tiles and their mean stand density,
    // and contact = tiles of this region touching the other organism (player tile beside native cover, or the reverse)
    function compStats() {
      pCnt.fill(0); nCnt.fill(0); pMat.fill(0); nMat.fill(0); contact.fill(0); frontEdge.fill(0); let tot = 0;
      for (const i of LAND_TILES) { const s = TILEMAP[i];
        if (state[i] === LIV) { pCnt[s]++; pMat[s] += dens[i]; } else if (nat[i] > 0) { nCnt[s]++; nMat[s] += nat[i]; tot++; } }
      for (let s = 0; s < SC; s++) { if (pCnt[s]) pMat[s] /= pCnt[s]; if (nCnt[s]) nMat[s] /= nCnt[s]; }
      for (const i of LAND_TILES) { const s = TILEMAP[i];
        // each front tile: (how hard the player could push the native here) − (how hard the native could push the player
        // here), both in THIS region's conditions, each defender with the support it actually has on this front
        if (state[i] === LIV) { let n = 0, d = 0; for (const u of NB[i]) if (nat[u] > 0) { n++; d += nSup(u); }
          if (n) { contact[s]++; frontEdge[s] += Math.max(0, pAtk(s) - nAtk(s) * hold(d / n)) - Math.max(0, nAtk(s) - pDef(i)); } }
        else if (nat[i] > 0) { let n = 0, d = 0; for (const u of NB[i]) if (state[u] === LIV) { n++; d += pSup(u); }
          if (n) { contact[s]++; frontEdge[s] += Math.max(0, pAtk(s) - nDef(i)) - Math.max(0, nAtk(s) - pAtk(s) * hold(d / n)); } } }
      for (let s = 0; s < SC; s++) if (contact[s]) frontEdge[s] /= contact[s];
      return tot;
    }
    // which organism has the advantage in region s now: "none" (no native cover here), "native", "player" or "even". With a
    // front in the region: the mean strength difference over its front tiles; without one: a newcomer of the player (its
    // colony here, or bare seedlings) against the native stands here
    const edgeOf = s => contact[s] ? frontEdge[s]
      : Math.max(0, pAtk(s) - nAtk(s) * hold(nMat[s])) - Math.max(0, nAtk(s) - pAtk(s) * hold(pCnt[s] ? pMat[s] : 0));
    function sideOf(s) {
      if (!nCnt[s]) return "none";
      if (!(vigor[s] > C.grow.growThresh)) return "native"; // the player cannot grow here at all
      const edge = edgeOf(s);
      return edge > EV.advantageMargin ? "player" : edge < -EV.advantageMargin ? "native" : "even";
    }
    // static proof helper (validation): could an ESTABLISHED player colony hold region i against MATURE native cover in the
    // given environment? (player strength at full density = its fitness; native stands settle at their own vigor)
    function holdsAgainstNatives(i, off) {
      if (!CP) return true;
      // (established player: defence = its attack; mature native cover settles at its own fitness → defence ≥ ... ; the player
      // holds and keeps pushing exactly when its attack beats the native's attack)
      return Math.min(evaluate(i, off).fitness, 1) > KC.nativeVigour * Math.min(nativeEvaluate(i, off).fitness, 1);
    }
    if (CP) (function seedNatives() {
      // starting native cover, from the PLANET (not the run RNG): a planet + scenario always starts the same way
      const S = CP.start, r = mulberry32(fnv1a(`${planet.id}|${SCN.id}|native`));
      for (let s = 0; s < SC; s++) { nFit[s] = nativeEvaluate(s, ZERO_OFFSETS).fitness; nVig[s] = nFit[s]; }
      // the origin region and every land tile within originBufferTiles steps of it (over land) start open
      const dist = new Int32Array(N).fill(-1), q = [];
      for (const t of SEC_TILES[ORIGIN]) { dist[t] = 0; q.push(t); }
      for (let h = 0; h < q.length; h++) { const t = q[h]; if (dist[t] >= S.originBufferTiles) continue;
        for (const u of NB[t]) if (dist[u] < 0) { dist[u] = dist[t] + 1; q.push(u); } }
      // no landmass starts more than maxLandmassShare native-held (natural gaps: open ground, open shore, on every island)
      const lmOf = t => CROSS.landmass[t], lmSize = CROSS.landmassSizes, lmUsed = new Int32Array(lmSize.length);
      const ok = t => dist[t] < 0 && nFit[TILEMAP[t]] > GN.growThresh && lmUsed[lmOf(t)] < S.maxLandmassShare * lmSize[lmOf(t)];
      const cand = LAND_TILES.filter(ok);
      const target = Math.min(cand.length, Math.round(lerp(S.coverShare[0], S.coverShare[1], r()) * LAND));
      const nP = S.patches[0] + Math.floor(r() * (S.patches[1] - S.patches[0] + 1));
      const place = t => { nat[t] = clamp(lerp(S.density[0], S.density[1], r()) * nFit[TILEMAP[t]], GN.seedlingDensity, 1); lmUsed[lmOf(t)]++; };
      // patch centres: suitable tiles picked by native fitness², kept apart (sqrt(land / patches) / 2 tiles) when possible
      const cum = []; let tw = 0; for (const t of cand) { tw += nFit[TILEMAP[t]] ** 2; cum.push(tw); }
      const spacing = Math.sqrt(LAND / nP) / 2, centres = [];
      for (let k = 0; k < nP && cand.length; k++) {
        let pick = -1;
        for (let tries = 0; tries < 40; tries++) {
          const w = r() * tw; let lo = 0, hi = cum.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (cum[m] < w) lo = m + 1; else hi = m; }
          const t = cand[lo]; if (nat[t] > 0 || !ok(t)) continue; pick = t;
          if (centres.every(c => Math.hypot(wrapDx(c % W, t % W, W, TOPO), ((c / W) | 0) - ((t / W) | 0)) >= spacing)) break; // (wrap-aware spacing; = c%W − t%W on a rectangle)
        }
        if (pick >= 0 && !(nat[pick] > 0) && ok(pick)) { place(pick); centres.push(pick); }
      }
      // grow the patches round-robin into a random tile of each patch's frontier (organic blobs, never over water)
      const fronts = centres.map(c => NB[c].filter(ok)); let placed = centres.length, grew = true;
      while (placed < target && grew) { grew = false;
        for (const f of fronts) { while (f.length) { const j = (r() * f.length) | 0, t = f[j]; f[j] = f[f.length - 1]; f.pop(); if (nat[t] > 0 || !ok(t)) continue;
            place(t); placed++; grew = true; for (const u of NB[t]) if (ok(u) && !(nat[u] > 0)) f.push(u); break; }
          if (placed >= target) break; } }
    })();
    // live competition state (UI, events, report, validation). default / no competition block: { enabled: false } and nothing else.
    //  native/vigor/fitness: the per-tile stand density and per-region native vigor/fitness arrays; tiles / share: native-held land
    //  now (share of the colonizable land — the same denominator as the player's coverage); startShare / peakShare / peakTick;
    //  contested: regions with at least events.contestedTiles front tiles now; everContested[s] = 1 once region s has been;
    //  flips: tiles the player took from the native, the native took from the player, the native spread into, the native lost
    //  to the environment (cumulative); recent: the same per region, decaying over events.windowSeconds; regions[s]: side
    //  ("none" | "native" | "player" | "even"), contested, dominated; events: real transitions { id, tick, type, sec } with type
    //  "contested" (the first contested region) | "playerAdvantage" | "nativeRetake" | "nativeDominated" (the most recent 64)
    const WINDOW_TICKS = CP ? Math.round(EV.windowSeconds * 1000 / C.tickMs) : 0;
    sim.competition = !CP ? { enabled: false } : { enabled: true, native: nat, vigor: nVig, fitness: nFit, profile: NP,
      tiles: 0, share: 0, startShare: 0, peakShare: 0, peakTick: 0, contested: 0, everContested: new Uint8Array(SC), firstContactTick: null,
      flips: { playerTook: 0, nativeTook: 0, nativeSpread: 0, nativeReceded: 0 }, recent: { gained: gainR, lost: lossR, spread: spreadR, receded: recedeR },
      regionTiles: { player: pCnt, native: nCnt, contact }, regions: SEC.map(() => ({ side: "none", contested: false, dominated: false, announced: null, retakeAfter: 0 })),
      events: [], nextEventId: 1 };
    // a tile's stands thicken more slowly while the other organism holds its neighbours (1 = no crowding)
    function crowded(i, player) { let n = 0; for (const u of NB[i]) if (player ? nat[u] > 0 : state[u] === LIV) n++; return 1 - KC.crowding * n / 4; }
    function compEvent(type, s) { const L = sim.competition.events; L.push({ id: sim.competition.nextEventId++, tick: sim.ticks, type, sec: s }); if (L.length > 64) L.shift(); }
    const dominated = s => nCnt[s] >= EV.dominatedShare * AREA[s] && pCnt[s] < EV.dominatedPlayerBelow * AREA[s];
    function compAfterTick() {
      const CS = sim.competition, tot = compStats(); let contested = 0;
      CS.tiles = tot; CS.share = tot / LAND; if (CS.share > CS.peakShare) { CS.peakShare = CS.share; CS.peakTick = sim.ticks; }
      for (let s = 0; s < SC; s++) {
        const R = CS.regions[s], isC = contact[s] >= EV.contestedTiles, side = sideOf(s); R.contested = isC; R.side = side;
        if (isC) { contested++; CS.everContested[s] = 1; if (CS.firstContactTick === null) { CS.firstContactTick = sim.ticks; compEvent("contested", s); } }
        // the player gains a clear advantage in a contested region (said again only after the native has led there in between)
        if (isC && side === "player" && R.announced !== "player") { R.announced = "player"; compEvent("playerAdvantage", s); }
        else if (side === "native" && R.announced === "player") R.announced = "native";
        // the native retakes meaningful ground: its NET gain from the player here over the recent window (a busy front that
        // trades tiles both ways is not a retake); quiet for 3 windows afterwards in that region
        if (lossR[s] - gainR[s] >= EV.retakeTiles && sim.ticks >= R.retakeAfter) { R.retakeAfter = sim.ticks + 3 * WINDOW_TICKS; compEvent("nativeRetake", s); }
        if (!R.dominated && dominated(s)) { R.dominated = true; compEvent("nativeDominated", s); }
        else if (R.dominated && nCnt[s] < (EV.dominatedShare - 0.15) * AREA[s]) R.dominated = false;
      }
      CS.contested = contested;
    }
    if (CP) { const CS = sim.competition, t = compStats(); CS.tiles = t; CS.share = CS.startShare = CS.peakShare = t / LAND;
      // (regions that START native-held — or within the hysteresis band of it — raise no event: nothing changed hands)
      SEC.forEach((_, s) => { CS.regions[s].dominated = nCnt[s] >= (EV.dominatedShare - 0.15) * AREA[s] && pCnt[s] < EV.dominatedPlayerBelow * AREA[s]; CS.regions[s].side = sideOf(s); }); }
    // one region's competition readout (UI): who holds what, each organism's fitness / maturity / strength here, the side
    // with the advantage, whether it is contested, and why the native is limited here (its limiting factor + direction)
    function competitionAt(i) {
      if (!CP || !validSecC(i)) return null;
      const e = nativeEvaluate(i), pm = pCnt[i] ? pMat[i] : 0, nm = nCnt[i] ? nMat[i] : 0, edge = edgeOf(i);
      return { nativeTiles: nCnt[i], playerTiles: pCnt[i], area: AREA[i], nativeShare: nCnt[i] / AREA[i], playerShare: pCnt[i] / AREA[i],
        nativeFitness: nFit[i], nativeVigor: nVig[i], playerFitness: secFit[i], playerVigor: vigor[i], playerMaturity: pm, nativeMaturity: nm,
        playerAttack: pAtk(i), nativeAttack: nAtk(i), playerHold: pAtk(i) * hold(pm), nativeHold: nAtk(i) * hold(nm), edge, side: sideOf(i), contested: contact[i] >= EV.contestedTiles, contact: contact[i],
        dominated: sim.competition.regions[i].dominated, playerCanGrow: vigor[i] > C.grow.growThresh, nativeCanGrow: nVig[i] > GN.growThresh,
        nativeLimit: e.limitKey, nativeLimitSide: e.side, nativeLimitF: e.limitF,
        recent: { gained: gainR[i], lost: lossR[i], spread: spreadR[i], receded: recedeR[i] } };
    }
    const validSecC = i => Number.isInteger(i) && i >= 0 && i < SC;

    // ---- climate instability (BLOOM-015). Every number is scenario.climateInstability data; nothing names a scenario.
    //  · per sky axis (temp, moist): level 0..1 (how unsettled that part of the climate is), recent (Terraform steps on the
    //    axis, fading over forcing.memorySeconds) and net (the same, signed: + = warming / humidifying).
    //  · FORCING: a Terraform step of |delta| = units × axis.unit adds perStep × units × (1 + compounding × recent) to its
    //    axis — steps on the same axis close together compound; Adapt and Spread purchases add nothing.
    //  · SETTLING: every axis relaxes toward the baseline with settling.halfLifeSeconds (no purchase needed to settle).
    //  · SHOCKS: an axis at or above shocks.threshold (with no shock of its own active or pending, outside its quiet time)
    //    announces a shock (warningSeconds ahead), then it runs durationSeconds: a temporary offset of magnitude
    //    lerp(axis.magnitude, severity) on that sky axis (severity = how far above the threshold the axis rose between the
    //    warning and the start;
    //    ramps in and out over rampSeconds), added to the drift every evaluation reads; it releases `release` of the axis's
    //    excess instability when it starts and ends with the offset back at exactly 0, then the axis stays quiet for
    //    quietSeconds. Direction: an OVERSHOOT continues the recent forcing (warming → heat pulse), a REBOUND swings the other
    //    way (warming → cold snap); which one comes from a planet-derived hash (planet | scenario | axis | shock number),
    //    overshootShare of the time an overshoot — the same purchases at the same times always give the same shocks.
    //  · overall level = the most unsettled axis; bands (data) name it (Stable … Critical).
    //  · events (most recent 64): { id, tick, type: "band" | "shockWarning" | "shockStart" | "shockEnd", … }.
    const CLIM = CI ? (() => {
      const dt = C.tickMs / 1000, axes = {};
      for (const k of CLIMATE_AXES) if (CI.axes[k]) axes[k] = { level: CI.baseline, recent: 0, net: 0, count: 0, pending: null, shock: null, quietUntil: 0, offset: 0, peak: CI.baseline, maxSwing: 0 };
      return { dt, ticks: s => Math.max(1, Math.round(s / dt)), settle: Math.exp(-Math.LN2 * dt / CI.settling.halfLifeSeconds), fade: Math.exp(-dt / CI.forcing.memorySeconds), axes };
    })() : null;
    const bandAt = v => { let k = 0; CI.bands.forEach((b, i) => { if (v >= b.from) k = i; }); return k; };
    const climateLevel = () => { let m = 0; for (const k in CLIM.axes) m = Math.max(m, CLIM.axes[k].level); return m; };
    // deterministic shock direction for the n-th shock on an axis: overshoot (follow the recent forcing) or rebound
    function shockKind(ax, A, n) {
      const r = mulberry32(fnv1a(`${planet.id}|${SCN.id}|climate|${ax}|${n}`)), over = r() < CI.shocks.overshootShare, s0 = r() < 0.5 ? 1 : -1;
      const dir = (A.net > 1e-9 ? 1 : A.net < -1e-9 ? -1 : s0) * (over ? 1 : -1), K = CI.axes[ax][dir > 0 ? "up" : "down"];
      return { axis: ax, sign: dir, id: K.id, name: K.name, overshoot: over };
    }
    // the Terraform forcing one sky step adds to an axis in a given axis state (pure: used by buy() and the preview)
    function forcingOf(A, ax, delta) {
      const units = Math.abs(delta) / CI.axes[ax].unit, add = CI.forcing.perStep * units * (1 + CI.forcing.compounding * A.recent);
      return { units, add, after: Math.min(1, A.level + add) };
    }
    function climateEvent(e) { const L = sim.climate.events; L.push({ id: sim.climate.nextEventId++, tick: sim.ticks, ...e }); if (L.length > 64) L.shift(); }
    function climateBand(cause, axis) { // overall band change → one event (cause: "terraform" | "settling" | "shock")
      const CS = sim.climate, lv = climateLevel(), b = bandAt(lv); CS.level = lv;
      if (lv > CS.peak) { CS.peak = lv; CS.peakTick = sim.ticks; }
      if (b !== CS.band) { climateEvent({ type: "band", from: CS.band, to: b, cause, axis: axis || null, level: lv }); CS.band = b; }
    }
    function climateForce(ax, delta) { // a Terraform purchase on sky axis `ax`
      const A = CLIM.axes[ax]; if (!A) return;
      const f = forcingOf(A, ax, delta), before = A.level;
      A.level = f.after; A.recent += f.units; A.net += Math.sign(delta) * f.units; if (A.level > A.peak) A.peak = A.level;
      sim.climate.forcing.push({ tick: sim.ticks, axis: ax, delta, units: f.units, add: f.add, before, after: A.level });
      climateBand("terraform", ax);
    }
    // one tick of the climate: settle, fade the forcing memory, announce / start / run / end shocks, rebuild the offsets
    function updateClimate() {
      const CS = sim.climate, K = CI.shocks, now = sim.ticks;
      for (const ax in CLIM.axes) { const A = CLIM.axes[ax], cfg = CI.axes[ax];
        A.level = CI.baseline + (A.level - CI.baseline) * CLIM.settle; A.recent *= CLIM.fade; A.net *= CLIM.fade;
        if (!A.shock && !A.pending && now >= A.quietUntil && A.level >= K.threshold) {
          const kind = shockKind(ax, A, A.count + 1); A.pending = { ...kind, startTick: now + (K.warningSeconds > 0 ? CLIM.ticks(K.warningSeconds) : 0), peak: A.level };
          climateEvent({ type: "shockWarning", axis: ax, kind: kind.id, name: kind.name, sign: kind.sign, startTick: A.pending.startTick, level: A.level }); }
        if (A.pending) A.pending.peak = Math.max(A.pending.peak, A.level); // (forcing during the warning makes the coming shock larger)
        if (A.pending && now >= A.pending.startTick) {
          const p = A.pending, sev = clamp((p.peak - K.threshold) / Math.max(1e-9, 1 - K.threshold), 0, 1), mag = lerp(cfg.magnitude[0], cfg.magnitude[1], sev);
          A.count++; A.pending = null;
          A.shock = { n: A.count, axis: ax, id: p.id, name: p.name, sign: p.sign, overshoot: p.overshoot, magnitude: mag, severity: sev, levelAtStart: p.peak,
            startTick: now, endTick: now + CLIM.ticks(K.durationSeconds), ramp: CLIM.ticks(K.rampSeconds) };
          A.level -= K.release * (A.level - CI.baseline);
          CS.shocks.push({ n: A.count, axis: ax, kind: p.id, name: p.name, sign: p.sign, overshoot: p.overshoot, magnitude: +mag.toFixed(3), severity: +sev.toFixed(3),
            levelAtStart: +A.shock.levelAtStart.toFixed(4), startTick: now, endTick: A.shock.endTick, ended: false });
          climateEvent({ type: "shockStart", axis: ax, kind: p.id, name: p.name, sign: p.sign, magnitude: mag, endTick: A.shock.endTick });
        }
        if (A.shock) {
          const S = A.shock, t = now - S.startTick, left = S.endTick - now;
          if (left <= 0) { // the shock is over: the offset is exactly 0 again
            A.offset = 0; A.shock = null; A.quietUntil = now + CLIM.ticks(K.quietSeconds);
            const h = CS.shocks.find(x => x.axis === ax && x.n === S.n); if (h) h.ended = true;
            climateEvent({ type: "shockEnd", axis: ax, kind: S.id, name: S.name });
          } else {
            const env = S.ramp > 0 ? Math.min(1, t / S.ramp, left / S.ramp) : 1;
            A.offset = S.sign * S.magnitude * env; A.maxSwing = Math.max(A.maxSwing, Math.abs(A.offset));
          }
        }
      }
      const P = sim.pressure.offsets, o = CS.offsets; o.temp = CLIM.axes.temp ? CLIM.axes.temp.offset : 0; o.moist = CLIM.axes.moist ? CLIM.axes.moist.offset : 0;
      CS.env = { temp: P.temp + o.temp, moist: P.moist + o.moist, rad: P.rad };
      climateBand("settling");
    }
    // live climate state (UI, events, report, validation). No climateInstability block: { enabled: false } and nothing else.
    //  level / band (index into the scenario's bands) / peak / peakTick; axes[ax] = { level, recent, net, count, pending,
    //  shock, quietUntil, offset, peak, maxSwing }; offsets = the active shock offsets { temp, moist }; env = drift + shock (what
    //  evaluations read); shocks = every shock so far { n, axis, kind, name, sign, overshoot, magnitude, severity, levelAtStart,
    //  startTick, endTick, ended }; forcing = every Terraform push { tick, axis, delta, units, add, before, after }
    sim.climate = !CI ? { enabled: false } : { enabled: true, level: CI.baseline, band: bandAt(CI.baseline), peak: CI.baseline, peakTick: 0, axes: CLIM.axes,
      offsets: { temp: 0, moist: 0 }, env: { ...ZERO_OFFSETS }, shocks: [], forcing: [], events: [], nextEventId: 1 };
    // what one Terraform purchase would do to the climate now (UI preview; no state change): the axis, its level before /
    // after, the overall band before / after, and whether it would set off a shock (and which kind — the direction rule is
    // deterministic) or only add to one already running / announced
    function climatePreview(id) {
      const t = traitById[id]; if (!CI || !t || t.effect.type !== "sky" || !canBuy(t)) return null;
      const ax = t.effect.axis, A = CLIM.axes[ax]; if (!A) return null;
      const f = forcingOf(A, ax, t.effect.delta), K = CI.shocks, lv0 = climateLevel();
      let lv1 = f.after; for (const k in CLIM.axes) if (k !== ax) lv1 = Math.max(lv1, CLIM.axes[k].level);
      const busy = !!(A.shock || A.pending), triggers = !busy && f.after >= K.threshold && sim.ticks + 1 >= A.quietUntil;
      const kind = triggers ? shockKind(ax, { net: A.net + Math.sign(t.effect.delta) * f.units }, A.count + 1) : null;
      // (expected size if nothing else is bought before it starts: the severity of the level right after this purchase)
      const mag = CI.axes[ax].magnitude, magnitude = f.after >= K.threshold ? lerp(mag[0], mag[1], clamp((f.after - K.threshold) / Math.max(1e-9, 1 - K.threshold), 0, 1)) : 0;
      return { axis: ax, add: f.add, axisBefore: A.level, axisAfter: f.after, before: lv0, after: lv1, bandBefore: bandAt(lv0), bandAfter: bandAt(lv1),
        crossesBand: bandAt(lv1) > bandAt(lv0), triggersShock: triggers, kind, magnitude, afterQuiet: !busy && f.after >= K.threshold && !triggers,
        addsToActive: busy, threshold: K.threshold };
    }

    function livingCountBySection() { const c = new Int32Array(SC); for (const i of LAND_TILES) if (state[i] === LIV) c[TILEMAP[i]]++; return c; }
    function coverage() { let l = 0; for (const i of LAND_TILES) if (state[i] === LIV) l++; return l / LAND; }
    // section establishment 0..1 (see dens above) and its ordinary-language status for the inspect panel / map
    function establishment(i) { let d = 0; for (const t of SEC_TILES[i]) if (state[t] === LIV) d += dens[t]; return d / AREA[i]; }
    function colonyStatus(i) {
      const e = establishment(i), S = EST.status;
      const word = e <= 0 ? "none" : e < S.establishing ? "sparse" : e < S.established ? "establishing" : e < S.dense ? "established" : "dense";
      return { establishment: e, word };
    }
    // effective colony modifiers for section s: its allocation mode + its specialization (× (1 + synergy) when they
    // match), each key capped by config.colony.caps. Balanced with no specialization = all zero = the baseline.
    // Protective effects only ever act where the ground is at least marginal (fitness above colony.protectAbove —
    // never red, blocked ground).
    const MOD_KEYS = ["establishBonus", "marginalEstablish", "dieBackCut", "thinningCut", "recoverBonus", "yieldBonus", "yieldCost", "seedBonus", "seedCost", "crossingBonus"];
    const mods = SEC.map(() => Object.fromEntries(MOD_KEYS.map(k => [k, 0]))), modsKey = SEC.map(() => "balanced|null");
    function colonyMods(s) {
      const m = Object.fromEntries(MOD_KEYS.map(k => [k, 0])), mode = sim.colonies.focus[s], sp = sim.colonies.spec[s];
      if (mode !== "balanced") for (const k in COL.modes[mode]) m[k] += COL.modes[mode][k];
      if (sp) { const S = COL.specializations[sp], x = S.mode === mode ? 1 + COL.synergy : 1; for (const k in S.effect) m[k] += S.effect[k] * x; }
      for (const k of MOD_KEYS) if (COL.caps[k] !== undefined) m[k] = Math.min(m[k], COL.caps[k]);
      return m;
    }
    const rootsHolds = s => secFit[s] > COL.protectAbove;
    // keep the most recent crossing events (a UI reads the ones newer than the last id it has seen)
    function crossEvent(e) { const L = sim.crossing.events; e.id = sim.crossing.nextEventId++; L.push(e); if (L.length > 64) L.shift(); }

    function updatePressure() {
      const P = sim.pressure, s = sim.ticks * C.tickMs / 1000, p = progressAt(PR, s), k = phaseAt(PR, s);
      P.seconds = s; P.progress = p; P.offsets = offsetsAt(PR, p, planet.globalClimate);
      if (k !== P.phase) { P.phase = k; P.events.push({ tick: sim.ticks, phase: k, progress: p }); }
    }
    function tick() {
      const g = C.grow;
      if (sim.lost) return 0; // a lost run is frozen
      sim.ticks++;
      if (PR) updatePressure(); // (default: nothing to update — the run is exactly the pre-pressure engine)
      if (CI) updateClimate(); // (BLOOM-015: settle, run shocks; after the drift so env = drift + shock)
      // 1. evaluate fitness + ease vigor
      for (let i = 0; i < SC; i++) { const e = evaluate(i); secFit[i] = e.fitness; secGrowth[i] = e.growthMod; vigor[i] += (e.fitness - vigor[i]) * C.vigorEase;
        const key = sim.colonies.focus[i] + "|" + sim.colonies.spec[i]; if (key !== modsKey[i]) { modsKey[i] = key; mods[i] = colonyMods(i); } }
      if (CP) { const dk = Math.exp(-C.tickMs / 1000 / EV.windowSeconds); // native fitness/vigor; recent-flip tallies decay
        for (let s = 0; s < SC; s++) { nFit[s] = nativeEvaluate(s).fitness; nVig[s] += (nFit[s] - nVig[s]) * GN.vigorEase; gainR[s] *= dk; lossR[s] *= dk; spreadR[s] *= dk; recedeR[s] *= dk; } }
      // 1b. establishment: Living stands thicken while their section supports growth (faster on rich, bright ground),
      // hold in the marginal band between the die and grow thresholds, and thin out when conditions turn lethal.
      for (const i of LAND_TILES) {
        if (state[i] !== LIV) continue;
        const s = TILEMAP[i], v = vigor[s], f = mods[s], prot = rootsHolds(s);
        if (v > g.growThresh) { let d = EST.rate * secGrowth[s] * Math.min(v, 1) * (1 + f.establishBonus) * (1 - dens[i]); if (CP) d *= crowded(i, true); dens[i] += d; }
        else if (v >= g.dieThresh) { if (f.marginalEstablish && prot) { let d = EST.rate * secGrowth[s] * v * f.marginalEstablish * (1 - dens[i]); if (CP) d *= crowded(i, true); dens[i] += d; } }
        else dens[i] = Math.max(EST.minDensity, dens[i] - EST.thinning * (g.dieThresh - v) / g.dieThresh * (prot ? 1 - f.thinningCut : 1));
      }
      // 1c. native stands (competition only): thicken toward the native's own vigor, hold in its marginal band, thin when
      // lethal; a stand below minDensity is gone (the native recedes from that tile)
      if (CP) for (const i of LAND_TILES) { if (!(nat[i] > 0)) continue; const s = TILEMAP[i], v = nVig[s];
        if (v >= GN.dieThresh) { const cap = Math.min(v, 1); nat[i] += (nat[i] < cap ? GN.rate * secGrowth[s] * crowded(i, false) : GN.rate) * (cap - nat[i]); }
        else nat[i] -= GN.thinning * (GN.dieThresh - v) / GN.dieThresh;
        if (nat[i] < GN.minDensity) { nat[i] = 0; recedeR[s]++; sim.competition.flips.nativeReceded++; } }
      if (CP) compStats();
      for (let s = 0; s < SC; s++) estab[s] = establishment(s);
      // 2. transitions (double-buffer to avoid same-tick chaining)
      const next = state.slice();
      const seedMult = 1 + lvl("seedOut") * g.seedOutPerLevel;
      // seed output per source section: an establishing colony seeds weakly (youngSeedShare) and reaches full
      // strength once its establishment reaches the maturity mark (Early Maturity lowers the mark); its allocation /
      // specialization then add seedBonus / crossingBonus and subtract seedCost
      const matAt = Math.max(0.05, g.maturity - lvl("earlyMat") * g.maturityPerEarlyLevel);
      const out = new Float64Array(SC), outX = new Float64Array(SC);
      for (let s = 0; s < SC; s++) { const f = mods[s], base = lerp(g.youngSeedShare, 1, clamp(estab[s] / matAt, 0, 1));
        out[s] = base * Math.max(0, 1 + f.seedBonus - f.seedCost); outX[s] = base * Math.max(0, 1 + f.crossingBonus - f.seedCost); }
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = y * W + x, s = TILEMAP[i];
        if (s < 0) continue; // water/void/lava: never Living or Dead, never seeds
        const v = vigor[s], st = state[i];
        if (st === BAR && CP && nat[i] > 0) { // native-held ground: the player takes it only by out-competing the native here
          let ln = 0, push = 0;
          for (const u of NB[i]) if (state[u] === LIV) { ln++; push += out[TILEMAP[u]]; }
          if (ln > 0 && v > g.growThresh) {
            const adv = pAtk(s) - nDef(i);
            if (adv > 0 && rng() < g.baseFill * seedMult * secFit[s] * (1 + g.seedPerNeighbor * (ln - 1)) * (push / ln) * Math.min(1, adv / KC.scale)) { next[i] = LIV; nflip[i] = 1; }
          }
        } else if (st === BAR) {
          // the four cardinal neighbours come from the shared topology rule (allocation-free; -1 = none). On a rectangle this is
          // exactly the old x > 0 / x < W − 1 / y > 0 / y < H − 1 test, so the RNG draw sequence of every legacy world is unchanged.
          let ln = 0, push = 0; const nl = west(i, W, TOPO), nr = east(i, W, TOPO), nu = north(i, W), nd = south(i, W, H);
          if (nl >= 0 && state[nl] === LIV) { ln++; push += out[TILEMAP[nl]]; } if (nr >= 0 && state[nr] === LIV) { ln++; push += out[TILEMAP[nr]]; }
          if (nu >= 0 && state[nu] === LIV) { ln++; push += out[TILEMAP[nu]]; } if (nd >= 0 && state[nd] === LIV) { ln++; push += out[TILEMAP[nd]]; }
          if (ln > 0 && v > g.growThresh) {
            // more Living neighbours push harder; each pushes with its own colony's seed output (establishment + allocation)
            const p = g.baseFill * seedMult * secFit[s] * (1 + g.seedPerNeighbor * (ln - 1)) * (push / ln);
            if (rng() < p) next[i] = LIV;
          }
        } else if (st === LIV) {
          if (v < g.dieThresh) {
            const cut = rootsHolds(s) ? mods[s].dieBackCut : 0;
            const p = C.die.rate * C.die.damping * (g.dieThresh - v) * C.die.slope * (1 - cut);
            if (rng() < p) next[i] = DEAD;
          }
          if (CP && next[i] === LIV) { // native cover beside this tile may overgrow it, if the native is locally stronger
            let nn = 0, md = 0; for (const u of NB[i]) if (nat[u] > 0) { nn++; md += nat[u]; }
            if (nn > 0 && nVig[s] > GN.growThresh) {
              const adv = nAtk(s) - pDef(i), cut = rootsHolds(s) ? mods[s].dieBackCut : 0;
              if (adv > 0 && rng() < GN.spread * nFit[s] * (1 + GN.seedPerNeighbor * (nn - 1)) * (md / nn) * Math.min(1, adv / KC.scale) * (1 - cut)) { next[i] = BAR; nflip[i] = -1; }
            }
          }
        } else { // DEAD
          if (rng() < C.recover.deadToBarren * (1 + (rootsHolds(s) ? mods[s].recoverBonus : 0))) next[i] = BAR; // Root Network: faster regrowth
        }
      }
      // 2b. waterborne seeds (only once a crossing trait is owned → no rng draw otherwise).
      // Seeds land on another landmass's shore; they establish only under the ordinary grow rule
      // (section vigor above growThresh, scaled by fitness) — never on water, never past a real limit.
      // Source pressure scales with the coastal colony's seed output (establishment, allocation, specialization).
      if (crossStat && lvl(crossStat) > 0) {
        for (let k = 0; k < LANDING.length; k++) {
          const t = LANDING[k]; if (state[t] !== BAR || next[t] !== BAR) continue;
          let pr = 0, top = -1, topW = 0; const src = LSRC[k], w = LW[k];
          for (let j = 0; j < src.length; j++) if (state[src[j]] === LIV) { const x = w[j] * outX[TILEMAP[src[j]]]; pr += x; if (x > topW) { topW = x; top = j; } }
          if (pr <= 0) continue;
          sim.crossing.arrivals++;
          arrAcc[k] += pr; const arrived = arrAcc[k] >= XC.arrivalUnit; if (arrived) arrAcc[k] -= XC.arrivalUnit;
          const s = TILEMAP[t], ev = () => ({ tick: sim.ticks, from: src[top], to: t, gap: LGAP[k][top] });
          // (competition: native-held shore is contested — seeds take root there only if the plant out-competes the native)
          const held = CP && nat[t] > 0, cf = held ? Math.min(1, Math.max(0, pAtk(s) - nDef(t)) / KC.scale) : 1;
          if (vigor[s] > g.growThresh && cf > 0 && rng() < pr * seedMult * secFit[s] * cf) { next[t] = LIV; if (held) nflip[t] = 1; sim.crossing.footholds++; crossEvent({ ...ev(), took: true }); }
          else if (arrived) { sim.crossing.seedArrivals++; crossEvent({ ...ev(), took: false }); } // arrived; the ground may reject them
        }
      }
      // 2c. natives spread into open ground by their own ordinary rule (after the player's spread: open ground the player
      // took this tick is not open any more); native cover the player took this tick no longer seeds
      if (CP) for (const i of LAND_TILES) {
        if (state[i] !== BAR || nat[i] > 0 || next[i] !== BAR) continue; const s = TILEMAP[i]; if (!(nVig[s] > GN.growThresh)) continue;
        let nn = 0, md = 0; for (const u of NB[i]) if (nat[u] > 0 && nflip[u] !== 1) { nn++; md += nat[u]; }
        if (nn > 0 && rng() < GN.spread * nFit[s] * (1 + GN.seedPerNeighbor * (nn - 1)) * (md / nn)) nflip[i] = 2;
      }
      // new stands start as seedlings; tiles that die or clear hold no plants
      for (const i of LAND_TILES) if (next[i] !== state[i]) dens[i] = next[i] === LIV ? EST.seedlingDensity : 0;
      if (CP) { const F = sim.competition.flips;
        for (const i of LAND_TILES) { const f = nflip[i]; if (!f) continue; const s = TILEMAP[i]; nflip[i] = 0;
          if (f === 1) { nat[i] = 0; gainR[s]++; F.playerTook++; } else { nat[i] = GN.seedlingDensity; if (f === -1) { lossR[s]++; F.nativeTook++; } else { spreadR[s]++; F.nativeSpread++; } } } }
      state.set(next);
      // 3. economy: each colony yields by how established its stands are (young stands yield econ.youngYield of a
      // mature one); the origin refuge's own trickle follows the origin colony's establishment. The colony's allocation /
      // specialization scale it: + yieldBonus × (establishment / colony.yieldRampTo, capped at 1) − yieldCost.
      const E = C.econ, yieldOf = new Float64Array(SC);
      for (const i of LAND_TILES) if (state[i] === LIV) yieldOf[TILEMAP[i]] += lerp(E.youngYield, 1, dens[i]);
      let income = 0;
      for (let i = 0; i < SC; i++) {
        const rate = secFit[i] > E.thrivingAbove ? E.thriving : E.marginal, f = mods[i];
        let y = yieldOf[i] * rate;
        if (i === ORIGIN) y += E.originTrickle * lerp(E.youngYield, 1, clamp(establishment(i) / g.maturity, 0, 1));
        income += y * Math.max(0, 1 + f.yieldBonus * clamp(estab[i] / COL.yieldRampTo, 0, 1) - f.yieldCost);
      }
      const liv2 = livingCountBySection();
      sim.biomass += income; sim.income = income; // passive Biomass this tick (bubbles excluded) — for the HUD's rate
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
      if (CP) compAfterTick();
      // 6. extinction (pressure scenarios that enable it): no Living tile anywhere for the whole grace → the run is lost
      if (LOSS && !sim.won) {
        const X = sim.extinction; X.zeroTicks = cov > 0 ? 0 : X.zeroTicks + 1;
        if (X.zeroTicks >= X.graceTicks) { sim.lost = true; sim.lostTick = sim.ticks;
          sim.lostReason = `extinction: no living plants anywhere for ${LOSS.extinctionGraceSeconds} s`; if (sim.onLoss) sim.onLoss(sim.lostReason); }
      }
      return cov;
    }
    function collectBubble(k) { sim.biomass += C.econ.bubbleValue; bubbles.splice(k, 1); }
    // (BLOOM-028D1) a bonus bubble placed on purpose instead of by the tick's random roll: on Living land tile `t`, one per tile.
    // Draws no randomness and changes nothing else; the bubble then behaves exactly like a rolled one (collectBubble, or it
    // collects itself at half value after econ.bubbleAutoTicks). Returns false (and places nothing) for any other tile.
    function placeBubble(t) {
      if (!Number.isInteger(t) || t < 0 || t >= N || TILEMAP[t] < 0 || state[t] !== LIV || bubbles.some(b => b.tile === t)) return false;
      bubbles.push({ tile: t, x: (t % W) + .5, y: ((t / W) | 0) + .5, life: 0 }); return true;
    }

    // ---- upgrades: one implementation per effect type (content/traits.js)
    // a trait is offered only where it can matter: crossing needs at least one real water crossing
    function offered(t) { return t.effect.type !== "crossing" || CROSS.links.length > 0; }
    function costTier(t) { const e = t.effect;
      return e.type === "sky" ? tf[t.id] : e.type === "waterArm" ? lvl("waterPts") : lvl(e.stat); }
    function ownedTier(t) { const e = t.effect;
      return e.type === "sky" ? tf[t.id] : e.type === "waterArm" ? (genome.waterArm === e.arm ? lvl("waterPts") : 0) : lvl(e.stat); }
    function canBuy(t) { const e = t.effect;
      if (e.type === "tempPoint") return lvl("cold") + lvl("heat") < C.scales.tempCap;
      if (e.type === "waterArm") return genome.waterArm === null || genome.waterArm === e.arm;
      if (e.type === "level") return lvl(e.stat) < e.max;
      if (e.type === "crossing") return offered(t) && lvl(e.stat) < e.max;
      return true; }
    function applyTrait(t) { const e = t.effect;
      if (e.type === "tempPoint" || e.type === "level" || e.type === "crossing") genome[e.stat]++;
      else if (e.type === "waterArm") { if (genome.waterArm !== e.arm) { genome.waterArm = e.arm; genome.waterPts = 0; } genome.waterPts++; }
      else if (e.type === "sky") { const v = sky[e.axis] + e.delta; sky[e.axis] = (e.min !== undefined || e.max !== undefined) ? clamp(v, e.min ?? -Infinity, e.max ?? Infinity) : v; tf[t.id]++; } }
    const price = t => Math.round((t.cost.base + costTier(t) * t.cost.step) * C.econ.costScale);
    const why = t => t.blockedWhy ? t.blockedWhy.replace("{tempCap}", C.scales.tempCap) : "";
    function buy(id) {
      const t = traitById[id]; if (!t) return false; const cost = price(t);
      if (!canBuy(t) || sim.biomass < cost) return false;
      const ax = CI && t.effect.type === "sky" ? t.effect.axis : null, was = ax ? sky[ax] : 0;
      sim.biomass -= cost; sim.spent.global += cost; applyTrait(t);
      if (ax && sky[ax] !== was) climateForce(ax, sky[ax] - was); // BLOOM-015: Terraform (only) unsettles its sky axis
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

    // ---- colony development (BLOOM-009). setColonyFocus(i, mode) sets ONE region's allocation (MODES; "balanced"
    // restores the baseline) and touches no other region. It needs plants living there now, is free, needs no upkeep and
    // persists until that region is changed again. A local specialization is bought for one Living region with ordinary
    // Biomass, at most one per region, and is never removed or refunded (changing the allocation keeps it). Neither
    // changes fitness, tolerances or the grow/die thresholds, so neither can open ground the plant cannot live on.
    const validSec = i => Number.isInteger(i) && i >= 0 && i < SC;
    function setColonyFocus(i, mode) {
      if (!validSec(i) || !MODES.includes(mode)) return false;
      if (livingCountBySection()[i] === 0) return false; // only a seeded / Living region can be directed
      sim.colonies.focus[i] = mode; return true;
    }
    const getColonyFocus = i => validSec(i) ? sim.colonies.focus[i] : null;
    const getSpecialization = i => validSec(i) ? sim.colonies.spec[i] : null;
    function specPrice() { const n = sim.colonies.spec.filter(Boolean).length;
      return Math.round((COL.specCost.base + COL.specCost.step * n) * C.econ.costScale); }
    // why a specialization cannot be bought here now: null = it can; else "unknown" | "noColony" | "hasOne" | "biomass"
    function specBlock(i, id) {
      if (!validSec(i) || !COL.specializations[id]) return "unknown";
      if (livingCountBySection()[i] === 0) return "noColony";
      if (sim.colonies.spec[i]) return "hasOne";
      return sim.biomass < specPrice() ? "biomass" : null;
    }
    function buySpecialization(i, id) {
      if (specBlock(i, id)) return false;
      const cost = specPrice(); sim.biomass -= cost; sim.spent.local += cost; sim.colonies.spec[i] = id; return true;
    }

    Object.assign(sim, { derived, evaluate, lampOf, tick, coverage, livingCountBySection, collectBubble, placeBubble,
      traitById, offered, price, canBuy, ownedTier, why, buy, previewOf, establishment, colonyStatus,
      nativeEvaluate: CP ? nativeEvaluate : null, competitionAt, holdsAgainstNatives,
      climatePreview, envOffsets,
      COLONY_MODES: MODES, setColonyFocus, getColonyFocus, getSpecialization, specPrice, specBlock, buySpecialization, colonyMods });
    return sim;
  }

  root.BLOOM = Object.assign(root.BLOOM || {}, { createSim, resolveLayout, growVoronoi,
    pressure: { DEFAULT_SCENARIO, LEGACY_SCENARIO_ALIASES, CHANNELS, CLIMATE_AXES, checkScenario, checkCompetition, checkClimateInstability, resolveScenario, isDynamic, progressAt, offsetsAt, maxOffsets, phaseAt },
    geo: { RECT, CYLINDER, normalizeTopology, topologyOf, west, east, north, south, neighbors4, forEachNeighbor4, wrapDx, longitudeCenter,
      components, sectionAdjacency, sectionPieces, waterCrossings, reachableLandmasses }, util: { clamp, lerp, band, overLimit } });
})(typeof window !== "undefined" ? window : globalThis);
