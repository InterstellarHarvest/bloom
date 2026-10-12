// BLOOM — build the Challenge SEED BANKS (BLOOM-036B1, offline / development side; the game never runs this).
//
//   node tools/build-challenge-seed-bank.mjs [--per-archetype 160] [--workers 12] [--target 50] [--reuse] [--provisional N] [--check]
//
// 1. EVALUATE: the species- and Challenge-free candidate pool (tools/challenge-bank-builder.mjs candidatePool — archetype-stratified World
//    Seeds) through the full validation of every released Challenge × species (challenge-bank-builder.mjs evaluateWorld: physical validation,
//    species S2, the recipe, the scenario's FULL layer P with every confirmation run, Challenge quality). Parallel (worker_threads); every
//    world is evaluated once and its record cached in docs/evidence/bloom-036b/seed-bank/candidates.json together with the INPUT fingerprint
//    of the rules it was evaluated under — `--reuse` skips worlds whose record matches the current inputs (a changed rule re-evaluates all).
// 2. CURATE: per cell, the deterministic diversity selection (curateCell) of `--target` entries from the passing candidates. A cell with fewer
//    passing candidates than the target FAILS the build (exit 2) and is reported — never silently smaller — unless `--provisional N` is
//    given for an engineering-only review build (cells ≥ N are written and the bank is marked provisional).
// 3. WRITE: content/challenge-seed-banks.js (generated; deterministic bytes: no timestamp, sorted cells) and the evidence
//    docs/evidence/bloom-036b/seed-bank/{BUILD_REPORT.md, build.json}. `--check` rebuilds in memory from the cached candidates and exits 1
//    if the shipped bank differs (the determinism / staleness gate).
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { Worker, isMainThread, parentPort } from "node:worker_threads";
import { ROOT, loadEngine, modules, candidatePool, evaluateWorld, curateCell, cellOf, writeJson, POOL_STREAM } from "./challenge-bank-builder.mjs";

const BANK_FILE = path.join(ROOT, "content/challenge-seed-banks.js"), EVD = path.join(ROOT, "docs/evidence/bloom-036b/seed-bank");
const CAND_FILE = path.join(EVD, "candidates.json");

