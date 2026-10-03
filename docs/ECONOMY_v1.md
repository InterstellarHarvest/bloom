# BLOOM — Biomass economy and decision cadence v1 (BLOOM-013)

Owner-authorized balance retune, 2026-10-02. Starting point: `4d1e52c`. Evidence: [`docs/evidence/bloom-013/`](evidence/bloom-013/). Bible: §8.4 (design rule), §11.4 (Dying World clock).

## 1. Why

**Owner, Dying World playtest, verdict REVISE (2026-10-02):**

> "the game still seems a bit slow to actually gain enough biomass to effectively do anything and strategize. things might need to cost less or gain more"

Earlier playtests had also noted slow openings. This was treated as a **shared-economy** problem, not a Dying World one. The `4d1e52c` browser evidence on Ocean 13 + Dying World bought at ~94 s, then ~360 s, ~434 s and ~511 s. The layer-P witness bought at 90 s, then 390 s: a 300-second wait. Meanwhile the player watched Biomass climb.

**The goal is less waiting between meaningful strategic choices, not a faster game.** A healthy rhythm: read the problem → have, or soon earn, enough Biomass to choose among responses → buy → watch the spread → another meaningful choice is within reach → repeat.

## 2. How it is measured — `tools/economy-study.js`

The study runs seeded engine runs (mulberry32, never `Math.random`) on five study worlds plus two extra Dying World worlds:

- First Bloom;
- Ocean Archipelago 13, Desert World 25 and Frozen World 22 (Eden);
- Ocean 13 + Dying World;
- extra: Desert 25 + Dying World, Frozen 22 + Dying World.

Worlds are pinned by archetype + public seed + generation attempt, so a what-if economy (`--set`) is measured on the same planet. Recipes are each world's accepted broad strategies. The Dying World worlds also run **ignore** recipes: the planet's Eden strategy, bought as if nothing were declining.

- **Meaningful option.** A global upgrade that is legal, offered, and opens ground now. It also counts if a sufficient strategy core of this world still needs it, or if it is a Spread upgrade with levels left. "Specialize a Living colony" counts as one more option. A clickable upgrade that opens nothing and no strategy needs (e.g. Heat Tolerance on a world with no hot ground) is **not** a decision.
- **Opening** (nothing bought): when the first local / first global / two different options become affordable.
- **Cadence.** Two bots, both buying a recipe 4 s after it becomes affordable:
  - **witness-like:** balanced colonies, recipe only;
  - **player:** situational colony allocation, one Leaf Canopy on the origin, Spread upgrades after the recipe.
  - Measured: first/second/third purchase; every gap and the largest (worst seed); median gap; the longest stretch with *nothing* meaningful affordable; last purchase → win; win; spend; unspent; coverage and Biomass at checkpoints.
- **Bubbles.** Every measurement runs with bubbles **ignored** (auto-collect only, the headline numbers) and **clicked** (2 s after they appear).
- **Pressure.** Pressure progress at the win, and the most land the drift closed to the current build.

`tools/economy-check.js` turns the targets below into pass/fail checks (directive QA items 2–38). It runs the same study at 4 run seeds, plus a real-browser First Bloom run.

## 3. Targets (validated)

| | Target | Result (8 seeds, bubbles ignored) |
|---|---|---|
| Opening | one meaningful action affordable immediately or within ~20–30 s | a local upgrade is affordable at t = 0 on every world |
| | two plausible choices within ~30–45 s | 24–29 s (was 74–83 s) |
| | first **global** purchase within ~30–60 s (not 80–120+) | witness-like 27–33 s; player 26–32 s (was 78–126 s) |
| | the start never buys a strategy | start 100 < cheapest global 130 < a third of the cheapest winning core (410–630) |
| Midgame | most gaps ~30–90 s | median gaps 24–67 s (was 31–110 s) |
| | no ordinary gap above ~120 s | largest gap ≤ 115 s for the witness-like bot on every primary recipe (worst seed); the player's longest stretch with nothing affordable ≤ 100 s |
| | Dying World's ~94 → 360 s gap gone | Ocean 13 + Dying World layer-P witness: seed output @ 29 s → Radiation Shielding @ 128 s → Drought @ 179 s → Waterborne Seeds @ 244 s (was 90 → 390 → 481 → 559 s) |
| Endgame | bounded "nothing left but spread" tail | player bot: 7–59 s from the last purchase to the win. A witness-like bot that buys only its minimal core waits longer on Ocean 13 Cold + Salt (180 s) and Desert 25 Drought ×2 (174 s): §8 |

Full before/after tables: [`evidence/bloom-013/before-after.md`](evidence/bloom-013/before-after.md).

## 4. The economy before (`4d1e52c`)

