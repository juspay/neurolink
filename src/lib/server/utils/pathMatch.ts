/**
 * Path matching shared by the adapters' middleware `paths` / `excludePaths`
 * and the rate limiters' `skipPaths`.
 *
 * Every match is at a segment boundary: a pattern names the path itself and
 * what lies under it as a directory would, so `/api/health` covers
 * `/api/health` and `/api/health/live` but not `/api/healthz`. The plain
 * prefix test the adapters used to run let the second be exempted by the
 * first.
 *
 * @module server/utils/pathMatch
 */

/** The request path without its query string or fragment. */
export function stripQuery(path: string): string {
  const cut = path.search(/[?#]/);
  return cut === -1 ? path : path.slice(0, cut);
}

/** Collapse repeated slashes and drop a trailing one, keeping the root `/`. */
function normalize(path: string): string {
  const collapsed = path.replace(/\/{2,}/g, "/");
  return collapsed.length > 1 ? collapsed.replace(/\/+$/, "") : collapsed;
}

/**
 * `true` when `path` is `prefix`, or lies under `prefix` at a segment
 * boundary. `"*"`, `""` and `"/"` match every path.
 */
export function pathStartsWithSegment(path: string, prefix: string): boolean {
  if (prefix === "*" || prefix === "" || prefix === "/") {
    return true;
  }
  const target = normalize(stripQuery(path));
  const base = normalize(prefix);
  return target === base || target.startsWith(`${base}/`);
}

/** `true` when any of `prefixes` matches `path` (see {@link pathStartsWithSegment}). */
export function pathMatchesAny(
  path: string,
  prefixes: readonly string[] | undefined,
): boolean {
  if (!prefixes || prefixes.length === 0) {
    return false;
  }
  return prefixes.some((prefix) => pathStartsWithSegment(path, prefix));
}
