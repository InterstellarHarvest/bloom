# Expedition Handoff v1 — the exact Destination Survey planet becomes the gameplay planet

**From:** BLOOM-029F · **For:** the Main PMO (acceptance; root-site packaging), the Tutorial PMO (BLOOM-028D2 resumes after this
milestone is accepted). Evidence and QA: `docs/evidence/bloom-029f/REPORT.md`, suite `tools/expedition-handoff-check.js` (the 29th).

> **The contract.** The world the player chose in the Destination Survey — `detail.planet`, the exact object the production
> validation path produced, the globe drew, the dossier measured and Begin Expedition handed on — **is the world gameplay plays.**
> It crosses the page boundary as **serialized data, verbatim**, and is **rehydrated** as the run's planet. It is **never regenerated**:
> no generator, world search or attempt loop runs on the expedition path; the candidate's World Seed and attempt travel as
> **provenance only** (shown, reported, never a world source).

```
Main Menu → Destination Survey → one exact validated planet → focused live globe → DRAMATIC descent
  → (under full cover) handoff written · survey disposed · navigate with an opaque token
  → gameplay boot: handoff resolved BEFORE the one sim · the stored planet is the run's planet
  → canonical flat map of that planet (= the globe's canonical surface) → play it.
```

---

## 1. Files

| | |
|---|---|
| `resources/expedition/expedition-handoff.js` (new) | **`BLOOM.expedition`**: the transport — `pack` (the survey detail → a versioned envelope), `verify`, `serialize` / `parse`, `store` / `load` / `prune` / `list` (sessionStorage, bounded), `newToken`, `runUrl` / `tokenOf` / `withBegin`, `toRun` (envelope → the run descriptor). Classic script, no DOM; Node-testable; the ES-module title page reads it as `window.BLOOM.expedition` |
| `resources/expedition/expedition-arrival.js` (new) | **`BLOOM.expeditionArrival`**: the run page's continuation of the descent — a full-viewport arrival cover (the transition's own veil) before the first paint, lifted only after the exact planet is on screen; the explicit failure state |
| `demos/main-menu.html` | the development handoff target is gone: the DRAMATIC descent's `onCovered` packages the exact planet, writes the handoff, disposes the survey and opens the gameplay page; `?begin=1` enters the survey at once; a title restored from the back-forward cache after a departure reloads |
| `demos/demo-run.html` | `?play=1&expedition=<token>`: `expeditionBoot` (precedence over the play / harness boots), the expedition actions, the exact render hints, the report's expedition identity |
| `content/play.js` | `play.expedition`: the three actions (with notes) and the failure copy |
| `resources/run-ui/run-ui-adapter.js` | one additive read: `run().expedition` (provenance; api stays 1, the ten events unchanged) |
| `tools/expedition-handoff-check.js` (new) | the 29th suite; `tools/run-ui-convergence-check.js` bounds its 029E byte-identity / scope guards to 0f5ce81 … 3ab9933 (as the 029B–029D suites do) |

**Untouched (byte-identical to 3ab9933, suite N2):** the Destination Survey (screen, data, worker, pool, css), `PlanetSphereView` +
`planet-texture.js`, the canonical surface, `AtmosphereTransition`, the engine, generator, validators, play / scenario modules, content
(config, traits, scenarios, archetypes, training), planets, the training layer, the menu + `ExpeditionEntry` + the fade, the production
Planet View / rooms / report / transition bridge / map renderer / specimen / globe helper, root `index.html`, the standalone demo pages.

## 2. Why the page boundary carries serialized data

The title page (Main Menu + survey) and the run page are separate documents; no JavaScript object reference survives a real navigation.
The survey already guarantees that `detail.planet` is the fully validated world (028A1 / 028B / 028C). So the crossing copies that object
as plain data (`JSON.parse(JSON.stringify(detail.planet))` — the planet is plain data by construction; the departing page re-checks the
copy is JSON-identical before storing it) and the run page rehydrates it. That is a **copy of the validated world**, not a regeneration;
`tools/expedition-handoff-check.js` N6 builds an expedition run with the generator, `generatePlanet`, `attemptPlanet`, `searchWorld` and
`runSearch` stubbed to throw, and the browser part counts those functions on every page (zero on every expedition page, with the same
stubs armed).

## 3. The envelope (version 1)

```js
{ version: 1, token: "x…20 hex…", source: "destination-survey", scenario: "eden", createdAt, returnTo,
  planet,        // detail.planet, verbatim (plain data)
  candidate: { key, name, authored, archetypeId, seed, attempt, classId, sectorSeed, validation },   // the survey's provenance, in this order
  render,        // detail.render: the survey's render hints (the archetype's map treatment), copied — never reconstructed
  fingerprint,   // survey-data's planetFingerprint(detail.planet), computed by the departing page with the survey's own function
  integrity }    // a 16-hex transport checksum of [version, source, scenario, token, planet, candidate, render, fingerprint]
```

