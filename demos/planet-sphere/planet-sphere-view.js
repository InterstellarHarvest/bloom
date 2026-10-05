// BLOOM — planet-sphere spike: a lightweight interactive Three.js globe for a 2:1 planet texture. PROTOTYPE ONLY.
//
//   const view = new PlanetSphereView(container, { textureCanvas });
//   view.textureChanged();            // after redrawing textureCanvas (the ONLY time the texture is re-uploaded)
//   view.pickAt(clientX, clientY)     // → { uv: {u, v}, point } | null   (closest sphere intersection, Three.js raycast)
//   view.lookAt(u, v, { instant })    // turn the globe so texture point (u, v) faces the camera
//   view.state()                      // orientation / idle / renderer numbers for the debug readout and QA
//   view.dispose()                    // stop the loop, remove listeners, free geometry/material/texture/renderer
//
// The globe is a renderer of the texture only: it knows nothing about BLOOM's simulation and runs none of it.
// Orientation = tilt group (pitch about X) ∘ spin group (yaw about Y); the camera stays on +Z. A texture point (u, v)
// faces the camera when yaw = π/2 − 2πu and pitch = latitude = (v − ½)·π.
// Rotation is our own (no OrbitControls): the globe turns, not the camera, so the light stays put, the idle spin is one
// number, and "is the user interacting" is exact. Drag is target-smoothed (τ ≈ 90 ms) with a decaying fling.
import * as THREE from "three";

const TAU = Math.PI * 2, HALF_PI = Math.PI / 2;
const wrapPi = a => a - TAU * Math.floor((a + Math.PI) / TAU);
const smoothstep = t => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

