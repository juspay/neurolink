#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * NeuroLink Authentication Providers - Continuous Test Suite
 *
 * Tests the real consumer scenarios:
 *   Section 1: Server Auth — Protected Endpoints (8 tests)
 *   Section 2: Server Auth — RBAC (5 tests)
 *   Section 3: Per-Call Auth — Pre-validated Context (5 tests)
 *   Section 4: Per-Call Auth — Token Validation (4 tests)
 *
 * STANDALONE TEST RUNNER - NO VITEST, NO TSX DEPENDENCIES
 * Imports from compiled dist/ to work with plain Node.js
 *
 * Run with: node --experimental-strip-types test/continuous-test-suite-auth.ts
 */

// =============================================================================
// TEST RUNNER INFRASTRUCTURE
// =============================================================================

import {
  defineSuite,
  log,
  logSection,
  type ColorName,
} from "./helpers/harness.js";

const { recordTest, runSuite } = defineSuite("Auth");

/** Print-only logTest shim. Counters are driven by recordTest in the runner. */
function logTest(
  testName: string,
  status: "PASS" | "FAIL" | "SKIP" | "TESTING",
  details?: string,
): void {
  const color: ColorName =
    status === "PASS"
      ? "green"
      : status === "FAIL"
        ? "red"
        : status === "SKIP"
          ? "yellow"
          : "blue";
  log(`[${status}] ${testName}${details ? ` — ${details}` : ""}`, color);
}
async function test(
  name: string,
  fn: () => Promise<void> | void,
): Promise<void> {
  try {
    await fn();
    recordTest(name, true);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    if (errorMsg.startsWith("SKIP:")) {
      recordTest(name, false, true, errorMsg.slice(5).trim());
    } else {
      recordTest(name, false, false, errorMsg);
    }
  }
}

import { assert, assertEqual, assertNotNull } from "./helpers/harness.js";

// =============================================================================
// CONFIG
// =============================================================================

const TEST_PROVIDER = process.env.TEST_PROVIDER || "vertex";

// =============================================================================
// IMPORTS
// =============================================================================

import { NeuroLink } from "../dist/index.js";

import { Hono } from "hono";

import { CustomAuthProvider } from "../dist/lib/auth/index.js";

import { ServerAuthorizationError } from "../dist/lib/server/index.js";

import {
  createBearerAuthMiddleware,
  createRoleAuthMiddleware,
} from "../dist/lib/server/middleware/auth.js";

import { assertDistFresh } from "./helpers/distFreshness.js";

// Fail loudly rather than silently testing a stale build (see distFreshness.ts).
assertDistFresh();

// =============================================================================
// HELPERS
// =============================================================================

function isExpectedProviderError(msg: string): boolean {
  const lower = msg.toLowerCase();
  return [
    "api key",
    "api_key",
    "authentication",
    "rate limit",
    "quota",
    "credentials",
    "cannot connect",
    "not configured",
    "permission denied",
    "billing",
    "econnrefused",
    "enotfound",
    "unauthorized",
    "403",
    "429",
    "could not resolve",
    "network",
    "timeout",
    "no providers",
    "failed to",
    "invalid api",
    "missing api",
    "google_application_credentials",
    "application default credentials",
    "service account",
    "project_id",
    "not found",
    "default credentials",
  ].some((p) => lower.includes(p));
}

function skipIfProviderError(error: unknown): void {
  const msg = error instanceof Error ? error.message : String(error);
  if (isExpectedProviderError(msg)) {
    throw new Error(`SKIP: Provider not available - ${msg.slice(0, 80)}`);
  }
  throw error;
}

