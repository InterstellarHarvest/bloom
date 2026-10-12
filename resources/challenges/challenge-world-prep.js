// BLOOM — Challenge world PREPARATION (BLOOM-036B1): the browser side of the seed banks (./challenge-bank.js). docs/CHALLENGES_SYSTEM_v1.md §4.3.
//
//   import { ChallengeWorldPrep } from "<repo>/resources/challenges/challenge-world-prep.js";
//   const p = new ChallengeWorldPrep({ challenge, launchSeed, avoid });   // BEGIN CHALLENGE: the launch (one low-priority worker is started)
//   p.prepare(species)                                                     // Choose Plant Species: the selected plant's ONE world, built early
//   const out = await p.select(species, { onProgress });                   // Continue with <plant>: { ok, instance } (joins the prepared build)
//   p.cancel() · p.dispose()
//
// No validation runs here: every bank world was proven offline (tools/build-challenge-seed-bank.mjs). For a species the launch picks ONE bank
// entry (challenge-bank.js pickEntry: launch seed × Challenge × species, avoiding this session's recent entries — deterministic, never
// Math.random, never worker timing), rebuilds that exact planet (the accepted attempt — milliseconds) in ONE worker (the survey worker's
// "challenge-bank-world" task; over file:// the portable blob worker; main-thread fallback), and the page verifies its fingerprint again
// before the dossier. Phases reported to the screen are only these real ones: "select" (Selecting a proven world) · "build" (Building the
// planet) · "verify" (Verifying the planet). A stale bank or a fingerprint mismatch is an invariant failure (an error outcome), never a search
// for another world. Species changes cancel the other species' build (its worker is terminated); a species already built is instant.
import { SectorPool } from "../destination-survey/sector-pool.js";
import { speciesFor, planetFingerprint } from "../destination-survey/survey-data.js";
import { bankCell, cellKey, pickEntry, bankWorld, makeBankInstance } from "./challenge-bank.js";

const now = () => performance.now();
const WORKER_URL = new URL("../destination-survey/survey-worker.js", import.meta.url);

export class ChallengeWorldPrep {
  /**
   * challenge   the resolved Challenge (canonical)
   * launchSeed  the launch's seed (challenge-world newLaunchSeed(); QA passes a fixed one)
   * avoid       (cellKey) → the entry indices this session already played for that cell (in-memory; captured per species at its first pick)
   * worker      false: build on the main thread (QA / fallback)
   */
  constructor({ challenge, launchSeed, avoid = null, worker = true } = {}) {
    const B = window.BLOOM;
    if (!challenge || B.challenges.resolve(challenge.id) !== challenge) throw new TypeError("ChallengeWorldPrep: a canonical resolved Challenge is required");
    this.challenge = challenge; this.launchSeed = launchSeed; this.avoid = typeof avoid === "function" ? avoid : () => [];
    this.startingState = B.challenges.startingStateOf(challenge); this.useWorker = worker !== false;
    this.jobs = new Map();                // species id → { species, pick, cell, promise, listeners, last, state }
    this.current = null;                  // the job whose build is running
    this.disposed = false; this.broken = false; this.worker = null; this.task = null; this._reqId = 0;
    this.stats = { t0: now(), picks: [], builds: [], workerStarted: null, cancels: 0, source: null };
    if (this.useWorker) this._spawn();    // started at once (idle until a plant is selected): its start-up is hidden behind Choose Plant Species
  }

  /** The entry this launch takes for `species` (deterministic; the same species again in this launch = the same entry). */
  pickFor(species) { const sp = speciesFor(species); return this._job(sp, false).pick; }

  /** Choose Plant Species: build the selected plant's world now (low priority: one worker; another species' build is cancelled). */
  prepare(species) {
    if (this.disposed) return false;
    const sp = speciesFor(species), pres = window.BLOOM.challenges.speciesOf(this.challenge);
    if (pres && pres !== sp) return false;
    this._job(sp, true); return true;
  }

  /** Continue with <plant>: the instance (joining a prepared build). → { ok, instance } | { ok: false, cancelled } | { ok: false, error, code } */
  select(species, { onProgress = null } = {}) {
    if (this.disposed) return Promise.resolve({ ok: false, cancelled: true });
    const sp = speciesFor(species), job = this._job(sp, true);
    job.selected = job.selected || now();
    if (onProgress) { job.listeners.add(onProgress); onProgress(job.last); }
    return job.promise;
  }

  /** Stop the running build (its worker is terminated and respawned idle). Finished worlds stay. */
  cancel() {
    const job = this.current; if (!job || job.state !== "build") return false;
    this.current = null; job.state = "cancelled"; this.jobs.delete(job.species.id); this.stats.cancels++;
    if (this.task) { const t = this.task; this.task = null; t.reject(Object.assign(new Error("cancelled"), { cancelled: true })); }
    if (this.worker) { this.worker.terminate(); this.worker = null; if (!this.disposed) this._spawn(); }
    return true;
  }

  dispose() {
    if (this.disposed) return; this.disposed = true;
    this.cancel(); this.jobs.clear();
    if (this.worker) { this.worker.terminate(); this.worker = null; }
  }

