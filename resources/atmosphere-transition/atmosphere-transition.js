// BLOOM — AtmosphereTransition (BLOOM-028B): the reusable atmospheric / cloud screen transition. A decorative overlay of
// stylised, chunky cloud forms over a soft atmospheric veil that conceals whatever is beneath it, holds while a consumer swaps
// the screen underneath (asynchronously, for as long as that takes), then parts and reveals the new state.
//
//   import { AtmosphereTransition } from "<repo>/resources/atmosphere-transition/atmosphere-transition.js";
//   const atx = new AtmosphereTransition();                    // host = document.body (fixed, full viewport)
//   await atx.run({ preset: "dramatic", async onCovered({ signal }) { /* replace the screen underneath */ } });
//   atx.dispose();                                             // when the app no longer needs it (aborts a running run)
//
// SCREEN-AGNOSTIC. It knows nothing about planets, menus, globes, tutorials or gameplay: it covers its host, calls the
// consumer back once the host is concealed, and uncovers it again. Choreography of the outgoing / incoming screens (a planet
// approach, a dossier receding, …) belongs to the consumer, which can run it alongside the transition.
//
// LIFECYCLE of one run():   idle → concealing → covered → (onCovered settles) → revealing → idle
//   · "covered" is the contract point. For a preset with conceal "full" the veil is fully opaque there: nothing underneath can
//     be seen, so the consumer may replace it. The reveal never starts before onCovered has settled (plus `settleFrames` frames
//     so the new content has painted). While the consumer works, the clouds keep drifting (CSS animations, compositor-driven).
//   · If onCovered throws / rejects (or `coveredTimeoutMs` passes), the overlay still reveals and removes itself, then run()
//     rejects with that error: the app is never stranded behind the clouds, and the error is never swallowed.
//   · One run at a time per instance: a second run() while one is active rejects at once (error.name "AtmosphereTransitionBusy")
//     and does not disturb the active run.
//   · dispose() during a run removes the overlay immediately, aborts the run's AbortSignal and rejects run() ("AbortError").
//
// TECHNOLOGY: DOM + Web Animations / CSS keyframes on transform and opacity only (compositor-friendly); no WebGL, no per-frame
// JavaScript. Each cloud silhouette is drawn ONCE per instance into a small bitmap (2D canvas → PNG object URL, prepare()) and
// the clouds are <img> elements: scaling a bitmap is pure GPU work in every browser, whereas Firefox re-rasterises scaled SVG on
// the CPU every time the scale changes (measured: a 100+ ms hitch at the start of every reveal at 5K). The overlay is built when a run starts and removed when it ends (nothing left in the DOM
// between runs except one shared <style> element). It blocks pointer and keyboard input while it is up, and is aria-hidden.
//
// NOT A CANNED ANIMATION: every run lays its clouds out from a seed (random unless run({ seed }) fixes it): the composition
// may be mirrored, and each cloud's position, size, silhouette, facing, drift and stagger vary within bounds that keep the
// edge-first build and the covered contract (concealment comes from the veil, never from where a cloud happens to land).
//
// REDUCED MOTION is solved here, not by consumers: with prefers-reduced-motion: reduce (or reducedMotion: true) a run uses a
// restrained veil fade with static, non-travelling cloud forms and no drift; the covered contract and callbacks are identical.

const STYLE_ID = "bloom-atx-style";
let instances = 0;

// Cloud silhouettes: clusters of circles (one fill colour each, so overlaps read as one chunky, cartoon cumulus). viewBox 0 0 200 130.
const SHAPES = {
  heap: [[44, 86, 32], [78, 62, 40], [120, 54, 46], [158, 76, 34], [102, 92, 32], [178, 96, 20], [22, 98, 19], [138, 96, 26], [62, 100, 24]],
  puff: [[56, 74, 38], [98, 50, 44], [140, 66, 40], [168, 92, 26], [32, 96, 24], [96, 92, 36], [128, 98, 28]],
  bank: [[30, 92, 24], [62, 76, 32], [98, 66, 36], [136, 70, 34], [170, 86, 26], [84, 98, 26], [120, 100, 26], [154, 102, 20], [46, 104, 20]],
  wisp: [[30, 78, 16], [58, 70, 22], [92, 64, 26], [128, 68, 22], [160, 74, 18], [184, 80, 12], [74, 80, 16], [112, 80, 18], [146, 82, 14]],
};

