// BLOOM — the Strange Bloom title PAGE (BLOOM-030): the one page-level composition of the opening title, shared by the canonical
// production entry (the repository root index.html) and the developer / compatibility alias (demos/main-menu.html). Both documents
// are thin: they load ./title-boot.js with their paths, and it mounts this. docs/RELEASE_CANDIDATE_v1.md, docs/MAIN_MENU_v1.md §10.
//
//   import { mountTitlePage } from "<repo>/resources/main-menu/main-menu-page.js";
//   mountTitlePage({ app, runHref: "demos/demo-run.html", titleHref: null });
//
//   app        the sized app element the title fills
//   runHref    the gameplay page, relative to this document: TRAINING opens it with ?training=1&return=<title>, a departure with
//              ?play=1&expedition=<token> (BLOOM.expedition.runUrl(token, runHref))
//   titleHref  the CANONICAL title, relative to this document; null = this very page. Everything that comes back to the title
//              (the run's Main menu / Choose another planet, training's Skip / Main menu / Begin Expedition) is sent here, with this
//              page's own query (development / QA parameters) and never begin=1. The alias names the root, so no normal action
//              ever lands on demos/main-menu.html.
//
// It composes, and owns nothing the components own: MainMenu, ExpeditionEntry, DestinationSurvey and the expedition handoff
// (resources/expedition/expedition-handoff.js) stay authoritative. What lives here (formerly inline in demos/main-menu.html):
//   · ExpeditionEntry construction (the first-sector prefetch starts with it; Settings / Credits / the first-run recommendation
//     are its menu's); TRAINING → the training run through the title's black (ExpeditionEntry.leaveTo);
//   · ?begin=1 (the run's "Choose another planet", training's Begin Expedition): enter the survey at once; dropped from the address
//     so a reload or a return lands on the title;
//   · (029F) the exact-world departure: under the DRAMATIC descent's full cover, detail.planet is packaged VERBATIM (pack → store in
//     sessionStorage → survey.dispose() → location.assign(run?play=1&expedition=<token>)); nothing is generated;
//   · a departure that could not open the game: a plain notice (the survey is gone; the only way on is a reload);
//   · the back-forward cache: a title restored after a departure starts afresh;
//   · development / QA query parameters (never needed by a player): ?bg=<1…12> force a background · &rm=1 | &rm=0 force reduced
//     motion (default: Settings, then the OS) · &sector=<n> first sector seed · &firstBloom=1 · &workers=<1…8> · &worker=0
//     (main-thread sectors) · &hold=<ms> / &fail=1 / &seed=<n> the departure's covered work / cloud layout;
//   · window.MENU_DEV: { ready, errors, events, hooks, handoffs, results, entry, page } for QA.
import { ExpeditionEntry } from "./expedition-entry.js";
import { planetFingerprint } from "../destination-survey/survey-data.js";

