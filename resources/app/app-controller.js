// BLOOM — the Strange Bloom APP (BLOOM-033): the whole game in ONE document, index.html. docs/SINGLE_DOCUMENT_APP_v1.md.
//
//   import { mountApp } from "<repo>/resources/app/app-controller.js";
//   const app = mountApp({ app: document.getElementById("app"), runScripts })   // → the AppController (also window.BLOOM_APP)
//
// THREE SCREENS, mounted and disposed in place — never a document navigation:
//   TITLE    the Main Menu (EXPEDITION · TRAINING · SETTINGS · CREDITS) over one of twelve paintings      ┐ resources/main-menu/
//   SURVEY   the Destination Survey (focus, inspect, Begin Expedition)                                     ┘ expedition-entry.js owns both
//   RUN      one GameSession (resources/run/game-session.js): an expedition, or Training (a run configuration, not a page); the
//            Bloom / Extinction report is part of the run
//
//   title → survey          EXPEDITION (the first-run recommendation may ask once): the title's black fade (ExpeditionEntry)
//   survey → run            Begin Expedition: the DRAMATIC descent; under its full cover the EXACT selected planet becomes the run
//   run → run               Play Again: black → a fresh session on the SAME planet object → black lifts
//   run → survey / title    Choose Another Planet / Main Menu: black → the session is disposed → a fresh survey / the title → black lifts
//   title → training run    TRAINING: black → a training session; its own layer lifts the black and starts the guided lessons
//   training → …            Restart Training (a fresh training session) · Main Menu / Skip Training (the title) · Begin Expedition
//                           (the survey): each fades to black in the training layer, then comes here
//
// THE IDENTITY RULE. The Destination Survey's detail.planet IS the gameplay planet: BLOOM.gameSession.expeditionRun(detail) hands that very
// object to BLOOM.createSim. Nothing on this path serializes it, stores it (no sessionStorage, localStorage or window.name), puts it in the
// URL, regenerates it, searches for it, re-validates it or opens another document. Its planetFingerprint is computed once, here, for QA
// and provenance (the survey's own algorithm, survey-data.js).
//
// RELOAD POLICY. Runs are not saved: a reload returns to the title. The address never changes (no token, no planet, no screen in it).
//
// SPECIES (BLOOM-035B). A run's species travels with its planet: the survey's detail.species (the canonical BLOOM.species object the
// candidate was classified and validated for) → expeditionRun → GameSession → createSim; Play Again reuses the SAME planet and the SAME
// species objects; Choose Another Planet opens a survey for the same species; Main Menu clears the run. TRAINING is always Organic
// Hybrid (BLOOM.gameSession.trainingRun). (BLOOM-035C2) Species Selection (resources/species-select/, loaded lazily on the first EXPEDITION)
// is the normal flow: EXPEDITION → Choose Plant Species → Destination Survey → Begin Expedition → gameplay, all four species on their
// PMO-accepted art. The old development flag ?species=1 is ignored — there is one behaviour path.
//
// CHALLENGES (BLOOM-036A hub; BLOOM-036B launch, docs/CHALLENGES_SYSTEM_v1.md). The menu's CHALLENGES opens the Challenge hub
// (resources/challenges/, loaded lazily on the first CHALLENGES): BEGIN CHALLENGE → Choose Plant Species (if the Challenge allows it) →
// PREPARING CHALLENGE WORLD → the Challenge Planet Dossier (ONE generated planet; no Destination Survey) → BEGIN CHALLENGE → the run → the
// report. The dossier's detail.instance (the Challenge instance: canonical Challenge, scenario, species, starting state and the EXACT planet
// object) → BLOOM.gameSession.challengeRun(instance) → the run. RETRY CHALLENGE: the same instance (planet, Challenge, species, starting
// state objects), a fresh simulation; CHALLENGES: the hub (beginning a Challenge again is a fresh instance); Main Menu clears it. TRAINING
// and EXPEDITION never carry one.
// Development / QA query parameters (never needed by a player): ?bg=<1…12> · &rm=1 | &rm=0 · &sector=<n> · &firstBloom=1 ·
// &workers=<1…8> · &worker=0 · &launch=<n> (036B: the first Challenge launch's seed) · &begin=1 (enter the survey at once; dropped from the address) · &hold=<ms> / &fail=1 / &seed=<n> (the
// departure's covered work / cloud layout). window.MENU_DEV (QA): { ready, errors, events, hooks, departures, results, entry, page, app }.
import { ExpeditionEntry } from "../main-menu/expedition-entry.js";
import { planetFingerprint } from "../destination-survey/survey-data.js";

