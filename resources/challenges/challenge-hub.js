// BLOOM — the CHALLENGES hub (BLOOM-036A; 036B copy for the one-planet launch). docs/CHALLENGES_SYSTEM_v1.md §3 (flow), §7 (hub).
//
// The main menu's CHALLENGES opens this screen inside the one document (the app loads this module lazily on the first CHALLENGES, like the
// Species Selection screen). It lists every released Challenge (BLOOM.challenges.list(): content order, which is not a ranking) and shows
// the selected one's dossier; BEGIN CHALLENGE hands the resolved Challenge to the flow (ExpeditionEntry, 036B: → Choose Plant Species if
// the Challenge allows it → PREPARING CHALLENGE WORLD → the Challenge Planet Dossier → Begin challenge → the run). No Destination Survey.
//
//   import { ChallengeHub } from "<repo>/resources/challenges/challenge-hub.js";
//   const h = new ChallengeHub(host, { challenge, reducedMotion, onChoose(ch), onBack() });
//   await h.ready · h.focus() · h.select(id) · h.open(id) · h.close() · h.choose() · h.back() · h.dispose()
//
// Layout (the BLOOM-034 night planning language, resources/ui/bloom-theme.css): desktop — the three Challenges as a radiogroup of cards on
// the left (icon + name + one line + what changes), the selected one's dossier on the right (briefing, what changes, the strategic idea,
// the science / context, how the run works), the primary BEGIN CHALLENGE at its foot. Selecting a card updates the dossier. Phone (≤ 700 px):
// one vertical list; a card opens its dossier as a sheet with BEGIN CHALLENGE pinned. Keyboard: a roving-tabindex radiogroup (← → ↑ ↓
// Home End), Enter / Space opens the dossier (focus moves to its heading), Escape closes it, and from the cards goes Back (the title).
// Copy: the Challenge's own resolved presentation (mostly references to its scenario's player-facing copy — content/challenges.js). No
// difficulty labels, stars, scores or recommended skill; the scenario glyph and the word together carry the meaning, never colour alone.
import { ico } from "../ui/bloom-icons.js";

const CSS_URL = new URL("./challenge-hub.css", import.meta.url).href;
function attachCss() { if (document.querySelector('link[data-bloom="challenge-hub"]')) return;
  const l = document.createElement("link"); l.rel = "stylesheet"; l.href = CSS_URL; l.dataset.bloom = "challenge-hub"; document.head.appendChild(l); }
const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const NARROW = 700;
// the launch / completion policies in player words (BLOOM.challenges.LAUNCH_POLICIES; a policy without words here is a programming error).
// (036B) A Challenge generates ONE world: no Destination Survey, no choosing among worlds. Functions take the resolved Challenge.
const traitName = id => { const t = (window.BLOOM_DATA.traits || []).find(x => x.id === id); return t ? t.name : id; };
const POLICY_WORDS = {
  species: { "player-choice": () => "You choose your plant: every species is open.",
    prescribed: c => `This Challenge prescribes the plant: ${window.BLOOM.challenges.speciesOf(c).name}.` },
  world: { "seed-bank": () => "One qualifying Challenge world is generated for your plant: there is no survey and no choosing among worlds." },
  startingState: { normal: () => "Your plant lands as it always does: nothing owned yet.",
    prescribed: c => { const st = window.BLOOM.challenges.startingStateOf(c), n = {}; for (const id of st.adaptations) n[id] = (n[id] || 0) + 1;
      const closed = window.BLOOM.challenges.closedByStart(c).map(t => ` ${t.name} is not available${t.why ? `: ${t.why}` : ""}.`).join("");
      return "Your plant lands with what the Challenge gives it: " + [...Object.entries(n).map(([id, k]) => traitName(id) + (k > 1 ? ` ×${k}` : "")), ...(st.biomass != null ? [`${st.biomass} Biomass`] : [])].join(" · ") + "." + closed; } },
  // (036D1) a gated Challenge (a completion condition) never says "the normal Bloom": an early Bloom is only a milestone there
  win: { bloom: c => window.BLOOM.challengeCompletion.contract(c).gated
    ? "Win with the Bloom held in the final atmosphere: reaching it earlier is a milestone, and the run goes on (extinction stays possible) until the atmosphere has settled."
    : "Win with the normal Bloom: cover the planet's target share of land." },
};
/** (036D1) the completion contract in the hub's words: the Bloom goal + each condition (BLOOM.challengeCompletion.goal); "" when ungated. */
function goalHtml(c) {
  const G = window.BLOOM.challengeCompletion.goal(c, window.BLOOM_DATA.config.win); if (!G.gated) return "";
  return `<div class="ch-goal" data-gated="true"><p class="ch-goal-l"><b>${esc(G.bloom.title.toUpperCase())}</b><span>${esc(G.bloom.body)}</span></p>` +
    G.conditions.map(k => `<p class="ch-goal-l cond" data-condition="${esc(k.type)}"><b>${esc(k.title.toUpperCase())}</b><span>${esc(k.body)}</span></p>`).join("") + `</div>`;
}

