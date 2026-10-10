// BLOOM — Destination Survey data (BLOOM-028A, validated identity BLOOM-028A1): which candidate worlds a sector shows, how
// each is classified, and the human-readable dossier for one world. Pure ES module: no DOM, no Three.js, no globals written,
// no module state, so Node can import it (tools/destination-survey-check.js). The BLOOM classic scripts are passed in as
// `deps = { BLOOM, BLOOM_DATA }` (default: globalThis), never re-implemented here.
//
// IDENTITY CONTRACT (028A1). Every archetype candidate is a FULLY VALIDATED world, produced by the play flow's own production
// path — BLOOM.play.runSearch({ archetype, scenario: null (the default), seeds: [seed] }): BLOOM.generateFromArchetype layers 1–8
// (structure, reachability, winnability witness, strategy diversity, pacing) and then BLOOM.play.stripPlanet. That planet
// object is what the globe draws, what the dossier measures, and what Begin Expedition hands on. It is AUTHORITATIVE: nobody
// regenerates it from its seed later (the seed is provenance only). A world is never shown before it is validated.
//
// PRESENTATION ONLY otherwise. Nothing here changes generation, validation, simulation or gameplay:
//   · STABLE / VOLATILE / EXTREME classify how much land the STARTING plant can already live on, read from the engine's own
//     evaluate() (the region lamps a player sees at the start of a run). No mechanic reads them. The bands were recalibrated in
//     028A1 on validated worlds (90-world sample, tertiles 21% / 34%): ≥ 35% Favorable, ≥ 20% Precarious, else Extreme.
//     (BLOOM-033: renamed from Stable / Volatile / Extreme — same thresholds, same columns, same worlds — so the survey's difficulty axis
//     never collides with the separate Volatile Climate challenge mechanic. Ids favorable / precarious / extreme.)
//   · the dossier words come from the same evaluate() plus plain planet data (tilemap, section conditions, starting sky).
//   · a cheap STRUCTURAL world (generateFromArchetype with { winnability: false }, layers 1–3) is used only to PREDICT a draw's
//     column, so slow validations are spent on draws that column needs. It is never shown, stored or returned.

export const SURVEY_CLASSES = [
  { id: "favorable",  label: "Favorable",  minHabitable: 0.35, blurb: "Broad footholds on arrival" },
  { id: "precarious", label: "Precarious", minHabitable: 0.20, blurb: "Refuges beside hostile ground" },
  { id: "extreme",  label: "Extreme",  minHabitable: 0,    blurb: "Little land habitable on arrival" },
];
export const ROWS = 3; // a sector is a 3 × 3 matrix: one column per class, ROWS candidates each
// A column's draw budget. A column needs 6–11 draws in practice; the budget only bounds a pathological stream. Since 028B a
// column never borrows a world of another class (owner rule), so the budget is generous (was 60 with a "nearest" fill).
export const MAX_DRAWS = 400;
export const VALIDATION_PATH = "BLOOM.play.searchWorld (default scenario) → generateFromArchetype layers 1–8 → stripPlanet";

const mulberry32 = a => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const deps0 = deps => ({ BLOOM: (deps && deps.BLOOM) || globalThis.BLOOM, BLOOM_DATA: (deps && deps.BLOOM_DATA) || globalThis.BLOOM_DATA });
const pct = x => Math.round(x * 100);
const now = () => (globalThis.performance ? performance.now() : Date.now());

/** The class a starting habitable-land share falls in (shares ≥ a class's minHabitable belong to the first such class). */
export const classFor = habitable => SURVEY_CLASSES.find(c => habitable >= c.minHabitable) || SURVEY_CLASSES[SURVEY_CLASSES.length - 1];

/** The sector seed that follows `sectorSeed` (SCAN NEW SECTOR walks this chain, so a sector is reproducible from its seed). */
export const nextSectorSeed = sectorSeed => 1 + Math.floor(mulberry32((sectorSeed >>> 0) ^ 0x9e3779b9)() * 999998);

/** A short sector designation for the header, e.g. "Sector 4F-271" (derived from the seed only). */
export const sectorLabel = sectorSeed => { const s = sectorSeed >>> 0; return `Sector ${(s % 9) + 1}${"ABCDEFGHJK"[(s >>> 4) % 10]}-${String(s % 1000).padStart(3, "0")}`; };

