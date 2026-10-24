// Training anatomy BEFORE (base, ghost) / AFTER (corrected head, full canonical) — the exact lesson-5 Adapt specimen; + a mid-crossfade report still
const L = require("./lib.js"), fs = require("fs"); const [BASE, NEW, OUT] = process.argv.slice(2);
async function cap(b, root, tag) { const { server, origin } = await L.serve(root); const t = await L.prodTraining(b, origin, { w: 1440, h: 900 });
  await t.waitForFunction(() => BLOOM_TRAINING_UI.guide.director && BLOOM_TRAINING_UI.guide.director.current, null, { timeout: 20000 });
  const chill = await t.evaluate(() => BLOOM_RUN_UI.adapter.regions().find(r => r.id === "chill_hollow").index);
  await t.evaluate(() => { const d = BLOOM_TRAINING_UI.guide.director; d._enter(4); d.evaluate("qa"); }); await L.sleep(300);
  await L.room(t, "adapt", { region: chill }); await L.sleep(300);
  const info = await t.evaluate(() => { const s = BLOOM.plantSpecimen.mounted().find(x => document.querySelector(".dr-room:not([hidden])").contains(x.el)), S = s.state, A = BLOOM_RUN_UI.adapter;
    const ref = BLOOM.plantSpecimen.draw({ traits: S.traits, names: {}, preview: null, colony: { living: true, establishment: 0, word: "" }, focus: "balanced", local: null, condition: "ok", viable: true }, { species: A.run().species });
    return { lesson: BLOOM_TRAINING_UI.guide.director.current.id, org: s.organismSignature(), canonical: ref.organismSig, living: A.region(BLOOM.decisionRooms.instance.state().context).living, caption: document.querySelector(".dr-room:not([hidden]) .spec-cap").textContent }; });
  const png = await t.locator(".dr-room:not([hidden]) .z-focus .lf-top").screenshot(); fs.writeFileSync(`${OUT}/training-anatomy-${tag}.png`, png);
  await t.context().close(); server.close(); return { ...info, png: png.toString("base64") }; }
(async () => { const b = await L.pw.chromium.launch(); const before = await cap(b, BASE, "before"), after = await cap(b, NEW, "after");
  const p = await (await b.newContext()).newPage();
  const grid = await p.evaluate(async ([a, z]) => { const im = async s => { const i = new Image(); i.src = "data:image/png;base64," + s; await i.decode(); return i; }; const A = await im(a), Z = await im(z), pad = 16, head = 30;
    const c = document.createElement("canvas"); c.width = A.width + Z.width + 3 * pad; c.height = Math.max(A.height, Z.height) + head + 2 * pad; const x = c.getContext("2d"); x.fillStyle = "#2f3a2c"; x.fillRect(0, 0, c.width, c.height);
    x.fillStyle = "#fff7e0"; x.font = "bold 15px sans-serif"; x.fillText("BEFORE · no-colony ghost (d03c6f9)", pad, 22); x.fillText("AFTER · full canonical plant", 2 * pad + A.width, 22);
    x.drawImage(A, pad, head + pad); x.drawImage(Z, 2 * pad + A.width, head + pad); return c.toDataURL("image/png").split(",")[1]; }, [before.png, after.png]);
  fs.writeFileSync(`${OUT}/training-anatomy-before-after.png`, Buffer.from(grid, "base64")); delete before.png; delete after.png;
  // the report's crossfade, paused in the middle (deterministic still)
  const { server, origin } = await L.serve(NEW); const r = await L.openRun(b, origin, "?play=1&archetype=ocean_archipelago&seed=28", { w: 1440, h: 900 });
  await r.evaluate(() => { const s = BLOOM_API.sim; BLOOM_API.advance(30); s.won = true; s.onWin(s.coverage()); });
  await r.waitForFunction(() => BLOOM.runReport.instance.state().busy && document.getAnimations().length > 0, null, { timeout: 10000, polling: 10 });
  await r.evaluate(() => { for (const a of document.getAnimations()) { a.pause(); a.currentTime = 170; } }); await L.sleep(100); await r.screenshot({ path: `${OUT}/report-crossfade-middle.png` });
  await r.evaluate(() => { for (const a of document.getAnimations()) a.finish(); }); await r.waitForFunction(() => !BLOOM.runReport.instance.state().busy); await L.sleep(200); await r.screenshot({ path: `${OUT}/report-crossfade-end.png` });
  server.close(); fs.writeFileSync(`${OUT}/training-anatomy.json`, JSON.stringify({ before, after }, null, 1)); console.log(JSON.stringify({ before, after })); await b.close(); })().catch(e => { console.error(e); process.exit(1); });
