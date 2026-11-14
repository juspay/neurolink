/**
 * Side-effect module for suites that load `dist/index.js` and spawns `dist/cli/index.js`.
 * Same ordering contract as requireFreshDist.ts: import it BEFORE the first
 * `../dist/...` import. The directory-wide baseline still applies; the named
 * bundles are additionally checked against their own mtime.
 */
import { assertDistFresh } from "./distFreshness.js";

assertDistFresh({
  entrypoints: ["dist/index.js", "dist/cli/index.js"],
});
