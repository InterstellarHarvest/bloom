// BLOOM — Expedition entry (BLOOM-028C, 028C1): the flow from the Main Menu into the Destination Survey and back. Owns the
// screens' hosts, the plain fade-through-black between them (028C1), ONE AtmosphereTransition kept for the survey's dramatic
// departure only, the first-sector prefetch that runs while the title is showing, and the player's motion setting.
//
//   import { ExpeditionEntry } from "<repo>/resources/main-menu/expedition-entry.js";
//   const entry = new ExpeditionEntry(root, { descent: { async onCovered(detail) { … mount gameplay from detail.planet … } } });
//   entry.state                       // "menu" | "to-survey" | "survey" | "to-menu" | "departed" | "leaving" | "away" | "returning" | "disposed"
//                                     // (035B) "species" · (036A) "to-challenges" | "challenges" · (036B) "challenge-world"
//   entry.beginExpedition()           // what EXPEDITION does; entry.returnToMenu() what "← Main menu" does
//   entry.leave()                     // (BLOOM-033) menu → black, the title put away: the app mounts a run (training) under the black
//   entry.enterRun()                  // (BLOOM-033) under the survey's DRAMATIC cover: the title / survey put away for the run
//   entry.resume({ to })              // (BLOOM-033) back from a run, under black: "menu" (the title) or "survey" (a fresh sector)
//   entry.fadeBlack(to)               // (BLOOM-033) the one fade layer, for the app's run exits (to 1: covered; 0: clear)
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
// (028D1) The fade itself is ./black-fade.js, shared with the training layer. (BLOOM-033: the 028D1 leaveTo() — leave the title for
// another page — and its back-forward-cache recovery are retired: nothing leaves the document; TRAINING is leave() + a run here.)
//
// (BLOOM-028D2) FIRST-RUN RECOMMENDATION. While training is available here (a TRAINING hook) and the player has NO training record
// (resources/training/training-store.js: neither "completed" nor "skipped"), TRAINING carries a small "Recommended" tag and the first
// BEGIN EXPEDITION opens ONE menu dialog instead of the survey — it never starts training by itself. "Go to Expedition" records
// "skipped" (the tag goes, it never asks again) and takes the ordinary path into the survey; "Start Training (~5 min)" leaves for the
// training run through the usual black and records nothing (the training itself records "completed" on its win, "skipped" on a
// confirmed skip). Closing the dialog (Escape) records nothing. The first-sector prefetch keeps running underneath throughout.
// beginExpedition() itself never prompts (?begin=1); resume({ to: "survey" }) never prompts either (the run's "Choose another planet",
// the finished training's Begin Expedition).
//
// (BLOOM-033) ONE DOCUMENT. The app (resources/app/app-controller.js) keeps this entry for the whole visit: a run (an expedition, a
// training) is mounted by the app in its own host while the title and the survey are put away (hidden, the menu's painting stopped, no
// prefetch running), and the player comes back by resume() — the same black, the same fades, no page load. The first survey visit uses
// the first-sector options (sectorSeed / firstBloom, development / QA); every later one scans a random sector.
//
// (BLOOM-035B) SPECIES. Every survey is FOR this entry's species (`entry.species`, a BLOOM.species.resolve object): Organic Hybrid unless
// the species flow is on (`speciesFlow` — BLOOM-035C2: the app always turns it on; an entry built without it, e.g. by a component test,
// is Organic Hybrid only). With it, EXPEDITION opens CHOOSE PLANT SPECIES first (`speciesScreen`, a factory the app supplies: the Species Selection screen) and the
// survey shows the species with a Change button; Change Species returns to the species screen and the next survey keeps the SAME
// sector seed and the same pool (its physical cache: nothing is validated twice), evaluated for the new species. The run's "Choose another
// planet" reopens a survey for the same species; the title's prefetch is for the last species chosen in this session.
//
// (BLOOM-036A) CHALLENGES. With a `challengeScreen` factory (the app's Challenge hub) the menu shows CHALLENGES: menu → black → the hub.
// (BLOOM-036B) A Challenge is a contained run with ONE generated planet — no Destination Survey. BEGIN CHALLENGE on the hub creates the
// Challenge LAUNCH (`entry.launch`: the Challenge, a fresh launch seed and its ChallengeWorldPrep — (036B1) the launch takes its world from
// the Challenge's prevalidated SEED BANK: no validation runs in the browser; one low-priority worker builds the selected plant's one world) → Choose Plant Species (only if the Challenge lets the player choose) → PREPARING CHALLENGE
// WORLD → the Challenge Planet Dossier (`challengeWorld.screen`, the app's factory) → BEGIN CHALLENGE → the dramatic departure → the run.
// Back from the dossier: Choose Plant Species (a player-choice Challenge: the same launch, so the same species again gives the same planet;
// another species is evaluated anew) or the hub (a prescribed species); Back from the species screen: the hub (the launch is let go —
// starting the Challenge again is a fresh instance). The Challenge and its launch are this entry's state, carried explicitly (never the URL
// or storage); EVERY return to the title clears them, and EXPEDITION / TRAINING never carry one. While a Challenge world is prepared the
// title's survey prefetch is stopped (no world generation competes with it); the title starts a fresh one when it is back.
import { MainMenu } from "./main-menu.js";
import { BlackFade } from "./black-fade.js";
import { readSettings, reducedMotionFor } from "./main-menu-data.js";
import { readTraining, writeTraining, clearTraining } from "../training/training-store.js";
import { DestinationSurvey } from "../destination-survey/destination-survey.js";
import { speciesFor } from "../destination-survey/survey-data.js";
import { AtmosphereTransition } from "../atmosphere-transition/atmosphere-transition.js";

