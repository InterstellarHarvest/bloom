# BLOOM-036D — completion-condition candidates (summary)

Full study: [`docs/CHALLENGE_COMPLETION_STUDY_v1.md`](../../CHALLENGE_COMPLETION_STUDY_v1.md) · data: [`completion-study.json`](completion-study.json). Read-only: no
gameplay, `content/challenges.js` or seed-bank change. 355 worlds, the bank builder's own proofs + plans replayed in the validator's simulator.

| Challenge · condition | Completable | Ordinary play already satisfies | Effect | Verdict |
|---|---|---|---|---|
| **Thin Air · Bloom in the final atmosphere** | 100 % | proof: yes · plain Bloom: ends before the final state in 55 % (Desert 80 %) | every run lives through the reversal; wait p50 34 s / p90 60 s where Bloom came early; proofs already cover it | **RECOMMEND (first)** |
| Hearthfire · warming ≥ +6 °C | 96 % | 81 % | decorative (2 % shocked) | REJECT |
| Hearthfire · warming ≥ +12 °C | 34 % | 30 % | supply collapses to worlds already doing it | REJECT |
| Hearthfire · warming ≥ +18 °C | 26 % | 0 % | binding, always shocked — but < 50-entry supply; exceeds the validator's 2-step sky search | REJECT |
| Windfall 200 / 225 / 250 · never Critical | 78–96 % | **100 %** | no winning line (even rushed + 2 steps) ever reaches Critical (max peak 0.67) | REJECT |
| Oasis Line · hold N former native regions | N ≤ 3: 78–98 % | N 1–2: 98 % · 3: 78 % · 4: 46 % | winners already retake ~75 %; needs a landing snapshot | REJECT (keep as released) |

**Recommendations:** A — Thin Air with `pressure-final-state` first · B — one condition type first · C — Thin Air is the next released Challenge ·
D — Oasis Line unchanged. Implementation notes: gate the Challenge's completion at session level (the engine's `sim.won` also switches extinction off);
add a completion fingerprint to cell provenance (one full bank rebuild, identical entries).
