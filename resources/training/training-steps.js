// BLOOM — the guided training's lesson script for Training Grounds (BLOOM-028D2). docs/GUIDED_TRAINING_v1.md §4.
//
// STEP DATA ONLY: thirteen lessons in order, each with its copy, where it points and the OUTCOME that finishes it. Every function
// here is pure over the plain `ctx` the director builds from the real run (./training-director.js): no DOM, no adapter, no clock,
// no BLOOM_API. Nothing here acts for the player; the one effect a step may ask for is the scripted bonus bubble (step 3,
// `prepare` → hooks.placeBubble, i.e. BLOOM_RUN_UI.placeBubble). How targets become screen positions is the coach's business
// (./training-coach.js); this file only names them:
//   { anchor: "<data-tutorial name>" }   a frozen production anchor (docs/GAMEPLAY_UI_CONVERGENCE_v1.md §10)
//   { control: "tool:adapt" | "room-nav:spread" | "room-resume" | "help:cold" | "banner-inspect" | "tab:colony" | "strip:<region id>" }
//                                        a real production control without an anchor (the coach's CONTROLS table)
//   { region: "<region id>" }            a map region (Planet View geometry: planetView.regionPoint / regionRect)
//   { bubble: <tile> }                   a bonus bubble on the map
//   { any: [target, …] }                 the first of these that is on screen now (alternative routes to the same control)
// The first target that resolves is the primary one (the ring, the leader, the card's placement); the rest are secondary rings.
//
// ctx (built fresh for every evaluation; ./training-director.js):
//   run { ticks, running, speed, won }   hud { biomass, coverage, winAt, winPct }   growThresh (the run's own grow.growThresh)
//   region(id) → { id, name, viable (fitness > growThresh), fitness, living, focus, localUpgrade, limitKey, limitText, blocked, isOrigin }
//   regions()  upgrade(id) → adapter.upgrade(id)   owned(id) → tier   spreadOwned() → the owned Spread upgrades
//   colony(id) → adapter.colony(id)   previewOf(id) → adapter.previewOf(id) (the silent real what-if: no event, nothing shown)
//   ui { room: null | "region" | "adapt" | "spread" | "terraform", context (region id), tab, selection (home region id), transitioning }
//   seen { previews: Set<id>, purchases: [{ id, board }], bubbles: [{ tile, how }], focus: [...], local: [...], won }   (the run's real events)
//   mem (this step's own memory)
//
// keepClear: extra controls this lesson's card must rather not cover (what it asks the player to READ), besides the shared KEEP_CLEAR.
// complete(ctx) → false, or { how, ack? } — `how` names the outcome that finished it (the proof's record); `ack` is one line the NEXT
// callout shows, so a lesson finished off-script (Warm the Sky, Drought, an auto-collected bubble, an upgrade bought early) is
// acknowledged, never denied. Completion reads the CURRENT state (and the events already seen), so an action taken early, by
// keyboard, or between two renders still counts. No predicate reads elapsed time.

export const TRAINING_REGIONS = Object.freeze({ meadow: "landing_meadow", verge: "green_verge", chill: "chill_hollow", fen: "reed_fen", flats: "thirsty_flats", salt: "salt_pan" });
const R = TRAINING_REGIONS;
/** Green Verge counts as settled by natural spread once this many of its tiles are living (the paused 028D2 draft's threshold; the
 *  real Training Grounds run crosses it at tick 122, ≈ 20 s at 1×, before any purchase: tools/guided-training-check.js N4). */
export const VERGE_ESTABLISHED = 6;
/** Controls the card should rather not cover (in addition to its own targets): the clock, the HUD, an open run menu / Map View popover,
 *  the navigation the player may need at any moment (the Planet View's tools, an open room's header: Back · room tabs · Resume) and every
 *  other control of an open room (nodes, Region Inspect's tabs, focus / local options, region chips): the honest alternatives — Warm the
 *  Sky, Early Maturity, Drought, another colony — stay clickable. */
