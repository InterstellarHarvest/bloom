# BLOOM — Dying World playtest v1 (owner)

**What this tests:** the first **pressure scenario**. In Dying World the planet slowly loses its atmosphere, so the world itself becomes drier, colder and more exposed to radiation while you play. It should feel like the planet is changing under you, not like a countdown. The validator has shown this world can be won under the real decline in at least two ways. Only a person can say whether it is readable and fun.

**Gate status:** **REVISE** (owner, 2026-10-02): *"the game still seems a bit slow to actually gain enough biomass to effectively do anything and strategize. things might need to cost less or gain more."* This was treated as a shared-economy problem, not a Dying World one. **BLOOM-013** retuned the economy and rescaled this scenario's clock to match ([`ECONOMY_v1.md`](ECONOMY_v1.md)). The gate stays **REVISE pending the economy re-test**: the next round is the two short runs in [`PLAYTEST_ECONOMY_v1.md`](PLAYTEST_ECONOMY_v1.md), not this whole sheet again. Only the owner can mark this passed.

**Time needed:** one run of roughly 8–15 minutes since BLOOM-013 (was 12–20), plus a few minutes for the questions.

---

## Before you play

- **Don't look up solutions.** Don't read `tools/dying-world-check.js`, `docs/evidence/bloom-012/` or the README's QA notes first: they name winning builds for this seed.
- Play at **1×** with the normal controls only (map, shop, colony focus buttons, bubbles, pause).
- **New on screen:** a purple **pressure bar** under the HUD. It shows the current stage, how much atmosphere has been lost, the time to the next stage, the drift so far (moisture, temperature, radiation) and the sky written out as *base + your Terraform + thinning = now*. Each region panel also says how the thinning air is changing that region.
- The decline starts after 40 seconds and reaches its final state just under 5 minutes (BLOOM-013; it was 1 and 8 minutes). After that, conditions stop changing. Reaching the final state is **not** a loss.
- You lose only if **no plants are left anywhere** for 8 seconds.

## Launch

Double-click `demos/demo-run.html` (it opens First Bloom), add the text below to the end of the address, and press Enter. The pressure bar should read **DYING WORLD · ATMOSPHERE THINNING**.

| Run | Append to `…/demos/demo-run.html` |
|---|---|
| **Required run** | `?archetype=ocean_archipelago&seed=13&scenario=dying_world` |

(This is the same island world as your earlier Ocean seed 13 run; only the atmosphere is different.)

## Questions

Answer in a sentence or two; "not sure" is a useful answer.

| # | Question | Answer |
|---|---|---|
| 1 | Does the pressure feel like **the world is changing**, rather than a timer? | |
| 2 | Can you tell **which conditions are getting worse**? | |
| 3 | Did the changing environment force you to **revise your plan**? | |
| 4 | Did **Adapt vs Terraform** become more interesting? | |
| 5 | Did you deliberately **give up any colony or region**? | |
| 6 | Did the pressure create **urgency without making the game frantic**? | |
| 7 | Was there still useful time to **inspect regions and make colony decisions**? | |
| 8 | Did **losing or winning** feel understandable? | |
| 9 | Would you **voluntarily play another pressure run**? | |

| Run | Won or lost? | Time (from the end screen) | Main purchases, in order | Regions you gave up |
|---|---|---|---|---|
| Ocean 13 + Dying World | | | | |

**Owner verdict:** ☐ pass ☐ pass with notes ☐ not yet (what should change first?)