/**
 * Deterministic fingerprint of everything that makes a planet THIS world for gameplay (identity, grid, topology, sky, every
 * section's id / area / landmass / origin flag / neighbours / conditions, and the full tilemap). For QA and provenance only —
 * compares a world across the worker boundary and through focus / Begin Expedition without relying on object identity.
 * Never shown to the player.
 */
export function planetFingerprint(planet) {
  let h1 = 0x811c9dc5, h2 = 0x01000193;
  const add = n => { n |= 0; h1 = Math.imul(h1 ^ (n & 0xffff), 0x01000193); h1 = Math.imul(h1 ^ (n >>> 16), 0x01000193); h2 = Math.imul(h2 ^ n, 0x5bd1e995); h2 ^= h2 >>> 13; };
  const str = s => { s = String(s); add(s.length); for (let i = 0; i < s.length; i++) add(s.charCodeAt(i)); };
  str(JSON.stringify([planet.id, planet.name, planet.gridWidth, planet.gridHeight, planet.topology || null, planet.origin || null, planet.winThreshold ?? null, planet.globalClimate,
    (planet.sections || []).map(x => [x.id, x.area ?? null, x.landmass ?? null, !!x.isOrigin, x.neighbors, x.local])]));
  const T = planet.tilemap || []; add(T.length); for (let i = 0; i < T.length; i++) add(T[i] + 1);
  return (h1 >>> 0).toString(16).padStart(8, "0") + (h2 >>> 0).toString(16).padStart(8, "0");
}

/**
 * What the starting plant meets on this world, measured with the engine's own evaluate() under the starting genome and sky:
 * per-section lamps (green / yellow / red) and limiting conditions, area-weighted over the land.
 */
export function assessWorld(planet, deps) {
  const { BLOOM, BLOOM_DATA: D } = deps0(deps);
  const sim = BLOOM.createSim(planet, D.config, D.traits, { rng: () => 0.5 }), M = sim.map;
  let land = 0; const lamps = { green: 0, yellow: 0, red: 0 }, limits = {}, words = { Temperature: {}, Water: {}, Soil: {}, Hazard: {} };
  const temps = [], regions = [];
  M.SEC.forEach((sec, i) => {
    const e = sim.evaluate(i), a = sec.area || M.AREA[i] || 1, lamp = sim.lampOf(e.fitness);
    land += a; lamps[lamp] += a; temps.push([e.effT, a]); regions.push({ area: a, light: sec.local.light, radiation: sec.local.radiation });
    for (const k in e.cats) words[k][e.cats[k].word] = (words[k][e.cats[k].word] || 0) + a;
    if (lamp !== "green" && e.limitKey) { const key = e.limitKey + ":" + e.cats[e.limitKey].word; limits[key] = (limits[key] || 0) + a; }
  });
  const share = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v / land]));
  const landmasses = new Set(M.LANDMASS).size;
  let water = 0; for (const t of M.TILEMAP) if (t < 0) water++;
  return { land, habitable: lamps.green / land, lamps: share(lamps), limits: share(limits),
    words: Object.fromEntries(Object.entries(words).map(([k, v]) => [k, share(v)])), temps, regions, landmasses,
    waterShare: water / M.TILEMAP.length, sections: M.SEC.length }; // plain data only (structured-cloneable: a worker can post it)
}

/** The column a STRUCTURAL world for { archetype, seed } would fall in (layers 1–3 only): a cheap prediction, never shown. */
export function predictClass(archetypeId, seed, deps) {
  const { BLOOM, BLOOM_DATA: D } = deps0(deps), A = D.archetypes.find(a => a.id === archetypeId);
  try { return classFor(assessWorld(BLOOM.generateFromArchetype(A, seed, { config: D.config, traits: D.traits, winnability: false }), deps).habitable).id; }
  catch (e) { if (e.attempts) return null; throw e; }
}

/**
 * One survey candidate. For an archetype + public seed: the FULLY VALIDATED world from the production play path
 * (VALIDATION_PATH), or null when no world for that seed passes. `{ authored: "first_bloom" }` makes the authored First Bloom
 * candidate (the hand-made tutorial world is played as authored; it has no generator to validate).
 * The returned `planet` is authoritative — see the header.
 */
