#!/usr/bin/env tsx
/**
 * Continuous Test Suite: `createSessionMiddleware`, end to end.
 *
 * With `perUserAuth: true` the agent routes ignore a body `sessionId` (a caller
 * must not be able to name another user's session) and take `ctx.session.id`
 * instead, but nothing set it, so a signed-in client had no conversation memory
 * through those routes. The session middleware sets it from a header (or an
 * opt-in cookie) and prefixes the authenticated user's id, because the in-memory
 * conversation manager keys sessions by id alone. It can only do either if the
 * server carries middleware state: by default (`carryMiddlewareState` off)
 * Express, Fastify and Koa build a fresh context for every middleware step and
 * for the handler, so the middleware neither sees `ctx.user` nor reaches the
 * handler with `ctx.session`, and Hono shares the context only for a request
 * whose client sent its own `X-Request-ID`. `registerAllRoutes` with
 * `perUserAuth` turns the carry on; a server that does not use it sets
 * `carryMiddlewareState: true`. With `perUserAuth` off the agent routes keep
 * taking the session from the body and the middleware's id is ignored, except
 * on a request whose context did not come through the adapters' carry: on Hono,
 * one whose client sent its own `X-Request-ID`. There an authenticated user's
 * session is the middleware's alone (the body's is ignored), and an anonymous
 * caller's is the middleware's, else the body's.
 *
 * Every case drives a surface this package ships (CLAUDE.md rule 15): the public
 * `createServer`, `createAuthMiddleware`, `createSessionMiddleware` and
 * `registerAllRoutes` from `../dist/index.js`.
 *
 *   - Id handling runs on all four frameworks, each started on a free loopback
 *     port with `carryMiddlewareState: true` and called over real HTTP: the
 *     header, the opt-in cookie (an invalid
 *     one is ignored, an invalid header is a 400, an empty header falls back to
 *     the cookie), the 128-character boundary, a custom `headerName`, `skipPaths`,
 *     that registration order, not the order number, decides whether the user
 *     prefix is applied, and that a browser preflight on the default CORS
 *     config is allowed to send `X-Session-Id` while a custom header name must
 *     be added to `cors.headers`. A server without `carryMiddlewareState` shows
 *     the other half: the handler sees neither the session nor the user, except
 *     on Hono for a request that sends its own `X-Request-ID`.
 *   - Conversation continuity and isolation run through `POST /api/agent/execute`
 *     on an in-process Hono adapter with OpenAI behind `installMockFetch` and a
 *     fake key: whether a turn carries an earlier turn's text is read from what
 *     the provider was actually sent. Every negative case first proves the
 *     earlier turn reached the provider, and that the turn under test did too.
 *
 * A control case shows the isolation probe can fail: a bare middleware that
 * does not prefix the user lets two users share one conversation, and with
 * `perUserAuth` off the same body `sessionId` that is ignored when it is on
 * reaches the earlier conversation. Likewise, an anonymous caller (optional
 * authentication) that sends `X-Session-Id` gets no conversation with
 * `perUserAuth` on, and with it off the same two requests share one. The cases
 * that send an `X-Request-ID` do so because the agent routes' default ignores
 * `ctx.session` on every other request, so a control without one could not
 * place a conversation under the middleware's id at all. The `perUserAuth`
 * cases never set `carryMiddlewareState`: `registerAllRoutes` turns it on.
 *
 * Run: pnpm exec tsx test/continuous-test-suite-session-middleware.ts
 */
import { createServer as createTcpServer } from "node:net";
import type { AddressInfo } from "node:net";
import { assert, assertEqual, defineSuite, Skip } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";
import { installMockFetch } from "./utils/mockFetch.js";
import {
  MissingDependencyError,
  NeuroLink,
  createAuthMiddleware,
  createServer,
  createSessionMiddleware,
  registerAllRoutes,
} from "../dist/index.js";

// Fail loudly rather than silently testing a stale build (see distFreshness.ts).
assertDistFresh();

// The tracked .mcp-config.json makes every NeuroLink instance spawn an npx MCP
// server on its first generate(); none of these cases uses a tool, so skip it.
process.env.NEUROLINK_SKIP_MCP = "true";

const { test, runSuite } = defineSuite("Session middleware", {
  offline: true,
});

const FRAMEWORKS = ["hono", "express", "fastify", "koa"] as const;
type Framework = (typeof FRAMEWORKS)[number];

const USERS: Record<string, { id: string; roles: string[] }> = {
  "token-bob": { id: "bob", roles: ["user"] },
  "token-carol": { id: "carol", roles: ["user"] },
};

const BEARER_AUTH = {
  type: "bearer" as const,
  validate: async (token: string) => USERS[token] ?? null,
  skipDevPlayground: false,
};

type Running = { base: string; stop: () => Promise<void> };

const ORIGIN = "https://app.example.com";

