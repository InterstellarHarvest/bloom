const L = require("./lib.js"); const ROOT = process.argv[2], BR = process.argv[3] || "chromium";
(async () => { const { server, origin } = await L.serve(ROOT); const b = await L.pw[BR].launch();
  const p = await L.openRun(b, origin, "?archetype=ocean_archipelago&seed=28", { w: 1440, h: 900 });
  for (let k = 0; k < 3; k++) for (const r of ["region", "adapt", "spread", "terraform"]) {
    await p.evaluate(() => { const A = BLOOM_RUN_UI.adapter; A.actions.selectRegion(A.regions()[2].index); }); await L.sleep(200);
    await p.evaluate(n => BLOOM.planetView.instance.openRoom(n, {}), r); await L.settled(p); await L.sleep(150);
    await p.evaluate(() => BLOOM.decisionRooms.instance.close(false)); await L.settled(p); await L.sleep(150); }
  const tl = await p.evaluate(() => BLOOM.decisionRooms.instance.timeline()); 
  for (const e of tl.slice(-8)) console.log(e.kind, e.to || e.from, "swap", Math.round(e.tSwapDone - e.tStart), "firstFrame", Math.round(e.tMotion - e.tStart), "end", Math.round(e.tEnd - e.tStart));
  await b.close(); server.close(); })().catch(e => { console.error(e); process.exit(1); });
