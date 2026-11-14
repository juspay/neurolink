/**
 * Side-effect module: import it BEFORE the first `../dist/...` import.
 *
 * Module bodies run in source order, so this check runs before the dist
 * modules below it are evaluated. Unlike a call placed after a static import,
 * it never lets a suite start against a stale `dist/` (see distFreshness.ts
 * for the staleness rule and the `NEUROLINK_SKIP_DIST_FRESHNESS_CHECK` escape).
 *
 * It names `dist/index.js` as an entrypoint, so a partial build that rewrote
 * some other file under `dist/` (say `pnpm run build:cli`) cannot satisfy the
 * directory-wide check while the bundle the suite imports is still old. Suites
 * that also drive other bundles import `requireFreshDistCli.js` or
 * `requireFreshDistProxy.js` instead of this module.
 *
 * A wholly missing `dist/` is still reported by Node's own link step as
 * ERR_MODULE_NOT_FOUND, because linking resolves every static import before
 * any module body runs.
 */
import { assertDistFresh } from "./distFreshness.js";

assertDistFresh({ entrypoints: ["dist/index.js"] });
