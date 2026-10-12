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

*Last updated: 2026-10-11, **BLOOM-036B + 036B1 (seed banks) review candidate** (branch `handoff/bloom-036b-review`, NOT merged; it contains the PMO-accepted
036A foundation `8af3e12` + 036B; production `main` is the 035C closeout below). **BLOOM-035C: IMPLEMENTED / COMPLETE** · **BLOOM-036A:
ACCEPTED FOUNDATION** (not separately integrated; included in the 036B candidate) · **BLOOM-036B: CANDIDATE** · **Challenges: CANDIDATE**
(the CHALLENGES hub; a Challenge is a contained run with ONE generated qualifying planet — no Destination Survey) · **036C: NEXT /
planned**. Design: [`CHALLENGES_SYSTEM_v1.md`](CHALLENGES_SYSTEM_v1.md); records: [`evidence/bloom-036a/REPORT.md`](evidence/bloom-036a/REPORT.md),
[`evidence/bloom-036b/REPORT.md`](evidence/bloom-036b/REPORT.md).*

*Production `main` (2026-10-11, BLOOM-035C integration closeout): The PMO accepted BLOOM-035C2 and production `main` was fast-forwarded to the
exact accepted review head `4ac7301` (from `e534750`; no merge commit, squash, cherry-pick or rebase); this docs-only closeout follows it.
**BLOOM-035C: IMPLEMENTED / COMPLETE** — the three PMO-accepted species packs (Cinder Rosette · Reed Spire · Woolly Candle on body-plan
revision `candle@2`) are in production, all four species are released, Species Selection is the normal EXPEDITION flow, and the plant
specimen stands in a dynamic, region-driven environment. **Challenges: NEXT** · **BLOOM-036A: NEXT** (no CHALLENGES menu entry yet).
Record: [`evidence/bloom-035c2/REPORT.md`](evidence/bloom-035c2/REPORT.md).*

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

- **IMPLEMENTED** (BLOOM-033): BEGIN EXPEDITION → **EXPEDITION**; menu today: EXPEDITION · TRAINING · SETTINGS · CREDITS.
- **UI correction (2026-10-10, owner / PMO): no survey-complete banner.** The title's status line shows "Surveying sector · n of 9
  worlds" only while the prefetched sector is actually being generated and disappears when it is ready; the rejected "Sector surveyed ·
  nine worlds ready" banner (and any toast / badge / "9 worlds" replacement) must not return — the Destination Survey's 3 × 3 matrix shows
  readiness. Guarded by `main-menu-check` M8 and `release-check` R16b.
- **CHALLENGES: CANDIDATE** (BLOOM-036A accepted foundation + BLOOM-036B, review branch; not in production `main` until PMO integration). The real CHALLENGES entry
  arrives with its first functional Challenge slice — never as a fake, disabled or "coming soon" control: menu on the candidate
  EXPEDITION · **CHALLENGES** · TRAINING · SETTINGS · CREDITS (the shared `challenge` pennant glyph + the word; `MainMenu` renders it only
  with a real hook).

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
| Challenges | **CANDIDATE** (BLOOM-036A foundation + BLOOM-036B one-planet launch, §8) |
| BLOOM-036A | **ACCEPTED FOUNDATION** (not separately integrated; included in the 036B candidate) |
| BLOOM-036B | **CANDIDATE** |
| BLOOM-036C | **NEXT / planned** |

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
- **Challenges: CANDIDATE** (§8). Inside the three released Challenges every released species stays open (player choice); the species
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

**LOCKED DESIGN** (BLOOM-036) · **BLOOM-036A: ACCEPTED FOUNDATION** · **BLOOM-036B: CANDIDATE** · **Challenges: CANDIDATE** · **036C:
NEXT / planned**. Nothing of this is in production `main` until the PMO integrates the combined 036A + 036B candidate. **Sequence
(locked):** BLOOM-035B species engineering (complete) → BLOOM-035C final species art + the normal Species Selection release (complete) →
BLOOM-036 (036A accepted foundation → 036B one-planet launch → 036C).

**CANDIDATE** ([`CHALLENGES_SYSTEM_v1.md`](CHALLENGES_SYSTEM_v1.md) — canonical):

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
- **Not yet (036C+):** Challenge-specific completion conditions (schema path kept, refused until implemented), authored Challenge worlds,
  new authored Challenges using prescribed species / starting states, medals, scoring, difficulty tiers, unlock trees, campaign progression.

Reserved shape of BLOOM-036:

- **036A** — the main-menu CHALLENGES entry (added here, as part of the first functional slice — never earlier as a dead / disabled
  button); the Challenge hub / selection screen; the challenge definition schema; routing inside the existing single-document app.
- **036B** — the challenge dossier; prescribed species; world recipe / authored world selection; starting owned adaptations / starting
  state where specified; special-mechanics composition. (**CANDIDATE:** the one-planet recipe launch, the dossier, prescribed species and
  starting-state support — authored worlds and mechanics composition remain open.)
- **036C** — Dying World, Native Competition and Volatile Climate migrated / reused as Challenge ingredients (not duplicated mechanics).
- **036D** — the initial authored Challenge set; a generated Challenge planet where appropriate; the completion / result / replay flow;
  browser / portable / full regression.

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
| **BLOOM-036A** — Challenges foundation + first playable hub | the CHALLENGES menu entry; the Challenge hub; the definition schema (`content/challenges.js`, `BLOOM.challenges`); single-document routing; (interim) a scenario-proven Destination Survey | **ACCEPTED FOUNDATION** (`8af3e12`; not separately integrated — included in the 036B candidate) |
| **BLOOM-036B** — Contained Challenge worlds | ONE generated qualifying planet per Challenge instance from a calibrated, versioned recipe (no survey), drawn from prevalidated seed banks (036B1); PREPARING CHALLENGE WORLD + the Challenge Planet Dossier; instance provenance; Retry Challenge / Challenges; prescribed species + starting-state support (QA fixtures) | **CANDIDATE** (review branch `handoff/bloom-036b-review`) |
| **BLOOM-036C+** — Challenges, continued | 036C the three mechanics as ingredients · 036D initial authored set, result / replay, full regression | **036C: NEXT / planned** |
| **Final hardening** | full documentation reconciliation; dead historical production-path cleanup; Pages enablement / release; a Safari / WebKit production test if practical; final end-to-end release QA | PLANNED |
