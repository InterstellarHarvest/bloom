// BLOOM — Challenge PERCEIVED WAIT (BLOOM-036B1, seed banks): "Continue with <plant>" → the Challenge Planet Dossier on screen, in the real UI.
//
//   NODE_PATH="$(npm root -g)" node tools/challenge-world-timing.js [--browsers chromium,firefox] [--seeds 8] [--out docs/evidence/bloom-036b/challenge-world-timing.json]
//
// For each browser × Challenge × launch seed (1 … N, the same in every browser) × species, through the app itself (hub → BEGIN CHALLENGE →
// Choose Plant Species → Continue):
//   cold   the plant is chosen and Continue pressed at once — nothing built yet (the launch's one worker is already started at BEGIN CHALLENGE)
//   warm   the plant is selected, its ONE bank world is built while the player reads (ChallengeWorldPrep.prepare), then Continue
// and records the wait until the dossier is drawn and the black has lifted, the build time in the worker, whether PREPARING was shown, and the
// bank entry chosen (the same launch + species must give the same entry in every mode and browser). It also samples frame responsiveness
// (requestAnimationFrame gaps) on the species screen while a build runs vs idle. Served over http from the repository root.
"use strict";
const path = require("path"), fs = require("fs"), http = require("http");
const ROOT = path.resolve(__dirname, "..");
const argv = process.argv.slice(2), opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const BROWSERS = opt("--browsers", "chromium,firefox").split(","), SEEDS = +opt("--seeds", "8");
const OUT = path.resolve(ROOT, opt("--out", "docs/evidence/bloom-036b/challenge-world-timing.json"));
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml" };
const q = (xs, p) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * (s.length - 1) + 0.5))]; };
const IDS = ["dying_world", "native_competition", "volatile_climate"], SPECIES = ["organic_hybrid", "cinder_rosette", "woolly_candle", "reed_spire"];

