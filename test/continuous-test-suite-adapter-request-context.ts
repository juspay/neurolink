#!/usr/bin/env tsx
/**
 * Continuous Test Suite: every server adapter hands middleware's context to the
 * route handler.
 *
 * Authentication middleware sets `ctx.user`, and the route handler must see it.
 * Each adapter builds a fresh context for every middleware step and for the
 * handler, so what middleware sets has to be carried between them. None of the
 * adapters carried it: an authenticated `ctx.user` read as undefined in the
 * handler on Express, Fastify and Koa, and on Hono unless the caller happened to
 * send `X-Request-ID` (the adapter drew a fresh random id at each step, so
 * middleware and handler never found each other's context). Every check that
 * relied on `ctx.user` in a route (the agent routes' impersonation guard, role
 * checks, per-user scoping) was inert. Hono's handler also read empty path
 * parameters whenever it did share the context.
 *
 * Every case drives a surface this package ships (CLAUDE.md rule 15): the public
 * `createServer` and `createAuthMiddleware` from `../dist/index.js`, each
 * framework started on a free loopback port and called over real HTTP. A
 * framework that is not installed is skipped.
 *
 * Run: pnpm exec tsx test/continuous-test-suite-adapter-request-context.ts
 */
import { createServer as createTcpServer } from "node:net";
import type { AddressInfo } from "node:net";
import { assert, assertEqual, defineSuite, Skip } from "./helpers/harness.js";
import {
  MissingDependencyError,
  NeuroLink,
  createAuthMiddleware,
  createServer,
} from "../dist/index.js";

const { test, runSuite } = defineSuite("Server adapters: request context", {
  offline: true,
});

const FRAMEWORKS = ["hono", "express", "fastify", "koa"] as const;
type Framework = (typeof FRAMEWORKS)[number];

type WhoAmI = { user: string | null; seenByLaterMiddleware: string | null };
type Echo = { name: string | null; user: string | null };
type Running = { base: string; stop: () => Promise<void> };

const USERS: Record<string, { id: string; roles: string[] }> = {
  "token-bob": { id: "bob", roles: ["user"] },
  "token-carol": { id: "carol", roles: ["user"] },
};

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
  // A second middleware, after authentication: it must see the first one's state.
  adapter.registerMiddleware({
    name: "records-what-it-saw",
    order: 20,
    handler: async (ctx, next) => {
      ctx.metadata = { ...ctx.metadata, sawUser: ctx.user?.id ?? null };
      return next();
    },
  });
  adapter.registerRoute({
    method: "GET",
    path: "/api/whoami",
    handler: async (ctx): Promise<WhoAmI> => ({
      user: ctx.user?.id ?? null,
      seenByLaterMiddleware:
        typeof ctx.metadata?.sawUser === "string" ? ctx.metadata.sawUser : null,
    }),
  });
  adapter.registerRoute({
    method: "GET",
    path: "/api/echo/:name",
    handler: async (ctx): Promise<Echo> => ({
      name: ctx.params.name ?? null,
      user: ctx.user?.id ?? null,
    }),
  });
  adapter.registerRoute({
    method: "GET",
    path: "/api/slow-whoami",
    handler: async (ctx): Promise<WhoAmI> => {
      // Read the user only after the other request has had time to arrive.
      await new Promise((resolve) => setTimeout(resolve, 150));
      return {
        user: ctx.user?.id ?? null,
        seenByLaterMiddleware:
          typeof ctx.metadata?.sawUser === "string"
            ? ctx.metadata.sawUser
            : null,
      };
    },
  });
  await adapter.initialize();
  await adapter.start();
  return {
    base: `http://127.0.0.1:${port}`,
    stop: () => adapter.stop(),
  };
}

const servers = new Map<Framework, Promise<Running>>();
function running(framework: Framework): Promise<Running> {
  let pending = servers.get(framework);
  if (!pending) {
    pending = start(framework);
    servers.set(framework, pending);
  }
  return pending.catch((error: unknown) => {
    // Skip only when the optional framework package is not installed. Any other
    // failure to create, initialise or start an adapter is the regression this
    // suite exists to catch, and a skip would let the run print PASS.
    if (error instanceof MissingDependencyError) {
      throw new Skip(`${framework} is not installed here`);
    }
    throw error;
  });
}

