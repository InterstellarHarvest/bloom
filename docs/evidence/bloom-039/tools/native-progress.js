// BLOOM-039: the FRONT STALLED cue clears after real front progress (a real Terraform purchase in play). usage: node native-progress.js <out.json> [shotsDir]
const Q = require("./q.js"), fs = require("fs");
const [OUT, SHOTS] = process.argv.slice(2);
(async () => { const S = await Q.serve(Q.WT), b = await Q.launch(); const p = await Q.newPage(b, { width: 1440, height: 900, seeded: true });
  await p.goto(Q.nav.harnessURL(S.origin, { archetype: "desert_world", seed: 7, scenario: "native_competition", species: "organic_hybrid" })); await Q.waits.harness(p); await p.evaluate(() => BLOOM_RUN_UI.adapter.actions.pause());
  const step = t => p.evaluate(async t => { BLOOM_API.advance(t); await new Promise(r => setTimeout(r, 50)); return { s: BLOOM_RUN_UI.adapter.run().seconds, cov: +BLOOM_API.sim.coverage().toFixed(4), nat: +BLOOM_API.sim.competition.share.toFixed(4), st: BLOOM.planetView.instance.state().standoff, cue: !!document.querySelector("#pvScn .stall") }; }, t);
  await p.evaluate(() => { BLOOM_API.addBiomass(400); BLOOM_API.buy("drought"); BLOOM_API.buy("drought"); });
  const out = { stall: [], after: [] }; let s; for (let k = 0; k < 20; k++) { s = await step(100); out.stall.push(s); }
  out.cueBeforeBuy = s.cue; if (SHOTS) await p.screenshot({ path: `${SHOTS}/after-nc-front-stalled-card.png` });
  out.bought = await p.evaluate(() => { BLOOM_API.addBiomass(2000); const r = []; for (let k = 0; k < 2; k++) r.push(BLOOM_API.buy("dry")); return r; });
  for (let k = 0; k < 40; k++) { s = await step(25); out.after.push(s); if (!s.cue && s.cov > out.stall[out.stall.length - 1].cov + 0.01) break; }
  out.cleared = !s.cue; out.clearedAtSecond = s.s; out.coverage = [out.stall[out.stall.length - 1].cov, s.cov]; out.nativeShare = [out.stall[out.stall.length - 1].nat, s.nat];
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1)); console.log(JSON.stringify({ cueBeforeBuy: out.cueBeforeBuy, bought: out.bought, cleared: out.cleared, at: out.clearedAtSecond, coverage: out.coverage, native: out.nativeShare, errs: p.errs })); await b.close(); S.close(); })();
