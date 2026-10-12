# BLOOM-036C1 — First authored Challenges (Low Tide · Oasis Line): REPORT

**IMPLEMENTED / COMPLETE** — PMO-accepted for release (with the REFUGE presentation correction, §9) and fast-forwarded into production `main` at
`d69d458` (from `d8ca0cb`); integration record §10. No completion-condition, medal, scoring or progression work.

## 1. Integrated study

PMO accepted the 036C content study. `origin/main` was `a91c6d0`, `handoff/bloom-036c-content-design` `d8ca0cb` (1 ahead / 0 behind); `main` was
fast-forwarded to exactly `d8ca0cb` (no merge commit, squash, rebase, cherry-pick or force push), pushed, converged; the study worktree, local branch
and remote review branch were removed after proving `d8ca0cb` is in `main`.

## 2. What shipped on the candidate

| | |
|---|---|
| **Released Challenges (hub order, not a ranking)** | Dying World · Native Competition · Volatile Climate · **Low Tide** · **Oasis Line** — equal cards, no basic / advanced split |
| **Low Tide** (`low_tide` v1) | Dying World · prescribed Organic Hybrid · Ocean Archipelago only · Flood Adaptation + Salt Handling given at landing · normal Biomass · normal Bloom |
| **Oasis Line** (`oasis_line` v1) | Native Competition · prescribed Reed Spire · Desert World only · **no 20 % arrival floor** · normal start · normal Bloom |
| **Windfall** | **HOLD** after the focused recalibration (§3) — not in the catalogue |
| **Thin Air** | RESERVE (PMO) — not implemented, no hub card |

Player-facing copy is the PMO-locked text (no polish was needed). Icons: each authored Challenge reuses its scenario family's glyph (Low Tide
`pressure`, Oasis Line `competition`); no new icons.

**Code** (`1057c07`, QA fixes `3c0adde`):
- `content/challenges.js` — the two Challenges; Native Competition strategic idea + Volatile Climate tagline / briefing / strategic idea (→ v4).
- `resources/bloom-challenges.js` — `closedByStart(ch)`: the plant traits a prescribed start closes, decided by the engine (`canBuy` / `why` from a
  normal start vs that start; Low Tide → Drought Adaptation). Nothing hard-coded.