export const KEEP_CLEAR = ["play-pause", "speed", "run-menu", "biomass", "coverage", { control: "popover" }, { control: "room-header" }, { control: "hud-tools" }, { control: "room-controls", all: true }];

const viable = (ctx, id) => { const r = ctx.region(id); return !!(r && r.viable); };
const owned = (ctx, id) => ctx.owned(id) > 0;
const name = (ctx, id) => { const r = ctx.region(id); return r ? r.name : id; };
const inRoom = ctx => !!ctx.ui.room;
const paused = ctx => !ctx.run.running && !ctx.run.won;
const pausedLine = "The world is paused. Press Play to let it grow.";
/** the price line while the player is short of Biomass for `what` (null when affordable) */
function afford(ctx, price, what) {
  const b = ctx.hud.biomass; if (!(price > b)) return null;
  return `${what} costs ${price} Biomass. You have ${b}, so ${price - b} more to go.${ctx.run.running ? " Your colonies are earning it now." : " Press Play to keep earning."}`;
}
/** the room-aware way to an upgrade: its node in its room; the room's tab from another room; the Planet View tool (or the banner's
 *  real "Would help" button for it when the selected region shows one) */
function toUpgrade(ctx, id, room) {
  if (ctx.ui.room === room) return [{ anchor: `upgrade-${id}` }];
  if (inRoom(ctx)) return [{ control: `room-nav:${room}` }];
  return [{ any: [{ control: `help:${id}` }, { control: `tool:${room}` }] }];
}
/** the room-aware way to a colony's controls: Region Inspect's Colony tab (opened from the banner, the Regions tool or a room tab) */
function toColony(ctx, anchor) {
  const ui = ctx.ui;
  if (ui.room === "region") {
    const c = ui.context && ctx.region(ui.context);
    if (!c || !c.living) return [{ control: `strip:${R.meadow}` }];
    return ui.tab === "colony" ? [{ anchor }] : [{ control: "tab:colony" }];
  }
  if (inRoom(ctx)) return [{ control: "room-nav:region" }];
  const sel = ui.selection && ctx.region(ui.selection);
  return sel && sel.living ? [{ control: "banner-inspect" }] : [{ any: [{ region: R.meadow }, { control: "tool:region" }] }];
}
const colonyName = ctx => { const ui = ctx.ui, id = ui.room === "region" ? ui.context : ui.selection, r = id && ctx.region(id); return r && r.living ? r.name : name(ctx, R.meadow); };
const regionStep = (ctx, id) => inRoom(ctx) ? [{ control: `strip:${id}` }] : [{ region: id }];
const isContext = (ctx, id) => ctx.ui.selection === id || (!!ctx.ui.room && ctx.ui.context === id);

