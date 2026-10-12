// BLOOM — Challenge seed-bank BUILDER library (BLOOM-036B1, offline / development side). Used by tools/build-challenge-seed-bank.mjs (the CLI)
// and by tools/challenge-world-check.js (QA fixture banks, re-validation of sampled bank worlds). Never loaded by the game.
//
// WHAT AN ENTRY PROVES (VALIDATOR_ID "challenge-bank-validation@1"): for the exact (archetype, World Seed) world and the exact species —
//   1. physical validation   survey-data physicalCandidate: BLOOM.play.runSearch (default scenario, archetype layers 1–8) — the accepted attempt
//   2. species               survey-data evaluateSpecies: arrival share / class, S1 foothold (reported), S2 winnability (BLOOM.species.validateFor,
//                            REQUIRED; from the Challenge's prescribed starting state when it has one)
//   3. the Challenge recipe  archetype · arrival band · S1 foothold floor · native cover (whatever the recipe sets)
//   4. the scenario          BLOOM.validateScenario (layer P) with the species and starting state at the validator's FULL budget, every
//                            confirmation run included — no Challenge proof budget offline (that was a live-search early stop, now retired)
//   5. Challenge quality     (curation) the mechanic must have mattered in the proof: Native Competition's witness met contested fronts;
//                            Dying World's witness reached its margin with the decline ≥ 80 % done (the validator's own pacing guarantees it)
// The candidate POOL is species-free and Challenge-free: per archetype, World Seeds from a fixed stream (archetype-stratified, so every
// archetype is equally represented before any filter). Physical validation runs once per world; species evaluation once per world ×
// species; layer P once per world × species × Challenge (only where steps 2–3 passed).
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const CLASSIC = ["content/config.js", "content/traits.js", "content/species.js", "planets/first_bloom.js", "planets/training_grounds.js", "content/archetypes.js", "content/scenarios.js",
  "content/challenges.js", "content/play.js", "resources/bloom-sim.js", "resources/bloom-species.js", "resources/bloom-gen.js", "resources/bloom-validate.js", "resources/bloom-witness.js",
  "resources/bloom-archetype.js", "resources/bloom-scenario.js", "resources/bloom-play.js", "resources/bloom-challenges.js"];
export const POOL_STREAM = "bloom-036b1 challenge seed bank pool v1";
const require = createRequire(import.meta.url);
export function loadEngine() { for (const f of CLASSIC) require(path.join(ROOT, f)); return { BLOOM: globalThis.BLOOM, D: globalThis.BLOOM_DATA }; }
export const modules = async () => ({
  SD: await import(pathToFileURL(path.join(ROOT, "resources/destination-survey/survey-data.js")).href),
  CB: await import(pathToFileURL(path.join(ROOT, "resources/challenges/challenge-bank.js")).href),
  CW: await import(pathToFileURL(path.join(ROOT, "resources/challenges/challenge-world.js")).href) });

const mulberry32 = a => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const fnvn = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193); return h >>> 0; };
const r4 = x => x == null ? null : +(+x).toFixed(4);

/** The candidate pool: per archetype, `perArchetype` distinct World Seeds from the fixed stream (species- and Challenge-free). */
export function candidatePool(D, perArchetype) {
  const pol = D.play.search, out = [];
  for (const A of D.archetypes) { const rng = mulberry32(fnvn(`${POOL_STREAM}|${A.id}`)), seen = new Set();
    while (seen.size < perArchetype) { const s = pol.seedMin + Math.floor(rng() * (pol.seedMax - pol.seedMin + 1)); if (!seen.has(s)) { seen.add(s); out.push({ archetypeId: A.id, seed: s, poolIndex: seen.size - 1 }); } } }
  return out;
}

/**
 * Evaluate one pool world for every released Challenge (and `extraChallenges`, e.g. QA fixtures) × every species they allow: steps 1–5 of the
 * header. Plain data out (the planet itself is not kept: its seed + attempt + fingerprint regenerate it).
 */
