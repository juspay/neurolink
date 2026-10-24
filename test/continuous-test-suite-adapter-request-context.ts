#!/usr/bin/env tsx
/**
 * Continuous Test Suite: every server adapter hands middleware's context to the
 * route handler, and the agent routes decide whose identity to trust.
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
 * Once the handler sees `ctx.user`, whose identity the agent routes trust is a
 * separate question. One shared API key (`neurolink serve` with
 * `NEUROLINK_SERVER_API_KEY`) sets the same `ctx.user` for every caller, so
 * taking it as the user gives every client one userId and no conversation
 * memory. The routes therefore resolve identity as they did before the adapters
 * carried `ctx.user`, unless the server opts in with `perUserAuth: true`:
 *   - default: `userId` and `sessionId` come from the body, `ctx.user` and
 *     `ctx.session` are ignored. The built-in adapters mark the contexts that
 *     received the new carry. The exceptions are the contexts that did not:
 *     Hono when the caller sent its own `X-Request-ID`, which reached the
 *     handler with the middleware's context all along, a custom adapter that
 *     sets `ctx.user` itself, and a handler called directly with a context the
 *     caller built. There an authenticated `ctx.user` wins over the body.
 *   - `perUserAuth: true`: identity comes only from `ctx.user` / `ctx.session`,
 *     on every adapter and for every request, including a request with no
 *     authenticated user under optional authentication (no session either) and
 *     a JavaScript caller that passes a truthy non-boolean.
 *
 * Without `perUserAuth` a signed-in person can name another user's `userId` in
 * the body, so the routes log one warning, once per server, the first time a
 * request served from the body does that. `ctx.user.shared` marks an identity
 * that stands for every holder of one credential (a shared API key), which is
 * the normal case there and stays quiet, and so does a request where `ctx.user`
 * already won (Hono with `X-Request-ID`, a direct handler call). The warning goes through
 * `logger.alwaysStderr`: `logger.warn` is dropped unless debug logging is on, so
 * it would never reach the operator it is for. The suite reads it off
 * `console.error`, the one place that call writes.
 *
 * The shutdown drain counts in-flight requests by a connection record. Hono and
 * Fastify once named that record after the request id, which a caller can
 * repeat through `X-Request-ID`, so the first of two overlapping requests to
 * finish untracked the other; the "connection records" section covers both.
 *
 * Every case drives a surface this package ships (CLAUDE.md rule 15): the public
 * `createServer`, `createAuthMiddleware` and `registerAllRoutes` from
 * `../dist/index.js`. The adapter cases start each framework on a free loopback
 * port and call it over real HTTP; the agent-route cases call the in-process
 * Hono app, or a real server for another framework, with a stubbed `generate` /
 * `stream` on the NeuroLink instance, so no provider is contacted. A framework
 * that is not installed is skipped.
 *
 * Run: pnpm exec tsx test/continuous-test-suite-adapter-request-context.ts
 */
import { createServer as createTcpServer } from "node:net";
import type { AddressInfo } from "node:net";
import { assert, assertEqual, defineSuite, Skip } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";
import {
  MissingDependencyError,
  NeuroLink,
  createAgentRoutes,
  createAuthMiddleware,
  createRateLimitMiddleware,
  createRoleMiddleware,
  createServer,
  registerAllRoutes,
} from "../dist/index.js";

// Fail loudly rather than silently testing a stale build (see distFreshness.ts).
assertDistFresh();

// The tracked .mcp-config.json makes every NeuroLink instance spawn an npx MCP
// server on its first generate(); none of these cases uses a tool, so skip it.
process.env.NEUROLINK_SKIP_MCP = "true";
// The agent routes' warning has to reach the operator of a default server, so
// the suite reads it with debug logging off, whatever the caller's shell has.
delete process.env.NEUROLINK_DEBUG;

const { test, runSuite } = defineSuite("Server adapters: request context", {
  offline: true,
});

const FRAMEWORKS = ["hono", "express", "fastify", "koa"] as const;
type Framework = (typeof FRAMEWORKS)[number];

type WhoAmI = { user: string | null; seenByLaterMiddleware: string | null };
type Echo = { name: string | null; user: string | null };
type Latched = WhoAmI & { position: number; arrivalsWhenRead: number };
type CarriedState = {
  sessionId: string | null;
  hasSignal: boolean;
  hasController: boolean;
  issuedByMiddleware: boolean;
  paired: boolean;
  listenerFired: boolean;
  aborted: boolean;
};
type Held = { position: number; user: string | null };
type Running = {
  base: string;
  latch: Latch;
  holds: Holds;
  /** The adapter's own count of in-flight requests (the shutdown drain's view). */
  activeConnections: () => number;
  stop: () => Promise<void>;
};

/**
 * Lets the first request into `/api/latched-whoami` hold its handler open until
 * a second request has entered its own, so overlap is a fact the handler waited
 * for rather than a delay the test hoped was long enough.
 */
type Latch = {
  /** Arrival order of the request entering the handler, starting at 1. */
  enter: () => number;
  arrivals: () => number;
  firstEntered: Promise<void>;
  secondEntered: Promise<void>;
};

const LATCH_WAIT_MS = 10_000;

function createLatch(): Latch {
  let arrivals = 0;
  let markFirst: () => void = () => undefined;
  let markSecond: () => void = () => undefined;
  const firstEntered = new Promise<void>((resolve) => {
    markFirst = resolve;
  });
  const secondEntered = new Promise<void>((resolve) => {
    markSecond = resolve;
  });
  return {
    enter: () => {
      arrivals += 1;
      if (arrivals === 1) {
        markFirst();
      }
      if (arrivals === 2) {
        markSecond();
      }
      return arrivals;
    },
    arrivals: () => arrivals,
    firstEntered,
    secondEntered,
  };
}

/** Rejects, rather than hangs, when `promise` does not settle in `ms`. */
async function within<T>(
  promise: Promise<T>,
  ms: number,
  what: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`gave up waiting for ${what}`)),
      ms,
    );
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

type Deferred = { promise: Promise<void>; resolve: () => void };

function deferred(): Deferred {
  let resolve: () => void = () => undefined;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

/**
 * Parks each request to `/api/held/:key` in its handler until the test lets it
 * go, so a test decides which of several overlapping requests finishes first.
 * Requests under one key are numbered in the order they reach the handler.
 */
type Holds = {
  /** Handler side: record the arrival, wait to be released, return the position. */
  park: (key: string) => Promise<number>;
  /** Resolves once the request at `position` has entered its handler. */
  entered: (key: string, position: number) => Promise<void>;
  /** Lets the request at `position` finish. Releasing twice is harmless. */
  release: (key: string, position: number) => void;
};

function createHolds(): Holds {
  const slots = new Map<string, Deferred>();
  const arrivals = new Map<string, number>();
  const slot = (name: string): Deferred => {
    const existing = slots.get(name);
    if (existing) {
      return existing;
    }
    const created = deferred();
    slots.set(name, created);
    return created;
  };
  return {
    park: async (key) => {
      const position = (arrivals.get(key) ?? 0) + 1;
      arrivals.set(key, position);
      slot(`${key}#${position}:entered`).resolve();
      await within(
        slot(`${key}#${position}:released`).promise,
        LATCH_WAIT_MS,
        `the test to release request ${position}`,
      );
      return position;
    },
    entered: (key, position) => slot(`${key}#${position}:entered`).promise,
    release: (key, position) => slot(`${key}#${position}:released`).resolve(),
  };
}

/** Polls until `condition` holds; rejects, rather than hangs, after `ms`. */
async function until(
  condition: () => boolean,
  ms: number,
  what: string,
): Promise<void> {
  const deadline = Date.now() + ms;
  while (!condition()) {
    if (Date.now() > deadline) {
      throw new Error(`gave up waiting for ${what}`);
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 10));
  }
}

const MIDDLEWARE_SESSION_ID = "session-set-by-middleware";
/** Controllers the test middleware issued, so a handler can tell them from any other. */
const issuedControllers = new WeakSet<AbortController>();

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