export const TITLE_TEXT = "Strange Bloom — Unknown Soils";
// the training layer (coach, director, lessons) is loaded on the first TRAINING only: an expedition never loads it. Served: import(); over
// file://: the same module from the portable runtime (BLOOM.modules, resources/portable/module-loader.js)
const TRAINING_URL = new URL("../training/training-run.js", import.meta.url).href;
let trainingModule = null;
const loadTraining = () => trainingModule || (trainingModule = (window.BLOOM.modules && BLOOM.modules.portable ? BLOOM.modules.load(TRAINING_URL) : import(TRAINING_URL)));
const RUN_ACTIONS = new Set(["playAgain", "choosePlanet", "mainMenu", "restartRun", "retryChallenge", "challenges"]);
// (035B; 035C2 released) the Species Selection screen, loaded on the first EXPEDITION
const SPECIES_URL = new URL("../species-select/species-select.js", import.meta.url).href;
let speciesModule = null;
const loadSpeciesScreen = () => speciesModule || (speciesModule = (window.BLOOM.modules && BLOOM.modules.portable ? BLOOM.modules.load(SPECIES_URL) : import(SPECIES_URL)));
// (036A) the CHALLENGES hub, loaded on the first CHALLENGES
const CHALLENGES_URL = new URL("../challenges/challenge-hub.js", import.meta.url).href;
let challengesModule = null;
const loadChallengeHub = () => challengesModule || (challengesModule = (window.BLOOM.modules && BLOOM.modules.portable ? BLOOM.modules.load(CHALLENGES_URL) : import(CHALLENGES_URL)));
// (036B) the Challenge world (PREPARING CHALLENGE WORLD / the dossier, and the launch's search), loaded on the first BEGIN CHALLENGE
const WORLD_URL = new URL("../challenges/challenge-world-screen.js", import.meta.url).href;
let worldModule = null;
const loadChallengeWorld = () => worldModule || (worldModule = (window.BLOOM.modules && BLOOM.modules.portable ? BLOOM.modules.load(WORLD_URL) : import(WORLD_URL)));

