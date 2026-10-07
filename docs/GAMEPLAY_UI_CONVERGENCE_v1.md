# Gameplay UI Convergence v1 — the production run interface by default, SUBDUED transitions, the production run report

**From:** BLOOM-029E · **For:** whoever builds BLOOM-029F (Destination Survey → exact gameplay planet handoff), the Tutorial PMO
(BLOOM-028D2, the guided coach), and the Main PMO.

> **State after 029E.** `demos/demo-run.html` mounts the **production** run interface on every launch: the Concept 18 Planet View
> (029B), its four rooms (029C / 029D) and the new production run report, with every room swap and the report's open / close wrapped in
> the **SUBDUED** AtmosphereTransition through one gameplay bridge. The engineering shell is retired as a player-facing path: it stays in
> the page only as the hidden simulation host the adapter wraps and as the historical regression oracle, shown by the developer flag
> `?ui=legacy` alone. No gameplay mechanic, balance number, threshold, trait effect, planet generator, canonical surface, sphere or
> AtmosphereTransition internal changed (`tools/run-ui-convergence-check.js` N2 / N10: byte-identical files, identical seeded runs).
> The 029F selected-planet handoff was **not** done here (§13) — it is now done: `docs/EXPEDITION_HANDOFF_v1.md`; the 028D2 coach is now production (§14,
> `docs/GUIDED_TRAINING_v1.md`).

## 1. What changed

| file | change |
|---|---|
| `demos/demo-run.html` | routing policy (§2); production title (§4); the report truth factored into `winReport()` / `lossReport()` + `pressureReportData()` / `competitionReportData()` / `climateReportData()`, the engineering modal rendered from that data (`legacyWinHtml` / `legacyLossHtml`); `reportActions()` / `reportAction()` / `continueAfterWin()`; host gains `read.report`, `read.reportActions`, `act.reportAction`; mounts the rooms and the report over the Planet View |
| `resources/run-ui/gameplay-transition.js` (new) | `BLOOM.gameplayTransition`: the ONE SUBDUED mist per run — guarded import of the unmodified AtmosphereTransition, early `prepare()`, `run({ onCovered })` that never rejects and always swaps exactly once, timing records (§5–§6) |
| `resources/run-ui/decision-rooms.js` · `.css` | open / switch / close through the bridge with the locked pause → conceal → swap at covered → reveal → resume order; `transitioning` guard; `closeImmediate()` for the end of a run; the restrained card entrance; `timeline()` (§5) |
| `resources/run-ui/run-report.js` · `.css` (new) | `BLOOM.runReport`: the production Bloom Report / Extinction card over the dimmed Planet View, reading `adapter.report()` and invoking `adapter.actions.reportAction(id)` only; the production plant specimen; dialog semantics; the last 028D1 anchors (§7–§10) |
| `resources/run-ui/run-ui-adapter.js` | additive, api stays 1: `report()`, `reportActions()`, `actions.reportAction(id)` (§8) |
| `resources/run-ui/planet-view.js` · `.css` | no migration badge / copy; the room request is guarded while a swap runs; the engineering report modal hidden under `html.ui18` |
| `tools/run-ui-convergence-check.js` (new) | the 28th suite (§15) · older suites updated for the routing (§12) |
| docs | this file; `PRODUCTION_PLANET_VIEW_v1`, `PRODUCTION_PLANT_ROOMS_v1`, `PRODUCTION_TERRAFORM_ROOM_v1`, `RUN_UI_PRODUCTION_BOUNDARY_v1`, `TRAINING_FOUNDATION_v1`, README: no longer describe `&ui=18` as required |

Byte-identical to the accepted 029D candidate 0f5ce81 (N2): `resources/atmosphere-transition/atmosphere-transition.js` (its presets and
timings), `resources/planet-sphere/*`, `resources/planet-surface/*`, the engine / generator / validators / play / scenario modules, content,
planets, `resources/training/*`, `resources/main-menu/*`, `resources/destination-survey/*`, the map renderer, the specimen, the globe helper,
root `index.html`, the title and survey demo pages, the mockups.

## 2. Routing: production by default, one developer flag

```
demos/demo-run.html              → PRODUCTION  (Planet View + four rooms + production report)
demos/demo-run.html?ui=18        → PRODUCTION  (the 029B–029D migration flag, kept as a backwards-compatible alias)
demos/demo-run.html?ui=legacy    → the ENGINEERING SHELL (developer-only: historical regression suites, low-level diagnosis)
```

