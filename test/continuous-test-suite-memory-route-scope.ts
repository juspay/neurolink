#!/usr/bin/env tsx
/**
 * Continuous Test Suite: the memory routes are scoped to the authenticated user.
 *
 * `/api/memory/*` used to take the user from `?userId=` and never look at the
 * authenticated one, and `DELETE /api/memory/sessions` cleared every user's
 * sessions for any caller. With per-user authentication on, one user could read
 * and erase another's conversations.
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
 * by user; those cases run against a throwaway `redis-server` this suite starts
 * on a free port, and skip when the binary is not installed.
 *
 * A server with no per-user identity (no auth) must behave exactly as before;
 * a case pins that.
 *
 * Run: pnpm exec tsx test/continuous-test-suite-memory-route-scope.ts
 */
import { spawn, spawnSync } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { createServer as createTcpServer, connect } from "node:net";
import type { AddressInfo } from "node:net";
import { assert, assertEqual, defineSuite, Skip } from "./helpers/harness.js";
import { installMockFetch } from "./utils/mockFetch.js";
import {
  NeuroLink,
  createAuthMiddleware,
  createServer,
  registerAllRoutes,
} from "../dist/index.js";

const { test, runSuite } = defineSuite("Memory routes: per-user scope", {
  offline: true,
});

const ALICE_SECRET = "ALICE-SECRET-CONVERSATION-9931";
const BOB_SECRET = "BOB-SECRET-CONVERSATION-5527";

const USERS: Record<string, { id: string; roles: string[] }> = {
  "token-alice": { id: "alice", roles: ["user"] },
  "token-bob": { id: "bob", roles: ["user"] },
  "token-root": { id: "root", roles: ["admin"] },
};

type HonoLike = {
  request: (path: string, init?: RequestInit) => Promise<Response>;
};
type Reply = { status: number; text: string };

async function buildApp(
  nl: NeuroLink,
  withAuth: boolean,
  memory?: { adminRoles?: string[] },
): Promise<HonoLike> {
  const adapter = await createServer(nl, {
    framework: "hono",
    config: { port: 0, host: "127.0.0.1" },
  });
  if (withAuth) {
    adapter.registerMiddleware(
      createAuthMiddleware({
        type: "bearer",
        validate: async (token: string) => USERS[token] ?? null,
        skipDevPlayground: false,
      }),
    );
  }
  await adapter.initialize();
  registerAllRoutes(adapter, "/api", memory ? { memory } : undefined);
  return adapter.getFrameworkInstance() as HonoLike;
}

async function call(
  app: HonoLike,
  method: "GET" | "DELETE",
  path: string,
  token?: string,
): Promise<Reply> {
  const res = await app.request(path, {
    method,
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
  return { status: res.status, text: await res.text() };
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
// In-memory manager
// ===========================================================================

const mem = new NeuroLink({
  conversationMemory: { enabled: true, enableSummarization: false },
});
await seed(mem, "sess-alice", "alice", `remember ${ALICE_SECRET}`);
await seed(mem, "sess-bob", "bob", `remember ${BOB_SECRET}`);
await seed(mem, "sess-orphan", undefined, "an unowned conversation");
const authed = await buildApp(mem, true);

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
  assert(
    !list.text.includes("sess-bob"),
    "alice's listing omits bob's session",
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
  const custom = await buildApp(mem, true, { adminRoles: ["user"] });
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

await test("a server with no per-user authentication behaves as before", async () => {
  const open = new NeuroLink({
    conversationMemory: { enabled: true, enableSummarization: false },
  });
  await seed(open, "sess-open", "alice", `remember ${ALICE_SECRET}`);
  const app = await buildApp(open, false);
  const read = await call(app, "GET", "/api/memory/sessions/sess-open");
  assert(mayRead(read, ALICE_SECRET), "no identity, no scoping: readable");
  const stats = await call(app, "GET", "/api/memory/stats");
  assertEqual(stats.status, 200, "statistics readable");
  const wipe = await call(app, "DELETE", "/api/memory/sessions");
  assertEqual(wipe.status, 200, "clear-all works as before");
});

// ===========================================================================
// Redis manager (throwaway redis-server)
// ===========================================================================

const redisAvailable =
  spawnSync("redis-server", ["--version"], { stdio: "ignore" }).status === 0;

async function freePort(): Promise<number> {
  const server = createTcpServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as AddressInfo).port;
  await new Promise<void>((resolve) => server.close(() => resolve()));
  return port;
}

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
let redisNl: NeuroLink | undefined;
let redisApp: HonoLike | undefined;

async function redisFixture(): Promise<{ nl: NeuroLink; app: HonoLike }> {
  if (!redisAvailable) {
    throw new Skip("redis-server is not installed");
  }
  if (redisNl && redisApp) {
    return { nl: redisNl, app: redisApp };
  }
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
  // runSuite() ends the process with process.exit, so a `finally` after it never
  // runs and the server would outlive the suite. An exit handler does run.
  process.once("exit", () => {
    redisProc?.kill();
  });
  await waitForPort(port);
  redisNl = new NeuroLink({
    conversationMemory: {
      enabled: true,
      enableSummarization: false,
      redisConfig: { host: "127.0.0.1", port, keyPrefix: "memscope:conv:" },
    },
  });
  await seed(redisNl, "r-alice", "alice", `remember ${ALICE_SECRET}`);
  await seed(redisNl, "r-bob", "bob", `remember ${BOB_SECRET}`);
  redisApp = await buildApp(redisNl, true);
  return { nl: redisNl, app: redisApp };
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
  assert(
    !plain.text.includes(ALICE_SECRET),
    "bob's own scope does not contain it",
  );
});

await test("redis: a user's listing holds their sessions only", async () => {
  const { app } = await redisFixture();
  const list = await call(app, "GET", "/api/memory/sessions", "token-alice");
  assertEqual(list.status, 200, "listing succeeds");
  assert(list.text.includes("r-alice"), "alice sees her session");
  assert(!list.text.includes("r-bob"), "alice does not see bob's");
});

await test("redis: erasing is scoped to the caller, and clear-all needs an admin", async () => {
  const { app } = await redisFixture();
  const attempt = await call(
    app,
    "DELETE",
    "/api/memory/sessions/r-alice",
    "token-bob",
  );
  assert(attempt.status !== 200, "bob cannot erase alice's session");
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
