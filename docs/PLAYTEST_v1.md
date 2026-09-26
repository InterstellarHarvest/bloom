# BLOOM — Slice Playtest Sheet v1

**Build:** `demos/demo-run.html` (open directly in a browser) · **Gate:** [`NEXT_PLAYABLE_SLICE_v1.0.md`](NEXT_PLAYABLE_SLICE_v1.0.md)

Play one full run at 1× without reading the code. Then play a second run with a *different* water strategy. Fill in the table. The slice may expand only when most answers are **yes**.

Tips for the tester: click a region to read it. Hover an upgrade before buying: green = regions it would open, red = regions it would close. Gold bubbles are optional bonuses.

| # | Acceptance question | Yes / Partly / No | What happened (one line) |
|---|---|---|---|
| 1 | Can a new player identify why growth stopped within a few seconds? | | |
| 2 | Does buying a solution visibly change the map? | | |
| 3 | Is there usually something meaningful to inspect or decide? | | |
| 4 | Does passive Biomass avoid dead waiting time? | | |
| 5 | Do bubbles feel rewarding without demanding attention? | | |
| 6 | Does Terraform create a real regional tradeoff? | | |
| 7 | Are at least two broad winning approaches plausible? | | |
| 8 | Does the midgame accelerate in a satisfying way? | | |
| 9 | Does reaching the threshold feel like solving the planet? | | |
| 10 | Can the player explain one real plant adaptation after the run without a separate quiz? | | |

**Run log**

| Run | Build (upgrades in order) | Win time | Regions given up | Felt too slow / too fast at… |
|---|---|---|---|---|
| 1 | | | | |
| 2 | | | | |

**Headless baseline (2026-09-26, `tools/slice-check.js`)** for comparison: a perfect-knowledge bot with a 4 s reaction wins in ~5 min (wet ≈ 5m10s, dry ≈ 5m05s). The first upgrade is affordable at ~65–75 s. A generalist caps at 67.6%. Flood II drops to ~24%.