/**
 * PRESETS. Times in ms. Cloud specs: [shape, layer, x, y, w, flip] — x / y = centre as a fraction of the host's width / height,
 * w = width as a fraction of the host's larger side; layer far | mid | near (paint order, tint, softness, motion).
 *   conceal "full"     the veil reaches opacity 1 at "covered" (a swap underneath cannot be seen)
 *   conceal "partial"  the veil peaks at `peak` (a light mist that softens a cut; a swap is muted, not hidden)
 */
export const ATMOSPHERE_PRESETS = Object.freeze({
  // A descent through cloud cover: for big, rare moments (Destination Survey → expedition).
  dramatic: Object.freeze({
    name: "dramatic", conceal: "full", peak: 1, concealMs: 1250, minCoveredMs: 160, revealMs: 1000, settleFrames: 3, settleMaxMs: 400,
    veil: { delay: 380, ease: "cubic-bezier(.6,.05,.8,.4)" },
    motion: "descent",
    clouds: [
      ["bank", "far", .30, .34, .44, 0], ["heap", "far", .70, .30, .46, 1], ["puff", "far", .34, .70, .44, 1], ["bank", "far", .68, .70, .44, 0], ["heap", "far", .50, .50, .40, 0],
      ["puff", "mid", .08, .46, .52, 0], ["heap", "mid", .93, .50, .52, 1], ["bank", "mid", .50, .06, .58, 1], ["heap", "mid", .48, .96, .60, 0],
      ["heap", "near", .02, .10, .82, 0], ["puff", "near", 1.0, .08, .86, 1], ["puff", "near", -.02, .94, .90, 0], ["heap", "near", 1.02, .94, .86, 1], ["bank", "near", .52, 1.10, .96, 0],
    ],
    reduced: { concealMs: 300, minCoveredMs: 120, revealMs: 380 },
  }),
  // A light mist sweep for frequent gameplay-room changes (~200–300 ms in all). Not wired into any gameplay screen yet.
  subdued: Object.freeze({
    name: "subdued", conceal: "partial", peak: 0.74, concealMs: 90, minCoveredMs: 0, revealMs: 120, settleFrames: 0,
    veil: { delay: 0, ease: "cubic-bezier(.3,.6,.4,1)" },
    motion: "sweep",
    clouds: [["wisp", "mid", .26, .30, .52, 0], ["wisp", "mid", .74, .58, .56, 1], ["wisp", "far", .40, .84, .48, 0]],
    reduced: { concealMs: 80, minCoveredMs: 0, revealMs: 110 },
  }),
});

const CUMULUS = ["heap", "puff", "bank"];
const mulberry32 = a => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

/**
 * The cloud layout of one run (pure; no DOM). Same preset + seed → same layout; a different seed → a different one.
 * → { seed, mirror, clouds: [{ shape, layer, x, y, w, flip, k, drift: { dur, delay, dx, dy }, stagger }] } with x / y / w as
 *   fractions (x, y of the host's width / height, w of its larger side), stagger in ms, drift dur / delay in s.
 * Variation (LAYOUT_VARIATION): the whole composition mirrored left ↔ right half the time; each cloud nudged up to ±6 % (near),
 * ±9 % (mid) or ±12 % (far) and sized ×0.85–1.2; about one far / mid cloud in five sits the run out (near clouds always come:
 * the edges must still close first); a random cumulus silhouette (wisps stay wisps), random facing, its own drift period /
 * phase / direction and an entry stagger of up to 160 ms.
 */