- **One identity algorithm.** `fingerprint` is the survey's `planetFingerprint` (reused, not re-implemented). `integrity` is a transport
  checksum so a corrupted or edited handoff is refused — it is not a second identity. QA compares the survey's fingerprint with the
  fingerprint recomputed on the rehydrated gameplay planet (identical for every world in the evidence).
- `verify()` → `{ ok }` or `{ ok: false, reason }` with `malformed` (not an envelope / bad token / other source), `version`, `planet`
  (no playable planet: id, name, grid, sections, climate, tilemap length), `integrity`.

## 4. Storage, token, lifetime

- **sessionStorage only** (the tab's session; `BLOOM.expedition.storageOf(window)`): `strange-bloom.expedition.<token>` per handoff and one
  index `strange-bloom.expedition.index`. Never localStorage: no world is ever persisted beyond the tab (suite N8 / E10 scan both).
- **Token:** `"x"` + 20 hex characters from `crypto.getRandomValues`. The gameplay URL is `demo-run.html?play=1&expedition=<token>` — only
  the token travels in the address (E3b–E5b: the query is under 60 characters, no planet data).
- **Bounded:** `store()` keeps the newest `MAX_HANDOFFS` (2) and prunes the rest (plus any orphan item). A new selection replaces the
  oldest. After four departures the session holds exactly two handoffs + the index (E10).
- **Not consumed on boot:** a refresh and Play again replay the same token → the same exact planet (E7b / E7c). A token opened in a tab that
  never chose it, or pruned, is `missing` → the explicit failure state (§8).

## 5. The departure (`demos/main-menu.html`)

DestinationSurvey's accepted DRAMATIC descent is untouched. Its `descent.onCovered(detail, info)`, called only under full cloud cover
(the veil at opacity 1, phase `covered`), now does — in this order — `departToGameplay`:

1. `BLOOM.expedition.pack(detail, { token, returnTo, fingerprint: planetFingerprint(detail.planet) })`, then the packaged planet is
   re-checked JSON-identical to `detail.planet`;
2. `store(env, sessionStorage)` (prunes older handoffs);
3. `detail.survey.dispose()` — the renderer, the nine views, the pool's workers, the DOM (E3b–E5b record the survey disposed, the
   renderer disposed, the pool disposed with 0 workers, all while the phase is still `covered`);
4. `location.assign(demo-run.html?play=1&expedition=<token>)`.

If the gameplay page has not opened after 8 s (the survey is gone by then), the promise rejects: the descent reports an error and the page
shows a plain notice with a reload — never a reveal onto a disposed screen, never a silent retry. The survey halts its prefetch workers on
departure as before, so nothing is generated during the crossing. `returnTo` is the title page's own URL (hash and `begin=1` removed).

## 6. The arrival (`resources/expedition/expedition-arrival.js`) — DRAMATIC continuity

The run page must never flash First Bloom, another world, the engineering shell, a blank page or a wrong surface. `expeditionBoot` calls
`BLOOM.expeditionArrival.cover()` **first**, before the handoff is even read: a full-viewport layer painted with the transition's own
veil gradient (`#dfe7f6 → #c3d0ea → #a9b9dc`, radial), z-index 9500 (above the Planet View and rooms, below AtmosphereTransition's
10000). It is not a second cloud engine: one veil, one fade. `lift()` waits for `bloom:run-ready`, then for the production Planet View's
renderer to report `frames > 0 && surfaceRepaints > 0` (capped at 4 s so a stalled GPU process cannot strand the player), then two more
animation frames, then fades the veil out over 720 ms (reduced motion: 220 ms, from the Settings motion choice through `main-menu-data.js`
over http(s), else the OS). `BLOOM.expeditionArrival.stats` records every step. The suite samples the cover at `bloom:run-ready`:
present, opacity 1, and `BLOOM_RUN.planet.id` already the handoff's planet.

## 7. Gameplay boot precedence (`demos/demo-run.html`)

```
expedition=<token>      → expeditionBoot(q)                    (029F; takes precedence)
play=1 & archetype=     → playBoot(q)                          (016, unchanged)
otherwise               → harnessRun() → startRun(run)         (007 / 012 / 028D1, unchanged: no query, planet=, archetype= & seed=, scenario=, training=1, ui=legacy)
```