async function get<T>(
  framework: Framework,
  path: string,
  token: string | undefined,
  headers: Record<string, string> = {},
): Promise<{ status: number; data: T | null }> {
  const { base } = await running(framework);
  const res = await fetch(`${base}${path}`, {
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });
  const text = await res.text();
  try {
    const body = JSON.parse(text) as { data?: T };
    return { status: res.status, data: body.data ?? null };
  } catch {
    return { status: res.status, data: null };
  }
}

for (const framework of FRAMEWORKS) {
  await test(`${framework}: an authenticated user reaches the route handler with no X-Request-ID header`, async () => {
    const { status, data } = await get<WhoAmI>(
      framework,
      "/api/whoami",
      "token-bob",
    );
    assertEqual(status, 200, "authenticated request served");
    assertEqual(data?.user, "bob", "the handler sees the authenticated user");
  });

  await test(`${framework}: a later middleware sees what an earlier one set`, async () => {
    const { data } = await get<WhoAmI>(framework, "/api/whoami", "token-bob");
    assertEqual(
      data?.seenByLaterMiddleware,
      "bob",
      "the second middleware shares the first one's state",
    );
  });

  await test(`${framework}: the same holds when the caller sends an X-Request-ID header`, async () => {
    const { data } = await get<WhoAmI>(framework, "/api/whoami", "token-bob", {
      "x-request-id": "caller-chosen-id",
    });
    assertEqual(data?.user, "bob", "the handler sees the authenticated user");
    assertEqual(
      data?.seenByLaterMiddleware,
      "bob",
      "and so does the second middleware",
    );
  });

  await test(`${framework}: a path parameter reaches the handler alongside the user, with and without X-Request-ID`, async () => {
    const variants: Array<Record<string, string>> = [
      {},
      { "x-request-id": "another-id" },
    ];
    for (const headers of variants) {
      const { status, data } = await get<Echo>(
        framework,
        "/api/echo/widget",
        "token-bob",
        headers,
      );
      assertEqual(status, 200, "a route with a path parameter is served");
      assertEqual(data?.name, "widget", "the path parameter is present");
      assertEqual(data?.user, "bob", "and so is the user");
    }
  });

  await test(`${framework}: concurrent requests do not see each other's user`, async () => {
    const results = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        get<WhoAmI>(
          framework,
          "/api/whoami",
          i % 2 === 0 ? "token-bob" : "token-carol",
        ).then((r) => r.data?.user ?? null),
      ),
    );
    assert(
      results.every((user, i) => user === (i % 2 === 0 ? "bob" : "carol")),
      "every response carries its own caller's user",
    );
  });

  await test(`${framework}: overlapping requests that send the same X-Request-ID keep their own users`, async () => {
    const first = get<WhoAmI>(framework, "/api/slow-whoami", "token-bob", {
      "x-request-id": "shared-by-two-callers",
    });
    // Handled here so a rejection during the wait is not unhandled; Promise.all
    // below still reports it.
    first.catch(() => undefined);
    // Arrives while the first is still inside its handler.
    await new Promise((resolve) => setTimeout(resolve, 40));
    const second = get<WhoAmI>(framework, "/api/slow-whoami", "token-carol", {
      "x-request-id": "shared-by-two-callers",
    });
    const [a, b] = await Promise.all([first, second]);
    assertEqual(a.status, 200, "first request served");
    assertEqual(b.status, 200, "second request served");
    assertEqual(a.data?.user, "bob", "the first caller still sees itself");
    assertEqual(b.data?.user, "carol", "the second caller sees itself");
  });

  await test(`${framework}: a request with no credentials is still refused`, async () => {
    const { status } = await get<WhoAmI>(framework, "/api/whoami", undefined);
    assertEqual(status, 401, "authentication still required");
  });
}

try {
  await runSuite();
} finally {
  for (const pending of servers.values()) {
    await pending.then((s) => s.stop()).catch(() => undefined);
  }
}
