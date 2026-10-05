# PlanetSphereView v1 — integration handoff (Menu / Tutorial workstream)

**From:** BLOOM-027D (sphere track, final milestone) · **For:** whoever builds Choose Planet, the 3×3 planet grid, focused
planet views, tutorials and presentation moments.

The globe is a **visual presentation** of a BLOOM planet. It is not a gameplay map: the 2D map stays the place where players
inspect and select regions. You should be able to use the component without editing its files. If you find you need to,
raise it with the PMO first.

---

## 1. What it is, and what it does not do

| PlanetSphereView owns | It does **not** own |
|---|---|
| Three.js scene, camera, lights, globe mesh, material | navigation, menu or focus state, selection |
| the planet texture canvas (drawn from authoritative planet data) | scenario state, Adapt / Spread / Terraform, Region Inspect |
| yaw-only pointer / keyboard spin, idle rotation, reduced motion | cloud / atmosphere / loading transitions |
| resize, DPR cap, WebGL resource lifecycle | tutorial sequencing |

Fixed behaviour you build on:

- **Yaw only.** The globe spins about its vertical axis and nothing else. There is no pitch, roll, orbit or view over a pole.
- **Polar rows.** Rows 0–2 and 37–39 of the 60×40 map never face the camera. This is accepted, since the 2D map is where
  regions are selected.
- **Starting surface only.** It shows bare ground under the starting sky, plus water. There are no plants and no live
  simulation.

## 2. Files

| | |
|---|---|
| `resources/planet-sphere/planet-sphere-view.js` | **`PlanetSphereView`**, **`PlanetSphereRenderer`** (the module you import) |
| `resources/planet-sphere/planet-texture.js` | planet data → 2:1 texture, UV → tile → region (pure; no Three.js) |
| `resources/planet-sphere/vendor/three-0.185.1/` | pinned Three.js r185.1, imported by relative path |
| `demos/planet-sphere.html` | developer demo / QA page (one globe, diagnostics) |
| `demos/planet-sphere-grid.html` | technical proof: nine globes on one context (**not** the menu) |

## 3. Requirements

- **ES modules over http(s).** The component is an ES module, and Chromium refuses module scripts from `file://` (QA F0).
  - Locally, run `python3 -m http.server 8767` from the repo root, then open `http://localhost:8767/<page>`.
  - **This matters for `index.html`.** The owner currently opens it straight from disk (`file://`), and
    `tools/game-flow-check.js` tests it that way.
  - Putting the globe on `index.html` therefore needs a decision. Either serve the game over http, or load the globe with a
    guarded dynamic `import()` and keep the existing 2D mini-map preview when the import fails (sketch in §10).
  - Agree this with the PMO before integrating. It is the only open integration question.
- **No import map.** The module imports Three.js by relative path, so a page only needs
  `import { PlanetSphereView, PlanetSphereRenderer } from "<relative path>/resources/planet-sphere/planet-sphere-view.js"`.
- **Planet data.**
  - A generated planet already carries its tilemap.
  - An *authored* planet (First Bloom) is laid out by the game's own `BLOOM.resolveLayout`. That function comes from the
    classic BLOOM scripts (`content/config.js` … `resources/bloom-sim.js`), which every BLOOM page already loads.
  - You can also pass `{ layout }` yourself.
- **Three.js stays at r185.1.** Don't upgrade it as part of the menu work.

## 4. Quick start: one globe

```html
<div id="hero" style="width: 420px; height: 420px"></div>
<script type="module">
  import { PlanetSphereView } from "./resources/planet-sphere/planet-sphere-view.js";
  const A = BLOOM_DATA.archetypes.find(a => a.id === "desert_world");
  const { planet } = BLOOM.archetype.attemptPlanet(A, A.display.previewSeed, 0);   // fast, no validation (see §9)
  const view = new PlanetSphereView(document.getElementById("hero"), { planet, render: A.render || null });
  // later, when the screen goes away:
  view.dispose();
</script>
```

