// BLOOM — Challenge seed banks: the RUNTIME CONSUMER (BLOOM-036B1). docs/CHALLENGES_SYSTEM_v1.md §4 (banks), §5 (instance).
// Pure ES module: no DOM, no module state written — Node (QA, the builder), the page and the survey worker all import it. The BLOOM classic
// scripts are passed as `deps = { BLOOM, BLOOM_DATA }` (default: globalThis).
//
// A Challenge does not search for and prove a planet on the player's machine. Its worlds were proven OFFLINE by the bank builder
// (tools/build-challenge-seed-bank.mjs: physical validation, species S2, the Challenge recipe, the scenario's full layer P with its
// confirmation runs, then a deterministic diversity selection) and shipped as a compact, generated bank (content/challenge-seed-banks.js):
// for every Challenge × species, entries of (archetype, World Seed, accepted attempt) + the planet's fingerprint + proof provenance.
// THE WORLD IS STILL PROCEDURAL: the bank stores seeds and proof provenance, never map geometry; the runtime regenerates the exact planet.
//
// GENERATOR → VALIDATOR → BANK BUILDER (offline) → BANK CONSUMER (this file, runtime):
//   bankCell(challenge, species, deps)            → the cell for that Challenge × species, CHECKED against the current game (STALE → throws)
//   cellProvenance(challenge, species, deps)      → what a cell must have been built against (the builder writes it; the runtime compares it)
//   pickEntry(cell, { challenge, species, launchSeed, avoid })   → { index, entry } — deterministic (no Math.random): the launch seed ×
//                                                    Challenge id / version × species; `avoid` = entry indices used earlier in this session
//   buildBankWorld(entry, deps)                   → the EXACT planet: BLOOM.archetype.attemptPlanet(archetype, seed, attempt) + the accepted
//                                                    world's identity record; its fingerprint MUST equal the entry's (else throws — never a
//                                                    silent search for another world)
//   bankWorld(entry, cell, species, startingState, deps)  → { physical, evaluation } for the dossier: the cheap engine evaluate() only
//                                                    (arrival share, conditions) — no S2 search, no scenario witness, no confirmation run
//   makeBankInstance(…)                           → the Challenge instance (format 2, source "seed-bank")
// Nothing here runs BLOOM.findWitness, BLOOM.species.validateFor or BLOOM.validateScenario (tools/challenge-world-check proves it).
import { assessWorld, classFor, surveyDossier, physicalKey, planetFingerprint, speciesFor, startKey } from "../destination-survey/survey-data.js";

// (036D1) format 2: every cell's provenance carries the completion contract's fingerprint (completionFingerprint). A format-1 bank (no
// completion provenance) is STALE and refused — never read as "ordinary Bloom" by default.
export const BANK_FORMAT = 2;                  // the bank file's structure
export const INSTANCE_FORMAT = 2;              // a bank-backed Challenge instance (036B's live-search instances were format 1: refused)
// (036D1) @2: the builder also PROVES the Challenge's completion contract from the layer-P witness evidence (BLOOM.challengeCompletion.prove;
// an ungated Challenge proves nothing more) — @1 entries never asserted it
export const VALIDATOR_ID = "challenge-bank-validation@2";   // what the builder proves for an entry (see the builder header) — part of provenance
export const AVOID_RECENT = 8;                 // in-session repeat avoidance: never reuse one of the last N entries of a cell while others remain

const deps0 = deps => ({ BLOOM: (deps && deps.BLOOM) || globalThis.BLOOM, BLOOM_DATA: (deps && deps.BLOOM_DATA) || globalThis.BLOOM_DATA });
const fnv = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193); return (h >>> 0).toString(16).padStart(8, "0"); };
const r4 = x => x == null ? null : +x.toFixed(4);
// stable JSON (sorted keys) for fingerprints of game data
const stable = v => Array.isArray(v) ? `[${v.map(stable).join(",")}]` : v && typeof v === "object" ? `{${Object.keys(v).sort().map(k => JSON.stringify(k) + ":" + stable(v[k])).join(",")}}` : JSON.stringify(v);

/** The game rules a proof depends on: the whole engine config (economy, growth, validation policy, reference plant …) and every trait's
 *  mechanics (id, board, effect, cost — not its words). Any change makes every bank STALE. */