export class ChallengeHub {
  constructor(host, { challenge = null, reducedMotion = null, onChoose = null, onBack = null } = {}) {
    if (!host || typeof host.appendChild !== "function") throw new TypeError("ChallengeHub: host must be a DOM element");
    const B = window.BLOOM;
    if (!B || !B.challenges) throw new Error("ChallengeHub: load content/challenges.js and resources/bloom-challenges.js");
    this.host = host; this.onChoose = onChoose; this.onBack = onBack; this.forcedReducedMotion = reducedMotion;
    this.list = B.challenges.list();
    if (!this.list.length) throw new Error("ChallengeHub: no released Challenge");
    const start = challenge ? B.challenges.resolve(typeof challenge === "string" ? challenge : challenge.id) : this.list[0];
    this.index = Math.max(0, this.list.indexOf(start)); this.state = "list"; this.disposed = false;
    this.mq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
    this.stats = { selects: 0, opens: 0, closes: 0, moves: 0, chosen: null };
    for (const ch of this.list) this._words(ch); // every policy has player words before anything is drawn
    attachCss();
    this._build();
    this.ready = new Promise(res => { const l = document.querySelector('link[data-bloom="challenge-hub"]'), done = () => res(this);
      if (!l || l.sheet) return done(); l.addEventListener("load", done, { once: true }); l.addEventListener("error", done, { once: true }); setTimeout(done, 3000); });
  }

  get reducedMotion() { return this.forcedReducedMotion ?? !!(this.mq && this.mq.matches); }
  get selected() { return this.list[this.index]; }
  /** phone layout: the dossier is a sheet over the list (desktop: always beside it) */
  get narrow() { return this.root.clientWidth <= NARROW; }

  /** Focus the selected card (the radiogroup's one tab stop), or the dossier heading while it is open. */
  focus() { if (this.state === "detail") this.dossierTitle.focus({ preventScroll: true }); else this.cards[this.index].focus({ preventScroll: false }); }

  /** Select Challenge `id`: its card is checked and the dossier shows it (the selection is what BEGIN CHALLENGE starts). */
  select(id, { focus = false } = {}) {
    if (this.disposed) return false;
    const i = this.list.findIndex(c => c.id === id); if (i < 0) throw new Error(`ChallengeHub: unknown Challenge "${id}"`);
    this._select(i, focus); return true;
  }

  /** Open the dossier of `id` (default: the selected one): focus moves to its heading; on a phone it opens as a sheet. */
  open(id = this.selected.id) {
    if (this.disposed || this.state === "chosen") return false;
    this.select(id); this.state = "detail"; this.stats.opens++;
    this.root.dataset.state = "detail";
    const sheet = this.narrow; this.root.dataset.sheet = String(sheet);
    this.listEl.inert = sheet; this.headTools.inert = sheet; this.dossier.inert = false;
    if (sheet && !this.reducedMotion) this.dossier.animate([{ opacity: 0, transform: "translateY(18px)" }, { opacity: 1, transform: "none" }], { duration: 240, easing: "cubic-bezier(.2,.8,.2,1)" });
    this.dossierTitle.focus({ preventScroll: true });
    return true;
  }

  /** Close the dossier: focus returns to the selected card. */
  close() {
    if (this.state !== "detail") return false;
    this.state = "list"; this.stats.closes++;
    this.root.dataset.state = "list"; this.root.dataset.sheet = "false";
    this.listEl.inert = false; this.headTools.inert = false; this.dossier.inert = this.narrow;
    this.cards[this.index].focus({ preventScroll: true });
    return true;
  }

  /** BEGIN CHALLENGE: hand the selected Challenge to the consumer (the entry fades to Choose Plant Species). */
  choose() {
    if (this.disposed || this.state === "chosen") return false;
    const ch = this.selected;
    this.stats.chosen = ch.id; this.state = "chosen"; this.root.dataset.state = "chosen";
    if (this.onChoose) this.onChoose(ch);
    return true;
  }