/** Mount the title page. Returns MENU_DEV. Needs the BLOOM classic scripts (./title-boot.js loads them) and the two stylesheets. */
export function mountTitlePage({ app, runHref = "demos/demo-run.html", titleHref = null } = {}) {
  if (!app || typeof app.appendChild !== "function") throw new TypeError("mountTitlePage: app must be a DOM element");
  const X = window.BLOOM && BLOOM.expedition, P = window.BLOOM && BLOOM.play;
  if (!X || !P) throw new Error("mountTitlePage: the BLOOM classic scripts (bloom-play.js, expedition-handoff.js) are not on the page");
  const q = new URLSearchParams(location.search);
  const DEV = window.MENU_DEV = { ready: false, errors: [], events: [], hooks: [], handoffs: [], results: [], entry: null, page: null };
  addEventListener("error", e => DEV.errors.push(String(e.message || e)));
  addEventListener("unhandledrejection", e => DEV.errors.push(String(e.reason && e.reason.message || e.reason)));
  const rm = q.get("rm") === "1" ? true : q.get("rm") === "0" ? false : undefined, hold = +(q.get("hold") || 0), fail = q.get("fail") === "1";
  const ev = (type, data) => DEV.events.push({ type, at: Math.round(performance.now()), ...(data || {}) });
  const begin = q.get("begin") === "1";
  // (029F) ?begin=1 enters the survey at once; it is dropped from the address so a reload or a return lands on the title
  if (begin) { const u = new URL(location.href); u.searchParams.delete("begin"); history.replaceState(null, "", u.href); }

  // where everything comes back to: the canonical title (this page when titleHref is null) with this page's query, no begin, no hash
  const titleUrl = () => { const here = new URL(location.href), u = titleHref ? new URL(titleHref, here) : here;
    if (titleHref) u.search = here.search; u.searchParams.delete("begin"); u.hash = ""; return u.href; };
  // (028D1) TRAINING → the training run page, which comes back to the canonical title through return=
  const trainingHref = () => new URL(runHref + "?" + P.trainingQuery({ returnTo: titleUrl() }), location.href).href;
  const runUrl = token => new URL(X.runUrl(token, runHref), location.href).href;
  DEV.page = { runHref, titleHref, title: titleUrl(), training: trainingHref(), run: new URL(runHref, location.href).href };

  // (029F) under full cloud cover: package the EXACT selected planet (detail.planet, verbatim), write the session handoff, dispose the
  // survey and its workers, and open the gameplay page with the opaque token. Nothing is generated; the seed rides along as provenance.
  async function departToGameplay(detail, rec) {
    const env = X.pack(detail, { token: X.newToken(), returnTo: titleUrl(), fingerprint: planetFingerprint(detail.planet) });
    if (JSON.stringify(env.planet) !== JSON.stringify(detail.planet)) throw new Error("expedition handoff: the packaged planet is not the selected planet");
    X.store(env, X.storageOf(window));                                       // session-scoped, bounded (older handoffs pruned)
    rec.token = env.token; rec.fingerprint = env.fingerprint; rec.integrity = env.integrity; rec.returnTo = env.returnTo; rec.storedAt = performance.now();
    detail.survey.dispose(); rec.surveyDisposedAt = performance.now();        // renderer, nine views, the pool's workers, DOM
    const href = runUrl(env.token); rec.href = href; ev("depart", { token: env.token });
    location.assign(href);
    // still here after this long = the gameplay page did not open: an explicit error (the survey is gone; the notice offers a reload)
    await new Promise((_, rej) => setTimeout(() => rej(new Error("the gameplay page did not open")), 8000));
  }
  function stranded(msg) { const n = document.createElement("div"); n.className = "ee-stranded"; n.setAttribute("role", "alert");
    n.innerHTML = `<span></span><button type="button">Back to title</button>`; n.firstChild.textContent = msg; n.lastChild.onclick = () => location.reload(); document.body.appendChild(n); }

  const entry = DEV.entry = new ExpeditionEntry(app, { trainingHref,
    reducedMotion: rm, background: q.has("bg") ? +q.get("bg") - 1 : null,
    sectorSeed: q.has("sector") ? +q.get("sector") : null, firstBloom: q.get("firstBloom") === "1", workers: q.has("workers") ? +q.get("workers") : null, worker: q.get("worker") !== "0",
    onBeginExpedition(d) { DEV.hooks.push({ key: d.candidate.key, at: performance.now(), detail: d }); ev("begin-expedition", { key: d.candidate.key }); },
    descent: {
      seed: q.has("seed") ? +q.get("seed") : null,
      async onCovered(detail, info) {
        const rec = { at: performance.now(), concealed: info.concealed, reducedMotion: info.reducedMotion, key: detail.candidate.key, planet: detail.planet }; DEV.handoffs.push(rec);
        if (hold) await new Promise(r => setTimeout(r, hold));
        if (fail) throw new Error("dev: covered work failed (fail=1)");
        await departToGameplay(detail, rec);
      },
      onError(err) { DEV.results.push({ error: err.message }); ev("descent-error", { error: err.message }); if (!entry.survey || entry.survey.state === "disposed") stranded(`The expedition could not start (${err.message}).`); },
    },
  });
  app.addEventListener("bloom:begin-expedition", e => { e.detail.descent.then(r => { DEV.results.push({ ok: true, transition: r.transition }); ev("departed"); }, () => {}); });
  // a title restored from the back-forward cache after a departure (Back from the game) would still be behind its clouds: start it afresh
  addEventListener("pageshow", e => { if (e.persisted && entry.state === "departed") location.reload(); });
  entry.menu.shown.then(() => { DEV.ready = true; ev("menu-shown", { background: entry.menu.background.index + 1 });
    if (begin) { ev("auto-begin"); entry.beginExpedition().catch(err => DEV.errors.push("begin: " + (err && err.message || err))); } },
    err => DEV.errors.push("menu: " + (err && err.message || err)));
  return DEV;
}