The container can be any sized element; the component never looks anything up by id. A view built without `renderer` makes
its own canvas inside the container, and `dispose()` removes it.

## 5. Public API

```js
new PlanetSphereView(container, options?)
```

| option | default | |
|---|---|---|
| `planet`, `render`, `layout` | — | same as `setPlanet` (may be set later) |
| `renderer` | — | a shared `PlanetSphereRenderer` (§8); omitted = the view owns one inside `container` |
| `autoRotate` | `true` | idle spin |
| `interactive` | `true` | drag / ← → spin |
| `reducedMotion` | `null` | `null` follows `prefers-reduced-motion`; `true` / `false` force it |
| `yaw` | `0` | starting yaw in radians; 0 = map centre facing the viewer |
| `distance` | `4.2` | camera distance in globe radii (1.45 … 6); the globe fills ~78% of the box height |
| `wheelZoom` | `false` | let the mouse wheel zoom (off: a globe in a list must not swallow page scrolling) |
| `background` | `null` | `null` = transparent (your page shows through); a CSS colour fills the view's box |
| `textureWidth` | `480` | texture target width (60×40 → 480×240, 8×6 px per tile) |
| `maxDpr` | `2` | device-pixel-ratio cap (own renderer only; a shared renderer has its own) |
| `idleDelayMs`, `idleRampMs`, `idleSpeed` | `3000`, `1500`, `2π/60` | idle waits 3 s, eases in over 1.5 s, one turn a minute |
| `onInteractionStart(view)`, `onInteractionEnd(view)` | — | a drag (or a key step) began / ended |
| `ariaLabel` | "Planet globe: drag sideways…" | set on an interactive container that has no `aria-label` |

| method | |
|---|---|
| `setPlanet(planet, { render, layout } = {})` | show a planet (see §6); `setPlanet(null)` hides the globe. Returns the view |
| `setAutoRotate(on)` | idle spin on/off (stops at once) |
| `setInteractionEnabled(on)` | drag / keys on/off; disabling mid-drag ends the drag (fires `onInteractionEnd`) |
| `setYaw(rad, { animate } = {})`, `getYaw()` | absolute yaw; `animate` tweens 0.7 s (instant under reduced motion) |
| `lookAt(u, { animate } = {})` | turn the shortest way so map longitude `u` (0 … 1, 0.5 = centre) faces the viewer |
| `resize()` | re-measure now (normally automatic, §7) |
| `dispose()` | free everything (§8); idempotent |

Read-only or optional:

- `disposed`
- `centerU()`
- `setDistance(d)`
- `pickAt(clientX, clientY)` returns `{ uv, region }` or `null`. It's a hover helper, not a selector; `region` comes from
  the authoritative tilemap.
- `state()` is a debug snapshot.

Anything starting with `_` is internal.

## 6. Assigning and changing a planet

```js
view.setPlanet(planet, { render: archetype.render || null });
```

- `planet` takes any of these:
  - a generated planet (`BLOOM.generateFromArchetype`, `BLOOM.archetype.attemptPlanet(...).planet`, `BLOOM.generatePlanet`);
  - First Bloom (`BLOOM_DATA.planets.first_bloom`).
- `render` is the archetype's map treatment: desert dunes, frost, water colours.
  - Pass it explicitly. `attemptPlanet` planets don't record their archetype.
  - It's `null` for First Bloom and for the default generator.
- The texture is drawn from planet data, never copied from another canvas.
- It is **redrawn and uploaded only when its source changes.** Calling `setPlanet` again with the same content costs
  ~0.1 ms and uploads nothing (QA B5). A real change costs ~3 ms and one upload.
- Orientation is kept across planet changes. Call `setYaw` / `lookAt` if you want a fixed starting face.
- A planet you mutate in place is picked up on the next `setPlanet` call, because the signature hashes the content.

