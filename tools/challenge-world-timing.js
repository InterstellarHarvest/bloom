// BLOOM — Challenge world generation TIMING (BLOOM-036B): the one-planet launch in real browsers, every Challenge × every released species.
//
//   NODE_PATH="$(npm root -g)" node tools/challenge-world-timing.js [--browsers chromium,firefox] [--seeds 6] [--out docs/evidence/bloom-036b/challenge-world-timing.json]
//
// For each browser, Challenge, species and launch seed (1 … N, the same seeds in every browser), the page's own ChallengeWorldSearch (the
// production module and its survey workers) selects the instance's planet:
//   cold      the search is created and select() is called at once — nothing prefetched (the worst case: no time on a species screen)
//   typical   the search is created, the launch's physical prefetch runs for `--linger` ms (the species screen), then select() is called
//   focused   as typical, but the species was the selected card during the linger (the screen's warm(): its world is prepared early) —
//             what a player who reads that plant's card for `--linger` ms before choosing it waits
// and records the wall time to the accepted instance, the draws examined, the accepted draw / fingerprint, the stage counts, and the
// physical-cache hits. Planets must be identical across browsers and across cold / typical (determinism), and every accepted world must
// carry a passing layer P. Served over http from the repository root; nothing is written to the repository except --out.
"use strict";
const path = require("path"), fs = require("fs"), http = require("http");
const ROOT = path.resolve(__dirname, "..");
const argv = process.argv.slice(2), opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const BROWSERS = opt("--browsers", "chromium,firefox").split(","), SEEDS = +opt("--seeds", "6"), LINGER = +opt("--linger", "3000");
const OUT = path.resolve(ROOT, opt("--out", "docs/evidence/bloom-036b/challenge-world-timing.json")), MODES = opt("--modes", "typical,cold,focused").split(",");
const ONLY = opt("--challenges", null), SPONLY = opt("--species", null);
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml" };
const q = (xs, p) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * (s.length - 1) + 0.5))]; };

