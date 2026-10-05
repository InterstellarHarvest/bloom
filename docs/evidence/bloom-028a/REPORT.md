# BLOOM-028A — Destination Survey Foundation: evidence report

**Branch** `agent/bloom-028a-destination-survey` · **from** `15c301d` (BLOOM-027D) · **implementation** `dbff795` ·
not merged, not pushed. Handoff for integrators: [`docs/DESTINATION_SURVEY_v1.md`](../../DESTINATION_SURVEY_v1.md).

## Results at a glance

| | |
|---|---|
| Browser + provenance QA (`qa-destination-survey.js --shots`) | **32 / 32** (`qa-results.json`) |
| Regression suites (`run-all-suites.sh`, 19 existing + new `destination-survey-check`) | **20 / 20 green**, 844 checks, 0 failures (`qa-suites-summary.txt`) |
| 027D sphere QA re-run on this branch | 42 / 43; the only failure is 027D's own provenance check N1, which lists the new 028A files by design (`sphere-qa-027d-rerun.json`) |
| WebGL contexts on the page | **1** (ever created), 1 shader program, 1 shared geometry |
| GPU (Radeon Pro 5700 XT, ANGLE Metal), 3 × 3 idle spin | 16.67 ms mean / 16.8 ms max (60 fps); the same during scan, select, focus and after 10 cycles |

## What was built

- `resources/destination-survey/destination-survey.js` — `DestinationSurvey`: screen, 3 × 3, labels, selection, focus
  state, dossier, SCAN NEW SECTOR, return, and the Begin Expedition hook. It has all of the menu state and none of the
  sphere rendering.
- `resources/destination-survey/survey-data.js` — pure data (no DOM): sector candidates, Stable / Volatile / Extreme,
  and the dossier.
- `resources/destination-survey/survey-worker.js` — a module worker that builds sectors off the main thread. If the
  worker can't start, sectors are built on the main thread, yielding between worlds.
- `resources/destination-survey/destination-survey.css` — scoped under `.ds`.
- `demos/destination-survey.html` — localhost dev entry. URL flags: `?sector=`, `&firstBloom=1`, `&rm=1|0`, `&worker=0`.
- `tools/destination-survey-check.js` — the 20th suite.
- `docs/DESTINATION_SURVEY_v1.md` — integration handoff.

No existing file changed (QA N1, N2).

## Findings for the PMO

1. **Attempt match (decision before 028B).** A survey world is `generateFromArchetype(A, seed, { winnability: false })`:
   the production attempt loop, structural layers only, because the full search is too slow for nine worlds per scan.
   On a 36-seed sample (seeds 1001–1012 × 3 archetypes), the full layer 1–8 search lands on the same attempt
   **29 / 36** times:

   | archetype | structural = validated |
   |---|---|
   | Ocean | 7 / 12 |
   | Desert | 11 / 12 |
   | Frozen | 11 / 12 |

   Raw attempt 0, which the old launcher previews use, matches only 17 / 36. So for about 1 in 5 seeds, the world
   validated for play is a different map from the globe the player chose. Options:
   - validate the focused world in the worker while the player reads the dossier, and drop or replace it if it fails;
   - validate under the clouds and accept the swap;
   - pre-validate whole sectors (seconds per world).
2. **Shared depth buffer.** `PlanetSphereRenderer` clears depth once per frame, not once per view. Where two globe boxes
   overlap, the globes intersect by depth instead of the later one painting over. The first grid → focus choreography
   showed exactly that (a big flying globe cut by full-size neighbours). It's now avoided in menu code: neighbours shrink
   first, the flight starts 90 ms later, and on return they regrow only after it has passed (QA T10c: 0 overlapping
   frames). Nothing in the component changed. A per-view depth clear would remove the constraint if the PMO wants it.
3. **First Bloom's real cut is distracting at focus size** (details below, no fix).

## Evidence files

| file | shows |
|---|---|
| `01-survey-1440x900.png` | the survey |
| `02a-` / `02b-grid-to-focus-180ms / 380ms.png` | transition frames (animations frozen) |
| `03-focus-1440x900.png` | focus + dossier |
| `04a-` / `04b-scan-sweep-*.png` | the staged scan sweep |
| `05-focus-to-grid-260ms.png` | the return |
| `06-reduced-motion-focus.png` | reduced-motion focus |
| `07a-` / `07b-*-1024x768.png` | narrower desktop |
| `08-focus-820x1180-portrait.png` | tablet portrait |
| `09-begin-expedition-dev-hook.png` | the dev placeholder after Begin Expedition |
| `10-` / `11-` / `11b-` / `12-first-bloom-*.png` | First Bloom seam |
| `13-firefox-survey.png` | Firefox |

---

## Architecture

- **One renderer.** `new PlanetSphereRenderer(root)` once per screen. Nine `new PlanetSphereView(globeSpan, { renderer:
  host, interactive: false, distance: 3.6 })`.
  - The views are reused for every sector (`setPlanet`) and for focus; they are never re-created.
  - N4 checks this statically (exactly one renderer, no Three.js, no `_` internals); T2 / T14 check it live.
