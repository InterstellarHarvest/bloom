// BLOOM — build the portable runtime (BLOOM-031): dist/portable/strange-bloom.portable.js + dist/portable/manifest.json, the generated
// distribution layer that lets a double-clicked index.html (file://) run the whole game. docs/PORTABLE_RUNTIME_v1.md.
//
//   npm --prefix tools run build:portable                 (= node tools/build-portable.mjs)           write dist/portable/
//   npm --prefix tools run check:portable                 (= node tools/build-portable.mjs --check)   rebuild in memory; exit 1 unless the committed files match
//   node tools/build-portable.mjs --root <dir> [--check]                                build (or check) another checkout of this repository
//
// Developers only (players never run it; the generated files are committed). One dev dependency: esbuild, pinned in package.json.
//
// WHAT IT BUILDS. One classic script from resources/portable/portable-entry.js and the source modules it names — the title's page composer
// (and with it the whole title / survey / descent graph), PlanetSphereView with the vendored Three.js, AtmosphereTransition, the settings
// and the training layer — plus, as text inside it, the Destination Survey worker (resources/destination-survey/survey-worker.js and the
// BLOOM classic scripts it imports) bundled into one classic worker script. The source modules are bundled AS THEY ARE: no game rule
// lives in this script, the entry or the generated file. The only transform: each `import.meta.url` in a bundled source module becomes
// sourceUrl("<that module's repository path>") (resources/portable/portable-root.js) — the address the module would have had if loaded
// directly — because a classic script has no import.meta.
//
// REPRODUCIBLE. No timestamp, no absolute path, no machine name: the same sources and the same esbuild give the same bytes. The header
// carries the build format and a SOURCE FINGERPRINT (sha256 over every input file's repository path and content hash, this build
// script, the format and the esbuild version); manifest.json lists every input with its hash. Not minified (readable; Three.js arrives
// already minified from resources/planet-sphere/vendor/).
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const require = createRequire(import.meta.url);
const esbuild = require("esbuild");

export const FORMAT = "bloom-portable/1";
export const OUT_DIR = "dist/portable";
export const BUNDLE = `${OUT_DIR}/strange-bloom.portable.js`;
export const MANIFEST = `${OUT_DIR}/manifest.json`;
export const ENTRY = "resources/portable/portable-entry.js";
export const WORKER_ENTRY = "resources/destination-survey/survey-worker.js";
const SELF = "tools/build-portable.mjs";
const ROOT_HELPER = "resources/portable/portable-root.js";

const sha256 = b => crypto.createHash("sha256").update(b).digest("hex");
const posix = p => p.split(path.sep).join("/");

/** esbuild plugin: `import.meta.url` in a bundled source module → that module's own URL under the portable root. */
function importMetaUrl(root) {
  const helper = path.join(root, ROOT_HELPER);
  return {
    name: "bloom-import-meta-url",
    setup(build) {
      build.onLoad({ filter: /\.js$/ }, args => {
        const rel = posix(path.relative(root, args.path));
        if (rel.startsWith("..") || !rel.startsWith("resources/") || rel.startsWith("resources/portable/")) return undefined;
        const src = fs.readFileSync(args.path, "utf8");
        if (!/\bimport\.meta\.url\b/.test(src)) return undefined;
        const body = src.replace(/\bimport\.meta\.url\b/g, `__bloomSourceUrl(${JSON.stringify(rel)})`);
        return { contents: `import { sourceUrl as __bloomSourceUrl } from ${JSON.stringify(helper)};\n${body}`, loader: "js", resolveDir: path.dirname(args.path) };
      });
    },
  };
}

/** esbuild plugin: "bloom-portable:survey-worker" → the survey worker bundled as one classic script, as text. */
function surveyWorker(root, collect) {
  return {
    name: "bloom-survey-worker",
    setup(build) {
      build.onResolve({ filter: /^bloom-portable:survey-worker$/ }, a => ({ path: a.path, namespace: "bloom-portable" }));
      build.onLoad({ filter: /.*/, namespace: "bloom-portable" }, async () => {
        const r = await esbuild.build({ absWorkingDir: root, entryPoints: [WORKER_ENTRY], bundle: true, format: "iife", platform: "browser",
          write: false, metafile: true, charset: "utf8", legalComments: "inline", logLevel: "silent" });
        collect.worker = Object.keys(r.metafile.inputs); collect.workerBytes = Buffer.byteLength(r.outputFiles[0].text, "utf8");
        return { contents: r.outputFiles[0].text, loader: "text" };
      });
    },
  };
}

