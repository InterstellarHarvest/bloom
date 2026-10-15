// BLOOM-039 live check: a multi-step "Would help" on the released site (Challenge launches). usage: node live-multistep.js <out.json>
const Q = require("./q.js"), fs = require("fs");
(async () => { const b = await Q.launch(), LIVE = "https://interstellarharvest.github.io/bloom/";
  for (const [ch, sp, seed] of [["dying_world", "organic_hybrid", 1], ["volatile_climate", "organic_hybrid", 2], ["dying_world", "woolly_candle", 3], ["volatile_climate", "reed_spire", 4]]) {
    const p = await Q.newPage(b, { width: 1440, height: 900 }); await p.goto(LIVE + "?bg=3"); await Q.waits.menu(p); await Q.nav.challenge(p, ch, sp, seed); await p.click(".cw-btn.go"); await Q.waits.run(p, 1);
    const r = await p.evaluate(async () => { const A = BLOOM_RUN_UI.adapter; A.actions.pause();
      for (const g of A.regions()) { if (g.status !== "blocked") continue; A.actions.selectRegion(g.index); await new Promise(r => setTimeout(r, 0));
        const st = [...document.querySelectorAll("#pvBanner [data-steps]")]; if (st.some(e => +e.dataset.steps > 1)) return { region: g.name, banner: document.getElementById("pvBanner").innerText.replace(/\s+/g, " ").slice(-200), routes: A.advice(g.index).routes.map(u => `${u.name}×${u.steps} ${u.cost} need ${u.need}`) }; }
      return null; });
    console.log(ch, sp, seed, JSON.stringify(r), "errs", p.errs.length);
    if (r) { await p.screenshot({ path: `${process.env.SHOTS || "."}/live-multistep.png` }); fs.writeFileSync(process.argv[2], JSON.stringify({ challenge: ch, species: sp, launch: seed, ...r, errors: p.errs })); await p.context().close(); break; }
    await p.context().close(); }
  await b.close(); })();
