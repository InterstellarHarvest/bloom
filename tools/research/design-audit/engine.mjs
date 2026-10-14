// BLOOM-038 design audit — engine loader (research only; never loaded by the game). Loads the production classic scripts into globalThis
// exactly as the seed-bank builder does, plus the shipped Challenge seed banks, and the survey / bank ES modules.
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { CLASSIC } from "../../challenge-bank-builder.mjs";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const require = createRequire(import.meta.url);
let loaded = null;
export async function engine() {
  if (loaded) return loaded;
  for (const f of [...CLASSIC, "content/challenge-seed-banks.js", "content/training.js"]) require(path.join(ROOT, f));
  const imp = f => import(pathToFileURL(path.join(ROOT, f)).href);
  loaded = { BLOOM: globalThis.BLOOM, D: globalThis.BLOOM_DATA,
    SD: await imp("resources/destination-survey/survey-data.js"), CB: await imp("resources/challenges/challenge-bank.js") };
  return loaded;
}
export const mulberry32 = a => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
export const fnv = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193); return h >>> 0; };
