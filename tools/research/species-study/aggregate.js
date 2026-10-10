"use strict";
// aggregates results/<species>.<archetype>.json into the SPECIES_STUDY tables (Markdown) + a machine summary (JSON)
const fs = require("fs"), path = require("path");
const ARCH = ["ocean_archipelago", "desert_world", "frozen_world"], AN = { ocean_archipelago: "Ocean", desert_world: "Desert", frozen_world: "Frozen" };
const SPECIES = process.argv[2].split(","), DIR = process.argv[3] || "results";
const R = {}; for (const s of SPECIES) { R[s] = {}; for (const a of ARCH) { const f = path.join(DIR, `${s}.${a}.json`); if (fs.existsSync(f)) R[s][a] = JSON.parse(fs.readFileSync(f)); } }
const q = (xs, p) => { const s = xs.slice().sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * (s.length - 1) + 0.5))] : NaN; };
const P = x => (x * 100).toFixed(0) + "%", F2 = x => x.toFixed(2), cls = h => h >= 0.35 ? "F" : h >= 0.2 ? "P" : "E";
const byKey = (rows) => Object.fromEntries(rows.map(r => [r.seed, r]));
const md = [], sum = {};
const T = (title, head, rows) => { md.push(`\n### ${title}\n`, "| " + head.join(" | ") + " |", "|" + head.map(() => "---").join("|") + "|", ...rows.map(r => "| " + r.join(" | ") + " |")); };
// 1 landing share distribution
const rows1 = [], rows2 = [], rows3 = [], rows4 = [], rows5 = [], rows6 = [];
for (const s of SPECIES) for (const a of ARCH) { const X = R[s][a]; if (!X) continue; const W = X.worlds, h = W.map(w => w.habitable), n = W.length;
  const c = { F: 0, P: 0, E: 0 }; h.forEach(x => c[cls(x)]++);
  rows1.push([s, AN[a], n, F2(Math.min(...h)), F2(q(h, .1)), F2(q(h, .25)), `**${F2(q(h, .5))}**`, F2(q(h, .75)), F2(q(h, .9)), F2(Math.max(...h))]);
  rows2.push([s, AN[a], `${c.F} (${P(c.F / n)})`, `${c.P} (${P(c.P / n)})`, `${c.E} (${P(c.E / n)})`]);
  // dominant limiting factor per world (largest non-green share), counted
  const dom = {}; W.forEach(w => { const e = Object.entries(w.limits).sort((x, y) => y[1] - x[1])[0]; const k = e ? e[0] : "(none)"; dom[k] = (dom[k] || 0) + 1; });
  rows3.push([s, AN[a], Object.entries(dom).sort((x, y) => y[1] - x[1]).slice(0, 3).map(([k, v]) => `${k} ${P(v / n)}`).join(" · ")]);
  const nofoot = W.filter(w => w.witness.early && w.witness.early.reachableShare < 0.05).length, originRed = W.filter(w => w.origin.raw <= 0.30).length;
  const win = W.filter(w => w.witness.ok).length, spent = W.filter(w => w.witness.ok).map(w => w.witness.spent), buys = W.filter(w => w.witness.ok).map(w => w.witness.purchases.length);
  const ws = W.filter(w => w.witness.ok).map(w => w.witness.winSeconds);
  rows4.push([s, AN[a], `${nofoot} (${P(nofoot / n)})`, `${originRed} (${P(originRed / n)})`, `${win}/${n} (${P(win / n)})`, spent.length ? Math.round(q(spent, .5)) : "—", buys.length ? q(buys, .5) : "—", ws.length ? q(ws, .5) + " s" : "—",
    W.filter(w => !w.witness.ok && cls(w.habitable) === "E").length]);
  if (W[0].strategies) { const st = W.map(w => w.strategies);
    const l7 = st.filter(x => x.layer7 === "PASS").length, l8 = st.filter(x => x.status === "PASS").length, two = st.filter(x => x.distinct >= 2).length;
    const fastest = W.filter(w => w.strategies.list.length).map(w => Math.min(...w.strategies.list.map(x => x.margin)));
    const tooFast = W.filter(w => w.strategies.list.length && Math.min(...w.strategies.list.map(x => x.margin)) < 240).length;
    const triv = W.filter(w => w.strategies.list.some(x => !x.answersRequired)).length;
    const minBuild = W.filter(w => w.strategies.list.length).map(w => Math.min(...w.strategies.list.map(x => x.build.length)));
    rows5.push([s, AN[a], `${l7}/${n} (${P(l7 / n)})`, `${l8}/${n} (${P(l8 / n)})`, `${two} (${P(two / n)})`, minBuild.length ? q(minBuild, .5) : "—",
      fastest.length ? Math.round(q(fastest, .5)) + " s" : "—", `${tooFast} (${P(tooFast / n)})`, a === "ocean_archipelago" ? "n/a" : `${triv} (${P(triv / n)})`]); }
  sum[s] = sum[s] || {}; sum[s][a] = { n, median: q(h, .5), classes: c, noFoothold: nofoot, winnable: win, winRate: win / n };
}
// overlap vs organic_hybrid
if (SPECIES.includes("organic_hybrid")) for (const s of SPECIES) { if (s === "organic_hybrid") continue; for (const a of ARCH) { const X = R[s][a], O = R.organic_hybrid[a]; if (!X || !O) continue;
  const o = byKey(O.worlds), W = X.worlds.filter(w => o[w.seed]), n = W.length;
  const same = W.filter(w => cls(w.habitable) === cls(o[w.seed].habitable)).length, d = W.map(w => w.habitable - o[w.seed].habitable);
  const better = d.filter(x => x >= 0.10).length, worse = d.filter(x => x <= -0.10).length;
  const winOnlyS = W.filter(w => w.witness.ok && !o[w.seed].witness.ok).length, winOnlyO = W.filter(w => !w.witness.ok && o[w.seed].witness.ok).length;
  rows6.push([s, AN[a], `${same} (${P(same / n)})`, (q(d, .5) >= 0 ? "+" : "") + F2(q(d, .5)), `${better} (${P(better / n)})`, `${worse} (${P(worse / n)})`, winOnlyS, winOnlyO]); } }