type StartOptions = {
  /** Register the session middleware before authentication. */
  sessionFirst?: boolean;
  /** What `createSessionMiddleware` is given. */
  session?: Parameters<typeof createSessionMiddleware>[0];
  /** Replaces the server's default CORS allowed headers when given. */
  corsHeaders?: string[];
  /**
   * The server's `carryMiddlewareState`. On unless a case is about it being
   * off: without it the middleware's session never reaches the handler on
   * Express, Fastify and Koa.
   */
  carry?: boolean;
};

async function freePort(): Promise<number> {
  const server = createTcpServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as AddressInfo).port;
  await new Promise<void>((resolve) => server.close(() => resolve()));
  return port;
}

async function start(
  framework: Framework,
  {
    sessionFirst = false,
    session: sessionConfig = { cookieName: "sid" },
    corsHeaders,
    carry = true,
  }: StartOptions = {},
): Promise<Running> {
  const port = await freePort();
  const adapter = await createServer(new NeuroLink(), {
    framework,
    config: {
      port,
      host: "127.0.0.1",
      carryMiddlewareState: carry,
      cors: {
        origins: [ORIGIN],
        ...(corsHeaders ? { headers: corsHeaders } : {}),
      },
    },
  });
  const auth = createAuthMiddleware(BEARER_AUTH);
  const session = createSessionMiddleware(sessionConfig);
  for (const middleware of sessionFirst ? [session, auth] : [auth, session]) {
    adapter.registerMiddleware(middleware);
  }
  for (const path of ["/api/session-echo", "/api/session-skipped"]) {
    adapter.registerRoute({
      method: "GET",
      path,
      handler: async (ctx) => ({
        session: ctx.session?.id ?? null,
        user: ctx.user?.id ?? null,
      }),
    });
  }
  await adapter.initialize();
  await adapter.start();
  return { base: `http://127.0.0.1:${port}`, stop: () => adapter.stop() };
}

const servers = new Map<Framework, Promise<Running>>();
function running(framework: Framework): Promise<Running> {
  let pending = servers.get(framework);
  if (!pending) {
    pending = start(framework);
    servers.set(framework, pending);
  }
  return pending.catch((error: unknown) => {
    // Skip only when the optional framework package is not installed; any other
    // failure to start an adapter must fail the suite, not let it print PASS.
    if (error instanceof MissingDependencyError) {
      throw new Skip(`${framework} is not installed here`);
    }
    throw error;
  });
}

/** Start a server of its own with `options`, run `fn` against it, stop it. */
async function withServer<T>(
  framework: Framework,
  options: StartOptions,
  fn: (server: Running) => Promise<T>,
): Promise<T> {
  let server: Running;
  try {
    server = await start(framework, options);
  } catch (error) {
    if (error instanceof MissingDependencyError) {
      throw new Skip(`${framework} is not installed here`);
    }
    throw error;
  }
  try {
    return await fn(server);
  } finally {
    await server.stop();
  }
}

type Echoed = {
  status: number;
  session: string | null;
  user: string | null;
};

async function echoFrom(
  base: string,
  token: string,
  headers: Record<string, string>,
  path = "/api/session-echo",
): Promise<Echoed> {
  const res = await fetch(`${base}${path}`, {
    headers: {
      authorization: `Bearer ${token}`,
      // No keep-alive: an idle connection makes Express and Koa wait seconds
      // for it to expire when the server is stopped.
      connection: "close",
      ...headers,
    },
  });
  const text = await res.text();
  try {
    const body = JSON.parse(text) as {
      data?: { session: string | null; user: string | null };
    };
    return {
      status: res.status,
      session: body.data?.session ?? null,
      user: body.data?.user ?? null,
    };
  } catch {
    return { status: res.status, session: null, user: null };
  }
}

async function echo(
  framework: Framework,
  token: string,
  headers: Record<string, string>,
): Promise<Echoed> {
  const { base } = await running(framework);
  return echoFrom(base, token, headers);
}

type Preflight = {
  status: number;
  allowOrigin: string | null;
  /** Lower-cased names from Access-Control-Allow-Headers. */
  allowHeaders: string[];
};

/** A browser's CORS preflight for a request from ORIGIN carrying `requested`. */
async function preflight(
  base: string,
  requested: string[],
): Promise<Preflight> {
  const res = await fetch(`${base}/api/session-echo`, {
    method: "OPTIONS",
    headers: {
      connection: "close",
      origin: ORIGIN,
      "access-control-request-method": "GET",
      "access-control-request-headers": requested.join(","),
    },
  });
  await res.text();
  return {
    status: res.status,
    allowOrigin: res.headers.get("access-control-allow-origin"),
    allowHeaders: (res.headers.get("access-control-allow-headers") ?? "")
      .split(",")
      .map((name) => name.trim().toLowerCase())
      .filter((name) => name !== ""),
  };
}