export class AppController {
  /**
   * app          the sized app element (the title, the survey and the run all live inside it)
   * runScripts   a Promise of the run's classic scripts (title-boot.js loads them right after the title is up); awaited before a run
   * entry        ExpeditionEntry options (QA / development: reducedMotion, background, sectorSeed, firstBloom, workers, worker, seed …)
   * dev          { hold, fail } — the departure's covered work (development / QA)
   */
  constructor(app, { runScripts = Promise.resolve(), entry = {}, dev = {}, onEvent = null, speciesFlow = false } = {}) {
    if (!app || typeof app.appendChild !== "function") throw new TypeError("AppController: app must be a DOM element");
    this.app = app; this.runScripts = runScripts; this.dev = dev; this.onEvent = onEvent; this.speciesFlow = !!speciesFlow;
    this.session = null; this.expedition = null; this.challengeRun = null; this.busy = false; this.disposed = false;
    this.stats = { sessions: [], actions: [], departures: [] };
    this.runHost = document.createElement("div"); this.runHost.className = "app-run"; this.runHost.hidden = true; app.appendChild(this.runHost);
    const seed = entry.seed ?? null;
    // (035B) the species screen factory: the screen draws real specimens, so it waits for the run's classic scripts (the sprite runtime)
    const speciesScreen = this.speciesFlow ? (host, opts) => {
      const view = { ready: null, inner: null, focus() { if (this.inner) this.inner.focus(); }, dispose() { this.disposed = true; if (this.inner) this.inner.dispose(); } };
      view.ready = Promise.all([loadSpeciesScreen(), this.runScripts]).then(([M]) => { if (!view.disposed) { view.inner = new M.SpeciesSelect(host, opts); this._ev("species-screen", { focused: opts.species.id }); return view.inner.ready; } });
      return view; } : null;
    // (036A) the Challenge hub factory (BLOOM.challenges is loaded with the title's classic scripts; the hub draws no specimens)
    const challengeScreen = (host, opts) => {
      const view = { ready: null, inner: null, focus() { if (this.inner) this.inner.focus(); }, dispose() { this.disposed = true; if (this.inner) this.inner.dispose(); } };
      view.ready = loadChallengeHub().then(M => { if (!view.disposed) { view.inner = new M.ChallengeHub(host, opts); this._ev("challenge-hub", { focused: view.inner.selected.id }); return view.inner.ready; } });
      return view; };
    // (036B) the Challenge world: the launch module, and its screen (it draws the plant's specimen, so it waits for the run's classic scripts)
    const challengeWorld = { load: loadChallengeWorld, screen: (host, opts) => {
      const view = { ready: null, prepared: null, inner: null, focus() { if (this.inner) this.inner.focus(); }, dispose() { this.disposed = true; if (this.inner) this.inner.dispose(); } };
      view.ready = Promise.all([loadChallengeWorld(), this.runScripts]).then(([M]) => { if (!view.disposed) { view.inner = new M.ChallengeWorldScreen(host, opts); this._ev("challenge-world", { challenge: opts.challenge.id, species: opts.species.id }); return view.inner.ready; } });
      view.prepared = view.ready.then(() => view.inner ? view.inner.prepared : { ok: false, cancelled: true });
      return view; } };
    this.entry = new ExpeditionEntry(app, { ...entry, speciesFlow: this.speciesFlow, speciesScreen, challengeScreen, challengeWorld,
      onTraining: () => { this.startTraining().catch(err => this._error("training", err)); },
      onBeginExpedition: d => this._ev(d.instance ? "begin-challenge" : "begin-expedition", { key: d.candidate.key, ...(d.instance ? { challenge: d.instance.challengeId, fingerprint: d.instance.fingerprint } : {}) }),
      descent: {
        seed,
        onCovered: (detail, info) => this._depart(detail, info),
        onError: err => { this._ev("descent-error", { error: err.message }); },
      },
    });
  }

  /** "title" | "survey" | "run" — the screen the player is on (or moving to). */
  get screen() { if (this.session) return "run"; const s = this.entry.state; return s === "species" ? "species" : s === "challenges" ? "challenges" : s === "challenge-world" ? "challenge-world" : s === "survey" || s === "to-survey" ? "survey" : "title"; }
  /** (036A) the Challenge the flow / run is in (null: an Expedition, Training or the title) */
  get challenge() { return this.session ? (this.challengeRun && this.challengeRun.instance.challenge) || null : this.entry.challenge; }

