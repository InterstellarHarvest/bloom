// BLOOM-028D1 evidence: // Deterministic slice-check recipe: seeded Math.random, no RAF ticks; same bot as tools/slice-check.js (wet build, 25-tick reaction)
const { chromium } = require("playwright"), path = require("path");
const ROOT = process.argv[2], seeds = process.argv[3].split(",").map(Number);
(async () => { const b = await chromium.launch(), out = [];
  for (const seed of seeds) {
    const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
    await p.addInitScript(s => { let a = s; Math.random = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
      window.requestAnimationFrame = () => 0; }, seed);
    await p.goto("file://" + encodeURI(path.join(ROOT, "demos/demo-run.html")));
    await p.waitForFunction(() => window.BLOOM_API && BLOOM_API.state);
    const plan = ["seedOut", "cold", "flood", "cold", "heat", "salt", "earlyMat", "seedOut"]; let i = 0, affordAt = null, buys = [], won = null;
    for (let t = 0; t < 4000; t += 5) {
      await p.evaluate(() => { BLOOM_API.advance(5); refreshShop(); });
      const st = await p.evaluate(() => BLOOM_API.state());
      if (st.won) { won = st.ticks; break; }
      if (i < plan.length) { const off = await p.$eval(`button.buy[data-id="${plan[i]}"]`, b => b.classList.contains("off"));
        if (!off) { affordAt ??= st.ticks; if (st.ticks - affordAt >= 25) { await p.click(`button.buy[data-id="${plan[i]}"]`); buys.push(st.ticks); i++; affordAt = null; } } }
    }
    const h = await p.evaluate(() => Array.from(sim.state).reduce((h, v) => (Math.imul(h ^ v, 16777619) >>> 0), 2166136261));
    out.push(`${seed}:${won}t/${h.toString(16)}`); await p.close(); }
  console.log(out.join(" ")); await b.close(); })();
