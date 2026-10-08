// BLOOM — Destination Survey sector pool (BLOOM-028C). The validated-sector machinery that DestinationSurvey used to hold
// privately (028A1 worker pool, 028B parallel per-world validation), lifted out unchanged so a sector can be prepared BEFORE
// the survey screen exists — on the Main Menu, while the title is showing — and handed to the survey when the player arrives.
//
//   import { SectorPool } from "<repo>/resources/destination-survey/sector-pool.js";
//   const pool = new SectorPool().prefetch();                 // the first sector starts validating now (random seed)
//   pool.progress                                             // { seed, confirmed, total, ready, ms }
//   new DestinationSurvey(root, { sectors: pool });           // adopts the sector (ownership passes to the survey)
//   pool.dispose();                                           // if no survey ever took it (leaving the page)
//
// No DOM, no Three.js, no WebGL: a pool is workers + a cache of sector entries. The worker, survey-data and the validation
// path are the accepted ones (nothing duplicated): every world is the exact object the worker validated, and that object is
// what the survey later draws, describes and hands on as detail.planet. Entries carry the 028B progressive-fill state
// (`shown` per column, `cols`, `listener`) so a survey that adopts a half-built sector shows what is already confirmed at
// once and fills in the rest as it arrives — the accepted behaviour, from a different starting point.
//
// One consumer at a time (the survey sets `onProgress` and the entries' `listener`); a survey that adopts a pool owns it from
// then on and disposes it with itself.
import { SURVEY_CLASSES, ROWS, columnCandidates, columnFromValidated, assembleSector } from "./survey-data.js";

const now = () => (globalThis.performance ? performance.now() : Date.now());
const N = ROWS * SURVEY_CLASSES.length;

export class SectorPool {
  /**
   * worker    build sectors in module workers (default true; otherwise, or if workers can't start, the main thread builds them —
   *           a degraded path that stalls ~1 s a world)
   * workers   pool size (default: hardware threads − 2, clamped 1 … 8); each validation is its own task (028B)
   */
  constructor({ worker = true, workers = null } = {}) {
    this.useWorker = worker !== false;
    this.poolSize = Math.max(1, Math.min(8, workers || ((typeof navigator !== "undefined" && navigator.hardwareConcurrency) || 3) - 2));
    this.entries = new Map(); this._pool = []; this._queue = []; this._reqId = 0;
    this.broken = false; this.halted = false; this.disposed = false;
    this.source = null;                                    // "worker" | "main-thread": how the last column was built
    this.stats = { workerTasks: 0, sectorTimes: [] };
    this.onProgress = null;                                // (entry) => void: a world confirmed / a column finished (the survey's header status)
    this.first = null;                                     // what prefetch() started: { seed, firstBloom, entry }
  }

  /**
   * (BLOOM-031) How a pool worker is started: null (the default) = the module worker ./survey-worker.js. The portable runtime
   * (resources/portable/portable-entry.js, file:// only) sets a factory that starts the SAME worker code, bundled into one classic
   * script, from a blob: URL — file:// pages cannot start module workers. A factory that throws falls back like a refused worker.
   */
  static workerFactory = null;

  static key(seed, firstBloom) { return seed + (firstBloom ? ":fb" : ""); }

  /** Start the first sector now (random seed unless given) and remember it, so a survey constructed later adopts it. Returns this. */
  prefetch({ sectorSeed = null, firstBloom = false } = {}) {
    if (this.disposed) throw new Error("SectorPool: disposed");
    const seed = sectorSeed == null ? 1 + Math.floor(Math.random() * 999998) : sectorSeed >>> 0;
    this.first = { seed, firstBloom: !!firstBloom, entry: this.sector(seed, !!firstBloom) };
    return this;
  }

  /** The prefetched sector (prefetch()): resolves with the assembled sector; rejects if the pool was disposed or halted first. */
  get ready() { return this.first ? this.first.entry.promise : Promise.reject(new Error("SectorPool: nothing prefetched")); }

  /** How far the prefetched sector is: confirmed worlds (certain to be in the sector) out of nine. */
  get progress() {
    const f = this.first; if (!f) return null;
    const e = f.entry;
    return { seed: f.seed, firstBloom: f.firstBloom, confirmed: e.found.reduce((a, b) => a + b, 0), total: N, ready: e.ready, ms: e.ready ? e.ms : Math.round(now() - e.t0) };
  }