export function makeCandidate(spec, deps) {
  const { BLOOM, BLOOM_DATA: D } = deps0(deps);
  let planet, archetype = null, validation;
  const t0 = now();
  if (spec.authored) { planet = D.planets[spec.authored]; if (!planet) return null; validation = { path: "authored", validated: true }; }
  else {
    archetype = D.archetypes.find(a => a.id === spec.archetypeId);
    if (!archetype) throw new Error(`survey: unknown archetype ${spec.archetypeId}`);
    if (!BLOOM.play || !BLOOM.play.runSearch) throw new Error("survey: load content/scenarios.js, resources/bloom-scenario.js and resources/bloom-play.js (the production validation path)");
    const r = BLOOM.play.runSearch({ archetype, scenario: null, seeds: [spec.seed >>> 0], config: D.config, traits: D.traits });
    if (!r.ok) return null;
    planet = r.planet;
    const a = planet.archetype;
    validation = { path: VALIDATION_PATH, validated: !!(a && a.winnabilityChecked && a.validatedLayers && a.validatedLayers.includes(8)),
      layers: a.validatedLayers, attempt: a.attempt, publicSeed: a.publicSeed, ms: Math.round(now() - t0) };
  }
  const w = assessWorld(planet, deps), cls = classFor(w.habitable);
  const fb = spec.authored && D.play && D.play.firstBloom;
  const cand = {
    key: spec.authored ? "authored:" + spec.authored : `${archetype.id}:${spec.seed}`,
    authored: !!spec.authored, archetypeId: archetype ? archetype.id : null,
    seed: spec.authored ? null : spec.seed >>> 0,              // provenance only: never regenerate the world from it
    attempt: planet.archetype ? planet.archetype.attempt : null,
    name: planet.name, worldType: archetype ? archetype.name : "Authored world",
    descriptor: archetype ? archetype.name : (fb ? "Hand-made training world" : "Authored world"),
    tagline: archetype ? archetype.display.tagline : (fb ? fb.tagline : ""),
    cue: archetype ? archetype.display.cue : (fb ? fb.summary : ""),
    planet, render: (archetype && archetype.render) || null, validation,
    habitable: w.habitable, classId: cls.id, assessment: w,
    fingerprint: planetFingerprint(planet),                    // QA / provenance only (not shown)
  };
  cand.dossier = surveyDossier(cand, deps);
  return cand;
}

/**
 * One column of a sector: ROWS validated worlds of class SURVEY_CLASSES[column], drawn from a deterministic stream of
 * (archetype, World Seed) pairs for (sectorSeed, column). Each draw is first PREDICTED with a cheap structural world; only a
 * draw predicted for this column is validated (the slow part). A validated world whose real class differs is discarded: a
 * column only ever holds worlds of its class (028B; an unfilled row would stay empty). Columns are independent, so a sector's
 * three columns can be built in parallel (one task each) and still come out identical.
 * A generator: yields { found, draws, validations } after each draw; returns { column, cells, stats }.
 * `firstBloom: true` puts the authored First Bloom at the top of its own class column.
 */
