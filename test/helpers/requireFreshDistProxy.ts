/**
 * Side-effect module for suites that load the `dist/proxy/` and `dist/cli/commands/proxy.js` modules directly.
 * Same ordering contract as requireFreshDist.ts: import it BEFORE the first
 * `../dist/...` import. The directory-wide baseline still applies; the named
 * bundles are additionally checked against their own mtime.
 */
import { assertDistFresh } from "./distFreshness.js";

assertDistFresh({
  entrypoints: [
    "dist/proxy/rollingProxyServer.js",
    "dist/cli/commands/proxy.js",
  ],
});
