// BLOOM — run map renderer (BLOOM-029B): the production gameplay map. docs/PRODUCTION_PLANET_VIEW_v1.md §4.
//
// Draws ONE run's map into any target canvas: the canonical planet surface (resources/planet-surface/planet-surface.js — the
// same surface PlanetSphereView wraps round its globe) with the run's LIVE overlays above it. It owns no simulation, no rules
// and no copy: every input is a plain snapshot the caller read from the run UI adapter (surface(), mapState(), regions(),
// selection(), activePreview(), effects(), bubbles(), region conditions). The Planet View uses one renderer for the main map;
// 029C's room mini-maps create another on their own canvas with the same inputs (no second renderer, no copied draw code).
//
//   const R = BLOOM.runMap.createRenderer(canvas, { surface: BLOOM.surface, reducedMotion: () => bool })
//   R.setSource(adapter.surface())        // the planet (layout, region climate, topology, render hints) + the sky now
//   R.setSky(adapter.surface().sky)       // repaints the canonical surface only when the sky actually changed
//   R.layout({ width, height, dpr })      // CSS size of the stage the canvas fills; returns the geometry (tile px, copies)
//   R.draw(frame)                         // one frame (see FRAME below)
//   R.hitTest(clientX, clientY)           // → { tile, x, y, region (−1 water, −2 outside), copy }  (repeated copies → the SAME tile)
//   R.bubbleAt(clientX, clientY, bubbles) // → the bubble under the pointer, or null
//   R.info()                              // geometry + counters (QA)
//
// FRAME = { tiles (mapState), regions (regions() summaries), selected (index), hover, focus (indices), preview { gain, lose,
//   reachHostile, better, worse } (indices), effects (effects(), ids → indices by the caller), bubbles, layer null | { key,
//   lamps[region] "green" | "yellow" | "red" }, haze (0–1), tints [{ rgb:[r,g,b], k }], labels (bool), now (ms) }
//
// Layers: 1 surface (static: ground, water, coast, archetype treatment) → 2 live tiles (stands by density, dead ground, native
// hatched stands) or the Map View condition layer → 3 scenario haze / shock tint → 4 preview tints → 5 region borders, fronts,
// outlines (selection, previews, sky change, threshold / competition flashes, hover, keyboard focus) → 6 per copy, in screen
// space: water crossings, bubbles, labels (status glyph + name, origin star), colony badges.
//
// Cylinders: a generated planet wraps in x, so when the stage is wider than one copy the world is REPEATED (never padded with
// invented ocean) and a click on any copy resolves to the same canonical tile (x mod W). Outlines, borders and fronts use the
// planet's own neighbour rule, so nothing breaks at x = W − 1 → 0. Rectangles (First Bloom, Training Grounds) are drawn once,
// centred, inside the stage's frame colour. The simulation geometry is never changed.
//
// Classic script, no dependencies besides the BLOOM.surface it is handed: boots over file://.
(function (root) {
  "use strict";
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  const rgb = c => `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`;
  const rgba = (c, a) => `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${(+a).toFixed(3)})`;

  // ---- live-overlay styling (Concept 18 light map). The PLANET's look is not here: it is the canonical surface.
  const INK = [47, 58, 44];
  const STAND = { sparse: [184, 220, 118], dense: [46, 132, 60], sick: [178, 166, 92], dot: [26, 92, 40] };
  const DEAD = [150, 112, 82], DEAD_MARK = [104, 74, 52];
  const NATIVE = { sparse: [196, 168, 222], dense: [112, 70, 152], hatch: "rgba(64,30,96,0.62)" };
  const FRONT = "#e0820b";
  const LAYER = { green: [156, 210, 136], yellow: [243, 196, 107], red: [233, 143, 166], markYellow: [150, 96, 10], markRed: [143, 40, 70] };
  const OUT = { select: "#2f3a2c", selectUnder: "#fffdf7", hover: "rgba(255,253,247,0.95)", focus: "#1f6fd1", gain: "#2a7636", lose: "#c4466a",
    hostile: "#d98a1c", better: "#5aa24a", worse: "#d9601f", opened: "#2a7636", worseFx: "#d9601f" };
  const CX_COLOR = { contested: "#8a5bb8", playerAdvantage: "#2a7636", nativeRetake: "#d9601f", nativeDominated: "#c4466a" };
  const FOCUS = { roots: [168, 116, 63], leaves: [63, 157, 75], seeds: [197, 138, 26], balanced: [138, 147, 127] };
  const GLYPH = { green: "check", yellow: "alert", red: "x" }, GLYPH_COLOR = { green: "#2a7636", yellow: "#b56d00", red: "#a83d5a" };
  // inline icon paths (24×24 stroke icons, the production SVG family; drawn with Path2D — never emoji)
  const ICON = {
    check: "M5 12.5l4.5 4.5L19 7", alert: "M12 5v8.5M12 18.2v.4", x: "M6 6l12 12M18 6L6 18", plus: "M12 5v14M5 12h14",
    roots: "M12 3v8M12 11l-5 5M12 11l5 5M7 16l-2 4M7 16l2 4M17 16l-2 4M17 16l2 4",
    leaves: "M5 19C5 10 10 5 20 4c0 10-5 15-14 15zM5 19l9-9",
    seeds: "M12 21V9M12 9c-3 0-5-3-5-6 3 0 5 2 5 6zM12 12c0-4 2-6 5-6 0 3-2 6-5 6z",
    star: "M12 3.5l2.6 5.3 5.9.9-4.25 4.15 1 5.85L12 16.9l-5.25 2.8 1-5.85L3.5 9.7l5.9-.9z",
  };
  const paths = {}; const P2 = name => paths[name] || (paths[name] = typeof Path2D === "function" ? new Path2D(ICON[name]) : null);
  const DFULL = 0.78, patchFrac = d => 0.24 + 0.76 * Math.pow(clamp((d - 0.03) / (DFULL - 0.03), 0, 1), 0.8); // the stand's footprint (BLOOM-008)
  const standColor = (d, v) => mix(STAND.sick, mix(STAND.sparse, STAND.dense, Math.pow(clamp(d, 0, 1), 0.75)), clamp((v - 0.2) / 0.5, 0, 1));
  const nativeColor = d => mix(NATIVE.sparse, NATIVE.dense, Math.pow(clamp(d, 0, 1), 0.8));

  function createRenderer(canvas, { surface = root.BLOOM && root.BLOOM.surface, reducedMotion = () => false, frame: frameColor = [36, 44, 34], onInvalidate = null } = {}) {
    if (!surface || typeof surface.paintSurface !== "function") throw new TypeError("BLOOM.runMap: the canonical planet surface (BLOOM.surface) is required");
    const ctx = canvas.getContext("2d");
    const world = document.createElement("canvas"), wctx = world.getContext("2d");      // the whole planet once, at the current tile size
    const surf = document.createElement("canvas"), sctx = surf.getContext("2d");        // the canonical surface, at the current tile size
    let SP = null, RENDER = null, SKY = null, W = 0, H = 0, WRAP = false, TM = null, NREG = 0, JIT = null, EDGES = null, TILES_OF = null;
    let surfSig = null, surfaceRepaints = 0, frames = 0, restores = 0;
    // a 2D canvas can lose its backing store (Chromium drops and restores offscreen contexts, blank, e.g. while the GPU process starts):
    // repaint the surface and ask the owner for a new frame when that happens
    for (const c of [canvas, world, surf]) c.addEventListener("contextrestored", () => { restores++; surfSig = null; if (onInvalidate) onInvalidate(); });
    const G = { cssW: 0, cssH: 0, dpr: 1, td: 8, ox: 0, oy: 0, worldW: 0, worldH: 0, kMin: 0, kMax: 0 };

    // ---- source: the run's planet (layout, region climate, topology, render hints) and the sky its ground sees now
    function setSource(src) {
      SP = surface.surfacePlanet(src.planet, src.planet); RENDER = src.render || null; SKY = src.sky || null;
      W = SP.gridWidth; H = SP.gridHeight; WRAP = surface.wrapsX(SP); TM = SP.tilemap; NREG = SP.sections.length;
      JIT = new Float32Array(W * H * 2); // small fixed per-tile offset so young stands sit irregularly (organic), 0 once full
      for (let i = 0; i < W * H; i++) { const h = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b) >>> 0; JIT[2 * i] = ((h & 255) / 255 - 0.5) * 0.8; JIT[2 * i + 1] = (((h >> 8) & 255) / 255 - 0.5) * 0.8; }
      TILES_OF = Array.from({ length: NREG }, () => []); for (let i = 0; i < W * H; i++) if (TM[i] >= 0) TILES_OF[TM[i]].push(i);
      EDGES = Array.from({ length: NREG }, () => []); // per region: its boundary segments in tile units, under the planet's topology
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const s = TM[y * W + x]; if (s < 0) continue; const E = EDGES[s];
        if (at(x + 1, y) !== s) E.push(x + 1, y, x + 1, y + 1); if (at(x - 1, y) !== s) E.push(x, y, x, y + 1);
        if (at(x, y + 1) !== s) E.push(x, y + 1, x + 1, y + 1); if (at(x, y - 1) !== s) E.push(x, y, x + 1, y); }
      surfSig = null; if (G.cssW) layout({ width: G.cssW, height: G.cssH, dpr: G.dpr });
    }
    // the tilemap entry at (x, y) under the planet's topology (−1 water; −3 off the map: a rectangle's edge or a pole)
    function at(x, y) { if (y < 0 || y >= H) return -3; if (x < 0 || x >= W) { if (!WRAP) return -3; x = ((x % W) + W) % W; } return TM[y * W + x]; }
    function setSky(sky) { SKY = sky || null; paintSurfaceIfNeeded(); }
    function paintSurfaceIfNeeded() {
      if (!SP || !G.td) return;
      const sig = surface.surfaceSignature(SP, { render: RENDER, sky: SKY, extra: G.td });
      if (sig === surfSig) return;
      if (surf.width !== W * G.td) surf.width = W * G.td; if (surf.height !== H * G.td) surf.height = H * G.td;
      surface.paintSurface(sctx, SP, { render: RENDER, sky: SKY, tileW: G.td, tileH: G.td });
      surfSig = sig; surfaceRepaints++;
    }

    // ---- geometry: whole device pixels per tile; the map fits the stage height (and its width: the whole planet is always shown
    // at least once); a cylinder repeats sideways to fill the stage, centred on the map's middle meridian (as the globe faces it)
    function layout({ width, height, dpr = 1 }) {
      G.cssW = width; G.cssH = height; G.dpr = dpr;
      const dw = Math.max(1, Math.round(width * dpr)), dh = Math.max(1, Math.round(height * dpr));
      if (canvas.width !== dw) canvas.width = dw; if (canvas.height !== dh) canvas.height = dh;
      canvas.style.width = width + "px"; canvas.style.height = height + "px";
      if (!SP) return info();
      G.td = Math.max(3, Math.min(Math.floor(dh / H), Math.floor(dw / W)));
      G.worldW = W * G.td; G.worldH = H * G.td;
      if (world.width !== G.worldW) world.width = G.worldW; if (world.height !== G.worldH) world.height = G.worldH;
      G.oy = Math.floor((dh - G.worldH) / 2); G.ox = Math.floor((dw - G.worldW) / 2);
      if (WRAP) { G.kMin = -Math.ceil(G.ox / G.worldW); G.kMax = Math.ceil((dw - G.ox - G.worldW) / G.worldW); } else { G.kMin = 0; G.kMax = 0; }
      paintSurfaceIfNeeded();
      return info();
    }

    // ---- hit testing (client px → canonical tile). A repeated copy resolves to the same tile, modulo the world width.
    function toDevice(clientX, clientY) { const r = canvas.getBoundingClientRect(); return { dx: (clientX - r.left) * G.dpr, dy: (clientY - r.top) * G.dpr }; }
    function hitTest(clientX, clientY) {
      if (!SP) return { tile: -1, x: -1, y: -1, region: -2, copy: 0 };
      const { dx, dy } = toDevice(clientX, clientY), tx = Math.floor((dx - G.ox) / G.td), ty = Math.floor((dy - G.oy) / G.td);
      const copy = Math.floor(tx / W);
      if (ty < 0 || ty >= H || (!WRAP && (tx < 0 || tx >= W)) || copy < G.kMin || copy > G.kMax) return { tile: -1, x: -1, y: -1, region: -2, copy };
      const x = ((tx % W) + W) % W, tile = ty * W + x;
      return { tile, x, y: ty, region: TM[tile], copy };
    }
    function bubbleAt(clientX, clientY, bubbles) {
      if (!SP || !bubbles) return null; const { dx, dy } = toDevice(clientX, clientY);
      const r = Math.max(14 * G.dpr, G.td * 0.75); let best = null, bd = Infinity;
      for (const b of bubbles) for (let k = G.kMin; k <= G.kMax; k++) {
        const d = Math.hypot(dx - (G.ox + k * G.worldW + b.x * G.td), dy - (G.oy + b.y * G.td)); if (d <= r && d < bd) { bd = d; best = b; } }
      return best;
    }
    /** screen (client) position of a point in tile units, on the copy nearest the stage centre */
    function clientOf(tx, ty) { const r = canvas.getBoundingClientRect(); return { x: r.left + (G.ox + tx * G.td) / G.dpr, y: r.top + (G.oy + ty * G.td) / G.dpr }; }

    // ---- drawing helpers (world canvas, device px)
    function outline(c, sec, color, width, dash, under) {
      const E = EDGES[sec]; if (!E || !E.length) return; const t = G.td;
      const stroke = (col, w, d) => { c.strokeStyle = col; c.lineWidth = w; c.setLineDash(d || []); c.beginPath();
        for (let k = 0; k < E.length; k += 4) { c.moveTo(E[k] * t, E[k + 1] * t); c.lineTo(E[k + 2] * t, E[k + 3] * t); } c.stroke(); };
      if (under !== false) stroke(under || "rgba(255,253,247,0.9)", width + 2 * G.dpr, []);
      stroke(color, width, dash); c.setLineDash([]);
    }
    function tintRegion(c, sec, fill) { const t = G.td; c.fillStyle = fill; for (const i of TILES_OF[sec]) c.fillRect((i % W) * t, ((i / W) | 0) * t, t, t); }
    function icon(c, name, cx, cy, size, color, width) { const p = P2(name); if (!p) return; c.save(); c.translate(cx - size / 2, cy - size / 2); c.scale(size / 24, size / 24);
      c.strokeStyle = color; c.lineWidth = width * 24 / size; c.lineCap = "round"; c.lineJoin = "round"; c.stroke(p); c.restore(); }
    function roundRect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

    // ---- one frame
    function drawWorld(f) {
      const c = wctx, t = G.td, dpr = G.dpr; c.setTransform(1, 0, 0, 1, 0, 0); c.imageSmoothingEnabled = false;
      paintSurfaceIfNeeded();
      c.drawImage(surf, 0, 0);                                                    // 1 · the canonical surface
      const T = f.tiles;
      if (f.layer) {                                                               // 2b · Map View: real region conditions over the surface
        for (let s = 0; s < NREG; s++) { const lamp = f.layer.lamps[s] || "green", col = LAYER[lamp];
          for (const i of TILES_OF[s]) { const x = (i % W) * t, y = ((i / W) | 0) * t, h = ((Math.imul(i + 3, 0x9e3779b1) >>> 20) & 255) / 255 - 0.5;
            c.fillStyle = rgba(mix(col, [255, 255, 255], h * 0.12 + 0.03), 0.9); c.fillRect(x, y, t, t);
            // never colour alone: strained ground carries a short dash, blocked ground a dot
            if (lamp === "yellow" && (i * 7 + ((i / W) | 0)) % 3 === 0) { c.fillStyle = rgb(LAYER.markYellow); c.fillRect(x + t * 0.25, y + t * 0.46, Math.max(1, t * 0.5), Math.max(1, t * 0.1)); }
            if (lamp === "red" && (i * 5 + ((i / W) | 0) * 3) % 2 === 0) { c.fillStyle = rgb(LAYER.markRed); const d = Math.max(1.5, t * 0.16); c.fillRect(x + t * 0.42, y + t * 0.42, d, d); } } }
      } else if (T) {                                                              // 2a · live tiles: stands, dead ground, native stands
        const st = T.state, dn = T.density, nat = T.native, vig = T.vigor, hatch = [];
        for (let i = 0; i < W * H; i++) { const s = TM[i]; if (s < 0) continue; const x = (i % W) * t, y = ((i / W) | 0) * t;
          if (st[i] === 1) { const d = dn[i], fr = patchFrac(d), sz = t * fr, o = (t - sz) / 2;
            c.fillStyle = rgb(standColor(d, vig[s])); c.fillRect(Math.round(x + o + o * JIT[2 * i]), Math.round(y + o + o * JIT[2 * i + 1]), Math.max(1, Math.round(sz)), Math.max(1, Math.round(sz)));
            if (d > 0.5 && t >= 8) { const h = Math.imul(i + 1, 0x85ebca6b) >>> 0, r = Math.max(1, Math.round(t * (0.08 + 0.1 * (d - 0.5)))); // dense stands: Concept 18 leaf dots
              c.fillStyle = rgba(STAND.dot, 0.55); c.fillRect(Math.round(x + t * (0.2 + 0.5 * ((h & 255) / 255))), Math.round(y + t * (0.2 + 0.5 * (((h >> 8) & 255) / 255))), r, r); } }
          else if (st[i] === 2) { c.fillStyle = rgb(DEAD); c.fillRect(x, y, t, t); c.fillStyle = rgb(DEAD_MARK); const m = Math.max(1, Math.round(t * 0.14));
            c.fillRect(x + Math.round(t * 0.22), y + Math.round(t * 0.3), m, m); c.fillRect(x + Math.round(t * 0.62), y + Math.round(t * 0.58), m, m); }
          else if (nat && nat[i] > 0) { const d = nat[i]; c.fillStyle = rgba(nativeColor(d), 0.45 + 0.55 * clamp(d / 0.8, 0, 1)); c.fillRect(x, y, t, t); hatch.push(x, y, d); } }
        if (hatch.length) { c.strokeStyle = NATIVE.hatch; c.lineWidth = Math.max(1, t * 0.12); c.beginPath(); // "/" marks: never by colour alone
          for (let k = 0; k < hatch.length; k += 3) { const x = hatch[k], y = hatch[k + 1], d = hatch[k + 2];
            if (d > 0.45) { c.moveTo(x + t * 0.12, y + t * 0.55); c.lineTo(x + t * 0.55, y + t * 0.12); c.moveTo(x + t * 0.45, y + t * 0.88); c.lineTo(x + t * 0.88, y + t * 0.45); }
            else { c.moveTo(x + t * 0.25, y + t * 0.75); c.lineTo(x + t * 0.75, y + t * 0.25); } }
          c.stroke(); }
      }
      if (f.haze > 0) { c.fillStyle = `rgba(200,182,226,${(0.24 * f.haze).toFixed(3)})`; c.fillRect(0, 0, G.worldW, G.worldH); } // 3 · scenario feedback
      for (const x of f.tints || []) if (x.k > 0) { c.fillStyle = rgba(x.rgb, 0.18 * x.k); c.fillRect(0, 0, G.worldW, G.worldH); }
      const pv = f.preview;
      if (pv) { for (const s of pv.gain || []) tintRegion(c, s, "rgba(63,157,75,0.30)"); for (const s of pv.lose || []) tintRegion(c, s, "rgba(196,70,106,0.32)"); } // 4
      // 5 · region borders (land | land between two regions), under the planet's topology
      c.strokeStyle = "rgba(47,58,44,0.32)"; c.lineWidth = Math.max(1, Math.round(t * 0.07)); c.beginPath();
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const s = TM[y * W + x]; if (s < 0) continue;
        const e = at(x + 1, y); if (e >= 0 && e !== s) { c.moveTo((x + 1) * t, y * t); c.lineTo((x + 1) * t, (y + 1) * t); }
        const d = at(x, y + 1); if (d >= 0 && d !== s) { c.moveTo(x * t, (y + 1) * t); c.lineTo((x + 1) * t, (y + 1) * t); } }
      c.stroke();
      if (T && T.native && !f.layer) { const st = T.state, nat = T.native, L = i => st[i] === 1, N = i => nat[i] > 0; // competition fronts (amber tile edges)
        c.strokeStyle = FRONT; c.lineWidth = Math.max(2, t * 0.2); c.beginPath();
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (TM[i] < 0) continue;
          const ex = x + 1 < W ? x + 1 : WRAP ? 0 : -1;
          if (ex >= 0) { const j = y * W + ex; if (TM[j] >= 0 && ((L(i) && N(j)) || (N(i) && L(j)))) { c.moveTo((x + 1) * t, y * t + 1); c.lineTo((x + 1) * t, (y + 1) * t - 1); } }
          if (y + 1 < H) { const j = i + W; if (TM[j] >= 0 && ((L(i) && N(j)) || (N(i) && L(j)))) { c.moveTo(x * t + 1, (y + 1) * t); c.lineTo((x + 1) * t - 1, (y + 1) * t); } } }
        c.stroke(); }
      const lw = Math.max(2, Math.round(t * 0.16)), dash = [Math.round(t * 0.45), Math.round(t * 0.3)], dot = [Math.max(2, Math.round(t * 0.16)), Math.round(t * 0.3)];
      const fx = f.effects || {};
      if (pv) { (pv.gain || []).forEach(s => outline(c, s, OUT.gain, lw, dash)); (pv.lose || []).forEach(s => outline(c, s, OUT.lose, lw, dash));
        (pv.reachHostile || []).forEach(s => outline(c, s, OUT.hostile, Math.max(2, lw * 0.7), dot)); }
      const sk = pv && pv.better ? pv : fx.skyChange || null;               // sky what-if (preview) or the last Terraform purchase
      if (sk) { if (sk === fx.skyChange) { (sk.gain || []).forEach(s => outline(c, s, OUT.gain, lw)); (sk.lose || []).forEach(s => outline(c, s, OUT.lose, lw)); }
        (sk.better || []).forEach(s => outline(c, s, OUT.better, Math.max(2, lw * 0.7), dot)); (sk.worse || []).forEach(s => outline(c, s, OUT.worse, Math.max(2, lw * 0.7), dot)); }
      for (const x of fx.thresholds || []) outline(c, x.index, x.worse ? OUT.worseFx : OUT.opened, lw, dash);
      for (const x of fx.competition || []) outline(c, x.index, CX_COLOR[x.type] || "#8a5bb8", lw, dash);
      if (f.hover >= 0 && f.hover !== f.selected) outline(c, f.hover, OUT.hover, Math.max(2, lw * 0.75), null, "rgba(47,58,44,0.55)");
      if (f.selected >= 0) outline(c, f.selected, OUT.select, lw + dpr, [Math.round(t * 0.5), Math.round(t * 0.28)], OUT.selectUnder);
      if (f.focus >= 0) outline(c, f.focus, OUT.focus, Math.max(3, lw), null, "#ffffff");
    }

    function drawCopyOverlays(f, k, labels) {
      const c = ctx, t = G.td, dpr = G.dpr, X0 = G.ox + k * G.worldW, Y0 = G.oy, now = f.now || 0, still = reducedMotion();
      const cw = canvas.width;
      // water crossings: seed dots along an arc from the source coast to the landing tile (the shorter way round on a cylinder)
      const fx = f.effects || {}, TT = fx.crossingTiming || { travel: 1300, land: 700 };
      for (const a of fx.crossings || []) {
        const fx0 = a.from % W + 0.5, fy0 = ((a.from / W) | 0) + 0.5; let fx1 = a.to % W + 0.5; const fy1 = ((a.to / W) | 0) + 0.5;
        if (WRAP && Math.abs(fx1 - fx0) > W / 2) fx1 += fx1 > fx0 ? -W : W;
        const x0 = X0 + fx0 * t, y0 = Y0 + fy0 * t, x1 = X0 + fx1 * t, y1 = Y0 + fy1 * t;
        const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, cx = (x0 + x1) / 2 - dy / L * L * 0.22, cy = (y0 + y1) / 2 + dx / L * L * 0.22;
        const tt = a.elapsed / TT.travel, pt = u => [(1 - u) * (1 - u) * x0 + 2 * (1 - u) * u * cx + u * u * x1, (1 - u) * (1 - u) * y0 + 2 * (1 - u) * u * cy + u * u * y1];
        if (still) { if (tt <= 1) { c.setLineDash([2 * dpr, 4 * dpr]); c.strokeStyle = "rgba(107,74,26,0.85)"; c.lineWidth = 2 * dpr; c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(cx, cy, x1, y1); c.stroke(); c.setLineDash([]); } }
        else for (let j = 0; j < 3; j++) { const u = tt - j * 0.12; if (u < 0 || u > 1) continue; const [bx, by] = pt(u);
          c.beginPath(); c.arc(bx, by, Math.max(2.5 * dpr, t * 0.27), 0, 7); c.fillStyle = "#fff4d6"; c.fill(); c.lineWidth = 1.4 * dpr; c.strokeStyle = "#6b4a1a"; c.stroke(); }
        const lt = (a.elapsed - TT.travel) / TT.land; if (lt < 0 || lt > 1) continue; const g = still ? 0.5 : lt;
        if (a.took) { c.beginPath(); c.arc(x1, y1, t * (0.6 + 2.2 * g), 0, 7); c.lineWidth = 3.5 * dpr; c.strokeStyle = `rgba(242,179,36,${still ? 0.9 : 1 - lt})`; c.stroke();
          c.beginPath(); c.arc(x1, y1, t * 0.7 * (1 - g * 0.5), 0, 7); c.fillStyle = `rgba(63,157,75,${still ? 0.85 : 0.9 * (1 - lt)})`; c.fill(); }
        else { c.beginPath(); c.arc(x1, y1, t * (0.35 + 1.0 * g), 0, 7); c.lineWidth = 1.6 * dpr; c.strokeStyle = `rgba(35,103,159,${still ? 0.7 : 0.75 * (1 - lt)})`; c.stroke(); }
      }
      if (f.labels && labels) drawLabels(c, labels, X0, cw, dpr);
      // Biomass bubbles: gold coins with a "+" (collect by click / tap; the engine auto-collects them later), above the labels
      for (const b of f.bubbles || []) { const bx = X0 + b.x * t, by = Y0 + b.y * t, r = Math.max(7 * dpr, t * 0.45); if (bx < -r || bx > cw + r) continue;
        c.beginPath(); c.arc(bx, by, r, 0, 7); c.fillStyle = "#f2b324"; c.fill(); c.lineWidth = 1.8 * dpr; c.strokeStyle = "#fffdf7"; c.stroke();
        c.beginPath(); c.arc(bx, by, r + 1.2 * dpr, 0, 7); c.lineWidth = 1 * dpr; c.strokeStyle = "rgba(90,60,0,0.55)"; c.stroke();
        icon(c, "plus", bx, by, r * 1.3, "#5a3c00", 3.2 * dpr); }
    }
    function drawLabels(c, labels, X0, cw, dpr) {
      // region labels: a pill with the status glyph (open / strained / blocked: icon, never colour alone) + the name; origin star;
      // colony badges above (growth focus icon; a gold ring + dot for a local upgrade)
      for (const L of labels) { const x = X0 + L.x, y = G.oy + L.y; if (x + L.w / 2 < 0 || x - L.w / 2 > cw) continue;
        c.save(); c.shadowColor = "rgba(40,50,30,0.25)"; c.shadowBlur = 4 * dpr; c.shadowOffsetY = 1 * dpr;
        roundRect(c, x - L.w / 2, y - L.h / 2, L.w, L.h, L.h / 2); c.fillStyle = L.selected ? "#2f3a2c" : "rgba(255,253,247,0.94)"; c.fill(); c.restore();
        c.lineWidth = 1.2 * dpr; c.strokeStyle = L.selected ? "#2f3a2c" : "rgba(47,58,44,0.28)"; c.stroke();
        let gx = x - L.w / 2 + L.pad + L.g / 2;
        icon(c, GLYPH[L.lamp] || "check", gx, y, L.g, L.selected ? "#fff7e0" : GLYPH_COLOR[L.lamp] || INK, 3 * dpr);
        gx += L.g / 2 + L.gap;
        if (L.origin) { const p = P2("star"); if (p) { c.save(); c.translate(gx, y - L.g / 2); c.scale(L.g / 24, L.g / 24); c.fillStyle = "#f2b324"; c.fill(p); c.lineWidth = 2; c.strokeStyle = "#a86f00"; c.stroke(p); c.restore(); } gx += L.g + L.gap; }
        c.fillStyle = L.selected ? "#fff7e0" : "#2f3a2c"; c.font = L.font; c.textAlign = "left"; c.textBaseline = "middle"; c.fillText(L.name, gx, y + 0.5 * dpr);
        if (L.focus && (L.focus !== "balanced" || L.local)) { const r = L.h * 0.5, bx = x, by = y - L.h / 2 - r - 2 * dpr;
          c.beginPath(); c.arc(bx, by, r, 0, 7); c.fillStyle = rgb(FOCUS[L.focus] || FOCUS.balanced); c.fill();
          c.lineWidth = (L.local ? 3 : 1.5) * dpr; c.strokeStyle = L.local ? "#f2b324" : "rgba(255,253,247,0.95)"; c.stroke();
          if (L.focus !== "balanced") icon(c, L.focus, bx, by, r * 1.35, "#fffdf7", 2.6 * dpr);
          if (L.local) { c.beginPath(); c.arc(bx + r * 0.78, by - r * 0.78, Math.max(2.5 * dpr, r * 0.34), 0, 7); c.fillStyle = "#f2b324"; c.fill(); c.lineWidth = 1 * dpr; c.strokeStyle = "#5a3f0a"; c.stroke(); } }
      }
    }

    // label geometry in world px (computed once per frame from the region snapshots; identical on every copy)
    function placeLabels(f) {
      const regs = f.regions; if (!regs || !f.labels) return null; const dpr = G.dpr, cssT = G.td / dpr;
      const fs = clamp(Math.round(cssT * 0.78), 10, 14) * dpr, h = Math.round(fs * 1.7), g = Math.round(fs * 0.95), pad = Math.round(fs * 0.55), gap = Math.round(fs * 0.3);
      const font = `800 ${fs}px ui-rounded, "SF Pro Rounded", "Nunito", "Varela Round", "Trebuchet MS", system-ui, sans-serif`; ctx.font = font;
      const out = [], placed = [];
      const order = regs.slice().sort((a, b) => (b.area || 0) - (a.area || 0));
      for (const r of order) {
        const lamp = f.layer ? (f.layer.lamps[r.index] || "green") : r.lamp, name = r.name;
        const w = Math.round(pad + g + gap + (r.isOrigin ? g + gap : 0) + ctx.measureText(name).width + pad);
        let x = r.center.x * G.td, y = r.center.y * G.td;
        const hit = (yy) => placed.some(p => Math.abs(p.x - x) < (p.w + w) / 2 + 2 * dpr && Math.abs(p.y - yy) < h + 2 * dpr);
        if (hit(y)) { const up = y - h - 3 * dpr, dn = y + h + 3 * dpr; y = !hit(dn) ? dn : !hit(up) ? up : y; }
        const L = { index: r.index, name, lamp, origin: !!r.isOrigin, selected: r.index === f.selected, focus: r.focus || "balanced", local: !!r.localUpgrade, x, y, w, h, g, pad, gap, font };
        out.push(L); placed.push(L);
      }
      return out;
    }

    function draw(f) {
      if (!SP) return; frames++;
      drawWorld(f);
      const c = ctx; c.setTransform(1, 0, 0, 1, 0, 0); c.imageSmoothingEnabled = false;
      c.fillStyle = rgb(frameColor); c.fillRect(0, 0, canvas.width, canvas.height);    // the stage frame (outside the planet only)
      for (let k = G.kMin; k <= G.kMax; k++) c.drawImage(world, G.ox + k * G.worldW, G.oy);
      if (!WRAP) { c.strokeStyle = "rgba(255,253,247,0.18)"; c.lineWidth = G.dpr; c.strokeRect(G.ox - 0.5, G.oy - 0.5, G.worldW + 1, G.worldH + 1); }
      const labels = placeLabels(f);
      for (let k = G.kMin; k <= G.kMax; k++) drawCopyOverlays(f, k, labels);
    }

    function info() {
      return { gridWidth: W, gridHeight: H, wrapX: WRAP, tilePx: G.td / G.dpr, tileDevicePx: G.td, dpr: G.dpr, offsetX: G.ox / G.dpr, offsetY: G.oy / G.dpr,
        worldWidth: G.worldW / G.dpr, worldHeight: G.worldH / G.dpr, copies: { from: G.kMin, to: G.kMax, count: G.kMax - G.kMin + 1 },
        surfaceSignature: SP ? surface.surfaceSignature(SP, { render: RENDER, sky: SKY }) : null, surfaceRepaints, frames, contextRestores: restores,
        sky: SKY ? surface.skyOf(SP, SKY) : null };
    }
    return Object.freeze({ setSource, setSky, layout, draw, hitTest, bubbleAt, clientOf, info, surfaceCanvas: surf, worldCanvas: world, get planet() { return SP; }, get render() { return RENDER; } });
  }

  root.BLOOM = Object.assign(root.BLOOM || {}, { runMap: Object.freeze({ createRenderer, version: 1 }) });
})(typeof window !== "undefined" ? window : globalThis);