if (!isMainThread) {
  const { BLOOM, D } = loadEngine(), { SD } = await modules();
  parentPort.on("message", task => { try { parentPort.postMessage({ ok: true, row: evaluateWorld(task, { BLOOM, D, SD }) }); } catch (e) { parentPort.postMessage({ ok: false, error: String(e && e.stack || e), task }); } });
} else {
  const argv = process.argv.slice(2), opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; }, has = k => argv.includes(k);
  const PER = +opt("--per-archetype", "160"), NW = +opt("--workers", String(Math.max(1, Math.min(12, os.cpus().length - 2)))), TARGET = +opt("--target", "50");
  const PROV = opt("--provisional", null) == null ? null : +opt("--provisional", null), CHECK = has("--check"), REUSE = has("--reuse") || CHECK;
  const { BLOOM, D } = loadEngine(), { CB } = await modules();
  const CH = BLOOM.challenges.list(), SP = BLOOM.species.ids();
  // the inputs a candidate record depends on: every cell's provenance (rules, scenario, recipe, physiology, world generation, validator)
  const inputs = Object.fromEntries(CH.flatMap(ch => SP.map(sp => [`${ch.id}/${sp}`, CB.cellProvenance(ch, sp)])));
  const inputsFp = crypto.createHash("sha256").update(JSON.stringify(inputs)).digest("hex").slice(0, 16);
  const pool = candidatePool(D, PER);
  let cached = [];
  if (REUSE && fs.existsSync(CAND_FILE)) { const C = JSON.parse(fs.readFileSync(CAND_FILE, "utf8")); if (C.inputsFingerprint === inputsFp) cached = C.rows; else console.log(`candidate cache is STALE (${C.inputsFingerprint} ≠ ${inputsFp}): re-evaluating`); }
  const have = new Map(cached.map(r => [`${r.archetypeId}:${r.seed}`, r])), todo = pool.filter(t => !have.has(`${t.archetypeId}:${t.seed}`));
  if (CHECK && todo.length) { console.error(`--check: ${todo.length} pool worlds have no current candidate record`); process.exit(1); }
  console.log(`challenge seed bank: pool ${pool.length} worlds (${D.archetypes.length} archetypes × ${PER}) × ${CH.length} Challenges × ${SP.length} species · ${todo.length} to evaluate (${pool.length - todo.length} cached) · ${NW} workers`);
  const t0 = Date.now();
  if (todo.length) await new Promise((resolve, reject) => { let next = 0, done = 0, live = 0;
    for (let k = 0; k < Math.min(NW, todo.length); k++) { const w = new Worker(fileURLToPath(import.meta.url)); live++;
      const feed = () => { if (next >= todo.length) { w.terminate(); return; } w.postMessage(todo[next++]); };
      w.on("message", m => { if (!m.ok) { reject(new Error(`evaluate ${m.task.archetypeId}:${m.task.seed}: ${m.error}`)); return; }
        have.set(`${m.row.archetypeId}:${m.row.seed}`, m.row); done++;
        if (done % 20 === 0 || done === todo.length) { console.log(`  ${done}/${todo.length}  ${Math.round((Date.now() - t0) / 1000)} s`);
          writeJson(CAND_FILE, { format: "bloom-challenge-bank-candidates@1", inputsFingerprint: inputsFp, poolStream: POOL_STREAM, rows: [...have.values()] }); }   // resumable
        feed(); });
      w.on("error", reject); w.on("exit", () => { if (--live === 0) resolve(); }); feed(); } });
  const rows = pool.map(t => have.get(`${t.archetypeId}:${t.seed}`));
  if (!CHECK) writeJson(CAND_FILE, { format: "bloom-challenge-bank-candidates@1", inputsFingerprint: inputsFp, poolStream: POOL_STREAM, perArchetype: PER, rows });
  // 2. curate every cell
  const cells = {}, report = {}, short = [];
  for (const ch of CH) for (const sp of SP) {
    const key = `${ch.id}/${sp}`, cur = curateCell(rows, key, TARGET), stages = {};
    for (const r of rows) { const c = r.cells && r.cells[key]; const st = !r.physical ? "physical" : c ? c.stage : "none"; stages[st] = (stages[st] || 0) + 1; }
    const arch = {}, cls = {}; for (const k of cur.kept) { arch[k.row.archetypeId] = (arch[k.row.archetypeId] || 0) + 1; cls[k.c.classId] = (cls[k.c.classId] || 0) + 1; }
    const passArch = {}; for (const r of rows) { const c = r.cells && r.cells[key]; if (c && c.stage === "ok") passArch[r.archetypeId] = (passArch[r.archetypeId] || 0) + 1; }
    const ms = { physical: 0, species: 0, proof: 0 }; for (const r of rows) { const c = r.cells && r.cells[key]; if (c) { ms.species += c.speciesMs || 0; ms.proof += (c.proof && c.proof.ms) || 0; } }
    report[key] = { evaluated: rows.length, stages, passing: cur.passing, qualifyingPct: +(100 * cur.passing / rows.length).toFixed(1), retained: cur.kept.length, deprioritized: cur.deprioritized,
      passingByArchetype: passArch, retainedByArchetype: arch, retainedByClass: cls, minPairDistance: cur.minPairDistance, cpuSeconds: { species: Math.round(ms.species / 1000), proof: Math.round(ms.proof / 1000) },
      proof: { simulations: sum(cur.kept.map(k => k.c.proof.simulations)), confirmations: sum(cur.kept.map(k => k.c.proof.confirmations)), allPass: cur.kept.every(k => k.c.proof.status === "PASS") } };
    if (cur.kept.length < TARGET) short.push(`${key}: ${cur.kept.length} / ${TARGET} (passing ${cur.passing} of ${rows.length})`);
    if (cur.kept.length >= Math.min(TARGET, PROV || TARGET)) cells[key] = cellOf(ch, sp, cur, rows.length, 1, CB);
  }
  if (short.length && PROV == null) { console.error("LIMITING CELL(S) — fewer passing candidates than the target:\n  " + short.join("\n  ")); process.exitCode = 2; }
  // 3. write
  const bank = { format: CB.BANK_FORMAT, bankVersion: 1, provisional: short.length ? true : false, generator: "tools/build-challenge-seed-bank.mjs", poolStream: POOL_STREAM, perArchetype: PER, target: TARGET,
    inputsFingerprint: inputsFp, cells: Object.fromEntries(Object.keys(cells).sort().map(k => [k, cells[k]])) };
  const src = `// GENERATED by tools/build-challenge-seed-bank.mjs — DO NOT EDIT BY HAND (rebuild instead). docs/CHALLENGES_SYSTEM_v1.md §4.
// Challenge SEED BANKS (BLOOM-036B1): for every released Challenge × species, procedural worlds PROVEN OFFLINE (physical validation, species S2,
// the Challenge recipe, the scenario's full layer P with every confirmation run) and curated for variety. Seeds + proof provenance only — no
// map geometry: the runtime (resources/challenges/challenge-bank.js) regenerates each exact planet from (archetype, World Seed, attempt) and
// verifies its fingerprint. Every cell carries the provenance it was built against; a changed rule makes it STALE (refused, never reused).
(function (root) {
  "use strict";
  const D = root.BLOOM_DATA || (root.BLOOM_DATA = { planets: {} });
  D.challengeSeedBanks = ${JSON.stringify(bank)};
})(typeof window !== "undefined" ? window : globalThis);
`;
  const sha = crypto.createHash("sha256").update(src).digest("hex");
  if (CHECK) { const cur = fs.existsSync(BANK_FILE) ? fs.readFileSync(BANK_FILE, "utf8") : ""; const same = cur === src;
    console.log(same ? `--check: the shipped bank is exactly the build from the cached candidates (sha256 ${sha.slice(0, 16)})` : "--check: the shipped bank DIFFERS from a rebuild"); process.exit(same ? 0 : 1); }
  fs.writeFileSync(BANK_FILE, src);
  let head = null; try { head = execSync("git rev-parse --short HEAD", { cwd: ROOT, encoding: "utf8" }).trim(); } catch { /* not a repo */ }
  const build = { builtAt: new Date().toISOString(), gitHead: head, wallSeconds: Math.round((Date.now() - t0) / 1000), workers: NW, hardwareThreads: os.cpus().length, pool: { perArchetype: PER, worlds: pool.length, stream: POOL_STREAM,
    physicalOk: rows.filter(r => r.physical).length }, target: TARGET, provisional: bank.provisional, limitingCells: short, inputsFingerprint: inputsFp, bankSha256: sha, bankBytes: Buffer.byteLength(src), cells: report };
  writeJson(path.join(EVD, "build.json"), build);
  console.log(`wrote ${path.relative(ROOT, BANK_FILE)} (${build.bankBytes} B, sha256 ${sha.slice(0, 16)}) · ${Object.keys(cells).length} cells`);
  for (const [k, r] of Object.entries(report)) console.log(`  ${k.padEnd(36)} passing ${String(r.passing).padStart(3)}/${r.evaluated} (${r.qualifyingPct}%) retained ${r.retained} ${JSON.stringify(r.retainedByArchetype)}`);
}
function sum(xs) { return xs.reduce((a, b) => a + (b || 0), 0); }
