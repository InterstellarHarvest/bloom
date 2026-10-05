// BLOOM — Destination Survey data (BLOOM-028A): which candidate worlds a sector shows, how each is classified, and the
// human-readable dossier for one world. Pure ES module: no DOM, no Three.js, no globals written, no module state, so Node can
// import it (tools/destination-survey-check.js). The BLOOM classic scripts are passed in as `deps = { BLOOM, BLOOM_DATA }`
// (default: globalThis), never re-implemented here.
//
// PRESENTATION ONLY. Nothing here changes generation, validation, simulation or gameplay:
//   · a candidate is an ordinary BLOOM world — BLOOM.generateFromArchetype(archetype, seed, { winnability: false }), i.e. the
//     production attempt loop with its structural layers 1–3 and the archetype's geography checks, minus the (slow) witness
//     search. Its identity is { archetypeId, seed }; the next milestone decides how Begin Expedition reaches the fully
//     validated world for that seed (see docs/evidence/bloom-028a/REPORT.md, "attempt match").
//   · STABLE / VOLATILE / EXTREME are menu classifications of how much land the STARTING plant can already live on, read from
//     the engine's own evaluate() (the region lamps a player sees at the start of a run). No mechanic reads them.
//   · the dossier words come from the same evaluate() plus plain planet data (tilemap, section conditions, starting sky).

export const SURVEY_CLASSES = [
  { id: "stable",   label: "Stable",   minHabitable: 0.45, blurb: "Most land habitable on arrival" },
  { id: "volatile", label: "Volatile", minHabitable: 0.22, blurb: "Refuges beside hostile ground" },
  { id: "extreme",  label: "Extreme",  minHabitable: 0,    blurb: "Little land habitable on arrival" },
];
export const ROWS = 3; // a sector is a 3 × 3 matrix: one column per class, ROWS candidates each

const mulberry32 = a => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const deps0 = deps => ({ BLOOM: (deps && deps.BLOOM) || globalThis.BLOOM, BLOOM_DATA: (deps && deps.BLOOM_DATA) || globalThis.BLOOM_DATA });
const pct = x => Math.round(x * 100);

/** The class a starting habitable-land share falls in (shares ≥ a class's minHabitable belong to the first such class). */
export const classFor = habitable => SURVEY_CLASSES.find(c => habitable >= c.minHabitable) || SURVEY_CLASSES[SURVEY_CLASSES.length - 1];

/** The sector seed that follows `sectorSeed` (SCAN NEW SECTOR walks this chain, so a sector is reproducible from its seed). */
export const nextSectorSeed = sectorSeed => 1 + Math.floor(mulberry32((sectorSeed >>> 0) ^ 0x9e3779b9)() * 999998);

/** A short sector designation for the header, e.g. "Sector 4F-271" (derived from the seed only). */
export const sectorLabel = sectorSeed => { const s = sectorSeed >>> 0; return `Sector ${(s % 9) + 1}${"ABCDEFGHJK"[(s >>> 4) % 10]}-${String(s % 1000).padStart(3, "0")}`; };

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

/**
 * One survey candidate: an archetype world for a public seed (structural layers only; see the header), or `null` when that
 * seed makes no structurally acceptable world. `{ authored: "first_bloom" }` makes the authored First Bloom candidate.
 */
