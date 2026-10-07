// BLOOM — the guided training's director (BLOOM-028D2). docs/GUIDED_TRAINING_v1.md §5.
//
// OUTCOME EVALUATION ONLY. It runs the lesson script (./training-steps.js) against the REAL run and tells the coach
// (./training-coach.js) what to show. It reads the run through the production run UI adapter (window.BLOOM_RUN_UI.adapter: run, hud,
// regions, upgrade(s), colony, previewOf — plain-data reads), the rooms' presentation state (readUi, handed in by the training layer)
// and the ten unchanged bloom:* events (listened to, never dispatched, never altered). It never acts for the player: no purchase,
// selection, growth focus, local upgrade, Biomass, fitness, coverage or threshold is touched here, and BLOOM_API is never used. The
// one effect a lesson may ask for is the scripted bonus bubble, through the hook it is handed (BLOOM_RUN_UI.placeBubble).
//
//   import { TrainingDirector } from "<repo>/resources/training/training-director.js";
//   const d = new TrainingDirector({ steps, adapter, readUi, growThresh, coach, hooks: { placeBubble }, onFinish });
//   d.start();  d.evaluate();  d.finish("completed" | "skipped" | "stopped");
//   d.index (0-based, monotonic) · d.current { id, index, title, body, status, ack } · d.log (one entry per finished lesson) · d.events
//
// ADVANCING. One monotonic in-memory index for this page (nothing persisted; Restart training is a fresh page at step 1). Every
// evaluation builds a fresh ctx from the live run and asks the CURRENT lesson whether its outcome holds; if it does, the lesson is
// logged and the next one is asked at once, so lessons the player already finished off-script (or between two renders) pass through
// in the same evaluation, each acknowledged by its `ack`. Evaluations run on every bloom:* event, on the adapter's change notices
// (throttled), on the player's clicks / keys (room navigation is presentation state with no event), and every `evalMs` as a safety
// net. No lesson is finished by elapsed time: the clock only decides WHEN the state is read, never WHAT it must be.
// The run's own bloom:win ends the script from any lesson (the final lesson's outcome); the coach goes away for the report.

export const EVENT_TYPES = Object.freeze(["run-ready", "play-pause", "speed", "region-select", "upgrade-preview", "upgrade-purchase", "growth-focus", "local-upgrade", "bubble-collect", "win"]);

export class TrainingDirector {
  constructor({ steps, adapter, readUi = () => ({}), growThresh, coach = null, hooks = {}, keepClear = [], doc = (typeof document !== "undefined" ? document : null),
    evalMs = 250, noticeMs = 100, now = () => performance.now(), onFinish = null, onChange = null } = {}) {
    if (!Array.isArray(steps) || !steps.length) throw new TypeError("TrainingDirector: steps required");
    if (!adapter || adapter.api !== 1) throw new TypeError("TrainingDirector: needs the run UI adapter (api 1)");
    if (!(growThresh > 0)) throw new TypeError("TrainingDirector: needs the run's grow.growThresh");
    Object.assign(this, { steps, A: adapter, readUi, growThresh, coach, hooks, keepClear, doc, evalMs, noticeMs, now, onFinish, onChange });
    this.state = "idle"; this.index = 0; this.mem = {}; this.ack = null; this.current = null; this.log = []; this.events = [];
    this.seen = { previews: new Set(), purchases: [], bubbles: [], focus: [], local: [], won: false };
    this.stats = { evaluations: 0, placeBubbleCalls: 0, presented: 0 };
    this._timer = 0; this._unsub = null; this._lastNotice = 0; this._queued = false; this._cause = null; this._enteredAt = null;
    this._onEvent = e => this._event(e.type.slice(6), e.detail || {});
    // after the page's own handlers for this click / key have run (a microtask here would read the state before them)
    this._onInput = () => { if (this._inputT || this.state !== "running") return; this._inputT = setTimeout(() => { this._inputT = 0; this.evaluate("input"); }, 0); };
  }

  start() {
    if (this.state !== "idle") return false;
    this.state = "running"; this._started = true;
    for (const t of EVENT_TYPES) this.doc.addEventListener("bloom:" + t, this._onEvent);
    // room / tab navigation fires no event: re-read after the player's own clicks and keys (capture: before the page reacts is fine,
    // the evaluation is queued to the next microtask after the handlers ran)
    this.doc.addEventListener("click", this._onInput, true); this.doc.addEventListener("keyup", this._onInput, true); this.doc.addEventListener("focusin", this._onInput, true);
    this._unsub = this.A.subscribe(() => { const t = this.now(); if (t - this._lastNotice >= this.noticeMs) { this._lastNotice = t; this._queue("notice"); } });
    this._timer = setInterval(() => this.evaluate("interval"), this.evalMs);
    this._enter(0, "start");
    this.evaluate("start");
    return true;
  }