  get(seed, firstBloom) { return this.entries.get(SectorPool.key(seed, firstBloom)) || null; }

  /** Drop every entry for a seed (the survey calls this once the sector is on screen: the cells hold it now). */
  forget(seed) { for (const k of [...this.entries.keys()]) if (this.entries.get(k).seed === seed) this.entries.delete(k); }

  /**
   * The validated sector for a seed: a cached entry whose `promise` resolves with the assembled sector when all three columns
   * are ready. Each column plans in a worker and validates every pick as its own pool task (028B); if workers can't run, the
   * main thread builds the column instead (stalling ~1 s per world).
   *   entry = { key, seed, firstBloom, found[3], shown[3][], cols[3], listener, ready, t0, ms, promise }
   *   shown[col]: worlds already certain to be in the sector, in the order they became certain; cols[col]: finished columns.
   *   A screen that starts showing this sector late replays them, then follows through entry.listener { cell, column }.
   */
  sector(seed, firstBloom) {
    if (this.disposed) throw new Error("SectorPool: disposed");
    const key = SectorPool.key(seed, firstBloom);
    let e = this.entries.get(key);
    if (!e) {
      e = { key, seed, firstBloom: !!firstBloom, found: [0, 0, 0], shown: [[], [], []], cols: [null, null, null], listener: null, ready: false, t0: now(), ms: null };
      e.promise = Promise.all(SURVEY_CLASSES.map((_, col) => this._column(seed, col, firstBloom, pr => {
        if (pr.cell) { e.shown[col].push(pr.cell); if (e.listener) e.listener.cell(col, pr.cell); }
        e.found[col] = Math.max(pr.found || 0, e.shown[col].length); if (this.onProgress) this.onProgress(e);
      }).then(c => { e.cols[col] = c; if (e.listener) e.listener.column(col, c); return c; })))
        .then(cols => { e.ready = true; e.ms = Math.round(now() - e.t0);
          this.stats.sectorTimes.push({ seed, ms: e.ms, columns: cols.map(c => c.stats) }); return assembleSector(seed, cols); });
      e.promise.catch(() => { if (this.entries.get(key) === e) this.entries.delete(key); });
      this.entries.set(key, e);
    }
    return e;
  }

  /** Departure: stop the workers and drop unfinished sectors (no generation while departing); resume() lets new work start. */
  halt() {
    this.halted = true;
    const err = Object.assign(new Error("departing"), { halted: true });
    for (const s of this._pool) { s.w.terminate(); if (s.task) s.task.reject(err); }
    for (const t of this._queue) t.reject(err);
    this._pool = []; this._queue = [];
  }
  resume() { this.halted = false; }

