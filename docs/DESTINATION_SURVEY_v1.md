# Destination Survey v1 — integration handoff (Menu / Tutorial workstream)

**From:** BLOOM-028A, validated identity BLOOM-028A1, departure BLOOM-028B · **For:** the Main Menu (which enters this
screen) and the Main PMO (which connects the expedition descent to the real game). Evidence and QA:
`docs/evidence/bloom-028a/REPORT.md`, `docs/evidence/bloom-028a1/REPORT.md`, `docs/evidence/bloom-028b/REPORT.md`.

> **The planet contract.** Every world the survey shows is already a **fully validated** BLOOM world. The selected
> **`detail.planet` is the authoritative gameplay planet. Consumers must not regenerate it from the seed.**
> `detail.candidate.seed` is provenance only. See §3.

The Destination Survey is where a run starts: nine candidate worlds in a 3 × 3 matrix (columns **Stable / Volatile /
Extreme**), **SCAN NEW SECTOR** for nine more, and a **Planet Focus** state where one world fills the left half and its
dossier sits on the right, with **← Return to survey** and **Begin expedition**.

---

## 1. Files and ownership

| | owns |
|---|---|
| `resources/destination-survey/destination-survey.js` | **`DestinationSurvey`**: screen composition, 3 × 3 layout, labels, selection, focus state, dossier, scan, return, the Begin Expedition hook, and (028B) the departure choreography that invokes AtmosphereTransition |
| `resources/destination-survey/survey-data.js` | pure data: which validated worlds a sector shows, their class, their dossier, `planetFingerprint` (no DOM; Node-testable) |
| `resources/destination-survey/survey-worker.js` | module worker that builds **one column** (three validated worlds) off the main thread; up to three run in parallel |
| `resources/destination-survey/destination-survey.css` | the screen's look (scoped under `.ds`) |
| `demos/destination-survey.html` | development entry point (localhost) with a dev placeholder for Begin Expedition (announce only, no `descent`) |
| `demos/expedition-descent.html` | 028B integration harness: the full departure into a clearly marked development handoff target |
| `resources/atmosphere-transition/` | the reusable cloud transition the departure uses (screen-agnostic; `docs/ATMOSPHERE_TRANSITION_v1.md`) |
| `tools/destination-survey-check.js` | the 20th regression suite (survey data; S4 re-validates every shown world independently) |

Sphere rendering is **not** here. Every globe is a stock `PlanetSphereView` on **one** `PlanetSphereRenderer` for the whole
screen (`docs/PLANET_SPHERE_VIEW_v1.md` §9). The survey only calls its public API and moves globe containers with CSS
transforms, which the renderer follows.

## 2. Mounting it

```html
<link rel="stylesheet" href="resources/destination-survey/destination-survey.css">
<!-- the BLOOM classic scripts: content/config.js, traits.js, planets/first_bloom.js, content/archetypes.js,
     content/scenarios.js, content/play.js, resources/bloom-sim.js, bloom-gen.js, bloom-validate.js, bloom-witness.js,
     bloom-archetype.js, bloom-scenario.js, bloom-play.js -->
<main id="survey" style="width:100%; height:100dvh"></main>
<script type="module">
  import { DestinationSurvey } from "./resources/destination-survey/destination-survey.js";
  const survey = new DestinationSurvey(document.getElementById("survey"), { onBeginExpedition: detail => { /* … */ } });
  await survey.ready;          // first sector on screen
  // leaving the screen:
  survey.dispose();            // animations, renderer + nine views, worker, listeners, built DOM
</script>
```

- The root is any sized box. It becomes the renderer's stage and gets `class="ds"`.
- Like the globe, it needs **http(s)** (ES modules + module workers). Locally: `python3 -m http.server 8767` from the repo
  root → `http://localhost:8767/demos/destination-survey.html`.
