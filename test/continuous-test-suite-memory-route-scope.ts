#!/usr/bin/env tsx
/**
 * Continuous Test Suite: the memory routes can be scoped to the authenticated
 * user, and stay exactly as they were unless the server opts in.
 *
 * `/api/memory/*` used to take the user from `?userId=` and never look at the
 * authenticated one, and `DELETE /api/memory/sessions` cleared every user's
 * sessions for any caller. With per-user authentication on, one user could read
 * and erase another's conversations.
 *
 * Scoping is opt-in (`perUserAuth`, any truthy value), because one shared API
 * key sets the same `ctx.user` for every caller (`{ id: "api-key" }` from the
 * CLI's `createServerApiKeyMiddleware`) and would turn every client into a
 * non-admin of its own deployment. Both halves are covered: the scoped cases
 * build the app with `perUserAuth: true`, and the default-mode cases put a
 * shared-key middleware in front of the unchanged routes.
 *
 * Every case drives a surface this package ships (CLAUDE.md rule 15): the
 * public `createServer` + `registerAllRoutes` + `createAuthMiddleware` from
 * `../dist/index.js` on an in-process Hono adapter, driven through Hono's own
 * `app.request()` (no port), with `NeuroLink` generating. Sessions are created
 * the way a deployment creates them, through `generate()` with a `sessionId` and
 * `userId` in `context`, against OpenAI behind `installMockFetch` and a fake key,
 * so nothing leaves the machine.
 *
 * Two memory managers are covered. The in-memory manager keys sessions by id
 * alone, so ownership is the session's own `userId`. The Redis manager keys them
 * by user (`<keyPrefix><userId>:<sessionId>`, neither part escaped); those cases
 * run against a throwaway `redis-server` this suite starts on a free port.
 *
 * **The Redis half skips when `redis-server` is not installed, and CI does not
 * install it.** On a runner without the binary the Redis cases report as
 * skipped, the run stays green, and only the in-memory half gates: a change that
 * drops the user from `clearSession` on Redis, or breaks an admin's `?userId=`
 * reach, would pass CI. Run `pnpm run test:memory-route-scope` on a machine with
 * `redis-server` before changing those paths. Nothing is installed in CI on
 * purpose.
 *
 * Two cases pin documented limitations rather than ideals, so the docs stay
 * true: because the Redis key joins user and session with an unescaped `:`, user
 * `a` asking for session `b:c` reaches user `a:b`'s session `c`, and a session
 * created without a `userId` is the session of a user named `session-only`. If
 * the manager starts escaping keys these cases fail, and the docs (the server
 * adapters API reference and security guide, the `createMemoryRoutes` and
 * `ServerMemoryRouteOptions` JSDoc) change with them.
 *
 * Two kinds of case need inputs that Hono, in-process, does not hand the routes,
 * so they step outside "a real manager behind Hono": `?userId=a&userId=b`
 * reaches the handler as an array only on Express, Fastify and Koa (those cases
 * start each on a free loopback port and call it over HTTP; a framework that is
 * not installed is skipped), and no shipped memory manager lacks `getSession`,
 * so the fallback that reads through `buildContextMessages` is driven by
 * replacing `conversationMemory` on a `NeuroLink` instance with a fake manager.
 * Both still go through `../dist/index.js` only.
 *
 * Run: pnpm exec tsx test/continuous-test-suite-memory-route-scope.ts
 */
import { spawn, spawnSync } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { createServer as createTcpServer, connect } from "node:net";
import type { AddressInfo } from "node:net";
import { assert, assertEqual, defineSuite, Skip } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";
import { installMockFetch } from "./utils/mockFetch.js";
import {
  MissingDependencyError,
  NeuroLink,
  createAuthMiddleware,
  createMemoryRoutes,
  createServer,
  registerAllRoutes,
} from "../dist/index.js";

// Fail loudly rather than silently testing a stale build (see distFreshness.ts).
assertDistFresh();

// The tracked .mcp-config.json makes every NeuroLink instance spawn an npx MCP
// server on its first generate(); none of these cases uses a tool, so skip it.
process.env.NEUROLINK_SKIP_MCP = "true";

const { test, runSuite } = defineSuite("Memory routes: per-user scope", {
  offline: true,
});

const ALICE_SECRET = "ALICE-SECRET-CONVERSATION-9931";
const BOB_SECRET = "BOB-SECRET-CONVERSATION-5527";
const ORPHAN_SECRET = "ORPHAN-UNOWNED-CONVERSATION-7741";
const NAMESPACED_SECRET = "NAMESPACED-USER-CONVERSATION-3318";

const USERS: Record<string, { id: string; roles: string[] }> = {
  "token-alice": { id: "alice", roles: ["user"] },
  "token-bob": { id: "bob", roles: ["user"] },
  "token-root": { id: "root", roles: ["admin"] },
  // Ids that make the Redis key scheme (`<userId>:<sessionId>`, unescaped) bite.
  "token-a": { id: "a", roles: ["user"] },
  "token-a-b": { id: "a:b", roles: ["user"] },
  "token-session-only": { id: "session-only", roles: ["user"] },
};
const SHARED_KEY = "shared-operator-key";
const EMPTY_ID_TOKEN = "token-empty-id";
/** Tokens whose user carries `roles` as something other than an array. */
const MALFORMED_ROLES: Record<string, unknown> = {
  "token-roles-string": "admin",
  "token-roles-object": { admin: true },
};

/**
 * How the server authenticates:
 * - `none`: no middleware, so nothing sets `ctx.user`.
 * - `people`: one credential per person (`USERS`).
 * - `optional`: like `people`, but a request with no token passes through.
 * - `shared-key`: the shape of the CLI's `createServerApiKeyMiddleware`, one
 *   `{ id: "api-key" }` for every caller.
 * - `empty-id`: a token whose user has an empty id and an admin role.
 * - `malformed-roles`: tokens (`MALFORMED_ROLES`) whose user's `roles` is a
 *   string or an object, as a faulty authentication middleware might produce.
 */
type AuthMode =
  | "none"
  | "people"
  | "optional"
  | "shared-key"
  | "empty-id"
  | "malformed-roles";

type RouteOptions = {
  perUserAuth?: boolean;
  /**
   * `perUserAuth` is not part of the public type of this option, since the
   * top-level one is the only switch; it is accepted here so a case can pass it
   * anyway, as a JavaScript caller could.
   */
  memory?: { adminRoles?: string[]; perUserAuth?: boolean };
};

type HonoLike = {
  request: (path: string, init?: RequestInit) => Promise<Response>;
};
type Reply = { status: number; text: string };

