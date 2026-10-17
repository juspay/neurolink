#!/usr/bin/env tsx
/**
 * Continuous Test Suite: `createSessionMiddleware`, end to end.
 *
 * The agent routes ignore a body `sessionId` for an authenticated request (a
 * caller must not be able to name another user's session) and take
 * `ctx.session.id` instead, but nothing set it, so an authenticated client had
 * no conversation memory through those routes. The session middleware sets it
 * from a header (or an opt-in cookie) and prefixes the authenticated user's id,
 * because the in-memory conversation manager keys sessions by id alone.
 *
 * Every case drives a surface this package ships (CLAUDE.md rule 15): the public
 * `createServer`, `createAuthMiddleware`, `createSessionMiddleware` and
 * `registerAllRoutes` from `../dist/index.js`.
 *
 *   - Id handling runs on all four frameworks, each started on a free loopback
 *     port and called over real HTTP.
 *   - Conversation continuity and isolation run through `POST /api/agent/execute`
 *     on an in-process Hono adapter with OpenAI behind `installMockFetch` and a
 *     fake key: whether a second turn carries the first turn's text is read from
 *     what the provider was actually sent.
 *
 * A control case shows the isolation probe can fail: a bare middleware that
 * does not prefix the user lets two users share one conversation.
 *
 * Run: pnpm exec tsx test/continuous-test-suite-session-middleware.ts
 */
import { createServer as createTcpServer } from "node:net";
import type { AddressInfo } from "node:net";
import { assert, assertEqual, defineSuite, Skip } from "./helpers/harness.js";
import { installMockFetch } from "./utils/mockFetch.js";
import {
  MissingDependencyError,
  NeuroLink,
  createAuthMiddleware,
  createServer,
  createSessionMiddleware,
  registerAllRoutes,
} from "../dist/index.js";

const { test, runSuite } = defineSuite("Session middleware", {
  offline: true,
});

const FRAMEWORKS = ["hono", "express", "fastify", "koa"] as const;
type Framework = (typeof FRAMEWORKS)[number];

const USERS: Record<string, { id: string; roles: string[] }> = {
  "token-bob": { id: "bob", roles: ["user"] },
  "token-carol": { id: "carol", roles: ["user"] },
};

type Running = { base: string; stop: () => Promise<void> };

async function freePort(): Promise<number> {
  const server = createTcpServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as AddressInfo).port;
  await new Promise<void>((resolve) => server.close(() => resolve()));
  return port;
}

async function start(framework: Framework): Promise<Running> {
  const port = await freePort();
  const adapter = await createServer(new NeuroLink(), {
    framework,
    config: { port, host: "127.0.0.1" },
  });
  adapter.registerMiddleware(
    createAuthMiddleware({
      type: "bearer",
      validate: async (token: string) => USERS[token] ?? null,
      skipDevPlayground: false,
    }),
  );
  adapter.registerMiddleware(createSessionMiddleware({ cookieName: "sid" }));
  adapter.registerRoute({
    method: "GET",
    path: "/api/session-echo",
    handler: async (ctx) => ({ session: ctx.session?.id ?? null }),
  });
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

async function echo(
  framework: Framework,
  token: string,
  headers: Record<string, string>,
): Promise<{ status: number; session: string | null }> {
  const { base } = await running(framework);
  const res = await fetch(`${base}/api/session-echo`, {
    headers: { authorization: `Bearer ${token}`, ...headers },
  });
  const text = await res.text();
  try {
    const body = JSON.parse(text) as { data?: { session: string | null } };
    return { status: res.status, session: body.data?.session ?? null };
  } catch {
    return { status: res.status, session: null };
  }
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

  await test(`${framework}: an id that is not a plain token is refused with 400`, async () => {
    for (const bad of [
      "a:b",
      "has space",
      "../x",
      "x".repeat(129),
      "-leading",
    ]) {
      const reply = await echo(framework, "token-bob", { "x-session-id": bad });
      assertEqual(reply.status, 400, "malformed session id refused");
    }
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
}

// ===========================================================================
// Conversation continuity and isolation through the agent routes
// ===========================================================================

type HonoLike = {
  request: (path: string, init?: RequestInit) => Promise<Response>;
};

async function agentApp(withPrefix: boolean): Promise<HonoLike> {
  const nl = new NeuroLink({
    conversationMemory: { enabled: true, enableSummarization: false },
  });
  const adapter = await createServer(nl, {
    framework: "hono",
    config: { port: 0, host: "127.0.0.1" },
  });
  adapter.registerMiddleware(
    createAuthMiddleware({
      type: "bearer",
      validate: async (token: string) => USERS[token] ?? null,
      skipDevPlayground: false,
    }),
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
  registerAllRoutes(adapter, "/api");
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

/** Run `fn` with a mocked OpenAI; `lastRequest()` is what the provider got last. */
async function withMockedProvider<T>(
  fn: (lastRequest: () => string) => Promise<T>,
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
    return await fn(() => calls[calls.length - 1]?.bodyText ?? "");
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

async function say(
  app: HonoLike,
  token: string,
  text: string,
  sessionId?: string,
): Promise<number> {
  const res = await app.request("/api/agent/execute", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
      ...(sessionId ? { "x-session-id": sessionId } : {}),
    },
    body: JSON.stringify({
      input: text,
      provider: "openai",
      model: "gpt-4o-mini",
    }),
  });
  await res.text();
  return res.status;
}

await test("an authenticated user's second turn carries the first turn's history", async () => {
  const app = await agentApp(true);
  await withMockedProvider(async (lastRequest) => {
    assertEqual(
      await say(app, "token-bob", "remember BOB-FIRST-7301", "chat-1"),
      200,
      "first turn",
    );
    assertEqual(
      await say(app, "token-bob", "what did I say", "chat-1"),
      200,
      "second turn",
    );
    assert(
      lastRequest().includes("BOB-FIRST-7301"),
      "the provider received the earlier turn",
    );
  });
});

await test("another user sending the same session id does not see that history", async () => {
  const app = await agentApp(true);
  await withMockedProvider(async (lastRequest) => {
    await say(app, "token-bob", "remember BOB-SECRET-8842", "chat-1");
    assertEqual(
      await say(app, "token-carol", "what was said before", "chat-1"),
      200,
      "carol's turn",
    );
    assert(
      !lastRequest().includes("BOB-SECRET-8842"),
      "carol's request carries nothing of bob's conversation",
    );
  });
});

await test("a request with no session id starts fresh each time", async () => {
  const app = await agentApp(true);
  await withMockedProvider(async (lastRequest) => {
    await say(app, "token-bob", "remember BOB-NOSESSION-1190");
    await say(app, "token-bob", "what did I say");
    assert(
      !lastRequest().includes("BOB-NOSESSION-1190"),
      "no session, no history",
    );
  });
});

await test("control: without the user prefix, two users share one conversation", async () => {
  const app = await agentApp(false);
  await withMockedProvider(async (lastRequest) => {
    await say(app, "token-bob", "remember BOB-LEAK-5563", "chat-1");
    await say(app, "token-carol", "what was said before", "chat-1");
    assert(
      lastRequest().includes("BOB-LEAK-5563"),
      "the probe does see history that leaks, so the isolation case above is a real negative",
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
