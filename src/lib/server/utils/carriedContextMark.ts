/**
 * Which route-handler contexts received the state the adapters now carry from
 * middleware to the handler.
 *
 * Before the adapters carried that state, a handler normally got a fresh
 * context with no `ctx.user` and no `ctx.session`. The one exception was Hono
 * when the client sent its own `X-Request-ID`: Hono kept the middleware's
 * context in a store keyed by that header, so the handler found it again, user
 * included. The agent routes' default (`perUserAuth` unset) must not start
 * trusting `ctx.user` on the requests that never had it, so the built-in
 * adapters mark the contexts that received the carry, and the agent routes
 * treat a marked context as the fresh one it used to be: identity from the body.
 *
 * Everything else keeps the earlier rule, an authenticated `ctx.user` wins: a
 * Hono request with a caller-supplied `X-Request-ID` (never marked), a custom
 * adapter that carries `ctx.user` itself, and a route handler called directly
 * with a context the caller built.
 *
 * It is an internal fact about how the context was built, not part of
 * `ServerContext`, and it is not exported from the package.
 *
 * @module server/utils/carriedContextMark
 */

import type { ServerContext } from "../../types/index.js";

const receivedCarry = new WeakSet<ServerContext>();

/** Record that this context received state carried from middleware. */
export function markContextCarried(ctx: ServerContext): void {
  receivedCarry.add(ctx);
}

/** `true` when `markContextCarried` was called for this context. */
export function isContextCarried(ctx: ServerContext): boolean {
  return receivedCarry.has(ctx);
}
