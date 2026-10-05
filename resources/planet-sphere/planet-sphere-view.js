// BLOOM — PlanetSphereView: a reusable, screen-agnostic Three.js globe of one BLOOM planet (BLOOM-027D production component;
// grown from the 027C-validated spike). Integration guide: docs/PLANET_SPHERE_VIEW_v1.md.
//
//   import { PlanetSphereView, PlanetSphereRenderer } from "<repo>/resources/planet-sphere/planet-sphere-view.js";
//
//   const view = new PlanetSphereView(container, { planet, render });  // one globe, its own WebGL canvas inside `container`
//   view.setPlanet(planet, { render })     // draw + upload the texture (only when what it draws actually changed)
//   view.setAutoRotate(on)  view.setInteractionEnabled(on)  view.setYaw(rad) / getYaw()  view.lookAt(u)
//   view.resize()  view.dispose()
//
//   const host = new PlanetSphereRenderer(stage);                      // many globes, ONE WebGL context
//   new PlanetSphereView(cell, { renderer: host, planet });            // drawn into `cell`'s rectangle (viewport + scissor)
//
// A PRESENTATION of the planet, not a gameplay map: it renders the starting surface of the authoritative planet data and runs
// no simulation; it owns no navigation, menu, scenario, tutorial or transition state. The 2D map stays the gameplay surface.
//
// YAW ONLY (owner decision, validated in 027C): the globe spins about its fixed vertical axis and nothing else. Horizontal
// drag, ← / →, fling, idle spin, setYaw and lookAt move yaw; there is no pitch, no roll, no camera orbit and no view over the
// poles — the mesh's only rotation is about Y, by construction. Extreme map rows that never face the camera are accepted.
//
// Rendering: every view belongs to a PlanetSphereRenderer (a view made without one creates a private one inside its container
// and disposes it with itself). The renderer owns the WebGL context, one canvas laid over its stage element, one shared
// sphere geometry and one requestAnimationFrame loop; it draws only on frames where something changed (orientation, size,
// texture), so a still globe costs no GPU work. Pointer input is read from each view's container, never from the canvas.
import * as THREE from "./vendor/three-0.185.1/three.module.min.js";
import { drawPlanetTexture, texturePlanet, textureSize, textureSignature, regionAtUV, DEFAULT_TEXTURE_WIDTH } from "./planet-texture.js";

const TAU = Math.PI * 2;
const YAW0 = -Math.PI / 2;               // mesh rotation at yaw 0: map centre (u = 0.5) faces the camera
const wrapPi = a => a - TAU * Math.floor((a + Math.PI) / TAU);
const smoothstep = t => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const MIN_DISTANCE = 1.45, MAX_DISTANCE = 6;

/**
 * Owns one WebGL context and draws any number of PlanetSphereViews into it. Its canvas is laid over `stage`
 * (position: absolute, inset 0, pointer-events: none) and each view is drawn into its own container's rectangle, so the
 * containers must sit inside `stage`. One context, one compiled shader program and one sphere geometry for all of them.
 */
export class PlanetSphereRenderer {
  constructor(stage, { maxDpr = 2, antialias = true } = {}) {
    if (!stage || typeof stage.appendChild !== "function") throw new TypeError("PlanetSphereRenderer: stage must be a DOM element");
    this.stage = stage; this.maxDpr = maxDpr; this.views = []; this.disposed = false;
    this.frames = 0; this.renders = 0; // loop ticks / frames that actually drew (debug + QA)
    const r = this.three = new THREE.WebGLRenderer({ antialias, alpha: true, powerPreference: "low-power" });
    r.autoClear = false; r.setClearColor(0x000000, 0);
    const el = this.domElement = r.domElement;
    el.className = "planet-sphere-canvas"; el.setAttribute("aria-hidden", "true");
    Object.assign(el.style, { position: "absolute", left: "0", top: "0", width: "100%", height: "100%", display: "block", pointerEvents: "none" });
    this._stagePosition = null;
    if (getComputedStyle(stage).position === "static") { this._stagePosition = stage.style.position; stage.style.position = "relative"; }
    stage.insertBefore(el, stage.firstChild);
    this.geometry = new THREE.SphereGeometry(1, 128, 64); // shared by every view, never modified
    this._size = null; this._sizeStale = true; this._dirty = true;
    if (typeof ResizeObserver === "function") { this._ro = new ResizeObserver(() => { this._sizeStale = true; }); this._ro.observe(stage); }
    else { this._onWindowResize = () => { this._sizeStale = true; }; window.addEventListener("resize", this._onWindowResize); }
    this._fit();
    this._last = performance.now();
    this._frame = this._frame.bind(this);
    this._raf = requestAnimationFrame(this._frame);
  }