for (const framework of FRAMEWORKS) {
  await test(`${framework}: a session id from the header reaches the handler scoped to the authenticated user`, async () => {
    const bob = await echo(framework, "token-bob", {
      "x-session-id": "chat-1",
    });
    assertEqual(bob.status, 200, "request served");
    assertEqual(
      bob.session,
      "bob:chat-1",
      "bob's session is prefixed with bob",
    );
    const carol = await echo(framework, "token-carol", {
      "x-session-id": "chat-1",
    });
    assertEqual(
      carol.session,
      "carol:chat-1",
      "the same id is a different session for carol",
    );
  });

  await test(`${framework}: no header means no session`, async () => {
    const reply = await echo(framework, "token-bob", {});
    assertEqual(reply.status, 200, "request served");
    assertEqual(reply.session, null, "nothing is set");
  });

  await test(`${framework}: without carryMiddlewareState the handler sees neither the session nor the user${
    framework === "hono" ? ", unless the client sent its own X-Request-ID" : ""
  }`, async () => {
    const headers = { "x-session-id": "chat-1" };
    // Precondition: the identical request does reach the handler with both on a
    // server that carries middleware state.
    const carried = await echo(framework, "token-bob", headers);
    assertEqual(carried.status, 200, "carrying server: request served");
    assertEqual(carried.user, "bob", "carrying server: the handler sees bob");
    assertEqual(
      carried.session,
      "bob:chat-1",
      "carrying server: the handler sees bob's session",
    );

    await withServer(framework, { carry: false }, async (server) => {
      const plain = await echoFrom(server.base, "token-bob", headers);
      assertEqual(plain.status, 200, "request served and authenticated");
      assertEqual(plain.user, null, "the handler does not see ctx.user");
      assertEqual(plain.session, null, "the handler does not see ctx.session");

      // Hono kept the middleware's context under a caller-supplied
      // X-Request-ID before the carry existed, and still does with it off, so
      // the middleware also sees the user it prefixes with. The other adapters
      // have no such path.
      const withId = await echoFrom(server.base, "token-bob", {
        ...headers,
        "x-request-id": "caller-chosen-id",
      });
      assertEqual(withId.status, 200, "request with X-Request-ID served");
      assertEqual(
        withId.user,
        framework === "hono" ? "bob" : null,
        "ctx.user reaches the handler only on Hono with the caller's X-Request-ID",
      );
      assertEqual(
        withId.session,
        framework === "hono" ? "bob:chat-1" : null,
        "ctx.session reaches the handler only on Hono with the caller's X-Request-ID",
      );
    });
  });

  await test(`${framework}: an id that is not a plain token is refused with 400`, async () => {
    for (const bad of [
      "a:b",
      "has space",
      "../x",
      "x".repeat(129),
      "-leading",
      ".leading",
      "_leading",
    ]) {
      const reply = await echo(framework, "token-bob", { "x-session-id": bad });
      assertEqual(reply.status, 400, "malformed session id refused");
    }
  });

  await test(`${framework}: an id of 128 characters is accepted, one of 129 is not`, async () => {
    const longest = `a${"b".repeat(127)}`;
    assertEqual(longest.length, 128, "the boundary id is 128 characters");
    const accepted = await echo(framework, "token-bob", {
      "x-session-id": longest,
    });
    assertEqual(accepted.status, 200, "128 characters served");
    assertEqual(accepted.session, `bob:${longest}`, "128 characters scoped");
    const refused = await echo(framework, "token-bob", {
      "x-session-id": `${longest}c`,
    });
    assertEqual(refused.status, 400, "129 characters refused");
  });

  await test(`${framework}: an opted-in cookie is the fallback, and the header wins`, async () => {
    const fromCookie = await echo(framework, "token-bob", {
      cookie: "other=1; sid=from-cookie",
    });
    assertEqual(
      fromCookie.session,
      "bob:from-cookie",
      "cookie used when no header",
    );
    const both = await echo(framework, "token-bob", {
      cookie: "sid=from-cookie",
      "x-session-id": "from-header",
    });
    assertEqual(both.session, "bob:from-header", "header takes precedence");
  });

  await test(`${framework}: an empty header falls back to the cookie`, async () => {
    const reply = await echo(framework, "token-bob", {
      "x-session-id": "",
      cookie: "sid=from-cookie",
    });
    assertEqual(reply.status, 200, "request served");
    assertEqual(
      reply.session,
      "bob:from-cookie",
      "an empty header counts as absent",
    );
    const neither = await echo(framework, "token-bob", {
      "x-session-id": "",
    });
    assertEqual(neither.status, 200, "an empty header alone is served");
    assertEqual(neither.session, null, "an empty header alone sets nothing");
  });

  await test(`${framework}: an invalid value in the opted-in cookie is ignored, an invalid header is still a 400`, async () => {
    // Precondition for the negatives below: this server does read the cookie.
    const valid = await echo(framework, "token-bob", {
      cookie: "sid=from-cookie",
    });
    assertEqual(
      valid.session,
      "bob:from-cookie",
      "precondition: a valid cookie sets the session",
    );
    for (const bad of ["a%3Ab", "has%20space", "-leading", "x".repeat(129)]) {
      const ignored = await echo(framework, "token-bob", {
        cookie: `sid=${bad}`,
      });
      assertEqual(ignored.status, 200, "an invalid cookie does not fail");
      assertEqual(ignored.session, null, "an invalid cookie sets no session");
    }
    const headerWins = await echo(framework, "token-bob", {
      cookie: "sid=a%3Ab",
      "x-session-id": "from-header",
    });
    assertEqual(headerWins.status, 200, "a valid header beats a bad cookie");
    assertEqual(headerWins.session, "bob:from-header", "header used");
    const headerStrict = await echo(framework, "token-bob", {
      cookie: "sid=from-cookie",
      "x-session-id": "a:b",
    });
    assertEqual(
      headerStrict.status,
      400,
      "an invalid header is refused even with a valid cookie",
    );
  });

  await test(`${framework}: registration order decides, not the order number: a session middleware registered before authentication sets an unprefixed id`, async () => {
    const run = (sessionFirst: boolean): Promise<Echoed> =>
      withServer(framework, { sessionFirst }, (server) =>
        echoFrom(server.base, "token-bob", { "x-session-id": "chat-1" }),
      );
    const authFirst = await run(false);
    assertEqual(authFirst.status, 200, "auth first: served");
    assertEqual(authFirst.user, "bob", "auth first: authentication ran");
    assertEqual(authFirst.session, "bob:chat-1", "auth first: prefixed");

    // Registered first runs first, though its order number is the higher one.
    const sessionFirst = await run(true);
    assertEqual(sessionFirst.status, 200, "session first: served");
    assertEqual(sessionFirst.user, "bob", "session first: authentication ran");
    assertEqual(
      sessionFirst.session,
      "chat-1",
      "session first: it saw no user, so the id is bare",
    );
  });

  await test(`${framework}: a custom headerName replaces X-Session-Id`, async () => {
    await withServer(
      framework,
      { session: { headerName: "X-Chat-Id" } },
      async (server) => {
        const custom = await echoFrom(server.base, "token-bob", {
          "x-chat-id": "chat-9",
        });
        assertEqual(custom.status, 200, "the custom header is served");
        assertEqual(
          custom.session,
          "bob:chat-9",
          "precondition: this server reads the custom header",
        );
        const invalid = await echoFrom(server.base, "token-bob", {
          "x-chat-id": "a:b",
        });
        assertEqual(invalid.status, 400, "an invalid custom header is refused");

        const defaultName = await echoFrom(server.base, "token-bob", {
          "x-session-id": "chat-1",
        });
        assertEqual(
          defaultName.status,
          200,
          "the default name is just a header",
        );
        assertEqual(defaultName.session, null, "the default name sets nothing");
        const defaultInvalid = await echoFrom(server.base, "token-bob", {
          "x-session-id": "a:b",
        });
        assertEqual(
          defaultInvalid.status,
          200,
          "the default name is not validated either",
        );
      },
    );
  });

  await test(`${framework}: skipPaths leaves a path out of the middleware`, async () => {
    await withServer(
      framework,
      { session: { skipPaths: ["/api/session-skipped"] } },
      async (server) => {
        // Preconditions: on a path that is not listed the middleware sets the
        // session and validates the header, and authentication runs everywhere.
        const covered = await echoFrom(server.base, "token-bob", {
          "x-session-id": "chat-1",
        });
        assertEqual(covered.session, "bob:chat-1", "a covered path is scoped");
        const coveredInvalid = await echoFrom(server.base, "token-bob", {
          "x-session-id": "a:b",
        });
        assertEqual(
          coveredInvalid.status,
          400,
          "a covered path validates the header",
        );

        const skipped = await echoFrom(
          server.base,
          "token-bob",
          { "x-session-id": "chat-1" },
          "/api/session-skipped",
        );
        assertEqual(skipped.status, 200, "the skipped path is served");
        assertEqual(skipped.user, "bob", "authentication still ran there");
        assertEqual(skipped.session, null, "the middleware did not run there");
        const skippedInvalid = await echoFrom(
          server.base,
          "token-bob",
          { "x-session-id": "a:b" },
          "/api/session-skipped",
        );
        assertEqual(
          skippedInvalid.status,
          200,
          "an invalid header on a skipped path is not validated",
        );
      },
    );
  });

  await test(`${framework}: a preflight on the default CORS config allows X-Session-Id`, async () => {
    const { base } = await running(framework);
    const reply = await preflight(base, ["authorization", "x-session-id"]);
    assert(
      reply.status >= 200 && reply.status < 300,
      "the preflight is answered",
    );
    assertEqual(reply.allowOrigin, ORIGIN, "precondition: CORS ran");
    assert(
      reply.allowHeaders.includes("authorization"),
      "precondition: the allowed header list was read",
    );
    assert(
      reply.allowHeaders.includes("x-session-id"),
      "the default allowed headers include X-Session-Id",
    );
  });

  await test(`${framework}: a custom headerName is not allowed by default and must be added to cors.headers`, async () => {
    const asked = ["authorization", "x-chat-id"];
    const byDefault = await withServer(
      framework,
      { session: { headerName: "X-Chat-Id" } },
      (server) => preflight(server.base, asked),
    );
    assertEqual(byDefault.allowOrigin, ORIGIN, "default: CORS ran");
    assert(
      byDefault.allowHeaders.includes("authorization"),
      "default: the allowed header list was read",
    );
    assert(
      !byDefault.allowHeaders.includes("x-chat-id"),
      "the default allowed headers do not include a custom name",
    );

    const listed = await withServer(
      framework,
      {
        session: { headerName: "X-Chat-Id" },
        corsHeaders: ["Content-Type", "Authorization", "X-Chat-Id"],
      },
      (server) => preflight(server.base, asked),
    );
    assertEqual(listed.allowOrigin, ORIGIN, "listed: CORS ran");
    assert(
      listed.allowHeaders.includes("x-chat-id"),
      "adding the name to cors.headers allows it",
    );
    assert(
      !listed.allowHeaders.includes("x-session-id"),
      "a list that is passed replaces the default, it does not extend it",
    );
  });
}

