// BLOOM — the Challenge world screen (BLOOM-036B): PREPARING CHALLENGE WORLD → the CHALLENGE PLANET DOSSIER → BEGIN CHALLENGE.
// docs/CHALLENGES_SYSTEM_v1.md §3 (flow), §7 (screen). Replaces the Destination Survey inside a Challenge: ONE generated planet, no
// alternatives, no reroll.
//
//   import { ChallengeWorldScreen } from "<repo>/resources/challenges/challenge-world-screen.js";
//   const s = new ChallengeWorldScreen(host, { challenge, species, prep, reducedMotion, descent, onBack });
//   await s.ready (drawn) · s.prepared (the selection's outcome) · s.state ("preparing" | "ready" | "failed" | "departing" | "departed" | "disposed")
//   s.begin() · s.back() · s.focus() · s.dispose()
//
// PREPARING (036B1, seed banks). The launch's ChallengeWorldPrep picks the species' ONE prevalidated bank world and rebuilds it; the screen
// shows only the real phases it reports — "Selecting a proven world" · "Building the planet" (the exact accepted attempt regenerated in a
// worker) · "Verifying the planet" (its fingerprint checked against the bank's proof). No Challenge proof runs here (it was done offline),
// so nothing claims to be checking Challenge conditions. No percentage, no rejected world. If the world was already built while the player
// read Choose Plant Species, the dossier is drawn under the black and the PREPARING state is never shown (no flash). Back cancels the build.
// A stale bank / a fingerprint mismatch is an invariant failure: the screen says the world could not be prepared and offers Back.
// THE DOSSIER. CHALLENGE (name, what changes, the strategic idea) · YOUR PLANT (the species — a prescribed one says so — its specimen with
// any prescribed adaptations, and a prescribed starting state) · YOUR WORLD (a PlanetSphereView of the EXACT accepted planet, its name, world
// type, World Seed, the ground the plant can live on at landing, the conditions rows and the expected hazards — the survey's own dossier
// data, computed for this species and starting state). (036B1, PMO: no separate "Foothold" line — the S1 connected-foothold metric stays in
// the instance, candidate.playability.s1, for validation, studies and QA; beside the arrival bar it read as a contradiction.) Primary BEGIN CHALLENGE, secondary Back. Nothing here regenerates, rerolls or
// offers another world: entering the Challenge again from the hub is the route to a fresh instance.
//
// DEPARTURE. BEGIN CHALLENGE plays the survey's dramatic departure: the dossier recedes, the same live globe grows toward the viewer and the
// shared AtmosphereTransition closes; only under full cover is descent.onCovered(detail) called (the app mounts the run from
// detail.instance — the exact planet object), then the screen disposes itself.
import { PlanetSphereView, PlanetSphereRenderer } from "../planet-sphere/planet-sphere-view.js";
import { AtmosphereTransition } from "../atmosphere-transition/atmosphere-transition.js";
import { ico } from "../ui/bloom-icons.js";
// the launch's parts, from this one lazily loaded module (the app loads it on the first BEGIN CHALLENGE; file://: the portable seam)
export { ChallengeWorldPrep, newLaunchSeed } from "./challenge-world-prep.js";

const CSS_URL = new URL("./challenge-world-screen.css", import.meta.url).href;
function attachCss() { if (document.querySelector('link[data-bloom="challenge-world"]')) return;
  const l = document.createElement("link"); l.rel = "stylesheet"; l.href = CSS_URL; l.dataset.bloom = "challenge-world"; document.head.appendChild(l); }
