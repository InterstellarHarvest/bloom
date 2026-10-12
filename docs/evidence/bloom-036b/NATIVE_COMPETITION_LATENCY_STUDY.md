# BLOOM-036B1 — Native Competition launch-latency study

**Status: research record — SUPERSEDED for release by the seed banks.** This study was the first step of the 036B1 latency pass (profile
before changing rules). Mid-pass the PMO replaced live per-launch Challenge validation with **prevalidated seed banks**
([`seed-bank/BUILD_REPORT.md`](seed-bank/BUILD_REPORT.md)): the player's browser no longer proves a Native Competition world, so nothing below
has to be optimized for release. The findings remain the performance data of the **offline bank builder** and are kept here.

Data: [`nc-latency-study.json`](nc-latency-study.json) (per world × species: every stage timed, plus the layer-P **run trace** — each witness
and confirmation run in order, with its time and outcome). Tools: [`tools/nc-latency-study.mjs`](../../../tools/nc-latency-study.mjs) ·
[`tools/nc-latency-analysis.mjs`](../../../tools/nc-latency-analysis.mjs). The trace is the validator's new opt-in `trace` option
(`resources/bloom-witness.js`; absent = byte-identical behaviour), so any total-run budget can be replayed exactly offline.

Sample: the recipe study's 120 worlds (3 archetypes × 40 seeds), Native Competition only, every species; 8 Node workers on the 16-thread
iMac (a worker's run time is ~1.5× a single-threaded one). Recipe applied in the replays: arrival ≥ 20 % (structural prediction and the
validated world).

## 1. Where the time goes (per stage)

| Species | physical validation | S2 (species) | native-cover probe | witness run | confirmation run | passing proof | failing proof median / p90 | proof time in confirmations | proof time in failures |
|---|---|---|---|---|---|---|---|---|---|
| Organic Hybrid | 1.5 s | 0.0 s | 4 ms | 1.5 s (p90 2.7 s) | 1.4 s | 4.6 s | 17.3 s / 42.6 s | 49.3 % | 26.2 % |
| Cinder Rosette | 1.5 s | 0.3 s | 2 ms | 1.3 s (p90 3.0 s) | 1.4 s | 4.5 s | 17.9 s / 55.0 s | 43.4 % | 49.9 % |
| Woolly Candle | 1.5 s | 0.3 s | 2 ms | 1.2 s (p90 2.8 s) | 1.1 s | 4.1 s | 11.2 s / 35.7 s | 43 % | 17.1 % |
| Reed Spire | 1.5 s | 0.3 s | 2 ms | 0.9 s (p90 2.1 s) | 1.3 s | 4.5 s | 12.6 s / 31.1 s | 46.5 % | 44.4 % |
- A Native Competition proof is three full competition runs when it passes (the witness + the two confirmation seeds): ~4–5 s here.
  **Confirmations are ~43–49 % of all proof time**; **failing proofs are 17–50 % of it** (Cinder Rosette and Reed Spire ~45–50 %).
- Physical validation (~1.5 s) and S2 (~0.3 s) are minor; the native-cover probe is milliseconds.
- **The live-search tail (A–E of the directive):** it was **C + D** — slow *rejected* candidates (failing searches run up to 40 witness runs plus
  their confirmations, median 11–33 s, p90 26–55 s) and **stream-order blocking** (the accepted world waits for every earlier draw's verdict).
  Per-simulation engine cost (A) is Firefox's ~2× multiplier on top of that (measured in the live-search browser timings,
  [`challenge-world-timing-live-search.json`](challenge-world-timing-live-search.json)); worker oversubscription (B) was not the cause in Node
  (see §4).

## 2. Proof budgets 3 / 4 / 5 / 6 (exact replay of every trace)

