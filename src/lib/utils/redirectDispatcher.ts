import { Agent, getGlobalDispatcher, interceptors } from "undici";
import type { Dispatcher } from "undici";

/**
 * The major of the `undici` this package depends on.
 *
 * `dependencies.undici` is `>=7.24.0 <8.0.0`, and `pnpm.overrides` maps
 * `undici@>=8.0.0` back into that same range, so major 7 is a declared
 * invariant rather than an observation. Update both together if it ever moves.
 */
const NPM_UNDICI_MAJOR = 7;

/**
 * A dispatcher that follows redirects.
 *
 * `getGlobalDispatcher()` returns Node's **built-in** undici dispatcher, whose
 * major tracks the runtime rather than this package's dependency. The composed
 * result is then passed to the **npm** undici's `request()`, and the two majors
 * do not share a handler contract:
 *
 *   node 24   built-in 7.24.4 + npm 7.28.0   request() succeeds
 *   node 22   built-in 6.28.0 + npm 7.28.0   throws "invalid onError method"
 *
 * Node 22 is this package's declared minimum, so the broken combination is the
 * floor, not an edge case.
 *
 * When the majors match, compose onto the global dispatcher — that preserves
 * whatever the host application configured globally, such as a corporate
 * ProxyAgent.
 *
 * When they do not, compose onto a fresh `Agent` that npm undici owns, so the
 * handler contract is self-consistent. Redirects still get followed.
 *
 * The earlier version of this function returned the global dispatcher
 * *uncomposed* in the mismatch case, on the stated grounds that it "drops
 * redirect-following from the pre-flight HEAD only". That was wrong: the same
 * dispatcher feeds the real GET in fileDetector.ts and messageBuilder.ts, and
 * that path treats any non-200 as fatal — so on Node 22 a redirecting URL threw
 * `HTTP 302 fetching …` instead of downloading. Verified against a local
 * redirecting server: node 24 -> 200 (followed), node 22 -> 302 (not followed).
 *
 * The cost of the fresh Agent is narrow and worth naming: on a runtime whose
 * built-in undici major differs from ours, a globally-configured dispatcher
 * (e.g. a ProxyAgent set via setGlobalDispatcher) is not inherited for these
 * requests. Losing a proxy on one Node version is recoverable; silently failing
 * every redirecting download is not.
 *
 * @param maxRedirections How many redirects to follow before giving up.
 */
export function redirectFollowingDispatcher(
  maxRedirections: number,
): Dispatcher {
  const builtinMajor = Number.parseInt(
    process.versions.undici?.split(".")[0] ?? "",
    10,
  );
  const base =
    Number.isFinite(builtinMajor) && builtinMajor === NPM_UNDICI_MAJOR
      ? getGlobalDispatcher()
      : new Agent();
  return base.compose(interceptors.redirect({ maxRedirections }));
}
