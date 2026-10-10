// BLOOM — planet validator (bible §10.3 layers 1–8 + structural integrity). BLOOM-003 … BLOOM-006.
//
//   BLOOM.validatePlanet(planet, config, { traits, regenerate }) → { ok, errors[], warnings[], stats }
//
// Works on authored and procedural planets alike, through the SAME layout path the simulation
// uses (BLOOM.resolveLayout), so it validates what will actually run. Checks: tile ownership,
// land-section contiguity, empty/malformed sections, origin validity, adjacency consistency
// (declared neighbours vs real geography), the land/water win denominator (against a real
// BLOOM.createSim when `traits` is given) and, for procedural planets, seed reproduction
// (when `regenerate` — e.g. BLOOM.generatePlanet — is given).
// Reachability (BLOOM-004, §10.3 layer 3): ordinary spread (same landmass) vs the strongest Spread
// crossing in `traits` (Waterborne Seeds → config.crossing.maxGap). Islands that need the trait are
// fine (a reason to buy it); land unreachable even with it fails a procedural planet.
// Winnability (BLOOM-005, §10.3 layers 4–6) with { winnability: true }: a real no-cheat witness run from
// BLOOM.findWitness (resources/bloom-witness.js) must hold winThreshold + config.validation.winMargin.
// Strategy diversity + pacing (BLOOM-006, §10.3 layers 7–8) with { winnability: true, strategies: { minStrategies,
// pacing } } (an archetype's validation policy): BLOOM.findStrategies must prove `minStrategies` materially
// distinct broad strategies that win with margin (layer 7) AND meet the pacing time bands (layer 8). Only
// PASS passes; a capped search is an INCONCLUSIVE error, never a pass.
// Topology (BLOOM-027A): the planet's `topology` ({ wrapX, wrapY }, absent = rectangle) is validated and then every geographic
// judgement — contiguity, landmasses, neighbours, reachability, crossings — is made under it through the shared BLOOM.geo
// helpers. On a cylinder a section on both sides of the seam is one piece when its tiles connect across it, and two different
// sections touching only across the seam are real neighbours. Seam contact never merges ids. Rectangular validation is unchanged.
(function (root) {
  "use strict";
  const BLOOM = root.BLOOM;
  if (!BLOOM || !BLOOM.resolveLayout) throw new Error("bloom-validate.js needs resources/bloom-sim.js loaded first");
  const { components, sectionAdjacency, sectionPieces, waterCrossings, reachableLandmasses } = BLOOM.geo;
  const SIGNALS = ["tempOffset", "moistureOffset", "light", "ph", "salinity", "toxicity", "radiation", "nutrients"];

  function validatePlanet(planet, config, opts = {}) {
    const errors = [], warnings = [], stats = {};
    const err = m => errors.push(m), warn = m => warnings.push(m);
    const done = () => ({ ok: errors.length === 0, errors, warnings, stats });

    // --- structure
    const W = planet && planet.gridWidth, H = planet && planet.gridHeight;
    if (!Number.isInteger(W) || !Number.isInteger(H) || W < 1 || H < 1) { err("grid: gridWidth/gridHeight must be positive integers"); return done(); }
    const N = W * H, ALL = planet.sections;
    if (!Array.isArray(ALL) || !ALL.length) { err("sections: planet has no sections"); return done(); }
    const ids = new Set();
    ALL.forEach((s, i) => {
      if (!s || typeof s.id !== "string" || !s.id) { err(`sections[${i}]: missing id`); return; }
      if (ids.has(s.id)) err(`sections: duplicate id "${s.id}"`); ids.add(s.id);
      if (typeof s.name !== "string" || !s.name) err(`${s.id}: missing name`);
      if ((s.kind || "land") === "land") {
        if (!s.local) err(`${s.id}: missing local signals`);
        else for (const k of SIGNALS) if (!Number.isFinite(s.local[k])) err(`${s.id}: local.${k} is not a finite number`);
      }
    });
    const g = planet.globalClimate || {};
    if (!Number.isFinite(g.temperature) || !Number.isFinite(g.moisture)) err("globalClimate: temperature/moisture must be finite numbers");
    const topo = BLOOM.geo.normalizeTopology(planet.topology);
    if (typeof topo === "string") err(topo); else if (topo.wrapX && !(W >= 3)) err("topology: wrapX needs gridWidth ≥ 3");
    const flagged = ALL.filter(s => s && s.isOrigin).map(s => s.id);
    if (flagged.length > 1 || (flagged.length === 1 && flagged[0] !== planet.origin)) err(`origin: isOrigin flags (${flagged.join(",")}) disagree with origin "${planet.origin}"`);
    if (errors.length) return done();

    // --- tile ownership, via the simulation's own layout path
    let layout;
    try { layout = BLOOM.resolveLayout(planet, config); } catch (e) { err("tiles: " + e.message); return done(); }
    const tm = layout.tilemap, SEC = layout.sections, SC = SEC.length;
    if (tm.length !== N) { err(`tiles: layout has ${tm.length} tiles, expected ${N}`); return done(); }
    const area = new Int32Array(SC); let land = 0, bad = 0;
    for (let i = 0; i < N; i++) { const v = tm[i]; if (v === -1) continue; if (!Number.isInteger(v) || v < 0 || v >= SC) { bad++; continue; } area[v]++; land++; }
    if (bad) { err(`tiles: ${bad} tiles are owned by no valid land section`); return done(); }
    stats.width = W; stats.height = H; stats.tiles = N; stats.landTiles = land; stats.waterTiles = N - land;
    stats.waterPct = Math.round((N - land) / N * 1000) / 10; stats.sections = SC; stats.impassableSections = layout.impassable.length;
    // (reported only for planets that DECLARE a topology, so every legacy planet's validator record stays byte-identical)
    if (planet.topology !== undefined) stats.topology = { wrapX: layout.topology.wrapX, wrapY: layout.topology.wrapY };
    if (!SC) { err("sections: no land sections"); return done(); }
    if (land + stats.waterTiles !== N) err("denominator: land + water tiles do not add up to the grid");

    // --- sections: non-empty, contiguous, declared area (procedural = exact)
    const pieces = sectionPieces(tm, W, H, SC, topo);
    stats.brokenSections = 0;
    SEC.forEach((s, i) => {
      if (!area[i]) { err(`${s.id}: land section has no tiles`); stats.brokenSections++; }
      else if (pieces[i] !== 1) { err(`${s.id}: land section is split into ${pieces[i]} pieces (must be contiguous)`); stats.brokenSections++; }
      if (planet.procedural && s.area !== area[i]) err(`${s.id}: area ${s.area} ≠ actual ${area[i]} tiles`);
      if (area[i] && area[i] < 5) warn(`${s.id}: only ${area[i]} tiles — hard to read on the map`);
    });

    // --- landmasses (4-connected land), origin
    const lm = components(Array.from(tm, v => v >= 0 ? 1 : 0), W, H, topo);
    const secMass = SEC.map((_, i) => { for (let t = 0; t < N; t++) if (tm[t] === i) return lm.id[t]; return -1; });
    stats.landmasses = lm.sizes.length;
    const oi = SEC.findIndex(s => s.id === planet.origin);
    if (oi < 0) { err(`origin: "${planet.origin}" is not a land section`); return done(); }
    if (!area[oi]) err("origin: origin section has no tiles");
    const biggest = lm.sizes.indexOf(Math.max(...lm.sizes));
    stats.origin = planet.origin; stats.originLandmass = secMass[oi]; stats.originLandmassTiles = lm.sizes[secMass[oi]] || 0;
    if (secMass[oi] !== biggest) (planet.procedural ? err : warn)(`origin: not on the largest landmass (${stats.originLandmassTiles} of ${lm.sizes[biggest]} tiles)`);
    if (planet.procedural) SEC.forEach((s, i) => { if (s.landmass !== undefined && secMass.findIndex(m => m === secMass[i]) !== SEC.findIndex(x => x.landmass === s.landmass))
      err(`${s.id}: landmass tag ${s.landmass} disagrees with the geography`); });

    // --- adjacency: geography is the truth; declared neighbours must be real, symmetric, land
    const geo = sectionAdjacency(tm, W, H, SC, topo), idx = Object.fromEntries(SEC.map((s, i) => [s.id, i]));
    for (let a = 0; a < SC; a++) for (const b of geo[a]) if (!geo[b].includes(a)) err(`adjacency: geographic adjacency not symmetric (${SEC[a].id}/${SEC[b].id})`);
    let declared = 0, matched = 0; const missing = [];
    SEC.forEach((s, a) => {
      if (!s.neighbors) return;
      for (const nid of s.neighbors) {
        declared++; const b = idx[nid];
        if (b === undefined) { err(`${s.id}: neighbour "${nid}" is not a land section`); continue; }
        if (!(SEC[b].neighbors || []).includes(s.id)) err(`adjacency: ${s.id}→${nid} declared one way only`);
        if (geo[a].includes(b)) matched++; else { missing.push(`${s.id}~${nid}`); err(`adjacency: ${s.id} and ${nid} are declared neighbours but do not touch`); }
      }
      if (planet.procedural && s.neighbors.length !== geo[a].length) err(`${s.id}: neighbour list does not match the geography`);
    });
    stats.declaredAdjacency = { declared, matched, missing };

    // --- reachability: ordinary spread (land adjacency) vs the strongest available Spread crossing
    const seen = new Set([oi]), st = [oi];
    while (st.length) { const a = st.pop(); for (const b of geo[a]) if (!seen.has(b)) { seen.add(b); st.push(b); } }
    stats.reachableSections = seen.size;
    stats.strandedSections = SEC.filter((_, i) => !seen.has(i)).map(s => s.id);
    stats.reachableLandShare = Math.round(stats.originLandmassTiles / land * 1000) / 1000;
    const crossTrait = (opts.traits || []).find(t => t.effect && t.effect.type === "crossing") || null;
    const gap = crossTrait ? ((config.crossing && config.crossing.maxGap) || 0) : 0;
    const cr = waterCrossings(tm, W, H, gap, topo), massesReached = reachableLandmasses(secMass[oi], cr.links);
    const reachSet = (ok) => { const secs = SEC.map((s, i) => ok(i) ? null : s.id).filter(Boolean);
      const masses = [...new Set(SEC.map((_, i) => secMass[i]).filter(m => !ok(SEC.findIndex((_, j) => secMass[j] === m))))];
      const tiles = SEC.reduce((a, _, i) => a + (ok(i) ? area[i] : 0), 0);
      return { reachableSections: SC - secs.length, landShare: +(tiles / land).toFixed(3), strandedSections: secs, strandedLandmasses: masses }; };
    stats.reach = {
      base: { rule: "ordinary spread (land adjacency)", ...reachSet(i => seen.has(i)) },
      strongest: { rule: crossTrait ? `${crossTrait.name} (water gap ≤ ${gap} tiles)` : "no crossing Spread trait available", maxGap: gap,
        ...reachSet(i => massesReached.has(secMass[i])) },
      crossingLinks: cr.links.filter(l => l.from < l.to),
    };
    stats.reach.requiresCrossing = stats.reach.base.strandedSections.length > 0 && stats.reach.strongest.strandedSections.length === 0;
    const strandedAll = stats.reach.strongest.strandedSections;
    if (strandedAll.length) (planet.procedural ? err : warn)(`reachability: ${strandedAll.length} section(s) on ${stats.reach.strongest.strandedLandmasses.length} landmass(es) stay unreachable even with ${stats.reach.strongest.rule}`);
    else if (stats.reach.requiresCrossing) warn(`reachability: ${stats.reach.base.strandedSections.length} section(s) need ${crossTrait.name}`);

    // --- the simulation agrees on the denominator (real engine instance)
    if (opts.traits && !errors.length) {
      const sim = BLOOM.createSim(planet, config, opts.traits, { rng: () => 0.5 });
      if (sim.map.LAND !== land) err(`denominator: engine counts ${sim.map.LAND} colonizable tiles, validator ${land}`);
      if (sim.map.SC !== SC || SEC.some((s, i) => sim.map.AREA[i] !== area[i])) err("denominator: engine section areas disagree with the layout");
    }
    // --- procedural planets must reproduce exactly from their seed + params
    if (planet.procedural && opts.regenerate) {
      if (!planet.params) err("determinism: procedural planet has no params");
      else { const { archetype, ...generated } = planet; // archetype metadata is added after generation
        if (JSON.stringify(opts.regenerate(planet.params)) !== JSON.stringify(generated)) err(`determinism: seed ${planet.params.seed} does not reproduce this planet`); }
    }
    // --- layers 4–6 (+ 7–8 when a strategy policy is given): real witness builds under the real economy
    // (BLOOM-035B) opts.species: layers 4–8 prove THIS player physiology (a BLOOM.species.resolve object); absent = the reference
    // physiology. Layers 1–3 and determinism are physical (no plant). World construction never passes a species.
    if (opts.winnability && !errors.length) {
      if (!BLOOM.findWitness) err("winnability: resources/bloom-witness.js is not loaded");
      else if (!opts.traits) err("winnability: needs the trait catalogue (opts.traits)");
      else {
        const LAYER = { 4: "simultaneous coverage", 5: "affordability/order", 6: "winnable margin", 7: "strategy diversity", 8: "pacing" };
        const sp = opts.strategies;
        if (sp) {
          const r = BLOOM.findStrategies(planet, config, opts.traits, { minStrategies: sp.minStrategies, pacing: sp.pacing,
            excludeTraits: opts.excludeTraits, measurePeak: opts.measurePeak, ...(opts.species ? { species: opts.species } : {}) });
          stats.witness = r.first; stats.strategies = r;
          if (!r.ok) err(`layer ${r.layer} (${LAYER[r.layer]})${r.status === "INCONCLUSIVE" ? " INCONCLUSIVE" : ""}: ${r.reason}`);
        } else {
          const w = BLOOM.findWitness(planet, config, opts.traits, { excludeTraits: opts.excludeTraits, measurePeak: opts.measurePeak, ...(opts.species ? { species: opts.species } : {}) });
          stats.witness = w;
          if (!w.ok) err(`layer ${w.layer} (${LAYER[w.layer]}): ${w.reason}`);
        }
      }
    }
    return done();
  }

  root.BLOOM.validatePlanet = validatePlanet;
})(typeof window !== "undefined" ? window : globalThis);
