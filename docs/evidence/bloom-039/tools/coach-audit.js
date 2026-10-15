// BLOOM-039 coach vs region banner: walk Training's first lessons (the guided-training-check steps) and measure the coach card ∩ banner.
// usage: node coach-audit.js <out.json> [shotsDir]
const Q = require("./q.js"), fs = require("fs");
const [OUT, SHOTS] = process.argv.slice(2), sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => { const b = await Q.launch(), res = {};
  for (const [which, root] of [["before", Q.MAIN], ["after", Q.WT]]) { const S = await Q.serve(root); res[which] = {};
    for (const [w, h] of [[1024, 768], [1440, 900]]) {
      const p = await Q.newPage(b, { width: w, height: h }); await p.goto(S.origin + "/demos/demo-run.html?training=1"); await p.waitForFunction(() => window.BLOOM_TRAINING_UI && BLOOM_TRAINING_UI.guide && BLOOM_TRAINING_UI.guide.mounted && BLOOM_TRAINING_UI.guide.coach.stats.places > 0, null, { timeout: 30000 }); await sleep(500);
      const M = () => p.evaluate(() => { const d = BLOOM_TRAINING_UI.guide.director, c = document.querySelector(".tc-card"), bn = document.getElementById("pvBanner");
        const rc = c && !c.hidden ? c.getBoundingClientRect() : null, rb = bn && !bn.hidden ? bn.getBoundingClientRect() : null;
        const ov = rc && rb ? Math.max(0, Math.min(rc.right, rb.right) - Math.max(rc.left, rb.left)) * Math.max(0, Math.min(rc.bottom, rb.bottom) - Math.max(rc.top, rb.top)) : 0;
        return { lesson: d && d.current ? d.current.id : null, coach: !!rc, banner: !!rb, overlapPx: Math.round(ov), shareOfBanner: rb ? +(ov / (rb.width * rb.height)).toFixed(3) : 0, side: BLOOM_TRAINING_UI.guide.coach.stats.lastPlace && BLOOM_TRAINING_UI.guide.coach.stats.lastPlace.side }; });
      const prim = async () => { await sleep(300); const s = await p.evaluate(() => BLOOM_TRAINING_UI.guide.coach.stats.primary); if (!s) return; const [l, t, r, bb] = s.rect; await p.mouse.click((l + r) / 2, (t + bb) / 2); await sleep(250); };
      const rows = [await M()];
      await prim(); await p.waitForFunction(() => BLOOM_TRAINING_UI.guide.director.current.id !== "start", null, { timeout: 10000 }).catch(() => {}); rows.push(await M());
      for (let k = 0; k < 40 && (await p.evaluate(() => BLOOM_TRAINING_UI.guide.director.current.id)) === "natural-spread"; k++) { await p.evaluate(() => BLOOM_API.advance(10)); await sleep(40); }
      rows.push(await M()); await prim(); rows.push(await M()); // bubble
      await prim(); await sleep(400); rows.push(await M()); // select the lesson's region → the banner's Would help lesson
      if (SHOTS && w === 1024) await p.screenshot({ path: `${SHOTS}/${which}-coach-banner-${w}.png` });
      res[which][`${w}x${h}`] = rows; await p.context().close(); }
    S.close(); }
  fs.writeFileSync(OUT, JSON.stringify(res, null, 1)); console.log(JSON.stringify(res)); await b.close(); })();