export function rulesFingerprint(deps) {
  const { BLOOM_DATA: D } = deps0(deps);
  return fnv(stable({ config: D.config, traits: D.traits.map(t => ({ id: t.id, board: t.board, effect: t.effect, cost: t.cost })) }));
}
/** A scenario's mechanics (everything but its player-facing words). */
export const scenarioFingerprint = S => { const { display, intent, name, ...m } = S; return fnv(stable(m)); };
/** An archetype's generation data (everything but its player-facing words). */
export const archetypeFingerprint = A => { const { display, name, ...g } = A; return fnv(stable(g)); };

/** The provenance a cell must carry for (challenge, species) to be valid against the CURRENT game. */
export function cellProvenance(ch, species, deps) {
  const { BLOOM, BLOOM_DATA: D } = deps0(deps), sp = speciesFor(species, deps), S = BLOOM.challenges.scenarioOf(ch), R = ch.launch.world.recipe;
  const st = BLOOM.challenges.startingStateOf(ch);
  return { challengeId: ch.id, challengeVersion: ch.version, recipeVersion: R.version, recipeFingerprint: fnv(stable(R)), scenarioId: S.id, scenarioFingerprint: scenarioFingerprint(S),
    speciesId: sp.id, physiologyVersion: sp.physiologyVersion, physiologyKey: sp.physiologyKey, startingState: st ? startKey(st) : null,
    worldGenVersion: BLOOM.archetype.WORLD_GEN_VERSION, archetypes: Object.fromEntries(R.archetypes.map(a => [a, archetypeFingerprint(D.archetypes.find(x => x.id === a))])),
    rulesFingerprint: rulesFingerprint(deps), validator: VALIDATOR_ID,
    // (036D1) the resolved completion contract (win + conditions + their versions): any completion change makes the cell STALE
    completionFingerprint: BLOOM.challengeCompletion.fingerprint(ch) };
}
export const cellKey = (chId, spId) => `${chId}/${spId}`;

/** The errors that make a cell unusable for (challenge, species) NOW (a stale bank is never silently reused). */
export function checkCell(cell, ch, species, deps) {
  const e = [];
  if (!cell) return ["no bank cell"];
  const want = cellProvenance(ch, species, deps), got = cell.provenance || {}, B = ch.launch.world.bank;
  if (B && cell.bankVersion !== B.version) e.push(`bank version ${cell.bankVersion} ≠ the Challenge's ${B.version}`);
  for (const k of Object.keys(want)) if (stable(want[k]) !== stable(got[k])) e.push(`${k}: bank ${stable(got[k])} ≠ game ${stable(want[k])}`);
  if (!Array.isArray(cell.entries) || !cell.entries.length) e.push("no entries");
  else {
    const fps = cell.entries.map(x => x.fingerprint);
    if (new Set(fps).size !== fps.length) e.push("duplicate planet fingerprints");
    if (ch.launch.world.bank && cell.entries.length < ch.launch.world.bank.size) e.push(`${cell.entries.length} entries < the Challenge's bank size ${ch.launch.world.bank.size}`);
  }
  return e;
}

/** The checked bank cell for a Challenge × species; throws (err.code "STALE_BANK" / "NO_BANK") — never a fallback. QA fixtures may carry their
 *  own cells (deps.BLOOM_DATA.challengeSeedBankFixtures, cellKey → cell): fixture Challenges only. */
export function bankCell(ch, species, deps) {
  const { BLOOM_DATA: D } = deps0(deps), sp = speciesFor(species, deps), key = cellKey(ch.id, sp.id);
  const bank = D.challengeSeedBanks, fx = ch.status === "fixture" ? (D.challengeSeedBankFixtures || {})[key] : null;
  const cell = fx || (bank && bank.cells ? bank.cells[key] : null);
  if (!cell) throw Object.assign(new Error(`Challenge seed bank: no cell ${key}`), { code: "NO_BANK", cellKey: key });
  if (!fx && (!bank || bank.format !== BANK_FORMAT)) throw Object.assign(new Error(`Challenge seed bank: format ${bank && bank.format} ≠ ${BANK_FORMAT}`), { code: "STALE_BANK", cellKey: key });
  if (!fx && bank.provisional) throw Object.assign(new Error("Challenge seed bank: a PROVISIONAL (engineering-only, short) bank is never served — build the full bank"), { code: "STALE_BANK", cellKey: key });
  const bad = checkCell(cell, ch, sp, deps);
  if (bad.length) throw Object.assign(new Error(`Challenge seed bank ${key} is STALE — rebuild it (node tools/build-challenge-seed-bank.mjs): ${bad.join("; ")}`), { code: "STALE_BANK", cellKey: key, errors: bad });
  return cell;
}

