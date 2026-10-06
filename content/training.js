// BLOOM — the training run (BLOOM-028D1 foundation), as data. What demos/demo-run.html?training=1 plays and how it differs from
// an ordinary run. Nothing here touches content/config.js: the run page builds its config with
// BLOOM.play.deriveConfig(BLOOM_DATA.config, config) — a fresh copy — so no normal run ever sees these numbers.
//
//   planetId   the authored world a training run opens (planets/training_grounds.js) unless the URL names another (planet=…)
//   rngSeed    the run's seeded random stream (mulberry32): the same actions on the same ticks give the same run
//   config     overrides for the derived training config (only keys config.js already has; BLOOM.play.deriveConfig refuses others):
//     econ.startBiomass 100 → 150     the first Adapt answer (140) is affordable at the landing; nothing has to be waited for
//     econ.originTrickle 0.3 → 0.6    the home colony pays for the lessons; with no random bubbles this replaces their income
//     econ.bubbleChance 0.011 → 0     no random bubbles: every bonus bubble is placed on purpose (demo-run.html placeBubble)
//     econ.bubbleAutoTicks 60 → 375   a placed bubble waits ~60 s for the player before it collects itself at half value
//   returnTo   where Skip / Main menu / the finished training go when the URL gives no return= (relative to demos/demo-run.html)
//   copy       the training run's own menu and report actions (the run page's other copy is unchanged)
(function (root) {
  "use strict";
  const D = root.BLOOM_DATA || (root.BLOOM_DATA = { planets: {} });
  D.training = {
    planetId: "training_grounds",
    rngSeed: 28041,
    config: { econ: { startBiomass: 150, originTrickle: 0.6, bubbleChance: 0, bubbleAutoTicks: 375 } },
    returnTo: "main-menu.html",
    copy: {
      title: "Training",
      menu: "Training",
      restart: "Restart training", restartNote: "Start this training world again from the landing.",
      skip: "Skip training", skipNote: "Leave training. It stays open from the main menu.",
      mainMenu: "Main menu", mainMenuNote: "Back to the title. Training can be started again from there.",
      complete: "Training complete",
    },
  };
})(typeof window !== "undefined" ? window : globalThis);