export function trainingSteps() { return [
  // 1 · the landing, the REAL goal, Play
  { id: "start", title: "Start the world",
    body: ctx => `Your pioneer plant has landed in Landing Meadow. Keep ${ctx.hud.winPct}% of this world's land alive at once to finish training. Press Play to start.`,
    targets: ctx => inRoom(ctx) ? [{ control: "room-resume" }] : [{ anchor: "play-pause" }, { anchor: "coverage" }],
    complete: ctx => ctx.run.running && ctx.run.ticks > 0 && { how: "running" } },

  // 2 · natural spread into open ground
  { id: "natural-spread", title: "Watch it spread",
    body: () => "It spreads by itself into ground it can live on. Watch it settle Green Verge.",
    targets: ctx => paused(ctx) ? [inRoom(ctx) ? { control: "room-resume" } : { anchor: "play-pause" }, ...(inRoom(ctx) ? [] : [{ region: R.verge }])] : regionStep(ctx, R.verge),
    status: ctx => paused(ctx) ? pausedLine : `Green Verge: ${Math.min(ctx.region(R.verge).living, VERGE_ESTABLISHED)} of ${VERGE_ESTABLISHED} patches settled.`,
    complete: ctx => ctx.region(R.verge).living >= VERGE_ESTABLISHED && { how: "established" } },

  // 3 · Biomass and ONE scripted bonus bubble (placed through the run page's own hook; clicked or auto-collected)
  { id: "biomass", title: "Biomass",
    prepare: (ctx, hooks) => { if (!(ctx.mem.tile >= 0)) { ctx.mem.tries = (ctx.mem.tries || 0) + 1; ctx.mem.tile = hooks.placeBubble(R.meadow); } },
    body: () => "Living plants earn Biomass, the energy you spend on upgrades. A bonus bubble just appeared in Landing Meadow: click it to collect it.",
    targets: ctx => inRoom(ctx) ? [{ control: "room-resume" }, { anchor: "biomass" }] : ctx.mem.tile >= 0 ? [{ bubble: ctx.mem.tile }, { anchor: "biomass" }] : [{ region: R.meadow }, { anchor: "biomass" }],
    status: ctx => inRoom(ctx) ? "The bubble is on the planet map. Go back to the planet to collect it." : null,
    complete: ctx => { if (!(ctx.mem.tile >= 0)) return false;
      const b = ctx.seen.bubbles.find(x => x.tile === ctx.mem.tile);
      if (b) return { how: b.how, ack: b.how === "auto" ? "That bubble collected itself, at half value. Click bubbles for the full amount." : `+${b.value} Biomass. Your colonies earn it all the time.` };
      return false; } },

  // 4 · a blocked region: inspect it through the real UI (map click, keyboard, or a room's region context)
  { id: "inspect-chill", title: "A region that isn't growing",
    body: () => "Chill Hollow isn't growing. Click it on the map to find out why.",
    targets: ctx => regionStep(ctx, R.chill),
    complete: ctx => isContext(ctx, R.chill) ? { how: ctx.ui.room ? "room-context" : "selected" } : viable(ctx, R.chill) ? { how: "solved-early", ack: chillAck(ctx) } : false },

  // 5 · its limiting factor, and the real preview of the answer in Adapt
  { id: "limiting-factor", title: "Find the limiting factor",
    body: ctx => { const c = ctx.region(R.chill), why = c.limitText || "too cold for your plant";
      return ctx.ui.room === "adapt" ? `One limiting factor holds it back: ${c.limitKey}, ${why}. Point at Cold Tolerance to preview the fix.`
        : `One limiting factor holds it back: ${c.limitKey}, ${why}. Open Adapt to find the answer.`; },
    targets: ctx => toUpgrade(ctx, "cold", "adapt"),
    keepClear: ["limiting-factor", "readout", { control: "room-effect" }],
    complete: ctx => ctx.seen.previews.has("cold") ? { how: "preview" } : owned(ctx, "cold") ? { how: "bought-early" }
      : viable(ctx, R.chill) ? { how: "solved-early", ack: chillAck(ctx) } : false },

  // 6 · Adapt: buy it; finished when Chill Hollow is genuinely viable (Warm the Sky is an honest second answer)
  { id: "adapt-buy", title: "Change the plant",
    body: () => "Adapt changes your plant, everywhere at once. Buy Cold Tolerance and Chill Hollow opens.",
    targets: ctx => [...toUpgrade(ctx, "cold", "adapt"), ...(inRoom(ctx) ? [] : [{ region: R.chill }])],
    status: ctx => { const u = ctx.upgrade("cold"); return u && !u.owned ? afford(ctx, u.price, "Cold Tolerance") : null; },
    complete: ctx => viable(ctx, R.chill) && { how: owned(ctx, "cold") ? "cold" : owned(ctx, "warm") ? "warm" : "other", ack: chillAck(ctx) } },

  // 7 · Spread (recovered from the paused 028D2 draft): how the plant travels, not where it can live — the real Seed Output
  { id: "spread", title: "Spread upgrades",
    body: ctx => ctx.seen.previews.has("seedOut") ? "No region opens or closes: your plant just spreads faster. Buy Seed Output."
      : "Spread upgrades change how your plant moves and reproduces, not what it can survive. Point at Seed Output to preview it.",
    targets: ctx => toUpgrade(ctx, "seedOut", "spread"),
    status: ctx => { const u = ctx.upgrade("seedOut"); return u && !u.owned && ctx.seen.previews.has("seedOut") ? afford(ctx, u.price, "Seed Output") : null; },
    complete: ctx => { const s = ctx.spreadOwned(); if (!s.length) return false; const u = s.find(x => x.id === "seedOut") || s[0];
      return { how: u.id, ack: u.id === "seedOut" ? "Seed Output: every colony now throws more seed." : `${u.name} is a real Spread upgrade too: it changes how your plant travels, not where it can live.` }; } },

  // 8 · a colony's Growth Focus (recovered): any real non-Balanced focus, on any living colony
  { id: "growth-focus", title: "Growth Focus",
    body: ctx => ctx.ui.room === "region" && ctx.ui.tab === "colony" && ctx.region(ctx.ui.context).living
      ? `Pick Roots, Leaves or Seeds for ${colonyName(ctx)}. It's free, and you can change it any time.`
      : `Each colony can focus its energy. Open ${colonyName(ctx)}'s controls: Region Inspect, then its Colony tab.`,
    targets: ctx => toColony(ctx, "growth-focus"),
    complete: ctx => { const r = ctx.regions().find(x => x.living > 0 && x.focus && x.focus !== "balanced"); if (!r) return false;
      return { how: r.focus, ack: `${r.name} now grows with a ${r.focus[0].toUpperCase() + r.focus.slice(1)} focus. Each colony keeps its own.` }; } },

  // 9 · a Local Upgrade: ANY real one, on any colony
  { id: "local-upgrade", title: "Local Upgrade",
    body: ctx => `A Local Upgrade spends Biomass to improve one colony for good. Buy any one for ${colonyName(ctx)}.`,
    targets: ctx => toColony(ctx, "local-upgrade"),
    status: ctx => { const id = ctx.ui.room === "region" ? ctx.ui.context : R.meadow, c = id && ctx.colony(id); return c && !c.localUpgrade ? afford(ctx, c.localPrice, "A Local Upgrade") : null; },
    complete: ctx => { const r = ctx.regions().find(x => x.localUpgrade); return r ? { how: r.localUpgrade, ack: `${r.name} keeps that upgrade for good.` } : false; } },

  // 10 · Terraform: the real Humidify preview over the whole planet (context: Thirsty Flats; Reed Fen pays)
  { id: "terraform-preview", title: "Change the planet",
    body: ctx => ctx.ui.room === "terraform"
      ? "Terraform changes the whole planet, not your plant. Point at Humidify to preview what it does to every region."
      : "Thirsty Flats is too dry for your plant. Terraform changes the whole planet: open Terraform and point at Humidify.",
    targets: ctx => [...toUpgrade(ctx, "humid", "terraform"), ...(inRoom(ctx) ? [] : [{ region: R.flats }])],
    keepClear: ["limiting-factor", { control: "room-effect" }, { control: "room-preview" }],
    complete: ctx => ctx.seen.previews.has("humid") ? { how: "preview" } : owned(ctx, "humid") ? { how: "bought-early" }
      : viable(ctx, R.flats) ? { how: "solved-early", ack: flatsAck(ctx) } : false },

  // 11 · read the real tradeoff, then solve the dry region (Humidify taught; Drought Adaptation honest; judged by the outcome)
  { id: "tradeoff", title: "Read the tradeoff",
    body: ctx => tradeoffText(ctx),
    targets: ctx => [...toUpgrade(ctx, "humid", "terraform"), ...(inRoom(ctx) ? [] : [{ region: R.flats }, { region: R.fen }])],
    keepClear: [{ control: "room-effect" }, { control: "room-preview" }],
    status: ctx => { const h = ctx.upgrade("humid"); if (owned(ctx, "humid") || owned(ctx, "drought")) return "Not quite there yet: Thirsty Flats is still too dry. Check its limiting factor.";
      return (h && afford(ctx, h.price, "Humidify")) || "Drought Adaptation, in Adapt, is the other answer: it changes your plant instead."; },
    complete: ctx => viable(ctx, R.flats) && { how: owned(ctx, "humid") ? "humid" : owned(ctx, "drought") ? "drought" : "other", ack: flatsAck(ctx) } },

  // 12 · a sacrifice zone: read Salt Pan, and let it go (Salt Handling is never asked for)
  { id: "sacrifice", title: "You don't need every region",
    body: ctx => viable(ctx, R.salt)
      ? "Salt Handling opened even Salt Pan. It was a costly fix you never needed. Click Salt Pan: not every region is worth solving."
      : `Salt Pan's ${(ctx.region(R.salt).limitKey || "soil").toLowerCase()} is hostile, and Terraform can't change soil. You can win without it: click Salt Pan, then let it go.`,
    targets: ctx => regionStep(ctx, R.salt),
    status: () => "Winning doesn't mean fixing every region.",
    complete: ctx => isContext(ctx, R.salt) && { how: ctx.ui.room ? "room-context" : "selected" } },

  // 13 · the REAL goal: finished only by the run's own bloom:win
  { id: "goal", title: ctx => `Grow to ${ctx.hud.winPct}%`,
    body: ctx => `You don't need Salt Pan. Keep growing until ${ctx.hud.winPct}% of the land is alive at once. The speed button can help.`,
    targets: ctx => inRoom(ctx) ? [{ control: "room-resume" }] : [{ anchor: "coverage" }, { anchor: "speed" }],
    status: ctx => { if (paused(ctx)) return pausedLine;
      const regs = ctx.regions(), land = regs.reduce((a, r) => a + r.area, 0), reach = regs.filter(r => r.viable).reduce((a, r) => a + r.area, 0) / land;
      if (reach < ctx.hud.winAt + 0.02) return "Your plant is running out of ground it can live on. Open another region to get there.";
      return `Coverage ${Math.round(ctx.hud.coverage * 100)}% of ${ctx.hud.winPct}%.`; },
    complete: ctx => (ctx.seen.won || ctx.run.won) && { how: "win" } },
]; }

