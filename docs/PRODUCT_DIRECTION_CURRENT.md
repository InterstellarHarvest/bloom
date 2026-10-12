# Strange Bloom · Unknown Soils — current product direction

**This file is the CURRENT product-direction record.** It summarizes the owner / PMO decisions that are in force now and the ordered
near-term roadmap. Keep it short and keep it current: when a decision changes, change it here.

| Status | Meaning |
|---|---|
| **LOCKED DESIGN** | an owner / PMO decision; not necessarily implemented yet |
| **IMPLEMENTED** | present in production `main` |
| **CANDIDATE** | implemented and tested on a review branch, pending PMO / owner review; not in production `main` yet |
| **PLANNED** | accepted future work, not implemented yet |

**Precedence.** If an older design document conflicts with this file about the *current* direction, this file wins.
[`GAME_BIBLE.md`](../GAME_BIBLE.md) remains the broad design bible; decisions made after its older sections were written are recorded
here. Historical milestone documents and `docs/evidence/` remain authoritative for *what happened at a particular milestone* — they are
not rewritten to match later plans.

*Last updated: 2026-10-12, **BLOOM-036 Challenges integration closeout**. The PMO accepted the combined 036A + 036B + 036B1 candidate and
production `main` was fast-forwarded to the exact accepted review head `bd0eb27` (from `47ae6c3`; no merge commit, squash, rebase,
cherry-pick or force push); this docs-only closeout follows it. **BLOOM-036A: IMPLEMENTED / COMPLETE** (as part of the combined Challenges
release) · **BLOOM-036B: IMPLEMENTED / COMPLETE** · **BLOOM-036B1: IMPLEMENTED / COMPLETE** · **CHALLENGES: IMPLEMENTED** for the current
first playable product — **Dying World · Native Competition · Volatile Climate** (§8) · **BLOOM-036C: NEXT — authored Challenge content,
design / calibration**. Design: [`CHALLENGES_SYSTEM_v1.md`](CHALLENGES_SYSTEM_v1.md); records: [`evidence/bloom-036a/REPORT.md`](evidence/bloom-036a/REPORT.md),
[`evidence/bloom-036b/REPORT.md`](evidence/bloom-036b/REPORT.md).*

*Previous production closeout (2026-10-11, BLOOM-035C): production `main` was fast-forwarded to the PMO-accepted 035C2 head `4ac7301`
(from `e534750`). **BLOOM-035C: IMPLEMENTED / COMPLETE** — the three PMO-accepted species packs (Cinder Rosette · Reed Spire · Woolly Candle on
body-plan revision `candle@2`), all four species released, Species Selection in the normal EXPEDITION flow, the dynamic region-driven specimen
environment. Record: [`evidence/bloom-035c2/REPORT.md`](evidence/bloom-035c2/REPORT.md).*

---

## 1. Production application architecture

**LOCKED DESIGN · IMPLEMENTED** in production `main` by BLOOM-033.

- `index.html` is the single player-facing Strange Bloom application.
- Title, expedition planning, the Destination Survey, Training, gameplay, the decision rooms, the report and every return flow live in
  that same application / document (`docs/SINGLE_DOCUMENT_APP_v1.md`).
- `demos/demo-run.html` is developer-harness material only. Production never navigates to it or loads it.
- The selected Destination Survey planet is handed directly from application state into the run / simulation (the same object).
- No production expedition token; no sessionStorage / window.name planet handoff; no "this tab owns the expedition" product concept.
- Runs are still not saved across a refresh or a restart.

## 2. Normal gameplay mode terminology

**LOCKED DESIGN · IMPLEMENTED** (BLOOM-033).

- The canonical no-special-pressure gameplay mode is **`default`** (scenario id `default`).
- **`eden` is retired** as the active canonical term: it sounds like a particular biome / world rather than "ordinary rules".
- Old historical docs and evidence may still say Eden.
- One narrowly scoped legacy alias exists at the scenario resolver boundary (`resources/bloom-sim.js`: `scenario=eden` → `default`) for
  old developer URLs; nothing else knows the old id.
