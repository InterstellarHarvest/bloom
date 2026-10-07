// BLOOM — Expedition arrival (BLOOM-029F): the run page's continuation of the Destination Survey's DRAMATIC descent. docs/EXPEDITION_HANDOFF_v1.md §6.
//
// The survey's AtmosphereTransition closes full cloud cover over the title page; under it the exact planet is written to the
// session handoff and the gameplay page is opened. That page must never flash First Bloom, another world, the engineering shell or
// a blank page: before anything of it can paint, cover() puts a full-viewport ARRIVAL COVER up — the same atmospheric veil the
// transition's "covered" state shows (its radial veil colours), so the crossing reads as one descent. It is lifted only after the
// exact handoff planet has been accepted, the production Planet View is mounted, the canonical surface has painted and two more
// frames have had a chance to render. It does not duplicate AtmosphereTransition (no clouds, no cloud engine): one veil, one fade.
//
//   const arrival = BLOOM.expeditionArrival.cover();      // FIRST thing on an expedition boot (before the run starts)
//   arrival.lift()                                        // → Promise: after run-ready + the production surface painted + 2 frames, the veil fades
//   arrival.fail({ title, body, note, action: { label, href } })   // the explicit failure state in place of the run (never another world)
//   BLOOM.expeditionArrival.instance / .stats            // QA: timestamps of every step
//
// Reduced motion: the player's Settings motion choice (main-menu-data.js, through a guarded import over http(s), as the gameplay
// transition bridge reads it), else the OS; the lift is then a short fade. Classic script, no dependencies: boots over file://.
(function (root) {
  "use strict";
  const doc = root.document;
  const HERE = doc && doc.currentScript && doc.currentScript.src ? doc.currentScript.src : null;
  const SETTINGS_URL = HERE ? new URL("../main-menu/main-menu-data.js", HERE).href : "../resources/main-menu/main-menu-data.js";
  const canLoadModules = () => !!(root.location && /^https?:$/.test(root.location.protocol));
  const T = { lift: 720, liftRm: 220, paintWait: 4000, extraFrames: 2 }; // paintWait: the cap on waiting for the surface (a stalled GPU process must not strand the player)
  const STYLE_ID = "bloom-xp-style", Z = 9500; // above the Planet View and its rooms, below AtmosphereTransition (10000)
  const now = () => (root.performance ? performance.now() : Date.now());
  const frame = () => new Promise(r => requestAnimationFrame(() => r()));
  const CSS = `
.xp-cover{position:fixed; inset:0; z-index:${Z}; pointer-events:auto; contain:strict;
  background:radial-gradient(70% 60% at 50% 50%, #dfe7f6 0%, #c3d0ea 62%, #a9b9dc 100%)}
.xp-fail{position:fixed; inset:0; z-index:${Z}; display:flex; align-items:center; justify-content:center; padding:24px; color:#1f2a1d;
  background:radial-gradient(70% 60% at 50% 50%, #dfe7f6 0%, #c3d0ea 62%, #a9b9dc 100%); font:15px/1.5 ui-rounded,"SF Pro Rounded","Nunito","Trebuchet MS",system-ui,sans-serif}
.xp-fail .xp-card{width:min(520px, 100%); background:#fbf7ec; border:1px solid #cdbf9a; border-radius:14px; padding:22px 24px; box-shadow:0 18px 40px rgba(20,30,50,.18)}
.xp-fail h1{margin:0 0 6px; font-size:22px; letter-spacing:.5px; color:#3a2f12}
.xp-fail p{margin:6px 0 0} .xp-fail .xp-note{color:#5c5a4a; font-size:13px}
.xp-fail button{margin-top:16px; font:700 14px/1 inherit; font-family:inherit; letter-spacing:.6px; text-transform:uppercase; color:#fff8e6; background:#3f6b45; border:0; border-radius:10px; padding:11px 16px; cursor:pointer}
.xp-fail button:focus-visible{outline:3px solid #ffd479; outline-offset:2px}`;
  function ensureStyle() { if (!doc || doc.getElementById(STYLE_ID)) return; const s = doc.createElement("style"); s.id = STYLE_ID; s.textContent = CSS; doc.head.appendChild(s); }

  let settingsLoad = null;
  const osReduced = () => !!(root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches);
  /** true / false from the Settings motion choice, else the OS (null = follow it). Resolves quickly; never rejects. */
  function reducedMotion() {
    if (!settingsLoad) settingsLoad = canLoadModules() ? import(SETTINGS_URL).then(m => { try { return m.reducedMotionFor(m.readSettings(root.localStorage).motion); } catch (e) { return null; } }).catch(() => null) : Promise.resolve(null);
    return settingsLoad.then(s => (s === null ? osReduced() : s));
  }

  const A = { version: 1, instance: null, stats: null, T, Z };
  /** Put the arrival cover up now (idempotent per page). Returns the handle; also A.instance. */
  function cover() {
    if (A.instance) return A.instance;
    ensureStyle();
    const el = doc.createElement("div"); el.className = "xp-cover"; el.id = "expeditionCover"; el.setAttribute("aria-hidden", "true"); el.dataset.state = "covered";
    doc.body.appendChild(el);
    const stats = A.stats = { createdAt: Math.round(now()), readyAt: null, paintedAt: null, liftStartAt: null, liftedAt: null, framesAtLift: null, surfaceRepaintsAtLift: null, reducedMotion: null, waitedForPaintMs: null, state: "covered" };
    const H = A.instance = { el, stats, get state() { return stats.state; },
      /** Lift once the run is ready and the production surface has painted (+ T.extraFrames frames); resolves when the veil is gone. */
      async lift() {
        if (stats.state !== "covered") return stats.state;
        stats.state = "waiting";
        await new Promise(res => { if (root.BLOOM_RUN && root.BLOOM_RUN.started) return res(); doc.addEventListener("bloom:run-ready", () => res(), { once: true }); });
        stats.readyAt = Math.round(now());
        const t0 = now(), painted = () => { const pv = root.BLOOM && root.BLOOM.planetView && root.BLOOM.planetView.instance; if (!pv || !pv.renderer) return false; const i = pv.renderer.info(); return i.frames > 0 && i.surfaceRepaints > 0; };
        while (!painted() && now() - t0 < T.paintWait) await frame();
        stats.waitedForPaintMs = Math.round(now() - t0); stats.paintedAt = painted() ? Math.round(now()) : null;
        for (let k = 0; k < T.extraFrames; k++) await frame();
        const pv = root.BLOOM && root.BLOOM.planetView && root.BLOOM.planetView.instance; const info = pv && pv.renderer ? pv.renderer.info() : null;
        stats.framesAtLift = info ? info.frames : null; stats.surfaceRepaintsAtLift = info ? info.surfaceRepaints : null;
        const rm = stats.reducedMotion = await reducedMotion();
        stats.liftStartAt = Math.round(now()); stats.state = "lifting"; el.dataset.state = "lifting";
        const anim = el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: rm ? T.liftRm : T.lift, easing: rm ? "ease-in-out" : "cubic-bezier(.4,0,.6,1)", fill: "forwards" });
        await anim.finished.catch(() => {});
        el.style.display = "none"; el.dataset.state = "lifted"; stats.liftedAt = Math.round(now()); stats.state = "lifted";
        return stats.state;
      },
      /** The explicit failure state (no run started): the cover becomes the message; `action` is the one safe way out. */
      fail({ title, body, note = null, action = null } = {}) {
        stats.state = "failed"; el.dataset.state = "failed";
        if (doc.documentElement) doc.documentElement.classList.add("ui18"); // the engineering shell stays hidden (planet-view.css)
        const esc = t => String(t == null ? "" : t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
        const f = doc.createElement("div"); f.className = "xp-fail"; f.id = "expeditionFail"; f.setAttribute("role", "alertdialog"); f.setAttribute("aria-modal", "true"); f.setAttribute("aria-labelledby", "xpFailTitle");
        f.innerHTML = `<div class="xp-card"><h1 id="xpFailTitle">${esc(title)}</h1><p>${esc(body)}</p>${note ? `<p class="xp-note">${esc(note)}</p>` : ""}${action ? `<button type="button" id="xpFailAction" data-go="${esc(action.href)}">${esc(action.label)}</button>` : ""}</div>`;
        el.replaceWith(f); H.el = f;
        const b = f.querySelector("#xpFailAction"); if (b) { b.addEventListener("click", () => { root.location.assign(b.dataset.go); }); b.focus(); }
        return f;
      },
      remove() { H.el.remove(); stats.state = "removed"; } };
    return H;
  }
  A.cover = cover; A.reducedMotion = reducedMotion; A.canLoadModules = canLoadModules;
  root.BLOOM = Object.assign(root.BLOOM || {}, { expeditionArrival: A });
})(typeof window !== "undefined" ? window : globalThis);