- Options:
  - `sectorSeed` (reproducible sector);
  - `firstBloom` (add the authored First Bloom);
  - `reducedMotion` (`null` follows the OS);
  - `workers` (pool size: one column task per worker; default hardware threads − 1, clamped 1 … 3);
  - `worker` (`false` builds sectors on the main thread: a degraded path that freezes the screen ~1 s per world);
  - `onBeginExpedition`;
  - `descent` (028B): play the dramatic departure on Begin Expedition (§3).
- Methods: `scan()`, `select(i)`, `returnToSurvey()`, `beginExpedition()`, `dispose()`. Each returns `false` / `null` when
  the screen is mid-transition, so double clicks are harmless.
- Read-only state:
  - `state` (`"survey" | "focus" | …`), `selected`, `cells` (the nine candidates), `views`, `host`;
  - `nextSectorReady`;
  - `stats` (scans, selects, sector build times, scan waits, …).

## 3. Begin Expedition → the next milestone

`beginExpedition()` (the button) changes nothing on screen. It calls `onBeginExpedition(detail)` and dispatches a bubbling
`bloom:begin-expedition` CustomEvent on the root with the same `detail`:

| `detail.` | |
|---|---|
| `planet` | **the authoritative gameplay planet**: the exact validated object the player saw, inspected and chose |
| `candidate` | identity + provenance `{ key, name, authored, archetypeId, seed, attempt, classId, sectorSeed, validation }` |
| `render` | the archetype's render hints (map treatment) |
| `dossier` | what the focus panel shows (computed from `planet`) |
| `view`, `container` | the **live** `PlanetSphereView` and its element in the focus slot — still turning (`globe` = the same element, kept for 028A callers) |
| `survey` | the screen (call `survey.dispose()` once the cloud cover hides it) |

**Gameplay must consume `detail.planet`.**
- Do not call the generator, `BLOOM.play.searchWorld` or `runSearch` again with `detail.candidate.seed`.
- The planet is already the world that path produces (it went through it, in the worker). Running it again can only
  return the same map at best, or a different one if anything in generation or validation ever changes.
- `survey.dispose()` does not touch planet objects, so a consumer can keep `detail.planet` after the screen is gone.

### 3.1 The departure (028B): `descent`

Pass `descent` and Begin Expedition also plays the departure. Full description, timings and failure behaviour:
`docs/ATMOSPHERE_TRANSITION_v1.md` §7.

```js
new DestinationSurvey(root, { descent: {
  async onCovered(detail, info) { detail.survey.dispose(); await mountExpedition(detail.planet); },  // REQUIRED; only under full cover
  onError(err, detail) { … },   // optional (default console.error); the survey is then back in focus state
  transition,                   // optional AtmosphereTransition (default: a private one over document.body)
  coveredTimeoutMs,             // optional
  autoDispose: true,            // dispose the survey after onCovered resolves, if you did not
  seed,                         // optional: fix the cloud layout (default: a fresh random layout every departure)
} });
```

- **Begin commits at once.**
  - State `"departing"`: every other action and a second Begin are refused.
  - The announcement (event + `onBeginExpedition`) fires once; `detail.descent` is a promise of the departure.
  - The prefetch workers stop, so nothing is generated while departing.
- **Recede.** The dossier and header recede.
- **Approach.**
  - The **same live view** moves to the screen centre (its container eases to the screen's rectangle, never beyond the
    canvas).
  - Its camera dollies in with the public `setDistance` until the world overfills the screen.
  - Its yaw is never touched and it keeps turning. **There is no landing alignment.**
- **Cover and handoff.** AtmosphereTransition's DRAMATIC cover closes. Only at full cover is `descent.onCovered(detail)`
  called: mount the destination from `detail.planet`, dispose the survey. Then the clouds part.
- **Failure.** If `onCovered` fails, the survey restores itself under cover (focus state, same view, inspection distance,
  prefetch resumed) before the clouds reveal it.
- **Reduced motion.** Fades only, no approach; the transition takes its reduced path.

## 4. Validated sectors, prefetch and cost (028A1)

