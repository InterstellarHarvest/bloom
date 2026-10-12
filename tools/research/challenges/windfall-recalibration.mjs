// BLOOM-036C1 — focused WINDFALL RECALIBRATION (read-only analysis). docs/evidence/bloom-036c1/windfall-recalibration.{json,md}.
//
//   node tools/research/challenges/content-study.mjs --concepts windfall_200,windfall_225,windfall_250,vc_released_diag   (the proofs)
//   node tools/research/challenges/windfall-recalibration.mjs                                                           (this report)
//
// Every setting is Volatile Climate · player choice · every archetype · no owned adaptations · N starting Biomass, proven with the seed-bank
// builder's full offline Challenge proof on the SAME World Seeds (the first 40 per archetype of the released pool) as the studied 400-Biomass
// Windfall (036C) and the released Volatile Climate (the shipped bank's candidate records = an exact same-world baseline). Strategy diagnostics
// (≤ 3 distinct winning strategies) on the first 10 qualifying-eligible worlds per archetype; the released start's diagnostics are the
// vc_released_diag concept (same proof as the shipped records). Refusal bounds come from the FULL layer-P reason (content-study.mjs reasonFull);
// the 036C 400-Biomass rows predate it, so its "too fast" count is the 036C pacing probe's (16 / 16 sampled refusals) applied as stated there.
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "../../challenge-bank-builder.mjs";

const ROWS = path.join(ROOT, "docs/evidence/bloom-036c/study-rows"), OUT = path.join(ROOT, "docs/evidence/bloom-036c1");
const SPECIES = ["organic_hybrid", "cinder_rosette", "woolly_candle", "reed_spire"], ARCH = ["ocean_archipelago", "desert_world", "frozen_world"];
const read = id => { const f = path.join(ROWS, `${id}.jsonl`); return fs.existsSync(f) ? fs.readFileSync(f, "utf8").split("\n").filter(Boolean).map(l => JSON.parse(l)) : []; };
const CAND = JSON.parse(fs.readFileSync(path.join(ROOT, "docs/evidence/bloom-036b/seed-bank/candidates.json"), "utf8"));
const base = new Map(CAND.rows.map(r => [`${r.archetypeId}:${r.seed}`, r]));
const q = (xs, p) => { xs = xs.filter(x => x != null && Number.isFinite(x)).sort((a, b) => a - b); return xs.length ? Math.round(xs[Math.min(xs.length - 1, Math.floor(p * (xs.length - 1) + 0.5))]) : null; };
const pct = (n, d) => d ? +(100 * n / d).toFixed(1) : null;
const SETTINGS = [["released", null, "vc_released_diag"], ["200", "windfall_200"], ["225", "windfall_225"], ["250", "windfall_250"], ["400", "windfall"]];

