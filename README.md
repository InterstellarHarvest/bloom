# BLOOM

A retro-pixel **terraforming / evolution** game in the *Plague Inc.* lineage, built to teach middle-school life & earth science. You are a single pioneer plant dropped onto a hostile world: **evolve** to endure local ground conditions, **terraform** the global sky to bend the whole climate toward you, and win by covering a target % of the planet. The plant drives its own terraform loop — as it spreads it photosynthesizes and changes the atmosphere, so success snowballs (a deliberate echo of the Great Oxidation Event).

> *A planet's "mood" is its sky — you can change that. A region's "personality" is its ground — you have to adapt to that.*

## Status

Under active construction, built **one portion at a time as self-contained demos** (under `demos/`), each verified in isolation before being integrated into the single-file engine.

| Portion | What | State |
|---|---|---|
| 1 · The Surface | tile/section model · weighted-Voronoi + procedural generator · water/islands · border tracer · map render | ✅ `demos/demo-surface.html` |
| 2 · The Tick | genome · global terraform state · 8-variable survival check · barren↔living↔dead transitions w/ hysteresis · spread | ⏳ next |
| 3 · Inspect | color-coded 8-variable section panel | — |
| 4 · Evolve board | temperature pool + moisture position window · hex purchase/refund | — |
| 5 · Economy | biomass + spore bubbles | — |
| 6 · Dispersal + Terraform boards | (+ archipelago demo planet) | — |
| 7 · Pressure + Win | scenarios · win/loss · Bloom Report | — |
| 8 · Sprites | fixed-z-order layer compositor | — |
| — · Integration | fold demos → single-file engine + external JSON | — |

## Architecture

- **One HTML file = engine** (sim / render / UI / trait logic).
- **Content = external JSON** beside it (`planets/*.json`, `traits.json`, `scenarios.json`, `config.json`), loaded via `fetch()`. Adding a planet = writing JSON, zero engine code.
- **Embedded fallback** so it boots and plays over bare `file://`; external fetch enriches when served over HTTP.
- All rates / costs / thresholds live in `config.json` — balancing is data-tweaking, never re-architecting.

## Run

Open any file in `demos/` directly in a browser (no build step, no server required).

## Plan of record

[`GAME_BIBLE.md`](GAME_BIBLE.md) — the full v1.0 design bible. Everything reconciles there; when in doubt, it wins.