await test("the session middleware's order number is higher than authentication's", async () => {
  assertEqual(createSessionMiddleware().order, 12, "its order number is 12");
  assertEqual(
    createAuthMiddleware(BEARER_AUTH).order,
    10,
    "authentication's order number is 10",
  );
});

// ===========================================================================
// Conversation continuity and isolation through the agent routes
// ===========================================================================

type HonoLike = {
  request: (path: string, init?: RequestInit) => Promise<Response>;
};

type AgentAppOptions = {
  /** The real middleware (true) or a control that does not scope to the user. */
  withPrefix: boolean;
  /** `registerAllRoutes`'s `perUserAuth` for the agent routes. */
  perUserAuth: boolean;
  /**
   * Authentication that identifies a caller with a known token and lets any
   * other request through with no `ctx.user`, instead of refusing it.
   */
  optionalAuth?: boolean;
  /**
   * The server's `carryMiddlewareState`, left unset (off) unless a case is about
   * it. `registerAllRoutes` turns it on by itself with `perUserAuth`.
   */
  carry?: boolean;
};

async function agentApp({
  withPrefix,
  perUserAuth,
  optionalAuth = false,
  carry,
}: AgentAppOptions): Promise<HonoLike> {
  const nl = new NeuroLink({
    conversationMemory: { enabled: true, enableSummarization: false },
  });
  const adapter = await createServer(nl, {
    framework: "hono",
    config: {
      port: 0,
      host: "127.0.0.1",
      ...(carry === undefined ? {} : { carryMiddlewareState: carry }),
    },
  });
  adapter.registerMiddleware(
    optionalAuth
      ? {
          name: "optional-authentication",
          order: 10,
          handler: async (ctx, next) => {
            const bearer = ctx.headers["authorization"]?.match(/^Bearer (.+)$/);
            const user = bearer ? USERS[bearer[1]] : undefined;
            if (user) {
              ctx.user = { id: user.id, roles: user.roles };
            }
            return next();
          },
        }
      : createAuthMiddleware(BEARER_AUTH),
  );
  adapter.registerMiddleware(
    withPrefix
      ? createSessionMiddleware()
      : {
          // The control: a session middleware that does not scope to the user.
          name: "unscoped-session",
          order: 12,
          handler: async (ctx, next) => {
            const raw = ctx.headers["x-session-id"];
            if (raw) {
              ctx.session = { id: raw };
            }
            return next();
          },
        },
  );
  await adapter.initialize();
  registerAllRoutes(adapter, "/api", { perUserAuth });
  return adapter.getFrameworkInstance() as HonoLike;
}