// (036D tooling correction) `reasonChars`: how much of a layer-P failure reason the record keeps — the release builder keeps its 140 characters
// (candidate-cache bytes unchanged); RESEARCH callers pass Infinity so the full reason (and its failing pacing bound) survives.
export function evaluateWorld(task, { BLOOM, D, SD }, { challenges = null, species = null, reasonChars = 140 } = {}) {
  const t0 = Date.now(), CH = challenges || BLOOM.challenges.list(), SP = species || BLOOM.species.ids();
  const phys = SD.physicalCandidate({ archetypeId: task.archetypeId, seed: task.seed });
  const row = { archetypeId: task.archetypeId, seed: task.seed, poolIndex: task.poolIndex ?? null, physical: null, cells: {} };
  if (!phys) { row.physicalMs = Date.now() - t0; return row; }
  const P = phys.planet, a = P.archetype, w0 = Date.now();
  row.physical = { fingerprint: phys.fingerprint, attempt: a.attempt, generationSeed: a.generationSeed, requestedWaterPct: a.requestedWaterPct, actualWaterPct: a.actualWaterPct,
    landmasses: a.landmasses, originLandmassShare: a.originLandmassShare, validatedLayers: a.validatedLayers, name: P.name, sections: P.sections.length, winAt: P.winThreshold ?? D.config.win,
    sky: { temperature: r4(P.globalClimate.temperature), moisture: r4(P.globalClimate.moisture) } };
  row.physicalMs = w0 - t0;
  for (const ch of CH) {
    const R = ch.launch.world.recipe, S = BLOOM.challenges.scenarioOf(ch), st = BLOOM.challenges.startingStateOf(ch), pres = BLOOM.challenges.speciesOf(ch);
    for (const id of pres ? [pres.id] : SP) {
      const sp = BLOOM.species.resolve(id), key = `${ch.id}/${id}`, c = row.cells[key] = { stage: null };
      if (!R.archetypes.includes(task.archetypeId)) { c.stage = "recipe"; continue; }
      const t1 = Date.now(), ev = SD.evaluateSpecies(phys, sp, undefined, null, st || null), st1 = ev.dossier.stats, lim = ev.assessment.limits || {};
      const share = pre => r4(Object.entries(lim).filter(([k]) => k.startsWith(pre)).reduce((x, [, v]) => x + v, 0));
      Object.assign(c, { speciesMs: Date.now() - t1, habitable: r4(ev.habitable), classId: ev.classId, s2: !!ev.playability.ok, foothold: r4(ev.playability.s1.reachableShare),
        growable: r4(ev.playability.s1.growableShare), features: { meanTemp: r4(st1.meanTemp), waterShare: r4(st1.waterShare), landmasses: st1.landmasses, strongRadiation: r4(st1.strongRadiation),
          dry: share("Water:parched") + share("Water:dry"), wet: share("Water:wet") + share("Water:flooded"), cold: share("Temperature:cold") + share("Temperature:freezing"),
          hot: share("Temperature:hot") + share("Temperature:scorching"), soil: share("Soil:"), hazard: share("Hazard:") } });
      const A = R.arrival;
      if (A && ((A.minHabitable != null && c.habitable < A.minHabitable) || (A.maxHabitable != null && c.habitable > A.maxHabitable))) { c.stage = "recipe"; continue; }
      if (R.foothold && !(c.foothold >= R.foothold.minShare)) { c.stage = "foothold"; continue; }
      if (!c.s2) { c.stage = "species"; continue; }
      if (S.competition) { const t2 = Date.now(); c.nativeStart = r4(BLOOM.createSim(P, D.config, D.traits, { rng: () => 0.5, scenario: S, species: sp }).competition.startShare); c.coverMs = Date.now() - t2;
        if (R.nativeCover && c.nativeStart < R.nativeCover.minStartShare) { c.stage = "cover"; continue; } }
      const t3 = Date.now(), v = BLOOM.validateScenario(P, D.config, D.traits, S, { archetypeId: task.archetypeId, species: sp, ...(st ? { startingState: st } : {}) });
      const W = (v.strategies || [])[0] || null;
      c.proof = { status: v.status, ok: !!v.ok, ms: Date.now() - t3, simulations: v.search ? v.search.simulations : null, confirmations: v.search ? v.search.confirmations || 0 : null,
        strategies: (v.strategies || []).length, reason: v.ok ? null : (v.reason || "").replace(/^layer P \([^)]*\): /, "").slice(0, reasonChars),
        ...(W ? { marginSeconds: W.marginSeconds, purchases: W.purchases.length, terraformSteps: W.purchases.filter(p => (D.traits.find(t => t.id === p.id) || {}).board === "Terraform").length,
          holdCoverage: W.hold ? W.hold.coverage : null, pressureAtMargin: W.pressureAtMargin ?? null,
          contested: W.competition ? W.competition.contestedRegions : null, nativePeak: W.competition ? r4(W.competition.peakShare) : null,
          shocks: W.climate ? W.climate.shocks.length : null, confirmOk: W.confirm ? W.confirm.every(x => x.ok) : null } : {}) };
      if (!v.ok) { c.stage = "scenario"; continue; }
      // 5. Challenge quality: the mechanic mattered in the proof
      if (S.competition && !(c.proof.contested >= 1)) { c.stage = "quality"; c.quality = "no contested front in the witness"; continue; }
      if (S.pressure && !(c.proof.pressureAtMargin >= 0.8)) { c.stage = "quality"; c.quality = "margin before 80 % of the decline"; continue; }
      c.stage = "ok";
    }
  }
  row.ms = Date.now() - t0;
  return row;
}