  // ---------------------------------------------------------------- survey → run (under the DRAMATIC descent's full cover)
  async _depart(detail, info) {
    if (detail.instance) return this._departChallenge(detail, info);                // (036B) a Challenge's one planet
    const rec = { at: performance.now(), concealed: info.concealed, reducedMotion: info.reducedMotion, key: detail.candidate.key, planet: detail.planet, species: detail.species, challenge: null };
    if (this.entry.challenge) throw new Error("AppController: the Destination Survey never launches a Challenge");
    this.stats.departures.push(rec);
    if (this.dev.hold) await new Promise(r => setTimeout(r, this.dev.hold));
    if (this.dev.fail) throw new Error("dev: covered work failed (fail=1)");
    await this.runScripts;
    rec.fingerprint = planetFingerprint(detail.planet);          // the survey's own identity algorithm, once (QA / provenance)
    // the exact selection, kept for Play Again: the same objects the survey handed over (planet, (035B) species, candidate provenance, render hints)
    const selected = { planet: detail.planet, species: detail.species, candidate: detail.candidate, render: detail.render || null };
    this.entry.enterRun();
    try {
      await this._mount(BLOOM.gameSession.expeditionRun(selected, { fingerprint: rec.fingerprint }));
    } catch (err) {                                              // nothing half-started: the survey comes back under the same cover
      this._disposeSession(); this.entry.state = "survey"; this.entry.surveyHost.hidden = false; this.entry.surveyHost.inert = false;
      throw err;
    }
    this.expedition = { selected, fingerprint: rec.fingerprint }; this.challengeRun = null;
    rec.sessionAt = performance.now(); rec.planetIsSelected = this.session.planet === detail.planet; rec.speciesIsSelected = this.session.run.species === detail.species;
    this._ev("depart", { key: rec.key, fingerprint: rec.fingerprint, species: detail.species.id, challenge: null, scenario: null });
  }

  /** (036B) BEGIN CHALLENGE under the dossier's DRAMATIC cover: the instance's exact planet becomes the run (BLOOM.gameSession.challengeRun). */
  async _departChallenge(detail, info) {
    const X = detail.instance, rec = { at: performance.now(), concealed: info.concealed, reducedMotion: info.reducedMotion, key: X.candidate.key, planet: X.planet, species: X.species, challenge: X.challenge, instance: X };
    if (X.challenge !== this.entry.challenge) throw new Error("AppController: the dossier's Challenge is not the flow's");
    this.stats.departures.push(rec);
    if (this.dev.hold) await new Promise(r => setTimeout(r, this.dev.hold));
    if (this.dev.fail) throw new Error("dev: covered work failed (fail=1)");
    await this.runScripts;
    rec.fingerprint = planetFingerprint(X.planet);
    if (rec.fingerprint !== X.fingerprint) throw new Error("AppController: the Challenge planet changed after its selection");
    this.entry.enterRun();
    try { await this._mount(BLOOM.gameSession.challengeRun(X, { fingerprint: rec.fingerprint })); }
    catch (err) { this._disposeSession(); this.entry.state = "challenge-world"; this.entry.worldHost.hidden = false; this.entry.worldHost.inert = false; throw err; } // the dossier comes back under the same cover
    this.challengeRun = { instance: X, fingerprint: rec.fingerprint }; this.expedition = null;
    rec.sessionAt = performance.now(); rec.planetIsSelected = this.session.planet === X.planet; rec.speciesIsSelected = this.session.run.species === X.species;
    rec.challengeIsSelected = this.session.run.challenge === X.challenge;
    this._ev("depart", { key: rec.key, fingerprint: rec.fingerprint, species: X.speciesId, challenge: X.challengeId, scenario: this.session.run.scenario.id, launchSeed: X.launchSeed });
  }

  // ---------------------------------------------------------------- title → training
  async startTraining() {
    if (this.busy || this.session) return false;
    this.busy = true;
    try {
      this.entry.challenge = null;                              // (036A) Training never carries a Challenge (the title has none either)
      if (!(await this.entry.leave())) return false;           // the title's black, the title put away
      await this.runScripts; await loadTraining();
      await this._mount(BLOOM.gameSession.trainingRun());       // the training layer lifts the black once the run is drawn
      this._ev("training");
      return true;
    } catch (err) { this._error("training", err); await this._backTo("menu"); return false; }
    finally { this.busy = false; }
  }

