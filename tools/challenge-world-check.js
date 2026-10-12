// BLOOM — Challenge worlds from PREVALIDATED SEED BANKS (BLOOM-036B / 036B1). docs/CHALLENGES_SYSTEM_v1.md §3–§6.
//
//   NODE_PATH="$(npm root -g)" node tools/challenge-world-check.js [--browsers chromium,firefox] [--evidence] [--node-only]
//
// NODE (content/challenge-seed-banks.js, resources/challenges/challenge-bank.js, the builder, the engine's starting state, challengeRun):
//   B1 every released Challenge × species has its bank cell: exactly the Challenge's bank size (50), unique planet fingerprints, built against
//      the CURRENT game (Challenge / recipe / bank versions, scenario mechanics, physiology, world generation, rules, validator); not provisional
//   B2 every one of the entries regenerates EXACTLY at runtime (the accepted attempt → the bank's fingerprint and arrival share), and its
//      identity record equals the production generation path's (a sample per cell)
//   B3 sampled bank worlds still pass the FULL offline validation (one per cell: physical, S2, recipe, the scenario's full layer P + confirmations)
//   B4 the builder is deterministic: the shipped bank is byte-identical to a rebuild from the cached candidates (--check); a re-evaluated pool
//      world gives the same record
//   B5 stale / mismatched banks are refused: every provenance field, another bank version, a provisional bank, a changed engine rule, a missing cell, a tampered entry (fingerprint)
//   B6 entry choice is deterministic (launch seed × Challenge × species; never Math.random, never worker timing), spreads over the cell, and
//      avoids this session's recent entries
//   B7 the runtime performs NO expensive proof (no findWitness / findStrategies / validateScenario / species.validateFor — counted live, and
//      absent from the runtime modules and the worker's bank task)
//   B8 QA fixtures (never on the hub): a prescribed-species and a prescribed-starting-state Challenge with their own (fixture) bank cells;
//      the engine's starting state (exact owned adaptations + Biomass, refusals)
//   B9 the run (BLOOM.gameSession.challengeRun): the exact bank instance, its provenance (bank / cell / entry / launch seed / planet seed +
//      fingerprint / versions); a 036B live-search instance (format 1), another bank version, a tampered or foreign instance are refused;
//      expeditionRun refuses a Challenge; the Destination Survey never touches a bank
// AUTHORED (036C1) — several Challenges share one scenario and are never collapsed by it:
//   A1 Low Tide → Dying World, Oasis Line → Native Competition (Windfall → Volatile Climate if released): own id / name / provenance / recipe / cells
//   A2 Low Tide: Flood + Salt given at landing (owned, unpaid, normal Biomass), Drought Adaptation closed (closedByStart), proofs made from that start
//   A3 Oasis Line: 50 Desert worlds, no 20 % arrival floor, every proof met contested fronts · A4 Windfall (only if released): the exact Biomass
//   A5–A9 (browser) each authored Challenge: the hub card, prescribed plant → no Choose Plant Species, the dossier (plant, what is given, what the
//      start closes, the low-arrival line only < 5 %), the run (id / scenario / cell / entry, nothing given charged), Low Tide's Adapt room (Drought
//      locked), the report (the Challenge named, given tiers marked), RETRY (the exact entry) · A10 a < 5 %-arrival released dossier explains itself
// BROWSER (Chromium AND Firefox; "/" = the repository, "/bloom/" = the Pages site, file:// offline):
//   F · each Challenge: hub → BEGIN CHALLENGE → Choose Plant Species (the selected plant's ONE world built early) → PREPARING ("Selecting a
//       proven world · Building the planet · Verifying the planet", or skipped when already built) → the dossier (one globe; no Foothold line)
//       → BEGIN CHALLENGE → the run plays EXACTLY the bank instance → the report (provenance; KEEP PLAYING · RETRY · CHALLENGES · MAIN MENU);
//       no validator ran on the page
//   E · the specimen environment reads the real region sky · I · cancel, Back (same entry), Change Species, RETRY (same entry, fresh sim),
//       CHALLENGES → a new launch (a different entry: session repeat avoidance), MAIN MENU, EXPEDITION (3 × 3 survey, EXPECTED HAZARDS, no
//       residue), TRAINING · X · fixtures · K · keyboard · D · one document, no storage · P · file:// offline · B · /bloom/
// --evidence writes docs/evidence/bloom-036c1/ stills. Exits 1 on any failure.
"use strict";
const path = require("path"), fs = require("fs"), http = require("http"), os = require("os"), { execFileSync } = require("child_process");
const ROOT = path.resolve(__dirname, "..");
for (const f of ["content/config.js", "content/traits.js", "content/species.js", "planets/first_bloom.js", "planets/training_grounds.js", "content/archetypes.js", "content/scenarios.js", "content/challenges.js",
  "content/challenge-seed-banks.js", "content/play.js", "content/training.js", "resources/bloom-sim.js", "resources/bloom-species.js", "resources/bloom-gen.js", "resources/bloom-validate.js", "resources/bloom-witness.js",
  "resources/bloom-archetype.js", "resources/bloom-scenario.js", "resources/bloom-play.js", "resources/bloom-challenges.js", "resources/run/game-session.js"]) require(path.join(ROOT, f));
const argv = process.argv, argOf = k => { const i = argv.indexOf(k); return i > 0 ? argv[i + 1] : null; };
const BROWSERS = (argOf("--browsers") || "chromium,firefox").split(","), EVIDENCE = argv.includes("--evidence"), NODE_ONLY = argv.includes("--node-only");
const EVD = path.join(ROOT, "docs/evidence/bloom-036c1");   // (036C1) current evidence; the 036B stills stay as they were accepted
let fails = 0, passes = 0; const t0 = Date.now();
const check = (ok, name, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); if (ok) passes++; else fails++; return ok; };
const J = JSON.stringify;
const IDS = ["dying_world", "native_competition", "volatile_climate"], NAMES = { dying_world: "Dying World", native_competition: "Native Competition", volatile_climate: "Volatile Climate" };
const SPECIES = ["organic_hybrid", "cinder_rosette", "woolly_candle", "reed_spire"];
const FLOW = { dying_world: ["woolly_candle", 2], native_competition: ["woolly_candle", 2], volatile_climate: ["cinder_rosette", 2] };
// (036C1) the AUTHORED Challenges (prescribed plant; Windfall — player choice + a starting reserve — only if released): their own ids / cells / provenance
const AUTHORED = { low_tide: { name: "Low Tide", scenario: "dying_world", species: "organic_hybrid", archetypes: ["ocean_archipelago"], start: "flood+salt:-", launch: 3 },
  oasis_line: { name: "Oasis Line", scenario: "native_competition", species: "reed_spire", archetypes: ["desert_world"], start: null, launch: 3 },
  windfall: { name: "Windfall", scenario: "volatile_climate", species: null, archetypes: ["ocean_archipelago", "desert_world", "frozen_world"], start: "biomass", launch: 3 } };
const { BLOOM, BLOOM_DATA: D } = globalThis;
const stable = v => Array.isArray(v) ? `[${v.map(stable).join(",")}]` : v && typeof v === "object" ? `{${Object.keys(v).sort().map(k => JSON.stringify(k) + ":" + stable(v[k])).join(",")}}` : JSON.stringify(v);
// QA fixtures (never in content/challenges.js, never on the hub; their bank cells are built here, by the builder library)
const base = D.challenges[0];
const FX_PRESCRIBED = { ...base, id: "qa_prescribed_reed", status: "fixture", name: "QA Prescribed Plant",
  launch: { ...base.launch, species: { policy: "prescribed", species: "reed_spire" }, world: { ...base.launch.world, bank: { version: 1, size: 2 } } } };
const FX_START = { ...base, id: "qa_starting_state", status: "fixture", name: "QA Starting State",
  launch: { ...base.launch, species: { policy: "prescribed", species: "woolly_candle" }, world: { ...base.launch.world, bank: { version: 1, size: 2 } },
    startingState: { policy: "prescribed", adaptations: ["cold", "salt"], biomass: 250 } } };
let FIXTURE_CELLS = null;   // cellKey → cell (built in Node, injected into the page for X)
// (036C1) a launch seed whose Dying World × Cinder Rosette entry has < 5 % arrival (found in Node from the shipped bank), and the hub's ids
const LOW_ARRIVAL_PICK = { ids: [] }, VERSION = {};