const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const pct = x => Math.round(x * 100);
const GLOBE_DISTANCE = 3.4, DOLLY_TO = 1.45;
const T = { recede: 320, recedeRm: 200, dolly: 2500, dollyDelay: 120, cloudsAfter: 1000, minPrepare: 450 };
const ROW_CAT = { climate: ["temperature", "temp"], water: ["water", "water"], soil: ["soil", "soil"], atmosphere: [null, "sky"], solar: ["hazard", "heat"] };
const PHASES = ["select", "build", "verify"];
// (036C1) a landing where under LOW_ARRIVAL of the land suits the plant: the share is shown as it is (never faked) and this line says why the
// run is still playable — the landing region is the protected refuge the plant lives in while it adapts (presentation only)
const LOW_ARRIVAL = 0.05, LOW_ARRIVAL_NOTE = "Little or none of this world suits your plant yet: your landing region keeps it alive at first. Adapt before you spread.";
const SKIP_WAIT = 250;   // a world already prepared shows the dossier directly (drawn under the black): no PREPARING flash

export class ChallengeWorldScreen {
  /**
   * challenge       the resolved Challenge (canonical object)
   * species         the canonical species object (the player's choice, or the Challenge's prescribed one)
   * prep            the launch's ChallengeWorldPrep (owned by the caller: it outlives this screen across a species change)
   * descent         { onCovered(detail, info), transition, seed, onError } — the departure consumer (the app), as the survey's
   * onBack          Back (preparing: cancels the build first)
   * onBegin(detail)  BEGIN CHALLENGE was pressed (also dispatched as a bubbling "bloom:begin-challenge" event on the screen)
   */
  constructor(host, { challenge, species, prep, reducedMotion = null, descent = null, onBack = null, onBegin = null } = {}) {
    if (!host || typeof host.appendChild !== "function") throw new TypeError("ChallengeWorldScreen: host must be a DOM element");
    if (!prep || prep.challenge !== challenge) throw new TypeError("ChallengeWorldScreen: the launch's preparation is for another Challenge");
    if (descent && typeof descent.onCovered !== "function") throw new TypeError("ChallengeWorldScreen: descent.onCovered must be a function");
    this.host = host; this.challenge = challenge; this.species = species; this.prep = prep; this.descent = descent; this.onBack = onBack; this.onBegin = onBegin;
    this.forcedReducedMotion = reducedMotion; this.mq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
    this.state = "preparing"; this.phase = "select"; this.instance = null; this.view = null; this.disposed = false;
    this.stats = { t0: performance.now(), readyMs: null, phases: [], begins: 0, backs: 0, outcome: null };
    attachCss();
    this._build();
    const css = this._css = new Promise(res => { const l = document.querySelector('link[data-bloom="challenge-world"]'), done = () => res();
      if (!l || l.sheet) return done(); l.addEventListener("load", done, { once: true }); l.addEventListener("error", done, { once: true }); setTimeout(done, 3000); });
    this.prepared = this._prepare();
    // ready (the consumer lifts the black after it): the stylesheet, and — briefly — a world that is already prepared, so it is drawn directly
    this.ready = css.then(() => Promise.race([this.prepared.catch(() => {}), new Promise(r => setTimeout(r, SKIP_WAIT))])).then(() => this);
  }

  get reducedMotion() { return this.forcedReducedMotion ?? !!(this.mq && this.mq.matches); }
  get prescribed() { return this.challenge.launch.species.policy === "prescribed"; }

  focus() { if (this.state === "ready") this.title.focus({ preventScroll: true }); else this.backBtn.focus({ preventScroll: true }); }

  /** Back: preparing → the build is cancelled (its worker terminated); ready / failed → leave. The consumer decides where (§3). */
  back() {
    if (this.disposed || this.state === "departing" || this.state === "departed") return false;
    if (this.state === "preparing") this.prep.cancel();
    this.stats.backs++; this.state = "leaving"; this.root.dataset.state = "leaving";
    if (this.onBack) this.onBack(this);
    return true;
  }

