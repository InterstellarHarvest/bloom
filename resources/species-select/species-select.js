// BLOOM — CHOOSE PLANT SPECIES (BLOOM-035B-6). docs/SPECIES_SYSTEM_v1.md §7 (UX), §0.1 (PMO decisions).
//
// DEVELOPMENT FLAG ONLY. The app mounts this screen only for a ?species=1 visit (resources/app/app-controller.js loads this module
// lazily then; nothing in the normal flow imports it and Settings has no entry for it). The three new species are CANDIDATES with
// TEMPORARY engineering proof art (status "candidate"): every candidate card and dossier says so on screen.
//
//   import { SpeciesSelect } from "<repo>/resources/species-select/species-select.js";
//   const s = new SpeciesSelect(host, { species, reducedMotion, onChoose(sp), onBack() });
//   await s.ready · s.focus() · s.open(id) · s.close() · s.choose() · s.dispose()
//
// Layout (BLOOM-034 night planning language, resources/ui/bloom-theme.css): four cards in ROLE order (generalist first — never a power
// order), each a fully grown, unmutated specimen drawn by the species' real sprite system (BLOOM.plantSpecimen.drawSpecies: its body plan
// and pack) at the largest whole-number scale that fits, its name, its role, strengths AND weaknesses as category chips (a latent
// strength is marked as such), and Organic Hybrid's "Recommended first expedition" note. No stars, no Easy / Hard, no score, no numbers
// on the cards. Choosing a card (click / Enter / Space) opens its dossier: physiology at a glance (temperature and moisture windows on
// fixed axes, Organic Hybrid's window as a faint outline; salt / radiation tolerances), two-part rows in the survey's dossier language,
// and the primary "Survey for <name>". Keyboard: a roving-tabindex radiogroup (← → ↑ ↓ Home End), Enter / Space opens, Escape closes the
// dossier and, from the cards, goes Back. Phone (≤ 640 px): a vertical list; the dossier is a bottom sheet with the primary action pinned.
import { ico } from "../ui/bloom-icons.js";

// the screen's own stylesheet, attached once on first use (served and file:// alike: the portable build rewrites import.meta.url)
const CSS_URL = new URL("./species-select.css", import.meta.url).href;
function attachCss() { if (document.querySelector('link[data-bloom="species-select"]')) return;
  const l = document.createElement("link"); l.rel = "stylesheet"; l.href = CSS_URL; l.dataset.bloom = "species-select"; document.head.appendChild(l); }
const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const CAT = { Temperature: ["temperature", "temp"], Water: ["water", "water"], Soil: ["soil", "soil"], Hazard: ["hazard", "hazard"] };
// the body plan's form, in a word or two (the Habit row's descriptor)
const HABIT = { "oh-stem": "Leafy stem", rosette: "Ground rosette", candle: "Woolly trunk", reed: "Culm clump" };
const T_AXIS = [-45, 45], M_AXIS = [0, 100];
const signed = t => (t > 0 ? "+" : t < 0 ? "−" : "") + Math.abs(t) + " °C";

export class SpeciesSelect {
  constructor(host, { species = null, reducedMotion = null, onChoose = null, onBack = null } = {}) {
    if (!host || typeof host.appendChild !== "function") throw new TypeError("SpeciesSelect: host must be a DOM element");
    const B = window.BLOOM;
    if (!B || !B.species) throw new Error("SpeciesSelect: load content/species.js and resources/bloom-species.js");
    if (!B.plantSpecimen || typeof B.plantSpecimen.drawSpecies !== "function") throw new Error("SpeciesSelect: needs the plant sprite runtime (BLOOM.plantSpecimen.drawSpecies)");
    this.host = host; this.onChoose = onChoose; this.onBack = onBack; this.forcedReducedMotion = reducedMotion;
    this.list = B.species.list(); this.reference = this.list.find(s => s.id === B.species.DEFAULT_ID);
    const start = species ? B.species.resolve(typeof species === "string" ? species : species.id) : this.reference;
    this.index = Math.max(0, this.list.indexOf(start)); this.opened = null; this.state = "cards"; this.disposed = false;
    this.mq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
    this.stats = { opens: 0, closes: 0, moves: 0, chosen: null };
    attachCss();
    this._build();
    // ready once the stylesheet has applied (the entry lifts its black only then: never an unstyled frame)
    this.ready = new Promise(res => { const l = document.querySelector('link[data-bloom="species-select"]'), done = () => res(this);
      if (!l || l.sheet) return done(); l.addEventListener("load", done, { once: true }); l.addEventListener("error", done, { once: true }); setTimeout(done, 3000); });
  }