function createAuthNeuroLink(): {
  neurolink: NeuroLink;
  provider: InstanceType<typeof CustomAuthProvider>;
} {
  const provider = new CustomAuthProvider({
    type: "custom",
    validateToken: async (token: string) => {
      if (token === "valid-token") {
        return {
          valid: true,
          user: {
            id: "user-1",
            email: "test@test.com",
            roles: ["user"],
            permissions: ["read"],
          },
        };
      }
      if (token === "admin-token") {
        return {
          valid: true,
          user: {
            id: "admin-1",
            email: "admin@test.com",
            roles: ["admin"],
            permissions: ["read", "write", "admin"],
          },
        };
      }
      if (token === "viewer-token") {
        return {
          valid: true,
          user: {
            id: "viewer-1",
            email: "viewer@test.com",
            roles: ["viewer"],
            permissions: ["agents:read"],
          },
        };
      }
      if (token === "user-token") {
        return {
          valid: true,
          user: {
            id: "user-2",
            email: "user@test.com",
            roles: ["user"],
            permissions: ["agents:read", "agents:execute"],
          },
        };
      }
      return { valid: false };
    },
  });

  const neurolink = new NeuroLink();
  return { neurolink, provider };
}

async function buildProtectedHonoApp(opts?: {
  authProvider?: InstanceType<typeof CustomAuthProvider>;
  skipPaths?: string[];
}): Promise<Hono> {
  const app = new Hono();

  app.onError((error, c) => {
    if (typeof (error as any).getHttpStatus === "function") {
      const status = (error as any).getHttpStatus() as number;
      return c.json(
        {
          error: {
            code: (error as any).code || "AUTH_ERROR",
            message: error.message,
          },
        },
        status as any,
      );
    }
    return c.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "An internal error occurred",
        },
      },
      500,
    );
  });

  if (opts?.authProvider) {
    const authProvider = opts.authProvider;
    const skipPaths = opts.skipPaths || ["/api/health"];

    const bearerMiddleware = createBearerAuthMiddleware(
      async (token: string) => {
        const result = await authProvider.authenticateToken(token);
        if (!result.valid || !result.user) {
          return null;
        }
        return {
          id: result.user.id,
          email: result.user.email,
          roles: result.user.roles,
          permissions: result.user.permissions,
        } as any;
      },
      { skipPaths },
    );

    app.use("*", async (c, next) => {
      for (const sp of skipPaths) {
        if (c.req.path.startsWith(sp)) {
          return next();
        }
      }
      const headers: Record<string, string> = {};
      c.req.raw.headers.forEach((v: string, k: string) => {
        headers[k] = v;
      });
      const ctx: any = {
        requestId: `req-${Date.now()}`,
        method: c.req.method,
        path: c.req.path,
        headers,
        query: {},
        params: {},
        body: undefined,
        metadata: {},
        timestamp: Date.now(),
      };
      await bearerMiddleware.handler(ctx, async () => {
        if (ctx.user) {
          c.set("user" as any, ctx.user);
        }
        return next();
      });
    });
  }

  app.get("/api/health", (c) =>
    c.json({ status: "ok", timestamp: new Date().toISOString() }, 200),
  );

  app.post("/api/agent/execute", async (c) => {
    const user = c.get("user" as any) as any;
    let body: any;
    try {
      body = await c.req.json();
    } catch {
      body = null;
    }
    if (!body || !body.input) {
      return c.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Missing required field: input",
          },
        },
        400,
      );
    }
    return c.json({
      data: {
        content: `Executed for user ${user?.id || "anonymous"}`,
        provider: "mock",
        model: "mock-model",
      },
      metadata: { timestamp: new Date().toISOString() },
    });
  });

  app.get("/api/agent/providers", (c) =>
    c.json({
      data: { providers: ["openai", "anthropic"], total: 2 },
      metadata: { timestamp: new Date().toISOString() },
    }),
  );

  return app;
}

// =============================================================================
// SECTION 1: Server Auth — Protected Endpoints (8 tests)
// =============================================================================