  // ---------------------------------------------------------------- a session
  async _mount(run) {
    const t0 = performance.now(), T = run.training ? await loadTraining() : null;
    const s = BLOOM.gameSession.create(run, { host: this.runHost, onAction: id => this._runAction(id) });
    this.session = s; this.runHost.hidden = false;
    const rec = { kind: run.training ? "training" : "expedition", planetId: run.planet.id, planetName: run.planet.name, fingerprint: run.expedition ? run.expedition.fingerprint : null,
      planetIsSelected: !!(this.expedition && run.planet === this.expedition.selected.planet) || !!(run.challengeRun && this.challengeRun && run.planet === this.challengeRun.instance.planet) || null,
      at: t0, readyMs: null, painted: null,
      speciesId: run.species.id, physiologyKey: run.species.physiologyKey, speciesIsSelected: !!(this.expedition && !run.training && run.species === this.expedition.selected.species) || null,
      // (036A) the run's Challenge and scenario (null / the default for an Expedition and Training); (036B) its instance provenance
      challengeId: run.challenge ? run.challenge.id : null, scenarioId: run.scenario ? run.scenario.id : null,
      challengeRun: run.challengeRun || null, startingState: run.startingState || null };
    this.stats.sessions.push(rec);
    if (T) T.mountTraining(s, { fader: { fade: to => this.entry.fadeBlack(to) }, onAction: id => this._trainingAction(id) });
    const r = await s.ready; rec.readyMs = Math.round(performance.now() - t0); rec.painted = r.painted;
    return s;
  }
  _disposeSession() { const s = this.session; this.session = null; this.runHost.hidden = true; if (s) s.dispose(); document.title = TITLE_TEXT; }

  // ---------------------------------------------------------------- run actions (the session already asked before leaving a live run)
  _runAction(id) {
    this.stats.actions.push({ id, at: performance.now() });
    if (!RUN_ACTIONS.has(id) || this.busy) return false;
    this.busy = true;
    const act = id === "playAgain" || id === "restartRun" ? () => this._playAgain() : id === "retryChallenge" ? () => this._retryChallenge()
      : () => this._leaveRun(id === "choosePlanet" ? "survey" : id === "challenges" ? "challenges" : "menu");
    act().catch(err => this._error(id, err)).finally(() => { this.busy = false; });
    return true;
  }
  /** Play Again: a fresh session on the SAME selected planet object (never the seed, never a regeneration), default scenario. */
  async _playAgain() {
    if (this.challengeRun) return this._retryChallenge();       // (036B) a Challenge run's restart is its retry (the same instance)
    const X = this.expedition; if (!X) return this._leaveRun("menu");
    await this.entry.fadeBlack(1);
    this._disposeSession();
    await this._mount(BLOOM.gameSession.expeditionRun(X.selected, { fingerprint: X.fingerprint }));
    await this.entry.fadeBlack(0);
    this._ev("play-again", { fingerprint: X.fingerprint, species: X.selected.species.id, challenge: null });
  }
  /** (036B) RETRY CHALLENGE: a fresh session on the SAME Challenge instance — its planet, Challenge, scenario, species and starting state objects. */
  async _retryChallenge() {
    const C = this.challengeRun; if (!C) return this._leaveRun("menu");
    await this.entry.fadeBlack(1);
    this._disposeSession();
    await this._mount(BLOOM.gameSession.challengeRun(C.instance, { fingerprint: C.fingerprint }));
    await this.entry.fadeBlack(0);
    this._ev("retry-challenge", { fingerprint: C.fingerprint, challenge: C.instance.challengeId, species: C.instance.speciesId, launchSeed: C.instance.launchSeed });
  }
  async _leaveRun(to) {
    await this.entry.fadeBlack(1);
    await this._backTo(to);
  }
  async _backTo(to) {
    this._disposeSession();
    if (to === "menu" || to === "challenges") { this.expedition = null; this.challengeRun = null; }
    await this.entry.resume({ to });
    this._ev(to === "survey" ? "choose-planet" : to === "species" ? "choose-species" : to === "challenges" ? "challenges" : "main-menu", { species: this.entry.species.id, challenge: this.entry.challenge ? this.entry.challenge.id : null });
  }
  /** Training's actions — called by its layer at full black (it already confirmed a skip and recorded the status). */
  _trainingAction(id) {
    this.stats.actions.push({ id, at: performance.now(), training: true });
    const go = id === "restartTraining" ? async () => { this._disposeSession(); await this._mount(BLOOM.gameSession.trainingRun()); }
      : () => this._backTo(id === "beginExpedition" ? (this.speciesFlow ? "species" : "survey") : "menu"); // (035B) the species flow chooses a species first
    this.busy = true;
    go().catch(err => this._error(id, err)).finally(() => { this.busy = false; });
  }

