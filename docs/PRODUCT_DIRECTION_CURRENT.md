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

*Last updated: 2026-10-23, **BLOOM-040 — EDGE ASSEMBLE TRANSITIONS + SPECIMEN CONSISTENCY: CANDIDATE** (review branch `handoff/bloom-040-review`,
from production `c1b5171` / docs `d03c6f9`; NOT in production `main`; presentation / navigation only — no gameplay, species, Challenge, bank,
world-generation or room-layout change). Record: [`evidence/bloom-040/REPORT.md`](evidence/bloom-040/REPORT.md).*

**LOCKED owner direction — BLOOM-040 (CANDIDATE implementation):**
- **TRANSITION SYSTEM: EDGE ASSEMBLE.** Map → plant workspace: the selected region is briefly emphasised (crisp; the rest dims; one soft
  pulse — no zoom, pan or morph), then the workspace assembles from the nearest edges — **header from the top · specimen from the left · work
  panel from the right** (≈ 0.5 s, staggered, ease `cubic-bezier(.2,.8,.2,1)`, transform / opacity). **Back** is the reverse (quicker), the
  map resolving underneath with the same region still selected. **Plant room → plant room** (Regions · Adapt · Spread · Terraform): the
  **specimen is fixed**, the surrounding UI changes (header copy and work / information panels: a short fade + ~16 px). **Reduced Motion:** a
  restrained cross-fade, no directional travel; the specimen fixed in either mode. No cloud / weather wipes, giant foreground objects,
  parallax, dramatic zooms, full-screen slides or spins. The report, menu and survey transitions are unchanged.
- **Canonical fixed specimen geometry** across Regions / Adapt / Spread / Terraform: one `.lf-top` box (the 21 % left column, 170 : 196,
  ≤ 56 % of the zone) — same x, y, width, height, scale and scene bounds; Terraform conforms. The environment scene fills the box (sky full
  width; ground to the left, right and bottom edges); the caption overlays it.
- **Weather is environmental presentation, never a transition device.** Rain and snow read more clearly (size and contrast, not density);
  the weather continues through navigation (the page clock) and is never accelerated, swept or restarted to hide a page change.
- **Home selection — the production contract (PMO lock):** opening a plant room does NOT clear or change the home selection (no
  `bloom:region-select {id:null}` — the 029C behaviour is retired); the room never owns or mutates it; when Back completes the same region
  is still selected and its banner returns.
- **REPORT: a quiet CROSSFADE (PMO correction).** The Bloom / Extinction report opens and closes with a calm crossfade (the run / map fades
  back, the report fades in; ≈ 340 ms, reversed for Keep playing; reduced motion ≈ 120 ms). It is NOT Edge Assemble and NEVER the mist /
  cloud page transition — no page navigation uses the mist any more (the AtmosphereTransition utility stays for the Expedition descent).
- **TRAINING ANATOMY: the canonical full production specimen, no ghost dither (PMO correction).** While the guided training teaches the
  plant's parts on the Adapt room's callouts (the lessons "Find the limiting factor" and "Change the plant"), the Adapt specimen is the FULL
  canonical Organic Hybrid for the current adaptation state — a presentation override only (no colony is created; the caption still reads
  "No colony yet"). **GENERAL NO-COLONY GHOST: still valid** everywhere else, every other lesson included.
- **Training's specimen** uses the canonical production Organic Hybrid path (no proof / fallback art): see the report.

*Previous: 2026-10-14, **BLOOM-039 CLOSEOUT — BLOOM-038: IMPLEMENTED / COMPLETE (automated design audit) · BLOOM-039: IMPLEMENTED /
COMPLETE (pre-playtest clarity & UX) · LIVE.** Production `main` was fast-forwarded `8b23e78` → **`c1b5171`** (the exact PMO-accepted review head;
no merge commit, squash, rebase, cherry-pick or force push) and is live at <https://interstellarharvest.github.io/bloom/> (GitHub Actions Pages run
38673127447 — success). Review regression **46 / 46 suites, 2,119 checks, 0 failures**; clean-main release QA 11 / 11 (703 checks); live
verification Chromium 21 / 21 and Firefox 21 / 21; seed bank sha256 `8506124b…` unchanged (no bank rebuild, no mechanic change). Record:
[`evidence/bloom-039/REPORT.md`](evidence/bloom-039/REPORT.md) § Release closeout. **Development is STOPPED: the next phase is HUMAN PLAYTEST.
No BLOOM-040 is started or approved.***

**LOCKED by BLOOM-039 (PMO, 2026-10-14):**
- **Aggregate region states** (one vocabulary everywhere — banner, rooms, labels, Map View): **OK** = ordinary growth supported ·
  **STRAINED** = growth supported, one or more conditions poor · **BLOCKED** = growth not supported · **REFUGE** = growth not supported
  naturally, the protected origin survives because of the landing refuge. Growth is the engine's own rule (`fitness > grow.growThresh`).
  REFUGE is never used merely because one factor sits under a presentation threshold (Oasis Line's Seep Wastes at unprotected fitness
  0.583 reads STRAINED). Condition boxes name the physical condition (Toxic, Salty, Radioactive …) with the same status words.