  /** Re-measure the stage and every view now (also happens by itself on the next frame after any size change). */
  resize() { if (this.disposed) return; this._fit(); this._placeAll(); this._dirty = true; }

  /** Draw every visible view now (normally the loop does this on frames where something changed). */
  render() {
    if (this.disposed) return;
    const r = this.three, H = this._size.h;
    this._dirty = false;
    r.setScissorTest(false); r.setClearColor(0x000000, 0); r.clear();
    for (const v of this.views) {
      const b = v._box; if (!b || !b.visible || !v._globe) continue;
      const y = H - b.y - b.h; // GL origin is bottom-left; three scales CSS px by the pixel ratio
      r.setViewport(b.x, y, b.w, b.h); r.setScissor(b.x, y, b.w, b.h); r.setScissorTest(true);
      if (v.background !== null) { r.setClearColor(v.background, 1); r.clear(); }
      v._applyOrientation(); r.render(v.scene, v.camera);
    }
    r.setScissorTest(false);
    this.renders++;
  }

  /** Dispose every view still attached, then the geometry, the WebGL context, the canvas, the loop and the listeners. */
  dispose() {
    if (this.disposed) return;
    this.disposed = true; // first, so a view that owns this renderer does not dispose it again from inside the loop below
    for (const v of this.views.slice()) v.dispose();
    cancelAnimationFrame(this._raf);
    if (this._ro) this._ro.disconnect(); else window.removeEventListener("resize", this._onWindowResize);
    this.geometry.dispose();
    this.memoryAfterDispose = { ...this.three.info.memory };
    this.three.dispose(); this.three.forceContextLoss();
    this.domElement.remove();
    if (this._stagePosition !== null) this.stage.style.position = this._stagePosition;
  }

  // ---------------------------------------------------------------- internals
  _add(view) { this.views.push(view); this._dirty = true; }
  _remove(view) { const i = this.views.indexOf(view); if (i >= 0) this.views.splice(i, 1); this._dirty = true; }
  _dpr() { return Math.min(this.maxDpr, window.devicePixelRatio || 1); }

  _fit() {
    const w = Math.max(1, this.stage.clientWidth), h = Math.max(1, this.stage.clientHeight), dpr = this._dpr(), s = this._size;
    if (!s || s.w !== w || s.h !== h || s.dpr !== dpr) {
      this.three.setPixelRatio(dpr); this.three.setSize(w, h, false); // CSS keeps the canvas at 100% × 100%; buffer = CSS × capped DPR
      this._size = { w, h, dpr }; this._dirty = true;
    }
    this._sizeStale = false;
  }

  _placeAll() { const sr = this.stage.getBoundingClientRect(); let changed = false; for (const v of this.views) if (v._place(sr)) changed = true; return changed; }

  _frame(now) {
    if (this.disposed) return;
    this._raf = requestAnimationFrame(this._frame);
    const dt = Math.min(0.05, Math.max(0, (now - this._last) / 1000)); this._last = now;
    this.frames++;
    if (this._sizeStale || this._dpr() !== this._size.dpr) this._fit();
    let dirty = this._dirty;
    for (const v of this.views) if (v._step(now, dt)) dirty = true;
    if (this._placeAll()) dirty = true;
    if (dirty) this.render();
  }
}

/**
 * One BLOOM planet on a yaw-only globe, drawn into `container` (any element with a size; it is never queried by id).
 * Options (all optional):
 *   planet, render, layout   the planet (see setPlanet) — may also be set later
 *   renderer                 a shared PlanetSphereRenderer; omitted = this view owns one inside `container`
 *   autoRotate = true        idle spin after `idleDelayMs` without interaction (never under prefers-reduced-motion)
 *   interactive = true       horizontal drag / ← → spin the globe
 *   reducedMotion = null     null follows the prefers-reduced-motion media query; true / false force it
 *   yaw = 0                  starting yaw (rad); 0 = map centre facing the camera
 *   distance = 4.2           camera distance in globe radii (1.45 … 6); wheelZoom = false lets the wheel change it
 *   background = null        null = transparent; a colour fills this view's rectangle
 *   textureWidth = 480       target texture width (2:1, whole pixels per tile); maxDpr = 2 (own renderer only)
 *   idleDelayMs = 3000, idleRampMs = 1500, idleSpeed = 2π/60 rad/s (one turn a minute)
 *   onInteractionStart(view), onInteractionEnd(view)   a drag (or key step) began / ended
 *   ariaLabel                accessible name set on an interactive container that has none
 */
