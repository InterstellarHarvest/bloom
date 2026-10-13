# BLOOM-036D1 — Thin Air · the first Challenge completion condition — REPORT (CANDIDATE)

Branch `agent/bloom-036d1-thin-air` → review branch **`handoff/bloom-036d1-review`** (NOT merged; STOP for PMO review). Base: production `main`
`d0eaf8f` = the PMO-accepted 036D study, fast-forwarded from `bfd8461` (no merge commit / squash / rebase / cherry-pick / force push); the study
worktree, local branch and remote review branch were deleted after containment was proven.

Design record: [`CHALLENGES_SYSTEM_v1.md`](../../CHALLENGES_SYSTEM_v1.md) §2.5 (completion), §4 (bank format 2), §10 (Thin Air).

Commits on the review branch (from `d0eaf8f`): `c403815` implementation (engine gate, completion boundary, Thin Air, UI, bank format 2 + full
rebuild, portable runtime) · `ccd804c` QA (challenge-completion-check, suite updates, evidence) · `9d6ab67` QA (historical layer-P pins) · the docs
commit (engine-comment reword for training-check T8a, portable rebuilt, docs, this report).

## 1. Generic engine win gate

`createSim(planet, config, traits, { …, canWin })` — optional, generic: `canWin(sim, coverage) → boolean`, asked only on a tick with coverage ≥
`winAt` while the run is not won. The win rule is `!sim.won && coverage ≥ winAt && (no gate || canWin(sim, coverage) === true)` → `sim.won = true`,
`onWin` once. `sim.won` is the RUN's actual completion. With a gate an early crossing is not a win: the run continues, `onWin` does not fire,
extinction stays live. `sim.winGated` records that a gate was supplied (provenance). `bloom-sim.js` names no Challenge, condition or completion
concept (its only pre-existing "challenge" word is 036B's starting-state provenance default). A non-function gate is refused.

**Default runs unchanged (G1):** the First Bloom golden matches with no gate AND with an always-true gate; a real Dying World run (a Thin Air bank
world + its witness plan, 3 200 ticks) hashes identically tick for tick (tiles, densities, vigor, Biomass, sky, pressure, extinction counters) with
and without an always-true gate, winning on the same tick. `sim-check` (golden) passes unchanged. Expedition, Training and every ungated Challenge
pass NO gate (the session's `createSim` call is the old one; source-checked, C5; Expedition QA E: `sim.winGated === false`).

Engine proofs G2–G9 (on that real world): gate false + coverage ≥ winAt → `sim.won` false (734 ticks above), no `onWin`, the run ticks on through the
final state; extinction live — an engineered total die-off after the early Bloom is lost after the 8 s grace, while the ungated twin (won at the
crossing) is never lost; the gate opening while ≥ winAt wins exactly once on that tick; a permitting gate below winAt never wins (not even asked);
crossed early → cut to 40 % → gate opened → 201 ticks below, no win → won on the first tick back at winAt.

## 2. Completion schema + the one boundary

`resources/challenges/challenge-completion.js` (`BLOOM.challengeCompletion`, classic script, loaded after `bloom-challenges.js` everywhere — the title
boot now loads 20 classic scripts): `check` · `contract` · `fingerprint` · `winGate` · `goal` · `tracker` · `prove`. `bloom-challenges.js` delegates
completion validation to it; hub, dossier, session, report, builder and QA read it — no completion logic is duplicated.

```js
completion: { win: "bloom", conditions: [] }                                   // the five released Challenges (ungated)
completion: { win: "bloom", conditions: [{ type: "pressure-final-state" }] }  // Thin Air
```

Exactly one type, no parameters, at most one condition, legal only with a pressure scenario. Refused (C2–C4): unknown type, parameters / unknown
keys, the default / Native Competition / Volatile Climate scenarios, duplicates, > 1 condition, a non-list, another win.

## 3. Thin Air

`thin_air` v1 · scenario `dying_world` · prescribed **Woolly Candle** · recipe Desert World + Ocean Archipelago (no Frozen) · normal start · completion
Bloom AND `pressure-final-state`. Copy: the accepted 036C tagline / briefing / strategic idea; science "High-mountain giant rosettes such as
frailejones live with cold nights, dry winds and strong ultraviolet radiation. Woolly leaves and protective pigments are real adaptations to those
stresses; Strange Bloom uses a simplified changing-atmosphere model." (no oxygen / air-pressure claim). Adapt / Terraform fully open.

**Early Bloom:** HUD condition line `BLOOM REACHED — hold it until the atmosphere settles.` + `The atmosphere settles in m:ss` (the pressure clock),
badge **HOLDING** (PMO-approved), the log explains; falls back → `Final atmosphere: 96% · Bloom 62% / 70%`; final reached but short →
`Final atmosphere reached · regain Bloom: 62% / 70%`; complete → `FINAL ATMOSPHERE ✓` · BLOOMED. Keep playing = ordinary post-win play.

**Extinction after early Bloom:** a real EXTINCTION loss (no Keep playing); debrief "You reached Bloom before the atmosphere finished changing, but the
plant did not survive the final conditions." Never implies a win.

**Report (true win only):** FINAL ATMOSPHERE ✓ · "You held 70% of the land in the final atmosphere." · "Bloom was first reached at 3m 00s, before the
atmosphere settled at 4m 50s; you held it again in the final atmosphere at 4m 54s." (or "… You held on until the atmosphere settled at 4m 50s.").
Tracker provenance only (first early-Bloom time, completion time / coverage, final-atmosphere time) — no score.

## 4. Completion fingerprint + bank migration

`completionFingerprint = fnv(stable({ version: 1, win, conditions: [{ type, version }] }))` — ungated `c59f4a25`, Thin Air `8496aade`; changes with a
condition, a type's version or the contract version (C7). In every cell's provenance; in the instance (`makeBankInstance` refuses a cell proven for
another contract), the run (`challengeRun.completion`; `challengeRun()` refuses a foreign contract) and the report (`identity.challenge.completion`).

Versions: **bank `format` 1 → 2** (cell provenance gained `completionFingerprint`; a format-1 bank is STALE) · **`VALIDATOR_ID` @1 → @2** (the builder
now proves the completion contract) · Challenge `bank.version` unchanged (1; per-Challenge content revision) · the five released Challenge versions
unchanged. Stale detection was not bypassed: a full honest rebuild.

**Builder step 6 (completion):** `BLOOM.challengeCompletion.prove(ch, layerPVerdict, { winAt })` — from every proven strategy's hold record AND every
confirmation run's: `held === true && coverage ≥ winAt && progress === 1` (the engine clamps progress to exactly 1). Recorded per entry:

```json
"completion": { "conditions": ["pressure-final-state"], "proves": "coverage >= winAt while pressure.progress === 1", "runs": 1, "winAt": 0.7,
                "minHoldCoverage": 0.7372, "minHoldProgress": 1, "holdSeconds": 350.1, "finalAtSeconds": 290 }
```

Refused (K3): a hold before the final state, progress 0.9999, held-but-below-winAt, a failed / missing hold, a failing confirmation, evidence without
progress, no winAt, no verdict / strategy → stage `completion`. The witness hold records now carry `seconds` / `progress` (bloom-witness.js, additive).

## 5. The bank

`node tools/build-challenge-seed-bank.mjs --workers 14` (full pool, 480 worlds, 0 cached; ~70 min) → `content/challenge-seed-banks.js`
**400 847 B, sha256 `8506124b462cf4d47710a1eb37806ddead9dd3f600c28c36cfcfd071fda59e40`**, inputs `cf96f14e470882d7`; `--check` identical.

- **15 cells × 50 = 750 entries**, not provisional (K1).
- **Existing-bank stability (PMO checkpoint, K6):** the 14 cells released in 036C1 (`d0eaf8f`) hold **byte-identical entries** (same 700 worlds, same
  order, same proofs) — 0 reselected; only their provenance changed. **`thin_air/woolly_candle` is the only new cell.**
- **Thin Air cell:** Woolly Candle only; **25 Desert World + 25 Ocean Archipelago** (the curation's equal quotas — enough candidates in both);
  310 of the 320 Desert / Ocean pool worlds qualified (31 deprioritized by hold margin); classes extreme 28 · precarious 14 · favorable 8; **all 50
  entries explicitly prove the condition** (min hold coverage 0.737, progress 1, hold 350.1 s ≥ 290 s) (K2). Sampled entries re-validated and their
  witnesses replayed through the gated engine: each completes once, in the final atmosphere, never lost (K5).

## 6. Six-card hub

Six equal cards in content order (Dying World · Native Competition · Volatile Climate · Low Tide · Oasis Line · Thin Air); Thin Air's card carries the
chip "Bloom in the final atmosphere"; its dossier opens with **To win** (BLOOM 70% of land alive AND FINAL ATMOSPHERE …). Verified at 390 × 844,
1024 × 768, 1440 × 900, 2560 × 1440 (Firefox at 390 and 1024): ↓ ×5 / Home / End / ↑ / ↓ traverse all six, every keyboard-selected card is focused AND
fully in view, BEGIN CHALLENGE visible / hit-testable (phone: pinned in the sheet), no horizontal overflow, the list's overflow is discoverable (at
1024 × 768 the list scrolls 290 px and a card is cut at its bottom edge when the hub opens; at 1440 × 900 all six fit).
**One real defect found and fixed (smallest fix):** in Firefox, ↓ onto Oasis Line left it 71 px cut off — Firefox's `focus()` does not scroll a partly
visible element. The hub now calls `scrollIntoView({ block: "nearest" })` for the keyboard-selected card. No redesign.

## 7. QA

New suite `tools/challenge-completion-check.js`: Node G0–G9 · C1–C9 · K1–K6; browser H (hub) · T1–T6 (Thin Air flow) · T3b (the PMO's full
deterministic early-Bloom sequence) · R (retry) · L (early Bloom → extinction) · X (Dying World ordinary Bloom still ends at once) · E (Expedition) ·
P (file://) · B (/bloom/), Chromium + Firefox: **64 / 64**.

T3b (seeded page randomness, engineered dips; launch seed 5 → `desert_world:84289`, chosen in Node as the first entry whose witness blooms early):
early coverage 70 % at 58 % of the decline → not won → cut below winAt at 96 % → HUD `Final atmosphere: 96% · Bloom 62% / 70%` → final atmosphere
arrives at 62 % → still not won (`Final atmosphere reached · regain Bloom: 62% / 70%`) → regained at tick 1879 → won once (one `bloom:win`) → the
report opened then, once.

Focused + full regression: see §9.

## 8. Evidence (`docs/evidence/bloom-036d1/`, Chromium; `firefox-*` representative)

`h-hub-*.png` (six-card hub per viewport; phone list + sheet) · `h-hub-thin-air-dossier.png` · `t1-thin-air-planet-dossier.png` ·
`t2-thin-air-run-start.png` · `t3-thin-air-early-bloom.png` (HOLDING) · `t4-thin-air-continuing.png` · `t4b-thin-air-bloom-lost-before-final.png` ·
`t4c-thin-air-final-atmosphere-regain.png` · `t5-thin-air-true-win-report.png` · `t6-thin-air-final-atmosphere-hud.png` ·
`t7-thin-air-specimen-late-decline.png` · `r1-thin-air-retry.png` · `l1-thin-air-early-bloom-then-extinction.png` ·
`x1-dying-world-ordinary-bloom-ends.png` · `x2-expedition-ordinary-bloom.png`.

## 9. Regression

**Focused** (sequential): sim-check · dying-world-check · challenges-check 33/33 · challenge-world-check 108/108 · challenge-completion-check 64/64 ·
game-flow-check · run-ui-check · run-ui-convergence-check · single-app-flow-check 59/59 · portable-runtime-check 71/71 · release-check --no-suites ·
visual-system-check 54/54 — **12/12 green**. First pass: `run-ui-check` B8 failed (a 20th `BLOOM_API` member I had added — removed: `BLOOM_API`
keeps its pinned 19 members; completion is read through `adapter.completion()`); `run-ui-convergence-check` B5 (Firefox room-transition timing),
`release-check` (a Destination Survey candidate click timed out) and `portable-runtime-check` P12 (a guided-training callout-fit check over
file://) failed once under load and **pass when rerun alone** (none touches 036D1 code).

**Full regression** — every `tools/*-check.js` (45 suites), sequentially: **45 / 45 green** after two test-pin fixes and one comment reword:
- `native-competition-check` #4 and `volatile-climate-check`'s layer-P pins hashed the witness hold record, which now also carries `seconds` /
  `progress` (additive): they now hash the pre-036D1 hold fields (so they still prove the verdicts unchanged) and #4 asserts `progress === 1` on its own.
- `training-check` T8a forbids the word "training" anywhere in `bloom-sim.js`; the win-gate comment named Training runs — reworded (comment only;
  portable runtime rebuilt).
Affected suites rerun after the fixes: training-check ✓ · native-competition-check (incl. part B) ✓ · sim-check ✓ · challenge-completion-check (Node 26/26) ✓ · challenge-world-check (Node 13/13) ✓ · portable-runtime-check 71/71 ✓. `slice-check` (known stochastic pacing debt) passed and was not loosened.

## 10. Known concerns

- **Load-sensitive browser checks (pre-existing):** `run-ui-convergence-check` B5 (Firefox), `release-check`'s survey click and `portable-runtime-check`
  P12 failed once each under load in the focused pass and passed alone; not loosened.
- **Engineered QA:** the early-Bloom browser runs use a Biomass boost and the run's own witness plan; T3b also uses seeded page randomness and two
  engineered coverage dips (`thinTo`) to force the below-threshold-at-final path — a natural regain is not guaranteed on every world. The early Bloom →
  extinction run is an engineered total die-off. The browser launch seed is chosen in Node (the first Desert entry whose witness blooms early).
- **Many Ocean Thin Air worlds bloom only after the decline** (the study: ~79 % of Ocean wins come after the final state). On those the condition is
  met implicitly and the player sees only the HUD line; this is by design (the Bloom must be in the final atmosphere either way).
- **The early-Bloom log line** can be replaced in the same tick by a pressure-phase message; the persistent HUD condition line and the HOLDING badge
  are the primary channel (QA records every log message and checks it was shown).
- **Witness hold records** gained `seconds` / `progress` (strategy summary + confirmation runs) — additive; historical pins adjusted as above.
- **Bank rebuild cost** ~70 min on 14 workers on this machine (the first build was stopped at 380 / 480 and restarted so every Thin Air entry records
  the explicit proof statement). `DEVELOPMENT_NOTES.md`'s checklist now lists a completion-definition change as a rebuild trigger.
- **The report's "Time · to the bloom"** fact is the true completion time (for Thin Air after the final atmosphere), not the first early Bloom; the
  completion card states both.
- **Not done (out of scope):** another condition type, Hearthfire, Windfall, Oasis Line changes, progression / medals / scoring / tiers / unlocks.

## 11. PMO acceptance + copy correction (2026-10-12)

PMO: 036D1 ACCEPTED FOR RELEASE (Thin Air and the completion system accepted) with one presentation-only correction: an EXTINCTION report's pressure
line no longer says "The decline continues if you keep playing …" (a loss has no Keep playing). Before the final state it now reads "The atmosphere had
not finished changing. Final conditions would have been: moisture …, temperature … °C, radiation …."; a win before the final state keeps the
keep-playing wording; a completed decline keeps "— the final harsh state." Production (`run-report.js`) and legacy (`game-session.js`
`pressureReport(kind)`) paths aligned. No simulation, pressure, completion, extinction, bank or Challenge-content change.
QA (challenge-completion-check W1–W4, both browsers; the legacy path evaluated in Node): green. Focused: run-ui-check · run-ui-convergence-check ·
challenge-completion-check 71/71 · dying-world-check · visual-system-check 54/54 · release-check --no-suites 51 · portable-runtime-check 71/71.
`l1-thin-air-early-bloom-then-extinction.png` re-captured with the corrected wording.

## 12. Integration + BLOOM-036 closeout (2026-10-13)

`main` fast-forwarded `d0eaf8f` → **`3b4d3a7`** (= the corrected review head; 5 commits, no merge commit / squash / rebase / cherry-pick / force push);
local `main` = `origin/main` = `origin/handoff/bloom-036d1-review`. Post-integration on clean `main`: challenge-completion-check 71/71 · challenges-check
33/33 · challenge-world-check 108/108 · run-ui-check · run-ui-convergence-check · portable-runtime-check 71/71 · release-check --no-suites 51 ·
visual-system-check 54/54; `build-challenge-seed-bank --check` identical (sha256 `8506124b…`). BLOOM-036 (A · B · B1 · C · C1 · D · D1) is
IMPLEMENTED / COMPLETE; next: final hardening / release.
