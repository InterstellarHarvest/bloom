# BLOOM — Procedural playtest v1 (owner)

**What this tests:** whether a *generated* world is fun and readable to a person. The validator (layers 1–8) already shows that these worlds can be won with at least two broad strategies at a reasonable machine pace. It cannot tell us whether a human understands islands, water crossings and Waterborne Seeds, or enjoys them.

**Gate status:** ⏸ **paused twice for owner feedback, ready to resume after BLOOM-009.**

1. The owner started this test and reported that the opening had nothing to do. They asked for a way to influence regions already seeded, and for colonies to look denser as they mature. BLOOM-008 responded.
2. The owner then asked for four more changes, and BLOOM-009 made them:
   - each colony keeps its own focus;
   - Biomass-funded colony upgrades;
   - much smaller seedlings;
   - a bigger Biomass display and visible water crossings.

See *What changed* below. The gate is **not passed**. This sheet is still the human procedural-playtest gate, a second archetype still waits for it, and only the owner can mark it passed.

**Resuming:** start both runs fresh (seed 13, then seed 8). Earlier partial runs used older rules, so they don't count toward this record. Anything you noticed in them is still useful: put it in the *Notes from earlier attempts* row below.

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

## What changed since you paused

**BLOOM-008 (still true):**

- Colonies start sparse and establish over time. Young colonies make less Biomass and fewer seeds; established ones make more.
- Clicking a region your plant lives in shows **Colony: Sparse / Establishing / Established / Dense**, with a bar and a %. A region can be completely green and still be maturing.

**BLOOM-009 (new):**

- **Seedlings start much smaller.** A newly colonized tile is now a tiny pale sprout on bare ground. It grows into a bigger, darker patch and finally a full, dark tile. That takes about a minute and a half on good ground, longer on poor soil. You should be able to tell a new frontier from an old colony at a glance.
- **Every colony keeps its own growth focus.** The left panel shows it for the selected region. There are four big buttons:
  - **Balanced** (the default): the normal way to grow.
  - **Roots**: the colony thickens much faster and loses fewer plants on marginal ground. It costs a little of that colony's Biomass. Good for young or struggling colonies. It does **not** let plants survive ground that is too cold, too hot, too salty, too wet or dry, or toxic for your plant.
  - **Leaves**: more Biomass from that colony, but only once it has filled in (seedlings have little leaf area). It makes fewer seeds. Good for big, established colonies.
  - **Seeds**: the colony spreads into open ground faster and, with Waterborne Seeds, sends more seeds over water. It costs some of that colony's Biomass. Good for frontier and coastal colonies.
  - Setting one colony **never changes another**. Each colony keeps its choice until you change it, even if it dies back or is wiped out and later regrows.
  - A small coloured badge above a region's name shows its focus (▼ Roots, ❦ Leaves, ✿ Seeds). Balanced regions show none.
  - A 💡 tip under the buttons suggests what suits the colony right now. You can ignore it.
  - Using focus is optional. You can leave everything Balanced and still win.
- **Local upgrades** (the panel below the focus). You can spend Biomass to improve **one** colony for good: **Root Network**, **Leaf Canopy** or **Seed Reserve**.
  - It's one upgrade per colony. The first costs 90 Biomass, and each one you build makes the next cost more.
  - It works a bit better when the colony's focus matches it.
  - A gold ring on the map badge marks a colony that has one.
  - Upgrades are optional. The question they pose is: *improve this important colony now, or save for the next global upgrade?*
- **Biomass is now the big gold number at the top left.** Next to it is your income per second. It glows gold when you gain a chunk and red when you spend. Prices you can't afford yet turn red, and local upgrades say how much more you need.
- **Water crossings are visible.** After Waterborne Seeds, small seed dots float from a coastal colony across the water:
  - a **faint pale ripple** where they land means the seeds arrived but haven't rooted;
  - a **bright gold-green burst** means they took root: a new colony. The footer also says so.
  - Seeds that wash up on hostile ground only ever show the faint ripple, and the footer tells you why they can't grow there.
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
| Growth focus: which colonies did you set, to what, and roughly when? Did you change any colony more than once? | | |
| Local upgrades bought (which, on which colony, roughly when), or why you didn't buy any | | |
| Notes from earlier attempts (before BLOOM-008 / BLOOM-009), if any | | |

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
| 14 | **(BLOOM-009)** Does each colony remembering its own focus match what you expected? Did you ever have to set something again that you had already set? | | |
| 15 | **(BLOOM-009)** Did different colonies want different focuses (young → Roots, frontier/coast → Seeds, established → Leaves), or did one focus still feel like "always pick this"? | | |
| 16 | **(BLOOM-009)** Local upgrades: did you face a real "improve this colony or save for a global upgrade" choice? Did any upgrade feel useless or mandatory? | | |
| 17 | **(BLOOM-009)** Do new colonies now start small enough? Can you tell a fresh frontier from a long-established colony at a glance? | | |
| 18 | **(BLOOM-009)** Is it always obvious how much Biomass you have, whether it's rising, and whether you can afford something? | | |
| 19 | **(BLOOM-009)** After buying Waterborne Seeds, did you see seeds cross the water? Could you tell "seeds arrived but didn't grow" from "seeds took root"? | | |

**Overall:** *Would you voluntarily play another generated planet in the current ugly prototype state?*

Answer: ______  Why: ______________________________________________

---

## After the runs

Paste the filled tables back to the PMO, or commit them to this file. For comparison, the headless reference numbers are in the BLOOM-007, BLOOM-008 and BLOOM-009 reports. Read them only **after** you've played.

- After BLOOM-009, a perfect-knowledge bot with a 4-second reaction that leaves every colony Balanced and buys no local upgrades wins seed 13 in roughly 7–10 minutes.
- A bot that re-directs every colony by the situational rule wins it in roughly 6–8 minutes.
- Live runs vary, because the game uses a fresh random stream each time.
- A person is expected to be slower. The bible's session target is 10–20 minutes.

These pacing numbers are machine evidence only and stay provisional until this test.

**Visual note:** the art is still deliberately temporary. The owner's future visual direction is recorded in [`VISUAL_DIRECTION_v1.0.md`](VISUAL_DIRECTION_v1.0.md) and has not been started, so judge readability and decisions, not looks.

The First Bloom playtest sheet is separate: [`PLAYTEST_v1.md`](PLAYTEST_v1.md).