function openAIResponse(): unknown {
  return {
    id: "chatcmpl-mock",
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: "gpt-4o-mini",
    choices: [
      {
        index: 0,
        message: { role: "assistant", content: "noted" },
        finish_reason: "stop",
      },
    ],
    usage: { prompt_tokens: 5, completion_tokens: 5, total_tokens: 10 },
  };
}

type MockedProvider = {
  /** Every request body the provider was sent, oldest first. */
  requests: () => string[];
  /** The body of the most recent request. */
  last: () => string;
};

/** Run `fn` with a mocked OpenAI that records what it was sent. */
async function withMockedProvider<T>(
  fn: (provider: MockedProvider) => Promise<T>,
): Promise<T> {
  const originalKey = process.env.OPENAI_API_KEY;
  const originalBase = process.env.OPENAI_BASE_URL;
  process.env.OPENAI_API_KEY = "test-fake-openai-credential-for-session-mw";
  delete process.env.OPENAI_BASE_URL;
  const { unset, calls } = installMockFetch([
    {
      method: "POST",
      url: "api.openai.com/v1/chat/completions",
      respond: { status: 200, json: openAIResponse() },
    },
  ]);
  try {
    return await fn({
      requests: () => calls.map((call) => call.bodyText ?? ""),
      last: () => calls[calls.length - 1]?.bodyText ?? "",
    });
  } finally {
    unset();
    if (originalKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = originalKey;
    }
    if (originalBase !== undefined) {
      process.env.OPENAI_BASE_URL = originalBase;
    }
  }
}

