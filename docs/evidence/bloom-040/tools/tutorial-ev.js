// Tutorial specimen A/B evidence: Expedition vs Training (same state), base vs BLOOM-040; one grid PNG + JSON
const L = require("./lib.js"), fs = require("fs"); const [BASE, NEW, OUT] = process.argv.slice(2);
const info = p => p.evaluate(() => { const s = BLOOM.plantSpecimen.mounted().find(x => document.querySelector(".dr-room:not([hidden])").contains(x.el)); return { pack: s.pack, plan: s.plan, org: s.organismSignature(), global: s.globalSignature(), colony: s.state.colony.word, traits: Object.values(s.state.traits).reduce((a, b) => a + b, 0), cond: s.state.condition }; });
(async () => { const out = {}, imgs = {}; const b = await L.pw.chromium.launch();
  for (const [tag, root] of [["before", BASE], ["after", NEW]]) { const { server, origin } = await L.serve(root);
    const e = await L.prodExpedition(b, origin, { w: 1440, h: 900 }); await L.room(e, "adapt", { region: await e.evaluate(() => BLOOM_RUN_UI.adapter.regions().find(r => r.isOrigin).index) });
    out[`${tag}-expedition`] = await info(e); imgs[`${tag}-expedition`] = (await e.locator(".dr-room:not([hidden]) .z-focus").screenshot()).toString("base64"); await e.context().close();
    const t = await L.prodTraining(b, origin, { w: 1440, h: 900 }); await L.room(t, "adapt", {});
    out[`${tag}-training`] = await info(t); imgs[`${tag}-training`] = (await t.locator(".dr-room:not([hidden]) .z-focus").screenshot()).toString("base64"); await t.context().close(); server.close(); }
  const p = await (await b.newContext({ viewport: { width: 800, height: 600 } })).newPage();
  const png = await p.evaluate(async imgs => { const ks = ["before-expedition", "before-training", "after-expedition", "after-training"], im = {}; for (const k of ks) { const i = new Image(); i.src = "data:image/png;base64," + imgs[k]; await i.decode(); im[k] = i; }
    const w = Math.max(...ks.map(k => im[k].width)), h = Math.max(...ks.map(k => im[k].height)), pad = 16, head = 34, c = document.createElement("canvas"); c.width = 2 * w + 3 * pad + 90; c.height = 2 * h + 3 * pad + head;
    const x = c.getContext("2d"); x.fillStyle = "#2f3a2c"; x.fillRect(0, 0, c.width, c.height); x.fillStyle = "#fff7e0"; x.font = "bold 16px sans-serif";
    x.fillText("A · Expedition (production)", 90 + pad, 24); x.fillText("B · Training", 90 + 2 * pad + w, 24);
    [["before", "d03c6f9"], ["after", "BLOOM-040"]].forEach(([r, lab], j) => { x.save(); x.translate(30, head + pad + j * (h + pad) + h / 2); x.rotate(-Math.PI / 2); x.fillText(lab, -40, 0); x.restore();
      ["expedition", "training"].forEach((col, i) => x.drawImage(im[`${r}-${col}`], 90 + pad + i * (w + pad), head + pad + j * (h + pad))); });
    return c.toDataURL("image/png").split(",")[1]; }, imgs);
  fs.writeFileSync(`${OUT}/tutorial-specimen-ab.png`, Buffer.from(png, "base64")); fs.writeFileSync(`${OUT}/tutorial-specimen-ab.json`, JSON.stringify(out, null, 1));
  console.log(JSON.stringify(out)); await b.close(); })().catch(e => { console.error(e); process.exit(1); });