- **Income:**
  - `econ.startBiomass` 40;
  - `originTrickle` 0.1 Biomass/tick at full origin establishment (×0.45 for a young origin);
  - Living tiles: `thriving` 0.0004 / `marginal` 0.00012 per tick, × establishment (`youngYield` 0.45);
  - bubbles: `bubbleChance` 0.011/tick planet-wide, `bubbleValue` 25, auto-collect after 60 ticks at half value.
- **Prices** (`econ.costScale` 5 × trait base/step):
  - cold/heat 140/270/400; drought/flood 150/270; salt 200; rad 220;
  - seed output 130/280; Waterborne Seeds 180; early maturity 170;
  - each Terraform 200/290;
  - local specializations 90/130/170/210… (`colony.specCost` 18 + 8n, same `costScale`).
- **What it meant:** a player who ignored bubbles earned ~0.3 Biomass/s from the young origin plus ~0.9/s from auto-collected bubbles. Bubbles were half the early income. The first local upgrade was affordable at ~50–60 s and the first global at ~75–85 s. Ocean worlds are small (924 land tiles vs ~2,100–2,400), so colony yield, which scales with living area, stayed low there all game. Under Dying World the decline cut it further.

## 5. Alternatives evaluated

Each was measured on the five study worlds at 4 run seeds, on the same pinned planets and recipes (`evidence/bloom-013/alternatives-sweep1.txt`, `alternatives-sweep2.txt`). "Largest gap" is the witness-like bot's worst seed across First Bloom / Ocean 13 / Desert 25 / Frozen 22 / Ocean 13 + Dying World (old 60 + 420 s clock).

| | Change | First global affordable | Largest gap (s) | Verdict |
|---|---|---|---|---|
| A0 | baseline | 77–87 s | 100 / 139 / 177 / 112 / 306 | — |
| A1 | start 130 | t = 0 | 96 / 156 / 184 / 128 / 275 | fixes only the first minute |
| A2 | start 100, trickle 0.2 | 30–38 s | 71 / 111 / 124 / 94 / 145 | Desert and Dying World still > 120 |
| A3 | all prices × 0.7 | 49–64 s | 75 / 103 / 111 / 82 / 189 | opening still slow; Dying World gap 189 |
| A4 | prices × 0.7, start 100 | t = 0 | 81 / 113 / 113 / 89 / 170 | Dying World 170 |
| A5 | start 100, trickle 0.2, colony yield +75% | 29–37 s | 57 / 95 / 108 / 76 / 133 | Dying World 133 |
| A6 | prices × 0.7, start 100, trickle 0.18 | t = 0 | 68 / 93 / 94 / 77 / 108 | passes, but every price falls (and local upgrades fall to 63/91/119) |
| A7 | prices × 0.8, start 100, trickle 0.2, yield +50% | 7 s | 66 / 100 / 94 / 77 / 131 | Dying World 131 |
| **B1** | **start 100, trickle 0.3** | **25–30 s** | **69 / 82 / 103 / 78 / 109** | **chosen** |
| B2 | start 100, trickle 0.25, yield +50% | 26–32 s | 56 / 92 / 100 / 74 / 114 | passes; three values |
| B3 | start 100, trickle 0.25, prices × 0.8 | 6 s | 67 / 98 / 88 / 75 / 117 | passes; prices and local upgrades cheaper |
| B4 | start 100, trickle 0.2, **global** prices × 0.8, local kept at 90/130/170 (separate scales) | 7 s | 73 / 101 / 97 / 90 / 140 | Dying World 140; needs a new config key |
| B5 | start 100, trickle 0.3, yield +50% | 24–29 s | 57 / 83 / 92 / 68 / 92 | tighter gaps, but larger late surpluses and even shorter runs |

**Why B1 won:**

- **Smallest coherent change.** Two values, no price touched, no new mechanic, no separate local/global scale.
- **It lowers first-choice friction far more than later costs.** The trickle is the home colony's own production. It is a large share of income early and a shrinking share as colonies spread. Second and third adaptations still cost 270–400 and require saving.
- **It helps the worst worlds most.** The trickle does not scale with land area, so small island worlds (Ocean, the slowest) gain proportionally the most. Raising colony yield (A5, B2, B5) helps big continents most and leaves late-game surpluses larger.
- **Prices stay meaningful.** Price cuts (A3, A4, A6, A7, B3) shrink every later decision too, and make local upgrades cheaper with them. The only way to keep local prices while cutting global ones is a second scale (B4), which tested worse.
- **Separate local/global cost scales are not needed**, because B1 changes no price at all.
- **Bubbles became more clearly a bonus.** A bubble-ignoring player now earns ~0.85 Biomass/s from the young origin, matching what auto-collected bubbles add.

