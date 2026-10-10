// BLOOM — Guided Training checks (BLOOM-028D2). The 30th regression suite. docs/GUIDED_TRAINING_v1.md §16.
//
//   NODE_PATH="$(npm root -g)" node tools/guided-training-check.js [--browsers chromium,firefox] [--evidence] [--only N,G3,…] [--file]
//
// (BLOOM-031) --file runs every browser group over file:// instead of the static server — the root index.html and demos/demo-run.html
// opened as files, as a player's double-clicked local copy does (the generated portable runtime, docs/PORTABLE_RUNTIME_v1.md), with no
// browser flag. The same checks, the same lessons, the same real input; it cannot be combined with --evidence (028D2's stills stay
// HTTP). tools/portable-runtime-check.js runs it as a child.
//
// Node (production modules only): the accepted starting point (8f4c273) and the scope against it; the paused c23815e 028D2 worktree
// byte-for-byte untouched (its status / diff / untracked files fingerprinted at the start of this milestone) and not imported wholesale;
// the thirteen lessons in the locked order with their copy (1–3 sentences, the goal from the REAL threshold — never a stale 60 %);
// the director against a scripted adapter: outcome-only advancement (a frozen state never advances however long it is polled),
// reconciliation of every off-script route (Cold bought at the landing, Warm the Sky, an auto-collected bubble, any Spread upgrade, any
// focus, any local upgrade, Drought instead of Humidify, Salt Handling), the run's own win as the only end, a monotonic index; the
// callout placement rule (inside the viewport, off its target, sliding past keep-clear controls, docked below 900 px); the anti-cheat
// source rule (no BLOOM_API, no adapter action, no Biomass write in any coach file; BLOOM_RUN_UI.placeBubble is the one hook); the ten
// bloom:* dispatch sites and detail keys identical to 8f4c273; the training config / Training Grounds / engine / content byte-identical;
// BLOOM_RUN_UI additive only; the anchor set unchanged and the coach's own markers namespaced.
// Browser (a static server on 127.0.0.1; Chromium; Firefox for the main path, Skip and one viewport), every lesson driven by REAL
// input — mouse clicks / hovers on the very controls the coach resolved (and the keyboard in G6); BLOOM_API is used by this suite only
// to fast-forward time (advance) and to read, never to act for the player:
//   G1 no coach on First Bloom, an authored planet= run, a generated run, a scenario run, an expedition run, ?ui=legacy training
//   G2 training mounts the coach: paused, tick 0, 13 lessons, the real 65 % goal, aria-live, Skip Tutorial, the first focus
//   G3 the taught route end to end (Cold · Seed Output · Leaves · Root Network · Humidify · Salt Pan · the win): each lesson's target is
//      the real control, clickable through the ring, never under the card; the outcomes, events, ticks and fitness for the proof; the
//      coach gone at the win; TRAINING COMPLETE with Begin Expedition · Restart training · Main menu (no Keep playing); "completed"
//   G4 the alternate route (Warm the Sky · Early Maturity · Roots on Green Verge · Seed Reserve · Drought; the bubble left to collect
//      itself) — coherent acknowledgements, never stuck, a real win
//   G5 off-script / early: Cold bought paused at the landing, a local upgrade and a focus before their lessons → no deadlock, no
//      "buy what you own", monotonic; Restart → step 1, tick 0
//   G6 the keyboard alone: Play, the map (arrows + Enter), the Adapt room by Tab, a focus preview, Enter to buy
//   G7 Skip: the coach's Skip Tutorial and the menu's Skip training open the SAME production dialog; Keep training / Escape keep the
//      lesson and record nothing; confirming records "skipped" and returns to the title through the black; Restart / Main menu record nothing
//   G8 Begin Expedition: the training fade, the title, the Destination Survey at once (begin=1 consumed), no world packed or run
//   G9 the title: Recommended with no record, gone after skipped / completed; the first BEGIN EXPEDITION's one dialog (never auto-training);
//      Start Training (~5 min) → the training run, nothing recorded; Go to Expedition → "skipped" → the survey on the prefetched sector
//   G10 the callout at 1024×768 · 1280×800 · 1440×900 · 860×700 (docked) · Firefox 1280×800: inside the viewport, off the target, no
//      horizontal scroll; re-placed live on resize (map geometry tracked); reduced motion (Settings and OS): no pulse / glide / lift
//   G11 disposal: unmount / remount leaves no bloom:* / input listener, interval or frame loop behind
//   G12 every production anchor resolves once with the coach mounted; the ten events' detail keys at runtime; speed 1× / 2× / 4× real;
//      no external request, console error or unhandled rejection anywhere
// --evidence writes docs/evidence/bloom-028d2/ (stills + guided-training-proof.json). Exits 1 on any failure.
"use strict";
const path = require("path"), fs = require("fs"), http = require("http"), cp = require("child_process"), crypto = require("crypto"), vm = require("vm");
const ROOT = path.resolve(__dirname, "..");
for (const f of ["content/config.js", "content/traits.js", "planets/first_bloom.js", "planets/training_grounds.js", "content/archetypes.js", "content/scenarios.js",
  "content/play.js", "content/training.js", "resources/bloom-sim.js", "resources/bloom-gen.js", "resources/bloom-validate.js", "resources/bloom-witness.js",
  "resources/bloom-archetype.js", "resources/bloom-scenario.js", "resources/bloom-play.js"]) require(path.join(ROOT, f));
const D = BLOOM_DATA, J = JSON.stringify, read = f => fs.readFileSync(path.join(ROOT, f), "utf8");
const argv = process.argv, argOf = k => { const i = argv.indexOf(k); return i > 0 ? argv[i + 1] : null; };
const BROWSERS = (argOf("--browsers") || "chromium,firefox").split(","), EVIDENCE = argv.includes("--evidence"), ONLY = argOf("--only") ? argOf("--only").split(",") : null;
const FILE_MODE = argv.includes("--file"); // (BLOOM-031)
if (FILE_MODE && EVIDENCE) { console.error("--file cannot be combined with --evidence (the BLOOM-028D2 evidence is the HTTP run)"); process.exit(2); }
const want = g => !ONLY || ONLY.includes(g);
const EVD = path.join(ROOT, "docs/evidence/bloom-028d2");
let fails = 0, passes = 0; const t0 = Date.now(), results = [];
const check = (ok, name, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); if (ok) passes++; else fails++; results.push({ ok: !!ok, name }); };
const info = (name, detail) => console.log(`INFO  ${name}  — ${detail}`);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const git = (a, cwd = ROOT) => cp.execSync(`git ${a}`, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 << 20 }).trim();
const sha256 = b => crypto.createHash("sha256").update(b).digest("hex");

// the accepted starting point (BLOOM-029F final) and the paused old 028D2 draft's fingerprint, recorded before this milestone touched anything
const BASE_SHA = "8f4c273b2baedab5739cdfc28478366c50ee3422";
// (BLOOM-030) this suite's provenance / scope checks (N1, N8, N9, N10) are bounded by 028D2's own final commit once later milestones
// build on it (BLOOM-030 packages the root title and retargets the run page's title links by design), exactly as the 029B–029F suites
// bound theirs (END_SHA); at 726f74d itself the working tree is checked as before
const END_SHA = "726f74d5f03200ed5ced730533f88a285494dbf4";
const AT_END = (() => { try { return git(`merge-base --is-ancestor ${END_SHA} HEAD`) === "" && git("rev-parse HEAD") !== END_SHA; } catch { return false; } })();
const TIP = AT_END ? END_SHA : "HEAD", RANGE = AT_END ? `${BASE_SHA} ${END_SHA}` : BASE_SHA;
const hashAt = f => AT_END ? git(`rev-parse ${END_SHA}:${f}`) : git(`hash-object "${f}"`), readAt = f => AT_END ? git(`show ${END_SHA}:${f}`) : read(f);
const OLD_WT = path.resolve(ROOT, "../bloom-028d2-guided-training");
const OLD_FP = { head: "c23815ed080dcd084ab4ea412c2a13292c18c181", status: "8abc76b1655aafc0162f675dd0d78ecd9de3b5322d761eb31bf412d0123f4d28", diff: "bde236ae96e4fbae62ba37ab92c46cd57dff1030e774dcb992696f08aa4cda9a",
  untracked: { "resources/training/training-coach.js": "7a600705398e2479bee80b04e4badbc1eba967e8005e7281e60b06dd84dd4b16", "resources/training/training-director.js": "f28082f914af4ad8fa99158b146af24fbeb3b8a8100ac570e06fb5eb4382632f",
    "resources/training/training-steps.js": "a047e8ef07a01f1c43bbb6e0df5d22c3ce321d6d5c39a8942893f6e226047cb0", "tools/guided-training-check.js": "e061130f31e342dc7961534dd7c321167223f72de484da9857cbbfe22cbfaa27" } };
const STEP_IDS = ["start", "natural-spread", "biomass", "inspect-chill", "limiting-factor", "adapt-buy", "spread", "growth-focus", "local-upgrade", "terraform-preview", "tradeoff", "sacrifice", "goal"];
const EVTS = ["run-ready", "play-pause", "speed", "region-select", "upgrade-preview", "upgrade-purchase", "growth-focus", "local-upgrade", "bubble-collect", "win"];
// the documented detail keys (docs/TRAINING_FOUNDATION_v1.md §7)
const DETAIL_KEYS = { "run-ready": ["kind", "planetId", "running", "training"], "play-pause": ["running"], speed: ["speed"], "region-select": ["id", "index", "name", "previous", "tile", "water"],
  "upgrade-preview": ["available", "better", "board", "gain", "id", "lose", "name", "reachHostile", "worse"], "upgrade-purchase": ["biomass", "board", "cost", "id", "name", "tier"],
  "growth-focus": ["changed", "focus", "id", "index", "name", "previous"], "local-upgrade": ["cost", "id", "index", "name", "upgrade", "upgradeName"],
  "bubble-collect": ["how", "id", "index", "name", "tile", "value"], win: ["coverage", "planetId", "ticks", "training"] };
const COACH_FILES = ["resources/training/training-steps.js", "resources/training/training-director.js", "resources/training/training-coach.js", "resources/training/training-run.js"];
const proof = { milestone: "BLOOM-028D2", baseSha: BASE_SHA, generatedAt: null, steps: [], runs: {}, alternate: null, firstRun: {}, completion: {}, accessibility: {}, viewports: {}, skip: {} };