  // ---------------------------------------------------------------- jobs
  _job(sp, start) {
    const B = window.BLOOM, pres = B.challenges.speciesOf(this.challenge);
    if (pres && pres !== sp) throw new Error(`ChallengeWorldPrep: ${this.challenge.name} prescribes ${pres.name}`);
    let job = this.jobs.get(sp.id);
    if (!job) {
      job = { species: sp, listeners: new Set(), last: { phase: "select" }, state: "picked", pick: null, cell: null, error: null, promise: null, selected: null };
      try { job.cell = bankCell(this.challenge, sp); job.pick = pickEntry(job.cell, { challenge: this.challenge, species: sp, launchSeed: this.launchSeed, avoid: this.avoid(cellKey(this.challenge.id, sp.id)) }); }
      catch (err) { job.error = err; }
      this.stats.picks.push({ species: sp.id, index: job.pick ? job.pick.index : null, base: job.pick ? job.pick.base : null, error: job.error ? job.error.code || "error" : null, at: Math.round(now() - this.stats.t0) });
      this.jobs.set(sp.id, job);
    }
    if (start && !job.promise) {
      if (this.current && this.current !== job) this.cancel();            // one build at a time: the selected plant only
      job.promise = this._build(job);
    }
    return job;
  }

  async _build(job) {
    const phase = p => { job.last = { phase: p }; for (const f of job.listeners) f(job.last); };
    if (job.error) return { ok: false, error: String(job.error.message || job.error), code: job.error.code || "BANK" };
    this.current = job; job.state = "build"; phase("build");
    const rec = { species: job.species.id, index: job.pick.index, startedAt: Math.round(now() - this.stats.t0), queueMs: null, buildMs: null, verifyMs: null, source: null, joined: null };
    this.stats.builds.push(rec);
    let world;
    try {
      const t = now();
      if (this.useWorker && !this.broken && this.worker) { world = await this._viaWorker(job, rec); rec.source = "worker"; }
      else { world = bankWorld(job.pick.entry, job.cell, job.species, this.startingState); rec.source = "main-thread"; }
      rec.buildMs = Math.round(now() - t);
    } catch (err) {
      if (err && err.cancelled) return { ok: false, cancelled: true };
      if (err && err.noWorker) { world = bankWorld(job.pick.entry, job.cell, job.species, this.startingState); rec.source = "main-thread"; }
      else { if (this.current === job) this.current = null; job.state = "error"; return { ok: false, error: String(err && err.message || err), code: (err && err.code) || "BUILD" }; }
    }
    if (job.state === "cancelled") return { ok: false, cancelled: true };
    // the page verifies the planet it received: the same fingerprint the bank proved
    phase("verify"); const tv = now(), fp = planetFingerprint(world.physical.planet); rec.verifyMs = Math.round(now() - tv);
    if (this.current === job) this.current = null;
    if (fp !== job.pick.entry.fingerprint) { job.state = "error"; return { ok: false, error: `fingerprint ${fp} ≠ the bank's ${job.pick.entry.fingerprint}`, code: "FINGERPRINT_MISMATCH" }; }
    world.physical.fingerprint = fp;
    const instance = makeBankInstance({ challenge: this.challenge, species: job.species, launchSeed: this.launchSeed, cell: job.cell, pick: job.pick, world });
    job.state = "ready"; rec.readyAt = Math.round(now() - this.stats.t0); rec.joined = job.selected ? Math.round(job.selected - this.stats.t0) : null;
    phase("ready");
    return { ok: true, instance };
  }

  // ---------------------------------------------------------------- the one worker
  _spawn() {
    let w; const t = now();
    try { w = SectorPool.workerFactory ? SectorPool.workerFactory() : new Worker(WORKER_URL, { type: "module" }); }
    catch { this.broken = true; return null; }
    w.onmessage = e => { const T = this.task, m = e.data; if (!T || m.id !== T.id || m.progress) return; this.task = null; m.error ? T.reject(Object.assign(new Error(m.error), { code: /FINGERPRINT|STALE/.test(m.error) ? "FINGERPRINT_MISMATCH" : "BUILD" })) : T.resolve(m.result); };
    w.onerror = e => { if (e.preventDefault) e.preventDefault(); this.broken = true; const T = this.task; this.task = null; if (T) T.reject(Object.assign(new Error("worker failed"), { noWorker: true })); };
    this.worker = w; if (this.stats.workerStarted == null) this.stats.workerStarted = Math.round(now() - t);
    return w;
  }
  _viaWorker(job, rec) {
    return new Promise((resolve, reject) => {
      const id = ++this._reqId, enq = now();
      this.task = { id, resolve: r => { rec.queueMs = 0; resolve(r); }, reject };
      this.worker.postMessage({ id, type: "challenge-bank-world", entry: job.pick.entry, cell: { provenance: { validator: job.cell.provenance.validator } },
        species: { id: job.species.id, physiologyKey: job.species.physiologyKey }, startingState: this.startingState || null });
      rec.postedAt = Math.round(enq - this.stats.t0);
    });
  }
}
export { newLaunchSeed } from "./challenge-world.js";