## 6. Session length — PMO decision point

Faster decisions mean faster wins: runs are **about 25–45% shorter** in bot time.

| | witness-like win (s) | player win (s) |
|---|---|---|
| First Bloom | 345–374 → 248–265 | 269–287 → 196–215 |
| Ocean 13 | 445–522 → 297–394 | 382–441 → 253–304 |
| Desert 25 | 461–488 → 320–350 | 385–395 → 276–281 |
| Frozen 22 | 352–411 → 249–290 | 287–324 → 207–234 |
| Ocean 13 + Dying World | 666–682 → 371–392 | 535–546 → 305–317 |

Earlier slices measured people at ~1.2–1.6× bot time, so human runs are now likely ~4–9 minutes against the bible's 10–20 human-minute target. **The documented target was not changed, and no waiting was added to pad runs.** Whether shorter but denser runs are right, or whether planets should grow to restore length, is a **PMO decision**. The owner re-test should answer it.

The validators' "too fast" floor scaled with the runs (§7). Its purpose stays the same: reject trivially easy worlds, not short ones.

## 7. Validator pacing policy (replaces the provisional bands)

| | Before | After |
|---|---|---|
| Archetypes (Ocean, Desert, Frozen; shared) | margin 360–900 s · first purchase 45–120 s · gap ≤ 240 s (Desert/Frozen also: terminal wait ≤ 240 s) | margin **240–720 s** · first purchase **≤ 60 s** · gap **≤ 120 s** (Desert/Frozen terminal wait ≤ 240 s, unchanged) |
| Dying World (layer P) | margin 300–1200 s · first purchase 30–150 s · gap ≤ 300 s | margin **240–900 s** · first purchase **≤ 60 s** · gap **≤ 120 s** |

- **First purchase and gap** are the owner's requirement (an early meaningful choice; no multi-minute dead Biomass waits).
- **The margin band scaled with the faster economy.** Its floor still rejects trivially fast worlds; under layer P it also rejects pressure runs won before the decline has done much (e.g. Desert seed 16, margin 151 s).
- **A separate terminal-wait rule was not added to Ocean.** The witness stops at its minimal core, and a real player keeps buying Spread upgrades, so the witness's terminal wait overstates the human tail (§8).
- **Sweep results:**
  - seeds 1–40: Ocean 34 → 36 accepted (seeds 3 and 33 generate again; 7, 19, 35, 38 still fail), Desert 40/40, Frozen 40/40;
  - Dying World layer P, seeds 1–20: Ocean 17/18, Desert 17/20, Frozen 20/20 (was 15/17, 18/20, 20/20).
- **Generation attempts.** The verdict on some generation attempts moved, so 11 Ocean, 1 Desert and 9 Frozen public seeds now resolve to a different attempt. Each attempt's geometry is unchanged. **Every owner/fixture seed keeps its world:** Ocean 13 and 8, Desert 25 and 9, Frozen 22 and 12 ([`evidence/bloom-013/accepted-attempts-diff.txt`](evidence/bloom-013/accepted-attempts-diff.txt)).
- **New natural negatives (strategy-check).** too slow 6/0, too fast 1/2 (a natural too-fast world exists for the first time), gap 32/10. No natural world misses the 60 s first purchase any more, so that rule is checked as a controlled boundary.

## 8. Dying World after the retune

The economy is not slowed down to save the old pressure clock; the scenario was retimed to fit the faster game.

- **Problem.** Under the old clock (60 s grace + 420 s decline, final at 480 s) the faster economy outran the decline. Eden builds bought as if nothing were changing won 4/4 on Ocean 13 (Heat + Rad) and Desert 25 (Drought ×2).
- **Candidates.** 60/420, 30/300, 45/270, 30/270, 40/250 and 30/240 were tested at 4 and 8 run seeds, with bubbles ignored and clicked (`evidence/bloom-013/dying-world-clock-sweep*.txt`).
- **Chosen: 40 s grace + 250 s decline (final state at 290 s).** Channels, phases and the extinction rule are unchanged.
  - 45/270 passed on 4 seeds. On 8, a bubble-clicking player still won Desert 25 with the Eden build, and Ocean 13's Heat + Rad Eden build won 8/8 for the player bot.
  - Faster clocks (30/240) stretch Ocean 13's seed output → Radiation Shielding wait past 120 s, because the decline cuts income during it.
- **Relevance:**
  - Normal successful runs live through 90–100% of the decline.
  - Every Eden build fails under Dying World when bubbles are ignored: Ocean Cold + Salt 0/8, Desert Drought ×2 0/8, Frozen Cold ×2 0/8. Ocean Heat + Rad fails 0/8 for the player bot; the witness-like bot wins it in 1 seed of 8.
  - The drift closes 30–70% of the land to those builds.
  - An idle player dies out at ~318 s, just after the final state.
