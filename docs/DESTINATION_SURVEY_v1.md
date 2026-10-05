# Destination Survey v1 — integration handoff (Menu / Tutorial workstream)

**From:** BLOOM-028A · **For:** the Main Menu (which enters this screen) and the next milestone (atmospheric descent from
Begin Expedition). Evidence and QA: `docs/evidence/bloom-028a/REPORT.md`.

The Destination Survey is where a run starts: nine candidate worlds in a 3 × 3 matrix (columns **Stable / Volatile /
Extreme**), **SCAN NEW SECTOR** for nine more, and a **Planet Focus** state where one world fills the left half and its
dossier sits on the right, with **← Return to survey** and **Begin expedition**.

---

## 1. Files and ownership

| | owns |
|---|---|
| `resources/destination-survey/destination-survey.js` | **`DestinationSurvey`**: screen composition, 3 × 3 layout, labels, selection, focus state, dossier, scan, return, the Begin Expedition hook |
| `resources/destination-survey/survey-data.js` | pure data: which worlds a sector shows, their class, their dossier (no DOM; Node-testable) |
| `resources/destination-survey/survey-worker.js` | module worker that builds sectors off the main thread |
| `resources/destination-survey/destination-survey.css` | the screen's look (scoped under `.ds`) |
| `demos/destination-survey.html` | development entry point (localhost) with a dev placeholder for Begin Expedition |
| `tools/destination-survey-check.js` | the 20th regression suite (survey data) |

Sphere rendering is **not** here. Every globe is a stock `PlanetSphereView` on **one** `PlanetSphereRenderer` for the whole
screen (`docs/PLANET_SPHERE_VIEW_v1.md` §9). The survey only calls its public API and moves globe containers with CSS
transforms, which the renderer follows.

## 2. Mounting it

```html
<link rel="stylesheet" href="resources/destination-survey/destination-survey.css">
<!-- the BLOOM classic scripts: content/config.js, traits.js, planets/first_bloom.js, content/archetypes.js, content/play.js,
     resources/bloom-sim.js, bloom-gen.js, bloom-validate.js, bloom-witness.js, bloom-archetype.js -->
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
- Like the globe, it needs **http(s)** (ES modules + a module worker). Locally: `python3 -m http.server 8767` from the repo
  root → `http://localhost:8767/demos/destination-survey.html`.
- Options: `sectorSeed` (reproducible sector), `firstBloom` (add the authored First Bloom), `reducedMotion`
  (`null` follows the OS), `worker` (`false` builds sectors on the main thread), `onBeginExpedition`.
- Methods: `scan()`, `select(i)`, `returnToSurvey()`, `beginExpedition()`, `dispose()`. Each returns `false` / `null` when
  the screen is mid-transition, so double clicks are harmless.
- Read-only state: `state` (`"survey" | "focus" | …`), `selected`, `cells` (the nine candidates), `views`, `host`, `stats`.

## 3. Begin Expedition → the next milestone

`beginExpedition()` (the button) changes nothing on screen. It calls `onBeginExpedition(detail)` and dispatches a bubbling
`bloom:begin-expedition` CustomEvent on the root with the same `detail`:

| `detail.` | |
|---|---|
| `candidate` | `{ key, name, authored, archetypeId, seed, attempt, classId, sectorSeed }` — the world's identity |
| `planet`, `render` | the planet data on the globe and its archetype's render hints |
| `dossier` | what the focus panel shows |
| `view`, `globe` | the **live** `PlanetSphereView` and its container in the focus slot — still turning |
| `survey` | the screen (call `survey.dispose()` once the cloud cover hides it) |

The descent can then zoom toward the planet using the public API (`view.setDistance(…)`, or a CSS scale on `globe`), lay
its cloud layer over the screen, swap screens under the clouds and dispose the survey. No longitude matching is wanted: the
clouds are the seam.

**Decision needed before 028B (see the report, "attempt match").** A candidate is
`BLOOM.generateFromArchetype(archetype, seed, { winnability: false })`, the production attempt loop with the structural
layers only. The full layer 1–8 search for the same seed lands on the **same** world about 4 times in 5 (sample: 29 / 36).
Otherwise the playable world for that seed is a later attempt, so a different map. Options: validate the focused world in
the background while the player reads the dossier, validate under the clouds and accept a different map, or pre-validate
whole sectors.

## 4. Rules of the screen (keep when extending)

- **One renderer per screen.** Never give a cell its own view or renderer. The focused planet is the same view, moved:
  its container is re-parented into the focus slot and FLIP-animated, so its yaw and idle spin never restart.
- **Globe pixels ignore CSS opacity / filters** (shared canvas).
  - Globes move and recede with transforms on their containers and hide with `display:none`.
  - Under reduced motion, only the whole screen fades.
  - Nothing positioned may carry a background where a globe is drawn.
- **Grid globes are not draggable.** The whole cell is one real `<button>`, so a click selects without pausing the
  globe's idle spin. The focused globe gets the accepted controls (horizontal drag, ← / →).
- **Classes are presentation only.** A world's class comes from how much of its land the starting plant can already
  live on (the engine's own `evaluate()` lamps): ≥ 45 % Stable, ≥ 22 % Volatile, otherwise Extreme. No mechanic reads it.