const T = { paintingWait: 2000 }; // cap on waiting, black, for a painting that never decodes (fade timings: ./black-fade.js FADE)
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
   * onTraining         the menu's TRAINING hook (the app: leave() + a training run; omitted: the placeholder dialog)
   * transition         an AtmosphereTransition for the survey's departure (default: a private one over root)
   * storage            Storage for settings and (028D2) the training record (default localStorage)
   */
  constructor(root, { reducedMotion = undefined, sectorSeed = null, firstBloom = false, worker = true, workers = null, background = null, descent = null,
    onBeginExpedition = null, onTraining = null, transition = null, storage = undefined, rng = Math.random, speciesFlow = false, speciesScreen = null, challengeScreen = null,
    challengeWorld = null, launchSeed = null } = {}) {
    if (!root || typeof root.appendChild !== "function") throw new TypeError("ExpeditionEntry: root must be a DOM element");
    this.root = root; this.descent = descent; this.onBeginExpedition = onBeginExpedition; this.forcedReducedMotion = reducedMotion;
    this.poolOpts = { worker, workers }; this.firstSector = { sectorSeed, firstBloom };
    this.store = storage === undefined ? safe(() => globalThis.localStorage) : storage;
    this.settings = readSettings(this.store);
    this.state = "menu"; this.survey = null; this.prefetch = null; this.surveyVisits = 0;
    // (035B) the survey's species; the development species flow and its screen factory (both off / absent in the production flow)
    this.speciesFlow = !!speciesFlow; this.speciesScreen = typeof speciesScreen === "function" ? speciesScreen : null; this.species = speciesFor(null);
    if (this.speciesFlow && !this.speciesScreen) throw new TypeError("ExpeditionEntry: the species flow needs a speciesScreen factory");
    this.speciesView = null; this.carry = null; // carry: { pool, sectorSeed, firstBloom } kept across Change Species
    // (036A) the Challenge hub factory (the app's), the Challenge the flow is in (null: an Expedition) and the hub view
    this.challengeScreen = typeof challengeScreen === "function" ? challengeScreen : null; this.challenge = null; this.challengeView = null;
    // (036B) the Challenge world: the app's { load() → the module (ChallengeWorldPrep, newLaunchSeed), screen(host, opts) → the Preparing /
    // Dossier view }; the current launch { challenge, launchSeed, prep } (null outside a Challenge); (036B1) `recent`: cellKey → the bank entry
    // indices played in this session (in memory only — never storage), so a new launch avoids an immediate repeat; `launchSeed` fixes the NEXT launch's
    // seed (development / QA), consumed once
    this.challengeWorld = challengeWorld && typeof challengeWorld.screen === "function" && typeof challengeWorld.load === "function" ? challengeWorld : null;
    if (this.challengeScreen && !this.challengeWorld) throw new TypeError("ExpeditionEntry: the Challenge hub needs a challengeWorld (the one-planet launch)");
    this.launch = null; this.worldView = null; this.nextLaunchSeed = launchSeed; this.recent = new Map();
    this.stats = { begins: 0, returns: 0, entries: [], exits: [], prefetches: [], prompts: 0, promptChoices: [], leaves: 0, runs: 0, resumes: [], species: [], challenges: [], launches: [], worlds: [] };
    if (getComputedStyle(root).position === "static") root.style.position = "relative";
    this.menuHost = host(root, "ee-menu"); this.surveyHost = host(root, "ee-survey"); this.surveyHost.hidden = true;
    this.speciesHost = host(root, "ee-species"); this.speciesHost.hidden = true; // (035B) CHOOSE PLANT SPECIES (035C2: the normal flow)
    this.challengeHost = host(root, "ee-challenges"); this.challengeHost.hidden = true; // (036A) the CHALLENGES hub
    this.worldHost = host(root, "ee-challenge-world"); this.worldHost.hidden = true;     // (036B) PREPARING CHALLENGE WORLD / the Challenge Planet Dossier
    this.black = host(root, "ee-black"); this.black.setAttribute("aria-hidden", "true"); this._fader = new BlackFade(this.black); // the fade layer (above both screens, below the departure's clouds)
    this.black.style.cssText += "; z-index:9999; background:#000; opacity:0; display:none; pointer-events:auto; contain:strict";
    this.atx = transition || new AtmosphereTransition({ host: root });   // the survey's dramatic departure only (028C1)
    const toTraining = this._toTraining = onTraining || null;
    this.menu = new MainMenu(this.menuHost, { reducedMotion: this.reducedMotion, background, rng, storage,
      onBegin: () => this._beginPressed(),
      onChallenges: this.challengeScreen ? () => { this.beginChallenges().catch(err => console.error("ExpeditionEntry: could not open the Challenges", err)); } : null,
      onTraining: toTraining,
      onRecommendChoice: c => this._recommendChoice(c),
      onSettingsChange: s => this._settingsChanged(s),
      onTrainingReset: toTraining ? () => this.resetTrainingRecommendation() : null });
    this._syncTrainingTag();
    this._prefetchSector(this.firstSector);           // the first sector starts now, while the title is showing
    this.menu.shown.then(() => { if (this.state === "menu") this.atx.prepare(); }); // cloud bitmaps ready before the first transition
  }

  /** (028D2) The stored training record ({ status: null | "completed" | "skipped" }); training counts as offered only with a TRAINING hook. */
  get training() { return readTraining(this.store); }
  get recommendsTraining() { return !!this._toTraining && this.training.status === null; }

  /** null follows the OS (the components each read it live); true / false force it — from Settings unless overridden. */
  get reducedMotion() { return this.forcedReducedMotion !== undefined ? this.forcedReducedMotion : reducedMotionFor(this.settings.motion); }

  // ---------------------------------------------------------------- public
  /** EXPEDITION: menu → black → the survey is mounted (its sector prefetched, or still filling in) and drawn → black lifts. */
  async beginExpedition() {
    if (this.state !== "menu") return false;
    this.state = "to-survey"; this.stats.begins++;
    this.challenge = null;                                              // (036A) EXPEDITION never carries a Challenge
    const rm = this.reducedMotion, t0 = performance.now(), rec = { at: t0, prefetch: this.prefetch ? this.prefetch.progress : null, reducedMotion: rm };
    this.menuHost.inert = true;                                         // no menu input while it fades
    try {
      await this._fade(1, rm);
      if (this.state === "disposed") return false;
      rec.blackMs = Math.round(performance.now() - t0);
      this.menu.hide();
      if (this.speciesFlow) { await this._openSpecies(rm, rec, t0); return true; } // (035B) EXPEDITION → Choose Plant Species → Survey
      await this._openSurvey(rm, rec, t0);
      if (this.state === "disposed") return false;
      if (this.state === "to-survey") this.state = this.survey && this.survey.state !== "disposed" ? "survey" : "menu";
    } catch (err) {
      if (!this.survey && !this.speciesView && this.state !== "disposed") { // nothing was mounted: the menu is back as it was
        this.menuHost.inert = false; this.menu.show({ rotate: false, settled: true }); this.state = "menu"; this._fade(0, rm).catch(() => {});
      }
      throw err;
    } finally { this.stats.entries.push(rec); }
    return true;
  }

  /** (at full black, menu hidden) mount the survey — the prefetched sector's pool if there is one, else a fresh pool — draw it, lift the black. */
  async _openSurvey(rm, rec, t0) {
    // (035B) a Change Species carries the previous survey's pool and its sector seed: the same part of space, through another plant's eyes
    const carry = this.carry; this.carry = null;
    const pool = carry ? carry.pool : this.prefetch; if (!carry) this.prefetch = null; // ownership passes to the survey
    const visit = this.surveyVisits++;
    const first = carry ? { sectorSeed: carry.sectorSeed, firstBloom: carry.firstBloom } : visit === 0 ? this.firstSector : { sectorSeed: null, firstBloom: false };   // (BLOOM-033) later visits: a random sector
    const adopt = pool && !pool.disposed && !(carry == null && pool.first && pool.first.species.physiologyKey !== this.species.physiologyKey) ? pool : null;
    if (pool && !adopt && !carry) pool.dispose();                     // a title prefetch for another species: not this survey's
    this.surveyHost.hidden = false; this.surveyHost.inert = false;
    rec.species = this.species.id;
    const where = adopt && !carry ? {} : first;
    this.survey = new DestinationSurvey(this.surveyHost, { sectors: adopt, ...where, ...this.poolOpts, reducedMotion: rm, species: this.species,
      onChangeSpecies: this.speciesFlow ? sv => { this.changeSpecies(sv).catch(err => console.error("ExpeditionEntry: could not change species", err)); } : null,
      onExit: () => { this.returnToMenu().catch(err => console.error("ExpeditionEntry: could not return to the menu", err)); },
      onBeginExpedition: d => this._announced(d),
      descent: this.descent ? { ...this.descent, transition: this.descent.transition || this.atx } : null });
    this.menuHost.inert = false;
    this.survey.ready.then(() => { rec.surveyReadyMs = Math.round(performance.now() - t0); }, () => {}); // (rejects if disposed while loading: a return during the fill)
    rec.adopted = this.survey.stats.adopted; rec.swappedMs = Math.round(performance.now() - t0);
    await frame(); await frame();                                       // the survey's first layout and globe frames, drawn while black
    if (this.state === "disposed") return;
    rec.liftMs = Math.round(performance.now() - t0);
    await this._fade(0, rm);
    rec.revealedMs = Math.round(performance.now() - t0);
  }

  /** (BLOOM-033) The one black layer (above the title, the survey and a run; below the departure's clouds): to 1 covered, to 0 clear. */
  fadeBlack(to, rm = this.reducedMotion) { return to && this.covered ? Promise.resolve() : this._fade(to, rm); }
  /** (BLOOM-033) Is the black fully up (and not fading)? */
  get covered() { return !this._fader.anim && this.black.style.display !== "none" && +(this.black.style.opacity || 0) >= 0.999; }

  /**
   * (BLOOM-033) Leave the title for a run in this same document (TRAINING): from the menu only — the menu is made inert, the black fades in,
   * and at full black the title is put away (menu hidden, its prefetch stopped). The app then mounts the run under the black; the run's
   * own arrival lifts it. Resolves true once the title is away.
   */
  async leave() {
    if (this.state !== "menu") return false;
    this.state = "leaving"; this.menuHost.inert = true; this.stats.leaves++;
    await this._fade(1, this.reducedMotion);
    if (this.state !== "leaving") return false;
    this._putAway();
    return true;
  }

  /** (BLOOM-033) Under the survey's DRAMATIC cover (descent.onCovered): the title and the survey go away for the run (the survey disposes itself after). */
  enterRun() {
    if (this.state === "disposed") return false;
    this.stats.runs++; this.surveyHost.inert = true; this._putAway();
    return true;
  }
  _putAway() {
    this.state = "away"; this.menu.hide(); this.menuHost.inert = false;
    if (this.speciesView) this._closeSpecies();
    if (this.challengeView) this._closeChallenges();
    if (this.worldView) { this.worldHost.hidden = true; this.worldHost.inert = true; } // (036B) under the departure's cover: the dossier disposes itself after
    if (this.prefetch) { this.prefetch.dispose(); this.prefetch = null; }   // no world generation competes with a run
    this.surveyHost.hidden = true;
  }

  /**
   * (BLOOM-033) Back from a run, which the app has disposed: `to` "menu" — the title with its next painting, settled, the training tag
   * re-read, a fresh first-sector prefetch; or "survey" — a fresh survey (a random sector after the first visit); (036B) or "challenges" —
   * the Challenge hub (the last Challenge selected; BEGIN CHALLENGE there is a fresh instance). The black is brought to
   * full cover first (normally it already is: the run's exit faded into it), and lifts once the screen has drawn. No page load.
   */
  async resume({ to = "menu" } = {}) {
    if (this.state !== "away" && this.state !== "departed") return false;
    this.state = "returning";
    const rm = this.reducedMotion, t0 = performance.now(), rec = { to, at: t0, reducedMotion: rm };
    this.stats.resumes.push(rec);
    if (this.survey) { const s = this.survey; this.survey = null; if (s.state !== "disposed") s.dispose(); }   // (a departed survey is gone already)
    if (!this.covered) await this._fade(1, rm);                       // (normally the run's exit already faded to full black: never re-fade from clear)
    if (this.state === "disposed") return false;
    rec.blackMs = Math.round(performance.now() - t0);
    if (to === "species" && this.speciesFlow) { this.state = "to-survey"; this.stats.begins++; await this._openSpecies(rm, rec, t0); return true; } // (035B)
    if (to === "challenges" && this.challengeScreen) { this.challenge = null; this._endLaunch(); await this._openChallenges(rm, rec, t0); return true; } // (036B) the run's CHALLENGES
    if (to === "survey") {
      this.state = "to-survey"; this.stats.begins++;
      await this._openSurvey(rm, rec, t0);
      if (this.state === "disposed") return false;
      if (this.state === "to-survey") this.state = this.survey && this.survey.state !== "disposed" ? "survey" : "menu";
      return true;
    }
    this.challenge = null; this._endLaunch();                           // (036A) the title never carries a Challenge
    this._syncTrainingTag();
    const shown = this.menu.show({ settled: true });
    rec.swappedMs = Math.round(performance.now() - t0);
    await Promise.race([shown, sleep(T.paintingWait)]);
    await frame(); await frame();
    if (this.state === "disposed") return false;
    rec.liftMs = Math.round(performance.now() - t0);
    await this._fade(0, rm);
    rec.revealedMs = Math.round(performance.now() - t0);
    this.state = "menu"; this.menu.focusMenu();
    if (!this.prefetch) this._prefetchSector({ sectorSeed: null, firstBloom: false });
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
    this.challenge = null;                                              // (036A) the title never carries a Challenge
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

  // ---------------------------------------------------------------- (035B) species (035C2: the normal flow)
  /** Choose the species the next survey is for (an id or a resolved object; an unknown id THROWS). Only the species flow may choose a
   *  species other than Organic Hybrid: the production flow has no control for it. */
  setSpecies(species) {
    const sp = speciesFor(species);
    if (!this.speciesFlow && sp.id !== this.species.id) throw new Error("ExpeditionEntry: the species can only change in the species flow");
    this.species = sp; this.stats.species.push({ id: sp.id, at: performance.now() });
    return sp;
  }

  /** At full black: mount CHOOSE PLANT SPECIES (the app's screen), focused on this entry's species; lift the black. */
  async _openSpecies(rm, rec, t0) {
    this.speciesHost.hidden = false; this.speciesHost.inert = false;
    // (036B) inside a Challenge the launch prepares the SELECTED plant's world while the player reads (choosing it joins that work)
    const warm = this.challenge && this.launch ? sp => { if (this.launch) this.launch.prep.prepare(sp); } : null;
    if (warm) warm(this.species);
    const view = this.speciesView = this.speciesScreen(this.speciesHost, { species: this.species, reducedMotion: rm, challenge: this.challenge, onSelect: warm, // (036A) the screen names it
      onChoose: sp => { this._speciesChosen(sp).catch(err => console.error("ExpeditionEntry: could not open the survey", err)); },
      onBack: () => { this._speciesBack().catch(err => console.error("ExpeditionEntry: could not return to the menu", err)); } });
    this.state = "species"; this.menuHost.inert = false;
    if (view.ready) await view.ready;
    await frame(); await frame();
    if (this.state === "disposed") return;
    rec.speciesMs = Math.round(performance.now() - t0);
    await this._fade(0, rm);
    if (view.focus) view.focus();
  }
  _closeSpecies() { const v = this.speciesView; this.speciesView = null; if (v) v.dispose(); this.speciesHost.hidden = true; this.speciesHost.replaceChildren(); }

  /** "Survey for <species>": black → the species screen goes → the survey for that species (a carried sector seed, if any) → black lifts. */
  async _speciesChosen(sp) {
    if (this.state !== "species") return false;
    const rm = this.reducedMotion, t0 = performance.now(), rec = { at: t0, reducedMotion: rm, fromSpecies: true };
    this.state = "to-survey"; this.speciesHost.inert = true; this.stats.entries.push(rec);
    await this._fade(1, rm);
    if (this.state === "disposed") return false;
    rec.blackMs = Math.round(performance.now() - t0);
    this.setSpecies(sp); this._closeSpecies();
    if (this.challenge) { rec.challenge = this.challenge.id; await this._openWorld(rm, rec, t0); return true; } // (036B) → PREPARING CHALLENGE WORLD
    await this._openSurvey(rm, rec, t0);
    if (this.state === "to-survey") this.state = this.survey && this.survey.state !== "disposed" ? "survey" : "menu";
    return true;
  }

  /** Back from the species screen: black → the title (a carried pool is let go) → black lifts. */
  async _speciesBack() {
    if (this.state !== "species") return false;
    const rm = this.reducedMotion; this.state = "to-menu"; this.speciesHost.inert = true; this.stats.returns++;
    await this._fade(1, rm);
    if (this.state === "disposed") return false;
    this._closeSpecies();
    if (this.carry) { if (this.carry.pool) this.carry.pool.dispose(); this.carry = null; }
    if (this.challenge && this.challengeScreen) { this.challenge = null; this._endLaunch(); await this._openChallenges(rm, { at: performance.now(), back: true }, performance.now()); return true; } // (036A) back to the hub; (036B) the launch is let go
    this._syncTrainingTag();
    const shown = this.menu.show({ settled: true });
    await Promise.race([shown, sleep(T.paintingWait)]); await frame(); await frame();
    if (this.state === "disposed") return false;
    await this._fade(0, rm);
    this.state = "menu"; this.menu.focusMenu();
    if (!this.prefetch) this._prefetchSector({ sectorSeed: null, firstBloom: false });
    return true;
  }

  /** Change Species from the survey: black → the survey goes (its pool and sector seed are carried) → the species screen → black lifts. */
  async changeSpecies(survey = this.survey) {
    if (this.state !== "survey" || !this.speciesFlow || !survey) return false;
    const rm = this.reducedMotion, t0 = performance.now(), rec = { at: t0, reducedMotion: rm, change: true, sectorSeed: survey.sectorSeed, from: this.species.id };
    this.state = "to-survey"; this.surveyHost.inert = true; this.stats.species.push({ change: true, sectorSeed: survey.sectorSeed, at: t0 });
    await this._fade(1, rm);
    if (this.state === "disposed") return false;
    const seed = survey.sectorSeed, firstBloom = survey.firstBloom;
    this.survey = null; const pool = survey.dispose({ keepPool: true });
    this.carry = { pool, sectorSeed: seed, firstBloom };
    this.surveyHost.hidden = true; this.surveyHost.inert = false;
    await this._openSpecies(rm, rec, t0);
    return true;
  }

  // ---------------------------------------------------------------- (036A) Challenges
  /** CHALLENGES: menu → black → the Challenge hub → black lifts. The flow carries no Challenge until the hub's BEGIN CHALLENGE. */
  async beginChallenges() {
    if (this.state !== "menu" || !this.challengeScreen) return false;
    this.state = "to-challenges"; this.challenge = null;
    const rm = this.reducedMotion, t0 = performance.now(), rec = { at: t0, reducedMotion: rm, hub: true };
    this.stats.challenges.push(rec); this.menuHost.inert = true;
    try {
      await this._fade(1, rm);
      if (this.state === "disposed") return false;
      this.menu.hide();
      await this._openChallenges(rm, rec, t0);
    } catch (err) {
      if (!this.challengeView && this.state !== "disposed") { this.menuHost.inert = false; this.menu.show({ rotate: false, settled: true }); this.state = "menu"; this._fade(0, rm).catch(() => {}); }
      throw err;
    }
    return true;
  }

  /** (at full black) mount the hub (the app's screen), focused on the last Challenge chosen in this visit; lift the black. */
  async _openChallenges(rm, rec, t0) {
    this.challengeHost.hidden = false; this.challengeHost.inert = false;
    const last = this._lastChallenge || null;
    const view = this.challengeView = this.challengeScreen(this.challengeHost, { challenge: last, reducedMotion: rm,
      onChoose: ch => { this._challengeChosen(ch).catch(err => console.error("ExpeditionEntry: could not start the Challenge", err)); },
      onBack: () => { this._challengesBack().catch(err => console.error("ExpeditionEntry: could not return to the menu", err)); } });
    this.state = "challenges"; this.menuHost.inert = false;
    if (view.ready) await view.ready;
    await frame(); await frame();
    if (this.state === "disposed") return;
    rec.hubMs = Math.round(performance.now() - t0);
    await this._fade(0, rm);
    if (view.focus) view.focus();
  }
  _closeChallenges() { const v = this.challengeView; this.challengeView = null; if (v) v.dispose(); this.challengeHost.hidden = true; this.challengeHost.replaceChildren(); }

  /** BEGIN CHALLENGE: black → the hub goes → the LAUNCH (a fresh launch seed; (036B1) its one world worker starts idle) → Choose Plant Species (a player-choice Challenge) or straight to PREPARING CHALLENGE WORLD (a prescribed species) → black lifts. */
  async _challengeChosen(ch) {
    if (this.state !== "challenges") return false;
    const B = globalThis.BLOOM;
    if (!ch || typeof ch.id !== "string" || B.challenges.resolve(ch.id) !== ch) throw new TypeError("ExpeditionEntry: BEGIN CHALLENGE needs a canonical resolved Challenge");
    const rm = this.reducedMotion, t0 = performance.now(), rec = { at: t0, reducedMotion: rm, challenge: ch.id, scenario: ch.scenario };
    this.state = "to-challenge"; this.challengeHost.inert = true; this.stats.challenges.push(rec);
    try {
      await this._fade(1, rm);
      if (this.state === "disposed") return false;
      this.challenge = ch; this._lastChallenge = ch; this._closeChallenges();
      if (this.prefetch) { this.prefetch.dispose(); this.prefetch = null; }  // the title's survey prefetch: no world generation competes with the Challenge's
      await this._startLaunch(ch);
      rec.launchSeed = this.launch.launchSeed;
      const pres = B.challenges.speciesOf(ch);
      if (pres) { this.setSpecies(pres); rec.species = pres.id; await this._openWorld(rm, rec, t0); return true; }  // (036B) prescribed: no species screen
      if (this.speciesFlow) { await this._openSpecies(rm, rec, t0); return true; }
      await this._openWorld(rm, rec, t0);                                // (an entry without the species flow: Organic Hybrid)
      return true;
    } catch (err) {                                                      // nothing half-started: back to the hub
      this._endLaunch(); this.challenge = null;
      if (this.state !== "disposed" && !this.challengeView && !this.speciesView && !this.worldView) await this._openChallenges(rm, { at: performance.now(), error: true }, performance.now());
      throw err;
    }
  }

  /** (036B) the Challenge launch: its seed (a fixed development / QA seed once, else fresh) and (036B1) its seed-bank preparation. */
  async _startLaunch(ch) {
    this._endLaunch();
    const M = await this.challengeWorld.load(), seed = this.nextLaunchSeed != null ? this.nextLaunchSeed : M.newLaunchSeed(); this.nextLaunchSeed = null;
    const recent = new Map([...this.recent].map(([k, v]) => [k, v.slice()]));   // this launch's view of the session history (fixed for the launch)
    const prep = new M.ChallengeWorldPrep({ challenge: ch, launchSeed: seed, avoid: key => recent.get(key) || [], worker: this.poolOpts.worker });
    this.launch = { challenge: ch, launchSeed: seed, prep, at: performance.now() };
    this.stats.launches.push({ challenge: ch.id, launchSeed: seed, at: this.launch.at });
    return this.launch;
  }
  /** (036B) let the launch go: its workers terminated, its held worlds dropped (a planet a run already holds is untouched). */
  _endLaunch() { const L = this.launch; this.launch = null; if (L && L.prep) L.prep.dispose(); }
  /** (036B1) a Challenge run began on this bank entry: remembered for this session (in memory) so the next launch avoids repeating it */
  noteChallengeRun(X) { const k = X.bank.cellKey, a = (this.recent.get(k) || []).filter(i => i !== X.entryIndex); a.push(X.entryIndex); this.recent.set(k, a.slice(-16)); }

  /** (036B) At full black: PREPARING CHALLENGE WORLD for this entry's species, which becomes the dossier; lift the black. */
  async _openWorld(rm, rec, t0) {
    const L = this.launch; if (!L) throw new Error("ExpeditionEntry: no Challenge launch");
    this.worldHost.hidden = false; this.worldHost.inert = false;
    const wrec = { challenge: L.challenge.id, launchSeed: L.launchSeed, species: this.species.id, at: performance.now(), outcome: null, readyMs: null };
    this.stats.worlds.push(wrec);
    const view = this.worldView = this.challengeWorld.screen(this.worldHost, { challenge: L.challenge, species: this.species, prep: L.prep, reducedMotion: rm,
      descent: this.descent ? { ...this.descent, transition: this.descent.transition || this.atx } : null,
      onBegin: d => this._worldBegin(d),
      onBack: () => { this._worldBack().catch(err => console.error("ExpeditionEntry: could not go back from the Challenge world", err)); } });
    this.state = "challenge-world"; this.menuHost.inert = false;
    if (view.ready) await view.ready;
    if (view.prepared) view.prepared.then(o => { wrec.outcome = o && o.ok ? "ready" : o && o.cancelled ? "cancelled" : "exhausted"; wrec.readyMs = Math.round(performance.now() - wrec.at); }, () => { wrec.outcome = "error"; });
    await frame(); await frame();
    if (this.state === "disposed") return;
    rec.worldMs = Math.round(performance.now() - t0);
    await this._fade(0, rm);
    if (view.focus) view.focus();
  }
  _closeWorld({ keepView = false } = {}) { const v = this.worldView; this.worldView = null; if (v && !keepView) v.dispose(); this.worldHost.hidden = true; if (!keepView) this.worldHost.replaceChildren(); }

  /** (036B) BEGIN CHALLENGE on the dossier: the departure runs (the screen's); under its cover the app mounts the run (descent.onCovered). */
  _worldBegin(detail) {
    if (this.state !== "challenge-world") return;
    this.stats.challenges.push({ begin: true, challenge: detail.challenge.id, fingerprint: detail.instance.fingerprint, at: performance.now() });
    // the run is mounted once the departure resolves: the dossier has disposed itself and the launch (its workers) is let go — the run holds
    // its instance. (A failed departure keeps both: the app puts the dossier back under the same cover.)
    if (detail.descent) detail.descent.then(() => {
      if (this.state === "challenge-world") this.state = "departed";
      if (this.worldView) { this.worldView = null; this.worldHost.replaceChildren(); this.worldHost.inert = false; }
      if (this.launch && this.launch.challenge === detail.challenge) this._endLaunch();
    }, () => {});
    if (this.onBeginExpedition) this.onBeginExpedition(detail);
  }

  /** (036B) Back from PREPARING / the dossier: black → Choose Plant Species (player choice; the same launch) or the hub (prescribed) → black lifts. */
  async _worldBack() {
    if (this.state !== "challenge-world") return false;
    const rm = this.reducedMotion; this.state = "to-challenge"; this.worldHost.inert = true; this.stats.returns++;
    await this._fade(1, rm);
    if (this.state === "disposed") return false;
    this._closeWorld();
    const B = globalThis.BLOOM;
    if (this.challenge && !B.challenges.speciesOf(this.challenge) && this.speciesFlow) { await this._openSpecies(rm, { at: performance.now(), back: true }, performance.now()); return true; }
    this.challenge = null; this._endLaunch();
    await this._openChallenges(rm, { at: performance.now(), back: true }, performance.now());
    return true;
  }

  /** The hub's Main menu: black → the title (no Challenge) → black lifts. */
  async _challengesBack() {
    if (this.state !== "challenges") return false;
    const rm = this.reducedMotion; this.state = "to-menu"; this.challengeHost.inert = true; this.stats.returns++;
    await this._fade(1, rm);
    if (this.state === "disposed") return false;
    this._closeChallenges(); this.challenge = null; this._endLaunch();
    this._syncTrainingTag();
    const shown = this.menu.show({ settled: true });
    await Promise.race([shown, sleep(T.paintingWait)]); await frame(); await frame();
    if (this.state === "disposed") return false;
    await this._fade(0, rm);
    this.state = "menu"; this.menu.focusMenu();
    if (!this.prefetch) this._prefetchSector({ sectorSeed: null, firstBloom: false });
    return true;
  }

  dispose() {
    if (this.state === "disposed") return;
    this.state = "disposed";
    if (this.challengeView) { this.challengeView.dispose(); this.challengeView = null; }
    if (this.worldView) { this.worldView.dispose(); this.worldView = null; }
    this._endLaunch();
    if (this.survey) { this.survey.dispose(); this.survey = null; }
    if (this.prefetch) { this.prefetch.dispose(); this.prefetch = null; }
    if (this.speciesView) { this.speciesView.dispose(); this.speciesView = null; }
    if (this.carry && this.carry.pool) { this.carry.pool.dispose(); this.carry = null; }
    this._fader.cancel();
    this.menu.dispose(); this.atx.dispose();
    this.menuHost.remove(); this.surveyHost.remove(); this.speciesHost.remove(); this.challengeHost.remove(); this.worldHost.remove(); this.black.remove();
  }

  // ---------------------------------------------------------------- internals
  /** BEGIN EXPEDITION pressed on the menu: (028D2) the one first-run recommendation while there is no training record, else the survey. */
  _beginPressed() {
    if (this.state !== "menu") return;
    if (this.recommendsTraining) { this.stats.prompts++; this.menu.openDialog("recommend", this.menu.items.begin); return; }
    this.beginExpedition().catch(err => console.error("ExpeditionEntry: could not enter the survey", err));
  }
  /** (028D2) the recommendation's answer: the expedition records "skipped" and enters the survey; training just leaves for it */
  _recommendChoice(choice) {
    if (this.state !== "menu") return;
    this.stats.promptChoices.push(choice);
    if (choice === "expedition") { writeTraining(this.store, "skipped"); this._syncTrainingTag();
      this.beginExpedition().catch(err => console.error("ExpeditionEntry: could not enter the survey", err)); }
    else if (choice === "training" && this._toTraining) this._toTraining();
  }
  /** (v1.0.1) Settings: the training record back to first-run (the training store's own clearTraining), so TRAINING carries its
   *  Recommended tag again and the next EXPEDITION offers the first-run recommendation. Launches nothing; no flow state changes. */
  resetTrainingRecommendation() { clearTraining(this.store); this._syncTrainingTag(); }
  _syncTrainingTag() { this.menu.setTrainingRecommended(this.recommendsTraining); }

  /** The black layer to opacity `to` (1: covered, 0: clear): ./black-fade.js (220 / 250 ms, reduced motion 80 / 80 ms). */
  _fade(to, rm) { return this._fader.fade(to, rm); }

  _prefetchSector(first) {
    const pool = this.prefetch = DestinationSurvey.prefetch({ ...first, ...this.poolOpts, species: this.species }), rec = { seed: pool.first.seed, species: this.species.id, at: performance.now(), readyMs: null };
    this.stats.prefetches.push(rec);
    // (v1.0.1, owner direction) the prefetch runs silently: the title never shows survey progress or a completed sector (no status line,
    // banner, toast or badge) — the Destination Survey's own header reports progress once the player is in it
    pool.ready.then(() => { rec.readyMs = Math.round(performance.now() - rec.at); }, () => {});
  }

  _announced(detail) {
    if (detail.descent) detail.descent.then(() => { if (this.state === "survey") { this.state = "departed"; this.survey = null; } else if (this.state === "away" && this.survey && this.survey.state === "disposed") this.survey = null; }, () => {});
    if (this.onBeginExpedition) this.onBeginExpedition(detail);
  }

  _settingsChanged(s) { this.settings = s; this.menu.setReducedMotion(this.reducedMotion); } // (a survey already open keeps its setting; the next one takes the new one)
}

function host(root, cls) { const h = document.createElement("div"); h.className = cls; h.style.cssText = "position:absolute; inset:0"; root.appendChild(h); return h; }
function safe(f) { try { return f(); } catch { return null; } }