  /** The script is over: "completed" (the run's own win), "skipped" (the player confirmed a skip) or "stopped". The coach goes away. */
  finish(outcome = "stopped") {
    if (this.state !== "running") return false;
    this.state = outcome; this._teardown();
    this.current = null; if (this.coach) this.coach.hide();
    this._changed(); if (this.onFinish) try { this.onFinish(outcome, this); } catch (err) { console.error("TrainingDirector.onFinish failed", err); }
    return true;
  }
  dispose() { if (this.state === "running") this.finish("stopped"); else { if (this.state === "idle") this.state = "disposed"; this._teardown(); } }

  /** Read the run now; finish every lesson whose outcome holds (in order); show the current one. Safe to call at any time. */
  evaluate(cause = "call") {
    if (this.state !== "running") return;
    this.stats.evaluations++; this._cause = cause;
    let ctx = null;
    for (let guard = 0; guard <= this.steps.length; guard++) {
      const step = this.steps[this.index]; if (!step) break;
      ctx = this._ctx();
      if (step.prepare) step.prepare(ctx, this._hooks());
      const res = step.complete(ctx);
      if (!res) break;
      this._record(step, ctx, res);
      if (this.index === this.steps.length - 1) return this.finish("completed");   // the final lesson: only the run's own win finishes it
      this._enter(this.index + 1, res.ack || null);
    }
    if (!ctx) return;
    this._present(this.steps[this.index], ctx);
  }

  // ---------------------------------------------------------------- internals
  _hooks() { return { placeBubble: id => { this.stats.placeBubbleCalls++; const h = this.hooks.placeBubble; const t = h ? h(id) : -1; this._note("bubble-placed", { region: id, tile: t }); return t; } }; }

  _enter(i, ack) {
    this.index = i; this.mem = {}; this.ack = typeof ack === "string" && ack !== "start" ? ack : null;
    const run = safe(() => this.A.run()) || {};
    this._enteredAt = { at: Math.round(this.now()), tick: run.ticks || 0 };
  }

  _ctx() {
    const A = this.A, run = A.run(), hud = A.hud(), G = this.growThresh, regs = A.regions().map(r => ({ ...r, viable: r.fitness > G }));
    const byId = {}; for (const r of regs) byId[r.id] = r;
    const full = {}, ups = {}, pvs = {};
    const region = id => { const r = byId[id]; if (!r) return null;
      if (!(id in full)) { const d = A.region(id); full[id] = d ? { limitText: d.limiting.text, blocked: d.limiting.blocked } : {}; }
      return { ...r, ...full[id] }; };
    const upgrade = id => (id in ups ? ups[id] : (ups[id] = A.upgrade(id)));
    const ui = { room: null, context: null, tab: null, selection: null, transitioning: false, ...(safe(() => this.readUi()) || {}) };
    if (!ui.selection) { const s = A.selection(); ui.selection = s && s.id ? s.id : null; }
    return {
      run: { ticks: run.ticks, running: run.running, speed: run.speed, won: run.won },
      hud: { biomass: hud.biomass, coverage: hud.coverage, winAt: hud.winAt, winPct: hud.winPct },
      growThresh: G, region, regions: () => regs.map(r => region(r.id)), upgrade, owned: id => { const u = upgrade(id); return u ? u.tier : 0; },
      spreadOwned: () => { const b = A.upgrades().find(x => x.board === "Spread"); return b ? b.items.filter(u => u.owned) : []; },
      colony: id => A.colony(id), previewOf: id => (id in pvs ? pvs[id] : (pvs[id] = A.previewOf(id))),
      ui, seen: this.seen, mem: this.mem,
    };
  }