- A normal player-facing Expedition does not display "Default scenario".

## 3. Main-menu structure

**LOCKED DESIGN (target):**

```
STRANGE BLOOM · UNKNOWN SOILS
  EXPEDITION
  CHALLENGES
  TRAINING
  SETTINGS
  CREDITS
```

- **IMPLEMENTED** (BLOOM-033): BEGIN EXPEDITION → **EXPEDITION**. **The full target menu is IMPLEMENTED** since BLOOM-036: EXPEDITION ·
  CHALLENGES · TRAINING · SETTINGS · CREDITS.
- **UI correction (2026-10-10, owner / PMO): no survey-complete banner.** The title's status line shows "Surveying sector · n of 9
  worlds" only while the prefetched sector is actually being generated and disappears when it is ready; the rejected "Sector surveyed ·
  nine worlds ready" banner (and any toast / badge / "9 worlds" replacement) must not return — the Destination Survey's 3 × 3 matrix shows
  readiness. Guarded by `main-menu-check` M8 and `release-check` R16b.
- **CHALLENGES: IMPLEMENTED** (BLOOM-036A + 036B + 036B1, in production `main`). The CHALLENGES entry arrived with the first functional
  Challenges — never as a fake, disabled or "coming soon" control (the shared `challenge` pennant glyph + the word; `MainMenu` renders it
  only with a real hook).

## 4. Expedition definition

**LOCKED DESIGN.** EXPEDITION is the normal procedural sandbox game.

Final intended flow:

```
EXPEDITION → Choose Plant Species → Destination Survey → choose one of the generated worlds → inspect / focus it
           → Begin Expedition → gameplay → Bloom / Extinction report
```

- **IMPLEMENTED** in production `main` (BLOOM-035C) — the final released Expedition flow:

  ```
  EXPEDITION → Choose Plant Species → Destination Survey → Run → Report
  ```

  All four species on their PMO-accepted art; Organic Hybrid stays "Recommended first expedition"; no Easy / Hard / stars / scores.
  `?species=1` is not required — it is ignored (one behaviour path). Training is always Organic Hybrid.

## 5. Destination Survey / difficulty

**LOCKED DESIGN · the rename is IMPLEMENTED** (BLOOM-033).

- The 3 × 3 Destination Survey itself is the normal Expedition difficulty choice. There is **no** separate Easy / Normal / Hard setting.
- The three player-facing classes are **FAVORABLE · PRECARIOUS · EXTREME**, replacing the confusing Stable / Volatile / Extreme naming —
  in particular "Volatile" must not collide with the separate Volatile Climate mechanic.
- BLOOM-033 changed the canonical internal ids too: `favorable` / `precarious` / `extreme` (`resources/destination-survey/survey-data.js`
  `SURVEY_CLASSES`; the thresholds — ≥ 35 % / ≥ 20 % / else of the land habitable on arrival — the columns and the world streams are
  unchanged).
- The classification measures how hospitable the generated world is to the **starting species**. Until species selection exists it uses
  the Organic Hybrid baseline. After the species milestone the same planet can classify differently for different starting species.

## 6. Plant species

**LOCKED DESIGN · Species system IMPLEMENTED** (BLOOM-035B **IMPLEMENTED / COMPLETE**; BLOOM-035C **IMPLEMENTED / COMPLETE**, PMO-accepted
`4ac7301`, in production `main`; design BLOOM-035A COMPLETE; records [`evidence/bloom-035b/REPORT.md`](evidence/bloom-035b/REPORT.md),
[`evidence/bloom-035c2/REPORT.md`](evidence/bloom-035c2/REPORT.md)). The product state, precisely:

