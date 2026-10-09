// BLOOM — RETIRED / LEGACY: the provisional BLOOM-029C SVG plant specimen, kept ONLY as a developer reference for the plant sprite lab's
// comparison view (demos/plant-sprite-pipeline-lab.html). It is NOT the production plant: since BLOOM-032C, resources/run-ui/plant-specimen.js
// (BLOOM.plantSpecimen) renders the approved Organic Hybrid sprite organism, and no production page loads this file. It registers
// BLOOM.legacyPlantSpecimen (never BLOOM.plantSpecimen). The original 029C header follows, unchanged.
//
// (029C) BLOOM — production plant specimen (BLOOM-029C). docs/PRODUCTION_PLANT_ROOMS_v1.md §8.
//
// The authored, modular plant the Region Inspect / Adapt / Spread rooms show: stem, leaves, roots, a flower / seed area and a
// soil line, drawn as inline SVG from REAL state only — the owned tier of every real Adapt / Spread trait (content/traits.js
// through the run UI adapter), the real colony in the room's context region (status, establishment, growth focus, local
// upgrade) and the region's real condition (a restrained thriving / stressed / would-not-survive presentation). It owns no
// rule, price or mechanic, reads no page global and rolls no dice (a fixed hash places the small irregularities).
//
//   const sp = BLOOM.plantSpecimen.mount(host, { reducedMotion })
//   sp.render(state)                 // state: { traits {id → tier}, preview {id, tier} | null, colony {living, establishment, word},
//                                    //          focus, local, condition "ok" | "warn" | "bad", viable, names {id → trait name} }
//   sp.highlight(part | null)        // light one anatomy part (pigment · leafShape · stem · roots · seedHead · flowers · pods), dim the rest
//   sp.anchorPoint(part)             // → { x, y } in CLIENT px (the organic tendrils start here); null before the first render
//   sp.anchors()                     // → every anchor, top → bottom by part
//   sp.signature()                   // a hash of the drawn markup (QA: a trait must change the drawing)
//
// Real traits → visible anatomy (tier scales strength / quantity):
//   cold    frost hairs, a stouter shorter stem, fewer compact leaves       heat     waxy reflective leaves, pale cuticle
//   drought thick water-storing leaves + a deep taproot                     flood    air roots above the soil line, long narrow leaves
//   salt    salt crystals on the leaf tips                                   rad      dark protective leaf pigment
//   seedOut more / stronger seed puffs                                       earlyMat an early flower on the seed head
//   waterSeeds floating pods on the stem
// Terraform never touches this specimen.
// Classic script, no dependencies: boots over file://.
(function (root) {
  "use strict";
  const PARTS = ["seedHead", "pigment", "flowers", "leafShape", "pods", "stem", "roots"]; // every anchor, top → bottom
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const hex = h => [1, 3, 5].map(k => parseInt(h.slice(k, k + 2), 16));
  const mix = (a, b, t) => { const A = hex(a), B = hex(b); return "#" + A.map((v, k) => clamp(Math.round(v + (B[k] - v) * t), 0, 255).toString(16).padStart(2, "0")).join(""); };
  const hash = (a, b = 0) => { let h = Math.imul((a + 1) * 0x9e3779b1 ^ (b + 7) * 0x85ebca6b, 0x27d4eb2f) >>> 0; h ^= h >>> 15; return (h >>> 0) / 4294967296; };
  const f1 = n => (Math.round(n * 10) / 10).toString();
  const esc = t => String(t == null ? "" : t).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fnv = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(16); };
  const SOIL_Y = 168, CX = 100;

  // the drawing: pure, from the state; returns { markup, anchors { part → {x, y} in viewBox units } }
  function draw(st) {
    const T = Object.assign({}, st.traits || {}); if (st.preview && st.preview.id) T[st.preview.id] = st.preview.tier;
    const tier = id => T[id] || 0, has = id => tier(id) > 0;
    const cold = tier("cold"), heat = tier("heat"), drought = tier("drought"), flood = tier("flood"), salt = tier("salt"), rad = tier("rad");
    const seedOut = tier("seedOut"), earlyMat = tier("earlyMat"), waterSeeds = tier("waterSeeds");
    const col = st.colony || {}, living = !!col.living, est = living ? clamp(col.establishment || 0, 0, 1) : 0;
    const cond = st.condition || "ok", stressed = living && cond !== "ok", ghost = !living;
    const scale = living ? 0.58 + 0.42 * est : 0.52;
    const focus = st.focus || "balanced", local = st.local || null;
    const out = [], A = {}, K = 1.45; // the plant is drawn K× about the soil point (the card is mostly plant); anchors follow
    const g = (attrs, inner) => out.push(`<g ${attrs} transform="translate(${CX} ${SOIL_Y}) scale(${K}) translate(${-CX} ${-SOIL_Y})">${inner.join("")}</g>`);
    const scaled = p => ({ x: CX + (p.x - CX) * K, y: SOIL_Y + (p.y - SOIL_Y) * K });

    // ---- environment: a quiet sky band and the soil line (the region's condition tints them a little)
    const skyTop = cond === "bad" ? "#d9dde6" : cond === "warn" ? "#f3e7cf" : "#dff0f8", skyBot = cond === "bad" ? "#eef0f4" : cond === "warn" ? "#fbf4e4" : "#f3fafd";
    const soil = cond === "bad" ? "#a79a8a" : cond === "warn" ? "#b9966a" : "#8f6a42", turf = cond === "bad" ? "#b8b39f" : cond === "warn" ? "#b6c27a" : "#8cc46a";
    out.push(`<defs><linearGradient id="ps-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${skyTop}"/><stop offset="1" stop-color="${skyBot}"/></linearGradient></defs>`);
    out.push(`<rect class="ps-sky" x="0" y="0" width="200" height="240" fill="url(#ps-sky)"/>`);
    out.push(`<rect class="ps-soil" x="0" y="${SOIL_Y}" width="200" height="72" fill="${soil}"/>`);
    out.push(`<path class="ps-turf" d="M0 ${SOIL_Y - 1}Q25 ${SOIL_Y - 5} 50 ${SOIL_Y - 1}T100 ${SOIL_Y - 1}T150 ${SOIL_Y - 1}T200 ${SOIL_Y - 1}V${SOIL_Y + 5}H0Z" fill="${turf}"/>`);
    for (let k = 0; k < 7; k++) { const x = 12 + k * 29 + hash(k, 1) * 10, h = 4 + hash(k, 2) * 5; out.push(`<path d="M${f1(x)} ${SOIL_Y}l${f1(-2)} ${f1(-h)}M${f1(x)} ${SOIL_Y}l${f1(2.4)} ${f1(-h * 1.2)}" stroke="${turf}" stroke-width="1.3" fill="none" stroke-linecap="round"/>`); }
    if (waterSeeds) out.push(`<ellipse cx="46" cy="${SOIL_Y + 3}" rx="20" ry="3.5" fill="#7fb4d6" opacity=".85"/>`); // a little standing water: the pods float

    // ---- plant geometry
    const stemH = (64 + 28 * est) * scale / 0.8 * (1 - 0.07 * Math.min(cold, 3)) * (1 + 0.05 * Math.min(flood, 2));
    const topY = SOIL_Y - stemH, lean = stressed ? 9 : 0;
    const stemW = 4.4 + 1.1 * Math.min(cold, 3) + (drought ? 0.6 : 0);
    let stemCol = rad ? "#4e3d62" : heat ? "#7f9b74" : "#4f8a3a"; if (stressed) stemCol = mix(stemCol, "#9a8d4a", 0.45);
    let leafCol = "#5fae4a"; if (heat) leafCol = mix(leafCol, "#c9dcc3", 0.35 + 0.1 * Math.min(heat, 3)); if (rad) leafCol = mix(leafCol, "#5b2d78", 0.5 + 0.12 * Math.min(rad, 2));
    if (stressed) leafCol = mix(leafCol, "#b9b06a", 0.5);
    const leafShape = drought ? [16 * (1 + 0.08 * Math.min(drought, 3)), 11.5 * (1 + 0.1 * Math.min(drought, 3))] : flood ? [30, 5.2] : cold ? [13, 7] : [21, 8.2];
    const stemTopX = CX + lean;

    // ---- roots (anchor: Roots)
    { const R = []; const n = 4 + (focus === "roots" ? 3 : 0) + (local === "rootNetwork" ? 3 : 0);
      const spreadW = flood ? 2.7 : 1.9, lenK = flood ? 0.72 : 1;
      for (let k = 0; k < n; k++) { const a = (k / (n - 1 || 1) - 0.5) * spreadW, len = (24 + hash(k, 3) * 20) * scale * lenK;
        const ex = CX + Math.sin(a) * len * 1.3, ey = SOIL_Y + Math.cos(a) * len;
        R.push(`<path d="M${CX} ${SOIL_Y}Q${f1(CX + Math.sin(a) * len * 0.5)} ${f1(SOIL_Y + 6 + len * 0.3)} ${f1(ex)} ${f1(ey)}" stroke="#d8b58c" stroke-width="${local === "rootNetwork" ? 2.3 : 1.7}" fill="none" stroke-linecap="round"/>`); }
      if (local === "rootNetwork") for (let k = 0; k < 6; k++) R.push(`<circle cx="${f1(68 + k * 13 + hash(k, 4) * 6)}" cy="${f1(SOIL_Y + 22 + hash(k, 5) * 20)}" r="1.9" fill="#f1d7b0"/>`);
      if (drought) { const L = 34 + 9 * Math.min(drought, 3); R.push(`<path d="M${CX} ${SOIL_Y}Q${CX + 3} ${f1(SOIL_Y + L * 0.55)} ${CX - 2} ${f1(SOIL_Y + L)}" stroke="#e2c49c" stroke-width="${f1(3 + 0.5 * drought)}" fill="none" stroke-linecap="round"/>`); } // the taproot
      if (flood) for (let k = 0; k < 2 + Math.min(flood, 2); k++) { const x = CX + (k % 2 ? 1 : -1) * (7 + k * 4), h = 7 + hash(k, 6) * 5; // air roots: breathing stubs above the soil line
        R.push(`<path d="M${f1(x)} ${SOIL_Y + 2}V${f1(SOIL_Y - h)}" stroke="#c9a46a" stroke-width="2.6" fill="none" stroke-linecap="round"/><circle cx="${f1(x)}" cy="${f1(SOIL_Y - h)}" r="1.6" fill="#e8cfa0"/>`); }
      g(`class="ps-part" data-part="roots"`, R); A.roots = { x: CX + 10, y: SOIL_Y + 24 }; }

    // ---- stem (anchor: Stem)
    { const c1y = SOIL_Y - stemH * 0.5, d = `M${CX} ${SOIL_Y}C${f1(CX - 3)} ${f1(c1y)} ${f1(stemTopX + 3)} ${f1(topY + 16)} ${f1(stemTopX)} ${f1(topY)}`;
      const S = [`<path d="${d}" stroke="${stemCol}" stroke-width="${f1(stemW)}" fill="none" stroke-linecap="round"/>`];
      if (cold) for (let k = 0; k < 4 + 2 * Math.min(cold, 3); k++) { const t = 0.12 + (k / (4 + 2 * Math.min(cold, 3))) * 0.8, y = SOIL_Y - stemH * t, x = CX + lean * t; // frost hairs on the stem
        S.push(`<path d="M${f1(x - stemW / 2)} ${f1(y)}l-2.6 -1.4M${f1(x + stemW / 2)} ${f1(y - 1)}l2.6 -1.2" stroke="#ffffff" stroke-width=".9" fill="none" stroke-linecap="round" opacity=".95"/>`); }
      g(`class="ps-part" data-part="stem"`, S); A.stem = { x: CX + 2, y: SOIL_Y - stemH * 0.3 }; }

    // ---- leaves (anchor: Leaf shape) + pigment layer (anchor: Leaf pigment)
    { const LV = [], PG = [];
      const n = Math.max(3, 6 + (focus === "leaves" ? 2 : 0) + (local === "leafCanopy" ? 2 : 0) - (cold ? 1 : 0) - (focus === "seeds" ? 1 : 0));
      let topLeaf = null, midLeaf = null;
      for (let k = 0; k < n; k++) { const t = 0.2 + (k / n) * 0.72, side = k % 2 ? 1 : -1, y = SOIL_Y - stemH * t, x = CX + lean * t;
        const ang = side * (stressed ? 112 : 56 - t * 22), sz = (1 - t * 0.32) * scale * (local === "leafCanopy" ? 1.15 : 1), lw = leafShape[0] * sz, lh = leafShape[1] * sz;
        const tr = `translate(${f1(x)} ${f1(y)}) rotate(${f1(ang - 90 * side + (side > 0 ? 0 : 180))})`;
        const leaf = `M0 0Q${f1(lw * 0.5)} ${f1(-lh)} ${f1(lw)} 0Q${f1(lw * 0.5)} ${f1(lh)} 0 0Z`;
        LV.push(`<g transform="${tr}"><path d="${leaf}" fill="${leafCol}" stroke="${heat ? "#eef6ee" : "rgba(30,70,30,.35)"}" stroke-width="${heat ? 1.3 : 0.7}"/>` +
          `<path d="M1 0H${f1(lw - 2)}" stroke="rgba(20,60,20,.28)" stroke-width="${drought ? 1.4 : 0.7}"/>` +
          (heat ? `<ellipse cx="${f1(lw * 0.42)}" cy="${f1(-lh * 0.3)}" rx="${f1(lw * 0.22)}" ry="${f1(lh * 0.2)}" fill="#ffffff" opacity="${f1(0.4 + 0.1 * Math.min(heat, 3))}"/>` : "") +
          (drought ? `<ellipse cx="${f1(lw * 0.5)}" cy="${f1(-lh * 0.18)}" rx="${f1(lw * 0.3)}" ry="${f1(lh * 0.3)}" fill="#ffffff" opacity=".22"/>` : "") +
          (cold ? [1, 2, 3, 4].map(j => `<path d="M${f1(lw * j / 5)} ${f1(-lh * 0.6 * Math.sin(j / 5 * Math.PI))}l0 -2.2" stroke="#ffffff" stroke-width=".9" stroke-linecap="round"/>`).join("") : "") +
          (salt ? `<rect x="${f1(lw * 0.86)}" y="-1.3" width="2.6" height="2.6" fill="#ffffff" transform="rotate(45 ${f1(lw * 0.86 + 1.3)} 0)"/><circle cx="${f1(lw * 0.6)}" cy="${f1(lh * 0.25)}" r=".9" fill="#ffffff"/>` : "") + `</g>`);
        // pigment: protective dark spots with rad; otherwise the faint vein marks every leaf has
        PG.push(`<g transform="${tr}">` + (rad ? `<circle cx="${f1(lw * 0.36)}" cy="0" r="${f1(1.6 * sz + 0.4 * Math.min(rad, 2))}" fill="#3d2550"/><circle cx="${f1(lw * 0.64)}" cy="${f1(-lh * 0.1)}" r="${f1(1.2 * sz + 0.3 * Math.min(rad, 2))}" fill="#3d2550"/>`
          : `<path d="M${f1(lw * 0.3)} 0l${f1(lw * 0.15)} ${f1(-lh * 0.45)}M${f1(lw * 0.55)} 0l${f1(lw * 0.15)} ${f1(-lh * 0.4)}" stroke="rgba(20,60,20,.22)" stroke-width=".6"/>`) + `</g>`);
        const tip = { x: x + Math.cos((ang - 90 * side + (side > 0 ? 0 : 180)) * Math.PI / 180) * lw * 0.75, y: y + Math.sin((ang - 90 * side + (side > 0 ? 0 : 180)) * Math.PI / 180) * lw * 0.75 };
        if (k === n - 1 || (k === n - 2 && n > 3 && !topLeaf)) topLeaf = topLeaf || tip; if (k === Math.floor(n / 2) - 1 || (!midLeaf && k === Math.floor(n / 2))) midLeaf = midLeaf || tip; }
      for (const side of [-1, 1]) { const lw = leafShape[0] * scale * (cold ? 1.05 : 0.85), lh = leafShape[1] * scale * (cold ? 1.05 : 0.85); // basal rosette
        LV.push(`<g transform="translate(${CX} ${SOIL_Y - 1}) rotate(${side > 0 ? (stressed ? 14 : -12) : (stressed ? 166 : 192)})"><path d="M0 0Q${f1(lw * 0.5)} ${f1(-lh)} ${f1(lw)} 0Q${f1(lw * 0.5)} ${f1(lh)} 0 0Z" fill="${leafCol}" stroke="rgba(30,70,30,.35)" stroke-width=".7"/></g>`); }
      g(`class="ps-part" data-part="leafShape"`, LV); g(`class="ps-part ps-pigment" data-part="pigment"`, PG);
      A.pigment = { x: CX + 16, y: SOIL_Y - stemH * 0.95 }; A.leafShape = { x: CX - 18, y: SOIL_Y - stemH * 0.6 }; void topLeaf; void midLeaf; }

    // ---- seed head (anchor: Seed head), flowers (anchor: Flowers), pods (anchor: Pods)
    { const SH = [], FL = [], PD = []; const tx = stemTopX;
      const puffs = Math.min(seedOut, 3) + (focus === "seeds" ? 1 : 0) + (local === "seedReserve" ? 1 : 0);
      if (!puffs && !earlyMat) SH.push(`<ellipse cx="${f1(tx)}" cy="${f1(topY - 3)}" rx="3.4" ry="5.2" fill="#9ccf6a" stroke="#4f8a3a" stroke-width=".8"/>`); // a closed bud
      for (let k = 0; k < puffs; k++) { const px = tx + (k === 0 ? (earlyMat ? 13 : 0) : (k % 2 ? -1 : 1) * (11 + k * 4)), py = topY - (k === 0 ? (earlyMat ? -1 : 7) : 2 - k * 3), r = 6 + 0.9 * Math.min(seedOut, 3);
        if (k > 0 || earlyMat) SH.push(`<path d="M${f1(tx)} ${f1(topY + 5)}Q${f1((tx + px) / 2)} ${f1(py + 4)} ${f1(px)} ${f1(py)}" stroke="${stemCol}" stroke-width="1.3" fill="none"/>`);
        let rays = ""; for (let j = 0; j < 10 + 2 * Math.min(seedOut, 3); j++) { const a = j / (10 + 2 * Math.min(seedOut, 3)) * Math.PI * 2; rays += `<line x1="${f1(px)}" y1="${f1(py)}" x2="${f1(px + Math.cos(a) * r)}" y2="${f1(py + Math.sin(a) * r)}" stroke="#ffffff" stroke-width=".9"/>`; }
        SH.push(`<g>${rays}<circle cx="${f1(px)}" cy="${f1(py)}" r="${f1(r + 0.5)}" fill="rgba(255,255,255,.35)" stroke="#ffffff" stroke-width=".6"/><circle cx="${f1(px)}" cy="${f1(py)}" r="1.7" fill="#c9a46a"/></g>`); }
      if (earlyMat) { const cx = tx, cy = topY - 4; let pet = ""; for (let k = 0; k < 5 + Math.min(earlyMat, 2); k++) { const a = k / (5 + Math.min(earlyMat, 2)) * Math.PI * 2, px = cx + Math.cos(a) * 5.2, py = cy + Math.sin(a) * 5.2;
          pet += `<ellipse cx="${f1(px)}" cy="${f1(py)}" rx="4.2" ry="2.7" fill="#f19bb3" transform="rotate(${f1(a * 180 / Math.PI)} ${f1(px)} ${f1(py)})"/>`; }
        FL.push(`<g>${pet}<circle cx="${f1(cx)}" cy="${f1(cy)}" r="2.8" fill="#ffd65a"/></g>`); }
      else FL.push(`<path d="M${f1(tx - 2)} ${f1(topY + 9)}q2 -3 4 0" stroke="${leafCol}" stroke-width="1.1" fill="none"/>`); // the place a flower will open
      if (waterSeeds) for (const [s, t] of [[-1, 0.44], [1, 0.56]]) { const y = SOIL_Y - stemH * t, x = CX + lean * t, px = x + s * 10, py = y + 12; // floating pods
        PD.push(`<path d="M${f1(x)} ${f1(y)}q${f1(s * 6)} 2 ${f1(s * 9)} 8" stroke="${stemCol}" stroke-width="1.2" fill="none"/>` +
          `<ellipse cx="${f1(px)}" cy="${f1(py)}" rx="${f1(5 + 0.6 * Math.min(waterSeeds, 2))}" ry="4.2" fill="#9a6a3a" stroke="#6b4523" stroke-width=".8"/>` +
          `<path d="M${f1(px - 4)} ${f1(py + 6)}q4 2.2 8 0" stroke="#7fb4d6" stroke-width="1.1" fill="none"/>`); }
      else PD.push(`<circle cx="${f1(CX - 7 + lean * 0.45)}" cy="${f1(SOIL_Y - stemH * 0.45 + 9)}" r="1.4" fill="${stemCol}" opacity=".7"/>`); // a pod bud
      g(`class="ps-part" data-part="seedHead"`, SH); g(`class="ps-part" data-part="flowers"`, FL); g(`class="ps-part" data-part="pods"`, PD);
      A.seedHead = { x: tx, y: topY - 14 }; A.flowers = { x: tx + 12, y: topY + 14 }; A.pods = { x: CX - 12, y: SOIL_Y - stemH * 0.4 + 9 }; }

    for (const k of Object.keys(A)) A[k] = scaled(A[k]);
    return { markup: out.join(""), anchors: A, ghost, stressed, viable: st.viable !== false };
  }

  function describe(st) {
    const names = st.names || {}, owned = Object.keys(st.traits || {}).filter(id => st.traits[id] > 0).map(id => (names[id] || id) + (st.traits[id] > 1 ? " ×" + st.traits[id] : ""));
    const col = st.colony || {};
    return `Your plant${col.living ? "" : " (no colony here yet)"}${owned.length ? ": " + owned.join(", ") : ": no adaptations yet"}${st.preview ? `. Previewing ${names[st.preview.id] || st.preview.id}` : ""}${col.living && st.condition !== "ok" ? ". Stressed here" : ""}.`;
  }

  function mount(host, { reducedMotion = () => false } = {}) {
    const box = document.createElement("div"); box.className = "ps"; host.appendChild(box);
    box.innerHTML = `<svg class="ps-svg" viewBox="0 0 200 240" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Your plant"></svg><span class="ps-tag" aria-hidden="true">PREVIEW</span>`;
    const svg = box.querySelector("svg"); let anchors = null, key = "", sig = "", hl = null, last = null, cur = null;
    function render(st) {
      const d = draw(st), k = d.markup; last = st;
      box.classList.toggle("previewing", !!(st.preview && st.preview.id)); box.classList.toggle("ghost", d.ghost); box.classList.toggle("stressed", d.stressed); box.classList.toggle("unviable", !d.viable);
      anchors = d.anchors;
      if (k !== key) { key = k; sig = fnv(k);
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g"); g.setAttribute("class", "ps-layer"); g.innerHTML = k;
        if (cur && !reducedMotion()) { const old = cur; g.setAttribute("opacity", "0"); svg.appendChild(g); void g.getBoundingClientRect(); g.setAttribute("opacity", "1"); old.setAttribute("opacity", "0"); setTimeout(() => old.remove(), 420); }
        else { if (cur) cur.remove(); svg.appendChild(g); }
        cur = g; }
      svg.setAttribute("aria-label", describe(st)); applyHl();
    }
    function applyHl() { svg.querySelectorAll(".ps-part").forEach(p => { const on = hl && hl.includes(p.dataset.part); p.classList.toggle("hl", !!on); p.classList.toggle("dim", !!hl && !on); }); }
    function highlight(part) { hl = part ? [].concat(part) : null; applyHl(); }
    function toClient(p) { const m = svg.getScreenCTM(); if (!m) return null; const pt = svg.createSVGPoint(); pt.x = p.x; pt.y = p.y; const q = pt.matrixTransform(m); return { x: q.x, y: q.y }; }
    const anchorPoint = part => anchors && anchors[part] ? toClient(anchors[part]) : null;
    return Object.freeze({ el: box, svg, render, highlight, anchorPoint, anchors: () => PARTS.map(p => ({ part: p, view: anchors ? anchors[p] : null, client: anchorPoint(p) })),
      signature: () => sig, get state() { return last; }, parts: PARTS.slice() });
  }

  root.BLOOM = Object.assign(root.BLOOM || {}, { legacyPlantSpecimen: Object.freeze({ mount, draw, describe, PARTS: Object.freeze(PARTS.slice()), version: 1, legacy: "BLOOM-029C SVG (retired)" }) });
})(typeof window !== "undefined" ? window : globalThis);
