// BLOOM-038 design audit — STAND-OFF ESCAPE probe (Native Competition / Oasis Line). Research only.
//   node tools/research/design-audit/escape.mjs   (needs <scratch>/rows.jsonl) → <scratch>/escape.json
// For every Challenge run with natives that ended in a TIMEOUT (a stand-off: no Bloom, no extinction), replay the same deterministic research
// run to its plateau (the moment its last purchase was made + 120 s), then branch: with Biomass topped up, buy ONE legal trait (or the same
// Terraform step twice) and simulate 600 s more. Does any single visible move break the stand-off (Bloom, or ≥ +5 coverage points)? And did
// the preview the player sees at the plateau (runner.mjs value model) rate that move as helpful?
import fs from "node:fs";
import path from "node:path";
import { engine, ROOT } from "./engine.mjs";
import { run } from "./runner.mjs";
const SCRATCH = process.env.BLOOM038_SCRATCH || path.join(ROOT, ".design-audit-scratch");
const E = await engine(), { BLOOM, D, CB } = E, TPS = 1000 / D.config.tickMs;
const rows = fs.readFileSync(path.join(SCRATCH, "rows.jsonl"), "utf8").split("\n").filter(Boolean).map(l => JSON.parse(l))
  .filter(r => r.kind === "challenge" && r.competition && r.outcome === "timeout" && (r.policy === "balanced" || r.policy === "greedy"));
const out = [];
for (const r of rows.slice(0, +(process.argv[2] || 40))) {
  const ch = BLOOM.challenges.resolve(r.challengeId), sp = BLOOM.species.resolve(r.speciesId), P = CB.buildBankWorld(CB.bankCell(ch, sp).entries[r.entry], E).planet;
  const last = r.purchases.length ? r.purchases[r.purchases.length - 1].t : 0, T = Math.min(3000, last + 120);
  const base = () => run({ planet: P, speciesId: r.speciesId, scenario: BLOOM.challenges.scenarioOf(ch), challenge: ch, startingState: BLOOM.challenges.startingStateOf(ch), policy: r.policy, runSeed: r.runSeed, capSeconds: T, keepSim: true }, E);
  const b0 = base(), cov0 = b0.sim.coverage();
  // control: no purchase
  const ctl = b0.sim; for (let k = 0; k < 600 * TPS && !ctl.won; k++) ctl.tick();
  const res = { challenge: r.challengeId, species: r.speciesId, entry: r.entry, policy: r.policy, plateauAt: T, plateauCov: +(cov0 * 100).toFixed(1), control: +(ctl.coverage() * 100).toFixed(1), escapes: [], tried: 0 };
  for (const t of D.traits) for (const times of t.effect.type === "sky" ? [1, 2] : [1]) {
    const b = base(), sim = b.sim; if (!sim.offered(t)) continue; let ok = true;
    for (let n = 0; n < times; n++) { sim.biomass = 1e6; if (!sim.buy(t.id)) ok = false; } if (!ok) continue; res.tried++;
    for (let k = 0; k < 600 * TPS && !sim.won; k++) sim.tick();
    const c = sim.coverage() * 100; if (sim.won || c >= res.control + 5) res.escapes.push({ trait: t.id, times, won: !!sim.won, cov: +c.toFixed(1) });
  }
  out.push(res); console.log(JSON.stringify(res));
}
const S = { runs: out.length, escapable: out.filter(x => x.escapes.length).length, controlRecovered: out.filter(x => x.control >= 70).length,
  escapeTraits: out.flatMap(x => x.escapes.map(e => e.trait + (e.times > 1 ? "×2" : ""))).reduce((m, k) => (m[k] = (m[k] || 0) + 1, m), {}) };
fs.writeFileSync(path.join(SCRATCH, "escape.json"), JSON.stringify({ format: "bloom-038-standoff-escape@1", summary: S, rows: out }, null, 1));
console.log(JSON.stringify(S));