/**
 * A client that sends its own `X-Request-ID`. On Hono that is the one request
 * whose handler got the middleware's context before the adapters carried it, so
 * with `perUserAuth` off the agent routes still read `ctx.user` and
 * `ctx.session` from it; on every other request the default reads the body.
 */
const CALLER_REQUEST_ID = "caller-chosen-id";

type Say = {
  /** Value of the `X-Session-Id` header. */
  session?: string;
  /** `sessionId` in the request body. */
  bodySessionId?: string;
  /** Send `X-Request-ID: caller-chosen-id`. */
  callerRequestId?: boolean;
};

async function say(
  app: HonoLike,
  token: string | undefined,
  text: string,
  { session, bodySessionId, callerRequestId }: Say = {},
): Promise<number> {
  const res = await app.request("/api/agent/execute", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(session ? { "x-session-id": session } : {}),
      ...(callerRequestId ? { "x-request-id": CALLER_REQUEST_ID } : {}),
    },
    body: JSON.stringify({
      input: text,
      provider: "openai",
      model: "gpt-4o-mini",
      ...(bodySessionId ? { sessionId: bodySessionId } : {}),
    }),
  });
  await res.text();
  return res.status;
}

/**
 * One turn that is proven to have run: the route answered 200, the provider
 * received exactly one new request, and that request carries this turn's own
 * text. Returns what the provider was sent, so a later assertion that an
 * earlier turn is absent from it is about a request that really was made.
 */
async function turn(
  provider: MockedProvider,
  app: HonoLike,
  token: string | undefined,
  text: string,
  options: Say,
  label: string,
): Promise<string> {
  const before = provider.requests().length;
  assertEqual(await say(app, token, text, options), 200, `${label}: served`);
  assertEqual(
    provider.requests().length,
    before + 1,
    `${label}: reached the provider once`,
  );
  const sent = provider.last();
  assert(sent.includes(text), `${label}: the request is this turn's own`);
  return sent;
}

await test("an authenticated user's second turn carries the first turn's history", async () => {
  const app = await agentApp({ withPrefix: true, perUserAuth: true });
  await withMockedProvider(async (provider) => {
    const marker = "BOB-FIRST-7301";
    await turn(
      provider,
      app,
      "token-bob",
      `remember ${marker}`,
      { session: "chat-1" },
      "first turn",
    );
    const second = await turn(
      provider,
      app,
      "token-bob",
      "what did I say",
      { session: "chat-1" },
      "second turn",
    );
    assert(second.includes(marker), "the provider received the earlier turn");
  });
});

await test("another user sending the same session id does not see that history", async () => {
  const app = await agentApp({ withPrefix: true, perUserAuth: true });
  await withMockedProvider(async (provider) => {
    const marker = "BOB-SECRET-8842";
    // Precondition: bob's turn reached the provider (turn() asserts it), so
    // there is something for carol to see.
    await turn(
      provider,
      app,
      "token-bob",
      `remember ${marker}`,
      { session: "chat-1" },
      "bob's turn",
    );
    const carol = await turn(
      provider,
      app,
      "token-carol",
      "what was said before",
      { session: "chat-1" },
      "carol's turn",
    );
    assert(
      !carol.includes(marker),
      "carol's request carries nothing of bob's conversation",
    );
  });
});

await test("a request with no session id starts fresh each time", async () => {
  const app = await agentApp({ withPrefix: true, perUserAuth: true });
  await withMockedProvider(async (provider) => {
    const marker = "BOB-NOSESSION-1190";
    await turn(
      provider,
      app,
      "token-bob",
      `remember ${marker}`,
      {},
      "first turn",
    );
    const second = await turn(
      provider,
      app,
      "token-bob",
      "what did I say",
      {},
      "second turn",
    );
    assert(!second.includes(marker), "no session, no history");
  });
});

await test("control: without the user prefix, two users share one conversation", async () => {
  const app = await agentApp({ withPrefix: false, perUserAuth: true });
  await withMockedProvider(async (provider) => {
    const marker = "BOB-LEAK-5563";
    await turn(
      provider,
      app,
      "token-bob",
      `remember ${marker}`,
      { session: "chat-1" },
      "bob's turn",
    );
    const carol = await turn(
      provider,
      app,
      "token-carol",
      "what was said before",
      { session: "chat-1" },
      "carol's turn",
    );
    assert(
      carol.includes(marker),
      "the probe does see history that leaks, so the isolation case above is a real negative",
    );
  });
});