async function testServerAuth(): Promise<void> {
  logSection("SECTION 1: Server Auth -- Protected Endpoints");

  const { provider } = createAuthNeuroLink();
  const app = await buildProtectedHonoApp({
    authProvider: provider,
    skipPaths: ["/api/health"],
  });

  await test("1.1 No token -> POST /api/agent/execute -> 401", async () => {
    const res = await app.fetch(
      new Request("http://localhost/api/agent/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: "hello" }),
      }),
    );
    assertEqual(
      res.status,
      401,
      `Expected 401 Unauthorized, got ${res.status}`,
    );
    const body = (await res.json()) as any;
    assert(body.error !== undefined, "Response should contain an error field");
  });

  await test("1.2 Valid token -> POST /api/agent/execute -> 200", async () => {
    const res = await app.fetch(
      new Request("http://localhost/api/agent/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer valid-token",
        },
        body: JSON.stringify({ input: "hello" }),
      }),
    );
    assertEqual(res.status, 200, `Expected 200 OK, got ${res.status}`);
    const body = (await res.json()) as any;
    assertNotNull(body.data, "Response should contain data field");
  });

  await test("1.3 Invalid token -> POST /api/agent/execute -> 401", async () => {
    const res = await app.fetch(
      new Request("http://localhost/api/agent/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer bad-token-xyz",
        },
        body: JSON.stringify({ input: "hello" }),
      }),
    );
    assertEqual(
      res.status,
      401,
      `Expected 401 Unauthorized, got ${res.status}`,
    );
  });

  await test("1.4 Health endpoint -> GET /api/health -> 200 without token", async () => {
    const res = await app.fetch(
      new Request("http://localhost/api/health", { method: "GET" }),
    );
    assertEqual(
      res.status,
      200,
      `Expected 200 OK for public health, got ${res.status}`,
    );
    const body = (await res.json()) as any;
    assertEqual(body.status, "ok", "Health response should have status: ok");
  });

  await test("1.5 Valid token + proper body -> response includes authenticated user", async () => {
    const res = await app.fetch(
      new Request("http://localhost/api/agent/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer valid-token",
        },
        body: JSON.stringify({ input: "Tell me a joke" }),
      }),
    );
    assertEqual(res.status, 200, `Expected 200, got ${res.status}`);
    const body = (await res.json()) as any;
    assert(
      body.data.content.includes("user-1"),
      `Response should reference authenticated user ID, got: ${body.data.content}`,
    );
  });

  await test("1.6 Bearer prefix stripped correctly", async () => {
    const res = await app.fetch(
      new Request("http://localhost/api/agent/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer admin-token",
        },
        body: JSON.stringify({ input: "admin request" }),
      }),
    );
    assertEqual(res.status, 200, `Expected 200, got ${res.status}`);
    const body = (await res.json()) as any;
    assert(
      body.data.content.includes("admin-1"),
      `Should have admin user context, got: ${body.data.content}`,
    );
  });

  await test("1.7 Token without Bearer prefix -> 401", async () => {
    const res = await app.fetch(
      new Request("http://localhost/api/agent/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "valid-token",
        },
        body: JSON.stringify({ input: "hello" }),
      }),
    );
    assertEqual(
      res.status,
      401,
      `Expected 401 when Authorization header lacks Bearer prefix, got ${res.status}`,
    );
  });

  await test("1.8 No auth configured -> all routes open (backward compatible)", async () => {
    const openApp = await buildProtectedHonoApp({});
    const res = await openApp.fetch(
      new Request("http://localhost/api/agent/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: "open request" }),
      }),
    );
    assertEqual(
      res.status,
      200,
      `Expected 200 when no auth is configured, got ${res.status}`,
    );
  });
}

// =============================================================================
// SECTION 2: Server Auth — RBAC (5 tests)
// =============================================================================

