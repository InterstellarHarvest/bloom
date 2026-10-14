// BLOOM-038 design audit — assemble docs/evidence/bloom-038/failure-state-audit.json (research only) from
//   · the browser half  docs/evidence/bloom-038/failure-ui.json  (failure-ui.js: what the released UI says in 19 deterministic failure states)
//   · the sim half      <scratch>/failure-sim.json (analyze.mjs: outcomes, timeout causes, extinctions, native takeover, readout honesty)
//   · the stand-off escape probe <scratch>/escape.json (escape.mjs)
//   node tools/research/design-audit/merge-failure.mjs
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "./engine.mjs";
const SCRATCH = process.env.BLOOM038_SCRATCH || path.join(ROOT, ".design-audit-scratch"), OUT = path.join(ROOT, "docs/evidence/bloom-038");
const ui = JSON.parse(fs.readFileSync(path.join(OUT, "failure-ui.json"), "utf8"));
const sim = JSON.parse(fs.readFileSync(path.join(SCRATCH, "failure-sim.json"), "utf8"));
const esc = fs.existsSync(path.join(SCRATCH, "escape.json")) ? JSON.parse(fs.readFileSync(path.join(SCRATCH, "escape.json"), "utf8")) : null;
const out = { format: "bloom-038-failure-state-audit@1", tools: ["tools/research/design-audit/failure-ui.js", "tools/research/design-audit/readout.mjs", "tools/research/design-audit/analyze.mjs", "tools/research/design-audit/escape.mjs", "tools/research/design-audit/merge-failure.mjs"],
  questions: { q1: "does it identify the TRUE limiting cause?", q2: "does it distinguish current symptom from root cause?", q3: "does it present an action that would genuinely help?", q4: "could the player reasonably infer what to do next? (heuristic — HUMAN PLAYTEST NEEDED)", q5: "do two different mechanics use visually similar language / symbols?" },
  ui: { source: "failure-ui.json (full per-state captures: banner text, conditions, would-help, scenario card, log, report, screenshots in failure-ui/)", worlds: ui.worlds, perState: ui.summary, vocabulary: ui.vocabulary, collisions: ui.collisions, errors: ui.errors },
  readoutHonesty: sim.readoutHonesty, outcomes: sim.outcomes, timeoutCauses: sim.timeoutCauses, extinctions: sim.extinctions, nativeTakeover: sim.nativeTakeover,
  standoffEscape: esc && { method: "escape.mjs header: replay each stalled native-competition research run (balanced / greedy) to its plateau, then one legal trait (Terraform also ×2) with Biomass topped up, 600 s more", ...esc } };
fs.writeFileSync(path.join(OUT, "failure-state-audit.json"), JSON.stringify(out, null, 1));
console.log("wrote failure-state-audit.json", Object.keys(out.ui.perState || {}).length, "UI states");