async function start(
  framework: Framework,
  carryMiddlewareState: boolean,
): Promise<Running> {
  const port = await freePort();
  const adapter = await createServer(new NeuroLink(), {
    framework,
    config: { port, host: "127.0.0.1", carryMiddlewareState },
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
  // Sets the fields no shipped authentication middleware sets: a session and an
  // abort signal with its controller. The handler must still see all three.
  adapter.registerMiddleware({
    name: "sets-session-and-abort",
    order: 30,
    handler: async (ctx, next) => {
      const controller = new AbortController();
      issuedControllers.add(controller);
      ctx.session = { id: MIDDLEWARE_SESSION_ID };
      ctx.abortSignal = controller.signal;
      ctx.abortController = controller;
      return next();
    },
  });
  const latch = createLatch();
  const holds = createHolds();
  adapter.registerRoute({
    method: "GET",
    path: "/api/held/:key",
    handler: async (ctx): Promise<Held> => ({
      position: await holds.park(ctx.params.key ?? ""),
      user: ctx.user?.id ?? null,
    }),
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
    path: "/api/latched-whoami",
    handler: async (ctx): Promise<Latched> => {
      const position = latch.enter();
      if (position === 1) {
        // Hold the first request here until the second one has entered its
        // handler, so the user is read after the other request's middleware ran.
        await within(
          latch.secondEntered,
          LATCH_WAIT_MS,
          "a second request to reach its handler",
        );
      }
      return {
        user: ctx.user?.id ?? null,
        seenByLaterMiddleware:
          typeof ctx.metadata?.sawUser === "string"
            ? ctx.metadata.sawUser
            : null,
        position,
        arrivalsWhenRead: latch.arrivals(),
      };
    },
  });
  adapter.registerRoute({
    method: "GET",
    path: "/api/carried-state",
    handler: async (ctx): Promise<CarriedState> => {
      const signal = ctx.abortSignal;
      const controller = ctx.abortController;
      let listenerFired = false;
      signal?.addEventListener(
        "abort",
        () => {
          listenerFired = true;
        },
        { once: true },
      );
      // abort() dispatches synchronously, so the listener has run by the next line.
      controller?.abort();
      return {
        sessionId: ctx.session?.id ?? null,
        hasSignal: signal instanceof AbortSignal,
        hasController: controller instanceof AbortController,
        issuedByMiddleware:
          controller !== undefined && issuedControllers.has(controller),
        paired: signal !== undefined && controller?.signal === signal,
        listenerFired,
        aborted: signal?.aborted ?? false,
      };
    },
  });
  await adapter.initialize();
  await adapter.start();
  return {
    base: `http://127.0.0.1:${port}`,
    latch,
    holds,
    activeConnections: () => adapter.getActiveConnectionCount(),
    stop: () => adapter.stop(),
  };
}

/**
 * One server per framework and carry setting. The carry is opt-in
 * (`carryMiddlewareState`), so the cases about what middleware state reaches a
 * handler run with it on and the ones about the default run with it off.
 */
const servers = new Map<string, Promise<Running>>();
function running(
  framework: Framework,
  carryMiddlewareState = true,
): Promise<Running> {
  const key = `${framework}:${carryMiddlewareState ? "carry" : "default"}`;
  let pending = servers.get(key);
  if (!pending) {
    pending = start(framework, carryMiddlewareState);
    servers.set(key, pending);
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
  carryMiddlewareState = true,
): Promise<{ status: number; data: T | null }> {
  const { base } = await running(framework, carryMiddlewareState);
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
    const { latch } = await running(framework);
    const sameId = { "x-request-id": "shared-by-two-callers" };
    const first = get<Latched>(
      framework,
      "/api/latched-whoami",
      "token-bob",
      sameId,
    );
    // Handled here so a rejection during the wait is not unhandled; Promise.all
    // below still reports it.
    first.catch(() => undefined);
    await within(
      latch.firstEntered,
      LATCH_WAIT_MS,
      "the first request to reach its handler",
    );
    // The first handler is now parked until this request reaches its own.
    const second = get<Latched>(
      framework,
      "/api/latched-whoami",
      "token-carol",
      sameId,
    );
    const [a, b] = await Promise.all([first, second]);
    assertEqual(a.status, 200, "first request served");
    assertEqual(b.status, 200, "second request served");
    // The precondition for everything below: the two really overlapped.
    assertEqual(a.data?.position, 1, "the first request entered first");
    assertEqual(b.data?.position, 2, "the second request entered second");
    assert(
      (a.data?.arrivalsWhenRead ?? 0) >= 2,
      "the first request read its user only after the second had entered its handler",
    );
    assertEqual(a.data?.user, "bob", "the first caller still sees itself");
    assertEqual(b.data?.user, "carol", "the second caller sees itself");
    assertEqual(
      a.data?.seenByLaterMiddleware,
      "bob",
      "the first caller's later middleware saw its own user",
    );
    assertEqual(
      b.data?.seenByLaterMiddleware,
      "carol",
      "the second caller's later middleware saw its own user",
    );
  });

  await test(`${framework}: a session and an abort signal set by middleware reach the handler`, async () => {
    const { status, data } = await get<CarriedState>(
      framework,
      "/api/carried-state",
      "token-bob",
    );
    assertEqual(status, 200, "request served");
    assertEqual(
      data?.sessionId,
      MIDDLEWARE_SESSION_ID,
      "the handler sees the session the middleware set",
    );
    assert(data?.hasSignal === true, "the handler has an abort signal");
    assert(data?.hasController === true, "the handler has an abort controller");
    assert(
      data?.issuedByMiddleware === true,
      "the controller is the one the middleware created, not one the adapter made",
    );
    assert(data?.paired === true, "the signal belongs to that controller");
    assert(
      data?.listenerFired === true && data?.aborted === true,
      "aborting the carried controller fires a listener on the carried signal",
    );
  });

  await test(`${framework}: a request with no credentials is still refused`, async () => {
    const { status } = await get<WhoAmI>(framework, "/api/whoami", undefined);
    assertEqual(status, 401, "authentication still required");
  });
}

// =============================================================================
// Connection records: one per request, whatever X-Request-ID says
// =============================================================================
//
// Hono and Fastify count in-flight requests for the shutdown drain, one record
// each. Express and Koa count sockets under a per-socket generated id, so a
// repeated X-Request-ID cannot reach them and they are not exercised here.

for (const framework of ["hono", "fastify"] as const) {
  await test(`${framework}: overlapping requests that send the same X-Request-ID are each counted until they finish`, async () => {
    const { holds, activeConnections } = await running(framework, false);
    const key = `${framework}-same-request-id`;
    const sameId = { "x-request-id": "one-id-sent-by-two-callers" };
    const before = activeConnections();

    const first = get<Held>(
      framework,
      `/api/held/${key}`,
      "token-bob",
      sameId,
      false,
    );
    first.catch(() => undefined);
    await within(
      holds.entered(key, 1),
      LATCH_WAIT_MS,
      "the first request to reach its handler",
    );
    const second = get<Held>(
      framework,
      `/api/held/${key}`,
      "token-carol",
      sameId,
      false,
    );
    second.catch(() => undefined);
    await within(
      holds.entered(key, 2),
      LATCH_WAIT_MS,
      "the second request to reach its handler",
    );
    let secondFinished = false;
    void second.then(() => {
      secondFinished = true;
    });

    try {
      assertEqual(
        activeConnections(),
        before + 2,
        "both requests, parked in their handlers, are counted",
      );

      holds.release(key, 1);
      const a = await first;
      assertEqual(a.status, 200, "the first request was served");
      assertEqual(a.data?.position, 1, "and it was the first to arrive");
      // The precondition for the assertion below: the first request's record
      // has been removed, so the count has left the both-in-flight value.
      await until(
        () => activeConnections() < before + 2,
        LATCH_WAIT_MS,
        "the finished request to be untracked",
      );
      assert(
        !secondFinished,
        "the second request is still parked in its handler",
      );
      assertEqual(
        activeConnections(),
        before + 1,
        "the request still in its handler is still counted",
      );

      holds.release(key, 2);
      const b = await second;
      assertEqual(b.status, 200, "the second request was served");
      // With the carry off only Hono hands the handler the user, and it must be
      // this request's own, not the other caller's that sent the same id.
      assertEqual(
        b.data?.user,
        framework === "hono" ? "carol" : null,
        "and it ran as its own caller",
      );
      await until(
        () => activeConnections() === before,
        LATCH_WAIT_MS,
        "the second request to be untracked",
      );
    } finally {
      holds.release(key, 1);
      holds.release(key, 2);
    }
  });
}

// =============================================================================
// Carrying middleware state is opt-in
// =============================================================================
//
// Unless the server sets `carryMiddlewareState` (or `registerAllRoutes` does it
// for `perUserAuth`), each adapter propagates context as it always did: Express,
// Fastify and Koa build a fresh context for every middleware step and for the
// handler, so a role guard registered after authentication never sees the user
// and refuses everyone; Hono shares one context across the steps and the handler
// only when the caller sent its own X-Request-ID.

type GuardServer = {
  base: string;
  /** What a key generator reading `ctx.user` saw, one entry per request. */
  keys: string[];
  stop: () => Promise<void>;
};

const GUARD_USERS: Record<string, { id: string; roles: string[] }> = {
  "token-admin": { id: "ada", roles: ["admin"] },
  "token-user": { id: "bob", roles: ["user"] },
};

async function startGuardServer(
  framework: Framework,
  setup: {
    carryMiddlewareState?: boolean;
    registerAll?: { perUserAuth?: boolean };
  },
): Promise<GuardServer> {
  const port = await freePort();
  const adapter = await skipWhenNotInstalled(
    framework,
    createServer(new NeuroLink(), {
      framework,
      config: {
        port,
        host: "127.0.0.1",
        carryMiddlewareState: setup.carryMiddlewareState,
        rateLimit: { enabled: false },
      },
    }),
  );
  const keys: string[] = [];
  adapter.registerMiddleware(
    createAuthMiddleware({
      type: "bearer",
      validate: async (token: string) => GUARD_USERS[token] ?? null,
      skipDevPlayground: false,
    }),
  );
  // Registered after authentication, as the docs show: the guard reads ctx.user.
  adapter.registerMiddleware({
    ...createRoleMiddleware({ requiredRoles: ["admin"] }),
    excludePaths: ["/api/open"],
  });
  adapter.registerMiddleware(
    createRateLimitMiddleware({
      maxRequests: 100000,
      windowMs: 60000,
      keyGenerator: (ctx) => {
        keys.push(ctx.user?.id ?? "none");
        return ctx.user?.id ?? "anonymous";
      },
    }),
  );
  for (const path of ["/api/open", "/api/guarded"]) {
    adapter.registerRoute({
      method: "GET",
      path,
      handler: async (ctx) => ({ user: ctx.user?.id ?? null }),
    });
  }
  if (setup.registerAll) {
    registerAllRoutes(adapter, "/api", setup.registerAll);
  }
  await skipWhenNotInstalled(framework, adapter.initialize());
  await skipWhenNotInstalled(framework, adapter.start());
  guardStops.push(() => adapter.stop());
  return { base: `http://127.0.0.1:${port}`, keys, stop: () => adapter.stop() };
}

/** Stops for the guard servers; the suite closes them when it ends. */
const guardStops: Array<() => Promise<void>> = [];

type GuardReading = {
  /** Status of the role-guarded route. */
  guarded: number;
  /** The user the handler of the unguarded route saw. */
  handlerUser: string | null;
  /** The user a key generator registered after authentication saw. */
  keyGeneratorUser: string | undefined;
};

async function readGuard(
  server: GuardServer,
  token: string,
  callerRequestId: boolean,
): Promise<GuardReading> {
  const headers = {
    authorization: `Bearer ${token}`,
    ...(callerRequestId ? { "x-request-id": `caller-${Math.random()}` } : {}),
  };
  const guarded = await fetch(`${server.base}/api/guarded`, { headers });
  await guarded.text();
  server.keys.length = 0;
  const open = await fetch(`${server.base}/api/open`, { headers });
  assertEqual(open.status, 200, "the unguarded route is served");
  const body = (await open.json()) as { data?: { user?: string | null } };
  assertEqual(server.keys.length, 1, "the key generator ran once for the call");
  return {
    guarded: guarded.status,
    handlerUser: body.data?.user ?? null,
    keyGeneratorUser: server.keys[0],
  };
}

for (const framework of FRAMEWORKS) {
  await test(`${framework}: carry off (the default): a role guard and a key generator see the user only where they always did`, async () => {
    const server = await startGuardServer(framework, {});
    for (const callerRequestId of [false, true]) {
      // Hono shares the middleware's context with the handler when the caller
      // sent its own X-Request-ID, and nothing else did.
      const sees = framework === "hono" && callerRequestId;
      const admin = await readGuard(server, "token-admin", callerRequestId);
      const user = await readGuard(server, "token-user", callerRequestId);
      const where = `${framework}, ${callerRequestId ? "with" : "without"} X-Request-ID`;
      assertEqual(
        admin.guarded,
        sees ? 200 : 401,
        `${where}: the role guard ${sees ? "admits the role holder" : "refuses the role holder, who it cannot see"}`,
      );
      assertEqual(
        user.guarded,
        sees ? 403 : 401,
        `${where}: the role guard ${sees ? "refuses a user without the role" : "cannot see the user"}`,
      );
      assertEqual(
        admin.handlerUser,
        sees ? "ada" : null,
        `${where}: the handler's view of the user`,
      );
      assertEqual(
        admin.keyGeneratorUser,
        sees ? "ada" : "none",
        `${where}: the key generator's view of the user`,
      );
      assertEqual(
        user.keyGeneratorUser,
        sees ? "bob" : "none",
        `${where}: the key generator's view of the next user`,
      );
    }
  });

  await test(`${framework}: carryMiddlewareState: true gives the role guard and the key generator the user, with and without X-Request-ID`, async () => {
    const server = await startGuardServer(framework, {
      carryMiddlewareState: true,
    });
    for (const callerRequestId of [false, true]) {
      const admin = await readGuard(server, "token-admin", callerRequestId);
      const user = await readGuard(server, "token-user", callerRequestId);
      assertEqual(admin.guarded, 200, "the role guard admits the role holder");
      assertEqual(user.guarded, 403, "and refuses a user without the role");
      assertEqual(admin.handlerUser, "ada", "the handler sees the user");
      assertEqual(admin.keyGeneratorUser, "ada", "the key generator too");
      assertEqual(user.keyGeneratorUser, "bob", "and the next user");
    }
  });

  await test(`${framework}: registerAllRoutes turns the carry on for perUserAuth, and leaves it off without`, async () => {
    // Created without the option; the call below has to enable the carry.
    const strict = await startGuardServer(framework, {
      registerAll: { perUserAuth: true },
    });
    for (const callerRequestId of [false, true]) {
      const admin = await readGuard(strict, "token-admin", callerRequestId);
      assertEqual(admin.guarded, 200, "perUserAuth: the guard sees the user");
      assertEqual(
        admin.keyGeneratorUser,
        "ada",
        "and so does the key generator",
      );
    }
    const plain = await startGuardServer(framework, { registerAll: {} });
    const refused = await readGuard(plain, "token-admin", false);
    assertEqual(
      refused.guarded,
      401,
      "registerAllRoutes without perUserAuth leaves the carry off",
    );
    assertEqual(refused.keyGeneratorUser, "none", "the user stays unseen");
  });
}

await test("hono: with the carry off, overlapping requests that send the same X-Request-ID still keep their own users", async () => {
  const { latch } = await running("hono", false);
  const sameId = { "x-request-id": "shared-by-two-callers-default" };
  const first = get<Latched>(
    "hono",
    "/api/latched-whoami",
    "token-bob",
    sameId,
    false,
  );
  first.catch(() => undefined);
  await within(
    latch.firstEntered,
    LATCH_WAIT_MS,
    "the first request to reach its handler",
  );
  const second = get<Latched>(
    "hono",
    "/api/latched-whoami",
    "token-carol",
    sameId,
    false,
  );
  const [a, b] = await Promise.all([first, second]);
  assertEqual(a.data?.position, 1, "the first request entered first");
  assertEqual(b.data?.position, 2, "the second entered while it was parked");
  assertEqual(a.data?.user, "bob", "the first caller still sees itself");
  assertEqual(b.data?.user, "carol", "the second caller sees itself");
});

// =============================================================================
// Agent routes: whose identity they trust
// =============================================================================
//
// Unless the server opts in with `perUserAuth: true`, the routes take `userId`
// and the session from the request body, except on Hono when the caller sent its
// own `X-Request-ID`. Each case builds an app through the public
// `registerAllRoutes`, puts a stub on the NeuroLink instance's `generate` /
// `stream` that records `options.context`, and calls it: the Hono app in-process,
// any other framework over real HTTP on a loopback port. No provider is
// contacted.

type AppRequest = (path: string, init?: RequestInit) => Promise<Response>;
type RecordedContext = Record<string, unknown> | undefined;
type RecordedSkillAction = { type: string; requestedBy: string | undefined };

/** What the middleware in front of the routes says about the caller. */
type Identity =
  /** No authentication middleware at all. */
  | "none"
  /** One shared key: the same `{ id: "api-key", shared: true }` for every caller, as `neurolink serve` sets. */
  | "shared-key"
  /** One credential per person, plus a session middleware that names a session for each. */
  | "per-person"
  /** One credential per person, and nothing that sets a session. */
  | "per-person-no-session"
  /**
   * One credential per person, but authentication is optional: a request with no
   * valid credential goes through anonymous. A session middleware names a session
   * from the `x-session-id` header whether or not a user is present.
   */
  | "optional-auth"
  /**
   * One credential per person, with the dev playground bypass left on (the
   * default): a request carrying the playground header runs as the built-in
   * playground user instead of a person.
   */
  | "dev-playground";

type AgentApp = {
  request: AppRequest;
  generateContexts: RecordedContext[];
  streamContexts: RecordedContext[];
  skillActions: RecordedSkillAction[];
};

const SHARED_KEY = "shared-operator-key";
const PEOPLE: Record<string, { id: string; email: string; roles: string[] }> = {
  "token-bob": { id: "bob", email: "bob@example.com", roles: ["user"] },
  "token-carol": { id: "carol", email: "carol@example.com", roles: ["admin"] },
};

/** The `context` a route handed to generate() / stream(), copied. */
function contextOf(options: unknown): RecordedContext {
  if (
    typeof options !== "object" ||
    options === null ||
    !("context" in options)
  ) {
    return undefined;
  }
  const { context } = options;
  return typeof context === "object" && context !== null
    ? { ...context }
    : undefined;
}

/**
 * A NeuroLink whose `generate` / `stream` record the `context` they receive and
 * whose skill mutation gate records who the route says asked, then refuses, so
 * nothing is written and no provider is contacted.
 */
function stubbedNeuroLink(
  generateContexts: RecordedContext[],
  streamContexts: RecordedContext[],
  skillActions: RecordedSkillAction[],
): NeuroLink {
  const neurolink = new NeuroLink({
    skills: {
      enabled: true,
      storage: { type: "memory", skills: [] },
      allowMutations: true,
      onMutationRequest: async (action) => {
        skillActions.push({
          type: action.type,
          requestedBy: action.requestedBy,
        });
        return { outcome: "rejected" as const, reason: "recorded by the test" };
      },
    },
  });
  neurolink.generate = async (optionsOrPrompt) => {
    generateContexts.push(contextOf(optionsOrPrompt));
    return { content: "ok", provider: "stub", model: "stub" };
  };
  neurolink.stream = async (streamOptions) => {
    streamContexts.push(contextOf(streamOptions));
    return {
      stream: (async function* () {
        yield { content: "ok" };
      })(),
      provider: "stub",
      model: "stub",
    };
  };
  return neurolink;
}

/**
 * Skip only when the optional framework package is not installed. Any other
 * failure to create, initialise or start an adapter is the regression this suite
 * exists to catch, and a skip would let the run print PASS.
 */
async function skipWhenNotInstalled<T>(
  framework: Framework,
  work: Promise<T>,
): Promise<T> {
  try {
    return await work;
  } catch (error) {
    if (error instanceof MissingDependencyError) {
      throw new Skip(`${framework} is not installed here`);
    }
    throw error;
  }
}

/** Stops for the agent-route servers started on a framework other than Hono. */
const agentStops: Array<() => Promise<void>> = [];

async function agentApp(
  identity: Identity,
  // Not CreateRoutesOptions: a JavaScript caller can pass a non-boolean.
  options: object = {},
  framework: Framework = "hono",
  // The default-mode cases run with the carry on, which is where the agent
  // routes decide what to trust. A `perUserAuth` server is created with the
  // option unset, so `registerAllRoutes` has to turn the carry on by itself.
  carryMiddlewareState: boolean | undefined = "perUserAuth" in options &&
  options.perUserAuth
    ? undefined
    : true,
  // Register `createAgentRoutes()` itself instead of `registerAllRoutes()`, which
  // is what turns the carry on for `perUserAuth`.
  direct = false,
): Promise<AgentApp> {
  const generateContexts: RecordedContext[] = [];
  const streamContexts: RecordedContext[] = [];
  const skillActions: RecordedSkillAction[] = [];
  const neurolink = stubbedNeuroLink(
    generateContexts,
    streamContexts,
    skillActions,
  );

  const port = framework === "hono" ? 0 : await freePort();
  const adapter = await skipWhenNotInstalled(
    framework,
    createServer(neurolink, {
      framework,
      config: { port, host: "127.0.0.1", carryMiddlewareState },
    }),
  );
  if (identity === "shared-key") {
    // The shape of the CLI's createServerApiKeyMiddleware.
    adapter.registerMiddleware(
      createAuthMiddleware({
        type: "custom",
        extractToken: (ctx) =>
          /^Bearer\s+(.+)$/i.exec(ctx.headers["authorization"] ?? "")?.[1] ??
          null,
        validate: async (token) =>
          token === SHARED_KEY ? { id: "api-key", shared: true } : null,
        skipDevPlayground: false,
      }),
    );
  } else if (identity === "dev-playground") {
    adapter.registerMiddleware(
      createAuthMiddleware({
        type: "bearer",
        validate: async (token: string) => PEOPLE[token] ?? null,
      }),
    );
  } else if (identity === "optional-auth") {
    adapter.registerMiddleware({
      name: "optional-authentication",
      order: 10,
      handler: async (ctx, next) => {
        const token = /^Bearer\s+(\S.*)$/i.exec(
          ctx.headers["authorization"] ?? "",
        )?.[1];
        const person = token ? PEOPLE[token] : undefined;
        if (person) {
          ctx.user = person;
        }
        return next();
      },
    });
    adapter.registerMiddleware({
      name: "names-a-session-from-a-header",
      order: 15,
      handler: async (ctx, next) => {
        const id = ctx.headers["x-session-id"];
        if (id) {
          ctx.session = { id };
        }
        return next();
      },
    });
  } else if (identity !== "none") {
    adapter.registerMiddleware(
      createAuthMiddleware({
        type: "bearer",
        validate: async (token: string) => PEOPLE[token] ?? null,
        skipDevPlayground: false,
      }),
    );
  }
  if (identity === "per-person") {
    adapter.registerMiddleware({
      name: "names-a-session",
      order: 15,
      handler: async (ctx, next) => {
        if (ctx.user) {
          ctx.session = { id: `session-of-${ctx.user.id}` };
        }
        return next();
      },
    });
  }
  if (direct) {
    adapter.registerRouteGroup(createAgentRoutes("/api", options));
  } else {
    registerAllRoutes(adapter, "/api", options);
  }
  await skipWhenNotInstalled(framework, adapter.initialize());
  if (framework !== "hono") {
    await skipWhenNotInstalled(framework, adapter.start());
    agentStops.push(() => adapter.stop());
    const base = `http://127.0.0.1:${port}`;
    return {
      request: (path, init) => fetch(`${base}${path}`, init),
      generateContexts,
      streamContexts,
      skillActions,
    };
  }
  const app = adapter.getFrameworkInstance() as { request: AppRequest };
  return {
    request: (path, init) => app.request(path, init),
    generateContexts,
    streamContexts,
    skillActions,
  };
}

function post(
  app: AgentApp,
  path: string,
  body: unknown,
  token?: string,
  headers: Record<string, string> = {},
): Promise<Response> {
  return app.request(path, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

/** The body a caller sends when it names its own user and session. */
const CLAIMING = {
  input: "hello",
  userId: "mallory",
  sessionId: "session-chosen-by-caller",
};

/** POST /api/agent/execute and return the context generate() received. */
async function executeContext(
  app: AgentApp,
  token: string | undefined,
  headers: Record<string, string> = {},
  body: unknown = CLAIMING,
): Promise<NonNullable<RecordedContext>> {
  const before = app.generateContexts.length;
  const res = await post(app, "/api/agent/execute", body, token, headers);
  assertEqual(res.status, 200, "execute answered");
  // The precondition for every "was not used" assertion: generate really ran.
  assertEqual(
    app.generateContexts.length,
    before + 1,
    "generate ran exactly once for the request",
  );
  const recorded = app.generateContexts[before];
  if (recorded === undefined) {
    throw new Error("generate received no context object");
  }
  return recorded;
}

/** POST /api/agent/stream and return the context stream() received. */
async function streamContext(
  app: AgentApp,
  token: string | undefined,
  headers: Record<string, string> = {},
  body: unknown = CLAIMING,
): Promise<NonNullable<RecordedContext>> {
  const before = app.streamContexts.length;
  const res = await post(app, "/api/agent/stream", body, token, headers);
  assertEqual(res.status, 200, "stream answered");
  await res.text();
  assertEqual(
    app.streamContexts.length,
    before + 1,
    "stream ran exactly once for the request",
  );
  const recorded = app.streamContexts[before];
  if (recorded === undefined) {
    throw new Error("stream received no context object");
  }
  return recorded;
}

/**
 * The agent routes' "named another userId" warnings, in order. They are written
 * with `logger.alwaysStderr`, which is `console.error`, so the suite takes them
 * off `console.error` for its whole run (anything else still goes through). The
 * public `logger` offers no sink for that call, and `logger.getLogs()` records
 * only what `shouldLog` lets through, which is nothing at default settings.
 */
const AGENT_WARNINGS: string[] = [];
const realConsoleError = console.error;
console.error = (...args: unknown[]) => {
  const line = args.map(String).join(" ");
  if (line.includes("[agentRoutes]") && line.includes("perUserAuth")) {
    AGENT_WARNINGS.push(line);
    return;
  }
  realConsoleError(...args);
};

/** Run `work` and return the agent-route warnings written while it ran. */
async function warningsDuring(work: () => Promise<void>): Promise<string[]> {
  const before = AGENT_WARNINGS.length;
  await work();
  return AGENT_WARNINGS.slice(before);
}

/**
 * The precondition for every "no warning" assertion: on a default server with
 * per-person authentication, a body naming another userId does produce one
 * warning that this capture sees. Without it a silent capture would pass them
 * all.
 */
async function assertCaptureSeesWarnings(): Promise<void> {
  const app = await agentApp("per-person");
  const warned = await warningsDuring(async () => {
    await executeContext(app, "token-bob");
  });
  assertEqual(
    warned.length,
    1,
    "precondition: the capture sees the warning for a user naming another userId",
  );
}

const SKILL = {
  name: "recorded_skill",
  description: "A skill the gate refuses.",
  instructions: "Never written.",
  requestedBy: "mallory",
};

type SkillCall = "create" | "update" | "delete";

/**
 * Create, update or delete a skill and return who the mutation gate was told
 * asked. Update and delete name a path parameter, which a Hono handler that
 * reused the middleware's context once read as empty.
 */
async function skillRequestedBy(
  app: AgentApp,
  token: string | undefined,
  headers: Record<string, string> = {},
  call: SkillCall = "create",
): Promise<string | undefined> {
  const before = app.skillActions.length;
  const authorization: Record<string, string> = token
    ? { authorization: `Bearer ${token}` }
    : {};
  const res =
    call === "create"
      ? await post(app, "/api/agent/skills", SKILL, token, headers)
      : call === "update"
        ? await app.request("/api/agent/skills/recorded_skill", {
            method: "PATCH",
            headers: {
              "content-type": "application/json",
              ...authorization,
              ...headers,
            },
            body: JSON.stringify({
              description: "changed",
              requestedBy: "mallory",
            }),
          })
        : await app.request("/api/agent/skills/recorded_skill", {
            method: "DELETE",
            headers: { ...authorization, ...headers },
          });
  assertEqual(res.status, 200, `skill ${call} answered`);
  assertEqual(
    app.skillActions.length,
    before + 1,
    "the mutation gate ran exactly once for the request",
  );
  assertEqual(app.skillActions[before]?.type, call, "the gate saw the call");
  return app.skillActions[before]?.requestedBy;
}

await test("default mode, one shared key: the body's userId and sessionId reach generate unchanged", async () => {
  const app = await agentApp("shared-key");
  // Authentication is live: a request without the key is refused, so the
  // request below was authenticated and ctx.user was set to the shared user.
  const refused = await post(app, "/api/agent/execute", CLAIMING);
  assertEqual(refused.status, 401, "a request without the key is refused");
  assertEqual(app.generateContexts.length, 0, "a refused request ran nothing");

  const context = await executeContext(app, SHARED_KEY);
  assertEqual(context.userId, "mallory", "the body's userId is used");
  assertEqual(
    context.sessionId,
    "session-chosen-by-caller",
    "the body's sessionId is used",
  );
  assertEqual(context.userEmail, undefined, "no email from a shared key");
  assertEqual(context.userRoles, undefined, "no roles from a shared key");
});

await test("default mode, one shared key: the body's userId and sessionId reach stream unchanged", async () => {
  const app = await agentApp("shared-key");
  const context = await streamContext(app, SHARED_KEY);
  assertEqual(context.userId, "mallory", "the body's userId is used");
  assertEqual(
    context.sessionId,
    "session-chosen-by-caller",
    "the body's sessionId is used",
  );
});

await test("default mode, Hono with per-person authentication and no X-Request-ID: the body wins, ctx.user and ctx.session are ignored", async () => {
  const app = await agentApp("per-person");
  const context = await executeContext(app, "token-bob");
  assertEqual(context.userId, "mallory", "the body's userId is used");
  assertEqual(
    context.sessionId,
    "session-chosen-by-caller",
    "the body's sessionId is used, not the session a middleware set",
  );
  assertEqual(context.userEmail, undefined, "no email without the opt-in");
  assertEqual(context.userRoles, undefined, "no roles without the opt-in");
  const viaStream = await streamContext(app, "token-bob");
  assertEqual(viaStream.userId, "mallory", "stream: the body's userId");
  assertEqual(
    viaStream.sessionId,
    "session-chosen-by-caller",
    "stream: the body's sessionId",
  );
});

// What the default did before the adapters carried ctx.user: Hono alone handed
// the middleware's context to the handler, and only when the caller sent its own
// X-Request-ID (the old store was keyed by it). Everything else got a fresh
// context. The default keeps both halves, so a server that was safe by that
// accident stays safe and one that was not does not silently change.
const CALLER_REQUEST_ID = { "x-request-id": "caller-chosen-id" };

await test("default mode, Hono with per-person authentication and X-Request-ID: ctx.user wins over the body, as before", async () => {
  await assertCaptureSeesWarnings();
  const app = await agentApp("per-person");
  const warned = await warningsDuring(async () => {
    const bob = await executeContext(app, "token-bob", CALLER_REQUEST_ID);
    assertEqual(bob.userId, "bob", "execute: the authenticated user");
    assertEqual(
      bob.sessionId,
      "session-of-bob",
      "execute: the session a middleware set",
    );
    assertEqual(
      bob.userEmail,
      "bob@example.com",
      "execute: email from ctx.user",
    );
    assertEqual(
      JSON.stringify(bob.userRoles),
      JSON.stringify(["user"]),
      "execute: roles from ctx.user",
    );
    const carol = await streamContext(app, "token-carol", CALLER_REQUEST_ID);
    assertEqual(carol.userId, "carol", "stream: the next caller is itself");
    assertEqual(
      carol.sessionId,
      "session-of-carol",
      "stream: and has its own session",
    );
  });
  assertEqual(warned.length, 0, "ctx.user already won: nothing to warn about");
  // The quiet was not a disabled warning: the same server still warns for a
  // request that is served from the body.
  const fromBody = await warningsDuring(async () => {
    const unmarked = await executeContext(app, "token-bob");
    assertEqual(
      unmarked.userId,
      "mallory",
      "no X-Request-ID: the body's userId",
    );
  });
  assertEqual(
    fromBody.length,
    1,
    "the same server warns for a body-served call",
  );
});

await test("default mode, Hono with one shared key and X-Request-ID: the key's identity wins, as before", async () => {
  const app = await agentApp("shared-key");
  const context = await executeContext(app, SHARED_KEY, CALLER_REQUEST_ID);
  assertEqual(context.userId, "api-key", "the shared identity, not the body's");
  assertEqual(
    context.sessionId,
    undefined,
    "no session: ctx.session is unset and the body's is ignored",
  );
});

await test("default mode, Hono with optional authentication and X-Request-ID: an anonymous request keeps the body's userId and the session a middleware named", async () => {
  const app = await agentApp("optional-auth");
  const context = await executeContext(app, undefined, {
    ...CALLER_REQUEST_ID,
    "x-session-id": "session-named-by-middleware",
  });
  assertEqual(context.userId, "mallory", "no ctx.user: the body's userId");
  assertEqual(
    context.sessionId,
    "session-named-by-middleware",
    "ctx.session wins over the body's sessionId",
  );
});

for (const framework of FRAMEWORKS) {
  const headerCases: Array<{ label: string; headers: Record<string, string> }> =
    framework === "hono"
      ? [{ label: "no X-Request-ID", headers: {} }]
      : [
          { label: "no X-Request-ID", headers: {} },
          { label: "X-Request-ID", headers: CALLER_REQUEST_ID },
        ];
  for (const { label, headers } of headerCases) {
    await test(`default mode, ${framework} with per-person authentication and a session middleware, ${label}: the body's userId and sessionId are used and ctx.session is ignored`, async () => {
      const app = await agentApp("per-person", {}, framework);
      const viaExecute = await executeContext(app, "token-bob", headers);
      assertEqual(viaExecute.userId, "mallory", "execute: the body's userId");
      assertEqual(
        viaExecute.sessionId,
        "session-chosen-by-caller",
        "execute: the body's sessionId, not the session a middleware set",
      );
      assertEqual(viaExecute.userEmail, undefined, "execute: no email");
      assertEqual(viaExecute.userRoles, undefined, "execute: no roles");
      const viaStream = await streamContext(app, "token-bob", headers);
      assertEqual(viaStream.userId, "mallory", "stream: the body's userId");
      assertEqual(
        viaStream.sessionId,
        "session-chosen-by-caller",
        "stream: the body's sessionId, not the session a middleware set",
      );
    });
  }
}

await test("perUserAuth: the authenticated user and session reach generate and the body's are ignored", async () => {
  const app = await agentApp("per-person", { perUserAuth: true });
  const bob = await executeContext(app, "token-bob");
  assertEqual(bob.userId, "bob", "userId is the authenticated id");
  assertEqual(
    bob.sessionId,
    "session-of-bob",
    "the session comes from ctx.session",
  );
  assertEqual(bob.userEmail, "bob@example.com", "email comes from ctx.user");
  assertEqual(
    JSON.stringify(bob.userRoles),
    JSON.stringify(["user"]),
    "roles come from ctx.user",
  );
  const carol = await executeContext(app, "token-carol");
  assertEqual(carol.userId, "carol", "the next caller is itself");
  assertEqual(carol.sessionId, "session-of-carol", "and has its own session");
});

await test("perUserAuth: the authenticated user and session reach stream and the body's are ignored", async () => {
  const app = await agentApp("per-person", { perUserAuth: true });
  const context = await streamContext(app, "token-bob");
  assertEqual(context.userId, "bob", "userId is the authenticated id");
  assertEqual(
    context.sessionId,
    "session-of-bob",
    "the session comes from ctx.session",
  );
  assertEqual(context.userEmail, "bob@example.com", "email from ctx.user");
});

await test("perUserAuth: with no session set by middleware, the body's sessionId is not used", async () => {
  const app = await agentApp("per-person-no-session", { perUserAuth: true });
  const context = await executeContext(app, "token-bob");
  assertEqual(context.userId, "bob", "userId is the authenticated id");
  assertEqual(context.sessionId, undefined, "the body's sessionId is ignored");
});

await test("perUserAuth with no authenticated user: a body userId and sessionId are not used", async () => {
  const app = await agentApp("none", { perUserAuth: true });
  const viaExecute = await executeContext(app, undefined);
  assertEqual(
    viaExecute.userId,
    undefined,
    "execute ignores the body's userId",
  );
  assertEqual(
    viaExecute.sessionId,
    undefined,
    "execute ignores the body's sessionId",
  );
  const viaStream = await streamContext(app, undefined);
  assertEqual(viaStream.userId, undefined, "stream ignores the body's userId");
  assertEqual(
    viaStream.sessionId,
    undefined,
    "stream ignores the body's sessionId",
  );
});

await test("perUserAuth with optional authentication: an anonymous request gets no session, even one a middleware named", async () => {
  const namedBySession = {
    "x-session-id": "session-shared-by-anonymous-callers",
  };
  // The precondition: in default mode, on Hono with the caller's own X-Request-ID
  // (the one request where the handler gets the middleware's context), the same
  // anonymous request does reach generate with the session the middleware named,
  // so the session middleware ran and set ctx.session with no ctx.user. The
  // assertions below then show perUserAuth dropping it rather than the
  // middleware never having run.
  const permissive = await agentApp("optional-auth");
  const permissiveContext = await executeContext(permissive, undefined, {
    ...namedBySession,
    ...CALLER_REQUEST_ID,
  });
  assertEqual(
    permissiveContext.sessionId,
    "session-shared-by-anonymous-callers",
    "default mode: the anonymous request carries the middleware's session",
  );

  const app = await agentApp("optional-auth", { perUserAuth: true });
  const viaExecute = await executeContext(app, undefined, namedBySession);
  assertEqual(viaExecute.userId, undefined, "execute: no userId");
  assertEqual(viaExecute.sessionId, undefined, "execute: no session");
  const viaStream = await streamContext(app, undefined, namedBySession);
  assertEqual(viaStream.userId, undefined, "stream: no userId");
  assertEqual(viaStream.sessionId, undefined, "stream: no session");

  // Authenticated callers on the same server keep theirs, each their own.
  const bob = await executeContext(app, "token-bob", {
    "x-session-id": "session-of-bob",
  });
  assertEqual(bob.userId, "bob", "an authenticated caller is itself");
  assertEqual(bob.sessionId, "session-of-bob", "and keeps its session");
  const carol = await streamContext(app, "token-carol", {
    "x-session-id": "session-of-carol",
  });
  assertEqual(carol.userId, "carol", "the next authenticated caller too");
  assertEqual(carol.sessionId, "session-of-carol", "with its own session");
});

await test("perUserAuth: any truthy value from a JavaScript caller turns it on, a falsy one leaves it off", async () => {
  for (const flag of ["true", 1, {}]) {
    const app = await agentApp("per-person", { perUserAuth: flag });
    const context = await executeContext(app, "token-bob");
    assertEqual(
      context.userId,
      "bob",
      "a truthy flag takes userId from ctx.user",
    );
    assertEqual(
      context.sessionId,
      "session-of-bob",
      "and the session from ctx.session",
    );
    const anonymous = await agentApp("none", { perUserAuth: flag });
    const none = await executeContext(anonymous, undefined);
    assertEqual(
      none.userId,
      undefined,
      "a truthy flag ignores the body's userId",
    );
  }
  for (const flag of [undefined, false, 0, ""]) {
    const app = await agentApp("per-person", { perUserAuth: flag });
    const context = await executeContext(app, "token-bob");
    assertEqual(
      context.userId,
      "mallory",
      "a falsy flag leaves the body in charge",
    );
  }
});

await test("perUserAuth: registerAllRoutes reads it from the top-level option only, so it is one switch for every route group", async () => {
  // Agent options alongside the top-level switch: strict identity.
  const strict = await agentApp("per-person", {
    perUserAuth: true,
    agent: { maxInputAttachments: 5 },
  });
  const context = await executeContext(strict, "token-bob");
  assertEqual(context.userId, "bob", "the top-level switch takes ctx.user");
  assertEqual(
    context.sessionId,
    "session-of-bob",
    "and the session from ctx.session, with agent options present",
  );
  assertEqual(
    await skillRequestedBy(strict, "token-bob"),
    "bob",
    "and attributes skill mutations to the authenticated user",
  );
  // Agent options without it leave the default in force. The type does not take
  // perUserAuth under `agent`; a JavaScript caller that passes it there must not
  // end up with the agent routes strict and every other route group not.
  const agentOnly = await agentApp("per-person", {
    agent: { maxInputAttachments: 5, perUserAuth: true },
  });
  const unchanged = await executeContext(agentOnly, "token-bob");
  assertEqual(
    unchanged.userId,
    "mallory",
    "agent options do not switch identity: only the top-level option does",
  );
});

await test("default mode with no authentication: the body chooses userId and sessionId", async () => {
  const app = await agentApp("none");
  const context = await executeContext(app, undefined);
  assertEqual(context.userId, "mallory", "the body's userId is used");
  assertEqual(
    context.sessionId,
    "session-chosen-by-caller",
    "the body's sessionId is used",
  );
});

await test("default mode, per-person authentication: a body naming another userId logs one warning per server, and the body's userId is still used", async () => {
  const app = await agentApp("per-person");
  const warned = await warningsDuring(async () => {
    const viaExecute = await executeContext(app, "token-bob");
    assertEqual(viaExecute.userId, "mallory", "execute uses the body's userId");
    const viaStream = await streamContext(app, "token-carol");
    assertEqual(viaStream.userId, "mallory", "stream uses the body's userId");
    const repeat = await executeContext(app, "token-bob");
    assertEqual(repeat.userId, "mallory", "a repeat uses the body's userId");
  });
  assertEqual(
    warned.length,
    1,
    "one warning across two execute requests and a stream request",
  );
  const [message = ""] = warned;
  assert(message.includes("perUserAuth"), "the warning names perUserAuth");
  assert(message.includes("shared: true"), "the warning names the shared mark");
  for (const value of [
    "mallory",
    "bob",
    "carol",
    "api-key",
    "session-chosen-by-caller",
    "hello",
  ]) {
    assert(
      !message.includes(value),
      "the warning carries no user id, session or input from the request",
    );
  }

  // The flag belongs to the server: another one warns on its own.
  const other = await agentApp("per-person");
  const otherWarned = await warningsDuring(async () => {
    await executeContext(other, "token-bob");
  });
  assertEqual(otherWarned.length, 1, "a second server logs its own warning");
});

await test("default mode, one shared key marked shared: a body naming another userId logs no warning", async () => {
  await assertCaptureSeesWarnings();
  const app = await agentApp("shared-key");
  const warned = await warningsDuring(async () => {
    // executeContext / streamContext assert that generate / stream ran.
    const viaExecute = await executeContext(app, SHARED_KEY);
    assertEqual(viaExecute.userId, "mallory", "execute uses the body's userId");
    const viaStream = await streamContext(app, SHARED_KEY);
    assertEqual(viaStream.userId, "mallory", "stream uses the body's userId");
  });
  assertEqual(warned.length, 0, "no warning for a shared identity");
});

await test("default mode, the dev playground user is shared: a body naming another userId logs no warning", async () => {
  await assertCaptureSeesWarnings();
  const app = await agentApp("dev-playground");
  // The bypass is honoured only when NODE_ENV is exactly "development", so the
  // case sets it rather than depending on the caller's shell.
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "development";
  try {
    const warned = await warningsDuring(async () => {
      const context = await executeContext(app, undefined, {
        "x-neurolink-playground": "true",
      });
      assertEqual(context.userId, "mallory", "the body's userId is used");
    });
    assertEqual(warned.length, 0, "no warning for the playground user");
  } finally {
    if (previousNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousNodeEnv;
    }
  }
});

await test("default mode, per-person authentication: a body naming the same user or none logs no warning, and does not use up the warning", async () => {
  await assertCaptureSeesWarnings();
  const app = await agentApp("per-person");
  const quiet = await warningsDuring(async () => {
    const same = await executeContext(
      app,
      "token-bob",
      {},
      { input: "hello", userId: "bob" },
    );
    assertEqual(same.userId, "bob", "execute: the body's own userId is used");
    const none = await streamContext(app, "token-bob", {}, { input: "hello" });
    assertEqual(none.userId, undefined, "stream: no userId in the body");
    const other = await executeContext(
      app,
      "token-carol",
      {},
      { input: "hello", userId: "carol" },
    );
    assertEqual(other.userId, "carol", "another person naming themselves");
  });
  assertEqual(quiet.length, 0, "no warning for a user naming themselves");

  // The same server still warns once a caller names someone else: the capture
  // was live throughout, and the quiet requests did not spend the warning.
  const warned = await warningsDuring(async () => {
    await executeContext(app, "token-bob");
  });
  assertEqual(warned.length, 1, "the next request naming another user warns");
});

await test("default mode with no authenticated user: a body naming a userId logs no warning", async () => {
  await assertCaptureSeesWarnings();
  const open = await agentApp("none");
  const optional = await agentApp("optional-auth");
  const warned = await warningsDuring(async () => {
    const viaOpen = await executeContext(open, undefined);
    assertEqual(viaOpen.userId, "mallory", "no auth: the body's userId");
    const anonymous = await executeContext(optional, undefined);
    assertEqual(anonymous.userId, "mallory", "anonymous: the body's userId");
  });
  assertEqual(warned.length, 0, "no warning without ctx.user");
});

await test("perUserAuth: a body naming another userId logs no warning", async () => {
  await assertCaptureSeesWarnings();
  const app = await agentApp("per-person", { perUserAuth: true });
  const warned = await warningsDuring(async () => {
    const viaExecute = await executeContext(app, "token-bob");
    assertEqual(viaExecute.userId, "bob", "execute: the authenticated user");
    const viaStream = await streamContext(app, "token-carol");
    assertEqual(viaStream.userId, "carol", "stream: the authenticated user");
  });
  assertEqual(warned.length, 0, "the body is ignored, so nothing to warn of");
});

await test("skills: a shared key keeps the caller-supplied requestedBy, perUserAuth attributes to the authenticated user", async () => {
  const shared = await agentApp("shared-key");
  assertEqual(
    await skillRequestedBy(shared, SHARED_KEY),
    "mallory",
    "a shared key does not overwrite the caller's attribution",
  );
  const perUser = await agentApp("per-person", { perUserAuth: true });
  assertEqual(
    await skillRequestedBy(perUser, "token-bob"),
    "bob",
    "the authenticated user wins over the body's requestedBy",
  );
  const anonymous = await agentApp("none", { perUserAuth: true });
  assertEqual(
    await skillRequestedBy(anonymous, undefined),
    undefined,
    "with no authenticated user the body's requestedBy is not used",
  );
});

// A handler called with a context the caller built, which is what a custom
// adapter or a test harness does. Nothing marked that context as one that
// received the built-in adapters' carry, so the default keeps trusting an
// authenticated ctx.user there, as it always did. The handlers come from the
// public createAgentRoutes export.
type AgentRoute = ReturnType<typeof createAgentRoutes>["routes"][number];
type HandlerContext = Parameters<AgentRoute["handler"]>[0];
type DirectIdentity = Pick<HandlerContext, "user" | "session">;

const DIRECT_BOB: DirectIdentity = {
  user: { id: "bob", email: "bob@example.com", roles: ["user"] },
  session: { id: "session-of-bob" },
};

function directApp(options?: { perUserAuth?: boolean }) {
  const generateContexts: RecordedContext[] = [];
  const streamContexts: RecordedContext[] = [];
  const skillActions: RecordedSkillAction[] = [];
  const neurolink = stubbedNeuroLink(
    generateContexts,
    streamContexts,
    skillActions,
  );
  const { routes } = createAgentRoutes("/api", options);
  const call = async (
    method: string,
    path: string,
    identity: DirectIdentity,
    body: unknown,
    params: Record<string, string> = {},
  ): Promise<void> => {
    const route = routes.find((r) => r.method === method && r.path === path);
    if (!route) {
      throw new Error(`createAgentRoutes has no ${method} ${path} route`);
    }
    const ctx: HandlerContext = {
      requestId: "direct-call",
      method,
      path,
      headers: {},
      query: {},
      params,
      body,
      neurolink,
      toolRegistry: {} as HandlerContext["toolRegistry"],
      timestamp: Date.now(),
      metadata: {},
      ...identity,
    };
    const result = await route.handler(ctx);
    if (
      typeof result === "object" &&
      result !== null &&
      Symbol.asyncIterator in result
    ) {
      for await (const chunk of result as AsyncIterable<unknown>) {
        void chunk;
      }
    }
  };
  /** Who the mutation gate was told asked, for the one call just made. */
  const requestedBy = (): string | undefined => {
    assertEqual(skillActions.length, 1, "the mutation gate ran exactly once");
    return skillActions.pop()?.requestedBy;
  };
  return { generateContexts, streamContexts, call, requestedBy };
}

await test("default mode, a handler called directly with a context the caller built: ctx.user and ctx.session win over the body, as before", async () => {
  await assertCaptureSeesWarnings();
  const app = directApp();
  const warned = await warningsDuring(async () => {
    await app.call("POST", "/api/agent/execute", DIRECT_BOB, CLAIMING);
    assertEqual(app.generateContexts.length, 1, "generate ran exactly once");
    const viaExecute = app.generateContexts[0] ?? {};
    assertEqual(viaExecute.userId, "bob", "execute: the authenticated user");
    assertEqual(
      viaExecute.sessionId,
      "session-of-bob",
      "execute: the session on the context",
    );
    assertEqual(viaExecute.userEmail, "bob@example.com", "execute: email");
    assertEqual(
      JSON.stringify(viaExecute.userRoles),
      JSON.stringify(["user"]),
      "execute: roles",
    );
    await app.call("POST", "/api/agent/stream", DIRECT_BOB, CLAIMING);
    assertEqual(app.streamContexts.length, 1, "stream ran exactly once");
    assertEqual(app.streamContexts[0]?.userId, "bob", "stream: the user");
    assertEqual(
      app.streamContexts[0]?.sessionId,
      "session-of-bob",
      "stream: the session",
    );
  });
  assertEqual(warned.length, 0, "ctx.user already won: nothing to warn about");

  await app.call("POST", "/api/agent/skills", DIRECT_BOB, SKILL);
  assertEqual(app.requestedBy(), "bob", "create is attributed to the user");
  await app.call(
    "PATCH",
    "/api/agent/skills/:id",
    DIRECT_BOB,
    { description: "changed", requestedBy: "mallory" },
    { id: "recorded_skill" },
  );
  assertEqual(app.requestedBy(), "bob", "update is attributed to the user");
  await app.call("DELETE", "/api/agent/skills/:id", DIRECT_BOB, undefined, {
    id: "recorded_skill",
  });
  assertEqual(app.requestedBy(), "bob", "delete is attributed to the user");

  // No user: the body names the user, and a session on the context still wins.
  const open = directApp();
  await open.call(
    "POST",
    "/api/agent/execute",
    { session: { id: "session-from-middleware" } },
    CLAIMING,
  );
  assertEqual(open.generateContexts[0]?.userId, "mallory", "no user: the body");
  assertEqual(
    open.generateContexts[0]?.sessionId,
    "session-from-middleware",
    "no user: the session on the context wins over the body's",
  );
});

await test("perUserAuth: a handler called directly takes identity only from the context, and an anonymous one gets none", async () => {
  const app = directApp({ perUserAuth: true });
  await app.call("POST", "/api/agent/execute", DIRECT_BOB, CLAIMING);
  assertEqual(app.generateContexts[0]?.userId, "bob", "the user");
  assertEqual(app.generateContexts[0]?.sessionId, "session-of-bob", "session");
  await app.call(
    "POST",
    "/api/agent/execute",
    { session: { id: "session-from-middleware" } },
    CLAIMING,
  );
  assertEqual(app.generateContexts[1]?.userId, undefined, "anonymous: no user");
  assertEqual(
    app.generateContexts[1]?.sessionId,
    undefined,
    "anonymous: no session, even one on the context",
  );
});

// The agent routes registered with createAgentRoutes() itself, so nothing turns
// the carry on for perUserAuth. With the carry off Hono still hands its handler
// the middleware's context when the client sent its own X-Request-ID, so that
// one request shape has a user and every other runs as anonymous; the security
// guide says exactly this.
for (const framework of FRAMEWORKS) {
  await test(`perUserAuth with createAgentRoutes registered directly, ${framework}: with the carry off only Hono with a client X-Request-ID has a user, with it on every request has one`, async () => {
    const off = await agentApp(
      "per-person",
      { perUserAuth: true },
      framework,
      false,
      true,
    );
    for (const callerRequestId of [false, true]) {
      const headers = callerRequestId ? CALLER_REQUEST_ID : {};
      const hasUser = framework === "hono" && callerRequestId;
      const where = `carry off, ${callerRequestId ? "with" : "without"} X-Request-ID`;
      const viaExecute = await executeContext(off, "token-bob", headers);
      assertEqual(
        viaExecute.userId,
        hasUser ? "bob" : undefined,
        `${where}: execute userId`,
      );
      assertEqual(
        viaExecute.sessionId,
        hasUser ? "session-of-bob" : undefined,
        `${where}: execute session, never the body's`,
      );
      const viaStream = await streamContext(off, "token-bob", headers);
      assertEqual(
        viaStream.userId,
        hasUser ? "bob" : undefined,
        `${where}: stream userId`,
      );
    }
    const on = await agentApp(
      "per-person",
      { perUserAuth: true },
      framework,
      true,
      true,
    );
    for (const headers of [{}, CALLER_REQUEST_ID]) {
      const context = await executeContext(on, "token-bob", headers);
      assertEqual(context.userId, "bob", "carry on: the user");
      assertEqual(context.sessionId, "session-of-bob", "carry on: the session");
    }
  });

  await test(`default mode, ${framework}: the named-another-user warning needs the carry, so a per-person server logs none with it off`, async () => {
    await assertCaptureSeesWarnings();
    const off = await agentApp("per-person", {}, framework, false);
    const quiet = await warningsDuring(async () => {
      await executeContext(off, "token-bob");
      await executeContext(off, "token-bob", CALLER_REQUEST_ID);
      await streamContext(off, "token-bob");
    });
    assertEqual(
      quiet.length,
      0,
      "carry off: no ctx.user to compare, no warning",
    );
    const on = await agentApp("per-person", {}, framework, true);
    const warned = await warningsDuring(async () => {
      await executeContext(on, "token-bob");
    });
    assertEqual(warned.length, 1, "carry on: the same request warns once");
  });
}

for (const framework of FRAMEWORKS) {
  await test(`perUserAuth: ${framework} takes identity from ctx.user and ctx.session, with and without X-Request-ID`, async () => {
    const app = await agentApp("per-person", { perUserAuth: true }, framework);
    for (const headers of [{}, CALLER_REQUEST_ID]) {
      const viaExecute = await executeContext(app, "token-bob", headers);
      assertEqual(viaExecute.userId, "bob", "execute: the authenticated user");
      assertEqual(
        viaExecute.sessionId,
        "session-of-bob",
        "execute: the session a middleware set",
      );
      assertEqual(viaExecute.userEmail, "bob@example.com", "execute: email");
      const viaStream = await streamContext(app, "token-carol", headers);
      assertEqual(viaStream.userId, "carol", "stream: the authenticated user");
      assertEqual(
        viaStream.sessionId,
        "session-of-carol",
        "stream: the session a middleware set",
      );
    }
  });
}

await test("skills, default mode: the body's requestedBy is used, except on Hono with X-Request-ID where the authenticated user wins", async () => {
  const hono = await agentApp("per-person");
  assertEqual(
    await skillRequestedBy(hono, "token-bob"),
    "mallory",
    "Hono, no X-Request-ID: create takes the body's requestedBy",
  );
  assertEqual(
    await skillRequestedBy(hono, "token-bob", {}, "update"),
    "mallory",
    "Hono, no X-Request-ID: update takes the body's requestedBy",
  );
  assertEqual(
    await skillRequestedBy(hono, "token-bob", {}, "delete"),
    undefined,
    "Hono, no X-Request-ID: delete has no body to take it from",
  );
  for (const call of ["create", "update", "delete"] as const) {
    assertEqual(
      await skillRequestedBy(hono, "token-bob", CALLER_REQUEST_ID, call),
      "bob",
      `Hono, X-Request-ID: ${call} is attributed to the authenticated user`,
    );
  }
  const express = await agentApp("per-person", {}, "express");
  for (const headers of [{}, CALLER_REQUEST_ID]) {
    assertEqual(
      await skillRequestedBy(express, "token-bob", headers),
      "mallory",
      "Express: create takes the body's requestedBy",
    );
    assertEqual(
      await skillRequestedBy(express, "token-bob", headers, "delete"),
      undefined,
      "Express: delete is not attributed to ctx.user",
    );
  }
});

try {
  await runSuite();
} finally {
  console.error = realConsoleError;
  for (const pending of servers.values()) {
    await pending.then((s) => s.stop()).catch(() => undefined);
  }
  for (const stop of agentStops) {
    await stop().catch(() => undefined);
  }
  for (const stop of guardStops) {
    await stop().catch(() => undefined);
  }
}