```js
const UI_MODE=new URLSearchParams(location.search).get("ui")==="legacy"?"legacy":"production";
const PROD=UI_MODE==="production"&&!!(window.BLOOM&&BLOOM.planetView&&BLOOM.decisionRooms&&BLOOM.runUI);
```

Every launch kind uses production: First Bloom (no query), `planet=<id>` authored worlds, generated `archetype=&seed=`, the pressure /
competition / volatile-climate scenarios, `play=1`, `training=1` (suite B1 / B3). Nothing in the game links `ui=legacy` or `ui=18`:
root `index.html`, the title page, the survey, the training layer, the play data and the production sources never mention them (N4); the
page's own navigation links (Play this world again, Same planet new world, Restart training, …) carry no `ui=` and so return to the default
(B11 / B14). The flag is documented in README as developer-only and is not styled as a second product mode.

**Why the shell still exists internally.** The engineering shell's DOM and functions ARE the one real simulation host the adapter wraps
(029A boundary: `setRunning`, `selectAt`, `buy`, `computePreview`, `renderInspect`, the footer message, the report truth …). Retiring the
old visible product UI is not rewriting that host. In production the shell is `display:none` (`html.ui18 body > header / main / footer` and,
new, `#reportModal`), inert to Tab, its map `draw()` returns at once, its report modal never gets `.on` (B1: no shell control focusable, 40
Tabs never reach it). There is exactly one sim object (`sim === BLOOM_API.sim`, adapter ticks = `BLOOM_API` ticks). `?ui=legacy` restores
the shell exactly — its map drawn, its anchors, its title, its buttons usable; no production view / rooms / report are mounted (B2).

## 3. The transition language (what 029E owns)

| crossing | treatment | owner |
|---|---|---|
| Main Menu ↔ Destination Survey | fade through black | 028C1 (untouched) |
| survey grid ↔ focused planet | the existing spatial sphere motion | 028A (untouched) |
| focused survey planet → gameplay | DRAMATIC AtmosphereTransition | 029F |
| **Planet View ↔ Region / Adapt / Spread / Terraform** | **SUBDUED AtmosphereTransition** | **029E** |
| **room ↔ room** | **SUBDUED** | **029E** |
| **Planet View ↔ the run-end report** | **SUBDUED** | **029E** |
| leaving the run (menu / training actions) | the page's own navigation and the training layer's black fade | 016 / 028D1 (untouched; no cloud layered over it) |

## 4. Player identity and copy

