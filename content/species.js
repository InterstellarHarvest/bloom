// BLOOM — the playable plant species (BLOOM-035B; design: docs/SPECIES_SYSTEM_v1.md §0.1 / §3, study: docs/SPECIES_STUDY_v1.md).
// Classic script (not JSON + fetch) so it loads over file:// like every content file. Resolved, validated and frozen by
// resources/bloom-species.js (BLOOM.species.resolve(id) — an unknown id THROWS, never a silent fallback).
//
// A species is a STARTING PHYSIOLOGY plus its own body and presentation. Nothing else (v1, PMO-locked):
//   · no growth / economy modifiers, no species-specific Adapt scales (config.scales are everyone's), no species-specific softness
//     (edges: null), no starting genome for an Expedition species (startingGenome: null);
//   · it is the PLAYER's plant only: world generation and the native competitor read config.referencePlant, never a species, so the
//     same World Seed is the same physical planet whatever the player brings (docs/SPECIES_SYSTEM_v1.md §2).
//
//   id                 stable id — part of cache keys, provenance, reports and any future save. Never renamed.
//   version            the definition's revision (presentation / art / physiology)
//   physiologyVersion  the physiology's revision: bump it with ANY change to `physiology` (tools/species-check.js pins the numbers per
//                      revision; BLOOM.species derives the cache / provenance key "<id>/p<physiologyVersion>#<hash of the numbers>")
//   status             "released" (in the normal game) | "candidate" (development flag ?species=1 only, until its real art is accepted)
//   role               generalist | dry-heat | cold | wet — the card order is this role order, never a power order
//   physiology         exactly the reference physiology's seven keys (°C, moisture 0–100, salt / radiation / toxin tolerances)
//   art                { bodyPlan, pack } — the species' body plan and its sprite pack (resources/plant-visual, art/plant)
//   presentation       roleLabel, note (Organic Hybrid's "Recommended first expedition"), strengths / weaknesses (each tied to a real
//                      category; `latent: true` = a secondary strength that does not help at landing), the selection dossier copy
// Copy rule: no Easy / Hard, no stars, no scores; every specialist shows its strengths AND its weaknesses; the cold specialist's
// radiation tolerance is presented as LATENT (it pays once the heat is under control), never as a landing advantage.
(function (root) {
  "use strict";
  const D = root.BLOOM_DATA || (root.BLOOM_DATA = { planets: {} });
  D.species = [
    {
      id: "organic_hybrid", version: 1, physiologyVersion: 1, status: "released",
      name: "Organic Hybrid", role: "generalist",
      short: "A balanced generalist: few kinds of ground suit it perfectly, and few are closed to it.",
      // numerically equal to config.referencePlant, but its OWN object: retuning Organic Hybrid never changes world generation
      physiology: { tempFloor: -6, tempCeil: 24, waterPos: 50, waterTol: 18, saltTol: 15, radTol: 30, toxTol: 25 },
      edges: null, startingGenome: null,
      art: { bodyPlan: "oh-stem@1", pack: "organic-hybrid" },
      presentation: {
        roleLabel: "Balanced generalist",
        note: "Recommended first expedition",
        strengths: [
          { category: "Temperature", text: "Temperate ground, from light frost to warm" },
          { category: "Water", text: "Ordinary ground, neither parched nor flooded" },
        ],
        weaknesses: [
          { category: "Temperature", text: "Deep cold and fierce heat" },
          { category: "Soil", text: "Salt coasts" },
        ],
        dossier: {
          habit: "An upright leafy stem that branches as it matures.",
          water: "Takes water as it comes: no store for drought, no air channels for flooding.",
          reproduction: "Seed heads on the upper stem; buys longer reach as it adapts.",
          science: "Most garden and meadow plants: a broad, middle-of-the-road body that adapts in any direction.",
        },
      },
    },
    {
      id: "cinder_rosette", version: 1, physiologyVersion: 1, status: "candidate",
      name: "Cinder Rosette", role: "dry-heat",
      short: "A ground-hugging rosette of fleshy, waxy leaves that stores water and shrugs off heat.",
      physiology: { tempFloor: 2, tempCeil: 34, waterPos: 34, waterTol: 16, saltTol: 15, radTol: 35, toxTol: 25 },
      edges: null, startingGenome: null,
      art: { bodyPlan: "rosette@1", pack: "proof-cinder-rosette" },
      presentation: {
        roleLabel: "Heat- and drought-hardy",
        note: null,
        strengths: [
          { category: "Temperature", text: "Hot ground" },
          { category: "Water", text: "Dry ground" },
        ],
        weaknesses: [
          { category: "Temperature", text: "Cold ground" },
          { category: "Water", text: "Wet and flooded ground" },
        ],
        dossier: {
          habit: "A low, wide rosette of thick leaves pressed to the ground; one tall spike when it flowers.",
          water: "Stores water in fleshy leaves and a short caudex; drowns where the ground stays wet.",
          reproduction: "Capsules along a single flowering spike.",
          science: "Agave and aloe rosettes: succulent leaves, a waxy bloom and a ground-hugging habit for hot, dry ground.",
        },
      },
    },
    {
      id: "woolly_candle", version: 1, physiologyVersion: 1, status: "candidate",
      name: "Woolly Candle", role: "cold",
      short: "A stout woolly trunk crowned by silver-haired leaves, built to keep its growing tip above the frost.",
      physiology: { tempFloor: -14, tempCeil: 16, waterPos: 46, waterTol: 18, saltTol: 15, radTol: 50, toxTol: 25 },
      edges: null, startingGenome: null,
      art: { bodyPlan: "candle@1", pack: "proof-woolly-candle" },
      presentation: {
        roleLabel: "Cold-hardy",
        note: null,
        strengths: [
          { category: "Temperature", text: "Cold ground" },
          { category: "Hazard", text: "Handles harsh radiation once heat is under control", latent: true },
        ],
        weaknesses: [
          { category: "Temperature", text: "Warm and hot ground" },
        ],
        dossier: {
          habit: "An upright trunk wrapped in wool and a skirt of old leaves, topped by a tight rosette.",
          water: "Ordinary needs, a little drier than most; frozen ground is its home, not dry ground.",
          reproduction: "A tall candle of plumed seeds.",
          science: "Giant rosettes of high mountains (frailejón, giant groundsels): wool and dead-leaf skirts insulate the stem against cold and strong sun.",
        },
      },
    },
    {
      id: "reed_spire", version: 1, physiologyVersion: 1, status: "candidate",
      name: "Reed Spire", role: "wet",
      short: "A clump of tall culms on a creeping rhizome, at home in waterlogged and salty ground.",
      physiology: { tempFloor: -6, tempCeil: 24, waterPos: 62, waterTol: 20, saltTol: 60, radTol: 30, toxTol: 25 },
      edges: null, startingGenome: null,
      art: { bodyPlan: "reed@1", pack: "proof-reed-spire" },
      presentation: {
        roleLabel: "Wet- and salt-hardy",
        note: null,
        strengths: [
          { category: "Water", text: "Wet and waterlogged ground" },
          { category: "Soil", text: "Salt coasts" },
        ],
        weaknesses: [
          { category: "Water", text: "Dry and parched ground" },
        ],
        dossier: {
          habit: "Tall, thin culms rising from a creeping rhizome, each ending in a starburst umbel.",
          water: "Air channels carry oxygen to drowned roots; it struggles where the ground dries out.",
          reproduction: "Umbels that swell into seed heads; buoyant seed bundles.",
          science: "Papyrus, sedges and reeds: air-filled tissue for flooded soil, salt glands like mangroves for the coast.",
        },
      },
    },
  ];
})(typeof window !== "undefined" ? window : globalThis);