export function* columnCandidates(sectorSeed, column, deps, { firstBloom = false, maxDraws = MAX_DRAWS } = {}) {
  const { BLOOM_DATA: D } = deps0(deps), want = SURVEY_CLASSES[column].id, t0 = now();
  const rng = mulberry32(((sectorSeed >>> 0) ^ 0x5eed0028) + column * 0x9e3779b1), pol = (D.play && D.play.search) || { seedMin: 1, seedMax: 99999 };
  const cells = [], seen = new Set(), stats = { draws: 0, predictions: 0, validations: 0, wasted: 0, failed: 0, predictMs: 0, validateMs: 0, byArchetype: {} };
  if (firstBloom) { const fb = makeCandidate({ authored: "first_bloom" }, deps); if (fb && fb.classId === want) { cells.push(fb); seen.add(fb.key); } }
  yield { found: cells.length, draws: 0, validations: 0 };
  while (cells.length < ROWS && stats.draws < maxDraws) {
    stats.draws++;
    const A = D.archetypes[Math.floor(rng() * D.archetypes.length)], seed = pol.seedMin + Math.floor(rng() * (pol.seedMax - pol.seedMin + 1));
    const key = `${A.id}:${seed}`; if (seen.has(key)) continue; seen.add(key);
    let t = now(); const predicted = predictClass(A.id, seed, deps); stats.predictions++; stats.predictMs += now() - t;
    if (predicted !== want) continue;
    t = now(); const c = makeCandidate({ archetypeId: A.id, seed }, deps); const ms = now() - t;
    stats.validations++; stats.validateMs += ms;
    const by = stats.byArchetype[A.id] || (stats.byArchetype[A.id] = { validations: 0, ms: 0, maxMs: 0 }); by.validations++; by.ms += ms; by.maxMs = Math.max(by.maxMs, ms);
    if (!c) stats.failed++;
    else if (c.classId === want) cells.push(c);
    else stats.wasted++; // validated, but its real class belongs to another column
    yield { found: cells.length, draws: stats.draws, validations: stats.validations };
  }
  // (028B, owner rule) a column only ever holds worlds of ITS class: no wrong-class "nearest" fill; an unfilled row stays empty
  cells.sort((a, b) => (b.authored - a.authored) || (b.habitable - a.habitable));
  stats.ms = Math.round(now() - t0); stats.predictMs = Math.round(stats.predictMs); stats.validateMs = Math.round(stats.validateMs);
  return { sectorSeed: sectorSeed >>> 0, column, cells, stats };
}
/**
 * PARALLEL COLUMN (BLOOM-028B): the same column as columnCandidates, split so its slow validations can run concurrently.
 * planColumn walks the column's deterministic draw stream (cheap predictions only) and returns the next `want` draws that are
 * predicted for this column; every pick is then validated on its own (makeCandidate, in any worker, in any order);
 * columnFromValidated applies columnCandidates' acceptance rule to the results IN STREAM ORDER — same stopping point, same
 * rule — so a column (and so a sector) is identical whichever path built it. Validations of picks beyond
 * the stopping point are speculative and simply discarded. (Plain data in and out: postable to and from workers.)
 *   planColumn(sectorSeed, column, deps, { firstBloom, fromDraw = 0, want, maxDraws = MAX_DRAWS })
 *     → { fb, picks: [{ draw, archetypeId, seed }], nextDraw, exhausted, predictions, predictMs }
 *     (fb: the First Bloom candidate when firstBloom and fromDraw = 0 and it belongs to this column, else null)
 */
export function planColumn(sectorSeed, column, deps, { firstBloom = false, fromDraw = 0, want = ROWS + 1, maxDraws = MAX_DRAWS } = {}) {
  const { BLOOM_DATA: D } = deps0(deps), wantClass = SURVEY_CLASSES[column].id;
  const rng = mulberry32(((sectorSeed >>> 0) ^ 0x5eed0028) + column * 0x9e3779b1), pol = (D.play && D.play.search) || { seedMin: 1, seedMax: 99999 };
  const seen = new Set(), picks = []; let fb = null, draws = 0, predictions = 0, predictMs = 0;
  if (firstBloom) { const c = makeCandidate({ authored: "first_bloom" }, deps); if (c && c.classId === wantClass) { seen.add(c.key); if (fromDraw === 0) fb = c; } }
  const next = () => { draws++; const A = D.archetypes[Math.floor(rng() * D.archetypes.length)], seed = pol.seedMin + Math.floor(rng() * (pol.seedMax - pol.seedMin + 1)); return { A, seed, key: `${A.id}:${seed}` }; };
  while (draws < fromDraw) { const d = next(); seen.add(d.key); } // replay the stream (rng only) up to where the last plan stopped
  while (picks.length < want && draws < maxDraws) {
    const d = next(); if (seen.has(d.key)) continue; seen.add(d.key);
    const t = now(), predicted = predictClass(d.A.id, d.seed, deps); predictions++; predictMs += now() - t;
    if (predicted === wantClass) picks.push({ draw: draws, archetypeId: d.A.id, seed: d.seed });
  }
  return { fb, picks, nextDraw: draws, exhausted: draws >= maxDraws, predictions, predictMs: Math.round(predictMs) };
}