const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
function chillAck(ctx) {
  if (owned(ctx, "warm") && !owned(ctx, "cold")) return "Warm the Sky opened Chill Hollow instead: Terraform warmed the whole planet rather than changing your plant.";
  return "Chill Hollow suits your plant now. It will move in by itself.";
}
function flatsAck(ctx) {
  if (owned(ctx, "drought") && !owned(ctx, "humid")) return `Drought Adaptation opened Thirsty Flats, but Reed Fen ${viable(ctx, R.fen) ? "got harder for your plant" : "is now too wet for your plant"}. Every fix has a cost.`;
  if (owned(ctx, "humid")) return `Humidify opened Thirsty Flats. The whole sky got wetter, so Reed Fen did too${viable(ctx, R.fen) ? ", but it still grows" : ""}.`;
  return "Thirsty Flats is open now.";
}
/** the tradeoff in words, from the REAL Humidify what-if (adapter.previewOf: gain / lose / worse), never from assumed numbers */
function tradeoffText(ctx) {
  const p = ctx.previewOf("humid"), names = ids => ids.map(id => name(ctx, id)).join(" and ");
  if (!p || !p.available) return "Humidify would open Thirsty Flats, but the whole sky gets wetter. Read its preview, then buy it.";
  const gain = p.gain.length ? names(p.gain) : "Thirsty Flats", hurt = p.worse.filter(id => !p.gain.includes(id)), lose = p.lose;
  const cost = lose.length ? `but ${names(lose)} would close` : hurt.length ? `${names(hurt)} ${hurt.length > 1 ? "get" : "gets"} wetter too, but still ${hurt.length > 1 ? "grow" : "grows"}` : "nothing else gets worse";
  return `Humidify would open ${gain}. ${cap(cost)}. ${lose.length ? "Weigh it before you buy." : "This trade is worth it: buy Humidify."}`;
}