  /**
   * BEGIN CHALLENGE (ready only): the detail is announced, then (with `descent`) the dramatic departure; under full cover
   * descent.onCovered(detail) mounts the run from detail.instance. Returns the detail (null outside the ready state).
   *   detail.instance   the Challenge instance (challenge-world.js makeInstance): THE run's Challenge, species, starting state and planet
   *   detail.planet / species / challenge / candidate / render / dossier — the instance's own objects; view / container: the live globe
   */
  begin() {
    if (this.state !== "ready") return null;
    const X = this.instance;
    const detail = { instance: X, planet: X.planet, species: X.species, challenge: X.challenge, candidate: X.candidate, render: X.render, dossier: X.dossier,
      view: this.view, container: this.globe, screen: this };
    this.stats.begins++; this.state = "departing"; this.root.dataset.state = "departing";
    let go = null;
    if (this.descent) {
      detail.descent = new Promise(res => { go = res; }).then(() => this._depart(detail));
      detail.descent.catch(err => { const h = this.descent.onError; if (h) h(err, detail); else console.error("ChallengeWorldScreen: departure failed", err); });
    }
    try { this.root.dispatchEvent(new CustomEvent("bloom:begin-challenge", { detail, bubbles: true })); if (this.onBegin) this.onBegin(detail); }
    finally { if (go) go(); }                 // a throwing listener must not strand the screen in "departing"
    return detail;
  }

  dispose() {
    if (this.disposed) return; this.disposed = true;
    if (this.state === "preparing") this.prep.cancel();
    this.state = "disposed";
    if (this._dollyFrame) cancelAnimationFrame(this._dollyFrame);
    for (const a of this._anims || []) a.cancel();
    if (this.view) { this.view.dispose(); this.view = null; }
    if (this.renderer) { this.renderer.dispose(); this.renderer = null; }
    if (this._atx && !this._atx.running) { this._atx.dispose(); this._atx = null; }
    this.root.removeEventListener("click", this._onClick); this.root.removeEventListener("keydown", this._onKey);
    this.root.remove();
  }

  // ---------------------------------------------------------------- preparing
  async _prepare() {
    this._phase("select");
    let out;
    try { out = await this.prep.select(this.species, { onProgress: p => this._phase(p.phase) }); }
    catch (err) { if (this.disposed) return { ok: false, cancelled: true }; this._failed(String(err && err.message || err)); throw err; }
    if (this.disposed || this.state !== "preparing") return out;
    if (!out.ok) { if (!out.cancelled) this._failed(out.code || out.error || "error"); return out; }
    // a world that arrives while the screen is still under the black (it was prepared on Choose Plant Species): straight to the dossier.
    // Otherwise PREPARING was visible: keep it on screen at least a beat, so it never flashes
    const at = performance.now() - this.stats.t0;
    if (at > SKIP_WAIT) { const left = T.minPrepare - at; if (left > 0 && !this.reducedMotion) await new Promise(r => setTimeout(r, left)); }
    else this.stats.skippedPreparing = true;
    await this._css;   // (036B1) a bank world can arrive before the stylesheet: the dossier (globe, transition) is laid out only with it
    if (this.disposed || this.state !== "preparing") return out;
    this.instance = out.instance; this._fillDossier(out.instance);
    this.state = "ready"; this.root.dataset.state = "ready"; this.stats.readyMs = Math.round(performance.now() - this.stats.t0); this.stats.outcome = "ready";
    if (this.descent) this._transition().prepare();
    requestAnimationFrame(() => { if (this.state === "ready") this.title.focus({ preventScroll: true }); }); // the dossier's heading: the screen changed
    return out;
  }

  _phase(p) {
    if (this.disposed || !PHASES.includes(p)) return;
    if (p !== this.phase || !this.stats.phases.length) this.stats.phases.push({ phase: p, at: Math.round(performance.now() - this.stats.t0) });
    this.phase = p; this.root.dataset.phase = p;
    const k = PHASES.indexOf(p);
    this.steps.forEach((li, i) => { li.dataset.step = i < k ? "done" : i === k ? "now" : "next"; li.setAttribute("aria-current", String(i === k)); });
    this.status.textContent = this.steps[k].textContent.trim();
  }