  get reducedMotion() { return this.forcedReducedMotion ?? !!(this.mq && this.mq.matches); }
  get selected() { return this.list[this.index]; }

  /** Focus the selected card (the radiogroup's one tab stop). */
  focus() { if (this.state === "cards") this.cards[this.index].focus({ preventScroll: false }); else this.dossierTitle.focus({ preventScroll: true }); }

  /** Open the dossier of species `id` (default: the selected card). */
  open(id = this.selected.id) {
    if (this.disposed) return false;
    const i = this.list.findIndex(s => s.id === id); if (i < 0) throw new Error(`SpeciesSelect: unknown species "${id}"`);
    this._select(i, false); this.opened = this.list[i]; this.state = "dossier"; this.stats.opens++;
    this._fillDossier(this.opened);
    this.root.dataset.state = "dossier"; this.root.dataset.species = this.opened.id;
    this.cardsEl.inert = true; this.dossier.inert = false; this.dossier.hidden = false; this.headTools.inert = true;
    if (!this.reducedMotion) { this.dossier.animate([{ opacity: 0, transform: "translateY(16px)" }, { opacity: 1, transform: "none" }], { duration: 260, easing: "cubic-bezier(.2,.8,.2,1)" });
      this.cards[i].animate([{ transform: "scale(1)" }, { transform: "scale(1.035)" }], { duration: 260, easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards" }); }
    this.dossierTitle.focus({ preventScroll: true });
    return true;
  }

  /** Close the dossier: focus returns to its card. */
  close() {
    if (this.state !== "dossier") return false;
    const i = this.index; this.state = "cards"; this.opened = null; this.stats.closes++;
    this.root.dataset.state = "cards"; delete this.root.dataset.species;
    this.dossier.hidden = true; this.dossier.inert = true; this.cardsEl.inert = false; this.headTools.inert = false;
    for (const a of this.cards[i].getAnimations()) a.cancel();
    this.cards[i].focus({ preventScroll: true });
    return true;
  }

  /** "Survey for <name>": hand the chosen species to the consumer (the entry fades to the survey). */
  choose() {
    if (this.state !== "dossier" || !this.opened) return false;
    this.stats.chosen = this.opened.id; this.state = "chosen"; this.root.dataset.state = "chosen";
    if (this.onChoose) this.onChoose(this.opened);
    return true;
  }

  back() { if (this.state === "dossier") return this.close(); if (this.state !== "cards") return false; if (this.onBack) this.onBack(); return true; }

  dispose() {
    if (this.disposed) return; this.disposed = true; this.state = "disposed";
    this.root.removeEventListener("keydown", this._onKey); this.root.removeEventListener("click", this._onClick);
    this.root.remove();
  }

  // ---------------------------------------------------------------- DOM
  _build() {
    const r = this.root = document.createElement("section");
    r.className = "ss"; r.dataset.state = "cards"; r.setAttribute("aria-label", "Choose your plant species");
    if (this.forcedReducedMotion === true) r.classList.add("rm");
    const tid = "ss-title-" + Math.floor(Math.random() * 1e9).toString(36), did = tid + "-d";
    r.innerHTML = `
      <header class="ss-head">
        <button type="button" class="ss-btn ghost" data-act="back">${ico("back")}<span>Back</span></button>
        <div class="ss-title"><span class="ss-kicker">Expedition</span><h1 id="${tid}">Choose your plant</h1></div>
        <p class="ss-dev" role="note"><b>Development build</b> · species flag · the three new species use temporary engineering proof art</p>
      </header>
      <p class="ss-lede">Each species starts with a different body. The worlds you are offered next are judged by what <em>this</em> plant can live on.</p>
      <div class="ss-cards" role="radiogroup" aria-labelledby="${tid}">${this.list.map((sp, i) => this._card(sp, i)).join("")}</div>
      <aside class="ss-dossier" id="${did}" role="dialog" aria-modal="false" aria-labelledby="${did}-h" hidden inert>
        <div class="ss-dossier-in">
          <div class="ss-d-spec"><canvas class="ss-d-canvas" width="84" height="98" aria-hidden="true"></canvas><span class="ss-proof" hidden>Temporary proof art</span></div>
          <div class="ss-d-main">
            <p class="ss-d-role"></p><h2 id="${did}-h" tabindex="-1"></h2><p class="ss-d-short"></p>
            <p class="ss-d-note" hidden></p>
            <section class="ss-glance" aria-label="Physiology at a glance"></section>
            <dl class="ss-rows"></dl>
          </div>
          <div class="ss-actions">
            <button type="button" class="ss-btn ghost" data-act="close">${ico("back")}<span>Back</span></button>
            <button type="button" class="ss-btn go" data-act="choose">${ico("world")}<span class="ss-go-l"></span></button>
          </div>
        </div>
      </aside>`;
    this.host.appendChild(r);
    const q = s => r.querySelector(s);
    this.cardsEl = q(".ss-cards"); this.cards = [...r.querySelectorAll(".ss-card")]; this.dossier = q(".ss-dossier"); this.dossierTitle = q(".ss-dossier h2");
    this.headTools = q(".ss-head");
    this.cards.forEach((c, i) => this._paint(c.querySelector("canvas"), this.list[i]));
    this._select(this.index, false);
    this._onClick = e => {
      const b = e.target.closest("button, .ss-card"); if (!b || !r.contains(b)) return;
      if (b.classList.contains("ss-card")) { this._select(+b.dataset.index, false); this.open(this.list[+b.dataset.index].id); return; }
      const act = b.dataset.act;
      if (act === "back") this.back(); else if (act === "close") this.close(); else if (act === "choose") this.choose();
    };
    this._onKey = e => {
      if (e.key === "Escape") { e.preventDefault(); this.back(); return; }
      if (this.state !== "cards" || !e.target.classList || !e.target.classList.contains("ss-card")) return;
      const n = this.cards.length, k = e.key;
      const to = k === "ArrowRight" || k === "ArrowDown" ? (this.index + 1) % n : k === "ArrowLeft" || k === "ArrowUp" ? (this.index + n - 1) % n : k === "Home" ? 0 : k === "End" ? n - 1 : null;
      if (to !== null) { e.preventDefault(); this._select(to, true); this.stats.moves++; return; }
      if (k === "Enter" || k === " ") { e.preventDefault(); this.open(this.selected.id); }
    };
    r.addEventListener("click", this._onClick); r.addEventListener("keydown", this._onKey);
  }

  _card(sp, i) {
    const P = sp.presentation, proof = sp.status === "candidate";
    const chip = (x, dir) => { const [cat, icon] = CAT[x.category];
      return `<li class="ss-chip ${dir}${x.latent ? " latent" : ""}" data-cat="${cat}"><span class="ss-chip-dir" aria-hidden="true">${dir === "up" ? "▲" : "▼"}</span><span class="ss-chip-i" aria-hidden="true">${ico(icon)}</span>`
        + `<span class="ss-chip-t"><span class="sr-only">${dir === "up" ? (x.latent ? "Latent strength" : "Strength") : "Weakness"}, ${esc(x.category)}: </span>${esc(x.text)}${x.latent ? ` <small>(latent)</small>` : ""}</span></li>`; };
    return `<div class="ss-card" role="radio" aria-checked="false" tabindex="-1" data-index="${i}" data-species="${esc(sp.id)}" data-role="${esc(sp.role)}"${proof ? ' data-proof="true"' : ""}
        aria-label="${esc(sp.name)}, ${esc(P.roleLabel)}${P.note ? `. ${esc(P.note)}` : ""}">
      <div class="ss-spec"><canvas width="84" height="98" aria-hidden="true"></canvas>${proof ? `<span class="ss-proof">Temporary proof art</span>` : ""}</div>
      <div class="ss-card-t">
        <h3>${esc(sp.name)}</h3><p class="ss-role">${esc(P.roleLabel)}</p>${P.note ? `<p class="ss-note">${ico("info")}<span>${esc(P.note)}</span></p>` : ""}
        <ul class="ss-chips" aria-label="Strengths and weaknesses">${P.strengths.map(x => chip(x, "up")).join("")}${P.weaknesses.map(x => chip(x, "down")).join("")}</ul>
      </div>
    </div>`;
  }

  /** The species' fully grown, unmutated specimen from its own body plan + pack (the real sprite system), 84 × 98 logical pixels. */
  _paint(canvas, sp) {
    const img = window.BLOOM.plantSpecimen.drawSpecies(sp, { traits: {}, condition: "ok" });
    canvas.width = img.w; canvas.height = img.h;
    canvas.getContext("2d").putImageData(new ImageData(new Uint8ClampedArray(img.rgba), img.w, img.h), 0, 0);
    canvas.dataset.signature = img.signature || ""; canvas.dataset.pack = sp.art.pack; canvas.dataset.plan = sp.art.bodyPlan;
  }

  _select(i, focus) {
    this.index = i;
    this.cards.forEach((c, j) => { c.setAttribute("aria-checked", String(j === i)); c.tabIndex = j === i ? 0 : -1; });
    if (focus) this.cards[i].focus();
  }

  _fillDossier(sp) {
    const P = sp.presentation, p = sp.physiology, ref = this.reference.physiology, d = this.dossier, q = s => d.querySelector(s);
    d.dataset.species = sp.id; d.dataset.proof = String(sp.status === "candidate");
    this._paint(q(".ss-d-canvas"), sp); q(".ss-proof").hidden = sp.status !== "candidate";
    q(".ss-d-role").textContent = P.roleLabel; this.dossierTitle.textContent = sp.name; q(".ss-d-short").textContent = sp.short;
    q(".ss-d-note").hidden = !P.note; q(".ss-d-note").innerHTML = P.note ? `${ico("info")}<span>${esc(P.note)}</span>` : "";
    // physiology at a glance: the species' window solid, Organic Hybrid's as a faint outline, on fixed labelled axes; exact values on hover / focus
    const pos = (v, [a, b]) => ((Math.min(b, Math.max(a, v)) - a) / (b - a) * 100).toFixed(2) + "%";
    const bar = (label, cat, lo, hi, rlo, rhi, axis, fmt) => `<div class="ss-range" data-cat="${cat}" tabindex="0" aria-label="${esc(label)}: ${esc(fmt(lo))} to ${esc(fmt(hi))}${sp.id !== this.reference.id ? ` (Organic Hybrid: ${esc(fmt(rlo))} to ${esc(fmt(rhi))})` : ""}">
        <span class="ss-range-l">${esc(label)}</span><span class="ss-track"><i class="ref" style="left:${pos(rlo, axis)};right:calc(100% - ${pos(rhi, axis)})"></i><i class="win" style="left:${pos(lo, axis)};right:calc(100% - ${pos(hi, axis)})"></i></span>
        <span class="ss-axis" aria-hidden="true"><span>${esc(fmt(axis[0]))}</span><span class="ss-exact">${esc(fmt(lo))} … ${esc(fmt(hi))}</span><span>${esc(fmt(axis[1]))}</span></span></div>`;
    const tick = (label, cat, v, refV, note) => `<div class="ss-tol" data-cat="${cat}"><span class="ss-range-l">${esc(label)}</span><b>tolerates up to ${v}</b>${v !== refV ? `<small> · Organic Hybrid ${refV}</small>` : ""}${note ? `<small class="ss-latent"> · ${esc(note)}</small>` : ""}</div>`;
    const latentRad = P.strengths.find(x => x.category === "Hazard" && x.latent);
    q(".ss-glance").innerHTML = `<h3>Physiology at a glance</h3>`
      + bar("Temperature", "temperature", p.tempFloor, p.tempCeil, ref.tempFloor, ref.tempCeil, T_AXIS, signed)
      + bar("Ground moisture", "water", p.waterPos - p.waterTol, p.waterPos + p.waterTol, ref.waterPos - ref.waterTol, ref.waterPos + ref.waterTol, M_AXIS, String)
      + `<div class="ss-tols">${tick("Salt", "soil", p.saltTol, ref.saltTol)}${tick("Radiation", "hazard", p.radTol, ref.radTol, latentRad ? "latent: pays once the heat is under control" : "")}</div>`;
    const row = (cat, icon, label, word, value) => `<div class="ss-row"${cat ? ` data-cat="${cat}"` : ""}><dt><span class="ss-row-i" aria-hidden="true">${ico(icon)}</span>${esc(label)}</dt><dd><b>${esc(word)}</b><span class="ss-row-v">${esc(value)}</span></dd></div>`;
    const S = P.strengths, W = P.weaknesses, by = c => [...S.filter(x => x.category === c).map(x => x.text + (x.latent ? " (latent)" : "")), ...W.filter(x => x.category === c).map(x => "Struggles: " + x.text.toLowerCase())].join(" · ");
    q(".ss-rows").innerHTML = [
      row(null, "adapt", "Habit", HABIT[sp.art.bodyPlan.split("@")[0]] || "Plant", P.dossier.habit),
      row("water", "water", "Water strategy", `${p.waterPos - p.waterTol} … ${p.waterPos + p.waterTol} moisture`, P.dossier.water),
      row("temperature", "temp", "Temperature", `${signed(p.tempFloor)} to ${signed(p.tempCeil)}`, by("Temperature") || "Neither cold nor heat is a strength"),
      row("soil", "soil", "Soil", `Salt up to ${p.saltTol}`, by("Soil") || "Ordinary soils; salty ground is hostile"),
      row("hazard", "hazard", "Hazard", `Radiation up to ${p.radTol}`, by("Hazard") || "Ordinary radiation tolerance"),
      row(null, "journal", "Reproduction", "Seeds", P.dossier.reproduction),
      row(null, "info", "Real plants", "Analogy", P.dossier.science)].join("");
    q(".ss-go-l").textContent = `Survey for ${sp.name}`;
  }
}