- **Application width:** `--bloom-app-max: 1920px`; wider browsers centre the game with passive side wells. Do not restore unlimited
  expansion to fill a monitor. The title painting stays full-bleed.
- **Selected-region panel:** bottom-centre by default; top, under the HUD, when the bottom placement would cover > 15 % of the selected
  region's real tiles; decided once per selection (and per stage size). Not a fixed lower-quarter rule.
- **Native Competition clarity** (presentation only; native mechanics unchanged): the competition reason in the banner, ownership shown
  apart from suitability, the native mark instead of ✓, the Your plant / Natives Terraform preview, the FRONT STALLED cue.
- **Hidden tab / sleep:** hidden wall-clock time is never simulated on return; speed, an explicit pause and a room's pause are kept.

**HELD FOR HUMAN PLAYTEST — QUESTIONS, not planned changes** (BLOOM-038 measured them; nothing is decided or scheduled):
Volatile Climate tuning (shock threshold / forcing memory) · Dying World decline strength and timing · Thin Air final-atmosphere hold
duration · Ocean Archipelago pacing (Spread sequence, late run) · the Biomass economy and decision cadence · the 70 % win target · species
balance · Challenge recipes · Oasis Line's distinctness from Native Competition · Terraform balance · save / Continue · whether map-level
inspection (the selected-region banner, Map View, the run menu) should pause · the vertical surplus inside decision rooms on very tall windows.

*Last updated: 2026-10-13, **RELEASE CLOSEOUT — BLOOM-037: IMPLEMENTED / COMPLETE · FINAL HARDENING: COMPLETE · RELEASE: LIVE.** Production
`main` was fast-forwarded `3cc3e33` → **`2c491f1`** (the exact PMO-corrected review head; no merge commit, squash, rebase, cherry-pick or force
push) and is live at <https://interstellarharvest.github.io/bloom/> (GitHub Actions Pages workflow run 38482916954 — success; the only deployment
source). Final regression on the release head: **45 / 45 suites, 2053 checks, 0 failures**; Chromium 20 / 20, Firefox 20 / 20, WebKit 19 / 19
(axe-core 0 critical / 0 serious on 23 screens); portable fingerprint `b8d4eb23…`; seed bank sha256 `8506124b…` (format 2, 15 × 50). Release
record: [`evidence/bloom-037/REPORT.md`](evidence/bloom-037/REPORT.md) § Release closeout. **No further milestone is started or approved.***

*BLOOM-037 summary (2026-10-13). **The product is FROZEN** (EXPEDITION · CHALLENGES · TRAINING; four species; six Challenges); 037 changed only
documentation, dead code, accessibility and release readiness. **PMO final review (2026-10-13): hardening ACCEPTED; one release-blocking
correction — the six sub-WCAG-AA colour-contrast pairs — FIXED before release** (text-only shades and gameplay button shades; the semantic hues
unchanged). **Locked:** gameplay ≥ 1024 px is an accepted v1 limitation (no phone gameplay UI); Safari itself stays untested / not claimed (WebKit
proxy evidence only). The canonical inventory of what ships: [`RELEASE_STATE_v1.md`](RELEASE_STATE_v1.md);
record [`evidence/bloom-037/REPORT.md`](evidence/bloom-037/REPORT.md).*

*Production `main` (2026-10-13): **BLOOM-036 CLOSEOUT — CHALLENGES: IMPLEMENTED / COMPLETE for the current release scope.** **BLOOM-036A · 036B · 036B1 ·
036C · 036C1 · 036D · 036D1: IMPLEMENTED / COMPLETE.** Released Challenges: Dying World · Native Competition · Volatile Climate · Low Tide · Oasis Line ·
**Thin Air** (§8). Completion system: exactly one released condition type, `pressure-final-state`; **no additional condition type is planned without a
new study**. **Progression / rewards: NOT APPROVED / NOT STARTED** · **medals / scoring / tiers / unlocks: NOT PLANNED**. **Next: FINAL HARDENING /
RELEASE.***