  _failed(code) {
    this.state = "failed"; this.root.dataset.state = "failed"; this.stats.outcome = code || "error";
    // (036B1) an invariant failure, never a search for another world: a stale / missing bank, or a world that did not match its proof
    this.failEl.querySelector("p").textContent = code === "STALE_BANK" || code === "NO_BANK" ? "This Challenge's proven worlds are out of date, so none can be prepared."
      : code === "FINGERPRINT_MISMATCH" ? "The prepared world did not match its proof, so it was not used." : "Something went wrong while preparing this Challenge world.";
    this.backBtn.focus({ preventScroll: true });
  }

  // ---------------------------------------------------------------- DOM
  _build() {
    const ch = this.challenge, sp = this.species, r = this.root = document.createElement("section");
    r.className = "cw"; r.dataset.state = "preparing"; r.dataset.challenge = ch.id; r.dataset.species = sp.id; r.setAttribute("aria-label", `${ch.name}: Challenge world`);
    if (this.forcedReducedMotion === true) r.classList.add("rm");
    const tid = "cw-t-" + Math.floor(Math.random() * 1e9).toString(36);
    r.innerHTML = `
      <header class="cw-head">
        <button type="button" class="cw-btn ghost cw-back" data-act="back">${ico("back")}<span>Back</span></button>
        <div class="cw-title"><span class="cw-kicker">${ico(ch.presentation.icon)}<span>Challenge · <b>${esc(ch.name)}</b></span></span>
          <h1 class="cw-h-prep">Preparing challenge world</h1><h1 class="cw-h-ready">Your challenge world</h1></div>
      </header>
      <div class="cw-prep" role="group" aria-labelledby="${tid}-p">
        <div class="cw-prep-card">
          <div class="cw-orbit" aria-hidden="true"><i></i><i></i><i></i></div>
          <h2 id="${tid}-p">Preparing challenge world</h2>
          <p class="cw-for">${esc(ch.name)} · ${esc(sp.name)}</p>
          <ol class="cw-steps">
            <li data-step="now">Selecting a proven world</li>
            <li data-step="next">Building the planet</li>
            <li data-step="next">Verifying the planet</li>
          </ol>
          <p class="cw-status sr-only" role="status" aria-live="polite"></p>
        </div>
        <div class="cw-fail" hidden><p></p><span>Go back.</span></div>
      </div>
      <div class="cw-body">
        <div class="cw-globe-col"><div class="cw-stage"><div class="cw-globe"></div></div><p class="cw-seed"></p></div>
        <aside class="cw-dossier" aria-labelledby="${tid}">
          <div class="cw-d-main" tabindex="0" role="region" aria-label="Challenge details">
            <div class="cw-pair">
              <section class="cw-sec cw-challenge">
              <p class="cw-sec-k">${ico(ch.presentation.icon)}<span>The challenge</span></p>
              <h3 class="cw-ch-name">${esc(ch.name)}</h3>
              <dl class="cw-ch-rows">
                ${this._goalRow(window.BLOOM_DATA.config.win)}
                <div><dt>What changes</dt><dd>${esc(ch.presentation.tagline)}</dd></div>
                <div><dt>Strategic idea</dt><dd>${esc(ch.presentation.strategicIdea)}</dd></div>
              </dl>
              </section>
              <section class="cw-sec cw-plant">
              <p class="cw-sec-k">${ico("adapt")}<span>Your plant</span></p>
              <div class="cw-plant-row"><canvas class="cw-specimen" width="84" height="98" aria-hidden="true"></canvas>
                <div><h3 class="cw-sp-name">${esc(sp.name)}</h3><p class="cw-sp-role">${esc(sp.presentation.roleLabel)}</p>
                  ${this.prescribed ? `<p class="cw-sp-note">${ico("info")}<span>This Challenge prescribes the plant.</span></p>` : ""}
                  <p class="cw-start"></p><p class="cw-closed" hidden></p></div></div>
              </section>
            </div>
            <section class="cw-sec cw-world">
              <p class="cw-sec-k">${ico("world")}<span>Your world</span></p>
              <h2 id="${tid}" tabindex="-1"></h2>
              <p class="cw-type"></p><p class="cw-tagline"></p>
              <div class="cw-hab"><div class="cw-hab-top"><span>Ground your plant can live on at landing</span><b></b></div>
                <div class="cw-bar" role="img"><i class="g"></i><i class="y"></i><i class="r"></i></div>
                <div class="cw-bar-key" aria-hidden="true"><span class="ok">${ico("check")}<span>Suits</span></span><span class="warn">${ico("alert")}<span>Marginal</span></span><span class="bad">${ico("x")}<span>Hostile</span></span></div>
                <p class="cw-hab-note" hidden>${ico("info")}<span>${esc(LOW_ARRIVAL_NOTE)}</span></p></div>
              <dl class="cw-rows"></dl>
              <section class="cw-hazards"><h3>${ico("hazard")}Expected hazards</h3><ul></ul></section>
            </section>
          </div>
          <div class="cw-actions">
            <button type="button" class="cw-btn ghost" data-act="back">${ico("back")}<span>Back</span></button>
            <button type="button" class="cw-btn go" data-act="begin">${ico("challenge")}<span>Begin challenge</span></button>
          </div>
        </aside>
      </div>`;
    this.host.appendChild(r);
    const q = s => r.querySelector(s);
    this.backBtn = q(".cw-back"); this.title = q(".cw-dossier h2"); this.status = q(".cw-status"); this.steps = [...r.querySelectorAll(".cw-steps li")];
    this.failEl = q(".cw-fail"); this.dossier = q(".cw-dossier"); this.globe = q(".cw-globe"); this.beginBtn = q('[data-act="begin"]');
    this.beginBtn.setAttribute("aria-label", `Begin challenge: ${ch.name}`);
    this._onClick = e => { const b = e.target.closest("button"); if (!b || !r.contains(b)) return;
      if (b.dataset.act === "back") this.back(); else if (b.dataset.act === "begin") this.begin(); };
    this._onKey = e => { if (e.key === "Escape" && (this.state === "preparing" || this.state === "ready" || this.state === "failed")) { e.preventDefault(); this.back(); } };
    r.addEventListener("click", this._onClick); r.addEventListener("keydown", this._onKey);
    this._paintPlant();
  }