function validateFor(
  auth: AuthMode,
): (token: string) => Promise<{ id: string; roles?: string[] } | null> {
  return async (token) => {
    if (auth === "shared-key") {
      return token === SHARED_KEY ? { id: "api-key" } : null;
    }
    if (auth === "empty-id") {
      return token === EMPTY_ID_TOKEN ? { id: "", roles: ["admin"] } : null;
    }
    if (auth === "malformed-roles") {
      if (token === "token-roles-array") {
        return { id: "mallory", roles: ["admin"] };
      }
      // The point of the case is a user the type forbids, hence the cast.
      return token in MALFORMED_ROLES
        ? {
            id: "mallory",
            roles: MALFORMED_ROLES[token] as string[],
          }
        : null;
    }
    return USERS[token] ?? null;
  };
}

type Adapter = Awaited<ReturnType<typeof createServer>>;

function addAuth(adapter: Adapter, auth: AuthMode): void {
  if (auth === "optional") {
    adapter.registerMiddleware({
      name: "optional-authentication",
      order: 10,
      handler: async (ctx, next) => {
        const token = /^Bearer\s+(.+)$/i.exec(
          ctx.headers["authorization"] ?? "",
        )?.[1];
        const person = token ? USERS[token] : undefined;
        if (person) {
          ctx.user = { id: person.id, roles: person.roles };
        }
        return next();
      },
    });
  } else if (auth !== "none") {
    adapter.registerMiddleware(
      createAuthMiddleware({
        type: "bearer",
        validate: validateFor(auth),
        skipDevPlayground: false,
      }),
    );
  }
}

async function buildApp(
  nl: NeuroLink,
  auth: AuthMode,
  routes: RouteOptions = {},
): Promise<HonoLike> {
  const adapter = await createServer(nl, {
    framework: "hono",
    config: { port: 0, host: "127.0.0.1" },
  });
  addAuth(adapter, auth);
  await adapter.initialize();
  registerAllRoutes(adapter, "/api", routes);
  return adapter.getFrameworkInstance() as HonoLike;
}

async function call(
  app: HonoLike,
  method: "GET" | "DELETE",
  path: string,
  token?: string,
  headers: Record<string, string> = {},
): Promise<Reply> {
  const res = await app.request(path, {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });
  return { status: res.status, text: await res.text() };
}

/** The same request over real HTTP, for the frameworks that run on a port. */
async function callHttp(
  base: string,
  method: "GET" | "DELETE",
  path: string,
  token?: string,
): Promise<Reply> {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
  return { status: res.status, text: await res.text() };
}

async function freePort(): Promise<number> {
  const server = createTcpServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as AddressInfo).port;
  await new Promise<void>((resolve) => server.close(() => resolve()));
  return port;
}

/**
 * Runs `fn` against `framework` listening on a free loopback port, with the
 * authentication and routes of `buildApp` plus `/api/echo-userid`, which reports
 * whether the handler received `?userId=` as an array. A framework that is not
 * installed skips the case; any other failure to start is a failure.
 */
