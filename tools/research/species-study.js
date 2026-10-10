// BLOOM — species calibration study (BLOOM-035B; promoted from the BLOOM-035A research scripts in tools/research/species-study/).
// RESEARCH, not a QA gate. Reruns the accepted 035A sample with the REAL production species code — content/species.js through
// BLOOM.species.resolve, the createSim(…, { species }) seam, the survey's own assessment (survey-data assessWorld / classFor), the
// species playability verdict (BLOOM.species.validateFor) — instead of the study's derived configs, and compares every world with
// the accepted 035A results. Read-only against the repository: writes only into --out.
//
//   node tools/research/species-study.js [--sample 120] [--species id,…] [--strategies] [--jobs 14] [--out <dir>]
//
// Sample: for each procedural archetype, the 035A seed stream (mulberry32(0x035A0000 + archetypeIndex · 7919), seeds 1 … 99 999,
// first N distinct) through the survey's production path (physicalCandidate → BLOOM.play.runSearch → generateFromArchetype layers 1–8);
// the authored First Bloom and Training Grounds. Per world × species: landing assessment, limits, origin, refuges; the witness (layers
// 4–6) MEASURED for every species (spend, purchases, win time, early foothold); the production verdict (validateFor: S2 required,
// S1 reported); with --strategies the recorded diagnostics (findStrategies with the archetype's policy: distinct strategies, pacing,
// fastest margin, minimal build, required-condition bypass). Outputs: results.json, tables.md (the 035A tables), compare.md (per-world
// agreement with 035A + the PMO flags).
"use strict";
const fs = require("fs"), path = require("path"), os = require("os");
const { Worker, isMainThread, parentPort, workerData } = require("worker_threads");
const ROOT = path.resolve(__dirname, "../..");
const ARCH = ["ocean_archipelago", "desert_world", "frozen_world"], AN = { ocean_archipelago: "Ocean", desert_world: "Desert", frozen_world: "Frozen" };
const STUDY_ID = { organic_hybrid: "organic_hybrid", cinder_rosette: "dry_heat", woolly_candle: "cold_v2", reed_spire: "wet_flood" }; // production id → 035A role id
const HOME = { cinder_rosette: "desert_world", woolly_candle: "frozen_world", reed_spire: "ocean_archipelago" };
const FILES = ["content/config.js", "content/traits.js", "content/species.js", "planets/first_bloom.js", "planets/training_grounds.js", "content/archetypes.js", "content/scenarios.js",
  "content/play.js", "resources/bloom-sim.js", "resources/bloom-species.js", "resources/bloom-gen.js", "resources/bloom-validate.js", "resources/bloom-witness.js",
  "resources/bloom-archetype.js", "resources/bloom-scenario.js", "resources/bloom-play.js"];
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i < 0 ? d : process.argv[i + 1]; };

