// BLOOM — the gameplay transition bridge (BLOOM-029E). docs/GAMEPLAY_UI_CONVERGENCE_v1.md §4–§6.
//
// ONE SUBDUED mist per production run. The EXISTING, UNMODIFIED AtmosphereTransition (resources/atmosphere-transition/
// atmosphere-transition.js, an ES module) is reached through a guarded dynamic import, exactly as the Terraform room reaches the
// sphere (resources/run-ui/terraform-globe.js): over http(s) the module is imported once and ONE instance is built and prepared
// early (its cloud bitmaps drawn in idle time, so the first room opens on the next frame); (BLOOM-031) over file:// the same from the portable
// runtime; when the module genuinely fails to load (or a file:// page lacks the module seam), no request is made and every swap happens immediately. It is consumed through the component's public
// API only — constructor, prepare(), run({ preset: "subdued", onCovered, onPhase }), dispose(), and the public `running` / `phase`
// — never a private member. Presets, timings and the component's own reduced-motion path are untouched: the bridge passes the
// player's Settings motion choice (main-menu-data.js readSettings → reducedMotionFor; null = follow the OS) to the constructor and
// the component decides per run.
//
//   const T = BLOOM.gameplayTransition.create({ onError })   → the bridge
//   T.prepare()                       load + build + prepare, once (non-blocking; a swap requested before it resolves is immediate)
//   T.run({ onCovered, origin })      → Promise<{ ran, immediate, covered, times, error }>  — NEVER rejects
//   T.transitioning · T.kind          "pending" | "atmosphere" | "immediate"   · T.reducedMotion()  · T.last · T.history
//   T.dispose()
//
// THE SWAP HAPPENS EXACTLY ONCE, ALWAYS. `onCovered` is the consumer's DOM / state swap. It is called at the component's covered
// point when the mist runs; immediately when it cannot (no module, disposed, a run already active, the page hidden); and, as a
// safety net, after a short watchdog if the component has not reached its covered point in time (a throttled background tab).
// A rejection of the component's run (onCovered threw, the instance was disposed mid-run) is caught and reported in the result:
// the overlay is already gone (the component reveals and removes itself before rejecting) and the swap has been made, so the UI
// is never stranded — paused with no room, both layers inert, a stuck veil or two rooms visible are impossible by construction.
// A second run() while one is active (controller guards exist too) does not throw AtmosphereTransitionBusy: it swaps at once.
//
// Classic script, no dependencies: boots over file:// like every other run-page file. It owns no simulation and no screen.
(function (root) {
  "use strict";
  const doc = root.document;
  const HERE = doc && doc.currentScript && doc.currentScript.src ? doc.currentScript.src : null;
  const MODULE_URL = HERE ? new URL("../atmosphere-transition/atmosphere-transition.js", HERE).href : "../resources/atmosphere-transition/atmosphere-transition.js";
  const SETTINGS_URL = HERE ? new URL("../main-menu/main-menu-data.js", HERE).href : "../resources/main-menu/main-menu-data.js";
  // (BLOOM-031) served over http(s): import(); opened as a file (file://): the SAME source module from the portable runtime, through
  // BLOOM.modules (resources/portable/module-loader.js). Without that seam (a page that does not load it) file:// stays module-less.
  const modules = () => (root.BLOOM && root.BLOOM.modules) || null;
  const canLoadModules = () => !!(root.location && /^https?:$/.test(root.location.protocol)) || !!(modules() && modules().portable);
  const importModule = url => (modules() && modules().portable ? modules().load(url) : import(url));
  const PRESET = "subdued";
  // the watchdog: the SUBDUED preset conceals in ~90 ms (80 ms reduced); a covered point not reached by then is a throttled tab,
  // and the player must not wait on it. The hard cap bounds how long a consumer may stay locked on a run that never settles.
  const WATCHDOG_MS = 900, HARD_CAP_MS = 2500, HISTORY = 48;
  const now = () => (root.performance ? performance.now() : Date.now());

  let loading = null;
  /** → Promise<{ AtmosphereTransition, settings } | null>. Memoised; no module loading (file:// without the portable seam) → null without a request; a failed load → null (warned once). */
  function load() {
    if (loading) return loading;
    loading = canLoadModules()
      ? Promise.all([importModule(MODULE_URL), importModule(SETTINGS_URL).catch(() => null)])
        .then(([m, s]) => (m && m.AtmosphereTransition ? { AtmosphereTransition: m.AtmosphereTransition, settings: s } : null))
        .catch(err => { console.warn("BLOOM.gameplayTransition: AtmosphereTransition could not load — immediate swaps", err && err.message); return null; })
      : Promise.resolve(null);
    return loading;
  }

  function create({ onError = null, zIndex = 10000 } = {}) {
    const B = { kind: "pending", atx: null, disposed: false, transitioning: false, prepared: null, last: null, history: [], runs: 0, immediateRuns: 0, settingsMotion: null, prepareStats: null };
    let settingsMod = null, stuck = false;
    /** The player's Settings choice → true / false, null = follow the OS (read now, as the training layer and the menu read it). */
    const settingMotion = () => { try { if (!settingsMod) return null; const s = settingsMod.readSettings(root.localStorage); return settingsMod.reducedMotionFor(s.motion); } catch { return null; } };
    const osReduced = () => !!(root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches);
    /** What a run would use now: the Settings choice when set, else the OS. (The component evaluates the same at the start of each run.) */
    B.reducedMotion = () => { const s = settingMotion(); return s === null ? osReduced() : s; };

    B.prepare = () => {
      if (B.prepared) return B.prepared;
      B.prepared = load().then(mod => {
        if (B.disposed) return B.kind;
        if (!mod) { B.kind = "immediate"; return B.kind; }
        settingsMod = mod.settings; B.settingsMotion = settingMotion();
        try {
          // reducedMotion null → the component follows prefers-reduced-motion at the start of every run (its own reduced path)
          B.atx = new mod.AtmosphereTransition({ zIndex, reducedMotion: B.settingsMotion });
          const t0 = now(); B.atx.prepare().then(() => { B.prepareStats = { ...(B.atx.prepareStats || {}), readyAt: Math.round(now()), tookMs: Math.round(now() - t0) }; }).catch(() => {});
          B.kind = "atmosphere";
        } catch (err) { B.kind = "immediate"; console.warn("BLOOM.gameplayTransition: could not build the transition — immediate swaps", err && err.message); }
        return B.kind;
      });
      return B.prepared;
    };

    /**
     * Conceal → onCovered (once) → reveal. Resolves (never rejects) with { ran: the mist ran, immediate, covered: the swap happened at
     * the component's covered point, times: { start, covered, revealStart, end } on the page clock (ms), error: a caught failure }.
     * `origin` ({ x, y } fractions) is the cloud focus (optional). The swap is made exactly once on every path.
     */
    B.run = ({ onCovered = null, origin = null, kind = "swap" } = {}) => {
      const rec = { kind, preset: PRESET, start: now(), covered: null, revealStart: null, end: null, immediate: false, ran: false, reducedMotion: null, error: null, seed: null };
      let swapped = false, swapError = null;
      const swap = (why) => { if (swapped) return; swapped = true; rec.covered = now(); rec.swapWhy = why;
        try { if (onCovered) onCovered({ immediate: why !== "covered", why }); } catch (err) { swapError = err; rec.error = String(err && err.message || err); if (onError) { try { onError(err); } catch { /* reported */ } } else console.error("BLOOM.gameplayTransition: the swap failed", err); } };
      const finish = (ran) => { rec.ran = ran; rec.end = now(); rec.totalMs = Math.round(rec.end - rec.start); B.last = rec; B.history.push(rec); if (B.history.length > HISTORY) B.history.shift();
        B.transitioning = false; return { ran, immediate: rec.immediate, covered: rec.swapWhy === "covered", times: { start: rec.start, covered: rec.covered, revealStart: rec.revealStart, end: rec.end }, totalMs: rec.totalMs, error: rec.error, reducedMotion: rec.reducedMotion, seed: rec.seed }; };
      B.runs++; B.transitioning = true;
      const atx = B.atx;
      const immediate = !atx || B.disposed || B.kind !== "atmosphere" || atx.running || atx.disposed || stuck || (doc && doc.hidden);
      if (immediate) { rec.immediate = true; rec.reducedMotion = B.reducedMotion(); B.immediateRuns++; swap(!atx ? "no-transition" : atx.running ? "busy" : doc && doc.hidden ? "hidden" : stuck ? "stuck" : "unavailable"); return Promise.resolve(finish(false)); }
      return new Promise(resolve => {
        let settled = false; const done = v => { if (settled) return; settled = true; clearTimeout(dog); clearTimeout(cap); resolve(v); };
        const dog = setTimeout(() => swap("watchdog"), WATCHDOG_MS);
        const cap = setTimeout(() => { swap("hard-cap"); stuck = true; done(finish(false)); }, HARD_CAP_MS); // the controller is released; later runs swap at once until this one settles
        const onPhase = p => { if (p === "revealing") rec.revealStart = now(); };
        let p;
        try { p = atx.run({ preset: PRESET, origin: origin || undefined, onPhase, onCovered: () => { swap("covered"); if (swapError) throw swapError; } }); }
        catch (err) { rec.error = String(err && err.message || err); swap("run-threw"); return done(finish(false)); }
        p.then(res => { rec.reducedMotion = !!res.reducedMotion; rec.seed = res.seed; rec.componentTimes = res.times; stuck = false; swap("resolved-uncovered"); done(finish(true)); },
          err => { rec.error = rec.error || String(err && err.message || err); rec.reducedMotion = B.reducedMotion(); stuck = false; swap("rejected"); done(finish(rec.covered !== null && rec.swapWhy === "covered")); });
      });
    };

    B.dispose = () => { if (B.disposed) return; B.disposed = true; if (B.atx) { try { B.atx.dispose(); } catch { /* already gone */ } } B.kind = "immediate"; };
    Object.defineProperty(B, "phase", { get: () => (B.atx ? B.atx.phase : "idle") });
    Object.defineProperty(B, "running", { get: () => !!(B.atx && B.atx.running) });
    return B;
  }

  const API = { version: 1, create, load, canLoadModules, moduleUrl: MODULE_URL, preset: PRESET, WATCHDOG_MS, HARD_CAP_MS };
  root.BLOOM = Object.assign(root.BLOOM || {}, { gameplayTransition: Object.freeze(API) });
})(typeof window !== "undefined" ? window : globalThis);
