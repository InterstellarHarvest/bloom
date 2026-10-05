// BLOOM — Destination Survey screen (BLOOM-028A; validated destination identity BLOOM-028A1): the expedition's planet-selection screen and its Planet Focus / inspection
// state. Owns screen composition, the 3 × 3 matrix, labels, selection, focus state, the dossier, SCAN NEW SECTOR, the return
// to the survey and the Begin Expedition hook. Owns NO sphere rendering: every globe is a stock PlanetSphereView drawn by ONE
// shared PlanetSphereRenderer (one WebGL context for the screen; docs/PLANET_SPHERE_VIEW_v1.md §9), driven only through its
// public API (setPlanet, setYaw, setInteractionEnabled, dispose) and by CSS transforms on the globe containers, which the
// renderer follows for drawing and picking.
//
//   import { DestinationSurvey } from "<repo>/resources/destination-survey/destination-survey.js";
//   const survey = new DestinationSurvey(rootElement, { onBeginExpedition(detail) { … } });
//   await survey.ready;            // first sector on screen
//   survey.scan() · survey.select(i) · survey.returnToSurvey() · survey.beginExpedition() · survey.dispose()
//   rootElement.addEventListener("bloom:begin-expedition", e => e.detail)   // same detail as onBeginExpedition
//
// Needs the BLOOM classic scripts on the page (content/config.js … resources/bloom-archetype.js, content/scenarios.js,
// content/play.js, resources/bloom-scenario.js, resources/bloom-play.js) and destination-survey.css. ES modules + module workers:
// serve the repository over http (see docs/PLANET_SPHERE_VIEW_v1.md §3).
//
// PLANET IDENTITY (028A1): every candidate is a FULLY VALIDATED world (the play flow's own production path, built in a small
// pool of module workers, one column task each) before it is ever shown. The planet object the worker returned is the one the
// globe draws, the dossier describes, focus shows and Begin Expedition hands on as `detail.planet`. Nothing on this screen
// regenerates a world, and no consumer may regenerate it from its seed (provenance only). Sectors are prefetched; a scan that
// arrives before its sector is ready waits in an honest "n / 9 worlds confirmed" state — never showing an unvalidated world.
//
// The focused planet is the SAME PlanetSphereView, moved: its container is re-parented from its grid cell into the focus slot
// and FLIP-animated (a scale + translate transform from the old box to the new one), so its yaw and idle spin never restart.
// No transition primitive lives here: Begin Expedition only announces the selection (the atmosphere / cloud descent is the
// next milestone's job and sits over this screen).
import { PlanetSphereView, PlanetSphereRenderer } from "../planet-sphere/planet-sphere-view.js";
import { SURVEY_CLASSES, ROWS, columnCandidates, assembleSector, nextSectorSeed, sectorLabel } from "./survey-data.js";