(async () => {
  const CB = await import("file://" + path.join(ROOT, "resources/challenges/challenge-bank.js"));
  const S = await import("file://" + path.join(ROOT, "resources/destination-survey/survey-data.js"));
  const BL = await import("file://" + path.join(ROOT, "tools/challenge-bank-builder.mjs"));
  const C = BLOOM.challenges, bank = D.challengeSeedBanks;
  // (036C1) every released Challenge's OWN cells: one per species it allows (a prescribed plant = one cell); never collapsed by scenario
  const spOf = ch => C.speciesOf(ch) ? [C.speciesOf(ch).id] : SPECIES, CELLS = C.list().flatMap(ch => spOf(ch).map(sp => [ch, sp])), NCELLS = CELLS.length;
  console.log("# B · the seed banks (Node)");
  // B1
  { const rows = [];
    for (const [ch, sp] of CELLS) { let err = null, cell = null; try { cell = CB.bankCell(ch, sp); } catch (e) { err = e.code || e.message; }
      const fps = cell ? cell.entries.map(e => e.fingerprint) : [];
      rows.push({ key: `${ch.id}/${sp}`, err, n: fps.length, unique: new Set(fps).size === fps.length, size: ch.launch.world.bank.size, archetypes: cell ? new Set(cell.entries.map(e => e.archetypeId)).size : 0,
        want: ch.launch.world.recipe.archetypes.length, passing: cell ? cell.candidates.passing : 0 }); }
    check(bank && bank.format === CB.BANK_FORMAT && bank.provisional === false && rows.length === NCELLS && Object.keys(bank.cells).length === NCELLS && rows.every(r => !r.err && r.n === 50 && r.size === 50 && r.unique && r.archetypes === r.want && r.passing >= 50),
      "B1 · every released Challenge × the species it allows has its OWN bank cell (036C1: a prescribed plant = one cell; the cell set is exactly the catalogue's): exactly 50 entries (the Challenge's bank size), unique planet fingerprints, every archetype represented, built against the CURRENT game (bankCell's provenance check passes); the bank is final, not provisional",
      rows.map(r => `${r.key} ${r.err || r.n + "/" + r.size} (passing ${r.passing})`).join(" · ")); }
  // B2
  { let all = 0; const bad = [], ms = [], sample = [];
    for (const [ch, sp] of CELLS) { const cell = CB.bankCell(ch, sp);
      cell.entries.forEach((e, i) => { const t = Date.now(); try { const w = CB.bankWorld(e, cell, sp, null); all++; ms.push(Date.now() - t); if (i === 0) sample.push([e, w]); } catch (err) { bad.push(`${ch.id}/${sp}#${i}: ${err.code}`); } }); }
    const idDiff = sample.filter(([e, w]) => { const P = S.physicalCandidate({ archetypeId: e.archetypeId, seed: e.seed }); return !P || P.fingerprint !== e.fingerprint || stable(P.planet.archetype) !== stable(w.physical.planet.archetype); });
    const sorted = ms.sort((a, b) => a - b), attempts = new Set(D.challengeSeedBanks ? Object.values(D.challengeSeedBanks.cells).flatMap(c => c.entries.map(e => e.attempt)) : []);
    check(all === NCELLS * 50 && !bad.length && !idDiff.length,
      "B2 · every bank entry regenerates EXACTLY at runtime: the accepted attempt (BLOOM.archetype.attemptPlanet) gives the bank's planet fingerprint and arrival share (every entry of every cell, accepted attempts of every index the bank holds), and its identity record equals the production generation path's (BLOOM.play.runSearch — one per cell)",
      `${all} regenerated · median ${sorted[Math.floor(sorted.length / 2)]} ms, max ${sorted.at(-1)} ms · attempts ${J([...attempts].sort())} · identity differs ${idDiff.length}${bad.length ? " · " + bad.slice(0, 3) : ""}`); }
  // B3
  { const out = [], t = Date.now();
    for (const [ch, sp] of CELLS) { const cell = CB.bankCell(ch, sp), e = cell.entries[(ch.id.length * 7 + sp.length) % cell.entries.length];
      const row = BL.evaluateWorld({ archetypeId: e.archetypeId, seed: e.seed }, { BLOOM, D, SD: S }, { challenges: [ch], species: [sp] }), c = row.cells[`${ch.id}/${sp}`];
      out.push({ key: `${ch.id}/${sp}`, scn: ch.scenario, stage: c.stage, status: c.proof && c.proof.status, fp: row.physical.fingerprint === e.fingerprint, confirmations: c.proof && c.proof.confirmations }); }
    check(out.every(o => o.stage === "ok" && o.status === "PASS" && o.fp) && out.filter(o => o.scn === "native_competition" || o.scn === "volatile_climate").every(o => o.confirmations >= 2),
      "B3 · sampled bank worlds (one per cell) still pass the FULL offline validation — physical, S2, the recipe, the scenario's layer P at the validator's full budget WITH its confirmation runs (Native Competition, Volatile Climate), the quality rule",
      `${out.map(o => `${o.key} ${o.status}${o.confirmations ? "+" + o.confirmations + "c" : ""}`).join(" · ")} (${Math.round((Date.now() - t) / 1000)} s)`); }
  // B4
  { let checkOk = false, msg = ""; try { msg = execFileSync(process.execPath, [path.join(ROOT, "tools/build-challenge-seed-bank.mjs"), "--check"], { cwd: ROOT, encoding: "utf8" }); checkOk = true; } catch (e) { msg = String(e.stdout || e.message); }
    const cand = JSON.parse(fs.readFileSync(path.join(ROOT, "docs/evidence/bloom-036b/seed-bank/candidates.json"), "utf8")), rec = cand.rows.find(r => r.physical && r.archetypeId === "frozen_world");
    const again = BL.evaluateWorld({ archetypeId: rec.archetypeId, seed: rec.seed, poolIndex: rec.poolIndex }, { BLOOM, D, SD: S });
    const strip = o => JSON.parse(JSON.stringify(o, (k, v) => /ms$|Ms$/.test(k) ? undefined : v));
    check(checkOk && stable(strip(again)) === stable(strip(rec)) && cand.inputsFingerprint === bank.inputsFingerprint,
      "B4 · the builder is deterministic: the shipped content/challenge-seed-banks.js is byte-identical to a rebuild from the cached candidate records (build-challenge-seed-bank --check), and re-evaluating a pool world reproduces its cached record exactly (timings aside)",
      `${msg.trim().split("\n").at(-1)} · re-evaluated ${rec.archetypeId}:${rec.seed}`); }
  // B5
  { const ch = C.resolve("native_competition"), sp = "cinder_rosette", cell = CB.bankCell(ch, sp), out = {};
    for (const k of Object.keys(cell.provenance)) { const t = JSON.parse(JSON.stringify(cell)); t.provenance[k] = typeof t.provenance[k] === "number" ? t.provenance[k] + 1 : t.provenance[k] && typeof t.provenance[k] === "object" ? { x: 1 } : "tampered"; out[k] = CB.checkCell(t, ch, sp).length > 0; }
    const D2 = JSON.parse(JSON.stringify(D)); D2.config.econ.startBiomass += 1; D2.challengeSeedBanks = bank;
    let rule = null; try { CB.bankCell(ch, sp, { BLOOM, BLOOM_DATA: D2 }); } catch (e) { rule = e.code; }
    let none = null; try { CB.bankCell({ ...ch, id: "no_such" }, sp); } catch (e) { none = e.code; }
    const bv = CB.checkCell({ ...cell, bankVersion: cell.bankVersion + 1 }, ch, sp).length > 0;
    const D3 = { ...D, challengeSeedBanks: { ...bank, provisional: true } }; let prov = null; try { CB.bankCell(ch, sp, { BLOOM, BLOOM_DATA: D3 }); } catch (e) { prov = e.code; }
    let fp = null; try { CB.buildBankWorld({ ...cell.entries[0], seed: cell.entries[0].seed + 1 }); } catch (e) { fp = e.code; }
    let fp2 = null; try { CB.buildBankWorld({ ...cell.entries[0], fingerprint: "0000000000000000" }); } catch (e) { fp2 = e.code; }
    check(Object.values(out).every(Boolean) && bv && prov === "STALE_BANK" && rule === "STALE_BANK" && none === "NO_BANK" && fp === "FINGERPRINT_MISMATCH" && fp2 === "FINGERPRINT_MISMATCH",
      "B5 · a stale or mismatched bank is REFUSED, never silently reused or replaced by a search: any provenance field changed (Challenge / recipe version, scenario mechanics, physiology, world generation, archetypes, engine rules, validator), a cell of another bank version, a provisional (engineering-only) bank, an engine rule changed in the running game, a missing cell, a regenerated world whose fingerprint differs",
      `${Object.entries(out).map(([k, v]) => k + (v ? "✓" : "✗")).join(" ")} · bank version ${bv ? "✓" : "✗"} · provisional → ${prov} · rule change → ${rule} · missing → ${none} · tampered → ${fp}/${fp2}`); }
  // B6
  { const ch = C.resolve("dying_world"), sp = BLOOM.species.resolve("reed_spire"), cell = CB.bankCell(ch, sp);
    const a = CB.pickEntry(cell, { challenge: ch, species: sp, launchSeed: 777 }), b = CB.pickEntry(cell, { challenge: ch, species: sp, launchSeed: 777 });
    const spread = new Set(Array.from({ length: 200 }, (_, i) => CB.pickEntry(cell, { challenge: ch, species: sp, launchSeed: i + 1 }).index)).size;
    const av = CB.pickEntry(cell, { challenge: ch, species: sp, launchSeed: 777, avoid: [a.index] }), av8 = CB.pickEntry(cell, { challenge: ch, species: sp, launchSeed: 777, avoid: Array.from({ length: 8 }, (_, i) => (a.index + i) % 50) });
    const src = ["resources/challenges/challenge-bank.js", "resources/challenges/challenge-world-prep.js", "resources/challenges/challenge-world.js"].map(f => fs.readFileSync(path.join(ROOT, f), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "")).join("\n");   // code only (comments stripped)
    check(a.index === b.index && a.entry === b.entry && spread >= 40 && av.index !== a.index && av.avoided && ![...Array(8)].some((_, i) => av8.index === (a.index + i) % 50) && !/Math\.random/.test(src),
      "B6 · the entry choice is deterministic (launch seed × Challenge id / version × species — the same launch is the same entry), spreads over the cell (200 launch seeds → many entries), and avoids this session's recent entries; no Math.random in the runtime Challenge modules",
      `launch 777 → #${a.index} · 200 seeds → ${spread} distinct entries · avoiding #${a.index} → #${av.index} · avoiding 8 → #${av8.index}`); }
  // B7
  { const names = [["findWitness", BLOOM], ["findStrategies", BLOOM], ["validateScenario", BLOOM], ["validateFor", BLOOM.species]], calls = {}, orig = {};
    for (const [n, o] of names) { orig[n] = o[n]; o[n] = (...a) => { calls[n] = (calls[n] || 0) + 1; return orig[n](...a); }; }
    let made = 0;
    try { for (const [ch, sp] of CELLS) { const cell = CB.bankCell(ch, sp), pick = CB.pickEntry(cell, { challenge: ch, species: BLOOM.species.resolve(sp), launchSeed: 99 });
      const w = CB.bankWorld(pick.entry, cell, sp, null); CB.makeBankInstance({ challenge: ch, species: sp, launchSeed: 99, cell, pick, world: w }); made++; } }
    finally { for (const [n, o] of names) o[n] = orig[n]; }
    const rt = ["resources/challenges/challenge-bank.js", "resources/challenges/challenge-world-prep.js"].map(f => fs.readFileSync(path.join(ROOT, f), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "")).join("\n");   // code only (comments stripped)
    const worker = fs.readFileSync(path.join(ROOT, "resources/destination-survey/survey-worker.js"), "utf8"), task = (worker.match(/type === "challenge-bank-world"[^\n]*/) || [""])[0];
    check(made === NCELLS && !Object.keys(calls).length && !/\b(findWitness|findStrategies|validateScenario|validateFor|evaluateSpecies|physicalCandidate|runSearch)\(/.test(rt) && /bankWorld\(/.test(task) && !/challenge-draw|challenge-physical/.test(worker),
      "B7 · the runtime performs NO expensive Challenge proof: building and instancing a bank world for every cell calls findWitness / findStrategies / validateScenario / species.validateFor ZERO times; the runtime modules (challenge-bank.js, challenge-world-prep.js) and the worker's only Challenge task (\"challenge-bank-world\") contain no validator, no physical-validation search; the 036B live-search worker tasks are gone",
      `${made} instances · validator calls ${J(calls)}`); }
  // B8 — fixtures: their bank cells (built by the builder library) and the engine's starting state
  { const fp = C.fixture(FX_PRESCRIBED), fs2 = C.fixture(FX_START), wool = BLOOM.species.resolve("woolly_candle"), reed = BLOOM.species.resolve("reed_spire");
    const pool = BL.candidatePool(D, 6), cells = {}, t = Date.now();
    for (const ch of [fp, fs2]) { const sp = C.speciesOf(ch).id, key = `${ch.id}/${sp}`, rows = [];
      for (const task of pool) { const r = BL.evaluateWorld(task, { BLOOM, D, SD: S }, { challenges: [ch] }); rows.push(r); if (rows.filter(x => x.cells[key] && x.cells[key].stage === "ok").length >= 2) break; }
      cells[key] = BL.cellOf(ch, sp, BL.curateCell(rows, key, 2), rows.length, 1, CB); }
    FIXTURE_CELLS = cells;
    const st = C.startingStateOf(fs2), Dx = { ...D, challengeSeedBankFixtures: cells }, cS = cells[`${fs2.id}/woolly_candle`], cP = cells[`${fp.id}/reed_spire`];
    const pick = CB.pickEntry(CB.bankCell(fs2, wool, { BLOOM, BLOOM_DATA: Dx }), { challenge: fs2, species: wool, launchSeed: 5 });
    const w = CB.bankWorld(pick.entry, cS, wool, st), X = CB.makeBankInstance({ challenge: fs2, species: wool, launchSeed: 5, cell: cS, pick, world: w });
    let wrong = null; try { const pk = CB.pickEntry(cP, { challenge: fp, species: reed, launchSeed: 5 }); CB.makeBankInstance({ challenge: fp, species: "organic_hybrid", launchSeed: 5, cell: cP, pick: pk, world: CB.bankWorld(pk.entry, cP, reed, null) }); } catch (e) { wrong = e.message; }
    let notReleased = null; try { CB.bankCell(C.resolve("dying_world"), "reed_spire", { BLOOM, BLOOM_DATA: { ...D, challengeSeedBanks: null, challengeSeedBankFixtures: { "dying_world/reed_spire": cP } } }); } catch (e) { notReleased = e.code; }
    const sim = BLOOM.createSim(w.physical.planet, D.config, D.traits, { rng: () => 0.5, species: wool, startingState: st });
    const refuse = [["warm"], ["waterSeeds"], ["salt", "salt"], ["drought", "flood"], ["cold", "cold", "cold", "cold", "cold", "cold", "cold"]].map(a => { try { BLOOM.createSim(w.physical.planet, D.config, D.traits, { startingState: { adaptations: a, biomass: null } }); return "accepted"; } catch (e) { return "refused"; } });
    check(Object.keys(cells).length === 2 && Object.values(cells).every(c => c.entries.length === 2) && !C.ids().includes(fp.id) && C.speciesOf(fp) === reed && X.startingState === st && X.speciesPolicy === "prescribed"
        && /cold\+salt:250/.test(cS.provenance.startingState) && !!wrong && notReleased === "NO_BANK"
        && sim.genome.cold === 1 && sim.genome.salt === 1 && sim.biomass === 250 && sim.spent.global === 0 && refuse.every(x => x === "refused"),
      "B8 · QA fixtures (status \"fixture\", never on the hub) get their own bank cells from the builder (the prescribed start is part of the cell's provenance and of the proof); a prescribed-species instance refuses another species; a fixture cell can never stand in for a released Challenge; the engine's starting state lands EXACTLY (Cold Tolerance + Salt Handling owned, 250 Biomass, nothing spent) and refuses Terraform, crossing, over-max, two water arms, past the temperature cap",
      `fixture cells built in ${Math.round((Date.now() - t) / 1000)} s · ${Object.keys(cells).join(", ")}`); }
  // B9 — the run
  { const ch = C.resolve("dying_world"), sp = BLOOM.species.resolve("woolly_candle"), cell = CB.bankCell(ch, sp), pick = CB.pickEntry(cell, { challenge: ch, species: sp, launchSeed: 4242 });
    const inst = CB.makeBankInstance({ challenge: ch, species: sp, launchSeed: 4242, cell, pick, world: CB.bankWorld(pick.entry, cell, sp, null) });
    const G = BLOOM.gameSession, run = G.challengeRun(inst, { fingerprint: inst.fingerprint }), cr = run.challengeRun;
    const tamper = { liveSearchFormat1: { ...inst, format: 1, source: undefined }, version: { ...inst, challengeVersion: 2 }, recipe: { ...inst, recipeVersion: 2 }, bankVersion: { ...inst, bank: { ...inst.bank, bankVersion: 2 } },
      foreignChallenge: { ...inst, challenge: JSON.parse(JSON.stringify(inst.challenge)) }, foreignSpecies: { ...inst, species: JSON.parse(JSON.stringify(inst.species)) },
      start: { ...inst, startingState: { adaptations: ["cold"], biomass: null, source: "challenge" } }, unproven: { ...inst, candidate: { ...inst.candidate, scenarioValidation: { ...inst.candidate.scenarioValidation, ok: false } } } };
    const out = Object.fromEntries(Object.entries(tamper).map(([k, x]) => { try { G.challengeRun(x); return [k, "accepted"]; } catch (e) { return [k, "refused"]; } }));
    const det = { planet: inst.planet, species: inst.species, candidate: { key: "x", speciesId: inst.speciesId, physiologyKey: inst.species.physiologyKey } };
    const ex = d => { try { G.expeditionRun(d); return "accepted"; } catch (e) { return "refused"; } };
    const surveySrc = ["destination-survey.js", "survey-data.js", "sector-pool.js"].map(f => fs.readFileSync(path.join(ROOT, "resources/destination-survey", f), "utf8")).join("\n");
    check(run.planet === inst.planet && run.species === sp && run.challenge === ch && run.startingState === null && cr.source === "seed-bank" && cr.bankVersion === 1 && cr.cellKey === "dying_world/woolly_candle"
        && cr.entryIndex === pick.index && cr.launchSeed === 4242 && cr.planetSeed === pick.entry.seed && cr.fingerprint === pick.entry.fingerprint && cr.challengeVersion === 3 && cr.recipeVersion === 1
        && Object.values(out).every(x => x === "refused") && ex(det) === "accepted" && ex({ ...det, challenge: ch }) === "refused" && ex({ ...det, instance: inst }) === "refused"
        && !/challenge-bank|challengeSeedBank/.test(surveySrc),
      "B9 · BLOOM.gameSession.challengeRun plays the EXACT bank instance with its provenance (source seed-bank, bank v1, cell, entry, launch seed, planet seed + fingerprint, Challenge v3 / recipe v1); a 036B live-search instance (format 1), another Challenge / recipe / bank version, a foreign Challenge or species, another starting state or an unproven world is REFUSED; expeditionRun refuses a Challenge; the Destination Survey never touches a bank (the Expedition stays live procedural)",
      `${cr.cellKey} #${cr.entryIndex} ${pick.entry.archetypeId}:${pick.entry.seed} · ${J(out)}`); }

  // ---------------------------------------------------------------- A · the AUTHORED Challenges (036C1)
  { LOW_ARRIVAL_PICK.ids = C.ids(); for (const ch of C.list()) VERSION[ch.id] = ch.version;
    const ch = C.resolve("dying_world"), sp = BLOOM.species.resolve("cinder_rosette"), cell = CB.bankCell(ch, sp);
    for (let seed = 1; seed < 5000; seed++) { const pk = CB.pickEntry(cell, { challenge: ch, species: sp, launchSeed: seed }); if (pk.entry.habitable < 0.05) { Object.assign(LOW_ARRIVAL_PICK, { challenge: ch.id, species: sp.id, seed, index: pk.index }); break; } } }
  console.log("\n# A · authored Challenges (Node)");
  const AUTH = Object.keys(AUTHORED).filter(id => C.ids().includes(id));
  // A1 · several Challenges share one scenario and are never collapsed by it
  { const rows = AUTH.map(id => { const ch = C.resolve(id), A = AUTHORED[id], pv = C.provenance(ch), cells = Object.keys(bank.cells).filter(k => k.startsWith(id + "/"));
      return { id, ok: ch.scenario === A.scenario && C.scenarioOf(ch) === D.scenarios.find(s => s.id === A.scenario) && pv.id === id && pv.scenarioId === A.scenario && ch.name === A.name
        && J(ch.launch.world.recipe.archetypes) === J(A.archetypes) && J(cells) === J(spOf(ch).map(sp => `${id}/${sp}`)) && (A.species ? C.speciesOf(ch) === BLOOM.species.resolve(A.species) : C.speciesOf(ch) === null)
        && cells.every(k => bank.cells[k].provenance.challengeId === id && bank.cells[k].provenance.scenarioId === A.scenario && bank.cells[k].candidates.retained === 50) }; });
    const shared = {}; for (const ch of C.list()) (shared[ch.scenario] = shared[ch.scenario] || []).push(ch.id);
    check(AUTH.includes("low_tide") && AUTH.includes("oasis_line") && rows.every(r => r.ok) && C.ids().length === new Set(C.ids()).size && shared.dying_world.length >= 2 && shared.native_competition.length >= 2,
      "A1 · the authored Challenges resolve to an EXISTING scenario but stay their own Challenge: Low Tide → Dying World, Oasis Line → Native Competition (Windfall → Volatile Climate when released) — own id, name, provenance, recipe and bank cells keyed by the Challenge id, never by the scenario",
      `${J(shared)} · ${rows.map(r => r.id + (r.ok ? "✓" : "✗")).join(" ")}`); }
  // A2 · Low Tide: Flood + Salt owned at landing (given, not bought), Drought closed for the run, normal Biomass; its bank proven FROM that start
  { const ch = C.resolve("low_tide"), sp = BLOOM.species.resolve("organic_hybrid"), st = C.startingStateOf(ch), cell = CB.bankCell(ch, sp), e = cell.entries[0];
    const P = CB.buildBankWorld(e), sim = BLOOM.createSim(P, D.config, D.traits, { rng: () => 0.5, species: sp, startingState: st, scenario: C.scenarioOf(ch) }), T = id => D.traits.find(t => t.id === id);
    const dw = BLOOM.createSim(P, D.config, D.traits, { rng: () => 0.5, species: sp, scenario: C.scenarioOf(ch) }); sim.biomass = dw.biomass = 1e6;
    const closed = C.closedByStart(ch), arrivalNormal = S.assessWorld(P, undefined, sp).habitable, arrivalStart = S.assessWorld(P, undefined, sp, st).habitable;
    const pick = CB.pickEntry(cell, { challenge: ch, species: sp, launchSeed: 3 }), X = CB.makeBankInstance({ challenge: ch, species: sp, launchSeed: 3, cell, pick, world: CB.bankWorld(pick.entry, cell, sp, st) });
    const run = BLOOM.gameSession.challengeRun(X), rsim = BLOOM.createSim(X.planet, D.config, D.traits, { rng: () => 0.5, species: sp, startingState: run.startingState, scenario: C.scenarioOf(ch) });
    check(J(st.adaptations) === J(["flood", "salt"]) && st.biomass === null && sim.ownedTier(T("flood")) === 1 && sim.ownedTier(T("salt")) === 1 && sim.genome.salt === 1 && rsim.biomass === D.config.econ.startBiomass
        && rsim.spent.global === 0 && rsim.spent.local === 0 && !sim.canBuy(T("drought")) && /one water strategy/.test(sim.why(T("drought"))) && dw.canBuy(T("drought"))
        && J(closed.map(t => t.id)) === J(["drought"]) && cell.provenance.startingState === "|start:flood+salt:-" && arrivalStart > arrivalNormal
        && run.startingState === st && X.startingState === st && X.speciesPolicy === "prescribed",
      "A2 · Low Tide lands Organic Hybrid WITH Flood Adaptation + Salt Handling (owned through the engine's own rule, never paid for: spent 0, the normal starting Biomass) — so Drought Adaptation is UNAVAILABLE for the whole run (the one-water-strategy rule; buyable from a normal start on the same world), closedByStart names exactly it; the bank cell's provenance carries that start and its proofs (S2 + layer P) were made from it",
      `entry ${e.archetypeId}:${e.seed} · arrival normal ${Math.round(arrivalNormal * 100)}% → with the start ${Math.round(arrivalStart * 100)}% · drought: ${sim.why(T("drought"))}`); }
  // A3 · Oasis Line: Desert only, NO inherited 20 % arrival floor, every proof met contested fronts
  { const ch = C.resolve("oasis_line"), cell = CB.bankCell(ch, "reed_spire"), E = cell.entries, nc = C.resolve("native_competition");
    const below = E.filter(e => e.habitable < 0.2).length, minContested = Math.min(...E.map(e => e.proof.contested)), med = [...E.map(e => e.proof.contested)].sort((a, b) => a - b)[25];
    check(E.length === 50 && E.every(e => e.archetypeId === "desert_world") && ch.launch.world.recipe.arrival === null && nc.launch.world.recipe.arrival.minHabitable === 0.2 && below >= 25
        && minContested >= 1 && E.every(e => e.proof.status === "PASS" && e.proof.confirmations >= 2) && cell.provenance.scenarioId === "native_competition" && C.startingStateOf(ch) === null,
      "A3 · Oasis Line: 50 Desert worlds for Reed Spire under the FULL Native Competition proof (+ its confirmation runs), WITHOUT the released Native Competition's 20 % arrival floor (most entries start below it), and every proof witness met real contested fronts",
      `below 20 % arrival: ${below}/50 · contested min ${minContested}, median ${med} · arrival p50 ${Math.round([...E.map(e => e.habitable)].sort((a, b) => a - b)[25] * 100)}%`); }
  // A4 · Windfall (only when released): the exact starting Biomass, nothing owned, player choice, all archetypes
  if (AUTH.includes("windfall")) { const ch = C.resolve("windfall"), st = C.startingStateOf(ch), cells = SPECIES.map(sp => CB.bankCell(ch, sp));
    const sim = BLOOM.createSim(CB.buildBankWorld(cells[0].entries[0]), D.config, D.traits, { rng: () => 0.5, species: BLOOM.species.resolve(SPECIES[0]), startingState: st });
    check(C.speciesOf(ch) === null && st.adaptations.length === 0 && Number.isInteger(st.biomass) && sim.biomass === st.biomass && sim.spent.global === 0 && cells.every(c => c.entries.length === 50 && c.provenance.startingState === `|start::${st.biomass}`),
      `A4 · Windfall: player choice (four cells), the selected start EXACTLY ${st.biomass} Biomass with nothing owned (not a purchase), every cell proven from that start`, cells.map(c => c.provenance.startingState).join(" ")); }

  if (NODE_ONLY) return done();
  await browserChecks();
  done();
})().catch(e => { console.error(e); check(false, "uncaught", e.stack || String(e)); done(); });

function done() { console.log(`\n${fails ? "FAIL" : "OK"} — challenge-world-check: ${passes} passed, ${fails} failed (${Math.round((Date.now() - t0) / 1000)} s)`); process.exit(fails ? 1 : 0); }

async function browserChecks() {
  let pw; try { pw = require("playwright"); } catch (e) { check(false, "playwright", "not installed: NODE_PATH=\"$(npm root -g)\""); return; }
  const { buildSite } = await import("file://" + path.join(ROOT, "tools/build-pages-site.mjs"));
  const SITE_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "bloom036b-site-")); buildSite(ROOT, SITE_DIR);
  const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml" };
  const srv = http.createServer((req, res) => {
    const u = new URL(req.url, "http://x"); let base = ROOT, p = decodeURIComponent(u.pathname);
    if (p.startsWith("/bloom/")) { base = SITE_DIR; p = p.slice("/bloom".length); }
    if (p.endsWith("/")) p += "index.html";
    const f = path.join(base, p); if (!f.startsWith(base) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end("not found"); }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream", "Cache-Control": "no-store" }); fs.createReadStream(f).pipe(res);
  });
  await new Promise(r => srv.listen(0, "127.0.0.1", r)); const ORIGIN = `http://127.0.0.1:${srv.address().port}`;
  const FILE_INDEX = "file://" + encodeURI(path.join(ROOT, "index.html"));
  if (EVIDENCE) fs.mkdirSync(EVD, { recursive: true });

  for (const bn of BROWSERS) {
    const browser = await pw[bn].launch(); console.log(`\n# ${bn} ${browser.version()}`);
    const settled = p => p.evaluate(() => Promise.race([Promise.all(document.getAnimations().filter(a => a.playState === "running" && isFinite(a.effect && a.effect.getComputedTiming().endTime)).map(a => a.finished.catch(() => {}))), new Promise(r => setTimeout(r, 4000))]));
    const shot = async (p, name, opts = {}) => { if (EVIDENCE && (bn === "chromium" || opts.firefox)) { await settled(p); await p.waitForTimeout(opts.wait || 250); await p.screenshot({ path: path.join(EVD, (bn === "firefox" ? "firefox-" : "") + name) }); } };
    const context = async ({ width = 1440, height = 900, offline = false } = {}) => {
      const c = await browser.newContext({ viewport: { width, height } });
      if (offline) await c.setOffline(true);
      await c.addInitScript(() => { try { localStorage.setItem("strange-bloom.training", '{"v":1,"status":"completed","at":1}'); } catch (e) { /* none */ } });
      return c; };
    const page = async c => { const p = await c.newPage(); p.errs = []; p.reqs = []; p.navs = 0;
      p.on("pageerror", e => p.errs.push("pageerror: " + e.message)); p.on("console", m => { if (m.type() === "error") p.errs.push("console: " + m.text()); });
      p.on("request", r => p.reqs.push(r.url())); p.on("framenavigated", f => { if (f === p.mainFrame()) p.navs++; }); p.on("dialog", d => d.accept()); return p; };
    const menuReady = p => p.waitForFunction(() => window.MENU_DEV && MENU_DEV.ready && MENU_DEV.entry.state === "menu" && MENU_DEV.entry.black.style.display === "none", null, { timeout: 60000, polling: 100 });
    const hubReady = p => p.waitForFunction(() => { const e = MENU_DEV.entry, v = e.challengeView; return e.state === "challenges" && v && v.inner && e.black.style.display === "none"; }, null, { timeout: 60000, polling: 50 });
    const speciesReady = p => p.waitForFunction(() => { const e = MENU_DEV.entry, v = e.speciesView; return e.state === "species" && v && v.inner && e.black.style.display === "none"; }, null, { timeout: 60000, polling: 50 });
    const worldOpen = p => p.waitForFunction(() => { const e = MENU_DEV.entry, v = e.worldView; return e.state === "challenge-world" && v && v.inner && e.black.style.display === "none"; }, null, { timeout: 60000, polling: 30 });
    const worldReady = p => p.waitForFunction(() => { const e = MENU_DEV.entry, v = e.worldView; return e.state === "challenge-world" && v && v.inner && v.inner.state === "ready" && e.black.style.display === "none"; }, null, { timeout: 120000, polling: 50 });
    const surveyReady = p => p.waitForFunction(() => { const s = MENU_DEV.entry.survey; return s && s.state === "survey" && s.cells.every(Boolean) && MENU_DEV.entry.black.style.display === "none"; }, null, { timeout: 420000, polling: 200 });
    const runReady = (p, n) => p.waitForFunction(n => window.BLOOM_APP && BLOOM_APP.session && BLOOM_APP.stats.sessions.length >= n && BLOOM_APP.stats.sessions[n - 1].readyMs !== null && !BLOOM_APP.busy
      && !document.querySelector(".atx") && MENU_DEV.entry.state === "away" && MENU_DEV.entry.black.style.display === "none", n, { timeout: 120000, polling: 50 });
    const reportOpen = p => p.waitForFunction(() => BLOOM.runReport.instance && BLOOM.runReport.instance.state().open && !BLOOM.runReport.instance.state().busy, null, { timeout: 20000, polling: 30 });
    const HUB = "MENU_DEV.entry.challengeView.inner", SS = "MENU_DEV.entry.speciesView.inner", CW = "MENU_DEV.entry.worldView.inner";
    const openHub = async p => { await p.click('.mm-item[data-act="challenges"]'); await hubReady(p); };
    const beginChallenge = async (p, id) => { await p.evaluate(([id, H]) => eval(H).select(id), [id, HUB]); await p.click(".ch-btn.go"); await speciesReady(p); };
    const chooseSpecies = async (p, id) => { await p.evaluate(([id, SS]) => eval(SS).open(id), [id, SS]); await p.click(".ss-btn.go"); await worldOpen(p); };
    const beginRun = async (p, n) => { await p.click(".cw-btn.go"); await runReady(p, n); };
    const winNow = p => p.evaluate(() => { const s = BLOOM_API.sim; BLOOM_API.advance(40); s.won = true; s.onWin(s.coverage()); });
    // the page's own validators, counted (a Challenge launch must never call one on the page; the worker's task is proven in Node, B7)
    const countValidators = p => p.evaluate(() => { window.__validatorCalls = {}; for (const [n, o] of [["findWitness", BLOOM], ["findStrategies", BLOOM], ["validateScenario", BLOOM], ["validateFor", BLOOM.species]]) {
      const f = o[n]; o[n] = (...a) => { __validatorCalls[n] = (__validatorCalls[n] || 0) + 1; return f(...a); }; } });
    const runId = p => p.evaluate(() => { const S = BLOOM_APP.session, X = BLOOM_APP.challengeRun && BLOOM_APP.challengeRun.instance, ch = S.run.challenge;
      return { planetSame: !!X && S.planet === X.planet, speciesSame: !!X && S.run.species === X.species, challengeSame: !!X && ch === X.challenge, challengeCanon: !ch || ch === BLOOM.challenges.resolve(ch.id),
        scenario: S.run.scenario ? S.run.scenario.id : null, scenarioCanon: !S.run.scenario || S.run.scenario === BLOOM_DATA.scenarios.find(s => s.id === S.run.scenario.id),
        simScenario: S.sim.scenario ? S.sim.scenario.id : null, mech: S.adapter.run().mechanics, simSpecies: S.sim.species && S.sim.species.id, challenge: ch ? ch.id : null, adapter: S.adapter.run().challenge,
        hud: (document.querySelector(".pv-id small") || {}).textContent, footer: (document.getElementById("pvRunId") || {}).textContent, cr: S.run.challengeRun || null, expedition: S.run.expedition || null,
        fp: X && X.fingerprint, launchSeed: X && X.launchSeed, entryIndex: X && X.entryIndex,
        scn: (() => { const el = document.getElementById("pvScn"); return el && !el.hidden ? (el.querySelector(".sh b") || {}).textContent : null; })() }; });
    const storageClean = p => p.evaluate(() => { const keys = s => { try { return Object.keys(s).map(k => k + "=" + s.getItem(k)); } catch (e) { return []; } };
      const all = [...keys(localStorage), ...keys(sessionStorage)]; return { leak: all.filter(x => /challenge|dying_world|native_competition|volatile_climate|scenario|launch|bank/i.test(x)), name: window.name, href: location.href }; });
    const reportFacts = p => p.evaluate(() => ({ facts: [...document.querySelectorAll(".rr-fact")].map(x => [x.querySelector("small").textContent, x.querySelector("b").textContent]), kicker: document.getElementById("rrKicker").textContent,
      acts: BLOOM.runReport.instance.state().actions, labels: [...document.querySelectorAll("#rrActs .rr-btn b")].map(x => x.textContent), given: (document.querySelector(".rr-given") || {}).textContent || null,
      identity: BLOOM_APP.session.adapter.report().identity }));

    try {
      // ------------------------------------------------------------------ F · each Challenge end to end · E · environment
      for (const id of IDS) {
        if (bn === "firefox" && id === "volatile_climate") continue;   // Firefox: representative flows
        const [sp, seed] = FLOW[id], c = await context(), p = await page(c);
        await p.goto(`${ORIGIN}/?launch=${seed}&bg=7`); await menuReady(p); const href0 = await p.evaluate(() => location.href); await countValidators(p);
        await openHub(p); await beginChallenge(p, id);
        const SPS = await p.evaluate(() => ({ kicker: document.querySelector(".ss-kicker").textContent, cards: [...document.querySelectorAll(".ss-card")].map(x => x.dataset.species), launch: MENU_DEV.entry.launch && MENU_DEV.entry.launch.launchSeed }));
        await shot(p, `03-species-${id}.png`, { firefox: id === "dying_world" });
        await p.evaluate(([id, SS]) => eval(SS).open(id), [sp, SS]); const go = await p.evaluate(() => document.querySelector(".ss-go-l").textContent);
        await p.waitForFunction(sp => { const j = MENU_DEV.entry.launch.prep.jobs.get(sp); return j && j.state === "ready"; }, sp, { timeout: 60000, polling: 50 });   // prepared while the player reads
        const tC = Date.now(); await p.click(".ss-btn.go"); await worldReady(p); const warmMs = Date.now() - tC;
        const DOS = await p.evaluate(CW => { const v = eval(CW), r = v.root, X = v.instance, L = MENU_DEV.entry.launch.prep;
          return { name: r.querySelector(".cw-dossier h2").textContent, fp: X.fingerprint, drawnFp: r.dataset.fingerprint, globes: r.querySelectorAll(".cw-globe").length, canvases: r.querySelectorAll("canvas.planet-sphere-canvas").length,
            secs: [...r.querySelectorAll(".cw-sec-k span")].map(x => x.textContent), hazards: (r.querySelector(".cw-hazards h3") || {}).textContent, seed: r.querySelector(".cw-seed").textContent,
            buttons: [...r.querySelectorAll(".cw-actions button")].map(b => b.innerText.trim()), sp: r.querySelector(".cw-sp-name").textContent, ch: r.querySelector(".cw-ch-name").textContent,
            steps: [...r.querySelectorAll(".cw-steps li")].map(x => x.textContent), checking: /Checking|conditions/i.test(r.querySelector(".cw-prep").textContent),
            foot: !!r.querySelector(".cw-foot") || /Foothold/i.test(r.innerText), s1: Number.isFinite(X.candidate.playability.s1.reachableShare),
            start: r.querySelector(".cw-start").textContent, specimen: !!r.querySelector(".cw-specimen").dataset.signature, skipped: !!v.stats.skippedPreparing,
            bank: X.bank, entryIndex: X.entryIndex, source: X.source, format: X.format, launchSeed: X.launchSeed, worldSeed: X.worldSeed, archetype: X.archetypeId, sv: X.candidate.scenarioValidation,
            rootH: Math.round(r.getBoundingClientRect().height), hit: (() => { const b = r.querySelector(".cw-btn.go").getBoundingClientRect(), e = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2); return !!e && !!e.closest(".cw-btn.go"); })(),
            build: L.stats.builds.find(b => b.species === X.speciesId), calls: window.__validatorCalls, survey: !!MENU_DEV.entry.survey || !!document.querySelector(".ds"),
            low: !r.querySelector(".cw-hab-note").hidden, green: X.candidate.dossier.habitable.green, closed: !r.querySelector(".cw-closed").hidden }; }, CW);
        await shot(p, `05-dossier-${id}.png`, { firefox: true });
        const archName = await p.evaluate(a => BLOOM_DATA.archetypes.find(x => x.id === a).name, DOS.archetype), spName = await p.evaluate(s => BLOOM.species.resolve(s).name, sp);
        check(SPS.kicker === `Challenge · ${NAMES[id]}` && J(SPS.cards) === J(SPECIES) && /^Continue with /.test(go) && SPS.launch === seed,
          `[${bn}] F1 ${id} · BEGIN CHALLENGE → a launch (seed ${seed}) → Choose Plant Species: all four species, the kicker names the Challenge, "Continue with <plant>"; the selected plant's ONE bank world is built while the player reads`, J({ ...SPS, go }));
        check(J(DOS.steps) === J(["Selecting a proven world", "Building the planet", "Verifying the planet"]) && !DOS.checking && DOS.skipped && warmMs < 2000,
          `[${bn}] F2 ${id} · PREPARING tells only the truth ("Selecting a proven world · Building the planet · Verifying the planet" — nothing claims to check Challenge conditions); with the world prepared on the species screen it is skipped cleanly (no flash): Continue → the dossier in ${warmMs} ms`, J({ steps: DOS.steps, skipped: DOS.skipped, warmMs }));
        check(DOS.globes === 1 && DOS.canvases === 1 && DOS.drawnFp === DOS.fp && J(DOS.secs) === J(["The challenge", "Your plant", "Your world"]) && DOS.hazards === "Expected hazards" && DOS.seed === `World Seed ${DOS.worldSeed} · ${archName}`
            && J(DOS.buttons) === J(["Back", "Begin challenge"]) && DOS.rootH > 300 && DOS.hit && DOS.sp === spName && DOS.ch === NAMES[id] && DOS.specimen && /nothing owned yet/.test(DOS.start) && !DOS.foot && DOS.s1
            && DOS.source === "seed-bank" && DOS.format === 2 && DOS.bank.cellKey === `${id}/${sp}` && DOS.bank.bankVersion === 1 && DOS.bank.entries === 50 && Number.isInteger(DOS.entryIndex) && DOS.sv.ok && DOS.sv.offline
            && DOS.build && DOS.build.source === "worker" && !Object.keys(DOS.calls || {}).length && !DOS.survey && DOS.launchSeed === seed && DOS.low === (DOS.green < 0.05) && !DOS.closed,
          `[${bn}] F3 ${id} · the dossier shows ONE bank world, laid out and clickable (one globe; Begin challenge is hit at its centre; The challenge · Your plant · Your world; Expected hazards; World Seed; no Foothold line — S1 stays in the instance); the instance is bank-backed (format 2, cell ${id}/${sp}, an entry of 50, proof offline); built in the worker; ZERO validator calls on the page; no Destination Survey`,
          `${DOS.name} ${DOS.archetype}:${DOS.worldSeed} #${DOS.entryIndex} ${DOS.fp} · build ${DOS.build && DOS.build.buildMs} ms (${DOS.build && DOS.build.source})`);
        await beginRun(p, 1);
        const R = await runId(p);
        check(R.planetSame && R.speciesSame && R.challengeSame && R.challengeCanon && R.scenario === id && R.scenarioCanon && R.simScenario === id && R.simSpecies === sp && R.challenge === id && R.adapter && R.adapter.id === id
            && R.cr && R.cr.source === "seed-bank" && R.cr.challengeVersion === VERSION[id] && R.cr.bankVersion === 1 && R.cr.cellKey === `${id}/${sp}` && R.cr.entryIndex === DOS.entryIndex && R.cr.launchSeed === seed && R.cr.fingerprint === DOS.fp && R.cr.planetSeed === DOS.worldSeed
            && R.expedition === null && R.hud === `Challenge · ${NAMES[id]}` && /^Challenge · /.test(R.footer) && R.scn === NAMES[id],
          `[${bn}] F4 ${id} · BEGIN CHALLENGE (the dramatic descent) → the run plays EXACTLY the bank instance (planet / species / Challenge / scenario objects) with its provenance (seed-bank v1, cell, entry, launch seed, planet seed + fingerprint, Challenge v3); the HUD names the Challenge; the scenario's status card runs`,
          `${R.hud} · ${J({ cell: R.cr && R.cr.cellKey, entry: R.cr && R.cr.entryIndex })}`);
        await p.evaluate(n => BLOOM_API.advance(n), id === "dying_world" ? 700 : 300); await p.waitForTimeout(400); await shot(p, `06-run-${id}.png`, { firefox: id === "dying_world" });
        const spec = room => p.evaluate(r => { const s = BLOOM.plantSpecimen.mounted().find(x => x.el.closest(`.dr-room[data-room="${r}"]`) && !x.el.closest("[hidden]"));
          return s && s.scene ? { env: s.environmentSignature(), t: s.scene.t, m: s.scene.m, keys: Object.keys(s.scene).sort().join(",") } : null; }, room);
        const idle = () => p.waitForFunction(() => !BLOOM.decisionRooms.instance.state().transitioning, null, { timeout: 20000, polling: 50 });
        const openAdapt = async () => { await idle(); await p.evaluate(() => { const D = BLOOM.decisionRooms.instance; D.open("adapt", D.state().context); });
          await p.waitForFunction(() => { const st = BLOOM.decisionRooms.instance.state(); return st.room === "adapt" && !st.transitioning; }, null, { timeout: 20000, polling: 50 }); await p.waitForTimeout(300); };
        const closeRoom = async () => { await idle(); await p.evaluate(() => BLOOM.decisionRooms.instance.close()).catch(() => {}); await idle(); await p.waitForTimeout(150); };
        if (id === "dying_world") {
          await openAdapt(); const a = await spec("adapt");
          const b = await p.evaluate(() => { const D = BLOOM.decisionRooms.instance, r = D.adapter.region(D.state().context), S = BLOOM_API.sim; return { t: r.raw.effectiveTemp, m: r.raw.effectiveMoist, off: { ...S.pressure.offsets }, progress: S.pressure.progress }; });
          check(a && b.progress > 0.2 && b.off.temp < -1 && b.off.moist < -1 && Math.abs(a.t - Math.round(b.t * 10) / 10) < 0.11 && Math.abs(a.m - Math.round(b.m * 10) / 10) < 0.11,
            `[${bn}] E1 dying_world · the specimen scene reads the REAL region sky (the decline's drift, no Terraform)`, J({ scene: a && { t: a.t, m: a.m }, region: { t: b.t, m: b.m }, progress: +b.progress.toFixed(2) }));
          await closeRoom();
        }
        if (id === "volatile_climate") {
          await openAdapt(); const before = await spec("adapt"); await closeRoom();
          const shock = await p.evaluate(() => { BLOOM_API.addBiomass(4000); for (const id of ["warm", "warm"]) BLOOM_API.buy(id); const S = BLOOM_API.sim, CL = S.climate;
            for (let k = 0; k < 3000 && !S.lost && !(Math.abs(CL.offsets.temp) > 0.5 && CL.shocks.some(x => !x.ended)); k++) BLOOM_API.advance(1);
            return { offsets: { ...CL.offsets }, shocks: CL.shocks.map(x => ({ name: x.name, ended: x.ended })), forcing: CL.forcing.length, lost: !!S.lost }; });
          await openAdapt(); const during = await spec("adapt");
          const reg = await p.evaluate(() => { const D = BLOOM.decisionRooms.instance, r = D.adapter.region(D.state().context); return { t: r.raw.effectiveTemp }; });
          check(shock.forcing === 2 && !shock.lost && shock.shocks.some(x => !x.ended) && Math.abs(shock.offsets.temp) > 0.5 && during && Math.abs(during.t - Math.round(reg.t * 10) / 10) < 0.11 && during.env !== before.env,
            `[${bn}] E2 volatile_climate · a real climate shock (two bought Terraform steps; none injected) appears in the specimen scene`, J({ shock, during: during && during.t, region: reg }));
          await closeRoom();
        }
        if (id === "native_competition") {
          await openAdapt(); const a = await spec("adapt"); await closeRoom();
          check(a && a.keys === "horizon,kind,m,planet,rad,region,salt,seed,skyline,t,toxic,v", `[${bn}] E3 native_competition · the specimen scene is the region's own environment only (no fake native plants)`, a && a.keys);
        }
        await winNow(p); await reportOpen(p);
        const RP = await reportFacts(p), fact = RP.facts.find(x => x[0] === "Challenge"), I = RP.identity.challengeRun;
        check(fact && fact[1] === NAMES[id] && !RP.facts.some(x => x[0] === "Scenario") && /challenge debrief/.test(RP.kicker) && J(RP.acts) === J(["keepPlaying", "retryChallenge", "challenges", "mainMenu"])
            && J(RP.labels) === J(["Retry challenge", "Challenges", "Main menu"]) && I && I.source === "seed-bank" && I.challengeId === id && I.challengeVersion === VERSION[id] && I.recipeVersion === 1 && I.bankVersion === 1
            && I.cellKey === `${id}/${sp}` && I.entryIndex === DOS.entryIndex && I.launchSeed === seed && I.planetSeed === DOS.worldSeed && I.fingerprint === DOS.fp && I.speciesId === sp && I.scenarioId === id && RP.identity.startingState === null && !RP.given,
          `[${bn}] F5 ${id} · the report names the Challenge (challenge debrief), carries the bank provenance (seed-bank v1, cell, entry, launch seed, planet seed / fingerprint, Challenge / recipe versions, species, scenario) and offers KEEP PLAYING · RETRY CHALLENGE · CHALLENGES · MAIN MENU`,
          `${J(RP.acts)}`);
        await shot(p, `07-report-${id}.png`, { firefox: id === "dying_world" });
        const D1 = await storageClean(p);
        check(p.navs === 1 && D1.href === href0 && !D1.leak.length && !D1.name && !p.reqs.some(u => /[?&](challenge|scenario|instance|bank)=/.test(u)) && !p.errs.length,
          `[${bn}] D1 ${id} · one document: no navigation, the address never changed, nothing about a Challenge or bank in storage / window.name / a request URL; no console error`,
          `navs ${p.navs} · leak ${J(D1.leak)}${p.errs.length ? " · " + p.errs.join(" | ") : ""}`);
        await c.close();
      }

      // ------------------------------------------------------------------ A · the AUTHORED Challenges end to end (036C1)
      for (const id of Object.keys(AUTHORED).filter(x => LOW_ARRIVAL_PICK.ids.includes(x))) {
        const A = AUTHORED[id], sp = A.species || "woolly_candle", c = await context(), p = await page(c);
        await p.goto(`${ORIGIN}/?launch=${A.launch}&bg=7`); await menuReady(p); await countValidators(p); await openHub(p);
        const HB = await p.evaluate(([id, H]) => { const h = eval(H); h.select(id); const r = h.root || document;
          return { cards: [...document.querySelectorAll(".ch-card")].map(x => x.querySelector("h3").textContent), brief: (document.querySelector(".ch-d-brief") || {}).textContent,
            how: [...document.querySelectorAll(".ch-d li")].map(x => x.textContent).join(" | ") || document.querySelector(".ch-dossier, .ch-d") && document.querySelector(".ch-dossier, .ch-d").innerText }; }, [id, HUB]);
        await shot(p, `a1-hub-${id}.png`, { firefox: id === "low_tide" });
        await p.click(".ch-btn.go");
        if (A.species) await worldReady(p); else { await speciesReady(p); await p.evaluate(([s, SS]) => eval(SS).open(s), [sp, SS]); await shot(p, `a2-species-${id}.png`); await p.click(".ss-btn.go"); await worldReady(p); }
        const DOS = await p.evaluate(CW => { const v = eval(CW), r = v.root, X = v.instance, h = X.candidate.dossier.habitable;
          return { sp: r.querySelector(".cw-sp-name").textContent, ch: r.querySelector(".cw-ch-name").textContent, note: (r.querySelector(".cw-sp-note") || {}).textContent || null, start: r.querySelector(".cw-start").textContent,
            closed: r.querySelector(".cw-closed").hidden ? null : r.querySelector(".cw-closed").textContent, low: !r.querySelector(".cw-hab-note").hidden, green: h.green, archetype: X.archetypeId, entryIndex: X.entryIndex, fp: X.fingerprint,
            cell: X.bank.cellKey, species: X.speciesId, speciesScreen: MENU_DEV.events.filter(e => e.type === "species-screen").length, calls: window.__validatorCalls }; }, CW);
        await shot(p, `a3-dossier-${id}.png`, { firefox: id === "low_tide" });
        const want = id === "low_tide" ? { start: /^Lands with Flood Adaptation · Salt Handling \(given by the Challenge\)$/, closed: /^Drought Adaptation is not available: a plant commits to one water strategy/ } : null;
        check(HB.cards.includes(A.name) && HB.cards.length === LOW_ARRIVAL_PICK.ids.length && DOS.ch === A.name && DOS.cell === `${id}/${sp}` && DOS.species === sp && DOS.archetype && A.archetypes.includes(DOS.archetype)
            && (A.species ? DOS.speciesScreen === 0 && /prescribes the plant/.test(DOS.note || "") : !DOS.note) && DOS.low === (DOS.green < 0.05) && !Object.keys(DOS.calls || {}).length
            && (want ? want.start.test(DOS.start) && want.closed.test(DOS.closed || "") : DOS.closed === null)
            && (id !== "oasis_line" || /nothing owned yet/.test(DOS.start)) && (id !== "windfall" || /Biomass \(given by the Challenge\)$/.test(DOS.start)),
          `[${bn}] A5 ${id} · the hub lists ${A.name} as an equal card; BEGIN CHALLENGE ${A.species ? "goes straight to the prepared world (no Choose Plant Species: the plant is prescribed and the dossier says so)" : "opens Choose Plant Species"}; the dossier names ${A.name} and the plant, the cell ${id}/${sp}, a ${A.archetypes.join(" / ")} world, what the Challenge gives${id === "low_tide" ? " and what that start CLOSES (Drought Adaptation)" : ""}; the low-arrival line exactly when < 5 % suits the plant; no validator on the page`,
          J({ cards: HB.cards, ...DOS, calls: undefined })); 
        await beginRun(p, 1);
        const R = await runId(p), S0 = await p.evaluate(() => { const s = BLOOM_API.sim, T = id => s.traitById[id];
          return { spent: s.spent, biomass: s.biomass, flood: s.ownedTier(T("flood")), salt: s.ownedTier(T("salt")), drought: s.canBuy(T("drought")), why: s.why(T("drought")), start: s.startingState && { a: [...s.startingState.adaptations], b: s.startingState.biomass },
            comp: s.competition ? +s.competition.startShare.toFixed(3) : null, native: s.competition ? s.competition.native.filter(x => x > 0).length : null }; });
        check(R.challenge === id && R.scenario === A.scenario && R.simScenario === A.scenario && R.simSpecies === sp && R.adapter && R.adapter.id === id && R.adapter.scenarioId === A.scenario && R.hud === `Challenge · ${A.name}`
            && R.cr && R.cr.challengeVersion === 1 && R.cr.cellKey === `${id}/${sp}` && R.cr.entryIndex === DOS.entryIndex && R.cr.fingerprint === DOS.fp && S0.spent.global === 0 && S0.spent.local === 0
            && (id !== "low_tide" || (S0.flood === 1 && S0.salt === 1 && !S0.drought && /one water strategy/.test(S0.why) && J(S0.start.a) === J(["flood", "salt"])))
            && (id !== "oasis_line" || (S0.comp > 0.1 && S0.native > 0 && S0.start === null)),
          `[${bn}] A6 ${id} · the run is ${A.name} (Challenge id ${id}, version 1; the HUD names it) playing the ${A.scenario} scenario, its own cell + entry; nothing given was charged (spent 0)${id === "low_tide" ? "; Flood + Salt owned, Drought refused by the engine" : id === "oasis_line" ? "; native vegetation established at the start" : ""}`,
          J({ hud: R.hud, cr: R.cr && R.cr.cellKey, S0 }));
        await p.evaluate(n => BLOOM_API.advance(n), 300); await p.waitForTimeout(300); await shot(p, `a4-run-${id}.png`, { firefox: id === "oasis_line" });
        const idle = () => p.waitForFunction(() => !BLOOM.decisionRooms.instance.state().transitioning, null, { timeout: 20000, polling: 50 });
        await idle(); await p.evaluate(() => { const D = BLOOM.decisionRooms.instance; D.open("adapt", D.state().context); });
        await p.waitForFunction(() => { const st = BLOOM.decisionRooms.instance.state(); return st.room === "adapt" && !st.transitioning; }, null, { timeout: 20000, polling: 50 }); await p.waitForTimeout(400);
        const AD = await p.evaluate(() => { const n = d => document.querySelector(`.dr-room[data-room="adapt"] .node[data-node="${d}"]`);
          return Object.fromEntries(["drought", "flood", "salt"].map(d => [d, n(d) ? { disabled: n(d).getAttribute("aria-disabled"), lock: !!n(d).querySelector(".nl:not(.ok)"), owned: !!n(d).querySelector(".nl.ok"), word: (n(d).querySelector(".nt small") || {}).textContent } : null])); });
        if (id === "low_tide") { await p.hover('.dr-room[data-room="adapt"] .node[data-node="drought"]').catch(() => {}); await p.waitForTimeout(250); }
        await shot(p, `a5-adapt-${id}.png`, { firefox: id === "low_tide" });
        const hint = await p.evaluate(() => (document.querySelector('.dr-room[data-room="adapt"] .li-hint') || {}).textContent || "");
        if (id === "low_tide") check(AD.drought && AD.drought.disabled === "true" && AD.drought.lock && AD.flood && AD.flood.owned && AD.salt && AD.salt.owned && /one water strategy/i.test(hint),
          `[${bn}] A7 low_tide · the Adapt room shows Flood Adaptation and Salt Handling OWNED and Drought Adaptation LOCKED with the engine's reason (one water strategy)`, J({ AD, hint }));
        await p.evaluate(() => BLOOM.decisionRooms.instance.close()).catch(() => {}); await idle(); await p.waitForTimeout(200);
        await winNow(p); await reportOpen(p);
        const RP = await reportFacts(p), sum = await p.evaluate(() => document.getElementById("rrSum").textContent), chips = await p.evaluate(() => [...document.querySelectorAll(".rr-chip.ow")].map(x => [x.textContent, x.classList.contains("given")]));
        const fact = RP.facts.find(x => x[0] === "Challenge"), I = RP.identity.challengeRun;
        check(fact && fact[1] === A.name && sum.includes(`in the ${A.name} Challenge`) && I.challengeId === id && I.scenarioId === A.scenario && I.cellKey === `${id}/${sp}` && I.entryIndex === DOS.entryIndex
            && (id !== "low_tide" || (/^Given by the Challenge at landing: Flood Adaptation · Salt Handling\.$/.test(RP.given || "") && chips.filter(x => x[1]).length === 2 && chips.filter(x => x[1]).every(x => /given/.test(x[0]))))
            && (id !== "oasis_line" || (!RP.given && !chips.some(x => x[1]))),
          `[${bn}] A8 ${id} · the report is ${A.name}'s (the Challenge fact, "in the ${A.name} Challenge", provenance id ${id} / scenario ${A.scenario}, its own cell + entry)${id === "low_tide" ? "; the given Flood + Salt are marked GIVEN on their chips and in the landing note, never as purchases" : ""}`,
          J({ fact, sum, given: RP.given, chips }));
        await shot(p, `a6-report-${id}.png`, { firefox: id === "low_tide" });
        await p.click('#rrActs [data-act="retryChallenge"]'); await runReady(p, 2);
        const R2 = await runId(p), S2 = await p.evaluate(() => { const s = BLOOM_API.sim; return { spent: s.spent.global, start: s.startingState && [...s.startingState.adaptations], ticks: s.ticks }; });
        check(R2.challenge === id && R2.cr.entryIndex === DOS.entryIndex && R2.cr.fingerprint === DOS.fp && R2.cr.launchSeed === R.cr.launchSeed && S2.spent === 0 && S2.ticks < 50 && J(S2.start) === J(id === "low_tide" ? ["flood", "salt"] : null) && !p.errs.length,
          `[${bn}] A9 ${id} · RETRY CHALLENGE replays the EXACT entry (same cell, entry, planet, launch) with a fresh simulation and the same given start; no console error`, J({ entry: R2.cr.entryIndex, S2, errs: p.errs.slice(0, 2) }));
        await c.close();
      }
      // A10 · the low-arrival explanation on a released Challenge's dossier (an entry where under 5 % suits the plant), and its absence otherwise
      { const L = LOW_ARRIVAL_PICK, c = await context(), p = await page(c);
        await p.goto(`${ORIGIN}/?launch=${L.seed}&bg=7`); await menuReady(p); await openHub(p); await beginChallenge(p, L.challenge); await chooseSpecies(p, L.species); await worldReady(p);
        const lo = await p.evaluate(CW => { const v = eval(CW), r = v.root; return { idx: v.instance.entryIndex, green: v.instance.candidate.dossier.habitable.green, shown: !r.querySelector(".cw-hab-note").hidden, text: r.querySelector(".cw-hab-note").textContent, pct: r.querySelector(".cw-hab-top b").textContent }; }, CW);
        await shot(p, `a7-low-arrival-dossier.png`, { firefox: true });
        check(lo.idx === L.index && lo.green < 0.05 && lo.shown && /landing region keeps it alive at first\. Adapt before you spread\./.test(lo.text) && lo.pct === `${Math.round(lo.green * 100)}% of the land` && !p.errs.length,
          `[${bn}] A10 · a ${L.challenge} / ${L.species} world where under 5 % of the land suits the plant: the dossier shows the TRUE share and explains it ("…your landing region keeps it alive at first. Adapt before you spread."); every ordinary-arrival dossier above (F3, A5) has no such line`, J(lo));
        await c.close(); }

      // ------------------------------------------------------------------ I · invariants (Dying World) · K · keyboard
      { const c = await context(), p = await page(c);
        await p.goto(`${ORIGIN}/?launch=9&bg=9`); await menuReady(p);
        await openHub(p); await beginChallenge(p, "dying_world");
        // I1 · cancel: a build that is running when the plant changes / the player leaves is cancelled (its worker terminated); then it prepares normally
        const can = await p.evaluate(async () => { const P = MENU_DEV.entry.launch.prep; P.prepare("reed_spire"); const job = P.jobs.get("reed_spire"), running = job.state === "build"; const cancelled = P.cancel();
          return { running, cancelled, state: job.state, jobGone: !P.jobs.has("reed_spire"), cancels: P.stats.cancels }; });
        await chooseSpecies(p, "cinder_rosette"); await worldReady(p);
        const W1 = await p.evaluate(CW => ({ fp: eval(CW).instance.fingerprint, idx: eval(CW).instance.entryIndex, sp: eval(CW).instance.speciesId, launch: eval(CW).instance.launchSeed }), CW);
        check((!can.running || (can.cancelled && can.state === "cancelled" && can.jobGone)) && W1.sp === "cinder_rosette" && W1.launch === 9 && !p.errs.length,
          `[${bn}] I1 · a build in progress is cancelled cleanly when the plant changes or the player leaves (its worker terminated, the job dropped); the chosen plant then prepares normally on the same launch`, J({ can, W1 }));
        const K = await p.evaluate(() => document.activeElement && document.activeElement.tagName + (document.activeElement.closest(".cw-dossier") ? ".dossier" : ""));
        let tabbed = null; for (let i = 0; i < 40 && tabbed !== "begin"; i++) { await p.keyboard.press("Tab"); tabbed = await p.evaluate(() => document.activeElement && document.activeElement.dataset.act); }
        const ring = await p.evaluate(() => { const cs = getComputedStyle(document.activeElement); return cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) >= 2; });
        await p.keyboard.press("Escape"); await speciesReady(p);
        const back = await p.evaluate(SS => ({ state: MENU_DEV.entry.state, sel: eval(SS).selected.id, launch: MENU_DEV.entry.launch.launchSeed }), SS);
        const tSame = Date.now(); await p.evaluate(SS => eval(SS).open("cinder_rosette"), SS); await p.click(".ss-btn.go"); await worldReady(p); const sameMs = Date.now() - tSame;
        const W2 = await p.evaluate(CW => ({ fp: eval(CW).instance.fingerprint, idx: eval(CW).instance.entryIndex }), CW);
        check(K === "H2.dossier" && tabbed === "begin" && ring && back.state === "species" && back.sel === "cinder_rosette" && back.launch === 9 && W2.fp === W1.fp && W2.idx === W1.idx,
          `[${bn}] K1 + I2 · keyboard: focus on the world's heading, Tab reaches Begin challenge (focus ring), Escape is Back → Choose Plant Species (same launch); the same plant again is the SAME bank entry and planet (${sameMs} ms)`, J({ K, tabbed, back, W1, W2 }));
        await p.keyboard.press("Escape"); await speciesReady(p);
        await chooseSpecies(p, "organic_hybrid"); await worldReady(p);
        const W3 = await p.evaluate(CW => { const X = eval(CW).instance; return { fp: X.fingerprint, sp: X.speciesId, launch: X.launchSeed, cell: X.bank.cellKey, idx: X.entryIndex }; }, CW);
        check(W3.sp === "organic_hybrid" && W3.launch === 9 && W3.cell === "dying_world/organic_hybrid",
          `[${bn}] I3 · Change Species (Back → another plant) takes that plant's OWN bank cell on the same launch (no promise that the planet stays the same)`, J(W3));
        await shot(p, "05b-dossier-organic_hybrid.png");
        await beginRun(p, 1);
        const R1 = await runId(p); await p.evaluate(() => { window.__sim1 = BLOOM_APP.session.sim; window.__session1 = BLOOM_APP.session; BLOOM_API.advance(120); });
        await winNow(p); await reportOpen(p); await p.click('#rrActs [data-act="retryChallenge"]'); await runReady(p, 2);
        const R2 = await runId(p), fresh = await p.evaluate(() => ({ newSim: BLOOM_APP.session.sim !== window.__sim1, newSession: BLOOM_APP.session !== window.__session1, ticks: BLOOM_APP.session.sim.ticks, won: BLOOM_APP.session.sim.won }));
        check(R1.planetSame && R2.planetSame && R2.speciesSame && R2.challengeSame && R2.fp === R1.fp && R2.entryIndex === R1.entryIndex && R2.cr.entryIndex === R1.entryIndex && R2.cr.cellKey === R1.cr.cellKey && R2.launchSeed === 9
            && R2.simScenario === "dying_world" && fresh.newSim && fresh.newSession && fresh.ticks < 5 && !fresh.won,
          `[${bn}] I4 · RETRY CHALLENGE: the same bank cell, entry, planet object and fingerprint, species, Challenge, scenario — a fresh session and simulation`, J({ entry: R2.entryIndex, fp: R2.fp, fresh }));
        await shot(p, "08-retry-same-world.png");
        await winNow(p); await reportOpen(p); await p.click('#rrActs [data-act="challenges"]'); await hubReady(p);
        const H = await p.evaluate(H => ({ state: MENU_DEV.entry.state, sel: eval(H).selected.id, launch: MENU_DEV.entry.launch, recent: [...MENU_DEV.entry.recent].map(([k, v]) => [k, v]) }), HUB);
        await shot(p, "09-back-to-hub.png");
        await p.click(".ch-btn.go"); await speciesReady(p);
        const L2 = await p.evaluate(() => MENU_DEV.entry.launch.launchSeed);
        await chooseSpecies(p, "organic_hybrid"); await worldReady(p);
        const W4 = await p.evaluate(CW => ({ fp: eval(CW).instance.fingerprint, idx: eval(CW).instance.entryIndex, launch: eval(CW).instance.launchSeed }), CW);
        check(H.state === "challenges" && H.sel === "dying_world" && H.launch === null && J(H.recent) === J([["dying_world/organic_hybrid", [R1.entryIndex]]]) && L2 !== 9 && W4.launch === L2 && W4.idx !== R1.entryIndex,
          `[${bn}] I5 · CHALLENGES → the hub; BEGIN CHALLENGE again is a NEW launch (seed ${L2}) and takes ANOTHER bank entry — the entry just played is avoided for this session (kept in memory only)`, J({ H, W4, played: R1.entryIndex }));
        await shot(p, "09b-new-launch-dossier.png");
        if (EVIDENCE) {   // evidence only: PREPARING is normally skipped (the world is built while the player reads), so a QA-slowed build shows its copy
          await p.keyboard.press("Escape"); await speciesReady(p);
          await p.evaluate(() => { const L = MENU_DEV.entry.launch.prep, f = L._viaWorker.bind(L); L._viaWorker = (j, r) => new Promise(res => setTimeout(res, 6000)).then(() => f(j, r)); });
          await p.evaluate(SS => eval(SS).open("reed_spire"), SS); await p.click(".ss-btn.go");
          await p.waitForFunction(() => { const v = MENU_DEV.entry.worldView; return v && v.inner && v.inner.state === "preparing" && MENU_DEV.entry.black.style.display === "none"; }, null, { timeout: 20000, polling: 50 });
          await shot(p, "04-preparing-slowed.png", { firefox: true, wait: 400 }); await worldReady(p);
        }
        await p.keyboard.press("Escape"); await speciesReady(p); await p.keyboard.press("Escape"); await hubReady(p); await p.click('.ch-head [data-act="back"]'); await menuReady(p);
        const MM = await p.evaluate(() => ({ ch: MENU_DEV.entry.challenge, launch: MENU_DEV.entry.launch, app: BLOOM_APP.challenge, cr: BLOOM_APP.challengeRun }));
        await p.click('.mm-item[data-act="begin"]'); await speciesReady(p);
        await p.evaluate(SS => eval(SS).open("woolly_candle"), SS);
        const EK = await p.evaluate(() => ({ kicker: document.querySelector(".ss-kicker").textContent, go: document.querySelector(".ss-go-l").textContent, launch: MENU_DEV.entry.launch }));
        await p.click(".ss-btn.go"); await surveyReady(p);
        const ES = await p.evaluate(() => { const s = MENU_DEV.entry.survey; return { cells: s.cells.length, classes: [...new Set(s.cells.map(c => c.classId))].sort(), prov: s.cells.every(c => !("scenarioId" in c)), kicker: document.querySelector(".ds-kicker").textContent }; });
        await p.evaluate(() => MENU_DEV.entry.survey.select(0)); await p.waitForFunction(() => MENU_DEV.entry.survey.state === "focus", null, { timeout: 20000, polling: 50 });
        const HZ = await p.evaluate(() => ({ h3: document.querySelector(".ds-challenges h3").textContent, label: document.querySelector(".ds-btn.go").innerText.trim() }));
        await shot(p, "10-expedition-survey-expected-hazards.png", { firefox: true });
        await p.click(".ds-btn.go"); await runReady(p, 3);
        const ER = await runId(p); await winNow(p); await reportOpen(p); const EF = await reportFacts(p);
        check(MM.ch === null && MM.launch === null && MM.app === null && MM.cr === null && EK.kicker === "Expedition" && /^Survey for /.test(EK.go) && EK.launch === null && ES.cells === 9 && J(ES.classes) === J(["extreme", "favorable", "precarious"])
            && ES.prov && ES.kicker === "Strange Bloom" && HZ.h3 === "Expected hazards" && HZ.label === "Begin expedition" && ER.challenge === null && ER.scenario === null && ER.cr === null && ER.expedition
            && !/Challenge/.test(ER.hud + ER.footer) && J(EF.facts.find(x => x[0] === "Scenario")) === J(["Scenario", "None"]) && J(EF.acts) === J(["keepPlaying", "playAgain", "choosePlanet", "mainMenu"]) && EF.identity.challengeRun === null,
          `[${bn}] I6 · MAIN MENU clears the Challenge; EXPEDITION stays LIVE procedural — its 3 × 3 Destination Survey (EXPECTED HAZARDS, Begin expedition), no bank, no Challenge residue (default scenario, "Scenario · None", Play again · Choose another planet · Main menu)`,
          J({ MM, EK: EK.kicker, ES, HZ }));
        await p.click('#rrActs [data-act="mainMenu"]'); await menuReady(p);
        await p.click('.mm-item[data-act="training"]');
        await p.waitForFunction(() => window.BLOOM_APP && BLOOM_APP.session && BLOOM_APP.session.run.training && BLOOM_APP.stats.sessions.at(-1).readyMs !== null, null, { timeout: 60000, polling: 50 });
        await p.waitForTimeout(800);
        const TR = await p.evaluate(() => { const S = BLOOM_APP.session, M = S.adapter.run().mechanics; return { mech: !M.pressure && !M.competition && !M.climate, training: !!S.run.training, species: S.run.species.id, scenario: S.run.scenario, challenge: S.run.challenge || null, cr: S.run.challengeRun || null, start: S.sim.startingState }; });
        check(TR.training && TR.species === "organic_hybrid" && TR.scenario === null && TR.challenge === null && TR.cr === null && TR.start === null && TR.mech, `[${bn}] I7 · TRAINING unchanged: Organic Hybrid, the default scenario, no Challenge`, J(TR));
        check(!p.errs.length, `[${bn}] I8 · no console / page error through the invariant walk`, p.errs.join(" | ") || "clean");
        await c.close(); }

      // ------------------------------------------------------------------ X · QA fixtures (their bank cells built in Node by the builder library)
      { const c = await context(), p = await page(c);
        await p.goto(`${ORIGIN}/?bg=4`); await menuReady(p); await openHub(p);
        await p.evaluate(cells => { BLOOM_DATA.challengeSeedBankFixtures = cells; }, FIXTURE_CELLS);
        const hubIds = await p.evaluate(() => [...document.querySelectorAll(".ch-card")].map(x => x.dataset.challenge));
        await p.evaluate(fx => { const ch = BLOOM.challenges.fixture(fx); MENU_DEV.entry.nextLaunchSeed = 7; window.__speciesOpened = MENU_DEV.events.filter(e => e.type === "species-screen").length; MENU_DEV.entry._challengeChosen(ch); }, FX_PRESCRIBED);
        await worldReady(p);
        const XP = await p.evaluate(CW => { const v = eval(CW), r = v.root; return { species: v.instance.speciesId, policy: v.instance.speciesPolicy, note: (r.querySelector(".cw-sp-note") || {}).textContent || null, sp: r.querySelector(".cw-sp-name").textContent,
          speciesScreen: MENU_DEV.events.filter(e => e.type === "species-screen").length !== window.__speciesOpened, fx: v.instance.challengeId, cell: v.instance.bank.cellKey }; }, CW);
        await shot(p, "11-fixture-prescribed-species.png");
        await p.keyboard.press("Escape"); await hubReady(p);
        const XB = await p.evaluate(() => ({ state: MENU_DEV.entry.state, launch: MENU_DEV.entry.launch, ch: MENU_DEV.entry.challenge }));
        check(!hubIds.includes("qa_prescribed_reed") && XP.fx === "qa_prescribed_reed" && XP.species === "reed_spire" && XP.policy === "prescribed" && XP.sp === "Reed Spire" && /prescribes the plant/.test(XP.note || "") && !XP.speciesScreen
            && XP.cell === "qa_prescribed_reed/reed_spire" && XB.state === "challenges" && XB.launch === null && XB.ch === null,
          `[${bn}] X1 · a PRESCRIBED-species Challenge (QA fixture with its own bank cell, never on the hub) skips Choose Plant Species: BEGIN CHALLENGE → the dossier names the prescribed plant; Back returns to the hub`, J({ XP, XB }));
        await p.evaluate(fx => { const ch = BLOOM.challenges.fixture(fx); MENU_DEV.entry.nextLaunchSeed = 4242; MENU_DEV.entry._challengeChosen(ch); }, FX_START);
        await worldReady(p);
        const XS = await p.evaluate(CW => ({ start: eval(CW).root.querySelector(".cw-start").textContent }), CW);
        await shot(p, "12-fixture-starting-state.png");
        await p.click(".cw-btn.go");
        await p.waitForFunction(() => window.BLOOM_APP && BLOOM_APP.session && BLOOM_APP.stats.sessions.at(-1).readyMs !== null && !document.querySelector(".atx") && MENU_DEV.entry.black.style.display === "none", null, { timeout: 120000, polling: 50 });
        const RS = await p.evaluate(() => { const S = BLOOM_APP.session.sim; return { genome: { cold: S.genome.cold, salt: S.genome.salt }, start: S.startingState, spent: S.spent.global, cr: BLOOM_APP.session.run.challengeRun.startingState }; });
        await winNow(p); await reportOpen(p); const RG = await reportFacts(p);
        await shot(p, "12b-fixture-starting-state-report.png");
        check(/Cold Tolerance · Salt Handling · 250 Biomass \(given by the Challenge\)/.test(XS.start) && RS.genome.cold === 1 && RS.genome.salt === 1 && RS.start.biomass === 250 && RS.spent === 0
            && J(RS.cr) === J({ adaptations: ["cold", "salt"], biomass: 250, source: "challenge" }) && J(RG.identity.startingState) === J({ adaptations: ["cold", "salt"], names: ["Cold Tolerance", "Salt Handling"], biomass: 250, source: "challenge" })
            && /Given by the Challenge at landing: Cold Tolerance · Salt Handling · 250 Biomass/.test(RG.given || ""),
          `[${bn}] X2 · a PRESCRIBED STARTING STATE (QA fixture, its bank proven from that start): the dossier says what the plant lands with; the run starts with Cold Tolerance + Salt Handling owned and exactly 250 Biomass, nothing spent; the report says the Challenge gave it`,
          J({ XS: XS.start, RS, given: RG.given }));
        check(!p.errs.length, `[${bn}] X3 · no console / page error through the fixtures`, p.errs.join(" | ") || "clean");
        await c.close(); }

      // ------------------------------------------------------------------ P · file:// offline · B · /bloom/
      for (const [tag, url, offline] of [["P1 · file:// offline (a double-clicked index.html, the network off)", `${FILE_INDEX}?launch=2`, true], ["B1 · HTTP /bloom/ (the static Pages site under a project subpath)", `${ORIGIN}/bloom/?launch=2`, false]]) {
        const c = await context({ offline }), p = await page(c);
        await p.goto(url); await menuReady(p); await openHub(p); await beginChallenge(p, "native_competition"); await chooseSpecies(p, "cinder_rosette"); await worldReady(p);
        const W = await p.evaluate(CW => ({ fp: eval(CW).instance.fingerprint, cell: eval(CW).instance.bank.cellKey, bank: !!(BLOOM_DATA.challengeSeedBanks && BLOOM_DATA.challengeSeedBanks.cells["native_competition/cinder_rosette"]) }), CW);
        await beginRun(p, 1);
        const R = await runId(p), where = await p.evaluate(() => ({ path: location.pathname, protocol: location.protocol, portable: !!window.BLOOM_PORTABLE }));
        const outside = offline ? p.reqs.filter(u => !u.startsWith("file:") && !u.startsWith("blob:") && !u.startsWith("data:")) : p.reqs.filter(u => !u.startsWith(`${ORIGIN}/bloom/`) && !u.startsWith("blob:") && !u.startsWith("data:"));
        const bankReq = p.reqs.filter(u => /challenge-seed-banks\.js/.test(u));
        const counted = !offline || p.reqs.some(u => u.startsWith("file:"));   // Firefox reports no request events for file:// (the data's presence is W.bank)
        check(W.bank && W.cell === "native_competition/cinder_rosette" && R.planetSame && R.fp === W.fp && R.challenge === "native_competition" && R.simSpecies === "cinder_rosette" && R.launchSeed === 2 && !outside.length && (counted ? bankReq.length === 1 : !bankReq.length) && p.navs === 1 && !p.errs.length
            && (offline ? where.protocol === "file:" && where.portable : where.path === "/bloom/"),
          `[${bn}] ${tag}: the bank data ships with the game (content/challenge-seed-banks.js, loaded once from the site) and a complete Native Competition launch works (species → the dossier → the exact bank planet in the run), one document, no request outside ${offline ? "the local files" : "/bloom/"}`,
          `${where.protocol}${where.path} · ${W.fp} · bank requests ${counted ? bankReq.length : "not reported for file:// by this browser"} · outside ${outside.length}${p.errs.length ? " · " + p.errs.join(" | ") : ""}`);
        await c.close();
      }
    } catch (e) { check(false, `[${bn}] uncaught`, e.stack || String(e)); }
    await browser.close();
  }
  srv.close();
}
