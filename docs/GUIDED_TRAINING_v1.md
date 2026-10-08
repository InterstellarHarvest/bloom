# Guided Training v1 — the production coach (BLOOM-028D2)

**From:** BLOOM-028D2 · **For:** the Tutorial PMO, the Main PMO, and whoever packages the root site (BLOOM-030).
**Builds on:** the accepted BLOOM-029F end-to-end baseline `8f4c273` (production Planet View, rooms, report, exact expedition
handoff) and the 028D1 training foundation (`docs/TRAINING_FOUNDATION_v1.md`).
**QA:** `tools/guided-training-check.js` (the 30th suite). **Evidence:** `docs/evidence/bloom-028d2/` (stills +
`guided-training-proof.json`).

The title's TRAINING now opens a **guided** training: the real `demos/demo-run.html?training=1` run on Training Grounds, on the
production UI, with one instructional callout that points at real controls and moves on when the player has reached each lesson's
real outcome. The coach is a mode of the real run, not a second game: the player does every action; the coach observes.

---

## 1. Files

| file | owns |
|---|---|
| `resources/training/training-steps.js` (new) | **step data**: the 13 lessons — copy, targets (descriptions, never elements) and the outcome predicate of each; pure functions of a plain `ctx` (no DOM, no adapter, no clock) |
| `resources/training/training-director.js` (new) | **outcome evaluation**: builds `ctx` from the real run, keeps the event memory, advances one monotonic index, logs every advance (the proof), drives the coach |
| `resources/training/training-coach.js` · `.css` (new) | **callout presentation**: the card, the ring, the leader, the live region, Skip Tutorial; re-finds every target every frame; `placeCard` |
| `resources/training/training-run.js` | + mounts the coach (production training only), the one Skip confirmation, Begin Expedition |
| `resources/run-ui/planet-view.js` | + `regionPoint(id)` / `regionRect(id)`: read-only map geometry (§8) |
| `demos/demo-run.html` | the training's report actions: Begin Expedition · Restart training · Main menu; no Keep playing in training |
| `resources/run-ui/run-report.js` | + the Begin Expedition icon (presentation only) |
| `content/training.js` | + copy: `beginExpedition` (+ note), `skipConfirm` (title, body, keep, skip). **The training config is unchanged.** |
| `resources/main-menu/main-menu.js` · `.css` | + the "Recommended" tag on TRAINING, the `recommend` dialog |
| `resources/main-menu/expedition-entry.js` | + the first-run recommendation flow (§3) |
| `tools/guided-training-check.js` (new) | the 30th suite (§16) |

Untouched (byte-identical to `8f4c273`, suite N9): the engine, generator, validators, content data (config, traits, archetypes,
scenarios, play copy), every planet, the run UI adapter, map renderer, rooms, Terraform globe, gameplay transition, specimen, canonical
surface, PlanetSphereView, AtmosphereTransition, the expedition handoff + arrival, the Destination Survey, the training store, the
black fade, root `index.html`.

## 2. Training entry

- **TRAINING** on the title (`demos/main-menu.html`; since BLOOM-030 the root `/`) → the usual black fade →
  `demo-run.html?training=1&return=<the title>` (BLOOM-030: `return=` is always the ROOT title, from the root or the alias; a training
  run opened without `return=` falls back to `../index.html`, content/training.js).
- The run page boots the training run exactly as 028D1 does (Training Grounds, derived config, seeded, **paused at tick 0**), mounts the
  production UI, and loads the training layer (`training-run.js`) — for `training=1` only.
- Once the arrival black has lifted, the layer mounts the coach **if and only if** the run is a training run on the production UI
  (`BLOOM_RUN.training`, `html.ui18`, a Planet View instance, not yet won). First Bloom, `planet=` authored runs (even
  `planet=training_grounds`, which is an ordinary run), generated worlds, every scenario, expedition runs and `?ui=legacy` never mount it —
  only training pages even load the training layer, and `?ui=legacy` training mounts no coach (suite G1).

