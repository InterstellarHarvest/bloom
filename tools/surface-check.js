// BLOOM — browser checks for demos/demo-surface.html (Portion 1 surface demo) after BLOOM-003.
// Drives the real toolbar (mode buttons, New Map, sliders, canvas clicks) over file:// and
// confirms the page renders the SHARED generator's planets, not a private copy.
//
//   NODE_PATH="$(npm root -g)" node tools/surface-check.js [--shots <dir>]
//
// Note: headless Chromium drops a canvas that is drawn once during boot and never redrawn
// (a real browser shows it — verified headed). Pixel checks therefore run after a mode switch.
const path = require("path"), fs = require("fs");
let chromium;
try { ({ chromium } = require("playwright")); }
catch { console.error('Playwright not found. Run with NODE_PATH="$(npm root -g)" after `npm i -g playwright`.'); process.exit(2); }
const FILE = path.resolve(__dirname, "../demos/demo-surface.html"), URL = "file://" + encodeURI(FILE);
const shotsArg = process.argv.indexOf("--shots"), SHOTS = shotsArg > 0 ? process.argv[shotsArg + 1] : null;
let fails = 0;
const check = (ok, name, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); if (!ok) fails++; };

(async () => {
  const src = fs.readFileSync(FILE, "utf8");
  check(!/function\s+(octave|elevationField|generatePlanet|biomeName)\b|NAME_NOUN|mulberry32/.test(src),
    "demo-surface.html holds no private copy of the generator (noise, names, RNG, generatePlanet)");

  const browser = await chromium.launch(), p = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errors = []; p.on("pageerror", e => errors.push(e.message));
  // the demo only uses Math.random to pick New Map seeds; seeding it makes the New Map walk below reproducible
  await p.addInitScript(() => { let a = 20260926; Math.random = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; });
  await p.goto(URL); await p.waitForTimeout(300);
  const foot = () => p.evaluate(() => document.getElementById("foot").innerText.replace(/\s*\n\s*/g, " "));
  const opaque = () => p.evaluate(() => { const d = cv.getContext("2d").getImageData(0, 0, cv.width, cv.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) n++; return n / (d.length / 4); });
  const setSlider = (id, v) => p.evaluate(([id, v]) => { const s = document.getElementById(id); s.value = v; s.dispatchEvent(new Event("input")); }, [id, v]);

  // authored mode
  await p.click("#mRandom"); await p.waitForTimeout(100); await p.click("#mAuthored"); await p.waitForTimeout(200);
  const fa = await foot();
  check(/sections 12/.test(fa) && /bible adjacency 26\/26 \(100%\)/.test(fa) && /validator pass/.test(fa) && /all single-blob/.test(fa),
    "authored Cinder-Frost: 12 sections, adjacency 26/26, contiguous, shared validator passes", fa.slice(0, 150));
  check(await opaque() > 0.99, "authored map renders (canvas fully painted)");
  if (SHOTS) await p.screenshot({ path: path.join(SHOTS, "surface-authored.png") });

  // procedural mode: the page's planet must be exactly the shared generator's output
  await p.click("#mRandom"); await setSlider("sWater", 50); await p.waitForTimeout(200);
  const same = await p.evaluate(() => JSON.stringify(P) === JSON.stringify(BLOOM.generatePlanet({ seed: 12345, waterPct: 50, sections: 14, maxCrossingGap: BLOOM_DATA.config.crossing.maxGap })));
  check(same, "Random mode shows BLOOM.generatePlanet({seed:12345, waterPct:50, sections:14, maxCrossingGap: config}) exactly");
  const fr = await foot(), wp = +(fr.match(/water \d+ \((\d+)%\)/) || [0, -1])[1];
  check(wp >= 50 && /validator pass/.test(fr) && !/unreachable/.test(fr), "procedural 50% map: water counted (out-of-range islands became water), validator passes", fr.slice(0, 170));
  check(await opaque() > 0.99, "procedural map renders (water + land painted)");
  if (SHOTS) await p.screenshot({ path: path.join(SHOTS, "surface-procedural-w50.png") });

  // an in-range archipelago through the real New Map button (60% water)
  await setSlider("sWater", 60); await p.waitForTimeout(100);
  let arch = null;
  for (let k = 0; k < 40 && !arch; k++) { await p.click("#btnNew"); await p.waitForTimeout(40);
    const st = await p.evaluate(() => ({ seed: P.params.seed, ok: VAL.ok, lm: VAL.stats.landmasses, need: VAL.stats.reach.base.strandedSections.length, lost: VAL.stats.reach.strongest.strandedSections.length }));
    if (st.lm >= 2 && st.need > 0) arch = { ...st, tries: k + 1 }; }
  const fi = await foot();
  check(arch && arch.ok && arch.lost === 0 && /need Waterborne Seeds/.test(fi) && !/unreachable/.test(fi),
    "New Map at 60% finds an archipelago whose islands need Waterborne Seeds and are all in range", arch ? `seed ${arch.seed} after ${arch.tries} click(s): ${arch.lm} landmasses, ${arch.need} sections need the trait · ${fi.match(/reachable[^·]*·[^·]*/)[0]}` : "none found");
  if (SHOTS) await p.screenshot({ path: path.join(SHOTS, "surface-procedural-islands-w60.png") });

  // controls: New Map re-seeds, sliders regenerate, clicks inspect
  const seedBefore = await p.evaluate(() => P.params.seed);
  await p.click("#btnNew"); await p.waitForTimeout(200);
  const after = await p.evaluate(() => ({ seed: P.params.seed, ok: VAL.ok }));
  check(after.seed !== seedBefore && after.ok, "⟳ New Map draws a new seed and the new planet validates", `seed ${seedBefore} → ${after.seed}`);
  await setSlider("sSecs", 20); await setSlider("sWater", 0); await p.waitForTimeout(200);
  const s20 = await p.evaluate(() => ({ n: P.sections.length, w: VAL.stats.waterTiles, ok: VAL.ok }));
  check(s20.n === 20 && s20.w === 0 && s20.ok, "sliders regenerate (20 sections, 0% water)", JSON.stringify(s20));
  const hit = await p.evaluate(() => { const i = TILEMAP.findIndex(v => v >= 0); const r = cv.getBoundingClientRect();
    return { x: r.left + (i % W + 0.5) * TILE, y: r.top + ((i / W | 0) + 0.5) * TILE }; });
  await p.mouse.click(hit.x, hit.y); await p.waitForTimeout(100);
  const info = await p.evaluate(() => document.getElementById("info").innerText);
  check(/neighbors \(from tiles\)/.test(info) && /effective temp/.test(info), "clicking a section opens its inspect panel with geography-derived neighbours");

  check(errors.length === 0, "no page errors", errors.join(" | "));
  await browser.close();
  console.log(fails ? `\n${fails} check(s) FAILED` : "\nALL CHECKS PASS");
  process.exit(fails ? 1 : 0);
})();
