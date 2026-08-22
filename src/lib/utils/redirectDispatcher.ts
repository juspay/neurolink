import { getGlobalDispatcher, interceptors } from "undici";
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
 * A dispatcher that follows redirects, when composing one is safe here.
 *
 * `getGlobalDispatcher()` returns Node's **built-in** undici dispatcher, whose
 * major tracks the runtime rather than this package's dependency. The composed
 * result is then passed to the **npm** undici's `request()`, and the two majors
 * do not share a handler contract:
 *
 *   node 24   built-in 7.24.4 + npm 7.28.0   request() succeeds
 *   node 22   built-in 6.28.0 + npm 7.28.0   throws "invalid onError method"
 *
 * Node 22 is this package's declared minimum, so the broken combination is not
 * exotic — it is the floor. The throw happens at request time rather than at
 * compose(), which is why it surfaces as an opaque runtime error instead of
 * something recognisably about versions.
 *
 * When the majors disagree, return the global dispatcher uncomposed. That drops
 * redirect-following from the pre-flight HEAD only. Callers already treat any
 * non-2xx HEAD — a redirect included — as untrustworthy and fall through to the
 * streaming size guard on the GET, so the size protection is unchanged and the
 * cost is one extra round trip.
 *
 * Composing onto the global dispatcher rather than a fresh `Agent` is
 * deliberate: it preserves whatever the host application configured globally,
 * such as a corporate ProxyAgent.
 */
export function redirectFollowingDispatcher(
  maxRedirections: number,
): Dispatcher {
  const globalDispatcher = getGlobalDispatcher();
  const builtinMajor = Number.parseInt(
    process.versions.undici?.split(".")[0] ?? "",
    10,
  );
  if (!Number.isFinite(builtinMajor) || builtinMajor !== NPM_UNDICI_MAJOR) {
    return globalDispatcher;
  }
  return globalDispatcher.compose(interceptors.redirect({ maxRedirections }));
}
