// BLOOM — Expedition entry (BLOOM-028C, 028C1): the flow from the Main Menu into the Destination Survey and back. Owns the
// screens' hosts, the plain fade-through-black between them (028C1), ONE AtmosphereTransition kept for the survey's dramatic
// departure only, the first-sector prefetch that runs while the title is showing, and the player's motion setting.
//
//   import { ExpeditionEntry } from "<repo>/resources/main-menu/expedition-entry.js";
//   const entry = new ExpeditionEntry(root, { descent: { async onCovered(detail) { … mount gameplay from detail.planet … } } });
//   entry.state                       // "menu" | "to-survey" | "survey" | "to-menu" | "departed" | "disposed"
//   entry.beginExpedition()           // what BEGIN EXPEDITION does; entry.returnToMenu() what "← Main menu" does
//   entry.dispose();
//
// Needs the BLOOM classic scripts on the page (the survey's workers import them), destination-survey.css and main-menu.css.
// ES modules + module workers: serve the repository over http (docs/PLANET_SPHERE_VIEW_v1.md §3).
//
// PREFETCH. DestinationSurvey.prefetch() starts the first validated sector the moment the menu exists (workers only; no screen,
// no WebGL). BEGIN EXPEDITION constructs the survey with that pool: if the sector is complete it arrives in one sweep; if not,
// the confirmed worlds are there at once and the rest fill in as the accepted 028B loading does. Nothing waits for it, and no
// world is shown before it is validated. A return to the menu disposes the survey (and its pool) and starts a fresh prefetch.
//
// FADE (028C1, replaces the SUBDUED mist here). One black layer over both screens: menu → black (220 ms) → the menu is hidden
// and the survey mounted and drawn while black → black lifts (250 ms). Back: survey → black → the survey is disposed and the
// menu shown with its next painting, decoded and settled (no entrance replay: the lifting black is the entrance) → black lifts.
// The black only starts to lift after the new screen's first frames, so slow preparation stays black rather than half-shown.
// Reduced motion: 80 ms each way. No clouds, no zoom, no wipe; the AtmosphereTransition and its presets are untouched.
import { MainMenu } from "./main-menu.js";
import { readSettings, reducedMotionFor } from "./main-menu-data.js";
import { DestinationSurvey } from "../destination-survey/destination-survey.js";
import { AtmosphereTransition } from "../atmosphere-transition/atmosphere-transition.js";

const T = { toBlack: 220, fromBlack: 250, toBlackRm: 80, fromBlackRm: 80, paintingWait: 2000 }; // (paintingWait: cap on waiting, black, for a painting that never decodes)
const EASE = "cubic-bezier(.4,0,.2,1)";
const frame = () => new Promise(r => requestAnimationFrame(() => r()));
const sleep = ms => new Promise(r => setTimeout(r, ms));

export class ExpeditionEntry {
  /**
   * root               the app element (sized); gets two full-size children: the menu host and the survey host
   * reducedMotion      undefined: from the Settings motion choice (null = follow the OS); null / true / false override it
   * sectorSeed, firstBloom, worker, workers   the FIRST visit's sector / pool options (later visits: random sector, same pool options)
   * background         force the first painting (0 … 11; development / QA)
   * descent            the survey's departure consumer (docs/DESTINATION_SURVEY_v1.md §3.1); its `transition` defaults to this entry's
   * onBeginExpedition  passed to the survey
   * onTraining         the menu's TRAINING hook (omitted: placeholder dialog)
   * transition         an AtmosphereTransition for the survey's departure (default: a private one over root)
   * storage            Storage for settings (default localStorage)
   */
  constructor(root, { reducedMotion = undefined, sectorSeed = null, firstBloom = false, worker = true, workers = null, background = null, descent = null,
    onBeginExpedition = null, onTraining = null, transition = null, storage = undefined, rng = Math.random } = {}) {
    if (!root || typeof root.appendChild !== "function") throw new TypeError("ExpeditionEntry: root must be a DOM element");
    this.root = root; this.descent = descent; this.onBeginExpedition = onBeginExpedition; this.forcedReducedMotion = reducedMotion;
    this.poolOpts = { worker, workers }; this.firstSector = { sectorSeed, firstBloom };
    this.settings = readSettings(storage === undefined ? safe(() => globalThis.localStorage) : storage);
    this.state = "menu"; this.survey = null; this.prefetch = null;
    this.stats = { begins: 0, returns: 0, entries: [], exits: [], prefetches: [] };
    if (getComputedStyle(root).position === "static") root.style.position = "relative";
    this.menuHost = host(root, "ee-menu"); this.surveyHost = host(root, "ee-survey"); this.surveyHost.hidden = true;
    this.black = host(root, "ee-black"); this.black.setAttribute("aria-hidden", "true"); this._blackAnim = null; // the fade layer (above both screens, below the departure's clouds)
    this.black.style.cssText += "; z-index:9999; background:#000; opacity:0; display:none; pointer-events:auto; contain:strict";
    this.atx = transition || new AtmosphereTransition({ host: root });   // the survey's dramatic departure only (028C1)
    this.menu = new MainMenu(this.menuHost, { reducedMotion: this.reducedMotion, background, rng, storage,
      onBegin: () => { this.beginExpedition().catch(err => console.error("ExpeditionEntry: could not enter the survey", err)); },
      onTraining, onSettingsChange: s => this._settingsChanged(s) });
    this._prefetchSector(this.firstSector);           // the first sector starts now, while the title is showing
    this.menu.shown.then(() => { if (this.state === "menu") this.atx.prepare(); }); // cloud bitmaps ready before the first transition
  }