  back() { if (this.state === "detail") return this.close(); if (this.state !== "list") return false; if (this.onBack) this.onBack(); return true; }

  dispose() {
    if (this.disposed) return; this.disposed = true; this.state = "disposed";
    this.root.removeEventListener("keydown", this._onKey); this.root.removeEventListener("click", this._onClick);
    if (this._ro) this._ro.disconnect();
    this.root.remove();
  }

  // ---------------------------------------------------------------- DOM
  _build() {
    const r = this.root = document.createElement("section");
    r.className = "ch"; r.dataset.state = "list"; r.dataset.sheet = "false"; r.setAttribute("aria-label", "Challenges");
    if (this.forcedReducedMotion === true) r.classList.add("rm");
    const tid = "ch-title-" + Math.floor(Math.random() * 1e9).toString(36), did = tid + "-d";
    r.innerHTML = `<div class="ch-scroll">
      <header class="ch-head">
        <button type="button" class="ch-btn ghost" data-act="back">${ico("back")}<span>Main menu</span></button>
        <div class="ch-title"><span class="ch-kicker">${ico("challenge")}Challenges</span><h1 id="${tid}">Choose a challenge</h1></div>
      </header>
      <p class="ch-lede">Each Challenge is a contained run with its own starting situation and pressure. Read the brief, choose what the Challenge
        allows, and find a way to bloom.</p>
      <div class="ch-body">
        <div class="ch-list" role="radiogroup" aria-labelledby="${tid}">${this.list.map((c, i) => this._card(c, i)).join("")}</div>
        <aside class="ch-dossier" id="${did}" aria-labelledby="${did}-h">
          <div class="ch-d-main">
            <p class="ch-d-kicker"><span class="ch-d-i"></span><span>Challenge</span></p>
            <h2 id="${did}-h" tabindex="-1"></h2>
            <p class="ch-d-brief"></p>
            <dl class="ch-rows"></dl>
          </div>
          <div class="ch-actions">
            <button type="button" class="ch-btn ghost ch-close" data-act="close">${ico("back")}<span>All challenges</span></button>
            <button type="button" class="ch-btn go" data-act="choose">${ico("challenge")}<span>Begin challenge</span></button>
          </div>
        </aside>
      </div></div>`;
    this.host.appendChild(r);
    const q = s => r.querySelector(s);
    this.listEl = q(".ch-list"); this.cards = [...r.querySelectorAll(".ch-card")]; this.dossier = q(".ch-dossier"); this.dossierTitle = q(".ch-dossier h2");
    this.headTools = q(".ch-head"); this.beginBtn = q('[data-act="choose"]');
    this._select(this.index, false);
    this.dossier.inert = this.narrow;
    // a resize across the phone width keeps the dossier reachable (desktop) or tucked away until opened (phone)
    if (window.ResizeObserver) { this._ro = new ResizeObserver(() => { if (this.disposed) return; const n = this.narrow;
      if (this.state === "list") this.dossier.inert = n; else if (this.state === "detail" && !n && this.root.dataset.sheet === "true") { this.root.dataset.sheet = "false"; this.listEl.inert = false; this.headTools.inert = false; } });
      this._ro.observe(r); }
    this._onClick = e => {
      const b = e.target.closest("button, .ch-card"); if (!b || !r.contains(b)) return;
      if (b.classList.contains("ch-card")) { const i = +b.dataset.index;
        if (this.state === "detail" && !this.narrow) { this.state = "list"; r.dataset.state = "list"; } // desktop: a card click is a selection
        this._select(i, false); if (this.narrow) this.open(this.list[i].id); return; }
      const act = b.dataset.act;
      if (act === "back") this.back(); else if (act === "close") this.close(); else if (act === "choose") this.choose();
    };
    this._onKey = e => {
      if (e.key === "Escape") { e.preventDefault(); this.back(); return; }
      if (!e.target.classList || !e.target.classList.contains("ch-card")) return;
      const n = this.cards.length, k = e.key;
      const to = k === "ArrowRight" || k === "ArrowDown" ? (this.index + 1) % n : k === "ArrowLeft" || k === "ArrowUp" ? (this.index + n - 1) % n : k === "Home" ? 0 : k === "End" ? n - 1 : null;
      if (to !== null) { e.preventDefault(); this._select(to, true); this.stats.moves++; return; }
      if (k === "Enter" || k === " ") { e.preventDefault(); this.open(this.selected.id); }
    };
    r.addEventListener("click", this._onClick); r.addEventListener("keydown", this._onKey);
  }