  /** (036D1) a gated Challenge's completion contract ("To win": BLOOM · n% of land alive AND each condition); "" for the ordinary Bloom. */
  _goalRow(winAt) {
    const G = window.BLOOM.challengeCompletion.goal(this.challenge, winAt); if (!G.gated) return "";
    return `<div class="cw-goal" data-gated="true"><dt>To win</dt><dd><p class="cw-goal-l"><b>${esc(G.bloom.title.toUpperCase())}</b><span>${esc(G.bloom.body)}</span></p>` +
      G.conditions.map(k => `<p class="cw-goal-l cond" data-condition="${esc(k.type)}"><b>${esc(k.title.toUpperCase())}</b><span>${esc(k.body)}</span></p>`).join("") + `</dd></div>`;
  }

  _fillDossier(X) {
    const d = X.dossier, q = s => this.root.querySelector(s), h = d.habitable;
    // (036D1) the goal quotes THIS planet's own Bloom threshold
    const goal = q(".cw-goal"); if (goal) goal.outerHTML = this._goalRow(X.planet.winThreshold ?? window.BLOOM_DATA.config.win);
    this.title.textContent = d.name;
    q(".cw-type").textContent = X.candidate.worldType;
    q(".cw-tagline").textContent = d.tagline || "";
    q(".cw-hab-top b").textContent = `${pct(h.green)}% of the land`;
    const low = h.green < LOW_ARRIVAL; q(".cw-hab-note").hidden = !low; this.root.dataset.lowArrival = low ? "1" : "0";
    const bar = q(".cw-bar"); bar.setAttribute("aria-label", `At landing: ${pct(h.green)}% of the land suits your plant, ${pct(h.yellow)}% is marginal, ${pct(h.red)}% is hostile`);
    [["g", h.green], ["y", h.yellow], ["r", h.red]].forEach(([k, v]) => { bar.querySelector("." + k).style.width = (v * 100).toFixed(1) + "%"; });
    [["ok", "Suits", h.green], ["warn", "Marginal", h.yellow], ["bad", "Hostile", h.red]].forEach(([k, w, v]) => { q(`.cw-bar-key .${k} span`).textContent = `${w} ${pct(v)}%`; });
    q(".cw-rows").innerHTML = d.rows.map(r => { const [cat, icon] = ROW_CAT[r.id] || [null, "info"];
      return `<div class="cw-row"${cat ? ` data-cat="${cat}"` : ""}><dt><span class="cw-row-i" aria-hidden="true">${ico(icon)}</span>${esc(r.label)}</dt><dd><b>${esc(r.word)}</b><span class="cw-row-v">${esc(r.value)}</span></dd></div>`; }).join("");
    q(".cw-hazards ul").innerHTML = d.challenges.length ? d.challenges.map(c => `<li>${esc(c.text)}${c.share != null ? ` <small>· ${pct(c.share)}% of land</small>` : ""}</li>`).join("")
      : "<li>Nothing stands out: most land suits your plant from the start.</li>";
    q(".cw-seed").textContent = `World Seed ${X.worldSeed} · ${X.candidate.worldType}`;
    this.root.dataset.fingerprint = X.fingerprint; this.root.dataset.worldSeed = String(X.worldSeed);
    // one renderer over the whole screen (the survey's arrangement): the globe's box can grow to the screen on departure and the canvas follows
    this.renderer = new PlanetSphereRenderer(this.root);
    this.view = new PlanetSphereView(this.globe, { renderer: this.renderer, planet: X.planet, render: X.render, interactive: true, reducedMotion: this.forcedReducedMotion, distance: GLOBE_DISTANCE, yaw: 0.35,
      ariaLabel: `${d.name}: drag sideways or press the left and right arrow keys to spin it` });
    this._globeRole();
    this._paintPlant();
  }

