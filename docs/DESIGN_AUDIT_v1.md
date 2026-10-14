# Strange Bloom · Unknown Soils — Design Audit v1 (BLOOM-038)

**A read-only design and visual-quality study of the released game (v1.0.1, `main` `2590d79`).** Nothing in the game was changed: no
balance, species, Challenge, UI, art, generation or seed-bank edit. The branch adds research tooling (`tools/research/design-audit/`),
machine-readable results and screenshots (`docs/evidence/bloom-038/`), this document and the evidence report
([`evidence/bloom-038/REPORT.md`](evidence/bloom-038/REPORT.md)).

The question is not "does BLOOM meet its specification?" (46 regression suites already answer that). It is: **does the game actually
look, pace and behave like a well-designed game?** Every finding below is a *candidate* for a design decision. None has been fixed.

## 0. How to read this

| Severity | Meaning |
|---|---|
| **P0** | release-breaking / fundamentally misleading |
| **P1** | major design problem, likely worth a near-term fix |
| **P2** | meaningful polish / balancing candidate |
| **P3** | minor observation |
| **NO ISSUE** | investigated and looks good |

**HUMAN PLAYTEST NEEDED** marks findings where the automation measures a behaviour but cannot judge how it feels (§16).

**What the evidence is.**

- **Simulation study: 4,424 deterministic runs** of the production engine (`BLOOM.createSim`, created exactly as `game-session.js`
  creates it).
  - Driven by **seven imperfect, player-informed strategy policies**: balanced, adapt-first, spread-first, terraform-first, greedy,
    low-planning, and colony (balanced + growth focus / local upgrade).
  - Expedition sample: 60 validated sample worlds (20 per archetype, the Destination Survey's own validation path) × each species the
    survey would offer them to × 7 policies × 2 run seeds.
  - Challenges: the first 10 shipped seed-bank worlds of each of the 15 bank cells × 7 policies.
  - Training: 28 runs.
- **What the policies may read.** Only what the screen shows: region lamps, previews ("opens / closes / closer / suits native plants
  less"), prices, Biomass, the map's adjacency, the climate preview and the competition panel's text. They react 2–6 s after a target
  becomes affordable, and click 35–80 % of Biomass bubbles.
- **What they never read.** The validator's witness, the run's rng, or future pressure.
- **Times are game seconds at 1×.** Decision rooms pause the run, so room time is not game time.
- **Browser evidence, real Chromium on the production UI.**
  - 414 screenshots (visual atlas, two complete 1024 × 768 runs, a 2560 × 1440 traversal), with per-capture layout geometry.
    Production history keeps a compact subset (18 representative stills + 8 contact grids); the rest are regenerable
    ([`REPORT.md`](evidence/bloom-038/REPORT.md) §5).
  - An interaction / affordance inventory of 28 screens.
  - A copy-density inventory.
  - A measured pause / speed audit.
  - 19 deterministic failure states with the exact UI text.
- **Supporting probes.** A readout-honesty measure over every region of every sample world (at landing and at run end), and a
  stand-off escape probe.

Evidence paths are given per finding. Everything is deterministic and reproducible (REPORT.md §2).

---

## 1. Top 10 findings by impact

| # | Finding | Sev. | Class |
|---|---|---|---|
| 1 | **Native Competition stand-offs**: 45 % of Native Competition runs never end (no Bloom, no extinction) and nothing on screen points to the way out | **P1** | strategy · information |
| 2 | **The region readout misleads at landing**: "No offered upgrade opens it right now" on 37 % of the land; 13 % of the land is opened by simply buying the named answer twice | **P1** | information |
| 3 | **Volatile Climate is rarely volatile**: 0 shocks in 200 runs of five policies; plays like an ordinary Expedition | **P1** | strategy · Challenge differentiation |
| 4 | **A hidden or frozen tab catches up all elapsed time in one burst**: a Challenge can be lost while the player is away | **P1** | interaction |
| 5 | **Endgame waiting**: Thin Air's hold is pure clock-waiting (median 75 s); Ocean Archipelago spends 33 % of a won run after the problem is solved | P2 | pacing |
| 6 | **Low decision density**: about 5 purchases per 4½-minute run, one every 48 s; about 89 % of a run is spent saving for the next one | P2 · HUMAN | pacing |
| 7 | **Dying World's decline rarely bites**: players Bloom at a median 77 % of the decline; 0 extinctions and 0 reversals in 280 runs | P2 | Challenge differentiation |
| 8 | **Ownership and state hidden or ambiguous on the map**: the banner hides the selected region; native-held regions show ✓ and "Nothing holding the plant back" | P2 | visual · information |
| 9 | **Copy that gives a wrong instruction or four names for one state**: "Pick a growth focus … on the left" on every landing; one severity read as stressful / Dangerous / Strained / Blocked | P2 | information |
| 10 | **2560 composition**: the map scales but the HUD and labels do not; rooms stretch into empty blocks; primary actions sit 1,000–1,250 px from their targets | P2 | visual |

There is **no P0**: nothing is release-breaking, and every run type can be completed. The four P1s are listed in full in §2.

---

## 2. P1 findings

### P1-1 · Native Competition stand-offs (strategy · information) — HUMAN PLAYTEST NEEDED

**Evidence** (`pacing-study.json` `challenges.byChallenge.native_competition`, `failure-state-audit.json` `standoffEscape`,
`failure-ui.json` `states.native_takeover`):

- **Outcomes.** Of 280 Native Competition runs, 52.9 % Bloom, 1.8 % go extinct and **45.4 % stall until the 60-minute cap**.
- **Where they stall.** At a median **57 % coverage** (p90 67 %; 33 of 127 stalled runs at ≥ 65 %), against a stable native front.
  "No useful action" time is a median 3,161 s in stalled runs.
- **Concentrated on desert bank worlds.** Bloom rate by species × world in the sample:

  | Species | Desert Bloom rate | Frozen Bloom rate |
  |---|---|---|
  | Cinder Rosette | 17 % | — |
  | Organic Hybrid | 37 % | — |
  | Woolly Candle | 77 % | — |
  | Reed Spire | 74 % | 86 % |

- **Every stalled world is provably winnable.** The bank's offline proof wins each one, typically with a counter-intuitive Terraform
  *against the natives*. Example: entry 0, Organic Hybrid: Seed Output · Radiation · Heat · Drought ×2 · **Dry the Sky** on a desert
  world, because the drier sky hurts the wet-adapted natives more than the plant.
- **Escape probe.** In **34 of 39** stalled runs, one or two steps of a single Terraform (Humidify / Dry / Cool ×2 most often) breaks
  the stand-off within 10 minutes. **0 of 39** recover on their own.
- **What the UI says** about a native-dominated region: "OK · Nothing holding the plant back · Nothing needed". The engine's own
  explanation ("The native plants are better suited to this ground than your plant…") appears only in the scenario card and the log.
- **Unverified.** The Terraform preview's "🌿 suits native plants less / more" line exists in the preview text; it is unverified
  whether the production Terraform room shows it before purchase.

**Frequency:** 45 % of Native Competition runs by the study's policies; Oasis Line 7 % (its prescribed Reed Spire handles it).

**Why it matters.** A released Challenge can enter a state with no win, no loss and no pointer, at "so close" coverage. The policies
are imperfect, but they read everything the screen offers. A human may find the Terraform answer. Nothing tells them to look for it,
and nothing ever ends the run.

**Likely fix size.** Small–medium, presentation only:

- a stand-off line in the competition card ("your front has not moved for 2 minutes — natives are better suited here; a sky change
  that suits them less can tip it");
- the competition reason in the region banner;
- the native shift in the Terraform room preview.

**Risk.** Copy / UI only → no seed-bank rebuild. Any mechanic change (a stand-off timer, native tuning) → a bank rebuild (~70 min) and
a new layer-P proof.

### P1-2 · The region readout misleads at landing (information)

**Evidence** (`failure-state-audit.json` `readoutHonesty`, `failure-ui.json` states `temp_cold` / `multi_factor` / `water_dry` /
`hazard_toxicity`):

- **"No offered upgrade opens it right now"** shows on 36.6 % of all land at landing (60 worlds × playable species).
- **For 13.1 % of the land it is false in effect.** The named answer opens the region at tier 2. Example: "Too cold", where Cold
  Tolerance opens it at tier 2 and Warm the Sky at tier 4. The banner's Would-help list only considers one step, and the game's
  older fix hint (`FIX_HINT`, "Adapt: Cold Tolerance — or Terraform: Warm the sky") is **never shown in the production UI**.
- **23.5 % of the land is blocked by two or more categories at once.** The banner names only the lowest. Fixing it alone cannot open
  the region (e.g. Cold Tolerance capped at 3 points while Water is also failing).
- **"Blocked" while being colonised (3.1 % of land at landing, 4.8 % at run end).** "Blocked" is any single factor below 0.72, but
  plants grow when the product of factors exceeds 0.55. These regions show "Blocked · would not survive yet" while filling 100 % with
  no purchase. Example: Spring Reach, 102 / 102 tiles. The map lamp ("!") and condition box ("Strained") then disagree with the
  "Blocked" pill.
- **Toxicity** shows only as "hazard is lethal"; nothing says that no trait addresses it (1–3 % of land).
- **What it gets right.** The opposite error — "Nothing holding the plant back" on ground that cannot grow — never happens (0.0 %).

**Frequency:** every run's opening minutes. Mid-run the misleading share falls to 0.7 % of land.

**Why it matters.** The core loop is "see the barrier → buy the answer → watch spread resume". At the moment players learn it, a third
of the planet says nothing helps.

**Likely fix size.** Small, presentation only:

- multi-step Would-help ("Cold Tolerance ×2 opens it");
- the "Blocked" pill keyed to whether plants can grow (or a distinct "slowed" state);
- "toxic — no cure" wording.

**Risk.** Low. No engine change, no bank rebuild.

### P1-3 · Volatile Climate is rarely volatile (strategy · Challenge differentiation) — HUMAN PLAYTEST NEEDED

**Evidence** (`challenge-comparison.json`, `pacing-study.json` `challenges.byChallenge.volatile_climate`):

- **Shocks almost never fire.** 0 shocks in 200 runs of the balanced, adapt-first, spread-first, greedy and colony policies, even
  though they bought 88 Terraform steps between them; the greedy policy ignores the climate preview entirely. Shocks came only from
  terraform-first (26 of 40 runs) and low-planning (5 of 40). Overall, 11 % of runs saw a shock, and 87 % never left the first band.
- **It plays like an Expedition.** Volatile Climate vs ordinary Expedition: action-mix cosine 0.93, coverage curve within 1.8 points.
  Volatile Climate vs Dying World: cosine 0.995, curves within 0.6 points. 98.9 % Bloom, median 225 s, no extinctions.

**Why it matters.** The Challenge's identity mechanic, shocks from over-Terraforming, is absent from most play. The decision it asks
for ("Terraform carefully") barely arises, because ordinary play rarely stacks two Terraform steps on one axis within the forcing
memory. Similarity alone is not proof of a problem: the restraint *is* the decision. But the restraint costs nothing here.

**Likely fix size.** Medium. This is a design decision: shock threshold, forcing memory, or a planet that *needs* stacked Terraform.
Any of these is a mechanic change.

**Risk.** Seed-bank rebuild + a new layer-P proof; possible knock-on to Low Tide / Oasis Line Terraform play. Playtest first.

### P1-4 · A hidden or frozen tab catches up all elapsed time in one burst (interaction)

**Evidence** (`pause-audit.json` `A.frozenPage5s`; `resources/run/game-session.js` main loop): the run loop accumulates
`dt = ts − last` with no clamp and no `visibilitychange` handler. A page frozen for 5 s simulated 33 ticks the moment it came back. A
tab left for 10 minutes simulates 10 minutes instantly on return.

**Frequency:** whenever a player switches tab or the laptop sleeps. Common in classrooms.

**Why it matters.** In the four Challenges with pressure or loss, the run can lose ground, or go extinct, in a burst the player never
sees. There are no saved runs to fall back on.

**Likely fix size.** Tiny: clamp `dt`, or pause on `document.hidden`. This is the run shell, not the simulation rules.

**Risk.** Low. Bank and proofs are unaffected. Pausing on hidden changes real-time feel only.

---

## 3. Strongest P2 opportunities

1. **Endgame waiting** (pacing, §5).
   - Thin Air: 77 % of runs reach 70 % early, then hold a median **75 s** (p90 127 s) while coverage keeps rising to about 88 %. The
     win lands at exactly the decline's end (290 s) in almost every run. No run lost an early Bloom.
   - Ocean Archipelago Expedition: a median 123 s (33 %) of a won run comes after the problem is strategically solved, mostly Seed
     Output / Early Maturity "speed" buys; 29 % of won Ocean runs are flagged.
   - Fix: a presentation layer for the hold (Thin Air: show the settle countdown as the goal; let the player watch the atmosphere
     finish), or a design decision on threshold / clock.
2. **Low decision density** (pacing, HUMAN): about 5 purchases per Expedition run (meaningful: 4), a median gap of 48 s, first
   purchase at about 40 s, about 89 % of the run spent saving for the chosen next purchase. This is the core rhythm. Whether watching
   feels satisfying is a playtest question.
3. **Dying World's decline rarely bites** (Challenge differentiation, §9): the median Bloom lands at 77 % of the decline (p10 51 %);
   0 extinctions; 0 runs with a coverage reversal. Thin Air exists precisely because of this; Dying World itself could show the
   decline more, or end later.
4. **Map state hidden by panels / ambiguous ownership** (visual, §11):
   - the selected-region banner covers the selected region in several geometries (24 % of the world at 1024; the map does not pan);
   - the Training coach sits over the banner;
   - region pills show ✓ on regions the natives fully hold.
5. **Wrong or inconsistent copy** (information, §13):
   - the landing message "Pick a growth focus for this colony **on the left**" (stale from the engineering shell; shown on every
     landing including Training);
   - one severity read four ways on one banner;
   - Thin Air's scenario card is titled "Dying World".
6. **Terraform-led play is dominated** (strategy, §7): terraform-first is a median 49 % slower than the best policy on the same
   world, stalls in 14.6 % of Expeditions and spends 1,240 vs 840 Biomass. Terraform is healthy as *support* (it opened land in 54 % of
   runs; 87–94 % in the Native Competition Challenges). HUMAN: does the "terraformer" fantasy disappoint?
7. **Oasis Line ≈ Native Competition with Reed Spire on desert** (§9): action-mix cosine 0.989, coverage curves within 2.4 points.
   Different framing, near-identical play; Oasis Line Blooms more often (93 % vs 74 %).
8. **2560 surplus** (§12): the HUD stays at 16–30 px type over a 33 px-tile map; rooms stretch to leave a 1,136 × 832 empty block;
   planning panels stop growing at 67–73 % bare screen.
9. **Weak critical information** (§11): the extinction countdown is 13 px red text in the scenario card; the message footer is one
   truncated line (141–372 characters ellipsised) and is the only place some state changes are announced.
10. **Unaffordable nodes give no reason at rest; low Biomass is never mentioned in the banner** (§13).

---

## 4. Investigated and found healthy (NO ISSUE)

- **Early game.**
  - First meaningful decision at a median **28 s** (p90 39 s); first purchase at **40 s** (p90 62 s), in Expedition and Challenges
    alike.
  - No "nothing to do" opening: the no-useful-action time is 0 in ≥ 75 % of Expedition runs.
- **Expedition is forgiving.** 96.5 % of all bot runs Bloom (desert 99.5 %, frozen 99.6 %, ocean 90.3 %), including the
  low-planning policy (99 %). Imperfect play is not punished into dead ends.
- **Species are behaviourally distinct** (§8).
  - Between species, on the same world / policy / seed, purchase sequences agree 0.39–0.56. Within one species across run seeds:
    0.81.
  - A blind classifier names the species from purchase counts alone 46 % of the time (chance 25 %), and 61–67 % within an archetype.
  - Each specialist is the fastest on its home archetype: Cinder Rosette on desert, 185 s; Woolly Candle on frozen, 185 s; Reed Spire
    on ocean, 310 s.
- **Colony development is optional and mildly useful.** Leaves focus + Leaf Canopy is a median 3 % faster than balanced (faster in
  64 % of pairs) — a real but not mandatory layer.
- **Rooms pause, and scenario clocks freeze inside them** (Dying World progress, extinction countdown, pending shock, Thin Air settle
  timer).
- **Readout never claims "clear" on ground that cannot grow** (0.0 %).
- **Messaging that works:** too hot, salt, unreachable land (Waterborne Seeds suggested), Dying World late decline (the suggestions
  really open the region), and the extinction report (names the reason).
- **Target sizes:** nothing under 24 px except three Settings radio inputs, whose labels are clickable. **Map labels never overlap
  each other** (the renderer pushes them apart).
- **Low Tide is distinct:** action-mix cosine 0.70 vs Dying World, its starting state changes the opening; 98.6 % Bloom.
- **Training:** 123 s, 3 purchases, every policy Blooms.
- **Run length:** Expedition median 4.4 min at 1× (p90 8 min). No-save risk is minor (§15).

---

## 5. Pacing (E) and endgame cleanup (F)

`pacing-study.json`; game seconds at 1×; median (p25–p75, p90).

| Metric | Expedition (3,346 runs) | Challenges (1,050) | Training (28) |
|---|---|---|---|
| first meaningful decision | 27.8 (21–33, 39) | 26.9 (23–31, 40) | 1 |
| first purchase | 40.3 (30–49, 62) | 40.3 (31–48, 60) | 4.8 |
| first Adapt / Spread / Terraform | 45 / 124 / 156 | 47 / 130 / 162 | 5 / 51 / 107 |
| never Spread / never Terraform | 29 % / 45 % | 23 % / 35 % | — |
| median gap between purchases | 48 (41–57, 70) | 49 | 41 |
| longest gap in a run | 73 (62–86, 104) | 75 | 54 |
| share of run saving for the next target | 89 % | 88 % | 85 % |
| time to 25 % / 50 % coverage | 123 / 203 | 143 / 218 | 58 / 101 |
| 50 % → 70 % | 45 (29–74, 134) | 46 | — |
| Bloom | **264 (206–358, 475)** | 278 (210–372, 531) | 123 |
| purchases (meaningful) per run | 5 (4) | 6 (4) | 3 (3) |
| repeated identical purchase types | 1 | 1 | 0 |
| outcome | 96.5 % Bloom · 3.5 % stall | 85.5 % Bloom · 0.5 % extinct · 14 % stall | 100 % Bloom |

By archetype, Expedition Bloom times are: desert 224 s · frozen 236 s · **ocean 390 s** (50 → 70 % alone takes 78 s). By survey class:
Favorable 247 · Precarious 261 · Extreme 276 s. Classes differ by under 30 s, so the survey's difficulty axis barely changes run
length (P3: worth knowing when describing classes).

**Endgame (F).** "Solved" = the first moment from which growable *and* reachable land stays ≥ 72 % until the end (the plant only has
to fill it). Won runs:

| | solved → Bloom | share of run | pure waiting after solved | flagged (tail after last strategic decision ≥ 33 % and ≥ 90 s) |
|---|---|---|---|---|
| Expedition | 61 s (27–115, 185) | 24 % | 17 s | 12 % |
| Ocean Archipelago | 123 s | 33 % | 31 s | **29 %** |
| Desert / Frozen | 32 / 55 s | 13 / 24 % | 12 / 14 s | 2 / 7 % |
| Thin Air | 110 s | 36 % | 32 s | 13 % |
| Native Competition | 217 s | 49 % | 16 s | 0 % (purchases continue) |

Coverage after "solved" is monotonic in 99.8 % of runs: once solved, the run never reverses. Purchases after the solved point are
mostly speed (Seed Output, Early Maturity: 2,375) and further opening buys (1,685). This is **repetitive spreading, not decisions** in
Ocean and Thin Air. The last strategic decision falls at a median 57 % coverage.

## 6. No-save risk (N)

| | median | p75 | p90 | longest ordinary success |
|---|---|---|---|---|
| Expedition (1×, game time) | 4.4 min | 6.0 | 7.9 | 24 min (Ocean, terraform-first) |
| Expedition incl. room / reading time (est. ~20 s per purchase) | ~6 min | | | |
| Dying World / Volatile Climate / Thin Air | 3.7–4.8 min | 4.4–4.8 | 5.5–5.8 | 12 min |
| Low Tide | 5.4 | 7.9 | 9.4 | 15 min |
| Native Competition / Oasis Line (wins) | 7.6 / 8.3 | 9.6 / 10.6 | 11.3 / 12.2 | 20–21 min |

2× / 4× speed shortens the game-time part further. **"No saved run / Continue" stays a minor limitation (P3)** for Expedition and
for every Challenge that ends. The exceptions:

- The **Native Competition stand-off** (P1-1) has no end, so it is a sharper no-save problem: the only way out is to abandon the run.
- A sleeping laptop or switched tab interacts badly with P1-4.

## 7. Dominant strategy (G)

`strategy-study.json`: 478 Expedition cells (world × species × run seed); every policy plays each cell.

| Policy | Bloom | median slower than the cell's best | stalls (timeout) | median Biomass spent at Bloom | fastest in N cells |
|---|---|---|---|---|---|
| colony (balanced + Leaves / Leaf Canopy) | 98.1 % | **+4.5 %** | 1.9 % | 1,100 | **166** |
| greedy (buy the biggest visible gain now) | 97.9 % | +8.5 % | 2.1 % | 990 | 144 |
| balanced | 98.1 % | +9.8 % | 1.9 % | 840 | 48 |
| adapt-first | 98.3 % | +11.2 % | 1.7 % | 840 | 51 |
| spread-first | 98.5 % | +15.9 % | 1.5 % | 960 | 42 |
| low-planning | 99.0 % | +35.4 % | 1.0 % | 1,050 | 18 |
| **terraform-first** | 85.4 % | **+49.1 %** | **14.6 %** | 1,240 | 6 |

- **No single opening dominates the game; the archetype dictates it.** The fastest opening per cell is Drought ×2 or Drought ›
  Radiation on desert, Cold ×2 or Cold › Seed Output on frozen, and Waterborne Seeds › Seed Output on ocean.
  - In winning runs, Drought appears in 90 % of desert wins and Cold in 94 % of frozen wins.
  - On ocean, Waterborne Seeds appears in 100 % of wins, Seed Output 99 %, Salt Handling 92 % and Early Maturity 89 %: a
    near-mandatory four-purchase sequence (P2: Spread on ocean is "always purchased in the same sequence").
  - Answering the planet's dominant limit is a **healthy common strategy**. Ocean's fixed Spread sequence is closer to **mechanically
    dominant**.
- **Terraform is never the best lead but is often a necessary supplement:**
  - it opened land in 54 % of runs;
  - Terraform made up 23 % of all purchases;
  - it was essential in Native Competition (87 % of runs) and Oasis Line (94 %).
  - "Terraform almost never useful" is **false**; "Terraform-led play is dominated" is **true** (P2, HUMAN).
- **Adapt is not strictly superior.** Adapt-first ≈ balanced (+11 % vs +10 %); greedy without saving is nearly as fast. Saving up
  for an expensive answer is rarely rewarded, so planning depth matters little (P3 for a middle-school audience; note for difficulty).
- **Every trait is bought in some winning run**: no dead purchase.
- **Tier 2+ is rarely needed:** Cold ×2 in 22 % of wins, Seed Output ×2 20 %, Drought ×2 10 %; other second tiers ≤ 6 %. Tier 3
  appears in under 5 %.
- **One statistic alone is not a verdict.** The colony policy being fastest reflects a real, cheap economy layer. It is not
  mandatory: balanced wins as often.

## 8. Species gameplay differentiation (H)

`species-comparison.json`: 59 sample worlds playable by all four species; same world / policy / run seed compared across species.

| Pair | sequence similarity | trait-mix cosine | same first purchase |
|---|---|---|---|
| Organic Hybrid ~ Reed Spire | **0.56** | 0.82 | 69 % |
| Organic Hybrid ~ Woolly Candle | 0.46 | 0.77 | 61 % |
| Organic Hybrid ~ Cinder Rosette | 0.43 | 0.76 | 60 % |
| Woolly Candle ~ Reed Spire | 0.39 | 0.74 | 47 % |
| Cinder Rosette ~ Woolly Candle | 0.39 | 0.68 | 50 % |
| Cinder Rosette ~ Reed Spire | 0.39 | 0.72 | 45 % |
| *same species, other run seed (noise floor)* | *0.81* | *0.94* | — |

**If labels and art were hidden, would the trajectories still look different? Yes.**

- A nearest-centroid classifier on purchase counts names the species 46.5 % of the time (chance 25 %); 61–67 % within one archetype.
- Typical adaptation sequences differ:
  - Woolly Candle: Cold › Heat / Drought › Heat;
  - Cinder Rosette: Drought › Radiation (› Salt);
  - Reed Spire: Salt › Radiation › Heat;
  - Organic Hybrid: Cold › Cold.
- Terraform share is similar for all four (21–26 %).
- Failure causes differ: Reed Spire stalls on lethal hazard; Cinder Rosette on wet / freezing ground.

**P3 observation:** Organic Hybrid and Reed Spire are the closest pair (Reed Spire's opening on dry / frozen worlds is the
generalist's), and the archetype still sets the first purchase for every species on desert (all four lead with Drought). Not a
problem: the specialists separate in purchases 2–4.

## 9. Challenge differentiation (I)

`challenge-comparison.json` (first 10 bank worlds per cell × 7 policies).

| Challenge | Bloom / extinct / stall | median duration | Adapt / Spread / Terraform | coverage curve | signature behaviour |
|---|---|---|---|---|---|
| Dying World | 96 / 0 / 4 % | 232 s | 62 / 22 / 16 % | = Volatile Climate (0.6 pt) | Bloom at 77 % of the decline; 0 reversals |
| Native Competition | 53 / 2 / 45 % | 457 s | 39 / 27 / **34 %** | slow S-curve | stand-off (P1-1) |
| Volatile Climate | 99 / 0 / 1 % | 225 s | 59 / 22 / 19 % | = Dying World / Expedition | 11 % of runs see a shock (P1-3) |
| Low Tide | 99 / 0 / 1 % | 325 s | 26 / **43** / 31 % | fast start, long tail | starting state shifts play to Spread and Terraform |
| Oasis Line | 93 / 0 / 7 % | 495 s | 43 / 21 / 36 % | = Native Competition (2.1 pt) | Native Competition with a prescribed plant |
| Thin Air | 99 / 0 / 1 % | **290 s (fixed)** | 63 / 20 / 18 % | climbs to 88 % | 77 % reach Bloom early, hold 75 s; 0 lost after an early Bloom |

The focus pairs the brief asked about:

- **Dying World ~ Thin Air** (Woolly Candle, desert + ocean): identical decisions (cosine 0.995, 89 % same first purchase). The only
  difference is *when the win counts* (coverage curves 12.6 points apart because Thin Air keeps growing while it holds). The completion
  contract changes **timing, not decisions**: the hold is waiting (P2, §3.1). Thin Air is still the one place Dying World's late
  decline is actually experienced.
- **Native Competition ~ Oasis Line**: near-identical trajectories (cosine 0.983–0.989; curves within 2.1–2.4 points). Oasis Line's
  framing (prescribed Reed Spire, no arrival floor) produces the same play as the Native Competition / Reed Spire / desert cell (P2).
- **Volatile Climate**: indistinguishable from Dying World and from an ordinary Expedition for any policy that does not lead with
  Terraform (P1-3).
- **Distinct and healthy:** Low Tide (its starting state changes the opening and the action mix); Native Competition (its own curve
  and Terraform-heavy mix).

Note: the first 10 bank entries of the Native Competition and Oasis Line cells are mostly desert worlds (the bank holds all three
archetypes), and the Dying World / Organic Hybrid cell's first 10 contain no ocean world (so Low Tide's same-archetype comparison is
empty).

## 10. Failure-state clarity (J)

`failure-state-audit.json` (19 UI states + sim readout + escape probe); screenshots in `failure-ui/`.

| State | names the true cause? | symptom vs root? | offers a real action? | player can infer? (HUMAN) | notes |
|---|---|---|---|---|---|
| too cold | yes | n/a | **no** — "No offered upgrade opens it" although Cold Tolerance ×2 does | partial | P1-2 |
| too hot | yes | n/a | yes | likely | works |
| too dry / too wet (factor 0.55–0.72) | yes | **no** — "Blocked" while the plant colonises it | no — the one-tier fix is not suggested | unclear | P1-2 |
| salt | yes | n/a | yes | likely | works |
| pH-only soil | — | — | — | — | no example in 84 worlds (pH never binds alone) |
| radiation | yes, but four words for one severity | — | partial | partial | P2 copy |
| toxicity | partly ("hazard is lethal") | — | no; nothing says "no cure" | no | P2 |
| multi-factor | partly: only the lowest named | no | no — the named fix cannot open it | no | 23.5 % of land at landing |
| protected refuge | lamp vs pill disagree | — | — | — | P2 |
| no reachable land | yes | yes | yes (Waterborne Seeds) | likely | works |
| low Biomass | **not mentioned in the banner** | — | "Needs 140 Biomass" only on hover in the room | partial | P2 |
| native takeover | **no** — "OK · Nothing holding the plant back" | no | no | no | P1-1 |
| Dying World late decline | yes | yes | yes | likely | works |
| Volatile Climate shock (warning / active) | card + log only; the banner is silent | partial | — | partial | log keeps an emoji "⚠ 🌪" |
| Thin Air early Bloom then coverage loss | yes (HOLDING) | — | — | partial | card titled "Dying World"; "Final atmosphere: 68 % · Bloom 62 % / 70 %" packs two percentages |
| extinction warning / report | yes | yes | — | yes | countdown is 13 px (P2); report names the reason |

**Look-alikes across mechanics (q5):**

- the extinction-warning crimson is the "Blocked" pill colour;
- the `pressure` icon serves both the Dying World card and Thin Air's completion line;
- every log line uses the same info icon;
- the selection outline and the scenario / threshold outlines are all dashed: at least eight outline styles (dashed black / white,
  green, orange, red / white, white / green; solid orange, magenta, green) carry different meanings (P2, HUMAN).

## 11. Visual heuristics (B) and the visual atlas (A)

`visual-atlas-index.json` (363 captures across 44 scenes, all four species, all three archetypes, Expedition + six Challenges +
Training, every run phase from landing to extinction report, every room, 1024 / 1440 / 2560 + 390 for the planning screens; per-shot
geometry), contact sheets in `visual-atlas/contact/`.

**P2**

- **Panels hide the selected region.**
  - The banner sits over the selected region in several geometries: H3 Marsh Expanse at all three sizes; C2 native region at
    1024 / 1440 / 2560. At 1024 the banner covers 24 % of the world, and the map does not pan.
  - The Native Competition card covers the refuge label in C7 at 1024.
  - The Training coach covers the banner's Water / Hazard boxes.
  - (The affordance audit's own sample found no such overlap; it is geometry-dependent, not universal.)
- **Ownership ambiguity:** region pills show ✓ ("suits your plant") on regions the natives fully hold (C5 Sienna Playa, Glass Dunes):
  the lamp reads as ownership (HUMAN).
- **One motif, many meanings:** at least eight dashed / solid outline styles (§10) coexist on the map during a Challenge (C5-mid,
  C3-shock) (HUMAN).
- **Critical information too weak:**
  - the extinction countdown is 13 px red inside the 300 px card;
  - the message footer is the only place for lines like "Lichen Hollow is now too hostile", and is ellipsised at every viewport
    (141–372 characters).
- **Phone (390):** on the Destination Survey grid and focus screens the "Destination Survey" title is drawn over the
  "Organic Hybrid · Change" chip (two separate captures, so not a transition frame).

**P3**

- Region labels extend past the world edge (1.5 per 1024 base capture) and are occasionally clipped by the viewport (Willow Moraine,
  the origin, in C2).
- Late-run cover renders as a grid of square stand marks over ground, a busy checker (H2-nearBloom) (HUMAN: charm vs noise).
- Seam-split regions on the cylinder: a region cut at the left / right world edge reads as two (H3; the H1 selected-region box spans
  960 px) — **not** the fixed multiple-copies issue (HUMAN).
- At 1440 the run header holds at normal Biomass, but a five-digit Biomass (long Keep-playing) widens the pill until the toolbar
  meets the play button; the Challenge subtitle truncates ("Native Competiti…").
- Long single-line hub lede (154 characters at 1440 / 2560).

**Not re-reported** (already fixed in v1.0.1): repeated map copies, frozen water vs frozen land, stretched planning panels — none
recurs in the atlas.

## 12. 1024 full run (C) and 2560 surplus space (D)

**1024 × 768** (`run1024.json`, `visual-atlas/run1024/`).

- **Expedition, complete and played like a player** (Hollow-981, ocean, Organic Hybrid): Bloom after 4 m 59 s of game time and about
  7 minutes real time.
  - 4 purchases at 3–4 clicks each: banner → Would help → node → Resume; the toolbar path is 3 clicks.
  - Every button and node was reachable inside the viewport; room content scrolled internally 6 times.
- **Cramped but valid.**
  - The world takes 78 % of the viewport, at 16 px tiles.
  - The banner is 780 × 190 px (24 % of the world); scenario card + banner leave 71 % of the world visible.
  - The header's room buttons collapse to unlabelled icons.
  - The Map View legend clips the top-right labels.
  - Region Inspect uses 8.1 px small caps and 9.6 px notes.
  - Adapt sub-labels truncate ("Tier I owned · next 2…").
  - The Terraform "Considering for" chips cut.
  - The report body scrolls and "Why it worked" starts below the fold.
  - All P2 / P3; nothing blocks play.
- **Native Competition at 1024:** the scripted player stalled at about 30 %, consistent with P1-1. That reflects the auto-player, not
  a layout fault.

**2560 × 1440** (`surplus2560.json`, `visual-atlas/2560/`, each state also measured at 1440 and 1920).

- **The map scales; the information doesn't.** Tiles grow to 33 px (the world is 71 % of the viewport, with 290 px letterbox each
  side), while labels stay 14 px and HUD numbers 16 / 30 px. Status reads tiny against a huge map (P2).
- **Planning panels stop growing.** Banner 940 px, report 900 px, survey dossier 500 px, species dossier 1,040 px, hub ≈ 1,380 px. The
  bare share is 0.67–0.73 (survey: a 608 × 1,440 empty band) (P2/P3: intentional caps, but the composition reads sparse).
- **Rooms do the opposite: they stretch.** The central card grows 601 → 1,096 px while the node column does not: a 1,136 × 832 empty
  block in Spread, white letterbox on the mini-map, the bottom 20 % unused (P2).
- **Primary actions far from their targets** (P2):
  - banner Would-help → selected region: about 970–1,250 px;
  - room Resume → nodes: 1,249 px;
  - survey Begin → the focused globe: 1,152 px.
- The survey's 3 × 3 grid is centred with about 25 % empty each side, and its header controls are pinned to the far corners (P3).

## 13. Interaction / affordance (K) and information density / copy (L)

**Affordance** (`affordance-audit.json`, 28 screens):

- **[P2] Unaffordable Adapt / Spread / Terraform nodes show only their price at rest.** The reason ("Needs 140 Biomass.") appears on
  hover / focus in the info card, and the node's `title` is the trait description.
- **[P3] Non-interactive boxes styled like the real buttons beside them:**
  - the banner's four condition boxes;
  - the gold Biomass pill;
  - Adapt category labels;
  - the PAUSED pill.
  - (179 "label resembles button" flags, mostly these.)
- **[P3] Map region-label pills look like buttons but are canvas paint.** A click lands on the tile beneath. On Ocean 28, 5 of 15
  pills have an end over another region or water, so clicking a label's edge selects the neighbour or deselects (HUMAN).
- **[P3] Clicking water gives no feedback.** It only clears the selection; the only cue is the cursor (`default` over water,
  `pointer` over land).
- **[P3] The scenario card looks like one big card, but only "Details" is clickable** (about 14 × smaller).
- **[P3] The three drag-to-rotate globes (survey dossier, Challenge dossier, Terraform) have no cursor / hover cue.**

**Copy** (`copy-density.json`):

- **[P2] Stale instruction.** The landing message "Pick a growth focus for this colony **on the left**" points at nothing: growth focus
  lives in the Regions room (`game-session.js:1173`, the engineering shell's wording). It appears on every landing, Training included.
- **[P2] One severity, four words.** On one hazard banner: limiting line "hazard is stressful", box reading "Dangerous", box status
  "Strained", pill "Blocked".
- **[P3] Densest screen:** the Challenge hub with Thin Air selected — 439 words, longest prose block 46 words.
- **[P3] Repetition across adjacent screens:**
  - hub → Challenge dossier repeats 2–4 whole sentences;
  - Adapt ↔ Spread rooms share 7 identical sentences;
  - Terraform shows "−18 °C" four times.
- **[P3] Internal wording:** "Physiology at a glance"; "World Seed NNNNN" on the survey, dossier, footer and reports; a "Scenario"
  label on the win report.
- **[P3] Concepts named before they matter:** radiation and salt on species cards; Terraform, natives, decline and extinction on the
  hub.
- **Recommendations** (simplify only; no copy written here):
  - one word per severity level;
  - show each Challenge sentence once (hub *or* dossier);
  - replace "World Seed" with nothing, or with a small "world #";
  - fix the landing pointer.

## 14. Speed / pause (M)

`pause-audit.json` (measured).

- **Speeds.** 1× / 2× / 4× from one button: 6.0 / 12.3 / 25.0 ticks/s measured. A run lands running at 1×.
- **All four rooms already pause the run.** 0 ticks while open; Back restores the prior state; a PAUSED pill shows.
- **What does not pause:** the selected-region banner (19 ticks in 3 s), Map View and lens preview, the run menu, the Would-help
  hover preview.
- **Inspection cost.** A typical sequence (select → read 4 s → hover Would help → Adapt → preview → buy → close) costs **6.2 s of
  run time from the map vs 0.16 s inside rooms**.
- **Scenario clocks freeze in rooms; the map's change outlines do not.** Outlines fade on wall-clock time (Thin Air: 5,098 → 1,095 ms
  during a room), so a player can return to a map whose "what just changed" cue is already gone (P3).
- **The deferred idea, as worded, is already the behaviour.** "Pause while a decision room is open" is listed as deferred, but rooms
  already pause unconditionally. The only open question is whether **the banner / Map View / run menu** should also pause (about 6 s
  saved per map inspection), or whether room pausing should become optional. **Worth human testing: yes, low priority.** In pressure
  Challenges the banner is where players read a region under threat, and that time costs run time. Correct the docs either way (P2,
  docs).

## 15. What automation cannot answer

These are marked **HUMAN PLAYTEST NEEDED** above. Telemetry cannot tell:

- whether 48-second gaps of watching the plant spread feel calm and satisfying or slow (P2-2);
- whether a human finds the Terraform answer to a Native Competition stand-off, and how long they try before quitting (P1-1);
- whether Volatile Climate's *threat* (the meter, the warnings) creates tension even when no shock ever fires (P1-3);
- whether Thin Air's 75-second hold reads as triumph ("hold it!") or as dead time (P2-1);
- whether the eight outline styles, the ✓ on native-held ground, the late-run checker texture and the seam-split regions confuse
  novices;
- whether the art, the pixel planet and the species feel charming;
- whether a middle-school player understands the four-category readout at all, and whether "Blocked" vs "Strained" vs "!" registers;
- whether the terraforming fantasy is disappointed by Terraform being a supporting rather than a leading strategy;
- whether players notice subtle cues: the footer message, the 13 px extinction countdown, the cursor change over water.

The policies are **imperfect stand-ins**, not players: a stall in the study means "a reasonable reader of the screen gets stuck here",
not "every human gets stuck". Win rates are lower bounds on human success where the answer is counter-intuitive, and upper bounds
where humans misread the UI.

## 16. Recommendations

**Next fixes BEFORE human playtesting** — presentation / shell only, no seed-bank rebuild, no balance change:

1. **Native Competition stand-off messaging** (P1-1): the competition reason in the region banner; the native shift
   ("suits native plants less / more") in the Terraform room preview; a stand-off line in the competition card when the front has not
   moved for a while.
2. **Region readout honesty** (P1-2): multi-step Would-help ("Cold Tolerance ×2 opens it"); a "Blocked" pill that agrees with whether
   plants can grow; "toxic — no trait cures this".
3. **Hidden-tab catch-up** (P1-4): clamp `dt` and/or pause while `document.hidden`.
4. **Copy fixes** (P2): the "on the left" landing line; one word per severity; Thin Air's card title; the visible reason on
   unaffordable nodes; Biomass in the banner when it is the only blocker.
5. **Map state** (P2): pan or offset the banner when it covers the selected region; keep the Training coach off the banner.
6. **Docs:** correct the "pause while a decision room is open" deferral wording (§14).

**Design decisions to take only after playtest data** (mechanic changes → bank rebuild, new proofs): Volatile Climate's shock
threshold / forcing (P1-3); Dying World's decline timing (P2-3); Thin Air's hold (P2-1); Ocean Archipelago's Spread sequence and long
tail (P2); Oasis Line's distinctness from Native Competition (P2); 2560 HUD scaling and room layout (P2, UI only, larger).

**Questions for the eventual human playtest**

1. Native Competition: when your front stops moving, what do you try? Did you ever try a Terraform to weaken the natives? When did you
   give up?
2. Volatile Climate: did you feel the climate was dangerous? Did you avoid Terraform because of the meter? Did you see a shock?
3. Thin Air: when "HOLDING" appeared, what did you think you had to do? Did the wait feel tense or empty?
4. At landing, pick a blocked region: what does it need? (Probe "No offered upgrade opens it", multi-factor, "Blocked" vs growing.)
5. Between purchases, what were you doing? Did you want to buy more often, or did the waiting feel right?
6. Which region does your plant own and which do the natives own? (Probe ✓ pills and outline meanings.)
7. Did you notice the message footer? Read one line back.
8. Did you ever click water or a region label? What did you expect?
9. Did you switch tab or step away mid-run? What did you find when you came back?
10. Did the species you chose feel different from the last one? How?
11. Ocean Archipelago: after the plant had crossed to every island, what were you doing until the Bloom?
12. At 1024 and at a large monitor: was anything hard to find or too far from where you were looking?
