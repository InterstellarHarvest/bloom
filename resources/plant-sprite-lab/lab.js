// BLOOM — Plant Sprite Pipeline Proof page (BLOOM-032B1; BLOOM-032B2 adds the FINAL Organic Hybrid art). docs/PLANT_SPRITE_PIPELINE_v1.md §9.
// A review page, not gameplay: the PMO-approved ORGANIC HYBRID — FINAL ART pack through every locked Organic Hybrid state in the accepted
// compositor; the same build re-skinned by swapping only the art pack (the three TEMPORARY PIPELINE PROOF packs: proof, proof-angular,
// proof-round); the current production SVG for reference (and the "Final vs production SVG" view: the two side by side on the identical
// state); every production placement size, the ghost / outline preview and the grow / dissolve purchase FX. Reads the real trait data for ids, names and
// legal tiers; never changes BLOOM_DATA, a price, a mechanic or the production UI. "Purchase" is a visual state change only.
//
// Keys: 1–9 the first nine presets · V preview on/off · B purchase · R reduced motion · C final vs production SVG.   QA: window.PLANT_PIPELINE_LAB.
(function () {
  "use strict";
  const PV = BLOOM.plantVisual, PC = BLOOM.plantCompositor, FX = BLOOM.plantFx, ART = BLOOM.plantArt, PS = BLOOM.plantSpecimen, D = BLOOM_DATA;
  const RULES = PV.model.rules(D), NAMES = Object.fromEntries(Object.values(RULES.byId).map(t => [t.id, t.name]));
  const FINAL = "organic-hybrid", CANVAS = ART.contract.canvas, PRIMARY = ART.packs[FINAL] ? FINAL : "proof";
  const PACKS = [PRIMARY, ...["proof", "proof-angular", "proof-round"].filter(p => p !== PRIMARY && ART.packs[p]), ...ART.packOrder.filter(p => ![PRIMARY, "proof", "proof-angular", "proof-round"].includes(p))];
  const isFinal = pack => pack === FINAL;
  const PRESETS = [
    { id: "base", name: "BASE", traits: {} },
    { id: "cold1", name: "COLD T1", traits: { cold: 1 } }, { id: "cold2", name: "COLD T2", traits: { cold: 2 } }, { id: "cold3", name: "COLD T3", traits: { cold: 3 } },
    { id: "heat1", name: "HEAT T1", traits: { heat: 1 } }, { id: "heat2", name: "HEAT T2", traits: { heat: 2 } }, { id: "heat3", name: "HEAT T3", traits: { heat: 3 } },
    { id: "cold2heat1", name: "COLD T2 + HEAT T1", traits: { cold: 2, heat: 1 } },
    { id: "drought1", name: "DROUGHT T1", traits: { drought: 1 } }, { id: "drought2", name: "DROUGHT T2", traits: { drought: 2 } }, { id: "drought3", name: "DROUGHT T3", traits: { drought: 3 } }, { id: "drought4", name: "DROUGHT T4 (= T3 art)", traits: { drought: 4 } },
    { id: "flood1", name: "FLOOD T1", traits: { flood: 1 } }, { id: "flood2", name: "FLOOD T2", traits: { flood: 2 } }, { id: "flood3", name: "FLOOD T3", traits: { flood: 3 } }, { id: "flood4", name: "FLOOD T4 (= T3 art)", traits: { flood: 4 } },
    { id: "salt", name: "SALT", traits: { salt: 1 } }, { id: "rad", name: "RADIATION", traits: { rad: 1 } },
    { id: "seed1", name: "SEED OUTPUT T1", traits: { seedOut: 1 } }, { id: "seed2", name: "SEED OUTPUT T2", traits: { seedOut: 2 } },
    { id: "early", name: "EARLY MATURITY", traits: { earlyMat: 1 } }, { id: "water", name: "WATERBORNE SEEDS", traits: { waterSeeds: 1 } },
    { id: "drought3heat3", name: "DROUGHT T3 + HEAT T3", traits: { drought: 3, heat: 3 } }, { id: "flood3heat3", name: "FLOOD T3 + HEAT T3", traits: { flood: 3, heat: 3 } },
    { id: "cold2salt", name: "COLD T2 + SALT", traits: { cold: 2, salt: 1 } }, { id: "drought2rad", name: "DROUGHT T2 + RADIATION", traits: { drought: 2, rad: 1 } },
    { id: "earlySeed2", name: "EARLY MATURITY + SEED OUTPUT T2", traits: { earlyMat: 1, seedOut: 2 } },
    { id: "allRepro", name: "ALL REPRODUCTIVE", traits: { earlyMat: 1, seedOut: 2, waterSeeds: 1 } },
    { id: "maxDry", name: "MAXIMAL LEGAL DRY", traits: { cold: 2, heat: 1, drought: 3, salt: 1, rad: 1, seedOut: 2, earlyMat: 1, waterSeeds: 1 } },
    { id: "maxWet", name: "MAXIMAL LEGAL WET", traits: { cold: 2, heat: 1, flood: 3, salt: 1, rad: 1, seedOut: 2, earlyMat: 1, waterSeeds: 1 } },
  ];
  // the production placements (measured specimen boxes in the real rooms and the report — docs §2)
  const PLACEMENTS = [
    { id: "native", label: "Native logical", w: CANVAS.w, h: CANVAS.h, fixed: 1 },
    { id: "room1024", label: "Adapt / Spread / Region · 1024×768", w: 205, h: 237 },
    { id: "room1280", label: "Adapt / Spread / Region · 1280×800", w: 258, h: 298 },
    { id: "room1440", label: "Adapt / Spread / Region · 1440×900", w: 290, h: 335 },
    { id: "journal", label: "Field Journal report", w: 296, h: 342 },
  ];
  const PROPOSE = ["cold", "heat", "drought", "flood", "salt", "rad", "seedOut", "earlyMat", "waterSeeds"];
  const rmOS = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  const S = { view: "compare", preset: "base", traits: {}, condition: "thriving", placement: "room1280", pack: PRIMARY, propose: "cold", preview: false, fx: "grow", reducedMotion: rmOS, busy: false };
  const LAB = window.PLANT_PIPELINE_LAB = { S, PRESETS, PLACEMENTS, PACKS, errors: [], ready: false, renders: 0, lastPurchase: null };
  addEventListener("error", e => LAB.errors.push(String(e.message)));
  addEventListener("unhandledrejection", e => LAB.errors.push(String(e.reason && e.reason.message || e.reason)));
  const $ = s => document.querySelector(s), el = (t, a = {}, ...kids) => { const e = document.createElement(t); for (const [k, v] of Object.entries(a)) { if (k === "class") e.className = v; else if (k.startsWith("on")) e.addEventListener(k.slice(2), v); else if (v !== null && v !== undefined && v !== false) e.setAttribute(k, v === true ? "" : v); } for (const c of kids.flat()) if (c !== null && c !== undefined) e.append(c); return e; };

  // ---------------------------------------------------------------- state → model → selection → frame
  const cache = new Map();
  const selection = (traits, condition = S.condition) => PV.components.select(PV.model.normalize({ traits, condition }, RULES));
  function frame(pack, traits = S.traits, condition = S.condition) {
    const k = pack + JSON.stringify([traits, condition]); if (!cache.has(k)) { if (cache.size > 200) cache.clear(); cache.set(k, PC.render(selection(traits, condition), pack)); } return cache.get(k);
  }
  /** The next tier a real purchase of this trait could add (real legal rules; the uncapped water arms stop at the authored T3 art cap). */
  function nextTier(id, traits = S.traits) { const r = RULES.byId[id], cur = traits[id] || 0, cap = r.max === null ? PV.model.VISUAL_CAP : r.max;
    if (cur >= cap) return null; const t = { ...traits, [id]: cur + 1 }; return PV.model.validate(t, RULES).legal ? cur + 1 : null; }
  const proposed = () => { const t = nextTier(S.propose); return t === null ? null : { ...S.traits, [S.propose]: t }; };

  // ---------------------------------------------------------------- canvases (repaint if the browser restores a lost 2D context)
  function canvasFor(rgba, k, attrs) { const cv = el("canvas", { width: CANVAS.w, height: CANVAS.h, role: "img", ...attrs }); cv.style.width = CANVAS.w * k + "px"; cv.style.height = CANVAS.h * k + "px";
    cv._rgba = rgba; PC.paint(cv, rgba, CANVAS.w, CANVAS.h); cv.addEventListener("contextrestored", () => PC.paint(cv, cv._rgba, CANVAS.w, CANVAS.h)); return cv; }
  const paintTo = (cv, rgba) => { cv._rgba = rgba; PC.paint(cv, rgba, CANVAS.w, CANVAS.h); };
  const sigOf = cv => PC.fnv(cv.getContext("2d").getImageData(0, 0, cv.width, cv.height).data);
  const scaleFor = P => P.fixed || Math.max(1, Math.floor(Math.min(P.w / CANVAS.w, P.h / CANVAS.h)));

  function packPanel(pack, P, role = "live") {
    const cur = frame(pack), tgtT = S.preview ? proposed() : null, k = scaleFor(P), A = ART.packs[pack];
    const rgba = tgtT ? FX.preview(cur, frame(pack, tgtT)) : cur.rgba;
    const cv = canvasFor(rgba, k, { "data-pack": pack, "data-placement": P.id, "data-role": role, "aria-label": `${A.title}: ${P.label}` });
    return el("div", { class: "panel" + (isFinal(pack) ? " final" : ""), "data-panel": pack, style: `width:${P.w + 18}px` },
      el("h4", {}, el("span", {}, isFinal(pack) ? "ORGANIC HYBRID — FINAL ART" : "TEMPORARY PIPELINE PROOF"), el("em", {}, A.title)), el("span", { class: "tag" + (isFinal(pack) ? " ok" : "") }, A.status),
      el("div", { class: "box", style: `width:${P.w}px;height:${P.h}px` }, cv),
      el("span", { class: "meta" }, `${CANVAS.w}×${CANVAS.h} @ ${k}× · ${P.label}${tgtT ? " · preview: ghost / outline" : ""}`));
  }
  function productionPanel(P) {
    const box = el("div", { class: "box", style: `width:${P.w}px;height:${P.h}px` }), sp = PS.mount(box, { reducedMotion: () => true });
    const pv = S.preview && proposed() ? { id: S.propose, tier: nextTier(S.propose) } : null;
    sp.render({ traits: { ...S.traits }, preview: pv, colony: { living: true, establishment: 1, word: "" }, focus: "balanced", local: null, condition: S.condition === "strained" ? "warn" : "ok", viable: true, names: NAMES });
    LAB.production = sp;
    return el("div", { class: "panel", "data-panel": "production", style: `width:${P.w + 18}px` }, el("h4", {}, el("span", {}, "CURRENT PRODUCTION"), el("em", {}, "plant-specimen.js (SVG)")), el("span", { class: "tag" }, "unchanged reference"), box, el("span", { class: "meta" }, P.label));
  }

  function render() {
    LAB.renders++; const stage = $("#stage"); stage.textContent = "";
    const sel = selection(S.traits), owned = Object.entries(S.traits).filter(([, v]) => v).map(([k, v]) => `${NAMES[k]} T${v}`), tgt = proposed();
    stage.append(el("p", { class: "summary" }, el("b", {}, "Build: "), owned.join(" · ") || "no traits", "   ", el("b", {}, "Components: "), sel.components.join(", "),
      sel.treatments.length ? ["   ", el("b", {}, "Treatments: "), sel.treatments.map(t => t.id === "wax" ? `wax L${t.level}` : t.id).join(", ")] : "", "   ", el("b", {}, "Layout: "), sel.layout,
      S.preview ? ["   ", el("b", {}, "Previewing: "), tgt ? `${NAMES[S.propose]} → T${nextTier(S.propose)}` : `${NAMES[S.propose]}: no further authored tier`] : ""));
    const P = PLACEMENTS.find(p => p.id === S.placement);
    if (S.view === "final") {
      const Q = PLACEMENTS.find(p => p.id === "room1440");
      stage.append(el("div", { class: "cols" }, packPanel(PRIMARY, Q), productionPanel(Q)));
      stage.append(el("p", { class: "legend" }, `${isFinal(PRIMARY) ? "ORGANIC HYBRID — FINAL ART" : "(final art pack missing)"} beside the CURRENT PRODUCTION SVG (resources/run-ui/plant-specimen.js, unchanged), both fed the identical build, condition and preview — at the 1440×900 room size. Not yet used by the game: production replacement is a later, separately reviewed step.`));
    } else if (S.view === "compare") {
      stage.append(el("div", { class: "cols" }, PACKS.map(p => packPanel(p, P)), productionPanel(P)));
      stage.append(el("p", { class: "legend" }, `One build, one renderer, ${PACKS.length} art packs. Each pack is only a PNG atlas + its JSON metadata (art/plant/packs/<pack>/); swapping it changes the whole visual family — palette, silhouettes, outline — without touching any renderer code. ${isFinal(PRIMARY) ? "ORGANIC HYBRID is the PMO-approved FINAL art; the other packs are TEMPORARY PIPELINE PROOF art." : "All packs are TEMPORARY PIPELINE PROOF art."}`));
    } else if (S.view === "placements") {
      stage.append(el("div", { class: "cols" }, PLACEMENTS.map(Q => packPanel(S.pack, Q, "placement")), packPanel(S.pack, { ...PLACEMENTS[0], id: "zoom4", label: "Native × 4 (nearest-neighbour)", fixed: 4, w: CANVAS.w * 4, h: CANVAS.h * 4 }, "placement")));
      stage.append(el("p", { class: "legend" }, `The same ${CANVAS.w}×${CANVAS.h} organism at every production placement: each UI scales the one canvas by a whole number (nearest-neighbour) and pads it — the anatomy is never re-laid-out.`));
    } else {
      stage.append(el("div", { class: "sheet" }, PRESETS.map(pr => { const f = frame(S.pack, pr.traits), cv = canvasFor(f.rgba, 2, { "data-pack": S.pack, "data-preset": pr.id, "data-role": "sheet", "aria-label": pr.name });
        return el("div", { class: "panel", "data-sheet": pr.id }, el("h4", {}, el("span", {}, pr.name)), el("div", { class: "box" }, cv), el("span", { class: "meta" }, selection(pr.traits).components.length + " components")); })));
      stage.append(el("p", { class: "legend" }, `Every locked Organic Hybrid state (incl. Cold + Heat, the T4 = T3 art cap and the maximal legal dry / wet organisms) in the ${ART.packs[S.pack].title} pack at 2×.`));
    }
    renderBar();
  }

  // ---------------------------------------------------------------- purchase (visual only)
  async function purchase() {
    const tgtT = proposed(); if (S.busy || !tgtT) return null; S.busy = true; renderBar();
    const jobs = [...document.querySelectorAll("canvas[data-role=live], canvas[data-role=placement]")].map(cv => { const pack = cv.dataset.pack, cur = frame(pack), tgt = frame(pack, tgtT);
      return FX.purchase(cur, tgt, { style: S.fx, reducedMotion: S.reducedMotion, onFrame: rgba => paintTo(cv, rgba) })
        .then(r => ({ pack, placement: cv.dataset.placement, ...r, endSig: sigOf(cv), targetSig: PC.fnv(tgt.rgba) })); });
    const res = await Promise.all(jobs);
    LAB.lastPurchase = { trait: S.propose, tier: tgtT[S.propose], style: S.reducedMotion ? "reduced" : S.fx, results: res };
    S.traits = tgtT; S.preset = null; S.busy = false; S.preview = false; render(); return LAB.lastPurchase;
  }

  // ---------------------------------------------------------------- controls
  function setPreset(id) { const p = PRESETS.find(x => x.id === id); if (!p) return; S.preset = id; S.traits = { ...p.traits }; render(); }
  const btn = (label, pressed, on, attrs = {}) => el("button", { type: "button", "aria-pressed": pressed === null ? null : String(!!pressed), onclick: on, ...attrs }, label);
  function renderBar() {
    const bar = $("#bar"); bar.textContent = "";
    bar.append(el("div", { class: "grp", id: "presets" }, el("span", {}, "Locked states"), PRESETS.map((p, k) => btn(`${k < 9 ? k + 1 + " " : ""}${p.name}`, S.preset === p.id, () => setPreset(p.id), { "data-preset": p.id }))));
    bar.append(el("div", { class: "grp" }, el("span", {}, "Condition"), ["thriving", "strained"].map(c => btn(c, S.condition === c, () => { S.condition = c; render(); }, { "data-condition": c }))));
    if (S.view === "compare") bar.append(el("div", { class: "grp" }, el("span", {}, "Placement"), PLACEMENTS.map(P => btn(P.label.replace("Adapt / Spread / Region · ", "Room "), S.placement === P.id, () => { S.placement = P.id; render(); }, { "data-placement": P.id }))));
    if (S.view !== "compare") bar.append(el("div", { class: "grp" }, el("span", {}, "Pack"), PACKS.map(p => btn(p, S.pack === p, () => { S.pack = p; render(); }, { "data-pack-pick": p }))));
    const nt = nextTier(S.propose);
    bar.append(el("div", { class: "grp" }, el("span", {}, "Propose"), el("select", { id: "propose", onchange: e => { S.propose = e.target.value; render(); } },
        PROPOSE.map(id => { const t = nextTier(id); return el("option", { value: id, selected: S.propose === id }, `${NAMES[id]}${t === null ? " (no further authored tier)" : " → T" + t}`); })),
      btn("Preview (V)", S.preview, () => { S.preview = !S.preview; render(); }, { id: "previewBtn", disabled: nt === null && !S.preview }),
      ["grow", "dissolve"].map(f => btn(f, S.fx === f, () => { S.fx = f; renderBar(); }, { "data-fx": f })),
      el("button", { type: "button", class: "buy", id: "buy", disabled: S.busy || nt === null, onclick: () => purchase() }, S.busy ? "Mutating…" : "Purchase (B) — visual only"),
      el("label", {}, el("input", { type: "checkbox", id: "rm", checked: S.reducedMotion, onchange: e => { S.reducedMotion = e.target.checked; } }), " reduced motion")));
    document.querySelectorAll("#views button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.view === S.view)));
  }
  function head() { $("#views").append(...[["final", "Final vs production SVG (C)"], ["compare", "Pipeline + pack swap"], ["placements", "All placements"], ["sheet", "All locked states"]].map(([v, l]) => btn(l, S.view === v, () => { S.view = v; render(); }, { "data-view": v }))); }
  addEventListener("keydown", e => { const t = e.target; if (e.metaKey || e.ctrlKey || e.altKey || (t && t.tagName === "SELECT")) return;
    if (/^[1-9]$/.test(e.key)) setPreset(PRESETS[+e.key - 1].id); else if (e.key === "v" || e.key === "V") { if (proposed() || S.preview) { S.preview = !S.preview; render(); } }
    else if (e.key === "b" || e.key === "B") purchase(); else if (e.key === "r" || e.key === "R") { S.reducedMotion = !S.reducedMotion; renderBar(); }
    else if (e.key === "c" || e.key === "C") { S.view = S.view === "final" ? "compare" : "final"; render(); } else return; e.preventDefault(); });

  Object.assign(LAB, { set(patch) { Object.assign(S, patch); render(); return S; }, setPreset, render, purchase, frame, selection, nextTier, proposed,
    canvasSig: sel => { const cv = document.querySelector(sel); return cv ? sigOf(cv) : null; }, canvasSigs: sel => [...document.querySelectorAll(sel)].map(cv => ({ pack: cv.dataset.pack, placement: cv.dataset.placement, sig: sigOf(cv), w: cv.width, h: cv.height, cssW: cv.getBoundingClientRect().width, cssH: cv.getBoundingClientRect().height })) });
  head(); render(); LAB.ready = true;
})();
