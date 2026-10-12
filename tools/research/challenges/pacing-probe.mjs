// BLOOM-036C — PACING PROBE (read-only): which pacing bound refused a concept world? The seed-bank builder stores a layer-P reason cut to 140
// characters, which hides the bound for start-state concepts. This re-runs layer P on a deterministic sample of the refused worlds of a study
// row file and records the slow witnesses' real pacing (first purchase, largest purchase gap, margin time) next to the scenario's bands.
//
//   node tools/research/challenges/pacing-probe.mjs [--concepts windfall,empty_hold,pioneer_rush] [--per-cell 4] [--workers 12]
//        → docs/evidence/bloom-036c/pacing-probe.json
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Worker, isMainThread, parentPort } from "node:worker_threads";
import { ROOT, loadEngine, modules } from "../../challenge-bank-builder.mjs";
import { CONCEPTS } from "./concepts.mjs";

if (!isMainThread) {
  const { BLOOM, D } = loadEngine(), { SD } = await modules();
  parentPort.on("message", t => { try {
    const c = CONCEPTS.find(x => x.id === t.concept), ch = BLOOM.challenges.fixture(c.def), S = BLOOM.challenges.scenarioOf(ch), st = BLOOM.challenges.startingStateOf(ch);
    const P = SD.physicalCandidate({ archetypeId: t.archetypeId, seed: t.seed }).planet, sp = BLOOM.species.resolve(t.species);
    const v = BLOOM.validateScenario(P, D.config, D.traits, S, { archetypeId: t.archetypeId, species: sp, ...(st ? { startingState: st } : {}) });
    const w = [...(v.strategies || []), ...(v.slow || [])].map(x => ({ signature: x.signature, marginSeconds: +x.marginSeconds.toFixed(1), firstPurchaseSeconds: x.pacing && +x.pacing.firstPurchaseSeconds.toFixed(1),
      maxGapSeconds: x.pacing && +x.pacing.maxPurchaseGapSeconds.toFixed(1), pacing: x.pacingCheck ? x.pacingCheck.reasons : null }));
    parentPort.postMessage({ ok: true, row: { ...t, status: v.status, reason: v.reason, witnesses: w } }); }
    catch (e) { parentPort.postMessage({ ok: false, error: String(e && e.stack || e), t }); } });
} else {
  const argv = process.argv.slice(2), opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
  const list = opt("--concepts", "windfall,empty_hold,pioneer_rush").split(","), PER = +opt("--per-cell", "4"), NW = +opt("--workers", "12");
  const tasks = [];
  for (const id of list) { const rows = fs.readFileSync(path.join(ROOT, `docs/evidence/bloom-036c/study-rows/${id}.jsonl`), "utf8").split("\n").filter(Boolean).map(l => JSON.parse(l));
    const by = {}; for (const r of rows) for (const [k, c] of Object.entries(r.cells || {})) if (c.stage === "scenario") (by[k] = by[k] || []).push({ concept: id, archetypeId: r.archetypeId, seed: r.seed, species: k.split("/")[1] });
    for (const k of Object.keys(by).sort()) tasks.push(...by[k].slice(0, PER)); }
  const out = [];
  await new Promise((resolve, reject) => { let next = 0, live = 0;
    for (let k = 0; k < Math.min(NW, tasks.length); k++) { const w = new Worker(fileURLToPath(import.meta.url)); live++;
      const feed = () => { if (next >= tasks.length) { w.terminate(); return; } w.postMessage(tasks[next++]); };
      w.on("message", m => { if (m.ok) out.push(m.row); else console.error(m.error); feed(); }); w.on("error", reject); w.on("exit", () => { if (--live === 0) resolve(); }); feed(); } });
  out.sort((a, b) => a.concept.localeCompare(b.concept) || a.species.localeCompare(b.species) || a.archetypeId.localeCompare(b.archetypeId) || a.seed - b.seed);
  const bound = r => { const s = r.witnesses.flatMap(w => w.pacing || []).join(" | ") || r.reason || ""; return /first purchase/.test(s) ? "first purchase > 60 s" : /too fast/.test(s) ? "margin < 240 s (won too fast)" : /gap/.test(s) ? "purchase gap > 120 s" : /too slow/.test(s) ? "margin > 900 s" : "no pacing witness (cannot win / hold)"; };
  const summary = {}; for (const r of out) { const k = r.concept; summary[k] = summary[k] || {}; const b = bound(r); summary[k][b] = (summary[k][b] || 0) + 1; r.bound = b; }
  fs.writeFileSync(path.join(ROOT, "docs/evidence/bloom-036c/pacing-probe.json"), JSON.stringify({ format: "bloom-036c-pacing-probe@1", perCell: PER, summary, rows: out }, null, 1) + "\n");
  console.log(JSON.stringify(summary, null, 1));
}