(async () => {
  let pw; try { pw = require("playwright"); } catch (e) { console.error("playwright not installed: NODE_PATH=\"$(npm root -g)\""); process.exit(2); }
  const srv = http.createServer((req, res) => { let p = decodeURIComponent(new URL(req.url, "http://x").pathname); if (p.endsWith("/")) p += "index.html";
    const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream", "Cache-Control": "no-store" }); fs.createReadStream(f).pipe(res); });
  await new Promise(r => srv.listen(0, "127.0.0.1", r)); const O = `http://127.0.0.1:${srv.address().port}`;
  const out = { format: "bloom-036b-challenge-world-timing@1", tool: "tools/challenge-world-timing.js", at: new Date().toISOString(), seeds: SEEDS, lingerMs: LINGER, browsers: {}, summary: {} };
  for (const bn of BROWSERS) {
    const b = await pw[bn].launch(), c = await b.newContext({ viewport: { width: 1280, height: 800 } }), p = await c.newPage(), errs = [];
    p.on("pageerror", e => errs.push(e.message)); p.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
    await p.goto(`${O}/?bg=3&worker=1`);
    await p.waitForFunction(() => window.MENU_DEV && MENU_DEV.ready && window.BLOOM && BLOOM.challenges, null, { timeout: 60000 });
    // stop the title's own survey prefetch: the measurement is the Challenge search alone (the flow stops it at BEGIN CHALLENGE too)
    const env = await p.evaluate(async () => { const e = MENU_DEV.entry; if (e.prefetch) { e.prefetch.dispose(); e.prefetch = null; }
      window.__CW = await import("/resources/challenges/challenge-world-screen.js"); return { ids: BLOOM.challenges.ids(), species: BLOOM.species.ids(), hw: navigator.hardwareConcurrency, ua: navigator.userAgent }; });
    console.log(`\n# ${bn} ${b.version()} · hardwareConcurrency ${env.hw}`);
    const rows = [];
    for (const ch of env.ids) { if (ONLY && !ONLY.split(",").includes(ch)) continue;
      for (const sp of env.species) { if (SPONLY && !SPONLY.split(",").includes(sp)) continue;
        for (let seed = 1; seed <= SEEDS; seed++) for (const mode of MODES) {
          const r = await p.evaluate(async ([ch, sp, seed, mode, linger]) => {
            const C = BLOOM.challenges.resolve(ch), t0 = performance.now(), s = new __CW.ChallengeWorldSearch({ challenge: C, launchSeed: seed, prefetch: mode === "cold" ? 0 : null });
            if (mode === "focused") s.warm(sp);
            if (mode !== "cold") await new Promise(r => setTimeout(r, linger));
            const t1 = performance.now(), o = await s.select(sp), ms = Math.round(performance.now() - t1), st = s.stats.selects[s.stats.selects.length - 1];
            const X = o.instance; s.dispose();
            return { ch, sp, seed, mode, ok: o.ok, ms, draws: o.ok ? X.draws : o.draws, draw: X && X.draw, fingerprint: X && X.fingerprint, worldSeed: X && X.worldSeed, archetype: X && X.archetypeId,
              layerP: X && X.candidate.scenarioValidation.status, sims: X && X.candidate.scenarioValidation.simulations, habitable: X && +X.candidate.habitable.toFixed(3), stages: st.stages, physicalHits: st.physicalHits, source: st.source, prefetched: s.stats.prefetched,
              computeMs: st.ms, joinedAt: st.joinedAt };
          }, [ch, sp, seed, mode, LINGER]);
          rows.push(r);
          console.log(`${ch.padEnd(19)} ${sp.padEnd(15)} seed ${seed} ${mode.padEnd(7)} ${String(r.ms).padStart(6)} ms  draws ${r.draws}  ${r.archetype}:${r.worldSeed} ${r.fingerprint} P=${r.layerP} hits ${r.physicalHits}`);
        } } }
    out.browsers[bn] = { version: b.version(), hardwareConcurrency: env.hw, errors: errs, rows };
    await b.close();
  }
  // summary: per browser × Challenge × species × mode — median / p90 / worst ms, attempts; determinism across modes and browsers
  const all = Object.entries(out.browsers).flatMap(([bn, B]) => B.rows.map(r => ({ ...r, bn })));
  const key = r => `${r.ch}|${r.sp}|${r.seed}`, fp = {};
  for (const r of all) { (fp[key(r)] = fp[key(r)] || new Set()).add(r.fingerprint); }
  out.summary.deterministic = Object.values(fp).every(s => s.size === 1);
  out.summary.allProven = all.every(r => r.ok && r.layerP === "PASS");
  out.summary.table = {};
  for (const bn of Object.keys(out.browsers)) for (const mode of MODES) for (const ch of [...new Set(all.map(r => r.ch))]) for (const sp of [...new Set(all.map(r => r.sp))]) {
    const R = all.filter(r => r.bn === bn && r.mode === mode && r.ch === ch && r.sp === sp); if (!R.length) continue; const ms = R.map(r => r.ms), d = R.map(r => r.draws);
    out.summary.table[`${bn}|${mode}|${ch}|${sp}`] = { n: R.length, medianMs: q(ms, 0.5), p90Ms: q(ms, 0.9), worstMs: Math.max(...ms), medianDraws: q(d, 0.5), maxDraws: Math.max(...d), over10s: ms.filter(x => x > 10000).length };
  }
  fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + "\n");
  console.log(`\ndeterministic across browsers/modes: ${out.summary.deterministic} · every accepted world proven (layer P PASS): ${out.summary.allProven}`);
  for (const [k, v] of Object.entries(out.summary.table)) console.log(k.padEnd(52), JSON.stringify(v));
  srv.close(); process.exit(out.summary.deterministic && out.summary.allProven ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