async function withFramework<T>(
  framework: "express" | "fastify" | "koa",
  nl: NeuroLink,
  auth: AuthMode,
  routes: RouteOptions,
  fn: (base: string) => Promise<T>,
): Promise<T> {
  const port = await freePort();
  let adapter: Adapter | undefined;
  try {
    adapter = await createServer(nl, {
      framework,
      config: { port, host: "127.0.0.1" },
    });
    addAuth(adapter, auth);
    adapter.registerRoute({
      method: "GET",
      path: "/api/echo-userid",
      handler: async (ctx) => ({ isArray: Array.isArray(ctx.query.userId) }),
    });
    registerAllRoutes(adapter, "/api", routes);
    await adapter.initialize();
    await adapter.start();
  } catch (error) {
    await adapter?.stop().catch(() => undefined);
    if (error instanceof MissingDependencyError) {
      throw new Skip(`${framework} is not installed here`);
    }
    throw error;
  }
  try {
    return await fn(`http://127.0.0.1:${port}`);
  } finally {
    await adapter.stop();
  }
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

/** A fake key and a mocked OpenAI for the duration of `fn`. */
async function withMockedProvider<T>(fn: () => Promise<T>): Promise<T> {
  const originalKey = process.env.OPENAI_API_KEY;
  const originalBase = process.env.OPENAI_BASE_URL;
  process.env.OPENAI_API_KEY = "test-fake-openai-credential-for-memory-scope";
  delete process.env.OPENAI_BASE_URL;
  const { unset } = installMockFetch([
    {
      method: "POST",
      url: "api.openai.com/v1/chat/completions",
      respond: { status: 200, json: openAIResponse() },
    },
  ]);
  try {
    return await fn();
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

/** Create a session the way a deployment does: through generate(). */
async function seed(
  nl: NeuroLink,
  sessionId: string,
  userId: string | undefined,
  text: string,
): Promise<void> {
  await withMockedProvider(async () => {
    await nl.generate({
      input: { text },
      provider: "openai",
      model: "gpt-4o-mini",
      context: { sessionId, ...(userId ? { userId } : {}) },
    });
  });
}

const mayRead = (reply: Reply, secret: string): boolean =>
  reply.status === 200 && reply.text.includes(secret);

// ===========================================================================
// In-memory manager, perUserAuth: true
// ===========================================================================

const SCOPED: RouteOptions = { perUserAuth: true };

const mem = new NeuroLink({
  conversationMemory: { enabled: true, enableSummarization: false },
});
await seed(mem, "sess-alice", "alice", `remember ${ALICE_SECRET}`);
await seed(mem, "sess-bob", "bob", `remember ${BOB_SECRET}`);
await seed(mem, "sess-orphan", undefined, "an unowned conversation");
const authed = await buildApp(mem, "people", SCOPED);

/** The `data` object of a successful reply. */
function dataOf(reply: Reply): Record<string, unknown> {
  const body: unknown = JSON.parse(reply.text);
  if (typeof body === "object" && body !== null && "data" in body) {
    const data = body.data;
    if (typeof data === "object" && data !== null) {
      return Object.fromEntries(Object.entries(data));
    }
  }
  return {};
}

/** Session ids in a listing reply, in the order returned. */
function listedIds(reply: Reply): string[] {
  const sessions = dataOf(reply).sessions;
  if (!Array.isArray(sessions)) {
    return [];
  }
  return sessions.flatMap((entry: unknown) =>
    typeof entry === "object" &&
    entry !== null &&
    "id" in entry &&
    typeof entry.id === "string"
      ? [entry.id]
      : [],
  );
}

await test("control: a user reads their own session, messages and listing", async () => {
  const session = await call(
    authed,
    "GET",
    "/api/memory/sessions/sess-alice",
    "token-alice",
  );
  assert(mayRead(session, ALICE_SECRET), "alice reads her session");
  const messages = await call(
    authed,
    "GET",
    "/api/memory/sessions/sess-alice/messages",
    "token-alice",
  );
  assert(mayRead(messages, ALICE_SECRET), "alice reads her messages");
  const list = await call(authed, "GET", "/api/memory/sessions", "token-alice");
  assertEqual(list.status, 200, "alice lists sessions");
  // Both halves matter: without the listing branch the reply is an empty list,
  // which the exclusion alone would accept.
  assertEqual(
    listedIds(list).join(","),
    "sess-alice",
    "alice's listing is her session and nothing else",
  );
});

await test("another user cannot read a session by id, and learns nothing from the refusal", async () => {
  for (const path of [
    "/api/memory/sessions/sess-alice",
    "/api/memory/sessions/sess-alice/messages",
  ]) {
    const reply = await call(authed, "GET", path, "token-bob");
    assertEqual(reply.status, 404, "reported as not found");
    assert(!reply.text.includes(ALICE_SECRET), "no content in the refusal");
  }
});

await test("naming another user in ?userId= is refused for an ordinary user", async () => {
  for (const path of [
    "/api/memory/sessions/sess-alice?userId=alice",
    "/api/memory/sessions/sess-alice/messages?userId=alice",
    "/api/memory/sessions?userId=alice",
  ]) {
    const reply = await call(authed, "GET", path, "token-bob");
    assertEqual(reply.status, 403, "impersonation refused");
    assert(!reply.text.includes(ALICE_SECRET), "no content in the refusal");
  }
  const own = await call(
    authed,
    "GET",
    "/api/memory/sessions/sess-bob?userId=bob",
    "token-bob",
  );
  assert(mayRead(own, BOB_SECRET), "repeating one's own id is accepted");
});

await test("another user cannot erase a session, and the session survives the attempt", async () => {
  const attempt = await call(
    authed,
    "DELETE",
    "/api/memory/sessions/sess-alice",
    "token-bob",
  );
  assertEqual(attempt.status, 404, "reported as not found");
  // Naming the owner is impersonation, refused before the session is looked up:
  // 403, where the unnamed attempt above is 404.
  const named = await call(
    authed,
    "DELETE",
    "/api/memory/sessions/sess-alice?userId=alice",
    "token-bob",
  );
  assertEqual(named.status, 403, "naming the owner is refused");
  const after = await call(
    authed,
    "GET",
    "/api/memory/sessions/sess-alice",
    "token-alice",
  );
  assert(mayRead(after, ALICE_SECRET), "alice's session is intact");
});

await test("an ordinary user cannot clear every session or read memory statistics", async () => {
  const wipe = await call(
    authed,
    "DELETE",
    "/api/memory/sessions",
    "token-bob",
  );
  assertEqual(wipe.status, 403, "clear-all refused");
  const stats = await call(authed, "GET", "/api/memory/stats", "token-bob");
  assertEqual(stats.status, 403, "statistics refused");
  const after = await call(
    authed,
    "GET",
    "/api/memory/sessions/sess-alice",
    "token-alice",
  );
  assert(mayRead(after, ALICE_SECRET), "nothing was cleared");
});

await test("a session with no owner is visible to an admin and to nobody else who is authenticated", async () => {
  const ordinary = await call(
    authed,
    "GET",
    "/api/memory/sessions/sess-orphan",
    "token-bob",
  );
  assertEqual(ordinary.status, 404, "an ordinary user cannot claim it");
  const admin = await call(
    authed,
    "GET",
    "/api/memory/sessions/sess-orphan",
    "token-root",
  );
  assertEqual(admin.status, 200, "an admin can read it");
});

await test("an admin may read another user's session and read statistics", async () => {
  const session = await call(
    authed,
    "GET",
    "/api/memory/sessions/sess-alice",
    "token-root",
  );
  assert(mayRead(session, ALICE_SECRET), "admin reads alice's session");
  const stats = await call(authed, "GET", "/api/memory/stats", "token-root");
  assertEqual(stats.status, 200, "admin reads statistics");
});

await test("an admin lists every session on the in-memory manager, or one user's with ?userId=", async () => {
  const everything = await call(
    authed,
    "GET",
    "/api/memory/sessions",
    "token-root",
  );
  assertEqual(everything.status, 200, "admin lists sessions");
  assertEqual(
    [...listedIds(everything)].sort().join(","),
    "sess-alice,sess-bob,sess-orphan",
    "all three sessions, the unowned one included",
  );
  const one = await call(
    authed,
    "GET",
    "/api/memory/sessions?userId=alice",
    "token-root",
  );
  assertEqual(
    listedIds(one).join(","),
    "sess-alice",
    "?userId= narrows an admin's listing to that user",
  );
});

await test("a user can erase their own session", async () => {
  const cleared = await call(
    authed,
    "DELETE",
    "/api/memory/sessions/sess-bob",
    "token-bob",
  );
  assertEqual(cleared.status, 200, "bob clears his session");
  const gone = await call(
    authed,
    "GET",
    "/api/memory/sessions/sess-bob",
    "token-bob",
  );
  assertEqual(gone.status, 404, "it is gone");
});

await test("adminRoles is configurable", async () => {
  const custom = await buildApp(mem, "people", {
    ...SCOPED,
    memory: { adminRoles: ["user"] },
  });
  const stats = await call(custom, "GET", "/api/memory/stats", "token-bob");
  assertEqual(stats.status, 200, "a role named in adminRoles is an admin");
  const root = await call(custom, "GET", "/api/memory/stats", "token-root");
  assertEqual(root.status, 403, "the default admin role no longer is");
});

await test("an admin can clear every session", async () => {
  const wipe = await call(
    authed,
    "DELETE",
    "/api/memory/sessions",
    "token-root",
  );
  assertEqual(wipe.status, 200, "admin clears all");
  const gone = await call(
    authed,
    "GET",
    "/api/memory/sessions/sess-alice",
    "token-root",
  );
  assertEqual(gone.status, 404, "sessions are gone");
});

// ===========================================================================
// perUserAuth: true without a usable user
// ===========================================================================

const MEMORY_AUTH_MESSAGE = "Memory routes require an authenticated user";

const MEMORY_ROUTES: ReadonlyArray<
  readonly ["GET" | "DELETE", string, string]
> = [
  ["GET", "/api/memory/sessions", "list"],
  ["GET", "/api/memory/sessions/sess-alice", "get"],
  ["GET", "/api/memory/sessions/sess-alice/messages", "messages"],
  ["GET", "/api/memory/stats", "stats"],
  ["DELETE", "/api/memory/sessions/sess-alice", "clear one"],
  ["DELETE", "/api/memory/sessions", "clear all"],
];

/** A 401 that came from the memory route itself, not from a middleware. */
const refusedByMemoryRoute = (reply: Reply): boolean =>
  reply.status === 401 && reply.text.includes(MEMORY_AUTH_MESSAGE);

await test("perUserAuth: a request with no user is refused with 401 on every memory route but health", async () => {
  const guarded = new NeuroLink({
    conversationMemory: { enabled: true, enableSummarization: false },
  });
  await seed(guarded, "sess-alice", "alice", `remember ${ALICE_SECRET}`);
  const noAuth = await buildApp(guarded, "none", SCOPED);
  const optional = await buildApp(guarded, "optional", SCOPED);

  // Precondition: with a user the same routes answer, so a 401 below is the
  // missing user and not a missing route.
  const known = await call(
    optional,
    "GET",
    "/api/memory/sessions/sess-alice",
    "token-alice",
  );
  assert(mayRead(known, ALICE_SECRET), "the route answers a known user");

  for (const [method, path, label] of MEMORY_ROUTES) {
    const bare = await call(noAuth, method, path);
    assert(refusedByMemoryRoute(bare), `${label}: no middleware, no user`);
    assert(!bare.text.includes(ALICE_SECRET), `${label}: nothing leaks`);
    const anonymous = await call(optional, method, path);
    assert(
      refusedByMemoryRoute(anonymous),
      `${label}: optional auth, no token`,
    );
  }

  const health = await call(noAuth, "GET", "/api/memory/health");
  assertEqual(health.status, 200, "health stays open");
  const after = await call(
    optional,
    "GET",
    "/api/memory/sessions/sess-alice",
    "token-alice",
  );
  assert(mayRead(after, ALICE_SECRET), "the refused DELETEs cleared nothing");
});

await test("perUserAuth: an authenticated user with an empty id is refused, not mapped to everyone's sessions", async () => {
  const guarded = new NeuroLink({
    conversationMemory: { enabled: true, enableSummarization: false },
  });
  await seed(guarded, "sess-alice", "alice", `remember ${ALICE_SECRET}`);
  const scoped = await buildApp(guarded, "empty-id", SCOPED);
  const unscoped = await buildApp(guarded, "empty-id");

  // Precondition: the middleware accepts the token and the route is reachable
  // with it, so the refusal below is the empty id and nothing else.
  const reached = await call(
    unscoped,
    "GET",
    "/api/memory/stats",
    EMPTY_ID_TOKEN,
  );
  assertEqual(reached.status, 200, "the empty-id token reaches the routes");

  for (const [method, path, label] of MEMORY_ROUTES) {
    const reply = await call(scoped, method, path, EMPTY_ID_TOKEN);
    assert(refusedByMemoryRoute(reply), `${label}: empty id refused`);
    assert(!reply.text.includes(ALICE_SECRET), `${label}: nothing leaks`);
  }
});

await test("perUserAuth: any truthy value turns scoping on, so a JavaScript caller passing a string or a number fails closed", async () => {
  const guarded = new NeuroLink({
    conversationMemory: { enabled: true, enableSummarization: false },
  });
  await seed(guarded, "sess-alice", "alice", `remember ${ALICE_SECRET}`);
  // A JavaScript caller is not held to `boolean`; each of these is truthy.
  const truthy: Array<[string, unknown]> = [
    ["the string 'true'", "true"],
    ["the number 1", 1],
    ["an object", {}],
  ];
  for (const [label, value] of truthy) {
    const app = await buildApp(guarded, "people", {
      perUserAuth: value as boolean,
    });
    // Precondition: the owner is served, so the refusals below are the scoping
    // and not a route that cannot answer.
    const own = await call(
      app,
      "GET",
      "/api/memory/sessions/sess-alice",
      "token-alice",
    );
    assert(mayRead(own, ALICE_SECRET), `${label}: the owner reads it`);
    const other = await call(
      app,
      "GET",
      "/api/memory/sessions/sess-alice",
      "token-bob",
    );
    assertEqual(other.status, 404, `${label}: another user's session`);
    assert(!other.text.includes(ALICE_SECRET), `${label}: no content`);
    const stats = await call(app, "GET", "/api/memory/stats", "token-bob");
    assertEqual(stats.status, 403, `${label}: statistics need an admin`);
    const wipe = await call(app, "DELETE", "/api/memory/sessions", "token-bob");
    assertEqual(wipe.status, 403, `${label}: clear-all needs an admin`);
    const bare = await buildApp(guarded, "none", {
      perUserAuth: value as boolean,
    });
    const anonymous = await call(bare, "GET", "/api/memory/stats");
    assert(refusedByMemoryRoute(anonymous), `${label}: anonymous is refused`);
  }
});

// ===========================================================================
// perUserAuth: true with a malformed user, query or manager
// ===========================================================================

await test("perUserAuth: a user whose roles is not an array is an ordinary user, not a server error", async () => {
  const MALLORY_SECRET = "MALLORY-OWN-CONVERSATION-4410";
  const guarded = new NeuroLink({
    conversationMemory: { enabled: true, enableSummarization: false },
  });
  await seed(guarded, "sess-alice", "alice", `remember ${ALICE_SECRET}`);
  await seed(guarded, "sess-mallory", "mallory", `remember ${MALLORY_SECRET}`);
  const app = await buildApp(guarded, "malformed-roles", SCOPED);

  // Precondition: the same user id with a real array of roles is an admin on
  // this server, so a refusal below is the malformed roles and nothing else.
  const admin = await call(
    app,
    "GET",
    "/api/memory/stats",
    "token-roles-array",
  );
  assertEqual(admin.status, 200, "an array of roles is honoured");

  for (const token of Object.keys(MALFORMED_ROLES)) {
    const stats = await call(app, "GET", "/api/memory/stats", token);
    assertEqual(stats.status, 403, `${token}: statistics refused`);
    const wipe = await call(app, "DELETE", "/api/memory/sessions", token);
    assertEqual(wipe.status, 403, `${token}: clear-all refused`);
    const other = await call(
      app,
      "GET",
      "/api/memory/sessions/sess-alice",
      token,
    );
    assertEqual(other.status, 404, `${token}: another user's session`);
    assert(!other.text.includes(ALICE_SECRET), `${token}: nothing leaks`);
    const own = await call(
      app,
      "GET",
      "/api/memory/sessions/sess-mallory",
      token,
    );
    assert(mayRead(own, MALLORY_SECRET), `${token}: their own session`);
  }
  const intact = await call(
    app,
    "GET",
    "/api/memory/sessions/sess-alice",
    "token-roles-array",
  );
  assert(
    mayRead(intact, ALICE_SECRET),
    "the refused clear-alls erased nothing",
  );
});

for (const framework of ["express", "fastify", "koa"] as const) {
  await test(`${framework}: a userId that is not a single string is refused with 400 under perUserAuth, for an admin too`, async () => {
    const guarded = new NeuroLink({
      conversationMemory: { enabled: true, enableSummarization: false },
    });
    await seed(guarded, "sess-alice", "alice", `remember ${ALICE_SECRET}`);
    await seed(guarded, "sess-bob", "bob", `remember ${BOB_SECRET}`);
    await withFramework(framework, guarded, "people", SCOPED, async (base) => {
      // Preconditions: this framework hands the handler an array for a repeated
      // parameter, and the same routes answer a single value, so the 400s below
      // are the array and not a route that never ran.
      const shape = await callHttp(
        base,
        "GET",
        "/api/echo-userid?userId=alice&userId=bob",
        "token-root",
      );
      assertEqual(dataOf(shape).isArray, true, "a repeated userId is an array");
      const named = await callHttp(
        base,
        "GET",
        "/api/memory/sessions?userId=alice",
        "token-root",
      );
      assertEqual(
        listedIds(named).join(","),
        "sess-alice",
        "an admin naming one user is served",
      );

      for (const token of ["token-bob", "token-root"]) {
        for (const [method, path] of [
          ["GET", "/api/memory/sessions?userId=alice&userId=bob"],
          ["GET", "/api/memory/sessions/sess-alice?userId=alice&userId=bob"],
          [
            "GET",
            "/api/memory/sessions/sess-alice/messages?userId=alice&userId=bob",
          ],
          ["DELETE", "/api/memory/sessions/sess-alice?userId=alice&userId=bob"],
        ] as const) {
          const reply = await callHttp(base, method, path, token);
          assertEqual(reply.status, 400, `${token}: ${method} refused`);
          assert(
            !reply.text.includes(ALICE_SECRET),
            `${token}: no content in the refusal`,
          );
        }
      }
      const intact = await callHttp(
        base,
        "GET",
        "/api/memory/sessions/sess-alice",
        "token-alice",
      );
      assert(
        mayRead(intact, ALICE_SECRET),
        "the refused DELETEs erased nothing",
      );
    });
  });
}

await test("default: a repeated userId is passed on as before, not refused", async () => {
  const open = new NeuroLink({
    conversationMemory: { enabled: true, enableSummarization: false },
  });
  await seed(open, "sess-open", "alice", `remember ${ALICE_SECRET}`);
  await withFramework("express", open, "shared-key", {}, async (base) => {
    const shape = await callHttp(
      base,
      "GET",
      "/api/echo-userid?userId=alice&userId=bob",
      SHARED_KEY,
    );
    assertEqual(dataOf(shape).isArray, true, "the handler gets an array");
    const read = await callHttp(
      base,
      "GET",
      "/api/memory/sessions/sess-open?userId=alice&userId=bob",
      SHARED_KEY,
    );
    assert(
      mayRead(read, ALICE_SECRET),
      "the unscoped route does not refuse it",
    );
  });
});

await test("perUserAuth: a manager that cannot say who owns a session shows it to an admin only", async () => {
  const FAKE_SECRET = "FAKE-MANAGER-CONVERSATION-8806";
  const asked: string[] = [];
  // No shipped manager lacks getSession, so the fallback through
  // buildContextMessages is reachable only with a manager like this one.
  const manager = {
    buildContextMessages: async (sessionId: string) => {
      asked.push(sessionId);
      return [{ role: "user", content: FAKE_SECRET }];
    },
  };
  const nl = new NeuroLink();
  Object.defineProperty(nl, "conversationMemory", {
    value: manager,
    configurable: true,
    writable: true,
  });
  const scoped = await buildApp(nl, "people", SCOPED);
  const unscoped = await buildApp(nl, "people");
  const path = "/api/memory/sessions/fake-1/messages";

  // Preconditions: the fake manager is reached through the route, by an admin
  // and by anyone on an unscoped server, so the refusal below is the ownership
  // check and not a route that cannot see the manager.
  const admin = await call(scoped, "GET", path, "token-root");
  assert(mayRead(admin, FAKE_SECRET), "an admin reads through the fallback");
  const open = await call(unscoped, "GET", path, "token-bob");
  assert(mayRead(open, FAKE_SECRET), "an unscoped server reads as before");
  assertEqual(asked.length, 2, "the manager answered both");

  const refused = await call(scoped, "GET", path, "token-bob");
  assertEqual(refused.status, 404, "an ordinary user is told not found");
  assert(!refused.text.includes(FAKE_SECRET), "no content in the refusal");
  assertEqual(
    asked.length,
    2,
    "the manager was not asked on an ordinary user's behalf",
  );
});

await test("perUserAuth: a manager that can only report statistics shows an ordinary user an empty listing, not everyone's total", async () => {
  // The in-memory manager lists sessions; a manager with getStats alone cannot
  // say which sessions are the caller's. The statistics fallback used to answer
  // such a caller with the count of every user's sessions.
  const TOTAL = 7;
  let statsCalls = 0;
  const manager = {
    getStats: async () => {
      statsCalls += 1;
      return { totalSessions: TOTAL, totalTurns: 0 };
    },
  };
  const nl = new NeuroLink();
  Object.defineProperty(nl, "conversationMemory", {
    value: manager,
    configurable: true,
    writable: true,
  });
  const scoped = await buildApp(nl, "people", SCOPED);
  const unscoped = await buildApp(nl, "people");

  // Preconditions: the statistics fallback is reached through the route, by an
  // admin and by anyone on an unscoped server, so the empty answer below is the
  // guard and not a route that cannot see the manager.
  const admin = await call(scoped, "GET", "/api/memory/sessions", "token-root");
  assertEqual(dataOf(admin).total, TOTAL, "an admin gets the manager's total");
  const open = await call(unscoped, "GET", "/api/memory/sessions", "token-bob");
  assertEqual(
    dataOf(open).total,
    TOTAL,
    "an unscoped server answers as before",
  );
  assertEqual(statsCalls, 2, "the manager answered both");

  const bob = await call(scoped, "GET", "/api/memory/sessions", "token-bob");
  assertEqual(bob.status, 200, "an ordinary user is answered");
  assertEqual(listedIds(bob).length, 0, "with an empty list");
  assertEqual(dataOf(bob).total, 0, "and a total of 0, not everyone's");
  assertEqual(
    statsCalls,
    2,
    "the manager was not asked on an ordinary user's behalf",
  );
});

// ===========================================================================
// Default mode (perUserAuth unset): the routes are exactly what they were
// ===========================================================================

await test("default: with no authentication the routes behave as before", async () => {
  const open = new NeuroLink({
    conversationMemory: { enabled: true, enableSummarization: false },
  });
  await seed(open, "sess-open", "alice", `remember ${ALICE_SECRET}`);
  const app = await buildApp(open, "none");
  const read = await call(app, "GET", "/api/memory/sessions/sess-open");
  assert(mayRead(read, ALICE_SECRET), "no identity, no scoping: readable");
  const stats = await call(app, "GET", "/api/memory/stats");
  assertEqual(stats.status, 200, "statistics readable");
  const wipe = await call(app, "DELETE", "/api/memory/sessions");
  assertEqual(wipe.status, 200, "clear-all works as before");
});

await test("default: one shared API key reads, lists, erases and clears as before", async () => {
  const shared = new NeuroLink({
    conversationMemory: { enabled: true, enableSummarization: false },
  });
  await seed(shared, "sess-alice", "alice", `remember ${ALICE_SECRET}`);
  await seed(shared, "sess-bob", "bob", `remember ${BOB_SECRET}`);
  const app = await buildApp(shared, "shared-key");

  // Precondition: the shared key authenticates, so ctx.user is { id: "api-key" }
  // on every request below. The routes must not mistake that for a person.
  const probe = await call(app, "GET", "/api/memory/health", SHARED_KEY);
  assertEqual(probe.status, 200, "the shared key is accepted");

  const stats = await call(app, "GET", "/api/memory/stats", SHARED_KEY);
  assertEqual(stats.status, 200, "statistics are open to the shared key");

  const read = await call(
    app,
    "GET",
    "/api/memory/sessions/sess-alice",
    SHARED_KEY,
  );
  assert(mayRead(read, ALICE_SECRET), "any session is readable");
  const named = await call(
    app,
    "GET",
    "/api/memory/sessions/sess-alice?userId=alice",
    SHARED_KEY,
  );
  assert(mayRead(named, ALICE_SECRET), "?userId=alice is accepted");
  const messages = await call(
    app,
    "GET",
    "/api/memory/sessions/sess-bob/messages?userId=alice",
    SHARED_KEY,
  );
  assert(mayRead(messages, BOB_SECRET), "?userId= does not scope in-memory");

  // The in-memory listing has always been the statistics-backed placeholder: an
  // empty list and the manager's total, not a filtered view.
  const list = await call(app, "GET", "/api/memory/sessions", SHARED_KEY);
  assertEqual(list.status, 200, "listing answers");
  assertEqual(listedIds(list).length, 0, "the placeholder list is empty");
  assertEqual(dataOf(list).total, 2, "and its total counts every session");

  const erased = await call(
    app,
    "DELETE",
    "/api/memory/sessions/sess-bob",
    SHARED_KEY,
  );
  assertEqual(erased.status, 200, "any session can be erased");
  const wipe = await call(app, "DELETE", "/api/memory/sessions", SHARED_KEY);
  assertEqual(wipe.status, 200, "clear-all is open to the shared key");
  const gone = await call(
    app,
    "GET",
    "/api/memory/sessions/sess-alice",
    SHARED_KEY,
  );
  assertEqual(gone.status, 404, "everything is gone");
});

await test("default: a Hono request that sends its own X-Request-ID is no more scoped than one that does not", async () => {
  // The agent routes' default still trusts an authenticated ctx.user on that one
  // request, because Hono kept the middleware's context under the caller's
  // X-Request-ID before the adapters carried it. The memory routes never read
  // ctx.user without perUserAuth, so they have no such exception.
  const callerId = { "x-request-id": "caller-chosen-id" };
  const nl = new NeuroLink({
    conversationMemory: { enabled: true, enableSummarization: false },
  });
  await seed(nl, "sess-alice", "alice", `remember ${ALICE_SECRET}`);

  // Precondition: the same request is refused once the routes are scoped, so
  // the header is not what keeps bob out, and the probe can tell the two apart.
  const scoped = await buildApp(nl, "people", SCOPED);
  const refused = await call(
    scoped,
    "GET",
    "/api/memory/sessions/sess-alice",
    "token-bob",
    callerId,
  );
  assert(!mayRead(refused, ALICE_SECRET), "scoped: bob does not read alice's");
  const refusedStats = await call(
    scoped,
    "GET",
    "/api/memory/stats",
    "token-bob",
    callerId,
  );
  assertEqual(refusedStats.status, 403, "scoped: bob is no admin");

  const open = await buildApp(nl, "people");
  for (const headers of [{}, callerId]) {
    const label = Object.keys(headers).length > 0 ? "with" : "without";
    const read = await call(
      open,
      "GET",
      "/api/memory/sessions/sess-alice",
      "token-bob",
      headers,
    );
    assert(mayRead(read, ALICE_SECRET), `default ${label} X-Request-ID: open`);
    const stats = await call(
      open,
      "GET",
      "/api/memory/stats",
      "token-bob",
      headers,
    );
    assertEqual(stats.status, 200, `default ${label} X-Request-ID: stats open`);
  }
});

await test("one switch: perUserAuth given only inside the memory option does not scope the routes", async () => {
  // registerAllRoutes reads the top-level perUserAuth for every route group, so
  // a value inside `memory` (which the public type does not accept) changes
  // nothing. The control is the same server with the top-level switch.
  const nl = new NeuroLink({
    conversationMemory: { enabled: true, enableSummarization: false },
  });
  await seed(nl, "sess-alice", "alice", `remember ${ALICE_SECRET}`);
  const topLevel = await buildApp(nl, "people", { perUserAuth: true });
  const control = await call(
    topLevel,
    "GET",
    "/api/memory/sessions/sess-alice",
    "token-bob",
  );
  assert(
    !mayRead(control, ALICE_SECRET),
    "control: the top-level switch keeps bob out",
  );
  const nested = await buildApp(nl, "people", {
    memory: { perUserAuth: true },
  });
  const read = await call(
    nested,
    "GET",
    "/api/memory/sessions/sess-alice",
    "token-bob",
  );
  assert(mayRead(read, ALICE_SECRET), "the nested value scopes nothing");
  const stats = await call(nested, "GET", "/api/memory/stats", "token-bob");
  assertEqual(stats.status, 200, "statistics stay open");
});

await test("perUserAuth through createMemoryRoutes directly: scoped only on a server that carries middleware state", async () => {
  // registerAllRoutes turns carryMiddlewareState on when it is given
  // perUserAuth. A caller that registers the group itself gets no such help:
  // the adapter hands the handler a fresh context with no ctx.user, so every
  // request but health is refused as unauthenticated.
  const nl = new NeuroLink({
    conversationMemory: { enabled: true, enableSummarization: false },
  });
  await seed(nl, "sess-alice", "alice", `remember ${ALICE_SECRET}`);
  const direct = async (carry: boolean): Promise<HonoLike> => {
    const adapter = await createServer(nl, {
      framework: "hono",
      config: { port: 0, host: "127.0.0.1", carryMiddlewareState: carry },
    });
    addAuth(adapter, "people");
    await adapter.initialize();
    adapter.registerRouteGroup(
      createMemoryRoutes("/api", { perUserAuth: true }),
    );
    return adapter.getFrameworkInstance() as HonoLike;
  };

  const carrying = await direct(true);
  const own = await call(
    carrying,
    "GET",
    "/api/memory/sessions/sess-alice",
    "token-alice",
  );
  assert(mayRead(own, ALICE_SECRET), "carrying: the owner reads the session");
  const other = await call(
    carrying,
    "GET",
    "/api/memory/sessions/sess-alice",
    "token-bob",
  );
  assertEqual(other.status, 404, "carrying: another user's session");
  assert(!other.text.includes(ALICE_SECRET), "carrying: no content");

  const plain = await direct(false);
  for (const [method, path, label] of MEMORY_ROUTES) {
    const reply = await call(plain, method, path, "token-alice");
    assert(
      refusedByMemoryRoute(reply),
      `not carrying: ${label} sees no user, even an authenticated one`,
    );
    assert(!reply.text.includes(ALICE_SECRET), `not carrying: ${label} leaks`);
  }
  const health = await call(plain, "GET", "/api/memory/health", "token-alice");
  assertEqual(health.status, 200, "not carrying: health answers");
});

// ===========================================================================
// Redis manager (throwaway redis-server)
// ===========================================================================

const redisAvailable =
  spawnSync("redis-server", ["--version"], { stdio: "ignore" }).status === 0;

async function waitForPort(port: number): Promise<void> {
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    const up = await new Promise<boolean>((resolve) => {
      const socket = connect(port, "127.0.0.1", () => {
        socket.end();
        resolve(true);
      });
      socket.on("error", () => resolve(false));
    });
    if (up) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("redis-server did not start");
}

let redisProc: ChildProcess | undefined;
let redisCleanupInstalled = false;
let redisNl: NeuroLink | undefined;
let redisApp: HonoLike | undefined;

function stopRedis(): void {
  redisProc?.kill();
  redisProc = undefined;
}

/**
 * runSuite() ends the process with process.exit, so a `finally` after it never
 * runs and the server would outlive the suite; an exit handler does run. A
 * signal skips the exit handler unless something turns it into an exit, so
 * SIGINT and SIGTERM stop the server and then exit with the conventional code.
 */
function installRedisCleanup(): void {
  if (redisCleanupInstalled) {
    return;
  }
  redisCleanupInstalled = true;
  process.once("exit", stopRedis);
  for (const [signal, code] of [
    ["SIGINT", 130],
    ["SIGTERM", 143],
  ] as const) {
    process.once(signal, () => {
      stopRedis();
      process.exit(code);
    });
  }
}

async function redisFixture(): Promise<{ nl: NeuroLink; app: HonoLike }> {
  if (!redisAvailable) {
    throw new Skip("redis-server is not installed");
  }
  if (redisNl && redisApp) {
    return { nl: redisNl, app: redisApp };
  }
  installRedisCleanup();
  const port = await freePort();
  redisProc = spawn(
    "redis-server",
    [
      "--port",
      String(port),
      "--bind",
      "127.0.0.1",
      "--save",
      "",
      "--appendonly",
      "no",
    ],
    { stdio: "ignore" },
  );
  try {
    await waitForPort(port);
    const nl = new NeuroLink({
      conversationMemory: {
        enabled: true,
        enableSummarization: false,
        redisConfig: { host: "127.0.0.1", port, keyPrefix: "memscope:conv:" },
      },
    });
    await seed(nl, "r-alice", "alice", `remember ${ALICE_SECRET}`);
    await seed(nl, "r-bob", "bob", `remember ${BOB_SECRET}`);
    await seed(nl, "r-bob-2", "bob", "a second bob conversation");
    await seed(nl, "r-orphan", undefined, `remember ${ORPHAN_SECRET}`);
    await seed(nl, "r-orphan-2", undefined, `remember ${ORPHAN_SECRET}`);
    redisApp = await buildApp(nl, "people", SCOPED);
    redisNl = nl;
    return { nl, app: redisApp };
  } catch (error) {
    // A step failed after the server was started: do not leave it running, and
    // let the next case start from scratch.
    stopRedis();
    redisNl = undefined;
    redisApp = undefined;
    throw error;
  }
}

await test("redis: a user reads their own session without naming themselves in the query", async () => {
  const { app } = await redisFixture();
  const own = await call(
    app,
    "GET",
    "/api/memory/sessions/r-alice",
    "token-alice",
  );
  assert(mayRead(own, ALICE_SECRET), "alice reads her session");
  const messages = await call(
    app,
    "GET",
    "/api/memory/sessions/r-alice/messages",
    "token-alice",
  );
  assert(mayRead(messages, ALICE_SECRET), "alice reads her messages");
});

await test("redis: another user cannot read a session by naming its owner", async () => {
  const { app } = await redisFixture();
  for (const path of [
    "/api/memory/sessions/r-alice?userId=alice",
    "/api/memory/sessions/r-alice/messages?userId=alice",
    "/api/memory/sessions?userId=alice",
  ]) {
    const reply = await call(app, "GET", path, "token-bob");
    assertEqual(reply.status, 403, "impersonation refused");
    assert(!reply.text.includes(ALICE_SECRET), "no content in the refusal");
  }
  const plain = await call(
    app,
    "GET",
    "/api/memory/sessions/r-alice",
    "token-bob",
  );
  // Exactly 404, so an error reply cannot pass for "nothing leaked".
  assertEqual(plain.status, 404, "bob's own scope does not contain it");
  assert(!plain.text.includes(ALICE_SECRET), "no content in the refusal");
});

await test("redis: a user's listing holds their sessions only", async () => {
  const { app } = await redisFixture();
  const list = await call(app, "GET", "/api/memory/sessions", "token-alice");
  assertEqual(list.status, 200, "listing succeeds");
  assert(list.text.includes("r-alice"), "alice sees her session");
  assert(!list.text.includes("r-bob"), "alice does not see bob's");
});

await test("redis default: one shared API key still names the user in ?userId= and erases as before", async () => {
  const { nl } = await redisFixture();
  const app = await buildApp(nl, "shared-key");

  const named = await call(
    app,
    "GET",
    "/api/memory/sessions/r-alice?userId=alice",
    SHARED_KEY,
  );
  assert(mayRead(named, ALICE_SECRET), "?userId=alice reads alice's session");
  const listed = await call(
    app,
    "GET",
    "/api/memory/sessions?userId=bob",
    SHARED_KEY,
  );
  assert(listed.text.includes("r-bob"), "?userId=bob lists bob's sessions");

  // DELETE passes no user to the manager here, as it always did, so it looks for
  // the user-less key and finds nothing under bob's. What matters is that the
  // route still does exactly this and does not start scoping to "api-key".
  const erase = await call(
    app,
    "DELETE",
    "/api/memory/sessions/r-bob",
    SHARED_KEY,
  );
  assertEqual(erase.status, 404, "no user is passed to clearSession");
  const intact = await call(
    app,
    "GET",
    "/api/memory/sessions/r-bob?userId=bob",
    SHARED_KEY,
  );
  assert(mayRead(intact, BOB_SECRET), "bob's session is still there");

  const stats = await call(app, "GET", "/api/memory/stats", SHARED_KEY);
  assertEqual(stats.status, 200, "statistics are open to the shared key");
});

await test("redis: an admin reaches another user's sessions by naming that user, and only then", async () => {
  const { app } = await redisFixture();

  const named = await call(
    app,
    "GET",
    "/api/memory/sessions/r-bob?userId=bob",
    "token-root",
  );
  assert(mayRead(named, BOB_SECRET), "naming bob reaches bob's session");
  const listed = await call(
    app,
    "GET",
    "/api/memory/sessions?userId=bob",
    "token-root",
  );
  assert(
    listed.text.includes("r-bob") && listed.text.includes("r-bob-2"),
    "naming bob lists bob's sessions",
  );
  assert(!listed.text.includes("r-alice"), "and only bob's");

  // Without a name the admin is scoped to themselves: Redis keys sessions by
  // user, so there is no key to look bob's session up under.
  const unnamed = await call(
    app,
    "GET",
    "/api/memory/sessions/r-bob",
    "token-root",
  );
  assertEqual(
    unnamed.status,
    404,
    "without a name, bob's session is not found",
  );
  const own = await call(app, "GET", "/api/memory/sessions", "token-root");
  assert(!own.text.includes("r-bob"), "an unnamed listing is the admin's own");

  const erased = await call(
    app,
    "DELETE",
    "/api/memory/sessions/r-bob-2?userId=bob",
    "token-root",
  );
  assertEqual(erased.status, 200, "naming bob erases bob's session");
  const gone = await call(
    app,
    "GET",
    "/api/memory/sessions/r-bob-2",
    "token-bob",
  );
  assertEqual(gone.status, 404, "it is gone for bob");
  const kept = await call(
    app,
    "GET",
    "/api/memory/sessions/r-bob",
    "token-bob",
  );
  assert(mayRead(kept, BOB_SECRET), "bob's other session is untouched");
});

await test("redis: a session created without a user is the session of a user named session-only, and nobody else's", async () => {
  const { nl, app } = await redisFixture();

  // Precondition: the session exists, under the key a user-less write uses.
  const stored = await nl.conversationMemory?.getSession("r-orphan");
  assert(stored !== undefined, "the unowned session was stored");

  // The only name that reaches it is the one its key is built from: an admin may
  // name any user, and an ordinary user whose own id is that name is that user.
  for (const [token, query, label] of [
    ["token-root", "?userId=session-only", "an admin naming session-only"],
    ["token-session-only", "", "a user whose id is session-only"],
  ] as const) {
    const session = await call(
      app,
      "GET",
      `/api/memory/sessions/r-orphan${query}`,
      token,
    );
    assert(mayRead(session, ORPHAN_SECRET), `${label} reads it`);
    const messages = await call(
      app,
      "GET",
      `/api/memory/sessions/r-orphan/messages${query}`,
      token,
    );
    assert(mayRead(messages, ORPHAN_SECRET), `${label} reads its messages`);
  }

  // Every other way of asking is a miss, an admin's included.
  for (const [token, query, label] of [
    ["token-root", "", "an admin naming no one"],
    ["token-root", "?userId=root", "an admin naming themselves"],
    ["token-root", "?userId=default", "an admin naming default"],
    ["token-bob", "", "an ordinary user"],
  ] as const) {
    const reply = await call(
      app,
      "GET",
      `/api/memory/sessions/r-orphan${query}`,
      token,
    );
    assertEqual(reply.status, 404, `${label} does not find it`);
    assert(!reply.text.includes(ORPHAN_SECRET), `${label}: no content`);
  }

  // Deleting follows the same key.
  const erased = await call(
    app,
    "DELETE",
    "/api/memory/sessions/r-orphan-2?userId=session-only",
    "token-root",
  );
  assertEqual(erased.status, 200, "naming session-only erases it");
  const gone = await call(
    app,
    "GET",
    "/api/memory/sessions/r-orphan-2?userId=session-only",
    "token-root",
  );
  assertEqual(gone.status, 404, "it is gone");
  const kept = await call(
    app,
    "GET",
    "/api/memory/sessions/r-orphan?userId=session-only",
    "token-root",
  );
  assert(
    mayRead(kept, ORPHAN_SECRET),
    "the other unowned session is untouched",
  );

  const wipe = await call(app, "DELETE", "/api/memory/sessions", "token-root");
  assertEqual(wipe.status, 200, "an admin clears everything");
  const after = await nl.conversationMemory?.getSession("r-orphan");
  assert(after === undefined, "clear-all removed the unowned session");
});

await test("redis: the key joins user and session with an unescaped colon, so user a reaches user a:b's session c as b:c", async () => {
  const { nl, app } = await redisFixture();
  // User "a:b" with session "c" and user "a" with session "b:c" are one key.
  await seed(nl, "c", "a:b", `remember ${NAMESPACED_SECRET}`);

  // Precondition: the owner reads it, and the plain id "c" is a miss for "a",
  // so the read below is the colliding id and not a session "a" can see anyway.
  const owner = await call(app, "GET", "/api/memory/sessions/c", "token-a-b");
  assert(mayRead(owner, NAMESPACED_SECRET), "the owner reads it");
  const plain = await call(app, "GET", "/api/memory/sessions/c", "token-a");
  assertEqual(plain.status, 404, "user a does not find session c");

  const collided = await call(
    app,
    "GET",
    "/api/memory/sessions/b%3Ac",
    "token-a",
  );
  assert(
    mayRead(collided, NAMESPACED_SECRET),
    "user a reads user a:b's session through the colliding id",
  );
  const erased = await call(
    app,
    "DELETE",
    "/api/memory/sessions/b%3Ac",
    "token-a",
  );
  assertEqual(erased.status, 200, "and erases it");
  const gone = await call(app, "GET", "/api/memory/sessions/c", "token-a-b");
  assertEqual(gone.status, 404, "the owner's session is gone");
});

await test("redis: erasing is scoped to the caller, and clear-all needs an admin", async () => {
  // The previous case wiped the store, so seed what this one needs.
  const { nl, app } = await redisFixture();
  await seed(nl, "r-alice", "alice", `remember ${ALICE_SECRET}`);
  const attempt = await call(
    app,
    "DELETE",
    "/api/memory/sessions/r-alice",
    "token-bob",
  );
  // Bob's scope is bob:r-alice, which holds nothing, so exactly 404.
  assertEqual(attempt.status, 404, "bob cannot erase alice's session");
  const named = await call(
    app,
    "DELETE",
    "/api/memory/sessions/r-alice?userId=alice",
    "token-bob",
  );
  assertEqual(named.status, 403, "naming alice is refused, not honoured");
  const intact = await call(
    app,
    "GET",
    "/api/memory/sessions/r-alice",
    "token-alice",
  );
  assert(mayRead(intact, ALICE_SECRET), "alice's session survived");
  const wipe = await call(app, "DELETE", "/api/memory/sessions", "token-bob");
  assertEqual(wipe.status, 403, "clear-all refused");
  const own = await call(
    app,
    "DELETE",
    "/api/memory/sessions/r-alice",
    "token-alice",
  );
  assertEqual(own.status, 200, "alice erases her own");
  const gone = await call(
    app,
    "GET",
    "/api/memory/sessions/r-alice",
    "token-alice",
  );
  assertEqual(gone.status, 404, "it is gone");
});

await runSuite();