// ===========================================================================
// How the middleware relates to perUserAuth
// ===========================================================================

await test("perUserAuth on: a signed-in client keeps its conversation through the middleware, and a body sessionId is ignored", async () => {
  const app = await agentApp({ withPrefix: true, perUserAuth: true });
  await withMockedProvider(async (provider) => {
    const marker = "BOB-PERUSER-2207";
    // bob sends the same X-Request-ID as in the control below, where it is
    // needed; here it changes nothing, so the two cases differ only in
    // perUserAuth.
    await turn(
      provider,
      app,
      "token-bob",
      `remember ${marker}`,
      { session: "chat-1", bodySessionId: "body-one", callerRequestId: true },
      "bob's first turn",
    );
    // A different body sessionId on the second turn changes nothing: the
    // conversation follows the middleware's session. This also proves the
    // conversation under "bob:chat-1" holds the marker.
    const second = await turn(
      provider,
      app,
      "token-bob",
      "what did I say",
      { session: "chat-1", bodySessionId: "body-two", callerRequestId: true },
      "bob's second turn",
    );
    assert(
      second.includes(marker),
      "the conversation follows the middleware's session",
    );
    // carol names the key bob's conversation is stored under in her body.
    const carol = await turn(
      provider,
      app,
      "token-carol",
      "what was said before",
      { bodySessionId: "bob:chat-1" },
      "carol's turn",
    );
    assert(
      !carol.includes(marker),
      "a body sessionId naming bob's session reaches nothing",
    );
  });
});

await test("control: with perUserAuth off, the same body sessionId reaches the earlier conversation", async () => {
  const app = await agentApp({ withPrefix: true, perUserAuth: false });
  await withMockedProvider(async (provider) => {
    const marker = "BOB-OPEN-6614";
    // bob sends an X-Request-ID because, with perUserAuth off, only a request
    // that does is stored under the middleware's id ("bob:chat-1"); without it
    // his turn would be stored under no session and carol would have nothing
    // to reach.
    await turn(
      provider,
      app,
      "token-bob",
      `remember ${marker}`,
      { session: "chat-1", callerRequestId: true },
      "bob's turn",
    );
    const carol = await turn(
      provider,
      app,
      "token-carol",
      "what was said before",
      { bodySessionId: "bob:chat-1" },
      "carol's turn",
    );
    assert(
      carol.includes(marker),
      "the probe does see history that a body sessionId reaches, so the perUserAuth case above is a real negative",
    );
  });
});

// Run with the server's carryMiddlewareState off (the default: a request with no
// X-Request-ID of its own is handed a fresh context, so the handler has no
// ctx.session at all) and on (the handler has the middleware's session, which
// the agent routes still ignore without perUserAuth). Both give the body's
// sessionId; they differ in why.
for (const carry of [false, true]) {
  await test(`perUserAuth off, carryMiddlewareState ${carry ? "on" : "off"}: a request with no X-Request-ID of its own ignores the middleware's session and uses the body's sessionId`, async () => {
    const app = await agentApp({ withPrefix: true, perUserAuth: false, carry });
    await withMockedProvider(async (provider) => {
      const bodyMarker = "BOB-BODY-3380";
      const headerMarker = "BOB-HEADER-9917";
      const withIdMarker = "BOB-WITHID-4471";

      // Precondition: on this very server the middleware does set a session and
      // the agent routes can use it, for a request that sends an X-Request-ID.
      await turn(
        provider,
        app,
        "token-bob",
        `remember ${withIdMarker}`,
        { session: "chat-2", callerRequestId: true },
        "X-Request-ID, first turn",
      );
      const withIdAgain = await turn(
        provider,
        app,
        "token-bob",
        "what did I say",
        { session: "chat-2", callerRequestId: true },
        "X-Request-ID, second turn",
      );
      assert(
        withIdAgain.includes(withIdMarker),
        "precondition: the middleware's id keeps a conversation when an X-Request-ID is sent",
      );

      // The same two requests without an X-Request-ID share nothing: the
      // middleware's session is not read.
      await turn(
        provider,
        app,
        "token-bob",
        `remember ${headerMarker}`,
        { session: "chat-1" },
        "header only, first turn",
      );
      const headerAgain = await turn(
        provider,
        app,
        "token-bob",
        "what did I say",
        { session: "chat-1" },
        "header only, second turn",
      );
      assert(
        !headerAgain.includes(headerMarker),
        "the middleware's session id is ignored, so the second turn carries nothing of the first",
      );

      // The body's sessionId is what keeps a conversation here, and it is used
      // even when the middleware also set one.
      await turn(
        provider,
        app,
        "token-bob",
        `remember ${bodyMarker}`,
        { bodySessionId: "legacy-1" },
        "body turn one",
      );
      const bodyAgain = await turn(
        provider,
        app,
        "token-bob",
        "what did I say",
        { bodySessionId: "legacy-1" },
        "body turn two",
      );
      assert(
        bodyAgain.includes(bodyMarker),
        "a body sessionId keeps a conversation",
      );
      const both = await turn(
        provider,
        app,
        "token-bob",
        "and with a header too",
        { session: "chat-1", bodySessionId: "legacy-1" },
        "turn with both",
      );
      assert(
        both.includes(bodyMarker),
        "the body's conversation was used although the middleware set a session",
      );
    });
  });
}