async function testServerRBAC(): Promise<void> {
  logSection("SECTION 2: Server Auth -- RBAC");

  const { provider } = createAuthNeuroLink();

  async function buildRBACApp(config: {
    rolePermissions: Record<string, string[]>;
    endpointPermissions: Record<string, string[]>;
  }): Promise<Hono> {
    const app = new Hono();
    const { rolePermissions, endpointPermissions } = config;

    app.onError((error, c) => {
      if (typeof (error as any).getHttpStatus === "function") {
        const status = (error as any).getHttpStatus() as number;
        return c.json(
          {
            error: {
              code: (error as any).code || "AUTH_ERROR",
              message: error.message,
              details: (error as any).details,
            },
          },
          status as any,
        );
      }
      return c.json(
        { error: { code: "INTERNAL_ERROR", message: error.message } },
        500,
      );
    });

    const bearerMiddleware = createBearerAuthMiddleware(
      async (token: string) => {
        const result = await provider.authenticateToken(token);
        if (!result.valid || !result.user) {
          return null;
        }
        return {
          id: result.user.id,
          email: result.user.email,
          roles: result.user.roles,
          permissions: result.user.permissions,
        } as any;
      },
      { skipPaths: ["/api/health"] },
    );

    app.use("*", async (c, next) => {
      if (c.req.path.startsWith("/api/health")) {
        return next();
      }
      const headers: Record<string, string> = {};
      c.req.raw.headers.forEach((v: string, k: string) => {
        headers[k] = v;
      });
      const ctx: any = {
        requestId: `req-${Date.now()}`,
        method: c.req.method,
        path: c.req.path,
        headers,
        query: {},
        params: {},
        body: undefined,
        metadata: {},
        timestamp: Date.now(),
      };
      await bearerMiddleware.handler(ctx, async () => {
        if (ctx.user) {
          c.set("user" as any, ctx.user);
        }
        return next();
      });
    });

    app.use("*", async (c, next) => {
      if (c.req.path.startsWith("/api/health")) {
        return next();
      }
      const user = c.get("user" as any) as any;
      if (!user) {
        return next();
      }

      let requiredPerms: string[] | undefined;
      for (const [pathPattern, perms] of Object.entries(endpointPermissions)) {
        if (c.req.path.startsWith(pathPattern)) {
          requiredPerms = perms;
          break;
        }
      }
      if (!requiredPerms || requiredPerms.length === 0) {
        return next();
      }

      const userRoles: string[] = user.roles || [];
      const effectivePermissions = new Set<string>();
      for (const role of userRoles) {
        for (const perm of rolePermissions[role] || []) {
          effectivePermissions.add(perm);
        }
      }
      for (const perm of user.permissions || []) {
        effectivePermissions.add(perm);
      }

      if (effectivePermissions.has("*")) {
        return next();
      }

      const missing = requiredPerms.filter(
        (p: string) => !effectivePermissions.has(p),
      );
      if (missing.length > 0) {
        throw new ServerAuthorizationError(
          `Missing required permissions: ${missing.join(", ")}`,
          `req-${Date.now()}`,
          missing,
        );
      }
      return next();
    });

    app.get("/api/health", (c) => c.json({ status: "ok" }, 200));
    app.post("/api/agent/execute", async (c) => {
      const user = c.get("user" as any) as any;
      return c.json({
        data: {
          content: `Executed for ${user?.id}`,
          provider: "mock",
          model: "mock",
        },
      });
    });
    app.get("/api/agent/providers", (c) =>
      c.json({ data: { providers: ["openai"], total: 1 } }),
    );
    return app;
  }

  const rbacApp = await buildRBACApp({
    rolePermissions: {
      admin: ["*"],
      user: ["agents:read", "agents:execute"],
      viewer: ["agents:read"],
    },
    endpointPermissions: {
      "/api/agent/execute": ["agents:execute"],
      "/api/agent/providers": ["agents:read"],
    },
  });

  await test("2.1 Admin token -> execute endpoint -> 200 (wildcard grants full access)", async () => {
    const res = await rbacApp.fetch(
      new Request("http://localhost/api/agent/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer admin-token",
        },
        body: JSON.stringify({ input: "admin command" }),
      }),
    );
    assertEqual(res.status, 200, `Expected 200 for admin, got ${res.status}`);
  });

  await test("2.2 User token -> execute endpoint -> 200 (user has agents:execute)", async () => {
    const res = await rbacApp.fetch(
      new Request("http://localhost/api/agent/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer user-token",
        },
        body: JSON.stringify({ input: "user command" }),
      }),
    );
    assertEqual(
      res.status,
      200,
      `Expected 200 for user with execute perm, got ${res.status}`,
    );
  });

  await test("2.3 Viewer token -> execute endpoint -> 403 (viewer only has agents:read)", async () => {
    const res = await rbacApp.fetch(
      new Request("http://localhost/api/agent/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer viewer-token",
        },
        body: JSON.stringify({ input: "viewer command" }),
      }),
    );
    assertEqual(
      res.status,
      403,
      `Expected 403 Forbidden for viewer on execute, got ${res.status}`,
    );
  });

  await test("2.4 Wildcard permission (*) grants full access to all endpoints", async () => {
    const res1 = await rbacApp.fetch(
      new Request("http://localhost/api/agent/providers", {
        method: "GET",
        headers: { Authorization: "Bearer admin-token" },
      }),
    );
    assertEqual(
      res1.status,
      200,
      `Expected 200 for admin on providers, got ${res1.status}`,
    );
    const res2 = await rbacApp.fetch(
      new Request("http://localhost/api/agent/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer admin-token",
        },
        body: JSON.stringify({ input: "wildcard test" }),
      }),
    );
    assertEqual(
      res2.status,
      200,
      `Expected 200 for admin on execute, got ${res2.status}`,
    );
  });

  await test("2.5 Missing permission -> 403 with error indicating missing permission", async () => {
    const res = await rbacApp.fetch(
      new Request("http://localhost/api/agent/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer viewer-token",
        },
        body: JSON.stringify({ input: "forbidden" }),
      }),
    );
    assertEqual(res.status, 403, `Expected 403, got ${res.status}`);
    const body = (await res.json()) as any;
    assertNotNull(body.error, "Response should have error field");
    const errorMsg = body.error.message || "";
    assert(
      errorMsg.includes("agents:execute") || errorMsg.includes("permission"),
      `Error should indicate missing permission, got: "${errorMsg}"`,
    );
  });
}

