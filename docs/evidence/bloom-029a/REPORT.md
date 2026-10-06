# BLOOM-029A evidence — Run UI Production Boundary

Branch `agent/bloom-029a-run-ui-boundary`, from **c23815e** (the 028D1 evidence tip; `handoff/bloom-main-pmo-c23815e`).
Handoff: [`docs/RUN_UI_PRODUCTION_BOUNDARY_v1.md`](../../RUN_UI_PRODUCTION_BOUNDARY_v1.md).

## 1. What changed

| file | change |
|---|---|
| `resources/run-ui/run-ui-adapter.js` (new, 226 lines) | `BLOOM.runUI.createAdapter(host)`: read-only snapshots, real actions, batched `subscribe()`. No rules, no DOM, no loop |
| `demos/demo-run.html` | Loads the adapter. Extracts the shell's read rules and actions into named functions that the shell and the adapter share. Builds one explicit host. Publishes `BLOOM_RUN_UI.adapter` before `bloom:run-ready`. No behaviour change (§2) |
| `tools/run-ui-check.js` (new) | The 24th regression suite |
| `docs/RUN_UI_PRODUCTION_BOUNDARY_v1.md` (new) | The handoff |
| `docs/evidence/bloom-029a/*` | This evidence |

Untouched, verified by `git diff` (N4): PlanetSphereView, AtmosphereTransition, the main menu, the Destination Survey, the
training layer, the engine, content, planets, the Concept 18 mockups and root `index.html`.

## 2. Before / after functional equivalence (`qa-equivalence.js` → `equivalence.log`)

**Method.** The same scripted player drives the **old shell only** in both trees: c23815e (`git archive`) and the 029A
working tree. It uses map clicks, shop clicks, growth-focus and local-upgrade clicks, and bubble clicks. Conditions are
identical on both sides: Math.random is seeded, the frame loop is frozen and the clock is fake.

**What it records:**
- Every 50 ticks: the sim (tiles, density, vigor, Biomass, genome, sky, colonies, bubbles), the shell's HTML (header with HUD
  and scenario bars, inspect, colony controls, shop, footer, report) and the count of `bloom:*` events.
- Every event's detail.
- A final screenshot.

| run | checkpoints | `bloom:*` events | result |
|---|---|---|---|
| First Bloom, seeds 1 and 2 (both win) | 29 + 29 | 45 + 46 | identical |
| Training (`training=1`, wins) | 19 | 23 | identical |
| `planet=training_grounds` (ordinary) | 25 | 33 | identical |
| Ocean Archipelago 28 (Eden) | 29 | 31 | identical |
| Dying World · Ocean 28 | 29 | 35 | identical |
| Native Competition · Desert 22 | 29 | 44 | identical |
| Volatile Climate · Frozen 4 | 29 | 43 | identical |

- **Every checkpoint and every event detail is identical.** The 7 event types appear in these runs, from real clicks.
- **Screenshots** are pixel-identical below the header (the map, panels, footer and report).
- **The header** differs by 0–3 anti-aliased pixels on a button. That is the same noise the **control** shows: the driver run
  with c23815e on both sides gives 0–18 px, all in the header and none below it (`equivalence.log`, first block).
- **Excluded on both sides:** wall-time effects. These are the "−N" spend floaters and the bars' pulse glow, which are removed
  by real `setTimeout`s, and the panels' scroll offsets left by the harness's scroll-into-view clicks. The control proved each
  one non-deterministic on c23815e itself.
- **Stills:** `equivalence-first-bloom-c23815e.png` / `equivalence-first-bloom-029a.png` (the won First Bloom run, seed 1).

## 3. `tools/run-ui-check.js`: the 24th suite, 40 / 40 (Node 6 + Chromium 17 + Firefox 17)

