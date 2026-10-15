// BLOOM-039 readout re-audit: the REAL production banner (pill word + Would-help) for every non-origin region of the 60 BLOOM-038 sample worlds ×
// each playable species at landing, against the engine's own truth (fitness > growThresh; the hinted track applied up to 4 legal steps).
// usage: node readout-audit.js <before|after> <out.json>
const Q = require("./q.js"), fs = require("fs"), path = require("path");
const [which, OUT] = process.argv.slice(2);
const WORLDS = JSON.parse(fs.readFileSync(path.join(Q.WT, "docs/evidence/bloom-038/study-worlds.json"), "utf8")).rows.filter(r => r.valid);
(async () => { const S = await Q.serve(Q.rootOf(which)), b = await Q.launch(); const p = await Q.newPage(b, { width: 1440, height: 900 });
  await p.goto(Q.nav.harnessURL(S.origin, { archetype: "desert_world", seed: 7, species: "organic_hybrid" })); await Q.waits.harness(p);
  const jobs = []; for (const w of WORLDS) for (const sp of ["organic_hybrid", "cinder_rosette", "woolly_candle", "reed_spire"]) if (w.species[sp] && w.species[sp].playable) jobs.push({ a: w.archetypeId, seed: w.seed, attempt: w.attempt, sp, fp: w.fingerprint });
  const T = { worlds: 0, land: 0, regions: 0, pillBlocked: 0, pillBlockedButGrows: 0, pillOkButCannotGrow: 0, noOffered: 0, noOfferedButHintedOpensMulti: 0, noOfferedButAnyTrackOpens: 0,
    multiStepShown: 0, claimsChecked: 0, claimsFalse: 0, helpsLine: 0, toxicLethal: 0, toxicLethalNamed: 0, examples: [] };
  for (const j of jobs) {
    const r = await p.evaluate(async j => {
      const D = BLOOM_DATA, A0 = D.archetypes.find(a => a.id === j.a), P = BLOOM.archetype.attemptPlanet(A0, j.seed, j.attempt).planet;
      const sp = BLOOM.species.resolve(j.sp), run = BLOOM.gameSession.expeditionRun({ planet: P, candidate: { key: "audit", archetypeId: j.a, seed: j.seed, attempt: j.attempt }, species: sp, render: A0.render || null });
      if (BLOOM.gameSession.instance) BLOOM.gameSession.instance.dispose(); const s = BLOOM.gameSession.create(run, { host: document.body }); await s.ready;
      const A = BLOOM_RUN_UI.adapter, sim = BLOOM_API.sim, CFG = sim.config, GT = CFG.grow.growThresh, M = sim.map, LA = M.AREA.reduce((a, b) => a + b, 0);
      if (A.run().running) A.actions.pause();
      const HINT = { Temperature: w => (w === "freezing" || w === "cold") ? ["cold", "warm"] : ["heat", "cool"], Water: w => (w === "parched" || w === "dry") ? ["drought", "humid"] : ["flood", "dry"], Soil: () => ["salt"], Hazard: () => ["rad"] };
      const opensIn = (id, i, n) => { const t = sim.traitById[id]; if (!t || !sim.offered(t)) return 0; const g0 = { ...sim.genome }, s0 = { ...sim.sky }; let ok = 0;
        for (let k = 1; k <= n && sim.canBuy(t); k++) { const ef = t.effect, gm = sim.genome;
          if (ef.type === "tempPoint" || ef.type === "level" || ef.type === "crossing") gm[ef.stat] = (gm[ef.stat] || 0) + 1;
          else if (ef.type === "waterArm") { if (gm.waterArm !== ef.arm) { gm.waterArm = ef.arm; gm.waterPts = 0; } gm.waterPts++; }
          else if (ef.type === "sky") sim.sky[ef.axis] = Math.min(ef.max ?? Infinity, Math.max(ef.min ?? -Infinity, sim.sky[ef.axis] + ef.delta));
          if (sim.evaluate(i).fitness > GT) { ok = k; break; } }
        Object.assign(sim.genome, g0); Object.assign(sim.sky, s0); return ok; };
      const rows = [];
      for (let i = 0; i < M.SC; i++) { if (M.SEC[i].isOrigin) continue;
        A.actions.selectRegion(i); await new Promise(r => setTimeout(r, 0));
        const bn = document.getElementById("pvBanner"), pill = (bn.querySelector(".pv-st") || {}).textContent || "", none = (bn.querySelector(".bn-help .none") || {}).textContent || "";
        const txt = bn.innerText.replace(/\s+/g, " ").replace("Toxicity is lethal here", ""), sevWords = (txt.match(/\b(stressful|dangerous|lethal)\b/gi) || []).map(w => w.toLowerCase()), chips = [...bn.querySelectorAll(".sb, .pv-st")].map(e => e.textContent.trim()).filter(Boolean);
        const routes = [...bn.querySelectorAll(".bn-help [data-item]")].map(x => ({ id: x.dataset.item, n: +(x.dataset.steps || 1) }));
        const e = sim.evaluate(i), L = M.SEC[i].local, d = sim.derived(), grows = e.fitness > GT;
        const [ad, tf] = !grows && e.limitKey ? HINT[e.limitKey](e.cats[e.limitKey].word) : [null, null], hinted = !grows && !!ad && (opensIn(ad, i, 4) > 0 || (tf && opensIn(tf, i, 4) > 0));
        const anyTrack = !grows && sim.traits.some(t => sim.offered(t) && opensIn(t.id, i, 4) > 0);
        const claims = routes.map(u => ({ id: u.id, n: u.n, ok: opensIn(u.id, i, u.n) === u.n }));
        const toxicLethal = !grows && e.cats.Hazard.word === "lethal" && L.toxicity > d.toxTol;
        rows.push({ i, a: M.AREA[i] / LA, pill, none, sevWords, chips, routes: routes.length, multi: routes.some(u => u.n > 1), claims, grows, hinted, anyTrack, toxicLethal, name: A.region(i).name }); }
      A.actions.deselect(); return rows; }, j);
    T.worlds++;
    for (const x of r) { T.land += x.a; T.regions++; const blockedPill = /Blocked/.test(x.pill);
      if (blockedPill) T.pillBlocked += x.a; if (blockedPill && x.grows) { T.pillBlockedButGrows += x.a; if (T.examples.length < 25) T.examples.push({ kind: "pill-blocked-but-grows", w: `${j.a}:${j.seed}/${j.sp}`, region: x.name }); }
      if (/^\s*OK/.test(x.pill) && !x.grows) T.pillOkButCannotGrow += x.a;
      if (/No offered upgrade opens it/.test(x.none)) { T.noOffered += x.a; if (x.hinted) { T.noOfferedButHintedOpensMulti += x.a; if (T.examples.length < 40) T.examples.push({ kind: "no-offered-but-hinted-opens", w: `${j.a}:${j.seed}/${j.sp}`, region: x.name }); } if (x.anyTrack) T.noOfferedButAnyTrackOpens += x.a; }
      if (x.multi) T.multiStepShown += x.a; for (const c of x.claims) { T.claimsChecked++; if (!c.ok) { T.claimsFalse++; T.examples.push({ kind: "false-claim", w: `${j.a}:${j.seed}/${j.sp}`, region: x.name, c }); } }
      if (/would still block|helps/.test(x.none)) T.helpsLine += x.a;
      if (x.sevWords.length) { T.severityWordBanners = (T.severityWordBanners || 0) + 1; for (const w of x.sevWords) (T.sevWords = T.sevWords || {})[w] = (T.sevWords[w] || 0) + 1; }
      for (const c of x.chips) (T.statusWords = T.statusWords || {})[c] = (T.statusWords[c] || 0) + 1;
      if (x.toxicLethal) { T.toxicLethal += x.a; if (/Toxicity is lethal/.test(x.none)) T.toxicLethalNamed += x.a; } }
    if (T.worlds % 20 === 0) console.log(which, T.worlds, "/", jobs.length);
  }
  const pct = k => +(100 * T[k] / T.land).toFixed(2);
  T.pct = Object.fromEntries(["pillBlocked", "pillBlockedButGrows", "pillOkButCannotGrow", "noOffered", "noOfferedButHintedOpensMulti", "noOfferedButAnyTrackOpens", "multiStepShown", "helpsLine", "toxicLethal", "toxicLethalNamed"].map(k => [k, pct(k)]));
  T.errors = p.errs.slice(0, 5); fs.writeFileSync(OUT, JSON.stringify(T, null, 1)); console.log(which, JSON.stringify(T.pct), "claims", T.claimsChecked, "false", T.claimsFalse, "errs", p.errs.length);
  await b.close(); S.close(); })();