/** The entry a launch takes: a deterministic index from (launch seed, Challenge id / version, species); `avoid` (indices used earlier in this
 *  session for this cell) steps it forward to the next unused entry while one remains — never Math.random, never worker timing. */
export function pickEntry(cell, { challenge, species, launchSeed, avoid = [] }) {
  if (!Number.isInteger(launchSeed) || launchSeed < 1) throw new TypeError("challenge-bank: a launch seed is a positive integer");
  const n = cell.entries.length, base = (parseInt(fnv(`${challenge.id}|v${challenge.version}|${species.id || species}|${launchSeed}`), 16) >>> 0) % n;
  const used = new Set(avoid.slice(-Math.min(AVOID_RECENT, n - 1)));
  let index = base; for (let k = 0; k < n && used.has(index); k++) index = (index + 1) % n;
  return { index, base, entry: cell.entries[index], avoided: index !== base };
}

/** The accepted world's identity record (planet.archetype) as the production generator wrote it (stripPlanet's form), from the entry. */
const identityOf = (A, e) => ({ id: A.id, name: A.name, publicSeed: e.seed, attempt: e.attempt, generationSeed: e.generationSeed, requestedWaterPct: e.requestedWaterPct,
  actualWaterPct: e.actualWaterPct, landmasses: e.landmasses, originLandmassShare: e.originLandmassShare, winnabilityChecked: true, validatedLayers: e.validatedLayers,
  rejectedAttemptCount: e.attempt });

/** The EXACT bank planet: the accepted attempt regenerated (milliseconds — no validation loop) and verified by fingerprint. */
export function buildBankWorld(entry, deps) {
  const { BLOOM, BLOOM_DATA: D } = deps0(deps), A = D.archetypes.find(a => a.id === entry.archetypeId);
  if (!A) throw Object.assign(new Error(`challenge-bank: unknown archetype ${entry.archetypeId}`), { code: "STALE_BANK" });
  const { planet, generationSeed } = BLOOM.archetype.attemptPlanet(A, entry.seed, entry.attempt);
  if (generationSeed !== entry.generationSeed) throw Object.assign(new Error(`challenge-bank: ${entry.archetypeId}:${entry.seed} attempt ${entry.attempt} has generation seed ${generationSeed}, the bank ${entry.generationSeed}`), { code: "FINGERPRINT_MISMATCH" });
  planet.archetype = identityOf(A, entry);
  const fingerprint = planetFingerprint(planet);
  if (fingerprint !== entry.fingerprint) throw Object.assign(new Error(`challenge-bank: ${entry.archetypeId}:${entry.seed} regenerated as ${fingerprint}, the bank proved ${entry.fingerprint}`), { code: "FINGERPRINT_MISMATCH" });
  return { planet, fingerprint, archetype: A };
}

/** The bank world as the dossier needs it — the physical candidate (the survey's own shape) and the species' arrival evaluation, computed with
 *  the engine's cheap evaluate() only; the proof results come from the bank (they were established offline). Verifies the arrival share too. */
export function bankWorld(entry, cell, species, startingState, deps) {
  const { BLOOM } = deps0(deps), sp = speciesFor(species, deps), { planet, fingerprint, archetype: A } = buildBankWorld(entry, deps);
  const w = assessWorld(planet, deps, sp, startingState || null), cls = classFor(w.habitable);
  if (r4(w.habitable) !== entry.habitable) throw Object.assign(new Error(`challenge-bank: arrival share ${r4(w.habitable)} ≠ the bank's ${entry.habitable} (${entry.archetypeId}:${entry.seed})`), { code: "FINGERPRINT_MISMATCH" });
  const phys = { key: `${A.id}:${entry.seed}`, physicalKey: physicalKey({ archetypeId: A.id, seed: entry.seed }, deps), worldGenVersion: BLOOM.archetype.WORLD_GEN_VERSION, authored: false,
    archetypeId: A.id, seed: entry.seed, attempt: entry.attempt, name: planet.name, worldType: A.name, descriptor: A.name, tagline: A.display.tagline, cue: A.display.cue,
    planet, render: A.render || null, fingerprint,
    validation: { path: "challenge seed bank: proven offline (" + cell.provenance.validator + "); the accepted attempt regenerated and fingerprint-verified", validated: true, layers: entry.validatedLayers, attempt: entry.attempt, publicSeed: entry.seed } };
  const ev = { species: BLOOM.species.provenance(sp), habitable: w.habitable, classId: cls.id, assessment: w,
    playability: { ok: !!entry.s2, path: "proven offline by the bank builder (BLOOM.species.validateFor S2)", s1: { reachableShare: entry.foothold }, s2: { ok: !!entry.s2, offline: true } } };
  ev.dossier = surveyDossier({ ...phys, ...ev }, deps, sp);
  return { physical: phys, evaluation: ev };
}