/**
 * The column from validated picks: `results` = [{ draw, cand }] in stream order (cand = makeCandidate's result, null when no
 * world passed); `exhausted` = the stream ran out (maxDraws). Returns { column, done } — done is false while more results are
 * needed (the caller plans / validates more and calls again); when done, `column` equals buildColumn's for the same inputs.
 */
export function columnFromValidated(sectorSeed, column, { fb = null, results, exhausted = false, maxDraws = MAX_DRAWS, stats: extra = null }) {
  const want = SURVEY_CLASSES[column].id, cells = fb ? [fb] : [];
  const stats = { draws: 0, validations: 0, wasted: 0, failed: 0, parallel: true, ...(extra || {}) };
  for (const r of results) {
    if (cells.length >= ROWS) break;
    stats.draws = r.draw; stats.validations++;
    if (!r.cand) stats.failed++; else if (r.cand.classId === want) cells.push(r.cand); else stats.wasted++;
  }
  if (cells.length < ROWS && !exhausted) return { done: false };
  if (cells.length < ROWS) stats.draws = maxDraws;
  // (028B, owner rule) a column only ever holds worlds of ITS class: no wrong-class "nearest" fill; an unfilled row stays empty
  cells.sort((a, b) => (b.authored - a.authored) || (b.habitable - a.habitable));
  return { done: true, column: { sectorSeed: sectorSeed >>> 0, column, cells, stats } };
}

export function buildColumn(sectorSeed, column, deps, opts) { const it = columnCandidates(sectorSeed, column, deps, opts); for (;;) { const r = it.next(); if (r.done) return r.value; } }

/** Three column results → the sector: cells in row-major order (cells[row * 3 + col], col = class index). */
export function assembleSector(sectorSeed, columns) {
  const byCol = SURVEY_CLASSES.map((_, ci) => columns.find(c => c.column === ci));
  const cells = [];
  for (let r = 0; r < ROWS; r++) for (let ci = 0; ci < SURVEY_CLASSES.length; ci++) cells.push((byCol[ci] && byCol[ci].cells[r]) || null);
  return { sectorSeed: sectorSeed >>> 0, label: sectorLabel(sectorSeed), cells, columns: byCol.map(c => c && c.stats) };
}

/** A whole sector, synchronously (Node, tests, and the page's no-worker fallback). */
export function buildSector(sectorSeed, deps, opts) { return assembleSector(sectorSeed, SURVEY_CLASSES.map((_, ci) => buildColumn(sectorSeed, ci, deps, opts))); }

// ---------------------------------------------------------------- dossier
const TEMP_WORDS = [[-10, "Frigid"], [2, "Cold"], [16, "Mild"], [26, "Warm"], [Infinity, "Hot"]];
const LIMIT_PHRASES = {
  "Temperature:freezing": "Freezing ground", "Temperature:cold": "Cold ground", "Temperature:hot": "Hot ground", "Temperature:scorching": "Scorching ground",
  "Water:parched": "Parched ground", "Water:dry": "Dry ground", "Water:wet": "Waterlogged ground", "Water:flooded": "Flooded ground",
  "Soil:hostile": "Hostile soil (salt or pH)", "Soil:workable": "Difficult soil", "Hazard:lethal": "Lethal radiation or toxins",
  "Hazard:dangerous": "Dangerous radiation or toxins", "Hazard:stressful": "Radiation or toxin stress",
};
const signed = t => (t > 0 ? "+" : t < 0 ? "−" : "") + Math.abs(Math.round(t)) + " °C";
const listShares = (o, order, names) => order.filter(k => o[k] >= 0.005).map(k => `${names[k]} ${pct(o[k])}%`).join(" · ");

/**
 * The dossier for one candidate: what kind of environment it is and what looks hard about it, in a few human-readable rows.
 * Every value is read from the planet data or the engine's evaluate() (see `source` on each row); nothing is invented.
 */
