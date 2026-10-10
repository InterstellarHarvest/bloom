// BLOOM — the Strange Bloom app's document boot (BLOOM-030; BLOOM-033 one document). The ONE classic script the production document
// (the repository root index.html) loads: it says where things are and mounts the app. demos/main-menu.html (a developer alias) is the
// same thin document one folder down.
//
//   <div id="app"></div>
//   <script src="resources/main-menu/title-boot.js"></script>            (root index.html)
//
//   data-app     the id of the app element (default "app")
//
// What it does, in order:
//   1. loads the BLOOM classic scripts the title and the Destination Survey need (engine, content, validation path), in order;
//   2. mounts the app (resources/app/app-controller.js: TITLE · SURVEY · RUN, all inside this document);
//   3. right after the title is up, loads the RUN's classic scripts in the background (the run UI, the plant sprite runtime, the training
//      world, the GameSession) — the app awaits them before the first run, so the title never waits for gameplay code.
//   · http(s) (development, GitHub Pages): the app is imported as an ES module (its survey workers are module workers).
//   · (BLOOM-031) file:// — a double-clicked index.html, the player's local copy — the SAME modules come from the generated portable
//     runtime (dist/portable/, built from this source by `npm --prefix tools run build:portable`) through the module seam
//     resources/portable/module-loader.js. A plain notice remains only for a portable runtime that is missing or broken (a damaged
//     download), never a blank page. Since BLOOM-033 nothing has to survive a document navigation: the selected planet stays in memory.
// Classic script, no dependencies; paths resolve from this file's own URL, never from guesses about the document's folder.
(function () {
  "use strict";
  var me = document.currentScript;
  if (!me) return;
  var HERE = new URL(me.src, location.href), REPO = new URL("../../", HERE), d = me.dataset;
  var TITLE = "Strange Bloom", SUBTITLE = "Unknown Soils";
  // the classic scripts the title and the survey need (the module seam last: it reads window.BLOOM)
  var CLASSIC = ["content/config.js", "content/traits.js", "planets/first_bloom.js", "content/archetypes.js", "content/scenarios.js", "content/play.js",
    "resources/bloom-sim.js", "resources/bloom-gen.js", "resources/bloom-validate.js", "resources/bloom-witness.js", "resources/bloom-archetype.js",
    "resources/bloom-scenario.js", "resources/bloom-play.js", "resources/portable/module-loader.js"];
  // (BLOOM-033) the run's classic scripts, after the title is up: the training world, the run UI boundary, the production Planet View on the
  // canonical surface, the Organic Hybrid sprite runtime (generated atlas → model → components → compositor → FX) under the plant
  // specimen, the Terraform globe helper, the rooms, the gameplay transition, the run report, and the GameSession that composes them
  var RUN = ["planets/training_grounds.js", "content/training.js", "resources/run-ui/run-ui-adapter.js", "resources/planet-surface/planet-surface.js",
    "resources/run-ui/run-map-renderer.js", "resources/run-ui/planet-view.js", "resources/plant-visual/generated/plant-atlas.js",
    "resources/plant-visual/plant-visual-model.js", "resources/plant-visual/plant-components.js", "resources/plant-visual/plant-compositor.js",
    "resources/plant-visual/plant-fx.js", "resources/run-ui/plant-specimen.js", "resources/run-ui/terraform-globe.js", "resources/run-ui/decision-rooms.js",
    "resources/run-ui/gameplay-transition.js", "resources/run-ui/run-report.js", "resources/run/game-session.js"];
  var served = /^https?:$/.test(location.protocol);
  var boot = window.BLOOM_TITLE_BOOT = { served: served, portable: !served, repo: REPO.href, scripts: [], runScripts: [], state: "booting", error: null, runReady: null };

  function loadAll(list, into) {
    return new Promise(function (resolve, reject) {
      var pending = list.length;
      list.forEach(function (f) {
        var s = document.createElement("script"); s.src = new URL(f, REPO).href; s.async = false;   // async=false: executed in this order
        s.onload = function () { into.push(f); if (--pending === 0) resolve(); };
        s.onerror = function () { reject(new Error("could not load " + f)); };
        document.head.appendChild(s);
      });
    });
  }

  loadAll(CLASSIC, boot.scripts).then(mount, function (e) { fail(e.message); });

  function mount() {
    var page = new URL("../app/app-controller.js", HERE).href;
    (served ? import(page) : window.BLOOM.modules.load(page)).then(function (m) {
      var runReady = boot.runReady = new Promise(function (res, rej) { boot._run = { res: res, rej: rej }; });
      runReady.catch(function (e) { console.error("Strange Bloom: the game could not load its run files (" + (e && e.message) + ")"); });
      m.mountApp({ app: document.getElementById(d.app || "app"), runScripts: runReady });
      boot.state = "mounted";
      // the run's scripts: after the title's first frame, in the background
      requestAnimationFrame(function () { loadAll(RUN, boot.runScripts).then(boot._run.res, boot._run.rej); });
    }, function (e) { fail(e && e.message || String(e)); });
  }
  function fail(msg) { if (boot.state === "failed") return; boot.state = "failed"; boot.error = msg; console.error("Strange Bloom: the title could not start (" + msg + ")");
    if (boot.portable) notice(); }

  /** (BLOOM-031) A local copy that cannot start (portable runtime missing / broken): the title's own words and colours, inline styles only. */
  function notice() {
    document.title = TITLE + " — " + SUBTITLE;
    var app = document.getElementById(d.app || "app"); if (app) app.hidden = true;
    var css = document.createElement("style");
    css.textContent = "html,body{margin:0;height:100%;background:#0a0810;color:#f3e9d2}" +
      ".tb-needs{min-height:100%;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:32px 16px;text-align:center;" +
      "font-family:\"Palatino Linotype\",Palatino,\"Book Antiqua\",\"Iowan Old Style\",Georgia,serif}" +
      ".tb-needs h1{margin:0;font-size:clamp(30px,7vw,56px);letter-spacing:.09em;text-transform:uppercase;color:#f1d58a;line-height:1}" +
      ".tb-needs .tb-sub{margin:0 0 10px;font-weight:700;font-size:clamp(12px,2vw,16px);letter-spacing:.42em;text-transform:uppercase;color:#d9cbaa}" +
      ".tb-needs .tb-msg{margin:0;font-size:19px;max-width:34em}" +
      ".tb-needs .tb-how{margin:0;font-size:14px;color:rgba(217,203,170,.75);max-width:40em;line-height:1.6}" +
      ".tb-needs code{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13px;color:#f3e9d2;background:rgba(241,213,138,.1);border:1px solid rgba(214,174,96,.4);border-radius:4px;padding:2px 6px;white-space:nowrap}";
    document.head.appendChild(css);
    var n = document.createElement("main"); n.className = "tb-needs"; n.id = "bootFailed"; n.setAttribute("role", "alert");
    n.innerHTML = "<h1></h1><p class=\"tb-sub\"></p><p class=\"tb-msg\">This copy of the game could not start.</p>" +
      "<p class=\"tb-how\">Its files may be incomplete: download the whole game folder again and open <code>index.html</code>.</p>";
    n.querySelector("h1").textContent = TITLE; n.querySelector(".tb-sub").textContent = SUBTITLE;
    (document.body || document.documentElement).appendChild(n);
  }
})();