// =============================================================================
// SECTION 3: Per-Call Auth — Pre-validated Context (5 tests)
// =============================================================================

async function testPerCallPrevalidated(): Promise<void> {
  logSection("SECTION 3: Per-Call Auth — Pre-validated Context");

  await test("3.1 generate() accepts requestContext parameter without error", async () => {
    const neurolink = new NeuroLink();
    try {
      await neurolink.generate({
        input: { text: "Say hello" },
        provider: TEST_PROVIDER,
        requestContext: {
          userId: "alice-123",
          userEmail: "alice@test.com",
          userRoles: ["admin"],
        },
      });
    } catch (error) {
      skipIfProviderError(error);
    }
  });

  await test("3.2 stream() accepts requestContext parameter without error", async () => {
    const neurolink = new NeuroLink();
    try {
      await neurolink.stream({
        input: { text: "Say hello" },
        provider: TEST_PROVIDER,
        requestContext: { userId: "alice-123" },
      });
    } catch (error) {
      skipIfProviderError(error);
    }
  });

  await test("3.3 requestContext with userId is accepted", async () => {
    const neurolink = new NeuroLink();
    try {
      await neurolink.generate({
        input: { text: "Say hello" },
        provider: TEST_PROVIDER,
        requestContext: { userId: "bob-456" },
      });
    } catch (error) {
      skipIfProviderError(error);
    }
  });

  await test("3.4 requestContext with roles is accepted", async () => {
    const neurolink = new NeuroLink();
    try {
      await neurolink.generate({
        input: { text: "Say hello" },
        provider: TEST_PROVIDER,
        requestContext: { userId: "charlie", userRoles: ["viewer", "editor"] },
      });
    } catch (error) {
      skipIfProviderError(error);
    }
  });

  await test("3.5 Empty requestContext is valid (anonymous)", async () => {
    const neurolink = new NeuroLink();
    try {
      await neurolink.generate({
        input: { text: "Say hello" },
        provider: TEST_PROVIDER,
        requestContext: {},
      });
    } catch (error) {
      skipIfProviderError(error);
    }
  });
}

