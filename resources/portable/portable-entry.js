// BLOOM — the portable runtime's entry (BLOOM-031): the source of dist/portable/strange-bloom.portable.js, which `npm --prefix tools run build:portable`
// (tools/build-portable.mjs) bundles from THIS file and the unmodified source modules it names. docs/PORTABLE_RUNTIME_v1.md.
//
// Why it exists: over file:// (a double-clicked index.html) browsers refuse ES modules and module workers, so the game's modules are
// shipped there as one generated classic script. It is a distribution layer, not a fork: every module below is the source module
// itself (the bundler copies them; nothing is ported or re-implemented), and the one Three.js copy is the vendored one the sphere
// imports. Served over http(s) the game never loads this; resources/portable/module-loader.js imports the source modules instead.
//
// What the bundle provides (window.BLOOM_PORTABLE):
//   load(path)   the module namespace of a source module by its repository path — evaluated lazily, once, on first load (as a real
//                import would), so loading the bundle runs no game code. BLOOM.modules.load(url) is the only caller.
//   modules      the paths it can load: exactly the modules the classic pages import dynamically (the title's page composer — and
//                with it the whole title / survey / descent graph — the sphere, the gameplay transition, the settings, the training layer)
//   the survey workers: the Destination Survey's worker (resources/destination-survey/survey-worker.js and the BLOOM classic scripts it
//                imports, bundled by the build into ONE classic worker script) is started from a blob: URL — the same worker code and
//                the same validation path as the module worker, which file:// pages cannot start. SectorPool still falls back to
//                the main thread by itself if a browser refuses even that.
import "./portable-root.js";                                  // first: it reads document.currentScript while the bundle is evaluating
import { SectorPool } from "../destination-survey/sector-pool.js";
import surveyWorkerSource from "bloom-portable:survey-worker"; // (the build supplies it: the bundled survey worker, as text)

const MODULES = {
  "resources/main-menu/main-menu-page.js": () => import("../main-menu/main-menu-page.js"),
  "resources/main-menu/main-menu-data.js": () => import("../main-menu/main-menu-data.js"),
  "resources/planet-sphere/planet-sphere-view.js": () => import("../planet-sphere/planet-sphere-view.js"),
  "resources/atmosphere-transition/atmosphere-transition.js": () => import("../atmosphere-transition/atmosphere-transition.js"),
  "resources/training/training-run.js": () => import("../training/training-run.js"),
};

const loaded = new Map();
function load(path) {
  if (!Object.prototype.hasOwnProperty.call(MODULES, path)) return Promise.reject(new Error(`the portable runtime has no module ${path}`));
  if (!loaded.has(path)) loaded.set(path, MODULES[path]());
  return loaded.get(path);
}

let workerUrl = null;
const stats = { workersStarted: 0, workerUrl: null };
SectorPool.workerFactory = () => {
  workerUrl = workerUrl || URL.createObjectURL(new Blob([surveyWorkerSource], { type: "text/javascript" }));
  const w = new Worker(workerUrl); stats.workersStarted++; stats.workerUrl = workerUrl; return w;
};

window.BLOOM_PORTABLE = Object.freeze({ version: 1, modules: Object.freeze(Object.keys(MODULES)), load, stats, loaded: () => [...loaded.keys()] });