Production titles read `Strange Bloom — <world>` (the main menu's `TITLE`): `Strange Bloom — First Bloom`, `Strange Bloom — Pallas-609 ·
Volatile Climate`, `Strange Bloom — Training · Training Grounds`. "playtest harness", "UI 18", "arrives in BLOOM-…", "development view",
"temporary shell", milestone numbers and `ui=18` wording are gone from everything the player can see (N8 scans every production source
string; B1 scans the rendered text). `?ui=legacy` keeps its engineering wording. The production UI uses the inline-SVG icon family only;
the one pictograph kept is the semantic warning sign in the Terraform climate readout. The Main Menu is untouched.

## 5. The gameplay transition bridge (`resources/run-ui/gameplay-transition.js`)

```js
const T = BLOOM.gameplayTransition.create({ onError });   // once per run, created by the rooms controller, shared with the report
T.prepare();                                              // guarded import + ONE AtmosphereTransition + prepare() (bitmaps in idle time)
await T.run({ onCovered: swap, kind });                   // → { ran, immediate, covered, times, totalMs, error, reducedMotion, seed } — never rejects
T.kind            "pending" | "atmosphere" | "immediate"      T.transitioning · T.running · T.phase · T.last · T.history
T.reducedMotion() the Settings choice (main-menu-data.js readSettings → reducedMotionFor) when set, else the OS
T.dispose()
```

- **Public API only**: constructor (`{ zIndex, reducedMotion }`), `prepare()`, `run({ preset: "subdued", onCovered, onPhase, origin })`,
  `dispose()`, public `running` / `phase`. No private member, preset table or layout function is touched (N5). The component's own
  reduced-motion path is authoritative: the bridge passes the player's Settings choice (`true` / `false`, `null` = follow the OS) to the
  constructor exactly as the training layer passes it to the black fade; the component decides per run (B19 / B19b).
- **Exactly one instance per run**, prepared early: `decisionRooms.mount` creates it and calls `prepare()` at the end of the mount (the
  module import is asynchronous; the 8 cloud bitmaps are drawn one per task with a yield between them, ~100 ms after mount, before any
  swap). The report receives the same instance (`BLOOM.runReport.mount(pv, { transition: dr.transition })`); `controller.transition` is
  the bridge (B4: one `uid`, the module served once).
- **The swap happens exactly once, always.** `onCovered` runs at the component's covered point when the mist runs; immediately when it
  cannot — no module (file://, a failed load), `pending` (a swap requested before the import resolved), disposed, a run already active
  (no `AtmosphereTransitionBusy` is ever surfaced), the page hidden; and as a safety net after a **watchdog** (900 ms: a throttled background
  tab that never reaches its covered point) with a **hard cap** (2.5 s) that releases the consumer and marks later swaps immediate until the
  stuck run settles. A rejecting component run (its `onCovered` threw, the instance was disposed mid-run) is caught: the overlay is already
  gone (the component reveals and removes itself before rejecting), the swap has been made, the error is recorded in the result and reported
  through `onError` — never an unhandled rejection (B9: a rejecting run, a hidden page, a never-settling run; `unhandledrejection` count 0).
- **Timing records**: `T.last` / `T.history` hold start / covered / revealStart / end on the page clock, the component's own `times`, the
  preset, the reduced flag and the layout seed of each run.

## 6. The locked order (rooms)

**Open** (Planet View → room, `decisionRooms.open`):

1. remember the pre-room running state (`state.wasRunning`);
2. pause the REAL run at once (`adapter.actions.pause()` → the page's `setRunning(false)` → the one `bloom:play-pause {running:false}`);
3. lock (`state.transitioning`, `data-transitioning` on the layer and the view) and start the SUBDUED conceal;
4. at the covered point: carry the selected region into the room context, clear the home selection through the real action
   (`bloom:region-select {id:null}`), make the Planet View inert / `aria-hidden`, reveal the room layer, show the room, paint it;
5. reveal;
6. once the reveal has completed: unlock, give focus to the right control (the requested "Would help" node with its focus preview, else
   the room title).

**Switch** (room → room): the run stays paused, the context stays, the old room's transient preview is cleared BEFORE the conceal
(`adapter.activePreview()` is null as the mist starts), the old room is hidden and the new one shown at the covered point (the room layer
is never hidden in between — no Planet View flash; never two rooms visible), no play / pause event, the incoming room's requested node is
focused after the reveal.

**Close** (Back / Escape / Resume): clear the preview; stay paused; conceal; at covered: hide the room, restore the Planet View
(inert off), no region selected; reveal; **only after the transition completes**: Back restores the pre-room state
(`setRunning(wasRunning)`), Resume runs regardless (`play()`); then focus returns to the opener (the tool or the banner button).
The player never sees the simulation advance behind the closing mist: `runningAtSwap` is false and `ticksAtEnd === ticksAtStart` for every
recorded swap (the suite's timing proof).

**Concurrency**: while a swap runs, `controller.state().transitioning` is true, the swap-affecting controls are locked (`pointer-events:none`
on the room header buttons, the nav, the tools and the banner buttons; the component's overlay blocks pointer and keyboard input too) and
`open()` / `close()` / Escape return at once (`state.ignored` counts what reached the controller). No queue. Click / key spam yields exactly one
pause, one resume, one transition per real request, never two rooms, the context kept (B8).

**End of run under an open room**: a win or an extinction notice closes the room immediately (`closeImmediate()`: no transition, no resume),
so nothing stale sits under the report; the report then opens through its own SUBDUED swap (B11).

**Measured** (Chromium 1280×800, `docs/evidence/bloom-029e/convergence-proof.json → timings`; Firefox is a little faster): the covered point
≈ 120–165 ms after the request (the preset's 90 ms conceal + the overlay mount and the component's first frame), the swap itself ≤ 25 ms, the
reveal complete ≈ 280–400 ms (the preset's 120 ms reveal + settle frames + the swap's own layout), the pause 0–1 ms after the request, the
resume 0–1 ms after the reveal completed. The preset's timings are untouched; the extra is browser scheduling and the swap's own painting.

**The card entrance**: when the mist ran (not under reduced motion, not on an immediate swap) the incoming room gets a 180 ms opacity rise, a
6 px lift and scale .992 → 1 (`.dr-room.entering`) — through the atmospheric focus, never from an edge; the map never moves or reframes
(B5: the map geometry string is identical before and after). Under reduced motion the component's reduced path runs (overlay class `rm`,
result `reducedMotion: true`) and the card gets no transform (B19). Over file:// every swap is immediate and no card animation plays (B20).

## 7. The production run report (`resources/run-ui/run-report.js`)

A large centred floating field-journal card over the dimmed Planet View (the map stays faintly visible around it; a radial ink veil of
42–62 %; the HUD / stage / footer desaturated, inert and `aria-hidden`). The header (kicker · heading with its icon · one summary sentence)
and the action bar stay in view; the facts and the body scroll inside the card when they must. No page horizontal scroll at 1024 / 1280 /
1440, every control ≥ 44 px (B18). Same visual family as the rooms (cream card, ink border, the organic radii, the SVG icon family).

**WIN** (`BLOOM` / `TRAINING COMPLETE`): the summary ("You held 65 % of the land of Training Grounds in 1m 44s."), four facts (coverage held
+ goal, time, world + archetype / World Seed, scenario), the **production plant specimen** rendered from the real owned Adapt / Spread tiers
(the permanent state, an established colony, no preview), "Your plant became" (the owned adaptations with their tiers as chips), **"You
reshaped the sky"** as a separate environmental box (the Terraform steps; never plant anatomy), Regions bloomed, Colony upgrades, "Why it
worked" (the limiting-factor explanation and the regions given up with their actual limiting reason), "Real plants do this too" (the
traits' own science text), one card per scenario (pressure / competition / climate final state), then the actions. Not a score.

**LOSS** (`EXTINCTION`): the real reason ("No living plants were left anywhere for 8 s, so the run is over after 7m 10s on Mistral-735 …"),
facts (reason, lasted, world, scenario), the specimen in its restrained unviable state (the owned anatomy stays truthful), "What happened"
(the scenario's `lossNote` or the default debrief), the scenario cards, the actions. Escape never dismisses it into the dead run.

**Accessibility**: `role=dialog aria-modal=true aria-labelledby aria-describedby`; focus enters the dialog (Keep playing, else the first
action); Tab cycles inside (`focusin` outside is pulled back); Escape is swallowed on both reports (a win is never silently resumed);
win / loss read from the heading word, the icon and the sentence, never colour alone; visible focus rings.

## 8. Report truth: the data boundary

```
demos/demo-run.html   winReport(cov) / lossReport(why)   → REPORT (the structured truth, computed once at the win / extinction)
                      legacyWinHtml(d) / legacyLossHtml(d) → the engineering modal (?ui=legacy), the same words as before
                      reportActions() / reportAction(id)   → the page's own post-run actions and their one real path
adapter               report()          → a plain copy of REPORT (null while the run is on)
                      reportActions()   → [{ id, label, note, primary, href }]  (href only on the player's navigation links)
                      actions.reportAction(id) → the page's reportAction (false when not offered now)
run-report.js         displays report(); invokes reportAction(id)
```

`winReport` holds the calculations the modal has always made, once: `held` = a region more than 40 % living; `gaveUp` = an unfit region
(fitness ≤ `grow.growThresh`) with its named limiting factor (`LIMIT_MSG`); the owned Adapt / Spread build (`single` for one-tier level /
crossing traits, as the old "×N" labels); the Terraform steps apart; colony upgrades; analogs = the built traits with `science`;
`pressureReportData` / `competitionReportData` / `climateReportData` carry what the three scenario lines said. `lossReport` holds the
reason (`sim.lostReason`), the grace seconds, the elapsed time, the identity and the debrief copy. The suite proves parity three ways
(B11 / B16 / B17): the production data equals the legacy classification recomputed in place from the sim, the production text contains
the same names / reasons / numbers as the legacy markup rendered from the same truth, and the scenario cards carry exactly the numbers of
the legacy `#repPressure` / `#repComp` / `#repClimate` lines. `run-report.js` contains no rule (N6).

**Keep playing** is the unchanged continue-after-win: `continueAfterWin()` sets `running = true`, updates the shell's button text and
invalidates `"continue"` — no `bloom:play-pause` is sent, exactly as the modal's button never sent one. **Restart this run** (an extinction
outside player mode) is the harness's reload. The player / training actions go through `goAction` (the confirm for a live run; the
training layer's `go()` with its black fade and the training status). The report invokes these and nothing else; it builds no URL.

## 9. Report lifecycle through the mist

- **Open**: the adapter's `win` event or `loss` notice (`A.report()` non-null) → `closeImmediate()` any open room → SUBDUED conceal → at
  covered: render, show, make the Planet View inert, suspend the run menu's `action-*` anchors (§10) → reveal → focus enters the dialog.
- **Keep playing**: SUBDUED conceal → at covered: hide the report, restore the Planet View → reveal → **only then**
  `actions.reportAction("keepPlaying")` → focus on the Pause button (B13: `tResume ≥ tEnd`, the run advances afterwards).
- **Leaving the run** (menu / training actions): the page's own navigation; no gameplay cloud is layered over the title's black fade.
- Over file:// the open / close are immediate; the report still opens on the win and Keep playing still resumes (B20).

## 10. Tutorial anchors (028D1): complete production ownership

Under the default UI every 028D1 anchor resolves to exactly ONE production element (B15, a fresh training page before any room opens);
the hidden shell carries only `data-tutorial-legacy` copies (renamed by the Planet View's `rehome`, again whenever the shell re-renders).

| anchor | production owner |
|---|---|
| `biomass` `coverage` `sky` `play-pause` `speed` `run-menu` `map` `map-view` `scenario-status` `message-log` | Planet View HUD / stage / footer (029B) |
| `inspect` `readout` `limiting-factor` `colony-status` | Planet View selected-region banner (029B) |
| `action-<id>` | the Planet View run menu (`#pvMenu`) while the run is on; **while the report is open, the report's run-action buttons** — the menu's copies are suspended as `data-tutorial-covered` and restored on Keep playing, so one reachable `action-<id>` exists at any time |
| `raw-signals` `growth-focus` `focus-balanced/roots/leaves/seeds` `local-upgrade` `local-rootNetwork/leafCanopy/seedReserve` | Region Inspect room (029C) |
| `upgrades` `board-adapt` `board-spread` `upgrade-<Adapt / Spread id>` | Adapt / Spread rooms (029C) |
| `board-terraform` `upgrade-warm/cool/humid/dry` | Terraform room (029D) |
| **`report`** | **the production report section (`#rr`, mounted while hidden, so it resolves before a win)** (029E) |
| **`report-continue`** | **the report's Keep playing button (hidden on a loss, present from mount)** (029E) |
| **`run-actions`** | **the report's actions group (`#rrActions`)** (029E) |

Room navigation and the report's open / close remain presentation state (`controller.state()`, `runReport.state()`); the ten `bloom:*`
events and their detail keys are frozen (N7, B10) — no new event was added. This freeze is what 028D2 builds on.

## 11. Reduced motion · file:// · failure safety

- **Reduced motion**: AtmosphereTransition's own reduced mode is authoritative (a restrained veil fade, static clouds, 80 / 110 ms). The
  bridge hands it the Settings choice (`"reduced"` → true, `"full"` → false, `"system"` → null = the OS at the start of each run), the rooms and
  the report skip their card entrance, the Planet View's `reduced` class and the specimen's reduced flag follow the same source (B19 / B19b).
- **file://** (no ES module): `canLoadModules()` is false, no request is made, `T.kind` is `"immediate"`, every swap is immediate, the
  mechanics are intact (B20). No cloud transition is acceptable on that developer fallback.
- **Failure**: a rejecting component run, a hidden page, a never-settling run, a disposed component — the swap always lands, the UI is
  never paused with no room, never both layers inert, never a stuck veil, never two rooms (§5, B9).

## 12. Legacy regression policy (tools/)

Some suites intentionally test the engineering shell. They now open `?ui=legacy` explicitly and README lists each with its reason:

| suite | why it opens `?ui=legacy` |
|---|---|
| `slice-check` `economy-check` `procedural-run-check` `colony-development-check` `desert-check` `frozen-check` `dying-world-check` `native-competition-check` `volatile-climate-check` | the pre-029 playtest suites drive the shell's own buttons (`#btnPlay`, `button.buy`, `#lossRestart`) and read its DOM (`#reportModal`, `#repPressure` …) |
| `run-ui-check` | the 029A oracle compares the adapter's snapshots with the RENDERED shell and drives its buttons |
| `training-check` B2 | the 028D1 event oracle clicks the shell's controls; B1 / B3 / B4 / B5 / B6 use the production default (titles, the production run menu for Main menu / Restart / Skip) |

The production suites use the default: `planet-view-check` (B1 opens `?ui=legacy` only to prove the developer flag still boots the shell;
`?ui=18` elsewhere is the alias), `plant-rooms-check`, `terraform-check`, `game-flow-check` (the player flow now runs through the production
menu and report), `run-ui-convergence-check`. The 029B / 029C / 029D suites' diff-based scope guards are bounded to their own accepted range
(`BASE_SHA → END_SHA`, as `run-ui-check` already did), so a later milestone's legitimate work never trips them; no assertion was weakened.
The shell remains until a later engineering cleanup because it is still a useful oracle; it is not the product UI.

## 13. The 029F seam (done in BLOOM-029F — `docs/EXPEDITION_HANDOFF_v1.md`)

The Destination Survey's exact, already generated and validated `detail.planet` must become the run's planet object — passed to the run,
**never regenerated from `candidate.seed`**. 029E touched none of it: `resources/destination-survey/*`, `resources/main-menu/*`,
`resources/planet-sphere/*` and the survey / title pages are byte-identical (N2); survey generation, validation, selected identity, scan
sector, focus and the DRAMATIC descent are unchanged. The run page still boots from `?archetype=&seed=` / `planet=` through `harnessRun()` /
`playBoot()`; 029F adds `expeditionBoot()` (`?play=1&expedition=<token>`), whose planet source is the session handoff written under the
DRAMATIC cover — the exact `detail.planet`, rehydrated, never regenerated — and lands on the default production UI, whose surface, rooms
and report take that planet object. The focused survey planet → gameplay crossing keeps the DRAMATIC preset (continued by an arrival
cover on the run page); 029E's SUBDUED language starts only inside gameplay.

## 14. 028D2 — Guided Training (production since BLOOM-028D2)

Nothing in 029E built a coach. **BLOOM-028D2** now does, on the frozen anchor table above and the ten unchanged events:
`docs/GUIDED_TRAINING_v1.md`. Room navigation still needs no new `bloom:*` event — the coach reads `controller.state()` and Region
Inspect's selected tab; the only production-UI additions are the Planet View's read-only `regionPoint` / `regionRect` and the training
report's actions (Begin Expedition · Restart training · Main menu; Keep playing is not offered after training — `reportActions()` /
`reportAction()` in the run page). The paused c23815e draft was read only, never imported.

## 15. QA — `tools/run-ui-convergence-check.js` (28th suite)

Node 10: N1 base SHA · N2 byte-identical protected files (33 files + 6 directories) · N3 scope · N4 routing + no player link to the flag ·
N5 the bridge's public-API-only consumption, the one instance, no queue, the safety nets · N6 the report truth factored once, the component
rule-free, the adapter api 1 + the report seams · N7 dispatch sites + detail keys identical to 0f5ce81 · N8 no developer copy / emoji, the
title identity · N9 the legacy-harness policy · N10 identical seeded runs with 0f5ce81's engine.
Browser (Chromium 1280 / 1024 / 1440 / reduced / file://, Firefox 1280): B1 default production + shell absent / inert / unreachable ·
B2 alias + developer flag · B3 every launch kind · B4 one instance prepared early · B5 Planet View → each room + Back (ordering, events,
geometry) · B6 room → room (preview cleared first, no flash, never two rooms) · B7 Back pre-paused / Resume after reveal / overlay gone ·
B8 spam · B9 failure safety · B10 network / console / shapes · B11 the training win report (parity, specimen, Terraform apart, actions,
anchors, status) · B12 focus trap + Escape · B13 Keep playing · B14 Restart training returns to the default · B15 every 028D1 anchor once ·
B16 extinction report (+ harness mode) · B17 pressure / competition / climate win reports (real wins through the adapter on the validator's
first strategy) · B18 widths · B19 reduced motion (OS and Settings) · B20 file:// · B21 evidence stills; then the timing proof over every
recorded swap. `--evidence` writes `docs/evidence/bloom-029e/` (stills, a deterministic frame strip with the animations paused at the
component's phases, `convergence-proof.json`).

## 16. Known limitations / risks (for 029F / 028D2)

- The report's action bar can take three rows at 1280×800 in player mode (five actions with notes); the body scrolls inside the card.
- `action-<id>` lives in two places by design (the menu while the run is on, the report while it is over); the suspension is attribute-based
  (`data-tutorial-covered`). A coach that caches elements across a win must re-query.
- The watchdog / hard cap are bridge-side safety nets for throttled tabs; on a visible page the component's own lifecycle always completes
  far earlier (B9 exercises the nets with a stubbed run).
- Firefox at 1280×800 only (WebKit not installed).
- The engineering shell's DOM is still rendered off-screen every frame (HUD, inspect, shop refreshes): it is the host, and a later
  engineering cleanup may slim it; no player-visible cost was measured.