- **Fixture strategies (layer P, both distinct):**
  - Ocean 13: Rad + Drought, or Rad + Humidify;
  - Desert 25: Rad + Drought ×2, or Rad + Salt + Drought + Humidify ×2;
  - Frozen 22: Cold ×3 + Drought, or Rad + Cold ×2 + Warm + Drought.

## 9. Integrity checks (`tools/economy-check.js`, all pass)

- **Strategy space:**
  - First Bloom proves 3 distinct strategies (Flood / Drought / Terraform-water families all win);
  - Ocean 13, Desert 25 and Frozen 22 each keep their accepted world and ≥ 2 distinct strategies inside the new bands;
  - all three fixtures pass layer P with 2 strategies.
- **Tradeoffs still bind:**
  - the shared temperature cap and one water strategy are enforced;
  - nobody has earned the cost of every tolerance (≥ 1,390) by mid-run (180 s: 550–1,100 earned);
  - Warm the Sky still opens cold ground and closes warm refuges on Frozen 22;
  - Waterborne Seeds keeps its 180 price, and Ocean recipes save ~80 s for it.
- **Local upgrades:**
  - optional: every recipe wins without one;
  - a real cost: specializing the origin at t = 0 delays the first global upgrade by 23–36 s;
  - one well-placed Leaf Canopy helps;
  - a Canopy on every colony is 25–70% slower than one Canopy;
  - Leaves everywhere + a Canopy everywhere is slower than situational play with none, so there is no Leaves runaway.
- **Bubbles:** ignoring them wins every recipe at the cadence above; clicking them wins ~10–35 s sooner.
- **No hidden Biomass:** every tick's gain is the reported income plus auto-collected bubbles. The page's only grant is the `BLOOM_API` test hook.
- **No soft-lock or runaway:** 110 recipe × policy × bubble rows are all won. Players finish holding < half the cost of every tolerance, earning < 400 Biomass/min.
- **UI (real browser):** the HUD starts at 100. Global buttons read unaffordable and local ones affordable. Every click spends its price. The affordable/unaffordable state matches the engine all run. The Bloom Report lists the build and the colony upgrade.

## 10. Golden data

- `tools/golden/first_bloom.json` **run traces** were regenerated (`sim-check --write`).
  - **Static part** (layout, evaluations, previews, prices) is **byte-identical**.
  - **Runs:** e.g. the wet recipe's first purchase moved from tick 467 to tick 143.
- `resources/` (the engine) is unchanged since `4d1e52c`.
- **dying-world-check fixtures** were re-pinned:
  - **geometry** of the six owner/fixture worlds (the planet without its validator record) is unchanged from `1b7ea2a`;
  - **3000-tick Eden runs** come from the `4d1e52c` engine running the BLOOM-013 data, and are identical to the working tree.

## 11. Known remaining concerns

- **Ocean 13 + Dying World's seed output → Radiation Shielding stretch is the longest wait left:** ~99 s for the witness, up to ~115 s in the browser run with reaction time, up to 125 s for the player bot that also buys a Canopy. It is inside the 120 s policy for the witness. The player bot always has a local upgrade affordable during it, so it is not dead time, but it is the first thing to watch in the re-test.
- **Witness-only tail.** A player who buys only a minimal core and nothing else can wait ~3 minutes for spread on Ocean 13 (Cold + Salt) and Desert 25 (Drought ×2). With the Spread upgrades a person would naturally buy, the tail is 7–59 s.
- **Ocean 13's Heat + Rad Eden build** carries the Radiation Shielding Dying World needs, so a fast bubble-clicker can sometimes win with it anyway. The pressure still forced Rad; it just happens to be in that Eden build.
- **Shorter sessions** (§6) — a PMO decision.
- **Late Desert surplus.** On Desert 25 (big land), a player who stops at Drought ×2 finishes with ~500 Biomass unspent. Other adaptations are still affordable, but none is needed.
- **Bot vs human.** All of this is bot evidence. The human verdict is the re-test ([`PLAYTEST_ECONOMY_v1.md`](PLAYTEST_ECONOMY_v1.md)): **passed with notes** (owner, recorded 2026-10-02 in BLOOM-014): *"seems better, lets move on."* The values above are human-approved and are not retuned without new evidence. The §6 session-length question stays open: the 10–20 minute target remains documented and provisional, and runs are not padded to reach it. BLOOM-014's Native Competition runs inside this economy unchanged (`tools/economy-study.js --worlds d25nc,o13nc,f22nc`; largest gap ≤ ~110 s, `docs/evidence/bloom-014/`).