| | checks |
|---|---|
| **N1** | The branch descends from exactly c23815e |
| **N2** | Adapter source has no randomness, no sim writes, no direct engine actions, no DOM, no loop or timer, no page globals, no planet / scenario id |
| **N3** | The adapter refuses an incomplete host (naming every missing piece). It is frozen. Its event list is the 028D1 contract |
| **N4** | 029A's range touches only its own files |
| **N5** | No Concept 18 mockup region, item, file or `future` node in 029A's additions; no coach / tutorial code |
| **N6** | Every `bloom:*` dispatch site survives (same count per type as c23815e). Every anchor is in the source. Exactly one Biomass grant. `BLOOM_RUN_UI.placeBubble` is kept |
| **B1** ×8 | First Bloom, procedural, `planet=`, training (paused at tick 0), `play=1`, pressure, competition and climate each boot with the adapter. HUD, inspect, colony, shop and scenario-bar snapshots equal the shell at the landing and on two more regions (one blocked) |
| **B2** ×3 | A real hover's `bloom:upgrade-preview`, the map outline, the footer and `adapter.previewOf` agree, including Terraform better / worse plus climate, and the crossing reach. Adapt matches the engine's `sim.previewOf`. `previewOf` over every upgrade shows, logs and fires nothing |
| **B3** | Twin training pages: one driven by real clicks, one by the adapter. Same events with the same detail, same shell HTML after every step, same sim tile for tile, before and after 600 more ticks. Steps: select, preview, buy, refused buy, focus, local upgrade, bubble place / collect, deselect |
| **B4** | Play / pause and 1× → 2× → 4× → 1×: same running / speed, button text, aria-pressed and events. `setSpeed` accepts only 1 / 2 / 4. No-ops fire nothing |
| **B5** | An adapter purchase wins the training: `bloom:win` once with `training: true`, "★ TRAINING COMPLETE", report / continue / run-actions anchors |
| **B6** | All 42 training anchors (incl. every `upgrade-<id>`, `action-*`) and the `play=1` actions resolve |
| **B7** | `subscribe()`: one batched notice per microtask with the copied events. While running 1 s: 60 frames, 6 ticks, 6 tick notices. While paused: none. Hover / leave notify. A throwing subscriber does not stop the run. Unsubscribe works |
| **B8** | `BLOOM_API` keeps its 19 members and 12 `state()` fields. `placeBubble` works. Bad input is refused without side effects. The page boots with the adapter over `file://` |

Log: `qa-run-ui-check.log`.

## 4. All suites (`run-all-suites.sh` → `qa-suites-summary.txt`)

**24 suites, 996 pass / 3 fail.**

- **Green:** 21 suites, including:
  - `run-ui-check` 40/40
  - `economy-check` 39/39 (still exactly one Biomass grant on the run page)
  - the golden-pinned `sim-check` / `dying-world-check`
  - `volatile-climate-check` 78/78 and `game-flow-check` 74/74
  - sphere, survey, transition and menu: `sphere-texture-check` 12/12, `destination-survey-check` 11/11,
    `atmosphere-transition-check` 14/14, `main-menu-check` 17/17
  - `slice-check` 15/15, with its pacing check passing this time

**The three failures are timing / live-randomness checks.** Each was re-run three times in isolation, in sequence
(`suite-flakes.txt`).

| check | 029A isolated | c23815e isolated | classification |
|---|---|---|---|
| `colony-development-check` [31] (crossing pixels) | 0 0 0 fails | — | the known pixel flake, same "arrival landing: 13 bright px" signature as 028B / 028C1 / 028D1 |
| `native-competition-check` 44 (readout changes over 700 ticks, live unseeded run) | 0 0 0 | 0 0 0 | not reproduced on either tree. The readout path renders identically to c23815e (§2: Native Competition · Desert 22, 29 checkpoints; run-ui-check B1) |
| `training-check` B1c [firefox] (the "opens under full black" sample) | 0 0 0 | **0 1 0** | a pre-existing Firefox timing flake, reproduced on c23815e itself |

With these re-runs, every suite has passed on the 029A candidate.

## 5. Training

- Training starts paused at tick 0 (B1, and training-check B1).
- It stays seeded and deterministic: identical before / after (§2), twins identical (B3), training-check T5a / B1d.
- Restart / Skip / Main menu, the status store, the black fade and back-forward cache are unchanged: training-check B5 runs in
  full inside the broad run.
- `placeBubble` and every event are unchanged (B3, B8, training-check B2).
- No 028D2 work was imported (N4 / N5). The uncommitted `_worktrees/bloom-028d2-guided-training` was not touched.