T("Landing habitable share (green-lamp land at arrival)", ["species", "archetype", "n", "min", "p10", "p25", "median", "p75", "p90", "max"], rows1);
T("Survey class frequency (≥ 35 % Favorable · ≥ 20 % Precarious · else Extreme)", ["species", "archetype", "Favorable", "Precarious", "Extreme"], rows2);
T("Dominant limiting factor (largest share of the land that is not green), top 3", ["species", "archetype", "frequency"], rows3);
T("Foothold and winnability (witness, layers 4–6, this physiology)", ["species", "archetype", "no landing foothold (<5 % growable + reachable)", "origin red (raw ≤ 0.30)", "winnable", "median witness spend", "median purchases", "median win", "Extreme AND unwinnable"], rows4);
if (rows5.length) T("Strategy diversity (findStrategies with the archetype's minStrategies + pacing) and archetype trivialization", ["species", "archetype", "layer 7 PASS (≥ minStrategies distinct)", "layers 7 + 8 PASS (pacing)", "≥ 2 distinct winners", "median minimal build (purchases)", "median fastest margin", "fastest margin < 240 s (too fast)", "a winner skips the archetype's required condition"], rows5);
T("Overlap with Organic Hybrid (same world)", ["species", "archetype", "same class as OH", "median Δ habitable", "materially better (Δ ≥ +0.10)", "materially worse (Δ ≤ −0.10)", "winnable only for species", "winnable only for OH"], rows6);
const fbRows = SPECIES.map(s => { const X = Object.values(R[s])[0]; return X ? [s, F2(X.firstBloom.habitable), cls(X.firstBloom.habitable), F2(X.trainingGrounds.habitable), cls(X.trainingGrounds.habitable)] : null; }).filter(Boolean);
T("Authored worlds", ["species", "First Bloom habitable", "class", "Training Grounds habitable", "class"], fbRows);

// survey fill cost: the stream draws archetypes uniformly; a cell needs a validated world of the column's class that passes the species' S2 (witness)
const VAL = { ocean_archipelago: 118 / 120, desert_world: 1, frozen_world: 1 }, rows7 = [];
for (const s of SPECIES) { const r = [s]; for (const c of ["F", "P", "E"]) { let p = 0, p0 = 0;
  for (const a of ARCH) { const X = R[s][a]; if (!X) continue; const W = X.worlds, n = W.length;
    p += (1 / 3) * VAL[a] * W.filter(w => cls(w.habitable) === c && w.witness.ok).length / n; p0 += (1 / 3) * VAL[a] * W.filter(w => cls(w.habitable) === c).length / n; }
  r.push(p > 0 ? `${(3 / p).toFixed(1)} (${(3 / p0).toFixed(1)} w/o S2)` : "never"); } rows7.push(r); }
T("Expected draws to fill one survey column (3 cells), per class — the archetype-uniform stream, physical failures, and the species' S2 witness", ["species", "Favorable", "Precarious", "Extreme"], rows7);

// cross-species class agreement on the same physical world (the primary four)
{ const PR = ["organic_hybrid", "dry_heat", "cold_v2", "wet_flood"].filter(x => SPECIES.includes(x)), rows8 = [];
  for (const a of ARCH) { if (!PR.every(x => R[x][a])) continue; const maps = PR.map(x => byKey(R[x][a].worlds)), seeds = R[PR[0]][a].worlds.map(w => w.seed);
    let all = 0, two = 0, three = 0, best = {}; for (const sd of seeds) { const cs = maps.map(m => cls(m[sd].habitable)), k = new Set(cs).size; if (k === 1) all++; else if (k === 2) two++; else three++;
      const hs = maps.map(m => m[sd].habitable), top = PR[hs.indexOf(Math.max(...hs))]; best[top] = (best[top] || 0) + 1; }
    const n = seeds.length; rows8.push([AN[a], `${all} (${P(all / n)})`, `${two} (${P(two / n)})`, `${three} (${P(three / n)})`, PR.map(x => `${x} ${P((best[x] || 0) / n)}`).join(" · ")]); }
  T("Cross-species agreement on the same world (A–D)", ["archetype", "all four in one class", "two classes", "all three classes", "species with the highest landing share"], rows8); }
fs.writeFileSync(path.join(DIR, "tables.md"), md.join("\n") + "\n"); fs.writeFileSync(path.join(DIR, "summary.json"), JSON.stringify(sum, null, 1));
console.log(md.join("\n"));