**What a candidate is.** It is the world the play flow itself produces:
- `BLOOM.play.runSearch({ archetype, scenario: null /* Eden */, seeds: [seed] })`, which runs `generateFromArchetype`
  layers 1–8 (structure, reachability, a real winnability witness, strategy diversity, pacing) and then `stripPlanet`.
- A seed with no acceptable world is skipped; it is never shown.
- 028A's structural-only worlds are gone. In a sample of 028A's own sectors, 4 of the 27 worlds shown (3 of 12 Ocean)
  were not the world a validated run of that seed plays.

**How a sector is built.**
- A sector is three **column tasks**, one per class, each finding three worlds of its class.
- A column draws (archetype, seed) pairs from a deterministic stream for (sector seed, column).
- Each draw is first *predicted* with a cheap structural world (≈ 20 ms; never shown).
- Only draws predicted for that column are validated, the slow part.
- A validated world whose real class differs is set aside (≈ 1 in 10 validations).
- Columns are independent, so the sector is identical whether built in one worker, three, or in Node.

**Workers and prefetch.**
- Up to three module workers run the column tasks in parallel. The main thread never generates.
- When a sector appears, the next one starts validating in the background. With it ready, **SCAN NEW SECTOR** is just
  the sweep (~0.9–1.0 s).
- If SCAN is pressed before it is ready:
  - the button stays busy and the header counts **"Confirming worlds n / 9"**;
  - no globe changes until all nine are validated;
  - then the normal sweep runs.
- The first sector shows a "Surveying sector… n / 9 worlds confirmed" placeholder.

**Measured cost** (2026, desktop: 8-core, Radeon Pro 5700 XT; `docs/evidence/bloom-028a1/`):

| | |
|---|---|
| one validated world (inside a worker) | ≈ 0.7 s mean (Frozen 0.74, Desert 0.73, Ocean 0.69; tails to 2–3 s) |
| first sector, 3 workers (5 fresh loads) | 2.8 – 5.1 s (the slowest column decides); 1 worker ≈ 7.6 s |
| prefetched sectors (8 in a row) | 1.8 – 5.4 s each, while the player looks at the current one |
| main thread while workers validate | event-loop lag ≤ 3 ms, no long tasks, 60 fps |
| the same work on the main thread (`worker: false`) | frames up to 1.4 s, lag up to 3 s — why the workers exist |

**Recommendation for the Main Menu.** Create the survey (or at least start its first sector) while the title screen is
showing, so the 3–5 s first-sector validation finishes before the player arrives.

## 5. Rules of the screen (keep when extending)

- **One renderer per screen.** Never give a cell its own view or renderer. The focused planet is the same view, moved:
  its container is re-parented into the focus slot and FLIP-animated, so its yaw and idle spin never restart.
- **Globe pixels ignore CSS opacity / filters** (shared canvas).
  - Globes move and recede with transforms on their containers and hide with `display:none`.
  - Under reduced motion, only the whole screen fades.
  - Nothing positioned may carry a background where a globe is drawn.
- **Grid globes are not draggable.** The whole cell is one real `<button>`, so a click selects without pausing the
  globe's idle spin. The focused globe gets the accepted controls (horizontal drag, ← / →).
- **Classes are presentation only.** A world's class comes from how much of its land the starting plant can already
  live on (the engine's own `evaluate()` lamps). No mechanic reads it.
  - Bands: ≥ 35 % Stable, ≥ 20 % Volatile, otherwise Extreme.
  - 028A1 recalibrated them on 90 validated worlds (tertiles 21 % / 34 %). Validated worlds are harsher than 028A's
    structural ones, so the old 45 % / 22 % bands made Stable rare (≈ 1 in 10 worlds).
- **Never show a world before it is validated, and never swap a shown world.** One `setPlanet` per cell per sector.
- **The departure never generates, re-plans or re-orients** (028B). It only moves the live view's container, dollies its
  camera and hands over the very `detail.planet` object.
