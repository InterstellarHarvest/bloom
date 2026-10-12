// BLOOM — Challenge COMPLETION (BLOOM-036D1): the one boundary that owns what "completing a Challenge" means. docs/CHALLENGES_SYSTEM_v1.md §2.5,
// docs/CHALLENGE_COMPLETION_STUDY_v1.md. No DOM. Classic script (like resources/bloom-challenges.js): the page, Node QA and the offline bank
// builder load the same file.
//
//   BLOOM.challengeCompletion.check(completion, scenario)   → errors ([] = valid) for a definition's `completion` block (bloom-challenges.js calls it)
//   BLOOM.challengeCompletion.contract(ch)                  → the RESOLVED, frozen completion contract { win, conditions: [{ type, version, … }],
//                                                             gated, fingerprint } of a resolved Challenge (cached per Challenge object)
//   BLOOM.challengeCompletion.fingerprint(ch)               → the deterministic completionFingerprint (bank-cell provenance: a changed
//                                                             completion definition makes the cell STALE)
//   BLOOM.challengeCompletion.winGate(ch)                   → null (no condition: the ordinary Bloom — the engine is given NO gate) or the
//                                                             GENERIC engine win gate (sim, coverage) => boolean for createSim's opts.canWin
//   BLOOM.challengeCompletion.tracker(ch, sim)              → the run's completion state (session layer): gate(sim, cov) wraps winGate and
//                                                             records the first early Bloom; progress() / reportData(kind) / provenance()
//   BLOOM.challengeCompletion.prove(ch, verdict, { winAt }) → { ok, reason, evidence } — the OFFLINE proof that a layer-P verdict (every
//                                                             proven strategy and each confirmation run) establishes every condition
//   BLOOM.challengeCompletion.goal(ch, winAt)               → the player-facing contract (hub / dossier): the Bloom line + one line per condition
//   BLOOM.challengeCompletion.VERSION / TYPES / MAX_CONDITIONS / WINS
//
// THE ENGINE BOUNDARY. sim.won is the RUN's actual completion. The engine (resources/bloom-sim.js) knows only a generic, optional win gate
// (createSim opts.canWin): coverage ≥ winAt is necessary, and a supplied gate must also permit the win on that tick. This file builds the
// gate from the Challenge's conditions; the engine never reads a Challenge, a condition type or this file. A Challenge with no condition
// passes NO gate at all, so its run is the ordinary engine bit for bit. With a condition, coverage may cross winAt early: that is an early
// Bloom MILESTONE, not the completion — sim.won stays false, the run keeps going, extinction stays live, and the report appears only when
// coverage ≥ winAt and every condition hold on the same tick. Keep Playing after a true completion is the ordinary post-win play.
//
// CONDITION TYPES (v1: exactly one; no parameters, no expression language, at most one condition per Challenge):
//   pressure-final-state   the scenario's pressure (its atmospheric decline) has reached its final state: sim.pressure.progress ≥ 1.
//                          Legal only with a scenario that HAS pressure (refused for no-pressure, competition and climate scenarios).
//                          Offline proof: layer P's own hold check (bloom-witness simulate: at max(margin, final state) + holdFinalSeconds)
//                          held the Bloom threshold with progress = 1, for every proven strategy and every confirmation run.
(function (root) {
  "use strict";
  const BLOOM = root.BLOOM || (root.BLOOM = {});
  const VERSION = 1;                                   // the completion contract's own revision (part of every fingerprint)
  const WINS = Object.freeze(["bloom"]);               // the normal Bloom win (the planet's own threshold)
  const MAX_CONDITIONS = 1;
  const fnv = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193); return (h >>> 0).toString(16).padStart(8, "0"); };
  const stable = v => Array.isArray(v) ? `[${v.map(stable).join(",")}]` : v && typeof v === "object" ? `{${Object.keys(v).sort().map(k => JSON.stringify(k) + ":" + stable(v[k])).join(",")}}` : JSON.stringify(v);
  const pct = x => Math.round(x * 100);
  const clock = s => { const t = Math.max(0, Math.round(s)); return `${Math.floor(t / 60)}m ${String(t % 60).padStart(2, "0")}s`; };
  const mmss = s => { const t = Math.max(0, Math.ceil(s)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`; };

  // ---- the condition types: legality, the runtime predicate, progress, the offline proof, the player's words
  const TYPES = Object.freeze({
    "pressure-final-state": Object.freeze({
      version: 1,
      label: "Final atmosphere",
      // legal only where the scenario has a pressure clock (an atmospheric decline that reaches a final state)
      legal: S => S && S.pressure ? null : "pressure-final-state needs a scenario with pressure (an atmospheric decline): this scenario has none",
      met: sim => !!(sim.pressure && sim.pressure.active && sim.pressure.progress >= 1),
      progress: sim => sim.pressure && sim.pressure.active ? Math.min(1, sim.pressure.progress) : 0,
      // the hold record of one proven run (a strategy's summary or one confirmation run) establishes the condition EXPLICITLY: coverage ≥ winAt
      // WHILE pressure.progress === 1 (the engine clamps progress to exactly 1 in the final state) — never inferred from "the scenario passed"
      provenBy: (h, winAt) => !!(h && h.held === true && typeof h.coverage === "number" && h.coverage >= winAt && h.progress === 1),
      goal: { title: "Final atmosphere", body: "The Bloom counts only after the atmospheric decline has finished." },
    }),
  });

  /** A definition's `completion` errors (never a Challenge prefix: bloom-challenges.js adds it). */
  function check(C, S) {
    const e = [];
    if (!C || typeof C !== "object" || Array.isArray(C) || Object.keys(C).some(k => !["win", "conditions"].includes(k)) || !("win" in C) || !("conditions" in C)) return ["completion must be { win, conditions }"];
    if (!WINS.includes(C.win)) e.push(`completion.win must be one of ${WINS.join(" / ")}`);
    if (!Array.isArray(C.conditions)) { e.push("completion.conditions must be a list ([] = the ordinary Bloom)"); return e; }
    if (C.conditions.length > MAX_CONDITIONS) e.push(`completion.conditions: at most ${MAX_CONDITIONS} condition per Challenge (v1)`);
    const seen = new Set();
    C.conditions.forEach((c, i) => {
      const at = `completion.conditions[${i}]`;
      if (!c || typeof c !== "object" || Array.isArray(c)) { e.push(`${at} must be { type }`); return; }
      const extra = Object.keys(c).filter(k => k !== "type");
      if (extra.length) e.push(`${at}: unknown key(s) / parameter(s) ${extra.join(", ")} (a condition is { type } only: no parameters in v1)`);
      const T = TYPES[c.type];
      if (!T) { e.push(`${at}: unknown condition type "${c.type}" (supported: ${Object.keys(TYPES).join(", ")})`); return; }
      if (seen.has(c.type)) e.push(`${at}: duplicate condition "${c.type}"`); seen.add(c.type);
      const bad = T.legal(S); if (bad) e.push(`${at}: ${bad}`);
    });
    return e;
  }

  const cache = new WeakMap();
  /** The resolved completion contract of a (resolved) Challenge — frozen, cached per Challenge object. */
  function contract(ch) {
    if (!ch || !ch.completion) throw new TypeError("BLOOM.challengeCompletion: a resolved Challenge is required");
    let r = cache.get(ch); if (r) return r;
    const conditions = ch.completion.conditions.map(c => Object.freeze({ type: c.type, version: TYPES[c.type].version, label: TYPES[c.type].label }));
    const core = { version: VERSION, win: ch.completion.win, conditions: conditions.map(c => ({ type: c.type, version: c.version })) };
    r = Object.freeze({ win: ch.completion.win, conditions: Object.freeze(conditions), gated: conditions.length > 0, fingerprint: fnv(stable(core)) });
    cache.set(ch, r); return r;
  }
  const fingerprint = ch => contract(ch).fingerprint;
  const metAll = (K, sim) => K.conditions.every(c => TYPES[c.type].met(sim));

  /** The GENERIC engine win gate for createSim(…, { canWin }) — or null: an ungated Challenge passes nothing (the ordinary engine). */
  function winGate(ch) { const K = contract(ch); return K.gated ? (sim, cov) => metAll(K, sim) : null; }

  /** The player-facing completion contract (hub, dossier): the Bloom line and one line per condition. winAt: the threshold to quote. */
  function goal(ch, winAt) {
    const K = contract(ch);
    return { bloom: { title: "Bloom", body: `${pct(winAt)}% of land alive` }, conditions: K.conditions.map(c => ({ type: c.type, ...TYPES[c.type].goal })), gated: K.gated };
  }

  /**
   * The run's completion state (the session layer; plain data out). gate(sim, cov) is what the session hands the engine (the contract's
   * winGate, observed: the first tick it refuses with coverage ≥ winAt is the first EARLY Bloom). onEarlyBloom(info) is called once then.
   */
  function tracker(ch, sim, { onEarlyBloom = null } = {}) {
    const K = contract(ch), base = winGate(ch), tickS = t => t * sim.config.tickMs / 1000;
    const T = { earlyBloomTick: null, earlyBloomCoverage: null, completedTick: null, completedCoverage: null };
    const gate = base && ((s, cov) => { const ok = base(s, cov) === true;
      if (!ok && T.earlyBloomTick === null) { T.earlyBloomTick = s.ticks; T.earlyBloomCoverage = cov; if (onEarlyBloom) onEarlyBloom({ seconds: tickS(s.ticks), coverage: cov }); }
      return ok; });
    const finalAt = sim.pressure && sim.pressure.fullAt != null ? sim.pressure.fullAt : null;
    // the (single, v1) condition's live reading
    function progress() {
      if (!K.gated) return null;
      const cov = sim.coverage(), winAt = sim.winAt, bloomNow = cov >= winAt, c = K.conditions[0], Ty = TYPES[c.type];
      const met = Ty.met(sim), p = Ty.progress(sim), early = T.earlyBloomTick !== null, now = tickS(sim.ticks);
      const toFinal = finalAt != null && !met ? Math.max(0, finalAt - (sim.pressure.seconds || now)) : 0;
      const bloomTxt = `Bloom ${pct(cov)}% / ${pct(winAt)}%`;
      const status = sim.won ? "complete" : met ? "regain" : bloomNow ? "early-held" : early ? "early-lost" : "waiting";
      const line = { complete: `${c.label.toUpperCase()} ✓`, regain: `${c.label} reached · regain Bloom: ${pct(cov)}% / ${pct(winAt)}%`,
        "early-held": "BLOOM REACHED — hold it until the atmosphere settles.", "early-lost": `${c.label}: ${pct(p)}% · ${bloomTxt}`,
        waiting: `${c.label} · ${pct(p)}% of decline` }[status];
      const sub = status === "early-held" ? `The atmosphere settles in ${mmss(toFinal)}` : status === "waiting" || status === "early-lost" ? `Settles in ${mmss(toFinal)}` : null;
      return { gated: true, status, line, sub, condition: { type: c.type, label: c.label, met, progress: p }, coverage: cov, winAt, bloomNow,
        earlyBloom: early ? { seconds: tickS(T.earlyBloomTick), coverage: T.earlyBloomCoverage } : null, finalAtSeconds: finalAt, secondsToFinal: toFinal, complete: !!sim.won };
    }
    /** The report's completion block (null for an ungated Challenge): what the condition did, never a score. */
    function reportData(kind) {
      if (!K.gated) return null;
      const c = K.conditions[0], met = TYPES[c.type].met(sim), early = T.earlyBloomTick !== null, eS = early ? tickS(T.earlyBloomTick) : null;
      if (kind === "win") {
        if (T.completedTick === null) { T.completedTick = sim.ticks; T.completedCoverage = sim.coverage(); }
        const done = tickS(T.completedTick), lines = [`You held ${pct(T.completedCoverage)}% of the land in the final atmosphere.`];
        if (early) lines.push(done - finalAt < 1 ? `Bloom was first reached at ${clock(eS)}. You held on until the atmosphere settled at ${clock(finalAt)}.`
          : `Bloom was first reached at ${clock(eS)}, before the atmosphere settled at ${clock(finalAt)}; you held it again in the final atmosphere at ${clock(done)}.`);
        else if (done - finalAt >= 1) lines.push(`The atmosphere settled at ${clock(finalAt)}; your plant reached Bloom in the final atmosphere at ${clock(done)}.`);
        return { kind, conditions: [{ type: c.type, label: c.label, met: true }], mark: `${c.label.toUpperCase()} ✓`, completedSeconds: done, coverageAtCompletion: T.completedCoverage,
          earlyBloomSeconds: eS, finalAtSeconds: finalAt, lines };
      }
      const lines = early ? ["You reached Bloom before the atmosphere finished changing, but the plant did not survive the final conditions."]
        : [met ? "The atmosphere had settled, but your plant did not reach Bloom in the final atmosphere." : "The atmosphere had not finished changing: in this Challenge the Bloom counts only in the final atmosphere."];
      return { kind, conditions: [{ type: c.type, label: c.label, met }], mark: met ? `${c.label.toUpperCase()} ✓` : `${c.label}: ${pct(TYPES[c.type].progress(sim))}% of decline`,
        completedSeconds: null, coverageAtCompletion: null, earlyBloomSeconds: eS, finalAtSeconds: finalAt, lines };
    }
    const provenance = () => ({ fingerprint: K.fingerprint, conditions: K.conditions.map(c => c.type), gated: K.gated });
    return { contract: K, gate, progress, reportData, provenance, state: () => ({ ...T }) };
  }

  /**
   * The OFFLINE completion proof (the bank builder): does a passing layer-P verdict establish every condition? Asserted from the proof's own
   * witness evidence — every proven strategy's hold record AND every confirmation run's — never assumed from the scenario. A condition the
   * evidence does not establish FAILS the candidate (a future pressure scenario that does not prove it is refused, never silently passed).
   */
  // winAt: the planet's Bloom threshold (planet.winThreshold ?? config.win) — the proof states coverage against it, explicitly
  function prove(ch, v, { winAt } = {}) {
    const K = contract(ch);
    if (!K.gated) return { ok: true, reason: null, evidence: null };
    if (!(typeof winAt === "number" && winAt > 0 && winAt <= 1)) return { ok: false, reason: "the planet's Bloom threshold (winAt) is required to prove completion", evidence: null };
    if (!v || !v.ok) return { ok: false, reason: "no passing layer-P verdict", evidence: null };
    const S = v.strategies || []; if (!S.length) return { ok: false, reason: "the verdict has no proven strategy", evidence: null };
    const ev = { runs: 0, minHoldCoverage: Infinity, minHoldProgress: Infinity, holdSeconds: [] };
    for (const c of K.conditions) { const Ty = TYPES[c.type];
      for (const [k, w] of S.entries()) {
        const runs = [{ h: w.hold, at: `strategy ${k + 1}` }, ...(w.confirm || []).map(x => ({ h: x.hold, at: `strategy ${k + 1} confirmation seed ${x.rngSeed}` }))];
        for (const r of runs) { ev.runs++;
          if (!Ty.provenBy(r.h, winAt)) return { ok: false, reason: `${c.type} not established by ${r.at} (${r.h ? `coverage ${r.h.coverage} vs winAt ${winAt}, held ${r.h.held}, progress ${r.h.progress}` : "no hold record"})`, evidence: null };
          ev.minHoldCoverage = Math.min(ev.minHoldCoverage, r.h.coverage); ev.minHoldProgress = Math.min(ev.minHoldProgress, r.h.progress); if (r.h.seconds != null) ev.holdSeconds.push(r.h.seconds); } } }
    const fullAt = v.pressure && v.pressure.fullAtSeconds != null ? v.pressure.fullAtSeconds : null;
    // the recorded statement: in every proven run, coverage ≥ winAt WHILE pressure.progress === 1 (at holdSeconds ≥ the final state's start)
    return { ok: true, reason: null, evidence: { conditions: K.conditions.map(c => c.type), proves: "coverage >= winAt while pressure.progress === 1", runs: ev.runs, winAt,
      minHoldCoverage: +ev.minHoldCoverage.toFixed(4), minHoldProgress: ev.minHoldProgress, holdSeconds: ev.holdSeconds.length ? Math.min(...ev.holdSeconds) : null, finalAtSeconds: fullAt } };
  }

  BLOOM.challengeCompletion = Object.freeze({ VERSION, WINS, MAX_CONDITIONS, TYPES, check, contract, fingerprint, winGate, goal, tracker, prove });
})(typeof window !== "undefined" ? window : globalThis);