if (!isMainThread) {
  for (const f of FILES) require(path.join(ROOT, f));
  const { BLOOM, BLOOM_DATA: D } = globalThis;
  (async () => {
    const SD = await import("file://" + path.join(ROOT, "resources/destination-survey/survey-data.js"));
    const species = workerData.species.map(id => BLOOM.species.resolve(id)), STRAT = workerData.strategies;
    const evalOne = (planet, sp, A) => {
      const a = SD.assessWorld(planet, undefined, sp), sim = BLOOM.createSim(planet, D.config, D.traits, { rng: () => 0.5, species: sp }), M = sim.map;
      let origin = null, refuges = 0;
      M.SEC.forEach((_, i) => { const e = sim.evaluate(i); if (i === M.ORIGIN) origin = { raw: +Object.values(e.cats).reduce((p, c) => p * c.f, 1).toFixed(3), limit: e.limitKey && e.limitKey + ":" + e.cats[e.limitKey].word };
        else if (e.fitness > D.config.categories.lamp.green) refuges++; });
      const t = Date.now(), w = BLOOM.findWitness(planet, D.config, D.traits, { species: sp }), x = w.witness;
      const v = BLOOM.species.validateFor(planet, sp, { config: D.config, traits: D.traits, archetype: A });
      const row = { species: sp.id, habitable: +a.habitable.toFixed(4), classId: SD.classFor(a.habitable).id, limits: Object.fromEntries(Object.entries(a.limits).map(([k, s]) => [k, +s.toFixed(4)])),
        origin, refuges, witness: { ok: !!w.ok, layer: w.layer || null, ms: Date.now() - t, early: w.early || null, spent: x ? x.totalSpent : null, purchases: x ? x.purchases.map(p => p.id) : null,
          winSeconds: x && x.winTick != null ? Math.round(x.winTick * D.config.tickMs / 1000) : null },
        verdict: { ok: v.ok, s1: v.s1, s2reused: v.s2.reused } };
      if (STRAT && A) { const P = A.validation, s = BLOOM.findStrategies(planet, D.config, D.traits, { species: sp, minStrategies: P.minStrategies || 1, pacing: P.pacing || null });
        const req = P.requiredConditions || [], all = [...(s.strategies || []), ...(s.slow || [])];
        row.strategies = { status: s.status, layer7: s.layer7 ? s.layer7.status : s.status, distinct: s.layer7 ? s.layer7.strategies : 0, layer8: s.layer8 ? s.layer8.status : s.status,
          list: all.map(y => ({ sig: y.signature, build: y.minimalBuild, win: y.winSeconds, margin: y.marginSeconds, answersRequired: req.every(c => y.tokens.some(tk => tk.startsWith(c + "="))) })) }; }
      return row;
    };
    parentPort.on("message", task => {
      if (task === null) process.exit(0);
      const t0 = Date.now();
      try {
        if (task.authored) { const P = D.planets[task.authored]; parentPort.postMessage({ task, rows: species.map(sp => evalOne(P, sp, null)), ms: Date.now() - t0 }); return; }
        const A = D.archetypes.find(a => a.id === task.archetypeId), phys = SD.physicalCandidate({ archetypeId: A.id, seed: task.seed });
        if (!phys) { parentPort.postMessage({ task, ok: false, ms: Date.now() - t0 }); return; }
        parentPort.postMessage({ task, ok: true, fingerprint: phys.fingerprint, attempt: phys.attempt, rows: species.map(sp => evalOne(phys.planet, sp, A)), ms: Date.now() - t0 });
      } catch (e) { parentPort.postMessage({ task, error: String(e && e.stack || e) }); }
    });
    parentPort.postMessage({ ready: true });
  })();
  return;
}

// ------------------------------------------------------------------------------------------------ main thread
for (const f of FILES) require(path.join(ROOT, f));
const { BLOOM, BLOOM_DATA: D } = globalThis;
const N = +arg("sample", 120), JOBS = +arg("jobs", Math.max(1, os.cpus().length - 2)), STRAT = process.argv.includes("--strategies");
const SPECIES = (arg("species", null) || BLOOM.species.ids().join(",")).split(",");
const OUT = path.resolve(arg("out", path.join(ROOT, "docs/evidence/bloom-035b/calibration")));
const STUDY = path.join(ROOT, "tools/research/species-study/results");
fs.mkdirSync(OUT, { recursive: true });
const tasks = [];
for (const a of ARCH) { const idx = D.archetypes.findIndex(x => x.id === a), rng = BLOOM.gen.mulberry32(0x035A0000 + idx * 7919), seeds = new Set();
  while (seeds.size < N) seeds.add(1 + Math.floor(rng() * 99999)); for (const seed of seeds) tasks.push({ archetypeId: a, seed }); }
tasks.push({ authored: "first_bloom" }, { authored: "training_grounds" });
const t0 = Date.now(), results = []; let next = 0, live = 0;
console.log(`species calibration: ${tasks.length} tasks (${N} seeds × ${ARCH.length} archetypes + 2 authored) × ${SPECIES.length} species${STRAT ? " + strategies" : ""} on ${JOBS} threads`);
const done = new Promise(res => {
  for (let j = 0; j < JOBS; j++) { const w = new Worker(__filename, { workerData: { species: SPECIES, strategies: STRAT } }); live++;
    const feed = () => { if (next < tasks.length) w.postMessage(tasks[next++]); else { w.postMessage(null); } };
    w.on("message", m => { if (m.ready) return feed(); results.push(m); if (results.length % 40 === 0) console.log(`  ${results.length}/${tasks.length} · ${Math.round((Date.now() - t0) / 1000)} s`); feed(); });
    w.on("exit", () => { if (--live === 0) res(); }); w.on("error", e => { console.error(e); }); }
});