  /** Terminate the workers, reject pending work, forget every entry. Idempotent. (Planet objects already handed out are untouched.) */
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this._stopPool(new Error("disposed"));
    this.entries.clear(); this.onProgress = null;
  }

  // ---------------------------------------------------------------- columns (028B parallel path; main-thread fallback)
  _column(sectorSeed, column, firstBloom, onProgress) {
    return this._columnParallel(sectorSeed, column, firstBloom, onProgress).then(r => { this.source = "worker"; return r; }, err => {
      if (this.disposed || err.halted) throw err; // (halted for a departure: never fall back to main-thread generation)
      return this._columnOnMainThread(sectorSeed, column, firstBloom, onProgress).then(r => { this.source = "main-thread"; return r; });
    });
  }

  /**
   * One column, its validations in parallel (028B): a worker plans the column's next predicted draws (cheap), every pick is
   * validated as its own pool task, and the results are accepted IN STREAM ORDER with survey-data's columnFromValidated — the
   * sequential column's exact rule, so the sector is identical to the one-worker / Node result (tools/destination-survey-check
   * S11). Picks beyond the stopping point are speculative: queued ones are dropped, running ones finish and are ignored.
   */
  async _columnParallel(sectorSeed, column, firstBloom, onProgress) {
    const t0 = now(), group = Symbol("column"), base = { sectorSeed, column, firstBloom }, want = SURVEY_CLASSES[column].id;
    const picks = [], pending = [], results = [], known = new Map(), emitted = new Set(); let predictions = 0, predictMs = 0, fb = null, need = ROWS;
    // A validated pick of this class is CERTAIN to be in the column once fewer than `need` earlier picks are still undecided or
    // matching (only those could take its place) — then it can be shown at once, even while earlier picks are still validating.
    const emit = () => {
      let ahead = 0;
      for (let j = 0; j < picks.length && ahead < need; j++) {
        const done = known.has(j), cand = known.get(j), match = done && cand && cand.classId === want;
        if (match && !emitted.has(j)) { emitted.add(j); if (onProgress) onProgress({ cell: cand }); }
        if (!done || match) ahead++;
      }
    };
    const add = plan => { predictions += plan.predictions; predictMs += plan.predictMs;
      for (const p of plan.picks) { const j = picks.push(p) - 1, v = this._viaPool({ type: "validate", archetypeId: p.archetypeId, seed: p.seed, group });
        v.then(c => { known.set(j, c); emit(); }, () => {}); pending.push(v); } };
    let plan = await this._viaPool({ type: "plan", ...base, fromDraw: 0, want: ROWS + 1, group }); fb = plan.fb;
    if (fb) { need = ROWS - 1; if (onProgress) onProgress({ cell: fb }); }
    add(plan);
    const finish = r => { this._queue = this._queue.filter(t => t.group !== group || (t.reject(Object.assign(new Error("speculative"), { dropped: true })), false));
      return { ...r.column, stats: { ...r.column.stats, ms: Math.round(now() - t0), predictions, predictMs, speculative: picks.length - r.column.stats.validations } }; };
    for (;;) {
      while (results.length < picks.length) {
        const cand = await pending[results.length];
        results.push({ draw: picks[results.length].draw, cand });
        const r = columnFromValidated(sectorSeed, column, { fb, results });
        if (r.done) return finish(r);
      }
      if (plan.exhausted) return finish(columnFromValidated(sectorSeed, column, { fb, results, exhausted: true }));
      plan = await this._viaPool({ type: "plan", ...base, fromDraw: plan.nextDraw, want: 2, group }); add(plan);
    }
  }

  _viaPool(task, onProgress) {
    if (this.halted) return Promise.reject(Object.assign(new Error("departing"), { halted: true }));
    if (!this.useWorker || this.broken) return Promise.reject(new Error("no worker"));
    while (this._pool.length < this.poolSize && !this.broken) if (!this._spawn()) break; // start the whole pool at once: start-up overlaps planning
    if (this.broken) return Promise.reject(new Error("no worker")); // (028C) a synchronous spawn failure (e.g. module workers refused): fall back now instead of queueing forever
    return new Promise((resolve, reject) => { this._queue.push({ ...task, id: ++this._reqId, resolve, reject, onProgress }); this.stats.workerTasks++; this._pump(); });
  }

  /** Hand queued tasks to idle workers, starting workers up to the pool size. */
  _pump() {
    while (this._queue.length && !this.broken) {
      let slot = this._pool.find(s => !s.task);
      if (!slot && this._pool.length < this.poolSize) slot = this._spawn();
      if (!slot) return;
      const t = slot.task = this._queue.shift();
      const { resolve, reject, onProgress, group, ...msg } = t; // (functions / symbols never cross to the worker)
      slot.w.postMessage(msg);
    }
  }

  _spawn() {
    let w;
    try { w = SectorPool.workerFactory ? SectorPool.workerFactory() : new Worker(new URL("./survey-worker.js", import.meta.url), { type: "module" }); }
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
    this.broken = true;
    for (const s of this._pool) { s.w.terminate(); if (s.task) s.task.reject(err); }
    for (const t of this._queue) t.reject(err);
    this._pool = []; this._queue = [];
  }

  async _columnOnMainThread(sectorSeed, column, firstBloom, onProgress) {
    const it = columnCandidates(sectorSeed, column, undefined, { firstBloom });
    for (;;) { const r = it.next(); if (r.done) return r.value; if (onProgress) onProgress(r.value); await new Promise(res => setTimeout(res, 0)); if (this.disposed) throw new Error("disposed"); }
  }
}