## 3. First-run recommendation and the "Recommended" tag

Owned by `ExpeditionEntry` (the title's flow); `MainMenu` only shows the tag / dialog and reports the choice.

| training record (`strange-bloom.training`) | TRAINING tag | BEGIN EXPEDITION |
|---|---|---|
| none (or junk / another version) | **Recommended** | opens ONE dialog (below) |
| `skipped` | — | the Destination Survey, as before |
| `completed` | — | the Destination Survey, as before |

The dialog — **First expedition?** · *Training recommended* · "A short guided landing on a hand-made world teaches you to read a region,
change your plant and know which ground to let go." · "Training stays open from the main menu, whatever you choose now." ·
**Go to Expedition** · **Start Training (~5 min)**:

- it **never** starts training by itself;
- **Go to Expedition** records `skipped`, removes the tag and takes the ordinary path into the survey (it never asks again);
- **Start Training (~5 min)** leaves for the training run through the normal black and records **nothing** (the training itself records
  `completed` on its win and `skipped` on a confirmed skip);
- Escape / closing records nothing (the dialog may be offered again);
- the first-sector prefetch keeps running underneath; the survey adopts it (suite G9a);
- `ExpeditionEntry.beginExpedition()` itself never prompts — the run's *Choose another planet* and the finished training's *Begin
  Expedition* (`?begin=1`) go straight into the survey.

TRAINING stays in the menu in every state. The tag is a word (read with the label: "Training Recommended"), not a colour.

## 4. The thirteen lessons

Ids, titles and copy are in `training-steps.js`. "Viable" = the region's real fitness above the run's own `grow.growThresh` (0.55).
The goal is read from the run (`adapter.hud().winPct` — 65 % for Training Grounds); no copy hard-codes a percentage.

| # | id · title | teaches | primary target (room-aware) | finished when (live state + events already seen) |
|---|---|---|---|---|
| 1 | `start` · Start the world | the landing, the real goal | Play (`play-pause`); in a room: Resume | the run is running **and** ticks > 0 |
| 2 | `natural-spread` · Watch it spread | it spreads by itself | Green Verge on the map; Play while paused | Green Verge has ≥ 6 living tiles (`VERGE_ESTABLISHED`; tick 122 on the real run) |
| 3 | `biomass` · Biomass | Biomass, bonus bubbles | the scripted bubble on the map; `biomass` | `bloom:bubble-collect` for **that** bubble's tile — `click` or `auto` |
| 4 | `inspect-chill` · A region that isn't growing | click a blocked region | Chill Hollow on the map; in a room: its strip chip | Chill Hollow is the home selection or the open room's context — or already viable (acknowledged) |
| 5 | `limiting-factor` · Find the limiting factor | one limiting factor (read from the run: *Temperature, too cold*) | the banner's real "Would help · Cold Tolerance", else the Adapt tool; another room: the Adapt tab; in Adapt: `upgrade-cold` | `bloom:upgrade-preview` cold (hover **or keyboard focus**) — or Cold owned, or Chill Hollow viable |
| 6 | `adapt-buy` · Change the plant | Adapt changes your plant | `upgrade-cold` (room-aware) + Chill Hollow | **Chill Hollow viable** (Cold Tolerance taught; Warm the Sky acknowledged) |
| 7 | `spread` · Spread upgrades | Spread = how it travels | `upgrade-seedOut` in Spread; the Spread tab / tool | any real Spread upgrade owned (Seed Output taught; Early Maturity acknowledged) |
| 8 | `growth-focus` · Growth Focus | a colony's own focus | Region Inspect → Colony → `growth-focus` (the banner's Inspect region, the Regions tool / tab, the Colony tab on the way) | any living region's focus ≠ Balanced (Roots, Leaves or Seeds) |
| 9 | `local-upgrade` · Local Upgrade | improve one colony for good | `local-upgrade` (as lesson 8) | any region owns any local upgrade |
| 10 | `terraform-preview` · Change the planet | Terraform changes the whole planet | `upgrade-humid` in Terraform; the Terraform tab / tool / Would help + Thirsty Flats | `bloom:upgrade-preview` humid — or Humidify owned, or Thirsty Flats viable |
| 11 | `tradeoff` · Read the tradeoff | read the cost, then buy | `upgrade-humid` + Thirsty Flats + Reed Fen; keeps the room's *Region effect* readout and preview column clear | **Thirsty Flats viable** (Humidify taught; Drought Adaptation acknowledged with Reed Fen's real cost) |
| 12 | `sacrifice` · You don't need every region | a sacrifice zone | Salt Pan on the map; in a room: its strip chip | Salt Pan is the home selection or the room's context (Salt Handling is never asked for) |
| 13 | `goal` · Grow to 65% | finish; the speed button helps | `coverage` + `speed`; in a room: Resume | the run's own **`bloom:win`** — nothing else |