## 7. Interaction, idle, reduced motion, resize

**Pointer and keyboard**

- A horizontal drag spins the globe; vertical pointer motion is ignored.
- A released drag flings and decays (τ ≈ 0.35 s).
- ← / → step the globe when the container has focus.

**What it sets on an interactive container (all restored on disable / dispose)**

- `tabindex="0"`, if none is set;
- `aria-label`, if none is set;
- `cursor: grab`, `user-select: none`;
- `touch-action: pan-y`, so a vertical swipe over a globe still scrolls the page on touch devices.

**Idle rotation**

- Slow horizontal spin, one turn a minute.
- Any press, drag or key step stops it at once.
- It eases back in 3 s after the last interaction or fling settles, and reaches full speed 1.5 s later.
- `setYaw` / `lookAt` also restart the 3 s wait.

**Reduced motion**

- With `prefers-reduced-motion: reduce`: no idle spin, no fling, and animated turns jump instantly.
- **Manual horizontal dragging still works.**
- The media query is live: changing the OS setting takes effect immediately.

**Resize and DPR**

- Automatic. Each frame the renderer re-reads its stage size (ResizeObserver) and each container's rectangle, so layout
  changes, scrolling and window resizes need no call.
- Use `view.resize()` only if you change a size and need the globe correct in the same task.
- The canvas buffer is CSS size × min(devicePixelRatio, 2).
- A portrait box fits the globe to its width, so it never overflows.

## 8. Lifecycle

- `view.dispose()` does all of the following:
  - stops its loop;
  - removes every listener it added (container, media query);
  - restores the container's attributes and styles exactly;
  - frees its texture and material;
  - if it owns its renderer, also disposes the WebGL renderer, loses the context and removes the canvas.
- `renderer.dispose()` disposes every view still attached to it, then the shared geometry, context, canvas, loop and
  observer.
- Both calls are idempotent. A disposed view can't be revived; make a new one.
- **Dispose when a screen goes away.** QA B13/B14 shows that 30 standalone and 10 nine-view create/destroy cycles leave
  listeners, observers and live contexts at their baseline, with a flat JS heap.
- Views are independent: no shared mutable state and no singletons (QA B15). The shared sphere geometry is never modified.

## 9. Nine globes at once (the 3×3 planet grid): use ONE renderer

**Recommendation: one `PlanetSphereRenderer` per screen, one `PlanetSphereView` per cell.** Don't create nine standalone
views.

```js
import { PlanetSphereView, PlanetSphereRenderer } from "./resources/planet-sphere/planet-sphere-view.js";
const stage = document.querySelector(".planet-grid");             // contains all nine cells
const host = new PlanetSphereRenderer(stage);                      // one WebGL context, canvas laid over the stage
const views = cells.map((cell, i) => new PlanetSphereView(cell.querySelector(".globe"), {
  renderer: host, planet: planets[i].planet, render: planets[i].render, yaw: i * 0.7 }));
// leaving the screen:
host.dispose();                                                    // disposes all nine views too
```

How it works: the renderer lays one transparent canvas over `stage` and draws each view into its own container's rectangle
(viewport + scissor). It shares one compiled shader program and one sphere geometry, and runs one `requestAnimationFrame`
loop. Pointer input comes from each cell's container, so dragging one cell spins only that globe (QA G4).

Why not nine contexts:

- Browsers cap live WebGL contexts per page (Chrome evicts the oldest past ~16; mobile Safari is tighter).
- Each context compiles its own shaders and uploads its own geometry.
- Transitions that briefly double the views can push past the cap and **silently lose a globe**.

Measured (QA G7, headless SwiftShader):

| | contexts | shader programs | create nine views | nine globes spinning: mean frame |
|---|---|---|---|---|
| shared renderer | **1** | **1** | ~44 ms | ~50 ms (software GL) |
| nine standalone views | 9 | 9 | ~111 ms | ~52 ms, p95 ~67 ms |