const COLS = SURVEY_CLASSES.length, N = ROWS * COLS;
const GLOBE_DISTANCE = 3.6;                 // the disc fills ~92% of its box, in the grid and in focus alike (no reframing)
const EASE_OUT = "cubic-bezier(.2,.8,.2,1)", EASE_IN = "cubic-bezier(.55,0,.85,.35)", EASE_FLIP = "cubic-bezier(.3,.7,.2,1)";
const T = { flipIn: 720, flipInDelay: 90, flipOut: 620, recede: 240, regrow: 380, regrowAfter: 0.62, scanOut: 200, scanIn: 340, scanStep: 82, fadeOut: 150, fadeIn: 220 };
// Choreography rule: globes on one renderer share one depth buffer, so where two globe boxes overlap they intersect by depth,
// not by paint order (docs/evidence/bloom-028a/REPORT.md). The flying globe therefore never crosses a full-size neighbour: the
// others shrink away first (fast ease-out) and the flight starts a beat later; on the way back they regrow only once it has passed.
const SCAN_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5" opacity=".6"/><path d="M12 12 L19 6"/></svg>`;
const hash01 = (a, b) => { let h = Math.imul((a >>> 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 1, 0xc2b2ae35); h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; return (h >>> 0) / 4294967296; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const pct = x => Math.round(x * 100);
const rowCol = i => [Math.floor(i / COLS), i % COLS];

export class DestinationSurvey {
  /**
   * root               the screen element (any sized box; becomes the PlanetSphereRenderer stage)
   * sectorSeed         first sector (default: random); SCAN NEW SECTOR walks nextSectorSeed() from it
   * firstBloom         include the authored First Bloom in the first sector (development / evidence)
   * reducedMotion      null follows prefers-reduced-motion (menu animations AND the globes); true / false force it
   * worker             build sectors in module workers (default true; falls back to the main thread, which then stalls ~1 s a world)
   * workers            worker pool size, one column task per worker (default: hardware threads − 1, clamped 1 … 3)
   * onBeginExpedition  called with the Begin Expedition detail (also dispatched as "bloom:begin-expedition" on root)
   */
  constructor(root, { sectorSeed = null, firstBloom = false, reducedMotion = null, worker = true, workers = null, onBeginExpedition = null } = {}) {
    if (!root || typeof root.appendChild !== "function") throw new TypeError("DestinationSurvey: root must be a DOM element");
    this.root = root; this.onBeginExpedition = onBeginExpedition; this.forcedReducedMotion = reducedMotion;
    this.mq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
    this.firstBloom = !!firstBloom; this.useWorker = worker !== false;
    this.sectorSeed = sectorSeed == null ? 1 + Math.floor(Math.random() * 999998) : sectorSeed >>> 0;
    this.state = "loading"; this.selected = null; this.cells = new Array(N).fill(null); this.sector = null;
    this.stats = { scans: 0, selects: 0, returns: 0, begins: 0, workerTasks: 0, scanWaits: 0, sectorTimes: [], lastScan: null }; this.sectorSource = null;
    this.poolSize = Math.max(1, Math.min(3, workers || ((typeof navigator !== "undefined" && navigator.hardwareConcurrency) || 2) - 1));
    this._sectors = new Map(); this._pool = []; this._queue = []; this._reqId = 0; this._poolBroken = false; this._awaiting = null;
    this._build();
    this.host = new PlanetSphereRenderer(root); // ONE WebGL context for the whole screen
    this.views = this.globes.map((g, i) => new PlanetSphereView(g, { renderer: this.host, interactive: false, reducedMotion,
      distance: GLOBE_DISTANCE, yaw: i * 0.7 + 0.35, ariaLabel: "Planet globe: drag sideways or press the left and right arrow keys to spin it" }));
    const first = this._sector(this.sectorSeed, this.firstBloom); this._awaiting = this._sectors.get(this._key(this.sectorSeed, this.firstBloom)); this._progress(this._awaiting);
    this.ready = first.then(s => { this._awaiting = null; return this._swapIn(s, { first: true }); }).then(() => {
      this.state = "survey"; this.root.dataset.state = "survey"; this._prefetch(); return this; })
      .catch(err => { this._placeholder(`Survey unavailable: ${err.message || err}`); throw err; });
  }

  get reducedMotion() { return this.forcedReducedMotion ?? !!(this.mq && this.mq.matches); }
  get selectedCandidate() { return this.selected === null ? null : this.cells[this.selected]; }

  // ---------------------------------------------------------------- public
  /** Is the sector after the one on screen already validated and waiting (prefetched)? */
  get nextSectorReady() { const e = this._sectors.get(this._key(nextSectorSeed(this.sectorSeed), false)); return !!(e && e.ready); }

  /**
   * SCAN NEW SECTOR: the next sector's nine validated worlds replace these in a short corner-to-corner sweep. Normally that
   * sector was prefetched while the player looked at this one; if not, the button stays busy and the header counts the worlds
   * confirmed so far until the whole sector is ready (no world is shown before it is validated).
   */
  async scan() {
    if (this.state !== "survey") return false;
    this.state = "scanning"; this.scanBtn.setAttribute("aria-busy", "true");
    try {
      const seed = nextSectorSeed(this.sectorSeed), p = this._sector(seed, false), e = this._sectors.get(this._key(seed, false)), prefetched = e.ready, t0 = performance.now();
      if (!prefetched) { this.stats.scanWaits++; this._awaiting = e; this._progress(e); }
      const sector = await p;
      this._awaiting = null; this._progress(null);
      if (this.state === "disposed") return false;
      this.stats.lastScan = { prefetched, waitedMs: Math.round(performance.now() - t0) };
      this.sectorSeed = seed; await this._swapIn(sector, { first: false });
      this.stats.scans++; this._prefetch(); return true;
    } finally { if (this.state !== "disposed") { this.state = "survey"; this.scanBtn.removeAttribute("aria-busy"); } }
  }

  /** Grid → focus: the chosen globe (the same view, still turning) grows into the left half; the dossier comes in on the right. */
  async select(i) {
    if (this.state !== "survey" || !this.cells[i]) return false;
    this.state = "to-focus"; this.selected = i;
    const cand = this.cells[i], g = this.globes[i], rm = this.reducedMotion, others = this._others(i);
    this._fillDossier(cand); this.root.dataset.class = cand.classId;
    if (rm) await this._fade(0);
    const first = g.getBoundingClientRect();
    this.focusSlot.appendChild(g);
    this._setMode("focus");
    if (rm) { for (const j of others) this.globes[j].classList.add("is-receded"); await this._fade(1); }
    else {
      const last = g.getBoundingClientRect(), [r0, c0] = rowCol(i);
      await Promise.all([this._flip(g, first, last, T.flipIn, T.flipInDelay), ...others.map(j => {
        const [r, c] = rowCol(j), d = Math.hypot(r - r0, c - c0), el = this.globes[j];
        const a = el.animate([{ transform: "none" }, { transform: `translate(${(c - c0) * 14}%, ${(r - r0) * 14}%) scale(.06)` }],
          { duration: T.recede, delay: d * 20, easing: EASE_OUT, fill: "forwards" });
        return a.finished.then(() => { el.classList.add("is-receded"); a.cancel(); }, () => {});
      })]);
    }
    if (this.state === "disposed") return false;
    this.views[i].setInteractionEnabled(true); // the accepted controls: horizontal drag / ← → spin; vertical ignored
    this.state = "focus"; this.stats.selects++;
    this.dossierTitle.focus({ preventScroll: true });
    return true;
  }

  /** Focus → grid: the reverse — the globe flies back to its cell (still turning) and the other worlds return. */
  async returnToSurvey() {
    if (this.state !== "focus") return false;
    this.state = "to-survey";
    const i = this.selected, g = this.globes[i], rm = this.reducedMotion, others = this._others(i);
    this.views[i].setInteractionEnabled(false);
    if (rm) await this._fade(0);
    const first = g.getBoundingClientRect();
    this.slots[i].insertBefore(g, this.slots[i].firstChild);
    for (const j of others) this.globes[j].classList.remove("is-receded");
    this._setMode("survey");
    if (rm) await this._fade(1);
    else {
      const last = g.getBoundingClientRect(), [r0, c0] = rowCol(i);
      await Promise.all([this._flip(g, first, last, T.flipOut), ...others.map(j => {
        const [r, c] = rowCol(j), d = Math.hypot(r - r0, c - c0);
        return this.globes[j].animate([{ transform: `translate(${(c - c0) * 14}%, ${(r - r0) * 14}%) scale(.06)` }, { transform: "none" }],
          { duration: T.regrow, delay: T.flipOut * T.regrowAfter + d * 40, easing: EASE_OUT, fill: "backwards" }).finished.catch(() => {});
      })]);
    }
    if (this.state === "disposed") return false;
    this.state = "survey"; this.selected = null; this.stats.returns++;
    this.buttons[i].focus({ preventScroll: true });
    return true;
  }

  /**
   * BEGIN EXPEDITION — the hook for the next milestone's atmospheric descent. It changes nothing here: it announces the focused
   * world via onBeginExpedition and a bubbling "bloom:begin-expedition" CustomEvent on root, and returns the same detail.
   * Null outside the focus state.
   *   detail.planet     THE AUTHORITATIVE GAMEPLAY PLANET: the exact validated object the player saw and inspected. Consumers
   *                     must play this object and must NOT regenerate a world from detail.candidate.seed (provenance only).
   *   detail.candidate  identity + provenance { key, name, authored, archetypeId, seed, attempt, classId, sectorSeed, validation }
   *   detail.dossier · detail.render · detail.view (the live, still-turning PlanetSphereView) · detail.container (its element;
   *   `globe` is the same element, kept for 028A callers) · detail.survey (dispose it once the screen is hidden)
   */
  beginExpedition() {
    if (this.state !== "focus") return null;
    const i = this.selected, c = this.cells[i];
    const detail = { candidate: { key: c.key, name: c.name, authored: c.authored, archetypeId: c.archetypeId, seed: c.seed, attempt: c.attempt, classId: c.classId,
      sectorSeed: this.sectorSeed, validation: c.validation }, planet: c.planet, render: c.render, dossier: c.dossier,
      view: this.views[i], container: this.globes[i], globe: this.globes[i], survey: this };
    this.stats.begins++;
    this.root.dispatchEvent(new CustomEvent("bloom:begin-expedition", { detail, bubbles: true }));
    if (this.onBeginExpedition) this.onBeginExpedition(detail);
    return detail;
  }

  /** Tear the screen down: animations, the renderer and its nine views, the worker, listeners and the built DOM. */
  dispose() {
    if (this.state === "disposed") return;
    this.state = "disposed";
    for (const a of this.root.getAnimations({ subtree: true })) a.cancel();
    this.host.dispose();          // (planet objects are not touched: a Begin Expedition consumer may still hold detail.planet)
    this._stopPool(new Error("disposed"));
    this._sectors.clear();
    this.root.removeEventListener("keydown", this._onKey); this.root.removeEventListener("click", this._onClick);
    this.root.replaceChildren(); this.root.classList.remove("ds", "rm");
    for (const k of ["state", "class"]) delete this.root.dataset[k];
  }

  // ---------------------------------------------------------------- DOM
  _build() {
    const r = this.root;
    r.classList.add("ds"); if (this.forcedReducedMotion === true) r.classList.add("rm");
    r.dataset.state = "loading";
    if (!r.hasAttribute("aria-label")) r.setAttribute("aria-label", "Destination survey");
    r.innerHTML = `
      <header class="ds-head">
        <div class="ds-title"><span class="ds-kicker">BLOOM · Expedition planning</span><h1>Destination Survey</h1></div>
        <p class="ds-sector" aria-live="polite"></p>
        <div class="ds-head-tools"><span class="ds-progress" hidden></span><button type="button" class="ds-btn scan" data-act="scan">${SCAN_ICON}<span>Scan <span class="lbl-long">new </span>sector</span></button></div>
      </header>
      <div class="ds-survey">
        <div class="ds-cols" aria-hidden="true">${SURVEY_CLASSES.map(c => `<div class="ds-colhead" data-class="${c.id}"><b>${c.label}</b><small>${esc(c.blurb)}</small></div>`).join("")}</div>
        <div class="ds-grid" role="group" aria-label="Candidate worlds: three columns, Stable, Volatile and Extreme">${Array.from({ length: N }, (_, i) => {
          const c = SURVEY_CLASSES[i % COLS];
          return `<div class="ds-cell" data-class="${c.id}"><button type="button" class="ds-cand" data-index="${i}" disabled>
            <span class="ds-globe-slot"><span class="ds-globe"></span><span class="ds-halo"></span></span>
            <span class="ds-cap"><b class="ds-name">&nbsp;</b><small class="ds-desc">&nbsp;</small><span class="sr-only"></span></span></button></div>`; }).join("")}</div>
      </div>
      <div class="ds-placeholder" aria-hidden="true">Scanning sector…</div>
      <div class="ds-focus" inert>
        <div class="ds-focus-slot"></div>
        <aside class="ds-dossier" aria-labelledby="">
          <div class="ds-chip-row"><span class="ds-chip"></span><span class="ds-chip-note"></span></div>
          <h2 tabindex="-1"></h2>
          <p class="ds-type"></p><p class="ds-tagline"></p>
          <div class="ds-hab"><div class="ds-hab-top"><span>Ground your plant can live on at landing</span><b></b></div>
            <div class="ds-bar" role="img"><i class="g"></i><i class="y"></i><i class="r"></i></div></div>
          <dl class="ds-rows"></dl>
          <section class="ds-challenges"><h3>Expected challenges</h3><ul></ul></section>
          <p class="ds-cue"></p>
          <p class="ds-seed"></p>
          <div class="ds-actions">
            <button type="button" class="ds-btn ghost" data-act="return"><span aria-hidden="true">←</span> Return to survey</button>
            <button type="button" class="ds-btn go" data-act="begin">Begin expedition</button>
          </div>
        </aside>
      </div>`;
    const q = s => r.querySelector(s), qa = s => [...r.querySelectorAll(s)];
    this.head = q(".ds-head"); this.sectorEl = q(".ds-sector"); this.scanBtn = q('[data-act="scan"]');
    this.grid = q(".ds-grid"); this.buttons = qa(".ds-cand"); this.slots = qa(".ds-globe-slot"); this.globes = qa(".ds-globe");
    this.focus = q(".ds-focus"); this.focusSlot = q(".ds-focus-slot"); this.dossier = q(".ds-dossier"); this.dossierTitle = q(".ds-dossier h2");
    this.placeholderEl = q(".ds-placeholder"); this.progressEl = q(".ds-progress");
    const tid = "ds-dossier-title-" + Math.floor(Math.random() * 1e9).toString(36); this.dossierTitle.id = tid; this.dossier.setAttribute("aria-labelledby", tid);
    this._onClick = e => {
      const b = e.target.closest("button"); if (!b || !r.contains(b)) return;
      if (b.classList.contains("ds-cand")) this.select(+b.dataset.index);
      else if (b.dataset.act === "scan") this.scan();
      else if (b.dataset.act === "return") this.returnToSurvey();
      else if (b.dataset.act === "begin") this.beginExpedition();
    };
    this._onKey = e => { if (e.key === "Escape" && this.state === "focus") { e.preventDefault(); this.returnToSurvey(); } };
    r.addEventListener("click", this._onClick); r.addEventListener("keydown", this._onKey);
  }

  _setMode(mode) {
    this.root.dataset.state = mode;
    const focus = mode === "focus";
    this.focus.inert = !focus; this.grid.inert = focus; this.head.querySelector(".ds-head-tools").inert = focus;
  }

  _placeholder(text) { this.placeholderEl.textContent = text || ""; this.placeholderEl.hidden = !text; }

  _caption(i, cand) {
    const b = this.buttons[i], cls = SURVEY_CLASSES.find(c => c.id === cand.classId);
    b.querySelector(".ds-name").textContent = cand.name;
    b.querySelector(".ds-desc").textContent = cand.descriptor;
    b.querySelector(".sr-only").textContent = `, ${cls.label} destination. Open its survey dossier.`;
    b.disabled = false;
  }

  _fillDossier(cand) {
    const d = cand.dossier, cls = SURVEY_CLASSES.find(c => c.id === cand.classId), q = s => this.dossier.querySelector(s);
    this.dossier.dataset.class = cand.classId;
    q(".ds-chip").textContent = cls.label; q(".ds-chip-note").textContent = cls.blurb;
    this.dossierTitle.textContent = d.name;
    q(".ds-type").textContent = cand.worldType;
    q(".ds-tagline").textContent = d.tagline;
    const h = d.habitable;
    q(".ds-hab-top b").textContent = `${pct(h.green)}% of the land`;
    const bar = q(".ds-bar"); bar.setAttribute("aria-label", `At landing: ${pct(h.green)}% of the land suits your plant, ${pct(h.yellow)}% is marginal, ${pct(h.red)}% is hostile`);
    [["g", h.green], ["y", h.yellow], ["r", h.red]].forEach(([k, v]) => { bar.querySelector("." + k).style.width = (v * 100).toFixed(1) + "%"; });
    q(".ds-rows").innerHTML = d.rows.map(r => `<dt>${esc(r.label)}</dt><dd><b>${esc(r.word)}</b>${esc(r.value)}</dd>`).join("");
    q(".ds-challenges ul").innerHTML = d.challenges.length ? d.challenges.map(c => `<li>${esc(c.text)}${c.share != null ? ` <small>· ${pct(c.share)}% of land</small>` : ""}</li>`).join("")
      : "<li>Nothing stands out: most land suits your plant from the start.</li>";
    q(".ds-cue").textContent = d.cue || "";
    q(".ds-seed").textContent = cand.authored ? "Authored world · First Bloom" : `World Seed ${cand.seed} · ${this.sector ? this.sector.label : ""}`;
  }

  // ---------------------------------------------------------------- animation helpers
  _others(i) { return this.globes.map((_, j) => j).filter(j => j !== i && this.cells[j]); }

  /** FLIP: the element now sits at `last`; animate it from where it was (`first`) to there with a scale + translate. */
  _flip(el, first, last, duration, delay = 0) {
    if (!last.width || !first.width) return Promise.resolve();
    const dx = first.left - last.left, dy = first.top - last.top, s = first.width / last.width;
    return el.animate([{ transformOrigin: "0 0", transform: `translate(${dx}px, ${dy}px) scale(${s})` }, { transformOrigin: "0 0", transform: "none" }],
      { duration, delay, easing: EASE_FLIP, fill: "backwards" }).finished.catch(() => {});
  }

  /** Reduced motion: a short fade of the whole screen (globe pixels are on the shared canvas, so only the stage can fade). */
  _fade(to) {
    const prev = this._fadeAnim;
    const a = this._fadeAnim = this.root.animate([{ opacity: to ? 0 : 1 }, { opacity: to }], { duration: to ? T.fadeIn : T.fadeOut, easing: "ease", fill: "forwards" });
    if (prev) prev.cancel();
    return a.finished.then(() => { if (to === 1 && this._fadeAnim === a) { a.cancel(); this._fadeAnim = null; } }, () => {});
  }

  /** Put a sector on screen: a corner-to-corner sweep (slightly irregular), or one restrained fade under reduced motion. */
  async _swapIn(sector, { first }) {
    this.sector = sector;
    for (const k of [...this._sectors.keys()]) if (this._sectors.get(k).seed === sector.sectorSeed) this._sectors.delete(k); // shown: the cells hold it now
    const assign = i => {
      const cand = sector.cells[i]; this.cells[i] = cand;
      if (!cand) { this.views[i].setPlanet(null); this.buttons[i].disabled = true; return; }
      this.views[i].setPlanet(cand.planet, { render: cand.render });
      if (cand.authored) this.views[i].setYaw(0); // a legacy rectangle: start with its real map edge on the far side (§11)
      this._caption(i, cand);
    };
    const announce = () => { this.sectorEl.innerHTML = `<b>${esc(sector.label)}</b> · nine candidate worlds`; };
    if (this.reducedMotion) {
      if (!first) await this._fade(0);
      for (let i = 0; i < N; i++) assign(i);
      this._placeholder(null); announce();
      await this._fade(1);
      return;
    }
    this._placeholder(null); announce();
    await Promise.all(Array.from({ length: N }, (_, i) => {
      const [r, c] = rowCol(i), delay = Math.round((r + c + hash01(sector.sectorSeed, i) * 0.6) * T.scanStep);
      const g = this.globes[i], cap = this.buttons[i].querySelector(".ds-cap"), halo = this.slots[i].querySelector(".ds-halo");
      const out = first || !this.cells[i] ? null : [
        g.animate([{ transform: "none" }, { transform: "scale(.08)" }], { duration: T.scanOut, delay, easing: EASE_IN, fill: "forwards" }),
        cap.animate([{ opacity: 1 }, { opacity: 0 }], { duration: T.scanOut, delay, fill: "forwards" })];
      halo.animate([{ transform: "translate(-50%,-50%) scale(.9)", opacity: 0 }, { transform: "translate(-50%,-50%) scale(1)", opacity: 1, offset: .35 },
        { transform: "translate(-50%,-50%) scale(1.28)", opacity: 0 }], { duration: T.scanOut + T.scanIn, delay, easing: "ease-out" });
      const grow = () => {
        assign(i);
        const a = g.animate([{ transform: "scale(.08)" }, { transform: "scale(1.035)", offset: .72 }, { transform: "none" }], { duration: T.scanIn, easing: EASE_OUT, fill: "backwards", delay: first ? delay : 0 });
        const b = cap.animate([{ opacity: 0 }, { opacity: 1 }], { duration: T.scanIn, fill: "backwards", delay: first ? delay : 0 });
        if (out) out.forEach(x => x.cancel());
        return Promise.all([a.finished, b.finished]).catch(() => {});
      };
      return out ? out[0].finished.then(grow, () => {}) : grow();
    }));
  }

  // ---------------------------------------------------------------- sectors (validated; worker pool, main-thread fallback)
  _key(seed, firstBloom) { return seed + (firstBloom ? ":fb" : ""); }
  _prefetch() { this._sector(nextSectorSeed(this.sectorSeed), false); }

  /** Header / placeholder: how many of the awaited sector's nine worlds are validated so far (null clears it). */
  _progress(e) {
    if (e && e !== this._awaiting) return;
    const n = e ? e.found.reduce((a, b) => a + b, 0) : 0;
    if (this.state === "loading") this._placeholder(e ? `Surveying sector… ${n} / ${N} worlds confirmed` : null);
    this.progressEl.hidden = !e || this.state === "loading";
    if (e) this.progressEl.textContent = `Confirming worlds ${n} / ${N}`;
  }

  /**
   * The validated sector for a seed (cached entry; its promise resolves when all three columns are ready). Each column is one
   * task for the worker pool; if workers can't run, the main thread builds the column instead (stalling ~1 s per world).
   */
  _sector(seed, firstBloom) {
    const key = this._key(seed, firstBloom);
    let e = this._sectors.get(key);
    if (!e) {
      e = { key, seed, found: [0, 0, 0], ready: false, t0: performance.now(), ms: null };
      e.promise = Promise.all(SURVEY_CLASSES.map((_, col) => this._column(seed, col, firstBloom, pr => { e.found[col] = pr.found; this._progress(e); })))
        .then(cols => { e.ready = true; e.ms = Math.round(performance.now() - e.t0);
          this.stats.sectorTimes.push({ seed, ms: e.ms, columns: cols.map(c => c.stats) }); return assembleSector(seed, cols); });
      e.promise.catch(() => { if (this._sectors.get(key) === e) this._sectors.delete(key); });
      this._sectors.set(key, e);
    }
    return e.promise;
  }

  _column(sectorSeed, column, firstBloom, onProgress) {
    return this._viaPool({ sectorSeed, column, firstBloom }, onProgress).then(r => { this.sectorSource = "worker"; return r; }, err => {
      if (this.state === "disposed") throw err;
      return this._columnOnMainThread(sectorSeed, column, firstBloom, onProgress).then(r => { this.sectorSource = "main-thread"; return r; });
    });
  }

  _viaPool(task, onProgress) {
    if (!this.useWorker || this._poolBroken) return Promise.reject(new Error("no worker"));
    return new Promise((resolve, reject) => { this._queue.push({ ...task, id: ++this._reqId, resolve, reject, onProgress }); this.stats.workerTasks++; this._pump(); });
  }

  /** Hand queued column tasks to idle workers, starting workers up to the pool size. */
  _pump() {
    while (this._queue.length && !this._poolBroken) {
      let slot = this._pool.find(s => !s.task);
      if (!slot && this._pool.length < this.poolSize) slot = this._spawn();
      if (!slot) return;
      const t = slot.task = this._queue.shift();
      slot.w.postMessage({ id: t.id, sectorSeed: t.sectorSeed, column: t.column, firstBloom: t.firstBloom });
    }
  }

  _spawn() {
    let w;
    try { w = new Worker(new URL("./survey-worker.js", import.meta.url), { type: "module" }); }
    catch { this._stopPool(new Error("worker failed")); return null; }
    const slot = { w, task: null };
    w.onmessage = e => {
      const t = slot.task, m = e.data; if (!t || m.id !== t.id) return;
      if (m.progress) { if (t.onProgress) t.onProgress(m.progress); return; }
      slot.task = null; m.error ? t.reject(new Error(m.error)) : t.resolve(m.result); this._pump();
    };
    w.onerror = e => { if (e.preventDefault) e.preventDefault(); this._stopPool(new Error("worker failed")); }; // module workers unsupported, or a load error
    this._pool.push(slot);
    return slot;
  }

  _stopPool(err) {
    this._poolBroken = true;
    for (const s of this._pool) { s.w.terminate(); if (s.task) s.task.reject(err); }
    for (const t of this._queue) t.reject(err);
    this._pool = []; this._queue = [];
  }

  async _columnOnMainThread(sectorSeed, column, firstBloom, onProgress) {
    const it = columnCandidates(sectorSeed, column, undefined, { firstBloom });
    for (;;) { const r = it.next(); if (r.done) return r.value; if (onProgress) onProgress(r.value); await new Promise(res => setTimeout(res, 0)); if (this.state === "disposed") throw new Error("disposed"); }
  }
}