Lesson 11's words come from the **real Humidify what-if** (`adapter.previewOf("humid")`: gain / lose / worse): "Humidify would open
Thirsty Flats. Reed Fen gets wetter too, but still grows. This trade is worth it: buy Humidify." Its status line names the honest
second answer: "Drought Adaptation, in Adapt, is the other answer: it changes your plant instead."

**Lessons 7–8 (recovered from the paused draft)** keep its finalized wording — *Spread upgrades*: "Spread upgrades change how your plant
moves and reproduces, not what it can survive. Point at Seed Output to preview it." → after the preview: "No region opens or closes: your
plant just spreads faster. Buy Seed Output." · *Growth Focus*: "Each colony can focus its energy. …" → "Pick Roots, Leaves or Seeds for
<colony>. It's free, and you can change it any time." — retargeted at the production Spread room and Region Inspect's Colony tab ("Hover
over" became "Point at", which covers keyboard focus too; "Click Landing Meadow ★" became the production route into Region Inspect).

## 5. The director

```
new TrainingDirector({ steps, adapter, readUi, growThresh, coach, hooks: { placeBubble }, keepClear }).start()
```

- **Reads only.** `adapter.run / hud / regions / region / selection / upgrade / upgrades / colony / previewOf` (plain-data reads; `previewOf`
  is the page's silent what-if: no outline, no footer, no event), `readUi()` (the rooms controller's presentation state — room, context,
  swap lock — and Region Inspect's selected tab), and the ten `bloom:*` events (listened to; never dispatched, never altered).
- **Event memory** (`seen`): previews seen, purchases, bubble collections (tile, how, value), focus changes, local upgrades, the win. So an
  outcome reached before its lesson — a preview hovered early, a bubble that collected itself between two reads — is never waited for again.
- **Evaluation.** Every evaluation builds a fresh `ctx` and asks the CURRENT lesson whether its outcome holds; if it does, the lesson is
  logged and the next is asked in the same evaluation. One monotonic in-memory index; nothing is persisted (Restart training is a fresh
  page at lesson 1, tick 0). Evaluations run on every `bloom:*` event, on the adapter's change notices (throttled to 100 ms), after the
  player's clicks / keys / focus moves (room and tab navigation fire no event), and every 250 ms as a safety net.
- **The win** ends the script from any lesson (`completed`; the final lesson's outcome, or `won-early`).
- **The log** (`director.log`): per lesson — index, id, how (`click` / `auto` / `cold` / `warm` / `seedOut` / `drought` / `solved-early` …),
  cause (`bloom:<type>` / `notice` / `input` / `interval`), tick, time, Biomass, coverage, every region's fitness, viable regions, owned
  upgrades, focuses, local upgrades, the UI state, the acknowledgement shown next. `director.events`: the events observed (type-specific
  fields only). Both feed `guided-training-proof.json`.

### Why no timers drive progression

Every completion predicate is a function of the run's state and the events already seen; none reads elapsed time (suite N5a: a frozen
run read 2 000 times over 33 simulated minutes stays on lesson 1). The interval only decides *when* the state is read. The old draft's
reading-time "dwell" phases and its "200 ticks have passed" fallback are gone: an informational sentence now rides along as the next
lesson's acknowledgement or status line instead of holding the player.

## 6. Alternate-action reconciliation

| what the player did | what happens |
|---|---|
| bought Cold Tolerance paused at the landing | lessons 4–6 pass as already solved once reached ("Chill Hollow suits your plant now…"); never "buy Cold Tolerance" again |
| opened Chill Hollow with **Warm the Sky** | lesson 6 finishes on the viability; ack: "Warm the Sky opened Chill Hollow instead: Terraform warmed the whole planet rather than changing your plant." |
| let the bubble collect itself | lesson 3 finishes on `bloom:bubble-collect {how:"auto"}`; ack: "That bubble collected itself, at half value. Click bubbles for the full amount." |
| bought **Early Maturity** (or any real Spread upgrade) | lesson 7 finishes; ack: "Early Maturity is a real Spread upgrade too: it changes how your plant travels, not where it can live." |
| chose any focus / bought any local upgrade, on any colony, before or during | lessons 8 / 9 finish on that state |
| used **Drought Adaptation** instead of Humidify | lesson 11 finishes on Thirsty Flats' viability; ack names Reed Fen's real cost ("…but Reed Fen is now too wet for your plant. Every fix has a cost.") |
| bought **Salt Handling** | lesson 12's copy says so ("…a costly fix you never needed…"); it still finishes by reading Salt Pan |
| reached 65 % before the last lesson | the script ends as completed |

No lesson needs an exact click history: completion is the state, not the route.

## 7. Coach presentation

- **One card** (production card family: cream, ink border, organic radii): kicker *TRAINING* · "Step n of 13" · progress bar · optional
  acknowledgement (green, with a check icon) · heading · body · optional live status line (price to go, paused, coverage) · **Skip
  Tutorial** (always there). No Next button: every lesson is finished by doing.
- **One ring** on the primary target (secondary targets: thinner rings), drawn *outside* the target's box, `pointer-events:none`; a
  **leader line** from the card's nearest edge when the card sits beside the target. No full-screen dim, no opaque takeover: everything
  but the card itself lets clicks through, so the target stays fully visible and clickable (suite G3c: under every target's centre is the
  real control, never a coach element).
- **Placement** (`placeCard`, pure): ≥ 900 px wide — beside the primary target (right / left / below / above, flipping to the side with room),
  slid further out past any keep-clear control it would cover, or docked at a corner, choosing the place that covers the least of the
  target (×40), the other targets (×8) and the keep-clear controls (×3: Play, speed, run menu, Biomass, coverage, an **open popover**, and per
  lesson what it asks the player to read — the banner's limiting factor and readout, the room's *Region effect* readout and preview
  column), then the nearest; always inside the viewport with a 16 px gutter. Below 900 px — docked full width (≤ 560 px) at the bottom, or
  the top when the target is low.
- **Re-placed every animation frame** while shown; every target is looked up again each frame (anchors by `[data-tutorial]`, production
  controls by the coach's `CONTROLS` table, regions / bubbles by the Planet View's live geometry), so room swaps, tab switches, re-rendered
  report / room buttons, resizes and map relayouts are followed; no DOM reference outlives a frame. A target that is not on screen now — a
  hidden room's pre-mounted anchor, the inert Planet View under a room, a zero-size box — does not resolve.
- **At the win** the director finishes and the coach hides (no card, no ring) before the production report's SUBDUED open; the report is
  never duplicated or covered.
- z-order: the coach layer (500) is above the Planet View (10), its rooms and report; below the training black (1000) and the gameplay
  transition (10000); the Skip dialog is 700.

## 8. Map-region anchoring

Regions are canvas, not elements. `BLOOM.planetView.instance.regionPoint(id)` → `{x, y}` (the region's centre, where the map draws its
label) and `regionRect(id)` → its tile bounding box, both in client px from the renderer's **current** layout (`renderer.clientOf`; on a
cylinder, the copy nearest the stage centre). Nothing is cached in screen space, so a resize / relayout shows on the next read (suite G10a
resizes 1280×800 → 1100×700 mid-lesson). The bubble's point is `renderer.clientOf(b.x, b.y)` from `adapter.bubbles()`. A region / bubble
target resolves only while the map itself is on screen (no room open, report closed). The coach never uses `BLOOM_API` geometry.

## 9. Room-aware targeting

The lesson names the next useful real control for where the player is now; the coach never opens a room, switches a tab or selects
anything itself.

- Cold (5–6): Planet View → the banner's **Would help · Cold Tolerance** (when Chill Hollow is selected; it opens Adapt with the node focused,
  i.e. its real preview) or the **Adapt** tool → in another room the **Adapt** tab → in Adapt, `upgrade-cold`.
