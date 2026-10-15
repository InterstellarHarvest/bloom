const Q = require("./q.js"), fs = require("fs"), path = require("path");
const OUT = process.argv[2]; const W = JSON.parse(fs.readFileSync(path.join(Q.WT, "docs/evidence/bloom-038/study-worlds.json"), "utf8")).rows.find(r => r.archetypeId === "desert_world" && r.seed === 18097);
(async () => { const b = await Q.launch();
  for (const [k, root] of [["before", Q.MAIN], ["after", Q.WT]]) { const S = await Q.serve(root), p = await Q.newPage(b, { width: 1440, height: 900 });
    await p.goto(Q.nav.harnessURL(S.origin, { archetype: "desert_world", seed: 7, species: "organic_hybrid" })); await Q.waits.harness(p);
    const info = await p.evaluate(async w => { const D = BLOOM_DATA, A0 = D.archetypes.find(a => a.id === "desert_world"), P = BLOOM.archetype.attemptPlanet(A0, w.seed, w.attempt).planet;
      const run = BLOOM.gameSession.expeditionRun({ planet: P, candidate: { key: "still", archetypeId: "desert_world", seed: w.seed, attempt: w.attempt }, species: BLOOM.species.resolve("woolly_candle"), render: A0.render || null });
      BLOOM.gameSession.instance.dispose(); const s = BLOOM.gameSession.create(run, { host: document.body }); await s.ready; const A = BLOOM_RUN_UI.adapter; A.actions.pause();
      const i = A.regions().findIndex(r => r.name === "Palm Rise"); A.actions.selectRegion(i); await new Promise(r => setTimeout(r, 400));
      const e = BLOOM_API.sim.evaluate(i); return { i, fitness: +e.fitness.toFixed(3), limitF: +e.limitF.toFixed(3), banner: document.getElementById("pvBanner").innerText.replace(/\s+/g, " ").slice(0, 200) }; }, W);
    await p.waitForTimeout(400); await p.mouse.move(1, 899); await p.screenshot({ path: `${OUT}/readout-strained-vs-blocked-1440-${k}.png` }); console.log(k, JSON.stringify(info)); await p.context().close(); S.close(); }
  await b.close(); })();
