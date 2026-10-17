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
 * What a caller may name a session: short, with no `:`, so the user prefix
 * added below can never be spoofed by a crafted id.
 */
const SESSION_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

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
 * Reads a session id from `X-Session-Id` (or the configured header, or, when
 * `cookieName` is set, that cookie) and sets `ctx.session.id`. When a user is
 * authenticated the id becomes `<userId>:<id>`, so two users who send the same
 * id get different sessions: the in-memory conversation manager keys sessions
 * by id alone, and without the prefix one user could read and extend another's
 * conversation by guessing its id. A request with no id gets no session.
 *
 * Register it after authentication (it runs at order 12, auth runs at 10).
 * Ids are 1 to 128 characters of letters, digits, `.`, `_` and `-`; anything
 * else is a 400.
 *
 * @example
 * ```typescript
 * server.registerMiddleware(createAuthMiddleware({ type: "bearer", validate }));
 * server.registerMiddleware(createSessionMiddleware());
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
    order: 12, // after authentication (10), before request validation (15)
    excludePaths: skipPaths,
    handler: async (ctx: ServerContext, next: () => Promise<unknown>) => {
      const requested =
        readHeader(ctx.headers, headerName) ??
        (cookieName ? readCookie(ctx.headers, cookieName) : undefined);
      if (requested === undefined || requested === "") {
        return next();
      }
      if (!SESSION_ID_PATTERN.test(requested)) {
        throw new ValidationError(
          [
            {
              field: headerName,
              message:
                "session id must be 1 to 128 characters of letters, digits, '.', '_' or '-'",
            },
          ],
          ctx.requestId,
        );
      }
      ctx.session = {
        id: ctx.user ? `${ctx.user.id}:${requested}` : requested,
      };
      return next();
    },
  };
}