| Item | Status |
|---|---|
| **BLOOM-035C** | **IMPLEMENTED / COMPLETE** |
| Released species | **Organic Hybrid · Cinder Rosette · Woolly Candle · Reed Spire** |
| Real art (the three PMO-accepted specialist packs) | **IMPLEMENTED** |
| `candle@2` (the Woolly Candle body-plan revision) | **IMPLEMENTED** |
| Normal Species Selection (EXPEDITION → Choose Plant Species) | **IMPLEMENTED** |
| `?species=1` | **not required** (ignored: one behaviour path) |
| Dynamic region specimen environments | **IMPLEMENTED** |
| Challenges | **IMPLEMENTED** (Dying World · Native Competition · Volatile Climate, §8) |
| BLOOM-036A | **IMPLEMENTED / COMPLETE** (as part of the combined Challenges release) |
| BLOOM-036B | **IMPLEMENTED / COMPLETE** |
| BLOOM-036B1 | **IMPLEMENTED / COMPLETE** (prevalidated seed banks) |
| BLOOM-036C | **NEXT** — authored Challenge content, design / calibration |

- **The final species art is in production** — `cinder-rosette` (`rosette@1`), `woolly-candle` (**`candle@2`**, the Woolly fidelity
  revision: candle@1's sockets with larger native component maxima; brief [`WOOLLY_CANDLE_ART_BRIEF_v2`](species-art-briefs/WOOLLY_CANDLE_ART_BRIEF_v2.md)),
  `reed-spire` (`reed@1`) — ingested from the PMO-accepted source candidates via `tools/species-source-deliveries.mjs` →
  `tools/intake-plant-art.mjs` (provenance: `art/plant/intake/<pack>/SOURCE_PROVENANCE.json` + `PMO_FINAL_ACCEPTANCE.json`); all four
  species are `released` and selectable in the normal EXPEDITION flow. The proof packs stay in the repository as engineering /
  proof-compatibility material only; no species uses one.
- **Specimen environment:** the plant specimen stands in a deterministic, region-driven environment scene (sky, sun, clouds, horizon,
  ground and soil cues, standing water) with runtime weather FX, read from the real region / sky state
  ([`VISUAL_DIRECTION_v1.0.md`](VISUAL_DIRECTION_v1.0.md) §3).
- **Locked visual rule:** **ADAPT changes the organism. TERRAFORM changes the environment around the organism.** An Adapt preview changes
  only the organism; a Terraform preview changes only the scene around it.
- **Intentional supersession — the Terraform room now shows the plant.** Terraform intentionally includes the **unchanged** plant inside the
  region scene, so the player sees the environment change around the organism it is for. This supersedes the older mockup / production
  decision that the Terraform room has *no plant* (the UI concept reviews' "a land scene instead of a plant", Concepts 15–17,
  [`UI_CONCEPT_REVIEW_v7.md`](UI_CONCEPT_REVIEW_v7.md) / [`UI_CONCEPT_REVIEW_v8.md`](UI_CONCEPT_REVIEW_v8.md), and the BLOOM-029D production
  room). Those documents remain the record of what was decided then; this file records that the decision changed in BLOOM-035C2.
- **Challenges: IMPLEMENTED** (§8). Inside the three released Challenges every released species stays open (player choice); the species
  screen names the Challenge, drops Organic Hybrid's "Recommended first expedition" note and reads "Continue with <plant>". A future
  Challenge may prescribe a species (implemented in 036B, QA fixtures only; none released).

- Plant choices are genuinely different biological species — **not** Organic Hybrid recolours, not Organic Hybrid with purchased
  mutations pre-applied, not cosmetic skins.
- **Four species in total.** Accepted concepts: **Organic Hybrid** (balanced generalist) · **Cinder Rosette** (dry / heat specialist) ·
  **Woolly Candle** (cold specialist) · **Reed Spire** (wet / flood specialist). Other concepts are historical alternatives only.
- Each species has a distinct baseline physiology, roughly two understandable natural advantages, at least one meaningful natural
  disadvantage, its own recognizable body / silhouette, and can evolve further through the existing Adapt / Spread systems.
- Organic Hybrid remains the balanced generalist and keeps a "Recommended first expedition" note. No species is ever labelled Easy;
  species are not difficulty levels (no stars, no Easy / Hard, no overall score; strengths always paired with weaknesses).
- Species selection shows a fully grown specimen rendered from that species' actual in-game sprite system; clicking a species focuses /
  zooms it and opens a dossier in the same interaction language as the Destination Survey.

**PMO decisions LOCKED for BLOOM-035B** (full record: [`SPECIES_SYSTEM_v1.md`](SPECIES_SYSTEM_v1.md) §0.1; measurements:
[`SPECIES_STUDY_v1.md`](SPECIES_STUDY_v1.md); body plans / concepts: [`SPECIES_BODY_PLANS_v1.md`](SPECIES_BODY_PLANS_v1.md)):

- **One physical planet per World Seed, whatever the species.** World generation reads a new explicit **`config.referencePlant`**
  (numerically identical to today's `genomeBase`), a world-generation constant that belongs to no playable species.
  `WORLD_GEN_VERSION` stays 1; any change to `referencePlant` needs an explicit `WORLD_GEN_VERSION` decision. Organic Hybrid has its own
  physiology object, numerically equal to `referencePlant`, so retuning Organic Hybrid never changes world generation.
- Physiology only (no growth / economy modifiers, no species-specific Adapt scales or softness, no starting genome for Expedition
  species). Implementation values v1:

  | species | temperature | water window | salt | radiation | toxicity |
  |---|---|---|---|---|---|
  | Organic Hybrid | −6 … 24 °C | 32 … 68 | 15 | 30 | 25 |
  | Cinder Rosette | 2 … 34 °C | 18 … 50 | 15 | 35 | 25 |
  | Woolly Candle | −14 … 16 °C | 28 … 64 | 15 | 50 | 25 |
  | Reed Spire | −6 … 24 °C | 42 … 82 | 60 | 30 | 25 |

- The cold species is a **cold specialist**; its radiation tolerance is a latent secondary strength and the copy says so honestly.
- Species winnability is required for a world to be offered; strategy diversity and pacing are recorded diagnostics, never offer gates.
- The Destination Survey is species-relative (same thresholds; the same planet may classify differently per species); planet identity
  never depends on the species. Native Competition's native stays on `referencePlant`.
- A Challenge never changes `referencePlant`; it may choose a species, a world recipe, a scenario, starting adaptations / state.
- Species mechanics may land in `main` before the art; the Species Selection screen stayed behind `?species=1` until the real art was
  accepted, so the game never shows proof art as a species (BLOOM-035C2 candidate: the real art is in; the flag is retired).

## 7. Species art architecture

**LOCKED DESIGN · the body-plan layer IMPLEMENTED** (BLOOM-035B: per-species body plans, contracts, grammars and proof packs —
[`SPECIES_BODY_PLANS_v1.md`](SPECIES_BODY_PLANS_v1.md)) · **final species packs IMPLEMENTED** (BLOOM-035C, in production `main`; Woolly
Candle on body-plan revision `candle@2`).

- Different species need genuine new authored sprite families.
- Reuse the production architecture proven by Organic Hybrid: species art pack → species body plan → visual model → component selection
  → compositor → exact logical canvas (`docs/PLANT_SPRITE_PIPELINE_v1.md`, `docs/PRODUCTION_PLANT_INTEGRATION_v1.md`).
- Do not assume a species can borrow Organic Hybrid anatomy. Exact sharing of generic treatments / components is decided during
  production; budget and specify the work as real species packs.

## 8. Challenges

**LOCKED DESIGN · IMPLEMENTED** (BLOOM-036) · **BLOOM-036A: IMPLEMENTED / COMPLETE** · **BLOOM-036B: IMPLEMENTED / COMPLETE** ·
**BLOOM-036B1: IMPLEMENTED / COMPLETE** · **CHALLENGES: IMPLEMENTED** for the current first playable product · **036C: NEXT — authored
Challenge content (design / calibration)**. PMO-accepted and fast-forwarded into production `main` as one combined release (`bd0eb27`,
2026-10-12). **Sequence (locked):** BLOOM-035B species engineering (complete) → BLOOM-035C final species art + the normal Species Selection
release (complete) → BLOOM-036A/B/B1 the Challenges system and its first three Challenges (complete) → 036C authored Challenge content.

**Current released Challenges:** **Dying World** · **Native Competition** · **Volatile Climate**.

**Canonical Challenge world model (LOCKED):** ONE procedural planet selected from a **versioned bank of prevalidated procedural seeds**. No 3 × 3
Destination Survey inside a Challenge. Normal Challenge startup:

```
Hub → Choose Plant Species (where the Challenge allows it) → the prevalidated planet → Challenge Planet Dossier → Run → Challenge Debrief
```

The runtime performs **no** expensive scenario / winnability proof: it regenerates the bank entry's exact planet in milliseconds and verifies its
fingerprint; the proof was made offline.

**Release seed bank (BLOOM-036B1):** `content/challenge-seed-banks.js` — bank version 1, 3 Challenges × 4 species = **12 cells × 50 = 600 entries**,
312 145 bytes, sha256 `dcca6d8ff53e7cbb032bcdf0d0dae81fc0b4660ada008ce08894d6d4ed6871ba` (inputs fingerprint `c176d9c14ca63b83`). Builder command:
`node tools/build-challenge-seed-bank.mjs --per-archetype 160 --workers 8` (resumable with `--reuse`; `node tools/build-challenge-seed-bank.mjs --check` proves the shipped bank is exactly a rebuild
from the committed candidate cache). Build record: [`evidence/bloom-036b/seed-bank/BUILD_REPORT.md`](evidence/bloom-036b/seed-bank/BUILD_REPORT.md).

**Stale-bank rebuild requirement (LOCKED).** Every bank cell carries the provenance it was proven against, and the game refuses a stale bank (it
is never silently reused, searched around or reinterpreted). Any change that invalidates that provenance — the **world generator**, an
**archetype**, a **species physiology**, a **trait mechanic**, an **engine rule** (`content/config.js`), a **scenario mechanic**, a **Challenge
recipe / version**, the **validator / proof contract** — **requires a bank rebuild** (`node tools/build-challenge-seed-bank.mjs --per-archetype 160 --workers 8`, ~38 min) committed with the change; the
release / development checklist is [`DEVELOPMENT_NOTES.md`](DEVELOPMENT_NOTES.md) § "Change checklist — Challenge seed banks".

**PMO decisions LOCKED by BLOOM-036B1:**

- **EXPEDITION** = live procedural discovery (the 3 × 3 Destination Survey). **CHALLENGES** = prevalidated procedural seed banks.
- Released bank size: **50 entries per Challenge × species**; current matrix 3 Challenges × 4 species = 12 cells / 600 entries.
- Native Competition × Reed Spire archetype distribution **5 Desert / 23 Frozen / 22 Ocean: ACCEPTED**. Equal archetype quotas are not forced
  where physiology and recipe do not support them.
- **Volatile Climate:** no proof witness is required to trigger a climate shock — a player may rationally avoid Terraforming and with it the
  risk.
- Broad **Dying World / Volatile Climate** banks may keep fully proven **0 %-arrival** worlds; no arrival floor without a future authored
  Challenge design reason.
- The **312 KB** runtime bank loaded at title boot is **accepted for v1**; no lazy-load machinery for this size.
- **Stale-bank refusal** (above) is locked.

**Known QA debt (pre-existing, not a Challenges defect):** `tools/slice-check.js`'s pacing rule (perfect-bot win in 4–8 min, floor 240 s) is
stochastic — the demo harness simulation draws on `Math.random`, so its win time varies run to run (observed 231–262 s, failing on both the
accepted head and the previous review head). The bounds are not loosened and simulation gameplay is not changed for it; a future isolated
QA-maintenance task may make the test deterministic.

**IMPLEMENTED** ([`CHALLENGES_SYSTEM_v1.md`](CHALLENGES_SYSTEM_v1.md) — canonical):

- A **Challenge is a product definition that references a scenario** (`content/challenges.js`, schema 2, resolved and frozen by
  `resources/bloom-challenges.js`); the scenario's mechanics stay in `content/scenarios.js` and the engine — a Challenge carrying a
  mechanics key, a verbatim copy of scenario text, the default scenario or any launch value the runtime cannot honour is refused.
- The initial released set: **Dying World** · **Native Competition** · **Volatile Climate** — player-choice species, the normal start, the
  normal Bloom; no difficulty labels, stars, scores or recommended skill; content order is not a ranking.
- **Flow (036B, canonical):** MAIN MENU → CHALLENGES → the hub → BEGIN CHALLENGE → Choose Plant Species (only if the Challenge allows it) →
  PREPARING CHALLENGE WORLD → the Challenge Planet Dossier (ONE planet: the challenge · your plant · your world) → BEGIN CHALLENGE → Run →
  Report (KEEP PLAYING · RETRY CHALLENGE · CHALLENGES · MAIN MENU). **No 3 × 3 Destination Survey, no choosing among worlds, no reroll.**
  One document, application state only.
- **World recipe + seed bank (036B1):** each Challenge has a versioned recipe (archetypes · arrival band · native cover), calibrated by a
  read-only study ([`evidence/bloom-036b/CHALLENGE_RECIPE_STUDY.md`](evidence/bloom-036b/CHALLENGE_RECIPE_STUDY.md)): Dying World and
  Volatile Climate broad, Native Competition arrival ≥ 20 %. **EXPEDITION = live procedural world discovery; CHALLENGES = curated banks of
  prevalidated procedural seeds.** An offline builder (`tools/build-challenge-seed-bank.mjs`) proves worlds with the FULL validation
  (physical, the recipe, the species' S2, the scenario's layer P at its full budget with every confirmation) and curates 50 diverse passing
  seeds per Challenge × released species into `content/challenge-seed-banks.js` (seeds + proof provenance, never geometry). At launch the
  game picks one entry deterministically (launch seed; this session's recent entries avoided, in memory only), rebuilds that exact planet in
  milliseconds and verifies its fingerprint — no validation runs in the player's browser. A stale bank (any rule / species / scenario /
  generator change) or a fingerprint mismatch is refused, never silently reused or searched around. A recipe never changes a planet.
- **Instance:** the canonical Challenge, scenario, species, launch seed, starting state and the exact planet object. RETRY CHALLENGE replays
  it (the same bank entry, a fresh simulation); CHALLENGES → the hub, where beginning again is a fresh instance. Provenance (challenge id / version, recipe version,
  bank version / cell / entry, planet seed / fingerprint, species, scenario) reaches the run and the report; an instance from other data is refused, never reinterpreted.
- **Implemented for future Challenges, QA-only fixtures (none released):** a prescribed species (skips Choose Plant Species) and a prescribed
  starting state (owned plant adaptations and / or starting Biomass, applied by the engine's own `createSim` option; proven from that start;
  the report says the Challenge gave it).
- **History:** 036A launched a Challenge through a scenario-proven Destination Survey (interim PMO directive, ~4–32 s); 036B replaced it —
  the survey is the Expedition's only again (its heading "Expected challenges" is now **Expected hazards**). 036B first searched and proved
  each Challenge world live in the browser (Native Competition 20–90 s in the tail); 036B1 moved that proof offline into the seed banks
  ([`evidence/bloom-036b/NATIVE_COMPETITION_LATENCY_STUDY.md`](evidence/bloom-036b/NATIVE_COMPETITION_LATENCY_STUDY.md), superseded findings).
  The dossier no longer shows a separate "Foothold" line (the S1 metric stays in the bank and the instance).
- Invariants: EXPEDITION = its 3 × 3 survey and the default scenario, no Challenge residue; TRAINING = Organic Hybrid, no Challenge; Main
  Menu clears the Challenge.
- **Not yet (036C+):** new authored Challenges using prescribed species / starting states / deliberate world recipes (036C designs them),
  Challenge-specific completion conditions (schema path kept, refused until implemented). **Not planned:** medals, scoring, difficulty tiers,
  unlock trees, campaign progression — none is invented without a later, explicit approval.

Shape of BLOOM-036 (**roadmap correction, 2026-10-12**):

- **036A — COMPLETE** — the main-menu CHALLENGES entry, the Challenge hub, the definition schema, single-document routing.
- **036B + 036B1 — COMPLETE** — the contained Challenge (ONE planet, the dossier, instance provenance, Retry / Challenges / Main Menu),
  prescribed species and starting-state support (QA fixtures), prevalidated seed banks.
- *The older plan's "036C — migrate / reuse Dying World, Native Competition and Volatile Climate as Challenge ingredients" was pulled forward
  and is **already complete** in 036A / 036B: the three released Challenges reference those scenarios (no duplicated mechanics). It is not
  future work.*
- **036C — AUTHORED CHALLENGE CONTENT — design / calibration (NEXT).** Which contained situations BLOOM can author from species, planet
  selection, starting state and the existing scenario mechanics — studied read-only and offline first (seed-bank pipeline), then a PMO-selected
  release batch. No new engine mechanics merely to create content.
- **036D+ — future**: Challenge-specific completion systems where a studied concept needs one; progression / reward systems **only if later
  approved**.

- CHALLENGES are **not** modifiers chosen during a normal Expedition. They are separate, SimCity-style contained challenge runs.
- Flow: CHALLENGES → choose one authored challenge → the game generates ONE fresh planet satisfying that challenge's recipe → challenge
  dossier → Begin Challenge → gameplay. **No 3 × 3 Destination Survey inside a Challenge.**
- A Challenge definition may prescribe: planet archetype / environmental identity; generation constraints; the starting species; an
  altered species baseline or starting owned mutations when that is specifically part of the challenge; existing special mechanics;
  win / loss framing; the briefing / science concept.
- The completed mechanics **Dying World**, **Native Competition** and **Volatile Climate** are Challenge ingredients — no longer
  ordinary Expedition-condition choices. (Today they remain fully functional through the developer harness only:
  `demos/demo-run.html?…&scenario=<id>`.)
- A Challenge may also use `default` rules and draw its difficulty purely from a deliberately mismatched species / world combination —
  e.g. a naturally cold-adapted species must survive and eventually bloom on a scorching Desert World.
- Selecting / re-entering a Challenge may generate a fresh qualifying planet / layout; a retry from the same failed Challenge run may reuse
  the same generated planet so the player can learn from it.

## 9. Menu / planning visual direction

**LOCKED DESIGN · IMPLEMENTED** in production `main` by BLOOM-034. The system is described in [`VISUAL_SYSTEM_v1.md`](VISUAL_SYSTEM_v1.md):
`resources/ui/bloom-theme.css` is the shared visual-token system (gameplay reads its exact BLOOM-033 values from it; the title / menu
and the Destination Survey use its dark NIGHT counterparts); `resources/ui/bloom-icons.js` gives the planning screens the gameplay
icon family. BLOOM-034 also repaired a BLOOM-033 one-document regression: the menu's root styles had collapsed the decision rooms'
mini-map card (`BLOOM-034 (fix)`, an isolated commit).

The decisions (unchanged):

- The title / menu and the Destination Survey currently diverge too much from the production gameplay visual language.
- Planning screens stay **darker** than gameplay and keep the outer-space feeling, but must look like the same game.
- Shared language: the same rounded sans-serif font family as gameplay; the same semantic colours (leaf green, bloom pink, sky blue,
  Biomass gold, pressure violet, OK / warning / blocked); the same icon language; the same chunky, friendly control proportions; the same
  irregular rounded-corner family; the same hierarchy and accessibility language.
- Dark planning screens use dark / space counterparts of the light gameplay surfaces. The space feeling comes from darkness, stars,
  planets, atmospheric glow and restrained translucent dark surfaces. **Not** neon / cyberpunk / sci-fi HUD styling.
- The current main-menu serif / ornate gold-plaque interface language is to be retired. The hand-painted menu backgrounds stay.
- Title artwork may remain more expressive / cinematic than ordinary UI type; interactive interface text belongs to the gameplay font
  family.

## 10. Audio · save · difficulty

**LOCKED DESIGN.**

- No audio is currently planned.
- No run save / Continue system is currently planned.
- No separate difficulty setting is planned. Challenge difficulty comes from the authored challenge; Expedition difficulty comes from the
  species + the generated world / survey class.

## 11. GitHub Pages

**CURRENT EXTERNAL TASK (owner).** The repository contains the Pages workflow (`.github/workflows/pages.yml`; the site is assembled by
`tools/build-pages-site.mjs`). Pages is not enabled at the repository level yet. The remaining one-time owner action:

GitHub repository → **Settings → Pages → Build and deployment → Source: GitHub Actions**.

This is not a gameplay-code feature; product code does not work around repository settings.

---

## Ordered roadmap

| Step | Scope | Status |
|---|---|---|
| **BLOOM-033** — Single-document production application | `index.html` is the whole game; GameSession; `default`; Favorable / Precarious / Extreme; EXPEDITION | **IMPLEMENTED / COMPLETE** (in production `main`) |
| **BLOOM-034** — Visual-system convergence | shared theme tokens (`resources/ui/bloom-theme.css`); title / menu restyle; Destination Survey convergence; the dark-space BLOOM planning language; **no species mechanics yet** | **IMPLEMENTED / COMPLETE** (in production `main`) |
| **BLOOM-035A** — Species design / research | species architecture, the reference physiology, the strategic-distinctness study, body plans and concepts | **ACCEPTED / COMPLETE** (docs + research in `main`) |
| **BLOOM-035B** — Species system implementation + Species Selection | species data / model; `config.referencePlant`; simulation / validator support; species-aware Destination Survey; run plumbing; body-plan layer with proof packs; the Species Selection screen behind `?species=1` | **IMPLEMENTED / COMPLETE** (PMO-accepted `2180fcd`, in production `main`; Species Selection still behind `?species=1`, candidate species on TEMPORARY PIPELINE PROOF art) |
| **BLOOM-035C** — Final species art + Species Selection release | three final production species packs (Cinder Rosette, Woolly Candle, Reed Spire; four species total) on the same compositor architecture; the generalized real-pack intake (035C0: `tools/intake-plant-art.mjs --pack <id>`, schemas in `PLANT_SPRITE_PIPELINE_v1.md` § SPECIES_ART_INTAKE); the three species on their real packs (Woolly Candle on `candle@2`); Species Selection released in the normal EXPEDITION flow (`?species=1` not required); dynamic region specimen environments | **IMPLEMENTED / COMPLETE** (PMO-accepted 035C2 `4ac7301`, in production `main`) |
| **BLOOM-036A** — Challenges foundation + first playable hub | the CHALLENGES menu entry; the Challenge hub; the definition schema (`content/challenges.js`, `BLOOM.challenges`); single-document routing; (interim, superseded by 036B) a scenario-proven Destination Survey | **IMPLEMENTED / COMPLETE** (accepted `8af3e12`; released inside the combined Challenges release `bd0eb27`) |
| **BLOOM-036B** — Contained Challenge worlds | ONE prevalidated procedural planet per Challenge instance (no survey); PREPARING CHALLENGE WORLD + the Challenge Planet Dossier; instance provenance; Retry Challenge / Challenges; prescribed species + starting-state support (QA fixtures); the three scenarios as Challenge ingredients | **IMPLEMENTED / COMPLETE** (`bd0eb27`, in production `main`) |
| **BLOOM-036B1** — Prevalidated seed banks | the offline bank builder, 12 cells × 50 proven seeds, runtime provenance check + stale-bank refusal, no proof at runtime | **IMPLEMENTED / COMPLETE** (`bd0eb27`, in production `main`) |
| **BLOOM-036C** — Authored Challenge content | design + read-only calibration of the first genuinely authored Challenge set (species · planet selection · starting state · existing scenarios), then a PMO-selected release batch | **NEXT** (design / calibration) |
| **BLOOM-036D+** — Challenge completion / progression | Challenge-specific completion systems where needed; progression / rewards only if later approved | PLANNED (not designed) |
| **Final hardening** | full documentation reconciliation; dead historical production-path cleanup; Pages enablement / release; a Safari / WebKit production test if practical; final end-to-end release QA | PLANNED |