export const LAYOUT_VARIATION = Object.freeze({ jitter: Object.freeze({ near: 0.06, mid: 0.09, far: 0.12 }), size: Object.freeze([0.85, 1.2]), skip: 0.2, stagger: 160 });
export function layoutClouds(preset, seed) {
  const V = LAYOUT_VARIATION, rnd = mulberry32(seed >>> 0), r = (a, b) => a + (b - a) * rnd(), mirror = rnd() < 0.5;
  const clouds = preset.clouds.map(([shape, layer, x, y, w], k) => {
    const j = V.jitter[layer], skip = layer !== "near" && shape !== "wisp" && rnd() < V.skip;
    return { shape: shape === "wisp" ? "wisp" : CUMULUS[Math.floor(rnd() * CUMULUS.length)], layer, k, skip,
      x: (mirror ? 1 - x : x) + r(-j, j), y: y + r(-j, j), w: w * r(V.size[0], V.size[1]), flip: rnd() < 0.5,
      drift: { dur: +r(6.5, 11.5).toFixed(2), delay: -+r(0, 8).toFixed(2), dx: rnd() < 0.5 ? -1 : 1, dy: rnd() < 0.5 ? -1 : 1 }, stagger: Math.round(r(0, V.stagger)) };
  });
  return { seed: seed >>> 0, mirror, clouds: clouds.filter(c => !c.skip) };
}

// default cloud colours (bitmaps are drawn with these; `colors` overrides them) and the bitmap width (texture px; 200:130)
const CLOUD_COLORS = Object.freeze({ light: "#f8faff", shade: "#aebfe2", far: "#e6ecf8", farShade: "#a5b5d8" });
const BITMAP_W = 1024;

/** One cloud silhouette, drawn once: the shade cluster, then the light cluster nudged up (the chunky two-tone underside).
 *  Far clouds are pre-softened (a blur baked into the bitmap costs nothing per frame). → a PNG data URL. */
function drawCloudBitmap(shape, far, colors) {
  const bw = far ? BITMAP_W / 2 : BITMAP_W; // far clouds are soft anyway: half resolution, a quarter of the work
  const c = document.createElement("canvas"); c.width = bw; c.height = Math.round(bw * 0.65);
  // CPU-backed (willReadFrequently): encoding it never stalls the GPU with a readback
  const g = c.getContext("2d", { willReadFrequently: true }), k = bw / 200, pad = far ? 6 : 0;
  const blob = (fill, tx, ty, sc) => { g.fillStyle = fill; g.beginPath();
    for (const [x, y, r] of SHAPES[shape]) { const X = (tx + x * sc) * k, Y = (ty + y * sc) * k, R = r * sc * k * (1 - pad / 200); g.moveTo(X + R, Y); g.arc(X, Y, R, 0, Math.PI * 2); }
    g.fill(); };
  if (far) g.filter = "blur(2.5px)";
  blob(far ? colors.farShade : colors.shade, 0, 0, 1);
  blob(far ? colors.far : colors.light, 4, -6, 0.96);
  // encoded synchronously (one bitmap per task, see prepare()): toBlob encodes in idle time, and a page that never idles
  // (spinning globes) waited ~1 s per bitmap for it in Chromium
  return c.toDataURL("image/png");
}

const CSS = `
.atx{position:fixed; inset:0; z-index:var(--atx-z,10000); overflow:hidden; pointer-events:auto; touch-action:none; user-select:none; -webkit-user-select:none; contain:strict;
  --atx-veil-a:#dfe7f6; --atx-veil-b:#c3d0ea; --atx-veil-c:#a9b9dc}
.atx.atx-in-host{position:absolute}
.atx-veil{position:absolute; inset:-2%; opacity:0;
  background:radial-gradient(70% 60% at var(--atx-ox,50%) var(--atx-oy,50%), var(--atx-veil-a) 0%, var(--atx-veil-b) 62%, var(--atx-veil-c) 100%)}
.atx-sweep .atx-veil{inset:0 -30%;
  background:linear-gradient(100deg, transparent 0%, var(--atx-veil-b) 18%, var(--atx-veil-a) 38%, var(--atx-veil-a) 62%, var(--atx-veil-b) 82%, transparent 100%)}
.atx-cloud{position:absolute; left:0; top:0; opacity:0}
.atx-drift{width:100%; height:100%; animation:atx-drift var(--atx-dd,9s) ease-in-out var(--atx-dl,0s) infinite alternate}
.atx-cloud img{display:block; width:100%; height:100%; user-select:none; -webkit-user-drag:none; pointer-events:none}
/* depth from tone, not filters: no CSS blur / will-change on these big layers (measured: both cost whole frames in software
   compositing, and Firefox warns about will-change memory) */
.atx-cloud.far img{opacity:.8}
.atx-cloud.flip img{transform:scaleX(-1)}
@keyframes atx-drift{from{transform:translate3d(calc(var(--atx-dx,1) * -1.2%), calc(var(--atx-dy,1) * .8%), 0) scale(1)}
                     to{transform:translate3d(calc(var(--atx-dx,1) * 1.4%), calc(var(--atx-dy,1) * -.9%), 0) scale(1.025)}}
.atx.rm .atx-drift{animation:none}
`;

