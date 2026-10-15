# BLOOM-039 re-audit and QA drivers

Research / QA only: never loaded by the game. Playwright via `NODE_PATH="$(npm root -g)"`; BEFORE = `BLOOM_BEFORE=/path/to/a-checkout-of-8b23e78`,
AFTER = this repository. WebKit: `PW_MODULE=<a playwright install whose WebKit runs here> PLAYWRIGHT_BROWSERS_PATH=<its browsers>`; axe: `AXE=<axe.min.js>`.

| Script | Measures | Output (here: ../reaudit, ../qa) |
|---|---|---|
| `readout-audit.js <before\|after> <out>` | the real banner for every region of the 60 BLOOM-038 sample worlds × species vs the engine | readout-honesty.json |
| `tab-audit.js <before\|after> <out>` | hidden tab, 10-min frame gap, speed / pause kept | hidden-tab.json |
| `native-audit.js <before\|after> <out>` · `native-progress.js <out>` | native banner, Terraform native preview, FRONT STALLED on / off | native-competition.json |
| `banner-audit.js <out>` · `coach-audit.js <out>` | banner over its region, label clicks, coach vs banner | banner-placement.json |
| `measure-wide3.js <before\|after> <W> <H> <out>` | app width / wells, room composition, distances | composition.json |
| `qa-039.js <chromium\|firefox\|webkit> <out> [sizes]` | the browser matrix + axe | qa/*.json |
| `stills.js <dir>` | BEFORE / AFTER evidence stills | stills/ |