const worlds = read("windfall_200").map(r => `${r.archetypeId}:${r.seed}`);   // the shared sample (also windfall / 225 / 250's)
const out = { format: "bloom-036c1-windfall-recalibration@1", tool: "tools/research/challenges/windfall-recalibration.mjs", sample: { worlds: worlds.length, perArchetype: 40 }, settings: {} };
for (const [label, concept, diagConcept] of SETTINGS) {
  const rows = concept ? read(concept).filter(r => worlds.includes(`${r.archetypeId}:${r.seed}`)) : worlds.map(k => ({ ...base.get(k), concept: null }));
  const diagRows = read(diagConcept || concept), S = {};
  for (const sp of SPECIES) {
    const key = concept ? `c36_${concept}/${sp}` : `volatile_climate/${sp}`, C = rows.filter(r => r.physical).map(r => ({ r, c: r.cells[key] })).filter(x => x.c);
    const ok = C.filter(x => x.c.stage === "ok"), refused = C.filter(x => x.c.stage === "scenario" || x.c.stage === "quality");
    const tooFast = refused.filter(x => /too fast/.test((x.c.proof && (x.c.proof.reasonFull || x.c.proof.reason)) || "")).length;
    const full = refused.filter(x => x.c.proof && x.c.proof.reasonFull != null).length;
    const dkey = diagConcept ? `c36_${diagConcept}/${sp}` : key, D = diagRows.map(r => r.cells && r.cells[dkey]).filter(c => c && c.stage === "ok" && c.diag);
    const Q = D.map(c => c.diag.strategies.filter(t => t.qualified));
    const byArch = Object.fromEntries(ARCH.map(a => { const A = C.filter(x => x.r.archetypeId === a); return [a, `${A.filter(x => x.c.stage === "ok").length}/${A.length}`]; }));
    const same = ok.map(x => { const b = (base.get(`${x.r.archetypeId}:${x.r.seed}`) || { cells: {} }).cells[`volatile_climate/${sp}`]; return b && b.stage === "ok" ? x.c.proof.marginSeconds - b.proof.marginSeconds : null; }).filter(x => x != null);
    S[sp] = { worlds: C.length, qualifying: ok.length, qualifyingPct: pct(ok.length, C.length), byArchetype: byArch, refused: refused.length, refusedTooFast: tooFast, refusedTooFastKnown: concept === "windfall" ? "036C probe: 16/16 sampled refusals too fast" : full === refused.length,
      witness: { p10: q(ok.map(x => x.c.proof.marginSeconds), 0.1), p50: q(ok.map(x => x.c.proof.marginSeconds), 0.5), p90: q(ok.map(x => x.c.proof.marginSeconds), 0.9) },
      sameWorldDeltaP50: concept ? q(same, 0.5) : 0, usesTerraformPct: pct(ok.filter(x => x.c.proof.terraformSteps > 0).length, ok.length), shockedFirstWitnessPct: pct(ok.filter(x => x.c.proof.shocks > 0).length, ok.length),
      diag: { worlds: D.length, firstPurchaseP50: q(Q.flat().map(t => t.firstPurchaseSeconds), 0.5), shockedWinningStrategyPct: pct(Q.filter(z => z.some(t => t.shocks > 0)).length, Q.length),
        terraformWinningStrategyPct: pct(Q.filter(z => z.some(t => t.terraformSteps > 0)).length, Q.length), threeStrategiesPct: pct(Q.filter(z => z.length >= 3).length, Q.length),
        firstTerraformP50: q(Q.flat().map(t => t.firstTerraformSeconds), 0.5) } };
  }
  out.settings[label] = { concept: concept || "volatile_climate (shipped records)", diagConcept: diagConcept || concept, bySpecies: S };
}
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, "windfall-recalibration.json"), JSON.stringify(out, null, 1) + "\n");
// the table
const L = [`# BLOOM-036C1 — Windfall recalibration\n`, `Same ${worlds.length} World Seeds (40 per archetype) for every setting; full offline Challenge proof; times = perfect-play game-seconds to Bloom + 3 points.\n`,
  "| Setting | Species | Qualifying | by archetype (O · D · F) | Refused (too fast) | Witness p10 / p50 / p90 | Δ p50 vs released (same worlds) | Terraform in 1st witness | Shock in 1st witness | Shocked winning strategy | ≥ 3 strategies | First purchase p50 |",
  "|---|---|---|---|---|---|---|---|---|---|---|---|"];
for (const [label, S] of Object.entries(out.settings)) for (const sp of SPECIES) { const x = S.bySpecies[sp];
  L.push(`| ${label} | ${sp} | ${x.qualifying}/${x.worlds} (${x.qualifyingPct} %) | ${ARCH.map(a => x.byArchetype[a]).join(" · ")} | ${x.refused} (${x.refusedTooFast}${x.refusedTooFastKnown === true ? "" : "*"}) | ${x.witness.p10} / ${x.witness.p50} / ${x.witness.p90} | ${x.sameWorldDeltaP50 ?? "—"} | ${x.usesTerraformPct} % | ${x.shockedFirstWitnessPct} % | ${x.diag.shockedWinningStrategyPct} % (${x.diag.worlds}) | ${x.diag.threeStrategiesPct} % | ${x.diag.firstPurchaseP50} s |`); }
L.push("", "\\* the 036C 400-Biomass rows predate the full-reason capture: the count is what the truncated reason shows; the 036C pacing probe found 16 / 16 sampled refusals too fast.");
fs.writeFileSync(path.join(OUT, "windfall-recalibration.md"), L.join("\n") + "\n");
console.log(L.join("\n"));