export class PlanetSphereView {
  constructor(container, {
    textureCanvas, idleDelayMs = 3000, idleRampMs = 1500, idleSpeed = TAU / 60, // one turn a minute
    maxDpr = 2, segments = [128, 64], autoRotate = true, reducedMotion = null, // null = follow the media query
  } = {}) {
    this.container = container;
    this.opts = { idleDelayMs, idleRampMs, idleSpeed, maxDpr };
    this.autoRotatePref = autoRotate;
    this.mq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
    this.forcedReducedMotion = reducedMotion;

    // ---- renderer / scene
    const r = this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "low-power" });
    r.setClearColor(0x0b0e14, 1);
    r.domElement.className = "sphere-canvas";
    r.domElement.tabIndex = 0;
    r.domElement.setAttribute("aria-label", "Planet globe — drag or use the arrow keys to rotate, scroll to zoom");
    Object.assign(r.domElement.style, { display: "block", width: "100%", height: "100%", touchAction: "none", outline: "none", cursor: "grab" });
    container.appendChild(r.domElement);
    this.scene = new THREE.Scene();
    this.baseFov = 35; this.camera = new THREE.PerspectiveCamera(this.baseFov, 1, 0.1, 50);
    this.distance = 4.2; this.camera.position.set(0, 0, this.distance);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.95));
    const sun = new THREE.DirectionalLight(0xffffff, 0.85); sun.position.set(-2.5, 1.6, 3); this.scene.add(sun);

    // ---- globe
    this.texture = new THREE.CanvasTexture(textureCanvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.magFilter = THREE.NearestFilter;        // crisp BLOOM tiles up close
    this.texture.minFilter = THREE.LinearMipmapLinearFilter;
    this.texture.anisotropy = Math.min(8, r.capabilities.getMaxAnisotropy());
    this.textureUploads = 1;                             // the CanvasTexture constructor flags the first upload
    this.geometry = new THREE.SphereGeometry(1, segments[0], segments[1]);
    this.litMaterial = new THREE.MeshLambertMaterial({ map: this.texture });
    this.flatMaterial = new THREE.MeshBasicMaterial({ map: this.texture });
    this.globe = new THREE.Mesh(this.geometry, this.litMaterial);
    this.spin = new THREE.Group(); this.tilt = new THREE.Group();
    this.spin.add(this.globe); this.tilt.add(this.spin); this.scene.add(this.tilt);

    // seam marker (debug overlay, off by default): the meridian where u = 0 meets u = 1, just above the surface
    const pts = []; for (let i = 0; i <= 96; i++) { const th = Math.PI * i / 96; pts.push(new THREE.Vector3(-1.004 * Math.sin(th), 1.004 * Math.cos(th), 0)); }
    this.seamGeometry = new THREE.BufferGeometry().setFromPoints(pts);
    this.seamMaterial = new THREE.LineDashedMaterial({ color: 0xff4fd8, dashSize: 0.04, gapSize: 0.025 });
    this.seamLine = new THREE.Line(this.seamGeometry, this.seamMaterial); this.seamLine.computeLineDistances();
    this.seamLine.visible = false; this.spin.add(this.seamLine);

    // ---- orientation state (front of the map, u = 0.5, faces the camera)
    this.yaw = this.targetYaw = HALF_PI - TAU * 0.5;
    this.pitch = this.targetPitch = 0.18;
    this.vYaw = 0; this.vPitch = 0;                      // fling velocity (rad/s) after release
    this.idleFactor = 0; this.interacting = false;
    this.lastInteraction = performance.now() - idleDelayMs; // idle spin ramps in from load instead of starting at full speed
    this.anim = null;                                    // preset-view tween
    this.frames = 0; this.orientationVersion = 0; this.lastTime = performance.now();
    this.raycaster = new THREE.Raycaster(); this.ndc = new THREE.Vector2();

    this._bind();
    this._resize();
    this._frame = this._frame.bind(this);
    this.raf = requestAnimationFrame(this._frame);
  }

  // ---------------------------------------------------------------- public
  get reducedMotion() { return this.forcedReducedMotion ?? !!(this.mq && this.mq.matches); }
  get autoRotateActive() { return this.autoRotatePref && !this.reducedMotion; }
  setAutoRotate(on) { this.autoRotatePref = !!on; if (!on) this.idleFactor = 0; }
  setSeamMarker(on) { this.seamLine.visible = !!on; }
  setUnlit(on) { this.globe.material = on ? this.flatMaterial : this.litMaterial; }
  /** Call after the texture canvas was redrawn. One upload per call, never per frame. */
  textureChanged() { this.texture.needsUpdate = true; this.textureUploads++; }

  pickAt(clientX, clientY) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return null;
    this.ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this._applyOrientation(); this.scene.updateMatrixWorld(); // pick what the current yaw/pitch shows, even between frames
    this.raycaster.setFromCamera(this.ndc, this.camera);
    const hit = this.raycaster.intersectObject(this.globe, false)[0]; // sorted: [0] is the closest intersection
    return hit && hit.uv ? { uv: { u: hit.uv.x, v: hit.uv.y }, point: hit.point.toArray(), distance: hit.distance } : null;
  }

  lookAt(u, v, { instant = false } = {}) {
    let yaw = HALF_PI - TAU * u; yaw = this.yaw + wrapPi(yaw - this.yaw); // shortest way round
    const pitch = THREE.MathUtils.clamp((v - 0.5) * Math.PI, -HALF_PI, HALF_PI);
    this._touch();
    this.vYaw = this.vPitch = 0;
    if (instant || this.reducedMotion) { this.yaw = this.targetYaw = yaw; this.pitch = this.targetPitch = pitch; this.anim = null; this.orientationVersion++; }
    else this.anim = { t0: performance.now(), dur: 700, y0: this.yaw, p0: this.pitch, y1: yaw, p1: pitch };
  }

  setZoom(distance) { this.distance = THREE.MathUtils.clamp(distance, 1.45, 6); this.camera.position.z = this.distance; this._measure(); this.orientationVersion++; }

  /** Which texture point faces the camera (analytic, from yaw/pitch). */
  centerUV() { const u = ((HALF_PI - this.yaw) / TAU % 1 + 1) % 1; return { u, v: this.pitch / Math.PI + 0.5 }; }

  state() {
    const c = this.centerUV(), sz = new THREE.Vector2(); this.renderer.getDrawingBufferSize(sz);
    const now = performance.now(), wait = this.interacting ? null : Math.max(0, this.lastInteraction + this.opts.idleDelayMs - now);
    return { yaw: this.yaw, pitch: this.pitch, quaternion: this.tilt.quaternion.clone().multiply(this.spin.quaternion).toArray(),
      centerU: c.u, centerV: c.v, interacting: this.interacting, idleFactor: this.idleFactor,
      autoRotate: this.autoRotateActive, autoRotatePref: this.autoRotatePref, reducedMotion: this.reducedMotion,
      idleResumesInMs: this.autoRotateActive && wait !== null && wait > 0 ? wait : 0,
      frames: this.frames, cpuFrameMs: this.cpuFrameMs, textureUploads: this.textureUploads, textureVersion: this.texture.version,
      cssWidth: this.cssW, cssHeight: this.cssH, bufferWidth: sz.x, bufferHeight: sz.y, pixelRatio: this.renderer.getPixelRatio(),
      deviceDpr: window.devicePixelRatio || 1, cameraAspect: this.camera.aspect, distance: this.distance, globeRadiusPx: this.radiusPx,
      textureWidth: this.texture.image.width, textureHeight: this.texture.image.height,
      memory: { ...this.renderer.info.memory }, disposed: !!this.disposed };
  }

  /** Render now and return the bounding box of non-background pixels (QA: the globe stays round after a resize). */
  globeBBox() {
    this.renderer.render(this.scene, this.camera);
    const gl = this.renderer.getContext(), w = gl.drawingBufferWidth, h = gl.drawingBufferHeight, px = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
    let x0 = w, y0 = h, x1 = -1, y1 = -1; // background is #0b0e14
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4;
      if (Math.abs(px[i] - 11) + Math.abs(px[i + 1] - 14) + Math.abs(px[i + 2] - 20) > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
    return x1 < 0 ? null : { width: x1 - x0 + 1, height: y1 - y0 + 1, bufferWidth: w, bufferHeight: h };
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this._unbind();
    this.geometry.dispose(); this.seamGeometry.dispose();
    this.litMaterial.dispose(); this.flatMaterial.dispose(); this.seamMaterial.dispose();
    this.texture.dispose();
    this.memoryAfterDispose = { ...this.renderer.info.memory };
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }

  // ---------------------------------------------------------------- internals
  _touch() { this.lastInteraction = performance.now(); this.idleFactor = 0; } // any interaction stops idle spin at once

  _bind() {
    const el = this.renderer.domElement, L = this._listeners = [];
    const on = (t, type, fn, o) => { t.addEventListener(type, fn, o); L.push([t, type, fn, o]); };
    let last = null, samples = [];
    on(el, "pointerdown", e => {
      if (e.button !== 0) return;
      el.setPointerCapture(e.pointerId); el.style.cursor = "grabbing"; el.focus({ preventScroll: true });
      this.interacting = true; this.anim = null; this.vYaw = this.vPitch = 0; this._touch();
      last = { x: e.clientX, y: e.clientY }; samples = [{ t: performance.now(), yaw: this.targetYaw, pitch: this.targetPitch }];
    });
    on(el, "pointermove", e => {
      this.hoverClient = { x: e.clientX, y: e.clientY }; this.hoverDirty = true;
      if (!this.interacting || !last) return;
      const k = 1 / Math.max(40, this.radiusPx); // a surface point at the centre follows the pointer
      this.targetYaw += (e.clientX - last.x) * k;
      this.targetPitch = THREE.MathUtils.clamp(this.targetPitch + (e.clientY - last.y) * k, -HALF_PI, HALF_PI);
      last = { x: e.clientX, y: e.clientY }; this._touch();
      const t = performance.now(); samples.push({ t, yaw: this.targetYaw, pitch: this.targetPitch }); while (samples.length > 2 && t - samples[0].t > 100) samples.shift();
    });
    const end = e => {
      if (!this.interacting) return;
      this.interacting = false; el.style.cursor = "grab"; last = null; this._touch();
      try { el.releasePointerCapture(e.pointerId); } catch { /* already released */ }
      const t = performance.now(), recent = samples.filter(s => t - s.t <= 100);
      if (!this.reducedMotion && recent.length >= 2) { // fling from the last 100 ms of movement (none under reduced motion)
        const a = recent[0], b = recent[recent.length - 1], dt = Math.max(16, b.t - a.t) / 1000;
        this.vYaw = THREE.MathUtils.clamp((b.yaw - a.yaw) / dt, -6, 6); this.vPitch = THREE.MathUtils.clamp((b.pitch - a.pitch) / dt, -6, 6);
      }
    };
    on(el, "pointerup", end); on(el, "pointercancel", end);
    on(el, "pointerleave", () => { this.hoverClient = null; this.hoverDirty = true; });
    on(el, "wheel", e => { e.preventDefault(); this._touch(); this.setZoom(this.distance * Math.exp(e.deltaY * 0.0012)); }, { passive: false });
    on(el, "keydown", e => {
      const step = 0.12, m = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
      if (!m) return; e.preventDefault(); this._touch(); this.anim = null;
      this.targetYaw += m[0]; this.targetPitch = THREE.MathUtils.clamp(this.targetPitch + m[1], -HALF_PI, HALF_PI);
    });
    if (this.mq) on(this.mq, "change", () => { if (this.reducedMotion) { this.idleFactor = 0; this.vYaw = this.vPitch = 0; } });
    if (window.ResizeObserver) { this.ro = new ResizeObserver(() => this._resize()); this.ro.observe(this.container); }
    else on(window, "resize", () => this._resize());
  }

  _unbind() { for (const [t, type, fn, o] of this._listeners) t.removeEventListener(type, fn, o); this._listeners = []; if (this.ro) this.ro.disconnect(); }

  _resize() {
    const w = Math.max(1, this.container.clientWidth), h = Math.max(1, this.container.clientHeight);
    this.cssW = w; this.cssH = h;
    this.renderer.setPixelRatio(Math.min(this.opts.maxDpr, window.devicePixelRatio || 1));
    this.renderer.setSize(w, h, false);               // CSS keeps the canvas at 100% × 100%; buffer = CSS × capped DPR
    // portrait containers fit the globe to the WIDTH (same horizontal field as the landscape vertical field), so it never overflows
    this.camera.aspect = w / h; this.camera.fov = w >= h ? this.baseFov : THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(this.baseFov) / 2) / this.camera.aspect));
    this.camera.updateProjectionMatrix();
    this._measure();
    this.orientationVersion++;
  }

  _applyOrientation() { this.spin.rotation.y = this.yaw; this.tilt.rotation.x = this.pitch; }

  _measure() { // on-screen globe radius in CSS px (for drag scaling)
    const fov = THREE.MathUtils.degToRad(this.camera.fov), d = this.distance;
    this.radiusPx = (this.cssH / 2) * (1 / Math.sqrt(d * d - 1)) / Math.tan(fov / 2);
  }

  _frame(now) {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this._frame);
    const dt = Math.min(0.05, Math.max(0, (now - this.lastTime) / 1000)); this.lastTime = now;
    const y0 = this.yaw, p0 = this.pitch;

    if (this.anim) { // preset view tween
      const a = this.anim, k = smoothstep((now - a.t0) / a.dur);
      this.yaw = this.targetYaw = a.y0 + (a.y1 - a.y0) * k; this.pitch = this.targetPitch = a.p0 + (a.p1 - a.p0) * k;
      this.lastInteraction = now;
      if (k >= 1) this.anim = null;
    } else {
      if (!this.interacting && (this.vYaw || this.vPitch)) { // fling decays (τ ≈ 0.35 s)
        const decay = Math.exp(-dt / 0.35);
        this.targetYaw += this.vYaw * dt; this.targetPitch = THREE.MathUtils.clamp(this.targetPitch + this.vPitch * dt, -HALF_PI, HALF_PI);
        this.vYaw *= decay; this.vPitch *= decay;
        if (Math.abs(this.vYaw) < 0.01 && Math.abs(this.vPitch) < 0.01) this.vYaw = this.vPitch = 0;
        else this.lastInteraction = now; // the idle delay counts from when the fling has settled
      }
      // idle spin: only when untouched for idleDelayMs; ramps in gently (smoothstep over idleRampMs)
      if (this.autoRotateActive && !this.interacting) {
        const since = now - this.lastInteraction - this.opts.idleDelayMs;
        this.idleFactor = since > 0 ? smoothstep(since / this.opts.idleRampMs) : 0;
        if (this.idleFactor > 0) this.targetYaw += this.opts.idleSpeed * this.idleFactor * dt;
      } else this.idleFactor = 0;
      const follow = 1 - Math.exp(-dt / 0.09); // weighted drag: the globe eases toward the pointer target
      this.yaw += (this.targetYaw - this.yaw) * follow; this.pitch += (this.targetPitch - this.pitch) * follow;
    }
    if (Math.abs(this.yaw) > 1e4) { const w = TAU * Math.round(this.yaw / TAU); this.yaw -= w; this.targetYaw -= w; } // keep floats small
    if (this.yaw !== y0 || this.pitch !== p0) this.orientationVersion++;

    this._applyOrientation();
    const c0 = performance.now();
    this.renderer.render(this.scene, this.camera);
    this.cpuFrameMs = this.cpuFrameMs === undefined ? performance.now() - c0 : this.cpuFrameMs * 0.95 + (performance.now() - c0) * 0.05; // JS-side cost of a frame (EMA)
    this.frames++;
    if (this.onFrame) this.onFrame(this);
  }
}