*Production `main` (2026-10-13): **BLOOM-036D1 integrated**. The PMO accepted 036D1 for release (Thin Air and the completion system) with one
presentation-only correction (an extinction report's pressure line no longer says "continues if you keep playing" — a loss has no Keep playing);
`main` was fast-forwarded `d0eaf8f` → `3b4d3a7` (accepted candidate `e64d0c4` + the copy correction; no merge commit, squash, rebase, cherry-pick or
force push); this docs-only closeout follows it. Record: [`evidence/bloom-036d1/REPORT.md`](evidence/bloom-036d1/REPORT.md).*

*Production `main` (2026-10-12): **BLOOM-036C1 integration closeout**. The PMO accepted BLOOM-036C1 for release with one narrow presentation correction
(REFUGE, below); production `main` was fast-forwarded to the exact corrected review head `d69d458` (accepted candidate `659b240` + the correction; from
`d8ca0cb`; no merge commit, squash, rebase, cherry-pick or force push); this docs-only closeout follows it. **BLOOM-036C (content study): IMPLEMENTED /
COMPLETE** ([`CHALLENGE_CONTENT_STUDY_v1.md`](CHALLENGE_CONTENT_STUDY_v1.md)) · **BLOOM-036C1: IMPLEMENTED / COMPLETE** — **Low Tide** and **Oasis Line**
released (§8) · **Windfall: HOLD** · **Thin Air: RESERVE** · **Hearthfire: RESERVE** · **Challenge completion conditions: NOT IMPLEMENTED** · **036D: NEXT
— completion-condition design / calibration study**. Record: [`evidence/bloom-036c1/REPORT.md`](evidence/bloom-036c1/REPORT.md).*

*Production `main` (2026-10-12): the PMO accepted the 036C content study and `main` was fast-forwarded to it (`d8ca0cb`, a research milestone:
tooling, results, docs). Before that, the **BLOOM-036 Challenges integration closeout**. The PMO accepted the combined 036A + 036B + 036B1 candidate and
production `main` was fast-forwarded to the exact accepted review head `bd0eb27` (from `47ae6c3`; no merge commit, squash, rebase,
cherry-pick or force push); this docs-only closeout follows it. **BLOOM-036A: IMPLEMENTED / COMPLETE** (as part of the combined Challenges
release) · **BLOOM-036B: IMPLEMENTED / COMPLETE** · **BLOOM-036B1: IMPLEMENTED / COMPLETE** · **CHALLENGES: IMPLEMENTED** for the current
first playable product — **Dying World · Native Competition · Volatile Climate** (§8). Design: [`CHALLENGES_SYSTEM_v1.md`](CHALLENGES_SYSTEM_v1.md); records: [`evidence/bloom-036a/REPORT.md`](evidence/bloom-036a/REPORT.md),
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
```
(v1.0.1, owner direction: CREDITS removed from the player-facing menu; attribution and licences stay in the repository.)

- **IMPLEMENTED** (BLOOM-033): BEGIN EXPEDITION → **EXPEDITION**. **The full target menu is IMPLEMENTED** since BLOOM-036: EXPEDITION ·
  CHALLENGES · TRAINING · SETTINGS (· CREDITS until v1.0.1).
- **UI correction (2026-10-10, owner / PMO): no survey-complete banner** — and **(v1.0.1, owner): no survey status on the title at all.**
  The prefetch still starts silently while the title shows (BEGIN EXPEDITION adopts whatever is ready); the title never says "Surveying
  sector", "n of 9 worlds", "Sector surveyed" or "worlds ready" (no status line, toast or badge) — the Destination Survey's own header
  reports progress once the player is in it. Guarded by `main-menu-check` M8, `release-check` R16b and `ui-polish-check`.
- **v1.0.1 UI polish — LIVE 2026-10-14 (release head `f631f4f`; PMO accepted; strict axe gate green):** Settings stays small — Motion · "Show Training recommendation again" · "Reset preferences"
  (local preferences only; no difficulty / audio / graphics / colour / text-size / save / Challenge options; Fullscreen is explicitly
  deferred). **Pause truth (corrected by BLOOM-039, from the BLOOM-038 measurement):** all four decision rooms — Region Inspect, Adapt, Spread,
  Terraform — **already pause the run unconditionally** (0 ticks while open; scenario clocks frozen; Back restores the prior state), so "pause
  while a decision room is open" is not a future setting. The open question is only whether **map-level inspection** — the selected-region
  banner, Map View and the run menu — should also pause (about 6 s of run time per map inspection): a **HUMAN PLAYTEST QUESTION**, not
  implemented. (Separate and implemented by BLOOM-039: a hidden tab or a sleeping laptop no longer advances the run.) No player-facing text is pointer-selectable. Right-hand planning panels take their content's height. The flat map
  shows ONE copy of a cylindrical world. Icy water on frozen planets is distinct from frozen land.
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
- The classification measures how hospitable the generated world is to the **starting species** (species-relative since BLOOM-035B / C:
  the same planet can classify differently for different species).

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
| Challenges | **IMPLEMENTED / COMPLETE** for the current release scope (Dying World · Native Competition · Volatile Climate · Low Tide · Oasis Line · Thin Air, §8) |
| BLOOM-036A | **IMPLEMENTED / COMPLETE** (as part of the combined Challenges release) |
| BLOOM-036B | **IMPLEMENTED / COMPLETE** |
| BLOOM-036B1 | **IMPLEMENTED / COMPLETE** (prevalidated seed banks) |
| BLOOM-036C (content study) | **IMPLEMENTED / COMPLETE** (PMO-accepted, `d8ca0cb`) |
| BLOOM-036C1 (first authored Challenges) | **IMPLEMENTED / COMPLETE** — Low Tide · Oasis Line released (`d69d458`) |
| BLOOM-036D (completion-condition study) | **IMPLEMENTED / COMPLETE** (PMO-accepted, `d0eaf8f`) |
| BLOOM-036D1 (Thin Air · `pressure-final-state`) | **IMPLEMENTED / COMPLETE** (`3b4d3a7`) — the generic engine win gate, the completion boundary, Thin Air, bank format 2 |
| Medals / scoring / tiers / unlocks | **NOT PLANNED** |
| Progression / rewards | **NOT APPROVED / NOT STARTED** |
| BLOOM-037 (final hardening & release) | **IMPLEMENTED / COMPLETE** — **RELEASE LIVE** (`2c491f1`) — [`RELEASE_STATE_v1.md`](RELEASE_STATE_v1.md) |

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
- **Challenges: IMPLEMENTED** (§8). Dying World, Native Competition and Volatile Climate leave the plant to the player (the species screen
  names the Challenge, drops Organic Hybrid's "Recommended first expedition" note and reads "Continue with <plant>"); Low Tide (Organic
  Hybrid), Oasis Line (Reed Spire) and Thin Air (Woolly Candle) prescribe it and skip Choose Plant Species.

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
  accepted, so the game never shows proof art as a species (BLOOM-035C2, released: the real art is in; the flag is retired and ignored).

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
**BLOOM-036B1: IMPLEMENTED / COMPLETE** · **CHALLENGES: IMPLEMENTED / COMPLETE for the current release scope** · **BLOOM-036C study:
IMPLEMENTED / COMPLETE** · **BLOOM-036C1 (Low Tide · Oasis Line): IMPLEMENTED / COMPLETE** (`d69d458`) · **BLOOM-036D study: IMPLEMENTED / COMPLETE**
(`d0eaf8f`) · **BLOOM-036D1 (Thin Air · completion): IMPLEMENTED / COMPLETE** (`3b4d3a7`). 036A/B/B1 PMO-accepted and fast-forwarded into production `main` as one combined release (`bd0eb27`,
2026-10-12). **Sequence (locked):** BLOOM-035B species engineering (complete) → BLOOM-035C final species art + the normal Species Selection
release (complete) → BLOOM-036A/B/B1 the Challenges system and its first three Challenges (complete) → 036C authored Challenge content
(complete: 036C1 Low Tide + Oasis Line, 036D study, 036D1 Thin Air) → BLOOM-037 final hardening & release (complete; live).

**Current released Challenges (production `main`):** 1. **Dying World** · 2. **Native Competition** · 3. **Volatile Climate** · 4. **Low Tide** ·
5. **Oasis Line** · 6. **Thin Air** (hub order — content order, not a ranking).

**BLOOM-036D1 — IMPLEMENTED / COMPLETE** (`3b4d3a7`): **Thin Air** — Dying World · prescribed **Woolly Candle** · Desert World +
Ocean Archipelago · normal start · completion **Bloom AND `pressure-final-state`**: an early 70 % Bloom is only a milestone (no stop, no report, the run
goes on, extinction stays live — "BLOOM REACHED — hold it until the atmosphere settles.", badge HOLDING); the run is won once, on the first tick with
coverage ≥ the threshold in the final atmosphere (FINAL ATMOSPHERE ✓). Engine: a GENERIC optional win gate (`createSim` `canWin`; no gate = bit for
bit; the engine names no Challenge). Completion semantics: `resources/challenges/challenge-completion.js` (one condition type, no parameters, ≤ 1
condition, pressure scenarios only). Bank: format 2 / validator @2, every cell carries `completionFingerprint`; **15 cells × 50 = 750** (the 14
released cells' 700 entries unchanged — only their provenance changed; `thin_air/woolly_candle` new: 25 Desert World + 25 Ocean Archipelago, 310 of the 320 Desert / Ocean pool worlds qualified), sha256 `8506124b462cf4d47710a1eb37806ddead9dd3f600c28c36cfcfd071fda59e40` — **the current production bank (format 2, 15 cells, 50 entries each, 750
in all; the existing 14 cells' 700 selections preserved exactly through the migration; Thin Air 25 Desert + 25 Ocean)**. The five earlier Challenges
keep `conditions: []` and are mechanically and textually unchanged. **`sim.won` means the run's ACTUAL completion** (the generic engine gate); an early
Thin Air Bloom is a milestone only until the final-atmosphere condition is met. **Exactly one released condition type (`pressure-final-state`); no
additional condition type is planned without a new study.**

**BLOOM-036C1 — IMPLEMENTED / COMPLETE** (`d69d458`): the first **authored** Challenges, from the PMO-accepted content study — equal cards on the same
hub, no basic / advanced split. Release seed bank: **14 cells × 50 = 700 entries**, sha256 `5cd2e385963abcfdaf2a3bd5191f721ae2207b2c17510ef93cb1420737d1bcf3`
(`node tools/build-challenge-seed-bank.mjs --per-archetype 160 --workers 12`; the 12 original cells' entries unchanged). **No Challenge
completion conditions yet** at 036C1 (every Challenge completed with the normal Bloom until 036D1's Thin Air).

- **Low Tide** — Dying World · prescribed **Organic Hybrid** · Ocean Archipelago only · lands WITH Flood Adaptation + Salt Handling (given by the
  Challenge, never a purchase) and the normal Biomass; because the plant is committed to the wet water strategy, **Drought Adaptation is
  unavailable** for the run — the dossier says so (engine-decided, `BLOOM.challenges.closedByStart`).
- **Oasis Line** — Native Competition · prescribed **Reed Spire** · Desert World only · **no 20 % arrival floor** · normal start. Its pace (~501 s
  perfect-play median) is **accepted** as right for the spatial competition scenario; not shortened.
- Several Challenges may share one scenario: each keeps its own id, name, version, recipe, bank cells and provenance; hub, run and report name the
  Challenge, never only the scenario. Prescribed-plant Challenges skip Choose Plant Species.
- **Windfall: HOLD** — the focused recalibration (200 / 225 / 250 starting Biomass, CHALLENGE_CONTENT_STUDY §11) met content supply but failed the
  premise gate: extra Biomass mostly speeds the ordinary game up and does not make shock-exposed winning strategies more available.
  ~~Thin Air: RESERVE~~ → **Thin Air: RELEASED in 036D1** (with its completion condition, above).
  **Hearthfire: REJECTED** under the studied completion conditions (036D study: +6 / +12 / +18 °C warming decorative, supply-collapsing or beyond the
  validator's sky search) — RESERVE design history only.
- **REFUGE — protected landing refuge (LOCKED presentation rule).** When the run's origin region's own ground would be Blocked but the landing-refuge
  rule keeps the plant alive there, its status chip reads **Refuge** (shield; "Protected landing refuge") instead of Blocked; the Origin marker and the
  real limiting condition stay; derived from the real current state (Adapt / Terraform or lost protection return the ordinary status). Non-origin
  unsuitable regions stay **Blocked**. Presentation only (fitness, spread, establishment, origin protection, validation, banks unchanged).
- Released-copy corrections (036C1): Native Competition's strategic idea; Volatile Climate says the climate is stable until you Terraform, that quick
  or repeated steps swing it, and that adapting never unsettles it (both version 4: presentation is part of a Challenge's revision and its bank
  cells, so those cells were rebuilt — same worlds, same proofs). A dossier whose landing share is under 5 % explains it.

**Canonical Challenge world model (LOCKED):** ONE procedural planet selected from a **versioned bank of prevalidated procedural seeds**. No 3 × 3
Destination Survey inside a Challenge. Normal Challenge startup:

```
Hub → Choose Plant Species (where the Challenge allows it) → the prevalidated planet → Challenge Planet Dossier → Run → Challenge Debrief
```

The runtime performs **no** expensive scenario / winnability proof: it regenerates the bank entry's exact planet in milliseconds and verifies its
fingerprint; the proof was made offline.

**Current release seed bank (036D1):** format 2 · 15 cells × 50 = 750 entries · 400 847 bytes · sha256 `8506124b…` (above; [`RELEASE_STATE_v1.md`](RELEASE_STATE_v1.md) §6).
*History —* **the first release seed bank (BLOOM-036B1):** `content/challenge-seed-banks.js` — bank version 1, 3 Challenges × 4 species = **12 cells × 50 = 600 entries**,
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
- Released bank size: **50 entries per Challenge × species** (036B1: 3 Challenges × 4 species = 12 cells / 600 entries; now 15 cells / 750).
- Native Competition × Reed Spire archetype distribution **5 Desert / 23 Frozen / 22 Ocean: ACCEPTED**. Equal archetype quotas are not forced
  where physiology and recipe do not support them.
- **Volatile Climate:** no proof witness is required to trigger a climate shock — a player may rationally avoid Terraforming and with it the
  risk.
- Broad **Dying World / Volatile Climate** banks may keep fully proven **0 %-arrival** worlds; no arrival floor without a future authored
  Challenge design reason.
- The **312 KB** runtime bank loaded at title boot is **accepted for v1**; no lazy-load machinery for this size (now ~401 KB with 036D1's
  format 2 and three more cells — same policy).
- **Stale-bank refusal** (above) is locked.

**Known QA debt (pre-existing, not a Challenges defect):** `tools/slice-check.js`'s pacing rule (perfect-bot win in 4–8 min, floor 240 s) is
stochastic — the demo harness simulation draws on `Math.random`, so its win time varies run to run (observed 231–262 s, failing on both the
accepted head and the previous review head). The bounds are not loosened and simulation gameplay is not changed for it; a future isolated
QA-maintenance task may make the test deterministic.

**IMPLEMENTED** ([`CHALLENGES_SYSTEM_v1.md`](CHALLENGES_SYSTEM_v1.md) — canonical):

- A **Challenge is a product definition that references a scenario** (`content/challenges.js`, schema 2, resolved and frozen by
  `resources/bloom-challenges.js`); the scenario's mechanics stay in `content/scenarios.js` and the engine — a Challenge carrying a
  mechanics key, a verbatim copy of scenario text, the default scenario or any launch value the runtime cannot honour is refused.
- The initial released set (036A/B): **Dying World** · **Native Competition** · **Volatile Climate** — player-choice species, the normal start, the
  normal Bloom; then **Low Tide** · **Oasis Line** (036C1) and **Thin Air** (036D1). No difficulty labels, stars, scores or recommended skill;
  content order is not a ranking.
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
- **Prescribed species and starting state** (implemented in 036B as QA fixtures; **released** by 036C1 / 036D1): a prescribed species skips
  Choose Plant Species (Low Tide, Oasis Line, Thin Air); a prescribed starting state (owned plant adaptations and / or starting Biomass,
  applied by the engine's own `createSim` option; proven from that start; the report says the Challenge gave it) — Low Tide.
- **History:** 036A launched a Challenge through a scenario-proven Destination Survey (interim PMO directive, ~4–32 s); 036B replaced it —
  the survey is the Expedition's only again (its heading "Expected challenges" is now **Expected hazards**). 036B first searched and proved
  each Challenge world live in the browser (Native Competition 20–90 s in the tail); 036B1 moved that proof offline into the seed banks
  ([`evidence/bloom-036b/NATIVE_COMPETITION_LATENCY_STUDY.md`](evidence/bloom-036b/NATIVE_COMPETITION_LATENCY_STUDY.md), superseded findings).
  The dossier no longer shows a separate "Foothold" line (the S1 metric stays in the bank and the instance).
- Invariants: EXPEDITION = its 3 × 3 survey and the default scenario, no Challenge residue; TRAINING = Organic Hybrid, no Challenge; Main
  Menu clears the Challenge.
- *(036B-era "not yet" list, since delivered: authored Challenges with prescribed species / starting states / world recipes — 036C1;
  a completion condition — 036D1's `pressure-final-state`, the only type.)* **Not planned:** medals, scoring, difficulty tiers,
  unlock trees, campaign progression — none is invented without a later, explicit approval.

Shape of BLOOM-036 (**roadmap correction, 2026-10-12**):

- **036A — COMPLETE** — the main-menu CHALLENGES entry, the Challenge hub, the definition schema, single-document routing.
- **036B + 036B1 — COMPLETE** — the contained Challenge (ONE planet, the dossier, instance provenance, Retry / Challenges / Main Menu),
  prescribed species and starting-state support (QA fixtures), prevalidated seed banks.
- *The older plan's "036C — migrate / reuse Dying World, Native Competition and Volatile Climate as Challenge ingredients" was pulled forward
  and is **already complete** in 036A / 036B: the three released Challenges reference those scenarios (no duplicated mechanics). It is not
  future work.*
- **036C — AUTHORED CHALLENGE CONTENT — study COMPLETE** (PMO-accepted). Which contained situations BLOOM can author from species, planet
  selection, starting state and the existing scenario mechanics — studied read-only and offline (seed-bank pipeline). **036C1 — the first authored
  batch: Low Tide + Oasis Line — IMPLEMENTED / COMPLETE**; Windfall HOLD, Thin Air and Hearthfire RESERVE.
- **036D — completion-condition study: IMPLEMENTED / COMPLETE** (PMO-accepted) → **036D1 — Thin Air with `pressure-final-state`: IMPLEMENTED / COMPLETE.** **BLOOM-036 is closed; next: final hardening / release.** No
  other condition type is implemented or planned without a new study; progression / reward systems **only if later approved**.

- CHALLENGES are **not** modifiers chosen during a normal Expedition. They are separate, SimCity-style contained challenge runs.
- Flow: CHALLENGES → choose one authored challenge → the game takes ONE prevalidated planet from that challenge's seed bank (036B1) → challenge
  dossier → Begin Challenge → gameplay. **No 3 × 3 Destination Survey inside a Challenge.**
- A Challenge definition may prescribe: planet archetype / environmental identity; generation constraints; the starting species; an
  altered species baseline or starting owned mutations when that is specifically part of the challenge; existing special mechanics;
  win / loss framing; the briefing / science concept.
- The completed mechanics **Dying World**, **Native Competition** and **Volatile Climate** are Challenge ingredients — no longer
  ordinary Expedition-condition choices; they are the scenarios of the six released Challenges (the developer harness
  `demos/demo-run.html?…&scenario=<id>` still runs them directly).
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

- *(the problem BLOOM-034 solved)* The title / menu and the Destination Survey diverged too much from the production gameplay visual language.
- Planning screens stay **darker** than gameplay and keep the outer-space feeling, but must look like the same game.
- Shared language: the same rounded sans-serif font family as gameplay; the same semantic colours (leaf green, bloom pink, sky blue,
  Biomass gold, pressure violet, OK / warning / blocked); the same icon language; the same chunky, friendly control proportions; the same
  irregular rounded-corner family; the same hierarchy and accessibility language.
- Dark planning screens use dark / space counterparts of the light gameplay surfaces. The space feeling comes from darkness, stars,
  planets, atmospheric glow and restrained translucent dark surfaces. **Not** neon / cyberpunk / sci-fi HUD styling.
- The main-menu serif / ornate gold-plaque interface language is retired (BLOOM-034). The hand-painted menu backgrounds stay.
- Title artwork may remain more expressive / cinematic than ordinary UI type; interactive interface text belongs to the gameplay font
  family.

## 10. Audio · save · difficulty

**LOCKED DESIGN.**

- No audio is currently planned.
- No run save / Continue system is currently planned.
- No separate difficulty setting is planned. Challenge difficulty comes from the authored challenge; Expedition difficulty comes from the
  species + the generated world / survey class.

## 11. GitHub Pages

**Pages is LIVE** at <https://interstellarharvest.github.io/bloom/>, published by the repository's own workflow only
(`.github/workflows/pages.yml` → `tools/build-pages-site.mjs`: `index.html` + `content/` + `planets/` + `resources/`). The one-time owner
setting is **done** (BLOOM-037): GitHub repository → **Settings → Pages → Build and deployment → Source: GitHub Actions** (the Pages API reports
`build_type: workflow`). *History:* the BLOOM-037 audit (2026-10-12) found the legacy "Deploy from a branch" source (`main`, `/`) still active
— GitHub's legacy build published the whole repository and raced the workflow on every push.

This is not a gameplay-code feature; product code does not work around repository settings.

---

## Ordered roadmap

| Step | Scope | Status |
|---|---|---|
| **BLOOM-033** — Single-document production application | `index.html` is the whole game; GameSession; `default`; Favorable / Precarious / Extreme; EXPEDITION | **IMPLEMENTED / COMPLETE** (in production `main`) |
| **BLOOM-034** — Visual-system convergence | shared theme tokens (`resources/ui/bloom-theme.css`); title / menu restyle; Destination Survey convergence; the dark-space BLOOM planning language; **no species mechanics yet** | **IMPLEMENTED / COMPLETE** (in production `main`) |
| **BLOOM-035A** — Species design / research | species architecture, the reference physiology, the strategic-distinctness study, body plans and concepts | **ACCEPTED / COMPLETE** (docs + research in `main`) |
| **BLOOM-035B** — Species system implementation + Species Selection | species data / model; `config.referencePlant`; simulation / validator support; species-aware Destination Survey; run plumbing; body-plan layer with proof packs; the Species Selection screen behind `?species=1` | **IMPLEMENTED / COMPLETE** (PMO-accepted `2180fcd`, in production `main`; at 035B Species Selection was still behind `?species=1` on TEMPORARY PIPELINE PROOF art — both retired by 035C) |
| **BLOOM-035C** — Final species art + Species Selection release | three final production species packs (Cinder Rosette, Woolly Candle, Reed Spire; four species total) on the same compositor architecture; the generalized real-pack intake (035C0: `tools/intake-plant-art.mjs --pack <id>`, schemas in `PLANT_SPRITE_PIPELINE_v1.md` § SPECIES_ART_INTAKE); the three species on their real packs (Woolly Candle on `candle@2`); Species Selection released in the normal EXPEDITION flow (`?species=1` not required); dynamic region specimen environments | **IMPLEMENTED / COMPLETE** (PMO-accepted 035C2 `4ac7301`, in production `main`) |
| **BLOOM-036A** — Challenges foundation + first playable hub | the CHALLENGES menu entry; the Challenge hub; the definition schema (`content/challenges.js`, `BLOOM.challenges`); single-document routing; (interim, superseded by 036B) a scenario-proven Destination Survey | **IMPLEMENTED / COMPLETE** (accepted `8af3e12`; released inside the combined Challenges release `bd0eb27`) |
| **BLOOM-036B** — Contained Challenge worlds | ONE prevalidated procedural planet per Challenge instance (no survey); PREPARING CHALLENGE WORLD + the Challenge Planet Dossier; instance provenance; Retry Challenge / Challenges; prescribed species + starting-state support (QA fixtures); the three scenarios as Challenge ingredients | **IMPLEMENTED / COMPLETE** (`bd0eb27`, in production `main`) |
| **BLOOM-036B1** — Prevalidated seed banks | the offline bank builder, 12 cells × 50 proven seeds, runtime provenance check + stale-bank refusal, no proof at runtime | **IMPLEMENTED / COMPLETE** (`bd0eb27`, in production `main`) |
| **BLOOM-036C** — Authored Challenge content study | design + read-only calibration of the first genuinely authored Challenge set (species · planet selection · starting state · existing scenarios) | **IMPLEMENTED / COMPLETE** (PMO-accepted, `d8ca0cb`; [`CHALLENGE_CONTENT_STUDY_v1.md`](CHALLENGE_CONTENT_STUDY_v1.md)) |
| **BLOOM-036C1** — First authored Challenges | Low Tide + Oasis Line with their own bank cells; the released-copy corrections; the low-arrival dossier line; the REFUGE status; Windfall recalibrated → HOLD | **IMPLEMENTED / COMPLETE** (`d69d458`, in production `main`) |
| **BLOOM-036D** — Challenge completion-condition study | which completion conditions make an authored premise unavoidable (Thin Air, Hearthfire, Windfall, Oasis Line), calibrated offline; the minimal schema; validator / bank impact | **IMPLEMENTED / COMPLETE** (PMO-accepted, `d0eaf8f`; the study's backwards `sim.won` sentence corrected in 036D1) |
| **BLOOM-036D1** — Thin Air | exactly one completion condition type (`pressure-final-state`); a GENERIC engine win gate; `challenge-completion.js`; Thin Air (Dying World · Woolly Candle · Desert + Ocean); completionFingerprint provenance (bank format 2, 15 cells × 50) | **IMPLEMENTED / COMPLETE** (`3b4d3a7`, in production `main`) |
| **BLOOM-036E+** — progression | progression / rewards only if later approved; no further condition type without a new study | NOT APPROVED |
| **BLOOM-037** — Final hardening & release | documentation reconciliation + `RELEASE_STATE_v1.md`; dead production-path cleanup; offline / subpath / portable proof; accessibility, responsive, WebKit and performance passes; the gameplay smoke matrix; full regression; Pages readiness | **IMPLEMENTED / COMPLETE — RELEASE LIVE** (`2c491f1`; the contrast correction included) |
| **v1.0.1** — UI polish hotfix | title / settings / selection / planning panels / one-copy map / icy water (presentation only) | **IMPLEMENTED / COMPLETE** (LIVE, closeout `2590d79`) |
| **BLOOM-038** — Automated design audit | read-only design / visual-quality study: 4,424 policy runs, the visual atlas, affordance / copy / pause audits, failure states ([`DESIGN_AUDIT_v1.md`](DESIGN_AUDIT_v1.md)) | **IMPLEMENTED / COMPLETE** — compact research record in `main` (`8b23e78`; the regenerable ~56 MB raw atlas intentionally not in history) |
| **BLOOM-039** — Pre-playtest clarity & UX | presentation / shell only, before human playtesting: Native Competition legibility (competition reason, native-held mark, Terraform native preview, FRONT STALLED cue); an honest region readout (status from the engine's grow rule, multi-step "Would help" with real prices, toxicity truth); hidden-tab / long-gap timekeeping; copy fixes (landing pointer, Challenge card title, one severity vocabulary, unaffordable reason at rest); the region banner flips to the top when it would cover its region; region-name pills select the region they name; ONE shared application width (≤ 1920 px, centred). No mechanic, bank, balance or species change ([`evidence/bloom-039/REPORT.md`](evidence/bloom-039/REPORT.md)) | **IMPLEMENTED / COMPLETE** — LIVE (`main` `c1b5171`, Pages run 38673127447) |
| **BLOOM-040** — Edge Assemble transitions + specimen consistency | presentation / navigation only: Edge Assemble map ↔ plant workspace (header top · specimen left · work panel right; reverse on Back; reduced motion = cross-fade); room ↔ room with a fixed specimen; ONE canonical specimen geometry (Terraform conforms); the scene fills its box; clearer rain / snow; weather never a transition device; the home selection kept through a room; Training's specimen audited (canonical path) ([`evidence/bloom-040/REPORT.md`](evidence/bloom-040/REPORT.md)) | **CANDIDATE** — `handoff/bloom-040-review`, pending PMO review |
| **Human playtest** | QUESTIONS, not planned changes: Volatile Climate tuning, Dying World decline, Thin Air hold, Ocean pacing, Biomass economy / cadence, the 70 % target, species balance, Challenge recipes, Oasis Line distinctness, Terraform balance, save / Continue, whether map inspection should pause, tall-window room surplus | NEXT (not started) |
