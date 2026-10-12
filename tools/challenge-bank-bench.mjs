// BLOOM — Challenge seed-bank BUILDER throughput benchmark (BLOOM-036B1, tooling performance only): the same pool worlds evaluated with
// different worker counts — the builder's offline cost, not anything a player runs.
//   node tools/challenge-bank-bench.mjs [--worlds 16] [--pools 8,12,15] [--out docs/evidence/bloom-036b/seed-bank/builder-pool-bench.json]
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Worker, isMainThread, parentPort } from "node:worker_threads";
import { ROOT, loadEngine, modules, candidatePool, evaluateWorld, writeJson } from "./challenge-bank-builder.mjs";
if (!isMainThread) {
  const { BLOOM, D } = loadEngine(), { SD } = await modules();
  parentPort.on("message", t => parentPort.postMessage(evaluateWorld(t, { BLOOM, D, SD })));
} else {
  const argv = process.argv.slice(2), opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
  const N = +opt("--worlds", "16"), POOLS = opt("--pools", "8,12,15").split(",").map(Number), OUT = path.resolve(ROOT, opt("--out", "docs/evidence/bloom-036b/seed-bank/builder-pool-bench.json"));
  const { D } = loadEngine(), all = candidatePool(D, 160), tasks = [];
  for (let i = 0; tasks.length < N; i++) tasks.push(all[(i * 37) % all.length]);   // a spread of the real pool (every archetype)
  const res = [];
  for (const W of POOLS) { const t0 = Date.now(); let next = 0, cpu = 0;
    await new Promise(resolve => { let live = 0; for (let k = 0; k < Math.min(W, N); k++) { const w = new Worker(fileURLToPath(import.meta.url)); live++;
      const feed = () => { if (next >= N) { w.terminate(); return; } w.postMessage(tasks[next++]); };
      w.on("message", row => { cpu += row.ms; feed(); }); w.on("exit", () => { if (--live === 0) resolve(); }); feed(); } });
    const wall = Date.now() - t0; res.push({ workers: W, wallSeconds: +(wall / 1000).toFixed(1), worldsPerMinute: +(N / (wall / 60000)).toFixed(2), meanWorldSeconds: +(cpu / N / 1000).toFixed(1) });
    console.log(JSON.stringify(res.at(-1))); }
  writeJson(OUT, { tool: "tools/challenge-bank-bench.mjs", hardwareThreads: os.cpus().length, worlds: N, results: res });
}