  /** The plant: its real specimen (with any prescribed adaptations) and the prescribed starting state in words. */
  _paintPlant() {
    const B = window.BLOOM, st = B.challenges.startingStateOf(this.challenge), c = this.root.querySelector(".cw-specimen"), line = this.root.querySelector(".cw-start");
    const traits = {}; for (const id of st ? st.adaptations : []) traits[id] = (traits[id] || 0) + 1;
    const T = window.BLOOM_DATA.traits, name = id => (T.find(t => t.id === id) || { name: id }).name;
    line.textContent = st ? "Lands with " + [...Object.entries(traits).map(([id, n]) => name(id) + (n > 1 ? ` ×${n}` : "")), ...(st.biomass != null ? [`${st.biomass} Biomass`] : [])].join(" · ") + " (given by the Challenge)"
      : "Lands as it always does: nothing owned yet.";
    // (036C1) what that start closes for the whole run (engine-decided: BLOOM.challenges.closedByStart), so the player need not find it in Adapt
    const closed = B.challenges.closedByStart(this.challenge), cl = this.root.querySelector(".cw-closed");
    if (cl) { cl.hidden = !closed.length; cl.textContent = closed.map(t => `${t.name} is not available${t.why ? `: ${t.why}` : ""}.`).join(" "); }
    if (!B.plantSpecimen || !c || c.dataset.signature) return;
    try { const PE = B.plantEnvironment, img = B.plantSpecimen.drawSpecies(this.species, { traits, condition: "ok", scene: PE ? PE.showcase() : null });
      c.width = img.w; c.height = img.h; c.getContext("2d").putImageData(new ImageData(new Uint8ClampedArray(img.rgba), img.w, img.h), 0, 0); c.dataset.signature = img.signature || ""; }
    catch (err) { console.error("ChallengeWorldScreen: the specimen could not be drawn", err); }
  }

