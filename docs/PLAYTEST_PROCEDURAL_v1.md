# BLOOM — Procedural playtest v1 (owner)

**What this tests:** whether a *generated* world is fun and readable to a person. The validator (layers 1–8) already shows that these worlds can be won with at least two broad strategies at a reasonable machine pace. It cannot tell us whether a human understands islands, water crossings and Waterborne Seeds, or enjoys them.

**Gate status:** ⏸ **paused, then resumed after BLOOM-008.** The owner started this test, reported that the opening had nothing to do, and asked for a way to influence regions already seeded and for colonies to look denser as they mature. BLOOM-008 changed the game in response (see *What changed since you paused* below). The gate is **not passed**. This sheet is still the human procedural-playtest gate, a second archetype still waits for it, and only the owner can mark it passed.

**Resuming:** start both runs fresh (seed 13, then seed 8). Your earlier partial runs used the old opening, so they don't count toward this record. Anything you noticed in them is still useful: put it in the *Notes from the paused attempt* row below.

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

## What changed since you paused (BLOOM-008)

- **Colonies now start sparse and establish over time.** A newly seeded region begins as scattered seedlings (small light-green patches with ground showing between them). It thickens to full, dark green as it establishes. Young colonies make less Biomass and fewer seeds; established ones make more. So the first minute is slower, and growth speeds up once colonies mature.
- **Colony status.** Clicking a region your plant lives in shows **Colony: Sparse / Establishing / Established / Dense** with a bar. A region can be completely green and still be maturing: watch it darken.
- **Colony Focus** (left panel, under the colony status). The game opens with your origin selected. You can direct **one** region's growth at a time:
  - **Roots**: the colony thickens faster and loses fewer plants in marginal ground. It does **not** let plants survive ground that is too cold, too hot, too salty, too wet or dry, or toxic for your plant.
  - **Leaves**: the colony makes more Biomass. It does not change where your plant can live.
  - **Seeds**: the colony spreads outward faster, and with Waterborne Seeds it sends more seeds over water. Seeds still only take root where the ground suits your plant.
  - Pick one with a single click. It keeps working until you change it, costs nothing, and needs no upkeep. Choosing a mode in another region moves the focus there. The header shows where it is, and the map labels that region (▼ ROOTS / ❦ LEAVES / ✿ SEEDS).
  - Using it is optional. You can ignore it entirely and still win.
- The world identities are unchanged: seed 13 is still attempt 6 · Eos-227, and seed 8 is still attempt 1 · Coriol-220.

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
| Colony Focus: which modes did you use, where, and roughly when did you move it? | | |
| Notes from the paused attempt (before BLOOM-008), if any | | |

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
| 11 | **(BLOOM-008)** Do the first 1–2 minutes now contain meaningful decisions, rather than waiting for the first upgrade? | | |
| 12 | **(BLOOM-008)** Are Roots / Leaves / Seeds understandable from their names and one-line descriptions, and does each feel useful somewhere? Did one feel like the obvious "always pick this"? | | |
| 13 | **(BLOOM-008)** Does visible colony density (sparse → dense, darker as it matures) make growth easier to read? | | |

**Overall:** *Would you voluntarily play another generated planet in the current ugly prototype state?*

Answer: ______  Why: ______________________________________________

---

## After the runs

Paste the filled tables back to the PMO, or commit them to this file. For comparison, the headless reference numbers are in the BLOOM-007 and BLOOM-008 reports. After BLOOM-008, a perfect-knowledge bot with a 4-second reaction, never using Colony Focus, wins seed 13 in roughly 7–12 minutes (live runs vary, because the game uses a fresh random stream each time). Read them only **after** you've played. A person is expected to be slower. The bible's session target is 10–20 minutes. BLOOM-008's pacing numbers are machine evidence only. They stay provisional until this test.

The First Bloom playtest sheet is separate: [`PLAYTEST_v1.md`](PLAYTEST_v1.md).