/** The Challenge instance (format 2, bank-backed): application state, never serialized. */
export function makeBankInstance({ challenge, species, launchSeed, cell, pick, world }, deps) {
  const { BLOOM } = deps0(deps), sp = speciesFor(species, deps), ch = BLOOM.challenges.resolve(challenge.id);
  if (ch !== challenge) throw new Error(`challenge-bank: ${challenge.id} is not the canonical Challenge object`);
  const pres = BLOOM.challenges.speciesOf(ch); if (pres && pres !== sp) throw new Error(`challenge-bank: ${ch.name} prescribes ${pres.name}, not ${sp.name}`);
  const P = world.physical, ev = world.evaluation, e = pick.entry, start = BLOOM.challenges.startingStateOf(ch), R = ch.launch.world.recipe;
  const sv = { scenarioId: ch.scenario, ok: e.proof.status === "PASS", status: e.proof.status, offline: true, strategiesProven: e.proof.strategies || 1,
    simulations: e.proof.simulations, confirmations: e.proof.confirmations, path: "BLOOM.validateScenario (layer P, the validator's full budget, every confirmation run) — proven offline by the bank builder" };
  const bank = { cellKey: cellKey(ch.id, sp.id), bankVersion: cell.bankVersion, entryIndex: pick.index, entries: cell.entries.length, builtFrom: cell.builtFrom || null, validator: cell.provenance.validator };
  const candidate = { key: P.key, physicalKey: P.physicalKey, worldGenVersion: P.worldGenVersion, name: P.name, authored: false, archetypeId: P.archetypeId, seed: P.seed, attempt: P.attempt,
    worldType: P.worldType, tagline: P.tagline, cue: P.cue, validation: P.validation, fingerprint: P.fingerprint,
    speciesId: sp.id, physiologyVersion: sp.physiologyVersion, physiologyKey: sp.physiologyKey, habitable: ev.habitable, classId: ev.classId, playability: ev.playability,
    scenarioId: ch.scenario, scenarioValidation: sv, bank };
  // (036D1) the completion contract the run plays (and the cell was proven under: checked by bankCell)
  const K = BLOOM.challengeCompletion.contract(ch);
  if (cell.provenance.completionFingerprint !== K.fingerprint) throw Object.assign(new Error(`challenge-bank: the cell was proven for completion ${cell.provenance.completionFingerprint}, ${ch.name} completes by ${K.fingerprint}`), { code: "STALE_BANK" });
  const completion = Object.freeze({ fingerprint: K.fingerprint, conditions: Object.freeze(K.conditions.map(c => c.type)) });
  return Object.freeze({ kind: "challenge-instance", format: INSTANCE_FORMAT, source: "seed-bank",
    challenge: ch, challengeId: ch.id, challengeVersion: ch.version, recipeVersion: R.version, recipeKey: ch.recipeKey, scenarioId: ch.scenario, completion,
    species: sp, speciesId: sp.id, speciesPolicy: ch.launch.species.policy,
    launchSeed, bank, entryIndex: pick.index,
    startingState: start, startingStatePolicy: ch.launch.startingState.policy,
    planet: P.planet, fingerprint: P.fingerprint, worldSeed: P.seed, archetypeId: P.archetypeId, candidate,
    dossier: ev.dossier, assessment: ev.assessment, render: P.render });
}

/** The provenance a run / report keeps of an instance (plain data). */
export const instanceProvenance = X => ({ challengeId: X.challengeId, challengeVersion: X.challengeVersion, recipeVersion: X.recipeVersion, recipeKey: X.recipeKey,
  scenarioId: X.scenarioId, speciesId: X.speciesId, speciesPolicy: X.speciesPolicy, launchSeed: X.launchSeed, bankVersion: X.bank.bankVersion, cellKey: X.bank.cellKey,
  entryIndex: X.entryIndex, planetSeed: X.worldSeed, archetypeId: X.archetypeId, fingerprint: X.fingerprint,
  completion: { fingerprint: X.completion.fingerprint, conditions: [...X.completion.conditions] },
  startingState: X.startingState ? { adaptations: [...X.startingState.adaptations], biomass: X.startingState.biomass, source: "challenge" } : null });