- Spread (7): the **Spread** tool / tab → `upgrade-seedOut`.
- Colony (8–9): the banner's **Inspect region** (a living colony selected) or Landing Meadow on the map / the **Regions** tool → in another
  room the **Region Inspect** tab → the **Colony** tab → `growth-focus` / `local-upgrade` (a region without a colony → its strip chip for
  Landing Meadow).
- Terraform (10–11): the **Terraform** tool / tab / Would help → `upgrade-humid`.
- Map lessons (2, 4, 12) inside a room: the room's **region-strip chip** (the room context counts as inspected).
- Time lessons (1, 13) inside a room: **Resume**.

The production selectors the coach knows are one table, `CONTROLS` in `training-coach.js` (`tool:`, `room-nav:`, `room-resume`, `help:`,
`banner-inspect`, `tab:`, `strip:`, `room-effect`, `room-preview`, `popover`). They are presentation lookups on the 029F production DOM —
no old-shell selector.

## 10. The scripted bubble

On entering lesson 3 the step's `prepare` asks the director's hook once: `BLOOM_RUN_UI.placeBubble("landing_meadow")` (the 028D1 hook:
the Living tile nearest the region's centre, no randomness). If nothing is living there yet it is asked again on later reads until a tile is
returned — one bubble is placed, ever (suite G3b: `placeBubbleCalls === 1`). The coach grants nothing: the Biomass arrives only when the
player clicks it (+25) or it collects itself after 375 ticks (+12.5), through the run's own `bloom:bubble-collect`. Both finish the lesson.

## 11. Skip, Restart, Main menu

- **Skip** — the coach's *Skip Tutorial* and the run menu's *Skip training* both call `BLOOM_TRAINING_UI.go("skipTraining")`, which (while
  the coach is mounted) opens ONE production dialog: `role=alertdialog aria-modal` · **Skip training?** · "You can start it again any time
  from the main menu." · **Keep training** (focused) · **Skip training**. The game is inert behind it; Tab cycles inside; Escape = Keep
  training. Never `window.confirm`.
  - Keep training / Escape: the dialog closes, focus returns to where it was, the same lesson goes on; nothing is recorded.
  - Skip training: records `skipped` (never over `completed`), unmounts the coach, fades through the training black to the real title.
- **Restart training** (menu or report): no confirmation; the black, then the same URL as a fresh page (lesson 1, tick 0). Nothing recorded.
- **Main menu**: no confirmation; the black, then the title. Nothing recorded (an unfinished training may be offered again).
- Under `?ui=legacy` (no coach) Skip behaves as in 028D1 (no confirmation).

## 12. Training complete

The production run report (029E family), heading **TRAINING COMPLETE**, actions in this order:

1. **Begin Expedition** (first, primary, focused) — the training black → `<return>?begin=1` → the title enters the Destination Survey at
   once (the accepted 029F `begin=1` path, consumed from the address). No planet is made or packed here; the survey still owns generation /
   validation and the exact 029F handoff (suite G8: no handoff stored, survey state reached).
2. **Restart training** — a fresh paused Training Grounds.
3. **Main menu** — the real Strange Bloom title.

**Keep playing is not offered** after training: `reportActions()` omits it for training, `reportAction("keepPlaying")` refuses it, the
report's Keep playing button stays hidden (its `report-continue` anchor still resolves — in the legacy shell too, hidden). The record is
`completed` (written by the training layer on the run's `bloom:win`) and is never downgraded.

## 13. Accessibility and reduced motion

- The card is a labelled region (`aria-labelledby` its `h2`); a separate polite `aria-live` region reads each new lesson ("Step n of 13:
  <title>. <body>", with the acknowledgement first) and a new acknowledgement; status numbers are not announced.
- Focus: the very first callout takes focus **only** when nothing else has it (so it is read on arrival); later lessons never move focus.
  Nothing traps focus. Skip Tutorial is a real button, reachable by Tab, with a visible focus ring.
- Every coached action works by keyboard (suite G6): Enter on Play; the map's arrow keys + Enter; Tab to the real "Would help" + Enter opens
  Adapt with Cold Tolerance focused — a **focus preview counts exactly like a hover** (`bloom:upgrade-preview`); Enter buys.
- No colour-only instruction: every lesson says the region / control by name; region targets are also named in the card.
- **Reduced motion** (the title's Settings choice through `main-menu-data.js`, else the OS; Settings "full" wins over a reduced OS): no
  pulsing ring, no gliding card (opacity only), no entrance lift, no smooth scrolling (suite G10b).

## 14. Production dependencies (frozen contracts used)

- **Events** (TRAINING_FOUNDATION §7): all ten, detail keys unchanged (suite N8 compares every dispatch site to `8f4c273`; G3f checks the
  keys at runtime). No event was added or overloaded.
- **Anchors** (GAMEPLAY_UI_CONVERGENCE §10): `play-pause` `coverage` `speed` `biomass` `run-menu` `limiting-factor` `readout`
  `growth-focus` `local-upgrade` `upgrade-cold` `upgrade-seedOut` `upgrade-humid` (+ `focus-*`, `local-*`, `action-*`, `report*` unchanged).
  The anchor set is identical to `8f4c273` (N10); every anchor still resolves once with the coach mounted (G12a). The coach adds no
  `data-tutorial`; its own markers are `data-coach` / `data-training-coach` / `data-training-skip`.
- **BLOOM_RUN_UI**: `placeBubble` (the one effect) and `.adapter` (reads); backwards compatible (`planet-view.js` diff is additive only).
- **Room / report state**: `BLOOM.decisionRooms.instance.state()` (room, contextId, transitioning), Region Inspect's `[role=tab]`
  `aria-selected`, `BLOOM.runReport.instance` (hidden under the report).

## 15. Why BLOOM_API stays QA-only

`BLOOM_API` (buy, advance, addBiomass, geometry …) bypasses the player: it would let a tutorial play the game. No production coach file
mentions it, calls any adapter **action** (`buy`, `selectRegion`, `selectTile`, `setGrowthFocus`, `buyLocalUpgrade`, `collectBubble`,
`preview`, `play` / `pause`, `setSpeed`, `deselect`), touches the sim, writes Biomass / fitness / coverage / the threshold, or synthesises a
click or event (suite N7, a source rule over the code with comments stripped). The suite itself uses `BLOOM_API.advance` only to fast-forward
time; every lesson in G3–G6 is performed with real mouse / keyboard input on the control the coach resolved.

## 16. QA — `tools/guided-training-check.js` (30th suite)

Node: N1 start SHA / scope · N2 the paused draft byte-for-byte untouched · N3 not imported wholesale · N4 13 lessons, copy, the real 65 %,
lessons 7–8 wording · N5 the director (no time-based advance; the taught route by outcome; reconciliation of every alternate route in one
evaluation; the win; disposal) · N6 placement · N7 anti-cheat · N8 events / adapter / BLOOM_RUN_UI · N9 protected files + training config ·
N10 anchors / importers / loader · N11 the record's writers.
Browser (Chromium; Firefox for G2/G3/G8, G7, G10 at 1280×800): G1 no coach elsewhere · G2 mount · G3 the taught route by real input +
completion · G4 the alternate route · G5 early actions + Restart · G6 keyboard · G7 Skip (both entries, one dialog) + records · G8 Begin
Expedition · G9 the title's tag + first-run dialog · G10 viewports, resize, reduced motion · G11 no listener leak on unmount / remount ·
G12 anchors, speed, network / console. `--evidence` writes the stills and `guided-training-proof.json`.

## 17. The paused 028D2 draft (c23815e worktree) — disposition

The old uncommitted worktree `_worktrees/bloom-028d2-guided-training` (branch `agent/bloom-028d2-guided-training`, HEAD `c23815e`) was read
only; its `git status --porcelain`, complete `git diff` and untracked files were fingerprinted before this work began and are re-checked by
suite N2. Nothing was committed, staged, reset, cleaned or modified there.

- **Recovered (concepts / copy):** the outcome-only director idea (event + state, a win ends it from anywhere, off-script lessons
  acknowledged); lessons 7–8's wording and division; the Green Verge threshold (6); the scripted bubble in Landing Meadow; the Chill Hollow /
  Thirsty Flats / Salt Pan acknowledgement texts (Warm, Drought + Reed Fen, Salt Handling); the paused / price / "running out of ground"
  status lines; the placement idea (beside the target, docked when there is no room, keep-clear controls) and the narrow-screen dock; the
  test ideas (main path, alternate path, off-script play, Skip, Restart, reduced motion, responsive placement).
- **Discarded (implementation):** every old-shell dependency (`#btnPlay`, `#playMenu`, the shell's shop buttons, `BLOOM_RUN_UI.status /
  region / traits / regionRect / tileRect / highlight` views it added to the engineering page, `renderInspect`); the canvas outline hook
  drawn by the run page; the 3-column layout assumptions; reading-time "dwell" phases and the 200-tick fallback (time-gated); the separate
  "dry" and "solve" steps (folded into lessons 10–11); the old training-complete panel with Keep playing removed only there (the production
  report now carries the action set); the `#begin-expedition` hash path (029F's `begin=1` is the accepted path); its 14-step order.

## 18. The seam for BLOOM-030 (root-site packaging)

Nothing here assumes the title is `demos/main-menu.html`: the training layer navigates to the run's `return=` (same-origin, resolved by
028D1's `safeReturn`), Begin Expedition appends `begin=1` to it, and the title's prompt reads the same `localStorage` record wherever the
title lives. Promoting the title to the root entry needs only the root page to pass the same `trainingHref` / `return=` and to honour
`begin=1`, as `demos/main-menu.html` does. Out of scope here: root `index.html`, file:// packaging, save / resume of a training, any
change to Concept 18, the Main Menu design, the survey, the expedition handoff, planet generation, topology, the canonical surface, the
sphere or the AtmosphereTransition.

**Done in BLOOM-030.** The title is the root `index.html` (`docs/RELEASE_CANDIDATE_v1.md`): its one composer
(`resources/main-menu/main-menu-page.js`) passes TRAINING `return=<the root>` and honours `begin=1`, exactly through this seam. Every
training exit — Skip (after its confirmation), Main menu, TRAINING COMPLETE's Begin Expedition (`/?begin=1` → the survey) — lands on the
root; the training run's own fallback without `return=` is `../index.html` (`content/training.js` `returnTo`; the training planet,
config, seed and copy are unchanged). This suite's provenance / scope checks (N1, N8, N9, N10) are now bounded by 028D2's final
`726f74d` (END_SHA), as the 029B–029F suites bound theirs, and its title URLs are the root (`release-check` R17, R21, R45–R50).
