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
// What it does, before any module:
//   · file:// (or any non-http(s) address): the full product cannot run there (ES modules, module workers, the Destination Survey),
//     so it shows a plain notice — STRANGE BLOOM / UNKNOWN SOILS / "This build needs to be opened through a web server." and the
//     local command — and loads NOTHING else (no engine script, no module, no request that would fail into a blank page).
//   · http(s): loads the BLOOM classic scripts the survey's workers and the expedition handoff need, in order, then imports the
//     page composer (./main-menu-page.js) and mounts the title with the configuration above. All orchestration lives there.
// Classic script, no dependencies; paths resolve from this file's own URL, never from guesses about the document's folder.
(function () {
  "use strict";
  var me = document.currentScript;
  if (!me) return;
  var HERE = new URL(me.src, location.href), REPO = new URL("../../", HERE), d = me.dataset;
  var TITLE = "Strange Bloom", SUBTITLE = "Unknown Soils", PORT = "8767";
  // the classic scripts the title page carries (the expedition handoff last: it reads window.BLOOM)
  var CLASSIC = ["content/config.js", "content/traits.js", "planets/first_bloom.js", "content/archetypes.js", "content/scenarios.js", "content/play.js",
    "resources/bloom-sim.js", "resources/bloom-gen.js", "resources/bloom-validate.js", "resources/bloom-witness.js", "resources/bloom-archetype.js",
    "resources/bloom-scenario.js", "resources/bloom-play.js", "resources/expedition/expedition-handoff.js"];
  var boot = window.BLOOM_TITLE_BOOT = { served: /^https?:$/.test(location.protocol), repo: REPO.href, run: d.run || null, title: d.title || null, scripts: [], state: "booting", error: null };

  if (!boot.served) { boot.state = "needs-server"; notice(); return; }

  var pending = CLASSIC.length;
  CLASSIC.forEach(function (f) {
    var s = document.createElement("script"); s.src = new URL(f, REPO).href; s.async = false;   // async=false: executed in this order
    s.onload = function () { boot.scripts.push(f); if (--pending === 0) mount(); };
    s.onerror = function () { fail("could not load " + f); };
    document.head.appendChild(s);
  });

  function mount() {
    import(new URL("./main-menu-page.js", HERE).href).then(function (m) {
      boot.state = "mounted";
      m.mountTitlePage({ app: document.getElementById(d.app || "app"), runHref: d.run || "demos/demo-run.html", titleHref: d.title || null });
    }, function (e) { fail(e && e.message || String(e)); });
  }
  function fail(msg) { if (boot.state === "failed") return; boot.state = "failed"; boot.error = msg; console.error("Strange Bloom: the title could not start (" + msg + ")"); }

  /** The file:// notice: the title's own words and colours, inline styles only (no stylesheet, no font, no request). */
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
    var n = document.createElement("main"); n.className = "tb-needs"; n.id = "needsServer"; n.setAttribute("role", "alert");
    n.innerHTML = "<h1></h1><p class=\"tb-sub\"></p><p class=\"tb-msg\">This build needs to be opened through a web server.</p>" +
      "<p class=\"tb-how\">From the game folder run <code>python3 -m http.server " + PORT + "</code> and open <code>http://localhost:" + PORT + "/</code></p>";
    n.querySelector("h1").textContent = TITLE; n.querySelector(".tb-sub").textContent = SUBTITLE;
    (document.body || document.documentElement).appendChild(n);
  }
})();