export function makeCandidate(spec, deps) {
  const { BLOOM, BLOOM_DATA: D } = deps0(deps);
  let planet, archetype = null;
  if (spec.authored) { planet = D.planets[spec.authored]; if (!planet) return null; }
  else {
    archetype = D.archetypes.find(a => a.id === spec.archetypeId);
    if (!archetype) throw new Error(`survey: unknown archetype ${spec.archetypeId}`);
    try { planet = BLOOM.generateFromArchetype(archetype, spec.seed, { config: D.config, traits: D.traits, winnability: false }); }
    catch (e) { if (e.attempts) return null; throw e; }
  }
  const w = assessWorld(planet, deps), cls = classFor(w.habitable);
  const fb = spec.authored && D.play && D.play.firstBloom;
  const cand = {
    key: spec.authored ? "authored:" + spec.authored : `${archetype.id}:${spec.seed}`,
    authored: !!spec.authored, archetypeId: archetype ? archetype.id : null, seed: spec.authored ? null : spec.seed >>> 0,
    attempt: planet.archetype ? planet.archetype.attempt : null,
    name: planet.name, worldType: archetype ? archetype.name : "Authored world",
    descriptor: archetype ? archetype.name : (fb ? "Hand-made training world" : "Authored world"),
    tagline: archetype ? archetype.display.tagline : (fb ? fb.tagline : ""),
    cue: archetype ? archetype.display.cue : (fb ? fb.summary : ""),
    planet, render: (archetype && archetype.render) || null,
    habitable: w.habitable, classId: cls.id, assessment: w,
  };
  cand.dossier = surveyDossier(cand, deps);
  return cand;
}

/**
 * Build one sector: `ROWS` candidates per class column, drawn deterministically from `sectorSeed` (archetype chosen uniformly,
 * World Seed in BLOOM_DATA.play.search's range). A generator so a page can yield between worlds (each costs ~5–120 ms);
 * `buildSector` drives it synchronously. Returns { sectorSeed, label, cells } with cells in row-major order
 * (cells[row * 3 + col], col = class index), each column sorted most → least habitable.
 * `firstBloom: true` puts the authored First Bloom at the top of the column its own measurement falls in.
 */
export function* sectorCandidates(sectorSeed, deps, { firstBloom = false, maxDraws = 80 } = {}) {
  const { BLOOM_DATA: D } = deps0(deps);
  const rng = mulberry32((sectorSeed >>> 0) ^ 0x5eed0028), pol = (D.play && D.play.search) || { seedMin: 1, seedMax: 99999 };
  const cols = SURVEY_CLASSES.map(() => []), spare = [], seen = new Set();
  if (firstBloom) { const fb = makeCandidate({ authored: "first_bloom" }, deps); if (fb) { cols[SURVEY_CLASSES.findIndex(c => c.id === fb.classId)].push(fb); seen.add(fb.key); } yield fb; }
  let draws = 0;
  while (cols.some(c => c.length < ROWS) && draws < maxDraws) {
    draws++;
    const A = D.archetypes[Math.floor(rng() * D.archetypes.length)], seed = pol.seedMin + Math.floor(rng() * (pol.seedMax - pol.seedMin + 1));
    const key = `${A.id}:${seed}`; if (seen.has(key)) continue; seen.add(key);
    const c = makeCandidate({ archetypeId: A.id, seed }, deps);
    if (c) { const col = cols[SURVEY_CLASSES.findIndex(k => k.id === c.classId)]; (col.length < ROWS ? col : spare).push(c); }
    yield c;
  }
  // a column the draw budget could not fill takes the spare worlds nearest its band (rare; reported via `filledBy`)
  cols.forEach((col, ci) => { while (col.length < ROWS && spare.length) {
    const lo = SURVEY_CLASSES[ci].minHabitable; spare.sort((a, b) => Math.abs(a.habitable - lo) - Math.abs(b.habitable - lo)); const c = spare.shift(); c.filledBy = "nearest"; col.push(c); } });
  cols.forEach(col => col.sort((a, b) => (b.authored - a.authored) || (b.habitable - a.habitable)));
  const cells = [];
  for (let r = 0; r < ROWS; r++) for (let ci = 0; ci < SURVEY_CLASSES.length; ci++) cells.push(cols[ci][r] || null);
  return { sectorSeed: sectorSeed >>> 0, label: sectorLabel(sectorSeed), cells, draws };
}
export function buildSector(sectorSeed, deps, opts) { const it = sectorCandidates(sectorSeed, deps, opts); for (;;) { const r = it.next(); if (r.done) return r.value; } }

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
