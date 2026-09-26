# BLOOM — Procedural playtest v1 (owner)

**What this tests:** whether a *generated* world is fun and readable to a person. The validator (layers 1–8) already shows that these worlds can be won with at least two broad strategies at a reasonable machine pace. It cannot tell us whether a human understands islands, water crossings and Waterborne Seeds, or enjoys them.

**Gate status:** ⏳ **not yet run.** This sheet is the human procedural-playtest gate. A second archetype waits for it. Only the owner can mark it passed.

**Time needed:** two runs of roughly 10–20 minutes each, plus a few minutes for the questions.

---

## Before you play

- **Don't look up solutions.** Before playing, do not read the README's QA / strategy-check sections, `tools/*-check.js`, `docs/evidence/`, or any test output. They name the winning builds for these exact seeds.
- **Play at 1× speed.** This is the default: leave the ▶ 1× button alone.
- **Use only the normal controls:** the map, the shop, bubbles, pause. Don't use the browser console.
- Pausing to read is fine. Note roughly how long you paused if it was more than a minute.
- The prototype is deliberately ugly. Judge the *decisions*, not the art.

## Launch

Open the file directly in a browser (Chrome or Safari; no server needed). The path is the `demos/demo-run.html` file inside your Bloom folder, followed by the query string below. For example, in Chrome's address bar:

```
file:///Users/MrDashiki/Experiments%20&%20Projects/Bloom/demos/demo-run.html?archetype=ocean_archipelago&seed=13
```

Easiest way: double-click `demos/demo-run.html` (it opens First Bloom), then add the text below to the end of the address and press Enter.

| Run | What to append to `…/demos/demo-run.html` |
|---|---|
| **Run 1** | `?archetype=ocean_archipelago&seed=13` |
| **Run 2** | `?archetype=ocean_archipelago&seed=8` |

The bottom-right corner shows the world's identity (archetype · public seed · attempt · planet name). For run 1 it should read *Ocean Archipelago · public seed 13 · attempt 6 · Eos-227*; for run 2, *public seed 8 · attempt 1 · Coriol-220*. If you see a red **NO WORLD GENERATED** panel instead, stop and report it: those two seeds should always load.

## What's new on the screen (read once, then play)

- **Blue is water.** Nothing grows on it and it doesn't count toward the 70%. Clicking water says so.
- **Islands.** Clicking a region on an island you don't hold yet adds a blue note under the usual readout. It says whether water is what's in the way, separately from whether the ground there suits your plant.
- **Waterborne Seeds** (Spread board). Hover over it before buying:
  - a *green* outline marks island regions your seeds could reach and where they could take root now;
  - a *yellow* outline marks regions they could reach but where the ground is hostile right now.
- Everything else is the First Bloom interface you already know.

---

## Run record

Fill one column per run.

| | Run 1 — seed 13 | Run 2 — seed 8 |
|---|---|---|
| Upgrades bought, in order (with the approximate time of each if you can) | | |
| Approximate win time (the Bloom Report shows it) | | |
| Waterborne Seeds bought? When? | | |
| Regions / islands you abandoned **on purpose** | | |
| Regions / islands you lost or never reached **without meaning to** | | |
| Any stretch that felt like dead waiting (roughly when, how long, what you were waiting for) | | |
| Did you win? If you gave up, when and why | | |

## Questions

Answer **Yes / Partly / No**, plus a short note. Answer across both runs unless the question says otherwise.

| # | Question | Answer | Note |
|---|---|---|---|
| 1 | Can you tell within a few seconds whether spread stopped because of **water geography** or because the destination **environment is hostile**? | | |
| 2 | Before buying Waterborne Seeds, is it clear what the upgrade is expected to do? | | |
| 3 | After buying Waterborne Seeds, is its effect visibly satisfying and understandable? | | |
| 4 | Do islands create an interesting strategic problem rather than just extra waiting? | | |
| 5 | Is there usually a useful decision or inspection to make while Biomass accumulates? | | |
| 6 | Does the first purchase arrive at a reasonable point? | | |
| 7 | Does the middle of the run accelerate rather than drag? | | |
| 8 | Do Adapt versus Terraform choices feel meaningfully different? | | |
| 9 | Does 70% feel like solving the world without requiring tedious cleanup? | | |
| 10 | Across seeds 13 and 8, do the worlds feel meaningfully different? | | |

**Overall:** *Would you voluntarily play another generated planet in the current ugly prototype state?*

Answer: ______  Why: ______________________________________________

---

## After the runs

Paste the filled tables back to the PMO, or commit them to this file. For comparison, the headless reference numbers are in the BLOOM-007 report: a perfect-knowledge bot with a 4-second reaction, clicking the real shop buttons, wins seed 13 in roughly 6½–10 minutes (live runs vary, because the game uses a fresh random stream each time). Read them only **after** you've played. A person is expected to be slower. The bible's session target is 10–20 minutes.

The First Bloom playtest sheet is separate: [`PLAYTEST_v1.md`](PLAYTEST_v1.md).