(async () => {
  let pw; try { pw = require("playwright"); } catch (e) { console.error("playwright not installed: NODE_PATH=\"$(npm root -g)\""); process.exit(2); }
  const srv = http.createServer((req, res) => { let p = decodeURIComponent(new URL(req.url, "http://x").pathname); if (p.endsWith("/")) p += "index.html";
    const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream", "Cache-Control": "no-store" }); fs.createReadStream(f).pipe(res); });
  await new Promise(r => srv.listen(0, "127.0.0.1", r)); const O = `http://127.0.0.1:${srv.address().port}`;
  const out = { format: "bloom-036b1-challenge-perceived-wait@1", tool: "tools/challenge-world-timing.js", at: new Date().toISOString(), seeds: SEEDS, browsers: {}, summary: {} };
  for (const bn of BROWSERS) {
    const b = await pw[bn].launch(), c = await b.newContext({ viewport: { width: 1440, height: 900 } });
    await c.addInitScript(() => { try { localStorage.setItem("strange-bloom.training", '{"v":1,"status":"completed","at":1}'); } catch (e) { /* none */ } });
    const p = await c.newPage(), errs = []; p.on("pageerror", e => errs.push(e.message)); p.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
    await p.goto(`${O}/?bg=3`);
    await p.waitForFunction(() => window.MENU_DEV && MENU_DEV.ready && MENU_DEV.entry.state === "menu" && MENU_DEV.entry.black.style.display === "none", null, { timeout: 60000 });
    const hw = await p.evaluate(() => navigator.hardwareConcurrency);
    console.log(`\n# ${bn} ${b.version()} · hardwareConcurrency ${hw}`);
    const wait = (fn, arg, t = 60000) => p.waitForFunction(fn, arg, { timeout: t, polling: 20 });
    const hub = () => wait(() => MENU_DEV.entry.state === "challenges" && MENU_DEV.entry.challengeView && MENU_DEV.entry.challengeView.inner && MENU_DEV.entry.black.style.display === "none");
    const species = () => wait(() => MENU_DEV.entry.state === "species" && MENU_DEV.entry.speciesView && MENU_DEV.entry.speciesView.inner && MENU_DEV.entry.black.style.display === "none");
    const dossier = () => wait(() => { const v = MENU_DEV.entry.worldView; return MENU_DEV.entry.state === "challenge-world" && v && v.inner && v.inner.state === "ready" && MENU_DEV.entry.black.style.display === "none"; });
    // frame gaps on the current screen for `ms` (requestAnimationFrame)
    const frames = ms => p.evaluate(ms => new Promise(res => { const gaps = []; let last = performance.now(); const t0 = last;
      const f = t => { gaps.push(t - last); last = t; if (t - t0 < ms) requestAnimationFrame(f); else res({ n: gaps.length, max: Math.round(Math.max(...gaps)), over50: gaps.filter(g => g > 50).length, p95: Math.round(gaps.sort((a, b) => a - b)[Math.floor(gaps.length * 0.95)]) }); };
      requestAnimationFrame(f); }), ms);
    await p.click('.mm-item[data-act="challenges"]'); await hub();
    const rows = [], resp = [];
    for (const ch of IDS) for (let seed = 1; seed <= SEEDS; seed++) for (const mode of ["cold", "warm"]) {
      await p.evaluate(([ch, seed]) => { MENU_DEV.entry.challengeView.inner.select(ch); MENU_DEV.entry.nextLaunchSeed = seed; }, [ch, seed]);
      await p.click(".ch-btn.go"); await species();
      for (const sp of SPECIES) {
        let respIdle = null, respBuild = null;
        if (mode === "warm") {
          if (seed === 1 && sp === "organic_hybrid") respIdle = await frames(800);
          await p.evaluate(sp => MENU_DEV.entry.speciesView.inner.open(sp), sp);
          if (seed === 1) respBuild = await frames(400);
          await wait(sp => { const j = MENU_DEV.entry.launch.prep.jobs.get(sp); return j && (j.state === "ready" || j.state === "error"); }, sp);
        } else await p.evaluate(sp => MENU_DEV.entry.speciesView.inner.open(sp), sp);
        const t0 = Date.now(); await p.click(".ss-btn.go"); await dossier(); const ms = Date.now() - t0;
        const r = await p.evaluate(() => { const v = MENU_DEV.entry.worldView.inner, X = v.instance, B = MENU_DEV.entry.launch.prep.stats.builds.find(b => b.species === X.speciesId);
          return { cell: X.bank.cellKey, entry: X.entryIndex, fp: X.fingerprint, skipped: !!v.stats.skippedPreparing, buildMs: B && B.buildMs, source: B && B.source, workerStartMs: MENU_DEV.entry.launch.prep.stats.workerStarted }; });
        rows.push({ ch, seed, sp, mode, ms, ...r });
        if (respIdle || respBuild) resp.push({ ch, seed, sp, idle: respIdle, duringBuild: respBuild });
        await p.keyboard.press("Escape"); await species();
      }
      await p.keyboard.press("Escape"); await hub();
      const last = rows.slice(-4); console.log(`${ch.padEnd(19)} seed ${seed} ${mode.padEnd(4)} ${last.map(r => `${r.sp.split("_")[0]} ${r.ms}ms #${r.entry}${r.skipped ? " (skipped)" : ""}`).join(" · ")}`);
    }
    out.browsers[bn] = { version: b.version(), hardwareConcurrency: hw, errors: errs, rows, responsiveness: resp };
    await b.close();
  }
  const all = Object.entries(out.browsers).flatMap(([bn, B]) => B.rows.map(r => ({ ...r, bn })));
  const id = {}; for (const r of all) (id[`${r.ch}|${r.sp}|${r.seed}`] = id[`${r.ch}|${r.sp}|${r.seed}`] || new Set()).add(`${r.entry}:${r.fp}`);
  out.summary.deterministic = Object.values(id).every(s => s.size === 1);
  out.summary.table = {};
  for (const bn of Object.keys(out.browsers)) for (const mode of ["cold", "warm"]) for (const ch of IDS) for (const sp of SPECIES) {
    const R = all.filter(r => r.bn === bn && r.mode === mode && r.ch === ch && r.sp === sp), ms = R.map(r => r.ms);
    out.summary.table[`${bn}|${mode}|${ch}|${sp}`] = { n: R.length, medianMs: q(ms, 0.5), p90Ms: q(ms, 0.9), worstMs: Math.max(...ms), skipped: R.filter(r => r.skipped).length, buildMedianMs: q(R.map(r => r.buildMs || 0), 0.5) };
  }
  for (const bn of Object.keys(out.browsers)) for (const mode of ["cold", "warm"]) { const ms = all.filter(r => r.bn === bn && r.mode === mode).map(r => r.ms);
    out.summary[`${bn}|${mode}`] = { n: ms.length, medianMs: q(ms, 0.5), p90Ms: q(ms, 0.9), worstMs: Math.max(...ms) }; }
  fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + "\n");
  console.log(`\nsame launch + species → the same bank entry in every mode and browser: ${out.summary.deterministic}`);
  for (const k of Object.keys(out.summary).filter(k => /\|(cold|warm)$/.test(k))) console.log(k.padEnd(18), JSON.stringify(out.summary[k]));
  srv.close(); process.exit(out.summary.deterministic && Object.values(out.browsers).every(B => !B.errors.length) ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