  /** null follows the OS (the components each read it live); true / false force it — from Settings unless overridden. */
  get reducedMotion() { return this.forcedReducedMotion !== undefined ? this.forcedReducedMotion : reducedMotionFor(this.settings.motion); }

  // ---------------------------------------------------------------- public
  /** BEGIN EXPEDITION: menu → black → the survey is mounted (its sector prefetched, or still filling in) and drawn → black lifts. */
  async beginExpedition() {
    if (this.state !== "menu") return false;
    this.state = "to-survey"; this.stats.begins++;
    const rm = this.reducedMotion, t0 = performance.now(), rec = { at: t0, prefetch: this.prefetch ? this.prefetch.progress : null, reducedMotion: rm };
    this.menuHost.inert = true;                                         // no menu input while it fades
    try {
      await this._fade(1, rm);
      if (this.state === "disposed") return false;
      rec.blackMs = Math.round(performance.now() - t0);
      this.menu.hide();
      const pool = this.prefetch; this.prefetch = null;                // ownership passes to the survey
      this.surveyHost.hidden = false;
      this.survey = new DestinationSurvey(this.surveyHost, { sectors: pool && !pool.disposed ? pool : null, ...(pool ? {} : this.firstSector), ...this.poolOpts, reducedMotion: rm,
        onExit: () => { this.returnToMenu().catch(err => console.error("ExpeditionEntry: could not return to the menu", err)); },
        onBeginExpedition: d => this._announced(d),
        descent: this.descent ? { ...this.descent, transition: this.descent.transition || this.atx } : null });
      this.menuHost.inert = false;
      this.survey.ready.then(() => { rec.surveyReadyMs = Math.round(performance.now() - t0); }, () => {}); // (rejects if disposed while loading: a return during the fill)
      rec.adopted = this.survey.stats.adopted; rec.swappedMs = Math.round(performance.now() - t0);
      await frame(); await frame();                                     // the survey's first layout and globe frames, drawn while black
      if (this.state === "disposed") return false;
      rec.liftMs = Math.round(performance.now() - t0);
      await this._fade(0, rm);
      rec.revealedMs = Math.round(performance.now() - t0);
      if (this.state === "to-survey") this.state = this.survey && this.survey.state !== "disposed" ? "survey" : "menu";
    } catch (err) {
      if (!this.survey && this.state !== "disposed") {                  // nothing was mounted: the menu is back as it was
        this.menuHost.inert = false; this.menu.show({ rotate: false, settled: true }); this.state = "menu"; this._fade(0, rm).catch(() => {});
      }
      throw err;
    } finally { this.stats.entries.push(rec); }
    return true;
  }