  _card(c, i) {
    const P = c.presentation, G = window.BLOOM.challengeCompletion.goal(c, window.BLOOM_DATA.config.win);
    // (036D1) a gated Challenge's card names its extra win condition (the dossier explains it)
    const cond = G.gated ? G.conditions.map(k => `<span class="ch-card-cond" data-condition="${esc(k.type)}">${ico("pressure")}Bloom in the ${esc(k.title.toLowerCase())}</span>`).join("") : "";
    return `<div class="ch-card" role="radio" aria-checked="false" tabindex="-1" data-index="${i}" data-challenge="${esc(c.id)}" data-scenario="${esc(c.scenario)}"
        aria-label="${esc(c.name)}. ${esc(c.short)}${G.gated ? ` Win condition: Bloom in the ${esc(G.conditions.map(k => k.title.toLowerCase()).join(", "))}.` : ""}" aria-controls="">
      <span class="ch-card-i" aria-hidden="true">${ico(P.icon)}</span>
      <span class="ch-card-t"><h3>${esc(c.name)}</h3><span class="ch-card-short">${esc(c.short)}</span><span class="ch-card-tag">${esc(P.tagline)}</span>${cond}</span>
    </div>`;
  }

  _select(i, focus) {
    const changed = i !== this.index || !this._filled;
    this.index = i; this.stats.selects++;
    this.cards.forEach((c, j) => { c.setAttribute("aria-checked", String(j === i)); c.tabIndex = j === i ? 0 : -1; c.setAttribute("aria-controls", this.dossier ? this.dossier.id : ""); });
    if (changed) this._fill(this.list[i]);
    // (036D1) the keyboard-selected card is brought fully into view: Firefox's focus() leaves a PARTLY visible card cut off at the list's edge
    // (with six Challenges the list scrolls at 1024 × 768); "nearest" moves the list / page only as far as needed
    if (focus) { this.cards[i].focus({ preventScroll: true }); this.cards[i].scrollIntoView({ block: "nearest", inline: "nearest" }); }
  }

  /** The player words for a Challenge's launch / completion policies (throws for a policy the hub cannot describe). */
  _words(c) {
    const w = k => { const f = POLICY_WORDS[k] && POLICY_WORDS[k][k === "win" ? c.completion.win : c.launch[k].policy]; if (!f) throw new Error(`ChallengeHub: no words for ${k} policy of ${c.id}`); return f(c); };
    return { species: w("species"), world: w("world"), startingState: w("startingState"), win: w("win") };
  }

  _fill(c) {
    this._filled = true;
    const P = c.presentation, d = this.dossier, q = s => d.querySelector(s), S = window.BLOOM.challenges.scenarioOf(c), W = this._words(c);
    d.dataset.challenge = c.id; d.dataset.scenario = c.scenario;
    q(".ch-d-i").innerHTML = ico(P.icon); this.dossierTitle.textContent = c.name;
    q(".ch-d-brief").textContent = P.briefing;
    const row = (cls, icon, label, body) => `<div class="ch-row ${cls}"><dt><span class="ch-row-i" aria-hidden="true">${ico(icon)}</span>${esc(label)}</dt><dd>${body}</dd></div>`;
    const para = t => `<p>${esc(t)}</p>`, list = a => `<ul>${a.map(t => `<li>${esc(t.charAt(0).toUpperCase() + t.slice(1))}</li>`).join("")}</ul>`;
    const loss = S.loss && S.loss.extinction ? "The run ends in extinction if no living plants are left anywhere." : "";
    const goal = goalHtml(c);
    q(".ch-rows").innerHTML = [
      goal ? row("goal", "challenge", "To win", goal) : "",          // (036D1) the completion contract, before anything else, when it is not the plain Bloom
      row("changes", P.icon, "What changes", para(P.tagline)),
      row("idea", "adapt", "Strategic idea", para(P.strategicIdea)),
      (P.science || P.sciencePoints) ? row("science", "info", P.sciencePoints ? "Why it happens" : "The science", P.science ? para(P.science) : list(P.sciencePoints)) : "",
      row("run", "world", "How the run works", list([W.species, W.world, W.startingState, W.win, loss].filter(Boolean))),
    ].join("");
    this.beginBtn.setAttribute("aria-label", `Begin challenge: ${c.name}`);
  }
}
