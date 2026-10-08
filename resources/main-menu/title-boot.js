// BLOOM — the Strange Bloom title's document boot (BLOOM-030). The ONE classic script an entry document loads for the title: the
// repository root index.html (the canonical production entry) and demos/main-menu.html (the developer / compatibility alias) are
// both thin documents that only say where things are:
//
//   <div id="app"></div>
//   <script src="resources/main-menu/title-boot.js" data-run="demos/demo-run.html"></script>           (root index.html)
//   <script src="../resources/main-menu/title-boot.js" data-run="demo-run.html" data-title="../index.html"></script>   (the alias)
//
//   data-run     the gameplay page, relative to the document (training, expeditions)
//   data-title   the CANONICAL title, relative to the document: where gameplay and training come back to. Omitted = this very page
//                (the root title returns to itself, at whatever address the player used: / or /index.html)
//   data-app     the id of the app element (default "app")
//
// What it does: loads the BLOOM classic scripts the survey and the expedition handoff need, in order, then the page composer
// (./main-menu-page.js), and mounts the title with the configuration above. All orchestration lives there.
//   · http(s) (development, GitHub Pages): the composer is imported as an ES module (its survey workers are module workers).
//   · (BLOOM-031) file:// — a double-clicked index.html, the player's local copy — the SAME composer and modules come from the generated
//     portable runtime (dist/portable/, built from this source by `npm --prefix tools run build:portable`) through the module seam
//     resources/portable/module-loader.js, loaded here after the classic scripts. The old "needs a web server" notice is retired; a
//     plain notice remains only for a portable runtime that is missing or broken (a damaged download), never a blank page.
// Classic script, no dependencies; paths resolve from this file's own URL, never from guesses about the document's folder.
(function () {
  "use strict";
  var me = document.currentScript;
  if (!me) return;
  var HERE = new URL(me.src, location.href), REPO = new URL("../../", HERE), d = me.dataset;
  var TITLE = "Strange Bloom", SUBTITLE = "Unknown Soils";
  // the classic scripts the title page carries (the expedition handoff last: it reads window.BLOOM)
  var CLASSIC = ["content/config.js", "content/traits.js", "planets/first_bloom.js", "content/archetypes.js", "content/scenarios.js", "content/play.js",
    "resources/bloom-sim.js", "resources/bloom-gen.js", "resources/bloom-validate.js", "resources/bloom-witness.js", "resources/bloom-archetype.js",
    "resources/bloom-scenario.js", "resources/bloom-play.js", "resources/expedition/expedition-handoff.js"];
  var served = /^https?:$/.test(location.protocol);
  var boot = window.BLOOM_TITLE_BOOT = { served: served, portable: !served, repo: REPO.href, run: d.run || null, title: d.title || null, scripts: [], state: "booting", error: null };
  // (BLOOM-031) file://: the module seam last (it loads the portable runtime on first use)
  var scripts = served ? CLASSIC : CLASSIC.concat(["resources/portable/module-loader.js"]);

  var pending = scripts.length;
  scripts.forEach(function (f) {
    var s = document.createElement("script"); s.src = new URL(f, REPO).href; s.async = false;   // async=false: executed in this order
    s.onload = function () { boot.scripts.push(f); if (--pending === 0) mount(); };
    s.onerror = function () { fail("could not load " + f); };
    document.head.appendChild(s);
  });

  function mount() {
    var page = new URL("./main-menu-page.js", HERE).href;
    (served ? import(page) : window.BLOOM.modules.load(page)).then(function (m) {
      boot.state = "mounted";
      m.mountTitlePage({ app: document.getElementById(d.app || "app"), runHref: d.run || "demos/demo-run.html", titleHref: d.title || null });
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