const busyError = () => Object.assign(new Error("AtmosphereTransition: a transition is already running on this instance"), { name: "AtmosphereTransitionBusy" });
const abortError = msg => (typeof DOMException === "function" ? new DOMException(msg, "AbortError") : Object.assign(new Error(msg), { name: "AbortError" }));
const timeoutError = ms => Object.assign(new Error(`AtmosphereTransition: onCovered did not settle within ${ms} ms`), { name: "AtmosphereTransitionTimeout" });

/** One frame (or 50 ms when frames are not being produced, e.g. a hidden tab — a transition must never hang on rAF). */
const nextFrame = () => new Promise(res => { let done = false; const go = () => { if (!done) { done = true; res(); } }; requestAnimationFrame(go); setTimeout(go, 50); });
/**
 * After the consumer's covered work: wait until `n` consecutive frames come at a normal pace (≤ 28 ms), at most `maxMs`. The
 * first paint of a freshly mounted full screen can take 100+ ms (measured: Firefox at 5K); that stall must happen while
 * the screen is still covered, not on the first frames of the reveal.
 */
async function settle(n, maxMs) {
  if (!n) return;
  const t0 = performance.now(); let ok = 0, last = t0;
  while (ok < n && performance.now() - t0 < maxMs) { await nextFrame(); const t = performance.now(); ok = t - last <= 28 ? ok + 1 : 0; last = t; }
}
const settled = anims => Promise.all(anims.map(a => a.finished.catch(() => {})));

export class AtmosphereTransition {
  /**
   * host           element the overlay covers (default document.body = the whole viewport, position: fixed). Any other host is
   *                covered with position: absolute (a statically positioned host is made position: relative for the run).
   * zIndex         stacking of the overlay (default 10000)
   * reducedMotion  null follows prefers-reduced-motion at the start of each run; true / false force it
   * blockInput     swallow pointer and (unmodified) keyboard input while a run is active (default true)
   * colors         optional palette overrides { light, shade, far, farShade, veilA, veilB, veilC } (CSS colours)
   */
  constructor({ host = null, zIndex = 10000, reducedMotion = null, blockInput = true, colors = null } = {}) {
    if (host && typeof host.appendChild !== "function") throw new TypeError("AtmosphereTransition: host must be a DOM element");
    this.host = host || document.body; this.zIndex = zIndex; this.forcedReducedMotion = reducedMotion; this.blockInput = blockInput !== false; this.colors = colors;
    this.uid = "atx" + (++instances) + "-" + Math.floor(Math.random() * 1e6).toString(36);
    this.phase = "idle"; this.disposed = false; this.runs = 0; this.overlay = null; this._run = null; this._bitmaps = null;
    ensureStyle();
  }

  get running() { return this._run !== null; }