  // ---------------------------------------------------------------- QA
  _ev(type, data) { if (this.onEvent) this.onEvent(type, data); }
  _error(where, err) { console.error(`Strange Bloom: ${where} failed`, err); this._ev("error", { where, error: String(err && err.message || err) }); }

  dispose() { if (this.disposed) return; this.disposed = true; this._disposeSession(); this.entry.dispose(); this.runHost.remove(); }
}

/** Mount the app in `app` with the page's development / QA query parameters. Returns the controller; window.MENU_DEV / BLOOM_APP for QA. */
export function mountApp({ app, runScripts = Promise.resolve() } = {}) {
  const q = new URLSearchParams(location.search);
  const DEV = window.MENU_DEV = { ready: false, errors: [], events: [], hooks: [], departures: [], results: [], entry: null, page: null, app: null };
  addEventListener("error", e => DEV.errors.push(String(e.message || e)));
  addEventListener("unhandledrejection", e => DEV.errors.push(String(e.reason && e.reason.message || e.reason)));
  const ev = (type, data) => DEV.events.push({ type, at: Math.round(performance.now()), ...(data || {}) });
  const rm = q.get("rm") === "1" ? true : q.get("rm") === "0" ? false : undefined;
  const begin = q.get("begin") === "1";
  // ?begin=1 enters the survey at once; it is dropped from the address so a reload lands on the title
  if (begin) { const u = new URL(location.href); u.searchParams.delete("begin"); history.replaceState(null, "", u.href); }
  document.title = TITLE_TEXT;
  // (035C2) Species Selection is the normal Expedition flow for every visit; ?species=1 is ignored (no second behaviour path)
  const controller = new AppController(app, { runScripts, speciesFlow: true,
    entry: { reducedMotion: rm, background: q.has("bg") ? +q.get("bg") - 1 : null, sectorSeed: q.has("sector") ? +q.get("sector") : null, firstBloom: q.get("firstBloom") === "1",
      workers: q.has("workers") ? +q.get("workers") : null, worker: q.get("worker") !== "0", seed: q.has("seed") ? +q.get("seed") : null,
      launchSeed: q.has("launch") ? +q.get("launch") : null },
    dev: { hold: +(q.get("hold") || 0), fail: q.get("fail") === "1" },
    onEvent: (type, data) => { ev(type, data); if (type === "error") DEV.errors.push(`${data.where}: ${data.error}`); } });
  DEV.app = window.BLOOM_APP = controller; DEV.entry = controller.entry; DEV.departures = controller.stats.departures;
  DEV.page = { href: location.href, document: location.pathname };
  app.addEventListener("bloom:begin-expedition", e => { DEV.hooks.push({ key: e.detail.candidate.key, at: performance.now(), detail: e.detail });
    e.detail.descent.then(r => { DEV.results.push({ ok: true, transition: r.transition }); ev("departed"); }, err => DEV.results.push({ error: err.message })); });
  controller.entry.menu.shown.then(() => { DEV.ready = true; ev("menu-shown", { background: controller.entry.menu.background.index + 1 });
    if (begin) { ev("auto-begin"); controller.entry.beginExpedition().catch(err => DEV.errors.push("begin: " + (err && err.message || err))); } },
    err => DEV.errors.push("menu: " + (err && err.message || err)));
  return controller;
}