  /** "← Main menu" from the survey: survey → black → the survey is disposed, the menu shown with its next painting → black lifts. */
  async returnToMenu() {
    if (this.state !== "survey" || !this.survey) return false;
    this.state = "to-menu"; this.stats.returns++;
    const rm = this.reducedMotion, t0 = performance.now(), rec = { at: t0, reducedMotion: rm };
    this.stats.exits.push(rec);
    this.surveyHost.inert = true;                                       // no survey input while it fades
    await this._fade(1, rm);
    if (this.state === "disposed") return false;
    rec.blackMs = Math.round(performance.now() - t0);
    const s = this.survey; this.survey = null;
    s.dispose();                                                        // renderer (one context), nine views, workers (the pool it owned), listeners, DOM
    this.surveyHost.hidden = true; this.surveyHost.inert = false;
    this.menu.setStatus("");                                            // that sector went with the survey; the fresh prefetch reports its own
    const shown = this.menu.show({ settled: true });                    // the next painting (preloaded) at rest, no entrance; focus on Begin
    rec.swappedMs = Math.round(performance.now() - t0);
    await Promise.race([shown, sleep(T.paintingWait)]);                 // decoded and on screen before the black lifts
    await frame(); await frame();
    if (this.state === "disposed") return false;
    rec.liftMs = Math.round(performance.now() - t0);
    await this._fade(0, rm);
    rec.revealedMs = Math.round(performance.now() - t0);
    this.state = "menu";
    // a fresh sector for the next visit — started once the black has lifted, so spawning the workers never competes with the reveal
    if (!this.prefetch) this._prefetchSector({ sectorSeed: null, firstBloom: false });
    return true;
  }

  dispose() {
    if (this.state === "disposed") return;
    this.state = "disposed";
    if (this.survey) { this.survey.dispose(); this.survey = null; }
    if (this.prefetch) { this.prefetch.dispose(); this.prefetch = null; }
    if (this._blackAnim) { this._blackAnim.cancel(); this._blackAnim = null; }
    this.menu.dispose(); this.atx.dispose();
    this.menuHost.remove(); this.surveyHost.remove(); this.black.remove();
  }

  // ---------------------------------------------------------------- internals
  /**
   * The black layer to opacity `to` (1: covered, 0: clear), 220 / 250 ms (reduced motion — forced, or the OS when `rm` is null —
   * 80 / 80 ms). It takes input while it shows at all and is display: none when clear. Resolves when it is there; a dispose
   * mid-fade resolves too (the callers check the state).
   */
  _fade(to, rm) {
    const reduce = rm ?? !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); // (null: follow the OS, read now)
    const el = this.black, dur = to ? (reduce ? T.toBlackRm : T.toBlack) : (reduce ? T.fromBlackRm : T.fromBlack);
    if (this._blackAnim) this._blackAnim.cancel();
    el.style.display = "";
    const a = this._blackAnim = el.animate([{ opacity: to ? 0 : 1 }, { opacity: to }], { duration: dur, easing: EASE, fill: "forwards" });
    return a.finished.then(() => {
      if (this._blackAnim !== a) return;
      el.style.opacity = String(to); a.cancel(); this._blackAnim = null;   // (the final value committed, then the animation dropped)
      if (!to) el.style.display = "none";
    }, () => {});
  }

  _prefetchSector(first) {
    const pool = this.prefetch = DestinationSurvey.prefetch({ ...first, ...this.poolOpts }), rec = { seed: pool.first.seed, at: performance.now(), readyMs: null };
    this.stats.prefetches.push(rec);
    const status = () => { if (this.prefetch !== pool || this.state !== "menu") return; const p = pool.progress;
      this.menu.setStatus(p.ready ? "Sector surveyed · nine worlds ready" : `Surveying sector · ${p.confirmed} of ${p.total} worlds`); };
    pool.onProgress = status; status();
    pool.ready.then(() => { rec.readyMs = Math.round(performance.now() - rec.at); status(); }, () => { if (this.prefetch === pool) this.menu.setStatus(""); });
  }

  _announced(detail) {
    if (detail.descent) detail.descent.then(() => { if (this.state === "survey") { this.state = "departed"; this.survey = null; } }, () => {});
    if (this.onBeginExpedition) this.onBeginExpedition(detail);
  }

  _settingsChanged(s) { this.settings = s; this.menu.setReducedMotion(this.reducedMotion); } // (a survey already open keeps its setting; the next one takes the new one)
}

function host(root, cls) { const h = document.createElement("div"); h.className = cls; h.style.cssText = "position:absolute; inset:0"; root.appendChild(h); return h; }
function safe(f) { try { return f(); } catch { return null; } }