GPU timings are in `docs/evidence/bloom-027d/REPORT.md`.

Rules of the shared canvas:

- **Containers must sit inside `stage`.** Their rectangles are measured each frame, so scrolling, reflow and phone-width
  resizes need no calls (QA G5).
- **The canvas is the stage's first child,** with `position: absolute; inset: 0; pointer-events: none` (the stage becomes
  `position: relative` if it was static). It paints above unpositioned content in the stage. Its background is
  transparent, so captions and cards show through everywhere except on the globes themselves.
  - Give overlapping UI (badges, tooltips) `position: relative; z-index: 1`.
  - Or set `host.domElement.style.zIndex` to suit your layout.
- **CSS on a cell does not reach its globe pixels.** The globes are drawn on the shared canvas, so `opacity`, `filter`,
  `clip-path` or `visibility: hidden` on a cell leave its globe untouched.
  - To hide one globe, use `display: none` on its container (a zero-size box is skipped) or `setPlanet(null)`.
  - To fade the whole grid, fade the stage.
  - CSS **scale and translate** transforms on a cell, or on the whole stage, *are* followed for drawing and picking, so a
    grid → focus zoom can animate a cell's `transform` (QA G5b). Rotations are not supported.
- **Focused planet view.** Use either a larger container on the same renderer, or a standalone view on a screen that has no
  grid. Keep it to one renderer per visible screen.
- **Off-screen cells cost nothing:** a box outside the viewport is not drawn.

## 10. Performance notes

- **Render on demand.** A frame is drawn only when a yaw, size or texture changed. A still globe, or nine still globes,
  costs 0 GPU frames (QA B7, G3); idle rotation draws every frame.
  - For a calm grid, consider `autoRotate: false` on the cells and idle spin only on a focused planet.
  - Under reduced motion nothing spins anyway.
- **Per globe:**
  - texture: 480×240 RGBA with mipmaps, ~0.6 MB of GPU memory;
  - geometry: 16 128 triangles, shared;
  - draw calls: 1;
  - pick: ~0.7 ms;
  - `setPlanet` with a change: ~3 ms.
- **Planet generation costs far more than the globe.**
  - A validated world (`BLOOM.generateFromArchetype`) takes ~0.4–0.6 s each in Node.
  - A raw attempt (`BLOOM.archetype.attemptPlanet`, what `index.html` already uses for previews) takes 4–30 ms.
  - Never validate just to show a globe. Generate outside animation frames and reuse the planet you'll play.
- **Graceful `file://` degradation,** if the PMO chooses it (§3):

  ```js
  try { const { PlanetSphereView } = await import("./resources/planet-sphere/planet-sphere-view.js"); /* globe */ }
  catch { /* keep the existing 2D mini-map preview */ }
  ```

## 11. Known limitations (accepted or out of scope)

- **Polar rows.** Rows 0–2 and 37–39 are never on screen at the default distance, and a few Ocean worlds have a whole
  section up there. Accepted: the globe is decorative.
- **First Bloom is a legacy rectangle.**
  - The generator's cylindrical topology (BLOOM-027B) applies to generated worlds only. First Bloom's authored layout has a
    real map edge at longitude zero, where all 40 rows change section.
  - On a spinning globe that edge shows as a straight north–south line (evidence `07-first-bloom-rectangle-cut-centred.png`).
  - Fixing it is a topology or content decision, outside this component. Until then, start First Bloom at `yaw: 0` (map
    centre); the edge is then on the far side.
- **60×40 on a 2:1 texture.** Tiles are ~1.33:1 at the equator. Accepted in 027C; not revisited.
- **Untested here:** Safari/WebKit (Chromium and Firefox are covered). Test on the classroom devices before release.
- **WebGL context loss** is left to Three.js's own handling. No custom restore path.
- **No transition API.** The cloud / atmosphere transition is a separate primitive that sits *over* the globe. It must not
  be added to PlanetSphereView.