  // ---------------------------------------------------------------- departure (the survey's dramatic one, for one globe)
  /** (BLOOM-037, a11y) while the globe is interactive the view labels it; a labelled role-less <div> is not announced (axe aria-prohibited-attr) */
  _globeRole() { const g = this.globe; if (g.getAttribute("aria-label")) g.setAttribute("role", "img"); else g.removeAttribute("role"); }
  async _depart(detail) {
    const rm = this.reducedMotion, D = this.descent, anims = this._anims = [], ease = { easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards" };
    this.view.setInteractionEnabled(false); this._globeRole(); this.dossier.inert = true; this.root.querySelector(".cw-head").inert = true;
    anims.push(this.dossier.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: rm ? "none" : "translateX(48px)" }], { duration: rm ? T.recedeRm : T.recede, ...ease }));
    anims.push(this.root.querySelector(".cw-head").animate([{ opacity: 1 }, { opacity: 0 }], { duration: rm ? T.recedeRm : T.recede, ...ease }));
    if (!rm) this._dolly();
    const atx = this._transition(), own = !D.transition;
    try {
      if (!rm) await new Promise(res => setTimeout(res, T.cloudsAfter));
      const transition = await atx.run({ preset: "dramatic", reducedMotion: rm, origin: { x: 0.5, y: 0.5 }, seed: D.seed ?? null,
        onCovered: async info => {
          if (this.disposed) return;
          try { await D.onCovered(detail, info); } catch (err) { this._undo(); throw err; }
          if (!this.disposed) this.dispose();
        } });
      if (this.state === "departing") this.state = "departed";
      return { detail, transition };
    } catch (err) { if (this.state === "departing") this._undo(); throw err; }
    finally { if (own && this._atx) { this._atx.dispose(); this._atx = null; } }
  }
  _dolly() {
    // the globe's box grows to the whole screen (a scale + translate transform the renderer follows), then the camera dollies in
    const gr = this.globe.getBoundingClientRect(), sr = this.root.getBoundingClientRect();
    this._anims.push(this.globe.animate([{ transformOrigin: "0 0", transform: "none" },
      { transformOrigin: "0 0", transform: `translate(${(sr.left - gr.left).toFixed(2)}px, ${(sr.top - gr.top).toFixed(2)}px) scale(${(sr.width / gr.width).toFixed(5)}, ${(sr.height / gr.height).toFixed(5)})` }],
      { duration: 760, delay: 60, easing: "cubic-bezier(.45,0,.35,1)", fill: "forwards" }));
    const k0 = Math.sqrt(GLOBE_DISTANCE ** 2 - 1), R = k0 / Math.sqrt(DOLLY_TO ** 2 - 1), t0 = performance.now() + T.dollyDelay, view = this.view;
    const step = now => { this._dollyFrame = null; if (this.state !== "departing" || !view || view.disposed) return;
      const p = Math.min(1, Math.max(0, (now - t0) / T.dolly)); view.setDistance(Math.sqrt(1 + (k0 / Math.pow(R, Math.pow(p, 1.25))) ** 2));
      if (p < 1) this._dollyFrame = requestAnimationFrame(step); };
    this._dollyFrame = requestAnimationFrame(step);
  }
  _undo() {
    for (const a of this._anims || []) a.cancel(); this._anims = null;
    if (this._dollyFrame) cancelAnimationFrame(this._dollyFrame); this._dollyFrame = null;
    if (this.view) { this.view.setDistance(GLOBE_DISTANCE); this.view.setInteractionEnabled(true); this._globeRole(); }
    this.dossier.inert = false; this.root.querySelector(".cw-head").inert = false;
    this.state = "ready"; this.root.dataset.state = "ready"; this.title.focus({ preventScroll: true });
  }
  _transition() { return this.descent.transition || (this._atx || (this._atx = new AtmosphereTransition())); }
}