- **State ownership.** All menu state (sector, cells, selection, mode, dossier, stats) lives in `DestinationSurvey`.
  N4 also checks that `planet-sphere-view.js` contains no menu code.
- **Why the sphere internals were not touched.** The public API already covers everything this screen needs:
  - `setPlanet` (scan);
  - `setInteractionEnabled` (grid vs focus);
  - `setYaw(0)` (First Bloom only);
  - transform following (`docs/PLANET_SPHERE_VIEW_v1.md` §9 / QA G5b) for the FLIP;
  - `display:none` boxes are skipped (receded globes cost nothing);
  - `dispose`.

## Destination Survey

- **3 × 3.** Columns are **STABLE / VOLATILE / EXTREME**, each with a one-line blurb.
  - The globe box is sized from the container (`cqh` / `cqw`), so the globes dominate. At 1440 × 900 each box is
    203 px, and the disc fills ~92 % of it.
  - A cell is one real `<button>` (globe + designation + world type). A faint ring becomes a class-coloured halo on
    hover / keyboard focus.
- **Classification.** Classes are presentation only; no mechanic reads them. Measure: the share of land that is
  green-lamp under the starting plant and sky, read from the engine's own `createSim().evaluate()` and area-weighted.

  | class | green-lamp share of land |
  |---|---|
  | Stable | ≥ 45 % |
  | Volatile | ≥ 22 % |
  | Extreme | anything less |

  - Sectors draw worlds (archetype uniformly, World Seed in `BLOOM_DATA.play.search`'s range) until each column holds 3.
  - Sampled sectors needed 11–36 draws and took 0.3–0.7 s in Node; no sector needed the nearest-band fallback (S2).
  - Columns come out mostly ocean / frozen / desert, but not exclusively. For example, a 54 %-habitable Frozen World
    is Stable.
- **Procedural sourcing.** These are real BLOOM worlds, not static textures (S4: tilemap, name and attempt identical to
  a direct generator call; 60 × 40 cylinders `{ wrapX: true, wrapY: false }`).
- **SCAN NEW SECTOR.**
  - Sectors follow a deterministic chain (`nextSectorSeed`). The worker prefetches the next sector while the player
    looks at this one, so a scan is about 1 s end to end, including the animation.
  - The animation is a staged sweep. Each globe shrinks (200 ms) under a scan-ring pulse, its world changes while it
    is tiny (scale 0.08), and it regrows with a slight overshoot (340 ms).
  - Cell delays are `(row + col + jitter·0.6) × 82 ms`, so the sweep runs top-left → bottom-right with slight
    irregularity. QA orders seen: `0 1 3 2 4 6 5 7 8`, `0 1 2 3 4 6 7 5 8`; Spearman ρ 0.97–1.00 vs the diagonal;
    swaps spread over 280–320 ms (T7).

## Grid → Focus

- **Same view, moved.** The selected globe's container is re-parented from its cell into the focus slot, then
  FLIP-animated (translate + scale from the old box, 720 ms). It's the same view instance, same container and same
  texture (no re-upload), so yaw and the idle spin simply continue.
- **Measured on all nine positions (T10):**
  - the largest per-frame yaw step is 0.0053 rad (the idle rate), never negative, out and back;
  - the on-screen box grows monotonically 203 → 760 px and shrinks monotonically back (T10b).
- **The rest of the screen.**
  - The other eight shrink away from the selected one (240 ms, then `display:none`, so they are not drawn).
  - Captions, column heads and the scan button fade out, and a soft class-coloured glow fades in behind the planet.
  - The dossier slides in from the right (from 360 ms).
- **Focus layout.** Two columns, planet left (up to 760 px) and dossier right. At ≤ 820 px wide it stacks: planet on
  top, dossier below, the layer scrolls, and the globe box follows the scroll (T15b).
- **Controls in focus.** Horizontal drag spins it (T11: Δyaw 0.76 rad for 260 px); vertical drag changes nothing
  (T12: Δyaw 0, quaternion x = z = 0); ← / → spin it, ↑ does nothing (T12b). The grid becomes `inert`.
- **Return** (button or Escape) reverses all of it. The globe flies back, the others regrow after it passes, and
  keyboard focus returns to that candidate (T9 / T13). 12 cycles + 10 scans leave listeners, observers and contexts at
  baseline (T14).

## Dossier

Every row is computed in `surveyDossier()` from planet data or the engine; S6 checks each against the source.

| field | value source |
|---|---|
| Habitable at landing (bar: suits / marginal / hostile) | engine lamps per region, area-weighted |
| Climate | sky temperature + each region's offset: range and area-weighted mean → Frigid / Cold / Mild / Warm / Hot |
| Water | tilemap water share, landmass count, and land the engine calls too dry / too wet |
| Soil | the engine's Soil words (salt, pH, nutrients) as land shares |
| Atmosphere | the starting sky (`globalClimate` temperature, humidity) |
| Solar exposure | region light (area-weighted) and land whose radiation exceeds the starting plant's tolerance |
| Expected challenges | the engine's limiting condition on non-green land (≥ 3 % of land, top 3), plus water crossings when landmasses > 1 |
| Tagline, survey note | the archetype's existing `display` copy (First Bloom: `BLOOM_DATA.play.firstBloom`) |

The dossier shows no simulation internals, offers no loadouts, and adds no new systems.

## Begin Expedition hook

- `beginExpedition()` dispatches a bubbling `bloom:begin-expedition` CustomEvent on the survey root and calls
  `onBeginExpedition(detail)`.
- `detail` carries `{ candidate: { key, name, authored, archetypeId, seed, attempt, classId, sectorSeed }, planet, render,
  dossier, view, globe, survey }`. `view` and `globe` are the live, still-turning globe in the focus slot.
- The 028B descent can zoom it via `view.setDistance` or a CSS scale on `globe`, cover the screen with clouds, swap
  screens and call `survey.dispose()`.
- For now the dev page shows a dashed "DEV HOOK" note. T16 confirms there is no navigation, no run is started and the
  planet data is unchanged.

## Reduced motion

- The globes follow the component: no idle spin and no fling, but manual drag still works.
- Menu animations:
  - SCAN replaces all nine at once (within 12 ms) behind a 150 ms + 220 ms fade of the whole screen;
  - select and return are the same fade with an instant layout switch;
  - CSS transitions are clamped to 10 ms;
  - nothing is animated by transform.
- Verified both with the option forced (`rm=1`) and through the OS media query (Playwright `reducedMotion: "reduce"`)
  (T8).

## QA

- **Chromium (headless, SwiftShader):** all T-checks. T1–T16, T-kbd, T10b/c, T14b and T15b are listed in
  `qa-results.json`.
- **Firefox:** F1 covers load, one context with nine drawn globes, worker sectors, scan, select → focus (yaw
  continuing), the Begin hook and return, with no errors.
- **Safari / WebKit:** not available on this machine (Playwright WebKit isn't installed). Not tested; it needs a check
  on the classroom devices.
- **Console:**
  - no errors;
  - no WebGL context warnings;
  - Chromium logs "GPU stall due to ReadPixels" only when the QA itself reads pixels or takes screenshots.
- **Mechanics unchanged:** N1 / N2 (protected paths byte-identical to `15c301d`) and the 19 existing suites green.

## Performance

- **Renderer / contexts:** 1 renderer, 1 context, 9 views. In focus only 1 view is drawn; receded boxes are skipped.
- **GPU, worker path:** 16.67 ms mean / 16.8 ms max frame for the idle 3 × 3, during a scan, during select, in focus
  idle, and after 10 scan + focus cycles. No long tasks.
- **GPU, main-thread fallback (`worker=0`):** one 83 ms frame and a 97 ms long task per scan, from generating worlds.
  That cost is why the worker exists.
- **One-off hitch, not reproduced.** One earlier full QA run recorded a single 650 ms frame during the first selection
  in a freshly launched GPU browser, right after the 027D QA run. A dedicated probe (two fresh GPU browsers × 4 rounds of
  select / return / scan) recorded 17 ms max every time, and so did the final run. I'm recording it as a one-off GPU
  warm-up stall, not a recurring hitch.
- **Repeated use (software GL):** 12 cycles + 10 scans moved the mean frame from 50.2 to 49.4 ms (T14b). GPU memory
  stays at 9 textures / 1 geometry.

## First Bloom (evidence only; no fix)

- **On the data.** All 40 rows change section across x = 59 | x = 0. The mean colour step across the cut is **27.8**,
  against **1.0** across interior columns. A generated cylinder in the same sector: 8.0 vs 8.4, i.e. seamless.
- **Grid size** (`10-first-bloom-cut-facing-grid-size.png`): **noticeable but acceptable.** A straight vertical line
  splits the small globe when the cut faces the player. The survey starts First Bloom at yaw 0 (cut on the far side),
  so it turns into view about once a minute.
- **Focused size** (`11-…focus-size.png`, compare `11b-…map-centre…`): **distracting.** A dead-straight meridian runs
  pole to pole, with every region boundary stopping on it. The rest of the globe is all organic stair-step region edges,
  so the cut reads as an artefact.
- **Rotating through the cut** (`12-…rotating-through-cut-focus.png`, u 0.92 → 0.08): **distracting.** A hard straight
  edge sweeps across the face of the planet while every other edge is irregular.

## Known issues / follow-up

- PMO decision: attempt match (finding 1).
- Optional component follow-up: per-view depth clear (finding 2). The current choreography works without it.
- First Bloom's cut (above) is a content / topology decision, out of scope here.
- WebKit untested.
- The root `index.html` is not integrated. The survey needs http, as the globe does; the `file://` decision from
  027D is still open.
- Grid globes are deliberately not draggable: a cell is one button, so selecting never interrupts the idle spin. Only
  the focused globe takes drag.
- Changing a planet with `setYaw` (First Bloom only) restarts that globe's 3 s idle delay. That is component behaviour;
  it is hidden inside the scan-in.
