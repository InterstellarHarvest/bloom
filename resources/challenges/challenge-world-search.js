// BLOOM — Challenge world search (BLOOM-036B): the browser side of ./challenge-world.js — ONE qualifying planet for a Challenge instance,
// found in parallel and selected deterministically. docs/CHALLENGES_SYSTEM_v1.md §4.3.
//
//   import { ChallengeWorldSearch } from "<repo>/resources/challenges/challenge-world-search.js";
//   const s = new ChallengeWorldSearch({ challenge, launchSeed });   // BEGIN CHALLENGE: the launch; the stream's physical worlds start now
//   const instance = await s.select(species, { onProgress });         // after the species: the FIRST qualifying draw in stream order
//   s.warm(species)                                                  // (Choose Plant Species) prepare the focused species' world early
//   s.cancel() · s.dispose()
//
// WORKERS. A small pool of the survey's own module workers (resources/destination-survey/survey-worker.js — the same production code; over
// file:// the portable runtime's blob worker, SectorPool.workerFactory). It is this search's own pool, not the title's survey pool, so a
// finished or cancelled selection can terminate a worker still busy with a speculative draw at once (a layer-P proof can take seconds).
//
// PREFETCH. The stream is species-free, so the moment the launch exists (BEGIN CHALLENGE, while the player is still choosing a plant) the
// workers validate the stream's first physical worlds ("challenge-physical"). The page keeps each as its canonical physical candidate (ONE
// planet object per world), and a draw's task carries it, so a species chosen later pays only its own evaluation and the scenario proof.
// Changing species (Back to Choose Plant Species) keeps the launch, its stream and these worlds: the same species again → the same planet.
//
// SELECTION. `window` draws run at once (speculatively, in stream order); each finished draw is recorded, and acceptInOrder() accepts the
// first draw that passed once every earlier one is known — so timing never decides which planet a launch gets. On acceptance the
// remaining tasks are dropped and their workers terminated (respawned for the next select). Nothing rejected leaves this object: the
// consumer receives only the accepted instance (or an exhausted / cancelled outcome) and plain progress counts.
// Fallback: without workers the draws run on the main thread (evaluateDraw, yielding between draws) — the same rule, slower.
import { SectorPool } from "../destination-survey/sector-pool.js";
import { physicalKey, speciesFor } from "../destination-survey/survey-data.js";
import { streamSeed, drawAt, evaluateDraw, acceptInOrder, makeInstance, MAX_DRAWS } from "./challenge-world.js";

const now = () => performance.now();
const WORKER_URL = new URL("../destination-survey/survey-worker.js", import.meta.url);

export class ChallengeWorldSearch {
  /**
   * challenge   the resolved Challenge (BLOOM.challenges.resolve / fixture)
   * launchSeed  the instance's launch seed (challenge-world newLaunchSeed(); QA passes a fixed one)
   * workers     pool size (default: hardware threads − 2, clamped 1 … 8) · worker false: main thread only
   * prefetch    how many of the stream's physical worlds to validate before a species is chosen (default: the pool size)
   */
  constructor({ challenge, launchSeed, workers = null, worker = true, prefetch = null, maxDraws = MAX_DRAWS } = {}) {
    const B = window.BLOOM;
    if (!challenge || B.challenges.resolve(challenge.id) !== challenge) throw new TypeError("ChallengeWorldSearch: a canonical resolved Challenge is required");
    this.challenge = challenge; this.launchSeed = launchSeed; this.stream = streamSeed(launchSeed, challenge); this.recipe = challenge.launch.world.recipe;
    this.startingState = B.challenges.startingStateOf(challenge); this.maxDraws = maxDraws;
    this.useWorker = worker !== false;
    this.poolSize = Math.max(1, Math.min(8, workers || ((navigator.hardwareConcurrency || 3) - 2)));
    this.physical = new Map();            // physicalKey → the canonical physical candidate (or null: no world for that seed); this launch only
    this._prefetching = new Map();        // physicalKey → the prefetch task still validating it
    this._pool = []; this._queue = []; this._reqId = 0; this.broken = false; this.disposed = false;
    this.selection = null;                // the running selection: { species, cancelled, … } (one at a time)
    this.jobs = new Map();                // species id → its selection job (running or finished) in this launch
    this.stats = { prefetched: 0, prefetchMs: null, selects: [], warms: 0, workerTasks: 0, terminated: 0, source: null };
    const n = prefetch == null ? this.poolSize : prefetch;
    if (n > 0 && this.useWorker) this._prefetch(n);
  }