- `resources/challenges/challenge-world-screen.{js,css}` — the dossier says what the start closes ("Drought Adaptation is not available: a plant
  commits to one water strategy — Flood is already chosen."); the low-arrival line when under 5 % suits the plant (true share kept).
- `resources/challenges/challenge-hub.{js,css}` — How the run works names what a start closes; the card list scrolls on its own on desktop so the
  dossier and BEGIN CHALLENGE stay in view with five cards (found by QA at 1024 × 768).
- `resources/run-ui/run-report.js` — the summary names the Challenge ("… in the Low Tide Challenge …"); tiers the Challenge gave are marked
  *given* on their chips. `resources/run/game-session.js` — the landing note names Biomass as given only when the Challenge prescribes it (QA found
  Low Tide's report claiming the normal 100 Biomass as a gift).
- `tools/build-challenge-seed-bank.mjs` — cells only for the species a Challenge allows (a prescribed plant = one cell; otherwise phantom cells such as
  `low_tide/cinder_rosette` would be "short" and mark the bank provisional). `tools/challenge-bank-report.mjs` text.
- `dist/portable/` rebuilt (`check:portable` identical).

## 3. Windfall recalibration — HOLD

Full table: [`windfall-recalibration.md`](windfall-recalibration.md). Same 120 World Seeds (40 per archetype) for 200 / 225 / 250, the studied 400
and the released start; full offline Challenge proof; strategy diagnostics on 10 worlds per archetype (the released start re-measured identically).

- **Supply (gate A): passes** at 200 / 225 / 250 — every species ≥ 79.7 %; Cinder Rosette's thin Desert column is the released start's own.
- **Premise (gate B): fails** at every setting. A *shocked winning strategy* is as available as from the released start (200: 22 · 25 · 54 · 14 %
  vs 21 · 27 · 67 · 13 %); the first-witness shock rate roughly doubles only for Organic Hybrid; strategy diversity unchanged; the reserve is spent at
  landing on the same strategies, which simply arrive sooner (same-world medians 2–40 s faster; 11–19 % of worlds refused as won before the 240 s
  floor).
- **Decision: WINDFALL REMAINS HOLD**; release Low Tide + Oasis Line (PMO: no return to PMO for a two-Challenge batch).

## 4. Production seed bank

`node tools/build-challenge-seed-bank.mjs --per-archetype 160 --workers 12` (wall 41 min, 12 workers, git `d8ca0cb` + the content) →
`content/challenge-seed-banks.js`: **14 cells × 50 = 700 entries**, 364 165 bytes, sha256
`5cd2e385963abcfdaf2a3bd5191f721ae2207b2c17510ef93cb1420737d1bcf3`, inputs `1d2974cdecae151b`, **not provisional**; `--check` byte-identical;
[`../bloom-036b/seed-bank/BUILD_REPORT.md`](../bloom-036b/seed-bank/BUILD_REPORT.md) regenerated (the builder's living cache location).

| Cell | Qualifying in the pool | Retained | Notes |
|---|---|---|---|
| `low_tide/organic_hybrid` | 78 of 155 Ocean worlds | 50 (Ocean 50) | proven FROM Flood + Salt (provenance `|start:flood+salt:-`) |
| `oasis_line/reed_spire` | 113 of 155 Desert worlds | 50 (Desert 50; 44 Extreme, 6 Precarious) | full Native Competition proof + confirmations |
| the 12 released cells | unchanged | 50 each | **entries byte-identical to `main`'s bank**; Native Competition / Volatile Climate provenance `challengeVersion` 3 → 4 only |

**Versioning decision.** A Challenge's `version` is the definition's revision, presentation included (content/challenges.js contract), and every
bank cell's provenance carries `challengeVersion`. The copy corrections therefore bumped Native Competition and Volatile Climate to **v4**, which
made their cells stale; they were **rebuilt** (no special case, no bypass). Result: the same 50 worlds per cell with the same proofs — only the
provenance changed. Dying World (copy unchanged) stays v3, its cells untouched.

**Low Tide start proof** (challenge-world-check A2, A6, A7): Flood Adaptation and Salt Handling owned at landing through the engine's own rule,
never paid for (spent 0, normal 100 Biomass); Drought Adaptation refused by the engine ("a plant commits to one water strategy — Flood is already
chosen") while buyable from a normal start on the same world; the cell's S2 and layer P were proven from that start (entry ocean 40240: arrival 33 %
from a normal start → 61 % with the given start); the Adapt room shows Flood + Salt owned and Drought locked with that reason.

**Oasis Line competition proof** (A3, A6): 50 Desert entries, **44 / 50 start below the released 20 % floor** (arrival p50 8 %); every proof witness
met contested fronts (min 5, median 12 contested regions) and passed its two confirmation runs; the run starts with native vegetation established.

## 5. Copy changes

| Where | Before | After |
|---|---|---|
| Native Competition · strategic idea | "Native vegetation is adapted to the planet's starting conditions." | "Win ground where your plant suits it better than the natives do, and thicken young colonies before they are overgrown." (the fact stays in its science line) |
| Volatile Climate · what changes (card + dossiers) | "Terraforming too aggressively can destabilize the climate and cause temporary extremes." | "The climate stays stable until you Terraform it: quick or repeated steps can swing it to temporary extremes." |
| Volatile Climate · briefing | the scenario summary | "The climate here is stable until you change it. Each Terraform step unsettles it; quick or repeated steps can make it swing to a temporary heat pulse, cold snap, wet surge or dry spell." |
| Volatile Climate · strategic idea | "How fast you change the planet matters." | "Adapting your plant never unsettles the climate. Terraform when it pays, and give the sky time to settle between steps." |
| Planet dossier, arrival < 5 % | (the bare share) | + "Little or none of this world suits your plant yet: your landing region keeps it alive at first. Adapt before you spread." — the PMO direction ("Only your landing region suits your plant at first. Adapt before you spread.") polished so it stays true when a sliver of other land also suits the plant |
| Planet dossier / hub, a prescribed start | what is given | + what it closes (Low Tide: Drought Adaptation) |
| Report summary | "… under Dying World …" | "… in the Low Tide Challenge …" (every Challenge run) |

## 6. Evidence (Chromium + representative Firefox)

Hub with five cards: `02-hub-*-1440x900.png` / `-390x844.png` (Native Competition and Volatile Climate dossiers updated) · **Low Tide:** `a1-hub-low_tide`,
`a3-dossier-low_tide` (prescribed plant, given start, Drought unavailable), `a5-adapt-low_tide` (Drought locked), `a4-run-low_tide`,
`a6-report-low_tide` (given chips, landing note), Firefox `firefox-a1/a3/a5/a6-…-low_tide` · **Oasis Line:** `a1-hub-oasis_line`,
`a3-dossier-oasis_line`, `a4-run-oasis_line` (natives on the map; Firefox too), `a5-adapt-oasis_line`, `a6-report-oasis_line` · low arrival:
`a7-low-arrival-dossier` (Dying World × Cinder Rosette, 0 %; Firefox too) · the released flows re-captured (`03`–`12b`).

## 7. QA

**Focused:** `challenges-check` 33 / 33 (C21 copy facts, C22 authored launches, H1 every card at four viewports, K1 keyboard over five cards) ·
`challenge-world-check` 93 / 93 (B1–B9 over 14 cells / 700 entries, A1–A10 authored flows in both browsers, the released flows unchanged).

**Full regression** — every `tools/*-check.js`, one sequential pass, nothing else running, on the committed candidate (`778446f` + docs):
**44 / 44 green**.

- 42 suites passed in the pass itself (incl. `challenge-world-check` 93, `challenges-check` 33, `single-app-flow` 59, `species-selection` 68,
  `release-check --no-suites` 51, `visual-system` 54, `guided-training` 50, every engine / validator / scenario suite; `sim-check` golden unchanged).
- `plant-sprite-pipeline-check` (P1) and `portable-runtime-check` (P3) failed in the pass for an **environment** reason only: the fresh worktree had no
  `tools/node_modules` (esbuild). After `npm --prefix tools ci`: **59 / 59** and **71 / 71** (P3: the committed `dist/portable/` is byte-identical to
  a build from source).
- **`slice-check`**: passed in this run (the documented stochastic pacing flake did not reproduce); bounds untouched.

## 8. Known concerns

1. **Low Tide's bank is all "Favorable"** at landing (with the given Flood + Salt, 49–99 % of the land suits the plant, median 73 %): the drama is the
   decline taking it away (study: the decline closes ~54 % of the land). The dossier's green bar may read generous at first; the Challenge copy
   carries the turn.
2. **Oasis Line is long** (~8 min perfect-play median; a person needs longer) — accepted by the PMO; not shortened.
3. **Hub list scrolls on small desktops**: at 1024 × 768 the fifth card is partly below the list's fold (it scrolls; the dossier and BEGIN CHALLENGE
   stay visible). A sixth Challenge would make this more noticeable.
4. **Rebuild cost**: any rule change now rebuilds 14 cells (~41 min on 12 workers).
5. `windfall_*` / `vc_released_diag` research concepts remain in `tools/research/challenges/concepts.mjs` (fixtures, never in the catalogue).
6. *(Resolved before integration — PMO presentation correction, §9.)* **"Blocked" landing region on low-arrival worlds** (existing UI behaviour, more visible now): on an Oasis Line world the landing region can read
   "Blocked · Water: too dry" while the plant lives there as the protected refuge (evidence `a4-run-oasis_line`). The new dossier line ("your landing
   region keeps it alive at first") prepares the player; the run-screen wording is unchanged in this milestone.

## 9. Pre-integration presentation correction — REFUGE (PMO, 2026-10-12)

PMO accepted 036C1 for release with one narrow presentation correction: the protected, unsuitable origin must read **REFUGE**, not BLOCKED.
`resources/run-ui/run-ui-adapter.js` derives `refuge` (origin ∧ ordinarily blocked ∧ the refuge rule lifting its fitness above the unprotected value
and the die-back threshold — from the real current evaluation); `planet-view.js` / `decision-rooms.js` show the chip **Refuge** (shield, sky tone,
"Protected landing refuge: …" for assistive tech) in exactly that case, keep the Origin marker and the real limiting line, and keep Blocked for every
other unsuitable region; the specimen keeps the ground's own condition. Presentation only (engine / validator / content byte-identical to `d8ca0cb`;
no bank rebuild).

QA (challenge-world-check, Chromium + Firefox): **A11** Oasis Line origin → Refuge + Origin + "Limiting: Water · too dry", fitness unchanged (0.62
refuge floor), a non-origin unsuitable region → Blocked, after Drought Adaptation → OK; a suitable Low Tide origin → OK · **A12** a 0 %-arrival
Dying World origin → Refuge · **A13** engine sources unchanged · **I7** Training's origin ordinary. Focused suites: see the integration record.

## 10. Integration (2026-10-12)

PMO: BLOOM-036C1 **ACCEPTED FOR RELEASE** with the REFUGE correction (§9). `origin/main` was `d8ca0cb`; the corrected review head `d69d458` = the
accepted candidate `659b240` + only the correction (5 ahead / 0 behind). Production `main` was fast-forwarded to exactly `d69d458` (no merge commit,
squash, rebase, cherry-pick or force push) and converged with `origin/main`.

Post-integration release check on clean `main` `d69d458`, sequential: `challenges-check` 33 / 33 · `challenge-world-check` 100 / 100 · `run-ui-check` ✓ ·
`run-ui-convergence-check` ✓ · `game-flow-check` ✓ · `portable-runtime-check` 71 / 71 · `release-check --no-suites` 51 / 51 · `visual-system-check` 54 / 54.
(The exact candidate passed the full 44-suite regression, §7; the REFUGE correction's focused QA additionally ran planet-view, plant-rooms, terraform,
training and guided-training — all green. No bank rebuild: no proof provenance changed.)