| Total-run budget | Organic Hybrid qualifying (passes lost) · failing proof median / p90 | Cinder Rosette qualifying (passes lost) · failing proof median / p90 | Woolly Candle qualifying (passes lost) · failing proof median / p90 | Reed Spire qualifying (passes lost) · failing proof median / p90 |
|---|---|---|---|---|
| 3 runs | 47.5 % (12) · 4.2 s / 6.7 s | 24.2 % (15) · 5.1 s / 9.5 s | 36.7 % (16) · 3.2 s / 5.5 s | 31.7 % (10) · 3.5 s / 5.8 s |
| 4 runs | 51.7 % (7) · 6.5 s / 11.5 s | 26.7 % (12) · 8.3 s / 13.2 s | 42.5 % (9) · 5.5 s / 7.3 s | 34.2 % (7) · 5.6 s / 9.0 s |
| 5 runs | 51.7 % (7) · 7.7 s / 11.6 s | 27.5 % (11) · 11.0 s / 15.0 s | 43.3 % (8) · 5.8 s / 8.8 s | 35.8 % (5) · 7.6 s / 13.4 s |
| 6 runs | 51.7 % (7) · 10.0 s / 12.5 s | 27.5 % (11) · 11.0 s / 19.2 s | 44.2 % (7) · 6.6 s / 10.7 s | 35.8 % (5) · 8.1 s / 13.4 s |
| full (40 witness runs, confirmations uncounted) | 57.5 % (0) · 12.9 s / 28.1 s | 36.7 % (0) · 33.2 s / 54.5 s | 50 % (0) · 11.2 s / 26.4 s | 40 % (0) · 12.2 s / 25.5 s |
A budget of 3 means the first witness and both confirmations must pass — **stricter selection, not weaker validation** (a proof found within
any budget is identical to the full one). It cuts failing-proof time 3–6× but loses 10–16 passing worlds per species (Cinder Rosette 36.7 % →
24.2 % of the pool). **Not adopted:** with seed banks the full budget runs offline, where losing proven worlds would only shrink variety.

## 3. Connected foothold (S1) as a predictor — read-only

| Species (r = point-biserial foothold ↔ pass) | foothold 0–5 % | foothold 5–10 % | foothold 10–15 % | foothold 15–25 % | foothold 25–100 % |
|---|---|---|---|---|---|
| Organic Hybrid (r = -0.315) | 7 worlds · 100 % pass · 0 slow fail | 12 worlds · 100 % pass · 0 slow fail | 11 worlds · 90.9 % pass · 0 slow fail | 18 worlds · 88.9 % pass · 1 slow fail | 32 worlds · 81.3 % pass · 2 slow fail · 1 extinct |
| Cinder Rosette (r = 0.137) | 1 worlds · 0 % pass · 0 slow fail | 3 worlds · 100 % pass · 0 slow fail | 3 worlds · 100 % pass · 0 slow fail | 12 worlds · 75 % pass · 1 slow fail | 37 worlds · 89.2 % pass · 3 slow fail |
| Woolly Candle (r = 0.068) | 3 worlds · 100 % pass · 0 slow fail | 7 worlds · 100 % pass · 0 slow fail | 3 worlds · 100 % pass · 0 slow fail | 12 worlds · 83.3 % pass · 2 slow fail | 40 worlds · 92.5 % pass · 0 slow fail |
| Reed Spire (r = -0.138) | 2 worlds · 50 % pass · 0 slow fail | 6 worlds · 83.3 % pass · 1 slow fail | 6 worlds · 100 % pass · 0 slow fail | 11 worlds · 100 % pass · 0 slow fail | 34 worlds · 79.4 % pass · 2 slow fail |
**Weak predictive value** (|r| ≤ 0.32, and the sign differs by species): low-foothold worlds pass Native Competition as often as high ones, and
slow failures / extinctions are spread across bands. A `foothold.minShare` recipe constraint is therefore **not justified** — none was added
(the recipe schema supports one, `launch.world.recipe.foothold`, for a future study that shows a real content reason).

Failure reasons (all species): 17× "INCONCLUSIVE — search capped: witness wins with margin under the valid…" · 14× "no legal build reaches the validation margin: best build holds #% < ta…" · 13× "INCONCLUSIVE — search capped: every witness died out (extinction at #…" · 11× "INCONCLUSIVE — search capped: only # of # broad strategies meet the pa…" · 9× "no legal build can hold the win simultaneously: best build reaches #%…" · 7× "INCONCLUSIVE — search capped: witness wins but peaks at #% < target #%…" · 5× "only # of # broad strategies meet the pacing policy — [Crossing:waterS…" · 3× "INCONCLUSIVE — search capped: no candidate build reached the win with…"


## 4. Worker pools

- **Browser pool caps (3 / 4 / 5 / 6 / 8):** not benchmarked — superseded before the run: with seed banks the browser uses ONE worker for
  one cheap planet rebuild, so there is no pool to tune (perceived-wait results: [`REPORT.md`](REPORT.md)).
- **Offline builder (Node, the cost that remains):** [`seed-bank/builder-pool-bench.json`](seed-bank/builder-pool-bench.json) — 16 pool worlds,
  every Challenge × species, full validation: **8 workers 6.18 worlds / min, 12 → 6.10, 15 → 6.31** — flat: the machine is bound by its 8
  physical cores (per-world time grows with workers: 44 s → 59 s → 64 s). The builder uses 8.

## 5. What this changed

Nothing in the released Challenge: the Native Competition recipe stays **arrival ≥ 20 %**, no foothold constraint, no proof budget. The bank
builder uses the **full** validator (every confirmation run) — the expensive proof moved to content production.