  /** The draw at stream index i (pure). */
  drawAt(i) { return drawAt(this.stream, i, this.recipe); }

  /**
   * Select the instance's planet for `species` (an id or a resolved species; a prescribed Challenge takes only its own). Resolves with
   * { ok: true, instance } · { ok: false, exhausted: true } · { ok: false, cancelled: true }. onProgress({ phase, examined, checking }):
   * phase "search" (physical worlds) · "check" (a world passed the recipe and the species: its Challenge proof is running) · "prepare".
   * A selection already running or finished for this species in this launch (warm(), or an earlier select) is joined, not restarted:
   * the rule is deterministic, so it is the same planet either way. Any other species' running selection is cancelled first.
   */
  select(species, { onProgress = null } = {}) {
    if (this.disposed) return Promise.reject(new Error("ChallengeWorldSearch: disposed"));
    const job = this._job(species);
    if (!job.selected && job.rec) job.rec.joinedAt = Math.round(now() - job.rec.at);   // a warm selection the player then chose: how far along it was
    job.selected = true;
    if (onProgress) { job.listeners.add(onProgress); onProgress(job.last); }
    return job.promise;
  }

  /**
   * Start preparing the world for `species` before it is chosen (the focused card on Choose Plant Species): the same selection select()
   * would run, started early. Choosing that species joins it; focusing another cancels it (one selection at a time, so the chosen
   * species never waits behind another's proofs). Nothing is shown and nothing is kept but the outcome for this launch.
   */
  warm(species) {
    if (this.disposed || !this.useWorker || this.broken) return false;
    const sp = speciesFor(species), pres = window.BLOOM.challenges.speciesOf(this.challenge);
    if (pres && pres !== sp) return false;
    const had = this.jobs.has(sp.id); this._job(sp); this.stats.warms++; return !had;
  }

  /** the selection job for a species: the existing one (running or finished), else a new one — cancelling another species' running job */
  _job(species) {
    const B = window.BLOOM, sp = speciesFor(species), pres = B.challenges.speciesOf(this.challenge);
    if (pres && pres !== sp) throw new Error(`ChallengeWorldSearch: ${this.challenge.name} prescribes ${pres.name}`);
    const have = this.jobs.get(sp.id); if (have) return have;
    if (this.selection) this.cancel();
    const job = { species: sp, listeners: new Set(), last: { phase: "search", examined: 0, checking: 0 }, selected: false, promise: null };
    this.jobs.set(sp.id, job);
    job.promise = this._run(sp, job).then(out => { if (out.cancelled && this.jobs.get(sp.id) === job) this.jobs.delete(sp.id); return out; },
      err => { if (this.jobs.get(sp.id) === job) this.jobs.delete(sp.id); throw err; });
    return job;
  }

  async _run(sp, job) {
    const sel = job.sel = this.selection = { species: sp, cancelled: false, t0: now(), results: [], next: 0, frontier: 0, inflight: 0, examined: 0, checking: 0, phase: "search", group: Symbol("select") };
    const rec = job.rec = { species: sp.id, launchSeed: this.launchSeed, at: sel.t0, ms: null, draws: null, accepted: null, stages: {}, source: null, physicalHits: 0, warmed: !job.selected, joinedAt: null };
    this.stats.selects.push(rec);
    const progress = () => { if (this.selection !== sel || sel.cancelled) return; job.last = { phase: sel.phase, examined: sel.examined, checking: sel.checking }; for (const f of job.listeners) f(job.last); };
    progress();
    let out;
    try {
      out = this.useWorker && !this.broken ? await this._selectParallel(sel, rec, progress) : null;
      if (out === null && !sel.cancelled) { rec.source = "main-thread"; out = await this._selectMainThread(sel, rec, progress); } else if (out) rec.source = "worker";
    } finally { if (this.selection === sel) this.selection = null; }
    if (sel.cancelled) return { ok: false, cancelled: true };
    rec.ms = Math.round(now() - sel.t0); rec.draws = out.draws;
    if (!out.ok) return { ok: false, exhausted: true, draws: out.draws };
    job.last = { phase: "prepare", examined: sel.examined, checking: 0 }; for (const f of job.listeners) f(job.last);
    const r = out.result, canon = this._canonical(r.physical);
    const instance = makeInstance({ challenge: this.challenge, species: sp, launchSeed: this.launchSeed, result: { ...r, physical: canon }, draws: out.draws, stream: this.stream,
      stages: rec.stages, ms: rec.ms });
    rec.accepted = { draw: r.draw, archetypeId: r.archetypeId, seed: r.seed, fingerprint: instance.fingerprint };
    return { ok: true, instance };
  }

