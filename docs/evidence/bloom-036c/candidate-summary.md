# BLOOM-036C — candidate summary

Full study: [`docs/CHALLENGE_CONTENT_STUDY_v1.md`](../../CHALLENGE_CONTENT_STUDY_v1.md) · data: [`candidate-study.json`](candidate-study.json) ·
[`pacing-probe.json`](pacing-probe.json). Read-only: no gameplay, `content/challenges.js` or shipped-bank change (bank sha256 `dcca6d8f…`).
Times = the validator's perfect-knowledge witness, game-seconds to Bloom + 3 points (internal, never player-facing).

| Concept | Scenario · species · world · start | Qualifying (same worlds, released) | Arrival p50 | Witness p10 / p50 / p90 | Premise evidence | Verdict |
|---|---|---|---|---|---|---|
| **Low Tide** | Dying World · Organic Hybrid (prescribed) · Ocean · Flood + Salt owned | 78 / 155 = 50 % (normal start 93 %) | 74 % (43 % without start) | 277 / 397 / 600 | decline closes p50 54 % of land; Humidify in 94 % of wins; Drought closed by rule | **SHORTLIST** |
| **Oasis Line** | Native Competition · Reed Spire (prescribed) · Desert · no arrival floor | 113 / 160 = 71 % (released recipe 4 %) | 7 % | 386 / 501 / 617 | contested p50 11; Drought in 100 % of wins | **SHORTLIST** |
| **Thin Air** | Dying World · Woolly Candle (prescribed) · Desert + Ocean | 310 / 315 = 98 % (identical proofs) | 20 % | 247 / 293 / 515 | decline OPENS p50 12 % of land (others: 0 %) | **SHORTLIST (framing)** |
| Windfall | Volatile Climate · player choice · all · 400 Biomass | 70–78 % (85–99 %) | 13–31 % | p50 261–277 | shocked witnesses 9–28 % (pool 1–10 %); refusals = won too fast | HOLD — recalibrate ~200–250 |
| Hearthfire | Volatile Climate · Cinder Rosette · Frozen | 153 / 160 = 96 % (identical proofs) | 16 % | 257 / 315 / 421 | Warm in 90 % of wins, but Adapt-only wins 28 / 29 | RESERVE |
| Far From Home ×3 | **default** · mismatched specialist · opposite archetype | 98–99 % | 6–16 % | p50 261–317 | 3 distinct strategies in ~84 % | RESERVE (schema refuses default; Expedition overlap) |
| Pioneer Rush | Native Competition · player choice · Seed Output + Early Maturity · 0 Biomass | 3–8 % (35–65 %) | 28–42 % | — | first purchase > 60 s (15 / 16); start lowers win rate | REJECT |
| Empty Hold | Dying World · player choice · 0 Biomass | 11–20 % (86–95 %) | 16–27 % | — | first purchase > 60 s (15 / 16) | REJECT |
| Deep Freeze | Dying World · Frozen only (derived) | 82–95 % (85–96 %) | — | similar | a third of the DW bank already | REJECT (redundant) |
| Last Refuge | Native Competition < 20 % arrival (derived) | 59–91 % | < 20 % | — | viable; Oasis Line is its authored form | REJECT as separate |

**Released three:** keep; rewrite Native Competition's strategic idea (it is a fact today); make Volatile Climate say that only Terraforming
unsettles the climate (its proof witness is shocked in 3–9 of 50 bank worlds); add a low-arrival dossier line for 0 %-arrival Dying World /
Volatile Climate worlds.

**Future (036D input):** completion conditions — Hearthfire "sky warmed ≥ N steps", Windfall "climate never Critical", Thin Air "Bloom in the final
state", Oasis Line (optional) "hold N former native regions". Schema — allow `default`-rules Challenges (Far From Home); a per-Challenge pacing
policy for slow-opening starts. Tooling — keep full layer-P reasons in the builder's candidate records.
