// BLOOM — production run report (BLOOM-029E, Concept 18 family): the Bloom Report and the Extinction debrief as a large, centred,
// floating field-journal card over the dimmed Planet View. docs/GAMEPLAY_UI_CONVERGENCE_v1.md §7–§9.
//
// THE PAGE SUPPLIES TRUTH. Every fact shown here is adapter.report() — a plain copy of the run page's own winReport() / lossReport()
// (the calculations the engineering modal has always made: coverage, time, identity, the owned Adapt / Spread build and the Terraform
// steps as separate lists, regions held and given up with their named limiting factor, colony upgrades, real-plant analogs from the
// trait content, each scenario's final state, the loss reason and debrief copy). Nothing is re-derived: no "held", "gave up",
// extinction or scenario rule lives here. Every action is adapter.actions.reportAction(id) — the page's own continue-after-win,
// reload, player / training navigation (its confirm and its training-layer fade). The plant is the PRODUCTION plant specimen
// (resources/run-ui/plant-specimen.js) rendered from the real owned tiers; Terraform is shown apart, as what the sky became.
//
//   BLOOM.runReport.mount(planetView, { transition })   → the controller (also BLOOM.runReport.instance)
//
// Lifecycle: a win (bloom:win) or an extinction (the page's "loss" notice) → any open room is closed at once (nothing stale stays under
// the report) → the ONE gameplay transition (SUBDUED mist, shared with the rooms) conceals → at covered: render, show, make the Planet
// View inert / aria-hidden → reveal → focus enters the dialog. Keep playing → the mist again → at covered: hide, restore the view →
// ONLY after the reveal completes: the page's continue-after-win (the run is running again). Leaving the run entirely (menu / training
// actions) is the page's own navigation and its own fade: no cloud transition is layered over it.
// Dialog semantics: role=dialog aria-modal, focus trapped (Tab cycles inside), visible focus, Escape never dismisses (a win is not
// silently resumed; a loss cannot be dismissed into a dead run); win / loss read from the heading, the icon and the words, never colour.
// Anchors (028D1): report (this section), report-continue (Keep playing), run-actions (the actions group), action-<id> on each run action —
// while the report is open the Planet View menu's action-<id> copies are suspended (data-tutorial-covered), so exactly one reachable
// action-<id> exists at any time: the menu's while the run is on, the report's while it is over.
// Classic script, no dependencies besides BLOOM.plantSpecimen: boots over file:// (immediate open / close without the bridge).
(function (root) {
  "use strict";
  const I = {
    star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.25 4.15 1 5.85L12 16.9l-5.25 2.8 1-5.85L3.5 9.7l5.9-.9z"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>', check: '<path d="M5 12.5l4.5 4.5L19 7"/>', alert: '<path d="M12 5v9"/><circle cx="12" cy="18" r="1"/>',
    play: '<path d="M7.5 5l11 7-11 7z"/>', regions: '<rect x="3" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5"/>',
    adapt: '<path d="M5 19C5 10 10 5 20 4c0 10-5 15-14 15z"/><path d="M5 19l9-9"/>', terraform: '<circle cx="12" cy="12" r="6.2"/><path d="M2.5 10.2c6.5 4.2 12.5 4.2 19 0M2.5 13.8c6.5-4.2 12.5-4.2 19 0" opacity=".9"/>',
    science: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3"/><path d="M7.5 16h9"/>', colony: '<path d="M12 21v-9"/><path d="M12 12c-4 0-6-3-6-6 3 0 6 2 6 6zM12 12c0-4 2-6 6-6 0 3-2 6-6 6z"/>',
    clock: '<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>', world: '<circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4c3 3 3 13 0 16M12 4c-3 3-3 13 0 16"/>',
    pressure: '<path d="M4 8c3-2 5 2 8 0s5-2 8 0M4 12c3-2 5 2 8 0s5-2 8 0M4 16c3-2 5 2 8 0s5-2 8 0"/>', climate: '<path d="M3 8h10a2.5 2.5 0 1 0-2.5-2.5M3 12h15a2.5 2.5 0 1 1-2.5 2.5M3 16h8a2.5 2.5 0 1 1-2.5 2.5"/>',
    competition: '<path d="M12 21V9"/><path d="M12 9c-3 0-5-3-5-6 3 0 5 2 5 6zM12 12c0-4 2-6 5-6 0 3-2 6-5 6z"/><path d="M4 21l4-4M20 21l-4-4"/>',
    temp: '<path d="M10 4a2 2 0 0 1 4 0v9.5a4 4 0 1 1-4 0z"/><circle cx="12" cy="17" r="1.6"/>', humid: '<path d="M7 15.5a4 4 0 0 1 .6-7.95A5.5 5.5 0 0 1 18 9a3.25 3.25 0 0 1-.5 6.5H7z"/><path d="M9 18l-1 2.6M13 18l-1 2.6M17 18l-1 2.6"/>',
    leaf: '<path d="M5 19C5 10 10 5 20 4c0 10-5 15-14 15z"/><path d="M5 19l9-9"/>', journal: '<path d="M6 3h11a2 2 0 0 1 2 2v16H8a2 2 0 0 1-2-2z"/><path d="M6 3v16a2 2 0 0 0 2 2"/><path d="M10 8h5M10 12h5"/>',
    home: '<path d="M4 11l8-7 8 7"/><path d="M6 10v10h12V10"/>', restart: '<path d="M4 12a8 8 0 1 0 2.3-5.7"/><path d="M4 4v5h5"/>', info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><circle cx="12" cy="7.6" r=".9"/>',
  };
  const ico = (n, cls) => `<svg class="ic${cls ? " " + cls : ""}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${I[n] || I.info}</svg>`;
  const esc = t => String(t == null ? "" : t).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  const ROMAN = ["", "I", "II", "III", "IV", "V"];
  // presentation formatting only (the numbers are the report's): a signed value, a tenth, a percentage
  const r1 = v => Math.round(v * 10) / 10, sgn = v => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(r1(v))}`, pct = v => `${Math.round(v * 100)} %`;
  const ACT_ICON = { keepPlaying: "play", restartRun: "restart", restartTraining: "restart", mainMenu: "home", home: "home", playAgain: "restart", newWorld: "world", changeScenario: "climate", changePlanet: "world", skipTraining: "x", beginExpedition: "world" }; // (028D2) + the finished training's Begin Expedition
  const CAT_COLOR = { Hazard: ["#8a5bb8", "#efe5f8", "#5e3a86"], Water: ["#3b8fd0", "#dcecf8", "#23679f"], Temperature: ["#d9601f", "#fde6d6", "#9c3f0e"], Soil: ["#8a6a3e", "#f1e6d2", "#5f452a"],
    Seeds: ["#c58a1a", "#fbefcf", "#8a5d00"], Growth: ["#3f9d4b", "#e2f2d6", "#2a7636"], Reach: ["#1f8f8f", "#d8f1ef", "#136060"], "Sky temperature": ["#d9601f", "#fde6d6", "#9c3f0e"], Rain: ["#3b8fd0", "#dcecf8", "#23679f"] };
  const catStyle = c => { const k = CAT_COLOR[c]; return k ? `--cat:${k[0]};--cat-soft:${k[1]};--cat-dark:${k[2]}` : ""; };

  let instance = null;
  function mount(view, { transition = null } = {}) {
    if (instance) return instance;
    if (!view || !view.adapter || !view.rooms || typeof view.rooms.parts !== "function") throw new TypeError("BLOOM.runReport: needs the production Planet View instance (BLOOM.planetView.mount)");
    const A = view.adapter, PS = root.BLOOM.plantSpecimen; if (!PS) throw new TypeError("BLOOM.runReport: needs BLOOM.plantSpecimen");
    const T = transition || null, parts = view.rooms.parts();
    const mq = root.matchMedia ? root.matchMedia("(prefers-reduced-motion: reduce)") : null;
    const reduced = () => !!(mq && mq.matches) || document.documentElement.classList.contains("reduce-motion") || view.el.classList.contains("reduced") || !!(T && typeof T.reducedMotion === "function" && T.reducedMotion());
    const live = m => { const l = view.el.querySelector("#pvLive"); if (l) l.textContent = m; };
    const state = { open: false, busy: false, kind: null, opener: null, shown: 0 };
    const TL = [];
    const tnow = () => performance.now();

    // ---------------------------------------------------------------- the layer (inside the Planet View, above the rooms, below the toast)
    const layer = document.createElement("section"); layer.className = "rr"; layer.id = "rr"; layer.hidden = true; layer.dataset.tutorial = "report";
    layer.innerHTML = `<div class="rr-veil" aria-hidden="true"></div>` +
      `<article class="rr-card" id="rrCard" role="dialog" aria-modal="true" aria-labelledby="rrTitle" aria-describedby="rrSum" tabindex="-1">` +
        `<header class="rr-head"><span class="rr-kicker" id="rrKicker"></span><h2 id="rrTitle"></h2><p class="rr-sum" id="rrSum"></p></header>` +
        `<div class="rr-scroll" id="rrScroll">` +
          `<div class="rr-facts" id="rrFacts" role="list"></div>` +
          `<div class="rr-body"><div class="rr-plant" id="rrPlant"></div><div class="rr-text" id="rrText"></div></div>` +
        `</div>` +
        `<footer class="rr-actions" id="rrActions" data-tutorial="run-actions" role="group" aria-label="What next">` +
          `<button type="button" class="rr-btn primary" id="rrContinue" data-act="keepPlaying" data-tutorial="report-continue">${ico("play")}<span>Keep playing</span></button>` +
          `<div class="rr-acts" id="rrActs"></div>` +
        `</footer>` +
      `</article>`;
    view.el.appendChild(layer);
    const card = layer.querySelector("#rrCard"), $ = id => layer.querySelector("#" + id);
    // the production specimen, mounted once (hidden until the first report); re-rendered from the real owned tiers at each report
    const plantHost = document.createElement("div"); plantHost.className = "rr-spec"; $("rrPlant").appendChild(plantHost);
    const spec = PS.mount(plantHost, { reducedMotion: reduced });
    const specCap = document.createElement("div"); specCap.className = "rr-spec-cap"; plantHost.appendChild(specCap);
    const build = document.createElement("div"); build.className = "rr-build"; $("rrPlant").appendChild(build);
    // the 028D1 anchors this report now owns (the hidden shell's copies become data-tutorial-legacy)
    view.rooms.claimAnchors(["report", "report-continue", "run-actions"]);
    // the run menu's action-<id> anchors are suspended while the report is open (its own run actions carry them then) and restored after
    const coverMenu = on => view.el.querySelectorAll(on ? '#pvMenu [data-tutorial^="action-"]' : '#pvMenu [data-tutorial-covered^="action-"]').forEach(b => { if (on) { b.setAttribute("data-tutorial-covered", b.dataset.tutorial); b.removeAttribute("data-tutorial"); } else { b.setAttribute("data-tutorial", b.getAttribute("data-tutorial-covered")); b.removeAttribute("data-tutorial-covered"); } });

    // ---------------------------------------------------------------- rendering (from adapter.report() only)
    const chip = (text, cls, style) => `<span class="rr-chip${cls ? " " + cls : ""}"${style ? ` style="${style}"` : ""}>${text}</span>`;
    const tierWord = b => b.single ? b.name : `${b.name}${b.tier > 1 ? ` ${ROMAN[b.tier] || b.tier}` : ""}`;
    const identityLine = d => { const i = d.identity; return [i.planetName, i.kind === "procedural" ? `${i.archetypeName} · ${i.seedWord} ${i.seed}` : null].filter(Boolean).join(" · "); };
    function scenarioCards(d) {
      const out = [];
      if (d.pressure) { const P = d.pressure, o = P.offsets;
        out.push({ icon: "pressure", title: `Pressure · ${P.title}`, lines: [`${P.phaseName} (${Math.round(P.progress * 100)} % of the decline).`,
          `Your plant endured: moisture ${sgn(o.moist)}, temperature ${sgn(o.temp)} °C, radiation ${sgn(o.rad)}${P.done ? " — the final harsh state." : `. The decline continues if you keep playing (final: moisture ${sgn(P.max.moist)}, temperature ${sgn(P.max.temp)} °C, radiation ${sgn(P.max.rad)}).`}`] }); }
      if (d.competition) { const C = d.competition, left = C.left.map(r => r.name);
        out.push({ icon: "competition", title: `Competition · ${C.title}`, lines: [`Native plants held ${pct(C.startShare)} of the land at the start, ${pct(C.peakShare)} at their peak and ${pct(C.share)} now. ${C.contested} region${C.contested === 1 ? "" : "s"} became contested.`,
          left.length ? `Left to native vegetation: ${left.join(", ")}. You did not need to remove every native plant.` : "Hardly any native cover is left: your plant out-competed it almost everywhere."] }); }
      if (d.climate) { const C = d.climate;
        out.push({ icon: "climate", title: `Climate · ${C.title}`, lines: [`${C.steps} Terraform step${C.steps === 1 ? "" : "s"}${C.byAxis.length ? ` (${C.byAxis.map(x => x.text).join(", ")})` : ""}; instability peaked at ${pct(C.peak)} (${C.peakBand}) and is ${pct(C.level)} now.`,
          C.shockCount ? `${C.shockCount} climate shock${C.shockCount === 1 ? "" : "s"}: ${C.shocks.map(x => x.text).join(", ")}; largest temporary swing ${C.swing.map(x => x.text).join(", ")}.` : "No climate shock.", C.note] }); }
      return out.map(c => `<section class="rr-scn" aria-label="${esc(c.title)}"><h3>${ico(c.icon)}${esc(c.title)}</h3>${c.lines.map(l => `<p>${esc(l)}</p>`).join("")}</section>`).join("");
    }
    function render(d) {
      const win = d.kind === "win", i = d.identity;
      layer.dataset.kind = d.kind; layer.dataset.training = String(!!i.training);
      $("rrKicker").textContent = win ? (i.training ? "Training · field journal" : "Field journal · expedition debrief") : "Field journal · the run is over";
      $("rrTitle").innerHTML = `${ico(win ? "star" : "x", "rr-mark")}<span>${esc(d.heading)}</span>`;
      const world = identityLine(d);
      $("rrSum").textContent = win
        ? `You held ${d.coveragePct} % of the land of ${world}${i.scenarioActive ? ` under ${i.scenarioName}` : ""} in ${d.elapsed.text}.`
        : `No living plants were left anywhere for ${d.graceSeconds} s, so the run is over after ${d.elapsed.text} on ${world}${i.scenarioActive ? ` under ${i.scenarioName}` : ""}.`;
      const facts = win
        ? [["Coverage held", `${d.coveragePct} %`, `of land · goal ${Math.round(d.winAt * 100)} %`, "regions"], ["Time", d.elapsed.text, "to the bloom", "clock"], ["World", i.planetName, i.kind === "procedural" ? `${i.archetypeName} · ${i.seedWord} ${i.seed}` : "Authored world", "world"], ["Scenario", i.scenarioActive ? i.scenarioName : "Eden", i.scenarioActive ? "final state below" : "no pressure", "climate"]]
        : [["Reason", "Extinction", cap(d.reason || d.lostReason || ""), "x"], ["Lasted", d.elapsed.text, "before the end", "clock"], ["World", i.planetName, i.kind === "procedural" ? `${i.archetypeName} · ${i.seedWord} ${i.seed}` : "Authored world", "world"], ["Scenario", i.scenarioActive ? i.scenarioName : "Eden", i.scenarioActive ? "final state below" : "no pressure", "climate"]];
      $("rrFacts").innerHTML = facts.map(([k, v, n, ic]) => `<div class="rr-fact" role="listitem">${ico(ic)}<div><small>${esc(k)}</small><b>${esc(v)}</b><span>${esc(n)}</span></div></div>`).join("");
      // the plant: the production specimen from the real owned Adapt / Spread tiers (a loss shows its restrained unviable state; the anatomy stays true)
      const traits = {}, names = {}; for (const b of (d.built || [])) { traits[b.id] = b.tier; names[b.id] = b.name; }
      spec.highlight(null);
      spec.render({ traits, names, preview: null, colony: { living: win, establishment: 1, word: win ? "dense" : "none" }, focus: "balanced", local: null, condition: win ? "ok" : "bad", viable: win });
      specCap.innerHTML = `<b>${win ? "Your plant, as it bloomed" : "Your plant, as it was"}</b><small>${(d.built || []).length ? `${d.built.length} adaptation${d.built.length === 1 ? "" : "s"}` : "the unmodified pioneer"}</small>`;
      const builtChips = (d.built || []).map(b => chip(`${ico("leaf")}${esc(tierWord(b))}`, "ow", catStyle(b.uiCategory))).join("") || chip("The unmodified pioneer", "ow none");
      const tfChips = (d.terraform || []).map(t => chip(`${ico(t.axis === "temp" ? "temp" : "humid")}${esc(t.name)}${t.tier > 1 ? ` ${ROMAN[t.tier] || t.tier}` : ""}`, "ow", catStyle(t.uiCategory))).join("");
      build.innerHTML = `<section class="rr-sec" aria-label="Your plant became"><h3>${ico("adapt")}${win ? "Your plant became" : "Your plant had become"}</h3><div class="rr-chips">${builtChips}</div></section>` +
        (tfChips ? `<section class="rr-sec rr-sky" aria-label="You reshaped the sky"><h3>${ico("terraform")}You reshaped the sky</h3><div class="rr-chips">${tfChips}</div><p class="rr-note">Terraform changed the planet's sky, not your plant.</p></section>` : "");
      // the text column
      let html = "";
      if (win) {
        html += `<section class="rr-sec" aria-label="Regions bloomed"><h3>${ico("regions")}Regions bloomed</h3><div class="rr-chips">${(d.held || []).map(h => chip(`${ico("check")}${esc(h.region.name)}`, "rg ok")).join("") || chip("None yet", "rg")}</div></section>`;
        if ((d.colonyUpgrades || []).length) html += `<section class="rr-sec" aria-label="Colony upgrades"><h3>${ico("colony")}Colony upgrades</h3><div class="rr-chips">${d.colonyUpgrades.map(c => chip(`${ico("colony")}${esc(c.name)} <i>in ${esc(c.region.name)}</i>`, "rg")).join("")}</div></section>`;
        html += `<section class="rr-sec rr-why" aria-label="Why it worked"><h3>${ico("science")}Why it worked</h3><p>${esc(cap(d.why.lead))}${(d.gaveUp || []).length ? ", and your build gave these up:" : "."}</p>` +
          ((d.gaveUp || []).length ? `<ul class="rr-gave">${d.gaveUp.map(g => `<li>${ico("x")}<b>${esc(g.region.name)}</b> — ${esc(g.reason)}</li>`).join("")}</ul><p>${esc(d.why.gaveUpNote)}</p>` : "") + `</section>`;
        if ((d.analogs || []).length) html += `<section class="rr-sec rr-analog" aria-label="Real plants do this too"><h3>${ico("science")}Real plants do this too</h3><ul>${d.analogs.map(a => `<li><b>${esc(a.name)}</b> — ${esc(a.science)}</li>`).join("")}</ul></section>`;
      } else {
        html += `<section class="rr-sec rr-why" aria-label="What happened"><h3>${ico("alert")}What happened</h3><p>${esc(cap(d.debrief))}</p></section>`;
      }
      html += scenarioCards(d);
      $("rrText").innerHTML = html;
      // actions: the page's own (Keep playing first on a win; the player / training actions; Restart this run on a harness extinction)
      const acts = A.reportActions(), keep = acts.find(a => a.id === "keepPlaying");
      $("rrContinue").hidden = !keep;
      $("rrActs").innerHTML = acts.filter(a => a.id !== "keepPlaying").map(a => `<button type="button" class="rr-btn${a.primary && !keep ? " primary" : ""}" data-act="${esc(a.id)}" data-tutorial="action-${esc(a.id)}">${ico(ACT_ICON[a.id] || "play")}<span><b>${esc(a.label)}</b>${a.note ? `<small>${esc(a.note)}</small>` : ""}</span></button>`).join("");
      card.setAttribute("aria-label", `${d.heading}: ${$("rrSum").textContent}`);
    }

    // ---------------------------------------------------------------- open / close through the one gameplay transition
    const record = e => { TL.push(e); if (TL.length > 40) TL.shift(); return e; };
    const through = (kind, swap) => T && typeof T.run === "function" ? T.run({ onCovered: swap, kind }) : Promise.resolve((swap({ immediate: true, why: "no-transition" }), { ran: false, immediate: true, covered: false, error: null }));
    const entrance = ran => { card.classList.remove("entering"); if (!ran || reduced()) return; void card.offsetWidth; card.classList.add("entering"); card.addEventListener("animationend", () => card.classList.remove("entering"), { once: true }); };
    function open() {
      const d = A.report(); if (!d || state.open || state.busy) return false;
      state.busy = true; state.kind = d.kind; state.opener = document.activeElement && document.activeElement !== document.body ? document.activeElement : null;
      const DR = root.BLOOM.decisionRooms && root.BLOOM.decisionRooms.instance; if (DR && DR.state().room) DR.closeImmediate(); // nothing stale under the report
      const e = record({ kind: "report-open", report: d.kind, tStart: tnow(), runningBefore: A.run().running, tCovered: null, tSwapDone: null, tEnd: null, runningAtEnd: null, ran: false, immediate: null });
      layer.dataset.transitioning = "report-open"; view.el.dataset.transitioning = "report-open";
      through("report-open", () => {
        e.tCovered = tnow();
        render(d); layer.hidden = false; view.el.classList.add("in-report"); state.open = true; state.shown++; coverMenu(true);
        parts.forEach(x => { x.inert = true; x.setAttribute("aria-hidden", "true"); });
        live(d.kind === "win" ? `${d.heading}. The report is open.` : "Extinction. The run is over; the report is open.");
        e.tSwapDone = tnow();
      }).then(res => {
        e.tEnd = tnow(); e.ran = !!res.ran; e.immediate = !!res.immediate; e.runningAtEnd = A.run().running; e.error = res.error || null;
        delete layer.dataset.transitioning; delete view.el.dataset.transitioning; state.busy = false; entrance(res.ran);
        requestAnimationFrame(() => { if (state.open) { const f = $("rrContinue").hidden ? $("rrActs").querySelector("button") : $("rrContinue"); (f || card).focus(); } });
      });
      return true;
    }
    function keepPlaying() {
      if (!state.open || state.busy || state.kind !== "win") return false;
      state.busy = true;
      const e = record({ kind: "report-close", report: state.kind, tStart: tnow(), runningBefore: A.run().running, tCovered: null, tSwapDone: null, tEnd: null, tResume: null, runningAtEnd: null, ran: false, immediate: null });
      layer.dataset.transitioning = "report-close"; view.el.dataset.transitioning = "report-close";
      through("report-close", () => {
        e.tCovered = tnow();
        layer.hidden = true; card.classList.remove("entering"); view.el.classList.remove("in-report"); state.open = false; coverMenu(false);
        parts.forEach(x => { x.inert = false; x.removeAttribute("aria-hidden"); });
        e.tSwapDone = tnow();
      }).then(res => {
        e.tEnd = tnow(); e.ran = !!res.ran; e.immediate = !!res.immediate; e.error = res.error || null;
        delete layer.dataset.transitioning; delete view.el.dataset.transitioning; state.busy = false;
        A.actions.reportAction("keepPlaying");                                     // ONLY now: the page's own continue-after-win
        e.tResume = tnow(); e.runningAtEnd = A.run().running;
        live(`Keep playing: the run continues${A.run().running ? "" : " (paused)"}.`);
        const pb = view.el.querySelector("#pvPause"); if (pb) pb.focus(); else view.el.querySelector("#pvMap").focus();
      });
      return true;
    }
    layer.addEventListener("click", e => {
      const b = e.target.closest("[data-act]"); if (!b || state.busy) return;
      if (b.dataset.act === "keepPlaying") { keepPlaying(); return; }
      A.actions.reportAction(b.dataset.act);                                       // the page's own navigation (confirm / training fade)
    });
    // the focus trap: Tab cycles inside the dialog; Escape never dismisses (a win is not silently resumed; a loss cannot be dismissed into a dead run)
    const focusables = () => [...card.querySelectorAll("button:not([hidden]), [href], input, select, textarea, [tabindex]:not([tabindex='-1'])")].filter(x => !x.hidden && x.offsetParent !== null);
    card.addEventListener("keydown", e => {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); return; }
      if (e.key !== "Tab") return; const f = focusables(); if (!f.length) { e.preventDefault(); card.focus(); return; }
      const i = f.indexOf(document.activeElement);
      if (e.shiftKey && (i <= 0)) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && (i === -1 || i === f.length - 1)) { e.preventDefault(); f[0].focus(); }
    });
    document.addEventListener("keydown", e => { if (e.key === "Escape" && state.open) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);
    document.addEventListener("focusin", e => { if (state.open && !state.busy && !layer.contains(e.target)) { const f = focusables(); (f[0] || card).focus(); } });

    // ---------------------------------------------------------------- the run ended: the page's win event / loss notice
    const unsub = A.subscribe(ch => { if (!state.open && !state.busy && (ch.reasons.includes("win") || ch.reasons.includes("loss")) && A.report()) open(); });
    if (A.report() && (A.run().won || A.run().lost)) open();

    const api = {
      el: layer, card, adapter: A, open, keepPlaying, render: () => { const d = A.report(); if (d) render(d); return !!d; }, specimen: spec, transition: T,
      timeline: () => TL.map(e => ({ ...e })),
      state: () => ({ open: state.open, busy: state.busy, kind: state.kind, shown: state.shown, transitioning: !!layer.dataset.transitioning, actions: [...layer.querySelectorAll("[data-act]")].filter(b => !b.hidden).map(b => b.dataset.act) }),
      dispose() { unsub(); layer.remove(); instance = null; RR.instance = null; },
    };
    instance = api; RR.instance = api; return api;
  }
  const RR = { mount, version: 1, instance: null };
  root.BLOOM = Object.assign(root.BLOOM || {}, { runReport: RR });
})(typeof window !== "undefined" ? window : globalThis);