  /** Stop the running selection: queued draws dropped, busy workers terminated. The launch (stream, held worlds, finished outcomes) stays. */
  cancel() {
    const sel = this.selection; if (!sel) return false;
    sel.cancelled = true; this.selection = null;
    for (const [k, j] of this.jobs) if (j.sel === sel) { this.jobs.delete(k); if (j.rec) { j.rec.cancelled = true; j.rec.ms = Math.round(now() - j.rec.at); } }
    this._dropGroup(sel.group);
    if (sel.wake) sel.wake();
    return true;
  }

  dispose() {
    if (this.disposed) return; this.disposed = true;
    this.cancel(); this.jobs.clear();
    for (const s of this._pool) s.w.terminate();
    for (const t of this._queue) t.reject(Object.assign(new Error("disposed"), { dropped: true }));
    this._pool = []; this._queue = []; this.physical.clear();
  }

  // ---------------------------------------------------------------- selection
  async _selectParallel(sel, rec, progress) {
    const spm = { id: sel.species.id, physiologyKey: sel.species.physiologyKey }, width = this.poolSize;
    let failure = null;
    const wake = () => { if (sel.wake) { const w = sel.wake; sel.wake = null; w(); } };
    const record = r => { sel.results[r.draw] = r; sel.examined++; rec.stages[r.stage] = (rec.stages[r.stage] || 0) + 1; };
    const dispatch = pick => {
      const held = this.physical.get(physicalKey(pick));
      if (held === null) { sel.inflight--; record({ draw: pick.draw, archetypeId: pick.archetypeId, seed: pick.seed, stage: "physical", ok: false }); wake(); return; } // no world for that seed
      if (held) rec.physicalHits++;
      this._task({ type: "challenge-draw", pick, species: spm, scenario: this.challenge.scenario, recipe: this.recipe, startingState: this.startingState,
        physical: held || null, group: sel.group, onProgress: m => { if (m.stage === "scenario") { sel.checking++; if (!sel.cancelled) { sel.phase = "check"; progress(); } } } })
        .then(r => {
          sel.inflight--; if (sel.cancelled) return;
          if (r.physical) r.physical = this._canonical(r.physical); else if (r.stage === "physical") this.physical.set(physicalKey(pick), null);
          if (r.stage === "scenario" || r.stage === "ok") sel.checking = Math.max(0, sel.checking - 1);
          record(r); wake();
        }, err => { sel.inflight--; if (sel.cancelled || err.dropped) return; failure = failure || err; wake(); });
    };
    const launch = () => {
      while (!sel.cancelled && !failure && sel.inflight < width && sel.next < this.maxDraws) {
        const pick = this.drawAt(sel.next++), pend = this._prefetching.get(physicalKey(pick));
        sel.inflight++;
        // a world the launch's prefetch is validating right now: wait for it rather than validating it twice
        if (pend) pend.then(() => { if (!sel.cancelled) dispatch(pick); else sel.inflight--; }); else dispatch(pick);
      }
    };
    for (;;) {
      if (sel.cancelled) return { ok: false, cancelled: true };
      const a = acceptInOrder(sel.results, sel.frontier);
      if (a.done) { this._dropGroup(sel.group); return { ok: true, result: sel.results[a.index], draws: a.index + 1 }; }
      sel.frontier = a.frontier;
      if (failure) { this._dropGroup(sel.group); if (this.broken) return null; throw failure; }
      if (sel.frontier >= this.maxDraws) return { ok: false, draws: this.maxDraws };
      if (sel.checking === 0 && sel.phase === "check") sel.phase = "search";
      progress();
      launch();
      if (failure || this.broken) continue;
      if (sel.inflight === 0) continue;       // every launched draw is already recorded
      await new Promise(res => { sel.wake = res; });
    }
  }

  async _selectMainThread(sel, rec, progress) {
    const B = window.BLOOM;
    for (let i = 0; i < this.maxDraws; i++) {
      if (sel.cancelled) return { ok: false, cancelled: true };
      const pick = this.drawAt(i), held = this.physical.get(physicalKey(pick));
      const r = held === null ? { draw: i, stage: "physical", ok: false }
        : evaluateDraw(pick, { species: sel.species, scenarioId: this.challenge.scenario, recipe: this.recipe, startingState: this.startingState, physical: held || null }, { BLOOM: B, BLOOM_DATA: window.BLOOM_DATA });
      if (r.physical) r.physical = this._canonical(r.physical);
      sel.examined++; rec.stages[r.stage] = (rec.stages[r.stage] || 0) + 1; sel.phase = r.evaluation ? "check" : "search"; progress();
      if (r.ok) return { ok: true, result: r, draws: i + 1 };
      await new Promise(res => setTimeout(res, 0));
    }
    return { ok: false, draws: this.maxDraws };
  }

