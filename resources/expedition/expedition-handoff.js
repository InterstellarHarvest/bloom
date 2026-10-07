// BLOOM — Expedition handoff (BLOOM-029F): the exact validated Destination Survey planet, carried verbatim across the page boundary
// into gameplay. docs/EXPEDITION_HANDOFF_v1.md.
//
// THE IDENTITY RULE. The survey's `detail.planet` is the authoritative gameplay planet: the very object the production validation
// path produced, the globe drew, the dossier measured and the player chose. The Main Menu / survey page and the run page are two
// documents, and no object reference survives a real navigation, so the planet is SERIALIZED VERBATIM here (plain data in, the
// same plain data out) and REHYDRATED as the run's planet. That is a copy, never a regeneration: nothing in this file, and nothing
// on the expedition boot path, calls BLOOM.generateFromArchetype, BLOOM.generatePlanet, BLOOM.archetype.attemptPlanet,
// BLOOM.play.searchWorld or BLOOM.play.runSearch. The candidate's World Seed and attempt travel as PROVENANCE ONLY (shown to the
// player, named in the report); no consumer may rebuild the world from them.
//
//   const X = BLOOM.expedition;
//   const env = X.pack(detail, { token: X.newToken(), returnTo, fingerprint })   // under full cloud cover, from the survey's detail
//   X.store(env, sessionStorage)                                                 // session-scoped, bounded (MAX_HANDOFFS), never localStorage
//   location.assign(X.runUrl(env.token))                                         // demo-run.html?play=1&expedition=<opaque token>
//   — on the run page —
//   const r = X.load(X.tokenOf(location.search), sessionStorage)                 // { ok, payload } | { ok: false, reason }
//   const run = X.toRun(r.payload, { BLOOM_DATA })                               // the run descriptor: planet = the stored planet
//
// ENVELOPE (version 1): { version, token, source: "destination-survey", scenario: "eden", createdAt, returnTo, planet, candidate,
// render, fingerprint, integrity }. `planet` is detail.planet as plain data; `candidate` is the survey's provenance ({ key, name,
// authored, archetypeId, seed, attempt, classId, sectorSeed, validation }); `render` is the survey's render hints (the archetype's map
// treatment, copied, never reconstructed); `fingerprint` is the survey's own planetFingerprint (survey-data.js) computed by the
// departing page — the one identity algorithm, reused, never re-implemented here; `integrity` is a transport checksum of the
// envelope's own contents (so a corrupted or edited handoff is refused), not a second identity.
//
// STORAGE. sessionStorage only (the tab's session): "strange-bloom.expedition.<token>" per handoff plus one index key. A new
// selection prunes the oldest beyond MAX_HANDOFFS. The handoff is NOT consumed on boot: a refresh and Play Again replay the same exact
// planet from the same token. The URL carries only the token (no planet data).
//
// Classic script, no dependencies, no DOM: boots over file:// like every other run-page file, Node can require it, and the ES-module
// title page reads it as window.BLOOM.expedition. It owns no simulation and no screen.
(function (root) {
  "use strict";
  const VERSION = 1, SOURCE = "destination-survey", SCENARIO = "eden", PARAM = "expedition";
  const KEY_PREFIX = "strange-bloom.expedition.", INDEX_KEY = "strange-bloom.expedition.index", MAX_HANDOFFS = 2;
  const TOKEN_RE = /^x[0-9a-f]{20}$/;
  const CANDIDATE_FIELDS = ["key", "name", "authored", "archetypeId", "seed", "attempt", "classId", "sectorSeed", "validation"];
  const isObj = x => x !== null && typeof x === "object" && !Array.isArray(x);
  const plain = x => (x === undefined ? null : JSON.parse(JSON.stringify(x))); // plain data, verbatim (structured copy of what JSON sees)

  /** An opaque handoff token: "x" + 20 hex characters from the platform's random source. */
  function newToken(random = null) {
    let hex = "";
    const cr = root.crypto && typeof root.crypto.getRandomValues === "function" ? root.crypto : null;
    if (random) { for (let i = 0; i < 20; i++) hex += Math.floor(random() * 16).toString(16); }
    else if (cr) { const b = new Uint8Array(10); cr.getRandomValues(b); for (const v of b) hex += v.toString(16).padStart(2, "0"); }
    else { for (let i = 0; i < 20; i++) hex += Math.floor(Math.random() * 16).toString(16); }
    return "x" + hex;
  }
  const isToken = t => typeof t === "string" && TOKEN_RE.test(t);

  /** Transport checksum (FNV-1a ×2 over the canonical JSON of what identifies the handoff). Detects corruption / edits; not an identity. */
  function integrity(env) {
    const s = JSON.stringify([VERSION, env.source, env.scenario, env.token, env.planet, env.candidate, env.render === undefined ? null : env.render, env.fingerprint === undefined ? null : env.fingerprint]);
    let h1 = 0x811c9dc5, h2 = 0x01000193;
    for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 0x01000193); h2 = Math.imul(h2 ^ c, 0x5bd1e995); h2 ^= h2 >>> 13; }
    return (h1 >>> 0).toString(16).padStart(8, "0") + (h2 >>> 0).toString(16).padStart(8, "0");
  }

  /**
   * Package the survey's Begin Expedition detail (docs/DESTINATION_SURVEY_v1.md §3) as a handoff envelope. `planet` is
   * detail.planet verbatim (plain data), `candidate` the listed provenance fields, `render` detail.render. Nothing is generated.
   *   token        an opaque token (default newToken())
   *   returnTo     where "Main menu" goes after the run (the title page's URL; validated by the run page with BLOOM.play.safeReturn)
   *   fingerprint  the survey's planetFingerprint(detail.planet), computed by the caller with survey-data.js (QA / provenance)
   *   now          createdAt (ms; default Date.now())
   */
  function pack(detail, { token = null, returnTo = null, fingerprint = null, now = null } = {}) {
    if (!detail || !isObj(detail.planet)) throw new TypeError("BLOOM.expedition.pack: detail.planet is required (the survey's authoritative planet)");
    if (!isObj(detail.candidate) || typeof detail.candidate.key !== "string") throw new TypeError("BLOOM.expedition.pack: detail.candidate is required");
    const c = detail.candidate, candidate = {};
    for (const k of CANDIDATE_FIELDS) candidate[k] = c[k] === undefined ? null : plain(c[k]);
    const env = { version: VERSION, token: token || newToken(), source: SOURCE, scenario: SCENARIO, createdAt: now == null ? Date.now() : now,
      returnTo: returnTo == null ? null : String(returnTo), planet: plain(detail.planet), candidate, render: detail.render ? plain(detail.render) : null,
      fingerprint: fingerprint == null ? null : String(fingerprint) };
    env.integrity = integrity(env);
    return env;
  }

  /**
   * Is this a usable handoff? → { ok: true } or { ok: false, reason }: "malformed" (not an envelope), "version" (unsupported),
   * "planet" (no playable planet in it), "integrity" (the checksum does not match its contents).
   */
  function verify(env) {
    if (!isObj(env) || typeof env.token !== "string" || !isToken(env.token)) return { ok: false, reason: "malformed" };
    if (env.version !== VERSION) return { ok: false, reason: "version" };
    if (env.source !== SOURCE || env.scenario !== SCENARIO || !isObj(env.candidate) || typeof env.candidate.key !== "string") return { ok: false, reason: "malformed" };
    const P = env.planet;
    if (!isObj(P) || typeof P.id !== "string" || typeof P.name !== "string" || !Number.isInteger(P.gridWidth) || !Number.isInteger(P.gridHeight) || P.gridWidth <= 0 || P.gridHeight <= 0
      || !Array.isArray(P.sections) || !P.sections.length || !isObj(P.globalClimate) || !Number.isFinite(P.globalClimate.temperature) || !Number.isFinite(P.globalClimate.moisture)
      || (P.tilemap !== undefined && P.tilemap !== null && !(Array.isArray(P.tilemap) && P.tilemap.length === P.gridWidth * P.gridHeight))
      || P.sections.some(s => !isObj(s) || typeof s.id !== "string" || !isObj(s.local))) return { ok: false, reason: "planet" };
    if (typeof env.integrity !== "string" || env.integrity !== integrity(env)) return { ok: false, reason: "integrity" };
    return { ok: true };
  }

  const serialize = env => JSON.stringify(env);
  function parse(text) { try { return { ok: true, env: JSON.parse(text) }; } catch (e) { return { ok: false, reason: "malformed" }; } }
  const keyOf = token => KEY_PREFIX + token;

  /** The tab's sessionStorage (null when unavailable: private mode, file:// in some browsers, no window). */
  function storageOf(r = root) { try { return r && r.sessionStorage ? r.sessionStorage : null; } catch (e) { return null; } }
  function readIndex(storage) { try { const v = JSON.parse(storage.getItem(INDEX_KEY) || "[]"); return Array.isArray(v) ? v.filter(isToken) : []; } catch (e) { return []; } }
  function writeIndex(storage, tokens) { try { storage.setItem(INDEX_KEY, JSON.stringify(tokens)); } catch (e) { /* quota: the handoff itself may still be there */ } }

  /** Keep the newest `keep` handoffs (default MAX_HANDOFFS); remove the rest and any orphan "strange-bloom.expedition.*" item. */
  function prune(storage, keep = MAX_HANDOFFS) {
    if (!storage) return [];
    const idx = readIndex(storage), live = idx.slice(Math.max(0, idx.length - keep));
    for (const t of idx) if (!live.includes(t)) { try { storage.removeItem(keyOf(t)); } catch (e) { /* gone */ } }
    try { const names = []; for (let i = 0; i < storage.length; i++) names.push(storage.key(i));
      for (const n of names) if (n && n.startsWith(KEY_PREFIX) && n !== INDEX_KEY && !live.includes(n.slice(KEY_PREFIX.length))) storage.removeItem(n); } catch (e) { /* no enumeration: the index rules */ }
    writeIndex(storage, live);
    return live;
  }

  /** Store a verified envelope (newest last in the index), pruning older ones beyond MAX_HANDOFFS. Throws on an invalid envelope or no storage. */
  function store(env, storage) {
    const v = verify(env); if (!v.ok) throw new Error("BLOOM.expedition.store: refusing an invalid handoff (" + v.reason + ")");
    if (!storage) throw new Error("BLOOM.expedition.store: no session storage");
    const idx = readIndex(storage).filter(t => t !== env.token); idx.push(env.token);
    writeIndex(storage, idx);
    storage.setItem(keyOf(env.token), serialize(env));
    return prune(storage, MAX_HANDOFFS);
  }

  /**
   * Load a handoff by token → { ok: true, payload } or { ok: false, reason } with reason "missing" (no such handoff in this session, or
   * no token / storage), "malformed", "version", "planet", "integrity". Never substitutes anything: the caller shows a failure state.
   */
  function load(token, storage) {
    if (!isToken(token) || !storage) return { ok: false, reason: "missing" };
    let text = null; try { text = storage.getItem(keyOf(token)); } catch (e) { text = null; }
    if (text === null || text === undefined) return { ok: false, reason: "missing" };
    const p = parse(text); if (!p.ok) return { ok: false, reason: "malformed" };
    const v = verify(p.env); if (!v.ok) return { ok: false, reason: v.reason };
    if (p.env.token !== token) return { ok: false, reason: "integrity" };
    return { ok: true, payload: p.env };
  }
  const list = storage => (storage ? readIndex(storage).filter(t => { try { return storage.getItem(keyOf(t)) !== null; } catch (e) { return false; } }) : []);

  /** The gameplay URL for a token (relative to the demos/ folder by default): only the opaque token travels in the address. */
  const runUrl = (token, page = "demo-run.html") => `${page}?play=1&${PARAM}=${encodeURIComponent(token)}`;
  /** The token in a run page's query string (null when absent). */
  function tokenOf(search) { try { const t = new (root.URLSearchParams)(search || "").get(PARAM); return t === null ? null : t; } catch (e) { return null; } }
  /** `href` with begin=1 added (the title page then enters the Destination Survey at once: "Choose another planet"). */
  function withBegin(href) { try { const u = new root.URL(href); u.searchParams.set("begin", "1"); u.hash = ""; return u.href; } catch (e) { return href; } }

  /**
   * The run descriptor for the run page, from a verified payload: `planet` IS the payload's planet (the rehydrated exact world);
   * `archetype` is the static archetype CONTENT looked up by candidate.archetypeId (display name, presentation metadata, render
   * context) — never a generator call; when that id is unknown to this build, a minimal stand-in from the planet's own provenance.
   * `seed` / `attempt` are provenance. Scenario: Eden (null), the only scenario the survey validates (029F adds no selection).
   */
  function toRun(payload, { BLOOM_DATA = root.BLOOM_DATA } = {}) {
    const v = verify(payload); if (!v.ok) throw new Error("BLOOM.expedition.toRun: invalid handoff (" + v.reason + ")");
    const P = payload.planet, c = payload.candidate, authored = !!c.authored, D = BLOOM_DATA || {};
    const A = !authored && Array.isArray(D.archetypes) ? D.archetypes.find(a => a.id === c.archetypeId) || null : null;
    const archetype = authored ? null : A || { id: c.archetypeId, name: (P.archetype && P.archetype.name) || c.archetypeId || "Unknown world type", render: payload.render || null, display: null, standIn: true };
    const pa = P.archetype || null;
    const expedition = { token: payload.token, source: payload.source, candidateKey: c.key, sectorSeed: c.sectorSeed, classId: c.classId, authored, archetypeId: c.archetypeId,
      seed: c.seed, attempt: c.attempt, validation: c.validation, fingerprint: payload.fingerprint, integrity: payload.integrity, createdAt: payload.createdAt, returnTo: payload.returnTo };
    const summary = { kind: authored ? "authored" : "procedural", expedition: true, source: payload.source, token: payload.token, candidateKey: c.key, sectorSeed: c.sectorSeed, classId: c.classId,
      planetId: P.id, name: P.name, archetypeId: c.archetypeId, archetype: archetype ? archetype.name : null, publicSeed: c.seed, attempt: c.attempt,
      validatedLayers: pa ? pa.validatedLayers || null : null, landmasses: pa ? pa.landmasses ?? null : null, actualWaterPct: pa ? pa.actualWaterPct ?? null : null,
      scenarioId: SCENARIO, scenario: "Eden", fingerprint: payload.fingerprint, integrity: payload.integrity, validation: c.validation };
    return { kind: summary.kind, play: true, planet: P, archetype, seed: authored ? null : c.seed, scenario: null, render: payload.render || null, expedition, summary };
  }

  const API = { version: VERSION, VERSION, SOURCE, SCENARIO, PARAM, KEY_PREFIX, INDEX_KEY, MAX_HANDOFFS, CANDIDATE_FIELDS: Object.freeze(CANDIDATE_FIELDS.slice()),
    newToken, isToken, integrity, pack, verify, serialize, parse, storageOf, store, load, list, prune, runUrl, tokenOf, withBegin, toRun };
  root.BLOOM = Object.assign(root.BLOOM || {}, { expedition: Object.freeze(API) });
})(typeof window !== "undefined" ? window : globalThis);
