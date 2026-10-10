// BLOOM — production plant specimen (BLOOM-032C: the approved ORGANIC HYBRID sprite organism; the provisional 029C SVG is retired).
// docs/PRODUCTION_PLANT_INTEGRATION_v1.md · docs/PLANT_SPRITE_PIPELINE_v1.md · docs/PRODUCTION_PLANT_ROOMS_v1.md §8.
//
// The plant Region Inspect / Adapt / Spread (and Guided Training, which uses those rooms) and the Bloom / Extinction report show. The
// PUBLIC API is the 029C one, unchanged — the rooms and the report call it exactly as before:
//
//   const sp = BLOOM.plantSpecimen.mount(host, { reducedMotion })
//   sp.render(state)                 // state: { traits {id → tier}, preview {id, tier} | null, colony {living, establishment, word},
//                                    //          focus, local, condition "ok" | "warn" | "bad", viable, names {id → trait name} }
//   sp.highlight(part | null)        // light one logical part (pigment · leafShape · stem · roots · seedHead · flowers · pods), dim the rest
//   sp.anchorPoint(part)             // → { x, y } in CLIENT px on the visible anatomy (the organic tendrils start here); null before the first render
//   sp.anchors()                     // → every anchor, top → bottom by part
//   sp.signature()                   // a hash of the displayed pixels (QA: a trait must change the picture)
//   sp.state · sp.parts · sp.el      // the last state · the seven logical parts · the specimen box
//   (additive) sp.canvas (sp.svg names the same image element) · sp.globalSignature() · sp.scale() · sp.lastFx {seq, style, frames,
//   endSig, targetSig, exact} · sp.animating() · sp.highlighted · sp.pack · BLOOM.plantSpecimen.mounted() (QA: the mounted specimens, read-only)
//   sp.dispose()   (BLOOM-033) its owner releases it (listener, observer, element, its mounted() entry) when the run is disposed
//
// Behind it is the accepted BLOOM-032B pipeline, unchanged: BLOOM.plantVisual.model (normalize) → BLOOM.plantVisual.components (select) →
// BLOOM.plantCompositor (the ONE canonical 84 × 98 organism from the generated atlas BLOOM.plantArt, pack "organic-hybrid") → BLOOM.plantFx
// (GHOST / OUTLINE preview, GROW purchase, reduced-motion swap). Mapping, truthfully, with no mechanic invented:
//   GLOBAL GENOME   state.traits (cold heat drought flood salt rad seedOut earlyMat waterSeeds) → the authored anatomy and treatments.
//                   Identical traits give identical organism pixels on every surface (globalSignature()).
//   LOCAL COLONY    living · establishment · growth focus · local upgrade · condition · viable → a small deterministic PRESENTATION layer
//                   around the assembled organism (no authored sprite edited, no fake mutation, the genome signature untouched):
//                   condition warn / bad (living)  → the accepted "strained" posture (droop one authored angle) + stress tint
//                   establishment                  → up to 8 young sprouts on the soil line beside the plant (colony density)
//                   focus roots · rootNetwork      → extra procedural lateral roots (+ root nodules for the root network)
//                   focus leaves · leafCanopy      → the canopy one shade fuller (same material ramp: never wax, never pigment)
//                   focus seeds · seedReserve      → a seed bank: seeds resting in the topsoil
//                   no colony here                 → the organism thinned to a dither over its backdrop (a ghost of what would grow)
//                   viable false                   → a restrained desaturation (would not survive / the run was lost)
//   ENVIRONMENT     the pack's own specimen backdrop (sky / soil / turf), never re-coloured by a region; Terraform never reaches here.
// A real purchase (the page's bloom:upgrade-purchase) GROWS the change into the visible specimen once; every other render (first paint,
// region switch, hover preview, tick, report) paints the exact frame directly. Pixels are shown on one canvas scaled by a whole number,
// nearest-neighbour, centred and padded in the host box. Classic script; boots over file://; Node can require it (draw / describe).
(function (root) {
  "use strict";
  const PARTS = ["seedHead", "pigment", "flowers", "leafShape", "pods", "stem", "roots"]; // every anchor, top → bottom
  const PACK = "organic-hybrid";
  const ADAPT = ["pigment", "leafShape", "stem", "roots"], SPREAD = ["seedHead", "flowers", "pods"]; // tendril order per room: anchors keep it
  const GAP = 10;  // minimum logical px between neighbouring anchors (20 client px at 2×, 30 at 3×): the tendrils and their label plates need clear space
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const hex = h => [1, 3, 5].map(k => parseInt(h.slice(k, k + 2), 16));
  const hash = (a, b = 0) => { let h = Math.imul((a + 1) * 0x9e3779b1 ^ (b + 7) * 0x85ebca6b, 0x27d4eb2f) >>> 0; h ^= h >>> 15; return (h >>> 0) / 4294967296; };
  const fnv = arr => { let h = 0x811c9dc5; for (let i = 0; i < arr.length; i++) { h ^= arr[i]; h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(16).padStart(8, "0"); };
  const STRESS = [176, 150, 84], HALO = [255, 244, 200];
  const MOUNTED = [];   // every mounted specimen (QA reads them through BLOOM.plantSpecimen.mounted(); nothing writes through it)
  let fxSeq = 0;

  // ---------------------------------------------------------------- the accepted pipeline (resolved lazily: Node can require this file alone)
  let P = null;
  function pipe() {
    if (P) return P;
    const B = root.BLOOM || {}, PV = B.plantVisual, ART = B.plantArt, PC = B.plantCompositor, FX = B.plantFx;
    if (!PV || !PV.model || !PV.components || !ART || !PC || !FX) throw new TypeError("BLOOM.plantSpecimen: needs the plant sprite runtime (generated plant-atlas.js, plant-visual-model.js, plant-components.js, plant-compositor.js, plant-fx.js) loaded before it");
    if (!ART.packs[PACK]) throw new TypeError(`BLOOM.plantSpecimen: the generated atlas has no "${PACK}" pack`);
    const pack = ART.packs[PACK], MAT = ART.materials, MID = Object.fromEntries(MAT.map((m, i) => [m, i + 1]));
    const ramp = m => pack.palette[m].map(hex);
    // RULES: the accepted model reads the real trait data itself (the specimen reads no page global)
    P = { PV, ART, PC, FX, pack, MAT, MID, ramp, RULES: PV.model.rules(), W: ART.contract.canvas.w, H: ART.contract.canvas.h, soilY: ART.bodyPlan.crown[1], crownX: ART.bodyPlan.crown[0],
      env: { sky: pack.environment.sky.map(hex), soil: pack.environment.soil.map(hex) } };
    return P;
  }
  const frames = new Map();
  /** The global organism: real traits + the accepted condition axis → the compositor's canonical frame (cached). */
  function organism(traits, condition) {
    const p = pipe(), k = JSON.stringify([traits, condition]); let F = frames.get(k);
    if (!F) { if (frames.size > 96) frames.clear(); F = p.PC.render(p.PV.components.select(p.PV.model.normalize({ traits, condition }, p.RULES)), PACK); frames.set(k, F); }
    return F;
  }
  const genome = st => { const t = {}; for (const [id, v] of Object.entries((st && st.traits) || {})) if (v > 0) t[id] = v; return t; };
  /** Production state → the three frames' inputs: committed traits, previewed traits (or null), the accepted condition and the local colony. */
  function readState(st) {
    st = st || {}; const col = st.colony || {}, living = !!col.living, traits = genome(st);
    const pv = st.preview && st.preview.id ? Object.assign({}, traits, { [st.preview.id]: st.preview.tier }) : null;
    const cond = st.condition || "ok", strained = living && cond !== "ok";
    return { traits, preview: pv, condition: strained ? "strained" : "thriving",
      local: { living, establishment: living ? clamp(+col.establishment || 0, 0, 1) : 0, focus: st.focus || "balanced", up: st.local || null, viable: st.viable !== false, strained } };
  }

  // ---------------------------------------------------------------- the LOCAL presentation layer (around the organism; deterministic)
  function line(x0, y0, x1, y1, put) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1); for (let s = 0; s <= n; s++) put(Math.round(x0 + (x1 - x0) * s / n), Math.round(y0 + (y1 - y0) * s / n)); }
  /** Extra pixels the local colony adds: { i → [r, g, b], part }. Only on pixels the organism leaves empty; never changes the organism. */
  function localExtras(F, L) {
    const p = pipe(), W = F.W, out = new Map(), free = (x, y) => x >= 0 && y >= 0 && x < W && y < F.H && !F.plant.m[y * W + x] && !out.has(y * W + x);
    const add = (x, y, c, part) => { if (free(x, y)) out.set(y * W + x, { c, part }); };
    if (!L.living) return out;
    const root_ = p.ramp("root"), leaf = p.ramp("leaf"), seed = p.ramp("seed"), prim = F.skeleton.primary, D = prim.length - 1;
    // establishment: young sprouts beside the plant on the soil line (colony density)
    const SPOTS = [-30, 31, -22, 24, -36, 37, -15, 17], n = Math.round(L.establishment * SPOTS.length);
    for (let k = 0; k < n; k++) { const x = p.crownX + SPOTS[k], tall = hash(k, 31) > 0.5 ? 3 : 2;
      add(x, p.soilY - 1, leaf[1], null); add(x, p.soilY - 2, leaf[2], null); if (tall > 2) add(x + (k % 2 ? 1 : -1), p.soilY - 3, leaf[3], null); }
    // roots focus / root network: extra procedural lateral roots off the real primary root
    const roots = (L.focus === "roots" ? 2 : 0) + (L.up === "rootNetwork" ? 4 : 0);
    for (let k = 0; k < roots; k++) { const q = prim[clamp(Math.round(D * (0.3 + 0.17 * (k % 4))), 0, D)], side = k % 2 ? 1 : -1, len = 9 + Math.round(hash(k, 41) * 6), drop = 3 + (k >> 1);
      line(q.x, q.y + 1, q.x + side * len, q.y + 1 + drop, (x, y) => add(x, y, root_[k < 2 ? 1 : 2], "roots"));
      if (L.up === "rootNetwork") add(q.x + side * (len - 2), q.y + drop + 2, root_[3], "roots"); }
    // seeds focus / seed reserve: a seed bank resting in the topsoil
    const seeds = (L.focus === "seeds" ? 4 : 0) + (L.up === "seedReserve" ? 7 : 0);
    for (let k = 0, tries = 0; k < seeds && tries < 64; tries++) { const x = 6 + Math.round(hash(tries, 51) * (W - 13)), y = p.soilY + 3 + Math.round(hash(tries, 52) * 9);
      if (Math.abs(x - p.crownX) < 3 || !free(x, y) || !free(x + 1, y)) continue; add(x, y, seed[3], "seedHead"); add(x + 1, y, seed[1], "seedHead"); k++; }
    return out;
  }
  /** Apply the local layer to one organism picture (a compositor frame, a preview or an FX frame) of frame F. */
  function present(rgba, F, L, extras, part) {
    const p = pipe(), W = F.W, o = new Uint8ClampedArray(rgba), env = F.env, m = F.plant.m;
    const canopy = (L.up === "leafCanopy" ? 1 : 0) + (L.living && L.focus === "leaves" ? 1 : 0);
    if (canopy) { const R = {}; for (const mat of ["leaf", "waxLeaf", "pigLeaf"]) if (p.pack.palette[mat]) R[p.MID[mat]] = p.ramp(mat);
      const occ = rgbaKey(rgba, F);
      for (let i = 0; i < m.length; i++) { const v = m[i], r = v && R[v >> 2]; if (!r || !occ[i]) continue; const s = v & 3, lift = canopy >= 2 ? 1 : (s === 0 ? 1 : 0); if (!lift) continue;
        let c = r[Math.min(3, s + lift)]; if (L.strained) c = c.map((x, k) => Math.round(x + (STRESS[k] - x) * 0.3)); o[i * 4] = c[0]; o[i * 4 + 1] = c[1]; o[i * 4 + 2] = c[2]; } }
    for (const [i, e] of extras) { o[i * 4] = e.c[0]; o[i * 4 + 1] = e.c[1]; o[i * 4 + 2] = e.c[2]; }
    const plantPx = i => (m[i] && !sameAsEnv(rgba, env, i)) || extras.has(i);
    if (!L.living || !L.viable) for (let i = 0; i < m.length; i++) { if (!plantPx(i)) continue; const x = i % W, y = (i / W) | 0;
      if (!L.living && (x + y) % 2) { o[i * 4] = env[i * 4]; o[i * 4 + 1] = env[i * 4 + 1]; o[i * 4 + 2] = env[i * 4 + 2]; continue; }
      if (!L.viable) { const g = 0.3 * o[i * 4] + 0.59 * o[i * 4 + 1] + 0.11 * o[i * 4 + 2]; for (let k = 0; k < 3; k++) o[i * 4 + k] = Math.round(o[i * 4 + k] + (g + 8 - o[i * 4 + k]) * 0.55); } }
    if (part) { const on = part.mask; // highlight: the part keeps its colours and gets a 1-px halo; the rest of the plant dims toward the backdrop
      for (let i = 0; i < m.length; i++) { if (on[i]) continue; const x = i % W, y = (i / W) | 0;
        if (plantPx(i)) { for (let k = 0; k < 3; k++) o[i * 4 + k] = Math.round(o[i * 4 + k] + (env[i * 4 + k] - o[i * 4 + k]) * 0.58); continue; }
        if ((x > 0 && on[i - 1]) || (x < W - 1 && on[i + 1]) || (y > 0 && on[i - W]) || (i + W < m.length && on[i + W])) for (let k = 0; k < 3; k++) o[i * 4 + k] = HALO[k]; } }
    return o;
  }
  const sameAsEnv = (a, env, i) => a[i * 4] === env[i * 4] && a[i * 4 + 1] === env[i * 4 + 1] && a[i * 4 + 2] === env[i * 4 + 2];
  const rgbaKey = (rgba, F) => { const o = new Uint8Array(F.plant.m.length); for (let i = 0; i < o.length; i++) o[i] = F.plant.m[i] && !sameAsEnv(rgba, F.env, i) ? 1 : 0; return o; };

  // ---------------------------------------------------------------- logical parts on the real placements
  function partOf(pl) {
    const c = pl.component || "", s = pl.socket || "";
    if (pl.kind === "procedural") return c === "roots" ? ["roots"] : c === "stem" ? ["stem"] : c === "branch" ? [s.startsWith("pod.") ? "pods" : s.startsWith("flower.") ? "flowers" : "seedHead"] : [];
    if (c.startsWith("root.")) return ["roots"];
    if (c.startsWith("leaf.")) return ["leafShape", "pigment"];
    if (c.startsWith("salt.")) return ["pigment"];
    if (c.startsWith("frost.")) return ["stem"];
    if (c === "flower" || c === "bud.axil") return ["flowers"];
    if (c === "bud") return ["seedHead", "flowers"];
    if (c.startsWith("seedHead.") || c === "seed.drift") return ["seedHead"];
    if (c === "pod") return ["pods"];
    return [];
  }
  /** part → { mask, px [i…] } over the organism frame(s) + the local extras. */
  function partMasks(Fs, extras) {
    const W = Fs[0].W, N = Fs[0].plant.m.length, out = {}; for (const q of PARTS) out[q] = { mask: new Uint8Array(N), px: [] };
    const mark = (q, i) => { const e = out[q]; if (!e.mask[i]) { e.mask[i] = 1; e.px.push(i); } };
    for (const F of Fs) { const parts = F.placements.map(partOf); for (let i = 0; i < N; i++) { const o = F.plant.owner[i]; if (o && F.plant.m[i]) for (const q of parts[o - 1]) mark(q, i); } }
    for (const [i, e] of extras) if (e.part) mark(e.part, i);
    void W; return out;
  }
  /** Anchors in LOGICAL canvas px, on visible pixels of each part, kept in the rooms' top → bottom tendril order. */
  function anchorsOf(F, masks) {
    const W = F.W, at = i => ({ x: i % W, y: (i / W) | 0 }), so = F.skeleton.sockets, A = {};
    const nearest = (px, tx, ty, minY = -1) => { let best = null, bd = Infinity; for (const i of px) { const q = at(i); if (q.y < minY) continue; const d = Math.hypot(q.x - tx, (q.y - ty) * 1.3); if (d < bd) { bd = d; best = q; } } return best; };
    const centre = px => { let x = 0, y = 0; for (const i of px) { const q = at(i); x += q.x; y += q.y; } return px.length ? { x: x / px.length, y: y / px.length } : null; };
    const sock = k => so[k] ? { x: so[k].x, y: so[k].y } : null;
    const placementsOf = pred => F.placements.filter(pred).sort((a, b) => a.y0 - b.y0);
    const leaves = placementsOf(q => q.kind === "sprite" && (q.component || "").startsWith("leaf."));
    const leafPx = q => masks.leafShape.px.filter(i => { const p = at(i); return p.x >= q.x0 && p.x < q.x0 + q.w && p.y >= q.y0 && p.y < q.y0 + q.h; });
    const any = [...new Set([].concat(...PARTS.map(q => masks[q].px)))];   // an absent part's anchor snaps to the nearest visible anatomy
    const pick = (part, t, minY) => (masks[part].px.length && nearest(masks[part].px, t.x, t.y, minY)) || nearest(any, t.x, t.y, minY) || t;
    const top = leaves[0], mid = leaves[Math.floor((leaves.length - 1) / 2)] || top, stemPath = F.skeleton.stem.path;
    const want = {
      seedHead: (() => { const px = masks.seedHead.px; if (!px.length) return sock("apex"); let y = Infinity; for (const i of px) y = Math.min(y, at(i).y); const c = centre(px); return { x: c.x, y: y + 1 }; })(),
      flowers: centre(masks.flowers.px.filter(i => F.placements[F.plant.owner[i] - 1] && F.placements[F.plant.owner[i] - 1].component === "flower")) || centre(masks.flowers.px) || sock("flower.1"),
      pods: centre(masks.pods.px.filter(i => (F.placements[F.plant.owner[i] - 1] || {}).component === "pod")) || sock("pod.0"),
      pigment: top ? centre(leafPx(top)) : sock("leaf.5"),
      leafShape: mid ? centre(leafPx(mid)) : sock("leaf.2"),
      stem: (() => { const q = stemPath[Math.max(1, Math.round((stemPath.length - 1) * 0.25))]; return { x: q.x, y: q.y }; })(),
      roots: { x: F.skeleton.primary[0].x, y: F.skeleton.primary[0].y + 14 },
    };
    for (const order of [SPREAD, ADAPT]) { let prev = -Infinity;
      for (const part of order) { const t = want[part] || { x: F.W / 2, y: F.H / 2 }, q = pick(part, t, prev + GAP); A[part] = { x: q.x, y: Math.max(q.y, prev + GAP) }; prev = A[part].y; } }
    return A;
  }

  // ---------------------------------------------------------------- draw: production state → the displayed frame (pure)
  function draw(st, { highlight = null } = {}) {
    const p = pipe(), S = readState(st), cur = organism(S.traits, S.condition), tgt = S.preview ? organism(S.preview, S.condition) : null, shown = tgt || cur;
    const extras = localExtras(shown, S.local), masks = partMasks(tgt ? [cur, tgt] : [cur], extras);
    const base = tgt ? p.FX.preview(cur, tgt) : cur.rgba, hl = highlight && masks[highlight] ? masks[highlight] : null;
    const rgba = present(base, shown, S.local, extras, hl), anchors = anchorsOf(shown, masks);
    const global = organism(S.traits, "thriving");
    return { W: p.W, H: p.H, rgba, anchors, sig: fnv(rgba), globalSig: global.sig.anatomy, key: JSON.stringify([S, highlight]), pack: PACK,
      ghost: !S.local.living, stressed: S.local.strained, viable: S.local.viable, previewing: !!tgt, frame: cur, target: tgt, local: S.local, extras };
  }

  function describe(st) {
    const names = st.names || {}, owned = Object.keys(st.traits || {}).filter(id => st.traits[id] > 0).map(id => (names[id] || id) + (st.traits[id] > 1 ? " ×" + st.traits[id] : ""));
    const col = st.colony || {};
    return `Your plant${col.living ? "" : " (no colony here yet)"}${owned.length ? ": " + owned.join(", ") : ": no adaptations yet"}${st.preview ? `. Previewing ${names[st.preview.id] || st.preview.id}` : ""}${col.living && st.condition !== "ok" ? ". Stressed here" : ""}${st.viable === false ? ". Would not survive" : ""}.`;
  }

  function mount(host, { reducedMotion = () => false } = {}) {
    const life = new AbortController();   // (BLOOM-033) one run of many in the same document: dispose() releases the global listener
    const p = pipe(), box = document.createElement("div"); box.className = "ps"; box.dataset.pack = PACK; host.appendChild(box);
    const cv = document.createElement("canvas"); cv.className = "ps-canvas"; cv.width = p.W; cv.height = p.H; cv.setAttribute("role", "img"); cv.setAttribute("aria-label", "Your plant");
    const tag = document.createElement("span"); tag.className = "ps-tag"; tag.setAttribute("aria-hidden", "true"); tag.textContent = "PREVIEW";
    box.append(cv, tag);
    const ctx = cv.getContext("2d");
    let last = null, D = null, hl = null, k = 0, fit = "", anim = null, armed = false, committed = null, sig = "";
    const fx = { last: null };
    let shown = null;   // the last painted frame: repainted if the browser drops and restores the canvas's 2D context
    const paint = rgba => { shown = rgba; ctx.putImageData(new ImageData(new Uint8ClampedArray(rgba), p.W, p.H), 0, 0); };
    cv.addEventListener("contextrestored", () => { if (shown) paint(shown); });
    // whole-number nearest-neighbour scale, centred; the padding continues the pack's own sky / soil
    function layout() {
      const w = box.clientWidth, h = box.clientHeight; if (!w || !h) return k;
      const s = Math.max(1, Math.floor(Math.min(w / p.W, h / p.H))), key = `${w}x${h}`; if (key === fit && s === k) return k; fit = key; k = s;
      const cw = p.W * s, ch = p.H * s, left = Math.floor((w - cw) / 2), top = Math.floor((h - ch) / 2), soil = top + p.soilY * s, rgb = c => `rgb(${c.join(",")})`;
      Object.assign(cv.style, { width: cw + "px", height: ch + "px", left: left + "px", top: top + "px" });
      box.style.background = `linear-gradient(to bottom, ${rgb(p.env.sky[0])} 0, ${rgb(p.env.sky[0])} ${top}px, ${rgb(p.env.sky[1])} ${soil}px, ${rgb(p.env.soil[0])} ${soil}px, ${rgb(p.env.soil[1])} 100%)`;
      return k;
    }
    const ro = typeof ResizeObserver === "function" ? new ResizeObserver(() => layout()) : null; if (ro) ro.observe(box);
    const visible = () => box.isConnected && box.getClientRects().length > 0 && !box.closest("[hidden]");
    // a REAL purchase only (the page's own event); consumed by the very next render of a visible specimen
    document.addEventListener("bloom:upgrade-purchase", () => { if (visible()) armed = true; }, { signal: life.signal });
    function show() { if (!D) return; sig = D.sig; if (!anim) paint(D.rgba); }
    function render(st) {
      last = st; const S = readState(st); layout();
      D = draw(st, { highlight: hl });
      box.classList.toggle("previewing", D.previewing); box.classList.toggle("ghost", D.ghost); box.classList.toggle("stressed", D.stressed); box.classList.toggle("unviable", !D.viable);
      cv.setAttribute("aria-label", describe(st));
      const now = { core: organism(S.traits, S.condition), local: S.local, key: JSON.stringify([S.traits, S.condition]) }, from = committed;
      committed = now;
      if (armed) { armed = false;
        if (from && from.key !== now.key && !anim) {   // the committed organism changed because of a real purchase: GROW it in
          const extras = localExtras(now.core, now.local), mk = rgba => present(rgba, now.core, now.local, extras, null), targetSig = fnv(mk(now.core.rgba)); let endSig = null;
          anim = p.FX.purchase(from.core, now.core, { style: "grow", reducedMotion: !!reducedMotion(), onFrame: rgba => { const o = mk(rgba); endSig = fnv(o); paint(o); } })
            .then(r => { fx.last = Object.assign({ seq: ++fxSeq, endSig, targetSig, exact: endSig === targetSig }, r); anim = null; show(); return fx.last; });
          fx.last = { pending: true }; sig = D.sig; return; } }
      show();
    }
    function highlight(part) { const q = part ? [].concat(part)[0] : null; if (q === hl) return; hl = PARTS.includes(q) ? q : null; if (last) { D = draw(last, { highlight: hl }); show(); } }
    function anchorPoint(part) {
      if (!D || !D.anchors[part]) return null; layout(); const r = cv.getBoundingClientRect(); if (!r.width) return null;
      const a = D.anchors[part], s = r.width / p.W; return { x: r.left + (a.x + 0.5) * s, y: r.top + (a.y + 0.5) * s };
    }
    const inst = Object.freeze({ el: box, canvas: cv, svg: cv, render, highlight, anchorPoint,
      anchors: () => PARTS.map(q => ({ part: q, view: D ? D.anchors[q] : null, client: anchorPoint(q) })),
      signature: () => sig, globalSignature: () => D ? D.globalSig : null, scale: () => layout(), animating: () => !!anim,
      get state() { return last; }, get lastFx() { return fx.last; }, get highlighted() { return hl; }, parts: PARTS.slice(), pack: PACK,
      // (BLOOM-033) the owner (a room, the report) disposes its specimen with itself: listener, observer, element, and its MOUNTED entry
      dispose() { life.abort(); if (ro) ro.disconnect(); box.remove(); const i = MOUNTED.indexOf(inst); if (i >= 0) MOUNTED.splice(i, 1); } });
    MOUNTED.push(inst); return inst;
  }

  root.BLOOM = Object.assign(root.BLOOM || {}, { plantSpecimen: Object.freeze({ mount, draw, describe, mounted: () => MOUNTED.slice(), PARTS: Object.freeze(PARTS.slice()), PACK, version: 1, renderer: "organic-hybrid-sprite" }) });
})(typeof window !== "undefined" ? window : globalThis);