  /** the page's canonical physical candidate for a world: the FIRST object received for its key stays the one every species uses */
  _canonical(phys) {
    const k = phys.physicalKey, have = this.physical.get(k);
    if (have) return have;
    this.physical.set(k, phys); return phys;
  }

  // ---------------------------------------------------------------- prefetch (species-free physical worlds of the stream)
  _prefetch(n) {
    const t0 = now(); let left = n;
    for (let i = 0; i < n; i++) {
      const pick = this.drawAt(i), k = physicalKey(pick);
      if (this._prefetching.has(k) || this.physical.has(k)) { left--; continue; }
      const p = this._task({ type: "challenge-physical", archetypeId: pick.archetypeId, seed: pick.seed, group: "prefetch" }).then(phys => {
        if (this.disposed) return;
        if (phys) this._canonical(phys); else if (!this.physical.has(k)) this.physical.set(k, null);
        this.stats.prefetched++; if (--left === 0) this.stats.prefetchMs = Math.round(now() - t0);
      }, () => {}).then(() => { this._prefetching.delete(k); });
      this._prefetching.set(k, p);
    }
  }

  // ---------------------------------------------------------------- the worker pool (survey-worker.js; portable: SectorPool.workerFactory)
  _task(task) {
    if (this.disposed) return Promise.reject(Object.assign(new Error("disposed"), { dropped: true }));
    if (this.broken) return Promise.reject(new Error("no worker"));
    // a draw task for the running selection goes ahead of the prefetch (which only saves time later)
    return new Promise((resolve, reject) => {
      const t = { ...task, id: ++this._reqId, resolve, reject };
      if (task.group !== "prefetch") { const i = this._queue.findIndex(q => q.group === "prefetch"); if (i >= 0) this._queue.splice(i, 0, t); else this._queue.push(t); } else this._queue.push(t);
      this.stats.workerTasks++; this._pump(); });
  }
  _pump() {
    while (this._queue.length && !this.broken) {
      let slot = this._pool.find(s => !s.task);
      if (!slot && this._pool.length < this.poolSize) slot = this._spawn();
      if (!slot) return;
      const t = slot.task = this._queue.shift();
      const { resolve, reject, group, onProgress, ...msg } = t;   // (a held world travels with its draw — a structured clone: never re-validated there)
      slot.w.postMessage(msg);
    }
  }
  _spawn() {
    let w;
    try { w = SectorPool.workerFactory ? SectorPool.workerFactory() : new Worker(WORKER_URL, { type: "module" }); }
    catch { this._broken(new Error("worker failed")); return null; }
    const slot = { w, task: null };
    w.onmessage = e => { const t = slot.task, m = e.data; if (!t || m.id !== t.id) return;
      if (m.progress) { if (t.onProgress) t.onProgress(m.progress); return; }
      slot.task = null; m.error ? t.reject(new Error(m.error)) : t.resolve(m.result); this._pump(); };
    w.onerror = e => { if (e.preventDefault) e.preventDefault(); this._broken(new Error("worker failed")); };
    this._pool.push(slot);
    return slot;
  }
  /** drop a group's queued tasks and terminate the workers still running one of them (respawned on demand) */
  _dropGroup(group) {
    const drop = Object.assign(new Error("dropped"), { dropped: true });
    this._queue = this._queue.filter(t => t.group !== group || (t.reject(drop), false));
    for (const s of [...this._pool]) if (s.task && s.task.group === group) {
      s.w.terminate(); this.stats.terminated++; const t = s.task; s.task = null; t.reject(drop);
      this._pool.splice(this._pool.indexOf(s), 1);
    }
    this._pump();
  }
  _broken(err) {
    this.broken = true;
    for (const s of this._pool) { s.w.terminate(); if (s.task) s.task.reject(err); }
    for (const t of this._queue) t.reject(err);
    this._pool = []; this._queue = [];
    const sel = this.selection; if (sel && sel.wake) { const w = sel.wake; sel.wake = null; w(); }
  }
}