done.then(() => {
  const errors = results.filter(r => r.error); if (errors.length) { console.error(errors.map(e => e.error).join("\n")); process.exit(2); }
  const worlds = results.filter(r => !r.task.authored), authored = Object.fromEntries(results.filter(r => r.task.authored).map(r => [r.task.authored, r.rows]));
  const ms = Date.now() - t0;
  fs.writeFileSync(path.join(OUT, "results.json"), JSON.stringify({ generated: new Date().toISOString(), sample: N, species: SPECIES.map(id => BLOOM.species.resolve(id).physiologyKey), strategies: STRAT, ms,
    worlds: worlds.map(r => ({ archetypeId: r.task.archetypeId, seed: r.task.seed, ok: r.ok, fingerprint: r.fingerprint || null, attempt: r.attempt ?? null, rows: r.rows || null })), authored }));
  // ------------------------------------------------------------------------------------------ tables (the 035A study's, on production code)
  const q = (xs, p) => { const s = xs.slice().sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * (s.length - 1) + 0.5))] : NaN; };
  const P = x => (x * 100).toFixed(0) + "%", F2 = x => x.toFixed(2), cls = h => h >= 0.35 ? "F" : h >= 0.2 ? "P" : "E";
  const md = [], T = (title, head, rows) => md.push(`\n### ${title}\n`, "| " + head.join(" | ") + " |", "|" + head.map(() => "---").join("|") + "|", ...rows.map(r => "| " + r.join(" | ") + " |"));
  const ok = worlds.filter(r => r.ok), rowsOf = (sp, a) => ok.filter(r => r.task.archetypeId === a).map(r => ({ seed: r.task.seed, ...r.rows.find(x => x.species === sp) }));
  const R1 = [], R2 = [], R3 = [], R4 = [], R5 = [], summary = {};
  for (const sp of SPECIES) for (const a of ARCH) { const W = rowsOf(sp, a), n = W.length, h = W.map(w => w.habitable), c = { F: 0, P: 0, E: 0 }; h.forEach(x => c[cls(x)]++);
    R1.push([sp, AN[a], n, F2(Math.min(...h)), F2(q(h, .1)), F2(q(h, .25)), `**${F2(q(h, .5))}**`, F2(q(h, .75)), F2(q(h, .9)), F2(Math.max(...h))]);
    R2.push([sp, AN[a], `${c.F} (${P(c.F / n)})`, `${c.P} (${P(c.P / n)})`, `${c.E} (${P(c.E / n)})`]);
    const dom = {}; W.forEach(w => { const e = Object.entries(w.limits).sort((x, y) => y[1] - x[1])[0]; const k = e ? e[0] : "(none)"; dom[k] = (dom[k] || 0) + 1; });
    R3.push([sp, AN[a], Object.entries(dom).sort((x, y) => y[1] - x[1]).slice(0, 3).map(([k, v]) => `${k} ${P(v / n)}`).join(" · ")]);
    const low = W.filter(w => w.verdict.s1.low).length, win = W.filter(w => w.witness.ok).length, wins = W.filter(w => w.witness.ok);
    const verdictOk = W.filter(w => w.verdict.ok).length, reused = W.filter(w => w.verdict.s2reused).length;
    R4.push([sp, AN[a], `${low} (${P(low / n)})`, `${win}/${n} (${P(win / n)})`, `${verdictOk}/${n}${reused ? ` (${reused} reused)` : ""}`, wins.length ? Math.round(q(wins.map(w => w.witness.spent), .5)) : "—",
      wins.length ? q(wins.map(w => w.witness.purchases.length), .5) : "—", wins.length ? q(wins.map(w => w.witness.winSeconds), .5) + " s" : "—"]);
    let st = null;
    if (STRAT) { const S = W.map(w => w.strategies), l7 = S.filter(x => x.layer7 === "PASS").length, l8 = S.filter(x => x.status === "PASS").length;
      const has = W.filter(w => w.strategies.list.length), fastest = has.map(w => Math.min(...w.strategies.list.map(x => x.margin))), minB = has.map(w => Math.min(...w.strategies.list.map(x => x.build.length)));
      const tooFast = fastest.filter(x => x < 240).length, bypass = W.filter(w => w.strategies.list.some(x => !x.answersRequired)).length, two = S.filter(x => x.distinct >= 2).length;
      st = { l7, l8, two, tooFast, bypass, medianDistinct: q(S.map(x => x.distinct), .5) };
      R5.push([sp, AN[a], `${l7}/${n} (${P(l7 / n)})`, `${l8}/${n} (${P(l8 / n)})`, `${two} (${P(two / n)})`, minB.length ? q(minB, .5) : "—", fastest.length ? Math.round(q(fastest, .5)) + " s" : "—",
        `${tooFast} (${P(tooFast / n)})`, a === "ocean_archipelago" ? "n/a" : `${bypass} (${P(bypass / n)})`]); }
    (summary[sp] = summary[sp] || {})[a] = { n, median: q(h, .5), classes: c, lowFoothold: low, winnable: win, verdictOk, strategies: st };
  }
  T("Landing habitable share (green-lamp land at arrival; the survey's own assessWorld)", ["species", "archetype", "n", "min", "p10", "p25", "median", "p75", "p90", "max"], R1);
  T("Survey class frequency (≥ 35 % Favorable · ≥ 20 % Precarious · else Extreme)", ["species", "archetype", "Favorable", "Precarious", "Extreme"], R2);
  T("Dominant limiting factor (largest share of the land that is not green), top 3", ["species", "archetype", "frequency"], R3);
  T("Foothold, winnability and the production verdict", ["species", "archetype", "S1 low foothold (< 5 %, reported)", "witness winnable (measured)", "validateFor S2 ok (offer gate)", "median witness spend", "median purchases", "median win"], R4);
  if (R5.length) T("Strategy diversity / pacing / required-condition bypass — RECORDED diagnostics (never offer gates)", ["species", "archetype", "S3 ≥ minStrategies distinct", "S3 + S4 pacing", "≥ 2 distinct winners", "median minimal build", "median fastest margin", "fastest < 240 s", "a winner bypasses the required condition"], R5);
  // best / tied-best landing share per world
  const bestRows = [], best = {}; for (const a of ARCH) { const seeds = ok.filter(r => r.task.archetypeId === a); const cnt = {};
    for (const r of seeds) { const hs = SPECIES.map(sp => r.rows.find(x => x.species === sp).habitable), m = Math.max(...hs); SPECIES.forEach((sp, i) => { if (hs[i] >= m - 1e-9) cnt[sp] = (cnt[sp] || 0) + 1; }); }
    best[a] = { n: seeds.length, cnt }; bestRows.push([AN[a], seeds.length, SPECIES.map(sp => `${sp} ${P((cnt[sp] || 0) / seeds.length)}`).join(" · ")]); }
  T("Best or tied-best landing share on the same world", ["archetype", "worlds", "share of worlds where the species is best or tied-best"], bestRows);
  T("Authored worlds (survey assessment)", ["species", "First Bloom habitable", "class", "winnable", "Training Grounds habitable", "class", "winnable"],
    SPECIES.map((sp, i) => { const f = authored.first_bloom[i], t = authored.training_grounds[i]; return [sp, f.habitable.toFixed(4), f.classId, f.verdict.ok ? "yes" : "NO", t.habitable.toFixed(4), t.classId, t.verdict.ok ? "yes" : "NO"]; }));
  // expected draws per column (archetype-uniform stream, physical failures, S2): the survey fill cost
  const VAL = Object.fromEntries(ARCH.map(a => [a, ok.filter(r => r.task.archetypeId === a).length / N])), fill = [];
  for (const sp of SPECIES) { const r = [sp]; for (const c of ["F", "P", "E"]) { let p = 0; for (const a of ARCH) { const W = rowsOf(sp, a); p += (1 / 3) * VAL[a] * W.filter(w => cls(w.habitable) === c && w.verdict.ok).length / W.length; }
    r.push(p > 0 ? (3 / p).toFixed(1) : "never"); (summary[sp].fill = summary[sp].fill || {})[c] = p > 0 ? 3 / p : Infinity; } fill.push(r); }
  T("Expected draws to fill one survey column (3 cells) — MAX_DRAWS is 400", ["species", "Favorable", "Precarious", "Extreme"], fill);
  fs.writeFileSync(path.join(OUT, "tables.md"), `# Species calibration on production code (BLOOM-035B)\n\nSample ${N} seeds × 3 archetypes (${ok.length} validated worlds) + First Bloom / Training Grounds; ${SPECIES.length} species; ${Math.round(ms / 1000)} s on ${JOBS} threads.\n` + md.join("\n") + "\n");

  // ------------------------------------------------------------------------------------------ comparison with the accepted 035A study + PMO flags
  const cmp = [], mism = { habitable: 0, class: 0, winnable: 0, spend: 0, purchases: 0, win: 0, distinct: 0, missing: 0, compared: 0 }, examples = [];
  for (const sp of SPECIES) { const sid = STUDY_ID[sp]; for (const a of ARCH) { const f = path.join(STUDY, `${sid}.${a}.json`); if (!fs.existsSync(f)) continue;
    const S = Object.fromEntries(JSON.parse(fs.readFileSync(f, "utf8")).worlds.map(w => [w.seed, w]));
    for (const w of rowsOf(sp, a)) { const s = S[w.seed]; if (!s) { mism.missing++; continue; } mism.compared++;
      const d = []; if (Math.abs(s.habitable - w.habitable) > 5e-5) { mism.habitable++; d.push(`habitable ${w.habitable} vs ${s.habitable}`); }
      if (cls(s.habitable) !== cls(w.habitable)) { mism.class++; d.push("class"); }
      if (!!s.witness.ok !== !!w.witness.ok) { mism.winnable++; d.push("winnable"); }
      if (s.witness.spent !== w.witness.spent) { mism.spend++; d.push(`spend ${w.witness.spent} vs ${s.witness.spent}`); }
      if (JSON.stringify(s.witness.purchases) !== JSON.stringify(w.witness.purchases)) mism.purchases++;
      if (s.witness.winSeconds !== w.witness.winSeconds) mism.win++;
      if (STRAT && s.strategies && w.strategies && s.strategies.distinct !== w.strategies.distinct) { mism.distinct++; d.push(`distinct ${w.strategies.distinct} vs ${s.strategies.distinct}`); }
      if (d.length && examples.length < 12) examples.push(`${sp} ${a}:${w.seed} — ${d.join(", ")}`); } } }
  const worldsAll = ok.length, flags = [];
  for (const sp of SPECIES) { const unwin = ARCH.reduce((t, a) => t + rowsOf(sp, a).filter(w => !w.verdict.ok).length, 0);
    if (unwin) flags.push(`${sp}: ${unwin} sampled world(s) fail S2 (would be rejected for it, never offered)`); }
  for (const sp of SPECIES) { const b = ARCH.reduce((t, a) => t + (best[a].cnt[sp] || 0), 0); if (b / worldsAll >= 0.8) flags.push(`${sp} is best or tied-best on ${P(b / worldsAll)} of all worlds`); }
  for (const [sp, a] of Object.entries(HOME)) if (SPECIES.includes(sp)) { const b = (best[a].cnt[sp] || 0) / best[a].n; if (b < 0.5) flags.push(`${sp}'s home advantage on ${AN[a]} is weak: best on ${P(b)}`); }
  if (STRAT) for (const sp of SPECIES) for (const a of ["desert_world", "frozen_world"]) { const st = summary[sp][a].strategies; if (st && st.bypass / summary[sp][a].n > 0.2) flags.push(`${sp} bypasses ${AN[a]}'s required condition on ${P(st.bypass / summary[sp][a].n)}`); }
  if (mism.habitable || mism.class || mism.winnable) flags.push(`measurements disagree with the accepted 035A study: ${JSON.stringify(mism)}`);
  for (const sp of SPECIES) for (const c of ["F", "P", "E"]) if (summary[sp].fill[c] > 100) flags.push(`${sp} ${c} column needs ~${summary[sp].fill[c].toFixed(0)} draws (MAX_DRAWS 400)`);
  const cmpMd = [`# Calibration vs the accepted 035A study (BLOOM-035B)`, ``, `World × species rows compared: ${mism.compared} (missing in the study: ${mism.missing}).`, ``,
    `| measure | mismatches |`, `|---|---|`, ...["habitable", "class", "winnable", "spend", "purchases", "win", ...(STRAT ? ["distinct"] : [])].map(k => `| ${k} | ${mism[k]} |`), ``,
    examples.length ? `Examples:\n\n${examples.map(e => `- ${e}`).join("\n")}\n` : "No per-world differences.\n",
    `## Home advantage (best or tied-best landing share on the home archetype)`, ``,
    ...Object.entries(HOME).filter(([sp]) => SPECIES.includes(sp)).map(([sp, a]) => `- ${sp} on ${AN[a]}: ${P((best[a].cnt[sp] || 0) / best[a].n)}`), ``,
    `## PMO flags`, ``, flags.length ? flags.map(f => `- **FLAG** ${f}`).join("\n") : "None raised.", ""];
  fs.writeFileSync(path.join(OUT, "compare.md"), cmpMd.join("\n"));
  fs.writeFileSync(path.join(OUT, "summary.json"), JSON.stringify({ mismatches: mism, flags, summary, best, ms }, null, 1));
  console.log(md.join("\n")); console.log(cmpMd.join("\n"));
});
