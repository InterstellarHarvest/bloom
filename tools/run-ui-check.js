// BLOOM — Run UI production boundary checks (BLOOM-029A). The 24th regression suite.
//
//   NODE_PATH="$(npm root -g)" node tools/run-ui-check.js [--browsers chromium,firefox]
//
// Node: the adapter (resources/run-ui/run-ui-adapter.js) owns no rules — no randomness, no writes to the sim, no DOM, no loop, no
// scenario or planet ids, no Concept 18 mockup data; it refuses an incomplete host and is frozen; its event list is the 028D1
// contract; 029A's own range (from c23815e) touches only the run page, the adapter, this suite and its docs (never the sphere,
// the transition, the menu, the survey, the training layer, the engine, content or planets), adds no coach / tutorial code, and
// keeps every bloom:* dispatch site of the run page.
// Browser (a static server on 127.0.0.1, Chromium and Firefox): First Bloom, a procedural world, an authored planet=, training
// (paused) and the three scenario kinds boot with the adapter; its HUD / selected region / colony / shop / preview / scenario
// snapshots equal what the temporary shell renders; twin training pages — one driven by real clicks, one by the adapter — fire
// the same bloom:* events with the same detail and end in the same sim, tile for tile; play / pause, 1× / 2× / 4×, selection,
// focus, local upgrade and bubbles take the real path; subscribe() batches change notices (at most one "tick" per frame, none
// while paused); BLOOM_API and BLOOM_RUN_UI.placeBubble are unchanged; every 028D1 data-tutorial anchor resolves; file:// boots.
// Exits 1 on any failure.
"use strict";
const path = require("path"), fs = require("fs"), http = require("http"), { execSync } = require("child_process");
const ROOT = path.resolve(__dirname, ".."), BASE_SHA = "c23815ed080dcd084ab4ea412c2a13292c18c181";
const argv = process.argv, argOf = k => { const i = argv.indexOf(k); return i > 0 ? argv[i + 1] : null; };
const BROWSERS = (argOf("--browsers") || "chromium,firefox").split(",");
const read = f => fs.readFileSync(path.join(ROOT, f), "utf8"), J = JSON.stringify, git = c => execSync("git " + c, { cwd: ROOT, encoding: "utf8" }).trim();
let fails = 0; const t0 = Date.now();
const check = (ok, name, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); if (!ok) fails++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const EVTS = ["run-ready", "play-pause", "speed", "region-select", "upgrade-preview", "upgrade-purchase", "growth-focus", "local-upgrade", "bubble-collect", "win"];

