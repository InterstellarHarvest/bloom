// BLOOM — Plant Evolution Visual Lab (BLOOM-032A): the owner-facing comparison page for the four plant-visual concepts.
// docs/PLANT_EVOLUTION_VISUAL_LAB_v1.md. A DESIGN LAB, not gameplay: it keeps its own visual-state object, reads the real trait
// data (BLOOM_DATA, content/traits.js) for ids / names / legal tiers, and never changes BLOOM_DATA, a price, a mechanic or the
// production UI. "Purchase mutation" is a visual state change only.
//
// Keys: 1 / 2 / 3 / 4 concept · C compare · P cycle presets · R reduced motion.
// QA: window.PLANT_LAB (state, set(), frame(), purchase(), canvas signatures, production reference signature).
(function () {
  "use strict";
  const PV = BLOOM.plantVisual, D = BLOOM_DATA, RULES = PV.model.rules(D), CONCEPTS = PV.concepts.list, PS = BLOOM.plantSpecimen;
  const NAMES = Object.fromEntries(RULES.traits.map(t => [t.id, t.name]));
  const ADAPT = PV.model.ADAPT, SPREAD = PV.model.SPREAD;
  const REGIONS = { temperate: { label: "Temperate meadow", temp: 14, moist: 50 }, cold: { label: "Cold tundra", temp: -6, moist: 42 }, hot: { label: "Hot desert", temp: 34, moist: 14 },
    wet: { label: "Wetland", temp: 18, moist: 86 }, salt: { label: "Salt flat", temp: 22, moist: 30, soil: "saline" } };
  const GENOME_LOCAL = { cold: 1, drought: 1, seedOut: 1 };
  const PRESETS = [
    { id: "base", name: "BASE — no traits", traits: {}, region: "temperate" },
    { id: "cold", name: "COLD SPECIALIST — Cold ×3", traits: { cold: 3 }, region: "cold" },
    { id: "heat", name: "HEAT SPECIALIST — Heat ×3", traits: { heat: 3 }, region: "hot" },
    { id: "dry", name: "DRY SPECIALIST — Drought ×3", traits: { drought: 3 }, region: "hot" },
    { id: "wet", name: "WET SPECIALIST — Flood ×3", traits: { flood: 3 }, region: "wet" },
    { id: "protected", name: "PROTECTED — Salt + Radiation", traits: { salt: 1, rad: 1 }, region: "salt" },
    { id: "disperser", name: "DISPERSER — Seed Output ×2 + Early Maturity + Waterborne", traits: { seedOut: 2, earlyMat: 1, waterSeeds: 1 }, region: "wet" },
    { id: "generalist", name: "COLD + HEAT GENERALIST — Cold ×2 + Heat ×1", traits: { cold: 2, heat: 1 }, region: "temperate" },
    { id: "complexA", name: "COMPLEX A — Cold ×2, Drought ×2, Salt, Rad, Seed Output", traits: { cold: 2, drought: 2, salt: 1, rad: 1, seedOut: 1 }, region: "cold" },
    { id: "complexB", name: "COMPLEX B — Heat ×2, Flood ×2, Rad, Seed Output ×2, Early Maturity", traits: { heat: 2, flood: 2, rad: 1, seedOut: 2, earlyMat: 1 }, region: "wet" },
    { id: "maximal", name: "MAXIMAL LEGAL — every trait, deep", traits: { cold: 2, heat: 1, drought: 3, salt: 1, rad: 1, seedOut: 2, earlyMat: 1, waterSeeds: 1 }, region: "hot" },
    { id: "localRoots", name: "LOCAL ROOT COLONY — genome + Roots + Root Network", traits: GENOME_LOCAL, focus: "roots", local: "rootNetwork", region: "temperate" },
    { id: "localLeaves", name: "LOCAL LEAF COLONY — genome + Leaves + Leaf Canopy", traits: GENOME_LOCAL, focus: "leaves", local: "leafCanopy", region: "temperate" },
    { id: "localSeeds", name: "LOCAL SEED COLONY — genome + Seeds + Seed Reserve", traits: GENOME_LOCAL, focus: "seeds", local: "seedReserve", region: "temperate" },
  ];
  const ROOM_BOXES = [["Adapt · Spread · Region — 1024×768", 205, 237], ["Rooms — 1280×800", 258, 298], ["Rooms — 1440×900", 290, 335], ["Field Journal report", 296, 342]];
  const rmOS = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  const S = { concept: "A", mode: "single", preset: "base", traits: {}, est: 1, condition: "thriving", focus: "balanced", local: null, region: "temperate",
    terraform: { warm: 0, cool: 0, humid: 0, dry: 0 }, preview: null, previewOn: true, previewStyle: "auto", fxStyle: "auto", reducedMotion: rmOS, impossible: false, res: { A: 0, B: 0, C: 0, D: 0 }, busy: false };
  const LAB = window.PLANT_LAB = { S, RULES, PRESETS, REGIONS, ROOM_BOXES, errors: [], ready: false, lastPurchase: null, renders: 0 };
  addEventListener("error", e => LAB.errors.push(String(e.message)));
  addEventListener("unhandledrejection", e => LAB.errors.push(String(e.reason && e.reason.message || e.reason)));
  const $ = (s, r = document) => r.querySelector(s), el = (t, a = {}, ...kids) => { const e = document.createElement(t); for (const [k, v] of Object.entries(a)) { if (k === "class") e.className = v; else if (k.startsWith("on")) e.addEventListener(k.slice(2), v); else if (v !== null && v !== undefined && v !== false) e.setAttribute(k, v === true ? "" : v); } for (const c of kids.flat()) if (c !== null && c !== undefined) e.append(c); return e; };

  // ---------------------------------------------------------------- state → model → frames
  function input(traits) { const R = REGIONS[S.region]; return { traits, est: S.est, condition: S.condition, focus: S.focus, local: S.local, env: { temp: R.temp, moist: R.moist, soil: R.soil, terraform: S.terraform } }; }
  const cache = new Map();
  function frame(cid, traits = S.traits, size = null) {
    const C = PV.concepts[cid], r = C.resolutions[S.res[cid] || 0], [W, H] = size || r, inp = input(traits), key = cid + JSON.stringify([inp, W, H]);
    if (!cache.has(key)) { if (cache.size > 400) cache.clear(); const M = PV.model.normalize(inp, RULES); cache.set(key, Object.assign(PV.renderer.render(M, C, { W, H }), { model: M })); }
    return cache.get(key);
  }
  /** Every legal next tier (a real purchase that could be previewed); with "impossible (QA)" the other water arm too. */
  function candidates() { const out = [];
    for (const id of ADAPT.concat(SPREAD)) { let t = PV.model.nextTier(id, S.traits, RULES);
      if (t === null && S.impossible && (id === "drought" || id === "flood")) { const cur = S.traits[id] || 0; if (cur < RULES.byId[id].artMax) t = cur + 1; }
      if (t !== null) out.push({ id, tier: t }); }
    return out; }
  function syncPreview() { const c = candidates(); if (!S.preview || !c.some(x => x.id === S.preview.id && x.tier === S.preview.tier)) S.preview = c[0] || null; }
  const previewTraits = () => S.preview ? { ...S.traits, [S.preview.id]: S.preview.tier } : null;
  const styleOf = C => S.previewStyle === "auto" ? C.preview : S.previewStyle, fxOf = C => S.fxStyle === "auto" ? C.fx : S.fxStyle;

  // ---------------------------------------------------------------- canvases (repainted if the browser restores a lost 2D context)
  function paint(cv, rgba, W, H) { cv._paint = [rgba, W, H]; PV.renderer.paint(cv, rgba, W, H); }
  function canvas(W, H, scale, label) { const cv = el("canvas", { width: W, height: H, role: "img", "aria-label": label }); cv.style.width = W * scale + "px"; cv.style.height = H * scale + "px";
    cv.addEventListener("contextrestored", () => { if (cv._paint) PV.renderer.paint(cv, ...cv._paint); }); return cv; }
  const sigOf = cv => { const d = cv.getContext("2d").getImageData(0, 0, cv.width, cv.height).data; return PV.renderer.fnv(d); };

  // ---------------------------------------------------------------- production reference (resources/run-ui/plant-specimen.js, untouched)
  function productionState(traits, preview) {
    return { traits: { ...traits }, preview: preview || null, colony: { living: S.condition !== "unviable", establishment: S.est, word: "" }, focus: S.focus, local: S.local,
      condition: { thriving: "ok", strained: "warn", unviable: "bad" }[S.condition], viable: S.condition !== "unviable", names: NAMES };
  }
  function productionPanel(w, h, title = "CURRENT PRODUCTION REFERENCE") {
    const box = el("div", { class: "box" });
    const sp = PS.mount(box, { reducedMotion: () => S.reducedMotion });
    sp.render(productionState(S.traits, S.previewOn && S.preview ? S.preview : null));
    (LAB.production = LAB.production || []).push(sp);
    return el("div", { class: "panel ref", "data-panel": "production", style: `--w:${w}px;--h:${h}px` }, el("h4", {}, el("span", {}, title), el("span", {}, "resources/run-ui/plant-specimen.js")), box);
  }

  // ---------------------------------------------------------------- views
  const live = [];   // animated preview canvases: { cv, cur, tgt, C, style }
  function specimenPanel(cid, scale, which, extra = "") {
    const C = PV.concepts[cid], cur = frame(cid), tgtT = previewTraits(), showPrev = which === "preview" && S.previewOn && tgtT;
    const tgt = tgtT ? frame(cid, tgtT) : null, cv = canvas(cur.W, cur.H, scale, `${C.name}: ${which}`);
    cv.dataset.concept = cid; cv.dataset.view = which;
    if (showPrev) { const st = styleOf(C); live.push({ cv, cur, tgt, C, style: st }); paint(cv, PV.fx.previewFrame(cur, tgt, C, st, S.reducedMotion ? 300 : performance.now()), cur.W, cur.H); }
    else paint(cv, cur.rgba, cur.W, cur.H);
    const head = which === "preview" ? (S.preview ? `${NAMES[S.preview.id]} → T${S.preview.tier} · ${styleOf(C)}` : "nothing to preview") : `${C.short} · ${cur.W}×${cur.H}`;
    return el("div", { class: "panel", "data-panel": cid, "data-view": which, style: S.mode === "compare" ? null : `width:${cur.W * scale + 18}px` }, el("h4", {}, el("span", {}, which === "preview" ? "PREVIEW (proposed)" : `${cid} · CURRENT`), el("span", {}, head + extra)), cv);
  }
  function render() {
    const stage = $("#stage"); live.length = 0; LAB.production = []; stage.textContent = ""; syncPreview(); LAB.renders++;
    const sum = el("p", { class: "summary" }); const owned = Object.entries(S.traits).filter(([, v]) => v > 0).map(([k, v]) => `${NAMES[k]}${RULES.byId[k].artMax > 1 ? " T" + v : ""}`);
    const legal = PV.model.validate(S.traits, RULES);
    sum.innerHTML = `<b>Build:</b> ${owned.join(" · ") || "no traits"} &nbsp; <b>Colony:</b> ${S.condition}, establishment ${Math.round(S.est * 100)}%, focus ${S.focus}${S.local ? ", " + S.local : ""} &nbsp; <b>Region:</b> ${REGIONS[S.region].label}${Object.values(S.terraform).some(Boolean) ? " + Terraform preview" : ""}${legal.legal ? "" : ` &nbsp; <b style="color:#a33">QA-only impossible build: ${legal.issues.join("; ")}</b>`}`;
    stage.append(sum);
    const avH = Math.max(300, stage.clientHeight - 70);
    if (S.mode === "single") {
      const cur = frame(S.concept), slots = S.previewOn && S.preview ? 2 : 1, avW = (stage.clientWidth - 20 - 300 - slots * 30) / slots;
      const sc = Math.max(2, Math.min(5, Math.floor(avH / cur.H), Math.floor(avW / cur.W)));
      const row = el("div", { class: "pair" }, specimenPanel(S.concept, sc, "current"));
      if (S.previewOn && S.preview) row.append(specimenPanel(S.concept, sc, "preview"));
      row.append(productionPanel(258, 298)); stage.append(row);
      stage.append(el("p", { class: "legend" }, PV.concepts[S.concept].blurb + " Native logical resolution " + PV.concepts[S.concept].W + "×" + PV.concepts[S.concept].H + ", shown at " + sc + "× with nearest-neighbour scaling."));
    } else if (S.mode === "compare") {
      const colW = (stage.clientWidth - 20 - 4 * 8) / 5, grid = el("div", { class: "cmp" });
      for (const C of CONCEPTS) { const f = frame(C.id), sc = Math.max(2, Math.floor(Math.min(colW / f.W, avH / f.H))); grid.append(specimenPanel(C.id, sc, S.previewOn && S.preview ? "preview" : "current", S.previewOn && S.preview ? "" : "")); }
      grid.append(productionPanel(258, 298)); stage.append(grid);
      stage.append(el("p", { class: "legend" }, "Compare: one synchronized visual state feeds all four concepts and the production reference" + (S.previewOn && S.preview ? `; each shows its preview treatment of ${NAMES[S.preview.id]} → T${S.preview.tier}.` : ".")));
    } else {
      const wrap = el("div", { class: "rooms" });
      for (const C of CONCEPTS) { const row = el("div", { class: "rrow", "data-room-concept": C.id }, el("span", { class: "cid" }, C.id));
        for (const [label, w, h] of ROOM_BOXES) { const s = Math.max(1, Math.round(h / C.H)), W = Math.floor(w / s), H = Math.floor(h / s), f = frame(C.id, S.traits, [W, H]);
          const cv = canvas(W, H, s, `${C.name} at ${label}`); cv.dataset.concept = C.id; cv.dataset.view = "room"; paint(cv, f.rgba, W, H);
          const fr = el("div", { class: "fr" }, cv); fr.style.width = w + "px"; fr.style.height = h + "px";
          row.append(el("div", { class: "rbox", style: `width:${w}px` }, el("span", {}, `${label} · ${w}×${h} px · ${W}×${H} @${s}×`), fr)); }
        wrap.append(row); }
      const prow = el("div", { class: "rrow", "data-room-concept": "production" }, el("span", { class: "cid" }, "P"));
      for (const [label, w, h] of ROOM_BOXES) prow.append(el("div", { class: "rbox", style: `width:${w + 18}px` }, el("span", {}, label), productionPanel(w, h, "PRODUCTION")));
      wrap.append(prow); stage.append(wrap);
      stage.append(el("p", { class: "legend" }, "Real specimen boxes measured in the production rooms and report. Each concept is re-laid-out at the box's logical size and shown at an integer scale, so the pixels stay square."));
    }
    renderControls();
  }
  // animated preview treatments (glow pulse, flip); reduced motion holds them still
  (function loop() { if (!S.reducedMotion && !S.busy) for (const L of live) if (L.style !== "ghost" && L.cv.isConnected) PV.renderer.paint(L.cv, PV.fx.previewFrame(L.cur, L.tgt, L.C, L.style, performance.now()), L.cur.W, L.cur.H); requestAnimationFrame(loop); })();

  // ---------------------------------------------------------------- purchase (visual only)
  async function purchase() {
    if (S.busy || !S.preview) return null; S.busy = true; renderControls();
    const { id, tier } = S.preview, ids = S.mode === "compare" ? CONCEPTS.map(c => c.id) : [S.concept], tgtT = { ...S.traits, [id]: tier };
    const jobs = ids.map(cid => { const C = PV.concepts[cid], cur = frame(cid), tgt = frame(cid, tgtT);
      const cv = document.querySelector(`canvas[data-concept="${cid}"][data-view="${S.mode === "compare" && S.previewOn ? "preview" : "current"}"]`) || document.querySelector(`canvas[data-concept="${cid}"]`);
      const an = PV.model.TRAIT_ANCHOR[id], anchor = cur.sk.anchors[an] || cur.sk.apex;
      const path = an === "rootCrown" ? cur.sk.primaryRoot.slice(0, 14) : cur.sk.stemPath.filter(p => p.y >= anchor.y);
      return PV.fx.purchase(cur, tgt, C, { style: fxOf(C), reducedMotion: S.reducedMotion, anchor, path, onFrame: rgba => paint(cv, rgba, cur.W, cur.H) })
        .then(r => ({ concept: cid, ...r, endSig: sigOf(cv), targetSig: PV.renderer.fnv(tgt.rgba), anatomy: tgt.sig.anatomy })); });
    const res = await Promise.all(jobs);
    S.traits = tgtT; S.preset = null; S.busy = false; S.preview = null; LAB.lastPurchase = { id, tier, results: res }; render(); return LAB.lastPurchase;
  }

  // ---------------------------------------------------------------- controls
  function setPreset(id) { const p = PRESETS.find(x => x.id === id); if (!p) return; S.preset = id; S.traits = { ...p.traits }; S.focus = p.focus || "balanced"; S.local = p.local || null; S.region = p.region || "temperate"; S.preview = null; render(); }
  function bump(id, d) { const cur = S.traits[id] || 0;
    if (d > 0) { const nt = PV.model.nextTier(id, S.traits, RULES); const ok = nt !== null || (S.impossible && (id === "drought" || id === "flood") && cur < RULES.byId[id].artMax); if (!ok) return; S.traits = { ...S.traits, [id]: cur + 1 }; }
    else if (cur > 0) { const t = { ...S.traits }; if (cur - 1) t[id] = cur - 1; else delete t[id]; S.traits = t; }
    S.preset = null; render(); }
  function radio(name, opts, val, on) { return el("div", { class: "seg", role: "radiogroup" }, opts.map(([v, l]) => el("label", {}, el("input", { type: "radio", name, value: v, checked: v === val, onchange: () => on(v) }), l))); }
  function renderControls() {
    const c = $("#controls"); const keepScroll = c.scrollTop; c.textContent = "";
    c.append(el("h3", {}, "Preset build"), el("select", { id: "preset", onchange: e => setPreset(e.target.value) }, el("option", { value: "", selected: !S.preset }, "— custom —"), PRESETS.map(p => el("option", { value: p.id, selected: S.preset === p.id }, p.name))));
    const trow = id => { const r = RULES.byId[id], cur = S.traits[id] || 0, nt = PV.model.nextTier(id, S.traits, RULES), canUp = nt !== null || (S.impossible && (id === "drought" || id === "flood") && cur < r.artMax);
      const cap = r.max === null ? `${cur} / no cap (art T${r.artMax})` : `${cur} / ${r.max}`;
      return el("div", { class: "tr" + (cur ? " owned" : ""), "data-trait": id }, el("span", { class: "n" }, r.name), el("span", { class: "v" }, cap),
        el("button", { type: "button", "aria-label": `${r.name} down`, disabled: !cur, onclick: () => bump(id, -1) }, "−"), el("button", { type: "button", "aria-label": `${r.name} up`, disabled: !canUp, onclick: () => bump(id, 1) }, "+")); };
    c.append(el("h3", {}, "Adapt (real traits)"), ...ADAPT.map(trow), el("p", { class: "note" }, `Temperature points ${(S.traits.cold || 0) + (S.traits.heat || 0)} / ${RULES.tempCap} (Cold + Heat share one pool). One water strategy: Drought or Flood.`),
      el("label", { class: "row note" }, el("input", { type: "checkbox", checked: S.impossible, onchange: e => { S.impossible = e.target.checked; render(); } }), "allow impossible Drought + Flood (QA only)"),
      el("h3", {}, "Spread (real traits)"), ...SPREAD.map(trow));
    const cand = candidates();
    c.append(el("h3", {}, "Preview a real next tier"), el("select", { id: "previewPick", onchange: e => { const [id, t] = e.target.value.split(":"); S.preview = { id, tier: +t }; render(); } },
      cand.length ? cand.map(x => el("option", { value: `${x.id}:${x.tier}`, selected: S.preview && S.preview.id === x.id && S.preview.tier === x.tier }, `${NAMES[x.id]} → T${x.tier}`)) : el("option", {}, "no legal next tier")),
      el("label", { class: "row" }, el("input", { type: "checkbox", id: "previewOn", checked: S.previewOn, onchange: e => { S.previewOn = e.target.checked; render(); } }), "Preview on"),
      radio("pstyle", [["auto", "concept default"], ["ghost", "ghost"], ["glow", "glow"], ["flip", "flip"]], S.previewStyle, v => { S.previewStyle = v; render(); }),
      el("h3", {}, "Purchase FX"), radio("fx", [["auto", "concept default"], ["grow", "grow"], ["pulse", "pulse"], ["dissolve", "dissolve"], ["bloom", "bloom"]], S.fxStyle, v => { S.fxStyle = v; render(); }),
      el("button", { type: "button", class: "buy", id: "buy", disabled: S.busy || !S.preview, onclick: () => purchase() }, S.busy ? "Mutating…" : "Purchase mutation (visual only)"));
    c.append(el("h3", {}, "Colony"), el("div", { class: "row" }, el("span", {}, "Establishment"), el("output", { id: "estOut" }, Math.round(S.est * 100) + "%")),
      el("input", { type: "range", id: "est", min: 0, max: 100, value: Math.round(S.est * 100), oninput: e => { S.est = e.target.value / 100; render(); } }),
      el("p", { class: "note" }, `stage: ${PV.model.stageOf(S.est)}`),
      radio("cond", [["thriving", "thriving"], ["strained", "strained"], ["unviable", "unviable / ghost"]], S.condition, v => { S.condition = v; render(); }),
      el("h3", {}, "Growth focus (local)"), radio("focus", PV.model.FOCI.map(f => [f, f[0].toUpperCase() + f.slice(1)]), S.focus, v => { S.focus = v; S.preset = null; render(); }),
      el("h3", {}, "Local upgrade (this colony)"), radio("local", [["", "none"], ["rootNetwork", "Root Network"], ["leafCanopy", "Leaf Canopy"], ["seedReserve", "Seed Reserve"]], S.local || "", v => { S.local = v || null; S.preset = null; render(); }));
    c.append(el("h3", {}, "Region + Terraform preview"), el("select", { id: "region", onchange: e => { S.region = e.target.value; render(); } }, Object.entries(REGIONS).map(([k, r]) => el("option", { value: k, selected: S.region === k }, r.label))),
      el("p", { class: "note" }, "Terraform previews change only the specimen's surroundings — never the plant."),
      ...RULES.terraform.map(t => el("div", { class: "tf", "data-terraform": t.id }, el("span", {}, t.name), el("button", { type: "button", class: "mini", onclick: () => { S.terraform = { ...S.terraform, [t.id]: Math.max(0, S.terraform[t.id] - 1) }; render(); } }, "−"),
        el("output", {}, S.terraform[t.id]), el("button", { type: "button", class: "mini", onclick: () => { S.terraform = { ...S.terraform, [t.id]: Math.min(3, S.terraform[t.id] + 1) }; render(); } }, "+"))));
    const C = PV.concepts[S.concept];
    c.append(el("h3", {}, "Display"), el("label", { class: "row" }, el("input", { type: "checkbox", id: "rm", checked: S.reducedMotion, onchange: e => { S.reducedMotion = e.target.checked; render(); } }), "Reduced motion"),
      el("div", { class: "row" }, el("span", {}, `Concept ${C.id} resolution`), el("select", { id: "res", onchange: e => { S.res = { ...S.res, [C.id]: +e.target.value }; render(); } }, C.resolutions.map((r, k) => el("option", { value: k, selected: (S.res[C.id] || 0) === k }, `${r[0]}×${r[1]}${k ? "" : " (native)"}`)))));
    c.scrollTop = keepScroll;
    document.querySelectorAll(".cc").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.concept === S.concept)));
    document.querySelectorAll(".modes button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.mode === S.mode)));
  }

  // ---------------------------------------------------------------- header, keyboard, boot
  function head() {
    $("#strip").append(...CONCEPTS.map((C, k) => el("button", { type: "button", class: "cc", "data-concept": C.id, "aria-pressed": "false", onclick: () => { S.concept = C.id; if (S.mode === "compare") S.mode = "single"; render(); } },
      el("span", { class: "k" }, String(k + 1)), el("span", {}, el("span", { class: "t" }, `${C.id} · ${C.name}`), el("span", { class: "d" }, C.blurb)))));
    for (const b of document.querySelectorAll(".modes button")) b.addEventListener("click", () => { S.mode = b.dataset.mode; render(); });
  }
  addEventListener("keydown", e => {
    const t = e.target; if (e.metaKey || e.ctrlKey || e.altKey || (t && (t.tagName === "SELECT" || (t.tagName === "INPUT" && /^(text|number|search)$/.test(t.type))))) return;
    if (/^[1-4]$/.test(e.key)) { S.concept = "ABCD"[+e.key - 1]; if (S.mode === "compare") S.mode = "single"; render(); }
    else if (e.key === "c" || e.key === "C") { S.mode = S.mode === "compare" ? "single" : "compare"; render(); }
    else if (e.key === "p" || e.key === "P") { const k = PRESETS.findIndex(p => p.id === S.preset); setPreset(PRESETS[(k + 1) % PRESETS.length].id); }
    else if (e.key === "r" || e.key === "R") { S.reducedMotion = !S.reducedMotion; render(); }
    else return; e.preventDefault();
  });
  let rz = 0; addEventListener("resize", () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(render); });

  Object.assign(LAB, { set(patch) { Object.assign(S, patch); render(); return S; }, setPreset, bump, render, purchase, frame, candidates, input,
    model: inp => PV.model.normalize(inp, RULES), canvasSig: (cid, view = "current") => { const cv = document.querySelector(`canvas[data-concept="${cid}"][data-view="${view}"]`); return cv ? sigOf(cv) : null; },
    productionSig: () => (LAB.production || []).map(p => p.signature()), productionStateFor: productionState });
  head(); render(); LAB.ready = true;
})();