(async () => {
  const { trainingSteps, KEEP_CLEAR, VERGE_ESTABLISHED, TRAINING_REGIONS } = await import(path.join(ROOT, "resources/training/training-steps.js"));
  const { TrainingDirector, EVENT_TYPES } = await import(path.join(ROOT, "resources/training/training-director.js"));
  const { placeCard, PLACE, overlap, CONTROLS } = await import(path.join(ROOT, "resources/training/training-coach.js"));
  const store = await import(path.join(ROOT, "resources/training/training-store.js"));

  // ================================================================ Node
  if (want("N")) {
    // N1 · the accepted starting point and this milestone's scope
    { const head = git(`rev-parse ${TIP}`), anc = (() => { try { git(`merge-base --is-ancestor ${BASE_SHA} ${TIP}`); return true; } catch { return false; } })();
      const subjects = git(`log --format=%s ${BASE_SHA}..${TIP}`).split("\n").filter(Boolean);
      const first = git(`rev-list --first-parent --reverse ${BASE_SHA}..${TIP}`).split("\n").filter(Boolean)[0] || null;
      const parentOfFirst = first ? git(`rev-parse ${first}^`) : head;
      check(anc && parentOfFirst === BASE_SHA && subjects.every(s => /^BLOOM-028D2\b/.test(s)),
        "N1 · the work starts at the accepted 029F final 8f4c273 exactly (the first commit's parent, or HEAD itself before any commit); every commit since is a BLOOM-028D2 commit; no merge, no other milestone",
        `HEAD ${head.slice(0, 7)} · ${subjects.length} commit(s) since ${BASE_SHA.slice(0, 7)}`); }

    // N2 · the paused old draft is untouched; N3 · and was not imported wholesale
    { if (!fs.existsSync(OLD_WT)) info("N2 · the paused c23815e 028D2 worktree", "not present on this machine: fingerprint not re-checked");
      else { const fp = { head: git("rev-parse HEAD", OLD_WT), status: sha256(cp.execSync("git status --porcelain", { cwd: OLD_WT, maxBuffer: 64 << 20 })), diff: sha256(cp.execSync("git diff", { cwd: OLD_WT, maxBuffer: 64 << 20 })),
          untracked: Object.fromEntries(git("ls-files -o --exclude-standard", OLD_WT).split("\n").filter(Boolean).sort().map(f => [f, sha256(fs.readFileSync(path.join(OLD_WT, f)))])) };
        check(fp.head === OLD_FP.head && fp.status === OLD_FP.status && fp.diff === OLD_FP.diff && J(fp.untracked) === J(OLD_FP.untracked),
          "N2 · the paused old 028D2 worktree (agent/bloom-028d2-guided-training @ c23815e) is byte-for-byte untouched: HEAD, `git status --porcelain` hash, complete `git diff` hash and every untracked file's hash equal the fingerprint recorded before this milestone began",
          `status ${fp.status.slice(0, 12)} · diff ${fp.diff.slice(0, 12)} · ${Object.keys(fp.untracked).length} untracked`); }
      const oldHashes = Object.values(OLD_FP.untracked), mine = [...COACH_FILES, "tools/guided-training-check.js", "resources/training/training-coach.css"].map(f => sha256(fs.readFileSync(path.join(ROOT, f))));
      const oldBranchCommits = (() => { try { return git(`rev-list ${BASE_SHA}..agent/bloom-028d2-guided-training`).split("\n").filter(Boolean); } catch { return []; } })();
      const coachSrc = COACH_FILES.map(read).join("\n");
      const oldShell = ["#btnPlay", "tileRect", "BLOOM_RUN_UI.highlight", "ui.status()", "ui.traits()", "specPrice", "renderInspect", "#playMenu"].filter(s => coachSrc.includes(s));
      check(!mine.some(h => oldHashes.includes(h)) && !oldBranchCommits.length && !oldShell.length && trainingSteps().length === 13,
        "N3 · no old 028D2 file, commit or cherry-pick was imported wholesale: no new file equals an old draft file; the old branch adds no commit to this history; none of the old engineering-shell selectors / views (#btnPlay, tileRect, BLOOM_RUN_UI.highlight, ui.status(), …) appear in the production coach; the 14-step draft became the 13 locked lessons",
        oldShell.join(", ") || "clean"); }

    // N4 · the thirteen lessons: order, copy, the REAL goal
    { const steps = trainingSteps(), ids = steps.map(s => s.id);
      const regs = (o = {}) => Object.values(TRAINING_REGIONS).map(id => ({ id, name: id.split("_").map(w => w[0].toUpperCase() + w.slice(1)).join(" "), viable: (o.viable || []).includes(id), fitness: (o.viable || []).includes(id) ? 0.8 : 0.4,
        living: (o.living || {})[id] ?? (id === "landing_meadow" ? 40 : 0), area: 80, focus: (o.focus || {})[id] || "balanced", localUpgrade: (o.local || {})[id] || null, limitKey: id === "chill_hollow" ? "Temperature" : id === "thirsty_flats" ? "Water" : id === "salt_pan" ? "Soil" : null,
        limitText: id === "chill_hollow" ? "too cold for your plant" : null, isOrigin: id === "landing_meadow" }));
      const ctxOf = (o = {}) => { const rs = regs(o), owned = o.owned || [];
        return { run: { ticks: o.ticks ?? 10, running: !!o.running, won: !!o.won }, hud: { biomass: o.biomass ?? 50, coverage: 0.4, winAt: o.winAt ?? 0.65, winPct: Math.round((o.winAt ?? 0.65) * 100) },
          region: id => rs.find(r => r.id === id), regions: () => rs, upgrade: id => ({ id, name: id, price: 140, owned: owned.includes(id), tier: owned.includes(id) ? 1 : 0 }), owned: id => owned.includes(id) ? 1 : 0,
          spreadOwned: () => owned.filter(id => ["seedOut", "earlyMat"].includes(id)).map(id => ({ id, name: id === "seedOut" ? "Seed Output" : "Early Maturity", owned: true })),
          colony: () => ({ localPrice: 90, localUpgrade: null }), previewOf: () => ({ available: true, gain: ["thirsty_flats"], lose: [], worse: ["reed_fen"] }),
          ui: { room: o.room || null, context: o.context || null, tab: o.tab || null, selection: o.selection || null }, seen: { previews: new Set(o.previews || []), bubbles: o.bubbles || [], won: !!o.won }, mem: o.mem || {} }; };
      const states = [{}, { running: true }, { room: "adapt" }, { room: "region", context: "landing_meadow", tab: "colony" }, { room: "terraform" }, { previews: ["seedOut"] }, { viable: ["salt_pan"] },
        { owned: ["drought"], viable: ["thirsty_flats"] }, { owned: ["warm"], viable: ["chill_hollow"] }, { selection: "landing_meadow" }];
      const sentences = t => String(t).trim().split(/(?<=[.!?])\s+(?=[A-Z0-9"])/).filter(Boolean).length;
      const bad = [], texts = new Set();
      for (const s of steps) for (const o of states) { const c = ctxOf(o); for (const t of [typeof s.title === "function" ? s.title(c) : s.title, s.body(c), s.status ? s.status(c) : null].filter(Boolean)) { texts.add(t); if (sentences(t) > 3 || t.length > 230) bad.push(`${s.id}: ${t}`); } }
      const goal65 = steps[0].body(ctxOf()), goal70 = steps[0].body(ctxOf({ winAt: 0.7 })), last = steps[12];
      const srcs = COACH_FILES.map(read).join("\n") + read("content/training.js");
      check(steps.length === 13 && J(ids) === J(STEP_IDS) && steps.every(s => typeof s.complete === "function" && typeof s.body === "function" && s.targets) && !bad.length,
        "N4a · exactly 13 lessons in the locked order (start · natural spread · Biomass bubble · inspect Chill Hollow · its limiting factor · Adapt · Spread / Seed Output · Growth Focus · Local Upgrade · Terraform preview · the tradeoff · the sacrifice zone · the goal), each with copy, targets and an outcome; every line 1–3 short sentences in every state shown",
        `${texts.size} distinct lines${bad.length ? " · " + bad.slice(0, 2).join(" | ") : ""}`);
      check(/65%/.test(goal65) && /70%/.test(goal70) && !/60\s*%/.test(srcs) && D.planets.training_grounds.winThreshold === 0.65 && /65%/.test(last.title(ctxOf())) && /65%/.test(last.body(ctxOf())),
        "N4b · the goal is read from the REAL run threshold (hud.winPct: 65 % for Training Grounds, 70 % if the planet said so) — no stale 60 % anywhere in the coach or its copy; Training Grounds still wins at 0.65", `"${goal65.slice(0, 80)}…"`);
      const s7 = steps[6], s8 = steps[7];
      check(/Spread upgrades change how your plant moves and reproduces, not what it can survive/.test(s7.body(ctxOf())) && /No region opens or closes: your plant just spreads faster\. Buy Seed Output\./.test(s7.body(ctxOf({ previews: ["seedOut"] })))
        && /Each colony can focus its energy/.test(s8.body(ctxOf())) && /Pick Roots, Leaves or Seeds for Landing Meadow\. It's free, and you can change it any time\./.test(s8.body(ctxOf({ room: "region", context: "landing_meadow", tab: "colony" })))
        && s7.title === "Spread upgrades" && s8.title === "Growth Focus" && J(s7.targets(ctxOf({ room: "spread" }))) === '[{"anchor":"upgrade-seedOut"}]',
        "N4c · lessons 7–8 keep the paused draft's finalized wording (Spread upgrades: \"…how your plant moves and reproduces, not what it can survive\" → \"No region opens or closes…Buy Seed Output.\"; Growth Focus: \"Each colony can focus its energy\" → \"Pick Roots, Leaves or Seeds for <colony>. It's free…\"), retargeted at the production Spread room's real Seed Output and Region Inspect's Colony tab"); }

    // N5 · the director: outcome-only, reconciliation, monotonic, the win (a scripted adapter; the real one is the browser's)
    { const mkWorld = () => ({ ticks: 0, running: false, won: false, biomass: 150, cov: 0.02, owned: {}, focus: {}, local: {}, living: { landing_meadow: 10 }, viable: new Set(["landing_meadow", "green_verge", "reed_fen"]), sel: "landing_meadow", bubbles: [] });
      const regIds = Object.values(TRAINING_REGIONS), names = { landing_meadow: "Landing Meadow", green_verge: "Green Verge", chill_hollow: "Chill Hollow", reed_fen: "Reed Fen", thirsty_flats: "Thirsty Flats", salt_pan: "Salt Pan" };
      const mkAdapter = W => { const subs = new Set(); return { api: 1, W,
        run: () => ({ ticks: W.ticks, running: W.running, speed: 1, won: W.won }), hud: () => ({ biomass: W.biomass, coverage: W.cov, winAt: 0.65, winPct: 65 }),
        regions: () => regIds.map((id, i) => ({ id, index: i, name: names[id], fitness: W.viable.has(id) ? 0.8 : 0.4, living: W.living[id] || 0, area: 80, focus: W.focus[id] || "balanced", localUpgrade: W.local[id] || null,
          limitKey: { chill_hollow: "Temperature", thirsty_flats: "Water", salt_pan: "Soil" }[id] || "Temperature", isOrigin: i === 0 })),
        region: id => ({ limiting: { text: id === "chill_hollow" ? "too cold for your plant" : null, blocked: !W.viable.has(id) } }),
        upgrade: id => ({ id, name: id, price: 140, tier: W.owned[id] || 0, owned: !!W.owned[id] }),
        upgrades: () => [{ board: "Spread", items: ["seedOut", "earlyMat"].map(id => ({ id, name: { seedOut: "Seed Output", earlyMat: "Early Maturity" }[id], owned: !!W.owned[id], tier: W.owned[id] || 0 })) }, { board: "Adapt", items: ["cold", "drought", "salt"].map(id => ({ id, owned: !!W.owned[id], tier: W.owned[id] || 0 })) }],
        colony: () => ({ localPrice: 90, localUpgrade: null }), previewOf: () => ({ available: true, gain: ["thirsty_flats"], lose: [], worse: ["reed_fen"] }),
        selection: () => ({ id: W.sel }), subscribe: f => { subs.add(f); return () => subs.delete(f); }, _subs: subs }; };
      const doc = new EventTarget(), fire = (t, d) => doc.dispatchEvent(new CustomEvent("bloom:" + t, { detail: d }));
      let clock = 0;
      const run = (W, ui = () => ({})) => { const A = mkAdapter(W), placed = []; const d = new TrainingDirector({ steps: trainingSteps(), adapter: A, readUi: ui, growThresh: 0.55, doc, evalMs: 1e9, now: () => clock,
          hooks: { placeBubble: id => { placed.push(id); W.bubbles.push(77); return 77; } } }); d.start(); return { d, A, placed }; };
      // (a) a frozen state never advances, however long and often it is read
      { const W = mkWorld(), { d } = run(W); for (let k = 0; k < 2000; k++) { clock += 1000; d.evaluate("poll"); }
        check(d.index === 0 && d.log.length === 0 && d.state === "running", "N5a · no lesson advances from elapsed time: a frozen run read 2 000 times over 33 simulated minutes stays on lesson 1 (the clock decides when the state is read, never what it must be)", `index ${d.index}`); d.dispose(); }
      // (b) the taught route, outcome by outcome
      { const W = mkWorld(), ui = { room: null }, { d, placed } = run(W, () => ui), at = () => d.current && d.current.id;
        const seq = [];
        W.running = true; W.ticks = 1; d.evaluate(); seq.push(at());                               // → natural-spread
        W.living.green_verge = VERGE_ESTABLISHED - 1; d.evaluate(); seq.push(at());                // still
        W.living.green_verge = VERGE_ESTABLISHED; d.evaluate(); seq.push(at());                    // → biomass (bubble placed)
        d.evaluate(); d.evaluate();
        fire("bubble-collect", { how: "click", tile: 77, value: 25 }); seq.push(at());            // → inspect-chill
        W.sel = "chill_hollow"; fire("region-select", { id: "chill_hollow" }); seq.push(at());     // → limiting-factor
        fire("upgrade-preview", { id: "warm" }); seq.push(at());                                   // a different preview: still
        fire("upgrade-preview", { id: "cold" }); seq.push(at());                                   // → adapt-buy
        W.owned.cold = 1; fire("upgrade-purchase", { id: "cold" }); seq.push(at());                // bought, not yet viable: still
        W.viable.add("chill_hollow"); d.evaluate(); seq.push(at());                                // viable → spread
        W.owned.seedOut = 1; fire("upgrade-purchase", { id: "seedOut" }); seq.push(at());          // → growth-focus
        W.focus.landing_meadow = "leaves"; fire("growth-focus", {}); seq.push(at());              // → local-upgrade
        W.local.landing_meadow = "rootNetwork"; fire("local-upgrade", {}); seq.push(at());        // → terraform-preview
        fire("upgrade-preview", { id: "humid" }); seq.push(at());                                  // → tradeoff
        W.owned.humid = 1; W.viable.add("thirsty_flats"); fire("upgrade-purchase", { id: "humid" }); seq.push(at()); // → sacrifice
        W.sel = "salt_pan"; fire("region-select", { id: "salt_pan" }); seq.push(at());             // → goal
        for (let k = 0; k < 50; k++) { clock += 5000; d.evaluate(); } seq.push(at());              // the goal waits for the win only
        W.won = true; fire("win", { coverage: 0.66 }); seq.push(d.state);
        const exp = ["natural-spread", "natural-spread", "biomass", "inspect-chill", "limiting-factor", "limiting-factor", "adapt-buy", "adapt-buy", "spread", "growth-focus", "local-upgrade", "terraform-preview", "tradeoff", "sacrifice", "goal", "goal", "completed"];
        const idx = d.log.map(e => e.index);
        check(J(seq) === J(exp) && J(placed) === '["landing_meadow"]' && idx.every((v, k) => v === k + 1) && d.log.length === 13 && d.log[12].how === "win" && d.log[4].how === "preview" && d.log[5].how === "cold" && d.log[10].how === "humid",
          "N5b · the taught route advances on outcomes only — Play + ticks, Green Verge established (6 living), THE scripted bubble collected (placed once, in Landing Meadow), Chill Hollow selected, the Cold preview (not Warm's), Chill Hollow viable (not the purchase alone), any Spread purchase, a non-Balanced focus, a local upgrade, the Humidify preview, Thirsty Flats viable, Salt Pan selected, and the run's own win; the index is monotonic",
          seq.join(" → ")); d.dispose(); }
      // (c) every lesson already finished off-script passes through in ONE evaluation, acknowledged, never asked again
      { const W = mkWorld(); W.running = true; W.ticks = 400; W.living.green_verge = 30; W.owned = { warm: 1, earlyMat: 1, drought: 1 }; W.viable = new Set(["landing_meadow", "green_verge", "chill_hollow", "thirsty_flats"]);
        W.focus.green_verge = "roots"; W.local.green_verge = "seedReserve"; W.sel = "salt_pan";
        const ui = { room: null }, { d } = run(W, () => ui);
        const at3 = d.current.id; fire("bubble-collect", { how: "auto", tile: 77, value: 12.5 });
        const acks = d.log.map(e => e.ack).filter(Boolean), hows = d.log.map(e => `${e.id}:${e.how}`);
        check(at3 === "biomass" && d.current.id === "goal" && d.log.length === 12 && hows.includes("inspect-chill:solved-early") && hows.includes("adapt-buy:warm") && hows.includes("spread:earlyMat") && hows.includes("growth-focus:roots")
          && hows.includes("local-upgrade:seedReserve") && hows.includes("tradeoff:drought") && hows.includes("biomass:auto") && acks.some(a => /Warm the Sky opened Chill Hollow/.test(a)) && acks.some(a => /Drought Adaptation opened Thirsty Flats, but Reed Fen is now too wet/.test(a))
          && acks.some(a => /collected itself, at half value/.test(a)) && acks.some(a => /Early Maturity is a real Spread upgrade too/.test(a)) && !/Buy Cold Tolerance/.test(d.current.body),
          "N5c · reconciliation: a player who already used Warm the Sky, Early Maturity, a Roots focus, Seed Reserve and Drought Adaptation (and whose bubble collected itself) is never stuck or told to buy what they own — those lessons pass through in one evaluation, each acknowledged (Warm opened Chill Hollow; Drought opened Thirsty Flats but closed Reed Fen; the bubble at half value), straight to the goal",
          hows.join(" · ")); d.dispose(); }
      // (d) Salt Pan never has to be solved; the win ends the script from any lesson; nothing grants Biomass
      { const W = mkWorld(), { d } = run(W); W.running = true; W.ticks = 3; d.evaluate();
        const b0 = W.biomass; W.won = true; fire("win", { coverage: 0.65 });
        const steps = trainingSteps(), salt = steps[11], ctxSalt = { ui: { selection: "salt_pan", room: null }, region: id => ({ id, viable: false, limitKey: "Soil" }) };
        check(d.state === "completed" && d.log[d.log.length - 1].how === "won-early" && W.biomass === b0 && !!salt.complete(ctxSalt) && !/Buy Salt Handling|buy Salt Handling/.test(salt.body({ ...ctxSalt, region: id => ({ id, viable: false, limitKey: "Soil" }) })),
          "N5d · Salt Pan's lesson finishes by READING it (never by Salt Handling); a win during any lesson ends the script as completed; the director never changes Biomass", `${d.log.map(e => e.id + ":" + e.how).join(" · ")}`); d.dispose(); }
      // (e) disposal: no listener left on the document, no adapter subscriber
      { const W = mkWorld(), A0 = mkAdapter(W), cnt = { add: 0, rem: 0 }, d2 = new EventTarget(); const add = d2.addEventListener.bind(d2), rem = d2.removeEventListener.bind(d2);
        d2.addEventListener = (...a) => { cnt.add++; add(...a); }; d2.removeEventListener = (...a) => { cnt.rem++; rem(...a); };
        const d = new TrainingDirector({ steps: trainingSteps(), adapter: A0, growThresh: 0.55, doc: d2, evalMs: 1e9 }); d.start(); const subs = A0._subs.size; d.dispose(); d.dispose();
        check(cnt.add === EVENT_TYPES.length + 3 && cnt.rem === cnt.add && subs === 1 && A0._subs.size === 0 && J(EVENT_TYPES) === J(EVTS), "N5e · the director listens to exactly the ten bloom:* events (+ click / keyup / focusin) and removes every listener and its adapter subscription on dispose (twice is harmless)", J(cnt)); } }

    // N6 · the callout placement rule
    { const R = (l, t, w, h) => ({ left: l, top: t, right: l + w, bottom: t + h }), inside = (p, h, v, m = PLACE.margin) => p.left >= m - 0.5 && p.top >= m - 0.5 && p.left + p.width <= v.width - m + 0.5 && p.top + h <= v.height - m + 0.5;
      const ov = (p, h, r) => overlap({ left: p.left, top: p.top, right: p.left + p.width, bottom: p.top + h }, r);
      let n = 0; const bad = []; const rng = (s => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)(28042);
      for (const v of [{ width: 1024, height: 768 }, { width: 1280, height: 800 }, { width: 1440, height: 900 }]) for (let k = 0; k < 400; k++) {
        const w = 24 + rng() * 260, h = 18 + rng() * 160, r = R(rng() * (v.width - w), rng() * (v.height - h), w, h), ch = 130 + rng() * 90, p = placeCard({ w: 340, h: ch }, r, [], [], v); n++;
        if (!inside(p, ch, v) || ov(p, ch, r) > 0) bad.push(`${v.width}×${v.height} ${J([r.left, r.top, w, h].map(Math.round))} → ${p.side}`); }
      const V = { width: 1280, height: 800 }, tgt = R(470, 690, 160, 46), keep = R(230, 600, 320, 40), slid = placeCard({ w: 340, h: 165 }, tgt, [], [keep], V);
      const edge = placeCard({ w: 340, h: 160 }, R(1116, 16, 46, 46), [], [], V), left = placeCard({ w: 340, h: 160 }, R(1200, 380, 60, 40), [], [], V);
      const nar = { width: 860, height: 700 }, nlo = placeCard({ w: 340, h: 170 }, R(100, 600, 80, 40), [], [], nar), nhi = placeCard({ w: 340, h: 170 }, R(100, 60, 80, 40), [], [], nar);
      check(!bad.length && ov(slid, 165, keep) === 0 && ov(slid, 165, tgt) === 0 && inside(edge, 160, V) && ov(edge, 160, R(1116, 16, 46, 46)) === 0 && left.side === "left" && nlo.side === "dock-top" && nhi.side === "dock-bottom"
        && nlo.width === Math.min(PLACE.dockMax, 860 - 32) && inside(nlo, 170, nar) && inside(nhi, 170, nar) && PLACE.narrow === 900,
        "N6 · placeCard: always inside the viewport with a 16 px gutter and never on its target (1 200 random targets at 1024×768 / 1280×800 / 1440×900); slides past a keep-clear control it would cover; flips to the free side at an edge; below 900 px docks full width (≤ 560 px) at the bottom, or the top when the target is low",
        `random ${n - bad.length}/${n} · slid ${slid.side} · edge ${edge.side} · narrow ${nlo.side}/${nhi.side}${bad.length ? " · " + bad.slice(0, 3).join(" | ") : ""}`); }

    // N7 · anti-cheat: the coach never acts for the player
    { const offenders = [];
      for (const f of COACH_FILES) { const s = read(f).replace(/^\s*\/\/.*$/gm, ""); // code only (comments describe what is NOT done)
        for (const [rx, what] of [[/BLOOM_API/, "BLOOM_API"], [/\.actions\.\w+\s*\(/, "adapter.actions.*()"], [/actions\.(buy|selectRegion|selectTile|setGrowthFocus|buyLocalUpgrade|collectBubble|preview|play|pause|setRunning|setSpeed|deselect)\b/, "an adapter action"],
          [/\bsim\b\s*\./, "sim."], [/biomass\s*[+\-*]?=(?!=)/i, "a Biomass write"], [/fitness\s*=(?!=)|coverage\s*=(?!=)|winAt\s*=(?!=)|winThreshold\s*=(?!=)/, "a fitness / coverage / threshold write"], [/\.click\(\)|dispatchEvent\(/, "a synthetic click / event"]])
          if (rx.test(s)) offenders.push(`${f}: ${what}`); }
      const run = read("resources/training/training-run.js"), hook = /hooks: \{ placeBubble: id => ui\.placeBubble\(id\) \}/.test(run);
      check(!offenders.length && hook && /placeBubble/.test(read("resources/training/training-steps.js")),
        "N7 · anti-cheat: no production coach file (steps, director, coach, training layer) references BLOOM_API, calls any adapter action (buy, selectRegion, setGrowthFocus, buyLocalUpgrade, collectBubble, preview, play / pause, speed), touches the sim, writes Biomass / fitness / coverage / the win threshold, or synthesises a click or event; the one effect is BLOOM_RUN_UI.placeBubble for the scripted bubble",
        offenders.join(" | ") || "clean"); }

    // N8 · the ten events and their detail keys; the adapter; BLOOM_RUN_UI additive
    { const runBase = git(`show ${BASE_SHA}:demos/demo-run.html`), runAt = readAt("demos/demo-run.html");
      const sites = s => (s.match(/emit\("[a-z-]+",\{[^]*?\}\)/g) || []).map(x => x.replace(/\s+/g, " ")).sort();
      const adBase = git(`rev-parse ${BASE_SHA}:resources/run-ui/run-ui-adapter.js`), adAt = hashAt("resources/run-ui/run-ui-adapter.js");
      const pvDiff = git(`diff ${RANGE} -- resources/run-ui/planet-view.js`).split("\n").filter(l => /^[+-][^+-]/.test(l));
      check(J(sites(runBase)) === J(sites(runAt)) && sites(runAt).length >= 10 && adBase === adAt && pvDiff.every(l => l.startsWith("+")) && /window\.BLOOM_RUN_UI=\{ placeBubble \};/.test(runAt) && /window\.BLOOM_RUN_UI\.adapter=runUI\.adapter;/.test(runAt),
        "N8 · every bloom:* dispatch site in the run page is identical to 8f4c273 (same ten types, same detail keys, nothing tutorial-specific added); the run UI adapter is byte-identical (api 1, the same ten EVENTS); the Planet View gains only additive lines (regionPoint / regionRect); BLOOM_RUN_UI keeps placeBubble and .adapter",
        `${sites(runAt).length} dispatch sites · planet-view +${pvDiff.length}/-0`); }

    // N9 · protected files byte-identical; the training config unchanged
    { const same = f => { try { return git(`rev-parse ${BASE_SHA}:${f}`) === hashAt(f); } catch { return false; } };
      const PROTECTED = ["content/config.js", "content/traits.js", "content/archetypes.js", "content/scenarios.js", "content/play.js", "planets/first_bloom.js", "planets/training_grounds.js",
        "resources/bloom-sim.js", "resources/bloom-gen.js", "resources/bloom-validate.js", "resources/bloom-witness.js", "resources/bloom-archetype.js", "resources/bloom-scenario.js", "resources/bloom-play.js", "resources/bloom-play-worker.js",
        "resources/run-ui/run-ui-adapter.js", "resources/run-ui/run-map-renderer.js", "resources/run-ui/decision-rooms.js", "resources/run-ui/decision-rooms.css", "resources/run-ui/terraform-globe.js", "resources/run-ui/gameplay-transition.js",
        "resources/run-ui/plant-specimen.js", "resources/run-ui/planet-view.css", "resources/run-ui/run-report.css", "resources/atmosphere-transition/atmosphere-transition.js", "resources/planet-surface/planet-surface.js",
        "resources/planet-sphere/planet-sphere-view.js", "resources/planet-sphere/planet-texture.js", "resources/expedition/expedition-handoff.js", "resources/expedition/expedition-arrival.js",
        "resources/training/training-store.js", "resources/main-menu/black-fade.js", "resources/main-menu/main-menu-data.js", "index.html", "demos/destination-survey.html", "demos/atmosphere-transition.html"];
      const dirs = ["resources/destination-survey", "resources/planet-sphere/vendor", "resources/main-menu/backgrounds", "planets", "tools/golden"];
      const changedDirs = dirs.filter(d => git(`diff --name-only ${RANGE} -- ${d}`) !== "" || (!AT_END && git(`status --porcelain -- ${d}`) !== ""));
      const differ = PROTECTED.filter(f => !same(f));
      const ctxBase = { window: undefined, globalThis: {} }; vm.runInNewContext(git(`show ${BASE_SHA}:content/training.js`), ctxBase);
      const baseTraining = ctxBase.globalThis.BLOOM_DATA.training;
      check(!differ.length && !changedDirs.length && J(baseTraining.config) === J(D.training.config) && J(D.training.config) === J({ econ: { startBiomass: 150, originTrickle: 0.6, bubbleChance: 0, bubbleAutoTicks: 375 } })
        && baseTraining.planetId === D.training.planetId && baseTraining.rngSeed === D.training.rngSeed,
        "N9 · nothing outside the coach changed: the engine, generator, validators, content, planets (Training Grounds: win 0.65), the adapter, map renderer, rooms, globe, transition, specimen, surface, sphere, AtmosphereTransition, expedition handoff, survey, training store, root index.html are byte-identical to 8f4c273; the training config is unchanged (start Biomass 150 · origin trickle 0.6 · bubble chance 0 · bubble auto ticks 375; seed 28041)",
        differ.concat(changedDirs).join(", ") || `${PROTECTED.length} files + ${dirs.length} directories`); }

    // N10 · anchors: the frozen production set unchanged; the coach adds none (its own markers are namespaced); mounted only by the training layer
    { const anchorsOf = s => [...new Set((s.match(/data-tutorial="([a-z-]+)"/g) || []).map(x => x.slice(15, -1)))].sort();
      const files = ["demos/demo-run.html", "resources/run-ui/planet-view.js", "resources/run-ui/decision-rooms.js", "resources/run-ui/run-report.js"];
      const base = files.map(f => anchorsOf(git(`show ${BASE_SHA}:${f}`))), now = files.map(f => anchorsOf(readAt(f)));
      const coach = COACH_FILES.map(read).join("\n"), setsAnchor = /setAttribute\(\s*["']data-tutorial["']|dataset\.tutorial\s*=|data-tutorial="\$\{/.test(coach.replace(/\[data-tutorial="\$\{cssEsc\(t\.anchor\)\}"\]/g, ""));
      // real imports only (the modules' own header comments show usage examples): file:line:content with the content not a comment
      const importers = [...new Set(git("grep -n -E \"(import .* from|src=)[^;]*training-(coach|director|steps)\\.js\" -- '*.js' '*.html'").split("\n").filter(Boolean)
        .map(l => l.match(/^([^:]+):\d+:(.*)$/)).filter(m => m && !/^\s*(\/\/|\*)/.test(m[2])).map(m => m[1]))].filter(f => !f.startsWith("tools/") && !f.startsWith("docs/"));
      const loader = /if\(BLOOM_RUN\.training\)\{[^]*?m\.src="\.\.\/resources\/training\/training-run\.js"/.test(readAt("demos/demo-run.html"));   // (BLOOM-033: 028D2's loader, at END_SHA; the one-document loaders: tools/single-app-flow-check.js S10)
      check(J(base) === J(now) && !setsAnchor && /data-coach=|data-training-coach/.test(coach) && J(importers.sort()) === J(["resources/training/training-run.js"]) && loader,
        "N10 · the production data-tutorial anchors are exactly 8f4c273's (run page, Planet View, rooms, report); the coach never writes one (its own markers are data-coach / data-training-coach); only the training layer imports the coach, and the run page loads that layer only for ?training=1",
        `${now.flat().length} anchor names · importers ${importers.join(", ")}`); }

    // N11 · the training record: completed never downgraded; who writes what
    { const mem = (() => { const m = new Map(); return { getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) }; })();
      const a = store.writeTraining(mem, "completed", 1), b = store.writeTraining(mem, "skipped", 2), r = store.readTraining(mem);
      const ee = read("resources/main-menu/expedition-entry.js"), tr = read("resources/training/training-run.js");
      const eeWrites = (ee.match(/writeTraining\([^)]*\)/g) || []), trWrites = (tr.match(/writeTraining\([^)]*\)/g) || []);
      check(a.status === "completed" && b.status === "completed" && r.status === "completed" && J(eeWrites) === J(['writeTraining(this.store, "skipped")']) && J(trWrites) === J(['writeTraining(storage, "skipped")', 'writeTraining(storage, "completed")'])
        && /if \(action === "skipTraining" && guide\.mounted && !\(await confirmSkip\(\)\)\) return false;/.test(tr) && !/confirm\(/.test(tr.replace(/confirmSkip\(/g, "")),
        "N11 · the record: \"completed\" is never downgraded; the title writes only \"skipped\" (Go to Expedition); the training layer writes \"skipped\" only after the confirmed skip and \"completed\" only on the run's win — Start Training, Restart and Main menu write nothing; no window.confirm", J({ eeWrites, trWrites })); }
  }

  // ================================================================ browser
  let pw = null; try { pw = require("playwright"); } catch { check(false, "Playwright available (NODE_PATH=\"$(npm root -g)\")", "require('playwright') failed"); }
  const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".json": "application/json", ".svg": "image/svg+xml" };
  // (BLOOM-030) "/" serves the root index.html, as any static web server does: the canonical Strange Bloom title
  const server = http.createServer((req, res) => { const p0 = decodeURIComponent(new URL(req.url, "http://x").pathname), u = p0.endsWith("/") ? p0 + "index.html" : p0, f = path.join(ROOT, u);
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream", "cache-control": "no-store" }); fs.createReadStream(f).pipe(res); });
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  // (BLOOM-030) the canonical title: the repository root; (BLOOM-031) --file: the same documents as files (the root's index.html)
  const ORIGIN = FILE_MODE ? "file://" + encodeURI(ROOT) : `http://127.0.0.1:${server.address().port}`, RUN = ORIGIN + "/demos/demo-run.html", MENU = ORIGIN + (FILE_MODE ? "/index.html" : "/");
  const TITLE_PATH = new URL(ORIGIN + "/index.html").pathname, MENU_PATH = new URL(MENU).pathname;
  if (EVIDENCE) fs.mkdirSync(EVD, { recursive: true });
  // in every page: the bloom:* log (type, tick, the detail's keys), unhandled rejections, document listener bookkeeping (QA: disposal)
  const INIT = () => {
    window.__EV = []; window.__UNHANDLED = []; window.__L = { add: {}, rem: {} };
    addEventListener("unhandledrejection", e => { window.__UNHANDLED.push(String(e.reason && e.reason.message || e.reason)); });
    const A = Document.prototype.addEventListener, R = Document.prototype.removeEventListener;
    Document.prototype.addEventListener = function (t, f, o) { window.__L.add[t] = (window.__L.add[t] || 0) + 1; return A.call(this, t, f, o); };
    Document.prototype.removeEventListener = function (t, f, o) { window.__L.rem[t] = (window.__L.rem[t] || 0) + 1; return R.call(this, t, f, o); };
    for (const t of ["run-ready", "play-pause", "speed", "region-select", "upgrade-preview", "upgrade-purchase", "growth-focus", "local-upgrade", "bubble-collect", "win"])
      document.addEventListener("bloom:" + t, e => window.__EV.push({ type: t, keys: Object.keys(e.detail || {}).sort(), detail: e.detail, tick: window.BLOOM_RUN_UI && BLOOM_RUN_UI.adapter ? BLOOM_RUN_UI.adapter.run().ticks : 0 }));
  };
  const SEED_RECORD = (status) => { try { if (!sessionStorage.getItem("__seeded")) { sessionStorage.setItem("__seeded", "1"); if (status) localStorage.setItem("strange-bloom.training", JSON.stringify({ v: 1, status, at: 1 })); else localStorage.removeItem("strange-bloom.training"); } } catch {} };
  const SEED_SETTINGS = s => { try { if (!sessionStorage.getItem("__set")) { localStorage.setItem("strange-bloom.settings", s); sessionStorage.setItem("__set", "1"); } } catch {} };

  for (const bname of BROWSERS) {
    if (!pw) break; if (!pw[bname]) { info(`browser ${bname}`, "not a Playwright browser: skipped"); continue; }
    let browser; try { browser = await pw[bname].launch(); } catch (e) { check(false, `[${bname}] browser launches`, e.message.split("\n")[0]); continue; }
    const B = `[${bname}${FILE_MODE ? " file://" : ""}]`, FULL = bname === "chromium";
    const reqs = [], errsAll = [];
    const ctx = async ({ vw = 1280, vh = 800, record = undefined, settings = null, rm = false } = {}) => {
      const c = await browser.newContext({ viewport: { width: vw, height: vh }, reducedMotion: rm ? "reduce" : "no-preference" });
      await c.addInitScript(INIT); if (record !== undefined) await c.addInitScript(SEED_RECORD, record); if (settings) await c.addInitScript(SEED_SETTINGS, J(settings));
      c.on("request", r => reqs.push(r.url())); return c; };
    const watch = p => { p.errs = []; p.on("pageerror", e => { p.errs.push(e.message); errsAll.push(e.message); }); p.on("console", m => { if (m.type() === "error") { p.errs.push("console: " + m.text()); errsAll.push(m.text()); } }); return p; };
    const coached = p => p.waitForFunction(() => window.BLOOM_TRAINING_UI && BLOOM_TRAINING_UI.guide && BLOOM_TRAINING_UI.guide.mounted && BLOOM_TRAINING_UI.guide.coach.stats.places > 0, null, { timeout: 20000 });
    const G = p => p.evaluate(() => { const g = BLOOM_TRAINING_UI.guide, d = g.director, c = g.coach, A = BLOOM_RUN_UI.adapter, dr = BLOOM.decisionRooms.instance.state();
      const card = document.querySelector(".tc-card"), cr = card.getBoundingClientRect();
      return { state: d ? d.state : "none", index: d ? d.index + 1 : 0, id: d && d.current ? d.current.id : null, title: d && d.current ? d.current.title : null, body: d && d.current ? d.current.body : null,
        status: d && d.current ? d.current.status : null, ack: d && d.current ? d.current.ack : null, prim: c ? c.stats.primary : null, side: c && c.stats.lastPlace ? c.stats.lastPlace.side : null,
        card: card.hidden ? null : [cr.left, cr.top, cr.right, cr.bottom].map(Math.round), ticks: A.run().ticks, running: A.run().running, bio: A.hud().biomass, room: dr.room, ctx: dr.contextId, tr: dr.transitioning,
        vw: document.documentElement.clientWidth, vh: document.documentElement.clientHeight, sw: document.documentElement.scrollWidth }; });
    const settle = async p => { await p.waitForFunction(() => { const s = BLOOM.decisionRooms.instance.state(), r = BLOOM.runReport && BLOOM.runReport.instance; return !s.transitioning && !(r && r.state().busy); }, null, { timeout: 8000 }).catch(() => {}); await sleep(260); };
    const adv = (p, n) => p.evaluate(n => BLOOM_API.advance(n), n);                     // QA: time only
    // (BLOOM-031) lesson 1 → 2 happens on the director's own poll after Play; wait for it instead of reading the lesson once (a race under load)
    const pastStart = p => p.waitForFunction(() => { const d = window.BLOOM_TRAINING_UI && BLOOM_TRAINING_UI.guide.director; return !!(d && d.current && d.current.id !== "start"); }, null, { timeout: 10000, polling: 20 }).catch(() => {});
    const ovA = (a, b) => !a || !b ? 0 : Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
    // the coach's primary target, checked and used: the real control under its centre (never a coach element), the card off it, then a real click / hover
    const hitAt = (p, x, y) => p.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); if (!e) return null; const t = e.closest("[data-tutorial],[data-tool],[data-go],[data-act],[role=tab],[data-r],[data-node],canvas,button");
      return { coach: !!e.closest(".tc-layer"), tag: (t || e).tagName, tut: (t || e).getAttribute("data-tutorial"), node: (t || e).getAttribute("data-node"), id: (t || e).id || null }; }, [x, y]);
    const usePrim = async (p, expect, how = "click") => {
      await settle(p); const s = await G(p); if (!s.prim) throw new Error(`no primary target at lesson ${s.index} (${s.id})`);
      if (expect && !s.prim.key.includes(expect)) throw new Error(`lesson ${s.index} (${s.id}) points at ${s.prim.key}, expected ${expect}`);
      const [l, t, r, b] = s.prim.rect, x = (l + r) / 2, y = (t + b) / 2, hit = await hitAt(p, x, y);
      const rec = { lesson: s.index, id: s.id, key: s.prim.key, rect: s.prim.rect, card: s.card, side: s.side, cardOverTarget: ovA(s.card, s.prim.rect), hit };
      if (how === "click") await p.mouse.click(x, y); else await p.mouse.move(x, y); await sleep(160);
      return rec; };
    // the evidence stills come from Chromium; Firefox writes only its own (19-firefox-*)
    const shot = async (p, name) => { if (EVIDENCE && (FULL ? !/^19-firefox/.test(name) : /^19-firefox/.test(name))) await p.screenshot({ path: path.join(EVD, name) }); };

    // ---------------------------------------------------------------- G1 · no coach outside training (production + legacy)
    if (want("G1") && FULL) {
      const c = await ctx(), p = watch(await c.newPage()), seen = [];
      p.on("request", r => { if (/training-(run|coach|director|steps)/.test(r.url())) seen.push(r.url()); });
      const probe = async q => { seen.length = 0; await p.goto(RUN + q); await p.waitForFunction(() => window.BLOOM_RUN && (BLOOM_RUN.started || BLOOM_RUN.failed || document.querySelector("#expeditionFail")), null, { timeout: 60000 }).catch(() => {}); await sleep(900);
        return p.evaluate(() => ({ started: !!(window.BLOOM_RUN && BLOOM_RUN.started), training: !!(window.BLOOM_RUN && BLOOM_RUN.training), kind: window.BLOOM_RUN && BLOOM_RUN.kind, expedition: !!(window.BLOOM_RUN && BLOOM_RUN.expedition),
          coach: !!document.querySelector(".tc-layer, [data-training-coach]"), tui: !!window.BLOOM_TRAINING_UI, prod: document.documentElement.classList.contains("ui18") })).then(r => ({ ...r, loaded: seen.slice() })); };
      const r1 = await probe(""), r2 = await probe("?planet=training_grounds"), r3 = await probe("?archetype=ocean_archipelago&seed=28"), r4 = await probe("?archetype=frozen_world&seed=4&scenario=volatile_climate");
      // (BLOOM-033) an expedition run: inside index.html, from the Destination Survey's exact selection (the retired handoff no longer exists)
      seen.length = 0; await p.goto(MENU + "?begin=1&sector=77&workers=3");
      await p.waitForFunction(() => window.MENU_DEV && MENU_DEV.entry.survey && MENU_DEV.entry.survey.state === "survey" && MENU_DEV.entry.survey.cells.every(Boolean), null, { timeout: 120000, polling: 100 });
      await p.evaluate(() => MENU_DEV.entry.survey.select(0)); await p.waitForFunction(() => MENU_DEV.entry.survey.state === "focus", null, { timeout: 20000 }); await p.click(".ds-btn.go");
      await p.waitForFunction(() => window.BLOOM_APP && BLOOM_APP.session && BLOOM_APP.stats.sessions[0].readyMs !== null && !document.querySelector(".atx"), null, { timeout: 60000, polling: 50 }); await sleep(900);
      const r5 = await p.evaluate(() => ({ started: !!(window.BLOOM_RUN && BLOOM_RUN.started), training: !!(window.BLOOM_RUN && BLOOM_RUN.training), kind: window.BLOOM_RUN && BLOOM_RUN.kind, expedition: !!(window.BLOOM_RUN && BLOOM_RUN.expedition),
        coach: !!document.querySelector(".tc-layer, [data-training-coach]"), tui: !!window.BLOOM_TRAINING_UI, prod: document.documentElement.classList.contains("ui18") })).then(r => ({ ...r, loaded: seen.slice() }));
      const r6 = await probe("?training=1&ui=legacy");
      const none = r => r && r.started && !r.coach && !r.tui && !r.loaded.length;
      check(none(r1) && none(r2) && r2.kind === "authored" && none(r3) && r3.kind === "procedural" && none(r4) && none(r5) && r5.expedition && r6.started && r6.training && !r6.prod && !r6.coach && !!r6.tui,
        `${B} G1 · the coach never mounts outside production training: First Bloom, planet=training_grounds as an ORDINARY authored run, a generated world, a scenario run and (BLOOM-033) an exact-planet expedition inside index.html never even load the training layer; ?ui=legacy training loads the foundation layer but mounts no coach`,
        J({ first: r1, authored: r2, gen: r3, scenario: r4, expedition: r5, legacy: r6 }));
      check(!p.errs.length, `${B} G1b · no page errors`, p.errs.join(" | ")); await c.close(); }

    // ---------------------------------------------------------------- G2 + G3 · the taught route, end to end, by real input
    if (want("G3") || want("G2")) {
      const c = await ctx(), p = watch(await c.newPage());
      await p.goto(RUN + "?training=1"); await coached(p); await sleep(500);
      const g2 = await p.evaluate(() => ({ ticks: BLOOM_RUN_UI.adapter.run().ticks, running: BLOOM_RUN_UI.adapter.run().running, total: BLOOM_TRAINING_UI.guide.director.steps.length,
        live: document.querySelector(".tc-live").getAttribute("aria-live"), liveText: document.querySelector(".tc-live").textContent, h: document.querySelector(".tc-card h2").textContent,
        role: document.querySelector(".tc-card").getAttribute("role"), labelled: document.querySelector(".tc-card").getAttribute("aria-labelledby"), skip: document.querySelector(".tc-card .tc-skip").textContent,
        focus: document.activeElement && document.activeElement.classList.contains("tc-card"), winPct: BLOOM_RUN_UI.adapter.hud().winPct, threshold: BLOOM_RUN.planet.winThreshold }));
      const s1 = await G(p);
      check(g2.ticks === 0 && !g2.running && g2.total === 13 && s1.index === 1 && s1.id === "start" && /65%/.test(s1.body) && g2.winPct === 65 && g2.threshold === 0.65 && g2.live === "polite" && /Step 1 of 13/.test(g2.liveText)
        && g2.role === "region" && g2.labelled === "tcTitle" && g2.h === "Start the world" && g2.skip === "Skip Tutorial" && g2.focus,
        `${B} G2 · ?training=1 mounts the coach over the production run: paused at tick 0; lesson 1 of 13 names the REAL 65 % goal (planet threshold 0.65); a labelled region with a real heading, announced through aria-live, focused once on arrival (nothing else had focus); Skip Tutorial present`,
        `"${s1.body.slice(0, 70)}…" · live "${g2.liveText.slice(0, 40)}…"`);
      await shot(p, "03-step01-play.png");
      const R = [], fit = async () => p.evaluate(() => Object.fromEntries(BLOOM_RUN_UI.adapter.regions().map(r => [r.id, +r.fitness.toFixed(3)])));
      const fit0 = await fit();
      // 1 · Play
      R.push(await usePrim(p, "play-pause")); await sleep(300); await pastStart(p);
      // 2 · natural spread (time only)
      let s = await G(p); const g2b = { id: s.id, body: s.body, prim: s.prim && s.prim.key }; await shot(p, "04-step02-green-verge.png");
      await pastStart(p); for (let k = 0; k < 40 && (await G(p)).id === "natural-spread"; k++) { await adv(p, 10); await sleep(60); }
      // 3 · the scripted bubble: clicked on the map where the coach points
      s = await G(p); await sleep(200); await shot(p, "05-step03-bubble.png");
      const bub = await p.evaluate(() => ({ bubbles: BLOOM_RUN_UI.adapter.bubbles().map(b => ({ tile: b.tile, region: b.region.id })), calls: BLOOM_TRAINING_UI.guide.director.stats.placeBubbleCalls }));
      R.push(await usePrim(p, "bubble")); await sleep(200);
      // 4 · Chill Hollow on the map
      await shot(p, "06-step04-chill-hollow.png"); R.push(await usePrim(p, "chill_hollow")); await sleep(250);
      // 5 · the limiting factor → the real "Would help" Cold Tolerance (opens Adapt, focuses the node = its real preview)
      const s5 = await G(p); R.push(await usePrim(p, "cold")); await settle(p);
      await p.mouse.move(5, 400); await sleep(100);
      const coldNode = await p.evaluate(() => { const r = document.querySelector('[data-tutorial="upgrade-cold"]').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
      await p.mouse.move(coldNode[0], coldNode[1]); await sleep(250); await shot(p, "07-step05-cold-preview.png");
      // 6 · buy Cold Tolerance on its node
      const s6 = await G(p); R.push(await usePrim(p, "upgrade-cold")); await settle(p); await shot(p, "08-step06-adapt-purchase.png");
      const fitAfterCold = await fit();
      // 7 · Spread: the room tab, point at Seed Output, then buy it once affordable
      R.push(await usePrim(p, "room-nav:spread")); await settle(p);
      R.push(await usePrim(p, "upgrade-seedOut", "hover")); const s7 = await G(p); await shot(p, "09-step07-spread.png");
      for (let k = 0; k < 30 && (await G(p)).bio < 130; k++) await adv(p, 20);
      await sleep(300); R.push(await usePrim(p, "upgrade-seedOut")); await settle(p);
      // 8 · Growth Focus: Region Inspect → Colony → Leaves
      for (let k = 0; k < 4 && (await G(p)).id === "growth-focus"; k++) { const q = await G(p); if (q.prim && q.prim.key.includes("growth-focus")) break; R.push(await usePrim(p)); await settle(p); }
      const s8 = await G(p); await shot(p, "10-step08-growth-focus.png");
      const fb = await p.evaluate(() => { const r = document.querySelector('[data-tutorial="focus-leaves"]').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
      await p.mouse.click(fb[0], fb[1]); await sleep(300);
      // 9 · a Local Upgrade (Root Network) once affordable
      for (let k = 0; k < 30 && (await G(p)).bio < 90; k++) await adv(p, 20);
      await sleep(250); const s9 = await G(p); await shot(p, "11-step09-local-upgrade.png");
      const lb = await p.evaluate(() => { const r = document.querySelector('[data-tutorial="local-rootNetwork"]').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
      await p.mouse.click(lb[0], lb[1]); await sleep(300);
      // 10 · Terraform: the room tab, then point at Humidify (its real preview over the whole planet)
      R.push(await usePrim(p, "room-nav:terraform")); await settle(p);
      const s10 = await G(p); R.push(await usePrim(p, "upgrade-humid", "hover")); await sleep(300);
      const s11 = await G(p);
      const tradeoff = await p.evaluate(() => ({ preview: BLOOM_RUN_UI.adapter.activePreview(), effect: (document.querySelector('#dr .dr-room:not([hidden]) .z-map .mm-ctx') || {}).textContent || "" }));
      await shot(p, "12-terraform-humidify-preview.png");
      // 11 · buy Humidify once affordable (the outcome: Thirsty Flats viable)
      for (let k = 0; k < 40 && (await G(p)).bio < 200; k++) await adv(p, 20);
      await sleep(300); R.push(await usePrim(p, "upgrade-humid")); await settle(p); await sleep(200);
      const fitAfterHumid = await fit();
      // 12 · Salt Pan: its chip in the room's region strip (the room context)
      const s12 = await G(p); await shot(p, "13-step12-salt-pan.png"); R.push(await usePrim(p, "salt_pan")); await sleep(300);
      // 13 · the goal: Resume, then the run reaches 65 % by itself (time only)
      const s13a = await G(p); R.push(await usePrim(p, "resume")); await settle(p);
      const s13 = await G(p); await shot(p, "14-step13-goal.png");
      for (let k = 0; k < 60 && !(await p.evaluate(() => BLOOM_RUN_UI.adapter.run().won)); k++) { await adv(p, 60); await sleep(40); }
      await p.waitForFunction(() => BLOOM.runReport.instance.state().open && !BLOOM.runReport.instance.state().busy, null, { timeout: 15000 }).catch(() => {}); await sleep(500);
      const end = await p.evaluate(() => { const g = BLOOM_TRAINING_UI.guide, d = g.director, rr = BLOOM.runReport.instance.state(), card = document.querySelector(".tc-card");
        return { state: d.state, log: d.log, events: d.events.slice(-200), coachHidden: card.hidden, rings: document.querySelectorAll(".tc-ring").length, report: rr, heading: (document.querySelector("#rr h2") || {}).textContent,
          acts: [...document.querySelectorAll("#rr [data-act]")].filter(b => !b.hidden).map(b => b.dataset.act), keep: !document.querySelector("#rrContinue").hidden, focus: document.activeElement && document.activeElement.dataset.act,
          status: BLOOM_TRAINING_UI.status(), cov: BLOOM_RUN_UI.adapter.hud().coverage, ticks: BLOOM_RUN_UI.adapter.run().ticks, winAt: BLOOM_RUN_UI.adapter.hud().winAt,
          evKeys: Object.fromEntries(window.__EV.map(e => [e.type, e.keys])), evTypes: [...new Set(window.__EV.map(e => e.type))], placeCalls: d.stats.placeBubbleCalls, unhandled: window.__UNHANDLED.slice() }; });
      await shot(p, "15-training-complete.png");
      const hows = end.log.map(e => `${e.index}:${e.id}:${e.how}`), firstHit = R.filter(r => r.hit && r.hit.coach), covered = R.filter(r => r.cardOverTarget > 0);
      check(J(end.log.map(e => e.id)) === J(STEP_IDS) && end.log.every((e, k) => e.index === k + 1) && end.state === "completed",
        `${B} G3a · the taught route by real input finishes all 13 lessons in order, each on its real outcome`, hows.join(" · "));
      check(g2b.id === "natural-spread" && g2b.prim === "region:green_verge" && bub.calls === 1 && bub.bubbles.length === 1 && bub.bubbles[0].region === "landing_meadow" && end.placeCalls === 1
        && end.log[1].how === "established" && end.log[2].how === "click" && end.log[3].how === "selected" && end.log[4].how === "preview" && end.log[5].how === "cold" && end.log[6].how === "seedOut"
        && end.log[7].how === "leaves" && end.log[8].how === "rootNetwork" && end.log[9].how === "preview" && end.log[10].how === "humid" && end.log[12].how === "win" && end.log[12].cause === "bloom:win",
        `${B} G3b · the outcomes: Play + ticks · Green Verge established (the map region) · ONE scripted bubble (BLOOM_RUN_UI.placeBubble, once, Landing Meadow) clicked · Chill Hollow selected on the map · the Cold preview · Cold bought → Chill Hollow viable · Seed Output · Leaves · Root Network · the Humidify preview · Humidify → Thirsty Flats viable · Salt Pan · the run's own bloom:win`, hows.slice(1, 6).join(" · "));
      check(!firstHit.length && !covered.length && R.every(r => r.hit && (r.key.startsWith("region:") || r.key.startsWith("bubble:") ? r.hit.tag === "CANVAS" : true)),
        `${B} G3c · at every lesson the coach's target is the REAL control (the map canvas for a region / bubble; the production button / node / tab otherwise) — under its centre is never a coach element, and the card never covers it`,
        R.map(r => `${r.lesson}:${r.key.replace(/^(anchor|control):/, "")}→${r.hit ? (r.hit.tut || r.hit.node || r.hit.id || r.hit.tag) : "?"}`).join(" · "));
      check(/Temperature/.test(s5.body) && s5.prim.key === "control:help:cold" && s6.room === "adapt" && s6.prim.key === "anchor:upgrade-cold" && fit0.chill_hollow <= 0.55 && fitAfterCold.chill_hollow > 0.55
        && /Point at Seed Output|Buy Seed Output/.test(s7.body) && /Pick Roots, Leaves or Seeds/.test(s8.body) && /Local Upgrade/.test(s9.body) && /Terraform/.test(s10.body) && s11.id === "tradeoff" && /Reed Fen gets wetter too, but still grows/.test(s11.body)
        && tradeoff.preview && tradeoff.preview.gain.includes("thirsty_flats") && tradeoff.preview.worse.includes("reed_fen") && /Reed Fen/.test(tradeoff.effect) && fitAfterHumid.thirsty_flats > 0.55
        && /don't need every region|let it go/.test(s12.body + s12.status) && s13.id === "goal" && /65%/.test(s13.title) && fitAfterHumid.salt_pan <= 0.55,
        `${B} G3d · room-aware teaching on the real state: Chill Hollow's limiting factor (Temperature) read from the run, the banner's real "Would help" → the Adapt room's Cold node; Chill Hollow fitness ${fit0.chill_hollow} → ${fitAfterCold.chill_hollow}; Seed Output in the Spread room; the Colony tab; the real Humidify preview opens Thirsty Flats and makes Reed Fen worse-but-growing (the lesson's words come from that preview; the room's "Region effect" readout says the same); Thirsty Flats → ${fitAfterHumid.thirsty_flats}; Salt Pan never solved (${fitAfterHumid.salt_pan})`,
        `"${s11.body}"`);
      check(end.coachHidden && end.rings === 0 && end.report.open && end.report.kind === "win" && /TRAINING COMPLETE/i.test(end.heading) && J(end.acts) === J(["beginExpedition", "restartTraining", "mainMenu"]) && !end.keep
        && end.focus === "beginExpedition" && end.status.status === "completed" && end.cov >= end.winAt && end.winAt === 0.65,
        `${B} G3e · at the real win the coach is gone (no card, no ring) and the production report shows TRAINING COMPLETE with Begin Expedition (first, focused) · Restart training · Main menu — no Keep playing; the record is "completed"`,
        `${J(end.acts)} · coverage ${(end.cov * 100).toFixed(1)}% at tick ${end.ticks}`);
      const keysOk = EVTS.filter(t => end.evKeys[t]).every(t => J(end.evKeys[t]) === J(DETAIL_KEYS[t]));
      check(keysOk && EVTS.filter(t => t !== "speed").every(t => end.evTypes.includes(t)) && !end.unhandled.length && !p.errs.length,
        `${B} G3f · the bloom:* events seen on the way carry exactly their documented detail keys (TRAINING_FOUNDATION §7); no console error, no unhandled rejection`, end.evTypes.join(" · "));
      if (bname === "chromium") proof.runs.taught = { browser: bname, viewport: "1280x800", lessons: end.log, events: end.events, targets: R, fitness: { start: fit0, afterCold: fitAfterCold, afterHumidify: fitAfterHumid },
        bubble: { placed: bub, collected: end.log[2].how }, tradeoffPreview: tradeoff.preview, tradeoffCopy: s11.body, final: { coverage: end.cov, ticks: end.ticks, winAt: end.winAt, record: end.status }, completionActions: end.acts, keepPlaying: end.keep, focus: end.focus };
      else proof.runs.firefox = { browser: bname, lessons: end.log.map(e => ({ index: e.index, id: e.id, how: e.how, tick: e.tick })), completionActions: end.acts };
      await shot(p, "19-firefox-1280-complete.png");
      // ---- G8 · Begin Expedition: the training fade → the title → the Destination Survey at once; no world packed
      if (want("G8")) {
        const t0b = Date.now();
        // sample the training black every frame until the page goes (kept in sessionStorage across the navigation)
        await p.evaluate(() => { const c = document.getElementById("trainingCover"); let max = 0; const f = () => { const o = c ? +getComputedStyle(c).opacity * (getComputedStyle(c).display === "none" ? 0 : 1) : 0; if (o > max) { max = o; sessionStorage.setItem("__blk", String(max)); } requestAnimationFrame(f); }; f(); });
        await Promise.all([p.waitForURL(u => new URL(u).pathname === TITLE_PATH, { timeout: 20000 }), p.click('#rr [data-act="beginExpedition"]')]);
        const fadeSeen = Date.now() - t0b;
        await p.waitForFunction(() => window.MENU_DEV && MENU_DEV.entry && MENU_DEV.entry.state === "survey", null, { timeout: 30000 }).catch(() => {});
        const t = await p.evaluate(() => ({ url: location.href, state: MENU_DEV.entry.state, events: MENU_DEV.events.map(e => e.type), handoffs: (MENU_DEV.departures || MENU_DEV.handoffs || []).length,   /* (BLOOM-033: departures) */ ss: Object.keys(sessionStorage).filter(k => k.startsWith("strange-bloom.expedition")),
          rec: JSON.parse(localStorage.getItem("strange-bloom.training")), prompts: MENU_DEV.entry.stats.prompts, dialog: document.querySelector('[data-dialog="recommend"]').open, black: +(sessionStorage.getItem("__blk") || 0) }));
        check(t.black >= 0.999 && t.state === "survey" && !/begin=1/.test(t.url) && t.events.includes("auto-begin") && !t.handoffs && !t.ss.length && t.rec.status === "completed" && !t.prompts && !t.dialog,
          `${B} G8 · Begin Expedition leaves through the training black, opens the Strange Bloom title and enters the Destination Survey at once (the accepted begin=1 path, consumed from the address); no world is packed or handed off (the survey still owns generation); no prompt; still "completed"`,
          `black ${t.black} before leaving · ${fadeSeen} ms to the title · ${t.url.replace(ORIGIN, "")}`);
        if (bname === "chromium") proof.completion.beginExpedition = { url: t.url.replace(ORIGIN, ""), events: t.events, handoffs: t.handoffs, record: t.rec }; }
      await c.close(); }

    // ---------------------------------------------------------------- G4 · the alternate route (Warm · Early Maturity · Roots on Green Verge · Seed Reserve · Drought; auto bubble)
    if (want("G4") && FULL) {
      const c = await ctx(), p = watch(await c.newPage()); await p.goto(RUN + "?training=1"); await coached(p); await sleep(300);
      await usePrim(p, "play-pause"); await pastStart(p); for (let k = 0; k < 40 && (await G(p)).id === "natural-spread"; k++) { await adv(p, 10); await sleep(50); }
      const tile = await p.evaluate(() => BLOOM_RUN_UI.adapter.bubbles().map(b => b.tile)[0]);
      await adv(p, 380); await sleep(400);                                             // left alone: it collects itself (auto)
      const a3 = await G(p);
      // Warm the Sky instead of Cold: Terraform tool → Warm (bought on its node)
      for (let k = 0; k < 30 && (await G(p)).bio < 200; k++) await adv(p, 20);
      await usePrim(p, "chill_hollow"); await sleep(200);
      await p.click('#pv .pv-tool[data-tool="terraform"]'); await settle(p);
      const a5 = await G(p);
      await p.click('[data-tutorial="upgrade-warm"]'); await sleep(400);
      const a7 = await G(p); await shot(p, "22-alternate-warm.png");
      // Early Maturity instead of Seed Output
      await p.click('#dr .dr-room:not([hidden]) .rn[data-go="spread"]'); await settle(p);
      for (let k = 0; k < 40 && (await G(p)).bio < 170; k++) await adv(p, 20);
      await p.click('[data-tutorial="upgrade-earlyMat"]'); await sleep(300);
      // Roots on Green Verge (its chip in the room strip, then Colony)
      await p.click('#dr .dr-room:not([hidden]) .rn[data-go="region"]'); await settle(p);
      const gv = await p.evaluate(() => BLOOM_RUN_UI.adapter.regions().find(r => r.id === "green_verge").index);
      await p.click(`#dr .dr-room:not([hidden]) .mm-strip [data-r="${gv}"]`); await sleep(200); await p.click("#drtab-colony"); await sleep(200);
      await p.click('[data-tutorial="focus-roots"]'); await sleep(300);
      for (let k = 0; k < 30 && (await G(p)).bio < 90; k++) await adv(p, 20);
      await p.click('[data-tutorial="local-seedReserve"]'); await sleep(300);
      // Drought Adaptation instead of Humidify
      for (let k = 0; k < 40 && (await G(p)).bio < 150; k++) await adv(p, 20);
      await p.click('#dr .dr-room:not([hidden]) .rn[data-go="adapt"]'); await settle(p);
      const a10 = await G(p);
      await p.click('[data-tutorial="upgrade-drought"]'); await sleep(400);
      const a12 = await G(p); await shot(p, "23-alternate-drought.png");
      const fitD = await p.evaluate(() => Object.fromEntries(BLOOM_RUN_UI.adapter.regions().map(r => [r.id, +r.fitness.toFixed(3)])));
      await p.click(`#dr .dr-room:not([hidden]) .mm-strip [data-r="${await p.evaluate(() => BLOOM_RUN_UI.adapter.regions().find(r => r.id === "salt_pan").index)}"]`); await sleep(300);
      await p.click('#dr .dr-room:not([hidden]) .rb.resume'); await settle(p);
      for (let k = 0; k < 80 && !(await p.evaluate(() => BLOOM_RUN_UI.adapter.run().won)); k++) { await adv(p, 60); await sleep(30); }
      await p.waitForFunction(() => BLOOM.runReport.instance.state().open, null, { timeout: 15000 }).catch(() => {}); await sleep(400);
      const e = await p.evaluate(() => ({ log: BLOOM_TRAINING_UI.guide.director.log, state: BLOOM_TRAINING_UI.guide.director.state, status: BLOOM_TRAINING_UI.status().status, won: BLOOM_RUN_UI.adapter.run().won,
        owned: BLOOM_RUN_UI.adapter.upgrades().flatMap(b => b.items.filter(u => u.owned).map(u => u.id)) }));
      const how = Object.fromEntries(e.log.map(x => [x.id, x.how])), acks = e.log.map(x => x.ack).filter(Boolean);
      check(how.biomass === "auto" && a3.id === "inspect-chill" && /collected itself/.test(a3.ack || "") && (how["adapt-buy"] === "warm" || how["inspect-chill"] === "solved-early" || how["limiting-factor"] === "solved-early")
        && a7.id === "spread" && /Warm the Sky opened Chill Hollow/.test(a7.ack || "") && how.spread === "earlyMat" && how["growth-focus"] === "roots" && how["local-upgrade"] === "seedReserve" && how.tradeoff === "drought"
        && a12.id === "sacrifice" && /Drought Adaptation opened Thirsty Flats, but Reed Fen/.test(a12.ack || "") && e.state === "completed" && e.won && e.status === "completed" && !e.owned.includes("cold") && !e.owned.includes("humid") && !e.owned.includes("salt") && !p.errs.length,
        `${B} G4 · the alternate route stays coherent: the bubble left alone collects itself (acknowledged: half value); Warm the Sky opens Chill Hollow (acknowledged as Terraform, not the plant); Early Maturity counts as the Spread lesson; Roots on Green Verge; Seed Reserve; Drought instead of Humidify (Reed Fen's cost acknowledged: fitness ${fitD.reed_fen}); a real win with neither Cold, Humidify nor Salt Handling owned`,
        `${e.log.map(x => x.id + ":" + x.how).join(" · ")}`);
      proof.alternate = { route: "warm + earlyMat + roots(green_verge) + seedReserve + drought; bubble auto-collected", lessons: e.log.map(x => ({ index: x.index, id: x.id, how: x.how, tick: x.tick, ack: x.ack })), owned: e.owned, fitnessAfterDrought: fitD, record: e.status, bubbleTile: tile };
      await c.close(); }

    // ---------------------------------------------------------------- G5 · off-script and early; Restart
    if (want("G5") && FULL) {
      const c = await ctx(), p = watch(await c.newPage()); await p.goto(RUN + "?training=1"); await coached(p); await sleep(300);
      // paused at the landing: open Adapt with the tool and buy Cold Tolerance before anything is asked
      await p.click('#pv .pv-tool[data-tool="adapt"]'); await settle(p); const e1 = await G(p);
      await p.click('[data-tutorial="upgrade-cold"]'); await sleep(300); const e2 = await G(p);
      await p.click('#dr .dr-room:not([hidden]) .rb.resume'); await settle(p);
      await pastStart(p); for (let k = 0; k < 40 && (await G(p)).id === "natural-spread"; k++) { await adv(p, 10); await sleep(40); }
      await adv(p, 80); await sleep(250);
      const bt = await p.evaluate(() => BLOOM_RUN_UI.adapter.bubbles()[0]); if (bt) { const pt = await p.evaluate(t => { const b = BLOOM_RUN_UI.adapter.bubbles().find(x => x.tile === t); const q = BLOOM.planetView.instance.renderer.clientOf(b.x, b.y); return [q.x, q.y]; }, bt.tile); await p.mouse.click(pt[0], pt[1]); await sleep(300); }
      const e3 = await G(p);
      const log = await p.evaluate(() => BLOOM_TRAINING_UI.guide.director.log.map(x => ({ id: x.id, how: x.how, ack: x.ack })));
      // a focus and a local upgrade before their lessons (Region Inspect on Landing Meadow)
      for (let k = 0; k < 30 && (await G(p)).bio < 100; k++) await adv(p, 20);
      await p.click('#pv .pv-tool[data-tool="region"]'); await settle(p);
      const mi = await p.evaluate(() => BLOOM_RUN_UI.adapter.regions().find(r => r.isOrigin).index);
      await p.click(`#dr .dr-room:not([hidden]) .mm-strip [data-r="${mi}"]`); await sleep(150); await p.click("#drtab-colony"); await sleep(150);
      await p.click('[data-tutorial="focus-seeds"]'); await sleep(150); await p.click('[data-tutorial="local-seedReserve"]'); await sleep(300);
      const e4 = await G(p);
      const idxs = await p.evaluate(() => BLOOM_TRAINING_UI.guide.director.log.map(x => x.index));
      check(e1.id === "start" && e2.id === "start" && e3.index >= 5 && log.some(x => x.id === "inspect-chill" && x.how === "solved-early") && log.some(x => x.id === "adapt-buy" && x.how === "cold")
        && !/Buy Cold Tolerance/.test(e3.body) && idxs.every((v, k) => v === k + 1) && e4.index >= 7 && !/Pick Roots|Buy any one/.test(e4.body),
        `${B} G5a · early actions never deadlock: Cold bought paused at the landing → once the world runs, the Chill Hollow lessons pass as already solved (never "buy Cold Tolerance" again); a Seeds focus and Seed Reserve bought before their lessons are taken as done when reached; the index stays monotonic`,
        `${log.map(x => x.id + ":" + x.how).join(" · ")} · now ${e4.index}:${e4.id}`);
      // Restart: a fresh page at lesson 1, tick 0; nothing recorded
      await p.click('#dr .dr-room:not([hidden]) .rb.resume').catch(() => {}); await settle(p);
      await p.click("#pvMenuBtn"); await Promise.all([p.waitForEvent("load", { timeout: 20000 }), p.click('#pvMenu [data-act="restartTraining"]')]); await coached(p); await sleep(300);
      const r = await G(p), rec = await p.evaluate(() => localStorage.getItem("strange-bloom.training"));
      check(r.index === 1 && r.id === "start" && r.ticks === 0 && !r.running && rec === null && !p.errs.length,
        `${B} G5b · Restart training: no confirmation, a fresh page at lesson 1, tick 0, paused (step state was in memory only); no training record written`, `lesson ${r.index} · tick ${r.ticks} · record ${rec}`);
      await c.close(); }

    // ---------------------------------------------------------------- G6 · the keyboard alone
    if (want("G6") && FULL) {
      const c = await ctx(), p = watch(await c.newPage()); await p.goto(RUN + "?training=1"); await coached(p); await sleep(300);
      await p.focus("#pvPause"); await p.keyboard.press("Enter"); await sleep(300);
      const k1 = await G(p);
      await pastStart(p); for (let k = 0; k < 40 && (await G(p)).id === "natural-spread"; k++) { await adv(p, 10); await sleep(40); }
      await adv(p, 380); await sleep(400);                                             // the bubble collects itself (no pointer)
      // the map by keyboard: focus, arrows to Chill Hollow (announced in pvLive), Enter
      await p.focus("#pvMap"); let picked = null;
      for (const key of ["ArrowLeft", "ArrowUp", "ArrowLeft", "ArrowUp"]) { await p.keyboard.press(key); const lv = await p.evaluate(() => document.getElementById("pvLive").textContent); if (/^Chill Hollow/.test(lv)) { picked = lv; break; } }
      await p.keyboard.press("Enter"); await sleep(300); const k4 = await G(p);
      // Tab to the banner's Would help Cold Tolerance, Enter: the Adapt room opens with the node focused (a FOCUS preview)
      let got = false; for (let k = 0; k < 30; k++) { await p.keyboard.press("Tab"); const a = await p.evaluate(() => document.activeElement && document.activeElement.dataset.item); if (a === "cold") { got = true; break; } }
      await p.keyboard.press("Enter"); await settle(p); await sleep(300);
      const k5 = await G(p), foc = await p.evaluate(() => document.activeElement && document.activeElement.dataset.node);
      await p.keyboard.press("Enter"); await sleep(400); const k6 = await G(p);
      const prev = await p.evaluate(() => window.__EV.filter(e => e.type === "upgrade-preview").map(e => e.detail.id));
      // Skip Tutorial is reachable by Tab
      let skipReach = false; for (let k = 0; k < 60; k++) { await p.keyboard.press("Tab"); if (await p.evaluate(() => document.activeElement && document.activeElement.classList.contains("tc-skip"))) { skipReach = true; break; } }
      const vis = await p.evaluate(() => getComputedStyle(document.activeElement).outlineStyle !== "none" || getComputedStyle(document.activeElement).boxShadow !== "none");
      check(k1.index === 2 && !!picked && k4.index >= 5 && got && foc === "cold" && prev.includes("cold") && k6.index >= 7 && skipReach && vis && !p.errs.length,
        `${B} G6 · the keyboard alone satisfies the coached actions: Enter on Play; the map's arrow keys + Enter select Chill Hollow; Tab + Enter on the real "Would help" opens Adapt with Cold Tolerance FOCUSED — the focus preview counts exactly like a hover (bloom:upgrade-preview cold); Enter buys it; Skip Tutorial is reachable by Tab with a visible focus ring`,
        `${picked} · lessons ${k1.index} → ${k4.index} → ${k5.index} → ${k6.index}`);
      proof.accessibility.keyboard = { lessonsReached: [k1.index, k4.index, k5.index, k6.index], mapAnnounce: picked, focusPreview: prev.includes("cold"), skipReachable: skipReach, visibleFocus: vis };
      await c.close(); }

    // ---------------------------------------------------------------- G7 · Skip: one production confirmation, both entries
    if (want("G7")) {
      const c = await ctx(), p = watch(await c.newPage());
      await p.goto(RUN + "?training=1"); await coached(p); await sleep(300); await usePrim(p, "play-pause"); await sleep(300);
      const before = await G(p);
      await p.click(".tc-card .tc-skip"); await sleep(250);
      const d1 = await p.evaluate(() => { const d = document.querySelector("[data-training-skip]"), card = d && d.querySelector("[role=alertdialog]");
        return d && { modal: card.getAttribute("aria-modal"), title: card.querySelector("h2").textContent, body: card.querySelector("p").textContent, btns: [...card.querySelectorAll("button")].map(b => b.textContent), focus: document.activeElement.textContent, pvInert: document.getElementById("pv").inert, native: typeof window.confirm }; });
      await shot(p, "16-skip-confirm.png");
      await p.keyboard.press("Escape"); await sleep(200);
      const k1 = await p.evaluate(() => ({ open: !!document.querySelector("[data-training-skip]"), rec: localStorage.getItem("strange-bloom.training"), mounted: BLOOM_TRAINING_UI.guide.mounted, pvInert: document.getElementById("pv").inert }));
      const after1 = await G(p);
      await p.click(".tc-card .tc-skip"); await sleep(200); await p.click('[data-skip="keep"]'); await sleep(200);
      const after2 = await G(p);
      // the run menu's Skip training: the SAME dialog
      await p.click("#pvMenuBtn"); await sleep(150); await p.click('#pvMenu [data-act="skipTraining"]'); await sleep(250);
      const d2 = await p.evaluate(() => { const d = document.querySelector("[data-training-skip]"); return d && { title: d.querySelector("h2").textContent, btns: [...d.querySelectorAll("button")].map(b => b.textContent) }; });
      const opened = await p.evaluate(() => BLOOM_TRAINING_UI.stats.skipDialog.opened);
      await Promise.all([p.waitForURL(u => new URL(u).pathname === TITLE_PATH, { timeout: 20000 }), p.click('[data-skip="skip"]')]);
      await p.waitForFunction(() => window.MENU_DEV && MENU_DEV.ready, null, { timeout: 20000 }).catch(() => {});
      const t = await p.evaluate(() => ({ rec: JSON.parse(localStorage.getItem("strange-bloom.training")), title: document.title, state: MENU_DEV.entry.state, tag: !document.querySelector(".mm-tag").hidden, coach: !!document.querySelector(".tc-layer") }));
      check(d1 && d1.modal === "true" && d1.title === "Skip training?" && /start it again any time from the main menu/.test(d1.body) && J(d1.btns) === J(["Keep training", "Skip training"]) && d1.focus === "Keep training" && d1.pvInert
        && !k1.open && k1.rec === null && k1.mounted && !k1.pvInert && after1.index === before.index && after2.index === before.index && d2 && J(d2.btns) === J(d1.btns) && opened === 3
        && t.rec.status === "skipped" && t.title === "Strange Bloom — Unknown Soils" && t.state === "menu" && !t.tag && !t.coach && !p.errs.length,
        `${B} G7 · Skip: the coach's Skip Tutorial and the menu's Skip training open the SAME production dialog (an aria-modal alertdialog — "Skip training?" · Keep training / Skip training — focus on Keep training, the game inert behind it; never window.confirm); Escape and Keep training return to the same lesson and record nothing; confirming records "skipped" and fades back to the real Strange Bloom title (no coach left; the Recommended tag gone)`,
        `lesson ${before.index} kept · ${t.rec.status}`);
      proof.skip = { dialog: d1, escapeKeeps: !k1.open && k1.rec === null, keepKeeps: after2.index === before.index, menuSameDialog: !!d2, dialogsOpened: opened, confirmedRecord: t.rec.status, landedOn: t.title };
      // Main menu from training writes nothing; a completed record is never downgraded by a later skip
      if (FULL) {
        const c2 = await ctx({ record: null }), q = watch(await c2.newPage()); await q.goto(RUN + "?training=1"); await coached(q); await sleep(200);
        await q.click("#pvMenuBtn"); await Promise.all([q.waitForURL(u => new URL(u).pathname === TITLE_PATH, { timeout: 20000 }), q.click('#pvMenu [data-act="mainMenu"]')]);
        const mm = await q.evaluate(() => localStorage.getItem("strange-bloom.training")); await c2.close();
        const c3 = await ctx({ record: "completed" }), r = watch(await c3.newPage()); await r.goto(RUN + "?training=1"); await coached(r); await sleep(200);
        await r.click(".tc-card .tc-skip"); await sleep(150); await Promise.all([r.waitForURL(u => new URL(u).pathname === TITLE_PATH, { timeout: 20000 }), r.click('[data-skip="skip"]')]);
        const kept = await r.evaluate(() => JSON.parse(localStorage.getItem("strange-bloom.training")).status); await c3.close();
        check(mm === null && kept === "completed", `${B} G7b · Main menu from a guided training records nothing (it may be offered again); a skip after a completed training keeps "completed" (never downgraded)`, `main menu → ${mm} · completed + skip → ${kept}`); }
      await c.close(); }

    // ---------------------------------------------------------------- G9 · the title: Recommended, the first-run dialog
    if (want("G9") && FULL) {
      const menuReady = p => p.waitForFunction(() => window.MENU_DEV && MENU_DEV.ready, null, { timeout: 30000 });
      const M = p => p.evaluate(() => ({ tag: !document.querySelector(".mm-tag").hidden, name: document.querySelector('.mm-item[data-act="training"]').textContent.replace(/\s+/g, " ").trim(), items: [...document.querySelectorAll(".mm-item")].map(b => b.dataset.act),
        dlg: document.querySelector('[data-dialog="recommend"]').open, state: MENU_DEV.entry.state, rec: localStorage.getItem("strange-bloom.training"), prompts: MENU_DEV.entry.stats.prompts, pool: MENU_DEV.entry.prefetch ? MENU_DEV.entry.prefetch.first.seed : null,
        survey: MENU_DEV.entry.survey ? { adopted: MENU_DEV.entry.survey.stats.adopted } : null }));
      // no record: tag, the one dialog (never auto-training), Go to Expedition → skipped → the survey on the prefetched sector
      const c = await ctx({ record: null }), p = watch(await c.newPage()); await p.goto(MENU + "?bg=3&workers=3&sector=77"); await menuReady(p); await sleep(400);
      const m0 = await M(p); await shot(p, "01-menu-training-recommended.png");
      await p.click('.mm-item[data-act="begin"]'); await sleep(500);
      const m1 = await M(p), dl = await p.evaluate(() => { const d = document.querySelector('[data-dialog="recommend"]'); return { h: d.querySelector("h2").textContent, btns: [...d.querySelectorAll(".mm-btn")].map(b => b.textContent), focus: document.activeElement && document.activeElement.textContent, url: location.href }; });
      await shot(p, "02-first-begin-recommendation.png");
      await p.click('[data-act="recommend-expedition"]'); await p.waitForFunction(() => MENU_DEV.entry.state === "survey", null, { timeout: 30000 }).catch(() => {});
      const m2 = await M(p);
      check(m0.tag && /Training Recommended/.test(m0.name) && J(m0.items) === J(["begin", "training", "settings", "credits"]) && m1.dlg && m1.state === "menu" && m1.prompts === 1 && new URL(dl.url).pathname === MENU_PATH
        && J(dl.btns) === J(["Go to Expedition", "Start Training (~5 min)"]) && m2.state === "survey" && JSON.parse(m2.rec).status === "skipped" && !m2.tag && m2.survey && m2.survey.adopted,
        `${B} G9a · no training record: TRAINING carries "Recommended" (read with the label); the first BEGIN EXPEDITION opens ONE dialog ("${dl.h}": Go to Expedition · Start Training (~5 min)) and never starts training by itself; Go to Expedition records "skipped", drops the tag and enters the Destination Survey on the sector prefetched under the dialog`,
        J({ name: m0.name, prompts: m1.prompts, rec: m2.rec && JSON.parse(m2.rec).status, adopted: m2.survey && m2.survey.adopted }));
      // back to the title (a fresh page, the record kept): no tag, no prompt, TRAINING still there
      await p.goto(MENU + "?bg=4&workers=3&sector=78"); await menuReady(p); await sleep(300);
      await p.click('.mm-item[data-act="begin"]'); await p.waitForFunction(() => MENU_DEV.entry.state === "survey", null, { timeout: 30000 }).catch(() => {});
      const m3 = await M(p); await c.close();
      // Start Training (~5 min): the training run through the black; nothing recorded
      const c2 = await ctx({ record: null }), q = watch(await c2.newPage()); await q.goto(MENU + "?bg=5&workers=3&sector=79"); await menuReady(q); await sleep(300);
      await q.click('.mm-item[data-act="begin"]'); await sleep(400);
      await q.click('[data-act="recommend-training"]');   // (BLOOM-033) the training run starts inside index.html (no navigation)
      await coached(q); const tr = await q.evaluate(() => ({ rec: localStorage.getItem("strange-bloom.training"), training: !!BLOOM_RUN.training, lesson: BLOOM_TRAINING_UI.guide.director.index + 1 }));
      await c2.close();
      // completed: no tag, no prompt
      const c3 = await ctx({ record: "completed" }), r = watch(await c3.newPage()); await r.goto(MENU + "?bg=6&workers=3&sector=80"); await menuReady(r); await sleep(300);
      const m4 = await M(r); await r.click('.mm-item[data-act="begin"]'); await r.waitForFunction(() => MENU_DEV.entry.state === "survey", null, { timeout: 30000 }).catch(() => {});
      const m5 = await M(r); await c3.close();
      check(!m3.tag && m3.prompts === 0 && m3.state === "survey" && J(m3.items) === J(m0.items) && tr.training && tr.rec === null && tr.lesson === 1 && !m4.tag && J(m4.items) === J(m0.items) && m5.state === "survey" && m5.prompts === 0 && !p.errs.length && !q.errs.length && !r.errs.length,
        `${B} G9b · with a "skipped" or "completed" record there is no tag and EXPEDITION goes straight to the survey (it never asks again); Start Training (~5 min) opens the real training run (lesson 1) through the black — inside index.html — and writes nothing; TRAINING stays in the menu in every state`,
        J({ skipped: [m3.tag, m3.prompts], startTraining: tr, completed: [m4.tag, m5.prompts] }));
      proof.firstRun = { noRecord: { tag: m0.tag, label: m0.name, dialog: dl, choice: "Go to Expedition", record: m2.rec && JSON.parse(m2.rec).status, survey: m2.state, prefetchAdopted: m2.survey && m2.survey.adopted },
        afterSkipped: { tag: m3.tag, prompts: m3.prompts }, startTraining: tr, completed: { tag: m4.tag, prompts: m5.prompts } }; }

    // ---------------------------------------------------------------- G10 · viewports, resize, reduced motion (+ Firefox 1280×800)
    if (want("G10")) {
      const sizes = FULL ? [[1024, 768, "17-1024x768.png"], [1280, 800, null], [1440, 900, "18-1440x900.png"], [860, 700, "21-narrow-860.png"]] : [[1280, 800, "19-firefox-1280.png"]];
      const out = [];
      for (const [w, h, name] of sizes) {
        const c = await ctx({ vw: w, vh: h }), p = watch(await c.newPage()); await p.goto(RUN + "?training=1"); await coached(p); await sleep(400);
        const a = await G(p); await usePrim(p, "play-pause"); await pastStart(p); for (let k = 0; k < 40 && (await G(p)).id === "natural-spread"; k++) { await adv(p, 10); await sleep(40); }
        await usePrim(p, "bubble"); await sleep(200); await usePrim(p, "chill_hollow"); await sleep(300);
        const b = await G(p);                                                               // lesson 5: the banner's Would help
        if (name) await shot(p, name);
        await usePrim(p, "cold"); await settle(p); const cR = await G(p);                   // lesson 6 in the Adapt room
        const okOf = s => s.card && s.card[0] >= 15.5 && s.card[1] >= 15.5 && s.card[2] <= s.vw - 15.5 && s.card[3] <= s.vh - 15.5 && ovA(s.card, s.prim && s.prim.rect) === 0 && s.sw <= s.vw;
        out.push({ size: `${w}x${h}`, ok: [a, b, cR].map(okOf), sides: [a.side, b.side, cR.side], docked: [a, b, cR].every(s => w < 900 ? s.side.startsWith("dock") : true) });
        if (w === 1280 && FULL) {
          // resize: the region target (map geometry) and the card follow at once
          await p.click('#dr .dr-room:not([hidden]) .rb.back'); await settle(p);
          const g1 = await p.evaluate(() => BLOOM.planetView.instance.regionPoint("chill_hollow"));
          await p.setViewportSize({ width: 1100, height: 700 }); await sleep(500);
          const g2 = await p.evaluate(() => BLOOM.planetView.instance.regionPoint("chill_hollow")), sR = await G(p);
          const tracked = Math.abs(g1.x - g2.x) + Math.abs(g1.y - g2.y) > 4 && sR.card[2] <= sR.vw - 15.5 && sR.card[3] <= sR.vh - 15.5;
          out.push({ size: "1280x800→1100x700", ok: [tracked], sides: [sR.side], moved: [Math.round(g1.x), Math.round(g1.y), Math.round(g2.x), Math.round(g2.y)] });
        }
        if (!p.errs.length) out[out.length - 1].errs = 0; else out[out.length - 1].errs = p.errs.length;
        await c.close(); }
      check(out.every(o => o.ok.every(Boolean) && (o.docked === undefined || o.docked) && !o.errs),
        `${B} G10a · the callout fits every viewport (${out.map(o => o.size).join(" · ")}): inside the window with its 16 px gutter, never on the target, no horizontal page scroll; below 900 px it docks full width; it re-places at once when the window resizes (the map-region geometry is re-read)`,
        out.map(o => `${o.size}: ${o.sides.join("/")}${o.moved ? " moved " + o.moved.join(",") : ""}`).join(" · "));
      proof.viewports[bname] = out;
      if (FULL) {
        // reduced motion: Settings "reduced" (and the OS) → no pulse, no glide, no entrance; Settings "full" over a reduced OS → motion
        const probe = async opts => { const c = await ctx(opts), p = watch(await c.newPage()); await p.goto(RUN + "?training=1"); await coached(p); await sleep(400);
          await usePrim(p, "play-pause"); await sleep(250);
          const r = await p.evaluate(() => { const ring = document.querySelector(".tc-ring"), card = document.querySelector(".tc-card"), cs = getComputedStyle(card);
            return { rm: document.querySelector(".tc-layer").classList.contains("tc-rm"), ringAnim: ring ? getComputedStyle(ring).animationName : null, cardAnim: cs.animationName, transition: cs.transitionProperty, smooth: getComputedStyle(document.documentElement).scrollBehavior }; });
          if (opts.shot) await shot(p, opts.shot); await c.close(); return r; };
        const s1 = await probe({ settings: { motion: "reduced" }, shot: "20-reduced-motion.png" }), s2 = await probe({ rm: true }), s3 = await probe({ settings: { motion: "full" }, rm: true });
        check(s1.rm && s1.ringAnim === "none" && s1.cardAnim === "none" && !/left|top/.test(s1.transition) && s2.rm && s2.ringAnim === "none" && !/left|top/.test(s2.transition) && !s3.rm && s3.ringAnim !== "none" && s1.smooth !== "smooth",
          `${B} G10b · reduced motion (the Settings choice, else the OS): no pulsing ring, no gliding card (opacity only), no entrance lift, no smooth scrolling; Settings "full" over a reduced OS keeps the motion`, J({ settings: s1, os: s2, full: s3 }));
        proof.accessibility.reducedMotion = { settingsReduced: s1, osReduced: s2, settingsFullOverOs: s3 }; } }

    // ---------------------------------------------------------------- G11 · disposal / remount: nothing left behind; G12 anchors, speed, network
    if (want("G11") && FULL) {
      const c = await ctx(), p = watch(await c.newPage()); await p.goto(RUN + "?training=1"); await coached(p); await sleep(300);
      const r = await p.evaluate(async () => { const L = window.__L, tot = k => (L.add[k] || 0) - (L.rem[k] || 0), keys = ["click", "keyup", "focusin", ...["run-ready", "play-pause", "speed", "region-select", "upgrade-preview", "upgrade-purchase", "growth-focus", "local-upgrade", "bubble-collect", "win"].map(t => "bloom:" + t)];
        const snap = () => keys.map(tot), wait = ms => new Promise(r => setTimeout(r, ms)), G = BLOOM_TRAINING_UI.guide;
        const mounted = snap(); G.unmount(); await wait(50); const off = snap(), layers0 = document.querySelectorAll(".tc-layer").length;
        G.mount(); await wait(400); const again = snap(); G.unmount(); G.mount(); G.unmount(); G.mount(); await wait(300); const thrice = snap();
        return { mounted, off, again, thrice, layers0, layers: document.querySelectorAll(".tc-layer").length, cards: document.querySelectorAll(".tc-card").length, links: document.querySelectorAll("link[data-training-coach]").length };
      });
      check(r.off.every((v, k) => v === r.mounted[k] - 1) && J(r.again) === J(r.mounted) && J(r.thrice) === J(r.mounted) && r.layers0 === 0 && r.layers === 1 && r.cards === 1 && r.links === 1 && !p.errs.length,
        `${B} G11 · unmount removes every coach listener (click / keyup / focusin + the ten bloom:*), its timer, frame loop and elements; remounting three times leaves exactly one set — no leak`, J(r));
      // G12 · anchors unique with the coach mounted; speed real
      const an = await p.evaluate(() => { const names = ["biomass", "coverage", "sky", "play-pause", "speed", "run-menu", "map", "inspect", "readout", "limiting-factor", "colony-status", "raw-signals", "growth-focus", "focus-balanced", "focus-roots", "focus-leaves", "focus-seeds",
          "local-upgrade", "local-rootNetwork", "local-leafCanopy", "local-seedReserve", "upgrades", "board-spread", "board-adapt", "board-terraform", "upgrade-cold", "upgrade-humid", "upgrade-seedOut", "upgrade-warm", "upgrade-drought", "report", "report-continue", "run-actions", "action-restartTraining", "action-skipTraining", "action-mainMenu"];
        return names.map(n => [n, document.querySelectorAll(`[data-tutorial="${n}"]`).length]).filter(([, k]) => k !== 1); });
      await p.click("#pvPause"); const sp = []; for (let k = 0; k < 3; k++) { await p.click("#pvSpeed"); await sleep(120); sp.push(await p.evaluate(() => BLOOM_RUN_UI.adapter.run().speed)); }
      const ev = await p.evaluate(() => window.__EV.filter(e => e.type === "speed").map(e => e.detail.speed));
      check(!an.length && J(sp) === "[2,4,1]" && J(ev) === "[2,4,1]", `${B} G12a · with the coach mounted every production anchor still resolves to exactly one element, and the speed control stays real (1× → 2× → 4× → 1×, each a bloom:speed)`, an.map(a => a.join(":")).join(", ") || "all unique");
      await c.close(); }

    const external = reqs.filter(u => !u.startsWith(ORIGIN) && !u.startsWith("data:") && !u.startsWith("blob:") && !u.startsWith("about:"));
    check(!external.length && !errsAll.length, `${B} G12b · ${reqs.length} requests, all to the local test server (no external network); no console error or page error across the browser groups`, external.slice(0, 3).join(" | ") || errsAll.slice(0, 3).join(" | "));
    await browser.close();
  }
  server.close();

  // ---------------------------------------------------------------- proof
  if (EVIDENCE) {
    const steps = trainingSteps();
    proof.generatedAt = new Date().toISOString();
    proof.steps = steps.map((s, k) => ({ index: k + 1, id: s.id, title: typeof s.title === "function" ? "Grow to <winPct>% (from the run's own threshold)" : s.title,
      copy: { default: (() => { try { return s.body(fakeCtx()); } catch (e) { return null; } })() }, targets: describeTargets(s.id), predicate: PREDICATES[s.id] }));
    proof.trainingConfig = D.training.config; proof.winThreshold = D.planets.training_grounds.winThreshold;
    proof.checks = { pass: passes, fail: fails, results };
    proof.requirements = REQUIREMENTS;
    fs.writeFileSync(path.join(EVD, "guided-training-proof.json"), JSON.stringify(proof, null, 1) + "\n");
    console.log(`INFO  evidence  — ${path.relative(ROOT, EVD)}: guided-training-proof.json + stills`);
  }
  console.log(fails ? `\n${fails} check(s) FAILED, ${passes} passed  (${((Date.now() - t0) / 1000).toFixed(1)} s)` : `\nALL ${passes} CHECKS PASS  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

// the milestone's 96 required QA items → the checks above that prove them (also in guided-training-proof.json)
const REQUIREMENTS = {
  1: "N1", 2: "N2", 3: "N3", 4: "G1", 5: "G1", 6: "G1", 7: "G2", 8: "G2", 9: "N4a G2", 10: "N4b G2", 11: "N5a", 12: "N5b N5c G5a", 13: "G3b", 14: "G3b", 15: "G3b N5b",
  16: "G3b", 17: "G4 N5c", 18: "N7 N5d", 19: "G3b G3d", 20: "G3b G3d G6", 21: "G3b G3c", 22: "N5b G3d", 23: "G4 N5c", 24: "G3b G3d N4c", 25: "N9 G4", 26: "G3b", 27: "G4 N5c",
  28: "G3b", 29: "G4 N5c", 30: "G3d", 31: "G3b G3d", 32: "G3d", 33: "G3b G3d", 34: "G4 N5c", 35: "G4 N5c", 36: "N5d G4", 37: "G3d G4", 38: "N5b G3b", 39: "N4b N9", 40: "G12a",
  41: "G5b", 42: "G5b", 43: "G5a N5c", 44: "G5a", 45: "G3c G4", 46: "G3c G10a (every target re-found each frame; no element kept)", 47: "G10a", 48: "G3c", 49: "G6", 50: "G2",
  51: "G6", 52: "G10b", 53: "G10a", 54: "G10a G3", 55: "G10a", 56: "G10a", 57: "G3 G7 G10a [firefox]", 58: "G10a", 59: "G2 G6 G7", 60: "G7", 61: "G7", 62: "G7", 63: "G7", 64: "G5b",
  65: "G7b", 66: "G9a", 67: "G9a G9b", 68: "G9b", 69: "G9a", 70: "G9a", 71: "G9b", 72: "G9a", 73: "G9b", 74: "G9a", 75: "G9a G9b", 76: "G3e", 77: "G3e", 78: "G3e", 79: "G3e", 80: "G3e",
  81: "G3e", 82: "G8", 83: "G8", 84: "G3e", 85: "G7b N11", 86: "N8 G3f", 87: "N10 G12a", 88: "N8", 89: "N7", 90: "N9 (engine / config / traits byte-identical)", 91: "N9",
  92: "tools/expedition-handoff-check.js (29th suite, run alongside)", 93: "G12b", 94: "G12b G1b G3f", 95: "G3f G12b", 96: "G11 N5e",
};

// the proof's descriptions of each lesson's target strategy and completion predicate (the code is resources/training/training-steps.js)
const PREDICATES = {
  start: "the real run is running AND ticks > 0", "natural-spread": "Green Verge has ≥ 6 living tiles (VERGE_ESTABLISHED; tick 122 on the real run)",
  biomass: "bloom:bubble-collect for THE scripted bubble's tile (how: click or auto) — placed once via BLOOM_RUN_UI.placeBubble('landing_meadow')",
  "inspect-chill": "Chill Hollow is the home selection, or the open room's context (reached through the real UI); or already viable (solved early: acknowledged)",
  "limiting-factor": "bloom:upgrade-preview for cold seen (hover or keyboard focus); or Cold owned; or Chill Hollow already viable",
  "adapt-buy": "Chill Hollow fitness > the run's grow.growThresh (0.55) — by Cold Tolerance (taught) or Warm the Sky (acknowledged)",
  spread: "any real Spread-board upgrade owned (Seed Output taught; Early Maturity acknowledged)", "growth-focus": "any living region's growth focus is not Balanced",
  "local-upgrade": "any region owns a local upgrade", "terraform-preview": "bloom:upgrade-preview for humid seen; or Humidify owned; or Thirsty Flats already viable",
  tradeoff: "Thirsty Flats fitness > grow.growThresh — by Humidify (taught) or Drought Adaptation (Reed Fen's cost acknowledged)",
  sacrifice: "Salt Pan is the home selection or the open room's context (Salt Handling is never asked for)", goal: "the run's own bloom:win (or run().won) — nothing else",
};
function describeTargets(id) {
  return ({ start: "play-pause (Planet View) · the open room's Resume", "natural-spread": "region green_verge (Planet View geometry) · play-pause while paused", biomass: "the bubble's map point (renderer.clientOf) · biomass",
    "inspect-chill": "region chill_hollow · in a room: its region-strip chip", "limiting-factor": "the banner's real Would help Cold Tolerance, else the Adapt tool · in another room: the Adapt tab · in Adapt: upgrade-cold",
    "adapt-buy": "upgrade-cold (room-aware as lesson 5) + region chill_hollow", spread: "upgrade-seedOut in Spread · the Spread tab / tool", "growth-focus": "growth-focus in Region Inspect › Colony · the Colony tab · the Region Inspect tab · the banner's Inspect region · region landing_meadow / the Regions tool",
    "local-upgrade": "local-upgrade (room-aware as lesson 8)", "terraform-preview": "upgrade-humid in Terraform · the Terraform tab / tool / Would help + region thirsty_flats",
    tradeoff: "upgrade-humid (room-aware) + regions thirsty_flats, reed_fen; keeps the room's Region effect readout and preview column clear", sacrifice: "region salt_pan · in a room: its region-strip chip",
    goal: "coverage + speed · in a room: Resume" })[id];
}
function fakeCtx() {
  const r = id => ({ id, name: id.split("_").map(w => w[0].toUpperCase() + w.slice(1)).join(" "), viable: false, living: id === "landing_meadow" ? 10 : 0, fitness: 0.4, limitKey: { chill_hollow: "Temperature", thirsty_flats: "Water", salt_pan: "Soil" }[id] || null, limitText: id === "chill_hollow" ? "too cold for your plant" : null, area: 80 });
  const ids = ["landing_meadow", "green_verge", "chill_hollow", "reed_fen", "thirsty_flats", "salt_pan"];
  return { run: { ticks: 0, running: false, won: false }, hud: { biomass: 150, coverage: 0.02, winAt: 0.65, winPct: 65 }, region: r, regions: () => ids.map(r), upgrade: id => ({ id, price: 140, owned: false, tier: 0 }), owned: () => 0,
    spreadOwned: () => [], colony: () => ({ localPrice: 90 }), previewOf: () => ({ available: true, gain: ["thirsty_flats"], lose: [], worse: ["reed_fen"] }), ui: { room: null }, seen: { previews: new Set(), bubbles: [] }, mem: {} };
}