await test("perUserAuth off, with an X-Request-ID of the caller's own: the middleware's session wins over the body's, as before", async () => {
  const app = await agentApp({ withPrefix: true, perUserAuth: false });
  await withMockedProvider(async (provider) => {
    const bodyMarker = "BOB-BODY-5208";
    const headerMarker = "BOB-HEADER-7733";
    await turn(
      provider,
      app,
      "token-bob",
      `remember ${bodyMarker}`,
      { bodySessionId: "legacy-1" },
      "body turn one",
    );
    const bodyAgain = await turn(
      provider,
      app,
      "token-bob",
      "what did I say",
      { bodySessionId: "legacy-1" },
      "body turn two",
    );
    assert(
      bodyAgain.includes(bodyMarker),
      'precondition: the "legacy-1" conversation holds the body marker',
    );

    // Both are sent: the middleware's id wins, so the "legacy-1" conversation
    // (proved above to hold bodyMarker) is not the one used.
    const both = await turn(
      provider,
      app,
      "token-bob",
      `remember ${headerMarker}`,
      { session: "chat-1", bodySessionId: "legacy-1", callerRequestId: true },
      "turn with both",
    );
    assert(
      !both.includes(bodyMarker),
      "the body's conversation was not used when the middleware set a session",
    );
    const viaHeader = await turn(
      provider,
      app,
      "token-bob",
      "and now",
      { session: "chat-1", callerRequestId: true },
      "header turn",
    );
    assert(
      viaHeader.includes(headerMarker),
      "the turn that sent both was stored under the middleware's id",
    );
  });
});

// ===========================================================================
// An anonymous caller under optional authentication
// ===========================================================================

await test("perUserAuth on: an anonymous caller that sends X-Session-Id gets no conversation, a signed-in one does", async () => {
  const app = await agentApp({
    withPrefix: true,
    perUserAuth: true,
    optionalAuth: true,
  });
  await withMockedProvider(async (provider) => {
    const bobMarker = "BOB-OPTIONAL-4418";
    const anonMarker = "ANON-FIRST-6073";
    // Every turn sends the X-Request-ID the control below needs; under
    // perUserAuth it changes nothing, so the two cases differ only in that.
    // Precondition: on this very server the same session id does keep a
    // conversation for a signed-in caller.
    await turn(
      provider,
      app,
      "token-bob",
      `remember ${bobMarker}`,
      { session: "chat-1", callerRequestId: true },
      "bob's first turn",
    );
    const bobAgain = await turn(
      provider,
      app,
      "token-bob",
      "what did I say",
      { session: "chat-1", callerRequestId: true },
      "bob's second turn",
    );
    assert(
      bobAgain.includes(bobMarker),
      "precondition: a signed-in caller keeps a conversation",
    );

    await turn(
      provider,
      app,
      undefined,
      `remember ${anonMarker}`,
      { session: "chat-1", callerRequestId: true },
      "anonymous first turn",
    );
    const anonAgain = await turn(
      provider,
      app,
      undefined,
      "what did I say",
      { session: "chat-1", callerRequestId: true },
      "anonymous second turn",
    );
    assert(
      !anonAgain.includes(anonMarker),
      "an anonymous caller's second turn carries nothing of its first",
    );
    assert(
      !anonAgain.includes(bobMarker),
      "an anonymous caller's turn carries nothing of bob's conversation",
    );
  });
});

await test("control: with perUserAuth off, anonymous callers that send the same X-Session-Id and their own X-Request-ID share one conversation", async () => {
  const app = await agentApp({
    withPrefix: true,
    perUserAuth: false,
    optionalAuth: true,
  });
  await withMockedProvider(async (provider) => {
    const marker = "ANON-SHARED-2951";
    await turn(
      provider,
      app,
      undefined,
      `remember ${marker}`,
      { session: "chat-1", callerRequestId: true },
      "first anonymous caller",
    );
    const other = await turn(
      provider,
      app,
      undefined,
      "what was said before",
      { session: "chat-1", callerRequestId: true },
      "second anonymous caller",
    );
    assert(
      other.includes(marker),
      "the probe does see a conversation that anonymous callers share, so the perUserAuth case above is a real negative",
    );
  });
});

try {
  await runSuite();
} finally {
  for (const pending of servers.values()) {
    await pending.then((s) => s.stop()).catch(() => undefined);
  }
}
