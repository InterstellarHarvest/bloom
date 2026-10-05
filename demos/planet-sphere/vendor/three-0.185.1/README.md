# Vendored Three.js — planet-sphere spike only

- Package: `three@0.185.1` (npm), MIT licence (see `LICENSE`).
- Files: `build/three.module.min.js` + `build/three.core.min.js`, copied unmodified from the npm tarball.
- npm tarball sha512 integrity: `sha512-5aojFCXKwnjBRZvUnt3WFfEcvUJgkN5LlijRFN95hMy8WVkG4I0QNcJE+OuWvuJ0bOdStrbfXn0pkd6/QyiAlg==`
- SHA-256: `three.module.min.js` 86bcee248b64f44bcfc23c331ae74619061957d59cab040171dcb6fb5900beb6 ·
  `three.core.min.js` 05b2609338c76cd65daf74f3ac515bc9a5045e1b3b33edc07d8c9bd55250fa90

Loaded only by `demos/planet-sphere-spike.html` through an import map (`"three": "./planet-sphere/vendor/three-0.185.1/three.module.min.js"`).
No addons (OrbitControls etc.) are vendored; the spike's drag/idle rotation is its own ~100 lines.
Nothing else in BLOOM imports this. Delete this folder to remove the dependency.