(async () => {
  // ================================================================ Node
  console.log("# Node");
  const ADAPTER = "resources/run-ui/run-ui-adapter.js", src = read(ADAPTER), code = src.replace(/\/\/.*$/gm, "");
  // 029A's own range: c23815e → the newest BLOOM-029A commit (plus the working tree while that commit is HEAD or none exists yet),
  // so later milestones that legitimately work elsewhere never trip these provenance checks
  const commits = git(`log --format=%H%x09%s ${BASE_SHA}..HEAD`).split("\n").filter(Boolean).map(l => l.split("\t"));
  const own = commits.filter(([, s]) => /^BLOOM-029A\b/.test(s)), end = own.length ? own[0][0] : null, head = git("rev-parse HEAD");
  const withTree = !end || end === head, range = end ? `${BASE_SHA} ${end}` : BASE_SHA;
  const changed = new Set([...git(`diff --name-only ${withTree ? BASE_SHA : range}`).split("\n"),
    ...(withTree ? git("ls-files --others --exclude-standard").split("\n") : [])].filter(Boolean));
  const runAt = end && !withTree ? git(`show ${end}:demos/demo-run.html`) : read("demos/demo-run.html"), runBase = git(`show ${BASE_SHA}:demos/demo-run.html`);
  const added = git(`diff ${withTree ? BASE_SHA : range} -- demos/demo-run.html ${ADAPTER}`).split("\n").filter(l => l.startsWith("+") && !l.startsWith("+++")).join("\n")
    + (withTree && !git(`ls-files ${ADAPTER}`) ? "\n" + src : "");

  // N1 · the exact base
  check(git(`merge-base HEAD ${BASE_SHA}`) === BASE_SHA && git(`cat-file -t ${BASE_SHA}`) === "commit",
    "N1 · the branch starts from the authoritative base c23815e (028D1 evidence tip), not origin/main",
    `HEAD ${head.slice(0, 7)} · ${commits.length} commit(s) since c23815e (${own.length} BLOOM-029A) · range ${range.split(" ").map(s => s.slice(0, 7)).join("..")}${withTree ? " + working tree" : ""}`);

  // N2 · the adapter owns no rules
  const rules = {
    randomness: /Math\.random|mulberry|\brng\b/.test(code),
    simWrites: /\bsim\.[\w$.[\]]+\s*(?:[-+*/]?=(?!=)|\+\+|--)/.test(code) || /biomass\s*[-+]?=(?!=)/.test(code),
    engineCalls: /\.(tick|buy|buySpecialization|setColonyFocus|collectBubble|placeBubble|previewOf)\s*\(/.test(code.replace(/\bA\.\w+\(|actions\.\w+\(|R\.\w+\(/g, "")),
    dom: /\bdocument\b|getElementById|querySelector|innerHTML|textContent|createElement|\.style\b/.test(code),
    loop: /requestAnimationFrame|setInterval|setTimeout/.test(code),
    pageGlobals: /\b(BLOOM_DATA|BLOOM_RUN|BLOOM_API|BLOOM_TRAINING_UI|window\.)/.test(code.replace(/typeof window !== "undefined" \? window/, "")),
    ids: /["'`](first_bloom|training_grounds|eden|dying_world|native_competition|volatile_climate|ocean_archipelago|desert_world|frozen_world)["'`]/.test(code.replace(/"eden"/g, "")),
  };
  check(Object.values(rules).every(v => !v), "N2 · the adapter owns no rules: no randomness, no writes to the sim, no direct engine actions (only the page's own), no DOM, no loop or timer, no page globals, no planet / scenario id",
    Object.entries(rules).filter(([, v]) => v).map(([k]) => k).join(", ") || `${src.length} bytes, ${src.split("\n").length} lines`);

  // N3 · the adapter refuses an incomplete host, is frozen, and lists the 028D1 event contract
  { for (const f of ["content/config.js", "content/traits.js", "planets/first_bloom.js", "planets/training_grounds.js", "resources/bloom-sim.js"]) require(path.join(ROOT, f));
    require(path.join(ROOT, ADAPTER)); const RU = globalThis.BLOOM.runUI;
    let refused = ""; try { RU.createAdapter({ sim: {} }); } catch (e) { refused = e instanceof TypeError ? e.message : "wrong error"; }
    check(!!RU && Object.isFrozen(RU) && /missing run, labels, events/.test(refused) && /act\.placeBubble/.test(refused) && J(RU.EVENTS) === J(EVTS) && RU.API_VERSION === 1
      && !!globalThis.BLOOM.createSim, "N3 · BLOOM.runUI.createAdapter refuses an incomplete host (naming every missing piece), is frozen, and its event list is exactly the 028D1 contract (10 types)",
      `${refused.slice(0, 120)}…`); }

  // N4 · scope: 029A touches only its own files; the sphere, transition, menu, survey, training layer, engine, content, planets untouched
  { const allowed = p => p === "demos/demo-run.html" || p.startsWith("resources/run-ui/") || p === "tools/run-ui-check.js" || p === "docs/RUN_UI_PRODUCTION_BOUNDARY_v1.md" || p.startsWith("docs/evidence/bloom-029a/");
    const guarded = ["resources/planet-sphere/", "resources/atmosphere-transition/", "resources/main-menu/", "resources/destination-survey/", "resources/training/",
      "resources/bloom-", "content/", "planets/", "index.html", "demos/ui-mockups/", "demos/main-menu.html", "demos/destination-survey.html", "demos/planet-sphere", "demos/atmosphere-transition.html", "GAME_BIBLE.md"];
    const out = [...changed].filter(p => !allowed(p)), hit = [...changed].filter(p => guarded.some(g => p.startsWith(g)));
    check(!out.length && !hit.length, "N4 · 029A changes only the run page, resources/run-ui/, this suite and its docs / evidence — PlanetSphereView, AtmosphereTransition, the main menu, the survey, the training layer, the engine, content and planets are untouched",
      `${[...changed].sort().join(", ")}${out.length ? ` · OUTSIDE: ${out.join(", ")}` : ""}`); }

  // N5 · no Concept 18 mockup data and no guided-training coach code
  { const shared = read("demos/ui-mockups/shared.js"), names = [...shared.matchAll(/\{ id:'(\w+)', name:'([^']+)', terrain:/g)].map(m => [m[1], m[2]]);
    const fakeIds = names.map(n => n[0]), fakeNames = names.map(n => n[1]);
    const leaks = [...fakeNames.filter(n => added.includes(n)), ...fakeIds.filter(id => new RegExp(`["'\`]${id}["'\`]`).test(added)),
      ...["ui-mockups", "shared.js", "c18.js", "BM.", "future:", "ROOMS2"].filter(t => added.includes(t))];
    const coach = [...changed].filter(p => /coach|tutorial|guided|director|spotlight/i.test(p)), coachSrc = /coach|spotlight|callout|step logic|tutorial step/i.test(code);
    check(names.length === 10 && !leaks.length && !coach.length && !coachSrc, "N5 · no Concept 18 fake data imported (none of the mockup's 10 regions, its item placeholders or its files appear in 029A's additions) and no guided-training coach code",
      `${leaks.length ? "LEAKS " + leaks.join(", ") : `scanned ${added.split("\n").length} added lines for ${fakeNames.join(" / ")}`}${coach.length || coachSrc ? " · COACH " + coach.join(", ") : ""}`); }

  // N6 · every bloom:* dispatch site of the run page survives (same count per type as c23815e) and every 028D1 anchor is in the source
  { const count = (s, t) => (s.match(new RegExp(`emit\\("${t}"`, "g")) || []).length, per = EVTS.map(t => [t, count(runBase, t), count(runAt, t)]);
    const anchors = ["biomass", "coverage", "sky", "play-pause", "speed", "map", "inspect", "upgrades", "message-log", "report", "limiting-factor", "readout", "colony-status",
      "raw-signals", "growth-focus", "local-upgrade", "run-menu", "run-actions", "report-continue", "focus-${k}", "local-${id}", "board-${gname.toLowerCase()}", "upgrade-${u.id}", "action-${a.id}"];
    const lost = anchors.filter(a => runBase.includes(`data-tutorial="${a}"`) && !runAt.includes(`data-tutorial="${a}"`));
    check(per.every(([, a, b]) => a === b && a > 0) && !lost.length && (runAt.match(/biomass\s*\+=/g) || []).length === 1 && /window\.BLOOM_RUN_UI=\{ placeBubble \}/.test(runAt),
      "N6 · the run page keeps every bloom:* dispatch (same sites per type as c23815e), every data-tutorial anchor, exactly one Biomass grant (the QA hook) and BLOOM_RUN_UI.placeBubble",
      per.map(([t, a, b]) => `${t} ${a}→${b}`).join(" · ") + (lost.length ? ` · LOST ${lost.join(", ")}` : "")); }

  // ================================================================ Browser
  let pw; try { pw = require("playwright"); } catch { console.error('Playwright not found. Run with NODE_PATH="$(npm root -g)".'); process.exit(2); }
  const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".jpg": "image/jpeg", ".png": "image/png", ".json": "application/json" };
  const server = http.createServer((req, res) => { const u = decodeURIComponent(new URL(req.url, "http://x").pathname), f = path.join(ROOT, u);
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream", "cache-control": "no-store" }); fs.createReadStream(f).pipe(res); });
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  const RUN = `http://127.0.0.1:${server.address().port}/demos/demo-run.html`, FILE = "file://" + encodeURI(path.join(ROOT, "demos/demo-run.html"));
  // in every page: an event log, a frame counter, the shell's number formatting, and the comparisons (adapter vs the rendered shell)
  const INIT = types => {
    window.__EV = []; for (const t of types) document.addEventListener("bloom:" + t, e => window.__EV.push({ type: t, detail: e.detail }));
    const raf = window.requestAnimationFrame.bind(window); window.__frames = 0; window.requestAnimationFrame = cb => raf(t => { window.__frames++; cb(t); });
    const degC = t => `${t > 0 ? "+" : t < 0 ? "−" : ""}${Math.abs(t)}°C`, r1 = v => Math.round(v * 10) / 10, J = JSON.stringify;
    const differ = () => { const bad = []; return { bad, eq(k, a, b) { if (J(a) !== J(b)) bad.push(`${k}: shell ${J(a)} ≠ adapter ${J(b)}`); } }; };
    window.__hudDiff = () => { const A = BLOOM_RUN_UI.adapter, H = A.hud(), d = differ(), $ = id => document.getElementById(id).textContent;
      d.eq("biomass", $("hBio"), String(H.biomass)); d.eq("rate", $("hBioRate"), H.biomassRate === null ? "" : `+${H.biomassRate.toFixed(1)}/s`);
      d.eq("coverage", $("hCov"), H.coveragePct + "%"); d.eq("win", $("hWinPct"), `/ ${H.winPct}%`);
      d.eq("sky", $("hSky"), H.skyAdjusted ? `${degC(r1(H.skyNow.temp))} · moist ${r1(H.skyNow.moist)}` : `${degC(H.sky.temp)} · moist ${H.sky.moist}`);
      d.eq("skyChange", $("hSkyDelta"), H.skyChange ? H.skyChange.text : ""); return d.bad; };
    window.__inspectDiff = () => { const A = BLOOM_RUN_UI.adapter, sel = A.selection(); if (sel.index < 0) return ["no region selected"];
      const R = A.region(sel.index), H = A.hud(), RD = H.skyAdjusted, n = x => RD ? r1(x) : x, d = differ(), el = document.getElementById("inspMain"), more = document.getElementById("inspMore");
      d.eq("name", el.querySelector(".secname").childNodes[0].textContent, R.name); d.eq("origin", !!el.querySelector(".secname .badge"), R.isOrigin);
      const rows = [...el.querySelectorAll(".cats .cat")]; d.eq("rows", rows.map(c => c.querySelector(".lbl").textContent), R.conditions.map(c => c.key));
      rows.forEach((c, k) => { const C = R.conditions[k]; d.eq(C.key + ".word", c.querySelector(".st").textContent, C.word);
        d.eq(C.key + ".lamp", c.querySelector(".lamp").className.replace("lamp", "").trim(), C.lamp); d.eq(C.key + ".terraformable", !!c.querySelector(".tag"), C.terraformable); });
      const lim = el.querySelector(".limit"); d.eq("blocked", !lim.classList.contains("ok"), R.limiting.blocked);
      if (R.limiting.blocked) { d.eq("limit", lim.querySelector("b").textContent, R.limiting.text); d.eq("hint", lim.querySelector(".fixhint").textContent, R.limiting.hint); }
      else d.eq("softSoil", !!lim.querySelector(".fixhint"), R.limiting.softSoil);
      const t = R.temperature; d.eq("tline", document.getElementById("tline").textContent,
        `Ground here ${degC(n(t.ground))} · sky ${degC(RD ? r1(t.sky) : H.sky.temp)} · suits your plant ${degC(t.plantMin)} to ${degC(t.plantMax)}`);
      const col = el.querySelector("#colony"); d.eq("colony", col.querySelector(".cw").textContent, R.colony.label);
      d.eq("established", /(\d+)% established/.exec(col.textContent)[1], String(Math.round(R.colony.establishment * 100))); d.eq("colonyHint", col.querySelector(".fixhint").textContent, R.colony.hint);
      const v = more.querySelector(".vitals").textContent.replace(/\s+/g, " "); d.eq("vigor", /vigor (\d+)%/.exec(v)[1], String(Math.round(R.vitals.vigor * 100)));
      d.eq("counts", /living \d+ · dead \d+ · barren \d+( · native plants \d+)?/.exec(v)[0],
        `living ${R.vitals.living} · dead ${R.vitals.dead} · barren ${R.vitals.barren}${R.vitals.native !== null ? ` · native plants ${R.vitals.native}` : ""}`);
      const kv = Object.fromEntries([...more.querySelectorAll("table.kv tr")].map(tr => [tr.cells[0].textContent, tr.cells[1].textContent])), w = R.raw;
      d.eq("raw.temp", kv["effective temp"], `${w.effectiveTemp > 0 ? "+" : ""}${n(w.effectiveTemp)}°C`); d.eq("raw.moist", kv["effective moist"], String(n(w.effectiveMoist)));
      for (const [k, key] of [["light", "light"], ["soil pH", "ph"], ["salinity", "salinity"], ["nutrients", "nutrients"], ["toxicity", "toxicity"]]) d.eq("raw." + key, kv[k], String(w[key]));
      d.eq("raw.radiation", kv.radiation, R.pressure && R.pressure.offsets.rad ? `${w.radiation} + ${r1(R.pressure.offsets.rad)} thin air = ${r1(w.effectiveRadiation)}` : String(w.radiation));
      d.eq("pressureNote", !!el.querySelector("#pressNote"), !!R.pressure); if (R.competition) d.eq("compWhy", document.getElementById("compWhy").textContent, R.competition.why);
      d.eq("geo", !!el.querySelector(".geo"), !!R.geo); d.eq("therm", !!el.querySelector(".therm"), R.geothermal);
      // the growth focus + local upgrade controls (refreshed in place every frame)
      const C = A.colony(sel.index), box = document.getElementById("focusBox");
      d.eq("focus", [...box.querySelectorAll("button.fbtn")].map(b => [b.dataset.focus, b.getAttribute("aria-pressed"), b.getAttribute("aria-disabled")]),
        C.focusChoices.map(c => [c.id, String(c.selected), String(!c.available)]));
      d.eq("local", [...box.querySelectorAll("button.sbtn")].map(b => [b.dataset.spec, b.getAttribute("aria-disabled"), b.classList.contains("poor"), b.querySelector(".scost").textContent.replace(/need.*/, "").trim()]),
        C.living && !C.localUpgrade ? C.localChoices.map(c => [c.id, String(!c.available), c.block === "biomass", String(C.localPrice)]) : []);
      if (C.localUpgrade) d.eq("localOwned", document.querySelector("#specOwned b").textContent, C.localUpgradeName);
      if (C.living) d.eq("tip", document.getElementById("ftip").textContent, "💡 " + C.tip);
      return d.bad; };
    window.__shopDiff = () => { const A = BLOOM_RUN_UI.adapter, d = differ(), groups = [...document.querySelectorAll("#shop .grp")], ups = A.upgrades();
      d.eq("boards", groups.map(g => g.querySelector("h3").textContent), ups.map(b => b.board));
      ups.forEach((b, k) => { const btns = [...groups[k].querySelectorAll("button.buy")]; d.eq(b.board + ".ids", btns.map(x => x.dataset.id), b.items.map(i => i.id));
        b.items.forEach((it, j) => { const x = btns[j]; if (!x) return; const small = x.querySelector(".nm small").textContent;
          d.eq(it.id, [x.querySelector(".cost").textContent, x.classList.contains("owned"), x.classList.contains("off"), x.classList.contains("poor"), x.getAttribute("aria-disabled"), x.title,
            it.tier > 0 ? /·(\S+) owned/.exec(small)[1] : null],
            [String(it.price), it.owned, !it.canBuy, it.rules && !it.canBuy, String(!it.canBuy), it.reason || "", it.tier > 0 ? (["I", "II", "III", "IV"][it.tier - 1] || "+" + it.tier) : null]); });
        if (b.tempPoints) d.eq("temppool", groups[k].querySelector(".temppool").textContent, `temp points: cold ${b.tempPoints.cold} · heat ${b.tempPoints.heat} / cap ${b.tempPoints.cap}`); });
      return d.bad; };
    window.__scenarioDiff = () => { const S = BLOOM_RUN_UI.adapter.scenario(), d = differ(), $ = id => document.getElementById(id).textContent;
      if (S.pressure) { const P = S.pressure; d.eq("phase", $("pPhase"), P.phaseName); d.eq("lost", $("pPct"), `${Math.round(P.progress * 100)}% lost`); d.eq("next", $("pNext"), P.next);
        d.eq("warn", $("pWarn"), P.extinctionIn === null ? "" : $("pWarn")); }
      if (S.competition) { const C = S.competition; d.eq("native", $("cNative"), `${Math.round(C.share * 100)}%`); d.eq("trend", $("cTrend"), C.trendText); d.eq("contested", $("cCont"), String(C.contested)); }
      if (S.climate) { const C = S.climate; d.eq("level", $("vPct"), `${Math.round(C.level * 100)}%`); d.eq("band", $("vBand"), C.bandName); d.eq("forecast", $("vFc"), C.forecast);
        for (const ax in C.axes) d.eq("axis." + ax, document.querySelector(`#vAx_${ax} b`).textContent, `${Math.round(C.axes[ax].level * 100)}%`); }
      return d.bad; };
    // the shell's DOM (for twin-page comparisons) and the sim's full state
    const hudText = () => { const h = document.querySelector("header .hud").cloneNode(true); h.querySelectorAll(".spend").forEach(x => x.remove()); return h.textContent.replace(/\s+/g, " "); }; // (no "−N" spend floaters: wall-time)
    window.__dom = () => ({ hud: hudText(), play: [document.getElementById("btnPlay").textContent, document.getElementById("btnPlay").getAttribute("aria-pressed")],
      speed: document.getElementById("btnSpeed").textContent, insp: document.getElementById("inspMain").innerHTML, focus: document.getElementById("focusBox").innerHTML,
      more: document.getElementById("inspMore").innerHTML, shop: document.getElementById("shop").innerHTML, log: document.getElementById("log").textContent });
    window.__hash = () => { const s = sim; let h = 2166136261; const mixA = a => { for (const v of a) h = Math.imul(h ^ (Math.round(v * 1e6) | 0), 16777619) >>> 0; };
      mixA(s.state); mixA(s.dens); mixA(s.vigor); mixA([s.biomass, s.ticks, s.sky.temp, s.sky.moist]); mixA(s.bubbles.map(b => b.tile));
      return (h >>> 0).toString(16) + "/" + JSON.stringify({ genome: s.genome, tf: s.tf, focus: s.colonies.focus, spec: s.colonies.spec }); };
  };

  for (const bname of BROWSERS) {
    let browser; try { browser = await pw[bname].launch(); } catch (e) { check(false, `[${bname}] browser launches`, e.message.split("\n")[0]); continue; }
    const B = `[${bname}]`;
    const page = async () => { const c = await browser.newContext({ viewport: { width: 1400, height: 900 } }); await c.addInitScript(INIT, EVTS);
      const p = await c.newPage(); p.errs = []; p.on("pageerror", e => p.errs.push(e.message));
      p.on("console", m => { if (m.type() === "error" && !/subscriber failed|__throw/.test(m.text())) p.errs.push("console: " + m.text()); }); return p; };
    // (BLOOM-029E) this suite compares the adapter's snapshots with the RENDERED engineering shell and drives its buttons: it opens every page
    // with the developer flag ?ui=legacy (the production default hides the shell; its production counterparts are the planet-view / plant-rooms /
    // terraform / run-ui-convergence suites)
    const open = async (q, url = RUN) => { const p = await page(); await p.goto(url + q + (q ? "&" : "?") + "ui=legacy"); await p.waitForFunction(() => window.BLOOM_RUN && BLOOM_RUN.started && window.BLOOM_RUN_UI && BLOOM_RUN_UI.adapter, null, { timeout: 60000 });
      await p.waitForFunction(() => { const c = document.getElementById("trainingCover"); return !c || getComputedStyle(c).display === "none"; }, null, { timeout: 8000 }); return p; }; // (training: its black has lifted)
    const frames = (p, n = 3) => p.evaluate(n => new Promise(r => { const f = k => k ? requestAnimationFrame(() => f(k - 1)) : r(); f(n); }), n);
    const ev = p => p.evaluate(() => window.__EV.map(e => ({ type: e.type, detail: e.detail })));
    const evSince = async (p, k) => (await ev(p)).slice(k);
    const nEv = p => p.evaluate(() => window.__EV.length);
    const settle = async p => { await p.evaluate(() => BLOOM_RUN_UI.adapter.actions.pause()); await frames(p, 3); await p.evaluate(() => { renderInspect(); renderShop(); }); await frames(p, 2); };
    const diffs = p => p.evaluate(() => ({ hud: __hudDiff(), insp: __inspectDiff(), shop: __shopDiff(), scen: __scenarioDiff() }));
    const tileOf = (p, id) => p.evaluate(id => { const M = sim.map, s = M.SIDX[id], c = M.CENT[s]; let best = -1, bd = 1e9;
      for (const t of M.SEC_TILES[s]) { const d = ((t % M.W) + .5 - c.x) ** 2 + (((t / M.W) | 0) + .5 - c.y) ** 2; if (d < bd) { bd = d; best = t; } } return best; }, id);
    const xyOf = (p, t) => p.evaluate(t => { const r = cv.getBoundingClientRect(), W = sim.map.W; return { x: r.left + ((t % W) + .5) * TILE, y: r.top + (((t / W) | 0) + .5) * TILE }; }, t);

    // B1 · every kind of run boots with the adapter, and its snapshots equal the shell — at the landing and on two more regions
    const RUNS = [["first bloom", "", { kind: "authored", planetId: "first_bloom", running: true }],
      ["procedural (ocean 28)", "?archetype=ocean_archipelago&seed=28", { kind: "procedural", archetypeId: "ocean_archipelago", seed: 28, running: true }],
      ["authored planet=", "?planet=training_grounds", { kind: "authored", planetId: "training_grounds", training: false, running: true }],
      ["training", "?training=1", { kind: "authored", planetId: "training_grounds", training: true, running: false, ticks: 0 }],
      ["play=1 first bloom", "?play=1", { kind: "authored", play: true, running: true }],
      ["pressure (dying world)", "?archetype=ocean_archipelago&seed=28&scenario=dying_world", { scenarioId: "dying_world", mechanics: { pressure: true, competition: false, climate: false } }],
      ["competition (native)", "?archetype=desert_world&seed=22&scenario=native_competition", { scenarioId: "native_competition", mechanics: { pressure: false, competition: true, climate: false } }],
      ["climate (volatile)", "?archetype=frozen_world&seed=4&scenario=volatile_climate", { scenarioId: "volatile_climate", mechanics: { pressure: false, competition: false, climate: true } }]];
    for (const [label, q, want] of RUNS) {
      const p = await open(q); await sleep(want.running === false ? 700 : 900);
      const r0 = await p.evaluate(() => BLOOM_RUN_UI.adapter.run()), okRun = Object.entries(want).every(([k, v]) => J(r0[k]) === J(v));
      if (/pressure|competition|climate/.test(label)) await p.evaluate(() => BLOOM_API.advance(700)); // into the decline / contact / a settled climate
      await settle(p);
      const at = [await diffs(p)], picks = await p.evaluate(() => { const A = BLOOM_RUN_UI.adapter, R = A.regions(), sel = A.selection().index;
        const blocked = R.find(x => x.blocked && x.index !== sel), other = R.find(x => !x.blocked && x.index !== sel); return [blocked, other].filter(Boolean).map(x => x.id); });
      for (const id of picks) { await p.evaluate(id => BLOOM_RUN_UI.adapter.actions.selectRegion(id), id); await frames(p, 2); at.push(await diffs(p)); }
      const bad = at.flatMap((d, k) => Object.entries(d).flatMap(([part, list]) => list.map(x => `#${k} ${part} ${x}`)));
      check(okRun && !bad.length && !p.errs.length, `${B} B1 · ${label}: boots with BLOOM_RUN_UI.adapter; run() reads the real run; HUD / inspect / colony / shop / scenario snapshots equal the shell (landing + ${picks.length} regions)`,
        `${r0.planetName} · ${r0.kind} · ${r0.scenarioId} · running ${r0.running} · ticks ${r0.ticks}${okRun ? "" : " · RUN " + J(r0)}${bad.length ? " · " + bad.slice(0, 4).join(" | ") : ""}${p.errs.length ? " · ERR " + p.errs.join(" | ") : ""}`);
      await p.context().close(); }

    // B2 · previews: the real hover and the adapter read the same calculation; adapter.previewOf shows nothing
    for (const [label, q, ids] of [["first bloom", "", ["cold", "drought", "warm", "humid", "seedOut"]], ["ocean 28 (crossing)", "?archetype=ocean_archipelago&seed=28", null],
      ["frozen 4 + volatile climate (Terraform)", "?archetype=frozen_world&seed=4&scenario=volatile_climate", ["warm", "cool"]]]) {
      const p = await open(q); await settle(p);
      const list = ids || await p.evaluate(() => BLOOM_RUN_UI.adapter.upgrades().flatMap(b => b.items).filter(u => u.effect === "crossing" || u.board === "Adapt").slice(0, 4).map(u => u.id));
      const quiet = await p.evaluate(() => { const A = BLOOM_RUN_UI.adapter, look = () => JSON.stringify([document.getElementById("log").textContent, A.activePreview(), window.__EV.length, __hash()]);
        const before = look(), all = A.upgrades().flatMap(b => b.items).map(u => A.previewOf(u.id)); return { same: before === look(), n: all.length }; });
      const bad = [];
      for (const id of list) { const k = await nEv(p); await p.hover(`#shop button.buy[data-id="${id}"]`); await frames(p, 1);
        const got = await p.evaluate(id => { const A = BLOOM_RUN_UI.adapter, u = sim.traitById[id], raw = sim.previewOf(id), M = sim.map.SEC;
          return { pv: A.previewOf(id), act: A.activePreview(), log: document.getElementById("log").textContent, raw: raw && { gain: raw.gain.map(i => M[i].id), lose: raw.lose.map(i => M[i].id) }, type: u.effect.type }; }, id);
        const e = (await evSince(p, k)).filter(x => x.type === "upgrade-preview").pop(), d = e && e.detail, pv = got.pv;
        const same = d && d.available === pv.available && ["gain", "lose", "better", "worse", "reachHostile"].every(f => J(d[f]) === J(pv[f])) && got.log === pv.text
          && (!pv.available || (J(got.act.gain) === J(pv.gain) && J(got.act.lose) === J(pv.lose))) && (!got.raw || got.type === "crossing" || (J(got.raw.gain) === J(pv.gain) && J(got.raw.lose) === J(pv.lose)));
        if (!same) bad.push(`${id}: event ${J(d)} · adapter ${J(pv)} · map ${J(got.act)}`);
        await p.mouse.move(2, 2); await frames(p, 1); }
      const cleared = await p.evaluate(() => BLOOM_RUN_UI.adapter.activePreview());
      check(quiet.same && !bad.length && cleared === null && !p.errs.length, `${B} B2 · ${label}: a real hover's bloom:upgrade-preview, the map outline, the footer and adapter.previewOf agree (the engine's previewOf for Adapt); previewOf(·) on all ${quiet.n} upgrades shows nothing, logs nothing, fires nothing`,
        `${list.join(", ")}${bad.length ? " · " + bad.slice(0, 2).join(" | ") : ""}${p.errs.length ? " · ERR " + p.errs.join(" | ") : ""}`);
      await p.context().close(); }

    // B3 · twin training pages: page R by real clicks, page A by the adapter — same events, same shell, same sim
    { const R = await open("?training=1"), A = await open("?training=1"); await frames(R, 3); await frames(A, 3);
      const steps = [], norm = e => e.type === "region-select" ? { ...e, detail: { ...e.detail, tile: "·" } } : e;
      // (a pointer click on a shop button also (re-)enters it, and every entry previews: "a hover then a click may send two" (028D1 §7) —
      // so on click steps the pointer's own upgrade-preview events are set aside; the preview step compares them one to one)
      const step = async (name, real, adapt, click = false) => { const kr = await nEv(R), ka = await nEv(A); const rr = await real(), ra = await adapt(); await frames(R, 2); await frames(A, 2);
        const keep = e => !(click && e.type === "upgrade-preview");
        const er = (await evSince(R, kr)).filter(keep), ea = (await evSince(A, ka)).filter(keep), dr = await R.evaluate(() => __dom()), da = await A.evaluate(() => __dom());
        const domBad = Object.keys(dr).filter(k => dr[k] !== da[k] && J(dr[k]) !== J(da[k]));
        steps.push({ name, evSame: J(er.map(norm)) === J(ea.map(norm)), domBad, er, ea, rr, ra }); };
      const clickTile = async (p, id) => { const t = await tileOf(p, id), xy = await xyOf(p, t); await p.mouse.click(xy.x, xy.y); return t; };
      const act = (fn, ...a) => () => A.evaluate(([fn, a]) => { const x = BLOOM_RUN_UI.adapter.actions; return x[fn](...a); }, [fn, a]);
      await step("select Chill Hollow", () => clickTile(R, "chill_hollow"), act("selectRegion", "chill_hollow"));
      await step("preview Cold Tolerance", () => R.hover('[data-tutorial="upgrade-cold"]'), act("preview", "cold"));
      await step("buy Cold Tolerance", () => R.click('[data-tutorial="upgrade-cold"]'), () => A.evaluate(() => { const x = BLOOM_RUN_UI.adapter.actions; x.preview("cold"); return x.buy("cold"); }), true);
      await step("leave the shop", () => R.mouse.move(2, 2), act("clearPreview"));
      await step("select Landing Meadow", () => clickTile(R, "landing_meadow"), act("selectRegion", "landing_meadow"));
      await step("growth focus Roots", () => R.click('[data-tutorial="focus-roots"]'), act("setGrowthFocus", "landing_meadow", "roots"));
      await step("refused purchase (Humidify, too poor; the pointer previews it first)", () => R.click('[data-tutorial="upgrade-humid"]', { force: true }),
        () => A.evaluate(() => { const x = BLOOM_RUN_UI.adapter.actions; x.preview("humid"); return x.buy("humid"); }), true);
      await step("leave the shop", () => R.mouse.move(2, 2), act("clearPreview"));
      const grow = async p => { await p.evaluate(() => { const need = sim.specPrice(); let n = 0; while (sim.biomass < need && n < 4000) { BLOOM_API.advance(20); n += 20; } renderShop(); }); };
      await step("grow (the same ticks on both)", () => grow(R), () => grow(A));
      await step("local upgrade Root Network", () => R.click('[data-tutorial="local-rootNetwork"]'), act("buyLocalUpgrade", "landing_meadow", "rootNetwork"));
      const place = p => p.evaluate(() => BLOOM_RUN_UI.placeBubble());
      await step("place a bubble", () => place(R), () => place(A));
      await step("collect it", async () => { const t = await R.evaluate(() => sim.bubbles[0].tile), xy = await xyOf(R, t); await R.mouse.click(xy.x, xy.y); },
        async () => { const t = await A.evaluate(() => sim.bubbles[0].tile); return A.evaluate(t => BLOOM_RUN_UI.adapter.actions.collectBubble(t), t); });
      await step("deselect", () => clickTile(R, "landing_meadow"), act("deselect"));
      const hr = await R.evaluate(() => __hash()), ha = await A.evaluate(() => __hash());
      await step("advance 600 ticks", () => R.evaluate(() => BLOOM_API.advance(600)), () => A.evaluate(() => BLOOM_API.advance(600)));
      const hr2 = await R.evaluate(() => __hash()), ha2 = await A.evaluate(() => __hash());
      const bad = steps.filter(s => !s.evSame || s.domBad.length);
      const types = steps.map(s => `${s.name}: ${s.er.map(e => e.type).join("+") || "—"}`);
      const sel = steps[0].er[0], sela = steps[0].ea[0];
      check(!bad.length && hr === ha && hr2 === ha2 && sel && sela && sel.detail.tile >= 0 && sela.detail.tile === -1 && !R.errs.length && !A.errs.length,
        `${B} B3 · twin training pages: real clicks and adapter actions fire the same bloom:* events with the same detail (region-select: the clicked tile vs −1), leave the same shell (HUD, inspect, colony, shop, buttons, footer) and the same sim, tile for tile, before and after 600 more ticks`,
        `${types.join(" · ")} · sim ${hr.split("/")[0]} = ${ha.split("/")[0]} → ${hr2.split("/")[0]} = ${ha2.split("/")[0]}${bad.length ? " · DIFF " + bad.map(s => `${s.name} ev ${s.evSame} dom ${s.domBad.join("/")} ${J(s.er).slice(0, 200)} vs ${J(s.ea).slice(0, 200)}`).join(" | ") : ""}${R.errs.concat(A.errs).length ? " · ERR " + R.errs.concat(A.errs).join(" | ") : ""}`);

      // B4 · play / pause and speed on the same twins (after the sim comparison: a running clock is wall-time)
      const pp = []; for (const [real, ad] of [["#btnPlay", "togglePlay"], ["#btnPlay", "togglePlay"], ["#btnSpeed", "cycleSpeed"], ["#btnSpeed", "cycleSpeed"], ["#btnSpeed", "cycleSpeed"]]) {
        const kr = await nEv(R), ka = await nEv(A); await R.click(real); const ret = await A.evaluate(f => BLOOM_RUN_UI.adapter.actions[f](), ad); await frames(R, 1); await frames(A, 1);
        const dr = await R.evaluate(() => __dom()), da = await A.evaluate(() => __dom());
        pp.push({ er: (await evSince(R, kr)).filter(e => /play-pause|speed/.test(e.type)), ea: (await evSince(A, ka)).filter(e => /play-pause|speed/.test(e.type)), ret, btn: [dr.play, dr.speed], btnA: [da.play, da.speed],
          st: await A.evaluate(() => [BLOOM_API.state().running, BLOOM_API.state().speed]) }); }
      const extra = await A.evaluate(async () => { const x = BLOOM_RUN_UI.adapter.actions, k = window.__EV.length;
        const r = [x.setSpeed(3), x.setSpeed(1), x.pause(), x.pause(), x.setSpeed(2), x.setSpeed(4), x.setSpeed(1), x.play(), x.play(), x.pause()];
        return { r, ev: window.__EV.slice(k).map(e => `${e.type}:${JSON.stringify(e.detail)}`) }; });
      check(pp.every(s => J(s.er) === J(s.ea) && J(s.btn) === J(s.btnA)) && J(pp.map(s => s.er.map(e => J(e.detail)).join())) === J(['{"running":true}', '{"running":false}', '{"speed":2}', '{"speed":4}', '{"speed":1}'])
        && J(pp.map(s => s.st)) === J([[true, 1], [false, 1], [false, 2], [false, 4], [false, 1]])
        && J(extra.r) === J([false, 1, false, false, 2, 4, 1, true, true, false]) && J(extra.ev) === J(['speed:{"speed":2}', 'speed:{"speed":4}', 'speed:{"speed":1}', 'play-pause:{"running":true}', 'play-pause:{"running":false}']),
        `${B} B4 · play / pause and 1× → 2× → 4× → 1× take the same path from the buttons and the adapter (same running / speed, button text and aria-pressed, bloom:play-pause / bloom:speed); setSpeed accepts only 1 / 2 / 4; a no-op (pause while paused, play while playing, the same speed) changes nothing and fires nothing`,
        `${pp.map(s => `${s.btn[0][0]}|${s.btn[1]}`).join(" → ")} · adapter ${J(extra.r)} → ${extra.ev.length} events`);

      // B5 · the win through the real path: bloom:win, the report and its anchors (training: TRAINING COMPLETE)
      const win = await A.evaluate(() => { const x = BLOOM_RUN_UI.adapter.actions; BLOOM_API.addBiomass(5000); const b = [x.buy("humid")]; let n = 0; while (!sim.won && n < 12000) { BLOOM_API.advance(200); n += 200; }
        return { b, won: sim.won, ev: window.__EV.filter(e => e.type === "win").map(e => e.detail), run: BLOOM_RUN_UI.adapter.run(), title: document.querySelector("#report h2") && document.querySelector("#report h2").textContent }; });
      await frames(A, 2);
      const anchorsAfterWin = await A.evaluate(() => ["report", "report-continue", "run-actions", "action-restartTraining", "action-mainMenu"].filter(a => !document.querySelector(`[data-tutorial="${a}"]`)));
      check(win.won && win.b[0] && win.ev.length === 1 && win.ev[0].training === true && win.ev[0].planetId === "training_grounds" && win.run.won && /TRAINING COMPLETE/.test(win.title) && !anchorsAfterWin.length,
        `${B} B5 · an adapter purchase drives the same sim to the win: bloom:win { coverage, ticks, planetId, training } once, run().won, the report (TRAINING COMPLETE) with report / report-continue / run-actions anchors`,
        `${J(win.ev[0] || null)} · "${win.title}"${anchorsAfterWin.length ? " · MISSING " + anchorsAfterWin.join(", ") : ""}`);
      await R.context().close(); await A.context().close(); }

    // B6 · every 028D1 data-tutorial anchor resolves in the current shell (training: its ☰ menu; play=1: the play actions)
    { const p = await open("?training=1"); await frames(p, 3);
      const miss = await p.evaluate(() => { const ids = BLOOM_RUN_UI.adapter.upgrades().flatMap(b => b.items.map(u => "upgrade-" + u.id));
        const all = ["biomass", "coverage", "sky", "play-pause", "speed", "run-menu", "action-restartTraining", "action-skipTraining", "action-mainMenu", "map", "inspect", "readout", "limiting-factor",
          "colony-status", "raw-signals", "growth-focus", "focus-balanced", "focus-roots", "focus-leaves", "focus-seeds", "local-upgrade", "local-rootNetwork", "local-leafCanopy", "local-seedReserve",
          "upgrades", "board-spread", "board-adapt", "board-terraform", "message-log", "report", ...ids];
        return { miss: all.filter(a => !document.querySelector(`[data-tutorial="${a}"]`)), n: all.length }; });
      const q = await open("?play=1"), missPlay = await q.evaluate(() => ["action-playAgain", "action-changePlanet", "action-home", "run-menu"].filter(a => !document.querySelector(`[data-tutorial="${a}"]`)));
      check(!miss.miss.length && !missPlay.length, `${B} B6 · every 028D1 data-tutorial anchor resolves in the current shell (header, map, inspect, focus / local, boards, every offered upgrade, footer, report; training and play=1 run menus)`,
        `${miss.n} training anchors + 4 play anchors${miss.miss.concat(missPlay).length ? " · MISSING " + miss.miss.concat(missPlay).join(", ") : ""}`);
      await p.context().close(); await q.context().close(); }

    // B7 · subscribe(): batched notices from the real events and the page's own invalidations; ticks at most once a frame, none paused
    { const p = await open(""); await sleep(400);
      const s = await p.evaluate(async () => { const A = BLOOM_RUN_UI.adapter, got = []; const off = A.subscribe(c => got.push(c)); A.subscribe(() => { throw new Error("__throw"); });
        const until = ms => new Promise(r => setTimeout(r, ms)); const f0 = window.__frames, t0 = sim.ticks; await until(1000);
        const running = { frames: window.__frames - f0, ticks: sim.ticks - t0, notices: got.filter(c => c.reasons.includes("tick")).length, maxPerFrame: 1 };
        A.actions.pause(); await until(50); const k = got.length, tk = sim.ticks; await until(800); const paused = { notices: got.length - k, ticks: sim.ticks - tk };
        const k2 = got.length; A.actions.setSpeed(2); A.actions.setSpeed(4); A.actions.selectRegion(1); await Promise.resolve(); await until(0);
        const batch = got.slice(k2); const k3 = got.length; document.querySelector('#shop button.buy').dispatchEvent(new MouseEvent("mouseenter")); document.querySelector('#shop button.buy').dispatchEvent(new MouseEvent("mouseleave")); await until(0);
        const hover = got.slice(k3).flatMap(c => c.reasons); off(); const n1 = got.length; A.actions.setSpeed(1); await until(30); const afterOff = got.length - n1;
        const lastRev = got[got.length - 1].revision, mono = got.every((c, i) => !i || c.revision > got[i - 1].revision);
        return { running, paused, batch: batch.map(c => ({ reasons: c.reasons, events: c.events.map(e => e.type + ":" + JSON.stringify(e.detail)) })), hover, lastRev, rev: A.revision, mono, frozen: Object.isFrozen(got[0]), afterOff }; });
      const b = s.batch, okBatch = b.length === 1 && J(b[0].events.slice(0, 2)) === J(['speed:{"speed":2}', 'speed:{"speed":4}']) && b[0].events[2].startsWith("region-select:");
      check(s.running.notices > 0 && s.running.notices <= s.running.frames && s.paused.notices === 0 && s.paused.ticks === 0 && okBatch && s.hover.includes("upgrade-preview") && s.hover.includes("preview-clear")
        && s.mono && s.frozen && s.rev > s.lastRev && s.afterOff === 0 && !p.errs.length,
        `${B} B7 · subscribe(): one batched notice per microtask carrying the real bloom:* events (copied detail); a "tick" at most once per frame while running and nothing while paused; hover / leave notify too; a throwing subscriber does not stop the run; unsubscribe works`,
        `running 1 s: ${s.running.frames} frames, ${s.running.ticks} ticks, ${s.running.notices} tick notices · paused 0.8 s: ${s.paused.notices} notices · batch ${J(b.map(c => c.reasons))} · hover ${J([...new Set(s.hover)])}${p.errs.length ? " · ERR " + p.errs.join(" | ") : ""}`);
      await p.context().close(); }

    // B8 · BLOOM_API and BLOOM_RUN_UI.placeBubble unchanged; actions refuse bad input without side effects; file:// boots
    { const p = await open("?training=1"); await frames(p, 2);
      const r = await p.evaluate(() => { const A = BLOOM_RUN_UI.adapter, x = A.actions, k = window.__EV.length, h0 = __hash();
        const bad = [x.buy("nope"), x.selectRegion("nowhere"), x.selectRegion(99), x.setGrowthFocus("landing_meadow", "petals"), x.setGrowthFocus("chill_hollow", "roots"), x.buyLocalUpgrade("landing_meadow", "nope"),
          x.collectBubble(-5), x.preview("nope"), x.placeBubble("salt_pan")];
        const quiet = window.__EV.slice(k).filter(e => e.type !== "region-select").length === 0 && __hash() === h0;
        const t = BLOOM_RUN_UI.placeBubble(), list = A.bubbles();
        return { keys: Object.keys(BLOOM_API), state: Object.keys(BLOOM_API.state()), bad, quiet, t, list, ev: window.__EV.slice(k).map(e => e.type),
          frozen: Object.isFrozen(A) && Object.isFrozen(A.actions), api: A.api, events: A.events, geom: BLOOM_API.geometry().centers.length === sim.map.SC }; });
      const KEYS = ["buy", "sim", "advance", "coverage", "addBiomass", "state", "evalSection", "run", "geometry", "livingByMass", "crossing", "colony", "colonies", "crossAnims", "pressure", "competition", "climate", "climatePreview", "tilePixel"];
      const STATE = ["biomass", "ticks", "won", "running", "speed", "genome", "tf", "sky", "coverage", "vigor", "secFit", "sections"];
      const f = await open("", FILE), fr = await f.evaluate(() => ({ api: !!BLOOM_RUN_UI.adapter, run: BLOOM_RUN_UI.adapter.run().planetId }));
      check(J(r.keys) === J(KEYS) && J(r.state) === J(STATE) && r.geom && J(r.bad) === J([false, false, false, false, false, false, false, null, -1]) && r.quiet && r.t >= 0 && r.list.length === 1 && r.list[0].tile === r.t
        && r.list[0].region.id === "landing_meadow" && r.frozen && r.api === 1 && J(r.events) === J(EVTS.map(t => "bloom:" + t)) && fr.api && fr.run === "first_bloom" && !p.errs.length && !f.errs.length,
        `${B} B8 · BLOOM_API keeps its 19 members and state() its 12 fields; BLOOM_RUN_UI.placeBubble still places on the origin (adapter.bubbles() sees it); the adapter is frozen and refuses unknown ids / modes / regions without touching the sim or firing anything; the page boots with the adapter over file:// too`,
        `bad-input results ${J(r.bad)} · placed tile ${r.t} · file:// ${fr.run}${p.errs.concat(f.errs).length ? " · ERR " + p.errs.concat(f.errs).join(" | ") : ""}`);
      await p.context().close(); await f.context().close(); }

    await browser.close();
  }
  server.close();
  console.log(fails ? `\n${fails} check(s) FAILED  (${((Date.now() - t0) / 1000).toFixed(1)} s)` : `\nALL CHECKS PASS  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
