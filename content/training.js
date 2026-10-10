// BLOOM — the training run (BLOOM-028D1 foundation), as data. What TRAINING plays (inside index.html since BLOOM-033; the developer
// harness demos/demo-run.html?training=1 plays the same run) and how it differs from an ordinary run. Nothing here touches
// content/config.js: BLOOM.gameSession.trainingRun builds its config with BLOOM.play.deriveConfig(BLOOM_DATA.config, config) — a fresh copy — so no normal run ever sees these numbers.
//
//   planetId   the authored world a training run opens (planets/training_grounds.js) unless the URL names another (planet=…)
//   rngSeed    the run's seeded random stream (mulberry32): the same actions on the same ticks give the same run
//   config     overrides for the derived training config (only keys config.js already has; BLOOM.play.deriveConfig refuses others):
//     econ.startBiomass 100 → 150     the first Adapt answer (140) is affordable at the landing; nothing has to be waited for
//     econ.originTrickle 0.3 → 0.6    the home colony pays for the lessons; with no random bubbles this replaces their income
//     econ.bubbleChance 0.011 → 0     no random bubbles: every bonus bubble is placed on purpose (GameSession placeBubble)
//     econ.bubbleAutoTicks 60 → 375   a placed bubble waits ~60 s for the player before it collects itself at half value
//   returnTo   (developer harness only) where its Skip / Main menu / finished training navigate when the URL gives no return= (relative to
//              demos/demo-run.html); in the app they stay inside index.html:
//              (BLOOM-030) the root index.html, the canonical Strange Bloom title
//   copy       the training run's own menu and report actions (the run page's other copy is unchanged); (BLOOM-028D2) the finished
//              training's Begin Expedition and the one Skip confirmation. The guided coach's step copy lives with its predicates in
//              resources/training/training-steps.js (docs/GUIDED_TRAINING_v1.md).
(function (root) {
  "use strict";
  const D = root.BLOOM_DATA || (root.BLOOM_DATA = { planets: {} });
  D.training = {
    planetId: "training_grounds",
    rngSeed: 28041,
    config: { econ: { startBiomass: 150, originTrickle: 0.6, bubbleChance: 0, bubbleAutoTicks: 375 } },
    returnTo: "../index.html",
    copy: {
      title: "Training",
      menu: "Training",
      restart: "Restart training", restartNote: "Start this training world again from the landing.",
      skip: "Skip training", skipNote: "Leave training. It stays open from the main menu.",
      mainMenu: "Main menu", mainMenuNote: "Back to the title. Training can be started again from there.",
      complete: "Training complete",
      // (BLOOM-028D2) the finished training's first action (no Keep playing: training ends at its report)
      beginExpedition: "Begin Expedition", beginExpeditionNote: "Choose your first real world in the Destination Survey.",
      // (BLOOM-028D2) the one confirmation before a guided training is skipped (the coach's Skip Tutorial and the menu's Skip training)
      skipConfirm: { title: "Skip training?", body: "You can start it again any time from the main menu.", keep: "Keep training", skip: "Skip training" },
    },
  };
})(typeof window !== "undefined" ? window : globalThis);