`expeditionBoot`: cover → `X.load(token, sessionStorage)` → (failure → §8) → `X.toRun(payload, { BLOOM_DATA })` → `startRun(run)` (the
page's ONE `createSim` site, from `BLOOM_RUN.planet`) → `cover.lift()`. The run descriptor: `planet` **is** the rehydrated payload planet;
`archetype` is the static archetype CONTENT looked up by `candidate.archetypeId` (display name, presentation metadata, render context — a data
lookup, never a generator call; an id unknown to the build gets a minimal stand-in from the planet's own provenance); `seed` / `attempt`
provenance; `scenario: null` (Eden); `play: true`; `render` = the payload's exact render hints (`RENDER` in the page reads
`BLOOM_RUN.render` on an expedition run); additive `BLOOM_RUN.expedition = { token, source, candidateKey, sectorSeed, classId, authored,
archetypeId, seed, attempt, validation, fingerprint, integrity, createdAt, returnTo, playAgainHref, chooseHref }` and
`BLOOM_RUN.summary.expedition = true`. An expedition link that also carries `archetype=`, `seed=`, `scenario=`, `planet=`, `training=` or
`candidates=` is refused (`link`). Existing `BLOOM_RUN` consumers see a procedural (or authored, for the First Bloom candidate) play run.

**Scenario policy.** The survey validates its candidates through the Eden path, so an expedition starts under **Eden** with the exact
selected planet. 029F adds no scenario selection and never revalidates the planet against another scenario; direct `scenario=` URLs are
unchanged. Scenario choice in the Main Menu flow is a separate, later decision.

## 8. Invalid / missing handoffs

`load()` reasons `missing` (unknown token, no token, no storage, pruned, another tab), `malformed`, `version`, `planet`, `integrity`,
and the page's own `link`. Each shows the explicit failure state in place of the cover (`#expeditionFail`, an alert dialog in plain
copy from `content/play.js`: a title, one sentence per reason, "No other world was substituted and no run was started…", one button
**Main menu** → `main-menu.html`); the engineering shell stays hidden; `BLOOM_RUN = { kind: "expedition", failed: true, … }`,
`BLOOM_API = { run: summary }`; no sim, no `createSim`, no generator / search call, no First Bloom, no other sector planet, no stack trace
(E8 covers all six).

## 9. Canonical surface identity

The globe's texture is the canonical surface (`BLOOM.surface.paintSurface` at the texture's tile size under the planet's starting sky,
029B) and the production map paints the same surface with the same function. For the handed-off planet the suite proves, per world:
the focused survey `PlanetSphereView`'s own texture pixels == `drawPlanetTexture(detail.planet)` == the gameplay page's
`paintSurface(adapter.surface().planet, { render, sky: startSky })` at 480×240 (pixel hash), and the live map's `surfaceSignature` is the
planet under its starting sky; render hints identical in the run and in `adapter.surface()`. After a Terraform purchase the Terraform
room's sphere texture signature and the flat map's signature both equal the canonical surface of the exact planet under the new sky (E6).

## 10. Play again · post-run actions · Main Menu return

An expedition run's actions (the run menu and the production report, through the existing `playActions()` / `reportActions()` seam and
the adapter; copy in `content/play.js`):

| action | goes to |
|---|---|
| **Play again** (primary) | `demo-run.html?play=1&expedition=<the same token>` — the SAME stored planet (same fingerprint, planet JSON and canonical surface), a FRESH simulation (0 ticks, start Biomass, no upgrades, not won) |
| **Choose another planet** | the title page's URL + `begin=1` — the Strange Bloom title enters the Destination Survey at once (the parameter is dropped from the address) |
| **Main menu** | the title page's URL exactly (`returnTo`, validated by `BLOOM.play.safeReturn`: same origin only) — a fresh sector prefetch starts there |

No root-launcher link, no `ui=legacy`, no scenario chooser, no "Same planet, new world" (it would bypass the 3×3 selection). Direct
developer / player runs keep their existing action sets. Leaving a live run still asks first. The report's **World** line shows the planet
name and, for a procedural world, `archetype · World Seed <seed>` as provenance; `report().identity.expedition` carries the candidate key,
sector seed, class, seed, attempt, validation and fingerprint. No wording implies the run regenerated the world.

## 11. TRAINING and direct runs

TRAINING is not an expedition: the title's TRAINING still fades to black and opens `demo-run.html?training=1&return=<title>` (028D1), with
no handoff written and no arrival cover (E9). No query, `planet=`, `archetype=&seed=`, `scenario=`, `play=1`, `training=1` and `ui=legacy`
boot exactly as before (suite N10 proves `harnessRun()`, `playBoot()` and the training branch textually identical to 3ab9933; E9b runs each).
The standalone `file://` run (no query) still boots; the end-to-end expedition is http-only, as the survey already is (ES modules + module
workers).

## 12. Tutorial contract

All ten `bloom:*` dispatch sites and detail key lists, the `data-tutorial` anchor set, `BLOOM_RUN_UI`, `BLOOM_API`, the production
default and the report anchors are those of 3ab9933 (N10, E6). The Main Menu return reuses the existing `action-mainMenu` anchor through the
run menu / report. The 028D2 coach was not built and its worktree not touched.

## 13. Remaining: root-site packaging

The authoritative production flow is `demos/main-menu.html → Destination Survey → demos/demo-run.html`. Root `index.html` (the old
launcher) is untouched and is linked from nothing in this flow; promoting the Main Menu to the root entry and the `file://` decision are
packaging work for the PMO, separate from this identity contract.

## 14. Guided Training

With this milestone accepted, the end-to-end expedition identity contract is closed and Guided Training (BLOOM-028D2) may resume on the
frozen anchor table (`docs/GAMEPLAY_UI_CONVERGENCE_v1.md` §10, `docs/TRAINING_FOUNDATION_v1.md`).
