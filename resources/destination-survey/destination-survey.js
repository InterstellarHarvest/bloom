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
//
// DEPARTURE (028B). With the `descent` option, Begin Expedition also plays the dramatic departure: the dossier and header recede,
// the same live PlanetSphereView (still turning; yaw never reset, no landing alignment) moves to the centre and its camera
// dollies in until the world is too large to read as a ball, and the reusable AtmosphereTransition ("dramatic") closes cloud cover over the whole screen. Only
// under full cover is descent.onCovered(detail) called, where the consumer mounts its destination and the survey is disposed;
// then the clouds part. The cloud overlay itself is resources/atmosphere-transition/ (screen-agnostic) — this file only
// choreographs its own screen and invokes it. Without `descent`, Begin Expedition only announces the selection (028A).
//
// ARRIVAL FROM THE MAIN MENU (028C). The worker pool and sector cache live in SectorPool (./sector-pool.js, the same code lifted
// out). DestinationSurvey.prefetch(opts) starts a sector with no screen at all — the Main Menu calls it while the title shows —
// and `new DestinationSurvey(root, { sectors: pool })` adopts it: a finished sector arrives with the prefetched-scan sweep, a
// half-built one shows what is already confirmed and fills in the rest (the accepted 028B behaviour). The `onExit` option adds
// a "← Main menu" button; the consumer runs the transition back and disposes the survey (which disposes the pool it owns).
import { PlanetSphereView, PlanetSphereRenderer } from "../planet-sphere/planet-sphere-view.js";
import { AtmosphereTransition } from "../atmosphere-transition/atmosphere-transition.js";
import { SURVEY_CLASSES, ROWS, nextSectorSeed, sectorLabel } from "./survey-data.js";
import { SectorPool } from "./sector-pool.js";

const COLS = SURVEY_CLASSES.length, N = ROWS * COLS;
const GLOBE_DISTANCE = 3.6;                 // the disc fills ~92% of its box, in the grid and in focus alike (no reframing)
const EASE_OUT = "cubic-bezier(.2,.8,.2,1)", EASE_IN = "cubic-bezier(.55,0,.85,.35)", EASE_FLIP = "cubic-bezier(.3,.7,.2,1)";
const T = { flipIn: 720, flipOut: 620, darken: 200, scanOut: 200, scanIn: 340, scanStep: 82, fadeOut: 150, fadeIn: 220,
  // departure (028B): UI recedes, the planet approach starts a beat later, the clouds close in while it is still visible
  departRecede: 320, departRecedeRm: 200, approachDelay: 60, approachMorph: 760, dollyDelay: 120, dolly: 2500, cloudsAfter: 1000 };
