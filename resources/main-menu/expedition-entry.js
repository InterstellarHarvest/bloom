// BLOOM — Expedition entry (BLOOM-028C): the flow from the Main Menu into the Destination Survey and back. Owns the screens'
// hosts, ONE AtmosphereTransition for the whole entry (SUBDUED, fully concealing, both ways; the survey's dramatic departure
// uses the same instance), the first-sector prefetch that runs while the title is showing, and the player's motion setting.
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
// TRANSITION. Menu → survey: the plaque recedes (~220 ms), the mist closes over it (SUBDUED, conceal "full", so the layout swap
// and the globes' first frame are never seen), the survey is mounted under cover, the mist clears (~120 ms): ≈ 0.35 s in all.
// Survey → menu: the same, the other way; the menu shows its next painting (already preloaded). Reduced motion is honoured
// by the menu (immediate entrances), the transition (its own reduced path) and the survey, from the OS or the Settings choice.
import { MainMenu } from "./main-menu.js";
import { readSettings, reducedMotionFor } from "./main-menu-data.js";
import { DestinationSurvey } from "../destination-survey/destination-survey.js";
import { AtmosphereTransition } from "../atmosphere-transition/atmosphere-transition.js";

const T = { recedeLead: 110 }; // the plaque is visibly on its way before the mist starts (conceal 90 ms; recede 220 ms)
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
   * transition         an AtmosphereTransition to use (default: a private one over root)
   * storage            Storage for settings (default localStorage)
   */
  constructor(root, { reducedMotion = undefined, sectorSeed = null, firstBloom = false, worker = true, workers = null, background = null, descent = null,
    onBeginExpedition = null, onTraining = null, transition = null, storage = undefined, rng = Math.random } = {}) {
    if (!root || typeof root.appendChild !== "function") throw new TypeError("ExpeditionEntry: root must be a DOM element");
    this.root = root; this.descent = descent; this.onBeginExpedition = onBeginExpedition; this.forcedReducedMotion = reducedMotion;
    this.poolOpts = { worker, workers }; this.firstSector = { sectorSeed, firstBloom };
    this.settings = readSettings(storage === undefined ? safe(() => globalThis.localStorage) : storage);
    this.state = "menu"; this.survey = null; this.prefetch = null;
    this.stats = { begins: 0, returns: 0, entries: [], prefetches: [] };
    if (getComputedStyle(root).position === "static") root.style.position = "relative";
    this.menuHost = host(root, "ee-menu"); this.surveyHost = host(root, "ee-survey"); this.surveyHost.hidden = true;
    this.atx = transition || new AtmosphereTransition({ host: root });
    this.menu = new MainMenu(this.menuHost, { reducedMotion: this.reducedMotion, background, rng, storage,
      onBegin: () => { this.beginExpedition().catch(err => console.error("ExpeditionEntry: could not enter the survey", err)); },
      onTraining, onSettingsChange: s => this._settingsChanged(s) });
    this._prefetchSector(this.firstSector);           // the first sector starts now, while the title is showing
    this.menu.shown.then(() => { if (this.state === "menu") this.atx.prepare(); }); // cloud bitmaps ready before the first transition
  }

  /** null follows the OS (the components each read it live); true / false force it — from Settings unless overridden. */
  get reducedMotion() { return this.forcedReducedMotion !== undefined ? this.forcedReducedMotion : reducedMotionFor(this.settings.motion); }

  // ---------------------------------------------------------------- public
  /** BEGIN EXPEDITION: menu recedes → mist → the survey appears (its sector prefetched, or still filling in) → mist clears. */
  async beginExpedition() {
    if (this.state !== "menu") return false;
    this.state = "to-survey"; this.stats.begins++;
    const rm = this.reducedMotion, t0 = performance.now(), rec = { at: t0, prefetch: this.prefetch ? this.prefetch.progress : null };
    const recede = this.menu.recede();
    if (!rm) await sleep(T.recedeLead);
    try {
      await this.atx.run({ preset: "subdued", conceal: "full", reducedMotion: rm, onCovered: async () => {
        await recede;
        this.menu.hide();
        const pool = this.prefetch; this.prefetch = null;              // ownership passes to the survey
        this.surveyHost.hidden = false;
        this.survey = new DestinationSurvey(this.surveyHost, { sectors: pool && !pool.disposed ? pool : null, ...(pool ? {} : this.firstSector), ...this.poolOpts, reducedMotion: rm,
          onExit: () => { this.returnToMenu().catch(err => console.error("ExpeditionEntry: could not return to the menu", err)); },
          onBeginExpedition: d => this._announced(d),
          descent: this.descent ? { ...this.descent, transition: this.descent.transition || this.atx } : null });
        this.survey.ready.then(() => { rec.surveyReadyMs = Math.round(performance.now() - t0); }, () => {}); // (rejects if disposed while loading: a return during the fill)
        rec.adopted = this.survey.stats.adopted; rec.coveredMs = Math.round(performance.now() - t0);
        await frame();                                                  // the survey's first layout and globe frame, under cover
      } });
      rec.revealedMs = Math.round(performance.now() - t0);
      if (this.state === "to-survey") this.state = this.survey && this.survey.state !== "disposed" ? "survey" : "menu";
    } catch (err) {
      if (!this.survey) { this.menu.show({ rotate: false }); this.state = "menu"; } // nothing was covered (busy / aborted): the menu is back as it was
      throw err;
    } finally { this.stats.entries.push(rec); }
    return true;
  }

  /** "← Main menu" from the survey: mist → the survey is disposed and the menu returns with its next painting → mist clears. */
  async returnToMenu() {
    if (this.state !== "survey" || !this.survey) return false;
    this.state = "to-menu"; this.stats.returns++;
    const rm = this.reducedMotion;
    await this.atx.run({ preset: "subdued", conceal: "full", reducedMotion: rm, onCovered: async () => {
      const s = this.survey; this.survey = null;
      s.dispose();                                                    // renderer (one context), nine views, workers (the pool it owned), listeners, DOM
      this.surveyHost.hidden = true;
      this.menu.show();                                               // a new painting (preloaded) + the entrance; focus on Begin
      await frame();
    } });
    this.state = "menu";
    // a fresh sector for the next visit — started once the mist has cleared, so spawning the workers never competes with the reveal
    if (!this.prefetch) this._prefetchSector({ sectorSeed: null, firstBloom: false });
    return true;
  }

  dispose() {
    if (this.state === "disposed") return;
    this.state = "disposed";
    if (this.survey) { this.survey.dispose(); this.survey = null; }
    if (this.prefetch) { this.prefetch.dispose(); this.prefetch = null; }
    this.menu.dispose(); this.atx.dispose();
    this.menuHost.remove(); this.surveyHost.remove();
  }

  // ---------------------------------------------------------------- internals
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
