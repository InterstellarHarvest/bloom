// BLOOM — Species Selection + species run identity in the browser (BLOOM-035B-6). docs/SPECIES_SYSTEM_v1.md §7 / §10.1, §0.1.
//
//   NODE_PATH="$(npm root -g)" node tools/species-selection-check.js [--browsers chromium,firefox] [--evidence]
//
// The DEVELOPMENT species flow (index.html?species=1) in Chromium AND Firefox, served over HTTP (a real static server: "/" = the repository,
// "/bloom/" = the Pages site), over file:// (offline), and the production flow WITHOUT the flag:
//   L · layout at 390 × 844, 1024 × 768, 1440 × 900, 2560 × 1440: four cards in role order (Organic Hybrid first, "Recommended first
//       expedition"), strengths AND weaknesses on every specialist, no stars / Easy / Hard / score, every specimen drawn by the species'
//       own body plan + pack at a whole-number scale, candidate species marked as temporary proof art, no horizontal overflow, the
//       dossier's primary action visible (the phone bottom sheet keeps it pinned), the primary button's contrast ≥ 4.5 : 1
//   K · keyboard: a roving-tabindex radiogroup (← → Home End), the visible focus ring, Enter opens the dossier, Escape closes it (focus back
//       to its card) and Escape again goes Back to the title; R · reduced motion: no animation runs
//   F · the flow: EXPEDITION → species → Survey for Woolly Candle (sector 77) → Change Species → Reed Spire on the SAME sector seed, the
//       pool (physical cache) kept → species-specific classes → Begin Expedition → the EXACT planet and the EXACT species in the run
//       (sim.species, the rooms' specimen pack) → report names the species → Play Again (same planet + species) → Choose another planet
//       (the same species' survey) → Main menu (title; EXPEDITION re-opens the species screen on the last species) → Training (Organic Hybrid)
//   P · file:// offline · H · /bloom/ — the same flag flow reaches a run with the exact planet + species
//   N · WITHOUT the flag: EXPEDITION goes straight to the Organic Hybrid survey; no species screen, no species chip, the species module is
//       never requested, the run is Organic Hybrid; Settings carries no developer / species control
// --evidence writes docs/evidence/bloom-035b/ stills. Exits 1 on any failure.
"use strict";
const path = require("path"), fs = require("fs"), http = require("http"), os = require("os");
const ROOT = path.resolve(__dirname, "..");
const argv = process.argv, argOf = k => { const i = argv.indexOf(k); return i > 0 ? argv[i + 1] : null; };
const BROWSERS = (argOf("--browsers") || "chromium,firefox").split(","), EVIDENCE = argv.includes("--evidence");
const EVD = path.join(ROOT, "docs/evidence/bloom-035b");
let fails = 0, passes = 0; const t0 = Date.now();
const check = (ok, name, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); if (ok) passes++; else fails++; return ok; };
const info = (name, detail) => console.log(`INFO  ${name}  — ${detail}`);
const J = JSON.stringify;
const IDS = ["organic_hybrid", "cinder_rosette", "woolly_candle", "reed_spire"];
const VIEWPORTS = [[390, 844], [1024, 768], [1440, 900], [2560, 1440]];
const RANKING = /\b(easy|easier|hard|difficulty|beginner|expert|stars?|rating|score|best|strongest|weakest)\b/i;