/** Build in memory → { files: { [repoPath]: Buffer }, manifest }. Writes nothing. */
export async function buildPortable(root) {
  root = path.resolve(root);
  const collect = { worker: [], workerBytes: 0 };
  const r = await esbuild.build({ absWorkingDir: root, entryPoints: [ENTRY], bundle: true, format: "iife", platform: "browser",
    write: false, metafile: true, charset: "utf8", legalComments: "eof", logLevel: "silent", outfile: path.join(root, BUNDLE),
    plugins: [surveyWorker(root, collect), importMetaUrl(root)] });
  const js = r.outputFiles.find(f => f.path.endsWith(".js"));
  const real = p => !p.includes(":");                                   // drop the virtual bloom-portable: module
  const inputs = [...new Set([...Object.keys(r.metafile.inputs).filter(real), ...collect.worker, SELF])].map(posix).sort();
  const share = Object.values(r.metafile.outputs).find(o => o.entryPoint).inputs;   // bytes each input contributes to the bundle
  const files = inputs.map(p => { const b = fs.readFileSync(path.join(root, p)); return { path: p, bytes: b.length, sha256: sha256(b), bytesInBundle: share[p] ? share[p].bytesInOutput : 0 }; });
  const fingerprint = sha256([FORMAT, `esbuild ${esbuild.version}`, ...files.map(f => `${f.path}\t${f.sha256}`)].join("\n"));
  const header = [
    `/*! STRANGE BLOOM · UNKNOWN SOILS — the portable runtime (file://). GENERATED FILE — do not edit by hand.`,
    ` * Rebuild: npm --prefix tools run build:portable  ·  verify: npm --prefix tools run check:portable  (${SELF}; docs/PORTABLE_RUNTIME_v1.md)`,
    ` * Format: ${FORMAT}  ·  esbuild ${esbuild.version}`,
    ` * Source fingerprint: ${fingerprint}  (${files.length} source files, listed with their hashes in ${MANIFEST})`,
    ` * Built from ${ENTRY} and the unmodified game modules it names; only import.meta.url is rewritten (${ROOT_HELPER}).`,
    ` */`, ""].join("\n");
  const bundle = Buffer.from(header + js.text, "utf8");
  const entryText = fs.readFileSync(path.join(root, ENTRY), "utf8");
  const modules = [...entryText.matchAll(/^\s*"(resources\/[^"]+\.js)":\s*\(\)\s*=>\s*import\(/gm)].map(m => m[1]);
  const manifest = { format: FORMAT, esbuild: esbuild.version, fingerprint, generated: "do not edit by hand: npm --prefix tools run build:portable",
    entry: ENTRY, workerEntry: WORKER_ENTRY, modules,
    output: { path: BUNDLE, bytes: bundle.length, sha256: sha256(bundle), surveyWorkerTextBytes: collect.workerBytes },
    workerInputs: collect.worker.map(posix).sort(), inputs: files };
  return { files: { [BUNDLE]: bundle, [MANIFEST]: Buffer.from(JSON.stringify(manifest, null, 2) + "\n", "utf8") }, manifest };
}

/** Compare a build with the files on disk → [{ path, ok, reason }]. */
export function compare(root, files) {
  return Object.entries(files).map(([p, b]) => {
    const f = path.join(root, p);
    if (!fs.existsSync(f)) return { path: p, ok: false, reason: "missing" };
    const d = fs.readFileSync(f);
    return { path: p, ok: d.equals(b), reason: d.equals(b) ? "identical" : `differs (committed ${d.length} B sha256 ${sha256(d).slice(0, 12)}, built ${b.length} B sha256 ${sha256(b).slice(0, 12)})` };
  });
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url))) {   // (realpath: /var → /private/var on macOS)
  const argv = process.argv.slice(2), at = argv.indexOf("--root");
  const root = at >= 0 ? path.resolve(argv[at + 1]) : path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const { files, manifest } = await buildPortable(root);
  if (argv.includes("--check")) {
    const res = compare(root, files);
    for (const c of res) console.log(`${c.ok ? "OK  " : "FAIL"}  ${c.path}  — ${c.reason}`);
    console.log(`fingerprint ${manifest.fingerprint}`);
    process.exit(res.every(c => c.ok) ? 0 : 1);
  }
  fs.mkdirSync(path.join(root, OUT_DIR), { recursive: true });
  for (const [p, b] of Object.entries(files)) fs.writeFileSync(path.join(root, p), b);
  console.log(`${BUNDLE}  ${manifest.output.bytes} B  sha256 ${manifest.output.sha256}`);
  console.log(`${MANIFEST}  ${manifest.inputs.length} inputs  fingerprint ${manifest.fingerprint}`);
}
