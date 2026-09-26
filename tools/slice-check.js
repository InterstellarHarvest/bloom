// BLOOM — headless QA for demos/demo-run.html (the Next Playable Slice).
// Drives the REAL shop buttons (the 2026-09-26 audit found a dead shop that
// BLOOM_API.buy had been hiding), then checks pacing, preview, readouts, the
// tradeoff, and the Bloom Report.
//
//   NODE_PATH="$(npm root -g)" node tools/slice-check.js [--shots <dir>]
//
// Needs Playwright installed globally (npm i -g playwright). Exits 1 on any failure.
const path = require("path");
let chromium;
try { ({ chromium } = require("playwright")); }
catch { console.error('Playwright not found. Run with NODE_PATH="$(npm root -g)" after `npm i -g playwright`.'); process.exit(2); }

const URL = "file://" + encodeURI(path.resolve(__dirname, "../demos/demo-run.html"));
const shotsArg = process.argv.indexOf("--shots");
const SHOTS = shotsArg > 0 ? process.argv[shotsArg + 1] : null;
const TICK_S = 0.16;
let fails = 0;
const check = (ok, name, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); if (!ok) fails++; };

(async () => {
  const browser = await chromium.launch();
  const open = async () => {
    const p = await browser.newPage({ viewport: { width: 1400, height: 900 } });
    p.errors = []; p.on("pageerror", e => p.errors.push(e.message));
    await p.goto(URL); await p.waitForTimeout(250);
    await p.click("#btnPlay"); // pause the RAF loop; we step the sim ourselves
    return p;
  };

  // 1 · Full run through real clicks: wet build (sacrifices Dust Reach), 4 s "reaction" before each buy
  async function playRecipe(plan) {
    const p = await open(); let i = 0, affordAt = null, buys = [];
    for (let t = 0; t < 4000; t += 5) {
      await p.evaluate(() => { BLOOM_API.advance(5); refreshShop(); });
      const st = await p.evaluate(() => BLOOM_API.state());
      if (st.won) return { p, won: true, secs: st.ticks * TICK_S, buys };
      if (i < plan.length) {
        const off = await p.$eval(`button.buy[data-id="${plan[i]}"]`, b => b.classList.contains("off"));
        if (!off) { affordAt ??= st.ticks; if (st.ticks - affordAt >= 25) { await p.click(`button.buy[data-id="${plan[i]}"]`); buys.push(Math.round(st.ticks * TICK_S)); i++; affordAt = null; } }
      }
    }
    return { p, won: false, secs: null, buys };
  }
  const wet = await playRecipe(["seedOut", "cold", "flood", "cold", "heat", "salt", "earlyMat", "seedOut"]);
  check(wet.won, "wet build wins via real shop clicks", `buys at ${wet.buys.join(", ")} s`);
  check(wet.secs >= 240 && wet.secs <= 480, "pacing: perfect-bot win in 4–8 min (humans slower)", `${Math.round(wet.secs)} s`);
  if (wet.won) {
    const rep = await wet.p.evaluate(() => ({
      modal: document.getElementById("reportModal").classList.contains("on"),
      plant: !!document.getElementById("plantCv"),
      analogs: document.querySelectorAll(".analog li").length,
      gaveUp: document.querySelector(".debrief").innerText,
    }));
    check(rep.modal && rep.plant, "Bloom Report opens with a drawn plant");
    check(rep.analogs >= 5, "report lists a real-plant analog per adaptation", `${rep.analogs} analogs`);
    check(/Dust Reach/.test(rep.gaveUp), "report names the region the wet build gave up", rep.gaveUp.split("\n").slice(1, 3).join(" / "));
    if (SHOTS) await wet.p.screenshot({ path: path.join(SHOTS, "report.png") });
  }
  check(wet.p.errors.length === 0, "no page errors during the run", wet.p.errors.join(" | "));
  await wet.p.close();

  const dry = await playRecipe(["seedOut", "cold", "drought", "cold", "heat", "salt", "earlyMat", "seedOut"]);
  check(dry.won, "dry build also wins (≥2 broad strategies)", `${Math.round(dry.secs)} s`);
  await dry.p.close();

  // 2 · Readouts, preview, tradeoffs (fresh page, biomass granted so buys don't wait)
  const p = await open();
  const first = await p.evaluate(() => { for (let t = 0; t < 600; t++) { BLOOM_API.advance(1); refreshShop();
      if (document.querySelector("button.buy:not(.off)")) return BLOOM_API.state().ticks; } return null; });
  check(first !== null, "shop unlocks during normal play (no test-hook purchases)", first ? `first affordable at ${Math.round(first * TICK_S)} s` : "nothing affordable by 96 s");

  await p.evaluate(() => { BLOOM_API.addBiomass(5000); BLOOM_API.buy("flood"); });
  await p.hover('button.buy[data-id="flood"]');
  const pv = await p.evaluate(() => ({ log: document.getElementById("log").textContent, lose: preview && preview.lose.length }));
  check(pv.lose > 0 && /closes/.test(pv.log), "preview warns that Flood tier 2 closes home regions", pv.log);
  await p.hover('button.buy[data-id="cold"]');
  const pv2 = await p.evaluate(() => document.getElementById("log").textContent);
  check(/^Cold Tolerance/.test(pv2), "hovering an upgrade shows its preview in the log", pv2);

  await p.evaluate(() => { BLOOM_API.buy("salt"); selected = SIDX.salt_barren; renderInspect(); });
  await p.click("details.raw summary");
  await p.evaluate(() => { for (let k = 0; k < 4; k++) renderInspect(); }); // re-render immediately, before any toggle event
  check(await p.evaluate(() => document.querySelector("details.raw").open), "raw-signals panel stays open across re-renders");
  const soil = await p.evaluate(() => document.querySelector(".limit").innerText);
  check(/Thriving/.test(soil), "Salt Barren with Salt Handling reads thriving, not 'blocked'", soil.replace(/\n/g, " / "));
  if (SHOTS) await p.screenshot({ path: path.join(SHOTS, "inspect-preview.png") });
  await p.close();

  // 3 · Tradeoff guards: builds that must NOT win
  async function steady(ids) {
    const q = await open();
    const c = await q.evaluate(ids => { BLOOM_API.addBiomass(99999); ids.forEach(id => BLOOM_API.buy(id)); return BLOOM_API.advance(3000); }, ids);
    await q.close(); return c;
  }
  const gen = await steady(["seedOut", "seedOut", "earlyMat", "cold", "cold", "heat", "salt", "rad"]);
  check(gen < 0.70, "generalist (no water strategy) stays under 70%", `${(gen * 100).toFixed(1)}%`);
  const over = await steady(["seedOut", "seedOut", "earlyMat", "cold", "cold", "heat", "salt", "flood", "flood"]);
  check(over < 0.70, "over-committing (Flood ×2) loses the home regions", `${(over * 100).toFixed(1)}%`);

  await browser.close();
  console.log(fails ? `\n${fails} check(s) FAILED` : "\nALL CHECKS PASS");
  process.exit(fails ? 1 : 0);
})();