/** The diversity feature vector of a passing candidate (for one cell). */
const FEATURES = ["habitable", "foothold", "waterShare", "landmasses", "meanTemp", "moisture", "strongRadiation", "dry", "wet", "cold", "hot", "soil", "hazard", "nativeStart", "marginSeconds", "terraformSteps"];
const featureOf = (row, c) => ({ habitable: c.habitable, foothold: c.foothold, waterShare: c.features.waterShare, landmasses: c.features.landmasses, meanTemp: c.features.meanTemp,
  moisture: row.physical.sky.moisture, strongRadiation: c.features.strongRadiation, dry: c.features.dry, wet: c.features.wet, cold: c.features.cold, hot: c.features.hot,
  soil: c.features.soil, hazard: c.features.hazard, nativeStart: c.nativeStart ?? 0, marginSeconds: c.proof.marginSeconds ?? 0, terraformSteps: c.proof.terraformSteps ?? 0 });

/**
 * The deterministic CURATION of one cell: from every passing candidate (unique fingerprints) keep `target` entries —
 *   · barely-passing proofs are deprioritized: the lowest decile of witness hold margin (hold coverage − win threshold) is used only if needed;
 *   · archetypes are balanced: each archetype gets an equal quota (spare quota goes to the archetypes that have more candidates);
 *   · inside an archetype, farthest-point selection on the normalized features (arrival share, foothold, water, landmasses, temperature,
 *     moisture, radiation, dry / wet / cold / hot / soil / hazard limits, native cover, margin time, Terraform steps): start from the candidate
 *     nearest the archetype's centroid, then repeatedly add the candidate farthest from everything kept (ties: pool order). Never "easiest".
 */