  /**
   * Draw and decode the cloud bitmaps now (a few ms, once per instance). run() does it by itself the first time; call this
   * ahead of time (e.g. when a screen that may transition appears) so the first transition starts on the very next frame.
   */
  prepare() {
    if (this._bitmaps) return this._bitmaps.ready;
    const colors = { ...CLOUD_COLORS, ...(this.colors || {}) }, map = new Map(), t0 = performance.now();
    this.prepareStats = { bitmaps: 0, maxTaskMs: 0, ms: null }; // (QA: the longest synchronous step this costs the main thread)
    // one bitmap at a time with a yield between them, so preparing never blocks a frame (each is a few ms)
    const ready = (async () => {
      for (const shape of Object.keys(SHAPES)) for (const far of [false, true]) {
        await new Promise(r => setTimeout(r, 0));
        const t = performance.now(), url = drawCloudBitmap(shape, far, colors), img = new Image(); img.src = url;
        this.prepareStats.maxTaskMs = Math.max(this.prepareStats.maxTaskMs, performance.now() - t); this.prepareStats.bitmaps++;
        try { await img.decode(); } catch { /* decoded on first paint instead */ }
        map.set(shape + (far ? "|far" : ""), { url, img });
      }
      this.prepareStats.ms = Math.round(performance.now() - t0);
      return map;
    })();
    this._bitmaps = { map, ready };
    return ready;
  }
  get reducedMotion() { return this.forcedReducedMotion ?? !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); }

  /**
   * Conceal → onCovered (awaited) → reveal → cleanup. Resolves with a timing report; rejects with onCovered's error (after the
   * overlay has revealed and removed itself), with "AtmosphereTransitionBusy" if a run is active, or "AbortError" on dispose().
   *   preset            "dramatic" | "subdued" | a preset object (see ATMOSPHERE_PRESETS)
   *   onCovered(info)   called once at the covered point; may be async. info = { signal, preset, reducedMotion, concealed }
   *                     (concealed: true when the veil is fully opaque). The reveal waits for it.
   *   conceal           override the preset's "full" | "partial" (e.g. a subdued sweep that must fully hide a swap)
   *   reducedMotion     override for this run
   *   origin            { x, y } fractions of the host: the focus of the cloud motion (default the centre)
   *   coveredTimeoutMs  treat an onCovered that has not settled by then as failed (default: wait indefinitely)
   *   onPhase(phase)    called on every phase change: "concealing" | "covered" | "revealing" | "idle"
   *   seed              the cloud layout of this run (layoutClouds); default random, so no two runs look alike. Pass one to
   *                     reproduce a run exactly (QA, screenshots); the result reports the seed used
   */
  run({ preset = "dramatic", onCovered = null, conceal = null, reducedMotion = null, origin = null, coveredTimeoutMs = null, onPhase = null, seed = null } = {}) {
    if (this.disposed) return Promise.reject(abortError("AtmosphereTransition: disposed"));
    if (this._run) return Promise.reject(busyError());
    const P = typeof preset === "string" ? ATMOSPHERE_PRESETS[preset] : preset;
    if (!P || !Array.isArray(P.clouds)) return Promise.reject(new TypeError(`AtmosphereTransition: unknown preset ${JSON.stringify(preset)}`));
    const rm = reducedMotion ?? this.reducedMotion, full = (conceal || P.conceal) === "full";
    const ctl = new AbortController();
    const run = this._run = { ctl, P, rm, full, onPhase, anims: [], cleanup: [], seed: seed == null ? (Math.random() * 4294967296) >>> 0 : seed >>> 0 };
    run.disposed = new Promise((_, rej) => { run.rejectDisposed = rej; }); run.disposed.catch(() => {});
    this.runs++;
    run.promise = this._execute(run, { onCovered, origin, coveredTimeoutMs }).finally(() => { this._teardown(run); });
    return run.promise;
  }

  /** Remove everything; a running transition is aborted at once (its overlay removed, its run() rejected). Idempotent. */
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    if (this._run) { const r = this._run, err = abortError("AtmosphereTransition: disposed"); r.ctl.abort(err); r.rejectDisposed(err); this._teardown(r); }
  }

  // ---------------------------------------------------------------- internals
  async _execute(run, { onCovered, origin, coveredTimeoutMs }) {
    const { P, rm, full, ctl } = run, T = rm ? { ...P, ...P.reduced } : P, t0 = performance.now();
    const times = { start: t0 }, mark = k => { times[k] = Math.round(performance.now() - t0); };
    const aborted = () => { if (ctl.signal.aborted) throw ctl.signal.reason || abortError("AtmosphereTransition: aborted"); };
    const peak = full ? 1 : P.peak;
    const o = origin || { x: 0.5, y: 0.5 };
    const bitmaps = await this.prepare(); aborted();
    this._mount(run, T, o, bitmaps);
    const { veil, clouds } = run;
    const box = this.overlay.getBoundingClientRect(), W = box.width || innerWidth, H = box.height || innerHeight;

    // ---- conceal
    this._phase(run, "concealing");
    const concealAnims = [veil.animate([{ opacity: 0 }, { opacity: peak * (P.motion === "descent" && !rm ? 0.42 : 0.6), offset: 0.55 }, { opacity: peak }],
      { duration: rm ? T.concealMs : T.concealMs - P.veil.delay, delay: rm ? 0 : P.veil.delay, easing: rm ? "ease-out" : P.veil.ease, fill: "forwards" })];
    const dir = run.layout.mirror ? -1 : 1; // a mirrored layout sweeps the other way
    if (P.motion === "sweep" && !rm) concealAnims.push(veil.animate([{ transform: `translateX(${-18 * dir}%)` }, { transform: "translateX(0)" }], { duration: T.concealMs, easing: "cubic-bezier(.2,.7,.3,1)", fill: "forwards" }));
    clouds.forEach(c => concealAnims.push(c.el.animate(this._cloudKeys(c, "in", rm, W, H, o, P, dir), this._cloudTiming(c, "in", rm, T, P))));
    run.anims.push(...concealAnims);
    await settled(concealAnims); aborted();

    // ---- covered: the consumer's turn (async); the clouds keep drifting meanwhile
    this._phase(run, "covered"); mark("covered");
    const minHold = new Promise(res => setTimeout(res, T.minCoveredMs));
    let failure = null;
    try {
      if (onCovered) {
        const work = Promise.resolve().then(() => onCovered({ signal: ctl.signal, preset: P.name, reducedMotion: rm, concealed: full }));
        const race = [work, run.disposed];
        if (coveredTimeoutMs != null) race.push(new Promise((_, rej) => setTimeout(() => rej(timeoutError(coveredTimeoutMs)), coveredTimeoutMs)));
        await Promise.race(race);
      }
    } catch (err) { failure = err; }
    aborted();
    mark("coveredDone");
    await minHold; await settle(P.settleFrames || 0, P.settleMaxMs || 0); aborted();
    if (failure && !ctl.signal.aborted) ctl.abort(failure); // tell a still-running onCovered (e.g. after a timeout) to stop

    // ---- reveal (also after a failure: never strand the app behind the overlay)
    this._phase(run, "revealing"); mark("revealStart");
    const revealAnims = [veil.animate([{ opacity: peak }, { opacity: 0 }],
      { duration: rm ? T.revealMs : T.revealMs * 0.78, delay: rm ? 0 : T.revealMs * 0.1, easing: rm ? "ease-in-out" : "cubic-bezier(.4,0,.6,1)", fill: "forwards" })];
    if (P.motion === "sweep" && !rm) revealAnims.push(veil.animate([{ transform: "translateX(0)" }, { transform: `translateX(${16 * dir}%)` }], { duration: T.revealMs, easing: "cubic-bezier(.4,0,.7,.6)", fill: "forwards" }));
    clouds.forEach(c => revealAnims.push(c.el.animate(this._cloudKeys(c, "out", rm, W, H, o, P, dir), this._cloudTiming(c, "out", rm, T, P))));
    run.anims.push(...revealAnims);
    await settled(revealAnims); aborted();
    mark("end");
    if (failure) { failure.atmosphereTransition = { times, preset: P.name, reducedMotion: rm }; throw failure; }
    return { preset: P.name, reducedMotion: rm, concealed: full, seed: run.seed, mirrored: run.layout.mirror, times, coveredHoldMs: times.revealStart - times.covered, totalMs: times.end };
  }

  /** Build the overlay for one run: defs (shared silhouettes), the veil, and the clouds of the preset (positions from the host box). */
  _mount(run, T, o, bitmaps) {
    const { P, rm } = run, inHost = this.host !== document.body && this.host !== document.documentElement;
    const ov = this.overlay = document.createElement("div");
    ov.className = "atx atx-" + P.motion + (rm ? " rm" : "") + (inHost ? " atx-in-host" : "");
    ov.setAttribute("aria-hidden", "true"); ov.dataset.atxPhase = "idle"; ov.dataset.atxPreset = P.name;
    ov.style.setProperty("--atx-z", String(this.zIndex));
    ov.style.setProperty("--atx-ox", (o.x * 100).toFixed(1) + "%"); ov.style.setProperty("--atx-oy", (o.y * 100).toFixed(1) + "%");
    if (this.colors) for (const [k, v] of Object.entries(this.colors)) ov.style.setProperty("--atx-" + k.replace(/[A-Z]/g, m => "-" + m.toLowerCase()), v);
    const L = run.layout = layoutClouds(P, run.seed);
    ov.dataset.atxSeed = String(run.seed);
    ov.innerHTML = `<div class="atx-veil"></div>`;
    run.veil = ov.querySelector(".atx-veil");
    if (inHost && getComputedStyle(this.host).position === "static") { const prev = this.host.style.position; this.host.style.position = "relative"; run.cleanup.push(() => { this.host.style.position = prev; }); }
    this.host.appendChild(ov);
    const box = ov.getBoundingClientRect(), W = box.width || innerWidth, H = box.height || innerHeight, M = Math.max(W, H);
    const order = { far: 0, mid: 1, near: 2 };
    run.clouds = L.clouds.map(c => ({ ...c, w: c.w * M }))
      .sort((a, b) => order[a.layer] - order[b.layer]).map(c => {
        const el = document.createElement("div"), h = c.w * 0.65;
        el.className = `atx-cloud ${c.layer}${c.flip ? " flip" : ""}`;
        // resting place: centred on (x, y); the transform animations are relative to it
        el.style.cssText = `width:${c.w.toFixed(0)}px; height:${h.toFixed(0)}px; left:${(c.x * W - c.w / 2).toFixed(0)}px; top:${(c.y * H - h / 2).toFixed(0)}px;` +
          `--atx-dd:${c.drift.dur}s; --atx-dl:${c.drift.delay}s; --atx-dx:${c.drift.dx}; --atx-dy:${c.drift.dy}`;
        const bm = bitmaps.get(c.shape + (c.layer === "far" ? "|far" : ""));
        el.innerHTML = `<div class="atx-drift"><img src="${bm.url}" alt="" decoding="sync" draggable="false"></div>`;
        ov.appendChild(el);
        return { ...c, el, h };
      });
    if (this.blockInput) this._block(run, ov);
  }

  /** Keyframes for one cloud. "descent": far clouds swell out of the distance around the origin, mid / near clouds close in from
   *  the edges; on reveal everything streams outward past the edges (moving through the cloud). "sweep": a short sideways drift.
   *  Reduced motion: opacity only, no travel or scaling. */
  _cloudKeys(c, dir, rm, W, H, o, P, side = 1) {
    const opa = c.layer === "far" ? 0.92 : c.layer === "mid" ? 0.96 : 1, op = P.motion === "sweep" ? opa * 0.62 : opa;
    if (rm) return dir === "in" ? [{ opacity: 0 }, { opacity: op }] : [{ opacity: op }, { opacity: 0 }];
    if (P.motion === "sweep") {
      const dx = W * 0.035 * side;
      return dir === "in" ? [{ opacity: 0, transform: `translate3d(${-dx}px,0,0)` }, { opacity: op, transform: "translate3d(0,0,0)" }]
        : [{ opacity: op, transform: "translate3d(0,0,0)" }, { opacity: 0, transform: `translate3d(${dx}px,0,0)` }];
    }
    const vx = (c.x - o.x) * W, vy = (c.y - o.y) * H; // from the origin to the cloud's resting centre
    const len = Math.hypot(vx, vy) || 1, ux = vx / len, uy = vy / len, reach = Math.hypot(W, H) * 0.55;
    if (dir === "in") {
      if (c.layer === "far") return [{ opacity: 0, transform: `translate3d(${-vx * 0.5}px,${-vy * 0.5}px,0) scale(.35)` }, { opacity: op * 0.7, offset: 0.5 }, { opacity: op, transform: "translate3d(0,0,0) scale(1)" }];
      if (c.layer === "near") { const push = reach * 0.7; // slides in from beyond the edge (already solid: it is entering the frame, not fading up)
        return [{ opacity: op, transform: `translate3d(${ux * push}px,${uy * push}px,0) scale(1.2)` }, { opacity: op, transform: "translate3d(0,0,0) scale(1)" }]; }
      const push = reach * 0.4;
      return [{ opacity: 0, transform: `translate3d(${ux * push}px,${uy * push}px,0) scale(.9)` }, { opacity: op, offset: 0.4 }, { opacity: op, transform: "translate3d(0,0,0) scale(1)" }];
    }
    const out = reach * (c.layer === "near" ? 1.0 : c.layer === "mid" ? 0.85 : 0.7);
    const sc = c.layer === "near" ? 1.6 : c.layer === "mid" ? 1.45 : 1.3;
    return [{ opacity: op, transform: "translate3d(0,0,0) scale(1)" }, { opacity: op, offset: 0.45 },
      { opacity: 0, transform: `translate3d(${ux * out}px,${uy * out}px,0) scale(${sc})` }];
  }

  _cloudTiming(c, dir, rm, T, P) {
    const fill = "forwards";
    if (rm) return dir === "in" ? { duration: T.concealMs, easing: "ease-out", fill } : { duration: T.revealMs * 0.85, easing: "ease-in", fill };
    if (P.motion === "sweep") return dir === "in" ? { duration: T.concealMs, easing: "cubic-bezier(.2,.7,.3,1)", fill } : { duration: T.revealMs, easing: "cubic-bezier(.4,0,.7,.6)", fill };
    const L = { far: 0, mid: 1, near: 2 }[c.layer], jitter = c.stagger;
    if (dir === "in") {
      const delay = [430, 200, 0][L] + jitter, duration = T.concealMs - delay; // edges close in first; the centre stays open longest
      return { duration, delay, easing: c.layer === "far" ? "cubic-bezier(.25,.6,.35,1)" : "cubic-bezier(.22,.75,.3,1)", fill };
    }
    const delay = [80, 30, 0][L] + jitter * 0.5;
    return { duration: T.revealMs - delay, delay, easing: "cubic-bezier(.5,0,.75,.5)", fill };
  }

  _phase(run, p) {
    if (this._run !== run) return;
    this.phase = p; if (this.overlay) this.overlay.dataset.atxPhase = p;
    if (run.onPhase) { try { run.onPhase(p); } catch (err) { setTimeout(() => { throw err; }); } } // a consumer bug must not break the transition
  }

  /** Swallow pointer (the overlay covers the host) and keyboard input while a run is up; Ctrl / Meta / Alt shortcuts pass. */
  _block(run, ov) {
    const stop = e => { e.preventDefault(); e.stopPropagation(); };
    const key = e => { if (e.ctrlKey || e.metaKey || e.altKey) return; e.preventDefault(); e.stopImmediatePropagation(); };
    const pointer = ["pointerdown", "pointerup", "click", "dblclick", "contextmenu", "wheel", "touchstart", "touchmove"], keys = ["keydown", "keypress", "keyup"];
    for (const t of pointer) ov.addEventListener(t, stop, { passive: false });
    for (const t of keys) window.addEventListener(t, key, true);
    run.cleanup.push(() => { for (const t of keys) window.removeEventListener(t, key, true); for (const t of pointer) ov.removeEventListener(t, stop, { passive: false }); });
    // nothing underneath keeps keyboard focus through the swap (the consumer restores focus on its new screen)
    const a = document.activeElement; if (a && a !== document.body && this.host.contains(a) && typeof a.blur === "function") a.blur();
  }

  _teardown(run) {
    if (run.done) return;
    run.done = true;
    for (const a of run.anims) { try { a.cancel(); } catch { /* already gone */ } }
    for (const f of run.cleanup.splice(0)) { try { f(); } catch { /* restore what we can */ } }
    if (this._run === run) {
      if (this.overlay) this.overlay.remove();
      this.overlay = null; this._run = null; this.phase = "idle";
      if (run.onPhase) { try { run.onPhase("idle"); } catch (err) { setTimeout(() => { throw err; }); } }
    }
  }
}

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement("style"); s.id = STYLE_ID; s.textContent = CSS;
  (document.head || document.documentElement).appendChild(s);
}
