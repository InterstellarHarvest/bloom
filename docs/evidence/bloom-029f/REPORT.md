# BLOOM-029F evidence — Exact Destination Planet → Gameplay Handoff

Branch `agent/bloom-029f-exact-expedition-handoff`, from **3ab9933** (the accepted BLOOM-029E final candidate). Not merged; main untouched;
the 028D2 guided-training worktree untouched. Handoff: [`docs/EXPEDITION_HANDOFF_v1.md`](../../EXPEDITION_HANDOFF_v1.md).
Implementation commit **cf128fe**; this evidence is a separate commit on top.

## 1. What changed

| file | change |
|---|---|
| `resources/expedition/expedition-handoff.js` (new) | `BLOOM.expedition`: `pack` (the survey's `detail.planet` verbatim + its provenance `{ key, name, authored, archetypeId, seed, attempt, classId, sectorSeed, validation }` + its render hints + the survey's own `planetFingerprint` + a 16-hex transport checksum), `verify` (malformed / version / planet / integrity), `serialize` / `parse`, `store` / `load` / `prune` / `list` (sessionStorage only; `MAX_HANDOFFS` 2; not consumed on boot), `newToken` (`x` + 20 hex), `runUrl` / `tokenOf` / `withBegin`, `toRun` (the stored planet IS the run's planet; archetype = static content by id; seed / attempt provenance; Eden) |
| `resources/expedition/expedition-arrival.js` (new) | `BLOOM.expeditionArrival`: the arrival cover (the transition's own veil gradient, z-index 9500) before the first paint; `lift()` after `bloom:run-ready` + the production renderer's `frames > 0 && surfaceRepaints > 0` + 2 frames (720 ms; reduced motion 220 ms from the Settings choice); `fail()` the explicit failure state |
| `demos/main-menu.html` | the development handoff target removed; `descent.onCovered` → `departToGameplay`: pack → store → `survey.dispose()` → `location.assign(demo-run.html?play=1&expedition=<token>)`; 8 s guard (an explicit notice, never a reveal onto a disposed screen); `?begin=1` enters the survey at once and is dropped from the address; a bfcache-restored title after a departure reloads |
| `demos/demo-run.html` | `expeditionBoot(q)` with precedence over `playBoot` / `harnessRun`; six failure reasons → `cover.fail()`; the expedition actions (Play again · Choose another planet · Main menu) through the unchanged `playActions()` / `reportActions()` seam; `RENDER` = the handoff's exact render hints; `reportIdentity().expedition`; `harnessRun()`, `playBoot()` and the training branch textually identical to 3ab9933 |
| `content/play.js` | `play.expedition`: action labels + notes, the failure title / reasons / note / Main menu label |
| `resources/run-ui/run-ui-adapter.js` | `run().expedition` (one additive provenance read; api 1, the ten events unchanged — the whole diff is two added lines) |
| `tools/expedition-handoff-check.js` (new) | the 29th suite (§4) |
| `tools/run-ui-convergence-check.js` | its 029E byte-identity / scope guards (N2 / N3) bounded to 0f5ce81 … 3ab9933 (`END_SHA`, as the 029B–029D suites do); no assertion changed |
| docs | `EXPEDITION_HANDOFF_v1.md` (new); `DESTINATION_SURVEY_v1`, `MAIN_MENU_v1`, `GAMEPLAY_UI_CONVERGENCE_v1` no longer describe the handoff as unresolved; README (row, suite line) |

**Byte-identical to 3ab9933** (suite N2, 50 files + 8 directories): the Destination Survey (screen, data, worker, pool, css — sector generation,
validation, grid, focus, dossier, selected identity, sphere choreography, the DRAMATIC descent), `PlanetSphereView` + `planet-texture.js`, the
canonical surface, `AtmosphereTransition`, the engine, generator, validators, play / scenario modules, content (config, traits, scenarios,
archetypes, training), planets, the training layer, the menu + `ExpeditionEntry` + the fade, the production Planet View / rooms / report /
bridge / map renderer / specimen / globe helper, root `index.html`, the standalone demo pages, the bible.

## 2. The handoff, end to end (Chromium 1280×800; Firefox: the same suite, §4)

```
title page (demos/main-menu.html)                               run page (demos/demo-run.html?play=1&expedition=<token>)
  BEGIN → survey (prefetched sector 77) → select → focus           expeditionBoot: cover() FIRST
  Begin Expedition → DRAMATIC AtmosphereTransition                   → load(token, sessionStorage) → verify
  phase "covered", veil opacity 1:                                    → toRun(payload): planet = the stored planet
    pack(detail) · store · survey.dispose() · location.assign         → startRun(run): the ONE createSim
  (pagehide: survey disposed, renderer disposed, pool disposed,      → production Planet View paints THAT surface
   0 workers, still "covered")                                        → lift after run-ready + paint + 2 frames
```

- **Departure timing (recorded by the suite's storage hook):** the handoff is written only at phase `covered` with the veil at opacity 1, the
  survey in state `departing`; at `pagehide` the survey is `disposed`, its renderer `disposed`, its pool `disposed` with 0 workers, and the
  transition is still `covered` — the reveal never starts on the title page.
- **The address:** `?play=1&expedition=x…` (20 hex) — under 60 characters, no planet data.
- **Arrival:** at `bloom:run-ready` the cover is present at opacity 1 and `BLOOM_RUN.planet.id` is already the handoff's planet; the lift
  starts ≈ 20–25 ms after the surface painted (`paintedAt` → `liftStartAt`), at frame 3, after 1 surface repaint; it completes ≈ 750 ms later.
  Stills: `04a` (concealing), `04b` (full cover), `04c` (the first production frame under the arrival cover, fade pinned at opacity 1),
  `05` / `06` (the same planet in the gameplay map).

## 3. Identity proof — three worlds, three classes (one from a scanned second sector)

`identity-proof.json` (machine-readable: candidate key, sector seed, provenance seed / attempt, survey fingerprint, stored-payload fingerprint
and integrity, gameplay fingerprint, planet id, topology, tilemap hash, section-data hash, render-hints hash, starting-surface hash
(= `drawPlanetTexture(detail.planet)` = the live focused globe's own texture pixels), gameplay-surface hash (`paintSurface` of
`adapter.surface().planet` under the starting sky at 480×240), the live map's surface signature, counters, cover timings).

| pick | candidate | sector | seed / attempt | survey fingerprint | stored | gameplay | planet · topology | authoritative diffs | starting surface = gameplay surface | createSim / generator |
|---|---|---|---|---|---|---|---|---|---|---|
| volatile · first sector | `frozen_world:25452` | 77 | 25452 / 0 | `7a28839dec43d478` | `7a28839dec43d478` | `7a28839dec43d478` | proc_4260823724 · {wrapX:true,wrapY:false} | 0 | `e6b80b1b:480x240` = `e6b80b1b:480x240` | 1 / none |
| stable · first sector | `frozen_world:78286` | 77 | 78286 / 1 | `50ffcc1b293b0739` | `50ffcc1b293b0739` | `50ffcc1b293b0739` | proc_2873087054 · {wrapX:true,wrapY:false} | 0 | `72e16424:480x240` = `72e16424:480x240` | 1 / none |
| extreme · scanned second sector | `desert_world:35980` | 305406 | 35980 / 1 | `1d67d021bf01677f` | `1d67d021bf01677f` | `1d67d021bf01677f` | proc_1072048591 · {wrapX:true,wrapY:false} | 0 | `51f7dfa3:480x240` = `51f7dfa3:480x240` | 1 / none |
Per world the suite also proves: planet JSON identical (survey object == stored payload == `BLOOM_RUN.planet`); id, grid, topology, origin,
win threshold, section ids / order, section locals, tilemap and starting climate field by field; render hints identical in the run and in
`adapter.surface()`; `BLOOM_RUN.expedition.fingerprint` == the survey's; the live map's `surfaceSignature` == the canonical surface of the
exact planet under its starting sky; the handoff resolved before the single `createSim` with `generateFromArchetype`, `generatePlanet`,
`attemptPlanet`, `searchWorld` and `runSearch` wrapped to COUNT AND THROW on every expedition page (0 calls, nothing thrown); `sim ===
BLOOM_API.sim`; Eden; `play`; provenance (seed, attempt, class, sector, validation) preserved in `BLOOM_RUN.expedition`, `summary` and
`adapter.run().expedition`.

**Anti-regeneration, Node (N6):** with the same five functions stubbed to throw, `toRun()` builds the expedition run; a copy of the payload
whose provenance seed (+4242) and attempt (7) were changed yields the very same world (same fingerprint, same planet JSON); a sim on the
rehydrated planet ticks identically (300 ticks, same purchases) to one on the survey's object and to the mutated-seed copy.

## 4. QA — `tools/expedition-handoff-check.js` (29th suite): 32 / 32 Chromium, 32 / 32 Firefox

Node 10: N1 base SHA · N2 byte-identical protected files · N3 scope · N4 the envelope contract (verbatim planet, provenance, render hints,
the survey's fingerprint, checksum; every refusal reason) · N5 store / load / prune (bounded, session-only; missing / malformed / version /
integrity) · N6 anti-regeneration + mutated seed + identical sim · N7 the run page's boot (order, precedence, failure path, one createSim,
actions, render hints, identity, safeReturn) · N8 the title page's departure order + session-only transport + begin=1 + bfcache · N9 copy ·
N10 dispatch sites / detail keys / anchors / training branch / harnessRun / playBoot identical to 3ab9933; adapter api 1 + one additive read.
Browser 22 (per browser): E1 Main Menu + prefetch · E2 the 3×3 survey (nine validated worlds, class columns) · E3–E5 (a/b/c) three worlds:
focus = same candidate / same live view / texture pixels; departure at full cover + disposal + token-only URL; gameplay identity + boot
order + cover · E6 the four rooms, the Terraform globe on the handed-off planet before / after a purchase, the 029E ordering, event shapes,
anchor uniqueness · E7 the production report (identity, provenance, actions, hrefs, wording) · E7b Play again (same token, fresh sim) ·
E7c refresh · E7d Choose another planet → the title's survey; "← Main menu" → fresh prefetch · E7e Main menu from a live run → the exact
title URL · E8 six failure states · E9 TRAINING unchanged · E9b direct URLs (no query, planet=, archetype= & seed=, scenario=, play=1),
ui=legacy, file:// · E10 storage bounded / session-only, no external requests, no console / page errors; then the three-world proof.
Logs: `qa-expedition-handoff-check.log` (Chromium, `--evidence`), `qa-expedition-handoff-check-firefox.log`.

Failure states (E8; `identity-proof.json → failures`): unknown token → `missing`; `{not json` → `malformed`; version 99 → `version`; a valid
token in a tab that never chose it → `missing`; one tile edited under the old checksum → `integrity`; a planetless payload → `planet`; an
expedition link also carrying `archetype=&seed=` → `link`. Each: `BLOOM_RUN.failed`, `BLOOM_API.sim` undefined, createSim 0, generator 0,
no `.pv`, the shell hidden, an alert dialog with plain copy and one focused action (Main menu → the Strange Bloom title); still `10`.

## 5. Broad regression (29 suites)

`run-all-suites.sh` on **cf128fe** (`qa-suites-summary.txt`): **1293 pass / 2 fail** across 29 suites; 27 suites green in the run, two misses
in timing-sensitive checks on paths 029F does not touch — slice-check's perfect-bot pacing window (235 s vs a 240 s floor, the known
environment flake of 028B–029D) and game-flow-check 47 (the production Extinction report not open within 8 s after a 3000-tick file://
advance under load). Both rerun green on the branch (15/15, pacing 245 s; 74/74) and on the 3ab9933 baseline worktree (15/15, 255 s; 74/74):
`suite-flakes.txt`. Outstanding failures: **0**. The expedition-handoff suite itself passed inside the broad run (32/32) and on Firefox.

## 6. Notes / limitations

- The end-to-end expedition is http-only, as the survey already is (ES modules + module workers); the standalone `file://` run (no query)
  still boots (E9b).
- The report still (`08`) uses the suite's QA shortcut to the page's own win path (`sim.won = true; sim.onWin(coverage)` after 60 ticks) so
  the Bloom Report of a generic survey world can be captured without a full play-through; the engine is untouched and the report reads the
  real state (held / gave up / build), which is why it shows a 2 % "bloom".
- The Firefox run of the suite is the same 32 checks (WebGL survey, DRAMATIC descent, handoff, gameplay); WebKit is not installed here.
- Root-site packaging (promoting `demos/main-menu.html` to the root entry; the `file://` decision) is separate from this contract.