export function curateCell(rows, key, target) {
  const pass = [], seen = new Set();
  for (const row of rows) { const c = row.cells[key]; if (!c || c.stage !== "ok" || seen.has(row.physical.fingerprint)) continue; seen.add(row.physical.fingerprint); pass.push({ row, c, f: featureOf(row, c) }); }
  pass.sort((a, b) => a.row.archetypeId.localeCompare(b.row.archetypeId) || a.row.poolIndex - b.row.poolIndex);
  // hold margin: deprioritize the lowest decile (kept only if the cell would otherwise fall short)
  const marginOf = p => (p.c.proof.holdCoverage ?? 1) - p.row.physical.winAt;
  const margins = pass.map(marginOf).sort((a, b) => a - b), cut = margins.length >= 10 ? margins[Math.floor(margins.length / 10)] : -Infinity;
  const good = pass.filter(p => marginOf(p) >= cut), weak = pass.filter(p => !good.includes(p));
  const lo = {}, hi = {}; for (const k of FEATURES) { const xs = pass.map(p => p.f[k]); lo[k] = Math.min(...xs); hi[k] = Math.max(...xs); }
  const norm = f => FEATURES.map(k => hi[k] > lo[k] ? (f[k] - lo[k]) / (hi[k] - lo[k]) : 0), dist = (a, b) => Math.sqrt(a.reduce((s, x, i) => s + (x - b[i]) ** 2, 0));
  const byArch = {}; for (const p of good) (byArch[p.row.archetypeId] = byArch[p.row.archetypeId] || []).push({ ...p, v: norm(p.f) });
  const archs = Object.keys(byArch).sort(); const quota = {}; let left = target;
  // equal quotas, then redistribute what an archetype cannot fill
  let open = archs.slice();
  while (left > 0 && open.length) { const each = Math.max(1, Math.floor(left / open.length)); let gave = 0;
    for (const a of open) { const room = byArch[a].length - (quota[a] || 0), g = Math.min(each, room, left - gave); if (g > 0) { quota[a] = (quota[a] || 0) + g; gave += g; } }
    left -= gave; open = open.filter(a => byArch[a].length > (quota[a] || 0)); if (!gave) break; }
  const kept = [];
  for (const a of archs) { const P = byArch[a], q = quota[a] || 0; if (!q) continue;
    const cen = P[0].v.map((_, i) => P.reduce((s, p) => s + p.v[i], 0) / P.length);
    const pick = [P.reduce((b, p) => dist(p.v, cen) < dist(b.v, cen) ? p : b, P[0])];
    while (pick.length < q) { let best = null, bd = -1;
      for (const p of P) { if (pick.includes(p)) continue; const d = Math.min(...pick.map(k => dist(k.v, p.v))); if (d > bd + 1e-12) { bd = d; best = p; } }
      pick.push(best); }
    kept.push(...pick); }
  for (const p of weak) { if (kept.length >= target) break; kept.push({ ...p, v: norm(p.f), weak: true }); }
  kept.sort((a, b) => a.row.archetypeId.localeCompare(b.row.archetypeId) || a.row.poolIndex - b.row.poolIndex);
  return { kept, passing: pass.length, deprioritized: weak.length, quota, minPairDistance: minPair(kept.map(k => k.v || norm(k.f)), dist) };
}
const minPair = (vs, dist) => { let m = Infinity; for (let i = 0; i < vs.length; i++) for (let j = i + 1; j < vs.length; j++) m = Math.min(m, dist(vs[i], vs[j])); return Number.isFinite(m) ? r4(m) : null; };

/** A bank entry: what the runtime needs to regenerate and verify the exact world, and the proof provenance (compact — no traces). */
export const entryOf = (row, c) => ({ archetypeId: row.archetypeId, seed: row.seed, attempt: row.physical.attempt, generationSeed: row.physical.generationSeed,
  requestedWaterPct: row.physical.requestedWaterPct, actualWaterPct: row.physical.actualWaterPct, landmasses: row.physical.landmasses, originLandmassShare: row.physical.originLandmassShare,
  validatedLayers: row.physical.validatedLayers, fingerprint: row.physical.fingerprint, habitable: c.habitable, classId: c.classId, foothold: c.foothold, s2: true,
  ...(c.nativeStart != null ? { nativeStart: c.nativeStart } : {}),
  proof: { status: c.proof.status, simulations: c.proof.simulations, confirmations: c.proof.confirmations, strategies: c.proof.strategies, marginSeconds: c.proof.marginSeconds,
    holdCoverage: c.proof.holdCoverage, ...(c.proof.contested != null ? { contested: c.proof.contested } : {}), ...(c.proof.pressureAtMargin != null ? { pressureAtMargin: c.proof.pressureAtMargin } : {}),
    ...(c.proof.shocks != null ? { shocks: c.proof.shocks } : {}) },
  bucket: `${row.archetypeId}:${c.classId}:${c.features.landmasses > 1 ? "islands" : "one-land"}` });

/** One bank cell from curated candidates. */
export function cellOf(ch, sp, curated, evaluatedCount, bankVersion, CB) {
  return { bankVersion, provenance: CB.cellProvenance(ch, sp), candidates: { evaluated: evaluatedCount, passing: curated.passing, retained: curated.kept.length, deprioritized: curated.deprioritized },
    entries: curated.kept.map(k => entryOf(k.row, k.c)) };
}

export const writeJson = (f, o) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(o, null, 1) + "\n"); };