export function surveyDossier(cand, deps) {
  const { BLOOM_DATA: D } = deps0(deps), p = cand.planet, w = cand.assessment || assessWorld(p, deps), C = D.config;
  const sky = p.globalClimate;
  // climate: the land's starting temperatures (sky + each region's offset), area-weighted
  const totalA = w.temps.reduce((a, [, n]) => a + n, 0), mean = w.temps.reduce((a, [t, n]) => a + t * n, 0) / totalA;
  const tMin = Math.min(...w.temps.map(([t]) => t)), tMax = Math.max(...w.temps.map(([t]) => t));
  const climateWord = TEMP_WORDS.find(([lim]) => mean < lim)[1];
  // water: open water on the surface, landmasses
  const ws = w.waterShare, waterWord = ws < 0.01 ? "None" : ws < 0.12 ? "Scarce" : ws < 0.35 ? "Lakes and seas" : "Mostly ocean";
  const waterValue = ws < 0.01 ? `No open water · ${w.landmasses === 1 ? "one landmass" : w.landmasses + " landmasses"}`
    : `${pct(ws)}% of the surface · ${w.landmasses === 1 ? "one landmass" : w.landmasses + " landmasses"}`;
  const dryLand = (w.words.Water.parched || 0) + (w.words.Water.dry || 0), wetLand = (w.words.Water.wet || 0) + (w.words.Water.flooded || 0);
  // soil: the engine's own soil words (salt / pH gate, nutrients)
  const soil = w.words.Soil, soilTop = Object.entries(soil).sort((a, b) => b[1] - a[1])[0][0];
  const soilWord = { rich: "Fertile", poor: "Poor", workable: "Difficult", hostile: "Hostile" }[soilTop];
  // atmosphere: the starting sky Terraform works on
  const humid = sky.moisture < 30 ? "dry air" : sky.moisture < 60 ? "moderate humidity" : "humid air";
  // solar exposure: light and surface radiation over the land (area-weighted); radiation above the starting plant's tolerance
  let light = 0, rad = 0, strong = 0;
  for (const r of w.regions) { light += r.light * r.area; rad += r.radiation * r.area; if (r.radiation > C.genomeBase.radTol) strong += r.area; }
  light /= totalA; rad /= totalA; strong /= totalA;
  const lightWord = light < 40 ? "Dim" : light < 70 ? "Moderate" : "Bright";
  // expected challenges: what limits the starting plant on the land it cannot yet live on (engine limiting factor)
  const challenges = Object.entries(w.limits).filter(([, s]) => s >= 0.03).sort((a, b) => b[1] - a[1]).slice(0, 3)
    .map(([k, s]) => ({ key: k, text: LIMIT_PHRASES[k] || k.replace(":", " · "), share: s }));
  if (w.landmasses > 1) challenges.push({ key: "crossing", text: `Water crossings between ${w.landmasses} landmasses`, share: null });

  return {
    name: p.name, worldType: cand.worldType, tagline: cand.tagline, cue: cand.cue, classId: cand.classId,
    habitable: { green: w.lamps.green || 0, yellow: w.lamps.yellow || 0, red: w.lamps.red || 0 },
    rows: [
      { id: "climate", label: "Climate", word: climateWord, value: `${signed(tMin)} to ${signed(tMax)} across the land`, source: "sky temperature + region offsets" },
      { id: "water", label: "Water", word: waterWord,
        value: waterValue + (dryLand >= 0.25 ? ` · ${pct(dryLand)}% of land too dry` : wetLand >= 0.25 ? ` · ${pct(wetLand)}% of land too wet` : ""), source: "tilemap water + engine Water words" },
      { id: "soil", label: "Soil", word: soilWord, value: listShares(soil, ["rich", "poor", "workable", "hostile"], { rich: "fertile", poor: "poor", workable: "difficult", hostile: "hostile" }), source: "engine Soil words (salt, pH, nutrients)" },
      { id: "atmosphere", label: "Atmosphere", word: `${TEMP_WORDS.find(([lim]) => sky.temperature < lim)[1]} sky, ${humid}`,
        value: `Starting sky ${signed(sky.temperature)} · humidity ${Math.round(sky.moisture)}`, source: "planet.globalClimate (the starting sky)" },
      { id: "solar", label: "Solar exposure", word: lightWord, value: strong >= 0.05 ? `Strong radiation on ${pct(strong)}% of land` : "Radiation mostly low", source: "region light + radiation vs starting tolerance" },
    ],
    challenges,
    stats: { meanTemp: mean, tMin, tMax, waterShare: ws, landmasses: w.landmasses, light, radiation: rad, strongRadiation: strong, sections: w.sections },
  };
}