  _record(step, ctx, res) {
    const regs = ctx.regions();
    this.log.push({ index: this.index + 1, id: step.id, how: res.how || "state", cause: this._cause, ack: res.ack || null,
      tick: ctx.run.ticks, at: Math.round(this.now()), enteredTick: this._enteredAt ? this._enteredAt.tick : null,
      biomass: ctx.hud.biomass, coverage: +ctx.hud.coverage.toFixed(4),
      fitness: Object.fromEntries(regs.map(r => [r.id, +r.fitness.toFixed(3)])), viable: regs.filter(r => r.viable).map(r => r.id),
      owned: this._owned(), focus: Object.fromEntries(regs.filter(r => r.focus !== "balanced").map(r => [r.id, r.focus])),
      local: Object.fromEntries(regs.filter(r => r.localUpgrade).map(r => [r.id, r.localUpgrade])), ui: { ...ctx.ui } });
  }
  _owned() { const out = {}; for (const b of this.A.upgrades()) for (const u of b.items) if (u.owned) out[u.id] = u.tier; return out; }

  _present(step, ctx) {
    const v = x => typeof x === "function" ? x(ctx) : x;
    const cur = { id: step.id, index: this.index + 1, total: this.steps.length, title: v(step.title), body: v(step.body), status: step.status ? step.status(ctx) || null : null,
      ack: this.ack, targets: v(step.targets) || [], keepClear: [...this.keepClear, ...(v(step.keepClear) || [])] };
    const changed = !this.current || ["id", "title", "body", "status", "ack"].some(k => this.current[k] !== cur[k]) || JSON.stringify(this.current.targets) !== JSON.stringify(cur.targets);
    this.current = cur;
    if (changed) { this.stats.presented++; if (this.coach) this.coach.show(cur); this._changed(); }
  }

  _event(type, d) {
    if (this.state !== "running") return;
    const S = this.seen, tick = safe(() => this.A.run().ticks);
    if (type === "upgrade-preview" && d.id) S.previews.add(d.id);
    else if (type === "upgrade-purchase") S.purchases.push({ id: d.id, board: d.board, tier: d.tier, tick });
    else if (type === "bubble-collect") S.bubbles.push({ tile: d.tile, how: d.how, value: d.value, region: d.id, tick });
    else if (type === "growth-focus") S.focus.push({ id: d.id, focus: d.focus, tick });
    else if (type === "local-upgrade") S.local.push({ id: d.id, upgrade: d.upgrade, tick });
    else if (type === "win") S.won = true;
    this._note(type, d, tick);
    if (type === "win") { this.evaluate("bloom:win"); if (this.state === "running") { this._record(this.steps[this.index], this._ctx(), { how: "won-early" }); this.finish("completed"); } return; }
    this._cause = "bloom:" + type; this.evaluate("bloom:" + type);
  }
  _note(type, d, tick = safe(() => this.A.run().ticks)) {
    this.events.push({ type, tick, at: Math.round(this.now()), step: this.index + 1, detail: summary(type, d) });
    if (this.events.length > 600) this.events.shift();
  }
  _queue(cause) { if (this._queued || this.state !== "running") return; this._queued = true; queueMicrotask(() => { this._queued = false; this.evaluate(cause); }); }
  _teardown() {
    if (this._down) return; this._down = true; if (!this._started) return;   // never started: nothing was added
    clearInterval(this._timer); this._timer = 0; clearTimeout(this._inputT); this._inputT = 0;
    if (this.doc) { for (const t of EVENT_TYPES) this.doc.removeEventListener("bloom:" + t, this._onEvent);
      this.doc.removeEventListener("click", this._onInput, true); this.doc.removeEventListener("keyup", this._onInput, true); this.doc.removeEventListener("focusin", this._onInput, true); }
    if (this._unsub) { this._unsub(); this._unsub = null; }
  }
  _changed() { if (this.onChange) try { this.onChange(this); } catch { /* observers never break the script */ } }
}

// the proof's copy of an event: its type-specific fields only (the detail objects themselves are the page's, untouched)
function summary(type, d) {
  const pick = ks => Object.fromEntries(ks.filter(k => d[k] !== undefined).map(k => [k, d[k]]));
  switch (type) {
    case "upgrade-preview": return pick(["id", "board", "available", "gain", "lose", "worse"]);
    case "upgrade-purchase": return pick(["id", "board", "cost", "tier"]);
    case "region-select": return pick(["id", "previous", "tile"]);
    case "bubble-collect": return pick(["how", "tile", "id", "value"]);
    case "growth-focus": return pick(["id", "focus", "previous"]);
    case "local-upgrade": return pick(["id", "upgrade", "cost"]);
    case "play-pause": return pick(["running"]);
    case "speed": return pick(["speed"]);
    case "win": return pick(["coverage", "ticks", "training"]);
    default: return pick(Object.keys(d).slice(0, 4));
  }
}
function safe(f) { try { return f(); } catch { return null; } }