// (cloudsAfter: the planet zooms alone for a beat — ~1 s, the world visibly coming closer — before the atmosphere arrives)
const DOLLY_TO = 1.45; // the view's closest camera distance: the disc is then ~3 × the screen height (no longer readable as a ball)
// Choreography rule: globes on one renderer share one depth buffer, so where two globe boxes overlap they intersect by depth,
// not by paint order (docs/evidence/bloom-028a/REPORT.md). Nothing may therefore sit under the flying globe. (028B, owner) The
// other worlds DARKEN away (a background-coloured disc fades over each; globe pixels ignore CSS opacity) and are hidden before
// the chosen one flies; on the way back each reappears — under its cover, which then fades — as soon as the rest of the flight
// can no longer touch it, all finishing exactly as the globe lands.
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
   * workers            worker pool size (default: hardware threads − 2, clamped 1 … 8); each validation is its own task (028B)
   * onBeginExpedition  called with the Begin Expedition detail (also dispatched as "bloom:begin-expedition" on root)
   * descent            (028B) play the dramatic departure on Begin Expedition (omitted: announce only, as in 028A):
   *                      onCovered(detail, info)  REQUIRED, may be async: called only under full cloud cover; mount the
   *                                               destination here (from detail.planet). The survey disposes itself after it
   *                                               resolves unless it already did (or autoDispose: false)
   *                      transition               an AtmosphereTransition to use (default: a private one over document.body)
   *                      coveredTimeoutMs         give up on onCovered after this long (default: wait)
   *                      onError(err, detail)     a failed descent (default: console.error); the survey is back in focus if alive
   *                      autoDispose              default true
   *                      seed                     fix the cloud layout (reproducible captures); default: a new one every departure
   * sectors            (028C) a SectorPool to adopt — normally DestinationSurvey.prefetch(…) started on the title screen. Its
   *                    prefetched sector becomes the first one shown (sectorSeed / firstBloom default to it); the survey owns
   *                    the pool from here and disposes it with itself. Omitted: a private pool, as before.
   * onExit             (028C) called when the player leaves for the Main Menu (a "← Main menu" header button appears; Escape
   *                    in the survey state leaves too). The survey changes nothing itself: the consumer transitions and disposes it.
   */
  constructor(root, { sectorSeed = null, firstBloom = false, reducedMotion = null, worker = true, workers = null, onBeginExpedition = null, descent = null, sectors = null, onExit = null } = {}) {
    if (!root || typeof root.appendChild !== "function") throw new TypeError("DestinationSurvey: root must be a DOM element");
    if (descent && typeof descent.onCovered !== "function") throw new TypeError("DestinationSurvey: descent.onCovered must be a function");
    if (sectors && (!(sectors instanceof SectorPool) || sectors.disposed)) throw new TypeError("DestinationSurvey: sectors must be a live SectorPool");
    this.root = root; this.onBeginExpedition = onBeginExpedition; this.forcedReducedMotion = reducedMotion; this.descent = descent; this.onExit = onExit;
    this.mq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
    // (028C) the pool: adopted (its prefetched sector is the first shown) or private. Validations run one per task (028B), so the
    // pool uses the machine: hardware threads − 2 (the page's main and compositor threads keep theirs), at most 8.
    this.sectors = sectors || new SectorPool({ worker, workers });
    const pre = sectors && sectors.first;
    this.firstBloom = !!firstBloom || !!(pre && sectorSeed == null && pre.firstBloom);
    this.sectorSeed = sectorSeed != null ? sectorSeed >>> 0 : pre ? pre.seed : 1 + Math.floor(Math.random() * 999998);
    this.state = "loading"; this.selected = null; this.cells = new Array(N).fill(null); this.sector = null;
    const pool = this.sectors;
    this.stats = { scans: 0, selects: 0, returns: 0, begins: 0, exits: 0, scanWaits: 0, lastScan: null, get workerTasks() { return pool.stats.workerTasks; }, get sectorTimes() { return pool.stats.sectorTimes; } };
    this._awaiting = null;
    this._build();
    this.host = new PlanetSphereRenderer(root); // ONE WebGL context for the whole screen
    this.views = this.globes.map((g, i) => new PlanetSphereView(g, { renderer: this.host, interactive: false, reducedMotion,
      distance: GLOBE_DISTANCE, yaw: i * 0.7 + 0.35, ariaLabel: "Planet globe: drag sideways or press the left and right arrow keys to spin it" }));
    this.sectors.onProgress = e => this._progress(e);
    const e = this.sectors.sector(this.sectorSeed, this.firstBloom);
    this.stats.adopted = pre ? { seed: pre.seed, ready: e.ready, confirmed: e.found.reduce((a, b) => a + b, 0) } : null;
    let first;
    if (e.ready) first = e.promise.then(s => this._swapIn(s, { first: true })); // (028C) prefetched in full: the single sweep, as a prefetched scan
    else {
      this._awaiting = e; this._fillIn(e); this._progress(e); // (028B) each world appears the moment it is confirmed (already-confirmed ones at once)
      first = e.promise.then(s => { this._awaiting = null; this._progress(null); return this._finishFill(s); });
    }
    this.ready = first.then(() => { if (this.state === "disposed") return this;
      this.state = "survey"; this.root.dataset.state = "survey"; this._prefetch(); return this; })
      .catch(err => { if (this.state !== "disposed") this._placeholder(`Survey unavailable: ${err.message || err}`); throw err; });
  }

  /** (028C) Start validating a sector with no screen — on the title screen, while the player reads the menu. Returns the
   *  SectorPool to pass as `sectors`; `pool.progress` / `pool.ready` report it; `pool.dispose()` if no survey ever takes it. */
  static prefetch({ sectorSeed = null, firstBloom = false, worker = true, workers = null } = {}) {
    return new SectorPool({ worker, workers }).prefetch({ sectorSeed, firstBloom });
  }

  get reducedMotion() { return this.forcedReducedMotion ?? !!(this.mq && this.mq.matches); }
  get selectedCandidate() { return this.selected === null ? null : this.cells[this.selected]; }
  get sectorSource() { return this.sectors.source; }
  get poolSize() { return this.sectors.poolSize; }
  // (028B QA harness compatibility: it reads the pool's worker list and halted flag through these private names)
  get _pool() { return this.sectors._pool; }
  get _poolHalted() { return this.sectors.halted; }

  // ---------------------------------------------------------------- public
  /** Is the sector after the one on screen already validated and waiting (prefetched)? */
  get nextSectorReady() { const e = this.sectors.get(nextSectorSeed(this.sectorSeed), false); return !!(e && e.ready); }

  /**
   * SCAN NEW SECTOR: the next sector's nine validated worlds replace these in a short corner-to-corner sweep. Normally that
   * sector was prefetched while the player looked at this one; if not (028B), the current worlds leave at once and the new
   * ones fill in as each is confirmed (the button stays busy and the header counts them). No world is ever shown before it
   * is validated and certain to be in the sector.
   */
  async scan() {
    if (this.state !== "survey") return false;
    this.state = "scanning"; this.scanBtn.setAttribute("aria-busy", "true");
    try {
      const seed = nextSectorSeed(this.sectorSeed), e = this.sectors.sector(seed, false), p = e.promise, prefetched = e.ready, t0 = performance.now();
      if (!prefetched) { this.stats.scanWaits++; this._awaiting = e; await this._sweepOut(); if (this.state === "disposed") return false; this._fillIn(e); this._progress(e); }
      const sector = await p;
      this._awaiting = null; this._progress(null);
      if (this.state === "disposed") return false;
      this.stats.lastScan = { prefetched, waitedMs: Math.round(performance.now() - t0) };
      this.sectorSeed = seed;
      if (prefetched) await this._swapIn(sector, { first: false }); else await this._finishFill(sector);
      this.stats.scans++; this._prefetch(); return true;
    } finally { if (this.state !== "disposed") { this.state = "survey"; this.scanBtn.removeAttribute("aria-busy"); } }
  }

  /**
   * (028C) Leave for the Main Menu: only from the survey (or still-loading) state, and only with an `onExit` consumer, which
   * runs the transition and disposes this screen. False otherwise (mid-animation, focus, departing: harmless double clicks).
   */
  exit() {
    if (!this.onExit || (this.state !== "survey" && this.state !== "loading")) return false;
    this.stats.exits++;
    this.onExit(this);
    return true;
  }

  /** Grid → focus: the chosen globe (the same view, still turning) grows into the left half; the dossier comes in on the right. */
  async select(i) {
    if (this.state !== "survey" || !this.cells[i]) return false;
    this.state = "to-focus"; this.selected = i;
    const cand = this.cells[i], g = this.globes[i], rm = this.reducedMotion, others = this._others(i);
    this._fillDossier(cand); this.root.dataset.class = cand.classId;
    if (rm) {
      await this._fade(0);
      this.focusSlot.appendChild(g); this._setMode("focus");
      for (const j of others) this.globes[j].classList.add("is-receded");
      await this._fade(1);
    } else {
      // (028B) the others darken away and are hidden first; then the chosen world flies from its cell into the focus slot
      this._setMode("focus");
      await this._darken(others);
      if (this.state === "disposed") return false;
      const first = g.getBoundingClientRect();
      this.focusSlot.appendChild(g);
      await this._flip(g, first, g.getBoundingClientRect(), T.flipIn);
    }
    if (this.state === "disposed") return false;
    this.views[i].setInteractionEnabled(true); // the accepted controls: horizontal drag / ← → spin; vertical ignored
    if (this.descent) this._transition().prepare(); // draw the cloud bitmaps now, while the player reads the dossier
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
    this._setMode("survey");
    if (rm) { for (const j of others) this.globes[j].classList.remove("is-receded"); await this._fade(1); }
    else {
      const last = g.getBoundingClientRect();
      await Promise.all([this._flip(g, first, last, T.flipOut), this._brightenDuringReturn(first, last, others)]);
    }
    if (this.state === "disposed") return false;
    this.state = "survey"; this.selected = null; this.stats.returns++;
    this.buttons[i].focus({ preventScroll: true });
    return true;
  }

  /**
   * BEGIN EXPEDITION. It announces the focused world via onBeginExpedition and a bubbling "bloom:begin-expedition" CustomEvent
   * on root, and returns the same detail; without the `descent` option it changes nothing else (028A), with it the departure
   * follows (_depart, 028B). Null outside the focus state.
   *   detail.planet     THE AUTHORITATIVE GAMEPLAY PLANET: the exact validated object the player saw and inspected. Consumers
   *                     must play this object and must NOT regenerate a world from detail.candidate.seed (provenance only).
   *   detail.candidate  identity + provenance { key, name, authored, archetypeId, seed, attempt, classId, sectorSeed, validation }
   *   detail.dossier · detail.render · detail.view (the live, still-turning PlanetSphereView) · detail.container (its element;
   *   `globe` is the same element, kept for 028A callers) · detail.survey (dispose it once the screen is hidden)
   *   detail.descent    (028B, only with the `descent` option) a Promise of the departure: resolves { detail, transition }
   *                     after the reveal; rejects if it failed (the survey is then back in focus, unless it was disposed)
   * With `descent`, the screen enters the "departing" state at once: every other action (and a second Begin) is refused.
   */
  beginExpedition() {
    if (this.state !== "focus") return null;
    const i = this.selected, c = this.cells[i];
    const detail = { candidate: { key: c.key, name: c.name, authored: c.authored, archetypeId: c.archetypeId, seed: c.seed, attempt: c.attempt, classId: c.classId,
      sectorSeed: this.sectorSeed, validation: c.validation }, planet: c.planet, render: c.render, dossier: c.dossier,
      view: this.views[i], container: this.globes[i], globe: this.globes[i], survey: this };
    this.stats.begins++;
    let go = null;
    if (this.descent) {
      this.state = "departing"; this.root.dataset.state = "departing"; // commit: no second Begin, no return, no scan
      detail.descent = new Promise(res => { go = res; }).then(() => this._depart(detail));
      detail.descent.catch(err => { const h = this.descent.onError; if (h) h(err, detail); else console.error("DestinationSurvey: expedition descent failed", err); });
    }
    try {
      this.root.dispatchEvent(new CustomEvent("bloom:begin-expedition", { detail, bubbles: true }));
      if (this.onBeginExpedition) this.onBeginExpedition(detail);
    } finally { if (go) go(); } // a throwing listener must not strand the screen in "departing"
    return detail;
  }

  /**
   * The dramatic departure (028B): recede the dossier / header, grow the same live globe toward the viewer, close the cloud
   * cover, hand over under it, reveal. Never regenerates, re-plans or re-orients the planet; never touches its yaw.
   */
  async _depart(detail) {
    const i = this.selected, g = this.globes[i], view = this.views[i], rm = this.reducedMotion, D = this.descent;
    this._haltPool();                       // no world generation (not even the next-sector prefetch) while departing
    view.setInteractionEnabled(false);      // no drag / keys; the idle spin carries on, yaw untouched
    this.focus.inert = true; this.head.inert = true;
    const anims = this._departAnims = [];
    const ease = { easing: EASE_OUT, fill: "forwards" };
    this._dollyFrame = null;
    anims.push(this.dossier.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: rm ? "none" : "translateX(48px)" }], { duration: rm ? T.departRecedeRm : T.departRecede, ...ease }));
    anims.push(this.head.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: rm ? "none" : "translateY(-14px)" }], { duration: rm ? T.departRecedeRm : T.departRecede, ...ease }));
    if (!rm) anims.push(this._approach(g, view));
    const atx = this._transition(), own = !D.transition;
    try {
      if (!rm) await new Promise(res => setTimeout(res, T.cloudsAfter)); // the approach is under way before the clouds arrive
      const transition = await atx.run({ preset: "dramatic", reducedMotion: rm, origin: { x: 0.5, y: 0.5 }, seed: D.seed ?? null, // (null: a fresh cloud layout every time)
        onPhase: p => { if (this.state === "departing" && p !== "idle") this.root.dataset.departPhase = p; },
        onCovered: async info => {
          if (this.state === "disposed") return; // disposed from outside before cover: nothing of ours to hand over
          this.stats.coveredAt = performance.now();
          try {
            const work = Promise.resolve(D.onCovered(detail, info));
            await (D.coveredTimeoutMs == null ? work : Promise.race([work, new Promise((_, rej) => setTimeout(() =>
              rej(Object.assign(new Error(`descent.onCovered did not settle within ${D.coveredTimeoutMs} ms`), { name: "TimeoutError" })), D.coveredTimeoutMs))]));
          } catch (err) { this._undoDeparture(); throw err; } // still under cover: put the focus screen back before the reveal
          if (this.state !== "disposed" && D.autoDispose !== false) this.dispose();
        } });
      if (this.state === "departing") this.state = "departed"; // (autoDispose: false) the consumer owns the hidden screen now
      return { detail, transition };
    } catch (err) {
      if (this.state === "departing") this._undoDeparture(); // e.g. a busy shared transition: nothing was covered
      if (this.state === "focus") this.dossierTitle.focus({ preventScroll: true });
      throw err;
    } finally { if (own) { atx.dispose(); this._atx = null; } }
  }

  /** The descent's AtmosphereTransition: the consumer's, or a private one over document.body (created once, on first need). */
  _transition() { return this.descent.transition || (this._atx || (this._atx = new AtmosphereTransition())); }

  /**
   * The planet approach, on the live view: its container eases from the focus slot to exactly the screen's rectangle (so the
   * globe drifts to the centre; the WebGL viewport never leaves the canvas), then the camera dollies in (public setDistance)
   * ever faster until the world overfills the screen. Orientation is never touched; the idle spin carries on.
   */
  _approach(g, view) {
    const gr = g.getBoundingClientRect(), sr = this.root.getBoundingClientRect();
    const morph = g.animate([{ transformOrigin: "0 0", transform: "none" },
      { transformOrigin: "0 0", transform: `translate(${(sr.left - gr.left).toFixed(2)}px, ${(sr.top - gr.top).toFixed(2)}px) scale(${(sr.width / gr.width).toFixed(5)}, ${(sr.height / gr.height).toFixed(5)})` }],
      { duration: T.approachMorph, delay: T.approachDelay, easing: "cubic-bezier(.45,0,.35,1)", fill: "forwards" });
    // apparent size ∝ 1 / √(d² − 1): grow it exponentially (an accelerating fall) from the inspection distance to DOLLY_TO
    const k0 = Math.sqrt(GLOBE_DISTANCE ** 2 - 1), R = k0 / Math.sqrt(DOLLY_TO ** 2 - 1), t0 = performance.now() + T.dollyDelay;
    const step = now => {
      this._dollyFrame = null;
      if (this.state !== "departing" || view.disposed) return;
      const p = Math.min(1, Math.max(0, (now - t0) / T.dolly)), q = Math.pow(R, Math.pow(p, 1.25));
      view.setDistance(Math.sqrt(1 + (k0 / q) ** 2));
      if (p < 1) this._dollyFrame = requestAnimationFrame(step);
    };
    this._dollyFrame = requestAnimationFrame(step);
    this.stats.approach = { dollyFrom: GLOBE_DISTANCE, dollyTo: DOLLY_TO, sizeRatio: +R.toFixed(3) };
    return morph;
  }

  /** A failed departure (under cover): back to the focus screen exactly as it was — same view, same yaw, prefetch resumed. */
  _undoDeparture() {
    if (this.state !== "departing" && this.state !== "departed") return;
    for (const a of this._departAnims || []) a.cancel();
    this._departAnims = null;
    if (this._dollyFrame) cancelAnimationFrame(this._dollyFrame); this._dollyFrame = null;
    this.views[this.selected].setDistance(GLOBE_DISTANCE); // back to the inspection framing (orientation was never touched)
    this.focus.inert = false; this.head.inert = false;
    this.state = "focus"; this.root.dataset.state = "focus"; delete this.root.dataset.departPhase;
    this.views[this.selected].setInteractionEnabled(true);
    this.sectors.resume(); this._prefetch();
  }

  /** Tear the screen down: animations, the renderer and its nine views, the worker pool (owned), listeners and the built DOM. */
  dispose() {
    if (this.state === "disposed") return;
    this.state = "disposed";
    if (this._atx && !this._atx.running) { this._atx.dispose(); this._atx = null; } // prepared in focus, never used (a running one is ours to finish)
    for (const a of this.root.getAnimations({ subtree: true })) a.cancel();
    this.host.dispose();          // (planet objects are not touched: a Begin Expedition consumer may still hold detail.planet)
    this.sectors.dispose();       // workers terminated, pending work rejected, entries forgotten (an adopted pool is ours by then)
    this.root.removeEventListener("keydown", this._onKey); this.root.removeEventListener("click", this._onClick);
    this.root.replaceChildren(); this.root.classList.remove("ds", "rm");
    for (const k of ["state", "class", "departPhase"]) delete this.root.dataset[k];
  }

  // ---------------------------------------------------------------- DOM
  _build() {
    const r = this.root;
    r.classList.add("ds"); if (this.forcedReducedMotion === true) r.classList.add("rm");
    r.dataset.state = "loading";
    if (!r.hasAttribute("aria-label")) r.setAttribute("aria-label", "Destination survey");
    r.innerHTML = `
      <header class="ds-head">
        <button type="button" class="ds-btn ghost ds-exit" data-act="exit"${this.onExit ? "" : " hidden"}><span aria-hidden="true">←</span> Main menu</button>
        <div class="ds-title"><span class="ds-kicker">Strange Bloom</span><h1>Destination Survey</h1></div>
        <p class="ds-sector" aria-live="polite"></p>
        <div class="ds-head-tools"><span class="ds-progress sr-only" role="status" hidden></span><button type="button" class="ds-btn scan" data-act="scan">${SCAN_ICON}<span>Scan <span class="lbl-long">new </span>sector</span></button></div>
      </header>
      <div class="ds-survey">
        <div class="ds-cols" aria-hidden="true">${SURVEY_CLASSES.map(c => `<div class="ds-colhead" data-class="${c.id}"><b>${c.label}</b><small>${esc(c.blurb)}</small></div>`).join("")}</div>
        <div class="ds-grid" role="group" aria-label="Candidate worlds: three columns, ${SURVEY_CLASSES.map(c => c.label).join(", ").replace(/, ([^,]*)$/, " and $1")}">${Array.from({ length: N }, (_, i) => {
          const c = SURVEY_CLASSES[i % COLS];
          return `<div class="ds-cell" data-class="${c.id}"><button type="button" class="ds-cand" data-index="${i}" disabled>
            <span class="ds-globe-slot"><span class="ds-globe"></span><span class="ds-halo"></span><span class="ds-incoming" aria-hidden="true" style="--d:${(-i * 0.37).toFixed(2)}s">Incoming</span></span>
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
    this.head = q(".ds-head"); this.sectorEl = q(".ds-sector"); this.scanBtn = q('[data-act="scan"]'); this.exitBtn = q('[data-act="exit"]');
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
      else if (b.dataset.act === "exit") this.exit();
    };
    this._onKey = e => {
      if (e.key !== "Escape") return;
      if (this.state === "focus") { e.preventDefault(); this.returnToSurvey(); }
      else if (this.onExit && (this.state === "survey" || this.state === "loading")) { e.preventDefault(); this.exit(); } // (028C)
    };
    r.addEventListener("click", this._onClick); r.addEventListener("keydown", this._onKey);
  }

  _setMode(mode) {
    this.root.dataset.state = mode;
    const focus = mode === "focus";
    this.focus.inert = !focus; this.grid.inert = focus; this.head.querySelector(".ds-head-tools").inert = focus; this.exitBtn.inert = focus;
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

  /** A background-coloured disc over grid cell j (globe pixels ignore CSS opacity, so they are darkened by covering them). */
  _cover(j) { const c = document.createElement("span"); c.className = "ds-cover"; this.slots[j].appendChild(c); return c; }

  /** Grid → focus: the other worlds darken to the background together, then are hidden (nothing left under the flight). */
  async _darken(others) {
    const covers = others.map(j => this._cover(j));
    await Promise.all(covers.map(c => c.animate([{ opacity: 0 }, { opacity: 1 }], { duration: T.darken, easing: "ease-in", fill: "forwards" }).finished.catch(() => {})));
    for (const j of others) this.globes[j].classList.add("is-receded");
    for (const c of covers) c.remove();
  }

  /**
   * Focus → grid: while the globe flies home (`first` → `last`, the FLIP's rectangles), each hidden world reappears under a dark
   * cover as soon as no remaining part of the flight can touch it (the flight's disc is interpolated over the rest of its path),
   * and its cover fades so that EVERY world is fully back exactly when the globe lands.
   */
  _brightenDuringReturn(first, last, others) {
    return new Promise(resolve => {
      const t0 = performance.now(), end = t0 + T.flipOut, g = this.globes[this.selected], pending = new Set(others), fades = [];
      const disc = (r, k = 0.4585) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2, r: r.width * k });
      const lerp = (a, b, u) => a + (b - a) * u; // the FLIP rectangle is linear in its progress u (translate + scale)
      const at = u => ({ left: lerp(first.left, last.left, u), top: lerp(first.top, last.top, u), width: lerp(first.width, last.width, u), height: lerp(first.height, last.height, u) });
      const clearOf = (j, u0) => { const D = disc(this.slots[j].getBoundingClientRect(), 0.47);
        for (let u = u0; u <= 1.0001; u += 0.04) { const F = disc(at(Math.min(1, u))); if (Math.hypot(F.x - D.x, F.y - D.y) < F.r + D.r) return false; } return true; };
      const step = () => {
        if (this.state === "disposed") return resolve();
        const now = performance.now(), cur = g.getBoundingClientRect(), span = last.width - first.width;
        const u = span ? Math.min(1, Math.max(0, (cur.width - first.width) / span)) : Math.min(1, (now - t0) / T.flipOut);
        for (const j of [...pending]) if (now >= end || clearOf(j, u)) {
          pending.delete(j); const c = this._cover(j); c.style.opacity = "1"; this.globes[j].classList.remove("is-receded");
          fades.push(c.animate([{ opacity: 1 }, { opacity: 0 }], { duration: Math.max(60, end - now), easing: "ease-out", fill: "forwards" }).finished.catch(() => {}).then(() => c.remove()));
        }
        if (pending.size) requestAnimationFrame(step); else Promise.all(fades).then(() => resolve());
      };
      requestAnimationFrame(step);
    });
  }

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

  // ---------------------------------------------------------------- progressive fill (028B)
  /**
   * Show sector entry `e` as it is confirmed: each world appears in ITS OWN column (its class), in the first free row, the
   * moment it is certain to be in the sector, and never moves again (owner rule: the column matters, the row does not).
   * Empty spots show a quiet "Incoming" until their world arrives. One setPlanet per world; each finished column holds
   * exactly the sector's worlds of that class (in landing order).
   */
  _fillIn(e) {
    const fill = this._fill = { e, rows: [[], [], []], settled: [null, null, null] }; // rows[col]: the worlds placed in that column
    this.sector = null;
    for (let i = 0; i < N; i++) { this.cells[i] = null; this.views[i].setPlanet(null); this.buttons[i].disabled = true; this._uncaption(i); this.slots[i].classList.add("is-incoming"); }
    this.sectorEl.innerHTML = `<b>${esc(sectorLabel(e.seed))}</b>`;
    e.listener = { cell: (col, cand) => this._place(fill, col, cand), column: (col, column) => this._settleColumn(fill, col, column) };
    e.shown.forEach((list, col) => list.forEach(c => this._place(fill, col, c)));
    e.cols.forEach((c, col) => { if (c) this._settleColumn(fill, col, c); });
  }

  /** The row for a newly confirmed world: the first free row of its OWN column (owner rule: the column — the class — is what
   *  matters; the row does not). A world never moves once it is on screen. */
  _rowFor(col) { for (let r = 0; r < ROWS; r++) if (!this.cells[r * COLS + col]) return r; return -1; }

  _place(fill, col, cand) {
    if (this._fill !== fill || this.state === "disposed") return;
    const rows = fill.rows[col]; if (rows.length >= ROWS || rows.some(c => c.key === cand.key)) return;
    const r = this._rowFor(col); if (r < 0) return;
    const i = r * COLS + col; rows.push(cand);
    this._show(i, cand);
    this._progress(fill.e);
    if (!this.reducedMotion) this._grow(i, 0);
  }

  /** A world into grid position i (planet + caption); its button stays disabled until the whole sector is in. */
  _show(i, cand) {
    this.cells[i] = cand;
    if (!cand) { this.views[i].setPlanet(null); this._uncaption(i); return; }
    this.slots[i].classList.remove("is-incoming"); // gone in the same frame the globe is first drawn: text and planet never overlap
    this.views[i].setPlanet(cand.planet, { render: cand.render }); this.stats.shown = (this.stats.shown || 0) + 1;
    if (cand.authored) this.views[i].setYaw(0); // a legacy rectangle: start with its real map edge on the far side (§11)
    this._caption(i, cand); this.buttons[i].disabled = true;
  }

  _uncaption(i) { const b = this.buttons[i]; b.querySelector(".ds-name").innerHTML = "&nbsp;"; b.querySelector(".ds-desc").innerHTML = "&nbsp;"; b.querySelector(".sr-only").textContent = ""; }

  _grow(i, delay) {
    const g = this.globes[i], cap = this.buttons[i].querySelector(".ds-cap"), halo = this.slots[i].querySelector(".ds-halo");
    halo.animate([{ transform: "translate(-50%,-50%) scale(.9)", opacity: 0 }, { transform: "translate(-50%,-50%) scale(1)", opacity: 1, offset: .35 },
      { transform: "translate(-50%,-50%) scale(1.28)", opacity: 0 }], { duration: T.scanIn + 160, delay, easing: "ease-out" });
    return Promise.all([g.animate([{ transform: "scale(.08)" }, { transform: "scale(1.035)", offset: .72 }, { transform: "none" }], { duration: T.scanIn, delay, easing: EASE_OUT, fill: "backwards" }).finished,
      cap.animate([{ opacity: 0 }, { opacity: 1 }], { duration: T.scanIn, delay, fill: "backwards" }).finished]).catch(() => {});
  }

  /** A column is complete: show any of its worlds still missing (e.g. the no-worker path). Nothing on screen ever moves. */
  _settleColumn(fill, col, column) {
    if (this._fill !== fill || fill.settled[col]) return fill.settled[col];
    for (const c of column.cells) if (c && !fill.rows[col].some(x => x.key === c.key)) this._place(fill, col, c);
    return (fill.settled[col] = Promise.resolve());
  }

  /** The whole sector is in: settle every column (the no-worker fallback path places everything here), enable the grid. */
  async _finishFill(sector) {
    const fill = this._fill;
    if (!fill) return this._swapIn(sector, { first: true });
    await Promise.all(SURVEY_CLASSES.map((_, col) => this._settleColumn(fill, col, { cells: sector.cells.filter((_, i) => i % COLS === col) })));
    if (this.state === "disposed") return;
    this.sector = sector; this._fill = null; fill.e.listener = null;
    this.sectors.forget(sector.sectorSeed); // shown: the cells hold it now
    // the worlds keep the rows they landed in: each column holds exactly the sector's worlds of that column (its class)
    for (let i = 0; i < N; i++) { this.slots[i].classList.remove("is-incoming"); this.buttons[i].disabled = !this.cells[i]; }
    this._placeholder(null);
    this.sectorEl.innerHTML = `<b>${esc(sector.label)}</b> · nine candidate worlds`;
  }

  /** Scan before the next sector is ready: the current worlds leave at once (corner to corner); the new ones then fill in. */
  async _sweepOut() {
    if (!this.reducedMotion) await Promise.all(this.globes.map((g, i) => { if (!this.cells[i]) return null;
      const [r, c] = rowCol(i), delay = (r + c) * T.scanStep * 0.6, cap = this.buttons[i].querySelector(".ds-cap");
      cap.animate([{ opacity: 1 }, { opacity: 0 }], { duration: T.scanOut, delay, fill: "forwards" });
      return g.animate([{ transform: "none" }, { transform: "scale(.08)" }], { duration: T.scanOut, delay, easing: EASE_IN, fill: "forwards" }).finished.catch(() => {}); }));
    for (let i = 0; i < N; i++) { for (const a of [...this.globes[i].getAnimations(), ...this.buttons[i].querySelector(".ds-cap").getAnimations()]) a.cancel(); this.views[i].setPlanet(null); this.cells[i] = null; this._uncaption(i); this.buttons[i].disabled = true; }
  }

  /** Put a sector on screen: a corner-to-corner sweep (slightly irregular), or one restrained fade under reduced motion. */
  async _swapIn(sector, { first }) {
    this.sector = sector;
    this.sectors.forget(sector.sectorSeed); // shown: the cells hold it now
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

  // ---------------------------------------------------------------- sectors (validated; SectorPool: workers, main-thread fallback)
  _prefetch() { if (!this.sectors.disposed) this.sectors.sector(nextSectorSeed(this.sectorSeed), false); }

  /** Header / placeholder: how many of the awaited sector's nine worlds are validated so far (null clears it). */
  _progress(e) {
    if (e && e !== this._awaiting) return;
    // (028B) no visible loading text: each empty spot shows "Incoming" until its world appears; this status is for screen readers
    const n = e ? e.found.reduce((a, b) => a + b, 0) : 0;
    if (this.state === "loading") this._placeholder(null);
    this.progressEl.textContent = e ? `Surveying sector: ${n} of ${N} worlds confirmed` : ""; this.progressEl.hidden = !e; // (hidden when idle)
  }

  /** Departure: stop the workers and drop unfinished sectors (no generation while departing); _undoDeparture resumes prefetching. */
  _haltPool() { this.sectors.halt(); }
}
