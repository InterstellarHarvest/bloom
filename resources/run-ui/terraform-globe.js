// BLOOM — the production Terraform room's globe helper (BLOOM-029D). docs/PRODUCTION_TERRAFORM_ROOM_v1.md.
//
// Presentation glue between the Terraform room (resources/run-ui/decision-rooms.js) and the EXISTING, UNMODIFIED PlanetSphereView
// (resources/planet-sphere/planet-sphere-view.js, an ES module). It owns no simulation, no rule and no sphere internals:
//   · load()        a guarded dynamic import of the sphere module: over http(s) the real PlanetSphereView is required, and (BLOOM-031) over
//                   file:// too, from the portable runtime; when the module genuinely fails to load (or a file:// page lacks the module
//                   seam), null — the room then shows the flat
//                   canonical-surface fallback below instead of crashing. The import is attempted once per page.
//   · snapshot()    a PRESENTATION SNAPSHOT of the exact authoritative planet (adapter.surface().planet: same id, grid, sections,
//                   tilemap, topology — the very same arrays) whose `globalClimate` is the CURRENT (or a previewed) surface sky, so
//                   the sphere's own texture path (planet-texture.js → BLOOM.surface.paintSurface under planet.globalClimate) paints the
//                   SAME canonical surface the flat gameplay map paints now. Not a regenerated planet, not a second world, never a
//                   mutation of the run's planet (the run page's objects are never touched; the adapter hands out copies).
//   · atmosphereStops()  the accepted Concept 18 diffuse atmosphere (docs/UI_CONCEPT_REVIEW_v10.md §4) as gradient stops: clear at the
//                   visible face, half-linear / half-smoothstep rise to the peak (0.46) where the Atmosphere controls point, smoothstep
//                   fade into space by 80 % of the clearance; 20 stops, no step larger than 0.1. Drawn by the room as an SVG radial
//                   gradient AROUND the component — never in the sphere's shaders / materials.
//   · faceRadius()  the on-screen globe radius a square box of a given side yields with the component's DEFAULT framing (distance 4.2,
//                   fov 35°): the room sizes the box so the visible face has the radius its layout wants. QA compares it with the
//                   component's own measurement (view.state().globeRadiusPx).
//   · mount()       one globe slot: the sphere when the module loaded (public API only: constructor options, setPlanet, dispose), else
//                   the fallback. Either way: setSurface(planetSnapshot, render) / dispose() / kind.
// Classic script, no dependencies besides BLOOM.surface (the canonical surface) for the fallback: boots over file:// like every
// other run-page file. Never reads a page global, never rolls dice.
(function (root) {
  "use strict";
  const doc = root.document;
  // the sphere module next to this file's folder (resolved from this script's own URL, so the page's location does not matter)
  const HERE = doc && doc.currentScript && doc.currentScript.src ? doc.currentScript.src : null;
  const MODULE_URL = HERE ? new URL("../planet-sphere/planet-sphere-view.js", HERE).href : "../resources/planet-sphere/planet-sphere-view.js";
  // (BLOOM-031) served over http(s): import(); opened as a file (file://): the SAME source module from the portable runtime, through
  // BLOOM.modules (resources/portable/module-loader.js). Without that seam (a page that does not load it) file:// stays module-less.
  const modules = () => (root.BLOOM && root.BLOOM.modules) || null;
  const canLoadModules = () => !!(root.location && /^https?:$/.test(root.location.protocol)) || !!(modules() && modules().portable);
  const importModule = url => (modules() && modules().portable ? modules().load(url) : import(url));

  let loading = null;
  /** → Promise<{ PlanetSphereView, PlanetSphereRenderer } | null>. Memoised. No module loading (file:// without the portable seam) → null without a request. */
  function load() {
    if (loading) return loading;
    loading = canLoadModules()
      ? importModule(MODULE_URL).then(m => (m && m.PlanetSphereView ? m : null)).catch(err => { console.warn("BLOOM.terraformGlobe: PlanetSphereView could not load — flat fallback", err && err.message); return null; })
      : Promise.resolve(null);
    return loading;
  }

  /**
   * Presentation snapshot (pure): the exact planet `planet` (an adapter.surface().planet copy) under `sky` ({ temperature, moisture } or
   * the adapter's { temp, moist }). Shares sections / tilemap / topology by reference, replaces only globalClimate.
   */
  function snapshot(planet, sky) {
    if (!planet || !planet.tilemap) throw new TypeError("BLOOM.terraformGlobe.snapshot: needs the adapter's surface().planet");
    const S = !sky ? planet.globalClimate : sky.temperature !== undefined ? sky : { temperature: sky.temp, moisture: sky.moist };
    return { id: planet.id, name: planet.name, gridWidth: planet.gridWidth, gridHeight: planet.gridHeight,
      globalClimate: { temperature: S.temperature, moisture: S.moisture }, sections: planet.sections, tilemap: planet.tilemap, topology: planet.topology || null };
  }

  // ---- the accepted Concept 18 diffuse atmosphere (owner-approved values; docs/UI_CONCEPT_REVIEW_v10.md §4)
  const ATMO = Object.freeze({ rgb: "#6f96d6", peak: 0.46, out: 0.8, haloIn: 0.3, haloW: 1, clear: 1, lane: 0.7 }); // em except rgb / peak / out
  const ss = t => t * t * (3 - 2 * t), soft = t => (t + ss(t)) / 2;
  /**
   * Gradient stops for a radial gradient of radius `outR` (px): [[offset 0…1, opacity], …] — 0 up to the visible face `face`, rising
   * (half linear, half smoothstep) over 8 stops to `peak` at `peakR` (where the Atmosphere controls point), fading (smoothstep) over
   * 10 stops to 0 at `outR`. Pure.
   */
  function atmosphereStops(face, peakR, outR, peak = ATMO.peak) {
    const out = [[0, 0], [face / outR, 0]];
    for (let k = 1; k <= 8; k++) out.push([(face + (peakR - face) * k / 8) / outR, peak * soft(k / 8)]);
    for (let k = 1; k <= 10; k++) out.push([(peakR + (outR - peakR) * k / 10) / outR, peak * (1 - ss(k / 10))]);
    return out.map(([o, a]) => [Math.round(o * 1e4) / 1e4, Math.round(a * 1e3) / 1e3]);
  }
  /** The opacity of that gradient at radius r (px): piecewise-linear between the stops, as SVG interpolates them. Pure (QA). */
  function atmosphereAt(r, face, peakR, outR, peak = ATMO.peak) {
    const st = atmosphereStops(face, peakR, outR, peak), x = r / outR; if (x <= 0) return 0; if (x >= 1) return 0;
    for (let i = 1; i < st.length; i++) if (x <= st[i][0]) { const [x0, a0] = st[i - 1], [x1, a1] = st[i]; return x1 === x0 ? a1 : a0 + (a1 - a0) * (x - x0) / (x1 - x0); }
    return 0;
  }

  // ---- the component's default framing: a square box of side S shows a globe of radius S/2 · (1/√(d²−1)) / tan(fov/2)
  const FRAME = Object.freeze({ distance: 4.2, fov: 35 });
  const faceFactor = () => (1 / Math.sqrt(FRAME.distance * FRAME.distance - 1)) / Math.tan((FRAME.fov * Math.PI / 180) / 2); // ≈ 0.7773
  const faceRadius = side => (side / 2) * faceFactor();
  const boxFor = face => (2 * face) / faceFactor();

  /**
   * Mount a globe slot into `host` (an empty, sized element the room owns). Options: reducedMotion (true | null), ariaLabel,
   * surface (BLOOM.surface, for the fallback), onReady(kind). → { kind: "pending" | "sphere" | "fallback", view, setSurface(planet,
   * render), dispose() }. setSurface may be called before the module resolved: the snapshot is kept and applied on resolution. The sphere
   * is consumed strictly through its public API (constructor options, setPlanet, dispose; the room adds resize / state): no private member
   * is read here or in the room — QA white-boxes the texture source only inside its own harness (tools/terraform-check.js).
   */
  function mount(host, { reducedMotion = null, ariaLabel = "The planet now: drag sideways or press the left and right arrow keys to spin it", surface = root.BLOOM && root.BLOOM.surface, onReady = null } = {}) {
    if (!host || typeof host.appendChild !== "function") throw new TypeError("BLOOM.terraformGlobe.mount: host must be a DOM element");
    const H = { kind: "pending", view: null, disposed: false, pending: null, flat: null, surfaceSets: 0 };
    host.classList.add("tg-host");
    H.setSurface = (planet, render) => { H.pending = { planet, render: render || null }; H.surfaceSets++; if (H.view) H.view.setPlanet(planet, { render: render || null }); else if (H.flat) paintFlat(); };
    H.dispose = () => { if (H.disposed) return; H.disposed = true; if (H.view) { H.view.dispose(); H.view = null; } if (H.flat) { H.flat.wrap.remove(); H.flat = null; } host.classList.remove("tg-host", "tg-sphere", "tg-flat"); };
    // the flat fallback: the canonical surface painted once with BLOOM.surface (the production map's own paint function), clipped to a disc
    function paintFlat() {
      if (!H.flat || !H.pending || !surface) return; const { planet, render } = H.pending, cv = H.flat.canvas, W = planet.gridWidth, Hh = planet.gridHeight;
      const side = Math.max(1, host.clientWidth || 0), td = Math.max(1, Math.floor((side * 0.92) / Math.max(W, Hh * 2)) * 1);
      const tw = td, th = td; if (cv.width !== W * tw || cv.height !== Hh * th) { cv.width = W * tw; cv.height = Hh * th; }
      const sig = surface.surfaceSignature(planet, { render, extra: [tw, th] }); if (sig === H.flat.sig) return; H.flat.sig = sig;
      surface.paintSurface(cv.getContext("2d"), planet, { render, tileW: tw, tileH: th });
    }
    load().then(mod => {
      if (H.disposed) return;
      if (mod) {
        H.kind = "sphere"; host.classList.add("tg-sphere");
        H.view = new mod.PlanetSphereView(host, { reducedMotion, ariaLabel, background: null, wheelZoom: false });
        if (H.pending) H.view.setPlanet(H.pending.planet, { render: H.pending.render });
      } else {
        H.kind = "fallback"; host.classList.add("tg-flat");
        const wrap = doc.createElement("div"); wrap.className = "tg-flat-wrap"; wrap.setAttribute("role", "img"); wrap.setAttribute("aria-label", "The planet now (flat preview: the globe needs the game served over http)");
        const canvas = doc.createElement("canvas"); canvas.className = "tg-flat-cv"; wrap.appendChild(canvas); host.appendChild(wrap);
        H.flat = { wrap, canvas, sig: null }; paintFlat();
        if (typeof ResizeObserver === "function") { const ro = new ResizeObserver(() => { if (H.flat) { H.flat.sig = null; paintFlat(); } }); ro.observe(host); H.flat.ro = ro; }
      }
      if (onReady) onReady(H.kind);
    });
    return H;
  }

  const API = { version: 1, load, canLoadModules, moduleUrl: MODULE_URL, snapshot, ATMO, atmosphereStops, atmosphereAt, FRAME, faceFactor, faceRadius, boxFor, mount };
  root.BLOOM = Object.assign(root.BLOOM || {}, { terraformGlobe: Object.freeze(API) });
})(typeof window !== "undefined" ? window : globalThis);