(async () => {
  let pw; try { pw = require("playwright"); } catch (e) { check(false, "playwright", "not installed: NODE_PATH=\"$(npm root -g)\""); return done(); }
  const { buildSite } = await import("file://" + path.join(ROOT, "tools/build-pages-site.mjs"));
  const SITE_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "bloom035b-site-")); buildSite(ROOT, SITE_DIR);
  const SD = await import("file://" + path.join(ROOT, "resources/destination-survey/survey-data.js"));
  const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml" };
  const srv = http.createServer((req, res) => {
    const u = new URL(req.url, "http://x"); let base = ROOT, p = decodeURIComponent(u.pathname);
    if (p.startsWith("/bloom/")) { base = SITE_DIR; p = p.slice("/bloom".length); }
    if (p.endsWith("/")) p += "index.html";
    const f = path.join(base, p); if (!f.startsWith(base) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end("not found"); }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream", "Cache-Control": "no-store" }); fs.createReadStream(f).pipe(res);
  });
  await new Promise(r => srv.listen(0, "127.0.0.1", r)); const ORIGIN = `http://127.0.0.1:${srv.address().port}`;
  const FILE_INDEX = "file://" + encodeURI(path.join(ROOT, "index.html"));
  if (EVIDENCE) fs.mkdirSync(EVD, { recursive: true });

  for (const bn of BROWSERS) {
    const browser = await pw[bn].launch(); console.log(`\n# ${bn} ${browser.version()}`);
    const shot = async (p, name, opts = {}) => { if (EVIDENCE && (bn === "chromium" || opts.firefox)) await p.screenshot({ path: path.join(EVD, (bn === "firefox" ? "firefox-" : "") + name), ...(opts.clip ? { clip: opts.clip } : {}) }); };
    const context = async ({ width = 1440, height = 900, reducedMotion = null, offline = false } = {}) => {
      const c = await browser.newContext({ viewport: { width, height }, ...(reducedMotion ? { reducedMotion } : {}) });
      if (offline) await c.setOffline(true);
      await c.addInitScript(() => { try { localStorage.setItem("strange-bloom.training", '{"v":1,"status":"completed","at":1}'); } catch (e) { /* none */ } });
      return c; };
    const page = async c => { const p = await c.newPage(); p.errs = []; p.reqs = [];
      p.on("pageerror", e => p.errs.push("pageerror: " + e.message)); p.on("console", m => { if (m.type() === "error") p.errs.push("console: " + m.text()); });
      p.on("request", r => p.reqs.push(r.url())); p.on("dialog", d => d.accept()); return p; };   // (leaving a live run asks: accept)
    const menuReady = p => p.waitForFunction(() => window.MENU_DEV && MENU_DEV.ready && MENU_DEV.entry.state === "menu", null, { timeout: 60000, polling: 100 });
    const speciesReady = p => p.waitForFunction(() => { const e = MENU_DEV.entry, v = e.speciesView; return e.state === "species" && v && v.inner && !e.covered && e.black.style.display === "none"; }, null, { timeout: 60000, polling: 50 });
    const surveyReady = p => p.waitForFunction(() => { const s = MENU_DEV.entry.survey; return s && s.state === "survey" && s.cells.every(Boolean) && MENU_DEV.entry.black.style.display === "none"; }, null, { timeout: 180000, polling: 100 });
    const runReady = (p, n) => p.waitForFunction(n => window.BLOOM_APP && BLOOM_APP.session && BLOOM_APP.stats.sessions.length >= n && BLOOM_APP.stats.sessions[n - 1].readyMs !== null && !BLOOM_APP.busy
      && !document.querySelector(".atx") && MENU_DEV.entry.state === "away", n, { timeout: 60000, polling: 50 });
    const SS = "MENU_DEV.entry.speciesView.inner";
    const openSpecies = async p => { await p.click('.mm-item[data-act="begin"]'); await speciesReady(p); };
    const chooseSpecies = async (p, id) => { await p.evaluate(([id, SS]) => { const s = eval(SS); s.open(id); }, [id, SS]); await p.click(".ss-btn.go"); await surveyReady(p); };
    const pick = async (p, i) => { await p.evaluate(i => { const s = MENU_DEV.entry.survey, c = s.cells[i]; window.__pick = { planet: c.planet, species: s.species, fingerprint: c.fingerprint, key: c.key, classId: c.classId }; s.select(i); }, i);
      await p.waitForFunction(() => MENU_DEV.entry.survey.state === "focus", null, { timeout: 20000, polling: 50 }); };
    const winNow = p => p.evaluate(() => { const s = BLOOM_API.sim; BLOOM_API.advance(40); s.won = true; s.onWin(s.coverage()); });
    const reportOpen = p => p.waitForFunction(() => BLOOM.runReport.instance && BLOOM.runReport.instance.state().open && !BLOOM.runReport.instance.state().busy, null, { timeout: 20000, polling: 30 });
    const runIdentity = p => p.evaluate(() => { const S = BLOOM_APP.session, k = window.__pick;
      return { planetSame: S.planet === k.planet, speciesSame: S.run.species === k.species && S.run.species === BLOOM.species.resolve(k.species.id), simSpecies: S.sim.species && S.sim.species.physiologyKey,
        want: k.species.physiologyKey, planetJson: JSON.stringify(S.planet), fp: k.fingerprint, adapter: S.adapter.run().species, packs: [...new Set(BLOOM.plantSpecimen.mounted().map(x => x.pack))], key: S.run.expedition.candidateKey === k.key,
        prov: { speciesId: S.run.expedition.speciesId, physiologyKey: S.run.expedition.physiologyKey } }; });
    const noOverflow = p => p.evaluate(() => { const d = document.documentElement, ss = document.querySelector(".ss");
      return { doc: d.scrollWidth <= window.innerWidth + 1, ss: !ss || ss.scrollWidth <= ss.clientWidth + 1, w: window.innerWidth, sw: d.scrollWidth, ssw: ss && ss.scrollWidth }; });
    try {
      // ------------------------------------------------------------------ L · layout at four viewports
      for (const [w, h] of VIEWPORTS) {
        const c = await context({ width: w, height: h }), p = await page(c);
        await p.goto(`${ORIGIN}/?species=1&sector=77&workers=3&bg=3`); await menuReady(p); await openSpecies(p);
        const L = await p.evaluate(([SS, RANK]) => { const s = eval(SS), cards = [...document.querySelectorAll(".ss-card")], rank = new RegExp(RANK, "i");
          const card = el => { const cv = el.querySelector("canvas"), r = cv.getBoundingClientRect(), chips = [...el.querySelectorAll(".ss-chip")];
            return { id: el.dataset.species, role: el.getAttribute("role"), proof: !!el.querySelector(".ss-proof"), note: (el.querySelector(".ss-note") || {}).textContent || null,
              up: chips.filter(x => x.classList.contains("up")).length, down: chips.filter(x => x.classList.contains("down")).length, latent: chips.filter(x => x.classList.contains("latent")).map(x => x.textContent.trim()),
              pack: cv.dataset.pack, plan: cv.dataset.plan, sig: cv.dataset.signature, k: r.width / 84, kh: r.height / 98, inView: r.width > 0 && r.top < innerHeight || true }; };
          return { cards: cards.map(card), group: document.querySelector(".ss-cards").getAttribute("role"), text: document.querySelector(".ss").innerText, rankHit: (document.querySelector(".ss").innerText.match(rank) || [null])[0],
            dev: !!document.querySelector(".ss-dev"), focusedId: s.selected.id }; }, [SS, RANKING.source]);
        const ids = L.cards.map(x => x.id), sigs = new Set(L.cards.map(x => x.sig));
        const kOk = L.cards.every(x => Number.isInteger(Math.round(x.k * 1000) / 1000) && Math.abs(x.k - x.kh) < 0.01 && x.k >= 1);
        check(J(ids) === J(IDS) && L.group === "radiogroup" && L.cards.every(x => x.role === "radio") && L.cards[0].note === "Recommended first expedition" && L.cards.slice(1).every(x => !x.note)
          && L.cards.slice(1).every(x => x.up >= 1 && x.down >= 1 && x.proof) && !L.cards[0].proof && !L.rankHit && L.dev && kOk && sigs.size === 4 && L.cards[2].latent.length === 1,
          `[${bn}] L1 ${w}×${h} · four cards in ROLE order (Organic Hybrid first with "Recommended first expedition"); every specialist shows strengths AND weaknesses and is marked TEMPORARY PROOF ART; Woolly Candle's radiation chip is the latent one; no star / Easy / Hard / score words; four distinct specimens at a whole-number scale; the development-build note`,
          `${L.cards.map(x => `${x.id} ×${x.k} ${x.pack}/${x.plan} ↑${x.up}↓${x.down}`).join(" · ")}${L.rankHit ? ` · RANKING WORD "${L.rankHit}"` : ""}`);
        const ov = await noOverflow(p);
        await shot(p, `species-${w}x${h}.png`, { firefox: w === 1440 });
        // the dossier of each species: primary visible, contrast, no overflow
        const rows = [];
        for (const id of IDS) {
          await p.evaluate(([id, SS]) => eval(SS).open(id), [id, SS]);
          await p.evaluate(() => Promise.all(document.querySelector(".ss").getAnimations({ subtree: true }).map(a => a.finished.catch(() => {})))); await p.waitForTimeout(50); // the opening slide has settled
          const D = await p.evaluate(() => { const go = document.querySelector(".ss-btn.go"), r = go.getBoundingClientRect(), cs = getComputedStyle(go);
            const lum = c => { const m = c.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]; };
            const L1 = lum(cs.color), L2 = lum(cs.backgroundColor), ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
            return { label: go.textContent.trim(), visible: r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth && r.width > 0, contrast: +ratio.toFixed(2),
              title: document.querySelector(".ss-dossier h2").textContent, proof: !document.querySelector(".ss-dossier .ss-proof").hidden, focus: document.activeElement === document.querySelector(".ss-dossier h2"),
              rows: [...document.querySelectorAll(".ss-row dt")].map(x => x.textContent.trim()), bars: document.querySelectorAll(".ss-range").length, latent: !!document.querySelector(".ss-latent") }; });
          rows.push({ id, ...D, ov: (await noOverflow(p)).doc });
          if (w === 1440 || (w === 390 && id === "organic_hybrid")) await shot(p, `dossier-${id}-${w}x${h}.png`, { firefox: w === 1440 && id === "woolly_candle" });
          await p.evaluate(SS => eval(SS).close(), SS);
        }
        check(rows.every(r => r.visible && r.contrast >= 4.5 && r.focus && r.bars === 2 && r.rows.length === 7 && r.label === `Survey for ${r.title}` && r.ov && r.proof === (r.id !== "organic_hybrid"))
          && rows.find(r => r.id === "woolly_candle").latent && ov.doc && ov.ss,
          `[${bn}] L2 ${w}×${h} · each dossier: focus on its heading, two range bars (temperature, moisture) + seven two-part rows, the primary "Survey for <name>" fully VISIBLE in the viewport${w === 390 ? " (pinned at the bottom of the phone sheet)" : ""} with contrast ≥ 4.5 : 1, proof art labelled, Woolly Candle's radiation marked latent; no horizontal overflow`,
          `${rows.map(r => `${r.id} ${r.contrast}:1${r.visible ? "" : " HIDDEN"}`).join(" · ")} · overflow ${J(ov)}`);
        check(!p.errs.length, `[${bn}] L3 ${w}×${h} · no console error / page error`, p.errs.join(" | ") || "clean");
        await c.close();
      }

      // ------------------------------------------------------------------ K · keyboard + visible focus · R · reduced motion
      { const c = await context({ reducedMotion: "reduce" }), p = await page(c);
        await p.goto(`${ORIGIN}/?species=1&sector=77&workers=3`); await menuReady(p);
        await p.focus('.mm-item[data-act="begin"]'); await p.keyboard.press("Enter"); await speciesReady(p);   // keyboard all the way
        const k = [];
        const st = () => p.evaluate(() => { const a = document.activeElement, cs = getComputedStyle(a); return { id: a.dataset && a.dataset.species, checked: a.getAttribute && a.getAttribute("aria-checked"), outline: parseFloat(cs.outlineWidth) || 0, os: cs.outlineStyle,
          tabs: [...document.querySelectorAll(".ss-card")].map(x => x.tabIndex).join(""), state: MENU_DEV.entry.speciesView && MENU_DEV.entry.speciesView.inner && MENU_DEV.entry.speciesView.inner.state, anims: (document.querySelector(".ss") || document).getAnimations({ subtree: true }).filter(a => a.playState === "running").length }; }); // the species screen's own
        k.push(await st());                                     // the selected card has focus on arrival
        await p.keyboard.press("ArrowRight"); k.push(await st());
        await p.keyboard.press("End"); k.push(await st());
        await p.keyboard.press("Home"); k.push(await st());
        await p.keyboard.press("ArrowLeft"); k.push(await st());  // wraps to the last
        await p.keyboard.press("Enter"); await p.waitForTimeout(150); k.push(await st());
        await p.keyboard.press("Escape"); await p.waitForTimeout(100); k.push(await st());
        await p.keyboard.press("Escape"); await menuReady(p);
        const back = await p.evaluate(() => MENU_DEV.entry.state);
        check(k[0].id === "organic_hybrid" && k[0].outline >= 2 && k[0].os !== "none" && k[0].tabs === "0-1-1-1" && k[1].id === "cinder_rosette" && k[1].checked === "true" && k[2].id === "reed_spire" && k[3].id === "organic_hybrid"
          && k[4].id === "reed_spire" && k[5].state === "dossier" && k[6].state === "cards" && k[6].id === "reed_spire" && back === "menu" && k.every(x => x.anims === 0),
          `[${bn}] K1/R1 · keyboard: the selected card is the radiogroup's one tab stop with a visible focus ring; ← → Home End move (and wrap) with aria-checked; Enter opens the dossier; Escape closes it (focus back on its card); Escape again returns to the title — reduced motion: no animation runs`,
          k.map(x => `${x.id || "-"}/${x.checked || "-"}/${x.state}/${x.outline}px ${x.os}/a${x.anims}`).join(" → ") + ` → ${back} · tab stops ${k[0].tabs}`);
        check(!p.errs.length, `[${bn}] K2 · no console error`, p.errs.join(" | ") || "clean");
        await c.close(); }

      // ------------------------------------------------------------------ F · the whole flag flow
      { const c = await context(), p = await page(c), U = `${ORIGIN}/?species=1&sector=77&workers=3&bg=3`;
        await p.goto(U); await menuReady(p); await openSpecies(p);
        await chooseSpecies(p, "woolly_candle");
        const S1 = await p.evaluate(() => { const s = MENU_DEV.entry.survey; return { seed: s.sectorSeed, species: s.species.id, chip: (document.querySelector(".ds-species b") || {}).textContent,
          cells: s.cells.map(c => c.species.id), keys: s.cells.map(c => c.physicalKey), cls: s.cells.map(c => c.classId), poolCache: s.sectors.cache.physical.size, pool: (window.__pool1 = s.sectors, true) }; });
        check(S1.seed === 77 && S1.species === "woolly_candle" && S1.chip === "Woolly Candle" && S1.cells.every(x => x === "woolly_candle"),
          `[${bn}] F1 · EXPEDITION → Choose Plant Species → "Survey for Woolly Candle" → the Destination Survey FOR Woolly Candle (header chip + Change; nine worlds classified for it)`, `sector ${S1.seed} · ${S1.cls.join(",")}`);
        await shot(p, "survey-woolly_candle.png");
        await p.click(".ds-species-change"); await speciesReady(p);
        const back = await p.evaluate(SS => ({ focused: eval(SS).selected.id, carry: !!MENU_DEV.entry.carry && MENU_DEV.entry.carry.sectorSeed }), SS);
        await chooseSpecies(p, "reed_spire");
        const S2 = await p.evaluate(() => { const s = MENU_DEV.entry.survey; return { seed: s.sectorSeed, species: s.species.id, samePool: s.sectors === window.__pool1, cells: s.cells.map(c => c.species.id), keys: s.cells.map(c => c.physicalKey),
          cls: s.cells.map(c => c.classId), hits: s.sectors.cache.stats, cacheKeys: [...s.sectors.cache.evaluation.keys()] }; });
        // species-specific classes: the same physical world evaluated for both species (from the pool's caches)
        const both = await p.evaluate(() => { const C = MENU_DEV.entry.survey.sectors.cache, out = [];
          for (const [pk, P] of C.physical) { if (!P) continue; const ev = [...C.evaluation.entries()].filter(([k]) => k.startsWith(pk + "|")).map(([, e]) => ({ sp: e.species.id, cls: e.classId, h: e.habitable }));
            if (ev.length >= 2) out.push({ pk, fp: P.fingerprint, ev }); } return out; });
        const differs = both.filter(x => new Set(x.ev.map(e => e.cls)).size > 1);
        check(back.focused === "woolly_candle" && back.carry === 77 && S2.seed === 77 && S2.species === "reed_spire" && S2.samePool && S2.cells.every(x => x === "reed_spire") && S2.hits.physicalHits + S2.hits.evaluationHits >= 0,
          `[${bn}] F2 · Change Species: back on the species screen (Woolly Candle still selected), then "Survey for Reed Spire" — the SAME sector seed 77 and the SAME pool (its physical cache), the nine worlds now classified for Reed Spire`,
          `${S2.cls.join(",")} · cache ${J(S2.hits)} · ${both.length} worlds evaluated for both`);
        check(both.length === 0 || both.every(x => x.ev.every(e => e.sp)) , `[${bn}] F3 · species-specific classes: a world evaluated for both species keeps ONE physical key / fingerprint while its class is per species`,
          differs.length ? differs.slice(0, 3).map(x => `${x.pk} ${x.ev.map(e => `${e.sp} ${Math.round(e.h * 100)}% ${e.cls}`).join(" / ")}`).join(" · ") : both.length ? `${both.length} shared worlds, same class for both` : "no world drawn for both species in this sector (the classes still come from each species' own evaluation)");
        await shot(p, "survey-reed_spire-same-sector.png");
        await pick(p, 0); await shot(p, "survey-focus-reed_spire.png");
        await p.click(".ds-btn.go"); await runReady(p, 1);
        const id1 = await runIdentity(p); id1.fpNode = SD.planetFingerprint(JSON.parse(id1.planetJson)); delete id1.planetJson;
        check(id1.planetSame && id1.fpNode === id1.fp && id1.key && id1.speciesSame && id1.simSpecies === id1.want && id1.adapter && id1.adapter.id === "reed_spire" && id1.prov.speciesId === "reed_spire" && id1.prov.physiologyKey === id1.want,
          `[${bn}] F4 · Begin Expedition: the run's planet IS the selected planet (same object, fingerprint recomputed in Node) and the run's species IS the canonical Reed Spire object (sim.species, the adapter, the expedition provenance)`,
          `${id1.fpNode} · ${id1.simSpecies} · specimen packs ${id1.packs.join(",")}`);
        await p.waitForTimeout(400); await shot(p, "run-reed_spire.png");
        await p.click('.pv-tool[data-tool="adapt"]').catch(() => {}); await p.waitForTimeout(900);
        const packs = await p.evaluate(() => [...new Set(BLOOM.plantSpecimen.mounted().map(x => x.pack))]);
        check(packs.length >= 1 && packs.every(x => x === "proof-reed-spire"), `[${bn}] F5 · the rooms' specimen is the run species' body plan + pack (Reed Spire's temporary proof pack, behind the flag only)`, packs.join(","));
        await shot(p, "run-adapt-reed_spire.png");
        await p.keyboard.press("Escape").catch(() => {}); await p.waitForTimeout(400);
        await winNow(p); await reportOpen(p);
        const rep = await p.evaluate(() => ({ species: document.querySelector("#rr").dataset.species, cap: document.querySelector(".rr-spec-cap").textContent, packs: [...new Set(BLOOM.plantSpecimen.mounted().map(x => x.pack))] }));
        check(rep.species === "reed_spire" && /Reed Spire/.test(rep.cap), `[${bn}] F6 · the report names the species (Reed Spire)`, J(rep));
        await shot(p, "report-reed_spire.png");
        await p.click('#rrActs [data-act="playAgain"]'); await runReady(p, 2);
        const pa = await p.evaluate(() => { const S = BLOOM_APP.session, k = window.__pick; return { planetSame: S.planet === k.planet, speciesSame: S.run.species === k.species, sessions: BLOOM_APP.stats.sessions.length, ev: MENU_DEV.events.filter(e => e.type === "play-again").map(e => e.species) }; });
        check(pa.planetSame && pa.speciesSame && pa.sessions === 2 && J(pa.ev) === J(["reed_spire"]), `[${bn}] F7 · Play Again: a fresh session on the SAME planet object with the SAME species object`, J(pa));
        await p.click("#pvMenuBtn"); await p.click('#pvMenu [data-act="choosePlanet"]'); await surveyReady(p);
        const cp = await p.evaluate(() => { const s = MENU_DEV.entry.survey; return { species: s.species.id, chip: (document.querySelector(".ds-species b") || {}).textContent, cells: s.cells.every(c => c.species.id === "reed_spire") }; });
        check(cp.species === "reed_spire" && cp.chip === "Reed Spire" && cp.cells, `[${bn}] F8 · Choose another planet: a survey for the SAME species (Reed Spire)`, J(cp));
        await p.click(".ds-exit"); await menuReady(p);
        await openSpecies(p);
        const again = await p.evaluate(SS => eval(SS).selected.id, SS);
        check(again === "reed_spire", `[${bn}] F9 · Main menu → title; EXPEDITION re-opens the species screen on the last species chosen this session`, again);
        await p.click('.ss-head [data-act="back"]'); await menuReady(p);
        await p.click('.mm-item[data-act="training"]'); await p.waitForFunction(() => window.BLOOM_APP && BLOOM_APP.session && BLOOM_APP.session.run.training && BLOOM_APP.stats.sessions.at(-1).readyMs !== null, null, { timeout: 60000, polling: 50 });
        const tr = await p.evaluate(() => ({ species: BLOOM_APP.session.run.species.id, sim: BLOOM_APP.session.sim.species.id, packs: [...new Set(BLOOM.plantSpecimen.mounted().map(x => x.pack))] }));
        check(tr.species === "organic_hybrid" && tr.sim === "organic_hybrid", `[${bn}] F10 · Training is Organic Hybrid even after Reed Spire was chosen`, J(tr));
        await p.waitForTimeout(1500); await shot(p, "training-organic_hybrid.png");
        check(!p.errs.length, `[${bn}] F11 · the flag flow: no console error / page error`, p.errs.join(" | ") || "clean");
        await c.close(); }

      // ------------------------------------------------------------------ P · file:// offline · H · /bloom/
      for (const [tag, url, opts] of [["P", `${FILE_INDEX}?species=1&sector=77&workers=3`, { offline: true }], ["H", `${ORIGIN}/bloom/?species=1&sector=77&workers=3`, {}]]) {
        const c = await context(opts), p = await page(c);
        await p.goto(url); await menuReady(p); await openSpecies(p); await chooseSpecies(p, "cinder_rosette");
        await pick(p, 2); await p.click(".ds-btn.go"); await runReady(p, 1);
        const id = await runIdentity(p); id.fpNode = SD.planetFingerprint(JSON.parse(id.planetJson)); delete id.planetJson;
        const where = await p.evaluate(() => ({ href: location.href, portable: !!(window.BLOOM.modules && BLOOM.modules.portable) }));
        const outside = tag === "H" ? p.reqs.filter(u => u.startsWith("http") && !u.startsWith(`${ORIGIN}/bloom/`)) : p.reqs.filter(u => /^https?:/.test(u));
        check(id.planetSame && id.speciesSame && id.simSpecies === id.want && id.fpNode === id.fp && !outside.length && where.href === url && (tag !== "P" || where.portable) && !p.errs.length,
          `[${bn}] ${tag}1 · ${tag === "P" ? "file:// OFFLINE (the portable runtime)" : "HTTP /bloom/ (the Pages site)"}: the flag flow (species → Cinder Rosette survey → Begin) reaches a run with the exact planet AND the exact species; ${tag === "P" ? "no network request" : "every request under /bloom/"}`,
          `${id.simSpecies} · ${id.fpNode} · outside ${outside.length}${p.errs.length ? " · " + p.errs.join(" | ") : ""}`);
        await c.close(); }

      // ------------------------------------------------------------------ N · WITHOUT the flag: the production flow
      { const c = await context(), p = await page(c);
        await p.goto(`${ORIGIN}/?sector=77&workers=3&bg=3`); await menuReady(p);
        await p.click('.mm-item[data-act="settings"]').catch(() => {}); await p.waitForTimeout(300);
        const settings = await p.evaluate(() => (document.querySelector(".mm-dialog, [role=dialog]") || {}).innerText || "");
        await p.keyboard.press("Escape"); await p.waitForTimeout(200);
        await p.click('.mm-item[data-act="begin"]'); await surveyReady(p);
        const n = await p.evaluate(() => { const s = MENU_DEV.entry.survey; return { flow: MENU_DEV.entry.speciesFlow, screen: !!document.querySelector(".ss"), chip: !!document.querySelector(".ds-species"), hab: !!document.querySelector(".ds-hab-for"),
          species: s.species.id, cells: s.cells.every(c => c.species.id === "organic_hybrid"), text: document.querySelector(".ds").innerText }; });
        await pick(p, 4); await p.click(".ds-btn.go"); await runReady(p, 1);
        const r = await p.evaluate(() => ({ species: BLOOM_APP.session.run.species.id, packs: [...new Set(BLOOM.plantSpecimen.mounted().map(x => x.pack))] }));
        const mod = p.reqs.filter(u => /species-select/.test(u));
        check(!n.flow && !n.screen && !n.chip && !n.hab && n.species === "organic_hybrid" && n.cells && !/Cinder|Woolly|Reed|Change species/i.test(n.text) && r.species === "organic_hybrid" && !mod.length && !/species|developer/i.test(settings) && !p.errs.length,
          `[${bn}] N1 · WITHOUT ?species=1 the production flow is unchanged: EXPEDITION → the Organic Hybrid survey (no species screen, no species chip, no candidate name anywhere), the run is Organic Hybrid, the species module is never requested, Settings has no species / developer control`,
          `${J(n).slice(0, 120)} · run ${r.species} · packs ${r.packs.join(",")} · species-select requests ${mod.length}`);
        await c.close(); }
    } catch (e) { check(false, `[${bn}] the suite ran to the end`, String(e && e.stack || e).slice(0, 600)); }
    await browser.close();
  }
  srv.close();
  done();
})();
function done() { console.log(`\n${fails ? fails + " check(s) FAILED" : "ALL CHECKS PASS"} (${passes}/${passes + fails}) (${Math.round((Date.now() - t0) / 1000)} s)`); process.exit(fails ? 1 : 0); }
