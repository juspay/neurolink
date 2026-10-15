/**
 * Session Middleware
 * Sets `ctx.session` from a header (or cookie) and scopes it to the
 * authenticated user.
 */

import type {
  MiddlewareDefinition,
  ServerContext,
  ServerSessionConfig,
} from "../../types/index.js";
import { ValidationError } from "../errors.js";

/**
 * What a caller may name a session: short, starting with a letter or digit, and
 * with no `:`, so the user prefix added below can never be spoofed by a crafted
 * id.
 */
const SESSION_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

const SESSION_ID_MESSAGE =
  "session id must be 1 to 128 characters: a letter or digit, then letters, digits, '.', '_' or '-'";

function readHeader(
  headers: Record<string, string>,
  name: string,
): string | undefined {
  const wanted = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === wanted) {
      return value;
    }
  }
  return undefined;
}

function withSession(
  ctx: ServerContext,
  requested: string,
  next: () => Promise<unknown>,
): Promise<unknown> {
  ctx.session = {
    id: ctx.user ? `${ctx.user.id}:${requested}` : requested,
  };
  return next();
}

function readCookie(
  headers: Record<string, string>,
  name: string,
): string | undefined {
  const raw = readHeader(headers, "cookie");
  if (!raw) {
    return undefined;
  }
  for (const part of raw.split(";")) {
    const separator = part.indexOf("=");
    if (separator > 0 && part.slice(0, separator).trim() === name) {
      try {
        return decodeURIComponent(part.slice(separator + 1).trim());
      } catch {
        return part.slice(separator + 1).trim();
      }
    }
  }
  return undefined;
}

/**
 * Create session middleware.
 *
 * Reads a session id from `X-Session-Id` (or the configured header) and sets
 * `ctx.session.id`. When the header is absent or empty and `cookieName` is set,
 * that cookie supplies the id instead. When a user is authenticated the id
 * becomes `<userId>:<id>`, so two users who send the same id get different
 * sessions: the in-memory conversation manager keys sessions by id alone, and
 * without the prefix one user could read and extend another's conversation by
 * guessing its id. A request with no id gets no session.
 *
 * The prefix isolates the conversations the agent routes keep. It is not an
 * access check on the memory routes. Without `perUserAuth` they look a session
 * up by the id in the URL (on the in-memory manager by that id alone, on Redis
 * by it together with the `userId` query parameter), so a caller who can reach
 * them and knows a prefixed id such as `bob:chat-1` reads that session unless
 * the server prevents it. With `perUserAuth` they are scoped to the caller and
 * refuse a session id that contains `:`, which every id this middleware writes
 * does: such a session is listed by `GET /memory/sessions` but cannot be read or
 * deleted through the memory routes, only used through the agent routes.
 *
 * The prefix also relies on `ctx.user` naming one person: when every client
 * shares one credential they share one `ctx.user`, and one prefix.
 *
 * The server must carry middleware state for this to do anything. By default
 * (`carryMiddlewareState` off) Express, Fastify and Koa build a fresh context
 * for every middleware step and for the handler, so this middleware sees no
 * `ctx.user` and the `ctx.session` it sets never reaches the handler; Hono
 * shares the context only for a request whose client sent its own
 * `X-Request-ID`. Nothing warns about it. `registerAllRoutes()` with
 * `perUserAuth` turns the carry on for the server; otherwise create the server
 * with `carryMiddlewareState: true`.
 *
 * With `perUserAuth` on the routes, the agent routes take the session only from
 * `ctx.session`, and only for an authenticated request, so this middleware is
 * how a signed-in client keeps a conversation. A request with no `ctx.user`
 * (optional authentication) gets no conversation even when it sends an id, so
 * anonymous callers never share one.
 *
 * With `perUserAuth` off (the default) the agent routes take the session from the
 * request body and this middleware has no effect on them, whether
 * `carryMiddlewareState` is off (the handler never receives `ctx.session`) or on
 * (it does, and the routes do not read it); with the carry on it still sets
 * `ctx.session` for your own routes. That holds on Express, Fastify and Koa, and
 * on Hono when the client sent no `X-Request-ID`. The exception is a context that
 * did not receive the adapters' carry: Hono when the client sent its own
 * `X-Request-ID` (with the carry on or off), an adapter you wrote, or a handler
 * called directly. There an authenticated user's session is `ctx.session` alone
 * (the body's is ignored), and an anonymous caller's is `ctx.session`, else the
 * body's, so anonymous callers that send the same id share one bare
 * conversation.
 *
 * The agent routes keep a conversation only when conversation memory is
 * enabled on the `NeuroLink` instance; without it nothing is remembered
 * whatever the session id.
 *
 * A browser client on another origin must be allowed to send the header. The
 * default `X-Session-Id` is in the servers' default CORS allowed headers. A
 * custom `headerName` is not: add it to `cors.headers`, which replaces the
 * default list when you set it. A cookie sent cross-origin also needs
 * `cors.credentials: true` and a listed origin rather than `*`.
 *
 * Ids start with a letter or digit and continue with letters, digits, `.`, `_`
 * or `-`, 128 characters at most. A header that is not valid is a 400. A
 * cookie that is not valid is ignored, as if absent: a browser sends it on its
 * own, so it must not turn every request into an error.
 *
 * Register it after authentication. The registration order is what runs: the
 * `order` number (12, with auth at 10) is informational and nothing sorts by
 * it, so a session middleware registered before authentication sees no user and
 * sets an unprefixed id without any warning.
 *
 * @example
 * ```typescript
 * const neurolink = new NeuroLink({ conversationMemory: { enabled: true } });
 * const server = await createServer(neurolink, { framework: "hono" });
 * server.registerMiddleware(createAuthMiddleware({ type: "bearer", validate }));
 * server.registerMiddleware(createSessionMiddleware());
 * // perUserAuth also turns on carryMiddlewareState for this server.
 * registerAllRoutes(server, "/api", { perUserAuth: true });
 * // A client sends `X-Session-Id: chat-1`; the agent routes then keep that
 * // conversation, separately for each authenticated user.
 * ```
 */
export function createSessionMiddleware(
  config: ServerSessionConfig = {},
): MiddlewareDefinition {
  const { headerName = "X-Session-Id", cookieName, skipPaths = [] } = config;

  return {
    name: "session",
    // Informational: the adapters run middleware in registration order, so
    // this only reads correctly when it is registered after authentication.
    order: 12,
    excludePaths: skipPaths,
    handler: async (ctx: ServerContext, next: () => Promise<unknown>) => {
      // An empty header counts as absent, so the opted-in cookie can still
      // supply the id.
      const header = readHeader(ctx.headers, headerName);
      if (header !== undefined && header !== "") {
        if (!SESSION_ID_PATTERN.test(header)) {
          throw new ValidationError(
            [{ field: headerName, message: SESSION_ID_MESSAGE }],
            ctx.requestId,
          );
        }
        return withSession(ctx, header, next);
      }
      const cookie = cookieName
        ? readCookie(ctx.headers, cookieName)
        : undefined;
      if (cookie !== undefined && SESSION_ID_PATTERN.test(cookie)) {
        return withSession(ctx, cookie, next);
      }
      return next();
    },
  };
}