export class PlanetSphereView {
  constructor(container, {
    planet = null, render = null, layout = null, renderer = null,
    autoRotate = true, interactive = true, reducedMotion = null, yaw = 0,
    distance = 4.2, wheelZoom = false, background = null, textureWidth = DEFAULT_TEXTURE_WIDTH, maxDpr = 2,
    idleDelayMs = 3000, idleRampMs = 1500, idleSpeed = TAU / 60,
    onInteractionStart = null, onInteractionEnd = null,
    ariaLabel = "Planet globe: drag sideways or press the left and right arrow keys to spin it",
  } = {}) {
    if (!container || typeof container.getBoundingClientRect !== "function") throw new TypeError("PlanetSphereView: container must be a DOM element");
    if (renderer && !(renderer instanceof PlanetSphereRenderer)) throw new TypeError("PlanetSphereView: renderer must be a PlanetSphereRenderer");
    if (renderer && renderer.disposed) throw new Error("PlanetSphereView: renderer is disposed");
    this.container = container;
    this.opts = { idleDelayMs, idleRampMs, idleSpeed, wheelZoom, textureWidth, ariaLabel };
    this.onInteractionStart = onInteractionStart; this.onInteractionEnd = onInteractionEnd;
    this.background = background === null || background === undefined ? null : new THREE.Color(background);
    this.autoRotatePref = !!autoRotate; this.forcedReducedMotion = reducedMotion;
    this.mq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
    this.ownsRenderer = !renderer;
    this.renderer = renderer || new PlanetSphereRenderer(container, { maxDpr });

    // ---- scene (per view: own camera, lights, material, texture; the geometry is the renderer's)
    this.scene = new THREE.Scene();
    this.baseFov = 35; this.camera = new THREE.PerspectiveCamera(this.baseFov, 1, 0.1, 50);
    this.distance = THREE.MathUtils.clamp(distance, MIN_DISTANCE, MAX_DISTANCE); this.camera.position.set(0, 0, this.distance);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.95));
    const sun = new THREE.DirectionalLight(0xffffff, 0.85); sun.position.set(-2.5, 1.6, 3); this.scene.add(sun);
    this._canvas = document.createElement("canvas"); // this view's texture source (never a gameplay canvas)
    this._globe = null; this.texture = null; this.material = null;
    this.planet = null; this._signature = null; this.textureUploads = 0;

    // ---- orientation (yaw only)
    this.yaw = this.targetYaw = +yaw || 0;
    this.vYaw = 0;                                // fling velocity (rad/s) after release
    this.idleFactor = 0; this.interacting = false; this.anim = null;
    this.lastInteraction = performance.now() - idleDelayMs; // idle spin ramps in from creation instead of starting at full speed
    this._box = null; this.radiusPx = 1; this.disposed = false;
    this.raycaster = new THREE.Raycaster(); this._ndc = new THREE.Vector2(); this._unitSphere = new THREE.Sphere(new THREE.Vector3(), 1);

    this._listeners = []; this._saved = null; this.interactive = false;
    if (this.mq) this._on(this.mq, "change", () => { if (this.reducedMotion) { this.idleFactor = 0; this.vYaw = 0; this.anim = null; } });
    this._bindPointer();
    this.setInteractionEnabled(interactive);
    this.renderer._add(this);
    this._place(this.renderer.stage.getBoundingClientRect());
    if (planet) this.setPlanet(planet, { render, layout });
  }

  // ---------------------------------------------------------------- public
  get reducedMotion() { return this.forcedReducedMotion ?? !!(this.mq && this.mq.matches); }
  get autoRotateActive() { return this.autoRotatePref && !this.reducedMotion; }

  /**
   * Show a planet: a generated planet (has a tilemap) or an authored one (layout resolved by BLOOM.resolveLayout).
   * `render` = the archetype's render hints (BLOOM_DATA.archetypes[…].render) or null. `diagnostics` = developer overlays
   * (see planet-texture.js). The texture is redrawn and uploaded ONLY when what it draws changed; orientation is kept.
   * setPlanet(null) hides the globe.
   */
  setPlanet(planet, { render = null, layout = null, diagnostics = null } = {}) {
    if (this.disposed) return this;
    if (!planet) { this.planet = null; this._signature = null; if (this._globe) this._globe.visible = false; this.renderer._dirty = true; return this; }
    const tp = texturePlanet(planet, layout), size = textureSize(tp.gridWidth, tp.gridHeight, this.opts.textureWidth);
    const sig = textureSignature(tp, { render, diag: diagnostics, width: size.width });
    this.planet = tp;
    if (sig !== this._signature) {
      const resized = this._canvas.width !== size.width || this._canvas.height !== size.height;
      drawPlanetTexture(this._canvas, tp, { render, width: size.width, height: size.height, diag: diagnostics });
      if (!this.texture || resized) this._makeGlobe(); else this.texture.needsUpdate = true;
      this.textureUploads++; this._signature = sig;
    }
    this._globe.visible = true; this.renderer._dirty = true;
    return this;
  }

  setAutoRotate(on) { this.autoRotatePref = !!on; if (!on) this.idleFactor = 0; return this; }

  setInteractionEnabled(on) {
    on = !!on; if (this.disposed || on === this.interactive) return this;
    if (!on) this._endDrag(null);
    this.interactive = on;
    const c = this.container;
    if (on) {
      this._saved = { touchAction: c.style.touchAction, cursor: c.style.cursor, userSelect: c.style.userSelect,
        tabindex: c.getAttribute("tabindex"), ariaLabel: c.getAttribute("aria-label") };
      Object.assign(c.style, { touchAction: "pan-y", cursor: "grab", userSelect: "none" }); // vertical swipes still scroll the page
      if (this._saved.tabindex === null) c.tabIndex = 0;
      if (this._saved.ariaLabel === null && this.opts.ariaLabel) c.setAttribute("aria-label", this.opts.ariaLabel);
    } else this._restoreContainer();
    return this;
  }

  /** Yaw in radians; 0 = map centre facing the camera, positive spins the surface eastward (as a rightward drag does). */
  getYaw() { return this.yaw; }
  setYaw(yaw, { animate = false } = {}) {
    if (this.disposed || !Number.isFinite(yaw)) return this;
    this.vYaw = 0;
    if (!animate || this.reducedMotion) { this.yaw = this.targetYaw = yaw; this.anim = null; this.renderer._dirty = true; }
    else this.anim = { t0: performance.now(), dur: 700, y0: this.yaw, y1: yaw };
    this.lastInteraction = performance.now(); // a programmatic turn also restarts the idle delay
    return this;
  }
  /** Turn (the shortest way round) so map longitude u (0 … 1, 0.5 = map centre) faces the camera. */
  lookAt(u, opts) { return this.setYaw(this.yaw + wrapPi(TAU * (0.5 - u) - this.yaw), opts); }
  /** Map longitude u currently facing the camera. */
  centerU() { return (((0.5 - this.yaw / TAU) % 1) + 1) % 1; }

  /** Camera distance in globe radii (framing; clamped 1.45 … 6). */
  setDistance(d) { this.distance = THREE.MathUtils.clamp(+d || 4.2, MIN_DISTANCE, MAX_DISTANCE); this.camera.position.z = this.distance; this._measure(); this.renderer._dirty = true; return this; }

  /** Re-measure after a layout change the renderer cannot observe (it re-measures by itself every frame otherwise). */
  resize() { if (!this.disposed) this.renderer.resize(); return this; }

  /**
   * Optional hover / pick helper (not a gameplay selector): the planet point under a client position, or null.
   * → { uv: {u, v}, point, distance, analytic?, region } with region from regionAtUV on the authoritative tilemap.
   * Mesh raycast first; when a ray lands exactly on the u = 0 ≡ 1 seam edge (SphereGeometry's seam vertices differ by ~1e-16,
   * so it can slip between the two seam triangles) the analytic ray–sphere hit is used (027C). Matrices are brought up to
   * date first, so a pick between a yaw / zoom change and the next frame sees the current view (027C).
   */
  pickAt(clientX, clientY, { forceAnalytic = false } = {}) {
    if (this.disposed || !this._globe || !this._globe.visible) return null;
    const b = this._clientBox(); // the globe's box as it appears on screen (CSS scale transforms included)
    if (!b.width || !b.height || clientX < b.left || clientX > b.left + b.width || clientY < b.top || clientY > b.top + b.height) return null;
    this._place(this.renderer.stage.getBoundingClientRect()); // the camera aspect of the current layout, even between frames
    this._ndc.set(((clientX - b.left) / b.width) * 2 - 1, -((clientY - b.top) / b.height) * 2 + 1);
    this._applyOrientation(); this.scene.updateMatrixWorld(); this.camera.updateMatrixWorld(); // the camera is not in the scene graph
    this.raycaster.setFromCamera(this._ndc, this.camera);
    const hit = forceAnalytic ? null : this.raycaster.intersectObject(this._globe, false)[0];
    let res;
    if (hit && hit.uv) res = { uv: { u: hit.uv.x, v: hit.uv.y }, point: hit.point.toArray(), distance: hit.distance };
    else {
      const p = this.raycaster.ray.intersectSphere(this._unitSphere, new THREE.Vector3());
      if (!p) return null;
      const l = this._globe.worldToLocal(p.clone()), phi = Math.atan2(l.z, -l.x);
      res = { uv: { u: (phi < 0 ? phi + TAU : phi) / TAU, v: 1 - Math.acos(THREE.MathUtils.clamp(l.y, -1, 1)) / Math.PI },
        point: p.toArray(), distance: p.distanceTo(this.raycaster.ray.origin), analytic: true };
    }
    res.region = this.planet ? regionAtUV(this.planet, res.uv.u, res.uv.v) : null;
    return res;
  }

  /** Snapshot for debug readouts and QA (not needed by consumers). */
  state() {
    const now = performance.now(), wait = this.interacting ? null : Math.max(0, this.lastInteraction + this.opts.idleDelayMs - now);
    const q = this._globe ? this._globe.quaternion : null, R = this.renderer, sz = R.disposed ? null : R.three.getDrawingBufferSize(new THREE.Vector2());
    return { yaw: this.yaw, pitch: 0, roll: 0, yawOnly: true, centerU: this.centerU(), quaternion: q ? q.toArray() : null,
      interacting: this.interacting, interactive: this.interactive, idleFactor: this.idleFactor,
      autoRotate: this.autoRotateActive, autoRotatePref: this.autoRotatePref, reducedMotion: this.reducedMotion,
      idleResumesInMs: this.autoRotateActive && wait !== null && wait > 0 ? wait : 0,
      textureUploads: this.textureUploads, textureVersion: this.texture ? this.texture.version : 0, textureSignature: this._signature,
      textureWidth: this._canvas.width, textureHeight: this._canvas.height,
      box: this._box && { ...this._box }, distance: this.distance, globeRadiusPx: this.radiusPx, cameraAspect: this.camera.aspect,
      sharedRenderer: !this.ownsRenderer, rendererFrames: R.frames, rendererRenders: R.renders,
      bufferWidth: sz ? sz.x : 0, bufferHeight: sz ? sz.y : 0, pixelRatio: R.disposed ? 0 : R.three.getPixelRatio(), deviceDpr: window.devicePixelRatio || 1,
      memory: R.disposed ? null : { ...R.three.info.memory }, programs: R.disposed ? null : R.three.info.programs.length, disposed: this.disposed };
  }

  /** Stop, remove every listener, restore the container, free this view's texture / material; an owned renderer goes too. */
  dispose() {
    if (this.disposed) return;
    this._endDrag(null);
    this._restoreContainer();
    for (const [t, type, fn, o] of this._listeners) t.removeEventListener(type, fn, o);
    this._listeners = [];
    this.disposed = true;
    this.renderer._remove(this);
    if (this._globe) { this.scene.remove(this._globe); this._globe = null; }
    if (this.material) this.material.dispose();
    if (this.texture) this.texture.dispose();
    this.material = this.texture = null;
    this._canvas.width = this._canvas.height = 0; // release the 2D backing store now
    if (this.ownsRenderer) this.renderer.dispose();
    this.onInteractionStart = this.onInteractionEnd = null;
  }

  // ---------------------------------------------------------------- internals
  _on(t, type, fn, o) { t.addEventListener(type, fn, o); this._listeners.push([t, type, fn, o]); }

  _makeGlobe() {
    if (this._globe) this.scene.remove(this._globe);
    if (this.texture) this.texture.dispose();
    const tex = this.texture = new THREE.CanvasTexture(this._canvas); // the constructor flags the first upload
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;                 // u = 0 ≡ 1: filtering / mip sampling wraps round the globe, not clamps
    tex.magFilter = THREE.NearestFilter;              // crisp BLOOM tiles up close
    tex.minFilter = THREE.LinearMipmapLinearFilter;   // small globes (a planet grid) stay smooth
    tex.anisotropy = Math.min(8, this.renderer.three.capabilities.getMaxAnisotropy());
    if (this.material) { this.material.map = tex; this.material.needsUpdate = true; }
    else this.material = new THREE.MeshLambertMaterial({ map: tex });
    this._globe = new THREE.Mesh(this.renderer.geometry, this.material);
    this.scene.add(this._globe);
  }

  _restoreContainer() {
    const s = this._saved, c = this.container; if (!s) return;
    Object.assign(c.style, { touchAction: s.touchAction, cursor: s.cursor, userSelect: s.userSelect });
    if (s.tabindex === null) c.removeAttribute("tabindex"); else c.setAttribute("tabindex", s.tabindex);
    if (s.ariaLabel === null) c.removeAttribute("aria-label"); else c.setAttribute("aria-label", s.ariaLabel);
    this._saved = null;
  }

  _touch() { this.lastInteraction = performance.now(); this.idleFactor = 0; } // any interaction stops idle spin at once

  _bindPointer() {
    const el = this.container;
    let last = null, samples = [], pointerId = null;
    this._on(el, "pointerdown", e => {
      if (!this.interactive || e.button !== 0 || this.interacting) return;
      pointerId = e.pointerId;
      try { el.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ }
      el.style.cursor = "grabbing";
      this.interacting = true; this.anim = null; this.vYaw = 0; this._touch();
      last = e.clientX; samples = [{ t: performance.now(), yaw: this.targetYaw }];
      if (this.onInteractionStart) this.onInteractionStart(this);
    });
    this._on(el, "pointermove", e => {
      if (!this.interacting || e.pointerId !== pointerId) return;
      this.targetYaw += (e.clientX - last) / Math.max(40, this.radiusPx); // a surface point at the centre follows the pointer; vertical motion is ignored
      last = e.clientX; this._touch();
      const t = performance.now(); samples.push({ t, yaw: this.targetYaw }); while (samples.length > 2 && t - samples[0].t > 100) samples.shift();
    });
    const end = e => {
      if (!this.interacting || e.pointerId !== pointerId) return;
      const t = performance.now(), recent = samples.filter(s => t - s.t <= 100);
      if (!this.reducedMotion && recent.length >= 2) { // fling from the last 100 ms of movement (none under reduced motion)
        const a = recent[0], b = recent[recent.length - 1], dt = Math.max(16, b.t - a.t) / 1000;
        this.vYaw = THREE.MathUtils.clamp((b.yaw - a.yaw) / dt, -6, 6);
      }
      this._endDrag(e);
    };
    this._endDrag = e => {
      if (!this.interacting) return;
      this.interacting = false; last = null; this._touch();
      if (this.interactive) el.style.cursor = "grab";
      if (pointerId !== null) { try { el.releasePointerCapture(pointerId); } catch { /* already released */ } }
      pointerId = null;
      if (this.onInteractionEnd) this.onInteractionEnd(this);
    };
    this._on(el, "pointerup", end); this._on(el, "pointercancel", end); this._on(el, "lostpointercapture", end);
    this._on(el, "keydown", e => {
      const d = { ArrowLeft: -0.12, ArrowRight: 0.12 }[e.key]; // ↑ / ↓ do nothing: yaw only
      if (!this.interactive || !d || this.interacting) return;
      e.preventDefault(); this.anim = null; this.vYaw = 0; this._touch(); this.targetYaw += d;
      if (this.onInteractionStart) this.onInteractionStart(this);
      if (this.onInteractionEnd) this.onInteractionEnd(this);
    });
    this._on(el, "wheel", e => {
      if (!this.interactive || !this.opts.wheelZoom) return;
      e.preventDefault(); this._touch(); this.setDistance(this.distance * Math.exp(e.deltaY * 0.0012));
    }, { passive: false });
  }

  _applyOrientation() { if (this._globe) this._globe.rotation.set(0, this.yaw + YAW0, 0); } // the ONLY rotation: about the vertical axis

  /** The container's padding box in client px, as drawn on screen (follows CSS scale / translate transforms, not rotation). */
  _clientBox() {
    const c = this.container, r = c.getBoundingClientRect(), sx = c.offsetWidth ? r.width / c.offsetWidth : 1, sy = c.offsetHeight ? r.height / c.offsetHeight : 1;
    return { left: r.left + c.clientLeft * sx, top: r.top + c.clientTop * sy, width: c.clientWidth * sx, height: c.clientHeight * sy, rect: r };
  }

  /** Container box in the stage's own (untransformed) CSS px — the units of the renderer's viewport; true when it changed. */
  _place(stageRect) {
    const st = this.renderer.stage, cb = this._clientBox(), r = cb.rect;
    const kx = st.offsetWidth ? stageRect.width / st.offsetWidth : 1, ky = st.offsetHeight ? stageRect.height / st.offsetHeight : 1; // the stage's own scale
    const x = Math.round((cb.left - stageRect.left) / kx - st.clientLeft), y = Math.round((cb.top - stageRect.top) / ky - st.clientTop);
    const w = Math.round(cb.width / kx), h = Math.round(cb.height / ky), sw = st.clientWidth, sh = st.clientHeight;
    const visible = w > 0 && h > 0 && x < sw && y < sh && x + w > 0 && y + h > 0 && r.bottom > 0 && r.top < window.innerHeight && r.right > 0 && r.left < window.innerWidth;
    if (cb.height !== this._screenH) { this._screenH = cb.height; this._measure(); } // e.g. a transform scaled the container
    const b = this._box;
    if (b && b.x === x && b.y === y && b.w === w && b.h === h && b.visible === visible) return false;
    this._box = { x, y, w, h, visible };
    if (w > 0 && h > 0) {
      // portrait boxes fit the globe to the WIDTH (same horizontal field as the landscape vertical field), so it never overflows
      this.camera.aspect = w / h;
      this.camera.fov = w >= h ? this.baseFov : THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(this.baseFov) / 2) / this.camera.aspect));
      this.camera.updateProjectionMatrix(); this._measure();
    }
    return true;
  }

  _measure() { // on-screen globe radius in client px (drag scaling: a surface point at the centre follows the pointer)
    const fov = THREE.MathUtils.degToRad(this.camera.fov), d = this.distance, h = this._screenH || (this._box ? this._box.h : 1);
    this.radiusPx = (h / 2) * (1 / Math.sqrt(d * d - 1)) / Math.tan(fov / 2);
  }

  /** Advance yaw by one frame; returns true when the globe has to be redrawn. */
  _step(now, dt) {
    const y0 = this.yaw;
    if (this.anim) { // setYaw / lookAt tween (yaw only)
      const a = this.anim, k = smoothstep((now - a.t0) / a.dur);
      this.yaw = this.targetYaw = a.y0 + (a.y1 - a.y0) * k;
      this.lastInteraction = now;
      if (k >= 1) this.anim = null;
    } else {
      if (!this.interacting && this.vYaw) { // fling decays (τ ≈ 0.35 s)
        this.targetYaw += this.vYaw * dt;
        this.vYaw *= Math.exp(-dt / 0.35);
        if (Math.abs(this.vYaw) < 0.01) this.vYaw = 0;
        else this.lastInteraction = now; // the idle delay counts from when the fling has settled
      }
      // idle spin: only when untouched for idleDelayMs; ramps in gently (smoothstep over idleRampMs)
      if (this.autoRotateActive && !this.interacting) {
        const since = now - this.lastInteraction - this.opts.idleDelayMs;
        this.idleFactor = since > 0 ? smoothstep(since / this.opts.idleRampMs) : 0;
        if (this.idleFactor > 0) this.targetYaw += this.opts.idleSpeed * this.idleFactor * dt;
      } else this.idleFactor = 0;
      const gap = this.targetYaw - this.yaw; // weighted drag: the globe eases toward the pointer target (τ ≈ 90 ms)
      this.yaw = Math.abs(gap) < 1e-5 ? this.targetYaw : this.yaw + gap * (1 - Math.exp(-dt / 0.09));
    }
    if (Math.abs(this.yaw) > 1e4) { const w = TAU * Math.round(this.yaw / TAU); this.yaw -= w; this.targetYaw -= w; } // keep floats small
    return this.yaw !== y0;
  }
}