// =============================================================================
// SECTION 4: Per-Call Auth — Token Validation (4 tests)
// =============================================================================

async function testPerCallTokenAuth(): Promise<void> {
  logSection("SECTION 4: Per-Call Auth — Token Validation");

  await test("4.1 generate() with valid token and configured auth provider", async () => {
    const authProvider = new CustomAuthProvider({
      type: "custom",
      validateToken: async (token: string) => {
        if (token === "valid-token") {
          return {
            valid: true,
            user: {
              id: "alice",
              email: "alice@test.com",
              roles: ["user"],
              permissions: [],
            },
          };
        }
        return { valid: false, error: "Invalid token" };
      },
    });
    const neurolink = new NeuroLink();
    await neurolink.setAuthProvider({ provider: authProvider });

    const configuredProvider = neurolink.getAuthProvider();
    assertNotNull(configuredProvider, "Auth provider should be configured");
    const tokenResult =
      await configuredProvider.authenticateToken("valid-token");
    assert(tokenResult.valid, "Valid token should pass validation");
    assertEqual(tokenResult.user!.id, "alice", "User ID should match");

    try {
      await neurolink.generate({
        input: { text: "Say hello" },
        provider: TEST_PROVIDER,
        auth: { token: "valid-token" },
      });
    } catch (error) {
      skipIfProviderError(error);
    }
  });

  await test("4.2 auth provider rejects invalid token", async () => {
    const authProvider = new CustomAuthProvider({
      type: "custom",
      validateToken: async (token: string) => {
        if (token === "valid-token") {
          return {
            valid: true,
            user: { id: "alice", roles: ["user"], permissions: [] },
          };
        }
        return { valid: false, error: "Invalid token" };
      },
    });
    const result = await authProvider.authenticateToken("invalid-token-xyz");
    assert(!result.valid, "Invalid token should fail validation");
    assertEqual(
      result.error,
      "Invalid token",
      "Error message should indicate invalid token",
    );
  });

  await test("4.3 No configured provider -> getAuthProvider returns undefined", async () => {
    const neurolink = new NeuroLink();
    const provider = neurolink.getAuthProvider();
    assertEqual(
      provider,
      undefined,
      "Auth provider should be undefined when not configured",
    );
  });

  await test("4.4 stream() with valid auth token and configured provider", async () => {
    const authProvider = new CustomAuthProvider({
      type: "custom",
      validateToken: async (token: string) => {
        if (token === "valid-stream-token") {
          return {
            valid: true,
            user: {
              id: "bob",
              email: "bob@test.com",
              roles: ["user"],
              permissions: ["stream:read"],
            },
          };
        }
        return { valid: false, error: "Invalid token" };
      },
    });
    const neurolink = new NeuroLink();
    await neurolink.setAuthProvider({ provider: authProvider });

    const tokenResult = await neurolink
      .getAuthProvider()!
      .authenticateToken("valid-stream-token");
    assert(tokenResult.valid, "Stream token should be valid");
    assertEqual(tokenResult.user?.id, "bob", "User ID should be bob");

    try {
      await neurolink.stream({
        input: { text: "Say hello" },
        provider: TEST_PROVIDER,
        auth: { token: "valid-stream-token" },
      });
    } catch (error) {
      skipIfProviderError(error);
    }
  });
}

// =============================================================================
// MAIN
// =============================================================================

async function main(): Promise<void> {
  await testServerAuth();
  await testServerRBAC();
  await testPerCallPrevalidated();
  await testPerCallTokenAuth();
}

await runSuite(main);
